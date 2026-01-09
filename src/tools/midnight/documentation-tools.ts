/**
 * Documentation Tools
 *
 * MCP tools for accessing and managing Midnight documentation
 * with real-time sync from the official repository.
 */

import { z } from "zod"
import {
  getDocContent,
  searchDocs,
  DOC_SOURCES,
  checkForUpdates,
  syncAllDocs,
} from "../../providers/docs-sync.js"
import { getSyncStatus, syncWithMetadata } from "../../providers/docs-metadata.js"
import { loadDynamicResource, getAllDynamicResources } from "../../resources/dynamic-loader.js"

// =============================================================================
// TOOL: midnight-search-docs
// =============================================================================

export const searchDocsSchema = z.object({
  query: z.string().describe("Search query to find relevant documentation"),
  category: z
    .enum(["compact", "sdk", "network", "tutorial", "api", "general", "all"])
    .optional()
    .describe("Filter by documentation category (default: all)"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .describe("Maximum number of results to return (default: 10)"),
})

export type SearchDocsInput = z.infer<typeof searchDocsSchema>

export async function searchDocsHandler(input: SearchDocsInput): Promise<string> {
  const { query, category, limit = 10 } = input

  const categories =
    category && category !== "all"
      ? [category as "compact" | "sdk" | "network" | "tutorial" | "api" | "general"]
      : undefined

  const results = searchDocs(query, { categories, limit })

  if (results.length === 0) {
    // Try to sync first if no results
    const updateInfo = await checkForUpdates()
    if (updateInfo.needsUpdate) {
      await syncWithMetadata({ force: false })
      // Retry search
      const retryResults = searchDocs(query, { categories, limit })
      if (retryResults.length > 0) {
        return formatSearchResults(retryResults)
      }
    }

    return `No documentation found for "${query}". The documentation may not be cached yet - try using the midnight-sync-docs tool first.`
  }

  return formatSearchResults(results)
}

function formatSearchResults(
  results: ReturnType<typeof searchDocs>
): string {
  const lines: string[] = [
    `Found ${results.length} match${results.length === 1 ? "" : "es"}:\n`,
  ]

  for (const result of results) {
    lines.push(`## ${result.source.description}`)
    lines.push(`**Source ID:** \`${result.source.id}\``)
    lines.push(`**Category:** ${result.source.category}`)
    lines.push(`**Matches:** ${result.matches.length}\n`)

    // Show first few matches with context
    for (const match of result.matches.slice(0, 3)) {
      lines.push(`> Line ${match.line}:`)
      lines.push("```")
      lines.push(match.context.slice(0, 300))
      lines.push("```\n")
    }

    if (result.matches.length > 3) {
      lines.push(`_... and ${result.matches.length - 3} more matches_\n`)
    }
  }

  return lines.join("\n")
}

// =============================================================================
// TOOL: midnight-fetch-docs
// =============================================================================

export const fetchDocsSchema = z.object({
  path: z
    .string()
    .describe("Documentation resource path (e.g., 'compact/reference', 'sdk/overview')"),
  extractSection: z
    .string()
    .optional()
    .describe("Extract only a specific section by heading text"),
})

export type FetchDocsInput = z.infer<typeof fetchDocsSchema>

export async function fetchDocsHandler(input: FetchDocsInput): Promise<string> {
  const { path, extractSection } = input

  // Map path to resource URI
  const uri = path.startsWith("midnight://") ? path : `midnight://${path}`

  try {
    const result = await loadDynamicResource({
      uri,
      name: path,
      description: `Documentation: ${path}`,
      mimeType: "text/markdown",
      docSourceId: findSourceIdForPath(path),
      autoSync: true,
    })

    let content = result.content

    // Extract specific section if requested
    if (extractSection) {
      content = extractSectionFromContent(content, extractSection)
    }

    // Truncate if too long (15KB)
    if (content.length > 15000) {
      content = content.slice(0, 15000) + "\n\n... [Content truncated for token efficiency]"
    }

    const metadata = [
      `**Source:** ${result.source}`,
      `**Last Updated:** ${new Date(result.lastUpdated).toISOString()}`,
    ]

    if (result.sha) {
      metadata.push(`**SHA:** ${result.sha.slice(0, 8)}...`)
    }

    return `${metadata.join(" | ")}\n\n---\n\n${content}`
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return `Error fetching documentation: ${message}\n\nAvailable paths:\n${getAvailablePaths().join("\n")}`
  }
}

function findSourceIdForPath(path: string): string | undefined {
  // Normalize path
  const normalizedPath = path
    .replace("midnight://", "")
    .replace(/^\/+/, "")
    .toLowerCase()

  // Try to find matching source
  for (const source of DOC_SOURCES) {
    const sourcePathLower = source.path.toLowerCase()
    const sourceIdLower = source.id.toLowerCase()

    if (
      sourcePathLower.includes(normalizedPath) ||
      sourceIdLower.includes(normalizedPath) ||
      normalizedPath.includes(sourceIdLower.replace(/-/g, "/"))
    ) {
      return source.id
    }
  }

  // Try dynamic resources
  const resources = getAllDynamicResources()
  for (const resource of resources) {
    if (resource.uri.toLowerCase().includes(normalizedPath)) {
      return resource.docSourceId
    }
  }

  return undefined
}

function extractSectionFromContent(content: string, heading: string): string {
  const lines = content.split("\n")
  const headingLower = heading.toLowerCase()

  let inSection = false
  let sectionLevel = 0
  const sectionLines: string[] = []

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)

    if (headingMatch) {
      const level = headingMatch[1].length
      const title = headingMatch[2].toLowerCase()

      if (title.includes(headingLower)) {
        inSection = true
        sectionLevel = level
        sectionLines.push(line)
        continue
      }

      if (inSection && level <= sectionLevel) {
        // End of section
        break
      }
    }

    if (inSection) {
      sectionLines.push(line)
    }
  }

  if (sectionLines.length === 0) {
    return `Section "${heading}" not found in the document.`
  }

  return sectionLines.join("\n")
}

