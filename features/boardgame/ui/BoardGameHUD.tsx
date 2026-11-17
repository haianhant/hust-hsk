'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/BoardGameHUD.tsx — Thanh trạng thái & điều khiển
// nổi trong Phòng Sinh Hoạt Chung CLB Board Game (Desktop + Mobile 390x844).
// Hỗ trợ nút Sẵn sàng / ▶ Bắt đầu ván đấu & mã mời ngay trên HUD ngoài sảnh.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { getBoardGameSeatById, type BoardGameTableId } from '../../campus/world-data';

export interface BoardGameHUDProps {
  seatId: string | null;
  table1Count: number;
  table2Count: number;
  lobbyOpen: boolean;
  rulesOpen: boolean;
  leaderboardOpen?: boolean;
  hasActiveMatch?: boolean;
  inviteCode?: string | null;
  matchStatusLabel?: string | null;
  isSpectator?: boolean;
  isHost?: boolean;
  localReady?: boolean;
  canStartMatch?: boolean;
  seatedPlayerCount?: number;
  readyPlayerCount?: number;
  gameActive?: boolean;
  onToggleLobby: () => void;
  onToggleRules: () => void;
  onToggleLeaderboard?: () => void;
  onStandUpSeat: () => void;
  onSitQuickSeat?: (tableId: BoardGameTableId) => void;
  onToggleReady?: () => void;
  onStartMatch?: () => void;
  onRequestExit: () => void;
}

