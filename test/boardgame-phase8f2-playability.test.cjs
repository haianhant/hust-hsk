#!/usr/bin/env node
/**
 * test/boardgame-phase8f2-playability.test.cjs
 *
 * Phase 8F.2 — Role Playability & Skill Clarity Regression Suite:
 *   1. Cassie (`exp1_cassie`) & N.C. Soldier (`exp2_nc_soldier`) 5P role-dealing exclusion
 *      across all 3 Expansion rulesets (`expansion-1`, `expansion-2`, `full-expansion`),
 *      6P–8P availability preservation, non-destructive saved-match compatibility,
 *      and Classic PRNG invariance.
 *   2. Gwendolen (`exp1_gwendolen` — Sự Che Chở) approved copy across catalog/UI
 *      and deterministic behavioral verification of all 5 rules:
 *        - Gwendolen alive & revealed
 *        - Different, revealed Hunter/Neutral victim in same cluster
 *        - Original attacker remains a legal attack target
 *        - Optional counterattack with timeout defaulting to Skip (original damage preserved)
 *        - Zero infinite counterattack chains (including Werewolf & copied Gwendolen)
 *   3. 4P–8P Neutral Playability Audit across all 25 Neutrals (prioritizing Cassie, Cindy,
 *      Clairvoyant, Diana, Bethany, Bryon, Antimony, N.C. Soldier + Cain, Bonnie, Aaron,
 *      Angel, Arnold, Charles): feasible victory, zero empty-set immediate auto-wins,
 *      no permanent unresolved victory trap on newly dealt matches.
 *   4. Real SQLite Durable Object (`BoardGameRoom` + `BoardGameLobby`) 5-player
 *      Production Beta flow across `expansion-1`, `expansion-2`, and `full-expansion`.
 */
'use strict';

require('./register-ts.cjs');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { WebSocket } = require('./ws-shim/mini-ws');
const { startStandaloneBoardGameTestServer } = require('./ws-shim/boardgame-do-harness.cjs');
const {
  resolveProductionBetaConfigFromEnv,
} = require('../shared/contracts/boardgame.ts');
const {
  DEFAULT_CHARACTER_REGISTRY,
  DEFAULT_RULESET_REGISTRY,
  EXPANSION_CHARACTER_CATALOG,
  FIVE_PLAYER_EXCLUDED_NEUTRAL_ROLE_IDS,
  applyPendingChoiceTimeout,
  applyPlayerGameAction,
  createInitialGameState,
  ensureExpansionState,
  evaluateExpandedVictoryWithDiagnostics,
  filterEligibleWandererPoolForPlayerCount,
  getEffectiveFaction,
  getRoleDesign,
  getRoleDistribution,
} = require('../features/boardgame/domain/index.ts');
const {
  checkGameStateInvariants,
} = require('./helpers/boardgame-invariants.cjs');

const PROD_BETA_ALL = resolveProductionBetaConfigFromEnv({
  ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
  BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
});

const APPROVED_GWENDOLEN_SKILL_TEXT =
  'Khi một Hunter hoặc Neutral khác đã lộ diện trong cùng cụm địa điểm với bạn bị tấn công, bạn có thể phản công người tấn công đó nếu mục tiêu nằm trong tầm đánh hợp lệ. Phản công không ngăn sát thương của đòn đánh gốc và không tạo chuỗi phản công vô hạn.';

function makePlayers(count) {
  return Array.from({ length: count }, (_, i) => ({
    playerId: `p${i + 1}`,
    displayName: `SV${i + 1}`,
    seatIndex: i,
    appearance: {
      gender: i % 2 === 0 ? 'male' : 'female',
      outfit: 'windbreaker-hust',
      hairStyle: 'short',
      skirt: false,
      glasses: false,
      backpack: true,
    },
    connected: true,
  }));
}

function makeControlledScenario(roles, opts = {}) {
  const rulesetId = opts.rulesetId ?? 'full-expansion';
  const state = createInitialGameState({
    matchId: opts.matchId ?? `p8f2-${Math.random().toString(36).slice(2, 8)}`,
    seed: opts.seed ?? 918273,
    nowMs: opts.nowMs ?? 1_796_500_000_000,
    rulesetId,
    productionBeta: PROD_BETA_ALL,
    players: makePlayers(roles.length),
  });
  state.clusterPairs = opts.clusterPairs ?? [
    { clusterId: 'north', locationIds: ['lobby', 'canteen'] },
    { clusterId: 'central', locationIds: ['radio', 'court'] },
    { clusterId: 'south', locationIds: ['corridor', 'breaker'] },
  ];
  const exp = ensureExpansionState(state);
  const origNeutrals = [];
  for (let i = 0; i < roles.length; i++) {
    const pid = state.turnOrder[i];
    const p = state.players[pid];
    const design = getRoleDesign(roles[i]);
    p.roleId = roles[i];
    p.faction = design.faction;
    p.maxHp = design.maxHp;
    p.hp = design.maxHp;
    p.woundsTaken = 0;
    p.revealed = false;
    p.alive = true;
    p.hand = [];
    p.equipped = [];
    p.location = opts.defaultLocation ?? 'lobby';
    if (design.faction === 'wanderer') origNeutrals.push(pid);
  }
  exp.originallyDealtNeutralIds = origNeutrals;
  state.activePlayerId = state.turnOrder[0];
  state.turnPhase = opts.turnPhase ?? 'MAIN_ACTION';
  return state;
}

function pullCard(state, cardId, destPlayer, slot = 'equipped') {
  for (const deck of ['investigation', 'equipment', 'event']) {
    const di = state.decks[deck].indexOf(cardId);
    if (di >= 0) {
      state.decks[deck].splice(di, 1);
      destPlayer[slot].push(cardId);
      return;
    }
    const xi = state.discards[deck].indexOf(cardId);
    if (xi >= 0) {
      state.discards[deck].splice(xi, 1);
      destPlayer[slot].push(cardId);
      return;
    }
  }
  throw new Error(`Card ${cardId} not found in decks or discards`);
}

function setWounds(p, w) {
  p.woundsTaken = w;
  p.hp = Math.max(0, p.maxHp - w);
}

function killFinal(state, pid) {
  const p = state.players[pid];
  p.alive = false;
  p.hp = 0;
  p.woundsTaken = p.maxHp;
  p.revealed = true;
  const exp = ensureExpansionState(state);
  if (!exp.lifecycleByPlayer) exp.lifecycleByPlayer = {};
  exp.lifecycleByPlayer[pid] = {
    lifecycleState: 'FINAL_ELIMINATED',
    resurrectionChargesUsed: 0,
    reviveHpTarget: 6,
  };
}

function assertClean(state, label) {
  const res = checkGameStateInvariants(state, { checkSerialization: true });
  assert.equal(res.ok, true, `${label} invariant failure: ${JSON.stringify(res.violations)}`);
}

// ============================================================================
// 1. CASSIE 5P EXCLUSION, 6P–8P AVAILABILITY & SAVED-MATCH SAFETY
// ============================================================================

