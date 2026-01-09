/**
 * Server Configuration
 *
 * Hierarchical configuration with environment variable support.
 * Based on GitHub MCP server patterns.
 */

import type {
  ServerConfig,
  MidnightConfig,
  LoggingConfig,
  ToolsetId,
} from "../types/mcp.js"
import { DEFAULT_CONFIG, ENV_VAR_MAP } from "../types/mcp.js"

// =============================================================================
// CONFIG BUILDER
// =============================================================================

export class ConfigBuilder {
  private config: ServerConfig

  constructor() {
    this.config = { ...DEFAULT_CONFIG }
  }

  /**
   * Set server name
   */
  name(name: string): this {
    this.config.name = name
    return this
  }

  /**
   * Set server version
   */
  version(version: string): this {
    this.config.version = version
    return this
  }

  /**
   * Enable specific categories
   */
  categories(ids: string[]): this {
    this.config.enabledCategories = new Set(ids)
    return this
  }

  /**
   * Enable specific toolsets
   */
  toolsets(ids: ToolsetId[]): this {
    this.config.enabledToolsets = new Set(ids)
    return this
  }

  /**
   * Enable specific tools
   */
  tools(names: string[]): this {
    this.config.enabledTools = new Set(names)
    return this
  }

  /**
   * Enable specific features
   */
  features(names: string[]): this {
    this.config.enabledFeatures = new Set(names)
    return this
  }

  /**
   * Set read-only mode
   */
  readOnly(enabled: boolean): this {
    this.config.readOnly = enabled
    return this
  }

  /**
   * Set dynamic tools mode
   */
  dynamicTools(enabled: boolean): this {
    this.config.dynamicTools = enabled
    return this
  }

  /**
   * Configure Midnight settings
   */
  midnight(config: Partial<MidnightConfig>): this {
    this.config.midnight = { ...this.config.midnight, ...config }
    return this
  }

  /**
   * Configure logging settings
   */
  logging(config: Partial<LoggingConfig>): this {
    this.config.logging = { ...this.config.logging, ...config }
    return this
  }

  /**
   * Load configuration from environment variables
   */
  fromEnv(): this {
    // Categories
    const enabledCategories = process.env.MIDNIGHT_ENABLED_CATEGORIES
    if (enabledCategories) {
      this.config.enabledCategories = new Set(
        enabledCategories.split(",").map((s) => s.trim())
      )
    }

    // Toolsets
    const enabledToolsets = process.env.MIDNIGHT_ENABLED_TOOLSETS
    if (enabledToolsets) {
      this.config.enabledToolsets = new Set(
        enabledToolsets.split(",").map((s) => s.trim() as ToolsetId)
      )
    }

    // Tools
    const enabledTools = process.env.MIDNIGHT_ENABLED_TOOLS
    if (enabledTools) {
      this.config.enabledTools = new Set(
        enabledTools.split(",").map((s) => s.trim())
      )
    }

    // Features
    const enabledFeatures = process.env.MIDNIGHT_ENABLED_FEATURES
    if (enabledFeatures) {
      this.config.enabledFeatures = new Set(
        enabledFeatures.split(",").map((s) => s.trim())
      )
    }

    // Read-only mode
    const readOnly = process.env.MIDNIGHT_READ_ONLY
    if (readOnly) {
      this.config.readOnly = readOnly === "true" || readOnly === "1"
    }

    // Midnight network config
    const networkId = process.env.MIDNIGHT_NETWORK_ID
    if (networkId && ["testnet", "devnet", "mainnet"].includes(networkId)) {
      this.config.midnight.networkId = networkId as MidnightConfig["networkId"]
    }

    const indexerUrl = process.env.MIDNIGHT_INDEXER_URL
    if (indexerUrl) {
      this.config.midnight.indexerUrl = indexerUrl
    }

    const nodeUrl = process.env.MIDNIGHT_NODE_URL
    if (nodeUrl) {
      this.config.midnight.nodeUrl = nodeUrl
    }

    const proofServerUrl = process.env.MIDNIGHT_PROOF_SERVER_URL
    if (proofServerUrl) {
      this.config.midnight.proofServerUrl = proofServerUrl
    }

    // Logging config
    const logLevel = process.env.MIDNIGHT_LOG_LEVEL
    if (logLevel && ["debug", "info", "warn", "error"].includes(logLevel)) {
      this.config.logging.level = logLevel as LoggingConfig["level"]
    }

    const logFile = process.env.MIDNIGHT_LOG_FILE
    if (logFile) {
      this.config.logging.file = logFile
    }

    const logJson = process.env.MIDNIGHT_LOG_JSON
    if (logJson) {
      this.config.logging.json = logJson === "true" || logJson === "1"
    }

    return this
  }

