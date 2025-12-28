/**
 * Meta handler functions
 * Business logic for meta/discovery MCP tools
 */

import type {
  ExtendedToolDefinition,
  ToolCategory,
} from "../../types/index.js";
import type {
  ListToolCategoriesInput,
  ListCategoryToolsInput,
} from "./schemas.js";
import { CATEGORY_INFO } from "./schemas.js";

// Import all tool arrays to build the index
import { searchTools } from "../search/index.js";
import { analyzeTools } from "../analyze/index.js";
import { repositoryTools } from "../repository/index.js";
import { healthTools } from "../health/index.js";
import { generationTools } from "../generation/index.js";

// Late-bound import for metaTools to avoid circular dependency
let _metaTools: ExtendedToolDefinition[] = [];

/**
 * Set the meta tools reference (called after metaTools is defined)
 */
export function setMetaTools(tools: ExtendedToolDefinition[]): void {
  _metaTools = tools;
}

/**
 * Build tool index by category
 */
function getToolsByCategory(): Map<ToolCategory, ExtendedToolDefinition[]> {
  const allTools = [
    ...searchTools,
    ...analyzeTools,
    ...repositoryTools,
    ...healthTools,
    ...generationTools,
    ..._metaTools,
  ];

  const byCategory = new Map<ToolCategory, ExtendedToolDefinition[]>();

  for (const tool of allTools) {
    const category = tool.annotations?.category || "repository";
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(tool);
  }

  return byCategory;
}

/**
 * List available tool categories
 * Use this first to understand what's available before drilling into specific tools
 */
export async function listToolCategories(_input: ListToolCategoriesInput) {
  const toolsByCategory = getToolsByCategory();

  const categories = Object.entries(CATEGORY_INFO).map(([name, info]) => ({
    name,
    description: info.description,
    toolCount: toolsByCategory.get(name as ToolCategory)?.length || 0,
    useCases: info.useCases,
  }));

  // Filter out empty categories
  const nonEmptyCategories = categories.filter((c) => c.toolCount > 0);

  const totalTools = nonEmptyCategories.reduce(
    (sum, c) => sum + c.toolCount,
    0
  );

  return {
    categories: nonEmptyCategories,
    totalTools,
    recommendation:
      "Start with 'compound' category for efficient multi-step operations, or 'search' to find relevant code.",
    tip: "Use midnight-list-category-tools to see tools within a specific category.",
  };
}

/**
 * List tools within a specific category
 * Progressive disclosure: drill into a category to see its tools
 */
export async function listCategoryTools(input: ListCategoryToolsInput) {
  const toolsByCategory = getToolsByCategory();
  const tools = toolsByCategory.get(input.category) || [];

  if (tools.length === 0) {
    return {
      error: `Unknown or empty category: ${input.category}`,
      availableCategories: Object.keys(CATEGORY_INFO),
      suggestion:
        "Use midnight-list-tool-categories to see available categories.",
    };
  }

  const categoryInfo = CATEGORY_INFO[input.category];

  return {
    category: input.category,
    description: categoryInfo.description,
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description.split("\n")[0], // First line only
      title: t.annotations?.title || t.name,
      isCompound: t.annotations?.category === "compound",
      requiresSampling:
        t.annotations?.longRunningHint &&
        t.annotations?.category === "generation",
      ...(input.includeSchemas && {
        inputSchema: t.inputSchema,
        outputSchema: t.outputSchema,
      }),
    })),
    suggestion: generateCategorySuggestion(input.category),
  };
}

/**
 * Generate helpful suggestion for a category
 */
function generateCategorySuggestion(category: ToolCategory): string {
  switch (category) {
    case "compound":
      return "🚀 Compound tools save 50-70% tokens. Use midnight-upgrade-check or midnight-get-repo-context for efficient operations.";
    case "search":
      return "💡 Search tools use semantic matching - describe what you want in natural language.";
    case "generation":
      return "⚠️ Generation tools require sampling capability. They use the client's LLM for AI-powered operations.";
    case "versioning":
      return "📦 For version checks, prefer midnight-upgrade-check (compound) over individual version tools.";
    case "analyze":
      return "🔍 Analyze tools work on Compact code. Provide the contract source code directly.";
    default:
      return `Use these tools for ${CATEGORY_INFO[category]?.useCases[0] || "related operations"}.`;
  }
}
