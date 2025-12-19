# Midnight MCP Server Architecture

## Overview

The Midnight MCP Server implements the [Model Context Protocol](https://modelcontextprotocol.io/) to provide AI assistants with access to Midnight blockchain development resources. It enables semantic search, contract analysis, and documentation access through a standardized interface.

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Client                                │
│              (Claude Desktop, Cursor, etc.)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ JSON-RPC 2.0 over stdio
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MCP Server Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Tools     │  │  Resources  │  │        Prompts          │  │
│  │ (14 tools)  │  │(20 resources│  │     (5 templates)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Vector Store │    │    GitHub     │    │    Parser     │
│  (ChromaDB)   │    │   (Octokit)   │    │   (Compact/   │
│  (optional)   │    │  (with cache) │    │   TypeScript) │
└───────────────┘    └───────────────┘    └───────────────┘
        │
        ▼
┌───────────────┐
│   Embeddings  │
│   (OpenAI)    │
│  (optional)   │
└───────────────┘
```

## Indexed Repositories

The server indexes 16 repositories (15 from Midnight organization + 1 partner):

### Core Language & SDK

| Repository    | Description                     | File Types               |
| ------------- | ------------------------------- | ------------------------ |
| `compact`     | Compact smart contract language | `.compact`, `.ts`, `.md` |
| `midnight-js` | JavaScript/TypeScript SDK       | `.ts`, `.md`             |

### Documentation

| Repository      | Description            | File Types    |
| --------------- | ---------------------- | ------------- |
| `midnight-docs` | Official documentation | `.md`, `.mdx` |

### Example DApps

| Repository        | Description                     | File Types                       |
| ----------------- | ------------------------------- | -------------------------------- |
| `example-counter` | Simple counter contract example | `.compact`, `.ts`, `.md`         |
| `example-bboard`  | Bulletin board DApp             | `.compact`, `.ts`, `.tsx`, `.md` |
| `example-dex`     | Decentralized exchange example  | `.compact`, `.ts`, `.tsx`, `.md` |

### Developer Tools

| Repository        | Description           | File Types            |
| ----------------- | --------------------- | --------------------- |
| `create-mn-app`   | CLI scaffolding tool  | `.ts`, `.md`, `.json` |
| `midnight-wallet` | Wallet implementation | `.ts`, `.tsx`, `.md`  |

### Infrastructure

| Repository             | Description         | File Types                  |
| ---------------------- | ------------------- | --------------------------- |
| `midnight-indexer`     | Blockchain indexer  | `.ts`, `.md`, `.rs`         |
| `midnight-node-docker` | Node Docker configs | `.md`, `Dockerfile`, `.yml` |

### APIs & Connectors

| Repository                    | Description        | File Types   |
| ----------------------------- | ------------------ | ------------ |
| `midnight-dapp-connector-api` | DApp connector API | `.ts`, `.md` |

### Tooling

| Repository            | Description                     | File Types           |
| --------------------- | ------------------------------- | -------------------- |
| `compact-tree-sitter` | Tree-sitter grammar for Compact | `.js`, `.md`, `.scm` |

### Community

| Repository               | Description           | File Types |
| ------------------------ | --------------------- | ---------- |
| `midnight-awesome-dapps` | Curated DApp list     | `.md`      |
| `contributor-hub`        | Contributor resources | `.md`      |

### Partner Libraries

| Repository                       | Description                                                           | File Types               |
| -------------------------------- | --------------------------------------------------------------------- | ------------------------ |
| `OpenZeppelin/compact-contracts` | OpenZeppelin Contracts for Midnight - secure, audited design patterns | `.compact`, `.ts`, `.md` |

## Core Components

### 1. Server (`src/server.ts`)

The main MCP server implementation using `@modelcontextprotocol/sdk`. Handles:

- Tool registration and execution
- Resource listing and reading
- Prompt template management
- Request/response lifecycle

```typescript
const server = new Server(SERVER_INFO, {
  capabilities: {
    tools: {},
    resources: { subscribe: true, listChanged: true },
    prompts: { listChanged: true },
  },
});
```

### 2. Tools (`src/tools/`)

Fourteen tools exposed to AI assistants:

| Tool                              | File          | Description                              |
| --------------------------------- | ------------- | ---------------------------------------- |
| `midnight-search-compact`         | search.ts     | Semantic search across Compact contracts |
| `midnight-search-typescript`      | search.ts     | Search TypeScript SDK code               |
| `midnight-search-docs`            | search.ts     | Search documentation                     |
| `midnight-analyze-contract`       | analyze.ts    | Static analysis of Compact contracts     |
| `midnight-explain-circuit`        | analyze.ts    | Plain-language circuit explanations      |
| `midnight-get-file`               | repository.ts | Fetch files from GitHub repos            |
| `midnight-list-examples`          | repository.ts | List example contracts/DApps             |
| `midnight-get-latest-updates`     | repository.ts | Recent repository changes                |
| `midnight-get-version-info`       | repository.ts | Get latest version and release info      |
| `midnight-check-breaking-changes` | repository.ts | Check for breaking changes since version |
| `midnight-get-migration-guide`    | repository.ts | Migration guide between versions         |
| `midnight-get-file-at-version`    | repository.ts | Get file at specific version             |
| `midnight-compare-syntax`         | repository.ts | Compare file between two versions        |
| `midnight-get-latest-syntax`      | repository.ts | Get authoritative syntax reference       |

Each tool has:

- Zod schema for input validation
- Async handler function
- Structured JSON output

### 3. Resources (`src/resources/`)

Sixteen resources accessible via `midnight://` URIs:

**Documentation** (`docs.ts`):

- `midnight://docs/compact-reference`
- `midnight://docs/sdk-api`
- `midnight://docs/concepts/zero-knowledge`
- `midnight://docs/concepts/shielded-state`
- `midnight://docs/concepts/witnesses`
- `midnight://docs/concepts/kachina`

**Code** (`code.ts`):

- `midnight://code/examples/counter`
- `midnight://code/examples/bboard`
- `midnight://code/patterns/state-management`
- `midnight://code/patterns/access-control`
- `midnight://code/patterns/privacy-preserving`
- `midnight://code/templates/token`
- `midnight://code/templates/voting`

**Schemas** (`schemas.ts`):

- `midnight://schema/compact-ast`
- `midnight://schema/transaction`
- `midnight://schema/proof`

### 4. Prompts (`src/prompts/`)

Five prompt templates for common development tasks:

| Prompt                        | Purpose                          |
| ----------------------------- | -------------------------------- |
| `midnight-create-contract`    | Guided contract creation         |
| `midnight-review-contract`    | Security & best practices review |
| `midnight-explain-concept`    | Educational explanations         |
| `midnight-compare-approaches` | Implementation comparison        |
| `midnight-debug-contract`     | Debug assistance                 |

### 5. Pipeline (`src/pipeline/`)

Data ingestion pipeline for indexing Midnight repositories:

```
GitHub API → Parser → Embeddings → Vector Store
```

**Components**:

- `github.ts` - Repository fetching via Octokit
- `parser.ts` - Compact/TypeScript/Markdown parsing
- `embeddings.ts` - OpenAI text-embedding-3-small
- `indexer.ts` - Orchestrates the pipeline

### 6. Vector Store (`src/db/`)

ChromaDB integration for semantic search:

```typescript
interface CodeDocument {
  id: string;
  content: string;
  embedding: number[];
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
}
```

**Fallback behavior**: When ChromaDB is unavailable, the server continues without search functionality.

### 7. Configuration (`src/utils/`)

Zod-validated configuration from environment variables:

```typescript
const ConfigSchema = z.object({
  githubToken: z.string().optional(),
  chromaUrl: z.string().default("http://localhost:8000"),
  openaiApiKey: z.string().optional(),
  embeddingModel: z.string().default("text-embedding-3-small"),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  syncInterval: z.number().default(900000),
});
```

## Data Flow

### Search Query Flow

```
1. User asks Claude: "Find access control examples"
2. Claude calls tool: midnight-search-compact
3. Server receives request via stdio
4. Query → OpenAI → Embedding vector
5. Vector → ChromaDB → Similar documents
6. Results formatted and returned
7. Claude presents findings to user
```

### Contract Analysis Flow

```
1. User provides Compact code to Claude
2. Claude calls tool: midnight-analyze-contract
3. Server parses contract (no external deps)
4. Static analysis:
   - Structure extraction (ledger, circuits, witnesses)
   - Pattern detection
   - Security checks
5. Analysis returned as structured JSON
```

### Resource Read Flow

```
1. Claude reads: midnight://docs/compact-reference
2. Server maps URI to content provider
3. Content fetched (GitHub or cached)
4. Markdown/code returned to Claude
```

## File Structure

```
src/
├── index.ts              # Entry point, starts server
├── server.ts             # MCP server setup & handlers
├── tools/
│   ├── index.ts          # Tool registry
│   ├── search.ts         # Search tools (3)
│   ├── analyze.ts        # Analysis tools (2)
│   └── repository.ts     # GitHub tools (3)
├── resources/
│   ├── index.ts          # Resource registry
│   ├── docs.ts           # Documentation resources (6)
│   ├── code.ts           # Code resources (7)
│   └── schemas.ts        # Schema resources (3)
├── prompts/
│   ├── index.ts          # Prompt registry
│   └── templates.ts      # Prompt definitions (5)
├── pipeline/
│   ├── github.ts         # GitHub API client
│   ├── parser.ts         # Code parsing
│   ├── embeddings.ts     # OpenAI embeddings
│   └── indexer.ts        # Indexing orchestration
├── db/
│   ├── index.ts          # DB exports
│   └── vectorStore.ts    # ChromaDB integration
└── utils/
    ├── index.ts          # Utils exports
    ├── config.ts         # Configuration
    └── logger.ts         # Logging
```

## Error Handling

### Graceful Degradation

The server is designed to work with partial configuration:

| Missing        | Impact                               |
| -------------- | ------------------------------------ |
| OpenAI API key | Search returns dummy results         |
| ChromaDB       | Search returns empty results         |
| GitHub token   | Lower rate limits (60/hr vs 5000/hr) |

### Error Responses

Tools return structured errors:

```typescript
{
  content: [{
    type: "text",
    text: "Error executing tool: <message>"
  }],
  isError: true
}
```

## Security Considerations

1. **Read-only by default** - No write operations to repositories
2. **Environment variables** - Secrets never logged or exposed
3. **Input validation** - All tool inputs validated via Zod
4. **Rate limiting** - Respects GitHub API limits
5. **Local vector store** - Data stays on user's machine

## Extending the Server

### Adding a New Tool

1. Define Zod schema in `src/tools/`
2. Implement handler function
3. Register in `src/tools/index.ts`

```typescript
export const myToolDef = {
  name: "midnight-my-tool",
  description: "Description for AI",
  inputSchema: zodToJsonSchema(MyInputSchema),
  handler: myToolHandler,
};
```

### Adding a New Resource

1. Add URI pattern to `src/resources/`
2. Implement content provider
3. Register in `allResources` array

### Adding a New Prompt

1. Define in `src/prompts/templates.ts`
2. Register in `promptDefinitions` array
