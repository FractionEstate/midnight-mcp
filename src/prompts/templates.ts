export interface PromptDefinition {
  name: string;
  description: string;
  arguments: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

export interface PromptMessage {
  role: "user" | "assistant";
  content: {
    type: "text";
    text: string;
  };
}

// Prompt definitions
export const promptDefinitions: PromptDefinition[] = [
  {
    name: "midnight:create-contract",
    description:
      "Guided prompt for creating new Compact contracts with privacy considerations",
    arguments: [
      {
        name: "contractType",
        description: "Type of contract (token, voting, credential, custom)",
        required: true,
      },
      {
        name: "privacyLevel",
        description: "Required privacy features (full, partial, public)",
        required: false,
      },
      {
        name: "complexity",
        description:
          "Expected complexity level (beginner, intermediate, advanced)",
        required: false,
      },
    ],
  },
  {
    name: "midnight:review-contract",
    description:
      "Security and best practices review prompt for existing contracts",
    arguments: [
      {
        name: "contractCode",
        description: "The Compact contract code to review",
        required: true,
      },
      {
        name: "focusAreas",
        description:
          "Specific areas to emphasize (security, performance, privacy, readability)",
        required: false,
      },
    ],
  },
  {
    name: "midnight:explain-concept",
    description:
      "Educational prompt for explaining Midnight concepts at various levels",
    arguments: [
      {
        name: "concept",
        description:
          "The concept to explain (zk-proofs, circuits, witnesses, ledger, etc.)",
        required: true,
      },
      {
        name: "level",
        description: "Expertise level (beginner, intermediate, advanced)",
        required: false,
      },
    ],
  },
  {
    name: "midnight:compare-approaches",
    description:
      "Compare different implementation approaches for a given problem",
    arguments: [
      {
        name: "problem",
        description: "The problem to solve",
        required: true,
      },
      {
        name: "approaches",
        description: "Specific approaches to compare (comma-separated)",
        required: false,
      },
    ],
  },
  {
    name: "midnight:debug-contract",
    description: "Help debug issues with a Compact contract",
    arguments: [
      {
        name: "contractCode",
        description: "The contract code with issues",
        required: true,
      },
      {
        name: "errorMessage",
        description: "Error message or description of the issue",
        required: false,
      },
    ],
  },
  {
    name: "midnight:nextjs-dapp",
    description:
      "Build a Next.js + Midnight dApp with turbo monorepo structure and best practices",
    arguments: [
      {
        name: "projectName",
        description: "Name of the dApp project",
        required: true,
      },
      {
        name: "features",
        description:
          "Key features (wallet-connect, private-data, token, voting, etc.)",
        required: false,
      },
      {
        name: "monorepoType",
        description: "Monorepo structure (turbo, nx, simple)",
        required: false,
      },
    ],
  },
  // Next.js DevTools Prompts (complementing next-devtools-mcp)
  {
    name: "nextjs:upgrade-to-16",
    description:
      "Guide for upgrading to Next.js 16 with codemods and migration steps",
    arguments: [
      {
        name: "projectPath",
        description: "Path to Next.js project (defaults to current directory)",
        required: false,
      },
      {
        name: "includeReact19",
        description: "Include React 19 migration guidance (yes/no)",
        required: false,
      },
    ],
  },
  {
    name: "nextjs:enable-cache-components",
    description:
      "Migrate and enable Cache Components mode for Next.js 16 with automated error detection",
    arguments: [
      {
        name: "projectPath",
        description: "Path to Next.js project (defaults to current directory)",
        required: false,
      },
      {
        name: "strategy",
        description:
          "Migration strategy (incremental, full-rewrite, route-by-route)",
        required: false,
      },
    ],
  },
  {
    name: "nextjs:runtime-diagnostics",
    description:
      "Diagnose runtime issues in a Next.js 16+ application using MCP endpoint",
    arguments: [
      {
        name: "issueType",
        description:
          "Type of issue (errors, logs, routes, server-actions, all)",
        required: false,
      },
      {
        name: "port",
        description: "Dev server port (default: 3000)",
        required: false,
      },
    ],
  },
];

/**
 * Generate prompt messages based on template and arguments
 */
export function generatePrompt(
  name: string,
  args: Record<string, string>
): PromptMessage[] {
  switch (name) {
    case "midnight:create-contract":
      return generateCreateContractPrompt(args);
    case "midnight:review-contract":
      return generateReviewContractPrompt(args);
    case "midnight:explain-concept":
      return generateExplainConceptPrompt(args);
    case "midnight:compare-approaches":
      return generateCompareApproachesPrompt(args);
    case "midnight:debug-contract":
      return generateDebugContractPrompt(args);
    case "midnight:nextjs-dapp":
      return generateNextJsDappPrompt(args);
    // Next.js DevTools prompts
    case "nextjs:upgrade-to-16":
      return generateNextJsUpgradePrompt(args);
    case "nextjs:enable-cache-components":
      return generateCacheComponentsPrompt(args);
    case "nextjs:runtime-diagnostics":
      return generateRuntimeDiagnosticsPrompt(args);
    default:
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Unknown prompt: ${name}`,
          },
        },
      ];
  }
}

function generateCreateContractPrompt(
  args: Record<string, string>
): PromptMessage[] {
  const contractType = args.contractType || "custom";
  const privacyLevel = args.privacyLevel || "partial";
  const complexity = args.complexity || "intermediate";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: `I want to create a new Midnight Compact smart contract with the following requirements:

**Contract Type:** ${contractType}
**Privacy Level:** ${privacyLevel}
**Complexity:** ${complexity}

## ⚠️ MANDATORY WORKFLOW - Follow these steps IN ORDER:

### Step 1: Get Current Syntax
Call \`midnight-get-latest-syntax\` FIRST to get:
- The \`quickStartTemplate\` (use as your base)
- The \`commonMistakes\` array (avoid these errors)
- Current pragma format: \`pragma language_version >= 0.16 && <= 0.18;\`

### Step 2: Generate Contract
Based on syntax reference, generate the contract using:
- Individual ledger declarations: \`export ledger field: Type;\` (NOT \`ledger { }\` blocks)
- Empty tuple return: \`circuit fn(): []\` (NOT \`Void\`)
- Export enums: \`export enum State { ... }\`
- Wrap witness conditionals: \`if (disclose(witness == value))\`
- Disclose circuit params that touch ledger: \`const d = disclose(param); ledger.insert(d, v);\`
- Cast arithmetic results: \`(a + b) as Uint<64>\`
- Uint to Bytes needs two casts: \`(amount as Field) as Bytes<32>\`

### IMPORTANT: Compact is NOT TypeScript!
- Map.lookup() and Set.member() ARE available in circuits
- No 'function' keyword - use 'circuit' or 'pure circuit'
- No 'void' - use '[]'
- Enum access: \`Choice.rock\` NOT \`Choice::rock\`

### Step 3: Validate Before Returning
Call \`midnight-extract-contract-structure\` with your generated code to check for:
- deprecated_ledger_block
- invalid_void_type
- invalid_pragma_format
- unexported_enum
- deprecated_cell_wrapper

If ANY errors are found, fix them before returning the code to the user.

---

## Contract Requirements

Please help me design and implement this contract. Consider:

1. **State Design**
   - What should be public vs private (shielded)?
   - What data structures are needed?
   - How should state transitions work?

2. **Circuit Design**
   - What circuits (functions) are needed?
   - What inputs/outputs should they have?
   - What constraints and assertions are required?

3. **Witness Functions**
   - What off-chain data is needed?
   - How should private state be accessed?

4. **Privacy Considerations**
   - How to protect user privacy?
   - When to use disclose() vs commit()?
   - How to prevent information leakage?

5. **Security**
   - Access control mechanisms
   - Input validation
   - Protection against common vulnerabilities

Please provide:
- A complete contract implementation
- Explanation of design decisions
- Example usage scenarios
- Any security considerations`,
      },
    },
  ];
}

