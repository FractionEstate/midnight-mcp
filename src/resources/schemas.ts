export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

// Schema resources
export const schemaResources: ResourceDefinition[] = [
  {
    uri: "midnight://schema/compact-ast",
    name: "Compact AST Schema",
    description: "JSON schema for Compact Abstract Syntax Tree structures",
    mimeType: "application/json",
  },
  {
    uri: "midnight://schema/transaction",
    name: "Transaction Schema",
    description: "Transaction format schema for Midnight network",
    mimeType: "application/json",
  },
  {
    uri: "midnight://schema/proof",
    name: "Proof Schema",
    description: "ZK proof format schema",
    mimeType: "application/json",
  },
];

// Embedded schemas
const EMBEDDED_SCHEMAS: Record<string, object> = {
  "midnight://schema/compact-ast": {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Compact AST",
    description: "Abstract Syntax Tree for Compact smart contracts",
    type: "object",
    definitions: {
      LedgerDeclaration: {
        type: "object",
        properties: {
          type: { const: "LedgerDeclaration" },
          fields: {
            type: "array",
            items: { $ref: "#/definitions/LedgerField" },
          },
        },
        required: ["type", "fields"],
      },
      LedgerField: {
        type: "object",
        properties: {
          name: { type: "string" },
          fieldType: { type: "string" },
          isPrivate: { type: "boolean" },
          annotations: { type: "array", items: { type: "string" } },
        },
        required: ["name", "fieldType"],
      },
      CircuitDeclaration: {
        type: "object",
        properties: {
          type: { const: "CircuitDeclaration" },
          name: { type: "string" },
          isExported: { type: "boolean" },
          parameters: {
            type: "array",
            items: { $ref: "#/definitions/Parameter" },
          },
          returnType: { type: "string" },
          body: { $ref: "#/definitions/BlockStatement" },
        },
        required: ["type", "name", "parameters", "body"],
      },
      WitnessDeclaration: {
        type: "object",
        properties: {
          type: { const: "WitnessDeclaration" },
          name: { type: "string" },
          parameters: {
            type: "array",
            items: { $ref: "#/definitions/Parameter" },
          },
          returnType: { type: "string" },
          body: { $ref: "#/definitions/BlockStatement" },
        },
        required: ["type", "name", "parameters", "body"],
      },
      Parameter: {
        type: "object",
        properties: {
          name: { type: "string" },
          paramType: { type: "string" },
          isPrivate: { type: "boolean" },
        },
        required: ["name", "paramType"],
      },
      BlockStatement: {
        type: "object",
        properties: {
          type: { const: "BlockStatement" },
          statements: {
            type: "array",
            items: { $ref: "#/definitions/Statement" },
          },
        },
        required: ["type", "statements"],
      },
      Statement: {
        oneOf: [
          { $ref: "#/definitions/VariableDeclaration" },
          { $ref: "#/definitions/AssertStatement" },
          { $ref: "#/definitions/ReturnStatement" },
          { $ref: "#/definitions/ExpressionStatement" },
        ],
      },
      VariableDeclaration: {
        type: "object",
        properties: {
          type: { const: "VariableDeclaration" },
          name: { type: "string" },
          varType: { type: "string" },
          initializer: { $ref: "#/definitions/Expression" },
        },
        required: ["type", "name"],
      },
      AssertStatement: {
        type: "object",
        properties: {
          type: { const: "AssertStatement" },
          condition: { $ref: "#/definitions/Expression" },
          message: { type: "string" },
        },
        required: ["type", "condition"],
      },
      ReturnStatement: {
        type: "object",
        properties: {
          type: { const: "ReturnStatement" },
          value: { $ref: "#/definitions/Expression" },
        },
        required: ["type"],
      },
      ExpressionStatement: {
        type: "object",
        properties: {
          type: { const: "ExpressionStatement" },
          expression: { $ref: "#/definitions/Expression" },
        },
        required: ["type", "expression"],
      },
      Expression: {
        oneOf: [
          { $ref: "#/definitions/BinaryExpression" },
          { $ref: "#/definitions/CallExpression" },
          { $ref: "#/definitions/MemberExpression" },
          { $ref: "#/definitions/Identifier" },
          { $ref: "#/definitions/Literal" },
        ],
      },
      BinaryExpression: {
        type: "object",
        properties: {
          type: { const: "BinaryExpression" },
          operator: { type: "string" },
          left: { $ref: "#/definitions/Expression" },
          right: { $ref: "#/definitions/Expression" },
        },
        required: ["type", "operator", "left", "right"],
      },
      CallExpression: {
        type: "object",
        properties: {
          type: { const: "CallExpression" },
          callee: { $ref: "#/definitions/Expression" },
          arguments: {
            type: "array",
            items: { $ref: "#/definitions/Expression" },
          },
        },
        required: ["type", "callee", "arguments"],
      },
      MemberExpression: {
        type: "object",
        properties: {
          type: { const: "MemberExpression" },
          object: { $ref: "#/definitions/Expression" },
          property: { type: "string" },
        },
        required: ["type", "object", "property"],
      },
      Identifier: {
        type: "object",
        properties: {
          type: { const: "Identifier" },
          name: { type: "string" },
        },
        required: ["type", "name"],
      },
      Literal: {
        type: "object",
        properties: {
          type: { const: "Literal" },
          value: {},
          raw: { type: "string" },
        },
        required: ["type", "value"],
      },
    },
    properties: {
      type: { const: "Program" },
      imports: {
        type: "array",
        items: { type: "string" },
      },
      ledger: { $ref: "#/definitions/LedgerDeclaration" },
      circuits: {
        type: "array",
        items: { $ref: "#/definitions/CircuitDeclaration" },
      },
      witnesses: {
        type: "array",
        items: { $ref: "#/definitions/WitnessDeclaration" },
      },
      types: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            definition: { type: "string" },
          },
        },
      },
    },
    required: ["type"],
  },

  "midnight://schema/transaction": {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Midnight Transaction",
    description: "Transaction format for Midnight network",
    type: "object",
    properties: {
      version: {
        type: "integer",
        description: "Transaction format version",
      },
      hash: {
        type: "string",
        description: "Transaction hash (hex)",
        pattern: "^0x[a-fA-F0-9]{64}$",
      },
      contractAddress: {
        type: "string",
        description: "Target contract address",
      },
      circuitName: {
        type: "string",
        description: "Name of the circuit being called",
      },
      inputs: {
        type: "object",
        description: "Public inputs to the circuit",
        additionalProperties: true,
      },
      proof: {
        $ref: "#/definitions/Proof",
      },
      publicOutputs: {
        type: "array",
        description: "Public outputs from circuit execution",
        items: {},
      },
      stateChanges: {
        type: "array",
        items: { $ref: "#/definitions/StateChange" },
      },
      timestamp: {
        type: "integer",
        description: "Transaction timestamp (Unix)",
      },
      sender: {
        type: "string",
        description: "Transaction sender address",
      },
      nonce: {
        type: "integer",
        description: "Transaction nonce",
      },
      fee: {
        type: "string",
        description: "Transaction fee",
      },
    },
    definitions: {
      Proof: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["groth16", "plonk"],
          },
          data: {
            type: "string",
            description: "Base64 encoded proof data",
          },
          publicInputs: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["type", "data", "publicInputs"],
      },
      StateChange: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["insert", "update", "delete"],
          },
          path: {
            type: "string",
            description: "State path being modified",
          },
          oldValue: {
            description: "Previous value (for updates/deletes)",
          },
          newValue: {
            description: "New value (for inserts/updates)",
          },
        },
        required: ["type", "path"],
      },
    },
    required: ["version", "contractAddress", "circuitName", "proof"],
  },

  "midnight://schema/proof": {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Midnight ZK Proof",
    description: "Zero-knowledge proof format",
    type: "object",
    properties: {
      proofSystem: {
        type: "string",
        enum: ["groth16", "plonk", "halo2"],
        description: "Proof system used",
      },
      curve: {
        type: "string",
        enum: ["bn254", "bls12-381"],
        description: "Elliptic curve used",
      },
      proof: {
        type: "object",
        properties: {
          a: {
            type: "array",
            items: { type: "string" },
            description: "Proof element A (G1 point)",
          },
          b: {
            type: "array",
            items: {
              type: "array",
              items: { type: "string" },
            },
            description: "Proof element B (G2 point)",
          },
          c: {
            type: "array",
            items: { type: "string" },
            description: "Proof element C (G1 point)",
          },
        },
        required: ["a", "b", "c"],
      },
      publicInputs: {
        type: "array",
        items: { type: "string" },
        description: "Public inputs to the circuit",
      },
      publicOutputs: {
        type: "array",
        items: { type: "string" },
        description: "Public outputs from the circuit",
      },
      verificationKey: {
        type: "string",
        description: "Reference to verification key",
      },
      metadata: {
        type: "object",
        properties: {
          circuitName: { type: "string" },
          contractAddress: { type: "string" },
          generatedAt: { type: "integer" },
          proverVersion: { type: "string" },
        },
      },
    },
    required: ["proofSystem", "proof", "publicInputs"],
  },
};

/**
 * Get schema content by URI
 */
export function getSchema(uri: string): object | null {
  return EMBEDDED_SCHEMAS[uri] || null;
}

/**
 * List all available schema resources
 */
export function listSchemaResources(): ResourceDefinition[] {
  return schemaResources;
}
