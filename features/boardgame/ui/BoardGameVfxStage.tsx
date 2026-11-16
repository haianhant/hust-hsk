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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type {
  BoardGameDeckId,
  BoardGamePrivateGameView,
  BoardGamePublicGameView,
} from '@/shared/contracts/boardgame';
import {
  DiceD4Svg,
  DiceD6Svg,
  FactionCrestSvg,
  RolePortraitSvg,
} from './BoardGameArt';
import {
  CARD_BACK_SECRET_TITLES,
  MIDNIGHT_CARD_ART,
  MIDNIGHT_CARD_BACK_ART,
  MIDNIGHT_DECK_TOKENS,
  MIDNIGHT_FACTION_TOKENS,
} from './midnight-noir-tokens';
import {
  playBlockClang,
  playCardDraw,
  playCutInWhoosh,
  playExplosionImpact,
  playGunfireBurst,
  playHealShimmer,
  playLightningStrike,
  playSlashHit,
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

        // Tàn lửa văng tại điểm chém
        if (!reducedMotion) {
          for (let k = 0; k < 8; k++) {
            const ang = (Math.PI * 2 * k) / 8 + p * 1.4;
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

        if (!reducedMotion) {
          for (let i = 0; i < 6; i++) {
            const ox = (i - 2.5) * 11;
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
  handUnmasked: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  reducedMotionOverride?: boolean | null;
}

export interface BoardGameVfxState {
  activeCombatCount: number;
  floatingPopups: readonly ActiveFloatingPopup[];
  activeDiceRoll: DiceRollVisualEvent | null;
  activeCardDraw: {
    event: CardDrawVisualEvent;
    revealedFace: boolean;
  } | null;
  activeCutIn: CinematicCutInVisualEvent | null;
  screenShake: ScreenShakeLevel;
  reducedMotion: boolean;
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
  handUnmasked,
  containerRef,
  reducedMotionOverride: externalReducedOverride,
}: UseBoardGameVfxQueueOptions): BoardGameVfxState {
  const trackerRef = useRef<VisualEventTracker>(new VisualEventTracker());
  const seenMatchRef = useRef<string>('');
  const combatLayerRef = useRef<HTMLCanvasElement>(null);
  const activeCombatAnimsRef = useRef<ActiveCombatAnim[]>([]);
  const rafRef = useRef<number | null>(null);

  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [localReducedOverride, setLocalReducedOverride] = useState<boolean | null>(null);
  const reducedMotion = externalReducedOverride ?? localReducedOverride ?? systemReducedMotion;

  const [activeCombatCount, setActiveCombatCount] = useState(0);
  const [floatingPopups, setFloatingPopups] = useState<ActiveFloatingPopup[]>([]);
  const [activeDiceRoll, setActiveDiceRoll] = useState<DiceRollVisualEvent | null>(null);
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

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cw = container.clientWidth || 720;
      const ch = container.clientHeight || 480;
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, cw, ch);
        const now = performance.now();
        const remaining: ActiveCombatAnim[] = [];
        for (const a of anims) {
          if (drawCombatAnimation(ctx, a, now, reducedMotion)) {
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
  }, [containerRef, reducedMotion]);

  const skipAllAnimations = useCallback(() => {
    clearAllTimers();
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
    setActiveDiceRoll(null);
    setActiveCardDraw(null);
    setCutInQueue([]);
    setActiveCutIn(null);
    setScreenShake('none');
  }, [clearAllTimers]);

  // Cut-in queue pump: phát lần lượt từng banner điện ảnh
  useEffect(() => {
    if (activeCutIn || cutInQueue.length === 0) return;
    const [nextBanner, ...rest] = cutInQueue;
    setActiveCutIn(nextBanner);
    setCutInQueue(rest);
    if (nextBanner.bannerType !== 'YOUR_TURN') {
      playCutInWhoosh();
    }
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
            setActiveDiceRoll(ev);
            scheduleTimeout(() => {
              setActiveDiceRoll((curr) => (curr?.id === ev.id ? null : curr));
            }, ev.durationMs);
            break;
          }
          case 'CARD_DRAW': {
            playCardDraw();
            setActiveCardDraw({ event: ev, revealedFace: false });
            if (ev.showFront) {
              scheduleTimeout(() => {
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

            if (!reducedMotion && ev.shake !== 'none') {
              setScreenShake(ev.shake);
              scheduleTimeout(() => setScreenShake('none'), ev.shake === 'heavy' ? 290 : 210);
            }

            // Âm thanh đồng bộ theo chiêu
            if (ev.effect === 'LIGHTNING_STRIKE') playLightningStrike();
            else if (ev.effect === 'MACHINE_GUN_BARRAGE' || ev.effect === 'HANDGUN_SHOT') playGunfireBurst();
            else if (ev.effect === 'EXPLOSION') playExplosionImpact();
            else if (ev.effect === 'SHIELD_GUARD') playBlockClang();
            else if (ev.effect === 'HEAL_AURA') playHealShimmer();
            else playSlashHit();
            break;
          }
          case 'FLOATING_TEXT': {
            const pt = resolvePlayerAnchor(container, ev.targetPlayerId, players);
            const jitterX = ((ev.targetPlayerId.charCodeAt(ev.targetPlayerId.length - 1) || 0) % 3 - 1) * 8;
            const uid = ev.id;
            const spawnMs = reducedMotion ? 0 : 90;
            scheduleTimeout(() => {
              setFloatingPopups((prev) => [
                ...prev.slice(-10),
                { uid, event: ev, x: pt.x + jitterX, y: pt.y - 12 },
              ]);
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
    [containerRef, ensureCanvasLoop, reducedMotion, scheduleTimeout],
  );

  // Phát hiện delta từ mỗi bản publicGame mới
  useEffect(() => {
    const tracker = trackerRef.current;
    const ctx = {
      selfPlayerId,
      isSpectator,
      handUnmasked,
      privateView,
      reducedMotion,
    };

    if (seenMatchRef.current !== publicGame.matchId) {
      seenMatchRef.current = publicGame.matchId;
      skipAllAnimations();
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
  }, [
    publicGame,
    privateView,
    selfPlayerId,
    isSpectator,
    handUnmasked,
    reducedMotion,
    enqueueEvents,
    skipAllAnimations,
  ]);

  useEffect(() => {
    return () => {
      clearAllTimers();
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [clearAllTimers]);

  const hasActiveEffects =
    activeCombatCount > 0 ||
    floatingPopups.length > 0 ||
    Boolean(activeDiceRoll) ||
    Boolean(activeCardDraw) ||
    Boolean(activeCutIn) ||
    cutInQueue.length > 0;

  return {
    activeCombatCount,
    floatingPopups,
    activeDiceRoll,
    activeCardDraw,
    activeCutIn,
    screenShake,
    reducedMotion,
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

export function BoardGameVfxStage({
  vfx,
  containerRef,
  publicGame,
  sourcePlayerId,
  selectedTargetId,
  targetingTone = 'hostile',
}: BoardGameVfxStageProps) {
  const [targetLine, setTargetLine] = useState<{ from: Point2D; to: Point2D } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !selectedTargetId || !sourcePlayerId || selectedTargetId === sourcePlayerId) {
      setTargetLine(null);
      return;
    }
    const updateLine = () => {
      const from = resolvePlayerAnchor(container, sourcePlayerId, publicGame.players);
      const to = resolvePlayerAnchor(container, selectedTargetId, publicGame.players);
      setTargetLine({ from, to });
    };
    updateLine();
    window.addEventListener('resize', updateLine);
    return () => window.removeEventListener('resize', updateLine);
  }, [containerRef, selectedTargetId, sourcePlayerId, publicGame]);

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

  return (
    <div
      data-testid="bg-vfx-stage"
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
        const toneCls =
          pop.event.variant === 'damage'
            ? 'text-rose-300 drop-shadow-[0_3px_10px_rgba(225,29,72,0.95)]'
            : pop.event.variant === 'heal'
              ? 'text-emerald-300 drop-shadow-[0_3px_10px_rgba(16,185,129,0.95)]'
              : pop.event.variant === 'block'
                ? 'text-sky-200 drop-shadow-[0_3px_10px_rgba(56,189,248,0.95)]'
                : pop.event.variant === 'counter'
                  ? 'text-purple-200 drop-shadow-[0_3px_10px_rgba(168,85,247,0.95)]'
                  : pop.event.variant === 'steal'
                    ? 'text-amber-300 drop-shadow-[0_3px_10px_rgba(245,158,11,0.95)]'
                    : 'text-slate-300 drop-shadow-[0_2px_8px_rgba(15,23,42,0.95)]';
        return (
          <div
            key={pop.uid}
            data-testid="bg-vfx-floating-popup"
            data-variant={pop.event.variant}
            data-target-player={pop.event.targetPlayerId}
            style={{ left: pop.x, top: pop.y }}
            className={`pointer-events-none absolute z-20 -translate-x-1/2 font-black tracking-tight text-xl sm:text-2xl ${
              vfx.reducedMotion ? '' : 'bg-vfx-float-pop'
            } ${toneCls}`}
          >
            <span className="rounded-lg bg-slate-950/75 px-2 py-0.5 ring-1 ring-white/20">
              {pop.event.label}
            </span>
          </div>
        );
      })}

      {/* LỚP 4A: DICE TUMBLE OVERLAY (DỪNG Ở ĐÚNG KẾT QUẢ SERVER) */}
      {vfx.activeDiceRoll && (
        <div
          data-testid="bg-vfx-dice-overlay"
          className="pointer-events-none absolute inset-x-0 bottom-20 flex justify-center px-3"
        >
          <div
            className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 shadow-2xl backdrop-blur-md ${
              vfx.activeDiceRoll.freeChoice
                ? 'border-amber-300/80 bg-amber-950/85 text-amber-100'
                : vfx.activeDiceRoll.rerollRequired
                  ? 'border-orange-400/80 bg-orange-950/85 text-orange-100'
                  : 'border-cyan-400/60 bg-slate-900/90 text-white'
            } ${vfx.reducedMotion ? '' : 'bg-vfx-dice-roll'}`}
          >
            <div className="flex items-center gap-1.5">
              {vfx.activeDiceRoll.d6 > 0 && <DiceD6Svg value={vfx.activeDiceRoll.d6} size={40} />}
              <DiceD4Svg value={vfx.activeDiceRoll.d4} size={40} />
            </div>
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                {vfx.activeDiceRoll.actorName} ·{' '}
                {vfx.activeDiceRoll.diceKind === 'attack' ? 'Xúc xắc tấn công' : 'Xúc xắc di chuyển'}
              </p>
              <p className="text-sm font-black">
                {vfx.activeDiceRoll.diceKind === 'attack'
                  ? `Kết quả: |${vfx.activeDiceRoll.d6} - ${vfx.activeDiceRoll.d4}| = ${vfx.activeDiceRoll.total}`
                  : `Tổng: ${vfx.activeDiceRoll.d6} + ${vfx.activeDiceRoll.d4} = ${vfx.activeDiceRoll.total}`}
                {vfx.activeDiceRoll.freeChoice ? ' ✨ CHỌN TỰ DO!' : ''}
                {vfx.activeDiceRoll.rerollRequired ? ' 🔁 ĐỔ LẠI!' : ''}
              </p>
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
            className={`relative flex w-full max-w-2xl items-center gap-3 sm:gap-4 overflow-hidden rounded-2xl border-2 bg-slate-950/92 px-4 py-3 shadow-2xl backdrop-blur-md ${
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
}
