'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/RoleCard.tsx — Thẻ Nhân Vật Bí Mật minh họa
// (chân dung class SVG, huy hiệu phe, tag kỹ năng trực quan & Sổ ghi chép riêng).
// Bảo mật P0: tuyệt đối tách khỏi kênh công khai; khán giả chỉ thấy placeholder.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import type { BoardGamePrivateGameView } from '../network/contracts';
import { ROLES_BY_ID } from '../domain/roles';
import {
  FACTION_THEME,
  FactionCrestSvg,
  ROLE_VISUAL_META,
  RolePortraitSvg,
} from './BoardGameArt';

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
          Danh tính ẩn, bài trên tay và ghi chú điều tra của sinh viên được bảo mật cho tới khi lật
          vai hoặc hết trận.
        </p>
      </div>
    );
  }

  const roleDef = ROLES_BY_ID[privateView.roleId];
  const roleVis = ROLE_VISUAL_META[privateView.roleId];
  const factionTheme = FACTION_THEME[privateView.faction];
  const hpPct = Math.max(0, Math.min(100, Math.round((privateView.hp / privateView.maxHp) * 100)));

  return (
    <div
      data-testid="bg-role-card"
      className={`flex flex-col gap-2.5 rounded-2xl border bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-3 text-xs text-slate-100 shadow-xl transition-all duration-300 motion-reduce:transition-none ${factionTheme.cardBorder}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
          🎭 Thẻ nhân vật của bạn
        </span>
        <button
          type="button"
          data-testid="bg-toggle-role-card"
          onClick={() => setHiddenOnScreen((v) => !v)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700"
        >
          {hiddenOnScreen ? '👁️ Hiện thẻ' : '🙈 Úp thẻ'}
        </button>
      </div>

      {hiddenOnScreen ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/80 p-5 text-center text-slate-400">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-2xl ring-1 ring-amber-400/30">
            🃏
          </div>
          <p className="mt-2 font-semibold text-slate-200">Đã úp thẻ vai tránh nhìn trộm</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Bấm &ldquo;Hiện thẻ&rdquo; để xem lại.</p>
        </div>
      ) : (
        <div data-testid="bg-role-card-secret" className="space-y-2.5">
          {/* Phần đầu thẻ: Chân dung Class + Tên + Huy hiệu Phe */}
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-800/90 bg-slate-950/75 p-2">
            <RolePortraitSvg roleId={privateView.roleId} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{roleVis.emblem}</span>
                <h3 className="truncate text-sm font-extrabold text-amber-100">
                  {privateView.roleName}
                </h3>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${factionTheme.badgeClasses}`}
                >
                  <FactionCrestSvg faction={privateView.faction} className="h-3.5 w-3.5" />
                  <span>{factionTheme.label}</span>
                </span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                    privateView.revealed
                      ? 'bg-rose-950/85 text-rose-200 ring-1 ring-rose-500/45'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {privateView.revealed ? '📢 Đã lật' : '🔒 Ẩn'}
                </span>
              </div>
            </div>
          </div>

          {/* Thanh HP & Chỉ số trực quan */}
          <div className="space-y-1.5 rounded-xl bg-slate-950/80 p-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-rose-300">
                ❤️ {privateView.hp}/{privateView.maxHp}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="rounded bg-sky-950/80 px-1.5 py-0.5 font-semibold text-sky-300 ring-1 ring-sky-500/30">
                  🛡️ {privateView.shield}
                </span>
                <span className="rounded bg-emerald-950/80 px-1.5 py-0.5 font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                  🧩 {privateView.fragments}
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

          {/* Mục tiêu & Kỹ năng dạng chip dễ quét */}
          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/65 p-2.5">
            <div className="flex items-start gap-1.5" title={privateView.secretGoalText}>
              <span className="shrink-0">🎯</span>
              <div>
                <span className="font-bold text-amber-300">Thắng: </span>
                <span className="font-medium text-slate-100">{roleVis.winShort}</span>
              </div>
            </div>

            {roleDef && (
              <div className="border-t border-slate-800/80 pt-1.5" title={roleDef.skillSummary}>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-sky-300">⚡ {roleDef.skillName}</span>
                  {privateView.skillUsed && (
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                      Đã dùng
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {roleVis.skillChips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-md border border-slate-700/80 bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-slate-200"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {privateView.wardDisplayName && (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/45 px-2 py-1 text-[11px] text-emerald-200">
                🤝 Bảo hộ: <strong>{privateView.wardDisplayName}</strong> · Che{' '}
                {privateView.shieldedForWardCount}×
              </div>
            )}
          </div>

          {/* Sổ tay điều tra bí mật */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              🗒️ Sổ bí mật ({privateView.privateNotes.length})
            </div>
            <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
              {privateView.privateNotes
                .slice()
                .reverse()
                .map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border border-slate-800/90 bg-slate-950/80 px-2 py-1 text-[11px] leading-snug text-slate-300"
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
