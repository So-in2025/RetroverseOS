import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { Readable } from "stream";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  // Configuración Elite de Socket.io para baja latencia
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    pingInterval: 10000,
    pingTimeout: 5000,
    transports: ['websocket'] // Forzar WebSockets, deshabilitar polling para menor latencia
  });

  const PORT = 3000;

  // Middleware for SharedArrayBuffer (Required for N64/PSX emulators)
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    next();
  });

  app.use(express.json());

  // --- ESTRUCTURAS DE DATOS NETPLAY (SIGNALING SERVER) ---
  interface Player {
    socketId: string;
    userId: string;
    isHost: boolean;
    ready: boolean;
  }

  interface Room {
    id: string;
    gameId: string;
    players: Map<string, Player>; // userId -> Player
    status: 'waiting' | 'playing' | 'paused';
    createdAt: number;
    disconnectTimeouts: Map<string, NodeJS.Timeout>;
  }

  const matchmakingQueue: { socketId: string, gameId: string, userId: string, timestamp: number }[] = [];
  const activeRooms = new Map<string, Room>();
  const userToRoom = new Map<string, string>(); // socketId -> roomId

  const broadcastLiveGames = () => {
    io.emit("live-games-update", matchmakingQueue.map(q => ({
      gameId: q.gameId,
      userId: q.userId,
      timestamp: q.timestamp
    })));
  };

  // --- SOCKET.IO NETPLAY LOGIC ---
  io.on("connection", (socket: Socket) => {
    console.log(`[Netplay] Usuario conectado: ${socket.id}`);
    
    socket.emit("live-games-update", matchmakingQueue);

    // 1. Matchmaking
    socket.on("join-matchmaking", ({ gameId, userId }) => {
      console.log(`[Netplay] ${userId} buscando partida para ${gameId}`);
      
      const opponentIndex = matchmakingQueue.findIndex(p => p.gameId === gameId && p.userId !== userId);
      
      if (opponentIndex !== -1) {
        // Match found
        const opponent = matchmakingQueue.splice(opponentIndex, 1)[0];
        const roomId = `room_${Math.random().toString(36).substring(2, 10)}`;
        
        const room: Room = {
          id: roomId,
          gameId,
          players: new Map(),
          status: 'waiting',
          createdAt: Date.now(),
          disconnectTimeouts: new Map()
        };

        room.players.set(userId, { socketId: socket.id, userId, isHost: false, ready: false });
        room.players.set(opponent.userId, { socketId: opponent.socketId, userId: opponent.userId, isHost: true, ready: false });
        
        activeRooms.set(roomId, room);
        userToRoom.set(socket.id, roomId);
        userToRoom.set(opponent.socketId, roomId);

        io.to(socket.id).emit("match-found", { roomId, opponentId: opponent.userId, isHost: false });
        io.to(opponent.socketId).emit("match-found", { roomId, opponentId: userId, isHost: true });
        
        console.log(`[Netplay] Sala creada: ${roomId} para ${gameId}`);
        broadcastLiveGames();
      } else {
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

    // 2. Room Management & Signaling
    socket.on("join-room", (roomId, userId) => {
      socket.join(roomId);
      socket.join(userId); // Personal room for direct signaling
      userToRoom.set(socket.id, roomId);
      
      const room = activeRooms.get(roomId);
      if (room) {
        // Clear any pending disconnect timeouts for this user
        if (room.disconnectTimeouts.has(userId)) {
          clearTimeout(room.disconnectTimeouts.get(userId));
          room.disconnectTimeouts.delete(userId);
          console.log(`[Netplay] ${userId} se reconectó a la sala ${roomId}`);
          socket.to(roomId).emit("peer-reconnected", userId);
        }
        socket.to(roomId).emit("user-connected", userId);
      }
    });

    socket.on("peer-ready", (roomId, userId) => {
      const room = activeRooms.get(roomId);
      if (room) {
        const player = room.players.get(userId);
        if (player) player.ready = true;

        // Check if all players are ready
        let allReady = true;
        room.players.forEach(p => { if (!p.ready) allReady = false; });

        if (allReady && room.players.size === 2) {
          room.status = 'playing';
          io.to(roomId).emit("game-start-sync", { timestamp: Date.now() + 2000 }); // Start exactly in 2 seconds
        }
      }
    });

    // 3. WebRTC Signaling (SDP & ICE)
    socket.on("offer", (payload) => {
      io.to(payload.target).emit("offer", payload);
    });

    socket.on("answer", (payload) => {
      io.to(payload.target).emit("answer", payload);
    });

    socket.on("ice-candidate", (payload) => {
      io.to(payload.target).emit("ice-candidate", payload);
    });

    // 4. Chat
    socket.on("chat-message", (msg) => {
      io.to(msg.room).emit("chat-message", msg);
    });

    // 5. Disconnection Handling (Grace period)
    socket.on("disconnect", () => {
      console.log(`[Netplay] Usuario desconectado: ${socket.id}`);
      
      // Remove from matchmaking
      const index = matchmakingQueue.findIndex(p => p.socketId === socket.id);
      if (index !== -1) {
        matchmakingQueue.splice(index, 1);
        broadcastLiveGames();
      }

      // Handle active rooms
      const roomId = userToRoom.get(socket.id);
      if (roomId) {
        const room = activeRooms.get(roomId);
        if (room) {
          // Find which user this socket belonged to
          let disconnectedUserId = "";
          room.players.forEach((p, uid) => {
            if (p.socketId === socket.id) disconnectedUserId = uid;
          });

          if (disconnectedUserId) {
            socket.to(roomId).emit("peer-disconnected", disconnectedUserId);
            
            // Set a 30-second grace period for reconnection
            const timeout = setTimeout(() => {
              console.log(`[Netplay] Sala ${roomId} destruida por timeout de ${disconnectedUserId}`);
              io.to(roomId).emit("room-closed", { reason: "peer_timeout" });
              activeRooms.delete(roomId);
            }, 30000);
            
            room.disconnectTimeouts.set(disconnectedUserId, timeout);
          }
        }
        userToRoom.delete(socket.id);
      }
    });
  });

  // --- IN-MEMORY DATABASES (For AI Cache & Community Tips) ---
  const aiTipsCache: Record<string, string> = {}; 
  const communityTips: Record<string, { id: string, user: string, content: string, upvotes: number }[]> = {};
  const gameCheats: Record<string, string> = {}; 

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
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

  // Tunnel Route for Archive.org Metadata & ROMs
  app.get("/api/tunnel", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    const allowedDomains = ['archive.org', 'raw.githubusercontent.com', 'cdn.jsdelivr.net', 'myrient.erista.me'];
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

    const maxRetries = 3; 
    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxRetries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 40000); 
      
      try {
        const response = await fetch(targetUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*',
            'Connection': 'keep-alive'
          }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
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
        
        if (contentType) res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', contentLength);
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

        if (!response.body) throw new Error('Response body is null');

        const reader = response.body.getReader();
        const stream = new Readable({
          async read() {
            try {
              const { done, value } = await reader.read();
              if (done) this.push(null);
              else if (value) this.push(Buffer.from(value));
              else this.push(null);
            } catch (err) {
              this.destroy(err instanceof Error ? err : new Error(String(err)));
            }
          }
        });

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
        const isConnReset = error.message?.includes('ECONNRESET') || error.code === 'ECONNRESET';
        const isRetryableStatus = error.message?.includes('503') || error.message?.includes('408');
        
        if (attempt < maxRetries && (isTimeout || isConnReset || isRetryableStatus || !res.headersSent)) {
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
      const status = isTimeout ? 408 : (isOverloaded ? 503 : 502);
      const message = isTimeout ? 'Request Timeout.' : (isOverloaded ? 'Archive.org is overloaded.' : `Gateway Error`);
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
