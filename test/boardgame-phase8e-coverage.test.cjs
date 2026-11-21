#!/usr/bin/env node
/**
 * test/boardgame-phase8e-coverage.test.cjs
 *
 * Phase 8E-1 — 66-Character, 25 Independent Victory & 48-Canonical-Card Behavioral Coverage Suite:
 *  - 8E1-1: Complete 40-distinct-card (48-copy) functional, negative, conservation, reshuffle,
 *           duplicate-execution, passive-interaction & match-end-during-resolution coverage
 *           (closing previously untested inv-03, inv-04, inv-10, eq-10 and all weak cards).
 *  - 8E1-2: Deterministic positive + near-miss negative tests for ALL 25 Neutral independent
 *           victory conditions across valid 4P–8P setups, timing, shared/copied chains,
 *           simultaneous multi-winners & match-result projection.
 *  - 8E1-3: Explicit positive + negative closure for roles flagged weak in 8E-0
 *           (exp2_freyja, exp1_fea, exp2_eleanor, exp2_umibozu, exp2_urban_legend,
 *           exp2_gideon, exp2_april_skipps).
 */
'use strict';

require('./register-ts.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveProductionBetaConfigFromEnv,
} = require('../shared/contracts/boardgame.ts');
const {
  CARDS_CATALOG,
  DEFAULT_CHARACTER_REGISTRY,
  DEFAULT_RULESET_REGISTRY,
  applyPlayerGameAction,
  createInitialGameState,
  ensureExpansionState,
  evaluateExpandedVictoryWithDiagnostics,
  getPublicGameView,
  getPrivateGameView,
  getRoleDesign,
} = require('../features/boardgame/domain/index.ts');
const {
  captureInitialIdentitySnapshot,
  checkGameStateInvariants,
  EXPECTED_TOTAL_CARDS,
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

/**
 * Create a clean deterministic game state with specific roles while preserving 48-card conservation.
 */
function makeScenario(roles, opts = {}) {
  const rulesetId = opts.rulesetId ?? 'full-expansion';
  const state = createInitialGameState({
    matchId: opts.matchId ?? `p8e1-${Math.random().toString(36).slice(2, 8)}`,
    seed: opts.seed ?? 88001,
    nowMs: opts.nowMs ?? 1_796_000_000_000,
    rulesetId,
    productionBeta: PROD_BETA_ALL,
    players: makePlayers(roles.length),
  });
  const exp = rulesetId !== 'classic' ? ensureExpansionState(state) : null;
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
  if (exp) exp.originallyDealtNeutralIds = origNeutrals;
  state.activePlayerId = state.turnOrder[0];
  state.turnPhase = opts.turnPhase ?? 'MAIN_ACTION';
  return state;
}

/**
 * Pull one exact cardId from decks/discards into player's hand or equipped without violating 48-card conservation.
 */
function pullCardFromDeck(state, cardId, destPlayer, targetSlot = 'hand') {
  for (const deck of ['investigation', 'equipment', 'event']) {
    const di = state.decks[deck].indexOf(cardId);
    if (di >= 0) {
      state.decks[deck].splice(di, 1);
      destPlayer[targetSlot].push(cardId);
      return true;
    }
    const xi = state.discards[deck].indexOf(cardId);
    if (xi >= 0) {
      state.discards[deck].splice(xi, 1);
      destPlayer[targetSlot].push(cardId);
      return true;
    }
  }
  throw new Error(`Card ${cardId} not available in decks/discards`);
}

function setWounds(player, wounds) {
  player.woundsTaken = wounds;
  player.hp = player.maxHp - wounds;
}

function assertCleanInvariants(state, label) {
  const res = checkGameStateInvariants(state, { checkSerialization: true });
  assert.equal(
    res.ok,
    true,
    `${label} invariant violation: ${JSON.stringify(res.violations)}`,
  );
}

// ============================================================================
// 8E1-1: ALL 40 DISTINCT CARDS (48 CANONICAL COPIES) BEHAVIORAL COVERAGE
// ============================================================================
test('8E1-1A — Catalog conservation (48 copies), Investigation cards inv-01..inv-12 (incl. previously untested inv-03, inv-04, inv-10) & P0 privacy', () => {
  // 1. Exact catalog uniqueness & copy count = 48
  const seenIds = new Set();
  const byDeck = { investigation: 0, equipment: 0, event: 0 };
  for (const card of CARDS_CATALOG) {
    assert.equal(seenIds.has(card.id), false, `Duplicate card id ${card.id}`);
    seenIds.add(card.id);
    byDeck[card.deck] += card.copies;
  }
  assert.equal(CARDS_CATALOG.length, 40, 'Exactly 40 distinct canonical card IDs');
  assert.equal(byDeck.investigation, 16);
  assert.equal(byDeck.equipment, 16);
  assert.equal(byDeck.event, 16);
  assert.equal(byDeck.investigation + byDeck.equipment + byDeck.event, EXPECTED_TOTAL_CARDS);

  // 2. inv-03 (Greed — PREVIOUSLY UNTESTED): Neutral & Shadow match, Hunter no-reaction, Unknown deceit, HP<=3 gear surrender
  {
    const st = makeScenario([
      'gac-ky-thuat',     // p1 Hunter (actor)
      'lang-quan-sat',    // p2 Neutral (Allie, 8 HP)
      'suong-an-danh',    // p3 Shadow (Vampire, 13 HP)
      'gac-radio',        // p4 Hunter (Franklin, 12 HP)
      'suong-tin-gia',    // p5 Shadow (Unknown, 11 HP)
    ]);
    const p1 = st.players.p1;
    const p2 = st.players.p2;
    const p3 = st.players.p3;
    const p4 = st.players.p4;
    const p5 = st.players.p5;

    // Invalid self target must be rejected without mutating hand
    pullCardFromDeck(st, 'inv-03', p1, 'hand');
    const badSelf = applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-03', targetPlayerId: 'p1' }, 1000);
    assert.equal(badSelf.ok, false);
    assert.ok(p1.hand.includes('inv-03'));

    // Neutral matches inv-03 -> takes 1 dmg (when HP > 3)
    const rNeut = applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-03', targetPlayerId: 'p2' }, 1100);
    assert.equal(rNeut.ok, true);
    assert.equal(p2.woundsTaken, 1);
    assert.equal(st.lastInvestigation.cardId, 'inv-00', 'Public investigation cardId must be masked');

    // Hunter does NOT match inv-03 -> 0 dmg
    pullCardFromDeck(st, 'inv-03', p1, 'hand');
    const rHunt = applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-03', targetPlayerId: 'p4' }, 1200);
    assert.equal(rHunt.ok, true);
    assert.equal(p4.woundsTaken, 0);

    // Shadow at HP <= 3 with gear hands over lowest gear instead of taking 1 dmg
    pullCardFromDeck(st, 'eq-01', p3, 'equipped');
    setWounds(p3, p3.maxHp - 2);
    pullCardFromDeck(st, 'inv-03', p1, 'hand');
    const rGear = applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-03', targetPlayerId: 'p3' }, 1300);
    assert.equal(rGear.ok, true);
    assert.ok(p1.equipped.includes('eq-01'));
    assert.equal(p3.equipped.length, 0);
    assert.equal(p3.hp, 2);

    // Unrevealed Unknown deceives inv-03 -> 0 dmg
    pullCardFromDeck(st, 'inv-03', p1, 'hand');
    const rUnk = applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-03', targetPlayerId: 'p5' }, 1400);
    assert.equal(rUnk.ok, true);
    assert.equal(p5.woundsTaken, 0);
    assertCleanInvariants(st, 'inv-03');
  }

  // 3. inv-04 (Slap — PREVIOUSLY UNTESTED): Hunter takes 1 dmg, Shadow/Neutral 0 dmg, lethal ends match
  {
    const st = makeScenario(['suong-an-danh', 'gac-ky-thuat', 'suong-gac-cong', 'lang-quan-sat', 'gac-radio']);
    pullCardFromDeck(st, 'inv-04', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-04', targetPlayerId: 'p2' }, 2000).ok, true);
    assert.equal(st.players.p2.woundsTaken, 1);

    pullCardFromDeck(st, 'inv-04', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-04', targetPlayerId: 'p3' }, 2100).ok, true);
    assert.equal(st.players.p3.woundsTaken, 0);

    pullCardFromDeck(st, 'inv-04', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-04', targetPlayerId: 'p4' }, 2200).ok, true);
    assert.equal(st.players.p4.woundsTaken, 0);

    // Duplicate execution of already-consumed inv-04 rejects cleanly
    const dup = applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-04', targetPlayerId: 'p2' }, 2250);
    assert.equal(dup.ok, false);
    assertCleanInvariants(st, 'inv-04');
  }

  // 4. inv-10 (Bully — PREVIOUSLY UNTESTED) & inv-11 (Tough Lesson): exact HP threshold 11 vs 12
  {
    const st = makeScenario(['gac-ky-thuat', 'suong-tin-gia', 'gac-truc-ban', 'gac-radio', 'suong-an-danh']);
    // p2 = Unknown (11 HP, unrevealed -> deceit avoids inv-10!), p3 = Emi (10 HP <= 11 -> 1 dmg), p4 = Franklin (12 HP >= 12 -> 0 on inv-10, 2 on inv-11)
    pullCardFromDeck(st, 'inv-10', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-10', targetPlayerId: 'p3' }, 3000).ok, true);
    assert.equal(st.players.p3.woundsTaken, 1, 'inv-10 must deal 1 dmg to maxHp 10 <= 11');

    pullCardFromDeck(st, 'inv-10', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-10', targetPlayerId: 'p4' }, 3100).ok, true);
    assert.equal(st.players.p4.woundsTaken, 0, 'inv-10 must NOT hurt maxHp 12');

    pullCardFromDeck(st, 'inv-10', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-10', targetPlayerId: 'p2' }, 3200).ok, true);
    assert.equal(st.players.p2.woundsTaken, 0, 'Unrevealed Unknown (11 HP) deceives inv-10');

    // Revealed Unknown (11 HP) DOES take 1 dmg from inv-10!
    st.players.p2.revealed = true;
    pullCardFromDeck(st, 'inv-10', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-10', targetPlayerId: 'p2' }, 3300).ok, true);
    assert.equal(st.players.p2.woundsTaken, 1, 'Revealed Unknown (11 HP) takes 1 dmg from inv-10');

    // inv-11 (Tough Lesson >= 12): hits Franklin (12) for 2, misses Emi (10)
    pullCardFromDeck(st, 'inv-11', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-11', targetPlayerId: 'p4' }, 3400).ok, true);
    assert.equal(st.players.p4.woundsTaken, 2);
    pullCardFromDeck(st, 'inv-11', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-11', targetPlayerId: 'p3' }, 3500).ok, true);
    assert.equal(st.players.p3.woundsTaken, 1);
    assertCleanInvariants(st, 'inv-10/11');
  }

  // 5. Remaining Investigation cards: inv-01, inv-02, inv-05, inv-06 (lethal match end!), inv-07 (Usurper block + 0->1), inv-08, inv-09, inv-12 (P0 privacy)
  {
    const st = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'lang-quan-sat', 'exp2_usurper']);
    // inv-01 (Hunter/Shadow) on Hunter -> 1 dmg; inv-02 (Hunter/Neutral) on Neutral -> 1 dmg
    pullCardFromDeck(st, 'inv-01', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-01', targetPlayerId: 'p2' }, 4000).ok, true);
    assert.equal(st.players.p2.woundsTaken, 1);

    pullCardFromDeck(st, 'inv-02', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-02', targetPlayerId: 'p4' }, 4100).ok, true);
    assert.equal(st.players.p4.woundsTaken, 1);

    // inv-07 (Aid) on wounded Hunter heals 1; when 0 wounds deals 1 dmg!
    pullCardFromDeck(st, 'inv-07', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-07', targetPlayerId: 'p2' }, 4200).ok, true);
    assert.equal(st.players.p2.woundsTaken, 0);
    pullCardFromDeck(st, 'inv-07', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-07', targetPlayerId: 'p2' }, 4300).ok, true);
    assert.equal(st.players.p2.woundsTaken, 1, 'inv-07 on 0-wound Hunter must deal 1 dmg');

    // inv-08 (Nurturance) on wounded Neutral heals 1
    pullCardFromDeck(st, 'inv-08', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-08', targetPlayerId: 'p4' }, 4400).ok, true);
    assert.equal(st.players.p4.woundsTaken, 0);

    // inv-05 (Spell) & inv-09 (Huddle) on Shadow
    pullCardFromDeck(st, 'inv-05', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-05', targetPlayerId: 'p3' }, 4500).ok, true);
    assert.equal(st.players.p3.woundsTaken, 1);
    pullCardFromDeck(st, 'inv-09', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-09', targetPlayerId: 'p3' }, 4600).ok, true);
    assert.equal(st.players.p3.woundsTaken, 0);

    // inv-12 (Prediction): reveals true role ONLY to p1; p4 and public view see NOTHING
    pullCardFromDeck(st, 'inv-12', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-12', targetPlayerId: 'p3' }, 4700).ok, true);
    const p1Priv = getPrivateGameView(st, 'p1');
    const p4Priv = getPrivateGameView(st, 'p4');
    const pub = getPublicGameView(st);
    assert.ok(p1Priv.privateClues.some((c) => c.detail.includes('Tú')));
    assert.equal(
      p4Priv.privateClues.some((c) => c.detail.includes('Tú') || c.detail.includes('Tiên Tri')),
      false,
      '3rd player p4 must never see inv-12 Prediction clue',
    );
    assert.equal(pub.players.find((x) => x.playerId === 'p3').revealedRoleId, null);

    // inv-06 (Exorcism 2 dmg): killing last Shadows ends match immediately!
    st.players.p5.alive = false;
    st.players.p5.hp = 0;
    st.players.p5.woundsTaken = st.players.p5.maxHp;
    st.players.p5.revealed = true;
    setWounds(st.players.p3, st.players.p3.maxHp - 2);
    pullCardFromDeck(st, 'inv-06', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-06', targetPlayerId: 'p3' }, 4800).ok, true);
    assert.equal(st.finished, true);
    assert.equal(st.winnerFaction, 'lantern-guard');
    assertCleanInvariants(st, 'inv-06 match end');
  }
});

test('8E1-1B — All Equipment/White cards eq-01..eq-15 (incl. previously untested eq-10 Guardian Angel) & passive/match-end interactions', () => {
  // 1. eq-10 (Guardian Angel — PREVIOUSLY UNTESTED!): blocks normal attacks until actor's next turn, does NOT block Flare
  {
    const st = makeScenario(['gac-ky-thuat', 'suong-an-danh', 'gac-radio', 'suong-gac-cong'], { defaultLocation: 'radio' });
    pullCardFromDeck(st, 'eq-10', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-10' }, 5000).ok, true);
    assert.equal(st.players.p1.guardianShieldActive, true);
    // Duplicate execution rejected
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-10' }, 5010).ok, false);

    // End p1 turn -> p2 attacks p1 -> MUST deal 0 damage due to Guardian Angel!
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 5020).ok, true);
    st.turnPhase = 'MAIN_ACTION';
    st.players.p2.location = 'radio';
    pullCardFromDeck(st, 'ev-02', st.players.p2, 'equipped'); // +1 weapon
    assert.equal(applyPlayerGameAction(st, 'p2', { type: 'ATTACK', targetPlayerId: 'p1' }, 5030).ok, true);
    assert.equal(st.players.p1.woundsTaken, 0, 'Guardian Angel must prevent ALL normal attack damage');

    // Event card eq-11 (Flare of Judgment) MUST still damage shielded p1 (2 dmg)
    st.activePlayerId = 'p3';
    st.turnPhase = 'MAIN_ACTION';
    pullCardFromDeck(st, 'eq-11', st.players.p3, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p3', { type: 'USE_CARD', cardId: 'eq-11' }, 5040).ok, true);
    assert.equal(st.players.p1.woundsTaken, 2, 'Guardian Angel does NOT block Flare event damage');
    assert.equal(st.players.p3.woundsTaken, 0, 'Flare never damages caster');

    // When p1's next turn starts, guardianShieldActive clears!
    st.activePlayerId = 'p4';
    st.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p4', { type: 'END_TURN' }, 5050).ok, true);
    assert.equal(st.activePlayerId, 'p1');
    assert.equal(st.players.p1.guardianShieldActive, false, 'Guardian Angel expires at start of owner next turn');
    assertCleanInvariants(st, 'eq-10 Guardian Angel');
  }

  // 2. eq-01 Holy Robe, eq-02 Fortune Brooch, eq-03 Talisman, eq-04 Spear, eq-05 Compass, eq-06 Silver Rosary
  {
    const st = makeScenario(['gac-ky-thuat', 'suong-an-danh', 'gac-radio', 'suong-gac-cong'], { defaultLocation: 'radio' });
    // eq-02 Fortune Brooch blocks Corridor (9) damage but allows Corridor (9) heal
    setWounds(st.players.p2, 3);
    pullCardFromDeck(st, 'eq-02', st.players.p2, 'equipped');
    st.players.p1.location = 'corridor';
    st.turnPhase = 'LOCATION_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_LOC_POWER', targetPlayerId: 'p2', mode: 'damage' }, 6000).ok, true);
    assert.equal(st.players.p2.woundsTaken, 3, 'Fortune Brooch blocks Corridor 9 damage');
    st.turnPhase = 'LOCATION_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_LOC_POWER', targetPlayerId: 'p2', mode: 'heal' }, 6010).ok, true);
    assert.equal(st.players.p2.woundsTaken, 2, 'Fortune Brooch still allows Corridor 9 heal');

    // eq-05 Compass triggers CHOOSE_MOVE or instant move on ROLL_MOVE
    st.turnPhase = 'ROLL_MOVE';
    pullCardFromDeck(st, 'eq-05', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ROLL_DICE' }, 6020).ok, true);
    assert.ok(st.turnPhase === 'CHOOSE_MOVE' || st.turnPhase === 'LOCATION_ACTION');

    // eq-06 Silver Rosary loots ALL equipment on kill + eq-04 Spear (+2 revealed Hunter) + eq-01 Holy Robe (-1)
    st.turnPhase = 'MAIN_ACTION';
    st.players.p1.revealed = true;
    st.players.p1.location = 'radio';
    st.players.p2.location = 'radio';
    pullCardFromDeck(st, 'eq-04', st.players.p1, 'equipped');
    pullCardFromDeck(st, 'eq-06', st.players.p1, 'equipped');
    pullCardFromDeck(st, 'eq-01', st.players.p2, 'equipped');
    setWounds(st.players.p2, st.players.p2.maxHp - 1);
    st.rngState = 1234567;
    // Guarantee non-zero roll via Masamune or keep attacking? Put Masamune on p1 (1-4 dmg; +2 spear -1 robe = >=2 dmg >= 1 HP!)
    pullCardFromDeck(st, 'ev-01', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 6030).ok, true);
    assert.equal(st.players.p2.alive, false);
    assert.ok(st.players.p1.equipped.includes('eq-01'), 'Silver Rosary must loot Holy Robe');
    assert.ok(st.players.p1.equipped.includes('eq-02'), 'Silver Rosary must loot Fortune Brooch');
    assertCleanInvariants(st, 'eq-01/02/04/05/06');
  }

  // 3. eq-07 Holy Water, eq-08 Blessing, eq-09 First Aid, eq-12 Mirror, eq-13 Advent, eq-14 Chocolate, eq-15 Concealed Knowledge
  {
    const st = makeScenario(['gac-ky-thuat', 'suong-an-danh', 'exp2_usurper', 'exp2_april_skipps', 'exp1_angel']);
    setWounds(st.players.p1, 4);
    // eq-07 Holy Water triggers unrevealed Usurper secret reaction (decline -> heals 2 HP!)
    pullCardFromDeck(st, 'eq-07', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-07' }, 7000).ok, true);
    assert.ok(st.pendingChoice && st.pendingChoice.isSecret, 'Unrevealed Usurper opens secret heal-block choice');
    const declineOpt = st.pendingChoice.options.find((o) => o.optionId.includes('decline') || o.optionId.includes('skip')) ?? st.pendingChoice.options[st.pendingChoice.options.length - 1];
    assert.equal(
      applyPlayerGameAction(st, 'p3', { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: declineOpt.optionId }, 7005).ok,
      true,
    );
    assert.equal(st.players.p1.woundsTaken, 2);

    // Second copy of eq-07 with revealed Usurper -> heal BLOCKED (0 healed)!
    st.players.p3.revealed = true;
    pullCardFromDeck(st, 'eq-07', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-07' }, 7007).ok, true);
    assert.equal(st.players.p1.woundsTaken, 2, 'Revealed Usurper blocks eq-07 White-card heal');
    // Remove Usurper aura for remaining white-card heal checks in this block
    st.players.p3.alive = false;
    st.players.p3.hp = 0;
    st.players.p3.woundsTaken = st.players.p3.maxHp;

    // eq-08 Blessing rejects self-target, heals another player
    pullCardFromDeck(st, 'eq-08', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-08', targetPlayerId: 'p1' }, 7010).ok, false);
    setWounds(st.players.p2, 6);
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-08', targetPlayerId: 'p2' }, 7020).ok, true);
    assert.ok(st.players.p2.woundsTaken < 6);

    // eq-09 First Aid sets April & Skipps from 0 wounds -> 7 wounds and triggers forced reveal countdown!
    pullCardFromDeck(st, 'eq-09', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-09', targetPlayerId: 'p4' }, 7030).ok, true);
    assert.equal(st.players.p4.woundsTaken, 7);
    assert.equal(st.players.p4.revealed, true, 'First Aid hitting exact 7 wounds must trigger April & Skipps');

    // eq-13 Advent on Hunter (skipEffect=false) reveals & full heals; eq-14 Chocolate on Angel ('A'!) reveals & full heals
    pullCardFromDeck(st, 'eq-13', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-13', skipEffect: false }, 7040).ok, true);
    assert.equal(st.players.p1.revealed, true);
    assert.equal(st.players.p1.woundsTaken, 0);

    // eq-15 Concealed Knowledge grants extra turn immediately after END_TURN
    pullCardFromDeck(st, 'eq-15', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-15' }, 7050).ok, true);
    assert.equal(st.extraTurnPending, true);
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 7060).ok, true);
    assert.equal(st.activePlayerId, 'p1', 'Concealed Knowledge must keep turn on p1');
    assert.equal(st.extraTurnPending, false);

    // eq-12 Mirror forces unrevealed Shadow (p2 Vampire) to reveal, does NOT reveal Hunter
    st.activePlayerId = 'p2';
    st.turnPhase = 'MAIN_ACTION';
    pullCardFromDeck(st, 'eq-12', st.players.p2, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p2', { type: 'USE_CARD', cardId: 'eq-12' }, 7070).ok, true);
    assert.equal(st.players.p2.revealed, true);

    // eq-14 Chocolate on Angel (expansion A/E/U rule)
    st.activePlayerId = 'p5';
    st.turnPhase = 'MAIN_ACTION';
    setWounds(st.players.p5, 3);
    pullCardFromDeck(st, 'eq-14', st.players.p5, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p5', { type: 'USE_CARD', cardId: 'eq-14', skipEffect: false }, 7080).ok, true);
    assert.equal(st.players.p5.revealed, true);
    assert.equal(st.players.p5.woundsTaken, 0);
    assertCleanInvariants(st, 'eq-07..15');
  }
});

test('8E1-1C — All Event/Black cards ev-01..ev-13, deck exhaustion/reshuffle, Talisman warding & match-end-during-resolution (incl. ev-12 Banana Peel)', () => {
  // 1. Weapons ev-01..ev-06: Masamune mandatory attack, Butcher/Chainsaw/Rusted Axe +1, Handgun inverted range, Machine Gun multi-target
  {
    const st = makeScenario(['gac-ky-thuat', 'suong-an-danh', 'gac-radio', 'suong-gac-cong'], { defaultLocation: 'radio' });
    // ev-05 Handgun cannot hit same cluster (gate/church), CAN hit other cluster (canteen)
    st.players.p1.location = 'radio';
    st.players.p2.location = 'radio';
    st.players.p3.location = 'canteen';
    st.players.p4.location = 'canteen';
    pullCardFromDeck(st, 'ev-05', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 8000).ok, false, 'Handgun forbids same-cluster target');

    // Add ev-01 Masamune + ev-02 + ev-03 + ev-04 + ev-06 Machine Gun -> END_TURN blocked before mandatory Masamune attack, attack hits BOTH p3 & p4!
    pullCardFromDeck(st, 'ev-01', st.players.p1, 'equipped');
    pullCardFromDeck(st, 'ev-02', st.players.p1, 'equipped');
    pullCardFromDeck(st, 'ev-03', st.players.p1, 'equipped');
    pullCardFromDeck(st, 'ev-04', st.players.p1, 'equipped');
    pullCardFromDeck(st, 'ev-06', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'END_TURN' }, 8010).ok, false, 'Masamune forbids END_TURN when targets reachable');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, 8020).ok, true);
    assert.ok(st.players.p3.woundsTaken >= 4, 'Masamune (1-4) + Butcher (+1) + Chainsaw (+1) + Rusted Axe (+1) >= 4');
    assert.ok(st.players.p4.woundsTaken >= 4, 'Machine Gun + Handgun hits all other-cluster targets');
    assertCleanInvariants(st, 'ev-01..06');
  }

  // 2. ev-07 Vampire Bat, ev-08 Spider, ev-09 Dynamite, ev-10 Spiritual Doll, ev-11 Moody Goblin, ev-13 Diabolic Ritual + Talisman (eq-03)
  {
    const st = makeScenario(['suong-an-danh', 'gac-ky-thuat', 'gac-radio', 'suong-gac-cong'], { defaultLocation: 'radio' });
    pullCardFromDeck(st, 'eq-03', st.players.p2, 'equipped'); // Talisman on p2
    setWounds(st.players.p1, 4);

    // ev-07 Vampire Bat: self-target rejected; Talisman blocks damage on p2, p1 still heals 1
    pullCardFromDeck(st, 'ev-07', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p1' }, 8100).ok, false);
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p2' }, 8110).ok, true);
    assert.equal(st.players.p2.woundsTaken, 0, 'Talisman blocks Vampire Bat dmg');
    assert.equal(st.players.p1.woundsTaken, 3, 'Vampire Bat heals caster 1');

    // ev-08 Spider: Talisman protects p2, caster p1 still takes 2 self-dmg
    pullCardFromDeck(st, 'ev-08', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-08', targetPlayerId: 'p1' }, 8120).ok, false);
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-08', targetPlayerId: 'p2' }, 8130).ok, true);
    assert.equal(st.players.p2.woundsTaken, 0, 'Talisman blocks Spider dmg');
    assert.equal(st.players.p1.woundsTaken, 5);

    // ev-10 Spiritual Doll: NOT warded by Talisman!
    pullCardFromDeck(st, 'ev-10', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-10', targetPlayerId: 'p1' }, 8140).ok, false);
    const beforeP1 = st.players.p1.woundsTaken;
    const beforeP2 = st.players.p2.woundsTaken;
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-10', targetPlayerId: 'p2' }, 8150).ok, true);
    assert.equal((st.players.p2.woundsTaken - beforeP2) + (st.players.p1.woundsTaken - beforeP1), 3, 'Spiritual Doll deals 3 to either target or caster ignoring Talisman');

    // ev-11 Moody Goblin steals eq-03 from p2
    pullCardFromDeck(st, 'ev-11', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-11', targetPlayerId: 'p2', equipCardId: 'eq-03' }, 8160).ok, true);
    assert.ok(st.players.p1.equipped.includes('eq-03'));
    assert.equal(st.players.p2.equipped.length, 0);

    // ev-09 Dynamite resolves cleanly
    pullCardFromDeck(st, 'ev-09', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-09' }, 8170).ok, true);

    // ev-13 Diabolic Ritual reveals Shadow & full-heals
    if (st.players.p1.woundsTaken === 0) setWounds(st.players.p1, 2);
    pullCardFromDeck(st, 'ev-13', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-13', skipEffect: false }, 8180).ok, true);
    assert.equal(st.players.p1.revealed, true);
    assert.equal(st.players.p1.woundsTaken, 0);
    assertCleanInvariants(st, 'ev-07..13');
  }

  // 3. ev-12 Banana Peel WITH equipment in Expansion mode:
  //    (a) Gloria drawing ev-12 + 2nd card while holding equipment MUST deliver 2nd queued card!
  //    (b) Handing Colt his 3rd qualifying weapon via ev-12 MUST trigger immediate Colt victory!
  {
    // (a) Gloria queued card delivery after ev-12 with equipment
    const st = makeScenario(['exp2_gloria', 'suong-an-danh', 'gac-radio', 'suong-gac-cong'], { defaultLocation: 'canteen' });
    st.players.p1.revealed = true;
    pullCardFromDeck(st, 'eq-01', st.players.p1, 'equipped');
    pullCardFromDeck(st, 'ev-12', st.players.p1, 'hand');
    const exp = ensureExpansionState(st);
    const secondCard = st.decks.event.shift();
    exp.gloriaQueuedCards = [{ playerId: 'p1', cardId: secondCard }];

    const res = applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-12', targetPlayerId: 'p2', equipCardId: 'eq-01' }, 8200);
    assert.equal(res.ok, true);
    assert.ok(st.players.p2.equipped.includes('eq-01'), 'Banana Peel must transfer eq-01 to p2');
    assert.equal(
      (exp.gloriaQueuedCards ?? []).filter((e) => e.playerId === 'p1').length,
      0,
      'BUG-8E-01: Gloria 2nd queued card MUST be delivered after ev-12 with equipment (otherwise Gloria deadlocks!)',
    );
    assertCleanInvariants(st, 'ev-12 Gloria queue');
  }
  {
    // (b) Handing Colt his 3rd qualifying weapon via ev-12 MUST finalize match immediately!
    const st = makeScenario(['gac-ky-thuat', 'exp2_colt', 'suong-an-danh', 'gac-radio', 'suong-gac-cong']);
    pullCardFromDeck(st, 'ev-02', st.players.p2, 'equipped');
    pullCardFromDeck(st, 'ev-03', st.players.p2, 'equipped');
    pullCardFromDeck(st, 'ev-04', st.players.p1, 'equipped');
    pullCardFromDeck(st, 'ev-12', st.players.p1, 'hand');

    const res = applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-12', targetPlayerId: 'p2', equipCardId: 'ev-04' }, 8250);
    assert.equal(res.ok, true);
    assert.equal(st.players.p2.equipped.length, 3);
    assert.equal(
      st.finished,
      true,
      'BUG-8E-01: Giving Colt his 3rd qualifying weapon via ev-12 MUST trigger immediate Colt victory!',
    );
    assert.ok(st.winnerPlayerIds.includes('p2'));
    assertCleanInvariants(st, 'ev-12 Colt victory');
  }

  // 4. Deck Exhaustion & Deterministic Reshuffle across all 3 decks (48-card conservation)
  {
    const st = makeScenario(['gac-ky-thuat', 'suong-an-danh', 'gac-radio', 'suong-gac-cong'], { defaultLocation: 'breaker' });
    // Move all cards from equipment deck to equipment discard -> draw at lobby (equipment) must reshuffle!
    st.discards.equipment.push(...st.decks.equipment.splice(0));
    assert.equal(st.decks.equipment.length, 0);
    assert.equal(st.discards.equipment.length, 16);
    st.players.p1.location = 'lobby';
    st.turnPhase = 'LOCATION_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'DRAW_CARD', deck: 'equipment' }, 8300).ok, true);
    assert.equal(st.decks.equipment.length, 15, 'Reshuffled 16 discards and drew 1');
    assert.equal(st.discards.equipment.length, 0);
    assertCleanInvariants(st, 'deck reshuffle');

    // Empty BOTH deck and discard for investigation (put all 16 in p2/p3/p4 hands temporarily) -> drawing advances safely to MAIN_ACTION!
    const moved = st.decks.investigation.splice(0);
    st.players.p2.hand.push(...moved);
    st.players.p1.location = 'radio';
    st.turnPhase = 'LOCATION_ACTION';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'DRAW_CARD', deck: 'investigation' }, 8310).ok, true);
    assert.equal(st.turnPhase, 'MAIN_ACTION');
    assertCleanInvariants(st, 'deck completely empty');
  }

  // 5. Match-ending during multi-step card resolution (ev-08 Spider killing last Shadow stops cleanly!)
  {
    const st = makeScenario(['gac-ky-thuat', 'suong-an-danh', 'gac-radio', 'suong-gac-cong']);
    st.players.p4.alive = false;
    st.players.p4.hp = 0;
    st.players.p4.woundsTaken = st.players.p4.maxHp;
    st.players.p4.revealed = true;
    setWounds(st.players.p2, st.players.p2.maxHp - 2);
    pullCardFromDeck(st, 'ev-08', st.players.p1, 'hand');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'ev-08', targetPlayerId: 'p2' }, 8400).ok, true);
    assert.equal(st.finished, true);
    assert.equal(st.winnerFaction, 'lantern-guard');
    assertCleanInvariants(st, 'ev-08 match end');
  }
});

// ============================================================================
// 8E1-2: ALL 25 INDEPENDENT NEUTRAL VICTORY CONDITIONS + 4P-8P + SIMULTANEOUS
// ============================================================================
test('8E1-2 — Complete 25-Neutral Independent Victory Matrix (Positive, Near-Miss Negative, 4P-8P, Simultaneous Winners & Projection)', () => {
  // 0. Verify legal deal distributions across 4P–8P & N.C. Soldier 5P exclusion
  for (const [pc, expH, expS, expN] of [
    [4, 2, 2, 0],
    [5, 2, 2, 1],
    [6, 2, 2, 2],
    [7, 2, 2, 3],
    [8, 3, 3, 2],
  ]) {
    const dealt = createInitialGameState({
      matchId: `deal-${pc}p`,
      seed: 9100 + pc,
      nowMs: 1_796_000_000_000,
      rulesetId: 'full-expansion',
      productionBeta: PROD_BETA_ALL,
      players: makePlayers(pc),
    });
    const counts = { 'lantern-guard': 0, 'mist-order': 0, wanderer: 0 };
    for (const p of Object.values(dealt.players)) counts[p.faction] += 1;
    assert.deepEqual(counts, { 'lantern-guard': expH, 'mist-order': expS, wanderer: expN }, `Deal split ${pc}P`);
    if (pc === 5) {
      assert.equal(Object.values(dealt.players).some((p) => p.roleId === 'exp2_nc_soldier'), false);
    }
  }

  const killPlayer = (st, pid) => {
    const p = st.players[pid];
    p.alive = false;
    p.hp = 0;
    p.woundsTaken = p.maxHp;
    p.revealed = true;
    const exp = ensureExpansionState(st);
    if (!exp.lifecycleByPlayer) exp.lifecycleByPlayer = {};
    exp.lifecycleByPlayer[pid] = { lifecycleState: 'FINAL_ELIMINATED', resurrectionChargesUsed: 0, reviveHpTarget: 6 };
  };

  // 1. Bob (lang-anh-san): 4 gear -> NO win; 5 gear -> IMMEDIATE win
  {
    const st = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'lang-anh-san']);
    for (const cid of ['eq-01', 'eq-02', 'eq-03', 'eq-04']) pullCardFromDeck(st, cid, st.players.p5, 'equipped');
    assert.equal(evaluateExpandedVictoryWithDiagnostics(st).evaluation.finished, false, 'Bob 4 gear must NOT win');
    pullCardFromDeck(st, 'eq-05', st.players.p5, 'equipped');
    const ev = evaluateExpandedVictoryWithDiagnostics(st).evaluation;
    assert.equal(ev.finished, true);
    assert.ok(ev.winnerPlayerIds.includes('p5'));
  }

  // 2. Allie (lang-quan-sat) & Anathema (exp1_anathema): alive when faction ends wins; dead loses
  for (const role of ['lang-quan-sat', 'exp1_anathema']) {
    const st = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', role]);
    killPlayer(st, 'p3');
    killPlayer(st, 'p4');
    const winEv = evaluateExpandedVictoryWithDiagnostics(st).evaluation;
    assert.equal(winEv.finished, true);
    assert.ok(winEv.winnerPlayerIds.includes('p5'), `${role} alive must win`);
    killPlayer(st, 'p5');
    const loseEv = evaluateExpandedVictoryWithDiagnostics(st).evaluation;
    assert.equal(loseEv.winnerPlayerIds.includes('p5'), false, `${role} dead must NOT win`);
  }

  // 3. Charles (lang-cuu-ho): charlesKillWon=false -> NO; true -> WIN
  {
    const st = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'lang-cuu-ho']);
    assert.equal(evaluateExpandedVictoryWithDiagnostics(st).evaluation.finished, false);
    st.players.p5.charlesKillWon = true;
    const ev = evaluateExpandedVictoryWithDiagnostics(st).evaluation;
    assert.equal(ev.finished, true);
    assert.ok(ev.winnerPlayerIds.includes('p5'));
  }

  // 4. Daniel (lang-tien-phong): 1st dead wins immediately; 2nd dead loses; alive on Hunter win wins
  {
    const st = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'lang-tien-phong']);
    killPlayer(st, 'p5');
    st.firstDeadPlayerId = 'p5';
    assert.equal(evaluateExpandedVictoryWithDiagnostics(st).evaluation.finished, true);
    assert.ok(evaluateExpandedVictoryWithDiagnostics(st).evaluation.winnerPlayerIds.includes('p5'));
    // If another player died first -> NOT Daniel first-death win
    killPlayer(st, 'p3');
    st.firstDeadPlayerId = 'p3';
    assert.equal(evaluateExpandedVictoryWithDiagnostics(st).evaluation.finished, false);
  }

  // 5. Bipolar (exp1_bipolar): alive+Hunter wins; dead+Hunter loses; dead+Shadow wins; alive+Shadow loses
  {
    const st = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp1_bipolar']);
    killPlayer(st, 'p3');
    killPlayer(st, 'p4');
    assert.ok(evaluateExpandedVictoryWithDiagnostics(st).evaluation.winnerPlayerIds.includes('p5'));
    killPlayer(st, 'p5');
    assert.equal(evaluateExpandedVictoryWithDiagnostics(st).evaluation.winnerPlayerIds.includes('p5'), false);

    const st2 = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp1_bipolar']);
    killPlayer(st2, 'p1');
    killPlayer(st2, 'p2');
    assert.equal(evaluateExpandedVictoryWithDiagnostics(st2).evaluation.winnerPlayerIds.includes('p5'), false);
    killPlayer(st2, 'p5');
    assert.ok(evaluateExpandedVictoryWithDiagnostics(st2).evaluation.winnerPlayerIds.includes('p5'));
  }

  // 6. Cindy (exp1_cindy): 5P solo Neutral does NOT instant-win, DOES co-win at end; 6P wins immediately when other Neutral dies
  {
    const st5 = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp1_cindy']);
    assert.equal(evaluateExpandedVictoryWithDiagnostics(st5).evaluation.finished, false, '5P Cindy must NOT instant-win');
    killPlayer(st5, 'p3');
    killPlayer(st5, 'p4');
    assert.ok(evaluateExpandedVictoryWithDiagnostics(st5).evaluation.winnerPlayerIds.includes('p5'), '5P Cindy wins end-of-match');

    const st6 = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp1_cindy', 'lang-quan-sat']);
    assert.equal(evaluateExpandedVictoryWithDiagnostics(st6).evaluation.finished, false);
    killPlayer(st6, 'p6');
    const ev6 = evaluateExpandedVictoryWithDiagnostics(st6).evaluation;
    assert.equal(ev6.finished, true);
    assert.ok(ev6.winnerPlayerIds.includes('p5'));
  }

  // 7. Arnold (exp1_arnold): >2 survivors wins, exactly 2 survivors LOSES!
  {
    const st = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp1_arnold']);
    killPlayer(st, 'p3');
    killPlayer(st, 'p4'); // 3 alive (p1, p2, p5) -> Arnold WINS
    assert.ok(evaluateExpandedVictoryWithDiagnostics(st).evaluation.winnerPlayerIds.includes('p5'));
    killPlayer(st, 'p2'); // 2 alive (p1, p5) -> Arnold LOSES (must be > 2!)
    assert.equal(evaluateExpandedVictoryWithDiagnostics(st).evaluation.winnerPlayerIds.includes('p5'), false);
  }

  // 8. Angel (exp1_angel): alive + all Neutrals alive wins; 1 Neutral dead + NOT in Church loses; 1 Neutral dead + IN Church (`lobby`) wins!
  {
    const st = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp1_angel', 'lang-quan-sat']);
    st.players.p5.location = 'radio';
    killPlayer(st, 'p3');
    killPlayer(st, 'p4');
    assert.ok(evaluateExpandedVictoryWithDiagnostics(st).evaluation.winnerPlayerIds.includes('p5'), 'All Neutrals alive -> Angel wins');
    killPlayer(st, 'p6');
    assert.equal(evaluateExpandedVictoryWithDiagnostics(st).evaluation.winnerPlayerIds.includes('p5'), false, 'Neutral dead & not in Church -> Angel loses');
    st.players.p5.location = 'lobby'; // Church alias!
    assert.ok(evaluateExpandedVictoryWithDiagnostics(st).evaluation.winnerPlayerIds.includes('p5'), 'In exact Church -> Angel wins');
  }

  // 9. Bryon (exp2_bryon): 0 dead Neutrals wins; 1 dead Neutral loses
  {
    const st = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp2_bryon', 'lang-quan-sat']);
    killPlayer(st, 'p3');
    killPlayer(st, 'p4');
    assert.ok(evaluateExpandedVictoryWithDiagnostics(st).evaluation.winnerPlayerIds.includes('p5'));
    killPlayer(st, 'p6');
    assert.equal(evaluateExpandedVictoryWithDiagnostics(st).evaluation.winnerPlayerIds.includes('p5'), false);
  }

  // 10. Bianca (exp2_bianca): lowest remaining HP (tie allowed) wins; 1 HP above minimum loses
  {
    const st = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp2_bianca']);
    killPlayer(st, 'p3');
    killPlayer(st, 'p4');
    // p1=14, p2=12, p5=10 -> Bianca lowest (10) -> wins
    assert.ok(evaluateExpandedVictoryWithDiagnostics(st).evaluation.winnerPlayerIds.includes('p5'));
    setWounds(st.players.p2, 2); // p2=10 tied with Bianca=10 -> still wins
    assert.ok(evaluateExpandedVictoryWithDiagnostics(st).evaluation.winnerPlayerIds.includes('p5'));
    setWounds(st.players.p2, 3); // p2=9 < Bianca=10 -> loses!
    assert.equal(evaluateExpandedVictoryWithDiagnostics(st).evaluation.winnerPlayerIds.includes('p5'), false);
  }

  // 11. Dalton (exp2_dalton): highest HP (tie allowed) wins; 1 HP below max loses; post-activation kill immediate win
  {
    const st = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp2_dalton']);
    killPlayer(st, 'p3');
    killPlayer(st, 'p4');
    // p1=14 > Dalton=13 -> loses
    assert.equal(evaluateExpandedVictoryWithDiagnostics(st).evaluation.winnerPlayerIds.includes('p5'), false);
    setWounds(st.players.p1, 1); // p1=13 tied with Dalton=13 -> wins
    assert.ok(evaluateExpandedVictoryWithDiagnostics(st).evaluation.winnerPlayerIds.includes('p5'));

    const stImm = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp2_dalton']);
    ensureExpansionState(stImm).daltonKillWinTriggeredIds = ['p5'];
    assert.equal(evaluateExpandedVictoryWithDiagnostics(stImm).evaluation.finished, true);
    assert.ok(evaluateExpandedVictoryWithDiagnostics(stImm).evaluation.winnerPlayerIds.includes('p5'));
  }

  // 12. Cruz (exp2_cruz) & Arlene (exp2_arlene) immediate triggers vs near-miss negative
  {
    const stC = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp2_cruz']);
    assert.equal(evaluateExpandedVictoryWithDiagnostics(stC).evaluation.finished, false);
    ensureExpansionState(stC).cruzWinTriggeredIds = ['p5'];
    assert.ok(evaluateExpandedVictoryWithDiagnostics(stC).evaluation.winnerPlayerIds.includes('p5'));

    const stA = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp2_arlene']);
    killPlayer(stA, 'p5'); // died without Hunter kill flag -> NO win
    assert.equal(evaluateExpandedVictoryWithDiagnostics(stA).evaluation.finished, false);
    ensureExpansionState(stA).arleneHunterKillTriggeredIds = ['p5'];
    assert.ok(evaluateExpandedVictoryWithDiagnostics(stA).evaluation.winnerPlayerIds.includes('p5'));
  }

  // 13. Colt (exp2_colt): 2 qualifying + Masamune/MG -> NO win; 3 qualifying -> IMMEDIATE win
  {
    const st = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp2_colt']);
    for (const cid of ['ev-01', 'ev-06', 'ev-02', 'ev-03']) pullCardFromDeck(st, cid, st.players.p5, 'equipped');
    assert.equal(evaluateExpandedVictoryWithDiagnostics(st).evaluation.finished, false, 'Masamune & MG do not count for Colt');
    pullCardFromDeck(st, 'ev-05', st.players.p5, 'equipped');
    assert.equal(evaluateExpandedVictoryWithDiagnostics(st).evaluation.finished, true);
    assert.ok(evaluateExpandedVictoryWithDiagnostics(st).evaluation.winnerPlayerIds.includes('p5'));
  }

  // 14. April & Skipps (exp2_april_skipps): unrevealed at end wins; revealed without countdown loses; survived countdown wins immediately
  {
    const st = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp2_april_skipps']);
    killPlayer(st, 'p3');
    killPlayer(st, 'p4');
    assert.ok(evaluateExpandedVictoryWithDiagnostics(st).evaluation.winnerPlayerIds.includes('p5'));
    st.players.p5.revealed = true;
    assert.equal(evaluateExpandedVictoryWithDiagnostics(st).evaluation.winnerPlayerIds.includes('p5'), false);
    ensureExpansionState(st).aprilSkippsCountdownByPlayer = {
      p5: { triggeredOnTurnNumber: 1, surviveUntilTurnNumber: 5, survivedDeadlineWon: true },
    };
    assert.ok(evaluateExpandedVictoryWithDiagnostics(st).evaluation.winnerPlayerIds.includes('p5'));
  }

  // 15. Cain (exp2_cain): 5P self-kill 1H+1S vs non-self-kill fails; 6P 1H+1S+1N dead wins vs missing 1N fails
  {
    const st5 = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp2_cain']);
    killPlayer(st5, 'p1');
    killPlayer(st5, 'p3');
    assert.equal(evaluateExpandedVictoryWithDiagnostics(st5).evaluation.finished, false, '5P Cain must personally kill 1H+1S');
    ensureExpansionState(st5).killedFactionsByPlayer = { p5: ['lantern-guard', 'mist-order'] };
    assert.ok(evaluateExpandedVictoryWithDiagnostics(st5).evaluation.winnerPlayerIds.includes('p5'));

    const st6 = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp2_cain', 'lang-quan-sat']);
    killPlayer(st6, 'p1');
    killPlayer(st6, 'p3');
    assert.equal(evaluateExpandedVictoryWithDiagnostics(st6).evaluation.finished, false, '6P Cain needs 1 dead other Neutral too');
    killPlayer(st6, 'p6');
    assert.ok(evaluateExpandedVictoryWithDiagnostics(st6).evaluation.winnerPlayerIds.includes('p5'));
  }

  // 16. Bonnie (exp2_bonnie) & N.C. Soldier (exp2_nc_soldier) + Simultaneous multi-winner + Bethany/Diana/Aaron/Cassie/Clairvoyant/Antimony projection
  {
    const st = makeScenario([
      'gac-ky-thuat',     // p1 Hunter
      'gac-radio',        // p2 Hunter
      'suong-an-danh',    // p3 Shadow
      'suong-gac-cong',   // p4 Shadow
      'exp1_bethany',     // p5 Bethany (dead, chose p1 Hunter -> still wins!)
      'exp2_diana',       // p6 Diana (alive, active customer p1 -> wins!)
      'exp2_aaron',       // p7 Aaron (alive, spouse p2 -> both alive -> wins!)
      'exp1_cassie',      // p8 Cassie (copied lang-quan-sat -> alive -> wins!)
    ]);
    const exp = ensureExpansionState(st);
    exp.bethanyChosenByPlayer = { p5: { chosenPlayerId: 'p1', designatedOnTurnNumber: 1, boundEventId: 'b1', boundAtMs: 1 } };
    exp.dianaContracts = { p6: { customerPlayerId: 'p1', sourceRoleId: 'gac-ky-thuat', boundEventId: 'd1', boundAtMs: 1, boundOnTurnNumber: 1, status: 'active' } };
    exp.aaronSpouseByPlayer = { p7: { spousePlayerId: 'p2', sourceRoleId: 'gac-radio', boundEventId: 'a1', boundAtMs: 1, boundTurnNumber: 1 } };
    exp.cassieCopiedGoalByPlayer = { p8: { targetPlayerId: 'p5', sourceRoleId: 'lang-quan-sat', boundEventId: 'c1', boundAtMs: 1, boundTurnNumber: 1 } };
    killPlayer(st, 'p5'); // Bethany dies, still wins if p1 wins!
    killPlayer(st, 'p3');
    killPlayer(st, 'p4');

    const { evaluation } = evaluateExpandedVictoryWithDiagnostics(st);
    assert.equal(evaluation.finished, true);
    assert.equal(evaluation.winnerFaction, 'lantern-guard');
    for (const id of ['p1', 'p2', 'p5', 'p6', 'p7', 'p8']) {
      assert.ok(evaluation.winnerPlayerIds.includes(id), `Simultaneous winner ${id} must be included`);
    }
    assert.equal(evaluation.winnerPlayerIds.includes('p3'), false);

    // Negative check for Aaron when spouse dies & Diana when no customer has 1 wound
    killPlayer(st, 'p2');
    exp.dianaContracts = {};
    setWounds(st.players.p6, 1);
    const negEval = evaluateExpandedVictoryWithDiagnostics(st).evaluation;
    assert.equal(negEval.winnerPlayerIds.includes('p7'), false, 'Aaron loses when spouse dead');
    assert.equal(negEval.winnerPlayerIds.includes('p6'), false, 'Diana fallback loses if wounded');
    setWounds(st.players.p6, 0);
    assert.ok(evaluateExpandedVictoryWithDiagnostics(st).evaluation.winnerPlayerIds.includes('p6'), 'Diana fallback wins at full HP');

    // Clairvoyant & Antimony copy positive + negative (unactivated -> loses)
    const stCopy = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp1_clairvoyant', 'exp1_antimony']);
    killPlayer(stCopy, 'p3');
    killPlayer(stCopy, 'p4');
    const unact = evaluateExpandedVictoryWithDiagnostics(stCopy).evaluation;
    assert.equal(unact.winnerPlayerIds.includes('p5'), false, 'Unactivated Clairvoyant loses');
    assert.equal(unact.winnerPlayerIds.includes('p6'), false, 'Unactivated Antimony loses');
    ensureExpansionState(stCopy).clairvoyantVisions = {
      p5: { targetPlayerId: 'p1', sourceRoleId: 'gac-ky-thuat', boundEventId: 'v1', boundAtMs: 1, boundTurnNumber: 1 },
    };
    ensureExpansionState(stCopy).antimonyCopiedGoalByPlayer = {
      p6: { targetPlayerId: 'p1', sourceRoleId: 'gac-ky-thuat', boundEventId: 'm1', boundAtMs: 1, boundTurnNumber: 1 },
    };
    const act = evaluateExpandedVictoryWithDiagnostics(stCopy).evaluation;
    assert.ok(act.winnerPlayerIds.includes('p5'));
    assert.ok(act.winnerPlayerIds.includes('p6'));
  }

  // 17. Bonnie & N.C. Soldier positive + negative
  {
    const stB = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp2_bonnie']);
    killPlayer(stB, 'p1');
    killPlayer(stB, 'p2');
    assert.equal(evaluateExpandedVictoryWithDiagnostics(stB).evaluation.winnerPlayerIds.includes('p5'), false, 'Unconverted Bonnie does NOT win with Shadows');
    ensureExpansionState(stB).effectiveFactionByPlayer = {
      p5: {
        playerId: 'p5',
        baseFaction: 'wanderer',
        effectiveFaction: 'mist-order',
        conversionEventId: 'conv-test-1',
        triggerVictimPlayerId: 'p3',
        convertedAtTurnNumber: 1,
        convertedAtMs: 1,
        reason: 'bonnie_shadow_succession',
      },
    };
    assert.ok(evaluateExpandedVictoryWithDiagnostics(stB).evaluation.winnerPlayerIds.includes('p5'), 'Converted Bonnie wins with Shadows');

    const stNC = makeScenario(['gac-ky-thuat', 'gac-radio', 'suong-an-danh', 'suong-gac-cong', 'exp2_nc_soldier', 'lang-quan-sat']);
    const exp = ensureExpansionState(stNC);
    exp.alliances = {
      'alliance:nc_soldier:p5': {
        allianceId: 'alliance:nc_soldier:p5',
        kind: 'nc_soldier_recruitment',
        leaderPlayerId: 'p5',
        memberPlayerIds: ['p5', 'p6'],
        createdAtTurnNumber: 1,
        createdAtMs: 1,
        recruitEvents: [{ eventId: 'rec-1', recruiterPlayerId: 'p5', recruitedPlayerId: 'p6', atTurnNumber: 1, atMs: 1 }],
      },
    };
    pullCardFromDeck(stNC, 'ev-06', stNC.players.p5, 'equipped');
    pullCardFromDeck(stNC, 'ev-05', stNC.players.p5, 'equipped');
    assert.equal(evaluateExpandedVictoryWithDiagnostics(stNC).evaluation.finished, false, 'N.C. Soldier missing Chainsaw must NOT win');
    pullCardFromDeck(stNC, 'ev-03', stNC.players.p5, 'equipped');
    const winNC = evaluateExpandedVictoryWithDiagnostics(stNC).evaluation;
    assert.equal(winNC.finished, true);
    assert.ok(winNC.winnerPlayerIds.includes('p5'));
    assert.ok(winNC.winnerPlayerIds.includes('p6'));

    // Verify match-result projection when finished via real action (finalReveal, effectiveFaction, allianceId)
    stNC.activePlayerId = 'p5';
    stNC.turnPhase = 'MAIN_ACTION';
    assert.equal(applyPlayerGameAction(stNC, 'p5', { type: 'REVEAL_ROLE' }, 9999).ok, true);
    assert.equal(stNC.finished, true);
    const pubWin = getPublicGameView(stNC);
    assert.equal(pubWin.turnPhase, 'ENDED');
    assert.equal(pubWin.finalReveal.length, 6);
    assert.ok(pubWin.winnerPlayerIds.includes('p5'));
    assert.ok(pubWin.winnerPlayerIds.includes('p6'));
    assert.equal(pubWin.finalReveal.find((r) => r.playerId === 'p5').allianceId, 'alliance:nc_soldier:p5');
    assert.equal(pubWin.finalReveal.find((r) => r.playerId === 'p6').allianceId, 'alliance:nc_soldier:p5');
  }
});

// ============================================================================
// 8E1-3: WEAKLY-COVERED ROLE NEGATIVE & EDGE-PATH CLOSURE
// ============================================================================
test('8E1-3 — Negative & edge-path closure for exp2_freyja, exp1_fea, exp2_eleanor, exp2_umibozu, exp2_urban_legend, exp2_gideon, exp2_april_skipps', () => {
  // 1. exp2_freyja negative paths: no discardable gear (only Masamune), unrevealed Freyja -> no extra attack prompt!
  {
    const st = makeScenario(['exp2_freyja', 'suong-an-danh', 'gac-radio', 'suong-gac-cong'], { defaultLocation: 'radio' });
    st.players.p1.revealed = true;
    pullCardFromDeck(st, 'ev-01', st.players.p1, 'equipped'); // ONLY Masamune (excluded from Freyja discard!)
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 9000).ok, true);
    assert.equal(st.pendingChoice, null, 'Freyja with ONLY Masamune must NOT get extra-attack choice');
    assertCleanInvariants(st, 'freyja masamune-only negative');
  }
  {
    // Unrevealed Freyja with discardable gear -> no extra attack prompt!
    const st = makeScenario(['exp2_freyja', 'suong-an-danh', 'gac-radio', 'suong-gac-cong'], { defaultLocation: 'radio' });
    pullCardFromDeck(st, 'eq-01', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 9050).ok, true);
    assert.equal(st.pendingChoice, null, 'Unrevealed Freyja must NOT get extra-attack choice');
  }

  // 2. exp1_fea negative: unrevealed Fea rolling dice does NOT get fea_move_adjust choice
  {
    const st = makeScenario(['exp1_fea', 'suong-an-danh', 'gac-radio', 'suong-gac-cong'], { turnPhase: 'ROLL_MOVE' });
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ROLL_DICE' }, 9100).ok, true);
    assert.equal(st.pendingChoice, null, 'Unrevealed Fea must NOT trigger move-adjust choice');
  }

  // 3. exp2_eleanor negative: unrevealed rejected, wrong phase rejected, and post-attack rejected (per_turn skill replaces attack)
  {
    const st = makeScenario(['exp2_eleanor', 'suong-an-danh', 'gac-radio', 'suong-gac-cong'], { turnPhase: 'MAIN_ACTION' });
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_SKILL' }, 9200).ok, false, 'Unrevealed Eleanor cannot USE_SKILL');
    st.players.p1.revealed = true;
    st.turnPhase = 'ROLL_MOVE';
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_SKILL' }, 9205).ok, false, 'Eleanor cannot USE_SKILL in ROLL_MOVE');
    st.turnPhase = 'MAIN_ACTION';
    st.players.p1.attacksThisTurn = 1;
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_SKILL' }, 9210).ok, false, 'Eleanor cannot USE_SKILL after already attacking');
  }

  // 4. exp2_umibozu negative: unrevealed Umibozu does NOT deal AoE damage on another player's reveal
  {
    const st = makeScenario(['gac-ky-thuat', 'exp2_umibozu', 'gac-radio', 'suong-an-danh'], { defaultLocation: 'radio' });
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'REVEAL_ROLE' }, 9300).ok, true);
    assert.equal(st.players.p1.woundsTaken, 0, 'Unrevealed Umibozu must NOT trigger');
  }

  // 5. exp2_urban_legend negative: normal weapon attack (even wearing Black weapon ev-02) is NOT converted to heal
  {
    const st = makeScenario(['gac-ky-thuat', 'exp2_urban_legend', 'gac-radio', 'suong-an-danh'], { defaultLocation: 'radio' });
    st.players.p2.revealed = true;
    setWounds(st.players.p2, 3);
    pullCardFromDeck(st, 'ev-02', st.players.p1, 'equipped');
    pullCardFromDeck(st, 'ev-01', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 9400).ok, true);
    assert.ok(st.players.p2.woundsTaken > 3, 'Urban Legend must NOT convert weapon attack to heal');
  }

  // 6. exp2_gideon negative: Hunter kill does NOT trigger Gideon White-card draw
  {
    const st = makeScenario(['suong-an-danh', 'gac-ky-thuat', 'exp2_gideon', 'suong-gac-cong'], { defaultLocation: 'radio' });
    st.players.p3.revealed = true;
    setWounds(st.players.p2, st.players.p2.maxHp - 1);
    pullCardFromDeck(st, 'ev-01', st.players.p1, 'equipped');
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 9500).ok, true);
    assert.equal(st.players.p2.alive, false);
    assert.equal(st.decks.equipment.length, 16, 'Gideon must NOT draw White cards when a Hunter dies');
  }

  // 7. exp2_april_skipps negative: jumping from 6 wounds to 8 wounds (lethal) skips exact 7 and does NOT grant countdown win
  {
    const st = makeScenario(['gac-ky-thuat', 'exp2_april_skipps', 'suong-an-danh', 'gac-radio', 'suong-gac-cong']);
    setWounds(st.players.p2, 6);
    pullCardFromDeck(st, 'eq-11', st.players.p1, 'hand'); // 2 dmg -> 8 wounds (dead!)
    assert.equal(applyPlayerGameAction(st, 'p1', { type: 'USE_CARD', cardId: 'eq-11' }, 9600).ok, true);
    assert.equal(st.players.p2.alive, false);
    assert.equal(ensureExpansionState(st).aprilSkippsCountdownByPlayer?.p2, undefined);
    assertCleanInvariants(st, 'april_skipps skip-7 negative');
  }
});
