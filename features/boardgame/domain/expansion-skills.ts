// ---------------------------------------------------------------------------
// features/boardgame/domain/expansion-skills.ts — Phase 2 Expansion Skill
// Handlers, Serializable Pending Choice & Deterministic Continuation Pipeline.
//
// Ràng buộc tuyệt đối:
// - KHÔNG bao giờ chạy trong chế độ `classic` (Classic giữ nguyên 100% RNG & logic).
// - Mọi trạng thái pending choice & continuation đều thuần JSON trong
//   `AuthoritativeGameState` (tương thích 100% SQLite DO Hibernation & F5 Reconnect).
// - Bảo mật P0: Secret reactions (Wendigo/Undying chưa lật vai) không lộ
//   ownerPlayerId / kind / options / log công khai khi từ chối hoặc timeout.
// ---------------------------------------------------------------------------

import {
  BOARD_GAME_CHOICE_TIMEOUT_MS,
  BOARD_GAME_DISCONNECTED_CHOICE_TIMEOUT_MS,
  isValidBoardGameReactionPolicy,
  type BoardGameChoiceOptionView,
  type BoardGameDeckId,
  type BoardGameFactionId,
  type BoardGameLocationId,
  type BoardGameReactionPolicy,
  type BoardGameRoleId,
  type Phase2ARoleId,
  type Phase2BRoleId,
  type Phase2RoleId,
  type Phase3RoleId,
  type Phase4RoleId,
  type Phase5BRoleId,
} from '../../../shared/contracts/boardgame';
import {
  getCardById,
  isConsumableDamagingBlackCardId,
  isCruzQualifyingCardId,
  MASAMUNE_CARD_ID,
  toCardPublicMeta,
} from './cards';
import {
  appendHighlight,
  appendPrivateClue,
  appendPublicLog,
  discardCardId,
  equipToPlayerSlot,
  resolveDiceRollMove,
  resolveDrawLocationCard,
  resolveRevealRole,
  resolveUseCard,
  revealPlayerNow,
  stealAllEquippedGear,
  stealOneEquippedGear,
  takeOneCardFromDeck,
  transferLowestEquippedGear,
} from './effects';
import {
  executeHealPipeline,
  type HealPipelineHooks,
} from './heal-pipeline';
import { FACTION_LABELS, getRoleDesign, isEligibleForChocolateHeal } from './roles';
import {
  BOARD_GAME_MAX_HAND,
  canPlayerAttackTarget,
  getLocationDefinition,
  getRemainingHp,
  isPlayerAtExactLocationAlias,
  listLivingPlayersInSameCluster,
  listReachableAttackTargets,
  LOCATIONS_CATALOG,
  nextRandomInt,
  resolveLocationAlias,
  resolveLocationForDiceTotal,
  rollD4,
  rollD6,
} from './rules';
import {
  createSkillEngine,
  type SkillEngine,
  type SkillHandlerDefinition,
  type SkillTrigger,
} from './skill-engine';
import type {
  AttackRollSample,
  AuthoritativeGameState,
  AuthoritativePendingChoice,
  AuthoritativePlayerState,
  DamageSourceKind,
  EngineActionResult,
  ExpansionRuntimeState,
  PendingResolutionStep,
} from './types';
import type { VictoryArchetype } from './victory-engine';

const MAX_PROCESSED_EVENT_IDS = 256;
const MAX_RESOLVED_CHOICE_IDS = 256;
export const MAX_PENDING_STEPS_DRAIN = 96;
export const MAX_REACTION_CHAIN_DEPTH = 6;

/**
 * Danh sách vai trò phản ứng bí mật nhị phân đơn quyết định được phép dùng
 * `AUTO_ACTIVATE_WHEN_ELIGIBLE` (CAP-05). Các vai trò cần chọn mục tiêu/trang bị
 * (`Bianca`, `Gwendolen`, `Freyja`, `Elise`) KHÔNG bao giờ tự kích hoạt mù.
 */
export const BINARY_SECRET_REACTION_ROLES: ReadonlySet<string> = new Set([
  'exp1_wendigo',
  'exp1_undying',
  'exp1_cindy',
  'exp2_urban_legend',
  'exp2_usurper',
  'exp2_arlene',
]);

export function canRoleAutoActivateSecretReaction(roleId: string): boolean {
  return BINARY_SECRET_REACTION_ROLES.has(roleId);
}

export type ExpansionImplementedRoleId =
  | Phase2RoleId
  | Phase3RoleId
  | Phase4RoleId
  | Phase5BRoleId;

export interface ExpansionSkillExecutableBinding {
  readonly roleId: ExpansionImplementedRoleId;
  readonly handlerId: string;
  readonly trigger: SkillTrigger;
  readonly resolverSymbol: string;
}

export interface ExpansionVictoryExecutableBinding {
  readonly roleId: ExpansionImplementedRoleId;
  readonly evaluatorId: string;
  readonly archetype: VictoryArchetype;
}

export const PHASE2A_ROLE_IDS: readonly Phase2ARoleId[] = [
  'exp1_wendigo',
  'exp2_g43',
  'exp2_fiona',
  'exp2_wyvern',
];

export const PHASE2B_ROLE_IDS: readonly Phase2BRoleId[] = [
  'exp1_gayle',
  'exp1_felicia',
  'exp1_victor',
  'exp1_undying',
];

export const PHASE2_IMPLEMENTED_EXPANSION_ROLE_IDS: readonly Phase2RoleId[] = [
  ...PHASE2A_ROLE_IDS,
  ...PHASE2B_ROLE_IDS,
];

export const PHASE3A_ROLE_IDS: readonly Phase3RoleId[] = [
  'exp1_elysia',
  'exp2_unchained',
  'exp2_warlock',
  'exp2_witch',
  'exp2_father_harrison',
  'exp2_gloria',
  'exp1_cindy',
  'exp1_bipolar',
];

export const STARTER_SIXTEEN_EXPANSION_ROLE_IDS: readonly (Phase2RoleId | Phase3RoleId)[] = [
  ...PHASE2_IMPLEMENTED_EXPANSION_ROLE_IDS,
  ...PHASE3A_ROLE_IDS,
];

export const PHASE4B_ROLE_IDS: readonly Phase4RoleId[] = [
  'exp1_fallen',
  'exp1_fea',
  'exp2_eleanor',
  'exp2_fujiko',
  'exp1_udi',
  'exp1_wrath',
  'exp1_vengeance',
  'exp2_visions',
  'exp2_cruz',
  'exp2_bryon',
];

export const STARTER_TWENTY_SIX_EXPANSION_ROLE_IDS: readonly (
  | Phase2RoleId
  | Phase3RoleId
  | Phase4RoleId
)[] = [
  ...STARTER_SIXTEEN_EXPANSION_ROLE_IDS,
  ...PHASE4B_ROLE_IDS,
];

export const PHASE5B_ROLE_IDS: readonly Phase5BRoleId[] = [
  'exp2_elise',
  'exp2_umibozu',
  'exp2_urban_legend',
  'exp2_arlene',
];

export const PHASE2_SKILL_BINDINGS: Readonly<
  Partial<Record<string, ExpansionSkillExecutableBinding>>
> = {
  exp1_wendigo: {
    roleId: 'exp1_wendigo',
    handlerId: 'exp:exp1_wendigo:cannibal-feast',
    trigger: 'ON_ELIMINATION',
    resolverSymbol: 'expansion-skills.ts:wendigoHandler',
  },
  exp2_g43: {
    roleId: 'exp2_g43',
    handlerId: 'exp:exp2_g43:fortress-mode',
    trigger: 'BEFORE_DAMAGE',
    resolverSymbol: 'expansion-skills.ts:g43Handler',
  },
  exp2_fiona: {
    roleId: 'exp2_fiona',
    handlerId: 'exp:exp2_fiona:surgical-strike',
    trigger: 'BEFORE_ATTACK',
    resolverSymbol: 'expansion-skills.ts:fionaHandler',
  },
  exp2_wyvern: {
    roleId: 'exp2_wyvern',
    handlerId: 'exp:exp2_wyvern:absorption',
    trigger: 'ON_ELIMINATION',
    resolverSymbol: 'expansion-skills.ts:wyvernHandler',
  },
  exp1_gayle: {
    roleId: 'exp1_gayle',
    handlerId: 'exp:exp1_gayle:trainee-fighter',
    trigger: 'BEFORE_ATTACK',
    resolverSymbol: 'expansion-skills.ts:gayleHandler',
  },
  exp1_felicia: {
    roleId: 'exp1_felicia',
    handlerId: 'exp:exp1_felicia:resourceful',
    trigger: 'ON_DRAW_CARD',
    resolverSymbol: 'expansion-skills.ts:feliciaHandler',
  },
  exp1_victor: {
    roleId: 'exp1_victor',
    handlerId: 'exp:exp1_victor:mad-scientist',
    trigger: 'BEFORE_DAMAGE',
    resolverSymbol: 'expansion-skills.ts:victorHandler',
  },
  exp1_undying: {
    roleId: 'exp1_undying',
    handlerId: 'exp:exp1_undying:iron-plating',
    trigger: 'BEFORE_DAMAGE',
    resolverSymbol: 'expansion-skills.ts:undyingHandler',
  },
};

export const PHASE2_VICTORY_BINDINGS: Readonly<
  Partial<Record<string, ExpansionVictoryExecutableBinding>>
> = {
  exp1_wendigo: {
    roleId: 'exp1_wendigo',
    evaluatorId: 'victory-engine.ts:faction#shadows',
    archetype: 'faction',
  },
  exp2_g43: {
    roleId: 'exp2_g43',
    evaluatorId: 'victory-engine.ts:faction#hunters',
    archetype: 'faction',
  },
  exp2_fiona: {
    roleId: 'exp2_fiona',
    evaluatorId: 'victory-engine.ts:faction#hunters',
    archetype: 'faction',
  },
  exp2_wyvern: {
    roleId: 'exp2_wyvern',
    evaluatorId: 'victory-engine.ts:faction#shadows',
    archetype: 'faction',
  },
  exp1_gayle: {
    roleId: 'exp1_gayle',
    evaluatorId: 'victory-engine.ts:faction#hunters',
    archetype: 'faction',
  },
  exp1_felicia: {
    roleId: 'exp1_felicia',
    evaluatorId: 'victory-engine.ts:faction#hunters',
    archetype: 'faction',
  },
  exp1_victor: {
    roleId: 'exp1_victor',
    evaluatorId: 'victory-engine.ts:faction#shadows',
    archetype: 'faction',
  },
  exp1_undying: {
    roleId: 'exp1_undying',
    evaluatorId: 'victory-engine.ts:faction#shadows',
    archetype: 'faction',
  },
};

export const PHASE3_SKILL_BINDINGS: Readonly<
  Partial<Record<string, ExpansionSkillExecutableBinding>>
> = {
  exp1_elysia: {
    roleId: 'exp1_elysia',
    handlerId: 'exp:exp1_elysia:counterattack',
    trigger: 'BEFORE_DAMAGE',
    resolverSymbol: 'expansion-skills.ts:elysiaCounterattackHandler',
  },
  exp2_unchained: {
    roleId: 'exp2_unchained',
    handlerId: 'exp:exp2_unchained:endless-violence',
    trigger: 'BEFORE_DAMAGE',
    resolverSymbol: 'expansion-skills.ts:unchainedEndlessViolenceHandler',
  },
  exp2_warlock: {
    roleId: 'exp2_warlock',
    handlerId: 'exp:exp2_warlock:power-source',
    trigger: 'BEFORE_DAMAGE',
    resolverSymbol: 'expansion-skills.ts:warlockPowerSourceHandler',
  },
  exp2_witch: {
    roleId: 'exp2_witch',
    handlerId: 'exp:exp2_witch:no-place-like-home',
    trigger: 'BEFORE_DAMAGE',
    resolverSymbol: 'expansion-skills.ts:witchNoPlaceLikeHomeHandler',
  },
  exp2_father_harrison: {
    roleId: 'exp2_father_harrison',
    handlerId: 'exp:exp2_father_harrison:sunday-service',
    trigger: 'ON_MOVE',
    resolverSymbol: 'expansion-skills.ts:fatherHarrisonSundayServiceHandler',
  },
  exp2_gloria: {
    roleId: 'exp2_gloria',
    handlerId: 'exp:exp2_gloria:mighty-blessing',
    trigger: 'ON_DRAW_CARD',
    resolverSymbol: 'expansion-skills.ts:gloriaMightyBlessingHandler',
  },
  exp1_cindy: {
    roleId: 'exp1_cindy',
    handlerId: 'exp:exp1_cindy:nightmare',
    trigger: 'AFTER_DAMAGE',
    resolverSymbol: 'expansion-skills.ts:cindyNightmareHandler',
  },
  exp1_bipolar: {
    roleId: 'exp1_bipolar',
    handlerId: 'exp:exp1_bipolar:fate-coin',
    trigger: 'ON_TURN_START',
    resolverSymbol: 'expansion-skills.ts:bipolarFateCoinHandler',
  },
};

export const PHASE3_VICTORY_BINDINGS: Readonly<
  Partial<Record<string, ExpansionVictoryExecutableBinding>>
> = {
  exp1_elysia: {
    roleId: 'exp1_elysia',
    evaluatorId: 'victory-engine.ts:faction#hunters',
    archetype: 'faction',
  },
  exp2_unchained: {
    roleId: 'exp2_unchained',
    evaluatorId: 'victory-engine.ts:faction#shadows',
    archetype: 'faction',
  },
  exp2_warlock: {
    roleId: 'exp2_warlock',
    evaluatorId: 'victory-engine.ts:faction#shadows',
    archetype: 'faction',
  },
  exp2_witch: {
    roleId: 'exp2_witch',
    evaluatorId: 'victory-engine.ts:faction#shadows',
    archetype: 'faction',
  },
  exp2_father_harrison: {
    roleId: 'exp2_father_harrison',
    evaluatorId: 'victory-engine.ts:faction#hunters',
    archetype: 'faction',
  },
  exp2_gloria: {
    roleId: 'exp2_gloria',
    evaluatorId: 'victory-engine.ts:faction#hunters',
    archetype: 'faction',
  },
  exp1_cindy: {
    roleId: 'exp1_cindy',
    evaluatorId: 'victory-engine.ts:neutral#cindy',
    archetype: 'individual',
  },
  exp1_bipolar: {
    roleId: 'exp1_bipolar',
    evaluatorId: 'victory-engine.ts:conditional#bipolar',
    archetype: 'conditional',
  },
};

export const PHASE4_SKILL_BINDINGS: Readonly<
  Partial<Record<string, ExpansionSkillExecutableBinding>>
> = {
  exp1_fallen: {
    roleId: 'exp1_fallen',
    handlerId: 'exp:exp1_fallen:resistance',
    trigger: 'BEFORE_DAMAGE',
    resolverSymbol: 'expansion-skills.ts:fallenResistanceHandler',
  },
  exp1_fea: {
    roleId: 'exp1_fea',
    handlerId: 'exp:exp1_fea:dice-adjust',
    trigger: 'ON_MOVE',
    resolverSymbol: 'expansion-skills.ts:feaMoveAdjustHandler',
  },
  exp2_eleanor: {
    roleId: 'exp2_eleanor',
    handlerId: 'exp:exp2_eleanor:interrogator',
    trigger: 'ACTIVE_SKILL',
    resolverSymbol: 'expansion-skills.ts:eleanorInterrogatorHandler',
  },
  exp2_fujiko: {
    roleId: 'exp2_fujiko',
    handlerId: 'exp:exp2_fujiko:its-over',
    trigger: 'AFTER_ATTACK',
    resolverSymbol: 'expansion-skills.ts:fujikoItsOverHandler',
  },
  exp1_udi: {
    roleId: 'exp1_udi',
    handlerId: 'exp:exp1_udi:hiding',
    trigger: 'BEFORE_ATTACK',
    resolverSymbol: 'expansion-skills.ts:udiHidingHandler',
  },
  exp1_wrath: {
    roleId: 'exp1_wrath',
    handlerId: 'exp:exp1_wrath:cluster-aoe',
    trigger: 'ON_TURN_START',
    resolverSymbol: 'expansion-skills.ts:wrathTurnStartAoeHandler',
  },
  exp1_vengeance: {
    roleId: 'exp1_vengeance',
    handlerId: 'exp:exp1_vengeance:chain-strike',
    trigger: 'ON_ELIMINATION',
    resolverSymbol: 'expansion-skills.ts:vengeanceChainStrikeHandler',
  },
  exp2_visions: {
    roleId: 'exp2_visions',
    handlerId: 'exp:exp2_visions:curse-mark',
    trigger: 'ON_TURN_START',
    resolverSymbol: 'expansion-skills.ts:visionsCurseHandler',
  },
  exp2_cruz: {
    roleId: 'exp2_cruz',
    handlerId: 'exp:exp2_cruz:black-redraw',
    trigger: 'ON_DRAW_CARD',
    resolverSymbol: 'expansion-skills.ts:cruzBlackRedrawHandler',
  },
  exp2_bryon: {
    roleId: 'exp2_bryon',
    handlerId: 'exp:exp2_bryon:generous-service',
    trigger: 'BEFORE_ATTACK',
    resolverSymbol: 'expansion-skills.ts:bryonGenerousServiceHandler',
  },
};

export const PHASE4_VICTORY_BINDINGS: Readonly<
  Partial<Record<string, ExpansionVictoryExecutableBinding>>
> = {
  exp1_fallen: {
    roleId: 'exp1_fallen',
    evaluatorId: 'victory-engine.ts:faction#hunters',
    archetype: 'faction',
  },
  exp1_fea: {
    roleId: 'exp1_fea',
    evaluatorId: 'victory-engine.ts:faction#hunters',
    archetype: 'faction',
  },
  exp2_eleanor: {
    roleId: 'exp2_eleanor',
    evaluatorId: 'victory-engine.ts:faction#hunters',
    archetype: 'faction',
  },
  exp2_fujiko: {
    roleId: 'exp2_fujiko',
    evaluatorId: 'victory-engine.ts:faction#hunters',
    archetype: 'faction',
  },
  exp1_udi: {
    roleId: 'exp1_udi',
    evaluatorId: 'victory-engine.ts:faction#shadows',
    archetype: 'faction',
  },
  exp1_wrath: {
    roleId: 'exp1_wrath',
    evaluatorId: 'victory-engine.ts:faction#shadows',
    archetype: 'faction',
  },
  exp1_vengeance: {
    roleId: 'exp1_vengeance',
    evaluatorId: 'victory-engine.ts:faction#shadows',
    archetype: 'faction',
  },
  exp2_visions: {
    roleId: 'exp2_visions',
    evaluatorId: 'victory-engine.ts:faction#shadows',
    archetype: 'faction',
  },
  exp2_cruz: {
    roleId: 'exp2_cruz',
    evaluatorId: 'victory-engine.ts:neutral#cruz',
    archetype: 'individual',
  },
  exp2_bryon: {
    roleId: 'exp2_bryon',
    evaluatorId: 'victory-engine.ts:shared#bryon',
    archetype: 'shared',
  },
};

export const PHASE5B_SKILL_BINDINGS: Readonly<
  Partial<Record<string, ExpansionSkillExecutableBinding>>
> = {
  exp2_elise: {
    roleId: 'exp2_elise',
    handlerId: 'exp:exp2_elise:soft-harmony',
    trigger: 'ACTIVE_SKILL',
    resolverSymbol: 'expansion-skills.ts:eliseSoftHarmonyHandler',
  },
  exp2_umibozu: {
    roleId: 'exp2_umibozu',
    handlerId: 'exp:exp2_umibozu:reveal-surge',
    trigger: 'ON_ROLE_REVEAL',
    resolverSymbol: 'expansion-skills.ts:umibozuRevealAoeHandler',
  },
  exp2_urban_legend: {
    roleId: 'exp2_urban_legend',
    handlerId: 'exp:exp2_urban_legend:horror-story',
    trigger: 'BEFORE_DAMAGE',
    resolverSymbol: 'expansion-skills.ts:urbanLegendHorrorHandler',
  },
  exp2_arlene: {
    roleId: 'exp2_arlene',
    handlerId: 'exp:exp2_arlene:affectation',
    trigger: 'ON_INVESTIGATE',
    resolverSymbol: 'expansion-skills.ts:arleneAffectationHandler',
  },
};

export const PHASE5B_VICTORY_BINDINGS: Readonly<
  Partial<Record<string, ExpansionVictoryExecutableBinding>>
> = {
  exp2_elise: {
    roleId: 'exp2_elise',
    evaluatorId: 'victory-engine.ts:faction#hunters',
    archetype: 'faction',
  },
  exp2_umibozu: {
    roleId: 'exp2_umibozu',
    evaluatorId: 'victory-engine.ts:faction#shadows',
    archetype: 'faction',
  },
  exp2_urban_legend: {
    roleId: 'exp2_urban_legend',
    evaluatorId: 'victory-engine.ts:faction#shadows',
    archetype: 'faction',
  },
  exp2_arlene: {
    roleId: 'exp2_arlene',
    evaluatorId: 'victory-engine.ts:neutral#arlene',
    archetype: 'individual',
  },
};

export const ALL_EXPANSION_SKILL_BINDINGS: Readonly<
  Partial<Record<string, ExpansionSkillExecutableBinding>>
> = {
  ...PHASE2_SKILL_BINDINGS,
  ...PHASE3_SKILL_BINDINGS,
  ...PHASE4_SKILL_BINDINGS,
  ...PHASE5B_SKILL_BINDINGS,
};

export const ALL_EXPANSION_VICTORY_BINDINGS: Readonly<
  Partial<Record<string, ExpansionVictoryExecutableBinding>>
> = {
  ...PHASE2_VICTORY_BINDINGS,
  ...PHASE3_VICTORY_BINDINGS,
  ...PHASE4_VICTORY_BINDINGS,
  ...PHASE5B_VICTORY_BINDINGS,
};

export interface TurnContinuationCallbacks {
  finalizeIfFinished: (state: AuthoritativeGameState, nowMs: number) => boolean;
  advanceTurn: (state: AuthoritativeGameState, nowMs: number) => void;
  canTriggerCharlesBloodyFeast: (
    state: AuthoritativeGameState,
    actor: AuthoritativePlayerState,
  ) => boolean;
}

export function isExpandedRuleset(state: AuthoritativeGameState): boolean {
  return Boolean(state.rulesetId && state.rulesetId !== 'classic');
}

export function ensureExpansionState(state: AuthoritativeGameState): ExpansionRuntimeState {
  if (!state.expansionState) {
    state.expansionState = {
      eventSeq: 0,
      processedEventIds: [],
      resolvedChoiceIds: [],
      pendingSteps: [],
      stats: {
        activationsByRole: {},
        damagePreventedByRole: {},
        healByRole: {},
        bonusDamageByRole: {},
      },
    };
  }
  if (!state.expansionState.stats) {
    state.expansionState.stats = {
      activationsByRole: {},
      damagePreventedByRole: {},
      healByRole: {},
      bonusDamageByRole: {},
    };
  }
  if (!Array.isArray(state.expansionState.processedEventIds)) {
    state.expansionState.processedEventIds = [];
  }
  if (!Array.isArray(state.expansionState.resolvedChoiceIds)) {
    state.expansionState.resolvedChoiceIds = [];
  }
  if (!Array.isArray(state.expansionState.pendingSteps)) {
    state.expansionState.pendingSteps = [];
  }
  return state.expansionState;
}

function nextExpansionEventId(state: AuthoritativeGameState, prefix: string): string {
  const exp = ensureExpansionState(state);
  exp.eventSeq += 1;
  return `${prefix}-${state.turnNumber}-${exp.eventSeq}`;
}

function hasProcessedExpansionEvent(state: AuthoritativeGameState, eventId: string): boolean {
  const exp = ensureExpansionState(state);
  return exp.processedEventIds.includes(eventId);
}

function markExpansionEventProcessed(state: AuthoritativeGameState, eventId: string): void {
  const exp = ensureExpansionState(state);
  if (exp.processedEventIds.includes(eventId)) return;
  exp.processedEventIds.push(eventId);
  if (exp.processedEventIds.length > MAX_PROCESSED_EVENT_IDS) {
    exp.processedEventIds.splice(0, exp.processedEventIds.length - MAX_PROCESSED_EVENT_IDS);
  }
}

function markChoiceResolved(state: AuthoritativeGameState, choiceId: string): void {
  const exp = ensureExpansionState(state);
  if (exp.resolvedChoiceIds.includes(choiceId)) return;
  exp.resolvedChoiceIds.push(choiceId);
  if (exp.resolvedChoiceIds.length > MAX_RESOLVED_CHOICE_IDS) {
    exp.resolvedChoiceIds.splice(0, exp.resolvedChoiceIds.length - MAX_RESOLVED_CHOICE_IDS);
  }
}

function incRoleStat(bucket: Record<string, number>, roleId: string, delta: number): void {
  if (delta <= 0) return;
  bucket[roleId] = (bucket[roleId] ?? 0) + delta;
}

function incRoleHealBlockedStat(
  state: AuthoritativeGameState,
  blockerRoleId: string,
  delta: number,
): void {
  if (delta <= 0) return;
  const exp = ensureExpansionState(state);
  if (!exp.stats.healsBlockedByRole) exp.stats.healsBlockedByRole = {};
  exp.stats.healsBlockedByRole[blockerRoleId] =
    (exp.stats.healsBlockedByRole[blockerRoleId] ?? 0) + delta;
}

export function getPlayerReactionPolicy(
  state: AuthoritativeGameState,
  playerId: string,
): BoardGameReactionPolicy {
  const raw = state.expansionState?.reactionPolicyByPlayer?.[playerId];
  return isValidBoardGameReactionPolicy(raw) ? raw : 'ASK';
}

export function setPlayerReactionPolicy(
  state: AuthoritativeGameState,
  playerId: string,
  policy: BoardGameReactionPolicy,
): EngineActionResult {
  if (!isExpandedRuleset(state)) {
    return {
      ok: false,
      error: 'Chính sách phản ứng mở rộng chỉ khả dụng ngoài chế độ Classic.',
    };
  }
  const actor = state.players[playerId];
  if (!actor || !actor.alive) {
    return { ok: false, error: 'Người chơi không hợp lệ hoặc đã bị loại.' };
  }
  if (!isValidBoardGameReactionPolicy(policy)) {
    return { ok: false, error: 'Chính sách phản ứng không hợp lệ.' };
  }
  const exp = ensureExpansionState(state);
  if (!exp.reactionPolicyByPlayer) exp.reactionPolicyByPlayer = {};
  exp.reactionPolicyByPlayer[playerId] = policy;
  return { ok: true };
}

function createExpandedHealHooks(): HealPipelineHooks {
  return {
    hasProcessedEvent: hasProcessedExpansionEvent,
    markEventProcessed: markExpansionEventProcessed,
    getReactionPolicy: getPlayerReactionPolicy,
    onRecordHealStat(state, roleId, actualHealed) {
      const exp = ensureExpansionState(state);
      incRoleStat(exp.stats.healByRole, roleId, actualHealed);
    },
    onRecordHealBlockedStat: incRoleHealBlockedStat,
  };
}

function enqueueRoleRevealedTrigger(
  state: AuthoritativeGameState,
  revealedPlayerId: string,
  revealCause: 'voluntary' | 'forced-card' | 'reaction',
  chainDepth = 0,
): void {
  if (chainDepth >= MAX_REACTION_CHAIN_DEPTH) return;
  const exp = ensureExpansionState(state);
  exp.pendingSteps.unshift({
    kind: 'ROLE_REVEALED_TRIGGERS',
    revealEventId: nextExpansionEventId(state, 'rev-trig'),
    revealedPlayerId,
    revealCause,
    umibozuChecked: false,
    chainDepth: chainDepth + 1,
  });
}

function getChoiceTimeoutMs(
  state: AuthoritativeGameState,
  owner: AuthoritativePlayerState,
): number {
  const exp = ensureExpansionState(state);
  const configured =
    typeof exp.choiceTimeoutMs === 'number' && exp.choiceTimeoutMs >= 300
      ? exp.choiceTimeoutMs
      : BOARD_GAME_CHOICE_TIMEOUT_MS;
  if (!owner.connected) {
    return Math.min(configured, BOARD_GAME_DISCONNECTED_CHOICE_TIMEOUT_MS);
  }
  return configured;
}

/**
 * Shared HP Cost Pipeline (Common Rule B):
 * Chi phí trả HP (Charles -2 HP, Victor -1 HP) KHÁC với sát thương thông thường —
 * KHÔNG thể bị giảm bởi trang bị, khiên, G43 hay Undying.
 */
export function applyHpCost(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  cost: number,
  reasonLabel: string,
  nowMs: number,
): boolean {
  if (!actor.alive || cost <= 0 || actor.hp <= cost) {
    return false;
  }
  actor.woundsTaken += cost;
  actor.hp = Math.max(0, actor.maxHp - actor.woundsTaken);
  appendPublicLog(
    state,
    'skill',
    `🩸 ${actor.displayName} trả ${cost} HP (${reasonLabel}).`,
    nowMs,
    actor.playerId,
  );
  return true;
}

export function computeRawAttackDamage(
  actor: AuthoritativePlayerState,
  baseDmg: number,
): number {
  let rawDmg = baseDmg;
  if (baseDmg > 0) {
    if (actor.equipped.includes('eq-04') && actor.revealed && actor.faction === 'lantern-guard') {
      rawDmg += 2;
    }
    if (actor.equipped.includes('ev-02')) rawDmg += 1;
    if (actor.equipped.includes('ev-03')) rawDmg += 1;
    if (actor.equipped.includes('ev-04')) rawDmg += 1;
    if (actor.equipped.includes('eq-01')) rawDmg = Math.max(0, rawDmg - 1);
  }
  return rawDmg;
}

function formatAttackRollDesc(roll: AttackRollSample): string {
  return roll.hasMasamune
    ? `1d4=${roll.d4}`
    : `|${roll.d6}-${roll.d4}|=${roll.baseDmg}`;
}

// ---------------------------------------------------------------------------
// Phase 2A Executable Skill Handlers registered on SkillEngine
// ---------------------------------------------------------------------------

const g43FortressHandler: SkillHandlerDefinition = {
  id: 'exp:exp2_g43:fortress-mode',
  roleId: 'exp2_g43',
  trigger: 'BEFORE_DAMAGE',
  priority: 20,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload) return false;
    if (ctx.event.targetPlayerId !== ctx.owner.playerId) return false;
    if (payload.sourceType !== 'attack') return false;
    if (payload.isHpCost || payload.unpreventable) return false;
    const dmg = typeof payload.damageAmount === 'number' ? payload.damageAmount : 0;
    return dmg > 0;
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    const prevDmg = typeof payload.damageAmount === 'number' ? payload.damageAmount : 0;
    const nextDmg = Math.max(0, prevDmg - 2);
    const prevented = prevDmg - nextDmg;
    payload.damageAmount = nextDmg;
    payload.g43Prevented = prevented;

    const exp = ensureExpansionState(ctx.state);
    incRoleStat(exp.stats.activationsByRole, 'exp2_g43', 1);
    incRoleStat(exp.stats.damagePreventedByRole, 'exp2_g43', prevented);

    appendPublicLog(
      ctx.state,
      'skill',
      `🛡️ G43 (${ctx.owner.displayName}) — Chế Độ Pháo Đài: giảm ${prevented} sát thương đòn đánh (${prevDmg} → ${nextDmg})!`,
      ctx.event.nowMs,
      ctx.owner.playerId,
    );
    return { applied: true, note: `prevented=${prevented}` };
  },
};

const fionaSurgicalStrikeHandler: SkillHandlerDefinition = {
  id: 'exp:exp2_fiona:surgical-strike',
  roleId: 'exp2_fiona',
  trigger: 'BEFORE_ATTACK',
  priority: 10,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    return (
      ctx.event.actorPlayerId === ctx.owner.playerId &&
      ctx.event.payload?.phase === 'roll_attack'
    );
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    const hasMasamune = Boolean(payload.hasMasamune);

    const rollOnce = (): AttackRollSample => {
      const d6 = hasMasamune ? 0 : ctx.rng.nextInt(1, 6);
      const d4 = ctx.rng.nextInt(1, 4);
      const baseDmg = hasMasamune ? d4 : Math.abs(d6 - d4);
      const rawDmg = computeRawAttackDamage(ctx.owner, baseDmg);
      return { d6, d4, baseDmg, rawDmg, hasMasamune };
    };

    const r0 = rollOnce();
    const r1 = rollOnce();
    payload.fionaRolls = [r0, r1];

    const exp = ensureExpansionState(ctx.state);
    incRoleStat(exp.stats.activationsByRole, 'exp2_fiona', 1);

    return { applied: true, note: `rolls=${r0.baseDmg},${r1.baseDmg}` };
  },
};

const wyvernAbsorptionHandler: SkillHandlerDefinition = {
  id: 'exp:exp2_wyvern:absorption',
  roleId: 'exp2_wyvern',
  trigger: 'ON_ELIMINATION',
  priority: 10,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload) return false;
    if (payload.wyvernAlreadyResolved) return false;
    if (payload.sourceType !== 'attack') return false;
    if (payload.killerPlayerId !== ctx.owner.playerId) return false;
    if (payload.victimPlayerId === ctx.owner.playerId) return false;
    return ctx.owner.alive && ctx.owner.revealed;
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    const victimFaction = payload.victimFactionAtDeath as BoardGameFactionId;
    const isShadowVictim = victimFaction === 'mist-order';
    const healAmount = isShadowVictim ? ctx.owner.woundsTaken : 5;
    const healEventId = `heal-wyvern-${String(payload.eliminationEventId ?? ctx.state.turnNumber)}-${ctx.owner.playerId}`;

    const exp = ensureExpansionState(ctx.state);
    const healRes = executeHealPipeline(
      ctx.state,
      {
        healEventId,
        actorPlayerId: ctx.owner.playerId,
        targetPlayerId: ctx.owner.playerId,
        rawAmount: healAmount,
        sourceKind: 'skill',
        sourceLabel: 'Hấp Thụ (Wyvern)',
        roleStatId: 'exp2_wyvern',
        postLogKind: 'skill',
        postLogPrefix: isShadowVictim
          ? `🐉 Wyvern (${ctx.owner.displayName}) — Hấp Thụ: hạ gục Shadow, hồi đầy máu (+`
          : `🐉 Wyvern (${ctx.owner.displayName}) — Hấp Thụ: hồi `,
        postLogSuffix: ' HP)!',
        postLogActorId: ctx.owner.playerId,
      },
      ctx.event.nowMs,
      createExpandedHealHooks(),
    );
    if (healRes.pendingChoiceOpened) {
      payload.pausedForHealChoice = true;
      return { applied: false, stopPropagation: true, note: 'pending-heal-interception' };
    }

    payload.wyvernAlreadyResolved = true;
    incRoleStat(exp.stats.activationsByRole, 'exp2_wyvern', 1);
    return { applied: true, note: `healed=${healRes.actual}` };
  },
};

