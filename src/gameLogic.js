// ── 순수 게임 로직 (Firebase 의존성 없음, 테스트 가능) ──

// 할로윈 버전: 역할 id(코드)는 그대로 두고 이름/이모지/설명만 할로윈 테마로 바꿨다.
// 기존 역할 이미지는 테마와 맞지 않아 빼두었다 (image가 없으면 이모지로 표시된다).
export const ROLES_INFO = {
  mafia:     { name: "뱀파이어",      emoji: "🧛", color: "#ff7518", bg: "#1a0a00", border: "#6a2a00", team: "mafia",   desc: "밤마다 마을 사람 한 명을 습격하세요! 보름달이 뜨는 밤(3라운드마다)에는 두 명을 노릴 수 있습니다.", image: null },
  mafiaBoss: { name: "뱀파이어 군주", emoji: "🦇", color: "#ff7518", bg: "#1a0a00", border: "#6a2a00", team: "mafia",   desc: "유령 사냥꾼의 조사에 마을 주민으로 위장됩니다! (은탄환은 피할 수 없어요)", image: null },
  police:    { name: "유령 사냥꾼",   emoji: "🔦", color: "#3498db", bg: "#00091a", border: "#1a3a5c", team: "citizen", desc: "매 밤 한 명을 조사해 뱀파이어인지 확인하세요. 단 한 번 은탄환을 쏠 수 있습니다. 뱀파이어면 그 자가 죽고, 아니면 당신이 죽습니다!", image: null },
  doctor:    { name: "연금술사",      emoji: "🧪", color: "#2ecc71", bg: "#001a0a", border: "#1a5c2a", team: "citizen", desc: "매 밤 한 명에게 물약을 주어 뱀파이어의 습격을 막으세요.", image: null },
  reporter:  { name: "점술가",        emoji: "🔮", color: "#b48ade", bg: "#120a1a", border: "#4a2a6a", team: "citizen", desc: "단 한 번, 수정구로 한 명의 정체를 모두에게 공개할 수 있습니다.", image: null },
  lawyer:    { name: "수호 마녀",     emoji: "🧹", color: "#9b59b6", bg: "#0d001a", border: "#3a1a5c", team: "citizen", desc: "단 한 번, 처형 예정인 플레이어를 마법으로 구할 수 있습니다.", image: null },
  citizen:   { name: "마을 주민",     emoji: "🧑‍🌾", color: "#95a5a6", bg: "#111",    border: "#2a2a2a", team: "citizen", desc: "뱀파이어를 찾아내어 처형하세요! 죽어도 유령이 되어 마을을 도울 수 있습니다.", image: null },
  terrorist: { name: "폭탄 허수아비", emoji: "🧨", color: "#e67e22", bg: "#1a0d00", border: "#5c3300", team: "citizen", desc: "처형당하면 미리 정해둔 대상과 함께 사망합니다!", image: null },
  priest:    { name: "퇴마사",        emoji: "✝️", color: "#ecf0f1", bg: "#0a0a0a", border: "#4a4a4a", team: "citizen", desc: "단 한 번, 죽은 사람을 부활시킬 수 있습니다.", image: null },
  jester:    { name: "잭오랜턴",      emoji: "🎃", color: "#e84393", bg: "#1a0014", border: "#5c004a", team: "jester",  desc: "처형당하면 혼자 승리합니다! 의심받도록 행동하세요.", image: null },
  framer:    { name: "저주 인형사",   emoji: "🪆", color: "#ff7518", bg: "#1a0a00", border: "#6a2a00", team: "mafia",   desc: "매 밤 한 명에게 저주를 걸어 유령 사냥꾼의 조사 결과를 \"뱀파이어\"로 조작하세요.", image: null },
  bomber:    { name: "독거미",        emoji: "🕷️", color: "#ff7518", bg: "#1a0a00", border: "#6a2a00", team: "mafia",   desc: "처형당하면 찬성표를 던진 사람 중 한 명이 독에 물려 함께 사망합니다!", image: null },
};

export const isMafia = (role) => role === "mafia" || role === "mafiaBoss" || role === "framer" || role === "bomber";
export const revealRole = (role) => isMafia(role) ? `${ROLES_INFO.mafia.emoji} ${ROLES_INFO.mafia.name}` : `${ROLES_INFO.citizen.emoji} ${ROLES_INFO.citizen.name}`;

const defaultPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 🌕 보름달 밤: 3라운드마다 뱀파이어가 두 명을 노릴 수 있다.
export const isFullMoon = (round) => round % 3 === 0;

// 낮 투표 가중치: 유령에게 오싹해진 사람/장난에 걸린 사람은 0표, 사탕을 받은 사람은 2표.
export function voteWeight(pid, { round, spooked, trickOrTreat }) {
  if (spooked?.round === round && spooked.playerId === pid) return 0;
  if (trickOrTreat?.round === round && trickOrTreat.playerId === pid) return trickOrTreat.type === "treat" ? 2 : 0;
  return 1;
}

