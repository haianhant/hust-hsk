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
import { FACTION_LABELS, getRoleDesign } from './roles';
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

function qualifiesClassicOrExpandedWanderer(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
  resolvedWinnerFaction: VictoryEvaluation['winnerFaction'],
  allWanderers: readonly AuthoritativePlayerState[],
  isFinalFallback = false,
): boolean {
  if (player.faction !== 'wanderer') return false;
  const huntersWon = resolvedWinnerFaction === 'lantern-guard';
  const shadowsWon = resolvedWinnerFaction === 'mist-order';

  switch (player.roleId) {
    case 'lang-anh-san': // Bob: 5+ Trang bị
      return player.alive && (isFinalFallback ? player.equipped.length >= 3 : player.equipped.length >= 5);
    case 'lang-quan-sat': // Allie: còn sống khi kết thúc trận
      return player.alive;
    case 'lang-cuu-ho': // Charles: giết người khi deadCount >= 3
      return player.alive && player.charlesKillWon;
    case 'lang-tien-phong': {
      // Daniel: người ĐẦU TIÊN bị loại, HOẶC còn sống khi Đội Săn Đêm thắng
      const deadCount = Object.values(state.players).filter((p) => !p.alive).length;
      if (!player.alive && state.firstDeadPlayerId === player.playerId && deadCount === 1) {
        return true;
      }
      return player.alive && huntersWon;
    }
    case 'exp1_cindy': {
      // Cindy (Phase 3A house rule):
      // - Khi có Neutral khác (6P–8P): thắng khi tất cả Neutral khác đã chết & Cindy còn sống.
      // - Khi Cindy là Neutral duy nhất từ đầu (5P house rule): KHÔNG tự thắng đầu trận;
      //   đồng thắng nếu còn sống khi trận đấu kết thúc hợp lệ.
      if (!player.alive) return false;
      const otherNeutrals = allWanderers.filter((w) => w.playerId !== player.playerId);
      if (otherNeutrals.length === 0) {
        return true;
      }
      return otherNeutrals.every((w) => !w.alive);
    }
    case 'exp1_bipolar': {
      // Bipolar (Phase 3A house rule):
      // - Chỉ đánh giá sau khi xác định phe thắng chung cuộc.
      // - Hunter thắng -> Bipolar thắng nếu ĐANG SỐNG.
      // - Shadow thắng -> Bipolar thắng nếu ĐÃ CHẾT.
      // - Neutral khác thắng solo (không có Hunter/Shadow thắng) -> Bipolar KHÔNG thắng.
      if (huntersWon) return player.alive;
      if (shadowsWon) return !player.alive;
      return false;
    }
    case 'exp2_cruz': {
      // Cruz (Phase 4B house rule):
      // Thắng cá nhân tức thì khi tự tay hạ gục người chơi khác bằng hoặc sau khi dùng
      // một trong 4 lá Đen hợp lệ (ev-07..ev-10) trong cùng lượt.
      return Boolean(
        player.alive &&
          state.expansionState?.cruzWinTriggeredIds?.includes(player.playerId),
      );
    }
    case 'exp2_bryon': {
      // Bryon (Phase 4B house rule):
      // Chỉ đánh giá ở thời điểm kết thúc trận hợp lệ (KHÔNG tự thắng đầu trận):
      // thắng nếu Bryon còn sống VÀ toàn bộ các nhân vật Neutral trong ván đều còn sống.
      return player.alive && allWanderers.every((w) => w.alive);
    }
    default:
      return false;
  }
}

/**
 * Bộ đánh giá điều kiện thắng cho các ruleset mở rộng (`rulesetId !== 'classic'`).
 * Hỗ trợ đầy đủ 10 Classic + Phase 2 + Phase 3 Neutral (`exp1_cindy`, `exp1_bipolar`)
 * mà KHÔNG thay đổi bất kỳ dòng nào của `victory.ts` dùng cho Classic production.
 */
