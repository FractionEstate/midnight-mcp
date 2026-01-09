/**
 * Midnight Version Manager
 *
 * Centralized version tracking with auto-polling from npm registry.
 * Supports stable and alpha/beta version channels with fallback logic.
 */

import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

// =============================================================================
// STABLE VERSIONS - Known working versions from npm (fallback)
// =============================================================================

export const STABLE_VERSIONS: Record<string, string> = {
  // Core Midnight JS SDK (v2.1.0 family - Dec 2025)
  "@midnight-ntwrk/midnight-js-contracts": "2.1.0",
  "@midnight-ntwrk/midnight-js-types": "2.1.0",
  "@midnight-ntwrk/midnight-js-utils": "2.1.0",
  "@midnight-ntwrk/midnight-js-network-id": "2.1.0",
  "@midnight-ntwrk/midnight-js-level-private-state-provider": "2.1.0",
  "@midnight-ntwrk/midnight-js-http-client-proof-provider": "2.1.0",
  "@midnight-ntwrk/midnight-js-indexer-public-data-provider": "2.1.0",
  "@midnight-ntwrk/midnight-js-fetch-zk-config-provider": "2.1.0",
  "@midnight-ntwrk/midnight-js-node-zk-config-provider": "2.1.0",
  "@midnight-ntwrk/midnight-js-logger-provider": "2.1.0",
  "@midnight-ntwrk/midnight-js-testing": "2.0.2",

  // Runtime & Compiler
  "@midnight-ntwrk/compact-runtime": "0.9.0",
  "@midnight-ntwrk/compact-js": "2.3.0",
  "@midnight-ntwrk/onchain-runtime": "0.3.0",

  // Ledger & Blockchain
  "@midnight-ntwrk/ledger": "4.0.0",
  "@midnight-ntwrk/zswap": "4.0.0",

  // Wallet (v5.0.0 family - May 2025)
  "@midnight-ntwrk/wallet": "5.0.0",
  "@midnight-ntwrk/wallet-api": "5.0.0",
  "@midnight-ntwrk/wallet-sdk-capabilities": "2.0.0",
  "@midnight-ntwrk/wallet-sdk-address-format": "2.0.0",
  "@midnight-ntwrk/wallet-sdk-hd": "2.0.0",

  // DApp Integration
  "@midnight-ntwrk/dapp-connector-api": "3.0.0",
  "@midnight-ntwrk/platform-js": "2.1.0",
}

// =============================================================================
// ALPHA/BETA VERSIONS - Latest pre-release versions
// =============================================================================

export const ALPHA_VERSIONS: Record<string, string> = {
  // Ledger v6/v7 (release candidates and alpha)
  "@midnight-ntwrk/ledger-v6": "6.2.0-rc.3",
  "@midnight-ntwrk/ledger-v7": "7.0.0-alpha.1",

  // Onchain runtime v1/v2
  "@midnight-ntwrk/onchain-runtime-v1": "1.0.0-rc.3",
  "@midnight-ntwrk/onchain-runtime-v2": "2.0.0-alpha.1",

  // ZK IR v2
  "@midnight-ntwrk/zkir-v2": "2.0.0-rc.3",

  // Wallet SDK beta components
  "@midnight-ntwrk/wallet-sdk-facade": "1.0.0-beta.13",
  "@midnight-ntwrk/wallet-sdk-abstractions": "1.0.0-beta.9",
  "@midnight-ntwrk/wallet-sdk-utilities": "1.0.0-beta.7",
  "@midnight-ntwrk/wallet-sdk-indexer-client": "1.0.0-beta.14",
  "@midnight-ntwrk/wallet-sdk-shielded": "1.0.0-beta.11",
  "@midnight-ntwrk/wallet-sdk-unshielded-wallet": "1.0.0-beta.14",
  "@midnight-ntwrk/wallet-sdk-unshielded-state": "1.0.0-beta.10",
  "@midnight-ntwrk/wallet-sdk-dust-wallet": "1.0.0-beta.12",
  "@midnight-ntwrk/wallet-sdk-runtime": "1.0.0-beta.9",
  "@midnight-ntwrk/wallet-sdk-prover-client": "1.0.0-beta.11",
  "@midnight-ntwrk/wallet-sdk-node-client": "1.0.0-beta.10",
}

// =============================================================================
// VERSION CACHE
// =============================================================================

