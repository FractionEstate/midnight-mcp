import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
  VECTORIZE: VectorizeIndex;
  OPENAI_API_KEY: string;
  ENVIRONMENT: string;
  METRICS: KVNamespace; // Add KV for metrics storage
};

// In-memory metrics (reset on cold start, persisted to KV periodically)
interface QueryLog {
  query: string;
  endpoint: string;
  timestamp: string;
  resultsCount: number;
  avgScore: number;
  topScore: number;
  language?: string;
}

interface Metrics {
  totalQueries: number;
  queriesByEndpoint: Record<string, number>;
  queriesByLanguage: Record<string, number>;
  avgRelevanceScore: number;
  scoreDistribution: { high: number; medium: number; low: number };
  recentQueries: QueryLog[];
  documentsByRepo: Record<string, number>;
  lastUpdated: string;
}

// Initialize metrics
let metrics: Metrics = {
  totalQueries: 0,
  queriesByEndpoint: {},
  queriesByLanguage: {},
  avgRelevanceScore: 0,
  scoreDistribution: { high: 0, medium: 0, low: 0 },
  recentQueries: [],
  documentsByRepo: {},
  lastUpdated: new Date().toISOString(),
};

// Track a query
function trackQuery(
  query: string,
  endpoint: string,
  matches: VectorizeMatches["matches"],
  language?: string
) {
  const scores = matches.map((m) => m.score);
  const avgScore =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const topScore = scores.length > 0 ? Math.max(...scores) : 0;

  // Update totals
  metrics.totalQueries++;
  metrics.queriesByEndpoint[endpoint] =
    (metrics.queriesByEndpoint[endpoint] || 0) + 1;
  if (language) {
    metrics.queriesByLanguage[language] =
      (metrics.queriesByLanguage[language] || 0) + 1;
  }

  // Update score distribution (high > 0.8, medium 0.5-0.8, low < 0.5)
  if (topScore > 0.8) metrics.scoreDistribution.high++;
  else if (topScore >= 0.5) metrics.scoreDistribution.medium++;
  else metrics.scoreDistribution.low++;

  // Rolling average for relevance score
  metrics.avgRelevanceScore =
    (metrics.avgRelevanceScore * (metrics.totalQueries - 1) + avgScore) /
    metrics.totalQueries;

  // Track repos from results
  matches.forEach((m) => {
    const repo = m.metadata?.repository as string;
    if (repo) {
      metrics.documentsByRepo[repo] = (metrics.documentsByRepo[repo] || 0) + 1;
    }
  });

  // Keep last 100 queries
  const logEntry: QueryLog = {
    query: query.slice(0, 100), // Truncate for storage
    endpoint,
    timestamp: new Date().toISOString(),
    resultsCount: matches.length,
    avgScore: Math.round(avgScore * 1000) / 1000,
    topScore: Math.round(topScore * 1000) / 1000,
    language,
  };
  metrics.recentQueries.unshift(logEntry);
  if (metrics.recentQueries.length > 100) {
    metrics.recentQueries = metrics.recentQueries.slice(0, 100);
  }

  metrics.lastUpdated = new Date().toISOString();
}

// Save metrics to KV (call periodically)
async function persistMetrics(kv: KVNamespace | undefined) {
  if (!kv) return;
  try {
    await kv.put("metrics", JSON.stringify(metrics), {
      expirationTtl: 86400 * 30,
    }); // 30 days
  } catch (e) {
    console.error("Failed to persist metrics:", e);
  }
}

// Load metrics from KV
async function loadMetrics(kv: KVNamespace | undefined) {
  if (!kv) return;
  try {
    const stored = await kv.get("metrics");
    if (stored) {
      metrics = { ...metrics, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Failed to load metrics:", e);
  }
}

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
    await loadMetrics(c.env.METRICS);

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

    // Track query metrics
    trackQuery(query, "search", results.matches, body.filter?.language);
    await persistMetrics(c.env.METRICS);

    return c.json(formatResults(results.matches, query));
  } catch (error) {
    console.error("Search error:", error);
    return c.json({ error: "Search failed" }, 500);
  }
});

// Search Compact code
app.post("/v1/search/compact", async (c) => {
  try {
    await loadMetrics(c.env.METRICS);

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

    // Track query metrics
    trackQuery(query, "compact", results.matches, "compact");
    await persistMetrics(c.env.METRICS);

    return c.json(formatResults(results.matches, query));
  } catch (error) {
    console.error("Search compact error:", error);
    return c.json({ error: "Search failed" }, 500);
  }
});

