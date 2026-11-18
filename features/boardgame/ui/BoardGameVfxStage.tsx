'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/BoardGameVfxStage.tsx
// Bộ VFX Dùng Chung cho Bóng Đêm KTX:
// - Hook `useBoardGameVfxQueue` quản lý hàng đợi dựa trên server delta + Skip + Reduced Motion
// - SVG Targeting Reticle (đường nhắm mục tiêu)
// - Canvas 2D Combat VFX (vệt chém, Masamune, đạn Súng Liên Thanh, sét Vy Radio, nổ, phản kích, hồi máu, khiên, cướp)
// - Floating Damage (-5, +2, BLOCK, COUNTER, MISS, STEAL) & Screen Shake
// - Card Draw 3D Flip & Dice Tumble dừng ở đúng kết quả server
// - Cinematic Cut-ins (LƯỢT CỦA BẠN / LỘ DIỆN / TUYỆT KỸ / HẠ GỤC / CHIẾN THẮNG)
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  BoardGameDeckId,
  BoardGameFactionId,
  BoardGameLocationId,
  BoardGamePrivateGameView,
  BoardGamePublicGameView,
  BoardGameRoleId,
} from '@/shared/contracts/boardgame';
import {
  FactionCrestSvg,
  RolePortraitSvg,
} from './BoardGameArt';
import type { ResolvedGraphicsProfile } from './graphics-settings';
import {
  MidnightDicePair3D,
  buildDiceRollTimeline,
  buildDirectMoveTimeline,
  isDiceResultRevealed,
  type DiceRollChoreographyTimeline,
  type DiceRollStage,
} from './MidnightDice3D';
import {
  CARD_BACK_SECRET_TITLES,
  MIDNIGHT_CARD_ART,
  MIDNIGHT_CARD_BACK_ART,
  MIDNIGHT_DECK_TOKENS,
  MIDNIGHT_FACTION_TOKENS,
} from './midnight-noir-tokens';
import {
  playCardFlip,
  playSoundForVisualEvent,
  stopAllBoardGameSounds,
} from './sound';
import {
  VisualEventTracker,
  resolveCombatSequenceTimings,
  resolveRoleRevealTimeline,
  type BoardGameVisualEvent,
  type CardDrawVisualEvent,
  type CinematicCutInVisualEvent,
  type CombatVfxVisualEvent,
  type DiceRollVisualEvent,
  type FloatingTextVisualEvent,
  type RoleRevealPhase,
  type ScreenShakeLevel,
} from './vfx-queue';

interface Point2D {
  x: number;
  y: number;
}

interface ActiveCombatAnim {
  uid: string;
  event: CombatVfxVisualEvent;
  source: Point2D;
  targets: Point2D[];
  startedAt: number;
  durationMs: number;
  factionReveal?: BoardGameFactionId | null;
  deckThemeBurst?: BoardGameDeckId | null;
  victoryFactionBurst?: BoardGameFactionId | null;
}

interface ActiveFloatingPopup {
  uid: string;
  event: FloatingTextVisualEvent;
  x: number;
  y: number;
}

interface ActiveImpactFlash {
  uid: string;
  x: number;
  y: number;
  color: string;
  secondaryColor: string;
  isCounter: boolean;
  hitStopMs: number;
}

function getRelativeCenter(container: HTMLElement, el: Element): Point2D | null {
  const cRect = container.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0 || cRect.width <= 0 || cRect.height <= 0) {
    return null;
  }
  return {
    x: rect.left - cRect.left + rect.width / 2,
    y: rect.top - cRect.top + rect.height / 2,
  };
}

function resolvePlayerAnchor(
  container: HTMLElement | null,
  playerId: string | null,
  fallbackPlayers: readonly { playerId: string }[],
): Point2D {
  if (!container) return { x: 240, y: 180 };
  const cWidth = container.clientWidth || 720;
  const cHeight = container.clientHeight || 480;
  if (playerId) {
    const primary = container.querySelectorAll(`[data-vfx-player="${playerId}"]`);
    for (let i = 0; i < primary.length; i++) {
      const pt = getRelativeCenter(container, primary[i]);
      if (pt) return pt;
    }
    const strip = container.querySelectorAll(`[data-vfx-player-strip="${playerId}"]`);
    for (let i = 0; i < strip.length; i++) {
      const pt = getRelativeCenter(container, strip[i]);
      if (pt) return pt;
    }
  }
  const idx = Math.max(
    0,
    fallbackPlayers.findIndex((p) => p.playerId === playerId),
  );
  const cols = Math.max(1, Math.min(4, fallbackPlayers.length));
  return {
    x: ((idx % cols) + 0.5) * (cWidth / cols),
    y: idx < 4 ? cHeight * 0.42 : cHeight * 0.68,
  };
}

function resolveDeckAnchor(container: HTMLElement | null, deck: BoardGameDeckId): Point2D {
  if (!container) return { x: 320, y: 260 };
  const el = container.querySelector(`[data-vfx-deck="${deck}"]`);
  if (el) {
    const pt = getRelativeCenter(container, el);
    if (pt) return pt;
  }
  const cWidth = container.clientWidth || 720;
  const cHeight = container.clientHeight || 480;
  const offset = deck === 'investigation' ? 0.55 : deck === 'equipment' ? 0.68 : 0.81;
  return { x: cWidth * offset, y: cHeight * 0.62 };
}

function buildLightningPoints(from: Point2D, to: Point2D, seedVal: number, segments = 8): Point2D[] {
  const pts: Point2D[] = [from];
  let s = seedVal || 13;
  for (let i = 1; i < segments; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const t = i / segments;
    const jitter = ((s % 100) / 100 - 0.5) * 44;
    const nx = from.x + (to.x - from.x) * t + jitter;
    const ny = from.y + (to.y - from.y) * t + ((s >> 8) % 18) - 9;
    pts.push({ x: nx, y: ny });
  }
  pts.push(to);
  return pts;
}

function drawFactionRevealBurst(
  ctx: CanvasRenderingContext2D,
  anim: ActiveCombatAnim,
  p: number,
  reducedMotion: boolean,
  particleScale: number,
): void {
  const fade = Math.sin(p * Math.PI);
  const faction = anim.factionReveal ?? 'lantern-guard';
  const primary =
    faction === 'mist-order' ? '#f43f5e' : faction === 'wanderer' ? '#fbbf24' : '#34d399';
  const secondary =
    faction === 'mist-order' ? '#a855f7' : faction === 'wanderer' ? '#cbd5e1' : '#fde047';
  const count = reducedMotion || particleScale <= 0 ? 4 : Math.max(8, Math.round(18 * particleScale));

  for (const pt of [anim.source, ...anim.targets]) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, fade));

    if (faction === 'lantern-guard') {
      // Đội Săn Đêm: Tia sáng vàng-lục bảo rọi xuống + vòng hào quang quét lên
      const grad = ctx.createRadialGradient(pt.x, pt.y, 4, pt.x, pt.y, 68 * p + 22);
      grad.addColorStop(0, 'rgba(253, 224, 71, 0.55)');
      grad.addColorStop(0.55, 'rgba(16, 185, 129, 0.28)');
      grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 68 * p + 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = secondary;
      ctx.lineWidth = 3 * (1 - p * 0.6);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 18 + p * 64, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + p * 0.9;
        const r = 14 + p * 56;
        ctx.fillStyle = i % 2 === 0 ? primary : secondary;
        ctx.beginPath();
        ctx.arc(pt.x + Math.cos(ang) * r, pt.y + Math.sin(ang) * r - p * 26, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (faction === 'mist-order') {
      // Hội Bóng Đêm: Xoáy sương tím-đỏ thẫm tụ xoáy & mảnh bóng tối
      const grad = ctx.createRadialGradient(pt.x, pt.y, 4, pt.x, pt.y, 76 * p + 20);
      grad.addColorStop(0, 'rgba(244, 63, 94, 0.5)');
      grad.addColorStop(0.55, 'rgba(168, 85, 247, 0.3)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 76 * p + 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = primary;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 20 + p * 68, p * 2, p * 2 + Math.PI * 1.45);
      ctx.stroke();

      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count - p * 3.1;
        const r = (1 - p * 0.35) * 62;
        ctx.fillStyle = i % 2 === 0 ? primary : secondary;
        ctx.beginPath();
        ctx.moveTo(pt.x + Math.cos(ang) * r, pt.y + Math.sin(ang) * r);
        ctx.lineTo(pt.x + Math.cos(ang + 0.16) * (r + 12), pt.y + Math.sin(ang + 0.16) * (r + 12));
        ctx.lineTo(pt.x + Math.cos(ang - 0.16) * (r + 7), pt.y + Math.sin(ang - 0.16) * (r + 7));
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Kẻ Độc Hành: Nhật thực hổ phách-bạc & tia lửa đa hướng
      ctx.strokeStyle = primary;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 22 + p * 54, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = secondary;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 12 + p * 74, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count;
        const r = 10 + p * 72;
        ctx.fillStyle = i % 2 === 0 ? primary : secondary;
        ctx.fillRect(pt.x + Math.cos(ang) * r - 2, pt.y + Math.sin(ang) * r - 2, 4, 4);
      }
    }
    ctx.restore();
  }
}

