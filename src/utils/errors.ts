/**
 * User-friendly error messages and error handling utilities
 */

export class MCPError extends Error {
  public readonly code: string;
  public readonly suggestion?: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    suggestion?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "MCPError";
    this.code = code;
    this.suggestion = suggestion;
    this.details = details;
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      suggestion: this.suggestion,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  RATE_LIMIT: "RATE_LIMIT_EXCEEDED",
  NOT_FOUND: "RESOURCE_NOT_FOUND",
  NETWORK: "NETWORK_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  UNKNOWN_REPO: "UNKNOWN_REPOSITORY",
  PARSE_ERROR: "PARSE_ERROR",
  CHROMADB_UNAVAILABLE: "CHROMADB_UNAVAILABLE",
  OPENAI_UNAVAILABLE: "OPENAI_UNAVAILABLE",
} as const;

/**
 * Create user-friendly error from various error types
 */
export function createUserError(error: unknown, context?: string): MCPError {
  const message = error instanceof Error ? error.message : String(error);
  const ctx = context ? ` while ${context}` : "";

  // Rate limit errors
  if (
    message.includes("rate limit") ||
    message.includes("403") ||
    message.includes("API rate limit")
  ) {
    return new MCPError(
      `GitHub API rate limit exceeded${ctx}`,
      ErrorCodes.RATE_LIMIT,
      "Add GITHUB_TOKEN to your config to increase limits from 60 to 5000 requests/hour. " +
        "Get a token at https://github.com/settings/tokens"
    );
  }

  // Not found errors
  if (message.includes("404") || message.includes("Not Found")) {
    return new MCPError(
      `Resource not found${ctx}`,
      ErrorCodes.NOT_FOUND,
      "Check that the repository, file, or version exists and is publicly accessible."
    );
  }

  // Network errors
  if (
    message.includes("network") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT") ||
    message.includes("timeout")
  ) {
    return new MCPError(
      `Network error${ctx}`,
      ErrorCodes.NETWORK,
      "Check your internet connection and try again. If the problem persists, " +
        "the service may be temporarily unavailable."
    );
  }

  // ChromaDB errors
  if (message.includes("chroma") || message.includes("8000")) {
    return new MCPError(
      `ChromaDB is not available${ctx}`,
      ErrorCodes.CHROMADB_UNAVAILABLE,
      "ChromaDB is optional. Without it, search uses keyword matching instead of semantic search. " +
        "To enable semantic search, run: docker run -d -p 8000:8000 chromadb/chroma"
    );
  }

  // OpenAI errors
  if (message.includes("openai") || message.includes("embedding")) {
    return new MCPError(
      `OpenAI API error${ctx}`,
      ErrorCodes.OPENAI_UNAVAILABLE,
      "OpenAI is optional. Without it, search uses keyword matching. " +
        "To enable semantic search, add OPENAI_API_KEY to your config."
    );
  }

  // Default error - don't leak internal details
  return new MCPError(
    `An error occurred${ctx}`,
    "UNKNOWN_ERROR",
    "If this problem persists, please report it at https://github.com/Olanetsoft/midnight-mcp/issues"
  );
}

/**
 * Format error for MCP response
 */
export function formatErrorResponse(
  error: unknown,
  context?: string
): {
  error: string;
  code: string;
  suggestion?: string;
} {
  const mcpError =
    error instanceof MCPError ? error : createUserError(error, context);
  return mcpError.toJSON();
}

/**
 * Wrap a function with error handling
 */
export function withErrorHandling<
  T extends (...args: unknown[]) => Promise<unknown>,
>(fn: T, context: string): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw createUserError(error, context);
    }
  }) as T;
}
