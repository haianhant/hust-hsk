// ---------------------------------------------------------------------------
// features/boardgame/domain/bot-ai.ts — Server-Authoritative Bot AI cho
// Bóng Đêm KTX (Shadow Hunters: Classic, Expansion 1, Expansion 2 & Full).
//
// Thuần túy (không chạm DOM/network), luôn sinh 1 nước đi hợp lệ tiếp theo
// cho Bot đang nắm quyền (`pendingChoice.ownerPlayerId` hoặc effective turn controller),
// đảm bảo không bao giờ làm kẹt bàn và không đọc thông tin gian lận của vai ẩn.
// ---------------------------------------------------------------------------

import type {
  BoardGameActionPayload,
  BoardGameLocationId,
} from '../../../shared/contracts/boardgame';
import { getCardById } from './cards';
import { getEffectiveFaction } from './dynamic-allegiance';
import { getEffectiveSkillRoleId, hasEffectiveSkillUsedOnce } from './dynamic-skill-copy';
import {
  isExpandedRuleset,
  listExpandedReachableAttackTargets,
} from './expansion-skills';
import { isPlayerTargetable } from './pending-resurrection';
import { getRoleDesign, isEligibleForChocolateHeal } from './roles';
import {
  getRemainingHp,
  listReachableAttackTargets,
  LOCATIONS_CATALOG,
} from './rules';
import { getEffectiveTurnControllerId } from './turn-ownership';
import type { AuthoritativeGameState, AuthoritativePlayerState } from './types';

function pickDeterministicIndex(state: AuthoritativeGameState, salt: number, len: number): number {
  if (len <= 1) return 0;
  const h = Math.imul((state.rngState ^ (state.turnNumber * 2654435761) ^ salt) >>> 0, 1597334677) >>> 0;
  return h % len;
}

function isLikelyAlly(
  state: AuthoritativeGameState,
  bot: AuthoritativePlayerState,
  other: AuthoritativePlayerState,
): boolean {
  if (!other.revealed) return false;
  const botFac = getEffectiveFaction(state, bot);
  if (botFac === 'wanderer') return false;
  const otherFac = getEffectiveFaction(state, other);
  return otherFac === botFac;
}

function isLikelyEnemy(
  state: AuthoritativeGameState,
  bot: AuthoritativePlayerState,
  other: AuthoritativePlayerState,
): boolean {
  if (!other.revealed) return false;
  const botFac = getEffectiveFaction(state, bot);
  const otherFac = getEffectiveFaction(state, other);
  if (botFac === 'lantern-guard') return otherFac === 'mist-order';
  if (botFac === 'mist-order') return otherFac === 'lantern-guard';
  return false;
}

function chooseBestAttackTarget(
  state: AuthoritativeGameState,
  bot: AuthoritativePlayerState,
  candidates: readonly AuthoritativePlayerState[],
): AuthoritativePlayerState | null {
  if (candidates.length === 0) return null;
  const enemies = candidates.filter((c) => isLikelyEnemy(state, bot, c));
  const pool =
    enemies.length > 0
      ? enemies
      : candidates.filter((c) => !isLikelyAlly(state, bot, c));
  const effectivePool = pool.length > 0 ? pool : candidates;
  // Ưu tiên mục tiêu đang có nhiều thương tích hơn (dễ kết liễu) hoặc nhiều đồ hơn
  const sorted = [...effectivePool].sort(
    (a, b) => b.woundsTaken - a.woundsTaken || b.equipped.length - a.equipped.length,
  );
  return sorted[0] ?? null;
}

