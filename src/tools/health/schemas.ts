/**
 * Health tool input schemas
 * Zod schemas for validating tool inputs
 */

import { z } from "zod";

// Schema definitions
export const HealthCheckInputSchema = z.object({
  detailed: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include detailed checks (slower but more comprehensive)"),
});

export const GetStatusInputSchema = z.object({});

export const CheckVersionInputSchema = z.object({});

export const AutoUpdateConfigInputSchema = z.object({});

// Type exports
export type HealthCheckInput = z.infer<typeof HealthCheckInputSchema>;
export type GetStatusInput = z.infer<typeof GetStatusInputSchema>;
export type CheckVersionInput = z.infer<typeof CheckVersionInputSchema>;
export type AutoUpdateConfigInput = z.infer<typeof AutoUpdateConfigInputSchema>;
