import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Readable } from "stream";
import https from "https";
import http from "http";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Prevent server crashes from unhandled socket errors (like EPIPE)
process.on('uncaughtException', (err: any) => {
  if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
    console.warn('[Server] Ignored uncaught socket error:', err.message);
    return;
  }
  console.error('[Server] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  const PORT = 3000;

  // Middleware for SharedArrayBuffer (Required for N64/PSX emulators)
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // --- IN-MEMORY DATABASES (For AI Cache & Community Tips) ---
  const aiTipsCache: Record<string, string> = {}; 
  const communityTips: Record<string, { id: string, user: string, content: string, upvotes: number }[]> = {};
  const gameCheats: Record<string, string> = {}; 

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // --- ROM FETCHING ENDPOINT ---
  const CACHE_DIR = path.join(process.cwd(), '.rom-cache');
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  // --- ROM FETCHING ENDPOINT (CONSOLIDATED) ---
  app.get("/api/rom", (req, res) => {
    const { url } = req.query;
    res.redirect(`/api/tunnel?url=${encodeURIComponent(url as string)}`);
  });

  app.get("/api/tips/ai/:gameId", (req, res) => {
    const { gameId } = req.params;
    if (aiTipsCache[gameId]) {
      return res.json({ cached: true, content: aiTipsCache[gameId] });
    }
    res.json({ cached: false, content: null });
  });

  app.post("/api/tips/ai/:gameId", (req, res) => {
    const { gameId } = req.params;
    const { content } = req.body;
    if (content) {
      aiTipsCache[gameId] = content;
      return res.json({ success: true });
    }
    res.status(400).json({ error: "Missing content" });
  });

  app.get("/api/tips/community/:gameId", (req, res) => {
    const { gameId } = req.params;
    const tips = communityTips[gameId] || [];
    tips.sort((a, b) => b.upvotes - a.upvotes);
    res.json({ tips });
  });

  app.post("/api/tips/community/:gameId", (req, res) => {
    const { gameId } = req.params;
    const { user, content } = req.body;
    if (!user || !content) return res.status(400).json({ error: "Missing user or content" });
    
    if (!communityTips[gameId]) communityTips[gameId] = [];
    
    const newTip = {
      id: Math.random().toString(36).substring(2, 11),
      user,
      content,
      upvotes: 0
    };
    
    communityTips[gameId].push(newTip);
    res.json({ success: true, tip: newTip });
  });

  app.post("/api/tips/community/:gameId/:tipId/upvote", (req, res) => {
    const { gameId, tipId } = req.params;
    const tips = communityTips[gameId];
    if (tips) {
      const tip = tips.find(t => t.id === tipId);
      if (tip) {
        tip.upvotes += 1;
        return res.json({ success: true, upvotes: tip.upvotes });
      }
    }
    res.status(404).json({ error: "Tip not found" });
  });

  app.get("/api/cheats/:gameId", (req, res) => {
    const { gameId } = req.params;
    if (gameCheats[gameId]) {
      return res.json({ found: true, content: gameCheats[gameId] });
    }
    res.json({ found: false, content: null });
  });

  // --- SENTINEL TELEMETRY ENDPOINT ---
  app.post("/api/sentinel/report", (req, res) => {
    const report = req.body;
    const timestamp = new Date().toISOString();
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    console.log(`[Sentinel Report] [${timestamp}] [IP: ${clientIp}]`, JSON.stringify(report));
    
    // In a real production environment, we would save this to a database (e.g. Supabase)
    // or send it to an external monitoring service like Sentry or Datadog.
    res.status(202).json({ status: "received" });
  });

  // Tunnel Route for Archive.org Metadata & ROMs
  app.get("/api/tunnel", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    const allowedDomains = ['archive.org', 'raw.githubusercontent.com', 'cdn.jsdelivr.net', 'myrient.erista.me', 'github.com', 'wsrv.nl'];
    try {
      const parsedTarget = new URL(url.startsWith('//') ? 'https:' + url : (url.startsWith('http') ? url : 'https://' + url));
      if (!allowedDomains.some(domain => parsedTarget.hostname.endsWith(domain))) {
        console.warn(`[Tunnel] Blocked unauthorized domain: ${parsedTarget.hostname}`);
        return res.status(403).json({ error: 'Domain not allowed' });
      }
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    let targetUrl = url;
    if (targetUrl.startsWith('//')) targetUrl = 'https:' + targetUrl;
    else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) targetUrl = 'https://' + targetUrl;

    const range = req.headers.range;
    console.log(`[Tunnel] Fetching: ${targetUrl} (Range: ${range || 'none'})`);

    const maxRetries = 3; 
    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxRetries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); 
      
      try {
        const fetchHeaders: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive'
        };
        
        if (targetUrl.includes('archive.org')) {
          fetchHeaders['Referer'] = 'https://archive.org/';
          fetchHeaders['Origin'] = 'https://archive.org';
        }

        if (range) {
          fetchHeaders['Range'] = range;
        }

        const response = await fetch(targetUrl, {
          signal: controller.signal,
          headers: fetchHeaders
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.warn(`[Tunnel] Target returned status ${response.status} for ${targetUrl}`);
          if (response.status === 404) return res.status(404).send('Target not found');
          if ([503, 429, 408, 500].includes(response.status)) {
            const waitTime = 1000 * (attempt + 1) + Math.random() * 500;
            await new Promise(resolve => setTimeout(resolve, waitTime));
            throw new Error(`Target returned ${response.status}`);
          }
          throw new Error(`Target returned ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        const contentRange = response.headers.get('content-range');
        const acceptRanges = response.headers.get('accept-ranges');
        
        if (contentType) res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', contentLength);
        if (contentRange) res.setHeader('Content-Range', contentRange);
        if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.status(response.status);

        if (!response.body) throw new Error('Response body is null');

        const reader = response.body.getReader();
        const stream = new Readable({
          async read() {
            try {
              const { done, value } = await reader.read();
              if (done) {
                this.push(null);
              } else if (value) {
                this.push(Buffer.from(value));
              } else {
                this.push(null);
              }
            } catch (err) {
              this.destroy(err instanceof Error ? err : new Error(String(err)));
            }
          },
          destroy(err, callback) {
            reader.cancel().catch(() => {});
            callback(err);
          }
        });

        // Handle stream errors
        stream.on('error', (err) => {
          console.error(`[Tunnel] Stream error for ${targetUrl}:`, err.message);
          controller.abort();
          if (!res.headersSent) {
            res.status(502).send('Stream error');
          } else {
            res.end();
          }
        });

        // Handle response errors
        res.on('error', (err: any) => {
          if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
            // Silence common client-side disconnects
            return;
          }
          console.error(`[Tunnel] Response error for ${targetUrl}:`, err.message);
          controller.abort();
          stream.destroy();
        });

        if (res.socket) {
          res.socket.on('error', (err: any) => {
            if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
              return;
            }
            console.error(`[Tunnel] Socket error for ${targetUrl}:`, err.message);
            controller.abort();
            stream.destroy();
          });
        }

        // Pipe with error handling
        stream.pipe(res);

        res.on('close', () => {
          controller.abort();
          stream.destroy();
        });
        return; 

      } catch (error: any) {
        clearTimeout(timeoutId);
        lastError = error;
        attempt++;
        
        const isTimeout = error.name === 'AbortError';
        const isConnReset = error.message?.includes('ECONNRESET') || error.code === 'ECONNRESET' || error.message?.includes('fetch failed');
        const isRetryableStatus = error.message?.includes('503') || error.message?.includes('408') || error.message?.includes('429') || error.message?.includes('500');
        const isFatalStatus = error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('404');
        
        console.error(`[Tunnel] Attempt ${attempt} failed for ${targetUrl}: ${error.message}`);

        if (attempt < maxRetries && !isFatalStatus && (isTimeout || isConnReset || isRetryableStatus || !res.headersSent)) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          break;
        }
      }
    }

    if (!res.headersSent) {
      const isTimeout = lastError?.name === 'AbortError' || lastError?.message?.includes('408');
      const isOverloaded = lastError?.message?.includes('503');
      const isAuthError = lastError?.message?.includes('401') || lastError?.message?.includes('403');
      const isNotFound = lastError?.message?.includes('404');
      
      let status = 502;
      let message = `Gateway Error: ${lastError?.message}`;
      
      if (isTimeout) {
        status = 408;
        message = 'Request Timeout.';
      } else if (isOverloaded) {
        status = 503;
        message = 'Archive.org is overloaded.';
      } else if (isAuthError) {
        status = 401;
        message = 'Unauthorized or Forbidden access to target.';
      } else if (isNotFound) {
        status = 404;
        message = 'Target not found.';
      }
      
      res.status(status).send(message);
    }
  });


  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const path = await import('path');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[Retroverse OS] Core Server running on port ${PORT}`);
  });
}

startServer();
