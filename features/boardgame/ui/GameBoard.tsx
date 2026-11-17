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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  VALID_BOARD_GAME_EMOTES,
  type BoardGameActionPayload,
  type BoardGameChatEmoteServerMessage,
  type BoardGameEmoteId,
  type BoardGameLocationId,
  type BoardGamePrivateGameView,
  type BoardGamePublicGameView,
} from '../network/contracts';
import { FACTION_LABELS } from '../domain/roles';
import { areInSameCluster, getLocationDefinition } from '../domain/rules';
import {
  buildBoardClustersView,
  DeckCardBackSvg,
  DiceD4Svg,
  DiceD6Svg,
  FACTION_THEME,
  LOCATION_VISUAL_META,
  PlayerPawnToken,
} from './BoardGameArt';
import RoleCard from './RoleCard';
import ActionPanel from './ActionPanel';
import GameLog from './GameLog';
import MatchPostcard from './MatchPostcard';
import MatchResult from './MatchResult';
import { toggleSelectedTargetId } from './target-selection';
import { BoardGameVfxStage, useBoardGameVfxQueue } from './BoardGameVfxStage';
import { TabletopLocationTile } from './TabletopLocationTile';
import { useSmoothPawnGlide } from './useSmoothPawnGlide';
import { MidnightCardZoomModal, type MidnightZoomTarget } from './MidnightCardZoomModal';
import {
  GRAPHICS_QUALITY_LABELS,
  GRAPHICS_TIER_LABELS,
  useBoardGameGraphicsSettings,
  type BoardGameQualitySetting,
} from './graphics-settings';
import {
  isBoardGameSoundMuted,
  playEmotePop,
  setBoardGameSoundMuted,
  stopAllBoardGameSounds,
  suspendBoardGameAudio,
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
  onOpenLeaderboard?: () => void;
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
  onOpenLeaderboard,
  onPlayAgain,
  onLeaveMatch,
}: GameBoardProps) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [sideDrawerOpen, setSideDrawerOpen] = useState(true);
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);
  const [mobileTab, setMobileTab] = useState<'board' | 'role' | 'log'>('board');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [chatText, setChatText] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [localMuted, setLocalMuted] = useState(() => isBoardGameSoundMuted());
  const [dicePulse, setDicePulse] = useState(false);
  const [seenClueCount, setSeenClueCount] = useState(0);
  const [seenLogCount, setSeenLogCount] = useState(() => publicGame.publicLog.length);
  const [zoomTarget, setZoomTarget] = useState<MidnightZoomTarget | null>(null);
  const boardStageRef = useRef<HTMLDivElement>(null);

  const gfx = useBoardGameGraphicsSettings();

  const vfx = useBoardGameVfxQueue({
    publicGame,
    privateView,
    selfPlayerId,
    isSpectator,
    containerRef: boardStageRef,
    graphicsProfile: gfx.profile,
  });

  useSmoothPawnGlide({
    containerRef: boardStageRef,
    players: publicGame.players,
    matchId: publicGame.matchId,
    reducedMotion: vfx.reducedMotion,
    durationMs: gfx.profile.pawnGlideDurationMs,
  });

  const prevTurnRef = useRef<number>(publicGame.turnNumber);
  const prevEmoteItemRef = useRef<BoardGameChatEmoteServerMessage | null>(
    recentEmotes.length > 0 ? recentEmotes[recentEmotes.length - 1] : null,
  );
  const prevDiceSigRef = useRef<string | null>(null);

  const effectiveMuted = propMuted ?? localMuted;

  useEffect(() => {
    if (typeof propMuted === 'boolean') {
      setBoardGameSoundMuted(propMuted);
    }
  }, [propMuted]);

  useEffect(() => {
    return () => {
      // Dọn & tạm dừng WebAudio khi rời Bóng Đêm KTX về khuôn viên 3D
      suspendBoardGameAudio();
    };
  }, []);

  useEffect(() => {
    setSeenClueCount(0);
    setSeenLogCount(publicGame.publicLog.length);
    setSelectedTargetId(null);
    setZoomTarget(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicGame.matchId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsDesktopLayout(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  const totalClues = privateView?.privateClues.length ?? 0;
  useEffect(() => {
    if ((isDesktopLayout && sideDrawerOpen) || mobileTab === 'role') {
      setSeenClueCount((prev) => Math.max(prev, totalClues));
    }
  }, [isDesktopLayout, sideDrawerOpen, mobileTab, totalClues]);

  useEffect(() => {
    if (mobileTab === 'log') {
      setSeenLogCount((prev) => Math.max(prev, publicGame.publicLog.length));
    }
  }, [mobileTab, publicGame.publicLog.length]);

  const unreadClueCount = isSpectator ? 0 : Math.max(0, totalClues - seenClueCount);
  const unreadLogCount = Math.max(0, publicGame.publicLog.length - seenLogCount);

  useEffect(() => {
    if (typeof turnDeadlineMs !== 'number') return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [turnDeadlineMs]);

  useEffect(() => {
    if (prevTurnRef.current !== publicGame.turnNumber) {
      prevTurnRef.current = publicGame.turnNumber;
      setSelectedTargetId(null);
      setLocalError(null);
    }
  }, [publicGame.turnNumber]);

  useEffect(() => {
    const latest = recentEmotes.length > 0 ? recentEmotes[recentEmotes.length - 1] : null;
    if (latest && latest !== prevEmoteItemRef.current) {
      prevEmoteItemRef.current = latest;
      playEmotePop();
    }
  }, [recentEmotes]);

  useEffect(() => {
    const roll = publicGame.lastDiceRoll;
    if (!roll) return;
    const sig = `${publicGame.turnNumber}-${roll.kind}-${roll.playerId}-${roll.d6}-${roll.d4}`;
    if (sig === prevDiceSigRef.current) return;
    prevDiceSigRef.current = sig;
    setDicePulse(true);
    const id = window.setTimeout(() => setDicePulse(false), 380);
    return () => window.clearTimeout(id);
  }, [publicGame.lastDiceRoll, publicGame.turnNumber]);

  const selfPlayer = useMemo(
    () => publicGame.players.find((p) => p.playerId === selfPlayerId) ?? null,
    [publicGame.players, selfPlayerId],
  );
  const activePlayer = useMemo(
    () => publicGame.players.find((p) => p.playerId === publicGame.activePlayerId) ?? null,
    [publicGame.players, publicGame.activePlayerId],
  );
  const boardClusters = useMemo(
    () => buildBoardClustersView(publicGame.clusterPairs),
    [publicGame.clusterPairs],
  );
  const isMyTurn =
    !isSpectator &&
    Boolean(selfPlayer?.alive) &&
    !publicGame.winnerLabel &&
    publicGame.turnPhase !== 'ENDED' &&
    publicGame.activePlayerId === selfPlayerId;

  const currentSelfLocDef = selfPlayer ? getLocationDefinition(selfPlayer.location) : null;
  const canRollOnBoard = isMyTurn && publicGame.turnPhase === 'ROLL_MOVE' && !actionBusy;
  const canDrawDeckOnBoard = (deckId: 'investigation' | 'equipment' | 'event') =>
    isMyTurn &&
    publicGame.turnPhase === 'LOCATION_ACTION' &&
    !actionBusy &&
    Boolean(
      currentSelfLocDef &&
        (currentSelfLocDef.deckHint === deckId || currentSelfLocDef.deckHint === 'any'),
    );

  const attackableIdsOnBoard = useMemo(() => {
    const ids = new Set<string>();
    if (!isMyTurn || !selfPlayer || publicGame.turnPhase !== 'MAIN_ACTION') return ids;
    const aliveOthers = publicGame.players.filter(
      (p) => p.alive && p.playerId !== selfPlayerId,
    );
    const hasHandgun = selfPlayer.equipped.some((eq) => eq.id === 'ev-05');
    for (const p of aliveOthers) {
      const same = areInSameCluster(selfPlayer.location, p.location, publicGame.clusterPairs);
      if (hasHandgun ? !same : same) {
        ids.add(p.playerId);
      }
    }
    return ids;
  }, [isMyTurn, selfPlayer, selfPlayerId, publicGame.players, publicGame.clusterPairs, publicGame.turnPhase]);

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

  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;
  const actionBusyRef = useRef(actionBusy);
  actionBusyRef.current = actionBusy;

  const dispatchAction = useCallback(async (action: BoardGameActionPayload) => {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setActionBusy(true);
    setLocalError(null);
    try {
      const res = await onActionRef.current(action);
      if (res && !res.ok && res.reason) {
        setLocalError(res.reason);
      }
    } finally {
      actionBusyRef.current = false;
      setActionBusy(false);
    }
  }, []);

  const handleChooseDestination = useCallback(
    (dest: BoardGameLocationId) => {
      void dispatchAction({ type: 'CHOOSE_DEST', location: dest });
    },
    [dispatchAction],
  );

  const handleCloseZoom = useCallback(() => {
    setZoomTarget(null);
  }, []);

  const handleToggleSoundClick = useCallback(() => {
    const next = !effectiveMuted;
    setLocalMuted(next);
    setBoardGameSoundMuted(next);
    if (next) {
      stopAllBoardGameSounds();
    }
    onToggleSound?.();
  }, [effectiveMuted, onToggleSound]);

  return (
    <div
      data-testid="boardgame-2d-board"
      className="fixed inset-0 z-[44] flex flex-col bg-slate-950 text-slate-100 overflow-x-hidden"
    >
      {/* THANH HEADER TINH GỌN */}
      <header
        data-testid="bg-v3-status-bar"
        className="shrink-0 border-b border-slate-800 bg-slate-900/95 px-3 sm:px-5 py-1.5"
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
              data-testid="bg-vfx-motion-toggle-btn"
              onClick={() => gfx.setReducedMotionOverride(!vfx.reducedMotion)}
              title={
                vfx.reducedMotion
                  ? 'Đang bật chế độ Giảm chuyển động (nhấn để bật VFX đầy đủ)'
                  : 'VFX đầy đủ đang bật (nhấn để giảm chuyển động)'
              }
              className={`hidden sm:inline-flex items-center px-2.5 py-1.5 min-h-[36px] rounded-xl border text-xs font-bold transition cursor-pointer ${
                vfx.reducedMotion
                  ? 'bg-slate-900 border-slate-700 text-slate-400'
                  : 'bg-indigo-950/70 border-indigo-400/50 text-indigo-200 hover:bg-indigo-900/70'
              }`}
            >
              {vfx.reducedMotion ? '⏸️ Tĩnh' : '✨ VFX'}
            </button>
            <button
              type="button"
              data-testid="bg-graphics-settings-btn"
              onClick={() => setSettingsPanelOpen((v) => !v)}
              aria-expanded={settingsPanelOpen}
              aria-label="Cài đặt đồ họa và trợ năng"
              title={`Đồ họa: ${GRAPHICS_TIER_LABELS[gfx.profile.tier]} · Cài đặt hiệu ứng & rung`}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-xl border text-xs font-bold transition cursor-pointer ${
                settingsPanelOpen
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-100'
              }`}
            >
              <span>⚙️</span>
              <span className="hidden xl:inline">{GRAPHICS_TIER_LABELS[gfx.profile.tier]}</span>
            </button>
            {onOpenLeaderboard && (
              <button
                type="button"
                data-testid="bg-board-open-leaderboard-btn"
                onClick={onOpenLeaderboard}
                className="px-3 py-1.5 min-h-[36px] rounded-xl bg-amber-950/60 hover:bg-amber-900/70 border border-amber-400/50 text-xs sm:text-sm font-bold text-amber-200 transition cursor-pointer"
              >
                🏆 Hạng
              </button>
            )}
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

      {/* BẢNG CÀI ĐẶT ĐỒ HỌA (HIGH / BALANCED / LOW) & TRỢ NĂNG */}
      {settingsPanelOpen && (
        <section
          data-testid="bg-graphics-settings-panel"
          aria-label="Tùy chỉnh đồ họa, âm thanh và rung màn hình"
          className="shrink-0 border-b border-cyan-500/35 bg-slate-900/98 px-3 sm:px-5 py-2.5"
        >
          <div className="mx-auto max-w-[1680px] flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-200 mr-1">
                Đồ họa ({GRAPHICS_TIER_LABELS[gfx.profile.tier]}):
              </span>
              {(['auto', 'high', 'balanced', 'low'] as const satisfies readonly BoardGameQualitySetting[]).map(
                (q) => {
                  const active = gfx.prefs.quality === q;
                  return (
                    <button
                      key={q}
                      type="button"
                      data-testid={`bg-quality-${q}`}
                      aria-pressed={active}
                      onClick={() => gfx.setQuality(q)}
                      className={`px-2.5 py-1.5 min-h-[36px] rounded-xl border text-xs font-bold transition cursor-pointer ${
                        active
                          ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
                      }`}
                    >
                      {GRAPHICS_QUALITY_LABELS[q]}
                    </button>
                  );
                },
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                data-testid="bg-shake-toggle-btn"
                aria-pressed={!gfx.prefs.shakeEnabled}
                onClick={() => gfx.setShakeEnabled(!gfx.prefs.shakeEnabled)}
                className={`px-2.5 py-1.5 min-h-[36px] rounded-xl border text-xs font-bold transition cursor-pointer ${
                  !gfx.prefs.shakeEnabled
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
                }`}
              >
                {gfx.prefs.shakeEnabled ? '📳 Rung mạnh: BẬT' : '🛡️ Tắt rung mạnh'}
              </button>
              <button
                type="button"
                data-testid="bg-reduced-motion-toggle-btn"
                aria-pressed={vfx.reducedMotion}
                onClick={() => gfx.setReducedMotionOverride(!vfx.reducedMotion)}
                className={`px-2.5 py-1.5 min-h-[36px] rounded-xl border text-xs font-bold transition cursor-pointer ${
                  vfx.reducedMotion
                    ? 'bg-amber-500/20 border-amber-400 text-amber-100'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
                }`}
              >
                {vfx.reducedMotion ? '⏸️ Giảm chuyển động: BẬT' : '✨ Chuyển động: ĐẦY ĐỦ'}
              </button>
              <button
                type="button"
                data-testid="bg-panel-mute-toggle-btn"
                aria-pressed={effectiveMuted}
                onClick={handleToggleSoundClick}
                className={`px-2.5 py-1.5 min-h-[36px] rounded-xl border text-xs font-bold transition cursor-pointer ${
                  effectiveMuted
                    ? 'bg-rose-500/20 border-rose-400 text-rose-100'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
                }`}
              >
                {effectiveMuted ? '🔇 Đang tắt tiếng' : '🔊 Âm thanh: BẬT'}
              </button>
              <button
                type="button"
                data-testid="bg-panel-skip-cinematic-btn"
                onClick={vfx.skipAllAnimations}
                className="px-2.5 py-1.5 min-h-[36px] rounded-xl border border-amber-400/60 bg-amber-950/50 hover:bg-amber-900/60 text-xs font-bold text-amber-200 transition cursor-pointer"
              >
                ⏭️ Skip Cinematic
              </button>
            </div>
          </div>
        </section>
      )}

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
          className={`min-h-[40px] rounded-xl px-2 text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
            mobileTab === 'role'
              ? 'bg-amber-400 text-slate-950'
              : 'bg-slate-800 text-slate-200 border border-slate-700'
          }`}
        >
          <span>🎭 Vai bí mật</span>
          {unreadClueCount > 0 && (
            <span
              data-testid="bg-mobile-tab-role-badge"
              className="inline-flex items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white"
            >
              {unreadClueCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('log')}
          className={`min-h-[40px] rounded-xl px-2 text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
            mobileTab === 'log'
              ? 'bg-emerald-400 text-slate-950'
              : 'bg-slate-800 text-slate-200 border border-slate-700'
          }`}
        >
          <span>📜 Nhật ký</span>
          {unreadLogCount > 0 && mobileTab !== 'log' && (
            <span
              data-testid="bg-mobile-tab-log-badge"
              className="inline-flex items-center justify-center rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-black leading-none text-slate-950"
            >
              {unreadLogCount > 9 ? '9+' : unreadLogCount}
            </span>
          )}
        </button>
      </nav>

      {/* BANNER THÔNG BÁO SỰ KIỆN NỔI BẬT (NẾU CÓ) */}
      {(displayedError ||
        publicGame.lastInvestigation ||
        publicGame.lastRevealEvent ||
        unreadClueCount > 0 ||
        latestEmote) && (
        <div className="shrink-0 bg-slate-950/90 border-b border-slate-800/80 px-3 sm:px-5 py-1.5">
          <div className="mx-auto max-w-[1680px] flex flex-wrap items-center gap-2">
            {displayedError && (
              <div className="rounded-xl bg-rose-950/80 border border-rose-500/60 px-3 py-1.5 text-xs sm:text-sm font-bold text-rose-100">
                ⚠️ {displayedError}
              </div>
            )}
            {unreadClueCount > 0 && (
              <div
                data-testid="bg-unread-clue-banner"
                className="rounded-xl bg-amber-950/70 border border-amber-400/60 px-3 py-1.5 text-xs sm:text-sm font-bold text-amber-100 flex items-center gap-2"
              >
                <span>🕵️ Bạn có {unreadClueCount} mật báo thăm dò mới!</span>
                <button
                  type="button"
                  data-testid="bg-open-unread-clues-btn"
                  onClick={() => {
                    setSideDrawerOpen(true);
                    setMobileTab('role');
                  }}
                  className="px-2 py-0.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer"
                >
                  Mở đọc
                </button>
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

      {/* NỘI DUNG CHÍNH: BÀN CỜ CUỘN ĐỘC LẬP + THANH HÀNH ĐỘNG NEO ĐÁY + NGĂN PHỤ ĐỘC LẬP + LỚP VFX */}
      <div ref={boardStageRef} className="relative flex-1 min-h-0 flex flex-col">
        <main
          className={`flex-1 min-h-0 overflow-y-auto lg:overflow-hidden px-2.5 sm:px-4 py-2 ${
            vfx.screenShake === 'heavy'
              ? 'bg-vfx-shake-heavy'
              : vfx.screenShake === 'light'
                ? 'bg-vfx-shake-light'
                : ''
          }`}
        >
        <div className="mx-auto max-w-[1680px] lg:h-full flex flex-col lg:flex-row gap-3 items-stretch">
          {/* CỘT CHÍNH: PHẦN BÀN CỜ TRÊN + THANH HÀNH ĐỘNG NEO ĐÁY */}
          <div
            className={`w-full min-w-0 flex-1 flex flex-col gap-2 lg:h-full lg:min-h-0 ${
              mobileTab !== 'board' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div
              data-testid="bg-board-scroll-area"
              className="flex-1 min-h-0 lg:overflow-y-auto lg:pr-1 space-y-2.5"
            >
              {/* 1. THANG THƯƠNG TÍCH CÔNG KHAI GỌN 0..14 (Damage Track) */}
              <section
                data-testid="bg-damage-track"
                className="rounded-2xl border border-slate-700/80 bg-slate-900/90 px-3 py-2 space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-200">
                    🩸 Thang Thương Tích Công Khai (0 → 14)
                  </h2>
                  <span className="text-[11px] text-slate-400">
                    Máu tối đa (8–14) giữ bí mật tới khi lật vai · 🎯 Mốc của bạn · 💀 Ngưỡng gục đã lộ
                  </span>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-[minmax(92px,2fr)_repeat(14,minmax(0,1fr))] gap-1">
                  {WOUND_NOTCHES.map((notch) => {
                    const occupants = playersByWoundNotch[notch];
                    const isSelfMaxNotch = Boolean(
                      privateView && privateView.maxHp === notch,
                    );
                    const revealedAtNotch = publicGame.players.filter(
                      (p) => p.revealedMaxHp === notch,
                    );
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
                        className={`min-h-[42px] rounded-lg border px-1 py-0.5 flex flex-col items-center justify-between gap-0.5 ${tone}`}
                      >
                        <span className="text-[11px] font-black leading-none flex items-center gap-0.5">
                          <span>{notch === 14 ? '14 💀' : notch}</span>
                          {isSelfMaxNotch && <span title="Mốc tử trận của bạn">🎯</span>}
                          {!isSelfMaxNotch && revealedAtNotch.length > 0 && notch !== 14 && (
                            <span title={`Ngưỡng gục: ${revealedAtNotch.map((p) => p.displayName).join(', ')}`}>
                              💀
                            </span>
                          )}
                        </span>
                        <div className="flex flex-wrap items-center justify-center -space-x-1.5 gap-y-0.5">
                          {occupants.map((p) => (
                            <PlayerPawnToken
                              key={p.playerId}
                              size="xs"
                              elevated={false}
                              displayName={p.displayName}
                              seatIndex={p.seatIndex}
                              alive={p.alive}
                              isActive={p.playerId === publicGame.activePlayerId}
                              isSelf={p.playerId === selfPlayerId}
                              revealedFaction={p.revealedFaction}
                              revealedRoleId={p.revealedRoleId}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 2. BÀN CỜ 3 CỤM KHU VỰC ĐÔI (XÁO NGẪU NHIÊN ĐẦU MỖI VÁN) */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {boardClusters.map((cluster) => (
                  <div
                    key={cluster.clusterId}
                    className={`rounded-2xl border p-2.5 space-y-2 ${cluster.ringClass}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full border text-[11px] font-black whitespace-nowrap shrink-0 ${cluster.badgeClass}`}
                      >
                        {cluster.title}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-300">
                        Đánh chung cụm
                      </span>
                    </div>

                    <div className="space-y-2">
                      {cluster.locations.map((locId) => {
                        const occupants = publicGame.players.filter(
                          (p) => p.location === locId,
                        );
                        const isSelfHere = selfPlayer?.location === locId;
                        const canChooseMoveHere =
                          isMyTurn &&
                          publicGame.turnPhase === 'CHOOSE_MOVE' &&
                          !isSelfHere &&
                          (!publicGame.allowedMoveDestinations ||
                            publicGame.allowedMoveDestinations.includes(locId));
                        const rolledDestinationHere =
                          publicGame.lastDiceRoll?.kind === 'move' &&
                          publicGame.lastDiceRoll.resolvedLocation === locId;

                        return (
                          <TabletopLocationTile
                            key={locId}
                            locId={locId}
                            occupants={occupants}
                            selfPlayerId={selfPlayerId}
                            activePlayerId={publicGame.activePlayerId}
                            selectedTargetId={selectedTargetId}
                            attackableIds={attackableIdsOnBoard}
                            isSelfHere={isSelfHere}
                            canChooseMoveHere={canChooseMoveHere}
                            rolledDestinationHere={rolledDestinationHere}
                            reducedMotion={vfx.reducedMotion}
                            enableMist={gfx.profile.enableMistDrift}
                            enableBackdropBlur={gfx.profile.enableBackdropBlur}
                            onChooseDestination={handleChooseDestination}
                            onSelectPlayer={setSelectedTargetId}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>

              {/* 3. KHAY XÚC XẮC TƯƠNG TÁC (1d6+1d4) & 3 CHỒNG BÀI BẤM RÚT TRỰC TIẾP */}
              <section
                data-testid="bg-dice-tray"
                className="rounded-2xl border border-slate-700/80 bg-slate-900/90 px-3 py-2 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5"
              >
                {(() => {
                  const diceAnimateCls = dicePulse
                    ? 'scale-110 -rotate-6 transition-transform duration-200'
                    : 'transition-transform duration-200';
                  const rerollNeeded =
                    canRollOnBoard &&
                    Boolean(
                      publicGame.lastDiceRoll?.rerollRequired &&
                        publicGame.lastDiceRoll.playerId === selfPlayerId,
                    );
                  const diceSummary = publicGame.lastDiceRoll ? (
                    <>
                      <div className={`flex items-center gap-1.5 shrink-0 ${diceAnimateCls}`}>
                        {publicGame.lastDiceRoll.d6 > 0 && (
                          <DiceD6Svg value={publicGame.lastDiceRoll.d6} size={36} />
                        )}
                        <DiceD4Svg value={publicGame.lastDiceRoll.d4} size={36} />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-xs sm:text-sm font-black text-white truncate">
                          {publicGame.lastDiceRoll.kind === 'move'
                            ? `${publicGame.lastDiceRoll.displayName} tung ${publicGame.lastDiceRoll.d6} + ${publicGame.lastDiceRoll.d4} = ${publicGame.lastDiceRoll.total}`
                            : `${publicGame.lastDiceRoll.displayName} tung đòn đánh (${
                                publicGame.lastDiceRoll.d6 > 0
                                  ? `|${publicGame.lastDiceRoll.d6} - ${publicGame.lastDiceRoll.d4}|`
                                  : `1d4=${publicGame.lastDiceRoll.d4}`
                              } → gây ${publicGame.lastDiceRoll.damageDealt ?? 0} sát thương)`}
                        </p>
                        <p className="text-[11px] sm:text-xs text-cyan-200 font-semibold truncate">
                          {publicGame.lastDiceRoll.rerollRequired
                            ? '🔁 Trùng khu vực hiện tại — được quyền ĐỔ LẠI!'
                            : publicGame.lastDiceRoll.freeChoice
                              ? publicGame.allowedMoveDestinations &&
                                publicGame.allowedMoveDestinations.length < 5
                                ? `🧭 La Bàn! Chọn 1 trong ${publicGame.allowedMoveDestinations.length} khu vực hợp lệ.`
                                : '✨ Tổng 7! Tự do chọn khu vực bất kỳ.'
                              : publicGame.lastDiceRoll.resolvedLocation
                                ? `Điểm đến: ${LOCATION_VISUAL_META[publicGame.lastDiceRoll.resolvedLocation].name}`
                                : 'Sẵn sàng tung xúc xắc tiếp theo.'}
                        </p>
                        {publicGame.lastDiceRoll.kind === 'attack' &&
                          publicGame.lastDiceRoll.counterRoll && (
                            <p
                              data-testid="bg-dice-counter-roll"
                              className="text-[11px] sm:text-xs text-amber-300 font-bold truncate"
                            >
                              🥊 {publicGame.lastDiceRoll.counterRoll.displayName} phản kích (
                              {publicGame.lastDiceRoll.counterRoll.d6 > 0
                                ? `|${publicGame.lastDiceRoll.counterRoll.d6} - ${publicGame.lastDiceRoll.counterRoll.d4}|`
                                : `1d4=${publicGame.lastDiceRoll.counterRoll.d4}`}
                              ) → trả đòn {publicGame.lastDiceRoll.counterRoll.damageDealt} sát thương!
                            </p>
                          )}
                      </div>
                      {canRollOnBoard && (
                        <span className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-400 text-slate-950 text-xs font-black whitespace-nowrap">
                          {rerollNeeded ? '🔁 Đổ lại!' : '🎲 Bấm tung'}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <div className={`flex items-center gap-1.5 shrink-0 ${diceAnimateCls}`}>
                        <DiceD6Svg value={6} size={36} />
                        <DiceD4Svg value={4} size={36} />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-xs sm:text-sm font-black text-white truncate">
                          Khay Xúc Xắc Bóng Đêm (1d6 + 1d4)
                        </p>
                        <p className="text-[11px] sm:text-xs text-slate-300 truncate">
                          Tung xúc xắc di chuyển · Tổng 7 chọn bất kỳ · Trùng chỗ được đổ lại
                        </p>
                      </div>
                      {canRollOnBoard && (
                        <span className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-400 text-slate-950 text-xs font-black whitespace-nowrap">
                          🎲 Bấm tung
                        </span>
                      )}
                    </>
                  );

                  return canRollOnBoard ? (
                    <button
                      type="button"
                      data-testid="bg-board-roll-dice-btn"
                      onClick={() => dispatchAction({ type: 'ROLL_DICE' })}
                      className="flex items-center gap-3 flex-1 min-w-0 rounded-xl border border-emerald-400/75 bg-emerald-950/35 hover:bg-emerald-900/45 px-2.5 py-1.5 shadow-[0_0_16px_rgba(16,185,129,0.2)] transition cursor-pointer"
                    >
                      {diceSummary}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 flex-1 min-w-0 px-1">
                      {diceSummary}
                    </div>
                  );
                })()}

                {/* 3 Chồng bài (bấm trực tiếp ở Pha 2 khi đang đứng ở khu vực hợp lệ) */}
                <div className="grid grid-cols-3 gap-2 shrink-0">
                  {(
                    [
                      ['investigation', 'Khám Phá', 'text-emerald-300', 'border-emerald-400 bg-emerald-950/50 hover:bg-emerald-900/60 shadow-[0_0_14px_rgba(16,185,129,0.24)]'],
                      ['equipment', 'Cung Ứng', 'text-sky-300', 'border-sky-400 bg-sky-950/50 hover:bg-sky-900/60 shadow-[0_0_14px_rgba(56,189,248,0.24)]'],
                      ['event', 'Đột Kích', 'text-rose-300', 'border-rose-400 bg-rose-950/50 hover:bg-rose-900/60 shadow-[0_0_14px_rgba(244,63,94,0.24)]'],
                    ] as const
                  ).map(([deckId, label, cls, activeCls]) => {
                    const canDrawHere = canDrawDeckOnBoard(deckId);
                    const deckInner = (
                      <>
                        <DeckCardBackSvg deck={deckId} size={28} />
                        <div className="min-w-0 text-left">
                          <div className="flex items-center gap-1">
                            <p className={`text-[11px] font-extrabold truncate ${cls}`}>{label}</p>
                            {canDrawHere && (
                              <span className="text-[10px] font-black text-amber-200 whitespace-nowrap">
                                👆 Rút
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm font-black text-white">
                            {publicGame.deckCounts[deckId]} lá
                          </p>
                        </div>
                      </>
                    );

                    return canDrawHere ? (
                      <button
                        key={deckId}
                        type="button"
                        data-vfx-deck={deckId}
                        data-testid={`bg-board-draw-${deckId}`}
                        onClick={() => dispatchAction({ type: 'DRAW_CARD', deck: deckId })}
                        className={`rounded-xl border px-2.5 py-1.5 min-h-[42px] flex items-center gap-2 transition cursor-pointer ${activeCls}`}
                      >
                        {deckInner}
                      </button>
                    ) : (
                      <div
                        key={deckId}
                        data-vfx-deck={deckId}
                        className={`rounded-xl border border-slate-700 bg-slate-950/85 px-2.5 py-1.5 flex items-center gap-2 transition ${
                          isMyTurn && publicGame.turnPhase === 'LOCATION_ACTION'
                            ? 'opacity-55'
                            : ''
                        }`}
                      >
                        {deckInner}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 4. DẢI NGƯỜI CHƠI TINH GỌN */}
              <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {publicGame.players.map((p) => {
                  const selected = selectedTargetId === p.playerId;
                  const isTurnHolder = p.playerId === publicGame.activePlayerId;
                  const inAttackRange = attackableIdsOnBoard.has(p.playerId);
                  const isSelfCard = p.playerId === selfPlayerId;
                  const factionTheme = p.revealedFaction ? FACTION_THEME[p.revealedFaction] : null;
                  const locMeta = LOCATION_VISUAL_META[p.location];
                  return (
                    <div
                      key={p.playerId}
                      className={`rounded-xl border px-2.5 py-2 flex flex-col justify-between gap-1.5 transition ${
                        !p.alive
                          ? 'opacity-55 border-slate-800 bg-slate-950/60'
                          : selected
                            ? isSelfCard
                              ? 'border-emerald-400 bg-emerald-950/40 ring-2 ring-emerald-400/50'
                              : 'border-rose-400 bg-rose-950/40 ring-2 ring-rose-400/50'
                            : isTurnHolder
                              ? 'border-amber-400 bg-slate-900'
                              : inAttackRange
                                ? 'border-rose-500/60 bg-slate-900/90 hover:border-rose-400'
                                : 'border-slate-700/80 bg-slate-900/80 hover:border-cyan-400/50'
                      }`}
                    >
                      <button
                        type="button"
                        data-vfx-player-strip={p.playerId}
                        data-testid={isSelfCard ? 'bg-player-strip-self' : undefined}
                        aria-pressed={selected}
                        onClick={() =>
                          setSelectedTargetId((prev) =>
                            toggleSelectedTargetId(prev, p.playerId, p.alive),
                          )
                        }
                        className="w-full text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <PlayerPawnToken
                            compact
                            elevated
                            displayName={p.displayName}
                            seatIndex={p.seatIndex}
                            alive={p.alive}
                            isActive={isTurnHolder}
                            isSelf={isSelfCard}
                            revealedFaction={p.revealedFaction}
                            revealedRoleId={p.revealedRoleId}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs sm:text-sm font-black text-white truncate">
                                {p.displayName}
                              </p>
                              {inAttackRange && (
                                <span className="text-[10px] font-black text-amber-200 shrink-0">
                                  ⚔️
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-[11px] font-bold truncate ${factionTheme ? factionTheme.textClass : 'text-slate-400'}`}
                            >
                              {p.revealedRoleId
                                ? `${FACTION_LABELS[p.revealedFaction!]} · Max ${p.revealedMaxHp}`
                                : 'Vai ẩn danh'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] font-bold">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-rose-200">
                            🩸 {p.woundsTaken} vết
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-200">
                            Ô {locMeta.diceLabel}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
                            🃏 {p.handCount}
                          </span>
                          {p.guardianShieldActive && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-200">
                              🛡️ Khiên
                            </span>
                          )}
                        </div>
                      </button>

                      {(p.equipped.length > 0 || p.revealedRoleId) && (
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          {p.revealedRoleId && (
                            <button
                              type="button"
                              onClick={() =>
                                setZoomTarget({
                                  kind: 'role',
                                  roleId: p.revealedRoleId!,
                                  revealed: true,
                                  viewerMode: 'other-player',
                                  woundsTaken: p.woundsTaken,
                                  currentHp: p.revealedMaxHp
                                    ? Math.max(0, p.revealedMaxHp - p.woundsTaken)
                                    : undefined,
                                })
                              }
                              title={`Phóng lớn thẻ vai đã lộ của ${p.displayName}`}
                              className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-amber-950/70 border border-amber-400/45 text-amber-200 hover:bg-amber-900/70 transition cursor-pointer"
                            >
                              🔍 Soi vai
                            </button>
                          )}
                          {p.equipped.map((eq, i) => (
                            <button
                              key={`${eq.id}-${i}`}
                              type="button"
                              onClick={() =>
                                setZoomTarget({
                                  kind: 'card',
                                  cardId: eq.id,
                                  zone: 'equipped-table',
                                })
                              }
                              title={`${eq.summary} (Bấm để phóng lớn thẻ)`}
                              className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-sky-950/70 border border-sky-500/40 text-sky-200 hover:border-sky-300 truncate max-w-full cursor-pointer"
                            >
                              🎒 {eq.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            </div>

            {/* 5. THANH HÀNH ĐỘNG NEO CỐ ĐỊNH Ở ĐÁY TRÊN DESKTOP */}
            <div className="shrink-0 lg:max-h-[44vh] lg:overflow-y-auto">
              <ActionPanel
                publicGame={publicGame}
                privateView={privateView}
                selfPlayerId={selfPlayerId}
                isSpectator={isSpectator}
                selectedTargetId={selectedTargetId}
                onSelectTarget={setSelectedTargetId}
                onAction={dispatchAction}
                onZoomCard={(cardId, zone) =>
                  setZoomTarget({
                    kind: 'card',
                    cardId,
                    zone,
                    isParticipantInInvestigation: true,
                  })
                }
              />
            </div>
          </div>

          {/* NGĂN KÉO PHỤ BÊN PHẢI (CUỘN ĐỘC LẬP TRÊN DESKTOP): THẺ VAI + NHẬT KÝ + EMOTE & CHAT */}
          {(sideDrawerOpen || mobileTab !== 'board') && (
            <div
              data-testid="bg-side-drawer"
              className={`w-full lg:w-[376px] xl:w-[400px] shrink-0 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1 space-y-3 ${
                mobileTab === 'board' ? 'hidden lg:block' : 'block'
              }`}
            >
              <div className={mobileTab === 'log' ? 'hidden lg:block' : 'block'}>
                <RoleCard
                  publicGame={publicGame}
                  privateView={privateView}
                  isSpectator={isSpectator}
                  visualStyle="midnight-noir"
                  foilEnabled={gfx.profile.enableFoil}
                  reducedMotion={!gfx.profile.enable3DTilt || vfx.reducedMotion}
                  onZoomRole={() =>
                    privateView &&
                    setZoomTarget({
                      kind: 'role',
                      roleId: privateView.roleId,
                      revealed: privateView.revealed,
                      viewerMode: 'owner-peek',
                      woundsTaken: privateView.woundsTaken,
                      currentHp: privateView.hp,
                    })
                  }
                  onZoomCard={(cardId, zone = 'equipped-table') =>
                    setZoomTarget({
                      kind: 'card',
                      cardId,
                      zone,
                      isParticipantInInvestigation: true,
                    })
                  }
                />
              </div>

              <div className={mobileTab === 'role' ? 'hidden lg:block' : 'block'}>
                <GameLog publicGame={publicGame} />

                {/* Emote & Chat nhanh */}
                <div className="mt-3 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-3 space-y-2">
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

        <BoardGameVfxStage
          vfx={vfx}
          containerRef={boardStageRef}
          publicGame={publicGame}
          sourcePlayerId={selfPlayerId}
          selectedTargetId={selectedTargetId}
          targetingTone={selectedTargetId && selectedTargetId === selfPlayerId ? 'heal' : 'hostile'}
        />
      </div>

      {/* MODAL TỔNG KẾT VÁN ĐẤU */}
      {publicGame.winnerLabel && publicGame.finalReveal && (
        <MatchResult
          publicGame={publicGame}
          selfPlayerId={selfPlayerId}
          isSpectator={isSpectator}
          postcardSlot={<MatchPostcard publicGame={publicGame} inviteCode={inviteCode} />}
          onOpenLeaderboard={onOpenLeaderboard}
          onPlayAgain={onPlayAgain}
          onLeaveMatch={onLeaveMatch}
        />
      )}

      {/* MODAL PHÓNG LỚN THẺ BÀI */}
      <MidnightCardZoomModal
        target={zoomTarget}
        reducedMotion={!gfx.profile.enable3DTilt || vfx.reducedMotion}
        foilEnabled={gfx.profile.enableFoil}
        enableBackdropBlur={gfx.profile.enableBackdropBlur}
        onClose={handleCloseZoom}
      />

      {/* HỘP THOẠI XÁC NHẬN RỜI VÁN */}
      {leaveConfirmOpen && (
        <div
          className={`fixed inset-0 z-[55] flex items-center justify-center p-4 ${
            gfx.profile.enableBackdropBlur ? 'bg-slate-950/75 backdrop-blur-sm' : 'bg-slate-950/90'
          }`}
        >
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
