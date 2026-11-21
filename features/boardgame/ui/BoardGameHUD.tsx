'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/BoardGameHUD.tsx — Thanh trạng thái & điều khiển
// nổi trong Phòng Sinh Hoạt Chung CLB Board Game (Desktop + Mobile 390x844).
// Phase 8A.1: Tích hợp bộ chọn Chế độ chơi (Ruleset Selector) đồng bộ trực tiếp
// từ server ngay trên HUD phòng chờ — không cần mở modal "Sảnh & Mã mời".
// ---------------------------------------------------------------------------

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type {
  BoardGameMatchStatus,
  BoardGameRulesetId,
  BoardGameServerRulesetCapability,
} from '../../../shared/contracts/boardgame';
import { getBoardGameSeatById, type BoardGameTableId } from '../../campus/world-data';
import {
  canRequestRulesetOption,
  formatRulesetDisplayLabel,
  formatRulesetReleaseBadge,
  formatRulesetTriggerSummary,
  resolveRulesetSelectorState,
  type RulesetConnectionState,
} from './ruleset-selector-helpers';

export interface BoardGameHUDProps {
  seatId: string | null;
  table1Count: number;
  table2Count: number;
  lobbyOpen: boolean;
  rulesOpen: boolean;
  leaderboardOpen?: boolean;
  hasActiveMatch?: boolean;
  inviteCode?: string | null;
  matchStatus?: BoardGameMatchStatus | null;
  matchStatusLabel?: string | null;
  rulesetId?: BoardGameRulesetId;
  pendingRulesetId?: BoardGameRulesetId | null;
  serverRulesets?: readonly BoardGameServerRulesetCapability[];
  connectionState?: RulesetConnectionState;
  rulesetNotice?: string | null;
  rulesetError?: string | null;
  isSpectator?: boolean;
  isHost?: boolean;
  localReady?: boolean;
  canStartMatch?: boolean;
  seatedPlayerCount?: number;
  readyPlayerCount?: number;
  botCount?: number;
  gameActive?: boolean;
  onToggleLobby: () => void;
  onToggleRules: () => void;
  onToggleLeaderboard?: () => void;
  onStandUpSeat: () => void;
  onSitQuickSeat?: (tableId: BoardGameTableId) => void;
  onSelectRuleset?: (
    rulesetId: BoardGameRulesetId,
  ) => void | Promise<{ ok: boolean; reason?: string }>;
  onAddBot?: () => void;
  onRemoveBot?: () => void;
  onToggleReady?: () => void;
  onStartMatch?: () => void;
  onRequestExit: () => void;
}

