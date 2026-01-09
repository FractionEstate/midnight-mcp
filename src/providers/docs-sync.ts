/**
 * Midnight Documentation Sync Provider
 *
 * Fetches and tracks documentation from the official Midnight Docs repository
 * (https://github.com/midnightntwrk/midnight-docs) with automatic update detection
 * and content synchronization.
 *
 * Features:
 * - Real-time documentation fetching from GitHub
 * - SHA-based change detection for efficient updates
 * - Configurable caching with TTL
 * - Support for multiple documentation sources
 * - Automatic content parsing (MDX, JSON, etc.)
 */

import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

// =============================================================================
// CONFIGURATION
// =============================================================================

export const DOCS_REPO = {
  owner: "midnightntwrk",
  repo: "midnight-docs",
  branch: "main",
  baseUrl: "https://api.github.com/repos/midnightntwrk/midnight-docs",
  rawUrl: "https://raw.githubusercontent.com/midnightntwrk/midnight-docs/main",
} as const

/**
 * Documentation source configuration
 * Maps local resource IDs to their source locations in the docs repo
 */
export interface DocSourceConfig {
  id: string
  path: string
  type: "mdx" | "json" | "md" | "txt"
  description: string
  category: "compact" | "sdk" | "network" | "tutorial" | "api" | "general"
  priority: number // Higher = more important, update first
}

export const DOC_SOURCES: DocSourceConfig[] = [
  // Compact Language Reference
  {
    id: "compact-lang-ref",
    path: "compact/lang-ref.mdx",
    type: "mdx",
    description: "Compact Language Reference - Complete language specification",
    category: "compact",
    priority: 100,
  },
  {
    id: "compact-index",
    path: "compact/index.mdx",
    type: "mdx",
    description: "Compact Language Overview",
    category: "compact",
    priority: 95,
  },
  {
    id: "compact-std-library-exports",
    path: "compact/compact-std-library/exports.md",
    type: "md",
    description: "Compact Standard Library Exports",
    category: "compact",
    priority: 90,
  },
  {
    id: "compact-writing",
    path: "compact/writing.mdx",
    type: "mdx",
    description: "Writing Compact Contracts",
    category: "compact",
    priority: 85,
  },
  {
    id: "compact-ledger-adt",
    path: "compact/ledger-adt.mdx",
    type: "mdx",
    description: "Ledger Abstract Data Types",
    category: "compact",
    priority: 80,
  },
  {
    id: "compact-explicit-disclosure",
    path: "compact/explicit_disclosure.mdx",
    type: "mdx",
    description: "Explicit Disclosure in Compact",
    category: "compact",
    priority: 75,
  },
  {
    id: "compact-opaque-data",
    path: "compact/opaque_data.mdx",
    type: "mdx",
    description: "Opaque Data Types",
    category: "compact",
    priority: 70,
  },
  {
    id: "compact-grammar",
    path: "compact/compact-grammar.mdx",
    type: "mdx",
    description: "Compact Grammar Reference",
    category: "compact",
    priority: 65,
  },

  // SDK Reference (from docs/develop)
  {
    id: "sdk-overview",
    path: "docs/develop/reference/midnight-api.mdx",
    type: "mdx",
    description: "Midnight SDK API Overview",
    category: "sdk",
    priority: 100,
  },

  // Network Documentation
  {
    id: "network-overview",
    path: "docs/learn/what-is-midnight.mdx",
    type: "mdx",
    description: "What is Midnight Network",
    category: "network",
    priority: 100,
  },
  {
    id: "network-architecture",
    path: "docs/learn/understanding-midnight.mdx",
    type: "mdx",
    description: "Understanding Midnight Architecture",
    category: "network",
    priority: 90,
  },

  // Tutorials
  {
    id: "tutorial-getting-started",
    path: "docs/develop/getting-started/index.mdx",
    type: "mdx",
    description: "Getting Started Guide",
    category: "tutorial",
    priority: 100,
  },
  {
    id: "tutorial-create-project",
    path: "docs/develop/getting-started/create-mn-project.mdx",
    type: "mdx",
    description: "Creating a Midnight Project",
    category: "tutorial",
    priority: 95,
  },

  // LLMs.txt - High-level overview for AI
  {
    id: "llms-overview",
    path: "llms.txt",
    type: "txt",
    description: "LLM-optimized documentation overview",
    category: "general",
    priority: 110,
  },

  // Doc metadata
  {
    id: "doc-metadata",
    path: ".docmeta.json",
    type: "json",
    description: "Documentation metadata and versioning",
    category: "general",
    priority: 120,
  },
]

