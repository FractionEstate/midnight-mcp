/**
 * Generation module exports
 * Barrel file for generation-related tools
 */

// Schemas and types
export {
  GenerateContractInputSchema,
  ReviewContractInputSchema,
  DocumentContractInputSchema,
  type GenerateContractInput,
  type ReviewContractInput,
  type DocumentContractInput,
} from "./schemas.js";

// Handlers
export {
  handleGenerateContract,
  handleReviewContract,
  handleDocumentContract,
} from "./handlers.js";

// Tools
export { generationTools, generationHandlers } from "./tools.js";
