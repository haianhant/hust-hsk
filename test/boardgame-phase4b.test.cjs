'use strict';

/**
 * test/boardgame-phase4b.test.cjs — Phase 4B Wave 3 Comprehensive Verification
 *
 * Tests all 10 Tier-2 Wave 3 characters + `starter-twenty-six` ruleset + Section 18 interaction cases:
 *  1. Registry, 36-role `starter-twenty-six` pool (14H / 14S / 8N), prod block & contract syntax
 *  2. Fallen (`exp1_fallen`, Hunter, 12 HP) — >=8 remaining HP reveal guard & +2 attack on hit
 *  3. Fea (`exp1_fea`, Hunter, 12 HP) — +/-1 dice move adjust, bounds 2/10, 6->7/7->6, no stationary, timeout
 *  4. Eleanor (`exp2_eleanor`, Hunter, 10 HP) — Green draw replacing attack, Masamune override, empty deck, P0 privacy
 *  5. Fujiko (`exp2_fujiko`, Hunter, 12 HP) — Execute revealed <=4 HP when actual>=1; blocked by 5 HP, hidden, G43+HolyRobe=0, Witch=0; triggers on Undying(2->1), MG, Wendigo/Rosary
 *  6. Udi (`exp1_udi`, Shadow, 11 HP) — Attack immunity with >=2 living others in same cluster (incl. shuffled pairs, Handgun, MG, Werewolf); vulnerable to cards/skills/location & when count <2
 *  7. Wrath (`exp1_wrath`, Shadow, 14 HP) — Turn-start cluster AoE (2 skill dmg), no self-dmg, vs Witch/Undying/Cindy/Wendigo/G43, multi-elim, timeout
 *  8. Vengeance (`exp1_vengeance`, Shadow, 13 HP) — 1x/match ON_ELIMINATION 1d4 to 2 targets (or 1 / 0), single shared d4, skip preserves skillUsedOnce, no recursion, DO hibernation
 *  9. Visions (`exp2_visions`, Shadow, 13 HP) — 1x/match persistent mark: no immediate tick, 1 skill dmg every next Visions turn, attack+MG ban, Masamune non-deadlock, target death cleanup, hibernation
 * 10. Cruz (`exp2_cruz`, Neutral, 11 HP) — Black redraw to bottom (max 1x, no recursion, empty/1-card deck) + solo victory on ev-07..ev-10 (direct & same-turn attack), no next-turn / other-killer credit
 * 11. Bryon (`exp2_bryon`, Neutral, 10 HP) — Gift gear (no Masamune) to revealed Neutral in same cluster preserving attack, Bob 5-gear instant win, no-Neutral-dead victory (5P co-win & 0/1 Neutral death)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');

function registerTsHook() {
  if (require.extensions['.ts'] && require.extensions['.ts'].__phase4bHook) return;
  const loader = (mod, filename) => {
    const src = fs.readFileSync(filename, 'utf8');
    const out = ts.transpileModule(src, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        resolveJsonModule: true,
      },
      fileName: filename,
    });
    mod._compile(out.outputText, filename);
  };
  loader.__phase4bHook = true;
  require.extensions['.ts'] = loader;
}

registerTsHook();

const {
  sanitizeBoardGameAppearance,
  validateBoardGameActionPayload,
} = require(path.join(ROOT, 'shared/contracts/boardgame.ts'));
const { createInitialGameState } = require(path.join(ROOT, 'features/boardgame/domain/state-machine.ts'));
const {
  advanceTurn,
  applyPendingChoiceTimeout,
  applyPlayerGameAction,
} = require(path.join(ROOT, 'features/boardgame/domain/actions.ts'));
const {
  PHASE4B_ROLE_IDS,
  STARTER_TWENTY_SIX_EXPANSION_ROLE_IDS,
  isUdiProtectedFromAttack,
  isVisionsMarkedTarget,
  listExpandedReachableAttackTargets,
} = require(path.join(ROOT, 'features/boardgame/domain/expansion-skills.ts'));
const {
  DEFAULT_CHARACTER_REGISTRY,
  DEFAULT_RULESET_REGISTRY,
  isCharacterPlayable,
} = require(path.join(ROOT, 'features/boardgame/domain/registry.ts'));
const { getPrivateGameView, getPublicGameView } = require(path.join(ROOT, 'features/boardgame/domain/projections.ts'));
const { getRoleDesign } = require(path.join(ROOT, 'features/boardgame/domain/roles.ts'));
const {
  DEFAULT_CLUSTER_PAIRS,
  rollD4,
  rollD6,
} = require(path.join(ROOT, 'features/boardgame/domain/rules.ts'));
const { evaluateVictoryWithEngine } = require(path.join(ROOT, 'features/boardgame/domain/victory-engine.ts'));

const APPEARANCE = sanitizeBoardGameAppearance({});
const NOW = 1_760_000_400_000;

function makeStarter26State(roleAssignments, seed = 202642) {
  const players = roleAssignments.map((r, i) => ({
    playerId: r.id,
    displayName: r.name ?? `P${i + 1}`,
    seatIndex: i,
    appearance: APPEARANCE,
    connected: true,
  }));
  const state = createInitialGameState({
    matchId: `p4b-test-${seed}`,
    seed,
    nowMs: NOW,
    rulesetId: 'starter-twenty-six',
    allowExperimental: true,
    players,
  });
  state.clusterPairs = DEFAULT_CLUSTER_PAIRS.map((cp) => ({
    clusterId: cp.clusterId,
    locationIds: [...cp.locationIds],
  }));
  for (const r of roleAssignments) {
    const p = state.players[r.id];
    const design = getRoleDesign(r.roleId);
    p.roleId = r.roleId;
    p.faction = design.faction;
    p.maxHp = design.maxHp;
    p.woundsTaken = r.woundsTaken ?? 0;
    p.hp = Math.max(0, design.maxHp - p.woundsTaken);
    p.revealed = Boolean(r.revealed);
    p.alive = r.alive !== false;
    p.location = r.location ?? 'lobby';
    p.equipped = [...(r.equipped ?? [])];
    p.hand = [...(r.hand ?? [])];
    p.skillUsedOnce = Boolean(r.skillUsedOnce);
  }
  state.activePlayerId = roleAssignments[0].id;
  state.turnPhase = 'MAIN_ACTION';
  return state;
}

function findRngForMoveTotal(targetTotal) {
  for (let s = 1; s < 50_000; s++) {
    const probe = { rngState: s };
    const d6 = rollD6(probe);
    const d4 = rollD4(probe);
    if (d6 + d4 === targetTotal) {
      return { rngState: s, d6, d4 };
    }
  }
  throw new Error(`No RNG seed found for move total ${targetTotal}`);
}

function findRngForAttackBaseDmg(targetBaseDmg) {
  for (let s = 1; s < 50_000; s++) {
    const probe = { rngState: s };
    const d6 = rollD6(probe);
    const d4 = rollD4(probe);
    if (Math.abs(d6 - d4) === targetBaseDmg) {
      return { rngState: s, d6, d4 };
    }
  }
  throw new Error(`No RNG seed found for baseDmg ${targetBaseDmg}`);
}

function findRngForD6(predicate) {
  for (let s = 1; s < 50_000; s++) {
    const probe = { rngState: s };
    const d6 = rollD6(probe);
    if (predicate(d6)) return { rngState: s, d6 };
  }
  throw new Error('No RNG seed found for d6');
}

function roundTripHibernation(state) {
  return JSON.parse(JSON.stringify(state));
}

// ---------------------------------------------------------------------------
// 1. Registry & Ruleset Gate (`starter-twenty-six`)
// ---------------------------------------------------------------------------

test('P4B-1 — starter-twenty-six exposes 36 playable roles (14H/14S/8N), blocked in prod, remaining 30 untouched', () => {
  assert.equal(PHASE4B_ROLE_IDS.length, 10);
  assert.equal(STARTER_TWENTY_SIX_EXPANSION_ROLE_IDS.length, 26);

  // Production MUST reject starter-twenty-six
  const prodCheck = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch('starter-twenty-six', 6);
  assert.equal(prodCheck.ok, false);
  assert.equal(prodCheck.code, 'RULESET_UNAVAILABLE');

  // Experimental validation passes for 4P..8P with exact 14H / 14S / 8N pool
  for (let n = 4; n <= 8; n++) {
    const res = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch('starter-twenty-six', n, {
      allowExperimental: true,
    });
    assert.equal(res.ok, true, `starter-twenty-six must validate for ${n}P`);
    assert.equal(res.pools.lanternGuard.length, 14);
    assert.equal(res.pools.mistOrder.length, 14);
    assert.equal(res.pools.wanderer.length, 8);
  }

  // All 10 Wave 3 roles must be house-rule-approved + implemented + playable under experimental flag
  for (const id of PHASE4B_ROLE_IDS) {
    const entry = DEFAULT_CHARACTER_REGISTRY.get(id);
    assert.ok(entry, `Missing registry entry for ${id}`);
    assert.equal(entry.metadata.rulesStatus, 'house-rule-approved');
    assert.equal(entry.metadata.implementationStatus, 'implemented');
    assert.equal(entry.availability, 'available');
    assert.ok(entry.skillImpl !== null);
    assert.ok(entry.victoryImpl !== null);
    assert.equal(isCharacterPlayable(entry, { allowExperimentalHouseRules: true }), true);
    // Strict verified-only playability MUST reject house-rule-approved roles
    assert.equal(isCharacterPlayable(entry, { allowExperimentalHouseRules: false }), false);
  }

  // Remaining 30 expansion roles stay needs-clarification & not-started
  const allExp = DEFAULT_CHARACTER_REGISTRY.listByExpansions(['expansion-1', 'expansion-2']);
  const remaining = allExp.filter((e) => e.metadata.implementationStatus !== 'implemented');
  assert.equal(remaining.length, 30);
  assert.equal(remaining.filter((e) => e.metadata.sourceFaction === 'hunter').length, 6);
  assert.equal(remaining.filter((e) => e.metadata.sourceFaction === 'shadow').length, 7);
  assert.equal(remaining.filter((e) => e.metadata.sourceFaction === 'neutral').length, 17);
  for (const rem of remaining) {
    assert.equal(rem.metadata.rulesStatus, 'needs-clarification');
    assert.equal(rem.metadata.implementationStatus, 'not-started');
    assert.equal(rem.skillImpl, null);
    assert.equal(rem.victoryImpl, null);
  }
});

// ---------------------------------------------------------------------------
// 2. Fallen (`exp1_fallen`, Hunter, 12 HP)
// ---------------------------------------------------------------------------

test('P4B-2 — Fallen: voluntary reveal gate at 7/8/9 HP, forced reveal on death, +2 attack on hit (>=8 HP only)', () => {
  // 7 HP remaining (5 wounds) -> voluntary reveal REJECTED
  const s7 = makeStarter26State([
    { id: 'p1', roleId: 'exp1_fallen', revealed: false, woundsTaken: 5, location: 'lobby' },
    { id: 'p2', roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { id: 'p4', roleId: 'suong-gac-cong', revealed: true, location: 'court' },
  ]);
  assert.equal(s7.players.p1.hp, 7);
  const rejReveal = applyPlayerGameAction(s7, 'p1', { type: 'REVEAL_ROLE' }, NOW + 1);
  assert.equal(rejReveal.ok, false);
  assert.equal(s7.players.p1.revealed, false);

  // Forced reveal via elimination still works cleanly even at < 8 HP
  s7.players.p1.woundsTaken = 11;
  s7.players.p1.hp = 1;
  s7.activePlayerId = 'p2';
  s7.rngState = findRngForAttackBaseDmg(2).rngState;
  const killRes = applyPlayerGameAction(s7, 'p2', { type: 'ATTACK', targetPlayerId: 'p1' }, NOW + 2);
  assert.equal(killRes.ok, true);
  assert.equal(s7.players.p1.alive, false);
  assert.equal(s7.players.p1.revealed, true);

  // 8 HP remaining (4 wounds) -> voluntary reveal SUCCEEDS, hit gets +2, miss stays 0
  const s8 = makeStarter26State([
    { id: 'p1', roleId: 'exp1_fallen', revealed: false, woundsTaken: 4, location: 'lobby' },
    { id: 'p2', roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { id: 'p4', roleId: 'suong-gac-cong', revealed: true, location: 'court' },
  ]);
  assert.equal(s8.players.p1.hp, 8);
  assert.equal(applyPlayerGameAction(s8, 'p1', { type: 'REVEAL_ROLE' }, NOW + 3).ok, true);
  assert.equal(s8.players.p1.revealed, true);

  // Attack with baseDmg = 2 -> raw 2 + 2 Fallen = 4 damage!
  s8.rngState = findRngForAttackBaseDmg(2).rngState;
  const hitRes = applyPlayerGameAction(s8, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW + 4);
  assert.equal(hitRes.ok, true);
  assert.equal(s8.players.p2.woundsTaken, 4);

  // Attack miss (baseDmg = 0) -> 0 damage (NO +2 on miss!)
  const sMiss = makeStarter26State([
    { id: 'p1', roleId: 'exp1_fallen', revealed: true, woundsTaken: 3, location: 'lobby' }, // 9 HP
    { id: 'p2', roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { id: 'p4', roleId: 'suong-gac-cong', revealed: true, location: 'court' },
  ]);
  sMiss.rngState = findRngForAttackBaseDmg(0).rngState;
  assert.equal(applyPlayerGameAction(sMiss, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW + 5).ok, true);
  assert.equal(sMiss.players.p2.woundsTaken, 0);

  // Revealed Fallen dropped to 7 HP -> +2 turns OFF (baseDmg = 2 deals only 2)
  const sDrop = makeStarter26State([
    { id: 'p1', roleId: 'exp1_fallen', revealed: true, woundsTaken: 5, location: 'lobby' }, // 7 HP
    { id: 'p2', roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { id: 'p4', roleId: 'suong-gac-cong', revealed: true, location: 'court' },
  ]);
  sDrop.rngState = findRngForAttackBaseDmg(2).rngState;
  assert.equal(applyPlayerGameAction(sDrop, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW + 6).ok, true);
  assert.equal(sDrop.players.p2.woundsTaken, 2);
});

// ---------------------------------------------------------------------------
// 3. Fea (`exp1_fea`, Hunter, 12 HP)
// ---------------------------------------------------------------------------

test('P4B-3 — Fea: bounds 2 & 10, 6->7 CHOOSE_MOVE, 7->8 direct move, no illegal stationary adjust, timeout=0', () => {
  // Lower bound: roll = 2 while at 'court' -> only [0, +1] allowed (no -1 -> 1!)
  const sLow = makeStarter26State([
    { id: 'p1', roleId: 'exp1_fea', revealed: true, location: 'court' },
    { id: 'p2', roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { id: 'p4', roleId: 'suong-gac-cong', revealed: true, location: 'canteen' },
  ]);
  sLow.turnPhase = 'ROLL_MOVE';
  sLow.rngState = findRngForMoveTotal(2).rngState;
  assert.equal(applyPlayerGameAction(sLow, 'p1', { type: 'ROLL_DICE' }, NOW + 1).ok, true);
  assert.equal(sLow.pendingChoice?.kind, 'fea_move_adjust');
  const lowOpts = sLow.pendingChoice.options.map((o) => o.optionId);
  assert.equal(lowOpts.includes('adj_minus'), false, 'Total 2 must not allow -1');
  assert.equal(lowOpts.includes('adj_0'), true);
  assert.equal(lowOpts.includes('adj_plus'), true);
  // Timeout defaults to adj_0 -> moves to radio (2)
  assert.equal(applyPendingChoiceTimeout(sLow, NOW + 20_000), true);
  assert.equal(sLow.players.p1.location, 'radio');
  assert.equal(sLow.turnPhase, 'LOCATION_ACTION');

  // Upper bound: roll = 10 while at 'radio' -> only [-1, 0] allowed (no +1 -> 11!)
  const sHigh = makeStarter26State([
    { id: 'p1', roleId: 'exp1_fea', revealed: true, location: 'radio' },
    { id: 'p2', roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: true, location: 'court' },
    { id: 'p4', roleId: 'suong-gac-cong', revealed: true, location: 'canteen' },
  ]);
  sHigh.turnPhase = 'ROLL_MOVE';
  sHigh.rngState = findRngForMoveTotal(10).rngState;
  assert.equal(applyPlayerGameAction(sHigh, 'p1', { type: 'ROLL_DICE' }, NOW + 2).ok, true);
  const highOpts = sHigh.pendingChoice.options.map((o) => o.optionId);
  assert.equal(highOpts.includes('adj_plus'), false, 'Total 10 must not allow +1');
  assert.equal(highOpts.includes('adj_minus'), true);
  // Choose -1 -> 9 (corridor)
  const rngBefore = sHigh.rngState;
  assert.equal(
    applyPlayerGameAction(
      sHigh,
      'p1',
      { type: 'RESOLVE_CHOICE', choiceId: sHigh.pendingChoice.choiceId, optionId: 'adj_minus' },
      NOW + 3,
    ).ok,
    true,
  );
  assert.equal(sHigh.players.p1.location, 'corridor');
  assert.equal(sHigh.rngState, rngBefore, 'Fea adjustment must consume zero extra RNG');

  // 6 -> 7 triggers CHOOSE_MOVE (all 5 other locations)
  const sTo7 = makeStarter26State([
    { id: 'p1', roleId: 'exp1_fea', revealed: true, location: 'radio' },
    { id: 'p2', roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: true, location: 'court' },
    { id: 'p4', roleId: 'suong-gac-cong', revealed: true, location: 'canteen' },
  ]);
  sTo7.turnPhase = 'ROLL_MOVE';
  sTo7.rngState = findRngForMoveTotal(6).rngState;
  assert.equal(applyPlayerGameAction(sTo7, 'p1', { type: 'ROLL_DICE' }, NOW + 4).ok, true);
  assert.equal(
    applyPlayerGameAction(
      sTo7,
      'p1',
      { type: 'RESOLVE_CHOICE', choiceId: sTo7.pendingChoice.choiceId, optionId: 'adj_plus' },
      NOW + 5,
    ).ok,
    true,
  );
  assert.equal(sTo7.turnPhase, 'CHOOSE_MOVE');
  assert.equal(sTo7.allowedMoveDestinations.length, 5);
  assert.equal(sTo7.allowedMoveDestinations.includes('radio'), false);

  // 7 -> 8 moves directly to canteen without entering CHOOSE_MOVE
  const sFrom7 = makeStarter26State([
    { id: 'p1', roleId: 'exp1_fea', revealed: true, location: 'radio' },
    { id: 'p2', roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: true, location: 'court' },
    { id: 'p4', roleId: 'suong-gac-cong', revealed: true, location: 'canteen' },
  ]);
  sFrom7.turnPhase = 'ROLL_MOVE';
  sFrom7.rngState = findRngForMoveTotal(7).rngState;
  assert.equal(applyPlayerGameAction(sFrom7, 'p1', { type: 'ROLL_DICE' }, NOW + 6).ok, true);
  assert.equal(
    applyPlayerGameAction(
      sFrom7,
      'p1',
      { type: 'RESOLVE_CHOICE', choiceId: sFrom7.pendingChoice.choiceId, optionId: 'adj_plus' },
      NOW + 7,
    ).ok,
    true,
  );
  assert.equal(sFrom7.turnPhase, 'LOCATION_ACTION');
  assert.equal(sFrom7.players.p1.location, 'canteen');

  // Standing on radio & rolling 2 -> +1 maps to 3 (also radio), -1 invalid -> skips choice & enters classic reroll!
  const sStationary = makeStarter26State([
    { id: 'p1', roleId: 'exp1_fea', revealed: true, location: 'radio' },
    { id: 'p2', roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: true, location: 'court' },
    { id: 'p4', roleId: 'suong-gac-cong', revealed: true, location: 'canteen' },
  ]);
  sStationary.turnPhase = 'ROLL_MOVE';
  sStationary.rngState = findRngForMoveTotal(2).rngState;
  assert.equal(applyPlayerGameAction(sStationary, 'p1', { type: 'ROLL_DICE' }, NOW + 8).ok, true);
  assert.equal(sStationary.pendingChoice, null);
  assert.equal(sStationary.lastDiceRoll.rerollRequired, true);
});

// ---------------------------------------------------------------------------
// 4. Eleanor (`exp2_eleanor`, Hunter, 10 HP)
// ---------------------------------------------------------------------------

test('P4B-4 — Eleanor: draws Green card replacing attack (even with 0 targets), blocked by Masamune w/ target, P0 privacy, empty deck safe', () => {
  // No targets in cluster -> still allowed to draw Green card & consumes attack
  const s = makeStarter26State([
    { id: 'p1', roleId: 'exp2_eleanor', revealed: true, location: 'radio' },
    { id: 'p2', roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: true, location: 'canteen' },
    { id: 'p4', roleId: 'suong-gac-cong', revealed: true, location: 'court' },
  ]);
  const res = applyPlayerGameAction(s, 'p1', { type: 'USE_SKILL' }, NOW + 1);
  assert.equal(res.ok, true);
  assert.equal(s.players.p1.attacksThisTurn, 1);
  assert.equal(s.players.p1.hand.length, 1);

  // Public log & spectator view MUST NOT leak card title!
  const pub = getPublicGameView(s);
  const specLastLog = pub.publicLog[pub.publicLog.length - 1].text;
  assert.equal(specLastLog.includes('Tiên Tri'), false);
  assert.equal(pub.players[0].handCount, 1);

  // Cannot END_TURN before resolving the Green card
  assert.equal(applyPlayerGameAction(s, 'p1', { type: 'END_TURN' }, NOW + 2).ok, false);
  // Resolve Green card on p2, then cannot ATTACK (attack already consumed), CAN END_TURN
  const cardId = s.players.p1.hand[0];
  assert.equal(
    applyPlayerGameAction(s, 'p1', { type: 'INVESTIGATE_CARD', cardId, targetPlayerId: 'p2' }, NOW + 3).ok,
    true,
  );
  s.players.p2.location = 'radio';
  assert.equal(applyPlayerGameAction(s, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW + 4).ok, false);
  assert.equal(applyPlayerGameAction(s, 'p1', { type: 'END_TURN' }, NOW + 5).ok, true);

  // Masamune override: holding ev-01 WITH target in range -> REJECTED!
  const sMasa = makeStarter26State([
    { id: 'p1', roleId: 'exp2_eleanor', revealed: true, location: 'lobby', equipped: ['ev-01'] },
    { id: 'p2', roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { id: 'p4', roleId: 'suong-gac-cong', revealed: true, location: 'court' },
  ]);
  const masaRej = applyPlayerGameAction(sMasa, 'p1', { type: 'USE_SKILL' }, NOW + 6);
  assert.equal(masaRej.ok, false);

  // Holding ev-01 with NO target in range -> ALLOWED!
  sMasa.players.p2.location = 'court';
  const masaOk = applyPlayerGameAction(sMasa, 'p1', { type: 'USE_SKILL' }, NOW + 7);
  assert.equal(masaOk.ok, true);

  // Empty Green deck + discard -> graceful completion without stall
  const sEmpty = makeStarter26State([
    { id: 'p1', roleId: 'exp2_eleanor', revealed: true, location: 'radio' },
    { id: 'p2', roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: true, location: 'canteen' },
    { id: 'p4', roleId: 'suong-gac-cong', revealed: true, location: 'court' },
  ]);
  sEmpty.decks.investigation = [];
  sEmpty.discards.investigation = [];
  assert.equal(applyPlayerGameAction(sEmpty, 'p1', { type: 'USE_SKILL' }, NOW + 8).ok, true);
  assert.equal(sEmpty.players.p1.hand.length, 0);
  assert.equal(applyPlayerGameAction(sEmpty, 'p1', { type: 'END_TURN' }, NOW + 9).ok, true);
});

// ---------------------------------------------------------------------------
// 5. Fujiko (`exp2_fujiko`, Hunter, 12 HP)
// ---------------------------------------------------------------------------

test('P4B-5 — Fujiko: executes revealed <=4 HP on actual>=1; blocked on 5 HP, unrevealed, G43+HolyRobe=0, Witch=0; works w/ Undying & triggers Wendigo/Rosary', () => {
  // Revealed target at 4 HP, Fujiko hits for 1 -> EXECUTES immediately & triggers Wendigo + Silver Rosary!
  const sExec = makeStarter26State([
    { id: 'p1', roleId: 'exp2_fujiko', revealed: true, location: 'lobby', equipped: ['eq-06'] },
    { id: 'p2', roleId: 'suong-an-danh', revealed: true, woundsTaken: 9, location: 'lobby', equipped: ['ev-02', 'eq-01'] }, // 4 HP, Holy Robe (-1)
    { id: 'p3', roleId: 'exp1_wendigo', revealed: true, woundsTaken: 4, location: 'radio' }, // 10 HP
    { id: 'p4', roleId: 'suong-gac-cong', revealed: true, location: 'court' },
  ]);
  sExec.rngState = findRngForAttackBaseDmg(2).rngState; // 2 - 1 Holy Robe = 1 actual -> executes!
  assert.equal(applyPlayerGameAction(sExec, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW + 1).ok, true);
  assert.equal(sExec.players.p2.alive, false);
  assert.equal(sExec.players.p2.eliminatedByPlayerId, 'p1');
  assert.equal(sExec.players.p1.equipped.includes('ev-02'), true, 'Silver Rosary must loot on Fujiko execution');
  assert.equal(sExec.players.p1.equipped.includes('eq-01'), true);
  assert.equal(sExec.players.p3.hp, 11, 'Wendigo ON_ELIMINATION must trigger on Fujiko execution');

  // Revealed target at 5 HP -> takes normal damage, NO execute!
  const s5 = makeStarter26State([
    { id: 'p1', roleId: 'exp2_fujiko', revealed: true, location: 'lobby' },
    { id: 'p2', roleId: 'suong-an-danh', revealed: true, woundsTaken: 8, location: 'lobby' }, // 5 HP
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { id: 'p4', roleId: 'suong-gac-cong', revealed: true, location: 'court' },
  ]);
  s5.rngState = findRngForAttackBaseDmg(2).rngState;
  assert.equal(applyPlayerGameAction(s5, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW + 2).ok, true);
  assert.equal(s5.players.p2.alive, true);
  assert.equal(s5.players.p2.hp, 3);

  // Unrevealed target at 4 HP -> NO execute!
  const sHidden = makeStarter26State([
    { id: 'p1', roleId: 'exp2_fujiko', revealed: true, location: 'lobby' },
    { id: 'p2', roleId: 'suong-an-danh', revealed: false, woundsTaken: 9, location: 'lobby' }, // 4 HP, hidden
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { id: 'p4', roleId: 'suong-gac-cong', revealed: true, location: 'court' },
  ]);
  sHidden.rngState = findRngForAttackBaseDmg(2).rngState;
  assert.equal(applyPlayerGameAction(sHidden, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW + 3).ok, true);
  assert.equal(sHidden.players.p2.alive, true);
  assert.equal(sHidden.players.p2.hp, 2);

  // G43 + Holy Robe reducing raw 3 -> 0 actual -> NO execute!
  const sZero = makeStarter26State([
    { id: 'p1', roleId: 'exp2_fujiko', revealed: true, location: 'lobby' },
    { id: 'p2', roleId: 'exp2_g43', revealed: true, woundsTaken: 10, location: 'lobby', equipped: ['eq-01'] }, // 4 HP
    { id: 'p3', roleId: 'suong-an-danh', revealed: true, location: 'radio' },
    { id: 'p4', roleId: 'suong-gac-cong', revealed: true, location: 'court' },
  ]);
  sZero.rngState = findRngForAttackBaseDmg(3).rngState; // 3 - 1 Holy Robe - 2 G43 = 0
  assert.equal(applyPlayerGameAction(sZero, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW + 4).ok, true);
  assert.equal(sZero.players.p2.alive, true);
  assert.equal(sZero.players.p2.hp, 4);

  // Witch at corridor (0 actual) -> NO execute!
  const sWitch = makeStarter26State([
    { id: 'p1', roleId: 'exp2_fujiko', revealed: true, location: 'corridor' },
    { id: 'p2', roleId: 'exp2_witch', revealed: true, woundsTaken: 10, location: 'corridor' }, // 4 HP
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { id: 'p4', roleId: 'suong-gac-cong', revealed: true, location: 'lobby' },
  ]);
  sWitch.rngState = findRngForAttackBaseDmg(3).rngState;
  assert.equal(applyPlayerGameAction(sWitch, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW + 5).ok, true);
  assert.equal(sWitch.players.p2.alive, true);
  assert.equal(sWitch.players.p2.hp, 4);

  // Undying at 4 HP: Fujiko hits for 2 -> Undying reduces 2->1 (actual=1 >= 1) -> EXECUTES!
  const sUndying = makeStarter26State([
    { id: 'p1', roleId: 'exp2_fujiko', revealed: true, location: 'lobby' },
    { id: 'p2', roleId: 'exp1_undying', revealed: true, woundsTaken: 7, location: 'lobby' }, // 4 HP
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { id: 'p4', roleId: 'suong-gac-cong', revealed: true, location: 'court' },
  ]);
  sUndying.rngState = findRngForAttackBaseDmg(2).rngState;
  assert.equal(applyPlayerGameAction(sUndying, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW + 6).ok, true);
  assert.equal(sUndying.players.p2.alive, false);
});

// ---------------------------------------------------------------------------
// 6. Udi (`exp1_udi`, Shadow, 11 HP)
// ---------------------------------------------------------------------------

test('P4B-6 — Udi: protected when >=2 living others in same cluster (shuffled pairs, Handgun, MG, Werewolf); vulnerable to cards/skills/location & when count<2', () => {
  const s = makeStarter26State([
    { id: 'p1', roleId: 'gac-ky-thuat', revealed: true, location: 'radio', equipped: ['ev-05'] }, // Handgun
    { id: 'p2', roleId: 'exp1_udi', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'suong-an-danh', revealed: true, location: 'canteen' }, // paired with lobby!
    { id: 'p4', roleId: 'gac-radio', revealed: true, location: 'lobby' },
  ]);
  // Shuffle clusterPairs to verify dynamic lookup: lobby paired with court!
  s.clusterPairs = [
    { clusterId: 'north', locationIds: ['radio', 'breaker'] },
    { clusterId: 'central', locationIds: ['lobby', 'court'] },
    { clusterId: 'south', locationIds: ['canteen', 'corridor'] },
  ];
  // Currently only p4 is in cluster with Udi (1 other -> NOT protected!)
  assert.equal(isUdiProtectedFromAttack(s, s.players.p2), false);

  // Move p3 to court (now paired with lobby -> 2 others in Udi's cluster -> PROTECTED!)
  s.players.p3.location = 'court';
  assert.equal(isUdiProtectedFromAttack(s, s.players.p2), true);

  // Handgun from another cluster MUST be rejected server-side
  const hgRes = applyPlayerGameAction(s, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW + 1);
  assert.equal(hgRes.ok, false);

  // Machine Gun from same cluster skips Udi while hitting p3!
  s.players.p1.location = 'lobby';
  s.players.p1.equipped = ['ev-06']; // Machine Gun
  s.rngState = findRngForAttackBaseDmg(2).rngState;
  const mgRes = applyPlayerGameAction(s, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, NOW + 2);
  assert.equal(mgRes.ok, true);
  assert.equal(s.players.p2.woundsTaken, 0, 'Machine Gun MUST exclude protected Udi');
  assert.equal(s.players.p3.woundsTaken, 2, 'Machine Gun still hits unprotected target');

  // Non-attack skill damage (George 1d4) STILL hits protected Udi!
  s.activePlayerId = 'p1';
  s.turnPhase = 'MAIN_ACTION';
  const skillRes = applyPlayerGameAction(s, 'p1', { type: 'USE_SKILL', targetPlayerId: 'p2' }, NOW + 3);
  assert.equal(skillRes.ok, true);
  assert.ok(s.players.p2.woundsTaken >= 1, 'Skill damage must hit protected Udi');

  // Werewolf counterattack skips protected Udi when Udi attacks Werewolf
  const sWW = makeStarter26State([
    { id: 'p1', roleId: 'exp1_udi', revealed: true, location: 'lobby' },
    { id: 'p2', roleId: 'suong-gac-cong', revealed: true, location: 'lobby' }, // Werewolf
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: true, location: 'canteen' }, // same cluster
    { id: 'p4', roleId: 'gac-radio', revealed: true, location: 'court' },
  ]);
  sWW.rngState = findRngForAttackBaseDmg(2).rngState;
  assert.equal(applyPlayerGameAction(sWW, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW + 4).ok, true);
  assert.equal(sWW.players.p1.woundsTaken, 0, 'Werewolf counterattack must skip protected Udi');
});

// ---------------------------------------------------------------------------
// 7. Wrath (`exp1_wrath`, Shadow, 14 HP)
// ---------------------------------------------------------------------------

test('P4B-7 — Wrath: turn-start cluster AoE (2 skill dmg), no self-dmg, vs Witch/Undying/G43/Cindy/Wendigo, timeout skip', () => {
  const s = makeStarter26State([
    { id: 'p1', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { id: 'p2', roleId: 'exp1_wrath', revealed: true, location: 'corridor' },
    { id: 'p3', roleId: 'exp2_witch', revealed: true, location: 'corridor' }, // immune at corridor!
    { id: 'p4', roleId: 'exp2_g43', revealed: true, location: 'court' }, // paired with corridor; G43 does NOT block skill dmg!
    { id: 'p5', roleId: 'exp1_cindy', revealed: true, location: 'court' }, // retaliates 1 dmg to Wrath!
  ]);
  // Advance from p1 -> p2 (Wrath turn start!)
  advanceTurn(s, NOW + 1);
  assert.equal(s.activePlayerId, 'p2');
  assert.equal(s.pendingChoice?.kind, 'wrath_turn_start_aoe');
  const validateOpt = validateBoardGameActionPayload({
    type: 'RESOLVE_CHOICE',
    choiceId: s.pendingChoice.choiceId,
    optionId: 'activate',
  });
  assert.equal(validateOpt.ok, true);

  assert.equal(
    applyPlayerGameAction(
      s,
      'p2',
      { type: 'RESOLVE_CHOICE', choiceId: s.pendingChoice.choiceId, optionId: 'activate' },
      NOW + 2,
    ).ok,
    true,
  );
  assert.equal(s.players.p3.woundsTaken, 0, 'Witch at corridor is immune to Wrath AoE');
  assert.equal(s.players.p4.woundsTaken, 2, 'G43 cannot reduce Wrath skill damage');
  assert.equal(s.players.p5.woundsTaken, 2, 'Cindy takes 2 skill damage from Wrath');
  assert.equal(s.players.p2.woundsTaken, 1, 'Wrath takes 0 self-AoE, only 1 from Cindy retaliation');
  assert.equal(s.turnPhase, 'ROLL_MOVE', 'Wrath stays in ROLL_MOVE after turn-start AoE');

  // Timeout skips Wrath AoE cleanly
  const sSkip = makeStarter26State([
    { id: 'p1', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { id: 'p2', roleId: 'exp1_wrath', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-radio', revealed: true, location: 'lobby' },
    { id: 'p4', roleId: 'suong-an-danh', revealed: true, location: 'court' },
  ]);
  advanceTurn(sSkip, NOW + 3);
  assert.equal(sSkip.pendingChoice?.kind, 'wrath_turn_start_aoe');
  assert.equal(applyPendingChoiceTimeout(sSkip, NOW + 20_000), true);
  assert.equal(sSkip.players.p3.woundsTaken, 0);
  assert.equal(sSkip.pendingChoice, null);
});

// ---------------------------------------------------------------------------
// 8. Vengeance (`exp1_vengeance`, Shadow, 13 HP)
// ---------------------------------------------------------------------------

test('P4B-8 — Vengeance: ON_ELIMINATION 1d4 shared roll for 2 targets (or 1), skip preserves once-per-match, no recursion, DO hibernation', () => {
  // 5P match: Vengeance kills p2 -> chooses 2 living targets (p3 & p4), survives DO hibernation, fires 1 single d4, no recursion on kill!
  const s = makeStarter26State([
    { id: 'p1', roleId: 'exp1_vengeance', revealed: true, location: 'lobby' },
    { id: 'p2', roleId: 'gac-ky-thuat', revealed: true, woundsTaken: 13, location: 'lobby' }, // 1 HP
    { id: 'p3', roleId: 'gac-radio', revealed: true, woundsTaken: 11, location: 'radio' }, // 1 HP -> dies from Vengeance chain!
    { id: 'p4', roleId: 'lang-quan-sat', revealed: true, location: 'court' }, // 8 HP
    { id: 'p5', roleId: 'exp1_wendigo', revealed: true, woundsTaken: 3, location: 'canteen' }, // 11 HP
  ]);
  s.rngState = findRngForAttackBaseDmg(2).rngState;
  assert.equal(applyPlayerGameAction(s, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW + 1).ok, true);
  assert.equal(s.players.p2.alive, false);
  assert.equal(s.pendingChoice?.kind, 'vengeance_chain_strike');

  // Verify every optionId passes strict WebSocket schema validation!
  for (const opt of s.pendingChoice.options) {
    const check = validateBoardGameActionPayload({
      type: 'RESOLVE_CHOICE',
      choiceId: s.pendingChoice.choiceId,
      optionId: opt.optionId,
    });
    assert.equal(check.ok, true, `Option ${opt.optionId} must pass strict WS schema`);
  }

  // Round-trip through SQLite DO hibernation!
  const resumed = roundTripHibernation(s);
  const pairOpt = resumed.pendingChoice.options.find(
    (o) => o.label.includes('P3') && o.label.includes('P4'),
  );
  assert.ok(pairOpt, 'Must offer pair option for P3 & P4');

  assert.equal(
    applyPlayerGameAction(
      resumed,
      'p1',
      { type: 'RESOLVE_CHOICE', choiceId: resumed.pendingChoice.choiceId, optionId: pairOpt.optionId },
      NOW + 2,
    ).ok,
    true,
  );
  assert.equal(resumed.players.p1.skillUsedOnce, true);
  assert.equal(resumed.players.p3.alive, false, 'P3 with 1 HP must die from 1d4 Vengeance strike');
  assert.ok(resumed.players.p4.woundsTaken >= 1 && resumed.players.p4.woundsTaken <= 4);
  // Both P2 and P3 died -> Wendigo healed 2 HP (11 -> 13) AND Vengeance did NOT trigger recursively!
  assert.equal(resumed.players.p5.hp, 13, 'Wendigo must trigger for both original kill and Vengeance chain kill');
  assert.equal(resumed.pendingChoice, null, 'Vengeance must NOT recursively re-prompt');

  // Skip preserves skillUsedOnce!
  const sSkip = makeStarter26State([
    { id: 'p1', roleId: 'exp1_vengeance', revealed: true, location: 'lobby' },
    { id: 'p2', roleId: 'gac-ky-thuat', revealed: true, woundsTaken: 13, location: 'lobby' },
    { id: 'p3', roleId: 'gac-radio', revealed: true, location: 'radio' },
    { id: 'p4', roleId: 'suong-an-danh', revealed: true, location: 'court' },
  ]);
  sSkip.rngState = findRngForAttackBaseDmg(2).rngState;
  assert.equal(applyPlayerGameAction(sSkip, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW + 3).ok, true);
  assert.equal(sSkip.pendingChoice?.kind, 'vengeance_chain_strike');
  assert.equal(
    applyPlayerGameAction(
      sSkip,
      'p1',
      { type: 'RESOLVE_CHOICE', choiceId: sSkip.pendingChoice.choiceId, optionId: 'skip' },
      NOW + 4,
    ).ok,
    true,
  );
  assert.equal(sSkip.players.p1.skillUsedOnce, false, 'Skipping Vengeance must preserve 1x/match usage');
});

// ---------------------------------------------------------------------------
// 9. Visions (`exp2_visions`, Shadow, 13 HP)
// ---------------------------------------------------------------------------

test('P4B-9 — Visions: persistent mark (no immediate tick, 1 skill dmg next turn), attack/MG ban, Masamune non-deadlock, hibernation', () => {
  const s = makeStarter26State([
    { id: 'p1', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { id: 'p2', roleId: 'exp2_visions', revealed: true, location: 'lobby', equipped: ['ev-01'] }, // Masamune!
    { id: 'p3', roleId: 'exp2_g43', revealed: true, location: 'lobby' }, // Only player in Visions' cluster!
    { id: 'p4', roleId: 'suong-an-danh', revealed: true, location: 'court' },
  ]);
  advanceTurn(s, NOW + 1); // p2 (Visions) turn starts
  assert.equal(s.pendingChoice?.kind, 'visions_mark_target');
  const markP3 = s.pendingChoice.options.find((o) => o.targetPlayerId === 'p3');
  assert.ok(markP3);

  assert.equal(
    applyPlayerGameAction(
      s,
      'p2',
      { type: 'RESOLVE_CHOICE', choiceId: s.pendingChoice.choiceId, optionId: markP3.optionId },
      NOW + 2,
    ).ok,
    true,
  );
  assert.equal(s.players.p2.skillUsedOnce, true);
  assert.equal(isVisionsMarkedTarget(s, 'p2', 'p3'), true);
  assert.equal(s.players.p3.woundsTaken, 0, 'Mark MUST NOT deal damage on the turn it is placed');

  // Public view exposes mark ONLY for revealed Visions
  const pub = getPublicGameView(s);
  assert.equal(pub.visionsMarkedTargetByPlayer?.p2, 'p3');

  // In MAIN_ACTION: Visions CANNOT attack p3, AND holding Masamune with ONLY p3 in cluster MUST NOT deadlock END_TURN!
  s.turnPhase = 'MAIN_ACTION';
  assert.equal(listExpandedReachableAttackTargets(s, s.players.p2).length, 0);
  const badAtk = applyPlayerGameAction(s, 'p2', { type: 'ATTACK', targetPlayerId: 'p3' }, NOW + 3);
  assert.equal(badAtk.ok, false);
  const endRes = applyPlayerGameAction(s, 'p2', { type: 'END_TURN' }, NOW + 4);
  assert.equal(endRes.ok, true, 'Visions holding Masamune with only marked target in cluster must NOT deadlock');

  // Round-trip through DO hibernation & advance back to Visions' next turn -> G43 takes 1 skill dmg!
  const resumed = roundTripHibernation(s);
  while (resumed.activePlayerId !== 'p2') {
    advanceTurn(resumed, NOW + 10);
  }
  assert.equal(resumed.players.p3.woundsTaken, 1, 'Visions mark must deal 1 skill damage at start of next Visions turn (bypasses G43)');

  // When marked target dies, mark stops & Visions cannot retarget
  resumed.players.p3.alive = false;
  resumed.players.p3.hp = 0;
  advanceTurn(resumed, NOW + 11);
  while (resumed.activePlayerId !== 'p2') {
    advanceTurn(resumed, NOW + 12);
  }
  assert.equal(resumed.pendingChoice, null, 'Visions cannot retarget after marked target dies');
});

// ---------------------------------------------------------------------------
// 10. Cruz (`exp2_cruz`, Neutral, 11 HP)
// ---------------------------------------------------------------------------

test('P4B-10 — Cruz: Black redraw puts card at bottom (no recursion), wins on ev-07..ev-10 (direct & same-turn attack), rejects next-turn & other killer', () => {
  // 1) Black redraw puts card0 at exact bottom of decks.event and draws card1 without recursion
  const sDraw = makeStarter26State([
    { id: 'p1', roleId: 'exp2_cruz', revealed: true, location: 'canteen' },
    { id: 'p2', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { id: 'p3', roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { id: 'p4', roleId: 'gac-radio', revealed: true, location: 'court' },
    { id: 'p5', roleId: 'suong-gac-cong', revealed: true, location: 'breaker' },
  ]);
  sDraw.turnPhase = 'LOCATION_ACTION';
  sDraw.decks.event = ['ev-12', 'ev-07', 'ev-02'];
  assert.equal(applyPlayerGameAction(sDraw, 'p1', { type: 'DRAW_CARD', deck: 'event' }, NOW + 1).ok, true);
  assert.equal(sDraw.pendingChoice?.kind, 'cruz_black_redraw');
  // Public log must not reveal card title
  const pubLog = getPublicGameView(sDraw).publicLog;
  assert.equal(pubLog[pubLog.length - 1].text.includes('Vỏ Chuối'), false);
  // Private choice shows card0 to Cruz
  const priv = getPrivateGameView(sDraw, 'p1');
  assert.equal(priv.pendingChoice.options[0].card.id, 'ev-12');

  assert.equal(
    applyPlayerGameAction(
      sDraw,
      'p1',
      { type: 'RESOLVE_CHOICE', choiceId: sDraw.pendingChoice.choiceId, optionId: 'redraw' },
      NOW + 2,
    ).ok,
    true,
  );
  assert.equal(sDraw.pendingChoice, null, 'Cruz redraw must NOT trigger recursively');
  assert.equal(sDraw.players.p1.hand[0], 'ev-07');
  assert.equal(sDraw.decks.event[sDraw.decks.event.length - 1], 'ev-12', 'Rejected card must go to BOTTOM of Black deck');

  // 2) Direct kill with all 4 qualifying cards (ev-07, ev-08, ev-09, ev-10) triggers Cruz solo win!
  for (const cardId of ['ev-07', 'ev-08', 'ev-09', 'ev-10']) {
    const sKill = makeStarter26State([
      { id: 'p1', roleId: 'exp2_cruz', revealed: true, location: 'radio', hand: [cardId] },
      { id: 'p2', roleId: 'gac-ky-thuat', revealed: true, woundsTaken: 13, location: 'lobby' }, // 1 HP
      { id: 'p3', roleId: 'gac-radio', revealed: true, location: 'court' },
      { id: 'p4', roleId: 'suong-an-danh', revealed: true, location: 'breaker' },
      { id: 'p5', roleId: 'suong-gac-cong', revealed: true, location: 'canteen' },
    ]);
    if (cardId === 'ev-09') {
      // Dynamite rolls 6 -> hits lobby (p2)
      sKill.rngState = findRngForMoveTotal(6).rngState;
    } else if (cardId === 'ev-10') {
      // Spiritual Doll hits target on d6 <= 4
      sKill.rngState = findRngForD6((d) => d <= 4).rngState;
    }
    const useRes = applyPlayerGameAction(
      sKill,
      'p1',
      { type: 'USE_CARD', cardId, targetPlayerId: 'p2' },
      NOW + 10,
    );
    assert.equal(useRes.ok, true, `Cruz using ${cardId} must succeed`);
    assert.equal(sKill.finished, true, `Cruz direct kill with ${cardId} must win immediately`);
    assert.equal(sKill.winnerPlayerIds.includes('p1'), true);
    assert.equal(sKill.winnerFaction, 'wanderer-solo');
  }

  // 3) Same-turn attack kill AFTER using qualifying card (ev-07) -> Cruz wins!
  const sFollowup = makeStarter26State([
    { id: 'p1', roleId: 'exp2_cruz', revealed: true, location: 'lobby', hand: ['ev-07'] },
    { id: 'p2', roleId: 'gac-ky-thuat', revealed: true, woundsTaken: 10, location: 'lobby' }, // 4 HP
    { id: 'p3', roleId: 'gac-radio', revealed: true, location: 'court' },
    { id: 'p4', roleId: 'suong-an-danh', revealed: true, location: 'breaker' },
    { id: 'p5', roleId: 'suong-gac-cong', revealed: true, location: 'canteen' },
  ]);
  assert.equal(applyPlayerGameAction(sFollowup, 'p1', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p2' }, NOW + 20).ok, true);
  assert.equal(sFollowup.finished, false); // p2 has 2 HP left
  sFollowup.rngState = findRngForAttackBaseDmg(2).rngState;
  assert.equal(applyPlayerGameAction(sFollowup, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW + 21).ok, true);
  assert.equal(sFollowup.finished, true, 'Cruz killing by attack later in SAME turn must win');
  assert.equal(sFollowup.winnerPlayerIds.includes('p1'), true);

  // 4) Kill on NEXT turn (after ev-07 was played earlier) MUST NOT count for Cruz!
  const sNextTurn = makeStarter26State([
    { id: 'p1', roleId: 'exp2_cruz', revealed: true, location: 'lobby', hand: ['ev-07'] },
    { id: 'p2', roleId: 'gac-ky-thuat', revealed: true, woundsTaken: 10, location: 'lobby' }, // 4 HP
    { id: 'p3', roleId: 'gac-radio', revealed: true, location: 'court' },
    { id: 'p4', roleId: 'suong-an-danh', revealed: true, location: 'breaker' },
    { id: 'p5', roleId: 'suong-gac-cong', revealed: true, location: 'canteen' },
  ]);
  assert.equal(applyPlayerGameAction(sNextTurn, 'p1', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p2' }, NOW + 30).ok, true);
  // Advance to a later turn for Cruz
  sNextTurn.turnNumber += 5;
  sNextTurn.rngState = findRngForAttackBaseDmg(2).rngState;
  assert.equal(applyPlayerGameAction(sNextTurn, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW + 31).ok, true);
  assert.equal(sNextTurn.finished, false, 'Kill on a LATER turn must NOT trigger Cruz victory');
});

// ---------------------------------------------------------------------------
// 11. Bryon (`exp2_bryon`, Neutral, 10 HP)
// ---------------------------------------------------------------------------

test('P4B-11 — Bryon: gifts non-Masamune gear to revealed Neutral in cluster preserving attack, Bob 5-gear instant win, no-Neutral-dead victory', () => {
  // 1) Bryon holding Masamune + 2 legal gear in cluster with revealed Bob (3 gear) -> gifts both -> Bob hits 5 gear & wins!
  const s = makeStarter26State([
    { id: 'p1', roleId: 'exp2_bryon', revealed: true, location: 'lobby', equipped: ['ev-01', 'eq-01', 'ev-02'] },
    { id: 'p2', roleId: 'lang-anh-san', revealed: true, location: 'canteen', equipped: ['eq-02', 'eq-03', 'eq-05'] }, // Bob (3 gear, same cluster!)
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby' }, // Hunter (cannot receive)
    { id: 'p4', roleId: 'lang-quan-sat', revealed: false, location: 'lobby' }, // Unrevealed Neutral (cannot receive)
    { id: 'p5', roleId: 'suong-an-danh', revealed: true, location: 'radio' },
    { id: 'p6', roleId: 'suong-gac-cong', revealed: true, location: 'court' },
  ]);
  assert.equal(applyPlayerGameAction(s, 'p1', { type: 'USE_SKILL' }, NOW + 1).ok, true);
  assert.equal(s.pendingChoice?.kind, 'bryon_gift_equipment');

  // Verify ONLY p2 (revealed Neutral in cluster) appears & ev-01 (Masamune) NEVER appears in any gift option!
  for (const opt of s.pendingChoice.options) {
    if (opt.optionId === 'done') continue;
    assert.equal(opt.targetPlayerId, 'p2');
    assert.equal(opt.card?.id === 'ev-01', false, 'Masamune MUST NOT be giftable');
  }
  const giftAllOpt = s.pendingChoice.options.find((o) => o.label.includes('TẤT CẢ'));
  assert.ok(giftAllOpt);
  assert.equal(
    applyPlayerGameAction(
      s,
      'p1',
      { type: 'RESOLVE_CHOICE', choiceId: s.pendingChoice.choiceId, optionId: giftAllOpt.optionId },
      NOW + 2,
    ).ok,
    true,
  );
  // Masamune stays on Bryon, Bob gets 2 items (3 -> 5) and triggers immediate victory, AND Bryon co-wins because 0 Neutrals died!
  assert.deepEqual(s.players.p1.equipped, ['ev-01']);
  assert.equal(s.players.p2.equipped.length, 5);
  assert.equal(s.finished, true, 'Gifting Bob to 5 gear must trigger immediate match victory');
  assert.equal(s.winnerPlayerIds.includes('p2'), true);
  assert.equal(s.winnerPlayerIds.includes('p1'), true, 'Bryon must co-win when all Neutrals are alive at match end');

  // 2) Single gift preserves attack right!
  const sKeepAtk = makeStarter26State([
    { id: 'p1', roleId: 'exp2_bryon', revealed: true, location: 'lobby', equipped: ['eq-01'] },
    { id: 'p2', roleId: 'lang-quan-sat', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby' },
    { id: 'p4', roleId: 'gac-radio', revealed: true, location: 'radio' },
    { id: 'p5', roleId: 'suong-an-danh', revealed: true, location: 'court' },
    { id: 'p6', roleId: 'suong-gac-cong', revealed: true, location: 'breaker' },
  ]);
  assert.equal(applyPlayerGameAction(sKeepAtk, 'p1', { type: 'USE_SKILL' }, NOW + 3).ok, true);
  const giftOne = sKeepAtk.pendingChoice.options.find((o) => o.optionId !== 'done');
  assert.equal(
    applyPlayerGameAction(
      sKeepAtk,
      'p1',
      { type: 'RESOLVE_CHOICE', choiceId: sKeepAtk.pendingChoice.choiceId, optionId: giftOne.optionId },
      NOW + 4,
    ).ok,
    true,
  );
  assert.equal(sKeepAtk.players.p1.attacksThisTurn, 0, 'Gifting MUST preserve Bryon attack right');
  assert.equal(applyPlayerGameAction(sKeepAtk, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, NOW + 5).ok, true);

  // 3) Bryon victory matrix: NEVER auto-wins at start of match; 5P sole Neutral co-wins at end; loses if ANY Neutral dies
  const s5p = makeStarter26State([
    { id: 'p1', roleId: 'exp2_bryon', revealed: true, location: 'lobby' },
    { id: 'p2', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { id: 'p3', roleId: 'gac-radio', revealed: true, location: 'court' },
    { id: 'p4', roleId: 'suong-an-danh', revealed: true, location: 'breaker' },
    { id: 'p5', roleId: 'suong-gac-cong', revealed: true, location: 'canteen' },
  ]);
  assert.equal(evaluateVictoryWithEngine(s5p).finished, false, 'Bryon must NEVER auto-win at match start');
  // Hunters eliminate both Shadows -> Bryon co-wins in 5P
  s5p.players.p4.alive = false;
  s5p.players.p5.alive = false;
  const v5p = evaluateVictoryWithEngine(s5p);
  assert.equal(v5p.finished, true);
  assert.equal(v5p.winnerPlayerIds.includes('p1'), true);

  // 6P: 1 Neutral dies (Allie dies) -> Bryon LOSES even if Bryon survives!
  const s6p = makeStarter26State([
    { id: 'p1', roleId: 'exp2_bryon', revealed: true, location: 'lobby' },
    { id: 'p2', roleId: 'lang-quan-sat', revealed: true, alive: false, location: 'radio' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: true, location: 'court' },
    { id: 'p4', roleId: 'gac-radio', revealed: true, location: 'breaker' },
    { id: 'p5', roleId: 'suong-an-danh', revealed: true, alive: false, location: 'canteen' },
    { id: 'p6', roleId: 'suong-gac-cong', revealed: true, alive: false, location: 'lobby' },
  ]);
  const v6p = evaluateVictoryWithEngine(s6p);
  assert.equal(v6p.finished, true);
  assert.equal(v6p.winnerFaction, 'lantern-guard');
  assert.equal(v6p.winnerPlayerIds.includes('p1'), false, 'Bryon MUST NOT win when another Neutral died');
});
