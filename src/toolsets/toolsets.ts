/**
 * Toolsets System
 *
 * Tool grouping and organization system.
 * Based on GitHub MCP server toolsets pattern.
 */

import type { Scope } from "../scopes/scopes.js"

// =============================================================================
// TOOLSET METADATA
// =============================================================================

/**
 * Unique identifier for a toolset
 */
export type ToolsetID = string

/**
 * Metadata describing a toolset
 */
export interface ToolsetMetadata {
  /** Unique identifier for this toolset */
  id: ToolsetID
  /** Human-readable description */
  description: string
  /** Whether this toolset is enabled by default */
  default?: boolean
  /** Icon name (for UI display) */
  icon?: string
  /** Category this toolset belongs to */
  category?: "midnight" | "nextjs" | "system"
  /** Required scopes for this toolset */
  scopes?: Scope[]
}

// =============================================================================
// TOOLSET DEFINITIONS
// =============================================================================

/**
 * Special toolsets
 */
export const SpecialToolsets = {
  /** Enables all available toolsets */
  All: {
    id: "all",
    description: "Special toolset that enables all available toolsets",
    icon: "apps",
    category: "system",
  } as ToolsetMetadata,

  /** Enables default toolset configuration */
  Default: {
    id: "default",
    description:
      "Special toolset that enables the default toolset configuration",
    icon: "check-circle",
    category: "system",
  } as ToolsetMetadata,
} as const

/**
 * Midnight Network toolsets
 */
export const MidnightToolsets = {
  /** Documentation and reference tools */
  Docs: {
    id: "midnight_docs",
    description:
      "Midnight Network documentation tools - search docs, get examples, and reference information",
    default: true,
    icon: "book",
    category: "midnight",
    scopes: ["midnight:docs"],
  } as ToolsetMetadata,

  /** Contract development and analysis tools */
  Contracts: {
    id: "midnight_contracts",
    description:
      "Compact smart contract tools - analysis, documentation, review, and compilation",
    default: true,
    icon: "code",
    category: "midnight",
    scopes: ["midnight:contracts:read"],
  } as ToolsetMetadata,

  /** Contract deployment and management */
  ContractManagement: {
    id: "midnight_contract_management",
    description:
      "Contract deployment and management - deploy, interact, and manage contracts",
    icon: "rocket",
    category: "midnight",
    scopes: ["midnight:contracts:write"],
  } as ToolsetMetadata,

  /** Network status and information */
  Network: {
    id: "midnight_network",
    description:
      "Midnight Network status and information - network health, block info, transactions",
    default: true,
    icon: "globe",
    category: "midnight",
    scopes: ["midnight:network:read"],
  } as ToolsetMetadata,

  /** Wallet and transaction tools */
  Wallet: {
    id: "midnight_wallet",
    description:
      "Wallet tools - balance queries, transaction history, and wallet management",
    icon: "wallet",
    category: "midnight",
    scopes: ["midnight:wallet:read"],
  } as ToolsetMetadata,

  /** Transaction signing and submission */
  Transactions: {
    id: "midnight_transactions",
    description:
      "Transaction tools - sign, submit, and track transactions on Midnight Network",
    icon: "arrow-switch",
    category: "midnight",
    scopes: ["midnight:wallet:write"],
  } as ToolsetMetadata,

  /** Version management tools */
  Versions: {
    id: "midnight_versions",
    description:
      "Version management - check versions, breaking changes, migration guides",
    default: true,
    icon: "tag",
    category: "midnight",
    scopes: ["midnight:docs"],
  } as ToolsetMetadata,
} as const

/**
 * Next.js DevTools toolsets
 */
export const NextJSToolsets = {
  /** Development status and diagnostics */
  Status: {
    id: "nextjs_status",
    description:
      "Next.js DevTools status - server status, health checks, and diagnostics",
    default: true,
    icon: "pulse",
    category: "nextjs",
    scopes: ["nextjs:devtools:read"],
  } as ToolsetMetadata,

  /** Browser automation tools */
  Browser: {
    id: "nextjs_browser",
    description:
      "Browser automation - Playwright-based testing, screenshots, and interaction",
    icon: "browser",
    category: "nextjs",
    scopes: ["nextjs:devtools:write"],
  } as ToolsetMetadata,

  /** Migration and upgrade tools */
  Migration: {
    id: "nextjs_migration",
    description:
      "Next.js migration tools - upgrade guides, codemods, and compatibility checks",
    icon: "arrow-up",
    category: "nextjs",
    scopes: ["nextjs:migration"],
  } as ToolsetMetadata,

  /** Documentation tools */
  Docs: {
    id: "nextjs_docs",
    description: "Next.js documentation - API reference, guides, and examples",
    default: true,
    icon: "book",
    category: "nextjs",
    scopes: ["nextjs:docs"],
  } as ToolsetMetadata,
} as const

/**
 * System/meta toolsets
 */
export const SystemToolsets = {
  /** Context and session tools */
  Context: {
    id: "context",
    description:
      "Context tools - session info, environment, feature flags, and server status",
    default: true,
    icon: "info",
    category: "system",
  } as ToolsetMetadata,

  /** Dynamic tool discovery */
  Dynamic: {
    id: "dynamic",
    description:
      "Dynamic toolset management - enable/disable toolsets at runtime, discover available tools",
    icon: "gear",
    category: "system",
  } as ToolsetMetadata,
} as const

// =============================================================================
// TOOLSET REGISTRY
// =============================================================================

/**
 * All available toolsets
 */
