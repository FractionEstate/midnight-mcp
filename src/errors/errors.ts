/**
 * Error Handling
 *
 * Typed error hierarchy with context for Midnight MCP server.
 * Based on GitHub MCP server patterns.
 */

// =============================================================================
// BASE ERROR
// =============================================================================

export class MidnightError extends Error {
  public readonly code: string

  constructor(
    code: string,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.code = code
    this.name = "MidnightError"
    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      cause: this.cause instanceof Error ? this.cause.message : this.cause,
    }
  }
}

// =============================================================================
// NETWORK ERRORS
// =============================================================================

export class NetworkError extends MidnightError {
  constructor(
    code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly endpoint?: string,
    cause?: unknown
  ) {
    super(code, message, cause)
    this.name = "NetworkError"
  }
}

export class IndexerError extends NetworkError {
  constructor(
    message: string,
    statusCode?: number,
    endpoint?: string,
    cause?: unknown
  ) {
    super("INDEXER_ERROR", message, statusCode, endpoint, cause)
    this.name = "IndexerError"
  }
}

export class NodeError extends NetworkError {
  constructor(
    message: string,
    statusCode?: number,
    endpoint?: string,
    cause?: unknown
  ) {
    super("NODE_ERROR", message, statusCode, endpoint, cause)
    this.name = "NodeError"
  }
}

export class ProofServerError extends NetworkError {
  constructor(
    message: string,
    statusCode?: number,
    endpoint?: string,
    cause?: unknown
  ) {
    super("PROOF_SERVER_ERROR", message, statusCode, endpoint, cause)
    this.name = "ProofServerError"
  }
}

// =============================================================================
// CONTRACT ERRORS
// =============================================================================

export class ContractError extends MidnightError {
  constructor(
    code: string,
    message: string,
    public readonly contractName?: string,
    cause?: unknown
  ) {
    super(code, message, cause)
    this.name = "ContractError"
  }
}

export class CompilationError extends ContractError {
  constructor(
    message: string,
    public readonly errors: CompilationDiagnostic[],
    contractName?: string,
    cause?: unknown
  ) {
    super("COMPILATION_ERROR", message, contractName, cause)
    this.name = "CompilationError"
  }
}

export interface CompilationDiagnostic {
  severity: "error" | "warning" | "info"
  message: string
  line?: number
  column?: number
  file?: string
}

export class DeploymentError extends ContractError {
  constructor(
    message: string,
    public readonly transactionId?: string,
    contractName?: string,
    cause?: unknown
  ) {
    super("DEPLOYMENT_ERROR", message, contractName, cause)
    this.name = "DeploymentError"
  }
}

// =============================================================================
// VALIDATION ERRORS
// =============================================================================

export class ValidationError extends MidnightError {
  constructor(
    code: string,
    message: string,
    public readonly field?: string,
    public readonly value?: unknown,
    cause?: unknown
  ) {
    super(code, message, cause)
    this.name = "ValidationError"
  }
}

export class SchemaValidationError extends ValidationError {
  constructor(
    message: string,
    public readonly validationErrors: ZodIssue[],
    cause?: unknown
  ) {
    super("SCHEMA_VALIDATION_ERROR", message, undefined, undefined, cause)
    this.name = "SchemaValidationError"
  }
}

// Simple ZodIssue type (avoiding zod import in this file)
export interface ZodIssue {
  path: (string | number)[]
  message: string
  code: string
}

// =============================================================================
// CONFIGURATION ERRORS
// =============================================================================

export class ConfigurationError extends MidnightError {
  constructor(
    message: string,
    public readonly configKey?: string,
    cause?: unknown
  ) {
    super("CONFIGURATION_ERROR", message, cause)
    this.name = "ConfigurationError"
  }
}

// =============================================================================
// AUTHENTICATION ERRORS
// =============================================================================

export class AuthenticationError extends MidnightError {
  constructor(
    message: string,
    public readonly requiredScopes?: string[],
    cause?: unknown
  ) {
    super("AUTHENTICATION_ERROR", message, cause)
    this.name = "AuthenticationError"
  }
}

// =============================================================================
// TOOL RESULT HELPERS
// =============================================================================

export interface ToolResult {
  content: string
  isError?: boolean
  metadata?: Record<string, unknown>
}

/**
 * Create a successful tool result
 */
export function createSuccessResult(
  content: string,
  metadata?: Record<string, unknown>
): ToolResult {
  return {
    content,
    isError: false,
    metadata,
  }
}

/**
 * Create an error tool result from any error type
 */
