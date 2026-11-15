/**
 * test/boardgame-sim.cjs — Mô phỏng 3.500 trận bot giới hạn thông tin (v2):
 *  - 700 trận × mỗi quy mô bàn 4, 5, 6, 7, 8 người = 3.500 trận.
 *  - 6 hồ sơ bot độc lập (`random-legal`, `investigator`, `bluff-saboteur`,
 *    `defensive`, `aggressive`, `team-coordinator`) CHỈ ĐƯỢC PHÉP đọc
 *    `(getPublicGameView(state), getPrivateGameView(state, activeId))`.
 *    Tuyệt đối KHÔNG đọc vai ẩn / HP gốc của người khác hay trạm phá hoại bí mật nếu là Gác Đèn/Lang Thang.
 *  - Kiểm tra: 0 trận kẹt, <5% kết thúc sớm Vòng 1–2, tỷ lệ thắng Gác Đèn vs Màn Sương cân bằng.
 */

const assert = require('node:assert/strict');
require('./register-ts.cjs');

const {
  ACCESS_TAG_LABELS,
  KTX_LOCATIONS,
  ROLES_CATALOG,
  TRACE_TAG_LABELS,
  applyPlayerGameAction,
  createInitialGameState,
  getActivePlayer,
  getPrivateGameView,
  getPublicGameView,
  isAdjacentLocation,
  listLegalMovesForLocation,
  qualifiesWandererCoWin,
} = require('../features/boardgame/domain/index.ts');

const PROFILES = [
  'random-legal',
  'investigator',
  'bluff-saboteur',
  'defensive',
  'aggressive',
  'team-coordinator',
];

const ALL_LOCS = KTX_LOCATIONS.map((l) => l.id);

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shortestNextStep(fromLoc, toLoc) {
  if (fromLoc === toLoc) return null;
  const legal = listLegalMovesForLocation(fromLoc);
  if (legal.includes(toLoc)) return toLoc;
  if (legal.includes('corridor')) return 'corridor';
  return legal[0];
}

function createBotMemory(players) {
  const memByPlayer = {};
  for (const p of players) {
    memByPlayer[p.playerId] = {
      plantedRound: null,
      suspicionByTarget: {},
      candidatesByTarget: {},
      seenEvidenceIds: new Set(),
    };
  }
  return memByPlayer;
}

function updateBotMemoryFromPrivateView(pub, priv, mem) {
  for (const pp of pub.players) {
    if (!mem.candidatesByTarget[pp.playerId]) {
      mem.candidatesByTarget[pp.playerId] = new Set(ROLES_CATALOG.map((r) => r.id));
      mem.suspicionByTarget[pp.playerId] = 0;
    }
    if (pp.revealedRoleId) {
      mem.candidatesByTarget[pp.playerId] = new Set([pp.revealedRoleId]);
      if (pp.revealedFaction === 'mist-order') mem.suspicionByTarget[pp.playerId] = 100;
      else if (pp.revealedFaction === 'lantern-guard' || pp.revealedFaction === 'wanderer') {
        mem.suspicionByTarget[pp.playerId] = -100;
      }
    }
  }

  for (const ev of priv.evidenceList) {
    if (mem.seenEvidenceIds.has(ev.id)) continue;
    mem.seenEvidenceIds.add(ev.id);
    if (!ev.targetPlayerId) continue;
    const tid = ev.targetPlayerId;

    // Narrow candidates using Latin-square public catalog rules
    for (const [tag, label] of Object.entries(ACCESS_TAG_LABELS)) {
      if (ev.summary.includes(label)) {
        const matchingIds = new Set(
          ROLES_CATALOG.filter((r) => r.accessTag === tag).map((r) => r.id),
        );
        const cur = mem.candidatesByTarget[tid];
        if (cur) {
          for (const id of [...cur]) {
            if (!matchingIds.has(id)) cur.delete(id);
          }
        }
      }
    }
    for (const [tag, label] of Object.entries(TRACE_TAG_LABELS)) {
      if (ev.summary.includes(label)) {
        const matchingIds = new Set(
          ROLES_CATALOG.filter((r) => r.traceTag === tag).map((r) => r.id),
        );
        const cur = mem.candidatesByTarget[tid];
        if (cur) {
          for (const id of [...cur]) {
            if (!matchingIds.has(id)) cur.delete(id);
          }
        }
      }
    }

    if (ev.summary.includes('Có dấu tương tác kỹ thuật')) {
      mem.suspicionByTarget[tid] = (mem.suspicionByTarget[tid] ?? 0) + 1.25;
    }
    if (ev.summary.includes('dấu nhiễu giả từng bị cấy')) {
      mem.suspicionByTarget[tid] = (mem.suspicionByTarget[tid] ?? 0) - 0.75;
    }
    if (ev.summary.includes('Từng công kích')) {
      mem.suspicionByTarget[tid] = (mem.suspicionByTarget[tid] ?? 0) + 1.1;
    }
  }
}

