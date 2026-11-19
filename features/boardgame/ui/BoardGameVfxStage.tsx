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
  isFreshMatchOpening,
  resolveCombatSequenceTimings,
  resolveMultiTargetStaggerMs,
  resolveNonOverlappingPopupPos,
  resolveOpeningDealTimeline,
  resolveRoleRevealTimeline,
  resolveVictoryCinematicTimeline,
  type BoardGameVisualEvent,
  type CardDrawVisualEvent,
  type CinematicCutInVisualEvent,
  type CombatSequencePhase,
  type CombatSequenceTimings,
  type CombatVfxVisualEvent,
  type DiceRollVisualEvent,
  type FloatingTextVisualEvent,
  type MatchOutcomeView,
  type OpeningDealPhase,
  type RoleRevealPhase,
  type ScreenShakeLevel,
  type VictoryCinematicPhase,
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
  timings?: CombatSequenceTimings;
  factionReveal?: BoardGameFactionId | null;
  deckThemeBurst?: BoardGameDeckId | null;
  victoryFactionBurst?: BoardGameFactionId | null;
  victoryOutcome?: MatchOutcomeView | null;
  openingAmbientBurst?: boolean;
}

interface ActiveCombatFocusState {
  uid: string;
  effect: CombatVfxVisualEvent['effect'];
  phase: CombatSequencePhase;
  source: Point2D;
  targets: Point2D[];
  targetPlayerIds: string[];
  isCounter: boolean;
  isCritical: boolean;
  isMiss: boolean;
  hitStopDurationMs: number;
  accentColor: string;
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
  isCritical?: boolean;
  compact?: boolean;
  hitStopMs: number;
}

interface TrackedDomAnim {
  anim: Animation;
  baseZ: string;
}