// Search TypeScript code
app.post("/v1/search/typescript", async (c) => {
  try {
    await loadMetrics(c.env.METRICS);

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

    // Track query metrics
    trackQuery(query, "typescript", results.matches, "typescript");
    await persistMetrics(c.env.METRICS);

    return c.json(formatResults(results.matches, query));
  } catch (error) {
    console.error("Search typescript error:", error);
    return c.json({ error: "Search failed" }, 500);
  }
});

// Search docs
app.post("/v1/search/docs", async (c) => {
  try {
    await loadMetrics(c.env.METRICS);

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

    // Track query metrics
    trackQuery(query, "docs", results.matches, "markdown");
    await persistMetrics(c.env.METRICS);

    return c.json(formatResults(results.matches, query));
  } catch (error) {
    console.error("Search docs error:", error);
    return c.json({ error: "Search failed" }, 500);
  }
});

// Stats endpoint (JSON API)
app.get("/v1/stats", async (c) => {
  await loadMetrics(c.env.METRICS);
  return c.json({
    service: "midnight-mcp-api",
    environment: c.env.ENVIRONMENT,
    vectorize: "connected",
    metrics: {
      totalQueries: metrics.totalQueries,
      avgRelevanceScore: Math.round(metrics.avgRelevanceScore * 1000) / 1000,
      queriesByEndpoint: metrics.queriesByEndpoint,
      queriesByLanguage: metrics.queriesByLanguage,
      scoreDistribution: metrics.scoreDistribution,
      documentHitsByRepo: metrics.documentsByRepo,
      lastUpdated: metrics.lastUpdated,
    },
  });
});

// Recent queries endpoint
app.get("/v1/stats/queries", async (c) => {
  await loadMetrics(c.env.METRICS);
  return c.json({
    recentQueries: metrics.recentQueries,
    total: metrics.totalQueries,
  });
});