function drawTargetLockReticle(
  ctx: CanvasRenderingContext2D,
  pt: Point2D,
  lockP: number,
  color: string,
  isCounter = false,
): void {
  const clamped = Math.max(0, Math.min(1, lockP));
  const radius = 34 - clamped * 14;
  const rot = (1 - clamped) * (isCounter ? -0.9 : 0.75);
  ctx.save();
  ctx.translate(pt.x, pt.y);
  ctx.rotate(rot);
  ctx.globalAlpha = 0.4 + clamped * 0.58;
  ctx.strokeStyle = color;
  ctx.lineWidth = isCounter ? 2.8 : 2.4;

  // 4 góc khóa mục tiêu
  const bracketLen = 9;
  for (let k = 0; k < 4; k++) {
    ctx.save();
    ctx.rotate((Math.PI / 2) * k);
    ctx.beginPath();
    ctx.moveTo(radius - bracketLen, -radius);
    ctx.lineTo(radius, -radius);
    ctx.lineTo(radius, -radius + bracketLen);
    ctx.stroke();
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, Math.max(4, radius * 0.35), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
function drawImpactHitStopStarburst(
  ctx: CanvasRenderingContext2D,
  pt: Point2D,
  color: string,
  secondaryColor: string,
  scale: number,
  isCounter = false,
): void {
  ctx.save();
  ctx.translate(pt.x, pt.y);
  if (isCounter) ctx.rotate(Math.PI / 4);

  const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 38 * scale);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.35, secondaryColor);
  grad.addColorStop(0.75, color);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 38 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Cross-slash starburst spikes during 75ms Hit-Stop
  ctx.fillStyle = '#ffffff';
  const arms = isCounter ? 6 : 4;
  for (let i = 0; i < arms; i++) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * i) / arms);
    ctx.beginPath();
    ctx.moveTo(0, -42 * scale);
    ctx.lineTo(4.5 * scale, 0);
    ctx.lineTo(0, 42 * scale);
    ctx.lineTo(-4.5 * scale, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
function drawDeckThemeBurst(
  ctx: CanvasRenderingContext2D,
  anim: ActiveCombatAnim,
  p: number,
  reducedMotion: boolean,
  particleScale: number,
): void {
  const deck = anim.deckThemeBurst ?? 'investigation';
  const fade = Math.sin(p * Math.PI);
  const center = anim.targets[0] ?? anim.source;
  const origin = anim.source;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, fade));

  // Vệt bay ánh sáng từ vị trí Deck lên trung tâm
  const trailColor =
    deck === 'investigation' ? '#34d399' : deck === 'equipment' ? '#38bdf8' : '#f43f5e';
  const accentColor =
    deck === 'investigation' ? '#a7f3d0' : deck === 'equipment' ? '#e2e8f0' : '#fbbf24';

  if (p < 0.65 && !reducedMotion) {
    const flightP = Math.min(1, p / 0.48);
    const curX = origin.x + (center.x - origin.x) * flightP;
    const curY = origin.y + (center.y - origin.y) * flightP;
    const trailGrad = ctx.createLinearGradient(origin.x, origin.y, curX, curY);
    trailGrad.addColorStop(0, 'rgba(255,255,255,0)');
    trailGrad.addColorStop(1, trailColor);
    ctx.strokeStyle = trailGrad;
    ctx.lineWidth = 4.5 * (1 - flightP * 0.35);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(curX, curY);
    ctx.stroke();
  }

  // Hiệu ứng đặc trưng từng bộ bài tại trung tâm khi lá bài đáp/lật
  const bloomP = Math.max(0, Math.min(1, (p - 0.18) / 0.82));
  if (bloomP > 0) {
    if (deck === 'investigation') {
      // Khám Phá: vòng radar sonar lục bảo + tia quét la bàn
      ctx.strokeStyle = trailColor;
      ctx.lineWidth = 2.6 * (1 - bloomP * 0.5);
      ctx.beginPath();
      ctx.arc(center.x, center.y, 44 + bloomP * 76, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2 * (1 - bloomP * 0.6);
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(center.x, center.y, 68 + bloomP * 44, bloomP * 2.2, bloomP * 2.2 + Math.PI * 1.45);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (deck === 'equipment') {
      // Cung Ứng: khung lục giác thép thiên thanh + tia rèn kim loại
      const r = 56 + bloomP * 64;
      ctx.strokeStyle = trailColor;
      ctx.lineWidth = 3 * (1 - bloomP * 0.5);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const ang = (Math.PI / 3) * k - Math.PI / 2 + bloomP * 0.35;
        const hx = center.x + Math.cos(ang) * r;
        const hy = center.y + Math.sin(ang) * r;
        if (k === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
    } else {
      // Đột Kích: tia xung kích đỏ rực + cảnh báo hổ phách
      const rays = reducedMotion || particleScale <= 0 ? 4 : Math.max(6, Math.round(10 * particleScale));
      for (let i = 0; i < rays; i++) {
        const ang = (Math.PI * 2 * i) / rays + 0.25;
        const r1 = 52 + bloomP * 24;
        const r2 = 84 + bloomP * 68;
        ctx.strokeStyle = i % 2 === 0 ? trailColor : accentColor;
        ctx.lineWidth = 2.8 * (1 - bloomP * 0.6);
        ctx.beginPath();
        ctx.moveTo(center.x + Math.cos(ang) * r1, center.y + Math.sin(ang) * r1);
        ctx.lineTo(center.x + Math.cos(ang) * r2, center.y + Math.sin(ang) * r2);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawRoleSignatureAura(
  ctx: CanvasRenderingContext2D,
  roleId: BoardGameRoleId,
  source: Point2D,
  targets: Point2D[],
  p: number,
  reducedMotion: boolean,
  particleScale: number,
): void {
  const fade = Math.max(0, Math.min(1, Math.sin(p * Math.PI) * 1.15));
  if (fade <= 0) return;

  ctx.save();
  ctx.globalAlpha = fade;

  switch (roleId) {
    case 'gac-radio': {
      // Sóng cao áp tần số kép + vòng cộng hưởng xanh ngọc từ người phát tới mục tiêu
      for (let w = 0; w < 2; w++) {
        const ringR = 16 + ((p + w * 0.35) % 1) * 58;
        ctx.strokeStyle = w === 0 ? '#34d399' : '#fef08a';
        ctx.lineWidth = 2.4 * fade;
        ctx.beginPath();
        ctx.arc(source.x, source.y, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'gac-ky-thuat': {
      // Mạng lưới mạch điện vỡ vây (4 góc vuông cam-vàng) quanh các mục tiêu
      for (const tgt of targets) {
        const r = 22 + p * 34;
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 2.6;
        for (let k = 0; k < 4; k++) {
          const ang = (Math.PI / 2) * k + p * 0.4;
          const cx = tgt.x + Math.cos(ang) * r;
          const cy = tgt.y + Math.sin(ang) * r;
          ctx.beginPath();
          ctx.moveTo(cx - 5, cy);
          ctx.lineTo(cx + 5, cy);
          ctx.moveTo(cx, cy - 5);
          ctx.lineTo(cx, cy + 5);
          ctx.stroke();
        }
      }
      break;
    }
    case 'gac-truc-ban': {
      // Ấn lệnh Bước Nhảy Tắt: la bàn vàng xoay quanh nguồn
      ctx.save();
      ctx.translate(source.x, source.y);
      ctx.rotate(p * Math.PI);
      const r = 24 + p * 22;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.72, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.72, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'suong-gac-cong': {
      // Xích sắt hộ vệ gác cổng lóe sáng quanh người phản kích
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.arc(source.x, source.y, 26 + p * 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case 'suong-an-danh':
    case 'suong-tin-gia': {
      // Nhật thực sương mù tím-đỏ
      const grad = ctx.createRadialGradient(source.x, source.y, 6, source.x, source.y, 44 + p * 28);
      grad.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
      grad.addColorStop(0.7, 'rgba(225, 29, 72, 0.25)');
      grad.addColorStop(1, 'rgba(225, 29, 72, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(source.x, source.y, 44 + p * 28, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'lang-cuu-ho': {
      // Dấu thập huyết y tế xoay nhẹ
      for (const tgt of targets) {
        ctx.strokeStyle = '#fb7185';
        ctx.lineWidth = 3;
        const arm = 14 + p * 18;
        ctx.beginPath();
        ctx.moveTo(tgt.x - arm, tgt.y);
        ctx.lineTo(tgt.x + arm, tgt.y);
        ctx.moveTo(tgt.x, tgt.y - arm);
        ctx.lineTo(tgt.x, tgt.y + arm);
        ctx.stroke();
      }
      break;
    }
    case 'lang-quan-sat': {
      // Vòng kính trinh sát lục bảo
      ctx.strokeStyle = '#6ee7b7';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(source.x, source.y, 20 + p * 28, -Math.PI * 0.2, Math.PI * 1.5);
      ctx.stroke();
      break;
    }
    case 'lang-anh-san':
    case 'lang-tien-phong': {
      const rayCount = reducedMotion || particleScale <= 0 ? 4 : Math.max(4, Math.round(8 * particleScale));
      for (let i = 0; i < rayCount; i++) {
        const ang = (Math.PI * 2 * i) / rayCount + p * 0.6;
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(source.x + Math.cos(ang) * 18, source.y + Math.sin(ang) * 18);
        ctx.lineTo(source.x + Math.cos(ang) * (34 + p * 28), source.y + Math.sin(ang) * (34 + p * 28));
        ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}

function drawVictoryFireworks(
  ctx: CanvasRenderingContext2D,
  anim: ActiveCombatAnim,
  p: number,
  reducedMotion: boolean,
  particleScale: number,
): void {
  const faction = anim.victoryFactionBurst ?? 'lantern-guard';
  const primary =
    faction === 'mist-order' ? '#fb7185' : faction === 'wanderer' ? '#34d399' : '#fbbf24';
  const secondary =
    faction === 'mist-order' ? '#c084fc' : faction === 'wanderer' ? '#fde68a' : '#34d399';
  const count = reducedMotion || particleScale <= 0 ? 6 : Math.max(10, Math.round(20 * particleScale));

  anim.targets.forEach((pt, idx) => {
    const delay = idx * 0.14;
    const localP = Math.max(0, Math.min(1, (p - delay) / Math.max(0.3, 1 - delay)));
    if (localP <= 0) return;
    const fade = Math.sin(localP * Math.PI);

    ctx.save();
    ctx.globalAlpha = fade * 0.9;
    ctx.strokeStyle = idx % 2 === 0 ? primary : secondary;
    ctx.lineWidth = 2.4 * fade;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 18 + localP * 86, 0, Math.PI * 2);
    ctx.stroke();

    for (let k = 0; k < count; k++) {
      const ang = (Math.PI * 2 * k) / count + idx * 0.35;
      const dist = localP * (78 + (k % 3) * 20);
      ctx.fillStyle = k % 2 === 0 ? primary : '#ffffff';
      ctx.beginPath();
      ctx.arc(
        pt.x + Math.cos(ang) * dist,
        pt.y + Math.sin(ang) * dist + localP * 18,
        (2.8 - localP * 1.1) * fade,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  });
}

function drawCombatAnimation(
  ctx: CanvasRenderingContext2D,
  anim: ActiveCombatAnim,
  nowMs: number,
  reducedMotion: boolean,
  particleScale = 1,
): boolean {
  const rawElapsed = Math.max(0, nowMs - anim.startedAt);
  const p = Math.max(0, Math.min(1, rawElapsed / Math.max(120, anim.durationMs)));
  if (p >= 1) return false;

  if (anim.factionReveal) {
    drawFactionRevealBurst(ctx, anim, p, reducedMotion, particleScale);
    return true;
  }

  if (anim.deckThemeBurst) {
    drawDeckThemeBurst(ctx, anim, p, reducedMotion, particleScale);
    return true;
  }

  if (anim.victoryFactionBurst) {
    drawVictoryFireworks(ctx, anim, p, reducedMotion, particleScale);
    return true;
  }

  const { event: { effect }, source, targets } = anim;
  const timings = resolveCombatSequenceTimings(anim.durationMs, effect, reducedMotion);
  const inTargetLock = timings.targetLockEndMs > 0 && rawElapsed < timings.targetLockEndMs;
  const lockP =
    timings.targetLockEndMs > 0 ? Math.min(1, rawElapsed / timings.targetLockEndMs) : 1;
  const inHitStop =
    timings.hitStopDurationMs > 0 &&
    rawElapsed >= timings.hitStopStartMs &&
    rawElapsed < timings.hitStopEndMs;
  const travelSpan = Math.max(1, timings.travelEndMs - timings.targetLockEndMs);
  const travelP =
    rawElapsed < timings.targetLockEndMs
      ? 0
      : rawElapsed >= timings.hitStopStartMs
        ? 1
        : Math.max(0, Math.min(1, (rawElapsed - timings.targetLockEndMs) / travelSpan));
  const postImpactSpan = Math.max(100, timings.recoveryEndMs - timings.hitStopEndMs);
  const postImpactP =
    rawElapsed <= timings.hitStopEndMs
      ? 0
      : Math.max(0, Math.min(1, (rawElapsed - timings.hitStopEndMs) / postImpactSpan));
  const fade = inHitStop ? 1 : 1 - postImpactP * postImpactP;

  ctx.save();

  switch (effect) {
    case 'SLASH':
    case 'MASAMUNE_SLASH': {
      const isCursed = effect === 'MASAMUNE_SLASH';
      const primary = isCursed ? '#fb7185' : '#fde047';
      const secondary = isCursed ? '#a855f7' : '#ffffff';
      for (const tgt of targets) {
        if (inTargetLock) {
          drawTargetLockReticle(ctx, tgt, lockP, primary, false);
          continue;
        }
        // Subtle attack travel dash streak before impact
        if (travelP < 1 || inHitStop) {
          const streakStart = Math.max(0, travelP - 0.45);
          ctx.save();
          ctx.globalAlpha = 0.72;
          ctx.strokeStyle = primary;
          ctx.lineWidth = isCursed ? 4 : 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(
            source.x + (tgt.x - source.x) * streakStart,
            source.y + (tgt.y - source.y) * streakStart,
          );
          ctx.lineTo(
            source.x + (tgt.x - source.x) * travelP,
            source.y + (tgt.y - source.y) * travelP,
          );
          ctx.stroke();
          ctx.restore();
        }

        if (travelP >= 0.35) {
          const swingP = Math.min(1, (travelP - 0.35) / 0.65);
          const radius = (isCursed ? 50 : 42) * (0.78 + postImpactP * 0.35);
          ctx.globalAlpha = fade;
          ctx.strokeStyle = primary;
          ctx.lineWidth = isCursed ? 7.5 : 5.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(tgt.x, tgt.y, radius, -Math.PI * 0.82, -Math.PI * 0.82 + swingP * Math.PI * 0.92 + postImpactP * 0.25);
          ctx.stroke();

          ctx.strokeStyle = secondary;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.arc(tgt.x, tgt.y, radius * 0.9, -Math.PI * 0.76, -Math.PI * 0.76 + swingP * Math.PI * 0.85 + postImpactP * 0.2);
          ctx.stroke();

          if (isCursed) {
            ctx.strokeStyle = '#e11d48';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(tgt.x - 32 * swingP, tgt.y - 28 * swingP);
            ctx.lineTo(tgt.x + 32 * swingP, tgt.y + 28 * swingP);
            ctx.stroke();
          }
        }

        if (inHitStop) {
          drawImpactHitStopStarburst(ctx, tgt, primary, secondary, isCursed ? 1.18 : 1, false);
        } else if (postImpactP > 0) {
          const sparkCount = reducedMotion || particleScale <= 0 ? 0 : Math.max(2, Math.round(9 * particleScale));
          for (let k = 0; k < sparkCount; k++) {
            const ang = (Math.PI * 2 * k) / sparkCount + postImpactP * 1.4;
            const dist = postImpactP * (isCursed ? 62 : 48);
            ctx.fillStyle = k % 2 === 0 ? primary : secondary;
            ctx.globalAlpha = fade;
            ctx.beginPath();
            ctx.arc(tgt.x + Math.cos(ang) * dist, tgt.y + Math.sin(ang) * dist, 2.7 * fade, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      break;
    }

    case 'SPEAR_THRUST': {
      for (const tgt of targets) {
        if (inTargetLock) {
          drawTargetLockReticle(ctx, tgt, lockP, '#38bdf8', false);
          continue;
        }
        const curX = source.x + (tgt.x - source.x) * travelP;
        const curY = source.y + (tgt.y - source.y) * travelP;
        ctx.globalAlpha = fade;
        const grad = ctx.createLinearGradient(source.x, source.y, curX, curY);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        grad.addColorStop(0.6, '#38bdf8');
        grad.addColorStop(1, '#fef08a');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 6.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(curX, curY);
        ctx.stroke();

        if (inHitStop) {
          drawImpactHitStopStarburst(ctx, tgt, '#38bdf8', '#fef08a', 1.1, false);
        } else if (postImpactP > 0) {
          const shockR = 16 + postImpactP * 62;
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2.8 * fade;
          ctx.beginPath();
          ctx.arc(tgt.x, tgt.y, shockR, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      break;
    }

    case 'HANDGUN_SHOT':
    case 'MACHINE_GUN_BARRAGE': {
      const burstCount = effect === 'MACHINE_GUN_BARRAGE' ? 3 : 2;
      targets.forEach((tgt, tIdx) => {
        if (inTargetLock) {
          drawTargetLockReticle(ctx, tgt, lockP, '#fbbf24', false);
          return;
        }
        const delay = effect === 'MACHINE_GUN_BARRAGE' ? tIdx * 0.08 : 0;
        const localTravel = Math.max(0, Math.min(1, (travelP - delay) / Math.max(0.25, 1 - delay)));
        ctx.globalAlpha = fade;

        if (localTravel > 0) {
          for (let b = 0; b < burstCount; b++) {
            const offsetAngle = (b - 1) * 7;
            const tail = Math.max(0, localTravel - 0.38);
            const sx = source.x + (tgt.x - source.x) * tail;
            const sy = source.y + (tgt.y - source.y) * tail + offsetAngle;
            const ex = source.x + (tgt.x - source.x) * localTravel;
            const ey = source.y + (tgt.y - source.y) * localTravel + offsetAngle;

            ctx.strokeStyle = b % 2 === 0 ? '#fbbf24' : '#fb7185';
            ctx.lineWidth = 3.4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
          }
        }

        if (inHitStop) {
          drawImpactHitStopStarburst(ctx, tgt, '#fb7185', '#fde047', 1.05, false);
        } else if (postImpactP > 0) {
          const impactR = 12 + postImpactP * 58;
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2.6 * fade;
          ctx.beginPath();
          ctx.arc(tgt.x, tgt.y, impactR, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      break;
    }

    case 'LIGHTNING_STRIKE': {
      targets.forEach((tgt, idx) => {
        if (inTargetLock) {
          drawTargetLockReticle(ctx, tgt, lockP, '#34d399', false);
          return;
        }
        ctx.globalAlpha = fade;
        const skyOrigin: Point2D = { x: tgt.x + (idx % 2 === 0 ? -24 : 24), y: Math.max(0, tgt.y - 220) };
        const endPt: Point2D = {
          x: skyOrigin.x + (tgt.x - skyOrigin.x) * travelP,
          y: skyOrigin.y + (tgt.y - skyOrigin.y) * travelP,
        };
        const boltPts = buildLightningPoints(skyOrigin, endPt, Math.floor((inHitStop ? timings.hitStopStartMs : nowMs) / 45) + idx * 97, 8);

        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = (inHitStop ? 11 : 9) * fade;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        boltPts.forEach((pt, j) => (j === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
        ctx.stroke();

        ctx.strokeStyle = '#fef9c3';
        ctx.lineWidth = (inHitStop ? 4.2 : 3) * fade;
        ctx.beginPath();
        boltPts.forEach((pt, j) => (j === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
        ctx.stroke();

        if (inHitStop) {
          drawImpactHitStopStarburst(ctx, tgt, '#34d399', '#fef08a', 1.15, false);
        } else if (postImpactP > 0) {
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 3 * fade;
          ctx.beginPath();
          ctx.arc(tgt.x, tgt.y, 18 + postImpactP * 50, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      break;
    }

    case 'EXPLOSION': {
      for (const tgt of targets) {
        if (inTargetLock) {
          drawTargetLockReticle(ctx, tgt, lockP, '#f97316', false);
          continue;
        }
        if (inHitStop) {
          drawImpactHitStopStarburst(ctx, tgt, '#f97316', '#fef08a', 1.25, false);
        }
        const coreR = 14 + (inHitStop ? 0.25 : postImpactP) * 60;
        ctx.globalAlpha = fade * 0.78;
        const rad = ctx.createRadialGradient(tgt.x, tgt.y, 2, tgt.x, tgt.y, coreR);
        rad.addColorStop(0, '#fef08a');
        rad.addColorStop(0.45, '#f97316');
        rad.addColorStop(0.8, 'rgba(225, 29, 72, 0.5)');
        rad.addColorStop(1, 'rgba(225, 29, 72, 0)');
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(tgt.x, tgt.y, coreR, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = fade;
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3 * fade;
        ctx.beginPath();
        ctx.arc(tgt.x, tgt.y, 16 + postImpactP * 72, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }

    case 'COUNTER_STRIKE': {
      // Phản kích đặc trưng: Lục giác Đỡ Đòn (cyan-violet) trên nguồn -> Đôi vuốt phản công -> Hit-Stop 75ms
      const parryAlpha = Math.max(0, 1 - postImpactP * 1.15);
      if (parryAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = parryAlpha;
        const shieldR = 22 + lockP * 10;
        ctx.strokeStyle = '#38bdf8';
        ctx.fillStyle = 'rgba(192, 132, 252, 0.18)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const ang = (Math.PI / 3) * k + (1 - lockP) * 0.4;
          const sx = source.x + Math.cos(ang) * shieldR;
          const sy = source.y + Math.sin(ang) * shieldR;
          if (k === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      for (const tgt of targets) {
        if (inTargetLock) {
          drawTargetLockReticle(ctx, tgt, lockP, '#c084fc', true);
          continue;
        }
        // Đôi vuốt phản kích cong (#c084fc & #f43f5e) lao ngược từ nguồn về kẻ tấn công
        const dx = tgt.x - source.x;
        const dy = tgt.y - source.y;
        const len = Math.max(1, Math.hypot(dx, dy));
        const nx = (-dy / len) * 26;
        const ny = (dx / len) * 26;
        const curX = source.x + dx * travelP;
        const curY = source.y + dy * travelP;
        const midX = (source.x + curX) * 0.5;
        const midY = (source.y + curY) * 0.5;

        ctx.globalAlpha = fade;
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 4.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.quadraticCurveTo(midX + nx, midY + ny, curX, curY);
        ctx.stroke();

        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.quadraticCurveTo(midX - nx, midY - ny, curX, curY);
        ctx.stroke();

        if (inHitStop) {
          drawImpactHitStopStarburst(ctx, tgt, '#c084fc', '#f43f5e', 1.18, true);
        } else if (postImpactP > 0) {
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 3.4 * fade;
          ctx.beginPath();
          ctx.arc(tgt.x, tgt.y, 16 + postImpactP * 44, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 2.2 * fade;
          ctx.beginPath();
          ctx.arc(tgt.x, tgt.y, 8 + postImpactP * 56, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      break;
    }

    case 'HEAL_AURA': {
      for (const tgt of targets) {
        ctx.globalAlpha = fade;
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(tgt.x, tgt.y, 14 + p * 36, 0, Math.PI * 2);
        ctx.stroke();

        const healSparkCount = reducedMotion || particleScale <= 0 ? 0 : Math.max(2, Math.round(6 * particleScale));
        if (healSparkCount > 0) {
          for (let i = 0; i < healSparkCount; i++) {
            const ox = (i - (healSparkCount - 1) / 2) * 11;
            const oy = -p * 42 - (i % 2) * 12;
            ctx.fillStyle = i % 2 === 0 ? '#6ee7b7' : '#fef08a';
            ctx.beginPath();
            ctx.arc(tgt.x + ox, tgt.y + oy, 3 * fade, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      break;
    }

    case 'SHIELD_GUARD': {
      for (const tgt of targets) {
        ctx.globalAlpha = fade;
        const r = 24 + p * 18;
        ctx.strokeStyle = '#38bdf8';
        ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const ang = (Math.PI / 3) * k - Math.PI / 2;
          const hx = tgt.x + Math.cos(ang) * r;
          const hy = tgt.y + Math.sin(ang) * r;
          if (k === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 'STEAL_TETHER': {
      for (const tgt of targets) {
        ctx.globalAlpha = fade;
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tgt.x, tgt.y);
        ctx.lineTo(source.x, source.y);
        ctx.stroke();
        ctx.setLineDash([]);

        const orbX = tgt.x + (source.x - tgt.x) * p;
        const orbY = tgt.y + (source.y - tgt.y) * p;
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(orbX, orbY, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }

  ctx.restore();

  if (anim.event.roleId) {
    drawRoleSignatureAura(
      ctx,
      anim.event.roleId,
      source,
      targets,
      p,
      reducedMotion,
      particleScale,
    );
  }

  return true;
}

export interface UseBoardGameVfxQueueOptions {
  publicGame: BoardGamePublicGameView;
  privateView: BoardGamePrivateGameView | null;
  selfPlayerId: string | null;
  isSpectator: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  reducedMotionOverride?: boolean | null;
  graphicsProfile?: ResolvedGraphicsProfile;
}

export interface BoardGameVfxState {
  activeCombatCount: number;
  floatingPopups: readonly ActiveFloatingPopup[];
  impactFlashes: readonly ActiveImpactFlash[];
  activeDiceRoll: DiceRollVisualEvent | null;
  diceRollStage: DiceRollStage;
  isDiceSettled: boolean;
  activeMoveTimeline: DiceRollChoreographyTimeline | null;
  highlightedLocationId: BoardGameLocationId | null;
  skipGeneration: number;
  activeCardDraw: {
    event: CardDrawVisualEvent;
    revealedFace: boolean;
    fromDelta?: Point2D;
  } | null;
  activeCutIn: CinematicCutInVisualEvent | null;
  revealPhase: RoleRevealPhase;
  screenShake: ScreenShakeLevel;
  reducedMotion: boolean;
  enableBackdropBlur: boolean;
  enableFoil: boolean;
  qualityTier: 'high' | 'balanced' | 'low';
  hasActiveEffects: boolean;
  combatLayerRef: React.RefObject<HTMLCanvasElement>;
  skipAllAnimations: () => void;
  enqueueEvents: (events: readonly BoardGameVisualEvent[]) => void;
  setReducedMotionOverride: (val: boolean | null) => void;
}

export function useBoardGameVfxQueue({
  publicGame,
  privateView,
  selfPlayerId,
  isSpectator,
  containerRef,
  reducedMotionOverride: externalReducedOverride,
  graphicsProfile,
}: UseBoardGameVfxQueueOptions): BoardGameVfxState {
  const trackerRef = useRef<VisualEventTracker>(new VisualEventTracker());
  const seenMatchRef = useRef<string>('');
  const combatLayerRef = useRef<HTMLCanvasElement>(null);
  const activeCombatAnimsRef = useRef<ActiveCombatAnim[]>([]);
  const rafRef = useRef<number | null>(null);

  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [localReducedOverride, setLocalReducedOverride] = useState<boolean | null>(null);
  const reducedMotion =
    externalReducedOverride ??
    graphicsProfile?.reducedMotion ??
    localReducedOverride ??
    systemReducedMotion;

  const qualityTier = graphicsProfile?.tier ?? 'high';
  const pawnGlideDurationMs =
    graphicsProfile?.pawnGlideDurationMs ??
    (qualityTier === 'low' ? 0 : qualityTier === 'balanced' ? 340 : 520);
  const dprCap = graphicsProfile?.dprCap ?? 2;
  const particleScale = graphicsProfile?.particleScale ?? (reducedMotion ? 0.25 : 1);
  const enableScreenShake = graphicsProfile
    ? graphicsProfile.enableScreenShake
    : !reducedMotion;
  const enableBackdropBlur = graphicsProfile?.enableBackdropBlur ?? true;
  const enableFoil = graphicsProfile?.enableFoil ?? !reducedMotion;

  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const qualityTierRef = useRef(qualityTier);
  qualityTierRef.current = qualityTier;
  const pawnGlideDurationMsRef = useRef(pawnGlideDurationMs);
  pawnGlideDurationMsRef.current = pawnGlideDurationMs;
  const dprCapRef = useRef(dprCap);
  dprCapRef.current = dprCap;
  const particleScaleRef = useRef(particleScale);
  particleScaleRef.current = particleScale;
  const enableScreenShakeRef = useRef(enableScreenShake);
  enableScreenShakeRef.current = enableScreenShake;

  const [activeCombatCount, setActiveCombatCount] = useState(0);
  const [floatingPopups, setFloatingPopups] = useState<ActiveFloatingPopup[]>([]);
  const [impactFlashes, setImpactFlashes] = useState<ActiveImpactFlash[]>([]);
  const [activeDiceRoll, setActiveDiceRoll] = useState<DiceRollVisualEvent | null>(null);
  const [diceRollStage, setDiceRollStage] = useState<DiceRollStage>('idle');
  const [activeMoveTimeline, setActiveMoveTimeline] =
    useState<DiceRollChoreographyTimeline | null>(null);
  const [highlightedLocationId, setHighlightedLocationId] = useState<BoardGameLocationId | null>(null);
  const [skipGeneration, setSkipGeneration] = useState(0);
  const activeDiceIdRef = useRef<string | null>(null);
  const highlightTokenRef = useRef<number>(0);
  const prevPlayerLocationsRef = useRef<Map<string, BoardGameLocationId>>(new Map());
  const publicGameRef = useRef(publicGame);
  publicGameRef.current = publicGame;
  const [activeCardDraw, setActiveCardDraw] = useState<{
    event: CardDrawVisualEvent;
    revealedFace: boolean;
    fromDelta?: Point2D;
  } | null>(null);
  const [cutInQueue, setCutInQueue] = useState<CinematicCutInVisualEvent[]>([]);
  const [activeCutIn, setActiveCutIn] = useState<CinematicCutInVisualEvent | null>(null);
  const [revealPhase, setRevealPhase] = useState<RoleRevealPhase>('settle');
  const [screenShake, setScreenShake] = useState<ScreenShakeLevel>('none');

  const timeoutsRef = useRef<Set<number>>(new Set());
  const playersSnapshotRef = useRef(publicGame.players);
  playersSnapshotRef.current = publicGame.players;

  useEffect(() => {
    if (!enableScreenShake) {
      setScreenShake('none');
    }
  }, [enableScreenShake]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReducedMotion(mql.matches);
    const handler = (ev: MediaQueryListEvent) => setSystemReducedMotion(ev.matches);
    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, []);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timeoutsRef.current.delete(id);
      fn();
    }, ms);
    timeoutsRef.current.add(id);
    return id;
  }, []);

  const clearAllTimers = useCallback(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current.clear();
  }, []);

  const ensureCanvasLoop = useCallback(() => {
    if (rafRef.current !== null) return;
    const step = () => {
      const canvas = combatLayerRef.current;
      const container = containerRef.current;
      const anims = activeCombatAnimsRef.current;
      if (!canvas || !container || anims.length === 0) {
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
        rafRef.current = null;
        setActiveCombatCount(0);
        return;
      }

      const dpr = Math.min(dprCapRef.current, window.devicePixelRatio || 1);
      const cw = container.clientWidth || 720;
      const ch = container.clientHeight || 480;
      const targetW = Math.max(1, Math.round(cw * dpr));
      const targetH = Math.max(1, Math.round(ch * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, cw, ch);
        const now = performance.now();
        const remaining: ActiveCombatAnim[] = [];
        for (const a of anims) {
          if (drawCombatAnimation(ctx, a, now, reducedMotionRef.current, particleScaleRef.current)) {
            remaining.push(a);
          }
        }
        ctx.restore();
        activeCombatAnimsRef.current = remaining;
        setActiveCombatCount(remaining.length);
      }

      if (activeCombatAnimsRef.current.length > 0) {
        rafRef.current = window.requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        setActiveCombatCount(0);
      }
    };
    rafRef.current = window.requestAnimationFrame(step);
  }, [containerRef]);

  const skipAllAnimations = useCallback(() => {
    clearAllTimers();
    stopAllBoardGameSounds();
    trackerRef.current.acknowledgeSnapshotDice(publicGameRef.current);
    activeCombatAnimsRef.current = [];
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const canvas = combatLayerRef.current;
    if (canvas) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setActiveCombatCount(0);
    setFloatingPopups([]);
    setImpactFlashes([]);
    activeDiceIdRef.current = null;
    highlightTokenRef.current += 1;
    setActiveDiceRoll(null);
    setDiceRollStage('idle');
    setActiveMoveTimeline(null);
    setHighlightedLocationId(null);
    setSkipGeneration((n) => n + 1);
    setActiveCardDraw(null);
    setCutInQueue([]);
    setActiveCutIn(null);
    setRevealPhase('settle');
    setScreenShake('none');
  }, [clearAllTimers]);

  // Cut-in queue pump: phát lần lượt từng banner điện ảnh đồng bộ âm thanh theo event.id
  useEffect(() => {
    if (activeCutIn || cutInQueue.length === 0) return;
    const [nextBanner, ...rest] = cutInQueue;
    setActiveCutIn(nextBanner);
    setCutInQueue(rest);
    playSoundForVisualEvent(nextBanner);

    if (nextBanner.bannerType === 'ROLE_REVEAL') {
      const revTl = resolveRoleRevealTimeline(nextBanner.durationMs, reducedMotionRef.current);
      if (revTl.anticipationEndMs <= 0) {
        setRevealPhase('settle');
      } else {
        setRevealPhase('anticipation');
        scheduleTimeout(() => {
          setRevealPhase('reveal');
        }, revTl.anticipationEndMs);
        scheduleTimeout(() => {
          setRevealPhase('impact');
          const container = containerRef.current;
          const players = playersSnapshotRef.current;
          const pawnAnchor = resolvePlayerAnchor(container, nextBanner.actorId, players);
          const cw = container?.clientWidth || 720;
          activeCombatAnimsRef.current.push({
            uid: `${nextBanner.id}::faction-burst`,
            event: {
              id: `${nextBanner.id}::faction-burst`,
              kind: 'COMBAT_VFX',
              order: 31,
              durationMs: 760,
              effect: 'HEAL_AURA',
              sourcePlayerId: nextBanner.actorId,
              targetPlayerIds: [],
              shake: 'none',
            },
            source: { x: cw * 0.5, y: 92 },
            targets: [pawnAnchor],
            startedAt: performance.now(),
            durationMs: 760,
            factionReveal: nextBanner.faction ?? 'lantern-guard',
          });
          setActiveCombatCount(activeCombatAnimsRef.current.length);
          ensureCanvasLoop();
          if (enableScreenShakeRef.current && nextBanner.faction === 'mist-order') {
            setScreenShake('light');
            scheduleTimeout(() => setScreenShake('none'), 210);
          }
        }, revTl.revealEndMs);
        scheduleTimeout(() => {
          setRevealPhase('settle');
        }, revTl.impactEndMs);
      }
    } else if (nextBanner.bannerType === 'VICTORY') {
      setRevealPhase('settle');
      const container = containerRef.current;
      const cw = container?.clientWidth || 720;
      const ch = container?.clientHeight || 480;
      activeCombatAnimsRef.current.push({
        uid: `${nextBanner.id}::victory-fireworks`,
        event: {
          id: `${nextBanner.id}::victory-fireworks`,
          kind: 'COMBAT_VFX',
          order: 63,
          durationMs: nextBanner.durationMs,
          effect: 'HEAL_AURA',
          sourcePlayerId: null,
          targetPlayerIds: [],
          shake: 'none',
        },
        source: { x: cw * 0.5, y: ch * 0.35 },
        targets: [
          { x: cw * 0.25, y: ch * 0.28 },
          { x: cw * 0.5, y: ch * 0.22 },
          { x: cw * 0.75, y: ch * 0.3 },
        ],
        startedAt: performance.now(),
        durationMs: nextBanner.durationMs,
        victoryFactionBurst: nextBanner.faction ?? 'lantern-guard',
      });
      setActiveCombatCount(activeCombatAnimsRef.current.length);
      ensureCanvasLoop();
    } else {
      setRevealPhase('settle');
    }

    scheduleTimeout(() => {
      setActiveCutIn((curr) => (curr?.id === nextBanner.id ? null : curr));
    }, nextBanner.durationMs);
  }, [activeCutIn, containerRef, cutInQueue, ensureCanvasLoop, scheduleTimeout]);

  const enqueueEvents = useCallback(
    (events: readonly BoardGameVisualEvent[]) => {
      if (events.length === 0) return;
      const container = containerRef.current;
      const players = playersSnapshotRef.current;
      const newCutIns: CinematicCutInVisualEvent[] = [];
      const isReduced = reducedMotionRef.current;
      const primaryOffensive =
        events.find(
          (e): e is CombatVfxVisualEvent =>
            e.kind === 'COMBAT_VFX' &&
            e.effect !== 'HEAL_AURA' &&
            e.effect !== 'SHIELD_GUARD' &&
            e.effect !== 'STEAL_TETHER' &&
            e.effect !== 'COUNTER_STRIKE',
        ) ?? null;
      const counterEvt =
        events.find(
          (e): e is CombatVfxVisualEvent =>
            e.kind === 'COMBAT_VFX' && e.effect === 'COUNTER_STRIKE',
        ) ?? null;
      const batchAttackTimings = primaryOffensive
        ? resolveCombatSequenceTimings(primaryOffensive.durationMs, primaryOffensive.effect, isReduced)
        : null;
      const batchCounterTimings = counterEvt
        ? resolveCombatSequenceTimings(counterEvt.durationMs, counterEvt.effect, isReduced)
        : null;
      const counterDelayMs =
        !isReduced && primaryOffensive && counterEvt
          ? Math.max(170, Math.min(240, batchAttackTimings?.travelEndMs ?? 200))
          : 0;

      for (const ev of events) {
        switch (ev.kind) {
          case 'DICE_ROLL': {
            const hasDestinationMove = Boolean(
              ev.diceKind === 'move' &&
                ev.resolvedLocation &&
                !ev.rerollRequired &&
                !ev.freeChoice,
            );
            const timeline = buildDiceRollTimeline({
              diceKind: ev.diceKind,
              qualityTier: qualityTierRef.current,
              pawnGlideDurationMs: pawnGlideDurationMsRef.current,
              reducedMotion: reducedMotionRef.current,
              hasDestinationMove,
            });
            activeDiceIdRef.current = ev.id;
            playSoundForVisualEvent({
              ...ev,
              durationMs: timeline.diceOverlayEndMs,
              settleAtMs: timeline.diceSettleAtMs,
            });
            setActiveDiceRoll(ev);
            setActiveMoveTimeline(timeline);

            const triggerDestHighlight = () => {
              if (!hasDestinationMove || !ev.resolvedLocation) return;
              const dest = ev.resolvedLocation;
              const hlToken = ++highlightTokenRef.current;
              setHighlightedLocationId(dest);
              const holdDuration = Math.max(
                0,
                timeline.destHighlightEndMs - timeline.destHighlightStartMs,
              );
              scheduleTimeout(() => {
                if (highlightTokenRef.current === hlToken) {
                  setHighlightedLocationId((cur) => (cur === dest ? null : cur));
                }
              }, holdDuration);
            };

            if (timeline.diceSettleAtMs <= 0) {
              setDiceRollStage('settled');
              triggerDestHighlight();
            } else {
              highlightTokenRef.current += 1;
              setHighlightedLocationId(null);
              setDiceRollStage('windup');
              scheduleTimeout(() => {
                if (activeDiceIdRef.current === ev.id) setDiceRollStage('tumble');
              }, timeline.windupEndMs);
              scheduleTimeout(() => {
                if (activeDiceIdRef.current === ev.id) setDiceRollStage('decelerate');
              }, timeline.tumbleEndMs);
              scheduleTimeout(() => {
                if (activeDiceIdRef.current === ev.id) {
                  setDiceRollStage('settled');
                  triggerDestHighlight();
                }
              }, timeline.diceSettleAtMs);
            }

            scheduleTimeout(() => {
              if (activeDiceIdRef.current === ev.id) {
                activeDiceIdRef.current = null;
                setDiceRollStage('idle');
                setActiveMoveTimeline(null);
              }
              setActiveDiceRoll((curr) => (curr?.id === ev.id ? null : curr));
            }, timeline.diceOverlayEndMs);
            break;
          }
          case 'CARD_DRAW': {
            playSoundForVisualEvent(ev);
            const deckOrigin = resolveDeckAnchor(container, ev.deck);
            const cw = container?.clientWidth || 720;
            const ch = container?.clientHeight || 480;
            const fromDelta = {
              x: Math.round(deckOrigin.x - cw * 0.5),
              y: Math.round(deckOrigin.y - ch * 0.5),
            };
            setActiveCardDraw({ event: ev, revealedFace: false, fromDelta });
            activeCombatAnimsRef.current.push({
              uid: `${ev.id}::deck-burst`,
              event: {
                id: `${ev.id}::deck-burst`,
                kind: 'COMBAT_VFX',
                order: ev.order,
                durationMs: Math.min(820, ev.durationMs),
                effect: 'HEAL_AURA',
                sourcePlayerId: ev.actorId,
                targetPlayerIds: [],
                shake: 'none',
              },
              source: deckOrigin,
              targets: [{ x: cw * 0.5, y: ch * 0.5 }],
              startedAt: performance.now(),
              durationMs: Math.min(820, ev.durationMs),
              deckThemeBurst: ev.deck,
            });
            setActiveCombatCount(activeCombatAnimsRef.current.length);
            ensureCanvasLoop();

            if (ev.showFront) {
              scheduleTimeout(() => {
                playCardFlip();
                setActiveCardDraw((curr) =>
                  curr?.event.id === ev.id ? { ...curr, revealedFace: true } : curr,
                );
              }, Math.min(260, Math.round(ev.durationMs * 0.3)));
            }
            scheduleTimeout(() => {
              setActiveCardDraw((curr) => (curr?.event.id === ev.id ? null : curr));
            }, ev.durationMs);
            break;
          }
          case 'COMBAT_VFX': {
            const source = resolvePlayerAnchor(container, ev.sourcePlayerId, players);
            const targets = (ev.targetPlayerIds.length > 0 ? ev.targetPlayerIds : [ev.sourcePlayerId ?? '']).map(
              (tid) => resolvePlayerAnchor(container, tid, players),
            );
            const seqTimings = resolveCombatSequenceTimings(
              ev.durationMs,
              ev.effect,
              reducedMotionRef.current,
            );
            const startDelayMs =
              ev.effect === 'COUNTER_STRIKE' ? counterDelayMs : 0;

            const launchCombatFx = () => {
              activeCombatAnimsRef.current.push({
                uid: ev.id,
                event: ev,
                source,
                targets,
                startedAt: performance.now(),
                durationMs: ev.durationMs,
              });
              setActiveCombatCount(activeCombatAnimsRef.current.length);
              ensureCanvasLoop();
              playSoundForVisualEvent(ev);

              if (seqTimings.hitStopDurationMs > 0 && !reducedMotionRef.current) {
                const isCounter = ev.effect === 'COUNTER_STRIKE';
                const flashColor = isCounter
                  ? '#c084fc'
                  : ev.effect === 'LIGHTNING_STRIKE'
                    ? '#34d399'
                    : ev.effect === 'SPEAR_THRUST'
                      ? '#38bdf8'
                      : '#fbbf24';
                const flashSecondary = isCounter ? '#f43f5e' : '#fef08a';
                scheduleTimeout(() => {
                  const created = targets.map((pt, idx) => ({
                    uid: `${ev.id}::flash::${idx}`,
                    x: pt.x,
                    y: pt.y,
                    color: flashColor,
                    secondaryColor: flashSecondary,
                    isCounter,
                    hitStopMs: seqTimings.hitStopDurationMs,
                  }));
                  setImpactFlashes((prev) => [...prev.slice(-6), ...created]);
                  scheduleTimeout(() => {
                    const createdIds = new Set(created.map((f) => f.uid));
                    setImpactFlashes((prev) => prev.filter((f) => !createdIds.has(f.uid)));
                  }, 320);
                }, seqTimings.travelEndMs);
              }

              if (enableScreenShakeRef.current && ev.shake !== 'none') {
                const shakeDelay = reducedMotionRef.current
                  ? 0
                  : Math.max(0, seqTimings.travelEndMs - 16);
                scheduleTimeout(() => {
                  setScreenShake(ev.shake);
                  scheduleTimeout(() => setScreenShake('none'), ev.shake === 'heavy' ? 290 : 210);
                }, shakeDelay);
              }
            };

            if (startDelayMs > 0) {
              scheduleTimeout(launchCombatFx, startDelayMs);
            } else {
              launchCombatFx();
            }
            break;
          }
          case 'FLOATING_TEXT': {
            const pt = resolvePlayerAnchor(container, ev.targetPlayerId, players);
            const jitterX = ((ev.targetPlayerId.charCodeAt(ev.targetPlayerId.length - 1) || 0) % 3 - 1) * 8;
            const uid = ev.id;
            const spawnMs = reducedMotionRef.current
              ? 0
              : ev.variant === 'counter'
                ? counterDelayMs + (batchCounterTimings?.damagePopAtMs ?? 240)
                : (ev.variant === 'damage' || ev.variant === 'miss') && batchAttackTimings
                  ? batchAttackTimings.damagePopAtMs
                  : 90;
            scheduleTimeout(() => {
              setFloatingPopups((prev) => {
                const sameTargetCount = prev.filter(
                  (item) => item.event.targetPlayerId === ev.targetPlayerId,
                ).length;
                const variantOffsetY = ev.variant === 'counter' ? -24 : 0;
                const stackOffsetY = -sameTargetCount * 24;
                const stackOffsetX = (sameTargetCount % 2 === 1 ? 18 : 0);
                return [
                  ...prev.slice(-10),
                  {
                    uid,
                    event: ev,
                    x: pt.x + jitterX + stackOffsetX,
                    y: pt.y - 14 + variantOffsetY + stackOffsetY,
                  },
                ];
              });
              scheduleTimeout(() => {
                setFloatingPopups((prev) => prev.filter((p) => p.uid !== uid));
              }, ev.durationMs);
            }, spawnMs);
            break;
          }
          case 'CINEMATIC_CUTIN': {
            newCutIns.push(ev);
            break;
          }
        }
      }

      if (newCutIns.length > 0) {
        setCutInQueue((prev) => [...prev.slice(-6), ...newCutIns]);
      }
    },
    [containerRef, ensureCanvasLoop, scheduleTimeout],
  );

  // Phát hiện delta từ mỗi bản publicGame mới
  useEffect(() => {
    const tracker = trackerRef.current;
    const ctx = {
      selfPlayerId,
      isSpectator,
      privateView,
      reducedMotion,
    };

    if (seenMatchRef.current !== publicGame.matchId) {
      seenMatchRef.current = publicGame.matchId;
      skipAllAnimations();
      prevPlayerLocationsRef.current = new Map(
        publicGame.players.map((p) => [p.playerId, p.location]),
      );
      const opening = tracker.seedBaseline(publicGame, ctx);
      if (opening.length > 0) {
        enqueueEvents(opening);
      }
      return;
    }

    const fresh = tracker.ingestSnapshot(publicGame, ctx);
    if (fresh.length > 0) {
      enqueueEvents(fresh);
    }

    // Nếu người chơi di chuyển không qua event DICE_ROLL mới (ví dụ chọn ô sau tổng 7 / La Bàn)
    // thì kích hoạt highlight đích theo timeline chọn trực tiếp đồng bộ với FLIP pawn glide.
    if (!fresh.some((e) => e.kind === 'DICE_ROLL')) {
      const movedPlayer = publicGame.players.find((p) => {
        const prevLoc = prevPlayerLocationsRef.current.get(p.playerId);
        return prevLoc !== undefined && prevLoc !== p.location;
      });
      if (movedPlayer) {
        const directTimeline = buildDirectMoveTimeline({
          pawnGlideDurationMs: pawnGlideDurationMsRef.current,
          reducedMotion,
        });
        const dest = movedPlayer.location;
        const hlToken = ++highlightTokenRef.current;
        setHighlightedLocationId(dest);
        scheduleTimeout(() => {
          if (highlightTokenRef.current === hlToken) {
            setHighlightedLocationId((cur) => (cur === dest ? null : cur));
          }
        }, directTimeline.destHighlightEndMs);
      }
    }

    prevPlayerLocationsRef.current = new Map(
      publicGame.players.map((p) => [p.playerId, p.location]),
    );
  }, [
    publicGame,
    privateView,
    selfPlayerId,
    isSpectator,
    reducedMotion,
    enqueueEvents,
    scheduleTimeout,
    skipAllAnimations,
  ]);

  useEffect(() => {
    const canvas = combatLayerRef.current;
    return () => {
      clearAllTimers();
      activeCombatAnimsRef.current = [];
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Giải phóng bộ nhớ đệm GPU của Canvas 2D khi rời bàn chơi
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
    };
  }, [clearAllTimers]);

  // Suy xuất đồng bộ ngay trong frame render đầu tiên sau snapshot mới:
  // ngăn GameBoard lóe kết quả server trước khi useEffect khởi tạo animation xúc xắc.
  const pendingDiceRoll =
    seenMatchRef.current === publicGame.matchId
      ? trackerRef.current.peekPendingDiceRoll(publicGame, reducedMotion)
      : null;
  const effectiveActiveDiceRoll = pendingDiceRoll ?? activeDiceRoll;
  const effectiveDiceRollStage: DiceRollStage = pendingDiceRoll
    ? reducedMotion
      ? 'settled'
      : 'windup'
    : activeDiceRoll
      ? reducedMotion && !isDiceResultRevealed(diceRollStage)
        ? 'settled'
        : diceRollStage
      : 'idle';
  const effectiveIsDiceSettled =
    !effectiveActiveDiceRoll || isDiceResultRevealed(effectiveDiceRollStage);
  const effectiveHighlightedLocationId =
    pendingDiceRoll && !reducedMotion ? null : highlightedLocationId;

  const hasActiveEffects =
    activeCombatCount > 0 ||
    floatingPopups.length > 0 ||
    impactFlashes.length > 0 ||
    Boolean(effectiveActiveDiceRoll) ||
    Boolean(effectiveHighlightedLocationId) ||
    Boolean(activeCardDraw) ||
    Boolean(activeCutIn) ||
    cutInQueue.length > 0;

  return {
    activeCombatCount,
    floatingPopups,
    impactFlashes,
    activeDiceRoll: effectiveActiveDiceRoll,
    diceRollStage: effectiveDiceRollStage,
    isDiceSettled: effectiveIsDiceSettled,
    activeMoveTimeline,
    highlightedLocationId: effectiveHighlightedLocationId,
    skipGeneration,
    activeCardDraw,
    activeCutIn,
    revealPhase,
    screenShake,
    reducedMotion,
    enableBackdropBlur,
    enableFoil,
    qualityTier,
    hasActiveEffects,
    combatLayerRef,
    skipAllAnimations,
    enqueueEvents,
    setReducedMotionOverride: setLocalReducedOverride,
  };
}

export interface BoardGameVfxStageProps {
  vfx: BoardGameVfxState;
  containerRef: React.RefObject<HTMLDivElement>;
  publicGame: BoardGamePublicGameView;
  sourcePlayerId: string | null;
  selectedTargetId: string | null;
  targetingTone?: 'hostile' | 'heal';
}

export const BoardGameVfxStage = React.memo(function BoardGameVfxStage({
  vfx,
  containerRef,
  publicGame,
  sourcePlayerId,
  selectedTargetId,
  targetingTone = 'hostile',
}: BoardGameVfxStageProps) {
  const [targetLine, setTargetLine] = useState<{ from: Point2D; to: Point2D } | null>(null);
  const [revealAnchor, setRevealAnchor] = useState<Point2D | null>(null);
  const playersRef = useRef(publicGame.players);
  playersRef.current = publicGame.players;

  const playersLocationSig = useMemo(
    () => publicGame.players.map((p) => `${p.playerId}:${p.location}:${p.alive ? 1 : 0}`).join('|'),
    [publicGame.players],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !selectedTargetId || !sourcePlayerId || selectedTargetId === sourcePlayerId) {
      setTargetLine(null);
      return;
    }
    const updateLine = () => {
      const from = resolvePlayerAnchor(container, sourcePlayerId, playersRef.current);
      const to = resolvePlayerAnchor(container, selectedTargetId, playersRef.current);
      setTargetLine({ from, to });
    };
    updateLine();
    window.addEventListener('resize', updateLine);
    return () => window.removeEventListener('resize', updateLine);
  }, [containerRef, selectedTargetId, sourcePlayerId, playersLocationSig]);

  const cutIn = vfx.activeCutIn;
  const isRoleRevealCutIn = cutIn?.bannerType === 'ROLE_REVEAL';
  const revealActorId = isRoleRevealCutIn ? cutIn?.actorId ?? null : null;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isRoleRevealCutIn || !revealActorId) {
      setRevealAnchor(null);
      return;
    }
    const updateAnchor = () => {
      setRevealAnchor(resolvePlayerAnchor(container, revealActorId, playersRef.current));
    };
    updateAnchor();
    window.addEventListener('resize', updateAnchor);
    return () => window.removeEventListener('resize', updateAnchor);
  }, [containerRef, isRoleRevealCutIn, revealActorId, playersLocationSig]);
  const cutInTheme = cutIn?.faction ? MIDNIGHT_FACTION_TOKENS[cutIn.faction] : null;
  const cutInAccent =
    cutInTheme?.primaryHex ??
    (cutIn?.bannerType === 'VICTORY'
      ? '#fbbf24'
      : cutIn?.bannerType === 'ELIMINATION'
        ? '#f43f5e'
        : '#38bdf8');
  const cutInSecondary = cutInTheme?.secondaryHex ?? '#fde68a';
  const blurCls = vfx.enableBackdropBlur ? 'backdrop-blur-md' : '';

  return (
    <div
      data-testid="bg-vfx-stage"
      data-quality-tier={vfx.qualityTier}
      data-reduced-motion={String(vfx.reducedMotion)}
      className="pointer-events-none absolute inset-0 z-[48] overflow-hidden"
    >
      {/* LỚP 1: SVG ĐƯỜNG NHẮM MỤC TIÊU */}
      {targetLine && (
        <svg
          data-testid="bg-vfx-targeting-line"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="bg-vfx-arrow"
              markerWidth="10"
              markerHeight="10"
              refX="7"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 8 3.5, 0 7"
                fill={targetingTone === 'heal' ? '#34d399' : '#fb7185'}
              />
            </marker>
          </defs>
          <path
            d={`M ${targetLine.from.x} ${targetLine.from.y} Q ${(targetLine.from.x + targetLine.to.x) / 2} ${Math.min(targetLine.from.y, targetLine.to.y) - 42} ${targetLine.to.x} ${targetLine.to.y}`}
            fill="none"
            stroke={targetingTone === 'heal' ? '#34d399' : '#fb7185'}
            strokeWidth="3"
            strokeDasharray="7 5"
            strokeOpacity="0.88"
            markerEnd="url(#bg-vfx-arrow)"
          />
          <circle
            cx={targetLine.to.x}
            cy={targetLine.to.y}
            r="16"
            fill="none"
            stroke={targetingTone === 'heal' ? '#6ee7b7' : '#fda4af'}
            strokeWidth="2.2"
            strokeDasharray="4 3"
          />
        </svg>
      )}

      {/* LỚP 2: CANVAS 2D COMBAT PARTICLES & BEAMS */}
      <canvas
        ref={vfx.combatLayerRef}
        data-testid="bg-vfx-combat-canvas"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* LỚP 2B: IMPACT FLASH RINGS (75ms HIT-STOP IMPACT) */}
      {vfx.impactFlashes.map((flash) => (
        <div
          key={flash.uid}
          data-testid="bg-vfx-impact-flash"
          data-counter={String(flash.isCounter)}
          data-hit-stop-ms={flash.hitStopMs}
          style={{
            left: flash.x,
            top: flash.y,
            borderColor: flash.color,
            background: `radial-gradient(circle, ${flash.secondaryColor}88 0%, ${flash.color}33 48%, transparent 74%)`,
            boxShadow: `0 0 28px ${flash.color}cc`,
          }}
          className={`pointer-events-none absolute z-[19] h-20 w-20 rounded-full border-2 ${
            vfx.reducedMotion ? '-translate-x-1/2 -translate-y-1/2 opacity-80' : 'bg-vfx-impact-flash'
          }`}
        />
      ))}

      {/* LỚP 3: FLOATING DAMAGE / HEAL / BLOCK / COUNTER */}
      {vfx.floatingPopups.map((pop) => {
        const meta =
          pop.event.variant === 'damage'
            ? {
                animCls: 'bg-vfx-float-damage',
                pillCls:
                  'border-rose-400/80 bg-gradient-to-b from-rose-950/95 to-slate-950/95 text-rose-200 shadow-[0_6px_18px_rgba(225,29,72,0.55)]',
                icon: '💥',
                sizeCls: 'text-xl sm:text-2xl px-2.5 py-0.5',
              }
            : pop.event.variant === 'heal'
              ? {
                  animCls: 'bg-vfx-float-heal',
                  pillCls:
                    'border-emerald-300/85 bg-gradient-to-b from-emerald-950/95 to-slate-950/95 text-emerald-200 shadow-[0_6px_18px_rgba(16,185,129,0.5)]',
                  icon: '💚',
                  sizeCls: 'text-lg sm:text-xl px-2.5 py-0.5',
                }
              : pop.event.variant === 'block'
                ? {
                    animCls: 'bg-vfx-float-block',
                    pillCls:
                      'border-sky-300/85 bg-gradient-to-b from-sky-950/95 to-slate-950/95 text-sky-100 shadow-[0_6px_18px_rgba(56,189,248,0.5)]',
                    icon: '🛡️',
                    sizeCls: 'text-base sm:text-lg px-2.5 py-0.5 uppercase tracking-wider',
                  }
                : pop.event.variant === 'counter'
                  ? {
                      animCls: 'bg-vfx-float-counter',
                      pillCls:
                        'border-fuchsia-400/90 bg-gradient-to-r from-purple-950/95 via-rose-950/95 to-slate-950/95 text-amber-200 shadow-[0_6px_22px_rgba(168,85,247,0.6)]',
                      icon: '⚔️',
                      sizeCls: 'text-base sm:text-lg px-2.5 py-0.5 uppercase tracking-wider',
                    }
                  : pop.event.variant === 'steal'
                    ? {
                        animCls: 'bg-vfx-float-pop',
                        pillCls:
                          'border-amber-300/85 bg-amber-950/95 text-amber-200 shadow-[0_6px_18px_rgba(245,158,11,0.5)]',
                        icon: '🧲',
                        sizeCls: 'text-base sm:text-lg px-2.5 py-0.5 uppercase tracking-wider',
                      }
                    : {
                        animCls: 'bg-vfx-float-pop',
                        pillCls: 'border-slate-500/70 bg-slate-950/90 text-slate-300',
                        icon: '💨',
                        sizeCls: 'text-base sm:text-lg px-2 py-0.5',
                      };
        return (
          <div
            key={pop.uid}
            data-testid="bg-vfx-floating-popup"
            data-variant={pop.event.variant}
            data-target-player={pop.event.targetPlayerId}
            style={{ left: pop.x, top: pop.y }}
            className={`pointer-events-none absolute z-20 -translate-x-1/2 font-black tracking-tight tabular-nums ${
              vfx.reducedMotion ? '' : meta.animCls
            }`}
          >
            <span
              className={`inline-flex items-center gap-1 rounded-xl border ${meta.sizeCls} ${meta.pillCls}`}
            >
              <span aria-hidden="true" className="text-sm sm:text-base leading-none">
                {meta.icon}
              </span>
              <span>{pop.event.label}</span>
            </span>
          </div>
        );
      })}

      {/* LỚP 4A: XÚC XẮC 3D LĂN -> GIẢM TỐC -> CHỐT ĐÚNG KẾT QUẢ SERVER */}
      {vfx.activeDiceRoll && (
        <div
          data-testid="bg-vfx-dice-overlay"
          data-dice-stage={vfx.diceRollStage}
          data-dice-settled={String(vfx.isDiceSettled)}
          className="pointer-events-none absolute inset-x-0 bottom-20 flex justify-center px-3"
        >
          <div
            className={`flex items-center gap-3.5 rounded-2xl border px-4 py-3 shadow-2xl transition-colors duration-200 ${blurCls} ${
              !vfx.isDiceSettled
                ? 'border-indigo-400/70 bg-slate-950/95 text-slate-100'
                : vfx.activeDiceRoll.freeChoice
                  ? 'border-amber-300/90 bg-amber-950/95 text-amber-100 shadow-[0_14px_34px_rgba(251,191,36,0.35)]'
                  : vfx.activeDiceRoll.rerollRequired
                    ? 'border-orange-400/90 bg-orange-950/95 text-orange-100'
                    : 'border-emerald-400/80 bg-slate-900/95 text-white shadow-[0_14px_32px_rgba(16,185,129,0.25)]'
            }`}
          >
            <MidnightDicePair3D
              d6={vfx.activeDiceRoll.d6}
              d4={vfx.activeDiceRoll.d4}
              stage={vfx.diceRollStage}
              size={44}
              enable3D={vfx.qualityTier !== 'low' && !vfx.reducedMotion}
            />
            <div className="min-w-0 text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                {vfx.activeDiceRoll.actorName} ·{' '}
                {vfx.activeDiceRoll.diceKind === 'attack' ? 'Xúc xắc tấn công' : 'Xúc xắc di chuyển'}
              </p>
              {vfx.isDiceSettled ? (
                <p className="mt-0.5 text-sm sm:text-base font-black text-white">
                  {vfx.activeDiceRoll.diceKind === 'attack'
                    ? `Kết quả: |${vfx.activeDiceRoll.d6} - ${vfx.activeDiceRoll.d4}| = ${vfx.activeDiceRoll.total}`
                    : `Tổng: ${vfx.activeDiceRoll.d6} + ${vfx.activeDiceRoll.d4} = ${vfx.activeDiceRoll.total}`}
                  {vfx.activeDiceRoll.freeChoice ? ' ✨ CHỌN TỰ DO!' : ''}
                  {vfx.activeDiceRoll.rerollRequired ? ' 🔁 ĐỔ LẠI!' : ''}
                </p>
              ) : (
                <p className="mt-0.5 text-sm font-black text-amber-200">
                  🎲 Đang tung xúc xắc...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LỚP 4B: CARD DRAW / 3D FLIP OVERLAY (TÔN TRỌNG BẢO MẬT MẶT BÀI) */}
      {vfx.activeCardDraw && (() => {
        const { event, revealedFace, fromDelta } = vfx.activeCardDraw;
        const deckTok = MIDNIGHT_DECK_TOKENS[event.deck];
        const canFlipFront = event.showFront && revealedFace;
        const artSrc = event.cardId ? MIDNIGHT_CARD_ART[event.cardId] ?? null : null;
        const ringAccent =
          event.deck === 'investigation'
            ? '#34d399'
            : event.deck === 'equipment'
              ? '#38bdf8'
              : '#f43f5e';
        const flightStyle =
          !vfx.reducedMotion && fromDelta
            ? ({
                '--card-from-x': `${fromDelta.x}px`,
                '--card-from-y': `${fromDelta.y}px`,
              } as React.CSSProperties)
            : undefined;
        return (
          <div
            data-testid="bg-vfx-card-draw"
            data-deck={event.deck}
            data-show-front={String(event.showFront)}
            className="pointer-events-none absolute inset-0 flex items-center justify-center p-4"
          >
            <div
              className={`relative ${vfx.reducedMotion ? '' : 'bg-vfx-card-flight'}`}
              style={flightStyle}
            >
              {!vfx.reducedMotion && (
                <div
                  aria-hidden="true"
                  className="bg-vfx-card-draw-ring pointer-events-none absolute -inset-3 rounded-3xl border-2"
                  style={{
                    borderColor: ringAccent,
                    boxShadow: `0 0 28px ${ringAccent}88`,
                  }}
                />
              )}
              <div className="mn-card-perspective relative z-10 w-36 sm:w-44 aspect-[2/3]">
                <div
                  className="mn-card-flip-stage relative h-full w-full rounded-2xl shadow-2xl"
                  style={{ transform: canFlipFront ? 'rotateY(0deg)' : 'rotateY(180deg)' }}
                >
                  {/* Mặt trước (chỉ mở nếu server/chủ sở hữu cho phép thấy) */}
                  <div
                    className="mn-card-face absolute inset-0 overflow-hidden rounded-2xl p-[2px]"
                    style={{ background: deckTok.frameGradientCss }}
                  >
                    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[14px] bg-slate-950 p-2.5">
                      {artSrc && (
                        <img
                          src={artSrc}
                          alt={event.cardTitle ?? deckTok.label}
                          className="absolute inset-0 h-full w-full object-cover opacity-85"
                        />
                      )}
                      {vfx.enableFoil && (
                        <div
                          aria-hidden="true"
                          className="mn-foil-sweep pointer-events-none absolute inset-0 opacity-25"
                          style={{
                            backgroundImage:
                              'linear-gradient(115deg, transparent 22%, rgba(255,255,255,0.52) 48%, transparent 74%)',
                          }}
                        />
                      )}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-slate-950/95"
                      />
                      <span className={`relative z-10 w-fit rounded-full border px-2 py-0.5 text-[9px] font-black ${deckTok.badgeClass}`}>
                        {deckTok.label}
                      </span>
                      <div className="relative z-10 mt-auto">
                        {event.autoEquipped && (
                          <p className="text-[9px] font-extrabold uppercase text-amber-300">
                            ⚡ Trang bị ngay
                          </p>
                        )}
                        <p className="text-xs font-black text-white leading-tight">
                          {event.cardTitle ?? deckTok.label}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mặt lưng kín (dùng cho bài chưa lật / người ngoài nhìn) */}
                  <div
                    className="mn-card-face mn-card-face-back absolute inset-0 overflow-hidden rounded-2xl p-[2px]"
                    style={{ background: deckTok.frameGradientCss }}
                  >
                    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[14px] bg-slate-950 p-2.5">
                      <img
                        src={MIDNIGHT_CARD_BACK_ART}
                        alt="Mặt lưng thẻ rút"
                        className="absolute inset-0 h-full w-full object-cover opacity-85"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 opacity-75"
                        style={{ background: deckTok.backGradientCss }}
                      />
                      <span className={`relative z-10 w-fit rounded-full border px-2 py-0.5 text-[9px] font-black ${deckTok.badgeClass}`}>
                        {deckTok.label}
                      </span>
                      <div className="relative z-10 mt-auto rounded-lg bg-slate-950/90 p-2 text-center border border-white/15">
                        <p className="text-[10px] font-black text-white">
                          {CARD_BACK_SECRET_TITLES[event.deck]}
                        </p>
                        <p className="text-[9px] text-slate-300">{event.actorName} vừa rút</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* LỚP 5: CINEMATIC CUT-IN & ROLE REVEAL SPOTLIGHT OVERLAY */}
      {cutIn && isRoleRevealCutIn && (() => {
        const revealPhase = vfx.reducedMotion ? 'settle' : vfx.revealPhase;
        const showPortraitFace = vfx.reducedMotion || revealPhase !== 'anticipation';
        const showImpactBurst = !vfx.reducedMotion && (revealPhase === 'impact' || revealPhase === 'settle');
        const spotX = revealAnchor ? `${Math.round(revealAnchor.x)}px` : '50%';
        const spotY = revealAnchor ? `${Math.round(revealAnchor.y)}px` : '45%';
        const factionMotionAccent =
          cutIn.faction === 'mist-order'
            ? '-skew-x-12 rotate-2'
            : cutIn.faction === 'wanderer'
              ? 'skew-x-6'
              : '-skew-x-6';

        return (
          <>
            {/* Darkened theatrical backdrop + spotlight on actor token & reveal center */}
            <div
              data-testid="bg-vfx-reveal-spotlight"
              data-reveal-phase={revealPhase}
              data-faction={cutIn.faction ?? 'unknown'}
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 z-[29] ${
                vfx.reducedMotion ? '' : 'bg-vfx-reveal-vignette'
              }`}
              style={{
                background: [
                  `radial-gradient(circle 190px at ${spotX} ${spotY}, ${cutInAccent}2e 0%, rgba(2,6,23,0.12) 48%, rgba(2,6,23,0.74) 100%)`,
                  `radial-gradient(ellipse 340px 210px at 50% 96px, ${cutInAccent}38 0%, transparent 72%)`,
                ].join(', '),
              }}
            />

            <div
              data-testid="bg-vfx-cutin"
              data-banner-type={cutIn.bannerType}
              data-reveal-phase={revealPhase}
              data-faction={cutIn.faction ?? 'unknown'}
              className="pointer-events-none absolute inset-x-0 top-2 sm:top-4 z-30 flex justify-center px-3"
            >
              <div
                className={`relative flex w-full max-w-2xl items-center gap-4 overflow-visible rounded-2xl border-2 bg-slate-950/95 px-4 py-3 shadow-2xl ${blurCls} ${
                  vfx.reducedMotion ? '' : 'bg-vfx-reveal-push'
                }`}
                style={{
                  borderColor: cutInAccent,
                  boxShadow:
                    revealPhase === 'impact'
                      ? `0 24px 70px -8px ${cutInAccent}cc, 0 0 36px ${cutInSecondary}66`
                      : `0 20px 55px -10px ${cutInAccent}99`,
                }}
              >
                {/* Vệt chéo ánh sáng đặc trưng phe Anime Noir */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 overflow-hidden rounded-2xl`}
                >
                  <div
                    className={`absolute inset-y-0 -left-12 w-56 ${factionMotionAccent} transition-opacity duration-300 ${
                      revealPhase === 'anticipation' ? 'opacity-15' : 'opacity-35'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${cutInAccent}, ${cutInSecondary}, transparent)`,
                    }}
                  />
                </div>

                {/* Hào quang tác động khi thẻ bài vừa lật mặt */}
                {showImpactBurst && (
                  <div
                    aria-hidden="true"
                    className="bg-vfx-reveal-impact-glow pointer-events-none absolute -inset-2 rounded-3xl border-2"
                    style={{
                      borderColor: cutInSecondary,
                      boxShadow: `0 0 34px ${cutInAccent}aa`,
                    }}
                  />
                )}

                {/* Thẻ bài lật 3D (mặt lưng huy hiệu -> phóng lớn chân dung vai trò) */}
                <div className="mn-card-perspective relative z-10 w-24 sm:w-28 aspect-[2/3] shrink-0">
                  <div
                    className="mn-card-flip-stage relative h-full w-full rounded-xl shadow-2xl"
                    style={{
                      transform: showPortraitFace ? 'rotateY(0deg) scale(1.04)' : 'rotateY(180deg) scale(0.95)',
                    }}
                  >
                    {/* Mặt trước: Chân dung nhân vật phóng lớn + biểu tượng phe */}
                    <div
                      className="mn-card-face absolute inset-0 overflow-hidden rounded-xl border-2 bg-slate-900 shadow-lg"
                      style={{
                        borderColor: cutInSecondary,
                        boxShadow: `0 0 24px ${cutInAccent}88`,
                      }}
                    >
                      {cutIn.portraitSrc ? (
                        <img
                          src={cutIn.portraitSrc}
                          alt={cutIn.roleName ?? cutIn.title}
                          className="h-full w-full object-cover object-top"
                        />
                      ) : cutIn.roleId ? (
                        <div className="flex h-full w-full items-center justify-center bg-slate-900">
                          <RolePortraitSvg roleId={cutIn.roleId} faction={cutIn.faction} size={86} />
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-900">
                          <FactionCrestSvg faction={cutIn.faction} size={56} />
                        </div>
                      )}
                      <div
                        aria-hidden="true"
                        className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent"
                      />
                      {cutIn.faction && (
                        <div className="absolute right-1.5 bottom-1.5 rounded-full bg-slate-950/85 p-1 border border-white/20 shadow">
                          <FactionCrestSvg faction={cutIn.faction} size={22} />
                        </div>
                      )}
                    </div>

                    {/* Mặt lưng bí mật khi anticipation */}
                    <div
                      className="mn-card-face mn-card-face-back absolute inset-0 overflow-hidden rounded-xl border-2 bg-slate-950 shadow-lg"
                      style={{ borderColor: cutInAccent }}
                    >
                      <img
                        src={MIDNIGHT_CARD_BACK_ART}
                        alt="Lật vai trò"
                        className="h-full w-full object-cover opacity-80"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-slate-950/80"
                      />
                      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center p-2 text-center">
                        <FactionCrestSvg faction={cutIn.faction} size={42} />
                        <span className="mt-1.5 text-[9px] font-black uppercase tracking-widest text-amber-200">
                          LỘ DIỆN
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nội dung vai trò & phe nổi bật */}
                <div className="relative z-10 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <FactionCrestSvg faction={cutIn.faction} size={30} />
                    <span
                      className="rounded-md px-2.5 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-950"
                      style={{ backgroundColor: cutInSecondary }}
                    >
                      {cutIn.title}
                    </span>
                    {cutIn.skillName && showPortraitFace && (
                      <span className="text-xs sm:text-sm font-black uppercase tracking-wide text-white">
                        ✦ {cutIn.skillName}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-base sm:text-xl font-black text-white">
                    {cutIn.subtitle}
                  </p>
                  {cutIn.roleName && showPortraitFace && (
                    <p className="mt-0.5 text-xs sm:text-sm font-bold" style={{ color: cutInSecondary }}>
                      {cutIn.roleName}
                      {cutInTheme ? ` · ${cutInTheme.label}` : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {cutIn && !isRoleRevealCutIn && (
        <div
          data-testid="bg-vfx-cutin"
          data-banner-type={cutIn.bannerType}
          data-role-id={cutIn.roleId ?? undefined}
          data-faction={cutIn.faction ?? undefined}
          className="pointer-events-none absolute inset-x-0 top-1 z-30 flex justify-center px-3"
        >
          <div
            className={`relative flex w-full max-w-xl items-center gap-3 overflow-hidden rounded-2xl border-2 bg-slate-950/95 px-3.5 py-2 shadow-2xl ${blurCls} ${
              vfx.reducedMotion ? '' : 'bg-vfx-cutin-enter'
            }`}
            style={{
              borderColor: cutInAccent,
              boxShadow: `0 20px 50px -10px ${cutInAccent}88`,
            }}
          >
            {/* Vệt chéo ánh sáng Anime Noir nền */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -left-10 w-44 -skew-x-12 opacity-25"
              style={{
                background: `linear-gradient(135deg, ${cutInAccent}, ${cutInSecondary})`,
              }}
            />

            {/* Chân dung khi là vai đã lộ diện / Tuyệt kỹ / Hạ gục */}
            {cutIn.roleId ? (
              <div
                className="relative z-10 h-14 w-10 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-900 shadow-lg"
                style={{ borderColor: cutInSecondary }}
              >
                {cutIn.portraitSrc ? (
                  <img
                    src={cutIn.portraitSrc}
                    alt={cutIn.roleName ?? cutIn.title}
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <RolePortraitSvg roleId={cutIn.roleId} faction={cutIn.faction} size={52} />
                  </div>
                )}
              </div>
            ) : (
              <div className="relative z-10 shrink-0">
                <FactionCrestSvg faction={cutIn.faction} size={42} />
              </div>
            )}

            <div className="relative z-10 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-md px-2 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-950"
                  style={{ backgroundColor: cutInSecondary }}
                >
                  {cutIn.title}
                </span>
                {cutIn.skillName && (
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wide text-white">
                    ✦ {cutIn.skillName}
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-sm sm:text-lg font-black text-white">
                {cutIn.subtitle}
              </p>
              {cutIn.roleName && (
                <p className="text-[11px] font-bold" style={{ color: cutInSecondary }}>
                  {cutIn.roleName}
                  {cutInTheme ? ` · ${cutInTheme.label}` : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LỚP 6: NÚT BỎ QUA HIỆU ỨNG (GÓC TRÊN PHẢI, KHÔNG CHE CHAT/ACTION/TILE — DUY NHẤT CÓ POINTER-EVENTS-AUTO) */}
      {vfx.hasActiveEffects && (
        <div className="pointer-events-none absolute top-1.5 right-3 z-40">
          <button
            type="button"
            data-testid="bg-skip-vfx-btn"
            onClick={vfx.skipAllAnimations}
            className="pointer-events-auto rounded-xl border border-amber-400/70 bg-slate-950/90 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-black text-amber-200 shadow-lg hover:bg-slate-900 transition cursor-pointer"
          >
            ⏭️ Bỏ qua hiệu ứng
          </button>
        </div>
      )}
    </div>
  );
});
