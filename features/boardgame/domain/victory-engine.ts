// ---------------------------------------------------------------------------
// features/boardgame/domain/victory-engine.ts — Kiến trúc Điều kiện Thắng (Phase 1)
//
// Chuẩn bị kiến trúc pluggable cho 7 nhóm điều kiện thắng của 66 nhân vật:
//  1. faction              (Hunter / Shadow team victory)
//  2. individual           (Bob, Charles, Daniel, Dalton, Bianca, Colt, Cruz...)
//  3. shared               (Allie, Bethany, Aaron, N.C. Soldier alliance...)
//  4. conditional          (Bipolar, Diana fallback, Aaron fallback...)
//  5. dynamic-allegiance   (Bonnie Neutral -> Shadow, N.C. Soldier recruitment)
//  6. copied-victory       (Antimony, Cassie, Clairvoyant, Diana — có cycle guard)
//  7. simultaneous-victory (Đòn quyết tử đồng quy, Cain multi-faction win)
//
// Ràng buộc Phase 1:
// - KHÔNG thay đổi kết quả đánh giá thắng thua Classic trong `victory.ts`.
// - Classic adapter được chứng minh tương đương 100% với `evaluateVictory(state)`.
// ---------------------------------------------------------------------------

import type {
  BoardGameFactionId,
  BoardGameRoleId,
  BoardGameRulesetId,
  ClassicBoardGameRoleId,
} from '../../../shared/contracts/boardgame';
import { BOARD_GAME_DEFAULT_RULESET_ID } from '../../../shared/contracts/boardgame';
import type {
  AuthoritativeGameState,
  AuthoritativePlayerState,
  VictoryEvaluation,
} from './types';
import { evaluateVictory } from './victory';

export const VICTORY_ARCHETYPES = [
  'faction',
  'individual',
  'shared',
  'conditional',
  'dynamic-allegiance',
  'copied-victory',
  'simultaneous-victory',
] as const;

export type VictoryArchetype = (typeof VICTORY_ARCHETYPES)[number];

export type VictoryTiming = 'immediate' | 'end-of-match' | 'both';

export interface VictoryConditionDefinition {
  readonly id: string;
  readonly archetype: VictoryArchetype;
  readonly summary: string;
  readonly timing: VictoryTiming;
  readonly evaluatorId: string | null;
}

export interface VictoryEvaluationContext {
  readonly state: AuthoritativeGameState;
  readonly rulesetId: BoardGameRulesetId;
  readonly allPlayers: readonly AuthoritativePlayerState[];
  readonly alivePlayers: readonly AuthoritativePlayerState[];
  /** Cho phép kiểm tra thắng theo phe động (mặc định bằng player.faction cho Classic). */
  getEffectiveFaction(player: AuthoritativePlayerState): BoardGameFactionId;
  /**
   * Đánh giá điều kiện thắng sao chép/liên kết tới 1 người chơi mục tiêu
   * với bộ phát hiện chu trình (cycle detection) chống vòng lặp vô hạn.
   */
  resolveLinkedWinner(
    sourcePlayerId: string,
    targetPlayerId: string,
    predicate: (target: AuthoritativePlayerState, visited: ReadonlySet<string>) => boolean,
    visited?: Set<string>,
  ): { ok: boolean; cycleDetected: boolean };
}

export interface VictoryEvaluatorCandidate {
  readonly evaluatorId: string;
  readonly archetype: VictoryArchetype;
  readonly priority: number;
  readonly timing: VictoryTiming;
  readonly winnerFaction: VictoryEvaluation['winnerFaction'];
  readonly winnerLabel: string;
  readonly winnerPlayerIds: readonly string[];
  readonly winReason: string;
  /** True nếu ứng viên này đủ điều kiện kết thúc trận ngay lập tức (không cần chờ phe). */
  readonly triggersMatchEnd: boolean;
}

export interface VictoryEvaluator {
  readonly id: string;
  readonly archetype: VictoryArchetype;
  /** Số nhỏ ưu tiên cao hơn khi phân xử đồng thời. */
  readonly priority: number;
  readonly timing: VictoryTiming;
  readonly evaluate: (ctx: VictoryEvaluationContext) => VictoryEvaluatorCandidate | null;
}

export interface VictoryEngineEvaluationOptions {
  /** Override phe hiệu lực (dùng cho test/Phase 2 dynamic allegiance). */
  readonly effectiveFactionOverrides?: Readonly<Record<string, BoardGameFactionId>>;
}