export function evaluateExpandedVictory(state: AuthoritativeGameState): VictoryEvaluation {
  const allPlayers = Object.values(state.players);
  const alivePlayers = allPlayers.filter((p) => p.alive);
  const deadCount = allPlayers.length - alivePlayers.length;

  const hunterPlayers = allPlayers.filter((p) => p.faction === 'lantern-guard');
  const shadowPlayers = allPlayers.filter((p) => p.faction === 'mist-order');
  const wanderers = allPlayers.filter((p) => p.faction === 'wanderer');

  const huntersAlive = hunterPlayers.filter((p) => p.alive).length;
  const shadowsAlive = shadowPlayers.filter((p) => p.alive).length;
  const wanderersDead = wanderers.filter((w) => !w.alive).length;

  const allShadowsDead = shadowPlayers.length > 0 && shadowsAlive === 0;
  const allHuntersDead = hunterPlayers.length > 0 && huntersAlive === 0;
  const shadowsReachedThreeNeutralKills = shadowPlayers.length > 0 && wanderersDead >= 3;
  const huntersTriggered = allShadowsDead;
  const shadowsTriggered = allHuntersDead || shadowsReachedThreeNeutralKills;

  // Các điều kiện thắng tức thì của Kẻ Độc Hành (Classic + Cindy khi có >= 1 Neutral khác)
  const bobWinners = wanderers.filter(
    (w) => w.alive && w.roleId === 'lang-anh-san' && w.equipped.length >= 5,
  );
  const charlesWinners = wanderers.filter(
    (w) => w.alive && w.roleId === 'lang-cuu-ho' && w.charlesKillWon,
  );
  const danielFirstDeathWinners = wanderers.filter(
    (w) =>
      !w.alive &&
      w.roleId === 'lang-tien-phong' &&
      state.firstDeadPlayerId === w.playerId &&
      deadCount === 1,
  );
  const soleAllieWinners = wanderers.filter(
    (w) => w.alive && w.roleId === 'lang-quan-sat' && alivePlayers.length === 1,
  );
  const cindySoloWinners = wanderers.filter((w) => {
    if (!w.alive || w.roleId !== 'exp1_cindy') return false;
    const otherNeutrals = wanderers.filter((other) => other.playerId !== w.playerId);
    // Bàn 5P (0 Neutral khác): KHÔNG tự thắng ngay lúc phân vai hay giữa trận!
    if (otherNeutrals.length === 0) return false;
    return otherNeutrals.every((other) => !other.alive);
  });
  const cruzSoloWinners = wanderers.filter(
    (w) =>
      w.alive &&
      w.roleId === 'exp2_cruz' &&
      Boolean(state.expansionState?.cruzWinTriggeredIds?.includes(w.playerId)),
  );

  // 1. Đòn quyết tử đồng quy (Hunter & Shadow cùng kích hoạt)
  if (huntersTriggered && shadowsTriggered) {
    const activeActor = state.activePlayerId ? state.players[state.activePlayerId] : null;
    const tiebreakFaction: BoardGameFactionId =
      activeActor &&
      (activeActor.faction === 'lantern-guard' || activeActor.faction === 'mist-order')
        ? activeActor.faction
        : hunterPlayers.reduce((s, p) => s + p.woundsTaken, 0) <=
            shadowPlayers.reduce((s, p) => s + p.woundsTaken, 0)
          ? 'lantern-guard'
          : 'mist-order';
    const baseWinners = tiebreakFaction === 'lantern-guard' ? hunterPlayers : shadowPlayers;
    const winnerSet = new Set<string>(baseWinners.map((p) => p.playerId));
    for (const w of wanderers) {
      if (qualifiesClassicOrExpandedWanderer(state, w, tiebreakFaction, wanderers)) {
        winnerSet.add(w.playerId);
      }
    }
    const winnerIds = Array.from(winnerSet);
    return {
      finished: true,
      winnerFaction: tiebreakFaction,
      winnerLabel: `${FACTION_LABELS[tiebreakFaction]} (Đòn quyết tử)`,
      winnerPlayerIds: winnerIds,
      winReason: `Đòn quyết tử đồng quy — ${FACTION_LABELS[tiebreakFaction]} giành chiến thắng chung cuộc!`,
      winningRoleIds: winnerIds.map((id) => state.players[id].roleId),
    };
  }

  // 2. Đội Săn Đêm tiêu diệt hết Hội Bóng Đêm
  if (huntersTriggered) {
    const winnerSet = new Set<string>(hunterPlayers.map((p) => p.playerId));
    for (const w of wanderers) {
      if (qualifiesClassicOrExpandedWanderer(state, w, 'lantern-guard', wanderers)) {
        winnerSet.add(w.playerId);
      }
    }
    const winnerIds = Array.from(winnerSet);
    return {
      finished: true,
      winnerFaction: 'lantern-guard',
      winnerLabel: FACTION_LABELS['lantern-guard'],
      winnerPlayerIds: winnerIds,
      winReason: 'Toàn bộ Hội Bóng Đêm đã bị loại khỏi KTX!',
      winningRoleIds: winnerIds.map((id) => state.players[id].roleId),
    };
  }

  // 3. Hội Bóng Đêm tiêu diệt hết Đội Săn Đêm HOẶC có đủ 3 Kẻ Độc Hành gục ngã
  if (shadowsTriggered) {
    const winnerSet = new Set<string>(shadowPlayers.map((p) => p.playerId));
    for (const w of wanderers) {
      if (qualifiesClassicOrExpandedWanderer(state, w, 'mist-order', wanderers)) {
        winnerSet.add(w.playerId);
      }
    }
    const winnerIds = Array.from(winnerSet);
    return {
      finished: true,
      winnerFaction: 'mist-order',
      winnerLabel: FACTION_LABELS['mist-order'],
      winnerPlayerIds: winnerIds,
      winReason: allHuntersDead
        ? 'Toàn bộ Đội Săn Đêm đã gục ngã — Hội Bóng Đêm làm chủ KTX!'
        : `Đã có ${wanderersDead} Kẻ Độc Hành gục ngã — Hội Bóng Đêm kích hoạt thắng lợi!`,
      winningRoleIds: winnerIds.map((id) => state.players[id].roleId),
    };
  }

  // 4. Các điều kiện thắng tức thì của Kẻ Độc Hành (Bob / Charles / Daniel / sole Allie / Cindy / Cruz)
  const soloTriggers = [
    ...bobWinners,
    ...charlesWinners,
    ...danielFirstDeathWinners,
    ...soleAllieWinners,
    ...cindySoloWinners,
    ...cruzSoloWinners,
  ];
  if (soloTriggers.length > 0) {
    const lead = soloTriggers[0];
    const leadDesign = getRoleDesign(lead.roleId);
    const winnerSet = new Set<string>(soloTriggers.map((p) => p.playerId));
    for (const w of wanderers) {
      if (qualifiesClassicOrExpandedWanderer(state, w, 'wanderer-solo', wanderers)) {
        winnerSet.add(w.playerId);
      }
    }
    const winnerIds = Array.from(winnerSet);
    const winReason =
      lead.roleId === 'lang-anh-san'
        ? `${lead.displayName} sở hữu đủ ${lead.equipped.length} Trang bị — hoàn thành mục tiêu Độc Hành!`
        : lead.roleId === 'lang-cuu-ho'
          ? `${lead.displayName} đã hạ gục mục tiêu khi có ${deadCount} người ngã xuống (≥ 3)!`
          : lead.roleId === 'lang-tien-phong'
            ? `${lead.displayName} (Đạt "Cảm Tử") là người ĐẦU TIÊN ngã xuống — hoàn thành mục tiêu tức thì!`
            : lead.roleId === 'exp1_cindy'
              ? `${lead.displayName} (Cindy) là Kẻ Độc Hành duy nhất sống sót khi toàn bộ Neutral khác đã bị loại!`
              : lead.roleId === 'exp2_cruz'
                ? `${lead.displayName} (Cruz) đã hạ gục mục tiêu trong lượt dùng thẻ Đột Kích đặc trưng — hoàn thành mục tiêu Độc Hành!`
                : `${lead.displayName} (Trang "Kiên Cường") trụ lại sống sót cuối cùng!`;
    return {
      finished: true,
      winnerFaction: 'wanderer-solo',
      winnerLabel: `Kẻ Độc Hành — ${lead.displayName} (${leadDesign.name})`,
      winnerPlayerIds: winnerIds,
      winReason,
      winningRoleIds: winnerIds.map((id) => state.players[id].roleId),
    };
  }

  // 5. Giới hạn an toàn maxRounds
  if (state.round > state.maxRounds) {
    const hunterRatio =
      hunterPlayers.length === 0
        ? -1
        : huntersAlive * 100 -
          hunterPlayers.reduce((sum, p) => sum + p.woundsTaken, 0);
    const shadowRatio =
      shadowPlayers.length === 0
        ? -1
        : shadowsAlive * 100 -
          shadowPlayers.reduce((sum, p) => sum + p.woundsTaken, 0);
    const topFaction: BoardGameFactionId =
      hunterRatio >= shadowRatio ? 'lantern-guard' : 'mist-order';
    const baseWinners = topFaction === 'lantern-guard' ? hunterPlayers : shadowPlayers;
    const winnerSet = new Set<string>(baseWinners.map((p) => p.playerId));
    for (const w of wanderers) {
      if (qualifiesClassicOrExpandedWanderer(state, w, topFaction, wanderers, true)) {
        winnerSet.add(w.playerId);
      }
    }
    const winnerIds = Array.from(winnerSet);
    return {
      finished: true,
      winnerFaction: topFaction,
      winnerLabel: `${FACTION_LABELS[topFaction]} (Ưu thế sinh tồn)`,
      winnerPlayerIds: winnerIds,
      winReason: `Hết ${state.maxRounds} vòng an toàn — ${FACTION_LABELS[topFaction]} chiếm ưu thế sinh tồn!`,
      winningRoleIds: winnerIds.map((id) => state.players[id].roleId),
    };
  }

  return {
    finished: false,
    winnerFaction: null,
    winnerLabel: null,
    winnerPlayerIds: [],
    winReason: null,
    winningRoleIds: [],
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
   * - Với ruleset mở rộng (`starter-four`, `starter-eight`, `starter-sixteen`, ...): chạy `evaluateExpandedVictory`
   *   (hoặc `evaluateCustom` nếu có custom evaluator đăng ký trong unit test).
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
      return evaluateExpandedVictory(state);
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
