# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-12-23

### Added

- **Compound Tools** - Multi-step operations in a single call (reduces token usage by 50-70%):
  - `midnight-upgrade-check`: Combines version check + breaking changes + migration guide
  - `midnight-get-repo-context`: Combines version info + syntax reference + relevant examples
- **Tool Categories** for progressive disclosure:
  - `search`, `analyze`, `repository`, `versioning`, `generation`, `health`, `compound`
  - Enables clients to group/filter tools by domain
- **Enhanced Tool Annotations**:
  - `destructiveHint`: Marks tools that perform irreversible actions
  - `requiresConfirmation`: Marks tools requiring human confirmation
  - `category`: Tool category for UI grouping

### Changed

- All 21 tools now include category annotations
- Compound tools marked with ⚡ emoji for visibility
- Improved upgrade recommendations with urgency levels (none/low/medium/high/critical)

## [0.1.9] - 2025-12-23

### Fixed

- **Permanent fix for undefined repo parameter**: All repository handlers now safely default to "compact" when repo param is undefined/empty
- Fixed toLowerCase error in `midnight-get-latest-syntax`, `midnight-get-version-info`, `midnight-check-breaking-changes`, `midnight-get-migration-guide`, `midnight-get-file-at-version`, and `midnight-compare-syntax` tools
- Handlers now use defensive coding pattern with `input?.repo || "compact"`

## [0.1.1] - 2025-12-21

### Fixed

- Throw error on invalid subscription URIs (was silent success)
- Add validation for sampling response structure
- Safe JSON parsing with error handling in AI review tool
- Align output schemas with actual function return types
- Add `clearSubscriptions()` for server reset/testing

## [0.1.0] - 2025-12-21

### Added

- **3 AI-Powered Tools** (require MCP Sampling support):
  - `midnight-generate-contract` - Generate contracts from natural language
  - `midnight-review-contract` - AI security review with suggestions
  - `midnight-document-contract` - Generate markdown/jsdoc documentation

- **Tool Annotations** on all 19 tools:
  - `readOnlyHint`, `idempotentHint`, `openWorldHint`, `longRunningHint`
  - Human-readable `title` for UI display

- **Structured Output Schemas**: JSON schemas for tool outputs

- **Resource Templates** (RFC 6570 URI Templates):
  - `midnight://code/{owner}/{repo}/{path}`
  - `midnight://docs/{section}/{topic}`
  - `midnight://examples/{category}/{name}`
  - `midnight://schema/{type}`

- **Sampling Capability**: Server can request LLM completions from client

- **Resource Subscriptions**: Subscribe/unsubscribe to resource changes

- **Expanded Indexing**:
  - Now indexing `/blog` posts from midnight-docs
  - Now indexing `/docs/api` reference documentation
  - 26,142 documents indexed (up from ~22,000)
  - 24 repositories (removed broken rs-merkle)

## [0.0.9] - 2025-12-20

### Added

- Expanded repository coverage to 25 repos
- Added ZK libraries: halo2, midnight-trusted-setup, rs-merkle
- Added developer tools: compact-tree-sitter, compact-zed, setup-compact-action
- Added community repos: contributor-hub, night-token-distribution

## [0.0.2] - 2025-12-19

### Changed

- Optimized npm package size (426 kB → 272 kB)
- Excluded source maps from published package

### Fixed

- Tool names now use hyphens instead of colons (MCP pattern compliance)
- Claude Desktop config JSON formatting

## [0.0.1] - 2025-12-19

### Added

- Initial release
- **16 MCP Tools**:
  - `midnight-search-compact` - Semantic search for Compact code
  - `midnight-search-typescript` - Search TypeScript SDK code
  - `midnight-search-docs` - Full-text documentation search
  - `midnight-analyze-contract` - Contract analysis and security checks
  - `midnight-explain-circuit` - Circuit explanation in plain language
  - `midnight-get-file` - Retrieve files from repositories
  - `midnight-list-examples` - List example contracts
  - `midnight-get-latest-updates` - Recent repository changes
  - `midnight-get-version-info` - Version and release info
  - `midnight-check-breaking-changes` - Breaking change detection
  - `midnight-get-migration-guide` - Migration guides between versions
  - `midnight-get-file-at-version` - Get file at specific version
  - `midnight-compare-syntax` - Compare files between versions
  - `midnight-get-latest-syntax` - Get latest syntax reference
  - `midnight-health-check` - Server health status
  - `midnight-get-status` - Rate limits and cache stats

- **20 Documentation Resources**:
  - Compact language reference
  - TypeScript SDK docs
  - OpenZeppelin token patterns
  - Security best practices

- **16 Indexed Repositories**:
  - Midnight core repos (compact, midnight-js, docs)
  - Example DApps (counter, bboard, dex)
  - Developer tools (create-mn-app, wallet)
  - OpenZeppelin compact-contracts

- **Features**:
  - Zero-config mode (works without env vars)
  - In-memory caching for GitHub API
  - Graceful degradation without ChromaDB
  - Version-aware code recommendations
