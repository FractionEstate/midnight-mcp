/**
 * Documentation CLI Commands
 *
 * CLI commands for managing documentation sync, updates, and cache.
 */

import { parseArgs } from "util"
import {
  syncAllDocs,
  checkForUpdates,
  getCacheStats,
  clearDocsCache,
  getDocSources,
  getDocContent,
  searchDocs,
  DOC_SOURCES,
} from "../providers/docs-sync.js"
import {
  loadMetadata,
  saveMetadata,
  getSyncStatus,
  getUpdateHistory,
  getStaleSources,
  syncWithMetadata,
  clearMetadata,
} from "../providers/docs-metadata.js"
import {
  startGlobalScheduler,
  stopGlobalScheduler,
  getGlobalScheduler,
  syncDocsOnce,
  hasUpdatesAvailable,
  getTimeUntilNextCheck,
} from "../providers/docs-scheduler.js"

// =============================================================================
// TYPES
// =============================================================================

export type DocsCommand =
  | "sync"
  | "check"
  | "status"
  | "search"
  | "list"
  | "clear"
  | "schedule"
  | "history"
  | "help"

export interface DocsCommandResult {
  success: boolean
  message: string
  data?: unknown
}

// =============================================================================
// COMMAND HANDLERS
// =============================================================================

/**
 * Sync all documentation
 */
export async function cmdSync(options: {
  force?: boolean
  category?: string
  verbose?: boolean
}): Promise<DocsCommandResult> {
  try {
    console.log("🔄 Syncing documentation from Midnight docs repository...")

    const categories = options.category
      ? [options.category as "compact" | "sdk" | "network" | "tutorial" | "api" | "general"]
      : undefined

    const result = await syncWithMetadata({ force: options.force })

    if (result.hasUpdates) {
      console.log(`✅ Documentation synced successfully!`)
      console.log(`   Updated: ${result.updatedSources.length} sources`)
      console.log(`   New: ${result.newSources.length} sources`)

      if (options.verbose) {
        if (result.updatedSources.length > 0) {
          console.log("\n   Updated sources:")
          for (const id of result.updatedSources) {
            console.log(`     - ${id}`)
          }
        }
        if (result.newSources.length > 0) {
          console.log("\n   New sources:")
          for (const id of result.newSources) {
            console.log(`     - ${id}`)
          }
        }
      }
    } else {
      console.log("✅ Documentation is up to date!")
    }

    return {
      success: true,
      message: result.hasUpdates
        ? `Synced ${result.updatedSources.length + result.newSources.length} sources`
        : "Already up to date",
      data: result,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`❌ Sync failed: ${message}`)
    return {
      success: false,
      message: `Sync failed: ${message}`,
    }
  }
}

/**
 * Check for documentation updates without downloading
 */
export async function cmdCheck(): Promise<DocsCommandResult> {
  try {
    console.log("🔍 Checking for documentation updates...")

    const hasUpdates = await hasUpdatesAvailable()
    const updateInfo = await checkForUpdates()

    if (hasUpdates) {
      console.log("📥 Updates available!")
      if (updateInfo.staleSources.length > 0) {
        console.log(`\n   Stale sources (${updateInfo.staleSources.length}):`)
        for (const id of updateInfo.staleSources.slice(0, 10)) {
          console.log(`     - ${id}`)
        }
        if (updateInfo.staleSources.length > 10) {
          console.log(`     ... and ${updateInfo.staleSources.length - 10} more`)
        }
      }
      console.log("\n   Run 'docs sync' to update.")
    } else {
      console.log("✅ Documentation is up to date!")
    }

    return {
      success: true,
      message: hasUpdates ? "Updates available" : "Up to date",
      data: updateInfo,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`❌ Check failed: ${message}`)
    return {
      success: false,
      message: `Check failed: ${message}`,
    }
  }
}

/**
 * Show documentation status
 */
