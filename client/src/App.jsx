import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const socket = io(BACKEND_URL, { autoConnect: true });

const FALLBACK_CATALOG = [
  { id: 'iron_dagger', name: 'IRON DAGGER', cost: 1, copies: 7, category: 'Attack', minDay: 1, needsTarget: true, desc: 'CHOOSE ANY PLAYER. THEY TAKE 2 DAMAGE UNLESS BLOCKED BY SHIELD.' },
  { id: 'silver_caltrops', name: 'SILVER CALTROPS', cost: 1, copies: 4, category: 'Attack', minDay: 1, needsTarget: true, desc: 'DEAL 2 DAMAGE TO ANY PLAYER AND GAIN +1 SHIELD FOR YOURSELF UNTIL DAWN.' },
  { id: 'wooden_shield', name: 'WOODEN SHIELD', cost: 1, copies: 6, category: 'Defense', minDay: 1, needsTarget: true, desc: 'GIVE ANY PLAYER +2 SHIELD UNTIL DAWN. UNBROKEN SHIELD ON DAYS 1–2 GRANTS +1 GOLD AT DAWN.' },
  { id: 'sacred_ward', name: 'SACRED WARD', cost: 2, copies: 4, category: 'Defense', minDay: 1, needsTarget: true, desc: 'FORTIFY ANY PLAYER WITH +4 SHIELD UNTIL DAWN.' },
  { id: 'healing_salve', name: 'HEALING SALVE', cost: 1, copies: 4, category: 'Heal', minDay: 1, needsTarget: true, desc: 'RESTORE +3 HP TO ANY LIVING PLAYER (UP TO 10 HP MAX).' },
  { id: 'royal_decree', name: 'ROYAL DECREE', cost: 1, copies: 3, category: 'Order', minDay: 1, needsTarget: true, desc: "CHOOSE ANY PLAYER. THEY CLAIM THE TURN #1 INITIATIVE SEAT AT TOMORROW'S DAWN." },
  { id: 'shadow_swap', name: 'SHADOW SWAP', cost: 0, copies: 3, category: 'Order', minDay: 1, needsTarget: true, desc: 'FREE TO PLAY. SWAP YOUR CURRENT TURN ORDER SEAT AROUND THE CIRCLE WITH ANOTHER PLAYER.' },
  { id: 'time_twist', name: 'TIME TWIST', cost: 1, copies: 2, category: 'Order', minDay: 1, needsTarget: false, desc: 'REVERSE THE TABLE TURN ORDER DIRECTION IMMEDIATELY AND DRAW 1 CARD.' },
  { id: 'bloodhound', name: 'BLOODHOUND', cost: 1, copies: 3, category: 'Intel', minDay: 1, needsTarget: true, desc: "INSPECT ANY PLAYER TO PRIVATELY PEEK AT 1 RANDOM CARD IN THEIR HAND." },
  { id: 'cutpurse', name: 'CUTPURSE', cost: 0, copies: 3, category: 'Trick', minDay: 1, needsTarget: true, desc: 'FREE TO PLAY. STEAL UP TO 1 GOLD AND 1 RANDOM CARD FROM ANOTHER PLAYER.' },
  { id: 'holy_water', name: 'HOLY WATER', cost: 2, copies: 3, category: 'Attack', minDay: 1, needsTarget: true, desc: 'DEAL 3 DAMAGE TO ANY PLAYER. UPGRADES TO 4 DAMAGE STARTING ON DAY 3.' },
  { id: 'inquisitor_lens', name: "INQUISITOR'S LENS", cost: 2, copies: 3, category: 'Intel', minDay: 3, needsTarget: true, desc: 'UNLOCKS DAY 3. PRIVATELY REVEAL ANY PLAYER’S TRUE SECRET ROLE (HUNTER OR VAMPIRE).' },
  { id: 'executioner_pistol', name: "EXECUTIONER'S PISTOL", cost: 3, copies: 2, category: 'Attack', minDay: 3, needsTarget: true, desc: 'UNLOCKS DAY 3. FIRE A SILVER BULLET FOR 5 PIERCING DAMAGE THAT IGNORES ALL SHIELDS.' },
  { id: 'vampiric_curse', name: 'VAMPIRIC CURSE', cost: 4, copies: 1, category: 'Twist', minDay: 3, needsTarget: true, desc: 'UNLOCKS DAY 3. CONVERT ANY PLAYER (OR YOURSELF!) INTO A VAMPIRE OF THE CRIMSON COVEN.' },
  { id: 'purifying_elixir', name: 'PURIFYING ELIXIR', cost: 4, copies: 1, category: 'Twist', minDay: 3, needsTarget: true, desc: 'UNLOCKS DAY 3. CLEANSE A VAMPIRE BACK INTO A HUNTER AND RESTORE +3 HP.' }
];

const HOW_TO_PLAY_SLIDES = [
  {
    title: 'HOW TO PLAY — TOTAL ANNIHILATION',
    lines: [
      'YOU ARE SECRETLY DEALT A ROLE: HUNTER (ORDER OF DAWN) OR VAMPIRE (CRIMSON COVEN). EVERYONE STARTS WITH 10 HP, 1 GOLD, AND 2 CARDS.',
      'HUNTERS WIN ONLY BY ELIMINATING ALL VAMPIRES. VAMPIRES WIN ONLY BY ELIMINATING ALL HUNTERS (TOTAL ANNIHILATION—EQUAL NUMBERS IS NOT ENOUGH!).',
      'WATCH HOW MUCH GOLD PLAYERS TAKE FROM THE COMMONWEALTH, WHO SWAPS TURN SEATS, AND WHO ATTACKS WHOM.'
    ]
  },
  {
    title: 'THE SHARED COMMONWEALTH & TURN ORDER',
    lines: [
      'AT EVERY DAWN, THE CENTRAL COMMONWEALTH POT IS FILLED WITH (ALIVE PLAYERS × 2) + 3 GOLD.',
      'PLAYERS ACT IN CLOCKWISE SEAT ORDER AROUND THE CIRCLE. EARLY SEATS GET FIRST ACCESS TO GOLD, WHILE LATE SEATS RISK AN EMPTY POT!',
      'USE ROYAL DECREE, SHADOW SWAP, AND TIME TWIST TO HIJACK TURN ORDER AND CONTROL THE ECONOMY.'
    ]
  },
  {
    title: 'DAYS 1–2 COLD WAR VS. DAY 3 AWAKENING',
    lines: [
      'ON DAYS 1 & 2, PLAYERS MAY ONLY TAKE UP TO 2 GOLD PER TURN. ENDING THE NIGHT WITH UNBROKEN SHIELD REWARDS +1 BONUS GOLD AT DAWN.',
      'ON DAY 3, THE SEAL BREAKS: THE TREASURY LIMIT RISES TO 4 GOLD, AND INQUISITOR’S LENS, EXECUTIONER’S PISTOL, AND CURSES UNLOCK!'
    ]
  },
  {
    title: 'SECRET NIGHT CONSENSUS & SPLIT STRIKES',
    lines: [
      'WHEN ALL PLAYERS FINISH THEIR DAY TURN, NIGHT FALLS. EVERYONE SECRETLY PICKS A NIGHT PERK (+2 SHIELD, +1 CARD, GOLD, OR USURP TURN #1).',
      'SIMULTANEOUSLY, VAMPIRES DISTRIBUTE THEIR NIGHT BLOOD POOL (3 DMG NIGHT 1, 4 DMG NIGHT 2...) ACROSS ONE OR MULTIPLE VICTIMS!'
    ]
  }
];

