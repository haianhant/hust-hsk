// ---------------------------------------------------------------------------
// features/boardgame/ui/midnight-noir-tokens.ts
// Art Direction: "HUSTVerse Midnight — Anime Noir"
// Định nghĩa bảng màu 3 phe (Emerald/Gold · Crimson/Violet · Amber/Silver),
// bảng màu 3 chồng bài, ánh xạ artwork AI 2:3 và luật hiển thị bảo mật P0.
// ---------------------------------------------------------------------------

import type {
  BoardGameDeckId,
  BoardGameFactionId,
  BoardGameLocationId,
  BoardGameRoleId,
} from '../../../shared/contracts/boardgame';
import { getCardById } from '../domain/cards';
import { getRoleDesign } from '../domain/roles';

export interface MidnightFactionToken {
  id: BoardGameFactionId;
  label: string;
  englishTag: string;
  paletteSummary: string;
  primaryHex: string;
  secondaryHex: string;
  frameGradientCss: string;
  surfaceGradientCss: string;
  plaqueGradientCss: string;
  foilGradientCss: string;
  glowShadowCss: string;
  badgeClass: string;
  hpSealBg: string;
  hpSealText: string;
}

/**
 * 3 hệ màu Anime Noir cho 3 phe (lấy cảm hứng trình bày từ Legends of Runeterra,
 * Marvel Snap & Tam Quốc Sát nhưng giữ nguyên bản sắc Bóng Đêm KTX).
 */
export const MIDNIGHT_FACTION_TOKENS: Record<BoardGameFactionId, MidnightFactionToken> = {
  'lantern-guard': {
    id: 'lantern-guard',
    label: 'Đội Săn Đêm',
    englishTag: 'EMERALD & GOLD',
    paletteSummary: 'Ngọc lục bảo phát sáng trên khung đồng vàng hoàng kim',
    primaryHex: '#10b981',
    secondaryHex: '#fbbf24',
    frameGradientCss:
      'linear-gradient(135deg, #fef3c7 0%, #d97706 24%, #10b981 52%, #f59e0b 78%, #fef08a 100%)',
    surfaceGradientCss:
      'radial-gradient(120% 90% at 50% 15%, rgba(16, 185, 129, 0.28) 0%, rgba(6, 78, 59, 0.45) 45%, #060b11 100%)',
    plaqueGradientCss:
      'linear-gradient(180deg, rgba(4, 21, 18, 0.0) 0%, rgba(4, 21, 18, 0.0) 44%, rgba(5, 17, 21, 0.86) 68%, rgba(4, 9, 14, 0.98) 100%)',
    foilGradientCss:
      'linear-gradient(115deg, transparent 15%, rgba(52, 211, 153, 0.32) 38%, rgba(253, 230, 138, 0.42) 50%, rgba(16, 185, 129, 0.25) 62%, transparent 85%)',
    glowShadowCss: '0 22px 54px -12px rgba(16, 185, 129, 0.42), 0 0 24px rgba(251, 191, 36, 0.16)',
    badgeClass: 'border-emerald-300/65 bg-emerald-950/85 text-emerald-100',
    hpSealBg: 'linear-gradient(145deg, #10b981 0%, #065f46 58%, #022c22 100%)',
    hpSealText: '#ecfdf5',
  },
  'mist-order': {
    id: 'mist-order',
    label: 'Hội Bóng Đêm',
    englishTag: 'CRIMSON & VIOLET',
    paletteSummary: 'Huyết ngọc rực trên nền tím sương mù u tối',
    primaryHex: '#f43f5e',
    secondaryHex: '#a855f7',
    frameGradientCss:
      'linear-gradient(135deg, #fecdd3 0%, #e11d48 26%, #7e22ce 55%, #be123c 80%, #f5d0fe 100%)',
    surfaceGradientCss:
      'radial-gradient(120% 90% at 50% 15%, rgba(244, 63, 94, 0.3) 0%, rgba(88, 28, 135, 0.42) 48%, #07060d 100%)',
    plaqueGradientCss:
      'linear-gradient(180deg, rgba(24, 6, 20, 0.0) 0%, rgba(24, 6, 20, 0.0) 44%, rgba(18, 6, 22, 0.88) 68%, rgba(8, 5, 12, 0.98) 100%)',
    foilGradientCss:
      'linear-gradient(115deg, transparent 15%, rgba(251, 113, 133, 0.34) 38%, rgba(192, 132, 252, 0.42) 50%, rgba(225, 29, 72, 0.28) 62%, transparent 85%)',
    glowShadowCss: '0 22px 54px -12px rgba(244, 63, 94, 0.42), 0 0 26px rgba(168, 85, 247, 0.2)',
    badgeClass: 'border-rose-300/65 bg-rose-950/85 text-rose-100',
    hpSealBg: 'linear-gradient(145deg, #e11d48 0%, #701a75 62%, #2e1065 100%)',
    hpSealText: '#fff1f2',
  },
  wanderer: {
    id: 'wanderer',
    label: 'Kẻ Độc Hành',
    englishTag: 'AMBER & SILVER',
    paletteSummary: 'Hổ phách rực lửa khảm thép bạc phay xước sắc lạnh',
    primaryHex: '#f59e0b',
    secondaryHex: '#cbd5e1',
    frameGradientCss:
      'linear-gradient(135deg, #f8fafc 0%, #64748b 25%, #fbbf24 52%, #94a3b8 78%, #fef3c7 100%)',
    surfaceGradientCss:
      'radial-gradient(120% 90% at 50% 15%, rgba(245, 158, 11, 0.26) 0%, rgba(51, 65, 85, 0.48) 48%, #070a10 100%)',
    plaqueGradientCss:
      'linear-gradient(180deg, rgba(20, 14, 6, 0.0) 0%, rgba(20, 14, 6, 0.0) 44%, rgba(16, 15, 20, 0.88) 68%, rgba(7, 9, 14, 0.98) 100%)',
    foilGradientCss:
      'linear-gradient(115deg, transparent 15%, rgba(248, 250, 252, 0.34) 38%, rgba(251, 191, 36, 0.42) 50%, rgba(148, 163, 184, 0.28) 62%, transparent 85%)',
    glowShadowCss: '0 22px 54px -12px rgba(245, 158, 11, 0.38), 0 0 22px rgba(203, 213, 225, 0.18)',
    badgeClass: 'border-amber-300/65 bg-amber-950/85 text-amber-100',
    hpSealBg: 'linear-gradient(145deg, #f59e0b 0%, #78350f 58%, #1e293b 100%)',
    hpSealText: '#fffbeb',
  },
};

