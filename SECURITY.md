# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.3.x   | :white_check_mark: |
| 0.2.x   | :white_check_mark: |
| < 0.2   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Midnight + Next.js MCP, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email the maintainer directly or use GitHub's private vulnerability reporting
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes

We will respond within 48 hours and work with you to resolve the issue.

## Security Considerations

### API Keys

- Never commit API keys to the repository
- Use environment variables for sensitive data
- The `.env` file is gitignored by default

### GitHub Token Permissions

- Use tokens with minimal required permissions
- `public_repo` scope is sufficient for most operations
- Consider using fine-grained tokens

### ChromaDB (Local Mode)

- If running ChromaDB locally, secure it appropriately
- Don't expose ChromaDB ports publicly without authentication

### MCP Server Security

- The server only exposes read-only operations by default
- All tool inputs are validated via Zod schemas
- Path traversal and protocol injection are blocked

## Dependencies

We regularly update dependencies to patch known vulnerabilities. Run `npm audit` to check for issues.
