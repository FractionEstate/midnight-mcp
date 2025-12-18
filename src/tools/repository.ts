import { z } from "zod";
import { githubClient, GitHubCommit } from "../pipeline/index.js";
import { logger, DEFAULT_REPOSITORIES } from "../utils/index.js";

// Schema definitions
export const GetFileInputSchema = z.object({
  repo: z
    .string()
    .describe("Repository name (e.g., 'compact', 'midnight-js', 'example-counter')"),
  path: z.string().describe("File path within repository"),
  ref: z.string().optional().describe("Branch, tag, or commit SHA (default: main)"),
});

export const ListExamplesInputSchema = z.object({
  category: z
    .enum(["counter", "bboard", "token", "voting", "all"])
    .optional()
    .default("all")
    .describe("Filter by example type"),
});

export const GetLatestUpdatesInputSchema = z.object({
  since: z
    .string()
    .optional()
    .describe("ISO date to fetch updates from (default: last 7 days)"),
  repos: z
    .array(z.string())
    .optional()
    .describe("Specific repos to check (default: all configured repos)"),
});

export type GetFileInput = z.infer<typeof GetFileInputSchema>;
export type ListExamplesInput = z.infer<typeof ListExamplesInputSchema>;
export type GetLatestUpdatesInput = z.infer<typeof GetLatestUpdatesInputSchema>;

// Repository name mapping
const REPO_ALIASES: Record<string, { owner: string; repo: string }> = {
  compact: { owner: "midnightntwrk", repo: "compact" },
  "midnight-js": { owner: "midnightntwrk", repo: "midnight-js" },
  js: { owner: "midnightntwrk", repo: "midnight-js" },
  sdk: { owner: "midnightntwrk", repo: "midnight-js" },
  "example-counter": { owner: "midnightntwrk", repo: "example-counter" },
  counter: { owner: "midnightntwrk", repo: "example-counter" },
  "example-bboard": { owner: "midnightntwrk", repo: "example-bboard" },
  bboard: { owner: "midnightntwrk", repo: "example-bboard" },
  docs: { owner: "midnightntwrk", repo: "midnight-docs" },
  "midnight-docs": { owner: "midnightntwrk", repo: "midnight-docs" },
};

// Example definitions
interface ExampleDefinition {
  name: string;
  repository: string;
  description: string;
  category: string;
  complexity: "beginner" | "intermediate" | "advanced";
  mainFile: string;
  features: string[];
}

const EXAMPLES: ExampleDefinition[] = [
  {
    name: "Counter",
    repository: "midnightntwrk/example-counter",
    description:
      "Simple counter contract demonstrating basic Compact concepts. Perfect for learning ledger state, circuits, and witnesses.",
    category: "counter",
    complexity: "beginner",
    mainFile: "contract/src/counter.compact",
    features: [
      "Ledger state management",
      "Basic circuit definition",
      "Counter increment/decrement",
      "TypeScript integration",
    ],
  },
  {
    name: "Bulletin Board",
    repository: "midnightntwrk/example-bboard",
    description:
      "Full DApp example with CLI and React UI. Demonstrates posting messages with privacy features.",
    category: "bboard",
    complexity: "intermediate",
    mainFile: "contract/src/bboard.compact",
    features: [
      "Private messaging",
      "React frontend",
      "CLI interface",
      "Wallet integration",
      "Disclose operations",
    ],
  },
];

/**
 * Resolve repository name alias to owner/repo
 */
