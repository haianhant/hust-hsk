// ---------------------------------------------------------------------------
// features/boardgame/domain/reveal-events.ts — Authoritative Role Reveal Event
// Ledger & Normal-Gameplay Filtering (Phase 6A).
//
// Phục vụ:
// - Cassie (`exp1_cassie`): gắn điều kiện thắng theo Neutral KHÁC đầu tiên lộ diện
//   trong gameplay bình thường (loại trừ chết & final-disclosure).
// - Diana (`exp2_diana`): ghi nhận khách hàng chờ kích hoạt ở đầu lượt kế của họ.
// - Aaron (`exp2_aaron`): gắn nhân vật nữ KHÁC đầu tiên lộ diện trong gameplay bình thường.
// - April & Skipps (`exp2_april_skipps`): phân biệt lộ vai do kỹ năng ở ô 7 với lộ vai khác.
// - Umibozu (`exp2_umibozu`): tiếp tục dùng chung luồng lộ diện chuẩn.
//
// Bảo mật P0: `revealHistory` là dữ liệu nội bộ trên server, tuyệt đối KHÔNG xuất
// ra DTO công khai hay danh sách ứng viên phía client.
// ---------------------------------------------------------------------------

import type {
  BoardGameFactionId,
  BoardGameRoleId,
} from '../../../shared/contracts/boardgame';
import { isEligibleFemaleRole } from './character-metadata';
import { getEffectiveFaction } from './dynamic-allegiance';
import type { AuthoritativeGameState } from './types';

const MAX_REVEAL_HISTORY = 128;

export type AuthoritativeRevealTriggerReason =
  | 'voluntary'
  | 'card-forced'
  | 'skill-forced'
  | 'reaction'
  | 'eliminated'
  | 'final-disclosure';

export interface AuthoritativeRoleRevealRecord {
  readonly revealEventId: string;
  readonly revealSeq: number;
  readonly revealedPlayerId: string;
  readonly triggerReason: AuthoritativeRevealTriggerReason;
  readonly sourceActorId: string | null;
  readonly turnNumber: number;
  readonly round: number;
  readonly atMs: number;
  readonly wasAliveBeforeReveal: boolean;
  readonly isDeathReveal: boolean;
  readonly isFinalMatchDisclosure: boolean;
  readonly roleIdAtReveal: BoardGameRoleId;
  readonly factionAtReveal: BoardGameFactionId;
}

export interface RecordAuthoritativeRevealInput {
  readonly revealEventId: string;
  readonly revealedPlayerId: string;
  readonly triggerReason: AuthoritativeRevealTriggerReason;
  readonly sourceActorId: string | null;
  readonly atMs: number;
  readonly wasAliveBeforeReveal: boolean;
  readonly isDeathReveal?: boolean;
  readonly isFinalMatchDisclosure?: boolean;
}

/**
 * True khi và chỉ khi đây là sự kiện lộ diện trong gameplay bình thường
 * (người chơi còn sống trước khi lộ, KHÔNG phải lộ do chết và KHÔNG phải finalReveal).
 */
export function isNormalGameplayReveal(record: AuthoritativeRoleRevealRecord): boolean {
  return (
    record.wasAliveBeforeReveal &&
    !record.isDeathReveal &&
    !record.isFinalMatchDisclosure &&
    record.triggerReason !== 'eliminated' &&
    record.triggerReason !== 'final-disclosure'
  );
}

/**
 * Ghi nhận sự kiện lộ diện có thứ tự đơn điệu (`revealSeq`) và chống trùng lặp theo `revealEventId`.
 */
export function recordAuthoritativeRevealEvent(
  state: AuthoritativeGameState,
  input: RecordAuthoritativeRevealInput,
): AuthoritativeRoleRevealRecord | null {
  const player = state.players[input.revealedPlayerId];
  if (!player) return null;

  if (!state.expansionState) {
    return null;
  }
  const exp = state.expansionState;
  if (!Array.isArray(exp.revealHistory)) {
    exp.revealHistory = [];
  }

  const existing = exp.revealHistory.find((r) => r.revealEventId === input.revealEventId);
  if (existing) {
    return existing;
  }

  const nextSeq = (typeof exp.revealSeq === 'number' ? exp.revealSeq : exp.revealHistory.length) + 1;
  exp.revealSeq = nextSeq;

  const isDeathReveal =
    input.isDeathReveal ?? input.triggerReason === 'eliminated';
  const isFinalMatchDisclosure =
    input.isFinalMatchDisclosure ?? input.triggerReason === 'final-disclosure';

  const record: AuthoritativeRoleRevealRecord = {
    revealEventId: input.revealEventId,
    revealSeq: nextSeq,
    revealedPlayerId: player.playerId,
    triggerReason: input.triggerReason,
    sourceActorId: input.sourceActorId,
    turnNumber: state.turnNumber,
    round: state.round,
    atMs: input.atMs,
    wasAliveBeforeReveal: input.wasAliveBeforeReveal,
    isDeathReveal,
    isFinalMatchDisclosure,
    roleIdAtReveal: player.roleId,
    factionAtReveal: getEffectiveFaction(state, player),
  };

  exp.revealHistory.push(record);
  if (exp.revealHistory.length > MAX_REVEAL_HISTORY) {
    exp.revealHistory.splice(0, exp.revealHistory.length - MAX_REVEAL_HISTORY);
  }
  return record;
}

/**
 * Tìm sự kiện lộ diện gameplay bình thường ĐẦU TIÊN (theo `revealSeq` tăng dần)
 * của một Neutral KHÁC `excludePlayerId` (dùng cho Cassie & Diana).
 */
export function findFirstEligibleNeutralReveal(
  state: AuthoritativeGameState,
  excludePlayerId: string,
): AuthoritativeRoleRevealRecord | null {
  const history = state.expansionState?.revealHistory;
  if (!Array.isArray(history) || history.length === 0) return null;

  let best: AuthoritativeRoleRevealRecord | null = null;
  for (const rec of history) {
    if (!isNormalGameplayReveal(rec)) continue;
    if (rec.revealedPlayerId === excludePlayerId) continue;
    if (rec.factionAtReveal !== 'wanderer') continue;
    if (!best || rec.revealSeq < best.revealSeq) {
      best = rec;
    }
  }
  return best;
}

/**
 * Tìm sự kiện lộ diện gameplay bình thường ĐẦU TIÊN (theo `revealSeq` tăng dần)
 * của một nhân vật nữ hợp lệ (`gender === 'female'`) KHÁC `excludePlayerId` (dùng cho Aaron).
 */
export function findFirstEligibleFemaleReveal(
  state: AuthoritativeGameState,
  excludePlayerId: string,
): AuthoritativeRoleRevealRecord | null {
  const history = state.expansionState?.revealHistory;
  if (!Array.isArray(history) || history.length === 0) return null;

  let best: AuthoritativeRoleRevealRecord | null = null;
  for (const rec of history) {
    if (!isNormalGameplayReveal(rec)) continue;
    if (rec.revealedPlayerId === excludePlayerId) continue;
    if (!isEligibleFemaleRole(rec.roleIdAtReveal)) continue;
    if (!best || rec.revealSeq < best.revealSeq) {
      best = rec;
    }
  }
  return best;
}
