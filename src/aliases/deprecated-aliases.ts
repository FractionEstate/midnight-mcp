/**
 * Deprecated Tool Aliases
 *
 * Mapping of deprecated tool names to their replacements.
 * Based on GitHub MCP server deprecated_tool_aliases.go patterns.
 */

// =============================================================================
// ALIAS MAP
// =============================================================================

/**
 * Map of deprecated tool names to their replacement names.
 * When a deprecated tool is called, it will be redirected to the new tool.
 */
export const DeprecatedToolAliases: Record<string, string> = {
  // Example aliases - add real deprecations as needed
  // "old_tool_name": "new_tool_name",

  // Midnight aliases
  "midnight-get-docs": "midnight-search-docs",
  "midnight-check-update": "midnight-check-version",
  "midnight_get_docs": "midnight_search_docs",
  "midnight_check_update": "midnight_check_version",

  // Next.js aliases
  "nextjs-verify": "nextjs-browser-eval",
  "nextjs_verify": "nextjs_browser_eval",
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a tool name is deprecated
 */
export function isDeprecatedTool(name: string): boolean {
  return name in DeprecatedToolAliases
}

/**
 * Get the replacement tool name for a deprecated tool
 */
export function getReplacementTool(deprecatedName: string): string | undefined {
  return DeprecatedToolAliases[deprecatedName]
}

/**
 * Resolve a tool name, returning the replacement if deprecated
 */
export function resolveToolName(name: string): string {
  return DeprecatedToolAliases[name] ?? name
}

/**
 * Get all deprecated tool names
 */
export function getDeprecatedToolNames(): string[] {
  return Object.keys(DeprecatedToolAliases)
}

/**
 * Create a deprecation warning message
 */
export function createDeprecationWarning(
  deprecatedName: string,
  newName: string
): string {
  return `Warning: Tool '${deprecatedName}' is deprecated. Use '${newName}' instead.`
}

/**
 * Tool registration options with deprecation support
 */
export interface DeprecationOptions {
  /** Whether to register aliases for deprecated tools */
  registerAliases?: boolean
  /** Whether to log warnings when deprecated tools are used */
  warnOnUse?: boolean
  /** Custom warning handler */
  onDeprecatedUse?: (deprecatedName: string, newName: string) => void
}

/**
 * Wrap a tool handler to handle deprecation
 */
export function withDeprecationHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  handler: T,
  deprecatedName: string,
  newName: string,
  options: DeprecationOptions = {}
): T {
  const { warnOnUse = true, onDeprecatedUse } = options

  return (async (...args: Parameters<T>) => {
    if (warnOnUse) {
      console.warn(createDeprecationWarning(deprecatedName, newName))
    }
    if (onDeprecatedUse) {
      onDeprecatedUse(deprecatedName, newName)
    }
    return handler(...args)
  }) as T
}

// =============================================================================
// ALIAS REGISTRATION
// =============================================================================

/**
 * Create alias registrations for all deprecated tools
 * Returns an array of [aliasName, targetName] pairs
 */
export function getAliasRegistrations(): Array<[string, string]> {
  return Object.entries(DeprecatedToolAliases)
}

/**
 * Merge user-provided aliases with default deprecated aliases
 */
export function mergeAliases(
  userAliases: Record<string, string>
): Record<string, string> {
  return {
    ...DeprecatedToolAliases,
    ...userAliases,
  }
}
