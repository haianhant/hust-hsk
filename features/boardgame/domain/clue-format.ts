// ---------------------------------------------------------------------------
// features/boardgame/domain/clue-format.ts — Định dạng Mật Báo Riêng có cấu trúc
// (Hiệu ứng / Tên / Chi tiết / Diễn biến / Kết quả) cho Thẻ Xanh Khám Phá Kín
// & kỹ năng soi bí mật (Clairvoyant).
// ---------------------------------------------------------------------------

import type {
  BoardGameFactionId,
  BoardGamePrivateClueEntry,
} from '../../../shared/contracts/boardgame';
import { FACTION_LABELS } from './roles';
import type {
  AuthoritativePlayerState,
  CharacterDesign,
  GameCardDefinition,
} from './types';

export function extractShortCardName(cardTitle: string): string {
  return cardTitle.replace(/^Thăm\s*Dò\s*:\s*/i, '').trim() || cardTitle;
}

export function buildInvestigationRuleDetail(card: GameCardDefinition): string {
  switch (card.effectKind) {
    case 'inv_anger':
      return 'Nếu người nhận là Đội Săn Đêm / Hội Bóng Đêm => nộp 1 Trang bị hoặc chịu 1 ST';
    case 'inv_blackmail':
      return 'Nếu người nhận là Đội Săn Đêm / Kẻ Độc Hành => nộp 1 Trang bị hoặc chịu 1 ST';
    case 'inv_greed':
      return 'Nếu người nhận là Kẻ Độc Hành / Hội Bóng Đêm => nộp 1 Trang bị hoặc chịu 1 ST';
    case 'inv_slap':
      return 'Nếu người nhận là Đội Săn Đêm => chịu 1 ST';
    case 'inv_spell':
      return 'Nếu người nhận là Hội Bóng Đêm => chịu 1 ST';
    case 'inv_exorcism':
      return 'Nếu người nhận là Hội Bóng Đêm => chịu 2 ST';
    case 'inv_aid':
      return 'Nếu người nhận là Đội Săn Đêm => hồi 1 thương tích (nếu đang 0 vết thì chịu 1 ST)';
    case 'inv_nurturance':
      return 'Nếu người nhận là Kẻ Độc Hành => hồi 1 thương tích (nếu đang 0 vết thì chịu 1 ST)';
    case 'inv_huddle':
      return 'Nếu người nhận là Hội Bóng Đêm => hồi 1 thương tích (nếu đang 0 vết thì chịu 1 ST)';
    case 'inv_bully':
      return 'Nếu Máu tối đa <= 11 => chịu 1 ST';
    case 'inv_tough_lesson':
      return 'Nếu Máu tối đa >= 12 => chịu 2 ST';
    case 'inv_prediction':
      return 'Người nhận phải bí mật cho riêng người đưa thẻ biết nhân vật thật của mình';
    default:
      return card.summary;
  }
}

export interface BuildPredictionCluesInput {
  round: number;
  atMs: number;
  card: GameCardDefinition;
  actor: Pick<AuthoritativePlayerState, 'playerId' | 'displayName'>;
  target: Pick<AuthoritativePlayerState, 'playerId' | 'displayName' | 'faction' | 'maxHp'>;
  targetRole: Pick<CharacterDesign, 'name'>;
}

export function buildPredictionClues(input: BuildPredictionCluesInput): {
  actorClue: Omit<BoardGamePrivateClueEntry, 'id'>;
  targetClue: Omit<BoardGamePrivateClueEntry, 'id'>;
} {
  const { round, atMs, card, actor, target, targetRole } = input;
  const shortName = extractShortCardName(card.title);
  const ruleDetail = buildInvestigationRuleDetail(card);
  const factionLabel = FACTION_LABELS[target.faction];

  return {
    actorClue: {
      round,
      atMs,
      cardId: card.id,
      cardTitle: card.title,
      targetPlayerId: target.playerId,
      targetName: target.displayName,
      outcome: 'condition-met',
      direction: 'sent',
      effectCategory: 'Thăm dò',
      cardShortName: shortName,
      ruleDetail,
      progression: `Bạn đã đưa thẻ "${shortName}" cho ${target.displayName}`,
      resultSummary: `${target.displayName} là ${targetRole.name} (${factionLabel}, ${target.maxHp} HP)`,
      senderName: actor.displayName,
      detail: `🔮 Tiên Tri: ${target.displayName} chính là ${targetRole.name} (${factionLabel}, ${target.maxHp} HP).`,
    },
    targetClue: {
      round,
      atMs,
      cardId: card.id,
      cardTitle: card.title,
      targetPlayerId: actor.playerId,
      targetName: actor.displayName,
      outcome: 'condition-met',
      direction: 'received',
      effectCategory: 'Thăm dò',
      cardShortName: shortName,
      ruleDetail,
      progression: `${actor.displayName} đã đưa thẻ "${shortName}" và xem vai thật của bạn (${targetRole.name})`,
      resultSummary: `Lộ vai bí mật (${targetRole.name}) cho riêng ${actor.displayName}`,
      senderName: actor.displayName,
      detail: `🔮 ${actor.displayName} đã đưa "${card.title}" và nhìn thấy vai thật của bạn (${targetRole.name}).`,
    },
  };
}

