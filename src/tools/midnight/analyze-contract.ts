/**
 * Midnight Analyze Contract Tool
 *
 * Static analysis of Compact smart contracts for patterns and best practices.
 */

import { z } from "zod"
import type { ToolsetId } from "../../types/mcp.js"

export const inputSchema = {
  source: z
    .string()
    .describe("Compact contract source code to analyze"),
  check_security: z
    .boolean()
    .optional()
    .describe("Include security analysis (defaults to true)"),
  check_gas: z
    .boolean()
    .optional()
    .describe("Include gas/complexity analysis (defaults to true)"),
}

export const metadata = {
  name: "midnight_analyze_contract",
  description: `Perform static analysis on a Compact smart contract.

Analyzes:
- Contract structure and patterns
- Potential security issues
- Gas/complexity estimates
- Best practice violations
- Privacy considerations

Use this tool to:
- Review contracts before deployment
- Identify potential issues
- Learn Compact best practices
- Optimize contract design`,

  // Enhanced metadata for new patterns
  toolset: "midnight:contracts" as ToolsetId,
  readOnly: true, // This is a read-only analysis tool
  tags: ["contract", "analysis", "security", "audit", "compact"],
}

type AnalyzeContractArgs = {
  source: string
  check_security?: boolean
  check_gas?: boolean
}

interface Finding {
  severity: "error" | "warning" | "info" | "suggestion"
  category: string
  message: string
  line?: number
  suggestion?: string
}

export async function handler(args: AnalyzeContractArgs): Promise<string> {
  const source = args.source
  const checkSecurity = args.check_security ?? true
  const checkGas = args.check_gas ?? true

  const findings: Finding[] = []

  // Basic structure analysis
  analyzeStructure(source, findings)

  // Security analysis
  if (checkSecurity) {
    analyzeSecuurity(source, findings)
  }

  // Gas/complexity analysis
  if (checkGas) {
    analyzeComplexity(source, findings)
  }

  // Best practices
  analyzeBestPractices(source, findings)

  // Privacy analysis
  analyzePrivacy(source, findings)

  // Count by severity
  const errors = findings.filter(f => f.severity === "error")
  const warnings = findings.filter(f => f.severity === "warning")
  const info = findings.filter(f => f.severity === "info")
  const suggestions = findings.filter(f => f.severity === "suggestion")

  const severityEmoji = {
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
    suggestion: "💡",
  }

  const formatFindings = (items: Finding[]) => items.map(f =>
    `${severityEmoji[f.severity]} **${f.category}**${f.line ? ` (line ${f.line})` : ""}\n   ${f.message}${f.suggestion ? `\n   💡 *${f.suggestion}*` : ""}`
  ).join("\n\n")

  return `# 🔍 Contract Analysis

## Summary

| Severity | Count |
|----------|-------|
| ❌ Errors | ${errors.length} |
| ⚠️ Warnings | ${warnings.length} |
| ℹ️ Info | ${info.length} |
| 💡 Suggestions | ${suggestions.length} |

**Overall:** ${errors.length === 0 ? (warnings.length === 0 ? "✅ Looks good!" : "⚠️ Review warnings") : "❌ Fix errors before deploying"}

---

${errors.length > 0 ? `## ❌ Errors

${formatFindings(errors)}

---

` : ""}${warnings.length > 0 ? `## ⚠️ Warnings

${formatFindings(warnings)}

---

` : ""}${info.length > 0 ? `## ℹ️ Information

${formatFindings(info)}

---

` : ""}${suggestions.length > 0 ? `## 💡 Suggestions

${formatFindings(suggestions)}

---

` : ""}
## Analysis Settings

- **Security Analysis:** ${checkSecurity ? "✅ Enabled" : "❌ Disabled"}
- **Gas Analysis:** ${checkGas ? "✅ Enabled" : "❌ Disabled"}

---

📚 **Compact Best Practices:** [docs.midnight.network/develop/reference/compact](https://docs.midnight.network/develop/reference/compact)
`
}