export default function BoardGameHUD({
  seatId,
  table1Count,
  table2Count,
  lobbyOpen,
  rulesOpen,
  leaderboardOpen = false,
  hasActiveMatch = false,
  inviteCode = null,
  matchStatus = null,
  matchStatusLabel = null,
  rulesetId = 'classic',
  pendingRulesetId = null,
  serverRulesets,
  connectionState = 'connected',
  rulesetNotice = null,
  rulesetError = null,
  isSpectator = false,
  isHost = false,
  localReady = false,
  canStartMatch = false,
  seatedPlayerCount = 0,
  readyPlayerCount = 0,
  botCount = 0,
  gameActive = false,
  onToggleLobby,
  onToggleRules,
  onToggleLeaderboard,
  onStandUpSeat,
  onSelectRuleset,
  onAddBot,
  onRemoveBot,
  onToggleReady,
  onStartMatch,
  onRequestExit,
}: BoardGameHUDProps) {
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const selectorWrapRef = useRef<HTMLDivElement>(null);
  const triggerBtnRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  const selectorState = resolveRulesetSelectorState({
    rulesetId,
    serverRulesets,
    matchStatus,
    isHost,
    isSpectator,
    pendingRulesetId,
    hasSelectHandler: Boolean(onSelectRuleset),
    connectionState,
  });

  // Tự đóng dropdown khi mất quyền chỉnh sửa (trận bắt đầu, mất kết nối, mở modal Sảnh...)
  useEffect(() => {
    if (!selectorState.canOpenSelector || lobbyOpen || gameActive) {
      setMenuOpen(false);
    }
  }, [selectorState.canOpenSelector, lobbyOpen, gameActive]);

  // Đóng dropdown khi bấm ra ngoài hoặc nhấn Escape toàn cục
  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerOutside = (ev: MouseEvent | TouchEvent) => {
      if (selectorWrapRef.current && !selectorWrapRef.current.contains(ev.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleDocKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        setMenuOpen(false);
        triggerBtnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handlePointerOutside);
    document.addEventListener('touchstart', handlePointerOutside, { passive: true });
    document.addEventListener('keydown', handleDocKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerOutside);
      document.removeEventListener('touchstart', handlePointerOutside);
      document.removeEventListener('keydown', handleDocKeyDown, true);
    };
  }, [menuOpen]);

  // Tập trung bàn phím vào tùy chọn đang active khi mở dropdown
  useEffect(() => {
    if (!menuOpen) return;
    const targetBtn = optionRefs.current[focusedIndex];
    if (targetBtn && !targetBtn.disabled) {
      targetBtn.focus();
    }
  }, [menuOpen, focusedIndex]);

  if (gameActive) {
    // Ẩn thanh HUD ngoài sảnh khi GameBoard đang mở toàn màn hình để không đè tab/header trên Mobile & Desktop.
    return null;
  }

  const activeSeat = getBoardGameSeatById(seatId);
  const showDirectControls = Boolean(inviteCode && !gameActive);
  const activeRs = selectorState.activeRuleset;
  const activeBadge = formatRulesetReleaseBadge(activeRs.status);
  const activeDisplayName = formatRulesetDisplayLabel(activeRs);
  const activeSummary = formatRulesetTriggerSummary(activeRs);
  const pendingDisplayName = selectorState.pendingRuleset
    ? formatRulesetDisplayLabel(selectorState.pendingRuleset)
    : null;

  const findNextSelectableIndex = (startIdx: number, step: 1 | -1): number => {
    const list = selectorState.effectiveRulesets;
    const n = list.length;
    for (let offset = 1; offset <= n; offset += 1) {
      const idx = (startIdx + step * offset + n) % n;
      if (list[idx]?.selectable) return idx;
    }
    return startIdx;
  };

  const openMenuAtActive = () => {
    if (!selectorState.canOpenSelector) return;
    const currentIdx = Math.max(
      0,
      selectorState.effectiveRulesets.findIndex((r) => r.id === activeRs.id),
    );
    setFocusedIndex(currentIdx);
    setMenuOpen(true);
  };

  const handleSelectOption = (option: BoardGameServerRulesetCapability) => {
    if (!onSelectRuleset) return;
    if (option.id === activeRs.id) {
      setMenuOpen(false);
      triggerBtnRef.current?.focus();
      return;
    }
    if (!canRequestRulesetOption(selectorState, option)) return;
    setMenuOpen(false);
    triggerBtnRef.current?.focus();
    void onSelectRuleset(option.id);
  };

  const handleTriggerKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!selectorState.canOpenSelector) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      if (menuOpen) {
        setMenuOpen(false);
      } else {
        openMenuAtActive();
      }
    }
  };

  const handleMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const list = selectorState.effectiveRulesets;
    if (e.key === 'Escape') {
      e.preventDefault();
      setMenuOpen(false);
      triggerBtnRef.current?.focus();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => findNextSelectableIndex(prev, 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => findNextSelectableIndex(prev, -1));
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      const firstIdx = list.findIndex((r) => r.selectable);
      if (firstIdx >= 0) setFocusedIndex(firstIdx);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      for (let i = list.length - 1; i >= 0; i -= 1) {
        if (list[i].selectable) {
          setFocusedIndex(i);
          break;
        }
      }
      return;
    }
    if (e.key === 'Tab') {
      setMenuOpen(false);
    }
  };

  const startButtonLabel = canStartMatch
    ? `▶ Bắt đầu · ${activeDisplayName}`
    : seatedPlayerCount < 4
      ? `▶ Bắt đầu (${seatedPlayerCount}/4 SV)`
      : `▶ Chờ sẵn sàng (${readyPlayerCount}/${seatedPlayerCount})`;

  return (
    <div
      data-testid="boardgame-club-hud"
      className="pointer-events-none fixed inset-x-0 top-28 z-[41] flex flex-col items-center gap-1.5 px-2 sm:top-16 sm:px-3"
    >
      <div className="pointer-events-auto flex w-auto max-w-[calc(100vw-16px)] flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-amber-400/35 bg-slate-950/90 px-3 py-2 text-xs text-amber-50 shadow-xl backdrop-blur-md sm:gap-2">
        <span className="inline-flex items-center gap-1.5 font-semibold text-amber-300">
          <span>🎲</span>
          <span className="truncate">CLB Board Game KTX · Bóng Đêm KTX</span>
        </span>

        <span className="hidden h-3.5 w-px bg-slate-700 sm:inline-block" />

        <span className="rounded-lg bg-slate-900/90 px-2 py-0.5 text-[11px] text-slate-200">
          Bàn 1: <strong>{table1Count}/8</strong> · Bàn 2: <strong>{table2Count}/8</strong>
        </span>

        {isSpectator && (
          <span className="rounded-lg bg-sky-950/90 px-2 py-0.5 text-[11px] font-semibold text-sky-300 ring-1 ring-sky-500/35">
            👁 Khán giả
          </span>
        )}

        {activeSeat && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-950/90 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/40">
            🪑 {activeSeat.label}
          </span>
        )}

        <div className="flex flex-wrap items-center justify-center gap-1.5">
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

          {onToggleLeaderboard && (
            <button
              type="button"
              data-testid="bg-toggle-leaderboard-btn"
              onClick={onToggleLeaderboard}
              className={`rounded-xl px-2.5 py-1 text-[11px] font-semibold transition ${
                leaderboardOpen
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-amber-200 hover:bg-slate-700'
              }`}
            >
              🏆 Xếp hạng
            </button>
          )}

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

      {/* Hàng điều khiển trực tiếp ngoài HUD khi đã ngồi/vào phòng chờ (không cần mở modal) */}
      {showDirectControls && inviteCode && (
        <div
          data-testid="bg-hud-match-bar"
          data-ruleset-id={activeRs.id}
          data-ruleset-locked={selectorState.lockedByMatch ? 'true' : 'false'}
          className="pointer-events-auto relative flex w-auto max-w-[calc(100vw-16px)] flex-wrap items-center justify-center gap-1.5 overflow-visible rounded-2xl border border-emerald-400/40 bg-slate-950/95 px-2.5 py-1.5 text-xs text-slate-100 shadow-xl backdrop-blur-md sm:gap-2 sm:px-3"
        >
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-950/85 px-2 py-0.5 text-[11px] text-amber-100 ring-1 ring-amber-400/40">
            <span className="text-amber-300/90">Mã mời:</span>
            <strong
              data-testid="bg-hud-invite-code"
              className="font-mono tracking-wider text-amber-300"
            >
              {inviteCode}
            </strong>
          </span>

          <button
            type="button"
            data-testid="bg-hud-copy-link-btn"
            onClick={() => {
              if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.clipboard) return;
              const shareUrl = `${window.location.origin}${window.location.pathname}?bgInvite=${encodeURIComponent(inviteCode)}`;
              void navigator.clipboard.writeText(shareUrl).catch(() => undefined);
              setCopiedInvite(true);
              window.setTimeout(() => setCopiedInvite(false), 1800);
            }}
            className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-semibold text-amber-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            {copiedInvite ? '✓ Đã chép link' : '🔗 Chép link mời'}
          </button>

          {/* Bộ chọn / Hiển thị Chế độ chơi (Ruleset Selector — Đồng bộ từ Server) */}
          <div
            ref={selectorWrapRef}
            data-testid="bg-hud-ruleset-selector"
            onPointerDown={(e) => {
              if (menuOpen) e.stopPropagation();
            }}
            onWheel={(e) => {
              if (menuOpen) e.stopPropagation();
            }}
            className="relative"
          >
            {selectorState.canOpenSelector ? (
              <button
                ref={triggerBtnRef}
                type="button"
                data-testid="bg-hud-ruleset-trigger"
                aria-haspopup="listbox"
                aria-expanded={menuOpen}
                aria-controls={menuOpen ? menuId : undefined}
                aria-label={selectorState.ariaLabel}
                disabled={selectorState.isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  if (menuOpen) {
                    setMenuOpen(false);
                  } else {
                    openMenuAtActive();
                  }
                }}
                onKeyDown={handleTriggerKeyDown}
                className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-bold shadow transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-wait disabled:opacity-80 ${
                  activeRs.isBeta
                    ? 'border-violet-400/75 bg-violet-950/75 text-violet-100 hover:border-violet-300 hover:bg-violet-900/75'
                    : 'border-amber-400/65 bg-slate-900/95 text-amber-100 hover:border-amber-300 hover:bg-slate-800'
                }`}
              >
                <span aria-hidden="true">🎮</span>
                <span className="text-slate-300 font-semibold">Chế độ chơi:</span>
                <span
                  data-testid="bg-hud-ruleset-active-label"
                  className="font-extrabold text-white"
                >
                  {selectorState.isPending && pendingDisplayName
                    ? `Đang chuyển ${pendingDisplayName}...`
                    : activeSummary}
                </span>
                <span
                  data-testid="bg-hud-ruleset-active-badge"
                  className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
                    activeRs.status === 'stable'
                      ? 'bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-400/40'
                      : activeRs.status === 'beta'
                        ? 'bg-violet-500/30 text-violet-200 ring-1 ring-violet-400/50'
                        : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {activeBadge}
                </span>
                <span aria-hidden="true" className="text-[10px] text-amber-300">
                  {selectorState.isPending ? '⏳' : menuOpen ? '▴' : '▾'}
                </span>
              </button>
            ) : (
              <div
                data-testid="bg-hud-ruleset-readonly"
                role="status"
                aria-label={selectorState.ariaLabel}
                title={selectorState.readOnlyReason ?? activeRs.description}
                className={`inline-flex min-h-[30px] flex-wrap items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-semibold ${
                  activeRs.isBeta
                    ? 'border-violet-400/50 bg-violet-950/55 text-violet-100'
                    : 'border-slate-700/90 bg-slate-900/90 text-slate-100'
                }`}
              >
                <span aria-hidden="true">{selectorState.lockedByMatch ? '🔒' : '🎮'}</span>
                <span className="text-slate-300">Chế độ chơi:</span>
                <strong
                  data-testid="bg-hud-ruleset-active-label"
                  className="font-extrabold text-white"
                >
                  {activeSummary}
                </strong>
                <span
                  data-testid="bg-hud-ruleset-active-badge"
                  className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
                    activeRs.status === 'stable'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : activeRs.status === 'beta'
                        ? 'bg-violet-500/25 text-violet-200'
                        : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {activeBadge}
                </span>
                {selectorState.readOnlyReason && (
                  <span
                    data-testid="bg-hud-ruleset-hint"
                    className="text-[10px] font-medium text-slate-400"
                  >
                    · {selectorState.readOnlyReason}
                  </span>
                )}
              </div>
            )}

            {/* Dropdown danh sách 4 chế độ chơi từ server capabilities (z-[70], chống tràn Mobile 390x844) */}
            {menuOpen && selectorState.canOpenSelector && (
              <div
                id={menuId}
                role="listbox"
                aria-label="Chọn chế độ chơi Bóng Đêm KTX"
                data-testid="bg-hud-ruleset-menu"
                onKeyDown={handleMenuKeyDown}
                onPointerDown={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
                className="fixed left-1/2 top-auto z-[70] mt-2 w-[min(21rem,calc(100vw-20px))] -translate-x-1/2 rounded-2xl border border-amber-400/50 bg-slate-950 p-2 text-left text-xs text-slate-100 shadow-[0_20px_56px_rgba(2,6,23,0.96)] ring-1 ring-white/10 sm:absolute sm:left-1/2 sm:top-full sm:mt-1.5 sm:w-80"
              >
                <div className="mb-1.5 flex items-center justify-between border-b border-slate-800 px-2 pb-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                    🎮 Chọn chế độ chơi · Chủ bàn
                  </span>
                  <span className="text-[10px] text-slate-400">Đồng bộ server</span>
                </div>

                <div className="space-y-1">
                  {selectorState.effectiveRulesets.map((rs, idx) => {
                    const selected = rs.id === activeRs.id;
                    const badge = formatRulesetReleaseBadge(rs.status);
                    const displayLabel = formatRulesetDisplayLabel(rs);
                    const disabled = !rs.selectable || selectorState.isPending;
                    return (
                      <button
                        key={rs.id}
                        ref={(el) => {
                          optionRefs.current[idx] = el;
                        }}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        aria-disabled={disabled}
                        data-testid={`bg-hud-ruleset-opt-${rs.id}`}
                        disabled={disabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectOption(rs);
                        }}
                        className={`flex min-h-[44px] w-full flex-col gap-0.5 rounded-xl border px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                          selected
                            ? rs.isBeta
                              ? 'border-violet-400/85 bg-violet-950/65 text-violet-50'
                              : 'border-amber-400/85 bg-amber-950/55 text-amber-50'
                            : rs.selectable
                              ? 'border-slate-800 bg-slate-900/85 text-slate-100 hover:border-amber-400/60 hover:bg-slate-800/95 cursor-pointer'
                              : 'cursor-not-allowed border-slate-800/70 bg-slate-950/60 text-slate-500 opacity-60'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-xs font-extrabold">
                            <span
                              aria-hidden="true"
                              className={selected ? 'text-amber-300' : 'text-transparent'}
                            >
                              ✓
                            </span>
                            <span>{displayLabel}</span>
                            <span className="text-[11px] font-semibold text-slate-300">
                              ({rs.expectedCharacterCount} tướng)
                            </span>
                          </span>
                          <span
                            data-testid={`bg-hud-ruleset-opt-badge-${rs.id}`}
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
                              rs.status === 'stable'
                                ? 'bg-emerald-500/25 text-emerald-300'
                                : rs.status === 'beta'
                                  ? 'bg-violet-500/30 text-violet-200'
                                  : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {badge}
                          </span>
                        </div>
                        <p className="pl-4 text-[10px] leading-snug text-slate-400 line-clamp-2">
                          {rs.selectable
                            ? rs.description
                            : 'Chưa bật trên máy chủ — chỉ khả dụng khi mở cờ Beta.'}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {selectorState.anyBetaEnabled && (
                  <p className="mt-2 rounded-lg border border-violet-400/30 bg-violet-950/40 px-2 py-1 text-[10px] leading-snug text-violet-200">
                    ⚠️ <strong>Classic (10 tướng)</strong> là mặc định ổn định. Các gói{' '}
                    <strong>Beta</strong> giữ nguyên chỗ ngồi &amp; mã mời khi chuyển đổi trước lúc
                    bắt đầu.
                  </p>
                )}
              </div>
            )}
          </div>

          <span className="rounded-lg bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-slate-700">
            {readyPlayerCount}/{seatedPlayerCount} sẵn sàng
            {matchStatusLabel ? ` · ${matchStatusLabel}` : ''}
          </span>

          {!isSpectator && !isHost && onToggleReady && (
            <button
              type="button"
              data-testid="bg-hud-ready-btn"
              onClick={onToggleReady}
              className={`rounded-xl px-3 py-1 text-[11px] font-bold shadow transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                localReady
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
              }`}
            >
              {localReady ? '✓ Đã sẵn sàng' : '✋ Sẵn sàng'}
            </button>
          )}

          {!isSpectator && isHost && onStartMatch && (
            <>
              <span className="rounded-lg bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-400/35">
                👑 Chủ bàn
              </span>
              {!selectorState.lockedByMatch && onAddBot && (
                <button
                  type="button"
                  data-testid="bg-hud-add-bot-btn"
                  disabled={seatedPlayerCount >= 8}
                  title="Thêm 1 Bot AI chơi cùng bàn (tối đa 8 ghế)"
                  onClick={onAddBot}
                  className="rounded-xl border border-cyan-400/60 bg-cyan-950/80 px-2.5 py-1 text-[11px] font-bold text-cyan-100 shadow transition hover:bg-cyan-900/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  🤖 + Bot
                </button>
              )}
              {!selectorState.lockedByMatch && botCount > 0 && onRemoveBot && (
                <button
                  type="button"
                  data-testid="bg-hud-remove-bot-btn"
                  title={`Bớt 1 Bot (đang có ${botCount} Bot)`}
                  onClick={onRemoveBot}
                  className="rounded-xl border border-slate-600 bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-200 transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 cursor-pointer"
                >
                  🤖 -{botCount}
                </button>
              )}
              <button
                type="button"
                data-testid="bg-hud-start-btn"
                disabled={!canStartMatch || selectorState.isPending}
                title={`Bắt đầu ván đấu ở chế độ ${activeSummary} (${activeBadge})`}
                aria-label={`${startButtonLabel} — Chế độ ${activeSummary}`}
                onClick={onStartMatch}
                className="rounded-xl bg-amber-500 px-3 py-1 text-[11px] font-extrabold text-slate-950 shadow transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-400"
              >
                {startButtonLabel}
              </button>
            </>
          )}
        </div>
      )}

      {/* Thông báo không gây gián đoạn khi chủ bàn đổi chế độ hoặc khi server từ chối */}
      {showDirectControls && rulesetError && (
        <div
          role="alert"
          data-testid="bg-hud-ruleset-error"
          className="pointer-events-auto max-w-[calc(100vw-20px)] rounded-xl border border-rose-400/55 bg-rose-950/95 px-3 py-1 text-[11px] font-semibold text-rose-100 shadow-lg backdrop-blur-md"
        >
          ⚠️ {rulesetError}
        </div>
      )}
      {showDirectControls && !rulesetError && rulesetNotice && (
        <div
          role="status"
          aria-live="polite"
          data-testid="bg-hud-ruleset-notice"
          className="pointer-events-auto max-w-[calc(100vw-20px)] rounded-xl border border-violet-400/50 bg-slate-950/95 px-3 py-1 text-[11px] font-semibold text-violet-100 shadow-lg backdrop-blur-md"
        >
          {rulesetNotice}
        </div>
      )}
    </div>
  );
}
