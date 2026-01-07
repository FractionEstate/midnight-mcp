/**
 * MCP Registry v0.1 API Routes
 *
 * Implements the generic MCP registry specification:
 * - GET /v0.1/servers - List all servers with pagination
 * - GET /v0.1/servers/{serverName}/versions - List all versions of a server
 * - GET /v0.1/servers/{serverName}/versions/{version} - Get specific version (supports 'latest')
 *
 * @see https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/api/generic-registry-api.md
 */

import { Hono } from "hono";
import type { Bindings } from "../interfaces";

const registry = new Hono<{ Bindings: Bindings }>();

/**
 * Registry metadata types following v0.1 spec
 */
interface RegistryExtensions {
  status: "active" | "deprecated" | "deleted";
  publishedAt: string;
  updatedAt?: string;
  isLatest: boolean;
}

interface ResponseMeta {
  "io.modelcontextprotocol.registry/official"?: RegistryExtensions;
}

interface ServerIcon {
  src: string;
  sizes?: string;
  type?: string;
}

interface ServerPackage {
  registry_name: string;
  name: string;
  version: string;
  runtime?: string;
  runtime_arguments?: string[];
  package_arguments?: string[];
  environment_variables?: Record<string, string>;
}

interface ServerRepository {
  url: string;
  source?: string;
  directory?: string;
}

interface ServerTransport {
  type: "http" | "sse" | "stdio";
  url?: string;
  authorization?: {
    type: string;
  };
}

interface ServerJSON {
  $schema: string;
  name: string;
  description: string;
  title?: string;
  repository?: ServerRepository;
  version: string;
  websiteUrl?: string;
  icons?: ServerIcon[];
  packages?: ServerPackage[];
  remotes?: ServerTransport[];
  _meta?: {
    "io.modelcontextprotocol.registry/publisher-provided"?: Record<
      string,
      unknown
    >;
  };
}

interface ServerResponse {
  server: ServerJSON;
  _meta: ResponseMeta;
}

interface ServerListResponse {
  servers: ServerResponse[];
  metadata: {
    nextCursor?: string;
    count: number;
  };
}

/**
 * Midnight MCP server registry data
 * This defines the server versions available in this registry
 */
