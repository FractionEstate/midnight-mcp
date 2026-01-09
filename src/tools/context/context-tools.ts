/**
 * Context Tools
 *
 * Tools for getting context about the current session and environment.
 * Based on GitHub MCP server context_tools.go patterns.
 */

import { z } from "zod"
import type { ToolModule, ToolsetId, ToolContext } from "../../types/mcp.js"

// =============================================================================
// TYPES
// =============================================================================

interface SessionInfo {
  /** Session identifier */
  sessionId: string
  /** Server version */
  serverVersion: string
  /** Server start time */
  startedAt: string
  /** Current environment */
  environment: string
  /** Enabled toolsets */
  enabledToolsets: string[]
  /** Total available tools */
  totalTools: number
  /** Node.js version */
  nodeVersion: string
  /** Platform */
  platform: string
}

interface EnvironmentInfo {
  /** Node.js version */
  nodeVersion: string
  /** Platform (darwin, linux, win32) */
  platform: string
  /** Architecture (x64, arm64) */
  arch: string
  /** Current working directory */
  cwd: string
  /** Available memory (MB) */
  availableMemoryMB: number
  /** Uptime (seconds) */
  uptimeSeconds: number
}

// =============================================================================
// SESSION STATE
// =============================================================================

let sessionStartTime: string | null = null
let sessionId: string | null = null

function ensureSession(): void {
  if (!sessionStartTime) {
    sessionStartTime = new Date().toISOString()
    sessionId = `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

// =============================================================================
// GET SESSION INFO
// =============================================================================

export const getSessionInfoMetadata = {
  name: "get_session_info",
  description:
    "Get information about the current MCP session including server version, enabled toolsets, and environment. Use this to understand the current context.",
  toolset: "midnight:dev" as ToolsetId,
  readOnly: true,
}

export const getSessionInfoInputSchema = {}

export async function getSessionInfoHandler(
  _args: Record<string, unknown>,
  ctx?: ToolContext
): Promise<string> {
  ensureSession()

  // Dynamic import to avoid circular deps
  const { getRegistry } = await import("../index.js")
  const registry = getRegistry()

  const info: SessionInfo = {
    sessionId: sessionId!,
    serverVersion: ctx?.config?.version || "1.0.0",
    startedAt: sessionStartTime!,
    environment: process.env.NODE_ENV || "development",
    enabledToolsets: Array.from(registry.getToolsets()),
    totalTools: registry.getEnabled().length,
    nodeVersion: process.version,
    platform: process.platform,
  }

  return JSON.stringify(info, null, 2)
}

export const getSessionInfo: ToolModule = {
  metadata: getSessionInfoMetadata,
  inputSchema: getSessionInfoInputSchema,
  handler: getSessionInfoHandler,
}

// =============================================================================
// GET ENVIRONMENT INFO
// =============================================================================

export const getEnvironmentInfoMetadata = {
  name: "get_environment_info",
  description:
    "Get information about the runtime environment including Node.js version, platform, and system resources.",
  toolset: "midnight:dev" as ToolsetId,
  readOnly: true,
}

export const getEnvironmentInfoInputSchema = {}

export async function getEnvironmentInfoHandler(
  _args: Record<string, unknown>,
  _ctx?: ToolContext
): Promise<string> {
  const info: EnvironmentInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    availableMemoryMB: Math.round(
      (process.memoryUsage().heapTotal - process.memoryUsage().heapUsed) / 1024 / 1024
    ),
    uptimeSeconds: Math.round(process.uptime()),
  }

  return JSON.stringify(info, null, 2)
}

export const getEnvironmentInfo: ToolModule = {
  metadata: getEnvironmentInfoMetadata,
  inputSchema: getEnvironmentInfoInputSchema,
  handler: getEnvironmentInfoHandler,
}

// =============================================================================
// GET SERVER STATUS
// =============================================================================

export const getServerStatusMetadata = {
  name: "get_server_status",
  description:
    "Get the current server status including health, active connections, and resource usage. Use this to diagnose server issues.",
  toolset: "midnight:dev" as ToolsetId,
  readOnly: true,
}

export const getServerStatusInputSchema = {}

export async function getServerStatusHandler(
  _args: Record<string, unknown>,
  _ctx?: ToolContext
): Promise<string> {
  ensureSession()

  const memUsage = process.memoryUsage()

  const status = {
    status: "healthy",
    sessionId: sessionId,
    uptime: {
      seconds: Math.round(process.uptime()),
      formatted: formatUptime(process.uptime()),
    },
    memory: {
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      rssMB: Math.round(memUsage.rss / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  }

  return JSON.stringify(status, null, 2)
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (mins > 0) parts.push(`${mins}m`)
  parts.push(`${secs}s`)

  return parts.join(" ")
}

export const getServerStatus: ToolModule = {
  metadata: getServerStatusMetadata,
  inputSchema: getServerStatusInputSchema,
  handler: getServerStatusHandler,
}

// =============================================================================
// LIST ENABLED FEATURES
// =============================================================================

export const listEnabledFeaturesMetadata = {
  name: "list_enabled_features",
  description:
    "List all currently enabled features and feature flags. Use this to understand what capabilities are available.",
  toolset: "midnight:dev" as ToolsetId,
  readOnly: true,
}

export const listEnabledFeaturesInputSchema = {}

export async function listEnabledFeaturesHandler(
  _args: Record<string, unknown>,
  _ctx?: ToolContext
): Promise<string> {
  // Dynamic import to avoid circular deps
  const { getFeatureFlags, getAllFeatureFlags } = await import("../../features/feature-flags.js")

  const allFlags = getAllFeatureFlags()
  const enabledFlags: string[] = []
  const disabledFlags: string[] = []

  for (const flag of allFlags) {
    const isEnabled = getFeatureFlags().isEnabled(flag.name)
    if (isEnabled) {
      enabledFlags.push(flag.name)
    } else {
      disabledFlags.push(flag.name)
    }
  }

  return JSON.stringify({
    enabled: enabledFlags,
    disabled: disabledFlags,
    total: allFlags.length,
  }, null, 2)
}

export const listEnabledFeatures: ToolModule = {
  metadata: listEnabledFeaturesMetadata,
  inputSchema: listEnabledFeaturesInputSchema,
  handler: listEnabledFeaturesHandler,
}

// =============================================================================
// EXPORTS
// =============================================================================

export const contextTools: ToolModule[] = [
  getSessionInfo,
  getEnvironmentInfo,
  getServerStatus,
  listEnabledFeatures,
]

export default contextTools
