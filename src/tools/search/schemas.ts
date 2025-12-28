/**
 * Search tool input schemas
 * Zod schemas for validating tool inputs
 */

import { z } from "zod";

// Schema definitions
export const SearchCompactInputSchema = z.object({
  query: z.string().describe("Natural language search query for Compact code"),
  limit: z
    .number()
    .optional()
    .default(10)
    .describe("Maximum results to return"),
  filter: z
    .object({
      repository: z.string().optional(),
      isPublic: z.boolean().optional(),
    })
    .optional()
    .describe("Optional filters"),
});

export const SearchTypeScriptInputSchema = z.object({
  query: z.string().describe("Search query for TypeScript SDK code"),
  includeTypes: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include type definitions"),
  includeExamples: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include usage examples"),
  limit: z.number().optional().default(10),
});

export const SearchDocsInputSchema = z.object({
  query: z.string().describe("Documentation search query"),
  category: z
    .enum(["guides", "api", "concepts", "all"])
    .optional()
    .default("all")
    .describe("Filter by documentation category"),
  limit: z.number().optional().default(10),
});

// Type exports
export type SearchCompactInput = z.infer<typeof SearchCompactInputSchema>;
export type SearchTypeScriptInput = z.infer<typeof SearchTypeScriptInputSchema>;
export type SearchDocsInput = z.infer<typeof SearchDocsInputSchema>;
