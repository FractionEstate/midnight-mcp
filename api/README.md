# Midnight MCP API (Cloudflare Workers)

Cloudflare Workers + Vectorize backend for midnight-mcp semantic search.

## Quick Start (Local Development)

```bash
cd api
npm install
npm run dev  # Starts local server at http://localhost:8787
```

Then in another terminal, test it:

```bash
curl -X POST http://localhost:8787/v1/search/compact \
  -H "Content-Type: application/json" \
  -d '{"query": "token transfer", "limit": 5}'
```

> **Note:** Local dev uses Vectorize emulation. For full functionality, deploy to Cloudflare.

## Full Setup (for deployment)

### 1. Create Vectorize Index

```bash
npm run create-index
```

### 2. Add OpenAI API Key

```bash
npx wrangler secret put OPENAI_API_KEY
# Enter your OpenAI API key when prompted
```

### 3. Index Repositories

The indexing script loads from `../.env` automatically:

```bash
# Add to ../.env (project root):
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
OPENAI_API_KEY=your_openai_key
GITHUB_TOKEN=your_github_token  # Optional, increases rate limit 60 → 5000 req/hr

# Run indexing
npm run index
```

### 4. Deploy

```bash
npm run deploy
```

## Endpoints

| Endpoint                | Method | Description          |
| ----------------------- | ------ | -------------------- |
| `/health`               | GET    | Health check         |
| `/v1/search`            | POST   | Generic search       |
| `/v1/search/compact`    | POST   | Search Compact code  |
| `/v1/search/typescript` | POST   | Search TypeScript    |
| `/v1/search/docs`       | POST   | Search documentation |

### Request Format

```json
{
  "query": "your search query",
  "limit": 10
}
```

### Response Format

```json
{
  "results": [
    {
      "content": "code or documentation content",
      "relevanceScore": 0.85,
      "source": {
        "repository": "owner/repo",
        "filePath": "path/to/file.ts",
        "lines": "10-50"
      },
      "codeType": "compact|typescript|markdown"
    }
  ],
  "query": "your search query",
  "totalResults": 10
}
```
