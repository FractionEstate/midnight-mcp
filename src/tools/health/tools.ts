/**
 * Health tool definitions
 * MCP tool registration for health-related operations
 */

import type {
  ExtendedToolDefinition,
  OutputSchema,
} from "../../types/index.js";
import {
  healthCheck,
  getStatus,
  checkVersion,
  getAutoUpdateConfig,
  checkDataFreshness,
} from "./handlers.js";

// ============================================================================
// Output Schemas
// ============================================================================

const healthCheckOutputSchema: OutputSchema = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["healthy", "degraded", "unhealthy"],
      description: "Overall health status",
    },
    version: { type: "string", description: "Server version" },
    rateLimit: {
      type: "object",
      properties: {
        remaining: { type: "number" },
        limit: { type: "number" },
        percentUsed: { type: "number" },
        status: { type: "string" },
      },
    },
    cacheStats: {
      type: "object",
      properties: {
        search: { type: "object" },
        file: { type: "object" },
        metadata: { type: "object" },
      },
    },
  },
  required: ["status"],
  description: "Server health status with optional detailed diagnostics",
};

const getStatusOutputSchema: OutputSchema = {
  type: "object",
  properties: {
    server: { type: "string", description: "Server name" },
    status: { type: "string", description: "Running status" },
    timestamp: { type: "string", description: "ISO timestamp" },
    rateLimit: {
      type: "object",
      properties: {
        remaining: { type: "number" },
        limit: { type: "number" },
        percentUsed: { type: "number" },
        status: { type: "string" },
        message: { type: "string" },
      },
    },
    cache: {
      type: "object",
      properties: {
        search: { type: "object" },
        file: { type: "object" },
        metadata: { type: "object" },
      },
    },
  },
  required: ["server", "status", "timestamp"],
  description: "Current server status and statistics",
};

const checkVersionOutputSchema: OutputSchema = {
  type: "object" as const,
  properties: {
    currentVersion: {
      type: "string",
      description: "Your installed version",
    },
    latestVersion: { type: "string", description: "Latest version on npm" },
    isUpToDate: {
      type: "boolean",
      description: "Whether you have the latest",
    },
    message: { type: "string", description: "Status message" },
    updateInstructions: {
      type: "object",
      description: "How to update if outdated",
    },
    newFeatures: {
      type: "array",
      items: { type: "string" },
      description: "New features in latest version",
    },
  },
};

const autoUpdateConfigOutputSchema: OutputSchema = {
  type: "object" as const,
  properties: {
    instruction: { type: "string" },
    platform: { type: "string" },
    configPaths: { type: "object" },
    searchAndReplace: { type: "object" },
    agentInstructions: { type: "array", items: { type: "string" } },
    postUpdateMessage: { type: "string" },
  },
};

const dataFreshnessOutputSchema: OutputSchema = {
  type: "object" as const,
  properties: {
    summary: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["fresh", "partially-stale", "stale", "unknown"] },
        totalRepositories: { type: "number" },
        staleRepositories: { type: "number" },
        freshRepositories: { type: "number" },
        lastIndexed: { type: "string" },
        lastIndexedRelative: { type: "string" },
        generatedAt: { type: "string" },
      },
      description: "Overall freshness summary",
    },
    repositories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          repository: { type: "string" },
          status: { type: "string" },
          lastIndexed: { type: "string" },
          documentCount: { type: "number" },
          warning: { type: "string" },
        },
      },
      description: "Per-repository freshness status",
    },
    indexingSchedule: {
      type: "object",
      properties: {
        fullIndex: { type: "string" },
        priorityRepos: { type: "string" },
        nextFullIndex: { type: "string" },
      },
      description: "Indexing schedule information",
    },
    message: { type: "string", description: "Human-readable status message" },
  },
  description: "Data freshness status and staleness information",
};

// ============================================================================
// Tool Definitions
// ============================================================================

export const healthTools: ExtendedToolDefinition[] = [
  {
    name: "midnight-health-check",
    description:
      "Check the health status of the Midnight MCP server. Returns server status, API connectivity, and resource availability.",
    inputSchema: {
      type: "object" as const,
      properties: {
        detailed: {
          type: "boolean",
          description:
            "Include detailed checks including GitHub API and vector store status (slower)",
          default: false,
        },
      },
    },
    outputSchema: healthCheckOutputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      title: "Health Check",
      category: "health",
    },
    handler: healthCheck,
  },
  {
    name: "midnight-get-status",
    description:
      "Get current server status including rate limits and cache statistics. Quick status check without external API calls.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
    outputSchema: getStatusOutputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      title: "Get Server Status",
      category: "health",
    },
    handler: getStatus,
  },
  {
    name: "midnight-check-version",
    description:
      "🔄 Check if you're running the latest version of midnight-nextjs-mcp. " +
      "Compares your installed version against npm registry and provides update instructions if outdated. " +
      "Use this if tools seem missing or you want to ensure you have the latest features.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
    outputSchema: checkVersionOutputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
      title: "🔄 Check for Updates",
      category: "health",
    },
    handler: checkVersion,
  },
  {
    name: "midnight-auto-update-config",
    description:
      "⚠️ DEPRECATED: Auto-update is NOT possible because AI agents run in sandboxed environments without access to local filesystems. " +
      "Instead, tell users to manually update their config to use midnight-nextjs-mcp@latest, then run: rm -rf ~/.npm/_npx && restart their editor. " +
      "This tool only returns config file paths for reference.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
    outputSchema: autoUpdateConfigOutputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      title: "🔧 Auto-Update Config",
      category: "health",
    },
    handler: getAutoUpdateConfig,
  },
  {
    name: "midnight-data-freshness",
    description:
      "🕐 Check data freshness for indexed Midnight Network documentation and code. " +
      "Returns when data was last indexed, staleness warnings, and indexing schedule. " +
      "Use this to verify if the knowledge base is up-to-date before relying on search results.",
    inputSchema: {
      type: "object" as const,
      properties: {
        repository: {
          type: "string",
          description:
            "Specific repository to check (e.g., 'compact', 'midnight-js'). If omitted, checks all repositories.",
        },
      },
    },
    outputSchema: dataFreshnessOutputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      title: "🕐 Check Data Freshness",
      category: "health",
    },
    handler: checkDataFreshness,
  },
];
