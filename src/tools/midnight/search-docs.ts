/**
 * Midnight Search Docs Tool
 *
 * Search Midnight Network official documentation.
 */

import { z } from "zod"

export const inputSchema = {
  query: z
    .string()
    .describe("Search query for Midnight documentation"),
  category: z
    .enum(["all", "compact", "sdk", "tutorials", "api"])
    .optional()
    .describe("Filter by documentation category"),
}

export const metadata = {
  name: "midnight_search_docs",
  description: `Search Midnight Network official documentation.

Searches across:
- Compact language reference
- SDK/API documentation
- Tutorials and guides
- Example code

Use this tool to:
- Find how to use specific features
- Look up Compact syntax
- Find code examples
- Learn Midnight concepts`,
}

type SearchDocsArgs = {
  query: string
  category?: "all" | "compact" | "sdk" | "tutorials" | "api"
}

// Documentation index based on official docs.midnight.network structure
const DOCS_INDEX = [
  // Getting Started
  {
    title: "Quickstart Guide",
    path: "/quickstart",
    category: "tutorials",
    content: "Complete setup from zero to first Midnight application. Install prerequisites, configure environment, and build your first dApp.",
    keywords: ["start", "begin", "introduction", "setup", "install", "quickstart"],
  },
  {
    title: "Development Overview",
    path: "/develop",
    category: "tutorials",
    content: "High-level architecture and key concepts for Midnight development. Understand the three-part contract structure.",
    keywords: ["overview", "architecture", "concepts", "develop", "development"],
  },
  // Compact Language
  {
    title: "Compact Language Philosophy",
    path: "/develop/reference/compact",
    category: "compact",
    content: "Understanding Compact's design philosophy: TypeScript-based syntax, ZK circuits, and three-part contract structure.",
    keywords: ["compact", "philosophy", "design", "language", "typescript"],
  },
  {
    title: "Compact Language Reference",
    path: "/develop/reference/compact/lang-ref",
    category: "compact",
    content: "Complete syntax and semantics reference for Compact. Types, circuits, witnesses, modules, and expressions.",
    keywords: ["compact", "language", "syntax", "reference", "types", "circuits"],
  },
  {
    title: "Compact Standard Library",
    path: "/develop/reference/compact/compact-std-library",
    category: "compact",
    content: "Standard library exports including Counter, Map, MerkleTree, CoinInfo, ZswapCoinPublicKey, and utility circuits.",
    keywords: ["standard", "library", "stdlib", "counter", "map", "merkletree", "coin"],
  },
  {
    title: "Compact Grammar Specification",
    path: "/develop/reference/compact/compact-grammar",
    category: "compact",
    content: "Formal grammar specification for the Compact language. EBNF definitions for parsing.",
    keywords: ["grammar", "specification", "parser", "syntax", "formal"],
  },
  // SDK
  {
    title: "Midnight API Reference",
    path: "/develop/reference/midnight-api",
    category: "sdk",
    content: "Overview of the Midnight JavaScript/TypeScript API packages for building dApps.",
    keywords: ["sdk", "api", "javascript", "typescript", "midnight-js"],
  },
  {
    title: "Compact Runtime API",
    path: "/develop/reference/midnight-api/compact-runtime",
    category: "sdk",
    content: "Runtime API for executing Compact contracts including witness context and private state.",
    keywords: ["runtime", "witness", "context", "private", "state", "execution"],
  },
  // Tutorials
  {
    title: "Tutorial Overview",
    path: "/develop/tutorial",
    category: "tutorials",
    content: "Step-by-step tutorial for building a complete Midnight application from scratch.",
    keywords: ["tutorial", "guide", "learn", "build", "application"],
  },
  {
    title: "Building Your First dApp",
    path: "/develop/tutorial/building",
    category: "tutorials",
    content: "Hands-on guide to building your first Midnight decentralized application.",
    keywords: ["building", "dapp", "first", "app", "create"],
  },
  {
    title: "Examples Repository",
    path: "/develop/tutorial/building/examples-repo",
    category: "tutorials",
    content: "Sample repository with reference implementations: bulletin board, private auction, identity verification.",
    keywords: ["examples", "samples", "repository", "reference", "bulletin", "auction"],
  },
  {
    title: "High-Level Architecture",
    path: "/develop/tutorial/high-level-arch",
    category: "tutorials",
    content: "Understanding how all the pieces fit together: contracts, proofs, ledger, and wallet.",
    keywords: ["architecture", "overview", "components", "system", "design"],
  },
  // Learn
  {
    title: "What is Midnight",
    path: "/learn/what-is-midnight",
    category: "tutorials",
    content: "Introduction to Midnight Network - a zero-knowledge partner chain to Cardano for privacy-preserving applications.",
    keywords: ["what", "midnight", "introduction", "overview", "cardano", "privacy"],
  },
  {
    title: "Glossary",
    path: "/learn/glossary",
    category: "tutorials",
    content: "Definitions of key Midnight terms: circuits, witnesses, ledger, shielded, ZK proofs, and more.",
    keywords: ["glossary", "terms", "definitions", "vocabulary"],
  },
  {
    title: "Learning Resources",
    path: "/learn/resources",
    category: "tutorials",
    content: "Additional learning resources, articles, and community links for Midnight developers.",
    keywords: ["resources", "learn", "community", "links"],
  },
  // FAQ
  {
    title: "Developer FAQ",
    path: "/develop/faq",
    category: "api",
    content: "Frequently asked questions about Midnight development, troubleshooting, and best practices.",
    keywords: ["faq", "questions", "help", "troubleshoot", "common"],
  },
  // Validate
  {
    title: "Run a Validator",
    path: "/validate/run-a-validator",
    category: "api",
    content: "Guide for Cardano SPOs to run Midnight validators. Hardware requirements and setup.",
    keywords: ["validator", "node", "spo", "stake", "operator", "run"],
  },
]

