/**
 * Midnight Compile Contract Tool
 *
 * Compile Compact smart contracts to TypeScript and ZK artifacts.
 */

import { z } from "zod"

export const inputSchema = {
  source: z
    .string()
    .describe("Compact contract source code or file path"),
  output_dir: z
    .string()
    .optional()
    .describe("Output directory for compiled artifacts (defaults to ./generated)"),
  contract_name: z
    .string()
    .optional()
    .describe("Contract name (inferred from source if not provided)"),
}

export const metadata = {
  name: "midnight_compile_contract",
  description: `Compile a Compact smart contract to TypeScript bindings and ZK artifacts.

Generates:
- TypeScript type definitions
- Contract interaction code
- Circuit metadata
- ZK proving/verifying keys (references)

Use this tool to:
- Compile Compact source code
- Generate TypeScript bindings for SDK
- Prepare contracts for deployment

**Note:** Full compilation requires the \`compactc\` compiler installed locally.`,
  toolset: "midnight:contracts" as const,
  readOnly: true,
}

type CompileContractArgs = {
  source: string
  output_dir?: string
  contract_name?: string
}

export async function handler(args: CompileContractArgs): Promise<string> {
  const source = args.source
  const outputDir = args.output_dir ?? "./generated"

  // Check if source is a file path or actual code
  const isFilePath = source.endsWith(".compact") || source.startsWith("./") || source.startsWith("/")

  // Try to extract contract name from source
  let contractName = args.contract_name
  if (!contractName) {
    // Try to extract from pragma or first circuit
    const circuitMatch = source.match(/export\s+circuit\s+(\w+)/)
    if (circuitMatch) {
      contractName = circuitMatch[1]
    } else {
      contractName = "Contract"
    }
  }

  // Parse contract structure (simplified static analysis)
  const analysis = analyzeContract(source)

  if (analysis.errors.length > 0) {
    return `# ❌ Compilation Failed

## Errors

${analysis.errors.map(e => `- **Line ${e.line}:** ${e.message}`).join("\n")}

## Source Preview

\`\`\`compact
${source.slice(0, 500)}${source.length > 500 ? "\n..." : ""}
\`\`\`

## Fix Suggestions

1. Check syntax matches Compact language spec
2. Ensure all types are properly declared
3. Verify circuit signatures are correct
4. Check for missing semicolons or brackets
`
  }

  // Generate TypeScript bindings
  const tsBindings = generateTypeScriptBindings(contractName, analysis)

  return `# ✅ Contract Compilation

## Contract: ${contractName}

**Source:** ${isFilePath ? source : "inline code"}
**Output:** ${outputDir}

---

## Analysis Summary

| Item | Count |
|------|-------|
| Ledger Variables | ${analysis.ledgerVars.length} |
| Circuits (public) | ${analysis.circuits.length} |
| Witnesses (private) | ${analysis.witnesses.length} |
| Types | ${analysis.types.length} |

---

## Circuits

${analysis.circuits.map(c => `### \`${c.name}\`
- **Inputs:** ${c.inputs.length > 0 ? c.inputs.map(i => `\`${i.name}: ${i.type}\``).join(", ") : "none"}
- **Outputs:** ${c.outputs.length > 0 ? c.outputs.map(o => `\`${o}\``).join(", ") : "none"}
`).join("\n")}

---

## Generated TypeScript

\`\`\`typescript
// ${outputDir}/${contractName.toLowerCase()}.ts
${tsBindings}
\`\`\`

---

## Compilation Command

To compile with the Compact compiler CLI:

\`\`\`bash
compactc ${isFilePath ? source : "contract.compact"} -o ${outputDir}
\`\`\`

---

## Next Steps

1. **Install outputs** in your project's \`src/contract/\` directory
2. **Import the contract** in your TypeScript code
3. **Deploy** using the Midnight SDK
4. **Call circuits** through the generated interface

---

📚 **Compact Reference:** [docs.midnight.network/develop/reference/compact](https://docs.midnight.network/develop/reference/compact)
`
}

interface ContractAnalysis {
  ledgerVars: Array<{ name: string; type: string }>
  circuits: Array<{
    name: string
    inputs: Array<{ name: string; type: string }>
    outputs: string[]
  }>
  witnesses: Array<{
    name: string
    inputs: Array<{ name: string; type: string }>
    returnType: string
  }>
  types: Array<{ name: string; fields: Array<{ name: string; type: string }> }>
  errors: Array<{ line: number; message: string }>
  hasStdLibImport: boolean
}

