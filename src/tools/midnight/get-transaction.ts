/**
 * Midnight Get Transaction Tool
 *
 * Query transaction details from the Midnight blockchain.
 */

import { z } from "zod"
import { createProviderManager, NETWORK_CONFIGS } from "../../providers/index.js"

export const inputSchema = {
  hash: z
    .string()
    .describe("Transaction hash to query"),
  network: z
    .enum(["testnet", "devnet", "mainnet"])
    .optional()
    .describe("Network to query (defaults to testnet)"),
}

export const metadata = {
  name: "midnight_get_transaction",
  description: `Query transaction details from the Midnight blockchain.

Returns:
- Transaction hash
- Block height
- Status (pending/confirmed/failed)
- Contract address (if applicable)
- Circuit name (if contract call)

Use this tool to:
- Check transaction status
- Debug failed transactions
- Inspect contract interactions`,
  toolset: "midnight:network" as const,
  readOnly: true,
}

type GetTransactionArgs = {
  hash: string
  network?: "testnet" | "devnet" | "mainnet"
}

export async function handler(args: GetTransactionArgs): Promise<string> {
  const networkId = args.network ?? "testnet"
  const config = NETWORK_CONFIGS[networkId] ?? NETWORK_CONFIGS.testnet

  const manager = createProviderManager(config)
  const indexer = manager.getIndexer()

  try {
    const tx = await indexer.getTransaction(args.hash)

    if (!tx) {
      return `# ❌ Transaction Not Found

**Hash:** \`${args.hash}\`
**Network:** ${networkId}

The transaction was not found. It may:
- Still be pending (not yet indexed)
- Have an invalid hash
- Be on a different network

## Suggestions

1. Verify the transaction hash is correct
2. Wait a few seconds and try again (if just submitted)
3. Check you're querying the correct network
`
    }

    const statusEmoji = {
      pending: "⏳",
      confirmed: "✅",
      failed: "❌",
    }[tx.status]

    const date = new Date(tx.timestamp)

    return `# 📜 Transaction Details

## ${statusEmoji} ${tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}

| Property | Value |
|----------|-------|
| **Hash** | \`${tx.hash}\` |
| **Block** | #${tx.blockHeight.toLocaleString()} |
| **Timestamp** | ${date.toISOString()} |
| **Type** | ${tx.type} |
${tx.contractAddress ? `| **Contract** | \`${tx.contractAddress}\` |` : ""}
${tx.circuitName ? `| **Circuit** | ${tx.circuitName} |` : ""}

## Network

- **Network ID:** ${networkId}

---

${tx.status === "failed"
  ? `⚠️ **Transaction failed.** Check the contract inputs and try again.`
  : tx.status === "pending"
  ? `⏳ **Transaction pending.** It should be confirmed in the next few blocks.`
  : `✅ **Transaction confirmed.** The operation completed successfully.`}
`
  } catch (error) {
    return `# ❌ Transaction Query Failed

**Hash:** \`${args.hash}\`
**Network:** ${networkId}

**Error:** ${error instanceof Error ? error.message : String(error)}

## Troubleshooting

1. Check network connectivity with \`midnight_network_status\`
2. Verify the transaction hash format
3. Ensure you're querying the correct network
`
  }
}
