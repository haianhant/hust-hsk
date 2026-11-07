'use client';

import { useRef, useState } from 'react';
import { playerInput } from '../../lib/playerState';

// Joystick cảm ứng/chuột ở góc dưới-trái.
// Ghi vector chuẩn hóa (-1..1) vào playerInput.move:
//   x = phải/trái (đẩy phải → +1), y = tiến/lùi (đẩy lên → +1).
// playerInput.run = true khi đẩy ra sát mép (> 0,9). Thả ra reset về 0.
// Chỉ hiển thị trên thiết bị cảm ứng: hidden [@media(pointer:coarse)]:flex.

const ZONE = 112; // px — đường kính vùng tròn
const KNOB = 48; // px — đường kính núm
const RADIUS = (ZONE - KNOB) / 2; // biên độ kéo tối đa của tâm núm
const RUN_THRESHOLD = 0.9;

export default function Joystick() {
  const zoneRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const updateFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    const zone = zoneRef.current;
    if (!zone) return;
    const rect = zone.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    const nx = dx / RADIUS;
    const ny = -dy / RADIUS; // đẩy lên (dy âm) = tiến → y dương
    playerInput.move.x = nx;
    playerInput.move.y = ny;
    playerInput.run = Math.hypot(nx, ny) > RUN_THRESHOLD;
  };

  const reset = () => {
    pointerIdRef.current = null;
    setKnob({ x: 0, y: 0 });
    playerInput.move.x = 0;
    playerInput.move.y = 0;
    playerInput.run = false;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation(); // không xoay camera khi chạm joystick
    pointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromEvent(e);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    updateFromEvent(e);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    reset();
  };

  return (
    <div
      ref={zoneRef}
      role="application"
      aria-label="Cần điều khiển di chuyển"
      className="pointer-events-auto hidden h-[112px] w-[112px] touch-none items-center justify-center rounded-full border border-white/30 bg-black/30 backdrop-blur-sm [@media(pointer:coarse)]:flex"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        aria-hidden
        className="h-12 w-12 rounded-full border border-white/40 bg-white/70 shadow-md"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
}
