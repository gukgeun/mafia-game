/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update } from "firebase/database";
import { ROLES_INFO, isMafia, revealRole, generateCode, shuffleRoles, checkWin, resolveNight, resolveConfirm, recommendedRoles } from "./gameLogic";

const firebaseConfig = {
  apiKey: "AIzaSyDvV_N8Ndp5jZFG56XNlxpypOktRBIZpOc",
  authDomain: "mafia-game-c33f2.firebaseapp.com",
  projectId: "mafia-game-c33f2",
  storageBucket: "mafia-game-c33f2.firebasestorage.app",
  messagingSenderId: "213712225109",
  appId: "1:213712225109:web:bac12a98ff124db61f65dc",
  databaseURL: "https://mafia-game-c33f2-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ── 디자인 토큰 ──
const T = {
  bg:       "#08080a",
  surface:  "#0f0f12",
  surface2: "#16161b",
  border:   "#1e1e26",
  border2:  "#2a2a36",
  red:      "#c0392b",
  redGlow:  "#e74c3c",
  gold:     "#c9a84c",
  goldDim:  "#7a6530",
  blue:     "#2980b9",
  green:    "#27ae60",
  purple:   "#8e44ad",
  yellow:   "#d4ac0d",
  text:     "#e8e8f0",
  textDim:  "#7a7a8a",
  textMute: "#3a3a4a",
};

// ── 공통 컴포넌트 ──
const Btn = ({ children, onClick, color, disabled, style = {}, outline = false }) => {
  const c = color || T.red;
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "14px 20px",
      background: disabled ? T.surface2 : outline ? "transparent" : c,
      color: disabled ? T.textMute : outline ? c : "#fff",
      border: disabled ? `1px solid ${T.border}` : outline ? `1px solid ${c}` : "none",
      borderRadius: 8, fontSize: 14, fontWeight: 700, letterSpacing: "0.5px",
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "'Noto Sans KR', sans-serif", marginBottom: 8,
      boxShadow: disabled || outline ? "none" : `0 0 20px ${c}44`,
      transition: "all 0.2s", ...style,
    }}>{children}</button>
  );
};

const Card = ({ children, style = {}, accent }) => (
  <div style={{
    background: T.surface, borderRadius: 12, padding: "16px 18px", marginBottom: 12,
    width: "100%", maxWidth: 460, boxSizing: "border-box",
    border: accent ? `1px solid ${accent}` : `1px solid ${T.border}`,
    borderLeft: accent ? `3px solid ${accent}` : `1px solid ${T.border}`,
    ...style,
  }}>
    {children}
  </div>
);

const Label = ({ children, color }) => (
  <p style={{ color: color || T.textMute, fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>
    {children}
  </p>
);

const Divider = () => <div style={{ height: 1, background: T.border, margin: "12px 0" }} />;

const PageWrap = ({ children, night = false, wide = false }) => (
  <div style={{
    minHeight: "100vh",
    background: night
      ? `linear-gradient(160deg, #04040c 0%, #080810 50%, ${T.bg} 100%)`
      : `linear-gradient(160deg, #0c0404 0%, #0a0808 50%, ${T.bg} 100%)`,
    color: T.text, fontFamily: "'Noto Sans KR', sans-serif",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "24px 16px 48px", transition: "background 1.2s ease",
  }}>
    <div style={{ width: "100%", maxWidth: wide ? 680 : 440 }}>{children}</div>
  </div>
);

// 페이즈 배지
const PhaseBadge = ({ phase, round }) => {
  const cfg = phase === "night"
    ? { label: `밤 ${round}라운드`, color: "#4a6fa5", bg: "#05081a", icon: "🌙" }
    : phase === "vote"
    ? { label: `투표 ${round}라운드`, color: T.red, bg: "#110000", icon: "⚖️" }
    : phase === "confirm"
    ? { label: `처형 확인 ${round}라운드`, color: "#e67e22", bg: "#110800", icon: "🔨" }
    : { label: `낮 ${round}라운드`, color: T.gold, bg: "#100d00", icon: "☀️" };
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: cfg.bg, border: `1px solid ${cfg.color}33`, borderRadius: 20, padding: "5px 14px" }}>
      <span style={{ fontSize: 12 }}>{cfg.icon}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color, letterSpacing: 1 }}>{cfg.label}</span>
    </div>
  );
};

