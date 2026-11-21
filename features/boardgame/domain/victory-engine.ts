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
import { countColtQualifyingWeapons } from './cards';
import {
  evaluateCopiedVictoryGraph,
  isLinkedVictoryRoleId,
  type CopiedVictoryGraphResult,
  type VictoryDependencyLink,
} from './copied-victory-graph';
import {
  getEffectiveFaction,
  getPlayerAlliance,
  isEffectiveNeutral,
  isNcSoldierAllianceVictorySatisfied,
  isPlayerInAlliance,
  listAlliances,
} from './dynamic-allegiance';
import {
  isPlayerDormantPendingRevive,
  isPlayerFinallyEliminated,
  isPlayerLivingOrPendingRevive,
} from './pending-resurrection';
import { FACTION_LABELS, getRoleDesign } from './roles';
import { getRemainingHp, isPlayerAtExactLocationAlias } from './rules';
import type {
  AuthoritativeGameState,
  AuthoritativePlayerState,
  VictoryEvaluation,
} from './types';
import { evaluateVictory } from './victory';

// ---------------------------------------------------------------------------
// CAP-07 — Reusable Extended Neutral Victory Primitives (Phase 5A)
// Pure, deterministic, side-effect-free predicates shared across Wave 4+ roles.
// ---------------------------------------------------------------------------

export function getMinAliveRemainingHp(
  alivePlayers: readonly AuthoritativePlayerState[],
): number | null {
  if (alivePlayers.length === 0) return null;
  let minHp = Number.POSITIVE_INFINITY;
  for (const p of alivePlayers) {
    const hp = getRemainingHp(p);
    if (hp < minHp) minHp = hp;
  }
  return Number.isFinite(minHp) ? minHp : null;
}

export function getMaxAliveRemainingHp(
  alivePlayers: readonly AuthoritativePlayerState[],
): number | null {
  if (alivePlayers.length === 0) return null;
  let maxHp = Number.NEGATIVE_INFINITY;
  for (const p of alivePlayers) {
    const hp = getRemainingHp(p);
    if (hp > maxHp) maxHp = hp;
  }
  return Number.isFinite(maxHp) ? maxHp : null;
}

/** True khi người chơi còn sống và có lượng HP còn lại THẤP NHẤT trong nhóm sống sót (cho phép hòa). */
export function hasLowestRemainingHpAmongSurvivors(
  player: AuthoritativePlayerState,
  alivePlayers: readonly AuthoritativePlayerState[],
): boolean {
  if (!player.alive) return false;
  const minHp = getMinAliveRemainingHp(alivePlayers);
  return minHp !== null && getRemainingHp(player) === minHp;
}

/** True khi người chơi còn sống và có lượng HP còn lại CAO NHẤT trong nhóm sống sót (cho phép hòa). */
export function hasHighestRemainingHpAmongSurvivors(
  player: AuthoritativePlayerState,
  alivePlayers: readonly AuthoritativePlayerState[],
): boolean {
  if (!player.alive) return false;
  const maxHp = getMaxAliveRemainingHp(alivePlayers);
  return maxHp !== null && getRemainingHp(player) === maxHp;
}

/** True khi toàn bộ nhân vật Neutral trong trận đều đang còn sống. */
export function areAllNeutralsAlive(
  allWanderers: readonly AuthoritativePlayerState[],
): boolean {
  return allWanderers.length > 0 && allWanderers.every((w) => w.alive);
}

/** CAP-07: Điều kiện thắng tức thì khi bị phe chỉ định hạ gục (Arlene bị Hunter giết). */
export function isArleneImmediateVictorySatisfied(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
): boolean {
  return Boolean(
    !player.alive &&
      state.expansionState?.arleneHunterKillTriggeredIds?.includes(player.playerId),
  );
}

/** CAP-07: Điều kiện thắng tức thì sau kích hoạt Vòng Đấu Thứ 12 (Dalton hạ gục người khác). */
export function isDaltonImmediateVictorySatisfied(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
): boolean {
  return Boolean(
    player.alive &&
      state.expansionState?.daltonKillWinTriggeredIds?.includes(player.playerId),
  );
}

/** CAP-07: Điều kiện thắng cuối trận của Angel (còn sống AND [tất cả Neutral sống OR đứng chính xác ô `lobby` / Church]). */
export function isAngelEndOfMatchVictorySatisfied(
  player: AuthoritativePlayerState,
  allWanderers: readonly AuthoritativePlayerState[],
): boolean {
  if (!player.alive) return false;
  return (
    areAllNeutralsAlive(allWanderers) ||
    isPlayerAtExactLocationAlias(player, 'church')
  );
}

/** CAP-07: Điều kiện thắng tức thì của Colt (sở hữu >= 3 vũ khí chuẩn ev-02..ev-05). */
export function isColtImmediateVictorySatisfied(
  player: AuthoritativePlayerState,
): boolean {
  return player.alive && countColtQualifyingWeapons(player.equipped) >= 3;
}

/** CAP-07: Điều kiện thắng tức thì của April & Skipps sau khi trụ qua cuối lượt kế của mình. */
export function isAprilSkippsCountdownVictorySatisfied(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
): boolean {
  return Boolean(
    player.alive &&
      state.expansionState?.aprilSkippsCountdownByPlayer?.[player.playerId]?.survivedDeadlineWon ===
        true,
  );
}

