# Contributing to Midnight + Next.js MCP

Thank you for your interest in contributing to Midnight + Next.js MCP! This guide will help you get started.

## 🚀 Getting Started

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/midnight-nextjs-mcp.git
   cd midnight-nextjs-mcp
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up environment**:
   ```bash
   cp .env.example .env
   # Add your GITHUB_TOKEN and optionally OPENAI_API_KEY
   ```
5. **Build and test**:
   ```bash
   npm run build
   npm test
   ```

## 📁 Project Structure

```
midnight-nextjs-mcp/
├── src/
│   ├── bin.ts            # CLI entry point
│   ├── index.ts          # Library exports
│   ├── server.ts         # MCP protocol handler
│   ├── tools/            # MCP tools (search, analyze, nextjs, etc.)
│   ├── resources/        # MCP resources (docs, code, schemas)
│   ├── prompts/          # MCP prompts
│   ├── utils/            # Shared utilities
│   └── db/               # Vector store (local mode)
├── api/                  # Cloudflare Workers API (hosted backend)
│   ├── src/              # API source
│   └── scripts/          # Indexing scripts
├── tests/                # Test files
└── docs/                 # Documentation
```

## 🛠️ Development Workflow

### Running Locally

```bash
npm run dev    # Watch mode with hot reload
npm run build  # Production build
npm start      # Run built server
```

### Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/bin.js
```

### Code Style

- Use TypeScript strict mode
- Follow existing code patterns
- Add JSDoc comments for public functions

## 📝 Pull Request Process

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes with clear commits
3. Add tests if applicable
4. Ensure `npm run build` and `npm test` pass
5. Push and open a PR against `main`

### Commit Message Format

Use conventional commits:

```
feat: add new search filter option
fix: handle empty query gracefully
docs: update README with Cursor config
refactor: extract common validation logic
test: add tests for analyze tool
```

### PR Checklist

- [ ] Tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Code follows existing style
- [ ] Documentation updated if needed

## 🎯 Areas for Contribution

- **New Tools**: Add tools for additional Midnight functionality
- **Documentation**: Improve docs and examples
- **Bug Fixes**: Fix issues and improve reliability
- **Performance**: Optimize caching and API calls
- **Tests**: Increase test coverage
- **Editor Support**: Add configs for more editors

## 🐛 Reporting Issues

When reporting bugs, please include:

1. Description of the issue
2. Steps to reproduce
3. Expected vs actual behavior
4. Environment (OS, Node version, editor)
5. Logs if available

## 💡 Feature Requests

We welcome feature ideas! Please:

1. Check existing issues first
2. Describe the use case
3. Explain the expected behavior

## 🤝 Code of Conduct

Be respectful and constructive. We're all here to build great tools for the Midnight ecosystem.

## 📞 Questions?

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and ideas
- **Midnight Docs**: https://docs.midnight.network
