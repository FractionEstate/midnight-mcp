/**
 * Lockdown/Access Control System
 *
 * Content safety and access control checks.
 * Based on GitHub MCP server lockdown package patterns.
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Access information for a resource
 */
export interface ResourceAccessInfo {
  /** Whether the resource is private */
  isPrivate: boolean
  /** Whether the viewer has write access */
  hasWriteAccess: boolean
  /** The viewer's identifier */
  viewerId?: string
  /** The resource owner */
  ownerId?: string
}

/**
 * Options for access cache
 */
export interface AccessCacheOptions {
  /** TTL for cache entries in milliseconds */
  ttlMs?: number
  /** Maximum cache size */
  maxSize?: number
  /** Logger for diagnostics */
  logger?: AccessLogger
}

/**
 * Logger interface for access checks
 */
export interface AccessLogger {
  debug(message: string, data?: Record<string, unknown>): void
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
}

// =============================================================================
// ACCESS CACHE
// =============================================================================

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

/**
 * Simple TTL cache for access checks
 */
export class AccessCache<K, V> {
  private cache: Map<string, CacheEntry<V>> = new Map()
  private ttlMs: number
  private maxSize: number
  private logger?: AccessLogger

  constructor(options: AccessCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? 20 * 60 * 1000 // 20 minutes default
    this.maxSize = options.maxSize ?? 1000
    this.logger = options.logger
  }

  /**
   * Get a value from cache
   */
  get(key: K): V | undefined {
    const keyStr = this.keyToString(key)
    const entry = this.cache.get(keyStr)

    if (!entry) {
      this.logger?.debug("Cache miss", { key: keyStr })
      return undefined
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(keyStr)
      this.logger?.debug("Cache entry expired", { key: keyStr })
      return undefined
    }

    this.logger?.debug("Cache hit", { key: keyStr })
    return entry.data
  }

  /**
   * Set a value in cache
   */
  set(key: K, value: V): void {
    const keyStr = this.keyToString(key)

    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(keyStr, {
      data: value,
      expiresAt: Date.now() + this.ttlMs,
    })
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: K): boolean {
    return this.get(key) !== undefined
  }

  /**
   * Delete a key from cache
   */
  delete(key: K): boolean {
    return this.cache.delete(this.keyToString(key))
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    }
  }

  private keyToString(key: K): string {
    if (typeof key === "string") return key
    if (typeof key === "object") return JSON.stringify(key)
    return String(key)
  }
}

// =============================================================================
// RESOURCE ACCESS CHECKER
// =============================================================================

/**
 * Trusted identifiers that bypass safety checks
 */
const DEFAULT_TRUSTED_IDS = new Set(["system", "admin", "copilot"])

/**
 * Resource access checker with caching
 */
export class ResourceAccessChecker {
  private cache: AccessCache<string, ResourceAccessInfo>
  private trustedIds: Set<string>
  private logger?: AccessLogger

  constructor(options: AccessCacheOptions & { trustedIds?: string[] } = {}) {
    this.cache = new AccessCache(options)
    this.trustedIds = new Set([
      ...DEFAULT_TRUSTED_IDS,
      ...(options.trustedIds ?? []),
    ])
    this.logger = options.logger
  }

  /**
   * Check if content from a user is safe to access/display.
   *
   * Safe access applies when any of the following is true:
   * - The content was created by a trusted bot/system
   * - The author currently has write access to the resource
   * - The resource is private
   * - The content was created by the viewer
   */
  isSafeContent(
    authorId: string,
    resourceInfo: ResourceAccessInfo
  ): boolean {
    // Trusted sources are always safe
    if (this.isTrustedId(authorId)) {
      this.logger?.debug("Content from trusted source", { authorId })
      return true
    }

    // Private resources are safe
    if (resourceInfo.isPrivate) {
      this.logger?.debug("Private resource - safe", { authorId })
      return true
    }

    // Viewer's own content is safe
    if (
      resourceInfo.viewerId &&
      resourceInfo.viewerId.toLowerCase() === authorId.toLowerCase()
    ) {
      this.logger?.debug("Viewer's own content - safe", { authorId })
      return true
    }

    // Authors with write access are safe
    if (resourceInfo.hasWriteAccess) {
      this.logger?.debug("Author has write access - safe", { authorId })
      return true
    }

    this.logger?.warn("Content not verified as safe", { authorId })
    return false
  }