function getAvailablePaths(): string[] {
  const paths: string[] = []

  for (const source of DOC_SOURCES) {
    paths.push(`- ${source.id}: ${source.description}`)
  }

  return paths
}

// =============================================================================
// TOOL: midnight-sync-docs
// =============================================================================

export const syncDocsSchema = z.object({
  force: z
    .boolean()
    .optional()
    .describe("Force re-download even if cached (default: false)"),
  category: z
    .enum(["compact", "sdk", "network", "tutorial", "api", "general"])
    .optional()
    .describe("Sync only a specific category"),
})

export type SyncDocsInput = z.infer<typeof syncDocsSchema>

export async function syncDocsHandler(input: SyncDocsInput): Promise<string> {
  const { force = false, category } = input

  try {
    const categories = category ? [category] : undefined

    const result = await syncAllDocs({
      force,
      categories: categories as any,
    })

    const lines: string[] = [
      "## Documentation Sync Complete\n",
      `**Duration:** ${result.duration}ms`,
      `**Updated:** ${result.updated.length}`,
      `**Unchanged:** ${result.unchanged.length}`,
      `**Failed:** ${result.failed.length}`,
    ]

    if (result.updated.length > 0) {
      lines.push("\n### Updated Sources")
      for (const id of result.updated) {
        lines.push(`- ✅ ${id}`)
      }
    }

    if (result.failed.length > 0) {
      lines.push("\n### Failed Sources")
      for (const id of result.failed) {
        const error = result.errors[id] || "Unknown error"
        lines.push(`- ❌ ${id}: ${error}`)
      }
    }

    return lines.join("\n")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return `Error syncing documentation: ${message}`
  }
}

// =============================================================================
// TOOL: midnight-docs-status
// =============================================================================

export const docsStatusSchema = z.object({})

export type DocsStatusInput = z.infer<typeof docsStatusSchema>

export async function docsStatusHandler(_input: DocsStatusInput): Promise<string> {
  const syncStatus = getSyncStatus()
  const updateInfo = await checkForUpdates()

  const lines: string[] = [
    "## Documentation Status\n",
    `**Repository SHA:** ${syncStatus.repoSha || "Not synced"}`,
    `**Total Sources:** ${DOC_SOURCES.length}`,
    `**Tracked Sources:** ${syncStatus.trackedSources}`,
    `**Total Updates:** ${syncStatus.totalUpdates}`,
  ]

  if (syncStatus.lastCheck > 0) {
    const lastCheckAgo = Math.round((Date.now() - syncStatus.lastCheck) / 1000 / 60)
    lines.push(`**Last Check:** ${lastCheckAgo} minutes ago`)
  }

  if (syncStatus.lastUpdate > 0) {
    const lastUpdateAgo = Math.round((Date.now() - syncStatus.lastUpdate) / 1000 / 60)
    lines.push(`**Last Update:** ${lastUpdateAgo} minutes ago`)
  }

  lines.push("\n### Update Status")
  if (updateInfo.needsUpdate) {
    lines.push("⚠️ **Updates Available**")
    if (updateInfo.staleSources.length > 0) {
      lines.push(`\nStale sources (${updateInfo.staleSources.length}):`)
      for (const id of updateInfo.staleSources.slice(0, 10)) {
        lines.push(`- ${id}`)
      }
      if (updateInfo.staleSources.length > 10) {
        lines.push(`- ... and ${updateInfo.staleSources.length - 10} more`)
      }
    }
    lines.push("\nRun `midnight-sync-docs` to update.")
  } else {
    lines.push("✅ Documentation is up to date")
  }

  return lines.join("\n")
}

// =============================================================================
// TOOL: midnight-list-docs
// =============================================================================

