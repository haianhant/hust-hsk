// ---------------------------------------------------------------------------
// features/boardgame/domain/pending-resurrection.ts — PendingResurrection (Phase 7A)
//
// Quản lý vòng đời chính tắc của người chơi trong chế độ mở rộng:
//   ALIVE -> DORMANT_PENDING_REVIVE -> REVIVED -> FINAL_ELIMINATED
//
// Phục vụ trực tiếp cho Undead (`exp1_undead`) và các nhân vật sao chép
// năng lực hồi sinh của Undead qua DynamicSkillCopy (Vengeful Spirit / Antimony).
//
// Bất biến cốt lõi:
// 1. Classic (`rulesetId === 'classic'`) KHÔNG BAO GIỜ tạo `DORMANT_PENDING_REVIVE`.
// 2. Sự kiện chí tử lần 1 chuyển Undead sang `DORMANT_PENDING_REVIVE`:
//    - Lộ diện Undead ngay lúc đó.
//    - Không tính là bị loại hoàn toàn (không kích hoạt thắng phe Hunter,
//      không thưởng loot trang bị, không kích hoạt Daniel/Charles/Gideon/
//      Wendigo/Vengeful Spirit/Antimony/Bonnie/Cain).
//    - Giữ nguyên toàn bộ trang bị đang đeo; không thể hành động hay bị nhắm mục tiêu.
// 3. Đầu lượt kế tiếp của chính Undead: hồi sinh server-authoritative với 6 HP
//    (`hp = min(maxHp, 6)`), chuyển sang `REVIVED`, đánh dấu đã tiêu hao 1 lượt hồi sinh.
// 4. Sự kiện chí tử lần 2 -> `FINAL_ELIMINATED` (trạng thái kết thúc vĩnh viễn).
// ---------------------------------------------------------------------------

import type { BoardGamePlayerLifecycleState } from '../../../shared/contracts/boardgame';
import { getCopiedSkillBinding, getEffectiveSkillRoleId } from './dynamic-skill-copy';
import type { AuthoritativeGameState, AuthoritativePlayerState } from './types';

export type PlayerLifecycleState = BoardGamePlayerLifecycleState;

export const UNDEAD_REVIVE_HP = 6 as const;

export interface PlayerLifecycleRecord {
  lifecycleState: PlayerLifecycleState;
  resurrectionChargesUsed: number;
  reviveHpTarget: number;
  dormantEnteredAtTurn?: number;
  dormantEnteredAtMs?: number;
  dormantEventId?: string;
  revivedAtTurn?: number;
  revivedAtMs?: number;
  finalEliminatedAtTurn?: number;
  finalEliminatedAtMs?: number;
}

/**
 * 10 bước chuẩn của Giao dịch Loại khỏi Trận (Elimination Transaction Ordering — Section 9).
 * Hằng số dùng chung cho audit, telemetry & kiểm thử hồi quy.
 */
export const ELIMINATION_TRANSACTION_STAGES = [
  '1_DAMAGE_APPLICATION',
  '2_DEFENSIVE_REACTIONS_AND_PREVENTION',
  '3_LETHAL_STATE_CLASSIFICATION',
  '4_PENDING_RESURRECTION_CHECK',
  '5_COMMITTED_ELIMINATION',
  '6_ON_ELIMINATION_SKILL_TRIGGERS',
  '7_COPY_AND_AFFILIATION_HOOKS',
  '8_EQUIPMENT_LOOT_AND_CLEANUP',
  '9_VICTORY_CANDIDATE_COLLECTION',
  '10_FINAL_VICTORY_RESOLUTION',
] as const;

export type EliminationTransactionStage = (typeof ELIMINATION_TRANSACTION_STAGES)[number];

function ensureLifecycleMap(
  state: AuthoritativeGameState,
): Record<string, PlayerLifecycleRecord> | null {
  if (!state.expansionState) return null;
  if (!state.expansionState.lifecycleByPlayer) {
    state.expansionState.lifecycleByPlayer = {};
  }
  return state.expansionState.lifecycleByPlayer;
}

/**
 * Truy vấn trạng thái vòng đời chính tắc của người chơi.
 * Tương thích ngược 100% với Classic & state cũ chưa có `lifecycleByPlayer`.
 */
export function getPlayerLifecycleState(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState | null | undefined,
): PlayerLifecycleState {
  if (!player) return 'FINAL_ELIMINATED';
  const rec = state.expansionState?.lifecycleByPlayer?.[player.playerId];
  if (rec) return rec.lifecycleState;
  return player.alive ? 'ALIVE' : 'FINAL_ELIMINATED';
}

export function getPlayerLifecycleRecord(
  state: AuthoritativeGameState,
  playerId: string,
): PlayerLifecycleRecord | null {
  return state.expansionState?.lifecycleByPlayer?.[playerId] ?? null;
}