function chooseBotPendingChoiceAction(
  state: AuthoritativeGameState,
  botId: string,
): BoardGameActionPayload | null {
  const pc = state.pendingChoice;
  if (!pc || pc.ownerPlayerId !== botId) return null;
  const opts = pc.options;
  if (!opts || opts.length === 0) return null;

  // Ưu tiên phương án có lợi rõ ràng trước defaultOptionId
  const bot = state.players[botId];
  const findOpt = (pred: (o: (typeof opts)[number]) => boolean) => opts.find(pred);

  if (pc.kind === 'arnold_reflect_lethal' || pc.kind === 'undying_reveal_reduce') {
    const reactive = findOpt((o) => o.optionId !== 'decline' && o.optionId !== 'skip');
    if (reactive) {
      return { type: 'RESOLVE_CHOICE', choiceId: pc.choiceId, optionId: reactive.optionId };
    }
  }

  if (pc.kind === 'wendigo_reveal_heal' || pc.kind === 'urban_legend_reveal_heal') {
    if (bot && bot.woundsTaken >= 2) {
      const healOpt = findOpt((o) => o.optionId !== 'decline' && o.optionId !== 'skip');
      if (healOpt) {
        return { type: 'RESOLVE_CHOICE', choiceId: pc.choiceId, optionId: healOpt.optionId };
      }
    }
  }

  if (pc.kind === 'fiona_attack_roll') {
    const bestRoll = [...opts]
      .filter((o) => o.roll)
      .sort((a, b) => (b.roll?.totalDmg ?? 0) - (a.roll?.totalDmg ?? 0))[0];
    if (bestRoll) {
      return { type: 'RESOLVE_CHOICE', choiceId: pc.choiceId, optionId: bestRoll.optionId };
    }
  }

  if (pc.kind === 'felicia_draw_choice') {
    // Ưu tiên giữ trang bị vĩnh viễn nếu có
    const equipOpt = findOpt((o) => Boolean(o.card && o.card.isConsumable === false));
    if (equipOpt) {
      return { type: 'RESOLVE_CHOICE', choiceId: pc.choiceId, optionId: equipOpt.optionId };
    }
  }

  if (pc.kind === 'bipolar_fate_coin') {
    const healOpt = findOpt((o) => o.optionId === 'heal');
    if (bot && bot.woundsTaken >= 3 && healOpt) {
      return { type: 'RESOLVE_CHOICE', choiceId: pc.choiceId, optionId: healOpt.optionId };
    }
  }

  const nonSkip = opts.find(
    (o) =>
      o.optionId !== 'skip' &&
      o.optionId !== 'decline' &&
      o.optionId !== 'keep' &&
      o.optionId !== pc.defaultOptionId,
  );
  // Với các lựa chọn chọn mục tiêu (Clairvoyant, Anathema, Bethany, Visions, Vengeance, Voodoo...) chọn phương án chủ động hợp lệ
  if (
    nonSkip &&
    (pc.kind === 'clairvoyant_peek_copy' ||
      pc.kind === 'anathema_curse_target' ||
      pc.kind === 'bethany_designate_chosen' ||
      pc.kind === 'visions_mark_target' ||
      pc.kind === 'vengeance_chain_strike' ||
      pc.kind === 'voodoo_select_puppet' ||
      pc.kind === 'gideon_white_card_target' ||
      pc.kind === 'gwendolen_counter_attack' ||
      pc.kind === 'freyja_extra_attack' ||
      pc.kind === 'colt_theft_counter' ||
      pc.kind === 'colt_recover_or_damage' ||
      pc.kind === 'elise_distribute_heal' ||
      pc.kind === 'cassie_turn_heal' ||
      pc.kind === 'wrath_turn_start_aoe')
  ) {
    return { type: 'RESOLVE_CHOICE', choiceId: pc.choiceId, optionId: nonSkip.optionId };
  }

  const fallback =
    opts.find((o) => o.optionId === pc.defaultOptionId) ?? opts[0];
  return {
    type: 'RESOLVE_CHOICE',
    choiceId: pc.choiceId,
    optionId: fallback.optionId,
  };
}

/**
 * Tính đúng 1 hành động hợp lệ tiếp theo cho Bot đang cần thao tác.
 * Trả về `null` nếu không phải lượt / pendingChoice của Bot.
 */
