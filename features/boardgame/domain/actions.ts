// ---------------------------------------------------------------------------
// features/boardgame/domain/actions.ts — Điều phối hành động chuẩn Shadow Hunters
// (`ROLL_MOVE -> CHOOSE_MOVE? -> LOCATION_ACTION -> MAIN_ACTION`) & lượt đi phụ / Bách chém bồi.
// ---------------------------------------------------------------------------

import type { BoardGameActionPayload } from '../../../shared/contracts/boardgame';
import { getEffectiveFaction, getPlayerAlliance } from './dynamic-allegiance';
import {
  getCopiedSkillBinding,
  getEffectiveSkillRoleId,
  tickEffectiveSkillCooldown,
} from './dynamic-skill-copy';
import {
  appendHighlight,
  appendPublicLog,
  discardCardId,
  resolveAttack,
  resolveChooseDestination,
  resolveDiceRollMove,
  resolveDrawLocationCard,
  resolveEquipCard,
  resolveInvestigateCard,
  resolveLocationPower,
  resolveRevealRole,
  resolveSkipLocation,
  resolveUseCard,
  resolveUseSkill,
} from './effects';
import {
  applyExpandedDiceRollMove,
  applyExpandedDrawLocationCard,
  applyExpandedInvestigateCard,
  applyExpandedLocationPower,
  applyExpandedRevealRole,
  applyExpandedTransferToBethany,
  applyExpandedTurnEndHooks,
  applyExpandedUseCard,
  applyExpandedUseSkill,
  canExpandedPlayerAttackTarget,
  clearPendingChoiceOnForcedAutoTurn,
  deliverNextGloriaQueuedCard,
  discardGloriaQueuedCards,
  hasGloriaQueuedCards,
  isExpandedRuleset,
  listExpandedReachableAttackTargets,
  resolveExpiredPendingChoice,
  resolvePendingChoice,
  setPlayerReactionPolicy,
  startExpandedAttack,
  triggerExpandedTurnStart,
  type TurnContinuationCallbacks,
} from './expansion-skills';
import {
  isPlayerDormantPendingRevive,
  isPlayerTurnEligible,
  reviveDormantPlayerAtTurnStart,
} from './pending-resurrection';
import {
  canPlayerAttackTarget,
  listReachableAttackTargets,
  LOCATIONS_CATALOG,
  nextRandomInt,
} from './rules';
import {
  activateScheduledTurnControlForTurn,
  expireActiveTurnControl,
  getActiveTurnControlGrant,
  recordPublicCardDrawnDuringControlledTurn,
  resolveTurnCommandAuthority,
  syncControlledTurnPublicDrawnCards,
} from './turn-ownership';
import type {
  AuthoritativeGameState,
  AuthoritativePlayerState,
  EngineActionResult,
} from './types';
import { buildFinalRevealSummary } from './victory';
import { evaluateVictoryWithEngine } from './victory-engine';
import { appendStructuredVisualEvent } from './visual-events';

export function getActivePlayer(
  state: AuthoritativeGameState,
): AuthoritativePlayerState | null {
  if (!state.activePlayerId) return null;
  return state.players[state.activePlayerId] ?? null;
}

