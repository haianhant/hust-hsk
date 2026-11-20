'use strict';

/**
 * test/boardgame-phase3a.test.cjs — Phase 3A Wave 2 Comprehensive Verification
 *
 * Tests all 8 Wave 2 characters + LocationAlias + 9-step Damage Pipeline + Neutral Victory:
 *  1. Registry, LocationAlias & `starter-sixteen` playability gate (prod locked Classic-only)
 *  2. Elysia (Hunter, 10 HP) — Phản Công (< 3 offensive damage, G43+Holy Robe, Masamune, no re-check)
 *  3. Unchained (Shadow, 11 HP) — Bạo Lực Vô Tận (+2 on hit, miss=0, G43, Holy Robe, multi-target)
 *  4. Warlock (Shadow, 14 HP) — Nguồn Lực (+3 at exact court only, G43+Holy Robe, multi-target, resume)
 *  5. Witch (Shadow, 14 HP) — Không Nơi Đâu Bằng Nhà (immune at exact corridor, hp-cost bypass, leave corridor)
 *  6. Father Harrison (Hunter, 12 HP) — Lễ Ngày Chủ Nhật (direct move to lobby, block stay-in-lobby, anti-replay, timeout)
 *  7. Gloria (Hunter, 14 HP) — Phước Lành Mạnh Mẽ (2 White sequential draws, 0/1/2 exhaustion, reshuffle, hibernation queue)
 *  8. Cindy (Neutral, 11 HP) — Con Ác Mộng (secret/auto retaliation, anti-loop, vs Victor/Undying, 5P/6P/7P victory)
 *  9. Bipolar (Neutral, 10 HP) — Đồng Xu Định Mệnh (ON_TURN_START d4+2 heal/self-dmg lethal, timeout skip, 6-case victory matrix)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');

function registerTsHook() {
  if (require.extensions['.ts'] && require.extensions['.ts'].__phase3aHook) return;
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
  loader.__phase3aHook = true;
  require.extensions['.ts'] = loader;
}

registerTsHook();

const { sanitizeBoardGameAppearance } = require(path.join(ROOT, 'shared/contracts/boardgame.ts'));
const { createInitialGameState } = require(path.join(ROOT, 'features/boardgame/domain/state-machine.ts'));
const {
  advanceTurn,
  applyPendingChoiceTimeout,
  applyPlayerGameAction,
  applyTimeoutAutoTurn,
} = require(path.join(ROOT, 'features/boardgame/domain/actions.ts'));
const {
  PHASE3A_ROLE_IDS,
  STARTER_SIXTEEN_EXPANSION_ROLE_IDS,
  hasGloriaQueuedCards,
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
  EXPANSION_LOCATION_ALIASES,
  isPlayerAtExactLocationAlias,
  resolveLocationAlias,
} = require(path.join(ROOT, 'features/boardgame/domain/rules.ts'));
const { evaluateVictoryWithEngine } = require(path.join(ROOT, 'features/boardgame/domain/victory-engine.ts'));

const APPEARANCE = sanitizeBoardGameAppearance({});
const NOW = 1_760_000_100_000;

function makeStarterSixteenState(roleAssignments, seed = 202611) {
  const players = roleAssignments.map((r, i) => ({
    playerId: r.id,
    displayName: r.name ?? `P${i + 1}`,
    seatIndex: i,
    appearance: APPEARANCE,
    connected: true,
  }));
  const state = createInitialGameState({
    matchId: `p3a-test-${seed}`,
    seed,
    nowMs: NOW,
    rulesetId: 'starter-sixteen',
    allowExperimental: true,
    players,
  });
  state.clusterPairs = [...DEFAULT_CLUSTER_PAIRS];
  for (const r of roleAssignments) {
    const design = getRoleDesign(r.roleId);
    const p = state.players[r.id];
    p.roleId = design.id;
    p.faction = design.faction;
    p.maxHp = design.maxHp;
    p.hp = typeof r.hp === 'number' ? r.hp : design.maxHp;
    p.woundsTaken = p.maxHp - p.hp;
    p.revealed = Boolean(r.revealed);
    p.location = r.location ?? 'lobby';
    p.equipped = [...(r.equipped ?? [])];
    p.hand = [...(r.hand ?? [])];
    p.alive = r.alive ?? true;
    p.skillUsedOnce = Boolean(r.skillUsedOnce);
  }
  state.activePlayerId = roleAssignments[0].id;
  state.turnPhase = 'MAIN_ACTION';
  return state;
}

/** Finds an rngState seed so standard |d6 - d4| equals desiredBaseDmg (0..5). */
function findAttackRollSeed(desiredBaseDmg, hasMasamune = false) {
  const { rollD4, rollD6 } = require(path.join(ROOT, 'features/boardgame/domain/rules.ts'));
  for (let s = 1; s < 50000; s++) {
    const cursor = { rngState: s };
    const d6 = hasMasamune ? 0 : rollD6(cursor);
    const d4 = rollD4(cursor);
    const base = hasMasamune ? d4 : Math.abs(d6 - d4);
    if (base === desiredBaseDmg) return s;
  }
  throw new Error(`Unable to find seed for baseDmg=${desiredBaseDmg}`);
}

// ===========================================================================
// 1. REGISTRY, LOCATION ALIAS & STARTER SIXTEEN PLAYABILITY GATE
// ===========================================================================

