# Midnight + Next.js MCP Server

[![npm version](https://badge.fury.io/js/midnight-nextjs-mcp.svg)](https://www.npmjs.com/package/midnight-nextjs-mcp)
[![npm downloads](https://img.shields.io/npm/dm/midnight-nextjs-mcp)](https://www.npmjs.com/package/midnight-nextjs-mcp)
[![License](https://img.shields.io/npm/l/midnight-nextjs-mcp)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![CI](https://github.com/FractionEstate/midnight-nextjs-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/FractionEstate/midnight-nextjs-mcp/actions/workflows/ci.yml)

Unified MCP server that gives AI assistants access to **Midnight blockchain** and **Next.js development**—combining Compact contract analysis, turbo monorepo scaffolding, and full-stack dApp development in one package.

## Requirements

- **Node.js 20+** (LTS recommended)

Check your version: `node --version`

<details>
<summary><strong>Using nvm?</strong> Click for Claude Desktop setup</summary>

If you use nvm, Claude Desktop may not see your nvm-managed Node. Use this config instead:

```json
{
  "mcpServers": {
    "midnight-nextjs": {
      "command": "/bin/sh",
      "args": [
        "-c",
        "source ~/.nvm/nvm.sh && nvm use 20 >/dev/null 2>&1 && npx -y midnight-nextjs-mcp@latest"
      ]
    }
  }
}
```

</details>

## Quick Start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "midnight-nextjs": {
      "command": "npx",
      "args": ["-y", "midnight-nextjs-mcp@latest"]
    }
  }
}
```

**Config file locations:**

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

### Cursor

One-click install:

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en-US/install-mcp?name=midnight-nextjs&config=eyJjb21tYW5kIjoibnB4IC15IG1pZG5pZ2h0LW5leHRqcy1tY3BAbGF0ZXN0In0=)

Or manually add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "midnight-nextjs": {
      "command": "npx",
      "args": ["-y", "midnight-nextjs-mcp@latest"]
    }
  }
}
```

### VS Code Copilot

Add to `.vscode/mcp.json` or use Command Palette: `MCP: Add Server` → "command (stdio)" → `npx -y midnight-nextjs-mcp@latest`

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "midnight-nextjs": {
      "command": "npx",
      "args": ["-y", "midnight-nextjs-mcp@latest"]
    }
  }
}
```

**No API keys required.** Restart your editor after adding the config.

> **Why `@latest`?** Unlike cached npx packages that never auto-update, `@latest` ensures you get new features and fixes on each restart. If upgrading from an older config without `@latest`, also clear your npx cache: `rm -rf ~/.npm/_npx`

---

## What's Included

### 28+ Tools

| Category          | Tools                                                                                                                             | Description                                      |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Midnight Search**        | `search-compact`, `search-typescript`, `search-docs`, `fetch-docs`                                                                | Semantic search + live docs fetching             |
| **Contract Analysis**      | `analyze-contract`, `explain-circuit`, `extract-contract-structure`                                                               | Static analysis with 15+ checks (P0-P2 severity) |
| **Repository**    | `get-file`, `list-examples`, `get-latest-updates`                                                                                 | Access files and examples                        |
| **Versioning**    | `get-version-info`, `check-breaking-changes`, `get-migration-guide`, `get-file-at-version`, `compare-syntax`, `get-latest-syntax` | Version tracking and migration                   |
| **AI Generation** | `generate-contract`, `review-contract`, `document-contract`                                                                       | AI-powered code generation _(requires sampling)_ |
| **Compound**      | `upgrade-check`, `get-repo-context`                                                                                               | Multi-step operations _(saves 50-70% tokens)_    |
| **Next.js**       | `init`, `nextjs-docs`, `browser-eval`, `nextjs-index`, `nextjs-call`, `upgrade-nextjs-16`, `enable-cache-components`             | Runtime diagnostics, docs, browser automation    |
| **Health**        | `health-check`, `get-status`, `check-version`                                                                                     | Server status and version checking               |
| **Discovery**     | `list-tool-categories`, `list-category-tools`, `suggest-tool`                                                                     | Explore available tools and get recommendations  |

Midnight tools are prefixed with `midnight-` (e.g., `midnight-search-compact`), Next.js tools with `nextjs-`.

### Next.js DevTools (Bundled)

This server bundles [next-devtools-mcp](https://github.com/vercel/next-devtools-mcp) (v0.3.9+) for unified development:

| Tool | Description |
|------|-------------|
| `nextjs-init` | **Call first!** Initialize DevTools context |
| `nextjs-nextjs-docs` | Search/get official Next.js documentation |
| `nextjs-browser-eval` | Playwright browser automation |
| `nextjs-nextjs-index` | Discover running Next.js 16+ dev servers |
| `nextjs-nextjs-call` | Execute runtime diagnostics (`get_errors`, `get_logs`, `get_page_metadata`) |
| `nextjs-upgrade-nextjs-16` | Automated upgrade with codemods |
| `nextjs-enable-cache-components` | Cache Components setup and migration |

<details>
<summary><strong>⚠️ Auto-Initialize Every Session</strong> (click to expand)</summary>

**Always call `nextjs-init` at the start of every Next.js development session!**

Add this to your agent's configuration:

**Claude Desktop/Claude Code** (`.claude/CLAUDE.md`):
```markdown
When starting work on a Next.js project, ALWAYS call the `nextjs-init` tool from
midnight-nextjs-mcp FIRST to set up proper context and establish documentation
requirements. Do this automatically without being asked.
```

**Cursor** (`.cursorrules`):
```
When working with Next.js, always call the init tool from midnight-nextjs-mcp
at the start of the session to establish proper context and documentation requirements.
```

</details>

### Next.js MCP Resources (Proxied)

Resources from next-devtools-mcp are automatically available:

<details>
<summary><strong>📚 Cache Components (13 sections)</strong></summary>

- `cache-components://overview` - Introduction
- `cache-components://core-mechanics` - How caching works
- `cache-components://public-caches` - Shared data caching
- `cache-components://private-caches` - User-specific caching
- `cache-components://runtime-prefetching` - Prefetching strategies
- `cache-components://request-apis` - Request-scoped APIs
- `cache-components://cache-invalidation` - Revalidation patterns
- `cache-components://advanced-patterns` - Complex scenarios
- `cache-components://build-behavior` - Build-time caching
- `cache-components://error-patterns` - Common errors and fixes
- `cache-components://test-patterns` - Testing cached components
- `cache-components://reference` - Complete API reference
- `cache-components://route-handlers` - Route handler caching

</details>

<details>
<summary><strong>📦 Next.js 16 Migration & Fundamentals</strong></summary>

- `nextjs16://migration/beta-to-stable` - Migration from beta
- `nextjs16://migration/examples` - Migration code examples
- `nextjs-fundamentals://use-client` - Client component directive

</details>

### MCP Capabilities

| Capability      | Feature                                         |
| --------------- | ----------------------------------------------- |
| **Tools**       | 28+ tools with `listChanged` notifications      |
| **Resources**   | 29 embedded resources with subscription support |
| **Prompts**     | 9 workflow prompts (Midnight + Next.js)         |
| **Logging**     | Client-controllable log level                   |
| **Completions** | Autocomplete for prompt arguments               |
| **Progress**    | Real-time progress for compound tools           |
| **Sampling**    | AI-powered generation (when client supports it) |
| **Next.js**     | Full turbo monorepo integration                 |

### 29 Embedded Resources

Quick references available offline:

- Compact syntax guide (v0.16-0.18)
- SDK API reference
- OpenZeppelin contracts
- Tokenomics overview
- Wallet integration
- Common errors & solutions
- Next.js integration patterns
- Turbo monorepo configuration
- Cache Components guide
- Next.js 16 migration guide

### Static Analysis

`extract-contract-structure` catches common mistakes before compilation:

| Check                     | Severity | Description                                             |
| ------------------------- | -------- | ------------------------------------------------------- |
| `deprecated_ledger_block` | P0       | Catches `ledger { }` → use `export ledger field: Type;` |
| `invalid_void_type`       | P0       | Catches `Void` → use `[]` (empty tuple)                 |
| `invalid_pragma_format`   | P0       | Catches old pragma → use `>= 0.16 && <= 0.18`           |
| `unexported_enum`         | P1       | Enums need `export` for TypeScript access               |
| `module_level_const`      | P0       | Use `pure circuit` instead                              |
| + 10 more checks          | P1-P2    | Overflow, division, assertions, etc.                    |

### 9 Prompts

**Midnight Prompts:**
- `midnight:create-contract` — Generate new contracts
- `midnight:review-contract` — Security and code review
- `midnight:explain-concept` — Learn Midnight concepts
- `midnight:compare-approaches` — Compare implementation patterns
- `midnight:debug-contract` — Troubleshoot issues
- `midnight:nextjs-dapp` — Scaffold Midnight + Next.js turbo monorepo

**Next.js Prompts:**
- `nextjs:upgrade-to-16` — Guide for upgrading to Next.js 16
- `nextjs:enable-cache-components` — Cache Components migration workflow
- `nextjs:runtime-diagnostics` — Diagnose runtime issues in Next.js 16+

---

## MCP Registry

This server includes an **MCP Registry v0.1** implementation, allowing AI clients (Copilot, Claude, etc.) to discover and configure the server automatically.

### Registry URL

```
https://midnight-mcp-api.midnightmcp.workers.dev
```

### Registry Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /v0.1` | Registry info |
| `GET /v0.1/servers` | List all servers |
| `GET /v0.1/servers/{name}/versions` | List versions |
| `GET /v0.1/servers/{name}/versions/latest` | Get latest version |

### Configure Custom Registry in IDE

**VS Code / Copilot:**
1. Open Settings → search "MCP Registry"
2. Add URL: `https://midnight-mcp-api.midnightmcp.workers.dev`
3. Restart Copilot Chat

**JetBrains (Preview/Nightly):**
1. Settings → Tools → Copilot → MCP Registry URL
2. Add the registry URL

The server will appear in "Browse MCP Servers" for one-click installation.

### server.json

This repository includes a `server.json` file following the [MCP Registry schema](https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json):

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "io.github.fractionestate/midnight-nextjs-mcp",
  "title": "Midnight + Next.js MCP",
  "description": "Unified MCP server for Midnight blockchain development and Next.js dApps...",
  "version": "0.3.0",
  "packages": [{
    "registry_name": "npm",
    "name": "midnight-nextjs-mcp",
    "version": "0.3.0",
    "runtime": "node"
  }]
}
```

---

## Indexed Repositories

The API indexes **39 Midnight repositories**:

| Category              | Repositories                                                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Core**              | `compact`, `midnight-js`, `midnight-wallet`, `midnight-docs`, `midnight-node`, `midnight-indexer`, `midnight-ledger`, `midnight-zk`                                    |
| **Examples**          | `example-counter`, `example-bboard`, `example-dex`, `create-mn-app`                                                                                                    |
| **Infrastructure**    | `midnight-node-docker`, `midnight-dapp-connector-api`, `compact-tree-sitter`, `setup-compact-action`                                                                   |
| **Partner Libraries** | `OpenZeppelin/compact-contracts`, `OpenZeppelin/midnight-apps` (LunarSwap)                                                                                             |
| **Official Partners** | `bricktowers/midnight-seabattle`, `bricktowers/midnight-identity`, `bricktowers/midnight-rwa`, `MeshJS/midnight-starter-template`, `midnames/core`                     |
| **Core Partner**      | `PaimaStudios/midnight-game-2`, `PaimaStudios/midnight-wasm-prover`, `PaimaStudios/midnight-batcher`, `PaimaStudios/midnight-impact-rps-example`                       |
| **Hackathon Winners** | Sea Battle: `ErickRomeroDev/naval-battle-game_v2`, `eddex/midnight-sea-battle-hackathon` • Mini DApp: `statera-protocol`, `nel349/midnight-bank`, `Imdavyking/zkbadge` |

---

## Advanced Configuration

### HTTP Mode

Run as an HTTP server for web integrations or remote deployment:

```bash
# Start HTTP server on port 3000
npx midnight-nextjs-mcp --http --port 3000
```

Endpoints:

- `/health` - Health check
- `/mcp` - Streamable HTTP (MCP protocol)
- `/sse` - Server-Sent Events

### CLI Options

```bash
npx midnight-nextjs-mcp --help

