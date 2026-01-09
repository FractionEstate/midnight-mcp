/**
 * Scopes System
 *
 * Permission scope management for tool access control.
 * Based on GitHub MCP server scopes package patterns.
 */

// =============================================================================
// SCOPE DEFINITIONS
// =============================================================================

/**
 * Scope represents a permission scope for tool access.
 * Similar to OAuth scopes but adapted for MCP tools.
 */
export type Scope = string

/**
 * Common scope constants for Midnight Network operations
 */
export const MidnightScopes = {
  /** No scope required - public access */
  NoScope: "" as Scope,

  /** Full network access - read/write operations */
  Network: "midnight:network" as Scope,

  /** Read-only network access */
  NetworkRead: "midnight:network:read" as Scope,

  /** Write operations on network (transactions, etc.) */
  NetworkWrite: "midnight:network:write" as Scope,

  /** Full contract access */
  Contracts: "midnight:contracts" as Scope,

  /** Read-only contract access (analyze, read state) */
  ContractsRead: "midnight:contracts:read" as Scope,

  /** Deploy and modify contracts */
  ContractsWrite: "midnight:contracts:write" as Scope,

  /** Full wallet access */
  Wallet: "midnight:wallet" as Scope,

  /** Read wallet balances and state */
  WalletRead: "midnight:wallet:read" as Scope,

  /** Sign transactions and modify wallet */
  WalletWrite: "midnight:wallet:write" as Scope,

  /** Documentation access */
  Docs: "midnight:docs" as Scope,

  /** Development tools access */
  Dev: "midnight:dev" as Scope,
} as const

/**
 * Common scope constants for Next.js operations
 */
export const NextJSScopes = {
  /** No scope required */
  NoScope: "" as Scope,

  /** Full devtools access */
  DevTools: "nextjs:devtools" as Scope,

  /** Read-only devtools (diagnostics, status) */
  DevToolsRead: "nextjs:devtools:read" as Scope,

  /** Write operations (browser automation) */
  DevToolsWrite: "nextjs:devtools:write" as Scope,

  /** Migration tools access */
  Migration: "nextjs:migration" as Scope,

  /** Documentation access */
  Docs: "nextjs:docs" as Scope,
} as const

// =============================================================================
// SCOPE HIERARCHY
// =============================================================================

/**
 * Scope hierarchy defines parent-child relationships between scopes.
 * A parent scope implicitly grants access to all child scopes.
 *
 * Example: "midnight:network" grants access to "midnight:network:read" and "midnight:network:write"
 */
export const ScopeHierarchy: Record<Scope, Scope[]> = {
  // Midnight hierarchies
  [MidnightScopes.Network]: [
    MidnightScopes.NetworkRead,
    MidnightScopes.NetworkWrite,
  ],
  [MidnightScopes.NetworkWrite]: [MidnightScopes.NetworkRead],

  [MidnightScopes.Contracts]: [
    MidnightScopes.ContractsRead,
    MidnightScopes.ContractsWrite,
  ],
  [MidnightScopes.ContractsWrite]: [MidnightScopes.ContractsRead],

  [MidnightScopes.Wallet]: [
    MidnightScopes.WalletRead,
    MidnightScopes.WalletWrite,
  ],
  [MidnightScopes.WalletWrite]: [MidnightScopes.WalletRead],

  // NextJS hierarchies
  [NextJSScopes.DevTools]: [
    NextJSScopes.DevToolsRead,
    NextJSScopes.DevToolsWrite,
  ],
  [NextJSScopes.DevToolsWrite]: [NextJSScopes.DevToolsRead],
}

// =============================================================================
// SCOPE SET
// =============================================================================

/**
 * ScopeSet represents a set of scopes with utility methods.
 */
export class ScopeSet {
  private scopes: Set<Scope>

  constructor(scopes: Scope[] = []) {
    this.scopes = new Set(scopes)
  }

  /**
   * Create a new ScopeSet from scopes
   */
  static from(...scopes: Scope[]): ScopeSet {
    return new ScopeSet(scopes)
  }

  /**
   * Add a scope to the set
   */
  add(scope: Scope): this {
    this.scopes.add(scope)
    return this
  }

  /**
   * Check if scope is in the set
   */
  has(scope: Scope): boolean {
    return this.scopes.has(scope)
  }

  /**
   * Convert to array
   */
  toArray(): Scope[] {
    return Array.from(this.scopes).sort()
  }

  /**
   * Convert to string array
   */
  toStringArray(): string[] {
    return this.toArray()
  }

  /**
   * Get the size of the set
   */
  get size(): number {
    return this.scopes.size
  }

  /**
   * Check if set is empty
   */
  isEmpty(): boolean {
    return this.scopes.size === 0
  }
}

// =============================================================================
// SCOPE UTILITIES
// =============================================================================

/**
 * Expand scopes to include parent scopes that grant access.
 *
 * For example, if "midnight:network:read" is required, "midnight:network"
 * is also accepted since having that scope grants access to the child.
 *
 * @param required - The required scopes
 * @returns All accepted scopes including parent scopes
 */
