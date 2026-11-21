// ---------------------------------------------------------------------------
// features/boardgame/domain/heal-pipeline.ts — CAP-04 Centralized HealPipeline
//
// Mọi nguồn hồi máu trong chế độ mở rộng (`rulesetId !== 'classic'`) bắt buộc
// đi qua pipeline này để đảm bảo thứ tự xác định (deterministic order):
//   1. Idempotency check (`healEventId`) & kiểm tra mục tiêu còn sống.
//   2. Kiểm tra cấm tự hồi máu (Dalton — Vòng Đấu Thứ 12).
//   3. Kiểm tra hào quang cấm hồi máu liên tục (Usurper đã lộ diện: chỉ chặn
//      nguồn `'skill'` và `'white-card'`, không chặn chính Usurper).
//   4. Kiểm tra phản ứng chặn hồi máu bí mật (Usurper ẩn vai, tôn trọng
//      `CAP-05` `reactionPolicy`: `AUTO_DECLINE` / `AUTO_ACTIVATE_WHEN_ELIGIBLE` / `ASK`).
//   5. Cắt trần theo Max HP (`Math.min(target.woundsTaken, rawAmount)`), ghi
//      nhận telemetry và nhật ký công khai.
//
// Ràng buộc tuyệt đối:
// - `applyHeal()` trong `effects.ts` KHÔNG bị thay đổi cho chế độ `classic`.
// ---------------------------------------------------------------------------

import type {
  BoardGamePublicLogEntry,
  BoardGameReactionPolicy,
} from '../../../shared/contracts/boardgame';
import { getEffectiveSkillRoleId } from './dynamic-skill-copy';
import { appendPublicLog, applyHeal } from './effects';
import type {
  AuthoritativeGameState,
  AuthoritativePlayerState,
  HealExecutionResult,
  HealSourceKind,
} from './types';

export const HEAL_SOURCE_KINDS: readonly HealSourceKind[] = [
  'skill',
  'white-card',
  'black-card',
  'location',
  'investigation',
];

export const USURPER_BLOCKABLE_HEAL_SOURCES: ReadonlySet<HealSourceKind> = new Set<HealSourceKind>([
  'skill',
  'white-card',
]);

export function isUsurperBlockableHealSource(sourceKind: HealSourceKind): boolean {
  return USURPER_BLOCKABLE_HEAL_SOURCES.has(sourceKind);
}

/** Kiểm tra Dalton đã kích hoạt Vòng Đấu Thứ 12 và đang cố tự hồi máu cho chính mình. */
export function isDaltonSelfHealBlocked(
  state: AuthoritativeGameState,
  actorPlayerId: string | null,
  targetPlayerId: string,
): boolean {
  if (!actorPlayerId || actorPlayerId !== targetPlayerId) return false;
  return Boolean(state.expansionState?.daltonActivatedByPlayer?.[targetPlayerId]);
}

/** Tìm Usurper đã lộ diện đang bật hào quang cấm hồi máu cho mục tiêu & nguồn này. */
export function findRevealedUsurperBlockingHeal(
  state: AuthoritativeGameState,
  targetPlayerId: string,
  sourceKind: HealSourceKind,
): AuthoritativePlayerState | null {
  if (!isUsurperBlockableHealSource(sourceKind)) return null;
  for (const pid of state.turnOrder) {
    const p = state.players[pid];
    if (
      p &&
      p.alive &&
      p.revealed &&
      (getEffectiveSkillRoleId(state, p) as string) === 'exp2_usurper' &&
      p.playerId !== targetPlayerId
    ) {
      return p;
    }
  }
  return null;
}

/** Tìm Usurper đang ẩn vai đủ điều kiện kích hoạt phản ứng chặn hồi máu ngoài lượt. */
export function findHiddenUsurperEligibleForHeal(
  state: AuthoritativeGameState,
  targetPlayerId: string,
  sourceKind: HealSourceKind,
): AuthoritativePlayerState | null {
  if (!isUsurperBlockableHealSource(sourceKind)) return null;
  for (const pid of state.turnOrder) {
    const p = state.players[pid];
    if (
      p &&
      p.alive &&
      !p.revealed &&
      (getEffectiveSkillRoleId(state, p) as string) === 'exp2_usurper' &&
      p.playerId !== targetPlayerId
    ) {
      return p;
    }
  }
  return null;
}

