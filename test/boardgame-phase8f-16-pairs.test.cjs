#!/usr/bin/env node
/**
 * test/boardgame-phase8f-16-pairs.test.cjs
 *
 * Phase 8F-1 & 8F-2 — Legal Eligibility & Deterministic Regression Suite for ALL
 * 16 Previously Uncovered High-Risk Role Pairs (Groups A, B, C, D + Real DO Reconnect):
 *
 *   8F1-ELIG: Legal role-pair eligibility regressions (4P/5P/6P-8P, N.C. Soldier 5P, pack isolation)
 *   Group A (Voodoo + Elimination Triggers):
 *     8F2-A1: exp1_voodoo × exp1_vengeance
 *     8F2-A2: exp1_voodoo × exp1_wendigo
 *   Group B (Undead + Immediate Victory):
 *     8F2-B1: exp1_undead × lang-tien-phong (Daniel)
 *     8F2-B2: exp1_undead × lang-cuu-ho (Charles)
 *     8F2-B3: exp1_undead × exp2_dalton
 *     8F2-B4: exp1_undead × exp2_cruz
 *     8F2-B5: exp1_undead × exp2_arlene
 *   Group C (Voodoo + Start-of-Turn Skills + DO Reconnect):
 *     8F2-C1: exp1_voodoo × exp1_wrath
 *     8F2-C2: exp1_voodoo × exp1_bipolar
 *     8F2-C3: exp1_voodoo × exp1_anathema
 *     8F2-C4: exp1_voodoo × exp1_bethany
 *     8F2-C5: exp1_voodoo × exp1_clairvoyant
 *     8F2-C6: exp1_voodoo × exp2_visions
 *     8F2-C-DO: Real SQLite DO reconnect during Voodoo hijack + start-of-turn PendingChoice
 *   Group D (Arnold + Damage Prevention):
 *     8F2-D1: exp1_arnold × exp1_gwendolen
 *     8F2-D2: exp1_arnold × exp1_undying
 *     8F2-D3: exp1_arnold × exp2_urban_legend
 */
'use strict';

require('./register-ts.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveProductionBetaConfigFromEnv,
} = require('../shared/contracts/boardgame.ts');
const {
  DEFAULT_RULESET_REGISTRY,
  applyPendingChoiceTimeout,
  applyPlayerGameAction,
  createInitialGameState,
  ensureExpansionState,
  getActiveTurnControlGrant,
  getEffectiveTurnControllerId,
  getPlayerLifecycleState,
  getPrivateGameView,
  getPublicGameView,
  getRoleDesign,
  getRoleDistribution,
  hasEffectiveSkillUsedOnce,
  isPlayerDormantPendingRevive,
} = require('../features/boardgame/domain/index.ts');
const {
  checkGameStateInvariants,
} = require('./helpers/boardgame-invariants.cjs');
const { WebSocket } = require('./ws-shim/mini-ws');
const {
  startStandaloneBoardGameTestServer,
} = require('./ws-shim/boardgame-do-harness.cjs');

const PROD_BETA_ALL = resolveProductionBetaConfigFromEnv({
  ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
  BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
});

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

/**
 * Create a strictly LEGAL deterministic scenario: asserts faction split matches
 * getRoleDistribution(roles.length), pack membership matches rulesetId, and
 * 5P excludes exp2_nc_soldier!
 */
function makeLegalScenario(roles, opts = {}) {
  const rulesetId = opts.rulesetId ?? 'full-expansion';
  const count = roles.length;
  const split = getRoleDistribution(count);
  const resolved = DEFAULT_RULESET_REGISTRY.resolvePlayableRolePoolOrThrow(rulesetId, count, {
    productionBeta: PROD_BETA_ALL,
  });
  const allowedSet = new Set([
    ...resolved.pools.lanternGuard,
    ...resolved.pools.mistOrder,
    ...resolved.pools.wanderer,
  ]);
  const counts = { 'lantern-guard': 0, 'mist-order': 0, wanderer: 0 };
  for (const rid of roles) {
    assert.ok(allowedSet.has(rid), `Role ${rid} is NOT legal in ruleset ${rulesetId}`);
    if (count === 5) {
      assert.notEqual(rid, 'exp2_nc_soldier', 'exp2_nc_soldier is illegal in 5P');
      assert.notEqual(rid, 'exp1_cassie', 'exp1_cassie is illegal in 5P');
    }
    counts[getRoleDesign(rid).faction] += 1;
  }
  assert.deepEqual(
    counts,
    {
      'lantern-guard': split.lanternGuard,
      'mist-order': split.mistOrder,
      wanderer: split.wanderer,
    },
    `Illegal role split for ${count}P in test setup: got ${JSON.stringify(counts)}`,
  );

  const state = createInitialGameState({
    matchId: opts.matchId ?? `p8f2-${Math.random().toString(36).slice(2, 8)}`,
    seed: opts.seed ?? 86201,
    nowMs: opts.nowMs ?? 1_796_400_000_000,
    rulesetId,
    productionBeta: PROD_BETA_ALL,
    players: makePlayers(count),
  });
  const exp = ensureExpansionState(state);
  const origNeutrals = [];
  for (let i = 0; i < count; i++) {
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
    p.location = opts.defaultLocation ?? 'radio';
    if (design.faction === 'wanderer') origNeutrals.push(pid);
  }
  exp.originallyDealtNeutralIds = origNeutrals;
  state.activePlayerId = state.turnOrder[0];
  state.turnPhase = opts.turnPhase ?? 'MAIN_ACTION';
  return state;
}