export const AllToolsets: Record<ToolsetID, ToolsetMetadata> = {
  // Special
  [SpecialToolsets.All.id]: SpecialToolsets.All,
  [SpecialToolsets.Default.id]: SpecialToolsets.Default,

  // Midnight
  [MidnightToolsets.Docs.id]: MidnightToolsets.Docs,
  [MidnightToolsets.Contracts.id]: MidnightToolsets.Contracts,
  [MidnightToolsets.ContractManagement.id]:
    MidnightToolsets.ContractManagement,
  [MidnightToolsets.Network.id]: MidnightToolsets.Network,
  [MidnightToolsets.Wallet.id]: MidnightToolsets.Wallet,
  [MidnightToolsets.Transactions.id]: MidnightToolsets.Transactions,
  [MidnightToolsets.Versions.id]: MidnightToolsets.Versions,

  // Next.js
  [NextJSToolsets.Status.id]: NextJSToolsets.Status,
  [NextJSToolsets.Browser.id]: NextJSToolsets.Browser,
  [NextJSToolsets.Migration.id]: NextJSToolsets.Migration,
  [NextJSToolsets.Docs.id]: NextJSToolsets.Docs,

  // System
  [SystemToolsets.Context.id]: SystemToolsets.Context,
  [SystemToolsets.Dynamic.id]: SystemToolsets.Dynamic,
}

// =============================================================================
// TOOLSET UTILITIES
// =============================================================================

/**
 * Get all default toolset IDs
 */
export function getDefaultToolsetIDs(): ToolsetID[] {
  return Object.values(AllToolsets)
    .filter((t) => t.default === true)
    .map((t) => t.id)
}

/**
 * Get all available toolset IDs (excluding special toolsets)
 */
export function getAvailableToolsetIDs(
  ...exclude: ToolsetID[]
): ToolsetID[] {
  const excludeSet = new Set([
    SpecialToolsets.All.id,
    SpecialToolsets.Default.id,
    ...exclude,
  ])
  return Object.keys(AllToolsets).filter((id) => !excludeSet.has(id))
}

/**
 * Get toolsets by category
 */
export function getToolsetsByCategory(
  category: ToolsetMetadata["category"]
): ToolsetMetadata[] {
  return Object.values(AllToolsets).filter((t) => t.category === category)
}

/**
 * Get toolset metadata by ID
 */
export function getToolsetMetadata(
  id: ToolsetID
): ToolsetMetadata | undefined {
  return AllToolsets[id]
}

/**
 * Check if a toolset is a special toolset
 */
export function isSpecialToolset(id: ToolsetID): boolean {
  return id === SpecialToolsets.All.id || id === SpecialToolsets.Default.id
}

/**
 * Expand toolset list - handles "all" and "default" keywords
 */
export function expandToolsets(toolsets: ToolsetID[]): ToolsetID[] {
  const result = new Set<ToolsetID>()

  for (const toolset of toolsets) {
    if (toolset === SpecialToolsets.All.id) {
      // Add all non-special toolsets
      for (const id of getAvailableToolsetIDs()) {
        result.add(id)
      }
    } else if (toolset === SpecialToolsets.Default.id) {
      // Add default toolsets
      for (const id of getDefaultToolsetIDs()) {
        result.add(id)
      }
    } else if (AllToolsets[toolset]) {
      result.add(toolset)
    }
  }

  return Array.from(result)
}

/**
 * Validate toolsets and return unrecognized ones
 */
export function validateToolsets(toolsets: ToolsetID[]): {
  valid: ToolsetID[]
  unrecognized: ToolsetID[]
} {
  const valid: ToolsetID[] = []
  const unrecognized: ToolsetID[] = []

  for (const toolset of toolsets) {
    if (AllToolsets[toolset]) {
      valid.push(toolset)
    } else {
      unrecognized.push(toolset)
    }
  }

  return { valid, unrecognized }
}

/**
 * Parse toolsets from a string (comma-separated)
 */
export function parseToolsets(input: string): ToolsetID[] {
  if (!input) return []
  return input
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/**
 * Remove a toolset from a list
 */
export function removeToolset(
  toolsets: ToolsetID[],
  toRemove: ToolsetID
): ToolsetID[] {
  return toolsets.filter((t) => t !== toRemove)
}

/**
 * Check if a toolset is in a list
 */
export function containsToolset(
  toolsets: ToolsetID[],
  toCheck: ToolsetID
): boolean {
  return toolsets.includes(toCheck)
}

/**
 * Generate help text for toolsets
 */
export function generateToolsetsHelp(): string {
  const defaults = getDefaultToolsetIDs()
  const available = getAvailableToolsetIDs()

  const lines = [
    "Comma-separated list of toolsets to enable (no spaces).",
    "",
    "Available toolsets:",
    ...available.map((id) => {
      const meta = AllToolsets[id]
      const defaultMark = meta?.default ? " (default)" : ""
      return `  - ${id}: ${meta?.description || "No description"}${defaultMark}`
    }),
    "",
    "Special keywords:",
    "  - all: Enables all available toolsets",
    "  - default: Enables the default toolsets: " + defaults.join(", "),
    "",
    "Examples:",
    "  - --toolsets=midnight_docs,midnight_contracts",
    "  - --toolsets=default,midnight_wallet",
    "  - --toolsets=all",
  ]

  return lines.join("\n")
}

/**
 * Get the minimum required scopes for a set of toolsets
 */
export function getRequiredScopesForToolsets(
  toolsets: ToolsetID[]
): Scope[] {
  const scopes = new Set<Scope>()

  for (const toolsetId of toolsets) {
    const meta = AllToolsets[toolsetId]
    if (meta?.scopes) {
      for (const scope of meta.scopes) {
        scopes.add(scope)
      }
    }
  }

  return Array.from(scopes)
}
