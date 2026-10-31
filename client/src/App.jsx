// client/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const socket = io(BACKEND_URL);

// --- 8 GOTHIC AVATAR DEFINITIONS (Matches Portrait Sheet #1 - #8) ---
const GOTHIC_AVATARS = [
  { id: 1, name: 'Silver Templar', frame: '#d4af37', gem: '#fbbf24', bg: '#3a3014', crop: '0% 0%' },
  { id: 2, name: 'Plague Apothecary', frame: '#2e8b57', gem: '#22c55e', bg: '#123524', crop: '33.33% 0%' },
  { id: 3, name: 'Witch Hunter', frame: '#3b82f6', gem: '#60a5fa', bg: '#172554', crop: '66.66% 0%' },
  { id: 4, name: 'Scarlet Aristocrat', frame: '#a16207', gem: '#f97316', bg: '#3b1d14', crop: '100% 0%' },
  { id: 5, name: 'Crimson Countess', frame: '#b91c1c', gem: '#ef4444', bg: '#450a0a', crop: '0% 100%' },
  { id: 6, name: 'Shadow Lord', frame: '#7e22ce', gem: '#a855f7', bg: '#2e1065', crop: '33.33% 100%' },
  { id: 7, name: 'High Inquisitor', frame: '#94a3b8', gem: '#fef08a', bg: '#1e293b', crop: '66.66% 100%' },
  { id: 8, name: 'Midnight Cutpurse', frame: '#57534e', gem: '#10b981', bg: '#1c1917', crop: '100% 100%' }
];

// --- ORNATE GOTHIC AVATAR COMPONENT ---
function GothicAvatar({ avatarId = 1, seatNumber, size = 68, isTurn = false, alive = true, selected = false }) {
  const av = GOTHIC_AVATARS[(Number(avatarId) - 1) % 8] || GOTHIC_AVATARS[0];

  const renderPortraitSvg = (id) => {
    switch (id) {
      case 1: // Templar Knight
        return (
          <g>
            <path d="M18 68 C18 48 62 48 62 68" fill="#64748b" stroke="#1e293b" strokeWidth="2" />
            <rect x="27" y="18" width="26" height="32" rx="6" fill="#94a3b8" stroke="#1e293b" strokeWidth="2" />
            <path d="M40 20 L40 48 M29 32 L51 32" stroke="#eab308" strokeWidth="3" />
            <rect x="31" y="29" width="7" height="3" fill="#0f172a" />
            <rect x="42" y="29" width="7" height="3" fill="#0f172a" />
          </g>
        );
      case 2: // Plague Apothecary
        return (
          <g>
            <path d="M16 68 C20 45 60 45 64 68" fill="#14532d" />
            <path d="M22 45 C22 14 58 14 58 45 Z" fill="#166534" stroke="#052e16" strokeWidth="2" />
            <ellipse cx="40" cy="36" rx="10" ry="12" fill="#d6c7b2" />
            <circle cx="36" cy="34" r="1.8" fill="#1c1917" />
            <circle cx="44" cy="34" r="1.8" fill="#1c1917" />
            <path d="M37 42 Q40 44 43 42" stroke="#451a03" strokeWidth="1.5" fill="none" />
          </g>
        );
      case 3: // Witch Hunter
        return (
          <g>
            <path d="M16 68 C20 46 60 46 64 68" fill="#78350f" />
            <ellipse cx="40" cy="37" rx="10" ry="12" fill="#d6b89c" />
            <path d="M14 26 L66 26 L52 15 L28 15 Z" fill="#292524" stroke="#0c0a09" strokeWidth="1.5" />
            <line x1="56" y1="18" x2="62" y2="48" stroke="#a16207" strokeWidth="3" />
          </g>
        );
      case 4: // Scarlet Aristocrat
        return (
          <g>
            <path d="M16 68 C22 44 58 44 64 68" fill="#7f1d1d" />
            <path d="M26 42 L20 26 L33 34 M54 42 L60 26 L47 34" fill="#991b1b" />
            <ellipse cx="40" cy="34" rx="10" ry="12" fill="#e5c8b0" />
            <path d="M30 25 Q40 16 50 25" fill="#27272a" />
          </g>
        );
      case 5: // Crimson Countess
        return (
          <g>
            <path d="M16 68 C22 46 58 46 64 68" fill="#881337" />
            <path d="M20 38 L14 22 L32 34 M60 38 L66 22 L48 34" fill="#9f1239" />
            <ellipse cx="40" cy="35" rx="10" ry="12" fill="#f1f5f9" />
            <circle cx="36" cy="34" r="2" fill="#dc2626" />
            <circle cx="44" cy="34" r="2" fill="#dc2626" />
            <path d="M36 42 Q40 45 44 42" stroke="#991b1b" strokeWidth="2" fill="none" />
          </g>
        );
      case 6: // Shadow Lord (Elder Vampire)
        return (
          <g>
            <path d="M14 68 L22 30 L34 42 L46 42 L58 30 L66 68 Z" fill="#1e1b4b" />
            <ellipse cx="40" cy="35" rx="10" ry="13" fill="#cbd5e1" />
            <path d="M26 30 L30 37 M54 30 L50 37" stroke="#cbd5e1" strokeWidth="3" />
            <circle cx="36" cy="34" r="2" fill="#ef4444" />
            <circle cx="44" cy="34" r="2" fill="#ef4444" />
          </g>
        );
      case 7: // High Inquisitor (Blindfolded Seer)
        return (
          <g>
            <path d="M16 68 C22 46 58 46 64 68" fill="#1e293b" />
            <ellipse cx="40" cy="35" rx="10" ry="12" fill="#d6c5b3" />
            <rect x="29" y="28" width="22" height="8" rx="2" fill="#d4b483" stroke="#78350f" strokeWidth="1.2" />
            <path d="M40 50 L40 62 M36 55 L44 55" stroke="#e2e8f0" strokeWidth="2" />
          </g>
        );
      default: // Midnight Cutpurse
        return (
          <g>
            <path d="M15 68 C20 44 60 44 65 68" fill="#18181b" />
            <path d="M20 48 C18 14 62 14 60 48 Z" fill="#27272a" stroke="#09090b" strokeWidth="2" />
            <ellipse cx="40" cy="37" rx="9" ry="10" fill="#78716c" />
            <path d="M26 24 Q40 36 54 24" fill="#09090b" />
          </g>
        );
    }
  };

  return (
    <div
      className="avatar-ring"
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        padding: 3,
        background: `conic-gradient(from 180deg, ${av.frame}, #1e293b, ${av.frame})`,
        boxShadow: isTurn
          ? `0 0 18px #f59e0b, 0 0 6px ${av.gem}`
          : selected
          ? `0 0 16px #ef4444`
          : '0 6px 14px rgba(0,0,0,0.75)',
        opacity: alive ? 1 : 0.42,
        flexShrink: 0
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 35%, ${av.bg}, #090b10)`,
          border: `2px solid ${av.frame}`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg viewBox="0 0 80 80" width="100%" height="100%">
          {renderPortraitSvg(av.id)}
        </svg>
      </div>

      {/* Top-Left Seat Number Badge */}
      {seatNumber !== undefined && (
        <div
          style={{
            position: 'absolute',
            top: -2,
            left: -2,
            width: Math.max(20, size * 0.31),
            height: Math.max(20, size * 0.31),
            borderRadius: '50%',
            background: '#1c1917',
            border: `2px solid ${av.frame}`,
            color: '#f8fafc',
            fontSize: Math.max(10, size * 0.17),
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.8)'
          }}
        >
          {seatNumber}
        </div>
      )}

      {/* Bottom-Right Glowing Status Gem */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: Math.max(14, size * 0.23),
          height: Math.max(14, size * 0.23),
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, #fff, ${av.gem} 45%, #090a0f 100%)`,
          border: `1.5px solid ${av.frame}`,
          boxShadow: `0 0 8px ${av.gem}`
        }}
      />
    </div>
  );
}

