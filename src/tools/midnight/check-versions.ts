/**
 * Midnight Check Versions Tool
 *
 * Compare installed vs latest npm versions for @midnight-ntwrk packages.
 * Supports alpha/beta tracking and provides upgrade commands.
 */

import { z } from "zod"
import {
  STABLE_VERSIONS,
  ALPHA_VERSIONS,
  fetchLatestVersion,
  fetchAllLatestVersions,
  compareVersions,
  getCacheStatus,
  type VersionDiff,
} from "../../providers/versions.js"

export const inputSchema = {
  packages: z
    .array(z.string())
    .optional()
    .describe("Specific packages to check (defaults to all @midnight-ntwrk packages)"),
  include_alpha: z
    .boolean()
    .optional()
    .describe("Include alpha/beta/rc versions in comparison (defaults to false)"),
  refresh: z
    .boolean()
    .optional()
    .describe("Force refresh from npm registry (ignore cache)"),
  format: z
    .enum(["table", "json", "markdown"])
    .optional()
    .describe("Output format (defaults to table)"),
}

export const metadata = {
  name: "midnight_check_versions",
  description: `Check for updates to @midnight-ntwrk npm packages.

Compares installed versions against the latest available on npm.
Supports both stable and alpha/beta version tracking.

Use this tool to:
- Check if dependencies are outdated
- Find available updates for Midnight SDK
- Get upgrade commands
- Track alpha/beta releases for early testing`,
}

type CheckVersionsArgs = {
  packages?: string[]
  include_alpha?: boolean
  refresh?: boolean
  format?: "table" | "json" | "markdown"
}

