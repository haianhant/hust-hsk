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
  Phase2RoleId,
  Phase3RoleId,
  Phase4RoleId,
  Phase5RoleId,
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

/** Artwork bán thân AI tỷ lệ 2:3 đã sinh cho bản Prototype (Minh & Vy — giữ tương thích test cũ). */
export const PROTOTYPE_CHARACTER_ART: Partial<Record<BoardGameRoleId, string>> = {
  'gac-ky-thuat': '/assets/boardgame/prototype/role-minh-ky-thuat.webp',
  'gac-radio': '/assets/boardgame/prototype/role-vy-radio.webp',
};

/** Artwork AI tỷ lệ 2:3 cho 3 lá bài mẫu bản Prototype (giữ tương thích test cũ). */
export const PROTOTYPE_CARD_ART: Readonly<Record<string, string>> = {
  'inv-12': '/assets/boardgame/prototype/card-inv-tien-tri.webp',
  'eq-04': '/assets/boardgame/prototype/card-eq-thuong-anh-sang.webp',
  'ev-01': '/assets/boardgame/prototype/card-ev-kiem-go-nguyen-rua.webp',
};

/** 8 tướng mở rộng đầu tiên (Starter Eight · Phase 2 / 2.5 — 4 Hunter + 4 Shadow). */
export const STARTER_EIGHT_ROLE_IDS: readonly Phase2RoleId[] = [
  'exp2_g43',
  'exp2_fiona',
  'exp1_gayle',
  'exp1_felicia',
  'exp1_wendigo',
  'exp2_wyvern',
  'exp1_victor',
  'exp1_undying',
];

/** 8 tướng mở rộng Wave 2 (Starter Sixteen · Phase 3 — 3 Hunter + 3 Shadow + 2 Neutral). */
export const WAVE2_ROLE_IDS: readonly Phase3RoleId[] = [
  'exp1_elysia',
  'exp2_father_harrison',
  'exp2_gloria',
  'exp2_unchained',
  'exp2_warlock',
  'exp2_witch',
  'exp1_cindy',
  'exp1_bipolar',
];

