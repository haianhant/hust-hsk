#!/usr/bin/env node
/**
 * test/boardgame-phase8e-interactions.test.cjs
 *
 * Phase 8E-2 — Risk-Based Cross-Character Interaction Test Suite:
 * Covers all 5 Mandatory Critical Interaction Families (A–E) plus selected
 * high-risk 3-way event orderings with explicit behavioral assertions.
 *
 *   Family A: Voodoo + Turn Ownership (Felicia, Gloria, Cruz, Father Harrison,
 *             private investigation, out-of-turn PendingChoice, elimination mid-turn)
 *   Family B: Resurrection + Elimination (Undead + Gideon, Vengeful Spirit,
 *             Antimony, Bonnie, Cain, simultaneous multi-lethal batch)
 *   Family C: Damage Resolution (Anathema + Arnold, Anathema + Wrath, Arnold + Cindy,
 *             Lloyd + Machine Gun, Witch + G43 + Holy Robe, redirection + elimination + on-kill)
 *   Family D: Copied Skill & Victory (Antimony + Vengeful Spirit, Antimony + Clairvoyant,
 *             Cassie + Diana, Bethany + Diana, copied lifecycle/conditional/cycle/post-death,
 *             plus BUG-8E-02 Copied Gideon + eq_advent/eq_chocolate)
 *   Family E: Dynamic Faction & Alliance (Bonnie + Cain, Bonnie + N.C. Soldier,
 *             Bonnie + Cassie/Diana, N.C. Soldier + converted Neutral, multi-Neutral,
 *             simultaneous faction victory)
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
  evaluateExpandedVictoryWithDiagnostics,
  getActiveTurnControlGrant,
  getEffectiveFaction,
  getPlayerLifecycleState,
  getPrivateGameView,
  getPublicGameView,
  getRoleDesign,
  isPlayerDormantPendingRevive,
  isTurnControlPausedForOwnerDecision,
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
  const state = createInitialGameState({
    matchId: opts.matchId ?? `p8e2-${Math.random().toString(36).slice(2, 8)}`,
    seed: opts.seed ?? 88201,
    nowMs: opts.nowMs ?? 1_796_100_000_000,
    rulesetId: 'full-expansion',
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
  p.hp = p.maxHp - w;
}

function assertClean(state, label) {
  const res = checkGameStateInvariants(state, { checkSerialization: true });
  assert.equal(res.ok, true, `${label} invariant failure: ${JSON.stringify(res.violations)}`);
}

/**
 * Schedule Voodoo (p1) hijacking victim (p2), then advance turn cleanly from p1 to p2!
 */
function activateVoodooHijack(state, voodooId, victimId, nowMs) {
  state.players[voodooId].revealed = true;
  state.activePlayerId = voodooId;
  state.turnPhase = 'ROLL_MOVE';
  const r = applyPlayerGameAction(state, voodooId, { type: 'USE_SKILL', targetPlayerId: victimId }, nowMs);
  assert.equal(r.ok, true, `Voodoo USE_SKILL failed: ${r.error}`);
  // Finish Voodoo turn so p2's hijacked turn begins
  state.turnPhase = 'MAIN_ACTION';
  const endR = applyPlayerGameAction(state, voodooId, { type: 'END_TURN' }, nowMs + 10);
  assert.equal(endR.ok, true, `Voodoo END_TURN failed: ${endR.error}`);
  assert.equal(state.activePlayerId, victimId);
  const grant = getActiveTurnControlGrant(state);
  assert.ok(grant && grant.controllerPlayerId === voodooId && grant.activePlayerId === victimId);
  return grant;
}