export interface MidnightDeckToken {
  deck: BoardGameDeckId;
  label: string;
  subtitle: string;
  accentHex: string;
  secondaryHex: string;
  frameGradientCss: string;
  backGradientCss: string;
  foilGradientCss: string;
  badgeClass: string;
  statLabel: string;
}

export const MIDNIGHT_DECK_TOKENS: Record<BoardGameDeckId, MidnightDeckToken> = {
  investigation: {
    deck: 'investigation',
    label: 'Thẻ Điều Tra',
    subtitle: 'Khám Phá Kín · 1-Đối-1',
    accentHex: '#10b981',
    secondaryHex: '#f59e0b',
    frameGradientCss:
      'linear-gradient(135deg, #a7f3d0 0%, #059669 32%, #d97706 68%, #6ee7b7 100%)',
    backGradientCss:
      'radial-gradient(circle at 50% 42%, rgba(16, 185, 129, 0.34), rgba(6, 78, 59, 0.72) 55%, #040d0c 100%)',
    foilGradientCss:
      'linear-gradient(120deg, transparent 20%, rgba(110, 231, 183, 0.32) 44%, rgba(251, 191, 36, 0.34) 56%, transparent 82%)',
    badgeClass: 'border-emerald-400/60 bg-emerald-950/90 text-emerald-100',
    statLabel: 'KÍN 1v1',
  },
  equipment: {
    deck: 'equipment',
    label: 'Thẻ Trang Bị',
    subtitle: 'Cung Ứng · Thánh Khí & Giáp',
    accentHex: '#38bdf8',
    secondaryHex: '#e2e8f0',
    frameGradientCss:
      'linear-gradient(135deg, #f8fafc 0%, #38bdf8 30%, #fbbf24 66%, #cbd5e1 100%)',
    backGradientCss:
      'radial-gradient(circle at 50% 42%, rgba(56, 189, 248, 0.32), rgba(12, 74, 110, 0.72) 55%, #040914 100%)',
    foilGradientCss:
      'linear-gradient(120deg, transparent 20%, rgba(224, 242, 254, 0.38) 44%, rgba(253, 224, 71, 0.36) 56%, transparent 82%)',
    badgeClass: 'border-sky-300/65 bg-sky-950/90 text-sky-100',
    statLabel: '+2 SÁT THƯƠNG',
  },
  event: {
    deck: 'event',
    label: 'Thẻ Đột Kích',
    subtitle: 'Sự Kiện & Vũ Khí Nguyền Rủa',
    accentHex: '#f43f5e',
    secondaryHex: '#a855f7',
    frameGradientCss:
      'linear-gradient(135deg, #fecdd3 0%, #e11d48 32%, #7e22ce 68%, #cbd5e1 100%)',
    backGradientCss:
      'radial-gradient(circle at 50% 42%, rgba(244, 63, 94, 0.32), rgba(76, 5, 25, 0.78) 55%, #09050b 100%)',
    foilGradientCss:
      'linear-gradient(120deg, transparent 20%, rgba(251, 113, 133, 0.34) 44%, rgba(192, 132, 252, 0.38) 56%, transparent 82%)',
    badgeClass: 'border-rose-400/65 bg-rose-950/90 text-rose-100',
    statLabel: 'BẮT BUỘC · 1d4',
  },
};

