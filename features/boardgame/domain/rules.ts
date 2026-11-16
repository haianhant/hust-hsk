// ---------------------------------------------------------------------------
// features/boardgame/domain/rules.ts — Luật không gian bàn cờ 3 Cụm / 6 Ô Xúc xắc,
// kiểm tra tầm đánh & PRNG Mulberry32 cho Bóng Đêm KTX v4.
// ---------------------------------------------------------------------------

import type {
  BoardGameLocationId,
  BoardGameZoneClusterId,
} from '../../../shared/contracts/boardgame';
import type {
  AuthoritativeGameState,
  AuthoritativePlayerState,
  LocationDefinition,
  ZoneClusterDefinition,
} from './types';

export const BOARD_GAME_MAX_HAND = 5;
export const BOARD_GAME_MAX_EQUIPPED = 99;
export const BOARD_GAME_SAFETY_MAX_ROUNDS = 30;

export const ZONE_CLUSTERS: readonly ZoneClusterDefinition[] = [
  {
    id: 'north',
    name: 'Cụm Bắc',
    subtitle: 'Tín hiệu & Nguồn điện',
    locationIds: ['radio', 'breaker'],
  },
  {
    id: 'central',
    name: 'Cụm Trung Tâm',
    subtitle: 'Sảnh KTX & Căng tin',
    locationIds: ['lobby', 'canteen'],
  },
  {
    id: 'south',
    name: 'Cụm Nam',
    subtitle: 'Hành lang & Sân thể thao',
    locationIds: ['corridor', 'court'],
  },
];

export const LOCATIONS_CATALOG: readonly LocationDefinition[] = [
  {
    id: 'radio',
    name: 'Trạm Radio KTX',
    shortName: 'Radio (2–3)',
    clusterId: 'north',
    diceNumbers: [2, 3],
    diceLabel: '2–3',
    subtitle: 'Rút 1 thẻ Khám Phá (Kín)',
    deckHint: 'investigation',
    actionSummary: 'Rút 1 Thẻ Khám Phá (đặt kín cho 1 người đọc).',
    accentColor: '#10b981',
  },
  {
    id: 'breaker',
    name: 'Tủ Cầu Dao Tổng',
    shortName: 'Cầu Dao (4–5)',
    clusterId: 'north',
    diceNumbers: [4, 5],
    diceLabel: '4–5',
    subtitle: 'Rút 1 thẻ Đột Kích',
    deckHint: 'event',
    actionSummary: 'Rút 1 Thẻ Đột Kích (Vũ khí / Sự kiện hắc ám).',
    accentColor: '#f43f5e',
  },
  {
    id: 'lobby',
    name: 'Sảnh Tầng 1',
    shortName: 'Sảnh (6)',
    clusterId: 'central',
    diceNumbers: [6],
    diceLabel: '6',
    subtitle: 'Rút 1 thẻ Cung Ứng',
    deckHint: 'equipment',
    actionSummary: 'Rút 1 Thẻ Cung Ứng (Giáp bảo hộ / Hồi sức).',
    accentColor: '#06b6d4',
  },
  {
    id: 'canteen',
    name: 'Căng Tin Đêm',
    shortName: 'Căng Tin (8)',
    clusterId: 'central',
    diceNumbers: [8],
    diceLabel: '8',
    subtitle: 'Rút 1 thẻ Bất Kỳ',
    deckHint: 'any',
    actionSummary: 'Tự chọn rút 1 thẻ từ Khám Phá, Cung Ứng hoặc Đột Kích.',
    accentColor: '#f59e0b',
  },
  {
    id: 'corridor',
    name: 'Hành Lang Tầng 4',
    shortName: 'Hành Lang (9)',
    clusterId: 'south',
    diceNumbers: [9],
    diceLabel: '9',
    subtitle: 'Hồi 1 hoặc Gây 2 sát thương',
    deckHint: 'power-9',
    actionSummary: 'Chọn 1 người bất kỳ: Hồi 1 thương tích HOẶC Gây 2 sát thương.',
    accentColor: '#8b5cf6',
  },
  {
    id: 'court',
    name: 'Sân Bóng Rổ Đêm',
    shortName: 'Sân Bóng (10)',
    clusterId: 'south',
    diceNumbers: [10],
    diceLabel: '10',
    subtitle: 'Cướp 1 Trang bị đối thủ',
    deckHint: 'power-10',
    actionSummary: 'Cướp 1 Trang bị đang đeo từ 1 người chơi bất kỳ.',
    accentColor: '#38bdf8',
  },
];

