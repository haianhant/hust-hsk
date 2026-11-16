'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/MidnightActionCard.tsx
// Template Thẻ Bài Chức Năng 2:3 (Điều tra · Trang bị · Đột Kích) phong cách Anime Noir.
// Tôn trọng quy tắc úp bài trên chồng bài / bảo mật 1-đối-1 của Thẻ Điều Tra.
// ---------------------------------------------------------------------------

import React from 'react';
import { MidnightOrnamentFrameSvg } from './BoardGameArt';
import {
  MIDNIGHT_DECK_TOKENS,
  resolveActionCardPresentation,
  type ActionCardZone,
} from './midnight-noir-tokens';
import { MidnightTiltContainer } from './MidnightTiltContainer';

export interface MidnightActionCardProps {
  cardId: string;
  zone: ActionCardZone;
  isParticipantInInvestigation?: boolean;
  foilEnabled?: boolean;
  onFlipToggle?: () => void;
  className?: string;
  testId?: string;
}

const DECK_ICON_GLYPH = {
  investigation: '🔍',
  equipment: '🛡️',
  event: '⚡',
} as const;

export function MidnightActionCard({
  cardId,
  zone,
  isParticipantInInvestigation = true,
  foilEnabled = true,
  onFlipToggle,
  className = '',
  testId,
}: MidnightActionCardProps) {
  const presentation = resolveActionCardPresentation({
    cardId,
    zone,
    isParticipantInInvestigation,
  });
  const deckToken = MIDNIGHT_DECK_TOKENS[presentation.deck];

  const frontFace = presentation.showFront ? (
    <div
      className="relative flex h-full w-full flex-col justify-between overflow-hidden"
      style={{ background: deckToken.backGradientCss }}
    >
      {presentation.artworkSrc ? (
        <img
          src={presentation.artworkSrc}
          alt={presentation.title ?? 'Thẻ bài Bóng Đêm KTX'}
          className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
          draggable={false}
        />
      ) : null}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(4, 9, 17, 0.58) 0%, rgba(4, 9, 17, 0.08) 38%, rgba(4, 8, 16, 0.88) 72%, rgba(3, 6, 12, 0.98) 100%)',
        }}
      />

      <MidnightOrnamentFrameSvg
        primaryHex={deckToken.accentHex}
        secondaryHex={deckToken.secondaryHex}
      />

      {/* TOP BADGES: Bộ bài + Chỉ số */}
      <div className="relative z-10 flex items-start justify-between gap-2 p-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-lg backdrop-blur-md ${deckToken.badgeClass}`}
        >
          <span>{DECK_ICON_GLYPH[presentation.deck]}</span>
          <span>{deckToken.label}</span>
        </span>
        <span
          className="rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg backdrop-blur-md"
          style={{
            background: 'rgba(2, 6, 23, 0.86)',
            borderColor: `${deckToken.accentHex}99`,
          }}
        >
          {deckToken.statLabel}
        </span>
      </div>

      {/* BOTTOM PLAQUE */}
      <div className="relative z-10 mt-auto space-y-1.5 p-3">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <span
            className="text-[10px] font-extrabold uppercase tracking-wider"
            style={{ color: deckToken.secondaryHex }}
          >
            {deckToken.subtitle}
          </span>
          <span className="rounded bg-slate-950/85 px-1.5 py-0.5 text-[9px] font-bold text-slate-300">
            {presentation.visibilityBadge}
          </span>
        </div>

        <h4 className="text-base font-black leading-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
          {presentation.title}
        </h4>

        <div className="rounded-xl border border-white/15 bg-slate-950/84 p-2.5 backdrop-blur-md">
          <p className="text-[11px] leading-snug text-slate-200">{presentation.summary}</p>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-slate-950 text-xs text-slate-400">
      Thẻ úp bảo mật
    </div>
  );

  const backFace = (
    <div
      data-testid={testId ? `${testId}-back` : undefined}
      className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-slate-950"
    >
      <img
        src={presentation.cardBackSrc}
        alt={`Mặt lưng ${deckToken.label}`}
        className="absolute inset-0 h-full w-full object-cover opacity-80"
        draggable={false}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-75"
        style={{ background: deckToken.backGradientCss }}
      />
      <MidnightOrnamentFrameSvg
        primaryHex={deckToken.accentHex}
        secondaryHex={deckToken.secondaryHex}
      />

      <div className="relative z-10 flex items-center justify-between p-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur-md ${deckToken.badgeClass}`}
        >
          <span>{DECK_ICON_GLYPH[presentation.deck]}</span>
          <span>{deckToken.label}</span>
        </span>
        <span className="rounded-md border border-white/20 bg-slate-950/85 px-2 py-0.5 text-[9px] font-bold text-slate-200">
          {presentation.visibilityBadge}
        </span>
      </div>

      <div className="relative z-10 mt-auto p-3">
        <div className="rounded-xl border border-white/20 bg-slate-950/90 p-3 text-center backdrop-blur-md">
          <p className="text-xs font-black uppercase tracking-wider text-white">
            {presentation.backLabel}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-slate-300">
            {presentation.deck === 'investigation'
              ? 'Chỉ người gửi và người nhận xem được nội dung mật.'
              : 'Nội dung thẻ chỉ lộ diện sau khi rút và mở lên.'}
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
      frameGradientCss={deckToken.frameGradientCss}
      foilGradientCss={deckToken.foilGradientCss}
      onClick={onFlipToggle}
      ariaLabel={
        presentation.showFront ? presentation.title ?? deckToken.label : presentation.backLabel
      }
      className={className}
      frontFace={frontFace}
      backFace={backFace}
    />
  );
}
