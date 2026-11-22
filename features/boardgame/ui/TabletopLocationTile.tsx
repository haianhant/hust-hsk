'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/TabletopLocationTile.tsx
// Ô địa điểm KTX thiết kế dạng Illustrated Tabletop Tile:
// - Tranh diorama 16:9 ban đêm HUSTVerse Midnight có chiều sâu
// - Ánh đèn điểm + lớp sương mù nhẹ trôi nổi (tôn trọng reducedMotion)
// - Khung nổi 3D tabletop slab, đinh tán góc kim loại & khay quân cờ đế nổi
// ---------------------------------------------------------------------------

import React, { useEffect, useId, useRef, useState } from 'react';
import type {
  BoardGameLocationId,
  BoardGamePublicPlayerView,
} from '@/shared/contracts/boardgame';
import {
  LOCATION_VISUAL_META,
  PlayerPawnToken,
} from './BoardGameArt';
import { getPublicPlayerNameFactionClass } from './DamageTrack';
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
  controlledTurn?: {
    activePlayerId: string;
    controllerPlayerId: string;
    pausedForOwnerDecision?: boolean;
  } | null;
  cainDeathModifierActivePlayerIds?: readonly string[];
  isSelfHere: boolean;
  canChooseMoveHere: boolean;
  rolledDestinationHere: boolean;
  isHighlightedDestination?: boolean;
  isSelectedLocation?: boolean;
  reducedMotion?: boolean;
  enableMist?: boolean;
  enableBackdropBlur?: boolean;
  onChooseDestination?: (locId: BoardGameLocationId) => void;
  onSelectLocation?: (locId: BoardGameLocationId) => void;
  onSelectPlayer: (updater: (prev: string | null) => string | null) => void;
}

