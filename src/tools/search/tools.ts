/**
 * Search tool definitions
 * MCP tool registration for search operations
 */

import type {
  ExtendedToolDefinition,
  OutputSchema,
  ToolAnnotations,
} from "../../types/index.js";
import { searchCompact, searchTypeScript, searchDocs } from "./handlers.js";

// ============================================================================
// Output Schema for Search Results
// ============================================================================

const searchResultSchema: OutputSchema = {
  type: "object",
  properties: {
    results: {
      type: "array",
      description: "Array of search results",
      items: {
        type: "object",
        properties: {
          code: { type: "string", description: "The matched code content" },
          relevanceScore: {
            type: "number",
            description: "Relevance score from 0 to 1",
          },
          source: {
            type: "object",
            description: "Source location information",
            properties: {
              repository: { type: "string", description: "Repository name" },
              filePath: { type: "string", description: "File path" },
              lines: {
                type: "string",
                description: "Line range (e.g., 10-50)",
              },
            },
          },
          codeType: {
            type: "string",
            description: "Type of code (compact, typescript, markdown)",
          },
          name: { type: "string", description: "Name of the code element" },
        },
      },
    },
    totalResults: {
      type: "number",
      description: "Total number of results returned",
    },
    query: { type: "string", description: "The search query used" },
    warnings: {
      type: "array",
      description: "Any warnings about the search",
      items: { type: "string" },
    },
  },
  required: ["results", "totalResults", "query"],
  description: "Search results with relevance scores and source information",
};

// Common annotations for search tools
const searchToolAnnotations: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: true,
  category: "search",
};

// ============================================================================
// Tool Definitions
// ============================================================================

export const searchTools: ExtendedToolDefinition[] = [
  {
    name: "midnight-search-compact",
    description:
      "Semantic search across Compact smart contract code and patterns. Use this to find circuit definitions, witness functions, ledger declarations, and best practices for Midnight smart contracts.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Natural language search query for Compact code",
        },
        limit: {
          type: "number",
          description: "Maximum results to return (default: 10)",
        },
        filter: {
          type: "object",
          properties: {
            repository: { type: "string" },
            isPublic: { type: "boolean" },
          },
          description: "Optional filters",
        },
      },
      required: ["query"],
    },
    outputSchema: searchResultSchema,
    annotations: {
      ...searchToolAnnotations,
      title: "Search Compact Contracts",
    },
    handler: searchCompact,
  },
  {
    name: "midnight-search-typescript",
    description:
      "Search TypeScript SDK code, types, and API implementations. Use this to find how to use the Midnight JavaScript SDK, type definitions, and integration patterns.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query for TypeScript SDK code",
        },
        includeTypes: {
          type: "boolean",
          description: "Include type definitions (default: true)",
        },
        includeExamples: {
          type: "boolean",
          description: "Include usage examples (default: true)",
        },
        limit: {
          type: "number",
          description: "Maximum results to return (default: 10)",
        },
      },
      required: ["query"],
    },
    outputSchema: searchResultSchema,
    annotations: {
      ...searchToolAnnotations,
      title: "Search TypeScript SDK",
    },
    handler: searchTypeScript,
  },
  {
    name: "midnight-search-docs",
    description:
      "Full-text search across official Midnight documentation. Use this to find guides, API documentation, and conceptual explanations about Midnight blockchain and the Compact language.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Documentation search query",
        },
        category: {
          type: "string",
          enum: ["guides", "api", "concepts", "all"],
          description: "Filter by documentation category (default: all)",
        },
        limit: {
          type: "number",
          description: "Maximum results to return (default: 10)",
        },
      },
      required: ["query"],
    },
    outputSchema: searchResultSchema,
    annotations: {
      ...searchToolAnnotations,
      title: "Search Documentation",
    },
    handler: searchDocs,
  },
];
