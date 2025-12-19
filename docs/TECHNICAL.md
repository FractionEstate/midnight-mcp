# Technical Implementation Details

## MCP Protocol Implementation

### Transport Layer

The server uses **stdio transport** for communication with MCP clients:

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const transport = new StdioServerTransport();
await server.connect(transport);
```

Messages are JSON-RPC 2.0 formatted:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "midnight:analyze-contract",
    "arguments": { "code": "..." }
  }
}
```

### Capabilities Declaration

```typescript
{
  capabilities: {
    tools: {},                    // Supports tool listing & execution
    resources: {
      subscribe: true,            // Supports resource subscriptions
      listChanged: true,          // Emits change notifications
    },
    prompts: {
      listChanged: true,          // Emits prompt change notifications
    },
  },
}
```

## Compact Language Parser

### Supported Constructs

The parser (`src/pipeline/parser.ts`) handles Midnight's Compact language:

```
┌─────────────────────────────────────────────────┐
│                  Compact File                    │
├─────────────────────────────────────────────────┤
│  include statements                              │
│  ├── include "std/stdlib.compact"               │
│                                                  │
│  ledger { }                                      │
│  ├── state variables                            │
│  ├── maps                                        │
│  ├── counters                                    │
│                                                  │
│  circuit function_name(params): return { }      │
│  ├── public circuits                            │
│  ├── ZK proof generation                        │
│                                                  │
│  witness function_name(params): return { }      │
│  ├── private computation                        │
│  ├── Off-chain execution                        │
│                                                  │
│  export { symbols }                              │
└─────────────────────────────────────────────────┘
```

### Parsing Strategy

```typescript
// Regex-based extraction with position tracking
const ledgerRegex = /ledger\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gs;
const circuitRegex = /(?:export\s+)?(circuit)\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*(\w+))?\s*\{/g;
const witnessRegex = /(?:export\s+)?(witness)\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*(\w+))?\s*\{/g;
```

### Extracted Metadata

```typescript
interface ParsedFile {
  path: string;
  language: "compact" | "typescript" | "markdown";
  content: string;
  codeUnits: CodeUnit[];           // Functions, circuits, witnesses
  imports: string[];               // Include statements
  exports: string[];               // Exported symbols
  metadata: {
    hasLedger: boolean;
    hasCircuits: boolean;
    hasWitnesses: boolean;
    lineCount: number;
  };
}
```

## Vector Embedding Pipeline

### Embedding Generation

Using OpenAI's `text-embedding-3-small` model:

```typescript
const response = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: text,
});
// Returns 1536-dimensional vector
```

### Chunking Strategy

Code is intelligently chunked for optimal embedding:

1. **Code Unit Chunking** (preferred)
   - Each function/circuit/witness = one chunk
   - Preserves semantic boundaries
   
2. **File Chunking** (fallback)
   - 2000 character chunks
   - 5-line overlap between chunks
   - Used when no code units extracted

```typescript
function createChunks(file: ParsedFile, repository: string) {
  const chunks = [];
  
  // Prefer code units
  for (const unit of file.codeUnits) {
    chunks.push({
      text: unit.code,
      metadata: { /* ... */ }
    });
  }
  
  // Fallback to file chunks
  if (file.codeUnits.length === 0) {
    // Sliding window chunking
  }
  
  return chunks;
}
```

## ChromaDB Integration

### Collection Schema

```typescript
const collection = await client.getOrCreateCollection({
  name: "midnight-code",
  metadata: {
    description: "Midnight blockchain code and documentation",
  },
});
```

### Document Storage

```typescript
await collection.add({
  ids: ["doc-1", "doc-2"],
  embeddings: [[0.1, 0.2, ...], [0.3, 0.4, ...]],
  metadatas: [{
    repository: "midnight-examples",
    filePath: "counter/contract.compact",
    language: "compact",
    startLine: 1,
    endLine: 25,
    codeType: "circuit",
    codeName: "increment",
    isPublic: true,
  }],
  documents: ["circuit increment() { ... }"],
});
```

### Similarity Search

```typescript
const results = await collection.query({
  queryEmbeddings: [queryVector],
  nResults: 10,
  where: { language: "compact" },      // Optional filter
  include: ["documents", "metadatas", "distances"],
});
```

## Contract Analysis Engine

### Analysis Pipeline

```
Input Code
    │
    ▼
┌───────────────┐
│   Parsing     │──▶ AST-like structure
└───────────────┘
    │
    ▼
┌───────────────┐
│  Structure    │──▶ Ledger, circuits, witnesses
│  Extraction   │
└───────────────┘
    │
    ▼
┌───────────────┐
│   Pattern     │──▶ Access control, state mgmt
│  Detection    │
└───────────────┘
    │
    ▼
┌───────────────┐
│  Security     │──▶ Potential issues
│   Checks      │
└───────────────┘
    │
    ▼
Output Report
```