function generateReviewContractPrompt(
  args: Record<string, string>
): PromptMessage[] {
  const contractCode = args.contractCode || "// No code provided";
  const focusAreas = args.focusAreas || "security, privacy, best practices";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: `Please review this Midnight Compact smart contract:

\`\`\`compact
${contractCode}
\`\`\`

**Focus Areas:** ${focusAreas}

## ⚠️ MANDATORY WORKFLOW:

### Step 1: Validate Syntax
Call \`midnight-extract-contract-structure\` with the contract code to check for:
- deprecated_ledger_block (should use \`export ledger field: Type;\`)
- invalid_void_type (should use \`[]\` not \`Void\`)
- invalid_pragma_format (should use \`>= 0.16 && <= 0.18\`)
- unexported_enum (enums need \`export\`)
- deprecated_cell_wrapper

Report ALL static analysis findings first.

### Step 2: Get Latest Syntax Reference
If syntax errors are found, call \`midnight-get-latest-syntax\` to get:
- The \`commonMistakes\` array showing correct patterns
- Current syntax reference

---

Please analyze:

1. **Static Analysis Results** (from midnight-extract-contract-structure)
   - Syntax errors found
   - Deprecated patterns detected
   - Required fixes

2. **Security Analysis**
   - Input validation
   - Access control
   - State manipulation vulnerabilities
   - Assertion coverage

3. **Privacy Assessment**
   - Proper use of @private state
   - Information leakage risks
   - Correct use of disclose() and commit()
   - Privacy guarantees provided

4. **Best Practices**
   - Code organization
   - Naming conventions
   - Documentation
   - Error messages

5. **Performance**
   - Circuit complexity
   - State access patterns
   - Optimization opportunities

6. **Recommendations**
   - Critical issues to fix (start with P0 syntax errors)
   - Improvements to consider
   - Alternative approaches

Please provide specific line references and code suggestions where applicable.`,
      },
    },
  ];
}

