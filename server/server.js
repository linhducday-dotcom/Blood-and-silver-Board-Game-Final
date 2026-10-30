const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/', (req, res) => {
  res.send('Blood & Silver Multiplayer Server is Running!');
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const CARD_CATALOG = [
  // Early Poke (2 DMG) - Abundant
  { id: 'iron_dagger', name: 'Iron Dagger', cost: 1, copies: 7, category: 'Attack', minDay: 1, needsTarget: true, desc: 'Deal 2 DMG to any player.' },
  { id: 'silver_caltrops', name: 'Silver Caltrops', cost: 1, copies: 4, category: 'Attack', minDay: 1, needsTarget: true, desc: 'Deal 2 DMG to a player and gain +1 Shield.' },

  // Defense & Healing
  { id: 'wooden_shield', name: 'Wooden Shield', cost: 1, copies: 6, category: 'Defense', minDay: 1, needsTarget: true, desc: 'Give any player +2 Shield until Dawn.' },
  { id: 'sacred_ward', name: 'Sacred Ward', cost: 2, copies: 4, category: 'Defense', minDay: 1, needsTarget: true, desc: 'Give any player +4 Shield until Dawn.' },
  { id: 'healing_salve', name: 'Healing Salve', cost: 1, copies: 4, category: 'Heal', minDay: 1, needsTarget: true, desc: 'Restore +3 HP to any player (max 10 HP).' },

  // Turn Order & Economy Manipulation
  { id: 'royal_decree', name: 'Royal Decree', cost: 1, copies: 3, category: 'Order', minDay: 1, needsTarget: true, desc: "Target player claims Turn #1 (First Player) at tomorrow's Dawn!" },
  { id: 'shadow_swap', name: 'Shadow Swap', cost: 0, copies: 3, category: 'Order', minDay: 1, needsTarget: true, desc: 'FREE: Swap your current Turn Order seat with another player!' },
  { id: 'time_twist', name: 'Time Twist', cost: 1, copies: 2, category: 'Order', minDay: 1, needsTarget: false, desc: 'Reverse the Turn Order direction and draw 1 card.' },

  // Early Intel & Utility
  { id: 'bloodhound', name: 'Bloodhound', cost: 1, copies: 3, category: 'Intel', minDay: 1, needsTarget: true, desc: 'Inspect a player: Privately peek at 1 random card in their hand.' },
  { id: 'cutpurse', name: 'Cutpurse', cost: 0, copies: 3, category: 'Trick', minDay: 1, needsTarget: true, desc: 'FREE: Steal up to 1G and 1 random card from a player.' },

  // Mid & Day 3+ Awakening Cards
  { id: 'holy_water', name: 'Holy Water', cost: 2, copies: 3, category: 'Attack', minDay: 1, needsTarget: true, desc: 'Deal 3 DMG (Upgrades to 4 DMG on Day 3+).' },
  { id: 'inquisitor_lens', name: "Inquisitor's Lens", cost: 2, copies: 3, category: 'Intel', minDay: 3, needsTarget: true, desc: "[Day 3+ Only] Privately reveal a player's exact secret Role!" },
  { id: 'executioner_pistol', name: "Executioner's Pistol", cost: 3, copies: 2, category: 'Attack', minDay: 3, needsTarget: true, desc: '[Day 3+ Only] Deal 5 Piercing DMG (ignores Shield).' },
  { id: 'vampiric_curse', name: 'Vampiric Curse', cost: 4, copies: 1, category: 'Twist', minDay: 3, needsTarget: true, desc: '[Day 3+ Only] Convert a player (or yourself!) into a Vampire.' },
  { id: 'purifying_elixir', name: 'Purifying Elixir', cost: 4, copies: 1, category: 'Twist', minDay: 3, needsTarget: true, desc: '[Day 3+ Only] Cleanse a Vampire into a Hunter and restore +3 HP.' }
];

const rooms = {};

