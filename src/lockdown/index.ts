/**
 * Lockdown Module
 *
 * Access control and content safety utilities.
 */

export {
  AccessCache,
  ResourceAccessChecker,
  RateLimiter,
  PermissionLevel,
  hasPermission,
  checkPermission,
  getAccessChecker,
  resetAccessChecker,
} from "./lockdown.js"
export type {
  ResourceAccessInfo,
  AccessCacheOptions,
  AccessLogger,
  PermissionCheckResult,
} from "./lockdown.js"
