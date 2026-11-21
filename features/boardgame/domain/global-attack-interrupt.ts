// ---------------------------------------------------------------------------
// features/boardgame/domain/global-attack-interrupt.ts — GlobalAttackInterrupt (Phase 7A)
//
// Cổng ngắt tấn công toàn bàn trước khi đổ xúc xắc (pre-roll attack interrupt hook)
// phục vụ Lloyd (`exp1_lloyd`) và bất kỳ nhân vật nào sao chép kỹ năng Lloyd
// thông qua DynamicSkillCopy (Vengeful Spirit / Antimony).
//
// Bất biến cốt lõi (Section 8 & Section 10):
// 1. Hoạt động cho mọi đòn tấn công thường hợp lệ trên toàn bàn (cross-map).
// 2. Xảy ra TRƯỚC KHI đổ xúc xắc tấn công — khi hủy đòn, TUYỆT ĐỐI KHÔNG tiêu hao
//    RNG (`state.rngState` bất biến cho bước tấn công bị hủy!).
// 3. Đòn Súng Máy (Machine Gun / `ev-06`) nhiều mục tiêu được chụp thành MỘT
//    `PendingDeclaredAttack` duy nhất -> hủy toàn bộ đòn đánh chỉ trong 1 hành động.
// 4. Chỉ ứng viên ĐANG SỐNG (không ngủ đông) và ĐÃ LỘ DIỆN mới được mở cửa sổ ngắt
//    (loại bỏ hoàn toàn side-channel rò vai ẩn!).
// 5. Nhiều ứng viên Lloyd xếp hàng theo thứ tự xác định (khoảng cách ghế từ chủ lượt ->
//    playerId ASC); ngay khi 1 người hủy đòn, mọi cửa sổ còn lại đóng ngay lập tức.
// 6. Không thể hủy ngược sát thương đã cam kết; không thể gây vòng lặp ngắt vô hạn.
// ---------------------------------------------------------------------------

import { getEffectiveSkillRoleId } from './dynamic-skill-copy';
import { isPlayerDormantPendingRevive } from './pending-resurrection';
import type { AuthoritativeGameState, AuthoritativePlayerState } from './types';

export type PendingDeclaredAttackStatus = 'AWAITING_INTERRUPT' | 'PROCEED' | 'CANCELLED';

export interface PendingDeclaredAttack {
  readonly attackId: string;
  readonly attackerPlayerId: string;
  readonly primaryTargetId: string;
  /** Toàn bộ mục tiêu trong phạm vi đòn đánh (nhiều người nếu có Súng Máy ev-06). */
  readonly targetPlayerIds: readonly string[];
  readonly hasMasamune: boolean;
  readonly hasMachineGun: boolean;
  readonly isBonusAttack: boolean;
  readonly isRetaliatoryAttack: boolean;
  readonly isRecruitmentAttack: boolean;
  readonly declaredAtTurnNumber: number;
  readonly declaredAtMs: number;
  /** Danh sách ứng viên đã được hỏi / bỏ qua để chống hỏi lặp & chống vòng lặp vô hạn. */
  checkedCandidateIds: string[];
  status: PendingDeclaredAttackStatus;
  cancelledByPlayerId: string | null;
  cancelledAtMs?: number;
}

function computeSeatDistanceFromActive(
  state: AuthoritativeGameState,
  playerId: string,
): number {
  const order = state.turnOrder;
  const n = order.length;
  if (n === 0) return Number.MAX_SAFE_INTEGER;
  const activeIdx = state.activePlayerId ? order.indexOf(state.activePlayerId) : 0;
  const baseIdx = activeIdx >= 0 ? activeIdx : 0;
  const idx = order.indexOf(playerId);
  if (idx < 0) return n + 1;
  return (idx - baseIdx + n) % n;
}

/**
 * Tạo snapshot đòn tấn công vừa tuyên bố (trước bước gieo xúc xắc) với `attackId` đơn điệu.
 */
