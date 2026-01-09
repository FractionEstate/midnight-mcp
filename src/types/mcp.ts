/**
 * MCP Server Types
 *
 * Type definitions for MCP tool registration and handling.
 * Based on GitHub MCP server patterns.
 */

import type { z } from "zod"
import type { ToolResult } from "../errors/errors.js"

// =============================================================================
// TOOLSET DEFINITIONS
// =============================================================================

export type ToolsetId =
  // Midnight toolsets
  | "midnight:network"
  | "midnight:contracts"
  | "midnight:wallet"
  | "midnight:docs"
  | "midnight:dev"
  // NextJS toolsets
  | "nextjs:devtools"
  | "nextjs:migration"
  | "nextjs:docs"

export interface ToolsetMetadata {
  id: ToolsetId
  displayName: string
  description: string
}

export const TOOLSETS: Record<ToolsetId, ToolsetMetadata> = {
  // Midnight toolsets
  "midnight:network": {
    id: "midnight:network",
    displayName: "Midnight Network",
    description: "Network status, blocks, transactions, and balance queries",
  },
  "midnight:contracts": {
    id: "midnight:contracts",
    displayName: "Midnight Contracts",
    description: "Contract compilation, analysis, and deployment",
  },
  "midnight:wallet": {
    id: "midnight:wallet",
    displayName: "Midnight Wallet",
    description: "Wallet integration and transaction signing",
  },
  "midnight:docs": {
    id: "midnight:docs",
    displayName: "Midnight Documentation",
    description: "Search and retrieve Midnight documentation",
  },
  "midnight:dev": {
    id: "midnight:dev",
    displayName: "Midnight Development",
    description: "Project scaffolding, version management, and dev tools",
  },
  // NextJS toolsets
  "nextjs:devtools": {
    id: "nextjs:devtools",
    displayName: "Next.js DevTools",
    description: "Runtime diagnostics and browser automation",
  },
  "nextjs:migration": {
    id: "nextjs:migration",
    displayName: "Next.js Migration",
    description: "Upgrade and migration tools for Next.js",
  },
  "nextjs:docs": {
    id: "nextjs:docs",
    displayName: "Next.js Documentation",
    description: "Search and retrieve Next.js documentation",
  },
}

// =============================================================================
// TOOL CONTEXT
// =============================================================================

export interface ToolContext {
  /** Unique invocation ID */
  invocationId: string
  /** Tool name being executed */
  toolName: string
  /** Logger instance */
  logger: Logger
  /** Server configuration */
  config: ServerConfig
  /** Abort signal for cancellation */
  signal?: AbortSignal
}

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, data?: Record<string, unknown>): void
}

// =============================================================================
// TOOL ANNOTATIONS (Based on GitHub MCP server)
// =============================================================================

/**
 * Tool annotations provide hints about tool behavior
 * Similar to GitHub MCP server's mcp.ToolAnnotations
 */
export interface ToolAnnotations {
  /** Human-readable title for the tool */
  title?: string
  /** Whether this tool only reads data (no side effects) */
  readOnlyHint?: boolean
  /** Whether this tool performs destructive operations */
  destructiveHint?: boolean
  /** Whether this tool performs idempotent operations */
  idempotentHint?: boolean
  /** Whether this tool opens external resources (URLs, files) */
  openWorldHint?: boolean
}

// =============================================================================
// TOOL METADATA (Enhanced)
// =============================================================================

export interface ToolMetadata {
  /** Unique tool name (snake_case) */
  name: string
  /** Human-readable description */
  description: string
  /** Toolset this tool belongs to */
  toolset: ToolsetId
  /** Whether this tool only reads data (no side effects) */
  readOnly: boolean
  /** Feature flag for conditional enablement */
  featureFlag?: string
  /** Required authentication scopes */
  requiredAuth?: string[]
  /** Aliases for this tool */
  aliases?: string[]
  /** Tool annotations with behavioral hints */
  annotations?: ToolAnnotations
}

// =============================================================================
// TOOL MODULE (Enhanced)
// =============================================================================

export interface ToolModule {
  metadata: ToolMetadata
  inputSchema: Record<string, z.ZodTypeAny>
  /** Handler function with context */
  handler: (args: Record<string, unknown>, ctx?: ToolContext) => Promise<string | ToolResult>
}

// =============================================================================
// LEGACY SUPPORT - Will be deprecated
// =============================================================================

/** @deprecated Use ToolModule with enhanced metadata instead */
export interface LegacyToolModule {
  metadata: {
    name: string
    description: string
  }
  inputSchema: Record<string, z.ZodTypeAny>
  handler: (args: Record<string, unknown>) => Promise<string>
}

// =============================================================================
// TOOL CATEGORY
// =============================================================================