export function expandScopes(required: Scope[]): Scope[] {
  if (required.length === 0) {
    return []
  }

  const accepted = new Set<Scope>(required)

  // Add parent scopes that grant access to required scopes
  for (const [parent, children] of Object.entries(ScopeHierarchy)) {
    for (const child of children) {
      if (accepted.has(child)) {
        accepted.add(parent as Scope)
      }
    }
  }

  return Array.from(accepted).sort()
}

/**
 * Expand a scope set to include all child scopes it grants.
 *
 * For example, if user has "midnight:network", they also have
 * "midnight:network:read" and "midnight:network:write".
 *
 * @param scopes - The granted scopes
 * @returns All scopes including children
 */
export function expandScopeSet(scopes: Scope[]): Set<Scope> {
  const expanded = new Set<Scope>(scopes)

  for (const scope of scopes) {
    const children = ScopeHierarchy[scope]
    if (children) {
      for (const child of children) {
        expanded.add(child)
      }
    }
  }

  return expanded
}

/**
 * Check if granted scopes satisfy the required scopes.
 *
 * A scope requirement is satisfied if ANY of the accepted scopes
 * are granted (directly or via scope hierarchy).
 *
 * @param grantedScopes - Scopes the user/token has
 * @param acceptedScopes - Scopes that would satisfy the requirement
 * @returns true if requirements are satisfied
 */
export function hasRequiredScopes(
  grantedScopes: Scope[],
  acceptedScopes: Scope[]
): boolean {
  // No scopes required = always allowed
  if (acceptedScopes.length === 0) {
    return true
  }

  // Expand granted scopes to include child scopes they grant
  const expanded = expandScopeSet(grantedScopes)

  // Check if any accepted scope is granted
  for (const accepted of acceptedScopes) {
    if (expanded.has(accepted)) {
      return true
    }
  }

  return false
}

/**
 * Get the minimum scopes required for a set of tools.
 * This computes the intersection of parent scopes that grant all required access.
 *
 * @param toolScopes - Array of scope requirements for each tool
 * @returns Minimum set of scopes that grants all access
 */
export function getMinimumScopes(toolScopes: Scope[][]): Scope[] {
  if (toolScopes.length === 0) {
    return []
  }

  // Collect all unique required scopes
  const allRequired = new Set<Scope>()
  for (const scopes of toolScopes) {
    for (const scope of scopes) {
      allRequired.add(scope)
    }
  }

  // Find parent scopes that cover multiple requirements
  const result = new Set<Scope>()
  const covered = new Set<Scope>()

  for (const [parent, children] of Object.entries(ScopeHierarchy)) {
    const coversRequired = children.filter(c => allRequired.has(c))
    if (coversRequired.length > 1) {
      // This parent covers multiple required scopes - use it
      result.add(parent as Scope)
      for (const child of coversRequired) {
        covered.add(child)
      }
    }
  }

  // Add remaining uncovered scopes
  for (const required of allRequired) {
    if (!covered.has(required)) {
      result.add(required)
    }
  }

  return Array.from(result).sort()
}

/**
 * Describe a scope in human-readable terms
 */
export function describeScope(scope: Scope): string {
  const descriptions: Record<string, string> = {
    [MidnightScopes.Network]: "Full Midnight Network access",
    [MidnightScopes.NetworkRead]: "Read Midnight Network data",
    [MidnightScopes.NetworkWrite]: "Write to Midnight Network",
    [MidnightScopes.Contracts]: "Full contract management",
    [MidnightScopes.ContractsRead]: "Read contract data",
    [MidnightScopes.ContractsWrite]: "Deploy and modify contracts",
    [MidnightScopes.Wallet]: "Full wallet access",
    [MidnightScopes.WalletRead]: "Read wallet balances",
    [MidnightScopes.WalletWrite]: "Sign transactions",
    [MidnightScopes.Docs]: "Access documentation",
    [MidnightScopes.Dev]: "Development tools",
    [NextJSScopes.DevTools]: "Full Next.js DevTools access",
    [NextJSScopes.DevToolsRead]: "Read-only DevTools",
    [NextJSScopes.DevToolsWrite]: "Browser automation",
    [NextJSScopes.Migration]: "Migration tools",
    [NextJSScopes.Docs]: "Next.js documentation",
  }

  return descriptions[scope] || scope
}

/**
 * Parse scopes from a string (comma or space separated)
 */
export function parseScopes(scopeString: string): Scope[] {
  if (!scopeString) return []

  return scopeString
    .split(/[,\s]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0) as Scope[]
}

/**
 * Format scopes as a display string
 */
export function formatScopes(scopes: Scope[]): string {
  return scopes.join(", ")
}

/**
 * Validate that a scope string matches expected format
 */
export function isValidScope(scope: string): boolean {
  // Scope format: namespace:category[:permission]
  const scopePattern = /^[a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*)*$/
  return scopePattern.test(scope)
}

/**
 * Get all known scopes
 */
export function getAllKnownScopes(): Scope[] {
  return [
    ...Object.values(MidnightScopes).filter(s => s !== ""),
    ...Object.values(NextJSScopes).filter(s => s !== ""),
  ]
}