/** True khi người chơi đang ở trạng thái ngủ đông chờ hồi sinh vào đầu lượt kế tiếp. */
export function isPlayerDormantPendingRevive(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState | null | undefined,
): boolean {
  return getPlayerLifecycleState(state, player) === 'DORMANT_PENDING_REVIVE';
}

/**
 * True khi người chơi đang sống HOẶC đang chờ hồi sinh.
 * Dùng cho bộ đếm phe chiến thắng (ngăn Hunter thắng sớm khi Undead là Shadow cuối cùng!).
 */
export function isPlayerLivingOrPendingRevive(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState | null | undefined,
): boolean {
  if (!player) return false;
  const lc = getPlayerLifecycleState(state, player);
  return lc === 'ALIVE' || lc === 'REVIVED' || lc === 'DORMANT_PENDING_REVIVE';
}

/**
 * True CHỈ khi người chơi đã bị loại vĩnh viễn (`FINAL_ELIMINATED`).
 * Dùng cho `deadCount`, điều kiện thắng Neutral (Daniel, Charles, Cindy, Cain),
 * loot trang bị và mọi trigger `ON_ELIMINATION` (Wendigo, Gideon, Vengeful Spirit, Antimony).
 */
export function isPlayerFinallyEliminated(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState | null | undefined,
): boolean {
  if (!player) return true;
  return getPlayerLifecycleState(state, player) === 'FINAL_ELIMINATED';
}

/**
 * True khi người chơi có thể bị chọn làm mục tiêu tấn công, bài, kỹ năng hoặc hồi máu.
 * Người chơi đang `DORMANT_PENDING_REVIVE` TUYỆT ĐỐI không thể bị nhắm mục tiêu hay nhận sát thương.
 */
export function isPlayerTargetable(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState | null | undefined,
): boolean {
  if (!player || !player.alive) return false;
  return !isPlayerDormantPendingRevive(state, player);
}

/**
 * True khi ghế người chơi được phép dừng tới lượt trong `advanceTurn`:
 * gồm người đang sống VÀ người đang chờ hồi sinh (`DORMANT_PENDING_REVIVE`).
 */
export function isPlayerTurnEligible(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState | null | undefined,
): boolean {
  if (!player) return false;
  return player.alive || isPlayerDormantPendingRevive(state, player);
}

/**
 * Kiểm tra liệu người chơi có đủ điều kiện chặn sự kiện chí tử lần 1
 * để chuyển sang `DORMANT_PENDING_REVIVE` (Undead gốc hoặc bản sao kỹ năng Undead).
 */
export function canPlayerEnterPendingResurrection(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
): boolean {
  if (!state.rulesetId || state.rulesetId === 'classic') return false;
  if (!state.expansionState) return false;

  const currentLifecycle = getPlayerLifecycleState(state, player);
  if (currentLifecycle === 'DORMANT_PENDING_REVIVE' || currentLifecycle === 'FINAL_ELIMINATED') {
    return false;
  }

  const effectiveSkillRole = getEffectiveSkillRoleId(state, player) as string;
  if (effectiveSkillRole !== 'exp1_undead') {
    return false;
  }

  // Nếu là bản sao kỹ năng Undead (Antimony / Vengeful Spirit): theo dõi riêng lượt hồi sinh của bản sao
  const copied = getCopiedSkillBinding(state, player.playerId);
  if (copied && (copied.effectiveSkillRoleId as string) === 'exp1_undead') {
    return (copied.resurrectionChargesUsed ?? 0) === 0 && !copied.skillUsedOnce;
  }

  // Undead gốc: chỉ 1 lần duy nhất mỗi trận
  const rec = getPlayerLifecycleRecord(state, player.playerId);
  const usedCharges = rec?.resurrectionChargesUsed ?? 0;
  return usedCharges === 0 && !player.skillUsedOnce && currentLifecycle === 'ALIVE';
}

/**
 * Kiểm tra xem người chơi có đang bị ràng buộc đặc biệt "Chỉ lộ diện khi chết"
 * (Undead trước sự kiện chí tử lần đầu — chặn tự lộ diện và miễn ép lộ diện).
 */
export function isUndeadPreLethalRevealRestricted(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
): boolean {
  if (!state.rulesetId || state.rulesetId === 'classic') return false;
  if ((player.roleId as string) !== 'exp1_undead') return false;
  if (player.revealed) return false;
  const lc = getPlayerLifecycleState(state, player);
  const rec = getPlayerLifecycleRecord(state, player.playerId);
  return lc === 'ALIVE' && (rec?.resurrectionChargesUsed ?? 0) === 0 && !player.skillUsedOnce;
}

export interface EnterDormantResult {
  readonly entered: boolean;
  readonly duplicateEvent?: boolean;
  readonly record?: PlayerLifecycleRecord;
}

