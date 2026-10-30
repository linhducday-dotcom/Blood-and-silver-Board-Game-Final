import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const socket = io(BACKEND_URL, { autoConnect: true });

const FALLBACK_CATALOG = [
  { id: 'iron_dagger', name: 'Iron Dagger', cost: 1, copies: 7, category: 'Attack', minDay: 1, needsTarget: true, desc: 'Choose any player. They take 2 Damage unless blocked by a Shield.' },
  { id: 'silver_caltrops', name: 'Silver Caltrops', cost: 1, copies: 4, category: 'Attack', minDay: 1, needsTarget: true, desc: 'Deal 2 Damage to any player and fortify yourself with +1 Shield until Dawn.' },
  { id: 'wooden_shield', name: 'Wooden Shield', cost: 1, copies: 6, category: 'Defense', minDay: 1, needsTarget: true, desc: 'Grant any player +2 Shield until Dawn. Unbroken Shield on Days 1–2 grants +1 Gold.' },
  { id: 'sacred_ward', name: 'Sacred Ward', cost: 2, copies: 4, category: 'Defense', minDay: 1, needsTarget: true, desc: 'Surround any player with a +4 Shield ward until Dawn.' },
  { id: 'healing_salve', name: 'Healing Salve', cost: 1, copies: 4, category: 'Heal', minDay: 1, needsTarget: true, desc: 'Restore +3 HP to any living player (up to 10 HP maximum).' },
  { id: 'royal_decree', name: 'Royal Decree', cost: 1, copies: 3, category: 'Order', minDay: 1, needsTarget: true, desc: "Target player claims the Turn #1 Initiative seat at tomorrow's Dawn." },
  { id: 'shadow_swap', name: 'Shadow Swap', cost: 0, copies: 3, category: 'Order', minDay: 1, needsTarget: true, desc: 'Free to cast. Swap your current Turn Order seat around the circle with another player.' },
  { id: 'time_twist', name: 'Time Twist', cost: 1, copies: 2, category: 'Order', minDay: 1, needsTarget: false, desc: 'Reverse the table Turn Order direction immediately and draw 1 card.' },
  { id: 'bloodhound', name: 'Bloodhound', cost: 1, copies: 3, category: 'Intel', minDay: 1, needsTarget: true, desc: 'Inspect any player to privately peek at 1 random card in their hand.' },
  { id: 'cutpurse', name: 'Cutpurse', cost: 0, copies: 3, category: 'Trick', minDay: 1, needsTarget: true, desc: 'Free to cast. Steal up to 1 Gold and 1 random card from another player.' },
  { id: 'holy_water', name: 'Holy Water', cost: 2, copies: 3, category: 'Attack', minDay: 1, needsTarget: true, desc: 'Deal 3 Damage to any player. Upgrades to 4 Damage starting on Day 3.' },
  { id: 'inquisitor_lens', name: "Inquisitor's Lens", cost: 2, copies: 3, category: 'Intel', minDay: 3, needsTarget: true, desc: "Unlocks on Day 3. Privately reveal any player's true secret Role." },
  { id: 'executioner_pistol', name: "Executioner's Pistol", cost: 3, copies: 2, category: 'Attack', minDay: 3, needsTarget: true, desc: 'Unlocks on Day 3. Fire a silver bullet for 5 Piercing Damage (ignores Shield).' },
  { id: 'vampiric_curse', name: 'Vampiric Curse', cost: 4, copies: 1, category: 'Twist', minDay: 3, needsTarget: true, desc: 'Unlocks on Day 3. Convert any player (or yourself!) into a Vampire.' },
  { id: 'purifying_elixir', name: 'Purifying Elixir', cost: 4, copies: 1, category: 'Twist', minDay: 3, needsTarget: true, desc: 'Unlocks on Day 3. Cleanse a Vampire back into a Hunter and restore +3 HP.' }
];

const CODEX_CHAPTERS = [
  {
    badge: 'I. Factions',
    title: 'The Order vs. The Coven',
    summary: 'Every guest is secretly dealt a role: Hunter or Vampire. Everyone begins with 10 HP, 1 Gold, and 2 cards.',
    bullet: 'Total Annihilation: Hunters win only when every Vampire is slain. Vampires win only when every Hunter falls.'
  },
  {
    badge: 'II. The Vault',
    title: 'Shared Commonwealth & Seats',
    summary: 'At Dawn, the central Vault is stocked with (Alive Players × 2) + 3 Gold. Players act in clockwise seat order.',
    bullet: 'Seat #1 gets first claim on the gold. Use Royal Decree, Shadow Swap, and Time Twist to hijack early seats!'
  },
  {
    badge: 'III. Awakening',
    title: 'Days 1–2 Cold War vs. Day 3',
    summary: 'During Days 1 & 2, players may draw at most 2 Gold per turn, and ending the Night with unbroken Shield grants +1 Bonus Gold.',
    bullet: 'On Day 3, the seal shatters: the Vault cap rises to 4 Gold and lethal Awakening cards unlock.'
  },
  {
    badge: 'IV. Midnight',
    title: 'Night Perks & Split Strikes',
    summary: 'When dusk falls, all living players secretly select a Night perk (+2 Shield, +1 Card, Gold, or Usurp Turn #1).',
    bullet: 'Simultaneously, Vampires divide their Night Blood Pool across one or multiple victims around the circle.'
  }
];