const wendigoCannibalFeastHandler: SkillHandlerDefinition = {
  id: 'exp:exp1_wendigo:cannibal-feast',
  roleId: 'exp1_wendigo',
  trigger: 'ON_ELIMINATION',
  priority: 20,
  requiresRevealed: false,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload) return false;
    if (payload.victimPlayerId === ctx.owner.playerId) return false;
    const checked = Array.isArray(payload.wendigoCheckedIds)
      ? (payload.wendigoCheckedIds as string[])
      : [];
    if (checked.includes(ctx.owner.playerId)) return false;
    return ctx.owner.alive;
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    const checked = Array.isArray(payload.wendigoCheckedIds)
      ? (payload.wendigoCheckedIds as string[])
      : [];

    if (ctx.owner.revealed) {
      const healEventId = `heal-wendigo-${String(payload.eliminationEventId ?? ctx.state.turnNumber)}-${ctx.owner.playerId}`;
      const healRes = executeHealPipeline(
        ctx.state,
        {
          healEventId,
          actorPlayerId: ctx.owner.playerId,
          targetPlayerId: ctx.owner.playerId,
          rawAmount: 1,
          sourceKind: 'skill',
          sourceLabel: 'Tiệc Thịt (Wendigo)',
          roleStatId: 'exp1_wendigo',
          postLogKind: 'skill',
          postLogPrefix: `🩸 Wendigo (${ctx.owner.displayName}) — Tiệc Thịt: hồi `,
          postLogSuffix: ' HP!',
          postLogActorId: ctx.owner.playerId,
          zeroLogText: `🩸 Wendigo (${ctx.owner.displayName}) — Tiệc Thịt: đã đầy máu (${ctx.owner.hp}/${ctx.owner.maxHp}).`,
        },
        ctx.event.nowMs,
        createExpandedHealHooks(),
      );
      if (healRes.pendingChoiceOpened) {
        payload.pausedForHealChoice = true;
        return { applied: false, stopPropagation: true, note: 'pending-heal-interception' };
      }

      checked.push(ctx.owner.playerId);
      payload.wendigoCheckedIds = checked;
      const exp = ensureExpansionState(ctx.state);
      incRoleStat(exp.stats.activationsByRole, 'exp1_wendigo', 1);
      return { applied: true, note: `revealed-heal=${healRes.actual}` };
    }

    checked.push(ctx.owner.playerId);
    payload.wendigoCheckedIds = checked;

    // Wendigo chưa lộ vai: KHÔNG tự động lật vai -> kiểm tra CAP-05 reactionPolicy ở bước executeEliminationTriggersStep!
    payload.pendingWendigoChoice = {
      wendigoPlayerId: ctx.owner.playerId,
      eliminationEventId: String(payload.eliminationEventId ?? ''),
      victimPlayerId: String(payload.victimPlayerId ?? ''),
    };
    return { applied: false, stopPropagation: true, note: 'pending-secret-reveal-choice' };
  },
};

// ---------------------------------------------------------------------------
// Phase 2B Executable Skill Handlers (HUSTVerse Experimental House Rules)
// ---------------------------------------------------------------------------

const gayleTraineeFighterHandler: SkillHandlerDefinition = {
  id: 'exp:exp1_gayle:trainee-fighter',
  roleId: 'exp1_gayle',
  trigger: 'BEFORE_ATTACK',
  priority: 15,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    return (
      ctx.event.actorPlayerId === ctx.owner.playerId &&
      ctx.event.payload?.phase === 'roll_attack' &&
      !ctx.event.payload?.gayleAlreadyRerolled
    );
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    const hasMasamune = Boolean(payload.hasMasamune);
    const d6 = hasMasamune ? 0 : ctx.rng.nextInt(1, 6);
    const d4 = ctx.rng.nextInt(1, 4);
    const baseDmg = hasMasamune ? d4 : Math.abs(d6 - d4);
    const rawDmg = computeRawAttackDamage(ctx.owner, baseDmg);
    payload.gayleFirstRoll = { d6, d4, baseDmg, rawDmg, hasMasamune } satisfies AttackRollSample;
    return { applied: true, note: `firstRoll=${baseDmg}` };
  },
};

const feliciaResourcefulHandler: SkillHandlerDefinition = {
  id: 'exp:exp1_felicia:resourceful',
  roleId: 'exp1_felicia',
  trigger: 'ON_DRAW_CARD',
  priority: 10,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload) return false;
    if (ctx.event.actorPlayerId !== ctx.owner.playerId) return false;
    if (payload.isLocationDraw !== true || payload.isRecursiveDraw === true) return false;
    // HUSTVerse experimental house rule: chỉ áp dụng White ('equipment') & Black ('event'), KHÔNG áp dụng Green ('investigation')
    return payload.deckId === 'equipment' || payload.deckId === 'event';
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    payload.feliciaDoubleDraw = true;
    return { applied: true, note: `deck=${String(payload.deckId ?? '')}` };
  },
};

const victorMadScientistHandler: SkillHandlerDefinition = {
  id: 'exp:exp1_victor:mad-scientist',
  roleId: 'exp1_victor',
  trigger: 'BEFORE_DAMAGE',
  priority: 5,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload) return false;
    if (ctx.event.actorPlayerId !== ctx.owner.playerId) return false;
    if (payload.phase !== 'attack_boost_check') return false;
    if (payload.victorAlreadyChecked) return false;
    const baseDmg = typeof payload.baseDmg === 'number' ? payload.baseDmg : 0;
    return baseDmg > 0 && ctx.owner.hp >= 2;
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    payload.victorCanBoost = true;
    return { applied: true, note: 'victor-boost-eligible' };
  },
};

const UNDYING_ELIGIBLE_DAMAGE_SOURCES = new Set<string>([
  'attack',
  'skill',
  'card',
  'event',
  'investigation',
]);

const undyingIronPlatingHandler: SkillHandlerDefinition = {
  id: 'exp:exp1_undying:iron-plating',
  roleId: 'exp1_undying',
  trigger: 'BEFORE_DAMAGE',
  priority: 30, // Chạy SAU Witch (15), Holy Robe & G43 (20), TRƯỚC khi trừ HP!
  requiresRevealed: false,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload) return false;
    if (ctx.event.targetPlayerId !== ctx.owner.playerId) return false;
    if (payload.phase === 'attack_boost_check' || payload.phase === 'outgoing_attack_modifiers') {
      return false;
    }
    if (
      payload.isHpCost ||
      payload.unpreventable ||
      payload.isRetaliation ||
      payload.undyingAlreadyChecked
    ) {
      return false;
    }
    const sourceType = String(payload.sourceType ?? '');
    if (!UNDYING_ELIGIBLE_DAMAGE_SOURCES.has(sourceType)) return false;
    const dmg = typeof payload.damageAmount === 'number' ? payload.damageAmount : 0;
    return dmg >= 2;
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    const prevDmg = typeof payload.damageAmount === 'number' ? payload.damageAmount : 0;
    payload.undyingAlreadyChecked = true;

    if (ctx.owner.revealed) {
      const nextDmg = Math.max(0, prevDmg - 1);
      const prevented = prevDmg - nextDmg;
      payload.damageAmount = nextDmg;
      payload.undyingPrevented = prevented;

      const exp = ensureExpansionState(ctx.state);
      incRoleStat(exp.stats.activationsByRole, 'exp1_undying', 1);
      incRoleStat(exp.stats.damagePreventedByRole, 'exp1_undying', prevented);

      appendPublicLog(
        ctx.state,
        'skill',
        `🛡️ Undying (${ctx.owner.displayName}) — Mạ Sắt: giảm ${prevented} sát thương (${prevDmg} → ${nextDmg})!`,
        ctx.event.nowMs,
        ctx.owner.playerId,
      );
      return { applied: true, note: `revealed-reduce=${prevented}` };
    }

    // Undying chưa lộ vai: KHÔNG tự động lật vai -> mở Pending Choice bí mật (isSecret: true)!
    payload.pendingUndyingChoice = {
      undyingPlayerId: ctx.owner.playerId,
      damageEventId: String(payload.damageEventId ?? ''),
      preUndyingDmg: prevDmg,
      sourceType: String(payload.sourceType ?? 'attack') as DamageSourceKind,
    };
    return { applied: false, stopPropagation: true, note: 'pending-secret-reveal-reduce' };
  },
};

// ---------------------------------------------------------------------------
// Phase 3A Executable Skill Handlers (Wave 2 — Experimental House Rules)
// ---------------------------------------------------------------------------

const unchainedEndlessViolenceHandler: SkillHandlerDefinition = {
  id: 'exp:exp2_unchained:endless-violence',
  roleId: 'exp2_unchained',
  trigger: 'BEFORE_DAMAGE',
  priority: 3,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload) return false;
    if (ctx.event.actorPlayerId !== ctx.owner.playerId) return false;
    if (payload.phase !== 'outgoing_attack_modifiers') return false;
    if (payload.unchainedApplied) return false;
    const baseDmg = typeof payload.baseDmg === 'number' ? payload.baseDmg : 0;
    // House rule: chỉ cộng +2 khi tấn công TRÚNG (không biến miss thành hit)
    return baseDmg > 0;
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    const prevRaw = typeof payload.rawDmg === 'number' ? payload.rawDmg : 0;
    const targetCount = Math.max(1, typeof payload.targetCount === 'number' ? payload.targetCount : 1);
    payload.rawDmg = prevRaw + 2;
    payload.unchainedBonus = 2;
    payload.unchainedApplied = true;

    const exp = ensureExpansionState(ctx.state);
    incRoleStat(exp.stats.activationsByRole, 'exp2_unchained', 1);
    incRoleStat(exp.stats.bonusDamageByRole, 'exp2_unchained', 2 * targetCount);
    return { applied: true, note: 'bonus=+2' };
  },
};

const warlockPowerSourceHandler: SkillHandlerDefinition = {
  id: 'exp:exp2_warlock:power-source',
  roleId: 'exp2_warlock',
  trigger: 'BEFORE_DAMAGE',
  priority: 4,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload) return false;
    if (ctx.event.actorPlayerId !== ctx.owner.playerId) return false;
    if (payload.phase !== 'outgoing_attack_modifiers') return false;
    if (payload.warlockApplied) return false;
    const baseDmg = typeof payload.baseDmg === 'number' ? payload.baseDmg : 0;
    // House rule: phải đứng chính xác tại Erstwhile Altar -> `court` (KHÔNG tính cả cụm)
    return baseDmg > 0 && isPlayerAtExactLocationAlias(ctx.owner, 'erstwhile_altar');
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    const prevRaw = typeof payload.rawDmg === 'number' ? payload.rawDmg : 0;
    const targetCount = Math.max(1, typeof payload.targetCount === 'number' ? payload.targetCount : 1);
    payload.rawDmg = prevRaw + 3;
    payload.warlockBonus = 3;
    payload.warlockApplied = true;

    const exp = ensureExpansionState(ctx.state);
    incRoleStat(exp.stats.activationsByRole, 'exp2_warlock', 1);
    incRoleStat(exp.stats.bonusDamageByRole, 'exp2_warlock', 3 * targetCount);
    return { applied: true, note: 'court-bonus=+3' };
  },
};

const elysiaCounterattackHandler: SkillHandlerDefinition = {
  id: 'exp:exp1_elysia:counterattack',
  roleId: 'exp1_elysia',
  trigger: 'BEFORE_DAMAGE',
  priority: 5,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload) return false;
    if (ctx.event.actorPlayerId !== ctx.owner.playerId) return false;
    if (payload.phase !== 'attack_boost_check') return false;
    if (payload.elysiaAlreadyChecked) return false;
    const baseDmg = typeof payload.baseDmg === 'number' ? payload.baseDmg : 0;
    const offensiveDmg = typeof payload.offensiveDmg === 'number' ? payload.offensiveDmg : 0;
    // House rule: đánh trúng + sát thương sau trang bị công (trước giáp thủ) là 1 hoặc 2
    return baseDmg > 0 && offensiveDmg >= 1 && offensiveDmg <= 2;
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    payload.elysiaCanBoost = true;
    return { applied: true, note: 'elysia-boost-eligible' };
  },
};

const witchNoPlaceLikeHomeHandler: SkillHandlerDefinition = {
  id: 'exp:exp2_witch:no-place-like-home',
  roleId: 'exp2_witch',
  trigger: 'BEFORE_DAMAGE',
  priority: 15,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload) return false;
    if (ctx.event.targetPlayerId !== ctx.owner.playerId) return false;
    if (payload.phase === 'attack_boost_check' || payload.phase === 'outgoing_attack_modifiers') {
      return false;
    }
    if (payload.isHpCost || payload.unpreventable || payload.sourceType === 'hp-cost') {
      return false;
    }
    const dmg = typeof payload.damageAmount === 'number' ? payload.damageAmount : 0;
    return dmg > 0 && isPlayerAtExactLocationAlias(ctx.owner, 'weird_woods');
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    const prevDmg = typeof payload.damageAmount === 'number' ? payload.damageAmount : 0;
    payload.damageAmount = 0;
    payload.witchPrevented = prevDmg;

    const exp = ensureExpansionState(ctx.state);
    incRoleStat(exp.stats.activationsByRole, 'exp2_witch', 1);
    incRoleStat(exp.stats.damagePreventedByRole, 'exp2_witch', prevDmg);

    appendPublicLog(
      ctx.state,
      'skill',
      `🧙‍♀️ Witch (${ctx.owner.displayName}) — Không Nơi Đâu Bằng Nhà: đứng tại Hành Lang Tầng 4 (Weird Woods), miễn hoàn toàn ${prevDmg} sát thương!`,
      ctx.event.nowMs,
      ctx.owner.playerId,
    );
    return { applied: true, stopPropagation: true, note: `immune=${prevDmg}` };
  },
};

const fatherHarrisonSundayServiceHandler: SkillHandlerDefinition = {
  id: 'exp:exp2_father_harrison:sunday-service',
  roleId: 'exp2_father_harrison',
  trigger: 'ON_MOVE',
  priority: 10,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    if (ctx.event.actorPlayerId !== ctx.owner.playerId) return false;
    if (ctx.state.turnPhase !== 'ROLL_MOVE') return false;
    if (ctx.owner.consecutiveSameZoneRolls > 0) return false;
    return !isPlayerAtExactLocationAlias(ctx.owner, 'church');
  },
  execute(ctx) {
    const churchLocId = resolveLocationAlias('church');
    const destDef = getLocationDefinition(churchLocId);
    ctx.owner.location = churchLocId;
    ctx.owner.consecutiveSameZoneRolls = 0;
    ctx.state.allowedMoveDestinations = undefined;
    ctx.state.turnPhase = 'LOCATION_ACTION';
    ctx.state.lastDiceRoll = null;

    const exp = ensureExpansionState(ctx.state);
    incRoleStat(exp.stats.activationsByRole, 'exp2_father_harrison', 1);

    appendPublicLog(
      ctx.state,
      'skill',
      `⛪ Father Harrison (${ctx.owner.displayName}) — Lễ Ngày Chủ Nhật: di chuyển thẳng tới Ô ${destDef.diceLabel} (${destDef.name} / Church) không cần đổ xúc xắc!`,
      ctx.event.nowMs,
      ctx.owner.playerId,
    );
    return { applied: true, note: `moved=${churchLocId}` };
  },
};

const gloriaMightyBlessingHandler: SkillHandlerDefinition = {
  id: 'exp:exp2_gloria:mighty-blessing',
  roleId: 'exp2_gloria',
  trigger: 'ON_DRAW_CARD',
  priority: 12,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload) return false;
    if (ctx.event.actorPlayerId !== ctx.owner.playerId) return false;
    if (payload.isLocationDraw !== true || payload.isRecursiveDraw === true) return false;
    return payload.deckId === 'equipment' && isPlayerAtExactLocationAlias(ctx.owner, 'church');
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    payload.gloriaDoubleDraw = true;
    return { applied: true, note: 'church-white-x2' };
  },
};

const cindyNightmareHandler: SkillHandlerDefinition = {
  id: 'exp:exp1_cindy:nightmare',
  roleId: 'exp1_cindy',
  trigger: 'AFTER_DAMAGE',
  priority: 10,
  requiresRevealed: false,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload) return false;
    if (ctx.event.targetPlayerId !== ctx.owner.playerId) return false;
    if (payload.cindyAlreadyChecked) return false;
    if (payload.isRetaliation || payload.sourceType === 'retaliation') return false;
    if (payload.isHpCost || payload.sourceType === 'hp-cost') return false;
    const actualDealt = typeof payload.actualDealt === 'number' ? payload.actualDealt : 0;
    const attackerId = typeof payload.attackerPlayerId === 'string' ? payload.attackerPlayerId : null;
    if (actualDealt < 1 || !attackerId || attackerId === ctx.owner.playerId) return false;
    const attacker = ctx.state.players[attackerId];
    return Boolean(ctx.owner.alive && ctx.owner.hp > 0 && attacker && attacker.alive);
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    payload.cindyAlreadyChecked = true;
    if (ctx.owner.revealed) {
      payload.cindyAutoRetaliate = true;
      return { applied: true, note: 'revealed-retaliate-1' };
    }
    payload.pendingCindyChoice = {
      cindyPlayerId: ctx.owner.playerId,
      sourceDamageEventId: String(payload.sourceDamageEventId ?? ''),
      attackerPlayerId: String(payload.attackerPlayerId ?? ''),
    };
    return { applied: false, stopPropagation: true, note: 'pending-secret-retaliate' };
  },
};

const bipolarFateCoinHandler: SkillHandlerDefinition = {
  id: 'exp:exp1_bipolar:fate-coin',
  roleId: 'exp1_bipolar',
  trigger: 'ON_TURN_START',
  priority: 10,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    if (ctx.event.actorPlayerId !== ctx.owner.playerId) return false;
    if (ctx.owner.skillUsedOnce) return false;
    return ctx.state.turnPhase === 'ROLL_MOVE';
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    payload.bipolarCanPrompt = true;
    return { applied: true, note: 'fate-coin-prompt-ready' };
  },
};

// ---------------------------------------------------------------------------
// Phase 4B Executable Skill Handlers (Wave 3 — 10 Tier-2 House-Rule Characters)
// ---------------------------------------------------------------------------

/** Udi (exp1_udi): Đã lộ diện & có >= 2 người chơi khác còn sống trong cùng Cụm chiến đấu. */
export function isUdiProtectedFromAttack(
  state: AuthoritativeGameState,
  target: AuthoritativePlayerState,
): boolean {
  if (!target.alive || !target.revealed || target.roleId !== 'exp1_udi') {
    return false;
  }
  return listLivingPlayersInSameCluster(state, target, { includeSelf: false }).length >= 2;
}

/** Visions (exp2_visions): Cấm người chơi Visions tấn công trực tiếp mục tiêu đã đánh dấu. */
export function isVisionsMarkedTarget(
  state: AuthoritativeGameState,
  attackerPlayerId: string,
  targetPlayerId: string,
): boolean {
  const mark = state.expansionState?.visionsMarks?.[attackerPlayerId];
  return Boolean(mark && mark.targetPlayerId === targetPlayerId);
}

/**
 * Kiểm tra mục tiêu tấn công trực tiếp hợp lệ trong chế độ mở rộng:
 * kế thừa tầm đánh chuẩn (Cluster / Handgun) và thực thi cấm đánh trên server cho Udi & Visions.
 */
export function canExpandedPlayerAttackTarget(
  state: AuthoritativeGameState,
  attacker: AuthoritativePlayerState,
  target: AuthoritativePlayerState,
): boolean {
  if (!canPlayerAttackTarget(state, attacker, target)) return false;
  if (isUdiProtectedFromAttack(state, target)) return false;
  if (isVisionsMarkedTarget(state, attacker.playerId, target.playerId)) return false;
  return true;
}

/** Danh sách mục tiêu tấn công hợp lệ trong chế độ mở rộng (đã lọc Udi & Visions). */
export function listExpandedReachableAttackTargets(
  state: AuthoritativeGameState,
  attacker: AuthoritativePlayerState,
): AuthoritativePlayerState[] {
  return listReachableAttackTargets(state, attacker).filter(
    (target) =>
      !isUdiProtectedFromAttack(state, target) &&
      !isVisionsMarkedTarget(state, attacker.playerId, target.playerId),
  );
}

const fallenResistanceHandler: SkillHandlerDefinition = {
  id: 'exp:exp1_fallen:resistance',
  roleId: 'exp1_fallen',
  trigger: 'BEFORE_DAMAGE',
  priority: 3,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload) return false;
    if (ctx.event.actorPlayerId !== ctx.owner.playerId) return false;
    if (payload.phase !== 'outgoing_attack_modifiers') return false;
    if (payload.fallenApplied) return false;
    const baseDmg = typeof payload.baseDmg === 'number' ? payload.baseDmg : 0;
    // House rule: >= 8 remaining HP & đòn tấn công trúng (baseDmg > 0)
    return baseDmg > 0 && getRemainingHp(ctx.owner) >= 8;
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    const prevRaw = typeof payload.rawDmg === 'number' ? payload.rawDmg : 0;
    const targetCount = Math.max(1, typeof payload.targetCount === 'number' ? payload.targetCount : 1);
    payload.rawDmg = prevRaw + 2;
    payload.fallenBonus = 2;
    payload.fallenApplied = true;

    const exp = ensureExpansionState(ctx.state);
    incRoleStat(exp.stats.activationsByRole, 'exp1_fallen', 1);
    incRoleStat(exp.stats.bonusDamageByRole, 'exp1_fallen', 2 * targetCount);
    return { applied: true, note: 'fallen-hp>=8-bonus=+2' };
  },
};

const feaMoveAdjustHandler: SkillHandlerDefinition = {
  id: 'exp:exp1_fea:dice-adjust',
  roleId: 'exp1_fea',
  trigger: 'ON_MOVE',
  priority: 12,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload || payload.phase !== 'dice_move_adjust') return false;
    if (ctx.event.actorPlayerId !== ctx.owner.playerId) return false;
    if (ctx.state.turnPhase !== 'ROLL_MOVE') return false;
    return !ctx.owner.equipped.includes('eq-05');
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    payload.feaCanAdjust = true;
    return { applied: true, note: 'fea-move-adjust-ready' };
  },
};

const eleanorInterrogatorHandler: SkillHandlerDefinition = {
  id: 'exp:exp2_eleanor:interrogator',
  roleId: 'exp2_eleanor',
  trigger: 'ACTIVE_SKILL',
  priority: 10,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    if (ctx.event.actorPlayerId !== ctx.owner.playerId) return false;
    if (ctx.state.turnPhase !== 'MAIN_ACTION') return false;
    if (ctx.owner.attacksThisTurn > 0) return false;
    if (ctx.owner.hand.length > 0 || hasGloriaQueuedCards(ctx.state, ctx.owner.playerId)) {
      return false;
    }
    if (
      ctx.owner.equipped.includes(MASAMUNE_CARD_ID) &&
      listExpandedReachableAttackTargets(ctx.state, ctx.owner).length > 0
    ) {
      return false;
    }
    return true;
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    payload.eleanorApproved = true;
    return { applied: true, note: 'eleanor-green-draw-approved' };
  },
};

const fujikoItsOverHandler: SkillHandlerDefinition = {
  id: 'exp:exp2_fujiko:its-over',
  roleId: 'exp2_fujiko',
  trigger: 'AFTER_ATTACK',
  priority: 10,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload) return false;
    if (ctx.event.actorPlayerId !== ctx.owner.playerId) return false;
    if (payload.sourceType !== 'attack') return false;
    const actualDealt = typeof payload.actualDealt === 'number' ? payload.actualDealt : 0;
    const preHp = typeof payload.preAttackTargetHp === 'number' ? payload.preAttackTargetHp : 99;
    const preRevealed = payload.preAttackTargetRevealed === true;
    const targetId = typeof ctx.event.targetPlayerId === 'string' ? ctx.event.targetPlayerId : '';
    const target = targetId ? ctx.state.players[targetId] : null;
    return Boolean(
      actualDealt >= 1 &&
        preRevealed &&
        preHp <= 4 &&
        target &&
        target.alive &&
        target.hp > 0,
    );
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    payload.fujikoExecute = true;
    return { applied: true, note: 'fujiko-execute-triggered' };
  },
};

const udiHidingHandler: SkillHandlerDefinition = {
  id: 'exp:exp1_udi:hiding',
  roleId: 'exp1_udi',
  trigger: 'BEFORE_ATTACK',
  priority: 5,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    if (ctx.event.targetPlayerId !== ctx.owner.playerId) return false;
    return isUdiProtectedFromAttack(ctx.state, ctx.owner);
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    payload.udiBlockedAttack = true;
    const exp = ensureExpansionState(ctx.state);
    incRoleStat(exp.stats.activationsByRole, 'exp1_udi', 1);
    return { applied: true, stopPropagation: true, note: 'udi-crowd-protection' };
  },
};

const wrathTurnStartAoeHandler: SkillHandlerDefinition = {
  id: 'exp:exp1_wrath:cluster-aoe',
  roleId: 'exp1_wrath',
  trigger: 'ON_TURN_START',
  priority: 11,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    if (ctx.event.actorPlayerId !== ctx.owner.playerId) return false;
    if (ctx.state.turnPhase !== 'ROLL_MOVE') return false;
    const exp = ensureExpansionState(ctx.state);
    if (exp.wrathPromptedTurnNumber === ctx.state.turnNumber) return false;
    return listLivingPlayersInSameCluster(ctx.state, ctx.owner, { includeSelf: false }).length > 0;
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    payload.wrathCanPrompt = true;
    return { applied: true, note: 'wrath-cluster-aoe-ready' };
  },
};

const vengeanceChainStrikeHandler: SkillHandlerDefinition = {
  id: 'exp:exp1_vengeance:chain-strike',
  roleId: 'exp1_vengeance',
  trigger: 'ON_ELIMINATION',
  priority: 15, // Chạy SAU Wyvern (10), TRƯỚC Wendigo (20)!
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload) return false;
    if (payload.vengeanceAlreadyChecked) return false;
    if (ctx.owner.skillUsedOnce) return false;
    if (payload.killerPlayerId !== ctx.owner.playerId) return false;
    if (payload.victimPlayerId === ctx.owner.playerId) return false;
    return ctx.owner.alive && ctx.owner.revealed;
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    payload.vengeanceAlreadyChecked = true;
    const others = ctx.state.turnOrder
      .map((id) => ctx.state.players[id])
      .filter(
        (p): p is AuthoritativePlayerState =>
          Boolean(p && p.alive && p.playerId !== ctx.owner.playerId),
      );
    if (others.length === 0) {
      return { applied: false, note: 'vengeance-no-targets' };
    }
    payload.pendingVengeanceChoice = {
      vengeancePlayerId: ctx.owner.playerId,
      eliminationEventId: String(payload.eliminationEventId ?? ''),
      victimPlayerId: String(payload.victimPlayerId ?? ''),
      candidateTargetIds: others.map((p) => p.playerId),
    };
    return { applied: false, stopPropagation: true, note: 'pending-vengeance-chain-strike' };
  },
};

const visionsCurseHandler: SkillHandlerDefinition = {
  id: 'exp:exp2_visions:curse-mark',
  roleId: 'exp2_visions',
  trigger: 'ON_TURN_START',
  priority: 12,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    if (ctx.event.actorPlayerId !== ctx.owner.playerId) return false;
    if (ctx.state.turnPhase !== 'ROLL_MOVE') return false;
    const exp = ensureExpansionState(ctx.state);
    const existingMark = exp.visionsMarks?.[ctx.owner.playerId];
    if (existingMark) {
      const victim = ctx.state.players[existingMark.targetPlayerId];
      return Boolean(
        victim &&
          victim.alive &&
          existingMark.markedOnTurnNumber < ctx.state.turnNumber &&
          existingMark.lastTickTurnNumber !== ctx.state.turnNumber,
      );
    }
    if (ctx.owner.skillUsedOnce || exp.visionsPromptedTurnNumber === ctx.state.turnNumber) {
      return false;
    }
    return Object.values(ctx.state.players).some(
      (p) => p.alive && p.playerId !== ctx.owner.playerId,
    );
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    const exp = ensureExpansionState(ctx.state);
    const existingMark = exp.visionsMarks?.[ctx.owner.playerId];
    if (existingMark) {
      payload.visionsTickTargetId = existingMark.targetPlayerId;
      return { applied: true, note: `visions-tick=${existingMark.targetPlayerId}` };
    }
    payload.visionsCanPrompt = true;
    return { applied: true, note: 'visions-mark-prompt-ready' };
  },
};

const cruzBlackRedrawHandler: SkillHandlerDefinition = {
  id: 'exp:exp2_cruz:black-redraw',
  roleId: 'exp2_cruz',
  trigger: 'ON_DRAW_CARD',
  priority: 14,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload) return false;
    if (ctx.event.actorPlayerId !== ctx.owner.playerId) return false;
    if (payload.isLocationDraw !== true || payload.isRecursiveDraw === true) return false;
    return payload.deckId === 'event';
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    payload.cruzBlackRedraw = true;
    return { applied: true, note: 'cruz-black-redraw-ready' };
  },
};

const bryonGenerousServiceHandler: SkillHandlerDefinition = {
  id: 'exp:exp2_bryon:generous-service',
  roleId: 'exp2_bryon',
  trigger: 'BEFORE_ATTACK',
  priority: 20,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    if (ctx.event.actorPlayerId !== ctx.owner.playerId) return false;
    if (ctx.state.turnPhase !== 'MAIN_ACTION' || ctx.owner.attacksThisTurn > 0) return false;
    const hasGiftable = ctx.owner.equipped.some((cid) => cid !== MASAMUNE_CARD_ID);
    if (!hasGiftable) return false;
    return listLivingPlayersInSameCluster(ctx.state, ctx.owner, { includeSelf: false }).some(
      (p) => p.faction === 'wanderer' && p.revealed,
    );
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    payload.bryonCanGift = true;
    return { applied: true, note: 'bryon-gift-ready' };
  },
};

// ---------------------------------------------------------------------------
// Phase 5B Executable Skill Handlers (Final 4 Tier-2 House-Rule Characters)
// ---------------------------------------------------------------------------

const eliseSoftHarmonyHandler: SkillHandlerDefinition = {
  id: 'exp:exp2_elise:soft-harmony',
  roleId: 'exp2_elise',
  trigger: 'ACTIVE_SKILL',
  priority: 10,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    if (ctx.event.actorPlayerId !== ctx.owner.playerId) return false;
    if (ctx.owner.skillUsedOnce) return false;
    if (
      ctx.state.turnPhase !== 'ROLL_MOVE' &&
      ctx.state.turnPhase !== 'LOCATION_ACTION' &&
      ctx.state.turnPhase !== 'MAIN_ACTION'
    ) {
      return false;
    }
    return ctx.owner.hand.length === 0 && !hasGloriaQueuedCards(ctx.state, ctx.owner.playerId);
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    payload.eliseApproved = true;
    return { applied: true, note: 'elise-distribute-heal-approved' };
  },
};

const umibozuRevealAoeHandler: SkillHandlerDefinition = {
  id: 'exp:exp2_umibozu:reveal-surge',
  roleId: 'exp2_umibozu',
  trigger: 'ON_ROLE_REVEAL',
  priority: 10,
  requiresRevealed: true,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload) return false;
    if (payload.revealedPlayerId !== ctx.owner.playerId) return false;
    if (payload.umibozuChecked) return false;
    if (ctx.owner.skillUsedOnce) return false;
    const exp = ensureExpansionState(ctx.state);
    if (exp.umibozuTriggeredIds?.includes(ctx.owner.playerId)) return false;
    return ctx.owner.alive && ctx.owner.revealed;
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    const exp = ensureExpansionState(ctx.state);
    // Khóa 1 lần/trận TRƯỚC khi đẩy bất kỳ DAMAGE nào (chống vòng lặp đệ quy tuyệt đối!)
    ctx.owner.skillUsedOnce = true;
    if (!exp.umibozuTriggeredIds) exp.umibozuTriggeredIds = [];
    exp.umibozuTriggeredIds.push(ctx.owner.playerId);
    payload.umibozuChecked = true;

    const clusterOthers = listLivingPlayersInSameCluster(ctx.state, ctx.owner, {
      includeSelf: false,
    });
    const orderedVictims = ctx.state.turnOrder
      .map((id) => clusterOthers.find((p) => p.playerId === id))
      .filter((p): p is AuthoritativePlayerState => Boolean(p));

    incRoleStat(exp.stats.activationsByRole, 'exp2_umibozu', 1);
    if (orderedVictims.length === 0) {
      appendPublicLog(
        ctx.state,
        'skill',
        `🌊 Umibozu (${ctx.owner.displayName}) — Sóng Ngầm Lộ Diện: không có người chơi khác cùng Cụm để giáng sát thương!`,
        ctx.event.nowMs,
        ctx.owner.playerId,
      );
      return { applied: true, note: 'umibozu-no-victims' };
    }

    incRoleStat(exp.stats.bonusDamageByRole, 'exp2_umibozu', 3 * orderedVictims.length);
    appendPublicLog(
      ctx.state,
      'skill',
      `🌊 Umibozu (${ctx.owner.displayName}) — Sóng Ngầm Lộ Diện: giáng 3 sát thương kỹ năng lên ${orderedVictims.length} người chơi khác cùng Cụm (${orderedVictims.map((v) => v.displayName).join(', ')})!`,
      ctx.event.nowMs,
      ctx.owner.playerId,
    );

    const depth = typeof payload.chainDepth === 'number' ? payload.chainDepth : 0;
    const queued = Array.isArray(payload.queuedRevealSteps)
      ? (payload.queuedRevealSteps as PendingResolutionStep[])
      : [];
    for (const v of orderedVictims) {
      queued.push({
        kind: 'DAMAGE',
        damageEventId: nextExpansionEventId(ctx.state, 'dmg-umibozu'),
        causationId: String(payload.revealEventId ?? ''),
        targetPlayerId: v.playerId,
        rawAmount: 3,
        sourceType: 'skill',
        attackerPlayerId: ctx.owner.playerId,
        isSingleTarget: false,
        chainDepth: depth + 1,
      });
    }
    payload.queuedRevealSteps = queued;
    return { applied: true, note: `umibozu-aoe=${orderedVictims.length}` };
  },
};

const urbanLegendHorrorHandler: SkillHandlerDefinition = {
  id: 'exp:exp2_urban_legend:horror-story',
  roleId: 'exp2_urban_legend',
  trigger: 'BEFORE_DAMAGE',
  priority: 10,
  requiresRevealed: false,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload || payload.phase !== 'urban_legend_convert') return false;
    if (ctx.event.targetPlayerId !== ctx.owner.playerId) return false;
    if (payload.isConsumableBlackCardDamage !== true) return false;
    if (payload.isHpCost || payload.unpreventable || payload.urbanLegendAlreadyChecked) {
      return false;
    }
    const dmg = typeof payload.damageAmount === 'number' ? payload.damageAmount : 0;
    return dmg > 0 && ctx.owner.alive;
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    payload.urbanLegendEligible = true;
    return { applied: true, note: 'urban-legend-consumable-black-eligible' };
  },
};

const arleneAffectationHandler: SkillHandlerDefinition = {
  id: 'exp:exp2_arlene:affectation',
  roleId: 'exp2_arlene',
  trigger: 'ON_INVESTIGATE',
  priority: 10,
  requiresRevealed: false,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload) return false;
    if (ctx.event.targetPlayerId !== ctx.owner.playerId) return false;
    if (payload.isFactionCheck !== true) return false;
    return getPlayerReactionPolicy(ctx.state, ctx.owner.playerId) !== 'AUTO_DECLINE';
  },
  execute(ctx) {
    const payload = ctx.event.payload as Record<string, unknown>;
    payload.arleneImpersonateShadow = true;
    return { applied: true, note: 'arlene-shadow-disguise' };
  },
};

export function createExpansionSkillEngine(): SkillEngine {
  const engine = createSkillEngine();
  engine.registerHandler(g43FortressHandler);
  engine.registerHandler(fionaSurgicalStrikeHandler);
  engine.registerHandler(wyvernAbsorptionHandler);
  engine.registerHandler(wendigoCannibalFeastHandler);
  engine.registerHandler(gayleTraineeFighterHandler);
  engine.registerHandler(feliciaResourcefulHandler);
  engine.registerHandler(victorMadScientistHandler);
  engine.registerHandler(undyingIronPlatingHandler);
  // Phase 3A Wave 2 handlers
  engine.registerHandler(unchainedEndlessViolenceHandler);
  engine.registerHandler(warlockPowerSourceHandler);
  engine.registerHandler(elysiaCounterattackHandler);
  engine.registerHandler(witchNoPlaceLikeHomeHandler);
  engine.registerHandler(fatherHarrisonSundayServiceHandler);
  engine.registerHandler(gloriaMightyBlessingHandler);
  engine.registerHandler(cindyNightmareHandler);
  engine.registerHandler(bipolarFateCoinHandler);
  // Phase 4B Wave 3 handlers
  engine.registerHandler(fallenResistanceHandler);
  engine.registerHandler(feaMoveAdjustHandler);
  engine.registerHandler(eleanorInterrogatorHandler);
  engine.registerHandler(fujikoItsOverHandler);
  engine.registerHandler(udiHidingHandler);
  engine.registerHandler(wrathTurnStartAoeHandler);
  engine.registerHandler(vengeanceChainStrikeHandler);
  engine.registerHandler(visionsCurseHandler);
  engine.registerHandler(cruzBlackRedrawHandler);
  engine.registerHandler(bryonGenerousServiceHandler);
  // Phase 5B Final 4 Tier-2 handlers
  engine.registerHandler(eliseSoftHarmonyHandler);
  engine.registerHandler(umibozuRevealAoeHandler);
  engine.registerHandler(urbanLegendHorrorHandler);
  engine.registerHandler(arleneAffectationHandler);
  return engine;
}