function finalizeIfFinished(state: AuthoritativeGameState, nowMs: number): boolean {
  const victory = evaluateVictoryWithEngine(state);
  if (!victory.finished) return false;

  state.finished = true;
  state.turnPhase = 'ENDED';
  state.activePlayerId = null;
  state.allowedMoveDestinations = undefined;
  state.pendingChoice = null;
  if (state.expansionState) {
    state.expansionState.pendingSteps = [];
    state.expansionState.pendingDeclaredAttack = null;
    expireActiveTurnControl(state, 'match-finished', nowMs);
    if (victory.winningFactions && victory.winningFactions.length >= 2) {
      state.expansionState.stats.multiFactionVictoriesCount =
        (state.expansionState.stats.multiFactionVictoriesCount ?? 0) + 1;
    }
  }
  state.extraTurnPending = false;
  state.winnerFaction = victory.winnerFaction;
  if (isExpandedRuleset(state) && victory.winningFactions && victory.winningFactions.length > 0) {
    state.winningFactions = [...victory.winningFactions];
  } else {
    state.winningFactions = undefined;
  }
  state.winnerLabel = victory.winnerLabel;
  state.winnerPlayerIds = [...victory.winnerPlayerIds];
  state.winReason = victory.winReason;
  const baseFinalReveal = buildFinalRevealSummary(state, victory.winnerPlayerIds);
  if (isExpandedRuleset(state)) {
    state.finalReveal = baseFinalReveal.map((rec) => {
      const p = state.players[rec.playerId];
      if (!p) return rec;
      const eff = getEffectiveFaction(state, p);
      const copied = getCopiedSkillBinding(state, p.playerId);
      const alliance = getPlayerAlliance(state, p.playerId);
      return {
        ...rec,
        ...(eff !== p.faction ? { effectiveFaction: eff } : {}),
        ...(copied ? { copiedSkillRoleId: copied.effectiveSkillRoleId } : {}),
        ...(alliance ? { allianceId: alliance.allianceId } : {}),
      };
    });
  } else {
    state.finalReveal = baseFinalReveal;
  }

  appendPublicLog(
    state,
    'victory',
    `🏁 Trận đấu kết thúc! ${victory.winnerLabel ?? 'Hòa'}: ${victory.winReason ?? ''}`,
    nowMs,
  );
  appendHighlight(
    state,
    `Kết quả: ${victory.winnerLabel ?? 'Hòa'}`,
    victory.winReason ?? 'Cuộc săn đêm KTX khép lại.',
    nowMs,
  );
  appendStructuredVisualEvent(state, {
    kind: 'MATCH_FINISHED',
    effectKey:
      victory.winningFactions && victory.winningFactions.length >= 2
        ? 'multi_faction_victory'
        : victory.winnerFaction === 'wanderer-solo'
          ? 'wanderer_solo_victory'
          : 'faction_victory',
    actorPlayerId: victory.winnerPlayerIds[0] ?? null,
    targetPlayerIds: victory.winnerPlayerIds,
    atMs: nowMs,
    winningFactions: victory.winningFactions,
    label: victory.winnerLabel ?? undefined,
  });
  return true;
}