function resolveRepo(repoName: string): { owner: string; repo: string } | null {
  const normalized = repoName.toLowerCase().replace(/^midnightntwrk\//, "");
  const alias = REPO_ALIASES[normalized];
  if (alias) return alias;

  // Try to find in configured repos
  for (const config of DEFAULT_REPOSITORIES) {
    if (config.repo.toLowerCase() === normalized) {
      return { owner: config.owner, repo: config.repo };
    }
  }

  // Assume it's a full org/repo name
  if (repoName.includes("/")) {
    const [owner, repo] = repoName.split("/");
    return { owner, repo };
  }

  return null;
}

/**
 * Retrieve a specific file from Midnight repositories
 */
export async function getFile(input: GetFileInput) {
  logger.debug("Getting file", { repo: input.repo, path: input.path });

  const repoInfo = resolveRepo(input.repo);
  if (!repoInfo) {
    return {
      error: `Unknown repository: ${input.repo}`,
      suggestion: `Valid repositories: ${Object.keys(REPO_ALIASES).join(", ")}`,
    };
  }

  const file = await githubClient.getFileContent(
    repoInfo.owner,
    repoInfo.repo,
    input.path,
    input.ref
  );

  if (!file) {
    return {
      error: `File not found: ${input.path}`,
      repository: `${repoInfo.owner}/${repoInfo.repo}`,
      suggestion: "Check the file path and try again. Use midnight:list-examples to see available example files.",
    };
  }

  return {
    content: file.content,
    path: file.path,
    repository: `${repoInfo.owner}/${repoInfo.repo}`,
    sha: file.sha,
    size: file.size,
    url: `https://github.com/${repoInfo.owner}/${repoInfo.repo}/blob/${input.ref || "main"}/${file.path}`,
  };
}

/**
 * List available example contracts and DApps
 */
export async function listExamples(input: ListExamplesInput) {
  logger.debug("Listing examples", { category: input.category });

  let filteredExamples = EXAMPLES;
  if (input.category !== "all") {
    filteredExamples = EXAMPLES.filter((e) => e.category === input.category);
  }

  return {
    examples: filteredExamples.map((e) => ({
      name: e.name,
      repository: e.repository,
      description: e.description,
      complexity: e.complexity,
      mainFile: e.mainFile,
      features: e.features,
      githubUrl: `https://github.com/${e.repository}`,
    })),
    totalCount: filteredExamples.length,
    categories: [...new Set(EXAMPLES.map((e) => e.category))],
  };
}

/**
 * Retrieve recent changes across Midnight repositories
 */
export async function getLatestUpdates(input: GetLatestUpdatesInput) {
  logger.debug("Getting latest updates", input);

  // Default to last 7 days
  const since =
    input.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const repos =
    input.repos?.map(resolveRepo).filter(Boolean) ||
    DEFAULT_REPOSITORIES.map((r) => ({ owner: r.owner, repo: r.repo }));

  const updates: Array<{
    repository: string;
    commits: GitHubCommit[];
  }> = [];

  for (const repo of repos) {
    if (!repo) continue;
    const commits = await githubClient.getRecentCommits(
      repo.owner,
      repo.repo,
      since,
      10
    );

    if (commits.length > 0) {
      updates.push({
        repository: `${repo.owner}/${repo.repo}`,
        commits,
      });
    }
  }

  // Sort by most recent commit
  updates.sort((a, b) => {
    const aDate = a.commits[0]?.date || "";
    const bDate = b.commits[0]?.date || "";
    return bDate.localeCompare(aDate);
  });

  // Generate summary
  const totalCommits = updates.reduce((sum, u) => sum + u.commits.length, 0);
  const activeRepos = updates.filter((u) => u.commits.length > 0).length;

  return {
    summary: {
      since,
      totalCommits,
      activeRepositories: activeRepos,
      checkedRepositories: repos.length,
    },
    updates: updates.map((u) => ({
      repository: u.repository,
      commitCount: u.commits.length,
      latestCommit: u.commits[0]
        ? {
            message: u.commits[0].message.split("\n")[0], // First line only
            date: u.commits[0].date,
            author: u.commits[0].author,
            url: u.commits[0].url,
          }
        : null,
      recentCommits: u.commits.slice(0, 5).map((c) => ({
        message: c.message.split("\n")[0],
        date: c.date,
        sha: c.sha.substring(0, 7),
      })),
    })),
  };
}

// Tool definitions for MCP
export const repositoryTools = [
  {
    name: "midnight:get-file",
    description:
      "Retrieve a specific file from Midnight repositories. Use repository aliases like 'compact', 'midnight-js', 'counter', or 'bboard' for convenience.",
    inputSchema: {
      type: "object" as const,
      properties: {
        repo: {
          type: "string",
          description:
            "Repository name (e.g., 'compact', 'midnight-js', 'example-counter')",
        },
        path: {
          type: "string",
          description: "File path within repository",
        },
        ref: {
          type: "string",
          description: "Branch, tag, or commit SHA (default: main)",
        },
      },
      required: ["repo", "path"],
    },
    handler: getFile,
  },
  {
    name: "midnight:list-examples",
    description:
      "List available Midnight example contracts and DApps with descriptions, complexity ratings, and key features.",
    inputSchema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: ["counter", "bboard", "token", "voting", "all"],
          description: "Filter by example type (default: all)",
        },
      },
      required: [],
    },
    handler: listExamples,
  },
  {
    name: "midnight:get-latest-updates",
    description:
      "Retrieve recent changes and commits across Midnight repositories. Useful for staying up-to-date with the latest developments.",
    inputSchema: {
      type: "object" as const,
      properties: {
        since: {
          type: "string",
          description: "ISO date to fetch updates from (default: last 7 days)",
        },
        repos: {
          type: "array",
          items: { type: "string" },
          description: "Specific repos to check (default: all configured repos)",
        },
      },
      required: [],
    },
    handler: getLatestUpdates,
  },
];
