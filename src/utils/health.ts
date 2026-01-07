/**
 * Health check utilities for MCP server monitoring
 */

import { githubClient } from "../pipeline/index.js";
import {
  generateFreshnessReport,
  getMostRecentIndexTime,
  formatRelativeTime,
} from "./freshness.js";

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    name: string;
    status: "pass" | "warn" | "fail";
    message?: string;
    latency?: number;
  }[];
  freshness?: {
    lastIndexed: string | null;
    lastIndexedRelative: string | null;
    staleRepositories: number;
    totalRepositories: number;
  };
}

// Track server start time
const startTime = Date.now();

// Get package version
const VERSION = process.env.npm_package_version || "0.3.0";

/**
 * Check if GitHub API is accessible
 */
async function checkGitHubAPI(): Promise<{
  status: "pass" | "warn" | "fail";
  message?: string;
  latency?: number;
}> {
  const start = Date.now();

  try {
    // Try to get rate limit info (lightweight API call)
    const rateLimit = await githubClient.getRateLimit();
    const latency = Date.now() - start;

    if (rateLimit.remaining < 100) {
      return {
        status: "warn",
        message: `Rate limit low: ${rateLimit.remaining}/${rateLimit.limit} remaining`,
        latency,
      };
    }

    return {
      status: "pass",
      message: `Rate limit: ${rateLimit.remaining}/${rateLimit.limit}`,
      latency,
    };
  } catch (error) {
    return {
      status: "fail",
      message: `GitHub API error: ${error instanceof Error ? error.message : String(error)}`,
      latency: Date.now() - start,
    };
  }
}

/**
 * Check if ChromaDB is accessible (optional dependency)
 */
async function checkVectorStore(): Promise<{
  status: "pass" | "warn" | "fail";
  message?: string;
}> {
  try {
    // Import dynamically to handle optional dependency
    const { vectorStore } = await import("../db/index.js");

    // Check if vector store is initialized
    if (vectorStore) {
      return {
        status: "pass",
        message: "Vector store available",
      };
    }

    return {
      status: "warn",
      message: "Vector store not initialized (semantic search unavailable)",
    };
  } catch {
    return {
      status: "warn",
      message: "Vector store not configured (semantic search unavailable)",
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): { status: "pass" | "warn" | "fail"; message: string } {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const percentUsed = Math.round((usage.heapUsed / usage.heapTotal) * 100);

  if (percentUsed > 90) {
    return {
      status: "fail",
      message: `High memory usage: ${heapUsedMB}MB/${heapTotalMB}MB (${percentUsed}%)`,
    };
  }

  if (percentUsed > 75) {
    return {
      status: "warn",
      message: `Elevated memory usage: ${heapUsedMB}MB/${heapTotalMB}MB (${percentUsed}%)`,
    };
  }

  return {
    status: "pass",
    message: `Memory: ${heapUsedMB}MB/${heapTotalMB}MB (${percentUsed}%)`,
  };
}

/**
 * Check data freshness status
 */
function checkFreshness(): {
  status: "pass" | "warn" | "fail";
  message: string;
  details: HealthStatus["freshness"];
} {
  const report = generateFreshnessReport();
  const lastIndexed = getMostRecentIndexTime();

  const details: HealthStatus["freshness"] = {
    lastIndexed: lastIndexed?.toISOString() || null,
    lastIndexedRelative: lastIndexed ? formatRelativeTime(lastIndexed) : null,
    staleRepositories: report.staleRepositories,
    totalRepositories: report.totalRepositories,
  };

  // If no data tracked yet, warn but don't fail
  if (report.totalRepositories === 0) {
    return {
      status: "warn",
      message: "No freshness data available yet",
      details,
    };
  }

  // Check staleness ratio
  const staleRatio = report.staleRepositories / report.totalRepositories;

  if (staleRatio > 0.5) {
    return {
      status: "fail",
      message: `${report.staleRepositories}/${report.totalRepositories} repositories are stale`,
      details,
    };
  }

  if (report.staleRepositories > 0) {
    return {
      status: "warn",
      message: `${report.staleRepositories} repositories may have outdated data`,
      details,
    };
  }

  return {
    status: "pass",
    message: `All ${report.totalRepositories} repositories are fresh`,
    details,
  };
}

/**
 * Perform a full health check
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const checks: HealthStatus["checks"] = [];

  // Run all health checks in parallel
  const [githubCheck, vectorCheck] = await Promise.all([
    checkGitHubAPI(),
    checkVectorStore(),
  ]);

  const memoryCheck = checkMemory();
  const freshnessCheck = checkFreshness();

  checks.push(
    { name: "github_api", ...githubCheck },
    { name: "vector_store", ...vectorCheck },
    { name: "memory", ...memoryCheck },
    { name: "data_freshness", status: freshnessCheck.status, message: freshnessCheck.message }
  );

  // Determine overall status
  const hasFailure = checks.some((c) => c.status === "fail");
  const hasWarning = checks.some((c) => c.status === "warn");

  let status: HealthStatus["status"] = "healthy";
  if (hasFailure) {
    status = "unhealthy";
  } else if (hasWarning) {
    status = "degraded";
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    version: VERSION,
    uptime: Math.round((Date.now() - startTime) / 1000),
    checks,
    freshness: freshnessCheck.details,
  };
}

/**
 * Get a quick health check (no external calls)
 */
export function getQuickHealthStatus(): Omit<HealthStatus, "checks"> & {
  checks: { name: string; status: "pass" }[];
} {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: VERSION,
    uptime: Math.round((Date.now() - startTime) / 1000),
    checks: [{ name: "server", status: "pass" as const }],
  };
}
