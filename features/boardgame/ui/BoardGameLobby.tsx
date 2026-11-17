'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/BoardGameLobby.tsx — Giao diện Sảnh CLB Board Game
// (xem 2 bàn thật, tạo trận / nhập mã mời, chọn ghế, hướng dẫn cho người mới,
// hộp thoại xác nhận rời phòng khi đang có trận). Không tạo dữ liệu giả lập.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import {
  BOARD_GAME_SEATS,
  BOARD_GAME_TABLES,
  type BoardGameTableId,
} from '../../campus/world-data';
import type {
  BoardGameLobbyPlayerView,
  BoardGameMatchSummary,
} from '../network/contracts';
import { CARDS_CATALOG } from '../domain/cards';
import {
  FACTION_LABELS,
  ROLES_CATALOG,
  getRoleDistribution,
} from '../domain/roles';
import { FACTION_THEME, RolePortraitSvg } from './BoardGameArt';
import type { BoardGameSeatOccupant } from '../world/BoardGameSeats';

export interface BoardGameLobbyProps {
  open: boolean;
  rulesOpen: boolean;
  exitConfirmOpen: boolean;
  currentSeatId: string | null;
  occupants?: readonly BoardGameSeatOccupant[];
  table1Count?: number;
  table2Count?: number;
  directoryMatches?: readonly BoardGameMatchSummary[];
  activePlayers?: readonly BoardGameLobbyPlayerView[];
  spectatorCount?: number;
  selfPlayerId?: string | null;
  isSpectator?: boolean;
  inviteCode?: string | null;
  matchStatusLabel?: string | null;
  isHost?: boolean;
  localReady?: boolean;
  serverNotice?: string | null;
  supportsOnlineLobby?: boolean;
  canStartMatch?: boolean;
  onCloseLobby: () => void;
  onCloseRules: () => void;
  onOpenLeaderboard?: () => void;
  onCancelExit: () => void;
  onConfirmExit: () => void;
  onSelectSeat: (seatId: string) => void;
  onStandUpSeat: () => void;
  onCreateMatch?: (tableId: BoardGameTableId) => void;
  onJoinByCode?: (code: string, asSpectator?: boolean) => void;
  onJoinDirectoryMatch?: (matchId: string, inviteCode: string, asSpectator: boolean) => void;
  onToggleReady?: () => void;
  onStartMatch?: () => void;
  onLeaveMatch?: () => void;
}

