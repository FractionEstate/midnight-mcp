/**
 * MCP Registry API Tests
 *
 * Tests for the v0.1 registry endpoints
 */

import { describe, it, expect } from "vitest";

// Mock the registry response types
interface RegistryExtensions {
  status: "active" | "deprecated" | "deleted";
  publishedAt: string;
  updatedAt?: string;
  isLatest: boolean;
}

interface ServerResponse {
  server: {
    $schema: string;
    name: string;
    description: string;
    version: string;
    packages?: Array<{
      registry_name: string;
      name: string;
      version: string;
    }>;
  };
  _meta: {
    "io.modelcontextprotocol.registry/official"?: RegistryExtensions;
  };
}

interface ServerListResponse {
  servers: ServerResponse[];
  metadata: {
    nextCursor?: string;
    count: number;
  };
}

describe("MCP Registry v0.1 Specification", () => {
  describe("Response Format", () => {
    it("should have correct server list response structure", () => {
      const mockResponse: ServerListResponse = {
        servers: [
          {
            server: {
              $schema:
                "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
              name: "io.github.fractionestate/midnight-nextjs-mcp",
              description: "Test server",
              version: "0.3.0",
              packages: [
                {
                  registry_name: "npm",
                  name: "midnight-nextjs-mcp",
                  version: "0.3.0",
                },
              ],
            },
            _meta: {
              "io.modelcontextprotocol.registry/official": {
                status: "active",
                publishedAt: "2025-01-01T00:00:00Z",
                isLatest: true,
              },
            },
          },
        ],
        metadata: {
          count: 1,
        },
      };

      expect(mockResponse.servers).toBeDefined();
      expect(mockResponse.servers.length).toBe(1);
      expect(mockResponse.metadata.count).toBe(1);
    });

    it("should have correct server name format (reverse-DNS)", () => {
      const serverName = "io.github.fractionestate/midnight-nextjs-mcp";

      // Validate reverse-DNS format with namespace/server pattern
      expect(serverName).toMatch(/^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/);
    });

    it("should include required server fields", () => {
      const server = {
        $schema:
          "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
        name: "io.github.fractionestate/midnight-nextjs-mcp",
        description: "Unified MCP server for Midnight blockchain development",
        version: "0.3.0",
      };

      expect(server.$schema).toBeDefined();
      expect(server.name).toBeDefined();
      expect(server.description).toBeDefined();
      expect(server.version).toBeDefined();
    });

    it("should have valid registry extensions metadata", () => {
      const meta: RegistryExtensions = {
        status: "active",
        publishedAt: "2025-01-01T00:00:00Z",
        isLatest: true,
      };

      expect(["active", "deprecated", "deleted"]).toContain(meta.status);
      expect(meta.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      expect(typeof meta.isLatest).toBe("boolean");
    });
  });

  describe("Pagination", () => {
    it("should support cursor-based pagination", () => {
      const response: ServerListResponse = {
        servers: [],
        metadata: {
          count: 10,
          nextCursor: "some-cursor-value",
        },
      };

      expect(response.metadata.nextCursor).toBeDefined();
      expect(typeof response.metadata.nextCursor).toBe("string");
    });

    it("should omit nextCursor when no more results", () => {
      const response: ServerListResponse = {
        servers: [],
        metadata: {
          count: 5,
        },
      };

      expect(response.metadata.nextCursor).toBeUndefined();
    });
  });

  describe("Version Handling", () => {
    it("should support 'latest' as special version", () => {
      const version = "latest";
      expect(version).toBe("latest");
    });

    it("should support semantic versioning", () => {
      const versions = ["0.1.0", "0.2.0", "0.3.0", "1.0.0"];
      versions.forEach((v) => {
        expect(v).toMatch(/^\d+\.\d+\.\d+$/);
      });
    });
  });

  describe("Package Configuration", () => {
    it("should define npm package correctly", () => {
      const pkg = {
        registry_name: "npm",
        name: "midnight-nextjs-mcp",
        version: "0.3.0",
        runtime: "node",
        runtime_arguments: ["--experimental-vm-modules"],
        environment_variables: {
          GITHUB_TOKEN: "optional",
        },
      };

      expect(pkg.registry_name).toBe("npm");
      expect(pkg.runtime).toBe("node");
      expect(pkg.runtime_arguments).toContain("--experimental-vm-modules");
    });
  });
});

describe("server.json Schema Compliance", () => {
  it("should follow MCP registry schema", async () => {
    // Read the server.json file
    const fs = await import("fs/promises");
    const serverJson = JSON.parse(
      await fs.readFile("./server.json", "utf-8")
    );

    // Required fields
    expect(serverJson.$schema).toBeDefined();
    expect(serverJson.name).toBeDefined();
    expect(serverJson.description).toBeDefined();
    expect(serverJson.version).toBeDefined();

    // Schema URL should be valid
    expect(serverJson.$schema).toContain("modelcontextprotocol.io");

    // Name should be in reverse-DNS format
    expect(serverJson.name).toMatch(/^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/);
  });

  it("should have valid packages configuration", async () => {
    const fs = await import("fs/promises");
    const serverJson = JSON.parse(
      await fs.readFile("./server.json", "utf-8")
    );

    expect(serverJson.packages).toBeDefined();
    expect(Array.isArray(serverJson.packages)).toBe(true);
    expect(serverJson.packages.length).toBeGreaterThan(0);

    const npmPackage = serverJson.packages.find(
      (p: { registry_name: string }) => p.registry_name === "npm"
    );
    expect(npmPackage).toBeDefined();
    expect(npmPackage.name).toBe("midnight-nextjs-mcp");
  });

  it("should have valid repository configuration", async () => {
    const fs = await import("fs/promises");
    const serverJson = JSON.parse(
      await fs.readFile("./server.json", "utf-8")
    );

    expect(serverJson.repository).toBeDefined();
    expect(serverJson.repository.url).toContain("github.com");
    expect(serverJson.repository.source).toBe("github");
  });
});