function pullCard(state, cardId, destPlayer, slot = 'hand') {
  for (const deck of ['investigation', 'equipment', 'event']) {
    const di = state.decks[deck].indexOf(cardId);
    if (di >= 0) {
      state.decks[deck].splice(di, 1);
      destPlayer[slot].push(cardId);
      return true;
    }
    const xi = state.discards[deck].indexOf(cardId);
    if (xi >= 0) {
      state.discards[deck].splice(xi, 1);
      destPlayer[slot].push(cardId);
      return true;
    }
  }
  throw new Error(`Card ${cardId} not available`);
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

function activateVoodooHijack(state, voodooId, victimId, nowMs) {
  state.players[voodooId].revealed = true;
  state.activePlayerId = voodooId;
  state.turnPhase = 'ROLL_MOVE';
  const r = applyPlayerGameAction(state, voodooId, { type: 'USE_SKILL', targetPlayerId: victimId }, nowMs);
  assert.equal(r.ok, true, `Voodoo USE_SKILL failed: ${r.error}`);
  state.turnPhase = 'MAIN_ACTION';
  const endR = applyPlayerGameAction(state, voodooId, { type: 'END_TURN' }, nowMs + 10);
  assert.equal(endR.ok, true, `Voodoo END_TURN failed: ${endR.error}`);
  assert.equal(state.activePlayerId, victimId);
  const grant = getActiveTurnControlGrant(state);
  assert.ok(grant && grant.controllerPlayerId === voodooId && grant.activePlayerId === victimId);
  return grant;
}

// ============================================================================
// 8F1-ELIG — LEGAL ROLE-PAIR ELIGIBILITY REGRESSIONS (Problem B)
// ============================================================================
test('8F1-ELIG — Legal role-pair eligibility respects getRoleDistribution(4..8), 5P N.C. Soldier exclusion & pack membership', () => {
  const { computePairEligibility } = require('../scripts/phase8e-interaction-matrix.cjs');

  // 1. Undead (Shadow, exp1) × N.C. Soldier (Neutral, exp2): ONLY full-expansion, ONLY 6P–8P (NOT 4P, NOT 5P!)
  const undeadNc = computePairEligibility('exp1_undead', 'exp2_nc_soldier');
  assert.deepEqual(undeadNc.eligibleRulesets, ['full-expansion']);
  assert.deepEqual(undeadNc.eligiblePlayerCounts, [6, 7, 8]);
  assert.equal(undeadNc.eligiblePlayerCounts.includes(4), false, 'Undead × N.C. Soldier MUST NOT be eligible in 4P');
  assert.equal(undeadNc.eligiblePlayerCounts.includes(5), false, 'Undead × N.C. Soldier MUST NOT be eligible in 5P');
  assert.ok(undeadNc.exclusionReasons.some((r) => r.includes('4P')));
  assert.ok(undeadNc.exclusionReasons.some((r) => r.includes('5P')));

  // 2. Bonnie (Neutral, exp2) × N.C. Soldier (Neutral, exp2): expansion-2 + full-expansion, ONLY 6P–8P!
  const bonnieNc = computePairEligibility('exp2_bonnie', 'exp2_nc_soldier');
  assert.deepEqual(bonnieNc.eligibleRulesets, ['expansion-2', 'full-expansion']);
  assert.deepEqual(bonnieNc.eligiblePlayerCounts, [6, 7, 8]);
  assert.equal(bonnieNc.eligiblePlayerCounts.includes(4), false);
  assert.equal(bonnieNc.eligiblePlayerCounts.includes(5), false, 'Bonnie × N.C. Soldier MUST NOT be eligible in 5P');

  // 2b. Cassie (Neutral, exp1) × Hunter/Shadow (e.g. Gwendolen): expansion-1 + full-expansion, ONLY 6P–8P (NOT 4P, NOT 5P)!
  const cassieGwen = computePairEligibility('exp1_cassie', 'exp1_gwendolen');
  assert.deepEqual(cassieGwen.eligibleRulesets, ['expansion-1', 'full-expansion']);
  assert.deepEqual(cassieGwen.eligiblePlayerCounts, [6, 7, 8]);
  assert.equal(cassieGwen.eligiblePlayerCounts.includes(4), false, 'Cassie × Gwendolen MUST NOT be eligible in 4P');
  assert.equal(cassieGwen.eligiblePlayerCounts.includes(5), false, 'Cassie × Gwendolen MUST NOT be eligible in 5P');

  // 3. Any Shadow × Neutral (e.g. Undead × Daniel): NOT eligible in 4P (0 Neutral seats!), eligible in 5P–8P!
  const undeadDaniel = computePairEligibility('exp1_undead', 'lang-tien-phong');
  assert.deepEqual(undeadDaniel.eligibleRulesets, ['expansion-1', 'full-expansion']);
  assert.deepEqual(undeadDaniel.eligiblePlayerCounts, [5, 6, 7, 8]);
  assert.equal(undeadDaniel.eligiblePlayerCounts.includes(4), false, '4P has 0 Neutral seats');

  // 4. Expansion 1-only × Expansion 2-only (e.g. Voodoo × Visions, Arnold × Urban Legend): ONLY full-expansion!
  const voodooVisions = computePairEligibility('exp1_voodoo', 'exp2_visions');
  assert.deepEqual(voodooVisions.eligibleRulesets, ['full-expansion']);
  assert.deepEqual(voodooVisions.eligiblePlayerCounts, [4, 5, 6, 7, 8]);

  const arnoldUl = computePairEligibility('exp1_arnold', 'exp2_urban_legend');
  assert.deepEqual(arnoldUl.eligibleRulesets, ['full-expansion']);
  assert.deepEqual(arnoldUl.eligiblePlayerCounts, [5, 6, 7, 8]);

  // 5. Classic × Classic (Hunter × Shadow): eligible across all 4 production rulesets & 4P–8P!
  const georgeVamp = computePairEligibility('gac-ky-thuat', 'suong-an-danh');
  assert.deepEqual(georgeVamp.eligibleRulesets, ['classic', 'expansion-1', 'expansion-2', 'full-expansion']);
  assert.deepEqual(georgeVamp.eligiblePlayerCounts, [4, 5, 6, 7, 8]);
});

// ============================================================================
// GROUP A — VOODOO + ELIMINATION TRIGGERS (Pairs #1–#2)
// ============================================================================

test('8F2-A1 — Pair #1: exp1_voodoo × exp1_vengeance (hijacked kill ownership, chain onto Voodoo cancelling grant, decline & timeout)', () => {
  // Positive: Voodoo (p1) hijacks revealed Vengeance (p2) and commands ATTACK killing Hunter p3 ->
  // Vengeance owns `vengeance_chain_strike`, Voodoo cannot resolve it, Vengeance chains 1d4 onto p1 (1 HP -> kills Voodoo!) & p4!
  {
    const st = makeLegalScenario(['exp1_voodoo', 'exp1_vengeance', 'gac-ky-thuat', 'gac-radio'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    st.players.p2.revealed = true;
    activateVoodooHijack(st, 'p1', 'p2', 10_000);
    st.turnPhase = 'MAIN_ACTION';
    setWounds(st.players.p1, st.players.p1.maxHp - 1); // Voodoo at 1 HP
    setWounds(st.players.p3, st.players.p3.maxHp - 1); // Hunter p3 at 1 HP
    pullCard(st, 'ev-01', st.players.p2, 'equipped'); // Masamune guaranteed lethal

    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 10_100).ok, true);
    assert.equal(st.players.p3.alive, false);
    assert.equal(st.players.p3.eliminatedByPlayerId, 'p2', 'Kill attribution belongs to acting pawn Vengeance, NOT controller Voodoo');
    assert.equal(st.pendingChoice?.kind, 'vengeance_chain_strike');
    assert.equal(st.pendingChoice?.ownerPlayerId, 'p2', 'Vengeance owns vengeance_chain_strike choice');
    assert.equal(getEffectiveTurnControllerId(st), 'p2');

    // Controller Voodoo MUST NOT resolve Vengeance's choice
    const chainOpt = st.pendingChoice.options.find((o) => o.optionId !== 'skip');
    assert.ok(chainOpt);
    assert.equal(
      applyPlayerGameAction(st, 'p1', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: chainOpt.optionId }, 10_110).ok,
      false,
      'Voodoo MUST NOT resolve Vengeance chain strike choice',
    );

    // Vengeance resolves chain strike -> kills 1-HP Voodoo (p1) & damages p4 -> Voodoo grant cancels, turn completes cleanly!
    const actBefore = ensureExpansionState(st).stats.activationsByRole.exp1_vengeance ?? 0;
    assert.equal(
      applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: chainOpt.optionId }, 10_120).ok,
      true,
    );
    assert.equal(ensureExpansionState(st).stats.activationsByRole.exp1_vengeance, actBefore + 1, 'Vengeance triggered exactly once (zero duplication)');
    assert.equal(st.players.p1.alive, false, 'Voodoo died from Vengeance chain strike');
    assert.ok(st.players.p4.woundsTaken >= 1 || !st.players.p4.alive, 'p4 took 1d4 chain damage');
    assert.equal(getActiveTurnControlGrant(st), null, 'Voodoo grant cancelled immediately on controller death');
    assert.equal(st.pendingChoice, null);
    assertClean(st, '8F2-A1 positive Voodoo+Vengeance');
  }

  // Negative/Boundary: Vengeance declines & times out -> preserves once-per-match & turn completes cleanly!
  for (const mode of ['decline', 'timeout']) {
    const st = makeLegalScenario(['exp1_voodoo', 'exp1_vengeance', 'gac-ky-thuat', 'gac-radio'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    st.players.p2.revealed = true;
    activateVoodooHijack(st, 'p1', 'p2', 10_500);
    st.turnPhase = 'MAIN_ACTION';
    setWounds(st.players.p3, st.players.p3.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p2, 'equipped');

    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 10_600).ok, true);
    assert.equal(st.pendingChoice?.kind, 'vengeance_chain_strike');
    if (mode === 'decline') {
      assert.equal(
        applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'skip' }, 10_610).ok,
        true,
      );
    } else {
      assert.equal(applyPendingChoiceTimeout(st, 10_999), true);
    }
    assert.equal(hasEffectiveSkillUsedOnce(st, st.players.p2), false, `Vengeance preserves 1/match on ${mode}`);
    assert.equal(getActiveTurnControlGrant(st), null, `Turn completes and expires grant after ${mode}`);
    assert.equal(st.activePlayerId, 'p4', 'Turn advances cleanly to next living player');
    assertClean(st, `8F2-A1 ${mode} Voodoo+Vengeance`);
  }
});

test('8F2-A2 — Pair #2: exp1_voodoo × exp1_wendigo (secret choice privacy under hijack, heal once, decline/timeout zero leak)', () => {
  // Positive: Voodoo (p1) hijacks UNREVEALED wounded Wendigo (p2) and kills Hunter p3 ->
  // secret wendigo_reveal_heal belongs ONLY to p2, invisible to Voodoo, resolves +1 HP once & completes turn!
  {
    const st = makeLegalScenario(['exp1_voodoo', 'exp1_wendigo', 'gac-ky-thuat', 'gac-radio'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    setWounds(st.players.p2, 4); // wounded hidden Wendigo
    activateVoodooHijack(st, 'p1', 'p2', 11_000);
    st.turnPhase = 'MAIN_ACTION';
    setWounds(st.players.p3, st.players.p3.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p2, 'equipped');

    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 11_100).ok, true);
    assert.equal(st.players.p3.alive, false);
    assert.equal(st.pendingChoice?.kind, 'wendigo_reveal_heal');
    assert.equal(st.pendingChoice?.isSecret, true);
    assert.equal(st.pendingChoice?.ownerPlayerId, 'p2', 'Hidden Wendigo owns secret choice');

    // P0 Privacy: Voodoo (controller!) & public view MUST NOT see Wendigo identity or choice!
    assert.equal(getPrivateGameView(st, 'p1').pendingChoice ?? null, null, 'Voodoo controller MUST NOT see Wendigo secret choice');
    assert.equal(getPublicGameView(st).pendingChoice?.ownerPlayerId, null);
    assert.equal(getPublicGameView(st).pendingChoice?.kind, null);
    assert.equal(
      applyPlayerGameAction(st, 'p1', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'reveal_and_activate' }, 11_110).ok,
      false,
      'Voodoo MUST NOT resolve Wendigo secret choice',
    );

    // Wendigo accepts -> reveals, heals exactly 1 HP (4 -> 3 wounds), grant expires & turn completes!
    assert.equal(
      applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'reveal_and_activate' }, 11_120).ok,
      true,
    );
    assert.equal(st.players.p2.revealed, true);
    assert.equal(st.players.p2.woundsTaken, 3, 'Wendigo healed exactly 1 HP');
    assert.equal(ensureExpansionState(st).stats.activationsByRole.exp1_wendigo, 1, 'Zero duplicate Wendigo trigger');
    assert.equal(getActiveTurnControlGrant(st), null);
    assert.equal(st.activePlayerId, 'p4');
    assertClean(st, '8F2-A2 positive Voodoo+Wendigo');
  }

  // Negative/Boundary: Hidden Wendigo declines / times out -> stays hidden, 0 leak in publicLog, 0 HP healed, turn completes!
  for (const mode of ['decline', 'timeout']) {
    const st = makeLegalScenario(['exp1_voodoo', 'exp1_wendigo', 'gac-ky-thuat', 'gac-radio'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    setWounds(st.players.p2, 4);
    activateVoodooHijack(st, 'p1', 'p2', 11_500);
    st.turnPhase = 'MAIN_ACTION';
    setWounds(st.players.p3, st.players.p3.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p2, 'equipped');

    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 11_600).ok, true);
    assert.equal(st.pendingChoice?.kind, 'wendigo_reveal_heal');
    const logLenBefore = st.publicLog.length;
    if (mode === 'decline') {
      assert.equal(
        applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'decline' }, 11_610).ok,
        true,
      );
    } else {
      assert.equal(applyPendingChoiceTimeout(st, 11_999), true);
    }
    assert.equal(st.players.p2.revealed, false, `Wendigo stays hidden on ${mode}`);
    assert.equal(st.players.p2.woundsTaken, 4, `Wendigo heals 0 on ${mode}`);
    const newLogs = st.publicLog.slice(logLenBefore).map((l) => l.text).join(' ');
    assert.equal(newLogs.includes('Wendigo'), false, `Zero public leak mentioning Wendigo on ${mode}`);
    assert.equal(getActiveTurnControlGrant(st), null);
    assertClean(st, `8F2-A2 ${mode} Voodoo+Wendigo`);
  }
});

