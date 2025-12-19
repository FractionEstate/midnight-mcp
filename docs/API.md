# API Reference

## Tools

### midnight:search-compact

Search Compact smart contract code and patterns using semantic search.

**Input Schema:**
```typescript
{
  query: string;          // Natural language search query
  limit?: number;         // Max results (default: 10)
  filter?: {
    repository?: string;  // Filter by repo name
    isPublic?: boolean;   // Filter by visibility
  };
}
```

**Output:**
```typescript
{
  results: Array<{
    content: string;      // Code snippet
    score: number;        // Similarity score (0-1)
    metadata: {
      repository: string;
      filePath: string;
      language: string;
      startLine: number;
      endLine: number;
      codeType: string;
      codeName: string;
      isPublic: boolean;
    };
  }>;
  query: string;
  totalResults: number;
}
```

**Example:**
```json
{
  "name": "midnight:search-compact",
  "arguments": {
    "query": "access control pattern with authorization",
    "limit": 5
  }
}
```

---

### midnight:search-typescript

Search TypeScript SDK code, types, and API implementations.

**Input Schema:**
```typescript
{
  query: string;              // Search query
  includeTypes?: boolean;     // Include type definitions (default: true)
  includeExamples?: boolean;  // Include usage examples (default: true)
  limit?: number;             // Max results (default: 10)
}
```

**Output:** Same structure as `search-compact`

---

### midnight:search-docs

Full-text search across Midnight documentation.

**Input Schema:**
```typescript
{
  query: string;                              // Documentation search query
  category?: "guides" | "api" | "concepts" | "all";  // Filter category
  limit?: number;                             // Max results (default: 10)
}
```

**Output:** Same structure as `search-compact`

---

### midnight:analyze-contract

Analyze a Compact contract for structure, patterns, and security issues.

**Input Schema:**
```typescript
{
  code: string;               // Compact contract source code
  filename?: string;          // Optional filename for context
  checkSecurity?: boolean;    // Run security checks (default: true)
}
```

**Output:**
```typescript
{
  structure: {
    hasLedger: boolean;
    hasCircuits: boolean;
    hasWitnesses: boolean;
    ledgerFields: Array<{
      name: string;
      type: string;
      isShielded: boolean;
    }>;
    circuits: Array<{
      name: string;
      parameters: Array<{ name: string; type: string }>;
      returnType: string;
      isExported: boolean;
    }>;
    witnesses: Array<{
      name: string;
      parameters: Array<{ name: string; type: string }>;
      returnType: string;
    }>;
  };
  patterns: {
    detected: string[];        // e.g., ["access-control", "state-management"]
    suggestions: string[];     // Improvement suggestions
  };
  security: {
    issues: Array<{
      severity: "high" | "medium" | "low";
      message: string;
      line?: number;
    }>;
    score: number;             // 0-100
  };
  metrics: {
    lineCount: number;
    circuitCount: number;
    witnessCount: number;
    complexity: "low" | "medium" | "high";
  };
}
```

**Example:**
```json
{
  "name": "midnight:analyze-contract",
  "arguments": {
    "code": "ledger { counter: Counter }\ncircuit increment() { counter.increment() }",
    "checkSecurity": true
  }
}
```

---

### midnight:explain-circuit

Explain what a circuit does in plain language with ZK implications.

**Input Schema:**
```typescript
{
  circuitCode: string;        // Circuit code to explain
  context?: string;           // Additional context (e.g., contract name)
  verbosity?: "brief" | "detailed";  // Level of detail (default: "detailed")
}
```

**Output:**
```typescript
{
  summary: string;            // One-sentence summary
  explanation: string;        // Detailed explanation
  zkImplications: {
    publicInputs: string[];   // What's visible on-chain
    privateInputs: string[];  // What stays private
    proofGenerated: string;   // What the proof attests to
  };
  stateChanges: Array<{
    field: string;
    change: string;
  }>;
  gasEstimate?: string;       // Rough gas estimate
}
```

---

### midnight:get-file

Retrieve a specific file from Midnight repositories.

**Input Schema:**
```typescript
{
  repository: string;         // Repository name (e.g., "midnight-examples")
  path: string;               // File path within repo
  ref?: string;               // Branch/tag/commit (default: "main")
}
```

**Output:**
```typescript
{
  content: string;            // File content
  path: string;
  repository: string;
  ref: string;
  size: number;               // File size in bytes
  encoding: string;           // Usually "utf-8"
}
```

---

### midnight:list-examples

List available example contracts and DApps.