export function advanceTurn(state: AuthoritativeGameState, nowMs: number): void {
  if (state.finished) return;
  const order = state.turnOrder;
  if (order.length === 0) return;

  const expanded = isExpandedRuleset(state);
  if (expanded) {
    // Kết thúc dứt điểm mọi grant chiếm quyền điều khiển lượt trước khi chuyển lượt mới
    const endingGrant = getActiveTurnControlGrant(state);
    expireActiveTurnControl(state, 'turn-completed', nowMs);
    if (endingGrant) {
      appendStructuredVisualEvent(state, {
        kind: 'TURN_HIJACK_ENDED',
        effectKey: 'voodoo_hijack_end',
        actorPlayerId: endingGrant.controllerPlayerId,
        targetPlayerIds: [endingGrant.activePlayerId],
        atMs: nowMs,
      });
    }
  }

  // Lượt đi phụ từ Sổ Tay Bí Truyền (eq-15 / Concealed Knowledge)
  if (state.extraTurnPending && state.activePlayerId) {
    const current = state.players[state.activePlayerId];
    state.extraTurnPending = false;
    if (current && current.alive && (!expanded || !isPlayerDormantPendingRevive(state, current))) {
      current.guardianShieldActive = false;
      current.consecutiveSameZoneRolls = 0;
      current.attacksThisTurn = 0;
      current.lastAttackTargetId = null;
      state.allowedMoveDestinations = undefined;
      state.turnNumber += 1;
      state.turnPhase = 'ROLL_MOVE';
      appendPublicLog(
        state,
        'system',
        `📘 Sổ Tay Bí Truyền: ${current.displayName} bắt đầu lượt đi phụ!`,
        nowMs,
        current.playerId,
      );
      if (!finalizeIfFinished(state, nowMs) && expanded) {
        triggerExpandedTurnStart(state, current, nowMs, TURN_CONTINUATION_CALLBACKS);
      }
      return;
    }
  }

  const currentIdx = state.activePlayerId ? order.indexOf(state.activePlayerId) : -1;
  let nextPlayer: AuthoritativePlayerState | null = null;
  let wrappedRound = false;

  for (let offset = 1; offset <= order.length; offset++) {
    const rawIdx = currentIdx + offset;
    const wrappedIdx = ((rawIdx % order.length) + order.length) % order.length;
    if (currentIdx >= 0 && rawIdx >= order.length) {
      wrappedRound = true;
    }
    const candidate = state.players[order[wrappedIdx]];
    const eligible = expanded
      ? isPlayerTurnEligible(state, candidate)
      : Boolean(candidate && candidate.alive);
    if (candidate && eligible) {
      nextPlayer = candidate;
      break;
    }
  }

  if (!nextPlayer) {
    finalizeIfFinished(state, nowMs);
    return;
  }

  if (wrappedRound) {
    state.round += 1;
  }

  if (nextPlayer.skillCooldown > 0) {
    nextPlayer.skillCooldown = Math.max(0, nextPlayer.skillCooldown - 1);
  }
  if (expanded) {
    tickEffectiveSkillCooldown(state, nextPlayer);
  }
  nextPlayer.guardianShieldActive = false;
  nextPlayer.consecutiveSameZoneRolls = 0;
  nextPlayer.attacksThisTurn = 0;
  nextPlayer.lastAttackTargetId = null;

  state.allowedMoveDestinations = undefined;
  state.turnNumber += 1;
  state.activePlayerId = nextPlayer.playerId;
  state.turnPhase = 'ROLL_MOVE';

  // Phase 7A PendingResurrection: Hồi sinh Undead (hoặc người sao chép Undead) ngay đầu lượt kế tiếp!
  if (expanded && isPlayerDormantPendingRevive(state, nextPlayer)) {
    const rev = reviveDormantPlayerAtTurnStart(state, nextPlayer, nowMs);
    if (rev.revived) {
      if (state.expansionState) {
        state.expansionState.stats.resurrectionsTriggered =
          (state.expansionState.stats.resurrectionsTriggered ?? 0) + 1;
      }
      appendPublicLog(
        state,
        'skill',
        `🧟 Xác Sống Trỗi Dậy: ${nextPlayer.displayName} hồi sinh ngay đầu lượt với ${rev.restoredHp} HP (${nextPlayer.woundsTaken} thương tích) và tiếp tục lượt chơi!`,
        nowMs,
        nextPlayer.playerId,
      );
      appendHighlight(
        state,
        `Hồi sinh: ${nextPlayer.displayName}`,
        `${nextPlayer.displayName} trỗi dậy với ${rev.restoredHp} HP ở đầu vòng ${state.round}.`,
        nowMs,
      );
      appendStructuredVisualEvent(state, {
        kind: 'PLAYER_REVIVED',
        effectKey: 'undead_revive',
        actorPlayerId: nextPlayer.playerId,
        targetPlayerIds: [nextPlayer.playerId],
        atMs: nowMs,
        publicRoleId: nextPlayer.roleId,
        publicFaction: getEffectiveFaction(state, nextPlayer),
        amount: rev.restoredHp,
        label: `HỒI SINH +${rev.restoredHp}`,
      });
    }
  }

  // Phase 7A TurnOwnershipOverride: Kích hoạt grant Con Rối (Voodoo) đã xếp lịch cho lượt này
  if (expanded) {
    const activatedGrant = activateScheduledTurnControlForTurn(state, nextPlayer.playerId, nowMs);
    if (activatedGrant) {
      const controller = state.players[activatedGrant.controllerPlayerId];
      if (state.expansionState) {
        state.expansionState.stats.hijackedTurnsCount =
          (state.expansionState.stats.hijackedTurnsCount ?? 0) + 1;
      }
      appendPublicLog(
        state,
        'skill',
        `🎭 Con Rối: ${controller?.displayName ?? activatedGrant.controllerPlayerId} tạm thời điều khiển các hành động công khai trong lượt của ${nextPlayer.displayName} (không truy cập thông tin bí mật hay kỹ năng nhân vật).`,
        nowMs,
        activatedGrant.controllerPlayerId,
      );
      appendStructuredVisualEvent(state, {
        kind: 'TURN_HIJACK_STARTED',
        effectKey: 'voodoo_hijack_start',
        actorPlayerId: activatedGrant.controllerPlayerId,
        targetPlayerIds: [nextPlayer.playerId],
        atMs: nowMs,
        publicRoleId: controller?.revealed ? controller.roleId : null,
        label: 'CON RỐI',
      });
    }
  }

  if (!finalizeIfFinished(state, nowMs) && expanded) {
    triggerExpandedTurnStart(state, nextPlayer, nowMs, TURN_CONTINUATION_CALLBACKS);
  }
}

