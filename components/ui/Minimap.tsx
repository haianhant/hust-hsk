'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BOUNDS,
  BUILDING_COLLIDERS,
  CAMPUS_MAP_BUILDINGS,
  LAKE,
  ROADS,
} from '../../lib/campus';
import { playerState } from '../../lib/playerState';

// Minimap 2D (210×210 px) + Bản đồ Toàn cảnh Khuôn viên Bách Khoa (Phím M) vẽ từ lib/campus.ts.
// -Z = bắc nên phía trên canvas là hướng Bắc ("B").

const SIZE = 210;
const PAD = 10;

function makeProject(size: number, pad: number) {
  const rangeX = BOUNDS.maxX - BOUNDS.minX;
  const rangeZ = BOUNDS.maxZ - BOUNDS.minZ;
  const scale = (size - pad * 2) / Math.max(rangeX, rangeZ);
  const offsetX = (size - rangeX * scale) / 2;
  const offsetY = (size - rangeZ * scale) / 2;
  return {
    x: (wx: number) => offsetX + (wx - BOUNDS.minX) * scale,
    y: (wz: number) => offsetY + (wz - BOUNDS.minZ) * scale,
    s: scale,
  };
}

function renderCampusMap(
  ctx: CanvasRenderingContext2D,
  size: number,
  pad: number,
  heading: number,
  detailed: boolean,
) {
  const project = makeProject(size, pad);
  ctx.clearRect(0, 0, size, size);

  // Nền bản đồ
  ctx.fillStyle = detailed ? 'rgba(14, 24, 18, 0.96)' : 'rgba(15, 23, 18, 0.88)';
  ctx.fillRect(0, 0, size, size);

  // Khung bounds (4 tuyến phố bao quanh)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = detailed ? 2 : 1;
  ctx.strokeRect(
    project.x(BOUNDS.minX),
    project.y(BOUNDS.minZ),
    (BOUNDS.maxX - BOUNDS.minX) * project.s,
    (BOUNDS.maxZ - BOUNDS.minZ) * project.s,
  );

  // Hồ Tiền
  ctx.fillStyle = 'rgba(20, 62, 72, 0.95)';
  ctx.fillRect(
    project.x(LAKE.center.x - LAKE.halfW),
    project.y(LAKE.center.z - LAKE.halfL),
    LAKE.halfW * 2 * project.s,
    LAKE.halfL * 2 * project.s,
  );
  ctx.strokeStyle = 'rgba(72, 168, 148, 0.9)';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    project.x(LAKE.center.x - LAKE.halfW),
    project.y(LAKE.center.z - LAKE.halfL),
    LAKE.halfW * 2 * project.s,
    LAKE.halfL * 2 * project.s,
  );

  // Đường nội bộ (polyline) + các trục đường phố chính theo chuẩn https://hustmap.com/
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const road of ROADS) {
    ctx.beginPath();
    road.points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(project.x(p.x), project.y(p.z));
      else ctx.lineTo(project.x(p.x), project.y(p.z));
    });
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = Math.max(1.8, road.width * project.s * 0.62);
    ctx.stroke();
  }
  // Vẽ thêm Phố Trần Đại Nghĩa, Phố Tạ Quang Bửu và Phố Lê Thanh Nghị đúng hướng tuyến trên https://hustmap.com/
  const extraStreets: Array<Array<{ x: number; z: number }>> = [
    [
      { x: 91, z: -75 },
      { x: 91, z: 36 },
      { x: 70, z: 72 },
    ],
    [
      { x: 91, z: -6 },
      { x: 128, z: -6 },
    ],
    [
      { x: 128, z: -74 },
      { x: 128, z: 36 },
    ],
    [
      { x: 94, z: 75 },
      { x: 120, z: 58 },
      { x: 141, z: 43 },
      { x: 165, z: 43 },
    ],
  ];
  for (const st of extraStreets) {
    ctx.beginPath();
    st.forEach((p, i) => {
      if (i === 0) ctx.moveTo(project.x(p.x), project.y(p.z));
      else ctx.lineTo(project.x(p.x), project.y(p.z));
    });
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.36)';
    ctx.lineWidth = detailed ? 3.5 : 1.8;
    ctx.stroke();
  }

  // Các tòa nhà trong toàn khuôn viên (CAMPUS_MAP_BUILDINGS + BUILDING_COLLIDERS)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const placedLabels: Array<{ minX: number; maxX: number; minY: number; maxY: number }> = [];

  for (const b of CAMPUS_MAP_BUILDINGS) {
    const x = project.x(b.box.minX);
    const y = project.y(b.box.minZ);
    const w = (b.box.maxX - b.box.minX) * project.s;
    const h = (b.box.maxZ - b.box.minZ) * project.s;

    if (b.kind === 'main') {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.72)';
      ctx.strokeStyle = 'rgba(191, 219, 254, 0.95)';
    } else if (b.kind === 'sport') {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.65)';
      ctx.strokeStyle = 'rgba(167, 243, 208, 0.95)';
    } else if (b.kind === 'dorm') {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.68)';
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.95)';
    } else if (b.kind === 'gate') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.82)';
      ctx.strokeStyle = 'rgba(254, 202, 202, 0.98)';
    } else {
      ctx.fillStyle = 'rgba(217, 119, 6, 0.55)';
      ctx.strokeStyle = 'rgba(253, 186, 116, 0.9)';
    }

    ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    if (detailed || (w >= 11 && h >= 6)) {
      const fontPx = detailed ? (w < 18 || h < 9 ? 8 : 9.5) : 8;
      ctx.font = `700 ${fontPx}px system-ui, sans-serif`;
      const tw = ctx.measureText(b.code).width;
      const cx = x + w / 2;
      const cy = y + h / 2;
      const box = {
        minX: cx - tw / 2 - 1,
        maxX: cx + tw / 2 + 1,
        minY: cy - fontPx / 2,
        maxY: cy + fontPx / 2,
      };
      const overlaps = placedLabels.some(
        (prev) =>
          box.minX < prev.maxX &&
          box.maxX > prev.minX &&
          box.minY < prev.maxY &&
          box.maxY > prev.minY,
      );
      if (!overlaps) {
        placedLabels.push(box);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(b.code, cx, cy);
      }
    }
  }

  // Đảm bảo các collider nhỏ khác vẫn hiển thị nhẹ trên minimap
  if (!detailed) {
    for (const b of BUILDING_COLLIDERS) {
      if (b.name.startsWith('Ghế') || b.name.startsWith('Bờ kè')) continue;
      const x = project.x(b.box.minX);
      const y = project.y(b.box.minZ);
      const w = (b.box.maxX - b.box.minX) * project.s;
      const h = (b.box.maxZ - b.box.minZ) * project.s;
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.4)';
      ctx.strokeRect(x, y, w, h);
    }
  }

  // Tên 4 tuyến phố bao quanh trên bản đồ chi tiết
  if (detailed) {
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillStyle = '#FDE047';
    ctx.fillText('⬆ ĐƯỜNG ĐẠI CỒ VIỆT (Cổng chính Số 1)', size / 2, 12);
    ctx.fillText('⬇ ĐƯỜNG TẠ QUANG BỬU / LÊ THANH NGHỊ (Cổng Nam)', size / 2, size - 10);
  }

  // Vị trí + hướng player (mũi tên vàng)
  const px = project.x(playerState.pos.x);
  const py = project.y(playerState.pos.z);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(heading);
  ctx.beginPath();
  const arrowScale = detailed ? 1.35 : 1.15;
  ctx.moveTo(0, -6 * arrowScale);
  ctx.lineTo(4.5 * arrowScale, 5 * arrowScale);
  ctx.lineTo(0, 2.5 * arrowScale);
  ctx.lineTo(-4.5 * arrowScale, 5 * arrowScale);
  ctx.closePath();
  ctx.fillStyle = '#facc15';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  if (!detailed) {
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('B', size / 2, 2);
  }
}

