'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/BoardGameVfxStage.tsx
// Bộ VFX Dùng Chung cho Bóng Đêm KTX:
// - Hook `useBoardGameVfxQueue` quản lý hàng đợi dựa trên server delta + Skip + Reduced Motion
// - SVG Targeting Reticle (đường nhắm mục tiêu)
// - Canvas 2D Combat VFX (vệt chém, Masamune, đạn Súng Liên Thanh, sét Vy Radio, nổ, phản kích, hồi máu, khiên, cướp)
// - Floating Damage (-5, +2, BLOCK, COUNTER, MISS, STEAL) & Screen Shake
// - Card Draw 3D Flip & Dice Tumble dừng ở đúng kết quả server
// - Cinematic Cut-ins (LƯỢT CỦA BẠN / LỘ DIỆN / TUYỆT KỸ / HẠ GỤC / CHIẾN THẮNG)
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  BoardGameDeckId,
  BoardGameLocationId,
  BoardGamePrivateGameView,
  BoardGamePublicGameView,
} from '@/shared/contracts/boardgame';
import {
  FactionCrestSvg,
  RolePortraitSvg,
} from './BoardGameArt';
import type { ResolvedGraphicsProfile } from './graphics-settings';
import {
  MidnightDicePair3D,
  buildDiceRollTimeline,
  buildDirectMoveTimeline,
  isDiceResultRevealed,
  type DiceRollChoreographyTimeline,
  type DiceRollStage,
} from './MidnightDice3D';
import {
  CARD_BACK_SECRET_TITLES,
  MIDNIGHT_CARD_ART,
  MIDNIGHT_CARD_BACK_ART,
  MIDNIGHT_DECK_TOKENS,
  MIDNIGHT_FACTION_TOKENS,
} from './midnight-noir-tokens';
import {
  playCardFlip,
  playSoundForVisualEvent,
  stopAllBoardGameSounds,
} from './sound';
import {
  VisualEventTracker,
  type BoardGameVisualEvent,
  type CardDrawVisualEvent,
  type CinematicCutInVisualEvent,
  type CombatVfxVisualEvent,
  type DiceRollVisualEvent,
  type FloatingTextVisualEvent,
  type ScreenShakeLevel,
} from './vfx-queue';

interface Point2D {
  x: number;
  y: number;
}

interface ActiveCombatAnim {
  uid: string;
  event: CombatVfxVisualEvent;
  source: Point2D;
  targets: Point2D[];
  startedAt: number;
  durationMs: number;
}

interface ActiveFloatingPopup {
  uid: string;
  event: FloatingTextVisualEvent;
  x: number;
  y: number;
}

function getRelativeCenter(container: HTMLElement, el: Element): Point2D | null {
  const cRect = container.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0 || cRect.width <= 0 || cRect.height <= 0) {
    return null;
  }
  return {
    x: rect.left - cRect.left + rect.width / 2,
    y: rect.top - cRect.top + rect.height / 2,
  };
}

function resolvePlayerAnchor(
  container: HTMLElement | null,
  playerId: string | null,
  fallbackPlayers: readonly { playerId: string }[],
): Point2D {
  if (!container) return { x: 240, y: 180 };
  const cWidth = container.clientWidth || 720;
  const cHeight = container.clientHeight || 480;
  if (playerId) {
    const primary = container.querySelectorAll(`[data-vfx-player="${playerId}"]`);
    for (let i = 0; i < primary.length; i++) {
      const pt = getRelativeCenter(container, primary[i]);
      if (pt) return pt;
    }
    const strip = container.querySelectorAll(`[data-vfx-player-strip="${playerId}"]`);
    for (let i = 0; i < strip.length; i++) {
      const pt = getRelativeCenter(container, strip[i]);
      if (pt) return pt;
    }
  }
  const idx = Math.max(
    0,
    fallbackPlayers.findIndex((p) => p.playerId === playerId),
  );
  const cols = Math.max(1, Math.min(4, fallbackPlayers.length));
  return {
    x: ((idx % cols) + 0.5) * (cWidth / cols),
    y: idx < 4 ? cHeight * 0.42 : cHeight * 0.68,
  };
}

function resolveDeckAnchor(container: HTMLElement | null, deck: BoardGameDeckId): Point2D {
  if (!container) return { x: 320, y: 260 };
  const el = container.querySelector(`[data-vfx-deck="${deck}"]`);
  if (el) {
    const pt = getRelativeCenter(container, el);
    if (pt) return pt;
  }
  const cWidth = container.clientWidth || 720;
  const cHeight = container.clientHeight || 480;
  const offset = deck === 'investigation' ? 0.55 : deck === 'equipment' ? 0.68 : 0.81;
  return { x: cWidth * offset, y: cHeight * 0.62 };
}

function buildLightningPoints(from: Point2D, to: Point2D, seedVal: number, segments = 8): Point2D[] {
  const pts: Point2D[] = [from];
  let s = seedVal || 13;
  for (let i = 1; i < segments; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const t = i / segments;
    const jitter = ((s % 100) / 100 - 0.5) * 44;
    const nx = from.x + (to.x - from.x) * t + jitter;
    const ny = from.y + (to.y - from.y) * t + ((s >> 8) % 18) - 9;
    pts.push({ x: nx, y: ny });
  }
  pts.push(to);
  return pts;
}