export async function cmdStatus(): Promise<DocsCommandResult> {
  try {
    const syncStatus = getSyncStatus()
    const cacheStats = getCacheStats()
    const staleSources = getStaleSources()
    const nextCheck = getTimeUntilNextCheck()

    console.log("📊 Documentation Status")
    console.log("========================")
    console.log(`\nRepository SHA: ${syncStatus.repoSha || "Not synced"}`)
    console.log(`Total sources: ${DOC_SOURCES.length}`)
    console.log(`Cached sources: ${cacheStats.cachedSources}`)
    console.log(`Tracked sources: ${syncStatus.trackedSources}`)

    if (syncStatus.lastCheck > 0) {
      const lastCheckAgo = Math.round((Date.now() - syncStatus.lastCheck) / 1000 / 60)
      console.log(`\nLast check: ${lastCheckAgo} minutes ago`)
    } else {
      console.log(`\nLast check: Never`)
    }

    if (syncStatus.lastUpdate > 0) {
      const lastUpdateAgo = Math.round((Date.now() - syncStatus.lastUpdate) / 1000 / 60)
      console.log(`Last update: ${lastUpdateAgo} minutes ago`)
    }

    if (nextCheck !== null) {
      const nextCheckMins = Math.round(nextCheck / 1000 / 60)
      console.log(`Next scheduled check: in ${nextCheckMins} minutes`)
    }

    if (staleSources.length > 0) {
      console.log(`\n⚠️  Stale sources: ${staleSources.length}`)
    }

    if (Object.keys(cacheStats.errors).length > 0) {
      console.log(`\n❌ Errors: ${Object.keys(cacheStats.errors).length}`)
      for (const [id, error] of Object.entries(cacheStats.errors)) {
        console.log(`   ${id}: ${error}`)
      }
    }

    return {
      success: true,
      message: "Status retrieved",
      data: { syncStatus, cacheStats, staleSources },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`❌ Failed to get status: ${message}`)
    return {
      success: false,
      message: `Failed to get status: ${message}`,
    }
  }
}

/**
 * Search documentation content
 */
export async function cmdSearch(
  query: string,
  options: {
    category?: string
    limit?: number
  }
): Promise<DocsCommandResult> {
  try {
    if (!query) {
      console.log("Usage: docs search <query> [--category <cat>] [--limit <n>]")
      return {
        success: false,
        message: "No query provided",
      }
    }

    console.log(`🔍 Searching for "${query}"...`)

    const categories = options.category
      ? [options.category as "compact" | "sdk" | "network" | "tutorial" | "api" | "general"]
      : undefined

    const results = searchDocs(query, {
      categories,
      limit: options.limit || 10,
    })

    if (results.length === 0) {
      console.log("\nNo results found.")
      return {
        success: true,
        message: "No results",
        data: [],
      }
    }

    console.log(`\nFound ${results.length} matches:\n`)

    for (const result of results) {
      console.log(`📄 ${result.source.description} (${result.source.id})`)
      console.log(`   Category: ${result.source.category}`)
      console.log(`   Matches: ${result.matches.length}`)
      if (result.matches[0]) {
        const preview = result.matches[0].context.slice(0, 150).replace(/\n/g, " ")
        console.log(`   Preview: "${preview}..."`)
      }
      console.log("")
    }

    return {
      success: true,
      message: `Found ${results.length} matches`,
      data: results,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`❌ Search failed: ${message}`)
    return {
      success: false,
      message: `Search failed: ${message}`,
    }
  }
}

/**
 * List documentation sources
 */
