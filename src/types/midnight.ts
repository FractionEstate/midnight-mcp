/**
 * Midnight Network Types
 *
 * Type definitions for Midnight Network integration including
 * contract interactions, network configuration, and state management.
 */

// Network configuration types
export interface MidnightNetworkConfig {
  networkId: "testnet" | "devnet" | "mainnet"
  indexerUrl: string
  proofServerUrl: string
  nodeUrl?: string
}

// Contract types
export interface CompiledContract {
  name: string
  bytecode: string
  abi: ContractABI
  zkConfig?: ZKConfig
}

export interface ContractABI {
  circuits: CircuitDefinition[]
  witnesses: WitnessDefinition[]
  types: TypeDefinition[]
}

export interface CircuitDefinition {
  name: string
  inputs: FieldDefinition[]
  outputs: FieldDefinition[]
  isPublic: boolean
}

export interface WitnessDefinition {
  name: string
  inputs: FieldDefinition[]
  description?: string
}

export interface FieldDefinition {
  name: string
  type: string
  isPrivate?: boolean
}

export interface TypeDefinition {
  name: string
  fields: FieldDefinition[]
}

export interface ZKConfig {
  provingKey: string
  verifyingKey: string
  circuitWasm?: string
}

// Transaction types
export interface MidnightTransaction {
  hash: string
  blockHeight: number
  timestamp: number
  status: "pending" | "confirmed" | "failed"
  type: "deploy" | "call" | "transfer"
  contractAddress?: string
  circuitName?: string
}

// State types
export interface ContractState {
  address: string
  publicState: Record<string, unknown>
  privateState?: Record<string, unknown>
}

// Balance types
export interface TokenBalance {
  token: string
  balance: bigint
  symbol: string
  decimals: number
}

// Network status types
export interface NetworkStatus {
  indexer: ServiceStatus
  proofServer: ServiceStatus
  node?: ServiceStatus
  blockHeight: number
  networkId: string
}

export interface ServiceStatus {
  url: string
  healthy: boolean
  latency?: number
  version?: string
  error?: string
}

// Scaffold project types
export interface ScaffoldOptions {
  name: string
  template: "counter" | "token" | "voting" | "blank"
  includeUI: boolean
  packageManager: "npm" | "pnpm" | "yarn"
}

// Tool result types
export interface ToolResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  metadata?: Record<string, unknown>
}
