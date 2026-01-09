/**
 * Midnight Scaffold Project Tool
 *
 * Scaffold a new Midnight dApp project with templates.
 */

import { z } from "zod"
import { getScaffoldVersions, getWalletVersions, type VersionOptions } from "../../providers/versions.js"

export const inputSchema = {
  name: z
    .string()
    .describe("Project name (will be used as directory name)"),
  template: z
    .enum(["counter", "token", "voting", "blank"])
    .optional()
    .describe("Project template to use (defaults to counter)"),
  include_ui: z
    .boolean()
    .optional()
    .describe("Include React UI boilerplate (defaults to true)"),
  package_manager: z
    .enum(["npm", "pnpm", "yarn"])
    .optional()
    .describe("Package manager to use (defaults to pnpm)"),
}

export const metadata = {
  name: "midnight_scaffold_project",
  description: `Scaffold a new Midnight dApp project from a template.

Templates available:
- **counter**: Simple counter contract (great for learning)
- **token**: Private token with transfers and balances
- **voting**: Privacy-preserving voting system
- **blank**: Empty project structure

Generates:
- Compact contract files
- TypeScript SDK integration
- React UI (optional)
- Build and test configuration

Use this tool to:
- Start a new Midnight project quickly
- Learn from example contracts
- Set up proper project structure`,
  toolset: "midnight:dev" as const,
  readOnly: false,
}

type ScaffoldProjectArgs = {
  name: string
  template?: "counter" | "token" | "voting" | "blank"
  include_ui?: boolean
  package_manager?: "npm" | "pnpm" | "yarn"
}

