/**
 * Result Utilities
 *
 * Utilities for creating MCP tool call results.
 * Based on GitHub MCP server pkg/utils/result.go patterns.
 */

// =============================================================================
// RESULT TYPES
// =============================================================================

/**
 * Content item in a tool result
 */
export interface TextContent {
  type: "text"
  text: string
}

export interface ImageContent {
  type: "image"
  data: string
  mimeType: string
}

export interface EmbeddedResourceContent {
  type: "resource"
  resource: ResourceContents
}

export interface ResourceContents {
  uri: string
  mimeType?: string
  text?: string
  blob?: string
}

export type Content = TextContent | ImageContent | EmbeddedResourceContent

/**
 * Tool call result
 */
export interface CallToolResult {
  content: Content[]
  isError?: boolean
}

// =============================================================================
// RESULT CREATORS
// =============================================================================

/**
 * Create a text result
 */
export function newToolResultText(message: string): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: message,
      },
    ],
  }
}

/**
 * Create an error result
 */
export function newToolResultError(message: string): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: message,
      },
    ],
    isError: true,
  }
}

/**
 * Create an error result from an Error object
 */
export function newToolResultErrorFromErr(
  message: string,
  err: Error
): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: `${message}: ${err.message}`,
      },
    ],
    isError: true,
  }
}

/**
 * Create a result with an embedded resource
 */
export function newToolResultResource(
  message: string,
  contents: ResourceContents
): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: message,
      },
      {
        type: "resource",
        resource: contents,
      },
    ],
    isError: false,
  }
}

/**
 * Create a result with JSON data (marshalled to text)
 */
export function marshalledTextResult(data: unknown): CallToolResult {
  try {
    const text = JSON.stringify(data, null, 2)
    return newToolResultText(text)
  } catch (err) {
    return newToolResultErrorFromErr(
      "Failed to marshal result to JSON",
      err as Error
    )
  }
}

/**
 * Create a result with image data
 */
export function newToolResultImage(
  data: string,
  mimeType: string
): CallToolResult {
  return {
    content: [
      {
        type: "image",
        data,
        mimeType,
      },
    ],
  }
}

/**
 * Create a result with multiple content items
 */
export function newToolResultMultiple(contents: Content[]): CallToolResult {
  return {
    content: contents,
  }
}

/**
 * Create a text content item
 */
export function textContent(text: string): TextContent {
  return {
    type: "text",
    text,
  }
}

/**
 * Create an image content item
 */
export function imageContent(data: string, mimeType: string): ImageContent {
  return {
    type: "image",
    data,
    mimeType,
  }
}

/**
 * Create a resource content item
 */
export function resourceContent(resource: ResourceContents): EmbeddedResourceContent {
  return {
    type: "resource",
    resource,
  }
}

// =============================================================================
// RESULT HELPERS
// =============================================================================

/**
 * Check if a result is an error
 */
export function isErrorResult(result: CallToolResult): boolean {
  return result.isError === true
}

/**
 * Extract text from a result (first text content)
 */
export function extractText(result: CallToolResult): string | undefined {
  const textItem = result.content.find((c) => c.type === "text") as
    | TextContent
    | undefined
  return textItem?.text
}

/**
 * Extract all text from a result
 */
export function extractAllText(result: CallToolResult): string[] {
  return result.content
    .filter((c): c is TextContent => c.type === "text")
    .map((c) => c.text)
}

/**
 * Combine multiple results into one
 */
export function combineResults(...results: CallToolResult[]): CallToolResult {
  const hasError = results.some((r) => r.isError)
  const allContent = results.flatMap((r) => r.content)
  return {
    content: allContent,
    isError: hasError,
  }
}
