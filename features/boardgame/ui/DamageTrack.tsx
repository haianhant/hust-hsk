'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/DamageTrack.tsx — Thang Thương Tích Công Khai (Phase 4)
// - Mặc định compact: avatar, tên ngắn, số vết thương công khai & trạng thái
//   (lượt hiện tại / gần ngưỡng gục công khai / đã bị loại).
// - Nút mở rộng mượt (hỗ trợ Reduced Motion) để xem đầy đủ thang 0..14.
// - Không bao giờ suy đoán ngưỡng nguy hiểm từ HP bí mật chưa lật vai.
// ---------------------------------------------------------------------------

import React, { useMemo } from 'react';
import type { BoardGamePublicPlayerView } from '../../../shared/contracts/boardgame';
import { PlayerPawnToken } from './BoardGameArt';
import { toggleSelectedTargetId } from './target-selection';

export const WOUND_NOTCHES: readonly number[] = Array.from({ length: 15 }, (_, i) => i);

const SHORT_NAME_PREFIXES = new Set(['sinh', 'vien', 'sv', 'ban', 'nguoi', 'choi']);

function foldAscii(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (ch) => (ch === 'Đ' ? 'D' : 'd'))
    .toLowerCase();
}

/**
 * Rút gọn tên hiển thị gọn gàng cho chip thương tích công khai (giữ nguyên dấu tiếng Việt).
 */
