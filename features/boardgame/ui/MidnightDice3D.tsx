'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/MidnightDice3D.tsx
// Hệ thống Xúc Xắc 3D CSS/SVG cho Bóng Đêm KTX (HUSTVerse Midnight — Anime Noir):
// - D6 lập phương 3D 6 mặt chuẩn CSS `preserve-3d` (mặt đối diện cộng bằng 7)
// - D4 tứ diện đa giác kim loại vát 3D có đổ bóng & hiệu ứng nảy lệch pha
// - 4 giai đoạn tất định (~1.2–1.5s): windup -> tumble -> decelerate -> settled
// - CHỐNG LỘ SỚM: Tuyệt đối ẩn kết quả server trong khi xúc xắc chưa dừng hẳn
// - Tôn trọng High/Balanced/Low, Reduced Motion và không dùng WebGL context phụ
// ---------------------------------------------------------------------------

import React, { useId } from 'react';
import { DiceD4Svg, DiceD6Svg } from './BoardGameArt';

export type DiceRollStage = 'idle' | 'windup' | 'tumble' | 'decelerate' | 'settled';

export interface DiceStageTimings {
  windupEndMs: number;
  tumbleEndMs: number;
  settleAtMs: number;
  totalMs: number;
}

/**
 * Chia 4 giai đoạn lăn xúc xắc tất định từ tổng thời lượng (mặc định 1.2–1.5s):
 * - Reduced motion: chốt kết quả tức thì ở `settled` (<= 260ms).
 * - Đầy đủ: Chuẩn bị (13%) -> Lăn 3 trục & nảy (13%–62%) -> Giảm tốc (62%–77%) -> Khóa mặt server (77%–100%).
 */
export function resolveDiceStageTimings(
  durationMs: number,
  reducedMotion: boolean,
): DiceStageTimings {
  const safeDuration = Math.max(180, Math.round(durationMs));
  if (reducedMotion || safeDuration <= 320) {
    return {
      windupEndMs: 0,
      tumbleEndMs: 0,
      settleAtMs: 0,
      totalMs: Math.min(260, safeDuration),
    };
  }
  const totalMs = Math.max(1200, Math.min(1550, safeDuration));
  return {
    windupEndMs: Math.round(totalMs * 0.13),
    tumbleEndMs: Math.round(totalMs * 0.62),
    settleAtMs: Math.round(totalMs * 0.77),
    totalMs,
  };
}

export function resolveDiceRollStage(
  elapsedMs: number,
  durationMs: number,
  reducedMotion: boolean,
): DiceRollStage {
  if (elapsedMs < 0) return 'idle';
  const timings = resolveDiceStageTimings(durationMs, reducedMotion);
  if (reducedMotion || timings.settleAtMs === 0) return 'settled';
  if (elapsedMs < timings.windupEndMs) return 'windup';
  if (elapsedMs < timings.tumbleEndMs) return 'tumble';
  if (elapsedMs < timings.settleAtMs) return 'decelerate';
  return 'settled';
}

export function isDiceResultRevealed(stage: DiceRollStage): boolean {
  return stage === 'settled' || stage === 'idle';
}

const D6_PIP_COORDS: Record<number, readonly [number, number][]> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 24],
    [72, 24],
    [28, 50],
    [72, 50],
    [28, 76],
    [72, 76],
  ],
};

// Góc xoay khối lập phương đưa đúng mặt v (1..6) hướng thẳng về camera (phần tử cuối không lộ trước settled)
const D6_SETTLE_ROTATION: Record<number, string> = {
  1: 'rotateX(0deg) rotateY(0deg) rotateZ(0deg)',
  2: 'rotateX(-90deg) rotateY(0deg) rotateZ(0deg)',
  3: 'rotateX(0deg) rotateY(-90deg) rotateZ(0deg)',
  4: 'rotateX(0deg) rotateY(90deg) rotateZ(0deg)',
  5: 'rotateX(90deg) rotateY(0deg) rotateZ(0deg)',
  6: 'rotateX(0deg) rotateY(180deg) rotateZ(0deg)',
};

