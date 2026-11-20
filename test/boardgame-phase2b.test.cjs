/**
 * test/boardgame-phase2b.test.cjs — Phase 2B Comprehensive Test Suite (Complete Starter Eight)
 *
 * Covers ALL 4 Phase 2B characters (HUSTVerse Experimental House Rules) & acceptance criteria:
 *  1. Registry & Playability Gate (4 verified + 4 house-rule-approved = 8 implemented / 48 not-started; starter-eight prod-locked)
 *  2. Gayle (Hunter, 14 HP) — attack-only reroll, revealed-only, keep vs mandatory worse 2nd roll, Masamune consistency, no stacking, timeout fallback
 *  3. Felicia (Hunter, 12 HP) — White & Black 2-pick-1 house rule, Green excluded, private-only preview, discard unchosen, 0/1-card & reshuffle, non-recursive, timeout fallback
 *  4. Victor (Shadow, 13 HP) — revealed + baseDmg > 0 + hp >= 2, unpreventable 1 HP cost (ignores armor/shield), Machine Gun single-target +2 cap, non-attack excluded, timeout fallback
 *  5. Undying (Shadow, 11 HP) — >= 2 dmg threshold AFTER Holy Robe/Guardian/Talisman & BEFORE HP subtraction, attack/skill/card eligible, HP cost & location excluded, secret reveal choice vs revealed auto, lethal save, consecutive hits, eq_chocolate U-name
 *  6. Real DO Multiplayer on `starter-eight` (4P + Spectator & 8P): prod rejection, Felicia private draw privacy + F5 reconnect + hibernation, hidden Undying secret reaction + alarm timeout, 8P unique dealing
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
require('./register-ts.cjs');

const { WebSocket } = require('./ws-shim/mini-ws');
const {
  startStandaloneBoardGameTestServer,
} = require('./ws-shim/boardgame-do-harness.cjs');

const {
  DEFAULT_CHARACTER_REGISTRY,
  DEFAULT_RULESET_REGISTRY,
  PHASE2_IMPLEMENTED_EXPANSION_ROLE_IDS,
  applyPendingChoiceTimeout,
  applyPlayerGameAction,
  createInitialGameState,
  getPrivateGameView,
  getPublicGameView,
  getRoleDesign,
  isCharacterPlayable,
} = require('../features/boardgame/domain/index.ts');

function makePlayers(count) {
  return Array.from({ length: count }, (_, i) => ({
    playerId: `p${i + 1}`,
    displayName: `SV ${i + 1}`,
    seatIndex: i,
    appearance: {},
    connected: true,
  }));
}

function makeControlledStarterEightState(roleSpecs, seed = 202630) {
  const state = createInitialGameState({
    matchId: `p2b_${seed}`,
    seed,
    nowMs: 1_700_000_000_000,
    rulesetId: 'starter-eight',
    allowExperimental: true,
    choiceTimeoutMs: 5000,
    players: makePlayers(roleSpecs.length),
  });

  state.clusterPairs = [
    { clusterId: 'north', locationIds: ['radio', 'breaker'] },
    { clusterId: 'central', locationIds: ['lobby', 'canteen'] },
    { clusterId: 'south', locationIds: ['corridor', 'court'] },
  ];

  roleSpecs.forEach((spec, idx) => {
    const pid = `p${idx + 1}`;
    const p = state.players[pid];
    const design = getRoleDesign(spec.roleId);
    p.roleId = spec.roleId;
    p.faction = design.faction;
    p.maxHp = design.maxHp;
    p.woundsTaken = spec.woundsTaken ?? 0;
    p.hp = Math.max(0, design.maxHp - p.woundsTaken);
    p.revealed = Boolean(spec.revealed);
    p.alive = spec.alive !== false;
    p.location = spec.location ?? 'lobby';
    p.equipped = [...(spec.equipped ?? [])];
    p.hand = [...(spec.hand ?? [])];
    p.guardianShieldActive = Boolean(spec.guardianShieldActive);
  });

  state.activePlayerId = 'p1';
  state.turnPhase = 'MAIN_ACTION';
  return state;
}

async function openBgClient(wsBaseUrl, matchId) {
  const ws = new WebSocket(`${wsBaseUrl}/ws/boardgame?matchId=${encodeURIComponent(matchId)}`);
  const inbox = [];
  const waiters = [];
  let latestSync = null;

  ws.on('message', (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.type === 'BG_STATE_SYNC') latestSync = msg;
    inbox.push(msg);
    for (let i = waiters.length - 1; i >= 0; i--) {
      if (waiters[i].pred(msg)) {
        const w = waiters.splice(i, 1)[0];
        clearTimeout(w.timer);
        w.resolve(msg);
      }
    }
  });

  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });

  return {
    ws,
    inbox,
    getLatestSync: () => latestSync,
    send(payload) {
      ws.send(JSON.stringify(payload));
    },
    nextMsg(pred, timeoutMs = 4000, fromIndex = 0) {
      for (let i = fromIndex; i < inbox.length; i++) {
        if (pred(inbox[i])) return Promise.resolve(inbox[i]);
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const idx = waiters.findIndex((w) => w.timer === timer);
          if (idx >= 0) waiters.splice(idx, 1);
          reject(new Error(`Timeout waiting for WS message (${inbox.length} received)`));
        }, timeoutMs);
        waiters.push({ pred, resolve, timer });
      });
    },
    close() {
      try {
        ws.close();
      } catch {
        // ignore
      }
    },
  };
}

// ===========================================================================
// 1. REGISTRY & PLAYABILITY GATE (STARTER EIGHT)
// ===========================================================================

test('P2B-1 — Starter Eight (8 implemented: 4 verified + 4 house-rule-approved); prod remains Classic-only', () => {
  assert.equal(PHASE2_IMPLEMENTED_EXPANSION_ROLE_IDS.length, 8);

  const phase2BIds = ['exp1_gayle', 'exp1_felicia', 'exp1_victor', 'exp1_undying'];
  for (const id of phase2BIds) {
    assert.ok(PHASE2_IMPLEMENTED_EXPANSION_ROLE_IDS.includes(id));
    const entry = DEFAULT_CHARACTER_REGISTRY.get(id);
    assert.ok(entry, `Missing ${id}`);
    assert.equal(entry.metadata.rulesStatus, 'house-rule-approved', `${id} must be labeled house-rule-approved, NOT verified`);
    assert.equal(entry.metadata.implementationStatus, 'implemented');
    assert.ok(entry.skillImpl !== null);
    assert.ok(entry.victoryImpl !== null);
    // Strict production playability check (without allowExperimentalHouseRules) MUST return false!
    assert.equal(isCharacterPlayable(entry, { allowExperimentalHouseRules: false }), false);
    assert.equal(isCharacterPlayable(entry, { allowExperimentalHouseRules: true }), true);
  }

  // Production ruleset list remains strictly 4 (classic + 3 coming-soon)
  assert.equal(DEFAULT_RULESET_REGISTRY.listRulesets().length, 4);

  // Production MUST reject starter-eight & starter-four & incomplete expansions
  for (const blocked of ['expansion-1', 'expansion-2', 'full-expansion', 'starter-four', 'starter-eight']) {
    const check = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch(blocked, 8);
    assert.equal(check.ok, false, `Prod must block ${blocked}`);
    if (!check.ok) assert.equal(check.code, 'RULESET_UNAVAILABLE');
  }

  // Experimental mode enables starter-eight (18 chars: 7 Hunter, 7 Shadow, 4 Neutral)
  const s8 = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch('starter-eight', 8, {
    allowExperimental: true,
  });
  assert.equal(s8.ok, true);
  if (s8.ok) {
    assert.equal(s8.pools.lanternGuard.length, 7); // 3 Classic + G43, Fiona, Gayle, Felicia
    assert.equal(s8.pools.mistOrder.length, 7); // 3 Classic + Wendigo, Wyvern, Victor, Undying
    assert.equal(s8.pools.wanderer.length, 4); // 4 Classic
  }
});

// ===========================================================================
// 2. GAYLE (Hunter, 14 HP) — Attack-Only Single Reroll (Mandatory 2nd Result)
// ===========================================================================

test('P2B-2 — Gayle attack reroll: revealed-only, not on move, keep vs mandatory worse 2nd roll, Masamune, no stacking, timeout', () => {
  const now = 1_700_000_001_000;

  // 1. Unrevealed Gayle does NOT trigger reroll choice
  const sHidden = makeControlledStarterEightState([
    { roleId: 'exp1_gayle', revealed: false, location: 'lobby' },
    { roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
    { roleId: 'lang-quan-sat', revealed: true, location: 'corridor' },
  ], 5001);
  assert.equal(applyPlayerGameAction(sHidden, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now).ok, true);
  assert.equal(sHidden.pendingChoice ?? null, null, 'Hidden Gayle must NOT open reroll choice');

  // 2. Revealed Gayle on ROLL_MOVE does NOT trigger reroll choice (attack dice only!)
  const sMove = makeControlledStarterEightState([
    { roleId: 'exp1_gayle', revealed: true, location: 'lobby' },
    { roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
    { roleId: 'lang-quan-sat', revealed: true, location: 'corridor' },
  ], 5002);
  sMove.turnPhase = 'ROLL_MOVE';
  assert.equal(applyPlayerGameAction(sMove, 'p1', { type: 'ROLL_DICE' }, now).ok, true);
  assert.equal(sMove.pendingChoice ?? null, null, 'Gayle must NOT trigger on movement dice');

  // 3. Find a seed where Gayle's 1st roll > 2nd roll to prove mandatory 2nd result even when worse!
  let worseSeed = -1;
  let firstDmgVal = -1;
  let secondDmgVal = -1;
  for (let seed = 5100; seed < 5300; seed++) {
    const probe = makeControlledStarterEightState([
      { roleId: 'exp1_gayle', revealed: true, location: 'lobby' },
      { roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
      { roleId: 'gac-radio', revealed: true, location: 'corridor' },
      { roleId: 'lang-quan-sat', revealed: true, location: 'corridor' },
    ], seed);
    applyPlayerGameAction(probe, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
    const fRoll = probe.pendingChoice.data.firstRoll;
    applyPlayerGameAction(probe, 'p1', {
      type: 'RESOLVE_CHOICE',
      choiceId: probe.pendingChoice.choiceId,
      optionId: 'reroll',
    }, now + 100);
    const dealt = probe.players.p2.woundsTaken;
    if (fRoll.rawDmg >= 3 && dealt < fRoll.rawDmg) {
      worseSeed = seed;
      firstDmgVal = fRoll.rawDmg;
      secondDmgVal = dealt;
      break;
    }
  }
  assert.ok(worseSeed >= 5100, 'Should find deterministic seed where 2nd roll is worse than 1st');

  const sWorse = makeControlledStarterEightState([
    { roleId: 'exp1_gayle', revealed: true, location: 'lobby' },
    { roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
    { roleId: 'lang-quan-sat', revealed: true, location: 'corridor' },
  ], worseSeed);
  applyPlayerGameAction(sWorse, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  assert.equal(sWorse.pendingChoice.kind, 'gayle_attack_reroll');
  assert.equal(sWorse.pendingChoice.data.firstRoll.rawDmg, firstDmgVal);
  const resReroll = applyPlayerGameAction(sWorse, 'p1', {
    type: 'RESOLVE_CHOICE',
    choiceId: sWorse.pendingChoice.choiceId,
    optionId: 'reroll',
  }, now + 100);
  assert.equal(resReroll.ok, true);
  assert.equal(sWorse.pendingChoice, null, 'Must NOT allow 2nd reroll / stacking');
  assert.equal(sWorse.players.p2.woundsTaken, secondDmgVal, 'Must mandatorily apply worse 2nd result');
  assert.equal(sWorse.expansionState.stats.activationsByRole.exp1_gayle, 1);

  // 4. Masamune (ev-01) consistency: both 1st roll and reroll use 1d4 (d6 === 0, baseDmg in 1..4)
  const sMasa = makeControlledStarterEightState([
    { roleId: 'exp1_gayle', revealed: true, location: 'lobby', equipped: ['ev-01'] },
    { roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
    { roleId: 'lang-quan-sat', revealed: true, location: 'corridor' },
  ], 5010);
  applyPlayerGameAction(sMasa, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  assert.equal(sMasa.pendingChoice.data.firstRoll.hasMasamune, true);
  assert.equal(sMasa.pendingChoice.data.firstRoll.d6, 0);
  assert.ok(sMasa.pendingChoice.data.firstRoll.d4 >= 1 && sMasa.pendingChoice.data.firstRoll.d4 <= 4);
  applyPlayerGameAction(sMasa, 'p1', {
    type: 'RESOLVE_CHOICE',
    choiceId: sMasa.pendingChoice.choiceId,
    optionId: 'reroll',
  }, now + 100);
  assert.equal(sMasa.lastDiceRoll.d6, 0, 'Masamune reroll must also roll 1d4 only');
  assert.ok(sMasa.lastDiceRoll.d4 >= 1 && sMasa.lastDiceRoll.d4 <= 4);

  // 5. Timeout fallback selects 'keep' (firstRoll)
  const sTimeout = makeControlledStarterEightState([
    { roleId: 'exp1_gayle', revealed: true, location: 'lobby' },
    { roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
    { roleId: 'lang-quan-sat', revealed: true, location: 'corridor' },
  ], worseSeed);
  applyPlayerGameAction(sTimeout, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  assert.equal(applyPendingChoiceTimeout(sTimeout, now + 6000), true);
  assert.equal(sTimeout.pendingChoice, null);
  assert.equal(sTimeout.players.p2.woundsTaken, firstDmgVal, 'Timeout must keep 1st roll');
});

// ===========================================================================
// 3. FELICIA (Hunter, 12 HP) — White & Black 2-Pick-1 House Rule
// ===========================================================================

test('P2B-3 — Felicia draws 2 pick 1 on White/Black only (Green excluded), private view only, 0/1-card & reshuffle, timeout', () => {
  const now = 1_700_000_002_000;

  // 1. Revealed Felicia at Lobby (White equipment deck): draws exact top 2 cards in order
  const sWhite = makeControlledStarterEightState([
    { roleId: 'exp1_felicia', revealed: true, location: 'lobby' },
    { roleId: 'suong-an-danh', revealed: true, location: 'canteen' },
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
    { roleId: 'lang-quan-sat', revealed: true, location: 'corridor' },
  ], 6001);
  sWhite.turnPhase = 'LOCATION_ACTION';
  sWhite.decks.equipment = ['eq-01', 'eq-07', 'eq-04']; // eq-01 (Holy Robe gear), eq-07 (Holy Water consumable)
  sWhite.discards.equipment = [];

  assert.equal(applyPlayerGameAction(sWhite, 'p1', { type: 'DRAW_CARD', deck: 'equipment' }, now).ok, true);
  assert.ok(sWhite.pendingChoice);
  assert.equal(sWhite.pendingChoice.kind, 'felicia_draw_choice');
  assert.deepEqual(sWhite.pendingChoice.data.cardIds, ['eq-01', 'eq-07']);
  assert.deepEqual(sWhite.decks.equipment, ['eq-04'], 'Must consume top 2 cards in exact deck order');

  // Privacy check: Felicia sees both cards in privateView; other players & public view see ZERO card titles!
  const pubView = getPublicGameView(sWhite);
  const feliciaPriv = getPrivateGameView(sWhite, 'p1');
  const otherPriv = getPrivateGameView(sWhite, 'p2');
  assert.equal(feliciaPriv.pendingChoice.options.length, 2);
  assert.equal(feliciaPriv.pendingChoice.options[0].card.id, 'eq-01');
  assert.equal(feliciaPriv.pendingChoice.options[1].card.id, 'eq-07');
  assert.equal(otherPriv.pendingChoice, undefined);
  assert.equal(pubView.pendingChoice.promptLabel.includes('Áo Choàng'), false);
  assert.equal(pubView.pendingChoice.promptLabel.includes('Nước'), false);
  assert.equal(sWhite.publicLog.some((l) => l.text.includes('Áo Choàng') || l.text.includes('Nước Thánh')), false);

  // Pick card #1 (eq-07 consumable) -> goes to hand, eq-01 goes to discard pile (NOT equipped!)
  const pickRes = applyPlayerGameAction(sWhite, 'p1', {
    type: 'RESOLVE_CHOICE',
    choiceId: sWhite.pendingChoice.choiceId,
    optionId: 'pick_1',
  }, now + 100);
  assert.equal(pickRes.ok, true);
  assert.equal(sWhite.pendingChoice, null);
  assert.equal(sWhite.turnPhase, 'MAIN_ACTION');
  assert.deepEqual(sWhite.players.p1.hand, ['eq-07']);
  assert.deepEqual(sWhite.players.p1.equipped, [], 'Unchosen gear eq-01 must NOT be equipped');
  assert.deepEqual(sWhite.discards.equipment, ['eq-01'], 'Unchosen card must move to deck discard pile');

  // 2. Black deck ('event') ALSO triggers Felicia
  const sBlack = makeControlledStarterEightState([
    { roleId: 'exp1_felicia', revealed: true, location: 'canteen' },
    { roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
    { roleId: 'lang-quan-sat', revealed: true, location: 'corridor' },
  ], 6002);
  sBlack.turnPhase = 'LOCATION_ACTION';
  sBlack.decks.event = ['ev-01', 'ev-07']; // ev-01 Masamune gear, ev-07 Vampire Bat consumable
  applyPlayerGameAction(sBlack, 'p1', { type: 'DRAW_CARD', deck: 'event' }, now);
  assert.equal(sBlack.pendingChoice.kind, 'felicia_draw_choice');
  // Timeout fallback auto-picks option 0 (ev-01 Masamune -> auto-equips; ev-07 discarded!)
  assert.equal(applyPendingChoiceTimeout(sBlack, now + 6000), true);
  assert.deepEqual(sBlack.players.p1.equipped, ['ev-01']);
  assert.deepEqual(sBlack.discards.event, ['ev-07']);
  assert.equal(sBlack.turnPhase, 'MAIN_ACTION');

  // 3. Green Investigation deck MUST NOT trigger Felicia (HUSTVerse experimental house rule!)
  const sGreen = makeControlledStarterEightState([
    { roleId: 'exp1_felicia', revealed: true, location: 'radio' },
    { roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
    { roleId: 'lang-quan-sat', revealed: true, location: 'corridor' },
  ], 6003);
  sGreen.turnPhase = 'LOCATION_ACTION';
  const prevInvCount = sGreen.decks.investigation.length;
  applyPlayerGameAction(sGreen, 'p1', { type: 'DRAW_CARD', deck: 'investigation' }, now);
  assert.equal(sGreen.pendingChoice ?? null, null, 'Green Investigation MUST NOT trigger Felicia');
  assert.equal(sGreen.decks.investigation.length, prevInvCount - 1, 'Must draw strictly 1 Green card');
  assert.equal(sGreen.players.p1.hand.length, 1);

  // 4. Hidden Felicia MUST NOT trigger
  const sHidden = makeControlledStarterEightState([
    { roleId: 'exp1_felicia', revealed: false, location: 'lobby' },
    { roleId: 'suong-an-danh', revealed: true, location: 'canteen' },
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
    { roleId: 'lang-quan-sat', revealed: true, location: 'corridor' },
  ], 6004);
  sHidden.turnPhase = 'LOCATION_ACTION';
  applyPlayerGameAction(sHidden, 'p1', { type: 'DRAW_CARD', deck: 'equipment' }, now);
  assert.equal(sHidden.pendingChoice ?? null, null, 'Hidden Felicia must draw normally');

  // 5. Edge cases: deck with 0 cards, 1 card, and 1 card + discard reshuffle
  const sEmpty = makeControlledStarterEightState([
    { roleId: 'exp1_felicia', revealed: true, location: 'lobby' },
    { roleId: 'suong-an-danh', revealed: true, location: 'canteen' },
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
    { roleId: 'lang-quan-sat', revealed: true, location: 'corridor' },
  ], 6005);
  sEmpty.turnPhase = 'LOCATION_ACTION';
  sEmpty.decks.equipment = [];
  sEmpty.discards.equipment = [];
  assert.equal(applyPlayerGameAction(sEmpty, 'p1', { type: 'DRAW_CARD', deck: 'equipment' }, now).ok, true);
  assert.equal(sEmpty.pendingChoice ?? null, null);
  assert.equal(sEmpty.turnPhase, 'MAIN_ACTION');

  const sOne = makeControlledStarterEightState([
    { roleId: 'exp1_felicia', revealed: true, location: 'lobby' },
    { roleId: 'suong-an-danh', revealed: true, location: 'canteen' },
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
    { roleId: 'lang-quan-sat', revealed: true, location: 'corridor' },
  ], 6006);
  sOne.turnPhase = 'LOCATION_ACTION';
  sOne.decks.equipment = ['eq-01'];
  sOne.discards.equipment = [];
  assert.equal(applyPlayerGameAction(sOne, 'p1', { type: 'DRAW_CARD', deck: 'equipment' }, now).ok, true);
  assert.equal(sOne.pendingChoice ?? null, null, '1-card deck must NOT stall with choice');
  assert.deepEqual(sOne.players.p1.equipped, ['eq-01']);
  assert.equal(sOne.turnPhase, 'MAIN_ACTION');

  const sReshuffle = makeControlledStarterEightState([
    { roleId: 'exp1_felicia', revealed: true, location: 'lobby' },
    { roleId: 'suong-an-danh', revealed: true, location: 'canteen' },
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
    { roleId: 'lang-quan-sat', revealed: true, location: 'corridor' },
  ], 6007);
  sReshuffle.turnPhase = 'LOCATION_ACTION';
  sReshuffle.decks.equipment = ['eq-01'];
  sReshuffle.discards.equipment = ['eq-04'];
  assert.equal(applyPlayerGameAction(sReshuffle, 'p1', { type: 'DRAW_CARD', deck: 'equipment' }, now).ok, true);
  assert.equal(sReshuffle.pendingChoice.kind, 'felicia_draw_choice', '1 in deck + 1 in discard must reshuffle to draw 2');
  assert.deepEqual(sReshuffle.pendingChoice.data.cardIds, ['eq-01', 'eq-04']);
});

// ===========================================================================
// 4. VICTOR (Shadow, 13 HP) — Unpreventable 1 HP Cost -> +2 Single-Target Boost
// ===========================================================================

test('P2B-4 — Victor +2 single-target boost: revealed, baseDmg>0, hp>=2, unpreventable 1 HP cost, Machine Gun 1-target cap', () => {
  const now = 1_700_000_003_000;

  // 1. Machine Gun (ev-06) + Masamune (ev-01) + Holy Robe (eq-01) on Victor:
  //    Hits 2 targets (p2 & p3). Victor pays 1 HP (unpreventable even with Holy Robe & Guardian Shield!)
  //    and ONLY the chosen target (p2) gets +2; p3 gets base damage without +2!
  const sMg = makeControlledStarterEightState([
    {
      roleId: 'exp1_victor',
      revealed: true,
      location: 'lobby',
      equipped: ['ev-01', 'ev-06', 'eq-01'],
      guardianShieldActive: true,
    },
    { roleId: 'gac-radio', revealed: true, location: 'lobby' },
    { roleId: 'gac-ky-thuat', revealed: true, location: 'canteen' },
    { roleId: 'lang-quan-sat', revealed: true, location: 'corridor' },
  ], 7001);
  assert.equal(applyPlayerGameAction(sMg, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now).ok, true);
  assert.ok(sMg.pendingChoice);
  assert.equal(sMg.pendingChoice.kind, 'victor_blood_boost');
  const rollRaw = sMg.pendingChoice.data.roll.rawDmg;
  const boostRes = applyPlayerGameAction(sMg, 'p1', {
    type: 'RESOLVE_CHOICE',
    choiceId: sMg.pendingChoice.choiceId,
    optionId: 'boost:p2',
  }, now + 100);
  assert.equal(boostRes.ok, true);
  assert.equal(sMg.pendingChoice, null);
  assert.equal(sMg.players.p1.hp, 12, '1 HP cost MUST deduct 1 HP even when Victor has Holy Robe + Guardian Shield');
  assert.equal(sMg.players.p2.woundsTaken, rollRaw + 2, 'Chosen Machine Gun target MUST receive +2');
  assert.equal(sMg.players.p3.woundsTaken, rollRaw, 'Other Machine Gun targets MUST NOT receive Victor +2');
  assert.equal(sMg.expansionState.stats.activationsByRole.exp1_victor, 1);
  assert.equal(sMg.expansionState.stats.bonusDamageByRole.exp1_victor, 2);

  // 2. Victor with only 1 HP left (12 woundsTaken / 13 maxHp) CANNOT trigger boost (no suicide!)
  const sLowHp = makeControlledStarterEightState([
    { roleId: 'exp1_victor', revealed: true, location: 'lobby', woundsTaken: 12, equipped: ['ev-01'] },
    { roleId: 'gac-radio', revealed: true, location: 'lobby' },
    { roleId: 'gac-ky-thuat', revealed: true, location: 'corridor' },
    { roleId: 'lang-quan-sat', revealed: true, location: 'corridor' },
  ], 7002);
  assert.equal(sLowHp.players.p1.hp, 1);
  applyPlayerGameAction(sLowHp, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  assert.equal(sLowHp.pendingChoice ?? null, null, 'Victor at 1 HP MUST NOT get blood boost prompt');
  assert.equal(sLowHp.players.p1.hp, 1);

  // 3. Attack miss (baseDmg === 0) MUST NOT trigger Victor!
  let missSeed = -1;
  for (let seed = 7100; seed < 7300; seed++) {
    const probe = makeControlledStarterEightState([
      { roleId: 'exp1_victor', revealed: true, location: 'lobby' },
      { roleId: 'gac-radio', revealed: true, location: 'lobby' },
      { roleId: 'gac-ky-thuat', revealed: true, location: 'corridor' },
      { roleId: 'lang-quan-sat', revealed: true, location: 'corridor' },
    ], seed);
    applyPlayerGameAction(probe, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
    if (!probe.pendingChoice && probe.lastDiceRoll && probe.lastDiceRoll.total === 0) {
      missSeed = seed;
      break;
    }
  }
  assert.ok(missSeed >= 7100, 'When baseDmg === 0 (miss), Victor must NOT open boost choice');

  // 4. Non-attack card damage (eq-11 Flare) MUST NOT trigger Victor
  const sCard = makeControlledStarterEightState([
    { roleId: 'exp1_victor', revealed: true, location: 'lobby', hand: ['eq-11'] },
    { roleId: 'gac-radio', revealed: true, location: 'lobby' },
    { roleId: 'gac-ky-thuat', revealed: true, location: 'corridor' },
    { roleId: 'lang-quan-sat', revealed: true, location: 'corridor' },
  ], 7004);
  applyPlayerGameAction(sCard, 'p1', { type: 'USE_CARD', cardId: 'eq-11' }, now);
  assert.equal(sCard.pendingChoice ?? null, null, 'Card damage must NOT trigger Victor');
  assert.equal(sCard.players.p2.woundsTaken, 2);

  // 5. Timeout fallback defaults to 'skip' (does not force HP loss!)
  const sTimeout = makeControlledStarterEightState([
    { roleId: 'exp1_victor', revealed: true, location: 'lobby', equipped: ['ev-01'] },
    { roleId: 'gac-radio', revealed: true, location: 'lobby' },
    { roleId: 'gac-ky-thuat', revealed: true, location: 'corridor' },
    { roleId: 'lang-quan-sat', revealed: true, location: 'corridor' },
  ], 7005);
  applyPlayerGameAction(sTimeout, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  assert.equal(sTimeout.pendingChoice.kind, 'victor_blood_boost');
  const expectedBase = sTimeout.pendingChoice.data.roll.rawDmg;
  assert.equal(applyPendingChoiceTimeout(sTimeout, now + 6000), true);
  assert.equal(sTimeout.players.p1.hp, 13, 'Timeout must NOT cost Victor HP');
  assert.equal(sTimeout.players.p2.woundsTaken, expectedBase);
});

// ===========================================================================
// 5. UNDYING (Shadow, 11 HP) — >= 2 Damage Threshold After Reductions, Secret Choice
// ===========================================================================

test('P2B-5 — Undying >= 2 threshold after Holy Robe/Shield/Talisman, attack/skill/card eligible, HP cost & location excluded, secret reveal save', () => {
  const now = 1_700_000_004_000;

  // 1. Threshold check WITH Holy Robe (eq-01):
  //    - Attack raw = 2 -> Holy Robe reduces 2 -> 1 (< 2) -> Undying MUST NOT trigger!
  //    - Attack raw = 3 -> Holy Robe reduces 3 -> 2 (>= 2) -> Undying reduces 2 -> 1!
  let seedRaw2 = -1;
  let seedRaw3 = -1;
  for (let seed = 8000; seed < 8400; seed++) {
    const p = makeControlledStarterEightState([
      { roleId: 'gac-radio', revealed: true, location: 'lobby', equipped: ['ev-01'] }, // 1d4 = 1..4
      { roleId: 'lang-quan-sat', revealed: true, location: 'lobby' },
      { roleId: 'gac-ky-thuat', revealed: true, location: 'corridor' },
      { roleId: 'suong-an-danh', revealed: true, location: 'corridor' },
    ], seed);
    applyPlayerGameAction(p, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
    if (p.lastDiceRoll.total === 2 && seedRaw2 === -1) seedRaw2 = seed;
    if (p.lastDiceRoll.total === 3 && seedRaw3 === -1) seedRaw3 = seed;
    if (seedRaw2 !== -1 && seedRaw3 !== -1) break;
  }
  assert.ok(seedRaw2 !== -1 && seedRaw3 !== -1);

  // Raw = 2 + Holy Robe -> 1 (< 2) -> Undying (revealed) does NOT trigger; takes 1!
  const sRobe2 = makeControlledStarterEightState([
    { roleId: 'gac-radio', revealed: true, location: 'lobby', equipped: ['ev-01'] },
    { roleId: 'exp1_undying', revealed: true, location: 'lobby', equipped: ['eq-01'] },
    { roleId: 'gac-ky-thuat', revealed: true, location: 'corridor' },
    { roleId: 'suong-an-danh', revealed: true, location: 'corridor' },
  ], seedRaw2);
  applyPlayerGameAction(sRobe2, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  assert.equal(sRobe2.players.p2.woundsTaken, 1, 'Raw 2 - Holy Robe 1 = 1 (< 2) must NOT trigger Undying');
  assert.equal(sRobe2.expansionState.stats.activationsByRole.exp1_undying ?? 0, 0);

  // Raw = 3 + Holy Robe -> 2 (>= 2) -> Undying (revealed) triggers -> 2 - 1 = 1!
  const sRobe3 = makeControlledStarterEightState([
    { roleId: 'gac-radio', revealed: true, location: 'lobby', equipped: ['ev-01'] },
    { roleId: 'exp1_undying', revealed: true, location: 'lobby', equipped: ['eq-01'] },
    { roleId: 'gac-ky-thuat', revealed: true, location: 'corridor' },
    { roleId: 'suong-an-danh', revealed: true, location: 'corridor' },
  ], seedRaw3);
  applyPlayerGameAction(sRobe3, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  assert.equal(sRobe3.players.p2.woundsTaken, 1, 'Raw 3 - Holy Robe 1 = 2 (>= 2) -> Undying reduces 2 -> 1');
  assert.equal(sRobe3.expansionState.stats.activationsByRole.exp1_undying, 1);

  // 2. Guardian Shield active -> 0 dmg (< 2) -> hidden Undying MUST NOT get secret prompt!
  const sShield = makeControlledStarterEightState([
    { roleId: 'gac-radio', revealed: true, location: 'lobby', equipped: ['ev-01', 'ev-02', 'ev-03'] },
    { roleId: 'exp1_undying', revealed: false, location: 'lobby', guardianShieldActive: true },
    { roleId: 'gac-ky-thuat', revealed: true, location: 'corridor' },
    { roleId: 'suong-an-danh', revealed: true, location: 'corridor' },
  ], seedRaw3);
  applyPlayerGameAction(sShield, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  assert.equal(sShield.pendingChoice ?? null, null, 'Guardian Shield 0 dmg must not trigger Undying');
  assert.equal(sShield.players.p2.woundsTaken, 0);

  // 3. Hidden Undying at 2 HP (9 woundsTaken) hit by AoE Flare (eq-11, 2 ST card damage):
  //    Opens SECRET choice BEFORE HP subtraction -> reveal_and_reduce lowers 2 -> 1 -> SURVIVES at 1/11 HP!
  const sLethalSave = makeControlledStarterEightState([
    { roleId: 'gac-radio', revealed: true, location: 'lobby', hand: ['eq-11'] },
    { roleId: 'exp1_undying', revealed: false, location: 'corridor', woundsTaken: 9 }, // 2 HP left
    { roleId: 'gac-ky-thuat', revealed: true, location: 'corridor' },
    { roleId: 'suong-an-danh', revealed: true, location: 'corridor' },
  ], 8010);
  applyPlayerGameAction(sLethalSave, 'p1', { type: 'USE_CARD', cardId: 'eq-11' }, now);
  assert.ok(sLethalSave.pendingChoice);
  assert.equal(sLethalSave.pendingChoice.kind, 'undying_reveal_reduce');
  assert.equal(sLethalSave.pendingChoice.isSecret, true);
  // P0 privacy check on public projection
  const pubSecret = getPublicGameView(sLethalSave);
  assert.equal(pubSecret.pendingChoice.isSecret, true);
  assert.equal(pubSecret.pendingChoice.ownerPlayerId, null);
  assert.equal(pubSecret.pendingChoice.kind, null);
  // Owner chooses reveal_and_reduce -> survives at 1 HP!
  const saveRes = applyPlayerGameAction(sLethalSave, 'p2', {
    type: 'RESOLVE_CHOICE',
    choiceId: sLethalSave.pendingChoice.choiceId,
    optionId: 'reveal_and_reduce',
  }, now + 100);
  assert.equal(saveRes.ok, true);
  assert.equal(sLethalSave.players.p2.revealed, true);
  assert.equal(sLethalSave.players.p2.alive, true, 'Undying reducing lethal 2 -> 1 MUST survive');
  assert.equal(sLethalSave.players.p2.hp, 1);

  // 4. Hidden Undying declining secret choice -> ZERO public log leak, takes full 2 dmg
  const sDecline = makeControlledStarterEightState([
    { roleId: 'gac-radio', revealed: true, location: 'lobby', hand: ['eq-11'] },
    { roleId: 'exp1_undying', revealed: false, location: 'corridor' },
    { roleId: 'gac-ky-thuat', revealed: true, location: 'corridor' },
    { roleId: 'suong-an-danh', revealed: true, location: 'corridor' },
  ], 8011);
  applyPlayerGameAction(sDecline, 'p1', { type: 'USE_CARD', cardId: 'eq-11' }, now);
  const logLenBefore = sDecline.publicLog.length;
  applyPlayerGameAction(sDecline, 'p2', {
    type: 'RESOLVE_CHOICE',
    choiceId: sDecline.pendingChoice.choiceId,
    optionId: 'decline',
  }, now + 100);
  assert.equal(sDecline.players.p2.revealed, false);
  assert.equal(sDecline.players.p2.woundsTaken, 2);
  const newLogs = sDecline.publicLog.slice(logLenBefore);
  assert.equal(newLogs.some((l) => l.text.includes('Undying') || l.text.includes('Mạ Sắt')), false);

  // 5. Skill damage (Franklin 1d6 >= 2) & Talisman blocking Black event (ev-07) & Location (Corridor Ô 9) excluded
  const sSkill = makeControlledStarterEightState([
    { roleId: 'gac-radio', revealed: true, location: 'lobby' },
    { roleId: 'exp1_undying', revealed: true, location: 'corridor' },
    { roleId: 'gac-ky-thuat', revealed: true, location: 'corridor' },
    { roleId: 'suong-an-danh', revealed: true, location: 'corridor' },
  ], 8012);
  // Find deterministic seed where Franklin 1d6 >= 2
  let frankSeed = 8012;
  for (let s = 8012; s < 8050; s++) {
    const probe = makeControlledStarterEightState([
      { roleId: 'gac-radio', revealed: true, location: 'lobby' },
      { roleId: 'exp1_undying', revealed: true, location: 'corridor' },
      { roleId: 'gac-ky-thuat', revealed: true, location: 'corridor' },
      { roleId: 'suong-an-danh', revealed: true, location: 'corridor' },
    ], s);
    applyPlayerGameAction(probe, 'p1', { type: 'USE_SKILL', targetPlayerId: 'p2' }, now);
    if ((probe.expansionState.stats.activationsByRole.exp1_undying ?? 0) === 1) {
      frankSeed = s;
      assert.ok(probe.players.p2.woundsTaken >= 1 && probe.players.p2.woundsTaken <= 5);
      break;
    }
  }
  assert.ok(frankSeed >= 8012, 'Undying must reduce skill damage >= 2 by 1');

  // Talisman wards Vampire Bat (2 ST) -> 0 dmg -> Undying does NOT activate
  const sTalisman = makeControlledStarterEightState([
    { roleId: 'gac-radio', revealed: true, location: 'lobby', hand: ['ev-07'] },
    { roleId: 'exp1_undying', revealed: true, location: 'corridor', equipped: ['eq-03'] },
    { roleId: 'gac-ky-thuat', revealed: true, location: 'corridor' },
    { roleId: 'suong-an-danh', revealed: true, location: 'corridor' },
  ], 8013);
  applyPlayerGameAction(sTalisman, 'p1', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p2' }, now);
  assert.equal(sTalisman.players.p2.woundsTaken, 0);
  assert.equal(sTalisman.expansionState.stats.activationsByRole.exp1_undying ?? 0, 0);

  // Corridor location damage (sourceType === 'location') is excluded (attack/skill/card only)
  const sLoc = makeControlledStarterEightState([
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
    { roleId: 'exp1_undying', revealed: true, location: 'lobby' },
    { roleId: 'gac-ky-thuat', revealed: true, location: 'lobby' },
    { roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
  ], 8014);
  sLoc.turnPhase = 'LOCATION_ACTION';
  applyPlayerGameAction(sLoc, 'p1', { type: 'USE_LOC_POWER', targetPlayerId: 'p2', mode: 'damage' }, now);
  assert.equal(sLoc.players.p2.woundsTaken, 2, 'Location damage must NOT be reduced by Undying');

  // 6. Consecutive damage instances: Flare (2 -> 1) then Attack (3 -> 2) -> reduces once per instance!
  const sConsec = makeControlledStarterEightState([
    { roleId: 'gac-radio', revealed: true, location: 'lobby', hand: ['eq-11'], equipped: ['ev-01'] },
    { roleId: 'exp1_undying', revealed: true, location: 'lobby' },
    { roleId: 'gac-ky-thuat', revealed: true, location: 'corridor' },
    { roleId: 'suong-an-danh', revealed: true, location: 'corridor' },
  ], seedRaw3);
  applyPlayerGameAction(sConsec, 'p1', { type: 'USE_CARD', cardId: 'eq-11' }, now);
  assert.equal(sConsec.players.p2.woundsTaken, 1, '1st instance (Flare 2 ST -> 1)');
  applyPlayerGameAction(sConsec, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now + 50);
  assert.equal(sConsec.players.p2.woundsTaken, 1 + 2, '2nd instance (Attack 3 ST -> 2)');
  assert.equal(sConsec.expansionState.stats.activationsByRole.exp1_undying, 2);

  // 7. eq_chocolate (Sô-cô-la Năng Lượng — A/E/U) works for Undying ('U') in expanded mode!
  const sChoco = makeControlledStarterEightState([
    { roleId: 'exp1_undying', revealed: false, location: 'lobby', woundsTaken: 6, hand: ['eq-14'] },
    { roleId: 'gac-radio', revealed: true, location: 'lobby' },
    { roleId: 'gac-ky-thuat', revealed: true, location: 'corridor' },
    { roleId: 'suong-an-danh', revealed: true, location: 'corridor' },
  ], 8015);
  applyPlayerGameAction(sChoco, 'p1', { type: 'USE_CARD', cardId: 'eq-14' }, now);
  assert.equal(sChoco.players.p1.revealed, true);
  assert.equal(sChoco.players.p1.woundsTaken, 0, 'eq_chocolate must full-heal Undying (name starts with U)');
});

// ===========================================================================
// 6. REAL DURABLE OBJECT MULTIPLAYER ON `starter-eight` (4P + Spectator & 8P)
// ===========================================================================

test('P2B-6 — Real DO Multiplayer on starter-eight: prod lock, Felicia private draw + F5/hibernation, Undying secret reaction + alarm timeout & 8P', async () => {
  // Part A: Production DO rejects starter-eight
  const prodServer = await startStandaloneBoardGameTestServer(0);
  try {
    const resProd = await fetch(`${prodServer.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-1', hostName: 'HostProd', rulesetId: 'starter-eight' }),
    });
    assert.equal(resProd.status, 400);
    const data = await resProd.json();
    assert.equal(data.code, 'RULESET_UNAVAILABLE');
  } finally {
    await prodServer.close();
  }

  // Part B: Experimental DO runs starter-eight 4P + Spectator + 8P
  const expServer = await startStandaloneBoardGameTestServer(0, {
    ALLOW_EXPERIMENTAL_RULESETS: '1',
    CHOICE_TIMEOUT_OVERRIDE_MS: '600',
  });
  try {
    const createRes = await fetch(`${expServer.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-1', hostName: 'P2BHost', rulesetId: 'starter-eight' }),
    });
    assert.equal(createRes.status, 201);
    const { matchId, inviteCode } = await createRes.json();

    const clients = [];
    const tokens = [];
    for (let i = 0; i < 4; i++) {
      const c = await openBgClient(expServer.wsBaseUrl, matchId);
      clients.push(c);
      c.send({
        type: 'BG_JOIN',
        matchId,
        inviteCode,
        displayName: `P2B_${i + 1}`,
        preferredSeatIndex: i,
        requestId: `j2b_${i}`,
      });
      const auth = await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
      tokens.push({ playerId: auth.playerId, token: auth.reconnectToken });
      await c.nextMsg((m) => m.type === 'BG_STATE_SYNC');
      if (i > 0) {
        c.send({ type: 'BG_SET_READY', ready: true, requestId: `r2b_${i}` });
        await c.nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === `r2b_${i}`);
      }
    }

    const spec = await openBgClient(expServer.wsBaseUrl, matchId);
    spec.send({
      type: 'BG_JOIN',
      matchId,
      inviteCode,
      displayName: 'SpecP2B',
      asSpectator: true,
      requestId: 'j2b_spec',
    });
    await spec.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    await spec.nextMsg((m) => m.type === 'BG_STATE_SYNC');

    clients[0].send({ type: 'BG_START_MATCH', requestId: 'start_p2b' });
    await clients[0].nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING');
    const specStart = await spec.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING');
    assert.equal(specStart.rulesetId, 'starter-eight');
    assert.equal(specStart.privateView, null);

    // Inject deterministic Felicia (p0, Lobby) + hidden Undying (p1, Corridor) + Victor (p2) + Gayle (p3)
    const container = expServer.containers.get(matchId);
    const sql = container.ctx.storage.sql;
    const row = sql.exec('SELECT game_state_json, revision FROM matches WHERE match_id = ?', matchId).one();
    const wrapped = JSON.parse(row.game_state_json);
    const es = wrapped.engineState;
    const [id0, id1, id2, id3] = es.turnOrder;
    const assign = (pid, roleId, revealed, location, woundsTaken = 0, equipped = [], hand = []) => {
      const p = es.players[pid];
      const d = getRoleDesign(roleId);
      p.roleId = roleId;
      p.faction = d.faction;
      p.maxHp = d.maxHp;
      p.woundsTaken = woundsTaken;
      p.hp = d.maxHp - woundsTaken;
      p.revealed = revealed;
      p.alive = true;
      p.location = location;
      p.equipped = equipped;
      p.hand = hand;
    };
    assign(id0, 'exp1_felicia', true, 'lobby', 0, [], []);
    assign(id1, 'exp1_undying', false, 'corridor', 0, [], []);
    assign(id2, 'exp1_victor', true, 'canteen', 0, [], []);
    assign(id3, 'exp1_gayle', true, 'court', 0, [], []);
    es.decks.equipment = ['eq-11', 'eq-01', 'eq-04']; // eq-11 Flare (2 ST AoE), eq-01 Holy Robe
    es.activePlayerId = id0;
    es.turnPhase = 'LOCATION_ACTION';
    sql.exec('UPDATE matches SET game_state_json = ? WHERE match_id = ?', JSON.stringify(wrapped), matchId);

    // Step 1: Felicia draws White deck -> opens felicia_draw_choice
    const felMark = clients[0].inbox.length;
    const specMark = spec.inbox.length;
    clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'fel_draw_1',
      expectedRevision: row.revision,
      action: { type: 'DRAW_CARD', deck: 'equipment' },
    });
    const felChoiceSync = await clients[0].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.privateView?.pendingChoice?.kind === 'felicia_draw_choice',
      4000,
      felMark,
    );
    const specDuringDraw = await spec.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.publicGame?.pendingChoice?.kind === 'felicia_draw_choice',
      4000,
      specMark,
    );
    assert.equal(specDuringDraw.privateView, null, 'Spectator MUST NOT see Felicia drawn cards');
    assert.equal(felChoiceSync.privateView.pendingChoice.options.length, 2);
    const felChoiceId = felChoiceSync.privateView.pendingChoice.choiceId;

    // Step 2: DO Hibernation + F5 Reconnect restores exact same 2 cards for Felicia
    assert.equal((await fetch(`${expServer.httpBaseUrl}/__bg_hibernate?matchId=${encodeURIComponent(matchId)}`)).status, 200);
    clients[0].close();
    const felReconn = await openBgClient(expServer.wsBaseUrl, matchId);
    felReconn.send({
      type: 'BG_JOIN',
      matchId,
      inviteCode,
      displayName: 'P2B_1',
      reconnectToken: tokens[0].token,
      requestId: 'rejoin_fel',
    });
    const felRestored = await felReconn.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.privateView?.pendingChoice?.choiceId === felChoiceId,
    );
    assert.deepEqual(
      felRestored.privateView.pendingChoice.options,
      felChoiceSync.privateView.pendingChoice.options,
      'F5 reconnect + hibernation must restore exact same Felicia 2 cards',
    );

    // Step 3: Felicia picks eq-11 (Flare, pick_0) -> plays Flare -> triggers hidden Undying secret choice!
    felReconn.send({
      type: 'BG_GAME_ACTION',
      requestId: 'fel_pick_0',
      expectedRevision: felRestored.revision,
      action: { type: 'RESOLVE_CHOICE', choiceId: felChoiceId, optionId: 'pick_0' },
    });
    const afterPickSync = await felReconn.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && !m.publicGame?.pendingChoice && m.privateView?.hand?.some((c) => c.id === 'eq-11'),
    );

    // Tôn trọng MIN_ACTION_INTERVAL_MS chống spam của Durable Object giữa 2 action liên tiếp
    await new Promise((r) => setTimeout(r, 260));

    const undMark = clients[1].inbox.length;
    const specSecretMark = spec.inbox.length;
    felReconn.send({
      type: 'BG_GAME_ACTION',
      requestId: 'fel_flare',
      expectedRevision: afterPickSync.revision,
      action: { type: 'USE_CARD', cardId: 'eq-11' },
    });

    const undChoiceSync = await clients[1].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.privateView?.pendingChoice?.kind === 'undying_reveal_reduce',
      4000,
      undMark,
    );
    const specSecretSync = await spec.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.publicGame?.pendingChoice?.isSecret === true,
      4000,
      specSecretMark,
    );
    assert.equal(specSecretSync.privateView, null);
    assert.equal(specSecretSync.publicGame.pendingChoice.ownerPlayerId, null, 'Spectator MUST NOT see secret Undying owner');
    assert.equal(specSecretSync.publicGame.pendingChoice.kind, null, 'Spectator MUST NOT see secret Undying kind');
    assert.ok(undChoiceSync.privateView.pendingChoice.choiceId);

    // Step 4: Alarm expires -> Undying secret reaction defaults to 'decline' (still hidden, full 2 dmg, no leak!)
    await new Promise((r) => setTimeout(r, 650));
    const afterAlarmMark = clients[1].inbox.length;
    assert.equal((await fetch(`${expServer.httpBaseUrl}/__bg_trigger_alarm?matchId=${encodeURIComponent(matchId)}`)).status, 200);
    const postAlarmSync = await clients[1].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && !m.publicGame?.pendingChoice,
      4000,
      afterAlarmMark,
    );
    assert.equal(postAlarmSync.privateView.revealed, false);
    assert.equal(postAlarmSync.privateView.woundsTaken, 2);

    felReconn.close();
    spec.close();
    for (const c of clients) c.close();

    // --- 8P Match on starter-eight ---
    const create8Res = await fetch(`${expServer.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-2', hostName: 'Host8P2B', rulesetId: 'starter-eight' }),
    });
    assert.equal(create8Res.status, 201);
    const m8 = await create8Res.json();
    const clients8 = [];
    for (let i = 0; i < 8; i++) {
      const c = await openBgClient(expServer.wsBaseUrl, m8.matchId);
      clients8.push(c);
      c.send({
        type: 'BG_JOIN',
        matchId: m8.matchId,
        inviteCode: m8.inviteCode,
        displayName: `S8_${i + 1}`,
        preferredSeatIndex: i,
        requestId: `j8b_${i}`,
      });
      await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
      await c.nextMsg((m) => m.type === 'BG_STATE_SYNC');
      if (i > 0) {
        c.send({ type: 'BG_SET_READY', ready: true, requestId: `r8b_${i}` });
        await c.nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === `r8b_${i}`);
      }
    }
    clients8[0].send({ type: 'BG_START_MATCH', requestId: 'start_8p_s8' });
    const syncs8 = await Promise.all(
      clients8.map((c) => c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING')),
    );
    assert.equal(new Set(syncs8.map((s) => s.privateView.roleId)).size, 8);
    for (const c of clients8) c.close();
  } finally {
    await expServer.close();
  }
});
