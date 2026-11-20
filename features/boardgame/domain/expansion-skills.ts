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
  type BoardGameChoiceOptionView,
  type BoardGameDeckId,
  type BoardGameFactionId,
  type BoardGameRoleId,
  type Phase2ARoleId,
  type Phase2BRoleId,
  type Phase2RoleId,
} from '../../../shared/contracts/boardgame';
import { getCardById, toCardPublicMeta } from './cards';
import {
  appendHighlight,
  appendPrivateClue,
  appendPublicLog,
  applyHeal,
  discardCardId,
  equipToPlayerSlot,
  resolveDrawLocationCard,
  resolveUseCard,
  revealPlayerNow,
  stealAllEquippedGear,
  stealOneEquippedGear,
  takeOneCardFromDeck,
  transferLowestEquippedGear,
} from './effects';
import { FACTION_LABELS, getRoleDesign } from './roles';
import {
  BOARD_GAME_MAX_HAND,
  canPlayerAttackTarget,
  getLocationDefinition,
  listReachableAttackTargets,
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

export interface ExpansionSkillExecutableBinding {
  readonly roleId: Phase2RoleId;
  readonly handlerId: string;
  readonly trigger: SkillTrigger;
  readonly resolverSymbol: string;
}

export interface ExpansionVictoryExecutableBinding {
  readonly roleId: Phase2RoleId;
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
    const healed = applyHeal(ctx.state, ctx.owner, healAmount);
    payload.wyvernAlreadyResolved = true;

    const exp = ensureExpansionState(ctx.state);
    incRoleStat(exp.stats.activationsByRole, 'exp2_wyvern', 1);
    incRoleStat(exp.stats.healByRole, 'exp2_wyvern', healed);

    appendPublicLog(
      ctx.state,
      'skill',
      isShadowVictim
        ? `🐉 Wyvern (${ctx.owner.displayName}) — Hấp Thụ: hạ gục Shadow, hồi đầy máu (+${healed} HP → ${ctx.owner.hp}/${ctx.owner.maxHp})!`
        : `🐉 Wyvern (${ctx.owner.displayName}) — Hấp Thụ: hồi ${healed} HP (hiện ${ctx.owner.hp}/${ctx.owner.maxHp})!`,
      ctx.event.nowMs,
      ctx.owner.playerId,
    );
    return { applied: true, note: `healed=${healed}` };
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
    checked.push(ctx.owner.playerId);
    payload.wendigoCheckedIds = checked;

    if (ctx.owner.revealed) {
      const healed = applyHeal(ctx.state, ctx.owner, 1);
      const exp = ensureExpansionState(ctx.state);
      incRoleStat(exp.stats.activationsByRole, 'exp1_wendigo', 1);
      incRoleStat(exp.stats.healByRole, 'exp1_wendigo', healed);
      appendPublicLog(
        ctx.state,
        'skill',
        healed > 0
          ? `🩸 Wendigo (${ctx.owner.displayName}) — Tiệc Thịt: hồi ${healed} HP (hiện ${ctx.owner.hp}/${ctx.owner.maxHp})!`
          : `🩸 Wendigo (${ctx.owner.displayName}) — Tiệc Thịt: đã đầy máu (${ctx.owner.hp}/${ctx.owner.maxHp}).`,
        ctx.event.nowMs,
        ctx.owner.playerId,
      );
      return { applied: true, note: `revealed-heal=${healed}` };
    }

    // Wendigo chưa lộ vai: KHÔNG tự động lật vai -> mở Pending Choice riêng tư cho chủ sở hữu!
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
  'event',
  'investigation',
]);