  /**
   * Load configuration from CLI arguments
   */
  fromArgs(args: string[]): this {
    for (const arg of args) {
      // --no-midnight
      if (arg === "--no-midnight") {
        this.config.enabledCategories.delete("midnight")
      }

      // --no-nextjs
      if (arg === "--no-nextjs") {
        this.config.enabledCategories.delete("nextjs")
      }

      // --read-only
      if (arg === "--read-only") {
        this.config.readOnly = true
      }

      // --alpha (feature flag)
      if (arg === "--alpha") {
        this.config.enabledFeatures.add("alpha")
      }

      // --network=testnet|devnet|mainnet
      if (arg.startsWith("--network=")) {
        const network = arg.split("=")[1]
        if (["testnet", "devnet", "mainnet"].includes(network)) {
          this.config.midnight.networkId = network as MidnightConfig["networkId"]
        }
      }

      // --log-level=debug|info|warn|error
      if (arg.startsWith("--log-level=")) {
        const level = arg.split("=")[1]
        if (["debug", "info", "warn", "error"].includes(level)) {
          this.config.logging.level = level as LoggingConfig["level"]
        }
      }

      // --log-file=path
      if (arg.startsWith("--log-file=")) {
        this.config.logging.file = arg.split("=")[1]
      }

      // --log-json
      if (arg === "--log-json") {
        this.config.logging.json = true
      }

      // --toolsets=midnight:network,midnight:contracts
      if (arg.startsWith("--toolsets=")) {
        const toolsets = arg.split("=")[1].split(",")
        this.config.enabledToolsets = new Set(
          toolsets.map((s) => s.trim() as ToolsetId)
        )
      }

      // --tools=midnight_init,midnight_get_balance
      if (arg.startsWith("--tools=")) {
        const tools = arg.split("=")[1].split(",")
        this.config.enabledTools = new Set(tools.map((s) => s.trim()))
      }

      // --features=alpha,experimental
      if (arg.startsWith("--features=")) {
        const features = arg.split("=")[1].split(",")
        this.config.enabledFeatures = new Set(features.map((s) => s.trim()))
      }
    }

    return this
  }

  /**
   * Build the configuration
   */
  build(): ServerConfig {
    return { ...this.config }
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a new config builder
 */
export function createConfigBuilder(): ConfigBuilder {
  return new ConfigBuilder()
}

/**
 * Load configuration from environment and CLI args
 */
export function loadConfig(args: string[] = process.argv.slice(2)): ServerConfig {
  return createConfigBuilder().fromEnv().fromArgs(args).build()
}

/**
 * Get network-specific URLs for a given network ID
 */
export function getNetworkUrls(networkId: MidnightConfig["networkId"]): {
  indexerUrl: string
  nodeUrl: string
  proofServerUrl: string
} {
  const networks: Record<MidnightConfig["networkId"], {
    indexerUrl: string
    nodeUrl: string
    proofServerUrl: string
  }> = {
    testnet: {
      indexerUrl: "https://indexer.testnet.midnight.network",
      nodeUrl: "https://rpc.testnet.midnight.network",
      proofServerUrl: "https://prover.testnet.midnight.network",
    },
    devnet: {
      indexerUrl: "https://indexer.devnet.midnight.network",
      nodeUrl: "https://rpc.devnet.midnight.network",
      proofServerUrl: "https://prover.devnet.midnight.network",
    },
    mainnet: {
      indexerUrl: "https://indexer.midnight.network",
      nodeUrl: "https://rpc.midnight.network",
      proofServerUrl: "https://prover.midnight.network",
    },
  }

  return networks[networkId]
}

/**
 * Validate configuration
 */
export function validateConfig(config: ServerConfig): string[] {
  const errors: string[] = []

  // Check required fields
  if (!config.name) {
    errors.push("Server name is required")
  }

  if (!config.version) {
    errors.push("Server version is required")
  }

  // Check midnight config
  if (!config.midnight.networkId) {
    errors.push("Midnight network ID is required")
  }

  if (!config.midnight.indexerUrl) {
    errors.push("Midnight indexer URL is required")
  }

  // Check for valid URLs
  try {
    new URL(config.midnight.indexerUrl)
  } catch {
    errors.push("Invalid indexer URL")
  }

  try {
    new URL(config.midnight.nodeUrl)
  } catch {
    errors.push("Invalid node URL")
  }

  try {
    new URL(config.midnight.proofServerUrl)
  } catch {
    errors.push("Invalid proof server URL")
  }

  return errors
}

/**
 * Print configuration summary
 */
export function formatConfigSummary(config: ServerConfig): string {
  const lines: string[] = []

  lines.push("# Server Configuration")
  lines.push("")
  lines.push(`**Name:** ${config.name}`)
  lines.push(`**Version:** ${config.version}`)
  lines.push("")

  lines.push("## Tool Enablement")
  lines.push(`- Categories: ${Array.from(config.enabledCategories).join(", ") || "all"}`)
  lines.push(`- Toolsets: ${config.enabledToolsets.size > 0 ? Array.from(config.enabledToolsets).join(", ") : "all"}`)
  lines.push(`- Tools: ${config.enabledTools.size > 0 ? Array.from(config.enabledTools).join(", ") : "all"}`)
  lines.push(`- Features: ${config.enabledFeatures.size > 0 ? Array.from(config.enabledFeatures).join(", ") : "none"}`)
  lines.push("")

  lines.push("## Modes")
  lines.push(`- Read-only: ${config.readOnly}`)
  lines.push(`- Dynamic tools: ${config.dynamicTools}`)
  lines.push("")

  lines.push("## Midnight Network")
  lines.push(`- Network: ${config.midnight.networkId}`)
  lines.push(`- Indexer: ${config.midnight.indexerUrl}`)
  lines.push(`- Node: ${config.midnight.nodeUrl}`)
  lines.push(`- Proof Server: ${config.midnight.proofServerUrl}`)
  lines.push("")

  lines.push("## Logging")
  lines.push(`- Level: ${config.logging.level}`)
  lines.push(`- File: ${config.logging.file || "none"}`)
  lines.push(`- JSON: ${config.logging.json}`)

  return lines.join("\n")
}
