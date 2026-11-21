// ---------------------------------------------------------------------------
// features/boardgame/domain/copied-victory-graph.ts — CAP-07 Pure Copied &
// Linked Victory Dependency Graph (Phase 6A).
//
// Nguyên tắc kiến trúc cốt lõi:
// - Tách bạch tuyệt đối 3 quan hệ:
//   1. `COPY_GOAL`          (Cassie, Clairvoyant) — sao chép ĐIỀU KIỆN THẮNG và
//      đánh giá bằng trạng thái của chính người sao chép (KHÔNG phải ăn theo kết quả!).
//   2. `SHARE_OUTCOME`      (Bethany) — thắng khi người được chọn thắng.
//   3. `CONDITIONAL_SHARED` (Diana, Aaron) — cần ràng buộc bản thân (còn sống /
//      đôi cùng sống) kết hợp liên kết mục tiêu.
// - Thuần túy (PURE): tuyệt đối KHÔNG mutate `AuthoritativeGameState`.
// - Hỗ trợ bắc cầu nhiều tầng, memoization theo từng lượt đánh giá, phát hiện
//   chu trình fail-closed (không treo máy, không tự trao thắng, ghi telemetry nội bộ).
// - Không bao giờ tự coi mục tiêu chưa gắn kết (`unresolved`) là đã thắng.
// - Thứ tự đồng thắng ổn định 100% theo `state.turnOrder`.
// ---------------------------------------------------------------------------

import type {
  AuthoritativeGameState,
  AuthoritativePlayerState,
} from './types';

export type VictoryLinkRelation = 'COPY_GOAL' | 'SHARE_OUTCOME' | 'CONDITIONAL_SHARED';

export type VictoryLinkFallbackCondition =
  | 'diana_full_hp_survivor'
  | 'aaron_dead_before_end'
  | 'none';

export interface VictoryDependencyLink {
  readonly linkId: string;
  readonly ownerPlayerId: string;
  readonly targetPlayerId: string | null;
  readonly relation: VictoryLinkRelation;
  /** Role gốc bất biến của mục tiêu tại thời điểm gắn kết (provenance). */
  readonly sourceRoleId: string | null;
  readonly sourceGoalRef: string;
  readonly boundEventId: string;
  readonly boundAtMs: number;
  readonly boundTurnNumber: number;
  /** Với Diana: chỉ `true` từ đầu lượt kế tiếp của khách hàng; khi `false` dùng fallback. */
  readonly active: boolean;
  readonly requireOwnerAlive?: boolean;
  readonly requireTargetAlive?: boolean;
  /**
   * - `'target-wins'` (mặc định cho SHARE_OUTCOME & Diana): thắng khi mục tiêu thắng.
   * - `'both-alive'` (Aaron có vợ): thắng cuối trận khi cả 2 cùng sống.
   */
  readonly bondMode?: 'target-wins' | 'both-alive';
  readonly fallbackCondition?: VictoryLinkFallbackCondition;
  /** True khi chưa tìm được mục tiêu hợp lệ (vd. Cassie bàn 5P, Clairvoyant chưa soi). */
  readonly unresolved?: boolean;
}

export interface VictoryGraphCycleRecord {
  readonly cycleId: string;
  readonly cyclePlayerIds: readonly string[];
  readonly detectedAtPlayerId: string;
  readonly relationChain: readonly VictoryLinkRelation[];
}

export type VictoryNodeResolutionVia =
  | 'direct'
  | 'copy_goal'
  | 'share_outcome'
  | 'conditional_shared'
  | 'fallback'
  | 'unresolved'
  | 'cycle_blocked';

export interface VictoryNodeEvaluation {
  readonly playerId: string;
  readonly won: boolean;
  readonly via: VictoryNodeResolutionVia;
  readonly resolvedSourceRoleId?: string;
  readonly linkedTargetPlayerId?: string;
  readonly cycleBlocked?: boolean;
}