  /**
   * Check if an identifier is trusted
   */
  isTrustedId(id: string): boolean {
    return this.trustedIds.has(id.toLowerCase())
  }

  /**
   * Add a trusted identifier
   */
  addTrustedId(id: string): void {
    this.trustedIds.add(id.toLowerCase())
  }

  /**
   * Remove a trusted identifier
   */
  removeTrustedId(id: string): void {
    this.trustedIds.delete(id.toLowerCase())
  }

  /**
   * Get cached access info for a resource
   */
  getCachedAccess(resourceKey: string): ResourceAccessInfo | undefined {
    return this.cache.get(resourceKey)
  }

  /**
   * Cache access info for a resource
   */
  cacheAccess(resourceKey: string, info: ResourceAccessInfo): void {
    this.cache.set(resourceKey, info)
  }

  /**
   * Clear the access cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// =============================================================================
// RATE LIMITING
// =============================================================================

interface RateLimitEntry {
  count: number
  windowStart: number
}

/**
 * Simple rate limiter for access control
 */
export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map()
  private windowMs: number
  private maxRequests: number

  constructor(options: { windowMs?: number; maxRequests?: number } = {}) {
    this.windowMs = options.windowMs ?? 60 * 1000 // 1 minute default
    this.maxRequests = options.maxRequests ?? 100
  }

  /**
   * Check if a request should be allowed
   * @returns true if allowed, false if rate limited
   */
  isAllowed(key: string): boolean {
    const now = Date.now()
    const entry = this.limits.get(key)

    if (!entry || now - entry.windowStart > this.windowMs) {
      // New window
      this.limits.set(key, { count: 1, windowStart: now })
      return true
    }

    if (entry.count >= this.maxRequests) {
      return false
    }

    entry.count++
    return true
  }

  /**
   * Get remaining requests in the current window
   */
  getRemaining(key: string): number {
    const entry = this.limits.get(key)
    if (!entry || Date.now() - entry.windowStart > this.windowMs) {
      return this.maxRequests
    }
    return Math.max(0, this.maxRequests - entry.count)
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.limits.delete(key)
  }

  /**
   * Clear all rate limits
   */
  clear(): void {
    this.limits.clear()
  }
}

// =============================================================================
// PERMISSION CHECKING
// =============================================================================

/**
 * Permission level enum
 */
export enum PermissionLevel {
  None = 0,
  Read = 1,
  Write = 2,
  Admin = 3,
}

/**
 * Check if a user has at least the required permission level
 */
export function hasPermission(
  userLevel: PermissionLevel,
  requiredLevel: PermissionLevel
): boolean {
  return userLevel >= requiredLevel
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
  requiredLevel?: PermissionLevel
  actualLevel?: PermissionLevel
}

/**
 * Check permission and return detailed result
 */
export function checkPermission(
  userLevel: PermissionLevel,
  requiredLevel: PermissionLevel
): PermissionCheckResult {
  const allowed = hasPermission(userLevel, requiredLevel)

  if (allowed) {
    return { allowed: true }
  }

  return {
    allowed: false,
    reason: `Insufficient permissions. Required: ${PermissionLevel[requiredLevel]}, actual: ${PermissionLevel[userLevel]}`,
    requiredLevel,
    actualLevel: userLevel,
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let _accessChecker: ResourceAccessChecker | null = null

/**
 * Get the global access checker instance
 */
export function getAccessChecker(options?: AccessCacheOptions): ResourceAccessChecker {
  if (!_accessChecker) {
    _accessChecker = new ResourceAccessChecker(options)
  }
  return _accessChecker
}

/**
 * Reset the global access checker (for testing)
 */
export function resetAccessChecker(): void {
  _accessChecker = null
}
