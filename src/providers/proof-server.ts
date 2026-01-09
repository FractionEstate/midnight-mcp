/**
 * Midnight Proof Server Provider
 *
 * Client for interacting with the Midnight Network Proof Server.
 * Handles zero-knowledge proof generation for contract transactions.
 */

import type { ServiceStatus } from "../types/midnight.js"

export interface ProofServerConfig {
  url: string
  timeout?: number
}

export interface ProofRequest {
  contractAddress: string
  circuitName: string
  inputs: Record<string, unknown>
  witnesses: Record<string, unknown>
}

export interface ProofResult {
  proof: string
  publicInputs: string[]
  verificationKey: string
}

export class ProofServerProvider {
  private url: string
  private timeout: number

  constructor(config: ProofServerConfig) {
    this.url = config.url
    this.timeout = config.timeout ?? 120000 // Proof generation can take time
  }

  /**
   * Check proof server health status
   */
  async getStatus(): Promise<ServiceStatus> {
    const startTime = Date.now()
    try {
      const response = await fetch(`${this.url}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }

      const data = await response.json() as { version?: string }

      return {
        url: this.url,
        healthy: true,
        latency: Date.now() - startTime,
        version: data.version,
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
   * Generate a zero-knowledge proof for a circuit execution
   */
  async generateProof(request: ProofRequest): Promise<ProofResult> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.url}/prove`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contract_address: request.contractAddress,
          circuit_name: request.circuitName,
          inputs: request.inputs,
          witnesses: request.witnesses,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Proof generation failed: ${response.status} - ${errorText}`)
      }

      const result = await response.json() as {
        proof: string
        public_inputs: string[]
        verification_key: string
      }

      return {
        proof: result.proof,
        publicInputs: result.public_inputs,
        verificationKey: result.verification_key,
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Verify a proof
   */
  async verifyProof(
    proof: string,
    publicInputs: string[],
    verificationKey: string
  ): Promise<boolean> {
    const response = await fetch(`${this.url}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        proof,
        public_inputs: publicInputs,
        verification_key: verificationKey,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      throw new Error(`Verification request failed: ${response.status}`)
    }

    const result = await response.json() as { valid: boolean }
    return result.valid
  }

  /**
   * Get the proving key for a circuit
   */
  async getProvingKey(contractAddress: string, circuitName: string): Promise<string> {
    const response = await fetch(
      `${this.url}/keys/${contractAddress}/${circuitName}/proving`,
      {
        method: "GET",
        signal: AbortSignal.timeout(30000),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch proving key: ${response.status}`)
    }

    const result = await response.json() as { key: string }
    return result.key
  }

  /**
   * Get the verifying key for a circuit
   */
  async getVerifyingKey(contractAddress: string, circuitName: string): Promise<string> {
    const response = await fetch(
      `${this.url}/keys/${contractAddress}/${circuitName}/verifying`,
      {
        method: "GET",
        signal: AbortSignal.timeout(30000),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch verifying key: ${response.status}`)
    }

    const result = await response.json() as { key: string }
    return result.key
  }
}

/**
 * Create a new ProofServerProvider instance
 */
export function createProofServerProvider(config: ProofServerConfig): ProofServerProvider {
  return new ProofServerProvider(config)
}
