'use strict';

/**
 * test/boardgame-phase6b.test.cjs
 *
 * Phase 6B — Complete Verification of ALL 10 Tier-3 Characters & `starter-forty-eight`:
 *  - P6B-1: `starter-forty-eight` ruleset (exact 58 playable: 19H/18S/21N), 8 Tier-4 strictly locked, production classic-only
 *  - P6B-2: Gideon (`exp2_gideon`) — post-Shadow-elimination 3 sequential White cards (own kill, other kill, AoE multi-Shadow, Gideon dies in batch, deck reshuffle/exhaustion, targeting choice)
 *  - P6B-3: Anathema (`exp1_anathema`) — turn-start curse redirection, end-turn 1 unpreventable direct self-dmg, target dies ends curse, AoE hitting both, survival victory
 *  - P6B-4: Bethany (`exp1_bethany`) — turn-start designation, own-turn `TRANSFER_TO_BETHANY`, Masamune block, single active Chosen replacement, `SHARE_OUTCOME` co-win (even dead), 0 Chosen loss
 *  - P6B-5: Arnold (`exp1_arnold`) — hidden P0 secret lethal reflection preserving pre-event HP, source-less exclusion, Arnold vs Arnold loop block, Arnold vs Anathema visited-set guard, > 2 living players victory
 *  - P6B-6: Cassie (`exp1_cassie`) — turn-start heal via HealPipeline (Usurper blocks), first normal Neutral `COPY_GOAL` (death/final excluded, no rebind, 5P unresolved, distinct from SHARE_OUTCOME)
 *  - P6B-7: Clairvoyant (`exp1_clairvoyant`) — once/match private peek & `COPY_GOAL` (zero leak in public/opponent/spectator/logs, target stays hidden, Hunter/Shadow/Neutral copy, all-revealed unavailable)
 *  - P6B-8: April & Skipps (`exp2_april_skipps`) — wound position 7 forced reveal (`hp=1`), lethal skip no trigger, heal after 7 keeps countdown, next-own-turn immediate victory vs unrevealed end-of-match victory
 *  - P6B-9: Colt (`exp2_colt`) — genuine theft (`court`, `ev-11`, `Bob`) counterattack ignoring range, >= 2 dmg recover exact item atomically (0 dmg) vs deal dmg, voluntary gift ignored, 3 qualifying weapons (`ev-02..ev-05`) immediate win
 *  - P6B-10: Diana (`exp2_diana`) — first normal Neutral pending customer (silent!) -> activates & reveals at customer's next own turn, customer dies before activation cancels (full-HP fallback), Hunter/Shadow ignored
 *  - P6B-11: Aaron (`exp2_aaron`) — first normal living female reveal -> spouse & forced reveal, blocks attack / excludes Machine Gun / overrides Masamune mandatory attack on spouse, both-alive vs unmatched dead-before-end (NOT immediate!)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
require('./register-ts.cjs');

const domain = require('../features/boardgame/domain/index.ts');

function makeState(specs, opts = {}) {
  const players = {};
  const turnOrder = [];
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    const design = domain.getRoleDesign(s.roleId);
    const maxHp = s.maxHp ?? design.maxHp;
    const wounds = s.woundsTaken ?? (s.alive === false ? maxHp : 0);
    const hp = s.alive === false ? 0 : Math.max(0, maxHp - wounds);
    players[s.id] = {
      playerId: s.id,
      displayName: s.name ?? s.id,
      seatIndex: i,
      roleId: s.roleId,
      faction: s.faction ?? design.faction,
      hp,
      maxHp,
      woundsTaken: wounds,
      location: s.location ?? 'lobby',
      hand: [...(s.hand ?? [])],
      equipped: [...(s.equipped ?? [])],
      revealed: Boolean(s.revealed),
      alive: s.alive !== false,
      connected: s.connected !== false,
      skillCooldown: 0,
      skillUsedOnce: Boolean(s.skillUsedOnce),
      guardianShieldActive: Boolean(s.guardianShieldActive),
      attacksMade: 0,
      attacksThisTurn: s.attacksThisTurn ?? 0,
      lastAttackTargetId: null,
      investigationsCount: 0,
      consecutiveSameZoneRolls: 0,
      eliminatedRound: s.alive === false ? 1 : null,
      eliminatedByPlayerId: null,
      protegePlayerId: null,
      avengedProtegeKiller: false,
      charlesKillWon: false,
      investigatedTargetIds: [],
      privateClues: [],
      appearance: {
        gender: s.appearanceGender ?? 'male',
        outfit: 'hust-jacket',
        hairColor: '#111111',
      },
    };
    turnOrder.push(s.id);
  }
  const state = {
    rulesetVersion: 4,
    rulesetId: opts.rulesetId ?? 'starter-forty-eight',
    matchId: opts.matchId ?? 'p6b-match',
    seed: opts.seed ?? 4242,
    rngState: opts.rngState ?? 4242,
    round: opts.round ?? 2,
    maxRounds: 14,
    turnNumber: opts.turnNumber ?? 5,
    turnPhase: opts.turnPhase ?? 'MAIN_ACTION',
    activePlayerId: opts.activePlayerId ?? turnOrder[0],
    turnOrder,
    clusterPairs: domain.DEFAULT_CLUSTER_PAIRS,
    firstDeadPlayerId: null,
    extraTurnPending: false,
    players,
    decks: {
      investigation: [...(opts.invDeck ?? [])],
      equipment: [...(opts.eqDeck ?? [])],
      event: [...(opts.evDeck ?? [])],
    },
    discards: {
      investigation: [...(opts.invDiscard ?? [])],
      equipment: [...(opts.eqDiscard ?? [])],
      event: [...(opts.evDiscard ?? [])],
    },
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

// ---------------------------------------------------------------------------
// P6B-1: `starter-forty-eight` ruleset composition, bindings & Tier-4 hard lock
// ---------------------------------------------------------------------------
test('P6B-1: starter-forty-eight has exact 58 playable roles (19H/18S/21N), 8 Tier-4 locked, prod classic-only', () => {
  const reg = domain.DEFAULT_RULESET_REGISTRY;
  const charReg = domain.DEFAULT_CHARACTER_REGISTRY;

  // Production MUST reject starter-forty-eight
  const prodCheck = reg.validateRulesetForMatch('starter-forty-eight', 6, { allowExperimental: false });
  assert.equal(prodCheck.ok, false);
  assert.equal(prodCheck.code, 'RULESET_UNAVAILABLE');

  // Experimental validation passes with exact 19H / 18S / 21N = 58
  const expCheck = reg.validateRulesetForMatch('starter-forty-eight', 6, { allowExperimental: true });
  assert.equal(expCheck.ok, true, expCheck.ok ? '' : expCheck.error);
  assert.equal(expCheck.pools.lanternGuard.length, 19);
  assert.equal(expCheck.pools.mistOrder.length, 18);
  assert.equal(expCheck.pools.wanderer.length, 21);
  assert.equal(
    expCheck.pools.lanternGuard.length + expCheck.pools.mistOrder.length + expCheck.pools.wanderer.length,
    58,
  );

  // All 10 Phase 6 roles have real skillImpl + victoryImpl + house-rule-approved
  for (const id of domain.PHASE6_ROLE_IDS) {
    const entry = charReg.get(id);
    assert.ok(entry, `Missing registry entry for ${id}`);
    assert.equal(entry.metadata.rulesStatus, 'house-rule-approved');
    assert.equal(entry.metadata.implementationStatus, 'implemented');
    assert.ok(entry.skillImpl !== null, `Missing skillImpl for ${id}`);
    assert.ok(entry.victoryImpl !== null, `Missing victoryImpl for ${id}`);
    assert.equal(domain.isCharacterPlayable(entry, { allowExperimentalHouseRules: true }), true);
  }

  // All 8 Tier-4 roles MUST remain locked and absent from starter-forty-eight!
  const TIER4_IDS = [
    'exp1_lloyd',
    'exp1_vengeful_spirit',
    'exp1_voodoo',
    'exp1_undead',
    'exp1_antimony',
    'exp2_cain',
    'exp2_bonnie',
    'exp2_nc_soldier',
  ];
  const allS48 = new Set([
    ...expCheck.pools.lanternGuard,
    ...expCheck.pools.mistOrder,
    ...expCheck.pools.wanderer,
  ]);
  for (const t4 of TIER4_IDS) {
    assert.equal(allS48.has(t4), false, `Tier-4 ${t4} MUST NOT enter starter-forty-eight`);
    const entry = charReg.get(t4);
    assert.equal(entry.metadata.rulesStatus, 'needs-clarification');
    assert.equal(entry.metadata.implementationStatus, 'not-started');
    assert.equal(domain.isCharacterPlayable(entry, { allowExperimentalHouseRules: true }), false);
  }

  // expansion-1 / expansion-2 / full-expansion remain coming-soon / disabled in production
  for (const locked of ['expansion-1', 'expansion-2', 'full-expansion']) {
    const chk = reg.validateRulesetForMatch(locked, 6, { allowExperimental: true });
    assert.equal(chk.ok, false, `${locked} must remain locked while 8 Tier-4 roles are unimplemented`);
  }
});

// ---------------------------------------------------------------------------
// P6B-2: Gideon — Post-Shadow elimination draws & sequentially uses 3 White cards
// ---------------------------------------------------------------------------
test('P6B-2: Gideon triggers out-of-turn on Shadow kill, sequentially resolves 3 White cards with targeting & reshuffle', () => {
  const state = makeState(
    [
      { id: 'killer', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby', hand: ['ev-07'] },
      { id: 'gideon', roleId: 'exp2_gideon', revealed: true, woundsTaken: 4, location: 'canteen' },
      { id: 'sh1', roleId: 'suong-an-danh', revealed: true, woundsTaken: 12, location: 'lobby' }, // 1 HP left
      { id: 'sh2', roleId: 'suong-gac-cong', revealed: true, woundsTaken: 0, location: 'radio' },
    ],
    {
      activePlayerId: 'killer',
      turnPhase: 'MAIN_ACTION',
      // Deck has 1 equipment (`eq-01`), discard has 2 cards (`eq-07` Holy Water + `eq-08` Blessing) -> tests reshuffle!
      eqDeck: ['eq-01'],
      eqDiscard: ['eq-07', 'eq-08'],
    },
  );

  // Another player (killer) kills Shadow sh1 with Vampire Bat -> Gideon reacts OUT OF TURN!
  const res = domain.applyPlayerGameAction(
    state,
    'killer',
    { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'sh1' },
    1000,
  );
  assert.equal(res.ok, true);
  assert.equal(state.players.sh1.alive, false);
  assert.ok(state.pendingChoice, 'Gideon should get gideon_draw_white choice');
  assert.equal(state.pendingChoice.kind, 'gideon_draw_white');
  assert.equal(state.pendingChoice.ownerPlayerId, 'gideon');

  // Gideon activates!
  const act = domain.applyPlayerGameAction(
    state,
    'gideon',
    { type: 'RESOLVE_CHOICE', choiceId: state.pendingChoice.choiceId, optionId: 'activate' },
    1100,
  );
  assert.equal(act.ok, true);
  // Card #1 (`eq-01`) equipped immediately!
  assert.ok(state.players.gideon.equipped.includes('eq-01'), 'Card #1 equipment equipped');
  // Because discard was shuffled (`eq-07`, `eq-08`), one of cards #2/#3 is `eq-08` Blessing opening target choice!
  assert.ok(state.pendingChoice && state.pendingChoice.kind === 'gideon_white_card_target');
  const targetOpt = state.pendingChoice.options[0].optionId;
  const pickRes = domain.applyPlayerGameAction(
    state,
    'gideon',
    { type: 'RESOLVE_CHOICE', choiceId: state.pendingChoice.choiceId, optionId: targetOpt },
    1200,
  );
  assert.equal(pickRes.ok, true);
  assert.equal(state.pendingChoice, null, 'All 3 White cards resolved cleanly');
  assert.equal(state.players.gideon.woundsTaken, 2, 'Holy Water healed Gideon 4 -> 2 wounds');

  // Gideon dying in the same AoE wave MUST NOT trigger Gideon!
  const stateAoE = makeState(
    [
      { id: 'caster', roleId: 'gac-ky-thuat', revealed: true, hand: ['eq-11'] }, // Flare 2 dmg AoE
      { id: 'gideon', roleId: 'exp2_gideon', revealed: true, woundsTaken: 13 }, // 1 HP -> dies!
      { id: 'sh1', roleId: 'suong-an-danh', revealed: true, woundsTaken: 12 }, // 1 HP -> dies!
      { id: 'sh2', roleId: 'suong-gac-cong', revealed: true, woundsTaken: 0 },
    ],
    { activePlayerId: 'caster', eqDeck: ['eq-01', 'eq-02', 'eq-03'] },
  );
  const resAoE = domain.applyPlayerGameAction(stateAoE, 'caster', { type: 'USE_CARD', cardId: 'eq-11' }, 2000);
  assert.equal(resAoE.ok, true);
  assert.equal(stateAoE.players.gideon.alive, false);
  assert.equal(stateAoE.pendingChoice ?? null, null, 'Dead Gideon must NOT trigger');
});

// ---------------------------------------------------------------------------
// P6B-3: Anathema — Curse redirection, end-turn 1 direct dmg, target death ends curse
// ---------------------------------------------------------------------------
test('P6B-3: Anathema redirects eligible damage, takes 1 direct self-dmg end of activation turn & ends curse on victim death', () => {
  const state = makeState(
    [
      { id: 'anathema', roleId: 'exp1_anathema', revealed: false, location: 'lobby' },
      { id: 'victim', roleId: 'gac-truc-ban', revealed: true, woundsTaken: 6, location: 'lobby' }, // 4 HP left
      { id: 'sh', roleId: 'suong-an-danh', revealed: true, location: 'lobby', hand: ['ev-07'] },
      { id: 'h2', roleId: 'gac-ky-thuat', revealed: true, location: 'canteen' },
    ],
    { activePlayerId: 'anathema', turnPhase: 'ROLL_MOVE', turnNumber: 3 },
  );

  // Unrevealed Anathema casts Lời Nguyền at turn start (ROLL_MOVE) via USE_SKILL
  const cast = domain.applyPlayerGameAction(state, 'anathema', { type: 'USE_SKILL' }, 1000);
  assert.equal(cast.ok, true);
  assert.equal(state.pendingChoice.kind, 'anathema_curse_target');
  const victimOpt = state.pendingChoice.options.find((o) => o.targetPlayerId === 'victim');
  assert.ok(victimOpt);
  const pick = domain.applyPlayerGameAction(
    state,
    'anathema',
    { type: 'RESOLVE_CHOICE', choiceId: state.pendingChoice.choiceId, optionId: victimOpt.optionId },
    1100,
  );
  assert.equal(pick.ok, true);
  assert.equal(state.players.anathema.revealed, true);
  assert.equal(state.players.anathema.skillUsedOnce, true);
  assert.equal(domain.getPublicGameView(state).anathemaCursedTargetByPlayer.anathema, 'victim');

  // End Anathema's activation turn -> Anathema directly takes 1 unpreventable self-dmg (NOT redirected!)
  state.turnPhase = 'MAIN_ACTION';
  const endRes = domain.applyPlayerGameAction(state, 'anathema', { type: 'END_TURN' }, 1200);
  assert.equal(endRes.ok, true);
  assert.equal(state.players.anathema.woundsTaken, 1, 'Anathema took 1 direct end-turn cost');
  assert.equal(state.players.victim.woundsTaken, 6, 'End-turn 1 cost MUST NOT redirect to victim');

  // Now Shadow `sh` uses Vampire Bat (2 dmg) targeting Anathema -> redirected to victim!
  state.activePlayerId = 'sh';
  state.turnPhase = 'MAIN_ACTION';
  const batRes = domain.applyPlayerGameAction(
    state,
    'sh',
    { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'anathema' },
    1300,
  );
  assert.equal(batRes.ok, true);
  assert.equal(state.players.anathema.woundsTaken, 1, 'Anathema took 0 from redirected Vampire Bat');
  assert.equal(state.players.victim.woundsTaken, 8, 'Victim received redirected 2 dmg (6 -> 8)');

  // Lethal redirected damage kills victim -> curse ends permanently; next hit damages Anathema!
  state.players.sh.hand.push('ev-07');
  domain.applyPlayerGameAction(
    state,
    'sh',
    { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'anathema' },
    1400,
  );
  assert.equal(state.players.victim.alive, false);
  assert.equal(state.expansionState.anathemaCurses.anathema.active, false);

  state.players.sh.hand.push('ev-07');
  domain.applyPlayerGameAction(
    state,
    'sh',
    { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'anathema' },
    1500,
  );
  assert.equal(state.players.anathema.woundsTaken, 3, 'After curse victim dies, Anathema takes normal damage');
});

// ---------------------------------------------------------------------------
// P6B-4: Bethany — Turn-start designate, TRANSFER_TO_BETHANY, Masamune block & SHARE_OUTCOME
// ---------------------------------------------------------------------------
test('P6B-4: Bethany designates Chosen, accepts own-turn TRANSFER_TO_BETHANY, blocks Masamune & shares Chosen win', () => {
  const state = makeState(
    [
      { id: 'bethany', roleId: 'exp1_bethany', revealed: true, equipped: ['eq-01', 'ev-01'] },
      { id: 'p2', roleId: 'gac-ky-thuat', revealed: true, equipped: ['eq-02', 'ev-01'] },
      { id: 'p3', roleId: 'suong-an-danh', revealed: true, woundsTaken: 12 },
      { id: 'p4', roleId: 'gac-truc-ban', revealed: true },
    ],
    { activePlayerId: 'bethany', turnPhase: 'ROLL_MOVE', turnNumber: 4 },
  );

  // Bethany turn-start designation excludes Masamune (`ev-01`)
  const sk = domain.applyPlayerGameAction(state, 'bethany', { type: 'USE_SKILL' }, 1000);
  assert.equal(sk.ok, true);
  assert.equal(state.pendingChoice.kind, 'bethany_designate_chosen');
  assert.ok(
    !state.pendingChoice.options.some((o) => o.card?.id === 'ev-01'),
    'Masamune must not appear in Bethany gift options',
  );
  const optP3 = state.pendingChoice.options.find((o) => o.targetPlayerId === 'p3');
  domain.applyPlayerGameAction(
    state,
    'bethany',
    { type: 'RESOLVE_CHOICE', choiceId: state.pendingChoice.choiceId, optionId: optP3.optionId },
    1100,
  );
  assert.equal(state.expansionState.bethanyChosenByPlayer.bethany.chosenPlayerId, 'p3');
  assert.ok(state.players.p3.equipped.includes('eq-01'));
  assert.ok(!state.players.bethany.equipped.includes('eq-01'));

  // On p2's turn: Masamune transfer rejected; eq-02 transfer succeeds and replaces Chosen!
  state.activePlayerId = 'p2';
  state.turnPhase = 'MAIN_ACTION';
  const badMasa = domain.applyPlayerGameAction(
    state,
    'p2',
    { type: 'TRANSFER_TO_BETHANY', targetPlayerId: 'bethany', cardId: 'ev-01' },
    1200,
  );
  assert.equal(badMasa.ok, false);

  const offer = domain.applyPlayerGameAction(
    state,
    'p2',
    { type: 'TRANSFER_TO_BETHANY', targetPlayerId: 'bethany', cardId: 'eq-02' },
    1300,
  );
  assert.equal(offer.ok, true);
  assert.equal(state.expansionState.bethanyChosenByPlayer.bethany.chosenPlayerId, 'p2');
  assert.ok(state.players.bethany.equipped.includes('eq-02'));
  assert.equal(domain.getPublicGameView(state).bethanyChosenTargetByPlayer.bethany, 'p2');

  // Even if Bethany is dead when Chosen (p2 Hunter) eliminates last Shadow -> Bethany co-wins!
  state.players.bethany.alive = false;
  state.players.bethany.hp = 0;
  state.players.p2.hand.push('ev-07');
  domain.applyPlayerGameAction(
    state,
    'p2',
    { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'p3' },
    1400,
  );
  assert.equal(state.finished, true);
  assert.ok(state.winnerPlayerIds.includes('p2'));
  assert.ok(state.winnerPlayerIds.includes('bethany'), 'Dead Bethany co-wins via SHARE_OUTCOME when Chosen wins');
});

// ---------------------------------------------------------------------------
// P6B-5: Arnold — Hidden P0 lethal reflection preserving HP & > 2 living players victory
// ---------------------------------------------------------------------------
test('P6B-5: Hidden Arnold reflects lethal dmg preserving HP with masked P0 payload & wins with > 2 survivors', () => {
  const state = makeState(
    [
      { id: 'atk', roleId: 'gac-ky-thuat', revealed: true, woundsTaken: 11, hand: ['ev-10'] }, // 3 HP left
      { id: 'arnold', roleId: 'exp1_arnold', revealed: false, woundsTaken: 6 }, // 2 HP left
      { id: 'sh', roleId: 'suong-an-danh', revealed: true, woundsTaken: 0 },
      { id: 'h2', roleId: 'gac-truc-ban', revealed: true, woundsTaken: 0 },
    ],
    { activePlayerId: 'atk', turnPhase: 'MAIN_ACTION' },
  );

  // Inject deterministic lethal damage step (3 dmg from atk -> arnold who has 2 HP)
  state.expansionState.pendingSteps.push({
    kind: 'DAMAGE',
    damageEventId: 'dmg-lethal-arnold',
    targetPlayerId: 'arnold',
    attackerPlayerId: 'atk',
    rawAmount: 3,
    sourceType: 'skill',
    isSingleTarget: true,
  });
  domain.drainPendingSteps(state, 1000, {
    finalizeIfFinished: () => false,
    advanceTurn: () => {},
    canTriggerCharlesBloodyFeast: () => false,
  });

  // Hidden P0 secret choice checks!
  assert.ok(state.pendingChoice);
  assert.equal(state.pendingChoice.kind, 'arnold_reflect_lethal');
  assert.equal(state.pendingChoice.isSecret, true);
  const pub = domain.getPublicGameView(state);
  assert.equal(pub.pendingChoice.ownerPlayerId, null, 'Public view hides Arnold owner');
  assert.equal(pub.pendingChoice.kind, null, 'Public view hides Arnold kind');

  // Arnold activates reflect -> preserves exact pre-event HP (2 HP!), kills atk (3 HP -> 0 HP)!
  const refRes = domain.applyPlayerGameAction(
    state,
    'arnold',
    { type: 'RESOLVE_CHOICE', choiceId: state.pendingChoice.choiceId, optionId: 'reflect' },
    1100,
  );
  assert.equal(refRes.ok, true);
  assert.equal(state.players.arnold.alive, true);
  assert.equal(state.players.arnold.hp, 2, 'Arnold preserves exact pre-event HP (2)');
  assert.equal(state.players.arnold.skillUsedOnce, true);
  assert.equal(state.players.arnold.revealed, true);
  assert.equal(state.players.atk.alive, false, 'Attacker eliminated by reflected 3 lethal damage');

  // Victory check: 3 living players (arnold, sh, h2) > 2 -> Arnold wins when match ends!
  state.round = 15; // maxRounds exceeded
  const ev3 = domain.evaluateExpandedVictory(state);
  assert.ok(ev3.winnerPlayerIds.includes('arnold'), 'Arnold wins with 3 (> 2) living players');

  // With only 2 living players -> Arnold LOSES!
  state.players.h2.alive = false;
  state.players.h2.hp = 0;
  const ev2 = domain.evaluateExpandedVictory(state);
  assert.ok(!ev2.winnerPlayerIds.includes('arnold'), 'Arnold loses with <= 2 living players');
});

// ---------------------------------------------------------------------------
// P6B-6: Cassie — Turn-start HealPipeline (Usurper blocks) & first normal Neutral COPY_GOAL
// ---------------------------------------------------------------------------
test('P6B-6: Cassie heals 1 HP via HealPipeline (Usurper blocks) & silently binds first normal Neutral reveal', () => {
  const state = makeState(
    [
      { id: 'cassie', roleId: 'exp1_cassie', revealed: false, woundsTaken: 3 },
      { id: 'allie', roleId: 'lang-quan-sat', revealed: false },
      { id: 'bob', roleId: 'lang-anh-san', revealed: false },
      { id: 'usurper', roleId: 'exp2_usurper', revealed: true },
      { id: 'h1', roleId: 'gac-ky-thuat', revealed: true },
    ],
    { activePlayerId: 'allie', turnPhase: 'MAIN_ACTION' },
  );

  // Allie voluntarily reveals -> Cassie silently binds COPY_GOAL(Allie) with ZERO public leak!
  const prevLogs = state.publicLog.length;
  domain.applyPlayerGameAction(state, 'allie', { type: 'REVEAL_ROLE' }, 1000);
  assert.equal(state.expansionState.cassieCopiedGoalByPlayer.cassie.targetPlayerId, 'allie');
  assert.equal(state.expansionState.cassieCopiedGoalByPlayer.cassie.sourceRoleId, 'lang-quan-sat');
  const newLogs = state.publicLog.slice(prevLogs).map((l) => l.text).join(' ');
  assert.equal(newLogs.toLowerCase().includes('cassie'), false, 'Hidden Cassie binding must NEVER log publicly');

  // Second Neutral (Bob) reveals -> Cassie does NOT rebind!
  state.activePlayerId = 'bob';
  domain.applyPlayerGameAction(state, 'bob', { type: 'REVEAL_ROLE' }, 1100);
  assert.equal(state.expansionState.cassieCopiedGoalByPlayer.cassie.targetPlayerId, 'allie');

  // Cassie reveals and uses turn-start heal -> blocked by revealed Usurper!
  state.players.cassie.revealed = true;
  state.activePlayerId = 'cassie';
  state.turnPhase = 'ROLL_MOVE';
  const sk = domain.applyPlayerGameAction(state, 'cassie', { type: 'USE_SKILL' }, 1200);
  assert.equal(sk.ok, true);
  assert.equal(state.pendingChoice.kind, 'cassie_turn_heal');
  const selfOpt = state.pendingChoice.options.find((o) => o.targetPlayerId === 'cassie');
  domain.applyPlayerGameAction(
    state,
    'cassie',
    { type: 'RESOLVE_CHOICE', choiceId: state.pendingChoice.choiceId, optionId: selfOpt.optionId },
    1300,
  );
  assert.equal(state.players.cassie.woundsTaken, 3, 'Revealed Usurper blocks Cassie skill heal');

  // Remove Usurper -> next turn Cassie heals self 3 -> 2!
  state.players.usurper.alive = false;
  state.players.usurper.hp = 0;
  state.turnNumber += 1;
  domain.applyPlayerGameAction(state, 'cassie', { type: 'USE_SKILL' }, 1400);
  const selfOpt2 = state.pendingChoice.options.find((o) => o.targetPlayerId === 'cassie');
  domain.applyPlayerGameAction(
    state,
    'cassie',
    { type: 'RESOLVE_CHOICE', choiceId: state.pendingChoice.choiceId, optionId: selfOpt2.optionId },
    1500,
  );
  assert.equal(state.players.cassie.woundsTaken, 2, 'Cassie heals 1 HP through HealPipeline');
});

// ---------------------------------------------------------------------------
// P6B-7: Clairvoyant — Private peek & COPY_GOAL with P0 zero-leak isolation
// ---------------------------------------------------------------------------
test('P6B-7: Clairvoyant privately peeks unrevealed target, copies goal, keeps target hidden & leaks nothing', () => {
  const state = makeState(
    [
      { id: 'clair', roleId: 'exp1_clairvoyant', revealed: true },
      { id: 'hiddenH', roleId: 'gac-ky-thuat', revealed: false },
      { id: 'sh', roleId: 'suong-an-danh', revealed: true },
      { id: 'n2', roleId: 'lang-quan-sat', revealed: true },
    ],
    { activePlayerId: 'clair', turnPhase: 'ROLL_MOVE' },
  );

  const sk = domain.applyPlayerGameAction(state, 'clair', { type: 'USE_SKILL' }, 1000);
  assert.equal(sk.ok, true);
  assert.equal(state.pendingChoice.kind, 'clairvoyant_peek_copy');
  assert.equal(state.pendingChoice.options.filter((o) => o.optionId !== 'skip').length, 1, 'Only hiddenH is unrevealed');
  const peekOpt = state.pendingChoice.options.find((o) => o.targetPlayerId === 'hiddenH');
  const res = domain.applyPlayerGameAction(
    state,
    'clair',
    { type: 'RESOLVE_CHOICE', choiceId: state.pendingChoice.choiceId, optionId: peekOpt.optionId },
    1100,
  );
  assert.equal(res.ok, true);
  assert.equal(state.players.clair.skillUsedOnce, true);
  assert.equal(state.players.clair.faction, 'wanderer', 'Clairvoyant faction stays wanderer');
  assert.equal(state.players.hiddenH.revealed, false, 'Target remains unrevealed publicly');

  // Owner privateView has exact role; publicView & opponent privateViews have ZERO leak!
  const privClair = domain.getPrivateGameView(state, 'clair');
  assert.equal(privClair.clairvoyantReveals.length, 1);
  assert.equal(privClair.clairvoyantReveals[0].roleId, 'gac-ky-thuat');
  const pub = domain.getPublicGameView(state);
  assert.equal(JSON.stringify(pub).includes('gac-ky-thuat'), false);
  assert.equal(JSON.stringify(pub).includes('Minh'), false);
  assert.equal(domain.getPrivateGameView(state, 'hiddenH').clairvoyantReveals, undefined);
  assert.equal(domain.getPrivateGameView(state, 'sh').clairvoyantReveals, undefined);

  // When Hunters win (sh dies), Clairvoyant co-wins via COPY_GOAL!
  state.players.sh.alive = false;
  state.players.sh.hp = 0;
  const ev = domain.evaluateExpandedVictory(state);
  assert.equal(ev.finished, true);
  assert.ok(ev.winnerPlayerIds.includes('clair'), 'Clairvoyant wins when copied Hunter goal succeeds');
});

// ---------------------------------------------------------------------------
// P6B-8: April & Skipps — Wound 7 trigger, lethal skip, next-own-turn immediate win & unrevealed win
// ---------------------------------------------------------------------------
test('P6B-8: April & Skipps triggers at exact 7 wounds, ignores lethal skip & wins at end of next own turn', () => {
  // Case 1: Lethal skipping 7 wounds (5 -> 8 wounds) MUST NOT trigger!
  const stateSkip = makeState(
    [
      { id: 'atk', roleId: 'gac-ky-thuat', revealed: true },
      { id: 'april', roleId: 'exp2_april_skipps', revealed: false, woundsTaken: 5 }, // 3 HP left
      { id: 'sh', roleId: 'suong-an-danh', revealed: true },
      { id: 'h2', roleId: 'gac-truc-ban', revealed: true },
    ],
    { activePlayerId: 'atk' },
  );
  stateSkip.expansionState.pendingSteps.push({
    kind: 'DAMAGE',
    damageEventId: 'dmg-skip-7',
    targetPlayerId: 'april',
    attackerPlayerId: 'atk',
    rawAmount: 3,
    sourceType: 'skill',
    isSingleTarget: true,
  });
  domain.drainPendingSteps(stateSkip, 1000, {
    finalizeIfFinished: () => false,
    advanceTurn: () => {},
    canTriggerCharlesBloodyFeast: () => false,
  });
  assert.equal(stateSkip.players.april.alive, false);
  assert.equal(stateSkip.expansionState.aprilSkippsCountdownByPlayer, undefined, 'Lethal skip must NOT trigger countdown');

  // Case 2: Exact 7 wounds (5 -> 7 wounds, 1 HP left) triggers forced reveal -> survives to end of next OWN turn -> immediate win!
  const stateWin = makeState(
    [
      { id: 'atk', roleId: 'gac-ky-thuat', revealed: true, hand: ['ev-07'] },
      { id: 'april', roleId: 'exp2_april_skipps', revealed: false, woundsTaken: 5 },
      { id: 'sh', roleId: 'suong-an-danh', revealed: true },
      { id: 'h2', roleId: 'gac-truc-ban', revealed: true },
    ],
    { activePlayerId: 'atk', turnPhase: 'MAIN_ACTION', turnNumber: 4 },
  );
  domain.applyPlayerGameAction(
    stateWin,
    'atk',
    { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'april' },
    1000,
  );
  assert.equal(stateWin.players.april.woundsTaken, 7);
  assert.equal(stateWin.players.april.hp, 1);
  assert.equal(stateWin.players.april.revealed, true, 'Forced reveal at exact 7 wounds');
  assert.equal(stateWin.expansionState.aprilSkippsCountdownByPlayer.april.revealedBySkill, true);
  assert.equal(stateWin.finished, false);

  // Even if healed after reaching 7, countdown stays active and wins when April finishes next OWN turn!
  stateWin.players.april.woundsTaken = 4;
  stateWin.players.april.hp = 4;
  domain.applyPlayerGameAction(stateWin, 'atk', { type: 'END_TURN' }, 1100);
  assert.equal(stateWin.activePlayerId, 'april');
  assert.equal(stateWin.turnNumber, 5);
  stateWin.turnPhase = 'MAIN_ACTION';
  domain.applyPlayerGameAction(stateWin, 'april', { type: 'END_TURN' }, 1200);
  assert.equal(stateWin.finished, true, 'April & Skipps wins immediately at end of next own turn');
  assert.equal(stateWin.winnerFaction, 'wanderer-solo');
  assert.ok(stateWin.winnerPlayerIds.includes('april'));

  // Case 3: Unrevealed April & Skipps wins at normal match end
  const stateHidden = makeState([
    { id: 'april', roleId: 'exp2_april_skipps', revealed: false, woundsTaken: 2 },
    { id: 'h1', roleId: 'gac-ky-thuat', revealed: true },
    { id: 'sh', roleId: 'suong-an-danh', revealed: true, alive: false },
  ]);
  const evH = domain.evaluateExpandedVictory(stateHidden);
  assert.ok(evH.winnerPlayerIds.includes('april'), 'Unrevealed alive April wins at match end');
});

// ---------------------------------------------------------------------------
// P6B-9: Colt — Theft counterattack ignoring range, atomic recover vs dmg, 3-weapon win
// ---------------------------------------------------------------------------
test('P6B-9: Colt counterattacks remote theft, atomically recovers exact item on >=2 dmg & wins with 3 weapons', () => {
  // Find a seed where |d6 - d4| >= 2 on Colt's roll (Colt has ev-02 +1 dmg, so baseDmg >= 1 -> rawDmg >= 2!)
  const state = makeState(
    [
      { id: 'thief', roleId: 'gac-ky-thuat', revealed: true, location: 'court', woundsTaken: 0 },
      {
        id: 'colt',
        roleId: 'exp2_colt',
        revealed: true,
        location: 'lobby', // DIFFERENT cluster from court -> tests ignoring range!
        equipped: ['ev-02', 'ev-03', 'ev-01'], // Masamune guarantees 1d4 (1..4) + weapons (+1/+1) >= 2 ALWAYS!
      },
      { id: 'sh', roleId: 'suong-an-danh', revealed: true, location: 'radio' },
      { id: 'h2', roleId: 'gac-truc-ban', revealed: true, location: 'canteen' },
    ],
    { activePlayerId: 'thief', turnPhase: 'LOCATION_ACTION' },
  );

  // Thief uses Sân Bóng (court Ô 10) to steal ev-03 Chainsaw from Colt across clusters!
  const stealRes = domain.applyPlayerGameAction(
    state,
    'thief',
    { type: 'USE_LOC_POWER', targetPlayerId: 'colt', mode: 'steal', equipCardId: 'ev-03' },
    1000,
  );
  assert.equal(stealRes.ok, true);
  assert.ok(state.players.thief.equipped.includes('ev-03'));
  assert.ok(!state.players.colt.equipped.includes('ev-03'));
  assert.ok(state.pendingChoice && state.pendingChoice.kind === 'colt_theft_counter');

  // Colt counterattacks! With Masamune (1d4 >= 1) + ev-02 (+1) -> >= 2 dmg guaranteed -> opens recover/damage choice!
  domain.applyPlayerGameAction(
    state,
    'colt',
    { type: 'RESOLVE_CHOICE', choiceId: state.pendingChoice.choiceId, optionId: 'counter' },
    1100,
  );
  assert.ok(state.pendingChoice && state.pendingChoice.kind === 'colt_recover_or_damage');

  // Colt chooses atomic recovery -> gets exact ev-03 back, thief takes 0 dmg, NO duplicate!
  domain.applyPlayerGameAction(
    state,
    'colt',
    { type: 'RESOLVE_CHOICE', choiceId: state.pendingChoice.choiceId, optionId: 'recover_item' },
    1200,
  );
  assert.equal(state.pendingChoice, null);
  assert.equal(state.players.thief.woundsTaken, 0, 'Recover item deals 0 damage');
  assert.ok(!state.players.thief.equipped.includes('ev-03'));
  assert.equal(state.players.colt.equipped.filter((id) => id === 'ev-03').length, 1);

  // Immediate 3-weapon win: Colt equips ev-04 (`ev-02`, `ev-03`, `ev-04` = 3 qualifying weapons; ev-01 Masamune doesn't count!)
  state.players.colt.equipped.push('ev-04');
  const evWin = domain.evaluateExpandedVictory(state);
  assert.equal(evWin.finished, true);
  assert.equal(evWin.winnerFaction, 'wanderer-solo');
  assert.ok(evWin.winnerPlayerIds.includes('colt'));
});

// ---------------------------------------------------------------------------
// P6B-10: Diana — First normal Neutral pending customer -> activates next own turn & fallback
// ---------------------------------------------------------------------------
test('P6B-10: Diana binds first normal Neutral silently, activates on customer next turn & uses full-HP fallback if cancelled', () => {
  const state = makeState(
    [
      { id: 'h1', roleId: 'gac-ky-thuat', revealed: false },
      { id: 'cust', roleId: 'lang-quan-sat', revealed: false },
      { id: 'diana', roleId: 'exp2_diana', revealed: false },
      { id: 'sh', roleId: 'suong-an-danh', revealed: true },
    ],
    { activePlayerId: 'h1', turnPhase: 'MAIN_ACTION', turnNumber: 2 },
  );

  // Hunter reveal MUST NOT bind Diana (strictly ignores conflicting strategy paragraph — RC-13!)
  domain.applyPlayerGameAction(state, 'h1', { type: 'REVEAL_ROLE' }, 1000);
  assert.equal(state.expansionState.dianaContracts, undefined);

  // Neutral customer reveals during cust's own turn -> Diana becomes PENDING (still unrevealed, zero public leak!)
  state.activePlayerId = 'cust';
  state.turnNumber = 3;
  domain.applyPlayerGameAction(state, 'cust', { type: 'REVEAL_ROLE' }, 1100);
  assert.equal(state.expansionState.dianaContracts.diana.customerPlayerId, 'cust');
  assert.equal(state.expansionState.dianaContracts.diana.status, 'pending');
  assert.equal(state.players.diana.revealed, false, 'Diana stays hidden until customer next turn');
  assert.equal(domain.getPublicGameView(state).dianaActiveCustomerByPlayer, undefined);

  // Advance around the table back to cust's NEXT own turn -> Diana contract activates & forces Diana reveal!
  domain.applyPlayerGameAction(state, 'cust', { type: 'END_TURN' }, 1200); // -> diana
  state.turnPhase = 'MAIN_ACTION';
  domain.applyPlayerGameAction(state, 'diana', { type: 'END_TURN' }, 1300); // -> sh
  state.turnPhase = 'MAIN_ACTION';
  domain.applyPlayerGameAction(state, 'sh', { type: 'END_TURN' }, 1400); // -> h1
  state.turnPhase = 'MAIN_ACTION';
  domain.applyPlayerGameAction(state, 'h1', { type: 'END_TURN' }, 1500); // -> cust's NEXT own turn!

  assert.equal(state.activePlayerId, 'cust');
  assert.equal(state.expansionState.dianaContracts.diana.status, 'active');
  assert.equal(state.players.diana.revealed, true, 'Diana forced revealed on customer next own turn');
  assert.equal(domain.getPublicGameView(state).dianaActiveCustomerByPlayer.diana, 'cust');

  // Cancellation case: if pending customer dies before next turn -> cancelled -> full HP fallback!
  const stateCancel = makeState(
    [
      { id: 'h1', roleId: 'gac-ky-thuat', revealed: true, hand: ['ev-07'] },
      { id: 'cust', roleId: 'lang-quan-sat', revealed: false, woundsTaken: 7 }, // 1 HP left
      { id: 'diana', roleId: 'exp2_diana', revealed: false, woundsTaken: 0 },
      { id: 'sh', roleId: 'suong-an-danh', revealed: true, alive: false },
    ],
    { activePlayerId: 'cust', turnNumber: 2 },
  );
  stateCancel.players.sh.alive = true;
  stateCancel.players.sh.hp = 10;
  domain.applyPlayerGameAction(stateCancel, 'cust', { type: 'REVEAL_ROLE' }, 2000);
  assert.equal(stateCancel.expansionState.dianaContracts.diana.status, 'pending');
  stateCancel.activePlayerId = 'h1';
  domain.applyPlayerGameAction(
    stateCancel,
    'h1',
    { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'cust' },
    2100,
  );
  assert.equal(stateCancel.players.cust.alive, false);
  assert.equal(stateCancel.expansionState.dianaContracts.diana.status, 'cancelled');
  // Full HP fallback wins at match end; wounded Diana loses!
  stateCancel.players.sh.alive = false;
  stateCancel.players.sh.hp = 0;
  assert.ok(domain.evaluateExpandedVictory(stateCancel).winnerPlayerIds.includes('diana'));
  stateCancel.players.diana.woundsTaken = 1;
  stateCancel.players.diana.hp = 12;
  assert.ok(!domain.evaluateExpandedVictory(stateCancel).winnerPlayerIds.includes('diana'));
});

// ---------------------------------------------------------------------------
// P6B-11: Aaron — First normal living female spouse, Masamune/MG override & no-spouse fallback
// ---------------------------------------------------------------------------
test('P6B-11: Aaron binds first normal female, blocks direct/MG/Masamune attack on spouse & handles no-spouse death fallback', () => {
  const state = makeState(
    [
      { id: 'aaron', roleId: 'exp2_aaron', revealed: false, location: 'lobby', equipped: ['ev-01', 'ev-06'] },
      { id: 'g43', roleId: 'exp2_g43', revealed: false, location: 'lobby' }, // unspecified gender!
      { id: 'fiona', roleId: 'exp2_fiona', revealed: false, location: 'lobby' }, // female!
      { id: 'sh', roleId: 'suong-an-danh', revealed: true, location: 'radio' }, // different cluster (`central` vs `north`)
    ],
    { activePlayerId: 'g43', turnPhase: 'MAIN_ACTION' },
  );

  // Unspecified gender (G43) reveal MUST NOT bind Aaron!
  domain.applyPlayerGameAction(state, 'g43', { type: 'REVEAL_ROLE' }, 1000);
  assert.equal(state.expansionState.aaronSpouseByPlayer, undefined);
  assert.equal(state.players.aaron.revealed, false);

  // Female (Fiona) reveals -> binds spouse & forces Aaron reveal!
  state.activePlayerId = 'fiona';
  domain.applyPlayerGameAction(state, 'fiona', { type: 'REVEAL_ROLE' }, 1100);
  assert.equal(state.expansionState.aaronSpouseByPlayer.aaron.spousePlayerId, 'fiona');
  assert.equal(state.players.aaron.revealed, true);
  assert.equal(domain.getPublicGameView(state).aaronSpouseByPlayer.aaron, 'fiona');

  // Aaron CANNOT directly attack spouse Fiona!
  state.activePlayerId = 'aaron';
  state.turnPhase = 'MAIN_ACTION';
  const badAtk = domain.applyPlayerGameAction(
    state,
    'aaron',
    { type: 'ATTACK', targetPlayerId: 'fiona' },
    1200,
  );
  assert.equal(badAtk.ok, false, 'Aaron cannot directly attack spouse');

  // Machine Gun attack on g43 MUST exclude spouse Fiona from splash targets!
  const fionaWoundsBefore = state.players.fiona.woundsTaken;
  const mgAtk = domain.applyPlayerGameAction(
    state,
    'aaron',
    { type: 'ATTACK', targetPlayerId: 'g43' },
    1300,
  );
  assert.equal(mgAtk.ok, true);
  assert.equal(state.players.fiona.woundsTaken, fionaWoundsBefore, 'Machine Gun must exclude Aaron spouse');

  // Masamune override: when spouse Fiona is the ONLY living player in Aaron's cluster, Aaron CAN END_TURN without attacking!
  state.players.g43.location = 'radio';
  state.activePlayerId = 'aaron';
  state.players.aaron.attacksThisTurn = 0;
  state.turnPhase = 'MAIN_ACTION';
  const endWithMasa = domain.applyPlayerGameAction(state, 'aaron', { type: 'END_TURN' }, 1400);
  assert.equal(endWithMasa.ok, true, 'Spouse protection overrides Masamune mandatory attack when spouse is sole target');

  // No-spouse fallback: dying while unmatched MUST NOT end match immediately, but co-wins at valid match end!
  const stateSolo = makeState([
    { id: 'aaron', roleId: 'exp2_aaron', revealed: false, alive: false },
    { id: 'h1', roleId: 'gac-ky-thuat', revealed: true, alive: true },
    { id: 'sh', roleId: 'suong-an-danh', revealed: true, alive: true },
  ]);
  const midEv = domain.evaluateExpandedVictory(stateSolo);
  assert.equal(midEv.finished, false, 'Unmatched dead Aaron must NOT trigger immediate victory');
  stateSolo.players.sh.alive = false;
  stateSolo.players.sh.hp = 0;
  const endEv = domain.evaluateExpandedVictory(stateSolo);
  assert.equal(endEv.finished, true);
  assert.ok(endEv.winnerPlayerIds.includes('aaron'), 'Unmatched dead Aaron wins at valid match end');
});