export interface ToolCategory {
  name: string
  displayName: string
  description: string
  tools: ToolModule[]
  enabled: boolean
  /** Default toolsets enabled for this category */
  defaultToolsets?: ToolsetId[]
  /** Icon name for this category */
  icon?: string
}

// =============================================================================
// ENHANCED SERVER TOOL (Based on GitHub MCP patterns)
// =============================================================================

/**
 * Enhanced tool metadata with scope and feature flag support
 */
export interface EnhancedToolMetadata extends ToolMetadata {
  /** Feature flag that enables this tool */
  featureFlagEnable?: string
  /** Feature flag that disables this tool */
  featureFlagDisable?: string
  /** Required authentication scopes */
  requiredScopes?: string[]
  /** Accepted scopes (including hierarchy) */
  acceptedScopes?: string[]
  /** Icon name for this tool */
  icon?: string
}

/**
 * Context-aware tool enablement check
 */
export type ToolEnabledCheck = (ctx: ToolContext) => Promise<{
  enabled: boolean
  error?: Error
}>

/**
 * Enhanced tool module for advanced use cases
 */
export interface EnhancedToolModule extends ToolModule {
  metadata: EnhancedToolMetadata
  /** Optional: Dynamic enablement check */
  enabled?: ToolEnabledCheck
}

// =============================================================================
// RESOURCE MODULE
// =============================================================================

export interface ResourceModule {
  uri: string
  name: string
  description: string
  mimeType: string
  content: string
}

// =============================================================================
// PROMPT MODULE
// =============================================================================

export interface PromptModule {
  name: string
  description: string
  arguments?: PromptArgument[]
  handler: (args: Record<string, string>) => Promise<PromptResult>
}

export interface PromptArgument {
  name: string
  description: string
  required?: boolean
}

export interface PromptResult {
  messages: PromptMessage[]
}

export interface PromptMessage {
  role: "user" | "assistant"
  content: {
    type: "text" | "resource"
    text?: string
    resource?: {
      uri: string
      text: string
      mimeType: string
    }
  }
}

// =============================================================================
// SERVER CONFIGURATION (Enhanced)
// =============================================================================

export interface ServerConfig {
  /** Server name */
  name: string
  /** Server version */
  version: string

  /** Tool enablement (hierarchical) */
  enabledCategories: Set<string>
  enabledToolsets: Set<ToolsetId>
  enabledTools: Set<string>
  enabledFeatures: Set<string>

  /** Safety modes */
  readOnly: boolean
  dynamicTools: boolean

  /** Midnight-specific configuration */
  midnight: MidnightConfig

  /** Logging configuration */
  logging: LoggingConfig
}

export interface MidnightConfig {
  networkId: "testnet" | "devnet" | "mainnet"
  indexerUrl: string
  nodeUrl: string
  proofServerUrl: string
}

export interface LoggingConfig {
  level: "debug" | "info" | "warn" | "error"
  file?: string
  json: boolean
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_CONFIG: ServerConfig = {
  name: "midnight-nextjs-mcp",
  version: "0.1.0",
  enabledCategories: new Set(["midnight", "nextjs"]),
  enabledToolsets: new Set(Object.keys(TOOLSETS) as ToolsetId[]),
  enabledTools: new Set(),
  enabledFeatures: new Set(),
  readOnly: false,
  dynamicTools: false,
  midnight: {
    networkId: "testnet",
    indexerUrl: "https://indexer.testnet.midnight.network",
    nodeUrl: "https://rpc.testnet.midnight.network",
    proofServerUrl: "https://prover.testnet.midnight.network",
  },
  logging: {
    level: "info",
    json: false,
  },
}

// =============================================================================
// ENVIRONMENT VARIABLE MAPPING
// =============================================================================

export const ENV_VAR_MAP: Record<string, string> = {
  "MIDNIGHT_NETWORK_ID": "midnight.networkId",
  "MIDNIGHT_INDEXER_URL": "midnight.indexerUrl",
  "MIDNIGHT_NODE_URL": "midnight.nodeUrl",
  "MIDNIGHT_PROOF_SERVER_URL": "midnight.proofServerUrl",
  "MIDNIGHT_LOG_LEVEL": "logging.level",
  "MIDNIGHT_LOG_FILE": "logging.file",
  "MIDNIGHT_LOG_JSON": "logging.json",
  "MIDNIGHT_READ_ONLY": "readOnly",
  "MIDNIGHT_ENABLED_CATEGORIES": "enabledCategories",
  "MIDNIGHT_ENABLED_TOOLSETS": "enabledToolsets",
  "MIDNIGHT_ENABLED_TOOLS": "enabledTools",
  "MIDNIGHT_ENABLED_FEATURES": "enabledFeatures",
}

