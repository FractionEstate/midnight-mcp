# Midnight + Next.js Development MCP Server

A Model Context Protocol (MCP) server combining Midnight Network blockchain development tools with Next.js DevTools for building decentralized applications.

## 🌙 Features

### Midnight Network Tools
- **`midnight_init`** - Initialize development context
- **`midnight_network_status`** - Check network health (Indexer, Proof Server, Node)
- **`midnight_get_balance`** - Query token balances
- **`midnight_get_block`** - Query blockchain blocks
- **`midnight_get_transaction`** - Query transaction details
- **`midnight_search_docs`** - Search Midnight documentation
- **`midnight_scaffold_project`** - Create new dApp projects
- **`midnight_compile_contract`** - Compile Compact contracts
- **`midnight_analyze_contract`** - Static analysis for contracts

### Next.js DevTools
- **`init`** - Initialize Next.js development context
- **`nextjs_docs`** - Search Next.js documentation
- **`nextjs_index`** - Discover running dev servers
- **`nextjs_call`** - Execute runtime diagnostic tools
- **`browser_eval`** - Browser automation with Playwright
- **`upgrade_nextjs_16`** - Next.js 16 upgrade guide
- **`enable_cache_components`** - Cache Components migration

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/your-username/midnight-nextjs-mcp.git
cd midnight-nextjs-mcp

# Install dependencies
pnpm install

# Build
pnpm build
```

## 🚀 Usage

### With Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "midnight-nextjs": {
      "command": "node",
      "args": ["/path/to/midnight-nextjs-mcp/dist/index.js"]
    }
  }
}
```

### CLI Flags

```bash
# Enable both tool categories (default)
node dist/index.js

# Disable Midnight tools
node dist/index.js --no-midnight

# Disable Next.js tools
node dist/index.js --no-nextjs
```

## 🏗️ Project Structure

```
midnight-nextjs-mcp/
├── src/
│   ├── index.ts                    # Server entry point
│   ├── tools/
│   │   ├── index.ts                # Unified tool registry
│   │   ├── midnight/               # Midnight Network tools
│   │   │   ├── init.ts
│   │   │   ├── network-status.ts
│   │   │   ├── get-balance.ts
│   │   │   ├── get-block.ts
│   │   │   ├── get-transaction.ts
│   │   │   ├── search-docs.ts
│   │   │   ├── scaffold-project.ts
│   │   │   ├── compile-contract.ts
│   │   │   └── analyze-contract.ts
│   │   └── nextjs/                 # Next.js DevTools
│   │       ├── init.ts
│   │       ├── nextjs-docs.ts
│   │       ├── nextjs_index.ts
│   │       ├── nextjs_call.ts
│   │       ├── browser-eval.ts
│   │       ├── upgrade-nextjs-16.ts
│   │       └── enable-cache-components.ts
│   ├── providers/                  # Midnight API providers
│   │   ├── index.ts
│   │   ├── indexer.ts              # GraphQL indexer client
│   │   ├── proof-server.ts         # Proof generation client
│   │   └── node.ts                 # Node RPC client
│   ├── resources/                  # MCP resources
│   │   ├── (midnight-compact)/     # Compact language docs
│   │   ├── (midnight-sdk)/         # SDK documentation
│   │   ├── (cache-components)/     # Next.js cache docs
│   │   └── ...
│   ├── prompts/                    # MCP prompts
│   │   ├── create-midnight-contract.ts
│   │   ├── upgrade-nextjs-16.ts
│   │   └── enable-cache-components.ts
│   └── types/                      # TypeScript definitions
│       ├── midnight.ts
│       └── mcp.ts
├── package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

```bash
# Midnight Network (optional, defaults to testnet)
MIDNIGHT_NETWORK=testnet
MIDNIGHT_INDEXER_URL=https://indexer.testnet.midnight.network/graphql
MIDNIGHT_PROOF_SERVER_URL=https://proof-server.testnet.midnight.network
MIDNIGHT_NODE_URL=https://rpc.testnet.midnight.network
```

### Network Configurations

| Network | Indexer | Proof Server |
|---------|---------|--------------|
| Testnet | indexer.testnet.midnight.network | proof-server.testnet.midnight.network |
| Devnet | localhost:8080 | localhost:6300 |

## 📚 Resources

The server exposes documentation resources:

### Midnight Resources
- `midnight://compact/overview` - Compact language introduction
- `midnight://compact/reference` - Complete syntax reference
- `midnight://sdk/overview` - Midnight.js SDK guide

### Next.js Resources
- `nextjs-docs://llms-index` - Documentation index
- `cache-components://overview` - Cache Components guide

## 🧪 Development

```bash
# Watch mode
pnpm dev

# Type check
pnpm typecheck

# Run tests
pnpm test

# Build
pnpm build
```

## 📖 Documentation

- [Midnight Network Docs](https://docs.midnight.network)
- [Next.js Docs](https://nextjs.org/docs)
- [MCP Specification](https://modelcontextprotocol.io)

## 🤝 Contributing

Contributions welcome! Please read the contributing guidelines first.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ for the Midnight and Next.js communities.
