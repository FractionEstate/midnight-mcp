/**
 * Midnight Indexer Provider
 *
 * Client for interacting with the Midnight Network Indexer GraphQL API.
 * Provides access to blockchain data including blocks, transactions, and contract state.
 */

import type { MidnightTransaction, ContractState, NetworkStatus, ServiceStatus } from "../types/midnight.js"

export interface IndexerConfig {
  url: string
  timeout?: number
}

export class IndexerProvider {
  private url: string
  private timeout: number

  constructor(config: IndexerConfig) {
    this.url = config.url
    this.timeout = config.timeout ?? 30000
  }

  /**
   * Execute a GraphQL query against the indexer
   */
  private async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Indexer request failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json() as { data?: T; errors?: Array<{ message: string }> }

      if (result.errors && result.errors.length > 0) {
        throw new Error(`GraphQL errors: ${result.errors.map(e => e.message).join(", ")}`)
      }

      return result.data as T
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Check indexer health status
   */
  async getStatus(): Promise<ServiceStatus> {
    const startTime = Date.now()
    try {
      const data = await this.query<{ _service: { sdl: string } }>(`
        query {
          _service {
            sdl
          }
        }
      `)

      return {
        url: this.url,
        healthy: true,
        latency: Date.now() - startTime,
        version: "unknown",
      }
    } catch (error) {
      return {
        url: this.url,
        healthy: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Get the current block height
   */
  async getBlockHeight(): Promise<number> {
    const data = await this.query<{ blocks: { nodes: Array<{ height: number }> } }>(`
      query {
        blocks(first: 1, orderBy: HEIGHT_DESC) {
          nodes {
            height
          }
        }
      }
    `)

    return data.blocks.nodes[0]?.height ?? 0
  }

  /**
   * Get block information by height
   */
  async getBlock(height: number): Promise<{
    height: number
    hash: string
    timestamp: number
    transactionCount: number
  } | null> {
    const data = await this.query<{
      blocks: {
        nodes: Array<{
          height: number
          hash: string
          timestamp: string
          transactions: { totalCount: number }
        }>
      }
    }>(`
      query GetBlock($height: Int!) {
        blocks(filter: { height: { equalTo: $height } }) {
          nodes {
            height
            hash
            timestamp
            transactions {
              totalCount
            }
          }
        }
      }
    `, { height })

    const block = data.blocks.nodes[0]
    if (!block) return null

    return {
      height: block.height,
      hash: block.hash,
      timestamp: new Date(block.timestamp).getTime(),
      transactionCount: block.transactions.totalCount,
    }
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(hash: string): Promise<MidnightTransaction | null> {
    const data = await this.query<{
      transactions: {
        nodes: Array<{
          hash: string
          blockHeight: number
          timestamp: string
          status: string
          contractAddress?: string
        }>
      }
    }>(`
      query GetTransaction($hash: String!) {
        transactions(filter: { hash: { equalTo: $hash } }) {
          nodes {
            hash
            blockHeight
            timestamp
            status
            contractAddress
          }
        }
      }
    `, { hash })

    const tx = data.transactions.nodes[0]
    if (!tx) return null

    return {
      hash: tx.hash,
      blockHeight: tx.blockHeight,
      timestamp: new Date(tx.timestamp).getTime(),
      status: tx.status as "pending" | "confirmed" | "failed",
      type: tx.contractAddress ? "call" : "transfer",
      contractAddress: tx.contractAddress,
    }
  }

  /**
   * Get contract public state
   */
  async getContractState(address: string): Promise<ContractState | null> {
    const data = await this.query<{
      contracts: {
        nodes: Array<{
          address: string
          state: Record<string, unknown>
        }>
      }
    }>(`
      query GetContractState($address: String!) {
        contracts(filter: { address: { equalTo: $address } }) {
          nodes {
            address
            state
          }
        }
      }
    `, { address })

    const contract = data.contracts.nodes[0]
    if (!contract) return null

    return {
      address: contract.address,
      publicState: contract.state,
    }
  }

  /**
   * Search for transactions by contract address
   */
  async getContractTransactions(
    contractAddress: string,
    limit: number = 10
  ): Promise<MidnightTransaction[]> {
    const data = await this.query<{
      transactions: {
        nodes: Array<{
          hash: string
          blockHeight: number
          timestamp: string
          status: string
          contractAddress: string
          circuitName?: string
        }>
      }
    }>(`
      query GetContractTransactions($address: String!, $limit: Int!) {
        transactions(
          filter: { contractAddress: { equalTo: $address } }
          first: $limit
          orderBy: BLOCK_HEIGHT_DESC
        ) {
          nodes {
            hash
            blockHeight
            timestamp
            status
            contractAddress
            circuitName
          }
        }
      }
    `, { address: contractAddress, limit })

    return data.transactions.nodes.map(tx => ({
      hash: tx.hash,
      blockHeight: tx.blockHeight,
      timestamp: new Date(tx.timestamp).getTime(),
      status: tx.status as "pending" | "confirmed" | "failed",
      type: "call" as const,
      contractAddress: tx.contractAddress,
      circuitName: tx.circuitName,
    }))
  }
}

/**
 * Create a new IndexerProvider instance
 */
export function createIndexerProvider(config: IndexerConfig): IndexerProvider {
  return new IndexerProvider(config)
}