export interface BuildStandardInvestigationCluesInput {
  round: number;
  atMs: number;
  card: GameCardDefinition;
  actor: Pick<AuthoritativePlayerState, 'playerId' | 'displayName'>;
  target: Pick<AuthoritativePlayerState, 'playerId' | 'displayName' | 'equipped' | 'woundsTaken'>;
  outcome: 'condition-met' | 'no-reaction';
  usedDeceit: boolean;
  usedArleneDisguise?: boolean;
  transferredGearName: string | null;
  damageDealt: number;
  healedAmount: number;
  healBlocked?: boolean;
  hadZeroWoundsOnHealCard?: boolean;
  hadNoGearOnDemandCard?: boolean;
  keptGearOverDamage?: boolean;
  effectNote: string;
}

export function buildStandardInvestigationClues(
  input: BuildStandardInvestigationCluesInput,
): {
  actorClue: Omit<BoardGamePrivateClueEntry, 'id'>;
  targetClue: Omit<BoardGamePrivateClueEntry, 'id'>;
} {
  const {
    round,
    atMs,
    card,
    actor,
    target,
    outcome,
    usedDeceit,
    usedArleneDisguise = false,
    transferredGearName,
    damageDealt,
    healedAmount,
    healBlocked = false,
    hadZeroWoundsOnHealCard = false,
    hadNoGearOnDemandCard = false,
    keptGearOverDamage = false,
    effectNote,
  } = input;

  const shortName = extractShortCardName(card.title);
  const ruleDetail = buildInvestigationRuleDetail(card);
  const condTag = card.conditionText ?? card.title;

  let resultSummary = 'Không phản ứng (0 ST)';
  if (transferredGearName) {
    resultSummary = `Giao nộp "${transferredGearName}"`;
  } else if (damageDealt > 0) {
    resultSummary = `-${damageDealt} ST`;
  } else if (healedAmount > 0) {
    resultSummary = `+${healedAmount} HP (Hồi ${healedAmount} thương tích)`;
  } else if (healBlocked) {
    resultSummary = 'Hồi máu bị chặn (0 HP)';
  } else if (outcome === 'condition-met') {
    resultSummary = effectNote;
  }

  let recipientProgression = 'Bạn không thuộc điều kiện của thẻ này';
  if (usedDeceit) {
    recipientProgression =
      outcome === 'condition-met'
        ? 'Bạn dùng Ngụy Trang Đa Tầng (Unknown) giả danh khớp điều kiện để nhận hồi máu'
        : 'Bạn dùng Ngụy Trang Đa Tầng (Unknown) để né hiệu ứng thẻ';
  } else if (usedArleneDisguise) {
    recipientProgression =
      outcome === 'condition-met'
        ? 'Bạn kích hoạt Điệu Bộ (Arlene giả dạng Hội Bóng Đêm) và khớp điều kiện thẻ'
        : 'Bạn kích hoạt Điệu Bộ (Arlene giả dạng Hội Bóng Đêm) nên không khớp điều kiện thẻ';
  } else if (outcome === 'condition-met') {
    if (transferredGearName) {
      recipientProgression = `Bạn khớp điều kiện và giao nộp "${transferredGearName}" cho ${actor.displayName}`;
    } else if (hadNoGearOnDemandCard) {
      recipientProgression = 'Bạn khớp điều kiện nhưng không có Trang bị';
    } else if (keptGearOverDamage) {
      recipientProgression = 'Bạn khớp điều kiện và giữ Trang bị (chọn chịu thương tích)';
    } else if (hadZeroWoundsOnHealCard) {
      recipientProgression = 'Bạn khớp điều kiện nhưng đang 0 thương tích (bị phản 1 ST)';
    } else if (healedAmount > 0 || healBlocked) {
      recipientProgression = healBlocked
        ? 'Bạn khớp điều kiện hồi máu nhưng đang bị hào quang cấm hồi máu chặn lại'
        : 'Bạn khớp điều kiện và đang có thương tích';
    } else {
      recipientProgression = 'Bạn khớp điều kiện của thẻ';
    }
  }

  let senderProgression = `${target.displayName} không khớp điều kiện (hoặc đã ngụy trang)`;
  if (outcome === 'condition-met') {
    if (transferredGearName) {
      senderProgression = `${target.displayName} khớp điều kiện và nộp "${transferredGearName}" cho bạn`;
    } else if (hadNoGearOnDemandCard) {
      senderProgression = `${target.displayName} khớp điều kiện và không có Trang bị`;
    } else if (keptGearOverDamage) {
      senderProgression = `${target.displayName} khớp điều kiện và chọn chịu sát thương thay vì nộp đồ`;
    } else if (hadZeroWoundsOnHealCard) {
      senderProgression = `${target.displayName} khớp điều kiện nhưng đang 0 vết nên phải nhận sát thương`;
    } else if (healedAmount > 0) {
      senderProgression = `${target.displayName} khớp điều kiện và được hồi thương tích`;
    } else if (healBlocked) {
      senderProgression = `${target.displayName} khớp điều kiện hồi máu nhưng bị chặn hồi máu`;
    } else {
      senderProgression = `${target.displayName} khớp điều kiện của thẻ`;
    }
  }

  const senderResultSummary = transferredGearName
    ? `Thu được "${transferredGearName}"`
    : resultSummary;

  return {
    actorClue: {
      round,
      atMs,
      cardId: card.id,
      cardTitle: card.title,
      targetPlayerId: target.playerId,
      targetName: target.displayName,
      outcome,
      direction: 'sent',
      effectCategory: 'Thăm dò',
      cardShortName: shortName,
      ruleDetail,
      progression: senderProgression,
      resultSummary: senderResultSummary,
      senderName: actor.displayName,
      detail: `[${condTag}] ${target.displayName} → ${effectNote}`,
    },
    targetClue: {
      round,
      atMs,
      cardId: card.id,
      cardTitle: card.title,
      targetPlayerId: actor.playerId,
      targetName: actor.displayName,
      outcome,
      direction: 'received',
      effectCategory: 'Thăm dò',
      cardShortName: shortName,
      ruleDetail,
      progression: recipientProgression,
      resultSummary,
      senderName: actor.displayName,
      detail: usedDeceit
        ? `🎭 ${actor.displayName} đưa "${card.title}" [${condTag}] — Bạn đã Ngụy Trang Đa Tầng → ${effectNote}`
        : usedArleneDisguise
          ? `🎭 ${actor.displayName} đưa "${card.title}" [${condTag}] — Điệu Bộ (Arlene giả dạng Shadow, giữ nguyên phe Neutral) → ${effectNote}`
          : `Bạn nhận "${card.title}" [${condTag}] từ ${actor.displayName} → ${effectNote}`,
    },
  };
}

