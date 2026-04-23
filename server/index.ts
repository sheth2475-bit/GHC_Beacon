import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);
const isProd = process.env.NODE_ENV === "production";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ── Startup environment validation ─────────────────────────────────────────
if (!process.env.SESSION_SECRET) {
  if (isProd) {
    console.error("FATAL: SESSION_SECRET environment variable must be set in production.");
    process.exit(1);
  } else {
    process.env.SESSION_SECRET = "dev-only-secret-not-for-production";
    console.warn("[startup] SESSION_SECRET not set — using insecure dev default.");
  }
}

if (!process.env.DATABASE_URL) {
  console.error("FATAL: DATABASE_URL environment variable must be set.");
  process.exit(1);
}

app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// ── Request/response logging ───────────────────────────────────────────────
// In production: log only method, path, status, and duration (no response body).
// In development: include truncated response body for debugging.
const SENSITIVE_PATHS = ["/api/auth/login", "/api/auth/register", "/api/auth/me"];
const MAX_LOG_BODY = 400;

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  if (!isProd) {
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (!isProd && capturedJsonResponse && !SENSITIVE_PATHS.includes(path)) {
        const body = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${body.length > MAX_LOG_BODY ? body.slice(0, MAX_LOG_BODY) + "…" : body}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  const { runMigrations } = await import("./migrations");
  await runMigrations().catch(console.error);

  // Seed runs in both dev and production — all functions are idempotent
  // (each checks for existing data before inserting). This ensures:
  //   • Fresh production deployments get demo data and BSC scorecard content
  //   • Subsequent restarts skip already-seeded data automatically
  const { seedDatabase } = await import("./seed");
  await seedDatabase().catch(console.error);

  const { startScheduler } = await import("./scheduler");
  startScheduler();

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (isProd) {
      console.error(`[error] ${status} ${message}`);
    } else {
      console.error("Internal Server Error:", err);
    }

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // Serve static (production) or Vite dev server (development)
  if (isProd) {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
