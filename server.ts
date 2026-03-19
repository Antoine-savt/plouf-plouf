import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import http from "http";
import path from "path";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" }
  });
  const PORT = 3000;

  // --- VOTE STATE ---
  let globalSecretWinner: string | null = null;

  interface Room {
    id: string;
    name: string;
    hostId: string;
    state: 'waiting' | 'voting' | 'results';
    players: Record<string, { id: string, name: string }>;
    candidates: string[];
    playerVotes: Record<string, string>;
    timeLeft: number;
    timerInterval: NodeJS.Timeout | null;
  }
  const rooms: Record<string, Room> = {};

  const broadcastRoomState = (roomId: string) => {
    const room = rooms[roomId];
    if (!room) return;
    const votes: Record<string, string[]> = {};
    room.candidates.forEach(c => votes[c] = []);
    
    Object.entries(room.playerVotes).forEach(([socketId, candidate]) => {
      if (room.players[socketId] && votes[candidate]) {
        votes[candidate].push(room.players[socketId].name);
      }
    });

    const totalVotes = Object.keys(room.playerVotes).length;
    io.to(roomId).emit('vote:state', {
      roomId: room.id,
      roomName: room.name,
      state: room.state,
      players: Object.values(room.players),
      candidates: room.candidates,
      votes,
      totalVotes,
      timeLeft: room.timeLeft,
      hasHost: true
    });
  };

  const broadcastRoomsList = () => {
    const list = Object.values(rooms).map(r => ({
      id: r.id,
      name: r.name,
      state: r.state,
      playerCount: Object.keys(r.players).length
    }));
    io.emit('vote:rooms', list);
  };

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    
    // --- SECRET ADMIN ---
    socket.emit('admin:sync_winner', globalSecretWinner);

    socket.on('admin:set_winner', (name: string | null) => {
      globalSecretWinner = name;
      io.emit('admin:sync_winner', globalSecretWinner);
    });

    socket.on('admin:clear_winner', () => {
      globalSecretWinner = null;
      io.emit('admin:sync_winner', null);
    });

    socket.emit('vote:rooms', Object.values(rooms).map(r => ({
      id: r.id,
      name: r.name,
      state: r.state,
      playerCount: Object.keys(r.players).length
    })));

    socket.on("request:rooms", () => {
      socket.emit('vote:rooms', Object.values(rooms).map(r => ({
        id: r.id,
        name: r.name,
        state: r.state,
        playerCount: Object.keys(r.players).length
      })));
    });

    socket.on("host:open", (roomName: string) => {
      const roomId = Math.random().toString(36).substring(2, 9);
      rooms[roomId] = {
        id: roomId,
        name: roomName || "Salon sans nom",
        hostId: socket.id,
        state: 'waiting',
        players: {},
        candidates: [],
        playerVotes: {},
        timeLeft: 0,
        timerInterval: null
      };
      socket.join(roomId);
      broadcastRoomState(roomId);
      broadcastRoomsList();
    });

    socket.on("player:join", (roomId: string, playerName: string) => {
      const room = rooms[roomId];
      if (room && room.state === 'waiting' && playerName.trim() !== "") {
        room.players[socket.id] = { id: socket.id, name: playerName.trim() };
        socket.join(roomId);
        broadcastRoomState(roomId);
        broadcastRoomsList();
      }
    });

    socket.on("host:start", (roomId: string, allNames: string[], duration: number = 15) => {
      const room = rooms[roomId];
      if (room && room.hostId === socket.id && room.state === 'waiting') {
        const shuffled = [...allNames].sort((a, b) => a.localeCompare(b));
        room.candidates = shuffled;
        room.playerVotes = {};
        room.state = 'voting';
        room.timeLeft = duration;
        broadcastRoomState(roomId);
        broadcastRoomsList();

        if (room.timerInterval) clearInterval(room.timerInterval);
        room.timerInterval = setInterval(() => {
          room.timeLeft -= 1;
          if (room.timeLeft <= 0) {
            clearInterval(room.timerInterval!);
            room.timerInterval = null;
            room.state = 'results';
            broadcastRoomsList();
          }
          broadcastRoomState(roomId);
        }, 1000);
      }
    });

    socket.on("player:vote", (roomId: string, candidateName: string) => {
      const room = rooms[roomId];
      if (room && room.state === 'voting' && room.players[socket.id] && room.candidates.includes(candidateName)) {
        room.playerVotes[socket.id] = candidateName;
        broadcastRoomState(roomId);
      }
    });

    socket.on("host:close", (roomId: string) => {
      const room = rooms[roomId];
      if (room && room.hostId === socket.id) {
        if (room.timerInterval) clearInterval(room.timerInterval);
        io.to(roomId).emit('vote:closed');
        io.in(roomId).socketsLeave(roomId);
        delete rooms[roomId];
        broadcastRoomsList();
      }
    });

    socket.on("disconnect", () => {
      Object.values(rooms).forEach(room => {
        if (room.hostId === socket.id) {
          if (room.timerInterval) clearInterval(room.timerInterval);
          io.to(room.id).emit('vote:closed');
          io.in(room.id).socketsLeave(room.id);
          delete rooms[room.id];
          broadcastRoomsList();
        } else if (room.players[socket.id]) {
          delete room.players[socket.id];
          delete room.playerVotes[socket.id];
          broadcastRoomState(room.id);
          broadcastRoomsList();
        }
      });
    });
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