export interface HealPipelineRequest {
  healEventId: string;
  actorPlayerId: string | null;
  targetPlayerId: string;
  rawAmount: number;
  sourceKind: HealSourceKind;
  sourceCardId?: string;
  sourceLabel?: string;
  roleStatId?: string;
  usurperChecked?: boolean;
  usurperBlocked?: boolean;
  postLogKind?: BoardGamePublicLogEntry['kind'];
  postLogPrefix?: string;
  postLogSuffix?: string;
  postLogActorId?: string | null;
  zeroLogText?: string;
  blockedLogText?: string;
}

export interface HealPipelineHooks {
  hasProcessedEvent?: (state: AuthoritativeGameState, eventId: string) => boolean;
  markEventProcessed?: (state: AuthoritativeGameState, eventId: string) => void;
  getReactionPolicy?: (state: AuthoritativeGameState, playerId: string) => BoardGameReactionPolicy;
  onHiddenUsurperAutoRevealBlock?: (
    state: AuthoritativeGameState,
    usurper: AuthoritativePlayerState,
    target: AuthoritativePlayerState,
    req: HealPipelineRequest,
    nowMs: number,
  ) => void;
  onHiddenUsurperAskPrompt?: (
    state: AuthoritativeGameState,
    usurper: AuthoritativePlayerState,
    target: AuthoritativePlayerState,
    potentialHeal: number,
    req: HealPipelineRequest,
    nowMs: number,
  ) => boolean;
  onRecordHealStat?: (state: AuthoritativeGameState, roleId: string, actualHealed: number) => void;
  onRecordHealBlockedStat?: (
    state: AuthoritativeGameState,
    blockerRoleId: string,
    blockedAmount: number,
  ) => void;
}

/**
 * Thực thi 1 sự kiện hồi máu qua `CAP-04 HealPipeline` theo thứ tự xác định.
 * Nếu Usurper ẩn vai cần mở Pending Choice (`ASK`), hàm trả về `pendingChoiceOpened: true`
 * và KHÔNG mutate HP của mục tiêu cho đến khi phản ứng được giải quyết.
 */