function generateExplainConceptPrompt(
  args: Record<string, string>
): PromptMessage[] {
  const concept = args.concept || "zero-knowledge proofs";
  const level = args.level || "intermediate";

  const levelDescriptions: Record<string, string> = {
    beginner:
      "Explain like I'm new to blockchain and cryptography. Use analogies and avoid jargon.",
    intermediate:
      "I understand blockchain basics and some cryptography. Focus on practical applications.",
    advanced:
      "I have deep technical knowledge. Include implementation details and edge cases.",
  };

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: `Please explain the concept of **${concept}** in the context of Midnight blockchain.

**My Level:** ${level}
${levelDescriptions[level] || levelDescriptions.intermediate}

Please cover:

1. **What it is**
   - Clear definition
   - How it works in Midnight

2. **Why it matters**
   - Benefits and use cases
   - Real-world applications

3. **How to use it**
   - Code examples in Compact
   - Best practices

4. **Common pitfalls**
   - Mistakes to avoid
   - Debugging tips

5. **Further learning**
   - Related concepts
   - Resources for deeper understanding`,
      },
    },
  ];
}

function generateCompareApproachesPrompt(
  args: Record<string, string>
): PromptMessage[] {
  const problem = args.problem || "implementing a token contract";
  const approaches = args.approaches || "";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: `I need to solve the following problem in Midnight:

**Problem:** ${problem}

${approaches ? `**Approaches to compare:** ${approaches}` : "Please suggest different implementation approaches."}

Please compare:

1. **Approach Overview**
   - Brief description of each approach
   - Key differences

2. **Privacy Implications**
   - What data is exposed?
   - Privacy guarantees

3. **Performance**
   - Proof generation time
   - State storage requirements
   - Transaction costs

4. **Security**
   - Attack surface
   - Trust assumptions

5. **Code Complexity**
   - Implementation difficulty
   - Maintenance burden

6. **Recommendation**
   - Best approach for different scenarios
   - Trade-offs to consider

Please include code examples for each approach.`,
      },
    },
  ];
}

function generateDebugContractPrompt(
  args: Record<string, string>
): PromptMessage[] {
  const contractCode = args.contractCode || "// No code provided";
  const errorMessage = args.errorMessage || "Not specified";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: `I'm having issues with this Midnight Compact contract:

\`\`\`compact
${contractCode}
\`\`\`

**Error/Issue:** ${errorMessage}

## ⚠️ MANDATORY WORKFLOW:

### Step 1: Run Static Analysis
Call \`midnight-extract-contract-structure\` FIRST to check for common syntax errors:
- deprecated_ledger_block → should use \`export ledger field: Type;\`
- invalid_void_type → should use \`[]\` not \`Void\`
- invalid_pragma_format → should use \`>= 0.16 && <= 0.18\`
- unexported_enum → enums need \`export\` keyword

### Step 2: Get Correct Syntax
If syntax errors found, call \`midnight-get-latest-syntax\` to get:
- The \`commonMistakes\` array with correct patterns
- Current \`quickStartTemplate\` for reference

### Step 3: Check for Common Compiler Errors
Match error message against known fixes:
- "cannot cast from type Uint<64> to type Bytes<32>" → Use \`(amount as Field) as Bytes<32>\`
- "expected type Uint<64> but received Uint<0..N>" → Cast arithmetic: \`(a + b) as Uint<64>\`
- "potential witness-value disclosure must be declared" → Disclose params: \`const d = disclose(param);\`
- Map.lookup() and Set.member() ARE available in circuits (ignore old advice saying they aren't)

---

Please help me debug by:

1. **Static Analysis Results**
   - Run midnight-extract-contract-structure
   - List all P0 syntax errors found
   - Show the correct syntax for each error

2. **Identifying the Problem**
   - What's causing the error?
   - Which line(s) are problematic?

3. **Explaining Why**
   - Root cause analysis
   - How Compact/ZK constraints work

4. **Providing a Fix**
   - Corrected code (validated against static analysis)
   - Explanation of changes

5. **Preventing Future Issues**
   - Related pitfalls to watch for
   - Testing strategies

6. **Additional Improvements**
   - Code quality suggestions
   - Best practices`,
      },
    },
  ];
}

