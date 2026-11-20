'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/MidnightCharacterCard.tsx
// Template Thẻ Nhân Vật Full-Art tỷ lệ 2:3 phong cách HUSTVerse Midnight — Anime Noir.
// Giữ chặt bất biến bảo mật: chỉ hiển thị thông tin & chân dung khi được phép
// (`revealed === true` hoặc chính chủ đang soi vai `owner-peek`).
// ---------------------------------------------------------------------------

import React from 'react';
import type { BoardGameRoleId } from '@/shared/contracts/boardgame';
import {
  FactionCrestSvg,
  MidnightOrnamentFrameSvg,
  ROLE_VISUAL_META,
  RolePortraitSvg,
} from './BoardGameArt';
import {
  MIDNIGHT_FACTION_TOKENS,
  resolveRoleCardPresentation,
  type RoleViewerMode,
} from './midnight-noir-tokens';
import { MidnightTiltContainer } from './MidnightTiltContainer';

export interface MidnightCharacterCardProps {
  roleId: BoardGameRoleId;
  revealed: boolean;
  viewerMode: RoleViewerMode;
  woundsTaken?: number;
  currentHp?: number;
  foilEnabled?: boolean;
  priority?: boolean;
  reducedMotion?: boolean;
  onFlipToggle?: () => void;
  onZoom?: () => void;
  showGoalFooter?: boolean;
  className?: string;
  testId?: string;
}