function canTriggerCharlesBloodyFeast(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
): boolean {
  const lastTarget = actor.lastAttackTargetId ? state.players[actor.lastAttackTargetId] : null;
  const targetReachable =
    lastTarget &&
    (isExpandedRuleset(state)
      ? canExpandedPlayerAttackTarget(state, actor, lastTarget)
      : canPlayerAttackTarget(state, actor, lastTarget));
  const effRoleId = isExpandedRuleset(state) ? getEffectiveSkillRoleId(state, actor) : actor.roleId;
  return Boolean(
    actor.alive &&
      actor.revealed &&
      effRoleId === 'lang-cuu-ho' &&
      actor.attacksThisTurn >= 1 &&
      actor.hp > 2 &&
      actor.hand.length === 0 &&
      lastTarget &&
      lastTarget.alive &&
      targetReachable,
  );
}

const TURN_CONTINUATION_CALLBACKS: TurnContinuationCallbacks = {
  finalizeIfFinished,
  advanceTurn,
  canTriggerCharlesBloodyFeast,
};

export function applyPendingChoiceTimeout(
  state: AuthoritativeGameState,
  nowMs: number,
): boolean {
  if (state.finished || state.turnPhase === 'ENDED' || !state.pendingChoice) {
    return false;
  }
  const resolved = resolveExpiredPendingChoice(state, nowMs, TURN_CONTINUATION_CALLBACKS);
  if (resolved && isExpandedRuleset(state) && getActiveTurnControlGrant(state)) {
    syncControlledTurnPublicDrawnCards(state);
  }
  return resolved;
}

