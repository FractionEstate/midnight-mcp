# Midnight MCP Server

MCP server that gives AI assistants access to Midnight blockchain—search contracts, analyze code, and explore documentation.

## Quick Start

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "midnight": {
      "command": "npx",
      "args": ["-y", "midnight-mcp"]
    }
  }
}
```

Restart Claude Desktop. You can now use analysis tools, prompts, and access resources.

> **Note:** Search features won't work well without the full setup below.

---

## Full Setup (for search)

To enable semantic search across Midnight contracts and docs:

### 1. Start ChromaDB

ChromaDB is a local vector database—no account needed, just Docker:

```bash
docker run -d -p 8000:8000 chromadb/chroma
```

### 2. Get an OpenAI API key

Needed for generating embeddings. Get one at [platform.openai.com/api-keys](https://platform.openai.com/api-keys).

### 3. Update your config

```json
{
  "mcpServers": {
    "midnight": {
      "command": "npx",
      "args": ["-y", "midnight-mcp"],
      "env": {
        "OPENAI_API_KEY": "sk-...",
        "CHROMA_URL": "http://localhost:8000"
      }
    }
  }
}
```

### Optional: GitHub token

Add `"GITHUB_TOKEN": "ghp_..."` to increase API rate limits from 60 to 5000 requests/hour.

---

## What's Included

### Tools (14 total)

| Tool                              | Description                             |
| --------------------------------- | --------------------------------------- |
| `midnight-search-compact`         | Search Compact contract code            |
| `midnight-search-typescript`      | Search TypeScript SDK                   |
| `midnight-search-docs`            | Search documentation                    |
| `midnight-analyze-contract`       | Analyze contract structure and security |
| `midnight-explain-circuit`        | Explain circuits in plain language      |
| `midnight-get-file`               | Get files from Midnight repos           |
| `midnight-list-examples`          | List example contracts                  |
| `midnight-get-latest-updates`     | Recent repo changes                     |
| `midnight-get-version-info`       | Get version and release info            |
| `midnight-check-breaking-changes` | Check for breaking changes              |
| `midnight-get-migration-guide`    | Migration guides between versions       |
| `midnight-get-file-at-version`    | Get file at specific version            |
| `midnight-compare-syntax`         | Compare files between versions          |
| `midnight-get-latest-syntax`      | Latest syntax reference                 |

### Resources (20 total)

- `midnight://docs/*` — Documentation (Compact reference, SDK API, ZK concepts, OpenZeppelin patterns)
- `midnight://code/*` — Examples, patterns, and templates
- `midnight://schema/*` — AST, transaction, and proof schemas

### Prompts

- `midnight-create-contract` — Create new contracts
- `midnight-review-contract` — Security review
- `midnight-explain-concept` — Learn Midnight concepts
- `midnight-debug-contract` — Debug issues

---

## How Environment Variables Work

The npm package contains no secrets. **You provide your own credentials** via the `env` block in your config:

| Variable         | Required | Without It                             | With It              |
| ---------------- | -------- | -------------------------------------- | -------------------- |
| `GITHUB_TOKEN`   | No       | 60 API calls/hour, may hit rate limits | 5,000 calls/hour     |
| `OPENAI_API_KEY` | No       | Keyword search only (no embeddings)    | Semantic search      |
| `CHROMA_URL`     | No       | In-memory search, no persistence       | Persistent vector DB |

Your tokens stay on your machine and are only used to access services on your behalf.

---

## Developer Setup

For contributors who want to modify or extend the MCP server.

```bash
git clone https://github.com/Olanetsoft/midnight-mcp.git
cd midnight-mcp
npm install
npm run build
npm test
```

### Index Midnight repos (for search)

```bash
docker run -d -p 8000:8000 chromadb/chroma
npm run index
```

### Project Structure

```
src/
├── index.ts          # Entry point
├── server.ts         # MCP server handlers
├── tools/            # Search, analysis, repository tools
├── resources/        # Docs, code, schema providers
├── prompts/          # Prompt templates
├── pipeline/         # GitHub sync & parsing
├── db/               # ChromaDB integration
└── utils/            # Config & logging
```

## License

MIT

## Links

- [Midnight Docs](https://docs.midnight.network)
- [MCP Spec](https://modelcontextprotocol.io)
- [Midnight GitHub](https://github.com/midnightntwrk)
