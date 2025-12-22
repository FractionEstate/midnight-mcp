/**
 * Dashboard route
 */

import { Hono } from "hono";
import type { Bindings } from "../interfaces";
import { getMetrics, loadMetrics } from "../services";
import { generateDashboardHtml } from "../templates/dashboard";

const dashboardRoute = new Hono<{ Bindings: Bindings }>();

// Password protection middleware
dashboardRoute.use("*", async (c, next) => {
  const password = c.env.DASHBOARD_PASSWORD;
  if (!password) {
    // No password set, allow access (for local dev)
    return next();
  }

  // Check password from query param: /dashboard?p=yourpassword
  const providedPassword = c.req.query("p");
  if (providedPassword !== password) {
    return c.text("Unauthorized. Use ?p=password", 401);
  }

  return next();
});

// Dashboard HTML page - viewable in browser
dashboardRoute.get("/", async (c) => {
  await loadMetrics(c.env.METRICS);
  const metrics = getMetrics();
  const html = generateDashboardHtml(metrics);
  return c.html(html);
});

export default dashboardRoute;
