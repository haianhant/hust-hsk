// ---------------------------------------------------------------------------
// features/boardgame/domain/equipment-transactions.ts — Authoritative Equipment
// Theft & Transfer Transaction Model (Phase 6A).
//
// Phục vụ:
// - Colt (`exp2_colt`): phân biệt cướp trang bị thật (`theft-court`, `theft-moody-goblin`,
//   `theft-bob`) với chuyển tặng tự nguyện; hỗ trợ thu hồi nguyên tử đúng vật phẩm bị cướp
//   khi gây >= 2 ST mà tuyệt đối không nhân bản hay làm biến mất trang bị.
// - Bethany (`exp1_bethany`): chuyển tặng trang bị hợp lệ (cấm Masamune `ev-01`)
//   với xác thực sở hữu & chống replay trên server.
// ---------------------------------------------------------------------------

import { getCardById, MASAMUNE_CARD_ID } from './cards';
import { equipToPlayerSlot } from './effects';
import type { AuthoritativeGameState } from './types';

const MAX_STORED_EQUIPMENT_TX = 64;

export type EquipmentTransferReason =
  | 'theft-court'
  | 'theft-moody-goblin'
  | 'theft-bob'
  | 'gift-banana'
  | 'gift-bryon'
  | 'gift-hermit'
  | 'bethany-designate'
  | 'bethany-offer'
  | 'elimination-loot'
  | 'colt-reclaim';

export type EquipmentTransactionStatus =
  | 'pending-reaction'
  | 'committed'
  | 'rolled-back';

export interface EquipmentTransferTransaction {
  readonly txId: string;
  readonly idempotencyKey: string;
  readonly cardId: string;
  readonly fromPlayerId: string;
  readonly toPlayerId: string;
  readonly reason: EquipmentTransferReason;
  readonly sourceCardId: string | null;
  status: EquipmentTransactionStatus;
  readonly createdTurnNumber: number;
  readonly createdAtMs: number;
  resolvedAtMs?: number;
  readonly parentTxId?: string;
}

export interface ExecuteEquipmentTransferInput {
  readonly cardId: string;
  readonly fromPlayerId: string;
  readonly toPlayerId: string;
  readonly reason: EquipmentTransferReason;
  readonly sourceCardId?: string | null;
  readonly idempotencyKey: string;
  readonly nowMs: number;
  readonly pendingReaction?: boolean;
  readonly disallowMasamune?: boolean;
}

export type ExecuteEquipmentTransferResult =
  | {
      readonly ok: true;
      readonly transaction: EquipmentTransferTransaction;
      readonly cardTitle: string;
    }
  | {
      readonly ok: false;
      readonly reason:
        | 'duplicate-transaction'
        | 'invalid-players'
        | 'same-player'
        | 'masamune-forbidden'
        | 'item-not-owned'
        | 'missing-expansion-state';
    };

export type ReclaimEquipmentTransactionResult =
  | {
      readonly ok: true;
      readonly cardId: string;
      readonly cardTitle: string;
      readonly originalTx: EquipmentTransferTransaction;
      readonly reclaimTx: EquipmentTransferTransaction;
    }
  | {
      readonly ok: false;
      readonly reason:
        | 'tx-not-found'
        | 'tx-not-pending'
        | 'owner-dead'
        | 'item-no-longer-held-by-thief'
        | 'missing-expansion-state';
    };

const GENUINE_THEFT_REASONS: ReadonlySet<EquipmentTransferReason> =
  new Set<EquipmentTransferReason>([
    'theft-court',
    'theft-moody-goblin',
    'theft-bob',
  ]);

const VOLUNTARY_MASAMUNE_BLOCKED_REASONS: ReadonlySet<EquipmentTransferReason> =
  new Set<EquipmentTransferReason>([
    'bethany-designate',
    'bethany-offer',
    'gift-bryon',
  ]);

export function isGenuineTheftReason(reason: EquipmentTransferReason): boolean {
  return GENUINE_THEFT_REASONS.has(reason);
}

function nextEquipmentTxId(state: AuthoritativeGameState): string {
  const exp = state.expansionState!;
  exp.eventSeq += 1;
  return `eqtx-${state.turnNumber}-${exp.eventSeq}`;
}

function pushEquipmentTransaction(
  state: AuthoritativeGameState,
  tx: EquipmentTransferTransaction,
): void {
  const exp = state.expansionState!;
  if (!Array.isArray(exp.equipmentTransactions)) {
    exp.equipmentTransactions = [];
  }
  exp.equipmentTransactions.push(tx);
  if (exp.equipmentTransactions.length > MAX_STORED_EQUIPMENT_TX) {
    exp.equipmentTransactions.splice(0, exp.equipmentTransactions.length - MAX_STORED_EQUIPMENT_TX);
  }
}

export function findEquipmentTransaction(
  state: AuthoritativeGameState,
  txId: string,
): EquipmentTransferTransaction | null {
  const list = state.expansionState?.equipmentTransactions;
  if (!Array.isArray(list)) return null;
  return list.find((t) => t.txId === txId) ?? null;
}

/**
 * Thực thi chuyển/cướp 1 trang bị theo mô hình giao dịch nguyên tử:
 * - Chống replay theo `idempotencyKey`.
 * - Xác thực sở hữu thực sự trên `fromPlayer.equipped`.
 * - Cấm chuyển tặng Masamune (`ev-01`) đối với các giao dịch tự nguyện.
 * - Bảo toàn tuyệt đối tổng số bản thể thẻ trên bàn (không nhân bản, không tiêu hủy âm thầm).
 */
