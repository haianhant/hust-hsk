// ---------------------------------------------------------------------------
// features/boardgame/ui/vfx-queue.ts
// Visual Event Queue cho Bóng Đêm KTX:
// - Sinh hàng đợi hiệu ứng thuần túy từ delta của server (`BoardGamePublicGameView`)
// - Mỗi event có `id` duy nhất, `order` rõ ràng
// - Khử trùng lặp an toàn khi F5 reconnect / nhận BG_STATE_SYNC trùng
// - Bảo mật P0 tuyệt đối: không lộ hidden role hoặc bài rút kín trên tay người khác
// ---------------------------------------------------------------------------

import type {
  BoardGameDeckId,
  BoardGameFactionId,
  BoardGameLocationId,
  BoardGamePublicGameView,
  BoardGamePublicLogEntry,
  BoardGamePublicPlayerView,
  BoardGamePrivateGameView,
  BoardGameRoleId,
} from '../../../shared/contracts/boardgame';
import { getRoleDesign } from '../domain/roles';
import { MIDNIGHT_CHARACTER_ART } from './midnight-noir-tokens';

export type CombatVfxEffectKind =
  | 'SLASH'
  | 'MASAMUNE_SLASH'
  | 'SPEAR_THRUST'
  | 'HANDGUN_SHOT'
  | 'MACHINE_GUN_BARRAGE'
  | 'LIGHTNING_STRIKE'
  | 'EXPLOSION'
  | 'COUNTER_STRIKE'
  | 'HEAL_AURA'
  | 'SHIELD_GUARD'
  | 'STEAL_TETHER';

export type FloatingTextVariant =
  | 'damage'
  | 'critical'
  | 'heal'
  | 'block'
  | 'counter'
  | 'miss'
  | 'steal';

export type CinematicBannerType =
  | 'YOUR_TURN'
  | 'ROLE_REVEAL'
  | 'ULTIMATE_SKILL'
  | 'ELIMINATION'
  | 'VICTORY';

export type ScreenShakeLevel = 'none' | 'light' | 'heavy';

export type RoleRevealPhase =
  | 'anticipation'
  | 'card-flip'
  | 'faction-reveal'
  | 'impact'
  | 'settle';

export interface RoleRevealTimeline {
  anticipationEndMs: number;
  cardFlipEndMs: number;
  factionRevealEndMs: number;
  /** Alias cho factionRevealEndMs để tương thích ngược */
  revealEndMs: number;
  impactEndMs: number;
  totalMs: number;
}

export type VictoryCinematicPhase =
  | 'anticipation'
  | 'faction-reveal'
  | 'impact'
  | 'settle';

export type MatchOutcomeView = 'victory' | 'defeat' | 'spectator';

export interface VictoryCinematicTimeline {
  anticipationEndMs: number;
  factionRevealEndMs: number;
  impactEndMs: number;
  totalMs: number;
}

export type CombatSequencePhase =
  | 'target-lock'
  | 'anticipation'
  | 'travel'
  | 'impact'
  | 'recovery';

export interface CombatSequenceTimings {
  targetLockEndMs: number;
  anticipationEndMs: number;
  travelEndMs: number;
  impactStartMs: number;
  hitStopStartMs: number;
  hitStopEndMs: number;
  hitStopDurationMs: number;
  impactEndMs: number;
  damagePopAtMs: number;
  recoveryEndMs: number;
}

export interface CombatSequenceOptions {
  qualityTier?: 'high' | 'balanced' | 'low';
  isCritical?: boolean;
  isMiss?: boolean;
}

export interface DiceRollVisualEvent {
  id: string;
  kind: 'DICE_ROLL';
  order: number;
  durationMs: number;
  settleAtMs?: number;
  diceKind: 'move' | 'attack';
  actorId: string;
  actorName: string;
  d6: number;
  d4: number;
  total: number;
  freeChoice: boolean;
  rerollRequired: boolean;
  resolvedLocation?: BoardGameLocationId | null;
}

export interface CardDrawVisualEvent {
  id: string;
  kind: 'CARD_DRAW';
  order: number;
  durationMs: number;
  deck: BoardGameDeckId;
  actorId: string;
  actorName: string;
  showFront: boolean;
  cardId: string | null;
  cardTitle: string | null;
  autoEquipped: boolean;
}

export interface CombatVfxVisualEvent {
  id: string;
  kind: 'COMBAT_VFX';
  order: number;
  durationMs: number;
  effect: CombatVfxEffectKind;
  sourcePlayerId: string | null;
  targetPlayerIds: string[];
  shake: ScreenShakeLevel;
  roleId?: BoardGameRoleId | null;
  isCritical?: boolean;
  isMiss?: boolean;
  damageAmount?: number;
}

export type FloatingTextSyncGroup = 'attack' | 'counter' | 'shield' | 'heal' | 'steal';

export interface FloatingTextVisualEvent {
  id: string;
  kind: 'FLOATING_TEXT';
  order: number;
  durationMs: number;
  targetPlayerId: string;
  label: string;
  variant: FloatingTextVariant;
  syncGroup?: FloatingTextSyncGroup;
}

export interface CinematicCutInVisualEvent {
  id: string;
  kind: 'CINEMATIC_CUTIN';
  order: number;
  durationMs: number;
  bannerType: CinematicBannerType;
  title: string;
  subtitle: string;
  faction: BoardGameFactionId | null;
  roleId: BoardGameRoleId | null;
  roleName: string | null;
  portraitSrc: string | null;
  skillName: string | null;
  actorId: string | null;
  /** Phase 2 — Phân biệt kết cục theo góc nhìn người chơi hiện tại (Victory / Defeat / Spectator) */
  matchOutcome?: MatchOutcomeView | null;
  winnerFactionLabel?: string | null;
  winReason?: string | null;
}

export type BoardGameVisualEvent =
  | DiceRollVisualEvent
  | CardDrawVisualEvent
  | CombatVfxVisualEvent
  | FloatingTextVisualEvent
  | CinematicCutInVisualEvent;

export interface ExtractVisualEventsContext {
  selfPlayerId: string | null;
  isSpectator: boolean;
  privateView?: BoardGamePrivateGameView | null;
  reducedMotion?: boolean;
}

const VFX_SEEN_STORAGE_PREFIX = 'hustverse:bg-vfx-seen:v1:';
const MAX_STORED_EVENT_IDS = 240;

