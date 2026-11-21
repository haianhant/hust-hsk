'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/MatchResult.tsx — Màn hình Tổng Kết Ván Đấu,
// Lật Toàn Bộ Vai Trò, Dòng Thời Gian & Chơi Ván Mới.
// ---------------------------------------------------------------------------

import React, { type ReactNode } from 'react';
import type { BoardGameFactionId, BoardGameRoleId } from '@/shared/contracts/boardgame';
import type { BoardGamePublicGameView } from '../network/contracts';
import {
  FACTION_THEME,
  FactionCrestSvg,
  RolePortraitSvg,
} from './BoardGameArt';
import { MIDNIGHT_CHARACTER_ART } from './midnight-noir-tokens';

const MatchResultPortrait = React.memo(function MatchResultPortrait({
  roleId,
  roleName,
  faction,
}: {
  roleId: BoardGameRoleId;
  roleName: string;
  faction: BoardGameFactionId;
}) {
  const src = MIDNIGHT_CHARACTER_ART[roleId] ?? null;
  const [imgError, setImgError] = React.useState(false);
  React.useEffect(() => {
    setImgError(false);
  }, [src]);

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={roleName}
        width={720}
        height={1080}
        loading="lazy"
        decoding="async"
        onError={() => setImgError(true)}
        className="h-11 w-8 shrink-0 rounded-lg border border-amber-300/45 object-cover object-top shadow"
      />
    );
  }
  return <RolePortraitSvg roleId={roleId} faction={faction} size={38} />;
});

export interface MatchResultProps {
  publicGame: BoardGamePublicGameView;
  selfPlayerId: string | null;
  isSpectator: boolean;
  animateEntrance?: boolean;
  reducedMotion?: boolean;
  postcardSlot?: ReactNode;
  onOpenLeaderboard?: () => void;
  onPlayAgain?: () => void;
  onLeaveMatch: () => void;
}

