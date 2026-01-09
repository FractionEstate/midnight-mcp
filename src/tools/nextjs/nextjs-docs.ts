import { z } from "zod"

export const inputSchema = {
  action: z
    .enum(["search"]).optional()
    .describe("Action to perform. Use 'search' to search the Next.js docs index (llms.txt)."),
  query: z
    .string()
    .optional()
    .describe("Search query to run against the Next.js docs index (used when action=search)."),
  path: z
    .string()
    .optional()
    .describe(
      "Documentation path from the llms.txt index (e.g., '/docs/app/api-reference/functions/refresh'). You MUST get this path from the nextjs-docs://llms-index resource."
    ),
  anchor: z
    .string()
    .optional()
    .describe(
      "Optional anchor/section from the index (e.g., 'usage'). Included in response metadata to indicate relevant section."
    ),
}

type NextjsDocsArgs = {
  path?: string
  anchor?: string
  action?: "search"
  query?: string
}

export const metadata = {
  name: "nextjs_docs",
  description: `Fetch Next.js official documentation by path.

IMPORTANT: You MUST first read the \`nextjs-docs://llms-index\` MCP resource to get the correct path. Do NOT guess paths.

Workflow:
1. Read the \`nextjs-docs://llms-index\` resource to get the documentation index
2. Find the relevant path in the index for what you're looking for
3. Call this tool with that exact path

Example:
  nextjs_docs({ path: "/docs/app/api-reference/functions/refresh" })`,
  toolset: "nextjs:docs" as const,
  readOnly: true,
}

export async function handler({ path, anchor, action, query }: NextjsDocsArgs): Promise<string> {
  // Support simple 'search' action against the Next.js llms.txt index
  if (action === "search") {
    const q = (query || "").toLowerCase().trim()
    if (!q) {
      return JSON.stringify({
        error: "INVALID_ARGUMENT",
        message: "Search action requires a non-empty 'query' parameter.",
      })
    }

    try {
      const response = await fetch("https://nextjs.org/docs/llms.txt")
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const indexText = await response.text()
      const lines = indexText.split("\n").filter((l) => l.toLowerCase().includes(q))
      const sample = lines.slice(0, 10).join("\n") || "No matches found"

      return JSON.stringify({
        action: "search",
        query: q,
        results: lines.length,
        sample,
        message: `Next.js docs search results for \"${q}\"`,
      })
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      return JSON.stringify({ error: "SEARCH_FAILED", message: `Search failed: ${errMsg}` })
    }
  }

  // Default: fetch the documentation by path
  if (!path) {
    return JSON.stringify({
      error: "INVALID_ARGUMENT",
      message: "A 'path' parameter is required when not using action=search.",
    })
  }

  // Fetch the documentation
  const url = `https://nextjs.org${path}`
  const response = await fetch(url, {
    headers: {
      Accept: "text/markdown",
    },
  })

  if (!response.ok) {
    // If 404, suggest checking the index
    if (response.status === 404) {
      return JSON.stringify({
        error: "NOT_FOUND",
        message: `Documentation not found at path: "${path}". This path may be outdated. Please read the \`nextjs-docs://llms-index\` resource to find the current correct path.`,
      })
    }
    throw new Error(`Failed to fetch documentation: ${response.status} ${response.statusText}`)
  }

  const markdown = await response.text()
  return JSON.stringify({
    path,
    anchor: anchor || null,
    url: anchor ? `https://nextjs.org${path}#${anchor}` : `https://nextjs.org${path}`,
    content: markdown,
  })
}
