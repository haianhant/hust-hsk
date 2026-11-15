// ---------------------------------------------------------------------------
// features/boardgame/domain/rules.ts — Luật bản đồ 6 khu vực KTX,
// tầm di chuyển / tầm đánh / tầm điều tra & PRNG tất định v3.
// ---------------------------------------------------------------------------

import type { BoardGameLocationId } from '../../../shared/contracts/boardgame';
import type {
  AuthoritativeGameState,
  AuthoritativePlayerState,
  LocationDefinition,
} from './types';

export const BOARD_GAME_MAX_SHIELD = 2;
export const BOARD_GAME_MAX_HAND = 4;
export const BOARD_GAME_MAX_EQUIPPED = 2;

export const KTX_LOCATIONS: readonly LocationDefinition[] = [
  {
    id: 'lobby',
    name: 'Sảnh Ký Túc Xá',
    shortLabel: 'Sảnh KTX',
    description: 'Sơ cứu trực đêm: hồi 1 vết thương (hoặc +1 Giáp tạm nếu chưa bị thương).',
    actionLabel: 'Sơ cứu Sảnh KTX (+1 HP hoặc +1 🛡️)',
    allowedDecks: ['event'],
    adjacent: ['canteen', 'corridor', 'breaker'],
  },
  {
    id: 'canteen',
    name: 'Căng Tin B5–B9',
    shortLabel: 'Căng tin',
    description: 'Tiếp tế đồ dùng: rút ngay 1 thẻ Trang bị vào tay.',
    actionLabel: 'Tiếp tế Căng tin (+1 Trang bị)',
    allowedDecks: ['equipment', 'event'],
    adjacent: ['lobby', 'court', 'corridor'],
  },
  {
    id: 'court',
    name: 'Sân Bóng Rổ KTX',
    shortLabel: 'Sân bóng rổ',
    description: 'Tầm nhìn thoáng: lượt này mở tầm đánh/điều tra sang ô kề & +1 ST mục tiêu bị thương/đã lật.',
    actionLabel: 'Quan sát Sân bóng rổ (Mở tầm kề +1 ST)',
    allowedDecks: ['equipment'],
    adjacent: ['canteen', 'radio', 'corridor'],
  },
  {
    id: 'radio',
    name: 'Phòng Phát Thanh',
    shortLabel: 'Phát thanh',
    description: 'Sóng toàn khu: rút 1 thẻ Điều tra & được dùng thẻ Điều tra tới mọi vị trí trong lượt.',
    actionLabel: 'Phát sóng toàn KTX (+1 Điều tra & Soi toàn bản đồ)',
    allowedDecks: ['investigation', 'event'],
    adjacent: ['court', 'breaker', 'corridor'],
  },
  {
    id: 'corridor',
    name: 'Hành Lang B7',
    shortLabel: 'Hành lang B7',
    description: 'Trục nối 5 khu: nhận +1 Giáp tạm cơ động chuẩn bị cho pha hành động chính.',
    actionLabel: 'Cơ động Hành lang (+1 🛡️)',
    allowedDecks: ['investigation', 'event'],
    adjacent: ['lobby', 'canteen', 'court', 'radio', 'breaker'],
  },
  {
    id: 'breaker',
    name: 'Phòng Bảo Vệ & Cầu Dao',
    shortLabel: 'Bảo vệ',
    description: 'Chốt trực an ninh: nhận +1 Giáp tạm và xóa dấu hở sườn.',
    actionLabel: 'Trực chốt Bảo vệ (+1 🛡️ & Xóa hở sườn)',
    allowedDecks: ['investigation', 'equipment'],
    adjacent: ['lobby', 'radio', 'corridor'],
  },
];

export const KTX_LOCATION_MAP: Record<BoardGameLocationId, LocationDefinition> = Object.freeze({
  lobby: KTX_LOCATIONS[0],
  canteen: KTX_LOCATIONS[1],
  court: KTX_LOCATIONS[2],
  radio: KTX_LOCATIONS[3],
  corridor: KTX_LOCATIONS[4],
  breaker: KTX_LOCATIONS[5],
});

export function getLocationDefinition(loc: string): LocationDefinition | undefined {
  return Object.hasOwn(KTX_LOCATION_MAP, loc)
    ? KTX_LOCATION_MAP[loc as BoardGameLocationId]
    : undefined;
}

export function getLocationName(loc: BoardGameLocationId): string {
  return getLocationDefinition(loc)?.name ?? loc;
}

export function getLocationShortLabel(loc: BoardGameLocationId): string {
  return getLocationDefinition(loc)?.shortLabel ?? loc;
}

export function getMaxRoundsForPlayerCount(playerCount: number): number {
  return playerCount <= 5 ? 9 : 10;
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
  if (!isValidLocationId(a) || !isValidLocationId(b)) return false;
  if (a === b) return true;
  return getLocationDefinition(a)?.adjacent.includes(b) ?? false;
}

export function listLegalMovesForLocation(loc: BoardGameLocationId): BoardGameLocationId[] {
  return getLocationDefinition(loc)?.adjacent.slice() ?? [];
}

export function hasEquippedEffect(
  player: Pick<AuthoritativePlayerState, 'equipped'>,
  effectKind: string,
): boolean {
  return player.equipped.some((c) => c.effectKind === effectKind);
}

export function listLegalMovesForPlayer(player: AuthoritativePlayerState): BoardGameLocationId[] {
  const oneStep = listLegalMovesForLocation(player.location);
  const extraSteps =
    hasEquippedEffect(player, 'eq-sneakers') ||
    (player.revealed && player.roleId === 'suong-an-danh' && player.location === 'corridor');
  if (!extraSteps) return oneStep;
  const dest = new Set<BoardGameLocationId>(oneStep);
  for (const mid of oneStep) {
    for (const two of listLegalMovesForLocation(mid)) {
      if (two !== player.location) dest.add(two);
    }
  }
  return Array.from(dest);
}

export function canPlayerInvestigateTarget(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  target: AuthoritativePlayerState,
): boolean {
  if (!actor.alive || !target.alive || actor.playerId === target.playerId) return false;
  if (
    actor.location === 'radio' ||
    actor.globalInvestigateThisTurn ||
    hasEquippedEffect(actor, 'eq-walkie-talkie') ||
    (actor.revealed && actor.roleId === 'gac-radio')
  ) {
    return true;
  }
  if (actor.location === target.location) return true;
  return isAdjacentLocation(actor.location, target.location);
}

export function canPlayerAttackTarget(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  target: AuthoritativePlayerState,
): boolean {
  if (!actor.alive || !target.alive || actor.playerId === target.playerId) return false;
  if (actor.location === target.location) return true;
  const courtBoost = actor.extendedRangeThisTurn && state.courtRangeJammedRound !== state.round;
  const batonBoost = hasEquippedEffect(actor, 'eq-baton');
  if (courtBoost || batonBoost) {
    return isAdjacentLocation(actor.location, target.location);
  }
  return false;
}

export function canPlayerUseSkillRange(
  actor: AuthoritativePlayerState,
  target: AuthoritativePlayerState,
): boolean {
  if (!target.alive) return false;
  if (actor.roleId === 'gac-radio') return true;
  return isAdjacentLocation(actor.location, target.location);
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
