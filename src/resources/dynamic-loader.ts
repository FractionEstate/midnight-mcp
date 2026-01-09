/**
 * Dynamic Resource Loader
 *
 * Provides resources that can automatically load content from the
 * official Midnight documentation when available, with fallback to
 * static content.
 */

import {
  getDocContent,
  syncDocSource,
  DOC_SOURCES,
  type DocContent,
  type DocSourceConfig,
} from "../providers/docs-sync.js"
import { getSyncStatus, syncWithMetadata } from "../providers/docs-metadata.js"

// =============================================================================
// TYPES
// =============================================================================

export interface DynamicResourceConfig {
  /** Resource URI */
  uri: string
  /** Resource name */
  name: string
  /** Resource description */
  description: string
  /** MIME type */
  mimeType: string
  /** Documentation source ID to fetch from */
  docSourceId?: string
  /** Static content fallback */
  staticContent?: () => string | Promise<string>
  /** Content transformer */
  transformer?: (content: string, parsed?: DocContent["parsed"]) => string
  /** Whether to auto-sync if content is stale */
  autoSync?: boolean
  /** Maximum age for content before considering stale (ms) */
  maxAge?: number
}

export interface DynamicResourceResult {
  content: string
  source: "dynamic" | "static" | "cached"
  lastUpdated: number
  sha?: string
}

// =============================================================================
// CONTENT TRANSFORMERS
// =============================================================================

/**
 * Strip MDX-specific syntax for plain markdown output
 */
export function stripMdxSyntax(content: string): string {
  return (
    content
      // Remove import statements
      .replace(/^import\s+.*$/gm, "")
      // Remove export default
      .replace(/^export\s+default\s+.*$/gm, "")
      // Remove JSX components (simple cases)
      .replace(/<[A-Z][a-zA-Z]*\s*\/>/g, "")
      .replace(/<[A-Z][a-zA-Z]*[^>]*>[\s\S]*?<\/[A-Z][a-zA-Z]*>/g, "")
      // Clean up multiple blank lines
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  )
}

/**
 * Extract frontmatter title and description
 */
