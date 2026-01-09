/**
 * Midnight Network Status Tool
 *
 * Check the health status of Midnight Network services.
 */

import { z } from "zod"
import { createProviderManager, NETWORK_CONFIGS } from "../../providers/index.js"
import type { ToolsetId } from "../../types/mcp.js"
import { NetworkError } from "../../errors/errors.js"

export const inputSchema = {
  network: z
    .enum(["testnet", "devnet", "mainnet"])
    .optional()
    .describe("Network to check (defaults to testnet)"),
  indexer_url: z
    .string()
    .optional()
    .describe("Custom indexer URL"),
  proof_server_url: z
    .string()
    .optional()
    .describe("Custom proof server URL"),
  node_url: z
    .string()
    .optional()
    .describe("Custom node RPC URL"),
}

export const metadata = {
  name: "midnight_network_status",
  description: `Check the health status of Midnight Network services.

Returns the status of:
- Indexer (GraphQL API for blockchain data)
- Proof Server (ZK proof generation)
- Node RPC (transaction submission)
- Current block height
- Network ID

Use this tool to:
- Verify network connectivity before operations
- Debug connection issues
- Check service latency`,

  // Enhanced metadata for new patterns
  toolset: "midnight:network" as ToolsetId,
  readOnly: true, // This is a read-only query tool
  tags: ["network", "status", "health", "diagnostic"],
}

type NetworkStatusArgs = {
  network?: "testnet" | "devnet" | "mainnet"
  indexer_url?: string
  proof_server_url?: string
  node_url?: string
}

export async function handler(args: NetworkStatusArgs): Promise<string> {
  const networkId = args.network ?? "testnet"
  const baseConfig = NETWORK_CONFIGS[networkId] ?? NETWORK_CONFIGS.testnet

  const config = {
    ...baseConfig,
    indexerUrl: args.indexer_url ?? baseConfig.indexerUrl,
    proofServerUrl: args.proof_server_url ?? baseConfig.proofServerUrl,
    nodeUrl: args.node_url ?? baseConfig.nodeUrl,
  }

  const manager = createProviderManager(config)

  try {
    const status = await manager.getNetworkStatus()

    const formatStatus = (service: { healthy: boolean; latency?: number; version?: string; error?: string; url: string }) => {
      if (service.healthy) {
        return `✅ Healthy (${service.latency}ms)${service.version ? ` - v${service.version}` : ""}`
      }
      return `❌ Unhealthy - ${service.error ?? "Unknown error"}`
    }

    return `# 🌙 Midnight Network Status

## Network: ${status.networkId}

### Services

| Service | Status | URL |
|---------|--------|-----|
| Indexer | ${formatStatus(status.indexer)} | ${status.indexer.url} |
| Proof Server | ${formatStatus(status.proofServer)} | ${status.proofServer.url} |
${status.node ? `| Node RPC | ${formatStatus(status.node)} | ${status.node.url} |` : "| Node RPC | ⚪ Not configured | - |"}

### Blockchain

- **Block Height:** ${status.blockHeight.toLocaleString()}

---

${!status.indexer.healthy || !status.proofServer.healthy
  ? `⚠️ **Warning:** Some services are unhealthy. Check your network configuration or try again later.`
  : `✅ **All services operational.** Ready for Midnight development!`}
`
  } catch (error) {
    // Use typed error for network failures
    if (error instanceof Error) {
      throw new NetworkError(
        "NETWORK_STATUS_ERROR",
        `Network status check failed: ${error.message}`,
        undefined,
        config.indexerUrl,
        error
      )
    }

    return `# ❌ Network Status Check Failed

**Error:** ${error instanceof Error ? error.message : String(error)}

## Troubleshooting

1. Check your network configuration
2. Verify the URLs are correct
3. Ensure you have internet connectivity
4. Try a different network (testnet/devnet)

## Current Configuration

- **Network:** ${networkId}
- **Indexer URL:** ${config.indexerUrl}
- **Proof Server URL:** ${config.proofServerUrl}
- **Node URL:** ${config.nodeUrl ?? "Not configured"}
`
  }
}