// 플레이어 태그
const PlayerTag = ({ name, isMe, isDead, isHost, extra, onClick, selected, dimmed }) => (
  <div onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 10,
    padding: "11px 14px", borderRadius: 8, marginBottom: 6,
    background: selected ? "#1a0800" : isDead ? "transparent" : T.surface2,
    border: `1px solid ${selected ? T.red : isDead ? T.textMute + "22" : T.border2}`,
    cursor: onClick ? "pointer" : "default",
    opacity: dimmed ? 0.4 : 1,
    transition: "all 0.15s",
  }}>
    <div style={{
      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
      background: isDead ? T.textMute + "22" : isMe ? T.red + "33" : T.surface,
      border: `1px solid ${isDead ? T.textMute + "33" : isMe ? T.red + "66" : T.border}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 14,
    }}>
      {isDead ? "💀" : isHost ? "👑" : "👤"}
    </div>
    <span style={{ flex: 1, fontSize: 14, fontWeight: isMe ? 700 : 400, color: isDead ? T.textMute : T.text, textDecoration: isDead ? "line-through" : "none" }}>
      {name}{isMe ? " (나)" : ""}
    </span>
    {extra}
  </div>
);

// ── 타이틀 ──
function TitleScreen({ onHost, onJoin }) {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundImage: "url(/title-bg.png)",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
      fontFamily: "'Noto Sans KR', sans-serif", padding: "40px 20px",
      position: "relative", overflow: "hidden",
    }}>
      {/* 하단 그라데이션 오버레이 (버튼 가독성용) */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%", background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)", pointerEvents: "none" }} />

      {/* 버튼 */}
      <div style={{ width: "100%", maxWidth: 340, position: "relative", zIndex: 1 }}>
        <Btn onClick={onHost} color={T.red} style={{ marginBottom: 12, padding: "16px", fontSize: 15, letterSpacing: 1 }}>
          🎙️ 사회자로 방 만들기
        </Btn>
        <Btn onClick={onJoin} color={T.blue} outline style={{ padding: "16px", fontSize: 15, letterSpacing: 1 }}>
          🚪 플레이어로 참가하기
        </Btn>
      </div>
    </div>
  );
}

// ── 방 만들기 (사회자) ──
function HostScreen({ onCreated }) {
  const [playerCount, setPlayerCount] = useState(8);
  const [roles, setRoles] = useState(recommendedRoles(8));

  // 인원수를 바꾸면 그 인원수에 맞는 추천 구성으로 자동 재조정한다.
  useEffect(() => {
    setRoles(recommendedRoles(playerCount));
  }, [playerCount]);

  const specialTotal = Object.values(roles).reduce((a, b) => a + b, 0);
  const citizenCount = playerCount - specialTotal;
  const isValid = citizenCount >= 0 && playerCount >= 4;

  const adjust = (role, delta) => {
    setRoles(prev => {
      const next = { ...prev, [role]: Math.max(0, prev[role] + delta) };
      if (Object.values(next).reduce((a, b) => a + b, 0) > playerCount) return prev;
      return next;
    });
  };

  const create = async () => {
    if (!isValid) return;
    const code = generateCode();
    const roleList = shuffleRoles(playerCount, roles, citizenCount);
    const hostId = "host_" + Date.now();
    await set(ref(db, `rooms/${code}`), {
      code, hostId, status: "waiting", playerCount, roleList, phase: "day", round: 1,
      players: {},
    });
    onCreated(code, hostId);
  };

  const roleRows = [
    { id: "mafia", label: "마피아", emoji: "🔫", color: T.red },
    { id: "mafiaBoss", label: "마피아 보스", emoji: "👑", color: T.red },
    { id: "police", label: "경찰", emoji: "🚔", color: T.blue },
    { id: "doctor", label: "의사", emoji: "⚕️", color: T.green },
    { id: "reporter", label: "기자", emoji: "📰", color: T.yellow },
    { id: "lawyer", label: "변호사", emoji: "⚖️", color: T.purple },
    { id: "terrorist", label: "테러리스트", emoji: "🧨", color: "#e67e22" },
    { id: "priest", label: "성직자", emoji: "✝️", color: "#ecf0f1" },
    { id: "jester", label: "광대", emoji: "🤡", color: "#e84393" },
    { id: "framer", label: "모함가", emoji: "🎭", color: T.red },
    { id: "bomber", label: "폭탄마", emoji: "💣", color: T.red },
  ];

  return (
    <PageWrap>
      <div style={{ marginBottom: 28 }}>
        <Label color={T.gold}>사회자 모드</Label>
        <h2 style={{ fontSize: 24, fontWeight: 900, margin: "4px 0 4px", color: T.text }}>게임 설정</h2>
        <p style={{ color: T.textMute, fontSize: 12 }}>사회자는 게임에 참여하지 않고 진행만 합니다</p>
      </div>

      <Card>
        <Label>플레이어 수</Label>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
          <button type="button" onClick={() => setPlayerCount(p => Math.max(4, p - 1))} style={{ width: 40, height: 40, background: T.surface2, color: T.text, border: `1px solid ${T.border2}`, borderRadius: 8, fontSize: 20, cursor: "pointer" }}>−</button>
          <span style={{ flex: 1, textAlign: "center", fontSize: 36, fontWeight: 900, color: T.text }}>{playerCount}</span>
          <button type="button" onClick={() => setPlayerCount(p => Math.min(32, p + 1))} style={{ width: 40, height: 40, background: T.surface2, color: T.text, border: `1px solid ${T.border2}`, borderRadius: 8, fontSize: 20, cursor: "pointer" }}>+</button>
        </div>
        <p style={{ color: T.textMute, fontSize: 11, marginTop: 8 }}>인원수를 바꾸면 아래 역할 구성이 추천 밸런스로 자동 조정돼요</p>
      </Card>

      <Card>
        <Label>역할 구성</Label>
        <div style={{ marginTop: 4 }}>
          {roleRows.map((r, i) => (
            <div key={r.id}>
              <div style={{ display: "flex", alignItems: "center", padding: "10px 0" }}>
                <span style={{ fontSize: 18, width: 28 }}>{r.emoji}</span>
                <span style={{ flex: 1, fontSize: 14, color: T.text }}>{r.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 0, background: T.surface2, borderRadius: 8, border: `1px solid ${T.border2}` }}>
                  <button type="button" onClick={() => adjust(r.id, -1)} style={{ width: 34, height: 34, background: "none", color: T.textDim, border: "none", fontSize: 16, cursor: "pointer" }}>−</button>
                  <span style={{ width: 26, textAlign: "center", fontWeight: 700, fontSize: 15, color: roles[r.id] > 0 ? r.color : T.textMute }}>{roles[r.id]}</span>
                  <button type="button" onClick={() => adjust(r.id, +1)} style={{ width: 34, height: 34, background: "none", color: T.textDim, border: "none", fontSize: 16, cursor: "pointer" }}>+</button>
                </div>
              </div>
              {i < roleRows.length - 1 && <Divider />}
            </div>
          ))}
          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: T.textMute, fontSize: 12 }}>👤 시민 (자동)</span>
            <span style={{ fontWeight: 700, color: citizenCount < 0 ? T.red : T.green, fontSize: 14 }}>
              {citizenCount < 0 ? "⚠ 초과" : `${citizenCount}명`}
            </span>
          </div>
        </div>
      </Card>

      <Btn onClick={create} color={T.red} disabled={!isValid} style={{ marginTop: 4, padding: "16px", fontSize: 15, letterSpacing: 1 }}>
        방 생성하기
      </Btn>
    </PageWrap>
  );
}

// ── 방 참가 (플레이어) ──
function JoinScreen({ onJoined }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  const join = () => {
    if (!name.trim() || code.length < 4 || joining) return;
    setJoining(true);
    onValue(ref(db, `rooms/${code.toUpperCase()}`), async (snap) => {
      const room = snap.val();
      if (!room) { setError("방을 찾을 수 없어요!"); setJoining(false); return; }
      if (room.status !== "waiting") { setError("이미 시작된 게임이에요!"); setJoining(false); return; }
      const pid = String(Date.now());
      await update(ref(db, `rooms/${code.toUpperCase()}/players/${pid}`), { name: name.trim(), alive: true });
      onJoined(code.toUpperCase(), String(pid));
    }, { onlyOnce: true });
  };

  const inputStyle = { width: "100%", padding: "12px 14px", background: T.surface2, color: T.text, border: `1px solid ${T.border2}`, borderRadius: 8, fontSize: 15, fontFamily: "'Noto Sans KR', sans-serif", boxSizing: "border-box", outline: "none" };

  return (
    <PageWrap>
      <div style={{ marginBottom: 28 }}>
        <Label color={T.blue}>플레이어</Label>
        <h2 style={{ fontSize: 24, fontWeight: 900, margin: "4px 0", color: T.text }}>방 참가</h2>
      </div>

      <Card>
        <Label>닉네임</Label>
        <input style={inputStyle} placeholder="이름을 입력하세요" value={name} onChange={e => setName(e.target.value)} />
      </Card>

      <Card>
        <Label>방 코드</Label>
        <input style={{ ...inputStyle, fontSize: 28, textAlign: "center", letterSpacing: 10, textTransform: "uppercase", fontWeight: 900, color: T.gold }}
          placeholder="ABCD" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={4} />
        {error && <p style={{ color: T.red, fontSize: 12, marginTop: 8 }}>⚠ {error}</p>}
      </Card>

      <Btn onClick={join} color={T.blue} disabled={!name.trim() || code.length < 4 || joining} style={{ padding: "16px", fontSize: 15, letterSpacing: 1 }}>
        {joining ? "입장 중..." : "입장하기"}
      </Btn>
    </PageWrap>
  );
}

// ── 대기실 (사회자) ──
function HostLobbyScreen({ code, onStart }) {
  const [room, setRoom] = useState(null);
  useEffect(() => onValue(ref(db, `rooms/${code}`), snap => setRoom(snap.val())), [code]);

  if (!room) return <PageWrap><p style={{ color: "#555" }}>로딩 중...</p></PageWrap>;

  const players = Object.values(room.players || {});
  const isFull = players.length >= room.playerCount;

  const startGame = async () => {
    // 입장한 순서대로 역할 배분
    const entries = Object.entries(room.players || {});
    const updates = {};
    entries.forEach(([pid], idx) => {
      updates[`rooms/${code}/players/${pid}/role`] = room.roleList[idx] || "citizen";
    });
    updates[`rooms/${code}/status`] = "playing";
    await update(ref(db), updates);
    onStart();
  };

  return (
    <PageWrap>
      <p style={{ color: "#8B0000", fontSize: 12, fontWeight: 700, marginBottom: 4, letterSpacing: 2 }}>🎙️ 사회자</p>
      <p style={{ color: "#666", fontSize: 12, marginBottom: 6 }}>방 코드</p>
      <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: 10, color: "#fff", marginBottom: 4, textShadow: "0 0 20px #8B000088" }}>{code}</div>
      <p style={{ color: "#555", fontSize: 12, marginBottom: 28 }}>플레이어들에게 코드를 알려주세요</p>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ color: "#666", fontSize: 12 }}>참가자</span>
          <span style={{ color: isFull ? "#2ecc71" : "#f1c40f", fontSize: 12, fontWeight: 700 }}>{players.length} / {room.playerCount}명</span>
        </div>
        {players.length === 0 && <p style={{ color: "#333", fontSize: 13, textAlign: "center", padding: "12px 0" }}>아직 참가자가 없어요...</p>}
        {players.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: i < players.length - 1 ? "1px solid #1a1a1a" : "none" }}>
            <span style={{ marginRight: 10 }}>👤</span>
            <span style={{ fontSize: 14 }}>{p.name}</span>
          </div>
        ))}
      </Card>

      <Btn onClick={startGame} color={isFull ? "#8B0000" : "#333"} disabled={!isFull}>
        {isFull ? "🎮 게임 시작!" : `${room.playerCount - players.length}명 더 필요해요`}
      </Btn>
    </PageWrap>
  );
}

// ── 대기실 (플레이어) ──
function PlayerLobbyScreen({ code, playerId, onStart }) {
  const [room, setRoom] = useState(null);
  useEffect(() => onValue(ref(db, `rooms/${code}`), snap => setRoom(snap.val())), [code]);
  useEffect(() => { if (room?.status === "playing") onStart(); }, [room?.status, onStart]); // eslint-disable-line

  if (!room) return <PageWrap><p style={{ color: "#555" }}>로딩 중...</p></PageWrap>;

  const players = Object.values(room.players || {});

  return (
    <PageWrap>
      <p style={{ color: "#666", fontSize: 12, marginBottom: 6 }}>방 코드</p>
      <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: 10, marginBottom: 28, textShadow: "0 0 20px #8B000088" }}>{code}</div>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ color: "#666", fontSize: 12 }}>참가자</span>
          <span style={{ color: "#f1c40f", fontSize: 12, fontWeight: 700 }}>{players.length} / {room.playerCount}명</span>
        </div>
        {players.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: i < players.length - 1 ? "1px solid #1a1a1a" : "none" }}>
            <span style={{ marginRight: 10 }}>👤</span>
            <span style={{ flex: 1, fontSize: 14 }}>{p.name}</span>
            {room.players && Object.keys(room.players)[i] === playerId && <span style={{ color: "#8B0000", fontSize: 11 }}>나</span>}
          </div>
        ))}
      </Card>
      <p style={{ color: "#555", fontSize: 13, textAlign: "center" }}>사회자가 시작할 때까지 기다려주세요...</p>
    </PageWrap>
  );
}

// ── 역할 확인 (플레이어) ──
function RoleRevealScreen({ code, playerId, onReady }) {
  const [revealed, setRevealed] = useState(false);
  const [role, setRole] = useState(null);

  useEffect(() => {
    onValue(ref(db, `rooms/${code}/players/${playerId}`), snap => {
      const p = snap.val();
      if (p?.role) setRole(p.role);
    }, { onlyOnce: true });
  }, [code, playerId]); // eslint-disable-line

  const ri = role ? ROLES_INFO[role] : null;

  const confirm = async () => {
    await update(ref(db, `rooms/${code}/players/${playerId}`), { ready: true });
    onReady(role);
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Noto Sans KR', sans-serif", padding: "32px 20px" }}>
      <Label color={T.textMute}>역할 배정</Label>
      <p style={{ color: T.textMute, fontSize: 13, marginBottom: 40, textAlign: "center" }}>혼자만 확인하세요</p>

      {!revealed ? (
        <div onClick={() => setRevealed(true)} style={{
          width: 180, height: 260, margin: "0 auto 36px",
          background: T.surface,
          border: `1px solid ${T.border2}`,
          borderRadius: 16,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          boxShadow: `0 0 60px ${T.red}22`,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", inset: 0, background: `repeating-linear-gradient(45deg, ${T.surface2} 0px, ${T.surface2} 1px, transparent 1px, transparent 8px)`, opacity: 0.5 }} />
          <span style={{ fontSize: 48, position: "relative" }}>🃏</span>
          <p style={{ color: T.textMute, fontSize: 11, marginTop: 16, letterSpacing: 3, position: "relative" }}>탭해서 확인</p>
        </div>
      ) : ri ? (
        <div style={{
          width: 220, margin: "0 auto 24px",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          {ri.image ? (
            <img src={ri.image} alt={ri.name} style={{
              width: 220, height: 220, borderRadius: "50%", objectFit: "cover",
              border: `3px solid ${ri.border}`,
              boxShadow: `0 0 50px ${ri.color}55`,
            }} />
          ) : (
            <div style={{
              width: 220, height: 220, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 96, background: ri.bg,
              border: `3px solid ${ri.border}`,
              boxShadow: `0 0 50px ${ri.color}55`,
            }}>{ri.emoji}</div>
          )}
          <h3 style={{ color: ri.color, fontSize: 22, fontWeight: 900, margin: "16px 0 8px", textShadow: `0 0 20px ${ri.color}` }}>{ri.name}</h3>
          <p style={{ color: T.textDim, fontSize: 12, textAlign: "center", lineHeight: 1.7, maxWidth: 260 }}>{ri.desc}</p>
          <div style={{ marginTop: 12, padding: "3px 14px", borderRadius: 20, background: ri.team === "mafia" ? "#2a000066" : ri.team === "jester" ? "#2a001a66" : "#00200066", border: `1px solid ${ri.team === "mafia" ? T.red + "44" : ri.team === "jester" ? "#e8439344" : T.green + "44"}` }}>
            <span style={{ fontSize: 10, color: ri.team === "mafia" ? T.red : ri.team === "jester" ? "#e84393" : T.green, letterSpacing: 2, fontWeight: 700 }}>
              {ri.team === "mafia" ? "MAFIA" : ri.team === "jester" ? "SOLO" : "CITIZEN"}
            </span>
          </div>
        </div>
      ) : <p style={{ color: T.textMute }}>역할 불러오는 중...</p>}

      {revealed && ri && (
        <div style={{ width: "100%", maxWidth: 300 }}>
          <Btn onClick={confirm} color={T.green} style={{ padding: "14px", fontSize: 14, letterSpacing: 1 }}>
            확인했습니다
          </Btn>
        </div>
      )}
    </div>
  );
}

// ── 사회자 게임 화면 ──
function HostGameScreen({ code, onEnd }) {
  const [room, setRoom] = useState(null);

  useEffect(() => onValue(ref(db, `rooms/${code}`), snap => setRoom(snap.val())), [code]);

  if (!room) return <PageWrap wide><p style={{ color: "#555" }}>로딩 중...</p></PageWrap>;

  const playersMap = room.players || {};
  const playerEntries = Object.entries(playersMap);
  const alivePlayers = playerEntries.filter(([, p]) => p.alive);
  const deadPlayers = playerEntries.filter(([, p]) => !p.alive);
  const phase = room.phase || "day";
  const round = room.round || 1;
  const isNight = phase === "night";
  const isConfirm = phase === "confirm";
  const confirmTarget = room.confirmTarget || null;
  const confirmVotes = room.confirmVotes || {};
  const votes = room.votes || {};
  const nightActions = room.nightActions || {};

  // 마피아 투표 현황
  const aliveMafiaEntries = playerEntries.filter(([, p]) => isMafia(p.role) && p.alive);
  const mafiaVoteCounts = {};
  aliveMafiaEntries.forEach(([, p]) => {
    if (p.mafiaVote) mafiaVoteCounts[p.mafiaVote] = (mafiaVoteCounts[p.mafiaVote] || 0) + 1;
  });
  const topMafiaTargetArr = Object.entries(mafiaVoteCounts).sort((a, b) => b[1] - a[1]);
  const topMafiaTarget = topMafiaTargetArr[0]?.[0] || null;

  // 투표 집계
  const voteCounts = {};
  Object.values(votes).forEach(v => { if (v) voteCounts[v] = (voteCounts[v] || 0) + 1; });

  const processNight = async () => {
    const mafiaTarget = topMafiaTarget || null;
    const { updates: resolved, logEntries, killed, revivedIds } = resolveNight({ playersMap, nightActions, round, mafiaTarget });

    const updates = {};
    Object.entries(resolved).forEach(([k, v]) => { updates[`rooms/${code}/${k}`] = v; });

    // 로그 저장
    const logKey = `r${String(round).padStart(3, "0")}_b_밤${round}`;
    updates[`rooms/${code}/logs/${logKey}`] = { phase: `밤 ${round}라운드`, entries: logEntries, order: round * 10 + 1 };

    // 마피아 개인 투표 초기화
    aliveMafiaEntries.forEach(([id]) => {
      updates[`rooms/${code}/players/${id}/mafiaVote`] = null;
    });
    updates[`rooms/${code}/lastDeath`] = killed
      ? { round, playerId: killed, playerName: playersMap[killed]?.name, role: playersMap[killed]?.role }
      : { round, playerId: null };
    updates[`rooms/${code}/phase`] = "day";
    updates[`rooms/${code}/round`] = round + 1;
    updates[`rooms/${code}/nightActions`] = null;

    const updatedPlayers = { ...playersMap };
    if (killed) updatedPlayers[killed] = { ...updatedPlayers[killed], alive: false };
    revivedIds.forEach(id => { updatedPlayers[id] = { ...updatedPlayers[id], alive: true }; });
    const win = checkWin(updatedPlayers);
    if (win) { updates[`rooms/${code}/winner`] = win; onEnd(win); }

    await update(ref(db), updates);
  };

  const processVote = async () => {
    const updates = {};
    const logEntries = [];

    if (room.lawyerBlock) {
      logEntries.push(`⚖️ 변호사가 이의를 제기해 처형이 취소됐습니다`);
      updates[`rooms/${code}/logs/r${String(round).padStart(3, "0")}_a_낮${round}`] = { phase: `낮 ${round}라운드`, entries: logEntries, order: round * 10 };
      await update(ref(db), { ...updates, [`rooms/${code}/phase`]: "night", [`rooms/${code}/votes`]: null, [`rooms/${code}/lawyerBlock`]: null, [`rooms/${code}/lastExecution`]: { round, playerId: null, blocked: true } });
      return;
    }

    let maxVotes = 0, executed = null;
    Object.entries(voteCounts).forEach(([id, cnt]) => { if (cnt > maxVotes) { maxVotes = cnt; executed = id; } });
    const topCount = Object.values(voteCounts).filter(c => c === maxVotes).length;
    if (topCount > 1) executed = null;

    if (!executed) {
      // 동률 - 바로 무효 처리
      const logE = [`🗳️ 동률로 처형이 무효가 됐습니다`];
      await update(ref(db), {
        [`rooms/${code}/lastExecution`]: { round, playerId: null },
        [`rooms/${code}/logs/r${String(round).padStart(3, "0")}_a_낮${round}`]: { phase: `낮 ${round}라운드`, entries: logE, order: round * 10 },
        [`rooms/${code}/phase`]: "night",
        [`rooms/${code}/votes`]: null,
        [`rooms/${code}/lawyerBlock`]: null,
      });
      return;
    }

    // 처형 대상 확정 → 확인 투표 단계로
    await update(ref(db, `rooms/${code}`), {
      phase: "confirm",
      confirmTarget: executed,
      confirmVotes: {},
    });
  };

  // 처형 확인 투표 처리 (방장이 호출)
  const processConfirm = async () => {
    const confirmVotes = room.confirmVotes || {};
    const executed = room.confirmTarget;
    const yesCount = Object.values(confirmVotes).filter(v => v === "yes").length;
    const noCount = Object.values(confirmVotes).filter(v => v === "no").length;
    const aliveCnt = Object.values(playersMap).filter(p => p.alive).length;
    const majority = Math.floor(aliveCnt / 2) + 1;

    const { updates: resolved, logEntries, bombTarget, jesterWin } = resolveConfirm({ playersMap, executed, yesCount, noCount, majority, round, confirmVotes });

    const updates = {};
    Object.entries(resolved).forEach(([k, v]) => { updates[`rooms/${code}/${k}`] = v; });
    updates[`rooms/${code}/logs/r${String(round).padStart(3, "0")}_a_낮${round}`] = { phase: `낮 ${round}라운드`, entries: logEntries, order: round * 10 };
    updates[`rooms/${code}/phase`] = "night";
    updates[`rooms/${code}/votes`] = null;
    updates[`rooms/${code}/confirmVotes`] = null;
    updates[`rooms/${code}/confirmTarget`] = null;
    updates[`rooms/${code}/lawyerBlock`] = null;

    if (jesterWin) {
      updates[`rooms/${code}/winner`] = "jester";
      await update(ref(db), updates);
      onEnd("jester");
      return;
    }

    const updatedPlayers = { ...playersMap };
    if (yesCount >= majority && executed) updatedPlayers[executed] = { ...updatedPlayers[executed], alive: false };
    if (bombTarget) updatedPlayers[bombTarget] = { ...updatedPlayers[bombTarget], alive: false };
    const win = checkWin(updatedPlayers);
    if (win) { updates[`rooms/${code}/winner`] = win; onEnd(win); }

    await update(ref(db), updates);
  };

  const killPlayer = async (pid) => {
    await update(ref(db, `rooms/${code}/players/${pid}`), { alive: false });
    const updatedPlayers = { ...playersMap, [pid]: { ...playersMap[pid], alive: false } };
    const win = checkWin(updatedPlayers);
    if (win) { await update(ref(db, `rooms/${code}`), { winner: win }); onEnd(win); }
  };

  const revivePlayer = async (pid) => {
    await update(ref(db, `rooms/${code}/players/${pid}`), { alive: true });
  };

  return (
    <PageWrap night={isNight} wide>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <PhaseBadge phase={phase} round={round} />
          <span style={{ color: T.red, fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>🎙️ 사회자</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {phase === "day" && (
            <>
              <button type="button" onClick={() => update(ref(db, `rooms/${code}`), { phase: "vote" })}
                style={{ padding: "8px 16px", background: T.red, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans KR', sans-serif", letterSpacing: 1 }}>
                투표 시작
              </button>
              <button type="button" onClick={() => update(ref(db, `rooms/${code}`), { phase: "night" })}
                style={{ padding: "8px 16px", background: T.blue, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans KR', sans-serif", letterSpacing: 1 }}>
                밤으로
              </button>
            </>
          )}
          {isNight && (
            <button type="button" onClick={processNight}
              style={{ padding: "8px 16px", background: T.green, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans KR', sans-serif", letterSpacing: 1 }}>
              밤 종료
            </button>
          )}
          {phase === "vote" && (
            <button type="button" onClick={processVote}
              style={{ padding: "8px 16px", background: T.red, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans KR', sans-serif", letterSpacing: 1 }}>
              {room.lawyerBlock ? "처형 취소" : "투표 종료"}
            </button>
          )}
          {phase === "confirm" && (
            <button type="button" onClick={processConfirm}
              style={{ padding: "8px 16px", background: T.red, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans KR', sans-serif", letterSpacing: 1 }}>
              처형 확정
            </button>
          )}
        </div>
      </div>

      {/* 전체 플레이어 현황 - 사회자는 역할 다 보임 */}
      <Card style={{ maxWidth: "100%" }}>
        <p style={{ color: "#666", fontSize: 11, marginBottom: 14 }}>전체 플레이어 현황 (사회자만 보임)</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
          {playerEntries.map(([pid, p]) => {
            const ri = p.role ? ROLES_INFO[p.role] : null;
            const playerVote = votes[pid] ? playersMap[votes[pid]]?.name : null;
            const voteReceivedCount = voteCount => Object.values(votes).filter(v => v === pid).length;
            const receivedVotes = Object.values(votes).filter(v => v === pid).length;

            return (
              <div key={pid} style={{
                background: !p.alive ? "#0a0a0a" : "#1a1a1a",
                border: `1px solid ${!p.alive ? "#1a1a1a" : ri ? ri.border : "#333"}`,
                borderRadius: 12, padding: "12px 14px",
                opacity: p.alive ? 1 : 0.5,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: p.alive ? "#fff" : "#444", textDecoration: p.alive ? "none" : "line-through" }}>
                    {p.name}
                  </span>
                  {!p.alive
                    ? <span style={{ fontSize: 10, color: "#333" }}>💀</span>
                    : <span style={{ fontSize: 11, color: ri?.color, background: ri?.bg, border: `1px solid ${ri?.border}`, borderRadius: 10, padding: "2px 8px" }}>
                        {ri?.emoji} {ri?.name}
                      </span>
                  }
                </div>

                {/* 마피아 투표 현황 */}
                {isNight && p.alive && isMafia(p.role) && (
                  <p style={{ fontSize: 11, color: "#e74c3c", marginTop: 4 }}>
                    🔫 {p.mafiaVote ? `→ ${playersMap[p.mafiaVote]?.name}` : "미선택"}
                  </p>
                )}
                {/* 특수역할 행동 (직업당 여러 명이어도 개인별로 표시) */}
                {isNight && p.alive && p.role === "doctor" && (
                  <p style={{ fontSize: 11, color: "#2ecc71", marginTop: 4 }}>⚕️ {nightActions.doctor?.[pid] ? `→ ${playersMap[nightActions.doctor[pid]]?.name}` : "미선택"}</p>
                )}
                {isNight && p.alive && p.role === "police" && (
                  <p style={{ fontSize: 11, color: "#3498db", marginTop: 4 }}>🚔 {nightActions.police?.[pid] ? `→ ${playersMap[nightActions.police[pid]]?.name}` : "미선택"}</p>
                )}
                {isNight && p.alive && p.role === "reporter" && (
                  <p style={{ fontSize: 11, color: "#f1c40f", marginTop: 4 }}>📰 {nightActions.reporter?.[pid] ? `→ ${playersMap[nightActions.reporter[pid]]?.name}` : p.reporterUsed ? "사용 완료" : "미선택"}</p>
                )}
                {isNight && p.alive && p.role === "priest" && (
                  <p style={{ fontSize: 11, color: "#ecf0f1", marginTop: 4 }}>✝️ {nightActions.priest?.[pid] ? `→ ${playersMap[nightActions.priest[pid]]?.name}` : p.priestUsed ? "사용 완료" : "미선택"}</p>
                )}
                {isNight && p.alive && p.role === "framer" && (
                  <p style={{ fontSize: 11, color: "#c0392b", marginTop: 4 }}>🎭 {nightActions.framer?.[pid] ? `→ ${playersMap[nightActions.framer[pid]]?.name}` : "미선택"}</p>
                )}
                {p.alive && p.role === "terrorist" && (
                  <p style={{ fontSize: 11, color: "#e67e22", marginTop: 4 }}>🧨 {p.terroristTarget ? `→ ${playersMap[p.terroristTarget]?.name}` : "미선택"}</p>
                )}
                {/* 투표 현황 */}
                {phase === "vote" && p.alive && (
                  <p style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                    🗳️ {playerVote ? `→ ${playerVote}` : "미투표"}
                    {receivedVotes > 0 && <span style={{ color: "#e74c3c", marginLeft: 6 }}>({receivedVotes}표 받음)</span>}
                  </p>
                )}

                {/* 사회자 수동 조작 */}
                {p.alive
                  ? <button type="button" onClick={() => killPlayer(pid)} style={{ marginTop: 8, width: "100%", padding: "5px", background: "#1a0000", color: "#e74c3c", border: "1px solid #3a0000", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "'Noto Sans KR', sans-serif" }}>
                      💀 사망 처리
                    </button>
                  : <button type="button" onClick={() => revivePlayer(pid)} style={{ marginTop: 8, width: "100%", padding: "5px", background: "#001a00", color: "#2ecc71", border: "1px solid #1a5c2a", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "'Noto Sans KR', sans-serif" }}>
                      ✨ 부활 처리
                    </button>
                }
              </div>
            );
          })}
        </div>
      </Card>

      {/* 밤 행동 요약 */}
      {isNight && (
        <div style={{ background: T.surface, border: `1px solid ${T.blue}33`, borderRadius: 10, padding: "14px 16px", marginBottom: 12, maxWidth: "100%", boxSizing: "border-box" }}>
          <Label color={T.blue}>밤 행동 요약</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8 }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <p style={{ color: T.textMute, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>🔫 마피아 타겟</p>
              <p style={{ fontSize: 14, fontWeight: 700 }}>
                {topMafiaTarget ? playersMap[topMafiaTarget]?.name + " (최다득표)" : "투표 중..."}
              </p>
              <p style={{ fontSize: 10, color: T.textMute, marginTop: 2 }}>
                {aliveMafiaEntries.filter(([, p]) => p.mafiaVote).length}/{aliveMafiaEntries.length}명 투표
              </p>
            </div>
            {(() => {
              const aliveByRole = (role) => playerEntries.filter(([, p]) => p.role === role && p.alive);
              const doctors = aliveByRole("doctor");
              const polices = aliveByRole("police");
              const reporters = aliveByRole("reporter").filter(([, p]) => !p.reporterUsed);
              const priests = aliveByRole("priest").filter(([, p]) => !p.priestUsed);
              const framers = aliveByRole("framer");
              const doneCount = (actions, entries) => entries.filter(([id]) => !!actions?.[id]).length;
              return (
                <>
                  {doctors.length > 0 && (
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <p style={{ color: T.textMute, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>⚕️ 의사</p>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>{doneCount(nightActions.doctor, doctors)}/{doctors.length}명 선택 완료</p>
                    </div>
                  )}
                  {polices.length > 0 && (
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <p style={{ color: T.textMute, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>🚔 경찰</p>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>{doneCount(nightActions.police, polices)}/{polices.length}명 선택 완료</p>
                    </div>
                  )}
                  {reporters.length > 0 && (
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <p style={{ color: T.textMute, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>📰 기자</p>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>{doneCount(nightActions.reporter, reporters)}/{reporters.length}명 선택 완료</p>
                    </div>
                  )}
                  {priests.length > 0 && (
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <p style={{ color: T.textMute, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>✝️ 성직자</p>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>{doneCount(nightActions.priest, priests)}/{priests.length}명 선택 완료</p>
                    </div>
                  )}
                  {framers.length > 0 && (
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <p style={{ color: T.textMute, fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>🎭 모함가</p>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>{doneCount(nightActions.framer, framers)}/{framers.length}명 선택 완료</p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* 처형 확인 투표 현황 (사회자용) */}
      {phase === "confirm" && confirmTarget && (
        <div style={{ background: T.surface, border: `1px solid ${T.red}44`, borderLeft: `3px solid ${T.red}`, borderRadius: 10, padding: "14px 16px", marginBottom: 12, maxWidth: "100%", boxSizing: "border-box" }}>
          <p style={{ color: T.red, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>🔨 처형 확인 투표 중</p>
          <p style={{ color: T.text, fontSize: 15, marginBottom: 10 }}>
            대상: <strong style={{ color: T.red }}>{playersMap[confirmTarget]?.name}</strong>
          </p>
          <div style={{ display: "flex", gap: 20 }}>
            <p style={{ color: T.green, fontSize: 14 }}>✅ 찬성 {Object.values(room.confirmVotes || {}).filter(v => v === "yes").length}표</p>
            <p style={{ color: T.red, fontSize: 14 }}>❌ 반대 {Object.values(room.confirmVotes || {}).filter(v => v === "no").length}표</p>
            <p style={{ color: T.textMute, fontSize: 14 }}>미투표 {Object.values(playersMap).filter(p => p.alive).length - Object.keys(room.confirmVotes || {}).length}명</p>
          </div>
        </div>
      )}

      {/* 변호사 이의 */}
      {phase === "vote" && room.lawyerBlock && (
        <div style={{ background: T.surface, border: `1px solid ${T.purple}44`, borderLeft: `3px solid ${T.purple}`, borderRadius: 10, padding: "12px 16px", marginBottom: 12, maxWidth: "100%", boxSizing: "border-box" }}>
          <p style={{ color: T.purple, fontWeight: 700, fontSize: 13 }}>⚖️ 변호사가 이의를 제기했습니다! 처형이 취소됩니다.</p>
        </div>
      )}

      {/* 활동 로그 (사회자) */}
      {Object.keys(room.logs || {}).length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 12, maxWidth: "100%", boxSizing: "border-box" }}>
          <Label>활동 로그</Label>
          {Object.entries(room.logs || {}).sort(([, a], [, b]) => (b.order || 0) - (a.order || 0)).map(([key, log], idx) => (
            <div key={key} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: idx < Object.keys(room.logs).length - 1 ? `1px solid ${T.border}` : "none" }}>
              <p style={{ color: T.textMute, fontSize: 10, marginBottom: 6, letterSpacing: 3, fontWeight: 700 }}>{log.phase}</p>
              {(log.entries || []).map((entry, i) => (
                <p key={i} style={{ fontSize: 12, color: T.textDim, marginBottom: 3, paddingLeft: 8, borderLeft: `2px solid ${T.border2}` }}>{entry}</p>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* 사망자 */}
      {deadPlayers.length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 12, maxWidth: "100%", boxSizing: "border-box" }}>
          <Label>사망자</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {deadPlayers.map(([id, p]) => (
              <span key={id} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, color: T.textMute }}>
                {p.name} · {p.role ? ROLES_INFO[p.role]?.emoji + " " + ROLES_INFO[p.role]?.name : "?"}
              </span>
            ))}
          </div>
        </div>
      )}
    </PageWrap>
  );
}

// ── 플레이어 게임 화면 ──
function PlayerGameScreen({ code, playerId, myRole, onWin }) {
  const [room, setRoom] = useState(null);
  const [voteTarget, setVoteTarget] = useState(null);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [lawyerUsed, setLawyerUsed] = useState(false);
  const [showNightOverlay, setShowNightOverlay] = useState(false);
  const [showDayOverlay, setShowDayOverlay] = useState(false);

  const ri = myRole ? ROLES_INFO[myRole] : null;

  useEffect(() => onValue(ref(db, `rooms/${code}`), snap => {
    const r = snap.val();
    setRoom(r);
    if (r?.winner) onWin(r.winner);
  }), [code]);

  const prevPhaseRef = React.useRef(null);
  useEffect(() => {
    if (!room?.phase) return;
    const prev = prevPhaseRef.current;
    if (prev === "day" && room.phase === "night") {
      setShowNightOverlay(true);
      setTimeout(() => setShowNightOverlay(false), 3000);
    }
    if ((prev === "night" || prev === "vote") && room.phase === "day") {
      setShowDayOverlay(true);
      setTimeout(() => setShowDayOverlay(false), 2500);
    }
    prevPhaseRef.current = room.phase;
    setVoteTarget(null); setVoteSubmitted(false);
  }, [room?.phase, room?.round]);

  if (!room) return <PageWrap><p style={{ color: "#555" }}>로딩 중...</p></PageWrap>;

  const playersMap = room.players || {};
  const playerEntries = Object.entries(playersMap);
  const alivePlayers = playerEntries.filter(([, p]) => p.alive);
  const deadPlayers = playerEntries.filter(([, p]) => !p.alive);
  const phase = room.phase || "day";
  const round = room.round || 1;
  const isNight = phase === "night";
  const isConfirm = phase === "confirm";
  const confirmTarget = room.confirmTarget || null;
  const confirmVotes = room.confirmVotes || {};
  const myConfirmVote = confirmVotes[playerId] || null;
  const amAlive = playersMap[playerId]?.alive;
  const amMafia = isMafia(myRole);

  const aliveMafiaIds = playerEntries.filter(([, p]) => isMafia(p.role) && p.alive).map(([id]) => id);
  const mafiaTeam = playerEntries.filter(([id, p]) => isMafia(p.role) && p.alive && id !== playerId);
  const myMafiaVote = playersMap[playerId]?.mafiaVote || null;
  const mv = room.mafiaVoting || {};
  const reporterAlreadyUsed = !!playersMap[playerId]?.reporterUsed;
  const priestAlreadyUsed = !!playersMap[playerId]?.priestUsed;
  const needsNightAction = ["doctor", "police", "reporter"].includes(myRole) && !(myRole === "reporter" && reporterAlreadyUsed);
  const nightActions = room.nightActions || {};
  const myDoctorTarget = nightActions.doctor?.[playerId] || null;
  const myPoliceTarget = nightActions.police?.[playerId] || null;
  const myReporterTarget = nightActions.reporter?.[playerId] || null;
  const myPriestTarget = nightActions.priest?.[playerId] || null;
  const myNightPick = myRole === "doctor" ? myDoctorTarget : myRole === "police" ? myPoliceTarget : myRole === "reporter" ? myReporterTarget : null;
  const myTerroristTarget = playersMap[playerId]?.terroristTarget || null;
  const myFramerTarget = nightActions.framer?.[playerId] || null;
  const myPoliceResult = room.policeResults?.[playerId];
  const showPoliceResult = phase === "day" && myPoliceResult?.round === round - 1;

  const submitConfirmVote = async (v) => {
    if (!amAlive || myConfirmVote) return;
    await update(ref(db, `rooms/${code}/confirmVotes`), { [playerId]: v });
  };

  const submitVote = async (targetId) => {
    if (!amAlive) return;
    // 같은 사람 누르면 취소
    if (voteTarget === targetId) {
      await set(ref(db, `rooms/${code}/votes/${playerId}`), null);
      setVoteTarget(null);
    } else {
      await set(ref(db, `rooms/${code}/votes/${playerId}`), targetId);
      setVoteTarget(targetId);
    }
  };

  // 직업당 여러 명이 배치돼도 각자 개인 경로(nightActions/{role}/{playerId})에 독립적으로 기록한다.
  const submitNightAction = async (targetId) => {
    if (!amAlive) return;
    // 경찰은 한번 선택하면 변경 불가
    if (myRole === "police") {
      if (myPoliceTarget) return;
      await update(ref(db, `rooms/${code}/nightActions/police`), { [playerId]: targetId });
      return;
    }
    // 기자는 한번 선택하면 변경 불가 (1회 사용)
    if (myRole === "reporter") {
      if (myReporterTarget || reporterAlreadyUsed) return;
      await update(ref(db, `rooms/${code}/nightActions/reporter`), { [playerId]: targetId });
      return;
    }
    // 의사는 같은 사람 누르면 취소, 다른 사람 누르면 변경
    if (myRole === "doctor") {
      if (myDoctorTarget === targetId) {
        await update(ref(db, `rooms/${code}/nightActions/doctor`), { [playerId]: null });
      } else {
        await update(ref(db, `rooms/${code}/nightActions/doctor`), { [playerId]: targetId });
      }
    }
  };

  // 마피아 타겟 선택 (같은 사람 누르면 취소)
  const selectMafiaTarget = async (targetId) => {
    if (myMafiaVote === targetId) {
      await update(ref(db, `rooms/${code}/players/${playerId}`), { mafiaVote: null });
    } else {
      await update(ref(db, `rooms/${code}/players/${playerId}`), { mafiaVote: targetId });
    }
  };

  const useLawyer = async () => {
    if (room.lawyerBlock || room.lawyerUsed) return;
    await update(ref(db, `rooms/${code}`), { lawyerBlock: true, lawyerUsed: true });
  };

  // 테러리스트 폭탄 대상 선택 (같은 사람 누르면 취소, 낮/밤 상관없이 유지됨)
  const selectTerroristTarget = async (targetId) => {
    if (myTerroristTarget === targetId) {
      await update(ref(db, `rooms/${code}/players/${playerId}`), { terroristTarget: null });
    } else {
      await update(ref(db, `rooms/${code}/players/${playerId}`), { terroristTarget: targetId });
    }
  };

  // 성직자 부활 대상 선택 (본인 기준 게임 중 1회, 사망자만 선택 가능)
  const submitPriestRevive = async (targetId) => {
    if (!amAlive || priestAlreadyUsed || myPriestTarget) return;
    await update(ref(db, `rooms/${code}/nightActions/priest`), { [playerId]: targetId });
  };

  // 모함가 누명 대상 선택 (매일 밤 변경 가능)
  const selectFramerTarget = async (targetId) => {
    if (myFramerTarget === targetId) {
      await update(ref(db, `rooms/${code}/nightActions/framer`), { [playerId]: null });
    } else {
      await update(ref(db, `rooms/${code}/nightActions/framer`), { [playerId]: targetId });
    }
  };

  const lastDeath = room.lastDeath;
  const lastExecution = room.lastExecution;

  return (
    <PageWrap night={isNight}>

      {/* 밤 전환 오버레이 */}
      {showNightOverlay && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.96)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          animation: "fadeInOut 3s ease",
          fontFamily: "'Noto Sans KR', sans-serif",
        }}>
          <div style={{ fontSize: 56, marginBottom: 24 }}>🌙</div>
          <h2 style={{ color: "#3a5a8a", fontSize: 28, fontWeight: 900, marginBottom: 12, letterSpacing: 3 }}>밤이 되었습니다</h2>
          <p style={{ color: "#4a4a6a", fontSize: 15, letterSpacing: 2 }}>모두 자리에 엎드려주세요</p>
        </div>
      )}

      {/* 낮 전환 오버레이 */}
      {showDayOverlay && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.92)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          fontFamily: "'Noto Sans KR', sans-serif",
        }}>
          <div style={{ fontSize: 56, marginBottom: 24 }}>☀️</div>
          <h2 style={{ color: "#c9a84c", fontSize: 28, fontWeight: 900, marginBottom: 12, letterSpacing: 3 }}>아침이 밝았습니다</h2>
          <p style={{ color: "#6a5a3a", fontSize: 15, letterSpacing: 2 }}>눈을 떠주세요</p>
        </div>
      )}

      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <PhaseBadge phase={phase} round={round} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.surface, border: `1px solid ${ri?.border || T.border}`, borderRadius: 10, padding: "6px 12px 6px 6px" }}>
          {ri && (
            <span style={{
              fontSize: 10, fontWeight: 900, letterSpacing: 1,
              color: ri.team === "mafia" ? T.red : ri.team === "jester" ? "#e84393" : T.green,
              paddingRight: 8, borderRight: `1px solid ${T.border}`,
            }}>
              {ri.team === "mafia" ? "마피아팀" : ri.team === "jester" ? "광대(솔로)" : "시민팀"}
            </span>
          )}
          {ri?.image && <img src={ri.image} alt={ri.name} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: `1px solid ${ri.border}` }} />}
          <p style={{ fontSize: 11, color: ri?.color, fontWeight: 700, letterSpacing: 1 }}>{ri?.name}</p>
        </div>
      </div>

      {/* 직전 로그 크게 표시 */}
      {(() => {
        const logs = room.logs || {};
        const logEntries2 = Object.entries(logs).sort(([, a], [, b]) => (b.order || 0) - (a.order || 0));
        const lastLog = logEntries2[0]?.[1] || null;
        if (!lastLog) return null;
        return (
          <div style={{ background: T.surface, border: `1px solid ${T.border2}`, borderRadius: 10, padding: "16px 18px", marginBottom: 16, width: "100%", maxWidth: 440, boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ height: 1, flex: 1, background: T.border }} />
              <span style={{ color: T.textMute, fontSize: 10, letterSpacing: 3, fontWeight: 700 }}>{lastLog.phase} 기록</span>
              <div style={{ height: 1, flex: 1, background: T.border }} />
            </div>
            {(lastLog.entries || []).map((entry, i) => (
              <p key={i} style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8, lineHeight: 1.7, paddingLeft: 8, borderLeft: `2px solid ${T.red}` }}>{entry}</p>
            ))}
          </div>
        );
      })()}

      {/* 전체 로그 */}
      {Object.keys(room.logs || {}).length > 1 && (
        <details style={{ marginBottom: 14, width: "100%", maxWidth: 440 }}>
          <summary style={{ color: T.textMute, fontSize: 11, cursor: "pointer", padding: "10px 16px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, letterSpacing: 2 }}>
            📜 전체 활동 로그
          </summary>
          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderTop: "none", borderRadius: "0 0 8px 8px", padding: "12px 16px" }}>
            {Object.entries(room.logs || {}).sort(([, a], [, b]) => (b.order || 0) - (a.order || 0)).map(([key, log]) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <p style={{ color: T.textMute, fontSize: 10, marginBottom: 8, letterSpacing: 3, fontWeight: 700 }}>{log.phase}</p>
                {(log.entries || []).map((entry, i) => (
                  <p key={i} style={{ fontSize: 12, color: T.textDim, marginBottom: 4 }}>{entry}</p>
                ))}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* 공지들 */}
      {phase === "day" && lastDeath?.round === round - 1 && (
        <Card style={{ border: `1px solid ${lastDeath.playerId ? "#3a0000" : "#003a00"}`, background: lastDeath.playerId ? "#0d0000" : "#000d00" }}>
          {lastDeath.playerId
            ? <><p style={{ color: "#e74c3c", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🌙 어젯밤 희생자</p>
                <p style={{ fontSize: 16 }}><strong>{lastDeath.playerName}</strong>님이 사망했습니다</p>
                <p style={{ color: "#555", fontSize: 12, marginTop: 4 }}>공개된 직업: {revealRole(lastDeath.role)}</p></>
            : <p style={{ color: "#2ecc71", fontWeight: 700 }}>🌙 어젯밤 아무도 사망하지 않았습니다!</p>
          }
        </Card>
      )}

      {phase === "day" && Object.entries(room.reporterReveals || {}).filter(([, r]) => r.round === round - 1).map(([rid, r]) => (
        <Card key={rid} style={{ border: "1px solid #5c4a00", background: "#1a1400" }}>
          <p style={{ color: "#f1c40f", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📰 기자 속보!</p>
          <p style={{ fontSize: 15 }}><strong>{r.targetName}</strong>님의 직업은{" "}
            <span style={{ color: r.result === "마피아" ? "#e74c3c" : "#2ecc71", fontWeight: 900, fontSize: 17 }}>{r.result}</span>입니다!</p>
        </Card>
      ))}

      {isNight && lastExecution?.round === round - 1 && (
        <Card style={{ border: "1px solid #3a0000", background: "#0d0000" }}>
          {lastExecution.blocked
            ? <p style={{ color: "#9b59b6", fontWeight: 700 }}>⚖️ 변호사의 이의로 처형이 취소됐습니다!</p>
            : lastExecution.playerId
              ? <><p style={{ color: "#e74c3c", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>⚖️ 처형 결과</p>
                  <p style={{ fontSize: 16 }}><strong>{lastExecution.playerName}</strong>님이 처형됐습니다</p>
                  <p style={{ color: "#555", fontSize: 12, marginTop: 4 }}>공개된 직업: {revealRole(lastExecution.role)}</p></>
              : <p style={{ color: "#f1c40f", fontWeight: 700 }}>⚖️ 동률로 처형이 무효가 됐습니다!</p>
          }
        </Card>
      )}

      {myRole === "police" && showPoliceResult && (
        <Card style={{ border: "1px solid #1a3a5c", background: "#00091a" }}>
          <p style={{ color: "#3498db", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🚔 어젯밤 조사 결과 (나만 보여요)</p>
          <p style={{ fontSize: 15 }}><strong>{myPoliceResult.targetName}</strong>님은{" "}
            <span style={{ color: myPoliceResult.result === "마피아" ? "#e74c3c" : "#2ecc71", fontWeight: 900, fontSize: 17 }}>{myPoliceResult.result}</span>입니다!</p>
        </Card>
      )}

      {/* 처형 확인 투표 팝업 */}
      {isConfirm && confirmTarget && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20, fontFamily: "'Noto Sans KR', sans-serif",
        }}>
          <div style={{ background: T.surface, border: `1px solid ${T.red}66`, borderRadius: 16, padding: "28px 24px", maxWidth: 340, width: "100%", textAlign: "center" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🔨</p>
            <p style={{ color: T.textMute, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>처형 확인 투표</p>
            <h3 style={{ color: T.text, fontSize: 20, fontWeight: 900, marginBottom: 6 }}>
              <span style={{ color: T.red }}>{playersMap[confirmTarget]?.name}</span>을(를)<br />처형하시겠습니까?
            </h3>

            {/* 투표 현황 */}
            <div style={{ display: "flex", justifyContent: "center", gap: 20, margin: "16px 0" }}>
              <div>
                <p style={{ color: T.green, fontSize: 22, fontWeight: 900 }}>{Object.values(confirmVotes).filter(v => v === "yes").length}</p>
                <p style={{ color: T.textMute, fontSize: 11 }}>찬성</p>
              </div>
              <div style={{ width: 1, background: T.border }} />
              <div>
                <p style={{ color: T.red, fontSize: 22, fontWeight: 900 }}>{Object.values(confirmVotes).filter(v => v === "no").length}</p>
                <p style={{ color: T.textMute, fontSize: 11 }}>반대</p>
              </div>
            </div>

            {!amAlive && <p style={{ color: T.textMute, fontSize: 13 }}>💀 사망 상태라 투표할 수 없습니다</p>}

            {amAlive && !myConfirmVote && (
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <Btn onClick={() => submitConfirmVote("yes")} color={T.green} style={{ marginBottom: 0 }}>✅ 찬성</Btn>
                <Btn onClick={() => submitConfirmVote("no")} color={T.red} style={{ marginBottom: 0 }}>❌ 반대</Btn>
              </div>
            )}
            {amAlive && myConfirmVote && (
              <p style={{ color: myConfirmVote === "yes" ? T.green : T.red, fontWeight: 700, fontSize: 15, marginTop: 8 }}>
                {myConfirmVote === "yes" ? "✅ 찬성 투표 완료" : "❌ 반대 투표 완료"}
              </p>
            )}
            <p style={{ color: T.textMute, fontSize: 11, marginTop: 12 }}>사회자가 결과를 확정하면 처리됩니다</p>
          </div>
        </div>
      )}

      {myRole === "lawyer" && phase === "vote" && amAlive && !room.lawyerUsed && (
        <Card style={{ border: "1px solid #3a1a5c", background: "#0d0018" }}>
          <p style={{ color: "#9b59b6", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>⚖️ 변호사 능력 (1회)</p>
          <Btn onClick={useLawyer} color="#9b59b6" disabled={lawyerUsed} style={{ marginBottom: 0 }}>
            {lawyerUsed ? "✅ 이의 제기 완료" : "⚖️ 이의 있습니다!"}
          </Btn>
        </Card>
      )}

      {/* 마피아 팀 패널 */}
      {amMafia && isNight && amAlive && (
        <Card style={{ border: `1px solid ${T.red}44`, background: T.surface }}>
          <p style={{ color: T.red, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>🔫 마피아 팀 (나만 보여요)</p>

          {mafiaTeam.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <Label>팀원 투표 현황</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {mafiaTeam.map(([id, p]) => (
                  <span key={id} style={{ background: T.surface2, border: `1px solid ${T.red}44`, borderRadius: 20, padding: "4px 12px", fontSize: 12, color: T.red }}>
                    {ROLES_INFO[p.role]?.emoji} {p.name}
                    {p.mafiaVote ? ` → ${playersMap[p.mafiaVote]?.name}` : " (미선택)"}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Label>제거할 대상 선택</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {alivePlayers.filter(([id]) => !isMafia(playersMap[id]?.role)).map(([id, p]) => (
              <div key={id} onClick={() => selectMafiaTarget(id)} style={{
                padding: "11px 14px", borderRadius: 8, cursor: "pointer",
                background: myMafiaVote === id ? `${T.red}22` : T.surface2,
                border: `1px solid ${myMafiaVote === id ? T.red : T.border2}`,
                display: "flex", alignItems: "center", transition: "all 0.15s",
              }}>
                <span style={{ flex: 1, fontSize: 13, color: T.text }}>{p.name}</span>
                {myMafiaVote === id && <span style={{ color: T.red, fontSize: 11, fontWeight: 700 }}>✓ 선택</span>}
              </div>
            ))}
          </div>
          {myMafiaVote && (
            <p style={{ color: T.green, fontSize: 12, marginTop: 10, textAlign: "center" }}>
              ✓ {playersMap[myMafiaVote]?.name} 선택 완료
            </p>
          )}
        </Card>
      )}

      {/* 모함가 능력 패널 */}
      {myRole === "framer" && isNight && amAlive && (
        <Card style={{ border: `1px solid ${T.red}44`, background: T.surface }}>
          <p style={{ color: T.red, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🎭 모함가 능력 (나만 보여요)</p>
          <p style={{ color: T.textMute, fontSize: 11, marginBottom: 10 }}>선택한 대상이 경찰에게 조사당하면 결과가 "마피아"로 조작됩니다.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {alivePlayers.filter(([id]) => !isMafia(playersMap[id]?.role)).map(([id, p]) => (
              <div key={id} onClick={() => selectFramerTarget(id)} style={{
                padding: "11px 14px", borderRadius: 8, cursor: "pointer",
                background: myFramerTarget === id ? `${T.red}22` : T.surface2,
                border: `1px solid ${myFramerTarget === id ? T.red : T.border2}`,
                display: "flex", alignItems: "center", transition: "all 0.15s",
              }}>
                <span style={{ flex: 1, fontSize: 13, color: T.text }}>{p.name}</span>
                {myFramerTarget === id && <span style={{ color: T.red, fontSize: 11, fontWeight: 700 }}>✓ 선택</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 성직자 능력 패널 */}
      {myRole === "priest" && isNight && amAlive && !priestAlreadyUsed && (
        <Card style={{ border: "1px solid #4a4a4a", background: T.surface }}>
          <p style={{ color: "#ecf0f1", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>✝️ 성직자 능력 (1회) — 부활시킬 사람 선택</p>
          {deadPlayers.length === 0
            ? <p style={{ color: T.textMute, fontSize: 12 }}>아직 사망자가 없습니다...</p>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {deadPlayers.map(([id, p]) => (
                  <div key={id} onClick={() => submitPriestRevive(id)} style={{
                    padding: "11px 14px", borderRadius: 8, cursor: myPriestTarget ? "default" : "pointer",
                    background: myPriestTarget === id ? "#ffffff22" : T.surface2,
                    border: `1px solid ${myPriestTarget === id ? "#ecf0f1" : T.border2}`,
                    display: "flex", alignItems: "center", transition: "all 0.15s",
                  }}>
                    <span style={{ flex: 1, fontSize: 13, color: T.text }}>{p.name}</span>
                    {myPriestTarget === id && <span style={{ color: "#ecf0f1", fontSize: 11, fontWeight: 700 }}>✓ 선택</span>}
                  </div>
                ))}
              </div>
            )}
        </Card>
      )}

      {/* 테러리스트 능력 패널 */}
      {myRole === "terrorist" && amAlive && (
        <Card style={{ border: "1px solid #5c3300", background: T.surface }}>
          <p style={{ color: "#e67e22", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🧨 테러리스트 능력 (나만 보여요)</p>
          <p style={{ color: T.textMute, fontSize: 11, marginBottom: 10 }}>처형당하면 아래 선택한 대상이 함께 죽습니다. 언제든 바꿀 수 있어요.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {alivePlayers.filter(([id]) => id !== playerId).map(([id, p]) => (
              <div key={id} onClick={() => selectTerroristTarget(id)} style={{
                padding: "11px 14px", borderRadius: 8, cursor: "pointer",
                background: myTerroristTarget === id ? "#e67e2222" : T.surface2,
                border: `1px solid ${myTerroristTarget === id ? "#e67e22" : T.border2}`,
                display: "flex", alignItems: "center", transition: "all 0.15s",
              }}>
                <span style={{ flex: 1, fontSize: 13, color: T.text }}>{p.name}</span>
                {myTerroristTarget === id && <span style={{ color: "#e67e22", fontSize: 11, fontWeight: 700 }}>✓ 선택</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 생존자 목록 */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <p style={{ color: "#555", fontSize: 12 }}>생존자 {alivePlayers.length}명</p>
          {phase === "vote" && <p style={{ color: "#e74c3c", fontSize: 12 }}>탭해서 투표</p>}
          {isNight && needsNightAction && amAlive && <p style={{ color: "#3498db", fontSize: 12 }}>탭해서 선택</p>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alivePlayers.map(([id, p]) => {
            const isMe = id === playerId;
            const myVote = voteTarget === id;
            const isNightSelected = myNightPick === id;
            // 의사는 자기 자신도 보호 가능, 나머지는 본인 선택 불가
            const canSelfTarget = myRole === "doctor";
            const canClick = (!isMe || canSelfTarget) && amAlive && (
              (phase === "vote" && !isMe) ||
              (isNight && needsNightAction && !amMafia)
            );
            return (
              <div key={id} onClick={() => { if (!canClick) return; if (phase === "vote") submitVote(id); if (isNight) submitNightAction(id); }}
                style={{ display: "flex", alignItems: "center", padding: "12px 14px", borderRadius: 12, background: myVote || isNightSelected ? "#1a0a00" : isMe ? "#0d0d1a" : "#1a1a1a", border: `1px solid ${myVote || isNightSelected ? "#5a3000" : isMe ? "#2a2a4a" : "#222"}`, cursor: canClick ? "pointer" : "default", transition: "all 0.15s" }}>
                <span style={{ marginRight: 10, fontSize: 16 }}>👤</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: isMe ? 700 : 400 }}>{p.name}{isMe ? " (나)" : ""}</span>
                {myVote && phase === "vote" && <span style={{ background: "#3a0000", color: "#e74c3c", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>✓ 투표함</span>}
                {isNightSelected && <span style={{ background: "#1a3a1a", color: "#2ecc71", borderRadius: 20, padding: "2px 10px", fontSize: 12 }}>✓ 선택</span>}
              </div>
            );
          })}
        </div>
      </Card>

      {/* 사망자 */}
      {deadPlayers.length > 0 && (
        <Card style={{ background: "#0d0d0d" }}>
          <p style={{ color: "#444", fontSize: 12, marginBottom: 10 }}>사망자</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {deadPlayers.map(([id, p]) => (
              <span key={id} style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#3a3a3a", textDecoration: "line-through" }}>
                {p.name} ({revealRole(p.role)})
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* 안내 */}
      <Card style={{ borderLeft: `3px solid ${isNight ? "#3498db" : phase === "vote" ? "#e74c3c" : "#f1c40f"}`, background: "#0d0d0d" }}>
        {phase === "day" && <p style={{ color: "#888", fontSize: 13 }}>☀️ 자유롭게 토론하세요. 사회자가 투표를 시작하면 참여하세요.</p>}
        {isNight && !amAlive && <p style={{ color: "#444", fontSize: 13 }}>💀 사망 상태입니다. 조용히 지켜보세요.</p>}
        {isNight && amAlive && myRole === "framer" && <p style={{ color: T.red, fontSize: 13 }}>🎭 위 모함가 패널에서 누명 씌울 대상을 선택하세요. (마피아 킬 투표도 함께 참여하세요)</p>}
        {isNight && amAlive && amMafia && myRole !== "framer" && <p style={{ color: "#e74c3c", fontSize: 13 }}>🔫 위 마피아 패널에서 대상을 선택하고 동의하세요.</p>}
        {isNight && amAlive && myRole === "priest" && !priestAlreadyUsed && <p style={{ color: "#ecf0f1", fontSize: 13 }}>✝️ 위 성직자 패널에서 부활시킬 사람을 선택하세요.</p>}
        {isNight && amAlive && myRole === "priest" && priestAlreadyUsed && <p style={{ color: "#666", fontSize: 13 }}>✝️ 이미 능력을 사용했습니다.</p>}
        {amAlive && myRole === "terrorist" && <p style={{ color: "#e67e22", fontSize: 13 }}>🧨 위 테러리스트 패널에서 폭탄 대상을 선택해두세요. 처형당하면 함께 죽습니다.</p>}
        {isNight && amAlive && !amMafia && !needsNightAction && !["priest", "terrorist"].includes(myRole) && <p style={{ color: "#666", fontSize: 13 }}>👤 눈을 감고 기다리세요...</p>}
        {isNight && amAlive && myRole === "reporter" && reporterAlreadyUsed && <p style={{ color: "#5c4a00", fontSize: 13 }}>📰 이미 능력을 사용했습니다.</p>}
        {isNight && amAlive && needsNightAction && !myNightPick && (
          <p style={{ color: "#3498db", fontSize: 13 }}>
            {myRole === "doctor" && "⚕️ 보호할 사람을 선택하세요."}
            {myRole === "police" && "🚔 조사할 사람을 선택하세요."}
            {myRole === "reporter" && "📰 공개할 사람을 선택하세요."}
          </p>
        )}
        {isNight && amAlive && needsNightAction && myNightPick && <p style={{ color: "#2ecc71", fontSize: 13 }}>✅ 행동 완료! 사회자가 넘길 때까지 기다리세요.</p>}
        {phase === "vote" && !amAlive && <p style={{ color: "#444", fontSize: 13 }}>💀 사망 상태라 투표할 수 없습니다.</p>}
        {phase === "vote" && amAlive && !voteSubmitted && <p style={{ color: "#e74c3c", fontSize: 13 }}>🗳️ 처형할 사람을 선택하세요!</p>}
        {phase === "vote" && amAlive && voteSubmitted && <p style={{ color: "#2ecc71", fontSize: 13 }}>✅ 투표 완료! ({playersMap[voteTarget]?.name}에게 투표)</p>}
      </Card>
    </PageWrap>
  );
}

// ── 승리 화면 ──
function WinScreen({ winner, myRole, isHost, onRestart, code }) {
  const isMafiaWin = winner === "mafia";
  const isJesterWin = winner === "jester";
  const myTeam = myRole ? ROLES_INFO[myRole]?.team : null;
  const iWon = isHost ? false : myTeam === winner;
  const winColor = isJesterWin ? "#e84393" : isMafiaWin ? T.red : T.green;
  const [logs, setLogs] = useState({});

  useEffect(() => {
    if (!code) return;
    onValue(ref(db, `rooms/${code}/logs`), snap => setLogs(snap.val() || {}), { onlyOnce: true });
  }, [code]);

  return (
    <div style={{
      minHeight: "100vh",
      background: T.bg,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Noto Sans KR', sans-serif", padding: 40, textAlign: "center",
      position: "relative", overflow: "hidden",
    }}>
      {/* 배경 */}
      <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${winColor}22 0%, transparent 70%)`, pointerEvents: "none" }} />

      {/* 장식선 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
        <div style={{ height: 1, width: 50, background: `linear-gradient(to right, transparent, ${winColor}66)` }} />
        <span style={{ color: winColor, fontSize: 10, letterSpacing: 4, fontWeight: 700 }}>GAME OVER</span>
        <div style={{ height: 1, width: 50, background: `linear-gradient(to left, transparent, ${winColor}66)` }} />
      </div>

      <div style={{ fontSize: 64, marginBottom: 24 }}>{isJesterWin ? "🤡" : isMafiaWin ? "🔫" : "⚖️"}</div>

      <h1 style={{ fontSize: 44, fontWeight: 900, color: winColor, marginBottom: 8, letterSpacing: 2, textShadow: `0 0 40px ${winColor}66` }}>
        {isJesterWin ? "광대 승리" : isMafiaWin ? "마피아 승리" : "시민 승리"}
      </h1>

      <p style={{ fontSize: 16, color: isHost ? T.textMute : iWon ? T.gold : T.textMute, marginBottom: 52, letterSpacing: 1 }}>
        {isHost ? "게임이 종료됐습니다" : iWon ? "🏆  당신이 이겼습니다" : "아쉽게 졌습니다"}
      </p>

      {Object.keys(logs).length > 0 && (() => {
        const sortedLogs = Object.entries(logs).sort(([, a], [, b]) => (a.order || 0) - (b.order || 0));
        const lastLogEntry = sortedLogs[sortedLogs.length - 1];
        return (
          <>
            {/* 마지막 로그 (승패 직전 상황) 크게 표시 */}
            {lastLogEntry && (
              <div style={{ background: T.surface, border: `1px solid ${T.border2}`, borderRadius: 10, padding: "16px 18px", marginBottom: 16, width: "100%", maxWidth: 420, boxSizing: "border-box", textAlign: "left" }}>
                <p style={{ color: T.textMute, fontSize: 10, letterSpacing: 3, fontWeight: 700, marginBottom: 10 }}>{lastLogEntry[1].phase} · 마지막 기록</p>
                {(lastLogEntry[1].entries || []).map((entry, i) => (
                  <p key={i} style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6, lineHeight: 1.7, paddingLeft: 8, borderLeft: `2px solid ${winColor}` }}>{entry}</p>
                ))}
              </div>
            )}

            {/* 전체 로그 펼쳐보기 */}
            <details style={{ marginBottom: 24, width: "100%", maxWidth: 420 }}>
              <summary style={{ color: T.textMute, fontSize: 12, cursor: "pointer", padding: "10px 16px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, letterSpacing: 2, textAlign: "center" }}>
                📜 전체 게임 로그 보기
              </summary>
              <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderTop: "none", borderRadius: "0 0 8px 8px", padding: "16px", textAlign: "left", maxHeight: 400, overflowY: "auto" }}>
                {sortedLogs.map(([key, log]) => (
                  <div key={key} style={{ marginBottom: 16 }}>
                    <p style={{ color: T.textMute, fontSize: 10, marginBottom: 8, letterSpacing: 3, fontWeight: 700 }}>{log.phase}</p>
                    {(log.entries || []).map((entry, i) => (
                      <p key={i} style={{ fontSize: 13, color: T.textDim, marginBottom: 4, paddingLeft: 8, borderLeft: `2px solid ${T.border2}` }}>{entry}</p>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          </>
        );
      })()}

      <div style={{ width: "100%", maxWidth: 300 }}>
        <Btn onClick={onRestart} color={T.red} style={{ padding: "16px", fontSize: 14, letterSpacing: 2 }}>
          다시 하기
        </Btn>
      </div>
    </div>
  );
}

