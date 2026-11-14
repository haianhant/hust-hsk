'use client';

// ---------------------------------------------------------------------------
// features/campus/ui/PhotoModeOverlay.tsx — Chế độ Chụp ảnh & Xuất Bưu thiếp
// Kỷ yếu HUSTVerse 1280×820 (dùng Be Vietnam Pro + CANVAS_VN_FONT).
// Module ID: feature.campus.photo-mode
// ---------------------------------------------------------------------------

import { useState } from 'react';
import {
  EMOTE_DEFINITIONS,
} from '../../../components/three/StudentAvatar';
import {
  CANVAS_VN_FONT,
  wrapVietnameseCanvasContext,
} from '../../../components/three/TextPlate';
import type { CharacterProfile } from '../../../lib/identity';
import type { AvatarEmoteId, CameraViewMode, TimeOfDay } from '../../../lib/playerState';
import { getCampusTitleDef, getSchoolBadgeDef } from '../quests/campus-quests';

export type PhotoFilterId = 'none' | 'warm-sunset' | 'film-vintage' | 'vivid-bk';

export const PHOTO_FILTERS: ReadonlyArray<{
  id: PhotoFilterId;
  label: string;
  cssFilter: string;
}> = [
  { id: 'none', label: 'Nguyên bản', cssFilter: 'none' },
  { id: 'warm-sunset', label: 'Nắng vàng HUST', cssFilter: 'saturate(1.22) sepia(0.18) contrast(1.06)' },
  { id: 'film-vintage', label: 'Film Kỷ yếu', cssFilter: 'contrast(1.1) sepia(0.28) brightness(0.98)' },
  { id: 'vivid-bk', label: 'Rực rỡ 3D', cssFilter: 'saturate(1.32) contrast(1.08) brightness(1.03)' },
] as const;

export interface PhotoModeOverlayProps {
  open: boolean;
  zone: string;
  characterProfile: CharacterProfile;
  timeOfDay: TimeOfDay;
  viewMode: CameraViewMode;
  filterId: PhotoFilterId;
  onChangeFilter: (next: PhotoFilterId) => void;
  onCycleTimeOfDay: () => void;
  onToggleViewMode: () => void;
  onTriggerEmote: (emoteId: AvatarEmoteId) => void;
  onExportedPostcard?: (dataUrl: string) => void;
  onClose: () => void;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function renderHustversePostcard(params: {
  snapshotDataUrl: string;
  caption: string;
  zone: string;
  characterProfile: CharacterProfile;
  cssFilter: string;
}): Promise<string> {
  const img = await loadImage(params.snapshotDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 820;
  const rawCtx = canvas.getContext('2d');
  if (!rawCtx) {
    throw new Error('Không thể khởi tạo Canvas xuất Bưu thiếp');
  }
  const ctx = wrapVietnameseCanvasContext(rawCtx);

  // Nền giấy kem kỷ yếu + viền đỏ Bách Khoa
  ctx.fillStyle = '#FDFBF7';
  ctx.fillRect(0, 0, 1280, 820);
  ctx.strokeStyle = '#B5121B';
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, 1256, 796);

  // Khung ảnh 3D trung tâm (1216 × 640, crop cover giữ đúng tỉ lệ khung hình)
  const vx = 32;
  const vy = 32;
  const vw = 1216;
  const vh = 640;

  ctx.save();
  drawRoundedRectPath(ctx, vx, vy, vw, vh, 18);
  ctx.clip();
  ctx.filter = params.cssFilter && params.cssFilter !== 'none' ? params.cssFilter : 'none';
  const targetRatio = vw / vh;
  const imgRatio = img.width / Math.max(1, img.height);
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (imgRatio > targetRatio) {
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / targetRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, vx, vy, vw, vh);
  ctx.filter = 'none';

  // Nhãn góc ảnh nhẹ — đo bề rộng chữ thật để viên pill ôm gọn nhãn
  const cornerBadgeText = 'HUSTVERSE · BÁCH KHOA 3D';
  ctx.font = `700 17px ${CANVAS_VN_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const cornerBadgeW = Math.ceil(ctx.measureText(cornerBadgeText).width) + 38;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
  drawRoundedRectPath(ctx, vx + 18, vy + 18, cornerBadgeW, 38, 19);
  ctx.fill();
  ctx.fillStyle = '#FCD34D';
  ctx.fillText(cornerBadgeText, vx + 37, vy + 37);
  ctx.restore();

  // Viền mỏng quanh khung ảnh
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.14)';
  ctx.lineWidth = 2;
  drawRoundedRectPath(ctx, vx, vy, vw, vh, 18);
  ctx.stroke();

  // Dải chân trang Kỷ yếu (y = 688..800)
  const schoolBadge = getSchoolBadgeDef(params.characterProfile.schoolId);
  const titleBadge = getCampusTitleDef(params.characterProfile.titleId);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const cleanCaption =
    params.caption.trim() || 'Kỷ niệm một chiều thanh xuân tại Đại học Bách khoa Hà Nội';
  ctx.fillStyle = '#1E293B';
  ctx.font = `700 28px ${CANVAS_VN_FONT}`;
  ctx.fillText(`“${cleanCaption}”`, 36, 718, 820);

  const metaParts: string[] = [
    `${params.characterProfile.name} (${params.characterProfile.mssv})`,
  ];
  if (schoolBadge.id !== 'none') metaParts.push(schoolBadge.shortLabel);
  if (titleBadge.id !== 'none') metaParts.push(titleBadge.label);
  ctx.fillStyle = '#B5121B';
  ctx.font = `700 19px ${CANVAS_VN_FONT}`;
  ctx.fillText(metaParts.join(' · '), 36, 764, 820);

  // Cột phải chân trang: Địa điểm + Ngày tháng + Link web
  const now = new Date();
  const dateText = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#334155';
  ctx.font = `700 19px ${CANVAS_VN_FONT}`;
  ctx.fillText(`📍 ${params.zone}`, 1242, 718, 370);

  ctx.fillStyle = '#64748B';
  ctx.font = `600 16px ${CANVAS_VN_FONT}`;
  ctx.fillText(`${dateText} · hustverse.vercel.app`, 1242, 764, 370);

  return canvas.toDataURL('image/png');
}

export function PhotoModeOverlay({
  open,
  zone,
  characterProfile,
  timeOfDay,
  viewMode,
  filterId,
  onChangeFilter,
  onCycleTimeOfDay,
  onToggleViewMode,
  onTriggerEmote,
  onExportedPostcard,
  onClose,
}: PhotoModeOverlayProps) {
  const [caption, setCaption] = useState<string>('');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  if (!open) return null;

  const activeFilter = PHOTO_FILTERS.find((f) => f.id === filterId) ?? PHOTO_FILTERS[0];

  const handleExport = async () => {
    if (exporting) return;
    const captureFn = window.__bkhnCaptureCanvas;
    if (!captureFn) return;
    setExporting(true);
    try {
      const snap = captureFn();
      const postcardUrl = await renderHustversePostcard({
        snapshotDataUrl: snap,
        caption,
        zone,
        characterProfile,
        cssFilter: activeFilter.cssFilter,
      });
      const link = document.createElement('a');
      link.href = postcardUrl;
      link.download = `hustverse-postcard-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onExportedPostcard?.(postcardUrl);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      data-testid="photo-mode-overlay"
      className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between p-3 sm:p-4"
    >
      {/* Lưới bố cục 1/3 tùy chọn — hoàn toàn không chặn chuột */}
      {showGrid && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0">
          <div className="absolute left-1/3 top-0 h-full w-px bg-white/20" />
          <div className="absolute left-2/3 top-0 h-full w-px bg-white/20" />
          <div className="absolute top-1/3 left-0 h-px w-full bg-white/20" />
          <div className="absolute top-2/3 left-0 h-px w-full bg-white/20" />
        </div>
      )}