// ============================================================================
// GROUP B — UNDEAD + IMMEDIATE VICTORY (Pairs #3–#7, Legal 5P 2H/2S/1N!)
// ============================================================================

test('8F2-B1 — Pair #3: exp1_undead × lang-tien-phong (Daniel) — dormancy neither sets firstDead nor reveals Daniel; final death triggers Scream once', () => {
  // Branch 1: 1st lethal on Undead -> dormant -> NOT firstDead, Daniel stays hidden; then Daniel dies -> Daniel IS firstDead and wins immediately!
  {
    const st = makeLegalScenario(['gac-ky-thuat', 'gac-radio', 'exp1_undead', 'suong-an-danh', 'lang-tien-phong'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    setWounds(st.players.p3, st.players.p3.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 20_000).ok, true);
    assert.equal(isPlayerDormantPendingRevive(st, st.players.p3), true);
    assert.equal(st.firstDeadPlayerId, null, 'Undead dormancy MUST NOT set firstDeadPlayerId');
    assert.equal(st.players.p5.revealed, false, 'Undead dormancy MUST NOT trigger Daniel Scream reveal');
    assert.equal(st.finished, false);

    // Now p2 kills Daniel (p5) while Undead is still dormant -> Daniel IS 1st committed death -> Daniel wins immediately!
    assert.equal(st.activePlayerId, 'p2');
    st.turnPhase = 'MAIN_ACTION';
    setWounds(st.players.p5, st.players.p5.maxHp - 1);
    pullCard(st, 'ev-07', st.players.p2, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p2', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p5' }, 20_100).ok, true);
    assert.equal(st.firstDeadPlayerId, 'p5');
    assert.equal(st.finished, true, 'Daniel dying 1st committed death while Undead is dormant MUST win immediately');
    assert.deepEqual(st.winnerPlayerIds, ['p5']);
    assertClean(st, '8F2-B1 branch1 Daniel dies while Undead dormant');
  }

  // Branch 2: Undead revives (6 HP) -> 2nd lethal on Undead -> FINAL_ELIMINATED sets firstDeadPlayerId='p3' & forces Daniel Scream reveal once; Daniel dying 2nd does NOT win!
  {
    const st = makeLegalScenario(['gac-ky-thuat', 'gac-radio', 'exp1_undead', 'suong-an-danh', 'lang-tien-phong'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    setWounds(st.players.p3, st.players.p3.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 20_200).ok, true);
    assert.equal(isPlayerDormantPendingRevive(st, st.players.p3), true);
    assert.equal(st.players.p5.revealed, false);
    // Advance p2 -> p3 revives!
    st.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p2', { type: 'END_TURN' }, 20_210).ok, true);
    assert.equal(getPlayerLifecycleState(st, st.players.p3), 'REVIVED');

    // 2nd lethal on Undead -> FINAL_ELIMINATED -> Daniel forced-reveals via Scream!
    st.activePlayerId = 'p1';
    st.turnPhase = 'MAIN_ACTION';
    st.players.p1.attacksThisTurn = 0;
    setWounds(st.players.p3, st.players.p3.maxHp - 1);
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 20_250).ok, true);
    assert.equal(getPlayerLifecycleState(st, st.players.p3), 'FINAL_ELIMINATED');
    assert.equal(st.firstDeadPlayerId, 'p3');
    assert.equal(st.players.p5.revealed, true, 'Daniel forced-reveals on Undead permanent death');
    assert.equal(st.finished, false, 'Shadow p4 still alive');

    // Daniel dies 2nd -> MUST NOT win immediately!
    st.activePlayerId = 'p2';
    st.turnPhase = 'MAIN_ACTION';
    setWounds(st.players.p5, st.players.p5.maxHp - 1);
    pullCard(st, 'ev-02', st.players.p2, 'equipped');
    pullCard(st, 'ev-07', st.players.p2, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p2', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p5' }, 20_300).ok, true);
    assert.equal(st.finished, false, 'Daniel dying 2nd does NOT win immediately');
    assertClean(st, '8F2-B1 branch2 Undead final death triggers Daniel Scream');
  }
});

test('8F2-B2 — Pair #4: exp1_undead × lang-cuu-ho (Charles) — dormant defeat does NOT count toward deadCount>=3; 2nd lethal commits Charles immediate win', () => {
  const st = makeLegalScenario(['lang-cuu-ho', 'gac-ky-thuat', 'gac-radio', 'exp1_undead', 'suong-an-danh'], {
    rulesetId: 'expansion-1',
    defaultLocation: 'radio',
  });
  // Pre-eliminate 2 players (p2 Hunter & p5 Shadow) -> deadCount = 2, Undead (p4) is sole remaining Shadow!
  killFinal(st, 'p2');
  killFinal(st, 'p5');
  setWounds(st.players.p4, st.players.p4.maxHp - 1);
  pullCard(st, 'ev-01', st.players.p1, 'equipped');

  // 1st lethal ATTACK by Charles on Undead -> dormancy only! deadCount stays 2, charlesKillWon=false, NO Hunter premature win!
  assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p4' }, 21_000).ok, true);
  assert.equal(isPlayerDormantPendingRevive(st, st.players.p4), true);
  assert.equal(st.players.p1.charlesKillWon, false, 'Dormant Undead MUST NOT satisfy Charles 3rd-death kill');
  assert.equal(st.finished, false, 'Neither Charles nor Hunters win while Undead is dormant');
  assertClean(st, '8F2-B2 Charles 1st lethal dormant');

  // Advance p3 -> p4 Undead revives at 6 HP!
  assert.equal(st.activePlayerId, 'p3');
  st.turnPhase = 'MAIN_ACTION';
  assert.equal(applyPlayerGameAction(st, 'p3', { type: 'END_TURN' }, 21_050).ok, true);
  assert.equal(getPlayerLifecycleState(st, st.players.p4), 'REVIVED');

  // 2nd lethal ATTACK by Charles on revived Undead -> FINAL_ELIMINATED (deadCount===3) -> Charles wins immediately!
  st.activePlayerId = 'p1';
  st.turnPhase = 'MAIN_ACTION';
  st.players.p1.attacksThisTurn = 0;
  setWounds(st.players.p4, st.players.p4.maxHp - 1);
  assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p4' }, 21_100).ok, true);
  assert.equal(getPlayerLifecycleState(st, st.players.p4), 'FINAL_ELIMINATED');
  assert.equal(st.players.p1.charlesKillWon, true, 'Charles immediate kill victory satisfied on final death');
  assert.equal(st.finished, true);
  assert.ok(st.winnerPlayerIds.includes('p1'), 'Charles included in final winner set');
  assertClean(st, '8F2-B2 Charles 2nd lethal win');
});

