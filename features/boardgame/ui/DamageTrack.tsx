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
 * Khi bàn đông (>= 7 người), bật `compact: true` để tránh bị cắt còn 1 ký tự ở viewport 1280×800.
 */
export function deriveShortPlayerName(
  displayName: string,
  seatIndex = 0,
  options?: { compact?: boolean },
): string {
  const compact = Boolean(options?.compact);
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
    return compact
      ? `SV${rawParts[rawParts.length - 1]}`
      : `SV ${rawParts[rawParts.length - 1]}`;
  }
  const singleSvMatch = rawParts.length === 1 ? foldAscii(rawParts[0]).match(/^sinhvien(\d+)$/i) : null;
  if (singleSvMatch) {
    return compact ? `SV${singleSvMatch[1]}` : `SV ${singleSvMatch[1]}`;
  }

  if (compact) {
    if (
      rawParts.length >= 2 &&
      /^(?:reconnect)?peer\d*$/i.test(foldAscii(rawParts[0])) &&
      /^\d+$/.test(rawParts[rawParts.length - 1])
    ) {
      return `P${rawParts[rawParts.length - 1]}`;
    }
    const singlePeerMatch =
      rawParts.length === 1 ? foldAscii(rawParts[0]).match(/^(?:reconnect)?peer(\d+)$/i) : null;
    if (singlePeerMatch) {
      return `P${singlePeerMatch[1]}`;
    }
  }

  let parts = [...rawParts];
  while (parts.length > 1 && SHORT_NAME_PREFIXES.has(foldAscii(parts[0]))) {
    parts = parts.slice(1);
  }
  while (parts.length > 1 && /^(K\d{1,3}|\d+P|HUST|BKHN|BK)$/i.test(parts[parts.length - 1])) {
    parts = parts.slice(0, -1);
  }

  if (parts.length === 0) return `P${seatIndex + 1}`;
  if (parts.length === 1) {
    if (compact && parts[0].length > 6) {
      return `${parts[0].slice(0, 5)}…`;
    }
    return parts[0];
  }

  const last = parts[parts.length - 1];
  const tail2 = `${parts[parts.length - 2]} ${last}`;
  if (!compact) {
    return tail2.length <= 10 ? tail2 : last;
  }

  if (parts.length === 2) {
    if (tail2.length <= 6) return tail2;
    const initialed = `${parts[0][0].toUpperCase()}.${last}`;
    if (last.length <= 5 && initialed.length <= 6) {
      return initialed;
    }
  }
  return last.length <= 6 ? last : `${last.slice(0, 5)}…`;
}

export interface PublicDamageChipState {
  shortName: string;
  isTurnHolder: boolean;
  isEliminated: boolean;
  isNearThreshold: boolean;
  woundBadgeText: string;
}

/**
 * Đổi màu tên người chơi theo phe KHI ĐÃ LỘ DIỆN (`revealedFaction`),
 * giữ nguyên màu trung tính khi đang ẩn vai để bảo toàn tuyệt đối P0 secrecy.
 */
export function getPublicPlayerNameFactionClass(
  player: Pick<BoardGamePublicPlayerView, 'alive' | 'lifecycleState' | 'revealedFaction'>,
): string {
  const isDormant = player.lifecycleState === 'DORMANT_PENDING_REVIVE';
  if (!player.alive && !isDormant) {
    return 'line-through text-slate-400';
  }
  if (isDormant) {
    return 'text-emerald-200';
  }
  if (player.revealedFaction === 'lantern-guard') {
    return 'text-emerald-300';
  }
  if (player.revealedFaction === 'mist-order') {
    return 'text-rose-300';
  }
  if (player.revealedFaction === 'wanderer') {
    return 'text-amber-300';
  }
  return 'text-white';
}

/**
 * Tính trạng thái hiển thị công khai cho 1 chip thương tích.
 * Tuyệt đối chỉ dùng dữ liệu publicGame (`revealedMaxHp`, `woundsTaken`, `alive`),
 * KHÔNG đọc hoặc suy đoán từ HP tối đa bí mật khi nhân vật chưa lật vai.
 */
export function computePublicDamageChipState(
  player: BoardGamePublicPlayerView,
  activePlayerId: string | null,
  options?: { compact?: boolean },
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
    shortName: deriveShortPlayerName(player.displayName, player.seatIndex, options),
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
  expanded?: boolean;
  onToggleExpanded?: () => void;
  reducedMotion?: boolean;
  onSelectPlayer: (updater: (prev: string | null) => string | null) => void;
}

export const DamageTrack = React.memo(function DamageTrack({
  players,
  activePlayerId,
  selfPlayerId,
  selectedTargetId,
  selfSecretMaxHp,
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

  return (
    <section
      data-testid="bg-damage-track"
      className="shrink-0 rounded-2xl border border-slate-800/95 bg-slate-900/90 px-2.5 py-1 space-y-1"
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-1 whitespace-nowrap shrink-0 select-none">
          <span aria-hidden="true">🩸</span>
          <span>Thang thương tích chi tiết (0 → 14)</span>
        </h2>
        <span className="text-[11px] text-slate-400 truncate">
          🎯 Mốc của bạn · 💀 Ngưỡng gục đã lộ
        </span>
      </div>
      <div
        data-testid="bg-damage-track-grid"
        className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-[minmax(108px,2.2fr)_repeat(14,minmax(0,1fr))] gap-1"
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
              className={`min-h-[34px] min-w-0 overflow-hidden rounded-lg border px-1 py-0.5 flex flex-col items-center justify-between gap-0.5 ${tone}`}
            >
              <span className="text-[11px] font-black leading-none flex items-center gap-0.5 shrink-0">
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
              <div className="h-[20px] max-w-full flex items-center justify-center -space-x-2.5 overflow-hidden">
                {occupants.map((p) => {
                  const isSelected = selectedTargetId === p.playerId;
                  return (
                    <button
                      key={p.playerId}
                      type="button"
                      aria-pressed={isSelected}
                      title={`${p.displayName} · ${p.woundsTaken} vết thương`}
                      onClick={() =>
                        onSelectPlayer((prev) => toggleSelectedTargetId(prev, p.playerId, p.alive))
                      }
                      className={`shrink-0 origin-center scale-[0.72] rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                        isSelected ? 'ring-2 ring-cyan-300' : ''
                      }`}
                    >
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
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});

export default DamageTrack;