export function createErrorResult(error: unknown): ToolResult {
  if (error instanceof MidnightError) {
    return {
      content: formatMidnightError(error),
      isError: true,
      metadata: {
        code: error.code,
        name: error.name,
      },
    }
  }

  if (error instanceof Error) {
    return {
      content: `Error: ${error.message}`,
      isError: true,
      metadata: {
        name: error.name,
      },
    }
  }

  return {
    content: `Error: ${String(error)}`,
    isError: true,
  }
}

/**
 * Format a MidnightError for display
 */
export function formatMidnightError(error: MidnightError): string {
  const parts: string[] = []

  // Header with error type
  parts.push(`❌ **${error.name}** (${error.code})`)
  parts.push("")
  parts.push(error.message)

  // Add specific details based on error type
  if (error instanceof NetworkError && error.statusCode) {
    parts.push("")
    parts.push(`**Status Code:** ${error.statusCode}`)
    if (error.endpoint) {
      parts.push(`**Endpoint:** ${error.endpoint}`)
    }
  }

  if (error instanceof CompilationError && error.errors.length > 0) {
    parts.push("")
    parts.push("**Diagnostics:**")
    for (const diag of error.errors) {
      const location = diag.line ? ` (line ${diag.line}${diag.column ? `:${diag.column}` : ""})` : ""
      parts.push(`- ${diag.severity.toUpperCase()}${location}: ${diag.message}`)
    }
  }

  if (error instanceof ValidationError && error.field) {
    parts.push("")
    parts.push(`**Field:** ${error.field}`)
    if (error.value !== undefined) {
      parts.push(`**Value:** ${JSON.stringify(error.value)}`)
    }
  }

  // Include cause if present
  if (error.cause) {
    parts.push("")
    parts.push("**Cause:**")
    if (error.cause instanceof Error) {
      parts.push(error.cause.message)
    } else {
      parts.push(String(error.cause))
    }
  }

  return parts.join("\n")
}

// =============================================================================
// ERROR TYPE GUARDS
// =============================================================================

export function isMidnightError(error: unknown): error is MidnightError {
  return error instanceof MidnightError
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError
}

export function isContractError(error: unknown): error is ContractError {
  return error instanceof ContractError
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

// =============================================================================
// ERROR WRAPPING HELPERS
// =============================================================================

/**
 * Wrap an error with additional context
 */
export function wrapError(
  error: unknown,
  message: string,
  code = "WRAPPED_ERROR"
): MidnightError {
  if (error instanceof MidnightError) {
    return new MidnightError(code, `${message}: ${error.message}`, error)
  }
  if (error instanceof Error) {
    return new MidnightError(code, `${message}: ${error.message}`, error)
  }
  return new MidnightError(code, `${message}: ${String(error)}`, error)
}

/**
 * Try-catch wrapper that converts errors to MidnightError
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorMessage: string,
  errorCode = "OPERATION_FAILED"
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    throw wrapError(error, errorMessage, errorCode)
  }
}

// =============================================================================
// COMPATIBILITY ALIASES
// =============================================================================

/**
 * Alias for MidnightError for MCP compatibility
 */
export const MCPError = MidnightError

/**
 * Tool not found error
 */
export class ToolNotFoundError extends MidnightError {
  constructor(
    public readonly toolName: string,
    message?: string
  ) {
    super(
      "TOOL_NOT_FOUND",
      message || `Tool not found: ${toolName}`
    )
    this.name = "ToolNotFoundError"
  }
}

/**
 * Resource not found error
 */
export class ResourceNotFoundError extends MidnightError {
  constructor(
    public readonly resourceUri: string,
    message?: string
  ) {
    super(
      "RESOURCE_NOT_FOUND",
      message || `Resource not found: ${resourceUri}`
    )
    this.name = "ResourceNotFoundError"
  }
}

/**
 * Prompt not found error
 */
export class PromptNotFoundError extends MidnightError {
  constructor(
    public readonly promptName: string,
    message?: string
  ) {
    super(
      "PROMPT_NOT_FOUND",
      message || `Prompt not found: ${promptName}`
    )
    this.name = "PromptNotFoundError"
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends MidnightError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
    cause?: unknown
  ) {
    super("RATE_LIMITED", message, cause)
    this.name = "RateLimitError"
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends MidnightError {
  constructor(
    message: string,
    public readonly timeoutMs?: number,
    cause?: unknown
  ) {
    super("TIMEOUT", message, cause)
    this.name = "TimeoutError"
  }
}