export async function cmdList(options: {
  category?: string
  verbose?: boolean
}): Promise<DocsCommandResult> {
  const sources = DOC_SOURCES.filter(
    (s) => !options.category || s.category === options.category
  )

  console.log(`📚 Documentation Sources (${sources.length})\n`)

  // Group by category
  const byCategory = new Map<string, typeof sources>()
  for (const source of sources) {
    const cat = source.category
    if (!byCategory.has(cat)) {
      byCategory.set(cat, [])
    }
    byCategory.get(cat)!.push(source)
  }

  for (const [category, catSources] of byCategory) {
    console.log(`\n${category.toUpperCase()} (${catSources.length})`)
    console.log("─".repeat(40))

    for (const source of catSources) {
      const cached = getDocContent(source.id)
      const status = cached ? "✅" : "⏳"
      console.log(`${status} ${source.id}`)
      if (options.verbose) {
        console.log(`   Path: ${source.path}`)
        console.log(`   Description: ${source.description}`)
        if (cached) {
          const age = Math.round(
            (Date.now() - cached.metadata.lastFetched) / 1000 / 60
          )
          console.log(`   Cached: ${age} min ago`)
        }
      }
    }
  }

  return {
    success: true,
    message: `Listed ${sources.length} sources`,
    data: sources,
  }
}

/**
 * Clear documentation cache
 */
export async function cmdClear(options: {
  metadata?: boolean
}): Promise<DocsCommandResult> {
  try {
    console.log("🗑️  Clearing documentation cache...")

    clearDocsCache()

    if (options.metadata) {
      clearMetadata()
      console.log("   Cleared metadata as well.")
    }

    console.log("✅ Cache cleared!")

    return {
      success: true,
      message: "Cache cleared",
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`❌ Clear failed: ${message}`)
    return {
      success: false,
      message: `Clear failed: ${message}`,
    }
  }
}

/**
 * Manage documentation update scheduler
 */
export async function cmdSchedule(
  action: "start" | "stop" | "status"
): Promise<DocsCommandResult> {
  try {
    switch (action) {
      case "start": {
        console.log("▶️  Starting documentation update scheduler...")
        startGlobalScheduler({
          checkInterval: 60 * 60 * 1000, // 1 hour
          autoStart: true,
        })
        console.log("✅ Scheduler started!")
        return {
          success: true,
          message: "Scheduler started",
        }
      }

      case "stop": {
        console.log("⏹️  Stopping documentation update scheduler...")
        stopGlobalScheduler()
        console.log("✅ Scheduler stopped!")
        return {
          success: true,
          message: "Scheduler stopped",
        }
      }

      case "status": {
        const scheduler = getGlobalScheduler()
        const state = scheduler.getState()

        console.log("📊 Scheduler Status")
        console.log("===================")
        console.log(`Running: ${state.isRunning ? "Yes" : "No"}`)
        console.log(`Total checks: ${state.totalChecks}`)
        console.log(`Total updates: ${state.totalUpdates}`)
        console.log(`Consecutive failures: ${state.consecutiveFailures}`)

        if (state.lastCheckTime > 0) {
          const lastCheck = Math.round(
            (Date.now() - state.lastCheckTime) / 1000 / 60
          )
          console.log(`Last check: ${lastCheck} min ago`)
        }

        if (state.isRunning && state.nextCheckTime > 0) {
          const nextCheck = Math.round(
            (state.nextCheckTime - Date.now()) / 1000 / 60
          )
          console.log(`Next check: in ${nextCheck} min`)
        }

        if (state.lastError) {
          console.log(`\n❌ Last error: ${state.lastError}`)
        }

        return {
          success: true,
          message: "Status retrieved",
          data: state,
        }
      }

      default:
        return {
          success: false,
          message: `Unknown action: ${action}`,
        }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`❌ Schedule command failed: ${message}`)
    return {
      success: false,
      message: `Schedule command failed: ${message}`,
    }
  }
}

/**
 * Show update history
 */
