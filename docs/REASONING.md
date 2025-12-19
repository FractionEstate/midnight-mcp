# How the MCP Reasoning Flow Works

This document explains how the Midnight MCP Server works with AI assistants like Claude to provide accurate, up-to-date code recommendations.

## Key Concept: Division of Labor

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER                                          │
│         "Help me write a token contract for Midnight"                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         AI ASSISTANT (Claude)                           │
│                                                                         │
│  The AI does ALL the reasoning:                                         │
│  • Understands what you're asking                                       │
│  • Decides which MCP tools to call                                      │
│  • Interprets the results                                               │
│  • Writes the final code/response                                       │
│                                                                         │
│  The AI is the "brain" - MCP is just a data source                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ JSON-RPC over stdio
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    MIDNIGHT MCP SERVER                                  │
│                                                                         │
│  MCP does NO reasoning - it only:                                       │
│  • Fetches data from GitHub repos                                       │
│  • Searches the vector database                                         │
│  • Returns raw results as JSON                                          │
│                                                                         │
│  Think of it as a "smart API" for Midnight knowledge                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      DATA SOURCES                                       │
│  • GitHub (midnightntwrk organization repos)                            │
│  • ChromaDB (indexed code with vector embeddings)                       │
│  • OpenAI (generates embeddings for semantic search)                    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Who Does What?

| Component        | Does Reasoning? | Responsibility                                                     |
| ---------------- | --------------- | ------------------------------------------------------------------ |
| **AI Assistant** | ✅ YES          | Understands requests, picks tools, interprets results, writes code |
| **MCP Server**   | ❌ NO           | Fetches/searches data, returns JSON                                |
| **Vector DB**    | ❌ NO           | Similarity matching on embeddings                                  |
| **GitHub**       | ❌ NO           | Stores the actual source code                                      |

---

## Complete Example: "Write me a token contract"

### Step 1: User Makes Request

```
User: "Write me a token contract for Midnight with transfer functionality"
```

### Step 2: AI Reasons About What Tools to Use

The AI thinks:

> "I need to write a Compact smart contract. To ensure I use the correct, current syntax, I should:
>
> 1. Check what the latest Compact version is
> 2. Look for any recent breaking changes
> 3. Find example token contracts
> 4. Get the actual syntax reference"

### Step 3: AI Calls MCP Tools

**First call - Check version:**

```json
{
  "tool": "midnight-get-version-info",
  "arguments": { "repo": "compact" }
}
```

**MCP returns:**

```json
{
  "repository": "midnightntwrk/compact",
  "latestVersion": "v0.15.0",
  "latestStableVersion": "v0.15.0",
  "publishedAt": "2024-12-10T14:30:00Z",
  "recentBreakingChanges": [
    "Changed Map syntax in v0.14.0",
    "Renamed 'public' to 'export' in v0.13.0"
  ]
}
```

**Second call - Search for examples:**

```json
{
  "tool": "midnight-search-compact",
  "arguments": {
    "query": "token contract transfer balance mapping",
    "limit": 5
  }
}
```

**MCP returns:**

```json
{
  "results": [
    {
      "content": "ledger {\n  balances: Map<PubKey, Uint<64>>\n}\n\nexport circuit transfer(to: PubKey, amount: Uint<64>) {\n  ...\n}",
      "score": 0.92,
      "metadata": {
        "repository": "midnightntwrk/example-counter",
        "filePath": "contract/src/token.compact",
        "language": "compact"
      }
    }
  ],
  "totalResults": 3
}
```

**Third call - Get syntax reference:**

```json
{
  "tool": "midnight-get-latest-syntax",
  "arguments": { "repo": "compact" }
}
```

**MCP returns:**

```json
{
  "repository": "midnightntwrk/compact",
  "version": "v0.15.0",
  "syntaxFiles": [
    {
      "path": "docs/reference.md",
      "content": "# Compact Language Reference\n\n## Ledger State\n\nledger { fieldName: Type }\n\n## Circuits\n\nexport circuit name(params) { ... }"
    }
  ]
}
```

### Step 4: AI Synthesizes Results

The AI now has:

- ✅ Latest version: v0.15.0
- ✅ Breaking changes: `export` keyword (not `public`)
- ✅ Example code with correct syntax
- ✅ Official syntax reference

The AI **reasons** about this data and writes:

```compact
// Token contract for Midnight
// Compatible with Compact v0.15.0

ledger {
  balances: Map<PubKey, Uint<64>>,
  totalSupply: Uint<64>,
  owner: PubKey
}

// Transfer tokens between accounts
export circuit transfer(to: PubKey, amount: Uint<64>) {
  const sender = self.signer();
  const senderBalance = balances.get(sender);

  assert senderBalance >= amount, "Insufficient balance";

  balances.set(sender, senderBalance - amount);
  balances.set(to, balances.get(to) + amount);
}

// Mint new tokens (owner only)
export circuit mint(to: PubKey, amount: Uint<64>) {
  assert self.signer() == owner, "Only owner can mint";

  balances.set(to, balances.get(to) + amount);
  totalSupply = totalSupply + amount;
}

// Check balance (witness function)
witness balanceOf(account: PubKey): Uint<64> {
  return balances.get(account);
}
```

### Step 5: AI Explains to User

```
Here's a token contract for Midnight using Compact v0.15.0 syntax:

[code block above]

Key features:
- Uses `export` keyword (changed from `public` in v0.13.0)
- Map<PubKey, Uint<64>> for balances
- Transfer with balance checking
- Owner-only minting
- Witness function for balance queries

This contract is compatible with the latest Compact compiler.
```

---

## Example: Debugging Existing Code

### User Request

```
User: "My contract won't compile. I'm using midnight-js v0.3.0:

ledger {
  public counter: Counter
}

public circuit increment() {
  counter.increment()
}"
```

### AI's Tool Calls

**Check for breaking changes:**

```json
{
  "tool": "midnight-check-breaking-changes",
  "arguments": {
    "repo": "compact",
    "currentVersion": "v0.3.0"
  }
}
```

**Response:**

```json
{
  "isOutdated": true,
  "versionsBehind": 12,
  "hasBreakingChanges": true,
  "breakingChanges": [
    "v0.13.0: Renamed 'public' keyword to 'export'",
    "v0.10.0: Changed circuit syntax"
  ],
  "recommendation": "⚠️ Breaking changes detected! Review the 2 breaking change(s) before upgrading."
}
```

**Compare old vs new syntax:**

```json
{
  "tool": "midnight-get-file-at-version",
  "arguments": {
    "repo": "compact",
    "path": "examples/counter.compact",
    "version": "v0.15.0"
  }
}
```

### AI's Response

```
Your contract is using outdated Compact syntax from v0.3.0. There have been
breaking changes since then.

**Issues found:**

1. `public` keyword → Changed to `export` in v0.13.0
2. Ledger syntax has changed

**Updated code for v0.15.0:**

ledger {
  counter: Counter
}

export circuit increment() {
  counter.increment()
}

**Changes made:**
- Removed `public` from ledger field (no longer needed)
- Changed `public circuit` to `export circuit`
```

---

## Why This Architecture?

### Without MCP (AI alone)

```
AI's training data is from 2023
    ↓
Uses old Compact syntax from training
    ↓
Generated code doesn't compile ❌
```

### With MCP

```
AI calls MCP tools
    ↓
MCP fetches CURRENT code from GitHub
    ↓
AI uses v0.15.0 syntax
    ↓
Generated code compiles ✅
```

---

## Tool Categories

### Version Awareness Tools

| Tool                              | Purpose                               |
| --------------------------------- | ------------------------------------- |
| `midnight-get-version-info`       | Get latest release info               |
| `midnight-check-breaking-changes` | Check if version has breaking changes |
| `midnight-get-migration-guide`    | Step-by-step upgrade instructions     |
| `midnight-get-file-at-version`    | Get exact code at specific version    |
| `midnight-compare-syntax`         | Diff between two versions             |
| `midnight-get-latest-syntax`      | Authoritative syntax reference        |

### Search Tools

| Tool                         | Purpose                    |
| ---------------------------- | -------------------------- |
| `midnight-search-compact`    | Find Compact code examples |
| `midnight-search-typescript` | Find SDK code examples     |
| `midnight-search-docs`       | Search documentation       |

### Analysis Tools

| Tool                        | Purpose                      |
| --------------------------- | ---------------------------- |
| `midnight-analyze-contract` | Static analysis of contracts |
| `midnight-explain-circuit`  | Explain what a circuit does  |

### Repository Tools

| Tool                          | Purpose                     |
| ----------------------------- | --------------------------- |
| `midnight-get-file`           | Fetch any file from repos   |
| `midnight-list-examples`      | List example DApps          |
| `midnight-get-latest-updates` | Recent commits across repos |

---

## Summary

1. **The AI does all reasoning** - understanding requests, choosing tools, writing code
2. **The MCP provides accurate data** - current syntax, examples, version info
3. **Together they prevent hallucinations** - AI uses real, current code instead of outdated training data

The MCP doesn't make the AI "smarter" - it gives the AI **access to current, accurate information** so its reasoning produces correct, compilable code.