/**
 * Phase 7A: Điều kiện thắng cá nhân tức thì của Cain (`exp2_cain` — Section 15):
 * - 6P–8P: Cain còn sống (không ngủ đông) AND có ít nhất 1 Hunter, 1 Shadow và 1 Neutral KHÁC đã bị loại vĩnh viễn.
 * - 5P: Cain còn sống (không ngủ đông) AND chính Cain được ghi nhận kết liễu ít nhất 1 Hunter và 1 Shadow.
 * - 4P: Không chia Neutral -> luôn false.
 */
export function isCainPersonalVictorySatisfied(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
): boolean {
  if (!player.alive || isPlayerDormantPendingRevive(state, player)) return false;
  const allPlayers = Object.values(state.players);
  const seatCount = state.turnOrder.length > 0 ? state.turnOrder.length : allPlayers.length;
  if (seatCount <= 4) return false;

  if (seatCount === 5) {
    const killedFactions = state.expansionState?.killedFactionsByPlayer?.[player.playerId] ?? [];
    return killedFactions.includes('lantern-guard') && killedFactions.includes('mist-order');
  }

  let deadHunters = 0;
  let deadShadows = 0;
  let deadOtherNeutrals = 0;
  for (const other of allPlayers) {
    if (!isPlayerFinallyEliminated(state, other)) continue;
    const eff = getEffectiveFaction(state, other);
    if (eff === 'lantern-guard') deadHunters += 1;
    else if (eff === 'mist-order') deadShadows += 1;
    else if (eff === 'wanderer' && other.playerId !== player.playerId) deadOtherNeutrals += 1;
  }
  return deadHunters >= 1 && deadShadows >= 1 && deadOtherNeutrals >= 1;
}

/** CAP-07: Xây dựng toàn bộ tập liên kết phụ thuộc chiến thắng từ trạng thái hiện tại (thuần túy). */
export function buildVictoryDependencyLinks(
  state: AuthoritativeGameState,
): VictoryDependencyLink[] {
  const links: VictoryDependencyLink[] = [];
  const orderedIds =
    state.turnOrder.length > 0 ? state.turnOrder : Object.keys(state.players);
  const exp = state.expansionState;

  for (const pid of orderedIds) {
    const player = state.players[pid];
    if (!player) continue;
    const roleId = player.roleId as string;

    if (roleId === 'exp1_bethany') {
      const chosen = exp?.bethanyChosenByPlayer?.[pid];
      const targetId = chosen?.chosenPlayerId ?? null;
      const targetPlayer = targetId ? state.players[targetId] : null;
      links.push({
        linkId: `link:bethany:${pid}`,
        ownerPlayerId: pid,
        targetPlayerId: targetId,
        relation: 'SHARE_OUTCOME',
        sourceRoleId: targetPlayer?.roleId ?? null,
        sourceGoalRef: targetId ? `outcome:${targetId}` : 'unresolved:bethany-no-chosen',
        boundEventId: chosen?.boundEventId ?? 'unbound',
        boundAtMs: chosen?.boundAtMs ?? 0,
        boundTurnNumber: chosen?.designatedOnTurnNumber ?? 0,
        active: Boolean(targetId),
        requireOwnerAlive: false,
        bondMode: 'target-wins',
        fallbackCondition: 'none',
        unresolved: !targetId,
      });
    } else if (roleId === 'exp1_cassie') {
      const bind = exp?.cassieCopiedGoalByPlayer?.[pid];
      const targetId = bind?.targetPlayerId ?? null;
      links.push({
        linkId: `link:cassie:${pid}`,
        ownerPlayerId: pid,
        targetPlayerId: targetId,
        relation: 'COPY_GOAL',
        sourceRoleId: bind?.sourceRoleId ?? null,
        sourceGoalRef: bind ? `role:${bind.sourceRoleId}` : 'unresolved:cassie-no-neutral',
        boundEventId: bind?.boundEventId ?? 'unbound',
        boundAtMs: bind?.boundAtMs ?? 0,
        boundTurnNumber: bind?.boundTurnNumber ?? 0,
        active: Boolean(targetId && bind?.sourceRoleId),
        fallbackCondition: 'none',
        unresolved: !(targetId && bind?.sourceRoleId),
      });
    } else if (roleId === 'exp1_clairvoyant') {
      const vision = exp?.clairvoyantVisions?.[pid];
      const targetId = vision?.targetPlayerId ?? null;
      links.push({
        linkId: `link:clairvoyant:${pid}`,
        ownerPlayerId: pid,
        targetPlayerId: targetId,
        relation: 'COPY_GOAL',
        sourceRoleId: vision?.sourceRoleId ?? null,
        sourceGoalRef: vision ? `role:${vision.sourceRoleId}` : 'unresolved:clairvoyant-unused',
        boundEventId: vision?.boundEventId ?? 'unbound',
        boundAtMs: vision?.boundAtMs ?? 0,
        boundTurnNumber: vision?.boundTurnNumber ?? 0,
        active: Boolean(targetId && vision?.sourceRoleId),
        fallbackCondition: 'none',
        unresolved: !(targetId && vision?.sourceRoleId),
      });
    } else if (roleId === 'exp2_diana') {
      const contract = exp?.dianaContracts?.[pid];
      const isActive = contract?.status === 'active' && Boolean(contract.customerPlayerId);
      links.push({
        linkId: `link:diana:${pid}`,
        ownerPlayerId: pid,
        targetPlayerId: isActive ? contract!.customerPlayerId : null,
        relation: 'CONDITIONAL_SHARED',
        sourceRoleId: contract?.sourceRoleId ?? null,
        sourceGoalRef: isActive
          ? `outcome:${contract!.customerPlayerId}`
          : 'fallback:diana_full_hp_survivor',
        boundEventId: contract?.boundEventId ?? 'unbound',
        boundAtMs: contract?.boundAtMs ?? 0,
        boundTurnNumber: contract?.boundOnTurnNumber ?? 0,
        active: isActive,
        requireOwnerAlive: true,
        bondMode: 'target-wins',
        fallbackCondition: 'diana_full_hp_survivor',
        unresolved: !isActive,
      });
    } else if (roleId === 'exp2_aaron') {
      const spouse = exp?.aaronSpouseByPlayer?.[pid];
      const hasSpouse = Boolean(spouse?.spousePlayerId);
      links.push({
        linkId: `link:aaron:${pid}`,
        ownerPlayerId: pid,
        targetPlayerId: spouse?.spousePlayerId ?? null,
        relation: 'CONDITIONAL_SHARED',
        sourceRoleId: spouse?.sourceRoleId ?? null,
        sourceGoalRef: hasSpouse
          ? `both-alive:${spouse!.spousePlayerId}`
          : 'fallback:aaron_dead_before_end',
        boundEventId: spouse?.boundEventId ?? 'unbound',
        boundAtMs: spouse?.boundAtMs ?? 0,
        boundTurnNumber: spouse?.boundTurnNumber ?? 0,
        active: hasSpouse,
        requireOwnerAlive: true,
        requireTargetAlive: true,
        bondMode: 'both-alive',
        fallbackCondition: 'aaron_dead_before_end',
        unresolved: !hasSpouse,
      });
    } else if (roleId === 'exp1_antimony') {
      const bind = exp?.antimonyCopiedGoalByPlayer?.[pid];
      const targetId = bind?.targetPlayerId ?? null;
      links.push({
        linkId: `link:antimony:${pid}`,
        ownerPlayerId: pid,
        targetPlayerId: targetId,
        relation: 'COPY_GOAL',
        sourceRoleId: bind?.sourceRoleId ?? null,
        sourceGoalRef: bind ? `role:${bind.sourceRoleId}` : 'unresolved:antimony-unactivated',
        boundEventId: bind?.boundEventId ?? 'unbound',
        boundAtMs: bind?.boundAtMs ?? 0,
        boundTurnNumber: bind?.boundTurnNumber ?? 0,
        active: Boolean(targetId && bind?.sourceRoleId),
        fallbackCondition: 'none',
        unresolved: !(targetId && bind?.sourceRoleId),
      });
    }
  }

  return links;
}