test('P3A-1 — Registry, LocationAlias & starter-sixteen (26 playable; prod Classic-only)', () => {
  assert.equal(PHASE3A_ROLE_IDS.length, 8);
  assert.equal(STARTER_SIXTEEN_EXPANSION_ROLE_IDS.length, 16);

  // Location Alias single source of truth
  assert.equal(EXPANSION_LOCATION_ALIASES.church, 'lobby');
  assert.equal(EXPANSION_LOCATION_ALIASES.weird_woods, 'corridor');
  assert.equal(EXPANSION_LOCATION_ALIASES.erstwhile_altar, 'court');
  assert.equal(resolveLocationAlias('church'), 'lobby');
  assert.equal(resolveLocationAlias('weird_woods'), 'corridor');
  assert.equal(resolveLocationAlias('erstwhile_altar'), 'court');
  assert.equal(isPlayerAtExactLocationAlias({ location: 'court' }, 'erstwhile_altar'), true);
  assert.equal(isPlayerAtExactLocationAlias({ location: 'corridor' }, 'erstwhile_altar'), false);

  // All 8 Wave 2 roles: house-rule-approved (NEVER verified), implemented, full bindings
  for (const id of PHASE3A_ROLE_IDS) {
    const entry = DEFAULT_CHARACTER_REGISTRY.get(id);
    assert.ok(entry, `Missing registry entry for ${id}`);
    assert.equal(entry.metadata.rulesStatus, 'house-rule-approved', `${id} must stay house-rule-approved`);
    assert.equal(entry.metadata.implementationStatus, 'implemented');
    assert.ok(entry.skillImpl !== null, `${id} missing skillImpl`);
    assert.ok(entry.victoryImpl !== null, `${id} missing victoryImpl`);
    assert.equal(isCharacterPlayable(entry, { allowExperimentalHouseRules: false }), false);
    assert.equal(isCharacterPlayable(entry, { allowExperimentalHouseRules: true }), true);
  }

  // Production ruleset list remains strictly 4 (Classic only enabled)
  assert.equal(DEFAULT_RULESET_REGISTRY.listRulesets().length, 4);
  for (const blocked of ['expansion-1', 'expansion-2', 'full-expansion', 'starter-four', 'starter-eight', 'starter-sixteen']) {
    const prod = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch(blocked, 8);
    assert.equal(prod.ok, false, `Production must block ${blocked}`);
  }

  // Experimental starter-sixteen validates cleanly with exact 26 roles (10H / 10S / 6N)
  const s16 = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch('starter-sixteen', 8, {
    allowExperimental: true,
  });
  assert.equal(s16.ok, true);
  if (s16.ok) {
    assert.equal(s16.pools.lanternGuard.length, 10);
    assert.equal(s16.pools.mistOrder.length, 10);
    assert.equal(s16.pools.wanderer.length, 6);
  }
});

// ===========================================================================
// 2. ELYSIA (Hunter, 10 HP) — Phản Công
// ===========================================================================

test('P3A-2 — Elysia counterattack (< 3 offensive dmg, G43 + Holy Robe, Masamune, no post-defense re-check)', () => {
  // Case A: Hidden Elysia hitting for 2 does NOT trigger choice
  const sHidden = makeStarterSixteenState([
    { id: 'p1', roleId: 'exp1_elysia', revealed: false, location: 'lobby' },
    { id: 'p2', roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: false, location: 'court' },
    { id: 'p4', roleId: 'suong-tin-gia', revealed: false, location: 'court' },
  ]);
  sHidden.rngState = findAttackRollSeed(2);
  assert.equal(applyPlayerGameAction(sHidden, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW).ok, true);
  assert.equal(sHidden.pendingChoice, null);
  assert.equal(sHidden.players.p2.woundsTaken, 2);

  // Case B: Revealed Elysia hitting for 2 vs revealed G43 + Holy Robe -> chooses boost (+2 -> 4 raw -> -1 Holy Robe -2 G43 = 1 dealt!)
  const sBoost = makeStarterSixteenState([
    { id: 'p1', roleId: 'exp1_elysia', revealed: true, location: 'lobby' },
    { id: 'p2', roleId: 'exp2_g43', revealed: true, location: 'lobby', equipped: ['eq-01'] },
    { id: 'p3', roleId: 'suong-an-danh', revealed: false, location: 'court' },
    { id: 'p4', roleId: 'suong-tin-gia', revealed: false, location: 'court' },
  ]);
  sBoost.rngState = findAttackRollSeed(2);
  assert.equal(applyPlayerGameAction(sBoost, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW).ok, true);
  assert.ok(sBoost.pendingChoice);
  assert.equal(sBoost.pendingChoice.kind, 'elysia_counter_boost');
  assert.equal(sBoost.pendingChoice.isSecret, false);
  const res = applyPlayerGameAction(
    sBoost,
    'p1',
    { type: 'RESOLVE_CHOICE', choiceId: sBoost.pendingChoice.choiceId, optionId: 'boost' },
    NOW + 100,
  );
  assert.equal(res.ok, true);
  assert.equal(sBoost.pendingChoice, null);
  assert.equal(sBoost.players.p2.woundsTaken, 1, '2 + 2 Elysia - 1 Holy Robe - 2 G43 = 1 dmg');

  // Case C: Miss (baseDmg = 0) does NOT trigger Elysia
  const sMiss = makeStarterSixteenState([
    { id: 'p1', roleId: 'exp1_elysia', revealed: true, location: 'lobby' },
    { id: 'p2', roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: false, location: 'court' },
    { id: 'p4', roleId: 'suong-tin-gia', revealed: false, location: 'court' },
  ]);
  sMiss.rngState = findAttackRollSeed(0);
  assert.equal(applyPlayerGameAction(sMiss, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW).ok, true);
  assert.equal(sMiss.pendingChoice, null);
  assert.equal(sMiss.players.p2.woundsTaken, 0);

  // Case D: Offensive damage === 3 (baseDmg=1 + Spear +2 = 3) vs G43 (reduced 3->1): MUST NOT re-check < 3 after defense!
  const sNoRecheck = makeStarterSixteenState([
    { id: 'p1', roleId: 'exp1_elysia', revealed: true, location: 'lobby', equipped: ['eq-04'] },
    { id: 'p2', roleId: 'exp2_g43', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'suong-an-danh', revealed: false, location: 'court' },
    { id: 'p4', roleId: 'suong-tin-gia', revealed: false, location: 'court' },
  ]);
  sNoRecheck.rngState = findAttackRollSeed(1);
  assert.equal(applyPlayerGameAction(sNoRecheck, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW).ok, true);
  assert.equal(sNoRecheck.pendingChoice, null, 'Offensive dmg 3 must NOT trigger Elysia even after G43 lowers to 1');
  assert.equal(sNoRecheck.players.p2.woundsTaken, 1);

  // Case E: Masamune 1d4 = 2 triggers Elysia, timeout defaults to skip (2 dmg)
  const sMasamune = makeStarterSixteenState([
    { id: 'p1', roleId: 'exp1_elysia', revealed: true, location: 'lobby', equipped: ['ev-01'] },
    { id: 'p2', roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: false, location: 'court' },
    { id: 'p4', roleId: 'suong-tin-gia', revealed: false, location: 'court' },
  ]);
  sMasamune.rngState = findAttackRollSeed(2, true);
  assert.equal(applyPlayerGameAction(sMasamune, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW).ok, true);
  assert.equal(sMasamune.pendingChoice?.kind, 'elysia_counter_boost');
  assert.equal(applyPendingChoiceTimeout(sMasamune, NOW + 20_000), true);
  assert.equal(sMasamune.players.p2.woundsTaken, 2, 'Timeout skips Elysia boost');
});