function buildVictoryContext(
  state: AuthoritativeGameState,
  options?: VictoryEngineEvaluationOptions,
): VictoryEvaluationContext {
  const allPlayers = Object.values(state.players);
  const alivePlayers = allPlayers.filter((p) => p.alive);
  const overrides = options?.effectiveFactionOverrides ?? {};

  return {
    state,
    rulesetId: state.rulesetId ?? BOARD_GAME_DEFAULT_RULESET_ID,
    allPlayers,
    alivePlayers,
    getEffectiveFaction(player) {
      return overrides[player.playerId] ?? player.faction;
    },
    resolveLinkedWinner(sourcePlayerId, targetPlayerId, predicate, visitedArg) {
      const visited = visitedArg ?? new Set<string>([sourcePlayerId]);
      if (visited.has(targetPlayerId)) {
        return { ok: false, cycleDetected: true };
      }
      const target = state.players[targetPlayerId];
      if (!target) {
        return { ok: false, cycleDetected: false };
      }
      visited.add(targetPlayerId);
      const ok = predicate(target, visited);
      return { ok, cycleDetected: false };
    },
  };
}

/**
 * Registry + Engine đánh giá điều kiện thắng có khả năng mở rộng.
 * Với ruleset `classic` (không có custom evaluator nào được đăng ký thêm),
 * ủy quyền 100% sang `evaluateVictory(state)` để bảo đảm equivalence tuyệt đối.
 */
export class VictoryEngine {
  private readonly evaluators = new Map<string, VictoryEvaluator>();

  registerEvaluator(evaluator: VictoryEvaluator): void {
    if (this.evaluators.has(evaluator.id)) {
      throw new Error(`Duplicate victory evaluator id "${evaluator.id}".`);
    }
    this.evaluators.set(evaluator.id, evaluator);
  }

  listEvaluators(): readonly VictoryEvaluator[] {
    return Array.from(this.evaluators.values()).sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.id.localeCompare(b.id);
    });
  }

  /**
   * Đánh giá tập evaluator mở rộng theo thứ tự priority; hỗ trợ gộp đồng thắng
   * (shared / conditional / copied / simultaneous) khi có ít nhất 1 trigger kết thúc trận.
   */
  evaluateCustom(
    state: AuthoritativeGameState,
    options?: VictoryEngineEvaluationOptions,
  ): VictoryEvaluation {
    const ctx = buildVictoryContext(state, options);
    const ordered = this.listEvaluators();
    const candidates: VictoryEvaluatorCandidate[] = [];

    for (const evaluator of ordered) {
      const candidate = evaluator.evaluate(ctx);
      if (candidate) candidates.push(candidate);
    }

    const triggers = candidates.filter((c) => c.triggersMatchEnd);
    if (triggers.length === 0) {
      return {
        finished: false,
        winnerFaction: null,
        winnerLabel: null,
        winnerPlayerIds: [],
        winReason: null,
        winningRoleIds: [],
      };
    }

    // Gộp đồng thắng từ tất cả ứng viên đạt điều kiện kết thúc trận & co-win (shared/conditional/copied)
    const primary = triggers[0];
    const winnerSet = new Set<string>();
    for (const c of candidates) {
      for (const pid of c.winnerPlayerIds) {
        if (state.players[pid]) winnerSet.add(pid);
      }
    }
    const winnerPlayerIds = Array.from(winnerSet);
    const winningRoleIds = winnerPlayerIds
      .map((id) => state.players[id]?.roleId)
      .filter((r): r is BoardGameRoleId => Boolean(r));

    return {
      finished: true,
      winnerFaction: primary.winnerFaction,
      winnerLabel: primary.winnerLabel,
      winnerPlayerIds,
      winReason: primary.winReason,
      winningRoleIds,
    };
  }

  /**
   * Cổng đánh giá chính:
   * - Với ruleset `classic` và không có custom evaluator mở rộng: gọi trực tiếp `evaluateVictory(state)`
   *   để bảo đảm 100% equivalence với bản Classic gốc.
   * - Khi có custom evaluator đăng ký (dành cho Phase 2+ hoặc unit test): chạy `evaluateCustom`.
   */
  evaluate(
    state: AuthoritativeGameState,
    options?: VictoryEngineEvaluationOptions,
  ): VictoryEvaluation {
    const rulesetId = state.rulesetId ?? BOARD_GAME_DEFAULT_RULESET_ID;
    if (rulesetId === 'classic' && this.evaluators.size === 0) {
      return evaluateVictory(state);
    }
    if (this.evaluators.size === 0) {
      // Phase 2A/2B Starter pools: tất cả tướng mở rộng hiện tại thuộc Hunter hoặc Shadow
      // (archetype 'faction'), còn Wanderer là 4 tướng Classic -> evaluateVictory hoạt động
      // chính xác trên effective faction và roleId mở rộng qua getRoleDesign.
      return evaluateVictory(state);
    }
    return this.evaluateCustom(state, options);
  }
}

