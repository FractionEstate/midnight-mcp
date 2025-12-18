import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { logger } from "./utils/index.js";
import { vectorStore } from "./db/index.js";
import { allTools } from "./tools/index.js";
import {
  allResources,
  getDocumentation,
  getCode,
  getSchema,
} from "./resources/index.js";
import { promptDefinitions, generatePrompt } from "./prompts/index.js";

// Server information
const SERVER_INFO = {
  name: "midnight-mcp",
  version: "1.0.0",
  description: "MCP Server for Midnight Blockchain Development",
};

/**
 * Create and configure the MCP server
 */
export function createServer(): Server {
  const server = new Server(SERVER_INFO, {
    capabilities: {
      tools: {},
      resources: {
        subscribe: true,
        listChanged: true,
      },
      prompts: {
        listChanged: true,
      },
    },
  });

  // Register tool handlers
  registerToolHandlers(server);

  // Register resource handlers
  registerResourceHandlers(server);

  // Register prompt handlers
  registerPromptHandlers(server);

  return server;
}

/**
 * Register tool handlers
 */
function registerToolHandlers(server: Server): void {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug("Listing tools");
    return {
      tools: allTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info(`Tool called: ${name}`, { args });

    const tool = allTools.find((t) => t.name === name);
    if (!tool) {
      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await tool.handler(args as never);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error(`Tool error: ${name}`, { error: String(error) });
      return {
        content: [
          {
            type: "text",
            text: `Error executing ${name}: ${error}`,
          },
        ],
        isError: true,
      };
    }
  });
}

/**
 * Register resource handlers
 */
function registerResourceHandlers(server: Server): void {
  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    logger.debug("Listing resources");
    return {
      resources: allResources.map((resource) => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      })),
    };
  });

  // Read resource content
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    logger.info(`Resource requested: ${uri}`);

    try {
      let content: string | null = null;
      let mimeType = "text/plain";

      if (uri.startsWith("midnight://docs/")) {
        content = await getDocumentation(uri);
        mimeType = "text/markdown";
      } else if (uri.startsWith("midnight://code/")) {
        content = await getCode(uri);
        mimeType = "text/x-compact";
      } else if (uri.startsWith("midnight://schema/")) {
        const schema = getSchema(uri);
        content = schema ? JSON.stringify(schema, null, 2) : null;
        mimeType = "application/json";
      }

      if (!content) {
        return {
          contents: [
            {
              uri,
              mimeType: "text/plain",
              text: `Resource not found: ${uri}`,
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri,
            mimeType,
            text: content,
          },
        ],
      };
    } catch (error) {
      logger.error(`Resource error: ${uri}`, { error: String(error) });
      return {
        contents: [
          {
            uri,
            mimeType: "text/plain",
            text: `Error reading resource: ${error}`,
          },
        ],
      };
    }
  });
}

/**
 * Register prompt handlers
 */
function registerPromptHandlers(server: Server): void {
  // List available prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    logger.debug("Listing prompts");
    return {
      prompts: promptDefinitions.map((prompt) => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments,
      })),
    };
  });

  // Get prompt content
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info(`Prompt requested: ${name}`, { args });

    const prompt = promptDefinitions.find((p) => p.name === name);
    if (!prompt) {
      return {
        description: `Unknown prompt: ${name}`,
        messages: [],
      };
    }

    const messages = generatePrompt(name, args || {});

    return {
      description: prompt.description,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };
  });
}

/**
 * Initialize the server and vector store
 */
export async function initializeServer(): Promise<Server> {
  logger.info("Initializing Midnight MCP Server...");

  // Initialize vector store
  try {
    await vectorStore.initialize();
    logger.info("Vector store initialized");
  } catch (error) {
    logger.warn("Vector store initialization failed, continuing without it", {
      error: String(error),
    });
  }

  // Create and return server
  const server = createServer();
  logger.info("Server created successfully");

  return server;
}

/**
 * Start the server with stdio transport
 */
export async function startServer(): Promise<void> {
  const server = await initializeServer();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("Midnight MCP Server running on stdio");
}
