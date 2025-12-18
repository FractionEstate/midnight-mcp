export { searchTools, searchCompact, searchTypeScript, searchDocs } from "./search.js";
export type { SearchCompactInput, SearchTypeScriptInput, SearchDocsInput } from "./search.js";

export { analyzeTools, analyzeContract, explainCircuit } from "./analyze.js";
export type { AnalyzeContractInput, ExplainCircuitInput } from "./analyze.js";

export { repositoryTools, getFile, listExamples, getLatestUpdates } from "./repository.js";
export type { GetFileInput, ListExamplesInput, GetLatestUpdatesInput } from "./repository.js";

// Combined tool list for MCP server
import { searchTools } from "./search.js";
import { analyzeTools } from "./analyze.js";
import { repositoryTools } from "./repository.js";

export const allTools = [...searchTools, ...analyzeTools, ...repositoryTools];