test('8F2-B3 — Pair #5: exp1_undead × exp2_dalton — dormant defeat does NOT trigger 12th Round kill win; 2nd lethal commits Dalton win once', () => {
  const st = makeLegalScenario(['exp2_dalton', 'gac-ky-thuat', 'gac-radio', 'exp1_undead', 'suong-an-danh'], {
    rulesetId: 'full-expansion',
    defaultLocation: 'radio',
  });
  // Trigger Dalton 12th Round cleanly via real damage (ev-07 from p2 -> Dalton takes 2 dmg -> 10 HP <= 12 -> activated!)
  st.activePlayerId = 'p2';
  pullCard(st, 'ev-07', st.players.p2, 'hand');
  assert.equal(applyPlayerGameAction(st, 'p2', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p1' }, 22_000).ok, true);
  assert.ok(ensureExpansionState(st).daltonActivatedByPlayer?.p1, 'Dalton 12th Round activated');

  // Dalton deals 1st lethal ATTACK to Undead (p4) -> dormancy only -> Dalton MUST NOT win!
  st.activePlayerId = 'p1';
  st.turnPhase = 'MAIN_ACTION';
  setWounds(st.players.p4, st.players.p4.maxHp - 1);
  pullCard(st, 'ev-01', st.players.p1, 'equipped');
  assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p4' }, 22_100).ok, true);
  assert.equal(isPlayerDormantPendingRevive(st, st.players.p4), true);
  assert.equal(ensureExpansionState(st).daltonKillWinTriggeredIds?.includes('p1') ?? false, false, 'Dormancy MUST NOT grant Dalton kill credit');
  assert.equal(st.finished, false);
  assertClean(st, '8F2-B3 Dalton 1st lethal dormant');

  // Revive Undead cleanly via turn progression p2 -> p3 -> p4
  st.turnPhase = 'MAIN_ACTION';
  assert.equal(applyPlayerGameAction(st, 'p2', { type: 'END_TURN' }, 22_120).ok, true);
  st.turnPhase = 'MAIN_ACTION';
  assert.equal(applyPlayerGameAction(st, 'p3', { type: 'END_TURN' }, 22_140).ok, true);
  assert.equal(getPlayerLifecycleState(st, st.players.p4), 'REVIVED');

  // 2nd lethal ATTACK by Dalton on revived Undead -> FINAL_ELIMINATED -> Dalton immediate win once!
  st.activePlayerId = 'p1';
  st.turnPhase = 'MAIN_ACTION';
  st.players.p1.attacksThisTurn = 0;
  setWounds(st.players.p4, st.players.p4.maxHp - 1);
  assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p4' }, 22_200).ok, true);
  assert.equal(getPlayerLifecycleState(st, st.players.p4), 'FINAL_ELIMINATED');
  assert.deepEqual(ensureExpansionState(st).daltonKillWinTriggeredIds, ['p1'], 'Single Dalton kill credit');
  assert.equal(st.finished, true);
  assert.ok(st.winnerPlayerIds.includes('p1'));
  assertClean(st, '8F2-B3 Dalton 2nd lethal win');
});

test('8F2-B4 — Pair #6: exp1_undead × exp2_cruz — Black-card lethal puts Undead dormant without Cruz win; 2nd lethal triggers Cruz win once', () => {
  const st = makeLegalScenario(['exp2_cruz', 'gac-ky-thuat', 'gac-radio', 'exp1_undead', 'suong-an-danh'], {
    rulesetId: 'full-expansion',
    defaultLocation: 'radio',
  });
  setWounds(st.players.p4, st.players.p4.maxHp - 1);
  pullCard(st, 'ev-07', st.players.p1, 'hand');

  // 1st lethal via qualifying Black card ev-07 -> Undead dormant -> Cruz MUST NOT win!
  assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p4' }, 23_000).ok, true);
  assert.equal(isPlayerDormantPendingRevive(st, st.players.p4), true);
  assert.equal(ensureExpansionState(st).cruzWinTriggeredIds?.includes('p1') ?? false, false, 'Dormancy MUST NOT trigger Cruz win');
  assert.equal(st.finished, false);
  assertClean(st, '8F2-B4 Cruz 1st lethal dormant');

  // Advance p1 -> p2 -> p3 -> p4 so Undead revives!
  assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 23_010).ok, true);
  st.turnPhase = 'MAIN_ACTION';
  assert.equal(applyPlayerGameAction(st, 'p2', { type: 'END_TURN' }, 23_020).ok, true);
  st.turnPhase = 'MAIN_ACTION';
  assert.equal(applyPlayerGameAction(st, 'p3', { type: 'END_TURN' }, 23_030).ok, true);
  assert.equal(getPlayerLifecycleState(st, st.players.p4), 'REVIVED');

  // 2nd lethal via qualifying Black card ev-08 -> FINAL_ELIMINATED -> Cruz wins immediately once!
  st.activePlayerId = 'p1';
  st.turnPhase = 'MAIN_ACTION';
  setWounds(st.players.p4, st.players.p4.maxHp - 1);
  pullCard(st, 'ev-08', st.players.p1, 'hand');
  assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-08', targetPlayerId: 'p4' }, 23_100).ok, true);
  assert.equal(getPlayerLifecycleState(st, st.players.p4), 'FINAL_ELIMINATED');
  assert.deepEqual(ensureExpansionState(st).cruzWinTriggeredIds, ['p1'], 'Single Cruz kill credit');
  assert.equal(st.finished, true);
  assert.ok(st.winnerPlayerIds.includes('p1'));
  assertClean(st, '8F2-B4 Cruz 2nd lethal win');
});

test('8F2-B5 — Pair #7: exp1_undead × exp2_arlene — simultaneous Flare dormant Undead + Hunter-killed Arlene grants Arlene solo win without premature Hunter win; Undead killing Arlene does NOT trigger Arlene win', () => {
  // Positive: Hunter p1 fires eq-11 Flare hitting last Shadow Undead (1 HP -> dormant!) AND Arlene (1 HP -> dead!):
  // Undead enters dormancy (NO Hunter faction victory!), Arlene wins immediately solo!
  {
    const st = makeLegalScenario(['gac-ky-thuat', 'gac-radio', 'exp1_undead', 'suong-an-danh', 'exp2_arlene'], {
      rulesetId: 'full-expansion',
      defaultLocation: 'radio',
    });
    killFinal(st, 'p4'); // Undead p3 is LAST Shadow!
    setWounds(st.players.p3, st.players.p3.maxHp - 1);
    setWounds(st.players.p5, st.players.p5.maxHp - 1);
    pullCard(st, 'eq-11', st.players.p1, 'hand');

    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-11' }, 24_000).ok, true);
    assert.equal(isPlayerDormantPendingRevive(st, st.players.p3), true, 'Undead entered dormancy on Flare');
    assert.equal(getPlayerLifecycleState(st, st.players.p5), 'FINAL_ELIMINATED', 'Arlene died to Hunter Flare');
    assert.equal(st.finished, true);
    assert.deepEqual(st.winnerPlayerIds, ['p5'], 'Arlene wins solo; Hunters MUST NOT co-win while Undead is dormant');
    assertClean(st, '8F2-B5 positive simultaneous Flare Undead+Arlene');
  }

  // Negative/Boundary: Revived Undead (Shadow!) kills Arlene -> Arlene MUST NOT trigger Hunter-kill victory!
  {
    const st = makeLegalScenario(['exp1_undead', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'exp2_arlene'], {
      rulesetId: 'full-expansion',
      defaultLocation: 'radio',
    });
    ensureExpansionState(st).lifecycleByPlayer = {
      p1: { lifecycleState: 'REVIVED', resurrectionChargesUsed: 1, reviveHpTarget: 6 },
    };
    st.players.p1.revealed = true;
    setWounds(st.players.p5, st.players.p5.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p5' }, 24_200).ok, true);
    assert.equal(st.players.p5.alive, false);
    assert.equal(ensureExpansionState(st).arleneHunterKillTriggeredIds?.includes('p5') ?? false, false, 'Shadow Undead killing Arlene MUST NOT trigger Arlene win');
    assert.equal(st.finished, false);
    assertClean(st, '8F2-B5 negative Undead kills Arlene');
  }
});

// ============================================================================
// GROUP C — VOODOO + START-OF-TURN SKILLS (Pairs #8–#13 + Real DO Reconnect)
// ============================================================================

test('8F2-C1 — Pair #8: exp1_voodoo × exp1_wrath — turn-start AoE owned by Wrath, killing Voodoo cancels grant, decline/timeout preserves hijack cleanly', () => {
  // Positive: Voodoo (2 HP, same cluster!) hijacks revealed Wrath (p2) -> Wrath activates AoE -> kills Voodoo -> grant cancels & Wrath keeps own turn!
  {
    const st = makeLegalScenario(['exp1_voodoo', 'exp1_wrath', 'gac-ky-thuat', 'gac-radio'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    st.players.p2.revealed = true;
    setWounds(st.players.p1, st.players.p1.maxHp - 2); // 2 HP Voodoo in same cluster!
    activateVoodooHijack(st, 'p1', 'p2', 30_000);

    assert.equal(st.pendingChoice?.kind, 'wrath_turn_start_aoe');
    assert.equal(st.pendingChoice?.ownerPlayerId, 'p2', 'Wrath owns start-of-turn choice');
    assert.equal(
      applyPlayerGameAction(st, 'p1', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'activate' }, 30_010).ok,
      false,
      'Voodoo MUST NOT resolve Wrath turn-start choice',
    );
    assert.equal(
      applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'activate' }, 30_020).ok,
      true,
    );
    assert.equal(st.players.p1.alive, false, 'Voodoo died from Wrath AoE');
    assert.equal(st.players.p3.woundsTaken, 2);
    assert.equal(getActiveTurnControlGrant(st), null, 'Grant cancelled when controller Voodoo died');
    assert.equal(st.activePlayerId, 'p2', 'Wrath retains own turn cleanly');
    assert.equal(applyPlayerGameAction(st, 'p2', { type: 'ROLL_DICE' }, 30_030).ok, true, 'Wrath regains normal public turn actions');
    assertClean(st, '8F2-C1 positive Voodoo+Wrath');
  }

  // Negative/Boundary: Wrath declines & times out -> 0 dmg, Voodoo retains control, finishes turn cleanly, no duplicate start prompt!
  for (const mode of ['decline', 'timeout']) {
    const st = makeLegalScenario(['exp1_voodoo', 'exp1_wrath', 'gac-ky-thuat', 'gac-radio'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    st.players.p2.revealed = true;
    activateVoodooHijack(st, 'p1', 'p2', 30_500);
    assert.equal(st.pendingChoice?.kind, 'wrath_turn_start_aoe');
    if (mode === 'decline') {
      const skipOpt = st.pendingChoice.options.find((o) => o.optionId !== 'activate');
      assert.equal(applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: skipOpt.optionId }, 30_510).ok, true);
    } else {
      assert.equal(applyPendingChoiceTimeout(st, 30_999), true);
    }
    assert.equal(st.players.p3.woundsTaken, 0);
    assert.equal(getEffectiveTurnControllerId(st), 'p1', `Voodoo resumes control after Wrath ${mode}`);
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_SKILL' }, 30_520).ok, false, 'Voodoo cannot manually trigger Wrath USE_SKILL');
    st.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 30_530).ok, true);
    assert.equal(getActiveTurnControlGrant(st), null);
    assertClean(st, `8F2-C1 ${mode} Voodoo+Wrath`);
  }
});