export function executeHealPipeline(
  state: AuthoritativeGameState,
  req: HealPipelineRequest,
  nowMs: number,
  hooks?: HealPipelineHooks,
): HealExecutionResult {
  if (hooks?.hasProcessedEvent?.(state, req.healEventId)) {
    return { attempted: 0, actual: 0, blockedBy: 'duplicate-event' };
  }

  const target = state.players[req.targetPlayerId];
  if (!target || !target.alive) {
    hooks?.markEventProcessed?.(state, req.healEventId);
    return { attempted: 0, actual: 0, blockedBy: 'target-dead' };
  }

  const attempted = Math.max(0, Math.floor(req.rawAmount));
  const potentialHeal = Math.min(target.woundsTaken, attempted);

  // Bước 2: Kiểm tra Dalton tự hồi máu (sau khi kích hoạt Vòng Đấu Thứ 12)
  if (isDaltonSelfHealBlocked(state, req.actorPlayerId, target.playerId)) {
    hooks?.markEventProcessed?.(state, req.healEventId);
    if (potentialHeal > 0) {
      hooks?.onRecordHealBlockedStat?.(state, 'exp2_dalton', potentialHeal);
    }
    appendPublicLog(
      state,
      'skill',
      req.blockedLogText ??
        `🚫 Vòng Đấu Thứ 12 (Dalton): ${target.displayName} không thể tự hồi máu cho bản thân!`,
      nowMs,
      target.playerId,
    );
    return { attempted, actual: 0, blockedBy: 'dalton-self-heal' };
  }

  // Bước 3: Nếu phản ứng Usurper vừa kích hoạt & chặn lần hồi máu này
  if (req.usurperChecked && req.usurperBlocked) {
    hooks?.markEventProcessed?.(state, req.healEventId);
    if (potentialHeal > 0) {
      hooks?.onRecordHealBlockedStat?.(state, 'exp2_usurper', potentialHeal);
    }
    if (req.blockedLogText) {
      appendPublicLog(
        state,
        'skill',
        req.blockedLogText,
        nowMs,
        req.postLogActorId ?? target.playerId,
      );
    }
    return { attempted, actual: 0, blockedBy: 'usurper-reveal' };
  }

  // Bước 4: Kiểm tra hào quang Usurper đã lộ diện (liên tục chặn 'skill' & 'white-card' của người khác)
  const revealedUsurper = findRevealedUsurperBlockingHeal(state, target.playerId, req.sourceKind);
  if (revealedUsurper) {
    hooks?.markEventProcessed?.(state, req.healEventId);
    if (potentialHeal > 0) {
      hooks?.onRecordHealBlockedStat?.(state, 'exp2_usurper', potentialHeal);
    }
    appendPublicLog(
      state,
      'skill',
      req.blockedLogText ??
        `🚫 Hào quang Usurper (${revealedUsurper.displayName}): vô hiệu hóa hồi máu (${req.sourceLabel ?? req.sourceKind}) của ${target.displayName}!`,
      nowMs,
      revealedUsurper.playerId,
    );
    return { attempted, actual: 0, blockedBy: 'usurper-aura' };
  }

  // Bước 5: Kiểm tra Usurper đang ẩn vai (chỉ kích hoạt nếu có lượng hồi thực tế > 0!)
  if (!req.usurperChecked && potentialHeal > 0) {
    const hiddenUsurper = findHiddenUsurperEligibleForHeal(state, target.playerId, req.sourceKind);
    if (hiddenUsurper) {
      const policy: BoardGameReactionPolicy =
        hooks?.getReactionPolicy?.(state, hiddenUsurper.playerId) ??
        state.expansionState?.reactionPolicyByPlayer?.[hiddenUsurper.playerId] ??
        'ASK';

      if (policy === 'AUTO_ACTIVATE_WHEN_ELIGIBLE' && hooks?.onHiddenUsurperAutoRevealBlock) {
        hooks.onHiddenUsurperAutoRevealBlock(state, hiddenUsurper, target, req, nowMs);
        hooks.markEventProcessed?.(state, req.healEventId);
        hooks.onRecordHealBlockedStat?.(state, 'exp2_usurper', potentialHeal);
        return { attempted, actual: 0, blockedBy: 'usurper-reveal' };
      }

      if (policy === 'ASK' && hooks?.onHiddenUsurperAskPrompt) {
        const opened = hooks.onHiddenUsurperAskPrompt(
          state,
          hiddenUsurper,
          target,
          potentialHeal,
          req,
          nowMs,
        );
        if (opened) {
          return {
            attempted,
            actual: 0,
            blockedBy: 'none',
            pendingChoiceOpened: true,
          };
        }
      }
      // policy === 'AUTO_DECLINE' (hoặc không có hook prompt): bỏ qua tức thì (<1ms), zero public log!
    }
  }

  // Bước 6: Áp hồi máu cắt trần theo Max HP & ghi nhận sự kiện
  const actual = attempted > 0 ? applyHeal(state, target, attempted) : 0;
  hooks?.markEventProcessed?.(state, req.healEventId);
  if (actual > 0 && req.roleStatId) {
    hooks?.onRecordHealStat?.(state, req.roleStatId, actual);
  }

  if (actual === 0 && req.zeroLogText) {
    appendPublicLog(
      state,
      req.postLogKind ?? 'skill',
      req.zeroLogText,
      nowMs,
      req.postLogActorId ?? target.playerId,
    );
  } else if (req.postLogPrefix && req.postLogKind) {
    appendPublicLog(
      state,
      req.postLogKind,
      `${req.postLogPrefix}${actual}${req.postLogSuffix ?? ''}`,
      nowMs,
      req.postLogActorId ?? target.playerId,
    );
  }

  return { attempted, actual, blockedBy: 'none' };
}
