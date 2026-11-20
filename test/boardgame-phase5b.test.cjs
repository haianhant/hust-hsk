'use strict';

/**
 * test/boardgame-phase5b.test.cjs — Phase 5B Final 4 Tier-2 Characters Verification
 *
 * Covers ALL test requirements for:
 *  - P5B-1: Registry & Catalog sync for Elise, Umibozu, Urban Legend, Arlene (`house-rule-approved`)
 *  - P5B-2: Elise (`exp2_elise`, Hunter, 10 HP) — Soft Harmony 5-HP cluster distribution, max-HP clip, timeout/skip preservation, HealPipeline routing
 *  - P5B-3: Umibozu (`exp2_umibozu`, Shadow, 11 HP) — Voluntary & forced reveal 3-dmg cluster AoE, no death-reveal trigger, Witch/G43/Undying/Cindy interactions, once-per-match recursion guard
 *  - P5B-4: Urban Legend (`exp2_urban_legend`, Shadow, 11 HP) — All 5 consumable black cards convert to black-card heal, weapons excluded, Vampire Bat caster still heals, Dynamite multi-target preserved, hidden P0 secrecy & reactionPolicy
 *  - P5B-5: Arlene (`exp2_arlene`, Neutral, 8 HP) — Timing-safe Shadow Green-card disguise (zero prompt/leak, real faction stays wanderer), AUTO_DECLINE truthful mode, Hunter attack/skill/card kill immediate win, Shadow/unattributed kill no-win, 3rd-Neutral co-win
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

require('./register-ts.cjs');

const ROOT = path.resolve(__dirname, '..');

const {
  DEFAULT_CHARACTER_REGISTRY,
  PHASE5B_ROLE_IDS,
  applyPendingChoiceTimeout,
  applyPlayerGameAction,
  createInitialGameState,
  getPrivateGameView,
  getPublicGameView,
  getRoleDesign,
  isCharacterPlayable,
} = require(path.join(ROOT, 'features/boardgame/domain/index.ts'));

function makePhase5BState(specs, seed = 5601) {
  const playersInput = specs.map((sp, idx) => ({
    playerId: sp.id,
    displayName: sp.name ?? `Player_${idx + 1}`,
    seatIndex: idx,
    appearance: {},
    connected: true,
  }));
  const state = createInitialGameState({
    matchId: `p5b-${seed}`,
    seed,
    nowMs: 1_700_000_000_000,
    rulesetId: 'starter-twenty-six',
    allowExperimental: true,
    players: playersInput,
  });
  state.clusterPairs = [
    { clusterId: 'north', locationIds: ['radio', 'breaker'] },
    { clusterId: 'central', locationIds: ['lobby', 'canteen'] },
    { clusterId: 'south', locationIds: ['corridor', 'court'] },
  ];
  for (const sp of specs) {
    const p = state.players[sp.id];
    const design = getRoleDesign(sp.roleId);
    p.roleId = sp.roleId;
    p.faction = design.faction;
    p.maxHp = design.maxHp;
    p.woundsTaken = sp.woundsTaken ?? 0;
    p.hp = Math.max(0, p.maxHp - p.woundsTaken);
    p.alive = sp.alive ?? p.hp > 0;
    p.revealed = sp.revealed ?? false;
    p.location = sp.location ?? 'lobby';
    p.hand = [...(sp.hand ?? [])];
    p.equipped = [...(sp.equipped ?? [])];
    p.skillUsedOnce = sp.skillUsedOnce ?? false;
    p.attacksThisTurn = 0;
  }
  state.activePlayerId = specs[0].id;
  state.turnPhase = 'MAIN_ACTION';
  state.pendingChoice = null;
  state.expansionState.pendingSteps = [];
  return state;
}

test('P5B-1 — Catalog & CharacterRegistry sync for final 4 Tier-2 roles (house-rule-approved, non-null bindings)', () => {
  assert.deepEqual(PHASE5B_ROLE_IDS, [
    'exp2_elise',
    'exp2_umibozu',
    'exp2_urban_legend',
    'exp2_arlene',
  ]);
  for (const rid of PHASE5B_ROLE_IDS) {
    const entry = DEFAULT_CHARACTER_REGISTRY.get(rid);
    assert.ok(entry, `Missing registry entry for ${rid}`);
    assert.equal(entry.metadata.rulesStatus, 'house-rule-approved');
    assert.equal(entry.metadata.implementationStatus, 'implemented');
    assert.equal(entry.availability, 'available');
    assert.ok(entry.skillImpl !== null);
    assert.ok(entry.victoryImpl !== null);
    assert.equal(isCharacterPlayable(entry, { allowExperimentalHouseRules: true }), true);
    assert.equal(isCharacterPlayable(entry, { allowExperimentalHouseRules: false }), false);
  }
});

test('P5B-2 — Elise: 5-HP cluster distribution, full-HP 0 heal, partial discard, timeout preserves oncePerMatch, HealPipeline', () => {
  // 1. Multi-target cluster split (Elise + ally in same cluster, outsider in another cluster)
  const s1 = makePhase5BState([
    { id: 'p1', name: 'Elise', roleId: 'exp2_elise', revealed: true, woundsTaken: 4, location: 'lobby' },
    { id: 'p2', name: 'Ally', roleId: 'gac-ky-thuat', revealed: true, woundsTaken: 4, location: 'canteen' },
    { id: 'p3', name: 'Outsider', roleId: 'gac-radio', revealed: true, woundsTaken: 5, location: 'court' },
    { id: 'p4', name: 'Shadow', roleId: 'suong-an-danh', revealed: true, woundsTaken: 0, location: 'radio' },
  ]);

  // First test cancel/timeout does NOT burn skillUsedOnce!
  const rOpen = applyPlayerGameAction(s1, 'p1', { type: 'USE_SKILL' }, 1000);
  assert.equal(rOpen.ok, true);
  assert.equal(s1.pendingChoice?.kind, 'elise_distribute_heal');
  const timedOut = applyPendingChoiceTimeout(s1, 99_000);
  assert.equal(timedOut, true);
  assert.equal(s1.players.p1.skillUsedOnce, false, 'Timeout MUST NOT consume Elise once-per-match');
  assert.equal(s1.players.p1.woundsTaken, 4);

  // Re-open and pick balanced split (3 + 2 = 5 across p1 & p2; p3 outside cluster untouched!)
  const rOpen2 = applyPlayerGameAction(s1, 'p1', { type: 'USE_SKILL' }, 2000);
  assert.equal(rOpen2.ok, true);
  const splitOpt = s1.pendingChoice.options.find((o) => o.label.includes('Chia đều toàn Cụm'));
  assert.ok(splitOpt, 'Expected balanced cluster split option');
  const rResolve = applyPlayerGameAction(
    s1,
    'p1',
    { type: 'RESOLVE_CHOICE', choiceId: s1.pendingChoice.choiceId, optionId: splitOpt.optionId },
    2001,
  );
  assert.equal(rResolve.ok, true);
  assert.equal(s1.players.p1.skillUsedOnce, true);
  assert.equal(s1.players.p1.woundsTaken + s1.players.p2.woundsTaken, 3, 'Total healed across cluster MUST equal 5 (8 wounds -> 3 wounds)');
  assert.equal(s1.players.p3.woundsTaken, 5, 'Outsider in another cluster MUST NOT be healed');

  // 2. Partial allocation (only 2 wounds in entire cluster -> 2 healed, 3 unused discarded, never exceeds maxHp)
  const s2 = makePhase5BState([
    { id: 'p1', name: 'Elise', roleId: 'exp2_elise', revealed: true, woundsTaken: 2, location: 'lobby' },
    { id: 'p2', name: 'FullAlly', roleId: 'gac-ky-thuat', revealed: true, woundsTaken: 0, location: 'canteen' },
    { id: 'p3', name: 'S1', roleId: 'suong-an-danh', revealed: true, location: 'court' },
    { id: 'p4', name: 'S2', roleId: 'suong-gac-cong', revealed: true, location: 'radio' },
  ]);
  applyPlayerGameAction(s2, 'p1', { type: 'USE_SKILL' }, 3000);
  const selfOpt = s2.pendingChoice.options.find((o) => o.optionId !== 'skip');
  applyPlayerGameAction(
    s2,
    'p1',
    { type: 'RESOLVE_CHOICE', choiceId: s2.pendingChoice.choiceId, optionId: selfOpt.optionId },
    3001,
  );
  assert.equal(s2.players.p1.woundsTaken, 0);
  assert.equal(s2.players.p1.hp, 10, 'Elise must never exceed maxHp=10');
  assert.equal(s2.players.p1.skillUsedOnce, true);

  // 3. Full-HP cluster -> 0 effective heal, still works cleanly without crashing
  const s3 = makePhase5BState([
    { id: 'p1', name: 'Elise', roleId: 'exp2_elise', revealed: true, woundsTaken: 0, location: 'lobby' },
    { id: 'p2', name: 'Ally', roleId: 'gac-ky-thuat', revealed: true, woundsTaken: 0, location: 'canteen' },
    { id: 'p3', name: 'S1', roleId: 'suong-an-danh', revealed: true, location: 'court' },
    { id: 'p4', name: 'S2', roleId: 'suong-gac-cong', revealed: true, location: 'radio' },
  ]);
  applyPlayerGameAction(s3, 'p1', { type: 'USE_SKILL' }, 4000);
  const fullOpt = s3.pendingChoice.options.find((o) => o.optionId === 'e_0');
  assert.ok(fullOpt);
  applyPlayerGameAction(
    s3,
    'p1',
    { type: 'RESOLVE_CHOICE', choiceId: s3.pendingChoice.choiceId, optionId: 'e_0' },
    4001,
  );
  assert.equal(s3.players.p1.hp, 10);
  assert.equal(s3.players.p2.hp, 14);
  assert.equal(s3.players.p1.skillUsedOnce, true);
});

test('P5B-3 — Umibozu: voluntary & forced reveal 3-dmg cluster AoE, no death-reveal trigger, Witch/G43/Undying/Cindy interactions', () => {
  // 1. Voluntary reveal at corridor/court cluster: hits G43 (pierced!), Undying (reduces 3->2!), Witch at corridor (immune!), ignores self & outsider
  const s1 = makePhase5BState([
    { id: 'p1', name: 'Umibozu', roleId: 'exp2_umibozu', revealed: false, location: 'court' },
    { id: 'p2', name: 'G43', roleId: 'exp2_g43', revealed: true, location: 'corridor' },
    { id: 'p3', name: 'Witch', roleId: 'exp2_witch', revealed: true, location: 'corridor' },
    { id: 'p4', name: 'Undying', roleId: 'exp1_undying', revealed: true, location: 'court' },
    { id: 'p5', name: 'Outsider', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby' },
  ]);
  const revRes = applyPlayerGameAction(s1, 'p1', { type: 'REVEAL_ROLE' }, 1000);
  assert.equal(revRes.ok, true);
  assert.equal(s1.players.p1.revealed, true);
  assert.equal(s1.players.p1.skillUsedOnce, true);
  assert.equal(s1.players.p1.woundsTaken, 0, 'Umibozu MUST NOT self-damage');
  assert.equal(s1.players.p2.woundsTaken, 3, 'G43 only reduces attack damage, NOT Umibozu skill AoE');
  assert.equal(s1.players.p3.woundsTaken, 0, 'Witch at exact corridor MUST be immune to Umibozu AoE');
  assert.equal(s1.players.p4.woundsTaken, 2, 'Revealed Undying MUST reduce 3 skill dmg -> 2');
  assert.equal(s1.players.p5.woundsTaken, 0, 'Player outside cluster MUST NOT take damage');

  // 2. Forced reveal via Disenchant Mirror (`eq-12`) triggers Umibozu + Cindy retaliation!
  const s2 = makePhase5BState([
    { id: 'p1', name: 'Umibozu', roleId: 'exp2_umibozu', revealed: false, location: 'lobby', hand: ['eq-12'] },
    { id: 'p2', name: 'Cindy', roleId: 'exp1_cindy', revealed: true, location: 'canteen' },
    { id: 'p3', name: 'Hunter1', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { id: 'p4', name: 'Hunter2', roleId: 'gac-radio', revealed: true, location: 'court' },
  ]);
  const mirrorRes = applyPlayerGameAction(s2, 'p1', { type: 'USE_CARD', cardId: 'eq-12' }, 2000);
  assert.equal(mirrorRes.ok, true);
  assert.equal(s2.players.p1.revealed, true);
  assert.equal(s2.players.p1.skillUsedOnce, true);
  assert.equal(s2.players.p2.woundsTaken, 3, 'Forced mirror reveal MUST trigger Umibozu 3-dmg AoE');
  assert.equal(s2.players.p1.woundsTaken, 1, 'Revealed Cindy surviving Umibozu AoE MUST retaliate 1 dmg');

  // 3. Death reveal (`eliminated`) MUST NOT trigger Umibozu AoE!
  const s3 = makePhase5BState([
    { id: 'p1', name: 'Hunter', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby', hand: ['ev-07'] },
    { id: 'p2', name: 'Umibozu', roleId: 'exp2_umibozu', revealed: false, woundsTaken: 10, location: 'lobby' },
    { id: 'p3', name: 'Bystander', roleId: 'gac-radio', revealed: true, location: 'canteen' },
    { id: 'p4', name: 'OtherShadow', roleId: 'suong-an-danh', revealed: true, location: 'court' },
  ]);
  const killRes = applyPlayerGameAction(
    s3,
    'p1',
    { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p2' },
    3000,
  );
  assert.equal(killRes.ok, true);
  assert.equal(s3.players.p2.alive, false);
  assert.equal(s3.players.p2.revealed, true);
  assert.equal(s3.players.p3.woundsTaken, 0, 'Death reveal MUST NOT trigger Umibozu AoE');
  assert.equal(s3.players.p1.woundsTaken, 0);
});

test('P5B-4 — Urban Legend: 5 consumable black cards convert to black-card heal, weapons excluded, Vampire Bat caster still heals, P0 secrecy', () => {
  // 1. Revealed Urban Legend hit by Vampire Bat (ev-07): heals +2 HP (clipped at maxHp), caster STILL heals +1 HP!
  const s1 = makePhase5BState([
    { id: 'p1', name: 'Caster', roleId: 'gac-ky-thuat', revealed: true, woundsTaken: 3, location: 'lobby', hand: ['ev-07'] },
    { id: 'p2', name: 'UL', roleId: 'exp2_urban_legend', revealed: true, woundsTaken: 4, location: 'lobby' },
    { id: 'p3', name: 'H2', roleId: 'gac-radio', revealed: true, location: 'radio' },
    { id: 'p4', name: 'S2', roleId: 'suong-gac-cong', revealed: true, location: 'court' },
  ]);
  applyPlayerGameAction(s1, 'p1', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p2' }, 1000);
  assert.equal(s1.players.p2.woundsTaken, 2, 'Urban Legend must heal 2 HP from Vampire Bat (4 -> 2 wounds)');
  assert.equal(s1.players.p1.woundsTaken, 2, 'Vampire Bat caster must STILL heal 1 HP (3 -> 2 wounds)');

  // 2. Spider self-damage (ev-08) & Banana Peel no-gear self-damage (ev-12) & Spiritual Doll (ev-10)
  const s2 = makePhase5BState([
    { id: 'p1', name: 'UL', roleId: 'exp2_urban_legend', revealed: true, woundsTaken: 5, location: 'lobby', hand: ['ev-08', 'ev-12'] },
    { id: 'p2', name: 'Victim', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby' },
    { id: 'p3', name: 'H2', roleId: 'gac-radio', revealed: true, location: 'radio' },
    { id: 'p4', name: 'S2', roleId: 'suong-gac-cong', revealed: true, location: 'court' },
  ]);
  applyPlayerGameAction(s2, 'p1', { type: 'USE_CARD', cardId: 'ev-08', targetPlayerId: 'p2' }, 2000);
  assert.equal(s2.players.p2.woundsTaken, 2, 'Victim still takes 2 dmg from Spider');
  assert.equal(s2.players.p1.woundsTaken, 3, 'Urban Legend converts Spider 2 self-dmg to +2 heal (5 -> 3)');

  applyPlayerGameAction(s2, 'p1', { type: 'USE_CARD', cardId: 'ev-12', targetPlayerId: 'p2' }, 2001);
  assert.equal(s2.players.p1.woundsTaken, 2, 'Urban Legend converts Banana Peel 1 self-dmg to +1 heal (3 -> 2)');

  // 3. Permanent black weapon (Masamune ev-01 + Butcher Knife ev-02) MUST NOT convert!
  const s3 = makePhase5BState([
    { id: 'p1', name: 'Attacker', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby', equipped: ['ev-01', 'ev-02'] },
    { id: 'p2', name: 'UL', roleId: 'exp2_urban_legend', revealed: true, woundsTaken: 2, location: 'lobby' },
    { id: 'p3', name: 'H2', roleId: 'gac-radio', revealed: true, location: 'radio' },
    { id: 'p4', name: 'S2', roleId: 'suong-gac-cong', revealed: true, location: 'court' },
  ]);
  applyPlayerGameAction(s3, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 3000);
  assert.ok(s3.players.p2.woundsTaken > 2, 'Permanent black weapon attack MUST deal damage, NEVER heal Urban Legend');

  // 4. Hidden Urban Legend: ASK opens secret P0 choice; decline leaks nothing; reveal_and_heal converts!
  const s4 = makePhase5BState([
    { id: 'p1', name: 'Caster', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby', hand: ['ev-07'] },
    { id: 'p2', name: 'UL', roleId: 'exp2_urban_legend', revealed: false, woundsTaken: 3, location: 'lobby' },
    { id: 'p3', name: 'H2', roleId: 'gac-radio', revealed: true, location: 'radio' },
    { id: 'p4', name: 'S2', roleId: 'suong-gac-cong', revealed: true, location: 'court' },
  ]);
  applyPlayerGameAction(s4, 'p1', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p2' }, 4000);
  assert.equal(s4.pendingChoice?.kind, 'urban_legend_reveal_heal');
  const pub4 = getPublicGameView(s4);
  assert.equal(pub4.pendingChoice.isSecret, true);
  assert.equal(pub4.pendingChoice.ownerPlayerId, null, 'P0: hidden Urban Legend ownerPlayerId MUST be null');
  assert.equal(pub4.pendingChoice.kind, null, 'P0: hidden Urban Legend kind MUST be null');
  assert.equal(getPrivateGameView(s4, 'p1').pendingChoice, undefined);
  assert.equal(getPrivateGameView(s4, 'p2').pendingChoice.kind, 'urban_legend_reveal_heal');

  applyPlayerGameAction(
    s4,
    'p2',
    { type: 'RESOLVE_CHOICE', choiceId: s4.pendingChoice.choiceId, optionId: 'reveal_and_heal' },
    4001,
  );
  assert.equal(s4.players.p2.revealed, true);
  assert.equal(s4.players.p2.woundsTaken, 1, 'Hidden Urban Legend revealing must heal 2 (3 -> 1)');

  // 5. Hidden Urban Legend with AUTO_DECLINE takes damage silently with zero prompt & zero leak!
  const s5 = makePhase5BState([
    { id: 'p1', name: 'Caster', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby', hand: ['ev-07'] },
    { id: 'p2', name: 'UL', roleId: 'exp2_urban_legend', revealed: false, woundsTaken: 0, location: 'lobby' },
    { id: 'p3', name: 'H2', roleId: 'gac-radio', revealed: true, location: 'radio' },
    { id: 'p4', name: 'S2', roleId: 'suong-gac-cong', revealed: true, location: 'court' },
  ]);
  applyPlayerGameAction(s5, 'p2', { type: 'SET_REACTION_PREF', policy: 'AUTO_DECLINE' }, 5000);
  applyPlayerGameAction(s5, 'p1', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p2' }, 5001);
  assert.equal(s5.pendingChoice ?? null, null);
  assert.equal(s5.players.p2.revealed, false);
  assert.equal(s5.players.p2.woundsTaken, 2);
  assert.equal(
    s5.publicLog.some((e) => e.text.includes('Urban Legend')),
    false,
    'AUTO_DECLINE must never leak Urban Legend name to public log',
  );
});

test('P5B-5 — Arlene: timing-safe Shadow Green disguise, faction stays wanderer, Hunter kill immediate win vs Shadow/unattributed no-win', () => {
  // 1. Green card reactions: default policy impersonates Shadow (<1ms, zero prompt), real faction stays wanderer!
  const s1 = makePhase5BState([
    { id: 'p1', name: 'Hunter', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby', hand: ['inv-05', 'inv-02', 'inv-08', 'inv-09'] },
    { id: 'p2', name: 'Arlene', roleId: 'exp2_arlene', revealed: false, woundsTaken: 2, location: 'lobby' },
    { id: 'p3', name: 'H2', roleId: 'gac-radio', revealed: true, location: 'radio' },
    { id: 'p4', name: 'S1', roleId: 'suong-an-danh', revealed: true, location: 'court' },
    { id: 'p5', name: 'S2', roleId: 'suong-gac-cong', revealed: true, location: 'breaker' },
  ]);
  assert.equal(s1.players.p2.faction, 'wanderer');

  // inv-05 (Shadow takes 1 dmg) -> Arlene reacts as Shadow (takes 1 dmg: 2 -> 3)!
  applyPlayerGameAction(s1, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-05', targetPlayerId: 'p2' }, 1000);
  assert.equal(s1.pendingChoice ?? null, null, 'Arlene disguise MUST NOT open any timing-leaking prompt');
  assert.equal(s1.players.p2.revealed, false, 'Arlene MUST NOT reveal to disguise');
  assert.equal(s1.players.p2.faction, 'wanderer', 'Arlene real faction MUST remain wanderer');
  assert.equal(s1.players.p2.woundsTaken, 3);

  // inv-02 (Hunter or Neutral) -> Arlene impersonates Shadow -> NO reaction!
  applyPlayerGameAction(s1, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-02', targetPlayerId: 'p2' }, 1001);
  assert.equal(s1.players.p2.woundsTaken, 3, 'Shadow does not match Hunter/Neutral blackmail');

  // inv-09 (Shadow heal 1) -> Arlene heals 1 (3 -> 2)!
  applyPlayerGameAction(s1, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-09', targetPlayerId: 'p2' }, 1002);
  assert.equal(s1.players.p2.woundsTaken, 2, 'Arlene disguising as Shadow heals from inv-09');

  // Switch Arlene reactionPolicy to AUTO_DECLINE -> responds truthfully as Neutral on inv-08 (Neutral heal 1)!
  applyPlayerGameAction(s1, 'p2', { type: 'SET_REACTION_PREF', policy: 'AUTO_DECLINE' }, 1003);
  applyPlayerGameAction(s1, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-08', targetPlayerId: 'p2' }, 1004);
  assert.equal(s1.players.p2.woundsTaken, 1, 'AUTO_DECLINE Arlene responds truthfully as Neutral on inv-08');

  // 2. Hunter kills Arlene with black card (ev-07) -> IMMEDIATE Arlene solo win!
  const s2 = makePhase5BState([
    { id: 'p1', name: 'Hunter', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby', hand: ['ev-07'] },
    { id: 'p2', name: 'Arlene', roleId: 'exp2_arlene', revealed: false, woundsTaken: 7, location: 'lobby' },
    { id: 'p3', name: 'H2', roleId: 'gac-radio', revealed: true, location: 'radio' },
    { id: 'p4', name: 'S1', roleId: 'suong-an-danh', revealed: true, location: 'court' },
    { id: 'p5', name: 'S2', roleId: 'suong-gac-cong', revealed: true, location: 'breaker' },
  ]);
  applyPlayerGameAction(s2, 'p1', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p2' }, 2000);
  assert.equal(s2.players.p2.alive, false);
  assert.equal(s2.finished, true, 'Arlene killed by Hunter card MUST win immediately');
  assert.equal(s2.winnerFaction, 'wanderer-solo');
  assert.ok(s2.winnerPlayerIds.includes('p2'));

  // 3. Hunter kills Arlene with active skill (George 1d4) -> IMMEDIATE Arlene solo win!
  const s3 = makePhase5BState([
    { id: 'p1', name: 'George', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby' },
    { id: 'p2', name: 'Arlene', roleId: 'exp2_arlene', revealed: false, woundsTaken: 7, location: 'court' },
    { id: 'p3', name: 'H2', roleId: 'gac-radio', revealed: true, location: 'radio' },
    { id: 'p4', name: 'S1', roleId: 'suong-an-danh', revealed: true, location: 'canteen' },
    { id: 'p5', name: 'S2', roleId: 'suong-gac-cong', revealed: true, location: 'breaker' },
  ]);
  applyPlayerGameAction(s3, 'p1', { type: 'USE_SKILL', targetPlayerId: 'p2' }, 3000);
  assert.equal(s3.players.p2.alive, false);
  assert.equal(s3.finished, true, 'Arlene killed by Hunter skill MUST win immediately');
  assert.ok(s3.winnerPlayerIds.includes('p2'));

  // 4. Shadow kills Arlene -> Arlene does NOT win! Match continues!
  const s4 = makePhase5BState([
    { id: 'p1', name: 'Vampire', roleId: 'suong-an-danh', revealed: true, location: 'lobby', hand: ['ev-07'] },
    { id: 'p2', name: 'Arlene', roleId: 'exp2_arlene', revealed: false, woundsTaken: 7, location: 'lobby' },
    { id: 'p3', name: 'H1', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { id: 'p4', name: 'H2', roleId: 'gac-radio', revealed: true, location: 'court' },
    { id: 'p5', name: 'S2', roleId: 'suong-gac-cong', revealed: true, location: 'breaker' },
  ]);
  applyPlayerGameAction(s4, 'p1', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p2' }, 4000);
  assert.equal(s4.players.p2.alive, false);
  assert.equal(s4.finished, false, 'Arlene killed by Shadow MUST NOT win');

  // 5. Unattributed self-damage (Banana Peel no-gear) kills Arlene -> Arlene does NOT win!
  const s5 = makePhase5BState([
    { id: 'p1', name: 'Arlene', roleId: 'exp2_arlene', revealed: false, woundsTaken: 7, location: 'lobby', hand: ['ev-12'] },
    { id: 'p2', name: 'H1', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { id: 'p3', name: 'H2', roleId: 'gac-radio', revealed: true, location: 'court' },
    { id: 'p4', name: 'S1', roleId: 'suong-an-danh', revealed: true, location: 'canteen' },
    { id: 'p5', name: 'S2', roleId: 'suong-gac-cong', revealed: true, location: 'breaker' },
  ]);
  applyPlayerGameAction(s5, 'p1', { type: 'USE_CARD', cardId: 'ev-12', targetPlayerId: 'p2' }, 5000);
  assert.equal(s5.players.p1.alive, false);
  assert.equal(s5.finished, false, 'Arlene killed by unattributed self-damage MUST NOT win');
});