export const MIDNIGHT_CARD_BACK_ART = '/assets/boardgame/prototype/card-back-midnight-seal.webp';

/** Artwork bán thân AI tỷ lệ 2:3 đã sinh cho bản Prototype (Minh & Vy). */
export const PROTOTYPE_CHARACTER_ART: Partial<Record<BoardGameRoleId, string>> = {
  'gac-ky-thuat': '/assets/boardgame/prototype/role-minh-ky-thuat.webp',
  'gac-radio': '/assets/boardgame/prototype/role-vy-radio.webp',
};

/** Artwork AI tỷ lệ 2:3 cho 3 lá bài mẫu: Điều tra, Trang bị, Đột Kích. */
export const PROTOTYPE_CARD_ART: Readonly<Record<string, string>> = {
  'inv-12': '/assets/boardgame/prototype/card-inv-tien-tri.webp',
  'eq-04': '/assets/boardgame/prototype/card-eq-thuong-anh-sang.webp',
  'ev-01': '/assets/boardgame/prototype/card-ev-kiem-go-nguyen-rua.webp',
};

export const CARD_BACK_SECRET_TITLES: Record<BoardGameDeckId, string> = {
  investigation: 'HỒ SƠ KHÁM PHÁ KÍN',
  equipment: 'KIỆN CUNG ỨNG KTX',
  event: 'TÍN HIỆU ĐỘT KÍCH ĐÊM',
};

export const PROTOTYPE_SAMPLE_CARD_IDS = ['inv-12', 'eq-04', 'ev-01'] as const;

export type RoleViewerMode =
  | 'owner-peek'
  | 'owner-facedown'
  | 'other-player'
  | 'spectator';

export interface RoleCardPresentationInput {
  viewerMode: RoleViewerMode;
  revealed: boolean;
  roleId: BoardGameRoleId;
  woundsTaken: number;
  currentHp?: number;
  alive?: boolean;
  location?: BoardGameLocationId;
}

export interface RoleCardPresentation {
  /** `true` chỉ khi đã Lật Vai công khai HOẶC chính chủ nhân thẻ đang bấm soi bài. */
  showFront: boolean;
  /** Khi `showFront === false`, toàn bộ trường bí mật bắt buộc trả về `null` để DOM không rò rỉ. */
  roleId: BoardGameRoleId | null;
  faction: BoardGameFactionId | null;
  roleName: string | null;
  roleTitle: string | null;
  maxHp: number | null;
  hp: number | null;
  skillName: string | null;
  skillSummary: string | null;
  secretGoalText: string | null;
  portraitSrc: string | null;
  cardBackSrc: string;
  /** Thông tin công khai hợp lệ luôn hiển thị trên mặt lưng theo luật Shadow Hunters. */
  publicWoundsTaken: number;
  publicAlive: boolean;
  publicRevealed: boolean;
  privacyReason: string;
}

/**
 * Bộ lọc bảo mật trình bày Thẻ Nhân Vật:
 * Không bao giờ trả tên vai, phe, HP tối đa hay URL chân dung nếu người xem
 * không có quyền nhìn thấy mặt trước (giữ nguyên bất biến P0 của game).
 */
