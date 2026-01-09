/**
 * Logging and IO Utilities
 *
 * Structured logging system for MCP server.
 * Based on GitHub MCP server log package patterns.
 */

// =============================================================================
// LOG LEVELS
// =============================================================================

export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
  Fatal = 4,
}

export const LogLevelNames: Record<LogLevel, string> = {
  [LogLevel.Debug]: "DEBUG",
  [LogLevel.Info]: "INFO",
  [LogLevel.Warn]: "WARN",
  [LogLevel.Error]: "ERROR",
  [LogLevel.Fatal]: "FATAL",
}

// =============================================================================
// LOG ENTRY
// =============================================================================

export interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  error?: Error
  source?: string
}

export interface FormattedLogEntry extends LogEntry {
  formatted: string
}

// =============================================================================
// LOG FORMATTER
// =============================================================================

export type LogFormatter = (entry: LogEntry) => string

/**
 * Default JSON formatter
 */
export function jsonFormatter(entry: LogEntry): string {
  return JSON.stringify({
    timestamp: entry.timestamp.toISOString(),
    level: LogLevelNames[entry.level],
    message: entry.message,
    ...(entry.source && { source: entry.source }),
    ...(entry.context && { context: entry.context }),
    ...(entry.error && {
      error: {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
      },
    }),
  })
}

/**
 * Human-readable text formatter
 */
export function textFormatter(entry: LogEntry): string {
  const timestamp = entry.timestamp.toISOString()
  const level = LogLevelNames[entry.level].padEnd(5)
  const source = entry.source ? `[${entry.source}] ` : ""

  let line = `${timestamp} ${level} ${source}${entry.message}`

  if (entry.context && Object.keys(entry.context).length > 0) {
    line += ` ${JSON.stringify(entry.context)}`
  }

  if (entry.error) {
    line += `\n  Error: ${entry.error.message}`
    if (entry.error.stack) {
      line += `\n${entry.error.stack.split("\n").slice(1).map(l => "  " + l).join("\n")}`
    }
  }

  return line
}

/**
 * Compact single-line formatter (for structured logging)
 */
export function compactFormatter(entry: LogEntry): string {
  const parts = [
    entry.timestamp.toISOString(),
    LogLevelNames[entry.level],
  ]

  if (entry.source) {
    parts.push(entry.source)
  }

  parts.push(entry.message)

  return parts.join(" | ")
}

// =============================================================================
// LOG TRANSPORT
// =============================================================================

export type LogTransport = (entry: FormattedLogEntry) => void | Promise<void>

/**
 * Console transport
 */
export function consoleTransport(entry: FormattedLogEntry): void {
  switch (entry.level) {
    case LogLevel.Debug:
      console.debug(entry.formatted)
      break
    case LogLevel.Info:
      console.info(entry.formatted)
      break
    case LogLevel.Warn:
      console.warn(entry.formatted)
      break
    case LogLevel.Error:
    case LogLevel.Fatal:
      console.error(entry.formatted)
      break
  }
}

/**
 * Stderr transport (all logs to stderr)
 */
export function stderrTransport(entry: FormattedLogEntry): void {
  process.stderr.write(entry.formatted + "\n")
}

/**
 * Memory transport (stores logs in memory)
 */
export function createMemoryTransport(maxEntries: number = 1000): {
  transport: LogTransport
  getEntries: () => FormattedLogEntry[]
  clear: () => void
} {
  const entries: FormattedLogEntry[] = []

  return {
    transport: (entry: FormattedLogEntry) => {
      entries.push(entry)
      if (entries.length > maxEntries) {
        entries.shift()
      }
    },
    getEntries: () => [...entries],
    clear: () => {
      entries.length = 0
    },
  }
}

// =============================================================================
// LOGGER
// =============================================================================

export interface LoggerOptions {
  level?: LogLevel
  formatter?: LogFormatter
  transports?: LogTransport[]
  source?: string
}

