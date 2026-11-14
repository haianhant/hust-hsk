'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/RoleCard.tsx — Thẻ Vai Trò Bí Mật & Sổ Điều Tra
// Riêng Tư của người chơi (tách biệt P0 khỏi kênh công khai; khán giả chỉ xem).
// ---------------------------------------------------------------------------

import { useState } from 'react';
import type { BoardGameFactionId, BoardGamePrivateGameView } from '../network/contracts';
import { FACTION_LABELS, ROLES_BY_ID } from '../domain/roles';

const FACTION_BADGE_CLASSES: Record<BoardGameFactionId, string> = {
  'lantern-guard': 'border-amber-400/50 bg-amber-950/70 text-amber-200',
  'mist-order': 'border-violet-400/50 bg-violet-950/70 text-violet-200',
  wanderer: 'border-emerald-400/50 bg-emerald-950/70 text-emerald-200',
};

const FACTION_ICONS: Record<BoardGameFactionId, string> = {
  'lantern-guard': '🏮',
  'mist-order': '🌫️',
  wanderer: '🧭',
};

export interface RoleCardProps {
  privateView: BoardGamePrivateGameView | null;
  isSpectator: boolean;
}

export default function RoleCard({ privateView, isSpectator }: RoleCardProps) {
  const [hiddenOnScreen, setHiddenOnScreen] = useState(false);

  if (isSpectator || !privateView) {
    return (
      <div
        data-testid="bg-spectator-role-placeholder"
        className="rounded-2xl border border-sky-500/35 bg-slate-900/90 p-3.5 text-xs text-slate-300 shadow-lg"
      >
        <div className="flex items-center gap-2 font-bold text-sky-300">
          <span>👁️</span>
          <span>Chế độ Khán giả (Chỉ xem)</span>
        </div>
        <p className="mt-2 leading-relaxed text-slate-400">
          Bạn đang theo dõi ván <strong>Bóng Đêm KTX</strong> trực tiếp. Danh tính ẩn, bài trên tay
          và ghi chú điều tra của người chơi được bảo mật tuyệt đối cho tới khi họ lật vai hoặc kết
          thúc trận đấu.
        </p>
      </div>
    );
  }

  const roleDef = ROLES_BY_ID[privateView.roleId];
  const hpPct = Math.max(0, Math.min(100, Math.round((privateView.hp / privateView.maxHp) * 100)));

  return (
    <div
      data-testid="bg-role-card"
      className="flex flex-col gap-3 rounded-2xl border border-amber-400/35 bg-slate-900/92 p-3.5 text-xs text-slate-100 shadow-lg transition-all duration-300 motion-reduce:transition-none"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
          🎭 Danh tính bí mật
        </span>
        <button
          type="button"
          data-testid="bg-toggle-role-card"
          onClick={() => setHiddenOnScreen((v) => !v)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700"
        >
          {hiddenOnScreen ? '👁️ Hiện vai' : '🙈 Che tạm'}
        </button>
      </div>

      {hiddenOnScreen ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/70 p-4 text-center text-slate-400">
          <div className="text-lg">🃏</div>
          <p className="mt-1 font-medium text-slate-300">Đã úp thẻ vai tránh nhìn trộm màn hình</p>
          <p className="mt-0.5 text-[11px]">Bấm &ldquo;Hiện vai&rdquo; khi xung quanh an toàn.</p>
        </div>
      ) : (
        <div data-testid="bg-role-card-secret" className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-amber-100">{privateView.roleName}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${FACTION_BADGE_CLASSES[privateView.faction]}`}
                >
                  <span>{FACTION_ICONS[privateView.faction]}</span>
                  <span>{FACTION_LABELS[privateView.faction]}</span>
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    privateView.revealed
                      ? 'bg-rose-950/80 text-rose-200 ring-1 ring-rose-500/40'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {privateView.revealed ? '📢 Đã lật công khai' : '🔒 Đang ẩn danh'}
                </span>
              </div>
            </div>
          </div>

          {/* Thanh HP + Khiên + Mảnh Tin */}
          <div className="space-y-1.5 rounded-xl bg-slate-950/80 p-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-rose-300">
                ❤️ HP: {privateView.hp}/{privateView.maxHp}
              </span>
              <span className="flex items-center gap-2">
                <span className="font-semibold text-sky-300">🛡️ {privateView.shield} Khiên</span>
                <span className="font-semibold text-emerald-300">
                  🧩 {privateView.fragments} Mảnh tin
                </span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${hpPct}%` }}
              />
            </div>
          </div>

          {/* Mục tiêu & Kỹ năng nhân vật */}
          <div className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 leading-relaxed">
            <div>
              <span className="font-semibold text-amber-300">🎯 Mục tiêu: </span>
              <span className="text-slate-200">{privateView.secretGoalText}</span>
            </div>
            {roleDef && (
              <div>
                <span className="font-semibold text-sky-300">⚡ {roleDef.skillName}: </span>
                <span className="text-slate-300">{roleDef.skillSummary}</span>
                {privateView.skillUsed && (
                  <span className="ml-1.5 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                    Đã kích hoạt
                  </span>
                )}
              </div>
            )}
            {privateView.wardDisplayName && (
              <div className="rounded-lg border border-emerald-500/35 bg-emerald-950/40 px-2 py-1 text-emerald-200">
                🤝 Bảo hộ ngầm: <strong>{privateView.wardDisplayName}</strong> (đã che chắn{' '}
                {privateView.shieldedForWardCount} lần)
              </div>
            )}
          </div>

          {/* Sổ tay ghi chú bí mật */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              🗒️ Sổ ghi chú bí mật ({privateView.privateNotes.length})
            </div>
            <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
              {privateView.privateNotes
                .slice()
                .reverse()
                .map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border border-slate-800/90 bg-slate-950/75 px-2.5 py-1.5 text-[11px] leading-snug text-slate-300"
                  >
                    <span className="mr-1 font-mono text-[10px] text-amber-400">V{note.round}</span>
                    <span>{note.text}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