export const EXPANSION_SKILL_ENGINE = createExpansionSkillEngine();

// ---------------------------------------------------------------------------
// Attack & Damage Step Builders (Expanded Rulesets)
// ---------------------------------------------------------------------------

function predictExpectedAttackDealt(
  victim: AuthoritativePlayerState,
  rawDmg: number,
): number {
  if (victim.guardianShieldActive) return 0;
  if (
    victim.revealed &&
    victim.roleId === 'exp2_witch' &&
    isPlayerAtExactLocationAlias(victim, 'weird_woods')
  ) {
    return 0;
  }
  let dmg = rawDmg;
  if (victim.equipped.includes('eq-01')) {
    dmg = Math.max(0, dmg - 1);
  }
  if (victim.revealed && victim.roleId === 'exp2_g43') {
    dmg = Math.max(0, dmg - 2);
  }
  if (victim.revealed && victim.roleId === 'exp1_undying' && dmg >= 2) {
    dmg = Math.max(0, dmg - 1);
  }
  return dmg;
}

function enqueueAttackResolution(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  primaryTargetId: string,
  roll: AttackRollSample,
  hasMachineGun: boolean,
  nowMs: number,
  callbacks: TurnContinuationCallbacks,
  options?: {
    outgoingModifiersApplied?: boolean;
    outgoingModifierLabel?: string;
    elysiaChecked?: boolean;
    elysiaBoosted?: boolean;
    victorChecked?: boolean;
    victorBoostTargetId?: string | null;
  },
): EngineActionResult {
  const target = state.players[primaryTargetId];
  if (!target || !target.alive) {
    return { ok: false, error: 'Mục tiêu tấn công không còn hợp lệ.' };
  }

  const targets = hasMachineGun ? listExpandedReachableAttackTargets(state, actor) : [target];
  let effectiveRoll: AttackRollSample = roll;
  let modifierTag = options?.outgoingModifierLabel ?? '';

  // Bước 4A trong Damage Pipeline: Attacker passive outgoing attack modifiers
  // (Fallen +2 khi >= 8 HP, Unchained +2, Warlock +3 tại exact court)
  // Chỉ áp dụng ĐÚNG 1 LẦN cho đòn tấn công trúng (baseDmg > 0), TRƯỚC defender prevention và KHÔNG cộng lặp khi resume!
  if (!options?.outgoingModifiersApplied && roll.baseDmg > 0 && targets.length > 0) {
    const outPayload: Record<string, unknown> = {
      phase: 'outgoing_attack_modifiers',
      baseDmg: roll.baseDmg,
      rawDmg: roll.rawDmg,
      targetCount: targets.length,
      fallenApplied: false,
      unchainedApplied: false,
      warlockApplied: false,
    };
    EXPANSION_SKILL_ENGINE.dispatch(state, {
      trigger: 'BEFORE_DAMAGE',
      actorPlayerId: actor.playerId,
      targetPlayerId: primaryTargetId,
      nowMs,
      payload: outPayload,
    });
    const nextRaw = typeof outPayload.rawDmg === 'number' ? outPayload.rawDmg : roll.rawDmg;
    const tags: string[] = [];
    if (typeof outPayload.fallenBonus === 'number' && outPayload.fallenBonus > 0) {
      tags.push(`+${outPayload.fallenBonus} Fallen`);
    }
    if (typeof outPayload.unchainedBonus === 'number' && outPayload.unchainedBonus > 0) {
      tags.push(`+${outPayload.unchainedBonus} Unchained`);
    }
    if (typeof outPayload.warlockBonus === 'number' && outPayload.warlockBonus > 0) {
      tags.push(`+${outPayload.warlockBonus} Warlock`);
    }
    if (nextRaw !== roll.rawDmg) {
      effectiveRoll = { ...roll, rawDmg: nextRaw };
      modifierTag = tags.join(' ');
    }
  }

  const rollDesc = modifierTag
    ? `${formatAttackRollDesc(effectiveRoll)} ${modifierTag}`
    : formatAttackRollDesc(effectiveRoll);

  // Bước 4B: Kiểm tra Elysia (Phản Công — Phase 3A house rule):
  // Đánh trúng (baseDmg > 0) + sát thương tấn công sau trang bị công (trước giáp phòng thủ) là 1 hoặc 2 -> chọn +2 ST!
  if (!options?.elysiaChecked && effectiveRoll.baseDmg > 0 && targets.length > 0) {
    const elysiaPayload: Record<string, unknown> = {
      phase: 'attack_boost_check',
      baseDmg: effectiveRoll.baseDmg,
      offensiveDmg: effectiveRoll.rawDmg,
      elysiaAlreadyChecked: false,
    };
    EXPANSION_SKILL_ENGINE.dispatch(state, {
      trigger: 'BEFORE_DAMAGE',
      actorPlayerId: actor.playerId,
      targetPlayerId: primaryTargetId,
      nowMs,
      payload: elysiaPayload,
    });

    if (elysiaPayload.elysiaCanBoost === true) {
      const choiceId = nextExpansionEventId(state, 'choice-elysia');
      const eventId = nextExpansionEventId(state, 'ev-elysia');
      const timeoutMs = getChoiceTimeoutMs(state, actor);
      const elysiaOptions: BoardGameChoiceOptionView[] = [
        {
          optionId: 'boost',
          label: `Kích hoạt Phản Công (+2 ST → ${effectiveRoll.rawDmg + 2} ST thô)`,
          detail: `Sát thương tấn công nền là ${effectiveRoll.rawDmg} (< 3) — cộng thêm +2 ST trước phòng thủ.`,
        },
        {
          optionId: 'skip',
          label: `Không dùng (Giữ nguyên ${effectiveRoll.rawDmg} ST thô)`,
          detail: `Áp dụng đòn đánh thường (${rollDesc}).`,
        },
      ];

      state.pendingChoice = {
        choiceId,
        eventId,
        ownerPlayerId: actor.playerId,
        kind: 'elysia_counter_boost',
        isSecret: false,
        title: 'Phản Công (Elysia)',
        description: `Đòn tấn công trúng ${target.displayName} gây ${effectiveRoll.rawDmg} ST thô (< 3). Bạn có muốn kích hoạt Phản Công (+2 ST → ${effectiveRoll.rawDmg + 2}) không? (Hết giờ tự bỏ qua).`,
        publicPromptLabel: `⚔️ Elysia (${actor.displayName}) đang cân nhắc kích hoạt Phản Công (+2 ST)...`,
        options: elysiaOptions,
        defaultOptionId: 'skip',
        createdAtMs: nowMs,
        deadlineMs: nowMs + timeoutMs,
        data: {
          kind: 'elysia_counter_boost',
          actorPlayerId: actor.playerId,
          targetPlayerId: primaryTargetId,
          hasMasamune: effectiveRoll.hasMasamune,
          hasMachineGun,
          roll: effectiveRoll,
        },
      };
      appendPublicLog(
        state,
        'dice',
        `⚔️ Elysia (${actor.displayName}) tung đòn trúng (${rollDesc}, ${effectiveRoll.rawDmg} ST < 3) — đang chọn có kích hoạt Phản Công (+2 ST) không!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }
  }

  // Bước 4C: Kiểm tra Victor (Bác Học Điên — experimental house rule):
  // Đã lật vai + đánh trúng (baseDmg > 0) + còn >= 2 HP -> mở lựa chọn trả 1 HP (HP cost) để +2 ST cho ĐÚNG 1 mục tiêu!
  if (!options?.victorChecked && effectiveRoll.baseDmg > 0 && targets.length > 0) {
    const victorPayload: Record<string, unknown> = {
      phase: 'attack_boost_check',
      baseDmg: effectiveRoll.baseDmg,
      rawDmg: effectiveRoll.rawDmg,
      victorAlreadyChecked: false,
    };
    EXPANSION_SKILL_ENGINE.dispatch(state, {
      trigger: 'BEFORE_DAMAGE',
      actorPlayerId: actor.playerId,
      targetPlayerId: primaryTargetId,
      nowMs,
      payload: victorPayload,
    });

    if (victorPayload.victorCanBoost === true) {
      const choiceId = nextExpansionEventId(state, 'choice-victor');
      const eventId = nextExpansionEventId(state, 'ev-victor');
      const timeoutMs = getChoiceTimeoutMs(state, actor);
      const boostOptions: BoardGameChoiceOptionView[] = [
        ...targets.map((victim) => ({
          optionId: `boost:${victim.playerId}`,
          label: `Trả 1 HP → +2 ST vào ${victim.displayName}`,
          detail: `HP còn ${actor.hp - 1}/${actor.maxHp} · Tổng ST thô vào ${victim.displayName}: ${effectiveRoll.rawDmg + 2}${targets.length > 1 ? ' (chỉ tăng cho 1 mục tiêu này)' : ''}`,
          targetPlayerId: victim.playerId,
        })),
        {
          optionId: 'skip',
          label: `Không kích hoạt (Giữ ${actor.hp}/${actor.maxHp} HP)`,
          detail: `Áp dụng sát thương thường (${rollDesc}, ${effectiveRoll.rawDmg} ST thô).`,
        },
      ];

      state.pendingChoice = {
        choiceId,
        eventId,
        ownerPlayerId: actor.playerId,
        kind: 'victor_blood_boost',
        isSecret: false,
        title: 'Bác Học Điên (Victor)',
        description: `Đòn đánh (${rollDesc}, ${effectiveRoll.rawDmg} ST thô) đã trúng! Bạn có thể trả 1 HP (không thể giảm bởi giáp/khiên) để cộng +2 ST cho 1 mục tiêu duy nhất (hết giờ tự bỏ qua).`,
        publicPromptLabel: `🧪 Victor (${actor.displayName}) đang cân nhắc trả 1 HP để cường hóa +2 ST...`,
        options: boostOptions,
        defaultOptionId: 'skip',
        createdAtMs: nowMs,
        deadlineMs: nowMs + timeoutMs,
        data: {
          kind: 'victor_blood_boost',
          actorPlayerId: actor.playerId,
          targetPlayerId: primaryTargetId,
          hasMasamune: effectiveRoll.hasMasamune,
          hasMachineGun,
          roll: effectiveRoll,
          eligibleTargetIds: targets.map((t) => t.playerId),
        },
      };
      appendPublicLog(
        state,
        'dice',
        `🧪 Victor (${actor.displayName}) tung đòn trúng (${rollDesc}) — đang quyết định có trả 1 HP cộng +2 ST hay không!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }
  }

  actor.attacksMade += 1;
  actor.attacksThisTurn += 1;
  actor.lastAttackTargetId = target.playerId;

  const exp = ensureExpansionState(state);
  const elysiaBonus = options?.elysiaBoosted ? 2 : 0;
  const effectiveBaseRaw = effectiveRoll.rawDmg + elysiaBonus;
  const effectiveRollDesc = elysiaBonus > 0 ? `${rollDesc} +2 Elysia` : rollDesc;

  const stepsToPush: PendingResolutionStep[] = [];
  for (const victim of targets) {
    const isVictorBoosted = options?.victorBoostTargetId === victim.playerId;
    const victimRawDmg = isVictorBoosted ? effectiveBaseRaw + 2 : effectiveBaseRaw;
    const expectedDealt = predictExpectedAttackDealt(victim, victimRawDmg);
    const wouldKillForMultiLoot =
      actor.equipped.includes('eq-06') &&
      victim.equipped.length >= 2 &&
      expectedDealt >= victim.hp;

    const bobStealInstead =
      !hasMachineGun &&
      !wouldKillForMultiLoot &&
      state.turnOrder.length <= 6 &&
      actor.alive &&
      actor.revealed &&
      actor.roleId === 'lang-anh-san' &&
      expectedDealt >= 2 &&
      victim.equipped.length > 0;

    if (bobStealInstead) {
      const stolen = stealOneEquippedGear(state, actor, victim);
      if (stolen) {
        appendPublicLog(
          state,
          'steal',
          `🧲 Hải "Sưu Tầm" (${actor.displayName}) chọn Cướp Đồ Thay Đòn (${effectiveRollDesc}) → lấy "${stolen.title}" từ ${victim.displayName} (0 sát thương)!`,
          nowMs,
          actor.playerId,
        );
      }
      continue;
    }

    const damageEventId = nextExpansionEventId(state, 'dmg');
    stepsToPush.push({
      kind: 'DAMAGE',
      damageEventId,
      targetPlayerId: victim.playerId,
      rawAmount: victimRawDmg,
      sourceType: 'attack',
      attackerPlayerId: actor.playerId,
      isSingleTarget: !hasMachineGun,
      preAttackTargetHp: getRemainingHp(victim),
      preAttackTargetRevealed: victim.revealed,
      ...(targets.length === 1
        ? {
            attackSingleTargetLog: {
              rollDesc: isVictorBoosted ? `${effectiveRollDesc} +2 Victor` : effectiveRollDesc,
            },
          }
        : {}),
    });
  }

  const singleTargetBoosted =
    targets.length === 1 && options?.victorBoostTargetId === target.playerId;

  stepsToPush.push({
    kind: 'POST_ATTACK_EFFECTS',
    attackerPlayerId: actor.playerId,
    primaryTargetId: target.playerId,
    targetCount: targets.length,
    d6: effectiveRoll.d6,
    d4: effectiveRoll.d4,
    baseDmg: effectiveRoll.baseDmg,
    rawDmg: singleTargetBoosted ? effectiveBaseRaw + 2 : effectiveBaseRaw,
    hasMasamune: effectiveRoll.hasMasamune,
    hasMachineGun,
    rollDesc: singleTargetBoosted ? `${effectiveRollDesc} +2 Victor` : effectiveRollDesc,
    totalDealt: 0,
    counterAttackerIds: [],
  });

  stepsToPush.push({
    kind: 'FINISH_ACTION',
    actorPlayerId: actor.playerId,
    autoEndTurnMode: 'if-not-charles-feast',
  });

  exp.pendingSteps.push(...stepsToPush);
  drainPendingSteps(state, nowMs, callbacks);
  return { ok: true };
}

export function startExpandedAttack(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  targetPlayerId: string,
  nowMs: number,
  callbacks: TurnContinuationCallbacks,
): EngineActionResult {
  if (state.turnPhase !== 'MAIN_ACTION') {
    return { ok: false, error: 'Chỉ được tấn công khi đang ở pha Hành động chính.' };
  }
  const target = state.players[targetPlayerId];
  if (!target || !target.alive || target.playerId === actor.playerId) {
    return { ok: false, error: 'Mục tiêu tấn công không hợp lệ.' };
  }
  if (!canPlayerAttackTarget(state, actor, target)) {
    return {
      ok: false,
      error: actor.equipped.includes('ev-05')
        ? 'Súng Bắn Đinh (Handgun) chỉ bắn được các Cụm KHÁC ngoài Cụm bạn đang đứng!'
        : 'Mục tiêu phải đứng cùng Cụm Khu Vực với bạn.',
    };
  }
  if (isUdiProtectedFromAttack(state, target)) {
    const exp = ensureExpansionState(state);
    incRoleStat(exp.stats.activationsByRole, 'exp1_udi', 1);
    return {
      ok: false,
      error: `Ẩn Thân (Udi): ${target.displayName} đang ở cùng Cụm với ≥ 2 người chơi khác nên không thể bị tấn công trực tiếp!`,
    };
  }
  if (isVisionsMarkedTarget(state, actor.playerId, target.playerId)) {
    return {
      ok: false,
      error: `Dấu ấn Visions: Bạn không thể tấn công trực tiếp ${target.displayName} trong suốt phần còn lại của trận đấu!`,
    };
  }

  const hasMasamune = actor.equipped.includes('ev-01');
  const hasMachineGun = actor.equipped.includes('ev-06');

  // Dispatch BEFORE_ATTACK để kiểm tra kỹ năng thay đổi xúc xắc (Fiona / Gayle)
  const beforeAttackPayload: Record<string, unknown> = {
    phase: 'roll_attack',
    hasMasamune,
    hasMachineGun,
    targetPlayerId,
  };
  EXPANSION_SKILL_ENGINE.dispatch(state, {
    trigger: 'BEFORE_ATTACK',
    actorPlayerId: actor.playerId,
    targetPlayerId,
    nowMs,
    payload: beforeAttackPayload,
  });

  const fionaRolls = beforeAttackPayload.fionaRolls as
    | [AttackRollSample, AttackRollSample]
    | undefined;
  if (fionaRolls && fionaRolls.length === 2) {
    const choiceId = nextExpansionEventId(state, 'choice-fiona');
    const eventId = nextExpansionEventId(state, 'ev-fiona');
    const timeoutMs = getChoiceTimeoutMs(state, actor);
    const options: BoardGameChoiceOptionView[] = fionaRolls.map((r, idx) => ({
      optionId: `roll_${idx}`,
      label: `Kết quả #${idx + 1}: ${formatAttackRollDesc(r)} (Tổng ${r.rawDmg} ST)`,
      detail: r.rawDmg === 0 ? 'Đánh hụt (0 ST)' : `Áp dụng ${r.rawDmg} sát thương thô`,
      roll: {
        d6: r.d6,
        d4: r.d4,
        baseDmg: r.baseDmg,
        totalDmg: r.rawDmg,
        hasMasamune: r.hasMasamune,
      },
    }));

    state.pendingChoice = {
      choiceId,
      eventId,
      ownerPlayerId: actor.playerId,
      kind: 'fiona_attack_roll',
      isSecret: false,
      title: 'Đòn Đánh Giải Phẫu (Fiona)',
      description: `Bạn đã tung 2 lần xúc xắc tấn công lên ${target.displayName}. Chọn 1 trong 2 kết quả để áp dụng (hết giờ tự lấy Kết quả #1).`,
      publicPromptLabel: `🎲 Fiona (${actor.displayName}) đang chọn 1 trong 2 kết quả xúc xắc tấn công...`,
      options,
      defaultOptionId: 'roll_0',
      createdAtMs: nowMs,
      deadlineMs: nowMs + timeoutMs,
      data: {
        kind: 'fiona_attack_roll',
        actorPlayerId: actor.playerId,
        targetPlayerId,
        hasMasamune,
        hasMachineGun,
        rolls: fionaRolls,
      },
    };
    appendPublicLog(
      state,
      'dice',
      `🎲 Fiona (${actor.displayName}) — Đòn Đánh Giải Phẫu: tung 2 lần (${formatAttackRollDesc(fionaRolls[0])} & ${formatAttackRollDesc(fionaRolls[1])}), đang chọn 1 kết quả!`,
      nowMs,
      actor.playerId,
    );
    return { ok: true };
  }

  const gayleFirstRoll = beforeAttackPayload.gayleFirstRoll as AttackRollSample | undefined;
  if (gayleFirstRoll) {
    const choiceId = nextExpansionEventId(state, 'choice-gayle');
    const eventId = nextExpansionEventId(state, 'ev-gayle');
    const timeoutMs = getChoiceTimeoutMs(state, actor);
    const options: BoardGameChoiceOptionView[] = [
      {
        optionId: 'keep',
        label: `Giữ kết quả #1: ${formatAttackRollDesc(gayleFirstRoll)} (${gayleFirstRoll.rawDmg} ST)`,
        detail:
          gayleFirstRoll.rawDmg === 0
            ? 'Chấp nhận đánh hụt (0 ST).'
            : `Áp dụng ngay ${gayleFirstRoll.rawDmg} sát thương thô.`,
        roll: {
          d6: gayleFirstRoll.d6,
          d4: gayleFirstRoll.d4,
          baseDmg: gayleFirstRoll.baseDmg,
          totalDmg: gayleFirstRoll.rawDmg,
          hasMasamune: gayleFirstRoll.hasMasamune,
        },
      },
      {
        optionId: 'reroll',
        label: 'Đổ lại xúc xắc tấn công (1 lần)',
        detail: gayleFirstRoll.hasMasamune
          ? 'Đổ lại 1d4 (Masamune) — BẮT BUỘC dùng kết quả lần 2 kể cả khi thấp hơn!'
          : 'Đổ lại |1d6 - 1d4| — BẮT BUỘC dùng kết quả lần 2 kể cả khi thấp hơn!',
      },
    ];

    state.pendingChoice = {
      choiceId,
      eventId,
      ownerPlayerId: actor.playerId,
      kind: 'gayle_attack_reroll',
      isSecret: false,
      title: 'Đấu Sĩ Thực Tập (Gayle)',
      description: `Lần tung đầu lên ${target.displayName} ra ${formatAttackRollDesc(gayleFirstRoll)} (${gayleFirstRoll.rawDmg} ST thô). Giữ kết quả này hay đổ lại 1 lần (bắt buộc lấy kết quả lần 2)?`,
      publicPromptLabel: `🎲 Gayle (${actor.displayName}) đang cân nhắc giữ kết quả hay đổ lại xúc xắc đánh...`,
      options,
      defaultOptionId: 'keep',
      createdAtMs: nowMs,
      deadlineMs: nowMs + timeoutMs,
      data: {
        kind: 'gayle_attack_reroll',
        actorPlayerId: actor.playerId,
        targetPlayerId,
        hasMasamune,
        hasMachineGun,
        firstRoll: gayleFirstRoll,
      },
    };
    appendPublicLog(
      state,
      'dice',
      `🎲 Gayle (${actor.displayName}) — Đấu Sĩ Thực Tập: lần tung đầu ${formatAttackRollDesc(gayleFirstRoll)} (${gayleFirstRoll.rawDmg} ST), đang quyết định giữ hay đổ lại!`,
      nowMs,
      actor.playerId,
    );
    return { ok: true };
  }

  // Standard single attack roll
  const d6 = hasMasamune ? 0 : rollD6(state);
  const d4 = rollD4(state);
  const baseDmg = hasMasamune ? d4 : Math.abs(d6 - d4);
  const rawDmg = computeRawAttackDamage(actor, baseDmg);
  const roll: AttackRollSample = { d6, d4, baseDmg, rawDmg, hasMasamune };

  return enqueueAttackResolution(state, actor, targetPlayerId, roll, hasMachineGun, nowMs, callbacks);
}

// ---------------------------------------------------------------------------
// Expanded Reveal & Movement Entrypoints (Fallen >= 8 HP & Fea +/-1 Dice)
// ---------------------------------------------------------------------------

/**
 * Xử lý hành động tự nguyện lật vai (`REVEAL_ROLE`) trong chế độ mở rộng.
 * Lộ diện bắt buộc (eliminated / eq_mirror / v.v.) gọi trực tiếp `revealPlayerNow` nên không bị chặn.
 */
export function applyExpandedRevealRole(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  nowMs: number,
  callbacks?: TurnContinuationCallbacks,
): EngineActionResult {
  if (actor.roleId === 'exp1_fallen' && !actor.revealed && getRemainingHp(actor) < 8) {
    return {
      ok: false,
      error: `Sự Chống Cự (Fallen): Bạn chỉ có thể tự nguyện lộ diện khi còn từ 8 HP trở lên (hiện ${getRemainingHp(actor)}/${actor.maxHp} HP).`,
    };
  }
  const res = resolveRevealRole(state, actor, nowMs);
  if (!res.ok) return res;

  if (callbacks) {
    const exp = ensureExpansionState(state);
    enqueueRoleRevealedTrigger(state, actor.playerId, 'voluntary', 0);
    exp.pendingSteps.push({
      kind: 'FINISH_ACTION',
      actorPlayerId: actor.playerId,
      autoEndTurnMode: 'never',
    });
    drainPendingSteps(state, nowMs, callbacks);
  }
  return { ok: true };
}

function commitFeaMovementTotal(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  d6: number,
  d4: number,
  rawTotal: number,
  delta: -1 | 0 | 1,
  nowMs: number,
  isTimeoutFallback = false,
): void {
  const exp = ensureExpansionState(state);
  const effectiveTotal = Math.max(2, Math.min(10, rawTotal + delta));
  const mapped = resolveLocationForDiceTotal(effectiveTotal);

  if (delta !== 0) {
    exp.feaAdjustedTurnNumber = state.turnNumber;
    incRoleStat(exp.stats.activationsByRole, 'exp1_fea', 1);
  }

  const deltaLabel = delta > 0 ? `+1 (${rawTotal} → ${effectiveTotal})` : delta < 0 ? `-1 (${rawTotal} → ${effectiveTotal})` : `giữ nguyên ${rawTotal}`;

  if (mapped === 'choose-any') {
    state.allowedMoveDestinations = LOCATIONS_CATALOG.filter((l) => l.id !== actor.location).map(
      (l) => l.id,
    );
    state.lastDiceRoll = {
      id: `roll-${state.turnNumber}-${nowMs}`,
      round: state.round,
      atMs: nowMs,
      playerId: actor.playerId,
      displayName: actor.displayName,
      kind: 'move',
      d6,
      d4,
      total: effectiveTotal,
      rerollRequired: false,
      freeChoice: true,
      resolvedLocation: null,
    };
    state.turnPhase = 'CHOOSE_MOVE';
    actor.consecutiveSameZoneRolls = 0;
    appendPublicLog(
      state,
      isTimeoutFallback ? 'timeout' : delta !== 0 ? 'skill' : 'dice',
      isTimeoutFallback
        ? `⏱️ Fea (${actor.displayName}) quá hạn Chỉnh Phục — giữ nguyên ${d6} + ${d4} = 7, tự do chọn khu vực!`
        : delta !== 0
          ? `🎲✨ Fea (${actor.displayName}) — Chỉnh Phục (${deltaLabel}): đạt tổng 7! Tự do chọn khu vực bất kỳ.`
          : `🎲 Fea (${actor.displayName}) giữ nguyên ${d6} + ${d4} = 7! Tự do chọn khu vực bất kỳ.`,
      nowMs,
      actor.playerId,
    );
    return;
  }

  if (mapped === actor.location) {
    actor.consecutiveSameZoneRolls += 1;
    if (actor.consecutiveSameZoneRolls >= 2) {
      const others = LOCATIONS_CATALOG.filter((l) => l.id !== actor.location);
      const fallback = others[nextRandomInt(state, others.length)];
      actor.location = fallback.id;
      actor.consecutiveSameZoneRolls = 0;
      state.allowedMoveDestinations = undefined;
      state.turnPhase = 'LOCATION_ACTION';
      state.lastDiceRoll = {
        id: `roll-${state.turnNumber}-${nowMs}`,
        round: state.round,
        atMs: nowMs,
        playerId: actor.playerId,
        displayName: actor.displayName,
        kind: 'move',
        d6,
        d4,
        total: effectiveTotal,
        rerollRequired: false,
        freeChoice: false,
        resolvedLocation: fallback.id,
      };
      appendPublicLog(
        state,
        'move',
        `🎲 ${actor.displayName} tung trùng ô hiện tại liên tiếp 2 lần → hệ thống chuyển thẳng sang Ô ${fallback.diceLabel} (${fallback.name}).`,
        nowMs,
        actor.playerId,
      );
      return;
    }

    state.allowedMoveDestinations = undefined;
    state.lastDiceRoll = {
      id: `roll-${state.turnNumber}-${nowMs}`,
      round: state.round,
      atMs: nowMs,
      playerId: actor.playerId,
      displayName: actor.displayName,
      kind: 'move',
      d6,
      d4,
      total: effectiveTotal,
      rerollRequired: true,
      freeChoice: false,
      resolvedLocation: mapped,
    };
    const sameLoc = getLocationDefinition(mapped);
    appendPublicLog(
      state,
      isTimeoutFallback ? 'timeout' : 'dice',
      `🎲 ${actor.displayName} giữ nguyên ${d6} + ${d4} = ${effectiveTotal} (trùng ${sameLoc.name}) → được quyền ĐỔ LẠI!`,
      nowMs,
      actor.playerId,
    );
    return;
  }

  actor.location = mapped;
  actor.consecutiveSameZoneRolls = 0;
  state.allowedMoveDestinations = undefined;
  state.turnPhase = 'LOCATION_ACTION';
  const destDef = getLocationDefinition(mapped);
  state.lastDiceRoll = {
    id: `roll-${state.turnNumber}-${nowMs}`,
    round: state.round,
    atMs: nowMs,
    playerId: actor.playerId,
    displayName: actor.displayName,
    kind: 'move',
    d6,
    d4,
    total: effectiveTotal,
    rerollRequired: false,
    freeChoice: false,
    resolvedLocation: mapped,
  };
  appendPublicLog(
    state,
    isTimeoutFallback ? 'timeout' : delta !== 0 ? 'skill' : 'move',
    isTimeoutFallback
      ? `⏱️ Fea (${actor.displayName}) quá hạn Chỉnh Phục — giữ nguyên ${d6} + ${d4} = ${effectiveTotal} → tới Ô ${destDef.diceLabel} (${destDef.name}).`
      : delta !== 0
        ? `🚶✨ Fea (${actor.displayName}) — Chỉnh Phục (${deltaLabel}) → di chuyển tới Ô ${destDef.diceLabel} (${destDef.name}).`
        : `🚶 ${actor.displayName} tung ${d6} + ${d4} = ${effectiveTotal} → di chuyển tới Ô ${destDef.diceLabel} (${destDef.name}).`,
    nowMs,
    actor.playerId,
  );
}

/**
 * Xử lý tung xúc xắc di chuyển trong chế độ mở rộng:
 * Hỗ trợ Fea (`exp1_fea`) điều chỉnh tổng xúc xắc +/-1 (trong biên [2..10], không sinh thêm RNG, không đứng yên bất hợp lệ).
 */
export function applyExpandedDiceRollMove(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  nowMs: number,
  callbacks: TurnContinuationCallbacks,
): EngineActionResult {
  if (state.turnPhase !== 'ROLL_MOVE') {
    return { ok: false, error: 'Hiện không ở pha tung xúc xắc di chuyển.' };
  }

  const movePayload: Record<string, unknown> = { phase: 'dice_move_adjust' };
  EXPANSION_SKILL_ENGINE.dispatch(state, {
    trigger: 'ON_MOVE',
    actorPlayerId: actor.playerId,
    nowMs,
    payload: movePayload,
  });

  if (movePayload.feaCanAdjust !== true) {
    const res = resolveDiceRollMove(state, actor, nowMs);
    if (res.ok) {
      callbacks.finalizeIfFinished(state, nowMs);
    }
    return res;
  }

  const d6 = rollD6(state);
  const d4 = rollD4(state);
  const rawTotal = d6 + d4;

  const options: BoardGameChoiceOptionView[] = [];
  const deltaByOptionId: Record<string, -1 | 0 | 1> = {};
  const candidates: readonly (-1 | 0 | 1)[] = [-1, 0, 1];

  const describeTotalDest = (tot: number): string => {
    const m = resolveLocationForDiceTotal(tot);
    if (m === 'choose-any') return 'Tổng 7 — Tự chọn khu vực bất kỳ';
    const def = getLocationDefinition(m);
    if (m === actor.location) return `Ô ${def.diceLabel} (${def.name} · Trùng ô → Đổ lại)`;
    return `Ô ${def.diceLabel} (${def.name})`;
  };

  for (const delta of candidates) {
    const adjTotal = rawTotal + delta;
    if (adjTotal < 2 || adjTotal > 10) continue;
    const mapped = resolveLocationForDiceTotal(adjTotal);
    // Không cho phép chủ động chỉnh (+/-1) sang tổng vẫn đứng yên tại chính ô hiện tại
    if (delta !== 0 && mapped !== 'choose-any' && mapped === actor.location) continue;
    const optId = delta === -1 ? 'adj_minus' : delta === 1 ? 'adj_plus' : 'adj_0';
    deltaByOptionId[optId] = delta;
    options.push({
      optionId: optId,
      label:
        delta === 0
          ? `Giữ nguyên: ${rawTotal} → ${describeTotalDest(rawTotal)}`
          : `${delta > 0 ? '+1 nút' : '-1 nút'}: ${rawTotal} → ${adjTotal} (${describeTotalDest(adjTotal)})`,
      detail:
        delta === 0
          ? `Áp dụng đúng kết quả tung ${d6} + ${d4} = ${rawTotal}.`
          : `Dùng Chỉnh Phục (Fea) đổi tổng thành ${adjTotal}.`,
    });
  }

  // Nếu mọi phương án +/-1 đều ngoài biên hoặc trùng ô hiện tại (vd. đứng radio & tung 2) -> xử lý thẳng không cần mở choice!
  if (options.length <= 1) {
    commitFeaMovementTotal(state, actor, d6, d4, rawTotal, 0, nowMs, false);
    callbacks.finalizeIfFinished(state, nowMs);
    return { ok: true };
  }

  const choiceId = nextExpansionEventId(state, 'choice-fea');
  const eventId = nextExpansionEventId(state, 'ev-fea');
  const timeoutMs = getChoiceTimeoutMs(state, actor);
  state.pendingChoice = {
    choiceId,
    eventId,
    ownerPlayerId: actor.playerId,
    kind: 'fea_move_adjust',
    isSecret: false,
    title: 'Chỉnh Phục (Fea)',
    description: `Bạn tung được ${d6} + ${d4} = ${rawTotal}. Chọn giữ nguyên hoặc điều chỉnh +/-1 nút trong khoảng [2..10] (hết giờ tự giữ nguyên ${rawTotal}).`,
    publicPromptLabel: `🎲 Fea (${actor.displayName}) tung ${d6}+${d4}=${rawTotal} — đang chọn Chỉnh Phục (+/-1)...`,
    options,
    defaultOptionId: 'adj_0',
    createdAtMs: nowMs,
    deadlineMs: nowMs + timeoutMs,
    data: {
      kind: 'fea_move_adjust',
      actorPlayerId: actor.playerId,
      d6,
      d4,
      rawTotal,
      deltaByOptionId,
    },
  };
  appendPublicLog(
    state,
    'dice',
    `🎲 Fea (${actor.displayName}) tung ${d6} + ${d4} = ${rawTotal} — đang chọn giữ nguyên hoặc Chỉnh Phục (+/-1)!`,
    nowMs,
    actor.playerId,
  );
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Expanded Draw Card Entrypoint (Felicia / Gloria / Cruz)
// ---------------------------------------------------------------------------

function getDeckLabel(deckId: BoardGameDeckId): string {
  return deckId === 'investigation'
    ? 'Khám Phá (Xanh)'
    : deckId === 'equipment'
      ? 'Cung Ứng (Trắng)'
      : 'Đột Kích (Đen)';
}

export function hasGloriaQueuedCards(
  state: AuthoritativeGameState,
  playerId: string,
): boolean {
  const q = state.expansionState?.gloriaQueuedCards;
  return Array.isArray(q) && q.some((entry) => entry.playerId === playerId);
}

export function discardGloriaQueuedCards(
  state: AuthoritativeGameState,
  playerId: string,
): void {
  const q = state.expansionState?.gloriaQueuedCards;
  if (!Array.isArray(q) || q.length === 0) return;
  for (let i = q.length - 1; i >= 0; i--) {
    if (q[i].playerId === playerId) {
      discardCardId(state, q[i].cardId);
      q.splice(i, 1);
    }
  }
}

export function deliverNextGloriaQueuedCard(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  nowMs: number,
): boolean {
  if (!actor.alive || actor.hand.length > 0) return false;
  const q = state.expansionState?.gloriaQueuedCards;
  if (!Array.isArray(q) || q.length === 0) return false;
  const idx = q.findIndex((entry) => entry.playerId === actor.playerId);
  if (idx < 0) return false;

  const [entry] = q.splice(idx, 1);
  const card = getCardById(entry.cardId);
  if (!card) return false;

  if (!card.isConsumable && card.deck !== 'investigation') {
    equipToPlayerSlot(actor, card.id);
    appendPublicLog(
      state,
      'equipment',
      `✨ Gloria (${actor.displayName}) — Phước Lành Mạnh Mẽ (Lá #2): tự động trang bị "${card.title}"!`,
      nowMs,
      actor.playerId,
    );
    return true;
  }

  if (actor.hand.length >= BOARD_GAME_MAX_HAND) {
    const dropped = actor.hand.shift();
    if (dropped) discardCardId(state, dropped);
  }
  actor.hand.push(card.id);
  appendPublicLog(
    state,
    'draw',
    `✨ Gloria (${actor.displayName}) — Phước Lành Mạnh Mẽ (Lá #2): nhận lá Cung Ứng thứ 2 để giải quyết tuần tự!`,
    nowMs,
    actor.playerId,
  );
  return true;
}

export function applyExpandedDrawLocationCard(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  deckId: BoardGameDeckId,
  nowMs: number,
  callbacks: TurnContinuationCallbacks,
): EngineActionResult {
  if (state.turnPhase !== 'LOCATION_ACTION') {
    return { ok: false, error: 'Không ở pha hành động khu vực để rút bài.' };
  }
  const loc = getLocationDefinition(actor.location);
  if (loc.deckHint === 'power-9' || loc.deckHint === 'power-10') {
    return { ok: false, error: `${loc.name} dùng quyền năng đặc biệt, không rút bài ở đây.` };
  }
  if (loc.deckHint !== 'any' && loc.deckHint !== deckId) {
    return { ok: false, error: `${loc.name} chỉ cho phép rút chồng bài tương ứng.` };
  }

  const movementDrawEventId = `loc-draw-${state.turnNumber}-${actor.playerId}`;
  const drawPayload: Record<string, unknown> = {
    deckId,
    isLocationDraw: true,
    isRecursiveDraw: hasProcessedExpansionEvent(state, movementDrawEventId),
    movementDrawEventId,
  };
  EXPANSION_SKILL_ENGINE.dispatch(state, {
    trigger: 'ON_DRAW_CARD',
    actorPlayerId: actor.playerId,
    nowMs,
    payload: drawPayload,
  });

  // Gloria (Phước Lành Mạnh Mẽ — Phase 3A house rule):
  // Đã lật vai + đi vào chính xác `lobby` (Church) + rút thẻ Trắng ('equipment') -> rút 2 thẻ tuần tự!
  if (drawPayload.gloriaDoubleDraw === true) {
    markExpansionEventProcessed(state, movementDrawEventId);
    const exp = ensureExpansionState(state);
    if (!Array.isArray(exp.gloriaQueuedCards)) {
      exp.gloriaQueuedCards = [];
    }
    const deckLabel = getDeckLabel(deckId);
    const card0 = takeOneCardFromDeck(state, deckId);
    const card1 = takeOneCardFromDeck(state, deckId);
    state.turnPhase = 'MAIN_ACTION';

    if (!card0) {
      appendPublicLog(
        state,
        'draw',
        `✨ Gloria (${actor.displayName}) — Phước Lành Mạnh Mẽ: chồng bài ${deckLabel} đã cạn lá rảnh — bước vào pha Hành động chính.`,
        nowMs,
        actor.playerId,
      );
      callbacks.finalizeIfFinished(state, nowMs);
      return { ok: true };
    }

    incRoleStat(exp.stats.activationsByRole, 'exp2_gloria', 1);

    const resolveGloriaSingle = (card: NonNullable<typeof card0>, label: string): boolean => {
      if (!card.isConsumable && card.deck !== 'investigation') {
        equipToPlayerSlot(actor, card.id);
        appendPublicLog(
          state,
          'equipment',
          `✨ Gloria (${actor.displayName}) — Phước Lành Mạnh Mẽ (${label}): rút & trang bị "${card.title}" tại ${loc.name}!`,
          nowMs,
          actor.playerId,
        );
        return false; // không cần chờ USE_CARD
      }
      if (actor.hand.length >= BOARD_GAME_MAX_HAND) {
        const dropped = actor.hand.shift();
        if (dropped) discardCardId(state, dropped);
      }
      actor.hand.push(card.id);
      appendPublicLog(
        state,
        'draw',
        `✨ Gloria (${actor.displayName}) — Phước Lành Mạnh Mẽ (${label}): rút thẻ ${deckLabel} tại ${loc.name} (cần giải quyết trước khi tiếp tục).`,
        nowMs,
        actor.playerId,
      );
      return true; // cần giải quyết qua USE_CARD
    };

    const card0NeedsHandResolution = resolveGloriaSingle(card0, card1 ? 'Lá #1/2' : 'Lá duy nhất còn lại');
    if (card1) {
      if (card0NeedsHandResolution) {
        // Không thực hiện đồng thời 2 immediate effects: lưu Lá #2 vào hàng đợi authoritative trong expansionState!
        exp.gloriaQueuedCards.push({
          playerId: actor.playerId,
          cardId: card1.id,
          movementEventId: movementDrawEventId,
        });
      } else {
        resolveGloriaSingle(card1, 'Lá #2/2');
      }
    }

    callbacks.finalizeIfFinished(state, nowMs);
    return { ok: true };
  }

  // Cruz (Chúa Tể Thẻ Đen — Phase 4B house rule):
  // Đã lật vai + rút thẻ Đen ('event'): xem lá đầu tiên, chọn giữ hoặc đặt xuống ĐÁY chồng Đột Kích & rút 1 lá thay thế (tối đa 1 lần/lần rút).
  if (drawPayload.cruzBlackRedraw === true) {
    markExpansionEventProcessed(state, movementDrawEventId);
    const deckLabel = getDeckLabel('event');
    const card0 = takeOneCardFromDeck(state, 'event');
    if (!card0) {
      state.turnPhase = 'MAIN_ACTION';
      appendPublicLog(
        state,
        'draw',
        `🃏 Chồng bài ${deckLabel} đã cạn lá rảnh — ${actor.displayName} bước vào pha Hành động chính.`,
        nowMs,
        actor.playerId,
      );
      callbacks.finalizeIfFinished(state, nowMs);
      return { ok: true };
    }

    const hasReplacement = state.decks.event.length + state.discards.event.length > 0;
    if (!hasReplacement) {
      if (!card0.isConsumable && card0.deck !== 'investigation') {
        equipToPlayerSlot(actor, card0.id);
        state.turnPhase = 'MAIN_ACTION';
        appendPublicLog(
          state,
          'equipment',
          `🎒 Cruz (${actor.displayName}) rút lá cuối từ ${deckLabel} tại ${loc.name} và trang bị ngay "${card0.title}"!`,
          nowMs,
          actor.playerId,
        );
      } else {
        if (actor.hand.length >= BOARD_GAME_MAX_HAND) {
          const dropped = actor.hand.shift();
          if (dropped) discardCardId(state, dropped);
        }
        actor.hand.push(card0.id);
        state.turnPhase = 'MAIN_ACTION';
        appendPublicLog(
          state,
          'draw',
          `🃏 Cruz (${actor.displayName}) rút lá duy nhất còn lại của ${deckLabel} tại ${loc.name} (cần giải quyết trong lượt).`,
          nowMs,
          actor.playerId,
        );
      }
      callbacks.finalizeIfFinished(state, nowMs);
      return { ok: true };
    }

    const choiceId = nextExpansionEventId(state, 'choice-cruz');
    const eventId = nextExpansionEventId(state, 'ev-cruz');
    const timeoutMs = getChoiceTimeoutMs(state, actor);
    const options: BoardGameChoiceOptionView[] = [
      {
        optionId: 'keep',
        label: `Giữ lá vừa rút: ${card0.title}`,
        detail: card0.summary,
        card: toCardPublicMeta(card0),
      },
      {
        optionId: 'redraw',
        label: 'Đặt xuống đáy chồng bài Đen & Rút 1 lá khác',
        detail: 'Đưa lá vừa rút xuống đáy chồng Đột Kích và rút 1 lá thay thế (tối đa 1 lần đổi).',
      },
    ];

    state.pendingChoice = {
      choiceId,
      eventId,
      ownerPlayerId: actor.playerId,
      kind: 'cruz_black_redraw',
      isSecret: false,
      title: 'Đổi Thẻ Đột Kích (Cruz)',
      description: `Bạn vừa rút "${card0.title}" từ chồng ${deckLabel}. Chọn giữ lại để giải quyết hoặc đặt xuống đáy chồng bài và rút 1 lá thay thế (hết giờ tự giữ lá đầu).`,
      publicPromptLabel: `🃏 Cruz (${actor.displayName}) đang cân nhắc giữ hay đổi thẻ Đột Kích...`,
      options,
      defaultOptionId: 'keep',
      createdAtMs: nowMs,
      deadlineMs: nowMs + timeoutMs,
      data: {
        kind: 'cruz_black_redraw',
        actorPlayerId: actor.playerId,
        drawnCardId: card0.id,
      },
    };
    // BẢO MẬT P0: Log công khai KHÔNG lộ tên thẻ Cruz đang cân nhắc đổi!
    appendPublicLog(
      state,
      'draw',
      `🃏 Cruz (${actor.displayName}) rút 1 thẻ ${deckLabel} tại ${loc.name} — đang cân nhắc giữ hay đặt đáy rút lại!`,
      nowMs,
      actor.playerId,
    );
    return { ok: true };
  }

  if (drawPayload.feliciaDoubleDraw !== true) {
    const res = resolveDrawLocationCard(state, actor, deckId, nowMs);
    if (res.ok) {
      callbacks.finalizeIfFinished(state, nowMs);
    }
    return res;
  }

  const deckLabel = getDeckLabel(deckId);
  const card0 = takeOneCardFromDeck(state, deckId);
  const card1 = takeOneCardFromDeck(state, deckId);

  if (!card0) {
    state.turnPhase = 'MAIN_ACTION';
    appendPublicLog(
      state,
      'draw',
      `🃏 Chồng bài ${deckLabel} đã cạn lá rảnh — ${actor.displayName} bước vào pha Hành động chính.`,
      nowMs,
      actor.playerId,
    );
    callbacks.finalizeIfFinished(state, nowMs);
    return { ok: true };
  }

  if (!card1) {
    // Chỉ còn đúng 1 lá trong cả bộ bài + chồng bỏ -> áp dụng như rút thường, không treo choice!
    if (!card0.isConsumable && card0.deck !== 'investigation') {
      equipToPlayerSlot(actor, card0.id);
      state.turnPhase = 'MAIN_ACTION';
      appendPublicLog(
        state,
        'equipment',
        `🎒 Felicia (${actor.displayName}) rút lá cuối từ ${deckLabel} tại ${loc.name} và trang bị ngay "${card0.title}"!`,
        nowMs,
        actor.playerId,
      );
    } else {
      if (actor.hand.length >= BOARD_GAME_MAX_HAND) {
        const dropped = actor.hand.shift();
        if (dropped) discardCardId(state, dropped);
      }
      actor.hand.push(card0.id);
      state.turnPhase = 'MAIN_ACTION';
      appendPublicLog(
        state,
        'draw',
        `🃏 Felicia (${actor.displayName}) rút lá duy nhất còn lại của ${deckLabel} tại ${loc.name} (cần giải quyết trong lượt).`,
        nowMs,
        actor.playerId,
      );
    }
    callbacks.finalizeIfFinished(state, nowMs);
    return { ok: true };
  }

  const exp = ensureExpansionState(state);
  incRoleStat(exp.stats.activationsByRole, 'exp1_felicia', 1);

  const choiceId = nextExpansionEventId(state, 'choice-felicia');
  const eventId = nextExpansionEventId(state, 'ev-felicia');
  const timeoutMs = getChoiceTimeoutMs(state, actor);
  const options: BoardGameChoiceOptionView[] = [card0, card1].map((card, idx) => ({
    optionId: `pick_${idx}`,
    label: `Giữ lá #${idx + 1}: ${card.title}`,
    detail: card.summary,
    card: toCardPublicMeta(card),
  }));

  state.pendingChoice = {
    choiceId,
    eventId,
    ownerPlayerId: actor.playerId,
    kind: 'felicia_draw_choice',
    isSecret: false,
    title: `Tháo Vát (Felicia) — ${deckLabel}`,
    description: `Bạn đã rút 2 thẻ từ ${deckLabel} (chỉ mình bạn thấy). Chọn 1 lá để giữ, lá còn lại hủy vào chồng bỏ (hết giờ tự giữ Lá #1).`,
    publicPromptLabel: `🃏 Felicia (${actor.displayName}) đang chọn giữ 1 trong 2 thẻ ${deckLabel}...`,
    options,
    defaultOptionId: 'pick_0',
    createdAtMs: nowMs,
    deadlineMs: nowMs + timeoutMs,
    data: {
      kind: 'felicia_draw_choice',
      actorPlayerId: actor.playerId,
      deckId,
      cardIds: [card0.id, card1.id],
    },
  };

  // BẢO MẬT P0: Log công khai tuyệt đối KHÔNG tiết lộ tên 2 lá bài Felicia vừa rút!
  appendPublicLog(
    state,
    'draw',
    `🃏 Felicia (${actor.displayName}) — Tháo Vát: rút 2 thẻ ${deckLabel} tại ${loc.name}, đang chọn giữ 1 lá (hủy 1 lá)!`,
    nowMs,
    actor.playerId,
  );
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Expanded Non-Attack Damage Entrypoints (Location / Card / Skill / Investigate)
// ---------------------------------------------------------------------------

export function applyExpandedLocationPower(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  targetPlayerId: string | undefined,
  mode: 'heal' | 'damage' | 'steal' | undefined,
  nowMs: number,
  callbacks: TurnContinuationCallbacks,
  equipCardId?: string,
): EngineActionResult {
  if (state.turnPhase !== 'LOCATION_ACTION') {
    return { ok: false, error: 'Không ở pha hành động khu vực.' };
  }

  if (actor.location === 'corridor') {
    const target = targetPlayerId ? state.players[targetPlayerId] : actor;
    if (!target || !target.alive) {
      return { ok: false, error: 'Mục tiêu Hành Lang (9) không hợp lệ hoặc đã bị loại.' };
    }
    const chosenMode =
      mode === 'damage'
        ? 'damage'
        : mode === 'heal'
          ? 'heal'
          : target.playerId === actor.playerId
            ? 'heal'
            : 'damage';
    if (chosenMode === 'damage' && target.playerId === actor.playerId) {
      return { ok: false, error: 'Không thể tự gây sát thương lên chính mình tại Hành Lang (9).' };
    }
    state.turnPhase = 'MAIN_ACTION';
    if (chosenMode === 'heal') {
      const exp = ensureExpansionState(state);
      exp.pendingSteps.push(
        {
          kind: 'HEAL',
          healEventId: nextExpansionEventId(state, 'heal-loc'),
          actorPlayerId: actor.playerId,
          targetPlayerId: target.playerId,
          rawAmount: 1,
          sourceKind: 'location',
          sourceLabel: 'Hành Lang (9)',
          postLogKind: 'equipment',
          postLogPrefix: `💚 ${actor.displayName} dùng Hành Lang (9): hồi `,
          postLogSuffix: ` thương tích cho ${target.displayName}.`,
          postLogActorId: actor.playerId,
        },
        {
          kind: 'FINISH_ACTION',
          actorPlayerId: actor.playerId,
          autoEndTurnMode: 'never',
        },
      );
      drainPendingSteps(state, nowMs, callbacks);
      return { ok: true };
    }

    const exp = ensureExpansionState(state);
    exp.pendingSteps.push(
      {
        kind: 'DAMAGE',
        damageEventId: nextExpansionEventId(state, 'dmg'),
        targetPlayerId: target.playerId,
        rawAmount: 2,
        sourceType: 'location',
        attackerPlayerId: actor.playerId,
        isSingleTarget: true,
        postLogKind: 'event',
        postLogPrefix: `⚡ ${actor.displayName} kích hoạt Hành Lang (9): ${target.displayName} chịu `,
        postLogSuffix: ' sát thương!',
        postLogActorId: actor.playerId,
      },
      {
        kind: 'FINISH_ACTION',
        actorPlayerId: actor.playerId,
        autoEndTurnMode: 'never',
      },
    );
    drainPendingSteps(state, nowMs, callbacks);
    return { ok: true };
  }

  if (actor.location === 'court') {
    if (!targetPlayerId) {
      return {
        ok: false,
        error: 'Hãy chọn 1 người chơi đang đeo Trang bị để cướp, hoặc Bỏ qua khu vực.',
      };
    }
    const victim = state.players[targetPlayerId];
    if (!victim || !victim.alive || victim.playerId === actor.playerId) {
      return { ok: false, error: 'Mục tiêu Sân Bóng (10) không hợp lệ.' };
    }
    if (victim.equipped.length === 0) {
      return { ok: false, error: `${victim.displayName} chưa đeo Trang bị nào để cướp.` };
    }
    const stolen = stealOneEquippedGear(state, actor, victim, equipCardId);
    if (stolen) {
      appendPublicLog(
        state,
        'steal',
        `🧤 ${actor.displayName} dùng Sân Bóng (10): cướp "${stolen.title}" từ ${victim.displayName}!`,
        nowMs,
        actor.playerId,
      );
    }
    state.turnPhase = 'MAIN_ACTION';
    callbacks.finalizeIfFinished(state, nowMs);
    return { ok: true };
  }

  return { ok: false, error: 'Khu vực hiện tại dùng hành động rút bài, không phải quyền năng đặc biệt.' };
}

export function applyExpandedUseCard(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  cardId: string,
  targetPlayerId: string | undefined,
  targetLocation: Parameters<typeof resolveUseCard>[4],
  nowMs: number,
  callbacks: TurnContinuationCallbacks,
  equipCardId?: string,
  skipEffect?: boolean,
): EngineActionResult {
  const card = getCardById(cardId);
  const handledInExpandedCardPipeline = Boolean(
    card &&
      (card.effectKind === 'eq_holy_water' ||
        card.effectKind === 'eq_blessing' ||
        card.effectKind === 'eq_first_aid' ||
        card.effectKind === 'eq_mirror' ||
        card.effectKind === 'eq_advent' ||
        card.effectKind === 'eq_chocolate' ||
        card.effectKind === 'ev_diabolic_ritual' ||
        card.effectKind === 'eq_flare' ||
        card.effectKind === 'ev_vampire_bat' ||
        card.effectKind === 'ev_spider' ||
        card.effectKind === 'ev_dynamite' ||
        card.effectKind === 'ev_spiritual_doll' ||
        card.effectKind === 'ev_banana_peel'),
  );
  if (!card || !handledInExpandedCardPipeline) {
    const res = resolveUseCard(
      state,
      actor,
      cardId,
      targetPlayerId,
      targetLocation,
      nowMs,
      equipCardId,
      skipEffect,
    );
    if (res.ok) {
      deliverNextGloriaQueuedCard(state, actor, nowMs);
      callbacks.finalizeIfFinished(state, nowMs);
    }
    return res;
  }

  if (state.turnPhase !== 'LOCATION_ACTION' && state.turnPhase !== 'MAIN_ACTION') {
    return { ok: false, error: 'Hãy tung xúc xắc di chuyển trước khi dùng thẻ Hành động.' };
  }
  const idx = actor.hand.indexOf(cardId);
  if (idx === -1) {
    return { ok: false, error: 'Không có thẻ này trên tay.' };
  }

  const exp = ensureExpansionState(state);

  switch (card.effectKind) {
    case 'eq_holy_water': {
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      exp.pendingSteps.push(
        {
          kind: 'HEAL',
          healEventId: nextExpansionEventId(state, 'heal-card'),
          sourceCardId: card.id,
          actorPlayerId: actor.playerId,
          targetPlayerId: actor.playerId,
          rawAmount: 2,
          sourceKind: 'white-card',
          sourceLabel: card.title,
          postLogKind: 'equipment',
          postLogPrefix: `💧 ${actor.displayName} uống "${card.title}": tự hồi `,
          postLogSuffix: ' thương tích.',
          postLogActorId: actor.playerId,
        },
        {
          kind: 'FINISH_ACTION',
          actorPlayerId: actor.playerId,
          autoEndTurnMode: 'never',
        },
      );
      drainPendingSteps(state, nowMs, callbacks);
      return { ok: true };
    }

    case 'eq_blessing': {
      const target = targetPlayerId ? state.players[targetPlayerId] : null;
      if (!target || !target.alive || target.playerId === actor.playerId) {
        return { ok: false, error: 'Lời Chúc Cứu Viện yêu cầu chọn 1 người chơi KHÁC còn sống.' };
      }
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      const roll = rollD6(state);
      exp.pendingSteps.push(
        {
          kind: 'HEAL',
          healEventId: nextExpansionEventId(state, 'heal-card'),
          sourceCardId: card.id,
          actorPlayerId: actor.playerId,
          targetPlayerId: target.playerId,
          rawAmount: roll,
          sourceKind: 'white-card',
          sourceLabel: card.title,
          postLogKind: 'equipment',
          postLogPrefix: `✨ ${actor.displayName} dùng "${card.title}" cho ${target.displayName} (tung 1d6=${roll}) → hồi `,
          postLogSuffix: ' thương tích!',
          postLogActorId: actor.playerId,
        },
        {
          kind: 'FINISH_ACTION',
          actorPlayerId: actor.playerId,
          autoEndTurnMode: 'never',
        },
      );
      drainPendingSteps(state, nowMs, callbacks);
      return { ok: true };
    }

    case 'eq_first_aid': {
      const target = targetPlayerId ? state.players[targetPlayerId] : actor;
      if (!target || !target.alive) {
        return { ok: false, error: 'Mục tiêu Sơ Cứu Mốc 7 không hợp lệ.' };
      }
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      const prevWounds = target.woundsTaken;
      const targetWounds = Math.min(target.maxHp - 1, 7);
      if (prevWounds > targetWounds) {
        // Giảm thương tích -> định tuyến qua CAP-04 HealPipeline (White card heal!)
        exp.pendingSteps.push(
          {
            kind: 'HEAL',
            healEventId: nextExpansionEventId(state, 'heal-card'),
            sourceCardId: card.id,
            actorPlayerId: actor.playerId,
            targetPlayerId: target.playerId,
            rawAmount: prevWounds - targetWounds,
            sourceKind: 'white-card',
            sourceLabel: card.title,
            postLogKind: 'equipment',
            postLogPrefix: `🩺 ${actor.displayName} dùng "${card.title}" lên ${target.displayName}: hồi `,
            postLogSuffix: ` thương tích (mốc 7 vết)!`,
            postLogActorId: actor.playerId,
          },
          {
            kind: 'FINISH_ACTION',
            actorPlayerId: actor.playerId,
            autoEndTurnMode: 'never',
          },
        );
        drainPendingSteps(state, nowMs, callbacks);
        return { ok: true };
      }
      target.woundsTaken = targetWounds;
      target.hp = target.maxHp - target.woundsTaken;
      appendPublicLog(
        state,
        'equipment',
        `🩺 ${actor.displayName} dùng "${card.title}" lên ${target.displayName}: thương tích chuyển từ ${prevWounds} → ${target.woundsTaken}!`,
        nowMs,
        actor.playerId,
      );
      deliverNextGloriaQueuedCard(state, actor, nowMs);
      callbacks.finalizeIfFinished(state, nowMs);
      return { ok: true };
    }

    case 'eq_mirror': {
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      if (
        actor.faction === 'mist-order' &&
        actor.roleId !== 'suong-tin-gia' &&
        !actor.revealed
      ) {
        revealPlayerNow(state, actor, 'voluntary', nowMs);
        const role = getRoleDesign(actor.roleId);
        appendPublicLog(
          state,
          'reveal',
          `🪞 ${actor.displayName} soi "${card.title}" và buộc phải lộ diện: ${role.name} (${FACTION_LABELS[actor.faction]})!`,
          nowMs,
          actor.playerId,
        );
        enqueueRoleRevealedTrigger(state, actor.playerId, 'forced-card', 0);
        exp.pendingSteps.push({
          kind: 'FINISH_ACTION',
          actorPlayerId: actor.playerId,
          autoEndTurnMode: 'never',
        });
        drainPendingSteps(state, nowMs, callbacks);
        return { ok: true };
      }
      appendPublicLog(
        state,
        'equipment',
        `🪞 ${actor.displayName} soi "${card.title}" — không có phản ứng lộ diện.`,
        nowMs,
        actor.playerId,
      );
      deliverNextGloriaQueuedCard(state, actor, nowMs);
      callbacks.finalizeIfFinished(state, nowMs);
      return { ok: true };
    }

    case 'eq_advent': {
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      if (!skipEffect && actor.faction === 'lantern-guard') {
        const justRevealed = revealPlayerNow(state, actor, 'voluntary', nowMs);
        if (justRevealed) {
          enqueueRoleRevealedTrigger(state, actor.playerId, 'voluntary', 0);
        }
        exp.pendingSteps.push(
          {
            kind: 'HEAL',
            healEventId: nextExpansionEventId(state, 'heal-card'),
            sourceCardId: card.id,
            actorPlayerId: actor.playerId,
            targetPlayerId: actor.playerId,
            rawAmount: actor.woundsTaken,
            sourceKind: 'white-card',
            sourceLabel: card.title,
            postLogKind: 'reveal',
            postLogPrefix: `🔦 ${actor.displayName} kích hoạt "${card.title}" (Đội Săn Đêm): lộ vai & hồi sạch `,
            postLogSuffix: ' thương tích về 0!',
            postLogActorId: actor.playerId,
          },
          {
            kind: 'FINISH_ACTION',
            actorPlayerId: actor.playerId,
            autoEndTurnMode: 'never',
          },
        );
        drainPendingSteps(state, nowMs, callbacks);
        return { ok: true };
      }
      appendPublicLog(
        state,
        'equipment',
        `🃏 ${actor.displayName} bỏ qua "${card.title}" (giữ kín / không kích hoạt).`,
        nowMs,
        actor.playerId,
      );
      deliverNextGloriaQueuedCard(state, actor, nowMs);
      callbacks.finalizeIfFinished(state, nowMs);
      return { ok: true };
    }

    case 'eq_chocolate': {
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      const qualifies = isEligibleForChocolateHeal(actor.roleId, true);
      if (!skipEffect && qualifies) {
        const justRevealed = revealPlayerNow(state, actor, 'voluntary', nowMs);
        if (justRevealed) {
          enqueueRoleRevealedTrigger(state, actor.playerId, 'voluntary', 0);
        }
        exp.pendingSteps.push(
          {
            kind: 'HEAL',
            healEventId: nextExpansionEventId(state, 'heal-card'),
            sourceCardId: card.id,
            actorPlayerId: actor.playerId,
            targetPlayerId: actor.playerId,
            rawAmount: actor.woundsTaken,
            sourceKind: 'white-card',
            sourceLabel: card.title,
            postLogKind: 'reveal',
            postLogPrefix: `🍫 ${actor.displayName} dùng "${card.title}": lộ vai ${getRoleDesign(actor.roleId).name} & hồi sạch `,
            postLogSuffix: ' thương tích về 0!',
            postLogActorId: actor.playerId,
          },
          {
            kind: 'FINISH_ACTION',
            actorPlayerId: actor.playerId,
            autoEndTurnMode: 'never',
          },
        );
        drainPendingSteps(state, nowMs, callbacks);
        return { ok: true };
      }
      appendPublicLog(
        state,
        'equipment',
        `🍫 ${actor.displayName} đặt xuống "${card.title}" (không kích hoạt).`,
        nowMs,
        actor.playerId,
      );
      deliverNextGloriaQueuedCard(state, actor, nowMs);
      callbacks.finalizeIfFinished(state, nowMs);
      return { ok: true };
    }

    case 'ev_diabolic_ritual': {
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      if (!skipEffect && actor.faction === 'mist-order') {
        const justRevealed = revealPlayerNow(state, actor, 'voluntary', nowMs);
        if (justRevealed) {
          enqueueRoleRevealedTrigger(state, actor.playerId, 'voluntary', 0);
        }
        exp.pendingSteps.push(
          {
            kind: 'HEAL',
            healEventId: nextExpansionEventId(state, 'heal-card'),
            sourceCardId: card.id,
            actorPlayerId: actor.playerId,
            targetPlayerId: actor.playerId,
            rawAmount: actor.woundsTaken,
            sourceKind: 'black-card',
            sourceLabel: card.title,
            postLogKind: 'reveal',
            postLogPrefix: `🌑 ${actor.displayName} cử hành "${card.title}" (Hội Bóng Đêm): lộ vai & hồi sạch `,
            postLogSuffix: ' thương tích về 0!',
            postLogActorId: actor.playerId,
          },
          {
            kind: 'FINISH_ACTION',
            actorPlayerId: actor.playerId,
            autoEndTurnMode: 'never',
          },
        );
        drainPendingSteps(state, nowMs, callbacks);
        return { ok: true };
      }
      appendPublicLog(
        state,
        'equipment',
        `🌑 ${actor.displayName} gác lại "${card.title}" (giữ kín / không kích hoạt).`,
        nowMs,
        actor.playerId,
      );
      deliverNextGloriaQueuedCard(state, actor, nowMs);
      callbacks.finalizeIfFinished(state, nowMs);
      return { ok: true };
    }

    case 'eq_flare': {
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      const others = Object.values(state.players).filter(
        (p) => p.alive && p.playerId !== actor.playerId,
      );
      appendPublicLog(
        state,
        'event',
        `💥 ${actor.displayName} bắn "${card.title}": tất cả ${others.length} người chơi khác chịu 2 sát thương!`,
        nowMs,
        actor.playerId,
      );
      for (const other of others) {
        exp.pendingSteps.push({
          kind: 'DAMAGE',
          damageEventId: nextExpansionEventId(state, 'dmg'),
          sourceCardId: card.id,
          targetPlayerId: other.playerId,
          rawAmount: 2,
          sourceType: 'event',
          attackerPlayerId: actor.playerId,
          isSingleTarget: false,
        });
      }
      exp.pendingSteps.push({
        kind: 'FINISH_ACTION',
        actorPlayerId: actor.playerId,
        autoEndTurnMode: 'never',
      });
      drainPendingSteps(state, nowMs, callbacks);
      return { ok: true };
    }

    case 'ev_vampire_bat': {
      const target = targetPlayerId ? state.players[targetPlayerId] : null;
      if (!target || !target.alive || target.playerId === actor.playerId) {
        return { ok: false, error: 'Hãy chọn 1 người chơi khác để dùng Dơi Hút Điện.' };
      }
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      if (actor.roleId === 'exp2_cruz' && isCruzQualifyingCardId(card.id)) {
        if (!exp.cruzQualifyingCardTurnByPlayer) exp.cruzQualifyingCardTurnByPlayer = {};
        exp.cruzQualifyingCardTurnByPlayer[actor.playerId] = state.turnNumber;
      }
      exp.pendingSteps.push(
        {
          kind: 'DAMAGE',
          damageEventId: nextExpansionEventId(state, 'dmg'),
          sourceCardId: card.id,
          targetPlayerId: target.playerId,
          rawAmount: 2,
          sourceType: 'event',
          attackerPlayerId: actor.playerId,
          isTalismanWardable: true,
          isSingleTarget: true,
          isConsumableBlackCardDamage: isConsumableDamagingBlackCardId(card.id),
        },
        {
          kind: 'VAMPIRE_BAT_HEAL',
          actorPlayerId: actor.playerId,
          targetPlayerId: target.playerId,
          cardTitle: card.title,
          dealtToTarget: 0,
        },
        {
          kind: 'FINISH_ACTION',
          actorPlayerId: actor.playerId,
          autoEndTurnMode: 'never',
        },
      );
      drainPendingSteps(state, nowMs, callbacks);
      return { ok: true };
    }

    case 'ev_spider': {
      const target = targetPlayerId ? state.players[targetPlayerId] : null;
      if (!target || !target.alive || target.playerId === actor.playerId) {
        return { ok: false, error: 'Hãy chọn 1 người chơi khác để phóng Nhện Chập Mạch.' };
      }
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      if (actor.roleId === 'exp2_cruz' && isCruzQualifyingCardId(card.id)) {
        if (!exp.cruzQualifyingCardTurnByPlayer) exp.cruzQualifyingCardTurnByPlayer = {};
        exp.cruzQualifyingCardTurnByPlayer[actor.playerId] = state.turnNumber;
      }
      exp.pendingSteps.push(
        {
          kind: 'DAMAGE',
          damageEventId: nextExpansionEventId(state, 'dmg'),
          sourceCardId: card.id,
          targetPlayerId: target.playerId,
          rawAmount: 2,
          sourceType: 'event',
          attackerPlayerId: actor.playerId,
          isTalismanWardable: true,
          isSingleTarget: true,
          isConsumableBlackCardDamage: isConsumableDamagingBlackCardId(card.id),
        },
        {
          kind: 'SPIDER_SELF_DAMAGE',
          actorPlayerId: actor.playerId,
          targetPlayerId: target.playerId,
          cardTitle: card.title,
          dealtToTarget: 0,
        },
        {
          kind: 'FINISH_ACTION',
          actorPlayerId: actor.playerId,
          autoEndTurnMode: 'never',
        },
      );
      drainPendingSteps(state, nowMs, callbacks);
      return { ok: true };
    }

    case 'ev_dynamite': {
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      if (actor.roleId === 'exp2_cruz' && isCruzQualifyingCardId(card.id)) {
        if (!exp.cruzQualifyingCardTurnByPlayer) exp.cruzQualifyingCardTurnByPlayer = {};
        exp.cruzQualifyingCardTurnByPlayer[actor.playerId] = state.turnNumber;
      }
      const d6 = rollD6(state);
      const d4 = rollD4(state);
      const total = d6 + d4;
      const mapped = resolveLocationForDiceTotal(total);
      if (mapped === 'choose-any') {
        state.lastDiceRoll = {
          id: `dyn-${state.turnNumber}-${nowMs}`,
          round: state.round,
          atMs: nowMs,
          playerId: actor.playerId,
          displayName: actor.displayName,
          kind: 'attack',
          d6,
          d4,
          total,
          rerollRequired: false,
          freeChoice: false,
          resolvedLocation: null,
          damageDealt: 0,
        };
        appendPublicLog(
          state,
          'event',
          `🧨 ${actor.displayName} kích hoạt Kíp Nổ Tự Động (${d6}+${d4}=7) → BOM XỊT (0 sát thương)!`,
          nowMs,
          actor.playerId,
        );
        callbacks.finalizeIfFinished(state, nowMs);
        return { ok: true };
      }
      const zoneDef = getLocationDefinition(mapped);
      const victims = state.turnOrder
        .map((id) => state.players[id])
        .filter((p): p is AuthoritativePlayerState => Boolean(p && p.alive && p.location === mapped));
      state.lastDiceRoll = {
        id: `dyn-${state.turnNumber}-${nowMs}`,
        round: state.round,
        atMs: nowMs,
        playerId: actor.playerId,
        displayName: actor.displayName,
        kind: 'attack',
        d6,
        d4,
        total,
        rerollRequired: false,
        freeChoice: false,
        resolvedLocation: mapped,
        damageDealt: victims.length * 3,
      };
      appendPublicLog(
        state,
        'event',
        `🧨 ${actor.displayName} ném "${card.title}" (${d6}+${d4}=${total} → ${zoneDef.name}): ${victims.length} người dính vụ nổ 3 ST!`,
        nowMs,
        actor.playerId,
      );
      for (const v of victims) {
        exp.pendingSteps.push({
          kind: 'DAMAGE',
          damageEventId: nextExpansionEventId(state, 'dmg'),
          sourceCardId: card.id,
          targetPlayerId: v.playerId,
          rawAmount: 3,
          sourceType: 'event',
          attackerPlayerId: actor.playerId,
          isTalismanWardable: true,
          isSingleTarget: false,
          isConsumableBlackCardDamage: isConsumableDamagingBlackCardId(card.id),
        });
      }
      exp.pendingSteps.push({
        kind: 'FINISH_ACTION',
        actorPlayerId: actor.playerId,
        autoEndTurnMode: 'never',
      });
      drainPendingSteps(state, nowMs, callbacks);
      return { ok: true };
    }

    case 'ev_spiritual_doll': {
      const target = targetPlayerId ? state.players[targetPlayerId] : null;
      if (!target || !target.alive || target.playerId === actor.playerId) {
        return { ok: false, error: 'Hãy chọn 1 người chơi khác cho Búp Bê Tâm Linh.' };
      }
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      if (actor.roleId === 'exp2_cruz' && isCruzQualifyingCardId(card.id)) {
        if (!exp.cruzQualifyingCardTurnByPlayer) exp.cruzQualifyingCardTurnByPlayer = {};
        exp.cruzQualifyingCardTurnByPlayer[actor.playerId] = state.turnNumber;
      }
      const d6 = rollD6(state);
      if (d6 <= 4) {
        exp.pendingSteps.push({
          kind: 'DAMAGE',
          damageEventId: nextExpansionEventId(state, 'dmg'),
          sourceCardId: card.id,
          targetPlayerId: target.playerId,
          rawAmount: 3,
          sourceType: 'event',
          attackerPlayerId: actor.playerId,
          isSingleTarget: true,
          isConsumableBlackCardDamage: isConsumableDamagingBlackCardId(card.id),
          postLogKind: 'event',
          postLogPrefix: `🪆 ${actor.displayName} gieo "${card.title}" (1d6=${d6}) → ${target.displayName} chịu `,
          postLogSuffix: ' ST!',
          postLogActorId: actor.playerId,
        });
      } else {
        exp.pendingSteps.push({
          kind: 'DAMAGE',
          damageEventId: nextExpansionEventId(state, 'dmg'),
          sourceCardId: card.id,
          targetPlayerId: actor.playerId,
          rawAmount: 3,
          sourceType: 'event',
          attackerPlayerId: null,
          isSingleTarget: true,
          isConsumableBlackCardDamage: isConsumableDamagingBlackCardId(card.id),
          postLogKind: 'event',
          postLogPrefix: `🪆 ${actor.displayName} gieo "${card.title}" (1d6=${d6}) → PHẢN TÁC DỤNG! ${actor.displayName} tự chịu `,
          postLogSuffix: ' ST!',
          postLogActorId: actor.playerId,
        });
      }
      exp.pendingSteps.push({
        kind: 'FINISH_ACTION',
        actorPlayerId: actor.playerId,
        autoEndTurnMode: 'never',
      });
      drainPendingSteps(state, nowMs, callbacks);
      return { ok: true };
    }

    case 'ev_banana_peel': {
      if (actor.equipped.length > 0) {
        return resolveUseCard(
          state,
          actor,
          cardId,
          targetPlayerId,
          targetLocation,
          nowMs,
          equipCardId,
          skipEffect,
        );
      }
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      exp.pendingSteps.push(
        {
          kind: 'DAMAGE',
          damageEventId: nextExpansionEventId(state, 'dmg'),
          sourceCardId: card.id,
          targetPlayerId: actor.playerId,
          rawAmount: 1,
          sourceType: 'event',
          attackerPlayerId: null,
          isSingleTarget: true,
          isConsumableBlackCardDamage: isConsumableDamagingBlackCardId(card.id),
          postLogKind: 'event',
          postLogPrefix: `🍌 ${actor.displayName} trượt "${card.title}" (không có Trang bị để giao) → tự chịu `,
          postLogSuffix: ' ST!',
          postLogActorId: actor.playerId,
        },
        {
          kind: 'FINISH_ACTION',
          actorPlayerId: actor.playerId,
          autoEndTurnMode: 'never',
        },
      );
      drainPendingSteps(state, nowMs, callbacks);
      return { ok: true };
    }

    default:
      return { ok: false, error: 'Thẻ bài không được hỗ trợ.' };
  }
}

export function applyExpandedInvestigateCard(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  cardId: string,
  targetPlayerId: string,
  nowMs: number,
  callbacks: TurnContinuationCallbacks,
): EngineActionResult {
  if (state.turnPhase !== 'LOCATION_ACTION' && state.turnPhase !== 'MAIN_ACTION') {
    return { ok: false, error: 'Hãy tung xúc xắc di chuyển trước khi đưa thẻ Thăm Dò Kín.' };
  }
  const idx = actor.hand.indexOf(cardId);
  if (idx === -1) {
    return { ok: false, error: 'Bạn không cầm thẻ Khám Phá này trên tay.' };
  }
  const card = getCardById(cardId);
  if (!card || card.deck !== 'investigation') {
    return { ok: false, error: 'Đây không phải Thẻ Khám Phá.' };
  }
  const target = state.players[targetPlayerId];
  if (!target || !target.alive || target.playerId === actor.playerId) {
    return { ok: false, error: 'Mục tiêu điều tra không hợp lệ.' };
  }

  actor.hand.splice(idx, 1);
  discardCardId(state, card.id);
  actor.investigationsCount += 1;
  if (!actor.investigatedTargetIds.includes(target.playerId)) {
    actor.investigatedTargetIds.push(target.playerId);
  }

  if (card.effectKind === 'inv_prediction') {
    const targetRole = getRoleDesign(target.roleId);
    appendPrivateClue(actor, {
      round: state.round,
      atMs: nowMs,
      cardTitle: card.title,
      targetPlayerId: target.playerId,
      targetName: target.displayName,
      outcome: 'condition-met',
      detail: `🔮 Tiên Tri: ${target.displayName} chính là ${targetRole.name} (${FACTION_LABELS[target.faction]}, ${target.maxHp} HP).`,
    });
    appendPrivateClue(target, {
      round: state.round,
      atMs: nowMs,
      cardTitle: card.title,
      targetPlayerId: actor.playerId,
      targetName: actor.displayName,
      outcome: 'condition-met',
      detail: `🔮 ${actor.displayName} đã đưa "Thăm Dò: Tiên Tri" và nhìn thấy vai thật của bạn (${targetRole.name}).`,
    });
    const pubMsg = `🔍 ${actor.displayName} đưa Thẻ Thăm Dò Kín cho ${target.displayName}: trao đổi mật tín bí mật.`;
    state.lastInvestigation = {
      id: `inv-${state.turnNumber}-${nowMs}`,
      round: state.round,
      atMs: nowMs,
      cardId: 'inv-00',
      cardTitle: 'Thẻ Thăm Dò Kín',
      conditionLabel: 'Mật báo 1-đối-1',
      investigatorId: actor.playerId,
      investigatorName: actor.displayName,
      targetPlayerId: target.playerId,
      targetName: target.displayName,
      outcome: 'condition-met',
      publicMessage: pubMsg,
    };
    appendPublicLog(state, 'investigate', pubMsg, nowMs, actor.playerId);
    callbacks.finalizeIfFinished(state, nowMs);
    return { ok: true };
  }

  const isFactionCheck =
    card.effectKind === 'inv_anger' ||
    card.effectKind === 'inv_blackmail' ||
    card.effectKind === 'inv_greed' ||
    card.effectKind === 'inv_slap' ||
    card.effectKind === 'inv_spell' ||
    card.effectKind === 'inv_exorcism' ||
    card.effectKind === 'inv_aid' ||
    card.effectKind === 'inv_nurturance' ||
    card.effectKind === 'inv_huddle';

  // Arlene (Điệu Bộ — Phase 5B house rule): giữ nguyên `target.faction === 'wanderer'`,
  // phản ứng tức thì (<1ms, không mở prompt chống timing side-channel) như Shadow khi policy !== 'AUTO_DECLINE'.
  let evaluatedFaction: BoardGameFactionId = target.faction;
  let usedArleneDisguise = false;
  if (isFactionCheck && target.roleId === 'exp2_arlene') {
    const invPayload: Record<string, unknown> = {
      cardId: card.id,
      effectKind: card.effectKind,
      isFactionCheck: true,
    };
    EXPANSION_SKILL_ENGINE.dispatch(state, {
      trigger: 'ON_INVESTIGATE',
      actorPlayerId: actor.playerId,
      targetPlayerId: target.playerId,
      nowMs,
      payload: invPayload,
    });
    if (invPayload.arleneImpersonateShadow === true) {
      evaluatedFaction = 'mist-order';
      usedArleneDisguise = true;
    }
  }

  let rawMatch = false;
  let isHealHermit = false;
  switch (card.effectKind) {
    case 'inv_anger':
      rawMatch = evaluatedFaction === 'lantern-guard' || evaluatedFaction === 'mist-order';
      break;
    case 'inv_blackmail':
      rawMatch = evaluatedFaction === 'lantern-guard' || evaluatedFaction === 'wanderer';
      break;
    case 'inv_greed':
      rawMatch = evaluatedFaction === 'wanderer' || evaluatedFaction === 'mist-order';
      break;
    case 'inv_slap':
      rawMatch = evaluatedFaction === 'lantern-guard';
      break;
    case 'inv_spell':
    case 'inv_exorcism':
      rawMatch = evaluatedFaction === 'mist-order';
      break;
    case 'inv_aid':
      rawMatch = evaluatedFaction === 'lantern-guard';
      isHealHermit = true;
      break;
    case 'inv_nurturance':
      rawMatch = evaluatedFaction === 'wanderer';
      isHealHermit = true;
      break;
    case 'inv_huddle':
      rawMatch = evaluatedFaction === 'mist-order';
      isHealHermit = true;
      break;
    case 'inv_bully':
      rawMatch = target.maxHp <= 11;
      break;
    case 'inv_tough_lesson':
      rawMatch = target.maxHp >= 12;
      break;
    default:
      break;
  }

  if (usedArleneDisguise) {
    const expArlene = ensureExpansionState(state);
    incRoleStat(expArlene.stats.activationsByRole, 'exp2_arlene', 1);
  }

  const isUnrevealedUnknown = target.roleId === 'suong-tin-gia' && !target.revealed;
  let effectiveMatch = rawMatch;
  let usedDeceit = false;
  if (isUnrevealedUnknown) {
    if (isHealHermit) {
      effectiveMatch = target.woundsTaken > 0;
      usedDeceit = effectiveMatch !== rawMatch;
    } else {
      effectiveMatch = false;
      usedDeceit = rawMatch;
    }
  }

  const outcome = effectiveMatch ? 'condition-met' : 'no-reaction';
  const condTag = card.conditionText ?? card.title;
  let effectNote = 'Không phản ứng.';
  let transferredGearName: string | null = null;
  let queuedDamageAmount = 0;

  if (effectiveMatch) {
    if (
      card.effectKind === 'inv_anger' ||
      card.effectKind === 'inv_blackmail' ||
      card.effectKind === 'inv_greed'
    ) {
      const preferGear =
        target.equipped.length > 0 &&
        target.hp <= 3 &&
        !(target.roleId === 'lang-anh-san' && target.hp >= 2);
      if (preferGear) {
        const stolen = transferLowestEquippedGear(target, actor);
        transferredGearName = stolen?.title ?? null;
        effectNote = stolen
          ? `Giao nộp "${stolen.title}" cho ${actor.displayName}!`
          : 'Khớp điều kiện nhưng không có đồ để giao.';
      } else {
        queuedDamageAmount = 1;
        effectNote = 'Khớp điều kiện — nhận 1 thương tích.';
      }
    } else if (isHealHermit) {
      if (target.woundsTaken > 0) {
        const healRes = executeHealPipeline(
          state,
          {
            healEventId: nextExpansionEventId(state, 'heal-inv'),
            sourceCardId: card.id,
            actorPlayerId: actor.playerId,
            targetPlayerId: target.playerId,
            rawAmount: 1,
            sourceKind: 'investigation',
            sourceLabel: card.title,
          },
          nowMs,
          createExpandedHealHooks(),
        );
        effectNote = `Khớp điều kiện — hồi ${healRes.actual} thương tích.`;
      } else {
        queuedDamageAmount = 1;
        effectNote = 'Khớp điều kiện (đang 0 vết) — phải nhận 1 thương tích!';
      }
    } else {
      queuedDamageAmount =
        card.effectKind === 'inv_exorcism' || card.effectKind === 'inv_tough_lesson' ? 2 : 1;
      effectNote = `Khớp điều kiện — nhận ${queuedDamageAmount} thương tích.`;
    }
  }

  appendPrivateClue(actor, {
    round: state.round,
    atMs: nowMs,
    cardTitle: card.title,
    targetPlayerId: target.playerId,
    targetName: target.displayName,
    outcome,
    detail: `[${condTag}] ${target.displayName} → ${effectNote}`,
  });
  appendPrivateClue(target, {
    round: state.round,
    atMs: nowMs,
    cardTitle: card.title,
    targetPlayerId: actor.playerId,
    targetName: actor.displayName,
    outcome,
    detail: usedDeceit
      ? `🎭 ${actor.displayName} đưa "${card.title}" [${condTag}] — Bạn đã Ngụy Trang Đa Tầng → ${effectNote}`
      : usedArleneDisguise
        ? `🎭 ${actor.displayName} đưa "${card.title}" [${condTag}] — Điệu Bộ (Arlene giả dạng Shadow, giữ nguyên phe Neutral) → ${effectNote}`
        : `Bạn nhận "${card.title}" [${condTag}] từ ${actor.displayName} → ${effectNote}`,
  });

  const publicEffectText = transferredGearName
    ? `${target.displayName} phải chuyển "${transferredGearName}" cho ${actor.displayName}!`
    : effectiveMatch
      ? 'Có phản ứng (trên Thang Thương Tích)!'
      : 'Không có gì xảy ra.';
  const pubMsg = `🔍 ${actor.displayName} đưa Thẻ Thăm Dò Kín cho ${target.displayName}: ${publicEffectText}`;
  state.lastInvestigation = {
    id: `inv-${state.turnNumber}-${nowMs}`,
    round: state.round,
    atMs: nowMs,
    cardId: 'inv-00',
    cardTitle: 'Thẻ Thăm Dò Kín',
    conditionLabel: 'Điều kiện bí mật 1-đối-1',
    investigatorId: actor.playerId,
    investigatorName: actor.displayName,
    targetPlayerId: target.playerId,
    targetName: target.displayName,
    outcome,
    publicMessage: pubMsg,
  };
  appendPublicLog(state, 'investigate', pubMsg, nowMs, actor.playerId);

  if (queuedDamageAmount > 0) {
    const exp = ensureExpansionState(state);
    exp.pendingSteps.push(
      {
        kind: 'DAMAGE',
        damageEventId: nextExpansionEventId(state, 'dmg'),
        sourceCardId: card.id,
        targetPlayerId: target.playerId,
        rawAmount: queuedDamageAmount,
        sourceType: 'investigation',
        attackerPlayerId: actor.playerId,
        isSingleTarget: true,
      },
      {
        kind: 'FINISH_ACTION',
        actorPlayerId: actor.playerId,
        autoEndTurnMode: 'never',
      },
    );
    drainPendingSteps(state, nowMs, callbacks);
  } else {
    callbacks.finalizeIfFinished(state, nowMs);
  }
  return { ok: true };
}

function openBipolarFateCoinChoice(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  nowMs: number,
): void {
  const exp = ensureExpansionState(state);
  exp.bipolarPromptedTurnNumber = state.turnNumber;
  const choiceId = nextExpansionEventId(state, 'choice-bipolar');
  const eventId = nextExpansionEventId(state, 'ev-bipolar');
  const timeoutMs = getChoiceTimeoutMs(state, actor);

  state.pendingChoice = {
    choiceId,
    eventId,
    ownerPlayerId: actor.playerId,
    kind: 'bipolar_fate_coin',
    isSecret: false,
    title: 'Đồng Xu Định Mệnh (Bipolar · 1 lần/trận)',
    description: `Đầu lượt của bạn (${actor.hp}/${actor.maxHp} HP). Bạn có thể tung đồng xu (d4 + 2 = 3–6) để TỰ HỒI MÁU hoặc TỰ NHẬN SÁT THƯƠNG không thể chặn (có thể tự loại bản thân), hoặc bỏ qua lượt này (hết giờ tự bỏ qua, không mất lượt dùng).`,
    publicPromptLabel: `🪙 Bipolar (${actor.displayName}) đang cân nhắc tung Đồng Xu Định Mệnh (đầu lượt)...`,
    options: [
      {
        optionId: 'heal_self',
        label: 'Hồi máu cho bản thân (d4 + 2 = 3–6 HP)',
        detail: `Dùng 1 lần/trận: hồi 3–6 HP (tối đa ${actor.maxHp} HP).`,
      },
      {
        optionId: 'damage_self',
        label: 'Tự nhận sát thương (d4 + 2 = 3–6 HP · Không thể chặn)',
        detail: `Dùng 1 lần/trận: tự chịu 3–6 ST xuyên giáp/khiên (có thể tự loại bản thân!).`,
      },
      {
        optionId: 'skip',
        label: 'Bỏ qua lượt này (Giữ nguyên 1 lần/trận)',
        detail: 'Không kích hoạt Đồng Xu Định Mệnh ở đầu lượt này và tiếp tục di chuyển bình thường.',
      },
    ],
    defaultOptionId: 'skip',
    createdAtMs: nowMs,
    deadlineMs: nowMs + timeoutMs,
    data: {
      kind: 'bipolar_fate_coin',
      actorPlayerId: actor.playerId,
      turnNumber: state.turnNumber,
    },
  };
}

function openWrathTurnStartChoice(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  clusterVictims: readonly AuthoritativePlayerState[],
  nowMs: number,
): void {
  const exp = ensureExpansionState(state);
  exp.wrathPromptedTurnNumber = state.turnNumber;
  const choiceId = nextExpansionEventId(state, 'choice-wrath');
  const eventId = nextExpansionEventId(state, 'ev-wrath');
  const timeoutMs = getChoiceTimeoutMs(state, actor);
  const victimNames = clusterVictims.map((v) => v.displayName).join(', ');

  state.pendingChoice = {
    choiceId,
    eventId,
    ownerPlayerId: actor.playerId,
    kind: 'wrath_turn_start_aoe',
    isSecret: false,
    title: 'Cơn Thịnh Nộ (Wrath · Đầu lượt)',
    description: `Có ${clusterVictims.length} người chơi khác đang đứng cùng Cụm với bạn (${victimNames}). Bạn có muốn gây 2 sát thương kỹ năng cho tất cả họ (không gây sát thương cho chính bạn) không? (Hết giờ tự bỏ qua).`,
    publicPromptLabel: `🔥 Wrath (${actor.displayName}) đang cân nhắc kích hoạt Cơn Thịnh Nộ (2 ST cùng Cụm)...`,
    options: [
      {
        optionId: 'activate',
        label: `Kích hoạt Cơn Thịnh Nộ (2 ST lên ${clusterVictims.length} người cùng Cụm)`,
        detail: `Mục tiêu: ${victimNames}. Không tự gây sát thương cho bản thân.`,
      },
      {
        optionId: 'skip',
        label: 'Bỏ qua lượt này',
        detail: 'Không gây sát thương đầu lượt và tiếp tục tung xúc xắc di chuyển.',
      },
    ],
    defaultOptionId: 'skip',
    createdAtMs: nowMs,
    deadlineMs: nowMs + timeoutMs,
    data: {
      kind: 'wrath_turn_start_aoe',
      actorPlayerId: actor.playerId,
      turnNumber: state.turnNumber,
      victimPlayerIds: clusterVictims.map((v) => v.playerId),
    },
  };
}

function openVisionsMarkChoice(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  candidates: readonly AuthoritativePlayerState[],
  nowMs: number,
): void {
  const exp = ensureExpansionState(state);
  exp.visionsPromptedTurnNumber = state.turnNumber;
  const choiceId = nextExpansionEventId(state, 'choice-visions');
  const eventId = nextExpansionEventId(state, 'ev-visions');
  const timeoutMs = getChoiceTimeoutMs(state, actor);
  const targetMap: Record<string, string> = {};
  const options: BoardGameChoiceOptionView[] = candidates.map((p, idx) => {
    const optId = `mark_${idx}`;
    targetMap[optId] = p.playerId;
    return {
      optionId: optId,
      label: `Đánh dấu ${p.displayName} (-1 HP mỗi đầu lượt sau)`,
      detail: `Không thể tấn công trực tiếp ${p.displayName} nữa; bắt đầu trừ 1 HP từ đầu lượt kế tiếp của bạn.`,
      targetPlayerId: p.playerId,
    };
  });
  options.push({
    optionId: 'skip',
    label: 'Chưa đánh dấu lượt này (Giữ nguyên 1 lần/trận)',
    detail: 'Để dành kỹ năng 1 lần/trận cho đầu lượt sau.',
  });

  state.pendingChoice = {
    choiceId,
    eventId,
    ownerPlayerId: actor.playerId,
    kind: 'visions_mark_target',
    isSecret: false,
    title: 'Ám Ảnh Dài Lâu (Visions · 1 lần/trận)',
    description:
      'Chọn 1 người chơi khác để đặt dấu ấn vĩnh viễn: bạn sẽ không thể tấn công trực tiếp người này nữa, và từ đầu lượt tiếp theo của bạn họ sẽ mất 1 HP mỗi lượt của bạn (hết giờ tự bỏ qua).',
    publicPromptLabel: `👁️ Visions (${actor.displayName}) đang cân nhắc đặt dấu ấn đầu lượt...`,
    options,
    defaultOptionId: 'skip',
    createdAtMs: nowMs,
    deadlineMs: nowMs + timeoutMs,
    data: {
      kind: 'visions_mark_target',
      actorPlayerId: actor.playerId,
      turnNumber: state.turnNumber,
      targetMap,
    },
  };
}

function openBryonGiftChoice(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  giftableCardIds: readonly string[],
  recipients: readonly AuthoritativePlayerState[],
  nowMs: number,
): void {
  const choiceId = nextExpansionEventId(state, 'choice-bryon');
  const eventId = nextExpansionEventId(state, 'ev-bryon');
  const timeoutMs = getChoiceTimeoutMs(state, actor);
  const giftMap: Record<string, { recipientPlayerId: string; cardIds: string[] }> = {};
  const options: BoardGameChoiceOptionView[] = [];
  let seq = 0;

  for (const recipient of recipients) {
    if (giftableCardIds.length >= 2) {
      const optId = `g_${seq++}`;
      giftMap[optId] = {
        recipientPlayerId: recipient.playerId,
        cardIds: [...giftableCardIds],
      };
      const names = giftableCardIds
        .map((cid) => getCardById(cid)?.title ?? cid)
        .join(', ');
      options.push({
        optionId: optId,
        label: `Tặng TẤT CẢ (${giftableCardIds.length} món) → ${recipient.displayName}`,
        detail: `Chuyển toàn bộ trang bị hợp lệ (${names}) cho ${recipient.displayName} (trừ Masamune). Vẫn giữ nguyên quyền tấn công.`,
        targetPlayerId: recipient.playerId,
      });
    }

    const seenCards = new Set<string>();
    for (const cid of giftableCardIds) {
      if (seenCards.has(cid)) continue;
      seenCards.add(cid);
      const card = getCardById(cid);
      const optId = `g_${seq++}`;
      giftMap[optId] = {
        recipientPlayerId: recipient.playerId,
        cardIds: [cid],
      };
      options.push({
        optionId: optId,
        label: `Tặng "${card?.title ?? cid}" → ${recipient.displayName}`,
        detail: card?.summary ?? 'Chuyển 1 trang bị cho Neutral đã lộ diện cùng Cụm.',
        ...(card ? { card: toCardPublicMeta(card) } : {}),
        targetPlayerId: recipient.playerId,
      });
    }
  }

  options.push({
    optionId: 'done',
    label: 'Hoàn tất / Không tặng thêm',
    detail: 'Giữ nguyên các trang bị còn lại và tiếp tục pha Hành động chính.',
  });

  state.pendingChoice = {
    choiceId,
    eventId,
    ownerPlayerId: actor.playerId,
    kind: 'bryon_gift_equipment',
    isSecret: false,
    title: 'Sự Phục Vụ Hào Phóng (Bryon)',
    description:
      'Chọn trao tặng 1 hoặc toàn bộ trang bị hợp lệ (trừ Masamune) cho một Neutral đã lộ diện cùng Cụm. Tặng xong vẫn giữ nguyên quyền tấn công và có thể tặng tiếp nếu còn trang bị.',
    publicPromptLabel: `🎁 Bryon (${actor.displayName}) đang chọn trao tặng trang bị cho đồng minh Neutral cùng Cụm...`,
    options,
    defaultOptionId: 'done',
    createdAtMs: nowMs,
    deadlineMs: nowMs + timeoutMs,
    data: {
      kind: 'bryon_gift_equipment',
      actorPlayerId: actor.playerId,
      giftMap,
    },
  };
}

export function triggerExpandedTurnStart(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  nowMs: number,
  callbacks?: TurnContinuationCallbacks,
): void {
  if (state.finished || !actor.alive || state.pendingChoice) return;
  const exp = ensureExpansionState(state);

  const payload: Record<string, unknown> = {
    turnNumber: state.turnNumber,
  };
  EXPANSION_SKILL_ENGINE.dispatch(state, {
    trigger: 'ON_TURN_START',
    actorPlayerId: actor.playerId,
    nowMs,
    payload,
  });

  // 1. Visions persistent mark tick (đầu lượt TIẾP THEO sau lượt đặt dấu -> gây 1 ST kỹ năng!)
  if (typeof payload.visionsTickTargetId === 'string' && actor.roleId === 'exp2_visions') {
    const mark = exp.visionsMarks?.[actor.playerId];
    const markedVictim = state.players[payload.visionsTickTargetId];
    if (
      mark &&
      markedVictim &&
      markedVictim.alive &&
      mark.markedOnTurnNumber < state.turnNumber &&
      mark.lastTickTurnNumber !== state.turnNumber
    ) {
      mark.lastTickTurnNumber = state.turnNumber;
      incRoleStat(exp.stats.activationsByRole, 'exp2_visions', 1);
      incRoleStat(exp.stats.bonusDamageByRole, 'exp2_visions', 1);
      exp.pendingSteps.push(
        {
          kind: 'DAMAGE',
          damageEventId: nextExpansionEventId(state, 'dmg-visions'),
          targetPlayerId: markedVictim.playerId,
          rawAmount: 1,
          sourceType: 'skill',
          attackerPlayerId: actor.playerId,
          isSingleTarget: true,
          postLogKind: 'skill',
          postLogPrefix: `👁️ Visions (${actor.displayName}) — Dấu Ấn Đầu Lượt: ${markedVictim.displayName} mất `,
          postLogSuffix: ' HP!',
          postLogActorId: actor.playerId,
        },
        {
          kind: 'FINISH_ACTION',
          actorPlayerId: actor.playerId,
          autoEndTurnMode: 'never',
        },
      );
      if (callbacks) {
        drainPendingSteps(state, nowMs, callbacks);
      }
      return;
    }
  }

  // 2. Visions initial mark prompt (1 lần/trận vào đầu lượt khi đã lộ vai)
  if (
    payload.visionsCanPrompt === true &&
    actor.roleId === 'exp2_visions' &&
    actor.revealed &&
    !actor.skillUsedOnce &&
    exp.visionsPromptedTurnNumber !== state.turnNumber &&
    !exp.visionsMarks?.[actor.playerId]
  ) {
    const candidates = state.turnOrder
      .map((id) => state.players[id])
      .filter((p): p is AuthoritativePlayerState => Boolean(p && p.alive && p.playerId !== actor.playerId));
    if (candidates.length > 0) {
      openVisionsMarkChoice(state, actor, candidates, nowMs);
      return;
    }
  }

  // 3. Wrath turn-start cluster AoE prompt (tùy chọn 2 ST kỹ năng lên mọi người khác cùng Cụm)
  if (
    payload.wrathCanPrompt === true &&
    actor.roleId === 'exp1_wrath' &&
    actor.revealed &&
    exp.wrathPromptedTurnNumber !== state.turnNumber
  ) {
    const clusterVictims = listLivingPlayersInSameCluster(state, actor, { includeSelf: false });
    if (clusterVictims.length > 0) {
      openWrathTurnStartChoice(state, actor, clusterVictims, nowMs);
      return;
    }
  }

  // 4. Bipolar Fate Coin prompt (1 lần/trận vào đầu lượt khi đã lộ vai)
  if (
    payload.bipolarCanPrompt === true &&
    actor.roleId === 'exp1_bipolar' &&
    actor.revealed &&
    !actor.skillUsedOnce &&
    exp.bipolarPromptedTurnNumber !== state.turnNumber
  ) {
    openBipolarFateCoinChoice(state, actor, nowMs);
  }
}

function openEliseDistributeHealChoice(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  nowMs: number,
): void {
  const clusterMembersRaw = listLivingPlayersInSameCluster(state, actor, { includeSelf: true });
  const clusterMembers = state.turnOrder
    .map((id) => clusterMembersRaw.find((p) => p.playerId === id))
    .filter((p): p is AuthoritativePlayerState => Boolean(p));
  const injured = clusterMembers.filter((p) => p.woundsTaken > 0);
  const distributionMap: Record<string, Array<{ playerId: string; amount: number }>> = {};
  const options: BoardGameChoiceOptionView[] = [];
  const seenKeys = new Set<string>();
  let seq = 0;

  const pushPlan = (
    allocs: Array<{ playerId: string; amount: number }>,
    titlePrefix: string,
  ): void => {
    const cleaned = allocs
      .filter((a) => a.amount > 0)
      .sort(
        (a, b) => state.turnOrder.indexOf(a.playerId) - state.turnOrder.indexOf(b.playerId),
      );
    const total = cleaned.reduce((sum, a) => sum + a.amount, 0);
    if (total > 5) return;
    const key = cleaned.map((a) => `${a.playerId}:${a.amount}`).join('|');
    if (seenKeys.has(key)) return;
    seenKeys.add(key);

    const optId = `e_${seq++}`;
    distributionMap[optId] = cleaned;
    if (cleaned.length === 0) {
      options.push({
        optionId: optId,
        label: `${titlePrefix} (0 HP hiệu lực — cả Cụm đang đầy máu)`,
        detail: 'Tiêu hao 1 lần/trận mà không vượt quá Max HP của ai.',
      });
      return;
    }
    const parts = cleaned.map((a) => {
      const p = state.players[a.playerId];
      return `${p?.displayName ?? a.playerId} +${a.amount} HP`;
    });
    const unused = 5 - total;
    options.push({
      optionId: optId,
      label: `${titlePrefix}: ${parts.join(', ')}`,
      detail:
        unused > 0
          ? `Phân bổ ${total}/5 HP hiệu lực (không vượt Max HP · hủy ${unused} điểm dư).`
          : `Phân bổ trọn 5/5 HP hiệu lực qua HealPipeline.`,
      targetPlayerId: cleaned[0]?.playerId,
    });
  };

  if (injured.length === 0) {
    pushPlan([], 'Kích hoạt ngay');
  } else {
    // 1. Chia đều luân phiên (Balanced round-robin) cho tất cả người mất máu trong Cụm
    if (injured.length >= 2) {
      const counts = new Map<string, number>();
      let rem = Math.min(
        5,
        injured.reduce((s, p) => s + p.woundsTaken, 0),
      );
      let idx = 0;
      while (rem > 0) {
        const p = injured[idx % injured.length];
        const cur = counts.get(p.playerId) ?? 0;
        if (cur < p.woundsTaken) {
          counts.set(p.playerId, cur + 1);
          rem -= 1;
        }
        idx += 1;
        if (idx > 64) break;
      }
      pushPlan(
        Array.from(counts.entries()).map(([playerId, amount]) => ({ playerId, amount })),
        'Chia đều toàn Cụm',
      );
    }

    // 2. Ưu tiên cứu người thấp máu nhất trước (Lowest HP greedy fill)
    if (injured.length >= 2) {
      const byLowest = [...injured].sort((a, b) => {
        const d = getRemainingHp(a) - getRemainingHp(b);
        return d !== 0
          ? d
          : state.turnOrder.indexOf(a.playerId) - state.turnOrder.indexOf(b.playerId);
      });
      const greedy: Array<{ playerId: string; amount: number }> = [];
      let rem = 5;
      for (const p of byLowest) {
        if (rem <= 0) break;
        const take = Math.min(rem, p.woundsTaken);
        if (take > 0) {
          greedy.push({ playerId: p.playerId, amount: take });
          rem -= take;
        }
      }
      pushPlan(greedy, 'Cứu nguy thấp máu nhất');
    }

    // 3. Dồn tối đa (tối đa 5 HP) cho từng mục tiêu mất máu (bao gồm Elise)
    for (const p of injured) {
      const take = Math.min(5, p.woundsTaken);
      pushPlan(
        [{ playerId: p.playerId, amount: take }],
        p.playerId === actor.playerId ? 'Tự hồi bản thân' : `Tập trung ${p.displayName}`,
      );
    }

    // 4. Nếu đúng 2 người mất máu & đều thiếu >= 3 HP: thêm các phương án lệch 3/2 và 2/3
    if (injured.length === 2 && injured[0].woundsTaken >= 3 && injured[1].woundsTaken >= 3) {
      pushPlan(
        [
          { playerId: injured[0].playerId, amount: 3 },
          { playerId: injured[1].playerId, amount: 2 },
        ],
        'Chia 3 / 2',
      );
      pushPlan(
        [
          { playerId: injured[0].playerId, amount: 2 },
          { playerId: injured[1].playerId, amount: 3 },
        ],
        'Chia 2 / 3',
      );
    }

    // 5. Nếu Elise và đồng minh cùng mất máu: phương án chỉ hồi đồng minh
    const injuredAllies = injured.filter((p) => p.playerId !== actor.playerId);
    if (actor.woundsTaken > 0 && injuredAllies.length >= 1) {
      const allyCounts = new Map<string, number>();
      let rem = Math.min(
        5,
        injuredAllies.reduce((s, p) => s + p.woundsTaken, 0),
      );
      let idx = 0;
      while (rem > 0) {
        const p = injuredAllies[idx % injuredAllies.length];
        const cur = allyCounts.get(p.playerId) ?? 0;
        if (cur < p.woundsTaken) {
          allyCounts.set(p.playerId, cur + 1);
          rem -= 1;
        }
        idx += 1;
        if (idx > 64) break;
      }
      pushPlan(
        Array.from(allyCounts.entries()).map(([playerId, amount]) => ({ playerId, amount })),
        'Chỉ hồi đồng minh',
      );
    }
  }

  options.push({
    optionId: 'skip',
    label: 'Hủy / Để dành (Giữ nguyên 1 lần/trận)',
    detail: 'Không sử dụng Âm Hưởng Mềm Mại lúc này và không mất lượt dùng.',
  });

  const choiceId = nextExpansionEventId(state, 'choice-elise');
  const eventId = nextExpansionEventId(state, 'ev-elise');
  const timeoutMs = getChoiceTimeoutMs(state, actor);
  state.pendingChoice = {
    choiceId,
    eventId,
    ownerPlayerId: actor.playerId,
    kind: 'elise_distribute_heal',
    isSecret: false,
    title: 'Âm Hưởng Mềm Mại (Elise · 1 lần/trận)',
    description:
      'Phân bổ tổng tối đa 5 điểm hồi máu cho các người chơi còn sống cùng Cụm với bạn (bao gồm cả bản thân). Điểm dư không dùng bị hủy; chọn Hủy hoặc hết giờ sẽ KHÔNG mất lượt dùng 1 lần/trận.',
    publicPromptLabel: `🎶 Elise (${actor.displayName}) đang chọn phân bổ 5 điểm hồi máu cho Cụm...`,
    options,
    defaultOptionId: 'skip',
    createdAtMs: nowMs,
    deadlineMs: nowMs + timeoutMs,
    data: {
      kind: 'elise_distribute_heal',
      actorPlayerId: actor.playerId,
      distributionMap,
    },
  };
}

export function applyExpandedUseSkill(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  targetPlayerId: string | undefined,
  nowMs: number,
  callbacks: TurnContinuationCallbacks,
): EngineActionResult | null {
  // Chặn các kỹ năng mở rộng & kỹ năng gây sát thương/hồi máu/chuỗi tấn công; Lan (gac-truc-ban) trả null.
  if (
    actor.roleId !== 'gac-ky-thuat' &&
    actor.roleId !== 'gac-radio' &&
    actor.roleId !== 'lang-quan-sat' &&
    actor.roleId !== 'lang-cuu-ho' &&
    actor.roleId !== 'exp2_father_harrison' &&
    actor.roleId !== 'exp1_bipolar' &&
    actor.roleId !== 'exp2_eleanor' &&
    actor.roleId !== 'exp1_wrath' &&
    actor.roleId !== 'exp2_visions' &&
    actor.roleId !== 'exp2_bryon' &&
    actor.roleId !== 'exp2_elise'
  ) {
    return null;
  }
  if (!actor.revealed) {
    return { ok: false, error: 'Bạn cần Lật vai công khai trước khi kích hoạt kỹ năng.' };
  }
  const role = getRoleDesign(actor.roleId);
  if (role.oncePerMatch && actor.skillUsedOnce) {
    return { ok: false, error: `${role.skillName} chỉ dùng 1 lần duy nhất mỗi trận.` };
  }
  if (actor.skillCooldown > 0) {
    return { ok: false, error: `${role.skillName} đang hồi chiêu (${actor.skillCooldown} vòng nữa).` };
  }

  // Father Harrison (Lễ Ngày Chủ Nhật — Phase 3A house rule): di chuyển thẳng vào Church (`lobby`) thay vì đổ xúc xắc
  if (actor.roleId === 'exp2_father_harrison') {
    if (state.turnPhase !== 'ROLL_MOVE') {
      return {
        ok: false,
        error: 'Lễ Ngày Chủ Nhật chỉ dùng được ở Pha 1 (thay cho tung xúc xắc di chuyển).',
      };
    }
    if (actor.consecutiveSameZoneRolls > 0) {
      return {
        ok: false,
        error: 'Bạn đã bắt đầu tung xúc xắc di chuyển trong lượt này — không thể đổi sang Lễ Ngày Chủ Nhật.',
      };
    }
    if (isPlayerAtExactLocationAlias(actor, 'church')) {
      return {
        ok: false,
        error: 'Bạn đang đứng tại Sảnh Tầng 1 (Church) — không thể dùng Lễ Ngày Chủ Nhật để đứng yên tại chỗ.',
      };
    }
    const moveRes = EXPANSION_SKILL_ENGINE.dispatch(state, {
      trigger: 'ON_MOVE',
      actorPlayerId: actor.playerId,
      nowMs,
      payload: { targetAlias: 'church' },
    });
    if (!moveRes.ok || !moveRes.trace.some((t) => t.handlerId === 'exp:exp2_father_harrison:sunday-service' && t.applied)) {
      return { ok: false, error: 'Không thể kích hoạt Lễ Ngày Chủ Nhật vào lúc này.' };
    }
    callbacks.finalizeIfFinished(state, nowMs);
    return { ok: true };
  }

  // Bipolar (Đồng Xu Định Mệnh — Phase 3A house rule): chỉ kích hoạt vào đầu lượt (`ROLL_MOVE` trước khi di chuyển/tung xúc xắc)
  if (actor.roleId === 'exp1_bipolar') {
    if (state.turnPhase !== 'ROLL_MOVE' || actor.consecutiveSameZoneRolls > 0) {
      return {
        ok: false,
        error: 'Đồng Xu Định Mệnh chỉ kích hoạt được vào đầu lượt (trước khi tung xúc xắc di chuyển).',
      };
    }
    openBipolarFateCoinChoice(state, actor, nowMs);
    return { ok: true };
  }

  // Eleanor (Người Thẩm Vấn — Phase 4B house rule): thay quyền tấn công ở MAIN_ACTION bằng rút 1 thẻ Xanh
  if (actor.roleId === 'exp2_eleanor') {
    if (state.turnPhase !== 'MAIN_ACTION') {
      return {
        ok: false,
        error: 'Người Thẩm Vấn chỉ kích hoạt được trong pha Hành động chính (thay cho tấn công).',
      };
    }
    if (actor.attacksThisTurn > 0) {
      return {
        ok: false,
        error: 'Bạn đã dùng quyền tấn công trong lượt này — không thể kích hoạt Người Thẩm Vấn.',
      };
    }
    if (actor.hand.length > 0 || hasGloriaQueuedCards(state, actor.playerId)) {
      return {
        ok: false,
        error: 'Hãy giải quyết hết thẻ bài đang cầm trên tay trước khi kích hoạt Người Thẩm Vấn.',
      };
    }
    if (
      actor.equipped.includes(MASAMUNE_CARD_ID) &&
      listExpandedReachableAttackTargets(state, actor).length > 0
    ) {
      return {
        ok: false,
        error: 'Kiếm Gỗ Nguyền Rủa (Masamune): Bạn bắt buộc phải tấn công khi có mục tiêu hợp lệ trong tầm — không thể thay bằng rút thẻ Xanh!',
      };
    }
    const eleanorPayload: Record<string, unknown> = {};
    EXPANSION_SKILL_ENGINE.dispatch(state, {
      trigger: 'ACTIVE_SKILL',
      actorPlayerId: actor.playerId,
      nowMs,
      payload: eleanorPayload,
    });
    if (eleanorPayload.eleanorApproved !== true) {
      return { ok: false, error: 'Không thể kích hoạt Người Thẩm Vấn vào lúc này.' };
    }

    const expEleanor = ensureExpansionState(state);
    actor.attacksThisTurn = 1;
    incRoleStat(expEleanor.stats.activationsByRole, 'exp2_eleanor', 1);
    const drawn = takeOneCardFromDeck(state, 'investigation');
    if (!drawn) {
      appendPublicLog(
        state,
        'skill',
        `🔍 Eleanor (${actor.displayName}) — Người Thẩm Vấn: chồng bài Khám Phá (Xanh) đã cạn lá rảnh (đã tiêu hao quyền tấn công lượt này).`,
        nowMs,
        actor.playerId,
      );
      callbacks.finalizeIfFinished(state, nowMs);
      return { ok: true };
    }
    if (actor.hand.length >= BOARD_GAME_MAX_HAND) {
      const dropped = actor.hand.shift();
      if (dropped) discardCardId(state, dropped);
    }
    actor.hand.push(drawn.id);
    // BẢO MẬT P0: Log công khai KHÔNG lộ nội dung lá bài Xanh Eleanor vừa rút!
    appendPublicLog(
      state,
      'draw',
      `🔍 Eleanor (${actor.displayName}) — Người Thẩm Vấn: bỏ quyền tấn công để rút 1 thẻ Khám Phá (Xanh) kín (cần giải quyết trong lượt).`,
      nowMs,
      actor.playerId,
    );
    callbacks.finalizeIfFinished(state, nowMs);
    return { ok: true };
  }

  // Wrath (Cơn Thịnh Nộ — Phase 4B house rule): cho phép mở choice nếu Wrath tự lật vai ngay đầu lượt (ROLL_MOVE)
  if (actor.roleId === 'exp1_wrath') {
    const expWrath = ensureExpansionState(state);
    if (state.turnPhase !== 'ROLL_MOVE' || actor.consecutiveSameZoneRolls > 0) {
      return {
        ok: false,
        error: 'Cơn Thịnh Nộ chỉ kích hoạt được vào đầu lượt của bạn (trước khi tung xúc xắc di chuyển).',
      };
    }
    if (expWrath.wrathPromptedTurnNumber === state.turnNumber) {
      return {
        ok: false,
        error: 'Bạn đã cân nhắc Cơn Thịnh Nộ trong lượt này rồi.',
      };
    }
    const clusterVictims = listLivingPlayersInSameCluster(state, actor, { includeSelf: false });
    if (clusterVictims.length === 0) {
      return {
        ok: false,
        error: 'Không có người chơi khác nào đang đứng cùng Cụm với bạn.',
      };
    }
    openWrathTurnStartChoice(state, actor, clusterVictims, nowMs);
    return { ok: true };
  }

  // Visions (Ám Ảnh Dài Lâu — Phase 4B house rule): cho phép mở choice nếu Visions tự lật vai ngay đầu lượt (ROLL_MOVE)
  if (actor.roleId === 'exp2_visions') {
    const expVis = ensureExpansionState(state);
    if (state.turnPhase !== 'ROLL_MOVE' || actor.consecutiveSameZoneRolls > 0) {
      return {
        ok: false,
        error: 'Dấu Ấn Visions chỉ đặt được vào đầu lượt của bạn (trước khi tung xúc xắc di chuyển).',
      };
    }
    if (actor.skillUsedOnce || expVis.visionsMarks?.[actor.playerId]) {
      return {
        ok: false,
        error: 'Bạn đã đặt Dấu Ấn Visions trong trận này (1 lần/trận, không thể đổi mục tiêu).',
      };
    }
    const candidates = state.turnOrder
      .map((id) => state.players[id])
      .filter((p): p is AuthoritativePlayerState => Boolean(p && p.alive && p.playerId !== actor.playerId));
    if (candidates.length === 0) {
      return { ok: false, error: 'Không có mục tiêu hợp lệ để đặt Dấu Ấn.' };
    }
    openVisionsMarkChoice(state, actor, candidates, nowMs);
    return { ok: true };
  }

  // Bryon (Sự Phục Vụ Hào Phóng — Phase 4B house rule): trao tặng trang bị (trừ Masamune) cho Neutral đã lộ diện cùng Cụm trước khi đánh
  if (actor.roleId === 'exp2_bryon') {
    if (state.turnPhase !== 'MAIN_ACTION') {
      return {
        ok: false,
        error: 'Sự Phục Vụ Hào Phóng chỉ kích hoạt được ở pha Hành động chính (trước khi tấn công).',
      };
    }
    if (actor.attacksThisTurn > 0) {
      return {
        ok: false,
        error: 'Sự Phục Vụ Hào Phóng chỉ dùng được TRƯỚC khi bạn tấn công trong lượt này.',
      };
    }
    if (actor.hand.length > 0 || hasGloriaQueuedCards(state, actor.playerId)) {
      return {
        ok: false,
        error: 'Hãy giải quyết hết thẻ bài đang cầm trên tay trước khi trao tặng trang bị.',
      };
    }
    const giftable = actor.equipped.filter((cid) => cid !== MASAMUNE_CARD_ID);
    if (giftable.length === 0) {
      return {
        ok: false,
        error: 'Bạn không có trang bị hợp lệ để trao tặng (Masamune không thể chuyển nhượng).',
      };
    }
    const recipients = listLivingPlayersInSameCluster(state, actor, { includeSelf: false }).filter(
      (p) => p.faction === 'wanderer' && p.revealed,
    );
    if (recipients.length === 0) {
      return {
        ok: false,
        error: 'Không có nhân vật Neutral đã lộ diện nào đang đứng cùng Cụm với bạn.',
      };
    }
    openBryonGiftChoice(state, actor, giftable, recipients, nowMs);
    return { ok: true };
  }

  // Elise (Âm Hưởng Mềm Mại — Phase 5B house rule): phân bổ tổng tối đa 5 HP cho các người chơi cùng Cụm (gồm bản thân)
  if (actor.roleId === 'exp2_elise') {
    if (
      state.turnPhase !== 'ROLL_MOVE' &&
      state.turnPhase !== 'LOCATION_ACTION' &&
      state.turnPhase !== 'MAIN_ACTION'
    ) {
      return {
        ok: false,
        error: 'Âm Hưởng Mềm Mại chỉ kích hoạt được trong lượt của bạn.',
      };
    }
    if (actor.hand.length > 0 || hasGloriaQueuedCards(state, actor.playerId)) {
      return {
        ok: false,
        error: 'Hãy giải quyết hết thẻ bài đang cầm trên tay trước khi kích hoạt Âm Hưởng Mềm Mại.',
      };
    }
    const elisePayload: Record<string, unknown> = {};
    EXPANSION_SKILL_ENGINE.dispatch(state, {
      trigger: 'ACTIVE_SKILL',
      actorPlayerId: actor.playerId,
      nowMs,
      payload: elisePayload,
    });
    if (elisePayload.eliseApproved !== true) {
      return { ok: false, error: 'Không thể kích hoạt Âm Hưởng Mềm Mại vào lúc này.' };
    }
    openEliseDistributeHealChoice(state, actor, nowMs);
    return { ok: true };
  }

  const exp = ensureExpansionState(state);

  if (actor.roleId === 'lang-quan-sat') {
    if (
      state.turnPhase !== 'ROLL_MOVE' &&
      state.turnPhase !== 'CHOOSE_MOVE' &&
      state.turnPhase !== 'LOCATION_ACTION' &&
      state.turnPhase !== 'MAIN_ACTION'
    ) {
      return { ok: false, error: 'Chưa thể kích hoạt kỹ năng lúc này.' };
    }
    actor.skillUsedOnce = true;
    exp.pendingSteps.push(
      {
        kind: 'HEAL',
        healEventId: nextExpansionEventId(state, 'heal-allie'),
        actorPlayerId: actor.playerId,
        targetPlayerId: actor.playerId,
        rawAmount: actor.woundsTaken,
        sourceKind: 'skill',
        sourceLabel: 'Ý Chí Hồi Sinh (Trang)',
        postLogKind: 'skill',
        postLogPrefix: `💚 ${actor.displayName} kích hoạt Ý Chí Hồi Sinh: hồi sạch `,
        postLogSuffix: ' thương tích về 0!',
        postLogActorId: actor.playerId,
      },
      {
        kind: 'FINISH_ACTION',
        actorPlayerId: actor.playerId,
        autoEndTurnMode: 'never',
      },
    );
    drainPendingSteps(state, nowMs, callbacks);
    return { ok: true };
  }

  if (actor.roleId === 'gac-ky-thuat' || actor.roleId === 'gac-radio') {
    if (
      state.turnPhase !== 'ROLL_MOVE' &&
      state.turnPhase !== 'CHOOSE_MOVE' &&
      state.turnPhase !== 'LOCATION_ACTION' &&
      state.turnPhase !== 'MAIN_ACTION'
    ) {
      return { ok: false, error: 'Chưa thể kích hoạt kỹ năng lúc này.' };
    }
    if (!targetPlayerId) {
      return { ok: false, error: 'Hãy chọn 1 người chơi bất kỳ làm mục tiêu.' };
    }
    const target = state.players[targetPlayerId];
    if (!target || !target.alive || target.playerId === actor.playerId) {
      return { ok: false, error: 'Mục tiêu không hợp lệ.' };
    }
    actor.skillUsedOnce = true;
    const isD6 = actor.roleId === 'gac-radio';
    const dmg = isD6 ? rollD6(state) : rollD4(state);
    exp.pendingSteps.push(
      {
        kind: 'DAMAGE',
        damageEventId: nextExpansionEventId(state, 'dmg'),
        targetPlayerId: target.playerId,
        rawAmount: dmg,
        sourceType: 'skill',
        attackerPlayerId: actor.playerId,
        isSingleTarget: true,
        postLogKind: 'skill',
        postLogPrefix: isD6
          ? `⚡ ${actor.displayName} phóng Xung Cao Áp (1d6=${dmg}) lên ${target.displayName} → `
          : `⚡ ${actor.displayName} tung Đòn Phá Vây (1d4=${dmg}) lên ${target.displayName} → `,
        postLogSuffix: ' sát thương!',
        postLogActorId: actor.playerId,
      },
      {
        kind: 'FINISH_ACTION',
        actorPlayerId: actor.playerId,
        autoEndTurnMode: 'never',
      },
    );
    drainPendingSteps(state, nowMs, callbacks);
    return { ok: true };
  }

  // Bách "Cuồng Chiến" (Charles — Bloody Feast): trả 2 HP (unpreventable HP cost) + đánh bồi qua Expanded Attack
  if (state.turnPhase !== 'MAIN_ACTION' || actor.attacksThisTurn < 1) {
    return {
      ok: false,
      error: 'Đòn Đánh Đẫm Máu chỉ kích hoạt được ngay sau khi bạn vừa tấn công mục tiêu trong lượt.',
    };
  }
  if (actor.hand.length > 0) {
    return { ok: false, error: 'Hãy giải quyết lá bài vừa rút trước khi tung đòn đánh bồi.' };
  }
  if (actor.hp <= 2) {
    return { ok: false, error: 'Bạn cần còn trên 2 HP mới đủ sức tự nhận 2 thương tích để chém bồi!' };
  }
  const expectedId = actor.lastAttackTargetId ?? targetPlayerId;
  if (!expectedId) {
    return { ok: false, error: 'Chưa xác định được mục tiêu vừa tấn công để chém bồi.' };
  }
  if (targetPlayerId && actor.lastAttackTargetId && targetPlayerId !== actor.lastAttackTargetId) {
    return {
      ok: false,
      error: 'Đòn Đánh Đẫm Máu chuẩn gốc chỉ được chém bồi tiếp vào ĐÚNG mục tiêu vừa tấn công!',
    };
  }
  const target = state.players[expectedId];
  if (!target || !target.alive || !canExpandedPlayerAttackTarget(state, actor, target)) {
    return { ok: false, error: 'Mục tiêu vừa chém đã bị loại hoặc không còn trong tầm đánh.' };
  }
  applyHpCost(state, actor, 2, 'Đòn Đánh Đẫm Máu', nowMs);
  if (!actor.alive) {
    callbacks.finalizeIfFinished(state, nowMs);
    return { ok: true };
  }
  return startExpandedAttack(state, actor, expectedId, nowMs, callbacks);
}

// ---------------------------------------------------------------------------
// Serializable Continuation Runner (Drain Queue)
// ---------------------------------------------------------------------------

function executeDamageStep(
  state: AuthoritativeGameState,
  step: Extract<PendingResolutionStep, { kind: 'DAMAGE' }>,
  nowMs: number,
): boolean {
  const target = state.players[step.targetPlayerId];
  const attacker = step.attackerPlayerId ? state.players[step.attackerPlayerId] ?? null : null;
  if (!target || !target.alive) return true;
  if (hasProcessedExpansionEvent(state, step.damageEventId)) return true;

  let dmg = Math.max(0, step.rawAmount);

  // Urban Legend (Chuyện Kinh Dị — Phase 5B house rule):
  // Chuyển hóa sát thương từ 5 lá Đen dùng 1 lần (`ev-07`, `ev-08`, `ev-09`, `ev-10`, `ev-12`) thành hồi máu (`sourceKind: 'black-card'`).
  // Không kích hoạt AFTER_DAMAGE_TRIGGERS, không gây chết hay ON_ELIMINATION; hiệu ứng gốc lên người khác vẫn giữ nguyên!
  if (step.urbanLegendChecked && step.urbanLegendConverted) {
    markExpansionEventProcessed(state, step.damageEventId);
    const expUl = ensureExpansionState(state);
    incRoleStat(expUl.stats.activationsByRole, 'exp2_urban_legend', 1);
    incRoleStat(expUl.stats.damagePreventedByRole, 'exp2_urban_legend', dmg);
    expUl.pendingSteps.unshift({
      kind: 'HEAL',
      healEventId: nextExpansionEventId(state, 'heal-ul'),
      causationId: step.damageEventId,
      sourceCardId: step.sourceCardId,
      actorPlayerId: target.playerId,
      targetPlayerId: target.playerId,
      rawAmount: dmg,
      sourceKind: 'black-card',
      sourceLabel: 'Chuyện Kinh Dị (Urban Legend)',
      roleStatId: 'exp2_urban_legend',
      postLogKind: 'skill',
      postLogPrefix: `👻 Urban Legend (${target.displayName}) — Chuyện Kinh Dị: chuyển hóa sát thương thẻ Đen thành hồi `,
      postLogSuffix: ' HP!',
      postLogActorId: target.playerId,
      zeroLogText: `👻 Urban Legend (${target.displayName}) — Chuyện Kinh Dị: vô hiệu hóa sát thương thẻ Đen (đã đầy máu ${target.hp}/${target.maxHp}).`,
    });
    return true;
  }

  if (
    !step.urbanLegendChecked &&
    step.isConsumableBlackCardDamage === true &&
    target.roleId === 'exp2_urban_legend' &&
    dmg > 0 &&
    !step.isHpCost &&
    !step.unpreventable
  ) {
    const ulPayload: Record<string, unknown> = {
      phase: 'urban_legend_convert',
      damageAmount: dmg,
      isConsumableBlackCardDamage: true,
      isHpCost: Boolean(step.isHpCost),
      unpreventable: Boolean(step.unpreventable),
      urbanLegendAlreadyChecked: false,
    };
    EXPANSION_SKILL_ENGINE.dispatch(state, {
      trigger: 'BEFORE_DAMAGE',
      actorPlayerId: attacker?.playerId ?? target.playerId,
      targetPlayerId: target.playerId,
      nowMs,
      payload: ulPayload,
    });
    if (ulPayload.urbanLegendEligible === true) {
      if (target.revealed) {
        markExpansionEventProcessed(state, step.damageEventId);
        const expUl = ensureExpansionState(state);
        incRoleStat(expUl.stats.activationsByRole, 'exp2_urban_legend', 1);
        incRoleStat(expUl.stats.damagePreventedByRole, 'exp2_urban_legend', dmg);
        expUl.pendingSteps.unshift({
          kind: 'HEAL',
          healEventId: nextExpansionEventId(state, 'heal-ul'),
          causationId: step.damageEventId,
          sourceCardId: step.sourceCardId,
          actorPlayerId: target.playerId,
          targetPlayerId: target.playerId,
          rawAmount: dmg,
          sourceKind: 'black-card',
          sourceLabel: 'Chuyện Kinh Dị (Urban Legend)',
          roleStatId: 'exp2_urban_legend',
          postLogKind: 'skill',
          postLogPrefix: `👻 Urban Legend (${target.displayName}) — Chuyện Kinh Dị: chuyển hóa sát thương thẻ Đen thành hồi `,
          postLogSuffix: ' HP!',
          postLogActorId: target.playerId,
          zeroLogText: `👻 Urban Legend (${target.displayName}) — Chuyện Kinh Dị: vô hiệu hóa sát thương thẻ Đen (đã đầy máu ${target.hp}/${target.maxHp}).`,
        });
        return true;
      }

      const policy = getPlayerReactionPolicy(state, target.playerId);
      if (policy === 'AUTO_DECLINE') {
        // CAP-05: Bỏ qua tức thì (<1ms), nhận sát thương bình thường, zero log!
      } else if (
        policy === 'AUTO_ACTIVATE_WHEN_ELIGIBLE' &&
        canRoleAutoActivateSecretReaction(target.roleId)
      ) {
        const justRevealed = revealPlayerNow(state, target, 'voluntary', nowMs);
        markExpansionEventProcessed(state, step.damageEventId);
        const expUl = ensureExpansionState(state);
        incRoleStat(expUl.stats.activationsByRole, 'exp2_urban_legend', 1);
        incRoleStat(expUl.stats.damagePreventedByRole, 'exp2_urban_legend', dmg);
        appendHighlight(
          state,
          `Lộ vai: ${target.displayName}`,
          `Urban Legend (${FACTION_LABELS[target.faction]}) — Chuyện Kinh Dị`,
          nowMs,
        );
        expUl.pendingSteps.unshift({
          kind: 'HEAL',
          healEventId: nextExpansionEventId(state, 'heal-ul'),
          causationId: step.damageEventId,
          sourceCardId: step.sourceCardId,
          actorPlayerId: target.playerId,
          targetPlayerId: target.playerId,
          rawAmount: dmg,
          sourceKind: 'black-card',
          sourceLabel: 'Chuyện Kinh Dị (Urban Legend)',
          roleStatId: 'exp2_urban_legend',
          postLogKind: 'reveal',
          postLogPrefix: `🎭👻 ${target.displayName} lật vai Urban Legend — Chuyện Kinh Dị: chuyển hóa sát thương thẻ Đen thành hồi `,
          postLogSuffix: ' HP!',
          postLogActorId: target.playerId,
          zeroLogText: `🎭👻 ${target.displayName} lật vai Urban Legend — Chuyện Kinh Dị: vô hiệu hóa sát thương thẻ Đen (đã đầy máu ${target.hp}/${target.maxHp}).`,
        });
        if (justRevealed) {
          enqueueRoleRevealedTrigger(state, target.playerId, 'reaction', step.chainDepth ?? 0);
        }
        return true;
      } else {
        const expUl = ensureExpansionState(state);
        expUl.pendingSteps.unshift({
          ...step,
          urbanLegendChecked: true,
          urbanLegendConverted: false,
        });
        const cardTitle = (step.sourceCardId ? getCardById(step.sourceCardId)?.title : null) ?? 'thẻ Đột Kích';
        const choiceId = nextExpansionEventId(state, 'choice-urban-legend');
        const timeoutMs = getChoiceTimeoutMs(state, target);
        state.pendingChoice = {
          choiceId,
          eventId: step.damageEventId,
          ownerPlayerId: target.playerId,
          kind: 'urban_legend_reveal_heal',
          isSecret: true,
          title: 'Chuyện Kinh Dị (Urban Legend)',
          description: `Bạn sắp nhận ${dmg} sát thương từ "${cardTitle}" (thẻ Đen dùng 1 lần). Bạn có muốn lật vai Urban Legend ngay lúc này để biến sát thương này thành hồi ${dmg} HP không?`,
          publicPromptLabel: '⏳ Đang kiểm tra phản ứng trước sát thương...',
          options: [
            {
              optionId: 'reveal_and_heal',
              label: `Lật vai Urban Legend & Hồi ${dmg} HP thay vì mất máu`,
              detail: `Công khai vai Urban Legend (Shadow) và hồi tối đa ${dmg} HP (không vượt quá ${target.maxHp} HP).`,
            },
            {
              optionId: 'decline',
              label: `Giữ kín danh tính (Chịu ${dmg} ST bình thường)`,
              detail: 'Tiếp tục ẩn vai và nhận sát thương như thông thường.',
            },
          ],
          defaultOptionId: 'decline',
          createdAtMs: nowMs,
          deadlineMs: nowMs + timeoutMs,
          data: {
            kind: 'urban_legend_reveal_heal',
            urbanLegendPlayerId: target.playerId,
            damageEventId: step.damageEventId,
            sourceCardId: step.sourceCardId ?? 'ev-07',
            rawAmount: dmg,
          },
        };
        return false;
      }
    }
  }

  if (step.undyingChecked) {
    // Tiếp tục sau khi Undying đã đưa ra quyết định bí mật (tránh chạy lặp Holy Robe / G43)
    dmg = typeof step.preUndyingDmg === 'number' ? Math.max(0, step.preUndyingDmg) : dmg;
    if (step.undyingReduced && dmg >= 2) {
      dmg = Math.max(0, dmg - 1);
    }
  } else if (dmg > 0 && !step.isHpCost && !step.unpreventable) {
    if (step.sourceType === 'attack' && target.guardianShieldActive) {
      appendPublicLog(
        state,
        'skill',
        `🛡️ Lá Chắn Thiên Thần che chở ${target.displayName} — miễn nhiễm đòn đánh!`,
        nowMs,
        target.playerId,
      );
      dmg = 0;
    } else if (step.sourceType === 'location' && target.equipped.includes('eq-02')) {
      appendPublicLog(
        state,
        'equipment',
        `🍀 Ghim Cài May Mắn bảo vệ ${target.displayName} khỏi bẫy Ô 9 (0 sát thương)!`,
        nowMs,
        target.playerId,
      );
      dmg = 0;
    } else if (step.isTalismanWardable && target.equipped.includes('eq-03')) {
      appendPublicLog(
        state,
        'equipment',
        `🧿 Bùa Hộ Mệnh bảo vệ ${target.displayName} — miễn nhiễm sát thương từ thẻ Đột Kích!`,
        nowMs,
        target.playerId,
      );
      dmg = 0;
    } else {
      // Witch tại chính xác Weird Woods (`corridor`): miễn toàn bộ sát thương HP (không phải hp-cost/unpreventable) TRƯỚC khi trừ giáp!
      const isWitchAtSanctuary =
        target.revealed &&
        target.roleId === 'exp2_witch' &&
        isPlayerAtExactLocationAlias(target, 'weird_woods');

      if (!isWitchAtSanctuary && step.sourceType === 'attack' && target.equipped.includes('eq-01')) {
        dmg = Math.max(0, dmg - 1);
      }

      // Dispatch BEFORE_DAMAGE qua SkillEngine (Witch priority 15 -> G43 priority 20 -> Undying priority 30)
      if (dmg > 0) {
        const beforeDamagePayload: Record<string, unknown> = {
          damageEventId: step.damageEventId,
          damageAmount: dmg,
          sourceType: step.sourceType,
          isHpCost: Boolean(step.isHpCost),
          unpreventable: Boolean(step.unpreventable),
          isRetaliation: Boolean(step.isRetaliation),
          undyingAlreadyChecked: Boolean(step.undyingChecked),
        };
        EXPANSION_SKILL_ENGINE.dispatch(state, {
          trigger: 'BEFORE_DAMAGE',
          actorPlayerId: attacker?.playerId ?? target.playerId,
          targetPlayerId: target.playerId,
          nowMs,
          payload: beforeDamagePayload,
        });
        dmg = Math.max(0, Number(beforeDamagePayload.damageAmount ?? dmg));

        const pendingUndying = beforeDamagePayload.pendingUndyingChoice as
          | {
              undyingPlayerId: string;
              damageEventId: string;
              preUndyingDmg: number;
              sourceType: DamageSourceKind;
            }
          | undefined;

        if (pendingUndying && target.alive && !target.revealed && dmg >= 2) {
          const policy = getPlayerReactionPolicy(state, target.playerId);
          if (policy === 'AUTO_DECLINE') {
            // CAP-05: Bỏ qua tức thì (<1ms), không mở choice, không log công khai!
          } else if (
            policy === 'AUTO_ACTIVATE_WHEN_ELIGIBLE' &&
            canRoleAutoActivateSecretReaction(target.roleId)
          ) {
            const justRevealed = revealPlayerNow(state, target, 'voluntary', nowMs);
            const prevDmg = dmg;
            dmg = Math.max(0, dmg - 1);
            const expStat = ensureExpansionState(state);
            incRoleStat(expStat.stats.activationsByRole, 'exp1_undying', 1);
            incRoleStat(expStat.stats.damagePreventedByRole, 'exp1_undying', prevDmg - dmg);
            appendPublicLog(
              state,
              'reveal',
              `🎭🛡️ ${target.displayName} lật vai Undying — Mạ Sắt: giảm 1 sát thương (${prevDmg} → ${dmg})!`,
              nowMs,
              target.playerId,
            );
            appendHighlight(
              state,
              `Lộ vai: ${target.displayName}`,
              `Undying (${FACTION_LABELS[target.faction]}) — Mạ Sắt`,
              nowMs,
            );
            if (justRevealed) {
              enqueueRoleRevealedTrigger(state, target.playerId, 'reaction', step.chainDepth ?? 0);
            }
          } else {
            const expQueue = ensureExpansionState(state);
            expQueue.pendingSteps.unshift({
              ...step,
              undyingChecked: true,
              preUndyingDmg: dmg,
              undyingReduced: false,
            });
            const choiceId = nextExpansionEventId(state, 'choice-undying');
            const timeoutMs = getChoiceTimeoutMs(state, target);
            state.pendingChoice = {
              choiceId,
              eventId: step.damageEventId,
              ownerPlayerId: target.playerId,
              kind: 'undying_reveal_reduce',
              isSecret: true,
              title: 'Mạ Sắt (Undying)',
              description: `Bạn sắp chịu ${dmg} sát thương (sau giảm thương trang bị). Bạn có muốn lật vai Undying ngay lúc này để giảm 1 sát thương (${dmg} → ${dmg - 1}) không?`,
              publicPromptLabel: '⏳ Đang kiểm tra phản ứng trước sát thương...',
              options: [
                {
                  optionId: 'reveal_and_reduce',
                  label: `Lật vai Undying & Giảm 1 ST (${dmg} → ${dmg - 1})`,
                  detail: `Công khai vai Undying (Shadow) và chỉ nhận ${dmg - 1} sát thương.`,
                },
                {
                  optionId: 'decline',
                  label: `Giữ kín danh tính (Nhận đủ ${dmg} ST)`,
                  detail: 'Tiếp tục ẩn vai và không giảm sát thương.',
                },
              ],
              defaultOptionId: 'decline',
              createdAtMs: nowMs,
              deadlineMs: nowMs + timeoutMs,
              data: {
                kind: 'undying_reveal_reduce',
                undyingPlayerId: target.playerId,
                damageEventId: step.damageEventId,
                preUndyingDmg: dmg,
                sourceType: step.sourceType,
              },
            };
            return false;
          }
        }
      }
    }
  }

  const actual = dmg > 0 ? Math.min(target.hp, dmg) : 0;
  if (actual > 0) {
    target.woundsTaken += actual;
    target.hp = Math.max(0, target.maxHp - target.woundsTaken);
  }
  markExpansionEventProcessed(state, step.damageEventId);

  // Ghi log đơn mục tiêu hoặc log tùy chỉnh sau khi damage thực tế đã commit
  if (step.attackSingleTargetLog && attacker) {
    appendPublicLog(
      state,
      'attack',
      step.rawAmount === 0
        ? `⚔️ ${attacker.displayName} đánh ${target.displayName} (${step.attackSingleTargetLog.rollDesc}) → ĐÁNH HỤT (0 sát thương)!`
        : `⚔️ ${attacker.displayName} tấn công ${target.displayName} (${step.attackSingleTargetLog.rollDesc}, tổng ${step.rawAmount}) → gây ${actual} sát thương!`,
      nowMs,
      attacker.playerId,
    );
  } else if (step.postLogPrefix && step.postLogKind) {
    appendPublicLog(
      state,
      step.postLogKind,
      `${step.postLogPrefix}${actual}${step.postLogSuffix ?? ''}`,
      nowMs,
      step.postLogActorId ?? undefined,
    );
  }

  // Fujiko (Kết Thúc Rồi — Phase 4B house rule):
  // Đã lộ diện + đòn tấn công thường gây >= 1 ST thực sự (`actual >= 1`) lên mục tiêu đã lộ diện
  // có <= 4 HP trước đòn đánh (`preAttackTargetHp <= 4`) -> kết liễu trong CHÍNH pipeline loại chuẩn bên dưới!
  const exp = ensureExpansionState(state);
  let fujikoExecExtra = 0;
  if (
    actual >= 1 &&
    target.alive &&
    target.hp > 0 &&
    step.sourceType === 'attack' &&
    attacker &&
    attacker.alive &&
    attacker.revealed &&
    attacker.roleId === 'exp2_fujiko' &&
    step.preAttackTargetRevealed === true &&
    typeof step.preAttackTargetHp === 'number' &&
    step.preAttackTargetHp <= 4
  ) {
    const fujikoPayload: Record<string, unknown> = {
      sourceType: step.sourceType,
      actualDealt: actual,
      preAttackTargetHp: step.preAttackTargetHp,
      preAttackTargetRevealed: step.preAttackTargetRevealed,
    };
    EXPANSION_SKILL_ENGINE.dispatch(state, {
      trigger: 'AFTER_ATTACK',
      actorPlayerId: attacker.playerId,
      targetPlayerId: target.playerId,
      nowMs,
      payload: fujikoPayload,
    });
    if (fujikoPayload.fujikoExecute === true) {
      fujikoExecExtra = target.hp;
      target.woundsTaken += fujikoExecExtra;
      target.hp = 0;
      incRoleStat(exp.stats.activationsByRole, 'exp2_fujiko', 1);
      incRoleStat(exp.stats.bonusDamageByRole, 'exp2_fujiko', fujikoExecExtra);
      appendPublicLog(
        state,
        'skill',
        `🗡️ Fujiko (${attacker.displayName}) — Kết Thúc Rồi: hạ gục tức thì ${target.displayName} (đã lộ diện, ${step.preAttackTargetHp} HP ≤ 4 trước đòn đánh)!`,
        nowMs,
        attacker.playerId,
      );
    }
  }

  // Cập nhật bộ đếm cho các bước POST_ATTACK_EFFECTS / VAMPIRE_BAT_HEAL / SPIDER_SELF_DAMAGE đứng sau
  if (step.sourceType === 'attack') {
    const postAtk = exp.pendingSteps.find(
      (s): s is Extract<PendingResolutionStep, { kind: 'POST_ATTACK_EFFECTS' }> =>
        s.kind === 'POST_ATTACK_EFFECTS' && s.attackerPlayerId === step.attackerPlayerId,
    );
    if (postAtk) {
      postAtk.totalDealt += actual + fujikoExecExtra;
      if (target.alive && target.hp > 0 && target.revealed && target.roleId === 'suong-gac-cong') {
        if (!postAtk.counterAttackerIds.includes(target.playerId)) {
          postAtk.counterAttackerIds.push(target.playerId);
        }
      }
    }
  } else if (step.sourceType === 'event') {
    const nextStep = exp.pendingSteps[0];
    if (nextStep?.kind === 'VAMPIRE_BAT_HEAL' && nextStep.targetPlayerId === target.playerId) {
      nextStep.dealtToTarget = actual;
    } else if (
      nextStep?.kind === 'SPIDER_SELF_DAMAGE' &&
      nextStep.targetPlayerId === target.playerId
    ) {
      nextStep.dealtToTarget = actual;
    }
  }

  // Kiểm tra hạ gục & xếp hàng ELIMINATION_TRIGGERS (chạy TRƯỚC victory check!)
  if (actual > 0 && target.hp <= 0) {
    const victimFactionAtDeath = target.faction;
    target.hp = 0;
    target.alive = false;
    target.eliminatedRound = state.round;
    target.eliminatedByPlayerId = attacker ? attacker.playerId : null;
    target.revealed = true;

    const deadCountNow = Object.values(state.players).filter((p) => !p.alive).length;
    if (!state.firstDeadPlayerId) {
      state.firstDeadPlayerId = target.playerId;
    }

    const role = getRoleDesign(target.roleId);
    state.lastRevealEvent = {
      id: `rev-${state.turnNumber}-${target.playerId}-${nowMs}`,
      round: state.round,
      atMs: nowMs,
      playerId: target.playerId,
      displayName: target.displayName,
      roleId: target.roleId,
      roleName: role.name,
      faction: target.faction,
      reason: 'eliminated',
    };

    appendPublicLog(
      state,
      'elimination',
      `💀 ${target.displayName} đã bị loại — lộ diện vai ${role.name} (${FACTION_LABELS[target.faction]})!`,
      nowMs,
      attacker?.playerId ?? target.playerId,
    );
    appendHighlight(
      state,
      `Loại khỏi KTX: ${target.displayName}`,
      `${target.displayName} (${role.name}) gục ngã ở vòng ${state.round}.`,
      nowMs,
    );

    // Đạt "Cảm Tử" (Daniel — Scream)
    if (deadCountNow === 1) {
      for (const other of Object.values(state.players)) {
        if (
          other.playerId !== target.playerId &&
          other.alive &&
          !other.revealed &&
          other.roleId === 'lang-tien-phong'
        ) {
          revealPlayerNow(state, other, 'voluntary', nowMs);
          appendPublicLog(
            state,
            'reveal',
            `🗣️ Tiếng Hét Lộ Diện: ${other.displayName} (Đạt "Cảm Tử") buộc phải lật vai khi có người đầu tiên gục ngã!`,
            nowMs,
            other.playerId,
          );
        }
      }
    }

    // Bách "Cuồng Chiến" (Charles)
    if (
      attacker &&
      attacker.alive &&
      attacker.playerId !== target.playerId &&
      step.sourceType === 'attack' &&
      attacker.roleId === 'lang-cuu-ho' &&
      deadCountNow >= 3
    ) {
      attacker.charlesKillWon = true;
    }

    // Cruz (Phase 4B house rule): thắng ngay khi tự tay hạ gục 1 người chơi khác trong chính lượt đã kích hoạt
    // Vampire Bat (ev-07), Bloodthirsty Spider (ev-08), Dynamite (ev-09) hoặc Spiritual Doll (ev-10)!
    if (
      attacker &&
      attacker.alive &&
      attacker.playerId !== target.playerId &&
      attacker.roleId === 'exp2_cruz' &&
      (exp.cruzQualifyingCardTurnByPlayer?.[attacker.playerId] === state.turnNumber ||
        isCruzQualifyingCardId(step.sourceCardId))
    ) {
      if (!exp.cruzWinTriggeredIds) exp.cruzWinTriggeredIds = [];
      if (!exp.cruzWinTriggeredIds.includes(attacker.playerId)) {
        exp.cruzWinTriggeredIds.push(attacker.playerId);
      }
    }

    // Arlene (Phase 5B house rule): thắng cá nhân tức thì nếu bị hạ gục bởi một nhân vật phe Hunter (`lantern-guard`).
    if (
      target.roleId === 'exp2_arlene' &&
      attacker &&
      attacker.playerId !== target.playerId &&
      attacker.faction === 'lantern-guard'
    ) {
      if (!exp.arleneHunterKillTriggeredIds) exp.arleneHunterKillTriggeredIds = [];
      if (!exp.arleneHunterKillTriggeredIds.includes(target.playerId)) {
        exp.arleneHunterKillTriggeredIds.push(target.playerId);
      }
    }

    // Chiến lợi phẩm khi hạ gục
    if (
      attacker &&
      attacker.alive &&
      attacker.playerId !== target.playerId &&
      target.equipped.length > 0
    ) {
      const lootAll =
        step.sourceType === 'attack' &&
        (attacker.equipped.includes('eq-06') ||
          (attacker.revealed &&
            attacker.roleId === 'lang-anh-san' &&
            state.turnOrder.length >= 7));
      if (lootAll) {
        const lootedList = stealAllEquippedGear(attacker, target);
        if (lootedList.length > 0) {
          appendPublicLog(
            state,
            'steal',
            `🏆 ${attacker.displayName} thu giữ toàn bộ ${lootedList.length} Trang bị từ ${target.displayName} (${lootedList.map((c) => c.title).join(', ')})!`,
            nowMs,
            attacker.playerId,
          );
        }
      } else {
        const looted = stealOneEquippedGear(state, attacker, target);
        if (looted) {
          appendPublicLog(
            state,
            'steal',
            `🏆 ${attacker.displayName} thu giữ "${looted.title}" từ ${target.displayName}!`,
            nowMs,
            attacker.playerId,
          );
        }
      }
    }

    while (target.equipped.length > 0) {
      const id = target.equipped.shift();
      if (id) discardCardId(state, id);
    }
    while (target.hand.length > 0) {
      const id = target.hand.shift();
      if (id) discardCardId(state, id);
    }
    discardGloriaQueuedCards(state, target.playerId);

    // Chèn ngay ELIMINATION_TRIGGERS lên đầu hàng đợi để chạy trước Victory Check
    exp.pendingSteps.unshift({
      kind: 'ELIMINATION_TRIGGERS',
      eliminationEventId: nextExpansionEventId(state, 'elim'),
      causationId: step.damageEventId,
      ...(step.sourceCardId ? { sourceCardId: step.sourceCardId } : {}),
      turnNumberAtElimination: state.turnNumber,
      victimPlayerId: target.playerId,
      victimFactionAtDeath,
      killerPlayerId: attacker?.playerId ?? null,
      sourceType: step.sourceType,
      wyvernChecked: false,
      vengeanceChecked: false,
      wendigoCheckedIds: [],
    });
  } else if (
    actual >= 1 &&
    target.alive &&
    target.hp > 0 &&
    step.attackerPlayerId &&
    step.attackerPlayerId !== target.playerId &&
    !step.isRetaliation &&
    step.sourceType !== 'retaliation' &&
    !step.isHpCost &&
    step.sourceType !== 'hp-cost'
  ) {
    // Bước 8 trong Damage Pipeline: AFTER_DAMAGE reactions (Cindy phản kích 1 ST khi sống sót!)
    exp.pendingSteps.unshift({
      kind: 'AFTER_DAMAGE_TRIGGERS',
      afterDamageEventId: nextExpansionEventId(state, 'after-dmg'),
      sourceDamageEventId: step.damageEventId,
      targetPlayerId: target.playerId,
      attackerPlayerId: step.attackerPlayerId,
      actualDealt: actual,
      sourceType: step.sourceType,
      isRetaliation: false,
      isHpCost: false,
      cindyChecked: false,
    });
  }

  return true;
}

function executeAfterDamageTriggersStep(
  state: AuthoritativeGameState,
  step: Extract<PendingResolutionStep, { kind: 'AFTER_DAMAGE_TRIGGERS' }>,
  nowMs: number,
): boolean {
  if (hasProcessedExpansionEvent(state, step.afterDamageEventId)) {
    return true;
  }

  const target = state.players[step.targetPlayerId];
  const attacker = step.attackerPlayerId ? state.players[step.attackerPlayerId] ?? null : null;
  if (!target || !target.alive || !attacker || !attacker.alive) {
    markExpansionEventProcessed(state, step.afterDamageEventId);
    return true;
  }

  const payload: Record<string, unknown> = {
    sourceDamageEventId: step.sourceDamageEventId,
    attackerPlayerId: step.attackerPlayerId,
    actualDealt: step.actualDealt,
    sourceType: step.sourceType,
    isRetaliation: Boolean(step.isRetaliation),
    isHpCost: Boolean(step.isHpCost),
    cindyAlreadyChecked: Boolean(step.cindyChecked),
  };

  EXPANSION_SKILL_ENGINE.dispatch(state, {
    trigger: 'AFTER_DAMAGE',
    actorPlayerId: attacker.playerId,
    targetPlayerId: target.playerId,
    nowMs,
    payload,
  });

  step.cindyChecked = Boolean(payload.cindyAlreadyChecked);

  if (payload.cindyAutoRetaliate === true) {
    const exp = ensureExpansionState(state);
    incRoleStat(exp.stats.activationsByRole, 'exp1_cindy', 1);
    incRoleStat(exp.stats.bonusDamageByRole, 'exp1_cindy', 1);
    markExpansionEventProcessed(state, step.afterDamageEventId);
    exp.pendingSteps.unshift({
      kind: 'DAMAGE',
      damageEventId: nextExpansionEventId(state, 'dmg-retaliate'),
      causationId: step.sourceDamageEventId,
      targetPlayerId: attacker.playerId,
      rawAmount: 1,
      sourceType: 'retaliation',
      attackerPlayerId: target.playerId,
      isRetaliation: true,
      isSingleTarget: true,
      postLogKind: 'skill',
      postLogPrefix: `🌙 Cindy (${target.displayName}) — Con Ác Mộng: phản kích ${attacker.displayName} gây `,
      postLogSuffix: ' sát thương!',
      postLogActorId: target.playerId,
    });
    return true;
  }

  const pendingCindy = payload.pendingCindyChoice as
    | { cindyPlayerId: string; sourceDamageEventId: string; attackerPlayerId: string }
    | undefined;

  if (pendingCindy && target.alive && !target.revealed) {
    const exp = ensureExpansionState(state);
    markExpansionEventProcessed(state, step.afterDamageEventId);
    const policy = getPlayerReactionPolicy(state, target.playerId);
    if (policy === 'AUTO_DECLINE') {
      // CAP-05: Bỏ qua tức thì (<1ms), không mở choice, không log công khai!
      return true;
    }
    if (
      policy === 'AUTO_ACTIVATE_WHEN_ELIGIBLE' &&
      canRoleAutoActivateSecretReaction(target.roleId)
    ) {
      const justRevealed = revealPlayerNow(state, target, 'voluntary', nowMs);
      incRoleStat(exp.stats.activationsByRole, 'exp1_cindy', 1);
      incRoleStat(exp.stats.bonusDamageByRole, 'exp1_cindy', 1);
      appendHighlight(
        state,
        `Lộ vai: ${target.displayName}`,
        `Cindy (${FACTION_LABELS[target.faction]}) — Con Ác Mộng`,
        nowMs,
      );
      exp.pendingSteps.unshift({
        kind: 'DAMAGE',
        damageEventId: nextExpansionEventId(state, 'dmg-retaliate'),
        causationId: step.sourceDamageEventId,
        targetPlayerId: attacker.playerId,
        rawAmount: 1,
        sourceType: 'retaliation',
        attackerPlayerId: target.playerId,
        isRetaliation: true,
        isSingleTarget: true,
        postLogKind: 'reveal',
        postLogPrefix: `🎭🌙 ${target.displayName} lật vai Cindy — Con Ác Mộng: phản kích ${attacker.displayName} gây `,
        postLogSuffix: ' sát thương!',
        postLogActorId: target.playerId,
      });
      if (justRevealed) {
        enqueueRoleRevealedTrigger(state, target.playerId, 'reaction', 0);
      }
      return true;
    }

    const choiceId = nextExpansionEventId(state, 'choice-cindy');
    const timeoutMs = getChoiceTimeoutMs(state, target);
    state.pendingChoice = {
      choiceId,
      eventId: step.sourceDamageEventId,
      ownerPlayerId: target.playerId,
      kind: 'cindy_reveal_retaliate',
      isSecret: true,
      title: 'Con Ác Mộng (Cindy)',
      description: `${attacker.displayName} vừa gây ${step.actualDealt} sát thương cho bạn (còn ${target.hp}/${target.maxHp} HP). Bạn có muốn lật vai Cindy ngay lúc này để phản kích gây 1 sát thương cho ${attacker.displayName} không?`,
      publicPromptLabel: '⏳ Đang kiểm tra phản ứng sau sát thương...',
      options: [
        {
          optionId: 'reveal_and_retaliate',
          label: `Lật vai Cindy & Phản kích 1 ST vào ${attacker.displayName}`,
          detail: 'Công khai vai Cindy (Neutral) và gây 1 sát thương phản kích (không thể lặp phản đòn).',
        },
        {
          optionId: 'decline',
          label: 'Giữ kín danh tính (Không phản kích)',
          detail: 'Tiếp tục ẩn vai và không gây sát thương phản kích.',
        },
      ],
      defaultOptionId: 'decline',
      createdAtMs: nowMs,
      deadlineMs: nowMs + timeoutMs,
      data: {
        kind: 'cindy_reveal_retaliate',
        cindyPlayerId: target.playerId,
        sourceDamageEventId: step.sourceDamageEventId,
        attackerPlayerId: attacker.playerId,
        attackerDisplayName: attacker.displayName,
      },
    };
    return false;
  }

  markExpansionEventProcessed(state, step.afterDamageEventId);
  return true;
}

function executeEliminationTriggersStep(
  state: AuthoritativeGameState,
  step: Extract<PendingResolutionStep, { kind: 'ELIMINATION_TRIGGERS' }>,
  nowMs: number,
): boolean {
  if (hasProcessedExpansionEvent(state, step.eliminationEventId)) {
    return true;
  }

  const victim = state.players[step.victimPlayerId];
  const payload: Record<string, unknown> = {
    eliminationEventId: step.eliminationEventId,
    victimPlayerId: step.victimPlayerId,
    victimFactionAtDeath: step.victimFactionAtDeath,
    killerPlayerId: step.killerPlayerId,
    sourceType: step.sourceType,
    wyvernAlreadyResolved: Boolean(step.wyvernChecked),
    vengeanceAlreadyChecked: Boolean(step.vengeanceChecked),
    wendigoCheckedIds: [...(step.wendigoCheckedIds ?? [])],
  };

  EXPANSION_SKILL_ENGINE.dispatch(state, {
    trigger: 'ON_ELIMINATION',
    actorPlayerId: step.killerPlayerId ?? step.victimPlayerId,
    targetPlayerId: step.victimPlayerId,
    nowMs,
    payload,
  });

  step.wyvernChecked = Boolean(payload.wyvernAlreadyResolved);
  step.vengeanceChecked = Boolean(payload.vengeanceAlreadyChecked);
  step.wendigoCheckedIds = Array.isArray(payload.wendigoCheckedIds)
    ? [...(payload.wendigoCheckedIds as string[])]
    : [];

  if (payload.pausedForHealChoice === true) {
    const exp = ensureExpansionState(state);
    // Giữ lại ELIMINATION_TRIGGERS ngay sau bước HEAL đang tạm dừng để tiếp tục Vengeance / Wendigo!
    const firstIsHeal = exp.pendingSteps[0]?.kind === 'HEAL';
    if (firstIsHeal) {
      exp.pendingSteps.splice(1, 0, step);
    } else {
      exp.pendingSteps.unshift(step);
    }
    return false;
  }

  // Vengeance (priority 15 — chạy sau Wyvern, trước Wendigo!)
  const pendingVengeance = payload.pendingVengeanceChoice as
    | {
        vengeancePlayerId: string;
        eliminationEventId: string;
        victimPlayerId: string;
        candidateTargetIds: string[];
      }
    | undefined;

  if (pendingVengeance) {
    const vengeance = state.players[pendingVengeance.vengeancePlayerId];
    if (vengeance && vengeance.alive && vengeance.revealed && !vengeance.skillUsedOnce) {
      const liveCandidates = pendingVengeance.candidateTargetIds
        .map((id) => state.players[id])
        .filter(
          (p): p is AuthoritativePlayerState =>
            Boolean(p && p.alive && p.playerId !== vengeance.playerId),
        );
      if (liveCandidates.length > 0) {
        const exp = ensureExpansionState(state);
        // Đặt lại step lên đầu hàng đợi để Wendigo vẫn chạy sau khi Vengeance xử lý xong!
        exp.pendingSteps.unshift(step);

        const choiceId = nextExpansionEventId(state, 'choice-vengeance');
        const timeoutMs = getChoiceTimeoutMs(state, vengeance);
        const targetMap: Record<string, string[]> = {};
        const options: BoardGameChoiceOptionView[] = [];

        if (liveCandidates.length === 1) {
          const sole = liveCandidates[0];
          targetMap.v_0 = [sole.playerId];
          options.push({
            optionId: 'v_0',
            label: `Kích hoạt 1d4 lên ${sole.displayName} (1 mục tiêu còn lại)`,
            detail: `Dùng 1 lần/trận: tung 1d4 gây sát thương kỹ năng lên ${sole.displayName}.`,
            targetPlayerId: sole.playerId,
          });
        } else {
          for (let i = 0; i < liveCandidates.length; i++) {
            for (let j = i + 1; j < liveCandidates.length; j++) {
              const a = liveCandidates[i];
              const b = liveCandidates[j];
              const optId = `v_${i}_${j}`;
              targetMap[optId] = [a.playerId, b.playerId];
              options.push({
                optionId: optId,
                label: `1d4 → ${a.displayName} & ${b.displayName}`,
                detail: `Dùng 1 lần/trận: tung 1 xúc xắc 1d4 duy nhất áp dụng cho cả ${a.displayName} và ${b.displayName}.`,
                targetPlayerId: a.playerId,
              });
            }
          }
        }
        options.push({
          optionId: 'skip',
          label: 'Bỏ qua lần này (Giữ nguyên 1 lần/trận)',
          detail: 'Không kích hoạt kỹ năng và giữ lại lượt dùng duy nhất cho lần hạ gục khác.',
        });

        const victimName = victim?.displayName ?? '1 người chơi';
        state.pendingChoice = {
          choiceId,
          eventId: step.eliminationEventId,
          ownerPlayerId: vengeance.playerId,
          kind: 'vengeance_chain_strike',
          isSecret: false,
          title: 'Báo Thù Liên Hoàn (Vengeance · 1 lần/trận)',
          description: `Bạn vừa hạ gục ${victimName}! Chọn ${liveCandidates.length >= 2 ? '2 người chơi khác' : 'người chơi còn lại'} để cùng nhận 1d4 sát thương kỹ năng (1 lần/trận; bỏ qua không mất lượt dùng).`,
          publicPromptLabel: `⚡ Vengeance (${vengeance.displayName}) đang cân nhắc tung Báo Thù Liên Hoàn (1d4)...`,
          options,
          defaultOptionId: 'skip',
          createdAtMs: nowMs,
          deadlineMs: nowMs + timeoutMs,
          data: {
            kind: 'vengeance_chain_strike',
            vengeancePlayerId: vengeance.playerId,
            eliminationEventId: step.eliminationEventId,
            victimPlayerId: step.victimPlayerId,
            targetMap,
          },
        };
        return false;
      }
    }
  }

  const pendingWendigo = payload.pendingWendigoChoice as
    | { wendigoPlayerId: string; eliminationEventId: string; victimPlayerId: string }
    | undefined;

  if (pendingWendigo) {
    const wendigo = state.players[pendingWendigo.wendigoPlayerId];
    if (wendigo && wendigo.alive && !wendigo.revealed) {
      const exp = ensureExpansionState(state);
      const policy = getPlayerReactionPolicy(state, wendigo.playerId);
      if (policy === 'AUTO_DECLINE') {
        // CAP-05: Bỏ qua tức thì (<1ms), tiếp tục kiểm tra các phản ứng khác trên chính step này!
        exp.pendingSteps.unshift(step);
        return true;
      }
      if (
        policy === 'AUTO_ACTIVATE_WHEN_ELIGIBLE' &&
        canRoleAutoActivateSecretReaction(wendigo.roleId)
      ) {
        const justRevealed = revealPlayerNow(state, wendigo, 'voluntary', nowMs);
        incRoleStat(exp.stats.activationsByRole, 'exp1_wendigo', 1);
        appendHighlight(
          state,
          `Lộ vai: ${wendigo.displayName}`,
          `Wendigo (${FACTION_LABELS[wendigo.faction]}) — Tiệc Thịt`,
          nowMs,
        );
        exp.pendingSteps.unshift(
          {
            kind: 'HEAL',
            healEventId: nextExpansionEventId(state, 'heal-wendigo'),
            actorPlayerId: wendigo.playerId,
            targetPlayerId: wendigo.playerId,
            rawAmount: 1,
            sourceKind: 'skill',
            sourceLabel: 'Tiệc Thịt (Wendigo)',
            roleStatId: 'exp1_wendigo',
            postLogKind: 'reveal',
            postLogPrefix: `🎭🩸 ${wendigo.displayName} lật vai Wendigo — Tiệc Thịt: hồi `,
            postLogSuffix: ' HP!',
            postLogActorId: wendigo.playerId,
          },
          step,
        );
        if (justRevealed) {
          enqueueRoleRevealedTrigger(state, wendigo.playerId, 'reaction', 0);
        }
        return true;
      }

      // Đặt lại step lên đầu hàng đợi để hoàn tất sau khi Wendigo quyết định
      exp.pendingSteps.unshift(step);

      const choiceId = nextExpansionEventId(state, 'choice-wendigo');
      const timeoutMs = getChoiceTimeoutMs(state, wendigo);
      const victimName = victim?.displayName ?? '1 người chơi';
      state.pendingChoice = {
        choiceId,
        eventId: step.eliminationEventId,
        ownerPlayerId: wendigo.playerId,
        kind: 'wendigo_reveal_heal',
        isSecret: true,
        title: 'Tiệc Thịt (Wendigo)',
        description: `${victimName} vừa bị loại! Bạn có muốn lật vai Wendigo ngay lúc này để hồi 1 HP (hiện ${wendigo.hp}/${wendigo.maxHp} HP) không?`,
        publicPromptLabel: '⏳ Đang kiểm tra phản ứng sau sự kiện...',
        options: [
          {
            optionId: 'reveal_and_activate',
            label: `Lật vai Wendigo & Hồi 1 HP (${Math.min(wendigo.maxHp, wendigo.hp + 1)}/${wendigo.maxHp})`,
            detail: 'Công khai vai Wendigo (Shadow) và hồi 1 HP (không vượt quá 14 HP).',
          },
          {
            optionId: 'decline',
            label: 'Giữ kín danh tính (Không kích hoạt)',
            detail: 'Tiếp tục ẩn vai và không hồi máu.',
          },
        ],
        defaultOptionId: 'decline',
        createdAtMs: nowMs,
        deadlineMs: nowMs + timeoutMs,
        data: {
          kind: 'wendigo_reveal_heal',
          wendigoPlayerId: wendigo.playerId,
          eliminationEventId: step.eliminationEventId,
          victimPlayerId: step.victimPlayerId,
          victimDisplayName: victimName,
        },
      };
      return false;
    }
  }

  markExpansionEventProcessed(state, step.eliminationEventId);
  return true;
}

function executeHealStep(
  state: AuthoritativeGameState,
  step: Extract<PendingResolutionStep, { kind: 'HEAL' }>,
  nowMs: number,
): boolean {
  const res = executeHealPipeline(
    state,
    {
      healEventId: step.healEventId,
      actorPlayerId: step.actorPlayerId,
      targetPlayerId: step.targetPlayerId,
      rawAmount: step.rawAmount,
      sourceKind: step.sourceKind,
      sourceCardId: step.sourceCardId,
      sourceLabel: step.sourceLabel,
      roleStatId: step.roleStatId,
      usurperChecked: step.usurperChecked,
      usurperBlocked: step.usurperBlocked,
      postLogKind: step.postLogKind,
      postLogPrefix: step.postLogPrefix,
      postLogSuffix: step.postLogSuffix,
      postLogActorId: step.postLogActorId,
      zeroLogText: step.zeroLogText,
      blockedLogText: step.blockedLogText,
    },
    nowMs,
    createExpandedHealHooks(),
  );
  return !res.pendingChoiceOpened;
}

function executeRoleRevealedTriggersStep(
  state: AuthoritativeGameState,
  step: Extract<PendingResolutionStep, { kind: 'ROLE_REVEALED_TRIGGERS' }>,
  nowMs: number,
): boolean {
  if (hasProcessedExpansionEvent(state, step.revealEventId)) {
    return true;
  }
  const revealedPlayer = state.players[step.revealedPlayerId];
  if (!revealedPlayer || !revealedPlayer.alive || !revealedPlayer.revealed) {
    markExpansionEventProcessed(state, step.revealEventId);
    return true;
  }

  // CAP-06: Dispatch ON_REVEAL cho các vai trò kích hoạt khi lộ diện (Phase 5B Umibozu, v.v.)
  const payload: Record<string, unknown> = {
    revealEventId: step.revealEventId,
    revealedPlayerId: step.revealedPlayerId,
    revealCause: step.revealCause,
    umibozuChecked: Boolean(step.umibozuChecked),
    chainDepth: step.chainDepth ?? 0,
  };
  EXPANSION_SKILL_ENGINE.dispatch(state, {
    trigger: 'ON_ROLE_REVEAL',
    actorPlayerId: revealedPlayer.playerId,
    targetPlayerId: revealedPlayer.playerId,
    nowMs,
    payload,
  });

  const queuedSteps = Array.isArray(payload.queuedRevealSteps)
    ? (payload.queuedRevealSteps as PendingResolutionStep[])
    : [];
  if (queuedSteps.length > 0) {
    const exp = ensureExpansionState(state);
    exp.pendingSteps.unshift(...queuedSteps);
  }

  markExpansionEventProcessed(state, step.revealEventId);
  return true;
}

export function drainPendingSteps(
  state: AuthoritativeGameState,
  nowMs: number,
  callbacks: TurnContinuationCallbacks,
): void {
  const exp = ensureExpansionState(state);
  let guard = 0;

  while (
    exp.pendingSteps.length > 0 &&
    !state.pendingChoice &&
    !state.finished &&
    guard < MAX_PENDING_STEPS_DRAIN
  ) {
    guard += 1;
    const step = exp.pendingSteps.shift()!;

    switch (step.kind) {
      case 'DAMAGE': {
        const completed = executeDamageStep(state, step, nowMs);
        if (!completed) return;
        break;
      }

      case 'HEAL': {
        const completed = executeHealStep(state, step, nowMs);
        if (!completed) return;
        break;
      }

      case 'ROLE_REVEALED_TRIGGERS': {
        const completed = executeRoleRevealedTriggersStep(state, step, nowMs);
        if (!completed) return;
        break;
      }

      case 'GWENDOLEN_COUNTER':
      case 'FREYJA_EXTRA_ATTACK_CHECK': {
        // CAP-06 Phase 5A foundation stubs — handlers wired in Phase 5C.
        break;
      }

      case 'AFTER_DAMAGE_TRIGGERS': {
        const completed = executeAfterDamageTriggersStep(state, step, nowMs);
        if (!completed) return;
        break;
      }

      case 'ELIMINATION_TRIGGERS': {
        const completed = executeEliminationTriggersStep(state, step, nowMs);
        if (!completed) return;
        break;
      }

      case 'POST_ATTACK_EFFECTS': {
        const actor = state.players[step.attackerPlayerId];
        if (!actor) break;

        if (step.targetCount > 1) {
          appendPublicLog(
            state,
            'attack',
            `🔫 Súng Liên Thanh! ${actor.displayName} xả đạn (${step.rollDesc}, tổng ${step.rawDmg}) vào ${step.targetCount} người trong tầm → tổng ${step.totalDealt} sát thương!`,
            nowMs,
            actor.playerId,
          );
        }

        state.lastDiceRoll = {
          id: `atk-${state.turnNumber}-${nowMs}`,
          round: state.round,
          atMs: nowMs,
          playerId: actor.playerId,
          displayName: actor.displayName,
          kind: 'attack',
          d6: step.d6,
          d4: step.d4,
          total: step.rawDmg,
          rerollRequired: false,
          freeChoice: false,
          resolvedLocation: null,
          targetPlayerId: step.primaryTargetId,
          damageDealt: step.totalDealt,
        };

        const postSubSteps: PendingResolutionStep[] = [];

        // Nội tại Tú "Ẩn Danh" (Vampire) -> định tuyến qua CAP-04 HealPipeline (`sourceKind: 'skill'`)!
        if (step.totalDealt > 0 && actor.alive && actor.revealed && actor.roleId === 'suong-an-danh') {
          postSubSteps.push({
            kind: 'HEAL',
            healEventId: nextExpansionEventId(state, 'heal-vampire'),
            actorPlayerId: actor.playerId,
            targetPlayerId: actor.playerId,
            rawAmount: 2,
            sourceKind: 'skill',
            sourceLabel: 'Hút Sinh Lực (Tú "Ẩn Danh")',
            postLogKind: 'skill',
            postLogPrefix: `🦇 Tú "Ẩn Danh" (${actor.displayName}) hút sinh lực hồi `,
            postLogSuffix: ' thương tích!',
            postLogActorId: actor.playerId,
          });
        }

        // Xếp hàng phản kích của Dũng "Gác Cổng" (Werewolf)
        if (step.counterAttackerIds.length > 0) {
          for (const defId of step.counterAttackerIds) {
            postSubSteps.push({
              kind: 'COUNTER_ATTACK',
              defenderPlayerId: defId,
              attackerPlayerId: actor.playerId,
            });
          }
        }

        if (postSubSteps.length > 0) {
          exp.pendingSteps.unshift(...postSubSteps);
        }
        break;
      }

      case 'COUNTER_ATTACK': {
        const dung = state.players[step.defenderPlayerId];
        const origAttacker = state.players[step.attackerPlayerId];
        if (!dung || !dung.alive || !origAttacker || !origAttacker.alive) break;
        if (isUdiProtectedFromAttack(state, origAttacker)) {
          incRoleStat(exp.stats.activationsByRole, 'exp1_udi', 1);
          appendPublicLog(
            state,
            'skill',
            `🫥 Ẩn Thân (Udi): ${origAttacker.displayName} đứng cùng Cụm với ≥ 2 người khác — né hoàn toàn đòn phản kích của ${dung.displayName}!`,
            nowMs,
            origAttacker.playerId,
          );
          break;
        }
        if (isVisionsMarkedTarget(state, dung.playerId, origAttacker.playerId)) {
          break;
        }

        const cStick = dung.equipped.includes('ev-01');
        const cd6 = cStick ? 0 : rollD6(state);
        const cd4 = rollD4(state);
        const cBase = cStick ? cd4 : Math.abs(cd6 - cd4);
        let cRaw = cBase;
        if (cBase > 0) {
          if (dung.equipped.includes('ev-02')) cRaw += 1;
          if (dung.equipped.includes('ev-03')) cRaw += 1;
          if (dung.equipped.includes('ev-04')) cRaw += 1;
          if (dung.equipped.includes('eq-01')) cRaw = Math.max(0, cRaw - 1);
        }
        const cRollDesc = cStick ? `1d4=${cd4}` : `|${cd6}-${cd4}|=${cBase}`;
        const prevHp = origAttacker.hp;

        // Phản kích cũng là nguồn 'attack' -> tôn trọng G43 / Holy Robe / Guardian Angel / Wendigo / Bianca!
        const counterDmgStep: Extract<PendingResolutionStep, { kind: 'DAMAGE' }> = {
          kind: 'DAMAGE',
          damageEventId: nextExpansionEventId(state, 'dmg-counter'),
          targetPlayerId: origAttacker.playerId,
          rawAmount: cRaw,
          sourceType: 'attack',
          attackerPlayerId: dung.playerId,
          isSingleTarget: true,
          isRetaliatoryAttack: true,
          postLogKind: 'skill',
          postLogPrefix: `🥊 Dũng "Gác Cổng" (${dung.displayName}) phản kích (${cRollDesc}, tổng ${cRaw}) → ${origAttacker.displayName} chịu `,
          postLogSuffix: ' sát thương!',
          postLogActorId: dung.playerId,
        };
        const completed = executeDamageStep(state, counterDmgStep, nowMs);
        const dealtNow = Math.max(0, prevHp - origAttacker.hp);
        if (state.lastDiceRoll) {
          state.lastDiceRoll.counterRoll = {
            playerId: dung.playerId,
            displayName: dung.displayName,
            d6: cd6,
            d4: cd4,
            total: cRaw,
            damageDealt: dealtNow,
          };
        }
        if (!completed) return;
        break;
      }

      case 'VAMPIRE_BAT_HEAL': {
        const actor = state.players[step.actorPlayerId];
        const target = state.players[step.targetPlayerId];
        if (!actor || !target) break;
        const healRes = actor.alive
          ? executeHealPipeline(
              state,
              {
                healEventId: nextExpansionEventId(state, 'heal-vbat'),
                sourceCardId: 'ev-07',
                actorPlayerId: actor.playerId,
                targetPlayerId: actor.playerId,
                rawAmount: 1,
                sourceKind: 'black-card',
                sourceLabel: step.cardTitle,
              },
              nowMs,
              createExpandedHealHooks(),
            )
          : { actual: 0 };
        appendPublicLog(
          state,
          'event',
          `🦇 ${actor.displayName} dùng "${step.cardTitle}" lên ${target.displayName} (-${step.dealtToTarget} HP, bản thân +${healRes.actual} HP).`,
          nowMs,
          actor.playerId,
        );
        break;
      }

      case 'SPIDER_SELF_DAMAGE': {
        const actor = state.players[step.actorPlayerId];
        const target = state.players[step.targetPlayerId];
        if (!actor || !target) break;
        if (!actor.alive) break;
        exp.pendingSteps.unshift({
          kind: 'DAMAGE',
          damageEventId: nextExpansionEventId(state, 'dmg'),
          sourceCardId: 'ev-08',
          targetPlayerId: actor.playerId,
          rawAmount: 2,
          sourceType: 'event',
          attackerPlayerId: null,
          isTalismanWardable: true,
          isSingleTarget: true,
          isConsumableBlackCardDamage: true,
          postLogKind: 'event',
          postLogPrefix: `🕷️ ${actor.displayName} tung "${step.cardTitle}": ${target.displayName} chịu ${step.dealtToTarget} ST, bản thân chịu `,
          postLogSuffix: ' ST!',
          postLogActorId: actor.playerId,
        });
        break;
      }

      case 'FINISH_ACTION': {
        if (callbacks.finalizeIfFinished(state, nowMs)) {
          exp.pendingSteps = [];
          return;
        }
        const actor = state.players[step.actorPlayerId];
        if (actor && actor.alive && actor.hand.length === 0) {
          deliverNextGloriaQueuedCard(state, actor, nowMs);
          if (callbacks.finalizeIfFinished(state, nowMs)) {
            exp.pendingSteps = [];
            return;
          }
        }
        const shouldAutoEnd =
          !actor ||
          !actor.alive ||
          step.autoEndTurnMode === 'always' ||
          (step.autoEndTurnMode === 'if-not-charles-feast' &&
            !callbacks.canTriggerCharlesBloodyFeast(state, actor));
        if (shouldAutoEnd) {
          callbacks.advanceTurn(state, nowMs);
        }
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Pending Choice Resolution & Timeout Fallback (Common Rule D)
// ---------------------------------------------------------------------------

export function resolvePendingChoice(
  state: AuthoritativeGameState,
  playerId: string,
  choiceId: string,
  optionId: string,
  nowMs: number,
  callbacks: TurnContinuationCallbacks,
  options?: { isTimeoutFallback?: boolean },
): EngineActionResult {
  const exp = ensureExpansionState(state);
  const pending = state.pendingChoice;

  if (!pending) {
    if (exp.resolvedChoiceIds.includes(choiceId)) {
      return { ok: false, error: 'Lựa chọn này đã được xử lý trước đó.' };
    }
    return { ok: false, error: 'Hiện không có lựa chọn kỹ năng nào đang chờ xử lý.' };
  }

  if (pending.choiceId !== choiceId) {
    return { ok: false, error: 'Mã lựa chọn không khớp hoặc đã hết hạn.' };
  }

  if (!options?.isTimeoutFallback && pending.ownerPlayerId !== playerId) {
    // BẢO MẬT P0: Thông báo lỗi trung tính, KHÔNG lộ ai đang sở hữu secret reaction!
    return { ok: false, error: 'Đang chờ hệ thống hoàn tất lựa chọn hiện tại.' };
  }

  const chosenOpt = pending.options.find((o) => o.optionId === optionId);
  if (!chosenOpt) {
    return { ok: false, error: 'Phương án lựa chọn không hợp lệ.' };
  }

  // Commit choice consumption BEFORE executing continuation (chống replay tuyệt đối)
  markChoiceResolved(state, pending.choiceId);
  state.pendingChoice = null;

  const data = pending.data;
  switch (data.kind) {
    case 'fiona_attack_roll': {
      const actor = state.players[data.actorPlayerId];
      if (!actor || !actor.alive) {
        drainPendingSteps(state, nowMs, callbacks);
        return { ok: true };
      }
      const chosenRoll = optionId === 'roll_1' ? data.rolls[1] : data.rolls[0];
      const chosenLabel = optionId === 'roll_1' ? '#2' : '#1';
      if (options?.isTimeoutFallback) {
        appendPublicLog(
          state,
          'timeout',
          `⏱️ Fiona (${actor.displayName}) quá hạn chọn xúc xắc — hệ thống tự áp dụng Kết quả #1 (${formatAttackRollDesc(chosenRoll)}).`,
          nowMs,
          actor.playerId,
        );
      } else {
        appendPublicLog(
          state,
          'skill',
          `🎯 Fiona (${actor.displayName}) chọn Kết quả ${chosenLabel}: ${formatAttackRollDesc(chosenRoll)}!`,
          nowMs,
          actor.playerId,
        );
      }
      return enqueueAttackResolution(
        state,
        actor,
        data.targetPlayerId,
        chosenRoll,
        data.hasMachineGun,
        nowMs,
        callbacks,
      );
    }

    case 'wendigo_reveal_heal': {
      const wendigo = state.players[data.wendigoPlayerId];
      if (optionId === 'reveal_and_activate' && wendigo && wendigo.alive) {
        const justRevealed = revealPlayerNow(state, wendigo, 'voluntary', nowMs);
        incRoleStat(exp.stats.activationsByRole, 'exp1_wendigo', 1);
        appendHighlight(
          state,
          `Lộ vai: ${wendigo.displayName}`,
          `Wendigo (${FACTION_LABELS[wendigo.faction]}) — Tiệc Thịt`,
          nowMs,
        );
        exp.pendingSteps.unshift({
          kind: 'HEAL',
          healEventId: nextExpansionEventId(state, 'heal-wendigo'),
          actorPlayerId: wendigo.playerId,
          targetPlayerId: wendigo.playerId,
          rawAmount: 1,
          sourceKind: 'skill',
          sourceLabel: 'Tiệc Thịt (Wendigo)',
          roleStatId: 'exp1_wendigo',
          postLogKind: 'reveal',
          postLogPrefix: `🎭🩸 ${wendigo.displayName} lật vai Wendigo — Tiệc Thịt: hồi `,
          postLogSuffix: ' HP!',
          postLogActorId: wendigo.playerId,
        });
        if (justRevealed) {
          enqueueRoleRevealedTrigger(state, wendigo.playerId, 'reaction', 0);
        }
      }
      // Khi decline hoặc timeout: KHÔNG phát log công khai nhắc tên Wendigo (zero secret leak!)
      drainPendingSteps(state, nowMs, callbacks);
      return { ok: true };
    }

    case 'gayle_attack_reroll': {
      const actor = state.players[data.actorPlayerId];
      if (!actor || !actor.alive) {
        drainPendingSteps(state, nowMs, callbacks);
        return { ok: true };
      }
      let finalRoll = data.firstRoll;
      if (optionId === 'reroll') {
        const d6 = data.hasMasamune ? 0 : rollD6(state);
        const d4 = rollD4(state);
        const baseDmg = data.hasMasamune ? d4 : Math.abs(d6 - d4);
        const rawDmg = computeRawAttackDamage(actor, baseDmg);
        finalRoll = { d6, d4, baseDmg, rawDmg, hasMasamune: data.hasMasamune };
        incRoleStat(exp.stats.activationsByRole, 'exp1_gayle', 1);
        appendPublicLog(
          state,
          'skill',
          `🎲 Gayle (${actor.displayName}) — Đấu Sĩ Thực Tập: đổ lại lần 2 → ${formatAttackRollDesc(finalRoll)} (${finalRoll.rawDmg} ST thô, bắt buộc áp dụng)!`,
          nowMs,
          actor.playerId,
        );
      } else if (options?.isTimeoutFallback) {
        appendPublicLog(
          state,
          'timeout',
          `⏱️ Gayle (${actor.displayName}) quá hạn — giữ nguyên kết quả #1 (${formatAttackRollDesc(finalRoll)}).`,
          nowMs,
          actor.playerId,
        );
      } else {
        appendPublicLog(
          state,
          'skill',
          `🎯 Gayle (${actor.displayName}) giữ nguyên kết quả #1 (${formatAttackRollDesc(finalRoll)}).`,
          nowMs,
          actor.playerId,
        );
      }
      return enqueueAttackResolution(
        state,
        actor,
        data.targetPlayerId,
        finalRoll,
        data.hasMachineGun,
        nowMs,
        callbacks,
      );
    }

    case 'felicia_draw_choice': {
      const actor = state.players[data.actorPlayerId];
      const chosenId = optionId === 'pick_1' ? data.cardIds[1] : data.cardIds[0];
      const unchosenId = optionId === 'pick_1' ? data.cardIds[0] : data.cardIds[1];
      discardCardId(state, unchosenId);
      const chosenCard = getCardById(chosenId);
      const deckLabel = getDeckLabel(data.deckId);

      if (actor && actor.alive && chosenCard) {
        if (!chosenCard.isConsumable && chosenCard.deck !== 'investigation') {
          equipToPlayerSlot(actor, chosenCard.id);
          appendPublicLog(
            state,
            options?.isTimeoutFallback ? 'timeout' : 'equipment',
            options?.isTimeoutFallback
              ? `⏱️ Felicia (${actor.displayName}) quá hạn — tự giữ & trang bị "${chosenCard.title}" từ ${deckLabel} (1 lá hủy vào chồng bỏ)!`
              : `🎒 Felicia (${actor.displayName}) — Tháo Vát: giữ & trang bị ngay "${chosenCard.title}" (1 lá ${deckLabel} hủy vào chồng bỏ)!`,
            nowMs,
            actor.playerId,
          );
        } else {
          if (actor.hand.length >= BOARD_GAME_MAX_HAND) {
            const dropped = actor.hand.shift();
            if (dropped) discardCardId(state, dropped);
          }
          actor.hand.push(chosenCard.id);
          appendPublicLog(
            state,
            options?.isTimeoutFallback ? 'timeout' : 'draw',
            options?.isTimeoutFallback
              ? `⏱️ Felicia (${actor.displayName}) quá hạn — tự giữ 1 thẻ ${deckLabel} (1 lá hủy vào chồng bỏ).`
              : `🃏 Felicia (${actor.displayName}) — Tháo Vát: giữ 1 thẻ ${deckLabel} & hủy 1 lá vào chồng bỏ (cần giải quyết trong lượt).`,
            nowMs,
            actor.playerId,
          );
        }
      } else {
        discardCardId(state, chosenId);
      }
      state.turnPhase = 'MAIN_ACTION';
      callbacks.finalizeIfFinished(state, nowMs);
      return { ok: true };
    }

    case 'victor_blood_boost': {
      const actor = state.players[data.actorPlayerId];
      if (!actor || !actor.alive) {
        drainPendingSteps(state, nowMs, callbacks);
        return { ok: true };
      }
      let boostTargetId: string | null = null;
      if (optionId.startsWith('boost:')) {
        const candidateId = optionId.slice('boost:'.length);
        if (actor.hp >= 2 && data.eligibleTargetIds.includes(candidateId)) {
          const paid = applyHpCost(state, actor, 1, 'Bác Học Điên — Victor', nowMs);
          if (paid) {
            boostTargetId = candidateId;
            incRoleStat(exp.stats.activationsByRole, 'exp1_victor', 1);
            incRoleStat(exp.stats.bonusDamageByRole, 'exp1_victor', 2);
            const targetName = state.players[candidateId]?.displayName ?? candidateId;
            appendPublicLog(
              state,
              'skill',
              `🧪🩸 Victor (${actor.displayName}) — Bác Học Điên: trả 1 HP (còn ${actor.hp}/${actor.maxHp}) để cộng +2 ST vào ${targetName}!`,
              nowMs,
              actor.playerId,
            );
          }
        }
      } else if (options?.isTimeoutFallback) {
        appendPublicLog(
          state,
          'timeout',
          `⏱️ Victor (${actor.displayName}) quá hạn — giữ nguyên HP và áp dụng sát thương thường.`,
          nowMs,
          actor.playerId,
        );
      }
      return enqueueAttackResolution(
        state,
        actor,
        data.targetPlayerId,
        data.roll,
        data.hasMachineGun,
        nowMs,
        callbacks,
        {
          outgoingModifiersApplied: true,
          elysiaChecked: true,
          victorChecked: true,
          victorBoostTargetId: boostTargetId,
        },
      );
    }

    case 'elysia_counter_boost': {
      const actor = state.players[data.actorPlayerId];
      if (!actor || !actor.alive) {
        drainPendingSteps(state, nowMs, callbacks);
        return { ok: true };
      }
      const boosted = optionId === 'boost';
      if (boosted) {
        incRoleStat(exp.stats.activationsByRole, 'exp1_elysia', 1);
        incRoleStat(exp.stats.bonusDamageByRole, 'exp1_elysia', 2);
        appendPublicLog(
          state,
          'skill',
          `⚔️ Elysia (${actor.displayName}) — Phản Công: tăng +2 sát thương (${data.roll.rawDmg} → ${data.roll.rawDmg + 2} ST thô)!`,
          nowMs,
          actor.playerId,
        );
      } else if (options?.isTimeoutFallback) {
        appendPublicLog(
          state,
          'timeout',
          `⏱️ Elysia (${actor.displayName}) quá hạn — giữ nguyên ${data.roll.rawDmg} sát thương thường.`,
          nowMs,
          actor.playerId,
        );
      } else {
        appendPublicLog(
          state,
          'skill',
          `⚔️ Elysia (${actor.displayName}) không dùng Phản Công (giữ ${data.roll.rawDmg} ST thô).`,
          nowMs,
          actor.playerId,
        );
      }
      return enqueueAttackResolution(
        state,
        actor,
        data.targetPlayerId,
        data.roll,
        data.hasMachineGun,
        nowMs,
        callbacks,
        {
          outgoingModifiersApplied: true,
          elysiaChecked: true,
          elysiaBoosted: boosted,
          victorChecked: true,
        },
      );
    }

    case 'cindy_reveal_retaliate': {
      const cindy = state.players[data.cindyPlayerId];
      const attacker = state.players[data.attackerPlayerId];
      if (
        optionId === 'reveal_and_retaliate' &&
        cindy &&
        cindy.alive &&
        attacker &&
        attacker.alive
      ) {
        const justRevealed = revealPlayerNow(state, cindy, 'voluntary', nowMs);
        incRoleStat(exp.stats.activationsByRole, 'exp1_cindy', 1);
        incRoleStat(exp.stats.bonusDamageByRole, 'exp1_cindy', 1);
        appendHighlight(
          state,
          `Lộ vai: ${cindy.displayName}`,
          `Cindy (${FACTION_LABELS[cindy.faction]}) — Con Ác Mộng`,
          nowMs,
        );
        exp.pendingSteps.unshift({
          kind: 'DAMAGE',
          damageEventId: nextExpansionEventId(state, 'dmg-retaliate'),
          causationId: data.sourceDamageEventId,
          targetPlayerId: attacker.playerId,
          rawAmount: 1,
          sourceType: 'retaliation',
          attackerPlayerId: cindy.playerId,
          isRetaliation: true,
          isSingleTarget: true,
          postLogKind: 'reveal',
          postLogPrefix: `🎭🌙 ${cindy.displayName} lật vai Cindy — Con Ác Mộng: phản kích ${attacker.displayName} gây `,
          postLogSuffix: ' sát thương!',
          postLogActorId: cindy.playerId,
        });
        if (justRevealed) {
          enqueueRoleRevealedTrigger(state, cindy.playerId, 'reaction', 0);
        }
      }
      // Khi decline hoặc timeout: KHÔNG phát log công khai nhắc tên Cindy (zero secret leak!)
      drainPendingSteps(state, nowMs, callbacks);
      return { ok: true };
    }

    case 'bipolar_fate_coin': {
      const actor = state.players[data.actorPlayerId];
      if (!actor || !actor.alive) {
        drainPendingSteps(state, nowMs, callbacks);
        return { ok: true };
      }
      if (optionId === 'skip' || options?.isTimeoutFallback) {
        if (options?.isTimeoutFallback) {
          appendPublicLog(
            state,
            'timeout',
            `⏱️ Bipolar (${actor.displayName}) quá hạn Đồng Xu Định Mệnh — tự bỏ qua (không mất lượt dùng 1 lần/trận).`,
            nowMs,
            actor.playerId,
          );
        } else {
          appendPublicLog(
            state,
            'skill',
            `🪙 Bipolar (${actor.displayName}) chưa dùng Đồng Xu Định Mệnh ở lượt này.`,
            nowMs,
            actor.playerId,
          );
        }
        return { ok: true };
      }

      if (actor.skillUsedOnce) {
        return { ok: false, error: 'Đồng Xu Định Mệnh đã được sử dụng trong trận này.' };
      }

      // Commit oncePerMatch TRƯỚC khi tung xúc xắc & áp hiệu ứng (chống replay qua reconnect)
      actor.skillUsedOnce = true;
      const d4 = rollD4(state);
      const amount = d4 + 2; // 3..6
      incRoleStat(exp.stats.activationsByRole, 'exp1_bipolar', 1);

      if (optionId === 'heal_self') {
        exp.pendingSteps.push(
          {
            kind: 'HEAL',
            healEventId: nextExpansionEventId(state, 'heal-bipolar'),
            actorPlayerId: actor.playerId,
            targetPlayerId: actor.playerId,
            rawAmount: amount,
            sourceKind: 'skill',
            sourceLabel: 'Đồng Xu Định Mệnh (Bipolar)',
            roleStatId: 'exp1_bipolar',
            postLogKind: 'skill',
            postLogPrefix: `🪙💚 Bipolar (${actor.displayName}) — Đồng Xu Định Mệnh (1d4=${d4} + 2 = ${amount}): hồi `,
            postLogSuffix: ' HP!',
            postLogActorId: actor.playerId,
          },
          {
            kind: 'FINISH_ACTION',
            actorPlayerId: actor.playerId,
            autoEndTurnMode: 'never',
          },
        );
        drainPendingSteps(state, nowMs, callbacks);
        return { ok: true };
      }

      if (optionId === 'damage_self') {
        exp.pendingSteps.push(
          {
            kind: 'DAMAGE',
            damageEventId: nextExpansionEventId(state, 'dmg-bipolar'),
            targetPlayerId: actor.playerId,
            rawAmount: amount,
            sourceType: 'hp-cost',
            attackerPlayerId: null,
            isHpCost: true,
            unpreventable: true,
            isSingleTarget: true,
            postLogKind: 'skill',
            postLogPrefix: `🪙🩸 Bipolar (${actor.displayName}) — Đồng Xu Định Mệnh (1d4=${d4} + 2 = ${amount}): tự nhận `,
            postLogSuffix: ' sát thương không thể chặn!',
            postLogActorId: actor.playerId,
          },
          {
            kind: 'FINISH_ACTION',
            actorPlayerId: actor.playerId,
            autoEndTurnMode: 'never',
          },
        );
        drainPendingSteps(state, nowMs, callbacks);
        return { ok: true };
      }

      return { ok: true };
    }

    case 'undying_reveal_reduce': {
      const undying = state.players[data.undyingPlayerId];
      if (optionId === 'reveal_and_reduce' && undying && undying.alive) {
        const justRevealed = revealPlayerNow(state, undying, 'voluntary', nowMs);
        const pausedStep = exp.pendingSteps[0];
        if (
          pausedStep &&
          pausedStep.kind === 'DAMAGE' &&
          pausedStep.damageEventId === data.damageEventId
        ) {
          pausedStep.undyingReduced = true;
        }
        incRoleStat(exp.stats.activationsByRole, 'exp1_undying', 1);
        incRoleStat(exp.stats.damagePreventedByRole, 'exp1_undying', 1);
        appendPublicLog(
          state,
          'reveal',
          `🎭🛡️ ${undying.displayName} lật vai Undying — Mạ Sắt: giảm 1 sát thương (${data.preUndyingDmg} → ${Math.max(0, data.preUndyingDmg - 1)})!`,
          nowMs,
          undying.playerId,
        );
        appendHighlight(
          state,
          `Lộ vai: ${undying.displayName}`,
          `Undying (${FACTION_LABELS[undying.faction]}) — Mạ Sắt`,
          nowMs,
        );
        if (justRevealed) {
          enqueueRoleRevealedTrigger(state, undying.playerId, 'reaction', 0);
        }
      }
      // Khi decline hoặc timeout: KHÔNG phát log công khai nhắc tên Undying (zero secret leak!)
      drainPendingSteps(state, nowMs, callbacks);
      return { ok: true };
    }

    case 'fea_move_adjust': {
      const actor = state.players[data.actorPlayerId];
      if (!actor || !actor.alive) {
        drainPendingSteps(state, nowMs, callbacks);
        return { ok: true };
      }
      const delta: -1 | 0 | 1 = options?.isTimeoutFallback
        ? 0
        : (data.deltaByOptionId[optionId] ?? 0);
      commitFeaMovementTotal(
        state,
        actor,
        data.d6,
        data.d4,
        data.rawTotal,
        delta,
        nowMs,
        Boolean(options?.isTimeoutFallback),
      );
      callbacks.finalizeIfFinished(state, nowMs);
      return { ok: true };
    }

    case 'wrath_turn_start_aoe': {
      const actor = state.players[data.actorPlayerId];
      if (!actor || !actor.alive) {
        drainPendingSteps(state, nowMs, callbacks);
        return { ok: true };
      }
      if (optionId !== 'activate' || options?.isTimeoutFallback) {
        if (options?.isTimeoutFallback) {
          appendPublicLog(
            state,
            'timeout',
            `⏱️ Wrath (${actor.displayName}) quá hạn Cơn Thịnh Nộ — tự bỏ qua lượt này.`,
            nowMs,
            actor.playerId,
          );
        } else {
          appendPublicLog(
            state,
            'skill',
            `🔥 Wrath (${actor.displayName}) không kích hoạt Cơn Thịnh Nộ ở đầu lượt này.`,
            nowMs,
            actor.playerId,
          );
        }
        return { ok: true };
      }

      const victims = listLivingPlayersInSameCluster(state, actor, { includeSelf: false });
      if (victims.length === 0) {
        return { ok: true };
      }
      incRoleStat(exp.stats.activationsByRole, 'exp1_wrath', 1);
      incRoleStat(exp.stats.bonusDamageByRole, 'exp1_wrath', 2 * victims.length);
      appendPublicLog(
        state,
        'skill',
        `🔥 Wrath (${actor.displayName}) — Cơn Thịnh Nộ: giáng 2 sát thương kỹ năng lên ${victims.length} người chơi khác cùng Cụm (${victims.map((v) => v.displayName).join(', ')})!`,
        nowMs,
        actor.playerId,
      );
      for (const victim of victims) {
        exp.pendingSteps.push({
          kind: 'DAMAGE',
          damageEventId: nextExpansionEventId(state, 'dmg-wrath'),
          targetPlayerId: victim.playerId,
          rawAmount: 2,
          sourceType: 'skill',
          attackerPlayerId: actor.playerId,
          isSingleTarget: false,
        });
      }
      exp.pendingSteps.push({
        kind: 'FINISH_ACTION',
        actorPlayerId: actor.playerId,
        autoEndTurnMode: 'never',
      });
      drainPendingSteps(state, nowMs, callbacks);
      return { ok: true };
    }

    case 'vengeance_chain_strike': {
      const vengeance = state.players[data.vengeancePlayerId];
      if (
        !vengeance ||
        !vengeance.alive ||
        optionId === 'skip' ||
        options?.isTimeoutFallback
      ) {
        if (vengeance && options?.isTimeoutFallback) {
          appendPublicLog(
            state,
            'timeout',
            `⏱️ Vengeance (${vengeance.displayName}) quá hạn Báo Thù Liên Hoàn — tự bỏ qua (không mất lượt dùng 1 lần/trận).`,
            nowMs,
            vengeance.playerId,
          );
        }
        drainPendingSteps(state, nowMs, callbacks);
        return { ok: true };
      }

      if (vengeance.skillUsedOnce) {
        drainPendingSteps(state, nowMs, callbacks);
        return { ok: true };
      }

      const selectedIds = data.targetMap[optionId] ?? [];
      const liveTargets = selectedIds
        .map((id) => state.players[id])
        .filter(
          (p): p is AuthoritativePlayerState =>
            Boolean(p && p.alive && p.playerId !== vengeance.playerId),
        );

      if (liveTargets.length === 0) {
        drainPendingSteps(state, nowMs, callbacks);
        return { ok: true };
      }

      // Commit oncePerMatch TRƯỚC khi tung 1d4 & chạy damage (chống đệ quy & replay tuyệt đối!)
      vengeance.skillUsedOnce = true;
      const d4 = rollD4(state);
      incRoleStat(exp.stats.activationsByRole, 'exp1_vengeance', 1);
      incRoleStat(exp.stats.bonusDamageByRole, 'exp1_vengeance', d4 * liveTargets.length);

      appendPublicLog(
        state,
        'skill',
        `⚡💀 Vengeance (${vengeance.displayName}) — Báo Thù Liên Hoàn (1d4=${d4}): giáng ${d4} sát thương kỹ năng lên ${liveTargets.map((t) => t.displayName).join(' & ')}!`,
        nowMs,
        vengeance.playerId,
      );

      // Chèn lên đầu hàng đợi để chuỗi sát thương Báo Thù chạy ngay theo thứ tự ghế trước khi hoàn tất phần còn lại
      const chainSteps: PendingResolutionStep[] = liveTargets.map((t) => ({
        kind: 'DAMAGE',
        damageEventId: nextExpansionEventId(state, 'dmg-vengeance'),
        causationId: data.eliminationEventId,
        targetPlayerId: t.playerId,
        rawAmount: d4,
        sourceType: 'skill',
        attackerPlayerId: vengeance.playerId,
        isSingleTarget: false,
      }));
      exp.pendingSteps.unshift(...chainSteps);
      drainPendingSteps(state, nowMs, callbacks);
      return { ok: true };
    }

    case 'visions_mark_target': {
      const actor = state.players[data.actorPlayerId];
      if (!actor || !actor.alive) {
        drainPendingSteps(state, nowMs, callbacks);
        return { ok: true };
      }
      if (optionId === 'skip' || options?.isTimeoutFallback) {
        if (options?.isTimeoutFallback) {
          appendPublicLog(
            state,
            'timeout',
            `⏱️ Visions (${actor.displayName}) quá hạn đặt Dấu Ấn — tự bỏ qua (giữ nguyên 1 lần/trận).`,
            nowMs,
            actor.playerId,
          );
        } else {
          appendPublicLog(
            state,
            'skill',
            `👁️ Visions (${actor.displayName}) chưa đặt Dấu Ấn ở lượt này.`,
            nowMs,
            actor.playerId,
          );
        }
        return { ok: true };
      }

      if (actor.skillUsedOnce || exp.visionsMarks?.[actor.playerId]) {
        return { ok: true };
      }

      const targetId = data.targetMap[optionId];
      const target = targetId ? state.players[targetId] : null;
      if (!target || !target.alive || target.playerId === actor.playerId) {
        return { ok: true };
      }

      actor.skillUsedOnce = true;
      if (!exp.visionsMarks) exp.visionsMarks = {};
      exp.visionsMarks[actor.playerId] = {
        targetPlayerId: target.playerId,
        markedOnTurnNumber: state.turnNumber,
      };
      incRoleStat(exp.stats.activationsByRole, 'exp2_visions', 1);
      appendPublicLog(
        state,
        'skill',
        `👁️ Visions (${actor.displayName}) đặt Dấu Ấn vĩnh viễn lên ${target.displayName} — cấm đánh trực tiếp & trừ 1 HP từ đầu lượt tiếp theo của Visions!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    case 'cruz_black_redraw': {
      const actor = state.players[data.actorPlayerId];
      const deckLabel = getDeckLabel('event');
      let resolvedCard = getCardById(data.drawnCardId);

      if (optionId === 'redraw' && !options?.isTimeoutFallback && actor && actor.alive) {
        // Đặt lá cũ xuống chính xác ĐÁY chồng Đột Kích (Black deck), sau đó rút 1 lá mới (không đệ quy!)
        state.decks.event.push(data.drawnCardId);
        resolvedCard = takeOneCardFromDeck(state, 'event') ?? getCardById(data.drawnCardId);
        incRoleStat(exp.stats.activationsByRole, 'exp2_cruz', 1);
      }

      if (actor && actor.alive && resolvedCard) {
        const didRedraw = optionId === 'redraw' && !options?.isTimeoutFallback;
        if (!resolvedCard.isConsumable && resolvedCard.deck !== 'investigation') {
          equipToPlayerSlot(actor, resolvedCard.id);
          appendPublicLog(
            state,
            options?.isTimeoutFallback ? 'timeout' : 'equipment',
            options?.isTimeoutFallback
              ? `⏱️ Cruz (${actor.displayName}) quá hạn — tự giữ & trang bị "${resolvedCard.title}" từ ${deckLabel}!`
              : didRedraw
                ? `🎒 Cruz (${actor.displayName}) đặt thẻ cũ xuống đáy chồng Đen, rút lại & trang bị ngay "${resolvedCard.title}"!`
                : `🎒 Cruz (${actor.displayName}) giữ thẻ vừa rút & trang bị ngay "${resolvedCard.title}"!`,
            nowMs,
            actor.playerId,
          );
        } else {
          if (actor.hand.length >= BOARD_GAME_MAX_HAND) {
            const dropped = actor.hand.shift();
            if (dropped) discardCardId(state, dropped);
          }
          actor.hand.push(resolvedCard.id);
          appendPublicLog(
            state,
            options?.isTimeoutFallback ? 'timeout' : 'draw',
            options?.isTimeoutFallback
              ? `⏱️ Cruz (${actor.displayName}) quá hạn — tự giữ 1 thẻ ${deckLabel} (cần giải quyết trong lượt).`
              : didRedraw
                ? `🃏 Cruz (${actor.displayName}) đặt thẻ cũ xuống đáy chồng Đen và rút 1 thẻ ${deckLabel} thay thế (cần giải quyết trong lượt).`
                : `🃏 Cruz (${actor.displayName}) giữ 1 thẻ ${deckLabel} vừa rút (cần giải quyết trong lượt).`,
            nowMs,
            actor.playerId,
          );
        }
      } else if (resolvedCard) {
        discardCardId(state, resolvedCard.id);
      }
      state.turnPhase = 'MAIN_ACTION';
      callbacks.finalizeIfFinished(state, nowMs);
      return { ok: true };
    }

    case 'bryon_gift_equipment': {
      const actor = state.players[data.actorPlayerId];
      if (!actor || !actor.alive || optionId === 'done' || options?.isTimeoutFallback) {
        if (actor && options?.isTimeoutFallback) {
          appendPublicLog(
            state,
            'timeout',
            `⏱️ Bryon (${actor.displayName}) quá hạn trao tặng trang bị — tiếp tục pha Hành động chính.`,
            nowMs,
            actor.playerId,
          );
        }
        return { ok: true };
      }

      const plan = data.giftMap[optionId];
      if (!plan) return { ok: true };
      const recipient = state.players[plan.recipientPlayerId];
      const sameClusterNeutral =
        recipient &&
        recipient.alive &&
        recipient.faction === 'wanderer' &&
        recipient.revealed &&
        listLivingPlayersInSameCluster(state, actor, { includeSelf: false }).some(
          (p) => p.playerId === recipient.playerId,
        );
      if (!sameClusterNeutral || !recipient) {
        return { ok: true };
      }

      const movedTitles: string[] = [];
      for (const cid of plan.cardIds) {
        if (cid === MASAMUNE_CARD_ID) continue;
        const eqIdx = actor.equipped.indexOf(cid);
        if (eqIdx === -1) continue;
        const [movedId] = actor.equipped.splice(eqIdx, 1);
        if (!movedId) continue;
        equipToPlayerSlot(recipient, movedId);
        movedTitles.push(getCardById(movedId)?.title ?? movedId);
      }

      if (movedTitles.length > 0) {
        exp.bryonGiftedTurnNumber = state.turnNumber;
        incRoleStat(exp.stats.activationsByRole, 'exp2_bryon', 1);
        appendPublicLog(
          state,
          'skill',
          `🎁 Bryon (${actor.displayName}) — Sự Phục Vụ Hào Phóng: trao tặng ${movedTitles.length} trang bị (${movedTitles.join(', ')}) cho ${recipient.displayName}!`,
          nowMs,
          actor.playerId,
        );
        // Kiểm tra thắng ngay (vd. tặng đủ 5 trang bị cho Bob!)
        callbacks.finalizeIfFinished(state, nowMs);
      }
      return { ok: true };
    }

    case 'elise_distribute_heal': {
      const actor = state.players[data.actorPlayerId];
      if (!actor || !actor.alive || optionId === 'skip' || options?.isTimeoutFallback) {
        if (actor && options?.isTimeoutFallback) {
          appendPublicLog(
            state,
            'timeout',
            `⏱️ Elise (${actor.displayName}) quá hạn Âm Hưởng Mềm Mại — tự hủy (không mất lượt dùng 1 lần/trận).`,
            nowMs,
            actor.playerId,
          );
        } else if (actor) {
          appendPublicLog(
            state,
            'skill',
            `🎶 Elise (${actor.displayName}) tạm hoãn Âm Hưởng Mềm Mại (giữ nguyên 1 lần/trận).`,
            nowMs,
            actor.playerId,
          );
        }
        return { ok: true };
      }

      if (actor.skillUsedOnce) {
        return { ok: true };
      }

      const rawAllocs = data.distributionMap[optionId];
      if (!Array.isArray(rawAllocs)) {
        return { ok: true };
      }

      const clusterIds = new Set(
        listLivingPlayersInSameCluster(state, actor, { includeSelf: true }).map((p) => p.playerId),
      );
      let budget = 5;
      const validSteps: Extract<PendingResolutionStep, { kind: 'HEAL' }>[] = [];
      const orderedAllocs = [...rawAllocs].sort(
        (a, b) => state.turnOrder.indexOf(a.playerId) - state.turnOrder.indexOf(b.playerId),
      );
      for (const entry of orderedAllocs) {
        if (budget <= 0) break;
        if (!clusterIds.has(entry.playerId)) continue;
        const recipient = state.players[entry.playerId];
        if (!recipient || !recipient.alive) continue;
        const amt = Math.max(0, Math.min(budget, Math.floor(entry.amount)));
        if (amt <= 0) continue;
        budget -= amt;
        validSteps.push({
          kind: 'HEAL',
          healEventId: nextExpansionEventId(state, 'heal-elise'),
          actorPlayerId: actor.playerId,
          targetPlayerId: recipient.playerId,
          rawAmount: amt,
          sourceKind: 'skill',
          sourceLabel: 'Âm Hưởng Mềm Mại (Elise)',
          roleStatId: 'exp2_elise',
          postLogKind: 'skill',
          postLogPrefix: `🎶💚 Elise (${actor.displayName}) — Âm Hưởng Mềm Mại: hồi `,
          postLogSuffix: ` HP cho ${recipient.displayName}!`,
          postLogActorId: actor.playerId,
        });
      }

      // Commit oncePerMatch nguyên tử TRƯỚC khi đẩy chuỗi HEAL vào HealPipeline!
      actor.skillUsedOnce = true;
      incRoleStat(exp.stats.activationsByRole, 'exp2_elise', 1);

      if (validSteps.length === 0) {
        appendPublicLog(
          state,
          'skill',
          `🎶 Elise (${actor.displayName}) kích hoạt Âm Hưởng Mềm Mại (0 HP hiệu lực — cả Cụm đã đầy máu).`,
          nowMs,
          actor.playerId,
        );
        callbacks.finalizeIfFinished(state, nowMs);
        return { ok: true };
      }

      exp.pendingSteps.push(...validSteps, {
        kind: 'FINISH_ACTION',
        actorPlayerId: actor.playerId,
        autoEndTurnMode: 'never',
      });
      drainPendingSteps(state, nowMs, callbacks);
      return { ok: true };
    }

    case 'urban_legend_reveal_heal': {
      const ul = state.players[data.urbanLegendPlayerId];
      if (optionId === 'reveal_and_heal' && ul && ul.alive) {
        const justRevealed = revealPlayerNow(state, ul, 'voluntary', nowMs);
        const pausedStep = exp.pendingSteps[0];
        if (
          pausedStep &&
          pausedStep.kind === 'DAMAGE' &&
          pausedStep.damageEventId === data.damageEventId
        ) {
          pausedStep.urbanLegendConverted = true;
        }
        appendHighlight(
          state,
          `Lộ vai: ${ul.displayName}`,
          `Urban Legend (${FACTION_LABELS[ul.faction]}) — Chuyện Kinh Dị`,
          nowMs,
        );
        appendPublicLog(
          state,
          'reveal',
          `🎭👻 ${ul.displayName} lật vai Urban Legend — Chuyện Kinh Dị!`,
          nowMs,
          ul.playerId,
        );
        if (justRevealed) {
          enqueueRoleRevealedTrigger(state, ul.playerId, 'reaction', 0);
        }
      }
      // Khi decline hoặc timeout: KHÔNG phát log công khai nhắc tên Urban Legend (zero secret leak!)
      drainPendingSteps(state, nowMs, callbacks);
      return { ok: true };
    }

    default:
      drainPendingSteps(state, nowMs, callbacks);
      return { ok: true };
  }
}

export function resolveExpiredPendingChoice(
  state: AuthoritativeGameState,
  nowMs: number,
  callbacks: TurnContinuationCallbacks,
): boolean {
  const pending = state.pendingChoice;
  if (!pending) return false;
  resolvePendingChoice(
    state,
    pending.ownerPlayerId,
    pending.choiceId,
    pending.defaultOptionId,
    nowMs,
    callbacks,
    { isTimeoutFallback: true },
  );
  return true;
}

export function clearPendingChoiceOnForcedAutoTurn(
  state: AuthoritativeGameState,
  nowMs: number,
  callbacks: TurnContinuationCallbacks,
): void {
  let guard = 0;
  while (state.pendingChoice && !state.finished && guard < 8) {
    guard += 1;
    resolveExpiredPendingChoice(state, nowMs, callbacks);
  }
}

export function getPhase2RoleIds(): readonly BoardGameRoleId[] {
  return PHASE2_IMPLEMENTED_EXPANSION_ROLE_IDS;
}