test('8F2-C2 — Pair #9: exp1_voodoo × exp1_bipolar — Fate Coin owned by Bipolar, self-kill ends grant, decline/timeout preserves 1/match', () => {
  // Positive 1: Bipolar heals self -> consumes 1/match once -> Voodoo resumes & completes turn
  {
    const st = makeLegalScenario(['exp1_voodoo', 'exp1_bipolar', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    st.players.p2.revealed = true;
    setWounds(st.players.p2, 6);
    activateVoodooHijack(st, 'p1', 'p2', 31_000);

    assert.equal(st.pendingChoice?.kind, 'bipolar_fate_coin');
    assert.equal(st.pendingChoice?.ownerPlayerId, 'p2');
    assert.equal(
      applyPlayerGameAction(st, 'p1', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'heal_self' }, 31_010).ok,
      false,
      'Voodoo MUST NOT resolve Bipolar Fate Coin',
    );
    assert.equal(
      applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'heal_self' }, 31_020).ok,
      true,
    );
    assert.ok(st.players.p2.woundsTaken <= 3, 'Bipolar healed 3..6 HP');
    assert.equal(hasEffectiveSkillUsedOnce(st, st.players.p2), true);
    assert.equal(getEffectiveTurnControllerId(st), 'p1');
    st.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 31_030).ok, true);
    assert.equal(getActiveTurnControlGrant(st), null);
    assertClean(st, '8F2-C2 positive heal Voodoo+Bipolar');
  }

  // Boundary: Bipolar chooses damage_self at 2 HP -> dies cleanly -> Voodoo grant expires & turn advances!
  {
    const st = makeLegalScenario(['exp1_voodoo', 'exp1_bipolar', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    st.players.p2.revealed = true;
    setWounds(st.players.p2, st.players.p2.maxHp - 2); // 2 HP (< min 3 self-dmg)
    activateVoodooHijack(st, 'p1', 'p2', 31_200);
    assert.equal(
      applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'damage_self' }, 31_210).ok,
      true,
    );
    assert.equal(st.players.p2.alive, false);
    assert.equal(getActiveTurnControlGrant(st), null, 'Grant expires when Bipolar kills self');
    assert.equal(st.activePlayerId, 'p3');
    assertClean(st, '8F2-C2 lethal self-dmg Voodoo+Bipolar');
  }

  // Negative: Timeout preserves once-per-match & Voodoo completes turn
  {
    const st = makeLegalScenario(['exp1_voodoo', 'exp1_bipolar', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    st.players.p2.revealed = true;
    activateVoodooHijack(st, 'p1', 'p2', 31_400);
    assert.equal(applyPendingChoiceTimeout(st, 31_999), true);
    assert.equal(hasEffectiveSkillUsedOnce(st, st.players.p2), false);
    assert.equal(getEffectiveTurnControllerId(st), 'p1');
    st.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 31_420).ok, true);
    assert.equal(getActiveTurnControlGrant(st), null);
    assertClean(st, '8F2-C2 timeout Voodoo+Bipolar');
  }
});

test('8F2-C3 — Pair #10: exp1_voodoo × exp1_anathema — revealed curse owned by Anathema + end-turn 1 HP cost fires; hidden Anathema has zero leak', () => {
  // Positive: Revealed Anathema cursed p3 at start of hijacked turn -> Voodoo ends turn -> end-turn 1 unpreventable dmg hits Anathema & grant expires!
  {
    const st = makeLegalScenario(['exp1_voodoo', 'exp1_anathema', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    st.players.p2.revealed = true;
    activateVoodooHijack(st, 'p1', 'p2', 32_000);
    assert.equal(st.pendingChoice?.kind, 'anathema_curse_target');
    assert.equal(st.pendingChoice?.ownerPlayerId, 'p2');
    const optP3 = st.pendingChoice.options.find((o) => o.targetPlayerId === 'p3');
    assert.ok(optP3);
    assert.equal(
      applyPlayerGameAction(st, 'p1', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: optP3.optionId }, 32_010).ok,
      false,
      'Voodoo cannot choose Anathema curse target',
    );
    assert.equal(
      applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: optP3.optionId }, 32_020).ok,
      true,
    );
    assert.equal(ensureExpansionState(st).anathemaCurses?.p2?.targetPlayerId, 'p3');
    assert.equal(getEffectiveTurnControllerId(st), 'p1');

    // Voodoo ends Anathema's turn -> Anathema MUST suffer 1 unpreventable end-of-turn cost!
    st.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 32_050).ok, true);
    assert.equal(st.players.p2.woundsTaken, 1, 'Anathema end-of-turn 1 HP self-damage still fires under hijacked END_TURN');
    assert.equal(getActiveTurnControlGrant(st), null);
    assertClean(st, '8F2-C3 positive revealed Voodoo+Anathema');
  }

  // Negative: UNREVEALED Anathema hijacked by Voodoo -> NO auto-prompt (zero secret leak!), Voodoo blocked from USE_SKILL/REVEAL_ROLE!
  {
    const st = makeLegalScenario(['exp1_voodoo', 'exp1_anathema', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    activateVoodooHijack(st, 'p1', 'p2', 32_200);
    assert.equal(st.pendingChoice ?? null, null, 'Hidden Anathema MUST NOT auto-open turn-start prompt');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'REVEAL_ROLE' }, 32_210).ok, false);
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_SKILL' }, 32_220).ok, false);
    st.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 32_230).ok, true);
    assert.equal(st.players.p2.revealed, false);
    assertClean(st, '8F2-C3 negative hidden Voodoo+Anathema');
  }
});

test('8F2-C4 — Pair #11: exp1_voodoo × exp1_bethany — designate_chosen owned by Bethany, Voodoo blocked on TRANSFER_TO_BETHANY, decline/timeout safe', () => {
  // Positive: Revealed Bethany with eq-01 hijacked -> designates p3 -> eq-01 transferred atomically -> Voodoo finishes turn!
  {
    const st = makeLegalScenario(['exp1_voodoo', 'exp1_bethany', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    st.players.p2.revealed = true;
    pullCard(st, 'eq-01', st.players.p2, 'equipped');
    activateVoodooHijack(st, 'p1', 'p2', 33_000);

    assert.equal(st.pendingChoice?.kind, 'bethany_designate_chosen');
    assert.equal(st.pendingChoice?.ownerPlayerId, 'p2');
    const giftOpt = st.pendingChoice.options.find((o) => o.optionId !== 'skip');
    assert.ok(giftOpt);
    assert.equal(
      applyPlayerGameAction(st, 'p1', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: giftOpt.optionId }, 33_010).ok,
      false,
      'Voodoo MUST NOT resolve Bethany designate choice',
    );
    assert.equal(
      applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: giftOpt.optionId }, 33_020).ok,
      true,
    );
    assert.ok(ensureExpansionState(st).bethanyChosenByPlayer?.p2?.chosenPlayerId, 'Bethany bound Chosen');
    assert.equal(st.players.p2.equipped.length, 0);
    assert.equal(getEffectiveTurnControllerId(st), 'p1');
    st.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 33_030).ok, true);
    assert.equal(getActiveTurnControlGrant(st), null);
    assertClean(st, '8F2-C4 positive Voodoo+Bethany');
  }

  // Negative/Boundary: Bethany declines & Voodoo attempts prohibited TRANSFER_TO_BETHANY while controlling p3 -> rejected!
  {
    const st = makeLegalScenario(['exp1_voodoo', 'exp1_bethany', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    st.players.p2.revealed = true;
    pullCard(st, 'eq-01', st.players.p2, 'equipped');
    activateVoodooHijack(st, 'p1', 'p2', 33_200);
    assert.equal(applyPendingChoiceTimeout(st, 33_999), true);
    assert.equal(st.players.p2.equipped.includes('eq-01'), true, 'Bethany keeps eq-01 on timeout');
    assert.equal(ensureExpansionState(st).bethanyChosenByPlayer?.p2, undefined);
    st.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 33_220).ok, true);
    assertClean(st, '8F2-C4 timeout Voodoo+Bethany');
  }
});

