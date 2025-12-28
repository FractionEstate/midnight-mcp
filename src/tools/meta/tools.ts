/**
 * Meta tool definitions
 * MCP tool registration for discovery/meta operations
 */

import type {
  ExtendedToolDefinition,
  OutputSchema,
  ToolCategory,
} from "../../types/index.js";
import {
  listToolCategories,
  listCategoryTools,
  setMetaTools,
} from "./handlers.js";

// ============================================================================
// Output Schemas
// ============================================================================

const listCategoriesOutputSchema: OutputSchema = {
  type: "object",
  properties: {
    categories: {
      type: "array",
      description: "Available tool categories",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Category identifier" },
          description: {
            type: "string",
            description: "What the category does",
          },
          toolCount: { type: "number", description: "Number of tools" },
          useCases: {
            type: "array",
            description: "When to use this category",
            items: { type: "string" },
          },
        },
      },
    },
    totalTools: { type: "number", description: "Total tool count" },
    recommendation: {
      type: "string",
      description: "Suggested starting point",
    },
  },
  required: ["categories", "totalTools"],
  description: "Tool categories for progressive discovery",
};

const listCategoryToolsOutputSchema: OutputSchema = {
  type: "object",
  properties: {
    category: { type: "string", description: "Category name" },
    tools: {
      type: "array",
      description: "Tools in this category",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Tool name" },
          description: { type: "string", description: "What the tool does" },
          title: { type: "string", description: "Human-readable title" },
          isCompound: {
            type: "boolean",
            description: "Whether this is a compound tool",
          },
          requiresSampling: {
            type: "boolean",
            description: "Requires client sampling capability",
          },
        },
      },
    },
    suggestion: { type: "string", description: "Usage suggestion" },
  },
  required: ["category", "tools"],
  description: "Tools within a specific category",
};

// ============================================================================
// Tool Definitions
// ============================================================================

export const metaTools: ExtendedToolDefinition[] = [
  {
    name: "midnight-list-tool-categories",
    description:
      "📋 DISCOVERY TOOL: List available tool categories for progressive exploration. Use this FIRST to understand what capabilities are available, then drill into specific categories with midnight-list-category-tools. Reduces cognitive load by organizing 25 tools into 7 logical groups.",
    inputSchema: {
      type: "object" as const,
      properties: {
        includeToolCounts: {
          type: "boolean",
          description: "Include number of tools per category (default: true)",
        },
      },
      required: [],
    },
    outputSchema: listCategoriesOutputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      title: "📋 List Tool Categories",
      category: "health" as ToolCategory,
    },
    handler: listToolCategories,
  },
  {
    name: "midnight-list-category-tools",
    description:
      "📋 DISCOVERY TOOL: List tools within a specific category. Use after midnight-list-tool-categories to see detailed tool information for a category of interest. Supports progressive disclosure pattern.",
    inputSchema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: [
            "search",
            "analyze",
            "repository",
            "versioning",
            "generation",
            "health",
            "compound",
          ],
          description: "Category to list tools for",
        },
        includeSchemas: {
          type: "boolean",
          description: "Include input/output schemas (default: false)",
        },
      },
      required: ["category"],
    },
    outputSchema: listCategoryToolsOutputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      title: "📋 List Category Tools",
      category: "health" as ToolCategory,
    },
    handler: listCategoryTools,
  },
];

// Register metaTools with handlers to break circular dependency
setMetaTools(metaTools);
