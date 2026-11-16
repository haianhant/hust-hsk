// ---------------------------------------------------------------------------
// features/boardgame/domain/rules.ts — Luật không gian bàn cờ 3 Cụm / 6 Ô Xúc xắc,
// kiểm tra tầm đánh & PRNG Mulberry32 cho Bóng Đêm KTX v4.
// ---------------------------------------------------------------------------

import type {
  BoardGameClusterPair,
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

export const DEFAULT_CLUSTER_PAIRS: readonly BoardGameClusterPair[] = [
  { clusterId: 'north', locationIds: ['radio', 'breaker'] },
  { clusterId: 'central', locationIds: ['lobby', 'canteen'] },
  { clusterId: 'south', locationIds: ['corridor', 'court'] },
];

export const ZONE_CLUSTERS: readonly ZoneClusterDefinition[] = [
  {
    id: 'north',
    name: 'Cụm Bắc',
    subtitle: 'Cặp Khu Vực #1',
    locationIds: ['radio', 'breaker'],
  },
  {
    id: 'central',
    name: 'Cụm Trung Tâm',
    subtitle: 'Cặp Khu Vực #2',
    locationIds: ['lobby', 'canteen'],
  },
  {
    id: 'south',
    name: 'Cụm Nam',
    subtitle: 'Cặp Khu Vực #3',
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
    actionSummary: 'Rút 1 Thẻ Khám Phá (đưa kín cho 1 người khác đọc).',
    accentColor: '#10b981',
  },
  {
    id: 'breaker',
    name: 'Cổng Hầm KTX',
    shortName: 'Cổng Hầm (4–5)',
    clusterId: 'north',
    diceNumbers: [4, 5],
    diceLabel: '4–5',
    subtitle: 'Rút 1 thẻ Bất Kỳ',
    deckHint: 'any',
    actionSummary: 'Tự chọn rút 1 thẻ từ Khám Phá (Xanh), Cung Ứng (Trắng) hoặc Đột Kích (Đen).',
    accentColor: '#f59e0b',
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
    actionSummary: 'Rút 1 Thẻ Cung Ứng (Trang bị phòng thủ / Hồi sức).',
    accentColor: '#06b6d4',
  },
  {
    id: 'canteen',
    name: 'Khu Sân Cũ Đêm',
    shortName: 'Sân Cũ (8)',
    clusterId: 'central',
    diceNumbers: [8],
    diceLabel: '8',
    subtitle: 'Rút 1 thẻ Đột Kích',
    deckHint: 'event',
    actionSummary: 'Rút 1 Thẻ Đột Kích (Vũ khí / Sự kiện hắc ám).',
    accentColor: '#f43f5e',
  },
  {
    id: 'corridor',
    name: 'Hành Lang Tầng 4',
    shortName: 'Hành Lang (9)',
    clusterId: 'south',
    diceNumbers: [9],
    diceLabel: '9',
    subtitle: 'Gây 2 ST hoặc Hồi 1 thương tích',
    deckHint: 'power-9',
    actionSummary: 'Chọn 1 người bất kỳ (kể cả bạn để hồi máu): Gây 2 ST HOẶC Hồi 1 thương tích.',
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
    actionSummary: 'Lấy 1 Trang bị đang đeo từ 1 người chơi bất kỳ.',
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

export function getClusterForLocation(
  loc: BoardGameLocationId,
  clusterPairs: readonly BoardGameClusterPair[] = DEFAULT_CLUSTER_PAIRS,
): BoardGameZoneClusterId {
  for (const pair of clusterPairs) {
    if (pair.locationIds[0] === loc || pair.locationIds[1] === loc) {
      return pair.clusterId;
    }
  }
  return LOCATIONS_BY_ID[loc].clusterId;
}

export function getPairedLocationInCluster(
  loc: BoardGameLocationId,
  clusterPairs: readonly BoardGameClusterPair[] = DEFAULT_CLUSTER_PAIRS,
): BoardGameLocationId {
  for (const pair of clusterPairs) {
    if (pair.locationIds[0] === loc) return pair.locationIds[1];
    if (pair.locationIds[1] === loc) return pair.locationIds[0];
  }
  return LOCATIONS_CATALOG.find((l) => l.id !== loc)?.id ?? 'lobby';
}

export function areInSameCluster(
  locA: BoardGameLocationId,
  locB: BoardGameLocationId,
  clusterPairs: readonly BoardGameClusterPair[] = DEFAULT_CLUSTER_PAIRS,
): boolean {
  return getClusterForLocation(locA, clusterPairs) === getClusterForLocation(locB, clusterPairs);
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
  const clusterPairs = state.clusterPairs ?? DEFAULT_CLUSTER_PAIRS;
  const hasHandgun = attacker.equipped.includes('ev-05');
  if (hasHandgun) {
    // Chuẩn Shadow Hunters (Handgun): tầm đánh đổi thành mọi Cụm KHÁC ngoài Cụm hiện tại.
    return others.filter((p) => !areInSameCluster(attacker.location, p.location, clusterPairs));
  }
  return others.filter((p) => areInSameCluster(attacker.location, p.location, clusterPairs));
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
