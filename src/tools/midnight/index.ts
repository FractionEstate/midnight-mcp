/**
 * Midnight Network Tools - Index
 *
 * This module exports all Midnight Network development tools for integration
 * with the MCP server.
 */

export * as init from "./init.js"
export * as networkStatus from "./network-status.js"
export * as getBalance from "./get-balance.js"
export * as getBlock from "./get-block.js"
export * as getTransaction from "./get-transaction.js"
export * as searchDocs from "./search-docs.js"
export * as scaffoldProject from "./scaffold-project.js"
export * as compileContract from "./compile-contract.js"
export * as analyzeContract from "./analyze-contract.js"
export * as checkVersions from "./check-versions.js"

// Documentation tools with auto-sync
export * from "./documentation-tools.js"

// Tool category metadata
export const categoryMetadata = {
  name: "midnight",
  displayName: "Midnight Network",
  description: "Development tools for the Midnight Network blockchain including contract compilation, deployment, network queries, and documentation search.",
  version: "0.1.0",
}

