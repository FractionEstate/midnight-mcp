import { githubClient } from "./github.js";
import { parseFile, ParsedFile } from "./parser.js";
import { embeddingGenerator } from "./embeddings.js";
import { vectorStore, CodeDocument } from "../db/vectorStore.js";
import {
  logger,
  DEFAULT_REPOSITORIES,
  RepositoryConfig,
} from "../utils/index.js";

export interface IndexStats {
  totalFiles: number;
  totalChunks: number;
  totalCodeUnits: number;
  repositoriesIndexed: string[];
  lastIndexed: string;
}

export interface ChunkMetadata {
  repository: string;
  filePath: string;
  language: string;
  chunkType: "code_unit" | "file_chunk";
  codeUnitType?: string;
  codeUnitName?: string;
  startLine: number;
  endLine: number;
  isPublic: boolean;
}

/**
 * Create chunks from a parsed file
 * Uses intelligent chunking based on code structure
 */
function createChunks(
  file: ParsedFile,
  repository: string
): Array<{ text: string; metadata: ChunkMetadata }> {
  const chunks: Array<{ text: string; metadata: ChunkMetadata }> = [];

  // Add code units as individual chunks
  for (const unit of file.codeUnits) {
    chunks.push({
      text: unit.code,
      metadata: {
        repository,
        filePath: file.path,
        language: file.language,
        chunkType: "code_unit",
        codeUnitType: unit.type,
        codeUnitName: unit.name,
        startLine: unit.startLine,
        endLine: unit.endLine,
        isPublic: unit.isPublic,
      },
    });
  }

  // If no code units were extracted, chunk the entire file
  if (file.codeUnits.length === 0 && file.content.length > 0) {
    const chunkSize = 2000; // characters
    const overlapLines = 5; // lines to overlap
    const lines = file.content.split("\n");
    let currentChunk = "";
    let startLine = 1;
    let currentLine = 1;

    for (const line of lines) {
      if (
        currentChunk.length + line.length > chunkSize &&
        currentChunk.length > 0
      ) {
        chunks.push({
          text: currentChunk,
          metadata: {
            repository,
            filePath: file.path,
            language: file.language,
            chunkType: "file_chunk",
            startLine,
            endLine: currentLine - 1,
            isPublic: true,
          },
        });

        // Start new chunk with overlap
        const prevLines = currentChunk.split("\n").slice(-overlapLines);
        currentChunk = prevLines.join("\n") + "\n";
        startLine = Math.max(1, currentLine - overlapLines);
      }
      currentChunk += line + "\n";
      currentLine++;
    }

    // Add remaining content
    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk,
        metadata: {
          repository,
          filePath: file.path,
          language: file.language,
          chunkType: "file_chunk",
          startLine,
          endLine: currentLine - 1,
          isPublic: true,
        },
      });
    }
  }

  return chunks;
}

/**
 * Index a single repository
 */
export async function indexRepository(
  repoConfig: RepositoryConfig
): Promise<{ fileCount: number; chunkCount: number }> {
  const repoName = `${repoConfig.owner}/${repoConfig.repo}`;
  logger.info(`Starting index for ${repoName}...`);

  try {
    // Fetch all files from the repository
    const files = await githubClient.fetchRepositoryFiles(repoConfig);
    logger.info(`Fetched ${files.length} files from ${repoName}`);

    let chunkCount = 0;
    const documents: CodeDocument[] = [];

    for (const file of files) {
      // Parse the file
      const parsed = parseFile(file.path, file.content);

      // Create chunks
      const chunks = createChunks(parsed, repoName);

      for (const chunk of chunks) {
        documents.push({
          id: `${repoName}:${file.path}:${chunk.metadata.startLine}`,
          content: chunk.text,
          metadata: {
            repository: chunk.metadata.repository,
            filePath: chunk.metadata.filePath,
            language: chunk.metadata.language,
            startLine: chunk.metadata.startLine,
            endLine: chunk.metadata.endLine,
            codeType: chunk.metadata.codeUnitType || "unknown",
            codeName: chunk.metadata.codeUnitName || "",
            isPublic: chunk.metadata.isPublic,
          },
        });
        chunkCount++;
      }
    }

    // Generate embeddings and store in vector database
    if (documents.length > 0) {
      logger.info(`Generating embeddings for ${documents.length} chunks...`);
      const texts = documents.map((d) => d.content);
      const embeddings = await embeddingGenerator.generateEmbeddings(texts);

      // Add embeddings to documents
      for (let i = 0; i < documents.length; i++) {
        documents[i].embedding = embeddings[i].embedding;
      }

      // Store in vector database
      await vectorStore.addDocuments(documents);
      logger.info(`Stored ${documents.length} documents in vector store`);
    }

    return { fileCount: files.length, chunkCount };
  } catch (error) {
    logger.error(`Failed to index repository ${repoName}`, {
      error: String(error),
    });
    throw error;
  }
}

