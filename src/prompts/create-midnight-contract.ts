/**
 * Create Midnight Contract Prompt
 *
 * Guided workflow for creating new Compact smart contracts.
 * Based on official Midnight documentation: https://docs.midnight.network
 */

import { z } from "zod"

export const inputSchema = {
  contract_type: z
    .enum(["counter", "token", "voting", "nft", "custom"])
    .optional()
    .describe("Type of contract to create"),
  name: z
    .string()
    .optional()
    .describe("Contract name"),
  requirements: z
    .string()
    .optional()
    .describe("Natural language description of requirements"),
}

export const metadata = {
  name: "create_midnight_contract",
  description: `Guided workflow for creating a new Compact smart contract.

Use this prompt to:
- Design a new contract from scratch
- Get templates for common patterns
- Understand best practices
- Generate contract scaffolding

Based on official Midnight documentation: https://docs.midnight.network`,
  role: "user" as const,
}

type CreateContractArgs = {
  contract_type?: "counter" | "token" | "voting" | "nft" | "custom"
  name?: string
  requirements?: string
}

export async function handler(args: CreateContractArgs): Promise<string> {
  const contractType = args.contract_type ?? "custom"
  const name = args.name ?? "MyContract"

  let templateGuidance = ""

  switch (contractType) {
    case "counter":
      templateGuidance = `
## Counter Contract Template

A simple counter is perfect for learning Compact basics.

### Features to Consider
- Increment/decrement operations
- Minimum value bounds (prevent underflow)
- Access control (who can modify)
- Event emission for state changes

### Starting Template (Compact Syntax)

**Note**: Compact is a strongly statically typed language. Each contract has:
- **Ledger state**: Public data on-chain
- **Circuits**: Entry points that create ZK proofs
- **Witnesses**: Private computations in TypeScript

\`\`\`compact
// Import standard library (provides Counter, Map, MerkleTree, etc.)
import CompactStandardLibrary;

// Ledger state (public, on-chain)
ledger {
  counter: Uint<64>;
}

// Exported circuit - entry point for increment
export circuit increment(): [] {
  ledger.counter = ledger.counter + 1;
}

// Exported circuit with bounds check
export circuit decrement(): [] {
  // Assertion fails if counter is 0
  assert ledger.counter > 0;
  ledger.counter = ledger.counter - 1;
}

// Return value must be a tuple
export circuit get_value(): Uint<64> {
  return ledger.counter;
}
\`\`\`

### Key Compact Type Notes
- \`Uint<64>\`: Sized unsigned integer (64 bits, 0 to 2^64-1)
- \`Uint<0..100>\`: Bounded unsigned integer (0 to 100 inclusive)
- \`Field\`: Prime field element (for hashes, commitments)
- Return types can be single values or tuples \`[T, ...]\`
`
      break

    case "token":
      templateGuidance = `
## Token Contract Template

A privacy-preserving token using Midnight's shielded coin operations.

### Features to Consider
- Shielded balances using CoinInfo
- Transfer using send/sendImmediate
- Mint with mintToken circuit
- Token type namespacing

### Privacy Model
- User balances stored privately (never on-chain)
- Transfers use ZK proofs for verification
- Only commitments and nullifiers visible on-chain

### Starting Template (Using Standard Library)

\`\`\`compact
import CompactStandardLibrary;

ledger {
  admin: Bytes<32>;
  total_minted: Uint<128>;
}

// Mint new tokens to a recipient
export circuit mint_tokens(
  domain_sep: Bytes<32>,
  value: Uint<128>,
  nonce: Bytes<32>,
  recipient: Either<ZswapCoinPublicKey, ContractAddress>
): CoinInfo {
  // Only admin can mint
  // mintToken creates a shielded coin
  let coin = mintToken(domain_sep, value, nonce, recipient);
  ledger.total_minted = ledger.total_minted + value;
  return coin;
}

// Transfer tokens (uses qualified coin from ledger)
export circuit transfer(
  input: QualifiedCoinInfo,
  recipient: Either<ZswapCoinPublicKey, ContractAddress>,
  amount: Uint<128>
): SendResult {
  return send(input, recipient, amount);
}

// Burn tokens
export circuit burn(input: QualifiedCoinInfo): [] {
  let burn_addr = burnAddress();
  discard send(input, burn_addr, input.value);
}
\`\`\`

### Standard Library Types Used
- \`CoinInfo\`: Description of a newly created shielded coin
- \`QualifiedCoinInfo\`: Existing shielded coin on the ledger
- \`ZswapCoinPublicKey\`: Public key for coin recipients
- \`ContractAddress\`: Contract address (32 bytes)
- \`SendResult\`: Result with change and sent coin info
`
      break

    case "voting":
      templateGuidance = `
## Voting Contract Template

A privacy-preserving voting system using Midnight's ZK capabilities.

### Features to Consider
- Anonymous voting (hidden votes using witnesses)
- Double-vote prevention (nullifiers via MerkleTree)
- Tally revelation after voting ends
- Voter eligibility via inclusion proofs
- Time-bounded voting periods

### Privacy Model
- Votes are committed privately (never revealed individually)
- MerkleTree stores voter nullifiers (prevents double-voting)
- Tally computed via ZK proof without revealing individual votes

### Starting Template (Using Standard Library)

\`\`\`compact
import CompactStandardLibrary;

ledger {
  // Voting status
  voting_open: Boolean;

  // Vote tallies (stored privately until reveal)
  yes_votes: Counter;
  no_votes: Counter;

  // Nullifier set to prevent double-voting
  // MerkleTree<depth> stores Field values as leaves
  voted: MerkleTree<16>;
}

// Open voting (admin only in production)
export circuit open_voting(): [] {
  ledger.voting_open = true;
}

// Close voting
export circuit close_voting(): [] {
  ledger.voting_open = false;
}

// Cast a vote with ZK proof of eligibility
export circuit cast_vote(
  vote: Boolean,
  nullifier: Field,
  nullifier_proof: MerkleTreePath<16>
): [] {
  // Ensure voting is open
  assert ledger.voting_open;

  // Verify nullifier hasn't been used (empty at this index)
  assert nullifier_proof.leaf == 0;

  // Insert nullifier to prevent double-voting
  ledger.voted = insert(ledger.voted, nullifier_proof, nullifier);

  // Tally the vote
  if (vote) {
    ledger.yes_votes = increment(ledger.yes_votes);
  } else {
    ledger.no_votes = increment(ledger.no_votes);
  }
}

// Get results (only meaningful after voting closes)
export circuit get_results(): [Uint<64>, Uint<64>] {
  return [ledger.yes_votes.value, ledger.no_votes.value];
}

// Witness to generate nullifier (runs in TypeScript)
witness generate_nullifier(voter_secret: Field, proposal_id: Field): Field {
  // Nullifier = hash of secret and proposal
  // Same secret always produces same nullifier per proposal
  return poseidon_hash([voter_secret, proposal_id]);
}
\`\`\`

### Standard Library Types Used
- \`MerkleTree<depth>\`: Sparse Merkle tree with 2^depth leaves
- \`MerkleTreePath<depth>\`: Proof of inclusion/exclusion in tree
- \`Counter\`: Thread-safe incrementing counter
- \`Field\`: Prime field element for hashes
`
      break

    case "nft":
      templateGuidance = `
## NFT Contract Template

A non-fungible token contract with ownership tracking.

### Features to Consider
- Unique token IDs (Bytes<32>)
- Ownership via Map
- Transfer with ownership verification
- Minting with access control
- Metadata storage (URI or hash)

### Starting Template

\`\`\`compact
import CompactStandardLibrary;

// Type alias for token ID
type TokenId = Bytes<32>;
type Address = Bytes<32>;

ledger {
  // Next token ID counter
  next_id: Uint<64>;

  // Owner mapping: token_id -> owner_address
  owners: Map<TokenId, Address>;

  // Metadata URI mapping (optional)
  metadata: Map<TokenId, Bytes<256>>;

  // Admin for minting
  admin: Address;
}

// Mint a new NFT to a recipient
export circuit mint(
  to: Address,
  token_metadata: Bytes<256>
): TokenId {
  // Generate unique token ID from counter
  let id_bytes = pad<32>(ledger.next_id.to_bytes());
  let token_id = TokenId::from(id_bytes);

  // Assign ownership
  ledger.owners = ledger.owners.insert(token_id, to);
  ledger.metadata = ledger.metadata.insert(token_id, token_metadata);

  // Increment counter
  ledger.next_id = ledger.next_id + 1;

  return token_id;
}

// Transfer NFT to new owner
export circuit transfer(
  token_id: TokenId,
  from: Address,
  to: Address
): [] {
  // Verify current ownership
  let current_owner = ledger.owners.lookup(token_id);
  assert current_owner == from, "Not the owner";

  // Update ownership
  ledger.owners = ledger.owners.insert(token_id, to);
}

// Query owner of a token
export circuit owner_of(token_id: TokenId): Address {
  return ledger.owners.lookup(token_id);
}
\`\`\`

### Privacy Enhancement
For privacy-preserving NFTs, consider:
- Store ownership commitments instead of addresses
- Use nullifiers for transfers
- Reveal ownership only via ZK proofs
`
      break

    default:
      templateGuidance = `
## Custom Contract

Let's design your contract based on your requirements.

${args.requirements ? `### Your Requirements
${args.requirements}

### Analysis
Based on your requirements, consider:
` : `### Questions to Answer
1. What state needs to be stored on-chain (ledger)?
2. What data should remain private (witnesses)?
3. What are the main operations (circuits)?
4. What assertions/validations are needed?
5. What standard library types can help?
`}

### Contract Skeleton (Compact Syntax)

\`\`\`compact
// Import standard library for common types
import CompactStandardLibrary;

// Type aliases for clarity
type Address = Bytes<32>;

// Ledger state (public, on-chain)
ledger {
  // Define your public state here
  // Examples:
  // counter: Counter;
  // balances: Map<Address, Uint<128>>;
  // merkle_tree: MerkleTree<20>;
}

// Exported circuit - main entry point
export circuit main_action(param: Uint<64>): [] {
  // Your logic here
  // Access ledger state: ledger.counter
  // Call witnesses: witness_function(args)
  // Assertions: assert condition;
}

// Witness for private computations
// Runs in TypeScript, provides secret data to circuit
witness compute_secret(public_input: Uint<64>): Field {
  // Private computation
  // Access off-chain data
  // Return value to circuit
  return poseidon_hash([public_input]);
}
\`\`\`

### Compact Fundamentals
- **Ledger**: Public on-chain state
- **Circuit**: Entry points that create ZK proofs
- **Witness**: Private computations in TypeScript
- **Types**: \`Uint<N>\`, \`Field\`, \`Boolean\`, \`Bytes<N>\`, \`Map<K,V>\`, etc.
`
  }

  return `# 🌙 Create Midnight Contract: ${name}

## Contract Type: ${contractType}

${templateGuidance}

---

## Next Steps

1. **Customize the template** based on your needs
2. **Compile** using \`compactc\` or the SDK
3. **Use \`midnight_analyze_contract\`** to check for issues
4. **Deploy to devnet** for testing
5. **Test thoroughly** before mainnet

## Resources

- 📖 Read \`midnight://compact/overview\` for language basics
- 📚 Read \`midnight://compact/reference\` for syntax details
- 🔧 Read \`midnight://sdk/overview\` for SDK usage
- 🌐 Official docs: https://docs.midnight.network

---

**Need help?** Describe your requirements and I'll help design the contract.
`
}