export async function cmdHistory(options: {
  limit?: number
  type?: "created" | "updated" | "deleted"
}): Promise<DocsCommandResult> {
  try {
    const history = getUpdateHistory({
      type: options.type,
      limit: options.limit || 20,
    })

    if (history.length === 0) {
      console.log("📜 No update history available.")
      return {
        success: true,
        message: "No history",
        data: [],
      }
    }

    console.log(`📜 Update History (${history.length} entries)\n`)

    for (const record of history) {
      const date = new Date(record.timestamp).toLocaleString()
      const typeEmoji =
        record.type === "created" ? "🆕" : record.type === "updated" ? "🔄" : "🗑️"

      console.log(`${typeEmoji} ${record.sourceId}`)
      console.log(`   Date: ${date}`)
      console.log(`   Type: ${record.type}`)
      if (record.newSha) {
        console.log(`   SHA: ${record.newSha.slice(0, 8)}...`)
      }
      console.log("")
    }

    return {
      success: true,
      message: `Retrieved ${history.length} history entries`,
      data: history,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`❌ History command failed: ${message}`)
    return {
      success: false,
      message: `History command failed: ${message}`,
    }
  }
}

/**
 * Show help for documentation commands
 */
export function cmdHelp(): DocsCommandResult {
  console.log(`
📚 Documentation Management Commands
=====================================

Commands:
  sync [--force] [--category <cat>] [--verbose]
    Sync documentation from the Midnight docs repository.
    --force     Force re-download even if cached
    --category  Only sync specific category (compact, sdk, network, tutorial, api, general)
    --verbose   Show detailed output

  check
    Check if documentation updates are available without downloading.

  status
    Show current documentation sync status and cache statistics.

  search <query> [--category <cat>] [--limit <n>]
    Search documentation content.
    --category  Limit search to specific category
    --limit     Maximum number of results (default: 10)

  list [--category <cat>] [--verbose]
    List all documentation sources.
    --category  Filter by category
    --verbose   Show additional details

  clear [--metadata]
    Clear documentation cache.
    --metadata  Also clear persistent metadata

  schedule <start|stop|status>
    Manage automatic update scheduler.
    start   Start the scheduler
    stop    Stop the scheduler
    status  Show scheduler status

  history [--limit <n>] [--type <type>]
    Show documentation update history.
    --limit  Maximum entries to show (default: 20)
    --type   Filter by type (created, updated, deleted)

  help
    Show this help message.

Categories:
  - compact   Compact language documentation
  - sdk       Midnight SDK documentation
  - network   Network and architecture docs
  - tutorial  Tutorials and guides
  - api       API reference
  - general   General documentation

Examples:
  docs sync --force
  docs search "circuit" --category compact
  docs list --verbose
  docs schedule start
  docs history --limit 10 --type updated
`)

  return {
    success: true,
    message: "Help displayed",
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Execute a documentation CLI command
 */
export async function executeDocsCommand(
  args: string[]
): Promise<DocsCommandResult> {
  const command = args[0] as DocsCommand | undefined

  if (!command || command === "help") {
    return cmdHelp()
  }

  // Parse options
  const { values, positionals } = parseArgs({
    args: args.slice(1),
    options: {
      force: { type: "boolean" },
      verbose: { type: "boolean" },
      category: { type: "string" },
      limit: { type: "string" },
      metadata: { type: "boolean" },
      type: { type: "string" },
    },
    allowPositionals: true,
    strict: false,
  })

  switch (command) {
    case "sync":
      return cmdSync({
        force: values.force === true,
        category: values.category as string | undefined,
        verbose: values.verbose === true,
      })

    case "check":
      return cmdCheck()

    case "status":
      return cmdStatus()

    case "search":
      return cmdSearch(positionals[0] || "", {
        category: values.category as string | undefined,
        limit: values.limit ? parseInt(values.limit as string, 10) : undefined,
      })

    case "list":
      return cmdList({
        category: values.category as string | undefined,
        verbose: values.verbose === true,
      })

    case "clear":
      return cmdClear({
        metadata: values.metadata === true,
      })

    case "schedule":
      return cmdSchedule(positionals[0] as "start" | "stop" | "status")

    case "history":
      return cmdHistory({
        limit: values.limit ? parseInt(values.limit as string, 10) : undefined,
        type: values.type as "created" | "updated" | "deleted" | undefined,
      })

    default:
      console.error(`Unknown command: ${command}`)
      return cmdHelp()
  }
}
