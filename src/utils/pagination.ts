/**
 * Pagination Utilities
 *
 * Unified pagination helpers for REST and cursor-based APIs.
 * Based on GitHub MCP server pagination patterns.
 */

import { z } from "zod"

// =============================================================================
// TYPES
// =============================================================================

export interface PaginationParams {
  /** Page number (1-based) */
  page: number
  /** Items per page */
  perPage: number
  /** Cursor for cursor-based pagination */
  after?: string
}

export interface CursorPaginationParams {
  /** Items per page */
  perPage: number
  /** Cursor for pagination */
  after?: string
}

export interface GraphQLPaginationParams {
  /** Number of items to fetch */
  first: number
  /** Cursor to start after */
  after?: string
}

export interface PageInfo {
  /** Whether there's a next page */
  hasNextPage: boolean
  /** Whether there's a previous page */
  hasPreviousPage: boolean
  /** Cursor for the start of current page */
  startCursor?: string
  /** Cursor for the end of current page */
  endCursor?: string
  /** Total count if available */
  totalCount?: number
}

// =============================================================================
// SCHEMA HELPERS
// =============================================================================

/**
 * Pagination schema properties for REST APIs
 */
export const paginationSchema = {
  page: z
    .number()
    .min(1)
    .optional()
    .describe("Page number for pagination (min 1)"),
  perPage: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe("Results per page for pagination (min 1, max 100)"),
}

/**
 * Unified pagination schema (REST + cursor)
 */
export const unifiedPaginationSchema = {
  ...paginationSchema,
  after: z
    .string()
    .optional()
    .describe("Cursor for pagination. Use the endCursor from the previous page's PageInfo for GraphQL APIs."),
}

/**
 * Cursor-only pagination schema (no page parameter)
 */
export const cursorPaginationSchema = {
  perPage: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe("Results per page for pagination (min 1, max 100)"),
  after: z
    .string()
    .optional()
    .describe("Cursor for pagination. Use the endCursor from the previous page's PageInfo."),
}

// =============================================================================
// PARAMETER EXTRACTION
// =============================================================================

/**
 * Extract pagination params from tool arguments
 */
export function extractPaginationParams(
  args: Record<string, unknown>,
  defaults: { page?: number; perPage?: number } = {}
): PaginationParams {
  const page = (args.page as number) || defaults.page || 1
  const perPage = (args.perPage as number) || defaults.perPage || 30
  const after = args.after as string | undefined

  return { page, perPage, after }
}

/**
 * Extract cursor pagination params from tool arguments
 */
export function extractCursorPaginationParams(
  args: Record<string, unknown>,
  defaults: { perPage?: number } = {}
): CursorPaginationParams {
  const perPage = (args.perPage as number) || defaults.perPage || 30
  const after = args.after as string | undefined

  return { perPage, after }
}

// =============================================================================
// CONVERSION HELPERS
// =============================================================================

/**
 * Convert pagination params to GraphQL format
 */
export function toGraphQLParams(params: PaginationParams | CursorPaginationParams): GraphQLPaginationParams {
  const perPage = params.perPage || 30

  // Validate limits
  if (perPage > 100) {
    throw new Error(`perPage value ${perPage} exceeds maximum of 100`)
  }
  if (perPage < 1) {
    throw new Error(`perPage value ${perPage} must be at least 1`)
  }

  return {
    first: perPage,
    after: ("after" in params && params.after) ? params.after : undefined,
  }
}

/**
 * Calculate offset for page-based pagination
 */
export function calculateOffset(params: PaginationParams): number {
  return (params.page - 1) * params.perPage
}

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

/**
 * Create PageInfo from array results
 */
export function createPageInfo<T>(
  items: T[],
  params: PaginationParams,
  totalCount?: number
): PageInfo {
  const offset = calculateOffset(params)
  const hasNextPage = totalCount !== undefined
    ? offset + items.length < totalCount
    : items.length === params.perPage

  return {
    hasNextPage,
    hasPreviousPage: params.page > 1,
    totalCount,
  }
}

/**
 * Create cursor-based PageInfo
 */
export function createCursorPageInfo<T>(
  items: T[],
  params: CursorPaginationParams,
  getCursor: (item: T) => string,
  totalCount?: number
): PageInfo {
  const hasNextPage = items.length === params.perPage

  return {
    hasNextPage,
    hasPreviousPage: !!params.after,
    startCursor: items.length > 0 ? getCursor(items[0]) : undefined,
    endCursor: items.length > 0 ? getCursor(items[items.length - 1]) : undefined,
    totalCount,
  }
}

/**
 * Format paginated response with metadata
 */
export function formatPaginatedResponse<T>(
  items: T[],
  pageInfo: PageInfo,
  itemKey = "items"
): Record<string, unknown> {
  return {
    [itemKey]: items,
    pageInfo,
    ...(pageInfo.totalCount !== undefined && { totalCount: pageInfo.totalCount }),
  }
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(params: PaginationParams): string[] {
  const errors: string[] = []

  if (params.page < 1) {
    errors.push("Page number must be at least 1")
  }
  if (params.perPage < 1) {
    errors.push("perPage must be at least 1")
  }
  if (params.perPage > 100) {
    errors.push("perPage cannot exceed 100")
  }

  return errors
}

/**
 * Normalize and validate pagination params
 */
export function normalizePaginationParams(
  args: Record<string, unknown>,
  options: {
    defaultPage?: number
    defaultPerPage?: number
    maxPerPage?: number
  } = {}
): PaginationParams {
  const { defaultPage = 1, defaultPerPage = 30, maxPerPage = 100 } = options

  let page = (args.page as number) || defaultPage
  let perPage = (args.perPage as number) || defaultPerPage
  const after = args.after as string | undefined

  // Clamp values to valid ranges
  page = Math.max(1, Math.floor(page))
  perPage = Math.max(1, Math.min(maxPerPage, Math.floor(perPage)))

  return { page, perPage, after }
}
