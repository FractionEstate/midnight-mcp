/**
 * Dynamic Tool Management
 *
 * Tools for runtime discovery and enablement of toolsets.
 * Based on GitHub MCP server dynamic_tools.go patterns.
 */

import { z } from "zod"
import type { ToolModule, ToolsetId, ToolContext } from "../../types/mcp.js"
import { TOOLSETS } from "../../types/mcp.js"
import { getRegistry } from "../index.js"

// =============================================================================
// TYPES
// =============================================================================

interface ToolsetInfo {
  name: string
  description: string
  can_enable: string
  currently_enabled: string
}

interface ToolInfo {
  name: string
  description: string
  can_enable: string
  toolset: string
}

// =============================================================================
// LIST AVAILABLE TOOLSETS
// =============================================================================

export const listAvailableToolsetsMetadata = {
  name: "list_available_toolsets",
  description:
    "List all available toolsets this MCP server can offer, providing the enabled status of each. Use this when a task could be achieved with a tool and the currently available tools aren't enough. Call get_toolset_tools with these toolset names to discover specific tools you can call.",
  toolset: "midnight:dev" as ToolsetId,
  readOnly: true,
}

export const listAvailableToolsetsInputSchema = {}

export async function listAvailableToolsetsHandler(
  _args: Record<string, unknown>,
  _ctx?: ToolContext
): Promise<string> {
  const registry = getRegistry()
  const toolsets = registry.getToolsets()

  const payload: ToolsetInfo[] = Object.entries(TOOLSETS).map(([id, meta]) => ({
    name: id,
    description: meta.description,
    can_enable: "true",
    currently_enabled: toolsets.has(id as ToolsetId) ? "true" : "false",
  }))

  return JSON.stringify(payload, null, 2)
}

export const listAvailableToolsets: ToolModule = {
  metadata: listAvailableToolsetsMetadata,
  inputSchema: listAvailableToolsetsInputSchema,
  handler: listAvailableToolsetsHandler,
}

// =============================================================================
// GET TOOLSET TOOLS
// =============================================================================

export const getToolsetToolsMetadata = {
  name: "get_toolset_tools",
  description:
    "Lists all the capabilities that are enabled with the specified toolset. Use this to get clarity on whether enabling a toolset would help you to complete a task.",
  toolset: "midnight:dev" as ToolsetId,
  readOnly: true,
}

export const getToolsetToolsInputSchema = {
  toolset: z.string().describe("The name of the toolset you want to get the tools for"),
}

export async function getToolsetToolsHandler(
  args: Record<string, unknown>,
  _ctx?: ToolContext
): Promise<string> {
  const toolsetName = args.toolset as string

  if (!toolsetName) {
    return JSON.stringify({ error: "Missing required parameter: toolset" })
  }

  const registry = getRegistry()
  const allTools = registry.getAll()

  // Filter tools by toolset
  const toolsInToolset = allTools.filter(
    (tool) => tool.metadata.toolset === toolsetName
  )

  if (toolsInToolset.length === 0) {
    // Check if toolset exists
    if (!TOOLSETS[toolsetName as ToolsetId]) {
      return JSON.stringify({ error: `Toolset ${toolsetName} not found` })
    }
    return JSON.stringify({
      toolset: toolsetName,
      tools: [],
      message: `Toolset ${toolsetName} exists but has no registered tools`
    })
  }

  const payload: ToolInfo[] = toolsInToolset.map((tool) => ({
    name: tool.metadata.name,
    description: tool.metadata.description,
    can_enable: "true",
    toolset: toolsetName,
  }))

  return JSON.stringify({ toolset: toolsetName, tools: payload }, null, 2)
}

export const getToolsetTools: ToolModule = {
  metadata: getToolsetToolsMetadata,
  inputSchema: getToolsetToolsInputSchema,
  handler: getToolsetToolsHandler,
}

// =============================================================================
// ENABLE TOOLSET
// =============================================================================

export const enableToolsetMetadata = {
  name: "enable_toolset",
  description:
    "Enable one of the sets of tools the MCP server provides. Use get_toolset_tools and list_available_toolsets first to see what this will enable.",
  toolset: "midnight:dev" as ToolsetId,
  readOnly: false,
}

export const enableToolsetInputSchema = {
  toolset: z.string().describe("The name of the toolset to enable"),
}

export async function enableToolsetHandler(
  args: Record<string, unknown>,
  _ctx?: ToolContext
): Promise<string> {
  const toolsetName = args.toolset as string

  if (!toolsetName) {
    return JSON.stringify({ error: "Missing required parameter: toolset" })
  }

  // Validate toolset exists
  if (!TOOLSETS[toolsetName as ToolsetId]) {
    return JSON.stringify({ error: `Toolset ${toolsetName} not found` })
  }

  const registry = getRegistry()
  const toolsets = registry.getToolsets()

  if (toolsets.has(toolsetName as ToolsetId)) {
    return JSON.stringify({
      message: `Toolset ${toolsetName} is already enabled`,
      toolset: toolsetName,
      status: "already_enabled"
    })
  }

  // Enable the toolset
  registry.enableToolset(toolsetName as ToolsetId)

  // Count tools that were enabled
  const toolsInToolset = registry.getAll().filter(
    (tool) => tool.metadata.toolset === toolsetName
  )

  return JSON.stringify({
    message: `Toolset ${toolsetName} enabled with ${toolsInToolset.length} tools`,
    toolset: toolsetName,
    status: "enabled",
    tools_count: toolsInToolset.length,
  })
}

export const enableToolset: ToolModule = {
  metadata: enableToolsetMetadata,
  inputSchema: enableToolsetInputSchema,
  handler: enableToolsetHandler,
}

// =============================================================================
// DISABLE TOOLSET
// =============================================================================

export const disableToolsetMetadata = {
  name: "disable_toolset",
  description:
    "Disable a toolset that was previously enabled. The tools in this toolset will no longer be available.",
  toolset: "midnight:dev" as ToolsetId,
  readOnly: false,
}

export const disableToolsetInputSchema = {
  toolset: z.string().describe("The name of the toolset to disable"),
}

export async function disableToolsetHandler(
  args: Record<string, unknown>,
  _ctx?: ToolContext
): Promise<string> {
  const toolsetName = args.toolset as string

  if (!toolsetName) {
    return JSON.stringify({ error: "Missing required parameter: toolset" })
  }

  const registry = getRegistry()
  const toolsets = registry.getToolsets()

  if (!toolsets.has(toolsetName as ToolsetId)) {
    return JSON.stringify({
      message: `Toolset ${toolsetName} is not currently enabled`,
      toolset: toolsetName,
      status: "not_enabled"
    })
  }

  // Disable the toolset
  registry.disableToolset(toolsetName as ToolsetId)

  return JSON.stringify({
    message: `Toolset ${toolsetName} disabled`,
    toolset: toolsetName,
    status: "disabled",
  })
}

export const disableToolset: ToolModule = {
  metadata: disableToolsetMetadata,
  inputSchema: disableToolsetInputSchema,
  handler: disableToolsetHandler,
}

// =============================================================================
// EXPORTS
// =============================================================================

export const dynamicTools: ToolModule[] = [
  listAvailableToolsets,
  getToolsetTools,
  enableToolset,
  disableToolset,
]

export default dynamicTools
