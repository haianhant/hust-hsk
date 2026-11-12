'use client';

import { useEffect, useRef, useState } from 'react';
import {
  type AABB,
  BOUNDS,
  BUILDING_COLLIDERS,
  C1_FOUNTAIN,
  CAMPUS_MAP_BUILDINGS,
  CAMPUS_MAP_PLAZAS,
  LAKE,
  ROADS,
  TDN_DIVIDED_MEDIAN,
} from '../../lib/campus';
import { playerState } from '../../lib/playerState';

// Minimap 2D (210×210 px) + Bản đồ Toàn cảnh Khuôn viên Bách Khoa (Phím M) vẽ từ lib/campus.ts.
// -Z = bắc nên phía trên canvas là hướng Bắc ("B").

const SIZE = 210;
const PAD = 10;
const FULL_SIZE = 540;
const FULL_PAD = 28;

/** Khung phóng lớn Khuôn viên chính (Giải Phóng – Đại Cồ Việt – Trần Đại Nghĩa – ĐH Xây dựng). */
const MAIN_CAMPUS_BOUNDS: AABB = {
  minX: -96,
  maxX: 94.2,
  minZ: -76,
  maxZ: 92,
};

type MapScope = 'main' | 'all';

function makeProject(size: number, pad: number, viewport: AABB = BOUNDS) {
  const rangeX = viewport.maxX - viewport.minX;
  const rangeZ = viewport.maxZ - viewport.minZ;
  const scale = (size - pad * 2) / Math.max(rangeX, rangeZ);
  const offsetX = (size - rangeX * scale) / 2;
  const offsetY = (size - rangeZ * scale) / 2;
  return {
    x: (wx: number) => offsetX + (wx - viewport.minX) * scale,
    y: (wz: number) => offsetY + (wz - viewport.minZ) * scale,
    s: scale,
    frameX: offsetX,
    frameY: offsetY,
    frameW: rangeX * scale,
    frameH: rangeZ * scale,
  };
}