// Dashboard HTML page - viewable in browser
app.get("/dashboard", async (c) => {
  await loadMetrics(c.env.METRICS);

  const qualityScore =
    metrics.totalQueries > 0
      ? Math.round(
          (metrics.scoreDistribution.high * 100 +
            metrics.scoreDistribution.medium * 50) /
            metrics.totalQueries
        )
      : 0;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Midnight MCP Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e0e0e0; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #8b5cf6; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .card { background: #1a1a2e; border-radius: 12px; padding: 20px; border: 1px solid #2a2a4e; }
    .card h3 { color: #a78bfa; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
    .stat { font-size: 36px; font-weight: bold; color: #fff; }
    .stat-label { color: #888; font-size: 14px; margin-top: 5px; }
    .bar-chart { margin-top: 10px; }
    .bar { display: flex; align-items: center; margin: 8px 0; }
    .bar-label { width: 100px; font-size: 13px; color: #aaa; }
    .bar-track { flex: 1; height: 24px; background: #2a2a4e; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; background: linear-gradient(90deg, #8b5cf6, #a78bfa); display: flex; align-items: center; justify-content: flex-end; padding-right: 8px; font-size: 12px; min-width: 30px; }
    .quality-meter { display: flex; gap: 10px; margin-top: 15px; }
    .quality-segment { flex: 1; text-align: center; padding: 10px; border-radius: 8px; }
    .quality-segment.high { background: #065f46; }
    .quality-segment.medium { background: #854d0e; }
    .quality-segment.low { background: #7f1d1d; }
    .quality-segment .count { font-size: 24px; font-weight: bold; }
    .quality-segment .label { font-size: 11px; color: #aaa; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #2a2a4e; }
    th { color: #888; font-size: 12px; text-transform: uppercase; }
    td { font-size: 14px; }
    .score { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    .score.high { background: #065f46; color: #34d399; }
    .score.medium { background: #854d0e; color: #fbbf24; }
    .score.low { background: #7f1d1d; color: #f87171; }
    .refresh-btn { background: #8b5cf6; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; }
    .refresh-btn:hover { background: #7c3aed; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 10px; }
    .time { color: #666; font-size: 13px; }
    .empty { color: #666; text-align: center; padding: 40px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌙 Midnight MCP Dashboard</h1>
      <div>
        <span class="time">Last updated: ${metrics.lastUpdated ? new Date(metrics.lastUpdated).toLocaleString() : "Never"}</span>
        <button class="refresh-btn" onclick="location.reload()">Refresh</button>
      </div>
    </div>
    
    ${
      metrics.totalQueries === 0
        ? '<div class="card"><p class="empty">No queries yet. Start using the MCP to see metrics!</p></div>'
        : `
    <div class="grid">
      <div class="card">
        <h3>Total Queries</h3>
        <div class="stat">${metrics.totalQueries.toLocaleString()}</div>
        <div class="stat-label">All time searches</div>
      </div>
      
      <div class="card">
        <h3>Avg Relevance Score</h3>
        <div class="stat">${(metrics.avgRelevanceScore * 100).toFixed(1)}%</div>
        <div class="stat-label">Higher is better (similarity match)</div>
      </div>
      
      <div class="card">
        <h3>Quality Score</h3>
        <div class="stat">${qualityScore}%</div>
        <div class="stat-label">% of queries with good results</div>
      </div>
    </div>
    
    <div class="grid">
      <div class="card">
        <h3>Queries by Endpoint</h3>
        <div class="bar-chart">
          ${
            Object.entries(metrics.queriesByEndpoint).length === 0
              ? '<p class="empty">No data</p>'
              : Object.entries(metrics.queriesByEndpoint)
                  .sort((a, b) => b[1] - a[1])
                  .map(([endpoint, count]) => {
                    const pct =
                      metrics.totalQueries > 0
                        ? (count / metrics.totalQueries) * 100
                        : 0;
                    return (
                      '<div class="bar"><span class="bar-label">' +
                      endpoint +
                      '</span><div class="bar-track"><div class="bar-fill" style="width: ' +
                      pct +
                      '%">' +
                      count +
                      "</div></div></div>"
                    );
                  })
                  .join("")
          }
        </div>
      </div>
      
      <div class="card">
        <h3>Queries by Language</h3>
        <div class="bar-chart">
          ${
            Object.entries(metrics.queriesByLanguage).length === 0
              ? '<p class="empty">No data</p>'
              : Object.entries(metrics.queriesByLanguage)
                  .sort((a, b) => b[1] - a[1])
                  .map(([lang, count]) => {
                    const pct =
                      metrics.totalQueries > 0
                        ? (count / metrics.totalQueries) * 100
                        : 0;
                    return (
                      '<div class="bar"><span class="bar-label">' +
                      lang +
                      '</span><div class="bar-track"><div class="bar-fill" style="width: ' +
                      pct +
                      '%">' +
                      count +
                      "</div></div></div>"
                    );
                  })
                  .join("")
          }
        </div>
      </div>
      
      <div class="card">
        <h3>Result Quality Distribution</h3>
        <div class="quality-meter">
          <div class="quality-segment high">
            <div class="count">${metrics.scoreDistribution.high}</div>
            <div class="label">HIGH (&gt;80%)</div>
          </div>
          <div class="quality-segment medium">
            <div class="count">${metrics.scoreDistribution.medium}</div>
            <div class="label">MEDIUM (50-80%)</div>
          </div>
          <div class="quality-segment low">
            <div class="count">${metrics.scoreDistribution.low}</div>
            <div class="label">LOW (&lt;50%)</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="card">
      <h3>Document Hits by Repository</h3>
      <div class="bar-chart">
        ${
          Object.entries(metrics.documentsByRepo).length === 0
            ? '<p class="empty">No data</p>'
            : Object.entries(metrics.documentsByRepo)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([repo, count]) => {
                  const maxCount = Math.max(
                    ...Object.values(metrics.documentsByRepo)
                  );
                  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    '<div class="bar"><span class="bar-label" style="width: 200px">' +
                    repo +
                    '</span><div class="bar-track"><div class="bar-fill" style="width: ' +
                    pct +
                    '%">' +
                    count +
                    "</div></div></div>"
                  );
                })
                .join("")
        }
      </div>
    </div>
    
    <div class="card" style="margin-top: 20px">
      <h3>Recent Queries (Last 20)</h3>
      <table>
        <thead>
          <tr>
            <th>Query</th>
            <th>Endpoint</th>
            <th>Results</th>
            <th>Top Score</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${metrics.recentQueries
            .slice(0, 20)
            .map(
              (q) =>
                "<tr><td>" +
                q.query +
                "</td><td>" +
                q.endpoint +
                "</td><td>" +
                q.resultsCount +
                '</td><td><span class="score ' +
                (q.topScore > 0.8
                  ? "high"
                  : q.topScore >= 0.5
                    ? "medium"
                    : "low") +
                '">' +
                (q.topScore * 100).toFixed(0) +
                '%</span></td><td style="color: #666">' +
                new Date(q.timestamp).toLocaleString() +
                "</td></tr>"
            )
            .join("")}
        </tbody>
      </table>
    </div>
    `
    }
  </div>
</body>
</html>`;

  return c.html(html);
});

export default app;
