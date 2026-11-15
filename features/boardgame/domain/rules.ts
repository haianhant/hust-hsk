// ---------------------------------------------------------------------------
// features/boardgame/domain/rules.ts — Luật bản đồ 6 khu vực KTX,
// giới hạn di chuyển kề cận, giới hạn vòng Rạng Sáng & PRNG tất định.
// ---------------------------------------------------------------------------

import type { BoardGameLocationId } from '../../../shared/contracts/boardgame';
import type { AuthoritativeGameState, LocationDefinition } from './types';

export const BOARD_GAME_MAX_SHIELD = 6;
export const BOARD_GAME_COURT_MAX_SHIELD = 2;
export const BOARD_GAME_MAX_HAND = 4;

export const BOARD_GAME_INFRASTRUCTURE_LOCATIONS: readonly BoardGameLocationId[] = [
  'radio',
  'breaker',
  'canteen',
];

export const KTX_LOCATIONS: readonly LocationDefinition[] = [
  {
    id: 'lobby',
    name: 'Sảnh Ký Túc Xá',
    shortLabel: 'Sảnh KTX',
    description:
      'Trạm sơ cứu & phòng Đối chất chính thức (từ Vòng 3): Khảo sát để hồi 1 vết thương & +1 Khiên.',
    actionLabel: 'Sơ cứu & Khảo sát Sảnh',
    isInfrastructure: false,
    adjacent: ['canteen', 'corridor', 'breaker'],
  },
  {
    id: 'canteen',
    name: 'Căng Tin B5–B9',
    shortLabel: 'Căng tin',
    description:
      'Khu tiếp tế & đường dây điện phụ: Kiểm tra thiết bị để đọc dấu gần nhất (+1 Khiên nếu an toàn), hoặc gỡ mạch gài.',
    actionLabel: 'Kiểm tra thiết bị Căng tin',
    isInfrastructure: true,
    adjacent: ['lobby', 'court', 'corridor'],
  },
  {
    id: 'radio',
    name: 'Phòng Phát Thanh',
    shortLabel: 'Phát thanh',
    description:
      'Trạm sóng trung tâm: Quét an toàn để bật Niêm phong Phát Thanh (cần thiết cho Rạng Sáng); nơi Hải công bố hồ sơ.',
    actionLabel: 'Kiểm tra & Niêm phong Phát Thanh',
    isInfrastructure: true,
    adjacent: ['corridor', 'breaker'],
  },
  {
    id: 'court',
    name: 'Sân Bóng Rổ KTX',
    shortLabel: 'Sân bóng rổ',
    description:
      'Điểm cao thoáng gió: Cho phép Điều tra người ở khu kề cận (Căng tin / Hành lang B7), đổi lại Khiên tối đa tại đây là 2.',
    actionLabel: 'Quan sát sân & Khu kề cận',
    isInfrastructure: false,
    adjacent: ['canteen', 'corridor'],
  },
  {
    id: 'corridor',
    name: 'Hành Lang B7',
    shortLabel: 'Hành lang B7',
    description:
      'Trục nối cả 5 khu vực: Khảo sát để nghe ngóng những khu vực vừa có thao tác kỹ thuật (+1 Khiên nếu đứng một mình).',
    actionLabel: 'Nghe ngóng dấu vết toàn KTX',
    isInfrastructure: false,
    adjacent: ['lobby', 'canteen', 'radio', 'court', 'breaker'],
  },
  {
    id: 'breaker',
    name: 'Phòng Bảo Vệ & Cầu Dao',
    shortLabel: 'Cầu dao',
    description:
      'Tủ điện tổng & địa điểm Đối chất: Kiểm tra đọc tên + dấu vết người thao tác gần nhất và bật Niêm phong Cầu Dao nếu an toàn.',
    actionLabel: 'Kiểm tra & Niêm phong Cầu Dao',
    isInfrastructure: true,
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

export function getLocationShortLabel(loc: BoardGameLocationId): string {
  return KTX_LOCATION_MAP[loc]?.shortLabel ?? loc;
}

export function getMaxRoundsForPlayerCount(playerCount: number): number {
  return playerCount <= 5 ? 6 : 7;
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

export function listAdjacentDestinations(loc: BoardGameLocationId): BoardGameLocationId[] {
  return KTX_LOCATION_MAP[loc]?.adjacent.slice() ?? [];
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
