'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/MatchPostcard.tsx — Ảnh kỷ niệm PNG 1200×675
// tổng kết ván Bóng Đêm KTX (thuần Canvas 2D, tiếng Việt NFC chuẩn dấu,
// tuyệt đối KHÔNG đưa MSSV, sessionId hoặc reconnectToken lên ảnh).
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { CANVAS_VN_FONT, wrapVietnameseCanvasContext } from '../../../components/three/TextPlate';
import { FACTION_LABELS } from '../domain/roles';
import type { BoardGameFactionId, BoardGamePublicGameView } from '../network/contracts';

const POSTCARD_WIDTH = 1200;
const POSTCARD_HEIGHT = 675;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function fitSingleLineText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  const normalized = text.normalize('NFC');
  if (ctx.measureText(normalized).width <= maxWidth) {
    return normalized;
  }
  let trimmed = normalized;
  while (trimmed.length > 4 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

function factionColors(faction: BoardGameFactionId): {
  border: string;
  badgeBg: string;
  badgeText: string;
} {
  if (faction === 'lantern-guard') {
    return {
      border: 'rgba(245, 158, 11, 0.55)',
      badgeBg: 'rgba(245, 158, 11, 0.18)',
      badgeText: '#FCD34D',
    };
  }
  if (faction === 'mist-order') {
    return {
      border: 'rgba(139, 92, 246, 0.6)',
      badgeBg: 'rgba(139, 92, 246, 0.2)',
      badgeText: '#C4B5FD',
    };
  }
  return {
    border: 'rgba(16, 185, 129, 0.55)',
    badgeBg: 'rgba(16, 185, 129, 0.18)',
    badgeText: '#6EE7B7',
  };
}

/**
 * Tạo ảnh PNG `1200×675` tổng kết ván đấu Bóng Đêm KTX dưới dạng Data URL.
 * Chỉ sử dụng thông tin công khai sau khi kết thúc trận (`displayName`, `roleName`,
 * `faction`, kết quả thắng/thua); tuyệt đối không đọc hay hiển thị MSSV.
 */
export function renderMatchPostcardDataUrl(
  publicGame: BoardGamePublicGameView,
  inviteCode?: string | null,
): string | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = POSTCARD_WIDTH;
  canvas.height = POSTCARD_HEIGHT;
  const rawCtx = canvas.getContext('2d');
  if (!rawCtx) return null;
  const ctx = wrapVietnameseCanvasContext(rawCtx);

  // 1. Nền đêm ký túc xá ấm áp + ánh đèn lồng & màn sương
  const bgGrad = ctx.createLinearGradient(0, 0, POSTCARD_WIDTH, POSTCARD_HEIGHT);
  bgGrad.addColorStop(0, '#090D1F');
  bgGrad.addColorStop(0.5, '#171330');
  bgGrad.addColorStop(1, '#0E1729');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, POSTCARD_WIDTH, POSTCARD_HEIGHT);

  const lanternGlow = ctx.createRadialGradient(210, 140, 20, 210, 140, 380);
  lanternGlow.addColorStop(0, 'rgba(245, 158, 11, 0.24)');
  lanternGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = lanternGlow;
  ctx.fillRect(0, 0, POSTCARD_WIDTH, POSTCARD_HEIGHT);

  const mistGlow = ctx.createRadialGradient(1020, 520, 20, 1020, 520, 400);
  mistGlow.addColorStop(0, 'rgba(139, 92, 246, 0.22)');
  mistGlow.addColorStop(1, 'rgba(139, 92, 246, 0)');
  ctx.fillStyle = mistGlow;
  ctx.fillRect(0, 0, POSTCARD_WIDTH, POSTCARD_HEIGHT);

  // Lưới trang trí nhẹ
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
  ctx.lineWidth = 1;
  for (let gx = 48; gx < POSTCARD_WIDTH; gx += 48) {
    ctx.beginPath();
    ctx.moveTo(gx, 24);
    ctx.lineTo(gx, POSTCARD_HEIGHT - 24);
    ctx.stroke();
  }
  for (let gy = 48; gy < POSTCARD_HEIGHT; gy += 48) {
    ctx.beginPath();
    ctx.moveTo(24, gy);
    ctx.lineTo(POSTCARD_WIDTH - 24, gy);
    ctx.stroke();
  }

  // Khung viền kép
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.42)';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 20, 20, POSTCARD_WIDTH - 40, POSTCARD_HEIGHT - 40, 24);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(248, 250, 252, 0.12)';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, 28, 28, POSTCARD_WIDTH - 56, POSTCARD_HEIGHT - 56, 20);
  ctx.stroke();

  // 2. Đầu trang: Nhãn CLB & Tiêu đề
  ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
  ctx.lineWidth = 1.2;
  drawRoundedRect(ctx, 56, 48, 326, 34, 17);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FCD34D';
  ctx.font = `700 15px ${CANVAS_VN_FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('HUSTVerse — CLB Board Game KTX'.normalize('NFC'), 74, 65);

  const safeRound = Math.min(publicGame.round, publicGame.maxRounds);
  const statsText =
    `Vòng ${safeRound}/${publicGame.maxRounds}  ·  Tín hiệu ${publicGame.signalProgress}/${publicGame.maxTrackValue}  ·  Nhiễu sóng ${publicGame.mistProgress}/${publicGame.maxTrackValue}`.normalize(
      'NFC',
    );
  ctx.textAlign = 'right';
  ctx.fillStyle = '#CBD5E1';
  ctx.font = `600 16px ${CANVAS_VN_FONT}`;
  ctx.fillText(statsText, POSTCARD_WIDTH - 56, 65);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#F8FAFC';
  ctx.font = `700 32px ${CANVAS_VN_FONT}`;
  ctx.fillText('BÓNG ĐÊM KTX · TỔNG KẾT VÁN ĐẤU'.normalize('NFC'), 56, 116);

  // 3. Banner đội/người chiến thắng
  drawRoundedRect(ctx, 56, 146, POSTCARD_WIDTH - 112, 102, 18);
  const winGrad = ctx.createLinearGradient(56, 146, POSTCARD_WIDTH - 56, 248);
  winGrad.addColorStop(0, 'rgba(245, 158, 11, 0.2)');
  winGrad.addColorStop(1, 'rgba(30, 41, 59, 0.85)');
  ctx.fillStyle = winGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#FDE68A';
  ctx.font = `700 26px ${CANVAS_VN_FONT}`;
  const winnerLine = fitSingleLineText(
    ctx,
    `🏆 ${publicGame.winnerLabel ?? 'Hòa'}`,
    POSTCARD_WIDTH - 156,
  );
  ctx.fillText(winnerLine, 80, 180);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = `400 17px ${CANVAS_VN_FONT}`;
  const reasonLine = fitSingleLineText(
    ctx,
    publicGame.winReason ?? 'Hệ thống phát thanh KTX đã khép lại tín hiệu đêm nay.',
    POSTCARD_WIDTH - 156,
  );
  ctx.fillText(reasonLine, 80, 218);

  // 4. Lưới 2 cột hiển thị 4–8 người chơi & vai thật (zero MSSV)
  const reveals = (
    publicGame.finalReveal && publicGame.finalReveal.length > 0
      ? publicGame.finalReveal
      : publicGame.players.map((p) => ({
          playerId: p.playerId,
          displayName: p.displayName,
          roleId: 'gac-ky-thuat' as const,
          roleName: 'Vai bí mật chưa công bố',
          faction: (p.revealedFaction ?? 'lantern-guard') as BoardGameFactionId,
          won: publicGame.winnerPlayerIds.includes(p.playerId),
          alive: p.alive,
          hp: p.hp,
        }))
  ).slice(0, 8);

  const gridTop = 268;
  const gridLeft = 56;
  const colGap = 20;
  const rowGap = 14;
  const cardW = (POSTCARD_WIDTH - 112 - colGap) / 2;
  const cardH = 74;

  reveals.forEach((p, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = gridLeft + col * (cardW + colGap);
    const y = gridTop + row * (cardH + rowGap);
    const palette = factionColors(p.faction);

    drawRoundedRect(ctx, x, y, cardW, cardH, 14);
    ctx.fillStyle = p.won ? 'rgba(30, 41, 59, 0.92)' : 'rgba(15, 23, 42, 0.82)';
    ctx.fill();
    ctx.strokeStyle = p.won ? 'rgba(251, 191, 36, 0.7)' : palette.border;
    ctx.lineWidth = p.won ? 1.8 : 1.1;
    ctx.stroke();

    // Tên hiển thị (CHỈ displayName, tuyệt đối không MSSV)
    ctx.fillStyle = '#F8FAFC';
    ctx.font = `700 18px ${CANVAS_VN_FONT}`;
    ctx.fillText(fitSingleLineText(ctx, p.displayName, cardW - 190), x + 16, y + 25);

    // Role name
    ctx.fillStyle = '#CBD5E1';
    ctx.font = `400 14px ${CANVAS_VN_FONT}`;
    ctx.fillText(fitSingleLineText(ctx, p.roleName, cardW - 190), x + 16, y + 51);

    // Phe & trạng thái thắng/thua bên phải
    const factionLabel = FACTION_LABELS[p.faction].normalize('NFC');
    ctx.font = `600 13px ${CANVAS_VN_FONT}`;
    const badgeW = Math.min(156, Math.max(96, ctx.measureText(factionLabel).width + 20));
    const badgeX = x + cardW - badgeW - 14;
    drawRoundedRect(ctx, badgeX, y + 12, badgeW, 24, 8);
    ctx.fillStyle = palette.badgeBg;
    ctx.fill();
    ctx.fillStyle = palette.badgeText;
    ctx.textAlign = 'center';
    ctx.fillText(factionLabel, badgeX + badgeW / 2, y + 24);

    const outcomeLabel = (p.won ? '🏆 Thắng' : p.alive ? 'Sống sót' : 'Đã gục').normalize('NFC');
    ctx.fillStyle = p.won ? '#FCD34D' : p.alive ? '#94A3B8' : '#FB7185';
    ctx.font = `700 13px ${CANVAS_VN_FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(outcomeLabel, x + cardW - 16, y + 52);
    ctx.textAlign = 'left';
  });

  // 5. Chân trang đóng dấu HUSTVerse
  ctx.fillStyle = '#94A3B8';
  ctx.font = `600 14px ${CANVAS_VN_FONT}`;
  const footerLeft = inviteCode
    ? `HUSTVerse — Bách Khoa 3D · hustverse.vercel.app · Phòng #${inviteCode}`
    : 'HUSTVerse — Bách Khoa 3D · hustverse.vercel.app';
  ctx.fillText(footerLeft.normalize('NFC'), 56, POSTCARD_HEIGHT - 48);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748B';
  ctx.fillText(`Mã trận: ${publicGame.matchId.slice(0, 12)}`.normalize('NFC'), POSTCARD_WIDTH - 56, POSTCARD_HEIGHT - 48);
  ctx.textAlign = 'left';

  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

export interface MatchPostcardProps {
  publicGame: BoardGamePublicGameView;
  inviteCode?: string | null;
}

export default function MatchPostcard({ publicGame, inviteCode }: MatchPostcardProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = renderMatchPostcardDataUrl(publicGame, inviteCode);
    setDataUrl(url);
  }, [publicGame, inviteCode]);

  if (!dataUrl) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-center text-[11px] text-slate-400">
        Đang kết xuất ảnh tổng kết PNG 1200×675...
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-amber-500/35 bg-slate-950/75 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
          🖼️ Ảnh kỷ niệm ván đấu (1200×675 PNG)
        </span>
        <a
          data-testid="bg-download-postcard-btn"
          href={dataUrl}
          download={`bong-dem-ktx-${publicGame.matchId.slice(0, 8)}.png`}
          className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1 text-[11px] font-bold text-slate-950 transition hover:bg-amber-400"
        >
          📸 Tải ảnh tổng kết PNG (1200×675)
        </a>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
        <img
          data-testid="bg-match-postcard-img"
          src={dataUrl}
          alt="Thẻ kỷ niệm Bóng Đêm KTX"
          className="h-auto w-full object-contain"
        />
      </div>
    </div>
  );
}
