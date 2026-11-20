// ---------------------------------------------------------------------------
// features/boardgame/domain/actions.ts — Điều phối hành động chuẩn Shadow Hunters
// (`ROLL_MOVE -> CHOOSE_MOVE? -> LOCATION_ACTION -> MAIN_ACTION`) & lượt đi phụ / Bách chém bồi.
// ---------------------------------------------------------------------------

import type { BoardGameActionPayload } from '../../../shared/contracts/boardgame';
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
  applyExpandedDrawLocationCard,
  applyExpandedInvestigateCard,
  applyExpandedLocationPower,
  applyExpandedUseCard,
  applyExpandedUseSkill,
  clearPendingChoiceOnForcedAutoTurn,
  isExpandedRuleset,
  resolveExpiredPendingChoice,
  resolvePendingChoice,
  startExpandedAttack,
  type TurnContinuationCallbacks,
} from './expansion-skills';
import {
  canPlayerAttackTarget,
  listReachableAttackTargets,
  LOCATIONS_CATALOG,
  nextRandomInt,
} from './rules';
import type {
  AuthoritativeGameState,
  AuthoritativePlayerState,
  EngineActionResult,
} from './types';
import { buildFinalRevealSummary } from './victory';
import { evaluateVictoryWithEngine } from './victory-engine';

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
  }
  state.extraTurnPending = false;
  state.winnerFaction = victory.winnerFaction;
  state.winnerLabel = victory.winnerLabel;
  state.winnerPlayerIds = [...victory.winnerPlayerIds];
  state.winReason = victory.winReason;
  state.finalReveal = buildFinalRevealSummary(state, victory.winnerPlayerIds);

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
  return true;
}

export function advanceTurn(state: AuthoritativeGameState, nowMs: number): void {
  if (state.finished) return;
  const order = state.turnOrder;
  if (order.length === 0) return;

  // Lượt đi phụ từ Sổ Tay Bí Truyền (eq-15 / Concealed Knowledge)
  if (state.extraTurnPending && state.activePlayerId) {
    const current = state.players[state.activePlayerId];
    state.extraTurnPending = false;
    if (current && current.alive) {
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
      finalizeIfFinished(state, nowMs);
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
    if (candidate && candidate.alive) {
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
  nextPlayer.guardianShieldActive = false;
  nextPlayer.consecutiveSameZoneRolls = 0;
  nextPlayer.attacksThisTurn = 0;
  nextPlayer.lastAttackTargetId = null;

  state.allowedMoveDestinations = undefined;
  state.turnNumber += 1;
  state.activePlayerId = nextPlayer.playerId;
  state.turnPhase = 'ROLL_MOVE';

  finalizeIfFinished(state, nowMs);
}

function canTriggerCharlesBloodyFeast(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
): boolean {
  const lastTarget = actor.lastAttackTargetId ? state.players[actor.lastAttackTargetId] : null;
  return Boolean(
    actor.alive &&
      actor.revealed &&
      actor.roleId === 'lang-cuu-ho' &&
      actor.attacksThisTurn >= 1 &&
      actor.hp > 2 &&
      actor.hand.length === 0 &&
      lastTarget &&
      lastTarget.alive &&
      canPlayerAttackTarget(state, actor, lastTarget),
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
  return resolveExpiredPendingChoice(state, nowMs, TURN_CONTINUATION_CALLBACKS);
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
  const actor = state.players[playerId];
  if (!actor || !actor.alive) {
    return { ok: false, error: 'Bạn không thể hành động khi đã bị loại.', reason: 'Bạn không thể hành động khi đã bị loại.' };
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

  if (state.activePlayerId !== playerId) {
    return { ok: false, error: 'Chưa tới lượt của bạn.', reason: 'Chưa tới lượt của bạn.' };
  }

  const expanded = isExpandedRuleset(state);
  let result: EngineActionResult;
  let autoEndTurnAfterAction = false;
  let continuationManaged = false;

  switch (action.type) {
    case 'ROLL_DICE':
      result = resolveDiceRollMove(state, actor, nowMs);
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
      if (actor.hand.length > 0) {
        result = {
          ok: false,
          error: 'Hãy giải quyết lá bài vừa rút trên tay trước khi tấn công.',
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
      result = resolveRevealRole(state, actor, nowMs);
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
    case 'END_TURN':
      if (state.turnPhase === 'ROLL_MOVE' || state.turnPhase === 'CHOOSE_MOVE') {
        return {
          ok: false,
          error: 'Hãy tung xúc xắc và di chuyển sang khu vực kế tiếp trước khi kết thúc lượt.',
        };
      }
      if (actor.hand.length > 0) {
        return {
          ok: false,
          error: 'Hãy giải quyết lá bài vừa rút trên tay trước khi kết thúc lượt.',
        };
      }
      if (
        actor.equipped.includes('ev-01') &&
        actor.attacksThisTurn === 0 &&
        listReachableAttackTargets(state, actor).length > 0
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

  if (continuationManaged) {
    return { ok: true };
  }

  if (finalizeIfFinished(state, nowMs)) {
    return { ok: true };
  }

  if (autoEndTurnAfterAction || !actor.alive) {
    advanceTurn(state, nowMs);
  }

  return { ok: true };
}

export function applyTimeoutAutoTurn(
  state: AuthoritativeGameState,
  nowMs: number,
): void {
  if (state.finished || state.turnPhase === 'ENDED') return;
  if (state.pendingChoice) {
    clearPendingChoiceOnForcedAutoTurn(state, nowMs, TURN_CONTINUATION_CALLBACKS);
    if (state.finished) return;
  }
  const actor = getActivePlayer(state);
  if (!actor || !actor.alive) {
    advanceTurn(state, nowMs);
    return;
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

  if (!finalizeIfFinished(state, nowMs)) {
    advanceTurn(state, nowMs);
  }
}
