export { GitHubClient, githubClient } from "./github.js";
export type { GitHubFile, GitHubCommit, RepositoryInfo } from "./github.js";

export { parseFile, parseCompactFile, parseTypeScriptFile, parseMarkdownFile } from "./parser.js";
export type { ParsedFile, CodeUnit } from "./parser.js";

export { EmbeddingGenerator, embeddingGenerator } from "./embeddings.js";
export type { EmbeddingResult } from "./embeddings.js";

export { indexRepository, indexAllRepositories, incrementalUpdate } from "./indexer.js";
export type { IndexStats } from "./indexer.js";
