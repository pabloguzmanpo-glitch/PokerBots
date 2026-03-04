// =============================================
// SERVIDOR PRINCIPAL — POKER BOTS
// =============================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { BOTS } = require('./game/bots');
const { PokerGame } = require('./game/engine');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, 'public')));

// ======== SALA PRINCIPAL ========
const ROOM_ID = 'mesa_principal';
let currentGame = null;
let humanPlayers = {};     // socketId -> player
let gameStarted = false;

function createBotPlayers() {
  return BOTS.map(bot => ({
    id: bot.id,
    name: bot.name,
    chips: 1000,
    isBot: true,
    botData: { ...bot, chips: 1000, stats: { wins: 0, losses: 0, bigBluffs: 0 } },
    hand: []
  }));
}

function startNewGame() {
  if (gameStarted) return;
  gameStarted = true;

  const botPlayers = createBotPlayers();
  const humanList = Object.values(humanPlayers);
  const allPlayers = [...botPlayers, ...humanList];

  currentGame = new PokerGame(allPlayers, io, ROOM_ID);

  console.log(`🎮 Juego iniciado con ${allPlayers.length} jugadores (${humanList.length} humanos, ${botPlayers.length} bots)`);
  io.to(ROOM_ID).emit('game_started', {
    players: allPlayers.map(p => ({ id: p.id, name: p.name, chips: p.chips, isBot: p.isBot }))
  });

  currentGame.startHand();
}

io.on('connection', (socket) => {
  console.log(`✅ Conectado: ${socket.id}`);
  socket.join(ROOM_ID);

  socket.emit('welcome', {
    message: '¡Bienvenido a la Mesa de Bots!',
    gameStarted
  });

  // ✅ FIX: enviar estado actual al nuevo cliente para que vea el juego al instante
  if (currentGame) {
    currentGame.broadcastStateTo(socket);
  }

  socket.on('join_as_player', ({ name }) => {
    const player = {
      id: socket.id,
      name: name || 'Jugador',
      chips: 1000,
      isBot: false,
      socket: socket,
      hand: [],
      stats: { wins: 0, losses: 0 }
    };

    humanPlayers[socket.id] = player;

    // ✅ FIX: usar 'currentGame' (no 'game' que no existe)
    if (currentGame) {
      currentGame.players.push(player);
      currentGame.active[socket.id] = false; // Entra en la próxima mano
      currentGame.bets[socket.id] = 0;
      currentGame.broadcastState(); // Actualiza el grid para todos
    }

    // Clave para que myId quede asignado en el frontend
    socket.emit('joined', { id: socket.id, name: player.name });

    io.to(ROOM_ID).emit('player_joined', { name: player.name });
  });

  socket.on('start_game', () => {
    if (!gameStarted) startNewGame();
  });

  socket.on('start_bot_only', () => {
    if (!gameStarted) startNewGame();
  });

  socket.on('player_action', (data) => {
    // Forwarded to the game engine via socket event
    // The engine listens on player.socket directly
  });

  socket.on('chat_message', ({ name, message }) => {
    if (!message || message.length > 200) return;
    io.to(ROOM_ID).emit('chat_message', {
      name: name || 'Espectador',
      message: message.slice(0, 200),
      timestamp: Date.now()
    });
  });

  socket.on('leave_game', () => {
    if (humanPlayers[socket.id]) {
      const p = humanPlayers[socket.id];
      delete humanPlayers[socket.id];
      io.to(ROOM_ID).emit('player_left', { name: p.name });
      console.log(`🚪 ${p.name} salió del juego`);
    }
  });

  socket.on('disconnect', () => {
    if (humanPlayers[socket.id]) {
      const p = humanPlayers[socket.id];
      console.log(`❌ Humano desconectado: ${p.name}`);
      delete humanPlayers[socket.id];
      io.to(ROOM_ID).emit('player_left', { name: p.name });
    }
  });
});

// Auto-start con solo bots después de 3 segundos
setTimeout(() => {
  if (!gameStarted) {
    console.log('🤖 Iniciando automáticamente con solo bots...');
    startNewGame();
  }
}, 3000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🃏 PokerBots corriendo en http://localhost:${PORT}`);
  console.log(`📺 Abre el navegador para ver la acción!\n`);
});