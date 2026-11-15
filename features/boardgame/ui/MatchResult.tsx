'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/MatchResult.tsx — Màn hình Tổng Kết Ván Đấu,
// Lật Toàn Bộ Vai Trò, Dòng Thời Gian & Chơi Ván Mới.
// ---------------------------------------------------------------------------

import type { ReactNode } from 'react';
import type { BoardGamePublicGameView } from '../network/contracts';
import {
  FACTION_THEME,
  FactionCrestSvg,
  RolePortraitSvg,
} from './BoardGameArt';

export interface MatchResultProps {
  publicGame: BoardGamePublicGameView;
  selfPlayerId: string | null;
  isSpectator: boolean;
  postcardSlot?: ReactNode;
  onPlayAgain?: () => void;
  onLeaveMatch: () => void;
}

export default function MatchResult({
  publicGame,
  selfPlayerId,
  isSpectator,
  postcardSlot,
  onPlayAgain,
  onLeaveMatch,
}: MatchResultProps) {
  const reveals = publicGame.finalReveal ?? [];
  const selfWon = Boolean(
    selfPlayerId && publicGame.winnerPlayerIds.includes(selfPlayerId),
  );

  return (
    <div
      data-testid="bg-match-result-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-md"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-amber-400/50 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="border-b border-slate-800 bg-gradient-to-r from-amber-950/60 via-slate-900 to-violet-950/60 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-amber-300">
                🎲 Tổng kết ván đấu · Bóng Đêm KTX
              </div>
              <h2 className="mt-1 text-lg font-extrabold text-amber-100 sm:text-xl">
                🏆 {publicGame.winnerLabel ?? 'Kết thúc ván đấu'}
              </h2>
            </div>
            {!isSpectator && (
              <span
                className={`rounded-xl px-3 py-1 text-xs font-bold ${
                  selfWon
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {selfWon ? '✨ Bạn giành chiến thắng!' : 'Hẹn phục thù ván sau'}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-200">{publicGame.winReason}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-300">
            <span>
              ⏱️ Vòng: <strong>{Math.min(publicGame.round, publicGame.maxRounds)}/{publicGame.maxRounds}</strong>
            </span>
            <span>
              📡 Tín hiệu: <strong>{publicGame.signalProgress}/{publicGame.maxTrackValue}</strong>
            </span>
            <span>
              🌫️ Nhiễu sóng: <strong>{publicGame.mistProgress}/{publicGame.maxTrackValue}</strong>
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
                      <RolePortraitSvg roleId={r.roleId} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate font-bold text-slate-100">
                          {r.displayName}
                          {isSelf ? ' (Bạn)' : ''}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-slate-300">
                          <span className="truncate">{r.roleName}</span>
                          <span
                            className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-semibold border ${ft.badgeClasses}`}
                          >
                            <FactionCrestSvg faction={r.faction} className="h-3 w-3" />
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
                        {r.alive ? `❤️ ${r.hp} HP` : '💤 Đã loại'}
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