// --- VINTAGE INKED PARCHMENT CARD ILLUSTRATIONS (ALL 15 CARDS) ---
function GothicCardArtwork({ cardId, height = 84 }) {
  const renderIllustration = () => {
    switch (cardId) {
      case 'iron_dagger':
        return (
          <g>
            <line x1="25" y1="68" x2="72" y2="18" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
            <line x1="25" y1="68" x2="55" y2="36" stroke="#94a3b8" strokeWidth="3" />
            <path d="M52 28 L68 44" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
            <circle cx="74" cy="16" r="4" fill="#92400e" />
          </g>
        );
      case 'silver_caltrops':
        return (
          <g>
            <polygon points="50,12 56,38 82,32 60,48 72,74 48,56 24,72 38,46 18,28 44,36" fill="#64748b" stroke="#1e293b" strokeWidth="2" />
            <circle cx="30" cy="68" r="4" fill="#991b1b" />
            <circle cx="65" cy="70" r="3" fill="#991b1b" />
          </g>
        );
      case 'wooden_shield':
        return (
          <g>
            <path d="M28 16 H72 V42 C72 60 50 74 50 74 C50 74 28 60 28 42 Z" fill="#854d0e" stroke="#422006" strokeWidth="3" />
            <line x1="40" y1="16" x2="40" y2="66" stroke="#422006" strokeWidth="1.5" />
            <line x1="60" y1="16" x2="60" y2="66" stroke="#422006" strokeWidth="1.5" />
            <circle cx="50" cy="42" r="8" fill="#94a3b8" stroke="#1e293b" strokeWidth="2" />
          </g>
        );
      case 'sacred_ward':
        return (
          <g>
            <circle cx="50" cy="44" r="32" fill="rgba(254, 240, 138, 0.35)" />
            <path d="M28 15 H72 V42 C72 62 50 75 50 75 C50 75 28 62 28 42 Z" fill="#cbd5e1" stroke="#334155" strokeWidth="2.5" />
            <path d="M50 24 V62 M36 38 H64" stroke="#eab308" strokeWidth="5" strokeLinecap="round" />
          </g>
        );
      case 'healing_salve':
        return (
          <g>
            <rect x="33" y="26" width="34" height="44" rx="6" fill="rgba(34, 197, 94, 0.25)" stroke="#3f6212" strokeWidth="2.5" />
            <rect x="33" y="42" width="34" height="28" rx="4" fill="#4d7c0f" />
            <rect x="38" y="16" width="24" height="10" rx="2" fill="#92400e" />
          </g>
        );
      case 'holy_water':
        return (
          <g>
            <circle cx="50" cy="48" r="22" fill="#bae6fd" stroke="#0284c7" strokeWidth="2.5" />
            <rect x="44" y="16" width="12" height="12" fill="#94a3b8" stroke="#334155" strokeWidth="2" />
            <path d="M50 36 V60 M40 46 H60" stroke="#0369a1" strokeWidth="4" />
          </g>
        );
      case 'executioner_pistol':
        return (
          <g>
            <path d="M20 42 L74 30 L76 38 L36 48 L28 68 L18 64 Z" fill="#475569" stroke="#1e293b" strokeWidth="2.5" />
            <circle cx="84" cy="28" r="5" fill="#f97316" />
          </g>
        );
      case 'cutpurse':
        return (
          <g>
            <path d="M36 32 C26 45 28 68 50 68 C72 68 74 45 64 32 Z" fill="#78350f" stroke="#451a03" strokeWidth="2.5" />
            <line x1="22" y1="44" x2="58" y2="48" stroke="#cbd5e1" strokeWidth="3" />
            <circle cx="42" cy="72" r="4" fill="#eab308" />
            <circle cx="56" cy="73" r="4" fill="#eab308" />
          </g>
        );
      case 'royal_decree':
        return (
          <g>
            <ellipse cx="50" cy="56" rx="30" ry="12" fill="#991b1b" stroke="#450a0a" strokeWidth="2" />
            <path d="M28 52 L32 26 L44 38 L50 22 L56 38 L68 26 L72 52 Z" fill="#eab308" stroke="#713f12" strokeWidth="2" />
          </g>
        );
      case 'shadow_swap':
        return (
          <g>
            <path d="M24 62 C24 38 42 38 42 62 Z" fill="#1e293b" />
            <path d="M58 62 C58 38 76 38 76 62 Z" fill="#334155" />
            <path d="M30 24 Q50 10 70 24" fill="none" stroke="#1e293b" strokeWidth="3" />
            <path d="M30 68 Q50 80 70 68" fill="none" stroke="#1e293b" strokeWidth="3" />
          </g>
        );
      case 'time_twist':
        return (
          <g>
            <path d="M34 18 H66 L54 44 L66 70 H34 L46 44 Z" fill="#fef3c7" stroke="#78350f" strokeWidth="2.5" />
            <ellipse cx="50" cy="44" rx="34" ry="12" fill="none" stroke="#d97706" strokeWidth="2" strokeDasharray="4 3" />
          </g>
        );
      case 'bloodhound':
        return (
          <g>
            <path d="M24 64 L32 38 L44 26 L58 30 L72 58" fill="#27272a" stroke="#09090b" strokeWidth="2" />
            <circle cx="44" cy="34" r="2.2" fill="#ef4444" />
            <circle cx="52" cy="34" r="2.2" fill="#ef4444" />
            <circle cx="32" cy="70" r="3" fill="#991b1b" />
            <circle cx="44" cy="72" r="3" fill="#991b1b" />
          </g>
        );
      case 'inquisitor_lens':
        return (
          <g>
            <line x1="24" y1="68" x2="44" y2="50" stroke="#92400e" strokeWidth="6" strokeLinecap="round" />
            <circle cx="58" cy="36" r="18" fill="#fecaca" stroke="#b45309" strokeWidth="3.5" />
            <ellipse cx="58" cy="36" rx="10" ry="6" fill="#dc2626" />
            <ellipse cx="58" cy="36" rx="2.5" ry="5" fill="#09090b" />
          </g>
        );
      case 'vampiric_curse':
        return (
          <g>
            <ellipse cx="50" cy="44" rx="26" ry="20" fill="#7f1d1d" stroke="#450a0a" strokeWidth="2.5" />
            <polygon points="36,32 40,52 44,32" fill="#f8fafc" />
            <polygon points="56,32 60,52 64,32" fill="#f8fafc" />
            <circle cx="40" cy="62" r="3.5" fill="#dc2626" />
            <circle cx="60" cy="64" r="3.5" fill="#dc2626" />
          </g>
        );
      case 'purifying_elixir':
        return (
          <g>
            <circle cx="50" cy="48" r="26" fill="rgba(253, 224, 71, 0.35)" />
            <circle cx="50" cy="52" r="16" fill="#fde047" stroke="#854d0e" strokeWidth="2.5" />
            <rect x="45" y="20" width="10" height="16" fill="#fef08a" stroke="#854d0e" strokeWidth="2" />
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height,
        background: 'radial-gradient(circle, #f5ebd6 0%, #d8c39e 100%)',
        border: '1px solid #9c7e4e',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '6px 0',
        overflow: 'hidden'
      }}
    >
      <svg viewBox="0 0 100 84" width="100%" height="100%">
        {renderIllustration()}
      </svg>
    </div>
  );
}

