'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/RoleCard.tsx — Thẻ Nhân Vật Bí Mật v2 (mặc định ÚP
// để chống nhìn trộm màn hình), Khay Chứng Cứ & Sổ Giả Thuyết Phe.
// Bảo mật P0: tuyệt đối tách khỏi kênh công khai; khán giả chỉ thấy placeholder.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import type {
  BoardGameActionPayload,
  BoardGameFactionId,
  BoardGamePrivateGameView,
  BoardGamePublicGameView,
} from '../network/contracts';
import {
  ACCESS_TAG_LABELS,
  FACTION_LABELS,
  ROLES_BY_ID,
  TRACE_TAG_LABELS,
} from '../domain/roles';
import { getLocationName, getLocationShortLabel } from '../domain/rules';
import {
  FACTION_THEME,
  FactionCrestSvg,
  ROLE_VISUAL_META,
  RolePortraitSvg,
} from './BoardGameArt';

export interface RoleCardProps {
  privateView: BoardGamePrivateGameView | null;
  publicGame?: BoardGamePublicGameView | null;
  isSpectator: boolean;
  pendingAction?: boolean;
  onAction?: (action: BoardGameActionPayload) => void | Promise<unknown>;
}

const FACTION_CHOICES: BoardGameFactionId[] = ['lantern-guard', 'mist-order', 'wanderer'];

