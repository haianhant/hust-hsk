'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/TabletopLocationTile.tsx
// Ô địa điểm KTX thiết kế dạng Illustrated Tabletop Tile:
// - Tranh diorama 16:9 ban đêm HUSTVerse Midnight có chiều sâu
// - Ánh đèn điểm + lớp sương mù nhẹ trôi nổi (tôn trọng reducedMotion)
// - Khung nổi 3D tabletop slab, đinh tán góc kim loại & khay quân cờ đế nổi
// ---------------------------------------------------------------------------

import React from 'react';
import type {
  BoardGameLocationId,
  BoardGamePublicPlayerView,
} from '@/shared/contracts/boardgame';
import {
  LOCATION_VISUAL_META,
  PlayerPawnToken,
} from './BoardGameArt';
import {
  MIDNIGHT_LOCATION_AMBIENCE,
  MIDNIGHT_LOCATION_ART,
} from './midnight-noir-tokens';
import { toggleSelectedTargetId } from './target-selection';

export interface TabletopLocationTileProps {
  locId: BoardGameLocationId;
  occupants: readonly BoardGamePublicPlayerView[];
  selfPlayerId: string | null;
  activePlayerId: string | null;
  selectedTargetId: string | null;
  attackableIds: ReadonlySet<string>;
  isSelfHere: boolean;
  canChooseMoveHere: boolean;
  rolledDestinationHere: boolean;
  isHighlightedDestination?: boolean;
  reducedMotion?: boolean;
  enableMist?: boolean;
  enableBackdropBlur?: boolean;
  onChooseDestination?: (locId: BoardGameLocationId) => void;
  onSelectPlayer: (updater: (prev: string | null) => string | null) => void;
}

