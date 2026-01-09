#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { z } from "zod"
import { spawn } from "child_process"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import pkg from "../package.json" with { type: "json" }
import type { McpToolName } from "./telemetry/mcp-telemetry-tracker.js"
import { queueEvent, getSessionAggregationJSON } from "./telemetry/event-queue.js"
import { log } from "./telemetry/logger.js"

// Import version management
import {
  startPolling as startVersionPolling,
  stopPolling as stopVersionPolling,
  fetchAllLatestVersions,
  getCacheStatus,
  type VersionDiff,
} from "./providers/versions.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Import unified tool registry
import {
  getEnabledTools,
  getToolByName,
  toolNameToTelemetryName,
  categories
} from "./tools/index.js"

// Import prompts
import * as upgradeNextjs16Prompt from "./prompts/upgrade-nextjs-16.js"
import * as enableCacheComponentsPrompt from "./prompts/enable-cache-components.js"

// Import resources
import * as cacheComponentsOverview from "./resources/(cache-components)/overview.js"
import * as cacheComponentsCoreMechanics from "./resources/(cache-components)/core-mechanics.js"
import * as cacheComponentsPublicCaches from "./resources/(cache-components)/public-caches.js"
import * as cacheComponentsPrivateCaches from "./resources/(cache-components)/private-caches.js"
import * as cacheComponentsRuntimePrefetching from "./resources/(cache-components)/runtime-prefetching.js"
import * as cacheComponentsRequestApis from "./resources/(cache-components)/request-apis.js"
import * as cacheComponentsCacheInvalidation from "./resources/(cache-components)/cache-invalidation.js"
import * as cacheComponentsAdvancedPatterns from "./resources/(cache-components)/advanced-patterns.js"
import * as cacheComponentsBuildBehavior from "./resources/(cache-components)/build-behavior.js"
import * as cacheComponentsErrorPatterns from "./resources/(cache-components)/error-patterns.js"
import * as cacheComponentsTestPatterns from "./resources/(cache-components)/test-patterns.js"
import * as cacheComponentsReference from "./resources/(cache-components)/reference.js"
import * as cacheComponentsRouteHandlers from "./resources/(cache-components)/route-handlers.js"
import * as nextjsFundamentalsUseClient from "./resources/(nextjs-fundamentals)/use-client.js"
import * as nextjs16BetaToStable from "./resources/(nextjs16)/migration/beta-to-stable.js"
import * as nextjs16Examples from "./resources/(nextjs16)/migration/examples.js"
import * as nextjsDocsLlmsIndex from "./resources/(nextjs-docs)/llms-index.js"

// Import Midnight resources
import * as midnightCompactOverview from "./resources/(midnight-compact)/overview.js"
import * as midnightCompactReference from "./resources/(midnight-compact)/reference.js"
import * as midnightSdkOverview from "./resources/(midnight-sdk)/overview.js"

// Import Midnight prompts
import * as createMidnightContractPrompt from "./prompts/create-midnight-contract.js"

// Parse CLI arguments for tool categories and features
const args = process.argv.slice(2)
// Default behavior: enable Next.js devtools by default; Midnight tools are opt-in via --midnight
const enableMidnight = args.includes("--midnight") ? true : args.includes("--no-midnight") ? false : false
const enableNextjs = args.includes("--no-nextjs") ? false : true
const enableAlpha = args.includes("--alpha")
const enableVersionPolling = !args.includes("--no-version-polling")
const checkVersionsOnStart = args.includes("--check-versions")

// Version polling interval (default 24 hours, can be set via --poll-interval=HOURS)
const pollIntervalArg = args.find(a => a.startsWith("--poll-interval="))
const pollIntervalHours = pollIntervalArg ? parseInt(pollIntervalArg.split("=")[1], 10) : 24
const pollIntervalMs = pollIntervalHours * 60 * 60 * 1000

// Start version polling if enabled
if (enableVersionPolling) {
  startVersionPolling({
    interval: pollIntervalMs,
    onUpdate: (updates: VersionDiff[]) => {
      log("info", `📦 ${updates.length} Midnight package update(s) available:`)
      for (const update of updates) {
        log("info", `  - ${update.package}: ${update.current} → ${update.latest}`)
      }
    },
    onError: (error: Error) => {
      log("error", `Version polling error: ${error.message}`)
    },
  })
}

// Check versions on startup if requested
if (checkVersionsOnStart) {
  fetchAllLatestVersions().then(() => {
    const status = getCacheStatus()
    log("info", `📦 Version cache updated: ${status.packageCount} packages tracked`)
  }).catch((err) => {
    log("error", `Failed to check versions: ${(err as Error).message}`)
  })
}

// Get tools based on configuration
const tools = getEnabledTools({ midnight: enableMidnight, nextjs: enableNextjs })

const prompts = [
  upgradeNextjs16Prompt,
  enableCacheComponentsPrompt,
  ...(enableMidnight ? [createMidnightContractPrompt] : []),
]

const resources = [
  // Next.js resources
  cacheComponentsOverview,
  cacheComponentsCoreMechanics,
  cacheComponentsPublicCaches,
  cacheComponentsPrivateCaches,
  cacheComponentsRuntimePrefetching,
  cacheComponentsRequestApis,
  cacheComponentsCacheInvalidation,
  cacheComponentsAdvancedPatterns,
  cacheComponentsBuildBehavior,
  cacheComponentsErrorPatterns,
  cacheComponentsTestPatterns,
  cacheComponentsReference,
  cacheComponentsRouteHandlers,
  nextjsFundamentalsUseClient,
  nextjs16BetaToStable,
  nextjs16Examples,
  nextjsDocsLlmsIndex,
  // Midnight resources
  midnightCompactOverview,
  midnightCompactReference,
  midnightSdkOverview,
]