export function createPendingDeclaredAttack(
  state: AuthoritativeGameState,
  params: {
    attackerPlayerId: string;
    primaryTargetId: string;
    targetPlayerIds: readonly string[];
    hasMasamune: boolean;
    hasMachineGun: boolean;
    isBonusAttack?: boolean;
    isRetaliatoryAttack?: boolean;
    isRecruitmentAttack?: boolean;
    nowMs: number;
  },
): PendingDeclaredAttack {
  if (state.expansionState) {
    state.expansionState.eventSeq = (state.expansionState.eventSeq ?? 0) + 1;
  }
  const seq = state.expansionState?.eventSeq ?? 1;
  return {
    attackId: `atk-${state.turnNumber}-${seq}-${params.nowMs}`,
    attackerPlayerId: params.attackerPlayerId,
    primaryTargetId: params.primaryTargetId,
    targetPlayerIds: [...params.targetPlayerIds],
    hasMasamune: params.hasMasamune,
    hasMachineGun: params.hasMachineGun,
    isBonusAttack: Boolean(params.isBonusAttack),
    isRetaliatoryAttack: Boolean(params.isRetaliatoryAttack),
    isRecruitmentAttack: Boolean(params.isRecruitmentAttack),
    declaredAtTurnNumber: state.turnNumber,
    declaredAtMs: params.nowMs,
    checkedCandidateIds: [],
    status: 'AWAITING_INTERRUPT',
    cancelledByPlayerId: null,
  };
}

/**
 * Thu thập tất cả ứng viên có thể ngắt đòn tấn công (Lloyd gốc hoặc người sao chép kỹ năng Lloyd)
 * theo thứ tự hoàn toàn xác định: khoảng cách ghế từ chủ lượt tăng dần -> `playerId` tăng dần.
 *
 * Lưu ý bảo mật: CHỈ ứng viên ĐÃ LỘ DIỆN, còn sống & không ngủ đông mới đủ điều kiện.
 */
export function collectAttackInterruptCandidates(
  state: AuthoritativeGameState,
  declaredAttack: PendingDeclaredAttack,
): AuthoritativePlayerState[] {
  if (declaredAttack.status !== 'AWAITING_INTERRUPT') return [];
  if (!state.rulesetId || state.rulesetId === 'classic') return [];

  const checked = new Set(declaredAttack.checkedCandidateIds);
  const candidates: Array<{ player: AuthoritativePlayerState; dist: number }> = [];

  for (const player of Object.values(state.players)) {
    if (!player.alive || isPlayerDormantPendingRevive(state, player)) continue;
    if (!player.revealed) continue;
    if (player.playerId === declaredAttack.attackerPlayerId) continue;
    if (checked.has(player.playerId)) continue;
    const effectiveSkill = getEffectiveSkillRoleId(state, player);
    if (effectiveSkill !== 'exp1_lloyd') continue;
    candidates.push({
      player,
      dist: computeSeatDistanceFromActive(state, player.playerId),
    });
  }

  candidates.sort((a, b) => {
    if (a.dist !== b.dist) return a.dist - b.dist;
    return a.player.playerId.localeCompare(b.player.playerId);
  });

  return candidates.map((c) => c.player);
}

/** Đánh dấu ứng viên đã được hỏi/xử lý (chống lặp & chống hỏi trùng). */
export function markAttackInterruptCandidateChecked(
  declaredAttack: PendingDeclaredAttack,
  candidatePlayerId: string,
): void {
  if (!declaredAttack.checkedCandidateIds.includes(candidatePlayerId)) {
    declaredAttack.checkedCandidateIds.push(candidatePlayerId);
  }
}

/**
 * True chỉ khi đòn tấn công đang ở trạng thái chờ ngắt (chưa bị hủy & chưa đổ xúc xắc).
 */
export function isPendingAttackCancellable(
  declaredAttack: PendingDeclaredAttack | null | undefined,
): boolean {
  return Boolean(declaredAttack && declaredAttack.status === 'AWAITING_INTERRUPT');
}

/**
 * Cam kết hủy đòn tấn công (idempotent): ngay lập tức đóng toàn bộ cửa sổ ngắt còn lại
 * của `declaredAttack` và trả về `true` nếu đây là lần hủy đầu tiên.
 */
export function commitPendingAttackCancellation(
  declaredAttack: PendingDeclaredAttack,
  cancellerPlayerId: string,
  nowMs: number,
): boolean {
  if (declaredAttack.status !== 'AWAITING_INTERRUPT') {
    return false;
  }
  markAttackInterruptCandidateChecked(declaredAttack, cancellerPlayerId);
  declaredAttack.status = 'CANCELLED';
  declaredAttack.cancelledByPlayerId = cancellerPlayerId;
  declaredAttack.cancelledAtMs = nowMs;
  return true;
}

/**
 * Khóa trạng thái `PROCEED` sau khi tất cả ứng viên đã bỏ qua/hết hạn —
 * từ thời điểm này không còn cho phép hủy ngược đòn tấn công nữa.
 */
export function markPendingAttackProceeding(
  declaredAttack: PendingDeclaredAttack,
): boolean {
  if (declaredAttack.status !== 'AWAITING_INTERRUPT') {
    return false;
  }
  declaredAttack.status = 'PROCEED';
  return true;
}