function InkCardArt({ cardId, category, size = 115 }) {
  const palette = {
    Attack: { main: '#9e1b32', glow: '#f43f5e', dark: '#4c0519' },
    Defense: { main: '#1d4ed8', glow: '#60a5fa', dark: '#172554' },
    Order: { main: '#b45309', glow: '#fbbf24', dark: '#451a03' },
    Heal: { main: '#15803d', glow: '#4ade80', dark: '#052e16' },
    Twist: { main: '#6d28d9', glow: '#c084fc', dark: '#2e1065' },
    Intel: { main: '#0f766e', glow: '#2dd4bf', dark: '#042f2e' },
    Trick: { main: '#a16207', glow: '#facc15', dark: '#422006' }
  }[category] || { main: '#9e1b32', glow: '#f43f5e', dark: '#4c0519' };

  const gradId = `grad_${cardId}_${size}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '6px 0' }}>
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
        <defs>
          <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={palette.glow} stopOpacity="0.32" />
            <stop offset="70%" stopColor={palette.main} stopOpacity="0.12" />
            <stop offset="100%" stopColor="#12161f" stopOpacity="0.02" />
          </radialGradient>
        </defs>

        {/* Ornate Outer Tarot Rosette & Corner Filigree */}
        <circle cx="60" cy="60" r="52" fill={`url(#${gradId})`} stroke="#1e2536" strokeWidth="2.5" />
        <circle cx="60" cy="60" r="46" stroke={palette.main} strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="4 3" />
        <polygon points="60,4 63,11 60,15 57,11" fill={palette.main} />
        <polygon points="60,116 63,109 60,105 57,109" fill={palette.main} />
        <polygon points="4,60 11,63 15,60 11,57" fill={palette.main} />
        <polygon points="116,60 109,63 105,60 109,57" fill={palette.main} />

        {/* 1. IRON DAGGER */}
        {cardId === 'iron_dagger' && (
          <g stroke="#12161f" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M88 32L46 74L38 66L80 24L92 20L88 32Z" fill="#cbd5e1" />
            <path d="M84 28L46 66" stroke={palette.main} strokeWidth="2" />
            <path d="M32 54L58 80" stroke="#d4a853" strokeWidth="5" />
            <path d="M40 72L26 86L34 94L48 80" fill={palette.dark} />
            <circle cx="26" cy="90" r="5" fill="#d4a853" />
            <path d="M88 38C88 38 93 46 88 50C83 46 88 38 88 38Z" fill={palette.glow} stroke="none" />
          </g>
        )}

        {/* 2. SILVER CALTROPS */}
        {cardId === 'silver_caltrops' && (
          <g stroke="#12161f" strokeWidth="2.5" strokeLinejoin="round">
            <polygon points="60,18 69,47 98,56 69,65 60,94 51,65 22,56 51,47" fill="#cbd5e1" />
            <polygon points="35,31 54,50 46,58 27,39" fill={palette.main} />
            <polygon points="85,31 66,50 74,58 93,39" fill={palette.main} />
            <polygon points="35,81 54,62 46,54 27,73" fill={palette.main} />
            <polygon points="85,81 66,62 74,54 93,73" fill={palette.main} />
            <circle cx="60" cy="56" r="9" fill="#d4a853" />
          </g>
        )}

        {/* 3 & 4. WOODEN SHIELD / SACRED WARD */}
        {(cardId === 'wooden_shield' || cardId === 'sacred_ward') && (
          <g stroke="#12161f" strokeWidth="2.8" strokeLinejoin="round">
            <path d="M60 20L92 33V58C92 81 60 98 60 98C60 98 28 81 28 58V33L60 20Z" fill={palette.main} />
            <path d="M60 27L84 37V57C84 75 60 89 60 89C60 89 36 75 36 57V37L60 27Z" fill={palette.dark} stroke="#d4a853" strokeWidth="2" />
            <path d="M60 34V82M42 54H78" stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />
            <circle cx="60" cy="54" r="6" fill="#d4a853" />
          </g>
        )}

        {/* 5. HEALING SALVE */}
        {cardId === 'healing_salve' && (
          <g stroke="#12161f" strokeWidth="2.8" strokeLinejoin="round">
            <path d="M48 24H72V35L84 49V86C84 92 79 96 73 96H47C41 96 36 92 36 86V49L48 35V24Z" fill={palette.main} />
            <rect x="51" y="16" width="18" height="9" rx="2" fill="#d4a853" />
            <path d="M42 62Q60 54 78 62V86C78 89 75 91 72 91H48C45 91 42 89 42 86V62Z" fill={palette.glow} fillOpacity="0.5" stroke="none" />
            <path d="M60 52V76M48 64H72" stroke="#f8fafc" strokeWidth="5" strokeLinecap="round" />
          </g>
        )}

        {/* 6. ROYAL DECREE */}
        {cardId === 'royal_decree' && (
          <g stroke="#12161f" strokeWidth="2.6" strokeLinejoin="round">
            <polygon points="24,80 32,40 48,58 60,26 72,58 88,40 96,80" fill="#d4a853" />
            <rect x="24" y="80" width="72" height="10" rx="4" fill={palette.main} />
            <circle cx="60" cy="24" r="4.5" fill="#f43f5e" />
            <circle cx="32" cy="38" r="4" fill="#f8fafc" />
            <circle cx="88" cy="38" r="4" fill="#f8fafc" />
            <circle cx="60" cy="66" r="5" fill="#9e1b32" />
          </g>
        )}

        {/* 7. SHADOW SWAP */}
        {cardId === 'shadow_swap' && (
          <g stroke="#12161f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M28 44H90L74 28" stroke={palette.main} strokeWidth="4" />
            <path d="M92 76H30L46 92" stroke="#1e2536" strokeWidth="4" />
            <circle cx="46" cy="60" r="13" fill="#1e2536" />
            <circle cx="74" cy="60" r="13" fill="#d4a853" />
          </g>
        )}

        {/* 8. TIME TWIST */}
        {cardId === 'time_twist' && (
          <g stroke="#12161f" strokeWidth="2.6" strokeLinejoin="round">
            <rect x="30" y="22" width="60" height="7" rx="3" fill="#d4a853" />
            <rect x="30" y="91" width="60" height="7" rx="3" fill="#d4a853" />
            <polygon points="36,29 84,29 60,60 84,91 36,91 60,60" fill={palette.main} fillOpacity="0.85" />
            <circle cx="60" cy="60" r="4.5" fill="#f8fafc" />
          </g>
        )}

        {/* 9 & 12. BLOODHOUND / INQUISITOR'S LENS */}
        {(cardId === 'bloodhound' || cardId === 'inquisitor_lens') && (
          <g stroke="#12161f" strokeWidth="2.8" strokeLinecap="round">
            <line x1="72" y1="72" x2="94" y2="94" stroke="#d4a853" strokeWidth="8" />
            <circle cx="52" cy="52" r="24" fill={palette.main} />
            <circle cx="52" cy="52" r="17" fill="#f8fafc" />
            <path d="M40 52Q52 40 64 52Q52 64 40 52Z" fill={palette.glow} />
            <circle cx="52" cy="52" r="5" fill="#12161f" />
          </g>
        )}

        {/* 10. CUTPURSE */}
        {cardId === 'cutpurse' && (
          <g stroke="#12161f" strokeWidth="2.6" strokeLinejoin="round">
            <path d="M36 46C27 56 26 76 34 88C42 96 78 96 86 88C94 76 93 56 84 46Z" fill={palette.main} />
            <path d="M42 46L48 26H72L78 46Z" fill="#d4a853" />
            <circle cx="60" cy="70" r="11" fill="#d4a853" />
            <text x="60" y="75" textAnchor="middle" fontSize="13" fontWeight="900" fill="#12161f" stroke="none">G</text>
          </g>
        )}

        {/* 11. HOLY WATER */}
        {cardId === 'holy_water' && (
          <g stroke="#12161f" strokeWidth="2.8" strokeLinejoin="round">
            <path d="M60 20C60 20 90 54 90 74C90 90 76 98 60 98C44 98 30 90 30 74C30 54 60 20 60 20Z" fill="#38bdf8" />
            <path d="M60 50V82M44 66H76" stroke="#f8fafc" strokeWidth="5" strokeLinecap="round" />
          </g>
        )}

        {/* 13. EXECUTIONER'S PISTOL */}
        {cardId === 'executioner_pistol' && (
          <g stroke="#12161f" strokeWidth="2.8" strokeLinejoin="round">
            <path d="M22 44H86V58H52L44 88H26L34 58H22V44Z" fill="#475569" />
            <rect x="28" y="48" width="52" height="5" fill="#cbd5e1" stroke="none" />
            <circle cx="96" cy="51" r="6" fill="#f43f5e" />
          </g>
        )}

        {/* 14 & 15. VAMPIRIC CURSE / PURIFYING ELIXIR */}
        {(cardId === 'vampiric_curse' || cardId === 'purifying_elixir') && (
          <g stroke="#12161f" strokeWidth="2.6" strokeLinejoin="round">
            <path d="M60 20L72 46L98 50L78 68L84 94L60 80L36 94L42 68L22 50L48 46L60 20Z" fill={palette.main} />
            <circle cx="60" cy="60" r="12" fill="#d4a853" />
            <circle cx="60" cy="60" r="5" fill="#12161f" />
          </g>
        )}
      </svg>
    </div>
  );
}

