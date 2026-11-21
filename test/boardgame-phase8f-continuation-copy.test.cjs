#!/usr/bin/env node
/**
 * test/boardgame-phase8f-continuation-copy.test.cjs
 *
 * Phase 8F-3 — Targeted Audit & Regression Suite for:
 *  - 8F3-A: Card Continuation Pipeline (`deliverNextGloriaQueuedCard`, `finalizeIfFinished`,
 *           `continuationManaged`, `applyExpandedUseCard`, `resolveUseCard`, `ev-09` dud,
 *           `eq-09`, `eq-10`, `eq-15`, `eq-07` paused on Usurper, `ev-11` Moody Goblin + Colt,
 *           `ev-12` Banana Peel, multi-step match-end).
 *  - 8F3-B: Copied Skill × Card Eligibility & Reveal Restrictions
 *           (`BUG-8F-01` Undead `eq-14` Chocolate & Fallen `<8 HP` `eq-13` Advent,
 *            `BUG-8F-02` Copied Classic Emi `gac-truc-ban` `USE_SKILL`,
 *            Vengeful Spirit / Antimony × `eq-13`/`eq-14`/`ev-13`/`eq-04`, heal blockers,
 *            usage limits, PendingChoice ownership & provenance).
 *  - 8F3-C: Immediate Victory Through Real Authoritative Action Pipeline
 *           (Colt 3rd weapon, Bob 5th item, N.C. Soldier recruit + 3rd weapon,
 *            Bonnie Shadow conversion + win, Cain Power Play + elimination dual win,
 *            Undead dormancy delaying elimination victory -> revival -> 2nd lethal final win).
 */
'use strict';

require('./register-ts.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveProductionBetaConfigFromEnv,
} = require('../shared/contracts/boardgame.ts');
const {
  applyPlayerGameAction,
  createInitialGameState,
  ensureExpansionState,
  getCopiedSkillBinding,
  getEffectiveFaction,
  getEffectiveSkillRoleId,
  getPairedLocationInCluster,
  getPlayerAlliance,
  getPlayerLifecycleState,
  getRoleDesign,
  hasEffectiveSkillUsedOnce,
  isPlayerDormantPendingRevive,
} = require('../features/boardgame/domain/index.ts');
const {
  checkGameStateInvariants,
} = require('./helpers/boardgame-invariants.cjs');

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

function makeScenario(roles, opts = {}) {
  const rulesetId = opts.rulesetId ?? 'full-expansion';
  const state = createInitialGameState({
    matchId: opts.matchId ?? `p8f3-${Math.random().toString(36).slice(2, 8)}`,
    seed: opts.seed ?? 86001,
    nowMs: opts.nowMs ?? 1_796_300_000_000,
    rulesetId,
    productionBeta: PROD_BETA_ALL,
    players: makePlayers(roles.length),
  });
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
  throw new Error(`Card ${cardId} not found in decks/discards`);
}

function putOnTopOfDeck(state, deckId, cardId) {
  for (const d of ['investigation', 'equipment', 'event']) {
    const i = state.decks[d].indexOf(cardId);
    if (i >= 0) {
      state.decks[d].splice(i, 1);
      state.decks[deckId].unshift(cardId);
      return;
    }
    const j = state.discards[d].indexOf(cardId);
    if (j >= 0) {
      state.discards[d].splice(j, 1);
      state.decks[deckId].unshift(cardId);
      return;
    }
  }
  throw new Error(`Card ${cardId} not available to top-deck`);
}

function setWounds(p, w) {
  p.woundsTaken = w;
  p.hp = Math.max(0, p.maxHp - w);
}

function assertClean(state, label) {
  const res = checkGameStateInvariants(state, { checkSerialization: true });
  assert.equal(res.ok, true, `${label} invariant failure: ${JSON.stringify(res.violations)}`);
}

// ============================================================================
// 8F3-A — CARD CONTINUATION PIPELINE AUDIT & REGRESSION
// ============================================================================

test('8F3-A1 — BUG-8F-03: ev-09 Dynamite roll-7 dud MUST deliver queued Gloria card without deadlock', () => {
  // Find deterministic rngState where Dynamite rolls d6 + d4 === 7 (dud / BOM XIT!)
  let dudRng = null;
  for (let probe = 1; probe <= 200; probe++) {
    const tmp = makeScenario(['exp2_gloria', 'gac-radio', 'suong-an-danh', 'suong-gac-cong'], { seed: probe * 37 });
    const startRng = tmp.rngState;
    pullCard(tmp, 'ev-09', tmp.players.p1, 'hand');
    applyPlayerGameAction(tmp, 'p1', { type: 'USE_CARD', cardId: 'ev-09' }, 1000);
    if (tmp.lastDiceRoll && tmp.lastDiceRoll.total === 7) {
      dudRng = startRng;
      break;
    }
  }
  assert.ok(dudRng !== null, 'Must locate deterministic seed rolling 7 on ev-09 Dynamite');

  const st = makeScenario(['exp2_gloria', 'gac-radio', 'suong-an-danh', 'suong-gac-cong']);
  st.players.p1.revealed = true;
  st.rngState = dudRng;
  pullCard(st, 'ev-09', st.players.p1, 'hand');
  const exp = ensureExpansionState(st);
  const queuedEq = st.decks.equipment.shift(); // 2nd queued card
  exp.gloriaQueuedCards = [{ playerId: 'p1', cardId: queuedEq, movementEventId: 'test-gloria-dud' }];

  const res = applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-09' }, 1100);
  assert.equal(res.ok, true);
  assert.equal(st.lastDiceRoll.total, 7, 'Confirmed ev-09 rolled 7 (dud)');
  assert.equal(
    (exp.gloriaQueuedCards ?? []).filter((e) => e.playerId === 'p1').length,
    0,
    'BUG-8F-03: ev-09 Dynamite roll-7 early exit MUST call deliverNextGloriaQueuedCard!',
  );
  assertClean(st, '8F3-A1 ev-09 dud Gloria queue');
});

