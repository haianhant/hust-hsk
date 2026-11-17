'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/useSmoothPawnGlide.ts
// Animation di chuyển quân cờ mượt giữa các ô địa điểm bằng kỹ thuật FLIP
// (First - Last - Invert - Play qua Web Animations API), không chặn thao tác
// hay làm trễ server; hỗ trợ prefers-reduced-motion.
// ---------------------------------------------------------------------------

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { BoardGameLocationId } from '@/shared/contracts/boardgame';
import { playPawnTouchdown } from './sound';

export interface PawnGlideTrackable {
  playerId: string;
  location: BoardGameLocationId;
  woundsTaken: number;
}

export function useSmoothPawnGlide({
  containerRef,
  players,
  matchId,
  reducedMotion,
  durationMs = 520,
  diceRollSignature = '',
  diceHoldDelayMs = 960,
  skipGeneration = 0,
}: {
  containerRef: React.RefObject<HTMLDivElement>;
  players: readonly PawnGlideTrackable[];
  matchId: string;
  reducedMotion: boolean;
  durationMs?: number;
  diceRollSignature?: string;
  diceHoldDelayMs?: number;
  skipGeneration?: number;
}) {
  const prevLocRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const prevLocationsRef = useRef<Map<string, BoardGameLocationId>>(new Map());
  const prevMatchIdRef = useRef<string>(matchId);
  const prevDiceSigRef = useRef<string>(diceRollSignature);
  const activeAnimsRef = useRef<Set<Animation>>(new Set());
  const landTimersRef = useRef<Set<number>>(new Set());

  const cancelAllGlides = () => {
    landTimersRef.current.forEach((id) => window.clearTimeout(id));
    landTimersRef.current.clear();
    activeAnimsRef.current.forEach((anim) => {
      try {
        anim.cancel();
      } catch {
        // ignore finished animations
      }
    });
    activeAnimsRef.current.clear();
  };

  useEffect(() => {
    return () => {
      cancelAllGlides();
    };
  }, []);

  useEffect(() => {
    if (skipGeneration > 0) {
      cancelAllGlides();
    }
  }, [skipGeneration]);

  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    if (prevMatchIdRef.current !== matchId) {
      prevMatchIdRef.current = matchId;
      prevDiceSigRef.current = diceRollSignature;
      cancelAllGlides();
      prevLocRectsRef.current.clear();
      prevLocationsRef.current.clear();
    }

    const rollChangedThisCommit =
      Boolean(diceRollSignature) && prevDiceSigRef.current !== diceRollSignature;
    prevDiceSigRef.current = diceRollSignature;

    const nextRects = new Map<string, DOMRect>();
    const nextLocations = new Map<string, BoardGameLocationId>();
    const effectiveMs = Math.max(0, Math.round(durationMs));
    const holdDelay =
      reducedMotion || effectiveMs <= 0
        ? 0
        : rollChangedThisCommit
          ? Math.max(0, Math.round(diceHoldDelayMs))
          : 90;

    for (const p of players) {
      nextLocations.set(p.playerId, p.location);
      const el = root.querySelector<HTMLElement>(`[data-pawn-glide="${p.playerId}"]`);
      if (!el) continue;

      const curRect = el.getBoundingClientRect();
      nextRects.set(p.playerId, curRect);

      const prevLoc = prevLocationsRef.current.get(p.playerId);
      const prevRect = prevLocRectsRef.current.get(p.playerId);

      if (
        !reducedMotion &&
        effectiveMs > 0 &&
        prevLoc &&
        prevLoc !== p.location &&
        prevRect &&
        curRect.width > 0 &&
        prevRect.width > 0 &&
        typeof el.animate === 'function'
      ) {
        const dx = prevRect.left - curRect.left;
        const dy = prevRect.top - curRect.top;
        if (Math.hypot(dx, dy) > 4) {
          const prevZ = el.style.zIndex;
          el.style.zIndex = '25';
          const cushionMs = 150;
          const totalMs = holdDelay + effectiveMs + cushionMs;
          const holdFrac = Math.min(0.75, holdDelay / totalMs);
          const midFrac = holdFrac + (effectiveMs / totalMs) * 0.48;
          const touchFrac = Math.min(0.95, (holdDelay + effectiveMs) / totalMs);

          const frames: Keyframe[] =
            holdFrac > 0.01
              ? [
                  { transform: `translate3d(${dx}px, ${dy}px, 0) scale(1)`, offset: 0 },
                  { transform: `translate3d(${dx}px, ${dy}px, 0) scale(1.06)`, offset: holdFrac },
                  {
                    transform: `translate3d(${dx * 0.45}px, ${dy * 0.45 - 20}px, 0) scale(1.2)`,
                    offset: midFrac,
                  },
                  {
                    transform: 'translate3d(0, 3px, 0) scale(1.07, 0.93)',
                    offset: touchFrac,
                  },
                  { transform: 'translate3d(0, 0, 0) scale(1)', offset: 1 },
                ]
              : [
                  { transform: `translate3d(${dx}px, ${dy}px, 0) scale(1.05)`, offset: 0 },
                  {
                    transform: `translate3d(${dx * 0.45}px, ${dy * 0.45 - 18}px, 0) scale(1.18)`,
                    offset: 0.45,
                  },
                  { transform: 'translate3d(0, 3px, 0) scale(1.06, 0.94)', offset: 0.84 },
                  { transform: 'translate3d(0, 0, 0) scale(1)', offset: 1 },
                ];

          const anim = el.animate(frames, {
            duration: totalMs,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'none',
          });
          activeAnimsRef.current.add(anim);

          let rippleTimerId: number | null = null;
          const touchDelayMs = holdDelay + effectiveMs;
          const touchTimerId = window.setTimeout(() => {
            landTimersRef.current.delete(touchTimerId);
            playPawnTouchdown();
            el.classList.add('mn-pawn-touchdown-ripple');
            rippleTimerId = window.setTimeout(() => {
              if (rippleTimerId !== null) landTimersRef.current.delete(rippleTimerId);
              el.classList.remove('mn-pawn-touchdown-ripple');
            }, 440);
            landTimersRef.current.add(rippleTimerId);
          }, touchDelayMs);
          landTimersRef.current.add(touchTimerId);

          const cleanup = () => {
            activeAnimsRef.current.delete(anim);
            window.clearTimeout(touchTimerId);
            landTimersRef.current.delete(touchTimerId);
            el.style.zIndex = prevZ;
          };
          anim.onfinish = cleanup;
          anim.oncancel = () => {
            cleanup();
            el.classList.remove('mn-pawn-touchdown-ripple');
          };
        }
      }
    }

    prevLocRectsRef.current = nextRects;
    prevLocationsRef.current = nextLocations;
  }, [containerRef, players, matchId, reducedMotion, durationMs, diceRollSignature, diceHoldDelayMs]);
}
