'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/MidnightCardZoomModal.tsx
// Hộp thoại Phóng Lớn & Lật Soi 2 Mặt cho Thẻ Nhân Vật và Thẻ Bài Chức Năng.
// Giữ chặt bất biến bảo mật P0: chỉ cho lật sang mặt trước nếu người xem hợp lệ.
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from 'react';
import { getCardById } from '../domain/cards';
import { getRoleDesign } from '../domain/roles';
import type { BoardGameRoleId } from '@/shared/contracts/boardgame';
import {
  MIDNIGHT_DECK_TOKENS,
  MIDNIGHT_FACTION_TOKENS,
  resolveActionCardPresentation,
  resolveRoleCardPresentation,
  type ActionCardZone,
  type RoleViewerMode,
} from './midnight-noir-tokens';
import { MidnightActionCard } from './MidnightActionCard';
import { MidnightCharacterCard } from './MidnightCharacterCard';

export type MidnightZoomTarget =
  | {
      kind: 'role';
      roleId: BoardGameRoleId;
      revealed: boolean;
      viewerMode: RoleViewerMode;
      woundsTaken: number;
      currentHp?: number;
    }
  | {
      kind: 'card';
      cardId: string;
      zone: ActionCardZone;
      isParticipantInInvestigation?: boolean;
    };

export interface MidnightCardZoomModalProps {
  target: MidnightZoomTarget | null;
  reducedMotion?: boolean;
  foilEnabled?: boolean;
  enableBackdropBlur?: boolean;
  onClose: () => void;
}