/**
 * Chuyển người chơi sang trạng thái `DORMANT_PENDING_REVIVE` tại bước 4 của
 * Elimination Transaction Ordering (nguyên tử & idempotent theo `eventId`).
 *
 * Lưu ý: KHÔNG chạm `firstDeadPlayerId`, KHÔNG đặt `eliminatedRound`,
 * KHÔNG cướp/hủy trang bị, KHÔNG kích hoạt death trigger!
 */
export function enterDormantPendingRevive(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
  eventId: string,
  nowMs: number,
  reviveHpTarget: number = UNDEAD_REVIVE_HP,
): EnterDormantResult {
  const map = ensureLifecycleMap(state);
  if (!map) return { entered: false };

  const existing = map[player.playerId];
  if (existing?.dormantEventId === eventId) {
    return { entered: false, duplicateEvent: true, record: existing };
  }
  if (!canPlayerEnterPendingResurrection(state, player)) {
    return { entered: false };
  }

  const safeReviveHp = Math.max(1, Math.min(player.maxHp, Math.floor(reviveHpTarget)));
  const record: PlayerLifecycleRecord = {
    lifecycleState: 'DORMANT_PENDING_REVIVE',
    resurrectionChargesUsed: existing?.resurrectionChargesUsed ?? 0,
    reviveHpTarget: safeReviveHp,
    dormantEnteredAtTurn: state.turnNumber,
    dormantEnteredAtMs: nowMs,
    dormantEventId: eventId,
  };
  map[player.playerId] = record;

  // Giữ nguyên `equipped` & lịch sử trước đó; chỉ tắt trạng thái sống tạm thời và lật vai công khai
  player.hp = 0;
  player.woundsTaken = player.maxHp;
  player.alive = false;
  player.guardianShieldActive = false;
  player.revealed = true;

  return { entered: true, record };
}

export interface ReviveResult {
  readonly revived: boolean;
  readonly restoredHp: number;
  readonly record?: PlayerLifecycleRecord;
}

/**
 * Thực thi hồi sinh server-authoritative ở đầu lượt kế tiếp của chính người chơi
 * (`DORMANT_PENDING_REVIVE -> REVIVED` với `hp = min(maxHp, 6)`).
 */
export function reviveDormantPlayerAtTurnStart(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
  nowMs: number,
): ReviveResult {
  const map = ensureLifecycleMap(state);
  if (!map) return { revived: false, restoredHp: 0 };

  const rec = map[player.playerId];
  if (!rec || rec.lifecycleState !== 'DORMANT_PENDING_REVIVE') {
    return { revived: false, restoredHp: 0 };
  }

  const restoredHp = Math.max(1, Math.min(player.maxHp, rec.reviveHpTarget || UNDEAD_REVIVE_HP));
  rec.lifecycleState = 'REVIVED';
  rec.resurrectionChargesUsed += 1;
  rec.revivedAtTurn = state.turnNumber;
  rec.revivedAtMs = nowMs;

  player.alive = true;
  player.hp = restoredHp;
  player.woundsTaken = Math.max(0, player.maxHp - restoredHp);

  // Tiêu hao lượt dùng 1 lần trên đúng thực thể kỹ năng (Undead gốc hoặc bản sao)
  const copied = getCopiedSkillBinding(state, player.playerId);
  if (copied && (copied.effectiveSkillRoleId as string) === 'exp1_undead') {
    copied.resurrectionChargesUsed = (copied.resurrectionChargesUsed ?? 0) + 1;
    copied.skillUsedOnce = true;
  } else {
    player.skillUsedOnce = true;
  }

  return { revived: true, restoredHp, record: rec };
}

/**
 * Đánh dấu loại vĩnh viễn (`FINAL_ELIMINATED` — trạng thái kết thúc, không thể hồi sinh nữa).
 */
export function commitFinalEliminationLifecycle(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
  nowMs: number,
): PlayerLifecycleRecord | null {
  const map = ensureLifecycleMap(state);
  if (!map) return null;

  const existing = map[player.playerId];
  const record: PlayerLifecycleRecord = {
    lifecycleState: 'FINAL_ELIMINATED',
    resurrectionChargesUsed: existing?.resurrectionChargesUsed ?? 0,
    reviveHpTarget: existing?.reviveHpTarget ?? UNDEAD_REVIVE_HP,
    ...(existing?.dormantEnteredAtTurn !== undefined
      ? { dormantEnteredAtTurn: existing.dormantEnteredAtTurn }
      : {}),
    ...(existing?.dormantEnteredAtMs !== undefined
      ? { dormantEnteredAtMs: existing.dormantEnteredAtMs }
      : {}),
    ...(existing?.dormantEventId ? { dormantEventId: existing.dormantEventId } : {}),
    ...(existing?.revivedAtTurn !== undefined ? { revivedAtTurn: existing.revivedAtTurn } : {}),
    ...(existing?.revivedAtMs !== undefined ? { revivedAtMs: existing.revivedAtMs } : {}),
    finalEliminatedAtTurn: state.turnNumber,
    finalEliminatedAtMs: nowMs,
  };
  map[player.playerId] = record;
  return record;
}
