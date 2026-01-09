/**
 * Midnight Network Providers
 *
 * Re-exports all provider implementations for easy access.
 */

export { IndexerProvider, createIndexerProvider, type IndexerConfig } from "./indexer.js"
export { ProofServerProvider, createProofServerProvider, type ProofServerConfig, type ProofRequest, type ProofResult } from "./proof-server.js"
export { NodeProvider, createNodeProvider, type NodeConfig, type SubmitTransactionResult } from "./node.js"

// Documentation sync provider
export {
  DOCS_REPO,
  DOC_SOURCES,
  type DocSourceConfig,
  type DocMetadata,
  type DocContent,
  type ParsedDoc,
  type DocSection,
  type CodeBlock,
  type DocsCache,
  type SyncResult,
  syncDocSource,
  syncAllDocs,
  getDocContent,
  getAllDocs,
  getDocsByCategory,
  searchDocs,
  checkForUpdates,
  getDocSources,
  getCacheStats,
  clearDocsCache,
  exportCache,
  importCache,
} from "./docs-sync.js"

// Documentation metadata system
export {
  type UpdateRecord,
  type DocsMetadata,
  type SourceMetadata,
  type UpdateCheckResult,
  type UpdateListener,
  getMetadataPath,
  setMetadataPath,
  loadMetadata,
  saveMetadata,
  addUpdateListener,
  removeAllListeners,
  syncWithMetadata,
  getSourceMetadata,
  getAllSourceMetadata,
  getUpdateHistory,
  getSyncStatus,
  getStaleSources,
  clearMetadata,
  exportMetadata,
  importMetadata,
} from "./docs-metadata.js"

// Documentation update scheduler
export {
  type SchedulerConfig,
  type SchedulerState,
  type SchedulerCallbacks,
  DocsUpdateScheduler,
  getGlobalScheduler,
  startGlobalScheduler,
  stopGlobalScheduler,
  destroyGlobalScheduler,
  syncDocsOnce,
  hasUpdatesAvailable,
  getTimeUntilNextCheck,
} from "./docs-scheduler.js"

import { IndexerProvider, type IndexerConfig } from "./indexer.js"
import { ProofServerProvider, type ProofServerConfig } from "./proof-server.js"
import { NodeProvider, type NodeConfig } from "./node.js"
import type { NetworkStatus, MidnightNetworkConfig } from "../types/midnight.js"

/**
 * Default network configurations
 */
export const NETWORK_CONFIGS: Record<string, MidnightNetworkConfig> = {
  testnet: {
    networkId: "testnet",
    indexerUrl: "https://indexer.testnet.midnight.network/graphql",
    proofServerUrl: "https://proof-server.testnet.midnight.network",
    nodeUrl: "https://rpc.testnet.midnight.network",
  },
  devnet: {
    networkId: "devnet",
    indexerUrl: "http://localhost:8080/graphql",
    proofServerUrl: "http://localhost:6300",
    nodeUrl: "http://localhost:9944",
  },
}

/**
 * Provider Manager
 *
 * Manages all Midnight Network provider instances with shared configuration.
 */
export class ProviderManager {
  private indexer: IndexerProvider | null = null
  private proofServer: ProofServerProvider | null = null
  private node: NodeProvider | null = null
  private config: MidnightNetworkConfig

  constructor(config: MidnightNetworkConfig) {
    this.config = config
  }

  /**
   * Get or create the Indexer provider
   */
  getIndexer(): IndexerProvider {
    if (!this.indexer) {
      this.indexer = new IndexerProvider({ url: this.config.indexerUrl })
    }
    return this.indexer
  }

  /**
   * Get or create the Proof Server provider
   */
  getProofServer(): ProofServerProvider {
    if (!this.proofServer) {
      this.proofServer = new ProofServerProvider({ url: this.config.proofServerUrl })
    }
    return this.proofServer
  }

  /**
   * Get or create the Node provider (if configured)
   */
  getNode(): NodeProvider | null {
    if (!this.config.nodeUrl) return null
    if (!this.node) {
      this.node = new NodeProvider({ url: this.config.nodeUrl })
    }
    return this.node
  }

  /**
   * Get overall network status from all providers
   */
  async getNetworkStatus(): Promise<NetworkStatus> {
    const [indexerStatus, proofServerStatus, nodeStatus, blockHeight] = await Promise.all([
      this.getIndexer().getStatus(),
      this.getProofServer().getStatus(),
      this.getNode()?.getStatus() ?? Promise.resolve(undefined),
      this.getIndexer().getBlockHeight().catch(() => 0),
    ])

    return {
      indexer: indexerStatus,
      proofServer: proofServerStatus,
      node: nodeStatus,
      blockHeight,
      networkId: this.config.networkId,
    }
  }

  /**
   * Update configuration and reset providers
   */
  updateConfig(config: Partial<MidnightNetworkConfig>): void {
    this.config = { ...this.config, ...config }
    this.indexer = null
    this.proofServer = null
    this.node = null
  }
}

/**
 * Create a ProviderManager for a network
 */
export function createProviderManager(
  networkId: "testnet" | "devnet" | "mainnet" | MidnightNetworkConfig
): ProviderManager {
  const config = typeof networkId === "string"
    ? NETWORK_CONFIGS[networkId] ?? NETWORK_CONFIGS.testnet
    : networkId

  return new ProviderManager(config)
}
