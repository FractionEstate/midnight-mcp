/**
 * Instructions Generator
 *
 * Creates server instructions based on enabled toolsets.
 * Based on GitHub MCP server instructions.go patterns.
 */

import type { ToolsetId } from "../types/mcp.js"

// =============================================================================
// TYPES
// =============================================================================

export interface InstructionsConfig {
  /** Whether to disable all instructions (useful for testing) */
  disableInstructions?: boolean
  /** Custom base instructions to prepend */
  customBaseInstructions?: string
}

// =============================================================================
// BASE INSTRUCTIONS
// =============================================================================

const BASE_INSTRUCTIONS = `The Midnight MCP Server provides tools to interact with Midnight Network and Next.js platforms.

Tool selection guidance:
  1. Use 'list_*' tools for broad, simple retrieval of information.
  2. Use 'search_*' tools for targeted queries with specific criteria.
  3. Use 'get_*' tools when you know the specific item you need.

Context management:
  1. Use pagination whenever possible to manage large result sets.
  2. Prefer specific queries over broad ones to reduce response size.

Best practices:
  1. Always check tool availability with 'list_available_toolsets' first.
  2. Enable only the toolsets you need for your current task.
  3. Review error responses carefully - they often contain guidance.
`

// =============================================================================
// TOOLSET-SPECIFIC INSTRUCTIONS
// =============================================================================

const TOOLSET_INSTRUCTIONS: Partial<Record<ToolsetId, string>> = {
  "midnight:network": `## Midnight Network

When working with Midnight Network:
- Always check network status before performing transactions
- Use 'get_balance' to verify wallet state before operations
- Transaction IDs and block numbers should be validated
- Handle proof generation errors gracefully - they may indicate invalid inputs
`,

  "midnight:contracts": `## Midnight Contracts

When working with Compact contracts:
- Always compile contracts before deployment to catch errors early
- Use 'analyze_contract' to identify potential security issues
- Review generated circuits for gas optimization opportunities
- Zero-knowledge proofs require careful witness construction
`,

  "midnight:wallet": `## Midnight Wallet

When working with wallets:
- Never expose private keys in logs or responses
- Validate addresses before sending transactions
- Always estimate gas before transaction submission
- Handle transaction signing errors with appropriate user feedback
`,

  "midnight:docs": `## Midnight Documentation

When searching documentation:
- Use specific terms related to your query
- Combine multiple searches for comprehensive answers
- Reference the official docs for the latest API changes
- Documentation versions may differ from installed SDK versions
`,

  "midnight:dev": `## Midnight Development

When scaffolding or managing projects:
- Check version compatibility before starting new projects
- Use 'check_versions' to identify outdated dependencies
- Follow migration guides when upgrading between versions
- Keep development environment aligned with production targets
`,

  "nextjs:devtools": `## Next.js DevTools

When using Next.js DevTools:
- Use 'nextjs_index' to discover available tools from the dev server
- Browser evaluation provides real runtime insights beyond HTTP checks
- Console message forwarding captures client-side errors
- Prefer Next.js native MCP tools over browser console when available
`,

  "nextjs:migration": `## Next.js Migration

When migrating Next.js applications:
- Run codemods before manual changes to automate common transformations
- Verify pages load in browser after migration steps
- Check for hydration errors which indicate SSR/CSR mismatches
- Cache components mode requires specific configuration updates
`,

  "nextjs:docs": `## Next.js Documentation

When searching Next.js documentation:
- Use versioned queries when targeting specific Next.js versions
- App Router and Pages Router have different patterns
- Server Components documentation is evolving rapidly
- Check the migration guide for breaking changes between versions
`,
}

// =============================================================================
// GENERATE INSTRUCTIONS
// =============================================================================

export interface GenerateInstructionsOptions {
  /** Enabled toolset IDs */
  enabledToolsets?: string[]
  /** Whether dynamic mode is enabled */
  dynamicMode?: boolean
  /** Whether read-only mode is enabled */
  readOnly?: boolean
  /** Whether lockdown mode is enabled */
  lockdownMode?: boolean
  /** Whether to disable all instructions (useful for testing) */
  disableInstructions?: boolean
  /** Custom base instructions to prepend */
  customBaseInstructions?: string
}

/**
 * Generate server instructions based on enabled toolsets
 */
export function generateInstructions(
  options?: GenerateInstructionsOptions | ToolsetId[]
): string {
  // Handle both old and new API
  let enabledToolsets: string[]
  let config: InstructionsConfig | undefined

  if (Array.isArray(options)) {
    // Legacy API: just an array of toolsets
    enabledToolsets = options
    config = undefined
  } else {
    // New API: options object
    enabledToolsets = options?.enabledToolsets ?? []
    config = {
      disableInstructions: options?.disableInstructions,
      customBaseInstructions: options?.customBaseInstructions,
    }
  }

  // Check if instructions are disabled
  if (config?.disableInstructions || process.env.DISABLE_INSTRUCTIONS === "true") {
    return ""
  }

  const instructions: string[] = []

  // Add base instructions
  instructions.push(config?.customBaseInstructions || BASE_INSTRUCTIONS)

  // Add mode-specific instructions
  if (typeof options === "object" && !Array.isArray(options)) {
    if (options.dynamicMode) {
      instructions.push(`
## Dynamic Toolset Mode

This server is running in dynamic toolset mode. You can enable or disable toolsets at runtime:
- Use 'list_available_toolsets' to see all available toolsets
- Use 'enable_toolset' to enable additional tools
- Use 'disable_toolset' to disable tools you no longer need
`)
    }

    if (options.readOnly) {
      instructions.push(`
## Read-Only Mode

This server is running in read-only mode. Write operations are disabled.
Only tools that read data are available.
`)
    }

    if (options.lockdownMode) {
      instructions.push(`
## Lockdown Mode

This server is running in lockdown mode with restricted access.
Some tools may require additional permissions.
`)
    }
  }

  // Add toolset-specific instructions for enabled toolsets
  for (const toolsetId of enabledToolsets) {
    const toolsetInstructions = TOOLSET_INSTRUCTIONS[toolsetId as ToolsetId]
    if (toolsetInstructions) {
      instructions.push(toolsetInstructions)
    }
  }

  // Add context-aware instructions
  if (enabledToolsets.includes("midnight:dev")) {
    instructions.push(
      "Always call 'list_available_toolsets' first to understand available capabilities."
    )
  }

  return instructions.join("\n")
}

/**
 * Get instruction snippet for a specific toolset
 */
export function getToolsetInstructions(toolsetId: ToolsetId): string | undefined {
  return TOOLSET_INSTRUCTIONS[toolsetId]
}

/**
 * Check if instructions exist for a toolset
 */
export function hasToolsetInstructions(toolsetId: ToolsetId): boolean {
  return toolsetId in TOOLSET_INSTRUCTIONS
}

// =============================================================================
// EXPORTS
// =============================================================================

export { BASE_INSTRUCTIONS, TOOLSET_INSTRUCTIONS }