export default function Minimap(_props?: { onFastTravel?: (destId: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fullCanvasRef = useRef<HTMLCanvasElement>(null);
  const [fullMapOpen, setFullMapOpen] = useState(false);

  // Phím M mở/đóng Bản đồ toàn cảnh Bách khoa
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.code === 'KeyM' && !e.repeat) {
        setFullMapOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);

    let raf = 0;
    let lastDraw = 0;
    let lastPos = { ...playerState.pos };
    let heading = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - lastDraw < 100) return;
      lastDraw = now;

      const dx = playerState.pos.x - lastPos.x;
      const dz = playerState.pos.z - lastPos.z;
      if (Math.hypot(dx, dz) > 0.05) {
        heading = Math.atan2(dx, -dz);
        lastPos = { ...playerState.pos };
      }

      renderCampusMap(ctx, SIZE, PAD, heading, false);

      const fullCanvas = fullCanvasRef.current;
      if (fullCanvas) {
        const fctx = fullCanvas.getContext('2d');
        if (fctx) {
          renderCampusMap(fctx, 480, 26, heading, true);
        }
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      data-testid="minimap"
      className="pointer-events-auto relative flex flex-col items-end gap-1"
    >
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          onClick={() => setFullMapOpen(true)}
          title="Bấm vào bản đồ (hoặc phím M) để mở Bản đồ Toàn cảnh ĐHBK Hà Nội"
          aria-label="Bản đồ thu nhỏ khuôn viên Bách khoa"
          className="h-[210px] w-[210px] cursor-pointer rounded-2xl border border-white/25 shadow-xl"
        />
        <button
          id="open-full-map"
          type="button"
          onClick={() => setFullMapOpen(true)}
          className="absolute bottom-2 right-2 rounded-md bg-black/65 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-black/85"
        >
          🗺️ M
        </button>
      </div>

      {/* Modal Bản đồ Toàn cảnh ĐHBK Hà Nội (Phím M) */}
      {fullMapOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div
            data-testid="full-campus-map-modal"
            className="w-full max-w-xl rounded-2xl border border-white/20 bg-[#142018] p-4 text-white shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#FDE047]">
                  🗺️ SƠ ĐỒ TỔNG THỂ ĐẠI HỌC BÁCH KHOA HÀ NỘI · 河内百科大学全景图
                </h2>
                <p className="text-xs text-white/70">
                  C1 · C2 · C9 · C3–C10 · C6–C7–C15 · D2A–D9 · Thư viện TQB · Hồ Tiền · B1 SoICT · Nhà thi đấu & Nhà TC · KTX B3–B13
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng bản đồ toàn cảnh"
                onClick={() => setFullMapOpen(false)}
                className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white hover:bg-white/25"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col items-center justify-center">
              <canvas
                ref={fullCanvasRef}
                width={480}
                height={480}
                className="h-[340px] w-[340px] shrink-0 rounded-xl border border-white/20 sm:h-[440px] sm:w-[440px]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
