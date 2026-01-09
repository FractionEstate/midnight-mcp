/**
 * MCP Server
 *
 * Main server implementation for Midnight Network + Next.js DevTools MCP.
 * Based on GitHub MCP server architecture.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

import type { MCPServerConfig } from "./config.js"
import { mergeConfig, validateConfig, resolveConfig } from "./config.js"
import { expandToolsets, getDefaultToolsetIDs } from "../toolsets/toolsets.js"
import { generateInstructions } from "../instructions/instructions.js"
import {
  Logger,
  LogLevel,
  configureLogger,
  getLogger,
  stderrTransport,
  textFormatter,
} from "../log/log.js"
import { LineBuffer } from "../buffer/buffer.js"

// =============================================================================
// SERVER STATE
// =============================================================================

/**
 * Server runtime state
 */
export interface ServerState {
  /** Server configuration */
  config: MCPServerConfig

  /** Currently enabled toolsets */
  enabledToolsets: Set<string>

  /** Logger instance */
  logger: Logger

  /** Request count for metrics */
  requestCount: number

  /** Start time */
  startTime: Date

  /** Recent log entries */
  logBuffer: LineBuffer
}

/**
 * Server dependencies
 */
export interface ServerDependencies {
  /** Midnight Network client (if available) */
  midnightClient?: unknown

  /** Next.js DevTools client (if available) */
  nextjsClient?: unknown

  /** Translation function */
  translator: (key: string, fallback: string) => string
}

// =============================================================================
// SERVER IMPLEMENTATION
// =============================================================================

/**
 * Create and configure an MCP server instance
 */
export async function createMCPServer(
  config: Partial<MCPServerConfig> = {}
): Promise<{
  server: Server
  state: ServerState
}> {
  // Merge with defaults and validate
  const fullConfig = mergeConfig(config)
  const validation = validateConfig(fullConfig)

  if (!validation.valid) {
    throw new Error(
      `Invalid server configuration: ${validation.errors.join(", ")}`
    )
  }

  // Set up logging
  const logLevel = fullConfig.logLevel ?? LogLevel.Info
  configureLogger({
    level: logLevel,
    formatter: textFormatter,
    transports: [stderrTransport],
    source: "mcp-server",
  })

  const logger = getLogger()
  logger.info("Creating MCP server", {
    version: fullConfig.version,
    name: fullConfig.name,
  })

  // Resolve enabled toolsets
  let enabledToolsets: string[]
  if (fullConfig.enabledToolsets) {
    enabledToolsets = expandToolsets(fullConfig.enabledToolsets)
  } else if (fullConfig.dynamicToolsets) {
    // Start empty in dynamic mode
    enabledToolsets = []
  } else {
    // Use defaults
    enabledToolsets = getDefaultToolsetIDs()
  }

  // Generate instructions
  const instructions = generateInstructions({
    enabledToolsets,
    dynamicMode: fullConfig.dynamicToolsets ?? false,
    readOnly: fullConfig.readOnly ?? false,
    lockdownMode: fullConfig.lockdownMode ?? false,
  })

  // Create the MCP server
  const server = new Server(
    {
      name: fullConfig.name,
      version: fullConfig.version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  )

  // Create server state
  const state: ServerState = {
    config: fullConfig,
    enabledToolsets: new Set(enabledToolsets),
    logger,
    requestCount: 0,
    startTime: new Date(),
    logBuffer: new LineBuffer(1000),
  }

  // Set up request handlers
  setupRequestHandlers(server, state)

  logger.info("MCP server created successfully", {
    enabledToolsets: Array.from(state.enabledToolsets),
    dynamicMode: fullConfig.dynamicToolsets,
    readOnly: fullConfig.readOnly,
  })

  return { server, state }
}

/**
 * Set up request handlers for the MCP server
 */
function setupRequestHandlers(server: Server, state: ServerState): void {
  const { logger } = state

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    state.requestCount++
    logger.debug("Listing tools")

    // Return tools based on enabled toolsets
    // This will be populated by the inventory system
    return {
      tools: [],
    }
  })

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    state.requestCount++
    const { name, arguments: args } = request.params

    logger.info("Tool call received", {
      tool: name,
      hasArgs: !!args,
    })

    // Tool execution will be handled by the inventory system
    return {
      content: [
        {
          type: "text",
          text: `Tool ${name} not implemented yet`,
        },
      ],
    }
  })

  // List resources handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    state.requestCount++
    logger.debug("Listing resources")

    return {
      resources: [],
    }
  })

  // Read resource handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    state.requestCount++
    const { uri } = request.params

    logger.info("Resource read requested", { uri })

    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: `Resource ${uri} not implemented yet`,
        },
      ],
    }
  })

  // List prompts handler
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    state.requestCount++
    logger.debug("Listing prompts")

    return {
      prompts: [],
    }
  })

  // Get prompt handler
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    state.requestCount++
    const { name } = request.params

    logger.info("Prompt requested", { name })

    return {
      description: `Prompt ${name} not implemented yet`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Prompt ${name} not available`,
          },
        },
      ],
    }
  })
}

// =============================================================================
// SERVER RUNNER
// =============================================================================

/**
 * Run the MCP server with stdio transport
 */
export async function runStdioServer(
  config?: Partial<MCPServerConfig>
): Promise<void> {
  const { server, state } = await createMCPServer(config)
  const { logger } = state

  // Create stdio transport
  const transport = new StdioServerTransport()

  logger.info("Starting stdio server", {
    version: state.config.version,
    name: state.config.name,
  })

  // Handle shutdown signals
  const shutdown = async () => {
    logger.info("Shutting down server")
    await server.close()
    process.exit(0)
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)

  // Connect and run
  try {
    await server.connect(transport)
    console.error(`${state.config.name} v${state.config.version} running on stdio`)
  } catch (error) {
    logger.error("Failed to start server", error as Error)
    process.exit(1)
  }
}

/**
 * Main entry point
 */
export async function main(): Promise<void> {
  const config = resolveConfig(process.argv.slice(2))
  await runStdioServer(config)
}