function resolvePlayerElements(
  container: HTMLElement | null,
  playerId: string | null,
): HTMLElement[] {
  if (!container || !playerId) return [];
  const primary = Array.from(container.querySelectorAll<HTMLElement>(`[data-vfx-player="${playerId}"]`));
  const visible = primary.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  if (visible.length > 0) return visible;
  return Array.from(container.querySelectorAll<HTMLElement>(`[data-vfx-player-strip="${playerId}"]`)).filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

function getCombatAccentColor(ev: CombatVfxVisualEvent): { primary: string; secondary: string } {
  if (ev.isMiss) return { primary: '#94a3b8', secondary: '#e2e8f0' };
  if (ev.effect === 'COUNTER_STRIKE') return { primary: '#c084fc', secondary: '#f43f5e' };
  if (ev.effect === 'SHIELD_GUARD') return { primary: '#38bdf8', secondary: '#bae6fd' };
  if (ev.effect === 'HEAL_AURA') return { primary: '#34d399', secondary: '#fde047' };
  if (ev.effect === 'LIGHTNING_STRIKE') return { primary: '#34d399', secondary: '#fef08a' };
  if (ev.effect === 'SPEAR_THRUST') return { primary: '#38bdf8', secondary: '#fef08a' };
  if (ev.effect === 'EXPLOSION') return { primary: '#f97316', secondary: '#fef08a' };
  if (ev.effect === 'MASAMUNE_SLASH' || ev.isCritical) return { primary: '#fb7185', secondary: '#fde047' };
  if (ev.effect === 'STEAL_TETHER') return { primary: '#fbbf24', secondary: '#fef08a' };
  return { primary: '#fbbf24', secondary: '#fef08a' };
}

/**
 * Chuyển động vật lý trực tiếp lên quân cờ (`[data-vfx-player]`) & ô địa điểm (`[data-testid^="bg-loc-"]`)
 * bằng Web Animations API theo đúng 5 pha Target Lock -> Anticipation -> Travel -> Impact -> Recovery.
 * Không làm thay đổi layout Desktop Tactical Board V2 và tự hủy sạch khi Skip / Unmount.
 */
function runCombatPawnAndTileChoreography(
  container: HTMLElement | null,
  ev: CombatVfxVisualEvent,
  sourcePt: Point2D,
  targetPts: readonly Point2D[],
  timings: CombatSequenceTimings,
  reducedMotion: boolean,
  qualityTier: 'high' | 'balanced' | 'low',
  domAnimsRef: React.MutableRefObject<Map<HTMLElement, TrackedDomAnim>>,
): void {
  if (!container || reducedMotion || timings.recoveryEndMs <= 300) return;

  const total = Math.max(320, timings.recoveryEndMs);
  const lockF = Math.min(0.22, Math.max(0.06, timings.targetLockEndMs / total));
  const antF = Math.min(0.4, Math.max(lockF + 0.08, timings.anticipationEndMs / total));
  const impF = Math.min(0.62, Math.max(antF + 0.1, timings.impactStartMs / total));
  const hsEndF = Math.min(0.74, Math.max(impF + 0.02, timings.hitStopEndMs / total));
  const impEndF = Math.min(0.84, Math.max(hsEndF + 0.04, timings.impactEndMs / total));
  const colors = getCombatAccentColor(ev);

  const trackAnim = (el: HTMLElement, frames: Keyframe[], elevateZ = false, delayMs = 0) => {
    if (typeof el.animate !== 'function') return;
    // Hủy sạch animation cũ trên cùng quân cờ để tuyệt đối không lệch tọa độ hay rò z-index
    const existing = domAnimsRef.current.get(el);
    let baseZ = el.style.zIndex;
    if (existing) {
      baseZ = existing.baseZ;
      domAnimsRef.current.delete(el);
      try {
        existing.anim.onfinish = null;
        existing.anim.oncancel = null;
        existing.anim.cancel();
      } catch {
        // ignore finished animations
      }
      el.style.zIndex = baseZ;
    }
    if (elevateZ) el.style.zIndex = '36';
    const anim = el.animate(frames, {
      duration: total,
      delay: Math.max(0, delayMs),
      easing: 'linear',
      fill: 'none',
    });
    const entry: TrackedDomAnim = { anim, baseZ };
    domAnimsRef.current.set(el, entry);
    const cleanup = () => {
      if (domAnimsRef.current.get(el) === entry) {
        domAnimsRef.current.delete(el);
        el.style.zIndex = baseZ;
      }
    };
    anim.onfinish = cleanup;
    anim.oncancel = cleanup;
  };

  // Vector hướng chính từ nguồn tới mục tiêu đầu tiên
  const firstTgt = targetPts[0] ?? sourcePt;
  const rawDx = firstTgt.x - sourcePt.x;
  const rawDy = firstTgt.y - sourcePt.y;
  const rawLen = Math.hypot(rawDx, rawDy);
  const ux = rawLen > 4 ? rawDx / rawLen : 1;
  const uy = rawLen > 4 ? rawDy / rawLen : 0;

  const isCounter = ev.effect === 'COUNTER_STRIKE';
  const isShield = ev.effect === 'SHIELD_GUARD';
  const isHeal = ev.effect === 'HEAL_AURA';
  const isSteal = ev.effect === 'STEAL_TETHER';
  const isMiss = Boolean(ev.isMiss);
  const isCrit = Boolean(ev.isCritical);

  // 1) QUÂN TẤN CÔNG — Phân biệt rõ CHUYỂN ĐỘNG giữa Đòn thường, Chí mạng (kéo sâu -> đập mạnh) & Phản kích (đỡ -> xoay đảo hướng -> phản đòn)
  if (ev.sourcePlayerId && !isShield && !isHeal) {
    const srcEls = resolvePlayerElements(container, ev.sourcePlayerId);
    for (const srcEl of srcEls) {
      if (isCounter) {
        // Phản kích 3 nhịp tách biệt: Đỡ thế thủ (-5px) -> Xoay trụ đảo hướng (-7deg -> +5deg) -> Quất phản công (+10px) -> Hồi vị trí
        trackAnim(
          srcEl,
          [
            { transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)', boxShadow: '0 0 0 0 rgba(56,189,248,0)', offset: 0, easing: 'ease-out' },
            {
              transform: `translate3d(${(-ux * 5).toFixed(1)}px, ${(-uy * 5).toFixed(1)}px, 0) scale(1.07) rotate(-7deg)`,
              boxShadow: '0 0 0 2px rgba(56,189,248,0.95), 0 0 18px rgba(192,132,252,0.8)',
              offset: lockF,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            },
            {
              transform: `translate3d(${(ux * 3).toFixed(1)}px, ${(uy * 3).toFixed(1)}px, 0) scale(1.09) rotate(5deg)`,
              boxShadow: '0 0 0 2px rgba(192,132,252,0.95), 0 0 22px rgba(244,63,94,0.8)',
              filter: 'brightness(1.28)',
              offset: antF,
              easing: 'cubic-bezier(0.55, 0, 0.85, 0.45)',
            },
            {
              transform: `translate3d(${(ux * 10).toFixed(1)}px, ${(uy * 10).toFixed(1)}px, 0) scale(1.1) rotate(0deg)`,
              filter: 'brightness(1.34)',
              offset: impF,
              easing: 'linear',
            },
            {
              transform: `translate3d(${(ux * 9).toFixed(1)}px, ${(uy * 9).toFixed(1)}px, 0) scale(1.06) rotate(0deg)`,
              filter: 'brightness(1.2)',
              offset: hsEndF,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            },
            { transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)', filter: 'brightness(1)', boxShadow: '0 0 0 0 rgba(0,0,0,0)', offset: 1 },
          ],
          true,
        );
      } else if (isCrit) {
        // Chí mạng: Kéo lùi nén lực mạnh (-6.5px, scale 0.94) -> Bùng tốc lao đập (+10px, scale 1.10) -> Giữ hit-stop 85ms -> Hồi mượt
        trackAnim(
          srcEl,
          [
            { transform: 'translate3d(0, 0, 0) scale(1)', offset: 0, easing: 'ease-out' },
            {
              transform: `translate3d(${(-ux * 3.5).toFixed(1)}px, ${(-uy * 3.5).toFixed(1)}px, 0) scale(0.97)`,
              boxShadow: `0 0 0 2px ${colors.primary}bb, 0 0 14px ${colors.primary}66`,
              offset: lockF,
              easing: 'cubic-bezier(0.32, 0, 0.67, 0)',
            },
            {
              transform: `translate3d(${(-ux * 6.5).toFixed(1)}px, ${(-uy * 6.5).toFixed(1)}px, 0) scale(0.94, 1.05)`,
              boxShadow: `0 0 0 2px ${colors.secondary}, 0 0 24px ${colors.primary}cc`,
              filter: 'brightness(1.36)',
              offset: antF,
              easing: 'cubic-bezier(0.68, -0.2, 0.25, 1.1)',
            },
            {
              transform: `translate3d(${(ux * 10).toFixed(1)}px, ${(uy * 10).toFixed(1)}px, 0) scale(1.1, 0.96)`,
              filter: 'brightness(1.42)',
              offset: impF,
              easing: 'linear',
            },
            {
              transform: `translate3d(${(ux * 9.5).toFixed(1)}px, ${(uy * 9.5).toFixed(1)}px, 0) scale(1.08, 0.97)`,
              filter: 'brightness(1.24)',
              offset: hsEndF,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            },
            { transform: 'translate3d(0, 0, 0) scale(1)', filter: 'brightness(1)', boxShadow: '0 0 0 0 rgba(0,0,0,0)', offset: 1 },
          ],
          true,
        );
      } else {
        // Đòn tấn công thường: Khóa thế -> Nhích hướng mục tiêu (+4.5px) -> Lao dứt khoát (+8px) -> Hồi gọn
        const lungePx = isSteal ? 6 : 8;
        trackAnim(
          srcEl,
          [
            { transform: 'translate3d(0, 0, 0) scale(1)', offset: 0, easing: 'ease-out' },
            {
              transform: `translate3d(${(-ux * 2).toFixed(1)}px, ${(-uy * 2).toFixed(1)}px, 0) scale(1.02)`,
              boxShadow: `0 0 0 1px ${colors.primary}aa, 0 0 10px ${colors.primary}55`,
              offset: lockF,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            },
            {
              transform: `translate3d(${(ux * 4.5).toFixed(1)}px, ${(uy * 4.5).toFixed(1)}px, 0) scale(1.05)`,
              boxShadow: `0 0 0 2px ${colors.primary}, 0 0 16px ${colors.primary}88`,
              filter: 'brightness(1.2)',
              offset: antF,
              easing: 'cubic-bezier(0.55, 0, 0.85, 0.45)',
            },
            {
              transform: `translate3d(${(ux * lungePx).toFixed(1)}px, ${(uy * lungePx).toFixed(1)}px, 0) scale(1.07)`,
              filter: 'brightness(1.25)',
              offset: impF,
              easing: 'linear',
            },
            {
              transform: `translate3d(${(ux * (lungePx - 1)).toFixed(1)}px, ${(uy * (lungePx - 1)).toFixed(1)}px, 0) scale(1.05)`,
              filter: 'brightness(1.14)',
              offset: hsEndF,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            },
            { transform: 'translate3d(0, 0, 0) scale(1)', filter: 'brightness(1)', boxShadow: '0 0 0 0 rgba(0,0,0,0)', offset: 1 },
          ],
          true,
        );
      }
    }
  }

  // 2) QUÂN MỤC TIÊU (CÓ STAGGER RIÊNG CHO ĐA MỤC TIÊU) + TƯƠNG TÁC Ô ĐỊA ĐIỂM
  const pulsedTiles = new Set<HTMLElement>();
  const totalTargets = ev.targetPlayerIds.length;
  ev.targetPlayerIds.forEach((tid, idx) => {
    const targetStaggerMs = resolveMultiTargetStaggerMs(idx, totalTargets, reducedMotion);
    const tgtPt = targetPts[idx] ?? firstTgt;
    const tdx = tgtPt.x - sourcePt.x;
    const tdy = tgtPt.y - sourcePt.y;
    const tLen = Math.hypot(tdx, tdy);
    const tux = tLen > 4 ? tdx / tLen : ux;
    const tuy = tLen > 4 ? tdy / tLen : uy;

    const tgtEls = resolvePlayerElements(container, tid);
    for (const tgtEl of tgtEls) {
      if (isShield) {
        // Khiên chặn: đứng vững tuyệt đối (0px knockback), phát sáng lục giác xanh dương sắc gọn
        trackAnim(
          tgtEl,
          [
            { transform: 'translate3d(0, 0, 0) scale(1)', boxShadow: '0 0 0 0 rgba(56,189,248,0)', offset: 0 },
            {
              transform: 'translate3d(0, 0, 0) scale(1.06)',
              boxShadow: '0 0 0 3px rgba(56,189,248,0.95), 0 0 22px rgba(56,189,248,0.75)',
              filter: 'brightness(1.22)',
              offset: impF,
              easing: 'ease-out',
            },
            {
              transform: 'translate3d(0, 0, 0) scale(1.03)',
              boxShadow: '0 0 0 2px rgba(186,230,253,0.75), 0 0 14px rgba(56,189,248,0.45)',
              filter: 'brightness(1.1)',
              offset: impEndF,
              easing: 'ease-out',
            },
            { transform: 'translate3d(0, 0, 0) scale(1)', filter: 'brightness(1)', boxShadow: '0 0 0 0 rgba(56,189,248,0)', offset: 1 },
          ],
          true,
          targetStaggerMs,
        );
      } else if (isHeal) {
        // Hồi máu: nổi bổng êm ái (-7px ease-in-out) kèm hào quang lục bảo ấm
        trackAnim(
          tgtEl,
          [
            { transform: 'translate3d(0, 0, 0) scale(1)', boxShadow: '0 0 0 0 rgba(52,211,153,0)', offset: 0, easing: 'ease-out' },
            {
              transform: 'translate3d(0, -7px, 0) scale(1.06)',
              boxShadow: '0 0 0 2px rgba(52,211,153,0.95), 0 0 22px rgba(253,224,71,0.55)',
              filter: 'brightness(1.22)',
              offset: impF,
              easing: 'ease-in-out',
            },
            {
              transform: 'translate3d(0, -4.5px, 0) scale(1.03)',
              boxShadow: '0 0 0 2px rgba(110,231,183,0.7), 0 0 14px rgba(52,211,153,0.4)',
              offset: impEndF,
              easing: 'ease-out',
            },
            { transform: 'translate3d(0, 0, 0) scale(1)', filter: 'brightness(1)', boxShadow: '0 0 0 0 rgba(52,211,153,0)', offset: 1 },
          ],
          true,
          targetStaggerMs,
        );
      } else if (isMiss) {
        // Đánh hụt: quân mục tiêu né ngang linh hoạt vuông góc hướng đòn (9.5px sidestep + nghiêng 5deg), 0ms hit-stop
        const dodgeX = (-tuy * 9.5).toFixed(1);
        const dodgeY = (tux * 9.5).toFixed(1);
        trackAnim(
          tgtEl,
          [
            { transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)', offset: 0 },
            {
              transform: 'translate3d(0, 0, 0) scale(1.02) rotate(0deg)',
              boxShadow: '0 0 0 2px rgba(226,232,240,0.75), 0 0 12px rgba(148,163,184,0.45)',
              offset: lockF,
            },
            { transform: 'translate3d(0, 0, 0) scale(1.01) rotate(-1deg)', offset: Math.max(antF, impF - 0.08), easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
            {
              transform: `translate3d(${dodgeX}px, ${dodgeY}px, 0) scale(1.03) rotate(5deg)`,
              boxShadow: '0 0 0 2px rgba(226,232,240,0.9), 0 0 16px rgba(148,163,184,0.55)',
              filter: 'brightness(1.18)',
              offset: Math.min(impEndF, impF + 0.1),
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            },
            { transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)', filter: 'brightness(1)', boxShadow: '0 0 0 0 rgba(0,0,0,0)', offset: 1 },
          ],
          true,
          targetStaggerMs,
        );
      } else if (isCrit) {
        // Chí mạng: giật lùi sâu 10px + nén squash(1.06, 0.90) + rung nhẹ dư chấn trước khi bật hồi
        const kx = (tux * 10).toFixed(1);
        const ky = (tuy * 10).toFixed(1);
        const tiltDeg = tux >= 0 ? 5.5 : -5.5;
        trackAnim(
          tgtEl,
          [
            { transform: 'translate3d(0, 0, 0) scale(1)', boxShadow: '0 0 0 0 rgba(0,0,0,0)', offset: 0, easing: 'ease-out' },
            {
              transform: 'translate3d(0, 0, 0) scale(1.04)',
              boxShadow: `0 0 0 2px ${colors.primary}, 0 0 16px ${colors.primary}99`,
              offset: lockF,
              easing: 'linear',
            },
            {
              transform: 'translate3d(0, 0, 0) scale(1.03)',
              boxShadow: `0 0 0 2px ${colors.secondary}, 0 0 18px ${colors.primary}aa`,
              offset: Math.max(antF, impF - 0.02),
              easing: 'cubic-bezier(0.12, 0.9, 0.2, 1)',
            },
            {
              transform: `translate3d(${kx}px, ${ky}px, 0) scale(1.06, 0.90) rotate(${tiltDeg}deg)`,
              boxShadow: `0 0 0 3px #ffffff, 0 0 26px ${colors.primary}`,
              filter: 'brightness(1.9)',
              offset: impF,
              easing: 'linear',
            },
            {
              transform: `translate3d(${(tux * 9.5).toFixed(1)}px, ${(tuy * 9.5).toFixed(1)}px, 0) scale(0.93, 1.04) rotate(${(tiltDeg * 0.75).toFixed(1)}deg)`,
              boxShadow: `0 0 0 2px ${colors.secondary}, 0 0 22px ${colors.primary}`,
              filter: 'brightness(1.55)',
              offset: hsEndF,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            },
            {
              transform: `translate3d(${(-tux * 2.5).toFixed(1)}px, ${(-tuy * 2.5).toFixed(1)}px, 0) scale(1.02) rotate(${(-tiltDeg * 0.25).toFixed(1)}deg)`,
              boxShadow: `0 0 0 1px ${colors.primary}88, 0 0 12px ${colors.primary}44`,
              filter: 'brightness(1.08)',
              offset: Math.min(0.92, impEndF + 0.1),
              easing: 'ease-out',
            },
            { transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)', filter: 'brightness(1)', boxShadow: '0 0 0 0 rgba(0,0,0,0)', offset: 1 },
          ],
          true,
          targetStaggerMs,
        );
      } else {
        // Trúng đòn thường / Phản kích / Cướp: giật lùi 6–8.5px sắc gọn + giữ khung hit-stop -> hồi mượt
        const knockPx = isCounter ? 8.5 : isSteal ? 6 : 7.5;
        const kx = (tux * knockPx).toFixed(1);
        const ky = (tuy * knockPx).toFixed(1);
        const tiltDeg = tux >= 0 ? (isCounter ? -3.5 : 3) : isCounter ? 3.5 : -3;
        trackAnim(
          tgtEl,
          [
            { transform: 'translate3d(0, 0, 0) scale(1)', boxShadow: '0 0 0 0 rgba(0,0,0,0)', offset: 0, easing: 'ease-out' },
            {
              transform: 'translate3d(0, 0, 0) scale(1.03)',
              boxShadow: `0 0 0 2px ${colors.primary}, 0 0 14px ${colors.primary}88`,
              offset: lockF,
              easing: 'linear',
            },
            {
              transform: 'translate3d(0, 0, 0) scale(1.02)',
              boxShadow: `0 0 0 2px ${colors.primary}, 0 0 16px ${colors.primary}99`,
              offset: Math.max(antF, impF - 0.02),
              easing: 'cubic-bezier(0.12, 0.9, 0.2, 1)',
            },
            {
              transform: `translate3d(${kx}px, ${ky}px, 0) scale(0.95) rotate(${tiltDeg}deg)`,
              boxShadow: `0 0 0 3px #ffffff, 0 0 22px ${colors.primary}`,
              filter: 'brightness(1.55)',
              offset: impF,
              easing: 'linear',
            },
            {
              transform: `translate3d(${kx}px, ${ky}px, 0) scale(0.96) rotate(${tiltDeg}deg)`,
              boxShadow: `0 0 0 2px ${colors.secondary}, 0 0 20px ${colors.primary}`,
              filter: 'brightness(1.3)',
              offset: hsEndF,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            },
            {
              transform: `translate3d(${(-tux * 1.5).toFixed(1)}px, ${(-tuy * 1.5).toFixed(1)}px, 0) scale(1.01) rotate(0deg)`,
              boxShadow: `0 0 0 1px ${colors.primary}77, 0 0 10px ${colors.primary}33`,
              filter: 'brightness(1.06)',
              offset: Math.min(0.92, impEndF + 0.1),
              easing: 'ease-out',
            },
            { transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)', filter: 'brightness(1)', boxShadow: '0 0 0 0 rgba(0,0,0,0)', offset: 1 },
          ],
          true,
          targetStaggerMs,
        );
      }

      // Phản hồi vật lý lên chính ô địa điểm chứa mục tiêu (Location Tile interaction)
      const tileEl = tgtEl.closest<HTMLElement>('[data-testid^="bg-loc-"]');
      if (tileEl && !pulsedTiles.has(tileEl)) {
        pulsedTiles.add(tileEl);
        const glowRadius = qualityTier === 'low' ? 12 : isCrit ? 28 : 20;
        trackAnim(
          tileEl,
          [
            { boxShadow: '0 0 0 0 rgba(0,0,0,0)', offset: 0 },
            { boxShadow: `0 0 0 1px ${colors.primary}66`, offset: Math.max(lockF, impF - 0.03) },
            {
              boxShadow: `inset 0 0 ${glowRadius}px ${colors.primary}55, 0 0 ${glowRadius}px ${colors.primary}77`,
              offset: impF,
              easing: 'ease-out',
            },
            {
              boxShadow: `inset 0 0 ${Math.round(glowRadius * 0.45)}px ${colors.primary}2a, 0 0 8px ${colors.primary}2a`,
              offset: impEndF,
              easing: 'ease-out',
            },
            { boxShadow: '0 0 0 0 rgba(0,0,0,0)', offset: 1 },
          ],
          false,
          targetStaggerMs,
        );
      }
    }
  });
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
  const count =
    reducedMotion || particleScale <= 0 ? 4 : Math.max(10, Math.round(22 * particleScale));

  for (const pt of [anim.source, ...anim.targets]) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, fade));

    if (faction === 'lantern-guard') {
      // Đội Săn Đêm: Cột sáng rọi vàng-lục bảo từ trên cao + 2 vòng radar & tinh tú bay lên
      const coneTopY = pt.y - 95;
      const coneBottomY = pt.y + 45;
      const coneGrad = ctx.createLinearGradient(pt.x, coneTopY, pt.x, coneBottomY);
      coneGrad.addColorStop(0, 'rgba(253, 224, 71, 0)');
      coneGrad.addColorStop(0.35, 'rgba(253, 224, 71, 0.24)');
      coneGrad.addColorStop(0.8, 'rgba(52, 211, 153, 0.22)');
      coneGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(pt.x - 16, coneTopY);
      ctx.lineTo(pt.x + 16, coneTopY);
      ctx.lineTo(pt.x + 62 + p * 18, coneBottomY);
      ctx.lineTo(pt.x - 62 - p * 18, coneBottomY);
      ctx.closePath();
      ctx.fill();

      const grad = ctx.createRadialGradient(pt.x, pt.y, 4, pt.x, pt.y, 76 * p + 24);
      grad.addColorStop(0, 'rgba(253, 224, 71, 0.6)');
      grad.addColorStop(0.55, 'rgba(16, 185, 129, 0.3)');
      grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 76 * p + 24, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = secondary;
      ctx.lineWidth = 3 * (1 - p * 0.55);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 18 + p * 66, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = primary;
      ctx.lineWidth = 2 * (1 - p * 0.6);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 8 + p * 84, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + p * 0.95;
        const r = 14 + p * 60;
        const px = pt.x + Math.cos(ang) * r;
        const py = pt.y + Math.sin(ang) * r - p * 30;
        ctx.fillStyle = i % 2 === 0 ? primary : secondary;
        if (i % 3 === 0) {
          // 4-point star sparkle
          const s = 4.2 * (1 - p * 0.35);
          ctx.beginPath();
          ctx.moveTo(px, py - s);
          ctx.lineTo(px + s * 0.35, py - s * 0.35);
          ctx.lineTo(px + s, py);
          ctx.lineTo(px + s * 0.35, py + s * 0.35);
          ctx.lineTo(px, py + s);
          ctx.lineTo(px - s * 0.35, py + s * 0.35);
          ctx.lineTo(px - s, py);
          ctx.lineTo(px - s * 0.35, py - s * 0.35);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(px, py, 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (faction === 'mist-order') {
      // Hội Bóng Đêm: Xoáy sương đỏ thẫm-tím sâu + 2 cung xoay ngược chiều & mảnh bóng tối
      const grad = ctx.createRadialGradient(pt.x, pt.y, 4, pt.x, pt.y, 88 * p + 24);
      grad.addColorStop(0, 'rgba(244, 63, 94, 0.56)');
      grad.addColorStop(0.55, 'rgba(168, 85, 247, 0.34)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 88 * p + 24, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = primary;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 20 + p * 70, p * 2.2, p * 2.2 + Math.PI * 1.45);
      ctx.stroke();

      ctx.strokeStyle = secondary;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 12 + p * 54, -p * 2.6, -p * 2.6 + Math.PI * 1.3);
      ctx.stroke();

      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count - p * 3.2;
        const r = (1 - p * 0.3) * 68;
        ctx.fillStyle = i % 2 === 0 ? primary : secondary;
        ctx.beginPath();
        ctx.moveTo(pt.x + Math.cos(ang) * r, pt.y + Math.sin(ang) * r);
        ctx.lineTo(pt.x + Math.cos(ang + 0.16) * (r + 14), pt.y + Math.sin(ang + 0.16) * (r + 14));
        ctx.lineTo(pt.x + Math.cos(ang - 0.16) * (r + 8), pt.y + Math.sin(ang - 0.16) * (r + 8));
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Kẻ Độc Hành: Nhật thực hổ phách-bạc + 8 tia la bàn & hạt kim cương đa hướng
      ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 14 + p * 26, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = primary;
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 18 + p * 44, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = secondary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 12 + p * 76, 0, Math.PI * 2);
      ctx.stroke();

      for (let rIdx = 0; rIdx < 8; rIdx++) {
        const rayAng = (Math.PI / 4) * rIdx + p * 0.35;
        const innerR = 22 + p * 22;
        const outerR = innerR + (rIdx % 2 === 0 ? 34 : 22);
        ctx.strokeStyle = rIdx % 2 === 0 ? primary : secondary;
        ctx.lineWidth = rIdx % 2 === 0 ? 2.4 : 1.5;
        ctx.beginPath();
        ctx.moveTo(pt.x + Math.cos(rayAng) * innerR, pt.y + Math.sin(rayAng) * innerR);
        ctx.lineTo(pt.x + Math.cos(rayAng) * outerR, pt.y + Math.sin(rayAng) * outerR);
        ctx.stroke();
      }

      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count;
        const r = 12 + p * 76;
        const dx = pt.x + Math.cos(ang) * r;
        const dy = pt.y + Math.sin(ang) * r;
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(ang + Math.PI / 4);
        ctx.fillStyle = i % 2 === 0 ? primary : secondary;
        ctx.fillRect(-2.5, -2.5, 5, 5);
        ctx.restore();
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
  isCritical = false,
): void {
  ctx.save();
  ctx.translate(pt.x, pt.y);

  // Vòng sóng mặt bàn dẹt (ground-plane slam shockwave kiểu Hearthstone/Marvel Snap)
  ctx.save();
  ctx.strokeStyle = secondaryColor;
  ctx.lineWidth = (isCritical ? 3.2 : 2.4) * Math.max(0.7, scale);
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(0, 4 * scale, 34 * scale, 15 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (isCounter) ctx.rotate(Math.PI / 4);

  // Lõi va chạm trắng sắc nét gọn tâm (không đổ glow mờ lan rộng)
  const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 32 * scale);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.32, secondaryColor);
  grad.addColorStop(0.72, color);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 32 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Khung hình thoi xoay riêng cho Phản kích
  if (isCounter) {
    const dR = 26 * scale;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(0, -dR);
    ctx.lineTo(dR, 0);
    ctx.lineTo(0, dR);
    ctx.lineTo(-dR, 0);
    ctx.closePath();
    ctx.stroke();
  }

  // Tia sắc 4 / 6 / 8 cánh đúng khung Hit-Stop 60-90ms
  ctx.fillStyle = '#ffffff';
  const arms = isCritical ? 8 : isCounter ? 6 : 4;
  for (let i = 0; i < arms; i++) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * i) / arms);
    const armLen = (isCritical && i % 2 === 0 ? 48 : 38) * scale;
    const armW = (isCritical ? 4.4 : 3.8) * scale;
    ctx.beginPath();
    ctx.moveTo(0, -armLen);
    ctx.lineTo(armW, 0);
    ctx.lineTo(0, armLen);
    ctx.lineTo(-armW, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawMissDodgeCue(
  ctx: CanvasRenderingContext2D,
  source: Point2D,
  target: Point2D,
  postP: number,
  fade: number,
  sizeScale = 1,
): void {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  // Vector né vuông góc trùng hướng WAAPI sidestep của quân cờ
  const dodgeUx = -dy / len;
  const dodgeUy = dx / len;
  const dodgeAng = Math.atan2(dodgeUy, dodgeUx);

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(0.92, fade * 0.95));

  // Vòng dư ảnh bóng mờ tại vị trí cũ trước khi né
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2.2 * fade;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.arc(target.x, target.y, (16 + postP * 14) * sizeScale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 2 vệt gió chữ V (slipstream chevrons) dọc hướng né ngang
  for (let c = 0; c < 2; c++) {
    const dist = (14 + c * 11 + postP * 22) * sizeScale;
    const cx = target.x + dodgeUx * dist;
    const cy = target.y + dodgeUy * dist;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(dodgeAng);
    ctx.strokeStyle = c === 0 ? '#f8fafc' : '#94a3b8';
    ctx.lineWidth = (c === 0 ? 2.6 : 1.8) * fade;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-7 * sizeScale, -7 * sizeScale);
    ctx.lineTo(2 * sizeScale, 0);
    ctx.lineTo(-7 * sizeScale, 7 * sizeScale);
    ctx.stroke();
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
  const outcome = anim.victoryOutcome ?? 'victory';
  const isDefeat = outcome === 'defeat';
  const primary = isDefeat
    ? '#e11d48'
    : faction === 'mist-order'
      ? '#fb7185'
      : faction === 'wanderer'
        ? '#f59e0b'
        : '#10b981';
  const secondary = isDefeat
    ? '#94a3b8'
    : faction === 'mist-order'
      ? '#c084fc'
      : faction === 'wanderer'
        ? '#e2e8f0'
        : '#fbbf24';
  const count =
    reducedMotion || particleScale <= 0
      ? 6
      : Math.max(10, Math.round((isDefeat ? 16 : 24) * particleScale));
  const center = anim.source;

  // Defeat: mưa tro/sương trầm lắng rơi chậm + vòng nhật thực mờ dần (không bắn pháo hoa ăn mừng)
  if (isDefeat) {
    const fade = Math.sin(p * Math.PI);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(0.82, fade * 0.85));

    ctx.strokeStyle = primary;
    ctx.lineWidth = 2.4 * (1 - p * 0.45);
    ctx.beginPath();
    ctx.arc(center.x, center.y, 44 + p * 92, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = secondary;
    ctx.lineWidth = 1.4 * (1 - p * 0.5);
    ctx.beginPath();
    ctx.arc(center.x, center.y, 70 + p * 64, Math.PI * 0.2, Math.PI * 1.65);
    ctx.stroke();

    for (let k = 0; k < count; k++) {
      const spreadX = (((k * 73) % 100) / 100 - 0.5) * 440;
      const startY = center.y - 110 + ((k * 37) % 70);
      const driftX = Math.sin(p * 4 + k) * 14;
      const fallY = p * (120 + (k % 4) * 28);
      ctx.fillStyle = k % 3 === 0 ? primary : secondary;
      ctx.beginPath();
      ctx.arc(center.x + spreadX + driftX, startY + fallY, 2.2 * (1 - p * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // Victory / Spectator: Năng lượng đặc trưng từng phe tại trung tâm & các cụm pháo sáng
  const centerFade = Math.sin(p * Math.PI);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(0.88, centerFade));

  if (faction === 'lantern-guard') {
    // Đội Săn Đêm: Tia bình minh vàng-lục bảo rọi lên + tinh tú 4 cánh thăng hoa
    const beamGrad = ctx.createLinearGradient(center.x, center.y - 160, center.x, center.y + 120);
    beamGrad.addColorStop(0, 'rgba(251, 191, 36, 0)');
    beamGrad.addColorStop(0.45, 'rgba(251, 191, 36, 0.22)');
    beamGrad.addColorStop(0.75, 'rgba(16, 185, 129, 0.2)');
    beamGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(center.x - 42, center.y - 160);
    ctx.lineTo(center.x + 42, center.y - 160);
    ctx.lineTo(center.x + 126 + p * 36, center.y + 120);
    ctx.lineTo(center.x - 126 - p * 36, center.y + 120);
    ctx.closePath();
    ctx.fill();
  } else if (faction === 'mist-order') {
    // Hội Bóng Đêm: Xoáy huyết nguyệt 2 tầng quay ngược chiều quanh tâm
    ctx.strokeStyle = primary;
    ctx.lineWidth = 3.2 * (1 - p * 0.45);
    ctx.beginPath();
    ctx.arc(center.x, center.y, 46 + p * 108, p * 2.4, p * 2.4 + Math.PI * 1.45);
    ctx.stroke();

    ctx.strokeStyle = secondary;
    ctx.lineWidth = 2.4 * (1 - p * 0.5);
    ctx.beginPath();
    ctx.arc(center.x, center.y, 32 + p * 86, -p * 2.8, -p * 2.8 + Math.PI * 1.35);
    ctx.stroke();
  } else {
    // Kẻ Độc Hành: Nhật thực hổ phách-bạc & 8 tia la bàn sắc nét
    for (let rIdx = 0; rIdx < 8; rIdx++) {
      const ang = (Math.PI / 4) * rIdx + p * 0.25;
      const r1 = 42 + p * 24;
      const r2 = r1 + (rIdx % 2 === 0 ? 78 : 52);
      ctx.strokeStyle = rIdx % 2 === 0 ? primary : secondary;
      ctx.lineWidth = rIdx % 2 === 0 ? 2.6 : 1.6;
      ctx.beginPath();
      ctx.moveTo(center.x + Math.cos(ang) * r1, center.y + Math.sin(ang) * r1);
      ctx.lineTo(center.x + Math.cos(ang) * r2, center.y + Math.sin(ang) * r2);
      ctx.stroke();
    }
  }
  ctx.restore();

  anim.targets.forEach((pt, idx) => {
    const delay = idx * 0.14;
    const localP = Math.max(0, Math.min(1, (p - delay) / Math.max(0.32, 1 - delay)));
    if (localP <= 0) return;
    const fade = Math.sin(localP * Math.PI);

    ctx.save();
    ctx.globalAlpha = fade * (outcome === 'spectator' ? 0.78 : 0.9);
    ctx.strokeStyle = idx % 2 === 0 ? primary : secondary;
    ctx.lineWidth = 2.4 * fade;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 20 + localP * 88, 0, Math.PI * 2);
    ctx.stroke();

    for (let k = 0; k < count; k++) {
      const ang =
        (Math.PI * 2 * k) / count +
        idx * 0.35 +
        (faction === 'mist-order' ? -localP * 1.2 : localP * 0.4);
      const dist = localP * (78 + (k % 3) * 24);
      const px = pt.x + Math.cos(ang) * dist;
      const py =
        pt.y +
        Math.sin(ang) * dist +
        (faction === 'lantern-guard' ? -localP * 22 : localP * 14);
      ctx.fillStyle = k % 2 === 0 ? primary : k % 3 === 0 ? secondary : '#ffffff';
      if (faction === 'wanderer' && k % 2 === 0) {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang + Math.PI / 4);
        const s = Math.max(2, (4.4 - localP * 1.6) * fade);
        ctx.fillRect(-s * 0.5, -s * 0.5, s, s);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1.1, (2.9 - localP * 1.1) * fade), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  });
}

function drawAnticipationCharge(
  ctx: CanvasRenderingContext2D,
  source: Point2D,
  antP: number,
  primary: string,
  secondary: string,
  isCounter = false,
): void {
  const clamped = Math.max(0, Math.min(1, antP));
  ctx.save();
  ctx.translate(source.x, source.y);

  // Vòng năng lượng hội tụ vào quân tấn công trong pha Anticipation (150–300ms)
  const outerR = 38 - clamped * 20;
  ctx.globalAlpha = 0.35 + clamped * 0.6;
  ctx.strokeStyle = primary;
  ctx.lineWidth = isCounter ? 3 : 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(8, outerR), 0, Math.PI * 2);
  ctx.stroke();

  // 6 tia hút năng lượng vào tâm
  const rays = isCounter ? 6 : 5;
  for (let i = 0; i < rays; i++) {
    const ang = (Math.PI * 2 * i) / rays + clamped * (isCounter ? -1.4 : 1.1);
    const rOuter = 36 - clamped * 16;
    const rInner = Math.max(4, rOuter - 12);
    ctx.strokeStyle = i % 2 === 0 ? secondary : primary;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * rOuter, Math.sin(ang) * rOuter);
    ctx.lineTo(Math.cos(ang) * rInner, Math.sin(ang) * rInner);
    ctx.stroke();
  }

  // Lõi sáng tụ lực
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 14 + clamped * 12);
  glow.addColorStop(0, '#ffffff');
  glow.addColorStop(0.45, secondary);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.globalAlpha = 0.25 + clamped * 0.55;
  ctx.beginPath();
  ctx.arc(0, 0, 14 + clamped * 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDirectionalImpactSparks(
  ctx: CanvasRenderingContext2D,
  source: Point2D,
  target: Point2D,
  postP: number,
  fade: number,
  primary: string,
  secondary: string,
  particleScale: number,
  reducedMotion: boolean,
  isCritical = false,
  sizeScale = 1,
): void {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const baseAng = Math.hypot(dx, dy) > 4 ? Math.atan2(dy, dx) : 0;

  // 2 vòng sóng xung kích sắc gọn + sóng mặt bàn có trọng lượng tại đúng điểm mục tiêu
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.strokeStyle = primary;
  ctx.lineWidth = (isCritical ? 4.4 : 3.4) * fade;
  ctx.beginPath();
  ctx.arc(target.x, target.y, (14 + postP * (isCritical ? 64 : 48)) * sizeScale, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = secondary;
  ctx.lineWidth = (isCritical ? 2.6 : 1.9) * fade;
  ctx.beginPath();
  ctx.arc(target.x, target.y, (8 + postP * (isCritical ? 82 : 60)) * sizeScale, 0, Math.PI * 2);
  ctx.stroke();

  // Dấu nứt xung lực theo hướng đòn (directional shock chevron) giúp nhìn rõ hướng va chạm ở 1920x1080
  ctx.save();
  ctx.translate(
    target.x + Math.cos(baseAng) * (12 + postP * 26) * sizeScale,
    target.y + Math.sin(baseAng) * (12 + postP * 26) * sizeScale,
  );
  ctx.rotate(baseAng);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = (isCritical ? 3.2 : 2.3) * fade;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-10 * sizeScale, -13 * sizeScale);
  ctx.lineTo(4 * sizeScale, 0);
  ctx.lineTo(-10 * sizeScale, 13 * sizeScale);
  ctx.stroke();
  ctx.restore();

  const count =
    reducedMotion || particleScale <= 0
      ? 0
      : Math.max(3, Math.round((isCritical ? 12 : 8) * particleScale * Math.max(0.6, sizeScale)));
  for (let k = 0; k < count; k++) {
    // 70% tia bắn dọc nón va chạm về phía sau mục tiêu + 30% văng quanh tâm
    const spread =
      k < count * 0.7
        ? baseAng + (k / Math.max(1, count * 0.7) - 0.5) * 1.4
        : (Math.PI * 2 * k) / count + postP * 0.8;
    const dist = (10 + postP * ((isCritical ? 74 : 54) + (k % 3) * 12)) * sizeScale;
    const tailDist = Math.max(4, dist - (isCritical ? 17 : 12) * fade * sizeScale);
    ctx.strokeStyle = k % 3 === 0 ? '#ffffff' : k % 2 === 0 ? primary : secondary;
    ctx.lineWidth = (isCritical ? 2.8 : 2.2) * fade;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(target.x + Math.cos(spread) * tailDist, target.y + Math.sin(spread) * tailDist);
    ctx.lineTo(target.x + Math.cos(spread) * dist, target.y + Math.sin(spread) * dist);
    ctx.stroke();
  }
  ctx.restore();
}

function drawOpeningAmbient(
  ctx: CanvasRenderingContext2D,
  anim: ActiveCombatAnim,
  p: number,
  reducedMotion: boolean,
  particleScale: number,
): void {
  if (reducedMotion || particleScale <= 0) return;
  const center = anim.source;
  const fade = p < 0.12 ? p / 0.12 : p > 0.82 ? Math.max(0, (1 - p) / 0.18) : 1;
  if (fade <= 0.01) return;

  const moteCount = Math.max(8, Math.round(18 * particleScale));
  ctx.save();
  ctx.globalAlpha = fade * 0.62;

  // Vòng ánh trăng trung tính phe (vàng hổ phách nhạt + xanh đêm) tạo cảm giác nghi thức mở màn
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.24)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(center.x, center.y, 118 + Math.sin(p * Math.PI) * 34, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(center.x, center.y, 164 + Math.cos(p * Math.PI * 1.4) * 18, p * 0.9, p * 0.9 + Math.PI * 1.45);
  ctx.stroke();

  for (let i = 0; i < moteCount; i++) {
    const ang = (Math.PI * 2 * i) / moteCount + p * (i % 2 === 0 ? 0.45 : -0.35);
    const orbit = 96 + (i % 5) * 44 + Math.sin(p * 3 + i) * 14;
    const mx = center.x + Math.cos(ang) * orbit * 1.35;
    const my = center.y + Math.sin(ang) * orbit * 0.72 - p * 18;
    const r = 1.2 + (i % 3) * 0.65;
    ctx.fillStyle = i % 3 === 0 ? '#fde68a' : i % 2 === 0 ? '#cbd5e1' : '#7dd3fc';
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCombatAnimation(
  ctx: CanvasRenderingContext2D,
  anim: ActiveCombatAnim,
  nowMs: number,
  reducedMotion: boolean,
  particleScale = 1,
): boolean {
  const rawElapsed = Math.max(0, nowMs - anim.startedAt);
  const maxStaggerMs =
    anim.targets.length > 1 && !reducedMotion
      ? resolveMultiTargetStaggerMs(anim.targets.length - 1, anim.targets.length, reducedMotion)
      : 0;
  const totalDur = Math.max(120, (anim.timings?.recoveryEndMs ?? anim.durationMs) + maxStaggerMs);
  const p = Math.max(0, Math.min(1, rawElapsed / totalDur));
  if (p >= 1) return false;

  if (anim.openingAmbientBurst) {
    drawOpeningAmbient(ctx, anim, p, reducedMotion, particleScale);
    return true;
  }

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

  const { event, source, targets } = anim;
  const { effect } = event;
  const isCrit = Boolean(event.isCritical);
  const isMiss = Boolean(event.isMiss);
  const timings =
    anim.timings ??
    resolveCombatSequenceTimings(anim.durationMs, effect, reducedMotion, {
      isCritical: isCrit,
      isMiss,
    });

  const inTargetLock = timings.targetLockEndMs > 0 && rawElapsed < timings.targetLockEndMs;
  const inAnticipation =
    timings.anticipationEndMs > timings.targetLockEndMs &&
    rawElapsed >= timings.targetLockEndMs &&
    rawElapsed < timings.anticipationEndMs;
  const lockP =
    timings.targetLockEndMs > 0 ? Math.min(1, rawElapsed / timings.targetLockEndMs) : 1;
  const antSpan = Math.max(1, timings.anticipationEndMs - timings.targetLockEndMs);
  const antP = inAnticipation
    ? Math.max(0, Math.min(1, (rawElapsed - timings.targetLockEndMs) / antSpan))
    : rawElapsed >= timings.anticipationEndMs
      ? 1
      : 0;

  const inHitStop =
    timings.hitStopDurationMs > 0 &&
    rawElapsed >= timings.hitStopStartMs &&
    rawElapsed < timings.hitStopEndMs;
  const travelSpan = Math.max(1, timings.travelEndMs - timings.anticipationEndMs);
  const rawTravelP =
    rawElapsed < timings.anticipationEndMs
      ? 0
      : rawElapsed >= timings.travelEndMs
        ? 1
        : Math.max(0, Math.min(1, (rawElapsed - timings.anticipationEndMs) / travelSpan));
  // Gia tốc mạnh khi lao đòn để tạo cảm giác quất/bắn dứt khoát
  const travelP = rawTravelP <= 0 ? 0 : rawTravelP >= 1 ? 1 : Math.pow(rawTravelP, 1.45);

  const postImpactSpan = Math.max(100, timings.recoveryEndMs - timings.hitStopEndMs);
  const postImpactP =
    rawElapsed <= timings.hitStopEndMs
      ? 0
      : Math.max(0, Math.min(1, (rawElapsed - timings.hitStopEndMs) / postImpactSpan));
  const fade = inHitStop ? 1 : Math.max(0, 1 - postImpactP * postImpactP);

  const drawLockLine = (tgt: Point2D, color: string) => {
    ctx.save();
    ctx.globalAlpha = 0.25 + lockP * 0.48;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    const mx = (source.x + tgt.x) * 0.5;
    const my = Math.min(source.y, tgt.y) - (Math.hypot(tgt.x - source.x, tgt.y - source.y) < 110 ? 28 : 16);
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.quadraticCurveTo(mx, my, tgt.x, tgt.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  };

  const multiScale = targets.length >= 5 ? 0.68 : targets.length >= 3 ? 0.8 : 1;

  const evalTargetTiming = (tIdx: number) => {
    const staggerMs = resolveMultiTargetStaggerMs(tIdx, targets.length, reducedMotion);
    const tElapsed = Math.max(0, rawElapsed - staggerMs);
    const tRawTravel =
      tElapsed < timings.anticipationEndMs
        ? 0
        : tElapsed >= timings.travelEndMs
          ? 1
          : Math.max(0, Math.min(1, (tElapsed - timings.anticipationEndMs) / travelSpan));
    const tTravelP = tRawTravel <= 0 ? 0 : tRawTravel >= 1 ? 1 : Math.pow(tRawTravel, 1.45);
    const tInHitStop =
      timings.hitStopDurationMs > 0 &&
      tElapsed >= timings.hitStopStartMs &&
      tElapsed < timings.hitStopEndMs;
    const tPostP =
      tElapsed <= timings.hitStopEndMs
        ? 0
        : Math.max(0, Math.min(1, (tElapsed - timings.hitStopEndMs) / postImpactSpan));
    const tFade = tInHitStop ? 1 : Math.max(0, 1 - tPostP * tPostP);
    return { tElapsed, tTravelP, tInHitStop, tPostP, tFade };
  };

  ctx.save();

  switch (effect) {
    case 'SLASH':
    case 'MASAMUNE_SLASH': {
      const isCursed = effect === 'MASAMUNE_SLASH';
      const primary = isMiss ? '#cbd5e1' : isCursed || isCrit ? '#fb7185' : '#fde047';
      const secondary = isMiss ? '#94a3b8' : isCursed ? '#c084fc' : isCrit ? '#fde047' : '#ffffff';
      if (inAnticipation) {
        drawAnticipationCharge(ctx, source, antP, primary, secondary, false);
      }
      for (const tgt of targets) {
        if (inTargetLock || inAnticipation) {
          drawLockLine(tgt, primary);
          drawTargetLockReticle(ctx, tgt, inTargetLock ? lockP : 1, primary, false);
          continue;
        }
        const dist = Math.hypot(tgt.x - source.x, tgt.y - source.y);
        const sameTileLift = dist < 110 ? -30 : -14;
        const endPt = isMiss ? { x: tgt.x + 28, y: tgt.y - 18 } : tgt;

        // Vệt lao đòn có độ sâu + đuôi mờ dần từ quân tấn công tới mục tiêu
        if (travelP > 0 && (travelP < 1 || inHitStop || postImpactP < 0.35)) {
          const tail = Math.max(0, travelP - 0.55);
          const ctrlX = (source.x + endPt.x) * 0.5;
          const ctrlY = Math.min(source.y, endPt.y) + sameTileLift;
          const ptAt = (t: number) => ({
            x: (1 - t) * (1 - t) * source.x + 2 * (1 - t) * t * ctrlX + t * t * endPt.x,
            y: (1 - t) * (1 - t) * source.y + 2 * (1 - t) * t * ctrlY + t * t * endPt.y,
          });
          const p0 = ptAt(tail);
          const pMid = ptAt((tail + travelP) * 0.5);
          const p1 = ptAt(travelP);

          ctx.save();
          ctx.globalAlpha = (isMiss ? 0.65 : 0.92) * fade;
          const grad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
          grad.addColorStop(0, 'rgba(255,255,255,0)');
          grad.addColorStop(0.55, primary);
          grad.addColorStop(1, '#ffffff');
          ctx.strokeStyle = grad;
          ctx.lineWidth = isCrit ? 9 : isCursed ? 7.5 : isMiss ? 4 : 5.8;
          ctx.lineCap = 'round';
          if (isMiss) ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.quadraticCurveTo(pMid.x, pMid.y, p1.x, p1.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }

        // Lưỡi trăng chém quét qua mục tiêu
        if (travelP >= 0.45) {
          const swingP = Math.min(1, (travelP - 0.45) / 0.55);
          const cx = isMiss ? tgt.x + 24 : tgt.x;
          const cy = isMiss ? tgt.y - 12 : tgt.y;
          const radius = (isCrit ? 58 : isCursed ? 52 : 44) * multiScale * (0.82 + postImpactP * 0.34);
          ctx.save();
          ctx.globalAlpha = (isMiss ? 0.62 : 1) * fade;
          ctx.strokeStyle = primary;
          ctx.lineWidth = isCrit ? 9.5 : isCursed ? 8 : isMiss ? 3.5 : 6;
          ctx.lineCap = 'round';
          if (isMiss) ctx.setLineDash([7, 7]);
          ctx.beginPath();
          ctx.arc(cx, cy, radius, -Math.PI * 0.85, -Math.PI * 0.85 + swingP * Math.PI * 0.95 + postImpactP * 0.22);
          ctx.stroke();

          ctx.strokeStyle = secondary;
          ctx.lineWidth = isCrit ? 4 : 2.6;
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 0.88, -Math.PI * 0.78, -Math.PI * 0.78 + swingP * Math.PI * 0.88 + postImpactP * 0.18);
          ctx.stroke();
          ctx.setLineDash([]);

          // Chữ X kép sắc nét cho Chí Mạng hoặc Masamune
          if (!isMiss && (isCursed || isCrit)) {
            ctx.strokeStyle = isCrit ? '#fef08a' : '#e11d48';
            ctx.lineWidth = isCrit ? 6.5 : 5;
            ctx.beginPath();
            ctx.moveTo(tgt.x - 38 * swingP * multiScale, tgt.y - 32 * swingP * multiScale);
            ctx.lineTo(tgt.x + 38 * swingP * multiScale, tgt.y + 32 * swingP * multiScale);
            if (isCrit) {
              ctx.moveTo(tgt.x + 36 * swingP * multiScale, tgt.y - 30 * swingP * multiScale);
              ctx.lineTo(tgt.x - 36 * swingP * multiScale, tgt.y + 30 * swingP * multiScale);
            }
            ctx.stroke();
          }
          ctx.restore();
        }

        if (isMiss && (travelP >= 0.75 || postImpactP > 0)) {
          drawMissDodgeCue(ctx, source, tgt, postImpactP, fade, multiScale);
        } else if (!isMiss && inHitStop) {
          drawImpactHitStopStarburst(ctx, tgt, primary, secondary, (isCrit ? 1.38 : isCursed ? 1.22 : 1.05) * multiScale, false, isCrit);
        } else if (!isMiss && postImpactP > 0) {
          drawDirectionalImpactSparks(
            ctx,
            source,
            tgt,
            postImpactP,
            fade,
            primary,
            secondary,
            particleScale,
            reducedMotion,
            isCrit,
            multiScale,
          );
        }
      }
      break;
    }

    case 'SPEAR_THRUST': {
      const primary = isMiss ? '#cbd5e1' : isCrit ? '#fde047' : '#38bdf8';
      const secondary = isMiss ? '#94a3b8' : '#fef08a';
      if (inAnticipation) {
        drawAnticipationCharge(ctx, source, antP, primary, secondary, false);
      }
      for (const tgt of targets) {
        if (inTargetLock || inAnticipation) {
          drawLockLine(tgt, primary);
          drawTargetLockReticle(ctx, tgt, inTargetLock ? lockP : 1, primary, false);
          continue;
        }
        const endPt = isMiss ? { x: tgt.x + 26, y: tgt.y - 22 } : tgt;
        const curX = source.x + (endPt.x - source.x) * travelP;
        const curY = source.y + (endPt.y - source.y) * travelP;
        ctx.save();
        ctx.globalAlpha = fade;
        const grad = ctx.createLinearGradient(source.x, source.y, curX, curY);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        grad.addColorStop(0.55, primary);
        grad.addColorStop(1, '#ffffff');
        ctx.strokeStyle = grad;
        ctx.lineWidth = isCrit ? 9.5 : 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(curX, curY);
        ctx.stroke();

        // Đầu mũi thương ánh sáng sắc nhọn
        const ang = Math.atan2(endPt.y - source.y, endPt.x - source.x);
        ctx.translate(curX, curY);
        ctx.rotate(ang);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-10, -7);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-10, 7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        if (isMiss && (travelP >= 0.75 || postImpactP > 0)) {
          drawMissDodgeCue(ctx, source, tgt, postImpactP, fade, multiScale);
        } else if (!isMiss && inHitStop) {
          drawImpactHitStopStarburst(ctx, tgt, primary, secondary, (isCrit ? 1.35 : 1.15) * multiScale, false, isCrit);
        } else if (!isMiss && postImpactP > 0) {
          drawDirectionalImpactSparks(
            ctx,
            source,
            tgt,
            postImpactP,
            fade,
            primary,
            secondary,
            particleScale,
            reducedMotion,
            isCrit,
            multiScale,
          );
        }
      }
      break;
    }

    case 'HANDGUN_SHOT':
    case 'MACHINE_GUN_BARRAGE': {
      const burstCount = effect === 'MACHINE_GUN_BARRAGE' ? 3 : 2;
      const primary = isMiss ? '#cbd5e1' : isCrit ? '#fb7185' : '#fbbf24';
      if (inAnticipation) {
        drawAnticipationCharge(ctx, source, antP, primary, '#fef08a', false);
      }
      targets.forEach((tgt, tIdx) => {
        if (inTargetLock || inAnticipation) {
          drawLockLine(tgt, primary);
          drawTargetLockReticle(ctx, tgt, inTargetLock ? lockP : 1, primary, false);
          return;
        }
        const { tTravelP, tInHitStop, tPostP, tFade } = evalTargetTiming(tIdx);
        const endPt = isMiss ? { x: tgt.x + 26, y: tgt.y - 18 } : tgt;
        ctx.globalAlpha = tFade;

        if (tTravelP > 0 && (tTravelP < 1 || tInHitStop || tPostP < 0.3)) {
          for (let b = 0; b < burstCount; b++) {
            const offsetAngle = (b - (burstCount - 1) * 0.5) * (targets.length >= 4 ? 5 : 8);
            const tail = Math.max(0, tTravelP - 0.44);
            const sx = source.x + (endPt.x - source.x) * tail;
            const sy = source.y + (endPt.y - source.y) * tail + offsetAngle;
            const ex = source.x + (endPt.x - source.x) * tTravelP;
            const ey = source.y + (endPt.y - source.y) * tTravelP + offsetAngle;

            const trGrad = ctx.createLinearGradient(sx, sy, ex, ey);
            trGrad.addColorStop(0, 'rgba(251, 191, 36, 0)');
            trGrad.addColorStop(0.65, b % 2 === 0 ? '#fbbf24' : '#fb7185');
            trGrad.addColorStop(1, '#ffffff');
            ctx.strokeStyle = trGrad;
            ctx.lineWidth = isCrit ? 4.4 : 3.4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
          }
        }

        if (isMiss && (tTravelP >= 0.75 || tPostP > 0)) {
          drawMissDodgeCue(ctx, source, tgt, tPostP, tFade, multiScale);
        } else if (!isMiss && tInHitStop) {
          drawImpactHitStopStarburst(ctx, tgt, '#fb7185', '#fde047', (isCrit ? 1.25 : 1.06) * multiScale, false, isCrit);
        } else if (!isMiss && tPostP > 0) {
          drawDirectionalImpactSparks(
            ctx,
            source,
            tgt,
            tPostP,
            tFade,
            '#fb7185',
            '#fde047',
            particleScale,
            reducedMotion,
            isCrit,
            multiScale,
          );
        }
      });
      break;
    }

    case 'LIGHTNING_STRIKE': {
      if (inAnticipation) {
        drawAnticipationCharge(ctx, source, antP, '#34d399', '#fef08a', false);
      }
      targets.forEach((tgt, idx) => {
        if (inTargetLock || inAnticipation) {
          drawLockLine(tgt, '#34d399');
          drawTargetLockReticle(ctx, tgt, inTargetLock ? lockP : 1, '#34d399', false);
          return;
        }
        const { tTravelP, tInHitStop, tPostP, tFade } = evalTargetTiming(idx);
        ctx.globalAlpha = tFade;
        const skyOrigin: Point2D = { x: tgt.x + (idx % 2 === 0 ? -24 : 24), y: Math.max(0, tgt.y - 230) };
        const endPt: Point2D = {
          x: skyOrigin.x + (tgt.x - skyOrigin.x) * tTravelP,
          y: skyOrigin.y + (tgt.y - skyOrigin.y) * tTravelP,
        };
        const boltPts = buildLightningPoints(skyOrigin, endPt, Math.floor((tInHitStop ? timings.hitStopStartMs : nowMs) / 42) + idx * 97, 9);

        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = (tInHitStop ? 12 : 9) * tFade;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        boltPts.forEach((pt, j) => (j === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
        ctx.stroke();

        ctx.strokeStyle = '#fef9c3';
        ctx.lineWidth = (tInHitStop ? 4.5 : 3) * tFade;
        ctx.beginPath();
        boltPts.forEach((pt, j) => (j === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
        ctx.stroke();

        if (tInHitStop) {
          drawImpactHitStopStarburst(ctx, tgt, '#34d399', '#fef08a', (isCrit ? 1.38 : 1.2) * multiScale, false, isCrit);
        } else if (tPostP > 0) {
          drawDirectionalImpactSparks(
            ctx,
            skyOrigin,
            tgt,
            tPostP,
            tFade,
            '#34d399',
            '#fef08a',
            particleScale,
            reducedMotion,
            isCrit,
            multiScale,
          );
        }
      });
      break;
    }

    case 'EXPLOSION': {
      if (inAnticipation) {
        drawAnticipationCharge(ctx, source, antP, '#f97316', '#fef08a', false);
      }
      targets.forEach((tgt, idx) => {
        if (inTargetLock || inAnticipation) {
          drawLockLine(tgt, '#f97316');
          drawTargetLockReticle(ctx, tgt, inTargetLock ? lockP : 1, '#f97316', false);
          return;
        }
        const { tTravelP, tInHitStop, tPostP, tFade } = evalTargetTiming(idx);
        if (tTravelP < 1) {
          // Đạn kíp nổ bay tới mục tiêu trước khi phát nổ ở Impact
          const ox = source.x + (tgt.x - source.x) * tTravelP;
          const oy = source.y + (tgt.y - source.y) * tTravelP - Math.sin(tTravelP * Math.PI) * 32;
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(ox, oy, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.quadraticCurveTo((source.x + tgt.x) * 0.5, Math.min(source.y, tgt.y) - 36, ox, oy);
          ctx.stroke();
          return;
        }

        if (tInHitStop) {
          drawImpactHitStopStarburst(ctx, tgt, '#f97316', '#fef08a', (isCrit ? 1.4 : 1.24) * multiScale, false, isCrit);
        }
        const coreR = (14 + (tInHitStop ? 0.25 : tPostP) * (isCrit ? 64 : 54)) * multiScale;
        ctx.globalAlpha = tFade * 0.8;
        const rad = ctx.createRadialGradient(tgt.x, tgt.y, 2, tgt.x, tgt.y, coreR);
        rad.addColorStop(0, '#fef08a');
        rad.addColorStop(0.45, '#f97316');
        rad.addColorStop(0.8, 'rgba(225, 29, 72, 0.45)');
        rad.addColorStop(1, 'rgba(225, 29, 72, 0)');
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(tgt.x, tgt.y, coreR, 0, Math.PI * 2);
        ctx.fill();

        if (tPostP > 0) {
          drawDirectionalImpactSparks(
            ctx,
            source,
            tgt,
            tPostP,
            tFade,
            '#f97316',
            '#fbbf24',
            particleScale,
            reducedMotion,
            isCrit,
            multiScale,
          );
        }
      });
      break;
    }

    case 'COUNTER_STRIKE': {
      // Phản kích 4 nhịp đặc trưng:
      // 1) Phòng thủ lục giác cyan-violet quanh người đỡ đòn (Target Lock)
      // 2) Đảo hướng xoáy tụ năng lượng tím-đỏ (Anticipation)
      // 3) Đôi vuốt phản kích xoắn lao ngược lại kẻ tấn công (Travel)
      // 4) Va chạm phản đòn + Hit-stop 80ms + 6-point rotated diamond burst (Impact -> Recovery)
      const parryAlpha = Math.max(0, 1 - postImpactP * 1.4);
      if (parryAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = parryAlpha;
        const shieldR = 22 + (inTargetLock ? lockP * 10 : 10 + antP * 8);
        ctx.strokeStyle = inTargetLock ? '#38bdf8' : '#c084fc';
        ctx.fillStyle = inTargetLock ? 'rgba(56, 189, 248, 0.22)' : 'rgba(192, 132, 252, 0.16)';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const ang = (Math.PI / 3) * k + (1 - lockP) * 0.45 - antP * 0.8;
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

      if (inAnticipation) {
        drawAnticipationCharge(ctx, source, antP, '#c084fc', '#f43f5e', true);
      }

      for (const tgt of targets) {
        if (inTargetLock || inAnticipation) {
          drawLockLine(tgt, '#c084fc');
          drawTargetLockReticle(ctx, tgt, inTargetLock ? lockP : 1, '#c084fc', true);
          continue;
        }
        const endPt = isMiss ? { x: tgt.x + 26, y: tgt.y - 16 } : tgt;
        const dx = endPt.x - source.x;
        const dy = endPt.y - source.y;
        const len = Math.max(1, Math.hypot(dx, dy));
        const arcOffset = len < 110 ? 34 : 28;
        const nx = (-dy / len) * arcOffset;
        const ny = (dx / len) * arcOffset;
        const curX = source.x + dx * travelP;
        const curY = source.y + dy * travelP;
        const midX = (source.x + curX) * 0.5;
        const midY = (source.y + curY) * 0.5;

        ctx.globalAlpha = fade;
        const g1 = ctx.createLinearGradient(source.x, source.y, curX, curY);
        g1.addColorStop(0, 'rgba(192, 132, 252, 0.1)');
        g1.addColorStop(0.7, '#c084fc');
        g1.addColorStop(1, '#ffffff');
        ctx.strokeStyle = g1;
        ctx.lineWidth = isCrit ? 6 : 4.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.quadraticCurveTo(midX + nx, midY + ny, curX, curY);
        ctx.stroke();

        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = isCrit ? 4.8 : 3.8;
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.quadraticCurveTo(midX - nx, midY - ny, curX, curY);
        ctx.stroke();

        if (isMiss && (travelP >= 0.75 || postImpactP > 0)) {
          drawMissDodgeCue(ctx, source, tgt, postImpactP, fade, multiScale);
        } else if (!isMiss && inHitStop) {
          drawImpactHitStopStarburst(ctx, tgt, '#c084fc', '#f43f5e', (isCrit ? 1.35 : 1.2) * multiScale, true, isCrit);
        } else if (!isMiss && postImpactP > 0) {
          drawDirectionalImpactSparks(
            ctx,
            source,
            tgt,
            postImpactP,
            fade,
            '#c084fc',
            '#f43f5e',
            particleScale,
            reducedMotion,
            isCrit,
            multiScale,
          );
        }
      }
      break;
    }

    case 'HEAL_AURA': {
      // Hồi máu rõ nét & nhẹ nhàng: cột ánh sáng lục bảo dâng lên + 2 vòng sanctuary + xoắn ốc đôi + dấu thập (+)
      const healFade = Math.sin(p * Math.PI);
      for (const tgt of targets) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, healFade));

        // Cột sáng hồi phục cục bộ quanh quân cờ (sắc gọn, không phủ mờ toàn màn)
        const pillarH = (68 + p * 26) * multiScale;
        const pillarW = 30 * multiScale;
        const pillarGrad = ctx.createLinearGradient(tgt.x, tgt.y + 18, tgt.x, tgt.y - pillarH);
        pillarGrad.addColorStop(0, 'rgba(52, 211, 153, 0.34)');
        pillarGrad.addColorStop(0.55, 'rgba(110, 231, 183, 0.22)');
        pillarGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
        ctx.fillStyle = pillarGrad;
        ctx.beginPath();
        ctx.rect(tgt.x - pillarW, tgt.y - pillarH, pillarW * 2, pillarH + 18);
        ctx.fill();

        // 2 vòng sóng chữa lành lan tỏa êm ái (vòng mặt đất + vòng nâng)
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 3.2 * healFade;
        ctx.beginPath();
        ctx.ellipse(tgt.x, tgt.y + 8, (18 + p * 36) * multiScale, (8 + p * 14) * multiScale, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2.2 * healFade;
        ctx.beginPath();
        ctx.arc(tgt.x, tgt.y, (14 + p * 30) * multiScale, 0, Math.PI * 2);
        ctx.stroke();

        // 2 dải xoắn ốc dâng lên quanh quân cờ
        for (let strand = 0; strand < 2; strand++) {
          ctx.strokeStyle = strand === 0 ? '#6ee7b7' : '#fef08a';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          for (let s = 0; s <= 12; s++) {
            const frac = s / 12;
            const yOff = 18 - (p * 36 + frac * 48) * multiScale;
            const ang = frac * Math.PI * 2.4 + p * 4.5 + strand * Math.PI;
            const xOff = Math.cos(ang) * (24 * multiScale * (1 - frac * 0.3));
            if (s === 0) ctx.moveTo(tgt.x + xOff, tgt.y + yOff);
            else ctx.lineTo(tgt.x + xOff, tgt.y + yOff);
          }
          ctx.stroke();
        }

        // Các chữ thập (+) hồi phục nổi lên rõ nét
        const crossCount = reducedMotion || particleScale <= 0 ? 3 : Math.max(4, Math.round(6 * particleScale));
        for (let i = 0; i < crossCount; i++) {
          const ox = (i - (crossCount - 1) / 2) * 16 * multiScale;
          const oy = 4 - p * 54 * multiScale - (i % 2) * 14;
          const arm = 5.2 * multiScale;
          ctx.strokeStyle = i % 2 === 0 ? '#6ee7b7' : '#fef08a';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(tgt.x + ox - arm, tgt.y + oy);
          ctx.lineTo(tgt.x + ox + arm, tgt.y + oy);
          ctx.moveTo(tgt.x + ox, tgt.y + oy - arm);
          ctx.lineTo(tgt.x + ox, tgt.y + oy + arm);
          ctx.stroke();
        }
        ctx.restore();
      }
      break;
    }

    case 'SHIELD_GUARD': {
      // Khiên bảo vệ: 2 tầng lục giác tinh thể xanh dương + tia đạn nảy ngược khỏi mặt khiên
      const shFade = Math.sin(p * Math.PI);
      for (const tgt of targets) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, shFade));
        const r = 24 + Math.min(1, p * 1.6) * 16;
        ctx.strokeStyle = '#38bdf8';
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 3.2;
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

        // Lục giác phản xạ ngoài
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.8;
        const r2 = r + 7 + p * 8;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const ang = (Math.PI / 3) * k - Math.PI / 2 + 0.12;
          const hx = tgt.x + Math.cos(ang) * r2;
          const hy = tgt.y + Math.sin(ang) * r2;
          if (k === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();

        // Tia phản lực bật ra từ 6 đỉnh khiên
        if (!reducedMotion && particleScale > 0) {
          for (let k = 0; k < 6; k++) {
            const ang = (Math.PI / 3) * k - Math.PI / 2;
            const d1 = r + 2;
            const d2 = r + 10 + p * 18;
            ctx.strokeStyle = k % 2 === 0 ? '#bae6fd' : '#38bdf8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(tgt.x + Math.cos(ang) * d1, tgt.y + Math.sin(ang) * d1);
            ctx.lineTo(tgt.x + Math.cos(ang) * d2, tgt.y + Math.sin(ang) * d2);
            ctx.stroke();
          }
        }
        ctx.restore();
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
  combatFocus: ActiveCombatFocusState | null;
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
  victoryPhase: VictoryCinematicPhase;
  victoryDurationMs: number;
  isVictoryCinematicActive: boolean;
  openingPhase: OpeningDealPhase;
  openingCardFlipped: boolean;
  openingDurationMs: number;
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
  const [combatFocus, setCombatFocus] = useState<ActiveCombatFocusState | null>(null);
  const activeCombatFocusIdRef = useRef<string | null>(null);
  const combatDomAnimsRef = useRef<Map<HTMLElement, TrackedDomAnim>>(new Map());
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
  const activeCutInIdRef = useRef<string | null>(null);
  const activeOpeningIdRef = useRef<string | null>(null);
  const [revealPhase, setRevealPhase] = useState<RoleRevealPhase>('settle');
  const [victoryPhase, setVictoryPhase] = useState<VictoryCinematicPhase>('settle');
  const [victoryDurationMs, setVictoryDurationMs] = useState<number>(2200);
  const [openingPhase, setOpeningPhase] = useState<OpeningDealPhase>('back-to-board');
  const [openingCardFlipped, setOpeningCardFlipped] = useState<boolean>(false);
  const [openingDurationMs, setOpeningDurationMs] = useState<number>(3550);
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

  const cancelCombatDomAnims = useCallback(() => {
    combatDomAnimsRef.current.forEach(({ anim, baseZ }, el) => {
      try {
        anim.onfinish = null;
        anim.oncancel = null;
        anim.cancel();
      } catch {
        // ignore finished animations
      }
      el.style.zIndex = baseZ;
    });
    combatDomAnimsRef.current.clear();
  }, []);

  const skipAllAnimations = useCallback(() => {
    clearAllTimers();
    cancelCombatDomAnims();
    stopAllBoardGameSounds();
    trackerRef.current.acknowledgeSnapshotDice(publicGameRef.current);
    trackerRef.current.acknowledgeSnapshotVictory(publicGameRef.current);
    trackerRef.current.acknowledgeSnapshotOpening(publicGameRef.current);
    activeCombatAnimsRef.current = [];
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const canvas = combatLayerRef.current;
    if (canvas) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    }
    activeCombatFocusIdRef.current = null;
    setCombatFocus(null);
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
    activeCutInIdRef.current = null;
    activeOpeningIdRef.current = null;
    setCutInQueue([]);
    setActiveCutIn(null);
    setRevealPhase('settle');
    setVictoryPhase('settle');
    setOpeningPhase('back-to-board');
    setOpeningCardFlipped(false);
    setScreenShake('none');
  }, [cancelCombatDomAnims, clearAllTimers]);

  // Cut-in queue pump: phát lần lượt từng banner điện ảnh đồng bộ âm thanh theo event.id
  useEffect(() => {
    if (activeCutIn || cutInQueue.length === 0) return;
    const [nextBanner, ...rest] = cutInQueue;
    activeCutInIdRef.current = nextBanner.id;
    setActiveCutIn(nextBanner);
    setCutInQueue(rest);
    playSoundForVisualEvent(nextBanner);

    let closeAfterMs = nextBanner.durationMs;

    if (nextBanner.bannerType === 'ROLE_REVEAL') {
      const revTl = resolveRoleRevealTimeline(
        nextBanner.durationMs,
        reducedMotionRef.current,
        qualityTierRef.current,
      );
      closeAfterMs = revTl.totalMs;

      if (revTl.anticipationEndMs <= 0) {
        setRevealPhase('settle');
      } else {
        setRevealPhase('anticipation');
        scheduleTimeout(() => {
          if (activeCutInIdRef.current !== nextBanner.id) return;
          setRevealPhase('card-flip');
        }, revTl.anticipationEndMs);
        scheduleTimeout(() => {
          if (activeCutInIdRef.current !== nextBanner.id) return;
          setRevealPhase('faction-reveal');
          if (particleScaleRef.current > 0) {
            const burstUid = `${nextBanner.id}::faction-burst`;
            const container = containerRef.current;
            const players = playersSnapshotRef.current;
            const pawnAnchor = resolvePlayerAnchor(container, nextBanner.actorId, players);
            const cw = container?.clientWidth || 720;
            activeCombatAnimsRef.current = [
              ...activeCombatAnimsRef.current.filter((a) => a.uid !== burstUid),
              {
                uid: burstUid,
                event: {
                  id: burstUid,
                  kind: 'COMBAT_VFX',
                  order: 31,
                  durationMs: 960,
                  effect: 'HEAL_AURA',
                  sourcePlayerId: nextBanner.actorId,
                  targetPlayerIds: [],
                  shake: 'none',
                },
                source: { x: cw * 0.5, y: 128 },
                targets: [pawnAnchor],
                startedAt: performance.now(),
                durationMs: 960,
                factionReveal: nextBanner.faction ?? 'lantern-guard',
              },
            ];
            setActiveCombatCount(activeCombatAnimsRef.current.length);
            ensureCanvasLoop();
          }
        }, revTl.cardFlipEndMs);
        scheduleTimeout(() => {
          if (activeCutInIdRef.current !== nextBanner.id) return;
          setRevealPhase('impact');
          if (enableScreenShakeRef.current) {
            setScreenShake('light');
            scheduleTimeout(() => setScreenShake('none'), 180);
          }
        }, revTl.factionRevealEndMs);
        scheduleTimeout(() => {
          if (activeCutInIdRef.current !== nextBanner.id) return;
          setRevealPhase('settle');
        }, revTl.impactEndMs);
      }
    } else if (nextBanner.bannerType === 'VICTORY') {
      setRevealPhase('settle');
      const vicTl = resolveVictoryCinematicTimeline(
        nextBanner.durationMs,
        reducedMotionRef.current,
        qualityTierRef.current,
      );
      closeAfterMs = vicTl.totalMs;
      setVictoryDurationMs(vicTl.totalMs);

      const spawnVictoryBurst = (burstDurMs: number) => {
        if (particleScaleRef.current <= 0) return;
        const container = containerRef.current;
        const cw = container?.clientWidth || 720;
        const ch = container?.clientHeight || 480;
        const burstUid = `${nextBanner.id}::victory-fireworks`;
        activeCombatAnimsRef.current = [
          ...activeCombatAnimsRef.current.filter((a) => a.uid !== burstUid),
          {
            uid: burstUid,
            event: {
              id: burstUid,
              kind: 'COMBAT_VFX',
              order: 63,
              durationMs: burstDurMs,
              effect: 'HEAL_AURA',
              sourcePlayerId: null,
              targetPlayerIds: [],
              shake: 'none',
            },
            source: { x: cw * 0.5, y: ch * 0.44 },
            targets: [
              { x: cw * 0.24, y: ch * 0.34 },
              { x: cw * 0.5, y: ch * 0.3 },
              { x: cw * 0.76, y: ch * 0.34 },
            ],
            startedAt: performance.now(),
            durationMs: burstDurMs,
            victoryFactionBurst: nextBanner.faction ?? 'lantern-guard',
            victoryOutcome: nextBanner.matchOutcome ?? 'victory',
          },
        ];
        setActiveCombatCount(activeCombatAnimsRef.current.length);
        ensureCanvasLoop();
      };

      if (vicTl.anticipationEndMs <= 0) {
        setVictoryPhase('settle');
      } else {
        setVictoryPhase('anticipation');
        scheduleTimeout(() => {
          if (activeCutInIdRef.current !== nextBanner.id) return;
          setVictoryPhase('faction-reveal');
          spawnVictoryBurst(Math.max(900, vicTl.totalMs - vicTl.anticipationEndMs));
        }, vicTl.anticipationEndMs);
        scheduleTimeout(() => {
          if (activeCutInIdRef.current !== nextBanner.id) return;
          setVictoryPhase('impact');
          if (enableScreenShakeRef.current) {
            setScreenShake('light');
            scheduleTimeout(() => setScreenShake('none'), 190);
          }
        }, vicTl.factionRevealEndMs);
        scheduleTimeout(() => {
          if (activeCutInIdRef.current !== nextBanner.id) return;
          setVictoryPhase('settle');
        }, vicTl.impactEndMs);
      }
    } else if (nextBanner.bannerType === 'OPENING_DEAL') {
      activeOpeningIdRef.current = nextBanner.id;
      setRevealPhase('settle');
      setVictoryPhase('settle');
      const opTl = resolveOpeningDealTimeline(
        nextBanner.durationMs,
        reducedMotionRef.current,
        qualityTierRef.current,
      );
      closeAfterMs = opTl.totalMs;
      setOpeningDurationMs(opTl.totalMs);
      const canFlipPersonalCard = Boolean(!nextBanner.openingIsSpectator && nextBanner.roleId);

      const pulseFirstTurnHighlight = () => {
        if (reducedMotionRef.current) return;
        const container = containerRef.current;
        if (!container) return;
        const targetsToPulse: HTMLElement[] = [];
        if (nextBanner.actorId) {
          targetsToPulse.push(...resolvePlayerElements(container, nextBanner.actorId));
        }
        if (nextBanner.openingIsSelfFirstTurn && !nextBanner.openingIsSpectator) {
          const diceTray = container.querySelector<HTMLElement>('[data-testid="bg-dice-tray"], [data-testid="bg-sandbox-dice-tray"]');
          const rollBtn = container.querySelector<HTMLElement>('[data-testid="bg-roll-dice-btn"]');
          if (diceTray) targetsToPulse.push(diceTray);
          if (rollBtn) targetsToPulse.push(rollBtn);
        }
        for (const el of targetsToPulse) {
          if (typeof el.animate !== 'function') continue;
          const existing = combatDomAnimsRef.current.get(el);
          let baseZ = el.style.zIndex;
          if (existing) {
            baseZ = existing.baseZ;
            combatDomAnimsRef.current.delete(el);
            try {
              existing.anim.onfinish = null;
              existing.anim.oncancel = null;
              existing.anim.cancel();
            } catch {
              // ignore
            }
            el.style.zIndex = baseZ;
          }
          const anim = el.animate(
            [
              { boxShadow: '0 0 0 0 rgba(251,191,36,0)', transform: 'scale(1)' },
              { boxShadow: '0 0 0 3px rgba(251,191,36,0.9), 0 0 24px rgba(56,189,248,0.55)', transform: 'scale(1.035)' },
              { boxShadow: '0 0 0 0 rgba(251,191,36,0)', transform: 'scale(1)' },
            ],
            { duration: 640, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'none' },
          );
          const entry: TrackedDomAnim = { anim, baseZ };
          combatDomAnimsRef.current.set(el, entry);
          const cleanup = () => {
            if (combatDomAnimsRef.current.get(el) === entry) {
              combatDomAnimsRef.current.delete(el);
              el.style.zIndex = baseZ;
            }
          };
          anim.onfinish = cleanup;
          anim.oncancel = cleanup;
        }
      };

      if (opTl.startStingerEndMs <= 0) {
        // Reduced Motion: bỏ rung/bay, hiển thị ngắn gọn vai riêng (hoặc niêm phong khán giả) -> vào bàn
        setOpeningPhase('personal-reveal');
        setOpeningCardFlipped(canFlipPersonalCard);
        scheduleTimeout(() => {
          if (activeCutInIdRef.current !== nextBanner.id) return;
          setOpeningPhase('back-to-board');
        }, opTl.personalRevealEndMs);
      } else {
        setOpeningPhase('start-stinger');
        setOpeningCardFlipped(false);

        if (particleScaleRef.current > 0 && qualityTierRef.current !== 'low') {
          const container = containerRef.current;
          const cw = container?.clientWidth || 720;
          const ch = container?.clientHeight || 480;
          const ambUid = `${nextBanner.id}::opening-ambient`;
          activeCombatAnimsRef.current = [
            ...activeCombatAnimsRef.current.filter((a) => a.uid !== ambUid),
            {
              uid: ambUid,
              event: {
                id: ambUid,
                kind: 'COMBAT_VFX',
                order: 6,
                durationMs: opTl.personalRevealEndMs,
                effect: 'HEAL_AURA',
                sourcePlayerId: null,
                targetPlayerIds: [],
                shake: 'none',
              },
              source: { x: cw * 0.5, y: ch * 0.46 },
              targets: [],
              startedAt: performance.now(),
              durationMs: opTl.personalRevealEndMs,
              openingAmbientBurst: true,
            },
          ];
          setActiveCombatCount(activeCombatAnimsRef.current.length);
          ensureCanvasLoop();
        }

        // Beat 2: Shuffle / Deal Roles
        scheduleTimeout(() => {
          if (activeCutInIdRef.current !== nextBanner.id) return;
          setOpeningPhase('shuffle-deal');
        }, opTl.startStingerEndMs);

        // Beat 3: Personal Secret Role Reveal (hoặc Spectator Sealed Notice)
        scheduleTimeout(() => {
          if (activeCutInIdRef.current !== nextBanner.id) return;
          setOpeningPhase('personal-reveal');
        }, opTl.shuffleDealEndMs);

        // Lật 3D lá bài bí mật CHỈ cho người chơi hiện tại (Spectator KHÔNG BAO GIỜ lật)
        if (canFlipPersonalCard) {
          scheduleTimeout(() => {
            if (activeCutInIdRef.current !== nextBanner.id) return;
            setOpeningCardFlipped(true);
          }, opTl.personalRevealFlipAtMs);
        }

        // Beat 4: Back To Board / First Turn Ready
        scheduleTimeout(() => {
          if (activeCutInIdRef.current !== nextBanner.id) return;
          setOpeningPhase('back-to-board');
          pulseFirstTurnHighlight();
        }, opTl.personalRevealEndMs);
      }
    } else {
      setRevealPhase('settle');
      setVictoryPhase('settle');
    }

    scheduleTimeout(() => {
      if (activeCutInIdRef.current === nextBanner.id) {
        activeCutInIdRef.current = null;
      }
      if (activeOpeningIdRef.current === nextBanner.id) {
        activeOpeningIdRef.current = null;
        setOpeningPhase('back-to-board');
        setOpeningCardFlipped(false);
      }
      setActiveCutIn((curr) => (curr?.id === nextBanner.id ? null : curr));
    }, closeAfterMs);
  }, [activeCutIn, containerRef, cutInQueue, ensureCanvasLoop, scheduleTimeout]);

  const enqueueEvents = useCallback(
    (events: readonly BoardGameVisualEvent[]) => {
      if (events.length === 0) return;
      const container = containerRef.current;
      const players = playersSnapshotRef.current;
      const newCutIns: CinematicCutInVisualEvent[] = [];
      const isReduced = reducedMotionRef.current;
      const tier = qualityTierRef.current;
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
      const shieldEvt =
        events.find(
          (e): e is CombatVfxVisualEvent =>
            e.kind === 'COMBAT_VFX' && e.effect === 'SHIELD_GUARD',
        ) ?? null;
      const healEvt =
        events.find(
          (e): e is CombatVfxVisualEvent =>
            e.kind === 'COMBAT_VFX' && e.effect === 'HEAL_AURA',
        ) ?? null;
      const stealEvt =
        events.find(
          (e): e is CombatVfxVisualEvent =>
            e.kind === 'COMBAT_VFX' && e.effect === 'STEAL_TETHER',
        ) ?? null;

      const batchAttackTimings = primaryOffensive
        ? resolveCombatSequenceTimings(primaryOffensive.durationMs, primaryOffensive.effect, isReduced, {
            qualityTier: tier,
            isCritical: primaryOffensive.isCritical,
            isMiss: primaryOffensive.isMiss,
          })
        : null;
      const batchCounterTimings = counterEvt
        ? resolveCombatSequenceTimings(counterEvt.durationMs, counterEvt.effect, isReduced, {
            qualityTier: tier,
            isCritical: counterEvt.isCritical,
            isMiss: counterEvt.isMiss,
          })
        : null;
      const batchShieldTimings = shieldEvt
        ? resolveCombatSequenceTimings(shieldEvt.durationMs, shieldEvt.effect, isReduced, {
            qualityTier: tier,
          })
        : null;
      const batchHealTimings = healEvt
        ? resolveCombatSequenceTimings(healEvt.durationMs, healEvt.effect, isReduced, {
            qualityTier: tier,
          })
        : null;
      const batchStealTimings = stealEvt
        ? resolveCombatSequenceTimings(stealEvt.durationMs, stealEvt.effect, isReduced, {
            qualityTier: tier,
          })
        : null;
      // Phản kích bắt đầu liền mạch ngay sau khi đòn tấn công đầu chốt Impact (không đè lên nhau)
      const counterDelayMs =
        !isReduced && primaryOffensive && counterEvt
          ? Math.max(540, batchAttackTimings?.impactEndMs ?? 660)
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
            const baseTimeline = buildDiceRollTimeline({
              diceKind: ev.diceKind,
              qualityTier: qualityTierRef.current,
              pawnGlideDurationMs: pawnGlideDurationMsRef.current,
              reducedMotion: reducedMotionRef.current,
              hasDestinationMove,
            });
            // Khi xúc xắc tấn công đi cùng chuỗi đòn đánh, chốt kết quả xúc xắc đúng khung Impact
            // để không bao giờ xảy ra trạng thái "Đang tung xúc xắc..." khi số sát thương đã bật lên bàn.
            const syncAttackDiceWithImpact =
              ev.diceKind === 'attack' &&
              !reducedMotionRef.current &&
              Boolean(batchAttackTimings && batchAttackTimings.impactStartMs > 0);
            const timeline =
              syncAttackDiceWithImpact && batchAttackTimings
                ? {
                    ...baseTimeline,
                    windupEndMs: Math.max(80, batchAttackTimings.targetLockEndMs),
                    tumbleEndMs: Math.max(180, batchAttackTimings.anticipationEndMs),
                    diceSettleAtMs: Math.max(320, batchAttackTimings.impactStartMs),
                    destHighlightStartMs: Math.max(320, batchAttackTimings.impactStartMs),
                    diceOverlayEndMs: Math.max(batchAttackTimings.recoveryEndMs + 280, 1200),
                  }
                : baseTimeline;
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
              {
                qualityTier: qualityTierRef.current,
                isCritical: ev.isCritical,
                isMiss: ev.isMiss,
              },
            );
            const startDelayMs =
              ev.effect === 'COUNTER_STRIKE' ? counterDelayMs : 0;
            const isOffensiveSequence =
              ev.effect !== 'HEAL_AURA' &&
              ev.effect !== 'SHIELD_GUARD' &&
              ev.effect !== 'STEAL_TETHER';
            const colors = getCombatAccentColor(ev);

            const launchCombatFx = () => {
              const liveSource = resolvePlayerAnchor(containerRef.current, ev.sourcePlayerId, playersSnapshotRef.current);
              const liveTargets = (
                ev.targetPlayerIds.length > 0 ? ev.targetPlayerIds : [ev.sourcePlayerId ?? '']
              ).map((tid) => resolvePlayerAnchor(containerRef.current, tid, playersSnapshotRef.current));

              const maxStaggerMs =
                liveTargets.length > 1 && !reducedMotionRef.current
                  ? resolveMultiTargetStaggerMs(liveTargets.length - 1, liveTargets.length, reducedMotionRef.current)
                  : 0;

              activeCombatAnimsRef.current.push({
                uid: ev.id,
                event: ev,
                source: liveSource,
                targets: liveTargets,
                startedAt: performance.now(),
                durationMs: seqTimings.recoveryEndMs + maxStaggerMs,
                timings: seqTimings,
              });
              setActiveCombatCount(activeCombatAnimsRef.current.length);
              ensureCanvasLoop();
              const shieldSyncMs =
                ev.effect === 'SHIELD_GUARD' && batchAttackTimings && !reducedMotionRef.current
                  ? batchAttackTimings.impactStartMs
                  : undefined;
              playSoundForVisualEvent(
                {
                  ...ev,
                  durationMs: seqTimings.recoveryEndMs,
                },
                Date.now(),
                shieldSyncMs !== undefined ? { impactOverrideMs: shieldSyncMs } : undefined,
              );

              // Kích hoạt chuyển động vật lý quân cờ (Target Lock glow -> Anticipation lunge -> Impact knockback 6-10px -> Recovery) & tương tác ô địa điểm
              runCombatPawnAndTileChoreography(
                containerRef.current,
                ev,
                liveSource,
                liveTargets,
                seqTimings,
                reducedMotionRef.current,
                qualityTierRef.current,
                combatDomAnimsRef,
              );

              // Phối nhịp 5 pha trên Combat Focus Backdrop (Target Lock -> Anticipation -> Travel -> Impact -> Recovery)
              if (isOffensiveSequence && !reducedMotionRef.current && seqTimings.targetLockEndMs > 0) {
                activeCombatFocusIdRef.current = ev.id;
                const setFocusPhase = (phase: CombatSequencePhase) => {
                  if (activeCombatFocusIdRef.current !== ev.id) return;
                  setCombatFocus({
                    uid: ev.id,
                    effect: ev.effect,
                    phase,
                    source: liveSource,
                    targets: liveTargets,
                    targetPlayerIds: ev.targetPlayerIds,
                    isCounter: ev.effect === 'COUNTER_STRIKE',
                    isCritical: Boolean(ev.isCritical),
                    isMiss: Boolean(ev.isMiss),
                    hitStopDurationMs: seqTimings.hitStopDurationMs,
                    accentColor: colors.primary,
                  });
                };
                setFocusPhase('target-lock');
                scheduleTimeout(() => setFocusPhase('anticipation'), seqTimings.targetLockEndMs);
                scheduleTimeout(() => setFocusPhase('travel'), seqTimings.anticipationEndMs);
                scheduleTimeout(() => setFocusPhase('impact'), seqTimings.impactStartMs);
                scheduleTimeout(() => setFocusPhase('recovery'), seqTimings.impactEndMs + maxStaggerMs);
                scheduleTimeout(() => {
                  if (activeCombatFocusIdRef.current === ev.id) {
                    activeCombatFocusIdRef.current = null;
                    setCombatFocus(null);
                  }
                }, seqTimings.recoveryEndMs + maxStaggerMs);
              }

              // Impact Flash tập trung riêng cho từng mục tiêu (stagger theo multi-target, KHÔNG bật trên MISS/HEAL/SHIELD)
              if (seqTimings.hitStopDurationMs > 0 && !reducedMotionRef.current && !ev.isMiss) {
                const isCounter = ev.effect === 'COUNTER_STRIKE';
                const isCompactFlash = liveTargets.length >= 4;
                liveTargets.forEach((pt, idx) => {
                  const staggerMs = resolveMultiTargetStaggerMs(idx, liveTargets.length, false);
                  scheduleTimeout(() => {
                    const flashItem: ActiveImpactFlash = {
                      uid: `${ev.id}::flash::${idx}`,
                      x: pt.x,
                      y: pt.y,
                      color: colors.primary,
                      secondaryColor: colors.secondary,
                      isCounter,
                      isCritical: Boolean(ev.isCritical),
                      compact: isCompactFlash,
                      hitStopMs: seqTimings.hitStopDurationMs,
                    };
                    setImpactFlashes((prev) => [...prev.slice(-10), flashItem]);
                    scheduleTimeout(() => {
                      setImpactFlashes((prev) => prev.filter((f) => f.uid !== flashItem.uid));
                    }, 340);
                  }, seqTimings.impactStartMs + staggerMs);
                });
              }

              // Rung nhẹ có kiểm soát đúng khung Impact (không rung toàn màn quá mạnh)
              if (enableScreenShakeRef.current && ev.shake !== 'none' && !ev.isMiss) {
                const shakeDelay = reducedMotionRef.current
                  ? 0
                  : Math.max(0, seqTimings.impactStartMs - 10);
                scheduleTimeout(() => {
                  setScreenShake(ev.shake);
                  scheduleTimeout(() => setScreenShake('none'), ev.shake === 'heavy' ? 210 : 160);
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
            const uid = ev.id;
            const syncGroup = ev.syncGroup;
            let spawnMs = 0;
            const offensiveTargets = primaryOffensive?.targetPlayerIds ?? [];
            const offensiveTargetIdx = offensiveTargets.indexOf(ev.targetPlayerId);
            const targetStaggerMs =
              !reducedMotionRef.current && offensiveTargetIdx >= 0
                ? resolveMultiTargetStaggerMs(offensiveTargetIdx, offensiveTargets.length, false)
                : 0;
            if (!reducedMotionRef.current) {
              if (syncGroup === 'counter' || ev.variant === 'counter') {
                spawnMs = counterDelayMs + (batchCounterTimings?.damagePopAtMs ?? 660);
              } else if (syncGroup === 'shield' || ev.variant === 'block') {
                spawnMs = batchAttackTimings
                  ? batchAttackTimings.impactStartMs + 40
                  : batchShieldTimings?.impactStartMs ?? 420;
              } else if (syncGroup === 'heal' || ev.variant === 'heal') {
                spawnMs = batchHealTimings?.impactStartMs ?? 400;
              } else if (syncGroup === 'steal' || ev.variant === 'steal') {
                spawnMs = batchStealTimings?.impactStartMs ?? 420;
              } else if (
                (syncGroup === 'attack' ||
                  ev.variant === 'damage' ||
                  ev.variant === 'critical' ||
                  ev.variant === 'miss') &&
                batchAttackTimings
              ) {
                // Quan trọng: Sát thương chỉ xuất hiện TẠI/SAU Impact của chính mục tiêu đó (damagePopAtMs + staggerMs)
                spawnMs = batchAttackTimings.damagePopAtMs + targetStaggerMs;
              } else {
                spawnMs = 120;
              }
            }
            const isMultiTargetCrowd = offensiveTargets.length >= 4;
            scheduleTimeout(() => {
              const cEl = containerRef.current;
              const livePt = resolvePlayerAnchor(
                cEl,
                ev.targetPlayerId,
                playersSnapshotRef.current,
              );
              const cw = cEl?.clientWidth || 720;
              const ch = cEl?.clientHeight || 480;
              setFloatingPopups((prev) => {
                const baseX = livePt.x;
                const baseY = livePt.y - 18 + (ev.variant === 'counter' ? -24 : 0);
                const placed = resolveNonOverlappingPopupPos(
                  baseX,
                  baseY,
                  prev,
                  cw,
                  ch,
                  isMultiTargetCrowd || prev.length >= 3,
                );
                return [
                  ...prev.slice(-12),
                  {
                    uid,
                    event: ev,
                    x: placed.x,
                    y: placed.y,
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
        const victoryCutIn = newCutIns.find((c) => c.bannerType === 'VICTORY') ?? null;
        if (victoryCutIn) {
          // Ưu tiên phát ngay Victory/Defeat Cinematic V2 (không kẹt sau banner KO/YourTurn cũ)
          activeCutInIdRef.current = null;
          setActiveCutIn(null);
          setCutInQueue([victoryCutIn]);
        } else {
          setCutInQueue((prev) => [...prev.slice(-6), ...newCutIns]);
        }
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

    // Nếu người chơi chủ động thao tác sớm ngay khi Opening đang chạy (VD: tung xúc xắc Turn 1),
    // tự nhường sạch overlay Opening sang hiệu ứng bàn chơi mới để tuyệt đối không che hay chồng VFX.
    if (activeOpeningIdRef.current && !isFreshMatchOpening(publicGame)) {
      const openingIdToClear = activeOpeningIdRef.current;
      activeOpeningIdRef.current = null;
      if (activeCutInIdRef.current === openingIdToClear) {
        activeCutInIdRef.current = null;
      }
      activeCombatAnimsRef.current = activeCombatAnimsRef.current.filter(
        (a) => !a.openingAmbientBurst,
      );
      setActiveCombatCount(activeCombatAnimsRef.current.length);
      setActiveCutIn((curr) => (curr?.bannerType === 'OPENING_DEAL' ? null : curr));
      setCutInQueue((prev) => prev.filter((c) => c.bannerType !== 'OPENING_DEAL'));
      setOpeningPhase('back-to-board');
      setOpeningCardFlipped(false);
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
      cancelCombatDomAnims();
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
  }, [cancelCombatDomAnims, clearAllTimers]);

  // Suy xuất đồng bộ ngay trong frame render đầu tiên sau snapshot mới:
  // ngăn GameBoard lóe kết quả server / thẻ vai sidebar trước khi useEffect khởi tạo animation.
  const pendingOpening =
    seenMatchRef.current !== publicGame.matchId
      ? trackerRef.current.peekPendingOpening(publicGame, {
          selfPlayerId,
          isSpectator,
          privateView,
          reducedMotion,
        })
      : null;
  const pendingDiceRoll =
    seenMatchRef.current === publicGame.matchId
      ? trackerRef.current.peekPendingDiceRoll(publicGame, reducedMotion)
      : null;
  const pendingVictory =
    seenMatchRef.current === publicGame.matchId
      ? trackerRef.current.peekPendingVictory(publicGame)
      : false;
  const isVictoryCinematicActive =
    pendingVictory ||
    activeCutIn?.bannerType === 'VICTORY' ||
    cutInQueue.some((c) => c.bannerType === 'VICTORY');
  const queuedOpening = !activeCutIn
    ? cutInQueue.find((c) => c.bannerType === 'OPENING_DEAL') ?? null
    : null;
  const pendingOrQueuedOpening = queuedOpening ?? pendingOpening;
  const effectiveActiveCutIn = activeCutIn ?? pendingOrQueuedOpening;
  const effectiveOpeningPhase: OpeningDealPhase =
    !activeCutIn && pendingOrQueuedOpening
      ? reducedMotion
        ? 'personal-reveal'
        : 'start-stinger'
      : openingPhase;
  const effectiveOpeningCardFlipped =
    !activeCutIn && pendingOrQueuedOpening
      ? Boolean(
          reducedMotion &&
            !pendingOrQueuedOpening.openingIsSpectator &&
            pendingOrQueuedOpening.roleId,
        )
      : openingCardFlipped;
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
    Boolean(combatFocus) ||
    floatingPopups.length > 0 ||
    impactFlashes.length > 0 ||
    Boolean(effectiveActiveDiceRoll) ||
    Boolean(effectiveHighlightedLocationId) ||
    Boolean(activeCardDraw) ||
    Boolean(effectiveActiveCutIn) ||
    cutInQueue.length > 0;

  return {
    activeCombatCount,
    combatFocus,
    floatingPopups,
    impactFlashes,
    activeDiceRoll: effectiveActiveDiceRoll,
    diceRollStage: effectiveDiceRollStage,
    isDiceSettled: effectiveIsDiceSettled,
    activeMoveTimeline,
    highlightedLocationId: effectiveHighlightedLocationId,
    skipGeneration,
    activeCardDraw,
    activeCutIn: effectiveActiveCutIn,
    revealPhase,
    victoryPhase,
    victoryDurationMs,
    isVictoryCinematicActive,
    openingPhase: effectiveOpeningPhase,
    openingCardFlipped: effectiveOpeningCardFlipped,
    openingDurationMs,
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
  const isOpeningDealCutIn = cutIn?.bannerType === 'OPENING_DEAL';
  const isRoleRevealCutIn = cutIn?.bannerType === 'ROLE_REVEAL';
  const isVictoryCutIn = cutIn?.bannerType === 'VICTORY';
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
      {/* LỚP 1: SVG ĐƯỜNG NHẮM MỤC TIÊU (Tự ẩn hoàn toàn trong suốt Combat/Impact/Floating Popup để không che tầm nhìn) */}
      {targetLine &&
        vfx.activeCombatCount === 0 &&
        !vfx.combatFocus &&
        vfx.impactFlashes.length === 0 &&
        vfx.floatingPopups.length === 0 && (
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

      {/* LỚP 1B: COMBAT FOCUS SCRIM (GIẢM SÁNG NHẸ XUNG QUANH, TẬP TRUNG QUÂN ĐÁNH & MỤC TIÊU) */}
      {vfx.combatFocus && !vfx.reducedMotion && (() => {
        const cf = vfx.combatFocus;
        const dimOpacity =
          cf.phase === 'target-lock'
            ? 0.24
            : cf.phase === 'anticipation'
              ? 0.3
              : cf.phase === 'travel'
                ? 0.32
                : cf.phase === 'impact'
                  ? cf.isCritical
                    ? 0.38
                    : 0.32
                  : 0.08;
        const focusPt = cf.targets[0] ?? cf.source;
        return (
          <div
            data-testid="bg-vfx-combat-focus"
            data-combat-uid={cf.uid}
            data-combat-phase={cf.phase}
            data-combat-effect={cf.effect}
            data-combat-targets={cf.targetPlayerIds.join(',')}
            data-combat-counter={String(cf.isCounter)}
            data-combat-critical={String(cf.isCritical)}
            data-combat-miss={String(cf.isMiss)}
            data-hit-stop-ms={cf.hitStopDurationMs}
            aria-hidden="true"
            style={{
              background: `radial-gradient(220px circle at ${focusPt.x}px ${focusPt.y}px, ${cf.accentColor}22 0%, rgba(2,6,23,${dimOpacity}) 68%, rgba(2,6,23,${Math.min(0.46, dimOpacity + 0.1)}) 100%)`,
              transition: 'background 140ms ease-out',
            }}
            className="pointer-events-none absolute inset-0 z-[15]"
          />
        );
      })()}

      {/* LỚP 2: CANVAS 2D COMBAT PARTICLES & BEAMS */}
      <canvas
        ref={vfx.combatLayerRef}
        data-testid="bg-vfx-combat-canvas"
        className="pointer-events-none absolute inset-0 z-[18] h-full w-full"
      />

      {/* LỚP 2B: IMPACT FLASH RINGS (60–90ms HIT-STOP IMPACT — Phân hình Normal / Critical / Counter Diamond) */}
      {vfx.impactFlashes.map((flash) => {
        const flashSizeCls = flash.compact
          ? flash.isCritical
            ? 'h-16 w-16'
            : 'h-14 w-14'
          : flash.isCritical
            ? 'h-24 w-24'
            : 'h-20 w-20';
        const flashAnimCls = vfx.reducedMotion
          ? '-translate-x-1/2 -translate-y-1/2 opacity-80'
          : flash.isCounter
            ? 'bg-vfx-impact-flash-counter'
            : flash.isCritical
              ? 'bg-vfx-impact-flash-critical'
              : 'bg-vfx-impact-flash';
        const flashShapeCls = flash.isCounter ? 'rounded-lg border-[3px]' : 'rounded-full border-[3px]';
        return (
          <div
            key={flash.uid}
            data-testid="bg-vfx-impact-flash"
            data-counter={String(flash.isCounter)}
            data-critical={String(Boolean(flash.isCritical))}
            data-hit-stop-ms={flash.hitStopMs}
            style={{
              left: flash.x,
              top: flash.y,
              borderColor: flash.isCritical ? '#fef08a' : flash.color,
              background: `radial-gradient(circle, #ffffffdd 0%, ${flash.secondaryColor}80 24%, ${flash.color}30 52%, transparent 74%)`,
              boxShadow: `0 0 ${flash.compact ? 18 : flash.isCritical ? 34 : 24}px ${flash.color}cc, inset 0 0 10px #ffffffaa`,
            }}
            className={`pointer-events-none absolute z-[19] ${flashShapeCls} ${flashSizeCls} ${flashAnimCls}`}
          />
        );
      })}

      {/* LỚP 3: FLOATING DAMAGE / CRITICAL / HEAL / BLOCK / COUNTER / MISS (Tối ưu tương phản 1920x1080 & tự co gọn khi đông quân) */}
      {vfx.floatingPopups.map((pop) => {
        const crowdedPopups = vfx.floatingPopups.length >= 4;
        const meta =
          pop.event.variant === 'critical'
            ? {
                animCls: 'bg-vfx-float-critical',
                pillCls:
                  'border-2 border-amber-300 bg-gradient-to-b from-rose-700/98 via-rose-950/98 to-slate-950/98 text-amber-100 shadow-[0_8px_24px_rgba(244,63,94,0.8),0_2px_8px_rgba(0,0,0,0.95)] ring-2 ring-rose-500/70',
                icon: '⚡',
                prefix: 'CRIT',
                sizeCls: crowdedPopups
                  ? 'text-lg sm:text-xl px-2 py-0.5 rounded-xl'
                  : 'text-2xl sm:text-[26px] px-3 py-1 rounded-2xl',
              }
            : pop.event.variant === 'damage'
              ? {
                  animCls: 'bg-vfx-float-damage',
                  pillCls:
                    'border-2 border-rose-400/95 bg-gradient-to-b from-rose-950/98 to-slate-950/98 text-white shadow-[0_6px_18px_rgba(225,29,72,0.68),0_2px_6px_rgba(0,0,0,0.95)]',
                  icon: '💥',
                  prefix: null,
                  sizeCls: crowdedPopups
                    ? 'text-base sm:text-lg px-2 py-0.5 rounded-lg'
                    : 'text-xl sm:text-2xl px-2.5 py-0.5 rounded-xl',
                }
              : pop.event.variant === 'heal'
                ? {
                    animCls: 'bg-vfx-float-heal',
                    pillCls:
                      'border-2 border-emerald-300/95 bg-gradient-to-b from-emerald-950/98 to-slate-950/98 text-emerald-100 shadow-[0_6px_18px_rgba(16,185,129,0.62),0_2px_6px_rgba(0,0,0,0.95)]',
                    icon: '✚',
                    prefix: null,
                    sizeCls: crowdedPopups
                      ? 'text-base sm:text-lg px-2 py-0.5 rounded-full'
                      : 'text-lg sm:text-xl px-2.5 py-0.5 rounded-full',
                  }
                : pop.event.variant === 'block'
                  ? {
                      animCls: 'bg-vfx-float-block',
                      pillCls:
                        'border-2 border-sky-300/95 bg-gradient-to-b from-sky-950/98 to-slate-950/98 text-sky-100 shadow-[0_6px_20px_rgba(56,189,248,0.65),0_2px_6px_rgba(0,0,0,0.95)]',
                      icon: '🛡️',
                      prefix: null,
                      sizeCls: crowdedPopups
                        ? 'text-xs sm:text-sm px-2 py-0.5 rounded-md uppercase tracking-wider'
                        : 'text-base sm:text-lg px-2.5 py-0.5 rounded-lg uppercase tracking-wider',
                    }
                  : pop.event.variant === 'counter'
                    ? {
                        animCls: 'bg-vfx-float-counter',
                        pillCls:
                          'border-2 border-fuchsia-400/95 bg-gradient-to-r from-purple-950/98 via-rose-950/98 to-slate-950/98 text-amber-200 shadow-[0_6px_24px_rgba(168,85,247,0.7),0_2px_6px_rgba(0,0,0,0.95)]',
                        icon: '⚔️',
                        prefix: null,
                        sizeCls: crowdedPopups
                          ? 'text-xs sm:text-sm px-2 py-0.5 rounded-lg uppercase tracking-wider'
                          : 'text-base sm:text-lg px-2.5 py-0.5 rounded-xl uppercase tracking-wider',
                      }
                    : pop.event.variant === 'steal'
                      ? {
                          animCls: 'bg-vfx-float-pop',
                          pillCls:
                            'border-2 border-amber-300/90 bg-amber-950/98 text-amber-200 shadow-[0_6px_18px_rgba(245,158,11,0.55),0_2px_6px_rgba(0,0,0,0.95)]',
                          icon: '🧲',
                          prefix: null,
                          sizeCls: crowdedPopups
                            ? 'text-xs sm:text-sm px-2 py-0.5 rounded-lg uppercase tracking-wider'
                            : 'text-base sm:text-lg px-2.5 py-0.5 rounded-xl uppercase tracking-wider',
                        }
                      : {
                          animCls: 'bg-vfx-float-miss',
                          pillCls:
                            'border-2 border-dashed border-slate-300/90 bg-slate-950/95 text-slate-100 italic shadow-[0_4px_14px_rgba(15,23,42,0.9)]',
                          icon: '💨',
                          prefix: null,
                          sizeCls: crowdedPopups
                            ? 'text-xs sm:text-sm px-2 py-0.5 rounded-full uppercase tracking-widest'
                            : 'text-sm sm:text-base px-2.5 py-0.5 rounded-full uppercase tracking-widest',
                        };
        return (
          <div
            key={pop.uid}
            data-testid="bg-vfx-floating-popup"
            data-variant={pop.event.variant}
            data-sync-group={pop.event.syncGroup ?? 'attack'}
            data-target-player={pop.event.targetPlayerId}
            style={{ left: pop.x, top: pop.y }}
            className={`pointer-events-none absolute z-20 -translate-x-1/2 font-black tracking-tight tabular-nums whitespace-nowrap ${
              vfx.reducedMotion ? '' : meta.animCls
            }`}
          >
            <span
              className={`inline-flex items-center gap-1 border drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)] ${meta.sizeCls} ${meta.pillCls}`}
            >
              <span aria-hidden="true" className={crowdedPopups ? 'text-xs leading-none' : 'text-sm sm:text-base leading-none'}>
                {meta.icon}
              </span>
              {meta.prefix && (
                <span className="text-[10px] font-black tracking-widest text-amber-300 uppercase">
                  {meta.prefix}
                </span>
              )}
              <span>{pop.event.label}</span>
            </span>
          </div>
        );
      })}

      {/* LỚP 4A: XÚC XẮC 3D LĂN -> GIẢM TỐC -> CHỐT ĐÚNG KẾT QUẢ SERVER */}
      {vfx.activeDiceRoll && (
        <div
          data-testid="bg-vfx-dice-overlay"
          data-dice-kind={vfx.activeDiceRoll.diceKind}
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
            className={`pointer-events-none absolute inset-0 flex items-center justify-center p-4 ${
              vfx.activeCutIn ? 'pt-44 sm:pt-52' : ''
            }`}
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

      {/* LỚP 5: CINEMATIC CUT-IN & 5-STAGE ROLE REVEAL SPOTLIGHT OVERLAY */}
      {cutIn && isRoleRevealCutIn && (() => {
        const revealPhase = vfx.reducedMotion ? 'settle' : vfx.revealPhase;
        const isAnticipation = !vfx.reducedMotion && revealPhase === 'anticipation';
        const showPortraitFace = vfx.reducedMotion || revealPhase !== 'anticipation';
        const showFactionIdentity =
          vfx.reducedMotion ||
          revealPhase === 'faction-reveal' ||
          revealPhase === 'impact' ||
          revealPhase === 'settle';
        const showImpactBurst =
          !vfx.reducedMotion &&
          (revealPhase === 'faction-reveal' || revealPhase === 'impact' || revealPhase === 'settle');
        const spotX = revealAnchor ? `${Math.round(revealAnchor.x)}px` : '50%';
        const spotY = revealAnchor ? `${Math.round(revealAnchor.y)}px` : '45%';
        const actorDisplayName = cutIn.subtitle.split(' lật vai ')[0] || 'Người chơi';
        const factionMotifLabel =
          cutIn.faction === 'mist-order'
            ? '🌒 ẤN KÝ HUYẾT NGUYỆT · HỘI BÓNG ĐÊM'
            : cutIn.faction === 'wanderer'
              ? '🧭 NHẬT THỰC ĐỘC HÀNH · KẺ ĐỘC HÀNH'
              : '🔦 ÁNH ĐÈN TUẦN TRA · ĐỘI SĂN ĐÊM';
        const factionMotionAccent =
          cutIn.faction === 'mist-order'
            ? '-skew-x-12 rotate-2'
            : cutIn.faction === 'wanderer'
              ? 'skew-x-6'
              : '-skew-x-6';
        const cardStageTransform = !showPortraitFace
          ? 'rotateY(180deg) rotateZ(-3deg) scale(0.92)'
          : !vfx.reducedMotion &&
              vfx.qualityTier !== 'low' &&
              (revealPhase === 'card-flip' ||
                revealPhase === 'faction-reveal' ||
                revealPhase === 'impact')
            ? 'rotateY(0deg) rotateX(5deg) rotateZ(-1.5deg) scale(1.08)'
            : 'rotateY(0deg) rotateX(0deg) rotateZ(0deg) scale(1.03)';
        const portraitParallaxCls =
          !vfx.reducedMotion && showPortraitFace
            ? revealPhase === 'card-flip'
              ? 'scale-110 translate-y-0.5'
              : 'scale-105 -translate-y-0.5'
            : '';

        return (
          <>
            {/* Darkened theatrical backdrop + vignette + focused spotlight on stage & actor token */}
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
                  `radial-gradient(ellipse 520px 270px at 50% 136px, ${cutInAccent}52 0%, ${cutInSecondary}22 34%, rgba(2,6,23,0.64) 66%, rgba(2,6,23,0.90) 100%)`,
                  `radial-gradient(circle 165px at ${spotX} ${spotY}, ${cutInSecondary}44 0%, ${cutInAccent}24 45%, transparent 76%)`,
                  'radial-gradient(circle at 50% 50%, rgba(2,6,23,0.28) 0%, rgba(2,6,23,0.62) 58%, rgba(2,6,23,0.92) 100%)',
                ].join(', '),
              }}
            />

            <div
              data-testid="bg-vfx-cutin"
              data-banner-type={cutIn.bannerType}
              data-reveal-phase={revealPhase}
              data-faction={cutIn.faction ?? 'unknown'}
              className="pointer-events-none absolute inset-x-0 top-3 sm:top-5 z-30 flex justify-center px-3"
            >
              <div
                className={`relative flex w-full max-w-3xl items-center gap-5 overflow-visible rounded-2xl border-2 bg-slate-950/95 px-5 py-3.5 sm:py-4 shadow-2xl ${blurCls} ${
                  vfx.reducedMotion ? '' : 'bg-vfx-reveal-push'
                }`}
                style={{
                  borderColor:
                    revealPhase === 'faction-reveal' || revealPhase === 'impact'
                      ? cutInSecondary
                      : cutInAccent,
                  boxShadow:
                    revealPhase === 'faction-reveal' || revealPhase === 'impact'
                      ? `0 28px 80px -8px ${cutInAccent}dd, 0 0 44px ${cutInSecondary}77`
                      : `0 22px 60px -10px ${cutInAccent}a6`,
                }}
              >
                {/* Vệt sáng chéo, ấn ký phe & tia flash lướt qua khi mở bài */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
                >
                  <div
                    className={`absolute inset-y-0 -left-14 w-64 ${factionMotionAccent} transition-opacity duration-300 ${
                      isAnticipation
                        ? 'opacity-15'
                        : showFactionIdentity
                          ? 'opacity-45'
                          : 'opacity-28'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${cutInAccent}, ${cutInSecondary}, transparent)`,
                    }}
                  />
                  {cutIn.faction && (
                    <div
                      data-testid="bg-vfx-reveal-faction-sigil"
                      className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${
                        showFactionIdentity ? 'opacity-25 scale-105' : 'opacity-10 scale-95'
                      }`}
                    >
                      <FactionCrestSvg faction={cutIn.faction} size={116} />
                    </div>
                  )}
                  {showPortraitFace && !vfx.reducedMotion && (
                    <div
                      className="bg-vfx-reveal-flash-sweep pointer-events-none absolute inset-y-0 left-0 w-36"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${cutInSecondary}66, transparent)`,
                      }}
                    />
                  )}
                </div>

                {/* Hào quang & sóng xung kích khi sang pha impact */}
                {showImpactBurst && (
                  <>
                    <div
                      aria-hidden="true"
                      className="bg-vfx-reveal-impact-glow pointer-events-none absolute -inset-2.5 rounded-3xl border-2"
                      style={{
                        borderColor: cutInSecondary,
                        boxShadow: `0 0 38px ${cutInAccent}bb`,
                      }}
                    />
                    <div
                      aria-hidden="true"
                      className="bg-vfx-reveal-shockwave pointer-events-none absolute -inset-4 rounded-[28px] border"
                      style={{ borderColor: `${cutInSecondary}cc` }}
                    />
                  </>
                )}

                {/* Thẻ chân dung phóng lớn +20% trồi khung với 3D flip, parallax & hào quang chiều sâu */}
                <div className="relative z-10 shrink-0 -my-1 sm:-my-2">
                  <div
                    data-testid="bg-vfx-reveal-card-halo"
                    aria-hidden="true"
                    className={`pointer-events-none absolute -inset-4 rounded-2xl transition-opacity duration-300 ${
                      isAnticipation ? 'opacity-40' : showImpactBurst ? 'opacity-95' : 'opacity-75'
                    }`}
                    style={{
                      background: `radial-gradient(circle, ${cutInSecondary}66 0%, ${cutInAccent}44 52%, transparent 78%)`,
                    }}
                  />
                  <div
                    data-testid="bg-vfx-reveal-card"
                    className="mn-card-perspective relative w-28 sm:w-[134px] aspect-[2/3]"
                  >
                    <div
                      className="mn-card-flip-stage relative h-full w-full rounded-xl shadow-2xl"
                      style={{
                        transform: cardStageTransform,
                        transitionDuration: vfx.reducedMotion ? '120ms' : '380ms',
                      }}
                    >
                      {/* Mặt trước: Chân dung nhân vật phóng lớn + foil + biểu tượng phe */}
                      <div
                        className="mn-card-face absolute inset-0 overflow-hidden rounded-xl border-2 bg-slate-900 shadow-xl"
                        style={{
                          borderColor: cutInSecondary,
                          boxShadow: `0 20px 44px -8px rgba(2,6,23,0.95), 0 0 32px ${cutInAccent}aa, inset 0 1px 0 rgba(255,255,255,0.35)`,
                        }}
                      >
                        {cutIn.portraitSrc ? (
                          <img
                            src={cutIn.portraitSrc}
                            alt={cutIn.roleName ?? cutIn.title}
                            className={`h-full w-full object-cover object-top transition-transform duration-500 ease-out ${portraitParallaxCls}`}
                          />
                        ) : cutIn.roleId ? (
                          <div className="flex h-full w-full items-center justify-center bg-slate-900">
                            <RolePortraitSvg roleId={cutIn.roleId} faction={cutIn.faction} size={98} />
                          </div>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-900">
                            <FactionCrestSvg faction={cutIn.faction} size={64} />
                          </div>
                        )}
                        {vfx.enableFoil && showPortraitFace && (
                          <div
                            aria-hidden="true"
                            className="mn-foil-sweep pointer-events-none absolute inset-0 opacity-35"
                            style={{
                              backgroundImage:
                                'linear-gradient(115deg, transparent 22%, rgba(255,255,255,0.58) 48%, transparent 74%)',
                            }}
                          />
                        )}
                        <div
                          aria-hidden="true"
                          className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent"
                        />
                        {cutIn.faction && showFactionIdentity && (
                          <div
                            className={`absolute right-1.5 bottom-1.5 rounded-full bg-slate-950/90 p-1.5 border border-white/25 shadow-lg ${
                              vfx.reducedMotion ? '' : 'bg-vfx-faction-crest-pop'
                            }`}
                          >
                            <FactionCrestSvg faction={cutIn.faction} size={24} />
                          </div>
                        )}
                      </div>

                      {/* Mặt lưng bí mật khi anticipation */}
                      <div
                        className="mn-card-face mn-card-face-back absolute inset-0 overflow-hidden rounded-xl border-2 bg-slate-950 shadow-lg"
                        style={{
                          borderColor: cutInAccent,
                          boxShadow: `0 16px 34px -8px rgba(2,6,23,0.95), 0 0 22px ${cutInAccent}88`,
                        }}
                      >
                        <img
                          src={MIDNIGHT_CARD_BACK_ART}
                          alt="Lật vai trò"
                          className="absolute inset-0 h-full w-full object-cover opacity-80"
                        />
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-slate-950/80"
                        />
                        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center p-2 text-center">
                          <FactionCrestSvg faction={cutIn.faction} size={46} />
                          <span className="mt-1.5 text-[10px] font-black uppercase tracking-widest text-amber-200">
                            LỘ DIỆN
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nội dung: nhịp Anticipation hồi hộp -> Lock-in vai trò & bản sắc phe */}
                <div className="relative z-10 min-w-0 flex-1">
                  {isAnticipation ? (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-md px-2.5 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-950 shadow"
                          style={{ backgroundColor: cutInSecondary }}
                        >
                          ⚡ TÍN HIỆU LỘ DIỆN
                        </span>
                      </div>
                      <p className="truncate text-base sm:text-2xl font-black text-white">
                        {actorDisplayName} đang mở ấn ký danh tính...
                      </p>
                      <p className="text-xs sm:text-sm font-semibold text-slate-300">
                        Mặt nạ đêm khuya tại KTX sắp được tháo bỏ
                      </p>
                    </div>
                  ) : (
                    <div className={vfx.reducedMotion ? '' : 'bg-vfx-reveal-text-lock'}>
                      <div className="flex flex-wrap items-center gap-2">
                        <div
                          data-testid="bg-vfx-reveal-crest"
                          className={
                            showFactionIdentity
                              ? vfx.reducedMotion
                                ? 'shrink-0'
                                : 'bg-vfx-faction-crest-pop shrink-0'
                              : 'shrink-0 opacity-35 transition-opacity duration-200'
                          }
                        >
                          <FactionCrestSvg faction={cutIn.faction} size={34} />
                        </div>
                        <span
                          className="rounded-md px-2.5 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-950"
                          style={{ backgroundColor: cutInSecondary }}
                        >
                          {cutIn.title}
                        </span>
                        {showFactionIdentity && (
                          <span
                            className="rounded-md border px-2 py-0.5 text-[10px] sm:text-xs font-extrabold tracking-wide bg-slate-900/80"
                            style={{ borderColor: `${cutInAccent}99`, color: cutInSecondary }}
                          >
                            {factionMotifLabel}
                          </span>
                        )}
                        {cutIn.skillName && showFactionIdentity && (
                          <span className="text-xs sm:text-sm font-black uppercase tracking-wide text-white">
                            ✦ {cutIn.skillName}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 truncate text-lg sm:text-2xl font-black text-white drop-shadow">
                        {cutIn.subtitle}
                      </p>
                      {cutIn.roleName && showFactionIdentity && (
                        <p className="mt-0.5 text-xs sm:text-sm font-extrabold" style={{ color: cutInSecondary }}>
                          {cutIn.roleName}
                          {cutInTheme ? ` · ${cutInTheme.label}` : ''}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* LỚP 5B: PHASE 2 — VICTORY / DEFEAT / SPECTATOR CINEMATIC V2 STAGE (1.5–2.5s) */}
      {cutIn && isVictoryCutIn && (() => {
        const outcome: MatchOutcomeView = cutIn.matchOutcome ?? 'victory';
        const isDefeat = outcome === 'defeat';
        const isSpectatorView = outcome === 'spectator';
        const vicPhase: VictoryCinematicPhase = vfx.reducedMotion ? 'settle' : vfx.victoryPhase;
        const isAnticipation = !vfx.reducedMotion && vicPhase === 'anticipation';
        const showFactionCrest = vfx.reducedMotion || vicPhase !== 'anticipation';
        const showImpactVerdict =
          vfx.reducedMotion || vicPhase === 'impact' || vicPhase === 'settle';
        const showImpactBurst =
          !vfx.reducedMotion && (vicPhase === 'impact' || vicPhase === 'settle');
        const primaryHex = isDefeat ? '#e11d48' : cutInAccent;
        const secondaryHex = isDefeat ? '#94a3b8' : cutInSecondary;
        const factionMotif =
          cutIn.faction === 'mist-order'
            ? '🌒 BÓNG TỐI THỐNG TRỊ KTX · HỘI BÓNG ĐÊM'
            : cutIn.faction === 'wanderer'
              ? '🧭 KẺ ĐỘC HÀNH TOÀN THẮNG · PHE THỨ BA'
              : '🔦 ÁNH ĐÈN PHÁ TAN MÀN ĐÊM · ĐỘI SĂN ĐÊM';
        const factionBeamAccent =
          cutIn.faction === 'mist-order'
            ? '-skew-x-12 rotate-2'
            : cutIn.faction === 'wanderer'
              ? 'skew-x-6'
              : '-skew-x-6';
        const durationStyle = {
          '--bg-victory-duration': `${vfx.victoryDurationMs}ms`,
        } as React.CSSProperties;
        const spotlightBackground = isDefeat
          ? [
              'radial-gradient(ellipse 460px 310px at 50% 48%, rgba(190,18,60,0.3) 0%, rgba(30,41,59,0.55) 42%, rgba(2,6,23,0.88) 76%, rgba(2,6,23,0.96) 100%)',
              'radial-gradient(circle at 50% 50%, transparent 28%, rgba(2,6,23,0.75) 100%)',
            ].join(', ')
          : isSpectatorView
            ? [
                `radial-gradient(ellipse 520px 340px at 50% 48%, ${primaryHex}42 0%, ${secondaryHex}1e 38%, rgba(2,6,23,0.8) 72%, rgba(2,6,23,0.95) 100%)`,
                'radial-gradient(circle at 50% 50%, transparent 32%, rgba(2,6,23,0.68) 100%)',
              ].join(', ')
            : [
                `radial-gradient(ellipse 560px 360px at 50% 48%, ${primaryHex}52 0%, ${secondaryHex}24 36%, rgba(2,6,23,0.78) 70%, rgba(2,6,23,0.95) 100%)`,
                'radial-gradient(circle at 50% 50%, transparent 32%, rgba(2,6,23,0.66) 100%)',
              ].join(', ');
        const winnerDisplayLabel =
          cutIn.winnerFactionLabel ?? cutInTheme?.label ?? 'Kết thúc ván đấu';

        return (
          <>
            {/* Darkened theatrical board backdrop + central spotlight */}
            <div
              data-testid="bg-vfx-victory-spotlight"
              data-victory-phase={vicPhase}
              data-outcome={outcome}
              data-faction={cutIn.faction ?? 'unknown'}
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 z-[29] ${
                vfx.reducedMotion ? '' : 'bg-vfx-victory-vignette'
              }`}
              style={{
                ...durationStyle,
                background: spotlightBackground,
              }}
            />

            <div
              data-testid="bg-vfx-cutin"
              data-banner-type={cutIn.bannerType}
              data-victory-phase={vicPhase}
              data-outcome={outcome}
              data-faction={cutIn.faction ?? 'unknown'}
              className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-4"
            >
              <div
                data-testid="bg-vfx-victory-stage"
                className={`relative flex w-full max-w-xl flex-col items-center overflow-visible rounded-3xl border-2 px-6 py-6 sm:px-8 sm:py-7 text-center shadow-2xl ${blurCls} ${
                  isDefeat ? 'bg-slate-950/95' : 'bg-slate-950/92'
                } ${
                  vfx.reducedMotion
                    ? ''
                    : isDefeat
                      ? 'bg-vfx-defeat-stage-push'
                      : 'bg-vfx-victory-stage-push'
                }`}
                style={{
                  ...durationStyle,
                  borderColor: showImpactVerdict && !isDefeat ? secondaryHex : primaryHex,
                  boxShadow: isDefeat
                    ? '0 26px 76px -12px rgba(2,6,23,0.96), 0 0 36px rgba(190,18,60,0.42)'
                    : showImpactVerdict
                      ? `0 28px 84px -10px ${primaryHex}cc, 0 0 48px ${secondaryHex}66`
                      : `0 24px 66px -12px ${primaryHex}99`,
                }}
              >
                {/* Nền năng lượng phe, watermark ấn ký & flash sweep */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
                >
                  <div
                    className={`absolute inset-y-0 -left-16 w-72 ${factionBeamAccent} transition-opacity duration-300 ${
                      isAnticipation
                        ? 'opacity-15'
                        : isDefeat
                          ? 'opacity-15'
                          : 'opacity-25'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${primaryHex}cc, ${secondaryHex}55, transparent)`,
                    }}
                  />
                  {cutIn.faction && (
                    <div
                      data-testid="bg-vfx-victory-watermark"
                      className={`pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${
                        showFactionCrest
                          ? isDefeat
                            ? 'opacity-10 scale-100'
                            : 'opacity-20 scale-105'
                          : 'opacity-5 scale-90'
                      }`}
                    >
                      <FactionCrestSvg faction={cutIn.faction} size={156} />
                    </div>
                  )}
                  {vfx.enableFoil && showImpactVerdict && !isDefeat && (
                    <div
                      className="mn-foil-sweep pointer-events-none absolute inset-0 opacity-20"
                      style={{
                        backgroundImage:
                          'linear-gradient(115deg, transparent 22%, rgba(255,255,255,0.48) 48%, transparent 74%)',
                      }}
                    />
                  )}
                  {showImpactBurst && !isDefeat && (
                    <div
                      className="bg-vfx-victory-flash-sweep pointer-events-none absolute inset-y-0 left-0 w-44"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${secondaryHex}77, transparent)`,
                      }}
                    />
                  )}
                </div>

                {/* Vòng sóng xung kích khi chạm Impact */}
                {showImpactBurst && (
                  <>
                    <div
                      aria-hidden="true"
                      className="bg-vfx-victory-shockwave pointer-events-none absolute -inset-3 rounded-[28px] border-2"
                      style={{
                        borderColor: isDefeat ? 'rgba(225,29,72,0.55)' : secondaryHex,
                        boxShadow: isDefeat
                          ? '0 0 24px rgba(190,18,60,0.4)'
                          : `0 0 36px ${primaryHex}99`,
                      }}
                    />
                    {!isDefeat && (
                      <div
                        aria-hidden="true"
                        className="bg-vfx-reveal-impact-glow pointer-events-none absolute -inset-5 rounded-[34px] border"
                        style={{ borderColor: `${primaryHex}aa` }}
                      />
                    )}
                  </>
                )}

                {/* Biểu tượng huy hiệu phe chiến thắng trong tâm spotlight */}
                <div className="relative z-10 mb-3 flex items-center justify-center">
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute -inset-5 rounded-full transition-opacity duration-300 ${
                      isAnticipation ? 'opacity-35' : isDefeat ? 'opacity-45' : 'opacity-90'
                    }`}
                    style={{
                      background: `radial-gradient(circle, ${secondaryHex}55 0%, ${primaryHex}33 48%, transparent 76%)`,
                    }}
                  />
                  <div
                    data-testid="bg-vfx-victory-crest"
                    className={`relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full border-2 bg-slate-950/90 shadow-2xl transition-transform duration-300 ${
                      showFactionCrest
                        ? vfx.reducedMotion
                          ? 'scale-100'
                          : 'bg-vfx-victory-crest-reveal'
                        : 'scale-90 opacity-80'
                    }`}
                    style={{
                      borderColor: showFactionCrest ? secondaryHex : `${primaryHex}88`,
                      boxShadow: isDefeat
                        ? '0 12px 34px rgba(2,6,23,0.92), 0 0 22px rgba(225,29,72,0.45)'
                        : `0 16px 40px rgba(2,6,23,0.92), 0 0 32px ${primaryHex}aa`,
                    }}
                  >
                    <FactionCrestSvg faction={cutIn.faction} size={74} />
                  </div>
                </div>

                {/* Nội dung theo 4 giai đoạn: Anticipation -> Faction Reveal -> Impact -> Settle */}
                <div className="relative z-10 w-full space-y-2">
                  {isAnticipation ? (
                    <>
                      <span
                        className="inline-block rounded-full border px-3 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-widest"
                        style={{
                          borderColor: `${primaryHex}99`,
                          backgroundColor: 'rgba(15,23,42,0.88)',
                          color: secondaryHex,
                        }}
                      >
                        {isDefeat
                          ? '🌘 MÀN ĐÊM BUÔNG XUỐNG'
                          : isSpectatorView
                            ? '🎭 HỒI KẾT BÓNG ĐÊM KTX'
                            : '✦ KẾT CỤC ĐÊM KHUYA'}
                      </span>
                      <p className="text-lg sm:text-2xl font-black text-white">
                        {isDefeat
                          ? 'Trận chiến KTX đã đi đến hồi kết...'
                          : isSpectatorView
                            ? 'Phe thắng cuộc đang lộ diện...'
                            : 'Định mệnh KTX đã được định đoạt...'}
                      </p>
                    </>
                  ) : !showImpactVerdict ? (
                    <div className={vfx.reducedMotion ? '' : 'bg-vfx-victory-impact-title'}>
                      <span
                        className="inline-block rounded-full border px-3 py-0.5 text-[10px] sm:text-xs font-extrabold tracking-wider bg-slate-900/85"
                        style={{ borderColor: `${primaryHex}aa`, color: secondaryHex }}
                      >
                        {factionMotif}
                      </span>
                      <p className="mt-2 text-2xl sm:text-3xl font-black text-white drop-shadow">
                        {winnerDisplayLabel}
                      </p>
                      <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-300">
                        {isDefeat
                          ? 'Phe đối phương đã chiếm quyền kiểm soát KTX'
                          : isSpectatorView
                            ? 'Phe làm chủ KTX trong ván đấu này'
                            : 'Ánh sáng chiến thắng đang xác lập...'}
                      </p>
                    </div>
                  ) : (
                    <div className={vfx.reducedMotion ? '' : 'bg-vfx-victory-impact-title'}>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <span
                          className="rounded-md px-2.5 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-widest"
                          style={{
                            backgroundColor: isDefeat ? 'rgba(190,18,60,0.32)' : secondaryHex,
                            color: isDefeat ? '#fecdd3' : '#020617',
                            border: isDefeat ? '1px solid rgba(251,113,133,0.55)' : 'none',
                          }}
                        >
                          {isDefeat
                            ? '🌘 PHỤC THÙ VÁN SAU'
                            : isSpectatorView
                              ? '👁️ GÓC NHÌN KHÁN GIẢ'
                              : '✦ VINH QUANG BÓNG ĐÊM KTX'}
                        </span>
                        <span
                          className="rounded-md border px-2 py-0.5 text-[10px] sm:text-xs font-extrabold tracking-wide bg-slate-900/85"
                          style={{ borderColor: `${primaryHex}99`, color: secondaryHex }}
                        >
                          {factionMotif}
                        </span>
                      </div>
                      <h2
                        data-testid="bg-vfx-victory-title"
                        className={`mt-2.5 text-2xl sm:text-4xl font-black tracking-tight whitespace-nowrap ${
                          isDefeat
                            ? 'text-rose-200'
                            : isSpectatorView
                              ? 'text-slate-100'
                              : 'text-amber-100'
                        }`}
                        style={{
                          textShadow: isDefeat
                            ? '0 4px 20px rgba(190,18,60,0.65)'
                            : `0 4px 26px ${primaryHex}cc`,
                        }}
                      >
                        {isDefeat
                          ? '⚔️ THẤT BẠI'
                          : isSpectatorView
                            ? '🎭 KẾT THÚC VÁN ĐẤU'
                            : '👑 CHIẾN THẮNG'}
                      </h2>
                      <p
                        className="mt-1.5 text-base sm:text-xl font-extrabold"
                        style={{ color: isDefeat ? '#fda4af' : secondaryHex }}
                      >
                        🏆 {winnerDisplayLabel}
                      </p>
                      {cutIn.winReason && (
                        <p className="mt-1 text-xs sm:text-sm font-medium text-slate-300">
                          {cutIn.winReason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* LỚP 5C: PHASE 4 — OPENING & SECRET ROLE DEAL CINEMATIC (2.5–4.0s, 4 NHỊP) */}
      {cutIn && isOpeningDealCutIn && (() => {
        const isSpectatorOpening = Boolean(cutIn.openingIsSpectator || !cutIn.roleId);
        const opPhase: OpeningDealPhase = vfx.openingPhase;
        const cardFlipped = !isSpectatorOpening && (vfx.reducedMotion || vfx.openingCardFlipped);
        const playerCount = Math.max(4, Math.min(8, cutIn.openingPlayerCount ?? publicGame.players.length ?? 4));
        const isBackToBoard = opPhase === 'back-to-board';
        const personalTheme = !isSpectatorOpening && cutIn.faction ? MIDNIGHT_FACTION_TOKENS[cutIn.faction] : null;
        const personalPrimary = personalTheme?.primaryHex ?? '#f59e0b';
        const personalSecondary = personalTheme?.secondaryHex ?? '#fde68a';
        const dealCards = Array.from({ length: playerCount }, (_, idx) => {
          const t = playerCount > 1 ? idx / (playerCount - 1) - 0.5 : 0;
          // Quạt rộng tách hẳn khỏi chồng bài phía trên để cả 4–8 lá bài úp đều đọc rõ 100%
          const dx = Math.round(t * (playerCount >= 7 ? 560 : 420));
          const dy = Math.round(74 + Math.abs(t) * 26);
          const rot = Math.round(t * 22);
          return { idx, dx, dy, rot, delayMs: idx * 45 };
        });

        return (
          <div
            data-testid="bg-vfx-opening-stage"
            data-opening-phase={opPhase}
            data-opening-card-flipped={String(cardFlipped)}
            data-spectator={String(isSpectatorOpening)}
            className="pointer-events-none absolute inset-0 z-[32]"
          >
            {/* Màn đêm Midnight Noir + vignette (không dùng full-screen backdrop-blur để giữ FPS mượt trên mọi GPU) */}
            <div
              data-testid="bg-vfx-opening-backdrop"
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out ${
                isBackToBoard ? 'opacity-0' : 'opacity-100'
              }`}
              style={{
                background:
                  opPhase === 'personal-reveal' && cardFlipped
                    ? [
                        `radial-gradient(ellipse 580px 400px at 50% 48%, ${personalPrimary}30 0%, ${personalSecondary}14 30%, rgba(2,6,23,0.95) 68%, rgba(2,6,23,0.98) 100%)`,
                        'radial-gradient(circle at 50% 50%, rgba(2,6,23,0.18) 0%, rgba(2,6,23,0.82) 100%)',
                      ].join(', ')
                    : [
                        'radial-gradient(ellipse 600px 380px at 50% 48%, rgba(56,189,248,0.14) 0%, rgba(251,191,36,0.09) 26%, rgba(2,6,23,0.95) 66%, rgba(2,6,23,0.98) 100%)',
                        'radial-gradient(circle at 50% 50%, rgba(2,6,23,0.22) 0%, rgba(2,6,23,0.84) 100%)',
                      ].join(', '),
              }}
            />

            {/* NHỊP 1: GAME START STINGER ("ĐÊM XUỐNG TẠI KTX…" / "VÁN ĐẤU BẮT ĐẦU") */}
            {opPhase === 'start-stinger' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                <div
                  className={`relative flex w-full max-w-2xl flex-col items-center rounded-3xl border border-amber-400/45 bg-slate-950/92 px-6 py-8 sm:px-10 sm:py-10 text-center shadow-2xl ${blurCls} ${
                    vfx.reducedMotion ? '' : 'bg-vfx-opening-stinger-enter'
                  }`}
                  style={{
                    boxShadow: '0 30px 90px -12px rgba(2,6,23,0.98), 0 0 54px rgba(251,191,36,0.22)',
                  }}
                >
                  {/* Huy hiệu trăng đêm trung tính phe */}
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-amber-300/60 bg-slate-900/95 shadow-lg">
                    <svg viewBox="0 0 48 48" className="h-9 w-9" aria-hidden="true">
                      <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(251,191,36,0.45)" strokeWidth="1.5" strokeDasharray="3 3" />
                      <path
                        d="M29.5 13.2a11.5 11.5 0 1 0 5.3 20.6A10 10 0 0 1 29.5 13.2Z"
                        fill="#fde68a"
                      />
                      <circle cx="32" cy="17" r="1.8" fill="#7dd3fc" />
                    </svg>
                  </div>

                  <span className="rounded-full border border-amber-400/50 bg-amber-950/60 px-3.5 py-0.5 text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">
                    🌙 BÓNG ĐÊM KTX · KHAI CUỘC
                  </span>

                  <h2
                    data-testid="bg-vfx-opening-title"
                    className="mt-3.5 text-2xl sm:text-4xl font-black tracking-wide text-white"
                    style={{ textShadow: '0 4px 28px rgba(251,191,36,0.45)' }}
                  >
                    {cutIn.title}
                  </h2>

                  {/* Đường quét ánh sáng ngang kiểu Anime Noir */}
                  <div className="relative my-4 h-[2px] w-56 sm:w-72 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full w-full bg-gradient-to-r from-transparent via-amber-300 to-transparent ${
                        vfx.reducedMotion ? '' : 'bg-vfx-opening-scanline'
                      }`}
                    />
                  </div>

                  <p className="text-xs sm:text-sm font-bold text-slate-200">
                    Ván đấu bắt đầu · <span className="text-amber-300">{playerCount} sinh viên</span> bước vào màn đêm KTX
                  </p>
                </div>
              </div>
            )}

            {/* NHỊP 2: SHUFFLE / DEAL ROLES (BÀI ÚP 100% TRUNG TÍNH — KHÔNG LỘ BẤT KỲ PHE NÀO) */}
            {opPhase === 'shuffle-deal' && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4">
                <div className="relative flex h-72 sm:h-80 w-full max-w-3xl items-center justify-center">
                  {/* Chồng bài úp ở phía trên tâm xáo gọn */}
                  <div
                    className={`relative z-20 h-32 w-24 sm:h-36 sm:w-28 rounded-xl border-2 border-amber-300/80 bg-slate-950 shadow-2xl overflow-hidden ${
                      vfx.reducedMotion ? '-translate-y-12' : 'bg-vfx-opening-deal-deck'
                    }`}
                    style={{ boxShadow: '0 18px 46px rgba(2,6,23,0.95), 0 0 28px rgba(251,191,36,0.28)' }}
                  >
                    <img
                      src={MIDNIGHT_CARD_BACK_ART}
                      alt="Chồng hồ sơ vai bí mật"
                      className="h-full w-full object-cover opacity-90"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/55"
                    />
                    <div className="absolute inset-x-1.5 bottom-2 rounded-md border border-amber-300/40 bg-slate-950/88 py-1 text-center text-[9px] font-black uppercase tracking-widest text-amber-200">
                      HỒ SƠ KÍN
                    </div>
                  </div>

                  {/* Các lá bài úp bay tỏa thành quạt rộng phía dưới chồng bài (hoàn toàn úp mặt lưng) */}
                  {dealCards.map((c) => (
                    <div
                      key={c.idx}
                      data-testid="bg-vfx-opening-dealt-card"
                      className={`absolute z-10 h-32 w-[88px] sm:h-36 sm:w-[98px] overflow-hidden rounded-xl border border-amber-300/70 bg-slate-950 shadow-xl ${
                        vfx.reducedMotion ? '' : 'bg-vfx-opening-deal-card'
                      }`}
                      style={
                        {
                          '--deal-x': `${c.dx}px`,
                          '--deal-y': `${c.dy}px`,
                          '--deal-rot': `${c.rot}deg`,
                          '--deal-delay': `${c.delayMs}ms`,
                          boxShadow: '0 14px 32px rgba(2,6,23,0.92), 0 0 16px rgba(56,189,248,0.26)',
                        } as React.CSSProperties
                      }
                    >
                      <img
                        src={MIDNIGHT_CARD_BACK_ART}
                        alt="Thẻ vai niêm phong"
                        className="h-full w-full object-cover opacity-92"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-slate-950/88 via-transparent to-slate-950/45"
                      />
                      <div className="absolute inset-x-1 bottom-1.5 text-center text-[9px] font-extrabold uppercase tracking-wider text-slate-100">
                        Ghế #{c.idx + 1}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  data-testid="bg-vfx-opening-deal-caption"
                  className={`mt-4 rounded-2xl border border-slate-700/90 bg-slate-950/94 px-5 py-2.5 text-center shadow-xl ${blurCls}`}
                >
                  <p className="text-xs sm:text-sm font-black uppercase tracking-[0.18em] text-amber-200">
                    🃏 ĐANG XÁO &amp; CHIA VAI BÍ MẬT…
                  </p>
                  <p className="mt-0.5 text-[11px] sm:text-xs font-semibold text-slate-300">
                    Mỗi sinh viên nhận 1 lá bài úp niêm phong riêng biệt
                  </p>
                </div>
              </div>
            )}

            {/* NHỊP 3: PERSONAL SECRET ROLE REVEAL (CHỈ NGƯỜI CHƠI HIỆN TẠI) HOẶC NIÊM PHONG KHÁN GIẢ */}
            {opPhase === 'personal-reveal' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                {!isSpectatorOpening && cutIn.roleId ? (
                  <div
                    className={`relative flex w-full max-w-2xl flex-col sm:flex-row items-center gap-5 sm:gap-7 rounded-3xl border-2 bg-slate-950/95 px-6 py-6 sm:px-8 sm:py-7 shadow-2xl ${blurCls} ${
                      vfx.reducedMotion ? '' : 'bg-vfx-opening-secret-enter'
                    }`}
                    style={{
                      borderColor: cardFlipped ? personalSecondary : 'rgba(251,191,36,0.65)',
                      boxShadow: cardFlipped
                        ? `0 28px 86px -10px ${personalPrimary}cc, 0 0 46px ${personalSecondary}55`
                        : '0 26px 76px -12px rgba(2,6,23,0.96), 0 0 38px rgba(251,191,36,0.28)',
                    }}
                  >
                    {/* Thẻ bài 3D vai bí mật nổi bật trên nền tối */}
                    <div className="relative shrink-0">
                      <div
                        aria-hidden="true"
                        className={`pointer-events-none absolute -inset-5 rounded-3xl ${
                          vfx.reducedMotion ? 'opacity-65' : 'bg-vfx-opening-secret-halo'
                        }`}
                        style={{
                          background: cardFlipped
                            ? `radial-gradient(circle, ${personalSecondary}66 0%, ${personalPrimary}38 52%, transparent 78%)`
                            : 'radial-gradient(circle, rgba(251,191,36,0.44) 0%, rgba(56,189,248,0.18) 54%, transparent 78%)',
                        }}
                      />
                      <div
                        data-testid="bg-vfx-opening-secret-card"
                        className="mn-card-perspective relative w-36 sm:w-44 aspect-[2/3]"
                      >
                        <div
                          className="mn-card-flip-stage relative h-full w-full rounded-2xl shadow-2xl"
                          style={{
                            transform: cardFlipped
                              ? 'rotateY(0deg) scale(1.03)'
                              : 'rotateY(180deg) rotateZ(-2deg) scale(0.95)',
                            transitionDuration: vfx.reducedMotion ? '120ms' : '420ms',
                          }}
                        >
                          {/* Mặt trước: Chân dung vai bí mật của CHÍNH NGƯỜI CHƠI */}
                          <div
                            className="mn-card-face absolute inset-0 overflow-hidden rounded-2xl border-2 bg-slate-900 shadow-2xl"
                            style={{
                              borderColor: personalSecondary,
                              boxShadow: `0 20px 48px rgba(2,6,23,0.95), 0 0 32px ${personalPrimary}99`,
                            }}
                          >
                            {cutIn.portraitSrc ? (
                              <img
                                src={cutIn.portraitSrc}
                                alt={cutIn.roleName ?? 'Vai bí mật của bạn'}
                                className="h-full w-full object-cover object-top"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-slate-900">
                                <RolePortraitSvg roleId={cutIn.roleId} faction={cutIn.faction} size={118} />
                              </div>
                            )}
                            {vfx.enableFoil && cardFlipped && (
                              <div
                                aria-hidden="true"
                                className="mn-foil-sweep pointer-events-none absolute inset-0 opacity-35"
                                style={{
                                  backgroundImage:
                                    'linear-gradient(115deg, transparent 22%, rgba(255,255,255,0.58) 48%, transparent 74%)',
                                }}
                              />
                            )}
                            <div
                              aria-hidden="true"
                              className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent"
                            />
                            {cutIn.openingSecretMaxHp && (
                              <span className="absolute top-2 right-2 rounded-full border border-white/25 bg-slate-950/90 px-2 py-0.5 text-[10px] font-black text-rose-200 shadow">
                                ♥ {cutIn.openingSecretMaxHp} HP
                              </span>
                            )}
                            {cutIn.faction && (
                              <div className="absolute right-2 bottom-2 rounded-full border border-white/25 bg-slate-950/90 p-1.5 shadow-lg">
                                <FactionCrestSvg faction={cutIn.faction} size={24} />
                              </div>
                            )}
                          </div>

                          {/* Mặt lưng niêm phong khi Anticipation */}
                          <div className="mn-card-face mn-card-face-back absolute inset-0 overflow-hidden rounded-2xl border-2 border-amber-300/80 bg-slate-950 shadow-xl">
                            <img
                              src={MIDNIGHT_CARD_BACK_ART}
                              alt="Hồ sơ bí mật niêm phong"
                              className="absolute inset-0 h-full w-full object-cover opacity-85"
                            />
                            <div
                              aria-hidden="true"
                              className="absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-950/35 to-slate-950/80"
                            />
                            <div className="relative z-10 flex h-full w-full flex-col items-center justify-center p-3 text-center">
                              <span className="text-2xl">🔒</span>
                              <span className="mt-1.5 rounded bg-slate-950/85 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-200">
                                NIÊM PHONG
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hồ sơ danh tính riêng tư */}
                    <div className="relative z-10 min-w-0 flex-1 text-center sm:text-left">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <span className="rounded-full border border-amber-400/65 bg-amber-950/75 px-3 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-200">
                          🔒 VAI BÍ MẬT CỦA BẠN
                        </span>
                        {cardFlipped && personalTheme && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] sm:text-xs font-extrabold bg-slate-900/90"
                            style={{ borderColor: `${personalPrimary}aa`, color: personalSecondary }}
                          >
                            <FactionCrestSvg faction={cutIn.faction} size={15} />
                            <span>{personalTheme.label}</span>
                          </span>
                        )}
                      </div>

                      {!cardFlipped ? (
                        <div className="mt-3 space-y-1.5">
                          <p className="text-xl sm:text-2xl font-black text-white">
                            Đang mở niêm phong hồ sơ…
                          </p>
                          <p className="text-xs sm:text-sm font-semibold text-slate-300">
                            Hãy chuẩn bị giữ kín danh tính của bạn trong đêm nay
                          </p>
                        </div>
                      ) : (
                        <div className={`mt-2.5 space-y-2 ${vfx.reducedMotion ? '' : 'bg-vfx-reveal-text-lock'}`}>
                          <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight drop-shadow">
                            {cutIn.roleName}
                          </h3>
                          {cutIn.skillName && (
                            <p className="text-xs sm:text-sm font-extrabold" style={{ color: personalSecondary }}>
                              ✦ Kỹ năng: {cutIn.skillName}
                            </p>
                          )}
                          {cutIn.openingSecretGoalHint && (
                            <p className="rounded-xl border border-slate-700/80 bg-slate-900/85 px-3 py-2 text-xs font-medium text-slate-200 leading-relaxed">
                              {cutIn.openingSecretGoalHint}
                            </p>
                          )}
                        </div>
                      )}

                      <p
                        data-testid="bg-vfx-opening-privacy-subtitle"
                        className="mt-3 text-[11px] sm:text-xs font-bold text-amber-200/90"
                      >
                        🤫 Hãy giữ bí mật · Chỉ hiển thị riêng trên thiết bị của bạn
                      </p>
                    </div>
                  </div>
                ) : (
                  /* CHẾ ĐỘ KHÁN GIẢ: TUYỆT ĐỐI KHÔNG RENDER THẺ VAI, CHÂN DUNG, TÊN VAI HAY PHE */
                  <div
                    data-testid="bg-vfx-opening-spectator-notice"
                    className={`relative flex w-full max-w-lg flex-col items-center rounded-3xl border border-sky-400/55 bg-slate-950/94 px-6 py-7 text-center shadow-2xl ${blurCls} ${
                      vfx.reducedMotion ? '' : 'bg-vfx-opening-secret-enter'
                    }`}
                    style={{
                      boxShadow: '0 26px 76px -10px rgba(2,6,23,0.96), 0 0 36px rgba(56,189,248,0.24)',
                    }}
                  >
                    <div className="relative mb-4 flex h-28 w-36 items-center justify-center">
                      <div className="absolute -translate-x-5 -rotate-6 h-24 w-16 overflow-hidden rounded-xl border border-slate-600/80 bg-slate-900 shadow-lg">
                        <img src={MIDNIGHT_CARD_BACK_ART} alt="Thẻ vai niêm phong" className="h-full w-full object-cover opacity-85" />
                      </div>
                      <div className="absolute translate-x-5 rotate-6 h-24 w-16 overflow-hidden rounded-xl border border-sky-400/60 bg-slate-900 shadow-lg">
                        <img src={MIDNIGHT_CARD_BACK_ART} alt="Thẻ vai niêm phong" className="h-full w-full object-cover opacity-90" />
                      </div>
                      <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-sky-300/70 bg-slate-950/95 text-lg shadow-lg">
                        👁️
                      </div>
                    </div>

                    <span className="rounded-full border border-sky-400/55 bg-sky-950/75 px-3 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-sky-200">
                      👁️ CHẾ ĐỘ KHÁN GIẢ · BẢO MẬT VAI
                    </span>
                    <h3 className="mt-3 text-xl sm:text-2xl font-black text-white">
                      Các vai bí mật đã được chia kín
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-300">
                      Danh tính nhân vật chỉ hiển thị riêng cho từng người chơi. Bàn đấu chuẩn bị khai cuộc!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* NHỊP 4: BACK TO BOARD / FIRST TURN READY (BÀN CHƠI SÁNG RÕ + HIGHLIGHT NGƯỜI ĐI TRƯỚC) */}
            {opPhase === 'back-to-board' && (
              <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-3">
                <div
                  data-testid="bg-vfx-opening-ready-banner"
                  className={`flex items-center gap-3 rounded-2xl border-2 border-amber-400/80 bg-slate-950/95 px-4 py-2.5 shadow-2xl ${blurCls} ${
                    vfx.reducedMotion ? '' : 'bg-vfx-opening-ready-enter'
                  }`}
                  style={{
                    boxShadow: '0 18px 46px -8px rgba(2,6,23,0.95), 0 0 28px rgba(251,191,36,0.34)',
                  }}
                >
                  <span className="rounded-lg bg-amber-400 px-2.5 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-950">
                    {cutIn.openingIsSelfFirstTurn && !isSpectatorOpening
                      ? '⚡ LƯỢT ĐẦU · BẠN ĐI TRƯỚC'
                      : '⚡ LƯỢT ĐẦU TIÊN'}
                  </span>
                  <p className="text-xs sm:text-sm font-extrabold text-white">
                    {cutIn.openingIsSelfFirstTurn && !isSpectatorOpening
                      ? 'Bàn đấu đã sẵn sàng — hãy tung xúc xắc 1d6 + 1d4!'
                      : `${cutIn.openingFirstPlayerName ?? 'Người chơi 1'} bắt đầu lượt tung xúc xắc đầu tiên!`}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {cutIn && !isRoleRevealCutIn && !isVictoryCutIn && !isOpeningDealCutIn && (
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
