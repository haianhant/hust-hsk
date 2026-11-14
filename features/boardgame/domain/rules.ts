// ---------------------------------------------------------------------------
// features/boardgame/domain/rules.ts — Luật bản đồ 6 khu vực KTX,
// giới hạn vòng hữu hạn & PRNG tất định serializable (mulberry32).
// ---------------------------------------------------------------------------

import type { BoardGameLocationId } from '../../../shared/contracts/boardgame';
import type { AuthoritativeGameState, LocationDefinition } from './types';

export const BOARD_GAME_MAX_TRACK = 6;
export const BOARD_GAME_MAX_HAND = 4;

export const KTX_LOCATIONS: readonly LocationDefinition[] = [
  {
    id: 'lobby',
    name: 'Sảnh Ký Túc Xá',
    shortLabel: 'Sảnh KTX',
    description: 'Có tủ đèn pin khẩn cấp: dừng chân hồi +1 HP nếu đang dưới máu tối đa.',
    adjacent: ['canteen', 'corridor', 'breaker'],
  },
  {
    id: 'canteen',
    name: 'Căng Tin B5–B9',
    shortLabel: 'Căng tin',
    description: 'Khu tiếp tế đêm: nhận +1 Khiên khi khám phá hoặc rút thẻ Sự Kiện.',
    adjacent: ['lobby', 'court', 'corridor'],
  },
  {
    id: 'radio',
    name: 'Phòng Phát Thanh',
    shortLabel: 'Phát thanh',
    description: 'Trạm sóng trung tâm: có thể điều chỉnh trực tiếp +1 Tín hiệu hoặc +1 Màn sương.',
    adjacent: ['corridor', 'breaker'],
  },
  {
    id: 'court',
    name: 'Sân Bóng Rổ KTX',
    shortLabel: 'Sân bóng rổ',
    description: 'Tầm quan sát thoáng: được phép Tác động / Thăm dò cả người ở khu vực kề cận.',
    adjacent: ['canteen', 'corridor'],
  },
  {
    id: 'corridor',
    name: 'Hành Lang B7',
    shortLabel: 'Hành lang B7',
    description: 'Giao điểm nối tất cả 5 khu vực khác, thuận lợi di chuyển và thu thập Mảnh Tin.',
    adjacent: ['lobby', 'canteen', 'radio', 'court', 'breaker'],
  },
  {
    id: 'breaker',
    name: 'Phòng Bảo Vệ & Cầu Dao',
    shortLabel: 'Cầu dao',
    description: 'Ghi nhận dấu chân người vừa ghé qua vào sổ bí mật; rút thẻ Manh mối tại đây nhận +1 Khiên.',
    adjacent: ['lobby', 'radio', 'corridor'],
  },
];

export const KTX_LOCATION_MAP: Record<BoardGameLocationId, LocationDefinition> = {
  lobby: KTX_LOCATIONS[0],
  canteen: KTX_LOCATIONS[1],
  radio: KTX_LOCATIONS[2],
  court: KTX_LOCATIONS[3],
  corridor: KTX_LOCATIONS[4],
  breaker: KTX_LOCATIONS[5],
};

export function getLocationName(loc: BoardGameLocationId): string {
  return KTX_LOCATION_MAP[loc]?.name ?? loc;
}

export function getMaxRoundsForPlayerCount(playerCount: number): number {
  return playerCount <= 5 ? 7 : 8;
}

export function isValidLocationId(raw: unknown): raw is BoardGameLocationId {
  return (
    raw === 'lobby' ||
    raw === 'canteen' ||
    raw === 'radio' ||
    raw === 'court' ||
    raw === 'corridor' ||
    raw === 'breaker'
  );
}

export function isAdjacentLocation(a: BoardGameLocationId, b: BoardGameLocationId): boolean {
  if (a === b) return true;
  return KTX_LOCATION_MAP[a].adjacent.includes(b);
}

/** PRNG tất định kiểu Mulberry32 — lưu trực tiếp trong `state.rngState`. */
export function nextDeterministicRandom(state: AuthoritativeGameState): number {
  let t = (state.rngState + 0x6d2b79f5) | 0;
  state.rngState = t >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function shuffleWithRng<T>(items: readonly T[], state: AuthoritativeGameState): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(nextDeterministicRandom(state) * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
