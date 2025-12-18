import { githubClient } from "../pipeline/index.js";
import { logger } from "../utils/index.js";

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

// Documentation resource URIs
export const documentationResources: ResourceDefinition[] = [
  {
    uri: "midnight://docs/compact-reference",
    name: "Compact Language Reference",
    description:
      "Complete Compact language reference including syntax, types, built-in functions, and circuit definitions",
    mimeType: "text/markdown",
  },
  {
    uri: "midnight://docs/sdk-api",
    name: "TypeScript SDK API",
    description:
      "TypeScript SDK API documentation with type signatures and usage examples",
    mimeType: "text/markdown",
  },
  {
    uri: "midnight://docs/concepts/zero-knowledge",
    name: "Zero-Knowledge Proofs",
    description:
      "Conceptual documentation about zero-knowledge proofs in Midnight",
    mimeType: "text/markdown",
  },
  {
    uri: "midnight://docs/concepts/shielded-state",
    name: "Shielded State",
    description: "Understanding shielded (private) vs unshielded (public) state in Midnight",
    mimeType: "text/markdown",
  },
  {
    uri: "midnight://docs/concepts/witnesses",
    name: "Witness Functions",
    description: "How witness functions work in Midnight for off-chain computation",
    mimeType: "text/markdown",
  },
  {
    uri: "midnight://docs/concepts/kachina",
    name: "Kachina Protocol",
    description: "The Kachina protocol underlying Midnight's privacy features",
    mimeType: "text/markdown",
  },
];

