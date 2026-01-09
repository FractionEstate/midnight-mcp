/**
 * Midnight Network Overview Resource
 *
 * Comprehensive overview of the Midnight Network blockchain.
 * Based on official Midnight documentation: https://docs.midnight.network
 */

export const metadata = {
  uri: "midnight://network/overview",
  name: "Midnight Network Overview",
  description:
    "Comprehensive overview of the Midnight Network - a zero-knowledge partner chain to Cardano",
  mimeType: "text/markdown",
}

export async function handler(): Promise<string> {
  return `# Midnight Network

> Based on official Midnight documentation: https://docs.midnight.network

## What is Midnight?

Midnight is a **zero-knowledge partner chain to Cardano** that enables developers to build applications that can **selectively hide sensitive information** while still allowing public verification of correctness through advanced zero-knowledge cryptography.

Midnight solves the fundamental tension between **transparency and privacy** in blockchain technology. Unlike traditional blockchains where all transaction data is publicly visible, Midnight allows smart contracts to operate on private data while maintaining security and verifiability.

## Current Status

| Aspect | Details |
|--------|---------|
| **Network** | Testnet active for development and testing |
| **API Version** | v0.7.0 (beta - breaking changes possible) |
| **Test Tokens** | tDUST available via faucet |
| **Block Time** | 6 seconds |

## Key Technologies

### 🔐 Compact Programming Language
TypeScript-based syntax compiled to zero-knowledge circuits for writing privacy-preserving smart contracts.

### 💰 Dual-Token System
- **NIGHT**: Native utility token for governance and consensus (24B supply)
- **DUST**: Shielded network resource for transaction fees (decays over time)

### 🛡️ Zero-Knowledge Proofs
ZK-SNARKs enable privacy, prevent transaction correlation, and allow selective disclosure.

### 🔗 Partner Chain Architecture
Operates as a partner chain to Cardano, inheriting proven security while adding specialized privacy capabilities.

## Development Stack

| Component | Purpose |
|-----------|---------|
| **Compact** | Smart contract language |
| **TypeScript** | DApp development |
| **Proof Server** | Generates zero-knowledge proofs |
| **Midnight Node** | Connects to network |
| **Lace Wallet** | Browser integration |
| **Indexer** | Blockchain data queries |

## Three-Part Contract Structure

Midnight contracts have three components:

1. **Replicated Component** - Runs on the public ledger
2. **Zero-Knowledge Circuit** - Confidentially proves correctness
3. **Local Off-Chain Component** - Performs arbitrary code on user's device

## Getting Started

### Quickstart
Complete setup from zero to first application:
https://docs.midnight.network/quickstart/

### Development Guide
High-level architecture and key concepts:
https://docs.midnight.network/develop/

### Complete Tutorial
Build a complete application from scratch:
https://docs.midnight.network/develop/tutorial/

### How It Works
How all the pieces fit together:
https://docs.midnight.network/develop/tutorial/high-level-arch

## Compact Language Resources

| Resource | URL |
|----------|-----|
| Language Philosophy | https://docs.midnight.network/develop/reference/compact/ |
| Language Reference | https://docs.midnight.network/develop/reference/compact/lang-ref |
| Standard Library | https://docs.midnight.network/develop/reference/compact/compact-std-library/ |
| Grammar Specification | https://docs.midnight.network/develop/reference/compact/compact-grammar |

## API Reference

| API | URL |
|-----|-----|
| Main API | https://docs.midnight.network/develop/reference/midnight-api/ |
| Compact Runtime | https://docs.midnight.network/develop/reference/midnight-api/compact-runtime/ |
| Low-level Operations | https://docs.midnight.network/develop/reference/midnight-api/compact-runtime/functions/addField |

## Examples and Use Cases

Sample Repository with real-world reference implementations:
- Bulletin board
- Private auction
- Identity verification

https://docs.midnight.network/develop/tutorial/building/examples-repo

## Validator Operations

For Cardano SPOs who want to run Midnight validators:
https://docs.midnight.network/validate/run-a-validator

## Community & Support

| Resource | Link |
|----------|------|
| FAQ | https://docs.midnight.network/develop/faq |
| Learning Resources | https://docs.midnight.network/learn/resources |
| Glossary | https://docs.midnight.network/learn/glossary |
| Discord | https://discord.com/invite/midnightnetwork |
| GitHub | https://github.com/midnight-ntwrk |
| Twitter/X | https://x.com/MidnightNtwrk |
| Developer Hub | https://midnight.network/developer-hub |
| Full Documentation | https://docs.midnight.network |
`
}
