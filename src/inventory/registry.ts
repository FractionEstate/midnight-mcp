/**
 * Tool Registry
 *
 * Central registry for all MCP tools with builder pattern and filtering.
 * Based on GitHub MCP server inventory patterns.
 */

import type {
  ToolModule,
  ToolCategory,
  ToolsetId,
  ServerConfig,
  ToolContext,
  Logger,
} from "../types/mcp.js"
import type { ToolResult } from "../errors/errors.js"
import { DEFAULT_CONFIG } from "../types/mcp.js"

// =============================================================================
// REGISTRY CONFIG
// =============================================================================

export interface RegistryConfig {
  enabledCategories: Set<string>
  enabledToolsets: Set<ToolsetId>
  enabledTools: Set<string>
  enabledFeatures: Set<string>
  readOnly: boolean
  toolFilter?: (tool: ToolModule) => boolean
}

// =============================================================================
// TOOL REGISTRY
// =============================================================================

export class ToolRegistry {
  private tools: Map<string, ToolModule> = new Map()
  private categories: Map<string, ToolCategory> = new Map()
  private config: RegistryConfig

  constructor(config: RegistryConfig) {
    this.config = config
  }

  /**
   * Register a single tool
   */
  register(tool: ToolModule): void {
    this.tools.set(tool.metadata.name, tool)
  }

  /**
   * Register a tool category with all its tools
   */
  registerCategory(category: ToolCategory): void {
    this.categories.set(category.name, category)
    for (const tool of category.tools) {
      this.register(tool)
    }
  }

  /**
   * Get a tool by name
   */
  get(name: string): ToolModule | undefined {
    // Check direct name
    const tool = this.tools.get(name)
    if (tool) return tool

    // Check aliases
    for (const t of this.tools.values()) {
      if (t.metadata.aliases?.includes(name)) {
        return t
      }
    }

    return undefined
  }

  /**
   * Get all tools (including disabled)
   */
  getAll(): ToolModule[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get only enabled tools based on configuration
   */
  getEnabled(): ToolModule[] {
    return Array.from(this.tools.values()).filter((tool) => this.isEnabled(tool))
  }

  /**
   * Check if a specific tool is enabled
   */
  isEnabled(tool: ToolModule): boolean {
    const meta = tool.metadata

    // Check custom filter first
    if (this.config.toolFilter && !this.config.toolFilter(tool)) {
      return false
    }

    // Check toolset enablement
    if (meta.toolset && !this.config.enabledToolsets.has(meta.toolset)) {
      return false
    }

    // Check category enablement (from toolset prefix)
    const category = meta.toolset?.split(":")[0]
    if (category && !this.config.enabledCategories.has(category)) {
      return false
    }

    // Check specific tool enablement (if whitelist is specified)
    if (this.config.enabledTools.size > 0 && !this.config.enabledTools.has(meta.name)) {
      return false
    }

    // Check read-only mode
    if (this.config.readOnly && !meta.readOnly) {
      return false
    }

    // Check feature flag
    if (meta.featureFlag && !this.config.enabledFeatures.has(meta.featureFlag)) {
      return false
    }

    return true
  }

  /**
   * Get all categories
   */
  getCategories(): ToolCategory[] {
    return Array.from(this.categories.values())
  }

  /**
   * Get enabled categories
   */
  getEnabledCategories(): ToolCategory[] {
    return this.getCategories().filter((cat) => this.config.enabledCategories.has(cat.name))
  }

  /**
   * Get tools grouped by toolset
   */
  getByToolset(): Map<ToolsetId, ToolModule[]> {
    const grouped = new Map<ToolsetId, ToolModule[]>()

    for (const tool of this.getEnabled()) {
      const toolset = tool.metadata.toolset
      if (!grouped.has(toolset)) {
        grouped.set(toolset, [])
      }
      grouped.get(toolset)!.push(tool)
    }

    return grouped
  }

  /**
   * Get statistics about the registry
   */
  getStats(): RegistryStats {
    const all = this.getAll()
    const enabled = this.getEnabled()
    const byToolset = this.getByToolset()

    return {
      totalTools: all.length,
      enabledTools: enabled.length,
      disabledTools: all.length - enabled.length,
      categories: this.categories.size,
      toolsets: byToolset.size,
      readOnlyTools: all.filter((t) => t.metadata.readOnly).length,
    }
  }

  /**
   * Get currently enabled toolsets
   */
  getToolsets(): Set<ToolsetId> {
    return new Set(this.config.enabledToolsets)
  }

  /**
   * Enable a toolset at runtime
   */
  enableToolset(toolsetId: ToolsetId): void {
    this.config.enabledToolsets.add(toolsetId)
  }

  /**
   * Disable a toolset at runtime
   */
  disableToolset(toolsetId: ToolsetId): void {
    this.config.enabledToolsets.delete(toolsetId)
  }

  /**
   * Check if a toolset is enabled
   */
  isToolsetEnabled(toolsetId: ToolsetId): boolean {
    return this.config.enabledToolsets.has(toolsetId)
  }
}

export interface RegistryStats {
  totalTools: number
  enabledTools: number
  disabledTools: number
  categories: number
  toolsets: number
  readOnlyTools: number
}

// =============================================================================
// REGISTRY BUILDER
// =============================================================================

export class RegistryBuilder {
  private config: RegistryConfig = {
    enabledCategories: new Set(["midnight", "nextjs"]),
    enabledToolsets: new Set(),
    enabledTools: new Set(),
    enabledFeatures: new Set(),
    readOnly: false,
  }