const undyingIronPlatingHandler: SkillHandlerDefinition = {
  id: 'exp:exp1_undying:iron-plating',
  roleId: 'exp1_undying',
  trigger: 'BEFORE_DAMAGE',
  priority: 30, // Chạy SAU Holy Robe & G43 (priority 20), TRƯỚC khi trừ HP!
  requiresRevealed: false,
  requiresAlive: true,
  canTrigger(ctx) {
    const payload = ctx.event.payload;
    if (!payload) return false;
    if (ctx.event.targetPlayerId !== ctx.owner.playerId) return false;
    if (payload.phase === 'attack_boost_check') return false;
    if (payload.isHpCost || payload.unpreventable || payload.undyingAlreadyChecked) return false;
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
    victorChecked?: boolean;
    victorBoostTargetId?: string | null;
  },
): EngineActionResult {
  const target = state.players[primaryTargetId];
  if (!target || !target.alive) {
    return { ok: false, error: 'Mục tiêu tấn công không còn hợp lệ.' };
  }

  const targets = hasMachineGun ? listReachableAttackTargets(state, actor) : [target];
  const rollDesc = formatAttackRollDesc(roll);

  // Kiểm tra Victor (Bác Học Điên — experimental house rule):
  // Đã lật vai + đánh trúng (baseDmg > 0) + còn >= 2 HP -> mở lựa chọn trả 1 HP (HP cost) để +2 ST cho ĐÚNG 1 mục tiêu!
  if (!options?.victorChecked && roll.baseDmg > 0 && targets.length > 0) {
    const victorPayload: Record<string, unknown> = {
      phase: 'attack_boost_check',
      baseDmg: roll.baseDmg,
      rawDmg: roll.rawDmg,
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
          detail: `HP còn ${actor.hp - 1}/${actor.maxHp} · Tổng ST thô vào ${victim.displayName}: ${roll.rawDmg + 2}${targets.length > 1 ? ' (chỉ tăng cho 1 mục tiêu này)' : ''}`,
          targetPlayerId: victim.playerId,
        })),
        {
          optionId: 'skip',
          label: `Không kích hoạt (Giữ ${actor.hp}/${actor.maxHp} HP)`,
          detail: `Áp dụng sát thương thường (${rollDesc}, ${roll.rawDmg} ST thô).`,
        },
      ];

      state.pendingChoice = {
        choiceId,
        eventId,
        ownerPlayerId: actor.playerId,
        kind: 'victor_blood_boost',
        isSecret: false,
        title: 'Bác Học Điên (Victor)',
        description: `Đòn đánh (${rollDesc}, ${roll.rawDmg} ST thô) đã trúng! Bạn có thể trả 1 HP (không thể giảm bởi giáp/khiên) để cộng +2 ST cho 1 mục tiêu duy nhất (hết giờ tự bỏ qua).`,
        publicPromptLabel: `🧪 Victor (${actor.displayName}) đang cân nhắc trả 1 HP để cường hóa +2 ST...`,
        options: boostOptions,
        defaultOptionId: 'skip',
        createdAtMs: nowMs,
        deadlineMs: nowMs + timeoutMs,
        data: {
          kind: 'victor_blood_boost',
          actorPlayerId: actor.playerId,
          targetPlayerId: primaryTargetId,
          hasMasamune: roll.hasMasamune,
          hasMachineGun,
          roll,
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

  const stepsToPush: PendingResolutionStep[] = [];
  for (const victim of targets) {
    const isVictorBoosted = options?.victorBoostTargetId === victim.playerId;
    const victimRawDmg = isVictorBoosted ? roll.rawDmg + 2 : roll.rawDmg;
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
          `🧲 Hải "Sưu Tầm" (${actor.displayName}) chọn Cướp Đồ Thay Đòn (${rollDesc}) → lấy "${stolen.title}" từ ${victim.displayName} (0 sát thương)!`,
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
      ...(targets.length === 1
        ? {
            attackSingleTargetLog: {
              rollDesc: isVictorBoosted ? `${rollDesc} +2 Victor` : rollDesc,
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
    d6: roll.d6,
    d4: roll.d4,
    baseDmg: roll.baseDmg,
    rawDmg: singleTargetBoosted ? roll.rawDmg + 2 : roll.rawDmg,
    hasMasamune: roll.hasMasamune,
    hasMachineGun,
    rollDesc: singleTargetBoosted ? `${rollDesc} +2 Victor` : rollDesc,
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
// Expanded Draw Card Entrypoint (Felicia — Tháo Vát, White/Black House Rule)
// ---------------------------------------------------------------------------

function getDeckLabel(deckId: BoardGameDeckId): string {
  return deckId === 'investigation'
    ? 'Khám Phá (Xanh)'
    : deckId === 'equipment'
      ? 'Cung Ứng (Trắng)'
      : 'Đột Kích (Đen)';
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

  const drawPayload: Record<string, unknown> = {
    deckId,
    isLocationDraw: true,
    isRecursiveDraw: false,
  };
  EXPANSION_SKILL_ENGINE.dispatch(state, {
    trigger: 'ON_DRAW_CARD',
    actorPlayerId: actor.playerId,
    nowMs,
    payload: drawPayload,
  });

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
      const healed = applyHeal(state, target, 1);
      appendPublicLog(
        state,
        'equipment',
        `💚 ${actor.displayName} dùng Hành Lang (9): hồi ${healed} thương tích cho ${target.displayName}.`,
        nowMs,
        actor.playerId,
      );
      callbacks.finalizeIfFinished(state, nowMs);
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
  if (
    !card ||
    (card.effectKind !== 'eq_flare' &&
      card.effectKind !== 'ev_vampire_bat' &&
      card.effectKind !== 'ev_spider' &&
      card.effectKind !== 'ev_dynamite' &&
      card.effectKind !== 'ev_spiritual_doll' &&
      card.effectKind !== 'ev_banana_peel')
  ) {
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
          targetPlayerId: other.playerId,
          rawAmount: 2,
          sourceType: 'event',
          attackerPlayerId: actor.playerId,
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
      exp.pendingSteps.push(
        {
          kind: 'DAMAGE',
          damageEventId: nextExpansionEventId(state, 'dmg'),
          targetPlayerId: target.playerId,
          rawAmount: 2,
          sourceType: 'event',
          attackerPlayerId: actor.playerId,
          isTalismanWardable: true,
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
      exp.pendingSteps.push(
        {
          kind: 'DAMAGE',
          damageEventId: nextExpansionEventId(state, 'dmg'),
          targetPlayerId: target.playerId,
          rawAmount: 2,
          sourceType: 'event',
          attackerPlayerId: actor.playerId,
          isTalismanWardable: true,
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
      const victims = Object.values(state.players).filter((p) => p.alive && p.location === mapped);
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
          targetPlayerId: v.playerId,
          rawAmount: 3,
          sourceType: 'event',
          attackerPlayerId: actor.playerId,
          isTalismanWardable: true,
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
      const d6 = rollD6(state);
      if (d6 <= 4) {
        exp.pendingSteps.push({
          kind: 'DAMAGE',
          damageEventId: nextExpansionEventId(state, 'dmg'),
          targetPlayerId: target.playerId,
          rawAmount: 3,
          sourceType: 'event',
          attackerPlayerId: actor.playerId,
          postLogKind: 'event',
          postLogPrefix: `🪆 ${actor.displayName} gieo "${card.title}" (1d6=${d6}) → ${target.displayName} chịu `,
          postLogSuffix: ' ST!',
          postLogActorId: actor.playerId,
        });
      } else {
        exp.pendingSteps.push({
          kind: 'DAMAGE',
          damageEventId: nextExpansionEventId(state, 'dmg'),
          targetPlayerId: actor.playerId,
          rawAmount: 3,
          sourceType: 'event',
          attackerPlayerId: null,
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
          targetPlayerId: actor.playerId,
          rawAmount: 1,
          sourceType: 'event',
          attackerPlayerId: null,
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

  let rawMatch = false;
  let isHealHermit = false;
  switch (card.effectKind) {
    case 'inv_anger':
      rawMatch = target.faction === 'lantern-guard' || target.faction === 'mist-order';
      break;
    case 'inv_blackmail':
      rawMatch = target.faction === 'lantern-guard' || target.faction === 'wanderer';
      break;
    case 'inv_greed':
      rawMatch = target.faction === 'wanderer' || target.faction === 'mist-order';
      break;
    case 'inv_slap':
      rawMatch = target.faction === 'lantern-guard';
      break;
    case 'inv_spell':
    case 'inv_exorcism':
      rawMatch = target.faction === 'mist-order';
      break;
    case 'inv_aid':
      rawMatch = target.faction === 'lantern-guard';
      isHealHermit = true;
      break;
    case 'inv_nurturance':
      rawMatch = target.faction === 'wanderer';
      isHealHermit = true;
      break;
    case 'inv_huddle':
      rawMatch = target.faction === 'mist-order';
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
        const healed = applyHeal(state, target, 1);
        effectNote = `Khớp điều kiện — hồi ${healed} thương tích.`;
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
        targetPlayerId: target.playerId,
        rawAmount: queuedDamageAmount,
        sourceType: 'investigation',
        attackerPlayerId: actor.playerId,
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

export function applyExpandedUseSkill(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  targetPlayerId: string | undefined,
  nowMs: number,
  callbacks: TurnContinuationCallbacks,
): EngineActionResult | null {
  // Chỉ chặn các kỹ năng gây sát thương hoặc chuỗi tấn công (Minh, Vy, Bách); các kỹ năng khác (Lan, Trang) trả null để dùng Classic resolver.
  if (
    actor.roleId !== 'gac-ky-thuat' &&
    actor.roleId !== 'gac-radio' &&
    actor.roleId !== 'lang-cuu-ho'
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

  const exp = ensureExpansionState(state);

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
  if (!target || !target.alive || !canPlayerAttackTarget(state, actor, target)) {
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
      if (step.sourceType === 'attack' && target.equipped.includes('eq-01')) {
        dmg = Math.max(0, dmg - 1);
      }

      // Dispatch BEFORE_DAMAGE qua SkillEngine (G43 priority 20 -> Undying priority 30)
      if (dmg > 0) {
        const beforeDamagePayload: Record<string, unknown> = {
          damageEventId: step.damageEventId,
          damageAmount: dmg,
          sourceType: step.sourceType,
          isHpCost: Boolean(step.isHpCost),
          unpreventable: Boolean(step.unpreventable),
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

  // Cập nhật bộ đếm cho các bước POST_ATTACK_EFFECTS / VAMPIRE_BAT_HEAL / SPIDER_SELF_DAMAGE đứng sau
  const exp = ensureExpansionState(state);
  if (step.sourceType === 'attack') {
    const postAtk = exp.pendingSteps.find(
      (s): s is Extract<PendingResolutionStep, { kind: 'POST_ATTACK_EFFECTS' }> =>
        s.kind === 'POST_ATTACK_EFFECTS' && s.attackerPlayerId === step.attackerPlayerId,
    );
    if (postAtk) {
      postAtk.totalDealt += actual;
      if (target.alive && target.revealed && target.roleId === 'suong-gac-cong') {
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

    // Chèn ngay ELIMINATION_TRIGGERS lên đầu hàng đợi để chạy trước Victory Check
    exp.pendingSteps.unshift({
      kind: 'ELIMINATION_TRIGGERS',
      eliminationEventId: nextExpansionEventId(state, 'elim'),
      victimPlayerId: target.playerId,
      victimFactionAtDeath,
      killerPlayerId: attacker?.playerId ?? null,
      sourceType: step.sourceType,
      wyvernChecked: false,
      wendigoCheckedIds: [],
    });
  }

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
  step.wendigoCheckedIds = Array.isArray(payload.wendigoCheckedIds)
    ? [...(payload.wendigoCheckedIds as string[])]
    : [];

  const pendingWendigo = payload.pendingWendigoChoice as
    | { wendigoPlayerId: string; eliminationEventId: string; victimPlayerId: string }
    | undefined;

  if (pendingWendigo) {
    const wendigo = state.players[pendingWendigo.wendigoPlayerId];
    if (wendigo && wendigo.alive && !wendigo.revealed) {
      const exp = ensureExpansionState(state);
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

export function drainPendingSteps(
  state: AuthoritativeGameState,
  nowMs: number,
  callbacks: TurnContinuationCallbacks,
): void {
  const exp = ensureExpansionState(state);
  let guard = 0;

  while (exp.pendingSteps.length > 0 && !state.pendingChoice && !state.finished && guard < 64) {
    guard += 1;
    const step = exp.pendingSteps.shift()!;

    switch (step.kind) {
      case 'DAMAGE': {
        const completed = executeDamageStep(state, step, nowMs);
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

        // Nội tại Tú "Ẩn Danh" (Vampire)
        if (step.totalDealt > 0 && actor.alive && actor.revealed && actor.roleId === 'suong-an-danh') {
          const healed = applyHeal(state, actor, 2);
          if (healed > 0) {
            appendPublicLog(
              state,
              'skill',
              `🦇 Tú "Ẩn Danh" (${actor.displayName}) hút sinh lực hồi ${healed} thương tích!`,
              nowMs,
              actor.playerId,
            );
          }
        }

        // Xếp hàng phản kích của Dũng "Gác Cổng" (Werewolf)
        if (step.counterAttackerIds.length > 0) {
          const counterSteps: PendingResolutionStep[] = step.counterAttackerIds.map((defId) => ({
            kind: 'COUNTER_ATTACK',
            defenderPlayerId: defId,
            attackerPlayerId: actor.playerId,
          }));
          exp.pendingSteps.unshift(...counterSteps);
        }
        break;
      }

      case 'COUNTER_ATTACK': {
        const dung = state.players[step.defenderPlayerId];
        const origAttacker = state.players[step.attackerPlayerId];
        if (!dung || !dung.alive || !origAttacker || !origAttacker.alive) break;

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

        // Phản kích cũng là nguồn 'attack' -> tôn trọng G43 / Holy Robe / Guardian Angel / Wendigo!
        const counterDmgStep: Extract<PendingResolutionStep, { kind: 'DAMAGE' }> = {
          kind: 'DAMAGE',
          damageEventId: nextExpansionEventId(state, 'dmg-counter'),
          targetPlayerId: origAttacker.playerId,
          rawAmount: cRaw,
          sourceType: 'attack',
          attackerPlayerId: dung.playerId,
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
        const healed = actor.alive ? applyHeal(state, actor, 1) : 0;
        appendPublicLog(
          state,
          'event',
          `🦇 ${actor.displayName} dùng "${step.cardTitle}" lên ${target.displayName} (-${step.dealtToTarget} HP, bản thân +${healed} HP).`,
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
          targetPlayerId: actor.playerId,
          rawAmount: 2,
          sourceType: 'event',
          attackerPlayerId: null,
          isTalismanWardable: true,
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
        revealPlayerNow(state, wendigo, 'voluntary', nowMs);
        const healed = applyHeal(state, wendigo, 1);
        incRoleStat(exp.stats.activationsByRole, 'exp1_wendigo', 1);
        incRoleStat(exp.stats.healByRole, 'exp1_wendigo', healed);
        appendPublicLog(
          state,
          'reveal',
          `🎭🩸 ${wendigo.displayName} lật vai Wendigo — Tiệc Thịt: hồi ${healed} HP (hiện ${wendigo.hp}/${wendigo.maxHp})!`,
          nowMs,
          wendigo.playerId,
        );
        appendHighlight(
          state,
          `Lộ vai: ${wendigo.displayName}`,
          `Wendigo (${FACTION_LABELS[wendigo.faction]}) — Tiệc Thịt`,
          nowMs,
        );
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
        { victorChecked: true, victorBoostTargetId: boostTargetId },
      );
    }

    case 'undying_reveal_reduce': {
      const undying = state.players[data.undyingPlayerId];
      if (optionId === 'reveal_and_reduce' && undying && undying.alive) {
        revealPlayerNow(state, undying, 'voluntary', nowMs);
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
      }
      // Khi decline hoặc timeout: KHÔNG phát log công khai nhắc tên Undying (zero secret leak!)
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