export function chooseBotAction(
  state: AuthoritativeGameState,
  botPlayerId: string,
): BoardGameActionPayload | null {
  if (state.finished || state.turnPhase === 'ENDED') return null;

  // 1. Ưu tiên xử lý PendingChoice nếu thuộc quyền Bot
  if (state.pendingChoice) {
    return chooseBotPendingChoiceAction(state, botPlayerId);
  }

  // 2. Xác định quyền điều khiển lượt hiện tại (tôn trọng Voodoo TurnControlGrant)
  const controllerId = getEffectiveTurnControllerId(state);
  if (controllerId !== botPlayerId) return null;
  const activeActor = state.activePlayerId ? state.players[state.activePlayerId] : null;
  if (!activeActor || !activeActor.alive) return null;
  const expanded = isExpandedRuleset(state);
  const isControllingOther = activeActor.playerId !== botPlayerId;

  const livingOthers = state.turnOrder
    .map((pid) => state.players[pid])
    .filter(
      (p): p is AuthoritativePlayerState =>
        Boolean(p && p.playerId !== activeActor.playerId && (expanded ? isPlayerTargetable(state, p) : p.alive)),
    );

  // 3. Pha 1A — ROLL_MOVE
  if (state.turnPhase === 'ROLL_MOVE') {
    if (!isControllingOther && activeActor.revealed) {
      const effRole = expanded ? getEffectiveSkillRoleId(state, activeActor) : activeActor.roleId;
      if (effRole === 'exp2_father_harrison' && activeActor.location !== 'lobby' && activeActor.woundsTaken >= 3) {
        return { type: 'USE_SKILL' };
      }
      if (effRole === 'gac-truc-ban' && pickDeterministicIndex(state, 11, 3) === 0) {
        return { type: 'USE_SKILL' };
      }
    }
    return { type: 'ROLL_DICE' };
  }

  // 4. Pha 1B — CHOOSE_MOVE (Tổng 7 hoặc La Bàn)
  if (state.turnPhase === 'CHOOSE_MOVE') {
    const allowed: BoardGameLocationId[] =
      state.allowedMoveDestinations && state.allowedMoveDestinations.length > 0
        ? [...state.allowedMoveDestinations]
        : LOCATIONS_CATALOG.filter((l) => l.id !== activeActor.location).map((l) => l.id);

    const priority: BoardGameLocationId[] =
      activeActor.woundsTaken >= 4
        ? ['lobby', 'corridor', 'breaker', 'radio', 'court', 'canteen']
        : activeActor.equipped.length < 2
          ? ['canteen', 'lobby', 'breaker', 'court', 'radio', 'corridor']
          : ['radio', 'canteen', 'corridor', 'court', 'breaker', 'lobby'];

    for (const loc of priority) {
      if (allowed.includes(loc) && loc !== activeActor.location) {
        return { type: 'CHOOSE_DEST', location: loc };
      }
    }
    const picked = allowed[pickDeterministicIndex(state, 23, allowed.length)] ?? 'lobby';
    return { type: 'CHOOSE_DEST', location: picked };
  }

  // 5. Pha 2 — LOCATION_ACTION
  if (state.turnPhase === 'LOCATION_ACTION') {
    switch (activeActor.location) {
      case 'radio':
        if (state.decks.investigation.length > 0 || state.discards.investigation.length > 0) {
          return { type: 'DRAW_CARD', deck: 'investigation' };
        }
        return { type: 'SKIP_LOC' };
      case 'lobby':
        if (state.decks.equipment.length > 0 || state.discards.equipment.length > 0) {
          return { type: 'DRAW_CARD', deck: 'equipment' };
        }
        return { type: 'SKIP_LOC' };
      case 'canteen':
        if (state.decks.event.length > 0 || state.discards.event.length > 0) {
          return { type: 'DRAW_CARD', deck: 'event' };
        }
        return { type: 'SKIP_LOC' };
      case 'breaker': {
        const deckOrder: ('equipment' | 'event' | 'investigation')[] =
          activeActor.woundsTaken >= 4
            ? ['equipment', 'investigation', 'event']
            : activeActor.equipped.length < 2
              ? ['event', 'equipment', 'investigation']
              : ['investigation', 'event', 'equipment'];
        for (const d of deckOrder) {
          if (state.decks[d].length > 0 || state.discards[d].length > 0) {
            return { type: 'DRAW_CARD', deck: d };
          }
        }
        return { type: 'SKIP_LOC' };
      }
      case 'corridor': {
        if (activeActor.woundsTaken >= 2) {
          return { type: 'USE_LOC_POWER', mode: 'heal', targetPlayerId: activeActor.playerId };
        }
        const dmgTarget = chooseBestAttackTarget(state, activeActor, livingOthers);
        if (dmgTarget) {
          return { type: 'USE_LOC_POWER', mode: 'damage', targetPlayerId: dmgTarget.playerId };
        }
        return { type: 'SKIP_LOC' };
      }
      case 'court': {
        const donors = livingOthers.filter((p) => p.equipped.length > 0);
        if (donors.length > 0) {
          const victim = chooseBestAttackTarget(state, activeActor, donors) ?? donors[0];
          const gearId = victim.equipped[0];
          return {
            type: 'USE_LOC_POWER',
            mode: 'steal',
            targetPlayerId: victim.playerId,
            ...(gearId ? { equipCardId: gearId } : {}),
          };
        }
        return { type: 'SKIP_LOC' };
      }
      default:
        return { type: 'SKIP_LOC' };
    }
  }

  // 6. Pha 3 — MAIN_ACTION: Giải quyết toàn bộ bài trên tay trước!
  if (activeActor.hand.length > 0) {
    const cardId = activeActor.hand[0];
    const card = getCardById(cardId);
    if (card) {
      if (card.deck === 'investigation') {
        const uninvestigated = livingOthers.filter(
          (p) => !activeActor.investigatedTargetIds.includes(p.playerId),
        );
        const pool = uninvestigated.length > 0 ? uninvestigated : livingOthers;
        const target = pool[pickDeterministicIndex(state, 37, pool.length)] ?? livingOthers[0];
        if (target) {
          return { type: 'INVESTIGATE_CARD', cardId: card.id, targetPlayerId: target.playerId };
        }
      }
      if (card.isConsumable === false) {
        return { type: 'EQUIP_CARD', cardId: card.id };
      }
      switch (card.effectKind) {
        case 'eq_blessing': {
          const injuredOthers = livingOthers.filter((p) => p.woundsTaken > 0);
          const ally = injuredOthers.find((p) => isLikelyAlly(state, activeActor, p));
          const target = ally ?? injuredOthers[0] ?? livingOthers[0];
          if (target) {
            return { type: 'USE_CARD', cardId: card.id, targetPlayerId: target.playerId };
          }
          return { type: 'USE_CARD', cardId: card.id };
        }
        case 'eq_first_aid': {
          if (activeActor.woundsTaken > 7) {
            return { type: 'USE_CARD', cardId: card.id, targetPlayerId: activeActor.playerId };
          }
          const healthyEnemy = livingOthers.find(
            (p) => p.woundsTaken < 5 && !isLikelyAlly(state, activeActor, p),
          );
          const target = healthyEnemy ?? livingOthers[0] ?? activeActor;
          return { type: 'USE_CARD', cardId: card.id, targetPlayerId: target.playerId };
        }
        case 'eq_advent': {
          const canUse =
            !isControllingOther &&
            getEffectiveFaction(state, activeActor) === 'lantern-guard' &&
            activeActor.woundsTaken >= 2 &&
            !(activeActor.roleId === 'exp1_fallen' && !activeActor.revealed && getRemainingHp(activeActor) < 8);
          return { type: 'USE_CARD', cardId: card.id, skipEffect: !canUse };
        }
        case 'eq_chocolate': {
          const canUse =
            !isControllingOther &&
            isEligibleForChocolateHeal(activeActor.roleId, expanded) &&
            activeActor.woundsTaken >= 2 &&
            !(activeActor.roleId === 'exp1_undead' && !activeActor.revealed);
          return { type: 'USE_CARD', cardId: card.id, skipEffect: !canUse };
        }
        case 'ev_diabolic_ritual': {
          const canUse =
            !isControllingOther &&
            getEffectiveFaction(state, activeActor) === 'mist-order' &&
            activeActor.woundsTaken >= 2;
          return { type: 'USE_CARD', cardId: card.id, skipEffect: !canUse };
        }
        case 'ev_vampire_bat':
        case 'ev_spider':
        case 'ev_spiritual_doll': {
          const target = chooseBestAttackTarget(state, activeActor, livingOthers);
          if (target) {
            return { type: 'USE_CARD', cardId: card.id, targetPlayerId: target.playerId };
          }
          return { type: 'USE_CARD', cardId: card.id };
        }
        case 'ev_moody_goblin': {
          const donors = livingOthers.filter((p) => p.equipped.length > 0);
          const victim = chooseBestAttackTarget(state, activeActor, donors) ?? donors[0];
          if (victim) {
            return {
              type: 'USE_CARD',
              cardId: card.id,
              targetPlayerId: victim.playerId,
              ...(victim.equipped[0] ? { equipCardId: victim.equipped[0] } : {}),
            };
          }
          return { type: 'USE_CARD', cardId: card.id };
        }
        case 'ev_banana_peel': {
          const ally = livingOthers.find((p) => isLikelyAlly(state, activeActor, p));
          const recipient = ally ?? livingOthers[0];
          const gearId = activeActor.equipped[0];
          return {
            type: 'USE_CARD',
            cardId: card.id,
            ...(recipient ? { targetPlayerId: recipient.playerId } : {}),
            ...(gearId ? { equipCardId: gearId } : {}),
          };
        }
        default:
          return { type: 'USE_CARD', cardId: card.id };
      }
    }
  }

  // 7. Chủ động lật vai (nếu không bị khóa & không bị Voodoo chiếm quyền)
  if (
    !isControllingOther &&
    !activeActor.revealed &&
    activeActor.roleId !== 'lang-tien-phong' &&
    activeActor.roleId !== 'exp1_undead' &&
    activeActor.roleId !== 'exp2_april_skipps' &&
    activeActor.roleId !== 'suong-tin-gia' &&
    !(activeActor.roleId === 'exp1_fallen' && getRemainingHp(activeActor) < 8) &&
    (activeActor.woundsTaken >= 4 || state.round >= 3)
  ) {
    return { type: 'REVEAL_ROLE' };
  }

  // 8. Kỹ năng chủ động đơn giản (George / Franklin / Allie) khi đã lộ vai
  if (!isControllingOther && activeActor.revealed) {
    const effRoleId = expanded ? getEffectiveSkillRoleId(state, activeActor) : activeActor.roleId;
    const roleDef = getRoleDesign(effRoleId as Parameters<typeof getRoleDesign>[0]);
    const usedOnce = expanded
      ? hasEffectiveSkillUsedOnce(state, activeActor)
      : activeActor.skillUsedOnce;
    const ready = (!roleDef.oncePerMatch || !usedOnce) && activeActor.skillCooldown === 0;

    if (ready && effRoleId === 'lang-quan-sat' && activeActor.woundsTaken >= 3) {
      return { type: 'USE_SKILL' };
    }
    if (ready && (effRoleId === 'gac-ky-thuat' || effRoleId === 'gac-radio') && livingOthers.length > 0) {
      const target = chooseBestAttackTarget(state, activeActor, livingOthers);
      if (target) {
        return { type: 'USE_SKILL', targetPlayerId: target.playerId };
      }
    }
  }

  // 9. Tấn công trong tầm đánh (bắt buộc nếu cầm Masamune ev-01)
  if (activeActor.attacksThisTurn === 0) {
    const reachable = expanded
      ? listExpandedReachableAttackTargets(state, activeActor)
      : listReachableAttackTargets(state, activeActor);
    if (reachable.length > 0) {
      const hasMasamune = activeActor.equipped.includes('ev-01');
      const target = chooseBestAttackTarget(state, activeActor, reachable);
      if (target && (hasMasamune || !isLikelyAlly(state, activeActor, target))) {
        return { type: 'ATTACK', targetPlayerId: target.playerId };
      }
    }
  }

  // 10. Kết thúc lượt
  return { type: 'END_TURN' };
}