export const listDocsSchema = z.object({
  category: z
    .enum(["compact", "sdk", "network", "tutorial", "api", "general"])
    .optional()
    .describe("Filter by category"),
})

export type ListDocsInput = z.infer<typeof listDocsSchema>

export async function listDocsHandler(input: ListDocsInput): Promise<string> {
  const { category } = input

  const sources = DOC_SOURCES.filter((s) => !category || s.category === category)

  // Group by category
  const byCategory = new Map<string, typeof sources>()
  for (const source of sources) {
    const cat = source.category
    if (!byCategory.has(cat)) {
      byCategory.set(cat, [])
    }
    byCategory.get(cat)!.push(source)
  }

  const lines: string[] = [`## Documentation Sources (${sources.length})\n`]

  for (const [cat, catSources] of byCategory) {
    lines.push(`### ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${catSources.length})\n`)

    for (const source of catSources) {
      const cached = getDocContent(source.id)
      const status = cached ? "✅" : "⏳"
      lines.push(`${status} **${source.id}**`)
      lines.push(`   ${source.description}`)
      if (cached) {
        const age = Math.round((Date.now() - cached.metadata.lastFetched) / 1000 / 60)
        lines.push(`   _Cached ${age} min ago_`)
      }
      lines.push("")
    }
  }

  return lines.join("\n")
}

// =============================================================================
// TOOL EXPORTS FOR REGISTRATION
// =============================================================================

import type { ToolModule, ToolsetId } from "../../types/mcp.js"

/**
 * Documentation tools as ToolModule array for integration with main registry
 */
export const documentationToolModules: ToolModule[] = [
  {
    metadata: {
      name: "midnight-search-docs",
      description:
        "Search Midnight documentation content. Use for finding guides, API docs, and conceptual explanations about the Midnight blockchain and Compact language.",
      toolset: "midnight:docs" as ToolsetId,
      readOnly: true,
    },
    inputSchema: { input: searchDocsSchema },
    handler: async (args) => searchDocsHandler(args.input as SearchDocsInput),
  },
  {
    metadata: {
      name: "midnight-fetch-docs",
      description:
        "Fetch documentation directly from the official Midnight docs. Use when you know the specific path or need the full content of a documentation page.",
      toolset: "midnight:docs" as ToolsetId,
      readOnly: true,
    },
    inputSchema: { input: fetchDocsSchema },
    handler: async (args) => fetchDocsHandler(args.input as FetchDocsInput),
  },
  {
    metadata: {
      name: "midnight-sync-docs",
      description:
        "Sync documentation from the official Midnight repository. Use to ensure documentation is up to date.",
      toolset: "midnight:docs" as ToolsetId,
      readOnly: false,
    },
    inputSchema: { input: syncDocsSchema },
    handler: async (args) => syncDocsHandler(args.input as SyncDocsInput),
  },
  {
    metadata: {
      name: "midnight-docs-status",
      description:
        "Get the current status of documentation sync, including cache age and available updates.",
      toolset: "midnight:docs" as ToolsetId,
      readOnly: true,
    },
    inputSchema: { input: docsStatusSchema },
    handler: async (args) => docsStatusHandler(args.input as DocsStatusInput),
  },
  {
    metadata: {
      name: "midnight-list-docs",
      description:
        "List all available documentation sources with their sync status.",
      toolset: "midnight:docs" as ToolsetId,
      readOnly: true,
    },
    inputSchema: { input: listDocsSchema },
    handler: async (args) => listDocsHandler(args.input as ListDocsInput),
  },
]

/**
 * Legacy format for backward compatibility
 */
export const documentationTools = {
  "midnight-search-docs": {
    name: "midnight-search-docs",
    description:
      "Search Midnight documentation content. Use for finding guides, API docs, and conceptual explanations about the Midnight blockchain and Compact language.",
    inputSchema: searchDocsSchema,
    handler: searchDocsHandler,
  },
  "midnight-fetch-docs": {
    name: "midnight-fetch-docs",
    description:
      "Fetch documentation directly from the official Midnight docs. Use when you know the specific path or need the full content of a documentation page.",
    inputSchema: fetchDocsSchema,
    handler: fetchDocsHandler,
  },
  "midnight-sync-docs": {
    name: "midnight-sync-docs",
    description:
      "Sync documentation from the official Midnight repository. Use to ensure documentation is up to date.",
    inputSchema: syncDocsSchema,
    handler: syncDocsHandler,
  },
  "midnight-docs-status": {
    name: "midnight-docs-status",
    description:
      "Get the current status of documentation sync, including cache age and available updates.",
    inputSchema: docsStatusSchema,
    handler: docsStatusHandler,
  },
  "midnight-list-docs": {
    name: "midnight-list-docs",
    description:
      "List all available documentation sources with their sync status.",
    inputSchema: listDocsSchema,
    handler: listDocsHandler,
  },
}