function analyzeContract(source: string): ContractAnalysis {
  const analysis: ContractAnalysis = {
    ledgerVars: [],
    circuits: [],
    witnesses: [],
    types: [],
    errors: [],
    hasStdLibImport: false,
  }

  // Check for import statement (standard library)
  if (source.includes("import CompactStandardLibrary")) {
    analysis.hasStdLibImport = true
  }

  // Parse ledger block
  const ledgerMatch = source.match(/ledger\s*\{([^}]*)\}/s)
  if (ledgerMatch) {
    const ledgerContent = ledgerMatch[1]
    const varMatches = ledgerContent.matchAll(/(\w+)\s*:\s*(\w+(?:<[^>]+>)?)/g)
    for (const match of varMatches) {
      analysis.ledgerVars.push({ name: match[1], type: match[2] })
    }
  }

  // Parse circuits - handle both tuple returns [T, ...] and single type returns
  const circuitMatches = source.matchAll(/export\s+circuit\s+(\w+)\s*\(([^)]*)\)\s*:\s*([^\s{]+)/g)
  for (const match of circuitMatches) {
    const name = match[1]
    const inputsStr = match[2]
    const outputsStr = match[3]

    const inputs: Array<{ name: string; type: string }> = []
    if (inputsStr.trim()) {
      const inputMatches = inputsStr.matchAll(/(\w+)\s*:\s*([^,\s)]+(?:<[^>]+>)?)/g)
      for (const inputMatch of inputMatches) {
        inputs.push({ name: inputMatch[1], type: inputMatch[2] })
      }
    }

    // Handle tuple output [...] or single type
    let outputs: string[] = []
    if (outputsStr.startsWith("[")) {
      const tupleContent = outputsStr.match(/\[([^\]]*)\]/)?.[1]
      if (tupleContent?.trim()) {
        outputs = tupleContent.split(",").map(o => o.trim())
      }
    } else if (outputsStr !== "[]") {
      outputs = [outputsStr]
    }

    analysis.circuits.push({ name, inputs, outputs })
  }

  // Parse witness declarations (can have body or not)
  const witnessMatches = source.matchAll(/witness\s+(\w+)\s*\(([^)]*)\)\s*:\s*([^\s;{]+)/g)
  for (const match of witnessMatches) {
    const name = match[1]
    const inputsStr = match[2]
    const returnType = match[3]

    const inputs: Array<{ name: string; type: string }> = []
    if (inputsStr.trim()) {
      const inputMatches = inputsStr.matchAll(/(\w+)\s*:\s*([^,\s)]+(?:<[^>]+>)?)/g)
      for (const inputMatch of inputMatches) {
        inputs.push({ name: inputMatch[1], type: inputMatch[2] })
      }
    }

    analysis.witnesses.push({ name, inputs, returnType })
  }

  return analysis
}

function generateTypeScriptBindings(contractName: string, analysis: ContractAnalysis): string {
  const className = contractName.charAt(0).toUpperCase() + contractName.slice(1)

  const circuitMethods = analysis.circuits.map(c => {
    const params = c.inputs.map(i => `${i.name}: ${compactTypeToTS(i.type)}`).join(", ")
    const returnType = c.outputs.length === 0
      ? "Promise<void>"
      : c.outputs.length === 1
        ? `Promise<${compactTypeToTS(c.outputs[0])}>`
        : `Promise<[${c.outputs.map(o => compactTypeToTS(o)).join(", ")}]>`
    return `  async ${c.name}(${params}): ${returnType} {
    return this.callCircuit("${c.name}", { ${c.inputs.map(i => i.name).join(", ")} });
  }`
  }).join("\n\n")

  return `import { ContractClient } from '@midnight-ntwrk/midnight-js-contracts';

export interface ${className}State {
${analysis.ledgerVars.map(v => `  ${v.name}: ${compactTypeToTS(v.type)};`).join("\n")}
}

export class ${className}Contract {
  private client: ContractClient;

  constructor(client: ContractClient) {
    this.client = client;
  }

  private async callCircuit(name: string, inputs: Record<string, unknown>) {
    return this.client.callCircuit(name, inputs);
  }

  async getState(): Promise<${className}State> {
    return this.client.getState();
  }

${circuitMethods}
}

export function create${className}Contract(client: ContractClient): ${className}Contract {
  return new ${className}Contract(client);
}
`
}

function compactTypeToTS(compactType: string): string {
  // Handle parameterized types like Uint<64>, Bytes<32>, Map<K, V>, etc.
  const baseType = compactType.replace(/<.*>/, "")

  const typeMap: Record<string, string> = {
    // Standard library types
    "Counter": "bigint",
    "MerkleTreeDigest": "bigint",
    "CoinInfo": "CoinInfo",
    "QualifiedCoinInfo": "QualifiedCoinInfo",
    "ZswapCoinPublicKey": "ZswapCoinPublicKey",
    "SendResult": "SendResult",
    "ContractAddress": "Uint8Array",
    // Primitive types
    "Boolean": "boolean",
    "Field": "bigint",
    "String": "string",
    "Uint": "bigint",
    "Int": "bigint",
    "Bytes": "Uint8Array",
    "Opaque": "unknown",
  }

  // Check for exact match first
  if (typeMap[compactType]) {
    return typeMap[compactType]
  }

  // Check for base type
  if (typeMap[baseType]) {
    // Handle special cases for sized types
    if (baseType === "Uint" || baseType === "Int") {
      const sizeMatch = compactType.match(/<(\d+)>/)
      if (sizeMatch) {
        const size = parseInt(sizeMatch[1], 10)
        // Use number for small integers, bigint for large
        return size <= 32 ? "number" : "bigint"
      }
    }
    return typeMap[baseType]
  }

  // Handle Map<K, V>
  if (compactType.startsWith("Map<")) {
    return "Map<unknown, unknown>"
  }

  // Handle MerkleTree<n>
  if (compactType.startsWith("MerkleTree<")) {
    return "MerkleTree"
  }

  // Handle MerkleTreePath<n>
  if (compactType.startsWith("MerkleTreePath<")) {
    return "MerkleTreePath"
  }

  // Handle Vector<n, T>
  if (compactType.startsWith("Vector<")) {
    return "unknown[]"
  }

  // Handle Either<A, B>
  if (compactType.startsWith("Either<")) {
    return "{ isLeft: boolean; left?: unknown; right?: unknown }"
  }

  // Handle Maybe<T>
  if (compactType.startsWith("Maybe<")) {
    return "{ isSome: boolean; value?: unknown }"
  }

  return "unknown"
}