Options:
  --stdio          Use stdio transport (default, for Claude Desktop)
  --http           Use HTTP transport with SSE support
  --port <number>  HTTP port (default: 3000)
  --json           Output in JSON (default: YAML for better LLM efficiency)
  --github-token   GitHub token (overrides GITHUB_TOKEN env var)
  -h, --help       Show help
  -v, --version    Show version
```

> **Why YAML by default?** YAML is ~20-30% more token-efficient than JSON, which means AI assistants can process more context from tool responses.

### Local Mode

Run everything locally for privacy or offline use:

```json
{
  "mcpServers": {
    "midnight-nextjs": {
      "command": "npx",
      "args": ["-y", "midnight-nextjs-mcp@latest"],
      "env": {
        "MIDNIGHT_LOCAL": "true",
        "OPENAI_API_KEY": "sk-...",
        "CHROMA_URL": "http://localhost:8000"
      }
    }
  }
}
```

Requires ChromaDB (`docker run -d -p 8000:8000 chromadb/chroma`) and OpenAI API key.

### GitHub Token

Add `"GITHUB_TOKEN": "ghp_..."` for higher GitHub API rate limits (60 → 5000 requests/hour).

---

## Developer Setup

```bash
git clone https://github.com/FractionEstate/midnight-nextjs-mcp.git && cd midnight-nextjs-mcp
npm install && npm run build && npm test
```

The hosted API runs on Cloudflare Workers + Vectorize. See [api/README.md](./api/README.md) for backend details.

---

## Links

- [Midnight Docs](https://docs.midnight.network)
- [MCP Spec](https://modelcontextprotocol.io)
- [Midnight GitHub](https://github.com/midnightntwrk)
- [nextjs devtools](https://github.com/vercel/next-devtools-mcp)
## License

MIT

Thanks to all Stargazers ⭐️
