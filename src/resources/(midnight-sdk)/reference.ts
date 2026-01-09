/**
 * Midnight SDK Reference Resource
 *
 * Comprehensive reference for the Midnight.js SDK packages.
 * Based on official Midnight documentation: https://docs.midnight.network
 */

export const metadata = {
  uri: "midnight://sdk/reference",
  name: "Midnight.js SDK Reference",
  description: "Comprehensive API reference for the Midnight JavaScript/TypeScript SDK packages",
  mimeType: "text/markdown",
}

export async function handler(): Promise<string> {
  return `# Midnight.js SDK Reference

> Based on official documentation: https://docs.midnight.network/develop/reference/midnight-api

## Package Overview

The Midnight SDK is organized into modular packages for different functionalities:

| Package | Purpose |
|---------|---------|
| \`@midnight-ntwrk/midnight-js-contracts\` | Contract deployment and interaction |
| \`@midnight-ntwrk/midnight-js-types\` | Shared type definitions |
| \`@midnight-ntwrk/compact-runtime\` | Execute Compact programs and witnesses |
| \`@midnight-ntwrk/midnight-js-http-client-proof-provider\` | Proof server client |
| \`@midnight-ntwrk/midnight-js-indexer-public-data-provider\` | Blockchain data queries |
| \`@midnight-ntwrk/midnight-js-level-private-state-provider\` | Private state storage (LevelDB) |
| \`@midnight-ntwrk/midnight-js-fetch-zk-config-provider\` | ZK artifact fetching |
| \`@midnight-ntwrk/midnight-js-network-id\` | Network configuration |
| \`@midnight-ntwrk/ledger\` | Transaction utilities |
| \`@midnight-ntwrk/dapp-connector\` | Wallet connection (Lace) |

---

## Core Packages

### @midnight-ntwrk/midnight-js-contracts

Main package for contract operations.

\`\`\`typescript
import {
  deployContract,
  createContractClient,
  ContractClient
} from '@midnight-ntwrk/midnight-js-contracts';

// Deploy a contract
const deployment = await deployContract({
  artifacts: ContractArtifacts,
  constructorArgs: [],
  proofProvider,
  publicDataProvider,
  wallet
});

// Create a client for an existing contract
const client = createContractClient({
  address: contractAddress,
  proofProvider,
  publicDataProvider,
  privateStateProvider,
  wallet
});

// Call a circuit
const result = await client.callCircuit('increment', {});

// Get current state
const state = await client.getState();
\`\`\`

### @midnight-ntwrk/compact-runtime

Execute Compact programs and provide witness implementations.

\`\`\`typescript
import { WitnessContext } from '@midnight-ntwrk/compact-runtime';

// Witness implementation for Compact
export function myWitness(ctx: WitnessContext, param: bigint): bigint {
  // Access private state
  const secret = ctx.privateState.get('secret');

  // Generate random bytes
  const nonce = ctx.randomBytes(32);

  // Compute hash
  const hash = ctx.poseidonHash([param, secret]);

  return hash;
}
\`\`\`

---

## Provider Interfaces

### ProofProvider

Generates zero-knowledge proofs for circuit calls.

\`\`\`typescript
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';

const proofProvider = httpClientProofProvider({
  url: 'https://proof-server.testnet.midnight.network'
});

// The provider implements:
interface ProofProvider {
  prove(circuit: string, inputs: unknown): Promise<Proof>;
  verify(proof: Proof): Promise<boolean>;
}
\`\`\`

### PublicDataProvider

Queries blockchain state and submits transactions.

\`\`\`typescript
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';

const publicDataProvider = indexerPublicDataProvider({
  url: 'https://indexer.testnet.midnight.network/graphql'
});

// The provider implements:
interface PublicDataProvider {
  getContractState(address: string): Promise<ContractState>;
  getBlockHeight(): Promise<number>;
  submitTransaction(tx: Transaction): Promise<string>;
  getTransaction(hash: string): Promise<TransactionInfo>;
}
\`\`\`

### PrivateStateProvider

Stores encrypted private state locally.

\`\`\`typescript
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

const privateStateProvider = levelPrivateStateProvider({
  path: './private-state'
});

// The provider implements:
interface PrivateStateProvider {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}
\`\`\`

---

## Network Configuration

\`\`\`typescript
import { NetworkId } from '@midnight-ntwrk/midnight-js-network-id';

// Available networks
const NETWORKS = {
  [NetworkId.Testnet]: {
    indexer: 'https://indexer.testnet.midnight.network/graphql',
    proofServer: 'https://proof-server.testnet.midnight.network',
    node: 'https://rpc.testnet.midnight.network'
  },
  [NetworkId.Devnet]: {
    indexer: 'http://localhost:8080/graphql',
    proofServer: 'http://localhost:6300',
    node: 'http://localhost:9944'
  }
};

// Get network config
function getNetworkConfig(networkId: NetworkId) {
  return NETWORKS[networkId];
}
\`\`\`

---

## Wallet Integration (Lace)

Connect to the Lace wallet for browser dApps.

\`\`\`typescript
import {
  connectWallet,
  DAppConnector
} from '@midnight-ntwrk/dapp-connector';

// Connect to wallet
const wallet: DAppConnector = await connectWallet();

// Get account information
const address = await wallet.getAddress();
const publicKey = await wallet.getPublicKey();
const balance = await wallet.getBalance();

// Sign a transaction
const signedTx = await wallet.signTransaction(transaction);

// Get coin public key for receiving shielded tokens
const coinPublicKey = await wallet.getCoinPublicKey();
\`\`\`

---

## Transaction Utilities

\`\`\`typescript
import { Transaction, TransactionBuilder } from '@midnight-ntwrk/ledger';

// Build a transaction
const tx = new TransactionBuilder()
  .setCircuitCall('increment', { value: 1n })
  .setProof(proof)
  .build();

// Transaction types
interface Transaction {
  hash: string;
  circuitCalls: CircuitCall[];
  proof: Proof;
  fee: bigint;
}

interface CircuitCall {
  circuit: string;
  inputs: Record<string, unknown>;
}
\`\`\`

---

## ZK Artifact Fetching

\`\`\`typescript
import { fetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';

const zkConfigProvider = fetchZkConfigProvider({
  baseUrl: 'https://artifacts.midnight.network',
  cacheDir: './zk-cache'
});

// Fetch proving keys for a contract
const config = await zkConfigProvider.getConfig(contractId);
\`\`\`

---

## Type Definitions

### Common Types

\`\`\`typescript
// From @midnight-ntwrk/midnight-js-types

// Contract address (32 bytes)
type ContractAddress = Uint8Array;

// Field element (prime field)
type Field = bigint;

// Proof object
interface Proof {
  type: 'plonk';
  data: Uint8Array;
}

// Transaction status
type TransactionStatus =
  | 'pending'
  | 'confirmed'
  | 'failed';

// Block information
interface BlockInfo {
  height: number;
  hash: string;
  timestamp: number;
  transactionCount: number;
}
\`\`\`

### Shielded Coin Types

\`\`\`typescript
// Coin public key for receiving
interface ZswapCoinPublicKey {
  x: Field;
  y: Field;
}

// Information about a newly minted coin
interface CoinInfo {
  tokenType: Uint8Array;
  value: bigint;
  nonce: Uint8Array;
  recipient: ZswapCoinPublicKey | ContractAddress;
}

// Information about an existing coin on ledger
interface QualifiedCoinInfo extends CoinInfo {
  commitment: Field;
  nullifier: Field;
}

// Result of a send operation
interface SendResult {
  change: CoinInfo;
  sent: CoinInfo;
}
\`\`\`

---

## Error Handling

\`\`\`typescript
import {
  MidnightError,
  ProofError,
  NetworkError,
  ContractError
} from '@midnight-ntwrk/midnight-js-types';

try {
  await client.callCircuit('transfer', { amount: 100n });
} catch (error) {
  if (error instanceof ProofError) {
    // Proof generation failed
    console.error('Proof failed:', error.circuit, error.message);
  } else if (error instanceof NetworkError) {
    // Network communication failed
    console.error('Network error:', error.endpoint, error.message);
  } else if (error instanceof ContractError) {
    // Contract assertion failed
    console.error('Contract error:', error.message);
  } else {
    throw error;
  }
}
\`\`\`

---

## Best Practices

### 1. Cache ZK Artifacts

\`\`\`typescript
// Use local caching to avoid repeated downloads
const zkConfigProvider = fetchZkConfigProvider({
  cacheDir: './zk-cache',
  maxCacheAge: 24 * 60 * 60 * 1000 // 24 hours
});
\`\`\`

### 2. Handle Errors Gracefully

\`\`\`typescript
// Wrap all SDK calls in try-catch
// Network and proof failures are common
\`\`\`

### 3. Secure Private State

\`\`\`typescript
// Private state contains sensitive data
// Encrypt at rest and protect access
const privateStateProvider = levelPrivateStateProvider({
  path: './private-state',
  encryption: {
    key: process.env.ENCRYPTION_KEY
  }
});
\`\`\`

### 4. Test on Devnet First

\`\`\`typescript
// Always test thoroughly on devnet before testnet
// Use devnet for development iteration
\`\`\`

---

## Resources

- 📖 [API Documentation](https://docs.midnight.network/develop/reference/midnight-api)
- 💻 [GitHub Repository](https://github.com/midnight-ntwrk)
- 🎓 [Tutorials](https://docs.midnight.network/develop/tutorial)
- 💬 [Discord Community](https://discord.gg/midnight)
`
}