      {/* Thanh tiêu đề trên cùng */}
      <div className="pointer-events-auto relative z-10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/75 px-4 py-1.5 text-xs font-bold text-white shadow-xl backdrop-blur-md sm:text-sm">
          <span>📸 Studio Kỷ yếu HUSTVerse</span>
          <span className="hidden text-white/60 sm:inline">· Kéo chuột xoay góc chụp</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGrid((g) => !g)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold backdrop-blur-md transition ${
              showGrid
                ? 'border-amber-300/60 bg-amber-500/85 text-slate-950'
                : 'border-white/20 bg-slate-950/75 text-white'
            }`}
          >
            # Lưới 1/3
          </button>
          <button
            id="photo-mode-close"
            data-testid="photo-mode-close"
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/25 bg-slate-950/80 px-4 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-black sm:text-sm"
          >
            ✕ Thoát (P)
          </button>
        </div>
      </div>

      {/* Thanh điều khiển Studio phía dưới */}
      <div className="pointer-events-auto relative z-10 mx-auto w-full max-w-3xl rounded-3xl border border-white/20 bg-slate-950/82 p-3 text-white shadow-2xl backdrop-blur-xl sm:p-4">
        {/* Hàng 1: Bộ lọc màu + Góc nhìn + Thời gian */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {PHOTO_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                data-testid={`photo-filter-${f.id}`}
                onClick={() => onChangeFilter(f.id)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  filterId === f.id
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'bg-white/10 text-white/85 hover:bg-white/20'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="photo-toggle-view"
              onClick={onToggleViewMode}
              className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white transition hover:bg-white/25"
            >
              {viewMode === 'pov' ? '👁️ Góc nhìn 1 (POV)' : '🎥 Góc thứ 3'}
            </button>
            <button
              type="button"
              data-testid="photo-toggle-time"
              onClick={onCycleTimeOfDay}
              className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white transition hover:bg-white/25"
            >
              {timeOfDay === 'day' ? '☀️ Ngày' : timeOfDay === 'sunset' ? '🌇 Hoàng hôn' : '🌙 Đêm'}
            </button>
          </div>
        </div>

        {/* Hàng 2: Pose / Emote nhanh */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/10 py-2">
          <span className="mr-1 text-[11px] font-bold text-amber-300">Tạo dáng:</span>
          {EMOTE_DEFINITIONS.map((em) => (
            <button
              key={em.id}
              type="button"
              onClick={() => onTriggerEmote(em.id)}
              className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-white/25"
            >
              {em.icon} {em.labelVi}
            </button>
          ))}
        </div>

        {/* Hàng 3: Lời chúc kỷ yếu + Nút Xuất Bưu thiếp PNG */}
        <div className="flex flex-col gap-2 border-t border-white/10 pt-2.5 sm:flex-row sm:items-center">
          <input
            type="text"
            maxLength={60}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Nhập dòng kỷ niệm lên bưu thiếp (tối đa 60 ký tự)..."
            data-testid="photo-caption-input"
            className="flex-1 rounded-2xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs text-white placeholder-white/50 focus:border-amber-300 focus:outline-none sm:text-sm"
          />
          <button
            type="button"
            data-testid="export-postcard-btn"
            disabled={exporting}
            onClick={handleExport}
            className="rounded-2xl bg-[#B5121B] px-5 py-2 text-xs font-extrabold text-white shadow-lg transition hover:bg-[#8F1418] disabled:opacity-60 sm:text-sm"
          >
            {exporting ? '⏳ Đang xuất...' : '📸 Xuất Bưu thiếp PNG'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PhotoModeOverlay;
