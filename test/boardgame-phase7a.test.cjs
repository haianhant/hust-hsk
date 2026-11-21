// ---------------------------------------------------------------------------
// test/boardgame-phase7a.test.cjs — Phase 7A Advanced Engine Foundations,
// Security Invariants, Canonical Catalog Consistency & Classic Compatibility.
// ---------------------------------------------------------------------------

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
require('./register-ts.cjs');

const ROOT = path.resolve(__dirname, '..');
const domain = require('../features/boardgame/domain/index.ts');
const {
  createInitialGameState,
  applyPlayerGameAction,
  applyTimeoutAutoTurn,
  advanceTurn,
  getPublicGameView,
  getPrivateGameView,
  evaluateExpandedVictoryWithDiagnostics,
  evaluateVictory,
  createSkillEngine,
  // Phase 7A: TurnOwnershipOverride
  TURN_CONTROL_AUTHORIZED_PUBLIC_ACTIONS,
  TURN_CONTROL_PROHIBITED_CONTROLLER_ACTIONS,
  scheduleDeferredTurnControl,
  activateScheduledTurnControlForTurn,
  expireActiveTurnControl,
  cancelTurnControlForPlayer,
  getActiveTurnControlGrant,
  getEffectiveTurnControllerId,
  isControlGrantValidAndNotReplayed,
  isTurnControlPausedForOwnerDecision,
  resolveTurnCommandAuthority,
  // Phase 7A: PendingResurrection
  ELIMINATION_TRANSACTION_STAGES,
  UNDEAD_REVIVE_HP,
  getPlayerLifecycleState,
  isPlayerDormantPendingRevive,
  isPlayerLivingOrPendingRevive,
  isPlayerFinallyEliminated,
  isPlayerTargetable,
  isPlayerTurnEligible,
  canPlayerEnterPendingResurrection,
  isUndeadPreLethalRevealRestricted,
  enterDormantPendingRevive,
  reviveDormantPlayerAtTurnStart,
  commitFinalEliminationLifecycle,
  // Phase 7A: DynamicSkillCopy
  MAX_SKILL_COPY_DEPTH,
  SKILL_COPY_CAPABILITY_MATRIX,
  getEffectiveSkillRoleId,
  getCopiedSkillBinding,
  hasEffectiveSkillUsedOnce,
  markEffectiveSkillUsedOnce,
  bindCopiedSkillFromElimination,
  bindNcSoldierRecruitedSkill,
  // Phase 7A: DynamicAllegiance & Alliance Groups
  NC_SOLDIER_REQUIRED_WEAPON_IDS,
  getBaseFaction,
  getEffectiveFaction,
  hasConvertedEffectiveFaction,
  convertPlayerEffectiveFaction,
  getOriginallyDealtNeutralPlayerIds,
  getPlayerAlliance,
  isPlayerInAlliance,
  isEligibleNcSoldierRecruitTarget,
  recruitPlayerIntoNcSoldierAlliance,
  isNcSoldierAllianceVictorySatisfied,
  // Phase 7A: GlobalAttackInterrupt
  createPendingDeclaredAttack,
  collectAttackInterruptCandidates,
  markAttackInterruptCandidateChecked,
  isPendingAttackCancellable,
  commitPendingAttackCancellation,
  markPendingAttackProceeding,
  // Catalog
  EXPANSION_CHARACTER_CATALOG,
} = domain;

function makePlayers(count) {
  return Array.from({ length: count }, (_, idx) => ({
    playerId: `p${idx + 1}`,
    displayName: `SV ${idx + 1}`,
    seatIndex: idx,
    appearance: {},
    connected: true,
  }));
}

function createExpandedFixture(count = 6, seed = 70001) {
  return createInitialGameState({
    matchId: `p7a-${count}-${seed}`,
    seed,
    nowMs: 1_000_000,
    rulesetId: 'starter-forty-eight',
    allowExperimental: true,
    players: makePlayers(count),
  });
}

// ===========================================================================
// 1. Canonical Catalog HP, Faction & ID Consistency (Mandatory Data Correction)
// ===========================================================================

