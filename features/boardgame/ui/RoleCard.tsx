'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/RoleCard.tsx — Thẻ Nhân Vật Bí Mật v3 (mặc định ÚP
// để chống nhìn trộm màn hình), Tiến độ Mục tiêu Riêng & Nhật ký Manh mối.
// Bảo mật P0: tuyệt đối tách khỏi kênh công khai; khán giả chỉ thấy placeholder.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import type {
  BoardGamePrivateGameView,
  BoardGamePublicGameView,
} from '../network/contracts';
import { FACTION_LABELS, ROLES_BY_ID } from '../domain/roles';
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
  hiddenOnScreen?: boolean;
  onToggleHidden?: () => void;
}

export default function RoleCard({
  privateView,
  publicGame = null,
  isSpectator,
  hiddenOnScreen,
  onToggleHidden,
}: RoleCardProps) {
  const [internalHidden, setInternalHidden] = useState(true);
  const effectiveHidden = hiddenOnScreen ?? internalHidden;
  const handleToggle = () => {
    if (onToggleHidden) {
      onToggleHidden();
    } else {
      setInternalHidden((v) => !v);
    }
  };

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
          Danh tính ẩn, HP gốc, manh mối điều tra và bài trên tay được bảo mật tuyệt đối cho tới
          khi sinh viên tự lật vai hoặc trận đấu kết thúc.
        </p>
      </div>
    );
  }

  const roleDef = ROLES_BY_ID[privateView.roleId];
  const roleVis = ROLE_VISUAL_META[privateView.roleId];
  const factionTheme = FACTION_THEME[privateView.faction];
  const hpPct = Math.max(0, Math.min(100, Math.round((privateView.hp / privateView.maxHp) * 100)));

  const selfPublic = publicGame?.players.find((p) => p.playerId === privateView.playerId) ?? null;
  const aliveCount = publicGame ? publicGame.players.filter((p) => p.alive).length : 0;
  const eliminatedCount = publicGame
    ? publicGame.players.length - aliveCount
    : 0;
  const selfInvestigations = selfPublic?.investigationsCount ?? privateView.investigatedTargetIds.length;

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
          onClick={handleToggle}
          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700"
        >
          {effectiveHidden ? '👁️ Lật xem bí mật' : '🙈 Úp thẻ'}
        </button>
      </div>

      {effectiveHidden ? (
        <div
          data-testid="bg-role-card-facedown"
          className="rounded-xl border border-dashed border-slate-700 bg-slate-950/85 p-4 text-center text-slate-400"
        >
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-2xl ring-1 ring-amber-400/35">
            🃏
          </div>
          <p className="mt-2 font-semibold text-slate-200">
            Thẻ vai &amp; bài tay đang ÚP để bảo vệ danh tính
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Bấm &ldquo;Lật xem bí mật&rdquo; khi không có ai nhìn màn hình để xem HP gốc, kỹ năng,
            bài trên tay và manh mối điều tra.
          </p>
        </div>
      ) : (
        <div data-testid="bg-role-card-secret" className="space-y-2.5">
          {/* Chân dung nhân vật + Tên + Huy hiệu Phe */}
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
                  <span>{FACTION_LABELS[privateView.faction]}</span>
                </span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                    privateView.revealed
                      ? 'bg-amber-950/85 text-amber-200 ring-1 ring-amber-500/45'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {privateView.revealed ? '📢 Đã lật công khai' : '🕵️ Đang ẩn danh'}
                </span>
              </div>
            </div>
          </div>

          {/* Thanh HP bí mật */}
          <div className="space-y-1.5 rounded-xl bg-slate-950/80 p-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-rose-300">
                ❤️ {privateView.hp}/{privateView.maxHp} (bí mật)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="rounded bg-rose-950/70 px-1.5 py-0.5 font-semibold text-rose-200 ring-1 ring-rose-500/30">
                  🩹 {privateView.woundsTaken}
                </span>
                <span className="rounded bg-sky-950/80 px-1.5 py-0.5 font-semibold text-sky-300 ring-1 ring-sky-500/30">
                  🛡️ {privateView.tempShield}
                </span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${hpPct}%` }}
              />
            </div>
            {roleDef && (
              <div className="text-[10px] text-amber-200/85">
                🎁 <strong>Khi lật vai:</strong> {roleDef.revealBenefit}
              </div>
            )}
          </div>

          {/* Tiến độ mục tiêu riêng cho nhóm Kẻ Lang Thang */}
          {privateView.roleId === 'lang-anh-san' && (
            <div
              data-testid="bg-wanderer-progress"
              className="rounded-xl border border-emerald-500/45 bg-emerald-950/45 px-2.5 py-2 text-[11px] text-emerald-100"
            >
              <div>
                💎 <strong>Tiến độ Hải:</strong> Trang bị{' '}
                <strong>{privateView.equipped.length}/2</strong> · Điều tra{' '}
                <strong>{selfInvestigations}/3</strong>
              </div>
              <div className="mt-0.5 text-[10px] text-emerald-300">
                ≥ 2 Trang bị &amp; ≥ 2 điều tra tới cuối trận để đồng thắng; từ Vòng 5+ đủ 2 Đồ
                &amp; 3 Điều tra lật vai dùng kỹ năng để THẮNG ĐƠN ĐỘC!
              </div>
            </div>
          )}

          {privateView.roleId === 'lang-quan-sat' && (
            <div
              data-testid="bg-wanderer-progress"
              className="rounded-xl border border-emerald-500/45 bg-emerald-950/45 px-2.5 py-2 text-[11px] text-emerald-100"
            >
              <div>
                📓 <strong>Tiến độ Trang:</strong> Đã loại <strong>{eliminatedCount}</strong> người
                · Còn sống <strong>{aliveCount}</strong> · Điều tra{' '}
                <strong>{selfInvestigations}</strong>
              </div>
              <div className="mt-0.5 text-[10px] text-emerald-300">
                Đã lật vai khi bàn còn ≤ 2 người sống (và ≥ 2 người ngã) sẽ THẮNG ĐƠN ĐỘC ngay!
              </div>
            </div>
          )}

          {privateView.roleId === 'lang-cuu-ho' && privateView.protegeDisplayName && (
            <div
              data-testid="bg-wanderer-progress"
              className="rounded-xl border border-emerald-500/45 bg-emerald-950/45 px-2.5 py-2 text-[11px] text-emerald-100"
            >
              <div>
                🩺 <strong>Mục tiêu Bảo hộ:</strong> {privateView.protegeDisplayName} · Đã che/hồi{' '}
                <strong>{privateView.protectedProtegeCount}</strong> lần
              </div>
              {privateView.avengedProtegeKiller && (
                <div className="mt-0.5 text-[10px] font-semibold text-amber-200">
                  ⚔️ Đã kết liễu kẻ hạ Mục tiêu Bảo hộ!
                </div>
              )}
            </div>
          )}

          {/* Mục tiêu & Kỹ năng Chủ động / Nội tại */}
          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/65 p-2.5">
            <div className="flex items-start gap-1.5">
              <span className="shrink-0">🎯</span>
              <div>
                <span className="font-bold text-amber-300">Mục tiêu thắng: </span>
                <span className="font-medium text-slate-100">{privateView.secretGoalText}</span>
              </div>
            </div>

            {roleDef && (
              <div className="space-y-1.5 border-t border-slate-800/80 pt-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-sky-300">
                    ⚡ {roleDef.activeAbility.name}
                  </span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                    {!privateView.revealed
                      ? 'Mở khóa sau khi lật'
                      : privateView.skillCooldown > 0
                        ? `Hồi chiêu: ${privateView.skillCooldown}v`
                        : 'Sẵn sàng'}
                  </span>
                </div>
                <p className="text-[11px] leading-snug text-slate-300">
                  {roleDef.activeAbility.summary}
                </p>
                <div className="rounded-lg bg-slate-900/80 px-2 py-1 text-[10px] text-slate-300">
                  <strong className="text-emerald-300">Nội tại ({roleDef.passiveAbility.name}):</strong>{' '}
                  {roleDef.passiveAbility.summary}
                </div>
              </div>
            )}
          </div>

          {/* Trang bị đang đeo */}
          {privateView.equipped.length > 0 && (
            <div className="space-y-1 rounded-xl border border-cyan-800/45 bg-cyan-950/25 p-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                🎒 Trang bị đang mang ({privateView.equipped.length}/2)
              </div>
              {privateView.equipped.map((eq) => (
                <div key={eq.id} className="text-[11px] text-slate-200">
                  <strong className="text-cyan-200">{eq.title}:</strong>{' '}
                  <span className="text-slate-300">{eq.summary}</span>
                </div>
              ))}
            </div>
          )}

          {/* Khay Manh mối Điều tra có điều kiện */}
          <div data-testid="bg-evidence-panel" className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
              🔎 Manh mối điều tra riêng ({privateView.privateClues.length})
            </div>
            {privateView.privateClues.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/60 px-2.5 py-2 text-[11px] text-slate-500">
                Chưa có kết quả điều tra riêng. Hãy ghé Phát thanh / Bảo vệ / Hành lang B7 để rút
                thẻ Điều tra có điều kiện.
              </div>
            ) : (
              <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1">
                {privateView.privateClues
                  .slice()
                  .reverse()
                  .map((clue) => (
                    <div
                      key={clue.id}
                      className="rounded-lg border border-sky-800/45 bg-slate-950/90 px-2.5 py-1.5 text-[11px] leading-snug"
                    >
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="font-bold text-sky-200">
                          {clue.cardTitle} → {clue.targetName}
                        </span>
                        <span
                          className={`rounded px-1 py-0.5 font-mono text-[9px] font-bold ${
                            clue.outcome === 'condition-met'
                              ? 'bg-amber-950/90 text-amber-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          V{clue.round} ·{' '}
                          {clue.outcome === 'condition-met' ? 'Khớp ĐK' : 'Không khớp'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-slate-200">{clue.detail}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Nhật ký riêng */}
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