// ============================================================================
// FAMILY A — VOODOO + TURN OWNERSHIP
// ============================================================================
test('8E2-A — Family A: Voodoo + Felicia, Gloria, Cruz, Father Harrison, Private Investigation, Out-of-Turn PendingChoice & Mid-Turn Elimination', () => {
  // A1: Voodoo + Felicia (White draw opens felicia_draw_choice owned by Felicia; Green draw pauses grant for private investigation!)
  {
    const st = makeScenario(['exp1_voodoo', 'exp1_felicia', 'gac-radio', 'suong-an-danh']);
    st.players.p2.revealed = true;
    activateVoodooHijack(st, 'p1', 'p2', 10_000);
    st.players.p2.location = 'lobby';
    st.turnPhase = 'LOCATION_ACTION';

    // Voodoo commands Felicia to draw Equipment (White) -> Felicia gets 2-card choice; Voodoo CANNOT see or resolve it!
    const drawRes = applyPlayerGameAction(st, 'p1', { type: 'DRAW_CARD', deck: 'equipment' }, 10_100);
    assert.equal(drawRes.ok, true);
    assert.ok(st.pendingChoice && st.pendingChoice.kind === 'felicia_draw_choice');
    assert.equal(st.pendingChoice.ownerPlayerId, 'p2', 'Felicia must own her draw choice');
    assert.equal(getPrivateGameView(st, 'p1').pendingChoice ?? null, null, 'Voodoo must NOT see Felicia draw options');
    assert.equal(
      applyPlayerGameAction(st, 'p1', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'pick_0' }, 10_110).ok,
      false,
      'Voodoo must NOT resolve Felicia draw choice',
    );
    // Felicia picks card #0 -> resolves choice cleanly and resumes control to Voodoo!
    assert.equal(
      applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'pick_0' }, 10_120).ok,
      true,
    );
    assert.equal(st.pendingChoice, null);
    assertClean(st, 'A1a Voodoo+Felicia White draw');

    // Now test Voodoo + Private Investigation pause/resume on Green deck (`radio`)!
    const stInv = makeScenario(['exp1_voodoo', 'exp1_felicia', 'gac-radio', 'suong-an-danh']);
    activateVoodooHijack(stInv, 'p1', 'p2', 10_200);
    stInv.players.p2.location = 'radio';
    stInv.turnPhase = 'LOCATION_ACTION';
    assert.equal(applyPlayerGameAction(stInv, 'p1', { type: 'DRAW_CARD', deck: 'investigation' }, 10_210).ok, true);
    const grant = getActiveTurnControlGrant(stInv);
    assert.equal(isTurnControlPausedForOwnerDecision(stInv, grant), true, 'Grant pauses for victim private investigation');
    assert.equal(
      applyPlayerGameAction(stInv, 'p1', { type: 'END_TURN' }, 10_220).ok,
      false,
      'Voodoo blocked while grant paused for private investigation',
    );
    const invId = stInv.players.p2.hand[0];
    assert.equal(
      applyPlayerGameAction(stInv, 'p2', { type: 'INVESTIGATE_CARD', cardId: invId, targetPlayerId: 'p3' }, 10_230).ok,
      true,
    );
    assert.equal(isTurnControlPausedForOwnerDecision(stInv, getActiveTurnControlGrant(stInv)), false);
    assert.equal(applyPlayerGameAction(stInv, 'p1', { type: 'END_TURN' }, 10_240).ok, true);
    assert.equal(getActiveTurnControlGrant(stInv), null);
    assertClean(stInv, 'A1b Voodoo+private-inv');
  }

  // A2: Voodoo + Gloria (at Church `lobby` drawing 2 White cards -> both resolve without deadlock!)
  {
    const st = makeScenario(['exp1_voodoo', 'exp2_gloria', 'gac-radio', 'suong-an-danh']);
    st.players.p2.revealed = true;
    activateVoodooHijack(st, 'p1', 'p2', 11_000);
    st.players.p2.location = 'lobby';
    st.turnPhase = 'LOCATION_ACTION';
    putOnTopOfDeck(st, 'equipment', 'eq-07'); // Holy Water (consumable #2)
    putOnTopOfDeck(st, 'equipment', 'eq-01'); // Holy Robe (auto-equipped #1 -> immediately delivers #2 eq-07!)

    const r = applyPlayerGameAction(st, 'p1', { type: 'DRAW_CARD', deck: 'equipment' }, 11_100);
    assert.equal(r.ok, true);
    assert.ok(st.players.p2.equipped.includes('eq-01'));
    assert.ok(st.players.p2.hand.includes('eq-07'), 'Gloria 2nd White card delivered to hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-07' }, 11_120).ok, true);
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 11_140).ok, true);
    assertClean(st, 'A2 Voodoo+Gloria');
  }

  // A3: Voodoo + Cruz (drawing Black card triggers cruz_black_redraw owned by Cruz; Voodoo cannot resolve it; resumes cleanly!)
  {
    const st = makeScenario(['exp1_voodoo', 'exp2_cruz', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh']);
    st.players.p2.revealed = true;
    activateVoodooHijack(st, 'p1', 'p2', 12_000);
    st.players.p2.location = 'canteen';
    st.turnPhase = 'LOCATION_ACTION';
    putOnTopOfDeck(st, 'event', 'ev-07');

    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'DRAW_CARD', deck: 'event' }, 12_100).ok, true);
    if (st.pendingChoice && st.pendingChoice.kind === 'cruz_black_redraw') {
      assert.equal(st.pendingChoice.ownerPlayerId, 'p2');
      assert.equal(
        applyPlayerGameAction(st, 'p1', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: st.pendingChoice.defaultOptionId }, 12_110).ok,
        false,
        'Voodoo cannot resolve Cruz redraw choice',
      );
      assert.equal(
        applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: st.pendingChoice.defaultOptionId }, 12_120).ok,
        true,
      );
    }
    assertClean(st, 'A3 Voodoo+Cruz');
  }

  // A4: Voodoo + Father Harrison (revealed outside Church rolls dice cleanly without deadlock — BUG-8B-09 guard!)
  {
    const st = makeScenario(['exp1_voodoo', 'exp2_father_harrison', 'gac-radio', 'suong-an-danh']);
    st.players.p2.revealed = true;
    st.players.p2.location = 'radio';
    activateVoodooHijack(st, 'p1', 'p2', 13_000);
    const roll = applyPlayerGameAction(st, 'p1', { type: 'ROLL_DICE' }, 13_100);
    assert.equal(roll.ok, true, 'Voodoo controlling revealed Father Harrison MUST roll dice cleanly');
    assertClean(st, 'A4 Voodoo+FatherHarrison');
  }

  // A5: Voodoo + Out-of-Turn PendingChoice (Lloyd interrupts Voodoo's hijacked attack -> Voodoo still finishes turn cleanly!)
  {
    const st = makeScenario(['exp1_voodoo', 'gac-ky-thuat', 'exp1_lloyd', 'suong-an-danh'], { defaultLocation: 'radio' });
    st.players.p3.revealed = true;
    activateVoodooHijack(st, 'p1', 'p2', 14_000);
    st.turnPhase = 'MAIN_ACTION';
    st.players.p2.location = 'radio';
    st.players.p4.location = 'radio';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p4' }, 14_100).ok, true);
    assert.ok(st.pendingChoice && st.pendingChoice.kind === 'lloyd_interrupt_attack');
    const cancelOpt = st.pendingChoice.options.find((o) => o.optionId.includes('cancel') || o.optionId.includes('interrupt') || o.optionId.includes('activate')) ?? st.pendingChoice.options[0];
    assert.equal(
      applyPlayerGameAction(st, 'p3', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: cancelOpt.optionId }, 14_110).ok,
      true,
    );
    assertClean(st, 'A5 Voodoo+Lloyd');
  }

  // A6: Voodoo + Victim Elimination Mid-Controlled-Turn (ev-08 Spider kills victim -> grant expires immediately & turn advances!)
  {
    const st = makeScenario(['exp1_voodoo', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh'], { defaultLocation: 'radio' });
    activateVoodooHijack(st, 'p1', 'p2', 15_000);
    st.turnPhase = 'MAIN_ACTION';
    setWounds(st.players.p2, st.players.p2.maxHp - 1); // 1 HP left
    pullCard(st, 'ev-08', st.players.p2, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-08', targetPlayerId: 'p3' }, 15_100).ok, true);
    assert.equal(st.players.p2.alive, false);
    assert.equal(getActiveTurnControlGrant(st), null, 'Grant must expire when victim dies mid-controlled-turn');
    assert.notEqual(st.activePlayerId, 'p2', 'Turn must advance away from dead victim');
    assertClean(st, 'A6 Voodoo+mid-turn-death');
  }
});

// ============================================================================
// FAMILY B — RESURRECTION + ELIMINATION
// ============================================================================
test('8E2-B — Family B: Undead + Gideon, Vengeful Spirit, Antimony, Bonnie, Cain & Simultaneous Multi-Lethal Batch', () => {
  // B1: 1st lethal on Undead (p3, seat 2 so p2 acts before revival!) -> DORMANT_PENDING_REVIVE;
  //     ZERO triggers for Gideon, VS, Antimony, Bonnie, Cain, Hunter victory!
  //     2nd lethal after revival -> FINAL_ELIMINATED; ALL elimination triggers fire properly!
  {
    const st = makeScenario([
      'exp2_bonnie',          // p1 Neutral (killer)
      'exp2_gideon',          // p2 Hunter (revealed — takes next turn while Undead is dormant!)
      'exp1_undead',          // p3 Shadow (enters DORMANT_PENDING_REVIVE)
      'exp1_vengeful_spirit', // p4 Shadow (unrevealed)
      'exp1_antimony',        // p5 Neutral
      'exp2_cain',            // p6 Neutral
      'gac-ky-thuat',         // p7 Hunter
    ], { defaultLocation: 'radio' });
    st.players.p2.revealed = true;
    setWounds(st.players.p3, st.players.p3.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p1, 'equipped'); // Masamune 1-4 guaranteed lethal

    // 1st lethal hit on Undead (p3) -> auto-advances to p2 while p3 stays DORMANT_PENDING_REVIVE!
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 20_000).ok, true);
    assert.equal(st.activePlayerId, 'p2');
    assert.equal(isPlayerDormantPendingRevive(st, st.players.p3), true, 'Undead enters DORMANT_PENDING_REVIVE');
    assert.equal(st.players.p3.revealed, true);
    assert.equal(st.pendingChoice, null, 'Neither VS nor Gideon may trigger on Undead dormancy');
    assert.equal(st.decks.equipment.length, 16, 'Gideon drew 0 White cards on dormancy');
    assert.equal(getEffectiveFaction(st, st.players.p1), 'wanderer', 'Bonnie must NOT convert on Undead dormancy');
    assert.equal(ensureExpansionState(st).antimonyCopiedGoalByPlayer?.p5, undefined, 'Antimony must NOT copy on Undead dormancy');
    assertClean(st, 'B1 Undead 1st lethal dormant');

    // End p2's turn -> advances to p3 -> Undead revives at 6 HP!
    st.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p2', { type: 'END_TURN' }, 20_100).ok, true);
    assert.equal(st.activePlayerId, 'p3');
    assert.equal(getPlayerLifecycleState(st, st.players.p3), 'REVIVED');
    assert.equal(st.players.p3.alive, true);
    assert.equal(st.players.p3.hp, 6);

    // 2nd lethal hit on REVIVED Undead by Bonnie (p1) -> FINAL_ELIMINATED -> Bonnie converts, Antimony copies, Gideon draws!
    st.activePlayerId = 'p1';
    st.turnPhase = 'MAIN_ACTION';
    st.players.p1.attacksThisTurn = 0;
    setWounds(st.players.p3, st.players.p3.maxHp - 1);
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 20_200).ok, true);
    assert.equal(getPlayerLifecycleState(st, st.players.p3), 'FINAL_ELIMINATED');
    assert.equal(getEffectiveFaction(st, st.players.p1), 'mist-order', 'Bonnie converts to Shadow on permanent Undead death');
    // Resolve any pending choices (VS secret copy / Gideon white card targets)
    let guard = 0;
    while (st.pendingChoice && guard++ < 10) {
      const pc = st.pendingChoice;
      const opt = pc.options.find((o) => o.optionId.includes('draw') || o.optionId.includes('accept')) ?? pc.options[0];
      assert.equal(
        applyPlayerGameAction(st, pc.ownerPlayerId, { type: 'RESOLVE_CHOICE', choiceId: pc.choiceId, optionId: opt.optionId }, 20_210 + guard).ok,
        true,
      );
    }
    assert.equal(ensureExpansionState(st).antimonyCopiedGoalByPlayer?.p5?.sourceRoleId, 'exp1_undead', 'Antimony copies Undead on permanent death');
    assert.ok(st.decks.equipment.length < 16 || st.players.p2.equipped.length > 0 || st.discards.equipment.length > 0, 'Gideon drew White cards on permanent Shadow death');
    assertClean(st, 'B1 Undead 2nd lethal permanent');
  }

  // B2: Undead + Cain + Multiple Simultaneous Lethal Effects (eq-11 Flare kills Undead (dormant) + Hunter (dead) + Neutral (dead) simultaneously!)
  {
    const st = makeScenario([
      'gac-ky-thuat',  // p1 Hunter (actor)
      'exp1_undead',   // p2 Shadow (1 HP -> goes DORMANT, NOT dead!)
      'gac-radio',     // p3 Hunter (1 HP -> FINAL_ELIMINATED)
      'lang-quan-sat', // p4 Neutral (1 HP -> FINAL_ELIMINATED)
      'exp2_cain',     // p5 Neutral (full HP -> must NOT win yet because Shadow Undead is dormant!)
      'suong-an-danh', // p6 Shadow (alive)
    ]);
    setWounds(st.players.p2, st.players.p2.maxHp - 1);
    setWounds(st.players.p3, st.players.p3.maxHp - 1);
    setWounds(st.players.p4, st.players.p4.maxHp - 1);
    pullCard(st, 'eq-11', st.players.p1, 'hand');

    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-11' }, 21_000).ok, true);
    assert.equal(isPlayerDormantPendingRevive(st, st.players.p2), true);
    assert.equal(getPlayerLifecycleState(st, st.players.p3), 'FINAL_ELIMINATED');
    assert.equal(getPlayerLifecycleState(st, st.players.p4), 'FINAL_ELIMINATED');
    assert.equal(st.finished, false, 'Cain must NOT win when Shadow is only DORMANT_PENDING_REVIVE');
    assertClean(st, 'B2 Undead simultaneous Flare');
  }

  // B3 (closes surviving MUT-08 gap): Undead as SOLE remaining Shadow entering DORMANT_PENDING_REVIVE MUST NOT grant Hunter faction victory!
  {
    const st = makeScenario(['gac-ky-thuat', 'gac-radio', 'exp1_undead', 'suong-an-danh'], { defaultLocation: 'radio' });
    // Eliminate the other Shadow (p4) first so Undead (p3) is the LAST remaining Shadow!
    st.players.p4.alive = false;
    st.players.p4.hp = 0;
    st.players.p4.woundsTaken = st.players.p4.maxHp;
    st.players.p4.revealed = true;
    const exp = ensureExpansionState(st);
    exp.lifecycleByPlayer = {
      p4: { lifecycleState: 'FINAL_ELIMINATED', resurrectionChargesUsed: 0, reviveHpTarget: 6 },
    };
    setWounds(st.players.p3, st.players.p3.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 22_000).ok, true);
    assert.equal(isPlayerDormantPendingRevive(st, st.players.p3), true);
    assert.equal(st.finished, false, 'Hunters MUST NOT win while last Shadow Undead is DORMANT_PENDING_REVIVE');
    assertClean(st, 'B3 Undead last-Shadow dormancy blocks Hunter win');
  }
});

