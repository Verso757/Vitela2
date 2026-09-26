import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Block aggressive AI crawlers and bots that cause high CPU spikes
  const BLOCKED_BOTS = /ClaudeBot|anthropic-ai|GPTBot|ChatGPT-User|CCBot|Bytespider|Amazonbot|FacebookBot|cohere-ai|PerplexityBot/i;
  app.use((req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    if (BLOCKED_BOTS.test(userAgent)) {
      return res.status(403).type('text/plain').send('Access denied for automated crawler.');
    }
    next();
  });

  // Serve robots.txt directly with caching to prevent SPA routing overhead
  app.get('/robots.txt', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.join(process.cwd(), 'public', 'robots.txt'));
  });

  // Serve sitemap.xml directly with caching to prevent SPA routing overhead
  app.get('/sitemap.xml', (req, res) => {
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.join(process.cwd(), 'public', 'sitemap.xml'));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