export default function App() {
  const [screenMode, setScreenMode] = useState('HOME'); // HOME | FIND_GAME
  const [gameState, setGameState] = useState(null);
  const [publicRooms, setPublicRooms] = useState({ openLobbies: [], inProgress: [] });

  const [playerName, setPlayerName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [activeModalMode, setActiveModalMode] = useState(null); // null | 'JOIN' | 'TV'

  // Page 3 Lobby Interactive State
  const [codexIdx, setCodexIdx] = useState(0);
  const [showcaseCardIdx, setShowcaseCardIdx] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  // In-Game State & Animations
  const [selectedCard, setSelectedCard] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('CHRONICLE');
  const [errorBanner, setErrorBanner] = useState('');
  const [timeLeftSec, setTimeLeftSec] = useState(null);

  // Night Action States
  const [nightChoice, setNightChoice] = useState('SHIELD');
  const [nightStrikes, setNightStrikes] = useState({});

  const prevPlayersRef = useRef({});
  const [seatEffects, setSeatEffects] = useState({});

  useEffect(() => {
    socket.on('gameState', (data) => {
      if (data?.players) {
        const newEffects = {};
        data.players.forEach(p => {
          const prev = prevPlayersRef.current[p.id];
          if (prev) {
            if (p.hp < prev.hp) {
              newEffects[p.id] = { text: `-${prev.hp - p.hp} HP`, bg: '#9e1b32', shake: true };
            } else if (p.hp > prev.hp) {
              newEffects[p.id] = { text: `+${p.hp - prev.hp} HP`, bg: '#15803d', shake: false };
            } else if (p.shield > prev.shield) {
              newEffects[p.id] = { text: `+${p.shield - prev.shield} 🛡️`, bg: '#0284c7', shake: false };
            } else if (p.gold > prev.gold) {
              newEffects[p.id] = { text: `+${p.gold - prev.gold}G`, bg: '#b45309', shake: false };
            }
          }
          prevPlayersRef.current[p.id] = { hp: p.hp, shield: p.shield, gold: p.gold };
        });

        if (Object.keys(newEffects).length > 0) {
          setSeatEffects(newEffects);
          setTimeout(() => setSeatEffects({}), 1500);
        }
      }
      setGameState(data);
      setSelectedCard(null);
    });

    socket.on('publicRoomsList', (list) => {
      setPublicRooms(list || { openLobbies: [], inProgress: [] });
    });

    socket.on('errorMsg', (msg) => {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(''), 4000);
    });

    return () => {
      socket.off('gameState');
      socket.off('publicRoomsList');
      socket.off('errorMsg');
    };
  }, []);

  useEffect(() => {
    if (!gameState?.turnDeadline || gameState.phase !== 'DAY' || gameState.turnTimerSetting === 'OFF') {
      setTimeLeftSec(null);
      return;
    }
    const updateClock = () => {
      const rem = Math.max(0, Math.ceil((gameState.turnDeadline - Date.now()) / 1000));
      setTimeLeftSec(rem);
    };
    updateClock();
    const interval = setInterval(updateClock, 300);
    return () => clearInterval(interval);
  }, [gameState?.turnDeadline, gameState?.phase, gameState?.turnTimerSetting]);

  useEffect(() => {
    if (gameState?.phase === 'NIGHT') {
      setNightChoice('SHIELD');
      setNightStrikes({});
    }
  }, [gameState?.phase, gameState?.day]);

  const totalAllocatedStrikes = Object.values(nightStrikes).reduce((a, b) => a + b, 0);
  const nightPool = gameState?.nightDamagePool || 3;

  const adjustStrike = (targetId, delta) => {
    setNightStrikes(prev => {
      const current = prev[targetId] || 0;
      const next = current + delta;
      if (next < 0) return prev;
      if (delta > 0 && totalAllocatedStrikes >= nightPool) return prev;
      const copy = { ...prev, [targetId]: next };
      if (copy[targetId] === 0) delete copy[targetId];
      return copy;
    });
  };

  // ============================================================================
  // PAGE 1 & PAGE 2: REDESIGNED TITLE GATE & 2-COLUMN CRIMSON LEDGER
  // ============================================================================
  if (!gameState) {
    // PAGE 2: THE CRIMSON LEDGER (2-COLUMN PUBLIC MATCH BROWSER)
    if (screenMode === 'FIND_GAME') {
      return (
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 20px' }}>
          <div style={{ width: '100%', maxWidth: '880px' }}>
            {/* Top Header Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div className="serif-header" style={{ fontSize: '11px', color: '#f43f5e', fontWeight: 700, marginBottom: '6px' }}>
                  PUBLIC PARLOR DIRECTORY
                </div>
                <h1 className="gothic-title" style={{ fontSize: '46px', color: '#f8fafc' }}>
                  The Crimson Ledger
                </h1>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  className="aesthetic-input"
                  style={{ width: '210px', padding: '11px 14px' }}
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Your Alias..."
                />
                <button
                  className="aesthetic-btn aesthetic-btn-crimson"
                  style={{ width: 'auto', padding: '11px 20px' }}
                  onClick={() => socket.emit('createRoom', { playerName: playerName || 'Hunter' })}
                >
                  + Host New Manor
                </button>
                <button
                  className="aesthetic-btn"
                  style={{ width: 'auto', padding: '11px 18px' }}
                  onClick={() => setScreenMode('HOME')}
                >
                  ← Back
                </button>
              </div>
            </div>

            {errorBanner && (
              <div className="ui-sans" style={{ padding: '12px 18px', borderRadius: '10px', background: '#9e1b32', color: '#fff', marginBottom: '18px', fontWeight: 700 }}>
                ⚠️ {errorBanner}
              </div>
            )}

            {/* 2-Column Split Ledger (Distinct from Goblins Gambit's single column) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              {/* Left Column: Open Manors Gathering Guests */}
              <div className="velvet-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(142,153,171,0.2)', paddingBottom: '12px' }}>
                  <div>
                    <h2 className="serif-header" style={{ fontSize: '15px', color: '#f8fafc' }}>Open Manors</h2>
                    <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Lobbies gathering 3–8 guests before Dawn</p>
                  </div>
                  <span className="ui-sans" style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px', background: 'rgba(225,29,72,0.18)', color: '#fda4af' }}>
                    {publicRooms.openLobbies.length} Open
                  </span>
                </div>

                {publicRooms.openLobbies.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                    No open lobbies waiting right now. Click <strong style={{ color: '#f8fafc' }}>+ Host New Manor</strong> above to open a table!
                  </div>
                ) : (
                  publicRooms.openLobbies.map(room => (
                    <div key={room.roomCode} style={{
                      padding: '16px', borderRadius: '12px', background: 'rgba(13, 16, 23, 0.75)',
                      border: '1px solid rgba(142, 153, 171, 0.25)', display: 'flex', flexDirection: 'column', gap: '10px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div className="serif-header" style={{ fontSize: '17px', fontWeight: 700, color: '#f8fafc' }}>
                            Manor {room.roomCode}
                          </div>
                          <div className="ui-sans" style={{ fontSize: '12px', color: '#94a3b8' }}>
                            Hosted by <strong style={{ color: '#e2e8f0' }}>{room.hostName}</strong> • {room.playerCount}/{room.maxPlayers} Seated
                          </div>
                        </div>
                        <button
                          className="aesthetic-btn aesthetic-btn-gold"
                          style={{ width: 'auto', padding: '9px 20px', fontSize: '12px' }}
                          onClick={() => socket.emit('joinRoom', { roomCode: room.roomCode, playerName: playerName || 'Hunter' })}
                        >
                          Take Seat
                        </button>
                      </div>
                      <div style={{ height: '5px', background: '#1e2636', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ width: `${(room.playerCount / room.maxPlayers) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #d4a853, #f43f5e)' }} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Right Column: Active Hunts In Progress (Spectate / TV Mode) */}
              <div className="velvet-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(142,153,171,0.2)', paddingBottom: '12px' }}>
                  <div>
                    <h2 className="serif-header" style={{ fontSize: '15px', color: '#d4a853' }}>Hunts in Progress</h2>
                    <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Spectate live tables or cast to a living-room TV</p>
                  </div>
                  <span className="ui-sans" style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px', background: 'rgba(212,168,83,0.18)', color: '#fde68a' }}>
                    {publicRooms.inProgress.length} Live
                  </span>
                </div>

                {publicRooms.inProgress.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                    No active hunts in progress at this hour.
                  </div>
                ) : (
                  publicRooms.inProgress.map(room => (
                    <div key={room.roomCode} style={{
                      padding: '16px', borderRadius: '12px', background: 'rgba(13, 16, 23, 0.75)',
                      border: '1px solid rgba(142, 153, 171, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <div className="serif-header" style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                          Manor {room.roomCode}
                        </div>
                        <div className="ui-sans" style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {room.phase} {room.day} • {room.playerCount} Playing • {room.spectatorCount} Watching
                        </div>
                      </div>
                      <button
                        className="aesthetic-btn"
                        style={{ width: 'auto', padding: '9px 18px', fontSize: '12px' }}
                        onClick={() => socket.emit('watchRoom', { roomCode: room.roomCode })}
                      >
                        📺 Spectate
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      );
    }

    // PAGE 1: THE MANOR GATE (AESTHETIC VICTORIAN-GOTHIC LANDING PAGE)
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 18px' }}>
        <div className="velvet-panel" style={{ width: '100%', maxWidth: '490px', padding: '40px 36px', position: 'relative' }}>
          {/* Top Crimson & Silver Crest */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '5px 14px', borderRadius: '99px', background: 'rgba(158, 27, 50, 0.22)', border: '1px solid rgba(244, 63, 94, 0.4)', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px' }}>🗡️</span>
              <span className="serif-header" style={{ fontSize: '10px', fontWeight: 700, color: '#fda4af' }}>
                SOCIAL DEDUCTION FOR 3–8 PLAYERS
              </span>
              <span style={{ fontSize: '13px' }}>🍷</span>
            </div>

            <h1 className="gothic-title" style={{ fontSize: '68px', color: '#f8fafc', letterSpacing: '0.02em' }}>
              Blood <span style={{ color: '#e11d48', fontStyle: 'italic', fontWeight: 600 }}>&amp;</span> Silver
            </h1>

            <p style={{ fontSize: '15px', color: '#94a3b8', fontStyle: 'italic', marginTop: '8px' }}>
              Deception in the parlor. Steel in the dark.
            </p>
          </div>

          {errorBanner && (
            <div className="ui-sans" style={{ padding: '10px 14px', borderRadius: '8px', background: '#9e1b32', color: '#fff', marginBottom: '16px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>
              ⚠️ {errorBanner}
            </div>
          )}

          {/* Alias Input */}
          <div style={{ marginBottom: '18px' }}>
            <label className="serif-header" style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
              YOUR ALIAS AT THE TABLE
            </label>
            <input
              className="aesthetic-input"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Enter your name (e.g., Lord Vance)..."
            />
          </div>

          {/* Primary Action Button */}
          <button
            className="aesthetic-btn aesthetic-btn-crimson"
            style={{ padding: '15px', fontSize: '15px', marginBottom: '12px' }}
            onClick={() => socket.emit('createRoom', { playerName: playerName || 'Hunter' })}
          >
            🏰 Create Private Manor
          </button>

          {/* 2x2 Secondary Action Grid (Distinct Arrangement) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <button
              className="aesthetic-btn"
              onClick={() => setActiveModalMode(activeModalMode === 'JOIN' ? null : 'JOIN')}
            >
              🔑 Enter Code
            </button>

            <button
              className="aesthetic-btn"
              onClick={() => {
                socket.emit('getPublicRooms');
                setScreenMode('FIND_GAME');
              }}
            >
              🧭 Find Manor
            </button>
          </div>

          {/* Expandable Room Code Drawer */}
          {activeModalMode && (
            <div style={{
              padding: '14px', borderRadius: '10px', background: 'rgba(10, 13, 20, 0.9)',
              border: '1px solid rgba(212, 168, 83, 0.45)', marginBottom: '12px', display: 'flex', gap: '8px'
            }}>
              <input
                className="aesthetic-input"
                value={joinCodeInput}
                onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="4-LETTER CODE"
                maxLength={4}
                style={{ textAlign: 'center', letterSpacing: '4px', fontWeight: 800 }}
              />
              <button
                className="aesthetic-btn aesthetic-btn-gold"
                style={{ width: 'auto', padding: '0 22px' }}
                onClick={() => {
                  if (activeModalMode === 'TV') {
                    socket.emit('watchRoom', { roomCode: joinCodeInput });
                  } else {
                    socket.emit('joinRoom', { roomCode: joinCodeInput, playerName: playerName || 'Guest' });
                  }
                }}
              >
                {activeModalMode === 'TV' ? 'Watch' : 'Join'}
              </button>
            </div>
          )}

          {/* TV Spectator Mode Button */}
          <button
            className="aesthetic-btn"
            style={{ fontSize: '12px', padding: '11px', opacity: 0.85 }}
            onClick={() => setActiveModalMode(activeModalMode === 'TV' ? null : 'TV')}
          >
            📺 Cast Table as Living-Room TV Display
          </button>
        </div>
      </main>
    );
  }

  // ============================================================================
  // PAGE 3: 3-COLUMN PARLOR LOBBY (GUESTBOOK | SILVER TAROT PEDESTAL | CODEX)
  // ============================================================================
  if (gameState.phase === 'LOBBY') {
    const catalog = gameState.catalog?.length ? gameState.catalog : FALLBACK_CATALOG;
    const activeCard = catalog[showcaseCardIdx % catalog.length];
    const readyCount = gameState.players.filter(p => p.ready).length;
    const isHost = gameState.hostId === gameState.me.id;

    return (
      <div style={{ minHeight: '100vh', padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
        {/* Top Parlor Header Bar */}
        <header className="velvet-panel" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 className="gothic-title" style={{ fontSize: '34px', color: '#f8fafc' }}>
              Blood <span style={{ color: '#e11d48', fontStyle: 'italic' }}>&amp;</span> Silver
            </h1>
            <span className="ui-sans" style={{ padding: '5px 12px', borderRadius: '99px', background: 'rgba(212, 168, 83, 0.18)', border: '1px solid #d4a853', color: '#fde68a', fontSize: '12px', fontWeight: 700 }}>
              MANOR CODE: {gameState.roomCode}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="aesthetic-btn"
              style={{ width: 'auto', padding: '9px 16px', fontSize: '12px' }}
              onClick={() => {
                navigator.clipboard?.writeText(gameState.roomCode);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
            >
              {copiedCode ? `✓ Copied (${gameState.roomCode})` : `📋 Copy Invite Code`}
            </button>

            <button
              className="aesthetic-btn"
              style={{ width: 'auto', padding: '9px 16px', fontSize: '12px' }}
              onClick={() => {
                socket.emit('leaveRoom');
                setGameState(null);
              }}
            >
              Leave Manor
            </button>
          </div>
        </header>

        {/* 3-Column Balanced Parlor Layout */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '310px 1fr 340px', gap: '24px', alignItems: 'stretch' }}>
          {/* COLUMN 1 (LEFT): THE GUESTBOOK & TURN TIMER */}
          <aside className="velvet-panel" style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span className="serif-header" style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                  SEATED GUESTS
                </span>
                <span className="ui-sans" style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>
                  {gameState.players.length} / 8
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '14px' }}>
                {readyCount} of {gameState.players.length} guests ready for Dawn
              </p>

              {/* Seated Player Pills */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', maxHeight: '250px', overflowY: 'auto' }}>
                {gameState.players.map((p, idx) => (
                  <div key={p.id} style={{
                    padding: '10px 12px', borderRadius: '10px',
                    background: p.ready ? 'rgba(212, 168, 83, 0.12)' : 'rgba(13, 16, 23, 0.7)',
                    border: `1px solid ${p.ready ? 'rgba(212, 168, 83, 0.5)' : 'rgba(142, 153, 171, 0.2)'}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div className="ui-sans" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px' }}>
                      <span>{p.isBot ? '🤖' : idx === 0 ? '👑' : '🍷'}</span>
                      <span>{p.name}</span>
                    </div>
                    <span className="ui-sans" style={{
                      fontSize: '10px', padding: '3px 8px', borderRadius: '99px', fontWeight: 800,
                      background: p.ready ? '#d4a853' : '#1e2636',
                      color: p.ready ? '#0f131a' : '#94a3b8'
                    }}>
                      {p.ready ? 'READY' : 'WAITING'}
                    </span>
                  </div>
                ))}
              </div>

              <button
                className="aesthetic-btn aesthetic-btn-gold"
                style={{ marginBottom: '10px' }}
                onClick={() => socket.emit('toggleReady')}
              >
                {gameState.me.ready ? '✓ Ready (Click to Unready)' : "I'm Ready for Dawn"}
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: isHost ? '1fr 1fr' : '1fr', gap: '8px' }}>
                <button
                  className="aesthetic-btn"
                  style={{ padding: '10px', fontSize: '12px' }}
                  onClick={() => socket.emit('addBot')}
                >
                  + Add AI Bot
                </button>
                {isHost && (
                  <button
                    className="aesthetic-btn aesthetic-btn-crimson"
                    style={{ padding: '10px', fontSize: '12px' }}
                    disabled={gameState.players.length < 2}
                    onClick={() => socket.emit('startGame')}
                  >
                    Start Hunt
                  </button>
                )}
              </div>
            </div>

            {/* Turn Timer Settings at Bottom of Left Column */}
            <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(142, 153, 171, 0.2)' }}>
              <div className="serif-header" style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                DAY TURN PACE
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px', lineHeight: 1.35 }}>
                Auto-claims remaining Vault Gold if a player's clock runs out.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {[
                  { id: 'OFF', label: 'Off' },
                  { id: '30', label: '30s' },
                  { id: 'FAST', label: 'Fast (15s)' }
                ].map(opt => {
                  const active = gameState.turnTimerSetting === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => socket.emit('setTurnTimer', { setting: opt.id })}
                      className="ui-sans"
                      style={{
                        padding: '8px 6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        borderRadius: '8px',
                        border: `1.5px solid ${active ? '#f43f5e' : 'rgba(142,153,171,0.3)'}`,
                        background: active ? 'rgba(158, 27, 50, 0.45)' : 'rgba(13, 16, 23, 0.7)',
                        color: active ? '#fff' : '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* COLUMN 2 (CENTER STAGE): INTERACTIVE SILVER TAROT PEDESTAL */}
          <section className="velvet-panel" style={{ padding: '26px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="serif-header" style={{ fontSize: '11px', color: '#d4a853', fontWeight: 700, marginBottom: '4px' }}>
                ARMORY &amp; GRIMOIRE ({showcaseCardIdx + 1} OF {catalog.length})
              </div>
              <h2 className="gothic-title" style={{ fontSize: '30px', color: '#f8fafc' }}>
                Inspect the Tactical Deck
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '26px', margin: '10px 0' }}>
              <button
                className="circle-nav-btn"
                onClick={() => setShowcaseCardIdx((showcaseCardIdx - 1 + catalog.length) % catalog.length)}
              >
                ‹
              </button>

              {/* Ornate Silver-Ivory Tarot Card */}
              <div key={activeCard.id} className="tarot-showcase-card">
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid rgba(18,22,31,0.15)', paddingBottom: '10px' }}>
                  <span className="ui-sans" style={{
                    fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '99px',
                    background: activeCard.minDay > 1 ? '#9e1b32' : '#1e2536', color: '#fff'
                  }}>
                    {activeCard.minDay > 1 ? `🔒 Day ${activeCard.minDay}+ Awakening` : activeCard.category}
                  </span>
                  <span className="serif-header" style={{
                    fontSize: '13px', fontWeight: 800, padding: '3px 10px', borderRadius: '99px',
                    background: '#d4a853', color: '#12161f'
                  }}>
                    {activeCard.cost === 0 ? 'Free' : `${activeCard.cost} Gold`}
                  </span>
                </div>

                <div style={{ margin: '10px 0 4px' }}>
                  <h3 className="gothic-title" style={{ fontSize: '34px', color: '#12161f' }}>
                    {activeCard.name}
                  </h3>
                </div>

                <InkCardArt cardId={activeCard.id} category={activeCard.category} size={130} />

                <p style={{ fontSize: '15px', lineHeight: 1.55, color: '#1e2536', fontWeight: 500, padding: '0 6px' }}>
                  {activeCard.desc}
                </p>

                <div className="ui-sans" style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginTop: '10px' }}>
                  {activeCard.copies} {activeCard.copies === 1 ? 'Copy' : 'Copies'} in Deck
                </div>
              </div>

              <button
                className="circle-nav-btn"
                onClick={() => setShowcaseCardIdx((showcaseCardIdx + 1) % catalog.length)}
              >
                ›
              </button>
            </div>

            {/* Quick Category Dots */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {catalog.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setShowcaseCardIdx(i)}
                  title={c.name}
                  style={{
                    width: i === showcaseCardIdx ? '22px' : '8px',
                    height: '8px',
                    borderRadius: '99px',
                    border: 'none',
                    background: i === showcaseCardIdx ? '#e11d48' : 'rgba(142,153,171,0.35)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                />
              ))}
            </div>
          </section>

          {/* COLUMN 3 (RIGHT): THE CODEX OF BLOOD & SILVER */}
          <aside className="velvet-panel" style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="serif-header" style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                RULES OF ENGAGEMENT
              </div>
              <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '14px' }}>
                Click any chapter below to study the Manor laws
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {CODEX_CHAPTERS.map((chap, idx) => {
                  const isSelected = codexIdx === idx;
                  return (
                    <div
                      key={chap.badge}
                      onClick={() => setCodexIdx(idx)}
                      style={{
                        padding: '13px 14px',
                        borderRadius: '12px',
                        background: isSelected ? 'rgba(158, 27, 50, 0.22)' : 'rgba(13, 16, 23, 0.65)',
                        border: `1.5px solid ${isSelected ? '#f43f5e' : 'rgba(142, 153, 171, 0.2)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span className="serif-header" style={{ fontSize: '11px', fontWeight: 700, color: isSelected ? '#fda4af' : '#d4a853' }}>
                          {chap.badge}
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{isSelected ? '▾' : '▸'}</span>
                      </div>
                      <div className="gothic-title" style={{ fontSize: '21px', color: '#f8fafc', marginBottom: isSelected ? '6px' : 0 }}>
                        {chap.title}
                      </div>
                      {isSelected && (
                        <>
                          <p style={{ fontSize: '13.5px', lineHeight: 1.5, color: '#e2e8f0', marginBottom: '8px' }}>
                            {chap.summary}
                          </p>
                          <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(10, 13, 20, 0.75)', borderLeft: '3px solid #d4a853', fontSize: '12.5px', color: '#fde68a' }}>
                            {chap.bullet}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(13, 16, 23, 0.75)', border: '1px solid rgba(142,153,171,0.2)', textAlign: 'center', fontSize: '12.5px', color: '#cbd5e1' }}>
              💡 <strong style={{ color: '#fde68a' }}>Tabletop Tip:</strong> Once everyone clicks Ready, seats will form a live circle around the Commonwealth Vault.
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PAGE 4: THE CIRCULAR TABLETOP (IN-GAME DAY / NIGHT / GAME OVER)
  // ============================================================================
  const { me, players, day, phase, commonwealthGold, maxTreasuryTake, currentTurnPlayerId, turnOrder } = gameState;
  const isNight = phase === 'NIGHT';
  const isMyTurn = phase === 'DAY' && currentTurnPlayerId === me.id && me.alive;
  const remainingGoldTake = Math.max(0, maxTreasuryTake - (me.tookGoldThisTurn || 0));

  const ringOrderIds = [
    ...turnOrder,
    ...players.map(p => p.id).filter(id => !turnOrder.includes(id))
  ];
  const myRingIdx = ringOrderIds.indexOf(me.id);
  const rotatedRingIds = myRingIdx !== -1
    ? [...ringOrderIds.slice(myRingIdx), ...ringOrderIds.slice(0, myRingIdx)]
    : ringOrderIds;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: isNight ? '#09070f' : '#121620',
      color: '#f1f5f9',
      transition: 'background-color 0.8s ease',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Bar */}
      <header style={{
        padding: '12px 24px',
        borderBottom: '1.5px solid rgba(142, 153, 171, 0.25)',
        background: 'rgba(13, 16, 23, 0.9)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 35
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span className="gothic-title" style={{ fontSize: '30px', color: '#f8fafc' }}>
            Blood <span style={{ color: '#e11d48', fontStyle: 'italic' }}>&amp;</span> Silver
          </span>
          <span className="ui-sans" style={{
            padding: '4px 12px', borderRadius: '99px', fontWeight: 800, fontSize: '12px',
            background: isNight ? '#4c1d95' : 'rgba(212, 168, 83, 0.2)',
            border: `1px solid ${isNight ? '#a855f7' : '#d4a853'}`,
            color: isNight ? '#f3e8ff' : '#fde68a'
          }}>
            MANOR {gameState.roomCode} • {phase} {day}
          </span>
          {timeLeftSec !== null && (
            <span className="ui-sans" style={{
              padding: '4px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '13px',
              background: timeLeftSec <= 5 ? '#9e1b32' : '#1e293b', color: '#fff'
            }}>
              ⏳ {timeLeftSec}s
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="ui-sans" style={{
            padding: '6px 14px', borderRadius: '8px',
            background: me.role === 'Vampire' ? '#9e1b32' : '#1e3a8a',
            color: '#f8fafc', fontWeight: 800, fontSize: '13px', border: '1.5px solid rgba(255,255,255,0.25)'
          }}>
            ROLE: {me.role === 'Vampire' ? '🧛 VAMPIRE' : me.role === 'Hunter' ? '🕵️ HUNTER' : '📺 TV DISPLAY'}
          </div>

          <button
            className="aesthetic-btn"
            style={{ width: 'auto', padding: '8px 14px', fontSize: '12px' }}
            onClick={() => setDrawerOpen(!drawerOpen)}
          >
            📜 {drawerOpen ? 'Hide Chronicle' : 'Chronicle & Deck'}
          </button>
        </div>
      </header>

      {errorBanner && (
        <div className="ui-sans" style={{
          position: 'fixed', top: '68px', left: '50%', transform: 'translateX(-50%)',
          padding: '10px 20px', borderRadius: '8px', background: '#9e1b32', color: '#fff',
          fontWeight: 800, zIndex: 90, boxShadow: '0 8px 20px rgba(0,0,0,0.45)'
        }}>
          ⚠️ {errorBanner}
        </div>
      )}

      {selectedCard && (
        <div className="ui-sans" style={{
          margin: '10px auto 0', padding: '10px 22px', borderRadius: '99px',
          background: '#d4a853', color: '#12161f', border: '2px solid #fde68a',
          fontWeight: 800, display: 'flex', alignItems: 'center', gap: '14px', zIndex: 35
        }}>
          <span>🎯 Casting [{selectedCard.name}]: Click any living player around the circle!</span>
          <button
            onClick={() => setSelectedCard(null)}
            style={{ padding: '4px 12px', borderRadius: '99px', background: '#12161f', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* CIRCULAR TABLETOP ARENA */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1060px',
        height: '470px',
        margin: '8px auto'
      }}>
        <div className="table-orbit-ring" style={{ width: '68%', height: '68%' }} />

        {/* CENTERPIECE: THE COMMONWEALTH VAULT */}
        <div className="velvet-panel" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '325px',
          padding: '20px',
          border: `2px solid ${isNight ? '#a855f7' : '#d4a853'}`,
          textAlign: 'center',
          zIndex: 20
        }}>
          {phase === 'GAME_OVER' ? (
            <div>
              <div className="serif-header" style={{ fontSize: '12px', fontWeight: 800, color: '#f43f5e' }}>
                🏆 TOTAL ANNIHILATION COMPLETE
              </div>
              <div className="gothic-title" style={{ fontSize: '28px', margin: '8px 0', color: '#f8fafc' }}>
                {gameState.winner}
              </div>
              <button
                className="aesthetic-btn aesthetic-btn-gold"
                style={{ padding: '10px', fontSize: '13px', marginTop: '6px' }}
                onClick={() => socket.emit('startGame')}
              >
                ⚔️ Play Another Round
              </button>
            </div>
          ) : phase === 'DAY' ? (
            <div>
              <div className="serif-header" style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8' }}>
                COMMONWEALTH VAULT • DAY {day}
              </div>
              <div className="gothic-title" style={{ fontSize: '38px', color: '#fde68a', margin: '2px 0' }}>
                🪙 {commonwealthGold} Gold
              </div>
              <div className="ui-sans" style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '12px' }}>
                {day <= 2 ? 'Rationing Law: Max 2G / Turn' : '🔥 Day 3+ Awakening: Max 4G / Turn'}
              </div>

              {isMyTurn ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="aesthetic-btn"
                      style={{ padding: '8px', fontSize: '12px' }}
                      disabled={remainingGoldTake < 1 || commonwealthGold < 1}
                      onClick={() => socket.emit('takeGold', { amount: 1 })}
                    >
                      +1 Gold
                    </button>
                    <button
                      className="aesthetic-btn aesthetic-btn-gold"
                      style={{ padding: '8px', fontSize: '12px' }}
                      disabled={remainingGoldTake < 1 || commonwealthGold < 1}
                      onClick={() => socket.emit('takeGold', { amount: remainingGoldTake })}
                    >
                      Take Max ({Math.min(remainingGoldTake, commonwealthGold)}G)
                    </button>
                  </div>
                  <button
                    className="aesthetic-btn aesthetic-btn-crimson"
                    style={{ padding: '9px', fontSize: '13px' }}
                    onClick={() => socket.emit('endTurn')}
                  >
                    End My Turn ➔
                  </button>
                </div>
              ) : (
                <div className="ui-sans" style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>
                  Awaiting <strong style={{ color: '#fde68a' }}>{players.find(p => p.id === currentTurnPlayerId)?.name}</strong>...
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="serif-header" style={{ fontSize: '13px', fontWeight: 800, color: '#e9d5ff', marginBottom: '8px' }}>
                🌙 NIGHT {day} CONSENSUS
              </div>
              {!me.alive ? (
                <div style={{ fontSize: '13px', color: '#cbd5e1' }}>The living guests are plotting in the dark...</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px', marginBottom: '8px' }}>
                    <button
                      onClick={() => setNightChoice('SHIELD')}
                      className="ui-sans"
                      style={{
                        padding: '7px 4px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                        background: nightChoice === 'SHIELD' ? '#d4a853' : '#151924',
                        color: nightChoice === 'SHIELD' ? '#12161f' : '#f8fafc', border: '1px solid #d4a853'
                      }}
                    >
                      🛡️ +2 Shield
                    </button>
                    <button
                      onClick={() => setNightChoice('DRAW')}
                      className="ui-sans"
                      style={{
                        padding: '7px 4px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                        background: nightChoice === 'DRAW' ? '#d4a853' : '#151924',
                        color: nightChoice === 'DRAW' ? '#12161f' : '#f8fafc', border: '1px solid #d4a853'
                      }}
                    >
                      🃏 +1 Card
                    </button>
                    {me.role === 'Hunter' ? (
                      <button
                        onClick={() => setNightChoice('GOLD')}
                        className="ui-sans"
                        style={{
                          padding: '7px 4px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                          background: nightChoice === 'GOLD' ? '#d4a853' : '#151924',
                          color: nightChoice === 'GOLD' ? '#12161f' : '#f8fafc', border: '1px solid #d4a853'
                        }}
                      >
                        🪙 +1 Gold
                      </button>
                    ) : (
                      <button
                        onClick={() => setNightChoice('USURP')}
                        className="ui-sans"
                        style={{
                          padding: '7px 4px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                          background: nightChoice === 'USURP' ? '#9e1b32' : '#151924',
                          color: '#fff', border: '1px solid #f43f5e'
                        }}
                      >
                        👑 Usurp #1
                      </button>
                    )}
                  </div>

                  {me.role === 'Vampire' && (
                    <div className="ui-sans" style={{ fontSize: '11px', color: '#fda4af', marginBottom: '8px', fontWeight: 700 }}>
                      🩸 Use + / - on seats to split Strikes ({totalAllocatedStrikes}/{nightPool} DMG)
                    </div>
                  )}

                  <button
                    className="aesthetic-btn aesthetic-btn-crimson"
                    style={{ padding: '8px', fontSize: '12px' }}
                    disabled={me.nightSubmitted}
                    onClick={() => socket.emit('submitNightAction', { choice: nightChoice, strikes: nightStrikes })}
                  >
                    {me.nightSubmitted ? '✓ Locked In (Waiting...)' : '🔒 Lock In Night Action'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* SEATS POSITIONED IN A CIRCLE */}
        {rotatedRingIds.map((pid, idx) => {
          const p = players.find(pl => pl.id === pid);
          if (!p) return null;

          const total = rotatedRingIds.length;
          const angleDeg = 90 + (idx * 360) / total;
          const angleRad = (angleDeg * Math.PI) / 180;
          const leftPct = 50 + 41 * Math.cos(angleRad);
          const topPct = 50 + 39 * Math.sin(angleRad);

          const isActiveSeat = phase === 'DAY' && currentTurnPlayerId === p.id;
          const canTarget = selectedCard && p.alive;
          const effect = seatEffects[p.id];
          const vampStrikePts = nightStrikes[p.id] || 0;

          return (
            <div
              key={p.id}
              onClick={() => {
                if (canTarget) {
                  socket.emit('playCard', { cardUid: selectedCard.uid, targetId: p.id });
                  setSelectedCard(null);
                }
              }}
              className={`circle-seat ${effect?.shake ? 'seat-hit-shake' : ''}`}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: '192px',
                padding: '11px 13px',
                borderRadius: '14px',
                background: isActiveSeat ? 'linear-gradient(165deg, #f8fafc 0%, #e2e8f0 100%)' : 'rgba(22, 27, 38, 0.92)',
                color: isActiveSeat ? '#12161f' : '#f8fafc',
                border: canTarget
                  ? '2.5px dashed #f43f5e'
                  : isActiveSeat
                  ? '2.5px solid #d4a853'
                  : '1.5px solid rgba(142, 153, 171, 0.35)',
                boxShadow: isActiveSeat ? '0 0 24px rgba(212, 168, 83, 0.6)' : '0 8px 20px rgba(0,0,0,0.4)',
                opacity: p.alive ? 1 : 0.48,
                cursor: canTarget ? 'pointer' : 'default',
                zIndex: isActiveSeat ? 25 : 15
              }}
            >
              {effect && (
                <div className="floating-combat-badge" style={{ background: effect.bg, color: '#fff' }}>
                  {effect.text}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div className="ui-sans" style={{ fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{p.name}</span>
                  {p.id === me.id && <span style={{ color: isActiveSeat ? '#9e1b32' : '#d4a853', fontSize: '10px' }}>(YOU)</span>}
                  {p.isNextFirst && <span title="Claims Turn #1 Tomorrow">👑</span>}
                </div>
                <span className="ui-sans" style={{
                  fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '99px',
                  background: isActiveSeat ? '#12161f' : '#d4a853',
                  color: isActiveSeat ? '#fde68a' : '#12161f'
                }}>
                  {p.turnPosition ? `#${p.turnPosition}` : 'FALLEN'}
                </span>
              </div>

              <div className="ui-sans" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
                <span style={{ color: p.role === 'Vampire' ? '#f43f5e' : p.role === 'Hunter' ? '#38bdf8' : '#94a3b8' }}>
                  {p.role === 'Hidden' ? 'Role: Unknown' : `Role: ${p.role}`}
                </span>
                {isNight && p.alive && (
                  <span style={{ color: p.nightSubmitted ? '#4ade80' : '#facc15' }}>
                    {p.nightSubmitted ? '✓ Ready' : 'Plotting...'}
                  </span>
                )}
              </div>

              <div style={{ height: '6px', background: 'rgba(142,153,171,0.25)', borderRadius: '99px', overflow: 'hidden', marginBottom: '7px' }}>
                <div style={{
                  width: `${(p.hp / 10) * 100}%`,
                  height: '100%',
                  background: p.hp > 5 ? '#16a34a' : p.hp > 2 ? '#d97706' : '#e11d48',
                  transition: 'width 0.35s ease'
                }} />
              </div>

              <div className="ui-sans" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800 }}>
                <span>❤️ {p.hp}/10</span>
                <span>🛡️ {p.shield}</span>
                <span>🪙 {p.gold}G</span>
                <span>🃏 {p.cardCount}</span>
              </div>

              {isNight && me.role === 'Vampire' && me.alive && p.alive && !me.nightSubmitted && (
                <div className="ui-sans" style={{
                  marginTop: '7px', paddingTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.2)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '11px', color: '#fda4af', fontWeight: 700 }}>🩸 Strike:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); adjustStrike(p.id, -1); }}
                      style={{ width: '22px', height: '22px', borderRadius: '4px', background: '#1e293b', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800 }}
                    >-</button>
                    <span style={{ fontSize: '12px', fontWeight: 900, color: vampStrikePts > 0 ? '#f43f5e' : '#94a3b8' }}>
                      {vampStrikePts}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); adjustStrike(p.id, 1); }}
                      style={{ width: '22px', height: '22px', borderRadius: '4px', background: '#9e1b32', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800 }}
                    >+</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* BOTTOM FANNED HAND */}
      <footer style={{ padding: '6px 20px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 25 }}>
        <div className="ui-sans" style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px', letterSpacing: '0.05em' }}>
          🃏 YOUR SECRET HAND ({me.hand.length}/4 MAX AT END OF TURN) • PERSONAL GOLD: <strong style={{ color: '#fde68a' }}>🪙 {me.gold}G</strong>
        </div>

        {me.hand.length === 0 ? (
          <div className="velvet-panel" style={{ padding: '12px 24px', fontSize: '13px', color: '#cbd5e1' }}>
            Your hand is empty. You will automatically draw +1 Card at Dawn.
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
            {me.hand.map((card, idx) => {
              const lockedByDay = day < (card.minDay || 1);
              const canAfford = me.gold >= card.cost;
              const canPlay = isMyTurn && canAfford && !lockedByDay;
              const mid = (me.hand.length - 1) / 2;
              const rotateDeg = (idx - mid) * 3.5;

              return (
                <div
                  key={card.uid}
                  className="hand-tarot-card"
                  style={{
                    transform: `rotate(${rotateDeg}deg)`,
                    borderColor: selectedCard?.uid === card.uid ? '#e11d48' : '#2b3344'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="gothic-title" style={{ fontWeight: 700, fontSize: '18px' }}>
                        {card.name}
                      </span>
                      <span className="ui-sans" style={{
                        padding: '2px 7px', borderRadius: '99px', background: '#d4a853',
                        color: '#12161f', fontWeight: 800, fontSize: '11px'
                      }}>
                        {card.cost}G
                      </span>
                    </div>

                    <InkCardArt cardId={card.id} category={card.category} size={62} />

                    <p style={{ fontSize: '11.5px', lineHeight: 1.35, color: '#1e2536' }}>
                      {card.desc}
                    </p>
                  </div>

                  <div>
                    {lockedByDay && (
                      <div className="ui-sans" style={{ fontSize: '10px', color: '#9e1b32', fontWeight: 800, textAlign: 'center', marginBottom: '4px' }}>
                        🔒 Unlocks Day {card.minDay}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '5px', marginTop: '6px' }}>
                      <button
                        className="aesthetic-btn aesthetic-btn-crimson"
                        style={{ padding: '6px', fontSize: '11px', flex: 1 }}
                        disabled={!canPlay}
                        onClick={() => {
                          if (!card.needsTarget) {
                            socket.emit('playCard', { cardUid: card.uid, targetId: me.id });
                          } else {
                            setSelectedCard(card);
                          }
                        }}
                      >
                        {card.needsTarget ? 'Target' : 'Cast'}
                      </button>
                      <button
                        className="aesthetic-btn"
                        style={{ width: 'auto', padding: '6px 9px', fontSize: '10px', background: '#1e2536' }}
                        disabled={!isMyTurn || me.gold < 1}
                        title="Spend 1G to discard and draw a new card"
                        onClick={() => socket.emit('cycleCard', { cardUid: card.uid })}
                      >
                        🔄 1G
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </footer>

      {/* COLLAPSIBLE CHRONICLE & DECK DRAWER */}
      {drawerOpen && (
        <aside className="velvet-panel" style={{
          position: 'fixed', top: '64px', right: '16px', bottom: '16px', width: '350px',
          padding: '18px', zIndex: 60, display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'CHRONICLE', label: '📜 Log' },
              { id: 'INTEL', label: '🕵️ Intel' },
              { id: 'DECK', label: `🃏 Deck (${gameState.deckCount})` }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setDrawerTab(t.id)}
                className="ui-sans"
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', fontWeight: 700, fontSize: '12px',
                  cursor: 'pointer', border: '1px solid rgba(142,153,171,0.3)',
                  background: drawerTab === t.id ? '#9e1b32' : 'rgba(13,16,23,0.7)',
                  color: '#fff'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
            {drawerTab === 'CHRONICLE' && gameState.logs.map((entry, i) => (
              <div key={i} style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(13,16,23,0.7)', borderBottom: '1px solid rgba(142,153,171,0.15)' }}>
                {entry}
              </div>
            ))}
            {drawerTab === 'INTEL' && me.intel.map((line, i) => (
              <div key={i} style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(13,16,23,0.7)', color: '#fde68a' }}>
                {line}
              </div>
            ))}
            {drawerTab === 'DECK' && gameState.deckSummary?.map(item => (
              <div key={item.id} className="ui-sans" style={{
                padding: '8px 10px', borderRadius: '8px', background: 'rgba(13,16,23,0.7)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px'
              }}>
                <div><strong>{item.name}</strong> ({item.cost}G)</div>
                <span style={{ fontWeight: 800, color: '#fde68a' }}>{item.remaining}/{item.total}</span>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}