export const LOCATIONS_BY_ID: Record<BoardGameLocationId, LocationDefinition> = {
  radio: LOCATIONS_CATALOG[0],
  breaker: LOCATIONS_CATALOG[1],
  lobby: LOCATIONS_CATALOG[2],
  canteen: LOCATIONS_CATALOG[3],
  corridor: LOCATIONS_CATALOG[4],
  court: LOCATIONS_CATALOG[5],
};

export function getLocationDefinition(id: BoardGameLocationId): LocationDefinition {
  return LOCATIONS_BY_ID[id];
}

export function isValidLocationId(raw: unknown): raw is BoardGameLocationId {
  return typeof raw === 'string' && Object.hasOwn(LOCATIONS_BY_ID, raw);
}

export function areInSameCluster(
  locA: BoardGameLocationId,
  locB: BoardGameLocationId,
): boolean {
  return LOCATIONS_BY_ID[locA].clusterId === LOCATIONS_BY_ID[locB].clusterId;
}

export function resolveLocationForDiceTotal(
  total: number,
): BoardGameLocationId | 'choose-any' {
  if (total === 7) return 'choose-any';
  const match = LOCATIONS_CATALOG.find((loc) => loc.diceNumbers.includes(total));
  return match ? match.id : 'lobby';
}

export function listReachableAttackTargets(
  state: AuthoritativeGameState,
  attacker: AuthoritativePlayerState,
): AuthoritativePlayerState[] {
  const others = Object.values(state.players).filter(
    (p) => p.alive && p.playerId !== attacker.playerId,
  );
  const hasLongCable = attacker.equipped.includes('ev-04');
  if (hasLongCable) {
    const remoteTargets = others.filter(
      (p) => !areInSameCluster(attacker.location, p.location),
    );
    // Nếu mọi đối thủ đều đang đứng chung cụm với mình, vẫn cho phép đánh gần để không kẹt lượt cuối trận.
    return remoteTargets.length > 0 ? remoteTargets : others;
  }
  return others.filter((p) => areInSameCluster(attacker.location, p.location));
}

export function canPlayerAttackTarget(
  state: AuthoritativeGameState,
  attacker: AuthoritativePlayerState,
  target: AuthoritativePlayerState,
): boolean {
  if (!attacker.alive || !target.alive || attacker.playerId === target.playerId) {
    return false;
  }
  return listReachableAttackTargets(state, attacker).some(
    (candidate) => candidate.playerId === target.playerId,
  );
}

/** Deterministic PRNG step (Mulberry32). Never mutates Math.random. */
export function nextDeterministicRandom(rngState: number): {
  value: number;
  nextState: number;
} {
  let t = (rngState + 0x6d2b79f5) | 0;
  const nextState = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, nextState };
}

export function nextRandomInt(state: { rngState: number }, maxExclusive: number): number {
  const { value, nextState } = nextDeterministicRandom(state.rngState);
  state.rngState = nextState;
  return Math.floor(value * maxExclusive);
}

export function rollD6(state: { rngState: number }): number {
  return 1 + nextRandomInt(state, 6);
}

export function rollD4(state: { rngState: number }): number {
  return 1 + nextRandomInt(state, 4);
}

export function shuffleWithRng<T>(items: readonly T[], rngState: number): {
  shuffled: T[];
  nextState: number;
} {
  const copy = [...items];
  const cursor = { rngState };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = nextRandomInt(cursor, i + 1);
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return { shuffled: copy, nextState: cursor.rngState };
}