export class Logger {
  private level: LogLevel
  private formatter: LogFormatter
  private transports: LogTransport[]
  private source?: string

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.Info
    this.formatter = options.formatter ?? textFormatter
    this.transports = options.transports ?? [consoleTransport]
    this.source = options.source
  }

  /**
   * Create a child logger with additional context
   */
  child(source: string): Logger {
    return new Logger({
      level: this.level,
      formatter: this.formatter,
      transports: this.transports,
      source: this.source ? `${this.source}.${source}` : source,
    })
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level
  }

  /**
   * Check if a level is enabled
   */
  isLevelEnabled(level: LogLevel): boolean {
    return level >= this.level
  }

  /**
   * Log a message at a specific level
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    if (!this.isLevelEnabled(level)) {
      return
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      error,
      source: this.source,
    }

    const formatted = this.formatter(entry)
    const formattedEntry: FormattedLogEntry = { ...entry, formatted }

    for (const transport of this.transports) {
      try {
        transport(formattedEntry)
      } catch {
        // Ignore transport errors
      }
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.Debug, message, context)
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.Info, message, context)
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.Warn, message, context)
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.Error, message, context, error)
  }

  fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.Fatal, message, context, error)
  }

  /**
   * Log with explicit level
   */
  logAt(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    this.log(level, message, context, error)
  }
}

// =============================================================================
// GLOBAL LOGGER
// =============================================================================

let globalLogger: Logger | undefined

/**
 * Get or create the global logger
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger()
  }
  return globalLogger
}

/**
 * Configure the global logger
 */
export function configureLogger(options: LoggerOptions): void {
  globalLogger = new Logger(options)
}

// =============================================================================
// LOG UTILITIES
// =============================================================================

/**
 * Parse log level from string
 */
export function parseLogLevel(level: string): LogLevel {
  const normalized = level.toUpperCase()
  switch (normalized) {
    case "DEBUG":
      return LogLevel.Debug
    case "INFO":
      return LogLevel.Info
    case "WARN":
    case "WARNING":
      return LogLevel.Warn
    case "ERROR":
      return LogLevel.Error
    case "FATAL":
      return LogLevel.Fatal
    default:
      return LogLevel.Info
  }
}

/**
 * Get log level from environment variable
 */
export function getLogLevelFromEnv(envVar: string = "LOG_LEVEL"): LogLevel {
  const value = process.env[envVar]
  if (!value) {
    return LogLevel.Info
  }
  return parseLogLevel(value)
}

// =============================================================================
// TIMING UTILITIES
// =============================================================================

export interface TimingResult<T> {
  result: T
  duration: number
  durationMs: number
}

/**
 * Time an async operation
 */
export async function timeAsync<T>(
  fn: () => Promise<T>
): Promise<TimingResult<T>> {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  const durationMs = end - start

  return {
    result,
    duration: durationMs / 1000,
    durationMs,
  }
}

/**
 * Time a sync operation
 */
export function timeSync<T>(fn: () => T): TimingResult<T> {
  const start = performance.now()
  const result = fn()
  const end = performance.now()
  const durationMs = end - start

  return {
    result,
    duration: durationMs / 1000,
    durationMs,
  }
}

/**
 * Create a timer for manual timing
 */
export function createTimer(): {
  elapsed: () => number
  elapsedMs: () => number
  reset: () => void
} {
  let start = performance.now()

  return {
    elapsed: () => (performance.now() - start) / 1000,
    elapsedMs: () => performance.now() - start,
    reset: () => {
      start = performance.now()
    },
  }
}

// =============================================================================
// REQUEST LOGGING
// =============================================================================

export interface RequestLogContext {
  requestId: string
  method: string
  path?: string
  startTime: Date
}

/**
 * Log a tool request
 */
export function logToolRequest(
  logger: Logger,
  toolName: string,
  params: unknown,
  requestId: string
): void {
  logger.info(`Tool request: ${toolName}`, {
    requestId,
    tool: toolName,
    params: typeof params === "object" ? params : { value: params },
  })
}

/**
 * Log a tool response
 */
export function logToolResponse(
  logger: Logger,
  toolName: string,
  durationMs: number,
  success: boolean,
  requestId: string,
  error?: Error
): void {
  if (success) {
    logger.info(`Tool response: ${toolName}`, {
      requestId,
      tool: toolName,
      durationMs,
      success: true,
    })
  } else {
    logger.error(`Tool error: ${toolName}`, error, {
      requestId,
      tool: toolName,
      durationMs,
      success: false,
    })
  }
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  return `${timestamp}-${random}`
}
