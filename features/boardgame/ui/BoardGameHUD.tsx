'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/BoardGameHUD.tsx — Thanh trạng thái & điều khiển
// nổi trong Phòng Sinh Hoạt Chung CLB Board Game (Desktop + Mobile 390x844).
// ---------------------------------------------------------------------------

import { getBoardGameSeatById, type BoardGameTableId } from '../../campus/world-data';

export interface BoardGameHUDProps {
  seatId: string | null;
  table1Count: number;
  table2Count: number;
  lobbyOpen: boolean;
  rulesOpen: boolean;
  hasActiveMatch?: boolean;
  onToggleLobby: () => void;
  onToggleRules: () => void;
  onStandUpSeat: () => void;
  onSitQuickSeat?: (tableId: BoardGameTableId) => void;
  onRequestExit: () => void;
}

export default function BoardGameHUD({
  seatId,
  table1Count,
  table2Count,
  lobbyOpen,
  rulesOpen,
  hasActiveMatch = false,
  onToggleLobby,
  onToggleRules,
  onStandUpSeat,
  onRequestExit,
}: BoardGameHUDProps) {
  const activeSeat = getBoardGameSeatById(seatId);

  return (
    <div
      data-testid="boardgame-club-hud"
      className="pointer-events-none fixed inset-x-0 top-14 z-30 flex flex-col items-center gap-2 px-3 sm:top-16"
    >
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-amber-400/35 bg-slate-950/88 px-3 py-2 text-xs text-amber-50 shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 font-semibold text-amber-300">
          <span>🎲</span>
          <span className="truncate">CLB Board Game KTX · Bóng Đêm KTX</span>
        </span>

        <span className="hidden h-3.5 w-px bg-slate-700 sm:inline-block" />

        <span className="rounded-lg bg-slate-900/90 px-2 py-0.5 text-[11px] text-slate-200">
          Bàn 1: <strong>{table1Count}/8</strong> · Bàn 2: <strong>{table2Count}/8</strong>
        </span>

        {activeSeat && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-950/90 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/40">
            🪑 {activeSeat.label}
          </span>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
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
    </div>
  );
}
