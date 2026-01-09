/**
 * Scope Filter
 *
 * Filter tools based on available scopes.
 * Based on GitHub MCP server scope_filter.go patterns.
 */

import type { Scope } from "../scopes/scopes.js"
import { hasRequiredScopes, MidnightScopes, NextJSScopes } from "../scopes/scopes.js"

// =============================================================================
// TYPES
// =============================================================================

/**
 * Tool metadata for scope filtering
 */
export interface ScopedTool {
  name: string
  description: string
  /** Required scopes for this tool */
  requiredScopes?: Scope[]
  /** Accepted scopes (including parent scopes that grant access) */
  acceptedScopes?: Scope[]
  /** Whether the tool is read-only */
  readOnly?: boolean
}

/**
 * Tool filter function type
 */
export type ToolFilter = (tool: ScopedTool) => boolean

// =============================================================================
// READ-ONLY SCOPE SETS
// =============================================================================

/**
 * Scopes that grant read-only access to resources
 * Tools requiring only these scopes work without write permissions
 */
const readOnlyScopesSet = new Set<Scope>([
  MidnightScopes.NetworkRead,
  MidnightScopes.ContractsRead,
  MidnightScopes.WalletRead,
  MidnightScopes.Docs,
  NextJSScopes.DevToolsRead,
  NextJSScopes.Docs,
])

/**
 * Check if all scopes are read-only scopes
 */
function onlyRequiresReadOnlyScopes(acceptedScopes: Scope[]): boolean {
  if (acceptedScopes.length === 0) {
    return false
  }
  return acceptedScopes.every((scope) => readOnlyScopesSet.has(scope))
}

// =============================================================================
// FILTER CREATION
// =============================================================================

/**
 * Create a tool filter based on available token scopes.
 *
 * For sessions with known scopes (e.g., from environment config),
 * this filters out tools that require scopes the token doesn't have.
 *
 * The filter returns true (include tool) if:
 * - The tool has no scope requirements (acceptedScopes is empty)
 * - The tool is read-only and only requires read-only scopes
 * - The token has at least one of the tool's accepted scopes
 *
 * @param tokenScopes - Scopes available to the current session
 * @returns Tool filter function
 *
 * @example
 * ```typescript
 * const filter = createToolScopeFilter([MidnightScopes.NetworkRead])
 * const visibleTools = allTools.filter(filter)
 * ```
 */
export function createToolScopeFilter(tokenScopes: Scope[]): ToolFilter {
  return (tool: ScopedTool): boolean => {
    // No scope requirements = always include
    if (!tool.acceptedScopes || tool.acceptedScopes.length === 0) {
      return true
    }

    // Read-only tools requiring only read-only scopes are always included
    if (tool.readOnly && onlyRequiresReadOnlyScopes(tool.acceptedScopes)) {
      return true
    }

    // Check if token has any of the accepted scopes
    return hasRequiredScopes(tokenScopes, tool.acceptedScopes)
  }
}

/**
 * Create a read-only filter that only includes read-only tools
 *
 * @returns Tool filter function
 */
export function createReadOnlyFilter(): ToolFilter {
  return (tool: ScopedTool): boolean => {
    return tool.readOnly === true
  }
}

/**
 * Create a combined filter from multiple filters (AND logic)
 *
 * @param filters - Array of filters to combine
 * @returns Combined tool filter function
 */
export function combineFilters(...filters: ToolFilter[]): ToolFilter {
  return (tool: ScopedTool): boolean => {
    return filters.every((filter) => filter(tool))
  }
}

/**
 * Create a filter that includes tools matching ANY of the filters (OR logic)
 *
 * @param filters - Array of filters to combine
 * @returns Combined tool filter function
 */
export function anyFilter(...filters: ToolFilter[]): ToolFilter {
  return (tool: ScopedTool): boolean => {
    return filters.some((filter) => filter(tool))
  }
}

/**
 * Create a negated filter
 *
 * @param filter - Filter to negate
 * @returns Negated tool filter function
 */
export function notFilter(filter: ToolFilter): ToolFilter {
  return (tool: ScopedTool): boolean => {
    return !filter(tool)
  }
}

// =============================================================================
// SCOPE UTILITIES
// =============================================================================

/**
 * Get the minimum scopes required to access a set of tools
 *
 * @param tools - Array of tools to analyze
 * @returns Array of unique required scopes
 */
export function getRequiredScopesForTools(tools: ScopedTool[]): Scope[] {
  const scopes = new Set<Scope>()

  for (const tool of tools) {
    if (tool.requiredScopes) {
      for (const scope of tool.requiredScopes) {
        scopes.add(scope)
      }
    }
  }

  return Array.from(scopes)
}

/**
 * Filter tools and return both included and excluded lists
 *
 * @param tools - Array of tools to filter
 * @param filter - Filter function to apply
 * @returns Object with included and excluded tool arrays
 */
export function partitionTools<T extends ScopedTool>(
  tools: T[],
  filter: ToolFilter
): { included: T[]; excluded: T[] } {
  const included: T[] = []
  const excluded: T[] = []

  for (const tool of tools) {
    if (filter(tool)) {
      included.push(tool)
    } else {
      excluded.push(tool)
    }
  }

  return { included, excluded }
}

/**
 * Create a scope-aware tool wrapper that adds scope metadata
 *
 * @param tool - Base tool definition
 * @param requiredScopes - Required scopes for the tool
 * @param acceptedScopes - Accepted scopes (optional, computed from required if not provided)
 * @returns Tool with scope metadata
 */
export function withScopes<T extends { name: string; description: string }>(
  tool: T,
  requiredScopes: Scope[],
  acceptedScopes?: Scope[]
): T & ScopedTool {
  return {
    ...tool,
    requiredScopes,
    acceptedScopes: acceptedScopes ?? requiredScopes,
  }
}