function buildDeck() {
  const deck = [];
  let uid = 1;
  for (const item of CARD_CATALOG) {
    for (let i = 0; i < item.copies; i++) {
      deck.push({ ...item, uid: `${item.id}_${uid++}` });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function drawCard(room) {
  if (room.deck.length === 0) {
    room.deck = buildDeck();
    room.logs.unshift('🔄 The tactical deck was reshuffled.');
  }
  return room.deck.pop();
}

function getMaxTreasuryTake(day) {
  return day <= 2 ? 2 : 4;
}

function getNightDamagePool(day) {
  return 2 + day; // Night 1 = 3 DMG, Night 2 = 4 DMG, Night 3 = 5 DMG
}

function clearRoomTimer(room) {
  if (room && room.turnTimeout) {
    clearTimeout(room.turnTimeout);
    room.turnTimeout = null;
  }
  if (room) {
    room.turnDeadline = null;
  }
}

function startTurnTimer(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;
  clearRoomTimer(room);

  if (room.phase !== 'DAY' || room.turnTimerSetting === 'OFF') return;

  const seconds = room.turnTimerSetting === 'FAST' ? 15 : 30;
  room.turnDeadline = Date.now() + seconds * 1000;

  room.turnTimeout = setTimeout(() => {
    const activeRoom = rooms[roomCode];
    if (!activeRoom || activeRoom.phase !== 'DAY') return;

    const currentId = activeRoom.turnOrder[activeRoom.currentTurnIndex];
    const currentPlayer = activeRoom.players.find(p => p.id === currentId);

    if (currentPlayer && currentPlayer.alive) {
      // Auto-take remaining allowed gold if timer expires
      const maxTake = getMaxTreasuryTake(activeRoom.day);
      const allowance = Math.max(0, maxTake - currentPlayer.tookGoldThisTurn);
      const autoGold = Math.min(allowance, activeRoom.commonwealthGold);
      if (autoGold > 0) {
        currentPlayer.gold += autoGold;
        currentPlayer.tookGoldThisTurn += autoGold;
        activeRoom.commonwealthGold -= autoGold;
      }
      // Trim hand to 4 cards if needed
      while (currentPlayer.hand.length > 4) {
        currentPlayer.hand.pop();
      }
      activeRoom.logs.unshift(`⏰ Time expired for ${currentPlayer.name}! Auto-claimed ${autoGold}G and ended turn.`);
    }

    advanceDayTurn(activeRoom, roomCode);
    runBotsIfNeeded(roomCode);
    broadcastRoom(roomCode);
  }, seconds * 1000);
}

// UPDATED WIN CONDITION: Total Annihilation for BOTH sides!
function checkWinCondition(room) {
  const alive = room.players.filter(p => p.alive);
  const hunters = alive.filter(p => p.role === 'Hunter').length;
  const vampires = alive.filter(p => p.role === 'Vampire').length;

  if (vampires === 0 && hunters === 0) {
    clearRoomTimer(room);
    room.phase = 'GAME_OVER';
    room.winner = 'Crimson Stalemate (All Fallen)';
    room.logs.unshift('💀 Both factions have perished in the final clash!');
    return true;
  }
  if (vampires === 0) {
    clearRoomTimer(room);
    room.phase = 'GAME_OVER';
    room.winner = 'Hunters (Order of Dawn)';
    room.logs.unshift('🏆 VICTORY! Every last Vampire has been slain! The Hunters prevail!');
    return true;
  }
  if (hunters === 0) {
    clearRoomTimer(room);
    room.phase = 'GAME_OVER';
    room.winner = 'Vampires (Crimson Coven)';
    room.logs.unshift('🩸 VICTORY! Every last Hunter has been eliminated! The Vampires rule the night!');
    return true;
  }
  return false;
}

function dealDamage(room, attackerName, target, amount, sourceName, piercing = false) {
  if (!target.alive) return;
  let remaining = amount;
  let blocked = 0;

  if (!piercing && target.shield > 0) {
    blocked = Math.min(target.shield, remaining);
    target.shield -= blocked;
    remaining -= blocked;
  }

  target.hp = Math.max(0, target.hp - remaining);
  const blockText = blocked > 0 ? ` (${blocked} blocked by Shield)` : '';
  room.logs.unshift(`🩸 ${target.name} took ${remaining} DMG from ${attackerName}'s ${sourceName}${blockText} [HP: ${target.hp}/10].`);

  if (target.hp <= 0) {
    target.alive = false;
    room.logs.unshift(`💀 ${target.name} has fallen! Their true role was: ${target.role}.`);
    checkWinCondition(room);
  }
}

function getDeckSummary(room) {
  const counts = {};
  for (const c of room.deck) {
    counts[c.id] = (counts[c.id] || 0) + 1;
  }
  return CARD_CATALOG.map(c => ({
    id: c.id,
    name: c.name,
    cost: c.cost,
    category: c.category,
    minDay: c.minDay,
    desc: c.desc,
    remaining: counts[c.id] || 0,
    total: c.copies
  }));
}

function getPublicRoomList() {
  const openLobbies = [];
  const inProgress = [];

  Object.values(rooms).forEach(r => {
    const host = r.players[0]?.name || 'Host';
    if (r.phase === 'LOBBY') {
      openLobbies.push({
        roomCode: r.roomCode,
        hostName: host,
        playerCount: r.players.length,
        maxPlayers: 8,
        turnTimerSetting: r.turnTimerSetting
      });
    } else if (r.phase === 'DAY' || r.phase === 'NIGHT') {
      inProgress.push({
        roomCode: r.roomCode,
        hostName: host,
        day: r.day,
        phase: r.phase,
        playerCount: r.players.length,
        spectatorCount: (r.spectators || []).length
      });
    }
  });

  return { openLobbies, inProgress };
}

function broadcastRoom(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  const deckSummary = getDeckSummary(room);
  const maxTake = getMaxTreasuryTake(room.day);
  const nightDmgPool = getNightDamagePool(room.day);
  const hostId = room.players[0]?.id || null;

  const buildPublicPlayers = (viewer) =>
    room.players.map(p => {
      const turnIdx = room.turnOrder.indexOf(p.id);
      const isRevealed =
        room.phase === 'GAME_OVER' ||
        !p.alive ||
        (viewer && p.id === viewer.id) ||
        (viewer && viewer.role === 'Vampire' && p.role === 'Vampire') ||
        (viewer && viewer.knownRoles && viewer.knownRoles[p.id]);

      return {
        id: p.id,
        name: p.name,
        isBot: !!p.isBot,
        ready: !!p.ready,
        hp: p.hp,
        maxHp: 10,
        shield: p.shield,
        gold: p.gold,
        tookGoldThisTurn: p.tookGoldThisTurn,
        alive: p.alive,
        cardCount: p.hand.length,
        turnPosition: turnIdx !== -1 ? turnIdx + 1 : null,
        role: isRevealed ? p.role : 'Hidden',
        isNextFirst: room.nextDayFirstPlayerId === p.id,
        nightSubmitted: !!room.nightActions[p.id]
      };
    });

  // Send personalized state to each seated player
  room.players.forEach(viewer => {
    if (viewer.isBot) return;
    io.to(viewer.socketId).emit('gameState', {
      roomCode: room.roomCode,
      hostId,
      isSpectator: false,
      phase: room.phase,
      day: room.day,
      winner: room.winner,
      turnTimerSetting: room.turnTimerSetting,
      turnDeadline: room.turnDeadline,
      commonwealthGold: room.commonwealthGold,
      maxTreasuryTake: maxTake,
      nightDamagePool: nightDmgPool,
      turnOrder: room.turnOrder,
      currentTurnPlayerId: room.phase === 'DAY' ? room.turnOrder[room.currentTurnIndex] : null,
      nextDayFirstPlayerId: room.nextDayFirstPlayerId,
      players: buildPublicPlayers(viewer),
      me: {
        id: viewer.id,
        name: viewer.name,
        ready: !!viewer.ready,
        role: viewer.role,
        hp: viewer.hp,
        shield: viewer.shield,
        gold: viewer.gold,
        tookGoldThisTurn: viewer.tookGoldThisTurn,
        alive: viewer.alive,
        hand: viewer.hand,
        intel: viewer.intel,
        nightSubmitted: !!room.nightActions[viewer.id]
      },
      logs: room.logs.slice(0, 40),
      deckCount: room.deck.length,
      deckSummary,
      catalog: CARD_CATALOG
    });
  });

  // Send TV / Spectator state to any spectators
  (room.spectators || []).forEach(specSocketId => {
    io.to(specSocketId).emit('gameState', {
      roomCode: room.roomCode,
      hostId,
      isSpectator: true,
      phase: room.phase,
      day: room.day,
      winner: room.winner,
      turnTimerSetting: room.turnTimerSetting,
      turnDeadline: room.turnDeadline,
      commonwealthGold: room.commonwealthGold,
      maxTreasuryTake: maxTake,
      nightDamagePool: nightDmgPool,
      turnOrder: room.turnOrder,
      currentTurnPlayerId: room.phase === 'DAY' ? room.turnOrder[room.currentTurnIndex] : null,
      nextDayFirstPlayerId: room.nextDayFirstPlayerId,
      players: buildPublicPlayers(null),
      me: {
        id: 'spectator',
        name: 'TV Display',
        role: 'Spectator',
        hp: 10,
        shield: 0,
        gold: 0,
        tookGoldThisTurn: 0,
        alive: false,
        hand: [],
        intel: ['📺 Watching table in TV Display Mode.'],
        nightSubmitted: true
      },
      logs: room.logs.slice(0, 40),
      deckCount: room.deck.length,
      deckSummary,
      catalog: CARD_CATALOG
    });
  });

  io.emit('publicRoomsList', getPublicRoomList());
}

function advanceDayTurn(room, roomCode) {
  if (checkWinCondition(room)) return;

  const totalSlots = room.turnOrder.length;
  let nextIdx = room.currentTurnIndex + 1;

  while (nextIdx < totalSlots) {
    const nextPlayerId = room.turnOrder[nextIdx];
    const nextPlayer = room.players.find(p => p.id === nextPlayerId);
    if (nextPlayer && nextPlayer.alive) {
      room.currentTurnIndex = nextIdx;
      nextPlayer.tookGoldThisTurn = 0;
      room.logs.unshift(`☀️ It is now ${nextPlayer.name}'s turn (Seat #${nextIdx + 1}).`);
      startTurnTimer(roomCode || room.roomCode);
      return;
    }
    nextIdx++;
  }

  // Everyone finished their Day turn -> Enter NIGHT
  clearRoomTimer(room);
  room.phase = 'NIGHT';
  room.nightActions = {};
  const dmgPool = getNightDamagePool(room.day);
  room.logs.unshift(`🌙 Night ${room.day} falls! All living players must submit their secret Night Consensus (Vampire Blood Pool: ${dmgPool} DMG).`);
}

function resolveNight(room) {
  const alivePlayers = room.players.filter(p => p.alive);
  const vampires = alivePlayers.filter(p => p.role === 'Vampire');
  const dmgPool = getNightDamagePool(room.day);

  let vampireUsurpId = null;

  alivePlayers.forEach(p => {
    const act = room.nightActions[p.id];
    if (!act) return;

    if (p.role === 'Hunter') {
      if (act.choice === 'SHIELD') {
        p.shield += 2;
        p.intel.unshift(`🌙 Night ${room.day}: Your Night Watch granted you +2 Shield.`);
      } else if (act.choice === 'DRAW') {
        const c = drawCard(room);
        p.hand.push(c);
        p.intel.unshift(`🌙 Night ${room.day}: You scavenged [${c.name}] in the dark.`);
      } else if (act.choice === 'GOLD') {
        p.gold += 1;
        p.intel.unshift(`🌙 Night ${room.day}: You stashed +1 secret Gold.`);
      }
    } else if (p.role === 'Vampire') {
      if (act.choice === 'SHIELD') {
        p.shield += 2;
        p.intel.unshift(`🩸 Night ${room.day}: Shadow Cloak granted you +2 Shield.`);
      } else if (act.choice === 'DRAW') {
        const c = drawCard(room);
        p.hand.push(c);
        p.intel.unshift(`🩸 Night ${room.day}: Blood Pact drew [${c.name}].`);
      } else if (act.choice === 'USURP') {
        vampireUsurpId = p.id;
        p.intel.unshift(`🩸 Night ${room.day}: You rigged the Dawn bells to seize Turn #1!`);
      }
    }
  });

  if (vampires.length > 0) {
    const targetWeights = {};
    vampires.forEach(v => {
      const act = room.nightActions[v.id];
      if (act && act.strikes && typeof act.strikes === 'object') {
        Object.entries(act.strikes).forEach(([targetId, pts]) => {
          const numPts = Number(pts) || 0;
          if (numPts > 0) {
            targetWeights[targetId] = (targetWeights[targetId] || 0) + numPts;
          }
        });
      }
    });

    const entries = Object.entries(targetWeights).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      const targets = alivePlayers.filter(p => p.role === 'Hunter');
      const fallback = targets[0] || alivePlayers[0];
      if (fallback) {
        dealDamage(room, 'The Crimson Coven', fallback, dmgPool, 'Night Strike', false);
      }
    } else {
      const totalVotes = entries.reduce((acc, e) => acc + e[1], 0);
      let allocated = 0;
      const allocations = {};

      entries.forEach(([tId, weight], idx) => {
        if (idx === entries.length - 1) {
          allocations[tId] = Math.max(0, dmgPool - allocated);
        } else {
          const share = Math.round((weight / totalVotes) * dmgPool);
          const actual = Math.min(dmgPool - allocated, share);
          allocations[tId] = actual;
          allocated += actual;
        }
      });

      Object.entries(allocations).forEach(([tId, dmg]) => {
        if (dmg > 0) {
          const victim = room.players.find(p => p.id === tId);
          if (victim && victim.alive) {
            dealDamage(room, 'The Crimson Coven', victim, dmg, 'Night Strike', false);
          }
        }
      });
    }
  }

  if (checkWinCondition(room)) return;

  room.players.filter(p => p.alive).forEach(p => {
    if (room.day <= 2 && p.shield > 0) {
      p.gold += 1;
      p.intel.unshift(`🛡️ Shield Overcharge! Your unbroken Shield from Night ${room.day} granted +1 Bonus Gold!`);
    }
    p.shield = 0;
    p.tookGoldThisTurn = 0;
    const dawnCard = drawCard(room);
    p.hand.push(dawnCard);
  });

  room.day += 1;
  room.phase = 'DAY';

  let newOrder = room.turnOrder.filter(id => {
    const pl = room.players.find(p => p.id === id);
    return pl && pl.alive;
  });

  if (newOrder.length > 1) {
    const first = newOrder.shift();
    newOrder.push(first);
  }

  const decreedId = room.nextDayFirstPlayerId || vampireUsurpId;
  if (decreedId && newOrder.includes(decreedId)) {
    while (newOrder[0] !== decreedId) {
      newOrder.push(newOrder.shift());
    }
    const vip = room.players.find(p => p.id === decreedId);
    if (vip) {
      room.logs.unshift(`👑 By special decree, ${vip.name} seizes the Turn #1 initiative for Day ${room.day}!`);
    }
  }
  room.nextDayFirstPlayerId = null;
  room.turnOrder = newOrder;
  room.currentTurnIndex = 0;

  const aliveCount = room.players.filter(p => p.alive).length;
  room.commonwealthGold = aliveCount * 2 + 3;

  if (room.day === 3) {
    room.logs.unshift(`🔥 DAY 3 AWAKENING! Inquisitor's Lens, Executioner's Pistol, Curses & Elixirs are now UNLOCKED! Commonwealth limit raised to 4G!`);
  }
  const firstPlayer = room.players.find(p => p.id === room.turnOrder[0]);
  room.logs.unshift(`🌅 Dawn of Day ${room.day}! Commonwealth Treasury replenished to ${room.commonwealthGold}G. ${firstPlayer ? firstPlayer.name : ''} leads Turn #1.`);
  startTurnTimer(room.roomCode);
}

function beginMatch(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.players.length < 2) return;

  room.deck = buildDeck();
  room.day = 1;
  room.phase = 'DAY';
  room.winner = null;
  room.nextDayFirstPlayerId = null;
  room.nightActions = {};

  const numPlayers = room.players.length;
  const numVamps = numPlayers >= 7 ? 3 : numPlayers >= 5 ? 2 : 1;

  const indices = room.players.map((_, idx) => idx);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const vampSet = new Set(indices.slice(0, numVamps));

  room.players.forEach((p, idx) => {
    p.role = vampSet.has(idx) ? 'Vampire' : 'Hunter';
    p.hp = 10;
    p.shield = 0;
    p.gold = 1;
    p.tookGoldThisTurn = 0;
    p.alive = true;
    p.knownRoles = {};
    p.hand = [drawCard(room), drawCard(room)];
    p.intel = [`🎭 Secret Role: ${p.role}. Total Annihilation Rule: Eliminate ALL enemies to win!`];
  });

  room.turnOrder = room.players.map(p => p.id);
  for (let i = room.turnOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [room.turnOrder[i], room.turnOrder[j]] = [room.turnOrder[j], room.turnOrder[i]];
  }
  room.currentTurnIndex = 0;
  room.commonwealthGold = numPlayers * 2 + 3;

  const firstP = room.players.find(p => p.id === room.turnOrder[0]);
  room.logs = [
    `🌅 Day 1 begins! Everyone starts with 10 HP, 1G, and 2 cards. Eliminate ALL rivals to win!`,
    `👑 ${firstP.name} has Turn #1!`
  ];

  startTurnTimer(roomCode);
  runBotsIfNeeded(roomCode);
  broadcastRoom(roomCode);
}

io.on('connection', (socket) => {
  socket.emit('publicRoomsList', getPublicRoomList());

  socket.on('getPublicRooms', () => {
    socket.emit('publicRoomsList', getPublicRoomList());
  });

  socket.on('createRoom', ({ playerName }) => {
    const name = (playerName || 'Hunter').trim().slice(0, 18);
    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const playerId = 'p_' + Math.random().toString(36).substring(2, 9);

    rooms[roomCode] = {
      roomCode,
      phase: 'LOBBY',
      day: 1,
      winner: null,
      turnTimerSetting: '30', // 'OFF' | '30' | 'FAST' (15s)
      turnDeadline: null,
      turnTimeout: null,
      commonwealthGold: 0,
      turnOrder: [],
      currentTurnIndex: 0,
      nextDayFirstPlayerId: null,
      deck: [],
      nightActions: {},
      spectators: [],
      logs: [`🏰 Room ${roomCode} created by ${name}. Waiting for players...`],
      players: [{
        id: playerId,
        socketId: socket.id,
        name,
        ready: false,
        role: 'Hunter',
        hp: 10,
        shield: 0,
        gold: 1,
        tookGoldThisTurn: 0,
        alive: true,
        hand: [],
        intel: [],
        knownRoles: {}
      }]
    };

    socket.join(roomCode);
    socket.data = { roomCode, playerId };
    broadcastRoom(roomCode);
  });

  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const code = (roomCode || '').trim().toUpperCase();
    const room = rooms[code];
    if (!room) {
      socket.emit('errorMsg', 'Room not found! Check your 4-letter code.');
      return;
    }

    const cleanName = (playerName || 'Guest').trim().slice(0, 18);

    const existing = room.players.find(p => p.name.toLowerCase() === cleanName.toLowerCase());
    if (existing && room.phase !== 'LOBBY') {
      existing.socketId = socket.id;
      socket.join(code);
      socket.data = { roomCode: code, playerId: existing.id };
      broadcastRoom(code);
      return;
    }

    if (room.phase !== 'LOBBY') {
      socket.emit('errorMsg', 'Game already started! Use Watch Mode to spectate.');
      return;
    }
    if (room.players.length >= 8) {
      socket.emit('errorMsg', 'Room is full (8/8 players).');
      return;
    }

    const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
    room.players.push({
      id: playerId,
      socketId: socket.id,
      name: cleanName,
      ready: false,
      role: 'Hunter',
      hp: 10,
      shield: 0,
      gold: 1,
      tookGoldThisTurn: 0,
      alive: true,
      hand: [],
      intel: [],
      knownRoles: {}
    });

    socket.join(code);
    socket.data = { roomCode: code, playerId };
    room.logs.unshift(`👋 ${cleanName} joined the lobby.`);
    broadcastRoom(code);
  });

  socket.on('watchRoom', ({ roomCode }) => {
    const code = (roomCode || '').trim().toUpperCase();
    const room = rooms[code];
    if (!room) {
      socket.emit('errorMsg', 'Room not found to watch!');
      return;
    }
    room.spectators = room.spectators || [];
    if (!room.spectators.includes(socket.id)) {
      room.spectators.push(socket.id);
    }
    socket.join(code);
    socket.data = { roomCode: code, playerId: 'spectator' };
    broadcastRoom(code);
  });

  socket.on('leaveRoom', () => {
    const { roomCode, playerId } = socket.data || {};
    const room = rooms[roomCode];
    if (!room) return;

    if (playerId === 'spectator') {
      room.spectators = (room.spectators || []).filter(id => id !== socket.id);
    } else if (room.phase === 'LOBBY') {
      room.players = room.players.filter(p => p.id !== playerId);
      if (room.players.length === 0) {
        clearRoomTimer(room);
        delete rooms[roomCode];
        io.emit('publicRoomsList', getPublicRoomList());
        return;
      }
    }
    socket.leave(roomCode);
    socket.data = {};
    broadcastRoom(roomCode);
  });

  socket.on('toggleReady', () => {
    const { roomCode, playerId } = socket.data || {};
    const room = rooms[roomCode];
    if (!room || room.phase !== 'LOBBY') return;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return;
    player.ready = !player.ready;

    // Auto-start if at least 3 players are in the room and everyone is Ready
    const allReady = room.players.length >= 3 && room.players.every(p => p.ready);
    if (allReady) {
      beginMatch(roomCode);
    } else {
      broadcastRoom(roomCode);
    }
  });

  socket.on('setTurnTimer', ({ setting }) => {
    const { roomCode } = socket.data || {};
    const room = rooms[roomCode];
    if (!room || room.phase !== 'LOBBY') return;
    if (['OFF', '30', 'FAST'].includes(setting)) {
      room.turnTimerSetting = setting;
      broadcastRoom(roomCode);
    }
  });

  socket.on('addBot', () => {
    const { roomCode } = socket.data || {};
    const room = rooms[roomCode];
    if (!room || room.phase !== 'LOBBY' || room.players.length >= 8) return;

    const botNames = ['Victor', 'Elena', 'Marcus', 'Selene', 'Gideon', 'Raven', 'Lucian', 'Clara'];
    const used = new Set(room.players.map(p => p.name));
    const name = botNames.find(n => !used.has(n)) || `Bot_${room.players.length + 1}`;
    const playerId = 'bot_' + Math.random().toString(36).substring(2, 9);

    room.players.push({
      id: playerId,
      socketId: 'BOT',
      isBot: true,
      ready: true,
      name,
      role: 'Hunter',
      hp: 10,
      shield: 0,
      gold: 1,
      tookGoldThisTurn: 0,
      alive: true,
      hand: [],
      intel: [],
      knownRoles: {}
    });

    room.logs.unshift(`🤖 AI Bot ${name} joined the lobby.`);
    broadcastRoom(roomCode);
  });

  socket.on('startGame', () => {
    const { roomCode } = socket.data || {};
    beginMatch(roomCode);
  });

  socket.on('takeGold', ({ amount }) => {
    const { roomCode, playerId } = socket.data || {};
    const room = rooms[roomCode];
    if (!room || room.phase !== 'DAY') return;
    if (room.turnOrder[room.currentTurnIndex] !== playerId) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player || !player.alive) return;

    const maxTake = getMaxTreasuryTake(room.day);
    const remainingAllowance = maxTake - player.tookGoldThisTurn;
    const req = Math.min(Number(amount) || 1, remainingAllowance, room.commonwealthGold);

    if (req <= 0) return;

    player.gold += req;
    player.tookGoldThisTurn += req;
    room.commonwealthGold -= req;

    room.logs.unshift(`🪙 ${player.name} took ${req}G from the Commonwealth (${room.commonwealthGold}G left).`);
    broadcastRoom(roomCode);
  });

  socket.on('cycleCard', ({ cardUid }) => {
    const { roomCode, playerId } = socket.data || {};
    const room = rooms[roomCode];
    if (!room || room.phase !== 'DAY') return;
    if (room.turnOrder[room.currentTurnIndex] !== playerId) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player || !player.alive || player.gold < 1) return;

    const idx = player.hand.findIndex(c => c.uid === cardUid);
    if (idx === -1) return;

    player.gold -= 1;
    const removed = player.hand.splice(idx, 1)[0];
    const drawn = drawCard(room);
    player.hand.push(drawn);

    player.intel.unshift(`🔄 Cycled [${removed.name}] for [${drawn.name}].`);
    room.logs.unshift(`🔄 ${player.name} paid 1G to cycle a card.`);
    broadcastRoom(roomCode);
  });

  socket.on('playCard', ({ cardUid, targetId }) => {
    const { roomCode, playerId } = socket.data || {};
    const room = rooms[roomCode];
    if (!room || room.phase !== 'DAY') return;
    if (room.turnOrder[room.currentTurnIndex] !== playerId) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player || !player.alive) return;

    const cardIdx = player.hand.findIndex(c => c.uid === cardUid);
    if (cardIdx === -1) return;
    const card = player.hand[cardIdx];

    if (room.day < (card.minDay || 1)) {
      socket.emit('errorMsg', `${card.name} is sealed until Day ${card.minDay}!`);
      return;
    }
    if (player.gold < card.cost) {
      socket.emit('errorMsg', 'Not enough Gold!');
      return;
    }

    const target = card.needsTarget ? room.players.find(p => p.id === targetId && p.alive) : player;
    if (card.needsTarget && !target) return;

    player.gold -= card.cost;
    player.hand.splice(cardIdx, 1);

    switch (card.id) {
      case 'iron_dagger':
        dealDamage(room, player.name, target, 2, 'Iron Dagger');
        break;
      case 'silver_caltrops':
        player.shield += 1;
        dealDamage(room, player.name, target, 2, 'Silver Caltrops');
        room.logs.unshift(`🛡️ ${player.name} gained +1 Shield from Silver Caltrops.`);
        break;
      case 'wooden_shield':
        target.shield += 2;
        room.logs.unshift(`🛡️ ${player.name} granted +2 Shield to ${target.name} (Wooden Shield).`);
        break;
      case 'sacred_ward':
        target.shield += 4;
        room.logs.unshift(`🛡️ ${player.name} granted +4 Shield to ${target.name} (Sacred Ward).`);
        break;
      case 'healing_salve':
        target.hp = Math.min(10, target.hp + 3);
        room.logs.unshift(`💚 ${player.name} restored +3 HP to ${target.name} [HP: ${target.hp}/10].`);
        break;
      case 'royal_decree':
        room.nextDayFirstPlayerId = target.id;
        room.logs.unshift(`👑 ${player.name} played Royal Decree! ${target.name} will seize Turn #1 at tomorrow's Dawn!`);
        break;
      case 'shadow_swap': {
        const i1 = room.turnOrder.indexOf(player.id);
        const i2 = room.turnOrder.indexOf(target.id);
        if (i1 !== -1 && i2 !== -1 && i1 !== i2) {
          [room.turnOrder[i1], room.turnOrder[i2]] = [room.turnOrder[i2], room.turnOrder[i1]];
          room.logs.unshift(`🔀 ${player.name} played Shadow Swap and traded Turn Order seats with ${target.name} (Seat #${i1 + 1} ↔ Seat #${i2 + 1})!`);
        }
        break;
      }
      case 'time_twist': {
        const currentActiveId = room.turnOrder[room.currentTurnIndex];
        room.turnOrder.reverse();
        room.currentTurnIndex = room.turnOrder.indexOf(currentActiveId);
        const bonus = drawCard(room);
        player.hand.push(bonus);
        room.logs.unshift(`⏳ ${player.name} cast Time Twist! The Turn Order has been reversed and they drew 1 card!`);
        break;
      }
      case 'bloodhound': {
        if (target.hand.length > 0) {
          const randCard = target.hand[Math.floor(Math.random() * target.hand.length)];
          player.intel.unshift(`🐕 Bloodhound on ${target.name}: You spotted [${randCard.name}] in their hand!`);
        } else {
          player.intel.unshift(`🐕 Bloodhound on ${target.name}: Their hand is completely empty!`);
        }
        room.logs.unshift(`🐕 ${player.name} used Bloodhound to sniff out ${target.name}'s equipment.`);
        break;
      }
      case 'cutpurse': {
        const stolenGold = Math.min(1, target.gold);
        target.gold -= stolenGold;
        player.gold += stolenGold;
        let stolenCardText = 'no cards';
        if (target.hand.length > 0) {
          const rIdx = Math.floor(Math.random() * target.hand.length);
          const stolenCard = target.hand.splice(rIdx, 1)[0];
          player.hand.push(stolenCard);
          stolenCardText = '1 card';
          player.intel.unshift(`🗡️ Cutpurse stole [${stolenCard.name}] from ${target.name}!`);
        }
        room.logs.unshift(`🗡️ ${player.name} played Cutpurse on ${target.name}, stealing ${stolenGold}G and ${stolenCardText}!`);
        break;
      }
      case 'holy_water': {
        const dmg = room.day >= 3 ? 4 : 3;
        dealDamage(room, player.name, target, dmg, 'Holy Water');
        break;
      }
      case 'inquisitor_lens': {
        player.knownRoles[target.id] = true;
        player.intel.unshift(`🔍 INQUISITOR'S LENS: ${target.name}'s true secret role is [${target.role.toUpperCase()}]!`);
        room.logs.unshift(`🔍 ${player.name} inspected ${target.name} with the Inquisitor's Lens!`);
        break;
      }
      case 'executioner_pistol':
        dealDamage(room, player.name, target, 5, "Executioner's Pistol", true);
        break;
      case 'vampiric_curse':
        target.role = 'Vampire';
        target.intel.unshift(`🦇 VAMPIRIC CURSE! You have been turned into a Vampire!`);
        player.intel.unshift(`🦇 You cursed ${target.name} into the Crimson Coven!`);
        room.logs.unshift(`🦇 ${player.name} cast Vampiric Curse on ${target.name}!`);
        checkWinCondition(room);
        break;
      case 'purifying_elixir':
        if (target.role === 'Vampire') {
          target.role = 'Hunter';
          target.intel.unshift(`✨ PURIFYING ELIXIR! Your curse was cleansed—you are now a Hunter!`);
        }
        target.hp = Math.min(10, target.hp + 3);
        room.logs.unshift(`✨ ${player.name} used Purifying Elixir on ${target.name}, cleansing any curse and restoring +3 HP!`);
        checkWinCondition(room);
        break;
    }

    broadcastRoom(roomCode);
  });

  socket.on('endTurn', () => {
    const { roomCode, playerId } = socket.data || {};
    const room = rooms[roomCode];
    if (!room || room.phase !== 'DAY') return;
    if (room.turnOrder[room.currentTurnIndex] !== playerId) return;

    const player = room.players.find(p => p.id === playerId);
    if (player && player.hand.length > 4) {
      while (player.hand.length > 4) {
        const dropped = player.hand.pop();
        player.intel.unshift(`🗑️ Hand limit (4): Discarded [${dropped.name}].`);
      }
    }

    advanceDayTurn(room, roomCode);
    runBotsIfNeeded(roomCode);
    broadcastRoom(roomCode);
  });

  socket.on('submitNightAction', ({ choice, strikes }) => {
    const { roomCode, playerId } = socket.data || {};
    const room = rooms[roomCode];
    if (!room || room.phase !== 'NIGHT') return;

    const player = room.players.find(p => p.id === playerId);
    if (!player || !player.alive) return;

    room.nightActions[playerId] = { choice: choice || 'SHIELD', strikes: strikes || {} };

    const allAliveSubmitted = room.players
      .filter(p => p.alive)
      .every(p => !!room.nightActions[p.id]);

    if (allAliveSubmitted) {
      resolveNight(room);
      runBotsIfNeeded(roomCode);
    }
    broadcastRoom(roomCode);
  });
});

