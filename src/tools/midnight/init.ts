/**
 * Midnight Init Tool
 *
 * Initialize Midnight development context and establish documentation requirements.
 */

import { z } from "zod"

export const inputSchema = {
  network: z
    .enum(["testnet", "devnet", "mainnet"])
    .optional()
    .describe("Network to configure (defaults to testnet)"),
  indexer_url: z
    .string()
    .optional()
    .describe("Custom indexer URL (overrides network default)"),
  proof_server_url: z
    .string()
    .optional()
    .describe("Custom proof server URL (overrides network default)"),
}

export const metadata = {
  name: "midnight_init",
  description: `⚠️ CALL THIS FIRST - Initialize Midnight Network development context.

**IMPORTANT: This tool MUST be called at the START of every Midnight development session.**

This tool:
- Establishes network configuration (testnet, devnet, or mainnet)
- Documents all available Midnight MCP tools
- Provides guidance on Compact smart contract development
- Sets up provider connections for blockchain queries

Use this tool to:
- Configure which Midnight network to connect to
- Understand available tools for contract development
- Learn about Compact language basics
- Get started with Midnight dApp development`,
  toolset: "midnight:dev" as const,
  readOnly: true,
}

type InitArgs = {
  network?: "testnet" | "devnet" | "mainnet"
  indexer_url?: string
  proof_server_url?: string
}

export async function handler(args: InitArgs): Promise<string> {
  const network = args.network ?? "testnet"

  const guidance = `# 🌙 Midnight Network Development - Initialized

> Based on official documentation: https://docs.midnight.network

## Network Configuration
- **Network:** ${network}
- **Indexer:** ${args.indexer_url ?? `Default ${network} indexer`}
- **Proof Server:** ${args.proof_server_url ?? `Default ${network} proof server`}
- **Status:** Testnet active (APIs v0.7.0 - breaking changes possible)

---

## 🛠️ Available Midnight Tools

### 1. **midnight_network_status** - Check Network Health
- Returns status of Indexer, Proof Server, and Node
- Shows current block height and network ID
- Use to verify connectivity before operations

### 2. **midnight_get_balance** - Query Token Balances
- Get tDUST (native token) balance for any address
- Supports testnet faucet information

### 3. **midnight_get_block** - Query Block Data
- Get block information by height
- Returns hash, timestamp, transaction count

### 4. **midnight_get_transaction** - Query Transactions
- Look up transaction by hash
- Shows status, block height, contract interactions

### 5. **midnight_search_docs** - Search Documentation
- Search Midnight official documentation
- Find guides on Compact, SDK, and dApp development

### 6. **midnight_scaffold_project** - Create New Project
- Scaffold a new Midnight dApp project
- Templates: counter, token, voting, blank
- Includes React UI option

### 7. **midnight_compile_contract** - Compile Compact Contracts
- Compile Compact (.compact) source files
- Generates TypeScript bindings and ZK artifacts

### 8. **midnight_analyze_contract** - Analyze Contract
- Static analysis of Compact contracts
- Identifies patterns, potential issues, and best practices

### 9. **midnight_check_versions** - Check SDK Versions
- Verify SDK package versions are up to date
- Identify breaking changes between versions

---

## 📚 Compact Language Quick Reference

Compact is Midnight's privacy-preserving smart contract language.

### Basic Structure
\`\`\`compact
// Import standard library for common types
import CompactStandardLibrary;

// Type aliases for clarity
type Address = Bytes<32>;

// Ledger state (public, on-chain)
ledger {
  counter: Counter;
  owner: Address;
}

// Exported circuit (creates ZK proof when called)
export circuit increment(): [] {
  ledger.counter = increment(ledger.counter);
}

// Witness declaration (private computation in TypeScript)
witness get_secret(): Field;
\`\`\`

### Key Concepts
- **Ledger State**: Public, on-chain storage (visible to all)
- **Private State**: User-local data (never on-chain)
- **Circuits**: Entry points that generate ZK proofs
- **Witnesses**: Private computations supplied in TypeScript
- **Zero-Knowledge Proofs**: Verify correctness without revealing inputs

### Three-Part Contract Structure
1. **Replicated Component**: Runs on the public ledger
2. **Zero-Knowledge Circuit**: Proves correctness confidentially
3. **Local Off-Chain Component**: Runs on user's device (witnesses)

---

## 🚀 Quick Start Workflow

1. \`midnight_scaffold_project\` - Create a new project
2. Write your Compact contract in \`contracts/\`
3. \`midnight_compile_contract\` - Compile to TypeScript
4. \`midnight_network_status\` - Verify network connection
5. Build and deploy your dApp

---

## 📖 Documentation Resources

Use \`midnight_search_docs\` to find:
- [Quickstart Guide](https://docs.midnight.network/quickstart)
- [Compact Language Reference](https://docs.midnight.network/develop/reference/compact/lang-ref)
- [Standard Library](https://docs.midnight.network/develop/reference/compact/compact-std-library)
- [API Documentation](https://docs.midnight.network/develop/reference/midnight-api)
- [Tutorials](https://docs.midnight.network/develop/tutorial)
- [FAQ](https://docs.midnight.network/develop/faq)

---

**Ready to build on Midnight! Use the tools above to develop your dApp.**
`

  return guidance
}