export function executeEquipmentTransferTransaction(
  state: AuthoritativeGameState,
  input: ExecuteEquipmentTransferInput,
): ExecuteEquipmentTransferResult {
  const exp = state.expansionState;
  if (!exp) {
    return { ok: false, reason: 'missing-expansion-state' };
  }
  if (!Array.isArray(exp.equipmentTransactions)) {
    exp.equipmentTransactions = [];
  }

  if (exp.equipmentTransactions.some((t) => t.idempotencyKey === input.idempotencyKey)) {
    return { ok: false, reason: 'duplicate-transaction' };
  }

  if (input.fromPlayerId === input.toPlayerId) {
    return { ok: false, reason: 'same-player' };
  }

  const fromPlayer = state.players[input.fromPlayerId];
  const toPlayer = state.players[input.toPlayerId];
  if (!fromPlayer || !toPlayer) {
    return { ok: false, reason: 'invalid-players' };
  }

  const forbidMasamune =
    Boolean(input.disallowMasamune) || VOLUNTARY_MASAMUNE_BLOCKED_REASONS.has(input.reason);
  if (forbidMasamune && input.cardId === MASAMUNE_CARD_ID) {
    return { ok: false, reason: 'masamune-forbidden' };
  }

  const idx = fromPlayer.equipped.indexOf(input.cardId);
  if (idx === -1) {
    return { ok: false, reason: 'item-not-owned' };
  }

  const [movedCardId] = fromPlayer.equipped.splice(idx, 1);
  equipToPlayerSlot(toPlayer, movedCardId);

  const tx: EquipmentTransferTransaction = {
    txId: nextEquipmentTxId(state),
    idempotencyKey: input.idempotencyKey,
    cardId: movedCardId,
    fromPlayerId: fromPlayer.playerId,
    toPlayerId: toPlayer.playerId,
    reason: input.reason,
    sourceCardId: input.sourceCardId ?? null,
    status: input.pendingReaction ? 'pending-reaction' : 'committed',
    createdTurnNumber: state.turnNumber,
    createdAtMs: input.nowMs,
    ...(input.pendingReaction ? {} : { resolvedAtMs: input.nowMs }),
  };

  pushEquipmentTransaction(state, tx);
  const card = getCardById(movedCardId);
  return {
    ok: true,
    transaction: tx,
    cardTitle: card?.title ?? movedCardId,
  };
}

/** Chốt giao dịch `pending-reaction` -> `committed` (khi Colt bỏ qua hoặc chọn gây sát thương). */
export function commitEquipmentTransaction(
  state: AuthoritativeGameState,
  txId: string,
  nowMs: number,
): boolean {
  const tx = findEquipmentTransaction(state, txId);
  if (!tx || tx.status !== 'pending-reaction') return false;
  tx.status = 'committed';
  tx.resolvedAtMs = nowMs;
  return true;
}

/**
 * Thu hồi nguyên tử đúng vật phẩm vừa bị cướp (dùng khi Colt đạt >= 2 ST và chọn đòi lại đồ):
 * - Chỉ cho phép khi giao dịch đang ở trạng thái `'pending-reaction'` (không rollback 2 lần!).
 * - Kiểm tra lại quyền sở hữu hiện thời trên `toPlayer.equipped` (an toàn sau reconnect/tranh chấp).
 * - Di chuyển đúng 1 bản thể thẻ từ `toPlayer.equipped` trả về `fromPlayer.equipped`.
 */
export function reclaimStolenEquipmentTransaction(
  state: AuthoritativeGameState,
  txId: string,
  nowMs: number,
): ReclaimEquipmentTransactionResult {
  const exp = state.expansionState;
  if (!exp) {
    return { ok: false, reason: 'missing-expansion-state' };
  }
  const tx = findEquipmentTransaction(state, txId);
  if (!tx) {
    return { ok: false, reason: 'tx-not-found' };
  }
  if (tx.status !== 'pending-reaction') {
    return { ok: false, reason: 'tx-not-pending' };
  }

  const originalOwner = state.players[tx.fromPlayerId];
  const thief = state.players[tx.toPlayerId];
  if (!originalOwner || !originalOwner.alive) {
    return { ok: false, reason: 'owner-dead' };
  }
  if (!thief) {
    return { ok: false, reason: 'item-no-longer-held-by-thief' };
  }

  const idxInThief = thief.equipped.indexOf(tx.cardId);
  if (idxInThief === -1) {
    // Vật phẩm đã bị chuyển/mất bởi hiệu ứng khác: không bao giờ tạo bản sao ảo!
    tx.status = 'committed';
    tx.resolvedAtMs = nowMs;
    return { ok: false, reason: 'item-no-longer-held-by-thief' };
  }

  const [reclaimedCardId] = thief.equipped.splice(idxInThief, 1);
  equipToPlayerSlot(originalOwner, reclaimedCardId);

  tx.status = 'rolled-back';
  tx.resolvedAtMs = nowMs;

  const reclaimTx: EquipmentTransferTransaction = {
    txId: nextEquipmentTxId(state),
    idempotencyKey: `reclaim:${tx.txId}`,
    cardId: reclaimedCardId,
    fromPlayerId: thief.playerId,
    toPlayerId: originalOwner.playerId,
    reason: 'colt-reclaim',
    sourceCardId: null,
    status: 'committed',
    createdTurnNumber: state.turnNumber,
    createdAtMs: nowMs,
    resolvedAtMs: nowMs,
    parentTxId: tx.txId,
  };
  pushEquipmentTransaction(state, reclaimTx);

  const card = getCardById(reclaimedCardId);
  return {
    ok: true,
    cardId: reclaimedCardId,
    cardTitle: card?.title ?? reclaimedCardId,
    originalTx: tx,
    reclaimTx,
  };
}
