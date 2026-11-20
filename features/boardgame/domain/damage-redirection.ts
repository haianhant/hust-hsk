// ---------------------------------------------------------------------------
// features/boardgame/domain/damage-redirection.ts — CAP-06 Centralized Damage
// Redirection Stage & Causal Attribution Tracer (Phase 6A).
//
// Phục vụ:
// - Anathema (`exp1_anathema`): chuyển sát thương hợp lệ sang mục tiêu bị nguyền
//   trước tầng phòng thủ của Anathema; tự dừng khi mục tiêu bị nguyền chết.
// - Arnold (`exp1_arnold`): 1 lần/trận chặn sát thương chí mạng sau phòng thủ và
//   phản toàn bộ lượng sát thương kết liễu sang kẻ tấn công còn sống (giữ nguyên HP).
//
// Ràng buộc an toàn tuyệt đối:
// - Chuỗi chuyển hướng bị chặn cứng bởi `MAX_REDIRECT_CHAIN_DEPTH = 4` VÀ tập
//   `redirectChain` (visited-target set) -> không bao giờ nảy vòng vô hạn.
// - Không chuyển hướng chi phí máu (`isHpCost`) hoặc sát thương không thể ngăn (`unpreventable`).
// - Không bao giờ tạo sát thương kép, loại kép hay loot kép.
// - Lưu trace nội bộ (`expansionState.damageTraces`) để kiểm toán, KHÔNG xuất công khai.
// ---------------------------------------------------------------------------

import type {
  AuthoritativeGameState,
  DamageSourceKind,
  PendingResolutionStep,
} from './types';

export const MAX_REDIRECT_CHAIN_DEPTH = 4;
const MAX_STORED_DAMAGE_TRACES = 64;

export type DamagePreventionOutcome =
  | 'none'
  | 'redirected-anathema'
  | 'redirected-arnold'
  | 'converted-urban-legend'
  | 'prevented-angel'
  | 'prevented-guardian-shield'
  | 'prevented-lucky-brooch'
  | 'prevented-talisman'
  | 'prevented-witch'
  | 'prevented-bianca'
  | 'mitigated';

export interface DamageRedirectionTrace {
  readonly damageEventId: string;
  readonly causationId?: string;
  readonly originalAttackerPlayerId: string | null;
  readonly originalTargetPlayerId: string;
  readonly effectiveTargetPlayerId: string;
  readonly sourceType: DamageSourceKind;
  readonly redirectChain: readonly string[];
  readonly redirectDepth: number;
  readonly preventionOutcome: DamagePreventionOutcome;
  readonly actualHpLoss: number;
  readonly eliminationAttributionPlayerId: string | null;
}

export type DamageStep = Extract<PendingResolutionStep, { kind: 'DAMAGE' }>;

export type AnathemaRedirectResolution =
  | {
      readonly redirected: false;
      readonly reason:
        | 'not-anathema'
        | 'no-active-curse'
        | 'already-redirected'
        | 'unpreventable-or-cost'
        | 'zero-damage'
        | 'target-dead'
        | 'cycle-or-visited'
        | 'depth-exceeded';
    }
  | {
      readonly redirected: true;
      readonly anathemaPlayerId: string;
      readonly newTargetPlayerId: string;
      readonly originalTargetPlayerId: string;
      readonly originalAttackerPlayerId: string | null;
      readonly nextRedirectChain: readonly string[];
      readonly nextRedirectDepth: number;
    };

export type ArnoldReflectionEligibility =
  | {
      readonly eligible: false;
      readonly reason:
        | 'not-arnold'
        | 'already-used'
        | 'already-checked'
        | 'not-lethal'
        | 'unpreventable-or-cost'
        | 'already-arnold-reflection'
        | 'no-valid-attacker'
        | 'self-damage'
        | 'attacker-dead'
        | 'cycle-or-visited'
        | 'depth-exceeded';
    }
  | {
      readonly eligible: true;
      readonly arnoldPlayerId: string;
      readonly reflectTargetPlayerId: string;
      readonly reflectedAmount: number;
      readonly originalAttackerPlayerId: string | null;
      readonly originalTargetPlayerId: string;
      readonly nextRedirectChain: readonly string[];
      readonly nextRedirectDepth: number;
    };

/** Trả về danh sách nút đã đi qua (bao gồm cả target hiện tại nếu chưa có). */
export function buildVisitedRedirectChain(step: DamageStep): string[] {
  const existing = Array.isArray(step.redirectChain) ? [...step.redirectChain] : [];
  if (!existing.includes(step.targetPlayerId)) {
    existing.push(step.targetPlayerId);
  }
  return existing;
}

