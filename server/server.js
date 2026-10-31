// server/server.js
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

const AVATAR_NAMES = [
  'The Silver Templar',
  'The Plague Apothecary',
  'The Veteran Witch Hunter',
  'The Scarlet Aristocrat',
  'The Crimson Countess',
  'The Shadow Lord',
  'The High Inquisitor',
  'The Midnight Cutpurse'
];

const CARD_CATALOG = [
  // Early Poke (2 DMG)
  { id: 'iron_dagger', name: 'Iron Dagger', cost: 1, copies: 7, category: 'Attack', minDay: 1, needsTarget: true, desc: 'Deal 2 DMG to any player.' },
  { id: 'silver_caltrops', name: 'Silver Caltrops', cost: 1, copies: 4, category: 'Attack', minDay: 1, needsTarget: true, desc: 'Deal 2 DMG to a player and gain +1 Shield.' },
  
  // Defense & Healing
  { id: 'wooden_shield', name: 'Wooden Shield', cost: 1, copies: 6, category: 'Defense', minDay: 1, needsTarget: true, desc: 'Give any player +2 Shield until Dawn.' },
  { id: 'sacred_ward', name: 'Sacred Ward', cost: 2, copies: 4, category: 'Defense', minDay: 1, needsTarget: true, desc: 'Give any player +4 Shield until Dawn.' },
  { id: 'healing_salve', name: 'Healing Salve', cost: 1, copies: 4, category: 'Heal', minDay: 1, needsTarget: true, desc: 'Restore +3 HP to any player (max 10 HP).' },

  // Turn Order & Economy Manipulation
  { id: 'royal_decree', name: 'Royal Decree', cost: 1, copies: 3, category: 'Order', minDay: 1, needsTarget: true, desc: "Target player claims Turn #1 at tomorrow's Dawn!" },
  { id: 'shadow_swap', name: 'Shadow Swap', cost: 0, copies: 3, category: 'Order', minDay: 1, needsTarget: true, desc: 'FREE: Swap your current Turn Order seat with another player!' },
  { id: 'time_twist', name: 'Time Twist', cost: 1, copies: 2, category: 'Order', minDay: 1, needsTarget: false, desc: 'Reverse the Turn Order direction and draw 1 card.' },

  // Early Intel & Trickery
  { id: 'bloodhound', name: 'Bloodhound', cost: 1, copies: 3, category: 'Intel', minDay: 1, needsTarget: true, desc: 'Privately peek at 1 random card in a player\'s hand.' },
  { id: 'cutpurse', name: 'Cutpurse', cost: 0, copies: 3, category: 'Trick', minDay: 1, needsTarget: true, desc: 'FREE: Steal up to 1G and 1 random card from a player.' },

  // Mid & Day 3+ Awakening Cards
  { id: 'holy_water', name: 'Holy Water', cost: 2, copies: 3, category: 'Attack', minDay: 1, needsTarget: true, desc: 'Deal 3 DMG (Upgrades to 4 DMG on Day 3+).' },
  { id: 'inquisitor_lens', name: "Inquisitor's Lens", cost: 2, copies: 3, category: 'Intel', minDay: 3, needsTarget: true, desc: "[Day 3+ Only] Privately reveal a player's true Role!" },
  { id: 'executioner_pistol', name: "Executioner's Pistol", cost: 3, copies: 2, category: 'Attack', minDay: 3, needsTarget: true, desc: '[Day 3+ Only] Deal 5 Piercing DMG (ignores Shield).' },
  { id: 'vampiric_curse', name: 'Vampiric Curse', cost: 5, copies: 1, category: 'Twist', minDay: 3, needsTarget: true, desc: '[Day 3+ Only] Convert a player (or yourself!) into a Vampire.' },
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
  return 2 + day;
}

