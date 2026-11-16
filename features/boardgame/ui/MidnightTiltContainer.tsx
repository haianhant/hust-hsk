'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/MidnightTiltContainer.tsx
// Khung chứa thẻ bài 2:3 hỗ trợ nghiêng 3D tương tác con trỏ, ánh kim Foil
// Shimmer lấy cảm hứng từ Marvel Snap / Legends of Runeterra và lật 3D hai mặt.
// ---------------------------------------------------------------------------

import React, { useCallback, useRef, useState } from 'react';

export interface MidnightTiltContainerProps {
  /** `true` để lật sang mặt lưng (back face = rotateY 180deg). */
  flipped?: boolean;
  /** Bật/tắt lớp ánh kim Foil Shimmer. */
  foilEnabled?: boolean;
  /** Chuỗi CSS gradient cho khung viền kim loại ngoài cùng. */
  frameGradientCss: string;
  /** Chuỗi CSS gradient cho lớp ánh kim Foil. */
  foilGradientCss: string;
  /** Bóng phát sáng bên ngoài theo hệ màu phe hoặc chồng bài. */
  glowShadowCss?: string;
  /** Kích thước card (max-width CSS hoặc tailwind class). */
  className?: string;
  testId?: string;
  onClick?: () => void;
  ariaLabel?: string;
  frontFace: React.ReactNode;
  backFace: React.ReactNode;
}

export function MidnightTiltContainer({
  flipped = false,
  foilEnabled = true,
  frameGradientCss,
  foilGradientCss,
  glowShadowCss,
  className = '',
  testId,
  onClick,
  ariaLabel,
  frontFace,
  backFace,
}: MidnightTiltContainerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 32, active: false });

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const px = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const py = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const ry = (px - 0.5) * 20;
    const rx = (0.5 - py) * 18;
    setTilt({
      rx: Number(rx.toFixed(2)),
      ry: Number(ry.toFixed(2)),
      gx: Math.round(px * 100),
      gy: Math.round(py * 100),
      active: true,
    });
  }, []);

  const handlePointerLeave = useCallback(() => {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 32, active: false });
  }, []);

  const stageTransform = `rotateX(${tilt.rx}deg) rotateY(${tilt.ry + (flipped ? 180 : 0)}deg) scale(${tilt.active ? 1.02 : 1})`;

  return (
    <div
      ref={rootRef}
      data-testid={testId}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`mn-card-perspective group relative aspect-[2/3] w-full select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div
        className="mn-card-flip-stage relative h-full w-full rounded-[20px]"
        style={{
          transform: stageTransform,
          boxShadow: glowShadowCss ?? '0 22px 48px -12px rgba(2, 6, 23, 0.8)',
        }}
      >
        {/* MẶT TRƯỚC */}
        <div
          className="mn-card-face absolute inset-0 overflow-hidden rounded-[20px] p-[2.5px]"
          style={{ background: frameGradientCss }}
        >
          <div className="relative h-full w-full overflow-hidden rounded-[17.5px] bg-slate-950">
            {frontFace}
            {foilEnabled && (
              <>
                <div
                  aria-hidden="true"
                  className="mn-foil-sweep pointer-events-none absolute inset-0 mix-blend-screen opacity-25 transition-opacity duration-300 group-hover:opacity-75"
                  style={{ backgroundImage: foilGradientCss }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 transition-opacity duration-200"
                  style={{
                    opacity: tilt.active ? 0.55 : 0.12,
                    background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.06) 28%, transparent 58%)`,
                  }}
                />
              </>
            )}
          </div>
        </div>

        {/* MẶT LƯNG (ẤN KÝ BÓNG ĐÊM) */}
        <div
          className="mn-card-face mn-card-face-back absolute inset-0 overflow-hidden rounded-[20px] p-[2.5px]"
          style={{
            background:
              'linear-gradient(135deg, #94a3b8 0%, #334155 25%, #d97706 50%, #475569 75%, #e2e8f0 100%)',
          }}
        >
          <div className="relative h-full w-full overflow-hidden rounded-[17.5px] bg-slate-950">
            {backFace}
            {foilEnabled && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-30 mix-blend-screen"
                style={{
                  background: `radial-gradient(circle at ${100 - tilt.gx}% ${tilt.gy}%, rgba(253, 230, 138, 0.35), transparent 58%)`,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
