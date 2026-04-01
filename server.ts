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
    // Silence common client-side disconnects
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

  // --- RATE LIMITING ---
  const rateLimits: Record<string, { count: number, reset: number }> = {};
  const rateLimitMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
    const now = Date.now();
    
    if (!rateLimits[ip] || now > rateLimits[ip].reset) {
      rateLimits[ip] = { count: 1, reset: now + 60000 }; // 1 minute window
    } else {
      rateLimits[ip].count++;
    }

    if (rateLimits[ip].count > 1000) { // Increased to 1000 for cover fetching
      return res.status(429).json({ error: "Too many requests" });
    }
    next();
  };
  app.use("/api/", rateLimitMiddleware);

  // --- SECURE ECONOMY & COMPETITIVE (Server-Side Source of Truth) ---
  // In a real app, these would be backed by a database like Supabase/Firebase
  const userBalances: Record<string, number> = {};
  const userMMR: Record<string, number> = {};

  app.get("/api/economy/balance/:userId", (req, res) => {
    const { userId } = req.params;
    res.json({ balance: userBalances[userId] || 0 });
  });

  app.post("/api/economy/transaction", (req, res) => {
    const { userId, amount, type, reason, signature } = req.body;
    
    // VALIDATION: In production, we would verify a cryptographic signature 
    // from the game engine or a trusted client-side component.
    if (!userId || typeof amount !== 'number') return res.status(400).json({ error: "Invalid request" });

    const currentBalance = userBalances[userId] || 0;
    if (type === 'spend' && currentBalance < amount) {
      return res.status(400).json({ error: "Insufficient funds" });
    }

    const newBalance = type === 'earn' ? currentBalance + amount : currentBalance - amount;
    userBalances[userId] = newBalance;

    console.log(`[Economy] Transaction for ${userId}: ${type} ${amount} (${reason}). New Balance: ${newBalance}`);
    res.json({ success: true, balance: newBalance });
  });

  app.post("/api/competitive/result", (req, res) => {
    const { userId, gameId, score, result, matchId } = req.body;
    
    // VALIDATION: Verify match integrity
    if (!userId || !gameId || typeof score !== 'number') return res.status(400).json({ error: "Invalid result" });

    const currentMMR = userMMR[userId] || 1000;
    let mmrChange = 0;

    if (result === 'win') mmrChange = 25;
    else if (result === 'loss') mmrChange = -15;
    else if (result === 'draw') mmrChange = 5;

    const newMMR = Math.max(0, currentMMR + mmrChange);
    userMMR[userId] = newMMR;

    console.log(`[Competitive] Result for ${userId} in ${gameId}: ${result} (Score: ${score}). New MMR: ${newMMR}`);
    res.json({ success: true, mmr: newMMR, mmrChange });
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

    const allowedDomains = [
      'archive.org', 
      'raw.githubusercontent.com', 
      'cdn.jsdelivr.net', 
      'github.com', 
      'wsrv.nl', 
      'weserv.nl', 
      'mm.bing.net', 
      'bing.net',
      'google.com',
      'googleusercontent.com',
      'images.unsplash.com',
      'libretro.com'
    ];
    let parsedTarget: URL;
    try {
      parsedTarget = new URL(url.startsWith('//') ? 'https:' + url : (url.startsWith('http') ? url : 'https://' + url));
      if (!allowedDomains.some(domain => parsedTarget.hostname.endsWith(domain))) {
        console.warn(`[Tunnel] Blocked unauthorized domain: ${parsedTarget.hostname}`);
        return res.status(403).json({ error: `Domain ${parsedTarget.hostname} not allowed in tunnel` });
      }
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    let targetUrl = url;
    if (targetUrl.startsWith('//')) targetUrl = 'https:' + targetUrl;
    else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) targetUrl = 'https://' + targetUrl;

    const range = req.headers.range;
    console.log(`[Tunnel] Fetching: ${targetUrl} (Range: ${range || 'none'})`);

    const isArchive = targetUrl.includes('archive.org');
    const maxRetries = isArchive ? 10 : 7; 
    let attempt = 0;
    let lastError: any = null;

    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 OPR/111.0.0.0'
    ];

    let cookies: string[] = [];

    while (attempt < maxRetries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 240000); // Increased to 240 Seconds
      
      try {
        const fetchHeaders: Record<string, string> = {
          'User-Agent': userAgents[attempt % userAgents.length],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'DNT': '1'
        };

        if (cookies.length > 0) {
          fetchHeaders['Cookie'] = cookies.join('; ');
        }

        // Archive.org is sensitive to Referer and Origin
        if (isArchive) {
          fetchHeaders['Referer'] = 'https://archive.org/';
          fetchHeaders['Origin'] = 'https://archive.org';
        }

        if (range) {
          fetchHeaders['Range'] = range;
        }

        const response = await fetch(parsedTarget.href, {
          signal: controller.signal,
          headers: fetchHeaders,
          // @ts-ignore
          redirect: 'follow'
        });
        
        // Capture cookies for potential retries (some Archive.org downloads need them)
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
          const newCookies = setCookie.split(',').map(c => c.split(';')[0].trim());
          cookies = [...new Set([...cookies, ...newCookies])];
        }

        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const status = response.status;
          console.warn(`[Tunnel] Target returned status ${status} for ${targetUrl} (Attempt ${attempt + 1})`);
          
          if (status === 404) return res.status(404).send('Target not found');
          
          // If we get a 401/403, it might be a temporary block or anti-bot
          if (status === 401 || status === 403 || [503, 429, 408, 500, 502, 504].includes(status)) {
            const waitTime = 3000 * (attempt + 1) + Math.random() * 3000; // Increased wait time
            await new Promise(resolve => setTimeout(resolve, waitTime));
            throw new Error(`Target returned ${status}`);
          }
          throw new Error(`Target returned ${status}`);
        }

        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        const contentRange = response.headers.get('content-range');
        const acceptRanges = response.headers.get('accept-ranges');
        
        // Security: Don't allow tunneling HTML if we expect a ROM/Binary or Metadata
        // This prevents the proxy from being used for phishing or serving malicious HTML
        const isBinaryRequest = targetUrl.match(/\.(zip|nes|sfc|smc|md|gen|gba|gbc|gb|n64|z64|v64|iso|chd|cue|bin|exe|msi|7z|rar)$/i);
        const isMetadataRequest = targetUrl.includes('archive.org/metadata/');
        if ((isBinaryRequest || isMetadataRequest) && contentType?.includes('text/html')) {
           console.warn(`[Tunnel] Blocked HTML response for ${isBinaryRequest ? 'binary' : 'metadata'} request: ${targetUrl}`);
           // If it's HTML, it's likely an error page served with 200 OK (common on some CDNs)
           if (attempt < maxRetries - 1) {
             throw new Error(`Received HTML instead of ${isBinaryRequest ? 'Binary' : 'JSON'}`);
           }
        }

        if (contentType) res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', contentLength);
        if (contentRange) res.setHeader('Content-Range', contentRange);
        if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.status(response.status);

        if (!response.body) throw new Error('Response body is null');

        // Use a more robust streaming approach
        const reader = response.body.getReader();
        const stream = new Readable({
          async read() {
            try {
              const { done, value } = await reader.read();
              if (done) {
                this.push(null);
              } else {
                this.push(Buffer.from(value));
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

        // Ensure we don't close the connection prematurely
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Keep-Alive', 'timeout=120, max=1000');

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
        const isConnReset = error.message?.includes('ECONNRESET') || error.code === 'ECONNRESET' || error.message?.toLowerCase().includes('fetch failed');
        const isRetryableStatus = error.message?.includes('503') || error.message?.includes('408') || error.message?.includes('429') || error.message?.includes('500') || error.message?.includes('502') || error.message?.includes('504');
        const isHtmlError = error.message?.includes('Received HTML instead of Binary');
        
        // 401/403 can sometimes be temporary blocks or anti-bot glitches on Archive.org
        const isAuthRetryable = isArchive && (error.message?.includes('401') || error.message?.includes('403'));
        const isFatalStatus = error.message?.includes('404') || (!isAuthRetryable && (error.message?.includes('401') || error.message?.includes('403')));
        
        console.error(`[Tunnel] Attempt ${attempt} failed for ${targetUrl}: ${error.message}${isConnReset ? ' (Connection Reset/Fetch Failed)' : ''}`);

        if (attempt < maxRetries && !isFatalStatus && (isTimeout || isConnReset || isRetryableStatus || isAuthRetryable || isHtmlError || !res.headersSent)) {
          const delay = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
          console.log(`[Tunnel] Retrying in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          break;
        }
      }
    }

    if (!res.headersSent) {
      const isTimeout = lastError?.name === 'AbortError' || lastError?.message?.includes('408');
      const isOverloaded = lastError?.message?.includes('503') || lastError?.message?.includes('429');
      const isAuthError = lastError?.message?.includes('401') || lastError?.message?.includes('403');
      const isNotFound = lastError?.message?.includes('404');
      const isServerError = lastError?.message?.includes('500') || lastError?.message?.includes('502') || lastError?.message?.includes('504');
      
      let status = 502;
      let message = `Tunnel Error: ${lastError?.message || 'Unknown Error'}`;
      
      if (isTimeout) {
        status = 408;
        message = 'Request Timeout. The target server took too long to respond.';
      } else if (isOverloaded) {
        status = 503;
        message = 'Target server is overloaded or rate-limiting requests.';
      } else if (isAuthError) {
        status = 403;
        message = 'Access Forbidden or Unauthorized by target server.';
      } else if (isNotFound) {
        status = 404;
        message = 'Target resource not found.';
      } else if (isServerError) {
        status = 502;
        message = 'Target server returned a server error (500/502/504).';
      }
      
      console.error(`[Tunnel] Final failure for ${targetUrl}: ${status} - ${message}`);
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
