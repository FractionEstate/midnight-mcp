/**
 * Completions Handler System
 *
 * Handles auto-completion requests for tools, resources, and prompts.
 * Based on GitHub MCP server completions patterns.
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Completion request reference
 */
export interface CompletionRef {
  /** Reference type: ref/resource, ref/prompt, ref/argument */
  type: "ref/resource" | "ref/prompt" | "ref/argument"
  /** URI for resource refs */
  uri?: string
  /** Name for prompt refs */
  name?: string
}

/**
 * Completion request parameters
 */
export interface CompletionParams {
  ref: CompletionRef
  /** The partial argument value for which completions are requested */
  argument?: {
    name: string
    value: string
  }
}

/**
 * Completion request
 */
export interface CompleteRequest {
  method: "completion/complete"
  params: CompletionParams
}

/**
 * Completion value
 */
export interface CompletionValue {
  /** The completion text */
  value: string
  /** Optional description */
  description?: string
}

/**
 * Completion result
 */
export interface CompleteResult {
  completion: {
    values: CompletionValue[]
    total?: number
    hasMore?: boolean
  }
}

/**
 * Completion handler function
 */
export type CompletionHandler = (
  req: CompleteRequest
) => Promise<CompleteResult | null>

// =============================================================================
// COMPLETION HANDLER FACTORY
// =============================================================================

/**
 * Resource completion handler
 */
export type ResourceCompletionHandler = (
  uri: string,
  argument?: { name: string; value: string }
) => Promise<CompletionValue[]>

/**
 * Prompt completion handler
 */
export type PromptCompletionHandler = (
  name: string,
  argument?: { name: string; value: string }
) => Promise<CompletionValue[]>

/**
 * Completion handler registry
 */
export interface CompletionHandlers {
  /** Resource completion handlers by URI prefix */
  resources: Map<string, ResourceCompletionHandler>
  /** Prompt completion handlers by name */
  prompts: Map<string, PromptCompletionHandler>
}

/**
 * Create a completions handler from registered handlers
 */
export function createCompletionsHandler(
  handlers: CompletionHandlers
): CompletionHandler {
  return async (req: CompleteRequest): Promise<CompleteResult | null> => {
    switch (req.params.ref.type) {
      case "ref/resource": {
        const uri = req.params.ref.uri
        if (!uri) return null

        // Find matching resource handler by URI prefix
        for (const [prefix, handler] of handlers.resources) {
          if (uri.startsWith(prefix)) {
            const values = await handler(uri, req.params.argument)
            return {
              completion: {
                values,
                total: values.length,
                hasMore: false,
              },
            }
          }
        }
        return null
      }

      case "ref/prompt": {
        const name = req.params.ref.name
        if (!name) return null

        const handler = handlers.prompts.get(name)
        if (!handler) return null

        const values = await handler(name, req.params.argument)
        return {
          completion: {
            values,
            total: values.length,
            hasMore: false,
          },
        }
      }

      case "ref/argument":
        // Not supported yet
        return null

      default:
        return null
    }
  }
}

// =============================================================================
// COMPLETION REGISTRY
// =============================================================================

/**
 * Registry for managing completion handlers
 */
export class CompletionRegistry {
  private resourceHandlers = new Map<string, ResourceCompletionHandler>()
  private promptHandlers = new Map<string, PromptCompletionHandler>()

  /**
   * Register a resource completion handler
   * @param uriPrefix - URI prefix to match (e.g., "repo://", "file://")
   * @param handler - Handler function
   */
  registerResourceHandler(
    uriPrefix: string,
    handler: ResourceCompletionHandler
  ): this {
    this.resourceHandlers.set(uriPrefix, handler)
    return this
  }

  /**
   * Register a prompt completion handler
   * @param name - Prompt name to match
   * @param handler - Handler function
   */
  registerPromptHandler(name: string, handler: PromptCompletionHandler): this {
    this.promptHandlers.set(name, handler)
    return this
  }

  /**
   * Get the completion handler for this registry
   */
  getHandler(): CompletionHandler {
    return createCompletionsHandler({
      resources: this.resourceHandlers,
      prompts: this.promptHandlers,
    })
  }

  /**
   * Handle a completion request directly
   */
  async handle(req: CompleteRequest): Promise<CompleteResult | null> {
    const handler = this.getHandler()
    return handler(req)
  }
}

/**
 * Create a new completion registry
 */
export function createCompletionRegistry(): CompletionRegistry {
  return new CompletionRegistry()
}

// =============================================================================
// COMMON COMPLETION HELPERS
// =============================================================================

/**
 * Filter completion values by prefix
 */
export function filterCompletions(
  values: CompletionValue[],
  prefix: string
): CompletionValue[] {
  if (!prefix) return values
  const lowerPrefix = prefix.toLowerCase()
  return values.filter((v) => v.value.toLowerCase().startsWith(lowerPrefix))
}

/**
 * Create a simple completion value
 */
export function completionValue(
  value: string,
  description?: string
): CompletionValue {
  return { value, description }
}

/**
 * Create completion values from strings
 */
export function completionValues(values: string[]): CompletionValue[] {
  return values.map((v) => ({ value: v }))
}

/**
 * Create completion values from an object (keys become values)
 */
export function completionValuesFromObject(
  obj: Record<string, string>
): CompletionValue[] {
  return Object.entries(obj).map(([value, description]) => ({
    value,
    description,
  }))
}

/**
 * Limit completion results
 */
export function limitCompletions(
  values: CompletionValue[],
  limit: number
): { values: CompletionValue[]; hasMore: boolean } {
  if (values.length <= limit) {
    return { values, hasMore: false }
  }
  return {
    values: values.slice(0, limit),
    hasMore: true,
  }
}