export function deriveShortPlayerName(displayName: string, seatIndex = 0): string {
  const rawParts = displayName
    .trim()
    .replace(/_/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (rawParts.length === 0) return `P${seatIndex + 1}`;

  if (
    rawParts.length >= 2 &&
    /^sinhvien\d*$/i.test(foldAscii(rawParts[0])) &&
    /^\d+$/.test(rawParts[rawParts.length - 1])
  ) {
    return `SV ${rawParts[rawParts.length - 1]}`;
  }

  let parts = [...rawParts];
  while (parts.length > 1 && SHORT_NAME_PREFIXES.has(foldAscii(parts[0]))) {
    parts = parts.slice(1);
  }
  while (parts.length > 1 && /^(K\d{1,3}|\d+P|HUST|BKHN|BK)$/i.test(parts[parts.length - 1])) {
    parts = parts.slice(0, -1);
  }

  if (parts.length === 0) return `P${seatIndex + 1}`;
  if (parts.length === 1) return parts[0];

  const tail2 = `${parts[parts.length - 2]} ${parts[parts.length - 1]}`;
  return tail2.length <= 10 ? tail2 : parts[parts.length - 1];
}

export interface PublicDamageChipState {
  shortName: string;
  isTurnHolder: boolean;
  isEliminated: boolean;
  isNearThreshold: boolean;
  woundBadgeText: string;
}

/**
 * Tính trạng thái hiển thị công khai cho 1 chip thương tích.
 * Tuyệt đối chỉ dùng dữ liệu publicGame (`revealedMaxHp`, `woundsTaken`, `alive`),
 * KHÔNG đọc hoặc suy đoán từ HP tối đa bí mật khi nhân vật chưa lật vai.
 */
export function computePublicDamageChipState(
  player: BoardGamePublicPlayerView,
  activePlayerId: string | null,
): PublicDamageChipState {
  const isEliminated = !player.alive;
  const isTurnHolder = player.alive && player.playerId === activePlayerId;
  const isNearThreshold =
    player.alive &&
    (player.revealedMaxHp !== null
      ? player.revealedMaxHp - player.woundsTaken <= 3
      : player.woundsTaken >= 9);
  const woundBadgeText =
    player.revealedMaxHp !== null
      ? `${player.woundsTaken}/${player.revealedMaxHp}`
      : `${player.woundsTaken}`;

  return {
    shortName: deriveShortPlayerName(player.displayName, player.seatIndex),
    isTurnHolder,
    isEliminated,
    isNearThreshold,
    woundBadgeText,
  };
}

export interface DamageTrackProps {
  players: readonly BoardGamePublicPlayerView[];
  activePlayerId: string | null;
  selfPlayerId: string | null;
  selectedTargetId: string | null;
  selfSecretMaxHp: number | null;
  expanded: boolean;
  onToggleExpanded: () => void;
  reducedMotion: boolean;
  onSelectPlayer: (updater: (prev: string | null) => string | null) => void;
}

export const DamageTrack = React.memo(function DamageTrack({
  players,
  activePlayerId,
  selfPlayerId,
  selectedTargetId,
  selfSecretMaxHp,
  expanded,
  onToggleExpanded,
  reducedMotion,
  onSelectPlayer,
}: DamageTrackProps) {
  const playersByWoundNotch = useMemo(() => {
    const buckets: BoardGamePublicPlayerView[][] = Array.from({ length: 15 }, () => []);
    for (const p of players) {
      const notch = Math.max(0, Math.min(14, p.woundsTaken));
      buckets[notch].push(p);
    }
    return buckets;
  }, [players]);

  const drawerMotionCls = reducedMotion
    ? 'transition-none'
    : expanded
      ? 'transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none'
      : '[transition:grid-template-rows_200ms_ease-out,opacity_160ms_ease-out,visibility_0ms_linear_200ms] motion-reduce:transition-none';

  return (
    <section
      data-testid="bg-damage-track"
      data-expanded={expanded ? 'true' : 'false'}
      className="shrink-0 rounded-2xl border border-slate-800/95 bg-slate-900/90 px-2.5 py-1"
    >
      {/* HÀNG COMPACT MẶC ĐỊNH: TIÊU ĐỀ + CHIP NGƯỜI CHƠI + NÚT MỞ RỘNG THANG 0..14 */}
      <div
        data-testid="bg-damage-track-compact"
        className="flex flex-wrap lg:flex-nowrap items-center gap-1.5"
      >
        <h2 className="order-1 shrink-0 pr-1 text-xs font-extrabold uppercase tracking-wider text-slate-300 whitespace-nowrap select-none">
          🩸 Thương tích
        </h2>

        <div
          className={`order-3 w-full lg:order-2 lg:w-auto lg:flex-1 min-w-0 grid gap-1 ${
            players.length > 4
              ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8'
              : 'grid-cols-2 sm:grid-cols-4'
          }`}
        >
          {players.map((p) => {
            const chip = computePublicDamageChipState(p, activePlayerId);
            const selected = selectedTargetId === p.playerId;

            const chipToneCls = chip.isEliminated
              ? 'border-slate-800/90 bg-slate-950/60 opacity-55 grayscale cursor-default'
              : selected
                ? 'border-cyan-400 bg-cyan-950/35 ring-1 ring-cyan-400/45'
                : chip.isTurnHolder && chip.isNearThreshold
                  ? 'border-amber-400/90 bg-rose-950/40'
                  : chip.isTurnHolder
                    ? 'border-amber-400/85 bg-amber-950/25'
                    : chip.isNearThreshold
                      ? 'border-rose-400/75 bg-rose-950/35'
                      : 'border-slate-800 bg-slate-950/80 hover:border-slate-600';

            const badgeToneCls = chip.isEliminated
              ? 'text-slate-400'
              : chip.isNearThreshold
                ? 'bg-rose-500/25 text-rose-200 border border-rose-400/45'
                : chip.isTurnHolder
                  ? 'bg-amber-500/20 text-amber-100'
                  : 'bg-slate-800/90 text-slate-200';

            return (
              <button
                key={p.playerId}
                type="button"
                data-testid={`bg-wound-chip-${p.seatIndex}`}
                data-player-id={p.playerId}
                data-turn-holder={chip.isTurnHolder ? 'true' : 'false'}
                data-near-threshold={chip.isNearThreshold ? 'true' : 'false'}
                data-eliminated={chip.isEliminated ? 'true' : 'false'}
                aria-pressed={selected}
                title={`${p.displayName} · ${p.woundsTaken} vết thương${
                  p.revealedMaxHp !== null ? ` / Ngưỡng ${p.revealedMaxHp}` : ''
                }${
                  chip.isEliminated
                    ? ' (Đã bị loại)'
                    : chip.isTurnHolder
                      ? ' (Đang tới lượt)'
                      : chip.isNearThreshold
                        ? ' (Gần ngưỡng gục)'
                        : ''
                }`}
                onClick={() =>
                  onSelectPlayer((prev) => toggleSelectedTargetId(prev, p.playerId, p.alive))
                }
                className={`min-h-[30px] min-w-0 overflow-hidden px-1.5 py-0.5 rounded-xl border flex items-center justify-between gap-1 transition cursor-pointer ${chipToneCls}`}
              >
                <span className="flex items-center gap-1 min-w-0 flex-1">
                  <PlayerPawnToken
                    size="2xs"
                    elevated={false}
                    isActive={false}
                    displayName={p.displayName}
                    seatIndex={p.seatIndex}
                    alive={p.alive}
                    isSelf={p.playerId === selfPlayerId}
                    revealedFaction={p.revealedFaction}
                    revealedRoleId={p.revealedRoleId}
                  />
                  <span
                    className={`truncate text-xs ${
                      chip.isEliminated
                        ? 'line-through text-slate-400 font-medium'
                        : chip.isTurnHolder
                          ? 'text-amber-100 font-bold'
                          : chip.isNearThreshold
                            ? 'text-rose-100 font-bold'
                            : 'text-slate-200 font-semibold'
                    }`}
                  >
                    {chip.shortName}
                  </span>
                </span>
                <span
                  data-testid={`bg-wound-count-${p.seatIndex}`}
                  className={`shrink-0 rounded px-1 py-0.5 text-xs font-black tabular-nums leading-none ${badgeToneCls}`}
                >
                  {chip.isEliminated ? `💀${p.woundsTaken}` : chip.woundBadgeText}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          data-testid="bg-damage-track-toggle"
          aria-expanded={expanded}
          aria-controls="bg-damage-track-drawer"
          onClick={onToggleExpanded}
          className="order-2 ml-auto lg:order-3 lg:ml-0 shrink-0 min-h-[30px] px-2.5 py-0.5 rounded-xl border border-slate-700 bg-slate-950/90 hover:border-cyan-400/60 hover:text-cyan-100 text-xs font-bold text-slate-200 whitespace-nowrap transition cursor-pointer"
        >
          {expanded ? 'Thu gọn ▴' : 'Thang 0–14 ▾'}
        </button>
      </div>

      {/* NGĂN MỞ RỘNG MƯỢT XEM ĐẦY ĐỦ THANG THƯƠNG TÍCH 0..14 */}
      <div
        id="bg-damage-track-drawer"
        data-testid="bg-damage-track-drawer"
        aria-hidden={!expanded}
        className={`grid overflow-hidden ${drawerMotionCls} ${
          expanded ? 'grid-rows-[1fr] opacity-100 visible' : 'grid-rows-[0fr] opacity-0 invisible'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pt-1.5 mt-1 border-t border-slate-800/90 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-300">
                Thang thương tích chi tiết (0 → 14)
              </span>
              <span className="text-xs text-slate-400">
                Máu tối đa ẩn tới khi lật vai · 🎯 Mốc của bạn · 💀 Ngưỡng gục đã lộ
              </span>
            </div>
            <div
              data-testid="bg-damage-track-grid"
              className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-[minmax(86px,1.9fr)_repeat(14,minmax(0,1fr))] gap-1"
            >
              {WOUND_NOTCHES.map((notch) => {
                const occupants = playersByWoundNotch[notch];
                const isSelfMaxNotch = selfSecretMaxHp === notch;
                const revealedAtNotch = players.filter((p) => p.revealedMaxHp === notch);
                const tone = isSelfMaxNotch
                  ? 'border-cyan-400/75 bg-cyan-950/35 text-cyan-100'
                  : notch === 0
                    ? 'border-emerald-500/40 bg-emerald-950/35 text-emerald-200'
                    : notch <= 6
                      ? 'border-slate-700 bg-slate-950/80 text-slate-200'
                      : notch <= 10
                        ? 'border-amber-500/45 bg-amber-950/35 text-amber-200'
                        : 'border-rose-500/55 bg-rose-950/45 text-rose-200';
                const cellTitle = [
                  `Mốc ${notch} vết thương`,
                  isSelfMaxNotch ? 'Ngưỡng gục của bạn' : null,
                  revealedAtNotch.length > 0
                    ? `Ngưỡng gục: ${revealedAtNotch.map((p) => p.displayName).join(', ')}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ');

                return (
                  <div
                    key={notch}
                    title={cellTitle}
                    className={`min-h-[38px] rounded-lg border px-1 py-1 flex flex-col items-center justify-between gap-1 ${tone}`}
                  >
                    <span className="text-[10px] sm:text-[11px] font-black leading-none flex items-center gap-0.5 shrink-0">
                      <span>{notch === 14 ? '14💀' : notch}</span>
                      {isSelfMaxNotch && <span title="Mốc tử trận của bạn">🎯</span>}
                      {!isSelfMaxNotch && revealedAtNotch.length > 0 && notch !== 14 && (
                        <span
                          title={`Ngưỡng gục: ${revealedAtNotch.map((p) => p.displayName).join(', ')}`}
                        >
                          💀
                        </span>
                      )}
                    </span>
                    <div className="min-h-[22px] flex flex-wrap items-center justify-center -space-x-2 gap-y-0.5 pt-0.5">
                      {occupants.map((p) => (
                        <div key={p.playerId} className="origin-center scale-[0.78]">
                          <PlayerPawnToken
                            size="xs"
                            elevated={false}
                            displayName={p.displayName}
                            seatIndex={p.seatIndex}
                            alive={p.alive}
                            isActive={p.playerId === activePlayerId}
                            isSelf={p.playerId === selfPlayerId}
                            revealedFaction={p.revealedFaction}
                            revealedRoleId={p.revealedRoleId}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

export default DamageTrack;