function D6CubeFace({
  faceValue,
  faceTransform,
  size,
}: {
  faceValue: number;
  faceTransform: string;
  size: number;
}) {
  const pips = D6_PIP_COORDS[faceValue] ?? D6_PIP_COORDS[1];
  const pipPx = Math.max(5, Math.round(size * 0.165));
  return (
    <div
      style={{ transform: faceTransform }}
      className="mn-die-face absolute inset-0 rounded-[9px] border border-amber-300/75 bg-gradient-to-br from-slate-50 via-slate-200 to-slate-300 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-2px_5px_rgba(15,23,42,0.28)]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[2px] rounded-[7px] border border-slate-400/35"
      />
      {pips.map(([x, y], idx) => (
        <span
          key={idx}
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: pipPx,
            height: pipPx,
          }}
          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[inset_0_1px_1.5px_rgba(0,0,0,0.45)] ${
            faceValue === 1
              ? 'bg-gradient-to-br from-rose-500 to-rose-700 ring-1 ring-rose-300/60'
              : 'bg-gradient-to-br from-slate-800 to-slate-950'
          }`}
        />
      ))}
    </div>
  );
}

export function MidnightDieD6_3D({
  value,
  stage = 'settled',
  size = 44,
  enable3D = true,
}: {
  value: number;
  stage?: DiceRollStage;
  size?: number;
  enable3D?: boolean;
}) {
  const clamped = Math.max(1, Math.min(6, Math.round(value)));
  const revealed = isDiceResultRevealed(stage);
  const half = size / 2;

  const hopClass =
    stage === 'windup'
      ? 'mn-die-hop-windup'
      : stage === 'tumble'
        ? 'mn-die-hop-tumble'
        : stage === 'decelerate'
          ? 'mn-die-hop-decel'
          : stage === 'settled'
            ? 'mn-die-hop-settled'
            : '';

  const shadowClass =
    stage === 'windup'
      ? 'mn-die-shadow-windup'
      : stage === 'tumble'
        ? 'mn-die-shadow-tumble'
        : stage === 'decelerate'
          ? 'mn-die-shadow-decel'
          : 'mn-die-shadow-settled';

  const cubeClass =
    stage === 'windup'
      ? 'mn-die-cube-windup'
      : stage === 'tumble'
        ? 'mn-die-cube-tumble'
        : stage === 'decelerate'
          ? 'mn-die-cube-decel'
          : '';

  const halfPx = `${half.toFixed(1)}px`;

  return (
    <div
      data-testid="bg-die-d6-3d"
      data-die-kind="d6"
      data-die-stage={stage}
      data-settled-value={revealed ? String(clamped) : 'hidden'}
      aria-label={revealed ? `1d6 ra ${clamped}` : '1d6 đang lăn'}
      style={{ width: size, height: size + 8 }}
      className="relative inline-flex shrink-0 flex-col items-center justify-start select-none"
    >
      {/* Bóng đổ tiếp xúc mặt bàn KTX */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-0 h-2 w-[82%] rounded-full bg-black/70 blur-[2px] ${shadowClass}`}
      />

      {enable3D ? (
        <div
          style={{ width: size, height: size, perspective: 540 }}
          className={`relative ${hopClass}`}
        >
          <div
            style={
              revealed
                ? { transform: D6_SETTLE_ROTATION[clamped] }
                : undefined
            }
            className={`mn-die-cube relative h-full w-full ${cubeClass}`}
          >
            {/* 6 mặt lập phương chuẩn: đối diện cộng bằng 7 */}
            <D6CubeFace faceValue={1} size={size} faceTransform={`translateZ(${halfPx})`} />
            <D6CubeFace faceValue={6} size={size} faceTransform={`rotateY(180deg) translateZ(${halfPx})`} />
            <D6CubeFace faceValue={3} size={size} faceTransform={`rotateY(90deg) translateZ(${halfPx})`} />
            <D6CubeFace faceValue={4} size={size} faceTransform={`rotateY(-90deg) translateZ(${halfPx})`} />
            <D6CubeFace faceValue={2} size={size} faceTransform={`rotateX(90deg) translateZ(${halfPx})`} />
            <D6CubeFace faceValue={5} size={size} faceTransform={`rotateX(-90deg) translateZ(${halfPx})`} />
          </div>
        </div>
      ) : (
        <div
          style={{ width: size, height: size }}
          className={`relative flex items-center justify-center ${
            revealed ? '' : 'animate-pulse'
          }`}
        >
          {revealed ? (
            <DiceD6Svg value={clamped} size={size} />
          ) : (
            <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="42" height="42" rx="10" fill="#e2e8f0" stroke="#fbbf24" strokeWidth="2.5" />
              <text x="24" y="31" textAnchor="middle" fill="#0f172a" fontSize="22" fontWeight="900">
                ?
              </text>
            </svg>
          )}
        </div>
      )}
    </div>
  );
}

