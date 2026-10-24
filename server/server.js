// server/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// --- FULL CARD CATALOG ---
const CARD_CATALOG = [
  { id: 'dagger', name: 'Iron Dagger', cost: 1, type: 'Attack', targetMode: 'any', desc: 'Deal 2 DMG to any player.', copies: 5 },
  { id: 'silver_blade', name: 'Silver Blade', cost: 3, type: 'Attack', targetMode: 'any', desc: 'Deal 3 DMG (5 DMG if target is a Vampire).', copies: 3 },
  { id: 'holy_water', name: 'Holy Water', cost: 3, type: 'Attack', targetMode: 'any', desc: 'If Vampire: 4 DMG. If Hunter: Heal +2 HP.', copies: 3 },
  { id: 'shield', name: 'Wooden Shield', cost: 1, type: 'Defense', targetMode: 'any', desc: 'Give any player +2 Shield until Dawn.', copies: 5 },
  { id: 'herb', name: 'Crimson Herb', cost: 2, type: 'Heal', targetMode: 'any', desc: 'Heal any player for +3 HP (up to 10 HP).', copies: 4 },
  { id: 'cutpurse', name: 'Cutpurse', cost: 0, type: 'Deception', targetMode: 'other', desc: 'FREE: Steal up to 2G and 1 random card from a player.', copies: 3 },
  { id: 'ravens_eye', name: "Raven's Eye", cost: 2, type: 'Intel', targetMode: 'other', desc: "Secretly inspect all cards in a player's hand.", copies: 3 },
  { id: 'truth_mirror', name: 'Truth Mirror', cost: 3, type: 'Intel', targetMode: 'any', desc: "Secretly reveal a player's true Role to yourself.", copies: 3 },
  { id: 'soul_chain', name: 'Soul Chain', cost: 3, type: 'Tactical', targetMode: 'two', desc: 'Link 2 players until Dawn. Damage to one hits the other.', copies: 2 },
  { id: 'vampire_curse', name: 'Vampiric Curse', cost: 5, type: 'Curse', targetMode: 'any', desc: 'Secretly convert any player (or yourself!) into a Vampire.', copies: 2 },
  { id: 'purify', name: 'Purifying Elixir', cost: 4, type: 'Cleanse', targetMode: 'any', desc: 'Cleanse any Vampire back into a Hunter and heal +1 HP.', copies: 2 },
  { id: 'pistol', name: "Executioner's Pistol", cost: 7, type: 'Lethal', targetMode: 'any', desc: 'Instantly deal 10 lethal DMG to a target.', copies: 1 }
];

// Build & shuffle deck helper
function buildDeck() {
  const deck = [];
  let uid = 1;
  CARD_CATALOG.forEach((c) => {
    for (let i = 0; i < c.copies; i++) {
      deck.push({ ...c, uid: `card_${uid++}_${Math.random().toString(36).slice(2, 6)}` });
    }
  });
  return shuffle(deck);
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const rooms = {};

function drawCards(room, count) {
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (room.deck.length === 0) {
      room.deck = buildDeck();
    }
    drawn.push(room.deck.pop());
  }
  return drawn;
}

function applyDamage(room, targetId, amount, sourceLabel, echoVisited = new Set()) {
  const target = room.players.find((p) => p.id === targetId);
  if (!target || !target.alive || amount <= 0) return;

  let remaining = amount;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, remaining);
    target.shield -= absorbed;
    remaining -= absorbed;
    room.logs.unshift(`🛡️ ${target.name}'s Shield absorbed ${absorbed} DMG.`);
  }

  if (remaining > 0) {
    target.hp = Math.max(0, target.hp - remaining);
    room.logs.unshift(`🩸 ${target.name} took ${remaining} DMG (${sourceLabel}) [HP: ${target.hp}/10].`);
    if (target.hp === 0) {
      target.alive = false;
      room.logs.unshift(`💀 ${target.name} has fallen! They were a ${target.role}.`);
    }
  }

  // Check Soul Chains
  echoVisited.add(targetId);
  room.chains.forEach(([a, b]) => {
    if (a === targetId && !echoVisited.has(b)) {
      applyDamage(room, b, amount, `Soul Chain from ${target.name}`, echoVisited);
    } else if (b === targetId && !echoVisited.has(a)) {
      applyDamage(room, a, amount, `Soul Chain from ${target.name}`, echoVisited);
    }
  });
}

