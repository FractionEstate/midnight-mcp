/**
 * Midnight Get Block Tool
 *
 * Query block information from the Midnight blockchain.
 */

import { z } from "zod"
import { createProviderManager, NETWORK_CONFIGS } from "../../providers/index.js"

export const inputSchema = {
  height: z
    .number()
    .optional()
    .describe("Block height to query (defaults to latest)"),
  network: z
    .enum(["testnet", "devnet", "mainnet"])
    .optional()
    .describe("Network to query (defaults to testnet)"),
}

export const metadata = {
  name: "midnight_get_block",
  description: `Query block information from the Midnight blockchain.

Returns:
- Block height
- Block hash
- Timestamp
- Transaction count

Use this tool to:
- Get current block height (omit height parameter)
- Inspect specific blocks
- Monitor chain progress`,
  toolset: "midnight:network" as const,
  readOnly: true,
}

type GetBlockArgs = {
  height?: number
  network?: "testnet" | "devnet" | "mainnet"
}

export async function handler(args: GetBlockArgs): Promise<string> {
  const networkId = args.network ?? "testnet"
  const config = NETWORK_CONFIGS[networkId] ?? NETWORK_CONFIGS.testnet

  const manager = createProviderManager(config)
  const indexer = manager.getIndexer()

  try {
    // Get current height if not specified
    let targetHeight = args.height
    if (targetHeight === undefined) {
      targetHeight = await indexer.getBlockHeight()
    }

    const block = await indexer.getBlock(targetHeight)

    if (!block) {
      return `# ❌ Block Not Found

**Height:** ${targetHeight}
**Network:** ${networkId}

The requested block does not exist. The block may not have been produced yet or the height is invalid.

## Current Block Height

Use \`midnight_get_block\` without a height parameter to get the latest block.
`
    }

    const date = new Date(block.timestamp)

    return `# 🧱 Block Information

## Block #${block.height.toLocaleString()}

| Property | Value |
|----------|-------|
| **Height** | ${block.height.toLocaleString()} |
| **Hash** | \`${block.hash}\` |
| **Timestamp** | ${date.toISOString()} |
| **Transactions** | ${block.transactionCount} |

## Network

- **Network ID:** ${networkId}
- **Indexer:** ${config.indexerUrl}

---

${block.transactionCount > 0
  ? `📝 This block contains ${block.transactionCount} transaction(s). Use \`midnight_get_transaction\` to inspect individual transactions.`
  : `📭 This block contains no transactions.`}
`
  } catch (error) {
    return `# ❌ Block Query Failed

**Height:** ${args.height ?? "latest"}
**Network:** ${networkId}

**Error:** ${error instanceof Error ? error.message : String(error)}

## Troubleshooting

1. Check network connectivity with \`midnight_network_status\`
2. Verify the block height is valid
3. Try querying the latest block (omit height parameter)
`
  }
}
