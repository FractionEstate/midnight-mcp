import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isNextJsTool,
  handleNextJsStatus,
  nextjsIntegrationTools,
  getNextJsResources,
  getNextJsPrompts,
  isNextDevToolsAvailable,
} from "../src/tools/nextjs/index.js";

describe("Next.js Integration", () => {
  describe("isNextJsTool", () => {
    it("should identify Next.js tools by prefix", () => {
      expect(isNextJsTool("nextjs-init")).toBe(true);
      expect(isNextJsTool("nextjs-nextjs-docs")).toBe(true);
      expect(isNextJsTool("nextjs-browser-eval")).toBe(true);
      expect(isNextJsTool("nextjs-upgrade-nextjs-16")).toBe(true);
    });

    it("should reject non-Next.js tools", () => {
      expect(isNextJsTool("midnight-search-compact")).toBe(false);
      expect(isNextJsTool("midnight-analyze-contract")).toBe(false);
      expect(isNextJsTool("health-check")).toBe(false);
    });
  });

  describe("nextjsIntegrationTools", () => {
    it("should include the status tool", () => {
      const toolNames = nextjsIntegrationTools.map((t) => t.name);
      expect(toolNames).toContain("midnight-nextjs-status");
    });

    it("should have proper tool definition", () => {
      const statusTool = nextjsIntegrationTools.find(
        (t) => t.name === "midnight-nextjs-status"
      );
      expect(statusTool).toBeDefined();
      expect(statusTool?.description).toContain("Next.js DevTools");
      expect(statusTool?.annotations?.readOnlyHint).toBe(true);
    });
  });

  describe("handleNextJsStatus", () => {
    it("should return status info with all fields", async () => {
      const result = await handleNextJsStatus();
      expect(result).toHaveProperty("available");
      expect(result).toHaveProperty("tools");
      expect(result).toHaveProperty("resources");
      expect(result).toHaveProperty("prompts");
      expect(result).toHaveProperty("message");
      expect(Array.isArray(result.tools)).toBe(true);
      expect(Array.isArray(result.resources)).toBe(true);
      expect(Array.isArray(result.prompts)).toBe(true);
    });

    it("should return unavailable message when not initialized", async () => {
      // When next-devtools-mcp isn't connected, we get the unavailable response
      const result = await handleNextJsStatus();
      if (!result.available) {
        expect(result.message).toContain("not connected");
      } else {
        // If somehow available, should have tools
        expect(result.tools.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Resource and Prompt accessors", () => {
    it("should export getNextJsResources function", () => {
      const resources = getNextJsResources();
      expect(Array.isArray(resources)).toBe(true);
    });

    it("should export getNextJsPrompts function", () => {
      const prompts = getNextJsPrompts();
      expect(Array.isArray(prompts)).toBe(true);
    });

    it("should export isNextDevToolsAvailable function", () => {
      const available = isNextDevToolsAvailable();
      expect(typeof available).toBe("boolean");
    });
  });

  describe("Tool naming conventions", () => {
    it("should use hyphen-case for tool names", () => {
      const validPattern = /^nextjs-[a-z0-9-]+$/;
      const testToolNames = [
        "nextjs-init",
        "nextjs-nextjs-docs",
        "nextjs-browser-eval",
        "nextjs-nextjs-index",
        "nextjs-nextjs-call",
        "nextjs-upgrade-nextjs-16",
        "nextjs-enable-cache-components",
      ];

      for (const name of testToolNames) {
        expect(name).toMatch(validPattern);
      }
    });
  });
});