function generateNextJsDappPrompt(
  args: Record<string, string>
): PromptMessage[] {
  const projectName = args.projectName || "midnight-dapp";
  const features = args.features || "wallet-connect, private-data";
  const monorepoType = args.monorepoType || "turbo";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: `I want to build a Next.js + Midnight dApp with the following specifications:

**Project Name:** ${projectName}
**Key Features:** ${features}
**Monorepo Structure:** ${monorepoType}

## Required Architecture

### Turbo Monorepo Structure
\`\`\`
${projectName}/
├── apps/
│   └── web/                    # Next.js 16+ frontend
│       ├── app/
│       │   ├── layout.tsx      # Root layout with providers
│       │   ├── page.tsx        # Landing page
│       │   └── dapp/           # Protected dApp routes
│       ├── components/
│       │   ├── providers/      # MidnightProvider, WalletProvider
│       │   └── ui/             # shadcn/ui components
│       └── lib/
│           ├── midnight/       # SDK integration
│           └── hooks/          # useWallet, useContract hooks
├── packages/
│   ├── contracts/              # Compact smart contracts
│   │   ├── src/
│   │   │   └── main.compact    # Main contract
│   │   └── package.json
│   ├── shared/                 # Shared types & utilities
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   └── constants.ts
│   │   └── package.json
│   └── ui/                     # Shared UI components
│       └── package.json
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
\`\`\`

## Implementation Requirements

### 1. Midnight SDK Integration (packages/contracts)
- Use \`@midnight-ntwrk/compact-compiler\` for compiling
- Use \`@midnight-ntwrk/midnight-js\` for runtime
- Use \`@midnight-ntwrk/dapp-connector-api\` for wallet

### 2. Next.js 16+ Configuration (apps/web)
- Enable App Router with server components
- Use \`"use client"\` boundary for wallet interactions
- Implement proper Suspense boundaries for async operations
- Configure \`next.config.ts\` with:
  - \`transpilePackages: ["@${projectName}/contracts", "@${projectName}/shared"]\`
  - WebAssembly support for ZK provers

### 3. Wallet Integration Pattern
\`\`\`typescript
// apps/web/lib/midnight/provider.tsx
"use client";

import { DAppConnectorAPI } from "@midnight-ntwrk/dapp-connector-api";
import { createContext, useContext, useEffect, useState } from "react";

interface MidnightContextType {
  connector: DAppConnectorAPI | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const MidnightContext = createContext<MidnightContextType | null>(null);

export function MidnightProvider({ children }: { children: React.ReactNode }) {
  const [connector, setConnector] = useState<DAppConnectorAPI | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = async () => {
    // Connect to Lace wallet via DApp Connector API
    const api = await window.midnight?.enable();
    if (api) {
      setConnector(api);
      setIsConnected(true);
    }
  };

  const disconnect = () => {
    setConnector(null);
    setIsConnected(false);
  };

  return (
    <MidnightContext.Provider value={{ connector, isConnected, connect, disconnect }}>
      {children}
    </MidnightContext.Provider>
  );
}

export const useMidnight = () => {
  const context = useContext(MidnightContext);
  if (!context) throw new Error("useMidnight must be used within MidnightProvider");
  return context;
};
\`\`\`

### 4. Contract Interaction Hook
\`\`\`typescript
// apps/web/lib/midnight/useContract.ts
"use client";

import { useCallback, useState } from "react";
import { useMidnight } from "./provider";

export function useContract<T>(contractAddress: string) {
  const { connector } = useMidnight();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const callCircuit = useCallback(async (
    circuitName: string,
    args: unknown[]
  ): Promise<T | null> => {
    if (!connector) {
      setError(new Error("Wallet not connected"));
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Build and submit transaction
      const result = await connector.submitTransaction({
        contractAddress,
        circuit: circuitName,
        arguments: args,
      });
      return result as T;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [connector, contractAddress]);

  return { callCircuit, loading, error };
}
\`\`\`

## Development Workflow

### Using Both MCP Servers Together
For the best development experience, use **both** MCP servers:
- \`midnight-nextjs-mcp\`: Compact contracts, SDK docs, blockchain integration
- \`next-devtools-mcp\`: Next.js runtime diagnostics, cache components, upgrades

### Key Commands
\`\`\`bash
# Initialize turbo monorepo
pnpm create turbo@latest ${projectName}

# Add Midnight packages
cd packages/contracts
pnpm add @midnight-ntwrk/compact-compiler @midnight-ntwrk/midnight-js

# Add Next.js frontend
cd apps/web
pnpm add @midnight-ntwrk/dapp-connector-api

# Development
pnpm dev              # Run all apps
pnpm build            # Build all packages
pnpm contracts:compile # Compile Compact contracts
\`\`\`

Please provide:
1. Complete turbo.json configuration
2. Full MidnightProvider implementation
3. Contract compilation pipeline setup
4. Example page with wallet connection and contract interaction
5. Testing setup for both contracts and UI`,
      },
    },
  ];
}