/**
 * Index all configured repositories
 */
export async function indexAllRepositories(): Promise<IndexStats> {
  logger.info("Starting full index of all repositories...");

  const stats: IndexStats = {
    totalFiles: 0,
    totalChunks: 0,
    totalCodeUnits: 0,
    repositoriesIndexed: [],
    lastIndexed: new Date().toISOString(),
  };

  for (const repoConfig of DEFAULT_REPOSITORIES) {
    try {
      const { fileCount, chunkCount } = await indexRepository(repoConfig);
      stats.totalFiles += fileCount;
      stats.totalChunks += chunkCount;
      stats.repositoriesIndexed.push(`${repoConfig.owner}/${repoConfig.repo}`);
    } catch (error) {
      logger.error(`Failed to index ${repoConfig.owner}/${repoConfig.repo}`, {
        error: String(error),
      });
    }
  }

  logger.info("Indexing complete", stats);
  return stats;
}

/**
 * Incremental update - only index changed files
 */
export async function incrementalUpdate(
  repoConfig: RepositoryConfig,
  since: string
): Promise<{ fileCount: number; chunkCount: number }> {
  const repoName = `${repoConfig.owner}/${repoConfig.repo}`;
  logger.info(`Starting incremental update for ${repoName} since ${since}...`);

  try {
    // Get changed files
    const changedPaths = await githubClient.getChangedFiles(
      repoConfig.owner,
      repoConfig.repo,
      since
    );

    // Filter by patterns
    const filteredPaths = githubClient.filterFilesByPatterns(
      changedPaths,
      repoConfig.patterns,
      repoConfig.exclude
    );

    logger.info(
      `Found ${filteredPaths.length} changed files matching patterns`
    );

    let chunkCount = 0;
    const documents: CodeDocument[] = [];

    for (const filePath of filteredPaths) {
      // Delete existing documents for this file
      await vectorStore.deleteByPath(repoName, filePath);

      // Fetch new content
      const file = await githubClient.getFileContent(
        repoConfig.owner,
        repoConfig.repo,
        filePath,
        repoConfig.branch
      );

      if (file) {
        const parsed = parseFile(file.path, file.content);
        const chunks = createChunks(parsed, repoName);

        for (const chunk of chunks) {
          documents.push({
            id: `${repoName}:${filePath}:${chunk.metadata.startLine}`,
            content: chunk.text,
            metadata: {
              repository: chunk.metadata.repository,
              filePath: chunk.metadata.filePath,
              language: chunk.metadata.language,
              startLine: chunk.metadata.startLine,
              endLine: chunk.metadata.endLine,
              codeType: chunk.metadata.codeUnitType || "unknown",
              codeName: chunk.metadata.codeUnitName || "",
              isPublic: chunk.metadata.isPublic,
            },
          });
          chunkCount++;
        }
      }
    }

    // Generate embeddings and store
    if (documents.length > 0) {
      const texts = documents.map((d) => d.content);
      const embeddings = await embeddingGenerator.generateEmbeddings(texts);

      for (let i = 0; i < documents.length; i++) {
        documents[i].embedding = embeddings[i].embedding;
      }

      await vectorStore.addDocuments(documents);
    }

    return { fileCount: filteredPaths.length, chunkCount };
  } catch (error) {
    logger.error(`Failed incremental update for ${repoName}`, {
      error: String(error),
    });
    throw error;
  }
}
