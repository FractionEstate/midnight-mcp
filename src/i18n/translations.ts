/**
 * Translation System
 *
 * Provides localizable strings for tool descriptions and messages.
 * Based on GitHub MCP server patterns.
 */

import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"

// =============================================================================
// TYPES
// =============================================================================

export type TranslationHelper = (key: string, defaultValue: string) => string

export interface TranslationConfig {
  /** Path to the config file (default: ./midnight-mcp-config.json) */
  configPath?: string
  /** Environment variable prefix (default: MIDNIGHT_MCP_) */
  envPrefix?: string
}

// =============================================================================
// SINGLETON STATE
// =============================================================================

let translationKeyMap: Map<string, string> = new Map()
let configLoaded = false
let configPath = "midnight-mcp-config.json"
let envPrefix = "MIDNIGHT_MCP_"

// =============================================================================
// TRANSLATION HELPER
// =============================================================================

/**
 * Null translation helper that always returns the default value
 */
export function nullTranslationHelper(_key: string, defaultValue: string): string {
  return defaultValue
}

/**
 * Initialize the translation system and return the helper function
 */
export function initTranslations(config?: TranslationConfig): {
  t: TranslationHelper
  dump: () => void
} {
  if (config?.configPath) {
    configPath = config.configPath
  }
  if (config?.envPrefix) {
    envPrefix = config.envPrefix
  }

  // Load config file if it exists
  if (!configLoaded && existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, "utf-8")
      const parsed = JSON.parse(content)
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string") {
          translationKeyMap.set(key.toUpperCase(), value)
        }
      }
      configLoaded = true
    } catch (error) {
      console.error(`Could not read translation config: ${error}`)
    }
  }

  const t: TranslationHelper = (key: string, defaultValue: string): string => {
    const normalizedKey = key.toUpperCase()

    // Check cache first
    if (translationKeyMap.has(normalizedKey)) {
      return translationKeyMap.get(normalizedKey)!
    }

    // Check environment variable
    const envVar = envPrefix + normalizedKey
    const envValue = process.env[envVar]
    if (envValue !== undefined) {
      translationKeyMap.set(normalizedKey, envValue)
      return envValue
    }

    // Use default value
    translationKeyMap.set(normalizedKey, defaultValue)
    return defaultValue
  }

  const dump = (): void => {
    try {
      const obj: Record<string, string> = {}
      for (const [key, value] of translationKeyMap) {
        obj[key] = value
      }
      writeFileSync(configPath, JSON.stringify(obj, null, 2))
    } catch (error) {
      console.error(`Could not dump translation key map: ${error}`)
    }
  }

  return { t, dump }
}

// =============================================================================
// TOOL DESCRIPTION KEYS
// =============================================================================

/**
 * Standard translation keys for tools
 */
export const ToolKeys = {
  // Midnight tools
  MIDNIGHT_INIT_NAME: "midnight_init",
  MIDNIGHT_INIT_DESCRIPTION: "Initialize or connect to a Midnight Network wallet",

  MIDNIGHT_NETWORK_STATUS_NAME: "midnight_network_status",
  MIDNIGHT_NETWORK_STATUS_DESCRIPTION: "Check the health status of Midnight Network services",

  MIDNIGHT_GET_BALANCE_NAME: "midnight_get_balance",
  MIDNIGHT_GET_BALANCE_DESCRIPTION: "Get the token balance for a Midnight address",

  MIDNIGHT_GET_BLOCK_NAME: "midnight_get_block",
  MIDNIGHT_GET_BLOCK_DESCRIPTION: "Get block information by height or hash",

  MIDNIGHT_GET_TRANSACTION_NAME: "midnight_get_transaction",
  MIDNIGHT_GET_TRANSACTION_DESCRIPTION: "Get transaction details by ID",

  MIDNIGHT_SEARCH_DOCS_NAME: "midnight_search_docs",
  MIDNIGHT_SEARCH_DOCS_DESCRIPTION: "Search the Midnight documentation",

  MIDNIGHT_SCAFFOLD_PROJECT_NAME: "midnight_scaffold_project",
  MIDNIGHT_SCAFFOLD_PROJECT_DESCRIPTION: "Scaffold a new Midnight dApp project",

  MIDNIGHT_COMPILE_CONTRACT_NAME: "midnight_compile_contract",
  MIDNIGHT_COMPILE_CONTRACT_DESCRIPTION: "Compile a Compact smart contract",

  MIDNIGHT_ANALYZE_CONTRACT_NAME: "midnight_analyze_contract",
  MIDNIGHT_ANALYZE_CONTRACT_DESCRIPTION: "Analyze a Compact contract for issues",

  MIDNIGHT_CHECK_VERSIONS_NAME: "midnight_check_versions",
  MIDNIGHT_CHECK_VERSIONS_DESCRIPTION: "Check for Midnight SDK updates",

  // NextJS tools
  NEXTJS_INIT_NAME: "nextjs_init",
  NEXTJS_INIT_DESCRIPTION: "Initialize NextJS DevTools integration",

  NEXTJS_INDEX_NAME: "nextjs_index",
  NEXTJS_INDEX_DESCRIPTION: "Discover running Next.js servers",

  NEXTJS_CALL_NAME: "nextjs_call",
  NEXTJS_CALL_DESCRIPTION: "Call a Next.js DevTools endpoint",

  NEXTJS_DOCS_NAME: "nextjs_docs",
  NEXTJS_DOCS_DESCRIPTION: "Search Next.js documentation",

  BROWSER_EVAL_NAME: "browser_eval",
  BROWSER_EVAL_DESCRIPTION: "Evaluate code in a browser context",

  ENABLE_CACHE_COMPONENTS_NAME: "enable_cache_components",
  ENABLE_CACHE_COMPONENTS_DESCRIPTION: "Enable Cache Components mode",

  UPGRADE_NEXTJS_16_NAME: "upgrade_nextjs_16",
  UPGRADE_NEXTJS_16_DESCRIPTION: "Upgrade to Next.js 16",
} as const

/**
 * Standard error messages
 */
export const ErrorKeys = {
  NETWORK_ERROR: "A network error occurred",
  VALIDATION_ERROR: "Validation failed",
  CONTRACT_ERROR: "Contract error",
  COMPILATION_ERROR: "Compilation failed",
  DEPLOYMENT_ERROR: "Deployment failed",
  AUTHENTICATION_ERROR: "Authentication required",
  RATE_LIMIT_ERROR: "Rate limit exceeded",
} as const

/**
 * Standard success messages
 */
export const SuccessKeys = {
  TOOL_COMPLETED: "Tool completed successfully",
  CONTRACT_COMPILED: "Contract compiled successfully",
  CONTRACT_DEPLOYED: "Contract deployed successfully",
  WALLET_CONNECTED: "Wallet connected",
  PROJECT_CREATED: "Project created successfully",
} as const
