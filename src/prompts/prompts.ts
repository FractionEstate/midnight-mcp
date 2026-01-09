/**
 * Enhanced Prompt System
 *
 * Prompts with toolset metadata and feature flag support.
 * Based on GitHub MCP server inventory/prompts.go patterns.
 */

import { z } from "zod"
import type { ToolsetID, ToolsetMetadata } from "../toolsets/toolsets.js"

// =============================================================================
// PROMPT TYPES
// =============================================================================

/**
 * Prompt argument definition
 */
export interface PromptArgument {
  /** Argument name */
  name: string
  /** Human-readable description */
  description?: string
  /** Whether argument is required */
  required?: boolean
}

/**
 * Prompt message content
 */
export interface PromptMessage {
  /** Role: user, assistant, or system */
  role: "user" | "assistant" | "system"
  /** Message content */
  content: string
}

/**
 * Prompt definition
 */
export interface Prompt {
  /** Unique name for this prompt */
  name: string
  /** Human-readable description */
  description?: string
  /** Arguments this prompt accepts */
  arguments?: PromptArgument[]
}

/**
 * Prompt handler result
 */
export interface PromptResult {
  /** Description of the prompt result */
  description?: string
  /** Messages to return */
  messages: PromptMessage[]
}

/**
 * Prompt handler function
 */
export type PromptHandler = (
  args: Record<string, string>
) => Promise<PromptResult>

// =============================================================================
// SERVER PROMPT
// =============================================================================

/**
 * Server prompt with toolset metadata
 */
export interface ServerPrompt {
  /** Prompt definition */
  prompt: Prompt
  /** Handler function */
  handler: PromptHandler
  /** Toolset this prompt belongs to */
  toolset: ToolsetMetadata
  /** Feature flag that must be enabled for this prompt */
  featureFlagEnable?: string
  /** Feature flag that disables this prompt when enabled */
  featureFlagDisable?: string
}

/**
 * Create a server prompt
 */
export function newServerPrompt(
  toolset: ToolsetMetadata,
  prompt: Prompt,
  handler: PromptHandler
): ServerPrompt {
  return {
    prompt,
    handler,
    toolset,
  }
}

// =============================================================================
// PROMPT BUILDER
// =============================================================================

/**
 * Builder for creating server prompts
 */
export class PromptBuilder {
  private serverPrompt: Partial<ServerPrompt> = {
    prompt: {
      name: "",
      arguments: [],
    },
  }

  /**
   * Set the prompt name
   */
  name(name: string): this {
    this.serverPrompt.prompt!.name = name
    return this
  }

  /**
   * Set the description
   */
  description(description: string): this {
    this.serverPrompt.prompt!.description = description
    return this
  }

  /**
   * Add an argument
   */
  argument(arg: PromptArgument): this {
    if (!this.serverPrompt.prompt!.arguments) {
      this.serverPrompt.prompt!.arguments = []
    }
    this.serverPrompt.prompt!.arguments.push(arg)
    return this
  }

  /**
   * Add a required argument
   */
  requiredArg(name: string, description?: string): this {
    return this.argument({ name, description, required: true })
  }

  /**
   * Add an optional argument
   */
  optionalArg(name: string, description?: string): this {
    return this.argument({ name, description, required: false })
  }

  /**
   * Set the toolset
   */
  toolset(toolset: ToolsetMetadata): this {
    this.serverPrompt.toolset = toolset
    return this
  }

  /**
   * Set the handler
   */
  handler(handler: PromptHandler): this {
    this.serverPrompt.handler = handler
    return this
  }

  /**
   * Set feature flag that enables this prompt
   */
  enabledByFlag(flagName: string): this {
    this.serverPrompt.featureFlagEnable = flagName
    return this
  }

  /**
   * Set feature flag that disables this prompt
   */
  disabledByFlag(flagName: string): this {
    this.serverPrompt.featureFlagDisable = flagName
    return this
  }

  /**
   * Build the prompt
   */
  build(): ServerPrompt {
    if (!this.serverPrompt.prompt?.name) {
      throw new Error("Prompt name is required")
    }
    if (!this.serverPrompt.toolset) {
      throw new Error("Prompt toolset is required")
    }
    if (!this.serverPrompt.handler) {
      throw new Error("Prompt handler is required")
    }

    return this.serverPrompt as ServerPrompt
  }
}

/**
 * Create a new prompt builder
 */
export function promptBuilder(): PromptBuilder {
  return new PromptBuilder()
}