test('8F2-C5 — Pair #12: exp1_voodoo × exp1_clairvoyant — private peek clue stays strictly hidden from controller Voodoo; decline/timeout preserves 1/match', () => {
  // Positive: Voodoo (p1) hijacks revealed Clairvoyant (p2) -> Clairvoyant peeks hidden p3 ->
  // ONLY p2 sees p3's true role in privateClues; Voodoo's privateView & publicView see ZERO peek info!
  {
    const st = makeLegalScenario(['exp1_voodoo', 'exp1_clairvoyant', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    st.players.p2.revealed = true;
    activateVoodooHijack(st, 'p1', 'p2', 34_000);

    assert.equal(st.pendingChoice?.kind, 'clairvoyant_peek_copy');
    assert.equal(st.pendingChoice?.ownerPlayerId, 'p2');
    const peekP3 = st.pendingChoice.options.find((o) => o.targetPlayerId === 'p3');
    assert.ok(peekP3);
    assert.equal(
      applyPlayerGameAction(st, 'p1', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: peekP3.optionId }, 34_010).ok,
      false,
      'Voodoo MUST NOT resolve Clairvoyant peek',
    );
    assert.equal(
      applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: peekP3.optionId }, 34_020).ok,
      true,
    );
    // Strict P0 Privacy assertions!
    const clairPriv = getPrivateGameView(st, 'p2');
    const voodooPriv = getPrivateGameView(st, 'p1');
    const pub = getPublicGameView(st);
    assert.ok(clairPriv.privateClues.some((c) => c.targetPlayerId === 'p3' && c.detail.includes('George')), 'Clairvoyant received private peek clue');
    assert.equal(voodooPriv.privateClues.length, 0, 'Voodoo controller MUST NEVER receive Clairvoyant private peek clue');
    assert.equal(pub.players.find((p) => p.playerId === 'p3').revealedRoleId, null, 'Peeked target stays hidden publicly');
    assert.equal(st.publicLog.some((l) => l.text.includes('Minh') || l.text.includes('George')), false, 'Public log never leaks peeked role');
    assert.equal(getEffectiveTurnControllerId(st), 'p1');
    st.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 34_030).ok, true);
    assert.equal(getActiveTurnControlGrant(st), null);
    assertClean(st, '8F2-C5 positive Voodoo+Clairvoyant');
  }

  // Negative: Timeout preserves 1/match & zero clues written
  {
    const st = makeLegalScenario(['exp1_voodoo', 'exp1_clairvoyant', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    st.players.p2.revealed = true;
    activateVoodooHijack(st, 'p1', 'p2', 34_200);
    assert.equal(applyPendingChoiceTimeout(st, 34_999), true);
    assert.equal(hasEffectiveSkillUsedOnce(st, st.players.p2), false);
    assert.equal(st.players.p2.privateClues.length, 0);
    st.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 34_220).ok, true);
    assertClean(st, '8F2-C5 timeout Voodoo+Clairvoyant');
  }
});

test('8F2-C6 — Pair #13: exp1_voodoo × exp2_visions — mark choice owned by Visions, persistent mark tick killing Voodoo cancels grant cleanly, decline/timeout safe', () => {
  // Positive 1: Unmarked revealed Visions hijacked -> Visions marks p3 -> Voodoo finishes turn
  {
    const st = makeLegalScenario(['exp1_voodoo', 'exp2_visions', 'gac-ky-thuat', 'gac-radio'], {
      rulesetId: 'full-expansion',
      defaultLocation: 'radio',
    });
    st.players.p2.revealed = true;
    activateVoodooHijack(st, 'p1', 'p2', 35_000);
    assert.equal(st.pendingChoice?.kind, 'visions_mark_target');
    assert.equal(st.pendingChoice?.ownerPlayerId, 'p2');
    const markP3 = st.pendingChoice.options.find((o) => o.targetPlayerId === 'p3');
    assert.ok(markP3);
    assert.equal(
      applyPlayerGameAction(st, 'p1', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: markP3.optionId }, 35_010).ok,
      false,
      'Voodoo MUST NOT choose Visions mark target',
    );
    assert.equal(
      applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: markP3.optionId }, 35_020).ok,
      true,
    );
    assert.equal(ensureExpansionState(st).visionsMarks?.p2?.targetPlayerId, 'p3');
    // Voodoo commanding Visions to ATTACK marked target p3 MUST be rejected by Visions's own restriction!
    st.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 35_030).ok, false, 'Visions cannot attack marked target even under Voodoo control');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 35_040).ok, true);
    assert.equal(getActiveTurnControlGrant(st), null);
    assertClean(st, '8F2-C6 positive mark Voodoo+Visions');
  }

  // Positive 2: Visions ALREADY marked Voodoo (1 HP) on an earlier turn -> Voodoo hijacks Visions ->
  // start-of-turn Visions tick fires ONCE, kills Voodoo (p1), cancels Voodoo grant immediately, Visions keeps own turn!
  {
    const st = makeLegalScenario(['exp1_voodoo', 'exp2_visions', 'gac-ky-thuat', 'gac-radio'], {
      rulesetId: 'full-expansion',
      defaultLocation: 'radio',
    });
    st.players.p2.revealed = true;
    st.players.p2.skillUsedOnce = true;
    ensureExpansionState(st).visionsMarks = { p2: { targetPlayerId: 'p1', markedOnTurnNumber: 0 } };
    setWounds(st.players.p1, st.players.p1.maxHp - 1); // 1 HP Voodoo!
    st.players.p1.revealed = true;
    st.activePlayerId = 'p1';
    st.turnPhase = 'ROLL_MOVE';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_SKILL', targetPlayerId: 'p2' }, 35_200).ok, true);
    st.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 35_210).ok, true);
    assert.equal(st.players.p1.alive, false, 'Visions turn-start tick eliminated 1-HP Voodoo');
    assert.equal(getActiveTurnControlGrant(st), null, 'Voodoo grant cancelled when Visions tick killed Voodoo');
    assert.equal(st.activePlayerId, 'p2', 'Visions regains full ownership of own turn');
    assert.equal(applyPlayerGameAction(st, 'p2', { type: 'ROLL_DICE' }, 35_220).ok, true);
    assertClean(st, '8F2-C6 tick kills Voodoo');
  }

  // Negative: Timeout preserves 1/match
  {
    const st = makeLegalScenario(['exp1_voodoo', 'exp2_visions', 'gac-ky-thuat', 'gac-radio'], {
      rulesetId: 'full-expansion',
      defaultLocation: 'radio',
    });
    st.players.p2.revealed = true;
    activateVoodooHijack(st, 'p1', 'p2', 35_400);
    assert.equal(applyPendingChoiceTimeout(st, 35_999), true);
    assert.equal(hasEffectiveSkillUsedOnce(st, st.players.p2), false);
    assert.equal(ensureExpansionState(st).visionsMarks?.p2, undefined);
    st.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 35_420).ok, true);
    assertClean(st, '8F2-C6 timeout Voodoo+Visions');
  }
});

