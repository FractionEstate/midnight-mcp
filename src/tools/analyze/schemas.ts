/**
 * Analyze tool input schemas
 * Zod schemas for validating tool inputs
 */

import { z } from "zod";

// Schema definitions
export const AnalyzeContractInputSchema = z.object({
  code: z.string().describe("Compact contract source code"),
  checkSecurity: z
    .boolean()
    .optional()
    .default(true)
    .describe("Run security analysis"),
});

export const ExplainCircuitInputSchema = z.object({
  circuitCode: z.string().describe("Circuit definition from Compact"),
});

// Type exports
export type AnalyzeContractInput = z.infer<typeof AnalyzeContractInputSchema>;
export type ExplainCircuitInput = z.infer<typeof ExplainCircuitInputSchema>;

// Shared types
export interface SecurityFinding {
  severity: "info" | "warning" | "error";
  message: string;
  line?: number;
  suggestion?: string;
}