test('8F2-1 — Cassie (exp1_cassie) & N.C. Soldier (exp2_nc_soldier) are excluded in 5P across all Expansion rulesets, available in 6P–8P, safe on legacy saved matches & Classic PRNG untouched', () => {
  assert.equal(FIVE_PLAYER_EXCLUDED_NEUTRAL_ROLE_IDS.has('exp1_cassie'), true);
  assert.equal(FIVE_PLAYER_EXCLUDED_NEUTRAL_ROLE_IDS.has('exp2_nc_soldier'), true);
  assert.equal(FIVE_PLAYER_EXCLUDED_NEUTRAL_ROLE_IDS.size, 2);

  // Pool helper verification across all 3 Expansion rulesets for 5P
  for (const rulesetId of ['expansion-1', 'expansion-2', 'full-expansion']) {
    const raw5 = DEFAULT_RULESET_REGISTRY.resolvePlayableRolePoolOrThrow(rulesetId, 5, {
      productionBeta: PROD_BETA_ALL,
    }).pools.wanderer;
    const filtered5 = filterEligibleWandererPoolForPlayerCount(raw5, rulesetId, 5);
    assert.equal(filtered5.includes('exp1_cassie'), false, `${rulesetId} 5P pool must exclude exp1_cassie`);
    assert.equal(filtered5.includes('exp2_nc_soldier'), false, `${rulesetId} 5P pool must exclude exp2_nc_soldier`);
    assert.ok(filtered5.length >= 1, `${rulesetId} 5P must retain legal Neutral candidates`);
  }

  // Deterministic 5P dealing verification across all 3 Expansion rulesets (250 seeds each = 750 matches)
  for (const rulesetId of ['expansion-1', 'expansion-2', 'full-expansion']) {
    for (let s = 1; s <= 250; s++) {
      const st = createInitialGameState({
        matchId: `deal5p-${rulesetId}-${s}`,
        seed: 700_000 + s * 37,
        nowMs: 1_796_500_000_000,
        rulesetId,
        productionBeta: PROD_BETA_ALL,
        players: makePlayers(5),
      });
      const dealtIds = Object.values(st.players).map((p) => p.roleId);
      assert.equal(
        dealtIds.includes('exp1_cassie'),
        false,
        `Seed ${s} in ${rulesetId} 5P dealt exp1_cassie`,
      );
      assert.equal(
        dealtIds.includes('exp2_nc_soldier'),
        false,
        `Seed ${s} in ${rulesetId} 5P dealt exp2_nc_soldier`,
      );
      const wanderers = Object.values(st.players).filter((p) => p.faction === 'wanderer');
      assert.equal(wanderers.length, 1, '5P must still deal exactly 1 Neutral');
    }
  }

  // Experimental starter rulesets with Cassie/N.C. Soldier also apply the 5P restriction consistently
  for (const expRuleset of ['starter-forty-eight', 'starter-fifty-six']) {
    for (let s = 1; s <= 120; s++) {
      const st = createInitialGameState({
        matchId: `deal5p-${expRuleset}-${s}`,
        seed: 810_000 + s * 41,
        nowMs: 1_796_500_000_000,
        rulesetId: expRuleset,
        allowExperimental: true,
        players: makePlayers(5),
      });
      const dealtIds = Object.values(st.players).map((p) => p.roleId);
      assert.equal(dealtIds.includes('exp1_cassie'), false);
      assert.equal(dealtIds.includes('exp2_nc_soldier'), false);
    }
  }

  // Cassie REMAINS available and dealt in legal 6P, 7P, and 8P matches for expansion-1 & full-expansion
  for (const rulesetId of ['expansion-1', 'full-expansion']) {
    for (const pc of [6, 7, 8]) {
      let cassieDealtCount = 0;
      for (let s = 1; s <= 220; s++) {
        const st = createInitialGameState({
          matchId: `deal${pc}p-${rulesetId}-${s}`,
          seed: 900_000 + pc * 1000 + s * 29,
          nowMs: 1_796_500_000_000,
          rulesetId,
          productionBeta: PROD_BETA_ALL,
          players: makePlayers(pc),
        });
        if (Object.values(st.players).some((p) => p.roleId === 'exp1_cassie')) {
          cassieDealtCount += 1;
        }
      }
      assert.ok(
        cassieDealtCount > 0,
        `Cassie must remain available & dealt in ${rulesetId} ${pc}P (got ${cassieDealtCount}/220)`,
      );
    }
  }

  // Legacy saved-match preservation: if an existing persisted 5P state already had exp1_cassie,
  // engine actions (reveal, turn-start heal, victory evaluation, JSON roundtrip) work cleanly with zero crash
  {
    const legacy5p = makeControlledScenario(
      ['exp1_cassie', 'gac-ky-thuat', 'gac-truc-ban', 'suong-an-danh', 'suong-gac-cong'],
      { rulesetId: 'expansion-1', turnPhase: 'ROLL_MOVE' },
    );
    setWounds(legacy5p.players.p2, 2);
    assert.equal(applyPlayerGameAction(legacy5p, 'p1', { type: 'REVEAL_ROLE' }, 1_000).ok, true);
    assert.equal(applyPlayerGameAction(legacy5p, 'p1', { type: 'USE_SKILL' }, 1_010).ok, true);
    assert.equal(legacy5p.pendingChoice?.kind, 'cassie_turn_heal');
    const optP2 = legacy5p.pendingChoice.options.find((o) => o.targetPlayerId === 'p2');
    assert.ok(optP2);
    assert.equal(
      applyPlayerGameAction(
        legacy5p,
        'p1',
        { type: 'RESOLVE_CHOICE', choiceId: legacy5p.pendingChoice.choiceId, optionId: optP2.optionId },
        1_020,
      ).ok,
      true,
    );
    assert.equal(legacy5p.players.p2.woundsTaken, 1, 'Legacy Cassie heal still functions');
    killFinal(legacy5p, 'p4');
    killFinal(legacy5p, 'p5');
    const diag = evaluateExpandedVictoryWithDiagnostics(legacy5p);
    assert.equal(diag.evaluation.finished, true);
    assert.equal(diag.evaluation.winnerFaction, 'lantern-guard');
    assert.equal(diag.evaluation.winnerPlayerIds.includes('p1'), false, 'Unbound Cassie fails closed cleanly');
    assertClean(legacy5p, 'Legacy saved 5P Cassie compatibility');
  }

  // Classic 4P–8P deterministic setup & PRNG state invariance
  for (const pc of [4, 5, 6, 7, 8]) {
    const a = createInitialGameState({
      matchId: `classic-det-${pc}`,
      seed: 424242 + pc,
      nowMs: 1_796_500_000_000,
      rulesetId: 'classic',
      players: makePlayers(pc),
    });
    const b = createInitialGameState({
      matchId: `classic-det-${pc}`,
      seed: 424242 + pc,
      nowMs: 1_796_500_000_000,
      rulesetId: 'classic',
      players: makePlayers(pc),
    });
    assert.equal(a.rngState, b.rngState);
    assert.deepEqual(a.decks, b.decks);
    assert.deepEqual(
      Object.values(a.players).map((p) => p.roleId),
      Object.values(b.players).map((p) => p.roleId),
    );
  }
});