### Detected Patterns

| Pattern | Detection Method |
|---------|------------------|
| Access Control | `authorized()`, permission checks |
| State Management | Ledger field analysis |
| Privacy Preserving | Witness vs circuit ratio |
| Token Standards | Transfer/mint/burn signatures |

### Security Checks

| Check | What it detects |
|-------|----------------|
| Unprotected circuits | Public circuits without auth |
| State leakage | Shielded data in public returns |
| Missing witnesses | Circuits without private computation |
| Reentrancy patterns | Recursive calls in circuits |

## GitHub Integration

### Rate Limiting

```typescript
// With token: 5000 requests/hour
// Without token: 60 requests/hour

const octokit = new Octokit({
  auth: config.githubToken,  // Optional
});
```

### Repository Configuration

```typescript
const DEFAULT_REPOSITORIES: RepositoryConfig[] = [
  {
    owner: "midnightntwrk",
    name: "midnight-examples",
    branch: "main",
    paths: ["contracts/", "examples/"],
    types: ["compact", "typescript"],
  },
  {
    owner: "midnightntwrk", 
    name: "compact-compiler",
    branch: "main",
    paths: ["stdlib/", "src/"],
    types: ["compact"],
  },
];
```

### File Fetching

```typescript
async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  ref = "main"
): Promise<string> {
  const response = await octokit.repos.getContent({
    owner,
    repo,
    path,
    ref,
  });
  
  // Decode base64 content
  return Buffer.from(response.data.content, "base64").toString("utf-8");
}
```

## Logging System

### Log Levels

```typescript
type LogLevel = "debug" | "info" | "warn" | "error";

// Set via LOG_LEVEL environment variable
// Default: "info"
```

### Structured Logging

```typescript
logger.info("Tool called", {
  tool: "midnight:analyze-contract",
  inputSize: code.length,
  timestamp: new Date().toISOString(),
});

// Output:
// [INFO] Tool called {"tool":"midnight:analyze-contract","inputSize":1234,...}
```

### Log Output

Logs go to **stderr** to avoid interfering with MCP's stdio communication:

```typescript
console.error(JSON.stringify({
  level,
  message,
  ...meta,
  timestamp: new Date().toISOString(),
}));
```

## Testing Strategy

### Unit Tests

Using Vitest for fast, modern testing:

```typescript
// tests/analyze.test.ts
describe("Contract Analysis", () => {
  it("should detect ledger block", () => {
    const code = `ledger { counter: Counter }`;
    const result = analyzeContract(code);
    expect(result.structure.hasLedger).toBe(true);
  });
});
```

### Test Coverage

| Module | Coverage |
|--------|----------|
| Parser | ~85% |
| Analyze | ~90% |
| Resources | ~75% |
| Prompts | ~80% |

### Running Tests

```bash
npm test              # Run all tests
npm run test:coverage # With coverage report
```

## Performance Considerations

### Embedding Caching

Embeddings are cached in ChromaDB to avoid regeneration:

```typescript
// Check if document already indexed
const existing = await collection.get({
  ids: [documentId],
});

if (existing.ids.length > 0) {
  // Skip embedding generation
  return;
}
```

### Batch Processing

Documents are processed in batches during indexing:

```typescript
const BATCH_SIZE = 100;

for (let i = 0; i < documents.length; i += BATCH_SIZE) {
  const batch = documents.slice(i, i + BATCH_SIZE);
  await collection.add(/* batch */);
}
```

### Memory Management

- Large files are streamed, not loaded entirely
- Parsed ASTs are not retained after extraction
- Vector store handles memory for embeddings

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_TOKEN` | No | - | GitHub PAT for API access |
| `OPENAI_API_KEY` | No | - | OpenAI API key for embeddings |
| `CHROMA_URL` | No | `http://localhost:8000` | ChromaDB endpoint |
| `EMBEDDING_MODEL` | No | `text-embedding-3-small` | OpenAI model |
| `LOG_LEVEL` | No | `info` | Logging verbosity |
| `SYNC_INTERVAL` | No | `900000` | Index refresh (ms) |
| `DATA_DIR` | No | `./data` | Data storage path |
| `CACHE_DIR` | No | `./cache` | Cache storage path |

## Build & Distribution

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "strict": true
  }
}
```

### NPM Package

```json
{
  "name": "midnight-mcp",
  "bin": {
    "midnight-mcp": "./dist/index.js"
  },
  "type": "module"
}
```

### Docker Support

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
CMD ["node", "dist/index.js"]
```