export default function BoardGameHUD({
  seatId,
  table1Count,
  table2Count,
  lobbyOpen,
  rulesOpen,
  leaderboardOpen = false,
  hasActiveMatch = false,
  inviteCode = null,
  matchStatusLabel = null,
  isSpectator = false,
  isHost = false,
  localReady = false,
  canStartMatch = false,
  seatedPlayerCount = 0,
  readyPlayerCount = 0,
  gameActive = false,
  onToggleLobby,
  onToggleRules,
  onToggleLeaderboard,
  onStandUpSeat,
  onToggleReady,
  onStartMatch,
  onRequestExit,
}: BoardGameHUDProps) {
  const [copiedInvite, setCopiedInvite] = useState(false);
  if (gameActive) {
    // Ẩn thanh HUD ngoài sảnh khi GameBoard đang mở toàn màn hình để không đè tab/header trên Mobile & Desktop.
    return null;
  }
  const activeSeat = getBoardGameSeatById(seatId);
  const showDirectControls = Boolean(inviteCode && !gameActive);

  const startButtonLabel = canStartMatch
    ? '▶ Bắt đầu ván đấu'
    : seatedPlayerCount < 4
      ? `▶ Bắt đầu (${seatedPlayerCount}/4 SV)`
      : `▶ Chờ sẵn sàng (${readyPlayerCount}/${seatedPlayerCount})`;

  return (
    <div
      data-testid="boardgame-club-hud"
      className="pointer-events-none fixed inset-x-0 top-28 z-[41] flex flex-col items-center gap-1.5 px-2 sm:top-16 sm:px-3"
    >
      <div className="pointer-events-auto flex w-auto max-w-[calc(100vw-16px)] flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-amber-400/35 bg-slate-950/90 px-3 py-2 text-xs text-amber-50 shadow-xl backdrop-blur-md sm:gap-2">
        <span className="inline-flex items-center gap-1.5 font-semibold text-amber-300">
          <span>🎲</span>
          <span className="truncate">CLB Board Game KTX · Bóng Đêm KTX</span>
        </span>

        <span className="hidden h-3.5 w-px bg-slate-700 sm:inline-block" />

        <span className="rounded-lg bg-slate-900/90 px-2 py-0.5 text-[11px] text-slate-200">
          Bàn 1: <strong>{table1Count}/8</strong> · Bàn 2: <strong>{table2Count}/8</strong>
        </span>

        {isSpectator && (
          <span className="rounded-lg bg-sky-950/90 px-2 py-0.5 text-[11px] font-semibold text-sky-300 ring-1 ring-sky-500/35">
            👁 Khán giả
          </span>
        )}

        {activeSeat && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-950/90 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/40">
            🪑 {activeSeat.label}
          </span>
        )}

        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <button
            type="button"
            data-testid="bg-toggle-lobby-btn"
            onClick={onToggleLobby}
            className={`rounded-xl px-2.5 py-1 text-[11px] font-semibold transition ${
              lobbyOpen
                ? 'bg-amber-500 text-slate-950'
                : 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
            }`}
          >
            {lobbyOpen ? 'Đóng sảnh bàn' : '📋 Sảnh & Mã mời'}
          </button>

          <button
            type="button"
            data-testid="bg-toggle-rules-btn"
            onClick={onToggleRules}
            className={`rounded-xl px-2.5 py-1 text-[11px] font-semibold transition ${
              rulesOpen
                ? 'bg-sky-500 text-slate-950'
                : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
            }`}
          >
            📖 Luật chơi
          </button>

          {onToggleLeaderboard && (
            <button
              type="button"
              data-testid="bg-toggle-leaderboard-btn"
              onClick={onToggleLeaderboard}
              className={`rounded-xl px-2.5 py-1 text-[11px] font-semibold transition ${
                leaderboardOpen
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-amber-200 hover:bg-slate-700'
              }`}
            >
              🏆 Xếp hạng
            </button>
          )}

          {activeSeat && (
            <button
              type="button"
              data-testid="bg-stand-up-btn"
              onClick={onStandUpSeat}
              className="rounded-xl bg-emerald-600/90 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500"
            >
              🧍 Đứng dậy
            </button>
          )}

          <button
            type="button"
            data-testid="bg-exit-lounge-btn"
            onClick={onRequestExit}
            className="rounded-xl bg-rose-600/85 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-500"
            title={hasActiveMatch ? 'Cần xác nhận trước khi rời ván đang hoạt động' : 'Ra sân KTX'}
          >
            🚪 Rời CLB
          </button>
        </div>
      </div>

      {/* Hàng điều khiển trực tiếp ngoài HUD khi đã ngồi/vào phòng chờ (không cần mở modal) */}
      {showDirectControls && inviteCode && (
        <div
          data-testid="bg-hud-match-bar"
          className="pointer-events-auto flex w-auto max-w-[calc(100vw-16px)] flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-emerald-400/40 bg-slate-950/95 px-3 py-1.5 text-xs text-slate-100 shadow-xl backdrop-blur-md sm:gap-2"
        >
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-950/85 px-2 py-0.5 text-[11px] text-amber-100 ring-1 ring-amber-400/40">
            <span className="text-amber-300/90">Mã mời:</span>
            <strong
              data-testid="bg-hud-invite-code"
              className="font-mono tracking-wider text-amber-300"
            >
              {inviteCode}
            </strong>
          </span>

          <button
            type="button"
            data-testid="bg-hud-copy-link-btn"
            onClick={() => {
              if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.clipboard) return;
              const shareUrl = `${window.location.origin}${window.location.pathname}?bgInvite=${encodeURIComponent(inviteCode)}`;
              void navigator.clipboard.writeText(shareUrl).catch(() => undefined);
              setCopiedInvite(true);
              window.setTimeout(() => setCopiedInvite(false), 1800);
            }}
            className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-semibold text-amber-200 hover:bg-slate-700"
          >
            {copiedInvite ? '✓ Đã chép link' : '🔗 Chép link mời'}
          </button>

          <span className="rounded-lg bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-slate-700">
            {readyPlayerCount}/{seatedPlayerCount} sẵn sàng
            {matchStatusLabel ? ` · ${matchStatusLabel}` : ''}
          </span>

          {!isSpectator && !isHost && onToggleReady && (
            <button
              type="button"
              data-testid="bg-hud-ready-btn"
              onClick={onToggleReady}
              className={`rounded-xl px-3 py-1 text-[11px] font-bold shadow transition ${
                localReady
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
              }`}
            >
              {localReady ? '✓ Đã sẵn sàng' : '✋ Sẵn sàng'}
            </button>
          )}

          {!isSpectator && isHost && onStartMatch && (
            <>
              <span className="rounded-lg bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-400/35">
                👑 Chủ bàn
              </span>
              <button
                type="button"
                data-testid="bg-hud-start-btn"
                disabled={!canStartMatch}
                onClick={onStartMatch}
                className="rounded-xl bg-amber-500 px-3 py-1 text-[11px] font-extrabold text-slate-950 shadow transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-400"
              >
                {startButtonLabel}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
