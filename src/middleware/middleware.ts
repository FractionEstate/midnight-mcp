/**
 * Middleware System
 *
 * Composable middleware for tool execution.
 * Based on GitHub MCP server patterns.
 */

import type { ToolContext, Logger } from "../types/mcp.js"
import type { ToolResult } from "../errors/errors.js"
import { createErrorResult } from "../errors/errors.js"

// =============================================================================
// MIDDLEWARE TYPES
// =============================================================================

export type MiddlewareFn = (
  ctx: ToolContext,
  args: Record<string, unknown>,
  next: () => Promise<ToolResult>
) => Promise<ToolResult>

export type ToolHandler = (
  ctx: ToolContext,
  args: Record<string, unknown>
) => Promise<ToolResult>

// =============================================================================
// LOGGING MIDDLEWARE
// =============================================================================

export function loggingMiddleware(): MiddlewareFn {
  return async (ctx, args, next) => {
    const start = Date.now()
    ctx.logger.info("Tool invocation started", {
      tool: ctx.toolName,
      invocationId: ctx.invocationId,
    })

    try {
      const result = await next()
      const duration = Date.now() - start

      ctx.logger.info("Tool invocation completed", {
        tool: ctx.toolName,
        invocationId: ctx.invocationId,
        duration,
        isError: result.isError ?? false,
      })

      return result
    } catch (error) {
      const duration = Date.now() - start

      ctx.logger.error("Tool invocation failed", {
        tool: ctx.toolName,
        invocationId: ctx.invocationId,
        duration,
        error: error instanceof Error ? error.message : String(error),
      })

      throw error
    }
  }
}

// =============================================================================
// TELEMETRY MIDDLEWARE
// =============================================================================

export interface TelemetryTracker {
  trackInvocation(toolName: string, duration?: number, success?: boolean): void
  trackError(toolName: string, error: Error): void
}

export function telemetryMiddleware(tracker: TelemetryTracker): MiddlewareFn {
  return async (ctx, args, next) => {
    const start = Date.now()

    try {
      const result = await next()
      const duration = Date.now() - start

      tracker.trackInvocation(ctx.toolName, duration, !result.isError)

      return result
    } catch (error) {
      const duration = Date.now() - start

      tracker.trackInvocation(ctx.toolName, duration, false)
      if (error instanceof Error) {
        tracker.trackError(ctx.toolName, error)
      }

      throw error
    }
  }
}

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

import { z } from "zod"

export function validationMiddleware(
  schema: Record<string, z.ZodTypeAny>
): MiddlewareFn {
  return async (ctx, args, next) => {
    // Build combined schema
    const combinedSchema = z.object(schema)

    // Validate args
    const result = combinedSchema.safeParse(args)

    if (!result.success) {
      ctx.logger.warn("Validation failed", {
        tool: ctx.toolName,
        errors: result.error.errors,
      })

      return {
        content: formatValidationErrors(result.error.errors),
        isError: true,
        metadata: {
          validationErrors: result.error.errors,
        },
      }
    }

    // Continue with validated args
    return next()
  }
}

function formatValidationErrors(errors: z.ZodIssue[]): string {
  const lines = ["❌ **Validation Error**", ""]

  for (const error of errors) {
    const path = error.path.join(".")
    lines.push(`- **${path || "input"}**: ${error.message}`)
  }

  return lines.join("\n")
}

// =============================================================================
// TIMEOUT MIDDLEWARE
// =============================================================================

export function timeoutMiddleware(timeoutMs: number): MiddlewareFn {
  return async (ctx, args, next) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    // Add signal to context
    ctx.signal = controller.signal

    try {
      const result = await Promise.race([
        next(),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new Error(`Tool execution timed out after ${timeoutMs}ms`))
          })
        }),
      ])

      return result
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

// =============================================================================
// RETRY MIDDLEWARE
// =============================================================================

export interface RetryOptions {
  maxRetries: number
  retryDelay: number
  retryOn?: (error: Error) => boolean
}