// --- REUSABLE PARCHMENT TAROT CARD ---
function ParchmentCard({ card, onClick, disabled = false, selected = false, fanStyle = {}, compact = false }) {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className="parchment-card"
      style={{
        width: compact ? 132 : 154,
        minHeight: compact ? 185 : 212,
        borderRadius: 10,
        padding: compact ? 8 : 10,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: disabled ? 'default' : 'pointer',
        border: selected ? '3px solid #ef4444' : '2px solid #7c5e2f',
        position: 'relative',
        userSelect: 'none',
        ...fanStyle
      }}
    >
      {/* Top Row: Gold Cost Badge + Card Title */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #fbbf24, #92400e)',
              border: '1.5px solid #451a03',
              color: '#fff',
              fontWeight: 800,
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {card.cost}G
          </div>
          <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 800, fontSize: compact ? 11 : 12, color: '#1c1917', lineHeight: 1.15 }}>
            {card.name}
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#57534e', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {card.category}
        </div>
      </div>

      {/* Center Ink Illustration */}
      <GothicCardArtwork cardId={card.id} height={compact ? 70 : 84} />

      {/* Bottom Effect Text */}
      <div style={{ fontFamily: 'Lora, serif', fontSize: compact ? 10.5 : 11.5, color: '#292524', textAlign: 'center', lineHeight: 1.25, fontWeight: 600 }}>
        {card.desc}
      </div>
    </div>
  );
}

