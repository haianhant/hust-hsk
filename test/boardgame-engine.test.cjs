/**
 * test/boardgame-engine.test.cjs — Kiểm thử đơn vị Pure Domain Engine v2 cho
 * "Bóng Đêm KTX — Secrets After Dark" (rulesetVersion = 2):
 *  - Test A: Initial Role Secrecy, 3x3 Latin-Square Matrix & Semantic Audit (4–8p)
 *  - Test B: Conditional Investigation (`INVESTIGATE`), Decoy Traces, Clues (`clue-04`, `clue-08`)
 *  - Test C: Faction-Neutral `applyTimeoutAutoTurn` Non-Leakage & Full-AFK Dawn Termination
 *  - Test D: Asymmetric Victory Paths (Mist Sabotage/Detonate, Guard Disarm/Seals/Confront,
 *            Dawn Resolution, Wanderer Solo & Co-Win, `evaluateVictoryState` Idempotency)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
require('./register-ts.cjs');

const {
  ACCESS_TAG_LABELS,
  CARDS_BY_ID,
  CARDS_CATALOG,
  KTX_LOCATIONS,
  ROLES_CATALOG,
  TRACE_TAG_LABELS,
  applyPlayerGameAction,
  applyTimeoutAutoTurn,
  createInitialGameState,
  evaluateVictoryState,
  getActivePlayer,
  getPrivateGameView,
  getPublicGameView,
  getRoleDistribution,
  isAdjacentLocation,
  listRolesMatchingAccessTag,
  listRolesMatchingTraceTag,
  qualifiesWandererCoWin,
} = require('../features/boardgame/domain/index.ts');

function makePlayers(n) {
  return Array.from({ length: n }, (_, i) => ({
    playerId: `p_${i + 1}`,
    displayName: `SV ${i + 1}`,
    seatIndex: i,
  }));
}

function collectObjectKeys(obj, out = new Set()) {
  if (!obj || typeof obj !== 'object') return out;
  if (Array.isArray(obj)) {
    for (const item of obj) collectObjectKeys(item, out);
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    out.add(k);
    collectObjectKeys(v, out);
  }
  return out;
}

function cloneStateWithForcedRoles(baseState, roleIds, sabotageLoc = 'radio') {
  const cloned = JSON.parse(JSON.stringify(baseState));
  const rolesById = Object.fromEntries(ROLES_CATALOG.map((r) => [r.id, r]));
  cloned.secretSabotageLocation = sabotageLoc;
  cloned.players.forEach((p, idx) => {
    const rid = roleIds[idx];
    const def = rolesById[rid];
    p.roleId = def.id;
    p.faction = def.faction;
    p.maxHp = def.maxHp;
    p.hp = def.maxHp;
    p.accessTag = def.accessTag;
    p.traceTag = def.traceTag;
    p.wardPlayerId = rid === 'lang-cuu-ho' ? cloned.players[0].playerId : null;
  });
  return cloned;
}

test('BG v2 Pure Domain Engine Unit Tests', async (t) => {
  await t.test('Catalog & 3x3 Orthogonal Latin-Square Matrix integrity', () => {
    assert.equal(ROLES_CATALOG.length, 9);
    assert.equal(KTX_LOCATIONS.length, 6);
    assert.equal(CARDS_CATALOG.length, 24);
    assert.equal(CARDS_CATALOG.filter((c) => c.deck === 'clue').length, 8);
    assert.equal(CARDS_CATALOG.filter((c) => c.deck === 'event').length, 8);
    assert.equal(CARDS_CATALOG.filter((c) => c.deck === 'tactic').length, 8);

    // Every single accessTag & traceTag matches exactly 1 Guard + 1 Mist + 1 Wanderer
    for (const tag of Object.keys(ACCESS_TAG_LABELS)) {
      const matched = listRolesMatchingAccessTag(tag);
      const factions = new Set(matched.map((r) => r.faction));
      assert.equal(matched.length, 3, `accessTag=${tag} must match 3 roles`);
      assert.deepEqual([...factions].sort(), ['lantern-guard', 'mist-order', 'wanderer']);
    }
    for (const tag of Object.keys(TRACE_TAG_LABELS)) {
      const matched = listRolesMatchingTraceTag(tag);
      const factions = new Set(matched.map((r) => r.faction));
      assert.equal(matched.length, 3, `traceTag=${tag} must match 3 roles`);
      assert.deepEqual([...factions].sort(), ['lantern-guard', 'mist-order', 'wanderer']);
    }

    // 4-8p distributions
    for (let n = 4; n <= 8; n++) {
      const dist = getRoleDistribution(n);
      assert.equal(dist.lanternGuard + dist.mistOrder + dist.wanderer, n);
      assert.ok(dist.lanternGuard >= 2 && dist.mistOrder >= 1);
    }
  });

  await t.test('Test A: Initial Role Secrecy & Semantic Audit (4–8p x 10 seeds)', () => {
    const forbiddenPublicKeys = new Set([
      'hp',
      'maxHp',
      'fragments',
      'skillUsed',
      'secretSabotageLocation',
      'sabotagePlanted',
      'sabotageCanDetonate',
      'signalProgress',
      'mistProgress',
      'maxTrackValue',
    ]);

    for (let n = 4; n <= 8; n++) {
      for (let seed = 101; seed <= 110; seed++) {
        const state = createInitialGameState({
          matchId: `sec-${n}-${seed}`,
          seed,
          nowMs: 1_700_000_000_000,
          players: makePlayers(n),
        });
        const pub = getPublicGameView(state);
        assert.equal(pub.rulesetVersion, 2);
        assert.equal(pub.finalReveal, null);
        assert.equal(pub.players.length, n);

        // Key-walk audit on public view
        const keys = collectObjectKeys(pub);
        for (const bad of forbiddenPublicKeys) {
          assert.equal(keys.has(bad), false, `Public view leaked forbidden key "${bad}"`);
        }

        for (const pp of pub.players) {
          assert.equal(pp.woundsTaken, 0);
          assert.equal(pp.visibleShield, 0);
          assert.equal(pp.revealedRoleId, null);
          assert.equal(pp.revealedFaction, null);
          assert.equal(pp.revealedMaxHp, null);
          assert.equal(pp.revealedSkillUsed, false);
          assert.equal(pp.detained, false);
        }

        // Spectator always receives null private view
        assert.equal(getPrivateGameView(state, null), null);
        assert.equal(getPrivateGameView(state, 'nonexistent'), null);

        // Only Mist players receive secretSabotageLocation in privateView
        for (const p of state.players) {
          const priv = getPrivateGameView(state, p.playerId);
          assert.ok(priv);
          assert.equal(priv.hp, p.maxHp);
          if (p.faction === 'mist-order') {
            assert.ok(
              priv.secretSabotageLocation === 'radio' ||
                priv.secretSabotageLocation === 'breaker' ||
                priv.secretSabotageLocation === 'canteen',
            );
          } else {
            assert.equal(priv.secretSabotageLocation, null);
          }
        }
      }
    }

    // Adjacency guard on MOVE: lobby is NOT adjacent to court
    const state = createInitialGameState({
      matchId: 'adj-check',
      seed: 42,
      nowMs: 1_000,
      players: makePlayers(4),
    });
    const active = getActivePlayer(state);
    state.players.forEach((p) => {
      p.location = 'lobby';
    });
    assert.equal(isAdjacentLocation('lobby', 'court'), false);
    const nonAdjRes = applyPlayerGameAction(
      state,
      active.playerId,
      { type: 'MOVE', location: 'court' },
      1_100,
    );
    assert.equal(nonAdjRes.ok, false);
  });

  await t.test('Test B: Conditional Evidence, Decoy Traces & Clues (clue-04 / clue-08)', () => {
    const base = createInitialGameState({
      matchId: 'ev-test',
      seed: 77,
      nowMs: 1_000,
      players: makePlayers(4),
    });
    const state = cloneStateWithForcedRoles(
      base,
      ['gac-ky-thuat', 'suong-tin-gia', 'gac-truc-ban', 'lang-quan-sat'],
      'breaker',
    );
    // All stand in lobby; round 1
    state.players.forEach((p) => {
      p.location = 'lobby';
    });

    const p1 = state.players[0]; // gac-ky-thuat (tech-key / insulated-gloves)
    const p2 = state.players[1]; // suong-tin-gia (broadcast-gear / insulated-gloves)
    const p3 = state.players[2]; // gac-truc-ban (patrol-badge / signal-meter)
    const p4 = state.players[3]; // lang-quan-sat

    // 1. P1 investigates P2 (equipment) -> reports accessTag OR traceTag with 1 Guard + 1 Mist + 1 Wanderer, never faction!
    state.turnOrder = [p1.playerId, p2.playerId, p3.playerId, p4.playerId];
    state.activeTurnIdx = 0;
    state.turnPhase = 'TACTICAL_ACTION';
    state.actionUsedThisTurn = false;
    const invEquip = applyPlayerGameAction(
      state,
      p1.playerId,
      { type: 'INVESTIGATE', targetPlayerId: p2.playerId, focus: 'equipment' },
      2_000,
    );
    assert.equal(invEquip.ok, true);
    const ev1 = p1.evidenceList[0];
    assert.ok(ev1);
    assert.match(ev1.summary, /khớp 3 nhân vật thuộc 3 phe/);
    assert.equal(/Hội Màn Sương\]|Đội Gác Đèn\]/.test(ev1.summary), false);

    // 2. P2 (suong-tin-gia, unrevealed) covertly plants decoy trace on P3! P2 MUST stay unrevealed.
    state.activeTurnIdx = 1;
    state.turnPhase = 'TACTICAL_ACTION';
    state.actionUsedThisTurn = false;
    const decoyRes = applyPlayerGameAction(
      state,
      p2.playerId,
      { type: 'USE_SKILL', targetPlayerId: p3.playerId },
      3_000,
    );
    assert.equal(decoyRes.ok, true);
    assert.equal(p2.revealed, false);
    assert.equal(p2.covertSkillUsed, true);
    assert.ok(p3.plantedDecoyRounds.includes(state.round));

    // P4 investigates P3 (activity) -> catches planted decoy round on innocent P3!
    state.activeTurnIdx = 3;
    state.turnPhase = 'TACTICAL_ACTION';
    state.actionUsedThisTurn = false;
    const invAct = applyPlayerGameAction(
      state,
      p4.playerId,
      { type: 'INVESTIGATE', targetPlayerId: p3.playerId, focus: 'activity' },
      4_000,
    );
    assert.equal(invAct.ok, true);
    const evAct = p4.evidenceList.find((e) => e.kind === 'activity');
    assert.ok(evAct);
    assert.match(evAct.summary, /Có dấu tương tác kỹ thuật \(V1\)/);

    // 3. clue-04 (compare-alignment): same faction vs different faction without naming faction
    state.activeTurnIdx = 0;
    state.turnPhase = 'TACTICAL_ACTION';
    state.actionUsedThisTurn = false;
    p1.hand.push(CARDS_BY_ID['clue-04']);
    const cmpDiff = applyPlayerGameAction(
      state,
      p1.playerId,
      {
        type: 'USE_CARD',
        cardId: 'clue-04',
        targetPlayerId: p2.playerId,
        targetSecondPlayerId: p3.playerId,
      },
      5_000,
    );
    assert.equal(cmpDiff.ok, true);
    const evCmp = p1.evidenceList.find((e) => /HAI PHE KHÁC NHAU|CÙNG MỘT NHÓM PHE/.test(e.summary));
    assert.ok(evCmp);
    assert.match(evCmp.summary, /HAI PHE KHÁC NHAU/);
    assert.equal(/Hội Màn Sương|Đội Gác Đèn/.test(evCmp.summary), false);

    // 4. clue-08 (exclude-safe-facility) NEVER excludes secretSabotageLocation ('breaker')
    state.actionUsedThisTurn = false;
    p1.hand.push(CARDS_BY_ID['clue-08']);
    const exclRes = applyPlayerGameAction(
      state,
      p1.playerId,
      { type: 'USE_CARD', cardId: 'clue-08' },
      6_000,
    );
    assert.equal(exclRes.ok, true);
    const safeEvidence = p1.evidenceList.find((e) => /KHÔNG PHẢI Trạm Mục Tiêu/.test(e.summary));
    assert.ok(safeEvidence);
    assert.notEqual(safeEvidence.locationId, 'breaker');
  });

  await t.test('Test C: Timeout Auto-Turn Non-Leakage & 8p Full-AFK Dawn Termination', () => {
    const base = createInitialGameState({
      matchId: 'timeout-parity',
      seed: 99,
      nowMs: 10_000,
      players: makePlayers(4),
    });
    const activeId = base.turnOrder[0];
    const guardFirst = cloneStateWithForcedRoles(base, [
      'gac-ky-thuat',
      'gac-truc-ban',
      'suong-an-danh',
      'lang-quan-sat',
    ]);
    const mistFirst = cloneStateWithForcedRoles(base, [
      'suong-an-danh',
      'gac-truc-ban',
      'gac-ky-thuat',
      'lang-quan-sat',
    ]);
    // Ensure identical turnOrder & public positions
    guardFirst.turnOrder = guardFirst.players.map((p) => p.playerId);
    mistFirst.turnOrder = mistFirst.players.map((p) => p.playerId);
    guardFirst.activeTurnIdx = 0;
    mistFirst.activeTurnIdx = 0;

    assert.equal(getActivePlayer(guardFirst).playerId, activeId);
    assert.equal(getActivePlayer(mistFirst).playerId, activeId);

    applyTimeoutAutoTurn(guardFirst, 20_000);
    applyTimeoutAutoTurn(mistFirst, 20_000);

    // Timeout MUST be 100% faction-neutral: identical public output & +1 shield
    assert.deepEqual(getPublicGameView(guardFirst), getPublicGameView(mistFirst));
    assert.equal(guardFirst.players[0].shield, 1);

    // 8p full-AFK match terminates cleanly at Dawn without hanging
    const afkState = createInitialGameState({
      matchId: 'afk-8p',
      seed: 1234,
      nowMs: 1_000,
      players: makePlayers(8),
    });
    let safetySteps = 0;
    while (!afkState.finished && safetySteps < 200) {
      applyTimeoutAutoTurn(afkState, 2_000 + safetySteps * 1_000);
      safetySteps += 1;
    }
    assert.equal(afkState.finished, true);
    assert.ok(afkState.winnerLabel);
    assert.ok(safetySteps < 100, `Expected <= 64 AFK timeouts, took ${safetySteps}`);
  });

  await t.test('Test D: Asymmetric Victory Paths & Idempotency', () => {
    // D1: Guard CONFRONT (blocked before R3, false accusation deals 2 direct wounds, right accuse detains Mist -> Guard win)
    {
      const base = createInitialGameState({
        matchId: 'v-confront',
        seed: 5,
        nowMs: 1_000,
        players: makePlayers(4),
      });
      const s = cloneStateWithForcedRoles(
        base,
        ['gac-ky-thuat', 'gac-truc-ban', 'suong-an-danh', 'lang-anh-san'],
        'radio',
      );
      s.players.forEach((p) => {
        p.location = 'lobby';
      });
      s.turnOrder = s.players.map((p) => p.playerId);
      s.activeTurnIdx = 0;
      s.turnPhase = 'TACTICAL_ACTION';

      const earlyConfront = applyPlayerGameAction(
        s,
        'p_1',
        { type: 'CONFRONT', targetPlayerId: 'p_3' },
        2_000,
      );
      assert.equal(earlyConfront.ok, false);

      s.round = 3;
      // False accusation on fellow Guard P2 -> 2 direct wounds bypass nothing & counts falseAccusationCount
      const falseRes = applyPlayerGameAction(
        s,
        'p_1',
        { type: 'CONFRONT', targetPlayerId: 'p_2' },
        3_000,
      );
      assert.equal(falseRes.ok, true);
      assert.equal(s.falseAccusationCount, 1);
      assert.equal(s.players[0].maxHp - s.players[0].hp, 2);

      // P2 correctly confronts Mist P3 -> P3 detained & Guards win!
      s.activeTurnIdx = 1;
      s.turnPhase = 'TACTICAL_ACTION';
      s.actionUsedThisTurn = false;
      const rightRes = applyPlayerGameAction(
        s,
        'p_2',
        { type: 'CONFRONT', targetPlayerId: 'p_3' },
        4_000,
      );
      assert.equal(rightRes.ok, true);
      assert.equal(s.players[2].detained, true);
      assert.equal(s.finished, true);
      assert.equal(s.winnerFaction, 'lantern-guard');

      // Idempotency check
      const snapWinner = s.winnerLabel;
      const snapIds = s.winnerPlayerIds.slice();
      evaluateVictoryState(s, 99_999, true);
      assert.equal(s.winnerLabel, snapWinner);
      assert.deepEqual(s.winnerPlayerIds, snapIds);
    }

    // D2: Mist covertly plants Sabotage -> round wraps -> arms silently -> DETONATE_PLOT wins!
    {
      const base = createInitialGameState({
        matchId: 'v-mist-detonate',
        seed: 9,
        nowMs: 1_000,
        players: makePlayers(4),
      });
      const s = cloneStateWithForcedRoles(
        base,
        ['gac-ky-thuat', 'suong-an-danh', 'gac-truc-ban', 'lang-quan-sat'],
        'breaker',
      );
      s.turnOrder = ['p_2', 'p_1', 'p_3', 'p_4'];
      s.activeTurnIdx = 0;
      s.players[1].location = 'breaker';
      s.turnPhase = 'DRAW_OR_EXPLORE';

      const plantRes = applyPlayerGameAction(
        s,
        'p_2',
        { type: 'INTERACT_LOC', mode: 'sabotage' },
        2_000,
      );
      assert.equal(plantRes.ok, true);
      assert.equal(s.sabotagePlanted, true);
      assert.equal(s.sabotageArmed, false);

      // Same-round detonate is blocked
      const sameRoundDet = applyPlayerGameAction(s, 'p_2', { type: 'DETONATE_PLOT' }, 2_100);
      assert.equal(sameRoundDet.ok, false);

      // Everyone completes turns until Round 2 starts -> sabotageArmed becomes true
      applyPlayerGameAction(s, 'p_2', { type: 'END_TURN' }, 2_200);
      applyTimeoutAutoTurn(s, 2_300);
      applyTimeoutAutoTurn(s, 2_400);
      applyTimeoutAutoTurn(s, 2_500);
      assert.equal(s.round, 2);
      assert.equal(s.sabotageArmed, true);

      // Alert log must NOT reveal 'Cầu Dao'
      const incidentLog = s.publicLog.find((l) => l.kind === 'incident');
      assert.ok(incidentLog);
      assert.equal(/Cầu Dao/.test(incidentLog.text), false);

      // Mist moves to TACTICAL_ACTION in breaker and detonates -> Mist wins immediately
      s.turnPhase = 'TACTICAL_ACTION';
      s.actionUsedThisTurn = false;
      const detRes = applyPlayerGameAction(s, 'p_2', { type: 'DETONATE_PLOT' }, 3_000);
      assert.equal(detRes.ok, true);
      assert.equal(s.finished, true);
      assert.equal(s.winnerFaction, 'mist-order');
    }

    // D3: Guard Seals + Disarm win & Disarm resets planted sabotage
    {
      const base = createInitialGameState({
        matchId: 'v-guard-seal',
        seed: 11,
        nowMs: 1_000,
        players: makePlayers(4),
      });
      const s = cloneStateWithForcedRoles(
        base,
        ['gac-ky-thuat', 'suong-an-danh', 'gac-truc-ban', 'lang-quan-sat'],
        'radio',
      );
      s.turnOrder = ['p_1', 'p_2', 'p_3', 'p_4'];
      s.activeTurnIdx = 0;
      s.sabotagePlanted = true;
      s.sabotageArmed = true;
      s.sabotagePlantedRound = 1;
      s.tamperedLocations = ['radio'];
      s.round = 2;
      s.players[0].location = 'radio';
      s.turnPhase = 'DRAW_OR_EXPLORE';

      // Scan at radio disarms & seals radio!
      const scanRadio = applyPlayerGameAction(
        s,
        'p_1',
        { type: 'INTERACT_LOC', mode: 'scan' },
        2_000,
      );
      assert.equal(scanRadio.ok, true);
      assert.equal(s.disarmedCount, 1);
      assert.equal(s.radioSealed, true);
      assert.equal(s.sabotageArmed, false);

      // Next turn scan at breaker seals breaker -> mid-round with 1 disarm only unlocks global CONFRONT (does not end early!)
      s.players[0].location = 'breaker';
      s.turnPhase = 'DRAW_OR_EXPLORE';
      const scanBreaker = applyPlayerGameAction(
        s,
        'p_1',
        { type: 'INTERACT_LOC', mode: 'scan' },
        3_000,
      );
      assert.equal(scanBreaker.ok, true);
      assert.equal(s.breakerSealed, true);
      assert.equal(s.finished, false);

      // Dawn with 1 disarm + both seals wins for Guard
      const dawnSnap = JSON.parse(JSON.stringify(s));
      dawnSnap.round = dawnSnap.maxRounds + 1;
      assert.equal(evaluateVictoryState(dawnSnap, 4_000, true), true);
      assert.equal(dawnSnap.winnerFaction, 'lantern-guard');

      // Immediate mid-game win from Round 3+ when disarmedCount >= 2 + both seals
      s.round = 3;
      s.disarmedCount = 2;
      assert.equal(evaluateVictoryState(s, 4_000, false), true);
      assert.equal(s.finished, true);
      assert.equal(s.winnerFaction, 'lantern-guard');
    }

    // D4: Hải PUBLISH_DOSSIER solo win (blocked pre-R4, succeeds R4+) & Trang Dawn Hypothesis Co-Win & Bình Ward Co-Win
    {
      const base = createInitialGameState({
        matchId: 'v-wanderers',
        seed: 19,
        nowMs: 1_000,
        players: makePlayers(6),
      });
      const s = cloneStateWithForcedRoles(
        base,
        [
          'gac-ky-thuat',
          'gac-truc-ban',
          'suong-an-danh',
          'suong-tin-gia',
          'lang-anh-san',
          'lang-quan-sat',
        ],
        'canteen',
      );
      const hai = s.players[4];
      const trang = s.players[5];
      s.turnOrder = s.players.map((p) => p.playerId);
      s.activeTurnIdx = 4;
      hai.location = 'radio';
      hai.verifiedSceneLocations = ['radio', 'breaker'];
      hai.evidenceList = [
        { id: '1', round: 1, title: 'A', summary: 'A', kind: 'scene' },
        { id: '2', round: 2, title: 'B', summary: 'B', kind: 'equipment' },
        { id: '3', round: 3, title: 'C', summary: 'C', kind: 'activity' },
      ];
      s.turnPhase = 'TACTICAL_ACTION';
      s.round = 3;
      assert.equal(
        applyPlayerGameAction(s, hai.playerId, { type: 'PUBLISH_DOSSIER' }, 2_000).ok,
        false,
      );

      s.round = 4;
      const pubRes = applyPlayerGameAction(s, hai.playerId, { type: 'PUBLISH_DOSSIER' }, 3_000);
      assert.equal(pubRes.ok, true);
      assert.equal(s.finished, true);
      assert.equal(s.winnerFaction, 'wanderer-solo');
      assert.deepEqual(s.winnerPlayerIds, [hai.playerId]);

      // Check Trang (lang-quan-sat) 2 correct unrevealed hypotheses qualifies co-win
      trang.hypotheses = [
        {
          targetPlayerId: 'p_1',
          targetName: 'SV 1',
          predictedFaction: 'lantern-guard',
          recordedRound: 2,
        },
        {
          targetPlayerId: 'p_3',
          targetName: 'SV 3',
          predictedFaction: 'mist-order',
          recordedRound: 3,
        },
      ];
      assert.equal(qualifiesWandererCoWin(trang, s.players), true);
    }

    // D5: Bình (lang-cuu-ho) ward-protect co-win & Dawn Overload win for Mist
    {
      const base = createInitialGameState({
        matchId: 'v-binh-dawn',
        seed: 23,
        nowMs: 1_000,
        players: makePlayers(6),
      });
      const s = cloneStateWithForcedRoles(
        base,
        [
          'gac-ky-thuat',
          'gac-truc-ban',
          'suong-an-danh',
          'suong-tin-gia',
          'lang-cuu-ho',
          'lang-quan-sat',
        ],
        'radio',
      );
      const binh = s.players[4];
      binh.wardPlayerId = 'p_1';
      binh.wardProtectionsCount = 1;
      assert.equal(qualifiesWandererCoWin(binh, s.players), true);

      // Planted/armed sabotage surviving past maxRounds wins Dawn Overload for Mist (plus qualifying Wanderers co-win)
      s.round = s.maxRounds + 1;
      s.sabotagePlanted = true;
      s.sabotageArmed = true;
      const done = evaluateVictoryState(s, 5_000, true);
      assert.equal(done, true);
      assert.equal(s.winnerFaction, 'mist-order');
      assert.ok(s.winnerPlayerIds.includes('p_3'));
      assert.ok(s.winnerPlayerIds.includes('p_4'));
      assert.ok(s.winnerPlayerIds.includes(binh.playerId));
    }
  });
});