export const CLASSIC_VICTORY_DEFINITIONS: Readonly<
  Record<ClassicBoardGameRoleId, VictoryConditionDefinition>
> = {
  'gac-ky-thuat': {
    id: 'classic:victory:hunter-faction',
    archetype: 'faction',
    summary: 'Phe Đội Săn Đêm thắng ngay khi toàn bộ Hội Bóng Đêm bị loại khỏi KTX.',
    timing: 'immediate',
    evaluatorId: 'victory.ts:evaluateVictory#hunters',
  },
  'gac-truc-ban': {
    id: 'classic:victory:hunter-faction',
    archetype: 'faction',
    summary: 'Phe Đội Săn Đêm thắng ngay khi toàn bộ Hội Bóng Đêm bị loại khỏi KTX.',
    timing: 'immediate',
    evaluatorId: 'victory.ts:evaluateVictory#hunters',
  },
  'gac-radio': {
    id: 'classic:victory:hunter-faction',
    archetype: 'faction',
    summary: 'Phe Đội Săn Đêm thắng ngay khi toàn bộ Hội Bóng Đêm bị loại khỏi KTX.',
    timing: 'immediate',
    evaluatorId: 'victory.ts:evaluateVictory#hunters',
  },
  'suong-an-danh': {
    id: 'classic:victory:shadow-faction',
    archetype: 'faction',
    summary: 'Hội Bóng Đêm thắng khi toàn bộ Đội Săn Đêm bị loại HOẶC có từ 3 Kẻ Độc Hành bị loại.',
    timing: 'immediate',
    evaluatorId: 'victory.ts:evaluateVictory#shadows',
  },
  'suong-tin-gia': {
    id: 'classic:victory:shadow-faction',
    archetype: 'faction',
    summary: 'Hội Bóng Đêm thắng khi toàn bộ Đội Săn Đêm bị loại HOẶC có từ 3 Kẻ Độc Hành bị loại.',
    timing: 'immediate',
    evaluatorId: 'victory.ts:evaluateVictory#shadows',
  },
  'suong-gac-cong': {
    id: 'classic:victory:shadow-faction',
    archetype: 'faction',
    summary: 'Hội Bóng Đêm thắng khi toàn bộ Đội Săn Đêm bị loại HOẶC có từ 3 Kẻ Độc Hành bị loại.',
    timing: 'immediate',
    evaluatorId: 'victory.ts:evaluateVictory#shadows',
  },
  'lang-anh-san': {
    id: 'classic:victory:bob-5-equip',
    archetype: 'individual',
    summary: 'Thắng ngay lập tức khi sở hữu từ 5 Trang bị đang đeo trở lên.',
    timing: 'immediate',
    evaluatorId: 'victory.ts:evaluateVictory#bob',
  },
  'lang-quan-sat': {
    id: 'classic:victory:allie-survive',
    archetype: 'shared',
    summary: 'Thắng khi bạn còn sống lúc ván đấu kết thúc (đồng thắng với phe kết thúc trận).',
    timing: 'both',
    evaluatorId: 'victory.ts:evaluateVictory#allie',
  },
  'lang-cuu-ho': {
    id: 'classic:victory:charles-bloody-kill',
    archetype: 'individual',
    summary: 'Thắng ngay khi đòn đánh thường kết liễu 1 người mà lúc đó tổng số người đã chết >= 3.',
    timing: 'immediate',
    evaluatorId: 'victory.ts:evaluateVictory#charles',
  },
  'lang-tien-phong': {
    id: 'classic:victory:daniel-first-death-or-hunters',
    archetype: 'conditional',
    summary: 'Thắng ngay nếu là người đầu tiên bị loại, HOẶC còn sống khi Đội Săn Đêm thắng.',
    timing: 'both',
    evaluatorId: 'victory.ts:evaluateVictory#daniel',
  },
};

export const DEFAULT_VICTORY_ENGINE = new VictoryEngine();

export function createVictoryEngine(): VictoryEngine {
  return new VictoryEngine();
}

export function evaluateVictoryWithEngine(
  state: AuthoritativeGameState,
  options?: VictoryEngineEvaluationOptions,
): VictoryEvaluation {
  return DEFAULT_VICTORY_ENGINE.evaluate(state, options);
}