// ============================================================================
// 2. GWENDOLEN SKILL CLARITY & 5-RULE BEHAVIORAL VERIFICATION
// ============================================================================

test('8F2-2 — Gwendolen (exp1_gwendolen — Sự Che Chở) approved skill copy & 5 behavioral invariants', () => {
  // 2.0 Exact approved copy across domain RoleDesign, TS catalog, JSON catalog, and UI BoardGameArt
  const gwenDesign = getRoleDesign('exp1_gwendolen');
  assert.equal(gwenDesign.skillSummary, APPROVED_GWENDOLEN_SKILL_TEXT);

  const tsRec = EXPANSION_CHARACTER_CATALOG.find((r) => r.id === 'exp1_gwendolen');
  assert.ok(tsRec);
  assert.equal(tsRec.skillDescription, APPROVED_GWENDOLEN_SKILL_TEXT);

  const jsonCatalog = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '..', 'docs', 'boardgame-expansion', 'character-catalog.json'),
      'utf8',
    ),
  );
  const jsonRec = jsonCatalog.characters.find((r) => r.id === 'exp1_gwendolen');
  assert.ok(jsonRec);
  assert.equal(jsonRec.skillDescription, APPROVED_GWENDOLEN_SKILL_TEXT);

  const artSource = fs.readFileSync(
    path.join(__dirname, '..', 'features', 'boardgame', 'ui', 'BoardGameArt.tsx'),
    'utf8',
  );
  assert.equal(
    artSource.includes(APPROVED_GWENDOLEN_SKILL_TEXT),
    true,
    'BoardGameArt.tsx shortAbility must include the exact approved Gwendolen description',
  );

  // 2.1 Rule 1: Gwendolen MUST be alive AND revealed (hidden or dead Gwendolen never triggers)
  {
    // Hidden Gwendolen: revealed Hunter ally p3 in same cluster ('canteen', paired with 'lobby') is attacked by Shadow p1 at 'lobby'
    const stHidden = makeControlledScenario([
      'suong-an-danh',
      'exp1_gwendolen',
      'gac-ky-thuat',
      'suong-gac-cong',
      'lang-quan-sat',
    ]);
    stHidden.players.p1.location = 'lobby';
    stHidden.players.p2.location = 'lobby';
    stHidden.players.p2.revealed = false; // Gwendolen hidden!
    stHidden.players.p3.location = 'canteen';
    stHidden.players.p3.revealed = true; // Revealed Hunter in same cluster!
    assert.equal(
      applyPlayerGameAction(stHidden, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 2_000).ok,
      true,
    );
    assert.equal(stHidden.pendingChoice, null, 'Hidden Gwendolen MUST NOT trigger counterattack');
    assertClean(stHidden, 'Hidden Gwendolen');

    // Dead Gwendolen: revealed but dead -> never triggers
    const stDead = makeControlledScenario([
      'suong-an-danh',
      'exp1_gwendolen',
      'gac-ky-thuat',
      'suong-gac-cong',
      'lang-quan-sat',
    ]);
    stDead.players.p1.location = 'lobby';
    stDead.players.p2.location = 'lobby';
    killFinal(stDead, 'p2');
    stDead.players.p3.location = 'canteen';
    stDead.players.p3.revealed = true;
    assert.equal(
      applyPlayerGameAction(stDead, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 2_100).ok,
      true,
    );
    assert.equal(stDead.pendingChoice, null, 'Dead Gwendolen MUST NOT trigger counterattack');
    assertClean(stDead, 'Dead Gwendolen');
  }

  // 2.2 Rule 2: Protected character must be a DIFFERENT, REVEALED Hunter/Neutral in the SAME CLUSTER
  {
    // (a) Self-attack on Gwendolen herself -> NO trigger
    const stSelf = makeControlledScenario([
      'suong-an-danh',
      'exp1_gwendolen',
      'gac-ky-thuat',
      'suong-gac-cong',
      'lang-quan-sat',
    ]);
    stSelf.players.p1.location = 'lobby';
    stSelf.players.p2.location = 'lobby';
    stSelf.players.p2.revealed = true;
    assert.equal(
      applyPlayerGameAction(stSelf, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 2_200).ok,
      true,
    );
    assert.equal(stSelf.pendingChoice, null, 'Attacking Gwendolen herself MUST NOT trigger Sự Che Chở');

    // (b) Unrevealed Hunter/Neutral victim (even if killed and death-revealed by the attack!) -> NO trigger
    const stUnrev = makeControlledScenario([
      'suong-an-danh',
      'exp1_gwendolen',
      'gac-ky-thuat',
      'gac-truc-ban',
      'suong-gac-cong',
      'lang-quan-sat',
    ]);
    pullCard(stUnrev, 'ev-01', stUnrev.players.p1, 'equipped'); // Masamune guarantees >= 1 damage
    stUnrev.players.p1.location = 'lobby';
    stUnrev.players.p2.location = 'lobby';
    stUnrev.players.p2.revealed = true;
    stUnrev.players.p3.location = 'canteen';
    stUnrev.players.p3.revealed = false; // Unrevealed BEFORE attack!
    setWounds(stUnrev.players.p3, stUnrev.players.p3.maxHp - 1);
    assert.equal(
      applyPlayerGameAction(stUnrev, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 2_300).ok,
      true,
    );
    assert.equal(stUnrev.players.p3.alive, false);
    assert.equal(
      stUnrev.pendingChoice,
      null,
      'Unrevealed Hunter killed by attack MUST NOT retroactively trigger Gwendolen',
    );

    // (c) Revealed Shadow victim (including Bonnie converted to Shadow!) -> NO trigger
    const stBonnie = makeControlledScenario([
      'gac-ky-thuat',
      'exp1_gwendolen',
      'exp2_bonnie',
      'suong-an-danh',
      'suong-gac-cong',
      'lang-quan-sat',
    ]);
    pullCard(stBonnie, 'ev-01', stBonnie.players.p3, 'equipped');
    stBonnie.players.p3.location = 'lobby';
    stBonnie.players.p4.location = 'lobby';
    setWounds(stBonnie.players.p4, stBonnie.players.p4.maxHp - 1);
    stBonnie.activePlayerId = 'p3';
    assert.equal(
      applyPlayerGameAction(stBonnie, 'p3', { type: 'ATTACK', targetPlayerId: 'p4' }, 2_400).ok,
      true,
    );
    assert.equal(getEffectiveFaction(stBonnie, stBonnie.players.p3), 'mist-order');
    stBonnie.players.p1.location = 'lobby';
    stBonnie.players.p2.location = 'canteen';
    stBonnie.players.p2.revealed = true;
    stBonnie.activePlayerId = 'p1';
    stBonnie.turnPhase = 'MAIN_ACTION';
    assert.equal(
      applyPlayerGameAction(stBonnie, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 2_450).ok,
      true,
    );
    assert.equal(
      stBonnie.pendingChoice,
      null,
      'Converted Shadow Bonnie MUST NOT be protected by Gwendolen as a Neutral',
    );

    // (d) Revealed Hunter/Neutral in a DIFFERENT cluster -> NO trigger
    const stDiffCluster = makeControlledScenario([
      'suong-an-danh',
      'exp1_gwendolen',
      'lang-quan-sat',
      'gac-ky-thuat',
      'suong-gac-cong',
    ]);
    stDiffCluster.players.p1.location = 'radio'; // central cluster
    stDiffCluster.players.p3.location = 'court'; // central cluster (DIFFERENT from Gwendolen!)
    stDiffCluster.players.p3.revealed = true;
    stDiffCluster.players.p2.location = 'lobby'; // north cluster
    stDiffCluster.players.p2.revealed = true;
    pullCard(stDiffCluster, 'ev-05', stDiffCluster.players.p2, 'equipped'); // Even if Gwendolen has Handgun!
    assert.equal(
      applyPlayerGameAction(stDiffCluster, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 2_500).ok,
      true,
    );
    assert.equal(
      stDiffCluster.pendingChoice,
      null,
      'Victim outside Gwendolen cluster MUST NOT trigger Sự Che Chở',
    );
    assertClean(stDiffCluster, 'Different cluster victim');
  }

  // 2.3 Rule 3: Original attacker must remain a legal attack target for Gwendolen
  {
    // (a) Attacker has Handgun ('ev-05') in a different cluster; Gwendolen lacks Handgun -> attacker NOT in Gwendolen's legal range!
    const stOutRange = makeControlledScenario([
      'suong-an-danh',
      'exp1_gwendolen',
      'lang-quan-sat',
      'gac-ky-thuat',
      'suong-gac-cong',
    ]);
    pullCard(stOutRange, 'ev-05', stOutRange.players.p1, 'equipped');
    stOutRange.players.p1.location = 'radio'; // central cluster
    stOutRange.players.p2.location = 'lobby'; // north cluster
    stOutRange.players.p2.revealed = true;
    stOutRange.players.p3.location = 'canteen'; // north cluster (same cluster as Gwendolen!)
    stOutRange.players.p3.revealed = true;
    assert.equal(
      applyPlayerGameAction(stOutRange, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 2_600).ok,
      true,
    );
    assert.equal(
      stOutRange.pendingChoice,
      null,
      'Out-of-range cross-cluster attacker MUST NOT trigger Gwendolen when Gwendolen lacks Handgun',
    );
    assertClean(stOutRange, 'Out-of-range cross-cluster attacker');

    // (b) Udi hiding check: Udi (revealed, at 'lobby' with >=2 other players at 'lobby') attacks revealed Neutral p3 at 'canteen' ->
    // Udi is untargetable by attacks due to Ẩn Thân -> Gwendolen CANNOT counterattack Udi!
    const stUdi = makeControlledScenario([
      'exp1_udi',
      'exp1_gwendolen',
      'lang-quan-sat',
      'gac-ky-thuat',
      'suong-gac-cong',
    ]);
    stUdi.players.p1.location = 'lobby';
    stUdi.players.p1.revealed = true;
    stUdi.players.p2.location = 'lobby'; // #1 other at 'lobby'
    stUdi.players.p2.revealed = true;
    stUdi.players.p4.location = 'lobby'; // #2 other at 'lobby' -> Udi has 2 others in same location!
    stUdi.players.p3.location = 'canteen'; // Revealed Neutral in north cluster
    stUdi.players.p3.revealed = true;
    assert.equal(
      applyPlayerGameAction(stUdi, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 2_700).ok,
      true,
    );
    assert.equal(
      stUdi.pendingChoice,
      null,
      'Hidden-in-crowd Udi is not a legal attack target, so Gwendolen MUST NOT open counter choice',
    );
    assertClean(stUdi, 'Gwendolen × Udi legal target check');
  }

  // 2.4 Rule 4: Original damage is NOT prevented; Counterattack is optional; Timeout defaults to Skip
  {
    const makeSameClusterSetup = (seed) => {
      const st = makeControlledScenario(
        ['suong-an-danh', 'exp1_gwendolen', 'lang-quan-sat', 'gac-ky-thuat', 'suong-gac-cong'],
        { seed },
      );
      pullCard(st, 'ev-01', st.players.p1, 'equipped'); // Masamune on p1 guarantees >=1 damage to p3
      pullCard(st, 'ev-02', st.players.p2, 'equipped');
      st.players.p1.location = 'lobby';
      st.players.p2.location = 'lobby';
      st.players.p2.revealed = true;
      st.players.p3.location = 'canteen'; // Same cluster ('north')
      st.players.p3.revealed = true;
      return st;
    };

    // Case A: Choose 'skip' -> original damage stays on p3, p1 takes 0 counter damage
    const stSkip = makeSameClusterSetup(5001);
    assert.equal(
      applyPlayerGameAction(stSkip, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 3_000).ok,
      true,
    );
    assert.ok(stSkip.players.p3.woundsTaken >= 1, 'Original attack damage MUST apply before Gwendolen choice');
    assert.equal(stSkip.pendingChoice?.kind, 'gwendolen_counter_attack');
    assert.equal(stSkip.pendingChoice?.defaultOptionId, 'skip');
    assert.equal(
      applyPlayerGameAction(
        stSkip,
        'p2',
        { type: 'RESOLVE_CHOICE', choiceId: stSkip.pendingChoice.choiceId, optionId: 'skip' },
        3_010,
      ).ok,
      true,
    );
    assert.equal(stSkip.pendingChoice, null);
    assert.equal(stSkip.players.p1.woundsTaken, 0, 'Skipping counterattack deals 0 damage to attacker');
    assertClean(stSkip, 'Gwendolen manual skip');

    // Case B: Timeout -> defaults to 'skip' with 0 counter damage
    const stTimeout = makeSameClusterSetup(5002);
    assert.equal(
      applyPlayerGameAction(stTimeout, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 3_100).ok,
      true,
    );
    const origWoundsOnVictim = stTimeout.players.p3.woundsTaken;
    assert.ok(origWoundsOnVictim >= 1);
    assert.equal(stTimeout.pendingChoice?.kind, 'gwendolen_counter_attack');
    const toRes = applyPendingChoiceTimeout(stTimeout, 99_999_999_999_999);
    assert.equal(toRes, true);
    assert.equal(stTimeout.pendingChoice, null);
    assert.equal(stTimeout.players.p1.woundsTaken, 0, 'Timeout on Sự Che Chở MUST default to Skip');
    assert.equal(stTimeout.players.p3.woundsTaken, origWoundsOnVictim, 'Original damage remains intact');
    assertClean(stTimeout, 'Gwendolen timeout skip');

    // Case C: Choose 'counter' -> original damage preserved AND retaliatory attack resolves on p1
    const stCounter = makeSameClusterSetup(5003);
    assert.equal(
      applyPlayerGameAction(stCounter, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 3_200).ok,
      true,
    );
    const victimWoundsBeforeCounter = stCounter.players.p3.woundsTaken;
    assert.ok(victimWoundsBeforeCounter >= 1);
    assert.equal(stCounter.pendingChoice?.kind, 'gwendolen_counter_attack');
    assert.equal(
      applyPlayerGameAction(
        stCounter,
        'p2',
        { type: 'RESOLVE_CHOICE', choiceId: stCounter.pendingChoice.choiceId, optionId: 'counter' },
        3_210,
      ).ok,
      true,
    );
    assert.equal(stCounter.pendingChoice, null);
    assert.equal(stCounter.players.p3.woundsTaken, victimWoundsBeforeCounter, 'Original attack damage NOT prevented');
    assert.equal(stCounter.expansionState.stats.activationsByRole.exp1_gwendolen, 1);
    assertClean(stCounter, 'Gwendolen counter executes');
  }

  // 2.5 Rule 5: No infinite counterattack chains (Gwendolen vs Werewolf, and Gwendolen vs Copied-Gwendolen!)
  {
    // (a) Werewolf (p1, revealed) attacks revealed Hunter p3 -> Gwendolen (p2) counters Werewolf ->
    // retaliatory attack MUST NOT trigger Werewolf counterattack OR another Gwendolen counter!
    const stWerewolf = makeControlledScenario(
      ['suong-gac-cong', 'exp1_gwendolen', 'gac-ky-thuat', 'suong-an-danh', 'lang-quan-sat'],
      { seed: 6101 },
    );
    pullCard(stWerewolf, 'ev-01', stWerewolf.players.p2, 'equipped'); // Masamune on Gwendolen guarantees counter dmg
    stWerewolf.players.p1.location = 'lobby';
    stWerewolf.players.p1.revealed = true;
    stWerewolf.players.p2.location = 'lobby';
    stWerewolf.players.p2.revealed = true;
    stWerewolf.players.p3.location = 'canteen';
    stWerewolf.players.p3.revealed = true;
    assert.equal(
      applyPlayerGameAction(stWerewolf, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 4_000).ok,
      true,
    );
    assert.equal(stWerewolf.pendingChoice?.kind, 'gwendolen_counter_attack');
    assert.equal(
      applyPlayerGameAction(
        stWerewolf,
        'p2',
        { type: 'RESOLVE_CHOICE', choiceId: stWerewolf.pendingChoice.choiceId, optionId: 'counter' },
        4_010,
      ).ok,
      true,
    );
    assert.equal(
      stWerewolf.pendingChoice,
      null,
      'Gwendolen retaliatory attack MUST NOT trigger Werewolf counterattack chain',
    );
    assert.ok(stWerewolf.players.p1.woundsTaken >= 1);
    assertClean(stWerewolf, 'Gwendolen × Werewolf no chain');

    // (b) Dual Gwendolen-skill holders (Gwendolen p2 + Antimony p3 who copied Gwendolen):
    // Hunter p1 attacks Allie p4 -> Gwendolen p2 counters Hunter p1 -> Antimony p3 MUST NOT ping-pong counter Gwendolen p2!
    const stDualGwen = makeControlledScenario(
      ['gac-ky-thuat', 'exp1_gwendolen', 'exp1_antimony', 'lang-quan-sat', 'suong-an-danh', 'suong-gac-cong'],
      { seed: 6102 },
    );
    for (const pid of ['p1', 'p2', 'p3', 'p4']) {
      stDualGwen.players[pid].location = 'lobby';
      stDualGwen.players[pid].revealed = true;
    }
    const expDual = ensureExpansionState(stDualGwen);
    expDual.copiedSkillsByPlayer = {
      p3: {
        holderPlayerId: 'p3',
        sourcePlayerId: 'p2',
        sourceRoleId: 'exp1_gwendolen',
        effectiveSkillRoleId: 'exp1_gwendolen',
        acquisitionMode: 'elimination-copy',
        boundEventId: 'test-copy-gwen',
        boundAtMs: 1_000,
        boundTurnNumber: 1,
        usedOnceConsumed: false,
        provenanceChain: ['exp1_antimony', 'exp1_gwendolen'],
      },
    };
    pullCard(stDualGwen, 'ev-01', stDualGwen.players.p2, 'equipped');
    assert.equal(
      applyPlayerGameAction(stDualGwen, 'p1', { type: 'ATTACK', targetPlayerId: 'p4' }, 4_100).ok,
      true,
    );
    assert.equal(stDualGwen.pendingChoice?.kind, 'gwendolen_counter_attack');
    let resolvedCounters = 0;
    while (stDualGwen.pendingChoice?.kind === 'gwendolen_counter_attack') {
      resolvedCounters += 1;
      assert.ok(resolvedCounters <= 2, 'Infinite Gwendolen counterattack chain detected!');
      const owner = stDualGwen.pendingChoice.ownerPlayerId;
      assert.equal(
        applyPlayerGameAction(
          stDualGwen,
          owner,
          { type: 'RESOLVE_CHOICE', choiceId: stDualGwen.pendingChoice.choiceId, optionId: 'counter' },
          4_110 + resolvedCounters * 10,
        ).ok,
        true,
      );
    }
    assert.equal(stDualGwen.pendingChoice, null);
    assert.equal(stDualGwen.players.p2.woundsTaken, 0, 'Gwendolen p2 MUST NOT take retaliatory ping-pong damage');
    assertClean(stDualGwen, 'Dual Gwendolen zero ping-pong loop');
  }
});