export const MidnightCharacterCard = React.memo(function MidnightCharacterCard({
  roleId,
  revealed,
  viewerMode,
  woundsTaken = 0,
  currentHp,
  foilEnabled = true,
  priority = false,
  reducedMotion = false,
  onFlipToggle,
  onZoom,
  showGoalFooter = true,
  className = '',
  testId,
}: MidnightCharacterCardProps) {
  const presentation = resolveRoleCardPresentation({
    viewerMode,
    revealed,
    roleId,
    woundsTaken,
    currentHp,
  });

  const [imgError, setImgError] = React.useState(false);
  React.useEffect(() => {
    setImgError(false);
  }, [presentation.portraitSrc]);

  // Nếu không được phép xem mặt trước, truyền palette trung tính ẩn danh để không rò màu phe lên khung!
  const factionToken =
    presentation.showFront && presentation.faction
      ? MIDNIGHT_FACTION_TOKENS[presentation.faction]
      : null;

  const frontFrameCss =
    factionToken?.frameGradientCss ??
    'linear-gradient(135deg, #475569 0%, #1e293b 50%, #64748b 100%)';
  const foilCss =
    factionToken?.foilGradientCss ??
    'linear-gradient(115deg, transparent 20%, rgba(148, 163, 184, 0.28) 50%, transparent 80%)';

  const visualMeta =
    presentation.showFront && presentation.roleId
      ? ROLE_VISUAL_META[presentation.roleId]
      : null;

  const hpVal = presentation.hp ?? 0;
  const maxHpVal = presentation.maxHp ?? 10;
  const hpRatio = maxHpVal > 0 ? hpVal / maxHpVal : 0;
  const isCritical = presentation.publicWoundsTaken > 0 && hpRatio <= 0.35;

  const frontFace =
    presentation.showFront && factionToken && presentation.roleId ? (
      <div
        className="relative flex h-full w-full flex-col justify-between overflow-hidden"
        style={{ background: factionToken.surfaceGradientCss }}
      >
        {/* Artwork AI Full-Bleed 2:3 hoặc Fallback Noir Monogram khi tải lỗi */}
        {presentation.portraitSrc && !imgError ? (
          <img
            src={presentation.portraitSrc}
            alt={presentation.roleName ?? 'Nhân vật Bóng Đêm KTX'}
            width={720}
            height={1080}
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
            onError={() => setImgError(true)}
            className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
            draggable={false}
          />
        ) : (
          <div
            data-portrait-fallback={imgError ? 'true' : 'false'}
            className="absolute inset-0 flex flex-col items-center justify-center pb-20"
          >
            <div
              className="rounded-3xl p-4 shadow-2xl"
              style={{
                background: 'rgba(15, 23, 42, 0.72)',
                border: `1.5px solid ${factionToken.primaryHex}66`,
              }}
            >
              <RolePortraitSvg
                roleId={presentation.roleId}
                faction={presentation.faction}
                size={96}
              />
            </div>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-300/80">
              {visualMeta?.motif ?? 'Anime Noir Profile'}
            </p>
          </div>
        )}

        {/* Lớp dải tối chuyển sắc ở chân ảnh + viền sáng đỉnh để typography sắc nét */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: factionToken.plaqueGradientCss }}
        />

        {/* Khung khắc góc kim loại */}
        <MidnightOrnamentFrameSvg
          primaryHex={factionToken.primaryHex}
          secondaryHex={factionToken.secondaryHex}
        />

        {/* HEADER (Top Safe Zone ~14%): Huy hiệu Phe + Con dấu Sinh lực HP */}
        <div className="relative z-10 flex items-start justify-between gap-1.5 p-2.5 sm:p-3">
          <div
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wide whitespace-nowrap shrink-0 shadow-lg ${factionToken.badgeClass}`}
          >
            <FactionCrestSvg faction={presentation.faction} size={15} />
            <span>{factionToken.label}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div
              data-testid={testId ? `${testId}-hp-seal` : undefined}
              className="flex flex-col items-center rounded-xl border px-2.5 py-1 shadow-xl"
              style={{
                background: factionToken.hpSealBg,
                borderColor: isCritical ? '#fb7185' : `${factionToken.secondaryHex}cc`,
                color: factionToken.hpSealText,
              }}
              title={`Sinh lực: ${hpVal}/${maxHpVal} HP (${presentation.publicWoundsTaken} vết thương)`}
            >
              <span className="text-sm font-black leading-none tracking-tight">
                {hpVal}
                <span className="text-[10px] opacity-80">/{maxHpVal}</span>
              </span>
              <span className="mt-0.5 text-[9px] font-extrabold uppercase tracking-widest opacity-90">
                {presentation.publicWoundsTaken > 0
                  ? `-${presentation.publicWoundsTaken} ST`
                  : 'HP'}
              </span>
            </div>
            {onZoom && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onZoom();
                }}
                aria-label={`Phóng lớn thẻ ${presentation.roleName ?? 'nhân vật'}`}
                title="Phóng lớn & đọc chi tiết"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/25 bg-slate-950/85 text-xs text-slate-100 hover:border-amber-300/80 hover:text-amber-200 transition cursor-pointer"
              >
                🔍
              </button>
            )}
          </div>
        </div>

        {/* BOTTOM PLAQUE (Bottom ~32%): Tên nhân vật, trạng thái lộ/ẩn, Kỹ năng & Điều kiện thắng */}
        <div className="relative z-10 mt-auto space-y-2 p-3 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                presentation.publicRevealed
                  ? 'border-emerald-300/60 bg-emerald-950/90 text-emerald-200'
                  : 'border-amber-300/60 bg-slate-950/90 text-amber-200'
              }`}
            >
              {presentation.publicRevealed ? '🔓 Đã lộ diện' : '🔒 Riêng tư'}
            </span>
            <span className="rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
              {visualMeta?.title ?? presentation.roleTitle}
            </span>
          </div>

          <div>
            <h3 className="text-lg font-black leading-tight tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              {presentation.roleName}
            </h3>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/90 ring-1 ring-white/10">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(0, Math.min(100, hpRatio * 100))}%`,
                  background: isCritical
                    ? 'linear-gradient(90deg, #e11d48, #fb7185)'
                    : `linear-gradient(90deg, ${factionToken.primaryHex}, ${factionToken.secondaryHex})`,
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/15 bg-slate-950/90 p-2.5">
            <div className="flex items-center justify-between gap-1">
              <span
                className="text-[10px] font-black uppercase tracking-wider"
                style={{ color: factionToken.secondaryHex }}
              >
                ✦ {presentation.skillName}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-slate-200 line-clamp-3">
              {presentation.skillSummary}
            </p>
            {showGoalFooter && presentation.secretGoalText && (
              <p className="mt-1.5 border-t border-white/10 pt-1 text-[10px] leading-snug text-amber-200/95 line-clamp-2">
                🎯 {presentation.secretGoalText}
              </p>
            )}
          </div>
        </div>
      </div>
    ) : (
      /* Fallback rỗng khi showFront === false (TiltContainer sẽ hiển thị backFace qua flipped=true) */
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-xs font-bold text-slate-400">
        Đang bảo mật danh tính...
      </div>
    );

  const backFace = (
    <div
      data-testid={testId ? `${testId}-back` : undefined}
      className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-slate-950"
    >
      <img
        src={presentation.cardBackSrc}
        alt="Mặt lưng thẻ nhân vật bí mật KTX"
        width={720}
        height={1080}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover opacity-90"
        draggable={false}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/20 to-slate-950/92"
      />
      <MidnightOrnamentFrameSvg primaryHex="#cbd5e1" secondaryHex="#fbbf24" />

      <div className="relative z-10 flex items-center justify-between gap-1.5 p-3">
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-400/50 bg-slate-950/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-200">
          🃏 Vai Ẩn Danh
        </span>
        <div className="flex items-center gap-1">
          <span className="rounded-lg border border-amber-400/45 bg-slate-950/90 px-2 py-0.5 text-[10px] font-extrabold text-amber-200">
            {presentation.publicWoundsTaken} vết thương
          </span>
          {onZoom && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onZoom();
              }}
              aria-label="Phóng lớn mặt lưng thẻ nhân vật"
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/25 bg-slate-950/85 text-[11px] text-slate-100 hover:border-amber-300/80 hover:text-amber-200 transition cursor-pointer"
            >
              🔍
            </button>
          )}
        </div>
      </div>

      <div className="relative z-10 mt-auto p-3">
        <div className="rounded-xl border border-amber-300/35 bg-slate-950/92 p-3 text-center">
          <p className="text-xs font-black uppercase tracking-wider text-amber-200">
            Danh Tính Đang Bảo Mật
          </p>
          <p className="mt-1 text-[11px] leading-snug text-slate-300">
            {presentation.privacyReason}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <MidnightTiltContainer
      testId={testId}
      flipped={!presentation.showFront}
      foilEnabled={foilEnabled}
      reducedMotion={reducedMotion}
      frameGradientCss={frontFrameCss}
      foilGradientCss={foilCss}
      glowShadowCss={factionToken?.glowShadowCss}
      onClick={onFlipToggle}
      ariaLabel={
        presentation.showFront
          ? `Thẻ nhân vật ${presentation.roleName}`
          : 'Thẻ nhân vật đang úp bảo mật'
      }
      className={className}
      frontFace={frontFace}
      backFace={backFace}
    />
  );
});
