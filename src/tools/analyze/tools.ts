/**
 * Analyze tool definitions
 * MCP tool registration for analysis operations
 */

import type {
  ExtendedToolDefinition,
  OutputSchema,
} from "../../types/index.js";
import { analyzeContract, explainCircuit } from "./handlers.js";

// ============================================================================
// Output Schemas
// ============================================================================

const analyzeContractOutputSchema: OutputSchema = {
  type: "object",
  properties: {
    summary: {
      type: "object",
      description: "Summary statistics of the contract",
      properties: {
        hasLedger: { type: "boolean" },
        hasCircuits: { type: "boolean" },
        hasWitnesses: { type: "boolean" },
        totalLines: { type: "number" },
        publicCircuits: { type: "number" },
        privateCircuits: { type: "number" },
        publicState: { type: "number" },
        privateState: { type: "number" },
      },
    },
    structure: {
      type: "object",
      description: "Contract structure breakdown",
      properties: {
        imports: { type: "array", items: { type: "string" } },
        exports: { type: "array", items: { type: "string" } },
        ledger: {
          type: "array",
          description: "Ledger state fields",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: { type: "string" },
              isPrivate: { type: "boolean" },
            },
          },
        },
        circuits: {
          type: "array",
          description: "Circuit definitions",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              isPublic: { type: "boolean" },
              parameters: { type: "array", items: { type: "object" } },
              returnType: { type: "string" },
            },
          },
        },
        witnesses: {
          type: "array",
          description: "Witness functions",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              parameters: { type: "array", items: { type: "object" } },
              returnType: { type: "string" },
            },
          },
        },
        types: {
          type: "array",
          description: "Type definitions",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              definition: { type: "string" },
            },
          },
        },
      },
    },
    securityFindings: {
      type: "array",
      description: "Security analysis findings",
      items: {
        type: "object",
        properties: {
          severity: {
            type: "string",
            enum: ["info", "warning", "error"],
          },
          message: { type: "string" },
          suggestion: { type: "string" },
        },
      },
    },
    recommendations: {
      type: "array",
      items: { type: "string" },
      description: "Recommendations for improvement",
    },
  },
  required: ["summary", "structure", "securityFindings", "recommendations"],
  description: "Detailed contract analysis with security findings",
};

const explainCircuitOutputSchema: OutputSchema = {
  type: "object",
  properties: {
    circuitName: { type: "string", description: "Circuit name" },
    isPublic: { type: "boolean", description: "Whether it's exported" },
    parameters: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string" },
        },
      },
      description: "Circuit parameters",
    },
    returnType: { type: "string", description: "Return type" },
    explanation: {
      type: "string",
      description: "Plain language explanation",
    },
    operations: {
      type: "array",
      items: { type: "string" },
      description: "Operations performed by the circuit",
    },
    zkImplications: {
      type: "array",
      items: { type: "string" },
      description: "Zero-knowledge proof implications",
    },
    privacyConsiderations: {
      type: "array",
      items: { type: "string" },
      description: "Privacy-related considerations",
    },
  },
  required: [
    "circuitName",
    "explanation",
    "zkImplications",
    "privacyConsiderations",
  ],
  description: "Detailed circuit explanation with privacy analysis",
};

// ============================================================================
// Tool Definitions
// ============================================================================

export const analyzeTools: ExtendedToolDefinition[] = [
  {
    name: "midnight-analyze-contract",
    description: `⚠️ STATIC ANALYSIS ONLY - Analyze contract structure and patterns.
🚫 THIS DOES NOT COMPILE THE CONTRACT. Cannot catch: sealed field rules, disclose() requirements, semantic errors.
👉 Use 'midnight-extract-contract-structure' for pre-compilation checks.

Use this for: understanding structure, security pattern analysis, recommendations.
NEVER claim a contract 'works' or 'compiles' based on this tool alone.

USAGE GUIDANCE:
• Call once per contract - results are deterministic
• For security review, also use midnight-review-contract (requires sampling)
• Run before making changes, not repeatedly during iteration`,
    inputSchema: {
      type: "object" as const,
      properties: {
        code: {
          type: "string",
          description: "Compact contract source code to analyze",
        },
        checkSecurity: {
          type: "boolean",
          description: "Run security analysis (default: true)",
        },
      },
      required: ["code"],
    },
    outputSchema: analyzeContractOutputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      title: "Analyze Compact Contract",
      category: "analyze",
    },
    handler: analyzeContract,
  },
  {
    name: "midnight-explain-circuit",
    description: `Explain what a specific Compact circuit does in plain language, including its zero-knowledge proof implications and privacy considerations.

USAGE GUIDANCE:
• Call once per circuit - explanations are deterministic
• Provide complete circuit code including parameters and body
• For full contract analysis, use midnight-analyze-contract first`,
    inputSchema: {
      type: "object" as const,
      properties: {
        circuitCode: {
          type: "string",
          description: "Circuit definition from Compact to explain",
        },
      },
      required: ["circuitCode"],
    },
    outputSchema: explainCircuitOutputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      title: "Explain Circuit",
      category: "analyze",
    },
    handler: explainCircuit,
  },
];
