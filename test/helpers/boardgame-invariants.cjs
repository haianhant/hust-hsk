'use strict';

/**
 * test/helpers/boardgame-invariants.cjs
 *
 * Formal, reusable Game State Invariant Verifier for Bóng Đêm KTX (Phase 8B).
 * Validates Player State, Turn State, Cards & Equipment Conservation,
 * Victory Integrity, and Privacy / Serialization Projections after any transition.
 */

require('../register-ts.cjs');

const {
  BOARD_GAME_VALID_LOCATIONS,
} = require('../../shared/contracts/boardgame.ts');

const {
  CARDS_CATALOG,
  getCardById,
  getEffectiveFaction,
  getPlayerLifecycleState,
  getPrivateGameView,
  getPublicGameView,
  getRoleDesign,
  isPlayerDormantPendingRevive,
  isPlayerFinallyEliminated,
  isPlayerLivingOrPendingRevive,
  getActiveTurnControlGrant,
} = require('../../features/boardgame/domain/index.ts');

const VALID_LOCATION_SET = new Set(BOARD_GAME_VALID_LOCATIONS);
const VALID_TURN_PHASES = new Set([
  'ROLL_MOVE',
  'CHOOSE_MOVE',
  'LOCATION_ACTION',
  'MAIN_ACTION',
  'ENDED',
]);

const EXPECTED_CARD_COPIES = Object.create(null);
let EXPECTED_TOTAL_CARDS = 0;
for (const c of CARDS_CATALOG) {
  const copies = c.copies ?? 1;
  EXPECTED_CARD_COPIES[c.id] = copies;
  EXPECTED_TOTAL_CARDS += copies;
}

/**
 * Capture an immutable baseline reference of player identities right after match start
 * so subsequent steps can prove base roleId, base faction, and maxHp never drift.
 */
function captureInitialIdentitySnapshot(state) {
  const byPlayer = Object.create(null);
  for (const pid of state.turnOrder) {
    const p = state.players[pid];
    if (!p) continue;
    byPlayer[pid] = {
      roleId: p.roleId,
      faction: p.faction,
      maxHp: p.maxHp,
      seatIndex: p.seatIndex,
    };
  }
  return {
    matchId: state.matchId,
    rulesetId: state.rulesetId,
    seed: state.seed,
    playerCount: state.turnOrder.length,
    turnOrder: [...state.turnOrder],
    byPlayer,
  };
}

/**
 * Collect every card instance currently in play across decks, discards, hands,
 * equipped slots, Gloria queue, and in-flight pendingChoice holdings.
 */
function collectAllCardInstances(state) {
  const counts = Object.create(null);
  let total = 0;
  const add = (cardId) => {
    if (typeof cardId !== 'string') return;
    counts[cardId] = (counts[cardId] || 0) + 1;
    total += 1;
  };

  for (const deckId of ['investigation', 'equipment', 'event']) {
    for (const id of state.decks?.[deckId] || []) add(id);
    for (const id of state.discards?.[deckId] || []) add(id);
  }
  for (const p of Object.values(state.players || {})) {
    for (const id of p.hand || []) add(id);
    for (const id of p.equipped || []) add(id);
  }
  const gloriaQ = state.expansionState?.gloriaQueuedCards;
  if (Array.isArray(gloriaQ)) {
    for (const entry of gloriaQ) {
      if (entry?.cardId) add(entry.cardId);
    }
  }
  const pc = state.pendingChoice;
  if (pc && pc.data) {
    if (pc.data.kind === 'felicia_draw_choice' && Array.isArray(pc.data.cardIds)) {
      for (const id of pc.data.cardIds) add(id);
    } else if (pc.data.kind === 'cruz_black_redraw' && pc.data.drawnCardId) {
      add(pc.data.drawnCardId);
    } else if (pc.data.kind === 'gideon_white_card_target' && pc.data.cardId) {
      add(pc.data.cardId);
    }
  }
  return { counts, total };
}

/**
 * Run all formal game state invariants on `state`.
 * Returns `{ ok: boolean, violations: Array<{ code, category, expected, actual, message }> }`.
 */