function checkWinner(room) {
  const alive = room.players.filter((p) => p.alive);
  const vampires = alive.filter((p) => p.role === 'Vampire');
  const hunters = alive.filter((p) => p.role === 'Hunter');

  if (vampires.length === 0) {
    room.phase = 'GAME_OVER';
    room.winner = 'Hunters Win! All Vampires have been vanquished!';
    return true;
  }
  if (vampires.length >= hunters.length) {
    room.phase = 'GAME_OVER';
    room.winner = 'Vampires Win! Vampires have overtaken the town!';
    return true;
  }
  return false;
}

// Personalized state per player so secret roles & hands stay hidden
function broadcastRoom(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  room.players.forEach((viewer) => {
    const isGameOver = room.phase === 'GAME_OVER';
    const sanitizedPlayers = room.players.map((p) => {
      const isSelf = p.id === viewer.id;
      const bothVampires = viewer.role === 'Vampire' && p.role === 'Vampire';
      const revealedRole = isSelf || bothVampires || !p.alive || isGameOver ? p.role : '???';

      return {
        id: p.id,
        name: p.name,
        hp: p.hp,
        gold: p.gold,
        shield: p.shield,
        alive: p.alive,
        tookGoldToday: p.tookGoldToday,
        handCount: p.hand.length,
        hand: isSelf ? p.hand : [],
        role: revealedRole,
        nightSubmitted: !!room.nightActions[p.id]
      };
    });

    io.to(viewer.id).emit('ROOM_STATE', {
      roomCode: room.code,
      hostId: room.hostId,
      phase: room.phase,
      day: room.day,
      commonwealth: room.commonwealth,
      turnOrder: room.turnOrder,
      turnIndex: room.turnIndex,
      activePlayerId: room.turnOrder[room.turnIndex] || null,
      chains: room.chains,
      deckCount: room.deck.length,
      logs: room.logs.slice(0, 30),
      winner: room.winner,
      players: sanitizedPlayers,
      privateIntel: viewer.privateIntel || []
    });
  });
}

function startDayPhase(room, dayNumber) {
  room.day = dayNumber;
  room.phase = 'DAY';
  room.chains = [];
  room.nightActions = {};

  const alivePlayers = room.players.filter((p) => p.alive);
  room.commonwealth = alivePlayers.length * 2 + 3;

  // Rotate starting player clockwise each Day
  const totalSeats = room.players.length;
  const startSeat = (dayNumber - 1) % totalSeats;
  const rotatedOrder = [];
  for (let i = 0; i < totalSeats; i++) {
    const p = room.players[(startSeat + i) % totalSeats];
    if (p.alive) rotatedOrder.push(p.id);
  }
  room.turnOrder = rotatedOrder;
  room.turnIndex = 0;

  room.players.forEach((p) => {
    p.shield = 0;
    p.tookGoldToday = 0;
    if (p.alive && dayNumber > 1) {
      p.hand.push(...drawCards(room, 1));
    }
  });

  room.logs.unshift(`☀️ Day ${dayNumber} begins! Commonwealth holds ${room.commonwealth} Gold.`);
}

