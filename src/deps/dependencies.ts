/**
 * Tool Dependencies
 *
 * Dependency injection system for tool handlers.
 * Based on GitHub MCP server dependencies.go patterns.
 */

import type { Scope } from "../scopes/scopes.js"
import type { ToolsetID } from "../toolsets/toolsets.js"

// =============================================================================
// CONTEXT KEY SYMBOLS
// =============================================================================

/** Symbol for storing dependencies in context */
const DEPS_CONTEXT_KEY = Symbol("toolDependencies")

// =============================================================================
// FEATURE FLAGS
// =============================================================================

/**
 * Feature flags for controlling tool behavior
 */
export interface FeatureFlags {
  /** Enable lockdown mode (restrict access) */
  lockdownMode?: boolean
  /** Enable read-only mode (disable writes) */
  readOnlyMode?: boolean
  /** Enable dynamic toolsets */
  dynamicToolsets?: boolean
  /** Custom feature flags */
  [key: string]: boolean | undefined
}

// =============================================================================
// TRANSLATION HELPER
// =============================================================================

/**
 * Translation helper function type
 */
export type TranslationHelperFunc = (key: string, fallback: string) => string

// =============================================================================
// TOOL DEPENDENCIES INTERFACE
// =============================================================================

/**
 * Interface for dependencies that tool handlers need.
 * Different server implementations can provide their own implementations.
 */
export interface ToolDependencies {
  /** Get translation function */
  getTranslator(): TranslationHelperFunc

  /** Get feature flags */
  getFeatureFlags(): FeatureFlags

  /** Get content window size for response truncation */
  getContentWindowSize(): number

  /** Get available scopes for the current session */
  getTokenScopes(): Scope[]

  /** Check if a toolset is enabled */
  isToolsetEnabled(toolsetId: ToolsetID): boolean

  /** Enable a toolset at runtime */
  enableToolset(toolsetId: ToolsetID): void

  /** Get Midnight client (if available) */
  getMidnightClient(): Promise<unknown | undefined>

  /** Get Next.js client (if available) */
  getNextJSClient(): Promise<unknown | undefined>
}

// =============================================================================
// BASE DEPENDENCIES IMPLEMENTATION
// =============================================================================

/**
 * Options for creating BaseDeps
 */
export interface BaseDepsOptions {
  /** Translation function */
  translator?: TranslationHelperFunc
  /** Feature flags */
  featureFlags?: FeatureFlags
  /** Content window size */
  contentWindowSize?: number
  /** Token scopes */
  tokenScopes?: Scope[]
  /** Initially enabled toolsets */
  enabledToolsets?: Set<ToolsetID>
  /** Midnight client factory */
  midnightClientFactory?: () => Promise<unknown>
  /** Next.js client factory */
  nextjsClientFactory?: () => Promise<unknown>
}

/**
 * Standard implementation of ToolDependencies
 */
export class BaseDeps implements ToolDependencies {
  private translator: TranslationHelperFunc
  private featureFlags: FeatureFlags
  private contentWindowSize: number
  private tokenScopes: Scope[]
  private enabledToolsets: Set<ToolsetID>
  private midnightClientFactory?: () => Promise<unknown>
  private nextjsClientFactory?: () => Promise<unknown>

  constructor(options: BaseDepsOptions = {}) {
    this.translator = options.translator ?? ((_, fallback) => fallback)
    this.featureFlags = options.featureFlags ?? {}
    this.contentWindowSize = options.contentWindowSize ?? 100000
    this.tokenScopes = options.tokenScopes ?? []
    this.enabledToolsets = options.enabledToolsets ?? new Set()
    this.midnightClientFactory = options.midnightClientFactory
    this.nextjsClientFactory = options.nextjsClientFactory
  }

  getTranslator(): TranslationHelperFunc {
    return this.translator
  }

  getFeatureFlags(): FeatureFlags {
    return this.featureFlags
  }