function checkGameStateInvariants(state, options = {}) {
  const {
    initialIdentity = null,
    checkCardConservation = true,
    checkProjections = true,
    checkSerialization = false,
  } = options;
  const violations = [];
  const fail = (category, code, expected, actual, message) => {
    violations.push({ category, code, expected, actual, message });
  };

  if (!state || typeof state !== 'object') {
    fail('PLAYER', 'STATE_MISSING', 'AuthoritativeGameState object', typeof state, 'State is missing');
    return { ok: false, violations };
  }

  const isExpanded = Boolean(state.rulesetId && state.rulesetId !== 'classic');

  // -------------------------------------------------------------------------
  // 1. PLAYER STATE INVARIANTS
  // -------------------------------------------------------------------------
  const playerIds = Object.keys(state.players || {});
  const turnOrder = Array.isArray(state.turnOrder) ? state.turnOrder : [];
  const uniqueTurnOrder = new Set(turnOrder);
  if (uniqueTurnOrder.size !== turnOrder.length) {
    fail('PLAYER', 'DUPLICATE_TURN_ORDER', turnOrder.length, uniqueTurnOrder.size, 'Duplicate playerId in turnOrder');
  }
  if (uniqueTurnOrder.size !== playerIds.length) {
    fail('PLAYER', 'TURN_ORDER_PLAYER_MISMATCH', playerIds.length, uniqueTurnOrder.size, 'turnOrder length != players keys');
  }

  const seenSeats = new Set();
  for (const pid of turnOrder) {
    const p = state.players[pid];
    if (!p) {
      fail('PLAYER', 'MISSING_PLAYER_IN_MAP', pid, null, `Player ${pid} in turnOrder missing from players map`);
      continue;
    }
    if (p.playerId !== pid) {
      fail('PLAYER', 'PLAYER_ID_MISMATCH', pid, p.playerId, `Map key ${pid} != player.playerId ${p.playerId}`);
    }
    if (seenSeats.has(p.seatIndex)) {
      fail('PLAYER', 'DUPLICATE_SEAT_INDEX', 'unique seatIndex', p.seatIndex, `Duplicate seatIndex ${p.seatIndex}`);
    }
    seenSeats.add(p.seatIndex);

    // Immutable base identity check
    if (initialIdentity?.byPlayer?.[pid]) {
      const init = initialIdentity.byPlayer[pid];
      if (p.roleId !== init.roleId) {
        fail('PLAYER', 'BASE_ROLE_MUTATED', init.roleId, p.roleId, `${pid} base roleId mutated`);
      }
      if (p.faction !== init.faction) {
        fail('PLAYER', 'BASE_FACTION_MUTATED', init.faction, p.faction, `${pid} base faction mutated`);
      }
      if (p.maxHp !== init.maxHp) {
        fail('PLAYER', 'MAX_HP_MUTATED', init.maxHp, p.maxHp, `${pid} maxHp mutated`);
      }
      if (p.seatIndex !== init.seatIndex) {
        fail('PLAYER', 'SEAT_INDEX_MUTATED', init.seatIndex, p.seatIndex, `${pid} seatIndex mutated`);
      }
    }

    // HP & wounds bounds
    const design = getRoleDesign(p.roleId);
    if (!Number.isInteger(p.hp) || p.hp < 0 || p.hp > p.maxHp) {
      fail('PLAYER', 'HP_OUT_OF_BOUNDS', `integer in [0, ${p.maxHp}]`, p.hp, `${pid} hp=${p.hp} out of [0, ${p.maxHp}]`);
    }
    if (!Number.isInteger(p.woundsTaken) || p.woundsTaken < 0 || p.woundsTaken > p.maxHp) {
      fail('PLAYER', 'WOUNDS_OUT_OF_BOUNDS', `integer in [0, ${p.maxHp}]`, p.woundsTaken, `${pid} woundsTaken=${p.woundsTaken} out of [0, ${p.maxHp}]`);
    }
    if (p.hp + p.woundsTaken !== p.maxHp) {
      fail('PLAYER', 'HP_WOUNDS_SUM_MISMATCH', p.maxHp, p.hp + p.woundsTaken, `${pid} hp(${p.hp}) + woundsTaken(${p.woundsTaken}) != maxHp(${p.maxHp})`);
    }
    if (p.maxHp !== design.maxHp) {
      fail('PLAYER', 'CATALOG_MAX_HP_MISMATCH', design.maxHp, p.maxHp, `${pid} (${p.roleId}) maxHp != catalog ${design.maxHp}`);
    }

    // Legal board location
    if (!VALID_LOCATION_SET.has(p.location)) {
      fail('PLAYER', 'ILLEGAL_LOCATION', 'valid BoardGameLocationId', p.location, `${pid} at illegal location ${p.location}`);
    }

    // Lifecycle consistency
    const lc = getPlayerLifecycleState(state, p);
    if (lc === 'ALIVE' || lc === 'REVIVED') {
      if (!p.alive || p.hp <= 0) {
        fail('PLAYER', 'ALIVE_LIFECYCLE_CONTRADICTION', 'alive=true && hp>0', { alive: p.alive, hp: p.hp, lc }, `${pid} lifecycle=${lc} contradicts alive=${p.alive} hp=${p.hp}`);
      }
    } else if (lc === 'DORMANT_PENDING_REVIVE') {
      if (!isExpanded) {
        fail('PLAYER', 'CLASSIC_DORMANT_ILLEGAL', 'no dormancy in classic', lc, `${pid} entered dormancy in classic`);
      }
      if (p.alive !== false || p.hp !== 0 || p.revealed !== true) {
        fail('PLAYER', 'DORMANT_STATE_CONTRADICTION', { alive: false, hp: 0, revealed: true }, { alive: p.alive, hp: p.hp, revealed: p.revealed }, `${pid} dormant state inconsistent`);
      }
    } else if (lc === 'FINAL_ELIMINATED') {
      if (p.alive !== false || p.hp !== 0 || p.revealed !== true) {
        fail('PLAYER', 'ELIMINATED_STATE_CONTRADICTION', { alive: false, hp: 0, revealed: true }, { alive: p.alive, hp: p.hp, revealed: p.revealed }, `${pid} final-eliminated state inconsistent`);
      }
      if (p.hand.length !== 0) {
        fail('PLAYER', 'DEAD_PLAYER_HOLDS_HAND', 0, p.hand.length, `Final-eliminated ${pid} still holds hand cards: ${p.hand.join(',')}`);
      }
      if (p.equipped.length !== 0) {
        fail('PLAYER', 'DEAD_PLAYER_HOLDS_EQUIPMENT', 0, p.equipped.length, `Final-eliminated ${pid} still holds equipment: ${p.equipped.join(',')}`);
      }
    }

    // Effective faction authorization (only bonnie_shadow_succession may change effectiveFaction)
    const effFac = getEffectiveFaction(state, p);
    if (effFac !== p.faction) {
      const rec = state.expansionState?.effectiveFactionByPlayer?.[pid];
      if (!rec || rec.reason !== 'bonnie_shadow_succession' || effFac !== 'mist-order') {
        fail('PLAYER', 'UNAUTHORIZED_FACTION_CHANGE', p.faction, { effFac, rec }, `${pid} effectiveFaction changed without authorized Bonnie succession`);
      }
    }

    // Equipped card legality
    for (const eqId of p.equipped) {
      const def = getCardById(eqId);
      if (!def || def.deck === 'investigation' || def.isConsumable) {
        fail('CARDS', 'ILLEGAL_EQUIPPED_CARD', 'non-consumable equipment', eqId, `${pid} has non-equipment card ${eqId} equipped`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // 2. TURN STATE INVARIANTS
  // -------------------------------------------------------------------------
  if (!VALID_TURN_PHASES.has(state.turnPhase)) {
    fail('TURN', 'INVALID_TURN_PHASE', 'valid turnPhase', state.turnPhase, `Unknown turnPhase ${state.turnPhase}`);
  }
  if (state.finished) {
    if (state.turnPhase !== 'ENDED') {
      fail('TURN', 'FINISHED_WRONG_PHASE', 'ENDED', state.turnPhase, 'Finished match must be in ENDED phase');
    }
    if (state.activePlayerId !== null) {
      fail('TURN', 'FINISHED_HAS_ACTIVE_PLAYER', null, state.activePlayerId, 'Finished match must have activePlayerId=null');
    }
    if (state.pendingChoice) {
      fail('TURN', 'FINISHED_HAS_PENDING_CHOICE', null, state.pendingChoice.choiceId, 'Finished match cannot retain active pendingChoice');
    }
    if (state.expansionState?.pendingSteps?.length) {
      fail('TURN', 'FINISHED_HAS_PENDING_STEPS', 0, state.expansionState.pendingSteps.length, 'Finished match cannot retain pendingSteps');
    }
    if (state.expansionState?.activeTurnControl) {
      fail('TURN', 'FINISHED_HAS_ACTIVE_TURN_CONTROL', null, state.expansionState.activeTurnControl.controlGrantId, 'Finished match cannot retain activeTurnControl');
    }
  } else {
    if (state.turnPhase === 'ENDED') {
      fail('TURN', 'UNFINISHED_ENDED_PHASE', 'non-ENDED', state.turnPhase, 'Unfinished match is in ENDED phase');
    }
    if (!state.activePlayerId || !state.players[state.activePlayerId]) {
      fail('TURN', 'MISSING_ACTIVE_PLAYER', 'valid playerId', state.activePlayerId, 'Active match has invalid activePlayerId');
    } else if (!state.pendingChoice && (!state.expansionState?.pendingSteps?.length)) {
      // Between settled actions (no pending choice/steps), activePlayer must be alive & non-dormant
      const ap = state.players[state.activePlayerId];
      if (!ap.alive || isPlayerDormantPendingRevive(state, ap)) {
        fail('TURN', 'DEAD_OR_DORMANT_ACTIVE_PLAYER', 'alive non-dormant activePlayer', { pid: ap.playerId, alive: ap.alive, lc: getPlayerLifecycleState(state, ap) }, 'Settled activePlayer is dead or dormant');
      }
    }
  }

  // TurnControlGrant validation
  const rawGrant = state.expansionState?.activeTurnControl;
  if (rawGrant) {
    if (rawGrant.status !== 'ACTIVE') {
      fail('TURN', 'NON_ACTIVE_GRANT_IN_SLOT', 'ACTIVE', rawGrant.status, 'activeTurnControl has non-ACTIVE status');
    }
    if (rawGrant.activePlayerId !== state.activePlayerId || rawGrant.activeOnTurnNumber !== state.turnNumber) {
      fail('TURN', 'STALE_ACTIVE_TURN_CONTROL', { activePlayerId: state.activePlayerId, turnNumber: state.turnNumber }, { activePlayerId: rawGrant.activePlayerId, activeOnTurnNumber: rawGrant.activeOnTurnNumber }, 'activeTurnControl does not match current turn');
    }
    if (state.expansionState?.expiredControlGrantIds?.includes(rawGrant.controlGrantId)) {
      fail('TURN', 'REPLAYED_EXPIRED_GRANT', 'not in expiredControlGrantIds', rawGrant.controlGrantId, 'Active control grant is already marked expired');
    }
    for (const cid of rawGrant.publicDrawnCardIds || []) {
      const def = getCardById(cid);
      if (!def || def.deck === 'investigation' || cid.startsWith('inv-')) {
        fail('PRIVACY', 'VOODOO_PUBLIC_DRAWN_INV_LEAK', 'non-investigation card', cid, `Investigation card ${cid} leaked into Voodoo publicDrawnCardIds`);
      }
    }
    const controller = state.players[rawGrant.controllerPlayerId];
    const victim = state.players[rawGrant.actingPawnPlayerId];
    if (!controller || !controller.alive || isPlayerDormantPendingRevive(state, controller)) {
      fail('TURN', 'INVALID_VOODOO_CONTROLLER', 'alive non-dormant controller', rawGrant.controllerPlayerId, 'Active Voodoo controller is dead/dormant');
    }
    if (!victim || !victim.alive || isPlayerDormantPendingRevive(state, victim)) {
      fail('TURN', 'INVALID_VOODOO_VICTIM', 'alive non-dormant victim', rawGrant.actingPawnPlayerId, 'Active Voodoo victim is dead/dormant');
    }
  }

  // PendingChoice validation
  if (state.pendingChoice) {
    const pc = state.pendingChoice;
    if (!state.players[pc.ownerPlayerId]) {
      fail('TURN', 'PENDING_CHOICE_INVALID_OWNER', 'valid playerId', pc.ownerPlayerId, 'PendingChoice owner does not exist');
    }
    if (!Array.isArray(pc.options) || pc.options.length === 0) {
      fail('TURN', 'PENDING_CHOICE_NO_OPTIONS', '>=1 options', pc.options?.length ?? 0, 'PendingChoice has no options');
    } else if (!pc.options.some((o) => o.optionId === pc.defaultOptionId)) {
      fail('TURN', 'PENDING_CHOICE_BAD_DEFAULT', 'defaultOptionId in options', pc.defaultOptionId, `PendingChoice defaultOptionId ${pc.defaultOptionId} not in options`);
    }
    if (state.expansionState?.resolvedChoiceIds?.includes(pc.choiceId)) {
      fail('TURN', 'PENDING_CHOICE_ALREADY_RESOLVED', 'unresolved choiceId', pc.choiceId, `Active PendingChoice ${pc.choiceId} is already in resolvedChoiceIds`);
    }
  }

  // -------------------------------------------------------------------------
  // 3. CARDS & EQUIPMENT CONSERVATION INVARIANTS
  // -------------------------------------------------------------------------
  if (checkCardConservation) {
    const { counts, total } = collectAllCardInstances(state);
    if (total !== EXPECTED_TOTAL_CARDS) {
      fail('CARDS', 'CARD_TOTAL_CONSERVATION', EXPECTED_TOTAL_CARDS, total, `Card conservation violated: expected ${EXPECTED_TOTAL_CARDS} total cards, found ${total}`);
    }
    for (const [cid, expectedQty] of Object.entries(EXPECTED_CARD_COPIES)) {
      const actualQty = counts[cid] || 0;
      if (actualQty !== expectedQty) {
        fail('CARDS', 'CARD_COPY_CONSERVATION', { cardId: cid, copies: expectedQty }, { cardId: cid, copies: actualQty }, `Card ${cid} count mismatch: expected ${expectedQty}, found ${actualQty}`);
        break;
      }
    }
    for (const cid of Object.keys(counts)) {
      if (!(cid in EXPECTED_CARD_COPIES)) {
        fail('CARDS', 'UNKNOWN_CARD_INSTANCE', 'known cardId', cid, `Unknown cardId ${cid} found in state`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // 4. VICTORY INVARIANTS
  // -------------------------------------------------------------------------
  if (state.finished) {
    const uniqueWinners = new Set(state.winnerPlayerIds || []);
    if (uniqueWinners.size !== (state.winnerPlayerIds || []).length) {
      fail('VICTORY', 'DUPLICATE_WINNERS', uniqueWinners.size, state.winnerPlayerIds.length, 'Duplicate playerId in winnerPlayerIds');
    }
    for (const wid of uniqueWinners) {
      if (!state.players[wid]) {
        fail('VICTORY', 'UNKNOWN_WINNER_ID', 'existing playerId', wid, `Unknown winnerPlayerId ${wid}`);
      }
    }
    if (!Array.isArray(state.finalReveal) || state.finalReveal.length !== turnOrder.length) {
      fail('VICTORY', 'FINAL_REVEAL_INCOMPLETE', turnOrder.length, state.finalReveal?.length ?? 0, 'finalReveal missing players');
    }
    if (state.winnerFaction === 'multi-faction') {
      if (!Array.isArray(state.winningFactions) || state.winningFactions.length < 2) {
        fail('VICTORY', 'MULTI_FACTION_MISSING_LIST', '>=2 winningFactions', state.winningFactions, 'multi-faction victory must list >=2 winningFactions');
      }
    }
    // Hunter extinction check must never trigger while a Shadow is DORMANT_PENDING_REVIVE
    if (state.winnerFaction === 'lantern-guard' && state.winReason && state.winReason.includes('Toàn bộ Hội Bóng Đêm')) {
      const dormantShadows = Object.values(state.players).filter(
        (p) => getEffectiveFaction(state, p) === 'mist-order' && isPlayerDormantPendingRevive(state, p),
      );
      if (dormantShadows.length > 0) {
        fail('VICTORY', 'HUNTER_WIN_WHILE_SHADOW_DORMANT', 0, dormantShadows.map((p) => p.playerId), 'Hunters won by Shadow extinction while a Shadow is DORMANT_PENDING_REVIVE');
      }
    }
  }

  // -------------------------------------------------------------------------
  // 5. PRIVACY, PROJECTION & SERIALIZATION INVARIANTS
  // -------------------------------------------------------------------------
  if (checkProjections) {
    const pub = getPublicGameView(state);
    if (!state.finished) {
      for (const pp of pub.players) {
        const auth = state.players[pp.playerId];
        if (!auth.revealed) {
          if (pp.revealedRoleId !== null || pp.revealedFaction !== null || pp.revealedMaxHp !== null) {
            fail('PRIVACY', 'HIDDEN_ROLE_LEAKED_IN_PUBLIC_VIEW', null, { playerId: pp.playerId, revealedRoleId: pp.revealedRoleId }, `Hidden player ${pp.playerId} leaked role in publicGame`);
          }
          if (pp.effectiveFaction !== undefined || pp.copiedSkillRoleId !== undefined || pp.allianceId !== undefined) {
            fail('PRIVACY', 'HIDDEN_META_LEAKED_IN_PUBLIC_VIEW', undefined, { playerId: pp.playerId, effectiveFaction: pp.effectiveFaction, copiedSkillRoleId: pp.copiedSkillRoleId, allianceId: pp.allianceId }, `Hidden player ${pp.playerId} leaked expanded metadata`);
          }
        }
      }
      if (pub.finalReveal !== null) {
        fail('PRIVACY', 'FINAL_REVEAL_BEFORE_FINISH', null, 'non-null', 'finalReveal exposed before match finished');
      }
      if (pub.pendingChoice && pub.pendingChoice.isSecret) {
        if (pub.pendingChoice.ownerPlayerId !== null || pub.pendingChoice.kind !== null) {
          fail('PRIVACY', 'SECRET_CHOICE_LEAKED_IN_PUBLIC_VIEW', { ownerPlayerId: null, kind: null }, { ownerPlayerId: pub.pendingChoice.ownerPlayerId, kind: pub.pendingChoice.kind }, 'Secret pending choice leaked owner or kind');
        }
        if (!pub.pendingChoice.choiceId.startsWith('choice-secret')) {
          fail('PRIVACY', 'SECRET_CHOICE_NON_OPAQUE_ID', 'choice-secret-*', pub.pendingChoice.choiceId, 'Secret pending choice ID is not opaque');
        }
      }
      if (pub.controlledTurn) {
        for (const c of pub.controlledTurn.publicDrawnCards || []) {
          if (c.deck === 'investigation' || String(c.id).startsWith('inv-')) {
            fail('PRIVACY', 'VOODOO_CONTROLLED_TURN_INV_LEAK', 'non-investigation', c.id, 'Investigation card leaked into public controlledTurn');
          }
        }
      }
      if (pub.lastInvestigation && pub.lastInvestigation.cardId !== 'inv-00') {
        fail('PRIVACY', 'INVESTIGATION_CARD_ID_LEAKED', 'inv-00', pub.lastInvestigation.cardId, 'Real investigation cardId leaked in lastInvestigation');
      }
      // Verify Angel public aura badge never falsely marks non-Neutral (e.g., Shadow-converted Bonnie)
      if (Array.isArray(pub.angelProtectedPlayerIds)) {
        for (const pid of pub.angelProtectedPlayerIds) {
          const auth = state.players[pid];
          if (!auth || !auth.revealed || getEffectiveFaction(state, auth) !== 'wanderer') {
            fail('PRIVACY', 'ANGEL_AURA_PROJECTION_MISMATCH', 'revealed effective wanderer', { pid, effFaction: auth ? getEffectiveFaction(state, auth) : null }, `angelProtectedPlayerIds contains non-effective-wanderer ${pid}`);
          }
        }
      }
      // Phase 8C: Verify public structured visualEvents stay bounded, monotonic, and NEVER leak hidden identities!
      if (Array.isArray(pub.visualEvents)) {
        if (pub.visualEvents.length > 48) {
          fail('PRIVACY', 'VISUAL_EVENTS_UNBOUNDED', '<= 48', pub.visualEvents.length, 'publicGame.visualEvents exceeded max bound 48');
        }
        let prevSeq = 0;
        for (const ve of pub.visualEvents) {
          if (ve.visibility !== 'public') {
            fail('PRIVACY', 'VISUAL_EVENT_NON_PUBLIC', 'public', ve.visibility, `VisualEvent ${ve.id} has non-public visibility`);
          }
          if (typeof ve.seq !== 'number' || ve.seq <= prevSeq) {
            fail('PRIVACY', 'VISUAL_EVENT_SEQ_NON_MONOTONIC', `>${prevSeq}`, ve.seq, `VisualEvent ${ve.id} seq not strictly increasing`);
          }
          prevSeq = ve.seq;
          if (ve.actorPlayerId && ve.kind !== 'MATCH_FINISHED') {
            const authActor = state.players[ve.actorPlayerId];
            if (authActor && !authActor.revealed) {
              if (ve.publicRoleId !== undefined || ve.publicFaction !== undefined || ve.publicCopiedRoleId !== undefined) {
                fail('PRIVACY', 'VISUAL_EVENT_HIDDEN_ROLE_LEAK', 'undefined', { id: ve.id, publicRoleId: ve.publicRoleId, publicFaction: ve.publicFaction }, `VisualEvent ${ve.id} leaked hidden role/faction for unrevealed actor ${ve.actorPlayerId}`);
              }
            }
          }
        }
      }
    }

    // Verify privateView isolation across players (including Voodoo controller vs victim!)
    const activeGrant = getActiveTurnControlGrant(state);
    for (const pid of turnOrder) {
      const priv = getPrivateGameView(state, pid);
      if (!priv || priv.playerId !== pid) {
        fail('PRIVACY', 'PRIVATE_VIEW_WRONG_OWNER', pid, priv?.playerId ?? null, `Private view for ${pid} returned wrong owner`);
        continue;
      }
      if (priv.pendingChoice && state.pendingChoice && state.pendingChoice.ownerPlayerId !== pid) {
        fail('PRIVACY', 'PENDING_CHOICE_LEAKED_TO_NON_OWNER', null, priv.pendingChoice.choiceId, `PendingChoice of ${state.pendingChoice.ownerPlayerId} leaked to ${pid}`);
      }
      if (activeGrant && pid === activeGrant.controllerPlayerId) {
        const victim = state.players[activeGrant.activePlayerId];
        if (victim && !victim.revealed) {
          const privJson = JSON.stringify(priv);
          // Controller must never receive victim's private clues or secret choice
          if (priv.pendingChoice && state.pendingChoice?.ownerPlayerId === victim.playerId) {
            fail('PRIVACY', 'VOODOO_SAW_VICTIM_CHOICE', null, priv.pendingChoice.choiceId, 'Voodoo controller received victim pendingChoice');
          }
          for (const clue of victim.privateClues || []) {
            if (clue.id && privJson.includes(clue.id)) {
              fail('PRIVACY', 'VOODOO_SAW_VICTIM_CLUE', 'absent', clue.id, 'Voodoo controller received victim private clue');
            }
          }
        }
      }
    }
  }

  if (checkSerialization) {
    const serialized = JSON.stringify(state);
    const restored = JSON.parse(serialized);
    const pubBefore = JSON.stringify(getPublicGameView(state));
    const pubAfter = JSON.stringify(getPublicGameView(restored));
    if (pubBefore !== pubAfter) {
      fail('PERSISTENCE', 'SERIALIZATION_PUBLIC_DRIFT', 'identical public projection', 'mismatch', 'JSON round-trip altered getPublicGameView output');
    }
  }

  return { ok: violations.length === 0, violations };
}

module.exports = {
  EXPECTED_CARD_COPIES,
  EXPECTED_TOTAL_CARDS,
  captureInitialIdentitySnapshot,
  collectAllCardInstances,
  checkGameStateInvariants,
};