export function MidnightDieD4_3D({
  value,
  stage = 'settled',
  size = 44,
  enable3D = true,
}: {
  value: number;
  stage?: DiceRollStage;
  size?: number;
  enable3D?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const leftGradId = `mnD4L-${uid}`;
  const rightGradId = `mnD4R-${uid}`;
  const clamped = Math.max(1, Math.min(4, Math.round(value)));
  const revealed = isDiceResultRevealed(stage);

  const hopClass =
    stage === 'windup'
      ? 'mn-die-hop-windup-d4'
      : stage === 'tumble'
        ? 'mn-die-hop-tumble-d4'
        : stage === 'decelerate'
          ? 'mn-die-hop-decel-d4'
          : stage === 'settled'
            ? 'mn-die-hop-settled'
            : '';

  const shadowClass =
    stage === 'windup'
      ? 'mn-die-shadow-windup'
      : stage === 'tumble'
        ? 'mn-die-shadow-tumble'
        : stage === 'decelerate'
          ? 'mn-die-shadow-decel'
          : 'mn-die-shadow-settled';

  const spinClass =
    enable3D && !revealed
      ? stage === 'tumble'
        ? 'mn-d4-pyramid-tumble'
        : stage === 'decelerate'
          ? 'mn-d4-pyramid-decel'
          : 'mn-d4-pyramid-windup'
      : '';

  return (
    <div
      data-testid="bg-die-d4-3d"
      data-die-kind="d4"
      data-die-stage={stage}
      data-settled-value={revealed ? String(clamped) : 'hidden'}
      aria-label={revealed ? `1d4 ra ${clamped}` : '1d4 đang lăn'}
      style={{ width: size, height: size + 8 }}
      className="relative inline-flex shrink-0 flex-col items-center justify-start select-none"
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-0 h-2 w-[84%] rounded-full bg-black/75 blur-[2px] ${shadowClass}`}
      />

      {enable3D ? (
        <div
          style={{ width: size, height: size, perspective: 480 }}
          className={`relative ${hopClass}`}
        >
          <div className={`mn-die-cube relative h-full w-full ${spinClass}`}>
            <svg
              width={size}
              height={size}
              viewBox="0 0 56 56"
              fill="none"
              aria-hidden="true"
              className="drop-shadow-[0_4px_8px_rgba(245,158,11,0.38)]"
            >
              <defs>
                <linearGradient id={leftGradId} x1="8" y1="8" x2="32" y2="48" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="55%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
                <linearGradient id={rightGradId} x1="28" y1="6" x2="50" y2="48" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#78350f" />
                </linearGradient>
              </defs>
              {/* Mặt trái bắt sáng */}
              <polygon
                points="28,5 30,48 5,44"
                fill={`url(#${leftGradId})`}
                stroke="#fef3c7"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              {/* Mặt phải đổ bóng chiều sâu 3D */}
              <polygon
                points="28,5 51,44 30,48"
                fill={`url(#${rightGradId})`}
                stroke="#fde68a"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              {/* Sống đỉnh kim loại bắt sáng */}
              <line x1="28" y1="5" x2="30" y2="48" stroke="#fef9c3" strokeWidth="1.6" strokeOpacity="0.85" />
              {/* Kết quả chốt hoặc ký tự ẩn danh */}
              {revealed ? (
                <text
                  x="27"
                  y="37"
                  textAnchor="middle"
                  fill="#1e1b4b"
                  stroke="#fef3c7"
                  strokeWidth="0.6"
                  fontSize="20"
                  fontWeight="900"
                >
                  {clamped}
                </text>
              ) : (
                <text
                  x="28"
                  y="36"
                  textAnchor="middle"
                  fill="#1e1b4b"
                  fontSize="16"
                  fontWeight="900"
                >
                  ✦
                </text>
              )}
            </svg>
          </div>
        </div>
      ) : (
        <div
          style={{ width: size, height: size }}
          className={`relative flex items-center justify-center ${
            revealed ? '' : 'animate-pulse'
          }`}
        >
          {revealed ? (
            <DiceD4Svg value={clamped} size={size} />
          ) : (
            <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <polygon points="24,4 44,41 4,41" fill="#d97706" stroke="#fef3c7" strokeWidth="2.5" strokeLinejoin="round" />
              <text x="24" y="34" textAnchor="middle" fill="#1e1b4b" fontSize="16" fontWeight="900">
                ✦
              </text>
            </svg>
          )}
        </div>
      )}
    </div>
  );
}

export const MidnightDicePair3D = React.memo(function MidnightDicePair3D({
  d6,
  d4,
  stage = 'settled',
  size = 42,
  enable3D = true,
}: {
  d6: number;
  d4: number;
  stage?: DiceRollStage;
  size?: number;
  enable3D?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2 shrink-0">
      {d6 > 0 && <MidnightDieD6_3D value={d6} stage={stage} size={size} enable3D={enable3D} />}
      <MidnightDieD4_3D value={d4} stage={stage} size={size} enable3D={enable3D} />
    </div>
  );
});
export default MidnightDicePair3D;
