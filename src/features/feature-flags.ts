/**
 * Feature Flag System
 *
 * Dynamic feature flag evaluation for conditional tool enablement.
 * Based on GitHub MCP server patterns.
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Feature flag checker function type
 * Returns (enabled, error). If error occurs, treat as false.
 */
export type FeatureFlagChecker = (
  ctx: FeatureFlagContext,
  flagName: string
) => Promise<{ enabled: boolean; error?: Error }>

/**
 * Context for feature flag evaluation
 */
export interface FeatureFlagContext {
  /** User/actor identifier */
  userId?: string
  /** Organization identifier */
  orgId?: string
  /** Environment (development, staging, production) */
  environment?: string
  /** Additional context properties */
  properties?: Record<string, unknown>
}

/**
 * Feature flag definition
 */
export interface FeatureFlag {
  /** Unique flag name */
  name: string
  /** Human-readable description */
  description: string
  /** Default value if not configured */
  defaultValue: boolean
  /** Whether this flag is currently enabled */
  enabled: boolean
  /** Optional: percentage rollout (0-100) */
  rolloutPercentage?: number
  /** Optional: environments where this flag is enabled */
  environments?: string[]
  /** Optional: user IDs that always get this flag */
  allowedUsers?: string[]
}

// =============================================================================
// FEATURE FLAG REGISTRY
// =============================================================================

/**
 * Static feature flag definitions
 */
export const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // Alpha features
  alpha: {
    name: "alpha",
    description: "Enable alpha/experimental features",
    defaultValue: false,
    enabled: false,
  },

  // Beta features
  beta: {
    name: "beta",
    description: "Enable beta features",
    defaultValue: false,
    enabled: false,
  },

  // Tool-specific flags
  midnight_wallet_integration: {
    name: "midnight_wallet_integration",
    description: "Enable wallet integration tools",
    defaultValue: true,
    enabled: true,
  },

  midnight_contract_deployment: {
    name: "midnight_contract_deployment",
    description: "Enable contract deployment (write operations)",
    defaultValue: false,
    enabled: false,
  },

  nextjs_experimental_features: {
    name: "nextjs_experimental_features",
    description: "Enable experimental Next.js features",
    defaultValue: false,
    enabled: false,
  },

  // Performance flags
  version_polling: {
    name: "version_polling",
    description: "Enable automatic version polling",
    defaultValue: true,
    enabled: true,
  },

  telemetry: {
    name: "telemetry",
    description: "Enable telemetry collection",
    defaultValue: true,
    enabled: true,
  },
}

// =============================================================================
// FEATURE FLAG MANAGER
// =============================================================================

export class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map()
  private overrides: Map<string, boolean> = new Map()

  constructor(flags?: Record<string, FeatureFlag>) {
    // Initialize with provided flags or defaults
    const initialFlags = flags ?? FEATURE_FLAGS
    for (const [name, flag] of Object.entries(initialFlags)) {
      this.flags.set(name, { ...flag })
    }

    // Load environment variable overrides
    this.loadEnvOverrides()
  }

  /**
   * Load feature flag overrides from environment variables
   */
  private loadEnvOverrides(): void {
    for (const [name] of this.flags) {
      const envVar = `MIDNIGHT_FF_${name.toUpperCase()}`
      const value = process.env[envVar]
      if (value !== undefined) {
        this.overrides.set(name, value === "true" || value === "1")
      }
    }
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(name: string, ctx?: FeatureFlagContext): boolean {
    // Check override first
    if (this.overrides.has(name)) {
      return this.overrides.get(name)!
    }

    // Check if flag exists
    const flag = this.flags.get(name)
    if (!flag) {
      return false
    }

    // Check environment
    if (flag.environments && ctx?.environment) {
      if (!flag.environments.includes(ctx.environment)) {
        return false
      }
    }

    // Check allowed users
    if (flag.allowedUsers && ctx?.userId) {
      if (flag.allowedUsers.includes(ctx.userId)) {
        return true
      }
    }

    // Check percentage rollout
    if (flag.rolloutPercentage !== undefined && ctx?.userId) {
      const hash = this.hashUserId(ctx.userId, name)
      if (hash > flag.rolloutPercentage) {
        return false
      }
    }

    return flag.enabled
  }

  /**
   * Create a feature flag checker function for the inventory
   */
  createChecker(): FeatureFlagChecker {
    return async (ctx: FeatureFlagContext, flagName: string) => {
      try {
        const enabled = this.isEnabled(flagName, ctx)
        return { enabled }
      } catch (error) {
        return {
          enabled: false,
          error: error instanceof Error ? error : new Error(String(error)),
        }
      }
    }
  }

  /**
   * Set an override for a feature flag
   */
  setOverride(name: string, enabled: boolean): void {
    this.overrides.set(name, enabled)
  }

  /**
   * Clear an override
   */
  clearOverride(name: string): void {
    this.overrides.delete(name)
  }

  /**
   * Get all flags and their current states
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values()).map((flag) => ({
      ...flag,
      enabled: this.overrides.has(flag.name)
        ? this.overrides.get(flag.name)!
        : flag.enabled,
    }))
  }

  /**
   * Simple hash function for consistent rollout
   */
  private hashUserId(userId: string, flagName: string): number {
    const str = `${userId}:${flagName}`
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let _instance: FeatureFlagManager | null = null

/**
 * Get the global feature flag manager instance
 */
export function getFeatureFlagManager(): FeatureFlagManager {
  if (!_instance) {
    _instance = new FeatureFlagManager()
  }
  return _instance
}

/**
 * Create a new feature flag manager (for testing)
 */
export function createFeatureFlagManager(
  flags?: Record<string, FeatureFlag>
): FeatureFlagManager {
  return new FeatureFlagManager(flags)
}

/**
 * Quick check if a feature is enabled
 */
export function isFeatureEnabled(
  name: string,
  ctx?: FeatureFlagContext
): boolean {
  return getFeatureFlagManager().isEnabled(name, ctx)
}

/**
 * Get the feature flags manager (alias for getFeatureFlagManager)
 */
export function getFeatureFlags(): FeatureFlagManager {
  return getFeatureFlagManager()
}

/**
 * Get all feature flag definitions
 */
export function getAllFeatureFlags(): FeatureFlag[] {
  return getFeatureFlagManager().getAllFlags()
}