**Input Schema:**
```typescript
{
  category?: "contracts" | "dapps" | "patterns" | "all";
  language?: "compact" | "typescript" | "all";
}
```

**Output:**
```typescript
{
  examples: Array<{
    name: string;
    description: string;
    path: string;
    repository: string;
    category: string;
    language: string;
    complexity: "beginner" | "intermediate" | "advanced";
  }>;
  totalCount: number;
}
```

---

### midnight:get-latest-updates

Retrieve recent changes across Midnight repositories.

**Input Schema:**
```typescript
{
  repository?: string;        // Filter by repo (optional)
  limit?: number;             // Max commits (default: 20)
  since?: string;             // ISO date string (optional)
}
```

**Output:**
```typescript
{
  updates: Array<{
    repository: string;
    sha: string;
    message: string;
    author: string;
    date: string;
    filesChanged: string[];
  }>;
  lastChecked: string;
}
```

---

## Resources

Resources are accessed via URI patterns. Use `resources/read` with the URI.

### Documentation Resources

| URI | Description |
|-----|-------------|
| `midnight://docs/compact-reference` | Complete Compact language reference |
| `midnight://docs/sdk-api` | TypeScript SDK API documentation |
| `midnight://docs/concepts/zero-knowledge` | ZK proofs in Midnight |
| `midnight://docs/concepts/shielded-state` | Shielded vs unshielded state |
| `midnight://docs/concepts/witnesses` | How witness functions work |
| `midnight://docs/concepts/kachina` | The Kachina protocol |

### Code Resources

| URI | Description |
|-----|-------------|
| `midnight://code/examples/counter` | Simple counter contract |
| `midnight://code/examples/bboard` | Bulletin board DApp |
| `midnight://code/patterns/state-management` | State management patterns |
| `midnight://code/patterns/access-control` | Access control patterns |
| `midnight://code/patterns/privacy-preserving` | Privacy patterns |
| `midnight://code/templates/token` | Token contract template |
| `midnight://code/templates/voting` | Voting contract template |

### Schema Resources

| URI | Description |
|-----|-------------|
| `midnight://schema/compact-ast` | Compact AST JSON schema |
| `midnight://schema/transaction` | Transaction format schema |
| `midnight://schema/proof` | ZK proof format schema |

**Example request:**
```json
{
  "method": "resources/read",
  "params": {
    "uri": "midnight://docs/compact-reference"
  }
}
```

**Response:**
```json
{
  "contents": [{
    "uri": "midnight://docs/compact-reference",
    "mimeType": "text/markdown",
    "text": "# Compact Language Reference\n\n..."
  }]
}
```

---

## Prompts

Prompts are templates that guide AI assistants through common tasks.

### midnight:create-contract

Guided prompt for creating new Compact contracts.

**Arguments:**
```typescript
{
  name: string;               // Contract name
  purpose: string;            // What the contract does
  features?: string[];        // Desired features
  hasPrivateState?: boolean;  // Needs shielded state?
}
```

### midnight:review-contract

Security and best practices review for existing contracts.

**Arguments:**
```typescript
{
  code: string;               // Contract code to review
  focusAreas?: string[];      // Specific areas to focus on
}
```

### midnight:explain-concept

Educational prompt for explaining Midnight concepts.

**Arguments:**
```typescript
{
  concept: string;            // Concept to explain
  audienceLevel?: "beginner" | "intermediate" | "advanced";
}
```

### midnight:compare-approaches

Compare different implementation approaches.

**Arguments:**
```typescript
{
  goal: string;               // What you want to achieve
  approaches?: string[];      // Specific approaches to compare
}
```

### midnight:debug-contract

Help debug issues with a Compact contract.

**Arguments:**
```typescript
{
  code: string;               // Contract code
  error?: string;             // Error message if any
  expectedBehavior?: string;  // What should happen
  actualBehavior?: string;    // What's happening
}
```

**Example request:**
```json
{
  "method": "prompts/get",
  "params": {
    "name": "midnight:create-contract",
    "arguments": {
      "name": "TokenVault",
      "purpose": "Store and transfer tokens with privacy",
      "hasPrivateState": true
    }
  }
}
```

---

## Error Handling

All tools return errors in a consistent format:

```typescript
{
  content: [{
    type: "text",
    text: "Error: <error message>"
  }],
  isError: true
}
```

Common error codes:

| Error | Cause |
|-------|-------|
| `Unknown tool: <name>` | Tool name not found |
| `Invalid input: <details>` | Zod validation failed |
| `Vector store not initialized` | ChromaDB unavailable |
| `GitHub API error` | Rate limit or auth issue |
| `Parse error` | Invalid Compact syntax |
