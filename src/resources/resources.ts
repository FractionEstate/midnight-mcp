/**
 * Enhanced Resource System
 *
 * Resource templates with toolset metadata and feature flag support.
 * Based on GitHub MCP server inventory/resources.go patterns.
 */

import { z } from "zod"
import type { ToolsetID, ToolsetMetadata } from "../toolsets/toolsets.js"

// =============================================================================
// RESOURCE HANDLER TYPES
// =============================================================================

/**
 * Dependencies passed to resource handlers
 */
export interface ResourceDependencies {
  /** Current context */
  context?: Record<string, unknown>
  /** Feature flag checker */
  featureFlagChecker?: FeatureFlagChecker
  /** Any additional dependencies */
  [key: string]: unknown
}

/**
 * Feature flag checker function type
 */
export type FeatureFlagChecker = (flagName: string) => boolean | Promise<boolean>

/**
 * Resource content returned by handlers
 */
export interface ResourceContent {
  /** Content URI */
  uri: string
  /** MIME type */
  mimeType?: string
  /** Content text */
  text?: string
  /** Binary content (base64) */
  blob?: string
}

/**
 * Resource handler function
 */
export type ResourceHandler = (
  uri: string,
  deps?: ResourceDependencies
) => Promise<ResourceContent[]>

/**
 * Resource handler factory - creates handler with dependencies
 */
export type ResourceHandlerFactory = (deps?: ResourceDependencies) => ResourceHandler

// =============================================================================
// RESOURCE TEMPLATE
// =============================================================================

/**
 * Resource template definition
 */
export interface ResourceTemplate {
  /** Unique name for this resource */
  name: string
  /** URI template (RFC 6570 style) */
  uriTemplate: string
  /** Human-readable description */
  description?: string
  /** MIME type hint */
  mimeType?: string
}

/**
 * Server resource template with metadata
 */
export interface ServerResourceTemplate {
  /** Template definition */
  template: ResourceTemplate
  /** Handler factory function */
  handlerFactory?: ResourceHandlerFactory
  /** Toolset this resource belongs to */
  toolset: ToolsetMetadata
  /** Feature flag that must be enabled for this resource */
  featureFlagEnable?: string
  /** Feature flag that disables this resource when enabled */
  featureFlagDisable?: string
}

// =============================================================================
// RESOURCE TEMPLATE BUILDER
// =============================================================================

/**
 * Builder for creating server resource templates
 */
export class ResourceTemplateBuilder {
  private template: Partial<ServerResourceTemplate> = {}

  /**
   * Set the resource name
   */
  name(name: string): this {
    if (!this.template.template) {
      this.template.template = { name, uriTemplate: "" }
    } else {
      this.template.template.name = name
    }
    return this
  }

  /**
   * Set the URI template
   */
  uri(uriTemplate: string): this {
    if (!this.template.template) {
      this.template.template = { name: "", uriTemplate }
    } else {
      this.template.template.uriTemplate = uriTemplate
    }
    return this
  }

  /**
   * Set the description
   */
  description(description: string): this {
    if (!this.template.template) {
      this.template.template = { name: "", uriTemplate: "", description }
    } else {
      this.template.template.description = description
    }
    return this
  }

  /**
   * Set the MIME type
   */
  mimeType(mimeType: string): this {
    if (!this.template.template) {
      this.template.template = { name: "", uriTemplate: "", mimeType }
    } else {
      this.template.template.mimeType = mimeType
    }
    return this
  }

  /**
   * Set the toolset
   */
  toolset(toolset: ToolsetMetadata): this {
    this.template.toolset = toolset
    return this
  }

  /**
   * Set the handler factory
   */
  handler(handlerFactory: ResourceHandlerFactory): this {
    this.template.handlerFactory = handlerFactory
    return this
  }

  /**
   * Set feature flag that enables this resource
   */
  enabledByFlag(flagName: string): this {
    this.template.featureFlagEnable = flagName
    return this
  }

  /**
   * Set feature flag that disables this resource
   */
  disabledByFlag(flagName: string): this {
    this.template.featureFlagDisable = flagName
    return this
  }