test('8F3-A2 — Gloria 2-card queue continuation across eq-10, eq-15, eq-09 (raise-to-7 & April Skipps), and eq-07 paused on hidden Usurper', () => {
  // (a) Gloria draws eq-10 (Guardian Angel, !handledInExpandedCardPipeline) + eq-01 (Holy Robe) at Church (`lobby`)
  {
    const st = makeScenario(['exp2_gloria', 'gac-radio', 'suong-an-danh', 'suong-gac-cong'], { defaultLocation: 'lobby', turnPhase: 'LOCATION_ACTION' });
    st.players.p1.revealed = true;
    putOnTopOfDeck(st, 'equipment', 'eq-01'); // card #2 (equipment -> auto-equipped upon delivery)
    putOnTopOfDeck(st, 'equipment', 'eq-10'); // card #1 (consumable -> hand)
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'DRAW_CARD', deck: 'equipment' }, 2000).ok, true);
    assert.deepEqual(st.players.p1.hand, ['eq-10']);
    assert.equal(ensureExpansionState(st).gloriaQueuedCards.length, 1);

    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-10' }, 2010).ok, true);
    assert.equal(st.players.p1.guardianShieldActive, true);
    assert.ok(st.players.p1.equipped.includes('eq-01'), '2nd queued card eq-01 auto-equipped after eq-10');
    assert.equal(ensureExpansionState(st).gloriaQueuedCards.length, 0);
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 2020).ok, true);
    assertClean(st, '8F3-A2a Gloria eq-10 + eq-01');
  }

  // (b) Gloria draws eq-15 (Concealed Knowledge) + eq-07 (Holy Water) -> delivers eq-07 -> after USE_CARD & END_TURN keeps extra turn!
  {
    const st = makeScenario(['exp2_gloria', 'gac-radio', 'suong-an-danh', 'suong-gac-cong'], { defaultLocation: 'lobby', turnPhase: 'LOCATION_ACTION' });
    st.players.p1.revealed = true;
    setWounds(st.players.p1, 3);
    putOnTopOfDeck(st, 'equipment', 'eq-07'); // card #2 (consumable -> delivered to hand!)
    putOnTopOfDeck(st, 'equipment', 'eq-15'); // card #1
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'DRAW_CARD', deck: 'equipment' }, 2100).ok, true);
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-15' }, 2110).ok, true);
    assert.equal(st.extraTurnPending, true);
    assert.deepEqual(st.players.p1.hand, ['eq-07'], '2nd queued consumable eq-07 delivered to hand after eq-15');
    // END_TURN blocked while eq-07 in hand
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 2115).ok, false);
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-07' }, 2120).ok, true);
    assert.equal(st.players.p1.woundsTaken, 1);
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 2130).ok, true);
    assert.equal(st.activePlayerId, 'p1', 'Concealed Knowledge extra turn triggers cleanly after both Gloria cards');
    assertClean(st, '8F3-A2b Gloria eq-15 + eq-07');
  }

  // (c) Gloria draws eq-07 (Holy Water) + eq-02 (Fortune Brooch) while hidden Usurper intercepts eq-07 -> after Usurper resolves, FINISH_ACTION delivers eq-02 once (no double delivery!)
  {
    const st = makeScenario(['exp2_gloria', 'gac-radio', 'exp2_usurper', 'suong-gac-cong'], { defaultLocation: 'lobby', turnPhase: 'LOCATION_ACTION' });
    st.players.p1.revealed = true;
    setWounds(st.players.p1, 4);
    putOnTopOfDeck(st, 'equipment', 'eq-02'); // card #2
    putOnTopOfDeck(st, 'equipment', 'eq-07'); // card #1
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'DRAW_CARD', deck: 'equipment' }, 2200).ok, true);
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-07' }, 2210).ok, true);
    assert.equal(st.pendingChoice?.kind, 'usurper_reveal_block_heal');
    // While paused on Usurper, queued card #2 MUST NOT be prematurely delivered!
    assert.equal(ensureExpansionState(st).gloriaQueuedCards.length, 1);
    assert.equal(st.players.p1.equipped.includes('eq-02'), false);
    // Usurper reveals & blocks heal -> FINISH_ACTION drains -> delivers eq-02 exactly once!
    assert.equal(
      applyPlayerGameAction(st, 'p3', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'reveal_and_block' }, 2220).ok,
      true,
    );
    assert.equal(st.players.p1.woundsTaken, 4, 'Usurper blocked eq-07 heal');
    assert.equal(st.players.p1.equipped.filter((c) => c === 'eq-02').length, 1, 'Queued eq-02 delivered exactly once after Usurper pause');
    assert.equal(ensureExpansionState(st).gloriaQueuedCards.length, 0);
    assertClean(st, '8F3-A2c Gloria eq-07 paused on Usurper');
  }

  // (d) Gloria draws eq-09 (First Aid) raising wounds to 7 on April & Skipps (opens pendingSteps reveal trigger) + queued eq-03 -> delivers eq-03 cleanly via FINISH_ACTION
  {
    const st = makeScenario(['exp2_gloria', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp2_april_skipps'], { defaultLocation: 'lobby', turnPhase: 'LOCATION_ACTION' });
    st.players.p1.revealed = true;
    putOnTopOfDeck(st, 'equipment', 'eq-03');
    putOnTopOfDeck(st, 'equipment', 'eq-09');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'DRAW_CARD', deck: 'equipment' }, 2300).ok, true);
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-09', targetPlayerId: 'p5' }, 2310).ok, true);
    assert.equal(st.players.p5.woundsTaken, 7);
    assert.equal(st.players.p5.revealed, true);
    assert.ok(st.players.p1.equipped.includes('eq-03'), 'Queued eq-03 delivered after eq-09 April Skipps trigger');
    assert.equal(ensureExpansionState(st).gloriaQueuedCards.length, 0);
    assertClean(st, '8F3-A2d Gloria eq-09 April Skipps');
  }
});

