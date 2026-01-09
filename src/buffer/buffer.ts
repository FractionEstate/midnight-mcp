/**
 * Buffer Utilities
 *
 * Efficient buffer management for large response handling.
 * Based on GitHub MCP server buffer package patterns.
 */

// =============================================================================
// RING BUFFER
// =============================================================================

/**
 * Ring buffer for efficiently storing the last N items.
 * Overwrites oldest items when full.
 */
export class RingBuffer<T> {
  private buffer: (T | undefined)[]
  private writeIndex: number = 0
  private count: number = 0
  private readonly capacity: number

  constructor(capacity: number) {
    if (capacity < 1) {
      throw new Error("Ring buffer capacity must be at least 1")
    }
    this.capacity = capacity
    this.buffer = new Array(capacity)
  }

  /**
   * Add an item to the buffer
   */
  push(item: T): void {
    this.buffer[this.writeIndex] = item
    this.writeIndex = (this.writeIndex + 1) % this.capacity
    if (this.count < this.capacity) {
      this.count++
    }
  }

  /**
   * Get all items in order (oldest to newest)
   */
  toArray(): T[] {
    if (this.count === 0) return []

    const result: T[] = []
    const startIndex = this.count < this.capacity ? 0 : this.writeIndex

    for (let i = 0; i < this.count; i++) {
      const idx = (startIndex + i) % this.capacity
      result.push(this.buffer[idx] as T)
    }

    return result
  }

  /**
   * Get the number of items in the buffer
   */
  get size(): number {
    return this.count
  }

  /**
   * Check if buffer is empty
   */
  isEmpty(): boolean {
    return this.count === 0
  }

  /**
   * Check if buffer is full
   */
  isFull(): boolean {
    return this.count === this.capacity
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.buffer = new Array(this.capacity)
    this.writeIndex = 0
    this.count = 0
  }

  /**
   * Get the most recent item
   */
  latest(): T | undefined {
    if (this.count === 0) return undefined
    const idx = (this.writeIndex - 1 + this.capacity) % this.capacity
    return this.buffer[idx]
  }

  /**
   * Get the oldest item
   */
  oldest(): T | undefined {
    if (this.count === 0) return undefined
    if (this.count < this.capacity) return this.buffer[0]
    return this.buffer[this.writeIndex]
  }
}

// =============================================================================
// LINE BUFFER
// =============================================================================

/**
 * Line buffer that stores the last N lines of text.
 * Useful for log processing where only recent lines matter.
 */
export class LineBuffer {
  private ringBuffer: RingBuffer<string>
  private totalLinesProcessed: number = 0

  constructor(maxLines: number = 1000) {
    // Cap at reasonable maximum
    const cappedMax = Math.min(maxLines, 100000)
    this.ringBuffer = new RingBuffer<string>(cappedMax)
  }

  /**
   * Add a line to the buffer
   */
  addLine(line: string): void {
    this.ringBuffer.push(line)
    this.totalLinesProcessed++
  }

  /**
   * Add multiple lines (from a string with newlines)
   */
  addLines(text: string): void {
    const lines = text.split("\n")
    for (const line of lines) {
      this.addLine(line)
    }
  }

  /**
   * Get all buffered lines joined with newlines
   */
  getContent(): string {
    return this.ringBuffer.toArray().join("\n")
  }

  /**
   * Get buffered lines as array
   */
  getLines(): string[] {
    return this.ringBuffer.toArray()
  }

  /**
   * Get statistics
   */
  getStats(): { bufferedLines: number; totalLinesProcessed: number } {
    return {
      bufferedLines: this.ringBuffer.size,
      totalLinesProcessed: this.totalLinesProcessed,
    }
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.ringBuffer.clear()
    this.totalLinesProcessed = 0
  }
}

// =============================================================================
// STREAM PROCESSING
// =============================================================================

/**
 * Process a readable stream line by line, keeping only the last N lines.
 *
 * @param stream - Readable stream to process
 * @param maxLines - Maximum lines to keep
 * @returns The last N lines and total line count
 */
export async function processStreamAsRingBuffer(
  stream: ReadableStream<Uint8Array>,
  maxLines: number
): Promise<{ content: string; totalLines: number }> {
  const lineBuffer = new LineBuffer(maxLines)
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let partialLine = ""

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        // Process any remaining partial line
        if (partialLine) {
          lineBuffer.addLine(partialLine)
        }
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      const text = partialLine + chunk
      const lines = text.split("\n")

      // Last element might be incomplete
      partialLine = lines.pop() ?? ""

      for (const line of lines) {
        lineBuffer.addLine(line)
      }
    }
  } finally {
    reader.releaseLock()
  }

  const stats = lineBuffer.getStats()
  return {
    content: lineBuffer.getContent(),
    totalLines: stats.totalLinesProcessed,
  }
}

/**
 * Process text content keeping only the last N lines.
 *
 * @param content - Full text content
 * @param maxLines - Maximum lines to keep
 * @returns The last N lines and total line count
 */
export function processContentAsRingBuffer(
  content: string,
  maxLines: number
): { content: string; totalLines: number } {
  const lineBuffer = new LineBuffer(maxLines)
  lineBuffer.addLines(content)
  const stats = lineBuffer.getStats()

  return {
    content: lineBuffer.getContent(),
    totalLines: stats.totalLinesProcessed,
  }
}

// =============================================================================
// TRUNCATION UTILITIES
// =============================================================================

/**
 * Options for content truncation
 */
export interface TruncateOptions {
  /** Maximum length in characters */
  maxLength?: number
  /** Maximum lines */
  maxLines?: number
  /** Suffix to append when truncated */
  suffix?: string
  /** Whether to truncate from start (keep end) */
  truncateFromStart?: boolean
}

/**
 * Truncate content to fit within limits
 */
export function truncateContent(
  content: string,
  options: TruncateOptions = {}
): { content: string; truncated: boolean; originalLength: number } {
  const {
    maxLength = 100000,
    maxLines,
    suffix = "\n... (truncated)",
    truncateFromStart = false,
  } = options

  const originalLength = content.length
  let result = content
  let truncated = false

  // Handle line limit first
  if (maxLines !== undefined) {
    const lines = result.split("\n")
    if (lines.length > maxLines) {
      if (truncateFromStart) {
        result = lines.slice(-maxLines).join("\n")
      } else {
        result = lines.slice(0, maxLines).join("\n")
      }
      truncated = true
    }
  }

  // Handle character limit
  if (result.length > maxLength) {
    const availableLength = maxLength - suffix.length
    if (truncateFromStart) {
      result = suffix + result.slice(-availableLength)
    } else {
      result = result.slice(0, availableLength) + suffix
    }
    truncated = true
  }

  return { content: result, truncated, originalLength }
}

/**
 * Estimate if content needs truncation without actually truncating
 */
export function needsTruncation(
  content: string,
  options: TruncateOptions = {}
): boolean {
  const { maxLength = 100000, maxLines } = options

  if (content.length > maxLength) {
    return true
  }

  if (maxLines !== undefined) {
    const lineCount = content.split("\n").length
    if (lineCount > maxLines) {
      return true
    }
  }

  return false
}