  private tools: ToolModule[] = []
  private categories: ToolCategory[] = []

  /**
   * Enable specific categories
   */
  withCategories(ids: string[]): this {
    this.config.enabledCategories = new Set(ids)
    return this
  }

  /**
   * Enable specific toolsets
   */
  withToolsets(ids: ToolsetId[]): this {
    this.config.enabledToolsets = new Set(ids)
    return this
  }

  /**
   * Enable specific tools by name
   */
  withTools(names: string[]): this {
    this.config.enabledTools = new Set(names)
    return this
  }

  /**
   * Enable specific feature flags
   */
  withFeatures(features: string[]): this {
    this.config.enabledFeatures = new Set(features)
    return this
  }

  /**
   * Enable read-only mode (only safe operations)
   */
  withReadOnly(readOnly: boolean): this {
    this.config.readOnly = readOnly
    return this
  }

  /**
   * Add a custom tool filter
   */
  withFilter(filter: (tool: ToolModule) => boolean): this {
    this.config.toolFilter = filter
    return this
  }

  /**
   * Add tools to register
   */
  addTools(tools: ToolModule[]): this {
    this.tools.push(...tools)
    return this
  }

  /**
   * Add categories to register
   */
  addCategories(categories: ToolCategory[]): this {
    this.categories.push(...categories)
    return this
  }

  /**
   * Build from server config
   */
  fromConfig(config: ServerConfig): this {
    this.config.enabledCategories = config.enabledCategories
    this.config.enabledToolsets = config.enabledToolsets
    this.config.enabledTools = config.enabledTools
    this.config.enabledFeatures = config.enabledFeatures
    this.config.readOnly = config.readOnly
    return this
  }

  /**
   * Build the registry
   */
  build(): ToolRegistry {
    // If no toolsets specified, enable all in enabled categories
    if (this.config.enabledToolsets.size === 0) {
      for (const category of this.config.enabledCategories) {
        // Add all toolsets for this category
        const prefix = `${category}:`
        const allToolsets: ToolsetId[] = [
          "midnight:network",
          "midnight:contracts",
          "midnight:wallet",
          "midnight:docs",
          "midnight:dev",
          "nextjs:devtools",
          "nextjs:migration",
          "nextjs:docs",
        ]
        for (const toolset of allToolsets) {
          if (toolset.startsWith(prefix)) {
            this.config.enabledToolsets.add(toolset)
          }
        }
      }
    }

    const registry = new ToolRegistry(this.config)

    // Register categories first (which registers their tools)
    for (const category of this.categories) {
      registry.registerCategory(category)
    }

    // Register any standalone tools
    for (const tool of this.tools) {
      registry.register(tool)
    }

    return registry
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a default registry builder
 */
export function createRegistryBuilder(): RegistryBuilder {
  return new RegistryBuilder()
}

/**
 * Convert legacy tool to enhanced tool module
 */
export function upgradeTool(
  legacy: { metadata: { name: string; description: string }; inputSchema: Record<string, unknown>; handler: (args: Record<string, unknown>) => Promise<string> },
  toolset: ToolsetId,
  readOnly = true
): ToolModule {
  return {
    metadata: {
      ...legacy.metadata,
      toolset,
      readOnly,
    },
    inputSchema: legacy.inputSchema as Record<string, import("zod").ZodTypeAny>,
    handler: legacy.handler,
  }
}

/**
 * Create a no-op logger for testing
 */
export function createNoopLogger(): Logger {
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  }
}

/**
 * Create a tool context for handler invocation
 */
export function createToolContext(
  toolName: string,
  config: ServerConfig,
  logger?: Logger
): ToolContext {
  return {
    invocationId: crypto.randomUUID(),
    toolName,
    logger: logger ?? createNoopLogger(),
    config,
  }
}
