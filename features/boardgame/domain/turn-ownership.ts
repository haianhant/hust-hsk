// ---------------------------------------------------------------------------
// features/boardgame/domain/turn-ownership.ts — TurnOwnershipOverride (Phase 7A)
//
// Phục vụ cơ chế chiếm quyền điều khiển lượt an toàn cho Voodoo (`exp1_voodoo`)
// và các kỹ năng sao chép Voodoo qua DynamicSkillCopy.
//
// Bất biến bảo mật & kiến trúc cốt lõi:
// 1. Tách bạch tuyệt đối 5 định danh:
//    - `activePlayerId`: chủ sở hữu lượt thực sự theo vòng lượt (`turnOrder`).
//    - `controllerPlayerId`: người chơi tạm thời được ủy quyền gửi hành động công khai.
//    - `actingPawnPlayerId`: quân cờ trên bàn thực thi di chuyển/địa điểm/tấn công.
//    - `privateInformationOwnerId`: chủ sở hữu thông tin bí mật (vai ẩn, thẻ Điều tra,
//      manh mối riêng, secret choice, reconnectToken).
//    - `controlGrantId`: mã cấp quyền tạm thời duy nhất, đơn điệu, chống phát lại.
// 2. Classic (`rulesetId === 'classic'`) KHÔNG BAO GIỜ chịu ảnh hưởng.
// 3. Controller TUYỆT ĐỐI KHÔNG được:
//    - Xem vai ẩn, bài điều tra (inv-*), manh mối riêng hay reconnectToken của nạn nhân.
//    - Gửi `REVEAL_ROLE`, `USE_SKILL`, `TRANSFER_TO_BETHANY`, `INVESTIGATE_CARD`
//      hoặc `RESOLVE_CHOICE` thuộc chủ sở hữu khác.
// 4. Khi nạn nhân rút thẻ Điều tra (`inv-*`), quyền điều khiển công khai tạm dừng
//    (`pausedForOwnerDecision = true`) để chính nạn nhân giải quyết thẻ bí mật.
// 5. Khi hết lượt, nạn nhân/controller bị loại hoặc quá hạn timeout, grant tự hết hạn
//    vĩnh viễn và ghi vào `expiredControlGrantIds` để chặn mọi nỗ lực phát lại.
// ---------------------------------------------------------------------------

import type { BoardGameActionPayload } from '../../../shared/contracts/boardgame';
import { getCardById } from './cards';
import { isPlayerDormantPendingRevive } from './pending-resurrection';
import type { AuthoritativeGameState, AuthoritativePlayerState } from './types';

const MAX_EXPIRED_CONTROL_GRANTS = 64;

export type TurnControlGrantStatus =
  | 'PENDING_NEXT_TURN'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLED';

export interface TurnControlGrant {
  readonly controlGrantId: string;
  readonly activePlayerId: string;
  readonly controllerPlayerId: string;
  readonly actingPawnPlayerId: string;
  readonly privateInformationOwnerId: string;
  readonly sourceRoleId: string;
  readonly grantedAtTurnNumber: number;
  readonly grantedAtMs: number;
  activeOnTurnNumber: number | null;
  status: TurnControlGrantStatus;
  /** Các lá bài Trắng/Đen công khai rút trong lượt bị điều khiển (TUYỆT ĐỐI không chứa `inv-*`). */
  publicDrawnCardIds: string[];
  expiredAtMs?: number;
  cancelReason?: string;
}

/** Danh mục hành động công khai ĐƯỢC PHÉP ủy quyền cho `controllerPlayerId`. */
export const TURN_CONTROL_AUTHORIZED_PUBLIC_ACTIONS: ReadonlySet<
  BoardGameActionPayload['type']
> = new Set<BoardGameActionPayload['type']>([
  'ROLL_DICE',
  'CHOOSE_DEST',
  'DRAW_CARD',
  'USE_LOC_POWER',
  'SKIP_LOC',
  'EQUIP_CARD',
  'USE_CARD',
  'ATTACK',
  'END_TURN',
]);

/** Danh mục hành động TUYỆT ĐỐI CẤM ủy quyền sang `controllerPlayerId`. */
export const TURN_CONTROL_PROHIBITED_CONTROLLER_ACTIONS: ReadonlySet<
  BoardGameActionPayload['type']
> = new Set<BoardGameActionPayload['type']>([
  'REVEAL_ROLE',
  'USE_SKILL',
  'TRANSFER_TO_BETHANY',
  'INVESTIGATE_CARD',
  'SET_REACTION_PREF',
  'RESOLVE_CHOICE',
]);

