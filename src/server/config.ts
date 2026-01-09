/**
 * MCP Server Configuration
 *
 * Server configuration and initialization patterns.
 * Based on GitHub MCP server configuration patterns.
 */

import type { ToolsetID } from "../toolsets/toolsets.js"
import type { Scope } from "../scopes/scopes.js"
import type { LogLevel } from "../log/log.js"

// =============================================================================
// SERVER CONFIGURATION
// =============================================================================

/**
 * Main server configuration
 */
export interface MCPServerConfig {
  /** Server version string */
  version: string

  /** Server name */
  name: string

  /** Server description */
  description?: string

  /** Enabled toolsets */
  enabledToolsets?: ToolsetID[]

  /** Specific tools to enable (additive to toolsets) */
  enabledTools?: string[]

  /** Enabled feature flags */
  enabledFeatures?: string[]

  /** Enable dynamic toolset management */
  dynamicToolsets?: boolean

  /** Read-only mode (disable write operations) */
  readOnly?: boolean

  /** Lockdown mode (restrict access based on permissions) */
  lockdownMode?: boolean

  /** Available scopes for this session */
  tokenScopes?: Scope[]

  /** Content window size (max characters for large responses) */
  contentWindowSize?: number

  /** Log level */
  logLevel?: LogLevel

  /** Log file path (if logging to file) */
  logFilePath?: string

  /** Enable command/request logging */
  enableRequestLogging?: boolean

  /** Export translations for i18n */
  exportTranslations?: boolean

  /** Midnight Network specific config */
  midnight?: MidnightConfig

  /** Next.js DevTools specific config */
  nextjs?: NextJSConfig
}

/**
 * Midnight Network configuration
 */
export interface MidnightConfig {
  /** Network to connect to */
  network?: "testnet" | "mainnet" | "devnet"

  /** Custom RPC endpoint */
  rpcEndpoint?: string

  /** Wallet private key (if needed for transactions) */
  walletKey?: string

  /** Indexer endpoint */
  indexerEndpoint?: string

  /** Proof server endpoint */
  proofServerEndpoint?: string
}

/**
 * Next.js DevTools configuration
 */
export interface NextJSConfig {
  /** Next.js dev server URL */
  devServerUrl?: string

  /** Browser type for automation */
  browserType?: "chromium" | "firefox" | "webkit"

  /** Run browser in headless mode */
  headless?: boolean

  /** Browser viewport width */
  viewportWidth?: number

  /** Browser viewport height */
  viewportHeight?: number
}

// =============================================================================
// STDIO SERVER CONFIGURATION
// =============================================================================

/**
 * Configuration for stdio-based server
 */
export interface StdioServerConfig extends MCPServerConfig {
  /** Whether to use stdio transport */
  stdio: true
}

// =============================================================================
// HTTP SERVER CONFIGURATION
// =============================================================================

/**
 * Configuration for HTTP-based server
 */
export interface HttpServerConfig extends MCPServerConfig {
  /** HTTP port */
  port: number

  /** HTTP host */
  host?: string

  /** Enable CORS */
  cors?: boolean

  /** CORS allowed origins */
  corsOrigins?: string[]

  /** Enable TLS */
  tls?: boolean

  /** TLS certificate path */
  tlsCert?: string

  /** TLS key path */
  tlsKey?: string
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default server configuration values
 */
export const DefaultServerConfig: Partial<MCPServerConfig> = {
  version: "0.1.0",
  name: "midnight-nextjs-mcp",
  description:
    "MCP server for Midnight Network and Next.js DevTools integration",
  dynamicToolsets: false,
  readOnly: false,
  lockdownMode: false,
  contentWindowSize: 100000,
  enableRequestLogging: false,
  exportTranslations: false,
}

/**
 * Default Midnight configuration
 */
export const DefaultMidnightConfig: MidnightConfig = {
  network: "testnet",
}

/**
 * Default Next.js configuration
 */
export const DefaultNextJSConfig: NextJSConfig = {
  browserType: "chromium",
  headless: true,
  viewportWidth: 1280,
  viewportHeight: 720,
}

// =============================================================================
// CONFIGURATION UTILITIES
// =============================================================================

/**
 * Merge configuration with defaults
 */
export function mergeConfig(
  config: Partial<MCPServerConfig>
): MCPServerConfig {
  return {
    ...DefaultServerConfig,
    ...config,
    midnight: {
      ...DefaultMidnightConfig,
      ...config.midnight,
    },
    nextjs: {
      ...DefaultNextJSConfig,
      ...config.nextjs,
    },
  } as MCPServerConfig
}

/**
 * Validate server configuration
 */
export function validateConfig(
  config: MCPServerConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config.version) {
    errors.push("version is required")
  }

  if (!config.name) {
    errors.push("name is required")
  }

  if (config.contentWindowSize !== undefined && config.contentWindowSize < 1000) {
    errors.push("contentWindowSize must be at least 1000")
  }

  if (config.midnight?.rpcEndpoint) {
    try {
      new URL(config.midnight.rpcEndpoint)
    } catch {
      errors.push("midnight.rpcEndpoint must be a valid URL")
    }
  }

