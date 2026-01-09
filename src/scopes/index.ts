/**
 * Scopes Module
 *
 * Permission scope management for tool access control.
 */

export {
  MidnightScopes,
  NextJSScopes,
  ScopeHierarchy,
  ScopeSet,
  expandScopes,
  expandScopeSet,
  hasRequiredScopes,
  getMinimumScopes,
  describeScope,
} from "./scopes.js"
export type { Scope } from "./scopes.js"