test('7A.1: Canonical Tier-4 HP, faction & IDs match character-catalog.json across code and technical docs', () => {
  const catalogPath = path.join(ROOT, 'docs/boardgame-expansion/character-catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  assert.equal(catalog.characters.length, 56);
  assert.equal(EXPANSION_CHARACTER_CATALOG.length, 56);

  const canonicalTier4 = {
    exp1_lloyd: { name: 'Lloyd', faction: 'hunter', maxHp: 12 },
    exp1_vengeful_spirit: { name: 'Vengeful Spirit', faction: 'shadow', maxHp: 13 },
    exp1_voodoo: { name: 'Voodoo', faction: 'shadow', maxHp: 13 },
    exp1_undead: { name: 'Undead', faction: 'shadow', maxHp: 11 },
    exp1_antimony: { name: 'Antimony', faction: 'neutral', maxHp: 8 },
    exp2_cain: { name: 'Cain', faction: 'neutral', maxHp: 11 },
    exp2_bonnie: { name: 'Bonnie', faction: 'neutral', maxHp: 10 },
    exp2_nc_soldier: { name: 'N.C. Soldier', faction: 'neutral', maxHp: 13 },
  };

  // Verify JSON catalog <-> TypeScript expansion-catalog.ts 1-to-1 parity
  const tsById = new Map(EXPANSION_CHARACTER_CATALOG.map((r) => [r.id, r]));
  for (const entry of catalog.characters) {
    const tsRec = tsById.get(entry.id);
    assert.ok(tsRec, `Missing ${entry.id} in expansion-catalog.ts`);
    assert.equal(tsRec.maxHp, entry.maxHp, `HP mismatch for ${entry.id}`);
    assert.equal(tsRec.faction, entry.faction, `Faction mismatch for ${entry.id}`);
    assert.equal(tsRec.sourceName, entry.sourceName, `Name mismatch for ${entry.id}`);
  }

  // Verify exact canonical values for the 8 Tier-4 roles
  for (const [id, expected] of Object.entries(canonicalTier4)) {
    const rec = tsById.get(id);
    assert.ok(rec, `Missing Tier-4 ${id}`);
    assert.equal(rec.maxHp, expected.maxHp, `Canonical HP mismatch for ${id}`);
    assert.equal(rec.faction, expected.faction, `Canonical faction mismatch for ${id}`);
    assert.equal(rec.sourceName, expected.name, `Canonical name mismatch for ${id}`);
  }

  // Verify corrected phase-6-handoff.md table matches canonical catalog HP & faction
  const p6Handoff = fs.readFileSync(
    path.join(ROOT, 'docs/boardgame-expansion/phase-6/phase-6-handoff.md'),
    'utf8',
  );
  const p7Scope = fs.readFileSync(
    path.join(ROOT, 'docs/boardgame-expansion/phase-7/phase-7-scope.md'),
    'utf8',
  );
  const p7Rules = fs.readFileSync(
    path.join(ROOT, 'docs/boardgame-expansion/phase-7/rules-decisions.md'),
    'utf8',
  );

  for (const [id, expected] of Object.entries(canonicalTier4)) {
    // Check phase-6-handoff row: | n | `id` | Name | Exp X | Faction | HP |
    const p6RowRe = new RegExp(
      `\\|\\s*\\d+\\s*\\|\\s*\`${id}\`\\s*\\|\\s*[^|]+\\|\\s*Exp\\s*[12]\\s*\\|\\s*${expected.faction}\\s*\\|\\s*${expected.maxHp}\\s*\\|`,
      'i',
    );
    assert.match(
      p6Handoff,
      p6RowRe,
      `phase-6-handoff.md must match canonical faction/HP for ${id} (${expected.faction}, ${expected.maxHp} HP)`,
    );

    // Check phase-7-scope row contains exact id, faction, and **HP**
    const p7ScopeRowRe = new RegExp(
      `\`${id}\`[^\\n]*\`${expected.faction}\`[^\\n]*\\*\\*${expected.maxHp}\\*\\*`,
    );
    assert.match(
      p7Scope,
      p7ScopeRowRe,
      `phase-7-scope.md must match canonical faction/HP for ${id}`,
    );

    // Check rules-decisions heading contains exact id and **HP HP**
    const p7RulesHeadRe = new RegExp(
      `##\\s*\\d+\\.\\s*\`${id}\`[^\\n]*\\*\\*${expected.maxHp}\\s*HP\\*\\*`,
    );
    assert.match(
      p7Rules,
      p7RulesHeadRe,
      `rules-decisions.md must match canonical HP for ${id}`,
    );
  }

  // Ensure rules-decisions uses house-rule-approved and never falsely claims verified
  assert.match(p7Rules, /house-rule-approved/);
  assert.doesNotMatch(p7Rules, /rulesStatus:\s*"verified"/);
});

// ===========================================================================
// 2. TurnOwnershipOverride (Section 3 — Voodoo Security Gate)
// ===========================================================================

test('7A.2: TurnOwnershipOverride enforces 5-identity separation, command authorization, privacy & anti-replay', () => {
  const state = createExpandedFixture(6, 70002);
  const voodooId = 'p1';
  const victimId = 'p2';
  const bystanderId = 'p3';
  const victim = state.players[victimId];
  victim.revealed = false;
  victim.privateClues.push({
    id: 'clue-secret-1',
    round: 1,
    atMs: 1_000_000,
    cardTitle: 'Điều tra bí mật',
    targetPlayerId: bystanderId,
    targetName: 'SV 3',
    outcome: 'condition-met',
    detail: 'Manh mối chỉ nạn nhân được thấy',
  });

  // Schedule deferred hijack from p1 -> p2
  const grant = scheduleDeferredTurnControl(state, {
    controllerPlayerId: voodooId,
    victimPlayerId: victimId,
    sourceRoleId: 'exp1_voodoo',
    nowMs: 1_001_000,
  });
  assert.ok(grant);
  assert.equal(grant.status, 'PENDING_NEXT_TURN');
  assert.equal(grant.activePlayerId, victimId);
  assert.equal(grant.controllerPlayerId, voodooId);
  assert.equal(grant.actingPawnPlayerId, victimId);
  assert.equal(grant.privateInformationOwnerId, victimId);

  // Advance from p1's turn to p2's turn -> activates hijack cleanly
  advanceTurn(state, 1_002_000);
  assert.equal(state.activePlayerId, victimId);
  const activeGrant = getActiveTurnControlGrant(state);
  assert.ok(activeGrant);
  assert.equal(activeGrant.controlGrantId, grant.controlGrantId);
  assert.equal(getEffectiveTurnControllerId(state), voodooId);
  assert.equal(isControlGrantValidAndNotReplayed(state, grant.controlGrantId), true);

  // Projections: zero hidden role/private leak to Voodoo or public view!
  const pubView = getPublicGameView(state);
  assert.ok(pubView.controlledTurn);
  assert.equal(pubView.controlledTurn.controllerPlayerId, voodooId);
  assert.equal(pubView.controlledTurn.activePlayerId, victimId);
  assert.equal(pubView.controlledTurn.pausedForOwnerDecision, false);
  const pubVictim = pubView.players.find((p) => p.playerId === victimId);
  assert.equal(pubVictim.revealedRoleId, null);

  const voodooPriv = getPrivateGameView(state, voodooId);
  const victimPriv = getPrivateGameView(state, victimId);
  assert.equal(voodooPriv.isControllingActiveTurn, true);
  assert.equal(victimPriv.isTurnHijacked, true);
  assert.equal(voodooPriv.playerId, voodooId);
  assert.equal(voodooPriv.privateClues.length, 0, 'Voodoo must NOT see victim privateClues');
  assert.equal(victimPriv.privateClues.length, 1);

  // Victim is BLOCKED from competing public actions while hijacked
  const victimRoll = applyPlayerGameAction(state, victimId, { type: 'ROLL_DICE' }, 1_002_100);
  assert.equal(victimRoll.ok, false);
  // Bystander is BLOCKED
  const bystanderRoll = applyPlayerGameAction(state, bystanderId, { type: 'ROLL_DICE' }, 1_002_150);
  assert.equal(bystanderRoll.ok, false);

  // Controller (Voodoo) is STRICTLY PROHIBITED from REVEAL_ROLE, USE_SKILL, TRANSFER_TO_BETHANY, INVESTIGATE_CARD, inv-* card
  for (const prohibited of [
    { type: 'REVEAL_ROLE' },
    { type: 'USE_SKILL' },
    { type: 'TRANSFER_TO_BETHANY', targetPlayerId: bystanderId, cardId: 'eq-01' },
    { type: 'INVESTIGATE_CARD', cardId: 'inv-01', targetPlayerId: bystanderId },
    { type: 'USE_CARD', cardId: 'inv-01', targetPlayerId: bystanderId },
  ]) {
    const blocked = applyPlayerGameAction(state, voodooId, prohibited, 1_002_200);
    assert.equal(blocked.ok, false, `Controller must be blocked for ${prohibited.type}`);
  }
  assert.equal(victim.revealed, false, 'Victim must remain unrevealed');
  assert.ok((state.expansionState.stats.unauthorizedControlAttempts ?? 0) >= 5);

  // Verify authorized vs prohibited command sets are disjoint
  for (const cmd of TURN_CONTROL_AUTHORIZED_PUBLIC_ACTIONS) {
    assert.equal(TURN_CONTROL_PROHIBITED_CONTROLLER_ACTIONS.has(cmd), false);
  }

  // Controller CAN roll dice on victim's pawn!
  const beforeLoc = victim.location;
  const rollRes = applyPlayerGameAction(state, voodooId, { type: 'ROLL_DICE' }, 1_002_300);
  assert.equal(rollRes.ok, true);
  assert.ok((state.expansionState.stats.hijackedActionsCount ?? 0) >= 1);

  // If victim receives a secret investigation card (`inv-01`), delegated public control PAUSES
  // and ONLY victim can resolve `INVESTIGATE_CARD`, while Voodoo cannot see it in `controlledTurn.publicDrawnCards`!
  state.turnPhase = 'MAIN_ACTION';
  victim.hand = ['inv-01'];
  assert.equal(isTurnControlPausedForOwnerDecision(state), true);
  assert.equal(getEffectiveTurnControllerId(state), victimId, 'Timer shifts to victim while private card is pending');
  const pubPaused = getPublicGameView(state);
  assert.equal(pubPaused.controlledTurn.pausedForOwnerDecision, true);
  assert.equal(pubPaused.controlledTurn.publicDrawnCards.length, 0, 'inv-* must NEVER appear in publicDrawnCards');

  const voodooBlockedDuringInv = applyPlayerGameAction(state, voodooId, { type: 'END_TURN' }, 1_002_400);
  assert.equal(voodooBlockedDuringInv.ok, false);

  const victimInvRes = applyPlayerGameAction(
    state,
    victimId,
    { type: 'INVESTIGATE_CARD', cardId: 'inv-01', targetPlayerId: bystanderId },
    1_002_500,
  );
  assert.equal(victimInvRes.ok, true, `Victim must be allowed to resolve own inv-* card: ${victimInvRes.error}`);
  assert.equal(isTurnControlPausedForOwnerDecision(state), false);

  // Now controller finishes turn -> grant expires deterministically and cannot be replayed!
  if (state.activePlayerId === victimId && !state.finished) {
    const endRes = applyPlayerGameAction(state, voodooId, { type: 'END_TURN' }, 1_002_600);
    assert.equal(endRes.ok, true);
  }
  assert.equal(getActiveTurnControlGrant(state), null);
  assert.equal(isControlGrantValidAndNotReplayed(state, grant.controlGrantId), false);
  assert.ok(state.expansionState.expiredControlGrantIds.includes(grant.controlGrantId));

  // Verify victim death before hijacked turn cancels pending grant cleanly without shifting target
  const grant2 = scheduleDeferredTurnControl(state, {
    controllerPlayerId: voodooId,
    victimPlayerId: 'p4',
    sourceRoleId: 'exp1_voodoo',
    nowMs: 1_003_000,
  });
  assert.ok(grant2);
  const cancelledCount = cancelTurnControlForPlayer(state, 'p4', 'victim-eliminated', 1_003_100);
  assert.equal(cancelledCount, 1);
  assert.equal(isControlGrantValidAndNotReplayed(state, grant2.controlGrantId), false);

  // Verify timeout auto-turn expires active hijack safely (never locks table!)
  const state2 = createExpandedFixture(4, 70003);
  const gTimeout = scheduleDeferredTurnControl(state2, {
    controllerPlayerId: 'p1',
    victimPlayerId: 'p2',
    sourceRoleId: 'exp1_voodoo',
    nowMs: 2_000_000,
  });
  advanceTurn(state2, 2_001_000);
  assert.equal(getActiveTurnControlGrant(state2)?.controlGrantId, gTimeout.controlGrantId);
  applyTimeoutAutoTurn(state2, 2_020_000);
  assert.equal(getActiveTurnControlGrant(state2), null);
  assert.equal(state2.activePlayerId, 'p3');
  assert.ok(beforeLoc !== undefined);
});

// ===========================================================================
// 3. PendingResurrection & 10-Step Elimination Transaction Ordering (Section 4 & 9)
// ===========================================================================

test('7A.3: PendingResurrection enforces ALIVE -> DORMANT_PENDING_REVIVE -> REVIVED (6 HP) -> FINAL_ELIMINATED', () => {
  assert.equal(ELIMINATION_TRANSACTION_STAGES.length, 10);
  assert.equal(UNDEAD_REVIVE_HP, 6);

  const state = createExpandedFixture(4, 70004);
  // Assign p1 = Hunter, p2 = Undead (sole living Shadow!), p3 = Hunter, p4 = Shadow (already dead)
  state.players.p1.faction = 'lantern-guard';
  state.players.p2.roleId = 'exp1_undead';
  state.players.p2.faction = 'mist-order';
  state.players.p2.maxHp = 11;
  state.players.p2.hp = 11;
  state.players.p2.woundsTaken = 0;
  state.players.p2.revealed = false;
  state.players.p2.equipped = ['eq-01', 'ev-05'];
  state.players.p3.faction = 'lantern-guard';
  state.players.p4.faction = 'mist-order';
  state.players.p4.alive = false;
  state.players.p4.hp = 0;
  commitFinalEliminationLifecycle(state, state.players.p4, 1_000_500);

  // Pre-lethal reveal restriction active for hidden Undead
  assert.equal(isUndeadPreLethalRevealRestricted(state, state.players.p2), true);
  assert.equal(canPlayerEnterPendingResurrection(state, state.players.p2), true);
  assert.equal(getPlayerLifecycleState(state, state.players.p2), 'ALIVE');

  // First lethal event -> DORMANT_PENDING_REVIVE (idempotent on duplicate eventId!)
  const enter1 = enterDormantPendingRevive(state, state.players.p2, 'elim-undead-1', 1_001_000);
  assert.equal(enter1.entered, true);
  const enterDup = enterDormantPendingRevive(state, state.players.p2, 'elim-undead-1', 1_001_001);
  assert.equal(enterDup.entered, false);
  assert.equal(enterDup.duplicateEvent, true);

  assert.equal(getPlayerLifecycleState(state, state.players.p2), 'DORMANT_PENDING_REVIVE');
  assert.equal(state.players.p2.revealed, true);
  assert.equal(state.players.p2.alive, false);
  assert.deepEqual(state.players.p2.equipped, ['eq-01', 'ev-05'], 'Equipment must be retained during dormancy');
  assert.equal(isPlayerDormantPendingRevive(state, state.players.p2), true);
  assert.equal(isPlayerLivingOrPendingRevive(state, state.players.p2), true);
  assert.equal(isPlayerFinallyEliminated(state, state.players.p2), false);
  assert.equal(isPlayerTargetable(state, state.players.p2), false, 'Dormant Undead must NOT be targetable');
  assert.equal(isPlayerTurnEligible(state, state.players.p2), true, 'Dormant Undead must keep scheduled turn');

  // Dormant player cannot issue ordinary actions
  const dormantAct = applyPlayerGameAction(state, 'p2', { type: 'ROLL_DICE' }, 1_001_200);
  assert.equal(dormantAct.ok, false);

  // Last Shadow in dormancy MUST NOT trigger accidental Hunter victory!
  const midVictory = evaluateExpandedVictoryWithDiagnostics(state).evaluation;
  assert.equal(midVictory.finished, false, 'Hunter MUST NOT win while Undead is DORMANT_PENDING_REVIVE');

  // Public deadCount must NOT include dormant player
  const pubDormant = getPublicGameView(state);
  assert.equal(pubDormant.deadCount, 1, 'Only p4 (FINAL_ELIMINATED) counts in deadCount');
  assert.equal(pubDormant.players.find((p) => p.playerId === 'p2').lifecycleState, 'DORMANT_PENDING_REVIVE');

  // Advance turn from p1 -> p2: Undead MUST NOT be skipped; revives at 6 HP (woundsTaken = 5)!
  state.activePlayerId = 'p1';
  advanceTurn(state, 1_002_000);
  assert.equal(state.activePlayerId, 'p2');
  assert.equal(getPlayerLifecycleState(state, state.players.p2), 'REVIVED');
  assert.equal(state.players.p2.alive, true);
  assert.equal(state.players.p2.hp, 6);
  assert.equal(state.players.p2.woundsTaken, 5);
  assert.equal(state.players.p2.skillUsedOnce, true);
  assert.deepEqual(state.players.p2.equipped, ['eq-01', 'ev-05']);

  // Second lethal event CANNOT revive again -> FINAL_ELIMINATED -> Hunter wins!
  assert.equal(canPlayerEnterPendingResurrection(state, state.players.p2), false);
  state.players.p2.alive = false;
  state.players.p2.hp = 0;
  commitFinalEliminationLifecycle(state, state.players.p2, 1_003_000);
  assert.equal(getPlayerLifecycleState(state, state.players.p2), 'FINAL_ELIMINATED');
  assert.equal(isPlayerFinallyEliminated(state, state.players.p2), true);
  assert.equal(isPlayerTurnEligible(state, state.players.p2), false);

  const finalVictory = evaluateExpandedVictoryWithDiagnostics(state).evaluation;
  assert.equal(finalVictory.finished, true);
  assert.equal(finalVictory.winnerFaction, 'lantern-guard');
});

// ===========================================================================
// 4. DynamicSkillCopy & 66/66 Capability Matrix (Section 5)
// ===========================================================================

test('7A.4: DynamicSkillCopy covers all 66 roles, fresh usage, nested copy, depth/cycle guards & SkillEngine dispatch', () => {
  const entries = Object.values(SKILL_COPY_CAPABILITY_MATRIX);
  assert.equal(entries.length, 66, 'SKILL_COPY_CAPABILITY_MATRIX must cover all 66 roles (10 Classic + 56 Expansion)');
  assert.equal(entries.filter((e) => e.pack === 'classic').length, 10);
  assert.equal(entries.filter((e) => e.pack === 'expansion-1').length, 26);
  assert.equal(entries.filter((e) => e.pack === 'expansion-2').length, 30);

  // Verify special lifecycle roles are explicitly classified
  for (const id of ['exp1_lloyd', 'exp1_voodoo', 'exp1_undead', 'exp2_cain', 'exp2_bonnie', 'exp2_nc_soldier']) {
    assert.equal(SKILL_COPY_CAPABILITY_MATRIX[id].copyStatus, 'SPECIAL_LIFECYCLE');
  }
  for (const id of ['exp1_antimony', 'exp1_vengeful_spirit']) {
    assert.equal(SKILL_COPY_CAPABILITY_MATRIX[id].copyStatus, 'SELF_REFERENTIAL_NO_LOOP');
  }

  const state = createExpandedFixture(6, 70005);
  const victim = state.players.p1; // e.g., Ernest (once-per-match, ALREADY used!)
  victim.roleId = 'exp1_ernest';
  victim.faction = 'lantern-guard';
  victim.skillUsedOnce = true;
  victim.alive = false;

  const copier1 = state.players.p2; // Vengeful Spirit (Shadow)
  copier1.roleId = 'exp1_vengeful_spirit';
  copier1.faction = 'mist-order';
  copier1.revealed = true;
  copier1.skillUsedOnce = true; // own copy power used

  const bind1 = bindCopiedSkillFromElimination(state, copier1, victim, 'copy-evt-1', 1_001_000);
  assert.equal(bind1.bound, true);
  assert.equal(getEffectiveSkillRoleId(state, copier1), 'exp1_ernest');
  assert.equal(getBaseFaction(copier1), 'mist-order', 'Copying Hunter skill must NOT change Shadow faction');
  assert.equal(getEffectiveFaction(state, copier1), 'mist-order');
  assert.equal(hasEffectiveSkillUsedOnce(state, copier1), false, 'Copied once-per-match skill MUST get fresh usage');
  assert.equal(bind1.binding.copyDepth, 1);

  // SkillEngine dispatches copied skill on copier's state and marks ONLY binding.skillUsedOnce!
  const engine = createSkillEngine();
  let executedForOwner = null;
  engine.registerHandler({
    id: 'test:ernest-copied',
    roleId: 'exp1_ernest',
    trigger: 'ACTIVE_SKILL',
    priority: 10,
    oncePerMatch: true,
    requiresRevealed: true,
    execute(ctx) {
      executedForOwner = ctx.owner.playerId;
      return { applied: true };
    },
  });
  const dispatchRes = engine.dispatch(state, {
    trigger: 'ACTIVE_SKILL',
    actorPlayerId: copier1.playerId,
    nowMs: 1_001_500,
  });
  assert.equal(dispatchRes.ok, true);
  assert.equal(executedForOwner, copier1.playerId);
  assert.equal(hasEffectiveSkillUsedOnce(state, copier1), true);

  // Nested copy: copier2 (Antimony) copies dead copier1 -> inherits effective skill `exp1_ernest` with fresh usage & depth=2
  copier1.alive = false;
  const copier2 = state.players.p3;
  copier2.roleId = 'exp1_antimony';
  copier2.faction = 'wanderer';
  copier2.revealed = true;
  const bind2 = bindCopiedSkillFromElimination(state, copier2, copier1, 'copy-evt-2', 1_002_000);
  assert.equal(bind2.bound, true);
  assert.equal(getEffectiveSkillRoleId(state, copier2), 'exp1_ernest');
  assert.equal(bind2.binding.copyDepth, 2);
  assert.equal(hasEffectiveSkillUsedOnce(state, copier2), false, 'Nested copy also gets fresh usage');

  // Depth limit guard (MAX_SKILL_COPY_DEPTH = 3)
  assert.equal(MAX_SKILL_COPY_DEPTH, 3);
  const copier3 = state.players.p4;
  const bind3 = bindCopiedSkillFromElimination(state, copier3, copier2, 'copy-evt-3', 1_003_000);
  assert.equal(bind3.bound, true);
  assert.equal(bind3.binding.copyDepth, 3);
  const copier4 = state.players.p5;
  const bind4 = bindCopiedSkillFromElimination(state, copier4, copier3, 'copy-evt-4', 1_004_000);
  assert.equal(bind4.bound, false);
  assert.equal(bind4.cycleOrDepthBlocked, true);

  // Cycle guard: copier cannot copy from a binding whose sourcePlayerId is itself
  const cycleRes = bindCopiedSkillFromElimination(state, victim, copier1, 'copy-evt-cycle', 1_005_000);
  assert.equal(cycleRes.bound, false);
  assert.equal(cycleRes.cycleOrDepthBlocked, true);

  // Copying Undead grants fresh PendingResurrection charge even while revealed!
  const deadUndead = state.players.p6;
  deadUndead.roleId = 'exp1_undead';
  deadUndead.skillUsedOnce = true;
  const undeadCopy = bindCopiedSkillFromElimination(state, copier4, deadUndead, 'copy-evt-undead', 1_006_000);
  assert.equal(undeadCopy.bound, true);
  assert.equal(canPlayerEnterPendingResurrection(state, copier4), true);
});

// ===========================================================================
// 5. DynamicAllegiance, Alliance Groups & 5P N.C. Soldier Exclusion (Section 6)
// ===========================================================================

test('7A.5: DynamicAllegiance separates baseFaction, effectiveFaction (Bonnie) & AllianceGroup (N.C. Soldier)', () => {
  const state = createExpandedFixture(6, 70006);
  // Setup: p1,p2 = Hunter; p3 = sole living Shadow; p4 = Bonnie (Neutral); p5 = N.C. Soldier (Neutral); p6 = Bob (Neutral)
  state.players.p1.faction = 'lantern-guard';
  state.players.p2.faction = 'lantern-guard';
  state.players.p3.faction = 'mist-order';
  state.players.p4.roleId = 'exp2_bonnie';
  state.players.p4.faction = 'wanderer';
  state.players.p5.roleId = 'exp2_nc_soldier';
  state.players.p5.faction = 'wanderer';
  state.players.p6.roleId = 'lang-anh-san';
  state.players.p6.faction = 'wanderer';
  state.expansionState.originallyDealtNeutralIds = ['p4', 'p5', 'p6'];

  // p3 (last Shadow) is eliminated by Bonnie -> Bonnie converts BEFORE victory check!
  state.players.p3.alive = false;
  state.players.p3.hp = 0;
  commitFinalEliminationLifecycle(state, state.players.p3, 1_001_000);

  const conv = convertPlayerEffectiveFaction(state, state.players.p4, {
    targetFaction: 'mist-order',
    conversionEventId: 'bonnie-conv-1',
    triggerVictimPlayerId: 'p3',
    reason: 'bonnie_shadow_succession',
    nowMs: 1_001_000,
  });
  assert.equal(conv.converted, true);
  state.players.p4.revealed = true;

  // Base faction remains Neutral; effective faction is Shadow; cannot double-convert
  assert.equal(getBaseFaction(state.players.p4), 'wanderer');
  assert.equal(getEffectiveFaction(state, state.players.p4), 'mist-order');
  assert.equal(hasConvertedEffectiveFaction(state, 'p4'), true);
  const convDup = convertPlayerEffectiveFaction(state, state.players.p4, {
    targetFaction: 'lantern-guard',
    conversionEventId: 'bonnie-conv-2',
    triggerVictimPlayerId: null,
    reason: 'bonnie_shadow_succession',
    nowMs: 1_001_500,
  });
  assert.equal(convDup.converted, false);
  assert.equal(convDup.alreadyConverted, true);

  // Hunter MUST NOT win because Bonnie is now the living effective Shadow!
  assert.equal(evaluateExpandedVictoryWithDiagnostics(state).evaluation.finished, false);

  // N.C. Soldier CANNOT recruit unrevealed Neutral (P0 privacy) or Bonnie (now effective Shadow)
  state.players.p5.revealed = true;
  state.players.p6.revealed = false;
  assert.equal(isEligibleNcSoldierRecruitTarget(state, state.players.p5, state.players.p6), false);
  assert.equal(isEligibleNcSoldierRecruitTarget(state, state.players.p5, state.players.p4), false);

  // Reveal p6 (Bob) -> recruitment succeeds; p6 keeps roleId & effectiveFaction='wanderer', joins alliance!
  state.players.p6.revealed = true;
  assert.equal(isEligibleNcSoldierRecruitTarget(state, state.players.p5, state.players.p6), true);
  const rec = recruitPlayerIntoNcSoldierAlliance(state, state.players.p5, state.players.p6, 'nc-rec-1', 1_002_000);
  assert.equal(rec.recruited, true);
  bindNcSoldierRecruitedSkill(state, state.players.p6, state.players.p5, 'nc-rec-1', 1_002_000);
  assert.equal(state.players.p6.roleId, 'lang-anh-san');
  assert.equal(getEffectiveFaction(state, state.players.p6), 'wanderer');
  assert.equal(getEffectiveSkillRoleId(state, state.players.p6), 'exp2_nc_soldier');
  assert.equal(isPlayerInAlliance(state, 'p6'), true);

  // Even if p5 holds all 3 weapons, p4 (originally dealt Neutral) converted to Shadow before recruitment -> NOT satisfied!
  state.players.p5.equipped = [...NC_SOLDIER_REQUIRED_WEAPON_IDS];
  assert.equal(isNcSoldierAllianceVictorySatisfied(state, rec.alliance), false);

  // When all originally dealt other Neutrals ARE recruited + leader holds ev-06, ev-05, ev-03 -> alliance wins!
  state.expansionState.originallyDealtNeutralIds = ['p5', 'p6'];
  assert.equal(getOriginallyDealtNeutralPlayerIds(state).length, 2);
  assert.equal(isNcSoldierAllianceVictorySatisfied(state, rec.alliance), true);
  const allyWin = evaluateExpandedVictoryWithDiagnostics(state).evaluation;
  assert.equal(allyWin.finished, true);
  assert.equal(allyWin.winnerFaction, 'wanderer-solo');
  assert.ok(allyWin.winnerPlayerIds.includes('p5'));
  assert.ok(allyWin.winnerPlayerIds.includes('p6'));
});

// ===========================================================================
// 6. MultiFactionVictory (Section 7 — Cain Dual-Faction & Simultaneous Triggers)
// ===========================================================================

test('7A.6: MultiFactionVictory represents simultaneous Hunter + Shadow victory accurately (Cain & Antimony graph)', () => {
  const state = createExpandedFixture(6, 70007);
  state.players.p1.faction = 'lantern-guard';
  state.players.p2.faction = 'lantern-guard';
  state.players.p3.faction = 'mist-order';
  state.players.p4.faction = 'mist-order';
  state.players.p5.roleId = 'exp2_cain';
  state.players.p5.faction = 'wanderer';
  state.players.p5.revealed = true;
  state.players.p6.roleId = 'exp1_antimony';
  state.players.p6.faction = 'wanderer';

  // Antimony unactivated MUST NOT win
  assert.equal(evaluateExpandedVictoryWithDiagnostics(state).evaluation.finished, false);

  // Activate Cain's global dual-faction death modifier, then eliminate Cain -> BOTH Hunter & Shadow win!
  state.expansionState.cainDeathVictoryModifierIds = ['p5'];
  state.players.p5.alive = false;
  state.players.p5.hp = 0;
  commitFinalEliminationLifecycle(state, state.players.p5, 1_001_000);

  // Also bind Antimony COPY_GOAL to p1 (Hunter) -> Antimony co-wins via CopiedVictoryGraph!
  state.expansionState.antimonyCopiedGoalByPlayer = {
    p6: {
      targetPlayerId: 'p1',
      sourceRoleId: state.players.p1.roleId,
      boundEventId: 'anti-copy-1',
      boundAtMs: 1_001_000,
      boundTurnNumber: 1,
    },
  };

  const diag = evaluateExpandedVictoryWithDiagnostics(state);
  const ev = diag.evaluation;
  assert.equal(ev.finished, true);
  assert.equal(ev.winnerFaction, 'multi-faction');
  assert.deepEqual(ev.winningFactions, ['lantern-guard', 'mist-order']);
  for (const pid of ['p1', 'p2', 'p3', 'p4', 'p6']) {
    assert.ok(ev.winnerPlayerIds.includes(pid), `Expected ${pid} in dual-faction winners`);
  }

  // Test Cain 5P personal victory (must personally kill >=1 Hunter and >=1 Shadow)
  const s5 = createExpandedFixture(5, 70008);
  s5.players.p1.faction = 'lantern-guard';
  s5.players.p2.faction = 'lantern-guard';
  s5.players.p3.faction = 'mist-order';
  s5.players.p4.faction = 'mist-order';
  s5.players.p5.roleId = 'exp2_cain';
  s5.players.p5.faction = 'wanderer';
  s5.expansionState.killedFactionsByPlayer = { p5: ['lantern-guard'] };
  assert.equal(evaluateExpandedVictoryWithDiagnostics(s5).evaluation.finished, false);
  s5.expansionState.killedFactionsByPlayer = { p5: ['lantern-guard', 'mist-order'] };
  const cain5pWin = evaluateExpandedVictoryWithDiagnostics(s5).evaluation;
  assert.equal(cain5pWin.finished, true);
  assert.equal(cain5pWin.winnerFaction, 'wanderer-solo');
  assert.ok(cain5pWin.winnerPlayerIds.includes('p5'));
});

// ===========================================================================
// 7. GlobalAttackInterrupt (Section 8 — Lloyd Pre-Roll Hook)
// ===========================================================================

test('7A.7: GlobalAttackInterrupt supports cross-map Machine Gun snapshot, deterministic ordering & 0 RNG consumption on cancel', () => {
  const state = createExpandedFixture(6, 70009);
  state.activePlayerId = 'p1';
  // p3 = revealed Lloyd, p5 = revealed copier of Lloyd, p4 = hidden Lloyd (MUST NOT be eligible!)
  state.players.p3.roleId = 'exp1_lloyd';
  state.players.p3.revealed = true;
  state.players.p4.roleId = 'exp1_lloyd';
  state.players.p4.revealed = false;
  state.players.p5.roleId = 'exp1_vengeful_spirit';
  state.players.p5.revealed = true;
  state.expansionState.copiedSkillsByPlayer = {
    p5: {
      ownerPlayerId: 'p5',
      baseRoleId: 'exp1_vengeful_spirit',
      effectiveSkillRoleId: 'exp1_lloyd',
      sourcePlayerId: 'p3',
      sourceOriginalRoleId: 'exp1_lloyd',
      copyEventId: 'copy-lloyd-1',
      copiedAtMs: 1_000_500,
      copiedAtTurnNumber: 1,
      copyDepth: 1,
      provenanceChain: ['exp1_vengeful_spirit', 'exp1_lloyd'],
      bindingKind: 'copied-from-elimination',
      skillUsedOnce: false,
      skillCooldown: 0,
    },
  };

  const rngBefore = state.rngState;
  const declared = createPendingDeclaredAttack(state, {
    attackerPlayerId: 'p1',
    primaryTargetId: 'p2',
    targetPlayerIds: ['p2', 'p6'], // Machine Gun multi-target as ONE action!
    hasMasamune: false,
    hasMachineGun: true,
    nowMs: 1_001_000,
  });

  const cands = collectAttackInterruptCandidates(state, declared);
  assert.deepEqual(
    cands.map((p) => p.playerId),
    ['p3', 'p5'],
    'Only living REVEALED Lloyd / copied-Lloyd candidates ordered by seat distance; hidden p4 excluded!',
  );

  // p3 cancels -> closes ALL remaining interrupt windows immediately with ZERO RNG consumed!
  assert.equal(isPendingAttackCancellable(declared), true);
  assert.equal(commitPendingAttackCancellation(declared, 'p3', 1_001_100), true);
  assert.equal(commitPendingAttackCancellation(declared, 'p5', 1_001_200), false, 'Second cancel must be rejected');
  assert.equal(collectAttackInterruptCandidates(state, declared).length, 0);
  assert.equal(isPendingAttackCancellable(declared), false);
  assert.equal(state.rngState, rngBefore, 'Cancelled attack must consume ZERO RNG');

  // If all decline -> PROCEED locks attack so it can never be retroactively cancelled
  const declared2 = createPendingDeclaredAttack(state, {
    attackerPlayerId: 'p1',
    primaryTargetId: 'p2',
    targetPlayerIds: ['p2'],
    hasMasamune: false,
    hasMachineGun: false,
    nowMs: 1_002_000,
  });
  markAttackInterruptCandidateChecked(declared2, 'p3');
  markAttackInterruptCandidateChecked(declared2, 'p5');
  assert.equal(collectAttackInterruptCandidates(state, declared2).length, 0);
  assert.equal(markPendingAttackProceeding(declared2), true);
  assert.equal(commitPendingAttackCancellation(declared2, 'p3', 1_002_100), false);
});

// ===========================================================================
// 8. Classic 0-Regression, 0-DTO-Drift & victory.ts 0-Diff Verification
// ===========================================================================

test('7A.8: Classic victory.ts is untouched and Classic DTOs emit zero Phase 7 expanded fields', () => {
  const victoryDiff = execSync('git diff -- features/boardgame/domain/victory.ts', {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(victoryDiff.trim(), '', 'features/boardgame/domain/victory.ts must have 0 diff');

  const classic = createInitialGameState({
    matchId: 'p7a-classic-check',
    seed: 123456,
    nowMs: 1_000_000,
    rulesetId: 'classic',
    players: makePlayers(6),
  });
  assert.equal(classic.expansionState, undefined);

  const pub = getPublicGameView(classic);
  assert.equal(pub.controlledTurn, undefined);
  assert.equal(pub.cainDeathModifierActivePlayerIds, undefined);
  assert.equal(pub.alliances, undefined);
  assert.equal(pub.winningFactions, undefined);
  for (const p of pub.players) {
    assert.equal(p.lifecycleState, undefined);
    assert.equal(p.effectiveFaction, undefined);
    assert.equal(p.copiedSkillRoleId, undefined);
    assert.equal(p.allianceId, undefined);
  }

  const priv = getPrivateGameView(classic, 'p1');
  assert.equal(priv.effectiveFaction, undefined);
  assert.equal(priv.lifecycleState, undefined);
  assert.equal(priv.copiedSkillRoleId, undefined);
  assert.equal(priv.allianceId, undefined);
  assert.equal(priv.isControllingActiveTurn, undefined);
  assert.equal(priv.isTurnHijacked, undefined);

  // Classic evaluateVictory still runs untouched
  const v = evaluateVictory(classic);
  assert.equal(v.finished, false);
});