// Static documentation content (embedded for offline access)
const EMBEDDED_DOCS: Record<string, string> = {
  "midnight://docs/compact-reference": `# Compact Language Reference

Compact is a TypeScript-inspired language for writing privacy-preserving smart contracts on Midnight.

## Basic Structure

\`\`\`compact
include "std";

ledger {
  // Public state (on-chain, visible to everyone)
  counter: Counter;
  
  // Private state (off-chain, only owner can see)
  @private
  secretValue: Field;
}

// Circuit - generates ZK proof
export circuit increment(amount: Field): Void {
  assert(amount > 0);
  ledger.counter.increment(amount);
}

// Witness - off-chain computation
witness getSecret(): Field {
  return ledger.secretValue;
}
\`\`\`

## Data Types

### Primitive Types
- \`Field\` - Finite field element (basic numeric type)
- \`Boolean\` - True or false
- \`Bytes<N>\` - Fixed-size byte array
- \`Uint<N>\` - Unsigned integer (N = 8, 16, 32, 64, 128, 256)

### Collection Types
- \`Counter\` - Incrementable/decrementable counter
- \`Map<K, V>\` - Key-value mapping
- \`Set<T>\` - Collection of unique values
- \`Opaque<T>\` - Type-safe wrapper for arbitrary data

## Circuits

Circuits are functions that generate zero-knowledge proofs:

\`\`\`compact
export circuit transfer(to: Address, amount: Field): Void {
  // Assertions create ZK constraints
  assert(amount > 0);
  assert(ledger.balance.value() >= amount);
  
  // State modifications
  ledger.balance.decrement(amount);
}
\`\`\`

### Key Points:
- \`export\` makes circuit callable from outside
- Must be deterministic (same inputs = same outputs)
- Cannot access external data directly (use witnesses)
- Assertions become ZK constraints

## Witnesses

Witnesses provide off-chain data to circuits:

\`\`\`compact
witness getCurrentPrice(): Field {
  // This runs off-chain
  return fetchPrice();
}

export circuit swap(amount: Field): Void {
  const price = getCurrentPrice();
  // Use price in circuit logic
}
\`\`\`

## Built-in Functions

### Cryptographic
- \`hash(data)\` - Compute cryptographic hash
- \`commit(value)\` - Create hiding commitment
- \`disclose(private)\` - Reveal private data

### State Operations
- \`Counter.increment(n)\` - Add to counter
- \`Counter.decrement(n)\` - Subtract from counter
- \`Counter.value()\` - Read current value
- \`Map.insert(k, v)\` - Add key-value
- \`Map.get(k)\` - Retrieve value
- \`Set.add(v)\` - Add to set
- \`Set.contains(v)\` - Check membership

## Privacy Annotations

\`\`\`compact
ledger {
  publicData: Field;      // Visible on-chain
  @private
  privateData: Field;     // Only owner sees
}
\`\`\`
`,

  "midnight://docs/sdk-api": `# Midnight TypeScript SDK API

## Installation

\`\`\`bash
npm install @midnight-ntwrk/midnight-js-contracts @midnight-ntwrk/midnight-js-types
\`\`\`

## Core Packages

### @midnight-ntwrk/midnight-js-contracts
Contract interaction layer for deploying and calling Midnight smart contracts.

\`\`\`typescript
import { Contract, DeployedContract } from '@midnight-ntwrk/midnight-js-contracts';

// Deploy a contract
const deployed = await Contract.deploy(
  wallet,
  contractArtifact,
  initialState
);

// Call a circuit
const result = await deployed.call('increment', { amount: 1n });
\`\`\`

### @midnight-ntwrk/midnight-js-types
Shared types and interfaces for the SDK.

\`\`\`typescript
import type { 
  Address,
  Transaction,
  Proof,
  ContractState 
} from '@midnight-ntwrk/midnight-js-types';
\`\`\`

### @midnight-ntwrk/wallet-api
Wallet integration interface.

\`\`\`typescript
import { WalletAPI } from '@midnight-ntwrk/wallet-api';

const wallet = await WalletAPI.connect();
const address = await wallet.getAddress();
const balance = await wallet.getBalance();
\`\`\`

## Common Patterns

### Contract Deployment
\`\`\`typescript
import { Contract } from '@midnight-ntwrk/midnight-js-contracts';
import counterContract from './counter.json';

async function deployCounter() {
  const deployed = await Contract.deploy(
    wallet,
    counterContract,
    { counter: 0n }
  );
  
  console.log('Deployed at:', deployed.address);
  return deployed;
}
\`\`\`

### Calling Circuits
\`\`\`typescript
async function increment(contract: DeployedContract, amount: bigint) {
  const tx = await contract.call('increment', { amount });
  await tx.wait();
  
  const newValue = await contract.query('counter');
  return newValue;
}
\`\`\`

### Querying State
\`\`\`typescript
async function getState(contract: DeployedContract) {
  const publicState = await contract.query('publicField');
  // Note: Private state requires witness functions
  return publicState;
}
\`\`\`
`,

  "midnight://docs/concepts/zero-knowledge": `# Zero-Knowledge Proofs in Midnight

## What are Zero-Knowledge Proofs?

Zero-knowledge proofs (ZKPs) allow one party (the prover) to convince another party (the verifier) that a statement is true, without revealing any information beyond the validity of the statement.

## How Midnight Uses ZKPs

In Midnight, every circuit execution generates a zero-knowledge proof:

1. **User calls a circuit** with private inputs
2. **Proof is generated** off-chain
3. **Only the proof** (not the inputs) is submitted to the blockchain
4. **Validators verify** the proof without knowing the inputs

## Example

\`\`\`compact
export circuit proveAge(birthYear: Field): Boolean {
  const currentYear = 2024;
  const age = currentYear - birthYear;
  
  // Proves user is over 18 without revealing exact age
  assert(age >= 18);
  return true;
}
\`\`\`

When this circuit runs:
- Input: \`birthYear = 1990\` (private)
- Output: \`true\` (public)
- Proof: "I know a birthYear that makes age >= 18" (public)

The verifier learns the user is over 18, but not their actual birth year.

## Key Properties

1. **Completeness**: Valid proofs always verify
2. **Soundness**: Invalid proofs cannot be forged
3. **Zero-knowledge**: Nothing beyond validity is revealed

## Privacy Patterns

### Selective Disclosure
\`\`\`compact
export circuit verifyCredential(
  @private credential: Credential
): Field {
  // Prove credential is valid
  assert(credential.isValid());
  
  // Only reveal specific fields
  return disclose(credential.issuer);
}
\`\`\`

### Hidden Computation
\`\`\`compact
export circuit secretBid(
  @private amount: Field,
  commitment: Field
): Void {
  // Prove bid matches commitment without revealing amount
  assert(commit(amount) == commitment);
}
\`\`\`
`,

  "midnight://docs/concepts/shielded-state": `# Shielded vs Unshielded State

Midnight supports two types of state: shielded (private) and unshielded (public).

## Unshielded State

Public state visible to everyone on the blockchain:

\`\`\`compact
ledger {
  totalSupply: Counter;          // Public counter
  balances: Map<Address, Field>; // Public mapping
}
\`\`\`

**Use for:**
- Token total supply
- Public voting tallies
- Any data that should be transparent

## Shielded State

Private state only visible to the owner:

\`\`\`compact
ledger {
  @private
  secretKey: Bytes<32>;
  
  @private
  privateBalance: Field;
}
\`\`\`

**Use for:**
- User credentials
- Private balances
- Sensitive personal data

## Hybrid Approach

Most contracts use both:

\`\`\`compact
ledger {
  // Public: anyone can see total messages
  messageCount: Counter;
  
  // Private: only owner sees message contents
  @private
  messages: Map<Field, Opaque<"string">>;
}

export circuit postMessage(content: Opaque<"string">): Void {
  const id = ledger.messageCount.value();
  
  // Public increment
  ledger.messageCount.increment(1);
  
  // Private storage
  ledger.messages.insert(id, content);
}
\`\`\`

## Transitioning Between States

### Disclose: Private → Public
\`\`\`compact
export circuit revealBalance(): Field {
  // Reveal private balance publicly
  return disclose(ledger.privateBalance);
}
\`\`\`

### Commit: Public → Hidden
\`\`\`compact
export circuit hideValue(value: Field): Field {
  // Create commitment (hides value but proves existence)
  return commit(value);
}
\`\`\`
`,

  "midnight://docs/concepts/witnesses": `# Witness Functions

Witnesses provide off-chain data to circuits in Midnight.

## Why Witnesses?

Circuits run in a ZK environment with limitations:
- Cannot make network requests
- Cannot access system time
- Cannot read external files
- Must be deterministic

Witnesses bridge this gap by running off-chain.

## Basic Witness

\`\`\`compact
// Runs off-chain, provides data to circuits
witness getTimestamp(): Field {
  return getCurrentUnixTime();
}

export circuit timedAction(): Void {
  const timestamp = getTimestamp();
  assert(timestamp > ledger.deadline);
  // ... perform action
}
\`\`\`

## Witness with Parameters

\`\`\`compact
witness fetchPrice(asset: Opaque<"string">): Field {
  // Off-chain: call price oracle
  return callPriceOracle(asset);
}

export circuit swap(asset: Opaque<"string">, amount: Field): Void {
  const price = fetchPrice(asset);
  const total = amount * price;
  // ... execute swap
}
\`\`\`

## Private Data Access

Witnesses can access private ledger state:

\`\`\`compact
ledger {
  @private
  secretNonce: Field;
}

witness getNextNonce(): Field {
  const current = ledger.secretNonce;
  return current + 1;
}

export circuit signedOperation(data: Field): Field {
  const nonce = getNextNonce();
  return hash(data, nonce);
}
\`\`\`

## Best Practices

1. **Keep witnesses simple** - Complex logic should be in circuits
2. **Handle failures gracefully** - Witnesses can fail
3. **Don't trust witness data blindly** - Validate in circuits
4. **Cache when possible** - Reduce off-chain calls

## Security Considerations

⚠️ Witnesses are NOT proven in ZK:
- Circuit verifies witness output is used correctly
- But doesn't verify HOW witness computed the value
- Malicious witnesses can provide false data

Always add assertions to validate witness data:

\`\`\`compact
export circuit usePrice(asset: Opaque<"string">): Void {
  const price = fetchPrice(asset);
  
  // Validate witness data
  assert(price > 0);
  assert(price < MAX_REASONABLE_PRICE);
  
  // ... use price
}
\`\`\`
`,

  "midnight://docs/concepts/kachina": `# Kachina Protocol

Kachina is the cryptographic protocol underlying Midnight's privacy features.

## Overview

Kachina enables:
- Private smart contracts with public verifiability
- Composable privacy across contracts
- Efficient on-chain verification

## Architecture

\`\`\`
┌─────────────────┐     ┌─────────────────┐
│   User Wallet   │────▶│  Compact Code   │
└─────────────────┘     └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │   ZK Circuit    │
                        │   (Prover)      │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │     Proof       │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │   Midnight      │
                        │   Validators    │
                        └─────────────────┘
\`\`\`

## Key Concepts

### State Model
- **Public State**: Stored on-chain, visible to all
- **Private State**: Stored off-chain, encrypted
- **Commitments**: On-chain references to private state

### Transaction Flow
1. User prepares transaction locally
2. Prover generates ZK proof
3. Transaction + proof submitted to network
4. Validators verify proof (not re-execute)
5. State updates applied

### Composability
Contracts can interact while preserving privacy:

\`\`\`compact
// Contract A
export circuit transferToken(to: Address, amount: Field): Void {
  // Private transfer logic
}

// Contract B can call Contract A
export circuit atomicSwap(
  tokenA: Address,
  tokenB: Address,
  amountA: Field,
  amountB: Field
): Void {
  // Both transfers happen atomically
  // Privacy preserved for both
}
\`\`\`

## Benefits

1. **Privacy by Default**: All computation is private unless explicitly disclosed
2. **Scalability**: Verification is faster than re-execution
3. **Flexibility**: Developers choose what to reveal
4. **Interoperability**: Works with existing blockchain infrastructure
`,
};

/**
 * Get documentation content by URI
 */
export async function getDocumentation(uri: string): Promise<string | null> {
  // Check embedded docs first
  if (EMBEDDED_DOCS[uri]) {
    return EMBEDDED_DOCS[uri];
  }

  // Try to fetch from GitHub if it's a doc path
  if (uri.startsWith("midnight://docs/")) {
    const docPath = uri.replace("midnight://docs/", "");
    try {
      // Try to fetch from midnight-docs repo
      const file = await githubClient.getFileContent(
        "midnightntwrk",
        "midnight-docs",
        `docs/${docPath}.md`
      );
      if (file) {
        return file.content;
      }
    } catch (error) {
      logger.warn(`Could not fetch doc from GitHub: ${uri}`);
    }
  }

  return null;
}

/**
 * List all available documentation resources
 */
export function listDocumentationResources(): ResourceDefinition[] {
  return documentationResources;
}