// Template definitions - Based on official Midnight documentation
const TEMPLATES = {
  counter: {
    description: "Simple counter with increment/decrement",
    contract: `// Counter contract - A simple example demonstrating Midnight basics
// Based on official docs: https://docs.midnight.network

import CompactStandardLibrary;

ledger {
  counter: Counter;
}

// Increment the counter by 1
export circuit increment(): [] {
  ledger.counter = increment(ledger.counter);
}

// Decrement the counter by 1
export circuit decrement(): [] {
  // Decrement returns Maybe<Counter> - fails if counter is 0
  let result = decrement(ledger.counter);
  assert result.is_some, "Counter cannot go below zero";
  ledger.counter = result.value;
}

// Get the current counter value
export circuit get_value(): Uint<64> {
  return ledger.counter.value;
}
`,
    witnesses: `// Counter witnesses - No private computations needed
// This contract only uses public ledger state via Counter type

import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';

// No witnesses needed for this simple counter
// The Counter type from CompactStandardLibrary handles all state
`,
  },
  token: {
    description: "Shielded token with privacy-preserving transfers",
    contract: `// Shielded Token Contract
// Uses Midnight's native shielded coin operations for privacy
// Based on official docs: https://docs.midnight.network

import CompactStandardLibrary;

// Type alias for clarity
type Address = Bytes<32>;

ledger {
  admin: Address;
  total_minted: Uint<128>;
  domain_separator: Bytes<32>;
}

// Mint new shielded tokens
export circuit mint_tokens(
  value: Uint<128>,
  nonce: Bytes<32>,
  recipient: Either<ZswapCoinPublicKey, ContractAddress>
): CoinInfo {
  // Create a new shielded coin using the standard library
  let coin = mintToken(ledger.domain_separator, value, nonce, recipient);
  ledger.total_minted = ledger.total_minted + value;
  return coin;
}

// Transfer shielded tokens
export circuit transfer(
  input: QualifiedCoinInfo,
  recipient: Either<ZswapCoinPublicKey, ContractAddress>,
  amount: Uint<128>
): SendResult {
  // Use the standard library send function
  return send(input, recipient, amount);
}

// Burn tokens (send to burn address)
export circuit burn(input: QualifiedCoinInfo): [] {
  let burn_addr = burnAddress();
  discard send(input, burn_addr, input.value);
}

// Get total minted supply
export circuit get_supply(): Uint<128> {
  return ledger.total_minted;
}
`,
    witnesses: `// Token witnesses - Handle private state management
// These run on the user's device in TypeScript

import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';

// Note: With shielded coins, most operations are handled by the
// Midnight protocol. Witnesses are used for accessing off-chain
// private state when needed.

export function getOwnPublicKey(ctx: WitnessContext): bigint {
  // Get the user's ZswapCoinPublicKey for receiving coins
  return ctx.getOwnPublicKey();
}

export function getNonce(ctx: WitnessContext): Uint8Array {
  // Generate a random nonce for coin minting
  return ctx.randomBytes(32);
}
`,
  },
  voting: {
    description: "Privacy-preserving voting with MerkleTree nullifiers",
    contract: `// Private Voting Contract
// Uses MerkleTree for nullifiers to prevent double-voting
// Based on official docs: https://docs.midnight.network

import CompactStandardLibrary;

ledger {
  // Voting status
  voting_open: Boolean;

  // Vote tallies
  yes_votes: Counter;
  no_votes: Counter;

  // Nullifier tree to prevent double-voting (2^16 = 65536 leaves)
  nullifiers: MerkleTree<16>;
}

// Open voting
export circuit open_voting(): [] {
  ledger.voting_open = true;
}

// Close voting
export circuit close_voting(): [] {
  ledger.voting_open = false;
}

// Cast a private vote
export circuit cast_vote(
  vote: Boolean,
  nullifier: Field,
  nullifier_path: MerkleTreePath<16>
): [] {
  // Ensure voting is open
  assert ledger.voting_open;

  // Verify the nullifier hasn't been used (leaf should be empty/zero)
  assert nullifier_path.leaf == 0, "Already voted";

  // Insert nullifier into the tree
  ledger.nullifiers = insert(ledger.nullifiers, nullifier_path, nullifier);

  // Count the vote
  if (vote) {
    ledger.yes_votes = increment(ledger.yes_votes);
  } else {
    ledger.no_votes = increment(ledger.no_votes);
  }
}

// Get voting results
export circuit get_results(): [Uint<64>, Uint<64>] {
  return [ledger.yes_votes.value, ledger.no_votes.value];
}

// Witness: Generate nullifier from voter's secret
witness generate_nullifier(voter_secret: Field, proposal_id: Field): Field;
`,
    witnesses: `// Voting witnesses - Handle private vote computations
// These run on the user's device in TypeScript

import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';

export function generate_nullifier(
  ctx: WitnessContext,
  voterSecret: bigint,
  proposalId: bigint
): bigint {
  // Create deterministic nullifier from secret + proposal
  // Same secret always generates same nullifier per proposal
  // This prevents double-voting while preserving privacy
  return ctx.poseidonHash([voterSecret, proposalId]);
}

export function storeVote(
  ctx: WitnessContext,
  proposalId: bigint,
  vote: boolean,
  secret: bigint
): void {
  // Store vote locally for potential reveal later
  ctx.privateState.set(\`vote:\${proposalId}\`, {
    vote,
    secret,
    timestamp: Date.now()
  });
}
`,
  },
  blank: {
    description: "Empty project structure",
    contract: `// Your Midnight Contract
// Replace this with your contract logic
// Docs: https://docs.midnight.network

import CompactStandardLibrary;

// Type aliases (optional but recommended)
type Address = Bytes<32>;

ledger {
  // Declare public on-chain state here
  // Examples:
  // counter: Counter;
  // balances: Map<Address, Uint<128>>;
  // merkle_root: MerkleTreeDigest;
}

// Add your circuits here (entry points for transactions)
// export circuit my_function(param: Uint<64>): [] {
//   // Your logic - can read/write ledger state
//   // Generates ZK proof when called
// }

// Declare witnesses for private computations
// witness my_secret(): Field;
`,
    witnesses: `// Your witnesses - Private computations in TypeScript
// These run on the user's device, never on-chain

import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';

// Example witness implementation:
// export function my_secret(ctx: WitnessContext): bigint {
//   // Access private state, generate random values, etc.
//   return ctx.privateState.get('secret') || 0n;
// }
`,
  },
}