const MIDNIGHT_MCP_SERVERS: ServerResponse[] = [
  {
    server: {
      $schema:
        "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
      name: "io.github.fractionestate/midnight-nextjs-mcp",
      title: "Midnight + Next.js MCP",
      description:
        "Unified MCP server for Midnight blockchain development and Next.js dApps. Provides semantic search across Compact contracts, TypeScript SDK, documentation, and full Next.js DevTools integration.",
      version: "0.3.0",
      websiteUrl: "https://github.com/FractionEstate/midnight-nextjs-mcp",
      repository: {
        url: "https://github.com/FractionEstate/midnight-nextjs-mcp",
        source: "github",
        directory: "/",
      },
      icons: [
        {
          src: "https://raw.githubusercontent.com/FractionEstate/midnight-nextjs-mcp/main/docs/icon.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
      packages: [
        {
          registry_name: "npm",
          name: "midnight-nextjs-mcp",
          version: "0.3.0",
          runtime: "node",
          runtime_arguments: ["--experimental-vm-modules"],
          package_arguments: [],
          environment_variables: {
            GITHUB_TOKEN: "optional - increases GitHub API rate limits",
            LOG_LEVEL: "info",
          },
        },
      ],
      remotes: [
        {
          type: "stdio",
        },
      ],
      _meta: {
        "io.modelcontextprotocol.registry/publisher-provided": {
          categories: ["blockchain", "web-development", "ai-coding"],
          keywords: [
            "midnight",
            "blockchain",
            "zk-proofs",
            "compact",
            "nextjs",
            "react",
            "turbo",
            "monorepo",
            "dapp",
            "web3",
          ],
          capabilities: {
            tools: 30,
            resources: 35,
            prompts: 9,
          },
          integrations: ["next-devtools-mcp"],
        },
      },
    },
    _meta: {
      "io.modelcontextprotocol.registry/official": {
        status: "active",
        publishedAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-07T00:00:00Z",
        isLatest: true,
      },
    },
  },
  // Previous version for versioning support
  {
    server: {
      $schema:
        "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
      name: "io.github.fractionestate/midnight-nextjs-mcp",
      title: "Midnight + Next.js MCP",
      description:
        "Unified MCP server for Midnight blockchain development and Next.js dApps.",
      version: "0.2.0",
      websiteUrl: "https://github.com/FractionEstate/midnight-nextjs-mcp",
      repository: {
        url: "https://github.com/FractionEstate/midnight-nextjs-mcp",
        source: "github",
      },
      packages: [
        {
          registry_name: "npm",
          name: "midnight-nextjs-mcp",
          version: "0.2.0",
          runtime: "node",
        },
      ],
    },
    _meta: {
      "io.modelcontextprotocol.registry/official": {
        status: "active",
        publishedAt: "2024-12-15T00:00:00Z",
        isLatest: false,
      },
    },
  },
];

/**
 * GET /v0.1/servers
 * List all MCP servers with pagination
 */
registry.get("/servers", async (c) => {
  const cursor = c.req.query("cursor");
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);

  // Get unique latest versions only for list endpoint
  const latestServers = MIDNIGHT_MCP_SERVERS.filter(
    (s) => s._meta["io.modelcontextprotocol.registry/official"]?.isLatest
  );

  // Simple cursor-based pagination (by index for this small dataset)
  let startIndex = 0;
  if (cursor) {
    startIndex = parseInt(cursor, 10) || 0;
  }

  const paginatedServers = latestServers.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < latestServers.length;

  const response: ServerListResponse = {
    servers: paginatedServers,
    metadata: {
      count: paginatedServers.length,
      ...(hasMore && { nextCursor: String(startIndex + limit) }),
    },
  };

  return c.json(response);
});

/**
 * GET /v0.1/servers/:serverName/versions
 * List all versions of a specific server
 */
registry.get("/servers/:serverName/versions", async (c) => {
  const serverName = decodeURIComponent(c.req.param("serverName"));

  const serverVersions = MIDNIGHT_MCP_SERVERS.filter(
    (s) => s.server.name === serverName
  );

  if (serverVersions.length === 0) {
    return c.json(
      {
        error: "Server not found",
        message: `No server found with name: ${serverName}`,
        available: MIDNIGHT_MCP_SERVERS.map((s) => s.server.name).filter(
          (v, i, a) => a.indexOf(v) === i
        ),
      },
      404
    );
  }

  const response: ServerListResponse = {
    servers: serverVersions,
    metadata: {
      count: serverVersions.length,
    },
  };

  return c.json(response);
});

/**
 * GET /v0.1/servers/:serverName/versions/:version
 * Get specific version of server (supports 'latest' as version)
 */
registry.get("/servers/:serverName/versions/:version", async (c) => {
  const serverName = decodeURIComponent(c.req.param("serverName"));
  const version = decodeURIComponent(c.req.param("version"));

  let server: ServerResponse | undefined;

  if (version === "latest") {
    // Find latest version
    server = MIDNIGHT_MCP_SERVERS.find(
      (s) =>
        s.server.name === serverName &&
        s._meta["io.modelcontextprotocol.registry/official"]?.isLatest
    );
  } else {
    // Find specific version
    server = MIDNIGHT_MCP_SERVERS.find(
      (s) => s.server.name === serverName && s.server.version === version
    );
  }

  if (!server) {
    const availableVersions = MIDNIGHT_MCP_SERVERS.filter(
      (s) => s.server.name === serverName
    ).map((s) => s.server.version);

    if (availableVersions.length === 0) {
      return c.json(
        {
          error: "Server not found",
          message: `No server found with name: ${serverName}`,
        },
        404
      );
    }

    return c.json(
      {
        error: "Version not found",
        message: `Version '${version}' not found for server: ${serverName}`,
        availableVersions,
      },
      404
    );
  }

  return c.json(server);
});

/**
 * GET /v0.1 - Registry info endpoint
 */
registry.get("/", async (c) => {
  return c.json({
    name: "Midnight MCP Registry",
    version: "0.1.0",
    description:
      "MCP Registry for Midnight blockchain and Next.js development servers",
    specification: "https://modelcontextprotocol.io",
    endpoints: {
      listServers: "GET /v0.1/servers",
      listVersions: "GET /v0.1/servers/{serverName}/versions",
      getVersion: "GET /v0.1/servers/{serverName}/versions/{version}",
      getLatest: "GET /v0.1/servers/{serverName}/versions/latest",
    },
    servers: {
      count: MIDNIGHT_MCP_SERVERS.filter(
        (s) => s._meta["io.modelcontextprotocol.registry/official"]?.isLatest
      ).length,
      names: [
        ...new Set(MIDNIGHT_MCP_SERVERS.map((s) => s.server.name)),
      ],
    },
  });
});

export default registry;