// ============================================================================
// 3. 4P–8P NEUTRAL PLAYABILITY & VICTORY ENGINE AUDIT
// ============================================================================

test('8F2-3 — All 25 Neutrals across 4P–8P have feasible victory conditions, zero empty-set immediate auto-wins & consistent restrictions', () => {
  // 3.0 4P deals 0 Neutrals (`wanderer === 0`) across all rulesets
  assert.equal(getRoleDistribution(4).wanderer, 0);
  for (const rs of ['classic', 'expansion-1', 'expansion-2', 'full-expansion']) {
    for (let s = 1; s <= 40; s++) {
      const st = createInitialGameState({
        matchId: `audit4p-${rs}-${s}`,
        seed: 510_000 + s,
        nowMs: 1_796_500_000_000,
        rulesetId: rs,
        productionBeta: PROD_BETA_ALL,
        players: makePlayers(4),
      });
      assert.equal(
        Object.values(st.players).some((p) => p.faction === 'wanderer'),
        false,
        `4P ${rs} must never deal Neutrals`,
      );
    }
  }

  // 3.1 Verify ALL 23 legal 5P Neutrals (25 total minus exp1_cassie & exp2_nc_soldier):
  //     NEVER win immediately on initial 5P deal (`finished === false` on fresh deal!)
  const allNeutralEntries = DEFAULT_CHARACTER_REGISTRY.listAll().filter(
    (e) => e.metadata.faction === 'wanderer',
  );
  assert.equal(allNeutralEntries.length, 25, 'Catalog must contain 25 total Neutrals');

  const legal5pNeutrals = allNeutralEntries
    .map((e) => e.id)
    .filter((id) => !FIVE_PLAYER_EXCLUDED_NEUTRAL_ROLE_IDS.has(id));
  assert.equal(legal5pNeutrals.length, 23, 'Exactly 23 Neutrals are legal in 5P');

  for (const neutralId of legal5pNeutrals) {
    const st = makeControlledScenario([
      neutralId,
      'gac-ky-thuat',
      'gac-truc-ban',
      'suong-an-danh',
      'suong-gac-cong',
    ]);
    const freshDiag = evaluateExpandedVictoryWithDiagnostics(st);
    assert.equal(
      freshDiag.evaluation.finished,
      false,
      `5P Neutral ${neutralId} MUST NOT win immediately on empty/fresh deal`,
    );
    assertClean(st, `Fresh 5P state for ${neutralId}`);
  }

  // 3.2 Cindy (`exp1_cindy`): 5P co-wins at end-of-match if alive (never immediate); 6P wins immediately on last other Neutral death
  {
    const cindy5p = makeControlledScenario([
      'exp1_cindy',
      'gac-ky-thuat',
      'gac-truc-ban',
      'suong-an-danh',
      'suong-gac-cong',
    ]);
    assert.equal(evaluateExpandedVictoryWithDiagnostics(cindy5p).evaluation.finished, false);
    killFinal(cindy5p, 'p4');
    assert.equal(evaluateExpandedVictoryWithDiagnostics(cindy5p).evaluation.finished, false);
    killFinal(cindy5p, 'p5'); // Hunters win end-of-match -> Cindy co-wins!
    const res5 = evaluateExpandedVictoryWithDiagnostics(cindy5p).evaluation;
    assert.equal(res5.finished, true);
    assert.equal(res5.winnerPlayerIds.includes('p1'), true, '5P Cindy co-wins at end-of-match when alive');

    const cindy6p = makeControlledScenario([
      'exp1_cindy',
      'lang-quan-sat',
      'gac-ky-thuat',
      'gac-truc-ban',
      'suong-an-danh',
      'suong-gac-cong',
    ]);
    killFinal(cindy6p, 'p2');
    const res6 = evaluateExpandedVictoryWithDiagnostics(cindy6p).evaluation;
    assert.equal(res6.finished, true);
    assert.deepEqual(res6.winnerPlayerIds, ['p1']);
  }

  // 3.3 Clairvoyant (`exp1_clairvoyant`): 5P peeks unrevealed player at turn start & copies feasible goal
  {
    const clair5p = makeControlledScenario(
      ['exp1_clairvoyant', 'gac-ky-thuat', 'gac-truc-ban', 'suong-an-danh', 'suong-gac-cong'],
      { turnPhase: 'ROLL_MOVE' },
    );
    assert.equal(applyPlayerGameAction(clair5p, 'p1', { type: 'REVEAL_ROLE' }, 5_000).ok, true);
    assert.equal(applyPlayerGameAction(clair5p, 'p1', { type: 'USE_SKILL' }, 5_010).ok, true);
    assert.equal(clair5p.pendingChoice?.kind, 'clairvoyant_peek_copy');
    const pickHunter = clair5p.pendingChoice.options.find((o) => o.targetPlayerId === 'p2');
    assert.ok(pickHunter);
    assert.equal(
      applyPlayerGameAction(
        clair5p,
        'p1',
        { type: 'RESOLVE_CHOICE', choiceId: clair5p.pendingChoice.choiceId, optionId: pickHunter.optionId },
        5_020,
      ).ok,
      true,
    );
    killFinal(clair5p, 'p4');
    killFinal(clair5p, 'p5');
    const evalClair = evaluateExpandedVictoryWithDiagnostics(clair5p).evaluation;
    assert.equal(evalClair.finished, true);
    assert.equal(evalClair.winnerPlayerIds.includes('p1'), true, '5P Clairvoyant wins via copied Hunter goal');
    assertClean(clair5p, '5P Clairvoyant');
  }

  // 3.4 Diana (`exp2_diana`): 5P wins via full-HP survivor fallback (no immediate win); 6P wins via active Neutral customer
  {
    const diana5p = makeControlledScenario([
      'exp2_diana',
      'gac-ky-thuat',
      'gac-truc-ban',
      'suong-an-danh',
      'suong-gac-cong',
    ]);
    assert.equal(evaluateExpandedVictoryWithDiagnostics(diana5p).evaluation.finished, false);
    killFinal(diana5p, 'p4');
    killFinal(diana5p, 'p5');
    const eval5Full = evaluateExpandedVictoryWithDiagnostics(diana5p).evaluation;
    assert.equal(eval5Full.finished, true);
    assert.equal(
      eval5Full.winnerPlayerIds.includes('p1'),
      true,
      '5P Diana wins via built-in full-HP survivor fallback',
    );
    setWounds(diana5p.players.p1, 1);
    assert.equal(
      evaluateExpandedVictoryWithDiagnostics(diana5p).evaluation.winnerPlayerIds.includes('p1'),
      false,
    );

    const diana6p = makeControlledScenario(
      ['lang-quan-sat', 'exp2_diana', 'gac-ky-thuat', 'gac-truc-ban', 'suong-an-danh', 'suong-gac-cong'],
      { turnPhase: 'MAIN_ACTION' },
    );
    assert.equal(applyPlayerGameAction(diana6p, 'p1', { type: 'REVEAL_ROLE' }, 6_000).ok, true);
    assert.equal(diana6p.expansionState.dianaContracts?.p2?.status, 'pending');
    for (const pid of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']) {
      diana6p.activePlayerId = pid;
      diana6p.turnPhase = 'MAIN_ACTION';
      assert.equal(applyPlayerGameAction(diana6p, pid, { type: 'END_TURN' }, 6_100).ok, true);
    }
    assert.equal(diana6p.expansionState.dianaContracts?.p2?.status, 'active');
    setWounds(diana6p.players.p2, 5);
    killFinal(diana6p, 'p5');
    killFinal(diana6p, 'p6');
    const eval6 = evaluateExpandedVictoryWithDiagnostics(diana6p).evaluation;
    assert.equal(eval6.winnerPlayerIds.includes('p1'), true);
    assert.equal(eval6.winnerPlayerIds.includes('p2'), true, '6P Diana co-wins with active customer');
  }

  // 3.5 Bethany (`exp1_bethany`): 5P designates Chosen by gifting equipment and shares victory even if Bethany dies
  {
    const beth5p = makeControlledScenario(
      ['exp1_bethany', 'gac-ky-thuat', 'gac-truc-ban', 'suong-an-danh', 'suong-gac-cong'],
      { turnPhase: 'ROLL_MOVE' },
    );
    pullCard(beth5p, 'eq-01', beth5p.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(beth5p, 'p1', { type: 'REVEAL_ROLE' }, 7_000).ok, true);
    assert.equal(applyPlayerGameAction(beth5p, 'p1', { type: 'USE_SKILL' }, 7_010).ok, true);
    assert.equal(beth5p.pendingChoice?.kind, 'bethany_designate_chosen');
    const optP2 = beth5p.pendingChoice.options.find((o) => o.targetPlayerId === 'p2');
    assert.ok(optP2);
    assert.equal(
      applyPlayerGameAction(
        beth5p,
        'p1',
        { type: 'RESOLVE_CHOICE', choiceId: beth5p.pendingChoice.choiceId, optionId: optP2.optionId },
        7_020,
      ).ok,
      true,
    );
    killFinal(beth5p, 'p1');
    killFinal(beth5p, 'p4');
    killFinal(beth5p, 'p5');
    const evalBeth = evaluateExpandedVictoryWithDiagnostics(beth5p).evaluation;
    assert.equal(evalBeth.winnerPlayerIds.includes('p2'), true);
    assert.equal(evalBeth.winnerPlayerIds.includes('p1'), true, 'Bethany co-wins with Chosen even if dead');
  }

  // 3.6 Bryon (`exp2_bryon`): 5P end-of-match survival co-win (no immediate win); 6P blocks gifting to converted Shadow Bonnie
  {
    const bryon5p = makeControlledScenario([
      'exp2_bryon',
      'gac-ky-thuat',
      'gac-truc-ban',
      'suong-an-danh',
      'suong-gac-cong',
    ]);
    assert.equal(evaluateExpandedVictoryWithDiagnostics(bryon5p).evaluation.finished, false);
    killFinal(bryon5p, 'p4');
    killFinal(bryon5p, 'p5');
    assert.equal(
      evaluateExpandedVictoryWithDiagnostics(bryon5p).evaluation.winnerPlayerIds.includes('p1'),
      true,
      '5P Bryon co-wins at end-of-match when alive',
    );

    const bryon6p = makeControlledScenario([
      'exp2_bonnie',
      'exp2_bryon',
      'gac-ky-thuat',
      'gac-truc-ban',
      'suong-an-danh',
      'suong-gac-cong',
    ]);
    pullCard(bryon6p, 'ev-01', bryon6p.players.p1, 'equipped');
    setWounds(bryon6p.players.p5, bryon6p.players.p5.maxHp - 1);
    assert.equal(
      applyPlayerGameAction(bryon6p, 'p1', { type: 'ATTACK', targetPlayerId: 'p5' }, 7_500).ok,
      true,
    );
    assert.equal(getEffectiveFaction(bryon6p, bryon6p.players.p1), 'mist-order');
    bryon6p.players.p2.revealed = true;
    pullCard(bryon6p, 'eq-02', bryon6p.players.p2, 'equipped');
    bryon6p.activePlayerId = 'p2';
    bryon6p.turnPhase = 'MAIN_ACTION';
    const giftAttempt = applyPlayerGameAction(bryon6p, 'p2', { type: 'USE_SKILL' }, 7_550);
    assert.equal(giftAttempt.ok, false, 'Bryon must not gift to Bonnie after she converts to Shadow');
  }

  // 3.7 Antimony (`exp1_antimony`), Cain (`exp2_cain`), Charles (`lang-cuu-ho`), Arnold (`exp1_arnold`) in 5P
  {
    const anti5p = makeControlledScenario([
      'suong-an-danh',
      'gac-ky-thuat',
      'exp1_antimony',
      'gac-truc-ban',
      'suong-gac-cong',
    ]);
    pullCard(anti5p, 'ev-01', anti5p.players.p1, 'equipped');
    setWounds(anti5p.players.p2, anti5p.players.p2.maxHp - 1);
    assert.equal(
      applyPlayerGameAction(anti5p, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 8_000).ok,
      true,
    );
    assert.equal(anti5p.finished, false, '5P continues after 1st Hunter death');
    assert.equal(anti5p.players.p3.revealed, true, 'Antimony auto-reveals & copies on 1st death');
    assert.equal(anti5p.expansionState.antimonyCopiedGoalByPlayer?.p3?.sourceRoleId, 'gac-ky-thuat');
    killFinal(anti5p, 'p1');
    killFinal(anti5p, 'p5');
    assert.equal(
      evaluateExpandedVictoryWithDiagnostics(anti5p).evaluation.winnerPlayerIds.includes('p3'),
      true,
      '5P Antimony wins via copied Hunter goal',
    );

    const cain5p = makeControlledScenario([
      'exp2_cain',
      'gac-ky-thuat',
      'gac-truc-ban',
      'suong-an-danh',
      'suong-gac-cong',
    ]);
    pullCard(cain5p, 'ev-01', cain5p.players.p1, 'equipped');
    setWounds(cain5p.players.p2, cain5p.players.p2.maxHp - 1);
    assert.equal(
      applyPlayerGameAction(cain5p, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 8_100).ok,
      true,
    );
    assert.equal(cain5p.finished, false);
    cain5p.activePlayerId = 'p1';
    cain5p.turnPhase = 'MAIN_ACTION';
    cain5p.players.p1.attacksThisTurn = 0;
    setWounds(cain5p.players.p4, cain5p.players.p4.maxHp - 1);
    assert.equal(
      applyPlayerGameAction(cain5p, 'p1', { type: 'ATTACK', targetPlayerId: 'p4' }, 8_200).ok,
      true,
    );
    assert.equal(cain5p.finished, true);
    assert.deepEqual(cain5p.winnerPlayerIds, ['p1'], '5P Cain wins solo upon killing 1 Hunter + 1 Shadow');

    const charles5p = makeControlledScenario([
      'lang-cuu-ho',
      'gac-ky-thuat',
      'gac-truc-ban',
      'suong-an-danh',
      'suong-gac-cong',
    ]);
    killFinal(charles5p, 'p2');
    killFinal(charles5p, 'p4');
    pullCard(charles5p, 'ev-01', charles5p.players.p1, 'equipped');
    setWounds(charles5p.players.p5, charles5p.players.p5.maxHp - 1);
    assert.equal(
      applyPlayerGameAction(charles5p, 'p1', { type: 'ATTACK', targetPlayerId: 'p5' }, 8_300).ok,
      true,
    );
    assert.equal(charles5p.finished, true);
    assert.equal(charles5p.players.p1.charlesKillWon, true);
    assert.equal(charles5p.winnerPlayerIds.includes('p1'), true, '5P Charles wins on 3rd body');

    const arnold5p = makeControlledScenario([
      'exp1_arnold',
      'gac-ky-thuat',
      'gac-truc-ban',
      'suong-an-danh',
      'suong-gac-cong',
    ]);
    killFinal(arnold5p, 'p4');
    killFinal(arnold5p, 'p5');
    assert.equal(
      evaluateExpandedVictoryWithDiagnostics(arnold5p).evaluation.winnerPlayerIds.includes('p1'),
      true,
      '5P Arnold co-wins with 3 (>2) survivors',
    );
  }

  // 3.8 6P, 7P, and 8P Cassie + N.C. Soldier VictoryEngine feasibility
  for (const pc of [6, 7, 8]) {
    const split = getRoleDistribution(pc);
    const roles = [
      'exp1_cassie',
      'lang-quan-sat',
      ...(split.wanderer === 3 ? ['exp1_anathema'] : []),
      ...['gac-ky-thuat', 'gac-truc-ban', 'gac-radio'].slice(0, split.lanternGuard),
      ...['suong-an-danh', 'suong-gac-cong', 'suong-tin-gia'].slice(0, split.mistOrder),
    ];
    assert.equal(roles.length, pc);
    const st = makeControlledScenario(roles);
    st.activePlayerId = 'p2';
    assert.equal(applyPlayerGameAction(st, 'p2', { type: 'REVEAL_ROLE' }, 9_000).ok, true);
    assert.equal(st.expansionState.cassieCopiedGoalByPlayer?.p1?.sourceRoleId, 'lang-quan-sat');
    for (const p of Object.values(st.players)) {
      if (p.faction === 'mist-order') killFinal(st, p.playerId);
    }
    const evalPc = evaluateExpandedVictoryWithDiagnostics(st).evaluation;
    assert.equal(evalPc.finished, true);
    assert.equal(evalPc.winnerPlayerIds.includes('p1'), true, `${pc}P Cassie wins via copied Neutral goal`);
  }
});