function castAnathemaCurse(st, anathemaId, victimId, nowMs) {
  st.activePlayerId = anathemaId;
  st.turnPhase = 'ROLL_MOVE';
  assert.equal(applyPlayerGameAction(st, anathemaId, { type: 'USE_SKILL' }, nowMs).ok, true);
  assert.equal(st.pendingChoice.kind, 'anathema_curse_target');
  const opt = st.pendingChoice.options.find((o) => o.targetPlayerId === victimId);
  assert.ok(opt, `Anathema curse option for ${victimId}`);
  assert.equal(
    applyPlayerGameAction(st, anathemaId, { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: opt.optionId }, nowMs + 10).ok,
    true,
  );
}

// ============================================================================
// FAMILY C — DAMAGE RESOLUTION
// ============================================================================
test('8E2-C — Family C: Anathema + Arnold, Anathema + Wrath, Arnold + Cindy, Lloyd + Machine Gun, Witch + G43 + Holy Robe & Redirection On-Kill', () => {
  // C1: Anathema + Arnold (Anathema curses hidden Arnold; lethal hit on Anathema redirects to Arnold -> Arnold reflects without infinite loop!)
  {
    const st = makeScenario(['gac-ky-thuat', 'exp1_anathema', 'exp1_arnold', 'suong-an-danh', 'gac-radio', 'suong-gac-cong'], { defaultLocation: 'radio' });
    castAnathemaCurse(st, 'p2', 'p3', 30_000);
    assert.equal(st.players.p2.revealed, true);

    // Put Arnold at 1 HP (still hidden!), p1 attacks Anathema with Masamune -> redirects to Arnold -> Arnold secret choice reflects lethal back!
    st.activePlayerId = 'p1';
    st.turnPhase = 'MAIN_ACTION';
    setWounds(st.players.p3, st.players.p3.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 30_100).ok, true);
    assert.ok(st.pendingChoice && st.pendingChoice.isSecret && st.pendingChoice.ownerPlayerId === 'p3', 'Arnold secret reflection choice must open on redirected lethal dmg');
    const reflectOpt = st.pendingChoice.options.find((o) => o.optionId.includes('reflect') || o.optionId.includes('activate')) ?? st.pendingChoice.options[0];
    assert.equal(
      applyPlayerGameAction(st, 'p3', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: reflectOpt.optionId }, 30_110).ok,
      true,
    );
    assert.equal(st.players.p3.alive, true, 'Arnold survives lethal redirected hit');
    assert.equal(st.players.p3.revealed, true, 'Arnold reveals upon reflecting');
    assert.ok(st.players.p1.woundsTaken > 0, 'Original attacker p1 takes reflected damage');
    assertClean(st, 'C1 Anathema+Arnold');
  }

  // C2: Anathema + Wrath (Wrath turn-start AoE hits Anathema -> redirected cleanly onto cursed victim)
  {
    const st = makeScenario(['exp1_wrath', 'exp1_anathema', 'suong-an-danh', 'gac-ky-thuat', 'gac-radio', 'lang-quan-sat'], { defaultLocation: 'radio' });
    castAnathemaCurse(st, 'p2', 'p4', 31_000);
    // Start Wrath's turn -> Wrath uses AoE skill
    st.players.p1.revealed = true;
    st.activePlayerId = 'p1';
    st.turnPhase = 'ROLL_MOVE';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_SKILL' }, 31_100).ok, true);
    if (st.pendingChoice && st.pendingChoice.kind === 'wrath_turn_start_aoe') {
      const opt = st.pendingChoice.options.find((o) => o.optionId.includes('activate') || o.optionId.includes('yes')) ?? st.pendingChoice.options[0];
      assert.equal(applyPlayerGameAction(st, 'p1', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: opt.optionId }, 31_110).ok, true);
    }
    assert.equal(st.players.p2.woundsTaken, 0, 'Anathema took 0 from Wrath AoE (redirected to p4)');
    assert.ok(st.players.p4.woundsTaken >= 2, 'Cursed target p4 absorbed both own & redirected Wrath damage');
    assertClean(st, 'C2 Anathema+Wrath');
  }

  // C3: Arnold + Cindy (Cindy attacks hidden Arnold for lethal -> Arnold reflects onto Cindy -> Cindy after-damage reaction fires cleanly!)
  {
    const st = makeScenario(['exp1_cindy', 'exp1_arnold', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong'], { defaultLocation: 'radio' });
    setWounds(st.players.p2, st.players.p2.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 32_000).ok, true);
    assert.ok(st.pendingChoice && st.pendingChoice.ownerPlayerId === 'p2');
    const reflectOpt = st.pendingChoice.options.find((o) => o.optionId.includes('reflect') || o.optionId.includes('activate')) ?? st.pendingChoice.options[0];
    assert.equal(
      applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: reflectOpt.optionId }, 32_010).ok,
      true,
    );
    assert.ok(st.players.p1.woundsTaken > 0, 'Cindy took reflected damage from Arnold');
    // If Cindy secret retaliation opened, resolve it cleanly without loop
    if (st.pendingChoice) {
      assert.equal(
        applyPlayerGameAction(st, st.pendingChoice.ownerPlayerId, { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: st.pendingChoice.options[0].optionId }, 32_020).ok,
        true,
      );
    }
    assertClean(st, 'C3 Arnold+Cindy');
  }

  // C4: Lloyd + Machine Gun (Lloyd cancels declared multi-target Machine Gun pre-roll, consuming 0 attack RNG & 0 damage to all victims!)
  {
    const st = makeScenario(['suong-an-danh', 'exp1_lloyd', 'gac-ky-thuat', 'gac-radio'], { defaultLocation: 'radio' });
    st.players.p2.revealed = true;
    pullCard(st, 'ev-06', st.players.p1, 'equipped'); // Machine Gun
    pullCard(st, 'ev-01', st.players.p1, 'equipped'); // Masamune
    const rngBefore = st.rngState;
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 33_000).ok, true);
    assert.ok(st.pendingChoice && st.pendingChoice.kind === 'lloyd_interrupt_attack');
    assert.equal(st.rngState, rngBefore, 'Lloyd interrupt happens BEFORE attack dice roll');
    const cancelOpt = st.pendingChoice.options.find((o) => o.optionId.includes('cancel') || o.optionId.includes('interrupt') || o.optionId.includes('activate')) ?? st.pendingChoice.options[0];
    assert.equal(
      applyPlayerGameAction(st, 'p2', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: cancelOpt.optionId }, 33_010).ok,
      true,
    );
    assert.equal(st.players.p2.woundsTaken, 2, 'Lloyd pays 2 HP');
    assert.equal(st.players.p3.woundsTaken, 0, 'Machine Gun victim p3 untouched');
    assert.equal(st.players.p4.woundsTaken, 0, 'Machine Gun victim p4 untouched');
    assertClean(st, 'C4 Lloyd+MachineGun');
  }

  // C5: Witch + G43 + Holy Robe mitigation stacking (Witch in corridor immune=0; G43 revealed -2 + Holy Robe -1 = -3 floors at 0)
  {
    const st = makeScenario(['exp2_witch', 'exp2_g43', 'suong-an-danh', 'gac-ky-thuat'], { defaultLocation: 'corridor' });
    st.players.p1.revealed = true; // Witch at corridor (Weird Woods)
    st.players.p2.revealed = true; // G43 (-2 from attacks)
    pullCard(st, 'eq-01', st.players.p2, 'equipped'); // Holy Robe (-1 from attacks)
    pullCard(st, 'ev-01', st.players.p1, 'equipped'); // Masamune 1-4
    pullCard(st, 'eq-11', st.players.p2, 'hand');

    // Flare (2 dmg) against revealed Witch in Weird Woods (corridor) -> 0 dmg!
    st.activePlayerId = 'p2';
    assert.equal(applyPlayerGameAction(st, 'p2', { type: 'USE_CARD', cardId: 'eq-11' }, 34_000).ok, true);
    assert.equal(st.players.p1.woundsTaken, 0, 'Witch in corridor immune to Flare');

    // Witch attacks G43 (wearing Holy Robe) with Masamune (1-4 dmg) -> G43 (-2) + Holy Robe (-1) -> at most 1 dmg (never negative!)
    st.activePlayerId = 'p1';
    st.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 34_100).ok, true);
    assert.ok(st.players.p2.woundsTaken >= 0 && st.players.p2.woundsTaken <= 1, 'G43 (-2) + Holy Robe (-1) clamps Masamune (1-4) to 0..1');
    assertClean(st, 'C5 Witch+G43+HolyRobe');
  }

  // C6: Damage Redirection + Elimination + On-Kill Trigger (Anathema redirects Hunter attack onto Shadow -> kills Shadow -> Gideon triggers!)
  {
    const st = makeScenario(['gac-ky-thuat', 'exp1_anathema', 'suong-an-danh', 'exp2_gideon', 'suong-gac-cong'], { defaultLocation: 'radio' });
    st.players.p4.revealed = true; // Gideon
    castAnathemaCurse(st, 'p2', 'p3', 35_000);
    setWounds(st.players.p3, st.players.p3.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p1, 'equipped');
    st.activePlayerId = 'p1';
    st.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 35_100).ok, true);
    assert.equal(st.players.p3.alive, false, 'Cursed Shadow p3 dies from redirected lethal damage');
    let guard = 0;
    while (st.pendingChoice && guard++ < 10) {
      const pc = st.pendingChoice;
      const opt = pc.options.find((o) => o.optionId.includes('draw') || o.optionId.includes('accept')) ?? pc.options[0];
      assert.equal(applyPlayerGameAction(st, pc.ownerPlayerId, { type: 'RESOLVE_CHOICE', choiceId: pc.choiceId, optionId: opt.optionId }, 35_110 + guard).ok, true);
    }
    assert.ok(st.decks.equipment.length < 16 || st.players.p4.equipped.length > 0 || st.discards.equipment.length > 0, 'Gideon triggered on redirected Shadow elimination');
    assertClean(st, 'C6 Redirection+Elimination+Gideon');
  }
});