export interface TurnCommandAuthorityResult {
  readonly authorized: boolean;
  /** Quân cờ sẽ thực thi hành động (chính là `activePlayerId` khi hành động hợp lệ). */
  readonly actingPawnPlayerId: string | null;
  readonly viaControlGrantId?: string;
  readonly code?:
    | 'NOT_YOUR_TURN'
    | 'CONTROLLED_BY_OTHER'
    | 'PROHIBITED_CONTROLLER_ACTION'
    | 'PAUSED_FOR_PRIVATE_OWNER'
    | 'CONTROL_GRANT_EXPIRED';
  readonly reason?: string;
}

function isExpandedTurnControlMode(state: AuthoritativeGameState): boolean {
  return Boolean(state.rulesetId && state.rulesetId !== 'classic');
}

function ensureTurnControlContainers(state: AuthoritativeGameState): void {
  if (!state.expansionState) return;
  if (!Array.isArray(state.expansionState.pendingTurnControlGrants)) {
    state.expansionState.pendingTurnControlGrants = [];
  }
  if (!Array.isArray(state.expansionState.expiredControlGrantIds)) {
    state.expansionState.expiredControlGrantIds = [];
  }
}

function recordExpiredGrantId(state: AuthoritativeGameState, controlGrantId: string): void {
  if (!state.expansionState) return;
  ensureTurnControlContainers(state);
  const ledger = state.expansionState.expiredControlGrantIds!;
  if (!ledger.includes(controlGrantId)) {
    ledger.push(controlGrantId);
    if (ledger.length > MAX_EXPIRED_CONTROL_GRANTS) {
      ledger.splice(0, ledger.length - MAX_EXPIRED_CONTROL_GRANTS);
    }
  }
}

/** True khi người chơi đang giữ ít nhất 1 lá Điều tra (`inv-*`) bí mật trên tay. */
export function hasPendingPrivateInvestigationCard(
  player: AuthoritativePlayerState | null | undefined,
): boolean {
  if (!player) return false;
  return player.hand.some((cardId) => {
    const card = getCardById(cardId);
    return card?.deck === 'investigation' || cardId.startsWith('inv-');
  });
}

/** Lấy grant điều khiển lượt ĐANG HOẠT ĐỘNG hợp lệ cho lượt hiện tại (hoặc null). */
export function getActiveTurnControlGrant(
  state: AuthoritativeGameState,
): TurnControlGrant | null {
  if (!isExpandedTurnControlMode(state)) return null;
  const grant = state.expansionState?.activeTurnControl;
  if (!grant || grant.status !== 'ACTIVE') return null;
  if (!state.activePlayerId || grant.activePlayerId !== state.activePlayerId) return null;
  if (grant.activeOnTurnNumber !== state.turnNumber) return null;
  if (state.expansionState?.expiredControlGrantIds?.includes(grant.controlGrantId)) {
    return null;
  }
  return grant;
}

/**
 * True khi quyền điều khiển công khai của controller đang tạm dừng để
 * `privateInformationOwnerId` tự giải quyết thẻ Điều tra bí mật hoặc Pending Choice riêng.
 */
export function isTurnControlPausedForOwnerDecision(
  state: AuthoritativeGameState,
  grant?: TurnControlGrant | null,
): boolean {
  const activeGrant = grant ?? getActiveTurnControlGrant(state);
  if (!activeGrant) return false;
  const owner = state.players[activeGrant.privateInformationOwnerId];
  if (hasPendingPrivateInvestigationCard(owner)) {
    return true;
  }
  if (
    state.pendingChoice &&
    state.pendingChoice.ownerPlayerId === activeGrant.privateInformationOwnerId
  ) {
    return true;
  }
  return false;
}

/**
 * Trả về playerId đang thực sự chịu trách nhiệm ra quyết định hiện tại cho đồng hồ/timeout:
 * - Nếu có pendingChoice -> `pendingChoice.ownerPlayerId`.
 * - Nếu lượt bị chiếm quyền & KHÔNG tạm dừng cho nạn nhân -> `controllerPlayerId`.
 * - Ngược lại -> `state.activePlayerId`.
 */
export function getEffectiveTurnControllerId(
  state: AuthoritativeGameState,
): string | null {
  if (state.pendingChoice) {
    return state.pendingChoice.ownerPlayerId;
  }
  const grant = getActiveTurnControlGrant(state);
  if (grant && !isTurnControlPausedForOwnerDecision(state, grant)) {
    return grant.controllerPlayerId;
  }
  return state.activePlayerId;
}

