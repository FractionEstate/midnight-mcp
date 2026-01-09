/**
 * CLI Validation Tests
 */

import { describe, it, expect } from "vitest"
import {
  validateToolsets,
  validateCliConfig,
  parseCliArgs,
  DEFAULT_CONFIG,
  VALID_TOOLSETS,
} from "../../src/config/cli.js"

describe("CLI Toolset Validation", () => {
  describe("validateToolsets", () => {
    it("should accept valid toolsets", () => {
      const result = validateToolsets(["midnight:network", "nextjs:docs"])

      expect(result.valid).toContain("midnight:network")
      expect(result.valid).toContain("nextjs:docs")
      expect(result.invalid).toHaveLength(0)
    })

    it("should accept special toolsets", () => {
      const result = validateToolsets(["all", "default", "midnight", "nextjs"])

      expect(result.valid).toHaveLength(4)
      expect(result.invalid).toHaveLength(0)
    })

    it("should identify invalid toolsets", () => {
      const result = validateToolsets(["invalid-toolset", "unknown"])

      expect(result.valid).toHaveLength(0)
      expect(result.invalid).toContain("invalid-toolset")
      expect(result.invalid).toContain("unknown")
    })

    it("should provide suggestions for typos", () => {
      const result = validateToolsets(["midnigth:network", "nextj:docs"])

      expect(result.invalid).toContain("midnigth:network")
      expect(result.suggestions.get("midnigth:network")).toContain("midnight:network")
    })

    it("should handle mixed valid and invalid", () => {
      const result = validateToolsets(["midnight:network", "fake", "nextjs:docs"])

      expect(result.valid).toContain("midnight:network")
      expect(result.valid).toContain("nextjs:docs")
      expect(result.invalid).toContain("fake")
    })

    it("should normalize case", () => {
      const result = validateToolsets(["MIDNIGHT:NETWORK", "NextJS:Docs"])

      expect(result.valid).toContain("midnight:network")
      expect(result.valid).toContain("nextjs:docs")
    })
  })

  describe("validateCliConfig", () => {
    it("should validate default config", () => {
      const result = validateCliConfig(DEFAULT_CONFIG)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("should error on invalid toolsets", () => {
      const config = {
        ...DEFAULT_CONFIG,
        enabledToolsets: ["invalid-toolset"],
      }

      const result = validateCliConfig(config)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes("invalid-toolset"))).toBe(true)
    })

    it("should error on small content window", () => {
      const config = {
        ...DEFAULT_CONFIG,
        contentWindowSize: 10,
      }

      const result = validateCliConfig(config)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes("window size"))).toBe(true)
    })

    it("should warn on large content window", () => {
      const config = {
        ...DEFAULT_CONFIG,
        contentWindowSize: 150000,
      }

      const result = validateCliConfig(config)

      expect(result.valid).toBe(true)
      expect(result.warnings.some((w) => w.includes("performance"))).toBe(true)
    })

    it("should warn on fast polling interval", () => {
      const config = {
        ...DEFAULT_CONFIG,
        versionPollingInterval: 30000, // 30 seconds
      }

      const result = validateCliConfig(config)

      expect(result.warnings.some((w) => w.includes("polling"))).toBe(true)
    })
  })

  describe("parseCliArgs", () => {
    it("should parse toolsets flag", () => {
      const { config } = parseCliArgs(["--toolsets", "midnight:network,nextjs:docs"])

      expect(config.enabledToolsets).toContain("midnight:network")
      expect(config.enabledToolsets).toContain("nextjs:docs")
    })

    it("should parse boolean flags", () => {
      const { config } = parseCliArgs(["--read-only", "--dynamic-toolsets"])

      expect(config.readOnly).toBe(true)
      expect(config.dynamicToolsets).toBe(true)
    })

    it("should parse no-midnight flag", () => {
      const { config } = parseCliArgs(["--no-midnight"])

      expect(config.enableMidnight).toBe(false)
    })

    it("should parse help flag", () => {
      const { showHelp } = parseCliArgs(["--help"])

      expect(showHelp).toBe(true)
    })

    it("should parse version flag", () => {
      const { showVersion } = parseCliArgs(["-v"])

      expect(showVersion).toBe(true)
    })
  })

  describe("VALID_TOOLSETS constant", () => {
    it("should include all midnight toolsets", () => {
      expect(VALID_TOOLSETS).toContain("midnight:network")
      expect(VALID_TOOLSETS).toContain("midnight:contract")
      expect(VALID_TOOLSETS).toContain("midnight:dev")
      expect(VALID_TOOLSETS).toContain("midnight:docs")
      expect(VALID_TOOLSETS).toContain("midnight:wallet")
    })

    it("should include all nextjs toolsets", () => {
      expect(VALID_TOOLSETS).toContain("nextjs:docs")
      expect(VALID_TOOLSETS).toContain("nextjs:dev")
      expect(VALID_TOOLSETS).toContain("nextjs:migration")
    })

    it("should include special toolsets", () => {
      expect(VALID_TOOLSETS).toContain("all")
      expect(VALID_TOOLSETS).toContain("default")
    })
  })
})