function runBotsIfNeeded(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.phase === 'GAME_OVER') return;

  if (room.phase === 'DAY') {
    const currentId = room.turnOrder[room.currentTurnIndex];
    const activeBot = room.players.find(p => p.id === currentId && p.isBot && p.alive);
    if (activeBot) {
      setTimeout(() => {
        if (!rooms[roomCode] || room.phase !== 'DAY' || room.turnOrder[room.currentTurnIndex] !== activeBot.id) return;
        const maxTake = getMaxTreasuryTake(room.day);
        const take = Math.min(maxTake, room.commonwealthGold);
        if (take > 0) {
          activeBot.gold += take;
          activeBot.tookGoldThisTurn = take;
          room.commonwealthGold -= take;
          room.logs.unshift(`🪙 ${activeBot.name} took ${take}G from the Commonwealth.`);
        }
        const playableIdx = activeBot.hand.findIndex(c => c.cost <= activeBot.gold && room.day >= (c.minDay || 1));
        if (playableIdx !== -1) {
          const card = activeBot.hand.splice(playableIdx, 1)[0];
          activeBot.gold -= card.cost;
          if (card.category === 'Defense' || card.category === 'Heal') {
            activeBot.shield += 2;
            room.logs.unshift(`🛡️ ${activeBot.name} played ${card.name} defensively.`);
          } else {
            const enemies = room.players.filter(p => p.alive && p.id !== activeBot.id);
            const target = enemies[Math.floor(Math.random() * enemies.length)];
            if (target && card.category === 'Attack') {
              dealDamage(room, activeBot.name, target, 2, card.name);
            }
          }
        }
        advanceDayTurn(room, roomCode);
        broadcastRoom(roomCode);
        runBotsIfNeeded(roomCode);
      }, 950);
    }
  } else if (room.phase === 'NIGHT') {
    const aliveBots = room.players.filter(p => p.alive && p.isBot);
    aliveBots.forEach(bot => {
      if (!room.nightActions[bot.id]) {
        const strikes = {};
        if (bot.role === 'Vampire') {
          const hunters = room.players.filter(p => p.alive && p.role !== 'Vampire');
          const t = hunters[Math.floor(Math.random() * hunters.length)];
          if (t) strikes[t.id] = getNightDamagePool(room.day);
        }
        room.nightActions[bot.id] = { choice: 'SHIELD', strikes };
      }
    });

    const allAliveSubmitted = room.players.filter(p => p.alive).every(p => !!room.nightActions[p.id]);
    if (allAliveSubmitted) {
      resolveNight(room);
      broadcastRoom(roomCode);
      runBotsIfNeeded(roomCode);
    }
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Blood & Silver server running on port ${PORT}`);
});