function estimateTargetLikelihood(target, priv, mem) {
  if (target.revealedFaction === 'mist-order') return 100;
  if (target.revealedFaction) return -100;
  const cands = mem.candidatesByTarget[target.playerId];
  let score = mem.suspicionByTarget[target.playerId] ?? 0;
  if (cands && cands.size > 0 && cands.size <= 3) {
    const mistFraction =
      [...cands].filter((rid) => ROLES_CATALOG.find((r) => r.id === rid)?.faction === 'mist-order')
        .length / cands.size;
    if (cands.size === 1 && mistFraction === 1) score += 10;
    else if (mistFraction === 0) score -= 10;
    else score += mistFraction * 1.5;
  }
  return score;
}

/**
 * Hàm quyết định của bot: TUYỆT ĐỐI CHỈ NHẬN `(pub, priv, profile, mem, rng)`,
 * không bao giờ truy cập `AuthoritativeGameState` gốc.
 */
function chooseBotAction(pub, priv, profile, mem, rng) {
  const selfPub = pub.players.find((p) => p.playerId === priv.playerId);
  const aliveOthers = pub.players.filter(
    (p) => p.alive && !p.detained && p.playerId !== priv.playerId,
  );
  const sameRoomOthers = aliveOthers.filter((p) => p.location === selfPub.location);
  const inRangeTargets = aliveOthers.filter(
    (p) =>
      p.location === selfPub.location ||
      (selfPub.location === 'court' && isAdjacentLocation('court', p.location)),
  );
  const wardTarget = priv.wardPlayerId
    ? aliveOthers.find((p) => p.playerId === priv.wardPlayerId) ?? null
    : null;

  updateBotMemoryFromPrivateView(pub, priv, mem);

  // Random legal profile
  if (profile === 'random-legal') {
    if (pub.turnPhase === 'MOVE') {
      const adj = listLegalMovesForLocation(selfPub.location);
      return { type: 'MOVE', location: adj[Math.floor(rng() * adj.length)] };
    }
    if (pub.turnPhase === 'DRAW_OR_EXPLORE') {
      if (
        priv.faction === 'mist-order' &&
        priv.secretSabotageLocation === selfPub.location &&
        !pub.sabotageArmed &&
        pub.blackoutLocation !== selfPub.location &&
        rng() < 0.45
      ) {
        mem.plantedRound = pub.round;
        return { type: 'INTERACT_LOC', mode: 'sabotage' };
      }
      if (pub.blackoutLocation !== selfPub.location && rng() < 0.45) {
        return { type: 'INTERACT_LOC', mode: 'scan' };
      }
      const decks = ['clue', 'event', 'tactic'];
      return { type: 'DRAW_CARD', deck: decks[Math.floor(rng() * decks.length)] };
    }
    if (pub.turnPhase === 'TACTICAL_ACTION') {
      if (inRangeTargets.length > 0 && rng() < 0.4) {
        const tgt = inRangeTargets[Math.floor(rng() * inRangeTargets.length)];
        return {
          type: 'INVESTIGATE',
          targetPlayerId: tgt.playerId,
          focus: rng() < 0.5 ? 'equipment' : 'activity',
        };
      }
      if (priv.hand.length > 0 && rng() < 0.35) {
        const c = priv.hand[Math.floor(rng() * priv.hand.length)];
        return {
          type: 'USE_CARD',
          cardId: c.id,
          targetPlayerId: inRangeTargets[0]?.playerId ?? aliveOthers[0]?.playerId,
          targetLocation: ALL_LOCS[Math.floor(rng() * ALL_LOCS.length)],
        };
      }
      return { type: 'END_TURN' };
    }
  }

  // Pha 1: MOVE
  if (pub.turnPhase === 'MOVE') {
    const adj = listLegalMovesForLocation(selfPub.location);
    let desired = null;

    if (priv.faction === 'mist-order') {
      if (pub.sabotageArmed && mem.plantedRound !== null && pub.round > mem.plantedRound) {
        desired =
          priv.revealed && adj.includes('radio')
            ? 'radio'
            : priv.secretSabotageLocation;
      } else if (!pub.sabotageArmed && (profile === 'bluff-saboteur' || profile === 'team-coordinator' || rng() < 0.65)) {
        desired = priv.secretSabotageLocation;
      } else if (profile === 'aggressive' && aliveOthers.length > 0) {
        desired = aliveOthers[Math.floor(rng() * aliveOthers.length)].location;
      }
    } else if (priv.roleId === 'lang-anh-san') {
      if (pub.round >= 4 && priv.verifiedSceneLocations.length >= 2 && priv.evidenceList.length >= 3) {
        desired = 'radio';
      } else {
        const unverified = ['breaker', 'radio', 'canteen'].filter(
          (id) => !priv.verifiedSceneLocations.includes(id),
        );
        desired = unverified[0] ?? 'radio';
      }
    } else if (priv.roleId === 'lang-cuu-ho' && wardTarget) {
      desired = wardTarget.location;
    } else if (priv.faction === 'lantern-guard') {
      if (pub.sabotageArmed) {
        const candRooms =
          pub.tamperedLocations.length > 0
            ? pub.tamperedLocations
            : ['breaker', 'radio', 'canteen'];
        desired = candRooms[Math.floor(rng() * candRooms.length)];
      } else if (profile === 'team-coordinator' || profile === 'bluff-saboteur') {
        if (!pub.breakerSealed) desired = 'breaker';
        else if (!pub.radioSealed) desired = 'radio';
      } else if (profile === 'investigator') {
        desired = rng() < 0.5 ? 'court' : 'corridor';
      } else if (profile === 'defensive' && priv.hp <= 5) {
        desired = 'lobby';
      }
    }

    if (desired && desired !== selfPub.location) {
      const step = shortestNextStep(selfPub.location, desired);
      if (step && adj.includes(step)) return { type: 'MOVE', location: step };
    }
    return { type: 'MOVE', location: adj[Math.floor(rng() * adj.length)] };
  }

  // Pha 2: DRAW_OR_EXPLORE
  if (pub.turnPhase === 'DRAW_OR_EXPLORE') {
    const loc = selfPub.location;
    const blackout = pub.blackoutLocation === loc;

    // Hải prioritizes gathering verified scenes + clues
    if (priv.roleId === 'lang-anh-san') {
      if (!blackout && ['breaker', 'radio', 'canteen'].includes(loc) && !priv.verifiedSceneLocations.includes(loc)) {
        return { type: 'INTERACT_LOC', mode: 'scan' };
      }
      return { type: 'DRAW_CARD', deck: 'clue' };
    }

    // Mist covert plant when safe or bluffing
    if (
      priv.faction === 'mist-order' &&
      !blackout &&
      priv.secretSabotageLocation === loc &&
      !pub.sabotageArmed
    ) {
      if (pub.round >= 1 && (sameRoomOthers.length === 0 || profile === 'bluff-saboteur' || rng() < 0.65)) {
        mem.plantedRound = pub.round;
        return { type: 'INTERACT_LOC', mode: 'sabotage' };
      }
    }

    // Guard scans when sabotage armed or sealing infrastructure
    if (!blackout && priv.faction === 'lantern-guard') {
      if (
        (pub.sabotageArmed && ['breaker', 'radio', 'canteen'].includes(loc)) ||
        (loc === 'breaker' && !pub.breakerSealed) ||
        (loc === 'radio' && !pub.radioSealed) ||
        (loc === 'lobby' && priv.hp < priv.maxHp) ||
        (profile === 'investigator' && (loc === 'corridor' || loc === 'court'))
      ) {
        return { type: 'INTERACT_LOC', mode: 'scan' };
      }
    }

    const r = rng();
    if (profile === 'investigator' || priv.roleId === 'lang-quan-sat') {
      return { type: 'DRAW_CARD', deck: r < 0.72 ? 'clue' : 'tactic' };
    }
    if (profile === 'defensive') {
      return { type: 'DRAW_CARD', deck: r < 0.55 ? 'tactic' : 'event' };
    }
    return { type: 'DRAW_CARD', deck: r < 0.45 ? 'clue' : r < 0.8 ? 'tactic' : 'event' };
  }

  // Pha 3: TACTICAL_ACTION
  if (pub.turnPhase === 'TACTICAL_ACTION') {
    // Opportunistic Trang hypothesis before main tactical action
    if (priv.roleId === 'lang-quan-sat') {
      const candidate = pub.players.find(
        (p) =>
          p.alive &&
          !p.revealedFaction &&
          p.playerId !== priv.playerId &&
          priv.metPlayerIds.includes(p.playerId) &&
          !priv.hypotheses.some((h) => h.targetPlayerId === p.playerId),
      );
      if (candidate) {
        const lik = estimateTargetLikelihood(candidate, priv, mem);
        const predictedFaction =
          lik >= 1.4 ? 'mist-order' : lik <= -0.5 ? 'lantern-guard' : 'lantern-guard';
        // Apply free hypothesis (ignoring error if already updated)
        // Return END_TURN only on final fallback; here let's issue RECORD_HYPOTHESIS rarely or skip if risky
        if (Math.abs(lik) >= 1.4 && priv.hypotheses.length < 2) {
          return {
            type: 'RECORD_HYPOTHESIS',
            targetPlayerId: candidate.playerId,
            predictedFaction,
          };
        }
      }
    }

    // Hải PUBLISH_DOSSIER victory condition
    if (
      priv.roleId === 'lang-anh-san' &&
      pub.round >= 4 &&
      selfPub.location === 'radio' &&
      priv.verifiedSceneLocations.length >= 2 &&
      priv.evidenceList.length >= 3
    ) {
      return { type: 'PUBLISH_DOSSIER' };
    }

    // Mist DETONATE_PLOT ASAP if armed from previous round
    if (
      priv.faction === 'mist-order' &&
      pub.sabotageArmed &&
      mem.plantedRound !== null &&
      pub.round > mem.plantedRound &&
      (selfPub.location === priv.secretSabotageLocation ||
        (priv.revealed && selfPub.location === 'radio'))
    ) {
      return { type: 'DETONATE_PLOT' };
    }

    // Vy covert decoy skill without revealing
    if (
      priv.roleId === 'suong-tin-gia' &&
      !priv.revealed &&
      !priv.covertSkillUsed &&
      sameRoomOthers.length > 0 &&
      rng() < 0.7
    ) {
      return { type: 'USE_SKILL', targetPlayerId: sameRoomOthers[0].playerId };
    }

    // Guard CONFRONT (Round 3+) at lobby/breaker or global seal
    const confrontReady =
      priv.faction === 'lantern-guard' &&
      pub.round >= 3 &&
      !priv.confrontUsed &&
      (selfPub.location === 'lobby' ||
        selfPub.location === 'breaker' ||
        (pub.breakerSealed && pub.radioSealed));

    if (confrontReady) {
      const pool = pub.breakerSealed && pub.radioSealed ? aliveOthers : sameRoomOthers;
      const unrevealedPool = pool.filter((t) => !t.revealedFaction);
      const ranked = unrevealedPool
        .map((t) => ({ t, score: estimateTargetLikelihood(t, priv, mem) }))
        .sort((a, b) => b.score - a.score);
      const threshold = profile === 'aggressive' ? 1.25 : 2.1;
      if (ranked[0] && ranked[0].score >= threshold) {
        return { type: 'CONFRONT', targetPlayerId: ranked[0].t.playerId };
      }
    }

    // Bình protects/heals ward with skill when revealed or wounded
    if (priv.roleId === 'lang-cuu-ho' && !priv.skillUsed && wardTarget) {
      if (wardTarget.woundsTaken >= 2 || pub.round >= 3) {
        return { type: 'USE_SKILL', targetPlayerId: wardTarget.playerId };
      }
    }

    // Investigate unrevealed targets in range
    const uninvTargets = inRangeTargets.filter(
      (t) =>
        !t.revealedFaction &&
        !priv.evidenceList.some((e) => e.targetPlayerId === t.playerId && e.kind === 'equipment'),
    );
    if (uninvTargets.length > 0 && (profile === 'investigator' || rng() < 0.6)) {
      const tgt = uninvTargets[Math.floor(rng() * uninvTargets.length)];
      return {
        type: 'INVESTIGATE',
        targetPlayerId: tgt.playerId,
        focus: rng() < 0.65 ? 'equipment' : 'activity',
      };
    }

    // Use hand cards
    if (priv.hand.length > 0 && rng() < 0.6) {
      const card = priv.hand[0];
      const tgt = sameRoomOthers[0] ?? inRangeTargets[0] ?? aliveOthers[0];
      return {
        type: 'USE_CARD',
        cardId: card.id,
        targetPlayerId: tgt?.playerId,
        targetLocation: priv.secretSabotageLocation ?? 'radio',
      };
    }

    // Mist/Aggressive attack in same room
    if (sameRoomOthers.length > 0 && (priv.faction === 'mist-order' || profile === 'aggressive')) {
      const targetsRanked = sameRoomOthers
        .slice()
        .sort((a, b) => {
          const sa = priv.faction === 'mist-order' ? (a.revealedFaction === 'lantern-guard' ? -10 : a.woundsTaken * -1) : -estimateTargetLikelihood(a, priv, mem);
          const sb = priv.faction === 'mist-order' ? (b.revealedFaction === 'lantern-guard' ? -10 : b.woundsTaken * -1) : -estimateTargetLikelihood(b, priv, mem);
          return sa - sb;
        });
      const victim = targetsRanked[0];
      if (victim && (priv.faction === 'mist-order' || estimateTargetLikelihood(victim, priv, mem) > 0.5 || victim.revealedFaction === 'mist-order')) {
        return { type: 'ATTACK', targetPlayerId: victim.playerId };
      }
    }

    // Use active skill later in game or if low HP
    if (!priv.skillUsed && (priv.hp <= 6 || (pub.round >= 3 && rng() < 0.45))) {
      return { type: 'USE_SKILL', targetPlayerId: sameRoomOthers[0]?.playerId };
    }

    return { type: 'END_TURN' };
  }

  return { type: 'END_TURN' };
}