/** 10 tướng mở rộng Wave 3 (Starter Twenty-Six · Phase 4 — 4 Hunter + 4 Shadow + 2 Neutral). */
export const WAVE3_ROLE_IDS: readonly Phase4RoleId[] = [
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

/** 12 tướng mở rộng Wave 4 (Starter Thirty-Eight · Phase 5 — 4 Hunter + 4 Shadow + 4 Neutral). */
export const WAVE4_ROLE_IDS: readonly Phase5RoleId[] = [
  'exp2_elise',
  'exp1_ernest',
  'exp1_gwendolen',
  'exp2_freyja',
  'exp2_umibozu',
  'exp2_urban_legend',
  'exp2_warlord',
  'exp2_usurper',
  'exp2_arlene',
  'exp1_angel',
  'exp2_bianca',
  'exp2_dalton',
];

/** Thư viện chân dung nhân vật full-art HUSTVerse Midnight (tạm nới Partial trong Phase 6B; Phase 6C hoàn tất strict 58/58). */
export const MIDNIGHT_CHARACTER_ART: Readonly<Partial<Record<BoardGameRoleId, string>>> = {
  // 10 Classic Roles (preserved untouched)
  'gac-ky-thuat': '/assets/boardgame/prototype/role-minh-ky-thuat.webp',
  'gac-truc-ban': '/assets/boardgame/roles/role-lan-truc-ban.webp',
  'gac-radio': '/assets/boardgame/prototype/role-vy-radio.webp',
  'suong-an-danh': '/assets/boardgame/roles/role-tu-an-danh.webp',
  'suong-tin-gia': '/assets/boardgame/roles/role-khanh-tin-gia.webp',
  'suong-gac-cong': '/assets/boardgame/roles/role-dung-gac-cong.webp',
  'lang-anh-san': '/assets/boardgame/roles/role-hai-suu-tam.webp',
  'lang-quan-sat': '/assets/boardgame/roles/role-trang-kien-cuong.webp',
  'lang-cuu-ho': '/assets/boardgame/roles/role-bach-cuong-chien.webp',
  'lang-tien-phong': '/assets/boardgame/roles/role-dat-cam-tu.webp',
  // 8 Starter Eight Expansion Roles (Phase 2.5 — 1024x1536 WebP)
  exp2_g43: '/assets/boardgame/roles/role-exp2-g43.webp',
  exp2_fiona: '/assets/boardgame/roles/role-exp2-fiona.webp',
  exp1_gayle: '/assets/boardgame/roles/role-exp1-gayle.webp',
  exp1_felicia: '/assets/boardgame/roles/role-exp1-felicia.webp',
  exp1_wendigo: '/assets/boardgame/roles/role-exp1-wendigo.webp',
  exp2_wyvern: '/assets/boardgame/roles/role-exp2-wyvern.webp',
  exp1_victor: '/assets/boardgame/roles/role-exp1-victor.webp',
  exp1_undying: '/assets/boardgame/roles/role-exp1-undying.webp',
  // 8 Wave 2 Expansion Roles (Phase 3B — 1024x1536 WebP)
  exp1_elysia: '/assets/boardgame/roles/role-exp1-elysia.webp',
  exp2_father_harrison: '/assets/boardgame/roles/role-exp2-father-harrison.webp',
  exp2_gloria: '/assets/boardgame/roles/role-exp2-gloria.webp',
  exp2_unchained: '/assets/boardgame/roles/role-exp2-unchained.webp',
  exp2_warlock: '/assets/boardgame/roles/role-exp2-warlock.webp',
  exp2_witch: '/assets/boardgame/roles/role-exp2-witch.webp',
  exp1_cindy: '/assets/boardgame/roles/role-exp1-cindy.webp',
  exp1_bipolar: '/assets/boardgame/roles/role-exp1-bipolar.webp',
  // 10 Wave 3 Expansion Roles (Phase 4C — 1024x1536 WebP)
  exp1_fallen: '/assets/boardgame/roles/role-exp1-fallen.webp',
  exp1_fea: '/assets/boardgame/roles/role-exp1-fea.webp',
  exp2_eleanor: '/assets/boardgame/roles/role-exp2-eleanor.webp',
  exp2_fujiko: '/assets/boardgame/roles/role-exp2-fujiko.webp',
  exp1_udi: '/assets/boardgame/roles/role-exp1-udi.webp',
  exp1_wrath: '/assets/boardgame/roles/role-exp1-wrath.webp',
  exp1_vengeance: '/assets/boardgame/roles/role-exp1-vengeance.webp',
  exp2_visions: '/assets/boardgame/roles/role-exp2-visions.webp',
  exp2_cruz: '/assets/boardgame/roles/role-exp2-cruz.webp',
  exp2_bryon: '/assets/boardgame/roles/role-exp2-bryon.webp',
  // 12 Wave 4 Expansion Roles (Phase 5D — 1024x1536 WebP)
  exp2_elise: '/assets/boardgame/roles/role-exp2-elise.webp',
  exp1_ernest: '/assets/boardgame/roles/role-exp1-ernest.webp',
  exp1_gwendolen: '/assets/boardgame/roles/role-exp1-gwendolen.webp',
  exp2_freyja: '/assets/boardgame/roles/role-exp2-freyja.webp',
  exp2_umibozu: '/assets/boardgame/roles/role-exp2-umibozu.webp',
  exp2_urban_legend: '/assets/boardgame/roles/role-exp2-urban-legend.webp',
  exp2_warlord: '/assets/boardgame/roles/role-exp2-warlord.webp',
  exp2_usurper: '/assets/boardgame/roles/role-exp2-usurper.webp',
  exp2_arlene: '/assets/boardgame/roles/role-exp2-arlene.webp',
  exp1_angel: '/assets/boardgame/roles/role-exp1-angel.webp',
  exp2_bianca: '/assets/boardgame/roles/role-exp2-bianca.webp',
  exp2_dalton: '/assets/boardgame/roles/role-exp2-dalton.webp',
};

/** Thư viện đầy đủ 40 loại thẻ riêng biệt (tổng 48 bản sao) phong cách HUSTVerse Midnight (2:3 WebP). */
export const MIDNIGHT_CARD_ART: Readonly<Record<string, string>> = {
  'inv-01': '/assets/boardgame/cards/inv-01.webp',
  'inv-02': '/assets/boardgame/cards/inv-02.webp',
  'inv-03': '/assets/boardgame/cards/inv-03.webp',
  'inv-04': '/assets/boardgame/cards/inv-04.webp',
  'inv-05': '/assets/boardgame/cards/inv-05.webp',
  'inv-06': '/assets/boardgame/cards/inv-06.webp',
  'inv-07': '/assets/boardgame/cards/inv-07.webp',
  'inv-08': '/assets/boardgame/cards/inv-08.webp',
  'inv-09': '/assets/boardgame/cards/inv-09.webp',
  'inv-10': '/assets/boardgame/cards/inv-10.webp',
  'inv-11': '/assets/boardgame/cards/inv-11.webp',
  'inv-12': '/assets/boardgame/prototype/card-inv-tien-tri.webp',
  'eq-01': '/assets/boardgame/cards/eq-01.webp',
  'eq-02': '/assets/boardgame/cards/eq-02.webp',
  'eq-03': '/assets/boardgame/cards/eq-03.webp',
  'eq-04': '/assets/boardgame/prototype/card-eq-thuong-anh-sang.webp',
  'eq-05': '/assets/boardgame/cards/eq-05.webp',
  'eq-06': '/assets/boardgame/cards/eq-06.webp',
  'eq-07': '/assets/boardgame/cards/eq-07.webp',
  'eq-08': '/assets/boardgame/cards/eq-08.webp',
  'eq-09': '/assets/boardgame/cards/eq-09.webp',
  'eq-10': '/assets/boardgame/cards/eq-10.webp',
  'eq-11': '/assets/boardgame/cards/eq-11.webp',
  'eq-12': '/assets/boardgame/cards/eq-12.webp',
  'eq-13': '/assets/boardgame/cards/eq-13.webp',
  'eq-14': '/assets/boardgame/cards/eq-14.webp',
  'eq-15': '/assets/boardgame/cards/eq-15.webp',
  'ev-01': '/assets/boardgame/prototype/card-ev-kiem-go-nguyen-rua.webp',
  'ev-02': '/assets/boardgame/cards/ev-02.webp',
  'ev-03': '/assets/boardgame/cards/ev-03.webp',
  'ev-04': '/assets/boardgame/cards/ev-04.webp',
  'ev-05': '/assets/boardgame/cards/ev-05.webp',
  'ev-06': '/assets/boardgame/cards/ev-06.webp',
  'ev-07': '/assets/boardgame/cards/ev-07.webp',
  'ev-08': '/assets/boardgame/cards/ev-08.webp',
  'ev-09': '/assets/boardgame/cards/ev-09.webp',
  'ev-10': '/assets/boardgame/cards/ev-10.webp',
  'ev-11': '/assets/boardgame/cards/ev-11.webp',
  'ev-12': '/assets/boardgame/cards/ev-12.webp',
  'ev-13': '/assets/boardgame/cards/ev-13.webp',
};

/** Nhãn chỉ số/hiệu ứng ngắn trên góc phải của từng loại trong 40 lá bài. */
export const MIDNIGHT_CARD_STAT_BADGE: Readonly<Record<string, string>> = {
  'inv-01': 'SĂN/BÓNG · CƯỚP/1 ST',
  'inv-02': 'SĂN/ĐỘC · CƯỚP/1 ST',
  'inv-03': 'ĐỘC/BÓNG · CƯỚP/1 ST',
  'inv-04': 'SĂN ĐÊM · 1 ST',
  'inv-05': 'BÓNG ĐÊM · 1 ST',
  'inv-06': 'BÓNG ĐÊM · 2 ST',
  'inv-07': 'SĂN ĐÊM · HỒI 1',
  'inv-08': 'ĐỘC HÀNH · HỒI 1',
  'inv-09': 'BÓNG ĐÊM · HỒI 1',
  'inv-10': 'MAX ≤11 · 1 ST',
  'inv-11': 'MAX ≥12 · 2 ST',
  'inv-12': 'SOI VAI THẬT',
  'eq-01': 'GIẢM 1 ST',
  'eq-02': 'MIỄN Ô 9',
  'eq-03': 'MIỄN BẪY ĐEN',
  'eq-04': '+2 SÁT THƯƠNG',
  'eq-05': 'TUNG 2 LẦN',
  'eq-06': 'LỘT ĐỒ KHI HẠ',
  'eq-07': 'HỒI 2 MÁU',
  'eq-08': 'HỒI 1d6 KHÁC',
  'eq-09': 'VỀ MỐC 7',
  'eq-10': 'KHIÊN MIỄN ST',
  'eq-11': 'TOÀN BÀN -2 HP',
  'eq-12': 'SOI LẬT TÚ/DŨNG',
  'eq-13': 'SĂN ĐÊM · HỒI 0',
  'eq-14': 'TRANG/LAN/KHÁNH · 0',
  'eq-15': 'THÊM 1 LƯỢT',
  'ev-01': 'BẮT BUỘC · 1d4',
  'ev-02': '+1 SÁT THƯƠNG',
  'ev-03': '+1 SÁT THƯƠNG',
  'ev-04': '+1 SÁT THƯƠNG',
  'ev-05': 'BẮN CỤM KHÁC',
  'ev-06': 'ĐA MỤC TIÊU',
  'ev-07': '2 ST · HỒI 1',
  'ev-08': 'ĐỔI MẠNG 2 ST',
  'ev-09': 'BOM Ô 1d6+1d4',
  'ev-10': '1d6 · 3 ST',
  'ev-11': 'CƯỚP 1 TRANG BỊ',
  'ev-12': 'GIAO ĐỒ / 1 ST',
  'ev-13': 'BÓNG ĐÊM · HỒI 0',
};

/** 6 bối cảnh tabletop 16:9 (WebP) của các địa điểm KTX Bách Khoa ban đêm. */
export const MIDNIGHT_LOCATION_ART: Readonly<Record<BoardGameLocationId, string>> = {
  radio: '/assets/boardgame/locations/loc-radio.webp',
  breaker: '/assets/boardgame/locations/loc-breaker.webp',
  lobby: '/assets/boardgame/locations/loc-lobby.webp',
  canteen: '/assets/boardgame/locations/loc-canteen.webp',
  corridor: '/assets/boardgame/locations/loc-corridor.webp',
  court: '/assets/boardgame/locations/loc-court.webp',
};

/** Tọa độ nguồn sáng đèn & sương đêm đặc trưng từng ô tabletop. */
export const MIDNIGHT_LOCATION_AMBIENCE: Readonly<
  Record<
    BoardGameLocationId,
    { lampX: number; lampY: number; lampHex: string; fogHex: string }
  >
> = {
  radio: { lampX: 74, lampY: 58, lampHex: '#10b981', fogHex: 'rgba(16, 185, 129, 0.24)' },
  breaker: { lampX: 56, lampY: 18, lampHex: '#f59e0b', fogHex: 'rgba(148, 163, 184, 0.22)' },
  lobby: { lampX: 28, lampY: 52, lampHex: '#06b6d4', fogHex: 'rgba(6, 182, 212, 0.20)' },
  canteen: { lampX: 62, lampY: 42, lampHex: '#f43f5e', fogHex: 'rgba(168, 85, 247, 0.22)' },
  corridor: { lampX: 49, lampY: 16, lampHex: '#a78bfa', fogHex: 'rgba(139, 92, 246, 0.24)' },
  court: { lampX: 24, lampY: 16, lampHex: '#38bdf8', fogHex: 'rgba(56, 189, 248, 0.22)' },
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
    portraitSrc: MIDNIGHT_CHARACTER_ART[design.id] ?? null,
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
  statBadge: string | null;
  copies: number | null;
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
      statBadge: null,
      copies: null,
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
      statBadge: null,
      copies: null,
      artworkSrc: null,
      cardBackSrc: MIDNIGHT_CARD_BACK_ART,
      backLabel: 'THƯ KHÁM PHÁ KÍN 1-ĐỐI-1',
      visibilityBadge: 'Bảo mật 1-đối-1',
    };
  }

  const isConsumable = card ? card.isConsumable !== false : true;
  const deckToken = MIDNIGHT_DECK_TOKENS[deck];
  const resolvedCardId = card?.id ?? input.cardId;
  return {
    showFront: true,
    deck,
    cardId: resolvedCardId,
    title: card?.title ?? input.cardId,
    summary: card?.summary ?? '',
    isConsumable,
    statBadge: MIDNIGHT_CARD_STAT_BADGE[resolvedCardId] ?? deckToken.statLabel,
    copies: card?.copies ?? 1,
    artworkSrc: MIDNIGHT_CARD_ART[resolvedCardId] ?? null,
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
