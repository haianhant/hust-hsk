'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/useSmoothPawnGlide.ts
// Animation di chuyển quân cờ mượt giữa các ô địa điểm bằng kỹ thuật FLIP
// (First - Last - Invert - Play qua Web Animations API), không chặn thao tác
// hay làm trễ server; hỗ trợ prefers-reduced-motion.
// ---------------------------------------------------------------------------

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { BoardGameLocationId } from '@/shared/contracts/boardgame';
import {
  buildDiceRollTimeline,
  buildDirectMoveTimeline,
  type DiceRollQualityTier,
} from './MidnightDice3D';
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
  qualityTier = 'high',
  durationMs = 520,
  diceRollSignature = '',
  skipGeneration = 0,
}: {
  containerRef: React.RefObject<HTMLDivElement>;
  players: readonly PawnGlideTrackable[];
  matchId: string;
  reducedMotion: boolean;
  qualityTier?: DiceRollQualityTier;
  durationMs?: number;
  diceRollSignature?: string;
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

    const timeline = rollChangedThisCommit
      ? buildDiceRollTimeline({
          diceKind: 'move',
          qualityTier,
          pawnGlideDurationMs: durationMs,
          reducedMotion,
          hasDestinationMove: true,
        })
      : buildDirectMoveTimeline({
          pawnGlideDurationMs: durationMs,
          reducedMotion,
        });

    const nextRects = new Map<string, DOMRect>();
    const nextLocations = new Map<string, BoardGameLocationId>();
    const holdDelay = timeline.pawnGlideStartMs;
    const flightMs = timeline.pawnGlideDurationMs;
    const cushionMs = timeline.pawnCushionDurationMs;

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
        (flightMs > 0 || holdDelay > 0) &&
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
          const tileEl = el.closest<HTMLElement>('[data-testid^="bg-loc-"]');
          const prevTileZ = tileEl ? tileEl.style.zIndex : '';
          el.style.zIndex = '40';
          if (tileEl) {
            tileEl.style.zIndex = '40';
          }

          if (flightMs <= 0) {
            // Mức Low: giữ quân cờ ở ô gốc tới đúng khoảnh khắc diceSettleAtMs rồi chốt dứt điểm
            const holdAnim = el.animate(
              [
                { transform: `translate3d(${dx}px, ${dy}px, 0)`, offset: 0 },
                { transform: 'translate3d(0, 0, 0)', offset: 1 },
              ],
              {
                duration: holdDelay,
                easing: 'steps(1, end)',
                fill: 'none',
              },
            );
            activeAnimsRef.current.add(holdAnim);
            const cleanupLow = () => {
              activeAnimsRef.current.delete(holdAnim);
              el.style.zIndex = prevZ;
              if (tileEl) tileEl.style.zIndex = prevTileZ;
            };
            holdAnim.onfinish = () => {
              cleanupLow();
              playPawnTouchdown();
            };
            holdAnim.oncancel = cleanupLow;
            continue;
          }

          const totalMs = holdDelay + flightMs + cushionMs;
          const holdFrac = Math.min(0.84, holdDelay / totalMs);
          const midFrac = holdFrac + (flightMs / totalMs) * 0.48;
          const touchFrac = Math.min(0.97, (holdDelay + flightMs) / totalMs);

          // QUAN TRỌNG: easing tổng phải là 'linear' để pha giữ chân (holdFrac) không bị trượt sớm;
          // easing mượt chỉ gắn vào đoạn bay [holdFrac -> touchFrac -> 1].
          const frames: Keyframe[] =
            holdFrac > 0.005
              ? [
                  {
                    transform: `translate3d(${dx}px, ${dy}px, 0) scale(1)`,
                    filter: 'drop-shadow(0 2px 4px rgba(2,6,23,0.45))',
                    offset: 0,
                    easing: 'linear',
                  },
                  {
                    transform: `translate3d(${dx}px, ${dy}px, 0) scale(1.07)`,
                    filter: 'drop-shadow(0 6px 8px rgba(56,189,248,0.42))',
                    offset: holdFrac,
                    easing: 'ease-out',
                  },
                  {
                    transform: `translate3d(${dx * 0.45}px, ${dy * 0.45 - 26}px, 0) scale(1.22)`,
                    filter: 'drop-shadow(0 16px 14px rgba(2,6,23,0.72))',
                    offset: midFrac,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                  },
                  {
                    transform: 'translate3d(0, 3px, 0) scale(1.08, 0.92)',
                    filter: 'drop-shadow(0 3px 5px rgba(56,189,248,0.5))',
                    offset: touchFrac,
                    easing: 'ease-out',
                  },
                  {
                    transform: 'translate3d(0, 0, 0) scale(1)',
                    filter: 'drop-shadow(0 2px 4px rgba(2,6,23,0.45))',
                    offset: 1,
                  },
                ]
              : [
                  {
                    transform: `translate3d(${dx}px, ${dy}px, 0) scale(1.06)`,
                    filter: 'drop-shadow(0 5px 8px rgba(56,189,248,0.4))',
                    offset: 0,
                    easing: 'ease-out',
                  },
                  {
                    transform: `translate3d(${dx * 0.45}px, ${dy * 0.45 - 24}px, 0) scale(1.2)`,
                    filter: 'drop-shadow(0 16px 14px rgba(2,6,23,0.72))',
                    offset: 0.46,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                  },
                  {
                    transform: 'translate3d(0, 3px, 0) scale(1.07, 0.93)',
                    filter: 'drop-shadow(0 3px 5px rgba(56,189,248,0.5))',
                    offset: 0.84,
                    easing: 'ease-out',
                  },
                  {
                    transform: 'translate3d(0, 0, 0) scale(1)',
                    filter: 'drop-shadow(0 2px 4px rgba(2,6,23,0.45))',
                    offset: 1,
                  },
                ];

          const anim = el.animate(frames, {
            duration: totalMs,
            easing: 'linear',
            fill: 'none',
          });
          activeAnimsRef.current.add(anim);

          let rippleTimerId: number | null = null;
          const touchTimerId = window.setTimeout(() => {
            landTimersRef.current.delete(touchTimerId);
            playPawnTouchdown();
            el.classList.add('mn-pawn-touchdown-ripple');
            rippleTimerId = window.setTimeout(() => {
              if (rippleTimerId !== null) landTimersRef.current.delete(rippleTimerId);
              el.classList.remove('mn-pawn-touchdown-ripple');
            }, 440);
            landTimersRef.current.add(rippleTimerId);
          }, timeline.pawnTouchdownAtMs);
          landTimersRef.current.add(touchTimerId);

          const cleanup = () => {
            activeAnimsRef.current.delete(anim);
            window.clearTimeout(touchTimerId);
            landTimersRef.current.delete(touchTimerId);
            el.style.zIndex = prevZ;
            if (tileEl) tileEl.style.zIndex = prevTileZ;
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
  }, [containerRef, players, matchId, reducedMotion, qualityTier, durationMs, diceRollSignature]);
}