export const TabletopLocationTile = React.memo(function TabletopLocationTile({
  locId,
  occupants,
  selfPlayerId,
  activePlayerId,
  selectedTargetId,
  attackableIds,
  controlledTurn = null,
  cainDeathModifierActivePlayerIds = [],
  isSelfHere,
  canChooseMoveHere,
  rolledDestinationHere,
  isHighlightedDestination = false,
  isSelectedLocation = false,
  reducedMotion = false,
  enableMist = true,
  enableBackdropBlur = true,
  onChooseDestination,
  onSelectLocation,
  onSelectPlayer,
}: TabletopLocationTileProps) {
  const meta = LOCATION_VISUAL_META[locId];
  const ambience = MIDNIGHT_LOCATION_AMBIENCE[locId];
  const artSrc = MIDNIGHT_LOCATION_ART[locId];
  const destinationLit = isHighlightedDestination || rolledDestinationHere;

  const hasAttackableOccupant = occupants.some(
    (p) => p.alive && attackableIds.has(p.playerId),
  );
  const hasSelectedOccupant = occupants.some(
    (p) => selectedTargetId === p.playerId,
  );

  const [ruleHovered, setRuleHovered] = useState(false);
  const [ruleFocused, setRuleFocused] = useState(false);
  const [rulePinned, setRulePinned] = useState(false);
  const tileRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const ruleOpen = ruleHovered || ruleFocused || rulePinned;

  useEffect(() => {
    if (!rulePinned) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (tileRef.current && !tileRef.current.contains(e.target as Node)) {
        setRulePinned(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRulePinned(false);
        setRuleFocused(false);
        setRuleHovered(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [rulePinned]);

  const tileFrameCls = canChooseMoveHere
    ? 'border-amber-400 border-b-[3px] border-b-amber-500 ring-2 ring-amber-400/80 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(251,191,36,0.34)] cursor-pointer'
    : isHighlightedDestination || destinationLit
      ? `border-emerald-300 ring-2 ring-emerald-400/80 shadow-[0_8px_22px_rgba(16,185,129,0.28)] ${
          isHighlightedDestination && !reducedMotion ? 'mn-tile-landing-beacon' : ''
        }`
      : isSelfHere && hasAttackableOccupant
        ? 'border-cyan-300 ring-2 ring-rose-400/80 shadow-[0_8px_22px_rgba(244,63,94,0.28)]'
        : isSelfHere
          ? 'border-cyan-400 ring-2 ring-cyan-400/45 shadow-[0_8px_22px_rgba(34,211,238,0.24)]'
          : hasAttackableOccupant
            ? 'border-rose-400/90 ring-1 ring-rose-500/60 shadow-[0_8px_20px_rgba(244,63,94,0.24)]'
            : hasSelectedOccupant
              ? 'border-sky-400/80 ring-1 ring-sky-400/40'
              : isSelectedLocation
                ? 'border-indigo-300 ring-2 ring-indigo-400/75 shadow-[0_8px_22px_rgba(99,102,241,0.28)]'
                : 'border-slate-700/65 shadow-[0_6px_16px_rgba(2,6,23,0.65)]';

  return (
    <div
      ref={tileRef}
      data-testid={`bg-loc-${locId}`}
      data-destination-highlighted={destinationLit ? 'true' : 'false'}
      data-self-here={isSelfHere ? 'true' : 'false'}
      data-has-attackable={hasAttackableOccupant ? 'true' : 'false'}
      data-has-selected={hasSelectedOccupant ? 'true' : 'false'}
      data-can-choose-dest={canChooseMoveHere ? 'true' : 'false'}
      data-location-selected={isSelectedLocation ? 'true' : 'false'}
      onClick={
        canChooseMoveHere && onChooseDestination
          ? () => onChooseDestination(locId)
          : onSelectLocation
            ? () => onSelectLocation(locId)
            : undefined
      }
      role={canChooseMoveHere ? 'button' : undefined}
      tabIndex={canChooseMoveHere || onSelectLocation ? 0 : undefined}
      aria-label={
        canChooseMoveHere
          ? `Di chuyển tới Ô ${meta.diceLabel} ${meta.name} (${meta.actionTitle})`
          : onSelectLocation
            ? `Xem thông tin Ô ${meta.diceLabel} ${meta.name} (${meta.actionTitle})`
            : undefined
      }
      onKeyDown={
        (canChooseMoveHere && onChooseDestination) || onSelectLocation
          ? (e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (canChooseMoveHere && onChooseDestination) {
                  onChooseDestination(locId);
                } else {
                  onSelectLocation?.(locId);
                }
              }
            }
          : undefined
      }
      className={`group/tile relative h-full min-w-0 rounded-2xl border bg-slate-950 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
        onSelectLocation && !canChooseMoveHere ? 'cursor-pointer' : ''
      } ${
        ruleOpen ? 'z-30' : ''
      } ${tileFrameCls}`}
    >
      {/* LỚP NỀN BO TRÒN RIÊNG (giữ artwork/sương gọn góc mà không cắt popover hoặc quân cờ FLIP) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
      >
        {/* LỚP 1: ARTWORK NỀN 16:9 DIORAMA KTX BAN ĐÊM */}
        <img
          src={artSrc}
          alt={meta.name}
          width={960}
          height={540}
          loading="eager"
          decoding="async"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-85 brightness-110 contrast-[1.04] transition-transform duration-700 group-hover/tile:scale-[1.04]"
        />

        {/* LỚP 2: ÁNH ĐÈN ĐIỂM SÁNG ẤM + DẢI NỀN CHỮ MỀM ĐỂ PHẦN ARTWORK GIỮA NỔI BẬT */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(72% 82% at ${ambience.lampX}% ${ambience.lampY}%, ${ambience.lampHex}40 0%, rgba(2, 6, 23, 0.12) 58%, rgba(2, 6, 23, 0.80) 100%), linear-gradient(180deg, rgba(2, 6, 23, 0.44) 0%, rgba(2, 6, 23, 0.14) 36%, rgba(2, 6, 23, 0.22) 66%, rgba(2, 6, 23, 0.90) 100%)`,
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
      </div>

      {/* NỘI DUNG TACTICAL SCALING TRÊN BỀ MẶT TILE */}
      <div className="relative z-10 h-full min-w-0 p-2 sm:p-2.5 flex flex-col justify-between min-h-[112px] lg:min-h-[clamp(128px,calc(19.2vh_-_22px),182px)]">
        {/* CỤM TIÊU ĐỀ + ACTION CHIP GỌN Ở ĐỈNH (CHỪA KHOẢNG ARTWORK SÁNG Ở GIỮA) */}
        <div className="space-y-1 min-w-0">
          {/* HÀNG 1: GIÁ TRỊ XÚC XẮC + TÊN ĐỊA ĐIỂM (14–16PX) + BADGE VỊ TRÍ BẢN THÂN */}
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span
                data-testid={`bg-tile-dice-${locId}`}
                style={{
                  backgroundColor: meta.accentHex,
                  boxShadow: `0 2px 10px ${meta.accentHex}75`,
                }}
                className="px-2 py-0.5 rounded-md text-slate-950 text-xs font-black whitespace-nowrap shrink-0"
              >
                Ô {meta.diceLabel}
              </span>
              <h3
                data-testid={`bg-tile-name-${locId}`}
                title={meta.name}
                className="text-[14px] xl:text-[15px] 2xl:text-[16px] font-black tracking-tight text-white truncate leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]"
              >
                {meta.name}
              </h3>
            </div>

            {isSelfHere && (
              <span className="px-1.5 py-0.5 rounded-md bg-cyan-400 text-slate-950 text-xs font-black whitespace-nowrap shrink-0 shadow">
                📍 Bạn
              </span>
            )}
          </div>

          {/* HÀNG 2: ICON + TÊN HÀNH ĐỘNG NGẮN GỌN (>= 12PX) + ĐÍCH ĐẾN / TẦM ĐÁNH */}
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <button
              type="button"
              data-testid={`bg-tile-rule-trigger-${locId}`}
              aria-label={`Luật ô ${meta.diceLabel} ${meta.name}: ${meta.actionTitle}`}
              aria-expanded={ruleOpen}
              aria-describedby={ruleOpen ? popoverId : undefined}
              onMouseEnter={() => setRuleHovered(true)}
              onMouseLeave={() => setRuleHovered(false)}
              onFocus={() => setRuleFocused(true)}
              onBlur={() => setRuleFocused(false)}
              onClick={(e) => {
                e.stopPropagation();
                setRulePinned((v) => !v);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  setRulePinned(false);
                  setRuleFocused(false);
                  setRuleHovered(false);
                } else if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                }
              }}
              className={`inline-flex items-center gap-1 min-w-0 max-w-full overflow-hidden rounded-md border px-1.5 py-0.5 text-xs font-bold whitespace-nowrap transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                ruleOpen
                  ? 'border-amber-300 bg-slate-900/95 text-amber-200'
                  : 'border-white/25 bg-slate-950/80 text-slate-100 hover:border-cyan-300/70'
              }`}
            >
              <span data-testid={`bg-tile-action-icon-${locId}`} aria-hidden="true" className="shrink-0">
                {meta.actionIcon}
              </span>
              <span data-testid={`bg-tile-action-label-${locId}`} className="truncate">
                {meta.badgeText}
              </span>
              <span aria-hidden="true" className="opacity-80 shrink-0">
                ⓘ
              </span>
            </button>

            <div className="flex items-center gap-1 shrink-0">
              {canChooseMoveHere ? (
                <span
                  title="Chọn làm điểm đến"
                  className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-xs font-black whitespace-nowrap shadow"
                >
                  🧭 Chọn ô
                </span>
              ) : destinationLit ? (
                <span
                  title="Điểm đến vừa tung xúc xắc"
                  className="px-1.5 py-0.5 rounded-md bg-emerald-400 text-slate-950 text-xs font-black whitespace-nowrap shadow"
                >
                  🎯 Đích
                </span>
              ) : null}
              {hasAttackableOccupant && (
                <span
                  title="Có mục tiêu trong tầm đánh"
                  className="px-1.5 py-0.5 rounded-md bg-rose-500/95 text-white text-xs font-black whitespace-nowrap shadow"
                >
                  ⚔️ Đánh
                </span>
              )}
            </div>
          </div>
        </div>

        {/* TOOLTIP / POPOVER MÔ TẢ LUẬT Ô (CHỈ HIỆN KHI HOVER / FOCUS / CLICK) */}
        {ruleOpen && (
          <div
            id={popoverId}
            role="tooltip"
            data-testid={`bg-tile-rule-popover-${locId}`}
            onMouseEnter={() => setRuleHovered(true)}
            onMouseLeave={() => setRuleHovered(false)}
            onClick={(e) => e.stopPropagation()}
            className={`absolute left-2 right-2 top-14 z-40 rounded-xl border border-cyan-400/50 bg-slate-950/95 px-2.5 py-2 shadow-2xl ${
              enableBackdropBlur ? 'backdrop-blur-md' : ''
            }`}
          >
            <p className="text-xs font-black text-amber-200 flex items-center gap-1">
              <span>{meta.actionIcon}</span>
              <span>
                Ô {meta.diceLabel} · {meta.actionTitle}
              </span>
            </p>
            <p className="mt-0.5 text-xs leading-snug text-slate-200">
              {meta.actionDesc}
            </p>
          </div>
        )}

        {/* KHAY QUÂN CỜ ĐẾ NỔI ĐỨNG TRONG KHU VỰC (HỖ TRỢ 1–8 QUÂN CÙNG Ô KHÔNG TRÀN) */}
        <div
          data-testid={`bg-tile-pawns-${locId}`}
          className={`mt-auto pt-1.5 border-t border-white/15 min-h-[30px] min-w-0 ${
            occupants.length >= 4
              ? 'grid grid-cols-4 gap-1 items-center'
              : occupants.length === 3
                ? 'grid grid-cols-3 gap-1 items-center'
                : occupants.length === 2
                  ? 'grid grid-cols-2 gap-1 items-center'
                  : 'flex flex-wrap items-center gap-1.5'
          }`}
        >
          {occupants.length === 0 ? (
            <span className="text-xs text-slate-300/85 italic drop-shadow">
              Trống
            </span>
          ) : (
            occupants.map((p) => {
              const inAttackRange = attackableIds.has(p.playerId);
              const isSelectedTarget = selectedTargetId === p.playerId;
              const isSelfToken = p.playerId === selfPlayerId;
              const isDormant = p.lifecycleState === 'DORMANT_PENDING_REVIVE';
              const isPuppetControlled = Boolean(
                controlledTurn &&
                  controlledTurn.activePlayerId === p.playerId &&
                  controlledTurn.controllerPlayerId !== p.playerId,
              );
              const isPuppetPaused = Boolean(
                isPuppetControlled && controlledTurn?.pausedForOwnerDecision,
              );
              const hasCainModifier = cainDeathModifierActivePlayerIds.includes(p.playerId);
              const crowdedMode = occupants.length >= 2;
              return (
                <button
                  key={p.playerId}
                  type="button"
                  data-vfx-player={p.playerId}
                  data-pawn-glide={p.playerId}
                  data-testid={isSelfToken ? 'bg-loc-pawn-self' : undefined}
                  data-selected={isSelectedTarget ? 'true' : 'false'}
                  data-attackable={inAttackRange ? 'true' : 'false'}
                  data-lifecycle-state={p.lifecycleState ?? (p.alive ? 'ALIVE' : 'FINAL_ELIMINATED')}
                  data-puppet-controlled={isPuppetControlled ? 'true' : 'false'}
                  data-puppet-paused={isPuppetPaused ? 'true' : 'false'}
                  aria-pressed={isSelectedTarget}
                  aria-label={`${p.displayName}${isSelfToken ? ' (Bạn)' : ''}${
                    isDormant ? ' · Đang ngủ đông chờ hồi sinh' : ''
                  }${isPuppetControlled ? ' · Đang bị Voodoo điều khiển' : ''}${
                    inAttackRange ? ' · Trong tầm đánh' : ''
                  }${isSelectedTarget ? ' · Đang chọn' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPlayer((prev) =>
                      toggleSelectedTargetId(prev, p.playerId, p.alive),
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                    }
                  }}
                  className={`flex items-center border font-bold shadow-md transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                    crowdedMode
                      ? 'overflow-hidden min-w-0 w-full gap-1 rounded-lg px-1 py-0.5 text-xs'
                      : 'min-w-0 max-w-full gap-1.5 rounded-full pr-2 pl-0.5 py-0.5 text-xs'
                  } ${
                    isSelectedTarget
                      ? isSelfToken
                        ? 'bg-emerald-600/95 border-emerald-200 ring-1 ring-emerald-200 text-white'
                        : 'bg-rose-600/95 border-rose-200 ring-1 ring-rose-200 text-white'
                      : isDormant
                        ? 'bg-purple-950/90 border-emerald-400/85 ring-1 ring-purple-400/70 text-emerald-100'
                        : isPuppetControlled
                          ? 'bg-fuchsia-950/90 border-purple-400/90 ring-1 ring-fuchsia-400/75 text-purple-100'
                          : inAttackRange
                            ? 'bg-rose-950/90 border-rose-400/85 text-rose-100 hover:border-rose-300'
                            : isSelfToken
                              ? 'bg-cyan-950/90 border-cyan-300/75 text-cyan-50 hover:border-cyan-200'
                              : 'bg-slate-950/90 border-white/25 text-slate-100 hover:border-cyan-400/70'
                  }`}
                >
                  <PlayerPawnToken
                    size={crowdedMode ? '2xs' : 'xs'}
                    elevated={!crowdedMode}
                    displayName={p.displayName}
                    seatIndex={p.seatIndex}
                    alive={p.alive || isDormant}
                    isActive={p.playerId === activePlayerId}
                    isSelf={isSelfToken}
                    revealedFaction={p.revealedFaction}
                    revealedRoleId={p.revealedRoleId}
                  />
                  <span
                    className={`truncate ${
                      crowdedMode ? 'min-w-0 flex-1 text-left' : 'max-w-[120px]'
                    } ${
                      isSelectedTarget
                        ? 'text-white'
                        : getPublicPlayerNameFactionClass(p)
                    }`}
                  >
                    {p.displayName}
                  </span>
                  {isDormant && (
                    <span
                      className="text-xs shrink-0"
                      title="Đang ngủ đông (Undead) — hồi sinh 6 HP đầu lượt kế"
                      aria-hidden="true"
                    >
                      💤
                    </span>
                  )}
                  {isPuppetControlled && (
                    <span
                      className="text-xs shrink-0"
                      title={
                        isPuppetPaused
                          ? 'Đang tạm dừng chờ chủ lượt xử lý bài kín'
                          : 'Đang bị Voodoo điều khiển lượt'
                      }
                      aria-hidden="true"
                    >
                      {isPuppetPaused ? '🔒' : '🧵'}
                    </span>
                  )}
                  {hasCainModifier && (
                    <span
                      className="text-xs shrink-0"
                      title="Cain — Nước Cờ Quyền Lực đang kích hoạt"
                      aria-hidden="true"
                    >
                      ⚖️
                    </span>
                  )}
                  {isSelectedTarget && (
                    <span className="text-xs font-black text-white shrink-0" aria-hidden="true">
                      ✓
                    </span>
                  )}
                  {inAttackRange && (
                    <span className="text-xs text-amber-200 shrink-0" title="Trong tầm đánh" aria-hidden="true">
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
