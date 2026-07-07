import { checkWin, resolveNight, resolveConfirm, recommendedRoles } from "./gameLogic";

function basePlayers() {
  return {
    d1: { name: "의사1", role: "doctor", alive: true },
    d2: { name: "의사2", role: "doctor", alive: true },
    p1: { name: "경찰1", role: "police", alive: true },
    p2: { name: "경찰2", role: "police", alive: true },
    m1: { name: "마피아1", role: "mafia", alive: true },
    c1: { name: "시민1", role: "citizen", alive: true },
    c2: { name: "시민2", role: "citizen", alive: true },
  };
}

describe("resolveNight - 의사 다중 배치", () => {
  test("의사 2명이 서로 다른 사람을 보호하면 둘 다 보호 대상으로 인정되어야 한다", () => {
    const playersMap = basePlayers();
    const nightActions = {
      doctor: { d1: "c1", d2: "c2" }, // 의사1은 c1을, 의사2는 c2를 보호
    };
    // 마피아가 c1을 노림 -> 의사1의 보호가 유효해야 함 (죽지 않아야 함)
    const { updates, killed } = resolveNight({ playersMap, nightActions, round: 1, mafiaTarget: "c1" });
    expect(killed).toBeNull();
    expect(updates["players/c1/alive"]).toBeUndefined();
  });

  test("의사 2명 중 한 명만 마피아 타겟을 보호하지 못하면 사망해야 한다", () => {
    const playersMap = basePlayers();
    const nightActions = {
      doctor: { d1: "c1", d2: "c2" },
    };
    // 마피아가 c1도 c2도 아닌 다른 시민을 노림 -> 보호 대상이 아니므로 사망
    playersMap.c3 = { name: "시민3", role: "citizen", alive: true };
    const { updates, killed } = resolveNight({ playersMap, nightActions, round: 1, mafiaTarget: "c3" });
    expect(killed).toBe("c3");
    expect(updates["players/c3/alive"]).toBe(false);
  });

  test("이전 버그 재현 방지: 의사1이 먼저 선택하고 의사2가 나중에 선택해도 의사1의 보호가 사라지지 않아야 한다", () => {
    const playersMap = basePlayers();
    // 순서대로 의사1이 먼저 c1을 선택, 이후 의사2가 c2를 선택 (병합된 최종 상태를 시뮬레이션)
    const nightActionsAfterD1 = { doctor: { d1: "c1" } };
    const nightActionsAfterD2 = { doctor: { d1: "c1", d2: "c2" } }; // per-player merge이므로 d1 값 유지됨
    expect(nightActionsAfterD2.doctor.d1).toBe("c1"); // 덮어써지지 않음을 확인 (구버전 버그였다면 doctor: "c2"로 전체 교체됐을 것)

    const { killed } = resolveNight({ playersMap, nightActions: nightActionsAfterD2, round: 1, mafiaTarget: "c1" });
    expect(killed).toBeNull(); // 의사1의 보호가 살아있어야 함
  });
});

describe("resolveNight - 경찰 다중 배치 + 모함가", () => {
  test("경찰 2명이 서로 다른 대상을 조사하면 각자 독립적인 결과를 받아야 한다", () => {
    const playersMap = basePlayers();
    const nightActions = {
      police: { p1: "m1", p2: "c1" },
    };
    const { updates } = resolveNight({ playersMap, nightActions, round: 1, mafiaTarget: null });
    expect(updates["policeResults/p1"].result).toBe("마피아");
    expect(updates["policeResults/p1"].targetName).toBe("마피아1");
    expect(updates["policeResults/p2"].result).toBe("시민");
    expect(updates["policeResults/p2"].targetName).toBe("시민1");
  });

  test("모함가가 누명 씌운 대상을 조사한 경찰만 조작된 결과(마피아)를 받아야 한다", () => {
    const playersMap = basePlayers();
    playersMap.f1 = { name: "모함가1", role: "framer", alive: true };
    const nightActions = {
      police: { p1: "c1", p2: "c2" },
      framer: { f1: "c1" }, // c1에게 누명
    };
    const { updates } = resolveNight({ playersMap, nightActions, round: 1, mafiaTarget: null });
    expect(updates["policeResults/p1"].result).toBe("마피아"); // c1 조사 -> 누명으로 마피아
    expect(updates["policeResults/p2"].result).toBe("시민"); // c2는 정상 결과
  });

  test("경찰 1명이어도 모함가 효과가 실제로 반영돼야 한다 (기존 버그: 즉시-클라이언트 계산이라 반영 안 됐음)", () => {
    const playersMap = basePlayers();
    playersMap.f1 = { name: "모함가1", role: "framer", alive: true };
    const nightActions = {
      police: { p1: "c1" },
      framer: { f1: "c1" },
    };
    const { updates } = resolveNight({ playersMap, nightActions, round: 1, mafiaTarget: null });
    expect(updates["policeResults/p1"].result).toBe("마피아");
  });
});