/**
 * Xếp lịch chiếm quyền lượt tiếp theo của `victimPlayerId` (Deferred Hijack — Voodoo).
 * Trả về `TurnControlGrant` mới tạo (hoặc null nếu không hợp lệ).
 */
export function scheduleDeferredTurnControl(
  state: AuthoritativeGameState,
  params: {
    controllerPlayerId: string;
    victimPlayerId: string;
    sourceRoleId: string;
    nowMs: number;
  },
): TurnControlGrant | null {
  if (!isExpandedTurnControlMode(state) || !state.expansionState) return null;
  const { controllerPlayerId, victimPlayerId, sourceRoleId, nowMs } = params;
  if (controllerPlayerId === victimPlayerId) return null;

  const controller = state.players[controllerPlayerId];
  const victim = state.players[victimPlayerId];
  if (!controller || !controller.alive || isPlayerDormantPendingRevive(state, controller)) {
    return null;
  }
  if (!victim || !victim.alive || isPlayerDormantPendingRevive(state, victim)) {
    return null;
  }

  ensureTurnControlContainers(state);
  state.expansionState.eventSeq = (state.expansionState.eventSeq ?? 0) + 1;
  const controlGrantId = `tcg-${state.turnNumber}-${state.expansionState.eventSeq}-${nowMs}`;

  const grant: TurnControlGrant = {
    controlGrantId,
    activePlayerId: victimPlayerId,
    controllerPlayerId,
    actingPawnPlayerId: victimPlayerId,
    privateInformationOwnerId: victimPlayerId,
    sourceRoleId,
    grantedAtTurnNumber: state.turnNumber,
    grantedAtMs: nowMs,
    activeOnTurnNumber: null,
    status: 'PENDING_NEXT_TURN',
    publicDrawnCardIds: [],
  };

  state.expansionState.pendingTurnControlGrants!.push(grant);
  return grant;
}

/**
 * Kích hoạt grant đang chờ khi tới lượt tiếp theo của `activePlayerId`.
 * Nếu controller hoặc victim đã bị loại / đang ngủ đông, hủy grant sạch sẽ (không chuyển sang người khác).
 */
export function activateScheduledTurnControlForTurn(
  state: AuthoritativeGameState,
  activePlayerId: string,
  nowMs: number,
): TurnControlGrant | null {
  if (!isExpandedTurnControlMode(state) || !state.expansionState) return null;
  ensureTurnControlContainers(state);

  // Bảo đảm mọi grant cũ của lượt trước đã đóng hoàn toàn
  if (state.expansionState.activeTurnControl) {
    expireActiveTurnControl(state, 'turn-advanced', nowMs);
  }

  const queue = state.expansionState.pendingTurnControlGrants!;
  const idx = queue.findIndex(
    (g) => g.status === 'PENDING_NEXT_TURN' && g.activePlayerId === activePlayerId,
  );
  if (idx < 0) return null;

  const [candidate] = queue.splice(idx, 1);
  const controller = state.players[candidate.controllerPlayerId];
  const victim = state.players[candidate.activePlayerId];

  const controllerInvalid =
    !controller || !controller.alive || isPlayerDormantPendingRevive(state, controller);
  const victimInvalid =
    !victim || !victim.alive || isPlayerDormantPendingRevive(state, victim);

  if (controllerInvalid || victimInvalid) {
    candidate.status = 'CANCELLED';
    candidate.expiredAtMs = nowMs;
    candidate.cancelReason = controllerInvalid ? 'controller-unavailable' : 'victim-unavailable';
    recordExpiredGrantId(state, candidate.controlGrantId);
    return null;
  }

  candidate.status = 'ACTIVE';
  candidate.activeOnTurnNumber = state.turnNumber;
  candidate.publicDrawnCardIds = [];
  state.expansionState.activeTurnControl = candidate;
  return candidate;
}

/**
 * Kết thúc vĩnh viễn grant điều khiển lượt hiện tại và ghi nhận chống phát lại.
 */
export function expireActiveTurnControl(
  state: AuthoritativeGameState,
  reason: string,
  nowMs: number,
): TurnControlGrant | null {
  if (!state.expansionState?.activeTurnControl) return null;
  const grant = state.expansionState.activeTurnControl;
  grant.status = reason === 'turn-completed' || reason === 'turn-advanced' ? 'EXPIRED' : 'CANCELLED';
  grant.expiredAtMs = nowMs;
  grant.cancelReason = reason;
  recordExpiredGrantId(state, grant.controlGrantId);
  state.expansionState.activeTurnControl = null;
  return grant;
}