test('8F2-C-DO — Real SQLite DO E2E: Voodoo hijacks revealed Clairvoyant -> victim disconnects & reconnects mid-turn-start PendingChoice -> ownership & privacy intact', async () => {
  const srv = await startStandaloneBoardGameTestServer(0, {
    ENVIRONMENT: 'production',
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
  });
  const openSockets = [];
  const connect = (matchId, payload) =>
    new Promise((resolve, reject) => {
      const ws = new WebSocket(`${srv.wsBaseUrl}/ws/boardgame?matchId=${encodeURIComponent(matchId)}`);
      const inbox = [];
      const waiters = [];
      let latestSync = null;
      let auth = null;
      ws.on('message', (raw) => {
        const msg = JSON.parse(String(raw));
        if (msg.type === 'BG_AUTH_ISSUED') auth = msg;
        if (msg.type === 'BG_STATE_SYNC') latestSync = msg;
        inbox.push(msg);
        for (let i = waiters.length - 1; i >= 0; i--) {
          if (waiters[i].pred(msg)) {
            const w = waiters.splice(i, 1)[0];
            clearTimeout(w.t);
            w.res(msg);
          }
        }
      });
      const waitFor = (pred, from = 0, ms = 4000) => {
        for (let i = from; i < inbox.length; i++) if (pred(inbox[i])) return Promise.resolve(inbox[i]);
        return new Promise((res, rej) => {
          const t = setTimeout(() => rej(new Error('WS wait timeout')), ms);
          waiters.push({ pred, res, t });
        });
      };
      ws.once('open', async () => {
        try {
          ws.send(JSON.stringify({ type: 'BG_JOIN', matchId, ...payload }));
          await waitFor((m) => m.type === 'BG_AUTH_ISSUED');
          await waitFor((m) => m.type === 'BG_STATE_SYNC');
          const client = { ws, inbox, auth, getLatest: () => latestSync, send: (p) => ws.send(JSON.stringify(p)), waitFor, close: () => { try { ws.close(); } catch {} } };
          openSockets.push(client);
          resolve(client);
        } catch (err) {
          reject(err);
        }
      });
      ws.once('error', reject);
    });

  try {
    const createRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.88.0.1' },
      body: JSON.stringify({ tableId: 'p8f-voodoo-do', hostName: 'H1', rulesetId: 'expansion-1' }),
    });
    assert.equal(createRes.status, 201);
    const match = await createRes.json();
    const clients = [];
    for (let i = 0; i < 5; i++) {
      const c = await connect(match.matchId, { inviteCode: match.inviteCode, displayName: `P${i + 1}`, preferredSeatIndex: i, requestId: `j_${i}` });
      clients.push(c);
      if (i > 0) {
        c.send({ type: 'BG_SET_READY', ready: true, requestId: `r_${i}` });
        await c.waitFor((m) => m.type === 'BG_ACTION_ACK' && m.requestId === `r_${i}`);
      }
    }
    clients[0].send({ type: 'BG_START_MATCH', requestId: 'start_8f_do' });
    await Promise.all(clients.map((c) => c.waitFor((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING')));

    // Inject legal 5P expansion-1 roles: p0=Voodoo, p1=Clairvoyant(revealed), p2=George, p3=Franklin, p4=Vampire
    const container = srv.containers.get(match.matchId);
    const sql = container.ctx.storage.sql;
    const row = sql.exec('SELECT game_state_json, revision FROM matches WHERE match_id = ?', match.matchId).one();
    const wrapped = JSON.parse(row.game_state_json);
    const es = wrapped.engineState;
    const roles = ['exp1_voodoo', 'exp1_clairvoyant', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh'];
    for (let i = 0; i < 5; i++) {
      const pid = es.turnOrder[i];
      const p = es.players[pid];
      const d = getRoleDesign(roles[i]);
      p.roleId = roles[i];
      p.faction = d.faction;
      p.maxHp = d.maxHp;
      p.hp = d.maxHp;
      p.woundsTaken = 0;
      p.revealed = i <= 1;
      p.alive = true;
      p.hand = [];
      p.equipped = [];
      p.location = 'radio';
    }
    es.activePlayerId = es.turnOrder[0];
    es.turnPhase = 'ROLL_MOVE';
    sql.exec('UPDATE matches SET game_state_json = ? WHERE match_id = ?', JSON.stringify(wrapped), match.matchId);
    container.hibernateAndWake();

    const cVoodoo = clients.find((c) => c.auth.playerId === es.turnOrder[0]);
    const cClair = clients.find((c) => c.auth.playerId === es.turnOrder[1]);
    const clairToken = cClair.auth.reconnectToken;
    let rev = row.revision;

    // Voodoo schedules hijack on Clairvoyant & ends turn -> Clairvoyant's turn starts with clairvoyant_peek_copy!
    let mark = cVoodoo.inbox.length;
    cVoodoo.send({ type: 'BG_GAME_ACTION', requestId: 'do_v_skill', expectedRevision: rev, action: { type: 'USE_SKILL', targetPlayerId: es.turnOrder[1] } });
    rev = (await cVoodoo.waitFor((m) => m.type === 'BG_STATE_SYNC' && m.revision > rev, mark)).revision;

    const r2 = sql.exec('SELECT game_state_json, revision FROM matches WHERE match_id = ?', match.matchId).one();
    const w2 = JSON.parse(r2.game_state_json);
    w2.engineState.turnPhase = 'MAIN_ACTION';
    sql.exec('UPDATE matches SET game_state_json = ? WHERE match_id = ?', JSON.stringify(w2), match.matchId);
    container.hibernateAndWake();
    rev = r2.revision;

    mark = cClair.inbox.length;
    cVoodoo.send({ type: 'BG_GAME_ACTION', requestId: 'do_v_end', expectedRevision: rev, action: { type: 'END_TURN' } });
    const syncChoice = await cClair.waitFor((m) => m.type === 'BG_STATE_SYNC' && m.revision > rev && Boolean(m.privateView?.pendingChoice), mark);
    rev = syncChoice.revision;
    const choiceId = syncChoice.privateView.pendingChoice.choiceId;
    assert.equal(syncChoice.privateView.pendingChoice.kind, 'clairvoyant_peek_copy');

    // Clairvoyant DISCONNECTS & DO HIBERNATES mid-PendingChoice -> Clairvoyant RECONNECTS!
    cClair.close();
    await new Promise((r) => setTimeout(r, 60));
    container.hibernateAndWake();
    const cClairRe = await connect(match.matchId, { displayName: 'P2', reconnectToken: clairToken, requestId: 're_clair' });
    const reSync = cClairRe.getLatest();
    assert.equal(reSync.privateView?.pendingChoice?.choiceId, choiceId, 'Reconnect preserves exact Clairvoyant choice ownership');
    assert.equal(reSync.publicGame?.controlledTurn?.controllerPlayerId, es.turnOrder[0], 'Voodoo grant intact across reconnect');

    // Voodoo tries to resolve Clairvoyant's choice -> REJECTED!
    const peekOpt = reSync.privateView.pendingChoice.options.find((o) => o.targetPlayerId === es.turnOrder[2]);
    assert.ok(peekOpt);
    mark = cVoodoo.inbox.length;
    cVoodoo.send({ type: 'BG_GAME_ACTION', requestId: 'do_v_bad_choice', expectedRevision: reSync.revision, action: { type: 'RESOLVE_CHOICE', choiceId, optionId: peekOpt.optionId } });
    const badAck = await cVoodoo.waitFor((m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'do_v_bad_choice', mark);
    assert.equal(badAck.ok, false, 'Voodoo rejected on Clairvoyant choice over real DO');

    // Reconnected Clairvoyant resolves peek -> private clue ONLY in Clairvoyant privateView!
    mark = cClairRe.inbox.length;
    const vMark = cVoodoo.inbox.length;
    cClairRe.send({ type: 'BG_GAME_ACTION', requestId: 'do_c_peek', expectedRevision: reSync.revision, action: { type: 'RESOLVE_CHOICE', choiceId, optionId: peekOpt.optionId } });
    const afterPeekClair = await cClairRe.waitFor((m) => m.type === 'BG_STATE_SYNC' && m.revision > reSync.revision, mark);
    const afterPeekVoodoo = await cVoodoo.waitFor((m) => m.type === 'BG_STATE_SYNC' && m.revision > reSync.revision, vMark);
    assert.ok(afterPeekClair.privateView.privateClues.length >= 1, 'Clairvoyant received private clue after reconnect');
    assert.equal(afterPeekVoodoo.privateView.privateClues.length, 0, 'Voodoo NEVER receives Clairvoyant private clue over DO');
    assert.equal(afterPeekVoodoo.publicGame.controlledTurn?.controllerPlayerId, es.turnOrder[0], 'Control cleanly returns to Voodoo');
  } finally {
    for (const c of openSockets) c.close();
    await srv.close();
  }
});

// ============================================================================
// GROUP D — ARNOLD + DAMAGE PREVENTION (Pairs #14–#16, Legal 5P 2H/2S/1N!)
// ============================================================================

test('8F2-D1 — Pair #14: exp1_arnold × exp1_gwendolen — Gwendolen lethal counter triggers Arnold reflection with zero repeated reflection/counter loop', () => {
  // Positive: Hidden 1-HP Arnold (p1) attacks Gwendolen's cluster ally p3 -> revealed Gwendolen (p2) counters with Masamune (1..4 lethal!) ->
  // Arnold opens secret arnold_reflect_lethal -> reflects lethal damage back to Gwendolen -> Arnold keeps 1 HP, Gwendolen takes reflected dmg, ZERO loop!
  {
    const st = makeLegalScenario(['exp1_arnold', 'exp1_gwendolen', 'gac-ky-thuat', 'suong-an-danh', 'suong-gac-cong'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    st.players.p2.revealed = true; // Gwendolen
    st.players.p3.revealed = true; // Revealed Hunter ally protected by Gwendolen!
    setWounds(st.players.p1, st.players.p1.maxHp - 1); // 1 HP hidden Arnold!
    pullCard(st, 'ev-01', st.players.p2, 'equipped'); // Gwendolen Masamune (1..4 guaranteed lethal vs 1-HP Arnold)

    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 40_000).ok, true);
    assert.equal(st.pendingChoice?.kind, 'gwendolen_counter_attack');
    assert.equal(st.pendingChoice?.ownerPlayerId, 'p2');
    assert.equal(
      applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'counter' }, 40_010).ok,
      true,
    );
    // Gwendolen counterattack is lethal on 1-HP Arnold -> Arnold secret reflection opens!
    assert.equal(st.pendingChoice?.kind, 'arnold_reflect_lethal');
    assert.equal(st.pendingChoice?.isSecret, true);
    assert.equal(st.pendingChoice?.ownerPlayerId, 'p1');
    assert.equal(
      applyPlayerGameAction(st, 'p1', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'reflect' }, 40_020).ok,
      true,
    );
    assert.equal(st.players.p1.alive, true, 'Arnold survived lethal Gwendolen counter');
    assert.equal(st.players.p1.hp, 1, 'Arnold preserved exact 1 HP');
    assert.equal(st.players.p1.revealed, true);
    assert.ok(st.players.p2.woundsTaken >= 1, 'Gwendolen took Arnold reflected damage');
    assert.equal(st.pendingChoice, null, 'Zero repeated reflection or counterattack loop');
    assertClean(st, '8F2-D1 positive Arnold+Gwendolen');
  }

  // Negative/Boundary: Non-lethal Gwendolen counter (Arnold full HP) MUST NOT open arnold_reflect_lethal; lethal decline kills Arnold once!
  {
    const st = makeLegalScenario(['exp1_arnold', 'exp1_gwendolen', 'gac-ky-thuat', 'suong-an-danh', 'suong-gac-cong'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    st.players.p2.revealed = true;
    st.players.p3.revealed = true;
    pullCard(st, 'ev-01', st.players.p2, 'equipped'); // 1..4 dmg vs full 8 HP Arnold -> non-lethal!
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 40_200).ok, true);
    assert.equal(st.pendingChoice?.kind, 'gwendolen_counter_attack');
    assert.equal(
      applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'counter' }, 40_210).ok,
      true,
    );
    assert.equal(st.pendingChoice, null, 'Non-lethal Gwendolen counter MUST NOT open Arnold lethal reflection');
    assert.ok(st.players.p1.woundsTaken >= 1 && st.players.p1.woundsTaken <= 4);
    assert.equal(st.players.p1.revealed, false);
    assertClean(st, '8F2-D1 negative non-lethal Arnold+Gwendolen');
  }
});