// =============================================================================
// TYPES
// =============================================================================

export interface DocMetadata {
  sha: string
  lastFetched: number
  lastModified?: string
  size: number
  etag?: string
}

export interface DocContent {
  id: string
  content: string
  metadata: DocMetadata
  parsed?: ParsedDoc
}

export interface ParsedDoc {
  title?: string
  description?: string
  frontmatter?: Record<string, unknown>
  headings: string[]
  sections: DocSection[]
  codeBlocks: CodeBlock[]
}

export interface DocSection {
  level: number
  title: string
  content: string
  startLine: number
  endLine: number
}

export interface CodeBlock {
  language: string
  code: string
  filename?: string
  startLine: number
}

export interface DocsCache {
  sources: Record<string, DocContent>
  lastFullSync: number
  repoSha: string
  errors: Record<string, string>
}

export interface SyncResult {
  updated: string[]
  unchanged: string[]
  failed: string[]
  errors: Record<string, string>
  duration: number
}

// =============================================================================
// CACHE
// =============================================================================

let docsCache: DocsCache = {
  sources: {},
  lastFullSync: 0,
  repoSha: "",
  errors: {},
}

// Cache TTL: 1 hour by default (more frequent than versions)
const DEFAULT_CACHE_TTL = 60 * 60 * 1000

// =============================================================================
// GITHUB API HELPERS
// =============================================================================

/**
 * Fetch file content from GitHub with caching support
 */