function checkWinCondition(room) {
  const alive = room.players.filter(p => p.alive);
  const hunters = alive.filter(p => p.role === 'Hunter').length;
  const vampires = alive.filter(p => p.role === 'Vampire').length;

  if (vampires === 0) {
    room.phase = 'GAME_OVER';
    room.winner = 'Hunters (Order of Dawn)';
    room.logs.unshift('🏆 VICTORY! All Vampires have been vanquished! The Order of Dawn prevails!');
    return true;
  }
  if (vampires >= hunters) {
    room.phase = 'GAME_OVER';
    room.winner = 'Vampires (Crimson Coven)';
    room.logs.unshift('🩸 VICTORY! The Crimson Coven equals or outnumbers the Hunters and claims the town!');
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

function broadcastRoom(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  const deckSummary = getDeckSummary(room);
  const maxTake = getMaxTreasuryTake(room.day);
  const nightDmgPool = getNightDamagePool(room.day);

  room.players.forEach(viewer => {
    const publicPlayers = room.players.map((p, idx) => {
      const turnIdx = room.turnOrder.indexOf(p.id);
      const isRevealed = room.phase === 'GAME_OVER' || !p.alive || p.id === viewer.id ||
        (viewer.role === 'Vampire' && p.role === 'Vampire') ||
        (viewer.knownRoles && viewer.knownRoles[p.id]);

      return {
        id: p.id,
        name: p.name,
        avatarId: p.avatarId || ((idx % 8) + 1),
        avatarTitle: AVATAR_NAMES[(p.avatarId ? p.avatarId - 1 : idx) % 8],
        hp: p.hp,
        maxHp: 10,
        shield: p.shield,
        gold: p.gold,
        accusations: p.accusations || 0,
        tookGoldThisTurn: p.tookGoldThisTurn,
        alive: p.alive,
        cardCount: p.hand.length,
        turnPosition: turnIdx !== -1 ? turnIdx + 1 : idx + 1,
        role: isRevealed ? p.role : 'Hidden',
        isNextFirst: room.nextDayFirstPlayerId === p.id,
        nightSubmitted: !!room.nightActions[p.id]
      };
    });

    io.to(viewer.socketId).emit('gameState', {
      roomCode: room.roomCode,
      hostId: room.hostId,
      phase: room.phase,
      day: room.day,
      winner: room.winner,
      commonwealthGold: room.commonwealthGold,
      maxTreasuryTake: maxTake,
      nightDamagePool: nightDmgPool,
      turnOrder: room.turnOrder,
      currentTurnPlayerId: room.phase === 'DAY' ? room.turnOrder[room.currentTurnIndex] : null,
      nextDayFirstPlayerId: room.nextDayFirstPlayerId,
      players: publicPlayers,
      me: {
        id: viewer.id,
        name: viewer.name,
        avatarId: viewer.avatarId || 1,
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
      chatMessages: (room.chatMessages || []).slice(-50),
      deckCount: room.deck.length,
      deckSummary,
      catalog: CARD_CATALOG
    });
  });
}

function advanceDayTurn(room) {
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
      return;
    }
    nextIdx++;
  }

  room.phase = 'NIGHT';
  room.nightActions = {};
  const dmgPool = getNightDamagePool(room.day);
  room.logs.unshift(`🌙 Night ${room.day} falls! Submit your secret Night Action (Vampire Blood Pool: ${dmgPool} DMG).`);
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
        p.intel.unshift(`🌙 Night ${room.day}: Night Watch granted +2 Shield.`);
      } else if (act.choice === 'DRAW') {
        const c = drawCard(room);
        p.hand.push(c);
        p.intel.unshift(`🌙 Night ${room.day}: Scavenged [${c.name}] in the dark.`);
      } else if (act.choice === 'GOLD') {
        p.gold += 1;
        p.intel.unshift(`🌙 Night ${room.day}: Stashed +1 secret Gold.`);
      }
    } else if (p.role === 'Vampire') {
      if (act.choice === 'SHIELD') {
        p.shield += 2;
        p.intel.unshift(`🩸 Night ${room.day}: Shadow Cloak granted +2 Shield.`);
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
      p.intel.unshift(`🛡️ Shield Overcharge! Unbroken Shield granted +1 Bonus Gold!`);
    }
    p.shield = 0;
    p.tookGoldThisTurn = 0;
    p.accusations = 0;
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
      room.logs.unshift(`👑 By special decree, ${vip.name} seizes Turn #1 for Day ${room.day}!`);
    }
  }
  room.nextDayFirstPlayerId = null;
  room.turnOrder = newOrder;
  room.currentTurnIndex = 0;

  const aliveCount = room.players.filter(p => p.alive).length;
  room.commonwealthGold = aliveCount * 2 + 3;

  if (room.day === 3) {
    room.logs.unshift(`🔥 DAY 3 AWAKENING! High-tier relics unlocked & Treasury take limit raised to 4G!`);
  }
  const firstPlayer = room.players.find(p => p.id === room.turnOrder[0]);
  room.logs.unshift(`🌅 Dawn of Day ${room.day}! Treasury holds ${room.commonwealthGold}G. ${firstPlayer ? firstPlayer.name : ''} leads Turn #1.`);
}

