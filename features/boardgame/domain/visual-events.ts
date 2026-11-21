// ---------------------------------------------------------------------------
// features/boardgame/domain/visual-events.ts — Phase 8C Typed Public Visual
// Event Emitter with Centralized P0 Privacy Redaction & Bounded Ring Buffer.
//
// Nguyên tắc kiến trúc:
// 1. Mọi sự kiện hình ảnh đều có `id` ổn định & `seq` tăng đơn điệu theo trận
//    để client khử trùng lặp 100% khi F5 / reconnect.
// 2. Rào chắn P0 tập trung: tuyệt đối KHÔNG bao giờ xuất `publicRoleId`,
//    `publicFaction`, hay `publicCopiedRoleId` của người chơi chưa lộ diện
//    (`!actor.revealed && !state.finished`).
// 3. Không tiêu hao PRNG (`state.rngState` bất biến 100%) — zero Classic drift.
// 4. Giới hạn cứng `BOARD_GAME_MAX_VISUAL_EVENTS = 48` để payload luôn nhẹ.
// ---------------------------------------------------------------------------

import {
  BOARD_GAME_MAX_VISUAL_EVENTS,
  type BoardGameFactionId,
  type BoardGameRoleId,
  type BoardGameStructuredVisualEvent,
  type BoardGameStructuredVisualEventKind,
} from '../../../shared/contracts/boardgame';
import { getEffectiveFaction } from './dynamic-allegiance';
import type { AuthoritativeGameState } from './types';

export interface AppendStructuredVisualEventInput {
  readonly kind: BoardGameStructuredVisualEventKind;
  readonly effectKey: string;
  readonly actorPlayerId: string | null;
  readonly targetPlayerIds?: readonly string[];
  readonly atMs: number;
  readonly publicRoleId?: BoardGameRoleId | null;
  readonly publicFaction?: BoardGameFactionId | null;
  readonly publicCopiedRoleId?: BoardGameRoleId | null;
  readonly amount?: number;
  readonly isCritical?: boolean;
  readonly isMultiTarget?: boolean;
  readonly outcome?: 'success' | 'failed' | 'blocked' | 'cancelled';
  readonly winningFactions?: readonly BoardGameFactionId[];
  readonly cardCount?: number;
  readonly label?: string;
}

/**
 * Phát 1 sự kiện hình ảnh công khai có cấu trúc lên `state.visualEvents`
 * với bộ lọc bảo mật P0 cưỡng bức và giới hạn bộ đệm `BOARD_GAME_MAX_VISUAL_EVENTS`.
 */
export function appendStructuredVisualEvent(
  state: AuthoritativeGameState,
  input: AppendStructuredVisualEventInput,
): BoardGameStructuredVisualEvent {
  if (!Array.isArray(state.visualEvents)) {
    state.visualEvents = [];
  }
  const nextSeq = (typeof state.visualEventSeq === 'number' ? state.visualEventSeq : 0) + 1;
  state.visualEventSeq = nextSeq;

  const actor = input.actorPlayerId ? state.players[input.actorPlayerId] : null;
  const actorIsPubliclyRevealed = Boolean(
    state.finished || (actor && actor.revealed),
  );

  // RÀO CHẮN P0 TẬP TRUNG:
  // Chỉ giữ publicRoleId / publicFaction / publicCopiedRoleId khi người diễn đã lộ diện công khai
  // (hoặc khi sự kiện là MATCH_FINISHED / FACTION_CHANGED / ROLE_REVEALED công khai đã commit).
  const allowPublicIdentity =
    actorIsPubliclyRevealed ||
    input.kind === 'MATCH_FINISHED';

  const safePublicRoleId =
    allowPublicIdentity && input.publicRoleId !== undefined
      ? input.publicRoleId
      : undefined;
  const safePublicFaction =
    allowPublicIdentity
      ? input.publicFaction !== undefined
        ? input.publicFaction
        : actor
          ? getEffectiveFaction(state, actor)
          : undefined
      : undefined;
  const safePublicCopiedRoleId =
    allowPublicIdentity && input.publicCopiedRoleId !== undefined
      ? input.publicCopiedRoleId
      : undefined;

  const dedupTargets: string[] = [];
  for (const tid of input.targetPlayerIds ?? []) {
    if (typeof tid === 'string' && tid.length > 0 && !dedupTargets.includes(tid)) {
      dedupTargets.push(tid);
    }
  }

  const event: BoardGameStructuredVisualEvent = {
    id: `${state.matchId}:ve:${nextSeq}`,
    seq: nextSeq,
    matchId: state.matchId,
    round: state.round,
    turnNumber: state.turnNumber,
    atMs: input.atMs,
    kind: input.kind,
    effectKey: input.effectKey,
    actorPlayerId: input.actorPlayerId,
    targetPlayerIds: dedupTargets,
    visibility: 'public',
    ...(safePublicRoleId !== undefined ? { publicRoleId: safePublicRoleId } : {}),
    ...(safePublicFaction !== undefined ? { publicFaction: safePublicFaction } : {}),
    ...(safePublicCopiedRoleId !== undefined ? { publicCopiedRoleId: safePublicCopiedRoleId } : {}),
    ...(typeof input.amount === 'number' ? { amount: input.amount } : {}),
    ...(input.isCritical ? { isCritical: true } : {}),
    ...(input.isMultiTarget || dedupTargets.length > 1 ? { isMultiTarget: true } : {}),
    ...(input.outcome ? { outcome: input.outcome } : {}),
    ...(input.winningFactions && input.winningFactions.length > 0
      ? { winningFactions: [...input.winningFactions] }
      : {}),
    ...(typeof input.cardCount === 'number' ? { cardCount: input.cardCount } : {}),
    ...(input.label ? { label: input.label } : {}),
  };

  state.visualEvents.push(event);
  if (state.visualEvents.length > BOARD_GAME_MAX_VISUAL_EVENTS) {
    state.visualEvents.splice(0, state.visualEvents.length - BOARD_GAME_MAX_VISUAL_EVENTS);
  }
  return event;
}

/**
 * Chiếu bản sao an toàn của `state.visualEvents` ra `BoardGamePublicGameView`.
 * Bảo đảm lần thứ 2 tại lớp projection rằng không có vai ẩn nào bị lộ ra public view.
 */
export function projectPublicVisualEvents(
  state: AuthoritativeGameState,
): readonly BoardGameStructuredVisualEvent[] | undefined {
  if (!Array.isArray(state.visualEvents) || state.visualEvents.length === 0) {
    return undefined;
  }
  const slice = state.visualEvents.slice(-BOARD_GAME_MAX_VISUAL_EVENTS);
  return slice.map((ev) => {
    const actor = ev.actorPlayerId ? state.players[ev.actorPlayerId] : null;
    const canExposeIdentity = Boolean(
      state.finished ||
        ev.kind === 'MATCH_FINISHED' ||
        (actor && actor.revealed),
    );
    if (canExposeIdentity) {
      return {
        ...ev,
        targetPlayerIds: [...ev.targetPlayerIds],
        ...(ev.winningFactions ? { winningFactions: [...ev.winningFactions] } : {}),
      };
    }
    const {
      publicRoleId: _dropRole,
      publicFaction: _dropFaction,
      publicCopiedRoleId: _dropCopy,
      ...rest
    } = ev;
    void _dropRole;
    void _dropFaction;
    void _dropCopy;
    return {
      ...rest,
      targetPlayerIds: [...ev.targetPlayerIds],
    };
  });
}