export async function handler(args: CheckVersionsArgs): Promise<string> {
  const includeAlpha = args.include_alpha ?? false
  const format = args.format ?? "table"
  const packagesToCheck = args.packages ?? Object.keys(STABLE_VERSIONS)

  // Refresh cache if requested
  if (args.refresh) {
    await fetchAllLatestVersions()
  }

  // Collect version info
  const results: VersionDiff[] = []
  const errors: string[] = []

  for (const pkg of packagesToCheck) {
    // Skip alpha packages if not requested
    if (!includeAlpha && ALPHA_VERSIONS[pkg] && !STABLE_VERSIONS[pkg]) {
      continue
    }

    const currentVersion = STABLE_VERSIONS[pkg] || ALPHA_VERSIONS[pkg]
    if (!currentVersion) {
      errors.push(`Unknown package: ${pkg}`)
      continue
    }

    try {
      const latestVersion = await fetchLatestVersion(pkg)
      if (latestVersion) {
        const isAlpha = latestVersion.includes("alpha") ||
          latestVersion.includes("beta") ||
          latestVersion.includes("rc")

        results.push({
          package: pkg,
          current: currentVersion,
          latest: latestVersion,
          isOutdated: currentVersion !== latestVersion,
          isAlpha,
        })
      } else {
        errors.push(`Failed to fetch: ${pkg}`)
      }
    } catch (err) {
      errors.push(`Error checking ${pkg}: ${(err as Error).message}`)
    }
  }

  // Separate outdated and up-to-date
  const outdated = results.filter((r) => r.isOutdated)
  const upToDate = results.filter((r) => !r.isOutdated)
  const alphaUpdates = outdated.filter((r) => r.isAlpha)
  const stableUpdates = outdated.filter((r) => !r.isAlpha)

  // Get cache status
  const cacheStatus = getCacheStatus()

  // Format output
  if (format === "json") {
    return JSON.stringify({
      summary: {
        total: results.length,
        outdated: outdated.length,
        upToDate: upToDate.length,
        stableUpdates: stableUpdates.length,
        alphaUpdates: alphaUpdates.length,
        errors: errors.length,
      },
      cacheStatus: {
        lastUpdated: cacheStatus.lastUpdated?.toISOString() ?? null,
        isPolling: cacheStatus.isPolling,
      },
      outdated,
      upToDate,
      errors,
    }, null, 2)
  }

  // Table or Markdown format
  const lines: string[] = []

  lines.push("# 📦 Midnight Package Version Check\n")

  // Summary
  lines.push("## Summary\n")
  lines.push(`- **Total Packages:** ${results.length}`)
  lines.push(`- **Up to Date:** ${upToDate.length}`)
  lines.push(`- **Outdated:** ${outdated.length}`)
  if (stableUpdates.length > 0) {
    lines.push(`  - Stable updates: ${stableUpdates.length}`)
  }
  if (alphaUpdates.length > 0) {
    lines.push(`  - Alpha/Beta updates: ${alphaUpdates.length}`)
  }
  if (errors.length > 0) {
    lines.push(`- **Errors:** ${errors.length}`)
  }
  lines.push("")

  // Cache info
  if (cacheStatus.lastUpdated) {
    lines.push(`*Cache last updated: ${cacheStatus.lastUpdated.toISOString()}*`)
    lines.push(`*Polling: ${cacheStatus.isPolling ? "Active" : "Inactive"}*\n`)
  }

  // Outdated packages
  if (outdated.length > 0) {
    lines.push("## ⚠️ Outdated Packages\n")

    if (format === "markdown") {
      lines.push("| Package | Current | Latest | Type |")
      lines.push("|---------|---------|--------|------|")
      for (const pkg of outdated) {
        const type = pkg.isAlpha ? "🔬 Alpha/Beta" : "✅ Stable"
        lines.push(`| \`${pkg.package}\` | ${pkg.current} | **${pkg.latest}** | ${type} |`)
      }
    } else {
      // ASCII table
      const maxPkgLen = Math.max(...outdated.map((p) => p.package.length), 7)
      const header = `| ${"Package".padEnd(maxPkgLen)} | Current   | Latest    | Type        |`
      const separator = `|${"".padEnd(maxPkgLen + 2, "-")}|-----------|-----------|-------------|`

      lines.push(header)
      lines.push(separator)
      for (const pkg of outdated) {
        const type = pkg.isAlpha ? "Alpha/Beta" : "Stable"
        lines.push(
          `| ${pkg.package.padEnd(maxPkgLen)} | ${pkg.current.padEnd(9)} | ${pkg.latest.padEnd(9)} | ${type.padEnd(11)} |`
        )
      }
    }
    lines.push("")

    // Upgrade commands
    lines.push("### Upgrade Commands\n")

    if (stableUpdates.length > 0) {
      lines.push("**Stable updates:**")
      lines.push("```bash")
      lines.push("npm install \\")
      for (let i = 0; i < stableUpdates.length; i++) {
        const pkg = stableUpdates[i]
        const suffix = i < stableUpdates.length - 1 ? " \\" : ""
        lines.push(`  ${pkg.package}@${pkg.latest}${suffix}`)
      }
      lines.push("```\n")
    }

    if (includeAlpha && alphaUpdates.length > 0) {
      lines.push("**Alpha/Beta updates (use with caution):**")
      lines.push("```bash")
      lines.push("npm install \\")
      for (let i = 0; i < alphaUpdates.length; i++) {
        const pkg = alphaUpdates[i]
        const suffix = i < alphaUpdates.length - 1 ? " \\" : ""
        lines.push(`  ${pkg.package}@${pkg.latest}${suffix}`)
      }
      lines.push("```\n")
    }
  } else {
    lines.push("## ✅ All Packages Up to Date!\n")
  }

  // Up to date packages (collapsed)
  if (upToDate.length > 0) {
    lines.push("<details>")
    lines.push("<summary>✅ Up to Date Packages (" + upToDate.length + ")</summary>\n")
    for (const pkg of upToDate) {
      lines.push(`- \`${pkg.package}\` @ ${pkg.current}`)
    }
    lines.push("\n</details>\n")
  }

  // Errors
  if (errors.length > 0) {
    lines.push("## ❌ Errors\n")
    for (const err of errors) {
      lines.push(`- ${err}`)
    }
    lines.push("")
  }

  // Alpha packages info
  if (!includeAlpha) {
    lines.push("---")
    lines.push("*💡 Tip: Use `include_alpha: true` to also check alpha/beta versions*")
  }

  return lines.join("\n")
}
