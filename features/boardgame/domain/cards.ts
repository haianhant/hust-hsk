// ---------------------------------------------------------------------------
// features/boardgame/domain/cards.ts — Kho 24 thẻ bài nguyên bản Bóng Đêm KTX v4
// chia 3 chồng: Khám Phá (Kín 1-đối-1), Cung Ứng (Trang bị/Hồi sức), Đột Kích (Vũ khí/Sự kiện).
// ---------------------------------------------------------------------------

import type {
  BoardGameCardPublicMeta,
  BoardGameDeckId,
} from '../../../shared/contracts/boardgame';
import type { GameCardDefinition } from './types';

export const CARDS_CATALOG: readonly GameCardDefinition[] = [
  // -------------------- BỘ KHÁM PHÁ — 1-on-1 Secret Condition (inv-01..08) --------------------
  {
    id: 'inv-01',
    deck: 'investigation',
    title: 'Phiếu Thử: Đội Săn Đêm',
    summary: 'Nếu bạn thuộc Đội Săn Đêm: bạn chịu 1 thương tích.',
    conditionText: 'Đội Săn Đêm',
    effectId: 'inv-01',
    effectKind: 'inv_is_hunter',
    targetMode: 'single-player',
    value: 1,
  },
  {
    id: 'inv-02',
    deck: 'investigation',
    title: 'Phiếu Thử: Hội Bóng Đêm',
    summary: 'Nếu bạn thuộc Hội Bóng Đêm: bạn chịu 1 thương tích.',
    conditionText: 'Hội Bóng Đêm',
    effectId: 'inv-02',
    effectKind: 'inv_is_shadow',
    targetMode: 'single-player',
    value: 1,
  },
  {
    id: 'inv-03',
    deck: 'investigation',
    title: 'Phiếu Thử: Kẻ Độc Hành',
    summary: 'Nếu bạn là Kẻ Độc Hành: hồi 1 thương tích (hoặc báo Phản ứng).',
    conditionText: 'Kẻ Độc Hành',
    effectId: 'inv-03',
    effectKind: 'inv_is_wanderer',
    targetMode: 'single-player',
    value: 1,
  },
  {
    id: 'inv-04',
    deck: 'investigation',
    title: 'Phiếu Thử: Săn Đêm / Độc Hành',
    summary: 'Nếu thuộc Đội Săn Đêm hoặc Kẻ Độc Hành: bạn chịu 1 thương tích.',
    conditionText: 'Săn Đêm hoặc Độc Hành',
    effectId: 'inv-04',
    effectKind: 'inv_hunter_or_wanderer',
    targetMode: 'single-player',
    value: 1,
  },
  {
    id: 'inv-05',
    deck: 'investigation',
    title: 'Phiếu Thử: Bóng Đêm / Độc Hành',
    summary: 'Nếu thuộc Hội Bóng Đêm hoặc Kẻ Độc Hành: bạn chịu 1 thương tích.',
    conditionText: 'Bóng Đêm hoặc Độc Hành',
    effectId: 'inv-05',
    effectKind: 'inv_shadow_or_wanderer',
    targetMode: 'single-player',
    value: 1,
  },
  {
    id: 'inv-06',
    deck: 'investigation',
    title: 'Phiếu Thử: Thể Lực >= 12',
    summary: 'Nếu Máu tối đa của bạn từ 12 trở lên: bạn chịu 1 thương tích.',
    conditionText: 'Max HP >= 12',
    effectId: 'inv-06',
    effectKind: 'inv_hp_ge_12',
    targetMode: 'single-player',
    value: 1,
  },
  {
    id: 'inv-07',
    deck: 'investigation',
    title: 'Phiếu Thử: Thể Lực <= 11',
    summary: 'Nếu Máu tối đa của bạn từ 11 trở xuống: hồi 1 thương tích (hoặc báo Phản ứng).',
    conditionText: 'Max HP <= 11',
    effectId: 'inv-07',
    effectKind: 'inv_hp_le_11',
    targetMode: 'single-player',
    value: 1,
  },
  {
    id: 'inv-08',
    deck: 'investigation',
    title: 'Phiếu Thử: Danh Tính Ẩn',
    summary: 'Nếu bạn chưa lật vai công khai: bạn chịu 1 thương tích.',
    conditionText: 'Chưa lật vai',
    effectId: 'inv-08',
    effectKind: 'inv_unrevealed',
    targetMode: 'single-player',
    value: 1,
  },

  // -------------------- BỘ CUNG ỨNG — Giáp & Hồi Sức (eq-01..08) --------------------
  {
    id: 'eq-01',
    deck: 'equipment',
    title: 'Áo Khoác Bảo Hộ',
    summary: 'Trang bị: Giảm 1 sát thương từ mọi đòn đánh thường (tối thiểu còn 1).',
    effectId: 'eq-01',
    effectKind: 'eq_armor',
    targetMode: 'self',
    isConsumable: false,
    value: 2,
  },
  {
    id: 'eq-02',
    deck: 'equipment',
    title: 'Mũ Bảo Hiểm KTX',
    summary: 'Trang bị: Khi chịu đòn đánh từ 4 sát thương trở lên, giảm ngay 2 sát thương.',
    effectId: 'eq-02',
    effectKind: 'eq_heavy_shield',
    targetMode: 'self',
    isConsumable: false,
    value: 2,
  },
  {
    id: 'eq-03',
    deck: 'equipment',
    title: 'Bùa Hộ Mệnh Đêm',
    summary: 'Trang bị: Giảm 1 sát thương từ thẻ Đột Kích và bẫy Hành Lang (ô 9).',
    effectId: 'eq-03',
    effectKind: 'eq_event_ward',
    targetMode: 'self',
    isConsumable: false,
    value: 2,
  },
  {
    id: 'eq-04',
    deck: 'equipment',
    title: 'Huy Hiệu Đội Trưởng',
    summary: 'Trang bị: Đòn đánh thường gây +1 sát thương (+2 nếu là Đội Săn Đêm đã lật vai).',
    effectId: 'eq-04',
    effectKind: 'eq_captain_badge',
    targetMode: 'self',
    isConsumable: false,
    value: 3,
  },
  {
    id: 'eq-05',
    deck: 'equipment',
    title: 'Nước Tăng Lực Căng Tin',
    summary: 'Dùng ngay: Hồi 2 thương tích cho 1 người chơi bất kỳ (hoặc bản thân).',
    effectId: 'eq-05',
    effectKind: 'ev_heal_2',
    targetMode: 'single-player',
    isConsumable: true,
    value: 2,
  },
  {
    id: 'eq-06',
    deck: 'equipment',
    title: 'Bộ Sơ Cứu Y Tế',
    summary: 'Dùng ngay: Hồi 3 thương tích cho 1 người chơi bất kỳ (hoặc bản thân).',
    effectId: 'eq-06',
    effectKind: 'ev_heal_3',
    targetMode: 'single-player',
    isConsumable: true,
    value: 3,
  },
  {
    id: 'eq-07',
    deck: 'equipment',
    title: 'Đèn Pha Cứu Viện',
    summary: 'Dùng ngay: Hồi 2 thương tích cho mọi người đang đứng cùng Cụm Khu Vực với bạn.',
    effectId: 'eq-07',
    effectKind: 'ev_cluster_heal_2',
    targetMode: 'same-cluster',
    isConsumable: true,
    value: 2,
  },
  {
    id: 'eq-08',
    deck: 'equipment',
    title: 'Gương Chiếu Bóng',
    summary: 'Dùng ngay: Hồi 1 thương tích; nếu là Đội Săn Đêm đã lật vai, hồi đầy sạch thương tích.',
    effectId: 'eq-08',
    effectKind: 'ev_full_heal_hunter',
    targetMode: 'self',
    isConsumable: true,
    value: 3,
  },

  // -------------------- BỘ ĐỘT KÍCH — Vũ khí & Sự kiện (ev-01..08) --------------------
  {
    id: 'ev-01',
    deck: 'event',
    title: 'Gậy Gỗ Tập Võ',
    summary: 'Trang bị: Đòn đánh thường chỉ tung 1d4 (luôn trúng 1–4 sát thương, không bao giờ hụt).',
    effectId: 'ev-01',
    effectKind: 'eq_precise_stick',
    targetMode: 'self',
    isConsumable: false,
    value: 3,
  },
  {
    id: 'ev-02',
    deck: 'event',
    title: 'Cờ Lê Sửa Chữa',
    summary: 'Trang bị: Khi đánh thường trúng đích (> 0), gây thêm +1 sát thương.',
    effectId: 'ev-02',
    effectKind: 'eq_wrench',
    targetMode: 'self',
    isConsumable: false,
    value: 2,
  },
  {
    id: 'ev-03',
    deck: 'event',
    title: 'Thanh Sắt Hành Lang',
    summary: 'Trang bị: Khi đánh thường trúng đích (> 0), gây thêm +2 sát thương.',
    effectId: 'ev-03',
    effectKind: 'eq_iron_bar',
    targetMode: 'self',
    isConsumable: false,
    value: 3,
  },
  {
    id: 'ev-04',
    deck: 'event',
    title: 'Dây Cáp Đàn Hồi',
    summary: 'Trang bị: Đổi tầm đánh thường sang các Cụm khác và cộng thêm +1 sát thương.',
    effectId: 'ev-04',
    effectKind: 'eq_long_cable',
    targetMode: 'self',
    isConsumable: false,
    value: 3,
  },
  {
    id: 'ev-05',
    deck: 'event',
    title: 'Móc Kéo Đồ KTX',
    summary: 'Trang bị: Khi đánh thường gây >= 2 sát thương, cướp ngay 1 Trang bị của nạn nhân.',
    effectId: 'ev-05',
    effectKind: 'eq_steal_hook',
    targetMode: 'self',
    isConsumable: false,
    value: 3,
  },
  {
    id: 'ev-06',
    deck: 'event',
    title: 'Chập Điện Bất Ngờ',
    summary: 'Dùng ngay: Chọn 1 người chơi bất kỳ toàn bàn để gây 2 sát thương trực tiếp.',
    effectId: 'ev-06',
    effectKind: 'ev_snipe_2',
    targetMode: 'single-player',
    isConsumable: true,
    value: 2,
  },
  {
    id: 'ev-07',
    deck: 'event',
    title: 'Mất Điện Toàn Khu',
    summary: 'Dùng ngay: Mọi người chơi đang đứng tại 1 khu vực bạn chọn chịu 2 sát thương.',
    effectId: 'ev-07',
    effectKind: 'ev_location_blast_2',
    targetMode: 'location',
    isConsumable: true,
    value: 3,
  },
  {
    id: 'ev-08',
    deck: 'event',
    title: 'Ám Hiệu Rút Hút',
    summary: 'Dùng ngay: Gây 2 sát thương lên 1 người chơi bất kỳ và hồi 1 thương tích cho bạn.',
    effectId: 'ev-08',
    effectKind: 'ev_drain_2',
    targetMode: 'single-player',
    isConsumable: true,
    value: 3,
  },
];

export const CARDS_BY_ID: Record<string, GameCardDefinition> = Object.fromEntries(
  CARDS_CATALOG.map((card) => [card.id, card]),
);

export function getCardById(cardId: string): GameCardDefinition | null {
  return CARDS_BY_ID[cardId] ?? null;
}

export function toCardPublicMeta(card: GameCardDefinition): BoardGameCardPublicMeta {
  return {
    id: card.id,
    deck: card.deck,
    title: card.title,
    summary: card.summary,
    ...(card.conditionText ? { conditionText: card.conditionText } : {}),
    effectId: card.effectId,
    targetMode: card.targetMode,
    ...(card.isConsumable !== undefined ? { isConsumable: card.isConsumable } : {}),
    value: card.value,
  };
}

export function listCardIdsByDeck(deck: BoardGameDeckId): string[] {
  const result: string[] = [];
  for (const card of CARDS_CATALOG) {
    if (card.deck === deck) {
      // Mỗi lá 2 bản trong chồng bài (16 lá/bộ = 48 lá tổng cộng).
      result.push(card.id, card.id);
    }
  }
  return result;
}
