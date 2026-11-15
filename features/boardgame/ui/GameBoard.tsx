'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/GameBoard.tsx — Bàn chơi 2D "Bóng Đêm KTX v4"
// Thiết kế toàn màn hình trực quan kiểu Shadow Hunters:
// - Thang thương tích công khai 0..14 trên đỉnh bàn
// - 3 Cụm Khu Vực Đôi (6 ô đánh số 2–3 / 4–5 / 6 / 8 / 9 / 10)
// - Khay Xúc xắc 1d6+1d4 & 3 Chồng bài
// - Ngăn phụ thu gọn được (Thẻ vai bí mật + Nhật ký + Chat/Emote)
// - Thời gian suy nghĩ vô hạn mặc định, tối ưu responsive desktop & mobile 390×844
// ---------------------------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  VALID_BOARD_GAME_EMOTES,
  type BoardGameActionPayload,
  type BoardGameChatEmoteServerMessage,
  type BoardGameEmoteId,
  type BoardGamePrivateGameView,
  type BoardGamePublicGameView,
} from '../network/contracts';
import { FACTION_LABELS } from '../domain/roles';
import {
  BOARD_CLUSTERS_ORDER,
  DeckCardBackSvg,
  DiceD4Svg,
  DiceD6Svg,
  FACTION_THEME,
  LOCATION_VISUAL_META,
  LocationSceneSvg,
  PlayerPawnToken,
} from './BoardGameArt';
import RoleCard from './RoleCard';
import ActionPanel from './ActionPanel';
import GameLog from './GameLog';
import MatchPostcard from './MatchPostcard';
import MatchResult from './MatchResult';
import {
  isBoardGameSoundMuted,
  playCardDraw,
  playEmotePop,
  playRoleReveal,
  playTrackAdvance,
  playTurnAlert,
  playVictoryFanfare,
  setBoardGameSoundMuted,
} from './sound';

const EMOTE_META: Record<BoardGameEmoteId, { icon: string; label: string }> = {
  wave: { icon: '👋', label: 'Chào' },
  think: { icon: '🤔', label: 'Suy nghĩ' },
  suspect: { icon: '🧐', label: 'Nghi ngờ' },
  cheer: { icon: '🎉', label: 'Hoan hô' },
  sweat: { icon: '😅', label: 'Hồi hộp' },
  laugh: { icon: '😂', label: 'Cười' },
};

const PHASE_LABEL: Record<BoardGamePublicGameView['turnPhase'], string> = {
  ROLL_MOVE: 'Pha 1: Tung xúc xắc di chuyển',
  CHOOSE_MOVE: 'Pha 1: Tổng 7 — Chọn khu vực tự do',
  LOCATION_ACTION: 'Pha 2: Quyền năng / Rút bài khu vực',
  MAIN_ACTION: 'Pha 3: Dùng bài / Tấn công / Kết thúc lượt',
  ENDED: 'Trận đấu đã kết thúc',
};

const WOUND_NOTCHES: readonly number[] = Array.from({ length: 15 }, (_, i) => i);

export interface GameBoardProps {
  inviteCode: string | null;
  publicGame: BoardGamePublicGameView;
  privateView: BoardGamePrivateGameView | null;
  selfPlayerId: string | null;
  isSpectator: boolean;
  turnDeadlineMs: number | null;
  recentEmotes: readonly BoardGameChatEmoteServerMessage[];
  lastError: string | null;
  soundMuted?: boolean;
  onAction: (action: BoardGameActionPayload) => Promise<{ ok: boolean; reason?: string }>;
  onSendEmote?: (emote: BoardGameEmoteId) => void;
  onSendChat?: (text: string) => void;
  onToggleSound?: () => void;
  onOpenRules: () => void;
  onPlayAgain?: () => void;
  onLeaveMatch: () => void;
}