interface VersionCache {
  versions: Record<string, string>
  lastUpdated: number
  errors: Record<string, string>
}

let versionCache: VersionCache = {
  versions: {},
  lastUpdated: 0,
  errors: {},
}

// Cache TTL: 24 hours by default
const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000

// Polling interval for background updates
let pollingInterval: NodeJS.Timeout | null = null

// =============================================================================
// NPM REGISTRY QUERIES
// =============================================================================

/**
 * Fetch latest version of a package from npm registry
 */
export async function fetchLatestVersion(
  packageName: string,
  tag: "latest" | "alpha" | "beta" | "rc" = "latest"
): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `npm view ${packageName}@${tag} version 2>/dev/null`,
      { timeout: 10000 }
    )
    return stdout.trim() || null
  } catch {
    // Package might not exist or have that tag
    return null
  }
}

/**
 * Fetch all available versions of a package
 */
export async function fetchAllVersions(packageName: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync(
      `npm view ${packageName} versions --json 2>/dev/null`,
      { timeout: 10000 }
    )
    const versions = JSON.parse(stdout)
    return Array.isArray(versions) ? versions : [versions]
  } catch {
    return []
  }
}

/**
 * Fetch latest versions for all known Midnight packages
 */
export async function fetchAllLatestVersions(): Promise<Record<string, string>> {
  const packages = [
    ...Object.keys(STABLE_VERSIONS),
    ...Object.keys(ALPHA_VERSIONS),
  ]

  const results: Record<string, string> = {}
  const errors: Record<string, string> = {}

  // Batch queries in parallel (limit concurrency to avoid rate limiting)
  const batchSize = 10
  for (let i = 0; i < packages.length; i += batchSize) {
    const batch = packages.slice(i, i + batchSize)
    const promises = batch.map(async (pkg) => {
      const version = await fetchLatestVersion(pkg)
      if (version) {
        results[pkg] = version
      } else {
        errors[pkg] = "Failed to fetch"
      }
    })
    await Promise.all(promises)
  }

  // Update cache
  versionCache = {
    versions: results,
    lastUpdated: Date.now(),
    errors,
  }

  return results
}

// =============================================================================
// VERSION GETTERS
// =============================================================================

export interface VersionOptions {
  /** Use alpha/beta versions when available */
  alpha?: boolean
  /** Force refresh from npm (ignore cache) */
  forceRefresh?: boolean
  /** Custom cache TTL in milliseconds */
  cacheTTL?: number
}

/**
 * Get version for a package with fallback logic
 *
 * Priority:
 * 1. Cached npm version (if fresh)
 * 2. Alpha version (if alpha flag enabled)
 * 3. Stable version (fallback)
 */
export function getVersion(
  packageName: string,
  options: VersionOptions = {}
): string {
  const { alpha = false, cacheTTL = DEFAULT_CACHE_TTL } = options

  // Check cache first
  const cacheAge = Date.now() - versionCache.lastUpdated
  if (cacheAge < cacheTTL && versionCache.versions[packageName]) {
    return versionCache.versions[packageName]
  }

  // Use alpha version if requested and available
  if (alpha && ALPHA_VERSIONS[packageName]) {
    return ALPHA_VERSIONS[packageName]
  }

  // Fallback to stable
  return STABLE_VERSIONS[packageName] || ALPHA_VERSIONS[packageName] || "latest"
}

/**
 * Get all versions for scaffold project dependencies
 */
export function getScaffoldVersions(options: VersionOptions = {}): Record<string, string> {
  return {
    "@midnight-ntwrk/midnight-js-contracts": `^${getVersion("@midnight-ntwrk/midnight-js-contracts", options)}`,
    "@midnight-ntwrk/midnight-js-types": `^${getVersion("@midnight-ntwrk/midnight-js-types", options)}`,
    "@midnight-ntwrk/midnight-js-utils": `^${getVersion("@midnight-ntwrk/midnight-js-utils", options)}`,
    "@midnight-ntwrk/midnight-js-network-id": `^${getVersion("@midnight-ntwrk/midnight-js-network-id", options)}`,
    "@midnight-ntwrk/midnight-js-http-client-proof-provider": `^${getVersion("@midnight-ntwrk/midnight-js-http-client-proof-provider", options)}`,
    "@midnight-ntwrk/midnight-js-indexer-public-data-provider": `^${getVersion("@midnight-ntwrk/midnight-js-indexer-public-data-provider", options)}`,
    "@midnight-ntwrk/midnight-js-level-private-state-provider": `^${getVersion("@midnight-ntwrk/midnight-js-level-private-state-provider", options)}`,
    "@midnight-ntwrk/compact-runtime": `^${getVersion("@midnight-ntwrk/compact-runtime", options)}`,
    "@midnight-ntwrk/ledger": `^${getVersion("@midnight-ntwrk/ledger", options)}`,
  }
}