export const MidnightCardZoomModal = React.memo(function MidnightCardZoomModal({
  target,
  reducedMotion = false,
  foilEnabled = true,
  enableBackdropBlur = true,
  onClose,
}: MidnightCardZoomModalProps) {
  const [previewBack, setPreviewBack] = useState(false);

  useEffect(() => {
    setPreviewBack(false);
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [target, onClose]);

  if (!target) return null;

  const isRole = target.kind === 'role';
  const rolePres = isRole
    ? resolveRoleCardPresentation({
        roleId: target.roleId,
        revealed: target.revealed,
        viewerMode: target.viewerMode,
        woundsTaken: target.woundsTaken,
        currentHp: target.currentHp,
      })
    : null;
  const cardPres = !isRole
    ? resolveActionCardPresentation({
        cardId: target.cardId,
        zone: target.zone,
        isParticipantInInvestigation: target.isParticipantInInvestigation,
      })
    : null;

  const canInspectFront = isRole ? Boolean(rolePres?.showFront) : Boolean(cardPres?.showFront);
  const roleDesign = isRole && rolePres?.showFront ? getRoleDesign(target.roleId) : null;
  const factionToken =
    isRole && rolePres?.showFront && rolePres.faction
      ? MIDNIGHT_FACTION_TOKENS[rolePres.faction]
      : null;

  const fullCard = !isRole && cardPres?.showFront ? getCardById(target.cardId) : null;
  const deckToken = !isRole && cardPres ? MIDNIGHT_DECK_TOKENS[cardPres.deck] : null;

  return (
    <div
      data-testid="bg-card-zoom-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Phóng lớn chi tiết thẻ bài"
      onClick={onClose}
      className={`fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-3 sm:p-6 ${enableBackdropBlur ? 'bg-slate-950/85 backdrop-blur-md' : 'bg-slate-950/95'}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-4xl flex-col lg:flex-row items-center lg:items-stretch gap-5 rounded-3xl border border-amber-400/35 bg-slate-900/95 p-4 sm:p-6 shadow-[0_32px_90px_rgba(0,0,0,0.85)]"
      >
        <button
          type="button"
          data-testid="bg-card-zoom-close-btn"
          onClick={onClose}
          aria-label="Đóng xem phóng lớn"
          className="absolute right-3.5 top-3.5 z-20 flex h-9 min-w-[36px] items-center justify-center rounded-xl border border-slate-600 bg-slate-800/95 px-2.5 text-xs font-black text-slate-100 hover:bg-slate-700 transition cursor-pointer"
        >
          ✕ Đóng
        </button>

        {/* KHUNG THẺ 2:3 PHÓNG LỚN */}
        <div className="w-full max-w-[310px] sm:max-w-[350px] shrink-0 space-y-3">
          {target.kind === 'role' ? (
            <MidnightCharacterCard
              testId="bg-zoom-card-surface"
              roleId={target.roleId}
              revealed={previewBack ? false : target.revealed}
              viewerMode={previewBack || !canInspectFront ? 'owner-facedown' : target.viewerMode}
              woundsTaken={target.woundsTaken}
              currentHp={target.currentHp}
              priority
              foilEnabled={foilEnabled}
              reducedMotion={reducedMotion}
              onFlipToggle={canInspectFront ? () => setPreviewBack((v) => !v) : undefined}
            />
          ) : (
            <MidnightActionCard
              testId="bg-zoom-card-surface"
              cardId={target.cardId}
              zone={previewBack || !canInspectFront ? 'draw-pile' : target.zone}
              isParticipantInInvestigation={target.isParticipantInInvestigation}
              priority
              foilEnabled={foilEnabled}
              reducedMotion={reducedMotion}
              onFlipToggle={canInspectFront ? () => setPreviewBack((v) => !v) : undefined}
            />
          )}

          <div className="flex items-center justify-center">
            <button
              type="button"
              data-testid="bg-card-zoom-flip-btn"
              disabled={!canInspectFront}
              onClick={() => canInspectFront && setPreviewBack((v) => !v)}
              className="w-full rounded-xl border border-amber-400/45 bg-slate-950/90 px-4 py-2 text-xs font-black text-amber-200 hover:bg-slate-800 disabled:opacity-55 disabled:cursor-not-allowed transition cursor-pointer"
            >
              {!canInspectFront
                ? '🔒 Đang bảo mật theo luật — không thể lật mặt trước'
                : previewBack
                  ? '🔄 Lật xem mặt trước'
                  : '🔄 Lật xem mặt lưng Ấn Ký'}
            </button>
          </div>
        </div>

        {/* BẢNG THÔNG TIN ĐẦY ĐỦ BÊN PHẢI */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-4 pt-2 lg:pt-6">
          {!canInspectFront ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-950/85 p-5 space-y-2.5">
              <p className="text-xs font-black uppercase tracking-wider text-amber-300">
                🛡️ Bảo vệ bí mật Shadow Hunters (P0)
              </p>
              <h3 className="text-xl font-black text-white">
                {isRole ? 'Thẻ Nhân Vật Đang Úp' : cardPres?.backLabel ?? 'Thẻ Đang Úp Bảo Mật'}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {isRole
                  ? rolePres?.privacyReason
                  : 'Nội dung thẻ chỉ hiển thị với người được phép xem (khi rút mở công khai hoặc 2 người tham gia Thẻ Điều Tra Kín).'}
              </p>
            </div>
          ) : isRole && roleDesign && factionToken && rolePres ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 pr-16">
                <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${factionToken.badgeClass}`}>
                  {factionToken.label}
                </span>
                <span className="rounded-lg border border-white/15 bg-slate-950 px-2.5 py-1 text-xs font-black text-white">
                  ❤️ Sinh lực: {rolePres.hp}/{rolePres.maxHp} ({rolePres.publicWoundsTaken} vết)
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white">{roleDesign.name}</h3>
                <p className="text-xs font-semibold text-slate-400">{roleDesign.title}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 space-y-2">
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: factionToken.secondaryHex }}>
                  ✦ Kỹ năng: {roleDesign.skillName}
                </p>
                <p className="text-sm leading-relaxed text-slate-100">{roleDesign.skillSummary}</p>
              </div>

              <div className="rounded-2xl border border-amber-400/25 bg-amber-950/20 p-4 space-y-1.5">
                <p className="text-xs font-black uppercase tracking-wider text-amber-300">
                  🎯 Điều kiện chiến thắng
                </p>
                <p className="text-sm leading-relaxed text-amber-100">{roleDesign.secretGoalText}</p>
              </div>
            </div>
          ) : fullCard && deckToken && cardPres ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 pr-16">
                <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${deckToken.badgeClass}`}>
                  {deckToken.label}
                </span>
                <span className="rounded-lg border border-white/15 bg-slate-950 px-2.5 py-1 text-xs font-black text-amber-200">
                  {cardPres.statBadge ?? deckToken.statLabel}
                </span>
                <span className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-bold text-slate-300">
                  {fullCard.copies} bản sao trong bộ 48 lá
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white">{fullCard.title}</h3>
                <p className="text-xs font-semibold text-slate-400">{deckToken.subtitle}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/85 p-4 space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-cyan-300">
                  📜 Hiệu ứng & Luật gốc
                </p>
                <p className="text-sm leading-relaxed text-slate-100">{fullCard.summary}</p>
                {fullCard.conditionText && (
                  <p className="pt-2 border-t border-white/10 text-xs font-bold text-emerald-300">
                    🔍 Điều kiện kích hoạt: {fullCard.conditionText}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2.5 text-xs text-slate-300 flex items-center justify-between gap-2">
                <span>Trạng thái hiển thị: <strong className="text-white">{cardPres.visibilityBadge}</strong></span>
                <span className="font-mono text-slate-400">{fullCard.id.toUpperCase()}</span>
              </div>
            </div>
          ) : null}

          <p className="text-[11px] text-slate-400">
            Mẹo: Di chuyển con trỏ trên mặt thẻ để xem hiệu ứng nghiêng 3D &amp; ánh kim Foil Shimmer, hoặc nhấn ESC để đóng.
          </p>
        </div>
      </div>
    </div>
  );
});
export default MidnightCardZoomModal;