function analyzeStructure(source: string, findings: Finding[]): void {
  // Check for import statement (standard library)
  const hasImport = source.includes("import CompactStandardLibrary") ||
                    source.includes("import ") && source.includes(";")

  if (!hasImport) {
    findings.push({
      severity: "info",
      category: "Structure",
      message: "No import statements found",
      suggestion: "Consider importing CompactStandardLibrary for standard types (Counter, Map, MerkleTree, etc.)",
    })
  }

  // Check for ledger block
  if (!source.includes("ledger {") && !source.includes("ledger{")) {
    findings.push({
      severity: "info",
      category: "Structure",
      message: "No ledger state declared",
      suggestion: "Contracts without ledger state are stateless - ensure this is intentional",
    })
  }

  // Check for at least one exported circuit
  if (!source.includes("export circuit")) {
    findings.push({
      severity: "warning",
      category: "Structure",
      message: "No exported circuits found",
      suggestion: "Add at least one `export circuit` for contract interaction",
    })
  }

  // Check for witness declarations (needed for private computations)
  if (!source.includes("witness ")) {
    findings.push({
      severity: "info",
      category: "Structure",
      message: "No witness functions declared",
      suggestion: "Witness functions enable private computations in TypeScript - consider if needed",
    })
  }
}

function analyzeSecuurity(source: string, findings: Finding[]): void {
  // Check for integer overflow potential
  if (source.includes("+ 1") || source.includes("- 1")) {
    if (!source.includes("assert")) {
      findings.push({
        severity: "warning",
        category: "Security",
        message: "Integer operations without assertions detected",
        suggestion: "Add assertions to prevent overflow/underflow: `assert value > 0;`",
      })
    }
  }

  // Check for missing access control
  const circuits = source.match(/export\s+circuit\s+\w+/g) || []
  const hasAssertions = source.includes("assert")
  if (circuits.length > 2 && !hasAssertions) {
    findings.push({
      severity: "warning",
      category: "Security",
      message: "Multiple circuits without access control assertions",
      suggestion: "Consider adding access control for sensitive operations",
    })
  }

  // Check for hardcoded values
  if (source.match(/=\s*\d{5,}/)) {
    findings.push({
      severity: "info",
      category: "Security",
      message: "Large hardcoded numeric values detected",
      suggestion: "Consider using named constants or type aliases for clarity",
    })
  }

  // Check for proper Field usage in security-critical operations
  if (source.includes("Field") && !source.includes("transientHash") && !source.includes("persistentHash")) {
    findings.push({
      severity: "info",
      category: "Security",
      message: "Field type used without hash functions",
      suggestion: "Use transientHash or persistentHash for cryptographic operations",
    })
  }
}

function analyzeComplexity(source: string, findings: Finding[]): void {
  // Count state variables
  const ledgerMatch = source.match(/ledger\s*\{([^}]*)\}/s)
  if (ledgerMatch) {
    const varCount = (ledgerMatch[1].match(/:/g) || []).length
    if (varCount > 10) {
      findings.push({
        severity: "warning",
        category: "Complexity",
        message: `High number of ledger variables (${varCount})`,
        suggestion: "Consider grouping related state into custom struct types",
      })
    }
  }

  // Count circuits
  const circuitCount = (source.match(/export\s+circuit/g) || []).length
  if (circuitCount > 15) {
    findings.push({
      severity: "info",
      category: "Complexity",
      message: `Many circuits defined (${circuitCount})`,
      suggestion: "Consider splitting into multiple contracts or using modules",
    })
  }

  // Check for nested loops (simplified)
  if (source.includes("for") && source.match(/for[^}]*for/s)) {
    findings.push({
      severity: "warning",
      category: "Complexity",
      message: "Nested loops detected",
      suggestion: "Nested loops significantly increase proof generation time - all loops must be bounded",
    })
  }

  // Check for MerkleTree depth
  const merkleMatch = source.match(/MerkleTree<(\d+)>/g)
  if (merkleMatch) {
    for (const match of merkleMatch) {
      const depth = parseInt(match.match(/\d+/)?.[0] || "0", 10)
      if (depth > 20) {
        findings.push({
          severity: "warning",
          category: "Complexity",
          message: `Large MerkleTree depth (${depth}) may impact proof generation time`,
          suggestion: "Consider if a smaller tree depth would suffice for your use case",
        })
      }
    }
  }
}