export async function handler(args: ScaffoldProjectArgs): Promise<string> {
  const template = args.template ?? "counter"
  const includeUI = args.include_ui ?? true
  const packageManager = args.package_manager ?? "pnpm"
  const templateData = TEMPLATES[template]

  const projectStructure = `
${args.name}/
├── contracts/
│   └── ${args.name}.compact      # Compact smart contract
├── src/
│   ├── contract/
│   │   ├── index.ts              # Contract interaction code
│   │   └── witnesses.ts          # Witness implementations
│   ├── providers/
│   │   └── midnight.ts           # Midnight SDK setup
${includeUI ? `│   ├── components/
│   │   └── ...                   # React components
│   ├── App.tsx                   # Main React component
│   └── main.tsx                  # Entry point` : `│   └── index.ts                  # Entry point`}
├── package.json
├── tsconfig.json
└── README.md
`

  // Get latest versions from version provider
  const versionOptions: VersionOptions = { alpha: false }
  const midnightDeps = getScaffoldVersions(versionOptions)
  const walletDeps = getWalletVersions(versionOptions)

  const packageJson = {
    name: args.name,
    version: "0.1.0",
    type: "module",
    scripts: {
      "compile": "compactc contracts/*.compact -o src/contract/generated",
      "build": `${packageManager} run compile && tsc`,
      "dev": includeUI ? "vite" : "tsx watch src/index.ts",
      "test": "vitest",
    },
    dependencies: {
      // Core Midnight SDK (versions auto-updated from npm)
      "@midnight-ntwrk/midnight-js-contracts": midnightDeps["@midnight-ntwrk/midnight-js-contracts"],
      "@midnight-ntwrk/midnight-js-types": midnightDeps["@midnight-ntwrk/midnight-js-types"],
      "@midnight-ntwrk/midnight-js-utils": midnightDeps["@midnight-ntwrk/midnight-js-utils"],
      "@midnight-ntwrk/midnight-js-network-id": midnightDeps["@midnight-ntwrk/midnight-js-network-id"],
      "@midnight-ntwrk/midnight-js-http-client-proof-provider": midnightDeps["@midnight-ntwrk/midnight-js-http-client-proof-provider"],
      "@midnight-ntwrk/midnight-js-indexer-public-data-provider": midnightDeps["@midnight-ntwrk/midnight-js-indexer-public-data-provider"],
      "@midnight-ntwrk/midnight-js-level-private-state-provider": midnightDeps["@midnight-ntwrk/midnight-js-level-private-state-provider"],
      "@midnight-ntwrk/compact-runtime": midnightDeps["@midnight-ntwrk/compact-runtime"],
      "@midnight-ntwrk/ledger": midnightDeps["@midnight-ntwrk/ledger"],
      // Wallet integration
      ...walletDeps,
      // UI dependencies
      ...(includeUI ? {
        "react": "^18.3.0",
        "react-dom": "^18.3.0",
      } : {}),
    },
    devDependencies: {
      "typescript": "^5.9.0",
      "vitest": "^3.0.0",
      ...(includeUI ? {
        "vite": "^6.0.0",
        "@vitejs/plugin-react": "^4.3.0",
      } : {}),
    },
  }

  return `# 🚀 Scaffold Midnight Project

## Project: ${args.name}

**Template:** ${template} - ${templateData.description}
**Include UI:** ${includeUI ? "Yes (React)" : "No"}
**Package Manager:** ${packageManager}

---

## Project Structure

\`\`\`
${projectStructure}
\`\`\`

---

## Contract Code

\`\`\`compact
// contracts/${args.name}.compact
${templateData.contract}
\`\`\`

---

## Witness Code

\`\`\`typescript
// src/contract/witnesses.ts
${templateData.witnesses}
\`\`\`

---

## package.json

\`\`\`json
${JSON.stringify(packageJson, null, 2)}
\`\`\`

---

## Setup Commands

\`\`\`bash
# Create project directory
mkdir -p ${args.name}/{contracts,src/{contract,providers${includeUI ? ",components" : ""}}}

# Initialize package.json
cd ${args.name}
${packageManager} init

# Install dependencies
${packageManager} install

# Compile contracts
${packageManager} run compile

# Start development
${packageManager} run dev
\`\`\`

---

## Next Steps

1. **Create the project structure** using the commands above
2. **Copy the contract code** to \`contracts/${args.name}.compact\`
3. **Copy the witness code** to \`src/contract/witnesses.ts\`
4. **Compile the contract** with \`${packageManager} run compile\`
5. **Configure network** in \`src/providers/midnight.ts\`
6. **Deploy and test** your dApp!

---

📚 **Documentation:** [docs.midnight.network](https://docs.midnight.network)
💬 **Community:** [Discord](https://discord.gg/midnight)
`
}
