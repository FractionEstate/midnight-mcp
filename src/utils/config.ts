import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const ConfigSchema = z.object({
  // GitHub
  githubToken: z.string().optional(),

  // Vector Database
  chromaUrl: z.string().default("http://localhost:8000"),
  qdrantUrl: z.string().optional(),
  pineconeApiKey: z.string().optional(),
  pineconeIndex: z.string().optional(),

  // Embeddings
  openaiApiKey: z.string().optional(),
  embeddingModel: z.string().default("text-embedding-3-small"),

  // Server
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  syncInterval: z.number().default(900000), // 15 minutes
  port: z.number().default(3000),

  // Data directories
  dataDir: z.string().default("./data"),
  cacheDir: z.string().default("./cache"),
});

export type Config = z.infer<typeof ConfigSchema>;

function loadConfig(): Config {
  const rawConfig = {
    githubToken: process.env.GITHUB_TOKEN,
    chromaUrl: process.env.CHROMA_URL,
    qdrantUrl: process.env.QDRANT_URL,
    pineconeApiKey: process.env.PINECONE_API_KEY,
    pineconeIndex: process.env.PINECONE_INDEX,
    openaiApiKey: process.env.OPENAI_API_KEY,
    embeddingModel: process.env.EMBEDDING_MODEL,
    logLevel: process.env.LOG_LEVEL,
    syncInterval: process.env.SYNC_INTERVAL
      ? parseInt(process.env.SYNC_INTERVAL)
      : undefined,
    port: process.env.PORT ? parseInt(process.env.PORT) : undefined,
    dataDir: process.env.DATA_DIR,
    cacheDir: process.env.CACHE_DIR,
  };

  // Remove undefined values
  const cleanConfig = Object.fromEntries(
    Object.entries(rawConfig).filter(([_, v]) => v !== undefined)
  );

  return ConfigSchema.parse(cleanConfig);
}

export const config = loadConfig();

// Repository configuration
export interface RepositoryConfig {
  owner: string;
  repo: string;
  branch: string;
  patterns: string[];
  exclude: string[];
}

export const DEFAULT_REPOSITORIES: RepositoryConfig[] = [
  {
    owner: "midnightntwrk",
    repo: "compact",
    branch: "main",
    patterns: ["**/*.compact", "**/*.ts", "**/*.md"],
    exclude: ["node_modules/**", "dist/**"],
  },
  {
    owner: "midnightntwrk",
    repo: "midnight-js",
    branch: "main",
    patterns: ["**/*.ts", "**/*.md"],
    exclude: ["node_modules/**", "dist/**"],
  },
  {
    owner: "midnightntwrk",
    repo: "example-counter",
    branch: "main",
    patterns: ["**/*.compact", "**/*.ts", "**/*.md"],
    exclude: ["node_modules/**", "dist/**"],
  },
  {
    owner: "midnightntwrk",
    repo: "example-bboard",
    branch: "main",
    patterns: ["**/*.compact", "**/*.ts", "**/*.tsx", "**/*.md"],
    exclude: ["node_modules/**", "dist/**"],
  },
  {
    owner: "midnightntwrk",
    repo: "midnight-docs",
    branch: "main",
    patterns: ["**/*.md", "**/*.mdx"],
    exclude: ["node_modules/**"],
  },
];