io.on('connection', (socket) => {
  socket.on('getPublicRooms', () => {
    const list = Object.values(rooms).map(r => ({
      roomCode: r.roomCode,
      phase: r.phase,
      day: r.day,
      playerCount: r.players.length,
      maxPlayers: 8,
      hostName: r.players[0]?.name || 'Host'
    }));
    socket.emit('publicRoomsList', list);
  });

  socket.on('createRoom', ({ playerName, avatarId }) => {
    const name = (playerName || 'Hunter').trim().slice(0, 18);
    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const playerId = 'p_' + Math.random().toString(36).substring(2, 9);

    rooms[roomCode] = {
      roomCode,
      hostId: playerId,
      phase: 'LOBBY',
      day: 1,
      winner: null,
      commonwealthGold: 0,
      turnOrder: [],
      currentTurnIndex: 0,
      nextDayFirstPlayerId: null,
      deck: [],
      nightActions: {},
      logs: [`🏰 Room ${roomCode} created by ${name}. Waiting for players...`],
      chatMessages: [
        { id: 'sys_1', sender: 'Manor Steward', avatarId: 7, text: 'Welcome to Blood & Silver. Choose your portrait and prepare for Dawn.', time: 'Now', isSystem: true }
      ],
      players: [{
        id: playerId,
        socketId: socket.id,
        name,
        avatarId: avatarId || 1,
        role: 'Hunter',
        hp: 10,
        shield: 0,
        gold: 1,
        accusations: 0,
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

  socket.on('joinRoom', ({ roomCode, playerName, avatarId }) => {
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
      socket.emit('errorMsg', 'Game has already started!');
      return;
    }
    if (room.players.length >= 8) {
      socket.emit('errorMsg', 'Room is full (8/8 players)!');
      return;
    }

    const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
    const chosenAvatar = avatarId || ((room.players.length % 8) + 1);

    room.players.push({
      id: playerId,
      socketId: socket.id,
      name: cleanName,
      avatarId: chosenAvatar,
      role: 'Hunter',
      hp: 10,
      shield: 0,
      gold: 1,
      accusations: 0,
      tookGoldThisTurn: 0,
      alive: true,
      hand: [],
      intel: [],
      knownRoles: {}
    });

    socket.join(code);
    socket.data = { roomCode: code, playerId };
    room.logs.unshift(`👋 ${cleanName} joined the table.`);
    room.chatMessages.push({
      id: 'chat_' + Date.now(),
      sender: cleanName,
      avatarId: chosenAvatar,
      text: 'Joined the manor.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    });
    broadcastRoom(code);
  });

  socket.on('selectAvatar', ({ avatarId }) => {
    const { roomCode, playerId } = socket.data || {};
    const room = rooms[roomCode];
    if (!room) return;
    const p = room.players.find(pl => pl.id === playerId);
    if (p && avatarId >= 1 && avatarId <= 8) {
      p.avatarId = Number(avatarId);
      broadcastRoom(roomCode);
    }
  });

  socket.on('sendChat', ({ text }) => {
    const { roomCode, playerId } = socket.data || {};
    const room = rooms[roomCode];
    if (!room || !text || !text.trim()) return;
    const p = room.players.find(pl => pl.id === playerId);
    if (!p) return;

    room.chatMessages.push({
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      sender: p.name,
      senderId: p.id,
      avatarId: p.avatarId || 1,
      text: text.trim().slice(0, 220),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: false
    });
    broadcastRoom(roomCode);
  });

  socket.on('accusePlayer', ({ targetId }) => {
    const { roomCode, playerId } = socket.data || {};
    const room = rooms[roomCode];
    if (!room || room.phase !== 'DAY') return;
    const player = room.players.find(p => p.id === playerId && p.alive);
    const target = room.players.find(p => p.id === targetId && p.alive);
    if (!player || !target || player.id === target.id) return;

    target.accusations = (target.accusations || 0) + 1;
    room.logs.unshift(`⚖️ ${player.name} pointed an Accusation at ${target.name} (${target.accusations}/3 Accusations)!`);
    room.chatMessages.push({
      id: 'acc_' + Date.now(),
      sender: player.name,
      avatarId: player.avatarId,
      text: `⚠️ Accused ${target.name}! (${target.accusations}/3)`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    });

    if (target.accusations >= 3) {
      target.hp = 0;
      target.alive = false;
      room.logs.unshift(`🩸 3 ACCUSATIONS! The town tribunal executed ${target.name}! True Role: ${target.role}.`);
      checkWinCondition(room);
    }
    broadcastRoom(roomCode);
  });

  socket.on('addBot', () => {
    const { roomCode } = socket.data || {};
    const room = rooms[roomCode];
    if (!room || room.phase !== 'LOBBY' || room.players.length >= 8) return;

    const botNames = ['Sir Roland', 'Sister Morrigan', 'Witchfinder Kane', 'Lord Valerius', 'Countess Carmilla', 'Lord Orlok', 'Inquisitor Vance', 'Shadow Jack'];
    const used = new Set(room.players.map(p => p.name));
    const name = botNames.find(n => !used.has(n)) || `Hunter_${room.players.length + 1}`;
    const playerId = 'bot_' + Math.random().toString(36).substring(2, 9);
    const avatarId = (room.players.length % 8) + 1;

    room.players.push({
      id: playerId,
      socketId: 'BOT',
      isBot: true,
      name,
      avatarId,
      role: 'Hunter',
      hp: 10,
      shield: 0,
      gold: 1,
      accusations: 0,
      tookGoldThisTurn: 0,
      alive: true,
      hand: [],
      intel: [],
      knownRoles: {}
    });

    room.logs.unshift(`🤖 ${name} joined Seat #${room.players.length}.`);
    broadcastRoom(roomCode);
  });

  socket.on('openHowToPlay', () => {
    const { roomCode } = socket.data || {};
    const room = rooms[roomCode];
    if (!room || room.players.length < 2) {
      socket.emit('errorMsg', 'Add at least 2 players (or + AI Bot) to begin!');
      return;
    }
    room.phase = 'HOW_TO_PLAY';
    broadcastRoom(roomCode);
  });

  socket.on('startGame', ({ vampireCount } = {}) => {
    const { roomCode } = socket.data || {};
    const room = rooms[roomCode];
    if (!room || room.players.length < 2) return;

    room.deck = buildDeck();
    room.day = 1;
    room.phase = 'DAY';
    room.winner = null;
    room.nextDayFirstPlayerId = null;
    room.nightActions = {};

    const numPlayers = room.players.length;
    const numVamps = vampireCount || (numPlayers >= 7 ? 3 : numPlayers >= 5 ? 2 : 1);

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
      p.accusations = 0;
      p.tookGoldThisTurn = 0;
      p.alive = true;
      p.knownRoles = {};
      p.hand = [drawCard(room), drawCard(room)];
      p.intel = [`🎭 Secret Role Dealt: ${p.role}. You start with 1 Personal Gold.`];
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
      `🌅 Day 1 begins! Everyone starts with 10 HP, 1G, and 2 cards.`,
      `👑 ${firstP.name} claims Turn #1!`
    ];

    runBotsIfNeeded(roomCode);
    broadcastRoom(roomCode);
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

    room.logs.unshift(`🪙 ${player.name} took ${req}G from the Shared Treasury (${room.commonwealthGold}G left).`);
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
      socket.emit('errorMsg', `${card.name} is locked until Day ${card.minDay}!`);
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
        room.logs.unshift(`👑 ${player.name} played Royal Decree! ${target.name} claims Turn #1 at Dawn!`);
        break;
      case 'shadow_swap': {
        const i1 = room.turnOrder.indexOf(player.id);
        const i2 = room.turnOrder.indexOf(target.id);
        if (i1 !== -1 && i2 !== -1 && i1 !== i2) {
          [room.turnOrder[i1], room.turnOrder[i2]] = [room.turnOrder[i2], room.turnOrder[i1]];
          room.logs.unshift(`🔀 ${player.name} swapped Turn Seats with ${target.name}!`);
        }
        break;
      }
      case 'time_twist': {
        const currentActiveId = room.turnOrder[room.currentTurnIndex];
        room.turnOrder.reverse();
        room.currentTurnIndex = room.turnOrder.indexOf(currentActiveId);
        const bonus = drawCard(room);
        player.hand.push(bonus);
        room.logs.unshift(`⏳ ${player.name} reversed Turn Order and drew 1 card!`);
        break;
      }
      case 'bloodhound': {
        if (target.hand.length > 0) {
          const randCard = target.hand[Math.floor(Math.random() * target.hand.length)];
          player.intel.unshift(`🐕 Bloodhound on ${target.name}: Spotted [${randCard.name}]!`);
        } else {
          player.intel.unshift(`🐕 Bloodhound on ${target.name}: Hand is empty!`);
        }
        room.logs.unshift(`🐕 ${player.name} used Bloodhound on ${target.name}.`);
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
        room.logs.unshift(`🗡️ ${player.name} played Cutpurse on ${target.name}, stealing ${stolenGold}G & ${stolenCardText}!`);
        break;
      }
      case 'holy_water': {
        const dmg = room.day >= 3 ? 4 : 3;
        dealDamage(room, player.name, target, dmg, 'Holy Water');
        break;
      }
      case 'inquisitor_lens': {
        player.knownRoles[target.id] = true;
        player.intel.unshift(`🔍 INQUISITOR'S LENS: ${target.name} is a [${target.role.toUpperCase()}]!`);
        room.logs.unshift(`🔍 ${player.name} inspected ${target.name} with Inquisitor's Lens!`);
        break;
      }
      case 'executioner_pistol':
        dealDamage(room, player.name, target, 5, "Executioner's Pistol", true);
        break;
      case 'vampiric_curse':
        target.role = 'Vampire';
        target.intel.unshift(`🦇 VAMPIRIC CURSE! You have become a Vampire!`);
        player.intel.unshift(`🦇 You converted ${target.name} into a Vampire!`);
        room.logs.unshift(`🦇 ${player.name} cast Vampiric Curse on ${target.name}!`);
        checkWinCondition(room);
        break;
      case 'purifying_elixir':
        if (target.role === 'Vampire') {
          target.role = 'Hunter';
          target.intel.unshift(`✨ PURIFYING ELIXIR! Cleansed back into a Hunter!`);
        }
        target.hp = Math.min(10, target.hp + 3);
        room.logs.unshift(`✨ ${player.name} used Purifying Elixir on ${target.name} (+3 HP)!`);
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

    advanceDayTurn(room);
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
          room.logs.unshift(`🪙 ${activeBot.name} took ${take}G from the Shared Treasury.`);
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
        advanceDayTurn(room);
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