function normalizeResolvedWinningFactions(
  resolvedWinnerFaction: VictoryEvaluation['winnerFaction'],
  resolvedWinningFactions?: readonly BoardGameFactionId[],
): readonly BoardGameFactionId[] {
  if (resolvedWinningFactions && resolvedWinningFactions.length > 0) {
    return resolvedWinningFactions;
  }
  if (resolvedWinnerFaction === 'multi-faction') {
    return ['lantern-guard', 'mist-order'];
  }
  if (
    resolvedWinnerFaction === 'lantern-guard' ||
    resolvedWinnerFaction === 'mist-order' ||
    resolvedWinnerFaction === 'wanderer'
  ) {
    return [resolvedWinnerFaction];
  }
  return [];
}

/**
 * Đánh giá điều kiện thắng trực tiếp (non-linked) của một `asRoleId` áp lên trạng thái của `subject`.
 * Thuần túy — dùng chung cho đánh giá vai gốc và đánh giá `COPY_GOAL` (Cassie / Clairvoyant / Antimony).
 */
export function evaluateDirectRoleGoalForSubject(
  state: AuthoritativeGameState,
  subject: AuthoritativePlayerState,
  asRoleId: string,
  resolvedWinnerFaction: VictoryEvaluation['winnerFaction'],
  allWanderers: readonly AuthoritativePlayerState[],
  timing: 'immediate' | 'end-of-match',
  isFinalFallback = false,
  resolvedWinningFactions?: readonly BoardGameFactionId[],
): boolean {
  const allPlayers = Object.values(state.players);
  const alivePlayers = allPlayers.filter(
    (p) => p.alive && !isPlayerDormantPendingRevive(state, p),
  );
  const deadCount = allPlayers.filter((p) => isPlayerFinallyEliminated(state, p)).length;
  const winningFactions = normalizeResolvedWinningFactions(
    resolvedWinnerFaction,
    resolvedWinningFactions,
  );
  const huntersWon = winningFactions.includes('lantern-guard');
  const shadowsWon = winningFactions.includes('mist-order');

  const design = getRoleDesign(asRoleId as BoardGameRoleId);
  if (design.faction === 'lantern-guard') {
    return timing === 'end-of-match' && huntersWon;
  }
  if (design.faction === 'mist-order') {
    return timing === 'end-of-match' && shadowsWon;
  }

  switch (asRoleId) {
    case 'lang-anh-san': // Bob: 5+ Trang bị
      return subject.alive && (isFinalFallback ? subject.equipped.length >= 3 : subject.equipped.length >= 5);
    case 'lang-quan-sat': // Allie: sống sót cuối trận (hoặc sống sót duy nhất)
      return timing === 'immediate' ? subject.alive && alivePlayers.length === 1 : subject.alive;
    case 'lang-cuu-ho': // Charles: giết người khi deadCount >= 3
      return subject.alive && subject.charlesKillWon;
    case 'lang-tien-phong': {
      // Daniel: người ĐẦU TIÊN bị loại, HOẶC còn sống khi Đội Săn Đêm thắng
      if (
        isPlayerFinallyEliminated(state, subject) &&
        state.firstDeadPlayerId === subject.playerId &&
        deadCount === 1
      ) {
        return true;
      }
      return timing === 'end-of-match' && subject.alive && huntersWon;
    }
    case 'exp1_cindy': {
      if (!subject.alive) return false;
      const otherNeutrals = allWanderers.filter((w) => w.playerId !== subject.playerId);
      if (otherNeutrals.length === 0) {
        return timing === 'end-of-match';
      }
      return otherNeutrals.every((w) => isPlayerFinallyEliminated(state, w));
    }
    case 'exp1_bipolar': {
      if (timing !== 'end-of-match') return false;
      if (huntersWon && shadowsWon) return true;
      if (huntersWon) return subject.alive;
      if (shadowsWon) return isPlayerFinallyEliminated(state, subject);
      return false;
    }
    case 'exp2_cruz':
      return Boolean(
        subject.alive &&
          state.expansionState?.cruzWinTriggeredIds?.includes(subject.playerId),
      );
    case 'exp2_bryon':
      return (
        timing === 'end-of-match' &&
        subject.alive &&
        allWanderers.every((w) => isPlayerLivingOrPendingRevive(state, w))
      );
    case 'exp2_arlene':
      return isArleneImmediateVictorySatisfied(state, subject);
    case 'exp1_angel':
      return timing === 'end-of-match' && isAngelEndOfMatchVictorySatisfied(subject, allWanderers);
    case 'exp2_bianca':
      return timing === 'end-of-match' && hasLowestRemainingHpAmongSurvivors(subject, alivePlayers);
    case 'exp2_dalton':
      if (isDaltonImmediateVictorySatisfied(state, subject)) return true;
      return timing === 'end-of-match' && hasHighestRemainingHpAmongSurvivors(subject, alivePlayers);
    case 'exp1_anathema':
      // Anathema: sống sót đến khi trận kết thúc (hoặc là người sống sót duy nhất)
      return timing === 'immediate' ? subject.alive && alivePlayers.length === 1 : subject.alive;
    case 'exp1_arnold':
      // Arnold: còn sống cuối trận với > 2 tổng số người chơi còn sống trên bàn
      return timing === 'end-of-match' && subject.alive && alivePlayers.length > 2;
    case 'exp2_april_skipps':
      if (isAprilSkippsCountdownVictorySatisfied(state, subject)) return true;
      return timing === 'end-of-match' && subject.alive && !subject.revealed;
    case 'exp2_colt':
      return isColtImmediateVictorySatisfied(subject);
    case 'exp2_cain':
      return isCainPersonalVictorySatisfied(state, subject);
    case 'exp2_bonnie':
      // Bonnie chỉ thắng khi đã chuyển phe động thành Shadow và phe Shadow thắng
      return (
        timing === 'end-of-match' &&
        getEffectiveFaction(state, subject) === 'mist-order' &&
        shadowsWon
      );
    case 'exp2_nc_soldier': {
      const grp = getPlayerAlliance(state, subject.playerId);
      return Boolean(grp && isNcSoldierAllianceVictorySatisfied(state, grp));
    }
    default:
      return false;
  }
}

