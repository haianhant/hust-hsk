'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/GameLog.tsx — Nhật ký Trận Đấu Bóng Đêm KTX v4
// Hiển thị diễn biến rõ ràng, chữ lớn dễ theo dõi.
// ---------------------------------------------------------------------------

import React from 'react';
import type { BoardGamePublicGameView } from '@/shared/contracts/boardgame';

export interface GameLogProps {
  publicGame: BoardGamePublicGameView;
}

const LOG_STYLE_MAP: Record<string, string> = {
  victory: 'bg-amber-950/60 border-amber-400/50 text-amber-100 font-bold',
  elimination: 'bg-rose-950/60 border-rose-500/45 text-rose-100 font-semibold',
  reveal: 'bg-indigo-950/60 border-indigo-400/45 text-indigo-100 font-semibold',
  attack: 'bg-orange-950/45 border-orange-500/35 text-orange-100',
  investigate: 'bg-emerald-950/45 border-emerald-500/35 text-emerald-100',
  steal: 'bg-sky-950/50 border-sky-400/40 text-sky-100',
  dice: 'bg-slate-900/90 border-cyan-500/30 text-cyan-100',
  move: 'bg-slate-900/90 border-slate-700/70 text-slate-200',
};

export const GameLog = React.memo(function GameLog({ publicGame }: GameLogProps) {
  const recentLogs = [...publicGame.publicLog].reverse();

  return (
    <div
      data-testid="bg-game-log"
      className="rounded-2xl border border-slate-700/70 bg-slate-900/90 p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
          📜 Diễn biến Bàn Đấu
        </h3>
        <span className="text-xs font-semibold text-slate-400">
          Vòng {publicGame.round} · Lượt #{publicGame.turnNumber}
        </span>
      </div>

      {publicGame.highlights.length > 0 && (
        <div className="space-y-1.5 border-b border-slate-800 pb-2.5">
          {[...publicGame.highlights].reverse().slice(0, 3).map((hl, i) => (
            <div
              key={`${hl.atMs}-${i}`}
              className="rounded-xl bg-amber-950/40 border border-amber-500/35 px-3 py-2 text-xs"
            >
              <p className="font-bold text-amber-200">{hl.title}</p>
              <p className="text-slate-200 mt-0.5 leading-snug">{hl.detail}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {recentLogs.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có diễn biến nào.</p>
        ) : (
          recentLogs.map((entry) => {
            const cls =
              LOG_STYLE_MAP[entry.kind] ??
              'bg-slate-950/70 border-slate-800 text-slate-200';
            return (
              <div key={entry.id} className={`rounded-xl border px-3 py-2 text-sm leading-snug ${cls}`}>
                <span className="text-[11px] font-bold text-slate-400 mr-2">
                  [V{entry.round}]
                </span>
                <span>{entry.text}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

export default GameLog;