// ── 메인 앱 ──
const SESSION_KEY = "mafia_session";

export default function App() {
  const [screen, setScreen] = useState("title");
  const [roomCode, setRoomCode] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [myRole, setMyRole] = useState(null);
  const [winner, setWinner] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [booting, setBooting] = useState(true);

  const reset = () => {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
    setScreen("title"); setMyRole(null); setWinner(null); setRoomCode(""); setPlayerId(""); setIsHost(false);
  };

  // 새로고침 시 저장된 세션으로 게임 화면 복구
  useEffect(() => {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch (e) {}
    if (!saved?.roomCode) { setBooting(false); return; }

    onValue(ref(db, `rooms/${saved.roomCode}`), snap => {
      const room = snap.val();
      // 방이 사라졌으면 세션 정리하고 타이틀로
      if (!room) { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} setBooting(false); return; }

      setRoomCode(saved.roomCode);
      setIsHost(!!saved.isHost);

      if (saved.isHost) {
        if (room.winner) { setWinner(room.winner); setScreen("hostgame"); }
        else if (room.status === "playing") setScreen("hostgame");
        else setScreen("hostlobby");
      } else {
        const me = room.players?.[saved.playerId];
        // 플레이어가 방에서 제거됐으면 세션 정리
        if (!me) { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} setBooting(false); return; }
        setPlayerId(saved.playerId);
        const role = me.role || saved.myRole || null;
        setMyRole(role);
        if (room.winner) { setWinner(room.winner); setScreen("playergame"); }
        else if (room.status === "playing") setScreen(me.ready ? "playergame" : "role");
        else setScreen("playerlobby");
      }
      setBooting(false);
    }, { onlyOnce: true });
  }, []); // eslint-disable-line

  // 세션 상태 변화를 저장 (새로고침 대비)
  useEffect(() => {
    if (booting) return;
    if (roomCode && (isHost || playerId)) {
      try { localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode, playerId, isHost, myRole })); } catch (e) {}
    }
  }, [booting, roomCode, playerId, isHost, myRole]);

  if (booting) {
    return (
      <PageWrap><p style={{ color: T.textDim, fontSize: 14, textAlign: "center", padding: "40px 0" }}>불러오는 중...</p></PageWrap>
    );
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;700;900&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #08080a; }
        input::placeholder { color: #3a3a4a; }
        input { outline: none; }
        details > summary { list-style: none; }
        details > summary::-webkit-details-marker { display: none; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes fadeInOut { 0% { opacity: 0; } 15% { opacity: 1; } 75% { opacity: 1; } 100% { opacity: 0; } }
      `}</style>
      {screen === "title" && (
        <TitleScreen
          onHost={() => setScreen("host")}
          onJoin={() => setScreen("join")}
        />
      )}
      {screen === "host" && (
        <HostScreen onCreated={(code, id) => { setRoomCode(code); setPlayerId(id); setIsHost(true); setScreen("hostlobby"); }} />
      )}
      {screen === "join" && (
        <JoinScreen onJoined={(code, id) => { setRoomCode(code); setPlayerId(id); setScreen("playerlobby"); }} />
      )}
      {screen === "hostlobby" && (
        <HostLobbyScreen code={roomCode} onStart={() => setScreen("hostgame")} />
      )}
      {screen === "playerlobby" && (
        <PlayerLobbyScreen code={roomCode} playerId={playerId} onStart={() => setScreen("role")} />
      )}
      {screen === "role" && (
        <RoleRevealScreen code={roomCode} playerId={playerId} onReady={(role) => { setMyRole(role); setScreen("playergame"); }} />
      )}
      {screen === "hostgame" && !winner && (
        <HostGameScreen code={roomCode} onEnd={(w) => setWinner(w)} />
      )}
      {screen === "playergame" && !winner && (
        <PlayerGameScreen code={roomCode} playerId={playerId} myRole={myRole} onWin={setWinner} />
      )}
      {(screen === "hostgame" || screen === "playergame") && winner && (
        <WinScreen winner={winner} myRole={myRole} isHost={isHost} onRestart={reset} code={roomCode} />
      )}
    </>
  );
}