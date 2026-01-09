/**
 * Midnight Node Provider
 *
 * Client for interacting with the Midnight Network Node RPC API.
 * Handles transaction submission and node status queries.
 */

import type { ServiceStatus } from "../types/midnight.js"

export interface NodeConfig {
  url: string
  timeout?: number
}

export interface SubmitTransactionResult {
  hash: string
  status: "submitted" | "rejected"
  error?: string
}

export class NodeProvider {
  private url: string
  private timeout: number

  constructor(config: NodeConfig) {
    this.url = config.url
    this.timeout = config.timeout ?? 30000
  }

  /**
   * Make an RPC call to the node
   */
  private async rpc<T>(method: string, params?: unknown[]): Promise<T> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method,
        params: params ?? [],
      }),
      signal: AbortSignal.timeout(this.timeout),
    })

    if (!response.ok) {
      throw new Error(`Node RPC failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json() as {
      result?: T
      error?: { code: number; message: string }
    }

    if (result.error) {
      throw new Error(`RPC error: ${result.error.code} - ${result.error.message}`)
    }

    return result.result as T
  }

  /**
   * Check node health status
   */
  async getStatus(): Promise<ServiceStatus> {
    const startTime = Date.now()
    try {
      const info = await this.rpc<{
        version: string
        networkId: string
        blockHeight: number
      }>("midnight_nodeInfo")

      return {
        url: this.url,
        healthy: true,
        latency: Date.now() - startTime,
        version: info.version,
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
   * Get current block height from node
   */
  async getBlockHeight(): Promise<number> {
    return this.rpc<number>("midnight_blockNumber")
  }

  /**
   * Get network ID
   */
  async getNetworkId(): Promise<string> {
    const info = await this.rpc<{ networkId: string }>("midnight_nodeInfo")
    return info.networkId
  }

  /**
   * Submit a signed transaction to the network
   */
  async submitTransaction(signedTx: string): Promise<SubmitTransactionResult> {
    try {
      const hash = await this.rpc<string>("midnight_sendRawTransaction", [signedTx])
      return {
        hash,
        status: "submitted",
      }
    } catch (error) {
      return {
        hash: "",
        status: "rejected",
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(hash: string): Promise<{
    hash: string
    blockHeight: number
    status: "success" | "failed"
    gasUsed: bigint
  } | null> {
    const receipt = await this.rpc<{
      transactionHash: string
      blockNumber: number
      status: string
      gasUsed: string
    } | null>("midnight_getTransactionReceipt", [hash])

    if (!receipt) return null

    return {
      hash: receipt.transactionHash,
      blockHeight: receipt.blockNumber,
      status: receipt.status === "0x1" ? "success" : "failed",
      gasUsed: BigInt(receipt.gasUsed),
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(tx: {
    to?: string
    data: string
    value?: string
  }): Promise<bigint> {
    const gas = await this.rpc<string>("midnight_estimateGas", [tx])
    return BigInt(gas)
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    const price = await this.rpc<string>("midnight_gasPrice")
    return BigInt(price)
  }

  /**
   * Get account balance (tDUST)
   */
  async getBalance(address: string): Promise<bigint> {
    const balance = await this.rpc<string>("midnight_getBalance", [address, "latest"])
    return BigInt(balance)
  }

  /**
   * Get account nonce
   */
  async getNonce(address: string): Promise<number> {
    const nonce = await this.rpc<string>("midnight_getTransactionCount", [address, "latest"])
    return parseInt(nonce, 16)
  }
}

/**
 * Create a new NodeProvider instance
 */
export function createNodeProvider(config: NodeConfig): NodeProvider {
  return new NodeProvider(config)
}
