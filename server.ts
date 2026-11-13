import express from "express";
import path from "path";
import type { ViteDevServer } from "vite";

function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware to parse JSON request bodies
  app.use(express.json());

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Return 404 JSON for unknown API routes
  app.all("/api/*", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  if (process.env.NODE_ENV !== "production") {
    let viteServer: ViteDevServer | null = null;
    const vitePromise = import("vite")
      .then(({ createServer }) =>
        createServer({
          server: { middlewareMode: true, hmr: false },
          appType: "spa",
        })
      )
      .then((server) => {
        viteServer = server;
        return server;
      });

    app.use(async (req, res, next) => {
      try {
        const vite = viteServer ?? (await vitePromise);
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    // Serve static files in production at both '/krhs' (Vite base) and '/'
    const distPath = path.join(process.cwd(), "dist");
    app.use("/krhs", express.static(distPath));
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind port 3000 immediately so cold-start health checks succeed without waiting on Vite pre-bundling
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