describe("resolveNight - 기자/성직자 다중 배치", () => {
  test("기자 2명이 같은 밤에 각자 다른 대상을 공개하면 둘 다 독립적으로 처리돼야 한다", () => {
    const playersMap = basePlayers();
    playersMap.r1 = { name: "기자1", role: "reporter", alive: true };
    playersMap.r2 = { name: "기자2", role: "reporter", alive: true };
    const nightActions = {
      reporter: { r1: "m1", r2: "c1" },
    };
    const { updates, logEntries } = resolveNight({ playersMap, nightActions, round: 1, mafiaTarget: null });
    expect(updates["reporterReveals/r1"].result).toBe("마피아");
    expect(updates["reporterReveals/r2"].result).toBe("시민");
    expect(updates["players/r1/reporterUsed"]).toBe(true);
    expect(updates["players/r2/reporterUsed"]).toBe(true);
    expect(logEntries.filter(e => e.includes("기자가")).length).toBe(2);
  });

  test("성직자 2명이 각자 다른 사망자를 부활시키면 둘 다 반영돼야 한다", () => {
    const playersMap = basePlayers();
    playersMap.pr1 = { name: "성직자1", role: "priest", alive: true };
    playersMap.pr2 = { name: "성직자2", role: "priest", alive: true };
    playersMap.deadA = { name: "죽은A", role: "citizen", alive: false };
    playersMap.deadB = { name: "죽은B", role: "citizen", alive: false };
    const nightActions = {
      priest: { pr1: "deadA", pr2: "deadB" },
    };
    const { updates, revivedIds } = resolveNight({ playersMap, nightActions, round: 2, mafiaTarget: null });
    expect(updates["players/deadA/alive"]).toBe(true);
    expect(updates["players/deadB/alive"]).toBe(true);
    expect(revivedIds.sort()).toEqual(["deadA", "deadB"]);
  });

  test("이미 살아있는 사람을 부활 대상으로 지정해도 아무 효과가 없어야 한다", () => {
    const playersMap = basePlayers();
    playersMap.pr1 = { name: "성직자1", role: "priest", alive: true };
    const nightActions = { priest: { pr1: "c1" } }; // c1은 생존자
    const { updates, revivedIds } = resolveNight({ playersMap, nightActions, round: 1, mafiaTarget: null });
    expect(updates["players/c1/alive"]).toBeUndefined();
    expect(revivedIds).toEqual([]);
  });
});

describe("resolveConfirm - 테러리스트 / 광대", () => {
  test("테러리스트가 처형되면 지정해둔 타겟도 함께 사망해야 한다", () => {
    const playersMap = basePlayers();
    playersMap.t1 = { name: "테러리스트1", role: "terrorist", alive: true, terroristTarget: "c1" };
    const { updates, bombTarget, logEntries } = resolveConfirm({
      playersMap, executed: "t1", yesCount: 5, noCount: 1, majority: 4, round: 1,
    });
    expect(updates["players/t1/alive"]).toBe(false);
    expect(updates["players/c1/alive"]).toBe(false);
    expect(bombTarget).toBe("c1");
    expect(logEntries.some(e => e.includes("폭사"))).toBe(true);
  });

  test("테러리스트의 타겟이 이미 죽어 있으면 동반 사망이 발생하지 않아야 한다", () => {
    const playersMap = basePlayers();
    playersMap.t1 = { name: "테러리스트1", role: "terrorist", alive: true, terroristTarget: "deadC" };
    playersMap.deadC = { name: "죽은C", role: "citizen", alive: false };
    const { bombTarget } = resolveConfirm({ playersMap, executed: "t1", yesCount: 5, noCount: 1, majority: 4, round: 1 });
    expect(bombTarget).toBeNull();
  });

  test("광대가 처형되면 즉시 단독 승리 플래그가 켜져야 한다", () => {
    const playersMap = basePlayers();
    playersMap.j1 = { name: "광대1", role: "jester", alive: true };
    const { jesterWin, logEntries } = resolveConfirm({ playersMap, executed: "j1", yesCount: 5, noCount: 1, majority: 4, round: 1 });
    expect(jesterWin).toBe(true);
    expect(logEntries.some(e => e.includes("광대"))).toBe(true);
  });

  test("찬성표가 과반 미달이면 처형이 취소돼야 한다", () => {
    const playersMap = basePlayers();
    const { updates, jesterWin, bombTarget } = resolveConfirm({ playersMap, executed: "c1", yesCount: 2, noCount: 5, majority: 4, round: 1 });
    expect(updates["players/c1/alive"]).toBeUndefined();
    expect(updates.lastExecution.playerId).toBeNull();
    expect(jesterWin).toBe(false);
    expect(bombTarget).toBeNull();
  });
});