async function fetchFromGitHub(
  path: string,
  etag?: string
): Promise<{
  content: string | null
  sha: string
  size: number
  etag?: string
  notModified: boolean
} | null> {
  const url = `${DOCS_REPO.baseUrl}/contents/${path}`

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Midnight-MCP-Server",
    }

    // Use conditional request if we have an etag
    if (etag) {
      headers["If-None-Match"] = etag
    }

    // Add GitHub token if available
    const token = process.env.GITHUB_TOKEN
    if (token) {
      headers["Authorization"] = `token ${token}`
    }

    const response = await fetch(url, { headers })

    // Handle 304 Not Modified
    if (response.status === 304) {
      return {
        content: null,
        sha: "",
        size: 0,
        etag,
        notModified: true,
      }
    }

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[DocsSync] File not found: ${path}`)
        return null
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const newEtag = response.headers.get("etag") || undefined

    // Decode base64 content
    const content = Buffer.from(data.content, "base64").toString("utf-8")

    return {
      content,
      sha: data.sha,
      size: data.size,
      etag: newEtag,
      notModified: false,
    }
  } catch (error) {
    console.error(`[DocsSync] Error fetching ${path}:`, error)
    return null
  }
}

/**
 * Get the latest commit SHA of the docs repo
 */
async function getRepoLatestSha(): Promise<string | null> {
  const url = `${DOCS_REPO.baseUrl}/commits/${DOCS_REPO.branch}`

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Midnight-MCP-Server",
    }

    const token = process.env.GITHUB_TOKEN
    if (token) {
      headers["Authorization"] = `token ${token}`
    }

    const response = await fetch(url, { headers })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const data = await response.json()
    return data.sha
  } catch (error) {
    console.error("[DocsSync] Error getting repo SHA:", error)
    return null
  }
}

// =============================================================================
// PARSING UTILITIES
// =============================================================================

/**
 * Parse MDX/Markdown frontmatter
 */
function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>
  body: string
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/
  const match = content.match(frontmatterRegex)

  if (!match) {
    return { frontmatter: {}, body: content }
  }

  const frontmatterStr = match[1]
  const body = content.slice(match[0].length)

  // Simple YAML parsing
  const frontmatter: Record<string, unknown> = {}
  const lines = frontmatterStr.split("\n")

  for (const line of lines) {
    const colonIndex = line.indexOf(":")
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    let value: unknown = line.slice(colonIndex + 1).trim()

    // Handle quoted strings
    if ((value as string).startsWith('"') && (value as string).endsWith('"')) {
      value = (value as string).slice(1, -1)
    } else if ((value as string).startsWith("'") && (value as string).endsWith("'")) {
      value = (value as string).slice(1, -1)
    } else if ((value as string) === "true") {
      value = true
    } else if ((value as string) === "false") {
      value = false
    } else if (!isNaN(Number(value))) {
      value = Number(value)
    }

    frontmatter[key] = value
  }

  return { frontmatter, body }
}

/**
 * Extract headings from Markdown content
 */
function extractHeadings(content: string): string[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  const headings: string[] = []

  let match
  while ((match = headingRegex.exec(content)) !== null) {
    headings.push(match[2].trim())
  }

  return headings
}

/**
 * Extract sections from Markdown content
 */
function extractSections(content: string): DocSection[] {
  const lines = content.split("\n")
  const sections: DocSection[] = []
  let currentSection: DocSection | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)

    if (headingMatch) {
      // Close previous section
      if (currentSection) {
        currentSection.endLine = i - 1
        sections.push(currentSection)
      }

      // Start new section
      currentSection = {
        level: headingMatch[1].length,
        title: headingMatch[2].trim(),
        content: "",
        startLine: i,
        endLine: lines.length - 1,
      }
    } else if (currentSection) {
      currentSection.content += line + "\n"
    }
  }

  // Add final section
  if (currentSection) {
    sections.push(currentSection)
  }

  return sections
}

/**
 * Extract code blocks from Markdown content
 */
function extractCodeBlocks(content: string): CodeBlock[] {
  const codeBlockRegex = /```(\w*)\s*([\w.-]*)?\n([\s\S]*?)```/g
  const codeBlocks: CodeBlock[] = []
  const lines = content.split("\n")

  let match
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Calculate line number
    const beforeMatch = content.slice(0, match.index)
    const startLine = beforeMatch.split("\n").length

    codeBlocks.push({
      language: match[1] || "text",
      filename: match[2] || undefined,
      code: match[3].trim(),
      startLine,
    })
  }

  return codeBlocks
}

/**
 * Parse document content into structured format
 */
function parseDocument(content: string, type: DocSourceConfig["type"]): ParsedDoc {
  if (type === "json") {
    try {
      const data = JSON.parse(content)
      return {
        headings: [],
        sections: [],
        codeBlocks: [],
        frontmatter: data,
      }
    } catch {
      return { headings: [], sections: [], codeBlocks: [] }
    }
  }

  const { frontmatter, body } = parseFrontmatter(content)

  return {
    title: (frontmatter["title"] as string) || extractHeadings(body)[0],
    description: frontmatter["description"] as string,
    frontmatter,
    headings: extractHeadings(body),
    sections: extractSections(body),
    codeBlocks: extractCodeBlocks(body),
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Sync a single documentation source
 */
export async function syncDocSource(config: DocSourceConfig): Promise<DocContent | null> {
  const cached = docsCache.sources[config.id]
  const etag = cached?.metadata.etag

  const result = await fetchFromGitHub(config.path, etag)

  if (!result) {
    docsCache.errors[config.id] = "Failed to fetch from GitHub"
    return cached || null
  }

  if (result.notModified && cached) {
    // Update lastFetched but keep content
    cached.metadata.lastFetched = Date.now()
    return cached
  }

  if (!result.content) {
    return cached || null
  }

  const docContent: DocContent = {
    id: config.id,
    content: result.content,
    metadata: {
      sha: result.sha,
      lastFetched: Date.now(),
      size: result.size,
      etag: result.etag,
    },
    parsed: parseDocument(result.content, config.type),
  }

  docsCache.sources[config.id] = docContent
  delete docsCache.errors[config.id]

  return docContent
}

/**
 * Sync all documentation sources
 */
export async function syncAllDocs(options?: {
  force?: boolean
  categories?: DocSourceConfig["category"][]
  priorities?: { min?: number; max?: number }
}): Promise<SyncResult> {
  const startTime = Date.now()
  const result: SyncResult = {
    updated: [],
    unchanged: [],
    failed: [],
    errors: {},
    duration: 0,
  }

  // Check if we need a full sync
  const now = Date.now()
  if (!options?.force && now - docsCache.lastFullSync < DEFAULT_CACHE_TTL) {
    // Quick check: has the repo been updated?
    const latestSha = await getRepoLatestSha()
    if (latestSha && latestSha === docsCache.repoSha) {
      result.duration = Date.now() - startTime
      return result
    }
  }

  // Filter sources based on options
  let sources = [...DOC_SOURCES]

  if (options?.categories) {
    sources = sources.filter((s) => options.categories!.includes(s.category))
  }

  if (options?.priorities) {
    const { min = 0, max = Infinity } = options.priorities
    sources = sources.filter((s) => s.priority >= min && s.priority <= max)
  }

  // Sort by priority (highest first)
  sources.sort((a, b) => b.priority - a.priority)

  // Sync each source
  for (const source of sources) {
    try {
      const cached = docsCache.sources[source.id]
      const doc = await syncDocSource(source)

      if (!doc) {
        result.failed.push(source.id)
        result.errors[source.id] = docsCache.errors[source.id] || "Unknown error"
      } else if (cached && cached.metadata.sha === doc.metadata.sha) {
        result.unchanged.push(source.id)
      } else {
        result.updated.push(source.id)
      }
    } catch (error) {
      result.failed.push(source.id)
      result.errors[source.id] = error instanceof Error ? error.message : "Unknown error"
    }
  }

  // Update sync metadata
  docsCache.lastFullSync = now
  const latestSha = await getRepoLatestSha()
  if (latestSha) {
    docsCache.repoSha = latestSha
  }

  result.duration = Date.now() - startTime
  return result
}

/**
 * Get cached documentation content
 */
export function getDocContent(id: string): DocContent | null {
  return docsCache.sources[id] || null
}

/**
 * Get all cached documentation
 */
export function getAllDocs(): Record<string, DocContent> {
  return { ...docsCache.sources }
}

/**
 * Get documentation by category
 */
export function getDocsByCategory(
  category: DocSourceConfig["category"]
): DocContent[] {
  const sourceIds = DOC_SOURCES.filter((s) => s.category === category).map((s) => s.id)

  return sourceIds.map((id) => docsCache.sources[id]).filter(Boolean) as DocContent[]
}

/**
 * Search documentation content
 */
export function searchDocs(query: string, options?: {
  categories?: DocSourceConfig["category"][]
  limit?: number
}): Array<{
  source: DocSourceConfig
  content: DocContent
  matches: Array<{ context: string; line: number }>
}> {
  const results: Array<{
    source: DocSourceConfig
    content: DocContent
    matches: Array<{ context: string; line: number }>
  }> = []

  const queryLower = query.toLowerCase()

  for (const source of DOC_SOURCES) {
    if (options?.categories && !options.categories.includes(source.category)) {
      continue
    }

    const content = docsCache.sources[source.id]
    if (!content) continue

    const lines = content.content.split("\n")
    const matches: Array<{ context: string; line: number }> = []

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(queryLower)) {
        // Get context (surrounding lines)
        const start = Math.max(0, i - 1)
        const end = Math.min(lines.length, i + 2)
        const context = lines.slice(start, end).join("\n")

        matches.push({ context, line: i + 1 })
      }
    }

    if (matches.length > 0) {
      results.push({ source, content, matches })
    }
  }

  // Limit results
  if (options?.limit) {
    return results.slice(0, options.limit)
  }

  return results
}

/**
 * Check if documentation needs update
 */
export async function checkForUpdates(): Promise<{
  needsUpdate: boolean
  currentSha: string
  latestSha: string | null
  staleSources: string[]
}> {
  const latestSha = await getRepoLatestSha()

  const staleSources: string[] = []
  const now = Date.now()

  for (const source of DOC_SOURCES) {
    const cached = docsCache.sources[source.id]
    if (!cached || now - cached.metadata.lastFetched > DEFAULT_CACHE_TTL) {
      staleSources.push(source.id)
    }
  }

  return {
    needsUpdate: latestSha !== docsCache.repoSha || staleSources.length > 0,
    currentSha: docsCache.repoSha,
    latestSha,
    staleSources,
  }
}

/**
 * Get documentation source configuration
 */
export function getDocSources(): DocSourceConfig[] {
  return [...DOC_SOURCES]
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalSources: number
  cachedSources: number
  lastFullSync: number
  repoSha: string
  errors: Record<string, string>
  cacheAge: number
} {
  return {
    totalSources: DOC_SOURCES.length,
    cachedSources: Object.keys(docsCache.sources).length,
    lastFullSync: docsCache.lastFullSync,
    repoSha: docsCache.repoSha,
    errors: { ...docsCache.errors },
    cacheAge: Date.now() - docsCache.lastFullSync,
  }
}

/**
 * Clear documentation cache
 */
export function clearDocsCache(): void {
  docsCache = {
    sources: {},
    lastFullSync: 0,
    repoSha: "",
    errors: {},
  }
}

/**
 * Export cache for persistence
 */
export function exportCache(): DocsCache {
  return { ...docsCache }
}

/**
 * Import cache from persistence
 */
export function importCache(cache: DocsCache): void {
  docsCache = cache
}