/**
 * Generate Next.js 16 upgrade prompt
 */
function generateNextJsUpgradePrompt(
  args: Record<string, string>
): PromptMessage[] {
  const projectPath = args.projectPath || ".";
  const includeReact19 = args.includeReact19 === "yes";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: `I need to upgrade my Next.js application to version 16.

**Project Path:** ${projectPath}
**Include React 19 Migration:** ${includeReact19 ? "Yes" : "No"}

## Upgrade Workflow

### Step 1: Initialize Next.js DevTools
First, call the \`nextjs-init\` tool to set up the MCP context and understand available capabilities.

### Step 2: Run the Upgrade Tool
Call \`nextjs-upgrade-nextjs-16\` with:
- project_path: "${projectPath}"

This will:
1. Run the official Next.js codemod automatically (requires clean git state)
2. Handle async API changes (params, searchParams, cookies, headers)
3. Migrate configuration changes
4. Update image defaults and optimization
5. Fix parallel routes and dynamic segments
6. Handle deprecated API removals
${includeReact19 ? "7. Provide guidance for React 19 compatibility" : ""}

### Step 3: Search Documentation for Issues
If you encounter specific issues, use \`nextjs-nextjs-docs\` to search:
- action: "search"
- query: "<specific issue or API>"

Then fetch full documentation with:
- action: "get"
- path: "<doc path from search results>"

### Step 4: Verify with Browser Testing
Use \`nextjs-browser-eval\` to verify pages work correctly:
1. action: "start" - Start the browser
2. action: "navigate" - Go to your app URL
3. action: "screenshot" - Take screenshots
4. action: "console_messages" - Check for errors

### Step 5: Enable Cache Components (Optional)
For maximum performance, consider enabling Cache Components:
- Call \`nextjs-enable-cache-components\`

## Key Next.js 16 Changes
- Async request APIs (params, searchParams, cookies, headers)
- Cache Components mode for optimal caching
- Built-in MCP endpoint at \`/_next/mcp\`
- Improved runtime diagnostics
- React 19 support

Please guide me through the upgrade process step by step.`,
      },
    },
  ];
}

/**
 * Generate Cache Components migration prompt
 */
