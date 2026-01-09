/**
 * Compact Language Overview Resource
 *
 * Introduction to the Compact smart contract language for Midnight Network.
 * Based on official Midnight documentation: https://docs.midnight.network
 */

export const metadata = {
  uri: "midnight://compact/overview",
  name: "Compact Language Overview",
  description: "Introduction to Compact, the privacy-preserving smart contract language for Midnight Network",
  mimeType: "text/markdown",
}

export async function handler(): Promise<string> {
  return `# Compact Language Overview

> Based on official Midnight documentation: https://docs.midnight.network

## What is Compact?

Compact is a **strongly statically typed, bounded smart contract language**, designed to be used in combination with TypeScript for writing smart contracts for Midnight's three-part structure:

1. **Replicated component** on a public ledger
2. **Zero-knowledge circuit component** - confidentially proving correctness
3. **Local, off-chain component** - arbitrary code execution

Like TypeScript, Compact is an **eager call-by-value language**.

## Contract Components

Each contract in Compact can have four kinds of code:

| Component | Purpose |
|-----------|---------|
| **Type declarations** | Support all other components |
| **Ledger declarations** | Data stored on the public ledger |
| **Witness functions** | Supplied in TypeScript, run locally |
| **Circuit definitions** | Operational core of smart contracts |

## Key Features

### 🔐 Privacy by Default
- **Zero-knowledge proofs** (ZK-SNARKs) verify computations without exposing inputs
- **Shielded transactions** prevent correlation
- **Selective disclosure** - reveal only what's necessary

### ⚡ Developer-Friendly
- **TypeScript-based syntax** - familiar to web developers
- **Strong static typing** - compiler rejects type-incorrect programs
- **Automatic proof generation** - no cryptography expertise needed

### 🔗 Blockchain Integration
- **Ledger state** for public on-chain storage
- **Circuits** create ZK proofs for transactions
- **Witnesses** handle private computations off-chain

## Basic Contract Example

\`\`\`compact
// Type declarations
struct Thing {
  triple: Vector<3, Field>,
  flag: Boolean,
}

// Ledger state (public, on-chain)
ledger {
  counter: Counter;
  owner: Bytes<32>;
}

// Circuit (public function, creates ZK proof)
export circuit increment(): [] {
  ledger.counter = ledger.counter + 1;
}

// Witness (private computation, runs locally)
witness get_secret(): Field {
  // Supplied in TypeScript
}
\`\`\`

## Core Concepts

### Ledger State
Public storage on the blockchain, declared with the \`ledger\` keyword:
\`\`\`compact
ledger {
  balance: Uint<128>;
  is_active: Boolean;
  messages: Map<Uint<32>, Bytes<256>>;
}
\`\`\`

### Circuits
Entry points that generate zero-knowledge proofs:
- Accept typed parameters
- Can read/write ledger state
- Exported at top level for external calls
- Must have unique names when exported

### Witnesses
Private functions supplied in TypeScript:
- Run on the user's device
- Access private data locally
- Return values to circuits
- Never expose private data on-chain

### Modules
Code organization with namespaces:
\`\`\`compact
module MyModule {
  export { myCircuit };
  circuit myCircuit(): [] { }
}

import MyModule;
import MyModule prefix My_;
\`\`\`

## Type System Summary

| Type | Description |
|------|-------------|
| \`Boolean\` | True/false | \`is_valid: Boolean\` |
| \`Field\` | Prime field element | \`hash: Field\` |
| \`Uint<N>\` | Unsigned integer (N bits) | \`amount: Uint<256>\` |
| \`Int<N>\` | Signed integer (N bits) | \`delta: Int<64>\` |
| \`Address\` | Midnight address | \`owner: Address\` |
| \`Bytes\` | Byte array | \`data: Bytes\` |

## Privacy Model

1. **Ledger** → Public, on-chain, visible to all
2. **Private State** → Local, encrypted, never shared
3. **Witnesses** → Compute on private data, return commitments
4. **Circuits** → Verify proofs, update ledger

## Next Steps

- 📖 Read the [Compact Reference](midnight://compact/reference)
- 🔧 Learn about [Circuits and Witnesses](midnight://compact/circuits)
- 💾 Understand [State Management](midnight://compact/state)
- 🚀 Build your [First Contract](midnight://tutorials/counter)
`
}