function drawCombatAnimation(
  ctx: CanvasRenderingContext2D,
  anim: ActiveCombatAnim,
  nowMs: number,
  reducedMotion: boolean,
  particleScale = 1,
): boolean {
  const elapsed = nowMs - anim.startedAt;
  const p = Math.max(0, Math.min(1, elapsed / Math.max(120, anim.durationMs)));
  if (p >= 1) return false;

  const fade = 1 - p * p;
  const { event: { effect }, source, targets } = anim;

  ctx.save();

  switch (effect) {
    case 'SLASH':
    case 'MASAMUNE_SLASH': {
      const isCursed = effect === 'MASAMUNE_SLASH';
      const primary = isCursed ? '#fb7185' : '#fde047';
      const secondary = isCursed ? '#a855f7' : '#ffffff';
      for (const tgt of targets) {
        const radius = (isCursed ? 48 : 40) * (0.75 + p * 0.35);
        ctx.globalAlpha = fade;
        // Nhát chém chính
        ctx.strokeStyle = primary;
        ctx.lineWidth = isCursed ? 7 : 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(tgt.x, tgt.y, radius, -Math.PI * 0.78, -Math.PI * 0.12 + p * 0.35);
        ctx.stroke();

        ctx.strokeStyle = secondary;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(tgt.x, tgt.y, radius * 0.92, -Math.PI * 0.72, -Math.PI * 0.18 + p * 0.3);
        ctx.stroke();

        // Nhát chéo X cho Masamune
        if (isCursed) {
          ctx.strokeStyle = '#e11d48';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(tgt.x - 32, tgt.y - 28);
          ctx.lineTo(tgt.x + 32, tgt.y + 28);
          ctx.stroke();
        }

        // Tàn lửa văng tại điểm chém (điều chỉnh số hạt theo mức đồ họa High/Balanced/Low)
        const sparkCount = reducedMotion || particleScale <= 0 ? 0 : Math.max(2, Math.round(8 * particleScale));
        if (sparkCount > 0) {
          for (let k = 0; k < sparkCount; k++) {
            const ang = (Math.PI * 2 * k) / sparkCount + p * 1.4;
            const dist = p * (isCursed ? 56 : 42);
            ctx.fillStyle = k % 2 === 0 ? primary : secondary;
            ctx.beginPath();
            ctx.arc(tgt.x + Math.cos(ang) * dist, tgt.y + Math.sin(ang) * dist, 2.5 * fade, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      break;
    }

    case 'SPEAR_THRUST': {
      for (const tgt of targets) {
        const curX = source.x + (tgt.x - source.x) * Math.min(1, p * 1.6);
        const curY = source.y + (tgt.y - source.y) * Math.min(1, p * 1.6);
        ctx.globalAlpha = fade;
        const grad = ctx.createLinearGradient(source.x, source.y, curX, curY);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        grad.addColorStop(0.6, '#38bdf8');
        grad.addColorStop(1, '#fef08a');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(curX, curY);
        ctx.stroke();

        if (p > 0.35) {
          const shockR = 16 + (p - 0.35) * 58;
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2.6 * fade;
          ctx.beginPath();
          ctx.arc(tgt.x, tgt.y, shockR, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      break;
    }

    case 'HANDGUN_SHOT':
    case 'MACHINE_GUN_BARRAGE': {
      const burstCount = effect === 'MACHINE_GUN_BARRAGE' ? 3 : 2;
      targets.forEach((tgt, tIdx) => {
        const delay = effect === 'MACHINE_GUN_BARRAGE' ? tIdx * 0.08 : 0;
        const localP = Math.max(0, Math.min(1, (p - delay) / Math.max(0.25, 1 - delay)));
        if (localP <= 0) return;
        const localFade = 1 - localP * localP;
        ctx.globalAlpha = localFade;

        for (let b = 0; b < burstCount; b++) {
          const offsetAngle = (b - 1) * 8;
          const tail = Math.max(0, localP - 0.35);
          const head = Math.min(1, localP * 1.45);
          const sx = source.x + (tgt.x - source.x) * tail;
          const sy = source.y + (tgt.y - source.y) * tail + offsetAngle;
          const ex = source.x + (tgt.x - source.x) * head;
          const ey = source.y + (tgt.y - source.y) * head + offsetAngle;

          ctx.strokeStyle = b % 2 === 0 ? '#fbbf24' : '#fb7185';
          ctx.lineWidth = 3.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }

        // Tia lửa chạm mục tiêu
        if (localP > 0.45) {
          const impactR = (localP - 0.45) * 72;
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2.4 * localFade;
          ctx.beginPath();
          ctx.arc(tgt.x, tgt.y, impactR, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      break;
    }

    case 'LIGHTNING_STRIKE': {
      targets.forEach((tgt, idx) => {
        ctx.globalAlpha = fade;
        const skyOrigin: Point2D = { x: tgt.x + (idx % 2 === 0 ? -24 : 24), y: Math.max(0, tgt.y - 220) };
        const boltPts = buildLightningPoints(skyOrigin, tgt, Math.floor(nowMs / 45) + idx * 97, 8);

        // Hào quang xanh ngọc + vàng sét Vy Radio
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 9 * fade;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        boltPts.forEach((pt, j) => (j === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
        ctx.stroke();

        ctx.strokeStyle = '#fef9c3';
        ctx.lineWidth = 3 * fade;
        ctx.beginPath();
        boltPts.forEach((pt, j) => (j === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
        ctx.stroke();

        // Quầng nổ mặt đất
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3 * fade;
        ctx.beginPath();
        ctx.arc(tgt.x, tgt.y, 18 + p * 46, 0, Math.PI * 2);
        ctx.stroke();
      });
      break;
    }

    case 'EXPLOSION': {
      for (const tgt of targets) {
        const coreR = 12 + p * 56;
        ctx.globalAlpha = fade * 0.72;
        const rad = ctx.createRadialGradient(tgt.x, tgt.y, 2, tgt.x, tgt.y, coreR);
        rad.addColorStop(0, '#fef08a');
        rad.addColorStop(0.45, '#f97316');
        rad.addColorStop(0.8, 'rgba(225, 29, 72, 0.5)');
        rad.addColorStop(1, 'rgba(225, 29, 72, 0)');
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(tgt.x, tgt.y, coreR, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = fade;
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3 * fade;
        ctx.beginPath();
        ctx.arc(tgt.x, tgt.y, 16 + p * 68, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }

    case 'COUNTER_STRIKE': {
      for (const tgt of targets) {
        const curX = source.x + (tgt.x - source.x) * Math.min(1, p * 1.35);
        const curY = source.y + (tgt.y - source.y) * Math.min(1, p * 1.35);
        ctx.globalAlpha = fade;
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(curX, curY);
        ctx.stroke();

        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(tgt.x, tgt.y, 14 + p * 34, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }

    case 'HEAL_AURA': {
      for (const tgt of targets) {
        ctx.globalAlpha = fade;
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(tgt.x, tgt.y, 14 + p * 36, 0, Math.PI * 2);
        ctx.stroke();

        const healSparkCount = reducedMotion || particleScale <= 0 ? 0 : Math.max(2, Math.round(6 * particleScale));
        if (healSparkCount > 0) {
          for (let i = 0; i < healSparkCount; i++) {
            const ox = (i - (healSparkCount - 1) / 2) * 11;
            const oy = -p * 42 - (i % 2) * 12;
            ctx.fillStyle = i % 2 === 0 ? '#6ee7b7' : '#fef08a';
            ctx.beginPath();
            ctx.arc(tgt.x + ox, tgt.y + oy, 3 * fade, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      break;
    }

    case 'SHIELD_GUARD': {
      for (const tgt of targets) {
        ctx.globalAlpha = fade;
        const r = 24 + p * 18;
        ctx.strokeStyle = '#38bdf8';
        ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const ang = (Math.PI / 3) * k - Math.PI / 2;
          const hx = tgt.x + Math.cos(ang) * r;
          const hy = tgt.y + Math.sin(ang) * r;
          if (k === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 'STEAL_TETHER': {
      for (const tgt of targets) {
        ctx.globalAlpha = fade;
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tgt.x, tgt.y);
        ctx.lineTo(source.x, source.y);
        ctx.stroke();
        ctx.setLineDash([]);

        const orbX = tgt.x + (source.x - tgt.x) * p;
        const orbY = tgt.y + (source.y - tgt.y) * p;
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(orbX, orbY, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }

  ctx.restore();
  return true;
}

export interface UseBoardGameVfxQueueOptions {
  publicGame: BoardGamePublicGameView;
  privateView: BoardGamePrivateGameView | null;
  selfPlayerId: string | null;
  isSpectator: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  reducedMotionOverride?: boolean | null;
  graphicsProfile?: ResolvedGraphicsProfile;
}

export interface BoardGameVfxState {
  activeCombatCount: number;
  floatingPopups: readonly ActiveFloatingPopup[];
  activeDiceRoll: DiceRollVisualEvent | null;
  diceRollStage: DiceRollStage;
  isDiceSettled: boolean;
  activeMoveTimeline: DiceRollChoreographyTimeline | null;
  highlightedLocationId: BoardGameLocationId | null;
  skipGeneration: number;
  activeCardDraw: {
    event: CardDrawVisualEvent;
    revealedFace: boolean;
  } | null;
  activeCutIn: CinematicCutInVisualEvent | null;
  screenShake: ScreenShakeLevel;
  reducedMotion: boolean;
  enableBackdropBlur: boolean;
  enableFoil: boolean;
  qualityTier: 'high' | 'balanced' | 'low';
  hasActiveEffects: boolean;
  combatLayerRef: React.RefObject<HTMLCanvasElement>;
  skipAllAnimations: () => void;
  enqueueEvents: (events: readonly BoardGameVisualEvent[]) => void;
  setReducedMotionOverride: (val: boolean | null) => void;
}

export function useBoardGameVfxQueue({
  publicGame,
  privateView,
  selfPlayerId,
  isSpectator,
  containerRef,
  reducedMotionOverride: externalReducedOverride,
  graphicsProfile,
}: UseBoardGameVfxQueueOptions): BoardGameVfxState {
  const trackerRef = useRef<VisualEventTracker>(new VisualEventTracker());
  const seenMatchRef = useRef<string>('');
  const combatLayerRef = useRef<HTMLCanvasElement>(null);
  const activeCombatAnimsRef = useRef<ActiveCombatAnim[]>([]);
  const rafRef = useRef<number | null>(null);

  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [localReducedOverride, setLocalReducedOverride] = useState<boolean | null>(null);
  const reducedMotion =
    externalReducedOverride ??
    graphicsProfile?.reducedMotion ??
    localReducedOverride ??
    systemReducedMotion;

  const qualityTier = graphicsProfile?.tier ?? 'high';
  const pawnGlideDurationMs =
    graphicsProfile?.pawnGlideDurationMs ??
    (qualityTier === 'low' ? 0 : qualityTier === 'balanced' ? 340 : 520);
  const dprCap = graphicsProfile?.dprCap ?? 2;
  const particleScale = graphicsProfile?.particleScale ?? (reducedMotion ? 0.25 : 1);
  const enableScreenShake = graphicsProfile
    ? graphicsProfile.enableScreenShake
    : !reducedMotion;
  const enableBackdropBlur = graphicsProfile?.enableBackdropBlur ?? true;
  const enableFoil = graphicsProfile?.enableFoil ?? !reducedMotion;

  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const qualityTierRef = useRef(qualityTier);
  qualityTierRef.current = qualityTier;
  const pawnGlideDurationMsRef = useRef(pawnGlideDurationMs);
  pawnGlideDurationMsRef.current = pawnGlideDurationMs;
  const dprCapRef = useRef(dprCap);
  dprCapRef.current = dprCap;
  const particleScaleRef = useRef(particleScale);
  particleScaleRef.current = particleScale;
  const enableScreenShakeRef = useRef(enableScreenShake);
  enableScreenShakeRef.current = enableScreenShake;

  const [activeCombatCount, setActiveCombatCount] = useState(0);
  const [floatingPopups, setFloatingPopups] = useState<ActiveFloatingPopup[]>([]);
  const [activeDiceRoll, setActiveDiceRoll] = useState<DiceRollVisualEvent | null>(null);
  const [diceRollStage, setDiceRollStage] = useState<DiceRollStage>('idle');
  const [activeMoveTimeline, setActiveMoveTimeline] =
    useState<DiceRollChoreographyTimeline | null>(null);
  const [highlightedLocationId, setHighlightedLocationId] = useState<BoardGameLocationId | null>(null);
  const [skipGeneration, setSkipGeneration] = useState(0);
  const activeDiceIdRef = useRef<string | null>(null);
  const highlightTokenRef = useRef<number>(0);
  const prevPlayerLocationsRef = useRef<Map<string, BoardGameLocationId>>(new Map());
  const publicGameRef = useRef(publicGame);
  publicGameRef.current = publicGame;
  const [activeCardDraw, setActiveCardDraw] = useState<{
    event: CardDrawVisualEvent;
    revealedFace: boolean;
  } | null>(null);
  const [cutInQueue, setCutInQueue] = useState<CinematicCutInVisualEvent[]>([]);
  const [activeCutIn, setActiveCutIn] = useState<CinematicCutInVisualEvent | null>(null);
  const [screenShake, setScreenShake] = useState<ScreenShakeLevel>('none');

  const timeoutsRef = useRef<Set<number>>(new Set());
  const playersSnapshotRef = useRef(publicGame.players);
  playersSnapshotRef.current = publicGame.players;

  useEffect(() => {
    if (!enableScreenShake) {
      setScreenShake('none');
    }
  }, [enableScreenShake]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReducedMotion(mql.matches);
    const handler = (ev: MediaQueryListEvent) => setSystemReducedMotion(ev.matches);
    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, []);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timeoutsRef.current.delete(id);
      fn();
    }, ms);
    timeoutsRef.current.add(id);
    return id;
  }, []);

  const clearAllTimers = useCallback(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current.clear();
  }, []);

  const ensureCanvasLoop = useCallback(() => {
    if (rafRef.current !== null) return;
    const step = () => {
      const canvas = combatLayerRef.current;
      const container = containerRef.current;
      const anims = activeCombatAnimsRef.current;
      if (!canvas || !container || anims.length === 0) {
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
        rafRef.current = null;
        setActiveCombatCount(0);
        return;
      }

      const dpr = Math.min(dprCapRef.current, window.devicePixelRatio || 1);
      const cw = container.clientWidth || 720;
      const ch = container.clientHeight || 480;
      const targetW = Math.max(1, Math.round(cw * dpr));
      const targetH = Math.max(1, Math.round(ch * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, cw, ch);
        const now = performance.now();
        const remaining: ActiveCombatAnim[] = [];
        for (const a of anims) {
          if (drawCombatAnimation(ctx, a, now, reducedMotionRef.current, particleScaleRef.current)) {
            remaining.push(a);
          }
        }
        ctx.restore();
        activeCombatAnimsRef.current = remaining;
        setActiveCombatCount(remaining.length);
      }

      if (activeCombatAnimsRef.current.length > 0) {
        rafRef.current = window.requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        setActiveCombatCount(0);
      }
    };
    rafRef.current = window.requestAnimationFrame(step);
  }, [containerRef]);

  const skipAllAnimations = useCallback(() => {
    clearAllTimers();
    stopAllBoardGameSounds();
    trackerRef.current.acknowledgeSnapshotDice(publicGameRef.current);
    activeCombatAnimsRef.current = [];
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const canvas = combatLayerRef.current;
    if (canvas) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setActiveCombatCount(0);
    setFloatingPopups([]);
    activeDiceIdRef.current = null;
    highlightTokenRef.current += 1;
    setActiveDiceRoll(null);
    setDiceRollStage('idle');
    setActiveMoveTimeline(null);
    setHighlightedLocationId(null);
    setSkipGeneration((n) => n + 1);
    setActiveCardDraw(null);
    setCutInQueue([]);
    setActiveCutIn(null);
    setScreenShake('none');
  }, [clearAllTimers]);

  // Cut-in queue pump: phát lần lượt từng banner điện ảnh đồng bộ âm thanh theo event.id
  useEffect(() => {
    if (activeCutIn || cutInQueue.length === 0) return;
    const [nextBanner, ...rest] = cutInQueue;
    setActiveCutIn(nextBanner);
    setCutInQueue(rest);
    playSoundForVisualEvent(nextBanner);
    scheduleTimeout(() => {
      setActiveCutIn((curr) => (curr?.id === nextBanner.id ? null : curr));
    }, nextBanner.durationMs);
  }, [activeCutIn, cutInQueue, scheduleTimeout]);

  const enqueueEvents = useCallback(
    (events: readonly BoardGameVisualEvent[]) => {
      if (events.length === 0) return;
      const container = containerRef.current;
      const players = playersSnapshotRef.current;
      const newCutIns: CinematicCutInVisualEvent[] = [];

      for (const ev of events) {
        switch (ev.kind) {
          case 'DICE_ROLL': {
            const hasDestinationMove = Boolean(
              ev.diceKind === 'move' &&
                ev.resolvedLocation &&
                !ev.rerollRequired &&
                !ev.freeChoice,
            );
            const timeline = buildDiceRollTimeline({
              diceKind: ev.diceKind,
              qualityTier: qualityTierRef.current,
              pawnGlideDurationMs: pawnGlideDurationMsRef.current,
              reducedMotion: reducedMotionRef.current,
              hasDestinationMove,
            });
            activeDiceIdRef.current = ev.id;
            playSoundForVisualEvent({
              ...ev,
              durationMs: timeline.diceOverlayEndMs,
              settleAtMs: timeline.diceSettleAtMs,
            });
            setActiveDiceRoll(ev);
            setActiveMoveTimeline(timeline);

            const triggerDestHighlight = () => {
              if (!hasDestinationMove || !ev.resolvedLocation) return;
              const dest = ev.resolvedLocation;
              const hlToken = ++highlightTokenRef.current;
              setHighlightedLocationId(dest);
              const holdDuration = Math.max(
                0,
                timeline.destHighlightEndMs - timeline.destHighlightStartMs,
              );
              scheduleTimeout(() => {
                if (highlightTokenRef.current === hlToken) {
                  setHighlightedLocationId((cur) => (cur === dest ? null : cur));
                }
              }, holdDuration);
            };

            if (timeline.diceSettleAtMs <= 0) {
              setDiceRollStage('settled');
              triggerDestHighlight();
            } else {
              highlightTokenRef.current += 1;
              setHighlightedLocationId(null);
              setDiceRollStage('windup');
              scheduleTimeout(() => {
                if (activeDiceIdRef.current === ev.id) setDiceRollStage('tumble');
              }, timeline.windupEndMs);
              scheduleTimeout(() => {
                if (activeDiceIdRef.current === ev.id) setDiceRollStage('decelerate');
              }, timeline.tumbleEndMs);
              scheduleTimeout(() => {
                if (activeDiceIdRef.current === ev.id) {
                  setDiceRollStage('settled');
                  triggerDestHighlight();
                }
              }, timeline.diceSettleAtMs);
            }

            scheduleTimeout(() => {
              if (activeDiceIdRef.current === ev.id) {
                activeDiceIdRef.current = null;
                setDiceRollStage('idle');
                setActiveMoveTimeline(null);
              }
              setActiveDiceRoll((curr) => (curr?.id === ev.id ? null : curr));
            }, timeline.diceOverlayEndMs);
            break;
          }
          case 'CARD_DRAW': {
            playSoundForVisualEvent(ev);
            setActiveCardDraw({ event: ev, revealedFace: false });
            if (ev.showFront) {
              scheduleTimeout(() => {
                playCardFlip();
                setActiveCardDraw((curr) =>
                  curr?.event.id === ev.id ? { ...curr, revealedFace: true } : curr,
                );
              }, Math.min(240, Math.round(ev.durationMs * 0.28)));
            }
            scheduleTimeout(() => {
              setActiveCardDraw((curr) => (curr?.event.id === ev.id ? null : curr));
            }, ev.durationMs);
            break;
          }
          case 'COMBAT_VFX': {
            const source = resolvePlayerAnchor(container, ev.sourcePlayerId, players);
            const targets = (ev.targetPlayerIds.length > 0 ? ev.targetPlayerIds : [ev.sourcePlayerId ?? '']).map(
              (tid) => resolvePlayerAnchor(container, tid, players),
            );
            activeCombatAnimsRef.current.push({
              uid: ev.id,
              event: ev,
              source,
              targets,
              startedAt: performance.now(),
              durationMs: ev.durationMs,
            });
            setActiveCombatCount(activeCombatAnimsRef.current.length);
            ensureCanvasLoop();

            if (enableScreenShakeRef.current && ev.shake !== 'none') {
              setScreenShake(ev.shake);
              scheduleTimeout(() => setScreenShake('none'), ev.shake === 'heavy' ? 290 : 210);
            }

            playSoundForVisualEvent(ev);
            break;
          }
          case 'FLOATING_TEXT': {
            const pt = resolvePlayerAnchor(container, ev.targetPlayerId, players);
            const jitterX = ((ev.targetPlayerId.charCodeAt(ev.targetPlayerId.length - 1) || 0) % 3 - 1) * 8;
            const uid = ev.id;
            const spawnMs = reducedMotionRef.current ? 0 : 90;
            scheduleTimeout(() => {
              setFloatingPopups((prev) => {
                const sameTargetCount = prev.filter(
                  (item) => item.event.targetPlayerId === ev.targetPlayerId,
                ).length;
                const variantOffsetY = ev.variant === 'counter' ? -24 : 0;
                const stackOffsetY = -sameTargetCount * 24;
                const stackOffsetX = (sameTargetCount % 2 === 1 ? 18 : 0);
                return [
                  ...prev.slice(-10),
                  {
                    uid,
                    event: ev,
                    x: pt.x + jitterX + stackOffsetX,
                    y: pt.y - 14 + variantOffsetY + stackOffsetY,
                  },
                ];
              });
              scheduleTimeout(() => {
                setFloatingPopups((prev) => prev.filter((p) => p.uid !== uid));
              }, ev.durationMs);
            }, spawnMs);
            break;
          }
          case 'CINEMATIC_CUTIN': {
            newCutIns.push(ev);
            break;
          }
        }
      }

      if (newCutIns.length > 0) {
        setCutInQueue((prev) => [...prev.slice(-6), ...newCutIns]);
      }
    },
    [containerRef, ensureCanvasLoop, scheduleTimeout],
  );

  // Phát hiện delta từ mỗi bản publicGame mới
  useEffect(() => {
    const tracker = trackerRef.current;
    const ctx = {
      selfPlayerId,
      isSpectator,
      privateView,
      reducedMotion,
    };

    if (seenMatchRef.current !== publicGame.matchId) {
      seenMatchRef.current = publicGame.matchId;
      skipAllAnimations();
      prevPlayerLocationsRef.current = new Map(
        publicGame.players.map((p) => [p.playerId, p.location]),
      );
      const opening = tracker.seedBaseline(publicGame, ctx);
      if (opening.length > 0) {
        enqueueEvents(opening);
      }
      return;
    }

    const fresh = tracker.ingestSnapshot(publicGame, ctx);
    if (fresh.length > 0) {
      enqueueEvents(fresh);
    }

    // Nếu người chơi di chuyển không qua event DICE_ROLL mới (ví dụ chọn ô sau tổng 7 / La Bàn)
    // thì kích hoạt highlight đích theo timeline chọn trực tiếp đồng bộ với FLIP pawn glide.
    if (!fresh.some((e) => e.kind === 'DICE_ROLL')) {
      const movedPlayer = publicGame.players.find((p) => {
        const prevLoc = prevPlayerLocationsRef.current.get(p.playerId);
        return prevLoc !== undefined && prevLoc !== p.location;
      });
      if (movedPlayer) {
        const directTimeline = buildDirectMoveTimeline({
          pawnGlideDurationMs: pawnGlideDurationMsRef.current,
          reducedMotion,
        });
        const dest = movedPlayer.location;
        const hlToken = ++highlightTokenRef.current;
        setHighlightedLocationId(dest);
        scheduleTimeout(() => {
          if (highlightTokenRef.current === hlToken) {
            setHighlightedLocationId((cur) => (cur === dest ? null : cur));
          }
        }, directTimeline.destHighlightEndMs);
      }
    }

    prevPlayerLocationsRef.current = new Map(
      publicGame.players.map((p) => [p.playerId, p.location]),
    );
  }, [
    publicGame,
    privateView,
    selfPlayerId,
    isSpectator,
    reducedMotion,
    enqueueEvents,
    scheduleTimeout,
    skipAllAnimations,
  ]);

  useEffect(() => {
    const canvas = combatLayerRef.current;
    return () => {
      clearAllTimers();
      activeCombatAnimsRef.current = [];
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Giải phóng bộ nhớ đệm GPU của Canvas 2D khi rời bàn chơi
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
    };
  }, [clearAllTimers]);

  // Suy xuất đồng bộ ngay trong frame render đầu tiên sau snapshot mới:
  // ngăn GameBoard lóe kết quả server trước khi useEffect khởi tạo animation xúc xắc.
  const pendingDiceRoll =
    seenMatchRef.current === publicGame.matchId
      ? trackerRef.current.peekPendingDiceRoll(publicGame, reducedMotion)
      : null;
  const effectiveActiveDiceRoll = pendingDiceRoll ?? activeDiceRoll;
  const effectiveDiceRollStage: DiceRollStage = pendingDiceRoll
    ? reducedMotion
      ? 'settled'
      : 'windup'
    : activeDiceRoll
      ? reducedMotion && !isDiceResultRevealed(diceRollStage)
        ? 'settled'
        : diceRollStage
      : 'idle';
  const effectiveIsDiceSettled =
    !effectiveActiveDiceRoll || isDiceResultRevealed(effectiveDiceRollStage);
  const effectiveHighlightedLocationId =
    pendingDiceRoll && !reducedMotion ? null : highlightedLocationId;

  const hasActiveEffects =
    activeCombatCount > 0 ||
    floatingPopups.length > 0 ||
    Boolean(effectiveActiveDiceRoll) ||
    Boolean(effectiveHighlightedLocationId) ||
    Boolean(activeCardDraw) ||
    Boolean(activeCutIn) ||
    cutInQueue.length > 0;

  return {
    activeCombatCount,
    floatingPopups,
    activeDiceRoll: effectiveActiveDiceRoll,
    diceRollStage: effectiveDiceRollStage,
    isDiceSettled: effectiveIsDiceSettled,
    activeMoveTimeline,
    highlightedLocationId: effectiveHighlightedLocationId,
    skipGeneration,
    activeCardDraw,
    activeCutIn,
    screenShake,
    reducedMotion,
    enableBackdropBlur,
    enableFoil,
    qualityTier,
    hasActiveEffects,
    combatLayerRef,
    skipAllAnimations,
    enqueueEvents,
    setReducedMotionOverride: setLocalReducedOverride,
  };
}

export interface BoardGameVfxStageProps {
  vfx: BoardGameVfxState;
  containerRef: React.RefObject<HTMLDivElement>;
  publicGame: BoardGamePublicGameView;
  sourcePlayerId: string | null;
  selectedTargetId: string | null;
  targetingTone?: 'hostile' | 'heal';
}

export const BoardGameVfxStage = React.memo(function BoardGameVfxStage({
  vfx,
  containerRef,
  publicGame,
  sourcePlayerId,
  selectedTargetId,
  targetingTone = 'hostile',
}: BoardGameVfxStageProps) {
  const [targetLine, setTargetLine] = useState<{ from: Point2D; to: Point2D } | null>(null);
  const playersRef = useRef(publicGame.players);
  playersRef.current = publicGame.players;

  const playersLocationSig = useMemo(
    () => publicGame.players.map((p) => `${p.playerId}:${p.location}:${p.alive ? 1 : 0}`).join('|'),
    [publicGame.players],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !selectedTargetId || !sourcePlayerId || selectedTargetId === sourcePlayerId) {
      setTargetLine(null);
      return;
    }
    const updateLine = () => {
      const from = resolvePlayerAnchor(container, sourcePlayerId, playersRef.current);
      const to = resolvePlayerAnchor(container, selectedTargetId, playersRef.current);
      setTargetLine({ from, to });
    };
    updateLine();
    window.addEventListener('resize', updateLine);
    return () => window.removeEventListener('resize', updateLine);
  }, [containerRef, selectedTargetId, sourcePlayerId, playersLocationSig]);

  const cutIn = vfx.activeCutIn;
  const cutInTheme = cutIn?.faction ? MIDNIGHT_FACTION_TOKENS[cutIn.faction] : null;
  const cutInAccent =
    cutInTheme?.primaryHex ??
    (cutIn?.bannerType === 'VICTORY'
      ? '#fbbf24'
      : cutIn?.bannerType === 'ELIMINATION'
        ? '#f43f5e'
        : '#38bdf8');
  const cutInSecondary = cutInTheme?.secondaryHex ?? '#fde68a';
  const blurCls = vfx.enableBackdropBlur ? 'backdrop-blur-md' : '';

  return (
    <div
      data-testid="bg-vfx-stage"
      data-quality-tier={vfx.qualityTier}
      data-reduced-motion={String(vfx.reducedMotion)}
      className="pointer-events-none absolute inset-0 z-[48] overflow-hidden"
    >
      {/* LỚP 1: SVG ĐƯỜNG NHẮM MỤC TIÊU */}
      {targetLine && (
        <svg
          data-testid="bg-vfx-targeting-line"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="bg-vfx-arrow"
              markerWidth="10"
              markerHeight="10"
              refX="7"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 8 3.5, 0 7"
                fill={targetingTone === 'heal' ? '#34d399' : '#fb7185'}
              />
            </marker>
          </defs>
          <path
            d={`M ${targetLine.from.x} ${targetLine.from.y} Q ${(targetLine.from.x + targetLine.to.x) / 2} ${Math.min(targetLine.from.y, targetLine.to.y) - 42} ${targetLine.to.x} ${targetLine.to.y}`}
            fill="none"
            stroke={targetingTone === 'heal' ? '#34d399' : '#fb7185'}
            strokeWidth="3"
            strokeDasharray="7 5"
            strokeOpacity="0.88"
            markerEnd="url(#bg-vfx-arrow)"
          />
          <circle
            cx={targetLine.to.x}
            cy={targetLine.to.y}
            r="16"
            fill="none"
            stroke={targetingTone === 'heal' ? '#6ee7b7' : '#fda4af'}
            strokeWidth="2.2"
            strokeDasharray="4 3"
          />
        </svg>
      )}

      {/* LỚP 2: CANVAS 2D COMBAT PARTICLES & BEAMS */}
      <canvas
        ref={vfx.combatLayerRef}
        data-testid="bg-vfx-combat-canvas"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* LỚP 3: FLOATING DAMAGE / HEAL / BLOCK / COUNTER */}
      {vfx.floatingPopups.map((pop) => {
        const meta =
          pop.event.variant === 'damage'
            ? {
                animCls: 'bg-vfx-float-damage',
                pillCls:
                  'border-rose-400/80 bg-gradient-to-b from-rose-950/95 to-slate-950/95 text-rose-200 shadow-[0_6px_18px_rgba(225,29,72,0.55)]',
                icon: '💥',
                sizeCls: 'text-xl sm:text-2xl px-2.5 py-0.5',
              }
            : pop.event.variant === 'heal'
              ? {
                  animCls: 'bg-vfx-float-heal',
                  pillCls:
                    'border-emerald-300/85 bg-gradient-to-b from-emerald-950/95 to-slate-950/95 text-emerald-200 shadow-[0_6px_18px_rgba(16,185,129,0.5)]',
                  icon: '💚',
                  sizeCls: 'text-lg sm:text-xl px-2.5 py-0.5',
                }
              : pop.event.variant === 'block'
                ? {
                    animCls: 'bg-vfx-float-block',
                    pillCls:
                      'border-sky-300/85 bg-gradient-to-b from-sky-950/95 to-slate-950/95 text-sky-100 shadow-[0_6px_18px_rgba(56,189,248,0.5)]',
                    icon: '🛡️',
                    sizeCls: 'text-base sm:text-lg px-2.5 py-0.5 uppercase tracking-wider',
                  }
                : pop.event.variant === 'counter'
                  ? {
                      animCls: 'bg-vfx-float-counter',
                      pillCls:
                        'border-fuchsia-400/90 bg-gradient-to-r from-purple-950/95 via-rose-950/95 to-slate-950/95 text-amber-200 shadow-[0_6px_22px_rgba(168,85,247,0.6)]',
                      icon: '⚔️',
                      sizeCls: 'text-base sm:text-lg px-2.5 py-0.5 uppercase tracking-wider',
                    }
                  : pop.event.variant === 'steal'
                    ? {
                        animCls: 'bg-vfx-float-pop',
                        pillCls:
                          'border-amber-300/85 bg-amber-950/95 text-amber-200 shadow-[0_6px_18px_rgba(245,158,11,0.5)]',
                        icon: '🧲',
                        sizeCls: 'text-base sm:text-lg px-2.5 py-0.5 uppercase tracking-wider',
                      }
                    : {
                        animCls: 'bg-vfx-float-pop',
                        pillCls: 'border-slate-500/70 bg-slate-950/90 text-slate-300',
                        icon: '💨',
                        sizeCls: 'text-base sm:text-lg px-2 py-0.5',
                      };
        return (
          <div
            key={pop.uid}
            data-testid="bg-vfx-floating-popup"
            data-variant={pop.event.variant}
            data-target-player={pop.event.targetPlayerId}
            style={{ left: pop.x, top: pop.y }}
            className={`pointer-events-none absolute z-20 -translate-x-1/2 font-black tracking-tight tabular-nums ${
              vfx.reducedMotion ? '' : meta.animCls
            }`}
          >
            <span
              className={`inline-flex items-center gap-1 rounded-xl border ${meta.sizeCls} ${meta.pillCls}`}
            >
              <span aria-hidden="true" className="text-sm sm:text-base leading-none">
                {meta.icon}
              </span>
              <span>{pop.event.label}</span>
            </span>
          </div>
        );
      })}

      {/* LỚP 4A: XÚC XẮC 3D LĂN -> GIẢM TỐC -> CHỐT ĐÚNG KẾT QUẢ SERVER */}
      {vfx.activeDiceRoll && (
        <div
          data-testid="bg-vfx-dice-overlay"
          data-dice-stage={vfx.diceRollStage}
          data-dice-settled={String(vfx.isDiceSettled)}
          className="pointer-events-none absolute inset-x-0 bottom-20 flex justify-center px-3"
        >
          <div
            className={`flex items-center gap-3.5 rounded-2xl border px-4 py-3 shadow-2xl transition-colors duration-200 ${blurCls} ${
              !vfx.isDiceSettled
                ? 'border-indigo-400/70 bg-slate-950/95 text-slate-100'
                : vfx.activeDiceRoll.freeChoice
                  ? 'border-amber-300/90 bg-amber-950/95 text-amber-100 shadow-[0_14px_34px_rgba(251,191,36,0.35)]'
                  : vfx.activeDiceRoll.rerollRequired
                    ? 'border-orange-400/90 bg-orange-950/95 text-orange-100'
                    : 'border-emerald-400/80 bg-slate-900/95 text-white shadow-[0_14px_32px_rgba(16,185,129,0.25)]'
            }`}
          >
            <MidnightDicePair3D
              d6={vfx.activeDiceRoll.d6}
              d4={vfx.activeDiceRoll.d4}
              stage={vfx.diceRollStage}
              size={44}
              enable3D={vfx.qualityTier !== 'low' && !vfx.reducedMotion}
            />
            <div className="min-w-0 text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                {vfx.activeDiceRoll.actorName} ·{' '}
                {vfx.activeDiceRoll.diceKind === 'attack' ? 'Xúc xắc tấn công' : 'Xúc xắc di chuyển'}
              </p>
              {vfx.isDiceSettled ? (
                <p className="mt-0.5 text-sm sm:text-base font-black text-white">
                  {vfx.activeDiceRoll.diceKind === 'attack'
                    ? `Kết quả: |${vfx.activeDiceRoll.d6} - ${vfx.activeDiceRoll.d4}| = ${vfx.activeDiceRoll.total}`
                    : `Tổng: ${vfx.activeDiceRoll.d6} + ${vfx.activeDiceRoll.d4} = ${vfx.activeDiceRoll.total}`}
                  {vfx.activeDiceRoll.freeChoice ? ' ✨ CHỌN TỰ DO!' : ''}
                  {vfx.activeDiceRoll.rerollRequired ? ' 🔁 ĐỔ LẠI!' : ''}
                </p>
              ) : (
                <p className="mt-0.5 text-sm font-black text-amber-200">
                  🎲 Đang tung xúc xắc...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LỚP 4B: CARD DRAW / 3D FLIP OVERLAY (TÔN TRỌNG BẢO MẬT MẶT BÀI) */}
      {vfx.activeCardDraw && (() => {
        const { event, revealedFace } = vfx.activeCardDraw;
        const deckTok = MIDNIGHT_DECK_TOKENS[event.deck];
        const canFlipFront = event.showFront && revealedFace;
        const artSrc = event.cardId ? MIDNIGHT_CARD_ART[event.cardId] ?? null : null;
        return (
          <div
            data-testid="bg-vfx-card-draw"
            data-show-front={String(event.showFront)}
            className="pointer-events-none absolute inset-0 flex items-center justify-center p-4"
          >
            <div className="mn-card-perspective w-36 sm:w-44 aspect-[2/3]">
              <div
                className="mn-card-flip-stage relative h-full w-full rounded-2xl shadow-2xl"
                style={{ transform: canFlipFront ? 'rotateY(0deg)' : 'rotateY(180deg)' }}
              >
                {/* Mặt trước (chỉ mở nếu server/chủ sở hữu cho phép thấy) */}
                <div
                  className="mn-card-face absolute inset-0 overflow-hidden rounded-2xl p-[2px]"
                  style={{ background: deckTok.frameGradientCss }}
                >
                  <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[14px] bg-slate-950 p-2.5">
                    {artSrc && (
                      <img
                        src={artSrc}
                        alt={event.cardTitle ?? deckTok.label}
                        className="absolute inset-0 h-full w-full object-cover opacity-85"
                      />
                    )}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-slate-950/95"
                    />
                    <span className={`relative z-10 w-fit rounded-full border px-2 py-0.5 text-[9px] font-black ${deckTok.badgeClass}`}>
                      {deckTok.label}
                    </span>
                    <div className="relative z-10 mt-auto">
                      {event.autoEquipped && (
                        <p className="text-[9px] font-extrabold uppercase text-amber-300">
                          ⚡ Trang bị ngay
                        </p>
                      )}
                      <p className="text-xs font-black text-white leading-tight">
                        {event.cardTitle ?? deckTok.label}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mặt lưng kín (dùng cho bài chưa lật / người ngoài nhìn) */}
                <div
                  className="mn-card-face mn-card-face-back absolute inset-0 overflow-hidden rounded-2xl p-[2px]"
                  style={{ background: deckTok.frameGradientCss }}
                >
                  <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[14px] bg-slate-950 p-2.5">
                    <img
                      src={MIDNIGHT_CARD_BACK_ART}
                      alt="Mặt lưng thẻ rút"
                      className="absolute inset-0 h-full w-full object-cover opacity-85"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 opacity-75"
                      style={{ background: deckTok.backGradientCss }}
                    />
                    <span className={`relative z-10 w-fit rounded-full border px-2 py-0.5 text-[9px] font-black ${deckTok.badgeClass}`}>
                      {deckTok.label}
                    </span>
                    <div className="relative z-10 mt-auto rounded-lg bg-slate-950/90 p-2 text-center border border-white/15">
                      <p className="text-[10px] font-black text-white">
                        {CARD_BACK_SECRET_TITLES[event.deck]}
                      </p>
                      <p className="text-[9px] text-slate-300">{event.actorName} vừa rút</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* LỚP 5: CINEMATIC CUT-IN OVERLAY (LỘ DIỆN / TUYỆT KỸ / LƯỢT CỦA BẠN / HẠ GỤC / CHIẾN THẮNG) */}
      {cutIn && (
        <div
          data-testid="bg-vfx-cutin"
          data-banner-type={cutIn.bannerType}
          className="pointer-events-none absolute inset-x-0 top-14 sm:top-20 z-30 flex justify-center px-3"
        >
          <div
            className={`relative flex w-full max-w-2xl items-center gap-3 sm:gap-4 overflow-hidden rounded-2xl border-2 bg-slate-950/95 px-4 py-3 shadow-2xl ${blurCls} ${
              vfx.reducedMotion ? '' : 'bg-vfx-cutin-enter'
            }`}
            style={{
              borderColor: cutInAccent,
              boxShadow: `0 20px 50px -10px ${cutInAccent}88`,
            }}
          >
            {/* Vệt chéo ánh sáng Anime Noir nền */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -left-10 w-44 -skew-x-12 opacity-25"
              style={{
                background: `linear-gradient(135deg, ${cutInAccent}, ${cutInSecondary})`,
              }}
            />

            {/* Chân dung LỚN khi là vai đã lộ diện / Tuyệt kỹ / Hạ gục */}
            {cutIn.roleId ? (
              <div
                className="relative z-10 h-20 w-14 sm:h-24 sm:w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-900 shadow-lg"
                style={{ borderColor: cutInSecondary }}
              >
                {cutIn.portraitSrc ? (
                  <img
                    src={cutIn.portraitSrc}
                    alt={cutIn.roleName ?? cutIn.title}
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <RolePortraitSvg roleId={cutIn.roleId} faction={cutIn.faction} size={52} />
                  </div>
                )}
              </div>
            ) : (
              <div className="relative z-10 shrink-0">
                <FactionCrestSvg faction={cutIn.faction} size={42} />
              </div>
            )}

            <div className="relative z-10 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-md px-2 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-950"
                  style={{ backgroundColor: cutInSecondary }}
                >
                  {cutIn.title}
                </span>
                {cutIn.skillName && (
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wide text-white">
                    ✦ {cutIn.skillName}
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-sm sm:text-lg font-black text-white">
                {cutIn.subtitle}
              </p>
              {cutIn.roleName && (
                <p className="text-[11px] font-bold" style={{ color: cutInSecondary }}>
                  {cutIn.roleName}
                  {cutInTheme ? ` · ${cutInTheme.label}` : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LỚP 6: NÚT BỎ QUA HIỆU ỨNG (SKIP ANIMATION — DUY NHẤT CÓ POINTER-EVENTS-AUTO) */}
      {vfx.hasActiveEffects && (
        <div className="pointer-events-none absolute top-1.5 right-2 sm:top-auto sm:bottom-3 sm:right-3 z-40">
          <button
            type="button"
            data-testid="bg-skip-vfx-btn"
            onClick={vfx.skipAllAnimations}
            className="pointer-events-auto rounded-xl border border-amber-400/70 bg-slate-950/90 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-black text-amber-200 shadow-lg hover:bg-slate-900 transition cursor-pointer"
          >
            ⏭️ Bỏ qua hiệu ứng
          </button>
        </div>
      )}
    </div>
  );
});
