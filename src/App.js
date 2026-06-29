/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update } from "firebase/database";

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

const ROLES_INFO = {
  mafia:     { name: "마피아",      emoji: "🔫", color: "#e74c3c", bg: "#1a0000", border: "#5a0000", team: "mafia",   desc: "밤마다 시민 한 명을 제거하세요!" },
  mafiaBoss: { name: "마피아 보스", emoji: "👑", color: "#e74c3c", bg: "#1a0000", border: "#5a0000", team: "mafia",   desc: "경찰 조사에 시민으로 위장됩니다!" },
  police:    { name: "경찰",        emoji: "🚔", color: "#3498db", bg: "#00091a", border: "#1a3a5c", team: "citizen", desc: "매 밤 한 명을 조사해 마피아인지 확인하세요." },
  doctor:    { name: "의사",        emoji: "⚕️", color: "#2ecc71", bg: "#001a0a", border: "#1a5c2a", team: "citizen", desc: "매 밤 한 명을 보호해 마피아 공격을 막으세요." },
  reporter:  { name: "기자",        emoji: "📰", color: "#f1c40f", bg: "#1a1400", border: "#5c4a00", team: "citizen", desc: "단 한 번, 한 명의 직업을 모두에게 공개할 수 있습니다." },
  lawyer:    { name: "변호사",      emoji: "⚖️", color: "#9b59b6", bg: "#0d001a", border: "#3a1a5c", team: "citizen", desc: "단 한 번, 처형 예정인 플레이어를 구할 수 있습니다." },
  citizen:   { name: "시민",        emoji: "👤", color: "#95a5a6", bg: "#111",    border: "#2a2a2a", team: "citizen", desc: "마피아를 찾아내어 처형하세요!" },
};

const isMafia = (role) => role === "mafia" || role === "mafiaBoss";
const revealRole = (role) => isMafia(role) ? `${ROLES_INFO[role].emoji} ${ROLES_INFO[role].name}` : "👤 시민";

function generateCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function shuffleRoles(playerCount, roleConfig, citizenCount) {
  const list = [];
  Object.entries(roleConfig).forEach(([id, count]) => {
    for (let i = 0; i < count; i++) list.push(id);
  });
  for (let i = 0; i < citizenCount; i++) list.push("citizen");
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function checkWin(players) {
  const alive = Object.values(players).filter(p => p.alive);
  const aliveMafia = alive.filter(p => isMafia(p.role));
  const aliveCitizen = alive.filter(p => !isMafia(p.role));
  if (aliveMafia.length === 0) return "citizen";
  if (aliveMafia.length >= aliveCitizen.length) return "mafia";
  return null;
}

// ── 공통 컴포넌트 ──
const Btn = ({ children, onClick, color = "#8B0000", disabled, style = {} }) => (
  <button type="button" onClick={onClick} disabled={disabled} style={{
    width: "100%", padding: "15px",
    background: disabled ? "#1a1a1a" : `linear-gradient(135deg, ${color}dd, ${color})`,
    color: disabled ? "#444" : "#fff",
    border: disabled ? "1px solid #222" : "none",
    borderRadius: 14, fontSize: 15, fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'Noto Sans KR', sans-serif", marginBottom: 10,
    boxShadow: disabled ? "none" : `0 4px 20px ${color}44`,
    transition: "all 0.2s", ...style,
  }}>{children}</button>
);

const Card = ({ children, style = {} }) => (
  <div style={{ background: "#111", borderRadius: 18, padding: "18px 20px", marginBottom: 14, width: "100%", maxWidth: 460, boxSizing: "border-box", ...style }}>
    {children}
  </div>
);

const PageWrap = ({ children, night = false, wide = false }) => (
  <div style={{
    minHeight: "100vh",
    background: night ? "linear-gradient(180deg, #05050f 0%, #0a0a1a 100%)" : "linear-gradient(180deg, #0a0000 0%, #0d0d0d 100%)",
    color: "#fff", fontFamily: "'Noto Sans KR', sans-serif",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "28px 16px 40px", transition: "background 1s ease",
  }}>
    <div style={{ width: "100%", maxWidth: wide ? 700 : 460 }}>{children}</div>
  </div>
);

// ── 타이틀 ──
function TitleScreen({ onHost, onJoin }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 30%, #2a0000 0%, #0d0000 50%, #000 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Noto Sans KR', sans-serif", padding: "40px 20px",
    }}>
      <div style={{ width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, #8B0000 0%, #5a0000 70%, transparent 100%)", marginBottom: 24, opacity: 0.8, boxShadow: "0 0 60px #8B000066" }} />
      <p style={{ color: "#8B0000", fontSize: 13, letterSpacing: 5, marginBottom: 6, fontWeight: 700 }}>육은영반</p>
      <h1 style={{ fontSize: 38, fontWeight: 900, color: "#fff", margin: "0 0 6px", textShadow: "0 0 40px #8B0000", letterSpacing: 2, textAlign: "center" }}>마피아 게임</h1>
      <p style={{ color: "#5a0000", fontSize: 13, letterSpacing: 4, marginBottom: 48 }}>누가 마피아인가?</p>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <Btn onClick={onHost} color="#8B0000">🎙️ 사회자로 방 만들기</Btn>
        <Btn onClick={onJoin} color="#1a3a6b">🚪 플레이어로 참가하기</Btn>
      </div>
    </div>
  );
}

