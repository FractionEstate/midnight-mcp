/**
 * Parameter Handling Utilities
 *
 * Type-safe parameter extraction and validation helpers.
 * Based on GitHub MCP server server.go patterns.
 */

// =============================================================================
// REQUIRED PARAMETERS
// =============================================================================

/**
 * Extract a required parameter from the arguments object.
 * Throws if the parameter is missing or has the wrong type.
 */
export function requiredParam<T>(
  args: Record<string, unknown>,
  name: string
): T {
  if (!(name in args)) {
    throw new Error(`Missing required parameter: ${name}`)
  }

  const value = args[name]
  if (value === undefined || value === null) {
    throw new Error(`Missing required parameter: ${name}`)
  }

  return value as T
}

/**
 * Extract a required string parameter
 */
export function requiredString(
  args: Record<string, unknown>,
  name: string
): string {
  const value = requiredParam<string>(args, name)
  if (typeof value !== "string") {
    throw new Error(`Parameter ${name} must be a string, got ${typeof value}`)
  }
  if (value === "") {
    throw new Error(`Missing required parameter: ${name}`)
  }
  return value
}

/**
 * Extract a required number parameter
 */
export function requiredNumber(
  args: Record<string, unknown>,
  name: string
): number {
  const value = requiredParam<number>(args, name)
  if (typeof value !== "number") {
    throw new Error(`Parameter ${name} must be a number, got ${typeof value}`)
  }
  return value
}

/**
 * Extract a required integer parameter
 */
export function requiredInt(
  args: Record<string, unknown>,
  name: string
): number {
  const value = requiredNumber(args, name)
  if (!Number.isInteger(value)) {
    throw new Error(`Parameter ${name} must be an integer`)
  }
  return value
}

/**
 * Extract a required boolean parameter
 */
export function requiredBoolean(
  args: Record<string, unknown>,
  name: string
): boolean {
  const value = requiredParam<boolean>(args, name)
  if (typeof value !== "boolean") {
    throw new Error(`Parameter ${name} must be a boolean, got ${typeof value}`)
  }
  return value
}

// =============================================================================
// OPTIONAL PARAMETERS
// =============================================================================

/**
 * Extract an optional parameter from the arguments object.
 * Returns undefined if the parameter is missing.
 */
export function optionalParam<T>(
  args: Record<string, unknown>,
  name: string
): T | undefined {
  if (!(name in args)) {
    return undefined
  }
  const value = args[name]
  if (value === undefined || value === null) {
    return undefined
  }
  return value as T
}

/**
 * Extract an optional string parameter
 */
export function optionalString(
  args: Record<string, unknown>,
  name: string
): string | undefined {
  const value = optionalParam<string>(args, name)
  if (value === undefined) return undefined
  if (typeof value !== "string") {
    throw new Error(`Parameter ${name} must be a string, got ${typeof value}`)
  }
  return value
}

/**
 * Extract an optional number parameter
 */
export function optionalNumber(
  args: Record<string, unknown>,
  name: string
): number | undefined {
  const value = optionalParam<number>(args, name)
  if (value === undefined) return undefined
  if (typeof value !== "number") {
    throw new Error(`Parameter ${name} must be a number, got ${typeof value}`)
  }
  return value
}

/**
 * Extract an optional integer parameter
 */
export function optionalInt(
  args: Record<string, unknown>,
  name: string
): number | undefined {
  const value = optionalNumber(args, name)
  if (value === undefined) return undefined
  if (!Number.isInteger(value)) {
    throw new Error(`Parameter ${name} must be an integer`)
  }
  return value
}

/**
 * Extract an optional boolean parameter
 */
export function optionalBoolean(
  args: Record<string, unknown>,
  name: string
): boolean | undefined {
  const value = optionalParam<boolean>(args, name)
  if (value === undefined) return undefined
  if (typeof value !== "boolean") {
    throw new Error(`Parameter ${name} must be a boolean, got ${typeof value}`)
  }
  return value
}

// =============================================================================
// PARAMETER WITH DEFAULTS
// =============================================================================

/**
 * Extract an optional parameter with a default value
 */
export function optionalParamWithDefault<T>(
  args: Record<string, unknown>,
  name: string,
  defaultValue: T
): T {
  const value = optionalParam<T>(args, name)
  return value ?? defaultValue
}

/**
 * Extract an optional integer with a default value
 */
export function optionalIntWithDefault(
  args: Record<string, unknown>,
  name: string,
  defaultValue: number
): number {
  const value = optionalInt(args, name)
  return value ?? defaultValue
}

/**
 * Extract an optional boolean with a default value
 */
export function optionalBoolWithDefault(
  args: Record<string, unknown>,
  name: string,
  defaultValue: boolean
): boolean {
  const value = optionalBoolean(args, name)
  return value ?? defaultValue
}

// =============================================================================
// ARRAY PARAMETERS
// =============================================================================

/**
 * Extract an optional string array parameter
 */
export function optionalStringArray(
  args: Record<string, unknown>,
  name: string
): string[] {
  const value = optionalParam<unknown[]>(args, name)
  if (value === undefined) return []

  if (!Array.isArray(value)) {
    throw new Error(`Parameter ${name} must be an array`)
  }

  return value.map((item, i) => {
    if (typeof item !== "string") {
      throw new Error(`Parameter ${name}[${i}] must be a string`)
    }
    return item
  })
}

/**
 * Extract an optional number array parameter
 */
export function optionalNumberArray(
  args: Record<string, unknown>,
  name: string
): number[] {
  const value = optionalParam<unknown[]>(args, name)
  if (value === undefined) return []

  if (!Array.isArray(value)) {
    throw new Error(`Parameter ${name} must be an array`)
  }

  return value.map((item, i) => {
    if (typeof item !== "number") {
      throw new Error(`Parameter ${name}[${i}] must be a number`)
    }
    return item
  })
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate that a value is within a range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  name: string
): void {
  if (value < min || value > max) {
    throw new Error(`Parameter ${name} must be between ${min} and ${max}`)
  }
}

/**
 * Validate that a string is not empty
 */
export function validateNotEmpty(value: string, name: string): void {
  if (!value || value.trim() === "") {
    throw new Error(`Parameter ${name} cannot be empty`)
  }
}

/**
 * Validate that a string matches a pattern
 */
export function validatePattern(
  value: string,
  pattern: RegExp,
  name: string,
  description?: string
): void {
  if (!pattern.test(value)) {
    const desc = description || `pattern ${pattern.toString()}`
    throw new Error(`Parameter ${name} must match ${desc}`)
  }
}

/**
 * Validate that a value is one of the allowed values
 */
export function validateEnum<T>(
  value: T,
  allowed: readonly T[],
  name: string
): void {
  if (!allowed.includes(value)) {
    throw new Error(
      `Parameter ${name} must be one of: ${allowed.join(", ")}`
    )
  }
}

// =============================================================================
// RESULT HELPERS
// =============================================================================

/**
 * Create a JSON result string
 */
export function jsonResult(data: unknown): string {
  return JSON.stringify(data, null, 2)
}

/**
 * Create an error result object
 */
export function errorResult(message: string): { error: string } {
  return { error: message }
}

/**
 * Create a success result object
 */
export function successResult(
  message: string,
  data?: Record<string, unknown>
): Record<string, unknown> {
  return {
    success: true,
    message,
    ...data,
  }
}