export function GameBoard({
  inviteCode,
  publicGame,
  privateView,
  selfPlayerId,
  isSpectator,
  turnDeadlineMs,
  recentEmotes,
  lastError,
  soundMuted: propMuted,
  onAction,
  onSendEmote,
  onSendChat,
  onToggleSound,
  onOpenRules,
  onPlayAgain,
  onLeaveMatch,
}: GameBoardProps) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [roleCardVisible, setRoleCardVisible] = useState(false);
  const [handUnmasked, setHandUnmasked] = useState(false);
  const [sideDrawerOpen, setSideDrawerOpen] = useState(true);
  const [mobileTab, setMobileTab] = useState<'board' | 'role' | 'log'>('board');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [chatText, setChatText] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [localMuted, setLocalMuted] = useState(() => isBoardGameSoundMuted());

  const prevTurnRef = useRef<number>(publicGame.turnNumber);
  const prevActiveRef = useRef<string | null>(publicGame.activePlayerId);
  const prevRevealIdRef = useRef<string | null>(publicGame.lastRevealEvent?.id ?? null);
  const prevWinnerRef = useRef<string | null>(publicGame.winnerLabel);
  const prevLogLenRef = useRef<number>(publicGame.publicLog.length);
  const prevEmoteCountRef = useRef<number>(recentEmotes.length);

  const effectiveMuted = propMuted ?? localMuted;

  useEffect(() => {
    if (typeof turnDeadlineMs !== 'number') return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [turnDeadlineMs]);

  useEffect(() => {
    if (prevTurnRef.current !== publicGame.turnNumber) {
      prevTurnRef.current = publicGame.turnNumber;
      setHandUnmasked(false);
      setLocalError(null);
      if (
        publicGame.activePlayerId &&
        publicGame.activePlayerId === selfPlayerId &&
        publicGame.activePlayerId !== prevActiveRef.current
      ) {
        playTurnAlert();
      }
      prevActiveRef.current = publicGame.activePlayerId;
    }
  }, [publicGame.turnNumber, publicGame.activePlayerId, selfPlayerId]);

  useEffect(() => {
    const revId = publicGame.lastRevealEvent?.id ?? null;
    if (revId && revId !== prevRevealIdRef.current) {
      prevRevealIdRef.current = revId;
      playRoleReveal();
    }
  }, [publicGame.lastRevealEvent]);

  useEffect(() => {
    if (publicGame.winnerLabel && publicGame.winnerLabel !== prevWinnerRef.current) {
      prevWinnerRef.current = publicGame.winnerLabel;
      playVictoryFanfare();
    }
  }, [publicGame.winnerLabel]);

  useEffect(() => {
    if (publicGame.publicLog.length > prevLogLenRef.current) {
      const latest = publicGame.publicLog[publicGame.publicLog.length - 1];
      prevLogLenRef.current = publicGame.publicLog.length;
      if (latest?.kind === 'draw') playCardDraw();
      else if (latest?.kind === 'dice' || latest?.kind === 'move') playTrackAdvance();
    }
  }, [publicGame.publicLog]);

  useEffect(() => {
    if (recentEmotes.length > prevEmoteCountRef.current) {
      prevEmoteCountRef.current = recentEmotes.length;
      playEmotePop();
    }
  }, [recentEmotes.length]);

  const selfPlayer = useMemo(
    () => publicGame.players.find((p) => p.playerId === selfPlayerId) ?? null,
    [publicGame.players, selfPlayerId],
  );
  const activePlayer = useMemo(
    () => publicGame.players.find((p) => p.playerId === publicGame.activePlayerId) ?? null,
    [publicGame.players, publicGame.activePlayerId],
  );
  const isMyTurn =
    !isSpectator &&
    Boolean(selfPlayer?.alive) &&
    !publicGame.winnerLabel &&
    publicGame.turnPhase !== 'ENDED' &&
    publicGame.activePlayerId === selfPlayerId;

  const playersByWoundNotch = useMemo(() => {
    const buckets: typeof publicGame.players[number][][] = Array.from(
      { length: 15 },
      () => [],
    );
    for (const p of publicGame.players) {
      const notch = Math.max(0, Math.min(14, p.woundsTaken));
      buckets[notch].push(p);
    }
    return buckets;
  }, [publicGame.players]);

  const remainingSec =
    typeof turnDeadlineMs === 'number'
      ? Math.max(0, Math.ceil((turnDeadlineMs - nowMs) / 1000))
      : null;

  const latestEmote =
    recentEmotes.length > 0 ? recentEmotes[recentEmotes.length - 1] : null;
  const displayedError = localError ?? lastError;

  const dispatchAction = async (action: BoardGameActionPayload) => {
    if (actionBusy) return;
    setActionBusy(true);
    setLocalError(null);
    try {
      const res = await onAction(action);
      if (res && !res.ok && res.reason) {
        setLocalError(res.reason);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleToggleSoundClick = () => {
    const next = !effectiveMuted;
    setLocalMuted(next);
    setBoardGameSoundMuted(next);
    onToggleSound?.();
  };

  return (
    <div
      data-testid="boardgame-2d-board"
      className="fixed inset-0 z-[44] flex flex-col bg-slate-950 text-slate-100 overflow-x-hidden"
    >
      {/* THANH HEADER TINH GỌN */}
      <header
        data-testid="bg-v3-status-bar"
        className="shrink-0 border-b border-slate-800 bg-slate-900/95 px-3 sm:px-5 py-2.5"
      >
        <div className="mx-auto max-w-[1680px] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-sm sm:text-base font-black tracking-tight text-white">
              🌙 Săn Bóng Đêm KTX
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs sm:text-sm font-bold text-cyan-200">
              Vòng {publicGame.round}
            </span>
            <span className="hidden md:inline-flex px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs sm:text-sm font-semibold text-amber-200">
              {PHASE_LABEL[publicGame.turnPhase]}
            </span>
            <span
              data-testid="bg-turn-timer"
              className={`px-3 py-1 rounded-lg border text-xs sm:text-sm font-extrabold ${
                remainingSec === null
                  ? 'bg-emerald-500/15 border-emerald-400/45 text-emerald-200'
                  : remainingSec <= 10
                    ? 'bg-rose-500/20 border-rose-400/60 text-rose-100 animate-pulse'
                    : 'bg-amber-500/15 border-amber-400/45 text-amber-100'
              }`}
            >
              {remainingSec === null ? '∞ Suy nghĩ tự do' : `⏱️ ${remainingSec}s`}
            </span>
            {activePlayer && !publicGame.winnerLabel && (
              <span className="text-xs sm:text-sm font-semibold text-slate-300">
                Lượt:{' '}
                <strong className={isMyTurn ? 'text-amber-300' : 'text-white'}>
                  {activePlayer.displayName}
                </strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {inviteCode && (
              <span className="hidden xl:inline-flex px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300">
                Mã: {inviteCode}
              </span>
            )}
            <button
              type="button"
              data-testid="bg-toggle-drawer-btn"
              onClick={() => setSideDrawerOpen((v) => !v)}
              className="hidden lg:inline-flex items-center px-3 py-1.5 min-h-[36px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-100 transition cursor-pointer"
            >
              {sideDrawerOpen ? '◨ Mở rộng bàn' : '◧ Mở Thẻ & Nhật ký'}
            </button>
            <button
              type="button"
              data-testid="bg-sound-toggle-btn"
              onClick={handleToggleSoundClick}
              className="px-2.5 py-1.5 min-h-[36px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-100 transition cursor-pointer"
              aria-label="Bật/tắt âm thanh"
            >
              {effectiveMuted ? '🔇' : '🔊'}
            </button>
            <button
              type="button"
              data-testid="bg-board-rules-btn"
              onClick={onOpenRules}
              className="px-3 py-1.5 min-h-[36px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs sm:text-sm font-bold text-slate-100 transition cursor-pointer"
            >
              📖 Luật
            </button>
            <button
              type="button"
              data-testid="bg-board-leave-btn"
              onClick={() => setLeaveConfirmOpen(true)}
              className="px-3 py-1.5 min-h-[36px] rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-500/50 text-xs sm:text-sm font-bold text-rose-100 transition cursor-pointer"
            >
              🚪 Rời
            </button>
          </div>
        </div>
      </header>

      {/* THANH TAB MOBILE (< lg) — 3 nút gọn vừa khít 390px */}
      <nav
        aria-label="Điều hướng bàn cờ di động"
        className="lg:hidden shrink-0 grid grid-cols-3 gap-1.5 border-b border-slate-800 bg-slate-900/90 px-2.5 py-2"
      >
        <button
          type="button"
          onClick={() => setMobileTab('board')}
          className={`min-h-[40px] rounded-xl px-2 text-xs font-black transition cursor-pointer ${
            mobileTab === 'board'
              ? 'bg-cyan-500 text-slate-950'
              : 'bg-slate-800 text-slate-200 border border-slate-700'
          }`}
        >
          🎲 Bàn & Lượt
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('role')}
          className={`min-h-[40px] rounded-xl px-2 text-xs font-black transition cursor-pointer ${
            mobileTab === 'role'
              ? 'bg-amber-400 text-slate-950'
              : 'bg-slate-800 text-slate-200 border border-slate-700'
          }`}
        >
          🎭 Vai bí mật
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('log')}
          className={`min-h-[40px] rounded-xl px-2 text-xs font-black transition cursor-pointer ${
            mobileTab === 'log'
              ? 'bg-emerald-400 text-slate-950'
              : 'bg-slate-800 text-slate-200 border border-slate-700'
          }`}
        >
          📜 Nhật ký
        </button>
      </nav>

      {/* BANNER THÔNG BÁO SỰ KIỆN NỔI BẬT (NẾU CÓ) */}
      {(displayedError ||
        publicGame.lastInvestigation ||
        publicGame.lastRevealEvent ||
        latestEmote) && (
        <div className="shrink-0 bg-slate-950/90 border-b border-slate-800/80 px-3 sm:px-5 py-2">
          <div className="mx-auto max-w-[1680px] flex flex-wrap items-center gap-2">
            {displayedError && (
              <div className="rounded-xl bg-rose-950/80 border border-rose-500/60 px-3 py-1.5 text-xs sm:text-sm font-bold text-rose-100">
                ⚠️ {displayedError}
              </div>
            )}
            {publicGame.lastInvestigation && (
              <div
                data-testid="bg-last-investigation-banner"
                className="rounded-xl bg-emerald-950/60 border border-emerald-500/45 px-3 py-1.5 text-xs sm:text-sm font-semibold text-emerald-100"
              >
                {publicGame.lastInvestigation.publicMessage}
              </div>
            )}
            {publicGame.lastRevealEvent && (
              <div
                data-testid="bg-last-reveal-banner"
                className="rounded-xl bg-indigo-950/65 border border-indigo-400/50 px-3 py-1.5 text-xs sm:text-sm font-bold text-indigo-100"
              >
                🎭 {publicGame.lastRevealEvent.displayName} đã lộ vai{' '}
                {publicGame.lastRevealEvent.roleName} (
                {FACTION_LABELS[publicGame.lastRevealEvent.faction]})!
              </div>
            )}
            {latestEmote && (
              <div
                data-testid="bg-emote-toast"
                className="ml-auto rounded-xl bg-slate-800/90 border border-slate-600 px-3 py-1.5 text-xs sm:text-sm font-semibold text-amber-100"
              >
                {latestEmote.emote ? EMOTE_META[latestEmote.emote]?.icon ?? '💬' : '💬'}{' '}
                <strong>{latestEmote.displayName}:</strong>{' '}
                {latestEmote.text || (latestEmote.emote ? EMOTE_META[latestEmote.emote]?.label : '')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* NỘI DUNG CHÍNH: BÀN CỜ RỘNG LỚN + NGĂN PHỤ THU GỌN */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-5 py-4">
        <div className="mx-auto max-w-[1680px] flex flex-col lg:flex-row gap-4 items-start">
          {/* CỘT CHÍNH: THANG THƯƠNG TÍCH + 3 CỤM KHU VỰC + XÚC XẮC + NGƯỜI CHƠI + BẢNG HÀNH ĐỘNG */}
          <div
            className={`w-full min-w-0 flex-1 space-y-4 ${
              mobileTab !== 'board' ? 'hidden lg:block' : 'block'
            }`}
          >
            {/* 1. THANG THƯƠNG TÍCH CÔNG KHAI 0..14 (Damage Track) */}
            <section
              data-testid="bg-damage-track"
              className="rounded-2xl border border-slate-700/80 bg-slate-900/90 p-3 sm:p-4 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-200">
                  🩸 Thang Thương Tích Công Khai (0 → 14)
                </h2>
                <span className="text-xs text-slate-400">
                  Máu tối đa (11–14) được giữ bí mật cho tới khi người chơi lật vai
                </span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-8 xl:grid-cols-[repeat(15,minmax(0,1fr))] gap-1.5">
                {WOUND_NOTCHES.map((notch) => {
                  const occupants = playersByWoundNotch[notch];
                  const tone =
                    notch === 0
                      ? 'border-emerald-500/40 bg-emerald-950/35 text-emerald-200'
                      : notch <= 6
                        ? 'border-slate-700 bg-slate-950/80 text-slate-200'
                        : notch <= 10
                          ? 'border-amber-500/45 bg-amber-950/35 text-amber-200'
                          : 'border-rose-500/55 bg-rose-950/45 text-rose-200';
                  return (
                    <div
                      key={notch}
                      className={`min-h-[54px] rounded-xl border p-1.5 flex flex-col items-center justify-between gap-1 ${tone}`}
                    >
                      <span className="text-xs font-black leading-none">
                        {notch === 14 ? '14 💀' : notch}
                      </span>
                      <div className="flex flex-wrap items-center justify-center gap-0.5">
                        {occupants.map((p) => (
                          <PlayerPawnToken
                            key={p.playerId}
                            compact
                            displayName={p.displayName}
                            seatIndex={p.seatIndex}
                            alive={p.alive}
                            isActive={p.playerId === publicGame.activePlayerId}
                            isSelf={p.playerId === selfPlayerId}
                            revealedFaction={p.revealedFaction}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 2. BÀN CỜ 3 CỤM KHU VỰC ĐÔI (6 Ô ĐÁNH SỐ XÚC XẮC) */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {BOARD_CLUSTERS_ORDER.map((cluster) => (
                <div
                  key={cluster.clusterId}
                  className={`rounded-2xl border p-3 sm:p-3.5 space-y-3 ${cluster.ringClass}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-3 py-1 rounded-full border text-xs font-black whitespace-nowrap shrink-0 ${cluster.badgeClass}`}>
                      {cluster.title}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      Đánh chung cụm
                    </span>
                  </div>

                  <div className="space-y-3">
                    {cluster.locations.map((locId) => {
                      const meta = LOCATION_VISUAL_META[locId];
                      const occupants = publicGame.players.filter(
                        (p) => p.location === locId,
                      );
                      const isSelfHere = selfPlayer?.location === locId;
                      const canChooseMoveHere =
                        isMyTurn &&
                        publicGame.turnPhase === 'CHOOSE_MOVE' &&
                        !isSelfHere;
                      const rolledDestinationHere =
                        publicGame.lastDiceRoll?.kind === 'move' &&
                        publicGame.lastDiceRoll.resolvedLocation === locId;

                      return (
                        <div
                          key={locId}
                          data-testid={`bg-loc-${locId}`}
                          onClick={
                            canChooseMoveHere
                              ? () => dispatchAction({ type: 'CHOOSE_DEST', location: locId })
                              : undefined
                          }
                          role={canChooseMoveHere ? 'button' : undefined}
                          tabIndex={canChooseMoveHere ? 0 : undefined}
                          onKeyDown={
                            canChooseMoveHere
                              ? (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    dispatchAction({ type: 'CHOOSE_DEST', location: locId });
                                  }
                                }
                              : undefined
                          }
                          className={`rounded-2xl border p-3.5 bg-gradient-to-br ${meta.bgGradient} transition ${
                            canChooseMoveHere
                              ? 'border-amber-400 ring-2 ring-amber-400/60 hover:scale-[1.01] cursor-pointer'
                              : isSelfHere
                                ? 'border-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.2)]'
                                : rolledDestinationHere
                                  ? 'border-emerald-400/80'
                                  : 'border-white/15'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <LocationSceneSvg location={locId} size={50} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  style={{ backgroundColor: meta.accentHex }}
                                  className="px-2.5 py-0.5 rounded-lg text-slate-950 text-xs font-black whitespace-nowrap shrink-0 shadow"
                                >
                                  Ô {meta.diceLabel}
                                </span>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-slate-200 whitespace-nowrap truncate">
                                  {meta.badgeText}
                                </span>
                              </div>
                              <h3 className="text-base font-black text-white mt-1.5 leading-tight">
                                {meta.name}
                              </h3>
                              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 leading-snug">
                                {meta.actionDesc}
                              </p>
                            </div>
                          </div>

                          {canChooseMoveHere && (
                            <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-black text-center">
                              👆 Bấm để di chuyển tới đây
                            </div>
                          )}

                          {/* Quân cờ sinh viên đang đứng ở khu vực này */}
                          <div className="mt-3 pt-2.5 border-t border-white/10 min-h-[42px] flex flex-wrap items-center gap-2">
                            {occupants.length === 0 ? (
                              <span className="text-xs text-slate-400 italic">
                                Trống người
                              </span>
                            ) : (
                              occupants.map((p) => (
                                <button
                                  key={p.playerId}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (p.playerId !== selfPlayerId) {
                                      setSelectedTargetId(p.playerId);
                                    }
                                  }}
                                  className={`flex items-center gap-1.5 rounded-full pr-2.5 pl-1 py-0.5 border text-xs font-bold transition cursor-pointer ${
                                    selectedTargetId === p.playerId
                                      ? 'bg-rose-600/80 border-rose-300 text-white'
                                      : 'bg-slate-900/90 border-white/15 text-slate-100 hover:border-cyan-400/60'
                                  }`}
                                >
                                  <PlayerPawnToken
                                    compact
                                    displayName={p.displayName}
                                    seatIndex={p.seatIndex}
                                    alive={p.alive}
                                    isActive={p.playerId === publicGame.activePlayerId}
                                    isSelf={p.playerId === selfPlayerId}
                                    revealedFaction={p.revealedFaction}
                                  />
                                  <span className={!p.alive ? 'line-through text-slate-400' : ''}>
                                    {p.displayName}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>

            {/* 3. KHAY XÚC XẮC 1d6+1d4 & 3 CHỒNG BÀI */}
            <section
              data-testid="bg-dice-tray"
              className="rounded-2xl border border-slate-700/80 bg-slate-900/90 p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              {/* Kết quả xúc xắc gần nhất */}
              <div className="flex items-center gap-3.5 flex-wrap">
                {publicGame.lastDiceRoll ? (
                  <>
                    <div className="flex items-center gap-2">
                      {publicGame.lastDiceRoll.d6 > 0 && (
                        <DiceD6Svg value={publicGame.lastDiceRoll.d6} size={44} />
                      )}
                      <DiceD4Svg value={publicGame.lastDiceRoll.d4} size={44} />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-black text-white">
                        {publicGame.lastDiceRoll.kind === 'move'
                          ? `${publicGame.lastDiceRoll.displayName} tung ${publicGame.lastDiceRoll.d6} + ${publicGame.lastDiceRoll.d4} = ${publicGame.lastDiceRoll.total}`
                          : `${publicGame.lastDiceRoll.displayName} tung đòn đánh (${
                              publicGame.lastDiceRoll.d6 > 0
                                ? `|${publicGame.lastDiceRoll.d6} - ${publicGame.lastDiceRoll.d4}|`
                                : `1d4=${publicGame.lastDiceRoll.d4}`
                            } → gây ${publicGame.lastDiceRoll.damageDealt ?? 0} sát thương)`}
                      </p>
                      <p className="text-xs sm:text-sm text-cyan-200 font-semibold">
                        {publicGame.lastDiceRoll.rerollRequired
                          ? '🔁 Trùng khu vực hiện tại — được quyền ĐỔ LẠI!'
                          : publicGame.lastDiceRoll.freeChoice
                            ? '✨ Tổng 7! Tự do chọn khu vực bất kỳ.'
                            : publicGame.lastDiceRoll.resolvedLocation
                              ? `Điểm đến: ${LOCATION_VISUAL_META[publicGame.lastDiceRoll.resolvedLocation].name}`
                              : 'Sẵn sàng tung xúc xắc tiếp theo.'}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <DiceD6Svg value={6} size={42} />
                    <DiceD4Svg value={4} size={42} />
                    <div>
                      <p className="text-sm sm:text-base font-black text-white">
                        Khay Xúc Xắc Bóng Đêm (1d6 + 1d4)
                      </p>
                      <p className="text-xs sm:text-sm text-slate-300">
                        Mỗi lượt tung xúc xắc để di chuyển · Tổng 7 chọn bất kỳ · Trùng chỗ được đổ lại
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 3 Chồng bài */}
              <div className="grid grid-cols-3 gap-2.5 shrink-0">
                {(
                  [
                    ['investigation', 'Khám Phá', 'text-emerald-300'],
                    ['equipment', 'Cung Ứng', 'text-sky-300'],
                    ['event', 'Đột Kích', 'text-rose-300'],
                  ] as const
                ).map(([deckId, label, cls]) => (
                  <div
                    key={deckId}
                    className="rounded-xl border border-slate-700 bg-slate-950/85 px-2.5 py-2 flex items-center gap-2"
                  >
                    <DeckCardBackSvg deck={deckId} size={32} />
                    <div>
                      <p className={`text-xs font-extrabold ${cls}`}>{label}</p>
                      <p className="text-sm font-black text-white">
                        {publicGame.deckCounts[deckId]} lá
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. DẢI NGƯỜI CHƠI TINH GỌN */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {publicGame.players.map((p) => {
                const selected = selectedTargetId === p.playerId;
                const isTurnHolder = p.playerId === publicGame.activePlayerId;
                const factionTheme = p.revealedFaction ? FACTION_THEME[p.revealedFaction] : null;
                const locMeta = LOCATION_VISUAL_META[p.location];
                return (
                  <button
                    key={p.playerId}
                    type="button"
                    onClick={() => {
                      if (p.playerId !== selfPlayerId) {
                        setSelectedTargetId(p.playerId);
                      }
                    }}
                    className={`rounded-2xl border p-2.5 text-left transition cursor-pointer ${
                      !p.alive
                        ? 'opacity-55 border-slate-800 bg-slate-950/60'
                        : selected
                          ? 'border-rose-400 bg-rose-950/40 ring-2 ring-rose-400/50'
                          : isTurnHolder
                            ? 'border-amber-400 bg-slate-900'
                            : 'border-slate-700/80 bg-slate-900/80 hover:border-cyan-400/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <PlayerPawnToken
                        compact
                        displayName={p.displayName}
                        seatIndex={p.seatIndex}
                        alive={p.alive}
                        isActive={isTurnHolder}
                        isSelf={p.playerId === selfPlayerId}
                        revealedFaction={p.revealedFaction}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-white truncate">
                          {p.displayName}
                        </p>
                        <p className={`text-xs font-bold truncate ${factionTheme ? factionTheme.textClass : 'text-slate-400'}`}>
                          {p.revealedRoleId
                            ? `${FACTION_LABELS[p.revealedFaction!]} · Max ${p.revealedMaxHp}`
                            : 'Vai ẩn danh'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-bold">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-rose-200">
                        🩸 {p.woundsTaken} vết
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-200">
                        Ô {locMeta.diceLabel}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                        🃏 {p.handCount}
                      </span>
                      {p.guardianShieldActive && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/25 text-amber-200">
                          🛡️ Khiên
                        </span>
                      )}
                    </div>
                    {p.equipped.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {p.equipped.map((eq, i) => (
                          <span
                            key={`${eq.id}-${i}`}
                            title={eq.summary}
                            className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-sky-950/70 border border-sky-500/40 text-sky-200 truncate max-w-full"
                          >
                            🎒 {eq.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </section>

            {/* 5. BẢNG HÀNH ĐỘNG NGAY BÊN DƯỚI BÀN CỜ */}
            <ActionPanel
              publicGame={publicGame}
              privateView={privateView}
              selfPlayerId={selfPlayerId}
              isSpectator={isSpectator}
              selectedTargetId={selectedTargetId}
              onSelectTarget={setSelectedTargetId}
              onAction={dispatchAction}
              handMaskLocked={!roleCardVisible && !handUnmasked}
              onToggleHandMask={() => setHandUnmasked((v) => !v)}
            />
          </div>

          {/* NGĂN KÉO PHỤ BÊN PHẢI: THẺ VAI + NHẬT KÝ + EMOTE & CHAT */}
          {(sideDrawerOpen || mobileTab !== 'board') && (
            <div
              className={`w-full lg:w-[390px] xl:w-[410px] shrink-0 space-y-4 ${
                mobileTab === 'board' ? 'hidden lg:block' : 'block'
              }`}
            >
              <div className={mobileTab === 'log' ? 'hidden lg:block' : 'block'}>
                <RoleCard
                  publicGame={publicGame}
                  privateView={privateView}
                  isSpectator={isSpectator}
                  cardVisible={roleCardVisible}
                  onToggleCardVisible={() => setRoleCardVisible((v) => !v)}
                />
              </div>

              <div className={mobileTab === 'role' ? 'hidden lg:block' : 'block'}>
                <GameLog publicGame={publicGame} />

                {/* Emote & Chat nhanh */}
                <div className="mt-4 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-3.5 space-y-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {VALID_BOARD_GAME_EMOTES.map((eid) => (
                      <button
                        key={eid}
                        type="button"
                        data-testid={`bg-emote-${eid}`}
                        onClick={() => onSendEmote?.(eid)}
                        className="px-2.5 py-1.5 min-h-[36px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-100 cursor-pointer"
                      >
                        {EMOTE_META[eid].icon} {EMOTE_META[eid].label}
                      </button>
                    ))}
                  </div>
                  {onSendChat && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const trimmed = chatText.trim();
                        if (!trimmed) return;
                        onSendChat(trimmed);
                        setChatText('');
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        data-testid="bg-chat-input"
                        value={chatText}
                        onChange={(e) => setChatText(e.target.value)}
                        maxLength={120}
                        placeholder="Nhắn nhanh với bàn..."
                        className="flex-1 min-w-0 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 min-h-[40px] rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-black cursor-pointer"
                      >
                        Gửi
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL TỔNG KẾT VÁN ĐẤU */}
      {publicGame.winnerLabel && publicGame.finalReveal && (
        <MatchResult
          publicGame={publicGame}
          selfPlayerId={selfPlayerId}
          isSpectator={isSpectator}
          postcardSlot={<MatchPostcard publicGame={publicGame} inviteCode={inviteCode} />}
          onPlayAgain={onPlayAgain}
          onLeaveMatch={onLeaveMatch}
        />
      )}

      {/* HỘP THOẠI XÁC NHẬN RỜI VÁN */}
      {leaveConfirmOpen && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/45 bg-slate-900 p-5 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-white">Rời bàn Bóng Đêm KTX?</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {publicGame.winnerLabel
                ? 'Trận đấu đã kết thúc. Bạn muốn quay về khu sinh hoạt KTX?'
                : 'Nếu rời ván giữa chừng, bạn vẫn có thể vào lại trong thời gian chờ hoặc nhường lượt tự động khi quá hạn mất kết nối.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLeaveConfirmOpen(false)}
                className="px-4 py-2 min-h-[40px] rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-200 cursor-pointer"
              >
                Ở lại bàn
              </button>
              <button
                type="button"
                data-testid="bg-confirm-leave-game-btn"
                onClick={() => {
                  setLeaveConfirmOpen(false);
                  onLeaveMatch();
                }}
                className="px-4 py-2 min-h-[40px] rounded-xl bg-rose-600 hover:bg-rose-500 text-sm font-black text-white cursor-pointer"
              >
                Xác nhận rời bàn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameBoard;
