/**
 * Midnight Get Balance Tool
 *
 * Query token balances for Midnight Network addresses.
 */

import { z } from "zod"
import { createProviderManager, NETWORK_CONFIGS } from "../../providers/index.js"

export const inputSchema = {
  address: z
    .string()
    .describe("The Midnight address to check balance for"),
  network: z
    .enum(["testnet", "devnet", "mainnet"])
    .optional()
    .describe("Network to query (defaults to testnet)"),
}

export const metadata = {
  name: "midnight_get_balance",
  description: `Query token balance for a Midnight Network address.

Returns:
- tDUST (native token) balance
- Address information

Use this tool to:
- Check wallet balances
- Verify transaction results
- Monitor account funds

**Note:** For testnet, you can get free tDUST from the faucet.`,
  toolset: "midnight:wallet" as const,
  readOnly: true,
}

type GetBalanceArgs = {
  address: string
  network?: "testnet" | "devnet" | "mainnet"
}

export async function handler(args: GetBalanceArgs): Promise<string> {
  const networkId = args.network ?? "testnet"
  const config = NETWORK_CONFIGS[networkId] ?? NETWORK_CONFIGS.testnet

  if (!config.nodeUrl) {
    return `# ❌ Balance Query Failed

**Error:** No node RPC configured for ${networkId}

Balance queries require a node RPC endpoint. The ${networkId} network may not have a public RPC available.

## Alternative

Use the indexer to query transaction history instead:
\`\`\`
midnight_get_transaction { address: "${args.address}" }
\`\`\`
`
  }

  const manager = createProviderManager(config)
  const node = manager.getNode()

  if (!node) {
    return `# ❌ Balance Query Failed

**Error:** Node provider not available

Please check your network configuration.
`
  }

  try {
    const balance = await node.getBalance(args.address)
    const nonce = await node.getNonce(args.address)

    // Format balance (assuming 18 decimals like ETH)
    const balanceFormatted = formatBalance(balance, 18)

    return `# 💰 Midnight Balance

## Address
\`${args.address}\`

## Balance

| Token | Amount | Raw |
|-------|--------|-----|
| tDUST | ${balanceFormatted} | ${balance.toString()} |

## Account Info

- **Nonce:** ${nonce}
- **Network:** ${networkId}

---

${networkId === "testnet" ? `💧 **Need testnet tokens?** Visit the [Midnight Testnet Faucet](https://faucet.testnet.midnight.network)` : ""}
`
  } catch (error) {
    return `# ❌ Balance Query Failed

**Address:** \`${args.address}\`
**Network:** ${networkId}

**Error:** ${error instanceof Error ? error.message : String(error)}

## Troubleshooting

1. Verify the address format is correct
2. Check network connectivity with \`midnight_network_status\`
3. Ensure the address exists on ${networkId}
`
  }
}

/**
 * Format a bigint balance with decimals
 */
function formatBalance(balance: bigint, decimals: number): string {
  const str = balance.toString().padStart(decimals + 1, "0")
  const intPart = str.slice(0, -decimals) || "0"
  const decPart = str.slice(-decimals).replace(/0+$/, "")

  if (decPart) {
    return `${intPart}.${decPart.slice(0, 6)}`
  }
  return intPart
}
