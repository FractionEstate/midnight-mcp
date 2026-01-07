# Copilot Instructions for midnight-nextjs-mcp

## Project Overview

This is a **unified MCP (Model Context Protocol) server** that gives AI assistants access to the [Midnight blockchain](https://midnight.network) ecosystem and **Next.js development**—enabling semantic search, contract analysis, documentation access, and full-stack turbo monorepo development. Published to npm as `midnight-nextjs-mcp`.

**Key references:**
- [Midnight Docs](https://docs.midnight.network) - Official documentation
- [MCP Specification](https://modelcontextprotocol.io) - Protocol standard
- [Midnight GitHub](https://github.com/midnightntwrk) - Source repositories
- [Next.js DevTools MCP](https://github.com/vercel/next-devtools-mcp) - Bundled Next.js capabilities

## Architecture

```
src/                    # MCP server (main package)
├── server.ts           # MCP protocol handler (JSON-RPC 2.0 over stdio)
├── tools/              # 29 Midnight + 7 Next.js MCP tools organized by category
│   ├── {category}/
│   │   ├── index.ts    # Barrel exports
│   │   ├── schemas.ts  # Zod validation schemas
│   │   ├── handlers.ts # Business logic
│   │   └── tools.ts    # Tool definitions with annotations
│   └── nextjs/         # Next.js tools (proxied from next-devtools-mcp)
├── resources/          # MCP resources (midnight:// URIs)
├── prompts/            # MCP prompt templates
├── pipeline/           # Parsing & indexing (parser.ts for Compact lang)
└── utils/              # Shared utilities, error handling

api/                    # Cloudflare Workers API (hosted backend)
├── src/routes/         # Hono-based HTTP endpoints
│   ├── registry.ts     # MCP Registry v0.1 API
│   └── search.ts       # Semantic search endpoints
└── scripts/            # Repository indexing scripts
```

### Two Operating Modes

- **Hosted mode** (default): Searches via hosted API. Zero config.
- **Local mode** (`MIDNIGHT_LOCAL=true`): ChromaDB + OpenAI embeddings locally.

## MCP Registry v0.1

The hosted API implements the [MCP Registry v0.1 specification](https://github.com/modelcontextprotocol/registry):

```
GET /v0.1/servers                              # List all MCP servers
GET /v0.1/servers/{name}/versions              # List versions of a server
GET /v0.1/servers/{name}/versions/{version}    # Get specific version
GET /v0.1/servers/{name}/versions/latest       # Get latest version
```

Registry URL: `https://midnight-mcp-api.midnightmcp.workers.dev`

The `server.json` file in the repository root follows the registry schema for automatic discovery.

## MCP Primitives (per spec)

This server implements three core MCP primitives:
- **Tools** (36): 29 Midnight + 7 Next.js tools (`tools/list`, `tools/call`)
- **Resources** (35): Context data via `midnight://` URIs (`resources/list`, `resources/read`)
  - 12 docs, 19 code examples/patterns/integrations/infrastructure, 3 schemas
- **Prompts** (9): Reusable templates (`prompts/list`, `prompts/get`)

All primitives support `listChanged` notifications per MCP spec.

## Code Patterns

### Adding a New Tool

Tools live in `src/tools/{category}/` with this structure:

```typescript
// schemas.ts - Define input validation with Zod
export const MyToolInputSchema = z.object({
  param: z.string().describe("Description shown to LLM"),
});

export type MyToolInput = z.infer<typeof MyToolInputSchema>;

// handlers.ts - Implement business logic
export async function myTool(input: MyToolInput) {
  // Return structured result (not stringified JSON)
  return { result: "..." };
}

// tools.ts - Define tool with annotations
export const myToolDefinition: ExtendedToolDefinition = {
  name: "midnight-my-tool",  // Always prefix with 'midnight-'
  description: "...",
  inputSchema: zodToJsonSchema(MyToolInputSchema),
  annotations: {
    readOnlyHint: true,      // Safe to retry
    openWorldHint: true,     // External data
    category: "search",      // For discovery tools
  },
};
```

Register in `src/tools/index.ts` via `allTools` array.

### Error Handling

Use `MCPError` from [src/utils/errors.ts](src/utils/errors.ts) with self-correction hints:

```typescript
import { MCPError, ErrorCodes, SelfCorrectionHints } from "../utils/errors.js";

// Provide LLM-friendly hints to help self-correct
throw new MCPError(
  "Unknown repository",
  ErrorCodes.UNKNOWN_REPO,
  `Try: ${validRepos.join(", ")}`
);
```

### Validation

All tool inputs validated via Zod schemas. Use helpers from [src/utils/validation.ts](src/utils/validation.ts):

```typescript
const queryValidation = validateQuery(input.query);
if (!queryValidation.isValid) {
  return { error: "Invalid query", details: queryValidation.errors };
}
```

### The Compact Parser

[src/pipeline/parser.ts](src/pipeline/parser.ts) extracts AST from Compact smart contracts (Midnight's ZK language) using regex:
- `ledger {}` blocks with `@private` field annotations
- `circuit` and `witness` functions with parameters/return types
- `include` statements (legacy) and `export` declarations

Returns `ParsedFile` with `codeUnits[]` for analysis tools.

## Development Commands

```bash
npm run dev          # Watch mode + auto-restart server
npm run build        # Production build via tsup
npm test             # Vitest tests
npm run typecheck    # TypeScript check only

# Test MCP server interactively
npx @modelcontextprotocol/inspector node dist/bin.js
```

## Testing Conventions

Tests in `tests/` use Vitest. Test tools by importing handlers directly:

```typescript
import { analyzeContract } from "../src/tools/analyze/index.js";

it("should analyze contract", async () => {
  const result = await analyzeContract({ code: "...", checkSecurity: true });
  expect(result.summary.hasLedger).toBe(true);
});
```

## Key Files

| File | Purpose |
|------|---------|
| [src/server.ts](src/server.ts) | MCP request routing, transport setup |
| [src/tools/index.ts](src/tools/index.ts) | Tool registration and exports |
| [src/utils/errors.ts](src/utils/errors.ts) | Error types with LLM-friendly hints |
| [src/utils/validation.ts](src/utils/validation.ts) | Input sanitization helpers |
| [src/pipeline/parser.ts](src/pipeline/parser.ts) | Compact language parser |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Full system architecture |

## Conventions

- **Tool naming**: All tools prefixed with `midnight-` (e.g., `midnight-search-compact`)
- **ES Modules**: Use `.js` extensions in imports (`import { x } from "./file.js"`)
- **Logging**: Use `logger` from utils (logs to stderr to avoid stdio interference)
- **Caching**: Use `searchCache` from utils for expensive operations
- **Commits**: Conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- **GitHub org**: Midnight repos are under `midnightntwrk` (not `midnight`)

## Tool Categories

| Category | Tools | Purpose |
|----------|-------|---------|
| `search` | 4 | Semantic search across Compact, TypeScript, docs |
| `analyze` | 2 | Static analysis, circuit explanation |
| `repository` | 12 | File access, versioning, migration guides, contract structure |
| `generation` | 3 | AI-powered contract generation (requires sampling) |
| `health` | 5 | Server status, version checking, data freshness |
| `meta` | 3 | Tool discovery and suggestions |
| `nextjs` | 7+ | Next.js DevTools (proxied from next-devtools-mcp) |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | No | GitHub PAT (60 → 5000 req/hr) |
| `MIDNIGHT_LOCAL` | No | Set `true` for local mode |
| `OPENAI_API_KEY` | Local only | Required for local embeddings |
| `CHROMA_URL` | Local only | ChromaDB endpoint (default: `localhost:8000`) |
| `LOG_LEVEL` | No | `debug`, `info`, `warn`, `error` |

## Compact Language Quick Reference

```compact
pragma language_version 0.16;
import CompactStandardLibrary;

ledger {
  @private secretBalance: Field;  // Private state
  publicCounter: Counter;          // Public state
}

witness getSecretKey(): Bytes<32> {
  // Off-chain computation, returns private input
}

export circuit transfer(amount: Field): Void {
  assert(amount > 0, "Amount must be positive");
  ledger.publicCounter.increment(amount);
}
```

Key concepts: `ledger` (on-chain state), `circuit` (ZK-proven logic), `witness` (private inputs), `@private` (shielded fields).

## Next.js + Midnight Integration

This MCP server provides comprehensive support for building Next.js dApps with Midnight:

### Bundled next-devtools-mcp (v0.3.9+)

This MCP server bundles `next-devtools-mcp` for a unified development experience:
- `midnight-*` tools: Compact contracts, SDK docs, blockchain integration
- `nextjs-*` tools: Next.js runtime diagnostics, cache components, upgrades

### ⚠️ IMPORTANT: Auto-Initialize Every Session

**Always call `nextjs-init` at the start of every Next.js development session!**

Add this to your agent's configuration (e.g., `.claude/CLAUDE.md` or `.cursorrules`):

```markdown
When starting work on a Next.js project, ALWAYS call the `nextjs-init` tool from
midnight-nextjs-mcp FIRST to set up proper context and establish documentation
requirements. Do this automatically without being asked.
```

### Next.js Tools (Proxied)

| Tool | Description |
|------|-------------|
| `nextjs-init` | **Call first!** Initialize Next.js DevTools context |
| `nextjs-nextjs-docs` | Search/get official Next.js documentation (search + get) |
| `nextjs-browser-eval` | Playwright browser automation (start, navigate, click, screenshot, etc.) |
| `nextjs-nextjs-index` | Discover running Next.js 16+ dev servers on machine |
| `nextjs-nextjs-call` | Execute runtime diagnostic tools (`get_errors`, `get_logs`, `get_page_metadata`) |
| `nextjs-upgrade-nextjs-16` | Automated Next.js 16 upgrade with codemods |
| `nextjs-enable-cache-components` | Cache Components setup and migration with error detection |

### Next.js MCP Resources (from next-devtools-mcp)

The following resources are available via the proxied next-devtools-mcp server:

**Cache Components (12 sections):**
- `cache-components://overview` - Introduction to Cache Components
- `cache-components://core-mechanics` - How caching works internally
- `cache-components://public-caches` - Shared data caching
- `cache-components://private-caches` - User-specific caching
- `cache-components://runtime-prefetching` - Prefetching strategies
- `cache-components://request-apis` - Request-scoped APIs
- `cache-components://cache-invalidation` - Revalidation patterns
- `cache-components://advanced-patterns` - Complex caching scenarios
- `cache-components://build-behavior` - Build-time caching
- `cache-components://error-patterns` - Common errors and fixes
- `cache-components://test-patterns` - Testing cached components
- `cache-components://reference` - Complete API reference

**Next.js 16 Migration:**
- `nextjs16://migration/beta-to-stable` - Migration from beta
- `nextjs16://migration/examples` - Migration code examples

**Next.js Fundamentals:**
- `nextjs-fundamentals://use-client` - Client component directive

### Next.js Prompts

| Prompt | Description |
|--------|-------------|
| `nextjs:upgrade-to-16` | Guide for upgrading to Next.js 16 |
| `nextjs:enable-cache-components` | Cache Components migration workflow |
| `nextjs:runtime-diagnostics` | Diagnose runtime issues in Next.js 16+ |
| `midnight:nextjs-dapp` | Scaffold Midnight + Next.js turbo monorepo |

### Midnight-specific Next.js Resources

| Resource URI | Description |
|--------------|-------------|
| `midnight://code/integration/nextjs-provider` | React context provider for wallet integration |
| `midnight://code/integration/nextjs-hooks` | Custom hooks (useContract, useContractState) |
| `midnight://code/integration/turbo-config` | Full turbo monorepo configuration |
| `midnight://code/integration/nextjs-devtools` | Next.js DevTools integration guide |
| `midnight://code/integration/cache-components-guide` | Cache Components for Midnight dApps |
| `midnight://code/integration/nextjs16-migration` | Next.js 16 migration guide |

### Prompt: midnight:nextjs-dapp

Use the `midnight:nextjs-dapp` prompt to scaffold a complete turbo monorepo:

```typescript
// Arguments:
{
  projectName: "my-midnight-app",
  features: "wallet-connect, private-data, token",
  monorepoType: "turbo"  // turbo | nx | simple
}
```

### Turbo Monorepo Structure

```
my-dapp/
├── apps/
│   └── web/                    # Next.js 16+ frontend
│       ├── app/
│       │   ├── layout.tsx      # Root layout with providers
│       │   ├── page.tsx        # Landing page
│       │   └── dapp/           # Protected dApp routes
│       ├── components/
│       │   ├── providers/      # MidnightProvider, WalletProvider
│       │   └── ui/             # shadcn/ui components
│       └── lib/
│           ├── midnight/       # SDK integration
│           └── hooks/          # useWallet, useContract hooks
├── midnight-backend/           # ⚠️ LOCAL ONLY - Do not deploy
│   ├── node/                   # Block producer node
│   │   ├── config.toml         # Node configuration
│   │   └── docker-compose.yml  # Local node setup
│   └── wallet/                 # Backend wallets
│       ├── proving-server/     # ZK proving service
│       └── indexer/            # Transaction indexer
├── packages/
│   ├── relay-node/             # Relay node for transaction relay
│   │   ├── src/
│   │   │   └── relay.ts        # Relay implementation
│   │   └── package.json
│   ├── contracts/              # Compact smart contracts
│   │   ├── src/
│   │   │   └── main.compact    # Main contract
│   │   ├── test/
│   │   └── package.json
│   └── shared/                 # Shared types & utilities
│       ├── src/
│       │   ├── types.ts
│       │   └── constants.ts
│       └── package.json
├── turbo.json
├── pnpm-workspace.yaml
└── .env.local                  # Local environment variables
```

### Architecture Components

| Component | Purpose | Environment |
|-----------|---------|-------------|
| `apps/web` | Next.js 16+ frontend with wallet UI | Production |
| `midnight-backend/node` | Block producer for local dev | **Local only** |
| `midnight-backend/wallet` | Backend proving & indexing | **Local only** |
| `packages/relay-node` | Transaction relay service | Production |
| `packages/contracts` | Compact smart contracts | Production |
| `packages/shared` | Types, constants, utilities | Production |

### Key Integration Patterns

1. **Wallet Provider**: Wrap app with `MidnightProvider` from the resource
2. **Contract Hooks**: Use `useContract<T>()` for type-safe interactions
3. **WebAssembly**: Configure `next.config.ts` for ZK provers
4. **Relay Node**: Use `packages/relay-node` for transaction submission
5. **Local Development**: Start `midnight-backend/` services for local testing
4. **Transpilation**: Add workspace packages to `transpilePackages`
5. **Cache Components**: Use public caches for contract state, private for wallet