export function resolveRoleCardPresentation(
  input: RoleCardPresentationInput,
): RoleCardPresentation {
  const showFront = input.revealed || input.viewerMode === 'owner-peek';
  const woundsTaken = Math.max(0, Math.floor(input.woundsTaken));
  const alive = input.alive ?? true;

  if (!showFront) {
    const privacyReason =
      input.viewerMode === 'owner-facedown'
        ? 'Chủ thẻ đã úp mặt bài để tránh người ngồi cạnh nhìn màn hình'
        : input.viewerMode === 'spectator'
          ? 'Khán giả chỉ thấy mặt lưng bí mật cho đến khi nhân vật lật vai'
          : 'Người chơi khác chỉ thấy số vết thương và vị trí khi vai chưa lật';

    return {
      showFront: false,
      roleId: null,
      faction: null,
      roleName: null,
      roleTitle: null,
      maxHp: null,
      hp: null,
      skillName: null,
      skillSummary: null,
      secretGoalText: null,
      portraitSrc: null,
      cardBackSrc: MIDNIGHT_CARD_BACK_ART,
      publicWoundsTaken: woundsTaken,
      publicAlive: alive,
      publicRevealed: false,
      privacyReason,
    };
  }

  const design = getRoleDesign(input.roleId);
  const computedHp =
    typeof input.currentHp === 'number'
      ? Math.max(0, Math.min(design.maxHp, input.currentHp))
      : Math.max(0, design.maxHp - woundsTaken);

  return {
    showFront: true,
    roleId: design.id,
    faction: design.faction,
    roleName: design.name,
    roleTitle: design.title,
    maxHp: design.maxHp,
    hp: computedHp,
    skillName: design.skillName,
    skillSummary: design.skillSummary,
    secretGoalText: design.secretGoalText,
    portraitSrc: PROTOTYPE_CHARACTER_ART[design.id] ?? null,
    cardBackSrc: MIDNIGHT_CARD_BACK_ART,
    publicWoundsTaken: woundsTaken,
    publicAlive: alive,
    publicRevealed: input.revealed,
    privacyReason: input.revealed
      ? 'Đã lật vai công khai toàn bàn đấu'
      : 'Chủ sở hữu đang soi thẻ bí mật riêng tư',
  };
}

export type ActionCardZone =
  | 'draw-pile'
  | 'private-investigation'
  | 'equipped-table'
  | 'event-resolved';

export interface ActionCardPresentationInput {
  cardId: string;
  zone: ActionCardZone;
  isParticipantInInvestigation?: boolean;
}

export interface ActionCardPresentation {
  showFront: boolean;
  deck: BoardGameDeckId;
  cardId: string | null;
  title: string | null;
  summary: string | null;
  isConsumable: boolean | null;
  artworkSrc: string | null;
  cardBackSrc: string;
  backLabel: string;
  visibilityBadge: string;
}

/**
 * Bộ lọc bảo mật trình bày Mặt Bài Khám Phá / Cung Ứng / Đột Kích:
 * - Trên chồng bài (`draw-pile`): luôn úp mặt lưng riêng của bộ đó, không lộ tên bài.
 * - Thẻ Điều tra (`private-investigation`): chỉ 2 người liên quan (người đưa & người nhận) được thấy mặt trước.
 * - Trang bị đang đeo (`equipped-table`) hoặc Đột Kích vừa kích hoạt (`event-resolved`): công khai toàn bàn.
 */
export function resolveActionCardPresentation(
  input: ActionCardPresentationInput,
): ActionCardPresentation {
  const card = getCardById(input.cardId);
  const deck: BoardGameDeckId = card?.deck ?? 'investigation';

  if (input.zone === 'draw-pile') {
    return {
      showFront: false,
      deck,
      cardId: null,
      title: null,
      summary: null,
      isConsumable: null,
      artworkSrc: null,
      cardBackSrc: MIDNIGHT_CARD_BACK_ART,
      backLabel: CARD_BACK_SECRET_TITLES[deck],
      visibilityBadge: 'Úp trên chồng bài',
    };
  }

  if (
    deck === 'investigation' &&
    input.zone === 'private-investigation' &&
    !input.isParticipantInInvestigation
  ) {
    return {
      showFront: false,
      deck,
      cardId: null,
      title: null,
      summary: null,
      isConsumable: null,
      artworkSrc: null,
      cardBackSrc: MIDNIGHT_CARD_BACK_ART,
      backLabel: 'THƯ KHÁM PHÁ KÍN 1-ĐỐI-1',
      visibilityBadge: 'Bảo mật 1-đối-1',
    };
  }

  const isConsumable = card ? card.isConsumable !== false : true;
  return {
    showFront: true,
    deck,
    cardId: card?.id ?? input.cardId,
    title: card?.title ?? input.cardId,
    summary: card?.summary ?? '',
    isConsumable,
    artworkSrc: PROTOTYPE_CARD_ART[input.cardId] ?? null,
    cardBackSrc: MIDNIGHT_CARD_BACK_ART,
    backLabel: CARD_BACK_SECRET_TITLES[deck],
    visibilityBadge:
      deck === 'investigation'
        ? 'Riêng Người Đưa & Người Nhận'
        : isConsumable
          ? 'Công khai khi kích hoạt'
          : 'Trang bị công khai trước mặt',
  };
}