// ===========================================================================
// 3. UNCHAINED (Shadow, 11 HP) — Bạo Lực Vô Tận
// ===========================================================================

test('P3A-3 — Unchained (+2 on hit only, miss=0, G43+Holy Robe, non-attack unaffected, Machine Gun per-target once)', () => {
  // Case A: Hit baseDmg=3 vs G43 + Holy Robe -> 3 + 2 Unchained = 5 -> -1 Holy Robe -2 G43 = 2 dealt
  const s1 = makeStarterSixteenState([
    { id: 'p1', roleId: 'exp2_unchained', revealed: true, location: 'lobby' },
    { id: 'p2', roleId: 'exp2_g43', revealed: true, location: 'lobby', equipped: ['eq-01'] },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: false, location: 'court' },
    { id: 'p4', roleId: 'suong-tin-gia', revealed: false, location: 'court' },
  ]);
  s1.rngState = findAttackRollSeed(3);
  assert.equal(applyPlayerGameAction(s1, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW).ok, true);
  assert.equal(s1.players.p2.woundsTaken, 2);

  // Case B: Miss baseDmg=0 -> 0 dmg (NEVER turns miss into 2 dmg)
  const sMiss = makeStarterSixteenState([
    { id: 'p1', roleId: 'exp2_unchained', revealed: true, location: 'lobby' },
    { id: 'p2', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-radio', revealed: false, location: 'court' },
    { id: 'p4', roleId: 'suong-tin-gia', revealed: false, location: 'court' },
  ]);
  sMiss.rngState = findAttackRollSeed(0);
  assert.equal(applyPlayerGameAction(sMiss, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW).ok, true);
  assert.equal(sMiss.players.p2.woundsTaken, 0);

  // Case C: Non-attack card damage (Flare eq-11 = 2 dmg) gets NO +2 bonus
  const sCard = makeStarterSixteenState([
    { id: 'p1', roleId: 'exp2_unchained', revealed: true, location: 'lobby', hand: ['eq-11'] },
    { id: 'p2', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-radio', revealed: false, location: 'court' },
    { id: 'p4', roleId: 'suong-tin-gia', revealed: false, location: 'court' },
  ]);
  assert.equal(applyPlayerGameAction(sCard, 'p1', { type: 'USE_CARD', cardId: 'eq-11' }, NOW).ok, true);
  assert.equal(sCard.players.p2.woundsTaken, 2, 'Flare stays 2 dmg, no Unchained bonus');

  // Case D: Multi-target Machine Gun hits 2 targets for baseDmg=2 -> each receives 2 + 2 = 4 (NOT +4 twice!)
  const sMulti = makeStarterSixteenState([
    { id: 'p1', roleId: 'exp2_unchained', revealed: true, location: 'lobby', equipped: ['ev-06'] },
    { id: 'p2', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-radio', revealed: true, location: 'canteen' }, // same central cluster
    { id: 'p4', roleId: 'suong-tin-gia', revealed: false, location: 'court' },
  ]);
  sMulti.rngState = findAttackRollSeed(2);
  assert.equal(applyPlayerGameAction(sMulti, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW).ok, true);
  assert.equal(sMulti.players.p2.woundsTaken, 4);
  assert.equal(sMulti.players.p3.woundsTaken, 4);
});

// ===========================================================================
// 4. WARLOCK (Shadow, 14 HP) — Nguồn Lực
// ===========================================================================

test('P3A-4 — Warlock (+3 at exact court only, not paired corridor; G43+Holy Robe; multi-target; resume anti-double)', () => {
  // Case A: Exact `court` (erstwhile_altar) + baseDmg=2 vs G43 + Holy Robe -> 2+3=5 -> -1 -2 = 2
  const sCourt = makeStarterSixteenState([
    { id: 'p1', roleId: 'exp2_warlock', revealed: true, location: 'court' },
    { id: 'p2', roleId: 'exp2_g43', revealed: true, location: 'corridor', equipped: ['eq-01'] },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: false, location: 'lobby' },
    { id: 'p4', roleId: 'suong-tin-gia', revealed: false, location: 'lobby' },
  ]);
  sCourt.rngState = findAttackRollSeed(2);
  assert.equal(applyPlayerGameAction(sCourt, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW).ok, true);
  assert.equal(sCourt.players.p2.woundsTaken, 2);

  // Case B: Standing at paired cluster location `corridor` (NOT `court`) -> NO +3 bonus!
  const sNotCourt = makeStarterSixteenState([
    { id: 'p1', roleId: 'exp2_warlock', revealed: true, location: 'corridor' },
    { id: 'p2', roleId: 'gac-ky-thuat', revealed: true, location: 'court' },
    { id: 'p3', roleId: 'gac-radio', revealed: false, location: 'lobby' },
    { id: 'p4', roleId: 'suong-tin-gia', revealed: false, location: 'lobby' },
  ]);
  sNotCourt.rngState = findAttackRollSeed(2);
  assert.equal(applyPlayerGameAction(sNotCourt, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW).ok, true);
  assert.equal(sNotCourt.players.p2.woundsTaken, 2, 'Paired cluster location corridor must NOT grant Warlock +3');

  // Case C: Miss at `court` -> 0 damage
  const sMiss = makeStarterSixteenState([
    { id: 'p1', roleId: 'exp2_warlock', revealed: true, location: 'court' },
    { id: 'p2', roleId: 'gac-ky-thuat', revealed: true, location: 'court' },
    { id: 'p3', roleId: 'gac-radio', revealed: false, location: 'lobby' },
    { id: 'p4', roleId: 'suong-tin-gia', revealed: false, location: 'lobby' },
  ]);
  sMiss.rngState = findAttackRollSeed(0);
  assert.equal(applyPlayerGameAction(sMiss, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW).ok, true);
  assert.equal(sMiss.players.p2.woundsTaken, 0);

  // Case D: Resuming from hidden Undying pending choice does NOT re-add Warlock +3!
  const sResume = makeStarterSixteenState([
    { id: 'p1', roleId: 'exp2_warlock', revealed: true, location: 'court' },
    { id: 'p2', roleId: 'exp1_undying', revealed: false, location: 'court' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: false, location: 'lobby' },
    { id: 'p4', roleId: 'gac-radio', revealed: false, location: 'lobby' },
  ]);
  sResume.rngState = findAttackRollSeed(2);
  assert.equal(applyPlayerGameAction(sResume, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW).ok, true);
  assert.equal(sResume.pendingChoice?.kind, 'undying_reveal_reduce');
  // Serialize/deserialize to simulate reconnect/hibernation mid-attack!
  const restored = JSON.parse(JSON.stringify(sResume));
  assert.equal(
    applyPlayerGameAction(
      restored,
      'p2',
      { type: 'RESOLVE_CHOICE', choiceId: restored.pendingChoice.choiceId, optionId: 'reveal_and_reduce' },
      NOW + 100,
    ).ok,
    true,
  );
  assert.equal(restored.players.p2.woundsTaken, 4, '2 + 3 Warlock - 1 Undying = 4 (no double Warlock bonus)');
});

// ===========================================================================
// 5. WITCH (Shadow, 14 HP) — Không Nơi Đâu Bằng Nhà
// ===========================================================================

test('P3A-5 — Witch immune at exact corridor (attack, skill, card, corridor-9, retaliation), loses immunity outside, non-HP unaffected', () => {
  const s = makeStarterSixteenState([
    { id: 'p1', roleId: 'gac-ky-thuat', revealed: true, location: 'corridor', hand: ['eq-11'] },
    { id: 'p2', roleId: 'exp2_witch', revealed: true, location: 'corridor', equipped: ['eq-05'] },
    { id: 'p3', roleId: 'gac-radio', revealed: true, location: 'court' },
    { id: 'p4', roleId: 'exp1_cindy', revealed: true, location: 'corridor' },
  ]);
  // 1) Location power-9 damage from corridor itself -> Witch at corridor takes 0!
  s.turnPhase = 'LOCATION_ACTION';
  assert.equal(
    applyPlayerGameAction(s, 'p1', { type: 'USE_LOC_POWER', targetPlayerId: 'p2', mode: 'damage' }, NOW).ok,
    true,
  );
  assert.equal(s.players.p2.woundsTaken, 0, 'Witch immune to corridor power-9 damage');

  // 2) Card damage (Flare eq-11) -> Witch at corridor takes 0!
  assert.equal(applyPlayerGameAction(s, 'p1', { type: 'USE_CARD', cardId: 'eq-11' }, NOW + 10).ok, true);
  assert.equal(s.players.p2.woundsTaken, 0, 'Witch immune to card damage at corridor');

  // 3) Skill damage (George 1d4) -> Witch at corridor takes 0!
  assert.equal(applyPlayerGameAction(s, 'p1', { type: 'USE_SKILL', targetPlayerId: 'p2' }, NOW + 20).ok, true);
  assert.equal(s.players.p2.woundsTaken, 0, 'Witch immune to skill damage at corridor');

  // 4) Direct attack -> Witch at corridor takes 0!
  s.rngState = findAttackRollSeed(4);
  assert.equal(applyPlayerGameAction(s, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW + 30).ok, true);
  assert.equal(s.players.p2.woundsTaken, 0, 'Witch immune to attack damage at corridor');
  assert.equal(s.players.p2.maxHp, 14);

  // 5) Retaliation (Witch attacks revealed Cindy while standing at corridor -> Cindy retaliates 1, Witch blocks it!)
  s.activePlayerId = 'p2';
  s.turnPhase = 'MAIN_ACTION';
  s.players.p2.attacksThisTurn = 0;
  s.rngState = findAttackRollSeed(2);
  assert.equal(applyPlayerGameAction(s, 'p2', { type: 'ATTACK', targetPlayerId: 'p4' }, NOW + 35).ok, true);
  assert.equal(s.players.p4.woundsTaken, 4, 'Cindy took 2 from Flare + 2 from Witch attack');
  assert.equal(s.players.p2.woundsTaken, 0, 'Witch at corridor is immune to Cindy retaliation');

  // 6) Non-HP effect (steal equipment at court) still steals Witch's gear even while Witch is at corridor!
  s.activePlayerId = 'p3';
  s.turnPhase = 'LOCATION_ACTION';
  assert.equal(
    applyPlayerGameAction(s, 'p3', { type: 'USE_LOC_POWER', targetPlayerId: 'p2', mode: 'steal' }, NOW + 40).ok,
    true,
  );
  assert.equal(s.players.p2.equipped.length, 0, 'Non-HP steal still works on Witch at corridor');

  // 7) Leaving corridor (even to paired `court` in same south cluster!) immediately ends immunity!
  s.players.p2.location = 'court';
  s.turnPhase = 'MAIN_ACTION';
  s.players.p3.attacksThisTurn = 0;
  s.rngState = findAttackRollSeed(3);
  assert.equal(applyPlayerGameAction(s, 'p3', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW + 50).ok, true);
  assert.equal(s.players.p2.woundsTaken, 3, 'Witch outside corridor immediately takes full damage');
});

// ===========================================================================
// 6. FATHER HARRISON (Hunter, 12 HP) — Lễ Ngày Chủ Nhật
// ===========================================================================

test('P3A-6 — Father Harrison direct move to lobby, block stay-at-lobby farming, anti-replay & timeout', () => {
  const s = makeStarterSixteenState([
    { id: 'p1', roleId: 'exp2_father_harrison', revealed: true, location: 'court' },
    { id: 'p2', roleId: 'suong-an-danh', revealed: false, location: 'radio' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: false, location: 'breaker' },
    { id: 'p4', roleId: 'suong-tin-gia', revealed: false, location: 'canteen' },
  ]);
  s.turnPhase = 'ROLL_MOVE';

  // Use skill to move directly to `lobby` (Church)
  const r1 = applyPlayerGameAction(s, 'p1', { type: 'USE_SKILL' }, NOW);
  assert.equal(r1.ok, true);
  assert.equal(s.players.p1.location, 'lobby');
  assert.equal(s.turnPhase, 'LOCATION_ACTION');

  // Anti-replay: cannot use skill again in LOCATION_ACTION
  assert.equal(applyPlayerGameAction(s, 'p1', { type: 'USE_SKILL' }, NOW + 10).ok, false);

  // Location effect resolves cleanly once (draw White card)
  s.decks.equipment.unshift('eq-01');
  assert.equal(applyPlayerGameAction(s, 'p1', { type: 'DRAW_CARD', deck: 'equipment' }, NOW + 20).ok, true);
  assert.equal(s.players.p1.equipped.includes('eq-01'), true);
  assert.equal(s.turnPhase, 'MAIN_ACTION');
  // Cannot draw a second time
  assert.equal(applyPlayerGameAction(s, 'p1', { type: 'DRAW_CARD', deck: 'equipment' }, NOW + 30).ok, false);

  // Next turn while ALREADY at `lobby`: teleport MUST be blocked (cannot stand still & farm Church!)
  s.turnPhase = 'ROLL_MOVE';
  const rStay = applyPlayerGameAction(s, 'p1', { type: 'USE_SKILL' }, NOW + 40);
  assert.equal(rStay.ok, false, 'Father Harrison at lobby must NOT teleport in place');

  // Timeout fallback in ROLL_MOVE moves cleanly by dice and advances turn
  applyTimeoutAutoTurn(s, NOW + 50);
  assert.notEqual(s.activePlayerId, 'p1');
});

// ===========================================================================
// 7. GLORIA (Hunter, 14 HP) — Phước Lành Mạnh Mẽ
// ===========================================================================

test('P3A-7 — Gloria sequential 2-White draw at exact lobby (0/1/2 exhaustion, reshuffle, sequential immediate, hibernation)', () => {
  // Case A: 2 consumable White cards (eq-07 Holy Water + eq-08 Blessing) -> strictly sequential delivery via authoritative queue!
  const sSeq = makeStarterSixteenState([
    { id: 'p1', roleId: 'exp2_gloria', revealed: true, location: 'lobby', hp: 10 },
    { id: 'p2', roleId: 'suong-an-danh', revealed: false, location: 'lobby', hp: 10 },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: false, location: 'court' },
    { id: 'p4', roleId: 'suong-tin-gia', revealed: false, location: 'court' },
  ]);
  sSeq.turnPhase = 'LOCATION_ACTION';
  sSeq.decks.equipment = ['eq-07', 'eq-08', 'eq-01'];

  assert.equal(applyPlayerGameAction(sSeq, 'p1', { type: 'DRAW_CARD', deck: 'equipment' }, NOW).ok, true);
  assert.equal(sSeq.turnPhase, 'MAIN_ACTION');
  // Card #1 on hand; Card #2 queued authoritatively (not executing 2 immediate effects simultaneously!)
  assert.deepEqual(sSeq.players.p1.hand, ['eq-07']);
  assert.equal(hasGloriaQueuedCards(sSeq, 'p1'), true);
  // Duplicate draw rejected
  assert.equal(applyPlayerGameAction(sSeq, 'p1', { type: 'DRAW_CARD', deck: 'equipment' }, NOW + 5).ok, false);
  // Cannot end turn or attack while queued card remains
  assert.equal(applyPlayerGameAction(sSeq, 'p1', { type: 'END_TURN' }, NOW + 6).ok, false);

  // Hibernation / reconnect persistence round-trip
  const hibernated = JSON.parse(JSON.stringify(sSeq));
  assert.equal(applyPlayerGameAction(hibernated, 'p1', { type: 'USE_CARD', cardId: 'eq-07' }, NOW + 10).ok, true);
  // Card #2 (`eq-08`) is now automatically delivered to hand!
  assert.deepEqual(hibernated.players.p1.hand, ['eq-08']);
  assert.equal(hasGloriaQueuedCards(hibernated, 'p1'), false);
  assert.equal(
    applyPlayerGameAction(hibernated, 'p1', { type: 'USE_CARD', cardId: 'eq-08', targetPlayerId: 'p2' }, NOW + 20).ok,
    true,
  );
  assert.equal(hibernated.players.p1.hand.length, 0);

  // Case B: Deck exhaustion (1 in deck + 1 in discard -> reshuffles discard for Card #2) & (0 left)
  const sReshuffle = makeStarterSixteenState([
    { id: 'p1', roleId: 'exp2_gloria', revealed: true, location: 'lobby' },
    { id: 'p2', roleId: 'suong-an-danh', revealed: false, location: 'court' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: false, location: 'court' },
    { id: 'p4', roleId: 'suong-tin-gia', revealed: false, location: 'court' },
  ]);
  sReshuffle.turnPhase = 'LOCATION_ACTION';
  sReshuffle.decks.equipment = ['eq-01'];
  sReshuffle.discards.equipment = ['eq-04'];
  assert.equal(applyPlayerGameAction(sReshuffle, 'p1', { type: 'DRAW_CARD', deck: 'equipment' }, NOW).ok, true);
  assert.deepEqual(sReshuffle.players.p1.equipped, ['eq-01', 'eq-04'], 'Both equipment drawn across reshuffle');

  // Case C: 0 cards left in both deck & discard
  const sEmpty = makeStarterSixteenState([
    { id: 'p1', roleId: 'exp2_gloria', revealed: true, location: 'lobby' },
    { id: 'p2', roleId: 'suong-an-danh', revealed: false, location: 'court' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: false, location: 'court' },
    { id: 'p4', roleId: 'suong-tin-gia', revealed: false, location: 'court' },
  ]);
  sEmpty.turnPhase = 'LOCATION_ACTION';
  sEmpty.decks.equipment = [];
  sEmpty.discards.equipment = [];
  assert.equal(applyPlayerGameAction(sEmpty, 'p1', { type: 'DRAW_CARD', deck: 'equipment' }, NOW).ok, true);
  assert.equal(sEmpty.turnPhase, 'MAIN_ACTION');

  // Case D: At `breaker` (4-5, NOT exact lobby), Gloria draws only 1 White card!
  const sBreaker = makeStarterSixteenState([
    { id: 'p1', roleId: 'exp2_gloria', revealed: true, location: 'breaker' },
    { id: 'p2', roleId: 'suong-an-danh', revealed: false, location: 'court' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: false, location: 'court' },
    { id: 'p4', roleId: 'suong-tin-gia', revealed: false, location: 'court' },
  ]);
  sBreaker.turnPhase = 'LOCATION_ACTION';
  sBreaker.decks.equipment = ['eq-01', 'eq-04'];
  assert.equal(applyPlayerGameAction(sBreaker, 'p1', { type: 'DRAW_CARD', deck: 'equipment' }, NOW).ok, true);
  assert.deepEqual(sBreaker.players.p1.equipped, ['eq-01'], 'Gloria only double-draws at exact lobby/Church');
});