/**
 * Get wallet integration dependencies
 */
export function getWalletVersions(options: VersionOptions = {}): Record<string, string> {
  return {
    "@midnight-ntwrk/wallet": `^${getVersion("@midnight-ntwrk/wallet", options)}`,
    "@midnight-ntwrk/wallet-api": `^${getVersion("@midnight-ntwrk/wallet-api", options)}`,
    "@midnight-ntwrk/dapp-connector-api": `^${getVersion("@midnight-ntwrk/dapp-connector-api", options)}`,
  }
}

// =============================================================================
// VERSION COMPARISON
// =============================================================================

export interface VersionDiff {
  package: string
  current: string
  latest: string
  isOutdated: boolean
  isAlpha: boolean
}

/**
 * Compare installed versions against latest npm versions
 */
export async function compareVersions(
  installed: Record<string, string>
): Promise<VersionDiff[]> {
  const diffs: VersionDiff[] = []

  for (const [pkg, currentVersion] of Object.entries(installed)) {
    // Strip ^ or ~ prefix
    const current = currentVersion.replace(/^[\^~]/, "")
    const latest = await fetchLatestVersion(pkg)

    if (latest) {
      const isAlpha = latest.includes("alpha") || latest.includes("beta") || latest.includes("rc")
      diffs.push({
        package: pkg,
        current,
        latest,
        isOutdated: current !== latest,
        isAlpha,
      })
    }
  }

  return diffs
}

// =============================================================================
// AUTO-POLLING
// =============================================================================

export interface PollingConfig {
  /** Polling interval in milliseconds (default: 24 hours) */
  interval?: number
  /** Callback when new versions are detected */
  onUpdate?: (updates: VersionDiff[]) => void
  /** Callback on polling error */
  onError?: (error: Error) => void
}

/**
 * Start background polling for version updates
 */
export function startPolling(config: PollingConfig = {}): void {
  const {
    interval = DEFAULT_CACHE_TTL,
    onUpdate,
    onError,
  } = config

  // Stop any existing polling
  stopPolling()

  const poll = async () => {
    try {
      const oldVersions = { ...versionCache.versions }
      await fetchAllLatestVersions()

      // Check for updates
      if (onUpdate) {
        const updates: VersionDiff[] = []
        for (const [pkg, newVersion] of Object.entries(versionCache.versions)) {
          const oldVersion = oldVersions[pkg]
          if (oldVersion && oldVersion !== newVersion) {
            updates.push({
              package: pkg,
              current: oldVersion,
              latest: newVersion,
              isOutdated: true,
              isAlpha: newVersion.includes("alpha") || newVersion.includes("beta"),
            })
          }
        }
        if (updates.length > 0) {
          onUpdate(updates)
        }
      }
    } catch (error) {
      if (onError) {
        onError(error as Error)
      }
    }
  }

  // Initial poll
  poll()

  // Schedule recurring polls
  pollingInterval = setInterval(poll, interval)
}

/**
 * Stop background polling
 */
export function stopPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

/**
 * Get cache status
 */
export function getCacheStatus(): {
  lastUpdated: Date | null
  packageCount: number
  errorCount: number
  isPolling: boolean
} {
  return {
    lastUpdated: versionCache.lastUpdated ? new Date(versionCache.lastUpdated) : null,
    packageCount: Object.keys(versionCache.versions).length,
    errorCount: Object.keys(versionCache.errors).length,
    isPolling: pollingInterval !== null,
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  STABLE_VERSIONS,
  ALPHA_VERSIONS,
  getVersion,
  getScaffoldVersions,
  getWalletVersions,
  fetchLatestVersion,
  fetchAllVersions,
  fetchAllLatestVersions,
  compareVersions,
  startPolling,
  stopPolling,
  getCacheStatus,
}
