// client/src/App.jsx
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// Change this URL to your Render/Railway backend URL when deploying online!
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const socket = io(BACKEND_URL);

export default function App() {
  const [playerName, setPlayerName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [roomState, setRoomState] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Card targeting state
  const [selectedCard, setSelectedCard] = useState(null);
  const [firstTargetId, setFirstTargetId] = useState('');

  // Night selection state
  const [nightUtility, setNightUtility] = useState('SHIELD');
  const [nightTargetId, setNightTargetId] = useState('');

  useEffect(() => {
    socket.on('ROOM_STATE', (state) => {
      setRoomState(state);
      setErrorMsg('');
    });
    socket.on('ERROR_MSG', (msg) => {
      setErrorMsg(msg);
    });
    return () => {
      socket.off('ROOM_STATE');
      socket.off('ERROR_MSG');
    };
  }, []);

  if (!roomState) {
    return (
      <div style={{ minHeight: '100vh', background: '#0c0a09', color: '#f5f5f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: 20 }}>
        <div style={{ maxWidth: 440, width: '100%', background: '#1c1917', border: '1px solid #44403c', borderRadius: 16, padding: 28 }}>
          <h1 style={{ margin: '0 0 8px', color: '#f43f5e' }}>🩸 Blood & Silver Online</h1>
          <p style={{ color: '#a8a29e', fontSize: 14, marginBottom: 20 }}>
            Multiplayer Hidden-Role Social Deduction Board Game
          </p>

          {errorMsg && (
            <div style={{ background: '#7f1d1d', padding: 10, borderRadius: 8, marginBottom: 14, fontSize: 14 }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: '#d6d3d1' }}>Your Name</label>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name..."
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #57534e', background: '#0c0a09', color: '#fff', marginBottom: 16 }}
          />

          <button
            onClick={() => socket.emit('CREATE_ROOM', { playerName: playerName || 'Host' })}
            style={{ width: '100%', padding: 12, background: '#e11d48', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', marginBottom: 20 }}
          >
            🏰 Create New Room
          </button>

          <hr style={{ borderColor: '#292524', marginBottom: 16 }} />

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              placeholder="4-Letter Room Code (e.g. XF2A)"
              maxLength={4}
              style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #57534e', background: '#0c0a09', color: '#fff', textTransform: 'uppercase' }}
            />
            <button
              onClick={() => socket.emit('JOIN_ROOM', { roomCode: joinCodeInput, playerName: playerName || 'Guest' })}
              style={{ padding: '10px 18px', background: '#f59e0b', color: '#0c0a09', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
            >
              Join
            </button>
          </div>
        </div>
      </div>
    );
  }

  const me = roomState.players.find((p) => p.id === socket.id);
  const isMyTurn = roomState.phase === 'DAY' && roomState.activePlayerId === socket.id;
  const isHost = roomState.hostId === socket.id;

  const handlePlayerClick = (targetPlayer) => {
    if (roomState.phase === 'NIGHT') {
      setNightTargetId(targetPlayer.id);
      return;
    }
    if (!isMyTurn || !selectedCard) return;

    if (selectedCard.targetMode === 'two') {
      if (!firstTargetId) {
        setFirstTargetId(targetPlayer.id);
      } else if (firstTargetId !== targetPlayer.id) {
        socket.emit('PLAY_CARD', {
          roomCode: roomState.roomCode,
          cardUid: selectedCard.uid,
          targetId: firstTargetId,
          secondTargetId: targetPlayer.id
        });
        setSelectedCard(null);
        setFirstTargetId('');
      }
      return;
    }

    if (selectedCard.targetMode === 'other' && targetPlayer.id === me.id) {
      setErrorMsg('This card must target another player.');
      return;
    }

    socket.emit('PLAY_CARD', {
      roomCode: roomState.roomCode,
      cardUid: selectedCard.uid,
      targetId: targetPlayer.id
    });
    setSelectedCard(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0c0a09', color: '#f5f5f4', fontFamily: 'system-ui, sans-serif', padding: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1c1917', padding: '14px 20px', borderRadius: 12, border: '1px solid #44403c', marginBottom: 16 }}>
        <div>
          <strong style={{ fontSize: 18, color: '#f43f5e' }}>🩸 Blood & Silver</strong>
          <span style={{ marginLeft: 14, background: '#292524', padding: '4px 10px', borderRadius: 6, fontWeight: 700, color: '#fbbf24' }}>
            ROOM CODE: {roomState.roomCode}
          </span>
        </div>
        <div>
          <span style={{ marginRight: 16 }}>
            Phase: <strong>{roomState.phase}</strong> (Day {roomState.day})
          </span>
          <span style={{ background: '#292524', padding: '6px 12px', borderRadius: 8 }}>
            Your Role: <strong style={{ color: me?.role === 'Vampire' ? '#f43f5e' : '#38bdf8' }}>{me?.role}</strong>
          </span>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: '#7f1d1d', padding: 12, borderRadius: 8, marginBottom: 14 }}>⚠️ {errorMsg}</div>
      )}

      {/* Lobby View */}
      {roomState.phase === 'LOBBY' && (
        <div style={{ background: '#1c1917', padding: 24, borderRadius: 12, border: '1px solid #44403c', marginBottom: 20 }}>
          <h2>Waiting for Players ({roomState.players.length}/8)...</h2>
          <p style={{ color: '#a8a29e' }}>Share Room Code <strong>{roomState.roomCode}</strong> with your friends!</p>
          <ul>
            {roomState.players.map((p) => (
              <li key={p.id} style={{ padding: '4px 0' }}>
                {p.name} {p.id === roomState.hostId ? '👑 (Host)' : ''}
              </li>
            ))}
          </ul>
          {isHost && (
            <button
              onClick={() => socket.emit('START_GAME', { roomCode: roomState.roomCode })}
              style={{ marginTop: 12, padding: '12px 24px', background: '#10b981', color: '#0c0a09', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
            >
              🚀 Start Game ({roomState.players.length} Players)
            </button>
          )}
        </div>
      )}

      {/* Commonwealth & Turn Controls */}
      {roomState.phase === 'DAY' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1c1917', padding: 16, borderRadius: 12, border: '1px solid #f59e0b', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: '#fbbf24' }}>COMMONWEALTH TREASURY</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{roomState.commonwealth} Gold Left</div>
          </div>

          {isMyTurn ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {[1, 2, 3, 4].map((amt) => (
                <button
                  key={amt}
                  disabled={me.tookGoldToday + amt > 4 || roomState.commonwealth < amt}
                  onClick={() => socket.emit('TAKE_GOLD', { roomCode: roomState.roomCode, amount: amt })}
                  style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#f59e0b', color: '#0c0a09', fontWeight: 700, cursor: 'pointer', opacity: me.tookGoldToday + amt > 4 ? 0.4 : 1 }}
                >
                  +{amt}G
                </button>
              ))}
              <button
                disabled={me.hand.length > 4}
                onClick={() => socket.emit('END_TURN', { roomCode: roomState.roomCode })}
                style={{ marginLeft: 12, padding: '10px 18px', borderRadius: 8, border: 'none', background: me.hand.length > 4 ? '#57534e' : '#10b981', color: '#0c0a09', fontWeight: 800, cursor: 'pointer' }}
              >
                {me.hand.length > 4 ? `Discard to 4 Cards (${me.hand.length}/4)` : 'End Turn →'}
              </button>
            </div>
          ) : (
            <div style={{ color: '#a8a29e' }}>
              Waiting for <strong>{roomState.players.find((p) => p.id === roomState.activePlayerId)?.name}</strong> to finish their turn...
            </div>
          )}
        </div>
      )}

      {/* Night Phase Bar */}
      {roomState.phase === 'NIGHT' && me?.alive && (
        <div style={{ background: '#1e1b4b', padding: 18, borderRadius: 12, border: '1px solid #6366f1', marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px' }}>🌙 Secret Night Phase (Night Damage: {2 + roomState.day} DMG)</h3>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: '#c7d2fe' }}>
            Step 1: Choose your Night Utility (+1 Shield or +1 Card). Step 2: Click a player card below (Vampires must click the SAME victim to deal {2 + roomState.day} DMG).
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => setNightUtility('SHIELD')}
              style={{ padding: '8px 14px', borderRadius: 8, border: nightUtility === 'SHIELD' ? '2px solid #38bdf8' : '1px solid #475569', background: '#0f172a', color: '#fff', cursor: 'pointer' }}
            >
              🛡️ +1 Night Shield
            </button>
            <button
              onClick={() => setNightUtility('CARD')}
              style={{ padding: '8px 14px', borderRadius: 8, border: nightUtility === 'CARD' ? '2px solid #38bdf8' : '1px solid #475569', background: '#0f172a', color: '#fff', cursor: 'pointer' }}
            >
              🃏 Draw +1 Card
            </button>
            <button
              disabled={!nightTargetId || me.nightSubmitted}
              onClick={() => socket.emit('SUBMIT_NIGHT', { roomCode: roomState.roomCode, utilityChoice: nightUtility, targetId: nightTargetId })}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: me.nightSubmitted ? '#475569' : '#e11d48', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
            >
              {me.nightSubmitted ? '✓ Night Action Locked' : 'Confirm Night Action'}
            </button>
          </div>
        </div>
      )}

      {/* Players Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 20 }}>
        {roomState.players.map((p) => {
          const isTurn = roomState.phase === 'DAY' && roomState.activePlayerId === p.id;
          const isNightTarget = roomState.phase === 'NIGHT' && nightTargetId === p.id;
          const orderIdx = roomState.turnOrder.indexOf(p.id);

          return (
            <div
              key={p.id}
              onClick={() => handlePlayerClick(p)}
              style={{
                background: '#1c1917',
                border: isTurn ? '2px solid #10b981' : isNightTarget ? '2px solid #f43f5e' : '1px solid #44403c',
                borderRadius: 12,
                padding: 14,
                opacity: p.alive ? 1 : 0.45,
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <strong>
                  {p.name} {p.id === socket.id ? '(You)' : ''}
                </strong>
                {orderIdx !== -1 && (
                  <span style={{ fontSize: 12, background: '#292524', padding: '2px 6px', borderRadius: 4 }}>
                    Turn #{orderIdx + 1}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: '#a8a29e', marginBottom: 6 }}>Role: {p.role}</div>
              <div style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                <span>❤️ {p.hp}/10</span>
                <span>🛡️ {p.shield}</span>
                <span>🪙 {p.gold}G (Took {p.tookGoldToday}/4)</span>
                <span>🃏 {p.handCount}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* My Secret Hand */}
      {me && (
        <div style={{ background: '#1c1917', padding: 16, borderRadius: 12, border: '1px solid #44403c', marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>
            🃏 Your Secret Hand ({me.hand.length}/4 max at End of Turn)
            {selectedCard && (
              <span style={{ marginLeft: 12, color: '#fbbf24', fontSize: 14 }}>
                👉 Click a player card above to use <strong>{selectedCard.name}</strong>!
              </span>
            )}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {me.hand.map((card) => (
              <div
                key={card.uid}
                style={{
                  background: '#292524',
                  border: selectedCard?.uid === card.uid ? '2px solid #fbbf24' : '1px solid #57534e',
                  borderRadius: 10,
                  padding: 12
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 6 }}>
                  <span>{card.name}</span>
                  <span style={{ color: '#fbbf24' }}>{card.cost}G</span>
                </div>
                <p style={{ fontSize: 12, color: '#d6d3d1', margin: '0 0 10px' }}>{card.desc}</p>
                {isMyTurn && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      disabled={me.gold < card.cost}
                      onClick={() => {
                        setSelectedCard(card);
                        setFirstTargetId('');
                      }}
                      style={{ flex: 1, padding: '6px 8px', background: '#e11d48', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                    >
                      Play ({card.cost}G)
                    </button>
                    <button
                      disabled={me.gold < 1}
                      onClick={() => socket.emit('CYCLE_CARD', { roomCode: roomState.roomCode, cardUid: card.uid, freeDiscard: false })}
                      style={{ padding: '6px 8px', background: '#f59e0b', color: '#0c0a09', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                    >
                      Cycle (1G)
                    </button>
                    <button
                      onClick={() => socket.emit('CYCLE_CARD', { roomCode: roomState.roomCode, cardUid: card.uid, freeDiscard: true })}
                      style={{ padding: '6px 8px', background: '#44403c', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                    >
                      Drop
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Private Intel & Game Log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#1c1917', padding: 16, borderRadius: 12, border: '1px solid #44403c' }}>
          <h4 style={{ marginTop: 0, color: '#38bdf8' }}>🕵️ Your Private Intel</h4>
          {roomState.privateIntel.map((entry, idx) => (
            <div key={idx} style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px solid #292524' }}>
              {entry}
            </div>
          ))}
        </div>
        <div style={{ background: '#1c1917', padding: 16, borderRadius: 12, border: '1px solid #44403c' }}>
          <h4 style={{ marginTop: 0, color: '#fbbf24' }}>📜 Town Chronicle</h4>
          {roomState.logs.map((entry, idx) => (
            <div key={idx} style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px solid #292524' }}>
              {entry}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}