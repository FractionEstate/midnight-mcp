/**
 * Documentation Metadata System
 *
 * Persists documentation metadata and tracks update history.
 * Provides hooks for automatic updates and change notifications.
 */

import { readFile, writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import { join, dirname } from "path"
import {
  DOCS_REPO,
  DOC_SOURCES,
  type DocSourceConfig,
  type DocMetadata,
  type DocsCache,
  exportCache,
  importCache,
  syncAllDocs,
  checkForUpdates,
} from "./docs-sync.js"

// =============================================================================
// TYPES
// =============================================================================

export interface UpdateRecord {
  timestamp: number
  sourceId: string
  previousSha: string
  newSha: string
  type: "created" | "updated" | "deleted"
}

export interface DocsMetadata {
  version: number
  lastCheck: number
  lastUpdate: number
  repoSha: string
  sources: Record<string, SourceMetadata>
  updateHistory: UpdateRecord[]
}

export interface SourceMetadata {
  id: string
  path: string
  sha: string
  lastFetched: number
  lastModified?: string
  size: number
  etag?: string
  checksumMd5?: string
  firstSeen: number
  updateCount: number
}

export interface UpdateCheckResult {
  hasUpdates: boolean
  updatedSources: string[]
  newSources: string[]
  deletedSources: string[]
  repoChanged: boolean
}

export interface UpdateListener {
  onUpdate?: (records: UpdateRecord[]) => void
  onError?: (error: Error) => void
  onSyncStart?: () => void
  onSyncComplete?: (result: UpdateCheckResult) => void
}

// =============================================================================
// CONSTANTS
// =============================================================================

const METADATA_VERSION = 1
const DEFAULT_METADATA_PATH = ".midnight-mcp/docs-metadata.json"
const MAX_HISTORY_ENTRIES = 100

// =============================================================================
// STATE
// =============================================================================

let metadata: DocsMetadata = {
  version: METADATA_VERSION,
  lastCheck: 0,
  lastUpdate: 0,
  repoSha: "",
  sources: {},
  updateHistory: [],
}

let metadataPath = DEFAULT_METADATA_PATH
let listeners: UpdateListener[] = []

// =============================================================================
// PERSISTENCE
// =============================================================================

/**
 * Get the metadata file path
 */
export function getMetadataPath(): string {
  return metadataPath
}

/**
 * Set the metadata file path
 */
export function setMetadataPath(path: string): void {
  metadataPath = path
}

/**
 * Load metadata from disk
 */
export async function loadMetadata(): Promise<DocsMetadata> {
  try {
    if (!existsSync(metadataPath)) {
      return metadata
    }

    const content = await readFile(metadataPath, "utf-8")
    const loaded = JSON.parse(content) as DocsMetadata

    // Validate version
    if (loaded.version !== METADATA_VERSION) {
      console.warn("[DocsMetadata] Version mismatch, resetting metadata")
      return metadata
    }

    metadata = loaded
    return metadata
  } catch (error) {
    console.error("[DocsMetadata] Error loading metadata:", error)
    return metadata
  }
}

/**
 * Save metadata to disk
 */
export async function saveMetadata(): Promise<void> {
  try {
    const dir = dirname(metadataPath)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf-8")
  } catch (error) {
    console.error("[DocsMetadata] Error saving metadata:", error)
    throw error
  }
}

// =============================================================================
// UPDATE TRACKING
// =============================================================================

/**
 * Record an update event
 */
function recordUpdate(
  sourceId: string,
  previousSha: string,
  newSha: string,
  type: UpdateRecord["type"]
): UpdateRecord {
  const record: UpdateRecord = {
    timestamp: Date.now(),
    sourceId,
    previousSha,
    newSha,
    type,
  }

  metadata.updateHistory.unshift(record)

  // Trim history if too long
  if (metadata.updateHistory.length > MAX_HISTORY_ENTRIES) {
    metadata.updateHistory = metadata.updateHistory.slice(0, MAX_HISTORY_ENTRIES)
  }

  return record
}

/**
 * Update source metadata after fetch
 */
function updateSourceMetadata(
  sourceId: string,
  sha: string,
  size: number,
  etag?: string
): SourceMetadata {
  const existing = metadata.sources[sourceId]
  const config = DOC_SOURCES.find((s) => s.id === sourceId)

  if (!config) {
    throw new Error(`Unknown source: ${sourceId}`)
  }

  const now = Date.now()

  if (existing) {
    // Check if updated
    if (existing.sha !== sha) {
      recordUpdate(sourceId, existing.sha, sha, "updated")
    }

    metadata.sources[sourceId] = {
      ...existing,
      sha,
      size,
      etag,
      lastFetched: now,
      updateCount: existing.sha !== sha ? existing.updateCount + 1 : existing.updateCount,
    }
  } else {
    // New source
    recordUpdate(sourceId, "", sha, "created")

    metadata.sources[sourceId] = {
      id: sourceId,
      path: config.path,
      sha,
      lastFetched: now,
      size,
      etag,
      firstSeen: now,
      updateCount: 0,
    }
  }

  metadata.lastUpdate = now
  return metadata.sources[sourceId]
}

// =============================================================================
// LISTENERS
// =============================================================================

/**
 * Add an update listener
 */
export function addUpdateListener(listener: UpdateListener): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

/**
 * Remove all listeners
 */
export function removeAllListeners(): void {
  listeners = []
}

/**
 * Notify listeners of updates
 */
function notifyListeners(records: UpdateRecord[]): void {
  for (const listener of listeners) {
    try {
      listener.onUpdate?.(records)
    } catch (error) {
      console.error("[DocsMetadata] Listener error:", error)
    }
  }
}

// =============================================================================
// SYNC INTEGRATION
// =============================================================================

/**
 * Perform a full sync with metadata tracking
 */
export async function syncWithMetadata(options?: {
  force?: boolean
  persist?: boolean
}): Promise<UpdateCheckResult> {
  const result: UpdateCheckResult = {
    hasUpdates: false,
    updatedSources: [],
    newSources: [],
    deletedSources: [],
    repoChanged: false,
  }

  // Notify listeners
  for (const listener of listeners) {
    try {
      listener.onSyncStart?.()
    } catch (error) {
      console.error("[DocsMetadata] Listener error:", error)
    }
  }

  try {
    // Check for updates first
    const updateInfo = await checkForUpdates()

    if (!options?.force && !updateInfo.needsUpdate) {
      metadata.lastCheck = Date.now()
      return result
    }

    result.repoChanged = updateInfo.latestSha !== metadata.repoSha

    // Perform sync
    const beforeShas = new Map(
      Object.entries(metadata.sources).map(([id, m]) => [id, m.sha])
    )

    const syncResult = await syncAllDocs({ force: options?.force })
    const cache = exportCache()

    // Track changes
    const updateRecords: UpdateRecord[] = []

    for (const [id, content] of Object.entries(cache.sources)) {
      const previousSha = beforeShas.get(id) || ""
      const newSha = content.metadata.sha

      if (!previousSha) {
        result.newSources.push(id)
        updateRecords.push(recordUpdate(id, previousSha, newSha, "created"))
      } else if (previousSha !== newSha) {
        result.updatedSources.push(id)
        updateRecords.push(recordUpdate(id, previousSha, newSha, "updated"))
      }

      // Update source metadata
      updateSourceMetadata(
        id,
        newSha,
        content.metadata.size,
        content.metadata.etag
      )
    }

    // Check for deleted sources
    for (const id of beforeShas.keys()) {
      if (!cache.sources[id]) {
        result.deletedSources.push(id)
        const previousSha = beforeShas.get(id) || ""
        updateRecords.push(recordUpdate(id, previousSha, "", "deleted"))
        delete metadata.sources[id]
      }
    }

    // Update metadata
    metadata.lastCheck = Date.now()
    if (updateInfo.latestSha) {
      metadata.repoSha = updateInfo.latestSha
    }

    result.hasUpdates =
      result.updatedSources.length > 0 ||
      result.newSources.length > 0 ||
      result.deletedSources.length > 0

    // Notify listeners
    if (updateRecords.length > 0) {
      notifyListeners(updateRecords)
    }

    // Persist if requested
    if (options?.persist !== false) {
      await saveMetadata()
    }

    // Notify completion
    for (const listener of listeners) {
      try {
        listener.onSyncComplete?.(result)
      } catch (error) {
        console.error("[DocsMetadata] Listener error:", error)
      }
    }

    return result
  } catch (error) {
    // Notify error
    for (const listener of listeners) {
      try {
        listener.onError?.(error instanceof Error ? error : new Error(String(error)))
      } catch (e) {
        console.error("[DocsMetadata] Listener error:", e)
      }
    }

    throw error
  }
}

// =============================================================================
// QUERY INTERFACE
// =============================================================================

/**
 * Get metadata for a specific source
 */
export function getSourceMetadata(sourceId: string): SourceMetadata | null {
  return metadata.sources[sourceId] || null
}

/**
 * Get all source metadata
 */
export function getAllSourceMetadata(): Record<string, SourceMetadata> {
  return { ...metadata.sources }
}

/**
 * Get update history
 */
export function getUpdateHistory(options?: {
  sourceId?: string
  type?: UpdateRecord["type"]
  since?: number
  limit?: number
}): UpdateRecord[] {
  let records = [...metadata.updateHistory]

  if (options?.sourceId) {
    records = records.filter((r) => r.sourceId === options.sourceId)
  }

  if (options?.type) {
    records = records.filter((r) => r.type === options.type)
  }

  if (options?.since !== undefined) {
    const sinceTime = options.since
    records = records.filter((r) => r.timestamp >= sinceTime)
  }

  if (options?.limit) {
    records = records.slice(0, options.limit)
  }

  return records
}

/**
 * Get sync status
 */
export function getSyncStatus(): {
  lastCheck: number
  lastUpdate: number
  repoSha: string
  totalSources: number
  trackedSources: number
  totalUpdates: number
} {
  return {
    lastCheck: metadata.lastCheck,
    lastUpdate: metadata.lastUpdate,
    repoSha: metadata.repoSha,
    totalSources: DOC_SOURCES.length,
    trackedSources: Object.keys(metadata.sources).length,
    totalUpdates: metadata.updateHistory.length,
  }
}

/**
 * Get sources that need refresh
 */
export function getStaleSources(maxAge: number = 60 * 60 * 1000): string[] {
  const now = Date.now()
  const stale: string[] = []

  for (const config of DOC_SOURCES) {
    const source = metadata.sources[config.id]
    if (!source || now - source.lastFetched > maxAge) {
      stale.push(config.id)
    }
  }

  return stale
}

/**
 * Clear metadata
 */
export function clearMetadata(): void {
  metadata = {
    version: METADATA_VERSION,
    lastCheck: 0,
    lastUpdate: 0,
    repoSha: "",
    sources: {},
    updateHistory: [],
  }
}

/**
 * Export metadata for debugging/backup
 */
export function exportMetadata(): DocsMetadata {
  return { ...metadata }
}

/**
 * Import metadata (for restore)
 */
export function importMetadata(data: DocsMetadata): void {
  if (data.version !== METADATA_VERSION) {
    throw new Error(`Version mismatch: expected ${METADATA_VERSION}, got ${data.version}`)
  }
  metadata = data
}
