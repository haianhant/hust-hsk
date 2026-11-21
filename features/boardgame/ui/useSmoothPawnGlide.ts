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
  durationMs = 1650,
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
          const spanFrac = Math.max(0.08, (flightMs / totalMs));
          const liftFrac = holdFrac + spanFrac * 0.24;
          const midFrac = holdFrac + spanFrac * 0.52;
          const descFrac = holdFrac + spanFrac * 0.78;
          const touchFrac = Math.min(0.96, (holdDelay + flightMs) / totalMs);

          // QUAN TRỌNG: easing tổng phải là 'linear' để pha giữ chân (holdFrac) không bị trượt sớm;
          // quỹ đạo parabol đa điểm mượt (lift -> apex -> descend -> touchdown -> settle) loại bỏ giật khung.
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
                    transform: `translate3d(${dx}px, ${dy}px, 0) scale(1.05, 0.96)`,
                    filter: 'drop-shadow(0 5px 8px rgba(56,189,248,0.42))',
                    offset: holdFrac,
                    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  },
                  {
                    transform: `translate3d(${dx * 0.76}px, ${dy * 0.76 - 19}px, 0) scale(1.13)`,
                    filter: 'drop-shadow(0 12px 12px rgba(2,6,23,0.62))',
                    offset: liftFrac,
                    easing: 'cubic-bezier(0.33, 1, 0.68, 1)',
                  },
                  {
                    transform: `translate3d(${dx * 0.46}px, ${dy * 0.46 - 30}px, 0) scale(1.2)`,
                    filter: 'drop-shadow(0 18px 16px rgba(2,6,23,0.74))',
                    offset: midFrac,
                    easing: 'cubic-bezier(0.37, 0, 0.63, 1)',
                  },
                  {
                    transform: `translate3d(${dx * 0.16}px, ${dy * 0.16 - 14}px, 0) scale(1.1)`,
                    filter: 'drop-shadow(0 10px 10px rgba(2,6,23,0.58))',
                    offset: descFrac,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                  },
                  {
                    transform: 'translate3d(0, 3px, 0) scale(1.07, 0.93)',
                    filter: 'drop-shadow(0 3px 5px rgba(56,189,248,0.52))',
                    offset: touchFrac,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                  },
                  {
                    transform: 'translate3d(0, 0, 0) scale(1)',
                    filter: 'drop-shadow(0 2px 4px rgba(2,6,23,0.45))',
                    offset: 1,
                  },
                ]
              : [
                  {
                    transform: `translate3d(${dx}px, ${dy}px, 0) scale(1.05, 0.96)`,
                    filter: 'drop-shadow(0 5px 8px rgba(56,189,248,0.4))',
                    offset: 0,
                    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  },
                  {
                    transform: `translate3d(${dx * 0.74}px, ${dy * 0.74 - 18}px, 0) scale(1.12)`,
                    filter: 'drop-shadow(0 12px 12px rgba(2,6,23,0.62))',
                    offset: 0.24,
                    easing: 'cubic-bezier(0.33, 1, 0.68, 1)',
                  },
                  {
                    transform: `translate3d(${dx * 0.45}px, ${dy * 0.45 - 28}px, 0) scale(1.18)`,
                    filter: 'drop-shadow(0 18px 16px rgba(2,6,23,0.74))',
                    offset: 0.5,
                    easing: 'cubic-bezier(0.37, 0, 0.63, 1)',
                  },
                  {
                    transform: `translate3d(${dx * 0.15}px, ${dy * 0.15 - 12}px, 0) scale(1.09)`,
                    filter: 'drop-shadow(0 9px 10px rgba(2,6,23,0.56))',
                    offset: 0.74,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                  },
                  {
                    transform: 'translate3d(0, 3px, 0) scale(1.06, 0.94)',
                    filter: 'drop-shadow(0 3px 5px rgba(56,189,248,0.5))',
                    offset: 0.87,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
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
            }, 680);
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