  if (config.nextjs?.devServerUrl) {
    try {
      new URL(config.nextjs.devServerUrl)
    } catch {
      errors.push("nextjs.devServerUrl must be a valid URL")
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Create configuration from environment variables
 */
export function configFromEnv(): Partial<MCPServerConfig> {
  const config: Partial<MCPServerConfig> = {}

  // Basic config
  if (process.env.MCP_VERSION) {
    config.version = process.env.MCP_VERSION
  }

  if (process.env.MCP_NAME) {
    config.name = process.env.MCP_NAME
  }

  if (process.env.MCP_TOOLSETS) {
    config.enabledToolsets = process.env.MCP_TOOLSETS.split(",").map((s) =>
      s.trim()
    )
  }

  if (process.env.MCP_TOOLS) {
    config.enabledTools = process.env.MCP_TOOLS.split(",").map((s) =>
      s.trim()
    )
  }

  if (process.env.MCP_FEATURES) {
    config.enabledFeatures = process.env.MCP_FEATURES.split(",").map((s) =>
      s.trim()
    )
  }

  if (process.env.MCP_DYNAMIC_TOOLSETS === "true") {
    config.dynamicToolsets = true
  }

  if (process.env.MCP_READ_ONLY === "true") {
    config.readOnly = true
  }

  if (process.env.MCP_LOCKDOWN === "true") {
    config.lockdownMode = true
  }

  if (process.env.MCP_CONTENT_WINDOW_SIZE) {
    config.contentWindowSize = parseInt(
      process.env.MCP_CONTENT_WINDOW_SIZE,
      10
    )
  }

  // Midnight config
  const midnight: MidnightConfig = {}
  if (
    process.env.MIDNIGHT_NETWORK === "testnet" ||
    process.env.MIDNIGHT_NETWORK === "mainnet" ||
    process.env.MIDNIGHT_NETWORK === "devnet"
  ) {
    midnight.network = process.env.MIDNIGHT_NETWORK
  }
  if (process.env.MIDNIGHT_RPC_ENDPOINT) {
    midnight.rpcEndpoint = process.env.MIDNIGHT_RPC_ENDPOINT
  }
  if (process.env.MIDNIGHT_WALLET_KEY) {
    midnight.walletKey = process.env.MIDNIGHT_WALLET_KEY
  }
  if (process.env.MIDNIGHT_INDEXER_ENDPOINT) {
    midnight.indexerEndpoint = process.env.MIDNIGHT_INDEXER_ENDPOINT
  }
  if (process.env.MIDNIGHT_PROOF_SERVER_ENDPOINT) {
    midnight.proofServerEndpoint = process.env.MIDNIGHT_PROOF_SERVER_ENDPOINT
  }
  if (Object.keys(midnight).length > 0) {
    config.midnight = midnight
  }

  // Next.js config
  const nextjs: NextJSConfig = {}
  if (process.env.NEXTJS_DEV_SERVER_URL) {
    nextjs.devServerUrl = process.env.NEXTJS_DEV_SERVER_URL
  }
  if (
    process.env.NEXTJS_BROWSER_TYPE === "chromium" ||
    process.env.NEXTJS_BROWSER_TYPE === "firefox" ||
    process.env.NEXTJS_BROWSER_TYPE === "webkit"
  ) {
    nextjs.browserType = process.env.NEXTJS_BROWSER_TYPE
  }
  if (process.env.NEXTJS_HEADLESS !== undefined) {
    nextjs.headless = process.env.NEXTJS_HEADLESS !== "false"
  }
  if (Object.keys(nextjs).length > 0) {
    config.nextjs = nextjs
  }

  return config
}

/**
 * Create configuration from CLI arguments
 */
export function configFromArgs(args: string[]): Partial<MCPServerConfig> {
  const config: Partial<MCPServerConfig> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === "--version" && args[i + 1]) {
      config.version = args[++i]
    } else if (arg === "--name" && args[i + 1]) {
      config.name = args[++i]
    } else if (arg === "--toolsets" && args[i + 1]) {
      config.enabledToolsets = args[++i].split(",").map((s) => s.trim())
    } else if (arg === "--tools" && args[i + 1]) {
      config.enabledTools = args[++i].split(",").map((s) => s.trim())
    } else if (arg === "--features" && args[i + 1]) {
      config.enabledFeatures = args[++i].split(",").map((s) => s.trim())
    } else if (arg === "--dynamic-toolsets") {
      config.dynamicToolsets = true
    } else if (arg === "--read-only") {
      config.readOnly = true
    } else if (arg === "--lockdown") {
      config.lockdownMode = true
    } else if (arg === "--content-window-size" && args[i + 1]) {
      config.contentWindowSize = parseInt(args[++i], 10)
    } else if (arg === "--log-file" && args[i + 1]) {
      config.logFilePath = args[++i]
    } else if (arg === "--enable-request-logging") {
      config.enableRequestLogging = true
    } else if (arg === "--export-translations") {
      config.exportTranslations = true
    }
  }

  return config
}

/**
 * Resolve final configuration by merging all sources
 * Priority: CLI args > Environment variables > Defaults
 */
export function resolveConfig(
  cliArgs?: string[],
  additionalConfig?: Partial<MCPServerConfig>
): MCPServerConfig {
  const envConfig = configFromEnv()
  const argsConfig = cliArgs ? configFromArgs(cliArgs) : {}

  return mergeConfig({
    ...envConfig,
    ...additionalConfig,
    ...argsConfig,
  })
}
