// ── 순수 게임 로직 (Firebase 의존성 없음, 테스트 가능) ──

export const ROLES_INFO = {
  mafia:     { name: "마피아",      emoji: "🔫", color: "#e74c3c", bg: "#1a0000", border: "#5a0000", team: "mafia",   desc: "밤마다 시민 한 명을 제거하세요!", image: "/role-mafia.png" },
  mafiaBoss: { name: "마피아 보스", emoji: "👑", color: "#e74c3c", bg: "#1a0000", border: "#5a0000", team: "mafia",   desc: "경찰 조사에 시민으로 위장됩니다!", image: "/role-mafiaboss.png" },
  police:    { name: "경찰",        emoji: "🚔", color: "#3498db", bg: "#00091a", border: "#1a3a5c", team: "citizen", desc: "매 밤 한 명을 조사해 마피아인지 확인하세요.", image: "/role-police.png" },
  doctor:    { name: "의사",        emoji: "⚕️", color: "#2ecc71", bg: "#001a0a", border: "#1a5c2a", team: "citizen", desc: "매 밤 한 명을 보호해 마피아 공격을 막으세요.", image: "/role-doctor.png" },
  reporter:  { name: "기자",        emoji: "📰", color: "#f1c40f", bg: "#1a1400", border: "#5c4a00", team: "citizen", desc: "단 한 번, 한 명의 직업을 모두에게 공개할 수 있습니다.", image: "/role-reporter.png" },
  lawyer:    { name: "변호사",      emoji: "⚖️", color: "#9b59b6", bg: "#0d001a", border: "#3a1a5c", team: "citizen", desc: "단 한 번, 처형 예정인 플레이어를 구할 수 있습니다.", image: "/role-lawyer.png" },
  citizen:   { name: "시민",        emoji: "👤", color: "#95a5a6", bg: "#111",    border: "#2a2a2a", team: "citizen", desc: "마피아를 찾아내어 처형하세요!", image: "/role-citizen.png" },
  terrorist: { name: "테러리스트",  emoji: "🧨", color: "#e67e22", bg: "#1a0d00", border: "#5c3300", team: "citizen", desc: "처형당하면 미리 정해둔 대상과 함께 사망합니다!", image: "/role-terrorist.png" },
  priest:    { name: "성직자",      emoji: "✝️", color: "#ecf0f1", bg: "#0a0a0a", border: "#4a4a4a", team: "citizen", desc: "단 한 번, 죽은 사람을 부활시킬 수 있습니다.", image: "/role-priest.png" },
  jester:    { name: "광대",        emoji: "🤡", color: "#e84393", bg: "#1a0014", border: "#5c004a", team: "jester",  desc: "처형당하면 혼자 승리합니다! 의심받도록 행동하세요.", image: "/role-jester.png" },
  framer:    { name: "모함가",      emoji: "🎭", color: "#c0392b", bg: "#1a0000", border: "#5a0000", team: "mafia",   desc: "매 밤 한 명에게 누명을 씌워 경찰 조사를 조작하세요.", image: "/role-framer.png" },
  bomber:    { name: "폭탄마",      emoji: "💣", color: "#e74c3c", bg: "#1a0000", border: "#5a0000", team: "mafia",   desc: "처형당하면 찬성표를 던진 사람 중 한 명이 함께 사망합니다!", image: null },
};

export const isMafia = (role) => role === "mafia" || role === "mafiaBoss" || role === "framer" || role === "bomber";
export const revealRole = (role) => isMafia(role) ? `${ROLES_INFO[role].emoji} ${ROLES_INFO[role].name}` : "👤 시민";

export function generateCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

