'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/GameLog.tsx — Nhật ký sự kiện công khai & Dấu mốc
// nổi bật trong suốt ván Bóng Đêm KTX.
// ---------------------------------------------------------------------------

import type {
  BoardGameHighlightEntry,
  BoardGamePublicLogEntry,
} from '../network/contracts';

const KIND_COLORS: Record<BoardGamePublicLogEntry['kind'], string> = {
  system: 'text-slate-300 border-slate-700/70',
  move: 'text-sky-200 border-sky-700/50',
  scene: 'text-teal-200 border-teal-700/60',
  draw: 'text-amber-200 border-amber-700/50',
  tactic: 'text-cyan-200 border-cyan-700/50',
  skill: 'text-fuchsia-200 border-fuchsia-600/60',
  attack: 'text-rose-200 border-rose-600/60',
  investigate: 'text-indigo-200 border-indigo-600/50',
  confront: 'text-yellow-100 border-amber-500/75 bg-amber-950/35',
  reveal: 'text-orange-200 border-orange-500/60',
  incident: 'text-rose-300 border-rose-500/70 bg-rose-950/30',
  elimination: 'text-rose-300 border-rose-500/80 bg-rose-950/40',
  timeout: 'text-amber-300 border-amber-600/60',
  victory: 'text-yellow-200 border-yellow-400/70 bg-amber-950/50',
};

export interface GameLogProps {
  logs: readonly BoardGamePublicLogEntry[];
  highlights: readonly BoardGameHighlightEntry[];
}

export default function GameLog({ logs, highlights }: GameLogProps) {
  return (
    <div
      data-testid="bg-game-log"
      className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 text-xs text-slate-200 shadow-lg"
    >
      {highlights.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
            ✨ Điểm nhấn trận đấu
          </div>
          <div className="max-h-28 space-y-1 overflow-y-auto pr-1">
            {highlights
              .slice()
              .reverse()
              .map((h, i) => (
                <div
                  key={`${h.atMs}-${i}`}
                  className="rounded-lg border border-amber-500/30 bg-amber-950/25 px-2.5 py-1.5 text-[11px]"
                >
                  <span className="mr-1.5 font-mono text-[10px] text-amber-400">V{h.round}</span>
                  <strong className="text-amber-200">{h.title}:</strong>{' '}
                  <span className="text-slate-300">{h.detail}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            📜 Nhật ký công khai ({logs.length})
          </span>
        </div>
        <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {logs
            .slice()
            .reverse()
            .map((entry) => (
              <div
                key={entry.id}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] leading-snug ${
                  KIND_COLORS[entry.kind] ?? 'border-slate-800 text-slate-300'
                }`}
              >
                <span className="mr-1.5 font-mono text-[10px] text-slate-400">V{entry.round}</span>
                <span>{entry.text}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