export function retryMiddleware(options: RetryOptions): MiddlewareFn {
  return async (ctx, args, next) => {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        return await next()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Check if we should retry
        if (options.retryOn && !options.retryOn(lastError)) {
          throw lastError
        }

        // Don't retry on last attempt
        if (attempt === options.maxRetries) {
          throw lastError
        }

        ctx.logger.warn("Retrying tool execution", {
          tool: ctx.toolName,
          attempt: attempt + 1,
          maxRetries: options.maxRetries,
          error: lastError.message,
        })

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, options.retryDelay))
      }
    }

    throw lastError
  }
}

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

export function errorHandlingMiddleware(): MiddlewareFn {
  return async (ctx, args, next) => {
    try {
      return await next()
    } catch (error) {
      ctx.logger.error("Tool execution error", {
        tool: ctx.toolName,
        error: error instanceof Error ? error.message : String(error),
      })

      return createErrorResult(error)
    }
  }
}

// =============================================================================
// RATE LIMITING MIDDLEWARE
// =============================================================================

export interface RateLimiter {
  tryAcquire(key: string): boolean
  reset(key: string): void
}

export function rateLimitingMiddleware(limiter: RateLimiter): MiddlewareFn {
  return async (ctx, args, next) => {
    const key = ctx.toolName

    if (!limiter.tryAcquire(key)) {
      ctx.logger.warn("Rate limit exceeded", { tool: ctx.toolName })

      return {
        content: "❌ Rate limit exceeded. Please try again later.",
        isError: true,
        metadata: {
          rateLimited: true,
        },
      }
    }

    return next()
  }
}

// Simple in-memory rate limiter
export function createSimpleRateLimiter(
  maxRequests: number,
  windowMs: number
): RateLimiter {
  const requests = new Map<string, { count: number; resetAt: number }>()

  return {
    tryAcquire(key: string): boolean {
      const now = Date.now()
      const entry = requests.get(key)

      if (!entry || now >= entry.resetAt) {
        requests.set(key, { count: 1, resetAt: now + windowMs })
        return true
      }

      if (entry.count >= maxRequests) {
        return false
      }

      entry.count++
      return true
    },

    reset(key: string): void {
      requests.delete(key)
    },
  }
}

// =============================================================================
// MIDDLEWARE COMPOSITION
// =============================================================================

/**
 * Compose multiple middlewares into a single handler
 */
export function composeMiddleware(
  middlewares: MiddlewareFn[],
  handler: ToolHandler
): ToolHandler {
  return (ctx, args) => {
    let index = 0

    const dispatch = (): Promise<ToolResult> => {
      if (index >= middlewares.length) {
        return handler(ctx, args)
      }

      const middleware = middlewares[index++]
      return middleware(ctx, args, dispatch)
    }

    return dispatch()
  }
}

/**
 * Create a middleware stack builder
 */
export class MiddlewareStack {
  private middlewares: MiddlewareFn[] = []

  use(middleware: MiddlewareFn): this {
    this.middlewares.push(middleware)
    return this
  }

  useLogging(): this {
    return this.use(loggingMiddleware())
  }

  useTelemetry(tracker: TelemetryTracker): this {
    return this.use(telemetryMiddleware(tracker))
  }

  useValidation(schema: Record<string, z.ZodTypeAny>): this {
    return this.use(validationMiddleware(schema))
  }

  useTimeout(timeoutMs: number): this {
    return this.use(timeoutMiddleware(timeoutMs))
  }

  useRetry(options: RetryOptions): this {
    return this.use(retryMiddleware(options))
  }

  useErrorHandling(): this {
    return this.use(errorHandlingMiddleware())
  }

  useRateLimiting(limiter: RateLimiter): this {
    return this.use(rateLimitingMiddleware(limiter))
  }

  wrap(handler: ToolHandler): ToolHandler {
    return composeMiddleware(this.middlewares, handler)
  }
}

/**
 * Create a default middleware stack
 */
export function createDefaultMiddlewareStack(): MiddlewareStack {
  return new MiddlewareStack()
    .useErrorHandling()
    .useLogging()
}
