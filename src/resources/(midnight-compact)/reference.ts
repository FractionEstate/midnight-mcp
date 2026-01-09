/**
 * Compact Language Reference Resource
 *
 * Complete reference for Compact syntax and semantics.
 * Based on official Midnight documentation: https://docs.midnight.network
 */

export const metadata = {
  uri: "midnight://compact/reference",
  name: "Compact Language Reference",
  description: "Complete syntax and semantics reference for the Compact smart contract language",
  mimeType: "text/markdown",
}

export async function handler(): Promise<string> {
  return `# Compact Language Reference

> Based on official Midnight documentation: https://docs.midnight.network/develop/reference/compact/lang-ref

## Compact Types

Compact is **statically typed**: every expression has a static type. The language is **strongly typed**: the compiler rejects programs that don't type check.

### Primitive Types

| Type | Description |
|------|-------------|
| \`Boolean\` | Two values: \`true\` and \`false\` |
| \`Uint<m..n>\` | Bounded unsigned integers between \`m\` and \`n\` (inclusive) |
| \`Uint<n>\` | Sized unsigned integers with up to \`n\` bits (same as \`Uint<0..(2^n-1)>\`) |
| \`Field\` | Elements in the scalar prime field of the ZK proving system |
| \`[T, ...]\` | Tuples - heterogeneous, fixed-length collections |
| \`Vector<n, T>\` | Shorthand for \`[T, ...]\` with \`n\` occurrences of type \`T\` |
| \`Bytes<n>\` | Byte arrays of length \`n\` |
| \`Opaque<s>\` | Opaque values with tag \`s\` (only \`"string"\` and \`"Uint8Array"\` supported) |

### Example Type Declarations

\`\`\`compact
// Bounded unsigned integer (0 to 100)
let score: Uint<0..100> = 50;

// Sized unsigned integer (32 bits: 0 to 4294967295)
let id: Uint<32> = 12345;

// Field element
let hash_value: Field = 0;

// Tuple (heterogeneous)
let pair: [Uint<32>, Boolean] = [42, true];

// Vector (homogeneous)
let coords: Vector<3, Field> = [0, 0, 0];

// Bytes
let data: Bytes<32> = 0x00...;
\`\`\`

### User-Defined Types

#### Structure Types

\`\`\`compact
// Non-generic structure
struct Thing {
  triple: Vector<3, Field>,
  flag: Boolean,
}

// Generic structure
struct NumberAnd<T> {
  num: Uint<32>;
  item: T
}

// Usage
let thing = Thing { [0, 1, 2], true };
let numBool = NumberAnd<Boolean> { num: 42, item: true };
\`\`\`

#### Enumeration Types

\`\`\`compact
enum Fruit { apple, pear, plum }

// Usage
let f: Fruit = Fruit.apple;
\`\`\`

### Subtyping

Compact supports subtyping:
- \`Uint<0..n>\` is a subtype of \`Uint<0..m>\` if \`n < m\`
- \`Uint<0..n>\` is a subtype of \`Field\` for all \`n\`
- Tuples are subtypes if each element type is a subtype

### Default Values

Every type has a default value:
| Type | Default |
|------|---------|
| \`Boolean\` | \`false\` |
| \`Uint\` | \`0\` |
| \`Field\` | \`0\` |
| Tuples | Default of each element |
| \`Bytes<n>\` | All zero bytes |
| \`Opaque<"string">\` | Empty string \`""\` |
| Structs | All fields at default |
| Enums | First listed value |

### TypeScript Representations

| Compact | TypeScript |
|---------|------------|
| \`Boolean\` | \`boolean\` |
| \`Field\` | \`bigint\` (with bounds checks) |
| \`Uint<n>\` | \`bigint\` (with bounds checks) |
| \`[T, ...]\` | \`[S, ...]\` or \`S[]\` (with length checks) |
| \`Bytes<n>\` | \`Uint8Array\` (with length checks) |
| \`Opaque<"string">\` | \`string\` |
| \`enum\` | \`number\` (with membership checks) |
| \`struct\` | \`{ field1: Type1, ... }\` |

## Modules and Imports

### Include Files

\`\`\`compact
include "path/to/file";
\`\`\`

### Module Definition

\`\`\`compact
module M {
  export { G };
  export struct S { x: Uint<16>, y: Boolean }

  circuit F(s: S): Boolean {
    return s.y;
  }

  circuit G(s: S): Uint<16> {
    return F(s) ? s.x : 0;
  }
}
\`\`\`

### Import Syntax

\`\`\`compact
import Runner;           // Brings exported entries into scope
import Runner prefix P_; // Adds prefix to imports
import Identity<Field>;  // Specializes generic module

// Import from file path
import "path/to/Module";
import "path/to/Module" prefix M_;
\`\`\`

### Standard Library

\`\`\`compact
import CompactStandardLibrary;
\`\`\`

Provides: \`Counter\`, \`Map\`, \`MerkleTree\`, and utility circuits.

## Circuits and Witnesses

### Circuit Definitions

\`\`\`compact
// Exported circuit (entry point)
export circuit increment(): [] {
  ledger.counter = ledger.counter + 1;
}

// Circuit with parameters and return
export circuit transfer(to: Bytes<32>, amount: Uint<128>): Boolean {
  // ... logic
  return true;
}

// Generic circuit
circuit identity<T>(x: T): T {
  return x;
}
\`\`\`

### Witness Functions

Witnesses are supplied in TypeScript and run locally:

\`\`\`compact
witness get_secret(): Field;
witness compute(value: Uint<256>): Field;
\`\`\`

## Standard Library Highlights

### Structs

| Struct | Purpose |
|--------|---------|
| \`Maybe<T>\` | Optional value (\`isSome\`, \`value\`) |
| \`Either<A, B>\` | Disjoint union (\`isLeft\`, \`left\`, \`right\`) |
| \`CurvePoint\` | Elliptic curve point (\`x\`, \`y\` as Field) |
| \`MerkleTreeDigest\` | Root hash of Merkle tree |
| \`MerkleTreePath<n, T>\` | Path to leaf in depth-n tree |
| \`ContractAddress\` | Contract address (32 bytes) |
| \`CoinInfo\` | Shielded coin description |
| \`QualifiedCoinInfo\` | Existing shielded coin on ledger |
| \`ZswapCoinPublicKey\` | Public key for coin outputs |
| \`SendResult\` | Result of send operations |

### Key Circuits

\`\`\`compact
// Option constructors
some<T>(value: T): Maybe<T>
none<T>(): Maybe<T>

// Either constructors
left<A, B>(value: A): Either<A, B>
right<A, B>(value: B): Either<A, B>

// Hash functions
transientHash<T>(value: T): Field           // Fast, not persistent
persistentHash<T>(value: T): Bytes<32>      // SHA-256, persistent
transientCommit<T>(value: T, rand: Field): Field
persistentCommit<T>(value: T, rand: Bytes<32>): Bytes<32>

// Elliptic curve operations
ecAdd(a: CurvePoint, b: CurvePoint): CurvePoint
ecMul(a: CurvePoint, b: Field): CurvePoint
ecMulGenerator(b: Field): CurvePoint
hashToCurve<T>(value: T): CurvePoint

// Merkle tree
merkleTreePathRoot<n, T>(path: MerkleTreePath<n, T>): MerkleTreeDigest

// Token operations
nativeToken(): Bytes<32>
tokenType(domainSep: Bytes<32>, contract: ContractAddress): Bytes<32>
mintToken(...): CoinInfo
evolveNonce(index: Uint<64>, nonce: Bytes<32>): Bytes<32>
burnAddress(): Either<ZswapCoinPublicKey, ContractAddress>

// Coin operations
receive(coin: CoinInfo): []
send(input: QualifiedCoinInfo, recipient: ..., value: Uint<128>): SendResult
sendImmediate(input: CoinInfo, target: ..., value: Uint<128>): SendResult
mergeCoin(a: QualifiedCoinInfo, b: QualifiedCoinInfo): CoinInfo

// User info
ownPublicKey(): ZswapCoinPublicKey

// Block time
blockTimeLt(time: Uint<64>): Boolean
blockTimeGte(time: Uint<64>): Boolean
\`\`\`

## Midnight Network Info

- **Current Status**: Testnet active (APIs v0.7.0 - breaking changes possible)
- **Block Time**: 6 seconds
- **Tokens**: NIGHT (governance) + DUST (shielded fees)
- **Test Tokens**: tDUST available via faucet

## Best Practices

1. **Minimize ledger state** - Storage is expensive
2. **Use witnesses for privacy** - Keep sensitive data off-chain
3. **Bound all loops** - Unbounded loops don't compile
4. **Add meaningful assertions** - Help with debugging
5. **Document circuits** - Explain what each does
6. **Test thoroughly** - ZK bugs are hard to debug

## Common Patterns

### Access Control

\`\`\`compact
ledger {
  admin: Bytes<32>;
}

export circuit admin_only_action(): [] {
  // Compare against stored admin address
  assert ledger.admin == tx_sender_public_key();
  // ... action
}
\`\`\`

### Commit-Reveal

\`\`\`compact
ledger {
  commitments: Map<Bytes<32>, Field>;
}

export circuit commit(commitment: Field): [] {
  let sender = tx_sender_public_key();
  ledger.commitments = ledger.commitments.insert(sender, commitment);
}

// Reveal phase verifies pre-image
export circuit reveal(value: Uint<256>, nonce: Field): [] {
  let sender = tx_sender_public_key();
  let expected = transientHash([value, nonce]);
  let stored = ledger.commitments.lookup(sender);
  assert stored == expected;
  // ... process revealed value
}

witness compute_commitment(value: Uint<256>, nonce: Field): Field {
  return transientHash([value, nonce]);
}
\`\`\`

### Private State with Witnesses

\`\`\`compact
// Witness provides balance from private TypeScript storage
witness get_balance(): Uint<128>;

// Circuit uses witness to verify transfer is valid
export circuit transfer_with_proof(
  amount: Uint<128>,
  balance_proof: Field
): [] {
  let current_balance = get_balance();
  assert current_balance >= amount;
  // ... proceed with transfer
}
\`\`\`

## Resources

- [Full Documentation](https://docs.midnight.network)
- [Language Reference](https://docs.midnight.network/develop/reference/compact/lang-ref)
- [Standard Library](https://docs.midnight.network/develop/reference/compact/compact-std-library/)
- [Tutorial](https://docs.midnight.network/develop/tutorial/)
- [Discord](https://discord.com/invite/midnightnetwork)
- [GitHub](https://github.com/midnight-ntwrk)
`
}