describe("checkWin - 광대 제외 처리", () => {
  test("광대는 시민 인원수 계산에서 제외되어 마피아 승리 조건에 영향을 주지 않아야 한다", () => {
    const players = {
      m1: { role: "mafia", alive: true },
      j1: { role: "jester", alive: true },
      c1: { role: "citizen", alive: true },
    };
    // 마피아 1 vs 시민 1(광대 제외) -> 마피아 승리 조건 충족
    expect(checkWin(players)).toBe("mafia");
  });

  test("마피아가 전멸하면 시민 승리여야 한다 (광대 생존 여부와 무관)", () => {
    const players = {
      m1: { role: "mafia", alive: false },
      j1: { role: "jester", alive: true },
      c1: { role: "citizen", alive: true },
    };
    expect(checkWin(players)).toBe("citizen");
  });
});

describe("recommendedRoles - 인원수별 자동 밸런스", () => {
  const specialTotal = (roles) => Object.values(roles).reduce((a, b) => a + b, 0);
  const mafiaTeamTotal = (roles) => roles.mafia + roles.mafiaBoss + roles.framer;

  test("4명(최소 인원)이어도 특수 역할 합이 인원수를 넘지 않아야 한다", () => {
    const roles = recommendedRoles(4);
    expect(specialTotal(roles)).toBeLessThanOrEqual(4);
    expect(mafiaTeamTotal(roles)).toBeGreaterThanOrEqual(1);
  });

  test("8명 기본값은 기존 수동 설정(마피아2/경찰1/의사1)과 동일해야 한다", () => {
    const roles = recommendedRoles(8);
    expect(roles.mafia).toBe(2);
    expect(roles.mafiaBoss).toBe(0);
    expect(roles.police).toBe(1);
    expect(roles.doctor).toBe(1);
  });

  test("32명(최대 인원)이어도 특수 역할 합이 인원수를 넘지 않고, 시민이 최소 1명 이상 남아야 한다", () => {
    const roles = recommendedRoles(32);
    const total = specialTotal(roles);
    expect(total).toBeLessThanOrEqual(32);
    expect(32 - total).toBeGreaterThan(0);
  });

  test("마피아팀 비율은 인원수 전체의 약 20~30% 범위를 유지해야 한다", () => {
    [4, 8, 12, 16, 20, 24, 28, 32].forEach((n) => {
      const roles = recommendedRoles(n);
      const ratio = mafiaTeamTotal(roles) / n;
      expect(ratio).toBeGreaterThanOrEqual(0.2);
      expect(ratio).toBeLessThanOrEqual(0.35);
    });
  });

  test("인원수가 늘어나도 시민 파워롤이 마피아팀보다 과도하게 많아지지 않아야 한다", () => {
    [8, 16, 24, 32].forEach((n) => {
      const roles = recommendedRoles(n);
      const citizenPowerTotal = roles.police + roles.doctor + roles.reporter + roles.lawyer + roles.terrorist + roles.priest;
      expect(citizenPowerTotal).toBeLessThanOrEqual(mafiaTeamTotal(roles) + n * 0.1 + 4);
    });
  });
});
