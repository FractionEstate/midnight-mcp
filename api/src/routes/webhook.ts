/**
 * GitHub Webhook Routes
 *
 * Handles incoming GitHub webhook events for push and release events
 * to trigger real-time re-indexing of affected repositories.
 */

/// <reference types="@cloudflare/workers-types" />

import { Hono } from "hono";
import type { Bindings } from "../interfaces";

const webhookRoutes = new Hono<{ Bindings: Bindings }>();

// Priority repositories that should trigger immediate re-indexing
const PRIORITY_REPOS = new Set([
  "compact",
  "midnight-js",
  "midnight-examples",
  "lace-wallet-midnight",
  "midnight-wallet",
  "midnight-node",
]);

// Debounce tracking: repo -> last webhook timestamp
const webhookDebounce = new Map<string, number>();
const DEBOUNCE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Verify GitHub webhook signature using HMAC-SHA256
 * Security: Prevents unauthorized webhook calls
 */
async function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) {
    return false;
  }

  // GitHub sends signature as "sha256=<hex>"
  const sigParts = signature.split("=");
  if (sigParts.length !== 2 || sigParts[0] !== "sha256") {
    return false;
  }

  const expectedSig = sigParts[1];

  // Compute HMAC-SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  // Convert to hex
  const computedSig = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison to prevent timing attacks
  if (computedSig.length !== expectedSig.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < computedSig.length; i++) {
    result |= computedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Check if a repository should trigger re-indexing based on debounce window
 */
function shouldTriggerReindex(repoName: string): boolean {
  const now = Date.now();
  const lastWebhook = webhookDebounce.get(repoName);

  if (lastWebhook && now - lastWebhook < DEBOUNCE_WINDOW_MS) {
    return false; // Within debounce window, skip
  }

  webhookDebounce.set(repoName, now);
  return true;
}

/**
 * Trigger a repository re-index via GitHub Actions workflow_dispatch
 * Uses GitHub API to dispatch the indexing workflow
 */
async function triggerReindex(
  repoName: string,
  eventType: string,
  env: Bindings,
  isPriority: boolean = false
): Promise<{ success: boolean; message: string }> {
  try {
    // Store pending reindex request in KV for tracking
    const pendingKey = `pending-reindex:${repoName}`;
    const pendingData = {
      repository: repoName,
      eventType,
      requestedAt: new Date().toISOString(),
      processed: false,
    };

    await env.METRICS.put(pendingKey, JSON.stringify(pendingData), {
      // Expire after 1 hour if not processed
      expirationTtl: 3600,
    });

    // If we have a GitHub token, trigger the workflow dispatch
    const githubToken = env.GITHUB_TOKEN;
    if (githubToken) {
      // Choose the appropriate workflow based on priority
      const workflowFile = isPriority ? "index-priority.yml" : "index.yml";

      const response = await fetch(
        `https://api.github.com/repos/fractionestate/midnight-nextjs-mcp/actions/workflows/${workflowFile}/dispatches`,
        {
          method: "POST",
          headers: {
            "Accept": "application/vnd.github+json",
            "Authorization": `Bearer ${githubToken}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "midnight-nextjs-mcp-webhook",
          },
          body: JSON.stringify({
            ref: "main",
            inputs: {
              manual_run: "true",
              // Pass the specific repo to index if supported
              target_repo: repoName,
            },
          }),
        }
      );

      if (response.ok || response.status === 204) {
        // Mark as processed
        pendingData.processed = true;
        await env.METRICS.put(pendingKey, JSON.stringify(pendingData), {
          expirationTtl: 3600,
        });

        return {
          success: true,
          message: `Reindex workflow triggered for ${repoName} (trigger: ${eventType})`,
        };
      } else {
        const errorText = await response.text();
        console.error(`GitHub API error: ${response.status} - ${errorText}`);
        return {
          success: true,
          message: `Reindex queued for ${repoName} (workflow trigger failed: ${response.status}, will be picked up by scheduled run)`,
        };
      }
    }

    // No token, just queue for scheduled run
    return {
      success: true,
      message: `Reindex queued for ${repoName} (trigger: ${eventType}, will be processed by next scheduled run)`,
    };
  } catch (error) {
    console.error(`triggerReindex error: ${error}`);
    return {
      success: false,
      message: `Failed to queue reindex: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// Webhook Endpoint
// ============================================================================

/**
 * POST /webhook/github
 *
 * Receives GitHub webhook events for push and release events.
 * Validates signature, checks debounce, and queues re-indexing.
 *
 * Required headers:
 * - X-Hub-Signature-256: HMAC signature for payload verification
 * - X-GitHub-Event: Event type (push, release, etc.)
 */
webhookRoutes.post("/github", async (c) => {
  const webhookSecret = c.env.GITHUB_WEBHOOK_SECRET;

  // Get raw body for signature verification
  const rawBody = await c.req.text();
  const signature = c.req.header("X-Hub-Signature-256");
  const eventType = c.req.header("X-GitHub-Event");

  // Verify signature if secret is configured
  if (webhookSecret) {
    const isValid = await verifyWebhookSignature(
      rawBody,
      signature ?? null,
      webhookSecret
    );

    if (!isValid) {
      console.warn("Webhook signature verification failed");
      return c.json({ error: "Invalid signature" }, 401);
    }
  } else {
    console.warn("GITHUB_WEBHOOK_SECRET not configured, skipping verification");
  }

  // Parse payload
  let payload: {
    repository?: { name?: string; full_name?: string };
    ref?: string;
    release?: { tag_name?: string };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json({ error: "Invalid JSON payload" }, 400);
  }

  const repoName = payload.repository?.name;
  const repoFullName = payload.repository?.full_name;

  if (!repoName) {
    return c.json({ error: "Missing repository name in payload" }, 400);
  }

  // Log the webhook event
  console.log(`Webhook received: ${eventType} for ${repoFullName}`);

  // Handle different event types
  switch (eventType) {
    case "push": {
      // Only process pushes to main/master branch
      const ref = payload.ref;
      if (ref !== "refs/heads/main" && ref !== "refs/heads/master") {
        return c.json({
          status: "ignored",
          reason: "Not a main branch push",
          ref,
        });
      }

      // Check debounce
      if (!shouldTriggerReindex(repoName)) {
        return c.json({
          status: "debounced",
          reason: `Recent webhook for ${repoName}, skipping`,
        });
      }

      // Prioritize important repos
      const isPriority = PRIORITY_REPOS.has(repoName);

      const result = await triggerReindex(repoName, "push", c.env, isPriority);

      return c.json({
        status: result.success ? "queued" : "error",
        message: result.message,
        repository: repoFullName,
        priority: isPriority,
      });
    }

    case "release": {
      const tagName = payload.release?.tag_name;

      // Check debounce
      if (!shouldTriggerReindex(repoName)) {
        return c.json({
          status: "debounced",
          reason: `Recent webhook for ${repoName}, skipping`,
        });
      }

      const result = await triggerReindex(repoName, `release:${tagName}`, c.env, PRIORITY_REPOS.has(repoName));

      return c.json({
        status: result.success ? "queued" : "error",
        message: result.message,
        repository: repoFullName,
        release: tagName,
      });
    }

    case "ping": {
      // GitHub sends ping when webhook is first configured
      return c.json({
        status: "ok",
        message: "Webhook configured successfully",
      });
    }

    default: {
      return c.json({
        status: "ignored",
        reason: `Event type '${eventType}' not handled`,
      });
    }
  }
});

/**
 * GET /webhook/pending
 *
 * List pending reindex requests (for debugging/monitoring)
 */
webhookRoutes.get("/pending", async (c) => {
  try {
    const list = await c.env.METRICS.list({ prefix: "pending-reindex:" });
    const pending = [];

    for (const key of list.keys) {
      const data = await c.env.METRICS.get(key.name);
      if (data) {
        pending.push(JSON.parse(data));
      }
    }

    return c.json({
      count: pending.length,
      pending,
    });
  } catch (error) {
    return c.json(
      {
        error: "Failed to list pending reindex requests",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

export default webhookRoutes;