// Type definitions
interface JSONSchema {
  type?: string
  description?: string
  properties?: Record<string, JSONSchema>
  items?: JSONSchema
  enum?: unknown[]
}

// Create server
const server = new Server(
  {
    name: "midnight-nextjs-mcp",
    version: pkg.version,
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
      resources: {},
    },
  }
)

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((tool) => ({
      name: tool.metadata.name,
      description: tool.metadata.description,
      inputSchema: {
        type: "object",
        properties: Object.entries(tool.inputSchema).reduce((acc, [key, zodSchema]) => {
          acc[key] = zodSchemaToJsonSchema(zodSchema)
          return acc
        }, {} as Record<string, JSONSchema>),
      },
    })),
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  const tool = getToolByName(name)
  if (!tool) {
    throw new Error(`Tool not found: ${name}`)
  }

  // Queue telemetry event for later batch sending
  const telemetryName = toolNameToTelemetryName[name] as McpToolName | undefined
  if (telemetryName) {
    const event = {
      eventName: "NEXT_MCP_TOOL_USAGE",
      fields: {
        toolName: telemetryName,
        invocationCount: 1,
      },
    }
    queueEvent(event)
  }

  const parsedArgs = parseToolArgs(tool.inputSchema, args || {})

  const result = await (tool.handler as (args: Record<string, unknown>) => Promise<string>)(parsedArgs)

  return {
    content: [
      {
        type: "text",
        text: result,
      },
    ],
  }
})

// Register prompt handlers
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: prompts.map((prompt) => ({
      name: prompt.metadata.name,
      description: prompt.metadata.description,
    })),
  }
})

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  const prompt = prompts.find((p) => p.metadata.name === name)
  if (!prompt) {
    throw new Error(`Prompt not found: ${name}`)
  }

  // Validate arguments if schema exists
  let parsedArgs: Record<string, unknown> = args || {}
  if (prompt.inputSchema) {
    parsedArgs = parseToolArgs(prompt.inputSchema, args || {})
  }

  // Get the prompt content
  const content = await prompt.handler(parsedArgs as never)

  return {
    messages: [
      {
        role: prompt.metadata.role || "user",
        content: {
          type: "text",
          text: content,
        },
      },
    ],
  }
})

// Register resource handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: resources.map((resource) => ({
      uri: resource.metadata.uri,
      name: resource.metadata.name,
      description: resource.metadata.description,
      mimeType: resource.metadata.mimeType || "text/markdown",
    })),
  }
})

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params

  const resource = resources.find((r) => r.metadata.uri === uri)
  if (!resource) {
    throw new Error(`Resource not found: ${uri}`)
  }

  const content = await resource.handler()

  return {
    contents: [
      {
        uri,
        mimeType: resource.metadata.mimeType || "text/markdown",
        text: content,
      },
    ],
  }
})

function zodSchemaToJsonSchema(zodSchema: z.ZodTypeAny): JSONSchema {
  const description = zodSchema._def?.description

  if (zodSchema._def?.typeName === "ZodString") {
    return { type: "string", description }
  }
  if (zodSchema._def?.typeName === "ZodNumber") {
    return { type: "number", description }
  }
  if (zodSchema._def?.typeName === "ZodBoolean") {
    return { type: "boolean", description }
  }
  if (zodSchema._def?.typeName === "ZodArray") {
    return {
      type: "array",
      description,
      items: zodSchemaToJsonSchema(zodSchema._def.type),
    }
  }
  if (zodSchema._def?.typeName === "ZodObject") {
    const shape = zodSchema._def.shape()
    const properties: Record<string, JSONSchema> = {}
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodSchemaToJsonSchema(value as z.ZodTypeAny)
    }
    return { type: "object", description, properties }
  }
  if (zodSchema._def?.typeName === "ZodEnum") {
    return { type: "string", enum: zodSchema._def.values, description }
  }
  if (zodSchema._def?.typeName === "ZodOptional") {
    return zodSchemaToJsonSchema(zodSchema._def.innerType)
  }
  if (zodSchema._def?.typeName === "ZodUnion") {
    const options = zodSchema._def.options
    if (options.length === 2) {
      return zodSchemaToJsonSchema(options[0])
    }
  }

  return { type: "string", description }
}

function parseToolArgs(
  schema: Record<string, z.ZodTypeAny>,
  args: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, zodSchema] of Object.entries(schema)) {
    if (args[key] !== undefined) {
      const parsed = zodSchema.safeParse(args[key])
      if (parsed.success) {
        result[key] = parsed.data
      } else {
        throw new Error(`Invalid argument '${key}': ${parsed.error.message}`)
      }
    } else if (!zodSchema.isOptional()) {
      throw new Error(`Missing required argument: ${key}`)
    }
  }

  return result
}

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)

  log('Server started')
  log(`Enabled categories: ${categories.filter(c =>
    (c.name === 'midnight' && enableMidnight) ||
    (c.name === 'nextjs' && enableNextjs)
  ).map(c => c.displayName).join(', ')}`)
  log(`Total tools: ${tools.length}`)

  const shutdown = () => {
    log('Server terminated')

    const aggregationJSON = getSessionAggregationJSON()

    if (aggregationJSON) {
      const flushEventsScript = join(__dirname, "telemetry", "flush-events.js")
      const child = spawn(
        process.execPath,
        [flushEventsScript, aggregationJSON],
        {
          detached: true,
          stdio: 'ignore',
          windowsHide: true
        }
      )

      child.unref()

      log('Event flusher spawned with aggregation data')
    } else {
      log('No events to flush')
    }

    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((error) => {
  console.error("Server error:", error)
  process.exit(1)
})