// 지목 투표 집계 ({투표자: 대상} → {대상: 가중 득표수})
export function tallyVotes(votes, ctx) {
  const counts = {};
  Object.entries(votes || {}).forEach(([voter, target]) => {
    if (!target) return;
    const w = voteWeight(voter, ctx);
    if (w > 0) counts[target] = (counts[target] || 0) + w;
  });
  return counts;
}

// 처형 확인 투표 집계 (찬성/반대 가중 합계)
export function countConfirm(confirmVotes, ctx) {
  let yes = 0, no = 0;
  Object.entries(confirmVotes || {}).forEach(([voter, v]) => {
    const w = voteWeight(voter, ctx);
    if (v === "yes") yes += w;
    if (v === "no") no += w;
  });
  return { yes, no };
}

// 뱀파이어 습격 대상: 살아있는 뱀파이어팀의 표(보름달엔 두 번째 표 포함)를 모아 상위 1명(보름달 2명)을 고른다.
export function pickMafiaTargets(playersMap, fullMoon) {
  const counts = {};
  Object.values(playersMap).forEach(p => {
    if (!isMafia(p.role) || !p.alive) return;
    const picks = fullMoon ? [p.mafiaVote, p.mafiaVote2] : [p.mafiaVote];
    picks.forEach(t => { if (t) counts[t] = (counts[t] || 0) + 1; });
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, fullMoon ? 2 : 1).map(([id]) => id);
}

// 🍬 트릭 오어 트릿: 낮이 시작될 때 살아있는 사람 중 한 명에게 사탕(2표) 또는 장난(투표 불가)을 준다.
export function rollTrickOrTreat({ playersMap, round, rand = Math.random }) {
  const alive = Object.entries(playersMap).filter(([, p]) => p.alive);
  if (alive.length === 0) return null;
  const [playerId, p] = alive[Math.floor(rand() * alive.length)];
  return { round, playerId, playerName: p.name, type: rand() < 0.5 ? "treat" : "trick" };
}

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
// mafiaTargets(보름달엔 최대 2명)를 받으며, 기존 호출 호환을 위해 mafiaTarget 단일 값도 받는다.
// deaths: 이번 밤에 죽은 사람 전체 [{ playerId, cause }], killed: 뱀파이어 습격으로 죽은 첫 번째 사람 (호환용)
export function resolveNight({ playersMap, nightActions, round, mafiaTarget, mafiaTargets, pickRandom = defaultPick }) {
  const targets = (mafiaTargets || (mafiaTarget ? [mafiaTarget] : [])).filter(Boolean);
  const doctorActions = nightActions.doctor || {};
  const policeActions = nightActions.police || {};
  const reporterActions = nightActions.reporter || {};
  const priestActions = nightActions.priest || {};
  const framerActions = nightActions.framer || {};
  const silverActions = nightActions.silver || {};
  const ghostActions = nightActions.ghost || {};

  const protectedSet = new Set(Object.values(doctorActions).filter(Boolean));
  const framedSet = new Set(Object.values(framerActions).filter(Boolean));

  const updates = {};
  const logEntries = [];
  const deaths = [];
  const deadSet = new Set();
  let killed = null;
  const revivedIds = [];

  const kill = (id, cause) => {
    if (deadSet.has(id)) return;
    deadSet.add(id);
    deaths.push({ playerId: id, cause });
    updates[`players/${id}/alive`] = false;
    updates[`players/${id}/deathRound`] = round;
  };

  // 퇴마사 부활 (여러 명이어도 각자 독립적으로 처리)
  Object.entries(priestActions).forEach(([priestId, targetId]) => {
    if (!targetId) return;
    const target = playersMap[targetId];
    if (target && !target.alive) {
      updates[`players/${targetId}/alive`] = true;
      updates[`players/${priestId}/priestUsed`] = true;
      updates[`priestRevives/${priestId}`] = { round, targetId, targetName: target.name };
      revivedIds.push(targetId);
      logEntries.push(`✝️ 퇴마사가 ${target.name}을(를) 무덤에서 되살렸습니다`);
    }
  });

  // 뱀파이어 습격 (연금술사 보호 대상 집합으로 판정)
  if (targets.length === 0) {
    logEntries.push(`🌙 뱀파이어가 아무도 습격하지 않았습니다`);
  }
  targets.forEach(t => {
    if (protectedSet.has(t)) {
      logEntries.push(`🧛 뱀파이어가 누군가를 노렸지만 연금술사의 물약이 막아냈습니다`);
    } else {
      kill(t, "vampire");
      if (!killed) killed = t;
      logEntries.push(`🧛 뱀파이어가 ${playersMap[t]?.name}을(를) 습격했습니다`);
    }
  });

  if (protectedSet.size > 0 && !targets.some(t => protectedSet.has(t))) {
    logEntries.push(`🧪 연금술사가 밤사이 누군가에게 물약을 건넸습니다`);
  }

  // 🔦 은탄환 (사냥꾼별 1회): 뱀파이어팀이면 대상이 죽고, 아니면 사냥꾼 본인이 죽는다. 물약으로 막을 수 없다.
  Object.entries(silverActions).forEach(([hunterId, targetId]) => {
    if (!targetId || !playersMap[hunterId] || !playersMap[targetId]?.alive) return;
    updates[`players/${hunterId}/silverUsed`] = true;
    if (isMafia(playersMap[targetId].role)) {
      kill(targetId, "silver");
      logEntries.push(`🔫 은탄환이 명중했습니다! 뱀파이어 ${playersMap[targetId].name}이(가) 재가 되어 사라졌습니다`);
    } else {
      kill(hunterId, "misfire");
      logEntries.push(`🔫 은탄환이 빗나갔습니다... 유령 사냥꾼 ${playersMap[hunterId].name}이(가) 저주를 받아 쓰러졌습니다`);
    }
  });

  // 유령 사냥꾼 조사 (각자 개별 결과, 저주 인형사가 지목한 대상이면 조작된 결과)
  Object.entries(policeActions).forEach(([policeId, targetId]) => {
    if (!targetId) return;
    const targetRole = playersMap[targetId]?.role;
    const isFramed = framedSet.has(targetId);
    const result = isFramed ? "뱀파이어" : targetRole === "mafiaBoss" ? "사람" : isMafia(targetRole) ? "뱀파이어" : "사람";
    updates[`policeResults/${policeId}`] = {
      round, targetId,
      targetName: playersMap[targetId]?.name,
      result,
    };
  });
  if (Object.keys(policeActions).length > 0) {
    logEntries.push(`🔦 유령 사냥꾼이 밤사이 누군가를 조사했습니다`);
  }

  // 점술가 공개 (여러 명이어도 각자 1회씩 독립적으로 공개 가능)
  Object.entries(reporterActions).forEach(([reporterId, targetId]) => {
    if (!targetId) return;
    const targetRole = playersMap[targetId]?.role;
    const result = ROLES_INFO[targetRole]?.name || ROLES_INFO.citizen.name;
    updates[`players/${reporterId}/reporterUsed`] = true;
    updates[`reporterReveals/${reporterId}`] = {
      round, targetId,
      targetName: playersMap[targetId]?.name,
      result,
      isMafiaTeam: isMafia(targetRole),
    };
    logEntries.push(`🔮 점술가가 ${playersMap[targetId]?.name}의 정체를 공개했습니다 (${result})`);
  });

  // 👻 유령: 죽은 사람들이 가장 많이 지목한 산 사람은 다음 낮 투표권을 잃는다 (동률이면 그중 랜덤)
  const ghostCounts = {};
  Object.entries(ghostActions).forEach(([ghostId, targetId]) => {
    if (!targetId || playersMap[ghostId]?.alive || !playersMap[targetId]?.alive) return;
    ghostCounts[targetId] = (ghostCounts[targetId] || 0) + 1;
  });
  const maxGhost = Math.max(0, ...Object.values(ghostCounts));
  const ghostTop = Object.keys(ghostCounts).filter(id => ghostCounts[id] === maxGhost);
  if (ghostTop.length > 0) {
    const spookedId = pickRandom(ghostTop);
    updates.spooked = { round: round + 1, playerId: spookedId, playerName: playersMap[spookedId]?.name };
    logEntries.push(`👻 유령들이 ${playersMap[spookedId]?.name}의 귓가에 속삭였습니다... 오늘 투표를 할 수 없습니다`);
  } else {
    updates.spooked = null;
  }

  return { updates, logEntries, killed, deaths, revivedIds };
}

// 낮 처형 확인 투표 처리. updates 키는 room 루트 기준 상대 경로.
// pickRandom은 테스트에서 결정론적으로 주입할 수 있도록 분리했다 (기본값: Math.random 기반).
export function resolveConfirm({ playersMap, executed, yesCount, noCount, majority, round, confirmVotes = {}, pickRandom = defaultPick }) {
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
        logEntries.push(`🧨 폭탄 허수아비 ${playersMap[executed]?.name}가 처형되며 함께 ${playersMap[target]?.name}을(를) 폭사시켰습니다`);
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
        logEntries.push(`🕷️ 독거미 ${playersMap[executed]?.name}가 처형되며 찬성표를 던진 ${playersMap[target]?.name}을(를) 독으로 물었습니다`);
      }
    }

    if (playersMap[executed]?.role === "jester") {
      jesterWin = true;
      logEntries.push(`🎃 처형된 ${playersMap[executed]?.name}은(는) 잭오랜턴이었습니다! 잭오랜턴의 단독 승리!`);
    }
  } else {
    updates.lastExecution = { round, playerId: null };
    logEntries.push(`🗳️ 반대 ${noCount}표로 ${playersMap[executed]?.name}의 처형이 취소됐습니다`);
  }

  return { updates, logEntries, bombTarget, jesterWin };
}