// =============================================================================
// PROMPT REGISTRY
// =============================================================================

/**
 * Feature flag checker function type
 */
export type FeatureFlagChecker = (flagName: string) => boolean | Promise<boolean>

/**
 * Registry for managing prompts
 */
export class PromptRegistry {
  private prompts: ServerPrompt[] = []
  private featureChecker?: FeatureFlagChecker
  private enabledToolsets: Set<ToolsetID> | null = null // null = all enabled

  /**
   * Register a prompt
   */
  register(prompt: ServerPrompt): this {
    this.prompts.push(prompt)
    return this
  }

  /**
   * Register multiple prompts
   */
  registerAll(prompts: ServerPrompt[]): this {
    this.prompts.push(...prompts)
    return this
  }

  /**
   * Set the feature flag checker
   */
  setFeatureChecker(checker: FeatureFlagChecker): this {
    this.featureChecker = checker
    return this
  }

  /**
   * Set enabled toolsets (null = all enabled)
   */
  setEnabledToolsets(toolsets: ToolsetID[] | null): this {
    this.enabledToolsets = toolsets ? new Set(toolsets) : null
    return this
  }

  /**
   * Check if a toolset is enabled
   */
  private isToolsetEnabled(toolsetId: ToolsetID): boolean {
    if (this.enabledToolsets === null) return true
    return this.enabledToolsets.has(toolsetId)
  }

  /**
   * Check feature flags for a prompt
   */
  private async isFeatureFlagAllowed(prompt: ServerPrompt): Promise<boolean> {
    if (!this.featureChecker) return true

    // Check enable flag
    if (prompt.featureFlagEnable) {
      const enabled = await this.featureChecker(prompt.featureFlagEnable)
      if (!enabled) return false
    }

    // Check disable flag
    if (prompt.featureFlagDisable) {
      const disabled = await this.featureChecker(prompt.featureFlagDisable)
      if (disabled) return false
    }

    return true
  }

  /**
   * Get available prompts (filtered by toolset and feature flags)
   */
  async getAvailablePrompts(): Promise<ServerPrompt[]> {
    const result: ServerPrompt[] = []

    for (const prompt of this.prompts) {
      // Check toolset
      if (!this.isToolsetEnabled(prompt.toolset.id)) continue

      // Check feature flags
      if (!(await this.isFeatureFlagAllowed(prompt))) continue

      result.push(prompt)
    }

    // Sort by toolset ID, then by name
    result.sort((a, b) => {
      if (a.toolset.id !== b.toolset.id) {
        return a.toolset.id.localeCompare(b.toolset.id)
      }
      return a.prompt.name.localeCompare(b.prompt.name)
    })

    return result
  }

  /**
   * Find a prompt by name
   */
  findByName(name: string): ServerPrompt | undefined {
    return this.prompts.find((p) => p.prompt.name === name)
  }

  /**
   * Get all registered prompts (unfiltered)
   */
  getAllPrompts(): ServerPrompt[] {
    return [...this.prompts]
  }

  /**
   * Get prompts by toolset
   */
  getPromptsByToolset(toolsetId: ToolsetID): ServerPrompt[] {
    return this.prompts.filter((p) => p.toolset.id === toolsetId)
  }

  /**
   * Handle a prompt request
   */
  async handlePrompt(
    name: string,
    args: Record<string, string>
  ): Promise<PromptResult | null> {
    const prompt = this.findByName(name)
    if (!prompt) return null
    return prompt.handler(args)
  }
}

/**
 * Create a new prompt registry
 */
export function createPromptRegistry(): PromptRegistry {
  return new PromptRegistry()
}

// =============================================================================
// PROMPT SCHEMAS
// =============================================================================

/**
 * Zod schema for prompt argument
 */
export const PromptArgumentSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
})

/**
 * Zod schema for prompt
 */
export const PromptSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  arguments: z.array(PromptArgumentSchema).optional(),
})

/**
 * Zod schema for prompt message
 */
export const PromptMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
})

/**
 * Zod schema for prompt result
 */
export const PromptResultSchema = z.object({
  description: z.string().optional(),
  messages: z.array(PromptMessageSchema),
})

export type PromptArgumentInput = z.infer<typeof PromptArgumentSchema>
export type PromptInput = z.infer<typeof PromptSchema>
export type PromptMessageInput = z.infer<typeof PromptMessageSchema>
export type PromptResultInput = z.infer<typeof PromptResultSchema>
