'use client';

import { useEffect, useRef, useState } from 'react';
import { BOUNDS, BUILDING_COLLIDERS, FAST_TRAVEL_DESTINATIONS, LAKE, ROADS, TDN_SQUARE } from '../../lib/campus';
import { playerState } from '../../lib/playerState';

// Minimap 2D vẽ từ lib/campus (single source of truth — không bịa tọa độ).
// -Z = bắc nên phía trên canvas là hướng Bắc ("B").
// Hướng mũi tên suy từ hướng di chuyển thực tế (delta vị trí giữa các lần
// vẽ): playerState không lưu góc xoay, nên khi đứng yên giữ hướng cũ.

const SIZE = 150;
const PAD = 8;

function makeProject() {
  const rangeX = BOUNDS.maxX - BOUNDS.minX;
  const rangeZ = BOUNDS.maxZ - BOUNDS.minZ;
  const scale = (SIZE - PAD * 2) / Math.max(rangeX, rangeZ);
  const offsetX = (SIZE - rangeX * scale) / 2;
  const offsetY = (SIZE - rangeZ * scale) / 2;
  return {
    x: (wx: number) => offsetX + (wx - BOUNDS.minX) * scale,
    y: (wz: number) => offsetY + (wz - BOUNDS.minZ) * scale,
    s: scale,
  };
}

export default function Minimap({ onFastTravel }: { onFastTravel?: (destId: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Đợt 3 giai đoạn 5 — nút "Đi nhanh" trên bản đồ: mở danh sách 6 điểm đến
  // (cùng danh sách với nút 🚀 Đi nhanh ở HUD dưới-phải).
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);

    const project = makeProject();

    let raf = 0;
    let lastDraw = 0;
    let lastPos = { ...playerState.pos };
    // Hướng mặc định: quay về phía đông (hướng đi từ cổng vào trường).
    let heading = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      // Throttle vẽ ~10 fps là đủ cho minimap.
      if (now - lastDraw < 100) return;
      lastDraw = now;

      // Cập nhật hướng từ hướng di chuyển thực tế.
      const dx = playerState.pos.x - lastPos.x;
      const dz = playerState.pos.z - lastPos.z;
      if (Math.hypot(dx, dz) > 0.05) {
        heading = Math.atan2(dx, -dz);
        lastPos = { ...playerState.pos };
      }

      ctx.clearRect(0, 0, SIZE, SIZE);

      // Nền tối giản.
      ctx.fillStyle = 'rgba(15, 23, 18, 0.82)';
      ctx.fillRect(0, 0, SIZE, SIZE);

      // Khung bounds.
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        project.x(BOUNDS.minX),
        project.y(BOUNDS.minZ),
        (BOUNDS.maxX - BOUNDS.minX) * project.s,
        (BOUNDS.maxZ - BOUNDS.minZ) * project.s,
      );

      // Hồ Tiền (hình chữ nhật bắc–nam, nước xanh-đen rất tối).
      ctx.fillStyle = 'rgba(18, 36, 31, 0.95)';
      ctx.fillRect(
        project.x(LAKE.center.x - LAKE.halfW),
        project.y(LAKE.center.z - LAKE.halfL),
        LAKE.halfW * 2 * project.s,
        LAKE.halfL * 2 * project.s,
      );
      ctx.strokeStyle = 'rgba(47, 93, 58, 0.9)';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        project.x(LAKE.center.x - LAKE.halfW),
        project.y(LAKE.center.z - LAKE.halfL),
        LAKE.halfW * 2 * project.s,
        LAKE.halfL * 2 * project.s,
      );

      // Quảng trường Trần Đại Nghĩa (xanh ngọc nhạt).
      ctx.fillStyle = 'rgba(191, 227, 216, 0.55)';
      ctx.fillRect(
        project.x(TDN_SQUARE.minX),
        project.y(TDN_SQUARE.minZ),
        (TDN_SQUARE.maxX - TDN_SQUARE.minX) * project.s,
        (TDN_SQUARE.maxZ - TDN_SQUARE.minZ) * project.s,
      );

      // Đường (polyline).
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const road of ROADS) {
        ctx.beginPath();
        road.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(project.x(p.x), project.y(p.z));
          else ctx.lineTo(project.x(p.x), project.y(p.z));
        });
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = Math.max(1.5, road.width * project.s * 0.6);
        ctx.stroke();
      }

      // Tòa nhà (hình chữ nhật) + tên khi đủ chỗ.
      ctx.font = '600 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const b of BUILDING_COLLIDERS) {
        const x = project.x(b.box.minX);
        const y = project.y(b.box.minZ);
        const w = (b.box.maxX - b.box.minX) * project.s;
        const h = (b.box.maxZ - b.box.minZ) * project.s;
        ctx.fillStyle = 'rgba(248, 113, 113, 0.55)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(248, 113, 113, 0.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        // Tên ngắn gọn: chỉ ghi khi chữ vừa trong hình.
        const shortName =
          b.name === 'Thư viện Tạ Quang Bửu'
            ? 'Thư viện'
            : b.name.startsWith('Chân cổng')
              ? ''
              : b.name;
        if (shortName && ctx.measureText(shortName).width + 4 <= w && h >= 11) {
          ctx.fillStyle = '#ffffff';
          ctx.fillText(shortName, x + w / 2, y + h / 2);
        }
      }

      // Vị trí + hướng player (mũi tên).
      const px = project.x(playerState.pos.x);
      const py = project.y(playerState.pos.z);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(heading);
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4.5, 5);
      ctx.lineTo(0, 2.5);
      ctx.lineTo(-4.5, 5);
      ctx.closePath();
      ctx.fillStyle = '#facc15';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Chữ "B" chỉ hướng Bắc ở mép trên.
      ctx.font = '700 10px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('B', SIZE / 2, 2);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pointer-events-auto relative flex flex-col items-end gap-1">
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        aria-label="Bản đồ thu nhỏ khuôn viên Bách khoa"
        className="h-[150px] w-[150px] rounded-xl border border-white/20 shadow-lg"
      />
      {onFastTravel && (
        <>
          <button
            id="minimap-fast-travel"
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded-full bg-[#1c5c3a]/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-sm transition hover:bg-[#16492e]"
          >
            🚀 Đi nhanh
          </button>
          {open && (
            <div
              data-testid="minimap-fast-travel-panel"
              className="absolute right-0 top-full z-30 mt-1 w-[200px] rounded-2xl bg-white p-2 shadow-2xl"
            >
              {FAST_TRAVEL_DESTINATIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  data-testid={`minimap-fast-travel-${d.id}`}
                  onClick={() => {
                    setOpen(false);
                    onFastTravel(d.id);
                  }}
                  className="mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-[#1c5c3a]/10"
                >
                  <span className="text-base">{d.icon}</span>
                  <span>
                    <span className="block text-sm font-bold text-[#2B2B2B]">{d.name}</span>
                    <span className="block text-xs text-[#2B2B2B]/60">{d.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