function classifyWinMethod(state) {
  if (state.dossierPublishedBy) return 'Hải Công bố Hồ sơ';
  if (state.plotDetonated) return 'Màn Sương Kích nổ';
  const r = state.winReason || '';
  if (r.includes('tạm giữ') || r.includes('rời cuộc chơi') || r.includes('kiệt sức')) {
    return state.winnerFaction === 'lantern-guard' ? 'Gác Đèn Tạm giữ/Loại' : 'Màn Sương Áp đảo';
  }
  if (r.includes('niêm phong chặt') || r.includes('khóa chặt')) return 'Gác Đèn Gỡ & Niêm phong';
  if (r.includes('Mạch Quá Tải') && r.includes('Rạng Sáng')) return 'Rạng Sáng Quá tải (Sương)';
  if (r.includes('luận tội')) return 'Trang Suy luận Rạng Sáng';
  if (r.includes('qua mặt đội tuần tra')) return 'Rạng Sáng Lọt tuần tra (Sương)';
  if (r.includes('giữ vững khu KTX')) return 'Rạng Sáng Tuần tra (Gác)';
  return `Khác(${r.slice(0, 40)})`;
}

function runSimulation() {
  const counts = [4, 5, 6, 7, 8];
  const gamesPerCount = 700;
  const rng = mulberry32(20261115);

  const summary = {
    totalGames: counts.length * gamesPerCount,
    stuckGames: 0,
    earlyEndR1R2: 0,
    totalRoundsSum: 0,
    winsByFaction: { 'lantern-guard': 0, 'mist-order': 0, 'wanderer-solo': 0 },
    wandererCoWins: 0,
    wandererAppearances: 0,
    winMethods: {},
    earlyMethods: {},
    byPlayerCount: {},
  };

  for (const n of counts) {
    const bucket = {
      games: gamesPerCount,
      wins: { 'lantern-guard': 0, 'mist-order': 0, 'wanderer-solo': 0 },
      wandererCoWinRate: 0,
      avgRounds: 0,
      earlyR1R2: 0,
    };
    let roundsSum = 0;
    let wCoWins = 0;
    let wSlots = 0;

    for (let g = 0; g < gamesPerCount; g++) {
      const players = Array.from({ length: n }, (_, i) => ({
        playerId: `sim-${i + 1}`,
        displayName: `Bot ${i + 1}`,
        seatIndex: i,
      }));
      const state = createInitialGameState({
        matchId: `sim-${n}-${g}`,
        seed: 100_000 + n * 10_000 + g,
        nowMs: 1_700_000_000_000,
        players,
      });
      const profiles = players.map(
        (_, i) => PROFILES[(g + i) % PROFILES.length],
      );
      const memByPlayer = createBotMemory(state.players);

      let safetySteps = 0;
      let hypothesisLoops = 0;
      while (!state.finished && safetySteps < 240) {
        safetySteps += 1;
        const active = getActivePlayer(state);
        if (!active) break;

        // STRICT ANTI-CHEAT PROJECTION: bot receives ONLY publicView + own privateView!
        const pub = getPublicGameView(state);
        const priv = getPrivateGameView(state, active.playerId);
        const profile = profiles[active.seatIndex % profiles.length];
        let action = chooseBotAction(pub, priv, profile, memByPlayer[active.playerId], rng);

        if (action.type === 'RECORD_HYPOTHESIS') {
          hypothesisLoops += 1;
          if (hypothesisLoops > 1) action = { type: 'END_TURN' };
        } else {
          hypothesisLoops = 0;
        }

        const res = applyPlayerGameAction(
          state,
          active.playerId,
          action,
          1_700_000_000_000 + safetySteps * 1000,
        );
        if (!res.ok) {
          // Legal safe fallback based only on phase
          if (state.turnPhase === 'MOVE') {
            const adj = listLegalMovesForLocation(active.location);
            applyPlayerGameAction(state, active.playerId, { type: 'MOVE', location: adj[0] }, 1_700_000_000_000 + safetySteps * 1000);
          } else if (state.turnPhase === 'DRAW_OR_EXPLORE') {
            applyPlayerGameAction(state, active.playerId, { type: 'DRAW_CARD', deck: 'clue' }, 1_700_000_000_000 + safetySteps * 1000);
          } else {
            applyPlayerGameAction(state, active.playerId, { type: 'END_TURN' }, 1_700_000_000_000 + safetySteps * 1000);
          }
        }
      }

      if (!state.finished) {
        summary.stuckGames += 1;
        continue;
      }

      const finalRound = Math.min(state.round, state.maxRounds);
      roundsSum += finalRound;
      summary.totalRoundsSum += finalRound;
      if (state.round <= 2) {
        summary.earlyEndR1R2 += 1;
        bucket.earlyR1R2 += 1;
      }

      if (state.winnerFaction) {
        summary.winsByFaction[state.winnerFaction] += 1;
        bucket.wins[state.winnerFaction] += 1;
      }

      const method = classifyWinMethod(state);
      summary.winMethods[method] = (summary.winMethods[method] ?? 0) + 1;
      if (state.round <= 2) {
        summary.earlyMethods[method] = (summary.earlyMethods[method] ?? 0) + 1;
      }

      for (const p of state.players) {
        if (p.faction === 'wanderer') {
          wSlots += 1;
          summary.wandererAppearances += 1;
          if (state.winnerPlayerIds.includes(p.playerId) || qualifiesWandererCoWin(p, state.players)) {
            wCoWins += 1;
            summary.wandererCoWins += 1;
          }
        }
      }
    }

    bucket.avgRounds = Number((roundsSum / gamesPerCount).toFixed(2));
    bucket.wandererCoWinRate = wSlots > 0 ? Number((wCoWins / wSlots).toFixed(3)) : 0;
    summary.byPlayerCount[`${n}p`] = bucket;
  }

  const guardRate = summary.winsByFaction['lantern-guard'] / summary.totalGames;
  const mistRate = summary.winsByFaction['mist-order'] / summary.totalGames;
  const soloRate = summary.winsByFaction['wanderer-solo'] / summary.totalGames;
  const earlyRate = summary.earlyEndR1R2 / summary.totalGames;

  console.log('=== BOARDGAME V2 INFO-LIMITED SIMULATION (3,500 MATCHES) ===');
  console.log(
    JSON.stringify(
      {
        totalGames: summary.totalGames,
        stuckGames: summary.stuckGames,
        avgRounds: Number((summary.totalRoundsSum / summary.totalGames).toFixed(2)),
        earlyEndR1R2Pct: Number((earlyRate * 100).toFixed(2)),
        overallRates: {
          lanternGuardPct: Number((guardRate * 100).toFixed(2)),
          mistOrderPct: Number((mistRate * 100).toFixed(2)),
          wandererSoloPct: Number((soloRate * 100).toFixed(2)),
          wandererCoWinAmongWanderersPct: Number(
            ((summary.wandererCoWins / Math.max(1, summary.wandererAppearances)) * 100).toFixed(2),
          ),
        },
        winMethods: summary.winMethods,
        earlyMethodsR1R2: summary.earlyMethods,
        byPlayerCount: summary.byPlayerCount,
      },
      null,
      2,
    ),
  );

  assert.equal(summary.stuckGames, 0, 'Must have 0 stuck/infinite matches');
  assert.ok(earlyRate < 0.05, `Early R1-R2 finishes must be <5%, got ${(earlyRate * 100).toFixed(2)}%`);
  assert.ok(
    guardRate >= 0.28 && guardRate <= 0.65,
    `Guard win rate out of healthy band [28%, 65%]: ${(guardRate * 100).toFixed(2)}%`,
  );
  assert.ok(
    mistRate >= 0.28 && mistRate <= 0.65,
    `Mist win rate out of healthy band [28%, 65%]: ${(mistRate * 100).toFixed(2)}%`,
  );
}

runSimulation();