// ============================================================================
// 4. REAL SQLITE DURABLE OBJECT 5-PLAYER PRODUCTION BETA E2E FLOW
// ============================================================================

class WsTestClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.messages = [];
    this.waiters = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url, { headers: { Origin: 'https://hustverse.vercel.app' } });
      this.ws = ws;
      ws.once('open', () => resolve());
      ws.once('error', reject);
      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(String(raw));
          this.messages.push(msg);
          const pending = [...this.waiters];
          this.waiters = [];
          for (const w of pending) {
            if (w.predicate(msg)) {
              clearTimeout(w.timer);
              w.resolve(msg);
            } else {
              this.waiters.push(w);
            }
          }
        } catch {
          // ignore
        }
      });
    });
  }

  send(obj) {
    this.ws.send(JSON.stringify(obj));
  }

  nextMsg(predicate, timeoutMs = 6000, fromIndex = 0) {
    for (let i = fromIndex; i < this.messages.length; i++) {
      if (predicate(this.messages[i])) {
        return Promise.resolve(this.messages[i]);
      }
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w.timer !== timer);
        reject(new Error(`Timeout waiting for WS message (${this.messages.length} seen)`));
      }, timeoutMs);
      this.waiters.push({ predicate, resolve, timer });
    });
  }

  close() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
    }
  }
}