// 인원수에 맞춰 밸런스가 맞는 역할 구성을 추천한다.
// 원칙: 마피아팀은 전체 인원의 약 25%를 유지하고, 시민팀 파워롤은 마피아 대비 과하게 쌓이지 않도록 천천히 늘린다.
export function recommendedRoles(playerCount) {
  const mafiaTeamSize = Math.max(1, Math.round(playerCount * 0.25));
  const mafiaBoss = mafiaTeamSize >= 4 ? 1 : 0;
  const framer = mafiaTeamSize >= 8 ? 2 : mafiaTeamSize >= 6 ? 1 : 0;
  const bomber = mafiaTeamSize >= 5 ? 1 : 0;
  const mafia = Math.max(0, mafiaTeamSize - mafiaBoss - framer - bomber);

  const police = playerCount >= 20 ? 2 : 1;
  const doctor = playerCount >= 20 ? 2 : 1;
  const reporter = playerCount >= 12 ? 1 : 0;
  const lawyer = playerCount >= 14 ? 1 : 0;
  const terrorist = playerCount >= 10 ? 1 : 0;
  const priest = playerCount >= 16 ? 1 : 0;
  const jester = playerCount >= 10 ? 1 : 0;

  return { mafia, mafiaBoss, police, doctor, reporter, lawyer, terrorist, priest, jester, framer, bomber };
}