export default function RoleCard({
  privateView,
  publicGame = null,
  isSpectator,
  pendingAction = false,
  onAction,
}: RoleCardProps) {
  const [hiddenOnScreen, setHiddenOnScreen] = useState(true);
  const [hypoTargetId, setHypoTargetId] = useState('');
  const [hypoFaction, setHypoFaction] = useState<BoardGameFactionId>('mist-order');

  const unrevealedMetTargets =
    privateView && publicGame
      ? publicGame.players.filter(
          (p) =>
            p.playerId !== privateView.playerId &&
            p.alive &&
            !p.revealedFaction &&
            privateView.metPlayerIds.includes(p.playerId),
        )
      : [];

  useEffect(() => {
    if (unrevealedMetTargets.length === 0) {
      if (hypoTargetId !== '') setHypoTargetId('');
      return;
    }
    if (!unrevealedMetTargets.some((t) => t.playerId === hypoTargetId)) {
      setHypoTargetId(unrevealedMetTargets[0].playerId);
    }
  }, [hypoTargetId, unrevealedMetTargets]);

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
          Danh tính ẩn, HP gốc, chứng cứ điều tra và bài trên tay được bảo mật tuyệt đối cho tới
          khi sinh viên lật vai hoặc kết thúc trận đấu.
        </p>
      </div>
    );
  }

  const roleDef = ROLES_BY_ID[privateView.roleId];
  const roleVis = ROLE_VISUAL_META[privateView.roleId];
  const factionTheme = FACTION_THEME[privateView.faction];
  const hpPct = Math.max(0, Math.min(100, Math.round((privateView.hp / privateView.maxHp) * 100)));
  const isMyTurn =
    Boolean(publicGame) &&
    !publicGame?.winnerLabel &&
    publicGame?.activePlayerId === privateView.playerId;

  return (
    <div
      data-testid="bg-role-card"
      className={`flex flex-col gap-2.5 rounded-2xl border bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-3 text-xs text-slate-100 shadow-xl transition-all duration-300 motion-reduce:transition-none ${factionTheme.cardBorder}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
          🎭 Thẻ nhân vật bí mật
        </span>
        <button
          type="button"
          data-testid="bg-toggle-role-card"
          onClick={() => setHiddenOnScreen((v) => !v)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700"
        >
          {hiddenOnScreen ? '👁️ Lật xem bí mật' : '🙈 Úp thẻ'}
        </button>
      </div>

      {hiddenOnScreen ? (
        <div
          data-testid="bg-role-card-facedown"
          className="rounded-xl border border-dashed border-slate-700 bg-slate-950/85 p-4 text-center text-slate-400"
        >
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-2xl ring-1 ring-amber-400/35">
            🃏
          </div>
          <p className="mt-2 font-semibold text-slate-200">
            Thẻ vai đang ÚP để bảo vệ danh tính
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Bấm &ldquo;Lật xem bí mật&rdquo; khi không có ai nhìn màn hình để xem HP gốc, đặc
            điểm, chứng cứ &amp; sổ giả thuyết.
          </p>
        </div>
      ) : (
        <div data-testid="bg-role-card-secret" className="space-y-2.5">
          {/* Chân dung Class + Tên + Huy hiệu Phe */}
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
                    privateView.detained
                      ? 'bg-rose-950/90 text-rose-200 ring-1 ring-rose-500/50'
                      : privateView.revealed
                        ? 'bg-amber-950/85 text-amber-200 ring-1 ring-amber-500/45'
                        : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {privateView.detained
                    ? '🔒 Bị tạm giữ'
                    : privateView.revealed
                      ? '📢 Đã lật'
                      : '🕵️ Ẩn danh'}
                </span>
              </div>
            </div>
          </div>

          {/* Thanh HP bí mật & Ma trận đặc điểm 3x3 */}
          <div className="space-y-1.5 rounded-xl bg-slate-950/80 p-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-rose-300">
                ❤️ {privateView.hp}/{privateView.maxHp} (chỉ bạn biết)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="rounded bg-rose-950/70 px-1.5 py-0.5 font-semibold text-rose-200 ring-1 ring-rose-500/30">
                  🩹 {privateView.woundsTaken}
                </span>
                <span className="rounded bg-sky-950/80 px-1.5 py-0.5 font-semibold text-sky-300 ring-1 ring-sky-500/30">
                  🛡️ {privateView.shield}
                </span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${hpPct}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              <span className="rounded-md border border-cyan-700/50 bg-cyan-950/50 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-200">
                🧰 Dụng cụ: {ACCESS_TAG_LABELS[privateView.accessTag]}
              </span>
              <span className="rounded-md border border-indigo-700/50 bg-indigo-950/50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-200">
                🔬 Dấu vết: {TRACE_TAG_LABELS[privateView.traceTag]}
              </span>
            </div>
          </div>

          {/* Nhiệm vụ bí mật theo phe / vai */}
          {privateView.secretSabotageLocation && (
            <div
              data-testid="bg-secret-sabotage-location"
              className="rounded-xl border border-violet-500/50 bg-violet-950/50 px-2.5 py-2 text-[11px] text-violet-100"
            >
              🎯 <strong>Trạm Mục Tiêu phá hoại ngầm:</strong>{' '}
              <span className="font-bold text-amber-200">
                {getLocationName(privateView.secretSabotageLocation)}
              </span>
              <div className="mt-0.5 text-[10px] text-violet-300">
                Gài Mạch Quá Tải tại đây (pha Khảo sát), đợi sang vòng sau rồi Kích nổ!
              </div>
            </div>
          )}

          {privateView.roleId === 'lang-anh-san' && (
            <div className="rounded-xl border border-emerald-500/45 bg-emerald-950/45 px-2.5 py-2 text-[11px] text-emerald-100">
              <div>
                🗂️ <strong>Hồ sơ Phát thanh:</strong> Đã xác thực{' '}
                <strong>{privateView.verifiedSceneLocations.length}/2</strong> hiện trường ·{' '}
                <strong>{privateView.evidenceList.length}/3</strong> chứng cứ.
              </div>
              {privateView.verifiedSceneLocations.length > 0 && (
                <div className="mt-0.5 text-[10px] text-emerald-300">
                  Khu đã xác thực:{' '}
                  {privateView.verifiedSceneLocations.map((id) => getLocationShortLabel(id)).join(', ')}
                </div>
              )}
            </div>
          )}

          {privateView.wardDisplayName && (
            <div className="rounded-xl border border-emerald-500/45 bg-emerald-950/45 px-2.5 py-1.5 text-[11px] text-emerald-100">
              🤝 <strong>Mục tiêu Bảo hộ:</strong> {privateView.wardDisplayName} · Đã che/hồi{' '}
              <strong>{privateView.wardProtectionsCount}</strong> lần
              {privateView.sacrificedForWard ? ' (Đã hy sinh chắn đòn thay!)' : ''}
            </div>
          )}

          {/* Mục tiêu & Kỹ năng */}
          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/65 p-2.5">
            <div className="flex items-start gap-1.5" title={privateView.secretGoalText}>
              <span className="shrink-0">🎯</span>
              <div>
                <span className="font-bold text-amber-300">Mục tiêu thắng: </span>
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
                <p className="mt-0.5 text-[11px] leading-snug text-slate-300">
                  {roleDef.skillSummary}
                </p>
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
          </div>

          {/* Khay Chứng Cứ có điều kiện */}
          <div data-testid="bg-evidence-panel" className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
              🔎 Khay chứng cứ ({privateView.evidenceList.length})
            </div>
            {privateView.evidenceList.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/60 px-2.5 py-2 text-[11px] text-slate-500">
                Chưa có chứng cứ. Hãy Khảo sát phòng hoặc dùng Điều tra để thu thập dữ liệu.
              </div>
            ) : (
              <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1">
                {privateView.evidenceList
                  .slice()
                  .reverse()
                  .map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-lg border border-sky-800/45 bg-slate-950/90 px-2.5 py-1.5 text-[11px] leading-snug"
                    >
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="font-bold text-sky-200">{ev.subjectLabel}</span>
                        <span className="font-mono text-amber-400">V{ev.round}</span>
                      </div>
                      <p className="mt-0.5 text-slate-200">{ev.summary}</p>
                      {ev.compatibleHint && (
                        <p className="mt-0.5 text-[10px] text-slate-400">{ev.compatibleHint}</p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Sổ Giả Thuyết Phe */}
          <div
            data-testid="bg-hypothesis-panel"
            className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/75 p-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                📓 Sổ giả thuyết ({privateView.hypotheses.length}/3)
              </span>
              <span className="text-[10px] text-slate-400">Chốt trên người chưa lật</span>
            </div>

            {privateView.hypotheses.length > 0 ? (
              <div className="space-y-1">
                {privateView.hypotheses.map((h) => (
                  <div
                    key={h.targetPlayerId}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/90 px-2 py-1 text-[11px]"
                  >
                    <span className="font-semibold text-slate-100">{h.targetName}</span>
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                        FACTION_THEME[h.predictedFaction].badgeClasses
                      }`}
                    >
                      {FACTION_LABELS[h.predictedFaction]} (V{h.recordedRound})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-slate-500">
                Chưa ghi giả thuyết nào. Hãy gặp mặt/điều tra người khác để mở khóa ghi chú.
              </div>
            )}

            {isMyTurn && onAction && unrevealedMetTargets.length > 0 && (
              <div className="mt-1.5 space-y-1.5 border-t border-slate-800/80 pt-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    data-testid="bg-hypothesis-target-select"
                    value={hypoTargetId}
                    onChange={(e) => setHypoTargetId(e.target.value)}
                    disabled={pendingAction}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100"
                  >
                    {unrevealedMetTargets.map((t) => (
                      <option key={t.playerId} value={t.playerId}>
                        {t.displayName}
                      </option>
                    ))}
                  </select>
                  <select
                    data-testid="bg-hypothesis-faction-select"
                    value={hypoFaction}
                    onChange={(e) => setHypoFaction(e.target.value as BoardGameFactionId)}
                    disabled={pendingAction}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100"
                  >
                    {FACTION_CHOICES.map((fid) => (
                      <option key={fid} value={fid}>
                        {FACTION_LABELS[fid]}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  data-testid="bg-record-hypothesis-btn"
                  disabled={pendingAction || !hypoTargetId}
                  onClick={() =>
                    void onAction({
                      type: 'RECORD_HYPOTHESIS',
                      targetPlayerId: hypoTargetId,
                      predictedFaction: hypoFaction,
                    })
                  }
                  className="w-full rounded-lg bg-emerald-700/80 px-2.5 py-1.5 text-[11px] font-bold text-emerald-50 hover:bg-emerald-600 disabled:opacity-45"
                >
                  ✍️ Lưu giả thuyết lượt này
                </button>
              </div>
            )}
          </div>

          {/* Ghi chú hệ thống ngắn */}
          {privateView.privateNotes.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                🗒️ Nhật ký riêng ({privateView.privateNotes.length})
              </div>
              <div className="max-h-24 space-y-1 overflow-y-auto pr-1">
                {privateView.privateNotes
                  .slice()
                  .reverse()
                  .slice(0, 6)
                  .map((note) => (
                    <div
                      key={note.id}
                      className="rounded-lg border border-slate-800/90 bg-slate-950/80 px-2 py-1 text-[10px] leading-snug text-slate-300"
                    >
                      <span className="mr-1 font-mono text-amber-400">V{note.round}</span>
                      <span>{note.text}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