function readSeenIdsFromStorage(matchId: string): string[] {
  if (typeof window === 'undefined' || !window.sessionStorage) return [];
  try {
    const raw = window.sessionStorage.getItem(`${VFX_SEEN_STORAGE_PREFIX}${matchId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string')
      : [];
  } catch {
    return [];
  }
}

function writeSeenIdsToStorage(matchId: string, ids: readonly string[]): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    const trimmed = ids.slice(-MAX_STORED_EVENT_IDS);
    window.sessionStorage.setItem(`${VFX_SEEN_STORAGE_PREFIX}${matchId}`, JSON.stringify(trimmed));
  } catch {
    // ignore storage quota errors
  }
}

export function computeDiceSig(pub: BoardGamePublicGameView): string | null {
  const r = pub.lastDiceRoll;
  if (!r) return null;
  // Dùng định danh của chính cú tung (r.id / r.atMs); KHÔNG phụ thuộc pub.turnNumber hay resolvedLocation
  // để tránh xoay lại xúc xắc cũ khi END_TURN tăng turnNumber hoặc khi chọn đích sau tổng 7 / La Bàn.
  const rollIdentity = r.id
    ? r.id
    : typeof r.atMs === 'number'
      ? `at-${r.atMs}`
      : `turn-${pub.turnNumber}`;
  return `${rollIdentity}:${r.kind}:${r.playerId}:${r.d6}:${r.d4}:${r.total}:${r.rerollRequired ? 1 : 0}:${r.damageDealt ?? ''}`;
}

export function computeDiceEventId(pub: BoardGamePublicGameView): string | null {
  const sig = computeDiceSig(pub);
  if (!sig) return null;
  return `${pub.matchId}::dice::${sig}`;
}

export function buildDiceRollEventFromSnapshot(
  pub: BoardGamePublicGameView,
  reducedMotion: boolean,
): DiceRollVisualEvent | null {
  const r = pub.lastDiceRoll;
  const id = computeDiceEventId(pub);
  if (!r || !id) return null;
  return {
    id,
    kind: 'DICE_ROLL',
    order: 10,
    durationMs: scaleDuration(r.kind === 'attack' ? 1320 : 1420, reducedMotion),
    diceKind: r.kind,
    actorId: r.playerId,
    actorName: r.displayName,
    d6: r.d6,
    d4: r.d4,
    total: r.total,
    freeChoice: r.freeChoice,
    rerollRequired: r.rerollRequired,
    resolvedLocation: r.resolvedLocation ?? null,
  };
}

function detectDeckFromLogText(text: string): BoardGameDeckId {
  if (text.includes('Cung Ứng')) return 'equipment';
  if (text.includes('Đột Kích')) return 'event';
  return 'investigation';
}

function findNewlyEquippedCard(
  prevPlayer: BoardGamePublicPlayerView | undefined,
  nextPlayer: BoardGamePublicPlayerView | undefined,
) {
  if (!nextPlayer) return null;
  const prevLen = prevPlayer?.equipped.length ?? 0;
  if (nextPlayer.equipped.length <= prevLen) return null;
  return nextPlayer.equipped[nextPlayer.equipped.length - 1] ?? null;
}

function collectNewLogs(
  prev: BoardGamePublicGameView,
  next: BoardGamePublicGameView,
): readonly BoardGamePublicLogEntry[] {
  if (next.publicLog.length === 0) return [];
  if (prev.publicLog.length === 0) return next.publicLog;
  const prevLast = prev.publicLog[prev.publicLog.length - 1];
  const lastIdx = next.publicLog.findIndex((entry) => entry.id === prevLast.id);
  if (lastIdx >= 0) {
    return next.publicLog.slice(lastIdx + 1);
  }
  const prevIds = new Set(prev.publicLog.map((e) => e.id));
  return next.publicLog.filter((e) => !prevIds.has(e.id));
}

function findPlayersByNameMention(
  text: string,
  players: readonly BoardGamePublicPlayerView[],
  excludePlayerId?: string | null,
): string[] {
  const matched: string[] = [];
  for (const p of players) {
    if (excludePlayerId && p.playerId === excludePlayerId) continue;
    if (text.includes(p.displayName)) {
      matched.push(p.playerId);
    }
  }
  return matched;
}

function getRevealPortrait(roleId: BoardGameRoleId | null): string | null {
  if (!roleId) return null;
  return MIDNIGHT_CHARACTER_ART[roleId] ?? null;
}

function scaleDuration(baseMs: number, reducedMotion: boolean): number {
  return reducedMotion ? Math.min(260, Math.round(baseMs * 0.4)) : baseMs;
}

/**
 * Chia 5 giai đoạn Cinematic Role Reveal (1.2–1.8s, mặc định 1720ms):
 *   anticipation -> card-flip -> faction-reveal -> impact -> settle.
 * Điều chỉnh nhẹ theo chất lượng đồ họa (`high`/`balanced`/`low`) và rút gọn `<= 260ms`
 * khi bật Reduced Motion.
 */
export function resolveRoleRevealTimeline(
  durationMs: number,
  reducedMotion: boolean,
  qualityTier: 'high' | 'balanced' | 'low' = 'high',
): RoleRevealTimeline {
  const safeTotal = Math.max(180, Math.round(durationMs));
  if (reducedMotion || safeTotal <= 350) {
    return {
      anticipationEndMs: 0,
      cardFlipEndMs: 0,
      factionRevealEndMs: 0,
      revealEndMs: 0,
      impactEndMs: 0,
      totalMs: Math.min(260, safeTotal),
    };
  }
  const clamped = Math.max(1200, Math.min(1800, safeTotal));
  const totalMs =
    qualityTier === 'low'
      ? Math.min(clamped, 1440)
      : qualityTier === 'balanced'
        ? Math.min(clamped, 1620)
        : clamped;
  const anticipationEndMs = Math.round(totalMs * 0.24);
  const cardFlipEndMs = Math.round(totalMs * 0.44);
  const factionRevealEndMs = Math.round(totalMs * 0.64);
  const impactEndMs = Math.round(totalMs * 0.86);
  return {
    anticipationEndMs,
    cardFlipEndMs,
    factionRevealEndMs,
    revealEndMs: factionRevealEndMs,
    impactEndMs,
    totalMs,
  };
}

/**
 * Chia 4 giai đoạn Victory / Defeat / Spectator Cinematic (1.5–2.5s, mặc định 2200ms):
 *   anticipation -> faction-reveal -> impact -> settle.
 * Tôn trọng cấu hình đồ họa (`high`/`balanced`/`low`) và rút gọn `<= 280ms` khi bật Reduced Motion.
 */
export function resolveVictoryCinematicTimeline(
  durationMs: number,
  reducedMotion: boolean,
  qualityTier: 'high' | 'balanced' | 'low' = 'high',
): VictoryCinematicTimeline {
  const safeTotal = Math.max(180, Math.round(durationMs));
  if (reducedMotion || safeTotal <= 380) {
    return {
      anticipationEndMs: 0,
      factionRevealEndMs: 0,
      impactEndMs: 0,
      totalMs: Math.min(280, safeTotal),
    };
  }
  const clamped = Math.max(1500, Math.min(2500, safeTotal));
  const totalMs =
    qualityTier === 'low'
      ? Math.min(clamped, 1750)
      : qualityTier === 'balanced'
        ? Math.min(clamped, 2000)
        : clamped;
  const anticipationEndMs = Math.round(totalMs * 0.22);
  const factionRevealEndMs = Math.round(totalMs * 0.5);
  const impactEndMs = Math.round(totalMs * 0.8);
  return {
    anticipationEndMs,
    factionRevealEndMs,
    impactEndMs,
    totalMs,
  };
}

export function resolveMatchOutcomeForViewer(
  publicGame: Pick<BoardGamePublicGameView, 'winnerLabel' | 'winnerPlayerIds'>,
  ctx: Pick<ExtractVisualEventsContext, 'selfPlayerId' | 'isSpectator'>,
): MatchOutcomeView {
  if (ctx.isSpectator || !ctx.selfPlayerId) {
    return 'spectator';
  }
  return publicGame.winnerPlayerIds.includes(ctx.selfPlayerId) ? 'victory' : 'defeat';
}

export function computeVictoryEventId(
  pub: Pick<BoardGamePublicGameView, 'matchId' | 'winnerLabel'>,
): string | null {
  if (!pub.winnerLabel) return null;
  return `${pub.matchId}::victory::${pub.winnerLabel}`;
}

/**
 * Chia chuỗi 5 pha Combat Impact V2 (tổng 750–1.100ms):
 *   1. Target Lock (0–150ms)
 *   2. Anticipation (150–300ms)
 *   3. Attack Travel (300–500ms)
 *   4. Impact (500–700ms, gồm Hit-Stop 60–90ms)
 *   5. Recovery (700–1.100ms — Floating Damage chỉ xuất hiện từ sau Impact)
 */
export function resolveCombatSequenceTimings(
  durationMs: number,
  effect: CombatVfxEffectKind,
  reducedMotion: boolean,
  options?: CombatSequenceOptions,
): CombatSequenceTimings {
  const safeTotal = Math.max(120, Math.round(durationMs));
  if (reducedMotion || safeTotal <= 320) {
    return {
      targetLockEndMs: 0,
      anticipationEndMs: 0,
      travelEndMs: 0,
      impactStartMs: 0,
      hitStopStartMs: 0,
      hitStopEndMs: 0,
      hitStopDurationMs: 0,
      impactEndMs: 0,
      damagePopAtMs: 0,
      recoveryEndMs: Math.min(240, safeTotal),
    };
  }
  const tier = options?.qualityTier ?? 'high';
  const clamped = Math.max(750, Math.min(1100, safeTotal));
  const totalMs =
    tier === 'low'
      ? Math.min(clamped, 840)
      : tier === 'balanced'
        ? Math.min(clamped, 960)
        : clamped;

  const targetLockEndMs = Math.round(totalMs * 0.15);
  const anticipationEndMs = Math.round(totalMs * 0.3);
  const travelEndMs = Math.round(totalMs * 0.5);
  const impactStartMs = travelEndMs;
  const hitStopStartMs = travelEndMs;

  const isNonOffensive =
    effect === 'HEAL_AURA' || effect === 'SHIELD_GUARD' || effect === 'STEAL_TETHER';
  const isMiss = Boolean(options?.isMiss);
  const hitStopDurationMs =
    isNonOffensive || isMiss
      ? 0
      : options?.isCritical
        ? 85
        : effect === 'COUNTER_STRIKE'
          ? 80
          : 75;
  const hitStopEndMs = hitStopStartMs + hitStopDurationMs;
  const impactEndMs = Math.max(
    hitStopEndMs + (hitStopDurationMs > 0 ? 55 : 40),
    Math.round(totalMs * 0.7),
  );
  const recoveryEndMs = Math.max(impactEndMs + 160, totalMs);
  // Sát thương tuyệt đối KHÔNG xuất hiện trước Impact (chỉ bật ngay sau pha Impact/Hit-Stop)
  const damagePopAtMs = impactEndMs;

  return {
    targetLockEndMs,
    anticipationEndMs,
    travelEndMs,
    impactStartMs,
    hitStopStartMs,
    hitStopEndMs,
    hitStopDurationMs,
    impactEndMs,
    damagePopAtMs,
    recoveryEndMs,
  };
}

export function resolveCombatPhaseAt(
  elapsedMs: number,
  timings: CombatSequenceTimings,
): CombatSequencePhase {
  if (timings.travelEndMs <= 0) return 'recovery';
  if (elapsedMs < timings.targetLockEndMs) return 'target-lock';
  if (elapsedMs < timings.anticipationEndMs) return 'anticipation';
  if (elapsedMs < timings.travelEndMs) return 'travel';
  if (elapsedMs < timings.impactEndMs) return 'impact';
  return 'recovery';
}

/**
 * Tính độ trễ từng mục tiêu cho đòn đa mục tiêu (2–8 quân) để mỗi mục tiêu có
 * nhịp va chạm, hit-flash và popup riêng mà tổng chuỗi vẫn gọn trong <= 1.1s.
 */
export function resolveMultiTargetStaggerMs(
  targetIndex: number,
  totalTargets: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion || totalTargets <= 1 || targetIndex <= 0) return 0;
  const clampedIdx = Math.min(targetIndex, totalTargets - 1);
  if (totalTargets <= 3) return clampedIdx * 55;
  return Math.round((clampedIdx / Math.max(1, totalTargets - 1)) * 165);
}

/**
 * Bố trí tọa độ Floating Damage / BLOCK / MISS / HEAL không chồng lấp nhau ngay cả khi
 * 4–8 quân cùng đứng trong 1 ô địa điểm và trúng đòn diện rộng đồng thời.
 */
export function resolveNonOverlappingPopupPos(
  baseX: number,
  baseY: number,
  existing: readonly { x: number; y: number }[],
  containerWidth: number,
  containerHeight: number,
  isCrowded = false,
): { x: number; y: number } {
  const safeW = Math.max(320, containerWidth || 720);
  const safeH = Math.max(240, containerHeight || 480);
  const padX = isCrowded ? 42 : 50;
  const minX = padX;
  const maxX = Math.max(padX, safeW - padX);
  const minY = 36;
  const maxY = Math.max(40, safeH - 28);
  const minSepX = isCrowded ? 66 : 82;
  const minSepY = isCrowded ? 28 : 34;

  const clamp = (x: number, y: number) => ({
    x: Math.round(Math.max(minX, Math.min(maxX, x))),
    y: Math.round(Math.max(minY, Math.min(maxY, y))),
  });

  const candidates: readonly [number, number][] = [
    [0, 0],
    [0, -32],
    [42, -16],
    [-42, -16],
    [0, -64],
    [54, -46],
    [-54, -46],
    [0, 26],
    [68, 0],
    [-68, 0],
    [46, 26],
    [-46, 26],
    [88, -32],
    [-88, -32],
    [0, -96],
  ];

  let bestPos = clamp(baseX, baseY);
  let bestScore = Number.POSITIVE_INFINITY;

  for (const [ox, oy] of candidates) {
    const pt = clamp(baseX + ox, baseY + oy);
    let overlapPenalty = 0;
    for (const item of existing) {
      const dx = Math.abs(item.x - pt.x);
      const dy = Math.abs(item.y - pt.y);
      if (dx < minSepX && dy < minSepY) {
        overlapPenalty += (minSepX - dx) * (minSepY - dy);
      }
    }
    if (overlapPenalty === 0) return pt;
    const distPenalty = Math.hypot(ox, oy) * 0.25;
    const score = overlapPenalty + distPenalty;
    if (score < bestScore) {
      bestScore = score;
      bestPos = pt;
    }
  }

  return bestPos;
}

/**
 * Suy xuất danh sách hiệu ứng có ID duy nhất và thứ tự rõ ràng từ 2 ảnh chụp liên tiếp
 * của state trên server (`prev` -> `next`), tôn trọng tuyệt đối bảo mật vai ẩn & bài kín.
 */
export function extractVisualEventsFromDiff(
  prev: BoardGamePublicGameView,
  next: BoardGamePublicGameView,
  ctx: ExtractVisualEventsContext,
): BoardGameVisualEvent[] {
  const events: BoardGameVisualEvent[] = [];
  const reduced = Boolean(ctx.reducedMotion);
  const nextById = new Map<string, BoardGamePublicPlayerView>();
  const prevById = new Map<string, BoardGamePublicPlayerView>();
  for (const p of next.players) nextById.set(p.playerId, p);
  for (const p of prev.players) prevById.set(p.playerId, p);

  const newLogs = collectNewLogs(prev, next);
  const watermark = newLogs.length > 0 ? newLogs[newLogs.length - 1].id : `t${next.turnNumber}-p${next.turnPhase}`;
  const mkId = (suffix: string) => `${next.matchId}::${next.turnNumber}::${watermark}::${suffix}`;

  // Tính toán delta thương tích thực tế giữa 2 snapshot
  const damagedPlayerIds: string[] = [];
  const woundDeltas = new Map<string, number>();
  for (const np of next.players) {
    const pp = prevById.get(np.playerId);
    if (!pp) continue;
    const delta = np.woundsTaken - pp.woundsTaken;
    if (delta !== 0) {
      woundDeltas.set(np.playerId, delta);
      if (delta > 0) damagedPlayerIds.push(np.playerId);
    }
  }

  // 1. DICE_ROLL (order: 10)
  const prevDiceSig = computeDiceSig(prev);
  const nextDiceSig = computeDiceSig(next);
  if (next.lastDiceRoll && nextDiceSig && nextDiceSig !== prevDiceSig) {
    const diceEv = buildDiceRollEventFromSnapshot(next, reduced);
    if (diceEv) {
      events.push(diceEv);
    }
  }

  // Theo dõi liệu log đã tạo Combat VFX chưa để tránh trùng hoặc bổ sung hợp lý
  let hasAttackOrExplosionVfx = false;
  const blockedTargets = new Set<string>();
  const counterDamagedIds = new Set<string>();
  const revealedActorIdsThisTick = new Set<string>();

  // 2. Xử lý lần lượt từng dòng log mới được server xác nhận
  for (let i = 0; i < newLogs.length; i++) {
    const log = newLogs[i];
    const actorId = log.actorId ?? null;
    const actorPub = actorId ? nextById.get(actorId) : undefined;
    const prevActorPub = actorId ? prevById.get(actorId) : undefined;

    // 2A. Rút bài (draw / auto-equip) (order: 20)
    if (
      log.kind === 'draw' ||
      (log.kind === 'equipment' && log.text.includes('rút từ ') && log.text.includes('trang bị ngay'))
    ) {
      const deck = detectDeckFromLogText(log.text);
      const newEq = findNewlyEquippedCard(prevActorPub, actorPub);
      const autoEquipped = Boolean(newEq && log.text.includes('trang bị ngay'));
      const isOwnerViewingHand =
        Boolean(actorId && actorId === ctx.selfPlayerId) && !ctx.isSpectator;
      const latestOwnerCard =
        isOwnerViewingHand && ctx.privateView?.hand.length
          ? ctx.privateView.hand[ctx.privateView.hand.length - 1]
          : null;

      const showFront = autoEquipped || Boolean(latestOwnerCard);
      const cardId = autoEquipped
        ? newEq?.id ?? null
        : latestOwnerCard
          ? latestOwnerCard.id
          : null;
      const cardTitle = autoEquipped
        ? newEq?.title ?? null
        : latestOwnerCard
          ? latestOwnerCard.title
          : null;

      events.push({
        id: `${next.matchId}::draw::${log.id}`,
        kind: 'CARD_DRAW',
        order: 20,
        durationMs: scaleDuration(autoEquipped ? 1150 : 880, reduced),
        deck,
        actorId: actorId ?? '',
        actorName: actorPub?.displayName ?? 'Sinh viên',
        showFront,
        cardId,
        cardTitle,
        autoEquipped,
      });
    }

    // 2B. Lộ diện (voluntary hoặc từ hiệu ứng như Tiếng Hét, Gương, Advent, Chocolate) (order: 30)
    // Chỉ kích hoạt khi server đã công khai cả role & faction trên public view (P0 safety)
    if (
      log.kind === 'reveal' &&
      actorId &&
      actorPub?.revealedRoleId &&
      actorPub.revealedFaction
    ) {
      const roleDesign = getRoleDesign(actorPub.revealedRoleId);
      revealedActorIdsThisTick.add(actorId);
      events.push({
        id: `${next.matchId}::reveal::${log.id}`,
        kind: 'CINEMATIC_CUTIN',
        order: 30,
        durationMs: scaleDuration(1720, reduced),
        bannerType: 'ROLE_REVEAL',
        title: 'LỘ DIỆN',
        subtitle: `${actorPub.displayName} lật vai ${roleDesign.name}!`,
        faction: actorPub.revealedFaction,
        roleId: actorPub.revealedRoleId,
        roleName: roleDesign.name,
        portraitSrc: getRevealPortrait(actorPub.revealedRoleId),
        skillName: roleDesign.skillName,
        actorId,
      });
    }

    // 2C. Kỹ năng nhân vật / Lá chắn (order: 32 -> 42)
    if (log.kind === 'skill') {
      if (log.text.includes('Lá Chắn Thiên Thần che chở')) {
        const defenderIds = findPlayersByNameMention(log.text, next.players);
        for (const tid of defenderIds) {
          blockedTargets.add(tid);
          events.push({
            id: `${next.matchId}::shield::${log.id}::${tid}`,
            kind: 'COMBAT_VFX',
            order: 42,
            durationMs: scaleDuration(840, reduced),
            effect: 'SHIELD_GUARD',
            sourcePlayerId: actorId,
            targetPlayerIds: [tid],
            shake: 'none',
          });
          events.push({
            id: `${next.matchId}::block-txt::${log.id}::${tid}`,
            kind: 'FLOATING_TEXT',
            order: 50,
            durationMs: scaleDuration(840, reduced),
            targetPlayerId: tid,
            label: 'BLOCK',
            variant: 'block',
            syncGroup: 'shield',
          });
        }
        continue;
      }

      if (log.text.includes('phản kích')) {
        const dungId = actorId;
        const attackerId =
          next.lastDiceRoll?.kind === 'attack' ? next.lastDiceRoll.playerId : null;
        const counterMentions = findPlayersByNameMention(log.text, next.players, dungId);
        const counterTargetId =
          attackerId && attackerId !== dungId
            ? attackerId
            : counterMentions[0] ?? dungId;
        const counterMissed = log.text.includes('không gây sát thương');
        const counterDmg = counterTargetId ? woundDeltas.get(counterTargetId) ?? 0 : 0;
        if (!counterMissed && counterTargetId && counterTargetId !== dungId && counterDmg > 0) {
          counterDamagedIds.add(counterTargetId);
        }
        if (dungId) {
          events.push({
            id: `${next.matchId}::counter-fx::${log.id}`,
            kind: 'COMBAT_VFX',
            order: 45,
            durationMs: scaleDuration(counterMissed ? 860 : 980, reduced),
            effect: 'COUNTER_STRIKE',
            sourcePlayerId: dungId,
            targetPlayerIds: counterTargetId ? [counterTargetId] : [dungId],
            shake: counterMissed ? 'none' : counterDmg >= 4 ? 'heavy' : 'light',
            roleId: actorPub?.revealedRoleId ?? null,
            isCritical: !counterMissed && counterDmg >= 4,
            isMiss: counterMissed,
            damageAmount: counterDmg,
          });
          events.push({
            id: `${next.matchId}::counter-txt::${log.id}`,
            kind: 'FLOATING_TEXT',
            order: 52,
            durationMs: scaleDuration(860, reduced),
            targetPlayerId: dungId,
            label: 'COUNTER',
            variant: 'counter',
            syncGroup: 'counter',
          });
        }
        continue;
      }

      // Chỉ kích hoạt Cut-in Tuyệt Kỹ kèm chân dung khi actor đã lộ vai công khai (P0 safety)
      if (actorId && actorPub?.revealedRoleId) {
        const roleDesign = getRoleDesign(actorPub.revealedRoleId);
        const targetMentions = findPlayersByNameMention(log.text, next.players, actorId);
        const skillTargets =
          targetMentions.length > 0
            ? targetMentions
            : damagedPlayerIds.filter((id) => id !== actorId);

        if (actorPub.revealedRoleId === 'gac-radio' && log.text.includes('Xung Cao Áp')) {
          events.push({
            id: `${next.matchId}::ult::${log.id}`,
            kind: 'CINEMATIC_CUTIN',
            order: 32,
            durationMs: scaleDuration(1350, reduced),
            bannerType: 'ULTIMATE_SKILL',
            title: 'TUYỆT KỸ',
            subtitle: `${actorPub.displayName} · ${roleDesign.skillName}`,
            faction: actorPub.revealedFaction,
            roleId: actorPub.revealedRoleId,
            roleName: roleDesign.name,
            portraitSrc: getRevealPortrait(actorPub.revealedRoleId),
            skillName: 'XUNG CAO ÁP 1D6',
            actorId,
          });
          if (skillTargets.length > 0) {
            hasAttackOrExplosionVfx = true;
            const maxSkillDmg = skillTargets.reduce(
              (mx, id) => Math.max(mx, woundDeltas.get(id) ?? 0),
              0,
            );
            events.push({
              id: `${next.matchId}::lightning::${log.id}`,
              kind: 'COMBAT_VFX',
              order: 40,
              durationMs: scaleDuration(1040, reduced),
              effect: 'LIGHTNING_STRIKE',
              sourcePlayerId: actorId,
              targetPlayerIds: skillTargets,
              shake: 'heavy',
              roleId: 'gac-radio',
              isCritical: maxSkillDmg >= 4,
              damageAmount: maxSkillDmg,
            });
          }
        } else if (actorPub.revealedRoleId === 'gac-ky-thuat' && log.text.includes('Đòn Phá Vây')) {
          events.push({
            id: `${next.matchId}::ult::${log.id}`,
            kind: 'CINEMATIC_CUTIN',
            order: 32,
            durationMs: scaleDuration(1350, reduced),
            bannerType: 'ULTIMATE_SKILL',
            title: 'TUYỆT KỸ',
            subtitle: `${actorPub.displayName} · ${roleDesign.skillName}`,
            faction: actorPub.revealedFaction,
            roleId: actorPub.revealedRoleId,
            roleName: roleDesign.name,
            portraitSrc: getRevealPortrait(actorPub.revealedRoleId),
            skillName: 'ĐÒN PHÁ VÂY 1D4',
            actorId,
          });
          if (skillTargets.length > 0) {
            hasAttackOrExplosionVfx = true;
            const maxSkillDmg = skillTargets.reduce(
              (mx, id) => Math.max(mx, woundDeltas.get(id) ?? 0),
              0,
            );
            events.push({
              id: `${next.matchId}::demo-boom::${log.id}`,
              kind: 'COMBAT_VFX',
              order: 40,
              durationMs: scaleDuration(1020, reduced),
              effect: 'EXPLOSION',
              sourcePlayerId: actorId,
              targetPlayerIds: skillTargets,
              shake: 'heavy',
              roleId: 'gac-ky-thuat',
              isCritical: maxSkillDmg >= 4,
              damageAmount: maxSkillDmg,
            });
          }
        } else if (actorPub.revealedRoleId === 'lang-quan-sat' && log.text.includes('Ý Chí Hồi Sinh')) {
          events.push({
            id: `${next.matchId}::ult::${log.id}`,
            kind: 'CINEMATIC_CUTIN',
            order: 32,
            durationMs: scaleDuration(1350, reduced),
            bannerType: 'ULTIMATE_SKILL',
            title: 'TUYỆT KỸ',
            subtitle: `${actorPub.displayName} · ${roleDesign.skillName}`,
            faction: actorPub.revealedFaction,
            roleId: actorPub.revealedRoleId,
            roleName: roleDesign.name,
            portraitSrc: getRevealPortrait(actorPub.revealedRoleId),
            skillName: 'Ý CHÍ HỒI SINH',
            actorId,
          });
          events.push({
            id: `${next.matchId}::sig-fx::${log.id}`,
            kind: 'COMBAT_VFX',
            order: 40,
            durationMs: scaleDuration(860, reduced),
            effect: 'HEAL_AURA',
            sourcePlayerId: actorId,
            targetPlayerIds: [actorId],
            shake: 'none',
            roleId: 'lang-quan-sat',
          });
        } else if (actorPub.revealedRoleId === 'lang-cuu-ho' && log.text.includes('Đòn Đánh Đẫm Máu')) {
          events.push({
            id: `${next.matchId}::ult::${log.id}`,
            kind: 'CINEMATIC_CUTIN',
            order: 32,
            durationMs: scaleDuration(1200, reduced),
            bannerType: 'ULTIMATE_SKILL',
            title: 'TUYỆT KỸ',
            subtitle: `${actorPub.displayName} · ${roleDesign.skillName}`,
            faction: actorPub.revealedFaction,
            roleId: actorPub.revealedRoleId,
            roleName: roleDesign.name,
            portraitSrc: getRevealPortrait(actorPub.revealedRoleId),
            skillName: 'ĐÒN ĐÁNH ĐẪM MÁU',
            actorId,
          });
          if (skillTargets.length > 0) {
            hasAttackOrExplosionVfx = true;
            events.push({
              id: `${next.matchId}::feast-slash::${log.id}`,
              kind: 'COMBAT_VFX',
              order: 40,
              durationMs: scaleDuration(960, reduced),
              effect: 'MASAMUNE_SLASH',
              sourcePlayerId: actorId,
              targetPlayerIds: skillTargets,
              shake: 'light',
              roleId: 'lang-cuu-ho',
            });
          }
        } else if (actorPub.revealedRoleId === 'gac-truc-ban' && log.text.includes('Bước Nhảy Tắt')) {
          events.push({
            id: `${next.matchId}::ult::${log.id}`,
            kind: 'CINEMATIC_CUTIN',
            order: 32,
            durationMs: scaleDuration(1100, reduced),
            bannerType: 'ULTIMATE_SKILL',
            title: 'TUYỆT KỸ',
            subtitle: `${actorPub.displayName} · ${roleDesign.skillName}`,
            faction: actorPub.revealedFaction,
            roleId: actorPub.revealedRoleId,
            roleName: roleDesign.name,
            portraitSrc: getRevealPortrait(actorPub.revealedRoleId),
            skillName: 'BƯỚC NHẢY TẮT',
            actorId,
          });
          events.push({
            id: `${next.matchId}::sig-fx::${log.id}`,
            kind: 'COMBAT_VFX',
            order: 40,
            durationMs: scaleDuration(840, reduced),
            effect: 'SHIELD_GUARD',
            sourcePlayerId: actorId,
            targetPlayerIds: [actorId],
            shake: 'none',
            roleId: 'gac-truc-ban',
          });
        } else if (actorPub.revealedRoleId === 'suong-an-danh') {
          events.push({
            id: `${next.matchId}::ult::${log.id}`,
            kind: 'CINEMATIC_CUTIN',
            order: 32,
            durationMs: scaleDuration(1180, reduced),
            bannerType: 'ULTIMATE_SKILL',
            title: 'TUYỆT KỸ',
            subtitle: `${actorPub.displayName} · ${roleDesign.skillName}`,
            faction: actorPub.revealedFaction,
            roleId: actorPub.revealedRoleId,
            roleName: roleDesign.name,
            portraitSrc: getRevealPortrait(actorPub.revealedRoleId),
            skillName: roleDesign.skillName.toUpperCase(),
            actorId,
          });
          events.push({
            id: `${next.matchId}::sig-fx::${log.id}`,
            kind: 'COMBAT_VFX',
            order: 40,
            durationMs: scaleDuration(840, reduced),
            effect: 'HEAL_AURA',
            sourcePlayerId: actorId,
            targetPlayerIds: skillTargets.length > 0 ? skillTargets : [actorId],
            shake: 'none',
            roleId: 'suong-an-danh',
          });
        } else if (actorPub.revealedRoleId === 'lang-anh-san') {
          events.push({
            id: `${next.matchId}::ult::${log.id}`,
            kind: 'CINEMATIC_CUTIN',
            order: 32,
            durationMs: scaleDuration(1180, reduced),
            bannerType: 'ULTIMATE_SKILL',
            title: 'TUYỆT KỸ',
            subtitle: `${actorPub.displayName} · ${roleDesign.skillName}`,
            faction: actorPub.revealedFaction,
            roleId: actorPub.revealedRoleId,
            roleName: roleDesign.name,
            portraitSrc: getRevealPortrait(actorPub.revealedRoleId),
            skillName: roleDesign.skillName.toUpperCase(),
            actorId,
          });
          events.push({
            id: `${next.matchId}::sig-fx::${log.id}`,
            kind: 'COMBAT_VFX',
            order: 40,
            durationMs: scaleDuration(840, reduced),
            effect: 'STEAL_TETHER',
            sourcePlayerId: actorId,
            targetPlayerIds: skillTargets.length > 0 ? skillTargets : [actorId],
            shake: 'none',
            roleId: 'lang-anh-san',
          });
        } else if (
          actorPub.revealedRoleId === 'suong-tin-gia' ||
          actorPub.revealedRoleId === 'lang-tien-phong'
        ) {
          events.push({
            id: `${next.matchId}::sig-fx::${log.id}`,
            kind: 'COMBAT_VFX',
            order: 40,
            durationMs: scaleDuration(860, reduced),
            effect: actorPub.revealedRoleId === 'lang-tien-phong' ? 'EXPLOSION' : 'SHIELD_GUARD',
            sourcePlayerId: actorId,
            targetPlayerIds: [actorId],
            shake: 'none',
            roleId: actorPub.revealedRoleId,
          });
        }
      }
    }

    // 2D. Đòn tấn công (kind === 'attack') — phân loại theo trang bị công khai
    if (log.kind === 'attack' && actorId) {
      const equippedIds = new Set((actorPub?.equipped ?? []).map((c) => c.id));
      const mentions = findPlayersByNameMention(log.text, next.players, actorId);
      const rollTarget =
        next.lastDiceRoll?.kind === 'attack' && next.lastDiceRoll.targetPlayerId
          ? [next.lastDiceRoll.targetPlayerId]
          : [];
      const fallbackTargets =
        mentions.length > 0
          ? mentions
          : damagedPlayerIds.filter((id) => id !== actorId).length > 0
            ? damagedPlayerIds.filter((id) => id !== actorId)
            : rollTarget;

      let effect: CombatVfxEffectKind = 'SLASH';
      if (log.text.includes('Súng Liên Thanh') || equippedIds.has('ev-06')) {
        effect = 'MACHINE_GUN_BARRAGE';
      } else if (equippedIds.has('ev-01')) {
        effect = 'MASAMUNE_SLASH';
      } else if (equippedIds.has('ev-05')) {
        effect = 'HANDGUN_SHOT';
      } else if (actorPub?.revealedFaction === 'lantern-guard' && equippedIds.has('eq-04')) {
        effect = 'SPEAR_THRUST';
      }

      const targetsForFx = Array.from(
        new Set(
          effect === 'MACHINE_GUN_BARRAGE'
            ? [...damagedPlayerIds.filter((id) => id !== actorId), ...fallbackTargets]
            : fallbackTargets,
        ),
      );

      if (targetsForFx.length > 0) {
        hasAttackOrExplosionVfx = true;
        const missed = log.text.includes('ĐÁNH HỤT');
        const maxDamage = targetsForFx.reduce(
          (mx, id) => Math.max(mx, woundDeltas.get(id) ?? 0),
          0,
        );
        const isCritical = !missed && maxDamage >= 4;
        const attackBaseMs = missed
          ? 820
          : effect === 'MACHINE_GUN_BARRAGE'
            ? 1040
            : isCritical || effect === 'MASAMUNE_SLASH'
              ? 1020
              : 920;
        events.push({
          id: `${next.matchId}::atk::${log.id}`,
          kind: 'COMBAT_VFX',
          order: 40,
          durationMs: scaleDuration(attackBaseMs, reduced),
          effect,
          sourcePlayerId: actorId,
          targetPlayerIds: targetsForFx,
          shake: missed ? 'none' : isCritical || effect === 'MACHINE_GUN_BARRAGE' ? 'heavy' : 'light',
          isCritical,
          isMiss: missed,
          damageAmount: maxDamage,
        });

        if (missed) {
          for (const tid of targetsForFx) {
            if (!blockedTargets.has(tid) && (woundDeltas.get(tid) ?? 0) === 0) {
              events.push({
                id: `${next.matchId}::miss-txt::${log.id}::${tid}`,
                kind: 'FLOATING_TEXT',
                order: 50,
                durationMs: scaleDuration(780, reduced),
                targetPlayerId: tid,
                label: 'MISS',
                variant: 'miss',
                syncGroup: 'attack',
              });
            }
          }
        }
      }
    }

    // 2E. Vụ nổ & Sự kiện gây sát thương (Pháo sáng / Kíp nổ / Dơi / Nhện / Hành lang 9)
    if (log.kind === 'event' || (log.kind === 'equipment' && log.text.includes('bảo vệ'))) {
      if (log.text.includes('Ghim Cài May Mắn bảo vệ') || log.text.includes('Bùa Hộ Mệnh bảo vệ')) {
        const guarded = findPlayersByNameMention(log.text, next.players);
        for (const tid of guarded) {
          blockedTargets.add(tid);
          events.push({
            id: `${next.matchId}::ward-fx::${log.id}::${tid}`,
            kind: 'COMBAT_VFX',
            order: 42,
            durationMs: scaleDuration(840, reduced),
            effect: 'SHIELD_GUARD',
            sourcePlayerId: actorId,
            targetPlayerIds: [tid],
            shake: 'none',
          });
          events.push({
            id: `${next.matchId}::ward-txt::${log.id}::${tid}`,
            kind: 'FLOATING_TEXT',
            order: 50,
            durationMs: scaleDuration(840, reduced),
            targetPlayerId: tid,
            label: 'BLOCK',
            variant: 'block',
            syncGroup: 'shield',
          });
        }
      } else if (
        log.text.includes('Kíp Nổ Tự Động') ||
        log.text.includes('Pháo Sáng Phán Quyết') ||
        log.text.includes('Hành Lang (9)') ||
        log.text.includes('Dơi Hút Điện') ||
        log.text.includes('Nhện Chập Mạch')
      ) {
        const mentions = findPlayersByNameMention(log.text, next.players, actorId);
        const boomTargets = Array.from(
          new Set([...mentions, ...damagedPlayerIds.filter((id) => id !== actorId)]),
        );
        if (boomTargets.length > 0) {
          hasAttackOrExplosionVfx = true;
          const maxBoomDmg = boomTargets.reduce(
            (mx, id) => Math.max(mx, woundDeltas.get(id) ?? 0),
            0,
          );
          events.push({
            id: `${next.matchId}::boom::${log.id}`,
            kind: 'COMBAT_VFX',
            order: 40,
            durationMs: scaleDuration(980, reduced),
            effect: 'EXPLOSION',
            sourcePlayerId: actorId,
            targetPlayerIds: boomTargets,
            shake: 'heavy',
            isCritical: maxBoomDmg >= 4,
            damageAmount: maxBoomDmg,
          });
        }
      }
    }

    // 2F. Cướp trang bị (Bob / Sân bóng 10 / Yêu tinh)
    if (log.kind === 'steal' && actorId) {
      const victims = findPlayersByNameMention(log.text, next.players, actorId);
      if (victims.length > 0) {
        events.push({
          id: `${next.matchId}::steal-fx::${log.id}`,
          kind: 'COMBAT_VFX',
          order: 44,
          durationMs: scaleDuration(840, reduced),
          effect: 'STEAL_TETHER',
          sourcePlayerId: actorId,
          targetPlayerIds: victims,
          shake: 'none',
        });
        for (const vid of victims) {
          events.push({
            id: `${next.matchId}::steal-txt::${log.id}::${vid}`,
            kind: 'FLOATING_TEXT',
            order: 52,
            durationMs: scaleDuration(840, reduced),
            targetPlayerId: vid,
            label: 'STEAL',
            variant: 'steal',
            syncGroup: 'steal',
          });
        }
      }
    }
  }

  // Fallback nếu lastRevealEvent mới xuất hiện mà không đi qua publicLog (hoặc log bị trễ)
  if (
    next.lastRevealEvent &&
    next.lastRevealEvent.id !== prev.lastRevealEvent?.id &&
    !revealedActorIdsThisTick.has(next.lastRevealEvent.playerId)
  ) {
    const rev = next.lastRevealEvent;
    const pubP = nextById.get(rev.playerId);
    if (pubP?.revealedRoleId && pubP.revealedFaction) {
      revealedActorIdsThisTick.add(rev.playerId);
      events.push({
        id: `${next.matchId}::reveal-evt::${rev.id}`,
        kind: 'CINEMATIC_CUTIN',
        order: 30,
        durationMs: scaleDuration(1720, reduced),
        bannerType: 'ROLE_REVEAL',
        title: 'LỘ DIỆN',
        subtitle: `${rev.displayName} lật vai ${rev.roleName}!`,
        faction: rev.faction,
        roleId: rev.roleId,
        roleName: rev.roleName,
        portraitSrc: getRevealPortrait(rev.roleId),
        skillName: getRoleDesign(rev.roleId).skillName,
        actorId: rev.playerId,
      });
    }
  }

  // 3. FLOATING_TEXT & state-diff Reveal fallback (order: 30 / 50)
  for (const np of next.players) {
    const pp = prevById.get(np.playerId);
    if (!pp) continue;
    if (
      !pp.revealedRoleId &&
      np.revealedRoleId &&
      np.revealedFaction &&
      !revealedActorIdsThisTick.has(np.playerId)
    ) {
      revealedActorIdsThisTick.add(np.playerId);
      const roleDesign = getRoleDesign(np.revealedRoleId);
      events.push({
        id: `${next.matchId}::reveal-state::${np.playerId}`,
        kind: 'CINEMATIC_CUTIN',
        order: 30,
        durationMs: scaleDuration(1720, reduced),
        bannerType: 'ROLE_REVEAL',
        title: 'LỘ DIỆN',
        subtitle: `${np.displayName} lật vai ${roleDesign.name}!`,
        faction: np.revealedFaction,
        roleId: np.revealedRoleId,
        roleName: roleDesign.name,
        portraitSrc: getRevealPortrait(np.revealedRoleId),
        skillName: roleDesign.skillName,
        actorId: np.playerId,
      });
    }
    const delta = woundDeltas.get(np.playerId) ?? 0;

    if (delta > 0) {
      const isCritHit = delta >= 4;
      const fromCounter = counterDamagedIds.has(np.playerId);
      if (!hasAttackOrExplosionVfx && !fromCounter) {
        events.push({
          id: mkId(`auto-hit-${np.playerId}`),
          kind: 'COMBAT_VFX',
          order: 40,
          durationMs: scaleDuration(isCritHit ? 980 : 900, reduced),
          effect: 'SLASH',
          sourcePlayerId: next.activePlayerId,
          targetPlayerIds: [np.playerId],
          shake: isCritHit ? 'heavy' : 'light',
          isCritical: isCritHit,
          damageAmount: delta,
        });
        hasAttackOrExplosionVfx = true;
      }
      events.push({
        id: mkId(`dmg-${np.playerId}-${np.woundsTaken}`),
        kind: 'FLOATING_TEXT',
        order: fromCounter ? 53 : 50,
        durationMs: scaleDuration(isCritHit ? 880 : 840, reduced),
        targetPlayerId: np.playerId,
        label: `-${delta}`,
        variant: isCritHit ? 'critical' : 'damage',
        syncGroup: fromCounter ? 'counter' : 'attack',
      });
    } else if (delta < 0) {
      const healed = Math.abs(delta);
      events.push({
        id: mkId(`heal-fx-${np.playerId}-${np.woundsTaken}`),
        kind: 'COMBAT_VFX',
        order: 41,
        durationMs: scaleDuration(840, reduced),
        effect: 'HEAL_AURA',
        sourcePlayerId: next.activePlayerId,
        targetPlayerIds: [np.playerId],
        shake: 'none',
      });
      events.push({
        id: mkId(`heal-txt-${np.playerId}-${np.woundsTaken}`),
        kind: 'FLOATING_TEXT',
        order: 50,
        durationMs: scaleDuration(840, reduced),
        targetPlayerId: np.playerId,
        label: `+${healed}`,
        variant: 'heal',
        syncGroup: 'heal',
      });
    }

    if (!pp.guardianShieldActive && np.guardianShieldActive && !blockedTargets.has(np.playerId)) {
      events.push({
        id: mkId(`shield-on-${np.playerId}`),
        kind: 'COMBAT_VFX',
        order: 42,
        durationMs: scaleDuration(840, reduced),
        effect: 'SHIELD_GUARD',
        sourcePlayerId: np.playerId,
        targetPlayerIds: [np.playerId],
        shake: 'none',
      });
      events.push({
        id: mkId(`shield-on-txt-${np.playerId}`),
        kind: 'FLOATING_TEXT',
        order: 50,
        durationMs: scaleDuration(840, reduced),
        targetPlayerId: np.playerId,
        label: 'BLOCK',
        variant: 'block',
        syncGroup: 'shield',
      });
    }

    // 4. HẠ GỤC (order: 58)
    if (pp.alive && !np.alive) {
      const roleDesign = np.revealedRoleId ? getRoleDesign(np.revealedRoleId) : null;
      events.push({
        id: `${next.matchId}::ko::${np.playerId}`,
        kind: 'CINEMATIC_CUTIN',
        order: 58,
        durationMs: scaleDuration(1450, reduced),
        bannerType: 'ELIMINATION',
        title: 'HẠ GỤC',
        subtitle: roleDesign
          ? `${np.displayName} đã gục — Lộ vai ${roleDesign.name}`
          : `${np.displayName} đã bị loại khỏi KTX`,
        faction: np.revealedFaction,
        roleId: np.revealedRoleId,
        roleName: roleDesign?.name ?? null,
        portraitSrc: getRevealPortrait(np.revealedRoleId),
        skillName: null,
        actorId: np.playerId,
      });
    }
  }

  // 5. CHIẾN THẮNG / THẤT BẠI / KHÁN GIẢ (order: 62) — chỉ phát khi server chính thức kết thúc trận
  if (!prev.winnerLabel && next.winnerLabel) {
    const winFaction =
      next.winnerFaction === 'lantern-guard' ||
      next.winnerFaction === 'mist-order' ||
      next.winnerFaction === 'wanderer'
        ? next.winnerFaction
        : next.winnerFaction === 'wanderer-solo'
          ? 'wanderer'
          : null;
    const matchOutcome = resolveMatchOutcomeForViewer(next, ctx);
    const outcomeTitle =
      matchOutcome === 'victory'
        ? 'CHIẾN THẮNG'
        : matchOutcome === 'defeat'
          ? 'THẤT BẠI'
          : 'KẾT THÚC VÁN ĐẤU';
    const victoryId = computeVictoryEventId(next) ?? `${next.matchId}::victory::${next.winnerLabel}`;
    events.push({
      id: victoryId,
      kind: 'CINEMATIC_CUTIN',
      order: 62,
      durationMs: scaleDuration(2200, reduced),
      bannerType: 'VICTORY',
      title: outcomeTitle,
      subtitle: `${next.winnerLabel}${next.winReason ? ` — ${next.winReason}` : ''}`,
      faction: winFaction,
      roleId: null,
      roleName: null,
      portraitSrc: null,
      skillName: null,
      actorId: null,
      matchOutcome,
      winnerFactionLabel: next.winnerLabel,
      winReason: next.winReason ?? null,
    });
  }

  // 6. LƯỢT CỦA BẠN (order: 65) — không bao giờ phát cho Khán giả hoặc khi ván đã xong
  if (
    !ctx.isSpectator &&
    ctx.selfPlayerId &&
    !next.winnerLabel &&
    next.turnPhase !== 'ENDED' &&
    next.activePlayerId === ctx.selfPlayerId &&
    prev.activePlayerId !== next.activePlayerId
  ) {
    const selfPub = nextById.get(ctx.selfPlayerId);
    if (selfPub?.alive) {
      events.push({
        id: `${next.matchId}::your-turn::${next.turnNumber}`,
        kind: 'CINEMATIC_CUTIN',
        order: 65,
        durationMs: scaleDuration(1150, reduced),
        bannerType: 'YOUR_TURN',
        title: 'LƯỢT CỦA BẠN',
        subtitle:
          selfPub.revealedRoleId === 'gac-truc-ban'
            ? 'Tung xúc xắc hoặc dùng Bước Nhảy Tắt cùng Cụm!'
            : 'Tung xúc xắc 1d6 + 1d4 để bắt đầu hành động!',
        faction: selfPub.revealedFaction,
        roleId: selfPub.revealedRoleId,
        roleName: null,
        portraitSrc: null,
        skillName: null,
        actorId: ctx.selfPlayerId,
      });
    }
  }

  events.sort((a, b) => a.order - b.order);
  return events;
}

/**
 * Bộ theo dõi `VisualEventTracker` bảo đảm mỗi Event ID chỉ phát đúng 1 lần,
 * ngay cả khi reconnect F5 hoặc nhận gói `BG_STATE_SYNC` trùng lặp.
 */
export class VisualEventTracker {
  private matchId = '';
  private baselineGame: BoardGamePublicGameView | null = null;
  private seenIds = new Set<string>();

  resetForMatch(matchId: string): void {
    this.matchId = matchId;
    this.baselineGame = null;
    this.seenIds = new Set(readSeenIdsFromStorage(matchId));
  }

  hasEventBeenSeen(id: string): boolean {
    return this.seenIds.has(id);
  }

  /**
   * Kiểm tra thuần túy (không mutate state) ngay trong lúc render Frame 1
   * xem snapshot mới có phát sinh lượt tung xúc xắc chưa chạy hay không.
   * Trả về `null` khi chưa có baseline (mount / F5 reconnect) hoặc đã thấy ID này.
   */
  peekPendingDiceRoll(
    nextGame: BoardGamePublicGameView,
    reducedMotion = false,
  ): DiceRollVisualEvent | null {
    if (!this.baselineGame || this.matchId !== nextGame.matchId) {
      return null;
    }
    const prevSig = computeDiceSig(this.baselineGame);
    const nextSig = computeDiceSig(nextGame);
    if (!nextGame.lastDiceRoll || !nextSig || nextSig === prevSig) {
      return null;
    }
    const ev = buildDiceRollEventFromSnapshot(nextGame, reducedMotion);
    if (!ev || this.seenIds.has(ev.id)) {
      return null;
    }
    return ev;
  }

  /**
   * Đánh dấu event xúc xắc của snapshot hiện tại đã xử lý khi người chơi bấm Skip.
   */
  acknowledgeSnapshotDice(publicGame: BoardGamePublicGameView | null): void {
    if (!publicGame || this.matchId !== publicGame.matchId) return;
    const evId = computeDiceEventId(publicGame);
    if (evId && !this.seenIds.has(evId)) {
      this.markSeen([evId]);
    }
    this.baselineGame = publicGame;
  }

  /**
   * Kiểm tra thuần túy (Frame 1) xem trận vừa chuyển từ PLAYING -> FINISHED
   * và cần giữ MatchResult lại chờ Victory/Defeat Cinematic chạy xong.
   * Trả về `false` khi mới vào/F5 reconnect lên trận đã FINISHED.
   */
  peekPendingVictory(nextGame: BoardGamePublicGameView): boolean {
    if (!this.baselineGame || this.matchId !== nextGame.matchId) {
      return false;
    }
    if (this.baselineGame.winnerLabel || !nextGame.winnerLabel) {
      return false;
    }
    const evId = computeVictoryEventId(nextGame);
    if (!evId || this.seenIds.has(evId)) {
      return false;
    }
    return true;
  }

  /**
   * Đánh dấu event kết thúc trận hiện tại đã xử lý khi bấm Skip.
   */
  acknowledgeSnapshotVictory(publicGame: BoardGamePublicGameView | null): void {
    if (!publicGame || this.matchId !== publicGame.matchId) return;
    const evId = computeVictoryEventId(publicGame);
    if (evId && !this.seenIds.has(evId)) {
      this.markSeen([evId]);
    }
    this.baselineGame = publicGame;
  }

  /**
   * Nạp trạng thái ban đầu (lúc mới vào bàn hoặc khi F5 Reconnect).
   * Không phát lại các event lịch sử đã diễn ra trước khi client kết nối.
   */
  seedBaseline(
    publicGame: BoardGamePublicGameView,
    ctx: ExtractVisualEventsContext,
  ): BoardGameVisualEvent[] {
    if (this.matchId !== publicGame.matchId) {
      this.resetForMatch(publicGame.matchId);
    }
    this.baselineGame = publicGame;

    // Đánh dấu ngay trận đã FINISHED khi F5/reconnect để tuyệt đối không phát lại cinematic
    const existingVictoryId = computeVictoryEventId(publicGame);
    if (existingVictoryId && !this.seenIds.has(existingVictoryId)) {
      this.markSeen([existingVictoryId]);
    }

    const initialEvents: BoardGameVisualEvent[] = [];
    const reduced = Boolean(ctx.reducedMotion);

    // Chỉ chào "LƯỢT CỦA BẠN" ở lượt đầu tiên mới khai trận nếu chưa từng hiện khi F5
    const isFreshOpeningTurn =
      publicGame.turnNumber === 1 &&
      publicGame.turnPhase === 'ROLL_MOVE' &&
      !publicGame.winnerLabel &&
      !ctx.isSpectator &&
      Boolean(ctx.selfPlayerId && publicGame.activePlayerId === ctx.selfPlayerId);

    if (isFreshOpeningTurn) {
      const evId = `${publicGame.matchId}::your-turn::1`;
      if (!this.seenIds.has(evId)) {
        this.markSeen([evId]);
        initialEvents.push({
          id: evId,
          kind: 'CINEMATIC_CUTIN',
          order: 65,
          durationMs: scaleDuration(1150, reduced),
          bannerType: 'YOUR_TURN',
          title: 'LƯỢT CỦA BẠN',
          subtitle: 'Ván đấu bắt đầu — hãy tung xúc xắc 1d6 + 1d4!',
          faction: null,
          roleId: null,
          roleName: null,
          portraitSrc: null,
          skillName: null,
          actorId: ctx.selfPlayerId,
        });
      }
    }

    return initialEvents;
  }

  /**
   * Nhận snapshot mới từ server: tính delta mới, lọc bỏ event đã phát trước đó,
   * cập nhật mốc so sánh và trả về hàng đợi event cần chạy.
   */
  ingestSnapshot(
    nextGame: BoardGamePublicGameView,
    ctx: ExtractVisualEventsContext,
  ): BoardGameVisualEvent[] {
    if (!this.baselineGame || this.matchId !== nextGame.matchId) {
      return this.seedBaseline(nextGame, ctx);
    }
    const prev = this.baselineGame;
    this.baselineGame = nextGame;

    const rawEvents = extractVisualEventsFromDiff(prev, nextGame, ctx);
    const fresh: BoardGameVisualEvent[] = [];
    const freshIds: string[] = [];

    for (const ev of rawEvents) {
      if (this.seenIds.has(ev.id)) continue;
      fresh.push(ev);
      freshIds.push(ev.id);
    }

    if (freshIds.length > 0) {
      this.markSeen(freshIds);
    }
    return fresh;
  }

  private markSeen(ids: readonly string[]): void {
    for (const id of ids) {
      this.seenIds.add(id);
    }
    if (this.matchId) {
      writeSeenIdsToStorage(this.matchId, Array.from(this.seenIds));
    }
  }
}