function analyzeBestPractices(source: string, findings: Finding[]): void {
  // Check for comments
  if (!source.includes("//") && !source.includes("/*")) {
    findings.push({
      severity: "suggestion",
      category: "Best Practices",
      message: "No comments found in contract",
      suggestion: "Add comments to explain circuit logic and state purpose",
    })
  }

  // Check circuit naming
  const circuits = source.match(/export\s+circuit\s+(\w+)/g) || []
  for (const circuit of circuits) {
    const name = circuit.replace("export circuit ", "")
    if (name.length < 3) {
      findings.push({
        severity: "suggestion",
        category: "Best Practices",
        message: `Short circuit name: \`${name}\``,
        suggestion: "Use descriptive names for circuits (e.g., `transfer_tokens` instead of `tx`)",
      })
    }
  }

  // Check for type aliases (good practice)
  if (!source.includes("type ") && source.includes("Bytes<32>")) {
    findings.push({
      severity: "suggestion",
      category: "Best Practices",
      message: "Using raw Bytes<32> without type alias",
      suggestion: "Consider defining type aliases like `type Address = Bytes<32>;` for clarity",
    })
  }

  // Check for return type documentation
  const circuitsWithOutputs = source.match(/export\s+circuit\s+\w+[^:]+:\s*[^\[\s][^\s{]*/g) || []
  if (circuitsWithOutputs.length > 0 && !source.includes("// Returns") && !source.includes("@returns")) {
    findings.push({
      severity: "suggestion",
      category: "Best Practices",
      message: "Circuit return values not documented",
      suggestion: "Add comments explaining what each circuit returns",
    })
  }
}

function analyzePrivacy(source: string, findings: Finding[]): void {
  // Check for witness usage
  const hasWitnesses = source.includes("witness ")

  if (!hasWitnesses) {
    findings.push({
      severity: "info",
      category: "Privacy",
      message: "Contract uses no witness functions",
      suggestion: "Witness functions run in TypeScript and enable privacy-preserving computations",
    })
  }

  // Check for potential data leaks
  if (hasWitnesses) {
    const witnessOutputsPublic = source.match(/witness[^{]+\{[^}]*return[^}]*ledger\./s)
    if (witnessOutputsPublic) {
      findings.push({
        severity: "warning",
        category: "Privacy",
        message: "Witness may leak private data to ledger",
        suggestion: "Ensure witness outputs are properly anonymized before storing on ledger",
      })
    }
  }

  // Check for address storage in ledger
  if ((source.includes("Bytes<32>") || source.includes("Address")) && source.includes("ledger")) {
    findings.push({
      severity: "info",
      category: "Privacy",
      message: "Address/Bytes<32> stored in ledger state",
      suggestion: "Addresses on ledger are public - use commitments or shielded coins for privacy",
    })
  }

  // Check for shielded coin usage
  if (source.includes("CoinInfo") || source.includes("QualifiedCoinInfo") || source.includes("mintToken") || source.includes("send")) {
    findings.push({
      severity: "info",
      category: "Privacy",
      message: "Using shielded coin operations",
      suggestion: "Good! Shielded coins provide privacy-preserving transfers",
    })
  }

  // Check for MerkleTree usage (privacy pattern)
  if (source.includes("MerkleTree") || source.includes("MerkleTreePath")) {
    findings.push({
      severity: "info",
      category: "Privacy",
      message: "Using MerkleTree for set membership proofs",
      suggestion: "Good! MerkleTree enables privacy-preserving inclusion proofs",
    })
  }
}