export interface ExpandedVictoryDiagnostics {
  readonly evaluation: VictoryEvaluation;
  readonly graph: CopiedVictoryGraphResult | null;
}

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
      return overrides[player.playerId] ?? getEffectiveFaction(state, player);
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
  resolvedWinningFactions?: readonly BoardGameFactionId[],
): boolean {
  if (!isEffectiveNeutral(state, player)) return false;
  // Thành viên đã gia nhập liên minh N.C. Soldier thay thế mục tiêu cũ bằng mục tiêu chung của liên minh!
  if (isPlayerInAlliance(state, player.playerId)) return false;
  if (isLinkedVictoryRoleId(player.roleId)) return false;
  return evaluateDirectRoleGoalForSubject(
    state,
    player,
    player.roleId,
    resolvedWinnerFaction,
    allWanderers,
    'end-of-match',
    isFinalFallback,
    resolvedWinningFactions,
  );
}

function resolveWinnersWithCopiedGraph(
  state: AuthoritativeGameState,
  baseWinnerIds: ReadonlySet<string>,
  resolvedWinnerFaction: VictoryEvaluation['winnerFaction'],
  wanderers: readonly AuthoritativePlayerState[],
  links: readonly VictoryDependencyLink[],
  isFinalFallback = false,
  resolvedWinningFactions?: readonly BoardGameFactionId[],
): { readonly winnerIds: string[]; readonly graph: CopiedVictoryGraphResult } {
  const graph = evaluateCopiedVictoryGraph({
    state,
    timing: 'end-of-match',
    baseWinnerIds,
    links,
    evaluateDirectRoleGoalForSubject: (subject, asRoleId, timing) =>
      evaluateDirectRoleGoalForSubject(
        state,
        subject,
        asRoleId,
        resolvedWinnerFaction,
        wanderers,
        timing,
        isFinalFallback,
        resolvedWinningFactions,
      ),
  });
  return {
    winnerIds: [...graph.qualifiedPlayerIds],
    graph,
  };
}