export function buildClairvoyantSkillClue(input: {
  round: number;
  atMs: number;
  target: Pick<AuthoritativePlayerState, 'playerId' | 'displayName' | 'faction' | 'maxHp'>;
  targetDesign: Pick<CharacterDesign, 'name'>;
}): Omit<BoardGamePrivateClueEntry, 'id'> {
  const { round, atMs, target, targetDesign } = input;
  const factionLabel = FACTION_LABELS[target.faction];
  return {
    round,
    atMs,
    cardTitle: 'Lời Tiên Tri (Clairvoyant)',
    targetPlayerId: target.playerId,
    targetName: target.displayName,
    outcome: 'condition-met',
    direction: 'skill',
    effectCategory: 'Kỹ năng · Tiên Tri',
    cardShortName: 'Lời Tiên Tri',
    ruleDetail: 'Soi bí mật 1 nhân vật chưa lộ diện và sao chép điều kiện chiến thắng của họ',
    progression: `Bạn đã soi bí mật danh tính của ${target.displayName}`,
    resultSummary: `${targetDesign.name} (${factionLabel}, ${target.maxHp} HP) — đã sao chép điều kiện thắng`,
    detail: `🔮 Lời Tiên Tri: ${target.displayName} là ${targetDesign.name} (${factionLabel}, ${target.maxHp} HP). Bạn đã sao chép điều kiện thắng của vai này!`,
  };
}