io.on('connection', (socket) => {
  socket.on('CREATE_ROOM', ({ playerName }) => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    rooms[code] = {
      code,
      hostId: socket.id,
      phase: 'LOBBY',
      day: 1,
      commonwealth: 0,
      turnOrder: [],
      turnIndex: 0,
      deck: [],
      chains: [],
      nightActions: {},
      logs: [`🏰 Room ${code} created by ${playerName}.`],
      winner: null,
      players: [
        {
          id: socket.id,
          name: playerName || 'Player 1',
          hp: 10,
          gold: 0,
          shield: 0,
          alive: true,
          role: 'Hunter',
          hand: [],
          tookGoldToday: 0,
          privateIntel: []
        }
      ]
    };
    socket.join(code);
    broadcastRoom(code);
  });

  socket.on('JOIN_ROOM', ({ roomCode, playerName }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms[code];
    if (!room || room.phase !== 'LOBBY') {
      socket.emit('ERROR_MSG', 'Room not found or game already started.');
      return;
    }
    if (room.players.length >= 8) {
      socket.emit('ERROR_MSG', 'Room is full (max 8 players).');
      return;
    }

    room.players.push({
      id: socket.id,
      name: playerName || `Player ${room.players.length + 1}`,
      hp: 10,
      gold: 0,
      shield: 0,
      alive: true,
      role: 'Hunter',
      hand: [],
      tookGoldToday: 0,
      privateIntel: []
    });
    socket.join(code);
    room.logs.unshift(`👋 ${playerName} joined the lobby.`);
    broadcastRoom(code);
  });

  socket.on('START_GAME', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id) return;
    if (room.players.length < 3) {
      socket.emit('ERROR_MSG', 'Need at least 3 players to start.');
      return;
    }

    room.deck = buildDeck();
    const count = room.players.length;
    const numVampires = count >= 6 ? 2 : 1;
    const roles = shuffle([
      ...Array(numVampires).fill('Vampire'),
      ...Array(count - numVampires).fill('Hunter')
    ]);

    room.players.forEach((p, idx) => {
      p.role = roles[idx];
      p.hp = 10;
      p.gold = 0;
      p.shield = 0;
      p.alive = true;
      p.hand = drawCards(room, 2);
      p.privateIntel = [`🎭 You were dealt the secret role: ${p.role}`];
    });

    startDayPhase(room, 1);
    broadcastRoom(roomCode);
  });

  socket.on('TAKE_GOLD', ({ roomCode, amount }) => {
    const room = rooms[roomCode];
    if (!room || room.phase !== 'DAY') return;
    const activeId = room.turnOrder[room.turnIndex];
    if (socket.id !== activeId) return;

    const player = room.players.find((p) => p.id === socket.id);
    const allowed = Math.min(amount, 4 - player.tookGoldToday, room.commonwealth);
    if (allowed <= 0) return;

    player.gold += allowed;
    player.tookGoldToday += allowed;
    room.commonwealth -= allowed;
    room.logs.unshift(`🪙 ${player.name} took ${allowed}G from the Commonwealth (${room.commonwealth}G left).`);
    broadcastRoom(roomCode);
  });

  socket.on('CYCLE_CARD', ({ roomCode, cardUid, freeDiscard }) => {
    const room = rooms[roomCode];
    if (!room || room.phase !== 'DAY') return;
    if (room.turnOrder[room.turnIndex] !== socket.id) return;

    const player = room.players.find((p) => p.id === socket.id);
    const idx = player.hand.findIndex((c) => c.uid === cardUid);
    if (idx === -1) return;

    if (freeDiscard) {
      const removed = player.hand.splice(idx, 1)[0];
      room.logs.unshift(`🗑️ ${player.name} discarded ${removed.name}.`);
    } else {
      if (player.gold < 1) return;
      player.gold -= 1;
      player.hand.splice(idx, 1);
      player.hand.push(...drawCards(room, 1));
      room.logs.unshift(`🔄 ${player.name} paid 1G to cycle a card.`);
    }
    broadcastRoom(roomCode);
  });

  socket.on('PLAY_CARD', ({ roomCode, cardUid, targetId, secondTargetId }) => {
    const room = rooms[roomCode];
    if (!room || room.phase !== 'DAY') return;
    if (room.turnOrder[room.turnIndex] !== socket.id) return;

    const player = room.players.find((p) => p.id === socket.id);
    const cardIdx = player.hand.findIndex((c) => c.uid === cardUid);
    if (cardIdx === -1) return;

    const card = player.hand[cardIdx];
    if (player.gold < card.cost) return;

    const target = room.players.find((p) => p.id === targetId);
    if (!target || !target.alive) return;

    player.gold -= card.cost;
    player.hand.splice(cardIdx, 1);

    switch (card.id) {
      case 'dagger':
        applyDamage(room, target.id, 2, `${player.name}'s Iron Dagger`);
        break;
      case 'silver_blade': {
        const dmg = target.role === 'Vampire' ? 5 : 3;
        applyDamage(room, target.id, dmg, `${player.name}'s Silver Blade`);
        break;
      }
      case 'holy_water':
        if (target.role === 'Vampire') {
          applyDamage(room, target.id, 4, `${player.name}'s Holy Water`);
        } else {
          target.hp = Math.min(10, target.hp + 2);
          room.logs.unshift(`✨ ${player.name}'s Holy Water blessed ${target.name} (+2 HP).`);
        }
        break;
      case 'shield':
        target.shield += 2;
        room.logs.unshift(`🛡️ ${player.name} granted ${target.name} +2 Shield.`);
        break;
      case 'herb':
        target.hp = Math.min(10, target.hp + 3);
        room.logs.unshift(`🌿 ${player.name} healed ${target.name} (+3 HP).`);
        break;
      case 'cutpurse': {
        if (target.id === player.id) break;
        const stolenG = Math.min(2, target.gold);
        target.gold -= stolenG;
        player.gold += stolenG;
        let stolenCardMsg = '';
        if (target.hand.length > 0) {
          const rIdx = Math.floor(Math.random() * target.hand.length);
          const [stolenCard] = target.hand.splice(rIdx, 1);
          player.hand.push(stolenCard);
          stolenCardMsg = ` and 1 card`;
        }
        room.logs.unshift(`🗡️ ${player.name} played Cutpurse on ${target.name}, stealing ${stolenG}G${stolenCardMsg}!`);
        break;
      }
      case 'ravens_eye': {
        const names = target.hand.map((c) => c.name).join(', ') || 'No cards';
        player.privateIntel.unshift(`👁️ [Raven's Eye] ${target.name}'s hand: ${names}`);
        room.logs.unshift(`👁️ ${player.name} used Raven's Eye on ${target.name}.`);
        break;
      }
      case 'truth_mirror':
        player.privateIntel.unshift(`🪞 [Truth Mirror] ${target.name} is a ${target.role}!`);
        room.logs.unshift(`🪞 ${player.name} gazed into the Truth Mirror at ${target.name}.`);
        break;
      case 'soul_chain': {
        const target2 = room.players.find((p) => p.id === secondTargetId);
        if (target2 && target2.alive && target2.id !== target.id) {
          room.chains.push([target.id, target2.id]);
          room.logs.unshift(`⛓️ ${player.name} bound ${target.name} and ${target2.name} with Soul Chain!`);
        }
        break;
      }
      case 'vampire_curse':
        target.role = 'Vampire';
        target.privateIntel.unshift(`🦇 You have been cursed into a Vampire!`);
        player.privateIntel.unshift(`🦇 You cursed ${target.name} into a Vampire!`);
        room.logs.unshift(`🌑 A dark ritual was performed in secret...`);
        break;
      case 'purify':
        if (target.role === 'Vampire') {
          target.role = 'Hunter';
          target.privateIntel.unshift(`✨ Purifying Elixir cleansed you back into a Hunter!`);
        }
        target.hp = Math.min(10, target.hp + 1);
        room.logs.unshift(`🧪 ${player.name} used Purifying Elixir on ${target.name} (+1 HP).`);
        break;
      case 'pistol':
        applyDamage(room, target.id, 10, `${player.name}'s Executioner's Pistol`);
        break;
      default:
        break;
    }

    checkWinner(room);
    broadcastRoom(roomCode);
  });

  socket.on('END_TURN', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.phase !== 'DAY') return;
    if (room.turnOrder[room.turnIndex] !== socket.id) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (player.hand.length > 4) {
      socket.emit('ERROR_MSG', 'You cannot end your turn with more than 4 cards!');
      return;
    }

    // Advance to next alive player in turnOrder
    room.turnIndex++;
    while (
      room.turnIndex < room.turnOrder.length &&
      !room.players.find((p) => p.id === room.turnOrder[room.turnIndex])?.alive
    ) {
      room.turnIndex++;
    }

    if (room.turnIndex >= room.turnOrder.length) {
      room.phase = 'NIGHT';
      room.nightActions = {};
      room.logs.unshift(`🌙 Night ${room.day} falls! All alive players must submit their secret Night Action.`);
    }
    broadcastRoom(roomCode);
  });

  socket.on('SUBMIT_NIGHT', ({ roomCode, utilityChoice, targetId }) => {
    const room = rooms[roomCode];
    if (!room || room.phase !== 'NIGHT') return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player || !player.alive) return;

    room.nightActions[socket.id] = { utilityChoice, targetId };

    const alivePlayers = room.players.filter((p) => p.alive);
    const allSubmitted = alivePlayers.every((p) => !!room.nightActions[p.id]);

    if (allSubmitted) {
      // 1. Apply Night Utility (+1 Shield or +1 Card) for BOTH Hunters and Vampires
      alivePlayers.forEach((p) => {
        const act = room.nightActions[p.id];
        if (act.utilityChoice === 'SHIELD') {
          p.shield += 1;
        } else if (act.utilityChoice === 'CARD') {
          p.hand.push(...drawCards(room, 1));
        }
      });

      // 2. Check Vampire Consensus Attack
      const aliveVampires = alivePlayers.filter((p) => p.role === 'Vampire');
      const vampTargets = aliveVampires.map((v) => room.nightActions[v.id]?.targetId).filter(Boolean);

      if (vampTargets.length > 0 && vampTargets.every((t) => t === vampTargets[0])) {
        const victimId = vampTargets[0];
        const nightDamage = 2 + room.day; // Night 1 = 3 DMG, Night 2 = 4 DMG, etc.
        room.logs.unshift(`🦇 The Vampires struck in unison during Night ${room.day}!`);
        applyDamage(room, victimId, nightDamage, `Vampire Night ${room.day} Attack`);
      } else {
        room.logs.unshift(`🌫️ The Vampires failed to agree on a single target during Night ${room.day}!`);
      }

      if (!checkWinner(room)) {
        startDayPhase(room, room.day + 1);
      }
    }

    broadcastRoom(roomCode);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Blood & Silver Multiplayer Server running on port ${PORT}`);
});