export function shuffleRoles(playerCount, roleConfig, citizenCount) {
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

export function checkWin(players) {
  const alive = Object.values(players).filter(p => p.alive);
  const aliveMafia = alive.filter(p => isMafia(p.role));
  const aliveCitizen = alive.filter(p => !isMafia(p.role) && p.role !== "jester");
  if (aliveMafia.length === 0) return "citizen";
  if (aliveMafia.length >= aliveCitizen.length) return "mafia";
  return null;
}

// 밤 처리: 직업당 여러 명이 배치돼도 정확히 동작하도록 개인별({역할: {플레이어ID: 대상}}) 자료구조를 사용한다.
// updates의 키는 room 루트 기준 상대 경로 (예: "players/abc/alive").
export function resolveNight({ playersMap, nightActions, round, mafiaTarget }) {
  const doctorActions = nightActions.doctor || {};
  const policeActions = nightActions.police || {};
  const reporterActions = nightActions.reporter || {};
  const priestActions = nightActions.priest || {};
  const framerActions = nightActions.framer || {};

  const protectedSet = new Set(Object.values(doctorActions).filter(Boolean));
  const framedSet = new Set(Object.values(framerActions).filter(Boolean));

  const updates = {};
  const logEntries = [];
  let killed = null;
  const revivedIds = [];

  // 성직자 부활 (여러 명이어도 각자 독립적으로 처리)
  Object.entries(priestActions).forEach(([priestId, targetId]) => {
    if (!targetId) return;
    const target = playersMap[targetId];
    if (target && !target.alive) {
      updates[`players/${targetId}/alive`] = true;
      updates[`players/${priestId}/priestUsed`] = true;
      updates[`priestRevives/${priestId}`] = { round, targetId, targetName: target.name };
      revivedIds.push(targetId);
      logEntries.push(`✝️ 성직자가 ${target.name}을(를) 부활시켰습니다`);
    }
  });

  // 마피아 처형 (의사 보호 대상 집합으로 판정)
  if (mafiaTarget && !protectedSet.has(mafiaTarget)) {
    updates[`players/${mafiaTarget}/alive`] = false;
    updates[`players/${mafiaTarget}/deathRound`] = round;
    killed = mafiaTarget;
    logEntries.push(`🔫 마피아가 ${playersMap[mafiaTarget]?.name}을(를) 처형했습니다`);
  } else if (mafiaTarget && protectedSet.has(mafiaTarget)) {
    logEntries.push(`🔫 마피아가 누군가를 노렸지만 의사가 살렸습니다`);
  } else {
    logEntries.push(`🌙 마피아가 아무도 처형하지 않았습니다`);
  }

  if (protectedSet.size > 0 && !protectedSet.has(mafiaTarget)) {
    logEntries.push(`⚕️ 의사가 밤사이 누군가를 보호했습니다`);
  }

  // 경찰 조사 (각자 개별 결과, 모함가가 지목한 대상이면 조작된 결과)
  Object.entries(policeActions).forEach(([policeId, targetId]) => {
    if (!targetId) return;
    const targetRole = playersMap[targetId]?.role;
    const isFramed = framedSet.has(targetId);
    const result = isFramed ? "마피아" : targetRole === "mafiaBoss" ? "시민" : isMafia(targetRole) ? "마피아" : "시민";
    updates[`policeResults/${policeId}`] = {
      round, targetId,
      targetName: playersMap[targetId]?.name,
      result,
    };
  });
  if (Object.keys(policeActions).length > 0) {
    logEntries.push(`🚔 경찰이 밤사이 누군가를 조사했습니다`);
  }

  // 기자 공개 (여러 명이어도 각자 1회씩 독립적으로 공개 가능)
  Object.entries(reporterActions).forEach(([reporterId, targetId]) => {
    if (!targetId) return;
    const targetRole = playersMap[targetId]?.role;
    const result = targetRole === "mafiaBoss" ? "마피아 보스" : isMafia(targetRole) ? "마피아" : ROLES_INFO[targetRole]?.name || "시민";
    updates[`players/${reporterId}/reporterUsed`] = true;
    updates[`reporterReveals/${reporterId}`] = {
      round, targetId,
      targetName: playersMap[targetId]?.name,
      result,
    };
    logEntries.push(`📰 기자가 ${playersMap[targetId]?.name}의 직업을 공개했습니다 (${result})`);
  });

  return { updates, logEntries, killed, revivedIds };
}

// 낮 처형 확인 투표 처리. updates 키는 room 루트 기준 상대 경로.
// pickRandom은 테스트에서 결정론적으로 주입할 수 있도록 분리했다 (기본값: Math.random 기반).
export function resolveConfirm({ playersMap, executed, yesCount, noCount, majority, round, confirmVotes = {}, pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)] }) {
  const updates = {};
  const logEntries = [];
  let bombTarget = null;
  let jesterWin = false;

  if (yesCount >= majority) {
    updates[`players/${executed}/alive`] = false;
    updates.lastExecution = { round, playerId: executed, playerName: playersMap[executed]?.name, role: playersMap[executed]?.role };
    logEntries.push(`🗳️ 찬성 ${yesCount}표로 ${playersMap[executed]?.name}이(가) 처형됐습니다 (${revealRole(playersMap[executed]?.role)})`);

    if (playersMap[executed]?.role === "terrorist") {
      const target = playersMap[executed]?.terroristTarget;
      if (target && playersMap[target]?.alive) {
        bombTarget = target;
        updates[`players/${target}/alive`] = false;
        logEntries.push(`🧨 테러리스트 ${playersMap[executed]?.name}가 처형되며 함께 ${playersMap[target]?.name}을(를) 폭사시켰습니다`);
      }
    }

    if (playersMap[executed]?.role === "bomber") {
      const yesVoters = Object.entries(confirmVotes)
        .filter(([id, v]) => v === "yes" && id !== executed && playersMap[id]?.alive)
        .map(([id]) => id);
      if (yesVoters.length > 0) {
        const target = pickRandom(yesVoters);
        bombTarget = target;
        updates[`players/${target}/alive`] = false;
        logEntries.push(`💣 폭탄마 ${playersMap[executed]?.name}가 처형되며 찬성표를 던진 ${playersMap[target]?.name}을(를) 함께 폭사시켰습니다`);
      }
    }

    if (playersMap[executed]?.role === "jester") {
      jesterWin = true;
      logEntries.push(`🤡 처형된 ${playersMap[executed]?.name}은(는) 광대였습니다! 광대의 단독 승리!`);
    }
  } else {
    updates.lastExecution = { round, playerId: null };
    logEntries.push(`🗳️ 반대 ${noCount}표로 ${playersMap[executed]?.name}의 처형이 취소됐습니다`);
  }

  return { updates, logEntries, bombTarget, jesterWin };
}