// --- LIVE CHAT FEED COMPONENT ---
function ChatPanel({ chatMessages = [], onSend }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <div
      style={{
        background: 'rgba(17, 21, 31, 0.92)',
        border: '1.5px solid #475569',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 230,
        overflow: 'hidden',
        boxShadow: 'inset 0 0 24px rgba(0,0,0,0.75)'
      }}
    >
      <div
        className="gothic-title"
        style={{
          padding: '8px 14px',
          background: 'linear-gradient(90deg, #1e293b, #0f172a)',
          borderBottom: '1px solid #475569',
          fontSize: 12,
          fontWeight: 700,
          textAlign: 'center',
          color: '#e2e8f0',
          letterSpacing: '0.12em'
        }}
      >
        💬 CHAT FEED
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {chatMessages.map((m) => (
          <div
            key={m.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              background: m.isSystem ? 'rgba(153, 27, 27, 0.18)' : 'rgba(30, 41, 59, 0.55)',
              padding: '6px 9px',
              borderRadius: 8,
              borderLeft: m.isSystem ? '3px solid #ef4444' : '3px solid #94a3b8'
            }}
          >
            <GothicAvatar avatarId={m.avatarId || 1} size={28} />
            <div style={{ flex: 1, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', fontWeight: 700, marginBottom: 2 }}>
                <span>{m.sender}</span>
                <span style={{ fontSize: 10, color: '#64748b' }}>{m.time}</span>
              </div>
              <div style={{ color: '#e2e8f0', lineHeight: 1.35, wordBreak: 'break-word' }}>{m.text}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} style={{ display: 'flex', borderTop: '1px solid #334155', background: '#090b10' }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Whisper to the table..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            padding: '9px 12px',
            color: '#f8fafc',
            fontSize: 12,
            outline: 'none'
          }}
        />
        <button
          type="submit"
          style={{
            background: '#991b1b',
            color: '#fff',
            border: 'none',
            padding: '0 14px',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer'
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState('HOME'); // HOME | FIND
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(1);
  const [joinCode, setJoinCode] = useState('');
  const [publicRooms, setPublicRooms] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Gameplay states
  const [selectedCard, setSelectedCard] = useState(null);
  const [cardCarouselIdx, setCardCarouselIdx] = useState(0);
  const [nightChoice, setNightChoice] = useState('SHIELD');
  const [nightStrikes, setNightStrikes] = useState({});

  useEffect(() => {
    socket.on('gameState', (state) => {
      setGameState(state);
      setErrorMsg('');
    });
    socket.on('publicRoomsList', (list) => {
      setPublicRooms(list || []);
    });
    socket.on('errorMsg', (msg) => {
      setErrorMsg(msg);
    });
    return () => {
      socket.off('gameState');
      socket.off('publicRoomsList');
      socket.off('errorMsg');
    };
  }, []);

  // --- SCREEN 1 & 2: HOME GATE & PUBLIC ROOM BROWSER ---
  if (!gameState) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div
          style={{
            maxWidth: 520,
            width: '100%',
            background: 'rgba(18, 22, 33, 0.94)',
            border: '2px solid #475569',
            borderRadius: 16,
            padding: 28,
            boxShadow: '0 24px 60px rgba(0,0,0,0.85)'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.22em', color: '#f87171', fontWeight: 700, marginBottom: 6 }}>
              OBSIDIAN VELVET EDITION
            </div>
            <h1 className="gothic-title" style={{ fontSize: 36, color: '#f8fafc', margin: 0 }}>
              BLOOD & SILVER
            </h1>
            <p style={{ fontFamily: 'Lora, serif', fontStyle: 'italic', color: '#94a3b8', fontSize: 14, marginTop: 4 }}>
              A Gothic Hidden-Role Card Game for 3–8 Players
            </p>
          </div>

          {errorMsg && (
            <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', padding: 10, borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {screen === 'HOME' ? (
            <>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: 6 }}>
                YOUR HUNTER / NOBLE NAME
              </label>
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name..."
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 8,
                  border: '1px solid #475569',
                  background: '#090b10',
                  color: '#fff',
                  fontSize: 14,
                  marginBottom: 16
                }}
              />

              <label style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: 8 }}>
                CHOOSE YOUR GOTHIC AVATAR (SEATS 1–8)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20, justifyItems: 'center' }}>
                {GOTHIC_AVATARS.map((av) => (
                  <div
                    key={av.id}
                    onClick={() => setSelectedAvatar(av.id)}
                    style={{ textAlign: 'center', cursor: 'pointer' }}
                  >
                    <GothicAvatar
                      avatarId={av.id}
                      seatNumber={av.id}
                      size={58}
                      isTurn={selectedAvatar === av.id}
                    />
                    <div style={{ fontSize: 10, color: selectedAvatar === av.id ? '#fbbf24' : '#94a3b8', marginTop: 4, fontWeight: 600 }}>
                      {av.name.split(' ').slice(-1)[0]}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => socket.emit('createRoom', { playerName: playerName || 'Hunter', avatarId: selectedAvatar })}
                className="gothic-title"
                style={{
                  width: '100%',
                  padding: 13,
                  background: 'linear-gradient(180deg, #b91c1c, #7f1d1d)',
                  color: '#fff',
                  border: '1px solid #f87171',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: 'pointer',
                  marginBottom: 10
                }}
              >
                🏰 NEW GAME (CREATE MANOR)
              </button>

              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="4-LETTER ROOM CODE"
                  maxLength={4}
                  style={{
                    flex: 1,
                    padding: 11,
                    borderRadius: 8,
                    border: '1px solid #475569',
                    background: '#090b10',
                    color: '#fbbf24',
                    fontWeight: 800,
                    textAlign: 'center',
                    letterSpacing: '0.15em'
                  }}
                />
                <button
                  onClick={() => socket.emit('joinRoom', { roomCode: joinCode, playerName: playerName || 'Guest', avatarId: selectedAvatar })}
                  className="gothic-title"
                  style={{
                    padding: '0 22px',
                    background: 'linear-gradient(180deg, #b48628, #785412)',
                    color: '#fff',
                    border: '1px solid #fde047',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  JOIN
                </button>
              </div>

              <button
                onClick={() => {
                  setScreen('FIND');
                  socket.emit('getPublicRooms');
                }}
                style={{
                  width: '100%',
                  padding: 11,
                  background: '#1e293b',
                  color: '#cbd5e1',
                  border: '1px solid #475569',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📡 FIND PUBLIC GAME
              </button>
            </>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 className="gothic-title" style={{ margin: 0 }}>OPEN MANOR LOBBIES</h3>
                <button
                  onClick={() => setScreen('HOME')}
                  style={{ background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', padding: '5px 12px', borderRadius: 6, cursor: 'pointer' }}
                >
                  ← Back
                </button>
              </div>
              {publicRooms.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                  No public lobbies waiting right now. Click below to host one!
                </div>
              ) : (
                publicRooms.map((r) => (
                  <div
                    key={r.roomCode}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 12,
                      background: '#090b10',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      marginBottom: 8
                    }}
                  >
                    <div>
                      <strong style={{ color: '#fbbf24' }}>{r.roomCode}</strong> — Host: {r.hostName}
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>
                        {r.playerCount}/{r.maxPlayers} Players • {r.phase}
                      </div>
                    </div>
                    <button
                      onClick={() => socket.emit('joinRoom', { roomCode: r.roomCode, playerName: playerName || 'Guest', avatarId: selectedAvatar })}
                      style={{ background: '#b91c1c', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
                    >
                      JOIN
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const { me, players, catalog = [], chatMessages = [] } = gameState;
  const isMyTurn = gameState.phase === 'DAY' && gameState.currentTurnPlayerId === me.id;
  const visibleCatalog = catalog.slice(cardCarouselIdx, cardCarouselIdx + 4);

  // --- SCREEN 3: LOBBY & "HOW TO PLAY" GOTHIC MOCKUP SCREEN ---
  if (gameState.phase === 'LOBBY' || gameState.phase === 'HOW_TO_PLAY') {
    return (
      <div style={{ minHeight: '100vh', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1400, margin: '0 auto' }}>
        {/* Top Gothic Ribbon Banner + Skip / Start Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ background: '#1e293b', border: '1px solid #64748b', padding: '6px 12px', borderRadius: 8, fontWeight: 800, color: '#fbbf24' }}>
              MANOR CODE: {gameState.roomCode}
            </span>
            <button
              onClick={() => socket.emit('addBot')}
              style={{ background: '#1e293b', border: '1px solid #475569', color: '#e2e8f0', padding: '6px 12px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
            >
              + Add AI Bot ({players.length}/8)
            </button>
          </div>

          <div
            className="gothic-title"
            style={{
              background: 'linear-gradient(180deg, #27303f, #111622)',
              border: '2px solid #94a3b8',
              padding: '8px 36px',
              borderRadius: 10,
              fontSize: 26,
              fontWeight: 800,
              color: '#f8fafc',
              boxShadow: '0 8px 20px rgba(0,0,0,0.75)'
            }}
          >
            HOW TO PLAY
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => socket.emit('startGame', {})}
              className="gothic-title"
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(180deg, #b48628, #785412)',
                border: '2px solid #fde047',
                color: '#fff',
                borderRadius: 8,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              SKIP RULES
            </button>
            <button
              onClick={() => socket.emit('startGame', {})}
              className="gothic-title"
              style={{
                padding: '10px 24px',
                background: 'linear-gradient(180deg, #991b1b, #5c0f0f)',
                border: '2px solid #f87171',
                color: '#fff',
                borderRadius: 8,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              START GAME
            </button>
          </div>
        </div>

        {/* Center 3 Giant Parchment Rule Posters (Matches Your Mockup Image!) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {/* Card 1: The Dawn */}
          <div
            style={{
              background: 'linear-gradient(160deg, #ecd8bd, #c8a982)',
              border: '3px solid #7c2d12',
              borderRadius: 12,
              padding: 22,
              color: '#1c1917',
              textAlign: 'center',
              boxShadow: '0 14px 32px rgba(0,0,0,0.7)'
            }}
          >
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 30, marginBottom: 8 }}>The Dawn</h2>
            <svg viewBox="0 0 180 120" width="180" height="120" style={{ margin: '0 auto 10px' }}>
              <path d="M90 15 Q70 25 65 45 L95 45 Z" fill="#d6b89c" stroke="#1c1917" strokeWidth="2.5" />
              <circle cx="80" cy="56" r="9" fill="#eab308" stroke="#1c1917" strokeWidth="2" />
              {[45, 70, 95, 120].map((x, idx) => (
                <g key={idx}>
                  <ellipse cx={x} cy="95" rx="14" ry="5" fill="#eab308" stroke="#1c1917" strokeWidth="2" />
                  <ellipse cx={x} cy="88" rx="14" ry="5" fill="#facc15" stroke="#1c1917" strokeWidth="2" />
                  <ellipse cx={x} cy="81" rx="14" ry="5" fill="#fde047" stroke="#1c1917" strokeWidth="2" />
                </g>
              ))}
            </svg>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>
              Hand takes coins from a shared treasury
              <br />
              <span style={{ fontSize: 14, color: '#44403c' }}>(Gold based on players alive)</span>
            </p>
          </div>

          {/* Card 2: Equipment */}
          <div
            style={{
              background: 'linear-gradient(160deg, #dde3ea, #b6c2cf)',
              border: '3px solid #475569',
              borderRadius: 12,
              padding: 22,
              color: '#0f172a',
              textAlign: 'center',
              boxShadow: '0 14px 32px rgba(0,0,0,0.7)'
            }}
          >
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 30, marginBottom: 8 }}>Equipment</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, margin: '8px 0 14px' }}>
              {catalog.slice(0, 3).map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    transform: `rotate(${(i - 1) * 8}deg)`,
                    background: '#e5d3b3',
                    border: '2px solid #78350f',
                    borderRadius: 6,
                    padding: 6,
                    width: 78
                  }}
                >
                  <div style={{ fontSize: 9, fontWeight: 800 }}>{c.name}</div>
                  <GothicCardArtwork cardId={c.id} height={42} />
                  <div style={{ fontSize: 8 }}>{c.category}</div>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>
              Spend Gold on your turn to Attack, Ward with Shields, Swap Turn Order, or Inspect Roles.
            </p>
          </div>

          {/* Card 3: The Accusation */}
          <div
            style={{
              background: 'linear-gradient(160deg, #dcd7f4, #b5add9)',
              border: '3px solid #4c1d95',
              borderRadius: 12,
              padding: 22,
              color: '#1e1b4b',
              textAlign: 'center',
              boxShadow: '0 14px 32px rgba(0,0,0,0.7)'
            }}
          >
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 30, marginBottom: 8 }}>The Accusation</h2>
            <svg viewBox="0 0 180 120" width="180" height="120" style={{ margin: '0 auto 10px' }}>
              <rect x="70" y="38" width="40" height="58" rx="18" fill="#312e81" stroke="#1e1b4b" strokeWidth="3" />
              <line x1="20" y1="30" x2="62" y2="48" stroke="#1e1b4b" strokeWidth="4" strokeLinecap="round" />
              <line x1="160" y1="30" x2="118" y2="48" stroke="#1e1b4b" strokeWidth="4" strokeLinecap="round" />
              <line x1="25" y1="78" x2="64" y2="64" stroke="#1e1b4b" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 800, marginTop: 8 }}>
              3 Accusations = Death!
            </p>
          </div>
        </div>

        {/* Bottom 3 Panels: PLAYER ROSTER | CARD LIBRARY & EXPLANATIONS | CHAT FEED */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 320px', gap: 16, alignItems: 'stretch' }}>
          {/* Left: Player Roster */}
          <div
            style={{
              background: 'rgba(17, 21, 31, 0.92)',
              border: '1.5px solid #475569',
              borderRadius: 12,
              padding: 14
            }}
          >
            <div className="gothic-title" style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#e2e8f0' }}>
              PLAYER ROSTER ({players.length}/8)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, justifyItems: 'center' }}>
              {players.map((p, idx) => (
                <div key={p.id} style={{ textAlign: 'center' }}>
                  <GothicAvatar avatarId={p.avatarId} seatNumber={idx + 1} size={62} />
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, color: '#e2e8f0' }}>{p.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Center: Card Library & Explanations Carousel */}
          <div
            style={{
              background: 'rgba(17, 21, 31, 0.92)',
              border: '1.5px solid #475569',
              borderRadius: 12,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div className="gothic-title" style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#e2e8f0' }}>
              CARD LIBRARY & EXPLANATIONS ({cardCarouselIdx + 1}–{Math.min(catalog.length, cardCarouselIdx + 4)} OF {catalog.length})
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <button
                onClick={() => setCardCarouselIdx(Math.max(0, cardCarouselIdx - 4))}
                style={{ background: '#1e293b', border: '1px solid #64748b', color: '#fff', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', fontWeight: 800 }}
              >
                ‹
              </button>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '6px 4px', justifyContent: 'center', flex: 1 }}>
                {visibleCatalog.map((card) => (
                  <ParchmentCard key={card.id} card={card} compact disabled />
                ))}
              </div>
              <button
                onClick={() => setCardCarouselIdx(cardCarouselIdx + 4 >= catalog.length ? 0 : cardCarouselIdx + 4)}
                style={{ background: '#1e293b', border: '1px solid #64748b', color: '#fff', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', fontWeight: 800 }}
              >
                ›
              </button>
            </div>
          </div>

          {/* Right: Live Chat Feed */}
          <ChatPanel
            chatMessages={chatMessages}
            onSend={(txt) => socket.emit('sendChat', { text: txt })}
          />
        </div>
      </div>
    );
  }

  // --- SCREEN 4: CIRCULAR TABLETOP + FAN OF CARDS + LIVE CHAT SIDEBAR ---
  const handleSeatClick = (targetPlayer) => {
    if (!selectedCard || !isMyTurn) return;
    socket.emit('playCard', { cardUid: selectedCard.uid, targetId: targetPlayer.id });
    setSelectedCard(null);
  };

  return (
    <div style={{ minHeight: '100vh', padding: '14px 20px', maxWidth: 1440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Top Status Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(17, 21, 31, 0.92)',
          border: '1.5px solid #475569',
          borderRadius: 12,
          padding: '10px 18px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="gothic-title" style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc' }}>
            🩸 BLOOD & SILVER
          </span>
          <span style={{ background: '#1e293b', padding: '4px 10px', borderRadius: 6, color: '#fbbf24', fontWeight: 700, fontSize: 12 }}>
            ROOM: {gameState.roomCode}
          </span>
          <span style={{ fontSize: 13, color: '#cbd5e1' }}>
            {gameState.phase === 'DAY' ? `☀️ DAY ${gameState.day}` : `🌙 NIGHT ${gameState.day}`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ background: '#1e293b', padding: '6px 12px', borderRadius: 8, fontSize: 13 }}>
            Secret Role:{' '}
            <strong style={{ color: me.role === 'Vampire' ? '#ef4444' : '#38bdf8' }}>
              {me.role}
            </strong>
          </span>
          <span style={{ background: '#1e293b', padding: '6px 12px', borderRadius: 8, fontSize: 13 }}>
            ❤️ {me.hp}/10 • 🛡️ {me.shield} • 🪙 {me.gold}G
          </span>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: '#7f1d1d', padding: 10, borderRadius: 8, fontSize: 13 }}>⚠️ {errorMsg}</div>
      )}

      {/* Main Layout: Circular Tabletop on Left/Center + Chat & Chronicle on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, flex: 1 }}>
        {/* Left/Center: Circular Manor Table + Fanned Hand */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
          {/* Circular Table Arena */}
          <div
            style={{
              position: 'relative',
              height: 450,
              background: 'radial-gradient(circle, rgba(30, 41, 59, 0.55) 0%, rgba(11, 13, 19, 0.92) 72%)',
              border: '1.5px solid #334155',
              borderRadius: 18,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Inner Velvet Tabletop Ring */}
            <div
              style={{
                width: 250,
                height: 250,
                borderRadius: '50%',
                background: 'radial-gradient(circle, #2a1218 0%, #121622 100%)',
                border: '3px solid #8a6d3b',
                boxShadow: '0 0 50px rgba(0,0,0,0.85), inset 0 0 25px rgba(0,0,0,0.8)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 18,
                textAlign: 'center',
                zIndex: 5
              }}
            >
              {gameState.phase === 'GAME_OVER' ? (
                <>
                  <div className="gothic-title" style={{ color: '#fbbf24', fontSize: 16, fontWeight: 800 }}>
                    🏆 {gameState.winner}
                  </div>
                  <button
                    onClick={() => socket.emit('startGame', {})}
                    style={{ marginTop: 10, padding: '8px 16px', background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Play Again
                  </button>
                </>
              ) : gameState.phase === 'DAY' ? (
                <>
                  <div className="gothic-title" style={{ fontSize: 11, color: '#fbbf24', letterSpacing: '0.1em' }}>
                    SHARED TREASURY
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#fef08a', margin: '2px 0 8px' }}>
                    🪙 {gameState.commonwealthGold}G
                  </div>

                  {isMyTurn ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {[1, 2].map((amt) => (
                          <button
                            key={amt}
                            disabled={me.tookGoldThisTurn + amt > gameState.maxTreasuryTake || gameState.commonwealthGold < amt}
                            onClick={() => socket.emit('takeGold', { amount: amt })}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 6,
                              border: '1px solid #fde047',
                              background: '#b48628',
                              color: '#fff',
                              fontWeight: 800,
                              fontSize: 11,
                              cursor: 'pointer'
                            }}
                          >
                            Take +{amt}G
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => socket.emit('endTurn')}
                        style={{
                          padding: '6px 16px',
                          borderRadius: 6,
                          border: '1px solid #4ade80',
                          background: '#15803d',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        End Turn →
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                      Active Turn:
                      <br />
                      <strong style={{ color: '#fbbf24' }}>
                        {players.find((p) => p.id === gameState.currentTurnPlayerId)?.name}
                      </strong>
                    </div>
                  )}
                </>
              ) : (
                /* NIGHT CONSENSUS CENTER CONTROL */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                  <div className="gothic-title" style={{ color: '#f87171', fontSize: 13, fontWeight: 800 }}>
                    🌙 NIGHT {gameState.day} ({gameState.nightDamagePool} DMG)
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['SHIELD', 'DRAW', 'GOLD'].map((ch) => (
                      <button
                        key={ch}
                        onClick={() => setNightChoice(ch)}
                        style={{
                          padding: '4px 8px',
                          fontSize: 10,
                          borderRadius: 5,
                          border: nightChoice === ch ? '1.5px solid #fbbf24' : '1px solid #475569',
                          background: '#1e293b',
                          color: '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={me.nightSubmitted}
                    onClick={() => socket.emit('submitNightAction', { choice: nightChoice, strikes: nightStrikes })}
                    style={{
                      padding: '6px 14px',
                      background: me.nightSubmitted ? '#475569' : '#b91c1c',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {me.nightSubmitted ? '✓ Night Locked' : 'Lock Night Action'}
                  </button>
                </div>
              )}
            </div>

            {/* Players Seated in a Circle Around the Table */}
            {players.map((p, idx) => {
              const total = players.length;
              const angle = (2 * Math.PI * idx) / total - Math.PI / 2;
              const rx = 250;
              const ry = 165;
              const x = Math.cos(angle) * rx;
              const y = Math.sin(angle) * ry;
              const isTurn = gameState.phase === 'DAY' && gameState.currentTurnPlayerId === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (gameState.phase === 'NIGHT' && me.role === 'Vampire') {
                      setNightStrikes({ [p.id]: gameState.nightDamagePool });
                    } else {
                      handleSeatClick(p);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    left: `calc(50% + ${x}px - 62px)`,
                    top: `calc(50% + ${y}px - 52px)`,
                    width: 124,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: selectedCard ? 'crosshair' : 'pointer',
                    zIndex: isTurn ? 15 : 10
                  }}
                >
                  <GothicAvatar
                    avatarId={p.avatarId}
                    seatNumber={p.turnPosition}
                    size={64}
                    isTurn={isTurn}
                    alive={p.alive}
                    selected={!!nightStrikes[p.id]}
                  />
                  <div
                    style={{
                      marginTop: 4,
                      background: 'rgba(9, 11, 16, 0.92)',
                      border: isTurn ? '1.5px solid #fbbf24' : '1px solid #475569',
                      borderRadius: 8,
                      padding: '3px 8px',
                      textAlign: 'center',
                      width: '100%'
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name} {p.id === me.id ? '(You)' : ''}
                    </div>
                    <div style={{ fontSize: 10, color: '#cbd5e1', display: 'flex', justifyContent: 'center', gap: 5 }}>
                      <span>❤️{p.hp}</span>
                      <span>🛡️{p.shield}</span>
                      <span>🪙{p.gold}G</span>
                      <span>🃏{p.cardCount}</span>
                    </div>
                    {p.accusations > 0 && (
                      <div style={{ fontSize: 9, color: '#f87171', fontWeight: 800 }}>
                        ⚖️ {p.accusations}/3 Accused
                      </div>
                    )}
                  </div>
                  {gameState.phase === 'DAY' && p.alive && p.id !== me.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        socket.emit('accusePlayer', { targetId: p.id });
                      }}
                      style={{
                        marginTop: 3,
                        background: '#450a0a',
                        border: '1px solid #ef4444',
                        color: '#fecaca',
                        fontSize: 9,
                        padding: '2px 7px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontWeight: 700
                      }}
                    >
                      👉 Accuse
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Hand Area: 3D Curved Card Fan Positioning */}
          <div
            style={{
              background: 'rgba(17, 21, 31, 0.92)',
              border: '1.5px solid #475569',
              borderRadius: 14,
              padding: '12px 18px',
              minHeight: 250,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="gothic-title" style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0' }}>
                🃏 YOUR HAND ({me.hand.length}/4 MAX AT END OF TURN)
              </span>
              {selectedCard && (
                <span style={{ color: '#fbbf24', fontSize: 12, fontWeight: 700 }}>
                  🎯 Click any player Avatar around the circle to cast [{selectedCard.name}]!
                </span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 10, padding: '14px 0 4px' }}>
              {me.hand.map((card, idx) => {
                const mid = (me.hand.length - 1) / 2;
                const offset = idx - mid;
                const deg = offset * 5;
                const yLift = Math.abs(offset) * 6;

                return (
                  <div key={card.uid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <ParchmentCard
                      card={card}
                      selected={selectedCard?.uid === card.uid}
                      fanStyle={{
                        transform: `rotate(${deg}deg) translateY(${yLift}px)`
                      }}
                      onClick={() => {
                        if (!isMyTurn) return;
                        if (!card.needsTarget) {
                          socket.emit('playCard', { cardUid: card.uid, targetId: me.id });
                          setSelectedCard(null);
                        } else {
                          setSelectedCard(card);
                        }
                      }}
                    />
                    {isMyTurn && (
                      <button
                        disabled={me.gold < 1}
                        onClick={() => socket.emit('cycleCard', { cardUid: card.uid })}
                        style={{
                          background: '#1e293b',
                          border: '1px solid #64748b',
                          color: '#fbbf24',
                          fontSize: 10,
                          padding: '3px 10px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        🔄 Cycle (1G)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Chat Feed + Town Chronicle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <ChatPanel
              chatMessages={chatMessages}
              onSend={(txt) => socket.emit('sendChat', { text: txt })}
            />
          </div>

          <div
            style={{
              height: 240,
              background: 'rgba(17, 21, 31, 0.92)',
              border: '1.5px solid #475569',
              borderRadius: 12,
              padding: 12,
              overflowY: 'auto'
            }}
          >
            <div className="gothic-title" style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 8 }}>
              📜 MANOR CHRONICLE & INTEL
            </div>
            {me.intel.map((item, i) => (
              <div key={`intel_${i}`} style={{ fontSize: 11.5, color: '#38bdf8', padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
                {item}
              </div>
            ))}
            {gameState.logs.map((entry, idx) => (
              <div key={idx} style={{ fontSize: 11.5, color: '#cbd5e1', padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
                {entry}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}