export default function MatchResult({
  publicGame,
  selfPlayerId,
  isSpectator,
  animateEntrance = false,
  reducedMotion = false,
  postcardSlot,
  onOpenLeaderboard,
  onPlayAgain,
  onLeaveMatch,
}: MatchResultProps) {
  const reveals = publicGame.finalReveal ?? [];
  const totalInvestigations = publicGame.players.reduce(
    (sum, p) => sum + p.investigationsCount,
    0,
  );
  const survivorsCount = reveals.filter((r) => r.alive).length;
  const selfWon = Boolean(
    selfPlayerId && publicGame.winnerPlayerIds.includes(selfPlayerId),
  );
  const isMultiFactionWin =
    publicGame.winnerFaction === 'multi-faction' ||
    (Array.isArray(publicGame.winningFactions) && publicGame.winningFactions.length >= 2);
  const resolvedWinFaction =
    publicGame.winnerFaction === 'lantern-guard' ||
    publicGame.winnerFaction === 'mist-order' ||
    publicGame.winnerFaction === 'wanderer'
      ? publicGame.winnerFaction
      : publicGame.winnerFaction === 'wanderer-solo'
        ? 'wanderer'
        : isMultiFactionWin
          ? 'wanderer'
          : null;
  const winFactionTheme = resolvedWinFaction ? FACTION_THEME[resolvedWinFaction] : null;
  const headerGradientClass = isMultiFactionWin
    ? 'from-emerald-950/75 via-amber-950/60 to-rose-950/75'
    : resolvedWinFaction === 'mist-order'
      ? 'from-rose-950/75 via-slate-900 to-purple-950/70'
      : resolvedWinFaction === 'wanderer'
        ? 'from-emerald-950/70 via-slate-900 to-amber-950/60'
        : 'from-amber-950/70 via-slate-900 to-emerald-950/60';

  const viewerOutcome = isSpectator ? 'spectator' : selfWon ? 'victory' : 'defeat';

  return (
    <div
      data-testid="bg-match-result-modal"
      data-winner-faction={isMultiFactionWin ? 'multi-faction' : (resolvedWinFaction ?? 'none')}
      data-winning-factions={publicGame.winningFactions?.join(',') ?? ''}
      data-outcome={viewerOutcome}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-md"
    >
      <div
        className={`flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-slate-900 text-slate-100 ${
          viewerOutcome === 'defeat'
            ? 'border-rose-500/45 shadow-[0_24px_72px_-12px_rgba(225,29,72,0.3)]'
            : 'border-amber-400/50 shadow-[0_24px_72px_-12px_rgba(251,191,36,0.35)]'
        } ${animateEntrance && !reducedMotion ? 'bg-vfx-match-result-enter' : ''}`}
      >
        <div className={`relative overflow-hidden border-b border-slate-800 bg-gradient-to-r ${headerGradientClass} px-5 py-4`}>
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isMultiFactionWin ? (
                <div
                  data-testid="bg-match-result-dual-crest"
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-300/60 bg-gradient-to-r from-emerald-950/85 via-slate-950/90 to-rose-950/85 px-2 py-1.5 shadow-lg"
                >
                  <FactionCrestSvg faction="lantern-guard" size={34} />
                  <span className="text-sm font-black text-amber-300" aria-hidden="true">
                    ⚖️
                  </span>
                  <FactionCrestSvg faction="mist-order" size={34} />
                </div>
              ) : (
                <div className="shrink-0 rounded-xl border border-amber-300/40 bg-slate-950/75 p-1.5 shadow-lg">
                  <FactionCrestSvg faction={resolvedWinFaction} size={42} />
                </div>
              )}
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-amber-300">
                  🎲 Tổng kết ván đấu · Bóng Đêm KTX
                  {isMultiFactionWin
                    ? ' · ĐỒNG THẮNG SONG PHE'
                    : winFactionTheme
                      ? ` · ${winFactionTheme.shortLabel}`
                      : ''}
                </div>
                <h2 className="mt-1 text-lg font-extrabold text-amber-100 sm:text-xl">
                  🏆 {publicGame.winnerLabel ?? 'Kết thúc ván đấu'}
                </h2>
              </div>
            </div>
            {!isSpectator ? (
              <span
                className={`rounded-xl border px-3.5 py-1.5 text-xs font-black tracking-wide shadow ${
                  selfWon
                    ? 'border-emerald-300/70 bg-gradient-to-r from-emerald-400 to-amber-300 text-slate-950'
                    : 'border-rose-500/45 bg-rose-950/70 text-rose-200'
                }`}
              >
                {selfWon ? '👑 CHIẾN THẮNG!' : '⚔️ THẤT BẠI — PHỤC THÙ VÁN SAU'}
              </span>
            ) : (
              <span className="rounded-xl border border-slate-500/55 bg-slate-950/75 px-3.5 py-1.5 text-xs font-black tracking-wide text-slate-200 shadow">
                👁️ GÓC NHÌN KHÁN GIẢ
              </span>
            )}
          </div>
          <p className="relative z-10 mt-2 text-xs text-slate-200">{publicGame.winReason}</p>
          <div className="relative z-10 mt-2 flex flex-wrap gap-3 text-[11px] text-slate-300">
            <span>
              ⏱️ Vòng: <strong>{publicGame.round}</strong>
            </span>
            <span>
              🔎 Lượt điều tra: <strong>{totalInvestigations}</strong>
            </span>
            <span>
              🧍 Sống sót: <strong>{survivorsCount}/{reveals.length}</strong>
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs">
          {/* Bảng lật vai toàn bàn */}
          <div>
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-amber-300">
              🎭 Bảng lật mở toàn bộ danh tính
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {reveals.map((r) => {
                const isSelf = r.playerId === selfPlayerId;
                const ft = FACTION_THEME[r.faction];
                return (
                  <div
                    key={r.playerId}
                    className={`flex items-center justify-between gap-2.5 rounded-xl border px-2.5 py-2 ${
                      r.won
                        ? 'border-emerald-500/45 bg-emerald-950/25'
                        : 'border-slate-800 bg-slate-950/75'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <MatchResultPortrait
                        roleId={r.roleId}
                        roleName={r.roleName}
                        faction={r.faction}
                      />
                      <div className="min-w-0">
                        <div className="truncate font-bold text-slate-100">
                          {r.displayName}
                          {isSelf ? ' (Bạn)' : ''}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-slate-300">
                          <span className="truncate">{r.roleName}</span>
                          <span
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold border ${ft.badgeBg}`}
                          >
                            <FactionCrestSvg faction={r.faction} size={14} />
                            {ft.shortLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={r.won ? 'font-bold text-emerald-300' : 'text-slate-400'}>
                        {r.won ? '🏆 Thắng' : '—'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {r.alive
                          ? `❤️ ${r.hp}/${r.maxHp} HP`
                          : '💤 Đã loại'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Điểm nhấn trận đấu */}
          {publicGame.highlights.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                📖 Diễn biến đáng nhớ
              </h3>
              <div className="space-y-1">
                {publicGame.highlights.map((h, i) => (
                  <div
                    key={`${h.atMs}-${i}`}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-[11px]"
                  >
                    <span className="mr-1.5 font-mono text-amber-400">V{h.round}</span>
                    <strong className="text-amber-200">{h.title}:</strong>{' '}
                    <span className="text-slate-300">{h.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {postcardSlot}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-800 bg-slate-950/85 px-4 py-3">
          {onOpenLeaderboard && (
            <button
              type="button"
              data-testid="bg-result-open-leaderboard-btn"
              onClick={onOpenLeaderboard}
              className="rounded-xl border border-amber-400/50 bg-amber-950/50 px-3.5 py-2 text-xs font-bold text-amber-200 hover:bg-amber-900/60"
            >
              🏆 Bảng xếp hạng CLB
            </button>
          )}
          {!isSpectator && onPlayAgain && (
            <button
              type="button"
              data-testid="bg-play-again-btn"
              onClick={onPlayAgain}
              className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
            >
              🔄 Sẵn sàng ván mới
            </button>
          )}
          <button
            type="button"
            data-testid="bg-leave-game-btn"
            onClick={onLeaveMatch}
            className="rounded-xl bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-600"
          >
            🚪 Rời bàn chơi
          </button>
        </div>
      </div>
    </div>
  );
}
