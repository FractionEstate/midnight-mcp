/**
 * CLI Configuration System
 *
 * Command-line argument parsing and configuration management.
 * Inspired by GitHub MCP server's Cobra/Viper patterns.
 */

import { parseArgs } from "util"

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Server configuration options
 */
export interface ServerConfig {
  /** Server version */
  version: string

  /** Enabled toolsets (null = defaults) */
  enabledToolsets: string[] | null

  /** Specific tools to enable (additive to toolsets) */
  enabledTools: string[]

  /** Feature flags that are enabled */
  enabledFeatures: string[]

  /** Enable dynamic toolset management */
  dynamicToolsets: boolean

  /** Restrict to read-only operations */
  readOnly: boolean

  /** Enable command logging */
  enableCommandLogging: boolean

  /** Path to log file (empty = stderr) */
  logFilePath: string

  /** Content window size */
  contentWindowSize: number

  /** Enable lockdown mode */
  lockdownMode: boolean

  /** Export translations to JSON */
  exportTranslations: boolean

  /** Enable version polling */
  enableVersionPolling: boolean

  /** Version polling interval in milliseconds */
  versionPollingInterval: number

  /** Check versions on startup */
  checkVersionsOnStart: boolean

  /** Enable Midnight tools */
  enableMidnight: boolean

  /** Enable NextJS tools */
  enableNextjs: boolean