/**
 * Hủy toàn bộ grant đang chờ hoặc đang hoạt động liên quan tới `playerId`
 * (gọi khi victim hoặc controller bị loại / ngủ đông trước hoặc giữa lượt chiếm quyền).
 */
export function cancelTurnControlForPlayer(
  state: AuthoritativeGameState,
  playerId: string,
  reason: string,
  nowMs: number,
): number {
  if (!state.expansionState) return 0;
  ensureTurnControlContainers(state);
  let cancelled = 0;

  const active = state.expansionState.activeTurnControl;
  if (
    active &&
    (active.activePlayerId === playerId || active.controllerPlayerId === playerId)
  ) {
    expireActiveTurnControl(state, reason, nowMs);
    cancelled += 1;
  }

  const remaining: TurnControlGrant[] = [];
  for (const g of state.expansionState.pendingTurnControlGrants!) {
    if (g.activePlayerId === playerId || g.controllerPlayerId === playerId) {
      g.status = 'CANCELLED';
      g.expiredAtMs = nowMs;
      g.cancelReason = reason;
      recordExpiredGrantId(state, g.controlGrantId);
      cancelled += 1;
    } else {
      remaining.push(g);
    }
  }
  state.expansionState.pendingTurnControlGrants = remaining;
  return cancelled;
}

/**
 * Kiểm tra chống phát lại mã grant đã hết hạn hoặc không còn hợp lệ.
 */
export function isControlGrantValidAndNotReplayed(
  state: AuthoritativeGameState,
  controlGrantId: string,
): boolean {
  if (!controlGrantId) return false;
  if (state.expansionState?.expiredControlGrantIds?.includes(controlGrantId)) {
    return false;
  }
  const active = getActiveTurnControlGrant(state);
  return Boolean(active && active.controlGrantId === controlGrantId);
}

/**
 * Ghi nhận lá bài Trắng/Đen CÔNG KHAI vừa rút trong lượt bị chiếm quyền
 * để controller có thể giải quyết `EQUIP_CARD` / `USE_CARD` mà KHÔNG bao giờ thấy
 * lá Điều tra (`inv-*`) hay thông tin riêng tư của nạn nhân.
 */
export function recordPublicCardDrawnDuringControlledTurn(
  state: AuthoritativeGameState,
  cardId: string,
): void {
  const grant = getActiveTurnControlGrant(state);
  if (!grant) return;
  const card = getCardById(cardId);
  if (!card || card.deck === 'investigation' || cardId.startsWith('inv-')) {
    return;
  }
  if (!grant.publicDrawnCardIds.includes(cardId)) {
    grant.publicDrawnCardIds.push(cardId);
  }
}

/** Gỡ bỏ mã thẻ công khai sau khi đã trang bị / kích hoạt / hủy bỏ. */
export function syncControlledTurnPublicDrawnCards(
  state: AuthoritativeGameState,
): void {
  const grant = getActiveTurnControlGrant(state);
  if (!grant) return;
  const victim = state.players[grant.actingPawnPlayerId];
  if (!victim) {
    grant.publicDrawnCardIds = [];
    return;
  }
  grant.publicDrawnCardIds = grant.publicDrawnCardIds.filter((cid) =>
    victim.hand.includes(cid),
  );
}

/**
 * Cổng xác thực thẩm quyền điều khiển lượt (Server-Authoritative Gate).
 *
 * - Classic: chỉ chấp nhận `senderPlayerId === state.activePlayerId`.
 * - Expanded không có grant: chỉ chấp nhận `senderPlayerId === state.activePlayerId`.
 * - Expanded đang có `TurnControlGrant` hợp lệ:
 *   1. Kiểm tra `sender` còn sống & không ngủ đông.
 *   2. Nếu nạn nhân giữ lá Điều tra (`inv-*`), TẠM DỪNG quyền công khai:
 *      chỉ nạn nhân (`privateInformationOwnerId`) được gửi `INVESTIGATE_CARD`!
 *   3. Với hành động bị cấm (`REVEAL_ROLE`, `USE_SKILL`, `TRANSFER_TO_BETHANY`,
 *      `INVESTIGATE_CARD` không có thẻ): từ chối cứng controller (và chặn nạn nhân
 *      gửi lệnh tranh chấp công khai trong lúc bị điều khiển).
 *   4. Với hành động công khai được phép: chỉ `controllerPlayerId` được phép gửi,
 *      và `actingPawnPlayerId` trả về chính là `grant.actingPawnPlayerId` (nạn nhân).
 *   5. Nếu controller cố gửi `USE_CARD`/`EQUIP_CARD` với một lá `inv-*`, từ chối cứng!
 */
