import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

export interface MCPConnection {
  client: Client
  transport: StdioClientTransport
}

/**
 * Connect to an external MCP server via stdio
 */
export async function connectToMCPServer(
  command: string,
  args: string[] = [],
  options?: {
    cwd?: string
    env?: Record<string, string>
  }
): Promise<MCPConnection> {
  // Create the client
  const client = new Client(
    {
      name: "next-devtools-mcp-client",
      version: "0.1.0",
    },
    {
      capabilities: {},
    }
  )

  // Create stdio transport with server parameters
  const transport = new StdioClientTransport({
    command,
    args,
    cwd: options?.cwd,
    env: options?.env,
    stderr: "pipe", // Pipe stderr so we can listen to it
  })

  // Listen to stderr for debugging
  const stderrStream = transport.stderr
  if (stderrStream) {
    stderrStream.on("data", (data) => {
      console.error(`[MCP Server stderr]: ${data}`)
    })
  }

  // Connect client to transport (this also starts the server process)
  await client.connect(transport)

  return {
    client,
    transport,
  }
}

/**
 * Check if a tool is available on the connected MCP server
 */
export async function listServerTools(connection: MCPConnection): Promise<string[]> {
  try {
    const result = await connection.client.listTools()
    return result.tools.map((tool) => tool.name)
  } catch (error) {
    console.error("Failed to list tools:", error)
    return []
  }
}

/**
 * Call a tool on the connected MCP server
 */
export async function callServerTool(
  connection: MCPConnection,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  try {
    const result = await connection.client.callTool({
      name: toolName,
      arguments: args,
    })
    return result
  } catch (error) {
    console.error(`Failed to call tool ${toolName}:`, error)
    throw error
  }
}

/**
 * Disconnect from MCP server and cleanup
 */
export async function disconnectFromMCPServer(connection: MCPConnection): Promise<void> {
  try {
    await connection.transport.close()
    await connection.client.close()
  } catch (error) {
    console.error("Error disconnecting from MCP server:", error)
    throw error
  }
}

// =============================================================================
// EXTENDED TYPES
// =============================================================================

/**
 * MCP tool definition with full metadata
 */
export interface MCPToolInfo {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

/**
 * MCP resource definition
 */
export interface MCPResourceInfo {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

/**
 * MCP prompt definition
 */
export interface MCPPromptInfo {
  name: string
  description?: string
  arguments?: Array<{
    name: string
    description?: string
    required?: boolean
  }>
}

// =============================================================================
// EXTENDED TOOL OPERATIONS
// =============================================================================

/**
 * List available tools with full metadata
 */
export async function listServerToolsWithInfo(
  connection: MCPConnection
): Promise<MCPToolInfo[]> {
  try {
    const result = await connection.client.listTools()
    return result.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema as Record<string, unknown> | undefined,
    }))
  } catch (error) {
    console.error("Failed to list tools:", error)
    return []
  }
}

/**
 * Check if a specific tool is available
 */
export async function hasServerTool(
  connection: MCPConnection,
  toolName: string
): Promise<boolean> {
  const tools = await listServerTools(connection)
  return tools.includes(toolName)
}

// =============================================================================
// RESOURCE OPERATIONS
// =============================================================================

/**
 * List available resources on the connected MCP server
 */
export async function listServerResources(
  connection: MCPConnection
): Promise<MCPResourceInfo[]> {
  try {
    const result = await connection.client.listResources()
    return result.resources.map((res) => ({
      uri: res.uri,
      name: res.name,
      description: res.description,
      mimeType: res.mimeType,
    }))
  } catch (error) {
    console.error("Failed to list resources:", error)
    return []
  }
}

/**
 * Read a resource from the connected MCP server
 */
export async function readServerResource(
  connection: MCPConnection,
  uri: string
): Promise<{ uri: string; mimeType?: string; text?: string; blob?: string } | null> {
  try {
    const result = await connection.client.readResource({ uri })
    const content = result.contents[0]
    if (!content) return null
    return {
      uri: content.uri,
      mimeType: content.mimeType,
      text: "text" in content ? content.text : undefined,
      blob: "blob" in content ? content.blob : undefined,
    }
  } catch (error) {
    console.error(`Failed to read resource ${uri}:`, error)
    return null
  }
}

// =============================================================================
// PROMPT OPERATIONS
// =============================================================================

/**
 * List available prompts on the connected MCP server
 */
export async function listServerPrompts(
  connection: MCPConnection
): Promise<MCPPromptInfo[]> {
  try {
    const result = await connection.client.listPrompts()
    return result.prompts.map((prompt) => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments,
    }))
  } catch (error) {
    console.error("Failed to list prompts:", error)
    return []
  }
}

/**
 * Get a prompt from the connected MCP server
 */
export async function getServerPrompt(
  connection: MCPConnection,
  name: string,
  args: Record<string, string> = {}
): Promise<{
  description?: string
  messages: Array<{ role: string; content: unknown }>
} | null> {
  try {
    const result = await connection.client.getPrompt({ name, arguments: args })
    return {
      description: result.description,
      messages: result.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }
  } catch (error) {
    console.error(`Failed to get prompt ${name}:`, error)
    return null
  }
}

// =============================================================================
// CONNECTION POOL
// =============================================================================

/**
 * Connection pool for managing multiple MCP server connections
 */
export class MCPConnectionPool {
  private connections = new Map<string, MCPConnection>()

  /**
   * Get or create a connection to an MCP server
   */
  async getConnection(
    id: string,
    command: string,
    args: string[] = [],
    options?: { cwd?: string; env?: Record<string, string> }
  ): Promise<MCPConnection> {
    const existing = this.connections.get(id)
    if (existing) {
      return existing
    }

    const connection = await connectToMCPServer(command, args, options)
    this.connections.set(id, connection)
    return connection
  }

  /**
   * Check if a connection exists
   */
  hasConnection(id: string): boolean {
    return this.connections.has(id)
  }

  /**
   * Get an existing connection
   */
  getExisting(id: string): MCPConnection | undefined {
    return this.connections.get(id)
  }

  /**
   * Close a specific connection
   */
  async closeConnection(id: string): Promise<void> {
    const connection = this.connections.get(id)
    if (connection) {
      await disconnectFromMCPServer(connection)
      this.connections.delete(id)
    }
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    const ids = Array.from(this.connections.keys())
    await Promise.all(ids.map((id) => this.closeConnection(id)))
  }

  /**
   * Get all connection IDs
   */
  getConnectionIds(): string[] {
    return Array.from(this.connections.keys())
  }
}

/**
 * Create a new connection pool
 */
export function createConnectionPool(): MCPConnectionPool {
  return new MCPConnectionPool()
}

// Global connection pool instance
let globalPool: MCPConnectionPool | undefined

/**
 * Get the global connection pool
 */
export function getGlobalConnectionPool(): MCPConnectionPool {
  if (!globalPool) {
    globalPool = createConnectionPool()
  }
  return globalPool
}