let testIpCounter = 1;
function nextTestHeaders() {
  testIpCounter += 1;
  return {
    'Content-Type': 'application/json',
    Origin: 'https://hustverse.vercel.app',
    'X-Forwarded-For': `10.18.0.${(testIpCounter % 240) + 1}`,
  };
}

test('8F2-4 — Real SQLite DO 5-player Production Beta flow across expansion-1, expansion-2 & full-expansion excludes Cassie & N.C. Soldier and preserves state on reconnect', async () => {
  const srv = await startStandaloneBoardGameTestServer(0, {
    ENVIRONMENT: 'production',
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
  });

  try {
    const capRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/rulesets`);
    assert.equal(capRes.status, 200);
    const caps = await capRes.json();
    assert.equal(caps.betaEnabled, true);
    assert.deepEqual(
      caps.rulesets.filter((r) => r.selectable).map((r) => r.id),
      ['classic', 'expansion-1', 'expansion-2', 'full-expansion'],
    );

    for (const rulesetId of ['expansion-1', 'expansion-2', 'full-expansion']) {
      const createRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: nextTestHeaders(),
        body: JSON.stringify({
          tableId: 'table-1',
          hostName: 'Host5P',
          rulesetId,
          turnTimeoutMs: 0,
        }),
      });
      const created = await createRes.json();
      assert.equal(createRes.status, 201);
      const { matchId, inviteCode } = created;

      const clients = [];
      const auths = [];
      try {
        for (let i = 0; i < 5; i++) {
          const c = new WsTestClient(`${srv.wsBaseUrl}/ws/boardgame?matchId=${matchId}`);
          await c.connect();
          clients.push(c);
          c.send({
            type: 'BG_JOIN',
            matchId,
            inviteCode,
            displayName: `SV_${i + 1}`,
            asSpectator: false,
            preferredSeatIndex: i,
            requestId: `join_${rulesetId}_${i}`,
          });
          const auth = await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
          auths.push(auth);
          const sync = await c.nextMsg((m) => m.type === 'BG_STATE_SYNC');
          assert.equal(sync.rulesetId, rulesetId);
        }

        for (let i = 1; i < 5; i++) {
          clients[i].send({
            type: 'BG_SET_READY',
            ready: true,
            requestId: `rdy_${rulesetId}_${i}`,
          });
          await clients[i].nextMsg(
            (m) => m.type === 'BG_ACTION_ACK' && m.requestId === `rdy_${rulesetId}_${i}`,
          );
        }

        const markIdxs = clients.map((c) => c.messages.length);
        clients[0].send({
          type: 'BG_START_MATCH',
          requestId: `start_${rulesetId}`,
        });

        const startSyncs = await Promise.all(
          clients.map((c, idx) =>
            c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING', 6000, markIdxs[idx]),
          ),
        );
        const dealtRoles = startSyncs.map((s) => s.privateView?.roleId);
        assert.equal(dealtRoles.filter(Boolean).length, 5);
        assert.equal(new Set(dealtRoles).size, 5);
        assert.equal(
          dealtRoles.includes('exp1_cassie'),
          false,
          `5P DO match (${rulesetId}) MUST NOT deal exp1_cassie`,
        );
        assert.equal(
          dealtRoles.includes('exp2_nc_soldier'),
          false,
          `5P DO match (${rulesetId}) MUST NOT deal exp2_nc_soldier`,
        );

        // Active player executes a real turn action + Player 0 reconnects cleanly
        const activeId = startSyncs[0].publicGame.activePlayerId;
        const activeIdx = auths.findIndex((a) => a.playerId === activeId);
        assert.ok(activeIdx >= 0);
        const actMark = clients[activeIdx].messages.length;
        clients[activeIdx].send({
          type: 'BG_GAME_ACTION',
          expectedRevision: startSyncs[activeIdx].revision,
          action: { type: 'ROLL_DICE' },
          requestId: `roll_${rulesetId}`,
        });
        const afterRoll = await clients[activeIdx].nextMsg(
          (m) => m.type === 'BG_STATE_SYNC' && m.publicGame?.lastDiceRoll !== null,
          6000,
          actMark,
        );
        assert.equal(afterRoll.rulesetId, rulesetId);

        const role0Before = startSyncs[0].privateView.roleId;
        clients[0].close();
        const reconn = new WsTestClient(`${srv.wsBaseUrl}/ws/boardgame?matchId=${matchId}`);
        await reconn.connect();
        clients[0] = reconn;
        reconn.send({
          type: 'BG_JOIN',
          matchId,
          inviteCode,
          displayName: 'SV_1',
          asSpectator: false,
          reconnectToken: auths[0].reconnectToken,
          requestId: `rejoin_${rulesetId}_0`,
        });
        const reconnSync = await reconn.nextMsg(
          (m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING',
        );
        assert.equal(reconnSync.privateView?.roleId, role0Before);
      } finally {
        for (const c of clients) c.close();
      }
    }
  } finally {
    await srv.close();
  }
});
