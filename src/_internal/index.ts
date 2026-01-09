/**
 * Internal modules for MCP client communication and runtime management
 *
 * These modules provide core infrastructure for:
 * - MCP client-server communication
 * - Next.js runtime discovery and management
 * - Browser automation via Playwright MCP
 * - Process discovery and port management
 * - Resource loading and path resolution
 * - Global state management
 */

// =============================================================================
// MCP CLIENT
// =============================================================================

export {
  connectToMCPServer,
  listServerTools,
  listServerToolsWithInfo,
  hasServerTool,
  callServerTool,
  disconnectFromMCPServer,
  listServerResources,
  readServerResource,
  listServerPrompts,
  getServerPrompt,
  MCPConnectionPool,
  createConnectionPool,
  getGlobalConnectionPool,
  type MCPConnection,
  type MCPToolInfo,
  type MCPResourceInfo,
  type MCPPromptInfo,
} from "./mcp-client.js"

// =============================================================================
// NEXT.JS RUNTIME MANAGER
// =============================================================================

export {
  listNextJsTools,
  callNextJsTool,
  getAllAvailableServers,
  detectProtocol,
  probePort,
  MCP_HOST,
} from "./nextjs-runtime-manager.js"

// =============================================================================
// BROWSER EVAL MANAGER
// =============================================================================

export {
  ensureBrowserEvalMCP,
  startBrowserEvalMCP,
  getBrowserEvalConnection,
  stopBrowserEvalMCP,
} from "./browser-eval-manager.js"

// =============================================================================
// GLOBAL STATE
// =============================================================================

export {
  markInitCalled,
  isInitCalled,
  getInitTimestamp,
  resetGlobalState,
} from "./global-state.js"

// =============================================================================
// RESOURCE UTILITIES
// =============================================================================

export {
  loadKnowledgeResources,
  loadNumberedMarkdownFilesWithNames,
} from "./resource-loader.js"
export { resolveResourcePath, readResourceFile } from "./resource-path.js"

// =============================================================================
// PROCESS UTILITIES
// =============================================================================

export { findProcess } from "./find-process-import.js"
export {
  detectProjectChannel,
  processConditionalBlocks,
  type ChannelDetectionResult,
} from "./nextjs-channel-detector.js"