export default function BoardGameLobby({
  open,
  rulesOpen,
  exitConfirmOpen,
  currentSeatId,
  occupants = [],
  table1Count = 0,
  table2Count = 0,
  directoryMatches = [],
  activePlayers = [],
  spectatorCount = 0,
  selfPlayerId = null,
  isSpectator = false,
  inviteCode = null,
  matchStatusLabel = null,
  isHost = false,
  localReady = false,
  serverNotice = null,
  supportsOnlineLobby = false,
  canStartMatch = false,
  onCloseLobby,
  onCloseRules,
  onOpenLeaderboard,
  onCancelExit,
  onConfirmExit,
  onSelectSeat,
  onStandUpSeat,
  onCreateMatch,
  onJoinByCode,
  onJoinDirectoryMatch,
  onToggleReady,
  onStartMatch,
  onLeaveMatch,
}: BoardGameLobbyProps) {
  const [selectedTable, setSelectedTable] = useState<BoardGameTableId>('table-1');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [localInfoMsg, setLocalInfoMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [rulesFilter, setRulesFilter] = useState<
    'all' | 'lantern-guard' | 'mist-order' | 'wanderer' | 'cards'
  >('all');

  const occupiedMap = new Map<string, BoardGameSeatOccupant>();
  for (const occ of occupants) {
    occupiedMap.set(occ.seatId, occ);
  }

  const findFreeSeatForTable = (tableId: BoardGameTableId): string | null => {
    const candidate = BOARD_GAME_SEATS.find(
      (s) => s.tableId === tableId && !occupiedMap.has(s.seatId),
    );
    return candidate?.seatId ?? null;
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[45] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm">
          <div
            data-testid="boardgame-lobby-modal"
            className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-amber-400/35 bg-slate-900 text-slate-100 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3">
              <div>
                <h2 className="text-base font-bold text-amber-300 sm:text-lg">
                  🎲 Sảnh CLB Board Game — Bóng Đêm KTX
                </h2>
                <p className="text-xs text-slate-400">
                  Phòng Sinh Hoạt Chung KTX B5–B9 · 4–8 người/bàn · Suy luận vai trò bí mật
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onOpenLeaderboard && (
                  <button
                    type="button"
                    data-testid="bg-lobby-open-leaderboard-btn"
                    onClick={onOpenLeaderboard}
                    className="rounded-lg border border-amber-400/50 bg-amber-950/60 px-2.5 py-1 text-xs font-bold text-amber-200 hover:bg-amber-900/70 cursor-pointer"
                  >
                    🏆 Bảng xếp hạng
                  </button>
                )}
                <button
                  type="button"
                  data-testid="bg-close-lobby-btn"
                  onClick={onCloseLobby}
                  className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                >
                  ✕ Đóng
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
              {/* Trạng thái 2 bàn chơi thật */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {BOARD_GAME_TABLES.map((table) => {
                  const tableOccs = occupants.filter((o) =>
                    o.seatId.startsWith(table.tableId === 'table-1' ? 'bg-t1-' : 'bg-t2-'),
                  );
                  const passedCount =
                    table.tableId === 'table-1' ? table1Count : table2Count;
                  const localSeatCount =
                    tableOccs.length +
                    (currentSeatId &&
                    currentSeatId.startsWith(table.tableId === 'table-1' ? 'bg-t1-' : 'bg-t2-') &&
                    !tableOccs.some((o) => o.seatId === currentSeatId)
                      ? 1
                      : 0);
                  const count = Math.min(8, Math.max(localSeatCount, passedCount));
                  const matchingOpenMatch = directoryMatches.find(
                    (m) =>
                      m.tableId === table.tableId &&
                      (m.status === 'CREATED' ||
                        m.status === 'WAITING' ||
                        m.status === 'READY_CHECK') &&
                      m.playerCount < m.maxPlayers,
                  );
                  const isSel = selectedTable === table.tableId;
                  const nextFreeSeat = findFreeSeatForTable(table.tableId);

                  return (
                    <div
                      key={table.tableId}
                      onClick={() => setSelectedTable(table.tableId)}
                      className={`cursor-pointer rounded-xl border p-3 transition ${
                        isSel
                          ? 'border-amber-400 bg-amber-950/25'
                          : 'border-slate-700/80 bg-slate-800/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-200">{table.label}</span>
                        <span className="rounded-md bg-slate-950/90 px-2 py-0.5 text-xs font-bold text-slate-200">
                          {count}/8 ghế
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {count === 0
                          ? 'Bàn đang trống — ngồi vào ghế bất kỳ quanh bàn để tụ họp.'
                          : `Đang có ${count} sinh viên tại bàn.`}
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {currentSeatId &&
                        currentSeatId.startsWith(table.tableId === 'table-1' ? 'bg-t1-' : 'bg-t2-') ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStandUpSeat();
                            }}
                            className="rounded-lg bg-emerald-700/90 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
                          >
                            Đang ngồi · Đứng dậy
                          </button>
                        ) : (
                          <button
                            type="button"
                            data-testid={`bg-sit-${table.tableId}-btn`}
                            disabled={!nextFreeSeat}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (nextFreeSeat) {
                                onSelectSeat(nextFreeSeat);
                                onCloseLobby();
                              }
                            }}
                            className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-40"
                          >
                            🪑 Ngồi vào bàn này
                          </button>
                        )}
                        {!inviteCode && matchingOpenMatch && onJoinDirectoryMatch ? (
                          <button
                            type="button"
                            data-testid={`bg-join-open-${table.tableId}-btn`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onJoinDirectoryMatch(
                                matchingOpenMatch.matchId,
                                matchingOpenMatch.inviteCode,
                                false,
                              );
                            }}
                            className="rounded-lg border border-sky-400/50 bg-sky-500/20 px-2.5 py-1 text-xs font-semibold text-sky-200 hover:bg-sky-500/30"
                          >
                            🎲 Vào phòng chờ ({matchingOpenMatch.inviteCode}) ·{' '}
                            {matchingOpenMatch.playerCount}/{matchingOpenMatch.maxPlayers}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Khu vực Tạo trận & Tham gia bằng mã mời */}
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/65 p-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Phòng đấu trực tuyến (4–8 người chơi)
                </h3>

                {inviteCode ? (
                  <div className="mt-2.5 space-y-3 rounded-lg border border-emerald-500/35 bg-emerald-950/25 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-emerald-200">Mã mời phòng:</span>
                        <span
                          data-testid="bg-invite-code"
                          className="rounded bg-slate-900 px-2.5 py-0.5 font-mono text-sm font-bold tracking-widest text-amber-300"
                        >
                          {inviteCode}
                        </span>
                        <button
                          type="button"
                          data-testid="bg-copy-invite-btn"
                          onClick={() => {
                            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                              void navigator.clipboard.writeText(inviteCode).catch(() => undefined);
                              setCopiedCode(true);
                              setTimeout(() => setCopiedCode(false), 1800);
                            }
                          }}
                          className="rounded-lg bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
                        >
                          {copiedCode ? '✓ Đã sao chép' : '📋 Sao chép'}
                        </button>
                        <button
                          type="button"
                          data-testid="bg-copy-invite-link-btn"
                          onClick={() => {
                            if (typeof window === 'undefined') return;
                            const shareUrl = `${window.location.origin}${window.location.pathname}?bgInvite=${encodeURIComponent(inviteCode)}`;
                            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                              void navigator.clipboard.writeText(shareUrl).catch(() => undefined);
                            }
                            setCopiedLink(true);
                            setTimeout(() => setCopiedLink(false), 1800);
                          }}
                          className="rounded-lg bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-amber-200 hover:bg-slate-700"
                        >
                          {copiedLink ? '✓ Đã chép link' : '🔗 Link mời'}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {matchStatusLabel && (
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-200">
                            {matchStatusLabel}
                          </span>
                        )}
                        {spectatorCount > 0 && (
                          <span className="rounded bg-slate-900 px-2 py-0.5 text-[11px] text-sky-300">
                            👁 {spectatorCount} xem
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Danh sách thành viên đang ngồi bàn */}
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {activePlayers.map((p) => {
                        const isMe = selfPlayerId === p.playerId;
                        return (
                          <div
                            key={p.playerId}
                            className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs ${
                              isMe
                                ? 'border-amber-400/45 bg-amber-950/30'
                                : 'border-slate-800 bg-slate-900/75'
                            }`}
                          >
                            <span className="truncate font-medium text-slate-100">
                              <span className="mr-1.5 text-[11px] text-slate-400">
                                #{(p.seatIndex ?? 0) + 1}
                              </span>
                              {p.isHost ? '👑 ' : ''}
                              {p.displayName}
                              {isMe ? ' (Bạn)' : ''}
                            </span>
                            <span
                              className={`shrink-0 text-[11px] font-semibold ${
                                !p.connected
                                  ? 'text-rose-300'
                                  : p.ready || p.isHost
                                    ? 'text-emerald-300'
                                    : 'text-amber-300'
                              }`}
                            >
                              {!p.connected
                                ? 'Mất kết nối'
                                : p.isHost
                                  ? 'Chủ bàn'
                                  : p.ready
                                    ? '✓ Sẵn sàng'
                                    : 'Đang chờ'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!isSpectator && onToggleReady && (
                        <button
                          type="button"
                          data-testid="bg-ready-toggle-btn"
                          onClick={onToggleReady}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                            localReady
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-700 text-slate-100 hover:bg-slate-600'
                          }`}
                        >
                          {localReady ? '✓ Đã sẵn sàng' : 'Sẵn sàng'}
                        </button>
                      )}
                      {isHost && onStartMatch && (
                        <button
                          type="button"
                          data-testid="bg-start-match-btn"
                          disabled={!canStartMatch}
                          onClick={onStartMatch}
                          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-40"
                        >
                          ▶ Bắt đầu ván đấu
                        </button>
                      )}
                      {onLeaveMatch && (
                        <button
                          type="button"
                          data-testid="bg-leave-match-btn"
                          onClick={onLeaveMatch}
                          className="ml-auto rounded-lg bg-rose-700/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600"
                        >
                          Rời phòng đấu
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2.5 space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-xs text-slate-300">
                          Tạo phòng tại <strong>{selectedTable === 'table-1' ? 'Bàn 1 (Tây)' : 'Bàn 2 (Đông)'}</strong> để nhận mã mời 6 ký tự.
                        </p>
                        <button
                          type="button"
                          data-testid="bg-create-match-btn"
                          onClick={() => {
                            if (supportsOnlineLobby && onCreateMatch) {
                              onCreateMatch(selectedTable);
                            } else {
                              setLocalInfoMsg(
                                'Sảnh 3D đã sẵn sàng! Máy chủ đồng bộ trận đấu Bóng Đêm KTX đang được kích hoạt.',
                              );
                            }
                          }}
                          className="w-full rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
                        >
                          ✨ Tạo trận Bóng Đêm KTX
                        </button>
                      </div>

                      <form
                        className="space-y-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const clean = joinCodeInput.trim().toUpperCase();
                          if (!clean) return;
                          if (supportsOnlineLobby && onJoinByCode) {
                            onJoinByCode(clean, false);
                          } else {
                            setLocalInfoMsg(
                              `Đã ghi nhận mã mời ${clean}. Kết nối trực tuyến cần chạy máy chủ BoardGameRoom.`,
                            );
                          }
                        }}
                      >
                        <label className="block text-xs text-slate-300" htmlFor="bg-join-code-input">
                          Đã có mã mời từ bạn cùng phòng?
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            id="bg-join-code-input"
                            data-testid="bg-join-code-input"
                            value={joinCodeInput}
                            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase().slice(0, 8))}
                            placeholder="VD: KTX89A"
                            className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-xs uppercase text-amber-200 outline-none focus:border-amber-400"
                          />
                          <button
                            type="submit"
                            data-testid="bg-join-code-btn"
                            className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
                          >
                            Tham gia
                          </button>
                        </div>
                      </form>
                    </div>

                    {directoryMatches.length > 0 && (
                      <div className="space-y-1.5 border-t border-slate-800 pt-2.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Phòng đang mở trong CLB ({directoryMatches.length})
                        </div>
                        <div className="space-y-1.5">
                          {directoryMatches.map((m) => (
                            <div
                              key={m.matchId}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs"
                            >
                              <div className="min-w-0">
                                <span className="font-mono font-bold text-amber-300">{m.inviteCode}</span>
                                <span className="mx-1.5 text-slate-600">·</span>
                                <span className="text-slate-200">
                                  {m.tableId === 'table-1' ? 'Bàn 1' : 'Bàn 2'} · Chủ: {m.hostName}
                                </span>
                                <span className="ml-2 text-[11px] text-slate-400">
                                  ({m.playerCount}/{m.maxPlayers})
                                </span>
                              </div>
                              {onJoinDirectoryMatch && (
                                <div className="flex items-center gap-1.5">
                                  {m.status !== 'PLAYING' && m.playerCount < m.maxPlayers && (
                                    <button
                                      type="button"
                                      onClick={() => onJoinDirectoryMatch(m.matchId, m.inviteCode, false)}
                                      className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500"
                                    >
                                      Vào bàn
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    data-testid={`bg-watch-match-${m.inviteCode}`}
                                    onClick={() => onJoinDirectoryMatch(m.matchId, m.inviteCode, true)}
                                    className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-medium text-sky-300 hover:bg-slate-700"
                                  >
                                    👁 Xem
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(serverNotice || localInfoMsg) && (
                  <p className="mt-2.5 rounded-lg border border-amber-500/30 bg-amber-950/35 px-3 py-2 text-xs text-amber-200">
                    {serverNotice || localInfoMsg}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-3 py-2 text-xs text-slate-300">
                <span>🎨 Thử nghiệm đồ họa thẻ bài 2:3 &amp; Foil 3D (HUSTVerse Midnight):</span>
                <a
                  href="/boardgame-prototype"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="bg-lobby-open-prototype-link"
                  className="rounded-lg border border-emerald-400/50 bg-emerald-900/60 px-2.5 py-1 text-[11px] font-bold text-emerald-100 hover:bg-emerald-800/80 transition"
                >
                  Mở Visual Prototype ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bảng luật chơi + Danh sách 9 Nhân vật & Kho 24 Thẻ bài Bóng Đêm KTX v4 */}
      {rulesOpen && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm">
          <div
            data-testid="boardgame-rules-modal"
            className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-sky-400/35 bg-slate-900 text-slate-100 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3">
              <h2 className="text-base font-bold text-sky-300">
                📖 Luật chơi &amp; Từ điển 10 Nhân vật · Bóng Đêm KTX v4 (Chuẩn Shadow Hunters)
              </h2>
              <button
                type="button"
                data-testid="bg-close-rules-btn"
                onClick={onCloseRules}
                className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                ✕ Đóng
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs leading-relaxed text-slate-200 sm:text-sm">
              <p className="rounded-xl bg-slate-800/70 p-3 text-amber-100">
                <strong>Bối cảnh v4 (100% Luật gốc Shadow Hunters — 10 Nhân vật &amp; 48 Thẻ bài):</strong> Mỗi sinh viên
                giữ 1 <strong>Nhân vật bí mật</strong> (máu tối đa <strong>8–14 HP</strong> được giấu kín cho tới khi lật vai),
                khởi đầu với <strong>0 bài</strong> và chiến đấu trên 6 khu vực xáo ngẫu nhiên vào 3 Cụm đầu mỗi ván!
              </p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/30 p-2.5">
                  <div className="font-bold text-emerald-300">🔦 Đội Săn Đêm (3 vai)</div>
                  <p className="mt-1 text-xs text-slate-300">
                    Suy luận bằng Thẻ Khám Phá Kín và tiêu diệt toàn bộ <strong>Hội Bóng Đêm</strong>.
                  </p>
                </div>
                <div className="rounded-xl border border-rose-500/35 bg-rose-950/30 p-2.5">
                  <div className="font-bold text-rose-300">🌙 Hội Bóng Đêm (3 vai)</div>
                  <p className="mt-1 text-xs text-slate-300">
                    Thắng khi hạ gục toàn bộ <strong>Đội Săn Đêm</strong> HOẶC khi có từ <strong>3 Kẻ Độc Hành</strong> bị loại.
                  </p>
                </div>
                <div className="rounded-xl border border-amber-500/35 bg-amber-950/30 p-2.5">
                  <div className="font-bold text-amber-300">🧭 Kẻ Độc Hành (4 vai)</div>
                  <p className="mt-1 text-xs text-slate-300">
                    <strong>Hải</strong> đủ 5 Trang bị · <strong>Trang</strong> sống hết trận · <strong>Bách</strong> giết khi xác ≥ 3 · <strong>Đạt</strong> chết đầu tiên hoặc thắng cùng Săn Đêm.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <h4 className="font-bold text-amber-200">
                    Cấu trúc 1 lượt chơi (∞ Thời gian suy nghĩ tự do — xong mới sang lượt người kế):
                  </h4>
                  <ol className="mt-1 list-inside list-decimal space-y-1 text-xs text-slate-300">
                    <li>
                      <strong>Pha 1 · Tung xúc xắc di chuyển (ROLL_MOVE):</strong> Tung đồng thời <strong>1d6 + 1d4</strong> để tới ô tương ứng (2–3 Radio, 4–5 Cổng Hầm, 6 Sảnh, 8 Sân Cũ, 9 Hành Lang, 10 Sân Bóng). Ra <strong>7</strong>: chọn ô bất kỳ; trùng ô đang đứng: <strong>ĐỔ LẠI</strong>!
                    </li>
                    <li>
                      <strong>Pha 2 · Hành động khu vực (LOCATION_ACTION):</strong> Ô 2–3 rút Khám Phá (Xanh), <strong>Ô 4–5 chọn bất kỳ bộ nào</strong>, Ô 6 rút Cung Ứng (Trắng), <strong>Ô 8 rút Đột Kích (Đen)</strong>, Ô 9 gây 2 ST / hồi 1 máu, Ô 10 cướp 1 Trang bị. Rút trúng Trang bị được <strong>đặt ngửa đeo ngay</strong> không giới hạn số món!
                    </li>
                    <li>
                      <strong>Pha 3 · Giải quyết thẻ &amp; Tấn công (MAIN_ACTION):</strong> Dùng hết thẻ vừa rút ngay trong lượt, có thể đánh thường <strong>|1d6 - 1d4|</strong> cùng Cụm (trừ khi cầm Súng Bắn Đinh bắn Cụm khác; Kiếm Masamune bắt buộc phải đánh nếu có mục tiêu) rồi Kết thúc lượt.
                    </li>
                  </ol>
                </div>

                {/* Bảng chia phe theo số người chơi 4–8 SV */}
                <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-3 lg:col-span-5">
                  <h4 className="text-xs font-bold text-sky-300">⚖️ Phân bổ phe theo sĩ số (4–8 SV)</h4>
                  <div className="mt-2 space-y-1 text-[11px]">
                    {[4, 5, 6, 7, 8].map((count) => {
                      const split = getRoleDistribution(count);
                      return (
                        <div
                          key={count}
                          className="flex items-center justify-between rounded-lg bg-slate-900/90 px-2.5 py-1 text-slate-200"
                        >
                          <span className="font-bold text-amber-200">{count} người</span>
                          <span>
                            <span className="text-emerald-300">{split.lanternGuard} Săn</span> ·{' '}
                            <span className="text-rose-300">{split.mistOrder} Bóng</span> ·{' '}
                            <span className="text-amber-300">{split.wanderer} Độc hành</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Từ điển 9 Nhân vật & Kho 24 Thẻ bài */}
              <div
                data-testid="bg-rules-character-list"
                className="space-y-3 rounded-2xl border border-slate-700/80 bg-slate-950/65 p-3 sm:p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-black text-white">
                      🎭 Danh sách 10 Nhân vật &amp; Kho 48 Thẻ bài chuẩn Shadow Hunters
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Đọc trước để nắm mánh suy luận HP (8–14 HP), điều kiện thắng và phản công khi đối thủ lật vai!
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'all', label: 'Tất cả 10 vai' },
                        { id: 'lantern-guard', label: '🔦 Săn Đêm (3)' },
                        { id: 'mist-order', label: '🌙 Bóng Đêm (3)' },
                        { id: 'wanderer', label: '🧭 Độc Hành (4)' },
                        { id: 'cards', label: '🃏 48 Thẻ bài' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        data-testid={`bg-rules-tab-${tab.id}`}
                        onClick={() => setRulesFilter(tab.id)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                          rulesFilter === tab.id
                            ? 'bg-sky-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {rulesFilter === 'cards' ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {(
                      [
                        {
                          deck: 'investigation',
                          title: '🔍 Bộ Khám Phá Kín (16 lá)',
                          ring: 'border-emerald-500/35 bg-emerald-950/20',
                        },
                        {
                          deck: 'equipment',
                          title: '🧰 Bộ Cung Ứng (16 lá)',
                          ring: 'border-cyan-500/35 bg-cyan-950/20',
                        },
                        {
                          deck: 'event',
                          title: '⚡ Bộ Đột Kích (16 lá)',
                          ring: 'border-rose-500/35 bg-rose-950/20',
                        },
                      ] as const
                    ).map((grp) => (
                      <div key={grp.deck} className={`rounded-xl border p-2.5 space-y-2 ${grp.ring}`}>
                        <div className="text-xs font-extrabold text-white">{grp.title}</div>
                        <div className="space-y-1.5">
                          {CARDS_CATALOG.filter((c) => c.deck === grp.deck).map((card) => (
                            <div
                              key={card.id}
                              className="rounded-lg bg-slate-900/90 px-2.5 py-1.5 text-[11px]"
                            >
                              <div className="flex items-center justify-between gap-1 font-bold text-amber-200">
                                <span>{card.title}</span>
                                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                                  ×{card.copies}
                                </span>
                              </div>
                              <div className="text-slate-300">{card.summary}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {ROLES_CATALOG.filter(
                      (role) => rulesFilter === 'all' || role.faction === rulesFilter,
                    ).map((role) => {
                      const theme = FACTION_THEME[role.faction];
                      const cadenceLabel =
                        role.targetMode === 'passive'
                          ? 'Nội tại tự động'
                          : role.oncePerMatch
                            ? '1 lần/trận'
                            : `Hồi ${role.cooldownRounds} vòng`;
                      return (
                        <article
                          key={role.id}
                          data-testid={`bg-rules-char-${role.id}`}
                          className={`flex flex-col justify-between gap-2 rounded-xl border bg-slate-900/90 p-3 ${theme.borderClass}`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start gap-2.5">
                              <RolePortraitSvg
                                roleId={role.id}
                                faction={role.faction}
                                size={42}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${theme.badgeBg}`}
                                  >
                                    {FACTION_LABELS[role.faction]}
                                  </span>
                                  <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-black text-emerald-300">
                                    ❤️ {role.maxHp} HP
                                  </span>
                                </div>
                                <h5 className="mt-1 truncate text-sm font-black text-white">
                                  {role.name}
                                </h5>
                                <p className="text-[11px] font-medium text-slate-400">
                                  {role.title}
                                </p>
                              </div>
                            </div>

                            <div className="rounded-lg bg-slate-950/80 p-2 text-[11px]">
                              <div className="flex flex-wrap items-center justify-between gap-1">
                                <span className="font-bold text-violet-300">
                                  ✨ {role.skillName}
                                </span>
                                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                                  {cadenceLabel}
                                </span>
                              </div>
                              <p className="mt-1 leading-snug text-slate-200">{role.skillSummary}</p>
                            </div>
                          </div>

                          <p className="rounded-lg border border-white/10 bg-slate-950/50 px-2 py-1.5 text-[11px] text-amber-100/90">
                            <strong className="text-amber-300">Thắng:</strong> {role.secretGoalText}
                          </p>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>

              <p className="rounded-xl border border-emerald-400/30 bg-emerald-950/30 p-2.5 text-xs text-emerald-100">
                🔒 <strong>Bảo mật màn hình:</strong> Khi chơi online trên từng thiết bị riêng, thẻ nhân vật &amp; bài trên tay luôn hiển thị mở cho riêng bạn; đối thủ trên máy khác và khán giả không thể xem cho tới khi lật vai hoặc công bố hợp lệ.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hộp thoại xác nhận rời CLB khi đang trong ván / sảnh có trận */}
      {exitConfirmOpen && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div
            data-testid="boardgame-exit-confirm-modal"
            className="w-full max-w-sm rounded-2xl border border-rose-400/40 bg-slate-900 p-4 text-slate-100 shadow-2xl"
          >
            <h3 className="text-base font-bold text-rose-300">Xác nhận rời CLB Board Game?</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              Bạn đang có mặt trong một bàn đấu hoặc phòng chờ. Nếu rời khỏi phòng, vị trí ghế hiện tại sẽ được nhả cho người chơi khác.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                data-testid="bg-cancel-exit-btn"
                onClick={onCancelExit}
                className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                Ở lại phòng
              </button>
              <button
                type="button"
                data-testid="bg-confirm-exit-btn"
                onClick={onConfirmExit}
                className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500"
              >
                Rời CLB ra sân KTX
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