export interface CopiedVictoryGraphInput {
  readonly state: AuthoritativeGameState;
  readonly timing: 'immediate' | 'end-of-match';
  /** Tập người chơi đã thắng trực tiếp từ phe hoặc điều kiện độc hành (không cần link). */
  readonly baseWinnerIds: ReadonlySet<string>;
  /** Các liên kết phụ thuộc chiến thắng của trận đấu (từ state hoặc inject trong unit test). */
  readonly links: readonly VictoryDependencyLink[];
  /**
   * Hàm thuần túy đánh giá điều kiện thắng của một `asRoleId` cụ thể (non-linked role
   * hoặc điều kiện phe Hunter/Shadow) áp dụng lên chính trạng thái của `subjectPlayer`.
   */
  readonly evaluateDirectRoleGoalForSubject: (
    subjectPlayer: AuthoritativePlayerState,
    asRoleId: string,
    timing: 'immediate' | 'end-of-match',
  ) => boolean;
}

export interface CopiedVictoryGraphResult {
  readonly qualifiedPlayerIds: readonly string[];
  readonly evaluatedByPlayer: Readonly<Record<string, VictoryNodeEvaluation>>;
  readonly cycles: readonly VictoryGraphCycleRecord[];
  readonly linksEvaluated: number;
  readonly cycleCount: number;
}

const LINKED_GOAL_ROLE_IDS: ReadonlySet<string> = new Set([
  'exp1_bethany',
  'exp1_cassie',
  'exp1_clairvoyant',
  'exp2_diana',
  'exp2_aaron',
  'exp1_antimony',
]);

export function isLinkedVictoryRoleId(roleId: string | null | undefined): boolean {
  return Boolean(roleId && LINKED_GOAL_ROLE_IDS.has(roleId));
}

function evaluateFallbackForSubject(
  subject: AuthoritativePlayerState,
  fallback: VictoryLinkFallbackCondition | undefined,
  timing: 'immediate' | 'end-of-match',
): boolean {
  if (timing !== 'end-of-match') return false;
  if (fallback === 'diana_full_hp_survivor') {
    return subject.alive && subject.woundsTaken === 0;
  }
  if (fallback === 'aaron_dead_before_end') {
    return !subject.alive;
  }
  return false;
}

/**
 * Bộ đánh giá thuần túy `CopiedVictoryGraph` (CAP-07):
 * - KHÔNG mutate bất kỳ trường nào trên `state`.
 * - Phân tách nghiêm ngặt `COPY_GOAL` (đánh giá điều kiện bằng trạng thái của `subjectPlayer`)
 *   với `SHARE_OUTCOME` / `CONDITIONAL_SHARED` (kiểm tra kết quả thắng hoặc sống sót của target).
 * - Phát hiện chu trình (2 nút, 3 nút, N nút) và fail-closed hoàn toàn kèm telemetry nội bộ.
 */