export const TabletopLocationTile = React.memo(function TabletopLocationTile({
  locId,
  occupants,
  selfPlayerId,
  activePlayerId,
  selectedTargetId,
  attackableIds,
  isSelfHere,
  canChooseMoveHere,
  rolledDestinationHere,
  isHighlightedDestination = false,
  reducedMotion = false,
  enableMist = true,
  enableBackdropBlur = true,
  onChooseDestination,
  onSelectPlayer,
}: TabletopLocationTileProps) {
  const meta = LOCATION_VISUAL_META[locId];
  const ambience = MIDNIGHT_LOCATION_AMBIENCE[locId];
  const artSrc = MIDNIGHT_LOCATION_ART[locId];
  const destinationLit = isHighlightedDestination || rolledDestinationHere;

  return (
    <div
      data-testid={`bg-loc-${locId}`}
      data-destination-highlighted={destinationLit ? 'true' : 'false'}
      onClick={
        canChooseMoveHere && onChooseDestination
          ? () => onChooseDestination(locId)
          : undefined
      }
      role={canChooseMoveHere ? 'button' : undefined}
      tabIndex={canChooseMoveHere ? 0 : undefined}
      onKeyDown={
        canChooseMoveHere && onChooseDestination
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onChooseDestination(locId);
              }
            }
          : undefined
      }
      className={`group/tile relative overflow-hidden rounded-2xl border bg-slate-950 transition-all duration-200 ${
        canChooseMoveHere
          ? 'border-amber-400 border-b-4 border-b-amber-500 ring-2 ring-amber-400/75 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(251,191,36,0.34)] cursor-pointer'
          : isHighlightedDestination
            ? `border-emerald-300 ring-2 ring-emerald-400/80 ${
                reducedMotion ? '' : 'mn-tile-landing-beacon'
              }`
            : isSelfHere
              ? 'border-cyan-400/85 ring-1 ring-cyan-400/35 shadow-[0_10px_26px_rgba(34,211,238,0.22)]'
              : destinationLit
                ? 'border-emerald-400/75 shadow-[0_8px_20px_rgba(16,185,129,0.2)]'
                : 'border-slate-700/60 shadow-[0_8px_20px_rgba(2,6,23,0.68)]'
      }`}
    >
      {/* LỚP 1: ARTWORK NỀN 16:9 DIORAMA KTX BAN ĐÊM (NÂNG ĐỘ SÁNG RÕ NÉT HƠN) */}
      <img
        src={artSrc}
        alt={meta.name}
        width={960}
        height={540}
        loading="eager"
        decoding="async"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-80 brightness-110 contrast-[1.03] transition-transform duration-700 group-hover/tile:scale-[1.04]"
      />

      {/* LỚP 2: ÁNH ĐÈN ĐIỂM SÁNG ẤM PHẦN TRÊN + NỀN CHỮ SẮC NÉT PHẦN DƯỚI */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(68% 78% at ${ambience.lampX}% ${ambience.lampY}%, ${ambience.lampHex}44 0%, rgba(2, 6, 23, 0.14) 56%, rgba(2, 6, 23, 0.84) 100%), linear-gradient(180deg, rgba(2, 6, 23, 0.28) 0%, rgba(2, 6, 23, 0.22) 34%, rgba(2, 6, 23, 0.86) 76%, rgba(2, 6, 23, 0.95) 100%)`,
        }}
      />

      {/* LỚP 3: SƯƠNG ĐÊM NHẸ TRÔI NỔI TRÊN MẶT BÀN */}
      {enableMist && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-35 ${
            reducedMotion ? '' : 'bg-tile-mist-drift'
          }`}
          style={{
            background: `radial-gradient(90% 70% at 50% 85%, ${ambience.fogHex}, transparent 75%)`,
          }}
        />
      )}

      {/* NỘI DUNG CHÍNH TRÊN BỀ MẶT TILE (GIẢM NHIỄU VIỀN, TĂNG ĐỘ ĐỌC CHỮ) */}
      <div className="relative z-10 p-2.5 sm:p-3 flex flex-col justify-between min-h-[122px]">
        <div>
          <div className="flex items-center justify-between gap-1.5">
            <span
              style={{
                backgroundColor: meta.accentHex,
                boxShadow: `0 2px 10px ${meta.accentHex}75`,
              }}
              className="px-2 py-0.5 rounded-md text-slate-950 text-[11px] font-black whitespace-nowrap shrink-0"
            >
              Ô {meta.diceLabel}
            </span>
            <div className="flex items-center gap-1">
              {isHighlightedDestination && !isSelfHere && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-400 text-slate-950 text-[10px] font-black whitespace-nowrap shadow">
                  🎯 Điểm đáp
                </span>
              )}
              {isSelfHere && (
                <span className="px-2 py-0.5 rounded-md bg-cyan-400 text-slate-950 text-[10px] font-black whitespace-nowrap shadow">
                  📍 Bạn ở đây
                </span>
              )}
            </div>
          </div>

          <h3 className="text-[15px] sm:text-base font-black tracking-tight text-white mt-1.5 leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            {meta.name}
          </h3>
          <p className="text-xs font-medium text-slate-100/95 mt-0.5 leading-snug drop-shadow-[0_1px_5px_rgba(0,0,0,0.95)]">
            {meta.actionDesc}
          </p>
        </div>

        {canChooseMoveHere && (
          <div className="mt-2 px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-xs font-black text-center shadow-lg">
            👆 Bấm để di chuyển tới đây
          </div>
        )}

        {/* KHAY QUÂN CỜ ĐẾ NỔI ĐỨNG TRONG KHU VỰC */}
        <div className="mt-2 pt-1.5 border-t border-white/15 min-h-[38px] flex flex-wrap items-center gap-1.5">
          {occupants.length === 0 ? (
            <span className="text-[11px] text-slate-400/90 italic drop-shadow">
              Trống người
            </span>
          ) : (
            occupants.map((p) => {
              const inAttackRange = attackableIds.has(p.playerId);
              const isSelectedTarget = selectedTargetId === p.playerId;
              const isSelfToken = p.playerId === selfPlayerId;
              return (
                <button
                  key={p.playerId}
                  type="button"
                  data-vfx-player={p.playerId}
                  data-pawn-glide={p.playerId}
                  data-testid={isSelfToken ? 'bg-loc-pawn-self' : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPlayer((prev) =>
                      toggleSelectedTargetId(prev, p.playerId, p.alive),
                    );
                  }}
                  className={`flex items-center gap-1.5 rounded-full pr-2.5 pl-1 py-0.5 border text-xs font-bold shadow-md transition cursor-pointer ${enableBackdropBlur ? 'backdrop-blur-sm' : ''} ${
                    isSelectedTarget
                      ? isSelfToken
                        ? 'bg-emerald-600/90 border-emerald-200 text-white'
                        : 'bg-rose-600/90 border-rose-200 text-white'
                      : inAttackRange
                        ? 'bg-rose-950/75 border-rose-400/75 text-rose-100 hover:border-rose-300'
                        : 'bg-slate-950/80 border-white/20 text-slate-100 hover:border-cyan-400/70'
                  }`}
                >
                  <PlayerPawnToken
                    size="xs"
                    elevated
                    displayName={p.displayName}
                    seatIndex={p.seatIndex}
                    alive={p.alive}
                    isActive={p.playerId === activePlayerId}
                    isSelf={isSelfToken}
                    revealedFaction={p.revealedFaction}
                    revealedRoleId={p.revealedRoleId}
                  />
                  <span className={!p.alive ? 'line-through text-slate-400' : ''}>
                    {p.displayName}
                  </span>
                  {inAttackRange && (
                    <span className="text-[10px] text-amber-200" title="Trong tầm đánh">
                      ⚔️
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
});
export default TabletopLocationTile;