  /**
   * Build the resource template
   */
  build(): ServerResourceTemplate {
    if (!this.template.template?.name) {
      throw new Error("Resource name is required")
    }
    if (!this.template.template?.uriTemplate) {
      throw new Error("Resource URI template is required")
    }
    if (!this.template.toolset) {
      throw new Error("Resource toolset is required")
    }

    return this.template as ServerResourceTemplate
  }
}

/**
 * Create a new resource template builder
 */
export function resourceTemplate(): ResourceTemplateBuilder {
  return new ResourceTemplateBuilder()
}

/**
 * Create a server resource template directly
 */
export function newServerResourceTemplate(
  toolset: ToolsetMetadata,
  template: ResourceTemplate,
  handlerFactory?: ResourceHandlerFactory
): ServerResourceTemplate {
  return {
    template,
    handlerFactory,
    toolset,
  }
}

// =============================================================================
// RESOURCE REGISTRY
// =============================================================================

/**
 * Registry for managing resource templates
 */
export class ResourceRegistry {
  private resources: ServerResourceTemplate[] = []
  private featureChecker?: FeatureFlagChecker
  private enabledToolsets: Set<ToolsetID> | null = null // null = all enabled

  /**
   * Register a resource template
   */
  register(resource: ServerResourceTemplate): this {
    this.resources.push(resource)
    return this
  }

  /**
   * Register multiple resource templates
   */
  registerAll(resources: ServerResourceTemplate[]): this {
    this.resources.push(...resources)
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
   * Check feature flags for a resource
   */
  private async isFeatureFlagAllowed(resource: ServerResourceTemplate): Promise<boolean> {
    if (!this.featureChecker) return true

    // Check enable flag - resource requires this flag to be on
    if (resource.featureFlagEnable) {
      const enabled = await this.featureChecker(resource.featureFlagEnable)
      if (!enabled) return false
    }

    // Check disable flag - resource is excluded if this flag is on
    if (resource.featureFlagDisable) {
      const disabled = await this.featureChecker(resource.featureFlagDisable)
      if (disabled) return false
    }

    return true
  }

  /**
   * Get available resources (filtered by toolset and feature flags)
   */
  async getAvailableResources(): Promise<ServerResourceTemplate[]> {
    const result: ServerResourceTemplate[] = []

    for (const resource of this.resources) {
      // Check toolset
      if (!this.isToolsetEnabled(resource.toolset.id)) continue

      // Check feature flags
      if (!(await this.isFeatureFlagAllowed(resource))) continue

      result.push(resource)
    }

    // Sort by toolset ID, then by name
    result.sort((a, b) => {
      if (a.toolset.id !== b.toolset.id) {
        return a.toolset.id.localeCompare(b.toolset.id)
      }
      return a.template.name.localeCompare(b.template.name)
    })

    return result
  }

  /**
   * Find a resource by URI template
   */
  findByUri(uriTemplate: string): ServerResourceTemplate | undefined {
    return this.resources.find((r) => r.template.uriTemplate === uriTemplate)
  }

  /**
   * Find a resource by name
   */
  findByName(name: string): ServerResourceTemplate | undefined {
    return this.resources.find((r) => r.template.name === name)
  }

  /**
   * Get all registered resources (unfiltered)
   */
  getAllResources(): ServerResourceTemplate[] {
    return [...this.resources]
  }

  /**
   * Get resources by toolset
   */
  getResourcesByToolset(toolsetId: ToolsetID): ServerResourceTemplate[] {
    return this.resources.filter((r) => r.toolset.id === toolsetId)
  }
}

/**
 * Create a new resource registry
 */
export function createResourceRegistry(): ResourceRegistry {
  return new ResourceRegistry()
}

// =============================================================================
// RESOURCE SCHEMA
// =============================================================================

/**
 * Zod schema for resource template
 */
export const ResourceTemplateSchema = z.object({
  name: z.string(),
  uriTemplate: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
})

/**
 * Zod schema for server resource template
 */
export const ServerResourceTemplateSchema = z.object({
  template: ResourceTemplateSchema,
  toolset: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
  }),
  featureFlagEnable: z.string().optional(),
  featureFlagDisable: z.string().optional(),
})

export type ResourceTemplateInput = z.infer<typeof ResourceTemplateSchema>
export type ServerResourceTemplateInput = z.infer<typeof ServerResourceTemplateSchema>
