#!/usr/bin/env node

/**
 * Repository Indexing Script
 * 
 * Run this script to index all Midnight repositories into the vector database.
 * 
 * Usage:
 *   npm run index                    # Index all repos
 *   npm run index -- --repo compact  # Index specific repo
 */

import { indexAllRepositories, indexRepository } from "../pipeline/index.js";
import { DEFAULT_REPOSITORIES, logger } from "../utils/index.js";
import { vectorStore } from "../db/index.js";

async function main() {
  const args = process.argv.slice(2);
  const repoArg = args.find((a) => a.startsWith("--repo="));
  const specificRepo = repoArg?.split("=")[1];

  logger.info("Starting repository indexing...");

  // Initialize vector store
  try {
    await vectorStore.initialize();
  } catch (error) {
    logger.error("Failed to initialize vector store", { error: String(error) });
    logger.info("Make sure ChromaDB is running: docker run -p 8000:8000 chromadb/chroma");
    process.exit(1);
  }

  if (specificRepo) {
    // Index specific repository
    const repoConfig = DEFAULT_REPOSITORIES.find(
      (r) => r.repo.toLowerCase() === specificRepo.toLowerCase()
    );

    if (!repoConfig) {
      logger.error(`Unknown repository: ${specificRepo}`);
      logger.info(
        `Available repositories: ${DEFAULT_REPOSITORIES.map((r) => r.repo).join(", ")}`
      );
      process.exit(1);
    }

    logger.info(`Indexing repository: ${repoConfig.owner}/${repoConfig.repo}`);
    const result = await indexRepository(repoConfig);
    logger.info("Indexing complete", result);
  } else {
    // Index all repositories
    const stats = await indexAllRepositories();
    logger.info("Full indexing complete", stats);
  }

  // Print statistics
  const dbStats = await vectorStore.getStats();
  logger.info(`Vector store now contains ${dbStats.count} documents`);
}

main().catch((error) => {
  logger.error("Indexing failed", { error: String(error) });
  process.exit(1);
});
