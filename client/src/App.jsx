import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const socket = io(BACKEND_URL, { autoConnect: true });

// Custom SVG Artwork for Every Card
function CardIllustration({ cardId, category }) {
  const strokeColor =
    category === 'Attack' ? '#f87171' :
    category === 'Defense' ? '#38bdf8' :
    category === 'Order' ? '#fbbf24' :
    category === 'Heal' ? '#4ade80' :
    category === 'Twist' ? '#c084fc' : '#f472b6';

  return (
    <div style={{
      height: '68px',
      borderRadius: '8px',
      background: 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.5) 100%)',
      border: `1px solid ${strokeColor}33`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '8px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <svg width="46" height="46" viewBox="0 0 64 64" fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {cardId === 'iron_dagger' && (
          <>
            <path d="M14 50L26 38M48 16L24 40L20 36L44 12L52 12L48 16Z" fill={`${strokeColor}22`} />
            <path d="M18 32L32 46" />
          </>
        )}
        {cardId === 'silver_caltrops' && (
          <>
            <polygon points="32,10 38,28 54,32 38,38 32,54 26,38 10,32 26,28" fill={`${strokeColor}22`} />
            <circle cx="32" cy="32" r="5" />
          </>
        )}
        {(cardId === 'wooden_shield' || cardId === 'sacred_ward') && (
          <>
            <path d="M32 10L50 18V32C50 44 32 54 32 54C32 54 14 44 14 32V18L32 10Z" fill={`${strokeColor}22`} />
            <path d="M32 18V46M22 28H42" />
          </>
        )}
        {cardId === 'healing_salve' && (
          <>
            <rect x="20" y="22" width="24" height="30" rx="4" fill={`${strokeColor}22`} />
            <path d="M26 14H38V22H26V14ZM32 31V43M26 37H38" />
          </>
        )}
        {cardId === 'royal_decree' && (
          <>
            <polygon points="12,46 18,22 27,32 32,16 37,32 46,22 52,46" fill={`${strokeColor}22`} />
            <line x1="12" y1="50" x2="52" y2="50" />
          </>
        )}
        {cardId === 'shadow_swap' && (
          <>
            <path d="M16 24H48L40 16M48 40H16L24 48" />
            <circle cx="32" cy="32" r="6" fill={`${strokeColor}22`} />
          </>
        )}
        {cardId === 'time_twist' && (
          <>
            <polygon points="20,14 44,14 32,32 44,50 20,50 32,32" fill={`${strokeColor}22`} />
            <line x1="16" y1="14" x2="48" y2="14" />
            <line x1="16" y1="50" x2="48" y2="50" />
          </>
        )}
        {(cardId === 'bloodhound' || cardId === 'inquisitor_lens') && (
          <>
            <circle cx="28" cy="28" r="14" fill={`${strokeColor}22`} />
            <line x1="38" y1="38" x2="52" y2="52" strokeWidth="4" />
            <circle cx="28" cy="28" r="5" />
          </>
        )}
        {cardId === 'cutpurse' && (
          <>
            <path d="M22 24C22 24 16 32 16 42C16 50 24 54 32 54C40 54 48 50 48 42C48 32 42 24 42 24" fill={`${strokeColor}22`} />
            <path d="M24 24L28 14H36L40 24Z" />
          </>
        )}
        {cardId === 'holy_water' && (
          <>
            <path d="M32 12C32 12 48 30 48 42C48 51 41 56 32 56C23 56 16 51 16 42C16 30 32 12 32 12Z" fill={`${strokeColor}22`} />
            <path d="M32 28V44M24 36H40" />
          </>
        )}
        {cardId === 'executioner_pistol' && (
          <>
            <path d="M12 24H48V32H28L24 48H14L18 32H12V24Z" fill={`${strokeColor}22`} />
            <circle cx="52" cy="28" r="3" />
          </>
        )}
        {(cardId === 'vampiric_curse' || cardId === 'purifying_elixir') && (
          <>
            <path d="M32 14L40 28L54 32L40 36L32 50L24 36L10 32L24 28L32 14Z" fill={`${strokeColor}22`} />
          </>
        )}
      </svg>
    </div>
  );
}

