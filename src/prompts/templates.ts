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
        description: "Expected complexity level (beginner, intermediate, advanced)",
        required: false,
      },
    ],
  },
  {
    name: "midnight:review-contract",
    description: "Security and best practices review prompt for existing contracts",
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
    description: "Educational prompt for explaining Midnight concepts at various levels",
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
    description: "Compare different implementation approaches for a given problem",
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

Please analyze:

1. **Security Analysis**
   - Input validation
   - Access control
   - State manipulation vulnerabilities
   - Assertion coverage

2. **Privacy Assessment**
   - Proper use of @private state
   - Information leakage risks
   - Correct use of disclose() and commit()
   - Privacy guarantees provided

3. **Best Practices**
   - Code organization
   - Naming conventions
   - Documentation
   - Error messages

4. **Performance**
   - Circuit complexity
   - State access patterns
   - Optimization opportunities

5. **Recommendations**
   - Critical issues to fix
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

Please help me debug by:

1. **Identifying the Problem**
   - What's causing the error?
   - Which line(s) are problematic?

2. **Explaining Why**
   - Root cause analysis
   - How Compact/ZK constraints work

3. **Providing a Fix**
   - Corrected code
   - Explanation of changes

4. **Preventing Future Issues**
   - Related pitfalls to watch for
   - Testing strategies

5. **Additional Improvements**
   - Code quality suggestions
   - Best practices`,
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