function renderCampusMap(
  ctx: CanvasRenderingContext2D,
  size: number,
  pad: number,
  heading: number,
  detailed: boolean,
  scope: MapScope = 'all',
) {
  const viewport = detailed && scope === 'main' ? MAIN_CAMPUS_BOUNDS : BOUNDS;
  const project = makeProject(size, pad, viewport);
  ctx.clearRect(0, 0, size, size);

  // Nền bản đồ
  ctx.fillStyle = detailed ? 'rgba(14, 24, 18, 0.97)' : 'rgba(15, 23, 18, 0.88)';
  ctx.fillRect(0, 0, size, size);

  // Khung cắt vùng hiển thị để khi phóng lớn Khuôn viên chính không tràn ra ngoài viền
  ctx.save();
  ctx.beginPath();
  ctx.rect(project.frameX, project.frameY, project.frameW, project.frameH);
  ctx.clip();

  // Lớp Quảng trường (Quảng trường C1, Quảng trường ngã 5, Quảng trường Trần Đại Nghĩa, Sân Thư viện)
  for (const plaza of CAMPUS_MAP_PLAZAS) {
    const px = project.x(plaza.box.minX);
    const py = project.y(plaza.box.minZ);
    const pw = (plaza.box.maxX - plaza.box.minX) * project.s;
    const ph = (plaza.box.maxZ - plaza.box.minZ) * project.s;

    if (plaza.tone === 'memorial') {
      ctx.fillStyle = 'rgba(52, 211, 153, 0.24)';
      ctx.strokeStyle = 'rgba(110, 231, 183, 0.72)';
    } else if (plaza.tone === 'terracotta') {
      ctx.fillStyle = 'rgba(251, 146, 60, 0.18)';
      ctx.strokeStyle = 'rgba(253, 186, 116, 0.52)';
    } else {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.20)';
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
    }
    ctx.lineWidth = detailed ? 1.2 : 0.8;
    if (detailed) ctx.setLineDash([3, 2]);
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeRect(px, py, pw, ph);
    if (detailed) ctx.setLineDash([]);
  }

  // Đài phun nước Bách Khoa tại tâm Quảng trường C1
  if (detailed) {
    const fx = project.x(C1_FOUNTAIN.center.x);
    const fy = project.y(C1_FOUNTAIN.center.z);
    const fr = Math.max(
      2.6,
      ((C1_FOUNTAIN.box.maxX - C1_FOUNTAIN.box.minX) / 2) * project.s,
    );
    ctx.beginPath();
    ctx.arc(fx, fy, fr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.78)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.95)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

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
  if (detailed) {
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(153, 246, 228, 0.92)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HỒ TIỀN', project.x(LAKE.center.x), project.y(LAKE.center.z));
  }

  // Đường nội bộ (polyline) + các trục đường phố chính theo chuẩn https://hustmap.com/
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const road of ROADS) {
    ctx.beginPath();
    road.points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(project.x(p.x), project.y(p.z));
      else ctx.lineTo(project.x(p.x), project.y(p.z));
    });
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
    ctx.lineWidth = Math.max(1.8, road.width * project.s * 0.58);
    ctx.stroke();
  }

  // Dải phân cách cây xanh chia 2 nhánh 1 chiều vào/ra Cổng Trần Đại Nghĩa (yeucau4)
  {
    const mx = project.x(TDN_DIVIDED_MEDIAN.box.minX);
    const my = project.y(TDN_DIVIDED_MEDIAN.box.minZ);
    const mw = (TDN_DIVIDED_MEDIAN.box.maxX - TDN_DIVIDED_MEDIAN.box.minX) * project.s;
    const mh = Math.max(2.2, (TDN_DIVIDED_MEDIAN.box.maxZ - TDN_DIVIDED_MEDIAN.box.minZ) * project.s);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.72)';
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.92)';
    ctx.lineWidth = detailed ? 1.1 : 0.7;
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeRect(mx, my, mw, mh);
    if (detailed) {
      ctx.fillStyle = 'rgba(254, 240, 138, 0.92)';
      ctx.font = '700 8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('← VÀO', project.x(75), project.y(-10.4));
      ctx.fillText('RA →', project.x(75), project.y(-1.6));
    }
  }
  // Vẽ thêm Phố Trần Đại Nghĩa, Phố Tạ Quang Bửu và Phố Lê Thanh Nghị đúng hướng tuyến trên https://hustmap.com/
  const extraStreets: Array<Array<{ x: number; z: number }>> = [
    [
      { x: 93, z: -75 },
      { x: 93, z: 46 },
      { x: 79, z: 76 },
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

  // Các tòa nhà, bãi gửi xe & cổng trường trong khuôn viên (CAMPUS_MAP_BUILDINGS)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const placedLabels: Array<{ minX: number; maxX: number; minY: number; maxY: number }> = [];

  for (const b of CAMPUS_MAP_BUILDINGS) {
    if (detailed && scope === 'main' && (b.kind === 'sport' || b.kind === 'dorm' || b.box.minX > 93.8)) {
      continue;
    }
    if (
      b.box.maxX < viewport.minX ||
      b.box.minX > viewport.maxX ||
      b.box.maxZ < viewport.minZ ||
      b.box.minZ > viewport.maxZ
    ) {
      continue;
    }
    const x = project.x(b.box.minX);
    const y = project.y(b.box.minZ);
    const w = Math.max(3, (b.box.maxX - b.box.minX) * project.s);
    const h = Math.max(3, (b.box.maxZ - b.box.minZ) * project.s);

    if (b.kind === 'main') {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.76)';
      ctx.strokeStyle = 'rgba(191, 219, 254, 0.96)';
    } else if (b.kind === 'parking') {
      ctx.fillStyle = 'rgba(14, 165, 233, 0.74)';
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.96)';
    } else if (b.kind === 'sport') {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.68)';
      ctx.strokeStyle = 'rgba(167, 243, 208, 0.95)';
    } else if (b.kind === 'dorm') {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.68)';
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.95)';
    } else if (b.kind === 'gate') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.86)';
      ctx.strokeStyle = 'rgba(254, 202, 202, 0.98)';
    } else {
      ctx.fillStyle = 'rgba(217, 119, 6, 0.58)';
      ctx.strokeStyle = 'rgba(253, 186, 116, 0.92)';
    }

    ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    if (detailed || (w >= 11 && h >= 6 && b.kind !== 'parking')) {
      const fontPx = detailed
        ? scope === 'main'
          ? w < 16 || h < 9
            ? 8
            : 9.5
          : w < 16 || h < 9
            ? 7.5
            : 9
        : 8;
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
        ctx.fillStyle = b.kind === 'parking' ? '#E0F2FE' : '#FFFFFF';
        ctx.fillText(b.code, cx, cy);
      }
    }
  }

  // Nhãn phụ cho 3 Quảng trường chính trong chế độ phóng lớn
  if (detailed && scope === 'main') {
    const plazaHints = [
      { text: 'QT. Trần Đại Nghĩa', wx: -91.5, wz: -23.0, color: '#6EE7B7' },
      { text: 'Quảng trường C1', wx: -58.0, wz: -46.8, color: '#E2E8F0' },
      { text: 'Ngã 5', wx: -35.8, wz: -44.5, color: '#FDE68A' },
    ];
    ctx.font = '700 8.5px system-ui, sans-serif';
    for (const h of plazaHints) {
      const hx = project.x(h.wx);
      const hy = project.y(h.wz);
      const tw = ctx.measureText(h.text).width;
      const box = { minX: hx - tw / 2 - 1, maxX: hx + tw / 2 + 1, minY: hy - 5, maxY: hy + 5 };
      const overlaps = placedLabels.some(
        (prev) =>
          box.minX < prev.maxX &&
          box.maxX > prev.minX &&
          box.minY < prev.maxY &&
          box.maxY > prev.minY,
      );
      if (!overlaps) {
        placedLabels.push(box);
        ctx.fillStyle = h.color;
        ctx.fillText(h.text, hx, hy);
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
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.35)';
      ctx.strokeRect(x, y, w, h);
    }
  }

  // Vị trí + hướng player (mũi tên vàng)
  const px = Math.min(
    project.frameX + project.frameW - 4,
    Math.max(project.frameX + 4, project.x(playerState.pos.x)),
  );
  const py = Math.min(
    project.frameY + project.frameH - 4,
    Math.max(project.frameY + 4, project.y(playerState.pos.z)),
  );
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(heading);
  ctx.beginPath();
  const arrowScale = detailed ? 1.38 : 1.15;
  ctx.moveTo(0, -6 * arrowScale);
  ctx.lineTo(4.5 * arrowScale, 5 * arrowScale);
  ctx.lineTo(0, 2.5 * arrowScale);
  ctx.lineTo(-4.5 * arrowScale, 5 * arrowScale);
  ctx.closePath();
  ctx.fillStyle = '#facc15';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  ctx.restore();

  // Viền khung bản đồ
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.36)';
  ctx.lineWidth = detailed ? 1.8 : 1;
  ctx.strokeRect(project.frameX, project.frameY, project.frameW, project.frameH);

  // Tên 4 tuyến phố / biên bao quanh trên bản đồ chi tiết
  if (detailed) {
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillStyle = '#FDE047';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⬆ ĐƯỜNG ĐẠI CỒ VIỆT (Cổng Số 1)', size / 2, 13);
    ctx.fillText(
      scope === 'main'
        ? '⬇ BIÊN NAM KHUÔN VIÊN CHÍNH (Giáp ĐH Xây dựng · Phố Trần Đại Nghĩa)'
        : '⬇ ĐƯỜNG TẠ QUANG BỬU / LÊ THANH NGHỊ (Khu Thể thao & SVĐ)',
      size / 2,
      size - 12,
    );
    ctx.save();
    ctx.translate(12, size / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(253, 224, 71, 0.85)';
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.fillText('ĐƯỜNG GIẢI PHÓNG (Cổng Parabol)', 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(size - 12, size / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = 'rgba(253, 224, 71, 0.85)';
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.fillText(
      scope === 'main' ? 'PHỐ TRẦN ĐẠI NGHĨA (Cổng B8 · C7)' : 'PHỐ TẠ QUANG BỬU / ĐÔNG B1',
      0,
      0,
    );
    ctx.restore();
  } else {
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
  const [mapScope, setMapScope] = useState<MapScope>('main');
  const mapScopeRef = useRef<MapScope>(mapScope);
  mapScopeRef.current = mapScope;
  const headingRef = useRef(0);

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

  // Cấu hình độ phân giải sắc nét (HiDPI) & vẽ tức thì khi mở modal hoặc đổi chế độ phóng lớn
  useEffect(() => {
    if (!fullMapOpen) return;
    const fullCanvas = fullCanvasRef.current;
    if (!fullCanvas) return;
    const fctx = fullCanvas.getContext('2d');
    if (!fctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    fullCanvas.width = FULL_SIZE * dpr;
    fullCanvas.height = FULL_SIZE * dpr;
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderCampusMap(fctx, FULL_SIZE, FULL_PAD, headingRef.current, true, mapScope);
  }, [fullMapOpen, mapScope]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    let lastDraw = 0;
    let lastPos = { ...playerState.pos };

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - lastDraw < 100) return;
      lastDraw = now;

      const dx = playerState.pos.x - lastPos.x;
      const dz = playerState.pos.z - lastPos.z;
      if (Math.hypot(dx, dz) > 0.05) {
        headingRef.current = Math.atan2(dx, -dz);
        lastPos = { ...playerState.pos };
      }

      renderCampusMap(ctx, SIZE, PAD, headingRef.current, false, 'all');

      const fullCanvas = fullCanvasRef.current;
      if (fullCanvas) {
        const fctx = fullCanvas.getContext('2d');
        if (fctx) {
          renderCampusMap(
            fctx,
            FULL_SIZE,
            FULL_PAD,
            headingRef.current,
            true,
            mapScopeRef.current,
          );
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-xs">
          <div
            data-testid="full-campus-map-modal"
            className="w-full max-w-2xl rounded-2xl border border-white/20 bg-[#142018] p-4 text-white shadow-2xl"
          >
            <div className="mb-2.5 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#FDE047]">
                  🗺️ BẢN ĐỒ HUSTVERSE — ĐẠI HỌC BÁCH KHOA HÀ NỘI (CHUẨN HUSTMAP)
                </h2>
                <p className="text-xs text-white/75">
                  QT. C1 · Ngã 5 · QT. Trần Đại Nghĩa · C1–C15 · D2A–D9 · Thư viện TQB · Hồ Tiền · 9 Bãi gửi xe & Hầm xe C7 · B1 · KTX & SVĐ
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng bản đồ toàn cảnh"
                onClick={() => setFullMapOpen(false)}
                className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white hover:bg-white/25"
              >
                ✕
              </button>
            </div>

            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-lg border border-white/15 bg-black/35 p-0.5 text-xs">
                <button
                  type="button"
                  data-testid="map-scope-main"
                  onClick={() => setMapScope('main')}
                  className={`rounded-md px-2.5 py-1 font-semibold transition ${
                    mapScope === 'main'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  🔍 Khuôn viên chính (Phóng lớn)
                </button>
                <button
                  type="button"
                  data-testid="map-scope-all"
                  onClick={() => setMapScope('all')}
                  className={`rounded-md px-2.5 py-1 font-semibold transition ${
                    mapScope === 'all'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  🌐 Toàn trường (+ KTX · B1 · SVĐ)
                </button>
              </div>
              <span className="text-[11px] text-white/65">Nhấn phím M để đóng/mở nhanh</span>
            </div>

            <div className="flex flex-col items-center justify-center">
              <canvas
                ref={fullCanvasRef}
                width={FULL_SIZE}
                height={FULL_SIZE}
                className="h-[340px] w-[340px] shrink-0 rounded-xl border border-white/20 sm:h-[480px] sm:w-[480px]"
              />
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-white/85">
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-xs border border-blue-200 bg-blue-500/80" />
                Tòa chính
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-xs border border-orange-200 bg-amber-600/70" />
                Giảng đường / Phụ trợ
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-xs border border-sky-200 bg-sky-500/80" />
                Điểm gửi xe / Hầm xe
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-xs border border-dashed border-slate-200 bg-slate-200/25" />
                Quảng trường
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-xs border border-yellow-200 bg-amber-500/75" />
                KTX
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-xs border border-emerald-200 bg-emerald-500/75" />
                Thể thao
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-xs border border-red-200 bg-red-500/85" />
                Cổng trường
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