export default function App() {
  const [gameState, setGameState] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [rightTab, setRightTab] = useState('CHRONICLE'); // CHRONICLE | EFFECTS | DECK
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');

  // Night Action states
  const [nightChoice, setNightChoice] = useState('SHIELD');
  const [nightStrikes, setNightStrikes] = useState({}); // { playerId: dmgCount }

  useEffect(() => {
    socket.on('gameState', (data) => {
      setGameState(data);
      setSelectedCard(null);
    });
    socket.on('errorMsg', (msg) => {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(''), 4000);
    });
    return () => {
      socket.off('gameState');
      socket.off('errorMsg');
    };
  }, []);

  // Reset night allocations when entering Night phase
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

  // Top Header Bar (Always Visible)
  const renderTopNav = () => (
    <header style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 24px', background: 'rgba(11, 15, 25, 0.9)',
      borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)',
      position: 'sticky', top: 0, zIndex: 50
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'linear-gradient(90deg, #1e3a8a 0%, #7f1d1d 100%)',
          padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)'
        }}>
          <span style={{ fontSize: '20px' }}>🕵️‍♂️</span>
          <span style={{ fontSize: '20px' }}>🧛</span>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '1px', color: '#f8fafc' }}>
              BLOOD & SILVER
            </span>
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px',
              background: 'rgba(153, 27, 27, 0.5)', border: '1px solid #ef4444', color: '#fca5a5'
            }}>
              HUNTERS VS. VAMPIRES
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            1G Start • Day 1–2 Defense & Turn Manipulation • Day 3 Awakening
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {gameState?.roomCode && (
          <div style={{
            padding: '6px 14px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid #f59e0b', color: '#fbbf24', fontWeight: 700, fontSize: '14px'
          }}>
            ROOM CODE: {gameState.roomCode}
          </div>
        )}
        <button
          onClick={() => setShowRulesModal(true)}
          style={{
            padding: '8px 14px', borderRadius: '8px', background: '#1e293b',
            border: '1px solid #334155', color: '#e2e8f0', cursor: 'pointer', fontWeight: 600
          }}
        >
          ❓ Rules & Illustrated Deck
        </button>
      </div>
    </header>
  );

  // Rules & Card Gallery Modal
  const renderRulesModal = () => {
    if (!showRulesModal) return null;
    const catalog = gameState?.catalog || [];
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
      }}>
        <div style={{
          maxWidth: '900px', width: '100%', maxHeight: '88vh', overflowY: 'auto',
          background: '#0f172a', border: '1px solid #334155', borderRadius: '16px', padding: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '22px', color: '#fbbf24' }}>📜 Official Rules & Tactical Deck</h2>
            <button
              onClick={() => setShowRulesModal(false)}
              style={{ padding: '6px 12px', borderRadius: '8px', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}
            >
              Close ✕
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', fontSize: '13px', color: '#cbd5e1' }}>
            <div style={{ padding: '12px', background: '#1e293b', borderRadius: '10px', borderLeft: '4px solid #38bdf8' }}>
              <strong style={{ color: '#38bdf8' }}>🛡️ Days 1 & 2 (Defensive Cold War):</strong> Everyone starts with <strong>10 HP, 1G, and 2 cards</strong>. Treasury limit is <strong>2G/turn</strong>. Ending the Night with unbroken Shield grants <strong>+1 Bonus Gold</strong> at Dawn!
            </div>
            <div style={{ padding: '12px', background: '#1e293b', borderRadius: '10px', borderLeft: '4px solid #fbbf24' }}>
              <strong style={{ color: '#fbbf24' }}>🔀 Turn Order = Power:</strong> Use <em>Royal Decree</em>, <em>Shadow Swap</em>, and <em>Time Twist</em> to steal early turns and drain the Commonwealth Treasury before rivals can act!
            </div>
            <div style={{ padding: '12px', background: '#1e293b', borderRadius: '10px', borderLeft: '4px solid #f87171' }}>
              <strong style={{ color: '#f87171' }}>🔥 Day 3 Awakening:</strong> On Day 3, Treasury cap increases to <strong>4G/turn</strong>, and sealed cards (<em>Inquisitor's Lens, Executioner's Pistol, Vampiric Curse, Purifying Elixir</em>) unlock!
            </div>
            <div style={{ padding: '12px', background: '#1e293b', borderRadius: '10px', borderLeft: '4px solid #c084fc' }}>
              <strong style={{ color: '#c084fc' }}>🌙 Split Night Strikes:</strong> At Night, Vampires can split their Night Damage pool across multiple victims (e.g. 1 DMG on Player A, 2 DMG on Player B) or Usurp Turn #1!
            </div>
          </div>

          {catalog.length > 0 && (
            <>
              <h3 style={{ marginBottom: '12px', fontSize: '16px', color: '#f8fafc' }}>🃏 Complete 15-Type Illustrated Card Catalog</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))', gap: '12px' }}>
                {catalog.map(c => (
                  <div key={c.id} style={{
                    padding: '12px', borderRadius: '10px', background: '#111827',
                    border: '1px solid #1f2937'
                  }}>
                    <CardIllustration cardId={c.id} category={c.category} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
                      <span>{c.name}</span>
                      <span style={{ color: '#fbbf24' }}>{c.cost}G</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>{c.desc}</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>Copies in Deck: {c.copies} {c.minDay > 1 ? `• 🔒 Day ${c.minDay}+` : ''}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // SCREEN 1: Landing / Join Screen (Canvas Styled)
  if (!gameState) {
    return (
      <div>
        {renderTopNav()}
        {renderRulesModal()}
        <main style={{ maxWidth: '880px', margin: '32px auto', padding: '0 20px' }}>
          {/* Hero Banner */}
          <div style={{
            padding: '28px', borderRadius: '18px',
            background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(10,14,24,0.95) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.28)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)', marginBottom: '24px'
          }}>
            {/* Order of Dawn vs Crimson Coven Banner */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '18px 24px', borderRadius: '14px',
              background: 'linear-gradient(90deg, rgba(30,58,138,0.45) 0%, rgba(15,23,42,0.8) 50%, rgba(153,27,27,0.45) 100%)',
              border: '1px solid rgba(255,255,255,0.1)', marginBottom: '22px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '34px' }}>🕵️‍♂️</span>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', letterSpacing: '1px' }}>ORDER OF DAWN</div>
                  <div style={{ fontSize: '18px', fontWeight: 800 }}>The Hunters</div>
                </div>
              </div>

              <div style={{
                padding: '6px 12px', borderRadius: '99px', background: 'rgba(245,158,11,0.2)',
                border: '1px solid #f59e0b', color: '#fbbf24', fontWeight: 800, fontSize: '12px'
              }}>
                VS
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'right' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', letterSpacing: '1px' }}>CRIMSON COVEN</div>
                  <div style={{ fontSize: '18px', fontWeight: 800 }}>The Vampires</div>
                </div>
                <span style={{ fontSize: '34px' }}>🧛</span>
              </div>
            </div>

            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fde68a', marginBottom: '8px' }}>
              Shared Commonwealth, Turn-Order Manipulation & Day 3 Awakening
            </h1>
            <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '18px' }}>
              Everyone begins with <strong style={{ color: '#fbbf24' }}>10 HP, 1 personal Gold, and 2 random cards</strong> (+1 card every Dawn).
            </p>

            {/* 3 Feature Callout Boxes */}
            <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(153, 27, 27, 0.16)', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '13px' }}>
                <strong style={{ color: '#f87171' }}>🛡️ Days 1–2 Defensive Pacing & Day 3 Role Reveals:</strong> Use abundant 2-DMG daggers, shields, and hand-peeking early on. Exact Role-Reveal cards (<em>Inquisitor's Lens</em>) and heavy finishers (<em>Executioner's Pistol</em>, <em>Vampiric Curse</em>) awaken on <strong>Day 3</strong>!
              </div>
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(180, 83, 9, 0.16)', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '13px' }}>
                <strong style={{ color: '#fbbf24' }}>👑 Turn-Order Manipulation & Split Night Strikes:</strong> Seize Turn #1 with <em>Royal Decree</em>, trade seats mid-round with <em>Shadow Swap</em>, or reverse rotation with <em>Time Twist</em>! At Night, Vampires can split their damage across multiple targets.
              </div>
            </div>

            {errorBanner && (
              <div style={{ padding: '10px', borderRadius: '8px', background: '#7f1d1d', color: '#fecaca', marginBottom: '14px', textAlign: 'center', fontWeight: 600 }}>
                ⚠️ {errorBanner}
              </div>
            )}

            {/* Create or Join Form */}
            <div style={{
              padding: '20px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: '#cbd5e1' }}>
                Your Hunter / Vampire Name
              </label>
              <input
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Enter your name (e.g. Ethan)..."
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px',
                  background: '#090d16', border: '1px solid #334155', color: '#fff',
                  fontSize: '15px', marginBottom: '14px'
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <button
                  onClick={() => socket.emit('createRoom', { playerName: playerName || 'Ethan' })}
                  style={{
                    padding: '13px', borderRadius: '10px',
                    background: 'linear-gradient(90deg, #e11d48 0%, #be123c 100%)',
                    color: '#fff', fontWeight: 800, fontSize: '15px', border: 'none', cursor: 'pointer'
                  }}
                >
                  🏰 Create New Room
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="4-LETTER CODE"
                    maxLength={4}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '10px',
                      background: '#090d16', border: '1px solid #334155', color: '#fbbf24',
                      fontWeight: 800, textAlign: 'center', letterSpacing: '2px'
                    }}
                  />
                  <button
                    onClick={() => socket.emit('joinRoom', { roomCode: joinCode, playerName: playerName || 'Guest' })}
                    style={{
                      padding: '0 22px', borderRadius: '10px', background: '#f59e0b',
                      color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer'
                    }}
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // SCREEN 2: Lobby Setup
  if (gameState.phase === 'LOBBY') {
    return (
      <div>
        {renderTopNav()}
        {renderRulesModal()}
        <main style={{ maxWidth: '820px', margin: '32px auto', padding: '0 20px' }}>
          <div style={{
            padding: '26px', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(245, 158, 11, 0.35)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontSize: '22px', color: '#fde68a' }}>👥 Table Setup ({gameState.players.length}/8 Players)</h2>
                <p style={{ fontSize: '13px', color: '#94a3b8' }}>
                  Share Room Code <strong style={{ color: '#fbbf24' }}>{gameState.roomCode}</strong> with friends or add AI Bots to test!
                </p>
              </div>
              <button
                onClick={() => socket.emit('addBot')}
                style={{
                  padding: '9px 14px', borderRadius: '8px', background: '#1e293b',
                  border: '1px solid #38bdf8', color: '#38bdf8', fontWeight: 700, cursor: 'pointer'
                }}
              >
                + Add AI Bot
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '22px' }}>
              {gameState.players.map((p, i) => (
                <div key={p.id} style={{
                  padding: '12px 16px', borderRadius: '10px', background: '#0b0f19',
                  border: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      width: '26px', height: '26px', borderRadius: '50%', background: '#1e293b',
                      color: '#fbbf24', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px'
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ fontWeight: 700 }}>{p.name} {p.id === gameState.me.id ? '(You)' : ''}</span>
                  </div>
                  <span style={{
                    fontSize: '11px', padding: '3px 8px', borderRadius: '99px',
                    background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)'
                  }}>
                    Ready • Starts w/ 1G
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => socket.emit('startGame', {})}
              disabled={gameState.players.length < 2}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                background: gameState.players.length >= 2 ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)' : '#334155',
                color: '#000', fontWeight: 900, fontSize: '16px', border: 'none',
                cursor: gameState.players.length >= 2 ? 'pointer' : 'not-allowed'
              }}
            >
              ⚔️ Deal Secret Roles & Begin Day 1 ({gameState.players.length * 2 + 3}G Commonwealth)
            </button>
          </div>
        </main>
      </div>
    );
  }

  // SCREEN 3: Active Game Board (Day / Night / Game Over)
  const { me, players, day, phase, commonwealthGold, maxTreasuryTake, currentTurnPlayerId, turnOrder } = gameState;
  const isMyTurn = phase === 'DAY' && currentTurnPlayerId === me.id && me.alive;
  const remainingGoldTake = Math.max(0, maxTreasuryTake - (me.tookGoldThisTurn || 0));

  const orderedPlayers = turnOrder
    .map(id => players.find(p => p.id === id))
    .filter(Boolean);

  return (
    <div>
      {renderTopNav()}
      {renderRulesModal()}

      <main style={{ maxWidth: '1280px', margin: '18px auto', padding: '0 18px' }}>
        {errorBanner && (
          <div style={{ padding: '10px', borderRadius: '8px', background: '#7f1d1d', color: '#fecaca', marginBottom: '12px', textAlign: 'center', fontWeight: 700 }}>
            ⚠️ {errorBanner}
          </div>
        )}

        {/* Top Status Dashboard & Turn Order Ribbon */}
        <div style={{
          padding: '16px 20px', borderRadius: '14px',
          background: 'linear-gradient(90deg, rgba(15,23,42,0.95) 0%, rgba(23,37,84,0.6) 50%, rgba(15,23,42,0.95) 100%)',
          border: '1px solid rgba(255,255,255,0.1)', marginBottom: '16px',
          display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              padding: '8px 14px', borderRadius: '10px',
              background: phase === 'NIGHT' ? '#311042' : '#1e293b',
              border: `1px solid ${phase === 'NIGHT' ? '#c084fc' : '#fbbf24'}`,
              fontWeight: 800, fontSize: '15px'
            }}>
              {phase === 'DAY' ? `☀️ DAY ${day}` : phase === 'NIGHT' ? `🌙 NIGHT ${day}` : `🏆 GAME OVER`}
              <span style={{ fontSize: '11px', display: 'block', color: day >= 3 ? '#f87171' : '#38bdf8', fontWeight: 600 }}>
                {day <= 2 ? 'Defensive Era (Max 2G/turn • Seal Active)' : '🔥 Day 3+ Awakening (All Cards Unlocked!)'}
              </span>
            </div>

            {/* Commonwealth Treasury Counter */}
            <div style={{
              padding: '8px 16px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.4)'
            }}>
              <div style={{ fontSize: '11px', color: '#fde68a', fontWeight: 700 }}>COMMONWEALTH TREASURY</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#fbbf24' }}>
                🪙 {commonwealthGold} Gold <span style={{ fontSize: '12px', color: '#94a3b8' }}>(Max {maxTreasuryTake}G/Turn)</span>
              </div>
            </div>
          </div>

          {/* Live Turn-Order Seat Ribbon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginRight: '4px' }}>TURN ORDER:</span>
            {orderedPlayers.map((p, idx) => {
              const active = phase === 'DAY' && currentTurnPlayerId === p.id;
              return (
                <div key={p.id} style={{
                  padding: '5px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 700,
                  background: active ? '#f59e0b' : '#0f172a',
                  color: active ? '#000' : '#cbd5e1',
                  border: `1px solid ${active ? '#fbbf24' : '#334155'}`
                }}>
                  #{idx + 1} {p.name} {p.isNextFirst ? '👑' : ''}
                </div>
              );
            })}
          </div>

          {/* Your Secret Role Pill */}
          <div style={{
            padding: '8px 16px', borderRadius: '10px',
            background: me.role === 'Vampire' ? 'rgba(153, 27, 27, 0.35)' : 'rgba(30, 58, 138, 0.35)',
            border: `1px solid ${me.role === 'Vampire' ? '#ef4444' : '#38bdf8'}`
          }}>
            <div style={{ fontSize: '10px', color: '#cbd5e1' }}>YOUR SECRET ROLE</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: me.role === 'Vampire' ? '#fca5a5' : '#7dd3fc' }}>
              {me.role === 'Vampire' ? '🧛 Vampire' : '🕵️‍♂️ Hunter'}
            </div>
          </div>
        </div>

        {/* Target Selection Prompt Banner when a Card is Clicked */}
        {selectedCard && (
          <div style={{
            padding: '12px 18px', borderRadius: '12px', marginBottom: '16px',
            background: 'linear-gradient(90deg, rgba(245,158,11,0.25) 0%, rgba(217,119,6,0.25) 100%)',
            border: '1px solid #fbbf24', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <strong style={{ color: '#fbbf24' }}>🎯 Casting [{selectedCard.name}]:</strong> Click any living player card below (including yourself!) to apply this effect.
            </div>
            <button
              onClick={() => setSelectedCard(null)}
              style={{ padding: '5px 12px', borderRadius: '6px', background: '#1e293b', color: '#fff', border: '1px solid #475569', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Player Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '12px', marginBottom: '18px'
        }}>
          {players.map(p => {
            const isTurn = phase === 'DAY' && currentTurnPlayerId === p.id;
            const canTarget = selectedCard && p.alive;
            return (
              <div
                key={p.id}
                onClick={() => {
                  if (canTarget) {
                    socket.emit('playCard', { cardUid: selectedCard.uid, targetId: p.id });
                    setSelectedCard(null);
                  }
                }}
                style={{
                  padding: '14px', borderRadius: '14px',
                  background: !p.alive ? 'rgba(15, 23, 42, 0.45)' : isTurn ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.85)',
                  border: canTarget ? '2px dashed #fbbf24' : isTurn ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.09)',
                  opacity: p.alive ? 1 : 0.55,
                  cursor: canTarget ? 'pointer' : 'default',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ fontWeight: 800, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {p.name} {p.id === me.id && <span style={{ color: '#38bdf8', fontSize: '12px' }}>(You)</span>}
                    {p.isNextFirst && <span title="Claims Turn #1 Tomorrow!">👑</span>}
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                    background: isTurn ? '#f59e0b' : '#1e293b', color: isTurn ? '#000' : '#94a3b8'
                  }}>
                    {p.turnPosition ? `Turn #${p.turnPosition}` : 'Fallen'}
                  </span>
                </div>

                {/* Role Badge */}
                <div style={{
                  fontSize: '12px', marginBottom: '10px', fontWeight: 700,
                  color: p.role === 'Vampire' ? '#f87171' : p.role === 'Hunter' ? '#38bdf8' : '#64748b'
                }}>
                  Role: {p.role}
                </div>

                {/* HP Bar */}
                <div style={{ height: '7px', background: '#1e293b', borderRadius: '99px', overflow: 'hidden', marginBottom: '10px' }}>
                  <div style={{
                    width: `${(p.hp / 10) * 100}%`, height: '100%',
                    background: p.hp > 5 ? '#10b981' : p.hp > 2 ? '#f59e0b' : '#ef4444'
                  }} />
                </div>

                {/* 4 Stat Pillars */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center', fontSize: '12px', background: '#090d16', padding: '8px 4px', borderRadius: '8px' }}>
                  <div>
                    <div>❤️</div>
                    <div style={{ fontWeight: 700 }}>{p.hp}/10</div>
                  </div>
                  <div>
                    <div>🛡️</div>
                    <div style={{ fontWeight: 700, color: p.shield > 0 ? '#38bdf8' : '#cbd5e1' }}>{p.shield}</div>
                  </div>
                  <div>
                    <div>🪙</div>
                    <div style={{ fontWeight: 700, color: '#fbbf24' }}>{p.gold}G</div>
                  </div>
                  <div>
                    <div>🃏</div>
                    <div style={{ fontWeight: 700 }}>{p.cardCount}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main 2-Column Interactive Zone: Left = Controls & Hand | Right = Tracker Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: '18px' }}>
          {/* LEFT COLUMN */}
          <div>
            {/* DAY TURN ACTION BAR */}
            {phase === 'DAY' && (
              <div style={{
                padding: '16px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.9)',
                border: isMyTurn ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
              }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: isMyTurn ? '#fbbf24' : '#94a3b8' }}>
                    {isMyTurn ? "⚡ IT IS YOUR TURN!" : `Waiting for active player to finish their turn...`}
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    You took {me.tookGoldThisTurn}/{maxTreasuryTake}G from the Commonwealth this turn.
                  </div>
                </div>

                {isMyTurn && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      disabled={remainingGoldTake < 1 || commonwealthGold < 1}
                      onClick={() => socket.emit('takeGold', { amount: 1 })}
                      style={{
                        padding: '9px 14px', borderRadius: '8px', background: '#1e293b',
                        border: '1px solid #fbbf24', color: '#fbbf24', fontWeight: 700, cursor: 'pointer',
                        opacity: (remainingGoldTake < 1 || commonwealthGold < 1) ? 0.4 : 1
                      }}
                    >
                      +1G Treasury
                    </button>
                    <button
                      disabled={remainingGoldTake < 1 || commonwealthGold < 1}
                      onClick={() => socket.emit('takeGold', { amount: remainingGoldTake })}
                      style={{
                        padding: '9px 14px', borderRadius: '8px', background: '#f59e0b',
                        border: 'none', color: '#000', fontWeight: 800, cursor: 'pointer',
                        opacity: (remainingGoldTake < 1 || commonwealthGold < 1) ? 0.4 : 1
                      }}
                    >
                      Take Max ({Math.min(remainingGoldTake, commonwealthGold)}G)
                    </button>
                    <button
                      onClick={() => socket.emit('endTurn')}
                      style={{
                        padding: '9px 18px', borderRadius: '8px', background: '#10b981',
                        border: 'none', color: '#000', fontWeight: 800, cursor: 'pointer'
                      }}
                    >
                      End Turn ➔
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* NIGHT CONSENSUS PANEL (WITH MULTI-TARGET VAMPIRE STRIKE ALLOCATOR) */}
            {phase === 'NIGHT' && me.alive && (
              <div style={{
                padding: '20px', borderRadius: '14px',
                background: 'linear-gradient(180deg, rgba(49, 16, 66, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
                border: '1px solid #c084fc', marginBottom: '16px'
              }}>
                <h3 style={{ color: '#e9d5ff', fontSize: '18px', marginBottom: '6px' }}>
                  🌙 Secret Night {day} Consensus
                </h3>
                <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '14px' }}>
                  {me.role === 'Hunter'
                    ? 'Choose your secret preparation for the night. Remember: ending Night 1 or 2 with unbroken Shield grants +1 Bonus Gold at Dawn!'
                    : `Choose your Vampire perk AND distribute ${nightPool} total DMG across any targets below!`}
                </p>

                {/* Step 1: Personal Night Perk */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                  <button
                    onClick={() => setNightChoice('SHIELD')}
                    style={{
                      padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700,
                      background: nightChoice === 'SHIELD' ? '#1e3a8a' : '#0f172a',
                      border: `2px solid ${nightChoice === 'SHIELD' ? '#38bdf8' : '#334155'}`, color: '#fff'
                    }}
                  >
                    🛡️ +2 Night Shield
                  </button>
                  <button
                    onClick={() => setNightChoice('DRAW')}
                    style={{
                      padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700,
                      background: nightChoice === 'DRAW' ? '#1e3a8a' : '#0f172a',
                      border: `2px solid ${nightChoice === 'DRAW' ? '#38bdf8' : '#334155'}`, color: '#fff'
                    }}
                  >
                    🃏 Draw +1 Card
                  </button>
                  {me.role === 'Hunter' ? (
                    <button
                      onClick={() => setNightChoice('GOLD')}
                      style={{
                        padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700,
                        background: nightChoice === 'GOLD' ? '#1e3a8a' : '#0f172a',
                        border: `2px solid ${nightChoice === 'GOLD' ? '#fbbf24' : '#334155'}`, color: '#fff'
                      }}
                    >
                      🪙 Stash +1 Gold
                    </button>
                  ) : (
                    <button
                      onClick={() => setNightChoice('USURP')}
                      style={{
                        padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700,
                        background: nightChoice === 'USURP' ? '#7f1d1d' : '#0f172a',
                        border: `2px solid ${nightChoice === 'USURP' ? '#fbbf24' : '#334155'}`, color: '#fbbf24'
                      }}
                    >
                      👑 Usurp Turn #1
                    </button>
                  )}
                </div>

                {/* Step 2: Vampire Split Damage Allocator */}
                {me.role === 'Vampire' && (
                  <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(127, 29, 29, 0.25)', border: '1px solid #ef4444', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px', fontWeight: 700 }}>
                      <span style={{ color: '#fca5a5' }}>🩸 Split Your Night Strikes (Multi-Target Allowed):</span>
                      <span style={{ color: '#fbbf24' }}>Allocated: {totalAllocatedStrikes} / {nightPool} DMG</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {players.filter(p => p.alive).map(p => {
                        const pts = nightStrikes[p.id] || 0;
                        return (
                          <div key={p.id} style={{
                            padding: '8px 12px', borderRadius: '8px', background: '#090d16',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}>
                            <span style={{ fontSize: '13px', fontWeight: 700 }}>{p.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                onClick={() => adjustStrike(p.id, -1)}
                                style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#1e293b', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800 }}
                              >-</button>
                              <span style={{ fontWeight: 800, color: pts > 0 ? '#ef4444' : '#64748b', minWidth: '42px', textAlign: 'center' }}>
                                {pts} DMG
                              </span>
                              <button
                                onClick={() => adjustStrike(p.id, 1)}
                                style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800 }}
                              >+</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  disabled={me.nightSubmitted}
                  onClick={() => socket.emit('submitNightAction', { choice: nightChoice, strikes: nightStrikes })}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '10px',
                    background: me.nightSubmitted ? '#334155' : '#c084fc',
                    color: '#000', fontWeight: 800, border: 'none', cursor: me.nightSubmitted ? 'default' : 'pointer'
                  }}
                >
                  {me.nightSubmitted ? '✓ Night Action Locked In (Waiting for town...)' : '🔒 Lock In Secret Night Action'}
                </button>
              </div>
            )}

            {/* YOUR SECRET HAND (WITH ILLUSTRATED CARDS) */}
            <div style={{
              padding: '18px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800 }}>
                  🃏 Your Secret Hand ({me.hand.length}/4 max at End of Turn)
                </h3>
                <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 700 }}>
                  Personal Gold: 🪙 {me.gold}G
                </span>
              </div>

              {me.hand.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                  Your hand is empty. You will draw +1 card automatically at Dawn!
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))', gap: '12px' }}>
                  {me.hand.map(card => {
                    const lockedByDay = day < (card.minDay || 1);
                    const canAfford = me.gold >= card.cost;
                    const canPlay = isMyTurn && canAfford && !lockedByDay;

                    return (
                      <div
                        key={card.uid}
                        className="tactical-card"
                        style={{
                          padding: '12px', borderRadius: '12px', background: '#0b0f19',
                          border: selectedCard?.uid === card.uid ? '2px solid #fbbf24' : lockedByDay ? '1px solid #7f1d1d' : '1px solid #1e293b',
                          display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <CardIllustration cardId={card.id} category={card.category} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 800, fontSize: '14px' }}>{card.name}</span>
                            <span style={{
                              padding: '2px 7px', borderRadius: '6px', background: 'rgba(245,158,11,0.18)',
                              color: '#fbbf24', fontWeight: 800, fontSize: '12px'
                            }}>
                              {card.cost}G
                            </span>
                          </div>
                          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px', lineHeight: '1.35' }}>
                            {card.desc}
                          </p>
                        </div>

                        <div>
                          {lockedByDay && (
                            <div style={{ fontSize: '11px', color: '#f87171', fontWeight: 700, marginBottom: '6px', textAlign: 'center' }}>
                              🔒 Sealed until Day {card.minDay}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              disabled={!canPlay}
                              onClick={() => {
                                if (!card.needsTarget) {
                                  socket.emit('playCard', { cardUid: card.uid, targetId: me.id });
                                } else {
                                  setSelectedCard(card);
                                }
                              }}
                              style={{
                                flex: 1, padding: '7px', borderRadius: '7px',
                                background: canPlay ? '#f59e0b' : '#1e293b',
                                color: canPlay ? '#000' : '#64748b',
                                fontWeight: 800, fontSize: '12px', border: 'none',
                                cursor: canPlay ? 'pointer' : 'not-allowed'
                              }}
                            >
                              {card.needsTarget ? 'Select Target' : 'Cast Now'}
                            </button>
                            <button
                              disabled={!isMyTurn || me.gold < 1}
                              onClick={() => socket.emit('cycleCard', { cardUid: card.uid })}
                              title="Spend 1G to discard and draw a new card"
                              style={{
                                padding: '7px 9px', borderRadius: '7px', background: '#1e293b',
                                color: '#cbd5e1', border: '1px solid #334155', fontSize: '11px',
                                cursor: (isMyTurn && me.gold >= 1) ? 'pointer' : 'not-allowed',
                                opacity: (isMyTurn && me.gold >= 1) ? 1 : 0.4
                              }}
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
            </div>
          </div>

          {/* RIGHT COLUMN: Private Intel + 3-Tab Chronicle / Active Effects / Deck Tracker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Private Intel Box */}
            <div style={{
              padding: '16px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8', marginBottom: '8px' }}>
                🕵️‍♂️ Your Private Intel
              </h3>
              <div style={{ maxHeight: '130px', overflowY: 'auto', fontSize: '12px', display: 'grid', gap: '6px' }}>
                {me.intel.map((line, i) => (
                  <div key={i} style={{ padding: '6px 10px', borderRadius: '6px', background: '#090d16', color: '#e2e8f0' }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>

            {/* 3-Tab Panel (Chronicle Log | Active Effects | Cards Left in Deck) */}
            <div style={{
              padding: '16px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(255,255,255,0.08)', flex: 1
            }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                {[
                  { id: 'CHRONICLE', label: '📜 Chronicle Log' },
                  { id: 'EFFECTS', label: '🛡️ Active Effects' },
                  { id: 'DECK', label: `🃏 Deck (${gameState.deckCount})` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setRightTab(tab.id)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                      cursor: 'pointer', border: 'none',
                      background: rightTab === tab.id ? '#f59e0b' : '#090d16',
                      color: rightTab === tab.id ? '#000' : '#94a3b8'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {rightTab === 'CHRONICLE' && (
                <div style={{ maxHeight: '290px', overflowY: 'auto', display: 'grid', gap: '6px', fontSize: '12px' }}>
                  {gameState.logs.map((entry, idx) => (
                    <div key={idx} style={{ padding: '7px 10px', borderRadius: '6px', background: '#090d16', borderBottom: '1px solid #1e293b' }}>
                      {entry}
                    </div>
                  ))}
                </div>
              )}

              {rightTab === 'EFFECTS' && (
                <div style={{ fontSize: '12px', display: 'grid', gap: '8px' }}>
                  <div style={{ padding: '10px', borderRadius: '8px', background: '#090d16' }}>
                    <strong style={{ color: '#fbbf24' }}>👑 Next Dawn Turn #1 Override:</strong>{' '}
                    {gameState.nextDayFirstPlayerId
                      ? players.find(p => p.id === gameState.nextDayFirstPlayerId)?.name
                      : 'Standard Rotation (No Royal Decree active)'}
                  </div>
                  {players.filter(p => p.alive && p.shield > 0).map(p => (
                    <div key={p.id} style={{ padding: '8px 10px', borderRadius: '8px', background: '#090d16', color: '#38bdf8' }}>
                      🛡️ <strong>{p.name}</strong> has <strong>+{p.shield} Shield</strong> active until Dawn.
                    </div>
                  ))}
                  {players.filter(p => p.alive && p.shield > 0).length === 0 && (
                    <div style={{ color: '#64748b', padding: '10px' }}>No active shields on the table right now.</div>
                  )}
                </div>
              )}

              {rightTab === 'DECK' && (
                <div style={{ maxHeight: '290px', overflowY: 'auto', display: 'grid', gap: '6px', fontSize: '12px' }}>
                  {gameState.deckSummary?.map(item => (
                    <div key={item.id} style={{
                      padding: '7px 10px', borderRadius: '6px', background: '#090d16',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <span style={{ fontWeight: 700, color: '#f8fafc' }}>{item.name}</span>{' '}
                        <span style={{ color: '#fbbf24' }}>({item.cost}G)</span>
                        {item.minDay > 1 && <span style={{ color: '#f87171', marginLeft: '6px' }}>[Day {item.minDay}+]</span>}
                      </div>
                      <span style={{ fontWeight: 800, color: item.remaining > 0 ? '#38bdf8' : '#475569' }}>
                        {item.remaining} / {item.total} left
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}