export async function handler(args: SearchDocsArgs): Promise<string> {
  const query = args.query.toLowerCase()
  const category = args.category ?? "all"

  // Simple search scoring
  const results = DOCS_INDEX
    .filter(doc => category === "all" || doc.category === category)
    .map(doc => {
      let score = 0
      const queryWords = query.split(/\s+/)

      // Title match (highest weight)
      if (doc.title.toLowerCase().includes(query)) {
        score += 10
      }
      queryWords.forEach(word => {
        if (doc.title.toLowerCase().includes(word)) score += 3
      })

      // Keyword match
      queryWords.forEach(word => {
        if (doc.keywords.some(kw => kw.includes(word) || word.includes(kw))) {
          score += 5
        }
      })

      // Content match
      if (doc.content.toLowerCase().includes(query)) {
        score += 2
      }
      queryWords.forEach(word => {
        if (doc.content.toLowerCase().includes(word)) score += 1
      })

      return { ...doc, score }
    })
    .filter(doc => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  if (results.length === 0) {
    return `# 📚 Midnight Documentation Search

**Query:** "${args.query}"
**Category:** ${category}

## No Results Found

No documentation matched your search query.

## Suggestions

1. Try different keywords
2. Use broader search terms
3. Remove category filter (search all)

## Browse Documentation

- 📖 [Getting Started](/getting-started)
- 📝 [Compact Reference](/compact/reference)
- 🔧 [SDK Overview](/sdk/overview)
- 🎓 [Tutorials](/tutorials)
`
  }

  const categoryEmoji: Record<string, string> = {
    compact: "📝",
    sdk: "🔧",
    tutorials: "🎓",
    api: "🔌",
  }

  const resultsTable = results.map(doc =>
    `| ${categoryEmoji[doc.category] ?? "📄"} | [${doc.title}](https://docs.midnight.network${doc.path}) | ${doc.content.slice(0, 80)}... |`
  ).join("\n")

  return `# 📚 Midnight Documentation Search

**Query:** "${args.query}"
**Category:** ${category}
**Results:** ${results.length}

## Search Results

| | Title | Description |
|-|-------|-------------|
${resultsTable}

---

## Documentation Links

- 🌐 [docs.midnight.network](https://docs.midnight.network)
- 📖 [GitHub Examples](https://github.com/midnightntwrk)

Use a more specific query or browse the categories above for more information.
`
}
