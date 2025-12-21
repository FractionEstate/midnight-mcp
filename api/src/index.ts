import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
  VECTORIZE: VectorizeIndex;
  OPENAI_API_KEY: string;
  ENVIRONMENT: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS - restrict to known origins in production
app.use(
  "*",
  cors({
    origin: "*", // Allow all origins for public API
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    maxAge: 86400, // 24 hours
  })
);

// Health check
app.get("/", (c) => c.json({ status: "ok", service: "midnight-mcp-api" }));

app.get("/health", (c) =>
  c.json({
    status: "healthy",
    environment: c.env.ENVIRONMENT,
    vectorize: !!c.env.VECTORIZE,
  })
);

// Generate embedding using OpenAI
async function getEmbedding(text: string, apiKey: string): Promise<number[]> {
  // Truncate input to prevent abuse (max ~8k tokens)
  const truncatedText = text.slice(0, 8000);

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: truncatedText,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return data.data[0].embedding;
}

// Helper to format search results consistently
function formatResults(
  matches: VectorizeMatches["matches"],
  query: string
): object {
  return {
    results: matches.map((match) => ({
      content: match.metadata?.content || "",
      relevanceScore: match.score,
      source: {
        repository: match.metadata?.repository || "",
        filePath: match.metadata?.filePath || "",
        lines: match.metadata?.startLine
          ? `${match.metadata.startLine}-${match.metadata.endLine}`
          : undefined,
      },
      codeType: match.metadata?.language,
    })),
    query,
    totalResults: matches.length,
  };
}

// Validate and sanitize query
function validateQuery(query: unknown): string | null {
  if (typeof query !== "string") return null;
  const trimmed = query.trim();
  if (trimmed.length === 0 || trimmed.length > 1000) return null;
  return trimmed;
}

// Validate limit
function validateLimit(limit: unknown): number {
  if (typeof limit !== "number") return 10;
  return Math.min(Math.max(1, limit), 50); // Between 1 and 50
}

// Search endpoint
app.post("/v1/search", async (c) => {
  try {
    const body = await c.req.json<{
      query: string;
      limit?: number;
      filter?: { language?: string };
    }>();

    const query = validateQuery(body.query);
    if (!query) {
      return c.json({ error: "query is required (1-1000 chars)" }, 400);
    }

    const limit = validateLimit(body.limit);
    const embedding = await getEmbedding(query, c.env.OPENAI_API_KEY);

    const results = await c.env.VECTORIZE.query(embedding, {
      topK: limit,
      returnMetadata: "all",
      filter: body.filter?.language
        ? { language: body.filter.language }
        : undefined,
    });

    return c.json(formatResults(results.matches, query));
  } catch (error) {
    console.error("Search error:", error);
    return c.json({ error: "Search failed" }, 500);
  }
});

// Search Compact code
app.post("/v1/search/compact", async (c) => {
  try {
    const body = await c.req.json<{ query: string; limit?: number }>();

    const query = validateQuery(body.query);
    if (!query) {
      return c.json({ error: "query is required (1-1000 chars)" }, 400);
    }

    const limit = validateLimit(body.limit);
    const embedding = await getEmbedding(query, c.env.OPENAI_API_KEY);

    const results = await c.env.VECTORIZE.query(embedding, {
      topK: limit,
      returnMetadata: "all",
      filter: { language: "compact" },
    });

    return c.json(formatResults(results.matches, query));
  } catch (error) {
    console.error("Search compact error:", error);
    return c.json({ error: "Search failed" }, 500);
  }
});

// Search TypeScript code
app.post("/v1/search/typescript", async (c) => {
  try {
    const body = await c.req.json<{ query: string; limit?: number }>();

    const query = validateQuery(body.query);
    if (!query) {
      return c.json({ error: "query is required (1-1000 chars)" }, 400);
    }

    const limit = validateLimit(body.limit);
    const embedding = await getEmbedding(query, c.env.OPENAI_API_KEY);

    const results = await c.env.VECTORIZE.query(embedding, {
      topK: limit,
      returnMetadata: "all",
      filter: { language: "typescript" },
    });

    return c.json(formatResults(results.matches, query));
  } catch (error) {
    console.error("Search typescript error:", error);
    return c.json({ error: "Search failed" }, 500);
  }
});

// Search docs
app.post("/v1/search/docs", async (c) => {
  try {
    const body = await c.req.json<{ query: string; limit?: number }>();

    const query = validateQuery(body.query);
    if (!query) {
      return c.json({ error: "query is required (1-1000 chars)" }, 400);
    }

    const limit = validateLimit(body.limit);
    const embedding = await getEmbedding(query, c.env.OPENAI_API_KEY);

    const results = await c.env.VECTORIZE.query(embedding, {
      topK: limit,
      returnMetadata: "all",
      filter: { language: "markdown" },
    });

    return c.json(formatResults(results.matches, query));
  } catch (error) {
    console.error("Search docs error:", error);
    return c.json({ error: "Search failed" }, 500);
  }
});

// Stats endpoint
app.get("/v1/stats", async (c) => {
  return c.json({
    service: "midnight-mcp-api",
    environment: c.env.ENVIRONMENT,
    vectorize: "connected",
  });
});

export default app;