/**
 * Đánh giá chuyển hướng sát thương của Anathema (`exp1_anathema`) ở Stage 0 (Pre-Defense).
 * Thuần túy (không mutate state): caller tạo bước DAMAGE mới đã chuyển hướng và đánh dấu sự kiện.
 */
export function evaluateAnathemaRedirection(
  state: AuthoritativeGameState,
  step: DamageStep,
): AnathemaRedirectResolution {
  if (step.rawAmount <= 0) {
    return { redirected: false, reason: 'zero-damage' };
  }
  if (step.isHpCost || step.unpreventable || step.sourceType === 'hp-cost') {
    return { redirected: false, reason: 'unpreventable-or-cost' };
  }
  if (step.anathemaRedirected) {
    return { redirected: false, reason: 'already-redirected' };
  }

  const target = state.players[step.targetPlayerId];
  if (!target || !target.alive || !target.revealed || (target.roleId as string) !== 'exp1_anathema') {
    return { redirected: false, reason: 'not-anathema' };
  }

  const curse = state.expansionState?.anathemaCurses?.[target.playerId];
  if (!curse || !curse.active || !curse.targetPlayerId) {
    return { redirected: false, reason: 'no-active-curse' };
  }

  const cursedVictim = state.players[curse.targetPlayerId];
  if (!cursedVictim || !cursedVictim.alive || cursedVictim.playerId === target.playerId) {
    return { redirected: false, reason: 'target-dead' };
  }

  const currentDepth = step.redirectDepth ?? 0;
  if (currentDepth >= MAX_REDIRECT_CHAIN_DEPTH) {
    return { redirected: false, reason: 'depth-exceeded' };
  }

  const visited = buildVisitedRedirectChain(step);
  if (visited.includes(cursedVictim.playerId)) {
    return { redirected: false, reason: 'cycle-or-visited' };
  }

  return {
    redirected: true,
    anathemaPlayerId: target.playerId,
    newTargetPlayerId: cursedVictim.playerId,
    originalTargetPlayerId: step.originalTargetPlayerId ?? target.playerId,
    originalAttackerPlayerId: step.originalAttackerPlayerId ?? step.attackerPlayerId ?? null,
    nextRedirectChain: [...visited, cursedVictim.playerId],
    nextRedirectDepth: currentDepth + 1,
  };
}

/**
 * Tạo bước `DAMAGE` đã chuyển hướng từ Anathema sang nạn nhân bị nguyền.
 * Giữ nguyên `attackerPlayerId` & `originalAttackerPlayerId`, xóa cờ phòng thủ của Anathema
 * để nạn nhân bị nguyền chạy đầy đủ chuỗi phòng thủ riêng (Witch/Angel/G43/Holy Robe/Undying/Bianca/Arnold).
 */
export function buildAnathemaRedirectedDamageStep(
  originalStep: DamageStep,
  resolution: Extract<AnathemaRedirectResolution, { redirected: true }>,
  newDamageEventId: string,
  anathemaDisplayName: string,
  cursedVictimDisplayName: string,
): DamageStep {
  return {
    ...originalStep,
    damageEventId: newDamageEventId,
    causationId: originalStep.damageEventId,
    originalAttackerPlayerId: resolution.originalAttackerPlayerId,
    originalTargetPlayerId: resolution.originalTargetPlayerId,
    targetPlayerId: resolution.newTargetPlayerId,
    anathemaRedirected: true,
    redirectChain: [...resolution.nextRedirectChain],
    redirectDepth: resolution.nextRedirectDepth,
    // Reset các cờ phòng thủ đặc thù theo nạn nhân để áp đúng phòng thủ của người bị nguyền
    urbanLegendChecked: false,
    urbanLegendConverted: false,
    undyingChecked: false,
    undyingReduced: false,
    preUndyingDmg: undefined,
    biancaChecked: false,
    biancaPrevented: false,
    postMitigationDmg: undefined,
    arnoldChecked: false,
    arnoldReflected: false,
    preAttackTargetHp: undefined,
    preAttackTargetRevealed: undefined,
    attackSingleTargetLog: undefined,
    postLogKind: 'skill',
    postLogPrefix: `🩸 Lời Nguyền (${anathemaDisplayName}): sát thương chuyển sang ${cursedVictimDisplayName} gây `,
    postLogSuffix: ' ST!',
    postLogActorId: originalStep.attackerPlayerId ?? resolution.anathemaPlayerId,
  };
}

/**
 * Đánh giá khả năng kích hoạt phản đòn chí mạng của Arnold (`exp1_arnold`) ở Stage 4
 * (sau phòng thủ/giảm sát thương, ngay trước khi trừ HP).
 */