// ── 방 만들기 (사회자) ──
function HostScreen({ onCreated }) {
  const [playerCount, setPlayerCount] = useState(8);
  const [roles, setRoles] = useState({ mafia: 2, mafiaBoss: 0, police: 1, doctor: 1, reporter: 0, lawyer: 0 });

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
    { id: "mafia", label: "마피아", emoji: "🔫", color: "#e74c3c" },
    { id: "mafiaBoss", label: "마피아 보스", emoji: "👑", color: "#e74c3c" },
    { id: "police", label: "경찰", emoji: "🚔", color: "#3498db" },
    { id: "doctor", label: "의사", emoji: "⚕️", color: "#2ecc71" },
    { id: "reporter", label: "기자", emoji: "📰", color: "#f1c40f" },
    { id: "lawyer", label: "변호사", emoji: "⚖️", color: "#9b59b6" },
  ];

  return (
    <PageWrap>
      <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>🎙️ 사회자 설정</h2>
      <p style={{ color: "#555", fontSize: 12, marginBottom: 24 }}>사회자는 게임에 참여하지 않고 진행만 합니다</p>

      <Card>
        <p style={{ color: "#666", fontSize: 11, marginBottom: 12 }}>플레이어 수 (사회자 제외)</p>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button type="button" onClick={() => setPlayerCount(p => Math.max(4, p - 1))} style={{ width: 44, height: 44, background: "#1a1a1a", color: "#fff", border: "1px solid #2a2a2a", borderRadius: 12, fontSize: 22, cursor: "pointer" }}>−</button>
          <span style={{ flex: 1, textAlign: "center", fontSize: 32, fontWeight: 900 }}>{playerCount}명</span>
          <button type="button" onClick={() => setPlayerCount(p => Math.min(20, p + 1))} style={{ width: 44, height: 44, background: "#1a1a1a", color: "#fff", border: "1px solid #2a2a2a", borderRadius: 12, fontSize: 22, cursor: "pointer" }}>+</button>
        </div>
      </Card>

      <Card>
        <p style={{ color: "#666", fontSize: 11, marginBottom: 16 }}>역할 설정</p>
        {roleRows.map(r => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
            <span style={{ color: r.color, fontSize: 16, width: 24 }}>{r.emoji}</span>
            <span style={{ flex: 1, fontSize: 14, marginLeft: 10 }}>{r.label}</span>
            <div style={{ display: "flex", alignItems: "center", background: "#1a1a1a", borderRadius: 10, border: "1px solid #2a2a2a" }}>
              <button type="button" onClick={() => adjust(r.id, -1)} style={{ width: 36, height: 36, background: "none", color: "#fff", border: "none", fontSize: 18, cursor: "pointer" }}>−</button>
              <span style={{ width: 28, textAlign: "center", fontWeight: 700, fontSize: 15 }}>{roles[r.id]}</span>
              <button type="button" onClick={() => adjust(r.id, +1)} style={{ width: 36, height: 36, background: "none", color: "#fff", border: "none", fontSize: 18, cursor: "pointer" }}>+</button>
            </div>
          </div>
        ))}
        <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#666", fontSize: 13 }}>👤 시민 (자동)</span>
          <span style={{ fontWeight: 700, color: citizenCount < 0 ? "#e74c3c" : "#2ecc71" }}>
            {citizenCount < 0 ? "초과!" : `${citizenCount}명`}
          </span>
        </div>
      </Card>

      <Btn onClick={create} color="#8B0000" disabled={!isValid}>방 생성하기 →</Btn>
    </PageWrap>
  );
}