export function resolveTurnCommandAuthority(
  state: AuthoritativeGameState,
  senderPlayerId: string,
  action: BoardGameActionPayload,
): TurnCommandAuthorityResult {
  if (!state.activePlayerId) {
    return {
      authorized: false,
      actingPawnPlayerId: null,
      code: 'NOT_YOUR_TURN',
      reason: 'Hiện không có người chơi đang trong lượt.',
    };
  }

  const grant = getActiveTurnControlGrant(state);
  if (!grant) {
    if (senderPlayerId !== state.activePlayerId) {
      return {
        authorized: false,
        actingPawnPlayerId: null,
        code: 'NOT_YOUR_TURN',
        reason: 'Chưa tới lượt của bạn.',
      };
    }
    return {
      authorized: true,
      actingPawnPlayerId: state.activePlayerId,
    };
  }

  const controller = state.players[grant.controllerPlayerId];
  const victim = state.players[grant.actingPawnPlayerId];
  if (
    !controller ||
    !controller.alive ||
    isPlayerDormantPendingRevive(state, controller) ||
    !victim ||
    !victim.alive ||
    isPlayerDormantPendingRevive(state, victim)
  ) {
    return {
      authorized: false,
      actingPawnPlayerId: null,
      code: 'CONTROL_GRANT_EXPIRED',
      reason: 'Quyền điều khiển lượt đã hết hiệu lực.',
    };
  }

  const ownerHasPrivateInv = hasPendingPrivateInvestigationCard(victim);

  // Trường hợp tạm dừng để nạn nhân tự xử lý thẻ Điều tra (inv-*) riêng tư
  if (ownerHasPrivateInv) {
    if (
      senderPlayerId === grant.privateInformationOwnerId &&
      action.type === 'INVESTIGATE_CARD'
    ) {
      return {
        authorized: true,
        actingPawnPlayerId: grant.actingPawnPlayerId,
        viaControlGrantId: grant.controlGrantId,
      };
    }
    if (senderPlayerId === grant.controllerPlayerId) {
      return {
        authorized: false,
        actingPawnPlayerId: null,
        code: 'PAUSED_FOR_PRIVATE_OWNER',
        reason:
          'Quyền điều khiển tạm dừng để chủ lượt tự giải quyết lá bài Điều tra bí mật.',
      };
    }
    return {
      authorized: false,
      actingPawnPlayerId: null,
      code: 'PAUSED_FOR_PRIVATE_OWNER',
      reason: 'Bạn cần giải quyết lá bài Điều tra bí mật trên tay trước khi tiếp tục.',
    };
  }

  // Controller gửi lệnh
  if (senderPlayerId === grant.controllerPlayerId) {
    if (TURN_CONTROL_PROHIBITED_CONTROLLER_ACTIONS.has(action.type)) {
      return {
        authorized: false,
        actingPawnPlayerId: null,
        code: 'PROHIBITED_CONTROLLER_ACTION',
        reason:
          'Con Rối (Voodoo): Không được xem vai ẩn, tự lộ diện, dùng kỹ năng nhân vật hay xử lý thẻ bí mật của nạn nhân.',
      };
    }
    if (!TURN_CONTROL_AUTHORIZED_PUBLIC_ACTIONS.has(action.type)) {
      return {
        authorized: false,
        actingPawnPlayerId: null,
        code: 'PROHIBITED_CONTROLLER_ACTION',
        reason: 'Hành động này không được phép thực hiện trong lượt điều khiển.',
      };
    }
    if (
      (action.type === 'USE_CARD' || action.type === 'EQUIP_CARD') &&
      action.cardId.startsWith('inv-')
    ) {
      return {
        authorized: false,
        actingPawnPlayerId: null,
        code: 'PROHIBITED_CONTROLLER_ACTION',
        reason: 'Không được truy cập hoặc sử dụng lá bài Điều tra bí mật của nạn nhân.',
      };
    }
    return {
      authorized: true,
      actingPawnPlayerId: grant.actingPawnPlayerId,
      viaControlGrantId: grant.controlGrantId,
    };
  }

  // Nạn nhân cố gửi lệnh tranh chấp công khai khi đang bị Voodoo chiếm quyền
  if (senderPlayerId === grant.activePlayerId) {
    return {
      authorized: false,
      actingPawnPlayerId: null,
      code: 'CONTROLLED_BY_OTHER',
      reason: `Lượt này của bạn đang bị ${controller.displayName} điều khiển (Con Rối).`,
    };
  }

  return {
    authorized: false,
    actingPawnPlayerId: null,
    code: 'NOT_YOUR_TURN',
    reason: 'Chưa tới lượt của bạn.',
  };
}
