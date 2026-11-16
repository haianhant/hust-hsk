'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/useSmoothPawnGlide.ts
// Animation di chuyển quân cờ mượt giữa các ô địa điểm bằng kỹ thuật FLIP
// (First - Last - Invert - Play qua Web Animations API), không chặn thao tác
// hay làm trễ server; hỗ trợ prefers-reduced-motion.
// ---------------------------------------------------------------------------

import { useLayoutEffect, useRef } from 'react';
import type { BoardGameLocationId } from '@/shared/contracts/boardgame';

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
}: {
  containerRef: React.RefObject<HTMLDivElement>;
  players: readonly PawnGlideTrackable[];
  matchId: string;
  reducedMotion: boolean;
}) {
  const prevLocRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const prevLocationsRef = useRef<Map<string, BoardGameLocationId>>(new Map());
  const prevMatchIdRef = useRef<string>(matchId);

  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    if (prevMatchIdRef.current !== matchId) {
      prevMatchIdRef.current = matchId;
      prevLocRectsRef.current.clear();
      prevLocationsRef.current.clear();
    }

    const nextRects = new Map<string, DOMRect>();
    const nextLocations = new Map<string, BoardGameLocationId>();

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
          const anim = el.animate(
            [
              { transform: `translate3d(${dx}px, ${dy}px, 0) scale(1.06)` },
              {
                transform: `translate3d(${dx * 0.48}px, ${dy * 0.48 - 18}px, 0) scale(1.18)`,
                offset: 0.45,
              },
              { transform: 'translate3d(0, 0, 0) scale(1)' },
            ],
            {
              duration: 520,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              fill: 'none',
            },
          );
          anim.onfinish = () => {
            el.style.zIndex = prevZ;
          };
          anim.oncancel = () => {
            el.style.zIndex = prevZ;
          };
        }
      }
    }

    prevLocRectsRef.current = nextRects;
    prevLocationsRef.current = nextLocations;
  }, [containerRef, players, matchId, reducedMotion]);
}
