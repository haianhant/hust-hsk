'use strict';

/**
 * test/boardgame-phase5c.test.cjs — Phase 5C Eight Tier-3 Characters, `starter-thirty-eight`
 * Experimental Ruleset & All 17 Mandatory Cross-Character Interaction Scenarios (Section 18).
 *
 * Covers:
 *  - P5C-1: `starter-thirty-eight` ruleset (48 playable: 18H/18S/12N; 38 implemented / 18 remaining [2H/3S/13N]; prod-locked)
 *  - P5C-2: Ernest (`exp1_ernest`) — HP<=2 reject, 2-HP cost, force-reveal Shadows + destroy Shadow gear, triggers Umibozu AoE, spares Hunter/Neutral (Arlene & Bianca)
 *  - P5C-3: Gwendolen (`exp1_gwendolen`) — Counterattack for revealed Hunter/Neutral in same cluster (normal, Handgun, Machine Gun), hidden Neutral privacy rule, dead attacker check, non-recursive
 *  - P5C-4: Freyja (`exp2_freyja`) — Sequential equipment discard bonus attacks, Masamune excluded, Machine Gun interaction, Udi exclusion, target switch, no replay after discard
 *  - P5C-5: Warlord (`exp2_warlord`) — Pull to exact location in ROLL_MOVE + bonus attack + resume ROLL_MOVE, Witch pulled off corridor loses immunity vs pulled onto corridor keeps immunity, once-per-match lock
 *  - P5C-6: Usurper (`exp2_usurper`) — Revealed aura blocks Elise & Gloria white-card heals, allows Urban Legend black-card / corridor / own self-heal; hidden secret reaction + P0 privacy + AUTO_DECLINE / AUTO_ACTIVATE
 *  - P5C-7: Angel (`exp1_angel`) — armed -> active -> expired lifecycle, blocks Wrath AoE & newly-revealed Neutrals, does NOT block hp-cost, end-of-match win (all Neutrals alive OR exact `lobby` Church, NOT `canteen`)
 *  - P5C-8: Bianca (`exp2_bianca`) — Single-target equipment discard prevention, AoE excluded even as sole victim (`Machine Gun`, `Dynamite`, `Wrath`, `Umibozu`, `Vengeance`), Masamune excluded, hp-cost excluded, lowest-HP & tie win
 *  - P5C-9: Dalton (`exp2_dalton`) — Forced reveal on `13 -> 12` / `13 -> 11` (not on 0 blocked dmg), self-heal blocked (`Holy Water`/`corridor`), external heal allowed (`Elise`/`Blessing`), kill win ONLY after activation, highest-HP & tie win, Cindy/Bipolar/Dalton precedence
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

require('./register-ts.cjs');

const ROOT = path.resolve(__dirname, '..');

const {
  DEFAULT_CHARACTER_REGISTRY,
  DEFAULT_RULESET_REGISTRY,
  PHASE5C_ROLE_IDS,
  STARTER_THIRTY_EIGHT_EXPANSION_ROLE_IDS,
  advanceTurn,
  applyPendingChoiceTimeout,
  applyPlayerGameAction,
  createInitialGameState,
  evaluateVictoryWithEngine,
  getPrivateGameView,
  getPublicGameView,
  getRoleDesign,
  isCharacterPlayable,
} = require(path.join(ROOT, 'features/boardgame/domain/index.ts'));

function makeS38State(specs, seed = 5701) {
  const playersInput = specs.map((sp, idx) => ({
    playerId: sp.id,
    displayName: sp.name ?? `Player_${idx + 1}`,
    seatIndex: idx,
    appearance: {},
    connected: true,
  }));
  const state = createInitialGameState({
    matchId: `p5c-${seed}`,
    seed,
    nowMs: 1_700_000_000_000,
    rulesetId: 'starter-thirty-eight',
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
    p.consecutiveSameZoneRolls = 0;
  }
  state.activePlayerId = specs[0].id;
  state.turnPhase = 'MAIN_ACTION';
  state.pendingChoice = null;
  state.expansionState.pendingSteps = [];
  return state;
}

test('P5C-1 — starter-thirty-eight ruleset (48 playable: 18H/18S/12N; 18 remaining strictly locked; production rejects S38)', () => {
  assert.equal(PHASE5C_ROLE_IDS.length, 8);
  assert.equal(STARTER_THIRTY_EIGHT_EXPANSION_ROLE_IDS.length, 38);

  // Production MUST reject starter-thirty-eight!
  const prodCheck = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch('starter-thirty-eight', 6, {
    allowExperimental: false,
  });
  assert.equal(prodCheck.ok, false);
  assert.equal(prodCheck.code, 'RULESET_UNAVAILABLE');

  // Experimental mode unlocks exact 48 playable characters (18H / 18S / 12N)
  const expCheck = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch('starter-thirty-eight', 8, {
    allowExperimental: true,
  });
  assert.equal(expCheck.ok, true);
  assert.equal(expCheck.pools.lanternGuard.length, 18);
  assert.equal(expCheck.pools.mistOrder.length, 18);
  assert.equal(expCheck.pools.wanderer.length, 12);

  // Verify remaining 18 expansion roles stay strictly needs-clarification & not-started (2H / 3S / 13N)
  const allExp = DEFAULT_CHARACTER_REGISTRY.listByExpansions(['expansion-1', 'expansion-2']);
  const remaining = allExp.filter((e) => e.metadata.implementationStatus !== 'implemented');
  assert.equal(remaining.length, 18);
  assert.equal(remaining.filter((e) => e.metadata.sourceFaction === 'hunter').length, 2);
  assert.equal(remaining.filter((e) => e.metadata.sourceFaction === 'shadow').length, 3);
  assert.equal(remaining.filter((e) => e.metadata.sourceFaction === 'neutral').length, 13);
  for (const rem of remaining) {
    assert.equal(rem.metadata.rulesStatus, 'needs-clarification');
    assert.equal(rem.metadata.implementationStatus, 'not-started');
    assert.equal(rem.skillImpl, null);
    assert.equal(rem.victoryImpl, null);
    assert.equal(isCharacterPlayable(rem, { allowExperimentalHouseRules: true }), false);
  }
});

test('P5C-2 — Ernest: HP<=2 rejection, 2-HP unpreventable cost, reveals Shadows + destroys Shadow gear, triggers Umibozu, spares Hunter/Neutral', () => {
  // HP === 2 -> rejected!
  const sLow = makeS38State([
    { id: 'p1', name: 'Ernest', roleId: 'exp1_ernest', revealed: true, woundsTaken: 8, location: 'lobby' },
    { id: 'p2', name: 'Shadow', roleId: 'suong-an-danh', revealed: false, location: 'court', equipped: ['ev-02'] },
    { id: 'p3', name: 'H2', roleId: 'gac-radio', revealed: true, location: 'radio' },
    { id: 'p4', name: 'S2', roleId: 'suong-gac-cong', revealed: false, location: 'breaker' },
  ]);
  const lowRes = applyPlayerGameAction(sLow, 'p1', { type: 'USE_SKILL' }, 1000);
  assert.equal(lowRes.ok, false);
  assert.equal(sLow.players.p1.skillUsedOnce, false);

  // Ernest (10 HP) vs hidden Umibozu (w/ 2 gear), revealed Shadow (w/ 1 gear), Arlene (Neutral w/ gear), Bianca (Neutral w/ gear)
  const s1 = makeS38State([
    { id: 'p1', name: 'Ernest', roleId: 'exp1_ernest', revealed: true, woundsTaken: 0, location: 'lobby', equipped: ['eq-01'] },
    { id: 'p2', name: 'Umibozu', roleId: 'exp2_umibozu', revealed: false, woundsTaken: 0, location: 'canteen', equipped: ['ev-02', 'eq-03'] },
    { id: 'p3', name: 'Vampire', roleId: 'suong-an-danh', revealed: true, woundsTaken: 0, location: 'court', equipped: ['ev-03'] },
    { id: 'p4', name: 'Arlene', roleId: 'exp2_arlene', revealed: false, woundsTaken: 0, location: 'radio', equipped: ['eq-02'] },
    { id: 'p5', name: 'Bianca', roleId: 'exp2_bianca', revealed: true, woundsTaken: 0, location: 'breaker', equipped: ['eq-05'] },
  ]);
  const res = applyPlayerGameAction(s1, 'p1', { type: 'USE_SKILL' }, 2000);
  assert.equal(res.ok, true);
  assert.equal(s1.players.p1.skillUsedOnce, true);
  // Ernest paid 2 HP cost AND got hit by Umibozu's 3-dmg cluster AoE (lobby + canteen = central cluster) -> 5 wounds total!
  assert.equal(s1.players.p1.woundsTaken, 5, 'Ernest pays 2 HP cost + takes 3 AoE from forced-reveal Umibozu in same cluster');
  assert.equal(s1.players.p2.revealed, true, 'Umibozu MUST be forced revealed');
  assert.equal(s1.players.p2.skillUsedOnce, true, 'Umibozu AoE MUST fire on Ernest forced reveal');
  assert.equal(s1.players.p2.equipped.length, 0, 'Umibozu gear MUST be destroyed');
  assert.equal(s1.players.p3.equipped.length, 0, 'Already-revealed Shadow gear MUST also be destroyed');
  assert.equal(s1.players.p4.revealed, false, 'Arlene (real faction wanderer) MUST NOT be revealed by Ernest');
  assert.deepEqual(s1.players.p4.equipped, ['eq-02'], 'Arlene gear MUST be untouched');
  assert.deepEqual(s1.players.p5.equipped, ['eq-05'], 'Bianca gear MUST be untouched');
  assert.deepEqual(s1.players.p1.equipped, ['eq-01'], 'Hunter gear MUST be untouched');
});

test('P5C-3 — Gwendolen: counterattack for revealed Hunter/Neutral (incl. Machine Gun & Handgun), hidden Neutral privacy rule, non-recursive', () => {
  // 1. Hidden Neutral attacked -> Gwendolen MUST NOT open counter choice (experimental privacy rule!)
  const sPriv = makeS38State([
    { id: 'p1', name: 'Shadow', roleId: 'suong-an-danh', revealed: true, location: 'lobby', equipped: ['ev-01'] },
    { id: 'p2', name: 'HiddenNeutral', roleId: 'lang-quan-sat', revealed: false, location: 'lobby' },
    { id: 'p3', name: 'Gwendolen', roleId: 'exp1_gwendolen', revealed: true, location: 'canteen' },
    { id: 'p4', name: 'S2', roleId: 'suong-gac-cong', revealed: true, location: 'court' },
  ]);
  applyPlayerGameAction(sPriv, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 1000);
  assert.equal(sPriv.pendingChoice ?? null, null, 'Attacking HIDDEN Neutral must NOT trigger Gwendolen choice (zero faction leak)');

  // 2. Revealed Neutral attacked by Machine Gun Shadow -> Gwendolen opens choice & counters non-recursively!
  const s1 = makeS38State([
    { id: 'p1', name: 'Shadow', roleId: 'suong-an-danh', revealed: true, location: 'lobby', equipped: ['ev-01', 'ev-06'] },
    { id: 'p2', name: 'RevealedNeutral', roleId: 'lang-quan-sat', revealed: true, location: 'lobby' },
    { id: 'p3', name: 'Gwendolen', roleId: 'exp1_gwendolen', revealed: true, location: 'canteen', equipped: ['ev-01'] },
    { id: 'p4', name: 'Gwendolen2', roleId: 'gac-radio', revealed: true, location: 'court' },
  ]);
  applyPlayerGameAction(s1, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 2000);
  assert.equal(s1.pendingChoice?.kind, 'gwendolen_counter_attack');
  assert.equal(s1.pendingChoice?.ownerPlayerId, 'p3');

  const shadowWoundsBefore = s1.players.p1.woundsTaken;
  applyPlayerGameAction(
    s1,
    'p3',
    { type: 'RESOLVE_CHOICE', choiceId: s1.pendingChoice.choiceId, optionId: 'counter' },
    2001,
  );
  assert.ok(s1.players.p1.woundsTaken > shadowWoundsBefore, 'Gwendolen Masamune counterattack must deal >= 1 dmg');
  assert.equal(s1.pendingChoice ?? null, null, 'Counterattack must not trigger recursive counter loop');

  // 3. Attacker in OTHER cluster + Gwendolen holds Handgun (ev-05) -> CAN counter! Without Handgun -> CANNOT counter!
  const sHandgun = makeS38State([
    { id: 'p1', name: 'HandgunShadow', roleId: 'suong-an-danh', revealed: true, location: 'court', equipped: ['ev-01', 'ev-05'] },
    { id: 'p2', name: 'RevealedHunter', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby' },
    { id: 'p3', name: 'Gwendolen', roleId: 'exp1_gwendolen', revealed: true, location: 'canteen', equipped: ['ev-05'] },
    { id: 'p4', name: 'S2', roleId: 'suong-gac-cong', revealed: true, location: 'radio' },
  ]);
  applyPlayerGameAction(sHandgun, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 3000);
  assert.equal(sHandgun.pendingChoice?.kind, 'gwendolen_counter_attack', 'Gwendolen with Handgun can counter attacker in other cluster');
});

test('P5C-4 — Freyja: sequential discard bonus attacks, Masamune excluded, Machine Gun & Udi exclusion, no gear replay', () => {
  const s1 = makeS38State([
    { id: 'p1', name: 'Freyja', roleId: 'exp2_freyja', revealed: true, location: 'lobby', equipped: ['ev-01', 'ev-02', 'ev-06'] },
    { id: 'p2', name: 'Vampire', roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { id: 'p3', name: 'Udi', roleId: 'exp1_udi', revealed: true, location: 'canteen' },
    { id: 'p4', name: 'Hunter2', roleId: 'gac-radio', revealed: true, location: 'canteen' },
  ]);
  // Central cluster has 4 players -> Udi has 3 others (>=2) -> Udi MUST be excluded from Freyja targets!
  // Initial attack hits p2 & p4 (Machine Gun), skips Udi (p3), then opens freyja_extra_attack!
  applyPlayerGameAction(s1, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 1000);
  assert.equal(s1.players.p3.woundsTaken, 0, 'Protected Udi must NOT be hit by Freyja Machine Gun');
  assert.equal(s1.pendingChoice?.kind, 'freyja_extra_attack');

  // Verify Masamune (`ev-01`) is NOT offered as discardable, AND Udi (`p3`) is NOT a target!
  const optLabels = s1.pendingChoice.options.map((o) => o.label);
  assert.equal(optLabels.some((l) => l.includes('Kiếm Gỗ Nguyền Rủa')), false, 'Masamune MUST NOT be discardable');
  assert.equal(
    s1.pendingChoice.options.some((o) => o.targetPlayerId === 'p3'),
    false,
    'Protected Udi MUST NOT be a valid Freyja bonus target',
  );

  // Pick discarding Butcher Knife (`ev-02`) to bonus-attack p2 (keeping Machine Gun `ev-06`!)
  const knifeOpt = s1.pendingChoice.options.find(
    (o) => o.card?.id === 'ev-02' && o.targetPlayerId === 'p2',
  );
  assert.ok(knifeOpt);
  const p2WoundsBefore = s1.players.p2.woundsTaken;
  applyPlayerGameAction(
    s1,
    'p1',
    { type: 'RESOLVE_CHOICE', choiceId: s1.pendingChoice.choiceId, optionId: knifeOpt.optionId },
    1001,
  );
  assert.equal(s1.players.p1.equipped.includes('ev-02'), false, 'Discarded gear must be removed immediately');
  assert.ok(s1.discards.event.includes('ev-02'), 'Discarded gear must enter state.discards');
  assert.ok(s1.players.p2.woundsTaken > p2WoundsBefore, 'Bonus attack with Masamune must deal >= 1 dmg');

  // Should re-open freyja_extra_attack with ONLY Machine Gun (`ev-06`) left as discardable (not Masamune!)
  assert.equal(s1.pendingChoice?.kind, 'freyja_extra_attack');
  assert.equal(
    s1.pendingChoice.options.filter((o) => o.optionId !== 'done').every((o) => o.card?.id === 'ev-06'),
    true,
  );
  // Choose done -> turn finishes cleanly!
  applyPlayerGameAction(
    s1,
    'p1',
    { type: 'RESOLVE_CHOICE', choiceId: s1.pendingChoice.choiceId, optionId: 'done' },
    1002,
  );
  assert.equal(s1.pendingChoice ?? null, null);
  assert.notEqual(s1.activePlayerId, 'p1', 'Turn should advance after Freyja finishes attack chain');
});

test('P5C-5 — Warlord: pull to exact location in ROLL_MOVE + bonus attack + continue ROLL_MOVE; Witch off/onto corridor', () => {
  // 1. Warlord at `lobby` pulls Witch OFF `corridor` -> Witch loses immunity, takes damage, Warlord stays in ROLL_MOVE!
  const s1 = makeS38State([
    { id: 'p1', name: 'Warlord', roleId: 'exp2_warlord', revealed: true, location: 'lobby', equipped: ['ev-01'] },
    { id: 'p2', name: 'Witch', roleId: 'exp2_witch', revealed: true, location: 'corridor' },
    { id: 'p3', name: 'H1', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { id: 'p4', name: 'H2', roleId: 'gac-radio', revealed: true, location: 'court' },
  ]);
  s1.turnPhase = 'ROLL_MOVE';
  const r1 = applyPlayerGameAction(s1, 'p1', { type: 'USE_SKILL', targetPlayerId: 'p2' }, 1000);
  assert.equal(r1.ok, true);
  assert.equal(s1.players.p1.skillUsedOnce, true);
  assert.equal(s1.players.p2.location, 'lobby', 'Witch MUST be pulled to exact Warlord location');
  assert.ok(s1.players.p2.woundsTaken > 0, 'Witch pulled OFF corridor loses sanctuary immunity');
  assert.equal(s1.turnPhase, 'ROLL_MOVE', 'Warlord MUST continue normal turn in ROLL_MOVE');
  assert.equal(s1.activePlayerId, 'p1');
  assert.equal(s1.players.p1.attacksThisTurn, 0, 'Bonus attack MUST NOT consume Warlord normal turn attack');

  // Cannot use Warlord pull twice!
  const rDup = applyPlayerGameAction(s1, 'p1', { type: 'USE_SKILL', targetPlayerId: 'p3' }, 1001);
  assert.equal(rDup.ok, false);

  // 2. Warlord standing AT `corridor` pulls Witch -> Witch is at exact `corridor` -> immune (0 dmg)!
  const s2 = makeS38State([
    { id: 'p1', name: 'Warlord', roleId: 'exp2_warlord', revealed: true, location: 'corridor', equipped: ['ev-01'] },
    { id: 'p2', name: 'Witch', roleId: 'exp2_witch', revealed: true, location: 'lobby' },
    { id: 'p3', name: 'H1', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { id: 'p4', name: 'H2', roleId: 'gac-radio', revealed: true, location: 'court' },
  ]);
  s2.turnPhase = 'ROLL_MOVE';
  applyPlayerGameAction(s2, 'p1', { type: 'USE_SKILL', targetPlayerId: 'p2' }, 2000);
  assert.equal(s2.players.p2.location, 'corridor');
  assert.equal(s2.players.p2.woundsTaken, 0, 'Witch pulled ONTO corridor has sanctuary immunity');
  assert.equal(s2.turnPhase, 'ROLL_MOVE');
});

test('P5C-6 — Usurper: blocks Elise & Gloria white-card heals, allows Urban Legend/corridor/self-heal, hidden secret reaction & P0 privacy', () => {
  // 1. Hidden Usurper intercepts Elise 5-HP heal -> reveals & blocks BOTH targets!
  const s1 = makeS38State([
    { id: 'p1', name: 'Elise', roleId: 'exp2_elise', revealed: true, woundsTaken: 4, location: 'lobby' },
    { id: 'p2', name: 'Gloria', roleId: 'exp2_gloria', revealed: true, woundsTaken: 4, location: 'canteen', hand: ['eq-07'] },
    { id: 'p3', name: 'Usurper', roleId: 'exp2_usurper', revealed: false, woundsTaken: 3, location: 'court', hand: ['eq-07'] },
    { id: 'p4', name: 'UrbanLegend', roleId: 'exp2_urban_legend', revealed: true, woundsTaken: 4, location: 'radio' },
  ]);
  applyPlayerGameAction(s1, 'p1', { type: 'USE_SKILL' }, 1000);
  const splitOpt = s1.pendingChoice.options.find((o) => o.label.includes('Chia đều toàn Cụm'));
  applyPlayerGameAction(
    s1,
    'p1',
    { type: 'RESOLVE_CHOICE', choiceId: s1.pendingChoice.choiceId, optionId: splitOpt.optionId },
    1001,
  );
  // Secret Usurper prompt MUST open BEFORE HP changes!
  assert.equal(s1.pendingChoice?.kind, 'usurper_reveal_block_heal');
  const pub1 = getPublicGameView(s1);
  assert.equal(pub1.pendingChoice.isSecret, true);
  assert.equal(pub1.pendingChoice.ownerPlayerId, null, 'P0: hidden Usurper owner MUST be null');
  assert.equal(pub1.pendingChoice.kind, null, 'P0: hidden Usurper kind MUST be null');
  assert.equal(s1.players.p1.woundsTaken, 4, 'HP MUST NOT heal before Usurper decides');

  // Usurper chooses reveal_and_block -> blocks Elise's entire distribution & activates continuous aura!
  applyPlayerGameAction(
    s1,
    'p3',
    { type: 'RESOLVE_CHOICE', choiceId: s1.pendingChoice.choiceId, optionId: 'reveal_and_block' },
    1002,
  );
  assert.equal(s1.players.p3.revealed, true);
  assert.equal(s1.players.p1.woundsTaken, 4, 'Elise heal #1 MUST be blocked');
  assert.equal(s1.players.p2.woundsTaken, 4, 'Elise heal #2 MUST also be blocked by now-revealed Usurper aura');
  assert.equal(getPublicGameView(s1).usurperAuraActive, true);

  // 2. Gloria uses Holy Water (`eq-07` white-card) -> BLOCKED by revealed Usurper!
  s1.activePlayerId = 'p2';
  s1.turnPhase = 'MAIN_ACTION';
  applyPlayerGameAction(s1, 'p2', { type: 'USE_CARD', cardId: 'eq-07' }, 1003);
  assert.equal(s1.players.p2.woundsTaken, 4, 'Usurper aura MUST block Gloria white-card heal');

  // 3. Gloria uses Corridor (location heal) -> NOT blocked by Usurper!
  s1.players.p2.location = 'corridor';
  s1.turnPhase = 'LOCATION_ACTION';
  applyPlayerGameAction(s1, 'p2', { type: 'USE_LOC_POWER', targetPlayerId: 'p2', mode: 'heal' }, 1004);
  assert.equal(s1.players.p2.woundsTaken, 3, 'Usurper MUST NOT block corridor location heal');

  // 4. Usurper uses Holy Water on SELF -> NOT blocked by own aura!
  s1.activePlayerId = 'p3';
  s1.turnPhase = 'MAIN_ACTION';
  applyPlayerGameAction(s1, 'p3', { type: 'USE_CARD', cardId: 'eq-07' }, 1005);
  assert.equal(s1.players.p3.woundsTaken, 1, 'Usurper MUST still be able to self-heal (3 -> 1 wounds)');

  // 5. Urban Legend hit by Vampire Bat (black-card heal) -> NOT blocked by Usurper! AND caster STILL heals +1 HP!
  s1.activePlayerId = 'p1';
  s1.turnPhase = 'MAIN_ACTION';
  s1.players.p1.hand = ['ev-07'];
  applyPlayerGameAction(s1, 'p1', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p4' }, 1006);
  assert.equal(s1.players.p4.woundsTaken, 2, 'Usurper MUST NOT block Urban Legend black-card heal (4 -> 2)');
  assert.equal(s1.players.p1.woundsTaken, 3, 'Vampire Bat caster black-card heal (+1) MUST NOT be blocked by Usurper (4 -> 3)');
});

test('P5C-7 — Angel: armed->active->expired lifecycle, blocks Wrath AoE & newly-revealed Neutral, hp-cost bypasses, exact Church win', () => {
  const s1 = makeS38State([
    { id: 'p1', name: 'Angel', roleId: 'exp1_angel', revealed: true, location: 'lobby' },
    { id: 'p2', name: 'Wrath', roleId: 'exp1_wrath', revealed: true, location: 'lobby' },
    { id: 'p3', name: 'Bipolar', roleId: 'exp1_bipolar', revealed: false, location: 'canteen' },
    { id: 'p4', name: 'Hunter', roleId: 'gac-ky-thuat', revealed: true, location: 'court' },
    { id: 'p5', name: 'Shadow2', roleId: 'suong-an-danh', revealed: true, location: 'radio' },
  ]);

  // Turn 1: Angel arms aura (NOT yet active on Turn 1!)
  applyPlayerGameAction(s1, 'p1', { type: 'USE_SKILL' }, 1000);
  assert.equal(s1.players.p1.skillUsedOnce, true);
  assert.equal(s1.expansionState.angelAuras.p1.phase, 'armed');
  assert.equal(getPublicGameView(s1).angelProtectedPlayerIds, undefined);

  // Advance around full table until Angel's NEXT turn -> becomes ACTIVE!
  for (let i = 0; i < 5; i++) {
    s1.pendingChoice = null;
    advanceTurn(s1, 1100 + i);
  }
  assert.equal(s1.activePlayerId, 'p1');
  assert.equal(s1.expansionState.angelAuras.p1.phase, 'active');
  assert.deepEqual(getPublicGameView(s1).angelProtectedPlayerIds, ['p1']);

  // Advance to Wrath's turn (p2): Bipolar reveals mid-aura -> NOW protected too!
  advanceTurn(s1, 2000);
  s1.players.p3.revealed = true;
  assert.deepEqual(getPublicGameView(s1).angelProtectedPlayerIds, ['p1', 'p3']);

  // Wrath activates turn-start AoE (2 dmg to cluster: Angel p1 & Bipolar p3) -> BOTH immune (0 dmg)!
  assert.equal(s1.pendingChoice?.kind, 'wrath_turn_start_aoe');
  applyPlayerGameAction(
    s1,
    'p2',
    { type: 'RESOLVE_CHOICE', choiceId: s1.pendingChoice.choiceId, optionId: 'activate' },
    2001,
  );
  assert.equal(s1.players.p1.woundsTaken, 0, 'Active Angel aura MUST block Wrath AoE on Angel');
  assert.equal(s1.players.p3.woundsTaken, 0, 'Active Angel aura MUST block Wrath AoE on newly-revealed Neutral');

  // Bipolar's own hp-cost (`damage_self` on Fate Coin) MUST NOT be blocked by Angel aura!
  advanceTurn(s1, 3000);
  assert.equal(s1.pendingChoice?.kind, 'bipolar_fate_coin');
  applyPlayerGameAction(
    s1,
    'p3',
    { type: 'RESOLVE_CHOICE', choiceId: s1.pendingChoice.choiceId, optionId: 'damage_self' },
    3001,
  );
  assert.ok(s1.players.p3.woundsTaken >= 3, 'Unpreventable hp-cost MUST bypass Angel aura');

  // Advance to Angel's next turn -> aura EXPIRES!
  for (let i = 0; i < 3; i++) {
    s1.pendingChoice = null;
    advanceTurn(s1, 4000 + i);
  }
  assert.equal(s1.activePlayerId, 'p1');
  assert.equal(s1.expansionState.angelAuras.p1.phase, 'expired');

  // End-of-match victory check: Bipolar dead -> Angel wins ONLY at exact `lobby` (Church), NOT `canteen`!
  s1.players.p2.alive = false;
  s1.players.p5.alive = false; // All Shadows dead -> Hunters win
  s1.players.p3.alive = false; // Other Neutral dead!
  s1.players.p1.location = 'canteen';
  const vCanteen = evaluateVictoryWithEngine(s1);
  assert.equal(vCanteen.finished, true);
  assert.equal(vCanteen.winnerPlayerIds.includes('p1'), false, 'Paired cluster location canteen MUST NOT satisfy Angel Church win');

  s1.players.p1.location = 'lobby';
  const vLobby = evaluateVictoryWithEngine(s1);
  assert.equal(vLobby.winnerPlayerIds.includes('p1'), true, 'Exact lobby/Church MUST satisfy Angel win');
});

test('P5C-8 — Bianca: prevents single-target dmg via non-Masamune discard, AoE excluded even as sole victim, lowest-HP & tie win', () => {
  // 1. Single-target Vampire Bat -> Bianca discards non-Masamune gear to prevent 2->0 dmg; Masamune NOT discardable!
  const s1 = makeS38State([
    { id: 'p1', name: 'Attacker', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby', hand: ['ev-07', 'eq-11'] },
    { id: 'p2', name: 'Bianca', roleId: 'exp2_bianca', revealed: true, location: 'lobby', equipped: ['ev-01', 'eq-02'] },
    { id: 'p3', name: 'S1', roleId: 'suong-an-danh', revealed: true, location: 'court' },
    { id: 'p4', name: 'S2', roleId: 'suong-gac-cong', revealed: true, location: 'radio' },
  ]);
  applyPlayerGameAction(s1, 'p1', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p2' }, 1000);
  assert.equal(s1.pendingChoice?.kind, 'bianca_discard_prevent');
  assert.equal(
    s1.pendingChoice.options.some((o) => o.card?.id === 'ev-01'),
    false,
    'Bianca MUST NOT be allowed to discard Masamune',
  );
  const broOpt = s1.pendingChoice.options.find((o) => o.card?.id === 'eq-02');
  assert.ok(broOpt);
  applyPlayerGameAction(
    s1,
    'p2',
    { type: 'RESOLVE_CHOICE', choiceId: s1.pendingChoice.choiceId, optionId: broOpt.optionId },
    1001,
  );
  assert.equal(s1.players.p2.woundsTaken, 0, 'Bianca discarding 1 gear must prevent full single-target dmg');
  assert.deepEqual(s1.players.p2.equipped, ['ev-01'], 'Only discarded gear removed; Masamune remains');

  // 2. AoE Machine Gun hitting Bianca as SOLE target in range -> Bianca MUST NOT get prompt!
  const s2 = makeS38State([
    { id: 'p1', name: 'MGAttacker', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby', equipped: ['ev-01', 'ev-06'] },
    { id: 'p2', name: 'Bianca', roleId: 'exp2_bianca', revealed: true, location: 'lobby', equipped: ['eq-02'] },
    { id: 'p3', name: 'S1', roleId: 'suong-an-danh', revealed: true, location: 'court' },
    { id: 'p4', name: 'S2', roleId: 'suong-gac-cong', revealed: true, location: 'radio' },
  ]);
  applyPlayerGameAction(s2, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 2000);
  assert.equal(s2.pendingChoice ?? null, null, 'Machine Gun is AoE (isSingleTarget=false) even with 1 victim -> Bianca MUST NOT trigger');
  assert.ok(s2.players.p2.woundsTaken > 0);
  assert.deepEqual(s2.players.p2.equipped, ['eq-02']);

  // 3. AoE Wrath hitting Bianca as SOLE cluster victim -> MUST NOT trigger!
  const s3 = makeS38State([
    { id: 'p1', name: 'Wrath', roleId: 'exp1_wrath', revealed: true, location: 'lobby' },
    { id: 'p2', name: 'Bianca', roleId: 'exp2_bianca', revealed: true, location: 'canteen', equipped: ['eq-02'] },
    { id: 'p3', name: 'H1', roleId: 'gac-ky-thuat', revealed: true, location: 'court' },
    { id: 'p4', name: 'H2', roleId: 'gac-radio', revealed: true, location: 'radio' },
  ]);
  s3.turnPhase = 'ROLL_MOVE';
  applyPlayerGameAction(s3, 'p1', { type: 'USE_SKILL' }, 3000);
  applyPlayerGameAction(
    s3,
    'p1',
    { type: 'RESOLVE_CHOICE', choiceId: s3.pendingChoice.choiceId, optionId: 'activate' },
    3001,
  );
  assert.equal(s3.pendingChoice ?? null, null, 'Wrath AoE MUST NOT trigger Bianca even as sole victim');
  assert.equal(s3.players.p2.woundsTaken, 2);

  // 4. End-of-match lowest HP victory (including tie!)
  s3.players.p1.alive = false; // All Shadows dead -> Hunters win
  s3.players.p2.woundsTaken = 6; s3.players.p2.hp = 4; // Bianca 4 HP
  s3.players.p3.woundsTaken = 10; s3.players.p3.hp = 4; // Tie min 4 HP!
  s3.players.p4.woundsTaken = 2; s3.players.p4.hp = 10;
  const vTie = evaluateVictoryWithEngine(s3);
  assert.equal(vTie.finished, true);
  assert.equal(vTie.winnerPlayerIds.includes('p2'), true, 'Bianca tied for lowest remaining HP MUST win');
});

test('P5C-9 — Dalton: forced reveal at <=12 HP (not on 0 dmg), self-heal blocked, external heal allowed, post-activation kill win & highest-HP tie, Cindy/Bipolar/Dalton precedence', () => {
  // 1. Blocked 0 dmg (Guardian Angel shield) MUST NOT activate Dalton!
  const s1 = makeS38State([
    { id: 'p1', name: 'Attacker', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby', equipped: ['ev-01'] },
    { id: 'p2', name: 'Dalton', roleId: 'exp2_dalton', revealed: false, woundsTaken: 0, location: 'lobby', hand: ['eq-07'] },
    { id: 'p3', name: 'Elise', roleId: 'exp2_elise', revealed: true, woundsTaken: 0, location: 'canteen' },
    { id: 'p4', name: 'S1', roleId: 'suong-an-danh', revealed: true, location: 'court' },
    { id: 'p5', name: 'S2', roleId: 'suong-gac-cong', revealed: true, location: 'radio' },
  ]);
  s1.players.p2.guardianShieldActive = true;
  applyPlayerGameAction(s1, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, 1000);
  assert.equal(s1.players.p2.revealed, false, '0 blocked damage MUST NOT activate Dalton');
  assert.equal(Boolean(s1.expansionState.daltonActivatedByPlayer?.p2), false);

  // 2. Kill BEFORE activation does NOT grant Dalton immediate victory!
  s1.activePlayerId = 'p2';
  s1.turnPhase = 'MAIN_ACTION';
  s1.players.p4.woundsTaken = 12;
  s1.players.p4.hp = 1;
  s1.players.p2.hand = ['ev-07', 'eq-07'];
  applyPlayerGameAction(s1, 'p2', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p4' }, 1500);
  assert.equal(s1.players.p4.alive, false);
  assert.equal(s1.finished, false, 'Kill BEFORE Dalton 12-HP activation MUST NOT trigger immediate win');

  // 3. Actual damage dropping 13 -> 11 forces reveal & activates Vòng Đấu Thứ 12!
  s1.activePlayerId = 'p1';
  s1.turnPhase = 'MAIN_ACTION';
  s1.players.p1.hand = ['ev-07'];
  applyPlayerGameAction(s1, 'p1', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p2' }, 2000);
  assert.equal(s1.players.p2.woundsTaken, 2);
  assert.equal(s1.players.p2.hp, 11);
  assert.equal(s1.players.p2.revealed, true, 'Dalton hitting <= 12 HP MUST force reveal');
  assert.ok(s1.expansionState.daltonActivatedByPlayer?.p2);
  assert.deepEqual(getPublicGameView(s1).daltonActivatedPlayerIds, ['p2']);

  // 4. Self-heal (Holy Water `eq-07`) BLOCKED, external heal (Elise) ALLOWED!
  s1.activePlayerId = 'p2';
  s1.turnPhase = 'MAIN_ACTION';
  applyPlayerGameAction(s1, 'p2', { type: 'USE_CARD', cardId: 'eq-07' }, 2100);
  assert.equal(s1.players.p2.woundsTaken, 2, 'Activated Dalton self-heal via Holy Water MUST be blocked');

  s1.activePlayerId = 'p3';
  s1.turnPhase = 'MAIN_ACTION';
  applyPlayerGameAction(s1, 'p3', { type: 'USE_SKILL' }, 2200);
  const healDaltonOpt = s1.pendingChoice.options.find((o) => o.targetPlayerId === 'p2');
  assert.ok(healDaltonOpt);
  applyPlayerGameAction(
    s1,
    'p3',
    { type: 'RESOLVE_CHOICE', choiceId: s1.pendingChoice.choiceId, optionId: healDaltonOpt.optionId },
    2201,
  );
  assert.equal(s1.players.p2.woundsTaken, 0, 'External heal from Elise MUST still heal activated Dalton (2 -> 0 wounds)');

  // 5. Kill AFTER activation -> IMMEDIATE Dalton solo win!
  s1.activePlayerId = 'p2';
  s1.turnPhase = 'MAIN_ACTION';
  s1.players.p1.woundsTaken = 13;
  s1.players.p1.hp = 1;
  s1.players.p2.hand = ['ev-07'];
  applyPlayerGameAction(s1, 'p2', { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p1' }, 2300);
  assert.equal(s1.players.p1.alive, false);
  assert.equal(s1.finished, true, 'Kill AFTER Dalton activation MUST win immediately');
  assert.equal(s1.winnerFaction, 'wanderer-solo');
  assert.ok(s1.winnerPlayerIds.includes('p2'));

  // 6. End-of-match highest HP tie & Dalton + Cindy + Bipolar precedence check
  const sEnd = makeS38State([
    { id: 'p1', name: 'Hunter', roleId: 'gac-ky-thuat', revealed: true, woundsTaken: 2, location: 'lobby' }, // 12 HP
    { id: 'p2', name: 'Dalton', roleId: 'exp2_dalton', revealed: true, woundsTaken: 1, location: 'lobby' }, // 12 HP (tie max!)
    { id: 'p3', name: 'Cindy', roleId: 'exp1_cindy', revealed: true, woundsTaken: 5, location: 'radio' }, // alive
    { id: 'p4', name: 'Bipolar', roleId: 'exp1_bipolar', revealed: true, woundsTaken: 5, location: 'court' }, // alive
    { id: 'p5', name: 'Shadow', roleId: 'suong-an-danh', revealed: true, alive: false, woundsTaken: 13, location: 'breaker' }, // dead -> Hunters win!
  ]);
  const vEnd = evaluateVictoryWithEngine(sEnd);
  assert.equal(vEnd.finished, true);
  assert.equal(vEnd.winnerFaction, 'lantern-guard');
  assert.equal(vEnd.winnerPlayerIds.includes('p1'), true, 'Hunter wins');
  assert.equal(vEnd.winnerPlayerIds.includes('p2'), true, 'Dalton tied for highest HP (12) co-wins');
  assert.equal(vEnd.winnerPlayerIds.includes('p4'), true, 'Bipolar alive on Hunter win co-wins');
  assert.equal(vEnd.winnerPlayerIds.includes('p3'), false, 'Cindy does NOT win while other Neutrals are alive');
});