export function applyPlayerGameAction(
  state: AuthoritativeGameState,
  playerId: string,
  action: BoardGameActionPayload,
  nowMs: number,
): EngineActionResult {
  if (state.finished || state.turnPhase === 'ENDED') {
    return { ok: false, error: 'Trận đấu đã kết thúc.', reason: 'Trận đấu đã kết thúc.' };
  }
  const sender = state.players[playerId];
  if (!sender || !sender.alive || isPlayerDormantPendingRevive(state, sender)) {
    return {
      ok: false,
      error: 'Bạn không thể hành động khi đã bị loại hoặc đang chờ hồi sinh.',
      reason: 'Bạn không thể hành động khi đã bị loại hoặc đang chờ hồi sinh.',
    };
  }

  // CAP-05: Cập nhật chính sách phản ứng riêng tư (`SET_REACTION_PREF`) hợp lệ ngoài lượt & kể cả khi đang mở choice!
  if (action.type === 'SET_REACTION_PREF') {
    const res = setPlayerReactionPolicy(state, playerId, action.policy);
    if (!res.ok) {
      const msg = res.reason ?? res.error ?? 'Không thể cập nhật chính sách phản ứng.';
      return { ok: false, error: msg, reason: msg };
    }
    return { ok: true };
  }

  // Khi đang có Pending Choice (trong lượt hoặc phản ứng bí mật ngoài lượt):
  // CHỈ cho phép chủ sở hữu choice gửi đúng `RESOLVE_CHOICE`, chặn mọi hành động khác!
  if (state.pendingChoice) {
    if (action.type !== 'RESOLVE_CHOICE') {
      const msg = 'Đang chờ hoàn tất lựa chọn hiện tại trước khi tiếp tục.';
      return { ok: false, error: msg, reason: msg };
    }
    const res = resolvePendingChoice(
      state,
      playerId,
      action.choiceId,
      action.optionId,
      nowMs,
      TURN_CONTINUATION_CALLBACKS,
    );
    if (!res.ok) {
      const msg = res.reason ?? res.error ?? 'Lựa chọn không hợp lệ.';
      return { ok: false, error: msg, reason: msg };
    }
    if (isExpandedRuleset(state) && getActiveTurnControlGrant(state)) {
      syncControlledTurnPublicDrawnCards(state);
    }
    return { ok: true };
  }

  if (action.type === 'RESOLVE_CHOICE') {
    const res = resolvePendingChoice(
      state,
      playerId,
      action.choiceId,
      action.optionId,
      nowMs,
      TURN_CONTINUATION_CALLBACKS,
    );
    const msg = res.reason ?? res.error ?? 'Hiện không có lựa chọn nào đang chờ xử lý.';
    return { ok: false, error: msg, reason: msg };
  }

  const expanded = isExpandedRuleset(state);
  const authority = resolveTurnCommandAuthority(state, playerId, action);
  if (!authority.authorized || !authority.actingPawnPlayerId) {
    if (
      expanded &&
      state.expansionState &&
      (authority.code === 'PROHIBITED_CONTROLLER_ACTION' ||
        authority.code === 'CONTROLLED_BY_OTHER' ||
        authority.code === 'CONTROL_GRANT_EXPIRED')
    ) {
      state.expansionState.stats.unauthorizedControlAttempts =
        (state.expansionState.stats.unauthorizedControlAttempts ?? 0) + 1;
    }
    const msg = authority.reason ?? 'Chưa tới lượt của bạn.';
    return { ok: false, error: msg, reason: msg };
  }

  const actor = state.players[authority.actingPawnPlayerId];
  if (!actor || !actor.alive || isPlayerDormantPendingRevive(state, actor)) {
    return { ok: false, error: 'Chủ lượt không còn khả dụng.', reason: 'Chủ lượt không còn khả dụng.' };
  }
  const handBeforeAction = expanded && authority.viaControlGrantId ? [...actor.hand] : null;
  let result: EngineActionResult;
  let autoEndTurnAfterAction = false;
  let continuationManaged = false;

  switch (action.type) {
    case 'ROLL_DICE':
      if (expanded) {
        result = applyExpandedDiceRollMove(
          state,
          actor,
          nowMs,
          TURN_CONTINUATION_CALLBACKS,
        );
        continuationManaged = true;
      } else {
        result = resolveDiceRollMove(state, actor, nowMs);
      }
      break;
    case 'CHOOSE_DEST':
      result = resolveChooseDestination(state, actor, action.location, nowMs);
      break;
    case 'DRAW_CARD':
      if (expanded) {
        result = applyExpandedDrawLocationCard(
          state,
          actor,
          action.deck,
          nowMs,
          TURN_CONTINUATION_CALLBACKS,
        );
        continuationManaged = true;
      } else {
        result = resolveDrawLocationCard(state, actor, action.deck, nowMs);
      }
      break;
    case 'USE_LOC_POWER':
      if (expanded) {
        result = applyExpandedLocationPower(
          state,
          actor,
          action.targetPlayerId,
          action.mode,
          nowMs,
          TURN_CONTINUATION_CALLBACKS,
          action.equipCardId,
        );
        continuationManaged = true;
      } else {
        result = resolveLocationPower(
          state,
          actor,
          action.targetPlayerId,
          action.mode,
          nowMs,
          action.equipCardId,
        );
      }
      break;
    case 'SKIP_LOC':
      result = resolveSkipLocation(state, actor, nowMs);
      break;
    case 'EQUIP_CARD':
      result = resolveEquipCard(state, actor, action.cardId, nowMs);
      if (result.ok && expanded) {
        deliverNextGloriaQueuedCard(state, actor, nowMs);
      }
      break;
    case 'USE_CARD':
      if (expanded) {
        result = applyExpandedUseCard(
          state,
          actor,
          action.cardId,
          action.targetPlayerId,
          action.targetLocation,
          nowMs,
          TURN_CONTINUATION_CALLBACKS,
          action.equipCardId,
          action.skipEffect,
          Boolean(authority.viaControlGrantId && playerId !== actor.playerId),
        );
        continuationManaged = true;
      } else {
        result = resolveUseCard(
          state,
          actor,
          action.cardId,
          action.targetPlayerId,
          action.targetLocation,
          nowMs,
          action.equipCardId,
          action.skipEffect,
        );
      }
      break;
    case 'INVESTIGATE_CARD':
      if (expanded) {
        result = applyExpandedInvestigateCard(
          state,
          actor,
          action.cardId,
          action.targetPlayerId,
          nowMs,
          TURN_CONTINUATION_CALLBACKS,
        );
        continuationManaged = true;
      } else {
        result = resolveInvestigateCard(state, actor, action.cardId, action.targetPlayerId, nowMs);
      }
      break;
    case 'ATTACK': {
      if (actor.hand.length > 0 || (expanded && hasGloriaQueuedCards(state, actor.playerId))) {
        result = {
          ok: false,
          error: 'Hãy giải quyết hết các lá bài vừa rút trên tay trước khi tấn công.',
        };
        break;
      }
      if (actor.attacksThisTurn >= 1) {
        result = {
          ok: false,
          error: 'Mỗi lượt chỉ tung 1 đòn đánh thường (trừ khi Bách kích hoạt Đòn Đánh Đẫm Máu).',
        };
        break;
      }
      if (expanded) {
        result = startExpandedAttack(
          state,
          actor,
          action.targetPlayerId,
          nowMs,
          TURN_CONTINUATION_CALLBACKS,
        );
        continuationManaged = true;
      } else {
        result = resolveAttack(state, actor, action.targetPlayerId, nowMs);
        if (result.ok) {
          autoEndTurnAfterAction = !canTriggerCharlesBloodyFeast(state, actor);
        }
      }
      break;
    }
    case 'REVEAL_ROLE':
      if (expanded) {
        result = applyExpandedRevealRole(state, actor, nowMs, TURN_CONTINUATION_CALLBACKS);
        continuationManaged = true;
      } else {
        result = resolveRevealRole(state, actor, nowMs);
      }
      break;
    case 'USE_SKILL':
      if (expanded) {
        const expRes = applyExpandedUseSkill(
          state,
          actor,
          action.targetPlayerId,
          nowMs,
          TURN_CONTINUATION_CALLBACKS,
        );
        if (expRes !== null) {
          result = expRes;
          continuationManaged = true;
        } else {
          result = resolveUseSkill(state, actor, action.targetPlayerId, nowMs);
        }
      } else {
        result = resolveUseSkill(state, actor, action.targetPlayerId, nowMs);
        if (result.ok && actor.roleId === 'lang-cuu-ho') {
          autoEndTurnAfterAction = !canTriggerCharlesBloodyFeast(state, actor);
        }
      }
      break;
    case 'TRANSFER_TO_BETHANY':
      if (expanded) {
        result = applyExpandedTransferToBethany(
          state,
          actor,
          action.targetPlayerId,
          action.cardId,
          nowMs,
          TURN_CONTINUATION_CALLBACKS,
        );
        continuationManaged = true;
      } else {
        result = {
          ok: false,
          error: 'Hành động tặng trang bị cho Bethany chỉ khả dụng ở bộ luật mở rộng.',
        };
      }
      break;
    case 'END_TURN':
      if (state.turnPhase === 'ROLL_MOVE' || state.turnPhase === 'CHOOSE_MOVE') {
        return {
          ok: false,
          error: 'Hãy tung xúc xắc và di chuyển sang khu vực kế tiếp trước khi kết thúc lượt.',
        };
      }
      if (actor.hand.length > 0 || (expanded && hasGloriaQueuedCards(state, actor.playerId))) {
        return {
          ok: false,
          error: 'Hãy giải quyết hết các lá bài vừa rút trên tay trước khi kết thúc lượt.',
        };
      }
      if (
        actor.equipped.includes('ev-01') &&
        actor.attacksThisTurn === 0 &&
        (expanded
          ? listExpandedReachableAttackTargets(state, actor).length > 0
          : listReachableAttackTargets(state, actor).length > 0)
      ) {
        return {
          ok: false,
          error: 'Kiếm Gỗ Nguyền Rủa (Masamune): Bạn bắt buộc phải tấn công khi có mục tiêu trong tầm đánh!',
        };
      }
      appendPublicLog(
        state,
        'system',
        `✔️ ${actor.displayName} kết thúc lượt.`,
        nowMs,
        actor.playerId,
      );
      result = { ok: true };
      autoEndTurnAfterAction = true;
      break;
    default:
      result = { ok: false, error: 'Hành động không hợp lệ.' };
  }

  if (!result.ok) {
    const msg = result.reason ?? result.error ?? 'Hành động không hợp lệ ở pha hiện tại.';
    return { ok: false, error: msg, reason: msg };
  }

  // Phase 7A TurnOwnershipOverride: đồng bộ bài Trắng/Đen công khai rút trong lượt bị chiếm quyền & telemetry
  if (expanded && authority.viaControlGrantId) {
    if (playerId !== actor.playerId && state.expansionState) {
      state.expansionState.stats.hijackedActionsCount =
        (state.expansionState.stats.hijackedActionsCount ?? 0) + 1;
    }
    if (handBeforeAction && getActiveTurnControlGrant(state)) {
      for (const cid of actor.hand) {
        if (!handBeforeAction.includes(cid)) {
          recordPublicCardDrawnDuringControlledTurn(state, cid);
        }
      }
      syncControlledTurnPublicDrawnCards(state);
    }
  }

  if (continuationManaged) {
    return { ok: true };
  }

  if (finalizeIfFinished(state, nowMs)) {
    return { ok: true };
  }

  if (autoEndTurnAfterAction || !actor.alive) {
    if (expanded && applyExpandedTurnEndHooks(state, actor, nowMs, TURN_CONTINUATION_CALLBACKS)) {
      return { ok: true };
    }
    advanceTurn(state, nowMs);
  }

  return { ok: true };
}