/**
 * Bộ đánh giá điều kiện thắng cho các ruleset mở rộng kèm chẩn đoán đồ thị `CopiedVictoryGraph`
 * (thuần túy — tuyệt đối không mutate `state` và không chạm vào `victory.ts` của Classic).
 *
 * Phase 7A: Hỗ trợ đầy đủ DynamicAllegiance (Bonnie), Alliance Groups (N.C. Soldier),
 * PendingResurrection (Undead dormancy), MultiFactionVictory (Cain song phe Hunter + Shadow),
 * và gộp đồng thời các ứng viên thắng tức thì trong cùng một lô sự kiện.
 */
export function evaluateExpandedVictoryWithDiagnostics(
  state: AuthoritativeGameState,
): ExpandedVictoryDiagnostics {
  const allPlayers = Object.values(state.players);
  const alivePlayers = allPlayers.filter(
    (p) => p.alive && !isPlayerDormantPendingRevive(state, p),
  );
  const deadCount = allPlayers.filter((p) => isPlayerFinallyEliminated(state, p)).length;

  // DynamicAllegiance: phân nhóm theo `effectiveFaction` (không bao giờ đếm Bonnie ở cả 2 phe!)
  const hunterPlayers = allPlayers.filter(
    (p) => getEffectiveFaction(state, p) === 'lantern-guard',
  );
  const shadowPlayers = allPlayers.filter(
    (p) => getEffectiveFaction(state, p) === 'mist-order',
  );
  const wanderers = allPlayers.filter(
    (p) => getEffectiveFaction(state, p) === 'wanderer',
  );
  const links = buildVictoryDependencyLinks(state);

  // PendingResurrection: Undead ở `DORMANT_PENDING_REVIVE` VẪN ĐƯỢC TÍNH LÀ CHƯA BỊ LOẠI!
  const huntersAlive = hunterPlayers.filter((p) => isPlayerLivingOrPendingRevive(state, p)).length;
  const shadowsAlive = shadowPlayers.filter((p) => isPlayerLivingOrPendingRevive(state, p)).length;
  const wanderersDead = wanderers.filter((w) => isPlayerFinallyEliminated(state, w)).length;

  // MultiFactionVictory (Cain global death modifier): khi người đã kích hoạt kỹ năng Cain bị loại vĩnh viễn
  const cainModifierDeadPlayers = (state.expansionState?.cainDeathVictoryModifierIds ?? [])
    .map((pid) => state.players[pid])
    .filter((p): p is AuthoritativePlayerState => Boolean(p && isPlayerFinallyEliminated(state, p)));
  const cainDualFactionTriggered = cainModifierDeadPlayers.length > 0;

  const allShadowsDead = shadowPlayers.length > 0 && shadowsAlive === 0;
  const allHuntersDead = hunterPlayers.length > 0 && huntersAlive === 0;
  const shadowsReachedThreeNeutralKills = shadowPlayers.length > 0 && wanderersDead >= 3;
  const huntersTriggered = allShadowsDead || cainDualFactionTriggered;
  const shadowsTriggered =
    allHuntersDead || shadowsReachedThreeNeutralKills || cainDualFactionTriggered;

  // Các điều kiện thắng tức thì của Kẻ Độc Hành (loại trừ thành viên đã vào liên minh N.C. Soldier)
  const unalignedWanderers = wanderers.filter((w) => !isPlayerInAlliance(state, w.playerId));

  const bobWinners = unalignedWanderers.filter(
    (w) => w.alive && w.roleId === 'lang-anh-san' && w.equipped.length >= 5,
  );
  const charlesWinners = unalignedWanderers.filter(
    (w) => w.alive && w.roleId === 'lang-cuu-ho' && w.charlesKillWon,
  );
  const danielFirstDeathWinners = unalignedWanderers.filter(
    (w) =>
      isPlayerFinallyEliminated(state, w) &&
      w.roleId === 'lang-tien-phong' &&
      state.firstDeadPlayerId === w.playerId &&
      deadCount === 1,
  );
  const soleSurvivorNeutralWinners = unalignedWanderers.filter(
    (w) =>
      w.alive &&
      alivePlayers.length === 1 &&
      !allPlayers.some((p) => isPlayerDormantPendingRevive(state, p)) &&
      (w.roleId === 'lang-quan-sat' || (w.roleId as string) === 'exp1_anathema'),
  );
  const cindySoloWinners = unalignedWanderers.filter((w) => {
    if (!w.alive || w.roleId !== 'exp1_cindy') return false;
    const otherNeutrals = wanderers.filter((other) => other.playerId !== w.playerId);
    // Bàn 5P (0 Neutral khác): KHÔNG tự thắng ngay lúc phân vai hay giữa trận!
    if (otherNeutrals.length === 0) return false;
    return otherNeutrals.every((other) => isPlayerFinallyEliminated(state, other));
  });
  const cruzSoloWinners = unalignedWanderers.filter(
    (w) =>
      w.alive &&
      w.roleId === 'exp2_cruz' &&
      Boolean(state.expansionState?.cruzWinTriggeredIds?.includes(w.playerId)),
  );
  const arleneSoloWinners = unalignedWanderers.filter(
    (w) => w.roleId === 'exp2_arlene' && isArleneImmediateVictorySatisfied(state, w),
  );
  const daltonSoloWinners = unalignedWanderers.filter(
    (w) => w.roleId === 'exp2_dalton' && isDaltonImmediateVictorySatisfied(state, w),
  );
  const coltSoloWinners = unalignedWanderers.filter(
    (w) => (w.roleId as string) === 'exp2_colt' && isColtImmediateVictorySatisfied(w),
  );
  const aprilCountdownWinners = unalignedWanderers.filter(
    (w) =>
      (w.roleId as string) === 'exp2_april_skipps' &&
      isAprilSkippsCountdownVictorySatisfied(state, w),
  );
  const cainSoloWinners = unalignedWanderers.filter(
    (w) => (w.roleId as string) === 'exp2_cain' && isCainPersonalVictorySatisfied(state, w),
  );

  // Điều kiện thắng tức thì của Liên minh N.C. Soldier (thủ lĩnh + mọi thành viên được chiêu mộ)
  const satisfiedAlliances = listAlliances(state).filter((grp) =>
    isNcSoldierAllianceVictorySatisfied(state, grp),
  );
  const allianceWinnerPlayers: AuthoritativePlayerState[] = [];
  for (const grp of satisfiedAlliances) {
    for (const memberId of grp.memberPlayerIds) {
      const m = state.players[memberId];
      if (m && !allianceWinnerPlayers.some((x) => x.playerId === m.playerId)) {
        allianceWinnerPlayers.push(m);
      }
    }
  }

  // Kiểm tra mục tiêu tức thì thông qua `COPY_GOAL` (Cassie / Clairvoyant / Antimony)
  const copiedImmediateWinners: AuthoritativePlayerState[] = [];
  if (links.some((l) => l.relation === 'COPY_GOAL' && l.active && !l.unresolved)) {
    const immGraph = evaluateCopiedVictoryGraph({
      state,
      timing: 'immediate',
      baseWinnerIds: new Set<string>(),
      links,
      evaluateDirectRoleGoalForSubject: (subject, asRoleId, timing) =>
        evaluateDirectRoleGoalForSubject(
          state,
          subject,
          asRoleId,
          null,
          wanderers,
          timing,
          false,
        ),
    });
    for (const pid of immGraph.qualifiedPlayerIds) {
      const node = immGraph.evaluatedByPlayer[pid];
      const p = state.players[pid];
      if (
        p &&
        node &&
        node.won &&
        node.via === 'copy_goal' &&
        !isPlayerInAlliance(state, p.playerId)
      ) {
        copiedImmediateWinners.push(p);
      }
    }
  }

  const soloTriggers = [
    ...bobWinners,
    ...charlesWinners,
    ...danielFirstDeathWinners,
    ...soleSurvivorNeutralWinners,
    ...cindySoloWinners,
    ...cruzSoloWinners,
    ...arleneSoloWinners,
    ...daltonSoloWinners,
    ...coltSoloWinners,
    ...aprilCountdownWinners,
    ...cainSoloWinners,
    ...allianceWinnerPlayers,
    ...copiedImmediateWinners,
  ];

  // 1. MultiFactionVictory — Đồng thắng cả Đội Săn Đêm & Hội Bóng Đêm (Cain hoặc đồng quy)
  if (huntersTriggered && shadowsTriggered) {
    const winningFactions: BoardGameFactionId[] = ['lantern-guard', 'mist-order'];
    const winnerSet = new Set<string>([
      ...hunterPlayers.map((p) => p.playerId),
      ...shadowPlayers.map((p) => p.playerId),
      ...soloTriggers.map((p) => p.playerId),
    ]);
    for (const w of wanderers) {
      if (
        qualifiesClassicOrExpandedWanderer(
          state,
          w,
          'multi-faction',
          wanderers,
          false,
          winningFactions,
        )
      ) {
        winnerSet.add(w.playerId);
      }
    }
    const { winnerIds, graph } = resolveWinnersWithCopiedGraph(
      state,
      winnerSet,
      'multi-faction',
      wanderers,
      links,
      false,
      winningFactions,
    );
    const cainNames = cainModifierDeadPlayers.map((p) => p.displayName).join(', ');
    return {
      graph,
      evaluation: {
        finished: true,
        winnerFaction: 'multi-faction',
        winningFactions,
        winnerLabel: `${FACTION_LABELS['lantern-guard']} & ${FACTION_LABELS['mist-order']} (Đồng Thắng)`,
        winnerPlayerIds: winnerIds,
        winReason: cainDualFactionTriggered
          ? `Nước Cờ Quyền Lực: ${cainNames} bị loại vĩnh viễn — cả ${FACTION_LABELS['lantern-guard']} và ${FACTION_LABELS['mist-order']} đồng thời giành chiến thắng!`
          : `Đòn quyết tử đồng quy — cả ${FACTION_LABELS['lantern-guard']} và ${FACTION_LABELS['mist-order']} đồng thời thỏa mãn điều kiện thắng!`,
        winningRoleIds: winnerIds.map((id) => state.players[id].roleId),
      },
    };
  }

  // 2. Đội Săn Đêm tiêu diệt hết Hội Bóng Đêm
  if (huntersTriggered) {
    const winningFactions: BoardGameFactionId[] = ['lantern-guard'];
    const winnerSet = new Set<string>([
      ...hunterPlayers.map((p) => p.playerId),
      ...soloTriggers.map((p) => p.playerId),
    ]);
    for (const w of wanderers) {
      if (
        qualifiesClassicOrExpandedWanderer(
          state,
          w,
          'lantern-guard',
          wanderers,
          false,
          winningFactions,
        )
      ) {
        winnerSet.add(w.playerId);
      }
    }
    const { winnerIds, graph } = resolveWinnersWithCopiedGraph(
      state,
      winnerSet,
      'lantern-guard',
      wanderers,
      links,
      false,
      winningFactions,
    );
    return {
      graph,
      evaluation: {
        finished: true,
        winnerFaction: 'lantern-guard',
        winningFactions,
        winnerLabel: FACTION_LABELS['lantern-guard'],
        winnerPlayerIds: winnerIds,
        winReason: 'Toàn bộ Hội Bóng Đêm đã bị loại khỏi KTX!',
        winningRoleIds: winnerIds.map((id) => state.players[id].roleId),
      },
    };
  }

  // 3. Hội Bóng Đêm tiêu diệt hết Đội Săn Đêm HOẶC có đủ 3 Kẻ Độc Hành gục ngã
  if (shadowsTriggered) {
    const winningFactions: BoardGameFactionId[] = ['mist-order'];
    const winnerSet = new Set<string>([
      ...shadowPlayers.map((p) => p.playerId),
      ...soloTriggers.map((p) => p.playerId),
    ]);
    for (const w of wanderers) {
      if (
        qualifiesClassicOrExpandedWanderer(
          state,
          w,
          'mist-order',
          wanderers,
          false,
          winningFactions,
        )
      ) {
        winnerSet.add(w.playerId);
      }
    }
    const { winnerIds, graph } = resolveWinnersWithCopiedGraph(
      state,
      winnerSet,
      'mist-order',
      wanderers,
      links,
      false,
      winningFactions,
    );
    return {
      graph,
      evaluation: {
        finished: true,
        winnerFaction: 'mist-order',
        winningFactions,
        winnerLabel: FACTION_LABELS['mist-order'],
        winnerPlayerIds: winnerIds,
        winReason: allHuntersDead
          ? 'Toàn bộ Đội Săn Đêm đã gục ngã — Hội Bóng Đêm làm chủ KTX!'
          : `Đã có ${wanderersDead} Kẻ Độc Hành gục ngã — Hội Bóng Đêm kích hoạt thắng lợi!`,
        winningRoleIds: winnerIds.map((id) => state.players[id].roleId),
      },
    };
  }

  // 4. Các điều kiện thắng tức thì của Kẻ Độc Hành & Liên minh N.C. Soldier
  if (soloTriggers.length > 0) {
    const lead = soloTriggers[0];
    const leadDesign = getRoleDesign(lead.roleId);
    const winningFactions: BoardGameFactionId[] = ['wanderer'];
    const winnerSet = new Set<string>(soloTriggers.map((p) => p.playerId));
    for (const w of wanderers) {
      if (
        qualifiesClassicOrExpandedWanderer(
          state,
          w,
          'wanderer-solo',
          wanderers,
          false,
          winningFactions,
        )
      ) {
        winnerSet.add(w.playerId);
      }
    }
    const { winnerIds, graph } = resolveWinnersWithCopiedGraph(
      state,
      winnerSet,
      'wanderer-solo',
      wanderers,
      links,
      false,
      winningFactions,
    );
    const leadRoleStr = lead.roleId as string;
    const isAllianceLead = satisfiedAlliances.some(
      (grp) => grp.leaderPlayerId === lead.playerId || grp.memberPlayerIds.includes(lead.playerId),
    );
    const winReason = isAllianceLead
      ? `Liên minh Chiêu Mộ (${lead.displayName}) đã chiêu mộ toàn bộ Kẻ Độc Hành khác và thu thập đủ 3 vũ khí (Súng Máy, Súng Ngắn, Cưa Máy) — chiến thắng tức thì!`
      : leadRoleStr === 'lang-anh-san'
        ? `${lead.displayName} sở hữu đủ ${lead.equipped.length} Trang bị — hoàn thành mục tiêu Độc Hành!`
        : leadRoleStr === 'lang-cuu-ho'
          ? `${lead.displayName} đã hạ gục mục tiêu khi có ${deadCount} người ngã xuống (≥ 3)!`
          : leadRoleStr === 'lang-tien-phong'
            ? `${lead.displayName} (Đạt "Cảm Tử") là người ĐẦU TIÊN ngã xuống — hoàn thành mục tiêu tức thì!`
            : leadRoleStr === 'exp1_cindy'
              ? `${lead.displayName} (Cindy) là Kẻ Độc Hành duy nhất sống sót khi toàn bộ Neutral khác đã bị loại!`
              : leadRoleStr === 'exp2_cruz'
                ? `${lead.displayName} (Cruz) đã hạ gục mục tiêu trong lượt dùng thẻ Đột Kích đặc trưng — hoàn thành mục tiêu Độc Hành!`
                : leadRoleStr === 'exp2_arlene'
                  ? `${lead.displayName} (Arlene) đã bị một Đội Săn Đêm hạ gục — hoàn thành mục tiêu Độc Hành tức thì!`
                  : leadRoleStr === 'exp2_dalton'
                    ? `${lead.displayName} (Dalton) đã hạ gục mục tiêu sau khi kích hoạt Vòng Đấu Thứ 12 — hoàn thành mục tiêu Độc Hành tức thì!`
                    : leadRoleStr === 'exp2_colt'
                      ? `${lead.displayName} (Colt) đã thu thập đủ ${countColtQualifyingWeapons(lead.equipped)} vũ khí chuẩn — hoàn thành mục tiêu Độc Hành tức thì!`
                      : leadRoleStr === 'exp2_april_skipps'
                        ? `${lead.displayName} (April & Skipps) đã sống sót qua cuối lượt kế tiếp sau khi bị phát hiện ở ô 7 — chiến thắng tức thì!`
                        : leadRoleStr === 'exp2_cain'
                          ? `${lead.displayName} (Cain) đã hoàn thành điều kiện loại các phe mục tiêu — chiến thắng Độc Hành tức thì!`
                          : leadRoleStr === 'exp1_cassie' ||
                              leadRoleStr === 'exp1_clairvoyant' ||
                              leadRoleStr === 'exp1_antimony'
                            ? `${lead.displayName} (${leadDesign.name}) đã hoàn thành điều kiện thắng sao chép tức thì!`
                            : `${lead.displayName} (${leadDesign.name}) trụ lại sống sót cuối cùng!`;
    return {
      graph,
      evaluation: {
        finished: true,
        winnerFaction: 'wanderer-solo',
        winningFactions,
        winnerLabel: isAllianceLead
          ? `Liên minh Chiêu Mộ — ${lead.displayName}`
          : `Kẻ Độc Hành — ${lead.displayName} (${leadDesign.name})`,
        winnerPlayerIds: winnerIds,
        winReason,
        winningRoleIds: winnerIds.map((id) => state.players[id].roleId),
      },
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
    const winningFactions: BoardGameFactionId[] = [topFaction];
    const baseWinners = topFaction === 'lantern-guard' ? hunterPlayers : shadowPlayers;
    const winnerSet = new Set<string>(baseWinners.map((p) => p.playerId));
    for (const w of wanderers) {
      if (
        qualifiesClassicOrExpandedWanderer(
          state,
          w,
          topFaction,
          wanderers,
          true,
          winningFactions,
        )
      ) {
        winnerSet.add(w.playerId);
      }
    }
    const { winnerIds, graph } = resolveWinnersWithCopiedGraph(
      state,
      winnerSet,
      topFaction,
      wanderers,
      links,
      true,
      winningFactions,
    );
    return {
      graph,
      evaluation: {
        finished: true,
        winnerFaction: topFaction,
        winningFactions,
        winnerLabel: `${FACTION_LABELS[topFaction]} (Ưu thế sinh tồn)`,
        winnerPlayerIds: winnerIds,
        winReason: `Hết ${state.maxRounds} vòng an toàn — ${FACTION_LABELS[topFaction]} chiếm ưu thế sinh tồn!`,
        winningRoleIds: winnerIds.map((id) => state.players[id].roleId),
      },
    };
  }

  return {
    graph: null,
    evaluation: {
      finished: false,
      winnerFaction: null,
      winnerLabel: null,
      winnerPlayerIds: [],
      winReason: null,
      winningRoleIds: [],
    },
  };
}

/**
 * Bộ đánh giá điều kiện thắng cho các ruleset mở rộng (`rulesetId !== 'classic'`).
 * Ủy quyền sang `evaluateExpandedVictoryWithDiagnostics()` mà KHÔNG chạm `victory.ts`.
 */
export function evaluateExpandedVictory(state: AuthoritativeGameState): VictoryEvaluation {
  return evaluateExpandedVictoryWithDiagnostics(state).evaluation;
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
