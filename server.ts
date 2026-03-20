import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import { Readable } from "stream";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Middleware for SharedArrayBuffer (Required for N64 emulators)
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    next();
  });

  // Matchmaking Queue
  const matchmakingQueue: { socketId: string, gameId: string, userId: string, timestamp: number }[] = [];

  const broadcastLiveGames = () => {
    io.emit("live-games-update", matchmakingQueue);
  };

  // Socket.io Logic for Multiplayer Signaling
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // Send current live games to newly connected user
    socket.emit("live-games-update", matchmakingQueue);

    // Matchmaking
    socket.on("join-matchmaking", ({ gameId, userId }) => {
      console.log(`User ${userId} joined matchmaking for ${gameId}`);
      
      // Check if someone is already waiting for this game
      const opponentIndex = matchmakingQueue.findIndex(p => p.gameId === gameId && p.userId !== userId);
      
      if (opponentIndex !== -1) {
        // Match found!
        const opponent = matchmakingQueue.splice(opponentIndex, 1)[0];
        const roomId = `room_${Math.random().toString(36).substr(2, 9)}`;
        
        // Notify both players
        io.to(socket.id).emit("match-found", { roomId, opponentId: opponent.userId, isHost: false });
        io.to(opponent.socketId).emit("match-found", { roomId, opponentId: userId, isHost: true });
        
        console.log(`Match created: ${roomId} for ${gameId}`);
        broadcastLiveGames();
      } else {
        // Add to queue
        matchmakingQueue.push({ socketId: socket.id, gameId, userId, timestamp: Date.now() });
        socket.emit("matchmaking-status", { status: "searching" });
        broadcastLiveGames();
      }
    });

    socket.on("leave-matchmaking", () => {
      const index = matchmakingQueue.findIndex(p => p.socketId === socket.id);
      if (index !== -1) {
        matchmakingQueue.splice(index, 1);
        broadcastLiveGames();
      }
    });

    socket.on("join-room", (roomId, userId) => {
      socket.join(roomId);
      socket.join(userId); // Join a room with their own userId for direct messaging
      socket.to(roomId).emit("user-connected", userId);
    });

    socket.on("start-game", (roomId) => {
      io.to(roomId).emit("game-started");
    });

    socket.on("chat-message", (msg) => {
      io.to(msg.room).emit("chat-message", msg);
    });

    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          socket.to(room).emit("user-disconnected", socket.id);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      const index = matchmakingQueue.findIndex(p => p.socketId === socket.id);
      if (index !== -1) {
        matchmakingQueue.splice(index, 1);
        broadcastLiveGames();
      }
    });

    // WebRTC Signaling
    socket.on("offer", (payload) => {
      io.to(payload.target).emit("offer", payload);
    });

    socket.on("answer", (payload) => {
      io.to(payload.target).emit("answer", payload);
    });

    socket.on("ice-candidate", (payload) => {
      io.to(payload.target).emit("ice-candidate", payload);
    });
  });

  // --- IN-MEMORY DATABASES (For AI Cache & Community Tips) ---
  const aiTipsCache: Record<string, string> = {}; // { gameId: "markdown content" }
  const communityTips: Record<string, { id: string, user: string, content: string, upvotes: number }[]> = {};
  const gameCheats: Record<string, string> = {}; // { gameId: "cheat content" }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // AI Tips Cache Route
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

  // Community Tips Route
  app.get("/api/tips/community/:gameId", (req, res) => {
    const { gameId } = req.params;
    const tips = communityTips[gameId] || [];
    // Sort by upvotes descending
    tips.sort((a, b) => b.upvotes - a.upvotes);
    res.json({ tips });
  });

  app.post("/api/tips/community/:gameId", (req, res) => {
    const { gameId } = req.params;
    const { user, content } = req.body;
    if (!user || !content) return res.status(400).json({ error: "Missing user or content" });
    
    if (!communityTips[gameId]) communityTips[gameId] = [];
    
    const newTip = {
      id: Math.random().toString(36).substr(2, 9),
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

  // Cheats Route (Mocking a static DB)
  app.get("/api/cheats/:gameId", (req, res) => {
    const { gameId } = req.params;
    // In a real app, this would read from a .cht file or database
    if (gameCheats[gameId]) {
      return res.json({ found: true, content: gameCheats[gameId] });
    }
    res.json({ found: false, content: null });
  });

  // Tunnel Route for Archive.org Metadata & ROMs (Renamed from proxy to avoid adblockers)
  app.get("/api/tunnel", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    // Security: Only allow specific domains to be proxied
    const allowedDomains = ['archive.org', 'raw.githubusercontent.com', 'cdn.jsdelivr.net'];
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
    if (targetUrl.startsWith('//')) {
      targetUrl = 'https:' + targetUrl;
    } else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    try {
      const parsedUrl = new URL(targetUrl);
      targetUrl = parsedUrl.href;
      
      console.log(`[Tunnel] Fetching: ${targetUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for large ROMs
      
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://archive.org/'
        }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`[Tunnel] Target returned ${response.status}`);
        return res.status(response.status).send(`Target returned ${response.status}`);
      }

      // Forward headers safely
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      if (contentType) res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      
      // Add CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

      // Stream the response instead of loading into memory
      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Convert Web Stream to Node Stream
      const reader = response.body.getReader();
      const stream = new Readable({
        async read() {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null);
          } else {
            this.push(Buffer.from(value));
          }
        }
      });

      stream.pipe(res);

      res.on('close', () => {
        controller.abort();
      });

    } catch (error) {
      console.error('[Tunnel] Error:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Failed to fetch data', 
          details: error instanceof Error ? error.message : String(error) 
        });
      }
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