export function evaluateCopiedVictoryGraph(
  input: CopiedVictoryGraphInput,
): CopiedVictoryGraphResult {
  const { state, timing, baseWinnerIds, links, evaluateDirectRoleGoalForSubject } = input;

  // Mỗi người chơi có tối đa 1 liên kết hoạt động (khử trùng lặp theo ownerPlayerId; giữ bản mới nhất)
  const linkByOwner = new Map<string, VictoryDependencyLink>();
  for (const link of links) {
    linkByOwner.set(link.ownerPlayerId, link);
  }

  const cycles: VictoryGraphCycleRecord[] = [];
  const seenCycleKeys = new Set<string>();
  const memo = new Map<string, VictoryNodeEvaluation>();
  let linksEvaluated = 0;

  function recordCycle(
    detectedAtPlayerId: string,
    playerStack: readonly string[],
    relationStack: readonly VictoryLinkRelation[],
    backTargetPlayerId: string,
  ): void {
    const startIdx = playerStack.indexOf(backTargetPlayerId);
    const cycleSlice =
      startIdx >= 0
        ? [...playerStack.slice(startIdx), backTargetPlayerId]
        : [...playerStack, backTargetPlayerId];
    const relSlice = startIdx >= 0 ? relationStack.slice(startIdx) : [...relationStack];
    const canonicalKey = cycleSlice.join('->');
    if (seenCycleKeys.has(canonicalKey)) return;
    seenCycleKeys.add(canonicalKey);
    cycles.push({
      cycleId: `vcycle-${cycles.length + 1}`,
      cyclePlayerIds: cycleSlice,
      detectedAtPlayerId,
      relationChain: relSlice,
    });
  }

  /**
   * Đánh giá liệu `subjectPlayer` có hoàn thành mục tiêu được xác định bởi
   * hồ sơ vai trò/liên kết của `goalSourcePlayerId` hay không.
   *
   * - Khi `subjectPlayerId === goalSourcePlayerId`: đánh giá kết quả thắng thực sự của người chơi đó.
   * - Khi `subjectPlayerId !== goalSourcePlayerId`: đang đánh giá `COPY_GOAL` — mọi điều kiện
   *   trực tiếp (alive, HP, vũ khí, phe, fallback...) được áp trên chính `subjectPlayer`!
   */
  function evaluateNode(
    subjectPlayerId: string,
    goalSourcePlayerId: string,
    visitingPlayers: readonly string[],
    visitingRelations: readonly VictoryLinkRelation[],
  ): VictoryNodeEvaluation {
    const memoKey = `${subjectPlayerId}::${goalSourcePlayerId}`;
    const cached = memo.get(memoKey);
    if (cached) return cached;

    const subjectPlayer = state.players[subjectPlayerId];
    const sourcePlayer = state.players[goalSourcePlayerId];
    if (!subjectPlayer || !sourcePlayer) {
      return {
        playerId: subjectPlayerId,
        won: false,
        via: 'unresolved',
      };
    }

    const isSelfEvaluation = subjectPlayerId === goalSourcePlayerId;
    const sourceLink = linkByOwner.get(goalSourcePlayerId);

    // 1. Nếu là tự đánh giá chính mình và đã thắng trực tiếp ở lớp base (phe hoặc độc hành tức thì/cuối trận)
    if (isSelfEvaluation && baseWinnerIds.has(subjectPlayerId)) {
      const res: VictoryNodeEvaluation = {
        playerId: subjectPlayerId,
        won: true,
        via: 'direct',
        resolvedSourceRoleId: sourcePlayer.roleId,
      };
      memo.set(memoKey, res);
      return res;
    }

    // 2. Nếu goalSource không có link trong đồ thị -> đánh giá trực tiếp vai trò của goalSource trên subjectPlayer
    if (!sourceLink) {
      // Nếu goalSource là một vai phụ thuộc (Bethany/Cassie/Clairvoyant/Diana/Aaron) nhưng CHƯA có link nào
      const sourceRoleStr = sourcePlayer.roleId as string;
      if (isLinkedVictoryRoleId(sourceRoleStr)) {
        if (sourceRoleStr === 'exp2_diana') {
          const won = evaluateFallbackForSubject(subjectPlayer, 'diana_full_hp_survivor', timing);
          const res: VictoryNodeEvaluation = {
            playerId: subjectPlayerId,
            won,
            via: won ? 'fallback' : 'unresolved',
            resolvedSourceRoleId: sourceRoleStr,
          };
          memo.set(memoKey, res);
          return res;
        }
        if (sourceRoleStr === 'exp2_aaron') {
          const won = evaluateFallbackForSubject(subjectPlayer, 'aaron_dead_before_end', timing);
          const res: VictoryNodeEvaluation = {
            playerId: subjectPlayerId,
            won,
            via: won ? 'fallback' : 'unresolved',
            resolvedSourceRoleId: sourceRoleStr,
          };
          memo.set(memoKey, res);
          return res;
        }
        // Bethany chưa có Chosen / Cassie chưa có Neutral / Clairvoyant chưa soi -> fail closed!
        const res: VictoryNodeEvaluation = {
          playerId: subjectPlayerId,
          won: false,
          via: 'unresolved',
          resolvedSourceRoleId: sourcePlayer.roleId,
        };
        memo.set(memoKey, res);
        return res;
      }

      const directWon = evaluateDirectRoleGoalForSubject(
        subjectPlayer,
        sourcePlayer.roleId,
        timing,
      );
      const res: VictoryNodeEvaluation = {
        playerId: subjectPlayerId,
        won: directWon,
        via: isSelfEvaluation ? 'direct' : 'copy_goal',
        resolvedSourceRoleId: sourcePlayer.roleId,
      };
      memo.set(memoKey, res);
      return res;
    }

    linksEvaluated += 1;

    // 3. Xử lý liên kết chưa kích hoạt / chưa gắn kết (unresolved / fallback)
    if (sourceLink.unresolved || !sourceLink.active || !sourceLink.targetPlayerId) {
      if (sourceLink.fallbackCondition && sourceLink.fallbackCondition !== 'none') {
        const fallbackWon = evaluateFallbackForSubject(
          subjectPlayer,
          sourceLink.fallbackCondition,
          timing,
        );
        const res: VictoryNodeEvaluation = {
          playerId: subjectPlayerId,
          won: fallbackWon,
          via: fallbackWon ? 'fallback' : 'unresolved',
          resolvedSourceRoleId: sourceLink.sourceRoleId ?? sourcePlayer.roleId,
        };
        memo.set(memoKey, res);
        return res;
      }
      const res: VictoryNodeEvaluation = {
        playerId: subjectPlayerId,
        won: false,
        via: 'unresolved',
        resolvedSourceRoleId: sourceLink.sourceRoleId ?? undefined,
      };
      memo.set(memoKey, res);
      return res;
    }

    const targetId = sourceLink.targetPlayerId;
    const targetPlayer = state.players[targetId];
    if (!targetPlayer) {
      // Missing target: fail closed cleanly
      const res: VictoryNodeEvaluation = {
        playerId: subjectPlayerId,
        won: false,
        via: 'unresolved',
        linkedTargetPlayerId: targetId,
      };
      memo.set(memoKey, res);
      return res;
    }

    const nextVisitingPlayers = [...visitingPlayers, goalSourcePlayerId];
    const nextVisitingRelations = [...visitingRelations, sourceLink.relation];

    // 4. Phân nhánh theo đúng 3 loại quan hệ: COPY_GOAL | SHARE_OUTCOME | CONDITIONAL_SHARED
    if (sourceLink.relation === 'COPY_GOAL') {
      const copiedRoleId = sourceLink.sourceRoleId ?? targetPlayer.roleId;

      // 4a. Nếu mục tiêu sao chép KHÔNG phải vai phụ thuộc -> đánh giá trực tiếp điều kiện của `copiedRoleId`
      //     trên chính trạng thái của `subjectPlayer`! (Đây là khác biệt cốt lõi so với SHARE_OUTCOME.)
      if (!isLinkedVictoryRoleId(copiedRoleId) && !linkByOwner.has(targetId)) {
        const directWon = evaluateDirectRoleGoalForSubject(subjectPlayer, copiedRoleId, timing);
        const res: VictoryNodeEvaluation = {
          playerId: subjectPlayerId,
          won: directWon,
          via: 'copy_goal',
          resolvedSourceRoleId: copiedRoleId,
          linkedTargetPlayerId: targetId,
        };
        memo.set(memoKey, res);
        return res;
      }

      // 4b. Nếu mục tiêu sao chép lại là một vai phụ thuộc (Cassie / Clairvoyant / Bethany / Diana / Aaron):
      //     kiểm tra chu trình trước khi đi tiếp bắc cầu!
      if (nextVisitingPlayers.includes(targetId)) {
        recordCycle(goalSourcePlayerId, nextVisitingPlayers, nextVisitingRelations, targetId);
        return {
          playerId: subjectPlayerId,
          won: false,
          via: 'cycle_blocked',
          resolvedSourceRoleId: copiedRoleId,
          linkedTargetPlayerId: targetId,
          cycleBlocked: true,
        };
      }

      const nested = evaluateNode(
        subjectPlayerId,
        targetId,
        nextVisitingPlayers,
        nextVisitingRelations,
      );
      if (nested.cycleBlocked) {
        return {
          playerId: subjectPlayerId,
          won: false,
          via: 'cycle_blocked',
          resolvedSourceRoleId: nested.resolvedSourceRoleId ?? copiedRoleId,
          linkedTargetPlayerId: targetId,
          cycleBlocked: true,
        };
      }
      const res: VictoryNodeEvaluation = {
        playerId: subjectPlayerId,
        won: nested.won,
        via: nested.via === 'unresolved' ? 'unresolved' : 'copy_goal',
        resolvedSourceRoleId: nested.resolvedSourceRoleId ?? copiedRoleId,
        linkedTargetPlayerId: targetId,
      };
      memo.set(memoKey, res);
      return res;
    }

    // 5. SHARE_OUTCOME hoặc CONDITIONAL_SHARED
    if (sourceLink.requireOwnerAlive && !subjectPlayer.alive) {
      const res: VictoryNodeEvaluation = {
        playerId: subjectPlayerId,
        won: false,
        via: sourceLink.relation === 'SHARE_OUTCOME' ? 'share_outcome' : 'conditional_shared',
        linkedTargetPlayerId: targetId,
      };
      memo.set(memoKey, res);
      return res;
    }

    // Nhánh đặc biệt `both-alive` (Aaron + spouse): không phụ thuộc việc spouse thắng hay thua,
    // chỉ yêu cầu cả subject và spouse đều còn sống lúc kết thúc trận!
    if (sourceLink.bondMode === 'both-alive') {
      const bothAliveWon =
        timing === 'end-of-match' && subjectPlayer.alive && targetPlayer.alive;
      const res: VictoryNodeEvaluation = {
        playerId: subjectPlayerId,
        won: bothAliveWon,
        via: 'conditional_shared',
        resolvedSourceRoleId: sourcePlayer.roleId,
        linkedTargetPlayerId: targetId,
      };
      memo.set(memoKey, res);
      return res;
    }

    if (sourceLink.requireTargetAlive && !targetPlayer.alive) {
      const res: VictoryNodeEvaluation = {
        playerId: subjectPlayerId,
        won: false,
        via: sourceLink.relation === 'SHARE_OUTCOME' ? 'share_outcome' : 'conditional_shared',
        linkedTargetPlayerId: targetId,
      };
      memo.set(memoKey, res);
      return res;
    }

    // Kiểm tra chu trình trên đồ thị phụ thuộc kết quả (A -> B -> A hoặc A -> B -> C -> A)
    if (nextVisitingPlayers.includes(targetId)) {
      recordCycle(goalSourcePlayerId, nextVisitingPlayers, nextVisitingRelations, targetId);
      return {
        playerId: subjectPlayerId,
        won: false,
        via: 'cycle_blocked',
        linkedTargetPlayerId: targetId,
        cycleBlocked: true,
      };
    }

    // Đánh giá xem `targetId` CÓ THẮNG HAY KHÔNG (tự đánh giá trên chính targetId!)
    const targetOutcome = evaluateNode(
      targetId,
      targetId,
      nextVisitingPlayers,
      nextVisitingRelations,
    );
    if (targetOutcome.cycleBlocked) {
      return {
        playerId: subjectPlayerId,
        won: false,
        via: 'cycle_blocked',
        linkedTargetPlayerId: targetId,
        cycleBlocked: true,
      };
    }

    const via: VictoryNodeResolutionVia =
      sourceLink.relation === 'SHARE_OUTCOME' ? 'share_outcome' : 'conditional_shared';
    const res: VictoryNodeEvaluation = {
      playerId: subjectPlayerId,
      won: targetOutcome.won,
      via,
      resolvedSourceRoleId: targetOutcome.resolvedSourceRoleId ?? targetPlayer.roleId,
      linkedTargetPlayerId: targetId,
    };
    memo.set(memoKey, res);
    return res;
  }

  // Duyệt tất cả người chơi theo đúng `state.turnOrder` để đảm bảo thứ tự thắng 100% xác định
  const evaluatedByPlayer: Record<string, VictoryNodeEvaluation> = {};
  const qualifiedPlayerIds: string[] = [];
  const orderedIds =
    state.turnOrder.length > 0 ? state.turnOrder : Object.keys(state.players);

  for (const pid of orderedIds) {
    if (!state.players[pid]) continue;
    const outcome = evaluateNode(pid, pid, [], []);
    evaluatedByPlayer[pid] = outcome;
    if (outcome.won) {
      qualifiedPlayerIds.push(pid);
    }
  }

  return {
    qualifiedPlayerIds,
    evaluatedByPlayer,
    cycles,
    linksEvaluated,
    cycleCount: cycles.length,
  };
}
