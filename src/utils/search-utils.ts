/**
 * Search Utilities
 *
 * Utilities for building and validating search queries.
 * Based on GitHub MCP server search_utils.go patterns.
 */

// =============================================================================
// UTILITIES (moved to top for hoisting)
// =============================================================================

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// =============================================================================
// QUERY FILTER DETECTION
// =============================================================================

/**
 * Check if a query contains a specific filter type
 * @param query - Search query string
 * @param filterType - Filter type to check for (e.g., "repo", "type", "is")
 * @returns true if the filter is present
 */
export function hasFilter(query: string, filterType: string): boolean {
  // Match filter at start of string, after whitespace, or after non-word characters
  const pattern = new RegExp(`(^|\\s|\\W)${escapeRegex(filterType)}:\\S+`, "i")
  return pattern.test(query)
}

/**
 * Check if a query contains a specific filter:value pair
 * @param query - Search query string
 * @param filterType - Filter type (e.g., "is", "type")
 * @param filterValue - Expected value
 * @returns true if the specific filter:value is present
 */
export function hasSpecificFilter(
  query: string,
  filterType: string,
  filterValue: string
): boolean {
  const pattern = new RegExp(
    `(^|\\s|\\W)${escapeRegex(filterType)}:${escapeRegex(filterValue)}($|\\s|\\W)`,
    "i"
  )
  return pattern.test(query)
}

/**
 * Check if query has a repo filter
 */
export function hasRepoFilter(query: string): boolean {
  return hasFilter(query, "repo")
}

/**
 * Check if query has a type filter
 */
export function hasTypeFilter(query: string): boolean {
  return hasFilter(query, "type")
}

/**
 * Check if query has an "is" filter with specific value
 */
export function hasIsFilter(query: string, value?: string): boolean {
  if (value) {
    return hasSpecificFilter(query, "is", value)
  }
  return hasFilter(query, "is")
}

// =============================================================================
// QUERY BUILDING
// =============================================================================

/**
 * Add a filter to a query if not already present
 * @param query - Original query
 * @param filterType - Filter type to add
 * @param filterValue - Filter value
 * @returns Modified query
 */
export function addFilter(
  query: string,
  filterType: string,
  filterValue: string
): string {
  if (hasFilter(query, filterType)) {
    return query
  }
  return `${filterType}:${filterValue} ${query}`.trim()
}

/**
 * Add repo filter if owner and repo are provided and not already in query
 */
export function addRepoFilter(
  query: string,
  owner?: string,
  repo?: string
): string {
  if (!owner || !repo) {
    return query
  }
  if (hasRepoFilter(query)) {
    return query
  }
  return `repo:${owner}/${repo} ${query}`.trim()
}

/**
 * Add "is:" filter if not already present
 */
export function addIsFilter(query: string, value: string): string {
  if (hasSpecificFilter(query, "is", value)) {
    return query
  }
  return `is:${value} ${query}`.trim()
}

/**
 * Build a complete search query from parts
 */
export interface SearchQueryOptions {
  /** Base search terms */
  terms: string
  /** Repository owner */
  owner?: string
  /** Repository name */
  repo?: string
  /** Type filter (issue, pr, etc.) */
  type?: string
  /** State filter (open, closed, merged) */
  state?: string
  /** Author filter */
  author?: string
  /** Label filters */
  labels?: string[]
  /** Language filter */
  language?: string
  /** Additional filters as key:value pairs */
  additionalFilters?: Record<string, string>
}

/**
 * Build a search query string from options
 */
export function buildSearchQuery(options: SearchQueryOptions): string {
  let query = options.terms

  // Add repo filter
  if (options.owner && options.repo) {
    query = addRepoFilter(query, options.owner, options.repo)
  }

  // Add type filter
  if (options.type && !hasFilter(query, "is")) {
    query = addIsFilter(query, options.type)
  }

  // Add state filter
  if (options.state && !hasFilter(query, "state")) {
    query = addFilter(query, "state", options.state)
  }

  // Add author filter
  if (options.author && !hasFilter(query, "author")) {
    query = addFilter(query, "author", options.author)
  }

  // Add label filters
  if (options.labels && options.labels.length > 0) {
    for (const label of options.labels) {
      if (!hasSpecificFilter(query, "label", label)) {
        query = addFilter(query, "label", `"${label}"`)
      }
    }
  }

  // Add language filter
  if (options.language && !hasFilter(query, "language")) {
    query = addFilter(query, "language", options.language)
  }

  // Add additional filters
  if (options.additionalFilters) {
    for (const [key, value] of Object.entries(options.additionalFilters)) {
      if (!hasFilter(query, key)) {
        query = addFilter(query, key, value)
      }
    }
  }

  return query.trim()
}

// =============================================================================
// QUERY PARSING
// =============================================================================

/**
 * Extract filter value from a query
 * @param query - Search query
 * @param filterType - Filter type to extract
 * @returns Filter value or undefined
 */
export function extractFilter(
  query: string,
  filterType: string
): string | undefined {
  const pattern = new RegExp(
    `(?:^|\\s|\\W)${escapeRegex(filterType)}:([^\\s]+)`,
    "i"
  )
  const match = query.match(pattern)
  return match ? match[1] : undefined
}

/**
 * Extract all filter values from a query
 * @param query - Search query
 * @param filterType - Filter type to extract
 * @returns Array of filter values
 */
export function extractAllFilters(query: string, filterType: string): string[] {
  const pattern = new RegExp(
    `(?:^|\\s|\\W)${escapeRegex(filterType)}:([^\\s]+)`,
    "gi"
  )
  const matches: string[] = []
  let match: RegExpExecArray | null
  while ((match = pattern.exec(query)) !== null) {
    matches.push(match[1])
  }
  return matches
}

/**
 * Remove a filter from a query
 */
export function removeFilter(query: string, filterType: string): string {
  const pattern = new RegExp(
    `\\s*${escapeRegex(filterType)}:[^\\s]+\\s*`,
    "gi"
  )
  return query.replace(pattern, " ").trim()
}

/**
 * Parse a query into its components
 */
export interface ParsedQuery {
  /** Remaining search terms after removing filters */
  terms: string
  /** Extracted filters */
  filters: Record<string, string[]>
}

/**
 * Parse a search query into components
 */
export function parseQuery(query: string): ParsedQuery {
  const filterPattern = /(\w+):([^\s]+)/g
  const filters: Record<string, string[]> = {}
  let terms = query

  let match: RegExpExecArray | null
  while ((match = filterPattern.exec(query)) !== null) {
    const [fullMatch, filterType, filterValue] = match
    if (!filters[filterType]) {
      filters[filterType] = []
    }
    filters[filterType].push(filterValue)
    terms = terms.replace(fullMatch, "")
  }

  return {
    terms: terms.trim().replace(/\s+/g, " "),
    filters,
  }
}

// =============================================================================
// =============================================================================

/**
 * Validate a search query for common issues
 */
export function validateQuery(query: string): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for empty query
  if (!query || query.trim().length === 0) {
    errors.push("Query cannot be empty")
  }

  // Check for unbalanced quotes
  const quoteCount = (query.match(/"/g) || []).length
  if (quoteCount % 2 !== 0) {
    errors.push("Unbalanced quotes in query")
  }

  // Check for very long queries
  if (query.length > 1000) {
    warnings.push("Query is very long and may be truncated")
  }

  // Check for potential issues
  if (query.includes("  ")) {
    warnings.push("Query contains multiple consecutive spaces")
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Normalize whitespace in a query
 */
export function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ")
}
