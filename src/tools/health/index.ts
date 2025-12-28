/**
 * Health module exports
 * Barrel file for health-related tools
 */

// Schemas and types
export {
  HealthCheckInputSchema,
  GetStatusInputSchema,
  CheckVersionInputSchema,
  AutoUpdateConfigInputSchema,
  type HealthCheckInput,
  type GetStatusInput,
  type CheckVersionInput,
  type AutoUpdateConfigInput,
} from "./schemas.js";

// Handlers
export {
  healthCheck,
  getStatus,
  checkVersion,
  getAutoUpdateConfig,
} from "./handlers.js";

// Tools
export { healthTools } from "./tools.js";