function generateCacheComponentsPrompt(
  args: Record<string, string>
): PromptMessage[] {
  const projectPath = args.projectPath || ".";
  const strategy = args.strategy || "incremental";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: `I want to enable and migrate to Cache Components in my Next.js 16 application.

**Project Path:** ${projectPath}
**Migration Strategy:** ${strategy}

## Cache Components Overview

Cache Components is Next.js 16's new caching model that provides:
- Automatic caching at the component level
- Public caches for shared data
- Private caches for user-specific data
- Better cache invalidation
- Improved performance

## Migration Workflow

### Step 1: Initialize Context
Call \`nextjs-init\` to set up proper Next.js DevTools context.

### Step 2: Pre-flight Checks
Call \`nextjs-enable-cache-components\` which will:
1. Check package manager and dependencies
2. Verify Next.js version (must be 16+)
3. Check current configuration

### Step 3: Enable Cache Components
The tool will update your next.config.ts to enable Cache Components:
\`\`\`typescript
const config: NextConfig = {
  experimental: {
    cacheComponents: true,
  },
}
\`\`\`

### Step 4: Start Dev Server with MCP
The tool will start your dev server with MCP enabled to detect errors.

### Step 5: Route Verification
${strategy === "route-by-route" ? "We'll verify each route one at a time." : strategy === "full-rewrite" ? "We'll verify all routes at once." : "We'll verify routes incrementally, starting with the most critical."}

### Step 6: Automated Error Fixing
The tool will detect and fix common issues:
- Missing Suspense boundaries
- Incorrect caching directives
- Static params requirements
- Server/client component mismatches

### Step 7: Final Verification
Run a production build to ensure everything works.

## Key Concepts to Learn
Use \`nextjs-nextjs-docs\` to search for:
- "cache components overview"
- "use cache directive"
- "cache invalidation"
- "suspense boundaries"

## Available Resources
The following knowledge base resources are available:
- \`cache-components://overview\`
- \`cache-components://core-mechanics\`
- \`cache-components://public-caches\`
- \`cache-components://private-caches\`
- \`cache-components://cache-invalidation\`
- \`cache-components://error-patterns\`

Please guide me through enabling Cache Components step by step.`,
      },
    },
  ];
}

/**
 * Generate runtime diagnostics prompt
 */
function generateRuntimeDiagnosticsPrompt(
  args: Record<string, string>
): PromptMessage[] {
  const issueType = args.issueType || "all";
  const port = args.port || "3000";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: `I need to diagnose runtime issues in my Next.js 16+ application.

**Issue Type:** ${issueType}
**Dev Server Port:** ${port}

## Prerequisites
- Next.js 16+ (MCP enabled by default)
- Running dev server: \`npm run dev\`
- MCP endpoint available at \`http://localhost:${port}/_next/mcp\`

## Diagnostic Workflow

### Step 1: Discover Running Servers
Call \`nextjs-nextjs-index\` to:
- Find all running Next.js dev servers
- List available diagnostic tools
- Get server metadata (port, PID, URL)

### Step 2: Run Diagnostics
Based on the issue type "${issueType}", call \`nextjs-nextjs-call\` with:

${issueType === "errors" || issueType === "all" ? `**For Errors:**
\`\`\`json
{ "port": ${port}, "toolName": "get_errors" }
\`\`\`
This returns build, runtime, and type errors.
` : ""}
${issueType === "logs" || issueType === "all" ? `**For Logs:**
\`\`\`json
{ "port": ${port}, "toolName": "get_logs" }
\`\`\`
This returns the path to development log file.
` : ""}
${issueType === "routes" || issueType === "all" ? `**For Routes:**
\`\`\`json
{ "port": ${port}, "toolName": "get_page_metadata" }
\`\`\`
This returns application routes, pages, and component metadata.
` : ""}
${issueType === "server-actions" || issueType === "all" ? `**For Server Actions:**
\`\`\`json
{ "port": ${port}, "toolName": "get_server_action_by_id", "args": { "id": "<action-id>" } }
\`\`\`
Look up Server Actions by ID to find source files.
` : ""}

### Step 3: Get Project Metadata
\`\`\`json
{ "port": ${port}, "toolName": "get_project_metadata" }
\`\`\`
Returns project structure, config, and dev server URL.

### Step 4: Browser Verification (Optional)
If issues persist, use \`nextjs-browser-eval\` to:
1. Navigate to problematic routes
2. Take screenshots
3. Capture console errors
4. Test user interactions

### Step 5: Search Documentation
Use \`nextjs-nextjs-docs\` to search for solutions:
- action: "search"
- query: "<error message or issue description>"

## Available Runtime Tools
- \`get_errors\` - Build, runtime, and type errors
- \`get_logs\` - Development log file path
- \`get_page_metadata\` - Routes and component metadata
- \`get_project_metadata\` - Project structure and config
- \`get_server_action_by_id\` - Server Action source lookup

Please help me diagnose and fix the issues in my application.`,
      },
    },
  ];
}

/**
 * List all available prompts
 */
export function listPrompts(): PromptDefinition[] {
  return promptDefinitions;
}