// ── 방 참가 (플레이어) ──
function JoinScreen({ onJoined }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const join = () => {
    if (!name.trim() || code.length < 4) return;
    onValue(ref(db, `rooms/${code.toUpperCase()}`), async (snap) => {
      const room = snap.val();
      if (!room) { setError("방을 찾을 수 없어요!"); return; }
      if (room.status !== "waiting") { setError("이미 시작된 게임이에요!"); return; }
      const pid = Date.now().toString();
      await update(ref(db, `rooms/${code.toUpperCase()}/players/${pid}`), { name: name.trim(), alive: true });
      onJoined(code.toUpperCase(), pid);
    }, { onlyOnce: true });
  };

  return (
    <PageWrap>
      <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 24 }}>🚪 방 참가</h2>
      <Card>
        <p style={{ color: "#666", fontSize: 11, marginBottom: 8 }}>닉네임</p>
        <input style={{ width: "100%", padding: "13px 16px", background: "#1a1a1a", color: "#fff", border: "1px solid #2a2a2a", borderRadius: 12, fontSize: 15, fontFamily: "'Noto Sans KR', sans-serif", boxSizing: "border-box", outline: "none", marginBottom: 16 }}
          placeholder="이름을 입력하세요" value={name} onChange={e => setName(e.target.value)} />
        <p style={{ color: "#666", fontSize: 11, marginBottom: 8 }}>방 코드</p>
        <input style={{ width: "100%", padding: "13px 16px", background: "#1a1a1a", color: "#fff", border: "1px solid #2a2a2a", borderRadius: 12, fontSize: 24, fontFamily: "'Noto Sans KR', sans-serif", boxSizing: "border-box", textAlign: "center", letterSpacing: 8, outline: "none", textTransform: "uppercase" }}
          placeholder="ABCD" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={4} />
        {error && <p style={{ color: "#e74c3c", fontSize: 12, marginTop: 8 }}>{error}</p>}
      </Card>
      <Btn onClick={join} color="#1a3a6b" disabled={!name.trim() || code.length < 4}>입장하기 →</Btn>
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
    <PageWrap>
      <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 6, textAlign: "center" }}>🃏 내 역할 확인</h2>
      <p style={{ color: "#555", fontSize: 13, marginBottom: 32, textAlign: "center" }}>혼자만 확인하세요!</p>
      {!revealed ? (
        <div onClick={() => setRevealed(true)} style={{
          width: 200, height: 280, margin: "0 auto 32px",
          background: "linear-gradient(135deg, #1a0000, #0d0d0d)",
          border: "2px solid #3a0000", borderRadius: 24,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          cursor: "pointer", boxShadow: "0 8px 40px #8B000033",
        }}>
          <span style={{ fontSize: 56 }}>🃏</span>
          <p style={{ color: "#5a0000", fontSize: 13, marginTop: 16, letterSpacing: 2 }}>탭해서 확인</p>
        </div>
      ) : ri ? (
        <div style={{
          width: 200, height: 280, margin: "0 auto 32px",
          background: `linear-gradient(160deg, ${ri.bg}, #000)`,
          border: `2px solid ${ri.border}`, borderRadius: 24,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: 24, boxSizing: "border-box", boxShadow: `0 8px 40px ${ri.color}33`,
        }}>
          <span style={{ fontSize: 52 }}>{ri.emoji}</span>
          <h3 style={{ color: ri.color, fontSize: 22, fontWeight: 900, margin: "14px 0 8px" }}>{ri.name}</h3>
          <p style={{ color: "#888", fontSize: 11, textAlign: "center", lineHeight: 1.7 }}>{ri.desc}</p>
          <span style={{ marginTop: 12, fontSize: 11, color: ri.team === "mafia" ? "#e74c3c" : "#2ecc71", background: ri.team === "mafia" ? "#1a000066" : "#00100066", padding: "3px 10px", borderRadius: 20 }}>
            {ri.team === "mafia" ? "🔴 마피아 팀" : "🔵 시민 팀"}
          </span>
        </div>
      ) : <p style={{ color: "#555" }}>역할 불러오는 중...</p>}
      {revealed && ri && <Btn onClick={confirm} color="#2ecc71">확인했어요 ✓</Btn>}
    </PageWrap>
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
  const votes = room.votes || {};
  const nightActions = room.nightActions || {};

  // 마피아 동의 현황
  const aliveMafiaEntries = playerEntries.filter(([, p]) => isMafia(p.role) && p.alive);
  const allMafiaAgreed = aliveMafiaEntries.length > 0 && aliveMafiaEntries.every(([, p]) => p.mafiaAgreed);
  const mafiaFinalTarget = aliveMafiaEntries[0]?.[1]?.mafiaVote;

  // 투표 집계
  const voteCounts = {};
  Object.values(votes).forEach(v => { if (v) voteCounts[v] = (voteCounts[v] || 0) + 1; });

  const processNight = async () => {
    const doctorTarget = nightActions.doctor;
    const policeTarget = nightActions.police;
    const reporterTarget = nightActions.reporter;
    const mafiaTarget = allMafiaAgreed ? mafiaFinalTarget : null;

    const updates = {};
    let killed = null;

    if (mafiaTarget && mafiaTarget !== doctorTarget) {
      updates[`rooms/${code}/players/${mafiaTarget}/alive`] = false;
      updates[`rooms/${code}/players/${mafiaTarget}/deathRound`] = round;
      killed = mafiaTarget;
    }

    if (policeTarget) {
      const targetRole = playersMap[policeTarget]?.role;
      updates[`rooms/${code}/policeResult`] = {
        round, targetId: policeTarget,
        targetName: playersMap[policeTarget]?.name,
        result: targetRole === "mafiaBoss" ? "시민" : isMafia(targetRole) ? "마피아" : "시민",
      };
    }

    if (reporterTarget) {
      const targetRole = playersMap[reporterTarget]?.role;
      updates[`rooms/${code}/reporterReveal`] = {
        round, targetId: reporterTarget,
        targetName: playersMap[reporterTarget]?.name,
        result: isMafia(targetRole) ? "마피아" : "시민",
      };
    }

    aliveMafiaEntries.forEach(([id]) => {
      updates[`rooms/${code}/players/${id}/mafiaVote`] = null;
      updates[`rooms/${code}/players/${id}/mafiaAgreed`] = null;
    });

    updates[`rooms/${code}/lastDeath`] = killed
      ? { round, playerId: killed, playerName: playersMap[killed]?.name, role: playersMap[killed]?.role }
      : { round, playerId: null };
    updates[`rooms/${code}/phase`] = "day";
    updates[`rooms/${code}/round`] = round + 1;
    updates[`rooms/${code}/nightActions`] = null;

    const updatedPlayers = { ...playersMap };
    if (killed) updatedPlayers[killed] = { ...updatedPlayers[killed], alive: false };
    const win = checkWin(updatedPlayers);
    if (win) { updates[`rooms/${code}/winner`] = win; onEnd(win); }

    await update(ref(db), updates);
  };

  const processVote = async () => {
    if (room.lawyerBlock) {
      await update(ref(db, `rooms/${code}`), { phase: "night", votes: null, lawyerBlock: null, lastExecution: { round, playerId: null, blocked: true } });
      return;
    }
    let maxVotes = 0, executed = null;
    Object.entries(voteCounts).forEach(([id, cnt]) => { if (cnt > maxVotes) { maxVotes = cnt; executed = id; } });
    const topCount = Object.values(voteCounts).filter(c => c === maxVotes).length;
    if (topCount > 1) executed = null;

    const updates = {};
    if (executed) {
      updates[`rooms/${code}/players/${executed}/alive`] = false;
      updates[`rooms/${code}/lastExecution`] = { round, playerId: executed, playerName: playersMap[executed]?.name, role: playersMap[executed]?.role };
    } else {
      updates[`rooms/${code}/lastExecution`] = { round, playerId: null };
    }
    updates[`rooms/${code}/phase`] = "night";
    updates[`rooms/${code}/votes`] = null;
    updates[`rooms/${code}/lawyerBlock`] = null;

    const updatedPlayers = { ...playersMap };
    if (executed) updatedPlayers[executed] = { ...updatedPlayers[executed], alive: false };
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <p style={{ color: "#8B0000", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 2 }}>🎙️ 사회자 뷰</p>
          <p style={{ fontSize: 20, fontWeight: 900, color: isNight ? "#3498db" : phase === "vote" ? "#e74c3c" : "#f1c40f" }}>
            {isNight ? "🌙 밤" : phase === "vote" ? "🗳️ 투표" : "☀️ 낮"} {round}라운드
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {phase === "day" && (
            <>
              <button type="button" onClick={() => update(ref(db, `rooms/${code}`), { phase: "vote" })}
                style={{ padding: "10px 16px", background: "#1a0000", color: "#e74c3c", border: "1px solid #3a0000", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans KR', sans-serif" }}>
                🗳️ 투표
              </button>
              <button type="button" onClick={() => update(ref(db, `rooms/${code}`), { phase: "night" })}
                style={{ padding: "10px 16px", background: "#00091a", color: "#3498db", border: "1px solid #1a3a5c", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans KR', sans-serif" }}>
                🌙 밤으로
              </button>
            </>
          )}
          {isNight && (
            <button type="button" onClick={processNight}
              style={{ padding: "10px 16px", background: "#001a00", color: "#2ecc71", border: "1px solid #1a5c2a", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans KR', sans-serif" }}>
              ☀️ 밤 종료 {allMafiaAgreed ? "🎯" : "⚠️"}
            </button>
          )}
          {phase === "vote" && (
            <button type="button" onClick={processVote}
              style={{ padding: "10px 16px", background: "#1a0000", color: "#e74c3c", border: "1px solid #3a0000", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans KR', sans-serif" }}>
              ⚖️ {room.lawyerBlock ? "처형 취소(변호사)" : "처형"}
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
                    {p.mafiaAgreed && " ✓동의"}
                  </p>
                )}
                {/* 특수역할 행동 */}
                {isNight && p.alive && p.role === "doctor" && (
                  <p style={{ fontSize: 11, color: "#2ecc71", marginTop: 4 }}>⚕️ {nightActions.doctor ? `→ ${playersMap[nightActions.doctor]?.name}` : "미선택"}</p>
                )}
                {isNight && p.alive && p.role === "police" && (
                  <p style={{ fontSize: 11, color: "#3498db", marginTop: 4 }}>🚔 {nightActions.police ? `→ ${playersMap[nightActions.police]?.name}` : "미선택"}</p>
                )}
                {isNight && p.alive && p.role === "reporter" && (
                  <p style={{ fontSize: 11, color: "#f1c40f", marginTop: 4 }}>📰 {nightActions.reporter ? `→ ${playersMap[nightActions.reporter]?.name}` : room.reporterReveal ? "사용 완료" : "미선택"}</p>
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
        <Card style={{ border: "1px solid #1a1a3a", background: "#05050f", maxWidth: "100%" }}>
          <p style={{ color: "#3498db", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>🌙 밤 행동 요약</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <p style={{ color: "#e74c3c", fontSize: 11, marginBottom: 4 }}>🔫 마피아 타겟</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: allMafiaAgreed ? "#fff" : "#555" }}>
                {allMafiaAgreed ? (playersMap[mafiaFinalTarget]?.name || "미정") : "동의 대기중..."}
              </p>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <p style={{ color: "#2ecc71", fontSize: 11, marginBottom: 4 }}>⚕️ 의사 보호</p>
              <p style={{ fontSize: 14, fontWeight: 700 }}>{nightActions.doctor ? playersMap[nightActions.doctor]?.name : "—"}</p>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <p style={{ color: "#3498db", fontSize: 11, marginBottom: 4 }}>🚔 경찰 조사</p>
              <p style={{ fontSize: 14, fontWeight: 700 }}>{nightActions.police ? playersMap[nightActions.police]?.name : "—"}</p>
            </div>
            {!room.reporterReveal && (
              <div style={{ flex: 1, minWidth: 140 }}>
                <p style={{ color: "#f1c40f", fontSize: 11, marginBottom: 4 }}>📰 기자 공개</p>
                <p style={{ fontSize: 14, fontWeight: 700 }}>{nightActions.reporter ? playersMap[nightActions.reporter]?.name : "—"}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 변호사 이의 */}
      {phase === "vote" && room.lawyerBlock && (
        <Card style={{ border: "1px solid #3a1a5c", background: "#0d0018", maxWidth: "100%" }}>
          <p style={{ color: "#9b59b6", fontWeight: 700 }}>⚖️ 변호사가 이의를 제기했습니다! 처형이 취소됩니다.</p>
        </Card>
      )}

      {/* 사망자 */}
      {deadPlayers.length > 0 && (
        <Card style={{ background: "#0d0d0d", maxWidth: "100%" }}>
          <p style={{ color: "#444", fontSize: 12, marginBottom: 10 }}>💀 사망자</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {deadPlayers.map(([id, p]) => (
              <span key={id} style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#3a3a3a" }}>
                {p.name} ({p.role ? ROLES_INFO[p.role]?.emoji + " " + ROLES_INFO[p.role]?.name : "?"})
              </span>
            ))}
          </div>
        </Card>
      )}
    </PageWrap>
  );
}

// ── 플레이어 게임 화면 ──
function PlayerGameScreen({ code, playerId, myRole, onWin }) {
  const [room, setRoom] = useState(null);
  const [voteTarget, setVoteTarget] = useState(null);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [policeResult, setPoliceResult] = useState(null);
  const [nightTarget, setNightTarget] = useState(null);
  const [nightSubmitted, setNightSubmitted] = useState(false);
  const [lawyerUsed, setLawyerUsed] = useState(false);

  const ri = myRole ? ROLES_INFO[myRole] : null;

  useEffect(() => onValue(ref(db, `rooms/${code}`), snap => {
    const r = snap.val();
    setRoom(r);
    if (r?.winner) onWin(r.winner);
  }), [code]);

  useEffect(() => {
    setVoteTarget(null); setVoteSubmitted(false);
    setPoliceResult(null); setNightTarget(null); setNightSubmitted(false);
  }, [room?.phase, room?.round]);

  if (!room) return <PageWrap><p style={{ color: "#555" }}>로딩 중...</p></PageWrap>;

  const playersMap = room.players || {};
  const playerEntries = Object.entries(playersMap);
  const alivePlayers = playerEntries.filter(([, p]) => p.alive);
  const deadPlayers = playerEntries.filter(([, p]) => !p.alive);
  const phase = room.phase || "day";
  const round = room.round || 1;
  const isNight = phase === "night";
  const amAlive = playersMap[playerId]?.alive;
  const amMafia = isMafia(myRole);

  const aliveMafiaIds = playerEntries.filter(([, p]) => isMafia(p.role) && p.alive).map(([id]) => id);
  const mafiaTeam = playerEntries.filter(([id, p]) => isMafia(p.role) && p.alive && id !== playerId);
  const myMafiaVote = playersMap[playerId]?.mafiaVote;
  const myMafiaAgreed = playersMap[playerId]?.mafiaAgreed;
  const reporterAlreadyUsed = !!room.reporterReveal;
  const needsNightAction = ["doctor", "police", "reporter"].includes(myRole) && !(myRole === "reporter" && reporterAlreadyUsed);

  const submitVote = async (targetId) => {
    if (voteSubmitted || !amAlive) return;
    await set(ref(db, `rooms/${code}/votes/${playerId}`), targetId);
    setVoteTarget(targetId); setVoteSubmitted(true);
  };

  const submitNightAction = async (targetId) => {
    if (nightSubmitted || !amAlive) return;
    let actionKey = myRole === "doctor" ? "doctor" : myRole === "police" ? "police" : myRole === "reporter" ? "reporter" : null;
    if (!actionKey) return;
    await update(ref(db, `rooms/${code}/nightActions`), { [actionKey]: targetId });
    if (myRole === "police") {
      const targetRole = playersMap[targetId]?.role;
      setPoliceResult({ name: playersMap[targetId]?.name, result: targetRole === "mafiaBoss" ? "시민" : isMafia(targetRole) ? "마피아" : "시민" });
    }
    setNightTarget(targetId); setNightSubmitted(true);
  };

  const selectMafiaTarget = async (targetId) => {
    await update(ref(db, `rooms/${code}/players/${playerId}`), { mafiaVote: targetId, mafiaAgreed: false });
  };

  const agreeMafiaTarget = async () => {
    if (!myMafiaVote) return;
    await update(ref(db, `rooms/${code}/players/${playerId}`), { mafiaAgreed: true });
  };

  const cancelMafiaAgree = async () => {
    await update(ref(db, `rooms/${code}/players/${playerId}`), { mafiaAgreed: false });
  };

  const useLawyer = async () => {
    if (lawyerUsed || room.lawyerUsed) return;
    await update(ref(db, `rooms/${code}`), { lawyerBlock: true, lawyerUsed: true });
    setLawyerUsed(true);
  };

  const lastDeath = room.lastDeath;
  const lastExecution = room.lastExecution;

  return (
    <PageWrap night={isNight}>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <p style={{ color: "#555", fontSize: 11, marginBottom: 2 }}>{isNight ? "🌙 밤" : phase === "vote" ? "🗳️ 투표" : "☀️ 낮"} {round}라운드</p>
          <p style={{ fontSize: 18, fontWeight: 900, color: isNight ? "#3498db" : phase === "vote" ? "#e74c3c" : "#f1c40f" }}>
            {isNight ? "밤이 찾아왔습니다" : phase === "vote" ? "처형 투표" : "낮 토론 시간"}
          </p>
        </div>
        <div style={{ background: ri?.bg || "#111", border: `1px solid ${ri?.border || "#333"}`, borderRadius: 12, padding: "8px 14px", textAlign: "center" }}>
          <p style={{ fontSize: 18 }}>{ri?.emoji}</p>
          <p style={{ fontSize: 11, color: ri?.color, fontWeight: 700 }}>{ri?.name}</p>
        </div>
      </div>

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

      {phase === "day" && room.reporterReveal?.round === round - 1 && (
        <Card style={{ border: "1px solid #5c4a00", background: "#1a1400" }}>
          <p style={{ color: "#f1c40f", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📰 기자 속보!</p>
          <p style={{ fontSize: 15 }}><strong>{room.reporterReveal.targetName}</strong>님의 직업은{" "}
            <span style={{ color: room.reporterReveal.result === "마피아" ? "#e74c3c" : "#2ecc71", fontWeight: 900, fontSize: 17 }}>{room.reporterReveal.result}</span>입니다!</p>
        </Card>
      )}

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

      {myRole === "police" && policeResult && (
        <Card style={{ border: "1px solid #1a3a5c", background: "#00091a" }}>
          <p style={{ color: "#3498db", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🚔 조사 결과 (나만 보여요)</p>
          <p style={{ fontSize: 15 }}><strong>{policeResult.name}</strong>님은{" "}
            <span style={{ color: policeResult.result === "마피아" ? "#e74c3c" : "#2ecc71", fontWeight: 900, fontSize: 17 }}>{policeResult.result}</span>입니다!</p>
        </Card>
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
        <Card style={{ border: "1px solid #5a0000", background: "#0d0000" }}>
          <p style={{ color: "#e74c3c", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>🔫 마피아 팀 (나만 보여요)</p>
          {mafiaTeam.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ color: "#666", fontSize: 11, marginBottom: 6 }}>팀원</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {mafiaTeam.map(([id, p]) => (
                  <span key={id} style={{ background: "#1a0000", border: "1px solid #3a0000", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#e74c3c" }}>
                    {ROLES_INFO[p.role]?.emoji} {p.name}
                    {p.mafiaVote && ` → ${playersMap[p.mafiaVote]?.name}`}
                    {p.mafiaAgreed && " ✓"}
                  </span>
                ))}
              </div>
            </div>
          )}
          <p style={{ color: "#666", fontSize: 11, marginBottom: 8 }}>제거할 대상</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {alivePlayers.filter(([id]) => !isMafia(playersMap[id]?.role)).map(([id, p]) => (
              <div key={id} onClick={() => selectMafiaTarget(id)} style={{
                padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                background: myMafiaVote === id ? "#2a0000" : "#1a1a1a",
                border: `1px solid ${myMafiaVote === id ? "#8B0000" : "#222"}`,
                display: "flex", alignItems: "center",
              }}>
                <span style={{ flex: 1, fontSize: 13 }}>{p.name}</span>
                {myMafiaVote === id && <span style={{ color: "#e74c3c", fontSize: 11 }}>✓ 내 선택</span>}
              </div>
            ))}
          </div>
          {myMafiaVote && !myMafiaAgreed && (
            <Btn onClick={agreeMafiaTarget} color="#8B0000" style={{ marginBottom: 6 }}>✅ {playersMap[myMafiaVote]?.name} 제거에 동의</Btn>
          )}
          {myMafiaAgreed && (
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, padding: "12px", background: "#001a00", border: "1px solid #1a5c2a", borderRadius: 12, textAlign: "center", color: "#2ecc71", fontSize: 13, fontWeight: 700 }}>✅ 동의 완료</div>
              <button type="button" onClick={cancelMafiaAgree} style={{ padding: "12px 16px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 12, color: "#666", fontSize: 12, cursor: "pointer", fontFamily: "'Noto Sans KR', sans-serif" }}>취소</button>
            </div>
          )}
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
            const isNightSelected = nightTarget === id;
            const canClick = !isMe && amAlive && (
              (phase === "vote" && !voteSubmitted) ||
              (isNight && !nightSubmitted && needsNightAction && !amMafia)
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
        {isNight && amAlive && amMafia && <p style={{ color: "#e74c3c", fontSize: 13 }}>🔫 위 마피아 패널에서 대상을 선택하고 동의하세요.</p>}
        {isNight && amAlive && !amMafia && !needsNightAction && <p style={{ color: "#666", fontSize: 13 }}>👤 눈을 감고 기다리세요...</p>}
        {isNight && amAlive && myRole === "reporter" && reporterAlreadyUsed && <p style={{ color: "#5c4a00", fontSize: 13 }}>📰 이미 능력을 사용했습니다.</p>}
        {isNight && amAlive && needsNightAction && !nightSubmitted && (
          <p style={{ color: "#3498db", fontSize: 13 }}>
            {myRole === "doctor" && "⚕️ 보호할 사람을 선택하세요."}
            {myRole === "police" && "🚔 조사할 사람을 선택하세요."}
            {myRole === "reporter" && "📰 공개할 사람을 선택하세요."}
          </p>
        )}
        {isNight && amAlive && needsNightAction && nightSubmitted && <p style={{ color: "#2ecc71", fontSize: 13 }}>✅ 행동 완료! 사회자가 넘길 때까지 기다리세요.</p>}
        {phase === "vote" && !amAlive && <p style={{ color: "#444", fontSize: 13 }}>💀 사망 상태라 투표할 수 없습니다.</p>}
        {phase === "vote" && amAlive && !voteSubmitted && <p style={{ color: "#e74c3c", fontSize: 13 }}>🗳️ 처형할 사람을 선택하세요!</p>}
        {phase === "vote" && amAlive && voteSubmitted && <p style={{ color: "#2ecc71", fontSize: 13 }}>✅ 투표 완료! ({playersMap[voteTarget]?.name}에게 투표)</p>}
      </Card>
    </PageWrap>
  );
}

// ── 승리 화면 ──
function WinScreen({ winner, myRole, isHost, onRestart }) {
  const isMafiaWin = winner === "mafia";
  const myTeam = myRole ? ROLES_INFO[myRole]?.team : null;
  const iWon = isHost ? false : myTeam === winner;
  return (
    <div style={{ minHeight: "100vh", background: isMafiaWin ? "radial-gradient(ellipse at top, #2a0000, #000)" : "radial-gradient(ellipse at top, #002a00, #000)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Noto Sans KR', sans-serif", padding: 32, textAlign: "center" }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>{isMafiaWin ? "🔫" : "⚖️"}</div>
      <h1 style={{ fontSize: 40, fontWeight: 900, color: isMafiaWin ? "#e74c3c" : "#2ecc71", marginBottom: 10 }}>
        {isMafiaWin ? "마피아 승리!" : "시민 승리!"}
      </h1>
      <p style={{ fontSize: 18, color: isHost ? "#888" : iWon ? "#ffd700" : "#666", marginBottom: 48 }}>
        {isHost ? "🎙️ 게임이 종료됐습니다" : iWon ? "🏆 당신이 이겼어요!" : "😢 아쉽게 졌어요..."}
      </p>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <Btn onClick={onRestart} color="#8B0000">🔄 다시 하기</Btn>
      </div>
    </div>
  );
}

// ── 메인 앱 ──
export default function App() {
  const [screen, setScreen] = useState("title");
  const [roomCode, setRoomCode] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [myRole, setMyRole] = useState(null);
  const [winner, setWinner] = useState(null);
  const [isHost, setIsHost] = useState(false);

  const reset = () => { setScreen("title"); setMyRole(null); setWinner(null); setRoomCode(""); setPlayerId(""); setIsHost(false); };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet" />
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
        <WinScreen winner={winner} myRole={myRole} isHost={isHost} onRestart={reset} />
      )}
    </>
  );
}