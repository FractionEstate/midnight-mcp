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
  suggestTool,
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

const suggestToolOutputSchema: OutputSchema = {
  type: "object",
  properties: {
    intent: { type: "string", description: "The original intent" },
    suggestions: {
      type: "array",
      description: "Suggested tools ranked by relevance",
      items: {
        type: "object",
        properties: {
          tool: { type: "string", description: "Tool name" },
          reason: { type: "string", description: "Why this tool is suggested" },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "Match confidence",
          },
        },
      },
    },
    primaryRecommendation: {
      type: "object",
      description: "Top recommendation",
    },
    tip: { type: "string", description: "Helpful tip" },
  },
  required: ["intent", "suggestions"],
  description: "Tool suggestions based on intent",
};

// ============================================================================
// Tool Definitions
// ============================================================================

export const metaTools: ExtendedToolDefinition[] = [
  {
    name: "midnight-list-tool-categories",
    description:
      "📋 DISCOVERY TOOL: List available tool categories for progressive exploration. Use this FIRST to understand what capabilities are available, then drill into specific categories with midnight-list-category-tools. Reduces cognitive load by organizing 27 tools into 7 logical groups.",
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
  {
    name: "midnight-suggest-tool",
    description: `🎯 SMART DISCOVERY: Describe what you want to do in natural language, and get tool recommendations.

EXAMPLES:
• "I want to find example voting contracts" → midnight-search-compact
• "Check if my version is outdated" → midnight-upgrade-check
• "Analyze my contract for security issues" → midnight-analyze-contract
• "I'm new to Midnight and want to get started" → midnight-get-repo-context

This tool matches your intent against known patterns and suggests the most appropriate tools with confidence levels.

USAGE GUIDANCE:
• Call once with your intent - no need to call repeatedly
• More specific intents get better matches
• Use the primaryRecommendation for the best match`,
    inputSchema: {
      type: "object" as const,
      properties: {
        intent: {
          type: "string",
          description:
            "What you want to accomplish (natural language description)",
        },
      },
      required: ["intent"],
    },
    outputSchema: suggestToolOutputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      title: "🎯 Suggest Tool",
      category: "health" as ToolCategory,
    },
    handler: suggestTool,
  },
];

// Register metaTools with handlers to break circular dependency
setMetaTools(metaTools);