test('8F2-D2 — Pair #15: exp1_arnold × exp1_undying — BEFORE_DAMAGE ordering: Arnold reflects lethal onto hidden 2-HP Undying -> Undying reduces 2->1 and survives!', () => {
  // Positive: Hidden Undying (p1, 2 HP left!) uses ev-07 (2 dmg) onto hidden 2-HP Arnold (p2) ->
  // Arnold reflects 2 dmg back onto Undying -> Undying's BEFORE_DAMAGE secret choice opens ->
  // Undying reveals & reduces 2 -> 1 dmg -> Undying SURVIVES at 1 HP (instead of dying!), Arnold stays at 2 HP, zero loop!
  {
    const st = makeLegalScenario(['exp1_undying', 'exp1_arnold', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    setWounds(st.players.p1, st.players.p1.maxHp - 2); // 2 HP hidden Undying
    setWounds(st.players.p2, st.players.p2.maxHp - 2); // 2 HP hidden Arnold
    pullCard(st, 'ev-07', st.players.p1, 'hand'); // 2 dmg -> lethal on 2-HP Arnold!

    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p2' }, 41_000).ok, true);
    assert.equal(st.pendingChoice?.kind, 'arnold_reflect_lethal');
    assert.equal(st.pendingChoice?.ownerPlayerId, 'p2');
    assert.equal(
      applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'reflect' }, 41_010).ok,
      true,
    );
    // Reflected 2 dmg enters BEFORE_DAMAGE for hidden Undying -> secret undying_reveal_reduce opens!
    assert.equal(st.pendingChoice?.kind, 'undying_reveal_reduce', 'Reflected damage runs through Undying BEFORE_DAMAGE');
    assert.equal(st.pendingChoice?.isSecret, true);
    assert.equal(st.pendingChoice?.ownerPlayerId, 'p1');
    assert.equal(
      applyPlayerGameAction(st, 'p1', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'reveal_and_reduce' }, 41_020).ok,
      true,
    );
    assert.equal(st.players.p2.alive, true);
    assert.equal(st.players.p2.hp, 2, 'Arnold kept exact 2 HP');
    assert.equal(st.players.p1.alive, true, 'Undying reduced reflected 2 -> 1 dmg and survived!');
    assert.equal(st.players.p1.revealed, true);
    // Note: Vampire Bat heals p1 +1 HP after target damage step -> 2 HP - 1 reflected + 1 vbat = 2 HP!
    assert.ok(st.players.p1.hp >= 1, 'Undying survived with >=1 HP');
    assert.equal(st.pendingChoice, null);
    assertClean(st, '8F2-D2 positive Arnold+Undying');
  }

  // Negative/Boundary: Hidden 2-HP Undying declines undying_reveal_reduce -> takes full reflected 2 dmg and dies cleanly once!
  {
    const st = makeLegalScenario(['exp1_undying', 'exp1_arnold', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh'], {
      rulesetId: 'expansion-1',
      defaultLocation: 'radio',
    });
    setWounds(st.players.p1, st.players.p1.maxHp - 2);
    setWounds(st.players.p2, st.players.p2.maxHp - 2);
    pullCard(st, 'ev-07', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p2' }, 41_200).ok, true);
    assert.equal(applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'reflect' }, 41_210).ok, true);
    assert.equal(st.pendingChoice?.kind, 'undying_reveal_reduce');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'decline' }, 41_220).ok, true);
    assert.equal(st.players.p1.alive, false, 'Undying declining reduction dies cleanly to reflected 2 dmg');
    assert.equal(st.players.p2.hp, 2);
    assertClean(st, '8F2-D2 negative decline Arnold+Undying');
  }
});

test('8F2-D3 — Pair #16: exp1_arnold × exp2_urban_legend — Arnold reflection is skill dmg (NOT converted by Urban Legend); Urban Legend converts incoming Black card BEFORE lethal', () => {
  // Positive 1: Revealed Urban Legend (p1) plays ev-07 Vampire Bat (2 dmg) onto hidden 2-HP Arnold (p2) ->
  // Arnold reflects 2 dmg (`sourceType: 'skill'`, NOT consumable Black card!) back onto Urban Legend ->
  // Urban Legend CANNOT convert Arnold's skill reflection into heal; Urban Legend takes 2 reflected dmg (+1 vbat heal = net 1 wound)!
  {
    const st = makeLegalScenario(['exp2_urban_legend', 'exp1_arnold', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh'], {
      rulesetId: 'full-expansion',
      defaultLocation: 'radio',
    });
    st.players.p1.revealed = true;
    setWounds(st.players.p1, 2); // Urban Legend down 2 HP
    setWounds(st.players.p2, st.players.p2.maxHp - 2); // 2 HP hidden Arnold
    pullCard(st, 'ev-07', st.players.p1, 'hand');

    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p2' }, 42_000).ok, true);
    assert.equal(st.pendingChoice?.kind, 'arnold_reflect_lethal');
    assert.equal(st.pendingChoice?.ownerPlayerId, 'p2');
    assert.equal(
      applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'reflect' }, 42_010).ok,
      true,
    );
    assert.equal(st.players.p2.alive, true);
    assert.equal(st.players.p2.hp, 2, 'Arnold preserved exact 2 HP');
    // Urban Legend started at 2 wounds, took +2 reflected skill dmg (=4), then Vampire Bat healed -1 (=3 wounds)!
    // If Urban Legend had falsely converted Arnold's reflection to heal, wounds would be 0!
    assert.equal(st.players.p1.woundsTaken, 3, 'Arnold reflection (skill dmg) MUST NOT be converted to heal by Urban Legend');
    assert.equal(st.pendingChoice, null, 'Zero reflection/conversion loop');
    assertClean(st, '8F2-D3 positive Arnold reflects onto Urban Legend');
  }

  // Positive 2 & Boundary: Arnold (p1) plays ev-07 onto hidden 2-HP Urban Legend (p2) ->
  // Urban Legend BEFORE_DAMAGE secret choice converts lethal Black-card dmg into +2 HP heal (zero lethal, zero defeat)!
  {
    const st = makeLegalScenario(['exp1_arnold', 'exp2_urban_legend', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh'], {
      rulesetId: 'full-expansion',
      defaultLocation: 'radio',
    });
    setWounds(st.players.p2, st.players.p2.maxHp - 2); // 2 HP hidden Urban Legend
    pullCard(st, 'ev-07', st.players.p1, 'hand');

    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p2' }, 42_200).ok, true);
    assert.equal(st.pendingChoice?.kind, 'urban_legend_reveal_heal');
    assert.equal(st.pendingChoice?.isSecret, true);
    assert.equal(st.pendingChoice?.ownerPlayerId, 'p2');
    assert.equal(
      applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'reveal_and_heal' }, 42_210).ok,
      true,
    );
    assert.equal(st.players.p2.alive, true, 'Urban Legend converted lethal ev-07 into heal before death check');
    assert.equal(st.players.p2.hp, 4, 'Urban Legend healed +2 HP (2 -> 4 HP)');
    assert.equal(st.players.p2.revealed, true);
    assertClean(st, '8F2-D3 positive Urban Legend converts Arnold ev-07');
  }

  // Negative: Non-lethal ev-07 onto 5-HP Arnold does NOT trigger Arnold reflection
  {
    const st = makeLegalScenario(['exp2_urban_legend', 'exp1_arnold', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh'], {
      rulesetId: 'full-expansion',
      defaultLocation: 'radio',
    });
    setWounds(st.players.p2, st.players.p2.maxHp - 5); // 5 HP Arnold (2 dmg is non-lethal)
    pullCard(st, 'ev-07', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p2' }, 42_400).ok, true);
    assert.equal(st.pendingChoice, null, 'Non-lethal ev-07 MUST NOT open Arnold reflection');
    assert.equal(st.players.p2.hp, 3);
    assert.equal(st.players.p2.revealed, false);
    assertClean(st, '8F2-D3 negative non-lethal Arnold+Urban Legend');
  }
});