export function extractMetadata(
  content: string,
  parsed?: DocContent["parsed"]
): { title?: string; description?: string } {
  if (parsed?.frontmatter) {
    return {
      title: parsed.frontmatter.title as string | undefined,
      description: parsed.frontmatter.description as string | undefined,
    }
  }

  // Try to extract from frontmatter manually
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) {
    return {}
  }

  const frontmatter = frontmatterMatch[1]
  const titleMatch = frontmatter.match(/^title:\s*["']?(.+?)["']?\s*$/m)
  const descMatch = frontmatter.match(/^description:\s*["']?(.+?)["']?\s*$/m)

  return {
    title: titleMatch?.[1],
    description: descMatch?.[1],
  }
}

/**
 * Add source attribution header
 */
export function addSourceAttribution(content: string, sourceUrl: string): string {
  return `> 📖 Source: ${sourceUrl}\n> Auto-updated from official Midnight documentation\n\n${content}`
}

/**
 * Default content transformer: strip MDX and add attribution
 */
export function defaultTransformer(
  content: string,
  parsed?: DocContent["parsed"],
  sourceConfig?: DocSourceConfig
): string {
  const cleanContent = stripMdxSyntax(content)

  if (sourceConfig) {
    const sourceUrl = `https://github.com/midnightntwrk/midnight-docs/blob/main/${sourceConfig.path}`
    return addSourceAttribution(cleanContent, sourceUrl)
  }

  return cleanContent
}

// =============================================================================
// DYNAMIC RESOURCE LOADER
// =============================================================================

/**
 * Load a dynamic resource with auto-sync capability
 */
export async function loadDynamicResource(
  config: DynamicResourceConfig
): Promise<DynamicResourceResult> {
  // Get source config if specified
  const sourceConfig = config.docSourceId
    ? DOC_SOURCES.find((s) => s.id === config.docSourceId)
    : undefined

  // Try to get cached content first
  if (config.docSourceId) {
    let docContent = getDocContent(config.docSourceId)

    // Check if we need to sync
    if (docContent && config.maxAge) {
      const age = Date.now() - docContent.metadata.lastFetched
      if (age > config.maxAge && config.autoSync !== false) {
        // Sync in background, don't block
        syncDocSource(sourceConfig!).catch((e) =>
          console.warn(`[DynamicResource] Background sync failed: ${e}`)
        )
      }
    }

    // Sync if no content and autoSync is enabled
    if (!docContent && config.autoSync !== false && sourceConfig) {
      docContent = await syncDocSource(sourceConfig)
    }

    // If we have content, transform and return
    if (docContent?.content) {
      const transformer =
        config.transformer ||
        ((c: string, p?: DocContent["parsed"]) =>
          defaultTransformer(c, p, sourceConfig))

      return {
        content: transformer(docContent.content, docContent.parsed),
        source: "dynamic",
        lastUpdated: docContent.metadata.lastFetched,
        sha: docContent.metadata.sha,
      }
    }
  }

  // Fall back to static content
  if (config.staticContent) {
    const content = await config.staticContent()
    return {
      content,
      source: "static",
      lastUpdated: Date.now(),
    }
  }

  // No content available
  throw new Error(`No content available for resource: ${config.uri}`)
}

/**
 * Create a resource handler that uses dynamic loading
 */
export function createDynamicResourceHandler(
  config: DynamicResourceConfig
): () => Promise<string> {
  return async () => {
    const result = await loadDynamicResource(config)
    return result.content
  }
}

// =============================================================================
// RESOURCE REGISTRY
// =============================================================================

const dynamicResources = new Map<string, DynamicResourceConfig>()

/**
 * Register a dynamic resource
 */
export function registerDynamicResource(config: DynamicResourceConfig): void {
  dynamicResources.set(config.uri, config)
}

/**
 * Get a registered dynamic resource
 */
export function getDynamicResource(
  uri: string
): DynamicResourceConfig | undefined {
  return dynamicResources.get(uri)
}

/**
 * Get all registered dynamic resources
 */
export function getAllDynamicResources(): DynamicResourceConfig[] {
  return Array.from(dynamicResources.values())
}

/**
 * Load a registered resource by URI
 */
export async function loadRegisteredResource(
  uri: string
): Promise<DynamicResourceResult | null> {
  const config = dynamicResources.get(uri)
  if (!config) {
    return null
  }
  return loadDynamicResource(config)
}

// =============================================================================
// PRE-REGISTERED MIDNIGHT RESOURCES
// =============================================================================

// Register Compact Language Resources
registerDynamicResource({
  uri: "midnight://compact/overview",
  name: "Compact Language Overview",
  description:
    "Introduction to Compact, the privacy-preserving smart contract language",
  mimeType: "text/markdown",
  docSourceId: "compact-index",
  autoSync: true,
  maxAge: 60 * 60 * 1000, // 1 hour
})

registerDynamicResource({
  uri: "midnight://compact/reference",
  name: "Compact Language Reference",
  description: "Complete language specification for Compact",
  mimeType: "text/markdown",
  docSourceId: "compact-lang-ref",
  autoSync: true,
  maxAge: 60 * 60 * 1000,
})

registerDynamicResource({
  uri: "midnight://compact/std-library",
  name: "Compact Standard Library",
  description: "Standard library exports and functions",
  mimeType: "text/markdown",
  docSourceId: "compact-std-library-exports",
  autoSync: true,
  maxAge: 60 * 60 * 1000,
})

registerDynamicResource({
  uri: "midnight://compact/writing",
  name: "Writing Compact Contracts",
  description: "Guide to writing smart contracts in Compact",
  mimeType: "text/markdown",
  docSourceId: "compact-writing",
  autoSync: true,
  maxAge: 60 * 60 * 1000,
})

registerDynamicResource({
  uri: "midnight://compact/ledger-adt",
  name: "Ledger Abstract Data Types",
  description: "ADT patterns for Compact ledger state",
  mimeType: "text/markdown",
  docSourceId: "compact-ledger-adt",
  autoSync: true,
  maxAge: 60 * 60 * 1000,
})

registerDynamicResource({
  uri: "midnight://compact/disclosure",
  name: "Explicit Disclosure",
  description: "Disclosure mechanisms in Compact",
  mimeType: "text/markdown",
  docSourceId: "compact-explicit-disclosure",
  autoSync: true,
  maxAge: 60 * 60 * 1000,
})

// Register Network Resources
registerDynamicResource({
  uri: "midnight://network/overview",
  name: "Midnight Network Overview",
  description: "Introduction to the Midnight Network",
  mimeType: "text/markdown",
  docSourceId: "network-overview",
  autoSync: true,
  maxAge: 60 * 60 * 1000,
})

registerDynamicResource({
  uri: "midnight://network/architecture",
  name: "Midnight Architecture",
  description: "Understanding Midnight Network architecture",
  mimeType: "text/markdown",
  docSourceId: "network-architecture",
  autoSync: true,
  maxAge: 60 * 60 * 1000,
})

// Register SDK Resources
registerDynamicResource({
  uri: "midnight://sdk/overview",
  name: "Midnight SDK Overview",
  description: "API overview for the Midnight JS SDK",
  mimeType: "text/markdown",
  docSourceId: "sdk-overview",
  autoSync: true,
  maxAge: 60 * 60 * 1000,
})

// Register Tutorial Resources
registerDynamicResource({
  uri: "midnight://tutorials/getting-started",
  name: "Getting Started",
  description: "Getting started with Midnight development",
  mimeType: "text/markdown",
  docSourceId: "tutorial-getting-started",
  autoSync: true,
  maxAge: 60 * 60 * 1000,
})

registerDynamicResource({
  uri: "midnight://tutorials/create-project",
  name: "Create a Midnight Project",
  description: "Step-by-step guide to creating a new project",
  mimeType: "text/markdown",
  docSourceId: "tutorial-create-project",
  autoSync: true,
  maxAge: 60 * 60 * 1000,
})

// Register LLM Overview (special resource)
registerDynamicResource({
  uri: "midnight://llms/overview",
  name: "LLM Documentation Overview",
  description: "High-level documentation overview optimized for AI assistants",
  mimeType: "text/plain",
  docSourceId: "llms-overview",
  autoSync: true,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours for this one
  transformer: (content) => content, // No transformation needed
})
