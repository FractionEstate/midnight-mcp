/**
 * Client for the hosted Midnight MCP API
 * Used when running in hosted mode (default)
 */

import { config, logger } from "./index.js";

const API_TIMEOUT = 10000; // 10 seconds

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Generate actionable error messages based on HTTP status codes
 * Provides users with specific guidance on how to resolve issues
 */
function getActionableErrorMessage(
  status: number,
  endpoint: string,
  serverMessage?: string
): string {
  const baseMessages: Record<number, string> = {
    400: `Bad request to ${endpoint}. Check your query parameters are valid.`,
    401: `Authentication failed. If you have an API key configured, verify it's correct.`,
    403: `Access denied to ${endpoint}. This resource may require authentication.`,
    404: `Resource not found at ${endpoint}. Use midnight-list-examples to see available resources.`,
    408: `Request timed out. The hosted service may be under heavy load - try again in a moment.`,
    429: `Rate limited. Try again in a few minutes, or set MIDNIGHT_LOCAL=true for unlimited local search (requires ChromaDB + OpenAI API key).`,
    500: `Server error. This is temporary - try again shortly or report at github.com/Olanetsoft/midnight-mcp/issues`,
    502: `Bad gateway. The hosted API may be restarting - try again in 30 seconds.`,
    503: `Service temporarily unavailable. The hosted API may be under maintenance - try again later or use MIDNIGHT_LOCAL=true for local mode.`,
    504: `Gateway timeout. The request took too long - try a simpler query or try again later.`,
  };

  const actionableMessage =
    baseMessages[status] ||
    `API error (${status}). Try again or report at github.com/Olanetsoft/midnight-mcp/issues`;

  // Include server message if available and different from our message
  if (serverMessage && !actionableMessage.includes(serverMessage)) {
    return `${actionableMessage} Server said: "${serverMessage}"`;
  }

  return actionableMessage;
}

/**
 * Parse error response from the hosted API
 */
async function parseApiError(
  response: Response,
  endpoint: string
): Promise<Error> {
  let serverMessage: string | undefined;

  try {
    const errorData = (await response.json()) as {
      error?: string;
      message?: string;
    };
    serverMessage = errorData.error || errorData.message;
  } catch {
    // JSON parsing failed, that's okay
  }

  const actionableMessage = getActionableErrorMessage(
    response.status,
    endpoint,
    serverMessage
  );

  return new Error(actionableMessage);
}

export interface HostedSearchResult {
  code?: string;
  content?: string;
  relevanceScore: number;
  source: {
    repository: string;
    filePath: string;
    lines?: string;
    section?: string;
  };
  codeType?: string;
  name?: string;
  isExported?: boolean;
}

export interface HostedSearchResponse {
  results: HostedSearchResult[];
  totalResults: number;
  query: string;
  category?: string;
  warnings?: string[];
  lastIndexed?: string | null;
}

export interface HostedSearchFilter {
  language?: string;
  repository?: string;
}

/**
 * Make a request to the hosted API
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${config.hostedApiUrl}${endpoint}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "midnight-mcp",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw await parseApiError(response, endpoint);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Request to ${endpoint} timed out after ${API_TIMEOUT / 1000}s. ` +
          `The hosted service may be unavailable. ` +
          `Try again or set MIDNIGHT_LOCAL=true for local search.`
      );
    }
    // Re-throw if already processed (our actionable errors)
    if (
      error instanceof Error &&
      error.message.includes("github.com/Olanetsoft")
    ) {
      throw error;
    }
    // Network errors and other fetch failures
    if (error instanceof Error) {
      throw new Error(
        `Failed to connect to hosted API: ${error.message}. ` +
          `Check your internet connection or set MIDNIGHT_LOCAL=true for local search.`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Search Compact code via hosted API
 */
export async function searchCompactHosted(
  query: string,
  limit: number = 10
): Promise<HostedSearchResponse> {
  logger.debug("Searching Compact code via hosted API", { query });

  return apiRequest<HostedSearchResponse>("/v1/search/compact", {
    method: "POST",
    body: JSON.stringify({ query, limit }),
  });
}

/**
 * Search TypeScript code via hosted API
 */
export async function searchTypeScriptHosted(
  query: string,
  limit: number = 10,
  includeTypes: boolean = true
): Promise<HostedSearchResponse> {
  logger.debug("Searching TypeScript code via hosted API", { query });

  return apiRequest<HostedSearchResponse>("/v1/search/typescript", {
    method: "POST",
    body: JSON.stringify({ query, limit, includeTypes }),
  });
}

/**
 * Search documentation via hosted API
 */
export async function searchDocsHosted(
  query: string,
  limit: number = 10,
  category: string = "all"
): Promise<HostedSearchResponse> {
  logger.debug("Searching documentation via hosted API", { query });

  return apiRequest<HostedSearchResponse>("/v1/search/docs", {
    method: "POST",
    body: JSON.stringify({ query, limit, category }),
  });
}

/**
 * Generic search via hosted API
 */
export async function searchHosted(
  query: string,
  limit: number = 10,
  filter?: HostedSearchFilter
): Promise<HostedSearchResponse> {
  logger.debug("Searching via hosted API", { query, filter });

  return apiRequest<HostedSearchResponse>("/v1/search", {
    method: "POST",
    body: JSON.stringify({ query, limit, filter }),
  });
}

/**
 * Check if the hosted API is available
 */
export async function checkHostedApiHealth(): Promise<{
  available: boolean;
  documentsIndexed?: number;
  error?: string;
}> {
  try {
    const response = await apiRequest<{
      status: string;
      vectorStore?: { documentsIndexed: number };
    }>("/health");

    return {
      available: response.status === "healthy",
      documentsIndexed: response.vectorStore?.documentsIndexed,
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get hosted API stats
 */
export async function getHostedApiStats(): Promise<{
  documentsIndexed: number;
  repositories: number;
}> {
  return apiRequest<{ documentsIndexed: number; repositories: number }>(
    "/v1/stats"
  );
}

/**
 * Track a tool call to the hosted API
 * Fire-and-forget - doesn't block on response
 */
export function trackToolCall(
  tool: string,
  success: boolean,
  durationMs?: number,
  version?: string
): void {
  // Fire and forget - don't await, don't block
  apiRequest("/v1/track/tool", {
    method: "POST",
    body: JSON.stringify({ tool, success, durationMs, version }),
  }).catch(() => {
    // Silently ignore tracking errors
  });
}