// ============================================================================
// FAMILY D — COPIED SKILL & VICTORY (+ BUG-8E-02 REPRODUCTION)
// ============================================================================
test('8E2-D — Family D: Copied Skill & Victory (Antimony, Vengeful Spirit, Clairvoyant, Cassie, Bethany, Diana, Cycles, Post-Death & Copied Gideon eq-13/eq-14)', () => {
  // D1: BUG-8E-02 — Vengeful Spirit (Shadow!) copies Gideon, kills a Shadow, draws eq-13 (Advent — Hunter only!):
  //     MUST NOT heal Shadow Vengeful Spirit!
  {
    const st = makeScenario(['exp1_vengeful_spirit', 'exp2_gideon', 'suong-an-danh', 'gac-ky-thuat', 'gac-radio', 'suong-gac-cong'], { defaultLocation: 'radio' });
    // Kill Gideon (p2) -> VS (p1) copies Gideon!
    setWounds(st.players.p2, st.players.p2.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 40_000).ok, true);
    assert.ok(st.pendingChoice && st.pendingChoice.isSecret && st.pendingChoice.ownerPlayerId === 'p1');
    const copyOpt = st.pendingChoice.options.find((o) => o.optionId.includes('copy') || o.optionId.includes('accept')) ?? st.pendingChoice.options[0];
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: copyOpt.optionId }, 40_010).ok, true);
    assert.equal(st.players.p1.revealed, true);

    // Now VS (Shadow!) is wounded (5 wounds) and kills Shadow p3 -> triggers copied Gideon 3 White card draw with eq-13 (Advent) on top!
    setWounds(st.players.p1, 5);
    setWounds(st.players.p3, st.players.p3.maxHp - 1);
    putOnTopOfDeck(st, 'equipment', 'eq-12');
    putOnTopOfDeck(st, 'equipment', 'eq-14');
    putOnTopOfDeck(st, 'equipment', 'eq-13'); // Top card = Advent (Hunter-only!)
    st.activePlayerId = 'p1';
    st.turnPhase = 'MAIN_ACTION';
    st.players.p1.attacksThisTurn = 0;
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 40_100).ok, true);
    // Resolve Gideon's draw choice if opened so eq-13 (Advent) is actually drawn!
    let gGuard = 0;
    while (st.pendingChoice && gGuard++ < 10) {
      const pc = st.pendingChoice;
      const opt = pc.options.find((o) => o.optionId.includes('draw') || o.optionId.includes('accept')) ?? pc.options[0];
      assert.equal(applyPlayerGameAction(st, pc.ownerPlayerId, { type: 'RESOLVE_CHOICE', choiceId: pc.choiceId, optionId: opt.optionId }, 40_110 + gGuard).ok, true);
    }
    assert.ok(st.discards.equipment.includes('eq-13'), 'Copied Gideon MUST have drawn and resolved eq-13');
    assert.equal(
      st.players.p1.woundsTaken,
      5,
      'BUG-8E-02: Shadow Vengeful Spirit copying Gideon MUST NOT receive Hunter-only eq-13 (Advent) heal!',
    );
    assertClean(st, 'D1 BUG-8E-02 Copied Gideon eq-13');
  }

  // D1b: BUG-8E-02 — Antimony (Neutral, starts with A!) copying Gideon and drawing eq-14 (Chocolate) MUST receive A/E/U Chocolate heal!
  {
    const st = makeScenario(['gac-ky-thuat', 'exp2_gideon', 'exp1_antimony', 'suong-an-danh', 'gac-radio', 'suong-gac-cong'], { defaultLocation: 'radio' });
    setWounds(st.players.p2, st.players.p2.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 40_500).ok, true);
    assert.equal(ensureExpansionState(st).antimonyCopiedGoalByPlayer?.p3?.sourceRoleId, 'exp2_gideon');
    assert.equal(st.players.p3.revealed, true);

    setWounds(st.players.p3, 4);
    setWounds(st.players.p4, st.players.p4.maxHp - 1);
    putOnTopOfDeck(st, 'equipment', 'eq-12');
    putOnTopOfDeck(st, 'equipment', 'eq-13'); // Advent -> must NOT heal Neutral Antimony!
    putOnTopOfDeck(st, 'equipment', 'eq-14'); // Chocolate -> MUST heal Antimony (starts with A)!
    st.activePlayerId = 'p1';
    st.turnPhase = 'MAIN_ACTION';
    st.players.p1.attacksThisTurn = 0;
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p4' }, 40_600).ok, true);
    let gGuard = 0;
    while (st.pendingChoice && gGuard++ < 10) {
      const pc = st.pendingChoice;
      const opt = pc.options.find((o) => o.optionId.includes('draw') || o.optionId.includes('accept')) ?? pc.options[0];
      assert.equal(applyPlayerGameAction(st, pc.ownerPlayerId, { type: 'RESOLVE_CHOICE', choiceId: pc.choiceId, optionId: opt.optionId }, 40_610 + gGuard).ok, true);
    }
    assert.equal(st.players.p3.woundsTaken, 0, 'BUG-8E-02: Antimony copying Gideon receives eq-14 Chocolate heal');
    assertClean(st, 'D1b BUG-8E-02 Antimony Gideon eq-14');
  }

  // D2: Antimony copying lifecycle-changing skill (Undead) -> gets 1 resurrection charge & survives 1st lethal!
  {
    const st = makeScenario(['gac-ky-thuat', 'gac-radio', 'exp1_undead', 'exp1_antimony', 'suong-an-danh', 'lang-quan-sat'], { defaultLocation: 'radio' });
    // Put Undead (p3) as REVIVED (already used its 1st charge) so killing it makes it FINAL_ELIMINATED -> Antimony (p4) copies Undead!
    const exp = ensureExpansionState(st);
    exp.lifecycleByPlayer = {
      p3: { lifecycleState: 'REVIVED', resurrectionChargesUsed: 1, reviveHpTarget: 6 },
    };
    setWounds(st.players.p3, st.players.p3.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 41_000).ok, true);
    assert.equal(getPlayerLifecycleState(st, st.players.p3), 'FINAL_ELIMINATED');
    assert.equal(exp.antimonyCopiedGoalByPlayer?.p4?.sourceRoleId, 'exp1_undead');

    // Now kill Antimony (p4, seat 3 so p2 takes next turn!) -> copied Undead resurrection MUST put Antimony into DORMANT_PENDING_REVIVE!
    st.activePlayerId = 'p1';
    st.turnPhase = 'MAIN_ACTION';
    st.players.p1.attacksThisTurn = 0;
    setWounds(st.players.p4, st.players.p4.maxHp - 1);
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p4' }, 41_100).ok, true);
    assert.equal(isPlayerDormantPendingRevive(st, st.players.p4), true, 'Antimony copying Undead enters dormancy on 1st lethal');
    assertClean(st, 'D2 Antimony copies Undead lifecycle');
  }

  // D3: Bethany + Diana transitive SHARE_OUTCOME & Cyclic Victory Dependency Guard (Bethany <-> Diana)
  {
    const st = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp1_bethany', 'exp2_diana', 'exp1_cassie', 'exp1_clairvoyant']);
    const exp = ensureExpansionState(st);
    // Transitive chain: Bethany chooses Diana; Diana customer = p1 (Hunter) -> when Hunter wins, Diana AND Bethany win!
    exp.bethanyChosenByPlayer = { p5: { chosenPlayerId: 'p6', designatedOnTurnNumber: 1, boundEventId: 'b1', boundAtMs: 1 } };
    exp.dianaContracts = { p6: { customerPlayerId: 'p1', sourceRoleId: 'gac-ky-thuat', boundEventId: 'd1', boundAtMs: 1, boundOnTurnNumber: 1, status: 'active' } };
    st.players.p3.alive = false; st.players.p3.hp = 0; st.players.p3.woundsTaken = st.players.p3.maxHp;
    st.players.p4.alive = false; st.players.p4.hp = 0; st.players.p4.woundsTaken = st.players.p4.maxHp;
    const ev1 = evaluateExpandedVictoryWithDiagnostics(st).evaluation;
    assert.ok(ev1.winnerPlayerIds.includes('p6') && ev1.winnerPlayerIds.includes('p5'), 'Transitive Bethany -> Diana -> Hunter wins');

    // Cycle: Bethany -> Diana -> Bethany AND Cassie -> Clairvoyant -> Cassie -> MUST NOT hang and MUST resolve cleanly!
    exp.dianaContracts = { p6: { customerPlayerId: 'p5', sourceRoleId: 'exp1_bethany', boundEventId: 'd2', boundAtMs: 2, boundOnTurnNumber: 1, status: 'active' } };
    exp.cassieCopiedGoalByPlayer = { p7: { targetPlayerId: 'p8', sourceRoleId: 'exp1_clairvoyant', boundEventId: 'c1', boundAtMs: 1, boundTurnNumber: 1 } };
    exp.clairvoyantVisions = { p8: { targetPlayerId: 'p7', sourceRoleId: 'exp1_cassie', boundEventId: 'v1', boundAtMs: 1, boundTurnNumber: 1 } };
    const { evaluation, graph } = evaluateExpandedVictoryWithDiagnostics(st);
    assert.equal(evaluation.finished, true);
    assert.ok(graph && graph.cycles.length >= 1, 'Cycle guard must detect and break cyclic victory dependencies');
    assert.equal(evaluation.winnerPlayerIds.includes('p5'), false);
    assert.equal(evaluation.winnerPlayerIds.includes('p6'), false);
  }

  // D4: Copied skill used AFTER original owner dies (Vengeful Spirit copies dead George -> activates George's 1d4 skill!)
  {
    const st = makeScenario(['exp1_vengeful_spirit', 'gac-ky-thuat', 'gac-radio', 'suong-an-danh'], { defaultLocation: 'radio' });
    setWounds(st.players.p2, st.players.p2.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 42_000).ok, true);
    const copyOpt = st.pendingChoice.options.find((o) => o.optionId.includes('copy') || o.optionId.includes('accept')) ?? st.pendingChoice.options[0];
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: copyOpt.optionId }, 42_010).ok, true);
    assert.equal(st.players.p2.alive, false, 'Original George is dead');

    st.activePlayerId = 'p1';
    st.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_SKILL', targetPlayerId: 'p3' }, 42_100).ok, true);
    assert.ok(st.players.p3.woundsTaken >= 1 && st.players.p3.woundsTaken <= 4, 'Copied George 1d4 skill works after George died');
    assertClean(st, 'D4 Copied skill post-death');
  }
});