export function applyTimeoutAutoTurn(
  state: AuthoritativeGameState,
  nowMs: number,
): void {
  if (state.finished || state.turnPhase === 'ENDED') return;
  const startTurnNumber = state.turnNumber;
  if (state.pendingChoice) {
    clearPendingChoiceOnForcedAutoTurn(state, nowMs, TURN_CONTINUATION_CALLBACKS);
    if (state.finished || state.turnNumber !== startTurnNumber) return;
  }
  const actor = getActivePlayer(state);
  if (!actor || !actor.alive) {
    if (isExpandedRuleset(state)) {
      expireActiveTurnControl(state, 'timeout-auto-turn', nowMs);
    }
    advanceTurn(state, nowMs);
    return;
  }

  if (isExpandedRuleset(state)) {
    expireActiveTurnControl(state, 'timeout-auto-turn', nowMs);
  }

  appendPublicLog(
    state,
    'timeout',
    `⏱️ ${actor.displayName} quá hạn kết nối — hệ thống tự hoàn tất lượt trung tính.`,
    nowMs,
    actor.playerId,
  );

  // Tự di chuyển nếu chưa rời khu vực ở lượt này để đảm bảo trạng thái hợp lệ.
  let safetyGuard = 0;
  while (state.turnPhase === 'ROLL_MOVE' && safetyGuard < 3 && !state.finished) {
    safetyGuard += 1;
    resolveDiceRollMove(state, actor, nowMs);
  }
  if (state.turnPhase === 'CHOOSE_MOVE' && !state.finished) {
    const pool =
      state.allowedMoveDestinations && state.allowedMoveDestinations.length > 0
        ? state.allowedMoveDestinations
        : LOCATIONS_CATALOG.filter((l) => l.id !== actor.location).map((l) => l.id);
    const destId = pool[nextRandomInt(state, pool.length)] ?? 'lobby';
    resolveChooseDestination(state, actor, destId, nowMs);
  }
  if (state.turnPhase === 'LOCATION_ACTION' && !state.finished) {
    state.turnPhase = 'MAIN_ACTION';
  }
  while (actor.hand.length > 0) {
    const id = actor.hand.shift();
    if (id) discardCardId(state, id);
  }
  if (isExpandedRuleset(state)) {
    discardGloriaQueuedCards(state, actor.playerId);
    if (applyExpandedTurnEndHooks(state, actor, nowMs, TURN_CONTINUATION_CALLBACKS)) {
      return;
    }
  }

  if (!finalizeIfFinished(state, nowMs)) {
    advanceTurn(state, nowMs);
  }
}
