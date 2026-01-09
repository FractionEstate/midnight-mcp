/**
 * Midnight SDK Overview Resource
 *
 * Introduction to the Midnight.js SDK for building dApps.
 * Based on official Midnight documentation: https://docs.midnight.network
 */

export const metadata = {
  uri: "midnight://sdk/overview",
  name: "Midnight.js SDK Overview",
  description: "Introduction to the Midnight JavaScript/TypeScript SDK for building decentralized applications",
  mimeType: "text/markdown",
}

export async function handler(): Promise<string> {
  return `# Midnight.js SDK Overview

> Based on official Midnight documentation: https://docs.midnight.network

## Introduction

The Midnight.js SDK provides TypeScript/JavaScript libraries for building decentralized applications on the Midnight Network. It handles contract deployment, transaction creation, proof generation, and state management.

**Current Status**: Testnet active (APIs v0.7.0 - breaking changes possible)

## Development Stack

| Component | Purpose |
|-----------|---------|
| **Compact** | Smart contract language (TypeScript-based syntax) |
| **Proof Server** | Generates zero-knowledge proofs |
| **Midnight Node** | Connects to the network |
| **Lace Wallet** | Browser integration for users |
| **Indexer** | Queries blockchain data |

## Key Packages

| Package | Description |
|---------|-------------|
| \`@midnight-ntwrk/midnight-js-contracts\` | Contract deployment and interaction |
| \`@midnight-ntwrk/midnight-js-types\` | Shared type definitions |
| \`@midnight-ntwrk/compact-runtime\` | Execute Compact programs |
| \`@midnight-ntwrk/midnight-js-http-client-proof-provider\` | Proof server client |
| \`@midnight-ntwrk/midnight-js-indexer-public-data-provider\` | Blockchain data queries |
| \`@midnight-ntwrk/midnight-js-level-private-state-provider\` | Private state storage |
| \`@midnight-ntwrk/midnight-js-fetch-zk-config-provider\` | ZK artifact fetching |
| \`@midnight-ntwrk/midnight-js-network-id\` | Network configuration |
| \`@midnight-ntwrk/ledger\` | Transaction utilities |
| \`@midnight-ntwrk/dapp-connector\` | Wallet connection |

## Installation

\`\`\`bash
npm install @midnight-ntwrk/midnight-js-contracts \\
            @midnight-ntwrk/midnight-js-types \\
            @midnight-ntwrk/compact-runtime \\
            @midnight-ntwrk/midnight-js-http-client-proof-provider \\
            @midnight-ntwrk/midnight-js-indexer-public-data-provider \\
            @midnight-ntwrk/midnight-js-level-private-state-provider
\`\`\`

## Quick Start

### 1. Configure Providers

\`\`\`typescript
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

// Proof generation
const proofProvider = httpClientProofProvider({
  url: 'https://proof-server.testnet.midnight.network'
});

// Blockchain data
const publicDataProvider = indexerPublicDataProvider({
  url: 'https://indexer.testnet.midnight.network/graphql'
});

// Private state storage
const privateStateProvider = levelPrivateStateProvider({
  path: './private-state'
});
\`\`\`

### 2. Deploy a Contract

\`\`\`typescript
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { ContractArtifacts } from './generated/counter';

const deployment = await deployContract({
  artifacts: ContractArtifacts,
  constructorArgs: [0n],
  proofProvider,
  publicDataProvider,
  wallet
});

console.log('Contract deployed at:', deployment.address);
\`\`\`

### 3. Interact with Contract

\`\`\`typescript
import { createContractClient } from '@midnight-ntwrk/midnight-js-contracts';
import { CounterContract } from './generated/counter';

const client = createContractClient<CounterContract>({
  address: deployment.address,
  proofProvider,
  publicDataProvider,
  privateStateProvider,
  wallet
});

// Call a circuit
await client.increment();

// Read state
const state = await client.getState();
console.log('Counter value:', state.counter);
\`\`\`

## Provider Pattern

The SDK uses a provider pattern for flexibility:

\`\`\`typescript
interface ProofProvider {
  prove(circuit: string, inputs: unknown): Promise<Proof>;
}

interface PublicDataProvider {
  getContractState(address: string): Promise<ContractState>;
  submitTransaction(tx: Transaction): Promise<string>;
}

interface PrivateStateProvider {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}
\`\`\`

## Wallet Integration (Lace)

Connect to the Lace Wallet for browser integration:

\`\`\`typescript
import { connectWallet } from '@midnight-ntwrk/dapp-connector';

const wallet = await connectWallet();

// Get account info
const address = await wallet.getAddress();
const balance = await wallet.getBalance();

// Sign transactions
const signed = await wallet.signTransaction(tx);
\`\`\`

## Network Configuration

\`\`\`typescript
import { NetworkId } from '@midnight-ntwrk/midnight-js-network-id';

// Available networks
const networks = {
  testnet: {
    id: NetworkId.Testnet,
    indexer: 'https://indexer.testnet.midnight.network/graphql',
    proofServer: 'https://proof-server.testnet.midnight.network',
    node: 'https://rpc.testnet.midnight.network'
  },
  devnet: {
    id: NetworkId.Devnet,
    indexer: 'http://localhost:8080/graphql',
    proofServer: 'http://localhost:6300',
    node: 'http://localhost:9944'
  }
};
\`\`\`

## Error Handling

\`\`\`typescript
import { MidnightError, ProofError, NetworkError } from '@midnight-ntwrk/midnight-js-types';

try {
  await client.transfer(recipient, amount);
} catch (error) {
  if (error instanceof ProofError) {
    console.error('Proof generation failed:', error.message);
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  } else {
    throw error;
  }
}
\`\`\`

## TypeScript Support

The SDK is fully typed. Contract compilation generates TypeScript types:

\`\`\`typescript
// Generated from contract.compact
export interface CounterState {
  counter: bigint;
  owner: string;
}

export interface CounterContract {
  increment(): Promise<void>;
  decrement(): Promise<void>;
  getValue(): Promise<[bigint]>;
  getState(): Promise<CounterState>;
}
\`\`\`

## Best Practices

1. **Handle errors gracefully** - Network and proof failures are common
2. **Cache ZK artifacts** - They're large and expensive to fetch
3. **Batch transactions** - Reduce proof generation overhead
4. **Secure private state** - Encrypt at rest, protect access
5. **Test on devnet first** - Before deploying to testnet

## Resources

- 📖 [API Documentation](https://docs.midnight.network/sdk)
- 💻 [GitHub Repository](https://github.com/midnightntwrk/midnight-js)
- 🎓 [Tutorials](https://docs.midnight.network/tutorials)
- 💬 [Discord Community](https://discord.gg/midnight)
`
}