  getContentWindowSize(): number {
    return this.contentWindowSize
  }

  getTokenScopes(): Scope[] {
    return this.tokenScopes
  }

  isToolsetEnabled(toolsetId: ToolsetID): boolean {
    return this.enabledToolsets.has(toolsetId)
  }

  enableToolset(toolsetId: ToolsetID): void {
    this.enabledToolsets.add(toolsetId)
  }

  async getMidnightClient(): Promise<unknown | undefined> {
    if (this.midnightClientFactory) {
      return this.midnightClientFactory()
    }
    return undefined
  }

  async getNextJSClient(): Promise<unknown | undefined> {
    if (this.nextjsClientFactory) {
      return this.nextjsClientFactory()
    }
    return undefined
  }
}

// =============================================================================
// CONTEXT UTILITIES
// =============================================================================

/**
 * Simple context type for storing dependencies
 */
export type DepsContext = Map<symbol, unknown>

/**
 * Create a new context with dependencies
 */
export function createContextWithDeps(deps: ToolDependencies): DepsContext {
  const ctx = new Map<symbol, unknown>()
  ctx.set(DEPS_CONTEXT_KEY, deps)
  return ctx
}

/**
 * Get dependencies from context
 */
export function getDepsFromContext(ctx: DepsContext): ToolDependencies | undefined {
  return ctx.get(DEPS_CONTEXT_KEY) as ToolDependencies | undefined
}

/**
 * Get dependencies from context, throwing if not found
 */
export function mustGetDepsFromContext(ctx: DepsContext): ToolDependencies {
  const deps = getDepsFromContext(ctx)
  if (!deps) {
    throw new Error(
      "ToolDependencies not found in context; use createContextWithDeps to inject"
    )
  }
  return deps
}

// =============================================================================
// TOOL RESULT UTILITIES
// =============================================================================

/**
 * Create a text tool result
 */
export function createTextResult(text: string): {
  content: Array<{ type: "text"; text: string }>
} {
  return {
    content: [{ type: "text", text }],
  }
}

/**
 * Create an error tool result
 */
export function createErrorResult(message: string): {
  content: Array<{ type: "text"; text: string }>
  isError: true
} {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  }
}

/**
 * Create a JSON tool result
 */
export function createJsonResult<T>(data: T): {
  content: Array<{ type: "text"; text: string }>
} {
  return createTextResult(JSON.stringify(data, null, 2))
}

// =============================================================================
// PARAMETER UTILITIES
// =============================================================================

/**
 * Get a required parameter from args
 */
export function requiredParam<T>(
  args: Record<string, unknown>,
  name: string
): T {
  const value = args[name]
  if (value === undefined || value === null) {
    throw new Error(`Missing required parameter: ${name}`)
  }
  return value as T
}

/**
 * Get an optional parameter from args with default
 */
export function optionalParam<T>(
  args: Record<string, unknown>,
  name: string,
  defaultValue: T
): T {
  const value = args[name]
  if (value === undefined || value === null) {
    return defaultValue
  }
  return value as T
}

/**
 * Get an optional string parameter
 */
export function optionalStringParam(
  args: Record<string, unknown>,
  name: string
): string | undefined {
  const value = args[name]
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value !== "string") {
    throw new Error(`Parameter ${name} must be a string`)
  }
  return value
}

/**
 * Get an optional number parameter
 */
export function optionalNumberParam(
  args: Record<string, unknown>,
  name: string
): number | undefined {
  const value = args[name]
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value !== "number") {
    throw new Error(`Parameter ${name} must be a number`)
  }
  return value
}

/**
 * Get an optional boolean parameter
 */
export function optionalBooleanParam(
  args: Record<string, unknown>,
  name: string
): boolean | undefined {
  const value = args[name]
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value !== "boolean") {
    throw new Error(`Parameter ${name} must be a boolean`)
  }
  return value
}