// ===========================================================================
// 8. CINDY (Neutral, 11 HP) — Con Ác Mộng + Neutral Victory (5P/6P/7P)
// ===========================================================================

test('P3A-8 — Cindy retaliation (secret P0, vs Victor/Undying, anti-loop) & Victory (5P fallback vs 6P/7P solo)', () => {
  // Case A: Hidden Cindy damaged by Victor (+2 boost) -> secret choice P0 check -> reveal & retaliate 1 dmg
  const sVictor = makeStarterSixteenState([
    { id: 'p1', roleId: 'exp1_victor', revealed: true, location: 'lobby' },
    { id: 'p2', roleId: 'exp1_cindy', revealed: false, location: 'lobby' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: false, location: 'court' },
    { id: 'p4', roleId: 'gac-radio', revealed: false, location: 'court' },
    { id: 'p5', roleId: 'suong-tin-gia', revealed: false, location: 'court' },
  ]);
  sVictor.rngState = findAttackRollSeed(2);
  assert.equal(applyPlayerGameAction(sVictor, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW).ok, true);
  assert.equal(sVictor.pendingChoice?.kind, 'victor_blood_boost');
  assert.equal(
    applyPlayerGameAction(
      sVictor,
      'p1',
      { type: 'RESOLVE_CHOICE', choiceId: sVictor.pendingChoice.choiceId, optionId: 'boost:p2' },
      NOW + 10,
    ).ok,
    true,
  );
  // Victor paid 1 HP cost (hp 12/13), dealt 4 dmg to Cindy (hp 7/11) -> secret Cindy choice opens!
  assert.equal(sVictor.pendingChoice?.kind, 'cindy_reveal_retaliate');
  assert.equal(sVictor.pendingChoice?.isSecret, true);
  const pubView = getPublicGameView(sVictor);
  assert.equal(pubView.pendingChoice?.ownerPlayerId, null, 'P0: hidden Cindy ownerPlayerId must be null');
  assert.equal(pubView.pendingChoice?.kind, null, 'P0: hidden Cindy kind must be null');
  assert.equal(getPrivateGameView(sVictor, 'p1')?.pendingChoice, undefined, 'Non-owner sees no private choice');
  assert.equal(getPrivateGameView(sVictor, 'p2')?.pendingChoice?.kind, 'cindy_reveal_retaliate');

  assert.equal(
    applyPlayerGameAction(
      sVictor,
      'p2',
      { type: 'RESOLVE_CHOICE', choiceId: sVictor.pendingChoice.choiceId, optionId: 'reveal_and_retaliate' },
      NOW + 20,
    ).ok,
    true,
  );
  assert.equal(sVictor.players.p2.revealed, true);
  assert.equal(sVictor.players.p1.woundsTaken, 2, 'Victor took 1 HP cost + 1 Cindy retaliation = 2 wounds');

  // Case B: Revealed Cindy retaliation vs revealed Undying -> Undying takes 1 dmg (not reduced!)
  const sUndying = makeStarterSixteenState([
    { id: 'p1', roleId: 'exp1_undying', revealed: true, location: 'lobby' },
    { id: 'p2', roleId: 'exp1_cindy', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'gac-ky-thuat', revealed: false, location: 'court' },
    { id: 'p4', roleId: 'gac-radio', revealed: false, location: 'court' },
    { id: 'p5', roleId: 'suong-tin-gia', revealed: false, location: 'court' },
  ]);
  sUndying.rngState = findAttackRollSeed(2);
  assert.equal(applyPlayerGameAction(sUndying, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, NOW).ok, true);
  assert.equal(sUndying.players.p1.woundsTaken, 1, 'Undying takes 1 retaliation dmg from Cindy (1 < 2 & retaliation)');

  // Case C: 5P (Cindy is ONLY Neutral) -> NO auto-win at match start; co-wins when Hunters win!
  const s5p = makeStarterSixteenState([
    { id: 'p1', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby' },
    { id: 'p2', roleId: 'gac-radio', revealed: true, location: 'lobby' },
    { id: 'p3', roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { id: 'p4', roleId: 'suong-tin-gia', revealed: true, location: 'court' },
    { id: 'p5', roleId: 'exp1_cindy', revealed: false, location: 'radio' },
  ]);
  assert.equal(evaluateVictoryWithEngine(s5p).finished, false, '5P Cindy MUST NOT auto-win at match start');
  s5p.players.p3.alive = false;
  s5p.players.p4.alive = false;
  const v5p = evaluateVictoryWithEngine(s5p);
  assert.equal(v5p.finished, true);
  assert.equal(v5p.winnerFaction, 'lantern-guard');
  assert.ok(v5p.winnerPlayerIds.includes('p5'), '5P surviving Cindy co-wins on legitimate match end');

  // Case D: 7P (3 Neutrals: Cindy, Bob, Allie) -> when Bob & Allie die while Cindy lives -> Cindy wins IMMEDIATELY!
  const s7p = makeStarterSixteenState([
    { id: 'p1', roleId: 'gac-ky-thuat', revealed: true },
    { id: 'p2', roleId: 'gac-radio', revealed: true },
    { id: 'p3', roleId: 'suong-an-danh', revealed: true },
    { id: 'p4', roleId: 'suong-tin-gia', revealed: true },
    { id: 'p5', roleId: 'exp1_cindy', revealed: true, alive: true },
    { id: 'p6', roleId: 'lang-anh-san', revealed: true, alive: false },
    { id: 'p7', roleId: 'lang-quan-sat', revealed: true, alive: false },
  ]);
  const v7p = evaluateVictoryWithEngine(s7p);
  assert.equal(v7p.finished, true);
  assert.equal(v7p.winnerFaction, 'wanderer-solo');
  assert.deepEqual(v7p.winnerPlayerIds, ['p5']);
});

// ===========================================================================
// 9. BIPOLAR (Neutral, 10 HP) — Đồng Xu Định Mệnh + Conditional Victory
// ===========================================================================

test('P3A-9 — Bipolar ON_TURN_START Fate Coin (d4+2 heal / lethal self-dmg / timeout skip) & 6-case Victory Matrix', () => {
  // Case A: ON_TURN_START auto-prompt + timeout skip does NOT consume oncePerMatch or self-damage
  const s = makeStarterSixteenState([
    { id: 'p1', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby' },
    { id: 'p2', roleId: 'exp1_bipolar', revealed: true, location: 'lobby', hp: 5 },
    { id: 'p3', roleId: 'suong-an-danh', revealed: true, location: 'court' },
    { id: 'p4', roleId: 'suong-tin-gia', revealed: true, location: 'court' },
    { id: 'p5', roleId: 'gac-radio', revealed: true, location: 'court' },
  ]);
  advanceTurn(s, NOW);
  assert.equal(s.activePlayerId, 'p2');
  assert.equal(s.pendingChoice?.kind, 'bipolar_fate_coin');
  assert.equal(applyPendingChoiceTimeout(s, NOW + 20_000), true);
  assert.equal(s.players.p2.hp, 5, 'Timeout MUST NOT self-damage Bipolar');
  assert.equal(s.players.p2.skillUsedOnce, false, 'Timeout skip preserves oncePerMatch');

  // Case B: Heal self clamps to maxHp=10 and commits skillUsedOnce=true across reconnect
  const rOpen = applyPlayerGameAction(s, 'p2', { type: 'USE_SKILL' }, NOW + 25_000);
  assert.equal(rOpen.ok, true);
  assert.equal(s.pendingChoice?.kind, 'bipolar_fate_coin');
  const rHeal = applyPlayerGameAction(
    s,
    'p2',
    { type: 'RESOLVE_CHOICE', choiceId: s.pendingChoice.choiceId, optionId: 'heal_self' },
    NOW + 26_000,
  );
  assert.equal(rHeal.ok, true);
  assert.equal(s.players.p2.skillUsedOnce, true);
  assert.ok(s.players.p2.hp >= 8 && s.players.p2.hp <= 10, `Expected healed hp in [8..10], got ${s.players.p2.hp}`);
  // Cannot reuse!
  assert.equal(applyPlayerGameAction(s, 'p2', { type: 'USE_SKILL' }, NOW + 27_000).ok, false);

  // Case C: Lethal self-damage bypasses Holy Robe & Guardian Angel and legally eliminates Bipolar!
  const sLethal = makeStarterSixteenState([
    { id: 'p1', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby' },
    { id: 'p2', roleId: 'exp1_bipolar', revealed: true, location: 'lobby', hp: 3, equipped: ['eq-01'] },
    { id: 'p3', roleId: 'suong-an-danh', revealed: true, location: 'court' },
    { id: 'p4', roleId: 'suong-tin-gia', revealed: true, location: 'court' },
    { id: 'p5', roleId: 'gac-radio', revealed: true, location: 'court' },
  ]);
  sLethal.players.p2.guardianShieldActive = true;
  advanceTurn(sLethal, NOW);
  assert.equal(sLethal.pendingChoice?.kind, 'bipolar_fate_coin');
  assert.equal(
    applyPlayerGameAction(
      sLethal,
      'p2',
      { type: 'RESOLVE_CHOICE', choiceId: sLethal.pendingChoice.choiceId, optionId: 'damage_self' },
      NOW + 10,
    ).ok,
    true,
  );
  assert.equal(sLethal.players.p2.alive, false, 'd4+2 (>=3) unpreventable self-damage eliminates 3 HP Bipolar');
  assert.equal(sLethal.players.p2.hp, 0);

  // Case D: Full 6-case Victory Matrix for Bipolar
  const makeMatrix = (bipolarAlive, scenario) => {
    const m = makeStarterSixteenState([
      { id: 'h1', roleId: 'gac-ky-thuat', revealed: true, alive: scenario !== 'shadow-wins' },
      { id: 'h2', roleId: 'gac-radio', revealed: true, alive: scenario !== 'shadow-wins' },
      { id: 's1', roleId: 'suong-an-danh', revealed: true, alive: scenario !== 'hunter-wins' },
      { id: 's2', roleId: 'suong-tin-gia', revealed: true, alive: scenario !== 'hunter-wins' },
      { id: 'n1', roleId: 'exp1_bipolar', revealed: true, alive: bipolarAlive },
      {
        id: 'n2',
        roleId: 'lang-anh-san',
        revealed: true,
        alive: true,
        equipped: scenario === 'neutral-solo' ? ['eq-01', 'eq-02', 'eq-03', 'eq-04', 'eq-05'] : [],
      },
    ]);
    return evaluateVictoryWithEngine(m);
  };

  assert.equal(makeMatrix(true, 'hunter-wins').winnerPlayerIds.includes('n1'), true, 'Hunter wins + alive -> WIN');
  assert.equal(makeMatrix(false, 'hunter-wins').winnerPlayerIds.includes('n1'), false, 'Hunter wins + dead -> LOSE');
  assert.equal(makeMatrix(false, 'shadow-wins').winnerPlayerIds.includes('n1'), true, 'Shadow wins + dead -> WIN');
  assert.equal(makeMatrix(true, 'shadow-wins').winnerPlayerIds.includes('n1'), false, 'Shadow wins + alive -> LOSE');
  assert.equal(makeMatrix(true, 'neutral-solo').winnerPlayerIds.includes('n1'), false, 'Neutral solo + alive -> LOSE');
  assert.equal(makeMatrix(false, 'neutral-solo').winnerPlayerIds.includes('n1'), false, 'Neutral solo + dead -> LOSE');
});
