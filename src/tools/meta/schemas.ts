/**
 * Meta tool input schemas
 * Zod schemas for validating tool inputs
 */

import { z } from "zod";
import type { ToolCategory } from "../../types/index.js";

// Schema definitions
export const ListToolCategoriesInputSchema = z.object({
  includeToolCounts: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include number of tools per category"),
});

export const ListCategoryToolsInputSchema = z.object({
  category: z
    .enum([
      "search",
      "analyze",
      "repository",
      "versioning",
      "generation",
      "health",
      "compound",
    ])
    .describe("Category to list tools for"),
  includeSchemas: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include input/output schemas"),
});

// Type exports
export type ListToolCategoriesInput = z.infer<
  typeof ListToolCategoriesInputSchema
>;
export type ListCategoryToolsInput = z.infer<
  typeof ListCategoryToolsInputSchema
>;

// Category info type
export interface CategoryInfo {
  description: string;
  useCases: string[];
}

// Category descriptions
export const CATEGORY_INFO: Record<ToolCategory, CategoryInfo> = {
  search: {
    description:
      "Semantic search across Midnight codebase - find code by meaning, not keywords",
    useCases: [
      "Find example implementations",
      "Search for patterns",
      "Discover relevant code",
    ],
  },
  analyze: {
    description:
      "Static analysis of Compact contracts - security, structure, patterns",
    useCases: [
      "Security audit",
      "Code review",
      "Understand contract structure",
    ],
  },
  repository: {
    description: "Access repository files, examples, and recent updates",
    useCases: [
      "Get specific files",
      "List examples",
      "Track repository changes",
    ],
  },
  versioning: {
    description:
      "Version management, breaking changes, and migration assistance",
    useCases: [
      "Check for updates",
      "Plan upgrades",
      "Compare versions",
      "Get migration guides",
    ],
  },
  generation: {
    description:
      "AI-powered code generation, review, and documentation (requires sampling)",
    useCases: ["Generate contracts", "Review code", "Generate documentation"],
  },
  health: {
    description: "Server health checks and status monitoring",
    useCases: ["Check API status", "Monitor rate limits", "Debug connectivity"],
  },
  compound: {
    description:
      "Multi-step operations in a single call - saves tokens and reduces latency",
    useCases: [
      "Full upgrade analysis",
      "Get complete repo context",
      "One-shot operations",
    ],
  },
};
