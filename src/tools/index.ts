/**
 * Unified Tool Registry
 *
 * Central registry for all MCP tools organized by category.
 * Supports enabling/disabling tool categories via configuration.
 * Now uses ToolRegistry for advanced filtering capabilities.
 */

import type { ToolModule, ToolCategory, ServerConfig, ToolsetId } from "../types/mcp.js"
import { ToolRegistry, RegistryBuilder } from "../inventory/registry.js"

// Import Next.js tools
import * as nextjsBrowserEval from "./nextjs/browser-eval.js"
import * as nextjsEnableCacheComponents from "./nextjs/enable-cache-components.js"
import * as nextjsInit from "./nextjs/init.js"
import * as nextjsDocs from "./nextjs/nextjs-docs.js"
import * as nextjsIndex from "./nextjs/nextjs_index.js"
import * as nextjsCall from "./nextjs/nextjs_call.js"
import * as nextjsUpgrade from "./nextjs/upgrade-nextjs-16.js"

// Import Midnight tools
import * as midnightInit from "./midnight/init.js"
import * as midnightNetworkStatus from "./midnight/network-status.js"
import * as midnightGetBalance from "./midnight/get-balance.js"
import * as midnightGetBlock from "./midnight/get-block.js"
import * as midnightGetTransaction from "./midnight/get-transaction.js"
import * as midnightSearchDocs from "./midnight/search-docs.js"
import * as midnightScaffoldProject from "./midnight/scaffold-project.js"
import * as midnightCompileContract from "./midnight/compile-contract.js"
import * as midnightAnalyzeContract from "./midnight/analyze-contract.js"
import * as midnightCheckVersions from "./midnight/check-versions.js"

// Import dynamic tools
import { dynamicTools } from "./dynamic/dynamic-tools.js"

// Import context tools
import { contextTools } from "./context/context-tools.js"

// Create global registry instance
let _registry: ToolRegistry | null = null

/**
 * Next.js DevTools category
 */
export const nextjsTools: ToolModule[] = [
  nextjsBrowserEval as unknown as ToolModule,
  nextjsEnableCacheComponents as unknown as ToolModule,
  nextjsInit as unknown as ToolModule,
  nextjsDocs as unknown as ToolModule,
  nextjsIndex as unknown as ToolModule,
  nextjsCall as unknown as ToolModule,
  nextjsUpgrade as unknown as ToolModule,
]

export const nextjsCategory: ToolCategory = {
  name: "nextjs",
  displayName: "Next.js DevTools",
  description: "Development tools for Next.js applications including documentation search, runtime diagnostics, browser automation, and migration utilities.",
  tools: nextjsTools,
  enabled: true,
}

/**
 * Midnight Network category
 */
export const midnightTools: ToolModule[] = [
  midnightInit as unknown as ToolModule,
  midnightNetworkStatus as unknown as ToolModule,
  midnightGetBalance as unknown as ToolModule,
  midnightGetBlock as unknown as ToolModule,
  midnightGetTransaction as unknown as ToolModule,
  midnightSearchDocs as unknown as ToolModule,
  midnightScaffoldProject as unknown as ToolModule,
  midnightCompileContract as unknown as ToolModule,
  midnightAnalyzeContract as unknown as ToolModule,
  midnightCheckVersions as unknown as ToolModule,
  // Dynamic tools (for toolset management)
  ...dynamicTools,
  // Context tools (for session info)
  ...contextTools,
]

export const midnightCategory: ToolCategory = {
  name: "midnight",
  displayName: "Midnight Network",
  description: "Development tools for the Midnight Network blockchain including contract compilation, network queries, and documentation search.",
  tools: midnightTools,
  enabled: true,
}

/**
 * All tool categories
 */
export const categories: ToolCategory[] = [
  midnightCategory,
  nextjsCategory,
]

/**
 * Get all enabled tools across categories
 */
export function getEnabledTools(config?: { midnight?: boolean; nextjs?: boolean }): ToolModule[] {
  const enabledCategories = categories.filter(cat => {
    if (config) {
      if (cat.name === "midnight") return config.midnight ?? true
      if (cat.name === "nextjs") return config.nextjs ?? true
    }
    return cat.enabled
  })

  return enabledCategories.flatMap(cat => cat.tools)
}

/**
 * Get tools for a specific category
 */
export function getCategoryTools(categoryName: string): ToolModule[] {
  const category = categories.find(cat => cat.name === categoryName)
  return category?.tools ?? []
}

/**
 * Get tool by name (searches all categories)
 */
export function getToolByName(name: string): ToolModule | undefined {
  for (const category of categories) {
    const tool = category.tools.find(t => t.metadata.name === name)
    if (tool) return tool
  }
  return undefined
}

/**
 * Telemetry name mapping for tools
 */
export const toolNameToTelemetryName: Record<string, string> = {
  // Next.js tools
  browser_eval: "mcp/browser_eval",
  enable_cache_components: "mcp/enable_cache_components",
  init: "mcp/init",
  nextjs_docs: "mcp/nextjs_docs",
  nextjs_index: "mcp/nextjs_index",
  nextjs_call: "mcp/nextjs_call",
  upgrade_nextjs_16: "mcp/upgrade_nextjs_16",
  // Midnight tools
  midnight_init: "mcp/midnight_init",
  midnight_network_status: "mcp/midnight_network_status",
  midnight_get_balance: "mcp/midnight_get_balance",
  midnight_get_block: "mcp/midnight_get_block",
  midnight_get_transaction: "mcp/midnight_get_transaction",
  midnight_search_docs: "mcp/midnight_search_docs",
  midnight_scaffold_project: "mcp/midnight_scaffold_project",
  midnight_compile_contract: "mcp/midnight_compile_contract",
  midnight_analyze_contract: "mcp/midnight_analyze_contract",
  midnight_check_versions: "mcp/midnight_check_versions",
}

// =============================================================================
// REGISTRY-BASED API (NEW)
// =============================================================================

/**
 * Get or create the global tool registry
 */
export function getRegistry(config?: Partial<ServerConfig>): ToolRegistry {
  if (!_registry) {
    _registry = createRegistry(config)
  }
  return _registry
}

/**
 * Create a new registry with all tools registered
 */
export function createRegistry(config?: Partial<ServerConfig>): ToolRegistry {
  const builder = new RegistryBuilder()

  // Apply config if provided
  if (config) {
    if (config.enabledCategories) builder.withCategories(Array.from(config.enabledCategories))
    if (config.enabledToolsets) builder.withToolsets(Array.from(config.enabledToolsets))
    if (config.enabledTools) builder.withTools(Array.from(config.enabledTools))
    if (config.enabledFeatures) builder.withFeatures(Array.from(config.enabledFeatures))
    if (config.readOnly !== undefined) builder.withReadOnly(config.readOnly)
  }

  // Add categories
  builder.addCategories([nextjsCategory, midnightCategory])

  return builder.build()
}

/**
 * Get tools filtered by server configuration (registry-based)
 */
export function getToolsForConfig(config: ServerConfig): ToolModule[] {
  return createRegistry(config).getEnabled()
}

/**
 * Get all tools in a specific toolset
 */
export function getToolsetTools(toolsetId: ToolsetId): ToolModule[] {
  const byToolset = getRegistry().getByToolset()
  return byToolset.get(toolsetId) || []
}
