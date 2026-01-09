/**
 * Next.js DevTools - Tool exports
 *
 * This module re-exports all Next.js development tools for easy integration
 * with the MCP server.
 */

export * as browserEval from "./browser-eval.js"
export * as enableCacheComponents from "./enable-cache-components.js"
export * as init from "./init.js"
export * as nextjsDocs from "./nextjs-docs.js"
export * as nextjsIndex from "./nextjs_index.js"
export * as nextjsCall from "./nextjs_call.js"
export * as upgradeNextjs16 from "./upgrade-nextjs-16.js"

// Tool category metadata
export const categoryMetadata = {
  name: "nextjs",
  displayName: "Next.js DevTools",
  description: "Development tools for Next.js applications including documentation search, runtime diagnostics, browser automation, and migration utilities.",
  version: "0.3.10",
}