  /** Enable alpha/experimental features */
  enableAlpha: boolean
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: ServerConfig = {
  version: "0.0.0",
  enabledToolsets: null, // null = use defaults
  enabledTools: [],
  enabledFeatures: [],
  dynamicToolsets: false,
  readOnly: false,
  enableCommandLogging: false,
  logFilePath: "",
  contentWindowSize: 5000,
  lockdownMode: false,
  exportTranslations: false,
  enableVersionPolling: true,
  versionPollingInterval: 24 * 60 * 60 * 1000, // 24 hours
  checkVersionsOnStart: false,
  enableMidnight: true,
  enableNextjs: true,
  enableAlpha: false,
}

// =============================================================================
// CLI PARSING
// =============================================================================

/**
 * CLI argument definitions
 */
const CLI_OPTIONS = {
  // Toolset configuration
  toolsets: {
    type: "string" as const,
    short: "t",
    description: "Comma-separated list of toolsets to enable",
  },
  tools: {
    type: "string" as const,
    description: "Comma-separated list of specific tools to enable",
  },
  features: {
    type: "string" as const,
    description: "Comma-separated list of feature flags to enable",
  },
  "dynamic-toolsets": {
    type: "boolean" as const,
    description: "Enable dynamic toolset management",
  },
  "read-only": {
    type: "boolean" as const,
    description: "Restrict to read-only operations",
  },

  // Logging
  "log-file": {
    type: "string" as const,
    description: "Path to log file",
  },
  "enable-command-logging": {
    type: "boolean" as const,
    description: "Enable command logging",
  },

  // Server options
  "content-window-size": {
    type: "string" as const,
    description: "Content window size",
  },
  "lockdown-mode": {
    type: "boolean" as const,
    description: "Enable lockdown mode",
  },
  "export-translations": {
    type: "boolean" as const,
    description: "Export translations to JSON file",
  },

  // Version management
  "no-version-polling": {
    type: "boolean" as const,
    description: "Disable version polling",
  },
  "poll-interval": {
    type: "string" as const,
    description: "Version polling interval in hours",
  },
  "check-versions": {
    type: "boolean" as const,
    description: "Check versions on startup",
  },

  // Category toggles
  "no-midnight": {
    type: "boolean" as const,
    description: "Disable Midnight tools",
  },
  "no-nextjs": {
    type: "boolean" as const,
    description: "Disable NextJS tools",
  },
  alpha: {
    type: "boolean" as const,
    description: "Enable alpha/experimental features",
  },

  // Help
  help: {
    type: "boolean" as const,
    short: "h",
    description: "Show help",
  },
  version: {
    type: "boolean" as const,
    short: "v",
    description: "Show version",
  },
}

/**
 * Parse CLI arguments into configuration
 */
export function parseCliArgs(
  args: string[] = process.argv.slice(2),
  defaults: Partial<ServerConfig> = {}
): {
  config: ServerConfig
  showHelp: boolean
  showVersion: boolean
} {
  const { values } = parseArgs({
    args,
    options: CLI_OPTIONS,
    allowPositionals: false,
    strict: false,
  })

  // Merge defaults
  const config: ServerConfig = { ...DEFAULT_CONFIG, ...defaults }

  // Parse toolsets
  if (typeof values.toolsets === "string" && values.toolsets) {
    config.enabledToolsets = values.toolsets.split(",").map((s) => s.trim())
  }

  // Parse tools
  if (typeof values.tools === "string" && values.tools) {
    config.enabledTools = values.tools.split(",").map((s) => s.trim())
  }

  // Parse features
  if (typeof values.features === "string" && values.features) {
    config.enabledFeatures = values.features.split(",").map((s) => s.trim())
  }

  // Boolean flags
  if (values["dynamic-toolsets"]) config.dynamicToolsets = true
  if (values["read-only"]) config.readOnly = true
  if (values["enable-command-logging"]) config.enableCommandLogging = true
  if (values["lockdown-mode"]) config.lockdownMode = true
  if (values["export-translations"]) config.exportTranslations = true
  if (values["no-version-polling"]) config.enableVersionPolling = false
  if (values["check-versions"]) config.checkVersionsOnStart = true
  if (values["no-midnight"]) config.enableMidnight = false
  if (values["no-nextjs"]) config.enableNextjs = false
  if (values.alpha) config.enableAlpha = true

  // String/number options
  if (typeof values["log-file"] === "string") {
    config.logFilePath = values["log-file"]
  }

  if (typeof values["content-window-size"] === "string") {
    const size = parseInt(values["content-window-size"], 10)
    if (!isNaN(size)) config.contentWindowSize = size
  }

  if (typeof values["poll-interval"] === "string") {
    const hours = parseInt(values["poll-interval"], 10)
    if (!isNaN(hours)) config.versionPollingInterval = hours * 60 * 60 * 1000
  }

  return {
    config,
    showHelp: values.help === true,
    showVersion: values.version === true,
  }
}

/**
 * Generate help text
 */
export function generateHelpText(programName: string): string {
  const lines: string[] = [
    `Usage: ${programName} [options]`,
    "",
    "Options:",
  ]

  for (const [name, opt] of Object.entries(CLI_OPTIONS)) {
    const shortFlag = "short" in opt && opt.short ? `-${opt.short}, ` : "    "
    const longFlag = `--${name}`
    const typeHint = opt.type === "string" ? " <value>" : ""
    lines.push(`  ${shortFlag}${longFlag}${typeHint}`)
    lines.push(`        ${opt.description}`)
  }

  return lines.join("\n")
}

// =============================================================================
// ENVIRONMENT VARIABLES
// =============================================================================

/**
 * Load configuration from environment variables
 */
export function loadFromEnv(prefix: string = "MCP"): Partial<ServerConfig> {
  const config: Partial<ServerConfig> = {}
  const env = process.env

  // Helper to get env var with prefix
  const getEnv = (name: string): string | undefined => {
    return env[`${prefix}_${name}`]
  }

  // Toolsets
  const toolsets = getEnv("TOOLSETS")
  if (toolsets) {
    config.enabledToolsets = toolsets.split(",").map((s) => s.trim())
  }

  // Tools
  const tools = getEnv("TOOLS")
  if (tools) {
    config.enabledTools = tools.split(",").map((s) => s.trim())
  }

  // Features
  const features = getEnv("FEATURES")
  if (features) {
    config.enabledFeatures = features.split(",").map((s) => s.trim())
  }

  // Boolean flags
  if (getEnv("DYNAMIC_TOOLSETS") === "true") config.dynamicToolsets = true
  if (getEnv("READ_ONLY") === "true") config.readOnly = true
  if (getEnv("ENABLE_COMMAND_LOGGING") === "true") config.enableCommandLogging = true
  if (getEnv("LOCKDOWN_MODE") === "true") config.lockdownMode = true

  // Log file
  const logFile = getEnv("LOG_FILE")
  if (logFile) config.logFilePath = logFile

  // Content window size
  const windowSize = getEnv("CONTENT_WINDOW_SIZE")
  if (windowSize) {
    const size = parseInt(windowSize, 10)
    if (!isNaN(size)) config.contentWindowSize = size
  }

  return config
}

// =============================================================================
// CONFIGURATION MERGING
// =============================================================================

/**
 * Merge multiple configurations (later configs override earlier)
 */
export function mergeConfigs(
  ...configs: Partial<ServerConfig>[]
): ServerConfig {
  return configs.reduce(
    (acc, cfg) => ({ ...acc, ...cfg }),
    DEFAULT_CONFIG
  ) as ServerConfig
}

/**
 * Resolve enabled toolsets based on configuration
 * Returns null for "use defaults", empty array for "none", or explicit list
 */
export function resolveEnabledToolsets(config: ServerConfig): string[] | null {
  let enabledToolsets = config.enabledToolsets

  // In dynamic mode, remove "all" and "default" since users enable on demand
  if (config.dynamicToolsets && enabledToolsets) {
    enabledToolsets = enabledToolsets.filter(
      (t) => t !== "all" && t !== "default"
    )
  }

  if (enabledToolsets !== null) {
    return enabledToolsets
  }

  if (config.dynamicToolsets) {
    // Dynamic mode with no toolsets: start empty
    return []
  }

  if (config.enabledTools.length > 0) {
    // Specific tools but no toolsets: don't use defaults
    return []
  }

  // null means "use defaults"
  return null
}

/**
 * Generate toolsets help text
 */
export function generateToolsetsHelp(
  toolsets: Array<{ id: string; name: string; description?: string }>
): string {
  const lines = ["Available toolsets:"]
  for (const ts of toolsets) {
    lines.push(`  ${ts.id} - ${ts.name}`)
    if (ts.description) {
      lines.push(`      ${ts.description}`)
    }
  }
  return lines.join("\n")
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Known valid toolset IDs
 */
export const VALID_TOOLSETS = [
  "midnight:network",
  "midnight:contract",
  "midnight:dev",
  "midnight:docs",
  "midnight:wallet",
  "nextjs:docs",
  "nextjs:dev",
  "nextjs:migration",
  "all",
  "default",
  "midnight",
  "nextjs",
] as const

export type ValidToolsetId = (typeof VALID_TOOLSETS)[number]

/**
 * Validate toolset names and return suggestions for invalid ones
 */
export function validateToolsets(toolsets: string[]): {
  valid: string[]
  invalid: string[]
  suggestions: Map<string, string[]>
} {
  const valid: string[] = []
  const invalid: string[] = []
  const suggestions = new Map<string, string[]>()

  for (const ts of toolsets) {
    const normalized = ts.toLowerCase().trim()

    if (VALID_TOOLSETS.includes(normalized as ValidToolsetId)) {
      valid.push(normalized)
    } else {
      invalid.push(ts)
      // Find similar toolsets for suggestions
      const similar = VALID_TOOLSETS.filter((v) => {
        const distance = levenshteinDistance(normalized, v)
        return distance <= 3 || v.includes(normalized) || normalized.includes(v.split(":")[1] ?? v)
      })
      if (similar.length > 0) {
        suggestions.set(ts, similar as string[])
      }
    }
  }

  return { valid, invalid, suggestions }
}

/**
 * Simple Levenshtein distance for suggestions
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Validate CLI configuration
 */
export function validateCliConfig(config: ServerConfig): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Toolset validation
  if (config.enabledToolsets) {
    const { invalid, suggestions } = validateToolsets(config.enabledToolsets)
    for (const ts of invalid) {
      const similar = suggestions.get(ts)
      if (similar && similar.length > 0) {
        errors.push(`Unknown toolset '${ts}'. Did you mean: ${similar.join(", ")}?`)
      } else {
        errors.push(`Unknown toolset '${ts}'. Run with --help for available toolsets.`)
      }
    }
  }

  // Content window size validation
  if (config.contentWindowSize < 100) {
    errors.push("Content window size must be at least 100")
  }
  if (config.contentWindowSize > 100000) {
    warnings.push("Content window size is very large, may cause performance issues")
  }

  // Polling interval validation
  if (config.enableVersionPolling && config.versionPollingInterval < 60000) {
    warnings.push("Version polling interval is less than 1 minute")
  }

  // Conflicting options
  if (config.dynamicToolsets && config.enabledToolsets && config.enabledToolsets.includes("all")) {
    warnings.push("'all' toolset with dynamic-toolsets may cause issues")
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
