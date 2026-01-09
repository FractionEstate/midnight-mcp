/**
 * Resources Module
 *
 * Enhanced resource system with toolset metadata and feature flag support.
 */

export * from "./resources.js"

// Dynamic resource loading
export {
  type DynamicResourceConfig,
  type DynamicResourceResult,
  stripMdxSyntax,
  extractMetadata,
  addSourceAttribution,
  defaultTransformer,
  loadDynamicResource,
  createDynamicResourceHandler,
  registerDynamicResource,
  getDynamicResource,
  getAllDynamicResources,
  loadRegisteredResource,
} from "./dynamic-loader.js"