test('8F3-A3 — ev-11 Moody Goblin + Colt counter chain & ev-12 Banana Peel 0-gear self-damage continuation without double-finalization', () => {
  // (a) Moody Goblin steals from revealed Colt -> opens colt_theft_counter; after Colt declines, Bob (actor) with 5th item wins immediately once!
  {
    const st = makeScenario(['lang-anh-san', 'exp2_colt', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong']);
    st.players.p2.revealed = true;
    for (const cid of ['eq-01', 'eq-02', 'eq-03', 'eq-04']) pullCard(st, cid, st.players.p1, 'equipped');
    pullCard(st, 'ev-02', st.players.p2, 'equipped');
    pullCard(st, 'ev-11', st.players.p1, 'hand');

    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-11', targetPlayerId: 'p2', equipCardId: 'ev-02' }, 3000).ok, true);
    assert.equal(st.pendingChoice?.kind, 'colt_theft_counter', 'Colt counter opens BEFORE Bob 5-item victory finalizes');
    assert.equal(st.finished, false, 'Match waits for Colt theft counter resolution before finalizing');
    const skipOpt = st.pendingChoice.options.find((o) => o.optionId !== 'counter') ?? st.pendingChoice.options[st.pendingChoice.options.length - 1];
    assert.equal(applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: skipOpt.optionId }, 3010).ok, true);
    assert.equal(st.finished, true, 'Bob 5th item victory finalizes cleanly after Colt declines');
    assert.ok(st.winnerPlayerIds.includes('p1'));
    const victoryLogs = st.publicLog.filter((l) => l.kind === 'victory');
    assert.equal(victoryLogs.length, 1, 'Zero double-finalization on victory log');
    assertClean(st, '8F3-A3a Moody Goblin + Colt + Bob 5th item');
  }

  // (b) ev-12 Banana Peel with 0 equipment kills actor (1 HP) -> drains FINISH_ACTION -> advances turn / ends match cleanly once!
  {
    const st = makeScenario(['suong-an-danh', 'gac-ky-thuat', 'gac-radio', 'suong-gac-cong']);
    // Eliminate other Shadow p4 so p1 self-death on Banana Peel ends match cleanly!
    st.players.p4.alive = false;
    st.players.p4.hp = 0;
    st.players.p4.woundsTaken = st.players.p4.maxHp;
    st.players.p4.revealed = true;
    ensureExpansionState(st).lifecycleByPlayer = {
      p4: { lifecycleState: 'FINAL_ELIMINATED', resurrectionChargesUsed: 0, reviveHpTarget: 6 },
    };
    setWounds(st.players.p1, st.players.p1.maxHp - 1); // 1 HP, 0 equipment
    pullCard(st, 'ev-12', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-12' }, 3100).ok, true);
    assert.equal(st.players.p1.alive, false);
    assert.equal(st.finished, true);
    assert.equal(st.winnerFaction, 'lantern-guard');
    assert.equal(st.publicLog.filter((l) => l.kind === 'victory').length, 1, 'Zero double-finalization');
    assertClean(st, '8F3-A3b Banana Peel 0-gear lethal');
  }
});

// ============================================================================
// 8F3-B — COPIED SKILL × CARD ELIGIBILITY & REVEAL RESTRICTIONS
// ============================================================================

test('8F3-B1 — BUG-8F-01: eq-14 Chocolate MUST respect Undead pre-lethal reveal restriction & eq-13 Advent MUST respect Fallen <8 HP reveal restriction', () => {
  // (a) Unrevealed Undead (`exp1_undead`, starts with 'U') playing eq-14 Chocolate MUST stay hidden & NOT heal!
  {
    const st = makeScenario(['exp1_undead', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh']);
    setWounds(st.players.p1, 5); // 6 HP remaining, unrevealed, 0 resurrection charges used
    pullCard(st, 'eq-14', st.players.p1, 'hand');
    const res = applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-14', skipEffect: false }, 4000);
    assert.equal(res.ok, true);
    assert.equal(
      st.players.p1.revealed,
      false,
      'BUG-8F-01a: Unrevealed Undead MUST NOT bypass pre-lethal reveal restriction via eq-14 Chocolate!',
    );
    assert.equal(st.players.p1.woundsTaken, 5, 'Unrevealed Undead MUST NOT heal via eq-14 Chocolate');
    assertClean(st, '8F3-B1a Undead pre-lethal eq-14 blocked');

    // Positive counterpart: AFTER Undead enters dormancy & revives (revealed === true, REVIVED), eq-14 Chocolate DOES heal!
    const exp = ensureExpansionState(st);
    st.players.p1.revealed = true;
    st.players.p1.skillUsedOnce = true;
    exp.lifecycleByPlayer = {
      p1: { lifecycleState: 'REVIVED', resurrectionChargesUsed: 1, reviveHpTarget: 6 },
    };
    setWounds(st.players.p1, 5); // 6 HP revived
    pullCard(st, 'eq-14', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-14', skipEffect: false }, 4050).ok, true);
    assert.equal(st.players.p1.woundsTaken, 0, 'Revived Undead (starts with U, already revealed) legitimately heals via eq-14 Chocolate');
    assertClean(st, '8F3-B1a Revived Undead eq-14 allowed');
  }

  // (b) Unrevealed Fallen (`exp1_fallen`, Hunter, 12 HP) at < 8 HP playing eq-13 Advent MUST NOT bypass voluntary reveal guard!
  {
    const st = makeScenario(['exp1_fallen', 'gac-radio', 'suong-an-danh', 'suong-gac-cong']);
    setWounds(st.players.p1, 5); // 7 HP remaining (< 8 HP threshold!)
    pullCard(st, 'eq-13', st.players.p1, 'hand');
    const res = applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-13', skipEffect: false }, 4100);
    assert.equal(res.ok, true);
    assert.equal(
      st.players.p1.revealed,
      false,
      'BUG-8F-01b: Unrevealed Fallen at < 8 HP MUST NOT bypass voluntary reveal restriction via eq-13 Advent!',
    );
    assert.equal(st.players.p1.woundsTaken, 5, 'Unrevealed Fallen at < 8 HP MUST NOT heal via eq-13 Advent');
    assertClean(st, '8F3-B1b Fallen <8HP eq-13 blocked');

    // Positive counterpart 1: Unrevealed Fallen at >= 8 HP (4 wounds -> 8 HP) CAN reveal & heal via eq-13 Advent!
    setWounds(st.players.p1, 4); // 8 HP >= 8 HP
    pullCard(st, 'eq-13', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-13', skipEffect: false }, 4150).ok, true);
    assert.equal(st.players.p1.revealed, true, 'Fallen at >= 8 HP legally reveals via eq-13 Advent');
    assert.equal(st.players.p1.woundsTaken, 0, 'Fallen at >= 8 HP heals to 0 wounds via eq-13 Advent');
    assertClean(st, '8F3-B1b Fallen >=8HP eq-13 allowed');
  }
});

test('8F3-B2 — BUG-8F-02: Vengeful Spirit & Antimony copying Classic Emi (gac-truc-ban) MUST execute Teleport via USE_SKILL', () => {
  for (const copierRole of ['exp1_vengeful_spirit', 'exp1_antimony']) {
    const st = makeScenario(
      [copierRole, 'gac-truc-ban', 'gac-radio', 'suong-an-danh', 'suong-gac-cong'],
      { defaultLocation: 'radio' },
    );
    // Kill Emi (p2) -> copier (p1) copies Emi!
    setWounds(st.players.p2, st.players.p2.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 5000).ok, true);
    if (st.pendingChoice && st.pendingChoice.kind === 'vengeful_spirit_copy_skill') {
      const opt = st.pendingChoice.options.find((o) => o.optionId.startsWith('copy_'));
      assert.equal(applyPlayerGameAction(st, 'p1', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: opt.optionId }, 5010).ok, true);
    }
    assert.equal(getEffectiveSkillRoleId(st, st.players.p1), 'gac-truc-ban');

    // Start copier's turn in ROLL_MOVE -> USE_SKILL MUST teleport to paired location in cluster!
    st.activePlayerId = 'p1';
    st.turnPhase = 'ROLL_MOVE';
    const startLoc = st.players.p1.location;
    const expectedPaired = getPairedLocationInCluster(startLoc, st.clusterPairs);
    const teleRes = applyPlayerGameAction(st, 'p1', { type: 'USE_SKILL' }, 5100);
    assert.equal(
      teleRes.ok,
      true,
      `BUG-8F-02: ${copierRole} copying gac-truc-ban (Emi) MUST execute Teleport USE_SKILL: ${teleRes.error}`,
    );
    assert.equal(st.players.p1.location, expectedPaired, `${copierRole} moved to paired cluster location`);
    assert.equal(st.turnPhase, 'LOCATION_ACTION', 'Turn phase advanced cleanly to LOCATION_ACTION');
    // Negative: calling Emi Teleport outside ROLL_MOVE rejected
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_SKILL' }, 5110).ok, false);
    assertClean(st, `8F3-B2 ${copierRole} copied Emi`);
  }
});

test('8F3-B3 — Copied Skill × Card Eligibility Matrix (Advent, Chocolate, Diabolic Ritual, Spear, Usurper/Dalton heal blockers, Usage limits & Provenance)', () => {
  // (a) Vengeful Spirit (Shadow, 'V') copies Hunter Allie ('A', lang-quan-sat):
  //     - CANNOT trigger eq-13 Advent (effective faction still Shadow!)
  //     - CANNOT trigger eq-14 Chocolate (base role 'V', NOT 'A'!)
  //     - CANNOT gain +2 Spear of Longinus eq-04 (effective faction still Shadow!)
  //     - CAN trigger ev-13 Diabolic Ritual (effective faction still Shadow!)
  //     - Copied Allie once-per-match heal works ONCE, blocked on 2nd use, AND blocked by revealed Usurper!
  {
    const st = makeScenario(['exp1_vengeful_spirit', 'lang-quan-sat', 'gac-ky-thuat', 'gac-radio', 'exp2_usurper'], { defaultLocation: 'radio' });
    setWounds(st.players.p2, st.players.p2.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 6000).ok, true);
    const copyOpt = st.pendingChoice.options.find((o) => o.optionId.startsWith('copy_'));
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: copyOpt.optionId }, 6010).ok, true);

    const bind = getCopiedSkillBinding(st, 'p1');
    assert.equal(bind.effectiveSkillRoleId, 'lang-quan-sat');
    assert.deepEqual(bind.provenanceChain, ['exp1_vengeful_spirit', 'lang-quan-sat']);
    assert.equal(hasEffectiveSkillUsedOnce(st, st.players.p1), false);

    // 1. eq-13 Advent MUST NOT heal Shadow VS
    st.activePlayerId = 'p1';
    st.turnPhase = 'MAIN_ACTION';
    setWounds(st.players.p1, 5);
    pullCard(st, 'eq-13', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-13', skipEffect: false }, 6020).ok, true);
    assert.equal(st.players.p1.woundsTaken, 5, 'VS copying Allie CANNOT heal via Hunter-only eq-13 Advent');

    // 2. eq-14 Chocolate MUST NOT heal VS ('V') even though VS copied Allie ('A')!
    pullCard(st, 'eq-14', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-14', skipEffect: false }, 6030).ok, true);
    assert.equal(st.players.p1.woundsTaken, 5, 'VS (base role V) copying Allie (A) MUST NOT heal via eq-14 Chocolate!');

    // 3. Revealed Usurper blocks copied Allie skill heal AND still consumes copied once-per-match!
    st.players.p5.revealed = true;
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_SKILL' }, 6040).ok, true);
    assert.equal(st.players.p1.woundsTaken, 5, 'Revealed Usurper blocks VS copied Allie skill heal');
    assert.equal(hasEffectiveSkillUsedOnce(st, st.players.p1), true, 'Copied once-per-match usage limit consumed');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_SKILL' }, 6050).ok, false, '2nd use of copied once-per-match rejected');

    // 4. ev-13 Diabolic Ritual (Black card, NOT blocked by Usurper!) DOES heal Shadow VS!
    pullCard(st, 'ev-13', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-13', skipEffect: false }, 6060).ok, true);
    assert.equal(st.players.p1.woundsTaken, 0, 'Shadow VS retains own Shadow eligibility for ev-13 Diabolic Ritual');
    assertClean(st, '8F3-B3a VS copied Allie card eligibility');
  }

  // (b) Antimony (Neutral, 'A') copies Shadow Vampire (`suong-an-danh`):
  //     - CANNOT trigger ev-13 Diabolic Ritual (base faction Neutral!)
  //     - CANNOT trigger eq-13 Advent (base faction Neutral!)
  //     - CAN trigger eq-14 Chocolate (base role Antimony starts with 'A'!)
  {
    const st = makeScenario(['gac-ky-thuat', 'suong-an-danh', 'exp1_antimony', 'gac-radio', 'suong-gac-cong'], { defaultLocation: 'radio' });
    setWounds(st.players.p2, st.players.p2.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 6200).ok, true);
    assert.equal(getEffectiveSkillRoleId(st, st.players.p3), 'suong-an-danh');
    assert.equal(getEffectiveFaction(st, st.players.p3), 'wanderer');

    st.activePlayerId = 'p3';
    st.turnPhase = 'MAIN_ACTION';
    setWounds(st.players.p3, 4);
    pullCard(st, 'ev-13', st.players.p3, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p3', { type: 'USE_CARD', cardId: 'ev-13', skipEffect: false }, 6210).ok, true);
    assert.equal(st.players.p3.woundsTaken, 4, 'Neutral Antimony copying Vampire CANNOT heal via Shadow-only ev-13');

    pullCard(st, 'eq-13', st.players.p3, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p3', { type: 'USE_CARD', cardId: 'eq-13', skipEffect: false }, 6220).ok, true);
    assert.equal(st.players.p3.woundsTaken, 4, 'Neutral Antimony copying Vampire CANNOT heal via Hunter-only eq-13');

    pullCard(st, 'eq-14', st.players.p3, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p3', { type: 'USE_CARD', cardId: 'eq-14', skipEffect: false }, 6230).ok, true);
    assert.equal(st.players.p3.woundsTaken, 0, 'Neutral Antimony (base role A) STILL heals via eq-14 Chocolate');
    assertClean(st, '8F3-B3b Antimony copied Vampire card eligibility');
  }
});

// ============================================================================
// 8F3-C — IMMEDIATE VICTORY THROUGH REAL AUTHORITATIVE ACTION PIPELINE
// ============================================================================

test('8F3-C1 — Action-Driven Immediate Victory: Colt 3rd weapon via real draw/steal/transfer & Bob 5th item via real attack/steal/equip', () => {
  // (a) Colt gets 3rd qualifying weapon via real DRAW_CARD (`canteen` Black deck auto-equip!)
  {
    const st = makeScenario(['exp2_colt', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong'], { defaultLocation: 'canteen', turnPhase: 'LOCATION_ACTION' });
    pullCard(st, 'ev-02', st.players.p1, 'equipped');
    pullCard(st, 'ev-03', st.players.p1, 'equipped');
    putOnTopOfDeck(st, 'event', 'ev-05'); // 3rd qualifying Colt weapon
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'DRAW_CARD', deck: 'event' }, 7000).ok, true);
    assert.equal(st.finished, true, 'Colt wins immediately when drawing 3rd qualifying weapon');
    assert.ok(st.winnerPlayerIds.includes('p1'));
    assertClean(st, '8F3-C1a Colt DRAW_CARD 3rd weapon');
  }

  // (b) Colt gets 3rd qualifying weapon via real court (`USE_LOC_POWER` steal)
  {
    const st = makeScenario(['exp2_colt', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong'], { defaultLocation: 'court', turnPhase: 'LOCATION_ACTION' });
    pullCard(st, 'ev-02', st.players.p1, 'equipped');
    pullCard(st, 'ev-04', st.players.p1, 'equipped');
    pullCard(st, 'ev-03', st.players.p2, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_LOC_POWER', mode: 'steal', targetPlayerId: 'p2', equipCardId: 'ev-03' }, 7050).ok, true);
    assert.equal(st.finished, true, 'Colt wins immediately when stealing 3rd qualifying weapon at court');
    assert.ok(st.winnerPlayerIds.includes('p1'));
    assertClean(st, '8F3-C1b Colt court steal 3rd weapon');
  }

  // (c) Bob (`lang-anh-san`) gets 5th equipment item via real `EQUIP_CARD` & via real 4-6P Bob steal-instead-of-damage `ATTACK`!
  {
    const st = makeScenario(['lang-anh-san', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong'], { defaultLocation: 'radio' });
    for (const cid of ['eq-01', 'eq-02', 'eq-03', 'eq-04']) pullCard(st, cid, st.players.p1, 'equipped');
    pullCard(st, 'eq-05', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'EQUIP_CARD', cardId: 'eq-05' }, 7100).ok, true);
    assert.equal(st.finished, true, 'Bob wins immediately on real EQUIP_CARD reaching 5 items');
    assert.ok(st.winnerPlayerIds.includes('p1'));
    assertClean(st, '8F3-C1c Bob EQUIP_CARD 5th item');
  }
  {
    const st = makeScenario(['lang-anh-san', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong'], { defaultLocation: 'radio' });
    st.players.p1.revealed = true;
    for (const cid of ['ev-01', 'ev-02', 'ev-03', 'eq-02']) pullCard(st, cid, st.players.p1, 'equipped'); // Masamune(1..4)+2 >= 3 >= 2!
    pullCard(st, 'eq-05', st.players.p2, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 7150).ok, true);
    assert.equal(st.players.p1.equipped.length, 5, 'Bob stole 5th equipment via real ATTACK');
    assert.equal(st.finished, true, 'Bob wins immediately via real 4-6P Bob steal-on-attack');
    assert.ok(st.winnerPlayerIds.includes('p1'));
    assertClean(st, '8F3-C1d Bob ATTACK steal 5th item');
  }
});

test('8F3-C2 — Action-Driven Immediate Victory: N.C. Soldier recruitment + 3rd weapon, Bonnie conversion + win, Cain Power Play + elimination, Undead dormancy delay', () => {
  // (a) N.C. Soldier recruits sole other Neutral via real USE_SKILL, then draws 3rd required weapon (`ev-03`) via real DRAW_CARD -> immediate alliance victory!
  {
    const st = makeScenario(
      ['exp2_nc_soldier', 'lang-quan-sat', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong'],
      { defaultLocation: 'canteen' },
    );
    st.players.p1.revealed = true;
    st.players.p2.revealed = true;
    setWounds(st.players.p2, 4); // 4 HP remaining of 8; Masamune (1-4) deals 1..3 -> wounds >= 5, survives if 1..3!
    // Guarantee non-lethal damage (>=1 and <=3) by testing a clean Masamune seed
    pullCard(st, 'ev-06', st.players.p1, 'equipped');
    pullCard(st, 'ev-05', st.players.p1, 'equipped');
    // Put p2 in another cluster (`radio`) so Handgun (`ev-05`) reaches p2!
    st.players.p2.location = 'radio';
    pullCard(st, 'ev-01', st.players.p1, 'equipped');
    // Set p2 maxHp headroom so Masamune 1..4 never kills (2 wounds + 1..4 = 3..6; start at 4 wounds with eq-01 Holy Robe (-1) -> deals 0..3 -> start at 4 wounds, give p2 0 robe and maxHp 8 -> wait, 4+4=8 kills! Give p2 eq-01 Holy Robe so Masamune(1..4)+ev-02(+1)-eq-01(-1) or pick seed where d4 <= 3!)
    for (let s = 1; s <= 50; s++) {
      const probe = makeScenario(
        ['exp2_nc_soldier', 'lang-quan-sat', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong'],
        { defaultLocation: 'canteen', seed: s * 17 },
      );
      probe.players.p1.revealed = true;
      probe.players.p2.revealed = true;
      probe.players.p2.location = 'radio';
      setWounds(probe.players.p2, 4);
      pullCard(probe, 'ev-06', probe.players.p1, 'equipped');
      pullCard(probe, 'ev-05', probe.players.p1, 'equipped');
      pullCard(probe, 'ev-01', probe.players.p1, 'equipped');
      const recRes = applyPlayerGameAction(probe, 'p1', { type: 'USE_SKILL', targetPlayerId: 'p2' }, 7200);
      if (recRes.ok && probe.players.p2.alive && getPlayerAlliance(probe, 'p2')) {
        assert.equal(probe.finished, false, 'Recruited but still missing ev-03');
        // Now on N.C. Soldier's next location draw at canteen, draw ev-03 -> IMMEDIATE ALLIANCE VICTORY!
        probe.activePlayerId = 'p1';
        probe.turnPhase = 'LOCATION_ACTION';
        probe.players.p1.location = 'canteen';
        putOnTopOfDeck(probe, 'event', 'ev-03');
        assert.equal(applyPlayerGameAction(probe, 'p1', { type: 'DRAW_CARD', deck: 'event' }, 7250).ok, true);
        assert.equal(probe.finished, true, 'N.C. Soldier alliance wins immediately upon drawing 3rd weapon via real action');
        assert.deepEqual([...probe.winnerPlayerIds].sort(), ['p1', 'p2']);
        assertClean(probe, '8F3-C2a N.C. Soldier action-driven alliance win');
        break;
      }
      if (s === 50) assert.fail('Could not find non-lethal recruitment seed');
    }
  }

  // (b) Bonnie kills last Shadow via real ev-07 -> converts to Shadow BEFORE Hunter win -> kills last Hunter via real ATTACK -> wins as Shadow!
  {
    const st = makeScenario(['exp2_bonnie', 'suong-an-danh', 'suong-gac-cong', 'gac-ky-thuat', 'gac-radio'], { defaultLocation: 'radio' });
    // Kill 2nd Shadow & 2nd Hunter first so 1 Shadow (p2) and 1 Hunter (p4) remain
    for (const deadId of ['p3', 'p5']) {
      st.players[deadId].alive = false;
      st.players[deadId].hp = 0;
      st.players[deadId].woundsTaken = st.players[deadId].maxHp;
      st.players[deadId].revealed = true;
      ensureExpansionState(st).lifecycleByPlayer = {
        ...(ensureExpansionState(st).lifecycleByPlayer ?? {}),
        [deadId]: { lifecycleState: 'FINAL_ELIMINATED', resurrectionChargesUsed: 0, reviveHpTarget: 6 },
      };
    }
    setWounds(st.players.p2, st.players.p2.maxHp - 2);
    pullCard(st, 'ev-07', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p2' }, 7300).ok, true);
    assert.equal(getEffectiveFaction(st, st.players.p1), 'mist-order', 'Bonnie converted to Shadow through real action');
    assert.equal(st.finished, false, 'Hunter MUST NOT win because Bonnie took last Shadow slot');

    // Now Bonnie kills last living Hunter (p4) via real ATTACK -> Shadow victory including Bonnie!
    setWounds(st.players.p4, st.players.p4.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p4' }, 7350).ok, true);
    assert.equal(st.finished, true);
    assert.equal(st.winnerFaction, 'mist-order');
    assert.ok(st.winnerPlayerIds.includes('p1'), 'Converted Shadow Bonnie wins via real action pipeline');
    assertClean(st, '8F3-C2b Bonnie action-driven conversion + win');
  }

  // (c) Cain activates Power Play via real USE_SKILL, then Hunter eliminates Cain via real ATTACK -> simultaneous multi-faction victory!
  {
    const st = makeScenario(['exp2_cain', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong'], { defaultLocation: 'radio' });
    st.players.p1.revealed = true;
    setWounds(st.players.p1, 6);
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_SKILL' }, 7400).ok, true);
    assert.equal(st.players.p1.woundsTaken, 1, 'Cain healed by 5 living players (6 -> 1)');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 7410).ok, true);
    assert.equal(st.activePlayerId, 'p2');
    st.turnPhase = 'MAIN_ACTION';
    setWounds(st.players.p1, st.players.p1.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p2, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p2', { type: 'ATTACK', targetPlayerId: 'p1' }, 7420).ok, true);
    assert.equal(st.finished, true, 'Cain death after real Power Play triggers immediate dual-faction win');
    assert.equal(st.winnerFaction, 'multi-faction');
    assert.deepEqual(st.winningFactions, ['lantern-guard', 'mist-order']);
    assertClean(st, '8F3-C2c Cain action-driven multi-faction win');
  }

  // (d) Undead delays Hunter win while dormant -> revives on turn advance -> 2nd lethal commits Hunter victory!
  {
    const st = makeScenario(['gac-ky-thuat', 'exp1_undead', 'gac-radio', 'suong-an-danh'], { defaultLocation: 'radio' });
    st.players.p4.alive = false;
    st.players.p4.hp = 0;
    st.players.p4.woundsTaken = st.players.p4.maxHp;
    st.players.p4.revealed = true;
    ensureExpansionState(st).lifecycleByPlayer = {
      p4: { lifecycleState: 'FINAL_ELIMINATED', resurrectionChargesUsed: 0, reviveHpTarget: 6 },
    };
    setWounds(st.players.p2, st.players.p2.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p1, 'equipped');
    // 1st lethal -> Undead dormant (turn auto-advances to p2 -> wait! If p2 is next seat, auto-advance IMMEDIATELY revives p2! Let's put p3 before p2 so we observe dormancy BEFORE revival!)
    const st2 = makeScenario(['gac-ky-thuat', 'gac-radio', 'exp1_undead', 'suong-an-danh'], { defaultLocation: 'radio' });
    st2.players.p4.alive = false;
    st2.players.p4.hp = 0;
    st2.players.p4.woundsTaken = st2.players.p4.maxHp;
    st2.players.p4.revealed = true;
    ensureExpansionState(st2).lifecycleByPlayer = {
      p4: { lifecycleState: 'FINAL_ELIMINATED', resurrectionChargesUsed: 0, reviveHpTarget: 6 },
    };
    setWounds(st2.players.p3, st2.players.p3.maxHp - 1);
    pullCard(st2, 'ev-01', st2.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st2, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 7500).ok, true);
    assert.equal(isPlayerDormantPendingRevive(st2, st2.players.p3), true);
    assert.equal(st2.finished, false, 'Undead dormancy delays Hunter win');
    assert.equal(st2.activePlayerId, 'p2');
    // End p2 turn -> p3 Undead revives at 6 HP!
    st2.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(st2, 'p2', { type: 'END_TURN' }, 7510).ok, true);
    assert.equal(st2.activePlayerId, 'p3');
    assert.equal(getPlayerLifecycleState(st2, st2.players.p3), 'REVIVED');
    assert.equal(st2.players.p3.hp, 6);
    // 2nd lethal on revived Undead -> FINAL_ELIMINATED -> Hunter victory commits immediately!
    st2.activePlayerId = 'p1';
    st2.turnPhase = 'MAIN_ACTION';
    st2.players.p1.attacksThisTurn = 0;
    setWounds(st2.players.p3, st2.players.p3.maxHp - 1);
    assert.equal(applyPlayerGameAction(st2, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 7520).ok, true);
    assert.equal(getPlayerLifecycleState(st2, st2.players.p3), 'FINAL_ELIMINATED');
    assert.equal(st2.finished, true);
    assert.equal(st2.winnerFaction, 'lantern-guard');
    assertClean(st2, '8F3-C2d Undead action-driven dormancy -> revive -> final win');
  }
});