export function evaluateArnoldLethalReflection(
  state: AuthoritativeGameState,
  step: DamageStep,
  postMitigationDmg: number,
): ArnoldReflectionEligibility {
  const target = state.players[step.targetPlayerId];
  if (!target || !target.alive || (target.roleId as string) !== 'exp1_arnold') {
    return { eligible: false, reason: 'not-arnold' };
  }
  if (target.skillUsedOnce) {
    return { eligible: false, reason: 'already-used' };
  }
  if (step.arnoldChecked) {
    return { eligible: false, reason: 'already-checked' };
  }
  if (step.isHpCost || step.unpreventable || step.sourceType === 'hp-cost') {
    return { eligible: false, reason: 'unpreventable-or-cost' };
  }
  if (step.isArnoldReflection) {
    return { eligible: false, reason: 'already-arnold-reflection' };
  }
  if (postMitigationDmg < target.hp || postMitigationDmg <= 0) {
    return { eligible: false, reason: 'not-lethal' };
  }

  const attackerId = step.attackerPlayerId;
  if (!attackerId) {
    return { eligible: false, reason: 'no-valid-attacker' };
  }
  if (attackerId === target.playerId) {
    return { eligible: false, reason: 'self-damage' };
  }
  const attacker = state.players[attackerId];
  if (!attacker || !attacker.alive) {
    return { eligible: false, reason: 'attacker-dead' };
  }

  const currentDepth = step.redirectDepth ?? 0;
  if (currentDepth >= MAX_REDIRECT_CHAIN_DEPTH) {
    return { eligible: false, reason: 'depth-exceeded' };
  }

  const visited = buildVisitedRedirectChain(step);
  if (visited.includes(attackerId)) {
    return { eligible: false, reason: 'cycle-or-visited' };
  }

  return {
    eligible: true,
    arnoldPlayerId: target.playerId,
    reflectTargetPlayerId: attackerId,
    reflectedAmount: postMitigationDmg,
    originalAttackerPlayerId: step.originalAttackerPlayerId ?? attackerId,
    originalTargetPlayerId: step.originalTargetPlayerId ?? target.playerId,
    nextRedirectChain: [...visited, attackerId],
    nextRedirectDepth: currentDepth + 1,
  };
}

/**
 * Tạo 1 bước `DAMAGE` phản đòn duy nhất có liên kết nhân quả (`causationId`) từ Arnold
 * trả về kẻ đã gây sát thương chí mạng.
 */
export function buildArnoldReflectedDamageStep(
  originalStep: DamageStep,
  eligibility: Extract<ArnoldReflectionEligibility, { eligible: true }>,
  newDamageEventId: string,
  arnoldDisplayName: string,
  attackerDisplayName: string,
  revealedNow: boolean,
): DamageStep {
  return {
    kind: 'DAMAGE',
    damageEventId: newDamageEventId,
    causationId: originalStep.damageEventId,
    originalAttackerPlayerId: eligibility.originalAttackerPlayerId,
    originalTargetPlayerId: eligibility.originalTargetPlayerId,
    targetPlayerId: eligibility.reflectTargetPlayerId,
    attackerPlayerId: eligibility.arnoldPlayerId,
    rawAmount: eligibility.reflectedAmount,
    sourceType: 'skill',
    isSingleTarget: true,
    isArnoldReflection: true,
    redirectChain: [...eligibility.nextRedirectChain],
    redirectDepth: eligibility.nextRedirectDepth,
    chainDepth: (originalStep.chainDepth ?? 0) + 1,
    postLogKind: revealedNow ? 'reveal' : 'skill',
    postLogPrefix: revealedNow
      ? `🎭🪞 ${arnoldDisplayName} lật vai Arnold — Số Phận Thay Đổi: tránh đòn chí mạng (giữ nguyên HP) và phản sang ${attackerDisplayName} gây `
      : `🪞 Arnold (${arnoldDisplayName}) — Số Phận Thay Đổi: tránh đòn chí mạng (giữ nguyên HP) và phản sang ${attackerDisplayName} gây `,
    postLogSuffix: ' sát thương!',
    postLogActorId: eligibility.arnoldPlayerId,
  };
}

/** Ghi trace kiểm toán nội bộ vào `expansionState.damageTraces` (không bao giờ gửi ra công khai). */
export function recordDamageRedirectionTrace(
  state: AuthoritativeGameState,
  trace: DamageRedirectionTrace,
): void {
  const exp = state.expansionState;
  if (!exp) return;
  if (!Array.isArray(exp.damageTraces)) {
    exp.damageTraces = [];
  }
  exp.damageTraces.push(trace);
  if (exp.damageTraces.length > MAX_STORED_DAMAGE_TRACES) {
    exp.damageTraces.splice(0, exp.damageTraces.length - MAX_STORED_DAMAGE_TRACES);
  }
}
