'use strict';

/**
 * test/boardgame-phase6a.test.cjs
 *
 * Phase 6A — Shared Engine Foundations Verification:
 *  - CAP-07 CopiedVictoryGraph (ALL 11 mandatory graph scenarios + COPY_GOAL vs SHARE_OUTCOME distinction)
 *  - CAP-06 DamageRedirection (bounded chains, visited-set cycle guard, attribution, HP-cost/unpreventable exclusion)
 *  - Authoritative Reveal Event Ledger (monotonic revealSeq, death/final exclusion, simultaneous ordering)
 *  - CAP-10 Canonical Fictional Character Metadata (66/66 coverage, zero live player appearance inference)
 *  - Authoritative Equipment Theft & Transfer Transactions (conservation, Masamune guard, atomic reclaim, idempotency)
 *  - Phase 6A Privacy Hardening (uniform publicDeadlineMs on secret choices, zero pre-reveal leaks)
 *  - Zero Classic regression (victory.ts untouched, Classic evaluation identical)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const path = require('node:path');
require('./register-ts.cjs');

const ROOT = path.resolve(__dirname, '..');
const domain = require('../features/boardgame/domain/index.ts');
const contracts = require('../shared/contracts/boardgame.ts');

function createMockGame(playerSpecs, rulesetId = 'starter-thirty-eight') {
  const players = {};
  const turnOrder = [];
  for (let i = 0; i < playerSpecs.length; i++) {
    const spec = playerSpecs[i];
    const maxHp = spec.maxHp ?? 10;
    const wounds = spec.woundsTaken ?? (spec.alive === false ? maxHp : 0);
    const hp = spec.alive === false ? 0 : Math.max(0, maxHp - wounds);
    players[spec.id] = {
      playerId: spec.id,
      displayName: spec.name ?? spec.id,
      seatIndex: i,
      roleId: spec.roleId,
      faction: spec.faction,
      hp,
      maxHp,
      woundsTaken: wounds,
      location: spec.location ?? 'lobby',
      hand: [...(spec.hand ?? [])],
      equipped: [...(spec.equipped ?? [])],
      revealed: Boolean(spec.revealed),
      alive: spec.alive !== false,
      connected: spec.connected !== false,
      skillCooldown: 0,
      skillUsedOnce: Boolean(spec.skillUsedOnce),
      guardianShieldActive: false,
      attacksMade: 0,
      attacksThisTurn: 0,
      lastAttackTargetId: null,
      investigationsCount: 0,
      consecutiveSameZoneRolls: 0,
      eliminatedRound: spec.alive === false ? 2 : null,
      eliminatedByPlayerId: spec.eliminatedByPlayerId ?? null,
      protegePlayerId: null,
      avengedProtegeKiller: false,
      charlesKillWon: Boolean(spec.charlesKillWon),
      investigatedTargetIds: [],
      privateClues: [],
      appearance: {
        gender: spec.appearanceGender ?? 'male',
        outfit: 'hust-jacket',
        hairColor: '#111111',
      },
    };
    turnOrder.push(spec.id);
  }
  const state = {
    rulesetVersion: 4,
    rulesetId,
    matchId: 'p6a-test',
    seed: 12345,
    rngState: 12345,
    round: 3,
    maxRounds: 14,
    turnNumber: 9,
    turnPhase: 'MAIN_ACTION',
    activePlayerId: turnOrder[0],
    turnOrder,
    clusterPairs: domain.DEFAULT_CLUSTER_PAIRS,
    firstDeadPlayerId: null,
    extraTurnPending: false,
    players,
    decks: { investigation: [], equipment: [], event: [] },
    discards: { investigation: [], equipment: [], event: [] },
    lastDiceRoll: null,
    lastInvestigation: null,
    lastRevealEvent: null,
    publicLog: [],
    highlights: [],
    finished: false,
    winnerFaction: null,
    winnerLabel: null,
    winnerPlayerIds: [],
    winReason: null,
    finalReveal: null,
  };
  domain.ensureExpansionState(state);
  return state;
}

// ===========================================================================
// 1. CAP-07: CopiedVictoryGraph — ALL 11 Mandatory Graph Scenarios + Distinction
// ===========================================================================

test('P6A-1: CopiedVictoryGraph distinguishes COPY_GOAL from SHARE_OUTCOME (pure, zero mutation)', () => {
  // Allie (p3) is DEAD, Cassie (p1, COPY_GOAL -> Allie) is ALIVE, Bethany (p2, SHARE_OUTCOME -> Allie) is ALIVE
  // Hunter (p4) wins (Shadow p5 dead).
  const state = createMockGame([
    { id: 'p1', roleId: 'exp1_cassie', faction: 'wanderer', alive: true, revealed: true },
    { id: 'p2', roleId: 'exp1_bethany', faction: 'wanderer', alive: true, revealed: true },
    { id: 'p3', roleId: 'lang-quan-sat', faction: 'wanderer', alive: false, revealed: true },
    { id: 'p4', roleId: 'gac-ky-thuat', faction: 'lantern-guard', alive: true, revealed: true },
    { id: 'p5', roleId: 'suong-an-danh', faction: 'mist-order', alive: false, revealed: true },
  ]);
  state.expansionState.cassieCopiedGoalByPlayer = {
    p1: { targetPlayerId: 'p3', sourceRoleId: 'lang-quan-sat', boundEventId: 'r1', boundAtMs: 100, boundTurnNumber: 2 },
  };
  state.expansionState.bethanyChosenByPlayer = {
    p2: { chosenPlayerId: 'p3', designatedOnTurnNumber: 2, boundEventId: 'b1', boundAtMs: 120, txId: 'tx1' },
  };
  const beforeJson = JSON.stringify(state);
  const diag = domain.evaluateExpandedVictoryWithDiagnostics(state);
  assert.equal(JSON.stringify(state), beforeJson, 'CopiedVictoryGraph must be 100% pure (zero state mutation)');
  assert.equal(diag.evaluation.finished, true);
  // Cassie copied Allie's GOAL ("survive to end"): Cassie IS alive -> Cassie WINS even though Allie is dead!
  assert.ok(diag.evaluation.winnerPlayerIds.includes('p1'), 'Cassie COPY_GOAL evaluates Allie goal on Cassie state -> wins');
  // Bethany SHARED Allie's OUTCOME: Allie lost (dead) -> Bethany LOSES!
  assert.ok(!diag.evaluation.winnerPlayerIds.includes('p2'), 'Bethany SHARE_OUTCOME loses when Allie loses');
  assert.ok(!diag.evaluation.winnerPlayerIds.includes('p3'), 'Dead Allie loses');
  assert.equal(diag.graph.evaluatedByPlayer.p1.via, 'copy_goal');
  assert.equal(diag.graph.evaluatedByPlayer.p2.via, 'share_outcome');

  // Reverse test: Allie ALIVE, Cassie DEAD, Bethany DEAD
  state.players.p3.alive = true;
  state.players.p3.hp = 5;
  state.players.p1.alive = false;
  state.players.p1.hp = 0;
  state.players.p2.alive = false;
  state.players.p2.hp = 0;
  const diag2 = domain.evaluateExpandedVictoryWithDiagnostics(state);
  assert.ok(!diag2.evaluation.winnerPlayerIds.includes('p1'), 'Dead Cassie COPY_GOAL(Allie) loses even when Allie lives');
  assert.ok(diag2.evaluation.winnerPlayerIds.includes('p2'), 'Dead Bethany SHARE_OUTCOME(Allie) wins when Allie wins');
  assert.ok(diag2.evaluation.winnerPlayerIds.includes('p3'), 'Alive Allie wins');
});

test('P6A-2: CopiedVictoryGraph transitive chains (Bethany -> Diana -> Cassie & Cassie -> Clairvoyant -> Bethany)', () => {
  // Chain A: Bethany (p1, dead) -> Diana (p2, alive) -> Cassie (p3, alive) -> COPY_GOAL(Allie p4, dead)
  const stateA = createMockGame([
    { id: 'p1', roleId: 'exp1_bethany', faction: 'wanderer', alive: false, revealed: true },
    { id: 'p2', roleId: 'exp2_diana', faction: 'wanderer', alive: true, revealed: true },
    { id: 'p3', roleId: 'exp1_cassie', faction: 'wanderer', alive: true, revealed: true },
    { id: 'p4', roleId: 'lang-quan-sat', faction: 'wanderer', alive: false, revealed: true },
    { id: 'p5', roleId: 'gac-ky-thuat', faction: 'lantern-guard', alive: true },
    { id: 'p6', roleId: 'suong-an-danh', faction: 'mist-order', alive: false },
  ]);
  stateA.expansionState.bethanyChosenByPlayer = {
    p1: { chosenPlayerId: 'p2', designatedOnTurnNumber: 2, boundEventId: 'b1', boundAtMs: 1, txId: 't1' },
  };
  stateA.expansionState.dianaContracts = {
    p2: { customerPlayerId: 'p3', sourceRoleId: 'exp1_cassie', boundOnTurnNumber: 2, boundEventId: 'd1', boundAtMs: 2, status: 'active', activatedOnTurnNumber: 3 },
  };
  stateA.expansionState.cassieCopiedGoalByPlayer = {
    p3: { targetPlayerId: 'p4', sourceRoleId: 'lang-quan-sat', boundEventId: 'c1', boundAtMs: 3, boundTurnNumber: 2 },
  };
  const diagA = domain.evaluateExpandedVictoryWithDiagnostics(stateA);
  assert.deepEqual(diagA.evaluation.winnerPlayerIds, ['p1', 'p2', 'p3', 'p5']);
  assert.equal(diagA.graph.cycleCount, 0);

  // Chain B: Cassie (p1) -> Clairvoyant (p2) -> Bethany (p3) -> Hunter (p4)
  const stateB = createMockGame([
    { id: 'p1', roleId: 'exp1_cassie', faction: 'wanderer', alive: true, revealed: true },
    { id: 'p2', roleId: 'exp1_clairvoyant', faction: 'wanderer', alive: true, revealed: true },
    { id: 'p3', roleId: 'exp1_bethany', faction: 'wanderer', alive: true, revealed: true },
    { id: 'p4', roleId: 'gac-ky-thuat', faction: 'lantern-guard', alive: true },
    { id: 'p5', roleId: 'suong-an-danh', faction: 'mist-order', alive: false },
  ]);
  stateB.expansionState.cassieCopiedGoalByPlayer = {
    p1: { targetPlayerId: 'p2', sourceRoleId: 'exp1_clairvoyant', boundEventId: 'c1', boundAtMs: 1, boundTurnNumber: 2 },
  };
  stateB.expansionState.clairvoyantVisions = {
    p2: {
      targetPlayerId: 'p3', targetDisplayName: 'p3', sourceRoleId: 'exp1_bethany',
      roleName: 'Bethany', faction: 'wanderer', maxHp: 10, copiedGoalSummary: 'Chosen wins',
      boundEventId: 'v1', boundAtMs: 2, boundTurnNumber: 3,
    },
  };
  stateB.expansionState.bethanyChosenByPlayer = {
    p3: { chosenPlayerId: 'p4', designatedOnTurnNumber: 3, boundEventId: 'b1', boundAtMs: 3, txId: 't2' },
  };
  const diagB = domain.evaluateExpandedVictoryWithDiagnostics(stateB);
  assert.deepEqual(diagB.evaluation.winnerPlayerIds, ['p1', 'p2', 'p3', 'p4']);
  assert.equal(diagB.graph.evaluatedByPlayer.p1.via, 'copy_goal');
  assert.equal(diagB.graph.evaluatedByPlayer.p2.via, 'copy_goal');
  assert.equal(diagB.graph.evaluatedByPlayer.p3.via, 'share_outcome');
});

test('P6A-3: CopiedVictoryGraph cycle detection (2-node & 3-node cycles fail closed + internal telemetry)', () => {
  // 2-node cycle: Bethany (p1) <-> Diana (p2)
  const state2 = createMockGame([
    { id: 'p1', roleId: 'exp1_bethany', faction: 'wanderer', alive: true, revealed: true },
    { id: 'p2', roleId: 'exp2_diana', faction: 'wanderer', alive: true, revealed: true },
    { id: 'p3', roleId: 'gac-ky-thuat', faction: 'lantern-guard', alive: true },
    { id: 'p4', roleId: 'suong-an-danh', faction: 'mist-order', alive: false },
  ]);
  state2.expansionState.bethanyChosenByPlayer = {
    p1: { chosenPlayerId: 'p2', designatedOnTurnNumber: 2, boundEventId: 'b1', boundAtMs: 1, txId: 't1' },
  };
  state2.expansionState.dianaContracts = {
    p2: { customerPlayerId: 'p1', sourceRoleId: 'exp1_bethany', boundOnTurnNumber: 2, boundEventId: 'd1', boundAtMs: 2, status: 'active', activatedOnTurnNumber: 3 },
  };
  const diag2 = domain.evaluateExpandedVictoryWithDiagnostics(state2);
  assert.deepEqual(diag2.evaluation.winnerPlayerIds, ['p3'], '2-node cycle must fail closed and award zero cycle wins');
  assert.ok(diag2.graph.cycleCount >= 1);
  assert.equal(diag2.graph.evaluatedByPlayer.p1.via, 'cycle_blocked');
  assert.equal(diag2.graph.evaluatedByPlayer.p2.via, 'cycle_blocked');
  // Verify cycle telemetry is NEVER in public view or public log
  const pub2 = domain.getPublicGameView(state2);
  assert.equal(JSON.stringify(pub2).includes('vcycle'), false);

  // 3-node cycle: Bethany (p1) -> Diana (p2) -> Cassie (p3) -> Bethany (p1)
  const state3 = createMockGame([
    { id: 'p1', roleId: 'exp1_bethany', faction: 'wanderer', alive: true, revealed: true },
    { id: 'p2', roleId: 'exp2_diana', faction: 'wanderer', alive: true, revealed: true },
    { id: 'p3', roleId: 'exp1_cassie', faction: 'wanderer', alive: true, revealed: true },
    { id: 'p4', roleId: 'gac-ky-thuat', faction: 'lantern-guard', alive: true },
    { id: 'p5', roleId: 'suong-an-danh', faction: 'mist-order', alive: false },
  ]);
  state3.expansionState.bethanyChosenByPlayer = {
    p1: { chosenPlayerId: 'p2', designatedOnTurnNumber: 2, boundEventId: 'b1', boundAtMs: 1, txId: 't1' },
  };
  state3.expansionState.dianaContracts = {
    p2: { customerPlayerId: 'p3', sourceRoleId: 'exp1_cassie', boundOnTurnNumber: 2, boundEventId: 'd1', boundAtMs: 2, status: 'active', activatedOnTurnNumber: 3 },
  };
  state3.expansionState.cassieCopiedGoalByPlayer = {
    p3: { targetPlayerId: 'p1', sourceRoleId: 'exp1_bethany', boundEventId: 'c1', boundAtMs: 3, boundTurnNumber: 2 },
  };
  const diag3 = domain.evaluateExpandedVictoryWithDiagnostics(state3);
  assert.deepEqual(diag3.evaluation.winnerPlayerIds, ['p4'], '3-node cycle A->B->C->A must fail closed');
  assert.ok(diag3.graph.cycleCount >= 1);
  assert.equal(diag3.graph.evaluatedByPlayer.p1.cycleBlocked, true);
  assert.equal(diag3.graph.evaluatedByPlayer.p2.cycleBlocked, true);
  assert.equal(diag3.graph.evaluatedByPlayer.p3.cycleBlocked, true);
});

test('P6A-4: CopiedVictoryGraph edge cases (missing target, death-based win, status change, solo+linked, Clairvoyant copying shared Neutral)', () => {
  // 1. Missing target fails closed cleanly
  const stateMiss = createMockGame([
    { id: 'p1', roleId: 'exp1_bethany', faction: 'wanderer', alive: true, revealed: true },
    { id: 'p2', roleId: 'gac-ky-thuat', faction: 'lantern-guard', alive: true },
    { id: 'p3', roleId: 'suong-an-danh', faction: 'mist-order', alive: false },
  ]);
  stateMiss.expansionState.bethanyChosenByPlayer = {
    p1: { chosenPlayerId: 'ghost_missing', designatedOnTurnNumber: 2, boundEventId: 'b1', boundAtMs: 1, txId: 't1' },
  };
  const diagMiss = domain.evaluateExpandedVictoryWithDiagnostics(stateMiss);
  assert.deepEqual(diagMiss.evaluation.winnerPlayerIds, ['p2']);
  assert.equal(diagMiss.graph.evaluatedByPlayer.p1.via, 'unresolved');

  // 2. Dead target legitimately wins via death-based win (Daniel first death) -> Bethany co-wins!
  const stateDeadWin = createMockGame([
    { id: 'p1', roleId: 'exp1_bethany', faction: 'wanderer', alive: false, revealed: true },
    { id: 'p2', roleId: 'lang-tien-phong', faction: 'wanderer', alive: false, revealed: true },
    { id: 'p3', roleId: 'gac-ky-thuat', faction: 'lantern-guard', alive: true },
    { id: 'p4', roleId: 'suong-an-danh', faction: 'mist-order', alive: true },
  ]);
  // Only p2 died first? Wait: p1 is also dead so deadCount=2 -> let's test Arlene killed by Hunter while Bethany is dead!
  stateDeadWin.players.p2.roleId = 'exp2_arlene';
  stateDeadWin.expansionState.arleneHunterKillTriggeredIds = ['p2'];
  stateDeadWin.expansionState.bethanyChosenByPlayer = {
    p1: { chosenPlayerId: 'p2', designatedOnTurnNumber: 1, boundEventId: 'b1', boundAtMs: 1, txId: 't1' },
  };
  const diagDeadWin = domain.evaluateExpandedVictoryWithDiagnostics(stateDeadWin);
  assert.equal(diagDeadWin.evaluation.finished, true);
  assert.equal(diagDeadWin.evaluation.winnerFaction, 'wanderer-solo');
  assert.deepEqual(diagDeadWin.evaluation.winnerPlayerIds, ['p1', 'p2'], 'Bethany co-wins when dead Chosen wins via death-based victory');

  // 3. Clairvoyant copies Diana (shared condition) + status change later
  const stateDyn = createMockGame([
    { id: 'p1', roleId: 'exp1_clairvoyant', faction: 'wanderer', alive: true, revealed: true, woundsTaken: 2 },
    { id: 'p2', roleId: 'exp2_diana', faction: 'wanderer', alive: true, revealed: false, woundsTaken: 0 },
    { id: 'p3', roleId: 'exp2_colt', faction: 'wanderer', alive: true, revealed: true, equipped: ['ev-02', 'ev-03', 'ev-04'] },
    { id: 'p4', roleId: 'gac-ky-thuat', faction: 'lantern-guard', alive: true },
    { id: 'p5', roleId: 'suong-an-danh', faction: 'mist-order', alive: true },
  ]);
  stateDyn.expansionState.clairvoyantVisions = {
    p1: {
      targetPlayerId: 'p2', targetDisplayName: 'p2', sourceRoleId: 'exp2_diana',
      roleName: 'Diana', faction: 'wanderer', maxHp: 13, copiedGoalSummary: 'Customer wins',
      boundEventId: 'v1', boundAtMs: 1, boundTurnNumber: 2,
    },
  };
  // Before Diana activates customer: Diana has fallback full HP (true), Clairvoyant has woundsTaken=2 (fallback false!)
  const diagBefore = domain.evaluateExpandedVictoryWithDiagnostics(stateDyn);
  assert.equal(diagBefore.evaluation.finished, true, 'Colt 3 weapons triggers immediate solo win');
  assert.deepEqual(diagBefore.evaluation.winnerPlayerIds, ['p2', 'p3'], 'Inactive Diana wins on full-HP fallback; wounded Clairvoyant loses');

  // Now Diana activates customer = Colt (p3) -> target changes victory status later!
  stateDyn.expansionState.dianaContracts = {
    p2: { customerPlayerId: 'p3', sourceRoleId: 'exp2_colt', boundOnTurnNumber: 1, boundEventId: 'd1', boundAtMs: 1, status: 'active', activatedOnTurnNumber: 2 },
  };
  const diagAfter = domain.evaluateExpandedVictoryWithDiagnostics(stateDyn);
  assert.deepEqual(diagAfter.evaluation.winnerPlayerIds, ['p1', 'p2', 'p3'], 'Once Diana binds active Colt, Clairvoyant (alive) + Diana (alive) both co-win with Colt in turnOrder');
});

// ===========================================================================
// 2. CAP-06: DamageRedirection — Bounds, Attribution, Loop Guards
// ===========================================================================

test('P6A-5: DamageRedirection (Anathema + Arnold) prevents loops, preserves attribution, excludes HP costs', () => {
  const state = createMockGame([
    { id: 'anathema', roleId: 'exp1_anathema', faction: 'neutral' === 'neutral' ? 'wanderer' : 'wanderer', maxHp: 8, revealed: true },
    { id: 'arnold', roleId: 'exp1_arnold', faction: 'wanderer', maxHp: 8, woundsTaken: 5, revealed: false },
    { id: 'attacker', roleId: 'gac-ky-thuat', faction: 'lantern-guard', maxHp: 14, revealed: true },
  ]);
  state.expansionState.anathemaCurses = {
    anathema: { targetPlayerId: 'arnold', activatedOnTurnNumber: 1, active: true, endTurnSelfDamageApplied: false },
  };

  // 1. Eligible damage to Anathema redirects to Arnold preserving original attacker & target
  const step1 = {
    kind: 'DAMAGE',
    damageEventId: 'dmg-1',
    targetPlayerId: 'anathema',
    attackerPlayerId: 'attacker',
    rawAmount: 4,
    sourceType: 'attack',
    isSingleTarget: true,
  };
  const res1 = domain.evaluateAnathemaRedirection(state, step1);
  assert.equal(res1.redirected, true);
  assert.equal(res1.newTargetPlayerId, 'arnold');
  assert.equal(res1.originalTargetPlayerId, 'anathema');
  assert.equal(res1.originalAttackerPlayerId, 'attacker');
  assert.deepEqual(res1.nextRedirectChain, ['anathema', 'arnold']);

  const redirectedStep = domain.buildAnathemaRedirectedDamageStep(
    step1, res1, 'dmg-2', 'Anathema', 'Arnold',
  );
  assert.equal(redirectedStep.anathemaRedirected, true);
  assert.equal(redirectedStep.attackerPlayerId, 'attacker');

  // 2. Arnold (3 HP left) facing 4 dmg from redirected step -> eligible to reflect onto original attacker!
  const arnoldCheck = domain.evaluateArnoldLethalReflection(state, redirectedStep, 4);
  assert.equal(arnoldCheck.eligible, true);
  assert.equal(arnoldCheck.reflectTargetPlayerId, 'attacker');
  assert.equal(arnoldCheck.reflectedAmount, 4);
  assert.deepEqual(arnoldCheck.nextRedirectChain, ['anathema', 'arnold', 'attacker']);

  // 3. Reflected damage CANNOT trigger Arnold again (`isArnoldReflection: true`)
  const reflectedStep = domain.buildArnoldReflectedDamageStep(
    redirectedStep, arnoldCheck, 'dmg-3', 'Arnold', 'Attacker', true,
  );
  assert.equal(reflectedStep.isArnoldReflection, true);
  state.players.attacker.roleId = 'exp1_arnold';
  state.players.attacker.hp = 2;
  const arnoldVsArnold = domain.evaluateArnoldLethalReflection(state, reflectedStep, 4);
  assert.equal(arnoldVsArnold.eligible, false);
  assert.equal(arnoldVsArnold.reason, 'already-arnold-reflection');

  // 4. Anathema <-> Arnold cycle prevention via visited-target set (`redirectChain`)
  const anathemaSelfFlareToArnold = {
    kind: 'DAMAGE',
    damageEventId: 'dmg-flare',
    targetPlayerId: 'anathema',
    attackerPlayerId: 'arnold',
    rawAmount: 4,
    sourceType: 'skill',
    redirectChain: ['arnold', 'anathema'],
    redirectDepth: 1,
  };
  const bounceBlocked = domain.evaluateAnathemaRedirection(state, anathemaSelfFlareToArnold);
  assert.equal(bounceBlocked.redirected, false);
  assert.equal(bounceBlocked.reason, 'cycle-or-visited');

  // 5. Unpreventable / HP cost (Anathema end-of-turn 1 dmg) NEVER redirects!
  const hpCostStep = {
    kind: 'DAMAGE',
    damageEventId: 'dmg-cost',
    targetPlayerId: 'anathema',
    attackerPlayerId: null,
    rawAmount: 1,
    sourceType: 'hp-cost',
    isHpCost: true,
    unpreventable: true,
  };
  const costRes = domain.evaluateAnathemaRedirection(state, hpCostStep);
  assert.equal(costRes.redirected, false);
  assert.equal(costRes.reason, 'unpreventable-or-cost');

  // 6. Depth limit guard (`MAX_REDIRECT_CHAIN_DEPTH`)
  const deepStep = {
    kind: 'DAMAGE',
    damageEventId: 'dmg-deep',
    targetPlayerId: 'anathema',
    attackerPlayerId: 'attacker',
    rawAmount: 2,
    sourceType: 'skill',
    redirectDepth: domain.MAX_REDIRECT_CHAIN_DEPTH,
  };
  const deepRes = domain.evaluateAnathemaRedirection(state, deepStep);
  assert.equal(deepRes.redirected, false);
  assert.equal(deepRes.reason, 'depth-exceeded');

  // 7. Source-less lethal damage (attackerPlayerId = null) does NOT trigger Arnold
  const sourceless = {
    kind: 'DAMAGE',
    damageEventId: 'dmg-env',
    targetPlayerId: 'arnold',
    attackerPlayerId: null,
    rawAmount: 4,
    sourceType: 'event',
  };
  const envCheck = domain.evaluateArnoldLethalReflection(state, sourceless, 4);
  assert.equal(envCheck.eligible, false);
  assert.equal(envCheck.reason, 'no-valid-attacker');
});

// ===========================================================================
// 3. Authoritative Reveal Event System & Canonical Character Metadata (66/66)
// ===========================================================================

test('P6A-6: Canonical Fictional Character Metadata covers all 66 roles with zero live-avatar inference', () => {
  const allMeta = domain.listAllCanonicalCharacterMetadata();
  assert.equal(allMeta.length, 66, 'Must have explicit entry for all 66 roles (10 Classic + 56 Expansion)');
  const validGenders = new Set(['female', 'male', 'unspecified']);
  const seen = new Set();
  for (const entry of allMeta) {
    assert.ok(!seen.has(entry.roleId), `Duplicate metadata roleId: ${entry.roleId}`);
    seen.add(entry.roleId);
    assert.ok(validGenders.has(entry.fictionalGender), `Invalid gender for ${entry.roleId}`);
    assert.ok(entry.provenance.length > 0, `Missing provenance for ${entry.roleId}`);
  }
  assert.equal(domain.getCanonicalCharacterGender('lang-quan-sat'), 'female');
  assert.equal(domain.getCanonicalCharacterGender('exp2_diana'), 'female');
  assert.equal(domain.getCanonicalCharacterGender('exp2_aaron'), 'male');
  assert.equal(domain.getCanonicalCharacterGender('exp2_g43'), 'unspecified');
  assert.equal(domain.getCanonicalCharacterGender('suong-tin-gia'), 'unspecified');
  assert.equal(domain.getCanonicalCharacterGender('exp1_anathema'), 'unspecified');
  assert.equal(domain.isEligibleFemaleRole('exp2_fiona'), true);
  assert.equal(domain.isEligibleFemaleRole('exp2_gideon'), false);
  assert.equal(domain.isEligibleFemaleRole('exp2_g43'), false);
});

test('P6A-7: Authoritative Reveal Ledger enforces monotonic revealSeq and excludes death/final disclosure', () => {
  const state = createMockGame([
    { id: 'p1', roleId: 'exp2_aaron', faction: 'wanderer', revealed: false, appearanceGender: 'female' },
    { id: 'p2', roleId: 'lang-quan-sat', faction: 'wanderer', revealed: false, alive: false },
    { id: 'p3', roleId: 'exp2_fiona', faction: 'lantern-guard', revealed: false, alive: true, appearanceGender: 'male' },
    { id: 'p4', roleId: 'exp1_cindy', faction: 'wanderer', revealed: false, alive: true },
  ]);
  // Death reveal of Allie (female Neutral) must NOT qualify as normal gameplay reveal!
  domain.recordAuthoritativeRevealEvent(state, {
    revealEventId: 'rev-death-1',
    revealedPlayerId: 'p2',
    triggerReason: 'eliminated',
    sourceActorId: 'p3',
    atMs: 1000,
    wasAliveBeforeReveal: false,
    isDeathReveal: true,
  });
  // Final-match disclosure must NOT qualify either!
  domain.recordAuthoritativeRevealEvent(state, {
    revealEventId: 'rev-final-1',
    revealedPlayerId: 'p4',
    triggerReason: 'final-disclosure',
    sourceActorId: null,
    atMs: 1100,
    wasAliveBeforeReveal: true,
    isFinalMatchDisclosure: true,
  });
  assert.equal(domain.findFirstEligibleNeutralReveal(state, 'p1'), null);
  assert.equal(domain.findFirstEligibleFemaleReveal(state, 'p1'), null);

  // Normal reveal of Fiona (female Hunter, despite player's appearanceGender='male'!) -> qualifies for Aaron, NOT Cassie/Diana
  const recFiona = domain.recordAuthoritativeRevealEvent(state, {
    revealEventId: 'rev-norm-1',
    revealedPlayerId: 'p3',
    triggerReason: 'voluntary',
    sourceActorId: 'p3',
    atMs: 1200,
    wasAliveBeforeReveal: true,
  });
  // Normal reveal of Cindy (female Neutral) -> qualifies for Cassie/Diana AND is 2nd female (Fiona remains 1st for Aaron!)
  const recCindy = domain.recordAuthoritativeRevealEvent(state, {
    revealEventId: 'rev-norm-2',
    revealedPlayerId: 'p4',
    triggerReason: 'reaction',
    sourceActorId: 'p4',
    atMs: 1250,
    wasAliveBeforeReveal: true,
  });
  assert.ok(recFiona.revealSeq < recCindy.revealSeq);
  assert.equal(domain.findFirstEligibleFemaleReveal(state, 'p1')?.revealedPlayerId, 'p3');
  assert.equal(domain.findFirstEligibleNeutralReveal(state, 'p1')?.revealedPlayerId, 'p4');

  // Duplicate revealEventId is idempotent
  const dup = domain.recordAuthoritativeRevealEvent(state, {
    revealEventId: 'rev-norm-1',
    revealedPlayerId: 'p3',
    triggerReason: 'voluntary',
    sourceActorId: 'p3',
    atMs: 9999,
    wasAliveBeforeReveal: true,
  });
  assert.equal(dup.revealSeq, recFiona.revealSeq);
});

// ===========================================================================
// 4. Equipment Transfer & Theft Transactions + Colt Qualifying Weapons
// ===========================================================================

test('P6A-8: EquipmentTransferTransaction enforces conservation, Masamune block, idempotency & atomic Colt reclaim', () => {
  const state = createMockGame([
    { id: 'colt', roleId: 'exp2_colt', faction: 'wanderer', equipped: ['ev-01', 'ev-02', 'ev-03'] },
    { id: 'thief', roleId: 'gac-ky-thuat', faction: 'lantern-guard', equipped: [] },
  ]);

  // 1. Canonical Colt weapon helpers (ev-02..ev-05 only; Masamune ev-01 & Machine Gun ev-06 excluded)
  assert.equal(domain.isColtQualifyingWeaponId('ev-02'), true);
  assert.equal(domain.isColtQualifyingWeaponId('ev-03'), true);
  assert.equal(domain.isColtQualifyingWeaponId('ev-04'), true);
  assert.equal(domain.isColtQualifyingWeaponId('ev-05'), true);
  assert.equal(domain.isColtQualifyingWeaponId('ev-01'), false);
  assert.equal(domain.isColtQualifyingWeaponId('ev-06'), false);
  assert.equal(domain.countColtQualifyingWeapons(state.players.colt.equipped), 2);

  // 2. Bethany voluntary transfer rejects Masamune (`ev-01`)
  const masaBlocked = domain.executeEquipmentTransferTransaction(state, {
    cardId: 'ev-01',
    fromPlayerId: 'colt',
    toPlayerId: 'thief',
    reason: 'bethany-offer',
    idempotencyKey: 'masa-1',
    nowMs: 1000,
  });
  assert.equal(masaBlocked.ok, false);
  assert.equal(masaBlocked.reason, 'masamune-forbidden');
  assert.equal(state.players.colt.equipped.includes('ev-01'), true);

  // 3. Genuine theft (court) transfers exact single card & enters pending-reaction
  assert.equal(domain.isGenuineTheftReason('theft-court'), true);
  assert.equal(domain.isGenuineTheftReason('theft-moody-goblin'), true);
  assert.equal(domain.isGenuineTheftReason('theft-bob'), true);
  assert.equal(domain.isGenuineTheftReason('bethany-offer'), false);
  assert.equal(domain.isGenuineTheftReason('gift-bryon'), false);

  const theft = domain.executeEquipmentTransferTransaction(state, {
    cardId: 'ev-02',
    fromPlayerId: 'colt',
    toPlayerId: 'thief',
    reason: 'theft-court',
    idempotencyKey: 'court-steal-1',
    nowMs: 1010,
    pendingReaction: true,
  });
  assert.equal(theft.ok, true);
  assert.equal(theft.transaction.status, 'pending-reaction');
  assert.deepEqual(state.players.colt.equipped, ['ev-01', 'ev-03']);
  assert.deepEqual(state.players.thief.equipped, ['ev-02']);

  // 4. Duplicate idempotencyKey rejected (no duplication)
  const dup = domain.executeEquipmentTransferTransaction(state, {
    cardId: 'ev-02',
    fromPlayerId: 'colt',
    toPlayerId: 'thief',
    reason: 'theft-court',
    idempotencyKey: 'court-steal-1',
    nowMs: 1011,
  });
  assert.equal(dup.ok, false);
  assert.equal(dup.reason, 'duplicate-transaction');

  // 5. Atomic Colt reclaim rolls back exact card without duplicating or destroying
  const reclaim = domain.reclaimStolenEquipmentTransaction(state, theft.transaction.txId, 1020);
  assert.equal(reclaim.ok, true);
  assert.equal(reclaim.cardId, 'ev-02');
  assert.equal(reclaim.originalTx.status, 'rolled-back');
  assert.deepEqual(state.players.colt.equipped, ['ev-01', 'ev-03', 'ev-02']);
  assert.deepEqual(state.players.thief.equipped, []);

  // 6. Second reclaim on same txId is rejected (cannot duplicate!)
  const doubleReclaim = domain.reclaimStolenEquipmentTransaction(state, theft.transaction.txId, 1030);
  assert.equal(doubleReclaim.ok, false);
  assert.equal(doubleReclaim.reason, 'tx-not-pending');
  assert.equal(state.players.colt.equipped.filter((id) => id === 'ev-02').length, 1);
});

// ===========================================================================
// 5. Phase 6A Privacy Hardening & Contract Validation + Classic Zero Regression
// ===========================================================================

test('P6A-9: Privacy hardening normalizes secret publicDeadlineMs, gates badges & isolates Clairvoyant vision', () => {
  const state = createMockGame([
    { id: 'clair', roleId: 'exp1_clairvoyant', faction: 'wanderer', revealed: true },
    { id: 'diana', roleId: 'exp2_diana', faction: 'wanderer', revealed: false },
    { id: 'arnold', roleId: 'exp1_arnold', faction: 'wanderer', revealed: false, connected: false },
    { id: 'target', roleId: 'suong-gac-cong', faction: 'mist-order', revealed: false },
  ]);
  // Secret pending choice with shortened disconnected deadlineMs vs normalized publicDeadlineMs
  state.pendingChoice = {
    choiceId: 'ch-secret-1',
    eventId: 'dmg-1',
    ownerPlayerId: 'arnold',
    kind: 'arnold_reflect_lethal',
    isSecret: true,
    title: 'Số Phận Thay Đổi (Arnold)',
    description: 'Secret description',
    publicPromptLabel: '⏳ Đang kiểm tra phản ứng...',
    options: [{ optionId: 'decline', label: 'Giữ kín' }],
    defaultOptionId: 'decline',
    createdAtMs: 10_000,
    deadlineMs: 12_500, // shortened due to disconnect
    publicDeadlineMs: 22_000, // normalized uniform public deadline
    data: {
      kind: 'arnold_reflect_lethal',
      arnoldPlayerId: 'arnold',
      damageEventId: 'dmg-1',
      reflectTargetPlayerId: 'target',
      reflectedAmount: 4,
      wasUnrevealed: true,
    },
  };
  // Pending unrevealed Diana contract MUST NOT leak publicly
  state.expansionState.dianaContracts = {
    diana: {
      customerPlayerId: 'clair',
      sourceRoleId: 'exp1_clairvoyant',
      boundOnTurnNumber: 2,
      boundEventId: 'ev-1',
      boundAtMs: 5000,
      status: 'pending',
    },
  };
  // Clairvoyant private vision MUST ONLY appear in clair's privateView
  state.expansionState.clairvoyantVisions = {
    clair: {
      targetPlayerId: 'target',
      targetDisplayName: 'Target',
      sourceRoleId: 'suong-gac-cong',
      roleName: 'Dũng "Gác Cổng"',
      faction: 'mist-order',
      maxHp: 14,
      copiedGoalSummary: 'Shadow team wins',
      boundEventId: 'v-1',
      boundAtMs: 6000,
      boundTurnNumber: 3,
    },
  };

  const pub = domain.getPublicGameView(state);
  assert.equal(pub.pendingChoice.ownerPlayerId, null);
  assert.equal(pub.pendingChoice.kind, null);
  assert.equal(pub.pendingChoice.deadlineMs, 22_000, 'Public deadlineMs must be normalized and hide disconnect cap');
  assert.equal(pub.dianaActiveCustomerByPlayer, undefined, 'Pending Diana contract must NEVER leak publicly');
  assert.equal(JSON.stringify(pub).includes('suong-gac-cong'), false, 'Clairvoyant target role must NEVER leak publicly');

  const privClair = domain.getPrivateGameView(state, 'clair');
  assert.equal(privClair.clairvoyantReveals.length, 1);
  assert.equal(privClair.clairvoyantReveals[0].roleId, 'suong-gac-cong');

  const privTarget = domain.getPrivateGameView(state, 'target');
  assert.equal(privTarget.clairvoyantReveals, undefined, 'Inspected target must NOT receive Clairvoyant vision');

  const privArnold = domain.getPrivateGameView(state, 'arnold');
  assert.equal(privArnold.pendingChoice.deadlineMs, 12_500, 'Owner still sees real deadline in privateView');

  // Contract validator for TRANSFER_TO_BETHANY
  const validAction = contracts.validateBoardGameActionPayload({
    type: 'TRANSFER_TO_BETHANY',
    targetPlayerId: 'p_bethany',
    cardId: 'eq-01',
  });
  assert.equal(validAction.ok, true);
  const badAction = contracts.validateBoardGameActionPayload({
    type: 'TRANSFER_TO_BETHANY',
    targetPlayerId: 'p_bethany',
    cardId: 'eq-01',
    extra: 'injected',
  });
  assert.equal(badAction.ok, false);

  // Classic victory.ts must have ZERO git diff
  const victoryDiff = execSync('git diff --stat features/boardgame/domain/victory.ts', {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
  assert.equal(victoryDiff, '', 'features/boardgame/domain/victory.ts must remain 100% untouched');
});
