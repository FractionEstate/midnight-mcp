/**
 * Search module exports
 * Barrel file for search-related tools
 */

// Schemas and types
export {
  SearchCompactInputSchema,
  SearchTypeScriptInputSchema,
  SearchDocsInputSchema,
  type SearchCompactInput,
  type SearchTypeScriptInput,
  type SearchDocsInput,
} from "./schemas.js";

// Handlers
export { searchCompact, searchTypeScript, searchDocs } from "./handlers.js";

// Tools
export { searchTools } from "./tools.js";
