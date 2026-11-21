'use strict';

/**
 * test/boardgame-phase7b.test.cjs
 *
 * Phase 7B — Complete Unit & Behavioral Verification of ALL 8 Tier-4 Characters & `starter-fifty-six`:
 *  - P7B-1: `starter-fifty-six` ruleset (exact 66/66 playable: 20H/21S/25N), canonical HP/factions,
 *           5P N.C. Soldier exclusion, `validatePackInternally` (expansion-1/expansion-2/full-expansion),
 *           strict Classic-only production lock.
 *  - P7B-2: Lloyd (`exp1_lloyd`) — GlobalAttackInterrupt pre-roll cancel (1 HP incl. final HP, 0 RNG consumed,
 *           Machine Gun single-action capture, decline proceeds normally, unrevealed ignored).
 *  - P7B-3: Vengeful Spirit (`exp1_vengeful_spirit`) — Secret `choice-secret-*` optional skill copy on death,
 *           decline retains 1-time use, fresh usage state on copied once-per-match skill, zero hidden leak.
 *  - P7B-4: Voodoo (`exp1_voodoo`) — TurnOwnershipOverride deferred turn hijack, authorized public actions
 *           executed by Voodoo, victim blocked on public actions, Voodoo blocked on private/role actions,
 *           pause for private investigation card (`inv-*`), expiry & anti-replay.
 *  - P7B-5: Undead (`exp1_undead`) — Pre-lethal voluntary reveal blocked, first lethal enters
 *           `DORMANT_PENDING_REVIVE` (untargetable, no death hooks/victory death count), revives at 6 HP
 *           (`woundsTaken = 5`) on next own turn, second lethal triggers `FINAL_ELIMINATED`.
 *  - P7B-6: Antimony (`exp1_antimony`) — Mandatory deterministic `turnOrder` skill + `COPY_GOAL` victory
 *           copy on first final elimination, stays Neutral (`wanderer`), wins on copied Hunter goal.
 *  - P7B-7: Cain (`exp2_cain`) — Once-per-match global dual-faction death modifier (`winnerFaction: 'multi-faction'`,
 *           `winningFactions: ['lantern-guard', 'mist-order']`), personal 6P-8P last-Neutral victory.
 *  - P7B-8: Bonnie (`exp2_bonnie`) — Pre-victory Step 6 Shadow conversion when Bonnie kills a Shadow, forced reveal,
 *           baseFaction immutable vs effectiveFaction mutated, investigation card reads Shadow, prevents Hunter
 *           instant win when Bonnie kills last original Shadow, wins as Shadow when all Hunters die.
 *  - P7B-9: N.C. Soldier (`exp2_nc_soldier`) — Recruitment attack on revealed Neutral (`woundsTaken >= 5` & alive ->
 *           alliance + copied recruitment skill), non-Neutral/hidden targets rejected, alliance victory requires
 *           all other dealt Neutrals recruited AND leader holding `ev-06, ev-05, ev-03`.
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
    rulesetId: opts.rulesetId ?? 'starter-fifty-six',
    matchId: opts.matchId ?? 'p7b-match',
    seed: opts.seed ?? 7777,
    rngState: opts.rngState ?? 7777,
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
      investigation: [...(opts.invDeck ?? ['inv-05', 'inv-04'])],
      equipment: [...(opts.eqDeck ?? ['eq-07', 'eq-01'])],
      event: [...(opts.evDeck ?? ['ev-02', 'ev-07'])],
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
  const exp = domain.ensureExpansionState(state);
  exp.originallyDealtNeutralIds =
    opts.originallyDealtNeutralIds ??
    specs
      .filter((s) => (s.faction ?? domain.getRoleDesign(s.roleId).faction) === 'wanderer')
      .map((s) => s.id);
  return state;
}

// ---------------------------------------------------------------------------
// P7B-1: `starter-fifty-six`, canonical stats, 5P exclusion & production locks
// ---------------------------------------------------------------------------
test('P7B-1: starter-fifty-six exposes 66/66 roles (20H/21S/25N), canonical HP, 5P N.C. Soldier exclusion & prod lock', () => {
  const reg = domain.DEFAULT_RULESET_REGISTRY;
  const charReg = domain.DEFAULT_CHARACTER_REGISTRY;

  // Production lock MUST stay Classic-only
  const prodRulesets = reg.listRulesets().filter((r) => r.enabledInProduction);
  assert.deepEqual(
    prodRulesets.map((r) => r.id),
    ['classic'],
    'Production must remain strictly classic-only',
  );
  for (const lockedId of ['starter-fifty-six', 'expansion-1', 'expansion-2', 'full-expansion']) {
    const prodCheck = reg.validateRulesetForMatch(lockedId, 8, { allowExperimental: false });
    assert.equal(
      prodCheck.ok,
      false,
      `Ruleset ${lockedId} must NOT be selectable in production (allowExperimental: false)`,
    );
    assert.equal(prodCheck.code, 'RULESET_UNAVAILABLE');
    const meta = reg.getRuleset(lockedId, { allowExperimental: true });
    assert.ok(meta, `Ruleset ${lockedId} should resolve under allowExperimental`);
    assert.equal(meta.enabledInProduction, false);
    assert.notEqual(meta.releaseStatus, 'PUBLIC_RELEASE_APPROVED');
  }
  assert.equal(
    reg.getRuleset('starter-fifty-six'),
    null,
    'starter-fifty-six must not resolve without allowExperimental',
  );

  // `starter-fifty-six` exact roster 66 = 20H + 21S + 25N
  const playable66 = reg.listPlayableCharactersForRuleset('starter-fifty-six', {
    allowExperimental: true,
  });
  assert.equal(playable66.length, 66);
  const byFaction = { 'lantern-guard': 0, 'mist-order': 0, wanderer: 0 };
  for (const ch of playable66) {
    byFaction[ch.metadata.faction] += 1;
  }
  assert.deepEqual(byFaction, {
    'lantern-guard': 20,
    'mist-order': 21,
    wanderer: 25,
  });

  // Canonical HP & factions of all 8 Tier-4 roles
  const expectedCanonical = {
    exp1_lloyd: { hp: 12, faction: 'lantern-guard' },
    exp1_vengeful_spirit: { hp: 13, faction: 'mist-order' },
    exp1_voodoo: { hp: 13, faction: 'mist-order' },
    exp1_undead: { hp: 11, faction: 'mist-order' },
    exp1_antimony: { hp: 8, faction: 'wanderer' },
    exp2_cain: { hp: 11, faction: 'wanderer' },
    exp2_bonnie: { hp: 10, faction: 'wanderer' },
    exp2_nc_soldier: { hp: 13, faction: 'wanderer' },
  };
  for (const [roleId, expSpec] of Object.entries(expectedCanonical)) {
    const design = domain.getRoleDesign(roleId);
    assert.equal(design.maxHp, expSpec.hp, `${roleId} HP mismatch`);
    assert.equal(design.faction, expSpec.faction, `${roleId} faction mismatch`);
    const entry = charReg.get(roleId);
    assert.ok(entry, `Missing registry entry for ${roleId}`);
    assert.equal(entry.metadata.implementationStatus, 'implemented');
    assert.equal(entry.metadata.rulesStatus, 'house-rule-approved');
  }

  // Internal pack validation (without unlocking production!)
  const valExp1 = reg.validatePackInternally('expansion-1');
  assert.equal(valExp1.ok, true);
  assert.equal(valExp1.totalPlayable, 36); // 10 Classic + 26 Exp1
  assert.equal(valExp1.enabledInProduction, false);

  const valExp2 = reg.validatePackInternally('expansion-2');
  assert.equal(valExp2.ok, true);
  assert.equal(valExp2.totalPlayable, 40); // 10 Classic + 30 Exp2
  assert.equal(valExp2.enabledInProduction, false);

  const valFull = reg.validatePackInternally('full-expansion');
  assert.equal(valFull.ok, true);
  assert.equal(valFull.totalPlayable, 66); // 10 Classic + 56 Exp
  assert.equal(valFull.enabledInProduction, false);

  // 5P deal pool MUST NEVER deal exp2_nc_soldier (tested across 120 seeds)
  for (let s = 1; s <= 120; s += 1) {
    const participants = Array.from({ length: 5 }, (_, idx) => ({
      playerId: `p${idx + 1}`,
      displayName: `P${idx + 1}`,
      seatIndex: idx,
      appearance: { gender: 'male', outfit: 'hust-jacket', hairColor: '#111111' },
    }));
    const match = domain.createInitialGameState({
      matchId: `nc-5p-check-${s}`,
      players: participants,
      seed: 10_000 + s,
      nowMs: Date.now(),
      rulesetId: 'starter-fifty-six',
      allowExperimental: true,
    });
    const roles = Object.values(match.players).map((p) => p.roleId);
    assert.equal(
      roles.includes('exp2_nc_soldier'),
      false,
      `exp2_nc_soldier must be excluded from 5P deal pool (seed ${s})`,
    );
  }
});

// ---------------------------------------------------------------------------
// P7B-2: Lloyd (`exp1_lloyd`) — GlobalAttackInterrupt
// ---------------------------------------------------------------------------
test('P7B-2: Lloyd cancels declared attack pre-roll for 1 HP (incl. final HP), consumes 0 RNG, captures Machine Gun', () => {
  // 2a: Basic cancel + 0 RNG consumed + Machine Gun single-action capture
  const state = makeState([
    { id: 'atk', roleId: 'gac-ky-thuat', location: 'lobby', equipped: ['ev-06'] },
    { id: 'v1', roleId: 'suong-an-danh', location: 'lobby' },
    { id: 'v2', roleId: 'suong-tin-gia', location: 'lobby' },
    { id: 'lloyd', roleId: 'exp1_lloyd', location: 'court', revealed: true },
  ]);
  const rngBefore = state.rngState;
  const res = domain.applyPlayerGameAction(state, 'atk', { type: 'ATTACK', targetPlayerId: 'v1' }, 1000);
  assert.equal(res.ok, true);
  assert.equal(state.rngState, rngBefore, 'Opening Lloyd interrupt must consume 0 RNG');
  assert.equal(state.pendingChoice?.kind, 'lloyd_interrupt_attack');
  assert.equal(state.pendingChoice?.ownerPlayerId, 'lloyd');

  const cancelRes = domain.applyPlayerGameAction(
    state,
    'lloyd',
    { type: 'RESOLVE_CHOICE', choiceId: state.pendingChoice.choiceId, optionId: 'cancel_attack' },
    1100,
  );
  assert.equal(cancelRes.ok, true);
  assert.equal(state.rngState, rngBefore, 'Canceling attack via Lloyd must consume 0 RNG');
  assert.equal(state.players.lloyd.woundsTaken, 2, 'Lloyd paid 2 HP canonical cost');
  assert.equal(state.players.v1.woundsTaken, 0, 'v1 took 0 damage');
  assert.equal(state.players.v2.woundsTaken, 0, 'Machine Gun AoE v2 also canceled in single action');
  assert.equal(state.players.atk.attacksThisTurn, 1, 'Attacker still spent attack action');

  // 2b: Lloyd may sacrifice FINAL HP to cancel an attack
  const stateFinal = makeState([
    { id: 'atk', roleId: 'gac-ky-thuat', location: 'lobby' },
    { id: 'v1', roleId: 'suong-an-danh', location: 'lobby' },
    { id: 'v2', roleId: 'suong-tin-gia', location: 'court' },
    { id: 'lloyd', roleId: 'exp1_lloyd', location: 'court', revealed: true, woundsTaken: 11 }, // 1 HP left of 12
  ]);
  const r2 = domain.applyPlayerGameAction(stateFinal, 'atk', { type: 'ATTACK', targetPlayerId: 'v1' }, 2000);
  assert.equal(r2.ok, true);
  assert.equal(stateFinal.pendingChoice?.kind, 'lloyd_interrupt_attack');
  const r2c = domain.applyPlayerGameAction(
    stateFinal,
    'lloyd',
    { type: 'RESOLVE_CHOICE', choiceId: stateFinal.pendingChoice.choiceId, optionId: 'cancel_attack' },
    2100,
  );
  assert.equal(r2c.ok, true);
  assert.equal(stateFinal.players.lloyd.alive, false, 'Lloyd sacrificed final HP and died');
  assert.equal(stateFinal.players.v1.woundsTaken, 0, 'v1 remained unharmed');

  // 2c: Unrevealed Lloyd does NOT prompt
  const stateHidden = makeState([
    { id: 'atk', roleId: 'gac-ky-thuat', location: 'lobby' },
    { id: 'v1', roleId: 'suong-an-danh', location: 'lobby' },
    { id: 'v2', roleId: 'suong-tin-gia', location: 'court' },
    { id: 'lloyd', roleId: 'exp1_lloyd', location: 'court', revealed: false },
  ]);
  const r3 = domain.applyPlayerGameAction(stateHidden, 'atk', { type: 'ATTACK', targetPlayerId: 'v1' }, 3000);
  assert.equal(r3.ok, true);
  assert.equal(stateHidden.pendingChoice ?? null, null, 'Unrevealed Lloyd must not prompt');
});

// ---------------------------------------------------------------------------
// P7B-3: Vengeful Spirit (`exp1_vengeful_spirit`) — Secret DynamicSkillCopy
// ---------------------------------------------------------------------------
test('P7B-3: Vengeful Spirit gets secret choice-secret-* on elimination, fresh once-per-match copied skill, zero leak', () => {
  const state = makeState(
    [
      { id: 'atk', roleId: 'gac-ky-thuat', location: 'corridor' }, // power-9: deal 2 dmg
      { id: 'elise', roleId: 'exp2_elise', location: 'lobby', woundsTaken: 9 }, // 1 HP left of 10
      { id: 'vs', roleId: 'exp1_vengeful_spirit', location: 'court', revealed: false },
      { id: 'other', roleId: 'suong-an-danh', location: 'court' },
    ],
    { turnPhase: 'LOCATION_ACTION', activePlayerId: 'atk' },
  );

  const res = domain.applyPlayerGameAction(
    state,
    'atk',
    { type: 'USE_LOC_POWER', targetPlayerId: 'elise', mode: 'damage' },
    1000,
  );
  assert.equal(res.ok, true, res.error);
  assert.equal(state.players.elise.alive, false);

  assert.equal(state.pendingChoice?.kind, 'vengeful_spirit_copy_skill');
  assert.equal(state.pendingChoice?.ownerPlayerId, 'vs');
  assert.equal(state.pendingChoice?.isSecret, true);
  assert.ok(
    state.pendingChoice.choiceId.startsWith('choice-secret-'),
    `Vengeful Spirit choiceId must be opaque choice-secret-*: got ${state.pendingChoice.choiceId}`,
  );

  // Check P0 projection privacy: opponent & spectator must NOT see Vengeful Spirit identity or roleId!
  const pubView = domain.getPublicGameView(state);
  assert.equal(pubView.pendingChoice?.isSecret, true);
  assert.ok(!pubView.pendingChoice?.promptLabel.includes('Vengeful'));
  const atkPriv = domain.getPrivateGameView(state, 'atk');
  assert.equal(atkPriv?.pendingChoice ?? null, null);
  const vsPriv = domain.getPrivateGameView(state, 'vs');
  assert.equal(vsPriv?.pendingChoice?.kind, 'vengeful_spirit_copy_skill');

  // Accept copying Elise's skill
  const acceptOpt = vsPriv.pendingChoice.options.find((o) => o.optionId.startsWith('copy_'));
  assert.ok(acceptOpt);
  const rAccept = domain.applyPlayerGameAction(
    state,
    'vs',
    { type: 'RESOLVE_CHOICE', choiceId: vsPriv.pendingChoice.choiceId, optionId: acceptOpt.optionId },
    1100,
  );
  assert.equal(rAccept.ok, true);
  assert.equal(state.players.vs.revealed, true, 'Accepting copy reveals Vengeful Spirit');
  assert.equal(state.players.vs.skillUsedOnce, true, 'Vengeful Spirit own copy power consumed');
  const binding = domain.getCopiedSkillBinding(state, 'vs');
  assert.equal(binding?.effectiveSkillRoleId, 'exp2_elise');
  assert.equal(binding?.skillUsedOnce, false, 'Copied Elise skill starts with FRESH usage state!');

  // Now on Vengeful Spirit's turn, VS can execute copied Elise skill even though vs.skillUsedOnce === true!
  state.activePlayerId = 'vs';
  state.turnPhase = 'MAIN_ACTION';
  state.players.vs.woundsTaken = 4;
  state.players.vs.hp = 9;
  const rUseElise = domain.applyPlayerGameAction(state, 'vs', { type: 'USE_SKILL' }, 1200);
  assert.equal(rUseElise.ok, true, `Vengeful Spirit should execute copied Elise skill: ${rUseElise.error}`);
  assert.equal(state.pendingChoice?.kind, 'elise_distribute_heal');
});

// ---------------------------------------------------------------------------
// P7B-4: Voodoo (`exp1_voodoo`) — TurnOwnershipOverride
// ---------------------------------------------------------------------------
test('P7B-4: Voodoo hijacks victim next turn, controls public actions, blocked on private/role actions, pauses on inv-* card', () => {
  const state = makeState(
    [
      { id: 'voodoo', roleId: 'exp1_voodoo', location: 'lobby', revealed: true },
      { id: 'victim', roleId: 'gac-ky-thuat', location: 'radio', revealed: false },
      { id: 'p3', roleId: 'suong-an-danh', location: 'court' },
      { id: 'p4', roleId: 'lang-anh-san', location: 'canteen' },
    ],
    {
      turnPhase: 'ROLL_MOVE',
      activePlayerId: 'voodoo',
      invDeck: ['inv-05'],
    },
  );

  // Voodoo activates Con Rối via USE_SKILL at start of turn -> opens state.pendingChoice
  const rSkill = domain.applyPlayerGameAction(state, 'voodoo', { type: 'USE_SKILL' }, 1000);
  assert.equal(rSkill.ok, true, rSkill.error);
  const exp = domain.ensureExpansionState(state);
  assert.equal(state.pendingChoice?.kind, 'voodoo_select_puppet');
  const pickVictim = state.pendingChoice.options.find((o) => o.targetPlayerId === 'victim');
  assert.ok(pickVictim);
  const rPick = domain.applyPlayerGameAction(
    state,
    'voodoo',
    { type: 'RESOLVE_CHOICE', choiceId: state.pendingChoice.choiceId, optionId: pickVictim.optionId },
    1100,
  );
  assert.equal(rPick.ok, true);
  assert.equal(state.players.voodoo.skillUsedOnce, true);

  // Finish Voodoo's turn -> advance to victim's turn!
  state.turnPhase = 'MAIN_ACTION';
  const rEnd = domain.applyPlayerGameAction(state, 'voodoo', { type: 'END_TURN' }, 1200);
  assert.equal(rEnd.ok, true);
  assert.equal(state.activePlayerId, 'victim');
  assert.equal(exp.activeTurnControl?.activePlayerId, 'victim');
  assert.equal(exp.activeTurnControl?.controllerPlayerId, 'voodoo');
  assert.equal(domain.getEffectiveTurnControllerId(state), 'voodoo');

  // Victim CANNOT roll dice while hijacked
  const victimBlocked = domain.applyPlayerGameAction(state, 'victim', { type: 'ROLL_DICE' }, 1300);
  assert.equal(victimBlocked.ok, false, 'Hijacked victim must be blocked from public actions');

  // Voodoo CANNOT force victim to REVEAL_ROLE or USE_SKILL!
  const voodooRevealBlocked = domain.applyPlayerGameAction(state, 'voodoo', { type: 'REVEAL_ROLE' }, 1350);
  assert.equal(voodooRevealBlocked.ok, false, 'Voodoo must be blocked from REVEAL_ROLE on victim');
  const voodooSkillBlocked = domain.applyPlayerGameAction(state, 'voodoo', { type: 'USE_SKILL' }, 1360);
  assert.equal(voodooSkillBlocked.ok, false, 'Voodoo must be blocked from USE_SKILL on victim');

  // Voodoo CAN roll dice for victim
  const voodooRoll = domain.applyPlayerGameAction(state, 'voodoo', { type: 'ROLL_DICE' }, 1400);
  assert.equal(voodooRoll.ok, true, voodooRoll.error);

  // If victim lands on radio (investigation) and Voodoo draws an inv-* card, control PAUSES for victim!
  state.turnPhase = 'LOCATION_ACTION';
  state.players.victim.location = 'radio';
  const voodooDrawInv = domain.applyPlayerGameAction(
    state,
    'voodoo',
    { type: 'DRAW_CARD', deck: 'investigation' },
    1500,
  );
  assert.equal(voodooDrawInv.ok, true, voodooDrawInv.error);
  assert.equal(domain.isTurnControlPausedForOwnerDecision(state), true, 'Must pause for victim inv-*');
  assert.equal(domain.getPublicGameView(state).controlledTurn?.pausedForOwnerDecision, true);
  assert.equal(domain.getEffectiveTurnControllerId(state), 'victim');

  // Voodoo CANNOT see victim's private hand nor resolve victim's investigation card
  const voodooPriv = domain.getPrivateGameView(state, 'voodoo');
  assert.equal(voodooPriv.hand.length, 0, 'Voodoo must never see victim hand');
  const voodooBlockedInv = domain.applyPlayerGameAction(
    state,
    'voodoo',
    { type: 'INVESTIGATE_CARD', cardId: 'inv-05', targetPlayerId: 'p3' },
    1550,
  );
  assert.equal(voodooBlockedInv.ok, false, 'Voodoo cannot resolve victim private inv-* card');

  // Victim resolves their own investigation card -> control resumes to Voodoo!
  const victimResolveInv = domain.applyPlayerGameAction(
    state,
    'victim',
    { type: 'INVESTIGATE_CARD', cardId: 'inv-05', targetPlayerId: 'p3' },
    1600,
  );
  assert.equal(victimResolveInv.ok, true, victimResolveInv.error);
  assert.equal(domain.isTurnControlPausedForOwnerDecision(state), false, 'Control resumes to Voodoo');
  assert.equal(domain.getPublicGameView(state).controlledTurn?.pausedForOwnerDecision, false);
  assert.equal(domain.getEffectiveTurnControllerId(state), 'voodoo');

  // Voodoo ends victim's turn -> control expires & grant ID recorded in anti-replay list
  const grantId = exp.activeTurnControl.controlGrantId;
  const voodooEnd = domain.applyPlayerGameAction(state, 'voodoo', { type: 'END_TURN' }, 1700);
  assert.equal(voodooEnd.ok, true, voodooEnd.error);
  assert.equal(exp.activeTurnControl ?? null, null);
  assert.ok(exp.expiredControlGrantIds.includes(grantId));
});

// ---------------------------------------------------------------------------
// P7B-5: Undead (`exp1_undead`) — PendingResurrection
// ---------------------------------------------------------------------------
test('P7B-5: Undead blocks pre-lethal reveal, enters dormancy on 1st lethal, revives at 6 HP next own turn, dies permanently on 2nd lethal', () => {
  const state = makeState(
    [
      { id: 'atk', roleId: 'gac-ky-thuat', location: 'corridor' }, // power-9: deal 2 dmg
      { id: 'undead', roleId: 'exp1_undead', location: 'lobby', woundsTaken: 10 }, // 1 HP left of 11
      { id: 'vs', roleId: 'exp1_vengeful_spirit', location: 'court' },
      { id: 'hunter2', roleId: 'gac-radio', location: 'canteen' },
    ],
    { turnPhase: 'LOCATION_ACTION', activePlayerId: 'atk' },
  );

  // Undead cannot voluntarily reveal before first lethal!
  state.activePlayerId = 'undead';
  const rEarlyRev = domain.applyPlayerGameAction(state, 'undead', { type: 'REVEAL_ROLE' }, 900);
  assert.equal(rEarlyRev.ok, false, 'Undead must not reveal before first lethal');

  // Attacker deals lethal 2 dmg to Undead -> enters DORMANT_PENDING_REVIVE (NOT dead, Hunters do NOT win, VS does NOT prompt!)
  state.activePlayerId = 'atk';
  const rKill1 = domain.applyPlayerGameAction(
    state,
    'atk',
    { type: 'USE_LOC_POWER', targetPlayerId: 'undead', mode: 'damage' },
    1000,
  );
  assert.equal(rKill1.ok, true, rKill1.error);
  assert.equal(domain.getPlayerLifecycleState(state, state.players.undead), 'DORMANT_PENDING_REVIVE');
  assert.equal(state.players.undead.alive, false, 'Dormant Undead is temporarily out of play');
  assert.equal(state.players.undead.revealed, true, 'Dormant Undead flips face-up');
  assert.equal(state.finished, false, 'Hunters must NOT win while Undead is dormant');
  assert.equal(state.pendingChoice ?? null, null, 'Vengeful Spirit must NOT prompt on dormancy');
  assert.equal(domain.isPlayerTargetable(state, state.players.undead), false, 'Dormant Undead is untargetable');

  // End atk's turn -> turn reaches Undead -> Undead REVIVES at 6 HP (woundsTaken = 5 of 11)!
  state.turnPhase = 'MAIN_ACTION';
  const rEndAtk = domain.applyPlayerGameAction(state, 'atk', { type: 'END_TURN' }, 1100);
  assert.equal(rEndAtk.ok, true, rEndAtk.error);
  assert.equal(state.activePlayerId, 'undead', 'Dormant Undead is NOT skipped in turn order — it revives!');
  assert.equal(domain.getPlayerLifecycleState(state, state.players.undead), 'REVIVED');
  assert.equal(state.players.undead.alive, true);
  assert.equal(state.players.undead.hp, 6, 'Undead revives with exactly 6 HP');
  assert.equal(state.players.undead.woundsTaken, 5, '11 maxHp - 6 HP = 5 wounds');

  // Second lethal -> FINAL_ELIMINATED! (Triggers Vengeful Spirit secret copy!)
  state.activePlayerId = 'atk';
  state.turnPhase = 'LOCATION_ACTION';
  state.players.undead.woundsTaken = 10;
  state.players.undead.hp = 1;
  const rKill2 = domain.applyPlayerGameAction(
    state,
    'atk',
    { type: 'USE_LOC_POWER', targetPlayerId: 'undead', mode: 'damage' },
    1200,
  );
  assert.equal(rKill2.ok, true, rKill2.error);
  assert.equal(domain.getPlayerLifecycleState(state, state.players.undead), 'FINAL_ELIMINATED');
  assert.equal(state.players.undead.alive, false);
  assert.equal(
    state.pendingChoice?.kind,
    'vengeful_spirit_copy_skill',
    'Second lethal is true elimination and triggers Vengeful Spirit',
  );
});

// ---------------------------------------------------------------------------
// P7B-6: Antimony (`exp1_antimony`) — Mandatory Skill + COPY_GOAL Victory
// ---------------------------------------------------------------------------
test('P7B-6: Antimony mandatorily copies first eliminated player skill & victory goal and wins on copied Hunter goal', () => {
  const state = makeState(
    [
      { id: 'atk', roleId: 'gac-ky-thuat', location: 'corridor' },
      { id: 'hunterVictim', roleId: 'exp2_elise', location: 'lobby', woundsTaken: 9 }, // Hunter (1 HP left of 10)
      { id: 'shadow1', roleId: 'suong-an-danh', location: 'court', woundsTaken: 12 }, // 1 HP left of 13
      { id: 'antimony', roleId: 'exp1_antimony', location: 'canteen' },
    ],
    { turnPhase: 'LOCATION_ACTION', activePlayerId: 'atk' },
  );

  // Kill hunterVictim (Elise) -> Antimony automatically copies Elise skill + Hunter victory goal
  const r1 = domain.applyPlayerGameAction(
    state,
    'atk',
    { type: 'USE_LOC_POWER', targetPlayerId: 'hunterVictim', mode: 'damage' },
    1000,
  );
  assert.equal(r1.ok, true, r1.error);
  assert.equal(state.players.hunterVictim.alive, false);
  assert.equal(state.players.antimony.revealed, true, 'Antimony reveals upon copying');
  assert.equal(state.players.antimony.faction, 'wanderer', 'Antimony base faction stays Neutral');
  assert.equal(domain.getCopiedSkillBinding(state, 'antimony')?.effectiveSkillRoleId, 'exp2_elise');
  const exp = domain.ensureExpansionState(state);
  assert.equal(exp.antimonyCopiedGoalByPlayer?.antimony?.sourceRoleId, 'exp2_elise');
  assert.equal(exp.antimonyCopiedGoalByPlayer?.antimony?.targetPlayerId, 'hunterVictim');

  // Now kill the last Shadow (shadow1) -> Hunters win AND Antimony co-wins via copied Hunter victory condition!
  state.turnPhase = 'LOCATION_ACTION';
  state.activePlayerId = 'atk';
  const r2 = domain.applyPlayerGameAction(
    state,
    'atk',
    { type: 'USE_LOC_POWER', targetPlayerId: 'shadow1', mode: 'damage' },
    1200,
  );
  assert.equal(r2.ok, true, r2.error);
  assert.equal(state.finished, true);
  assert.ok(
    state.winnerPlayerIds.includes('antimony'),
    `Antimony must co-win via copied Hunter victory goal; winners=${JSON.stringify(state.winnerPlayerIds)}`,
  );
});

// ---------------------------------------------------------------------------
// P7B-7: Cain (`exp2_cain`) — MultiFactionVictory + Personal Neutral Goal
// ---------------------------------------------------------------------------
test('P7B-7: Cain active skill triggers multi-faction dual victory on death, and Cain wins personally as last Neutral', () => {
  // 7a: Cain activates skill then dies -> multi-faction Hunter + Shadow win!
  const state = makeState(
    [
      { id: 'cain', roleId: 'exp2_cain', location: 'lobby', revealed: true, woundsTaken: 10 }, // 1 HP left of 11
      { id: 'h1', roleId: 'gac-ky-thuat', location: 'corridor' },
      { id: 's1', roleId: 'suong-an-danh', location: 'court' },
      { id: 'n2', roleId: 'lang-anh-san', location: 'canteen' },
    ],
    { turnPhase: 'MAIN_ACTION', activePlayerId: 'cain' },
  );

  const rAct = domain.applyPlayerGameAction(state, 'cain', { type: 'USE_SKILL' }, 1000);
  assert.equal(rAct.ok, true, rAct.error);
  assert.equal(state.players.cain.skillUsedOnce, true);
  assert.ok(
    domain.ensureExpansionState(state).cainDeathVictoryModifierIds?.includes('cain'),
    'Cain must register global dual-faction death modifier',
  );
  assert.equal(state.players.cain.woundsTaken, 6, 'Cain healed by livingPlayersCount (4): 10 -> 6 wounds');

  // Reduce Cain to 1 HP and let h1 eliminate Cain via power-9
  state.players.cain.woundsTaken = 10;
  state.players.cain.hp = 1;
  state.activePlayerId = 'h1';
  state.turnPhase = 'LOCATION_ACTION';
  const rKill = domain.applyPlayerGameAction(
    state,
    'h1',
    { type: 'USE_LOC_POWER', targetPlayerId: 'cain', mode: 'damage' },
    1100,
  );
  assert.equal(rKill.ok, true, rKill.error);
  assert.equal(state.finished, true, 'Cain death with active modifier must end match immediately');
  assert.equal(state.winnerFaction, 'multi-faction');
  assert.deepEqual(state.winningFactions, ['lantern-guard', 'mist-order']);
  assert.ok(state.winnerPlayerIds.includes('h1'));
  assert.ok(state.winnerPlayerIds.includes('s1'));
  assert.ok(!state.winnerPlayerIds.includes('cain'));
  assert.ok(!state.winnerPlayerIds.includes('n2'));

  // 7b: Cain personal victory in 6P match (alive + >=1 Hunter, >=1 Shadow, >=1 OTHER Neutral dead)
  const state6 = makeState([
    { id: 'cain', roleId: 'exp2_cain', alive: true },
    { id: 'n1', roleId: 'lang-anh-san', alive: false },
    { id: 'h1', roleId: 'gac-ky-thuat', alive: false },
    { id: 'h2', roleId: 'gac-radio', alive: true },
    { id: 's1', roleId: 'suong-an-danh', alive: false },
    { id: 's2', roleId: 'suong-tin-gia', alive: true },
  ]);
  const res6 = domain.evaluateExpandedVictory(state6);
  assert.equal(res6.finished, true, 'Cain should win personally in 6P when >=1H + >=1S + >=1 other Neutral dead');
  assert.ok(res6.winnerPlayerIds.includes('cain'));

  // 7c: Cain personal victory in 5P match (alive + personally killed >=1 Hunter & >=1 Shadow)
  const state5 = makeState([
    { id: 'cain', roleId: 'exp2_cain', alive: true },
    { id: 'h1', roleId: 'gac-ky-thuat', alive: false },
    { id: 'h2', roleId: 'gac-radio', alive: true },
    { id: 's1', roleId: 'suong-an-danh', alive: false },
    { id: 's2', roleId: 'suong-tin-gia', alive: true },
  ]);
  domain.ensureExpansionState(state5).killedFactionsByPlayer = {
    cain: ['lantern-guard', 'mist-order'],
  };
  const res5 = domain.evaluateExpandedVictory(state5);
  assert.equal(res5.finished, true, 'Cain should win personally in 5P after killing 1 Hunter + 1 Shadow');
  assert.ok(res5.winnerPlayerIds.includes('cain'));
});

// ---------------------------------------------------------------------------
// P7B-8: Bonnie (`exp2_bonnie`) — DynamicAllegiance Shadow Conversion
// ---------------------------------------------------------------------------
test('P7B-8: Bonnie converts to Shadow pre-victory when killing last Shadow, blocks Hunter win, and inv-05 reads Shadow', () => {
  const state = makeState(
    [
      { id: 'bonnie', roleId: 'exp2_bonnie', location: 'corridor', revealed: false }, // power-9: deal 2 dmg
      { id: 's1', roleId: 'suong-an-danh', location: 'lobby', woundsTaken: 12 }, // Last original Shadow (1 HP left)
      { id: 'h1', roleId: 'gac-ky-thuat', location: 'court', hand: ['inv-05'] },
      { id: 'h2', roleId: 'gac-radio', location: 'canteen' },
    ],
    { turnPhase: 'LOCATION_ACTION', activePlayerId: 'bonnie' },
  );

  // Bonnie kills s1 (the ONLY original Shadow!) -> Step 6 converts Bonnie to Shadow BEFORE Step 8 victory check!
  const rKill = domain.applyPlayerGameAction(
    state,
    'bonnie',
    { type: 'USE_LOC_POWER', targetPlayerId: 's1', mode: 'damage' },
    1000,
  );
  assert.equal(rKill.ok, true, rKill.error);
  assert.equal(state.players.s1.alive, false);
  assert.equal(state.players.bonnie.faction, 'wanderer', 'baseFaction remains immutable wanderer');
  assert.equal(domain.getEffectiveFaction(state, state.players.bonnie), 'mist-order', 'effectiveFaction is Shadow');
  assert.equal(state.players.bonnie.revealed, true, 'Bonnie force-reveals on conversion');
  assert.equal(state.finished, false, 'Hunters must NOT win because Bonnie is now a living Shadow!');

  // Investigation card inv-05 ("Nếu bạn là Hội Bóng Đêm, chịu 1 ST") now treats Bonnie as Shadow!
  state.activePlayerId = 'h1';
  state.turnPhase = 'MAIN_ACTION';
  const rInv = domain.applyPlayerGameAction(
    state,
    'h1',
    { type: 'INVESTIGATE_CARD', cardId: 'inv-05', targetPlayerId: 'bonnie' },
    1100,
  );
  assert.equal(rInv.ok, true, rInv.error);
  assert.equal(state.players.bonnie.woundsTaken, 1, 'inv-05 must see Bonnie effectiveFaction === mist-order');

  // If all Hunters die, Bonnie wins as Shadow!
  state.players.h1.alive = false;
  state.players.h2.alive = false;
  const vic = domain.evaluateExpandedVictory(state);
  assert.ok(vic);
  assert.equal(vic.winnerFaction, 'mist-order');
  assert.ok(vic.winnerPlayerIds.includes('bonnie'));
  assert.ok(vic.winnerPlayerIds.includes('s1'));
});

// ---------------------------------------------------------------------------
// P7B-9: N.C. Soldier (`exp2_nc_soldier`) — Alliance Recruitment & 3-Weapon Win
// ---------------------------------------------------------------------------
test('P7B-9: N.C. Soldier recruits revealed Neutral at >=5 wounds into alliance, rejects non-Neutral, and wins with all Neutrals + 3 weapons', () => {
  const state = makeState(
    [
      { id: 'nc', roleId: 'exp2_nc_soldier', location: 'lobby', revealed: true, equipped: ['ev-02'] }, // +1 dmg
      { id: 'n1', roleId: 'lang-anh-san', location: 'lobby', revealed: true, woundsTaken: 4 }, // Neutral (10 HP), 4 + >=1 >= 5 wounds
      { id: 'h1', roleId: 'gac-ky-thuat', location: 'lobby', revealed: true },
      { id: 's1', roleId: 'suong-an-danh', location: 'court' },
      { id: 'h2', roleId: 'gac-radio', location: 'canteen' },
      { id: 's2', roleId: 'suong-tin-gia', location: 'radio' },
    ],
    { turnPhase: 'MAIN_ACTION', activePlayerId: 'nc', seed: 99, rngState: 99 },
  );

  // Recruiting a Hunter MUST be rejected
  const rBad = domain.applyPlayerGameAction(
    state,
    'nc',
    { type: 'USE_SKILL', targetPlayerId: 'h1' },
    950,
  );
  assert.equal(rBad.ok, false, 'N.C. Soldier must reject non-Neutral target');

  // Recruiting a revealed Neutral succeeds when target reaches >= 5 wounds and survives!
  const rRecruit = domain.applyPlayerGameAction(
    state,
    'nc',
    { type: 'USE_SKILL', targetPlayerId: 'n1' },
    1000,
  );
  assert.equal(rRecruit.ok, true, rRecruit.error);
  assert.equal(state.players.n1.alive, true);
  assert.ok(state.players.n1.woundsTaken >= 5, `Target wounds ${state.players.n1.woundsTaken} >= 5`);

  const alliance = domain.getPlayerAlliance(state, 'nc');
  assert.ok(alliance, 'Alliance group created');
  assert.ok(alliance.memberPlayerIds.includes('nc'));
  assert.ok(alliance.memberPlayerIds.includes('n1'));
  assert.equal(
    domain.getCopiedSkillBinding(state, 'n1')?.effectiveSkillRoleId,
    'exp2_nc_soldier',
    'Recruited Neutral gains N.C. Soldier recruitment skill',
  );

  // Without all 3 weapons, alliance has NOT won yet
  assert.equal(
    domain.evaluateExpandedVictory(state).finished,
    false,
    'Alliance needs all 3 weapons (`ev-06`, `ev-05`, `ev-03`)',
  );

  // Once N.C. Soldier holds all 3 weapons (`ev-06` Machine Gun, `ev-05` Handgun, `ev-03` Chainsaw) AND all other Neutrals recruited -> immediate co-win!
  state.players.nc.equipped = ['ev-06', 'ev-05', 'ev-03'];
  const allianceWin = domain.evaluateExpandedVictory(state);
  assert.equal(allianceWin.finished, true, 'N.C. Soldier alliance must win immediately once all Neutrals recruited + 3 weapons held');
  assert.ok(allianceWin.winnerPlayerIds.includes('nc'));
  assert.ok(allianceWin.winnerPlayerIds.includes('n1'));
  assert.ok(!allianceWin.winnerPlayerIds.includes('h1'), 'Non-alliance Hunter must NOT co-win with alliance');
});