// Hand-Inked Vintage Illustration for Cards (Pic 3 Style)
function InkCardArt({ cardId, category, size = 110 }) {
  const fillAccent =
    category === 'Attack' ? '#b9382c' :
    category === 'Defense' ? '#3b7a9e' :
    category === 'Order' ? '#cfa346' :
    category === 'Heal' ? '#3f8a5c' :
    category === 'Twist' ? '#7c3f8a' : '#a86432';

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px 0' }}>
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="42" fill={fillAccent} fillOpacity="0.16" stroke="#1d2a32" strokeWidth="3.5" />
        {cardId === 'iron_dagger' && (
          <>
            <path d="M24 76L42 58M74 26L40 60L34 54L68 20L78 20L74 26Z" fill={fillAccent} stroke="#1d2a32" strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M30 48L52 70" stroke="#1d2a32" strokeWidth="4" strokeLinecap="round" />
          </>
        )}
        {cardId === 'silver_caltrops' && (
          <>
            <polygon points="50,16 59,41 84,50 59,59 50,84 41,59 16,50 41,41" fill={fillAccent} stroke="#1d2a32" strokeWidth="3.5" strokeLinejoin="round" />
            <circle cx="50" cy="50" r="8" fill="#efe6d5" stroke="#1d2a32" strokeWidth="3" />
          </>
        )}
        {(cardId === 'wooden_shield' || cardId === 'sacred_ward') && (
          <>
            <path d="M50 18L78 30V50C78 69 50 84 50 84C50 84 22 69 22 50V30L50 18Z" fill={fillAccent} stroke="#1d2a32" strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M50 28V72M34 46H66" stroke="#efe6d5" strokeWidth="4" strokeLinecap="round" />
          </>
        )}
        {cardId === 'healing_salve' && (
          <>
            <rect x="31" y="34" width="38" height="44" rx="7" fill={fillAccent} stroke="#1d2a32" strokeWidth="3.5" />
            <path d="M40 22H60V34H40V22Z" fill="#cfa346" stroke="#1d2a32" strokeWidth="3.5" />
            <path d="M50 46V66M40 56H60" stroke="#efe6d5" strokeWidth="4.5" strokeLinecap="round" />
          </>
        )}
        {cardId === 'royal_decree' && (
          <>
            <polygon points="20,70 28,34 42,50 50,24 58,50 72,34 80,70" fill={fillAccent} stroke="#1d2a32" strokeWidth="3.5" strokeLinejoin="round" />
            <rect x="20" y="72" width="60" height="7" rx="3" fill="#1d2a32" />
          </>
        )}
        {cardId === 'shadow_swap' && (
          <>
            <path d="M24 38H76L62 24M76 62H24L38 76" stroke="#1d2a32" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="50" cy="50" r="10" fill={fillAccent} stroke="#1d2a32" strokeWidth="3.5" />
          </>
        )}
        {cardId === 'time_twist' && (
          <>
            <polygon points="30,22 70,22 50,50 70,78 30,78 50,50" fill={fillAccent} stroke="#1d2a32" strokeWidth="3.5" strokeLinejoin="round" />
            <line x1="24" y1="22" x2="76" y2="22" stroke="#1d2a32" strokeWidth="4" strokeLinecap="round" />
            <line x1="24" y1="78" x2="76" y2="78" stroke="#1d2a32" strokeWidth="4" strokeLinecap="round" />
          </>
        )}
        {(cardId === 'bloodhound' || cardId === 'inquisitor_lens') && (
          <>
            <circle cx="44" cy="44" r="20" fill={fillAccent} stroke="#1d2a32" strokeWidth="4" />
            <circle cx="44" cy="44" r="9" fill="#efe6d5" stroke="#1d2a32" strokeWidth="3" />
            <line x1="59" y1="59" x2="78" y2="78" stroke="#1d2a32" strokeWidth="6" strokeLinecap="round" />
          </>
        )}
        {cardId === 'cutpurse' && (
          <>
            <path d="M32 38C25 46 24 62 30 72C36 80 64 80 70 72C76 62 75 46 68 38Z" fill={fillAccent} stroke="#1d2a32" strokeWidth="3.5" />
            <path d="M36 38L42 22H58L64 38" fill="#cfa346" stroke="#1d2a32" strokeWidth="3.5" />
          </>
        )}
        {cardId === 'holy_water' && (
          <>
            <path d="M50 18C50 18 76 46 76 64C76 78 64 86 50 86C36 86 24 78 24 64C24 46 50 18 50 18Z" fill={fillAccent} stroke="#1d2a32" strokeWidth="3.5" />
            <path d="M50 44V68M38 56H62" stroke="#efe6d5" strokeWidth="4" strokeLinecap="round" />
          </>
        )}
        {cardId === 'executioner_pistol' && (
          <>
            <path d="M20 38H74V50H44L38 74H22L28 50H20V38Z" fill={fillAccent} stroke="#1d2a32" strokeWidth="3.5" strokeLinejoin="round" />
            <circle cx="82" cy="44" r="5" fill="#cfa346" stroke="#1d2a32" strokeWidth="3" />
          </>
        )}
        {(cardId === 'vampiric_curse' || cardId === 'purifying_elixir') && (
          <>
            <path d="M26 32H74L66 56L58 38L50 52L42 38L34 56L26 32Z" fill={fillAccent} stroke="#1d2a32" strokeWidth="3.5" strokeLinejoin="round" />
            <circle cx="50" cy="68" r="7" fill="#b9382c" stroke="#1d2a32" strokeWidth="3" />
          </>
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
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [showTvInput, setShowTvInput] = useState(false);

  // Pic 3 Lobby Interactive State
  const [ruleSlideIdx, setRuleSlideIdx] = useState(0);
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

  // Combat Animation Tracking (Detects HP drops & Shield boosts per player)
  const prevPlayersRef = useRef({});
  const [seatEffects, setSeatEffects] = useState({}); // { [playerId]: { text, color, shake } }

  useEffect(() => {
    socket.on('gameState', (data) => {
      // Compare with previous player stats to trigger floating combat popups & hit shakes
      if (data?.players) {
        const newEffects = {};
        data.players.forEach(p => {
          const prev = prevPlayersRef.current[p.id];
          if (prev) {
            if (p.hp < prev.hp) {
              newEffects[p.id] = { text: `-${prev.hp - p.hp} HP`, bg: '#991b1b', shake: true };
            } else if (p.hp > prev.hp) {
              newEffects[p.id] = { text: `+${p.hp - prev.hp} HP`, bg: '#15803d', shake: false };
            } else if (p.shield > prev.shield) {
              newEffects[p.id] = { text: `+${p.shield - prev.shield} 🛡️`, bg: '#0369a1', shake: false };
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

  // Live Turn Countdown Timer
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
  // SCREEN 1 & SCREEN 2: MINIMALIST TITLE SCREEN (PIC 1) & FIND A GAME (PIC 2)
  // ============================================================================
  if (!gameState) {
    if (screenMode === 'FIND_GAME') {
      return (
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
          <h1 className="serif-header" style={{ fontSize: '32px', fontWeight: 800, color: '#143338', marginBottom: '10px' }}>
            FIND A GAME
          </h1>
          <p style={{ maxWidth: '460px', textAlign: 'center', fontSize: '13px', letterSpacing: '0.05em', lineHeight: 1.5, color: '#3e4a50', marginBottom: '22px', textTransform: 'uppercase' }}>
            PUBLIC GAMES SUPPORT 3–8 PLAYERS. JOIN AN OPEN LOBBY BELOW OR WATCH A GAME IN PROGRESS TO CLAIM A SEAT NEXT ROUND.
          </p>

          {errorBanner && (
            <div style={{ padding: '10px 18px', borderRadius: '8px', background: '#991b1b', color: '#fff', marginBottom: '14px', fontWeight: 700 }}>
              ⚠️ {errorBanner}
            </div>
          )}

          <div className="ink-box" style={{ width: '100%', maxWidth: '430px', padding: '26px 24px', display: ' flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="serif-header" style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                USERNAME
              </label>
              <input
                className="ink-input"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="YOUR NAME"
              />
            </div>

            {/* Open Lobbies List */}
            {publicRooms.openLobbies.length === 0 ? (
              <div style={{ padding: '16px', borderRadius: '8px', background: '#dfd5be', border: '1.5px solid #b8ad96', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
                NO OPEN PUBLIC LOBBIES RIGHT NOW. CREATE ONE BELOW!
              </div>
            ) : (
              publicRooms.openLobbies.map(room => (
                <div key={room.roomCode} style={{ padding: '14px 16px', borderRadius: '8px', background: '#dfd5be', border: '1.5px solid #b8ad96' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                      <div className="serif-header" style={{ fontSize: '17px', fontWeight: 800, color: '#143338' }}>
                        ROOM {room.roomCode}
                      </div>
                      <div style={{ fontSize: '11px', color: '#4a555b', textTransform: 'uppercase', fontWeight: 600 }}>
                        {room.playerCount}/{room.maxPlayers} PLAYERS • HOST: {room.hostName} • RECOMMENDED
                      </div>
                    </div>
                    <button
                      className="ink-btn ink-btn-gold"
                      style={{ width: 'auto', padding: '10px 20px' }}
                      onClick={() => socket.emit('joinRoom', { roomCode: room.roomCode, playerName: playerName || 'Hunter' })}
                    >
                      JOIN
                    </button>
                  </div>
                  {/* Progress Bar matching Pic 2 */}
                  <div style={{ height: '6px', background: '#b0a387', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ width: `${(room.playerCount / room.maxPlayers) * 100}%`, height: '100%', background: '#cfa346' }} />
                  </div>
                </div>
              ))
            )}

            {/* Games In Progress Section matching Pic 2 */}
            <div>
              <div className="serif-header" style={{ fontSize: '13px', fontWeight: 800, marginBottom: '2px' }}>
                GAMES IN PROGRESS
              </div>
              <div style={{ fontSize: '11px', color: '#4a555b', textTransform: 'uppercase', marginBottom: '10px' }}>
                WATCH NOW ON YOUR SCREEN OR TV DISPLAY.
              </div>

              {publicRooms.inProgress.length === 0 ? (
                <div style={{ padding: '12px', borderRadius: '8px', background: '#e5dcc8', border: '1px solid #c5bba4', fontSize: '12px', textAlign: 'center', color: '#5c666c' }}>
                  NO ACTIVE GAMES IN PROGRESS.
                </div>
              ) : (
                publicRooms.inProgress.map(room => (
                  <div key={room.roomCode} style={{ padding: '14px 16px', borderRadius: '8px', background: '#dfd5be', border: '1.5px solid #b8ad96', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <div className="serif-header" style={{ fontSize: '16px', fontWeight: 800, color: '#143338' }}>
                        ROOM {room.roomCode}
                      </div>
                      <div style={{ fontSize: '11px', color: '#4a555b', textTransform: 'uppercase', fontWeight: 600 }}>
                        {room.phase} {room.day} • {room.playerCount} PLAYING • {room.spectatorCount} WATCHING
                      </div>
                    </div>
                    <button
                      className="ink-btn"
                      style={{ width: 'auto', padding: '10px 18px' }}
                      onClick={() => socket.emit('watchRoom', { roomCode: room.roomCode })}
                    >
                      WATCH
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              className="ink-btn"
              onClick={() => socket.emit('createRoom', { playerName: playerName || 'Hunter' })}
            >
              CREATE NEW LOBBY
            </button>

            <div style={{ fontSize: '11px', textAlign: 'center', color: '#4a555b', textTransform: 'uppercase', lineHeight: 1.4 }}>
              THREE IS THE MINIMUM, EIGHT IS THE LIMIT. JOIN AN EXISTING GROUP OR ADD BOTS IN THE LOBBY.
            </div>

            <button
              className="ink-btn"
              onClick={() => setScreenMode('HOME')}
            >
              ← BACK
            </button>
          </div>
        </main>
      );
    }

    // SCREEN 1: Minimalist Home Screen matching Pic 1
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
        <div style={{ width: '100%', maxWidth: '370px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h1 className="gothic-title" style={{ fontSize: '74px', textAlign: 'center', marginBottom: '12px' }}>
            Blood &<br />Silver
          </h1>
          <p className="serif-header" style={{ fontSize: '12px', fontWeight: 700, color: '#2b3940', marginBottom: '30px', textAlign: 'center' }}>
            A HIDDEN-ROLE CARD GAME FOR 3–8 PLAYERS.
          </p>

          {errorBanner && (
            <div style={{ width: '100%', padding: '10px', borderRadius: '7px', background: '#991b1b', color: '#fff', marginBottom: '14px', textAlign: 'center', fontWeight: 700 }}>
              ⚠️ {errorBanner}
            </div>
          )}

          <div style={{ width: '100%', marginBottom: '16px' }}>
            <label className="serif-header" style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              USERNAME
            </label>
            <input
              className="ink-input"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="YOUR NAME"
            />
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              className="ink-btn ink-btn-gold"
              onClick={() => socket.emit('createRoom', { playerName: playerName || 'Hunter' })}
            >
              NEW GAME
            </button>

            {!showJoinInput ? (
              <button
                className="ink-btn"
                onClick={() => setShowJoinInput(true)}
              >
                JOIN GAME
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="ink-input"
                  value={joinCodeInput}
                  onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="4-LETTER CODE"
                  maxLength={4}
                  style={{ textAlign: 'center', letterSpacing: '3px' }}
                />
                <button
                  className="ink-btn ink-btn-gold"
                  style={{ width: 'auto', padding: '0 22px' }}
                  onClick={() => socket.emit('joinRoom', { roomCode: joinCodeInput, playerName: playerName || 'Guest' })}
                >
                  GO
                </button>
              </div>
            )}

            <button
              className="ink-btn"
              onClick={() => {
                socket.emit('getPublicRooms');
                setScreenMode('FIND_GAME');
              }}
            >
              <span>📡</span> FIND GAME
            </button>
          </div>

          <p style={{ fontSize: '11px', textAlign: 'center', color: '#3e4a50', textTransform: 'uppercase', lineHeight: 1.45, margin: '14px 0' }}>
            BEST ENJOYED WITH FRIENDS AROUND A TABLE—SCHEMES, SUSPICIONS, AND ALL. FLYING SOLO? FIND A PUBLIC GAME OR ADD AI BOTS.
          </p>

          {!showTvInput ? (
            <button
              className="ink-btn"
              onClick={() => setShowTvInput(true)}
            >
              <span>📺</span> WATCH AS TV DISPLAY
            </button>
          ) : (
            <div style={{ width: '100%', display: 'flex', gap: '8px' }}>
              <input
                className="ink-input"
                value={joinCodeInput}
                onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                maxLength={4}
                style={{ textAlign: 'center', letterSpacing: '3px' }}
              />
              <button
                className="ink-btn ink-btn-dark"
                style={{ width: 'auto', padding: '0 20px' }}
                onClick={() => socket.emit('watchRoom', { roomCode: joinCodeInput })}
              >
                WATCH
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ============================================================================
  // SCREEN 3: INTERACTIVE SPLIT LOBBY (MATCHING PICTURE 3)
  // ============================================================================
  if (gameState.phase === 'LOBBY') {
    const catalog = gameState.catalog?.length ? gameState.catalog : FALLBACK_CATALOG;
    const activeCard = catalog[showcaseCardIdx % catalog.length];
    const currentSlide = HOW_TO_PLAY_SLIDES[ruleSlideIdx % HOW_TO_PLAY_SLIDES.length];
    const readyCount = gameState.players.filter(p => p.ready).length;
    const isHost = gameState.hostId === gameState.me.id;

    return (
      <div style={{ minHeight: '100vh', padding: '18px', display: 'grid', gridTemplateColumns: '280px 1fr', gap: '22px' }}>
        {/* LEFT SIDEBAR: Lobby Players, Ready Toggle & Game Settings (Pic 3) */}
        <aside style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
          <div className="ink-box" style={{ padding: '18px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="serif-header" style={{ fontWeight: 800, fontSize: '15px' }}>LOBBY</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: '#d5cbb8', fontWeight: 700 }}>
                  CODE: {gameState.roomCode}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#4a555b', textTransform: 'uppercase', marginBottom: '12px' }}>
                {gameState.players.length} / 8 PLAYERS • NEED AT LEAST 2 TO START
              </div>

              <button
                className="ink-btn ink-btn-dark"
                style={{ padding: '10px', fontSize: '12px', marginBottom: '18px' }}
                onClick={() => {
                  navigator.clipboard?.writeText(gameState.roomCode);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
              >
                {copiedCode ? `✓ COPIED CODE (${gameState.roomCode})` : `SHARE ROOM CODE: ${gameState.roomCode}`}
              </button>

              <div className="serif-header" style={{ fontSize: '12px', fontWeight: 800, marginBottom: '8px' }}>
                PLAYERS
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px', maxHeight: '210px', overflowY: 'auto' }}>
                {gameState.players.map((p, idx) => (
                  <div key={p.id} style={{
                    padding: '8px 10px', borderRadius: '6px', background: '#e5dcc8',
                    border: '1px solid #c5bba4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                      <span>{p.isBot ? '🤖' : '🕵️'}</span>
                      <span>{p.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{
                        fontSize: '9px', padding: '2px 5px', borderRadius: '4px', fontWeight: 700,
                        background: p.ready ? '#cfa346' : '#d5cbb8', color: '#141c22'
                      }}>
                        {p.ready ? 'READY' : 'NOT READY'}
                      </span>
                      {idx === 0 && (
                        <span style={{ fontSize: '9px', padding: '2px 5px', borderRadius: '4px', background: '#1d2a32', color: '#f4efe6', fontWeight: 700 }}>
                          HOST
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                className="ink-btn ink-btn-gold"
                style={{ padding: '11px', fontSize: '13px', marginBottom: '8px' }}
                onClick={() => socket.emit('toggleReady')}
              >
                {gameState.me.ready ? '✓ READY (CLICK TO UNREADY)' : "I'M READY"}
              </button>

              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                <button
                  className="ink-btn"
                  style={{ padding: '8px', fontSize: '11px' }}
                  onClick={() => socket.emit('addBot')}
                >
                  + AI BOT
                </button>
                {isHost && (
                  <button
                    className="ink-btn ink-btn-dark"
                    style={{ padding: '8px', fontSize: '11px' }}
                    disabled={gameState.players.length < 2}
                    onClick={() => socket.emit('startGame')}
                  >
                    START NOW
                  </button>
                )}
              </div>

              <div style={{ textAlign: 'center', padding: '8px 4px', borderTop: '1px solid #c5bba4', borderBottom: '1px solid #c5bba4' }}>
                <div className="serif-header" style={{ fontSize: '12px', fontWeight: 800, marginBottom: '4px' }}>
                  WAITING FOR PLAYERS
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#4a555b', marginBottom: '4px' }}>
                  {readyCount}/{gameState.players.length} READY
                </div>
                <p style={{ fontSize: '10px', color: '#4a555b', textTransform: 'uppercase', lineHeight: 1.4 }}>
                  MARK YOURSELF READY WHILE READING THE CARDS, OR HOST CAN CLICK START NOW WITH 2+ PLAYERS.
                </p>
              </div>
            </div>

            {/* Bottom Game Settings matching Pic 3: Turn Timer (OFF / 30S / FAST 15S) */}
            <div style={{ marginTop: '14px' }}>
              <div className="serif-header" style={{ fontSize: '10px', fontWeight: 800, color: '#4a555b', marginBottom: '8px' }}>
                GAME SETTINGS
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <div className="serif-header" style={{ fontSize: '11px', fontWeight: 800 }}>TURN TIMER</div>
                  <div style={{ fontSize: '9px', color: '#4a555b', textTransform: 'uppercase', maxWidth: '115px', lineHeight: 1.25 }}>
                    30S OR FAST (15S) PER TURN WITH AUTO-GOLD IF TIME RUNS OUT.
                  </div>
                </div>

                <div style={{ display: 'inline-flex', border: '2px solid #1d2a32', borderRadius: '6px', overflow: 'hidden', background: '#dfd5be' }}>
                  {[
                    { id: 'OFF', label: 'OFF' },
                    { id: '30', label: '30S' },
                    { id: 'FAST', label: 'FAST' }
                  ].map(opt => {
                    const active = gameState.turnTimerSetting === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => socket.emit('setTurnTimer', { setting: opt.id })}
                        style={{
                          padding: '6px 8px',
                          fontSize: '10px',
                          fontFamily: 'Cinzel, serif',
                          fontWeight: 800,
                          border: 'none',
                          cursor: 'pointer',
                          background: active ? '#cfa346' : 'transparent',
                          color: '#141c22'
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ fontSize: '10px', textAlign: 'center', color: '#4a555b', letterSpacing: '0.08em', paddingTop: '6px', borderTop: '1px solid #c5bba4' }}>
                ROOM CODE: <strong>{gameState.roomCode}</strong>
              </div>
            </div>
          </div>

          <button
            className="ink-btn"
            style={{ width: 'auto', alignSelf: 'flex-start', padding: '10px 16px', fontSize: '12px' }}
            onClick={() => {
              socket.emit('leaveRoom');
              setGameState(null);
            }}
          >
            EXIT GAME
          </button>
        </aside>

        {/* RIGHT MAIN AREA: Top "How to Play" Banner + Bottom Interactive Tarot Card Showcase (Pic 3) */}
        <section style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
          {/* Top-Right "HOW TO PLAY" Carousel */}
          <div className="ink-box" style={{ padding: '22px 28px', position: 'relative', minHeight: '195px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="serif-header" style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px', color: '#143338' }}>
                {currentSlide.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '820px' }}>
                {currentSlide.lines.map((line, i) => (
                  <p key={i} style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.03em', lineHeight: 1.45, color: '#1d2a32' }}>
                    {line}
                  </p>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
              <button
                className="circle-nav-btn"
                onClick={() => setRuleSlideIdx((ruleSlideIdx - 1 + HOW_TO_PLAY_SLIDES.length) % HOW_TO_PLAY_SLIDES.length)}
              >
                ‹
              </button>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#4a555b' }}>
                {(ruleSlideIdx % HOW_TO_PLAY_SLIDES.length) + 1} / {HOW_TO_PLAY_SLIDES.length}
              </span>
              <button
                className="circle-nav-btn"
                onClick={() => setRuleSlideIdx((ruleSlideIdx + 1) % HOW_TO_PLAY_SLIDES.length)}
              >
                ›
              </button>
            </div>
          </div>

          {/* Center-Right Giant Tarot Card Browser (Pic 3) */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
            <button
              className="circle-nav-btn"
              style={{ width: '42px', height: '42px', fontSize: '18px' }}
              onClick={() => setShowcaseCardIdx((showcaseCardIdx - 1 + catalog.length) % catalog.length)}
            >
              ‹
            </button>

            <div key={activeCard.id} className="tarot-showcase-card">
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c6f5a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {activeCard.minDay > 1 ? `🔒 DAY ${activeCard.minDay}+ AWAKENING` : `${activeCard.category} CARD`} • {showcaseCardIdx + 1}/{catalog.length}
                </div>
                <h2 className="serif-header" style={{ fontSize: '28px', fontWeight: 800, color: '#143338' }}>
                  {activeCard.name.toUpperCase()}
                </h2>
              </div>

              <InkCardArt cardId={activeCard.id} category={activeCard.category} size={135} />

              <p style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.45, letterSpacing: '0.02em', color: '#1d2a32', textTransform: 'uppercase' }}>
                COST: <span style={{ color: '#b58426' }}>{activeCard.cost === 0 ? 'FREE' : `${activeCard.cost} GOLD`}.</span>{' '}
                {activeCard.desc.toUpperCase()}
              </p>
            </div>

            <button
              className="circle-nav-btn"
              style={{ width: '42px', height: '42px', fontSize: '18px' }}
              onClick={() => setShowcaseCardIdx((showcaseCardIdx + 1) % catalog.length)}
            >
              ›
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ============================================================================
  // SCREEN 4: THE CIRCULAR TABLETOP (IN-GAME DAY / NIGHT / GAME OVER)
  // ============================================================================
  const { me, players, day, phase, commonwealthGold, maxTreasuryTake, currentTurnPlayerId, turnOrder } = gameState;
  const isNight = phase === 'NIGHT';
  const isMyTurn = phase === 'DAY' && currentTurnPlayerId === me.id && me.alive;
  const remainingGoldTake = Math.max(0, maxTreasuryTake - (me.tookGoldThisTurn || 0));

  // Build ordered ring of players so YOU (me) are always anchored at 6 o'clock (90 degrees bottom)
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
      backgroundColor: isNight ? '#15111d' : '#f4efe6',
      color: isNight ? '#f4efe6' : '#1d2a32',
      transition: 'background-color 0.8s ease, color 0.8s ease',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Bar */}
      <header style={{
        padding: '12px 22px',
        borderBottom: `2px solid ${isNight ? '#352b47' : '#1d2a32'}`,
        background: isNight ? 'rgba(21, 17, 29, 0.92)' : 'rgba(239, 232, 216, 0.92)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 35
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span className="gothic-title" style={{ fontSize: '30px', color: isNight ? '#cfa346' : '#141c22' }}>
            Blood & Silver
          </span>
          <span style={{
            padding: '4px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '12px',
            background: isNight ? '#4c1d95' : '#cfa346', color: isNight ? '#f3e8ff' : '#141c22'
          }}>
            ROOM {gameState.roomCode} • {phase} {day}
          </span>
          {timeLeftSec !== null && (
            <span style={{
              padding: '4px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '13px',
              background: timeLeftSec <= 5 ? '#991b1b' : '#1c3b40', color: '#fff'
            }}>
              ⏳ {timeLeftSec}s
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Your Secret Role Badge */}
          <div style={{
            padding: '6px 14px', borderRadius: '7px',
            background: me.role === 'Vampire' ? '#7f1d1d' : '#1c3b40',
            color: '#f4efe6', fontWeight: 800, fontSize: '13px', border: '2px solid #1d2a32'
          }}>
            ROLE: {me.role === 'Vampire' ? '🧛 VAMPIRE' : me.role === 'Hunter' ? '🕵️ HUNTER' : '📺 TV DISPLAY'}
          </div>

          <button
            className="ink-btn"
            style={{ width: 'auto', padding: '7px 14px', fontSize: '12px' }}
            onClick={() => setDrawerOpen(!drawerOpen)}
          >
            📜 {drawerOpen ? 'HIDE CHRONICLE' : 'CHRONICLE & DECK'}
          </button>
        </div>
      </header>

      {errorBanner && (
        <div style={{
          position: 'fixed', top: '68px', left: '50%', transform: 'translateX(-50%)',
          padding: '10px 20px', borderRadius: '8px', background: '#991b1b', color: '#fff',
          fontWeight: 800, zIndex: 90, boxShadow: '0 8px 20px rgba(0,0,0,0.35)'
        }}>
          ⚠️ {errorBanner}
        </div>
      )}

      {/* Target Selection Prompt Banner */}
      {selectedCard && (
        <div style={{
          margin: '10px auto 0', padding: '10px 22px', borderRadius: '99px',
          background: '#cfa346', color: '#141c22', border: '2.5px solid #1d2a32',
          fontWeight: 800, display: 'flex', alignItems: 'center', gap: '14px', zIndex: 35
        }}>
          <span>🎯 CASTING [{selectedCard.name.toUpperCase()}]: CLICK ANY LIVING PLAYER AROUND THE CIRCLE!</span>
          <button
            onClick={() => setSelectedCard(null)}
            style={{ padding: '3px 10px', borderRadius: '99px', background: '#1d2a32', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}
          >
            CANCEL
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* THE CIRCULAR TABLETOP ARENA                                          */}
      {/* ==================================================================== */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1060px',
        height: '470px',
        margin: '8px auto'
      }}>
        {/* Rotating Orbit Ring */}
        <div
          className="table-orbit-ring"
          style={{
            width: '68%',
            height: '68%',
            borderColor: isNight ? 'rgba(207, 163, 70, 0.25)' : 'rgba(29, 42, 50, 0.22)'
          }}
        />

        {/* CENTERPIECE: THE COMMONWEALTH VAULT / NIGHT ALTAR / GAME OVER BANNER */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '320px',
          padding: '18px 20px',
          borderRadius: '18px',
          background: isNight ? '#231c30' : '#efe8d8',
          border: `3px solid ${isNight ? '#cfa346' : '#1d2a32'}`,
          boxShadow: '0 14px 34px rgba(0,0,0,0.22)',
          textAlign: 'center',
          zIndex: 20
        }}>
          {phase === 'GAME_OVER' ? (
            <div>
              <div className="serif-header" style={{ fontSize: '13px', fontWeight: 800, color: '#b9382c' }}>
                🏆 TOTAL ANNIHILATION COMPLETE
              </div>
              <div className="serif-header" style={{ fontSize: '20px', fontWeight: 900, margin: '8px 0' }}>
                {gameState.winner}
              </div>
              <button
                className="ink-btn ink-btn-gold"
                style={{ padding: '10px', fontSize: '13px', marginTop: '6px' }}
                onClick={() => socket.emit('startGame')}
              >
                ⚔️ PLAY ANOTHER ROUND
              </button>
            </div>
          ) : phase === 'DAY' ? (
            <div>
              <div className="serif-header" style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', color: '#7c6f5a' }}>
                COMMONWEALTH TREASURY • DAY {day}
              </div>
              <div className="serif-header" style={{ fontSize: '30px', fontWeight: 900, color: '#b58426', margin: '4px 0' }}>
                🪙 {commonwealthGold} GOLD
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '12px' }}>
                {day <= 2 ? 'Rationing Law: Max 2G / Turn' : '🔥 Day 3+ Awakening: Max 4G / Turn'}
              </div>

              {isMyTurn ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="ink-btn"
                      style={{ padding: '8px', fontSize: '12px' }}
                      disabled={remainingGoldTake < 1 || commonwealthGold < 1}
                      onClick={() => socket.emit('takeGold', { amount: 1 })}
                    >
                      +1 GOLD
                    </button>
                    <button
                      className="ink-btn ink-btn-gold"
                      style={{ padding: '8px', fontSize: '12px' }}
                      disabled={remainingGoldTake < 1 || commonwealthGold < 1}
                      onClick={() => socket.emit('takeGold', { amount: remainingGoldTake })}
                    >
                      TAKE MAX ({Math.min(remainingGoldTake, commonwealthGold)}G)
                    </button>
                  </div>
                  <button
                    className="ink-btn ink-btn-dark"
                    style={{ padding: '9px', fontSize: '13px' }}
                    onClick={() => socket.emit('endTurn')}
                  >
                    END MY TURN ➔
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#4a555b' }}>
                  Waiting for <strong style={{ color: '#b9382c' }}>{players.find(p => p.id === currentTurnPlayerId)?.name}</strong> to act...
                </div>
              )}
            </div>
          ) : (
            /* NIGHT CONSENSUS ALTAR IN THE CENTER OF THE CIRCLE */
            <div>
              <div className="serif-header" style={{ fontSize: '14px', fontWeight: 800, color: '#cfa346', marginBottom: '6px' }}>
                🌙 NIGHT {day} ALTAR
              </div>
              {!me.alive ? (
                <div style={{ fontSize: '13px' }}>The living citizens are plotting in the dark...</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '8px' }}>
                    <button
                      onClick={() => setNightChoice('SHIELD')}
                      style={{
                        padding: '6px 4px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                        background: nightChoice === 'SHIELD' ? '#cfa346' : '#15111d',
                        color: nightChoice === 'SHIELD' ? '#141c22' : '#f4efe6', border: '1.5px solid #cfa346'
                      }}
                    >
                      🛡️ +2 Shield
                    </button>
                    <button
                      onClick={() => setNightChoice('DRAW')}
                      style={{
                        padding: '6px 4px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                        background: nightChoice === 'DRAW' ? '#cfa346' : '#15111d',
                        color: nightChoice === 'DRAW' ? '#141c22' : '#f4efe6', border: '1.5px solid #cfa346'
                      }}
                    >
                      🃏 +1 Card
                    </button>
                    {me.role === 'Hunter' ? (
                      <button
                        onClick={() => setNightChoice('GOLD')}
                        style={{
                          padding: '6px 4px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                          background: nightChoice === 'GOLD' ? '#cfa346' : '#15111d',
                          color: nightChoice === 'GOLD' ? '#141c22' : '#f4efe6', border: '1.5px solid #cfa346'
                        }}
                      >
                        🪙 +1 Gold
                      </button>
                    ) : (
                      <button
                        onClick={() => setNightChoice('USURP')}
                        style={{
                          padding: '6px 4px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                          background: nightChoice === 'USURP' ? '#b9382c' : '#15111d',
                          color: '#fff', border: '1.5px solid #ef4444'
                        }}
                      >
                        👑 Usurp #1
                      </button>
                    )}
                  </div>

                  {me.role === 'Vampire' && (
                    <div style={{ fontSize: '11px', color: '#fca5a5', marginBottom: '8px', fontWeight: 700 }}>
                      🩸 Click + / - on seats around the circle to split Strikes ({totalAllocatedStrikes}/{nightPool} DMG)
                    </div>
                  )}

                  <button
                    className="ink-btn ink-btn-gold"
                    style={{ padding: '8px', fontSize: '12px' }}
                    disabled={me.nightSubmitted}
                    onClick={() => socket.emit('submitNightAction', { choice: nightChoice, strikes: nightStrikes })}
                  >
                    {me.nightSubmitted ? '✓ LOCKED IN (WAITING...)' : '🔒 LOCK IN NIGHT ACTION'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* SEATS POSITIONED IN A CIRCLE AROUND THE VAULT */}
        {rotatedRingIds.map((pid, idx) => {
          const p = players.find(pl => pl.id === pid);
          if (!p) return null;

          const total = rotatedRingIds.length;
          // Angle 90 deg = bottom center (6 o'clock for YOU). Clockwise around the oval.
          const angleDeg = 90 + (idx * 360) / total;
          const angleRad = (angleDeg * Math.PI) / 180;
          const radiusX = 41; // % of container width
          const radiusY = 39; // % of container height
          const leftPct = 50 + radiusX * Math.cos(angleRad);
          const topPct = 50 + radiusY * Math.sin(angleRad);

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
                width: '188px',
                padding: '10px 12px',
                borderRadius: '12px',
                background: !p.alive
                  ? (isNight ? '#1b1624' : '#dad2c2')
                  : isActiveSeat
                  ? '#fdf8ec'
                  : (isNight ? '#261f33' : '#efe8d8'),
                color: isActiveSeat ? '#141c22' : (isNight ? '#f4efe6' : '#1d2a32'),
                border: canTarget
                  ? '3px dashed #b9382c'
                  : isActiveSeat
                  ? '3px solid #cfa346'
                  : `2.5px solid ${isNight ? '#4b3f63' : '#1d2a32'}`,
                boxShadow: isActiveSeat
                  ? '0 0 22px rgba(207, 163, 70, 0.7)'
                  : '0 6px 14px rgba(0,0,0,0.16)',
                opacity: p.alive ? 1 : 0.55,
                cursor: canTarget ? 'pointer' : 'default',
                zIndex: isActiveSeat ? 25 : 15
              }}
            >
              {/* Floating Combat Animation Badge */}
              {effect && (
                <div className="floating-combat-badge" style={{ background: effect.bg, color: '#fff' }}>
                  {effect.text}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div className="serif-header" style={{ fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{p.name}</span>
                  {p.id === me.id && <span style={{ color: '#b58426', fontSize: '10px' }}>(YOU)</span>}
                  {p.isNextFirst && <span title="Claims Turn #1 Tomorrow">👑</span>}
                </div>
                <span style={{
                  fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '99px',
                  background: isActiveSeat ? '#cfa346' : '#1d2a32', color: isActiveSeat ? '#141c22' : '#f4efe6'
                }}>
                  {p.turnPosition ? `#${p.turnPosition}` : 'DEAD'}
                </span>
              </div>

              {/* Role / Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
                <span style={{ color: p.role === 'Vampire' ? '#ef4444' : p.role === 'Hunter' ? '#0284c7' : '#7c6f5a' }}>
                  {p.role === 'Hidden' ? 'Role: ???' : `Role: ${p.role}`}
                </span>
                {isNight && p.alive && (
                  <span style={{ color: p.nightSubmitted ? '#22c55e' : '#eab308' }}>
                    {p.nightSubmitted ? '✓ Ready' : 'Thinking...'}
                  </span>
                )}
              </div>

              {/* HP Bar */}
              <div style={{ height: '6px', background: '#c5bba4', borderRadius: '99px', overflow: 'hidden', marginBottom: '7px' }}>
                <div style={{
                  width: `${(p.hp / 10) * 100}%`,
                  height: '100%',
                  background: p.hp > 5 ? '#15803d' : p.hp > 2 ? '#d97706' : '#b9382c',
                  transition: 'width 0.35s ease'
                }} />
              </div>

              {/* Stat Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800 }}>
                <span>❤️ {p.hp}/10</span>
                <span>🛡️ {p.shield}</span>
                <span>🪙 {p.gold}G</span>
                <span>🃏 {p.cardCount}</span>
              </div>

              {/* Vampire Night Split-Strike Controls Directly on Seats in the Circle */}
              {isNight && me.role === 'Vampire' && me.alive && p.alive && !me.nightSubmitted && (
                <div style={{
                  marginTop: '7px', paddingTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.2)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '11px', color: '#fca5a5', fontWeight: 700 }}>🩸 Strike:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); adjustStrike(p.id, -1); }}
                      style={{ width: '22px', height: '22px', borderRadius: '4px', background: '#1d2a32', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800 }}
                    >-</button>
                    <span style={{ fontSize: '12px', fontWeight: 900, color: vampStrikePts > 0 ? '#ef4444' : '#94a3b8' }}>
                      {vampStrikePts}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); adjustStrike(p.id, 1); }}
                      style={{ width: '22px', height: '22px', borderRadius: '4px', background: '#b9382c', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800 }}
                    >+</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* BOTTOM FANNED TAROT HAND (ANCHORED AT 6 O'CLOCK)                     */}
      {/* ==================================================================== */}
      <footer style={{
        padding: '8px 20px 18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 25
      }}>
        <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '8px', letterSpacing: '0.06em' }}>
          🃏 YOUR SECRET HAND ({me.hand.length}/4 MAX AT END OF TURN) • PERSONAL GOLD: 🪙 {me.gold}G
        </div>

        {me.hand.length === 0 ? (
          <div className="ink-box" style={{ padding: '12px 24px', color: '#1d2a32', fontSize: '13px', fontWeight: 700 }}>
            Your hand is empty. You will automatically draw +1 Card at Dawn!
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
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
                    borderColor: selectedCard?.uid === card.uid ? '#b9382c' : '#1d2a32'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="serif-header" style={{ fontWeight: 800, fontSize: '12px' }}>
                        {card.name}
                      </span>
                      <span style={{
                        padding: '2px 6px', borderRadius: '4px', background: '#cfa346',
                        color: '#141c22', fontWeight: 900, fontSize: '11px'
                      }}>
                        {card.cost}G
                      </span>
                    </div>

                    <InkCardArt cardId={card.id} category={card.category} size={66} />

                    <p style={{ fontSize: '11px', lineHeight: 1.3, fontWeight: 600 }}>
                      {card.desc}
                    </p>
                  </div>

                  <div>
                    {lockedByDay && (
                      <div style={{ fontSize: '10px', color: '#b9382c', fontWeight: 800, textAlign: 'center', marginBottom: '4px' }}>
                        🔒 SEALED UNTIL DAY {card.minDay}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                      <button
                        className="ink-btn ink-btn-gold"
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
                        {card.needsTarget ? 'TARGET' : 'CAST'}
                      </button>
                      <button
                        className="ink-btn"
                        style={{ width: 'auto', padding: '6px 8px', fontSize: '10px' }}
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

      {/* ==================================================================== */}
      {/* COLLAPSIBLE RIGHT-SIDE CHRONICLE, INTEL & DECK DRAWER                */}
      {/* ==================================================================== */}
      {drawerOpen && (
        <aside className="ink-box" style={{
          position: 'fixed',
          top: '64px',
          right: '16px',
          bottom: '16px',
          width: '340px',
          padding: '16px',
          color: '#1d2a32',
          zIndex: 60,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { id: 'CHRONICLE', label: '📜 LOG' },
              { id: 'INTEL', label: '🕵️ INTEL' },
              { id: 'DECK', label: `🃏 DECK (${gameState.deckCount})` }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setDrawerTab(t.id)}
                style={{
                  flex: 1, padding: '7px', borderRadius: '6px', fontWeight: 800, fontSize: '11px',
                  fontFamily: 'Cinzel, serif', cursor: 'pointer', border: '1.5px solid #1d2a32',
                  background: drawerTab === t.id ? '#cfa346' : '#dfd5be'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
            {drawerTab === 'CHRONICLE' && gameState.logs.map((entry, i) => (
              <div key={i} style={{ padding: '7px 10px', borderRadius: '6px', background: '#dfd5be', borderBottom: '1px solid #b8ad96' }}>
                {entry}
              </div>
            ))}

            {drawerTab === 'INTEL' && me.intel.map((line, i) => (
              <div key={i} style={{ padding: '7px 10px', borderRadius: '6px', background: '#dfd5be', fontWeight: 700 }}>
                {line}
              </div>
            ))}

            {drawerTab === 'DECK' && gameState.deckSummary?.map(item => (
              <div key={item.id} style={{
                padding: '7px 10px', borderRadius: '6px', background: '#dfd5be',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <strong>{item.name}</strong> ({item.cost}G)
                </div>
                <span style={{ fontWeight: 800 }}>
                  {item.remaining}/{item.total}
                </span>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}