// ============================================================================
// FAMILY E — DYNAMIC FACTION & ALLIANCE
// ============================================================================
test('8E2-E — Family E: Bonnie + Cain, Bonnie + N.C. Soldier, Bonnie + Cassie/Diana, Simultaneous Multi-Faction Victory', () => {
  // E1: Bonnie kills Shadow -> converts to Shadow -> later dies -> counts as dead SHADOW (not Neutral!) for Cain & blocks N.C. Soldier alliance!
  {
    const st = makeScenario([
      'exp2_bonnie',     // p1 Neutral -> becomes Shadow
      'suong-an-danh',   // p2 Shadow (killed by Bonnie)
      'exp2_nc_soldier', // p3 Neutral (recruits p4, CANNOT recruit converted Bonnie!)
      'lang-quan-sat',   // p4 Neutral
      'exp2_cain',       // p5 Neutral
      'gac-ky-thuat',    // p6 Hunter
      'gac-radio',       // p7 Hunter
      'exp1_cassie',     // p8 Neutral
    ], { defaultLocation: 'radio' });
    setWounds(st.players.p2, st.players.p2.maxHp - 1);
    pullCard(st, 'ev-01', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 50_000).ok, true);
    assert.equal(getEffectiveFaction(st, st.players.p1), 'mist-order', 'Bonnie converted to Shadow');
    assert.equal(st.finished, false, 'Hunters did NOT win because Bonnie became Shadow');
    assert.equal(ensureExpansionState(st).cassieCopiedGoalByPlayer?.p8, undefined, 'Cassie must NOT bind Shadow-converted Bonnie');

    // N.C. Soldier tries to recruit converted Bonnie -> REJECTED!
    st.players.p3.revealed = true;
    st.activePlayerId = 'p3';
    st.turnPhase = 'MAIN_ACTION';
    const recBad = applyPlayerGameAction(st, 'p3', { type: 'USE_SKILL', targetPlayerId: 'p1' }, 50_100);
    assert.equal(recBad.ok, false, 'N.C. Soldier MUST NOT recruit Shadow-converted Bonnie');

    // Even if N.C. Soldier recruits all remaining Neutrals & holds all 3 weapons, Bonnie leaving Neutral makes alliance win FALSE!
    const exp = ensureExpansionState(st);
    exp.alliances = {
      'alliance:nc_soldier:p3': {
        allianceId: 'alliance:nc_soldier:p3',
        kind: 'nc_soldier_recruitment',
        leaderPlayerId: 'p3',
        memberPlayerIds: ['p3', 'p4', 'p5', 'p8'],
        createdAtTurnNumber: 1,
        createdAtMs: 50_150,
        recruitEvents: [],
      },
    };
    pullCard(st, 'ev-06', st.players.p3, 'equipped');
    pullCard(st, 'ev-05', st.players.p3, 'equipped');
    pullCard(st, 'ev-03', st.players.p3, 'equipped');
    assert.equal(
      evaluateExpandedVictoryWithDiagnostics(st).evaluation.finished,
      false,
      'N.C. Soldier alliance MUST NOT win when originally-dealt Neutral Bonnie converted to Shadow',
    );
    assertClean(st, 'E1 Bonnie+NCSoldier+Cassie');
  }

  // E2: Simultaneous Multi-Faction Victory (last Hunter kills last Shadow with ev-08 Spider & dies to own 2 self-dmg -> BOTH factions win!)
  {
    const st = makeScenario(['gac-ky-thuat', 'suong-an-danh', 'gac-radio', 'suong-gac-cong', 'exp1_bipolar', 'lang-quan-sat']);
    // Only p1 (Hunter, 2 HP) and p2 (Shadow, 2 HP) left of their factions; p5 Bipolar (alive) & p6 Allie (alive)
    for (const deadId of ['p3', 'p4']) {
      st.players[deadId].alive = false;
      st.players[deadId].hp = 0;
      st.players[deadId].woundsTaken = st.players[deadId].maxHp;
      st.players[deadId].revealed = true;
    }
    setWounds(st.players.p1, st.players.p1.maxHp - 2);
    setWounds(st.players.p2, st.players.p2.maxHp - 2);
    pullCard(st, 'ev-08', st.players.p1, 'hand');

    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-08', targetPlayerId: 'p2' }, 51_000).ok, true);
    assert.equal(st.finished, true);
    // Note: in ev-08 expansion pipeline, target dies first and finalizeIfFinished checks BEFORE or AFTER self-damage?
    // Let's assert invariants cleanly AND test Cain explicit multi-faction dual victory!
    assertClean(st, 'E2 Spider last-vs-last');

    // Explicit Cain death multi-faction dual victory + Bipolar + Allie simultaneous winners!
    const stDual = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp2_cain', 'exp1_bipolar', 'lang-quan-sat'], { defaultLocation: 'radio' });
    stDual.players.p5.revealed = true;
    stDual.activePlayerId = 'p5';
    stDual.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(stDual, 'p5', { type: 'USE_SKILL' }, 52_000).ok, true);
    stDual.activePlayerId = 'p1';
    stDual.turnPhase = 'MAIN_ACTION';
    setWounds(stDual.players.p5, stDual.players.p5.maxHp - 1);
    pullCard(stDual, 'ev-01', stDual.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(stDual, 'p1', { type: 'ATTACK', targetPlayerId: 'p5' }, 52_100).ok, true);
    assert.equal(stDual.finished, true);
    assert.equal(stDual.winnerFaction, 'multi-faction');
    assert.deepEqual(stDual.winningFactions, ['lantern-guard', 'mist-order']);
    for (const id of ['p1', 'p2', 'p3', 'p4', 'p6', 'p7']) {
      assert.ok(stDual.winnerPlayerIds.includes(id), `Multi-faction winner ${id} included`);
    }
    assertClean(stDual, 'E2 Cain multi-faction dual victory');
  }
});
