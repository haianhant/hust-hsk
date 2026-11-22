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
  type BoardGamePrivateClueEntry,
  type BoardGamePrivateGameView,
  type BoardGamePublicGameView,
} from '../network/contracts';
import { FACTION_LABELS } from '../domain/roles';
import { areInSameCluster, getLocationDefinition } from '../domain/rules';
import {
  buildBoardClustersView,
  DeckCardBackSvg,
  LOCATION_VISUAL_META,
} from './BoardGameArt';
import { MIDNIGHT_CARD_ART } from './midnight-noir-tokens';
import { MidnightDicePair3D } from './MidnightDice3D';
import RoleCard from './RoleCard';
import ActionPanel from './ActionPanel';
import GameLog from './GameLog';
import MatchPostcard from './MatchPostcard';
import MatchResult from './MatchResult';
import { BoardGameVfxStage, useBoardGameVfxQueue } from './BoardGameVfxStage';
import { computeDiceSig } from './vfx-queue';
import { TabletopLocationTile } from './TabletopLocationTile';
import { DamageTrack } from './DamageTrack';
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
  const [desktopSidebarTab, setDesktopSidebarTab] = useState<'role' | 'gear' | 'log'>('role');
  const [isDesktopLayout, setIsDesktopLayout] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false,
  );
  const [mobileTab, setMobileTab] = useState<'board' | 'role' | 'log'>('board');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<BoardGameLocationId | null>(null);
  const [chatText, setChatText] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [localMuted, setLocalMuted] = useState(() => isBoardGameSoundMuted());
  const [seenClueCount, setSeenClueCount] = useState(0);
  const [seenLogCount, setSeenLogCount] = useState(() => publicGame.publicLog.length);
  const [zoomTarget, setZoomTarget] = useState<MidnightZoomTarget | null>(null);
  const [pendingGreenClues, setPendingGreenClues] = useState<BoardGamePrivateClueEntry[]>([]);
  const seenReceivedClueIdsRef = useRef<{
    matchId: string;
    seeded: boolean;
    ids: Set<string>;
  }>({
    matchId: publicGame.matchId,
    seeded: Boolean(privateView),
    ids: new Set((privateView?.privateClues ?? []).map((c) => c.id)),
  });
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

  const diceRollSignature = computeDiceSig(publicGame) ?? '';

  useSmoothPawnGlide({
    containerRef: boardStageRef,
    players: publicGame.players,
    matchId: publicGame.matchId,
    reducedMotion: vfx.reducedMotion,
    qualityTier: gfx.profile.tier,
    durationMs: gfx.profile.pawnGlideDurationMs,
    diceRollSignature,
    skipGeneration: vfx.skipGeneration,
  });

  // Giữ nhãn vị trí hiển thị ("📍 Bạn ở đây", badge "Ô ...") ở ô cũ cho tới đúng diceSettleAtMs,
  // đồng bộ 100% với BoardGameVfxStage và FLIP Pawn Glide.
  const committedLocationsRef = useRef<{
    matchId: string;
    map: Map<string, BoardGameLocationId>;
  }>({
    matchId: publicGame.matchId,
    map: new Map(publicGame.players.map((p) => [p.playerId, p.location])),
  });
  const holdCommittedLocationForDice =
    !vfx.isDiceSettled && vfx.activeDiceRoll?.diceKind === 'move';
  if (
    committedLocationsRef.current.matchId !== publicGame.matchId ||
    !holdCommittedLocationForDice
  ) {
    committedLocationsRef.current = {
      matchId: publicGame.matchId,
      map: new Map(publicGame.players.map((p) => [p.playerId, p.location])),
    };
  }
  const getCommittedLocation = (
    p: BoardGamePublicGameView['players'][number],
  ): BoardGameLocationId =>
    holdCommittedLocationForDice
      ? (committedLocationsRef.current.map.get(p.playerId) ?? p.location)
      : p.location;

  const prevTurnRef = useRef<number>(publicGame.turnNumber);
  const sawLiveVictoryCinematicRef = useRef<string | null>(null);
  if (vfx.isVictoryCinematicActive && publicGame.matchId) {
    sawLiveVictoryCinematicRef.current = publicGame.matchId;
  }
  const showMatchResultModal = Boolean(
    publicGame.winnerLabel && publicGame.finalReveal && !vfx.isVictoryCinematicActive,
  );
  const animateMatchResultEntrance =
    showMatchResultModal && sawLiveVictoryCinematicRef.current === publicGame.matchId;
  const prevEmoteItemRef = useRef<BoardGameChatEmoteServerMessage | null>(
    recentEmotes.length > 0 ? recentEmotes[recentEmotes.length - 1] : null,
  );

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
    setSeenClueCount(privateView?.privateClues.length ?? 0);
    setSeenLogCount(publicGame.publicLog.length);
    setSelectedTargetId(null);
    setSelectedLocationId(null);
    setZoomTarget(null);
    setPendingGreenClues([]);
    seenReceivedClueIdsRef.current = {
      matchId: publicGame.matchId,
      seeded: Boolean(privateView),
      ids: new Set((privateView?.privateClues ?? []).map((c) => c.id)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicGame.matchId]);

  const isMatchFinished = Boolean(publicGame.winnerLabel);

  // Khi ván đấu đã kết thúc, tự động đóng popup Thẻ Xanh để không che modal Kết quả / Postcard
  useEffect(() => {
    if (isMatchFinished) {
      setPendingGreenClues([]);
    }
  }, [isMatchFinished]);

  // Phát hiện Thẻ Xanh bí mật mới được người chơi khác đưa cho MÌNH để bật popup riêng tư (chống lặp khi F5)
  useEffect(() => {
    if (isSpectator || !privateView || isMatchFinished) return;
    if (
      seenReceivedClueIdsRef.current.matchId !== publicGame.matchId ||
      !seenReceivedClueIdsRef.current.seeded
    ) {
      seenReceivedClueIdsRef.current = {
        matchId: publicGame.matchId,
        seeded: true,
        ids: new Set(privateView.privateClues.map((c) => c.id)),
      };
      return;
    }
    const newlyReceived: BoardGamePrivateClueEntry[] = [];
    for (const clue of privateView.privateClues) {
      if (seenReceivedClueIdsRef.current.ids.has(clue.id)) continue;
      seenReceivedClueIdsRef.current.ids.add(clue.id);
      const isReceivedGreenCard =
        clue.direction === 'received' ||
        (clue.direction === undefined &&
          (clue.detail.startsWith('Bạn nhận') || clue.detail.includes('đã đưa')));
      if (isReceivedGreenCard) {
        newlyReceived.push(clue);
      }
    }
    if (newlyReceived.length > 0) {
      setPendingGreenClues((prev) => [...prev, ...newlyReceived]);
    }
  }, [isSpectator, privateView, publicGame.matchId]);

  const activeGreenClue = !isSpectator && privateView ? pendingGreenClues[0] ?? null : null;
  const dismissActiveGreenClue = useCallback(() => {
    setPendingGreenClues((prev) => prev.slice(1));
    setSeenClueCount((prev) => Math.max(prev, privateView?.privateClues.length ?? 0));
  }, [privateView?.privateClues.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (zoomTarget !== null) return;
      if (activeGreenClue) {
        dismissActiveGreenClue();
      } else if (leaveConfirmOpen) {
        setLeaveConfirmOpen(false);
      } else if (settingsPanelOpen) {
        setSettingsPanelOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomTarget, activeGreenClue, dismissActiveGreenClue, leaveConfirmOpen, settingsPanelOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => {
      if (window.matchMedia) {
        setIsDesktopLayout(window.matchMedia('(min-width: 1024px)').matches);
      } else {
        setIsDesktopLayout(window.innerWidth >= 1024);
      }
    };
    sync();
    const mq = window.matchMedia?.('(min-width: 1024px)');
    mq?.addEventListener?.('change', sync);
    window.addEventListener('resize', sync);
    return () => {
      mq?.removeEventListener?.('change', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  const totalClues = privateView?.privateClues.length ?? 0;
  useEffect(() => {
    if ((isDesktopLayout && sideDrawerOpen && desktopSidebarTab === 'gear') || (!isDesktopLayout && mobileTab === 'role')) {
      setSeenClueCount((prev) => Math.max(prev, totalClues));
    }
  }, [isDesktopLayout, sideDrawerOpen, desktopSidebarTab, mobileTab, totalClues]);

  useEffect(() => {
    if ((isDesktopLayout && sideDrawerOpen && desktopSidebarTab === 'log') || (!isDesktopLayout && mobileTab === 'log')) {
      setSeenLogCount((prev) => Math.max(prev, publicGame.publicLog.length));
    }
  }, [isDesktopLayout, sideDrawerOpen, desktopSidebarTab, mobileTab, publicGame.publicLog.length]);

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
      setSelectedLocationId(null);
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

  const selfPlayer = useMemo(
    () => publicGame.players.find((p) => p.playerId === selfPlayerId) ?? null,
    [publicGame.players, selfPlayerId],
  );
  const committedSelfLocation = selfPlayer ? getCommittedLocation(selfPlayer) : null;
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

  const handleSelectPlayer = useCallback(
    (updater: ((prev: string | null) => string | null) | string | null) => {
      setSelectedTargetId((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (next !== null) setSelectedLocationId(null);
        return next;
      });
    },
    [],
  );

  const handleSelectLocation = useCallback((locId: BoardGameLocationId) => {
    setSelectedTargetId(null);
    setSelectedLocationId((prev) => (prev === locId ? null : locId));
  }, []);

  const handleClearContext = useCallback(() => {
    setSelectedTargetId(null);
    setSelectedLocationId(null);
  }, []);

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
      {/* THANH HEADER MỘT HÀNG TINH GỌN (THU GỌN NÚT PHỤ VÀO SETTINGS) */}
      <header
        data-testid="bg-v3-status-bar"
        className="relative z-50 shrink-0 h-11 border-b border-slate-800 bg-slate-900/95 px-2.5 sm:px-3.5 flex items-center"
      >
        <div className="w-full mx-auto max-w-[1840px] flex flex-nowrap items-center justify-between gap-2 min-w-0">
          <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 min-w-0 overflow-hidden">
            <span className="text-xs sm:text-sm font-black tracking-tight text-white whitespace-nowrap shrink-0">
              🌙 Săn Bóng Đêm KTX
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-cyan-200 whitespace-nowrap shrink-0">
              Vòng {publicGame.round}
            </span>
            <span className="hidden md:inline-flex px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-amber-200 truncate max-w-[200px] xl:max-w-[300px]">
              {PHASE_LABEL[publicGame.turnPhase]}
            </span>
            <span
              data-testid="bg-turn-timer"
              className={`px-2 py-0.5 rounded-lg border text-xs font-extrabold whitespace-nowrap shrink-0 ${
                remainingSec === null
                  ? 'bg-emerald-500/15 border-emerald-400/45 text-emerald-200'
                  : remainingSec <= 10
                    ? 'bg-rose-500/20 border-rose-400/60 text-rose-100 animate-pulse'
                    : 'bg-amber-500/15 border-amber-400/45 text-amber-100'
              }`}
            >
              {remainingSec === null ? (
                <>
                  <span>∞</span>
                  <span className="hidden sm:inline"> Suy nghĩ tự do</span>
                </>
              ) : (
                `⏱️ ${remainingSec}s`
              )}
            </span>
            {activePlayer && !publicGame.winnerLabel && (
              <span className="text-xs font-semibold text-slate-300 truncate min-w-0">
                Lượt:{' '}
                <strong className={isMyTurn ? 'text-amber-300' : 'text-white'}>
                  {activePlayer.displayName}
                </strong>
              </span>
            )}
          </div>

          <div className="flex flex-nowrap items-center gap-1.5 shrink-0">
            {inviteCode && (
              <span
                data-testid="bg-board-invite-code"
                className="hidden sm:inline-flex px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300 whitespace-nowrap"
              >
                Mã: {inviteCode}
              </span>
            )}
            {isDesktopLayout && !sideDrawerOpen && (
              <button
                type="button"
                onClick={() => setSideDrawerOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[32px] rounded-xl bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-500/45 text-xs font-bold text-cyan-200 whitespace-nowrap transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                ◧ Sidebar
              </button>
            )}
            <button
              type="button"
              data-testid="bg-graphics-settings-btn"
              onClick={() => setSettingsPanelOpen((v) => !v)}
              aria-expanded={settingsPanelOpen}
              aria-label="Cài đặt đồ họa, luật chơi và trợ năng"
              title={`Cài đặt (${GRAPHICS_TIER_LABELS[gfx.profile.tier]})`}
              className={`inline-flex items-center gap-1 px-2.5 py-1 min-h-[32px] rounded-xl border text-xs font-bold whitespace-nowrap transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                settingsPanelOpen
                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-100'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-100'
              }`}
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Cài đặt</span>
            </button>
            <button
              type="button"
              data-testid="bg-board-leave-btn"
              onClick={() => setLeaveConfirmOpen(true)}
              className="inline-flex items-center px-2.5 py-1 min-h-[32px] rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-500/50 text-xs font-bold text-rose-100 whitespace-nowrap transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              🚪 Rời
            </button>
          </div>
        </div>
      </header>

      {/* POPOVER CÀI ĐẶT NỔI (TRÁNH ĐẨY CHIỀU CAO BÀN CỜ): ĐỒ HỌA / ÂM THANH / VFX / LUẬT / HẠNG */}
      {settingsPanelOpen && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setSettingsPanelOpen(false)}
            className="fixed inset-x-0 top-11 bottom-0 z-[45] bg-slate-950/25"
          />
          <section
            data-testid="bg-graphics-settings-panel"
            aria-label="Cài đặt đồ họa, âm thanh, luật chơi và trợ năng"
            className="fixed right-2.5 top-12 z-50 w-[min(94vw,420px)] rounded-2xl border border-cyan-500/45 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md space-y-3"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-200">
                ⚙️ Cài đặt &amp; Tiện ích Bàn Chơi
              </p>
              <button
                type="button"
                onClick={() => setSettingsPanelOpen(false)}
                aria-label="Đóng bảng cài đặt"
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                ✕
              </button>
            </div>

            {/* Tiện ích & Điều hướng phụ đã thu gọn */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                data-testid="bg-board-rules-btn"
                onClick={() => {
                  setSettingsPanelOpen(false);
                  onOpenRules();
                }}
                className="px-2.5 py-1.5 min-h-[34px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-100 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                📖 Luật chơi
              </button>
              {onOpenLeaderboard && (
                <button
                  type="button"
                  data-testid="bg-board-open-leaderboard-btn"
                  onClick={() => {
                    setSettingsPanelOpen(false);
                    onOpenLeaderboard();
                  }}
                  className="px-2.5 py-1.5 min-h-[34px] rounded-xl bg-amber-950/70 hover:bg-amber-900/75 border border-amber-400/50 text-xs font-bold text-amber-200 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  🏆 Bảng xếp hạng
                </button>
              )}
              {isDesktopLayout && (
                <button
                  type="button"
                  data-testid="bg-toggle-drawer-btn"
                  onClick={() => setSideDrawerOpen((v) => !v)}
                  className="px-2.5 py-1.5 min-h-[34px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-100 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  {sideDrawerOpen ? '◨ Ẩn Sidebar' : '◧ Hiện Sidebar'}
                </button>
              )}
            </div>

            {/* Chất lượng Đồ họa */}
            <div className="space-y-1.5 border-t border-slate-800 pt-2.5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                Chất lượng Đồ họa ({GRAPHICS_TIER_LABELS[gfx.profile.tier]})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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
                        className={`px-2 py-1.5 min-h-[34px] rounded-xl border text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
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
            </div>

            {/* Âm thanh, Hiệu ứng & Trợ năng */}
            <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-800 pt-2.5">
              <button
                type="button"
                data-testid="bg-sound-toggle-btn"
                aria-pressed={effectiveMuted}
                onClick={handleToggleSoundClick}
                className={`px-2.5 py-1.5 min-h-[34px] rounded-xl border text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                  effectiveMuted
                    ? 'bg-rose-500/20 border-rose-400 text-rose-100'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
                }`}
              >
                {effectiveMuted ? '🔇 Tắt tiếng' : '🔊 Âm thanh: BẬT'}
              </button>
              <button
                type="button"
                data-testid="bg-vfx-motion-toggle-btn"
                aria-pressed={vfx.reducedMotion}
                onClick={() => gfx.setReducedMotionOverride(!vfx.reducedMotion)}
                className={`px-2.5 py-1.5 min-h-[34px] rounded-xl border text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                  vfx.reducedMotion
                    ? 'bg-amber-500/20 border-amber-400 text-amber-100'
                    : 'bg-indigo-950/70 hover:bg-indigo-900/70 border-indigo-400/50 text-indigo-200'
                }`}
              >
                {vfx.reducedMotion ? '⏸️ Giảm chuyển động' : '✨ VFX Đầy đủ'}
              </button>
              <button
                type="button"
                data-testid="bg-shake-toggle-btn"
                aria-pressed={!gfx.prefs.shakeEnabled}
                onClick={() => gfx.setShakeEnabled(!gfx.prefs.shakeEnabled)}
                className={`px-2.5 py-1.5 min-h-[34px] rounded-xl border text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                  !gfx.prefs.shakeEnabled
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
                }`}
              >
                {gfx.prefs.shakeEnabled ? '📳 Rung mạnh: BẬT' : '🛡️ Tắt rung'}
              </button>
              <button
                type="button"
                data-testid="bg-panel-skip-cinematic-btn"
                onClick={() => {
                  vfx.skipAllAnimations();
                  setSettingsPanelOpen(false);
                }}
                className="px-2.5 py-1.5 min-h-[34px] rounded-xl border border-amber-400/60 bg-amber-950/50 hover:bg-amber-900/60 text-xs font-bold text-amber-200 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                ⏭️ Skip Animation
              </button>
            </div>
          </section>
        </>
      )}

      {/* THANH TAB MOBILE (< 1024px) — chỉ mount trên mobile để không trùng selector Desktop */}
      {!isDesktopLayout && (
        <nav
          aria-label="Điều hướng bàn cờ di động"
          className="shrink-0 grid grid-cols-3 gap-1.5 border-b border-slate-800 bg-slate-900/90 px-2.5 py-1.5"
        >
          <button
            type="button"
            onClick={() => setMobileTab('board')}
            className={`min-h-[38px] rounded-xl px-2 text-xs font-black transition cursor-pointer ${
              mobileTab === 'board'
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-slate-800 text-slate-200 border border-slate-700'
            }`}
          >
            🎲 Bàn &amp; Lượt
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('role')}
            className={`min-h-[38px] rounded-xl px-2 text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
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
            className={`min-h-[38px] rounded-xl px-2 text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
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
      )}

      {/* BANNER THÔNG BÁO SỰ KIỆN NỔI BẬT (1 HÀNG GỌN TRÊN DESKTOP — KHÔNG CHE TILE HOẶC CẢN THAO TÁC) */}
      {(displayedError ||
        publicGame.lastInvestigation ||
        publicGame.lastRevealEvent ||
        unreadClueCount > 0 ||
        (latestEmote && (!isDesktopLayout || !sideDrawerOpen))) && (
        <div className="shrink-0 bg-slate-950/90 border-b border-slate-800/80 px-3 py-1">
          <div
            className={`w-full mx-auto max-w-[1840px] flex items-center gap-1.5 ${
              isDesktopLayout ? 'flex-nowrap overflow-x-auto' : 'flex-wrap'
            }`}
          >
            {displayedError && (
              <div className="shrink-0 rounded-lg bg-rose-950/80 border border-rose-500/60 px-2.5 py-0.5 text-xs font-bold text-rose-100 flex items-center gap-1.5 whitespace-nowrap">
                <span>⚠️ {displayedError}</span>
                {localError && (
                  <button
                    type="button"
                    onClick={() => setLocalError(null)}
                    aria-label="Đóng thông báo lỗi"
                    className="rounded px-1 text-[10px] text-rose-200 hover:bg-rose-800/70 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
            {unreadClueCount > 0 && (
              <div
                data-testid="bg-unread-clue-banner"
                className="shrink-0 rounded-lg bg-amber-950/70 border border-amber-400/60 px-2.5 py-0.5 text-xs font-bold text-amber-100 flex items-center gap-2 whitespace-nowrap"
              >
                <span>🕵️ Bạn có {unreadClueCount} mật báo thăm dò mới!</span>
                <button
                  type="button"
                  data-testid="bg-open-unread-clues-btn"
                  onClick={() => {
                    setSideDrawerOpen(true);
                    setDesktopSidebarTab('gear');
                    setMobileTab('role');
                  }}
                  className="px-2 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  Mở đọc
                </button>
              </div>
            )}
            {publicGame.lastInvestigation && (
              <div
                data-testid="bg-last-investigation-banner"
                className="shrink-0 rounded-lg bg-emerald-950/60 border border-emerald-500/45 px-2.5 py-0.5 text-xs font-semibold text-emerald-100 whitespace-nowrap"
              >
                {publicGame.lastInvestigation.publicMessage}
              </div>
            )}
            {publicGame.lastRevealEvent && (
              <div
                data-testid="bg-last-reveal-banner"
                className="shrink-0 rounded-lg bg-indigo-950/65 border border-indigo-400/50 px-2.5 py-0.5 text-xs font-bold text-indigo-100 whitespace-nowrap"
              >
                🎭 {publicGame.lastRevealEvent.displayName} đã lộ vai{' '}
                {publicGame.lastRevealEvent.roleName} (
                {FACTION_LABELS[publicGame.lastRevealEvent.faction]})!
              </div>
            )}
            {latestEmote && (!isDesktopLayout || !sideDrawerOpen) && (
              <div
                data-testid="bg-emote-toast"
                className="ml-auto shrink-0 rounded-lg bg-slate-800/90 border border-slate-600 px-2.5 py-0.5 text-xs font-semibold text-amber-100 whitespace-nowrap"
              >
                {latestEmote.emote ? EMOTE_META[latestEmote.emote]?.icon ?? '💬' : '💬'}{' '}
                <strong>{latestEmote.displayName}:</strong>{' '}
                {latestEmote.text || (latestEmote.emote ? EMOTE_META[latestEmote.emote]?.label : '')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* NỘI DUNG CHÍNH: 75% BÀN CỜ TACTICAL + 25% SIDEBAR TABBED (DESKTOP) / 3 TAB (MOBILE) + LỚP VFX */}
      <div ref={boardStageRef} className="relative flex-1 min-h-0 flex flex-col">
        <main
          className={`flex-1 min-h-0 overflow-y-auto lg:overflow-hidden px-2 sm:px-3 py-1.5 sm:py-2 ${
            vfx.screenShake === 'heavy'
              ? 'bg-vfx-shake-heavy'
              : vfx.screenShake === 'light'
                ? 'bg-vfx-shake-light'
                : ''
          }`}
        >
        <div
          className={`w-full mx-auto max-w-[1840px] ${
            isDesktopLayout
              ? sideDrawerOpen
                ? 'h-full grid grid-cols-[minmax(0,3fr)_minmax(290px,1fr)] gap-2.5 items-stretch'
                : 'h-full grid grid-cols-1 items-stretch'
              : 'flex flex-col gap-2'
          }`}
        >
          {/* CỘT CHÍNH (75% TRÊN DESKTOP): BÀN CỜ + THANH HÀNH ĐỘNG ĐÁY */}
          <div
            data-testid="bg-board-main-column"
            className={`w-full min-w-0 flex-col justify-between gap-2 lg:h-full lg:min-h-0 ${
              isDesktopLayout || mobileTab === 'board' ? 'flex' : 'hidden'
            }`}
          >
            <div
              data-testid="bg-board-scroll-area"
              className="flex-1 min-h-0 flex flex-col justify-start gap-2 xl:gap-2.5 lg:overflow-y-auto lg:pr-0.5"
            >
              {/* 1. THANG THƯƠNG TÍCH CHI TIẾT (0 → 14) */}
              <DamageTrack
                players={publicGame.players}
                activePlayerId={publicGame.activePlayerId}
                selfPlayerId={selfPlayerId}
                selectedTargetId={selectedTargetId}
                selfSecretMaxHp={privateView?.maxHp ?? null}
                onSelectPlayer={handleSelectPlayer}
              />

              {/* 2. BÀN CỜ 3 CỤM KHU VỰC ĐÔI TACTICAL SCALING (6 ĐỊA ĐIỂM TRỌN VẸN TRONG VIEWPORT) */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-2 shrink-0">
                {boardClusters.map((cluster) => (
                  <div
                    key={cluster.clusterId}
                    className="rounded-2xl border border-slate-800/90 bg-slate-900/55 p-1.5 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 px-0.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-xs font-black whitespace-nowrap shrink-0 ${cluster.badgeClass}`}
                      >
                        {cluster.title}
                      </span>
                      <span className="text-xs font-medium text-slate-400 truncate">
                        Cùng cụm đánh chung
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-rows-[repeat(2,minmax(clamp(128px,calc(19.2vh_-_22px),182px),auto))] gap-1.5 flex-1 min-h-0">
                      {cluster.locations.map((locId) => {
                        const occupants = publicGame.players.filter(
                          (p) => p.location === locId,
                        );
                        const isSelfHere = committedSelfLocation === locId;
                        const canChooseMoveHere =
                          isMyTurn &&
                          publicGame.turnPhase === 'CHOOSE_MOVE' &&
                          selfPlayer?.location !== locId &&
                          (!publicGame.allowedMoveDestinations ||
                            publicGame.allowedMoveDestinations.includes(locId));
                        const rolledDestinationHere =
                          vfx.isDiceSettled &&
                          publicGame.lastDiceRoll?.kind === 'move' &&
                          publicGame.lastDiceRoll.resolvedLocation === locId;
                        const isHighlightedDestination = vfx.highlightedLocationId === locId;

                        return (
                          <TabletopLocationTile
                            key={locId}
                            locId={locId}
                            occupants={occupants}
                            selfPlayerId={selfPlayerId}
                            activePlayerId={publicGame.activePlayerId}
                            selectedTargetId={selectedTargetId}
                            attackableIds={attackableIdsOnBoard}
                            controlledTurn={publicGame.controlledTurn ?? null}
                            cainDeathModifierActivePlayerIds={
                              publicGame.cainDeathModifierActivePlayerIds ?? []
                            }
                            isSelfHere={isSelfHere}
                            canChooseMoveHere={canChooseMoveHere}
                            rolledDestinationHere={rolledDestinationHere}
                            isHighlightedDestination={isHighlightedDestination}
                            isSelectedLocation={selectedLocationId === locId}
                            reducedMotion={vfx.reducedMotion}
                            enableMist={gfx.profile.enableMistDrift}
                            enableBackdropBlur={gfx.profile.enableBackdropBlur}
                            onChooseDestination={handleChooseDestination}
                            onSelectLocation={handleSelectLocation}
                            onSelectPlayer={handleSelectPlayer}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>

              {/* 3. KHAY XÚC XẮC 3D HIỂN THỊ TRẠNG THÁI (1d6+1d4) & BỘ ĐẾM 3 CHỒNG BÀI */}
              <section
                data-testid="bg-dice-tray"
                data-turn-active={canRollOnBoard ? 'true' : 'false'}
                data-dice-settled={String(vfx.isDiceSettled)}
                className={`shrink-0 rounded-2xl border px-2.5 py-1.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2 transition-colors duration-200 ${
                  canRollOnBoard
                    ? 'border-amber-400/80 bg-gradient-to-r from-emerald-950/65 via-slate-900/95 to-amber-950/30'
                    : 'border-slate-700/80 bg-slate-900/90'
                }`}
              >
                {(() => {
                  const diceRollingNow = !vfx.isDiceSettled;
                  const trayDiceStage = vfx.activeDiceRoll ? vfx.diceRollStage : 'settled';
                  const enable3DDice = gfx.profile.tier !== 'low' && !vfx.reducedMotion;
                  const diceSummary = publicGame.lastDiceRoll ? (
                    <>
                      <MidnightDicePair3D
                        d6={publicGame.lastDiceRoll.d6}
                        d4={publicGame.lastDiceRoll.d4}
                        stage={trayDiceStage}
                        size={34}
                        enable3D={enable3DDice}
                      />
                      <div className="min-w-0 flex-1 text-left">
                        {diceRollingNow ? (
                          <>
                            <p className="text-xs sm:text-sm font-black text-amber-200 truncate">
                              🎲 {publicGame.lastDiceRoll.displayName} đang tung xúc xắc...
                            </p>
                            <p className="text-xs text-slate-300 font-semibold truncate">
                              Chờ xúc xắc dừng trên mặt bàn để chốt kết quả từ server.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs sm:text-sm font-black text-white truncate">
                              {publicGame.lastDiceRoll.kind === 'move'
                                ? `${publicGame.lastDiceRoll.displayName} tung ${publicGame.lastDiceRoll.d6} + ${publicGame.lastDiceRoll.d4} = ${publicGame.lastDiceRoll.total}`
                                : `${publicGame.lastDiceRoll.displayName} tung đòn đánh (${
                                    publicGame.lastDiceRoll.d6 > 0
                                      ? `|${publicGame.lastDiceRoll.d6} - ${publicGame.lastDiceRoll.d4}|`
                                      : `xs 4 mặt = ${publicGame.lastDiceRoll.d4}`
                                  } → gây ${publicGame.lastDiceRoll.damageDealt ?? 0} sát thương)`}
                            </p>
                            <p className="text-xs text-cyan-200 font-semibold truncate">
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
                                  className="text-xs text-amber-300 font-bold truncate"
                                >
                                  🥊 {publicGame.lastDiceRoll.counterRoll.displayName} phản kích (
                                  {publicGame.lastDiceRoll.counterRoll.d6 > 0
                                    ? `|${publicGame.lastDiceRoll.counterRoll.d6} - ${publicGame.lastDiceRoll.counterRoll.d4}|`
                                    : `xs 4 mặt = ${publicGame.lastDiceRoll.counterRoll.d4}`}
                                  ) → trả đòn {publicGame.lastDiceRoll.counterRoll.damageDealt} sát thương!
                                </p>
                              )}
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <MidnightDicePair3D
                        d6={6}
                        d4={4}
                        stage={trayDiceStage}
                        size={34}
                        enable3D={enable3DDice}
                      />
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-xs sm:text-sm font-black text-white truncate">
                          {canRollOnBoard
                            ? '⚡ Lượt của bạn! Khay Xúc Xắc Bóng Đêm (xs 6 mặt + xs 4 mặt)'
                            : 'Khay Xúc Xắc Bóng Đêm (xs 6 mặt + xs 4 mặt)'}
                        </p>
                      </div>
                    </>
                  );

                  return (
                    <div className="flex items-center gap-2.5 flex-1 min-w-0 px-1">
                      {diceSummary}
                    </div>
                  );
                })()}

                {/* 3 Chồng bài (chỉ hiển thị số lá còn lại & highlight khi đúng khu vực rút) */}
                <div className="grid grid-cols-3 gap-1.5 shrink-0">
                  {(
                    [
                      ['investigation', 'Khám Phá', 'text-emerald-300', 'border-emerald-400/75 bg-emerald-950/45'],
                      ['equipment', 'Cung Ứng', 'text-sky-300', 'border-sky-400/75 bg-sky-950/45'],
                      ['event', 'Đột Kích', 'text-rose-300', 'border-rose-400/75 bg-rose-950/45'],
                    ] as const
                  ).map(([deckId, label, cls, activeCls]) => {
                    const deckHighlighted = canDrawDeckOnBoard(deckId);
                    return (
                      <div
                        key={deckId}
                        data-vfx-deck={deckId}
                        data-deck-active={deckHighlighted ? 'true' : 'false'}
                        className={`rounded-xl border px-2 py-1 flex items-center gap-1.5 transition ${
                          deckHighlighted
                            ? activeCls
                            : `border-slate-700 bg-slate-950/85 ${
                                isMyTurn && publicGame.turnPhase === 'LOCATION_ACTION'
                                  ? 'opacity-55'
                                  : ''
                              }`
                        }`}
                      >
                        <DeckCardBackSvg deck={deckId} size={24} />
                        <div className="min-w-0 text-left">
                          <p className={`text-xs font-extrabold truncate leading-tight ${cls}`}>
                            {label}
                          </p>
                          <p className="text-xs font-black text-white leading-tight">
                            {publicGame.deckCounts[deckId]} lá
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* 4. THANH HÀNH ĐỘNG CONTEXTUAL ACTION-FIRST NEO CỐ ĐỊNH Ở ĐÁY */}
            <div className="relative shrink-0">
              <ActionPanel
                publicGame={publicGame}
                privateView={privateView}
                selfPlayerId={selfPlayerId}
                isSpectator={isSpectator}
                selectedTargetId={selectedTargetId}
                selectedLocationId={selectedLocationId}
                onSelectTarget={handleSelectPlayer}
                onSelectLocation={setSelectedLocationId}
                onClearContext={handleClearContext}
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

          {/* SIDEBAR BÊN PHẢI (25% TRÊN DESKTOP VỚI 3 TAB: NHÂN VẬT / TRANG BỊ / NHẬT KÝ + EMOTE) */}
          {isDesktopLayout && sideDrawerOpen && (
            <aside
              data-testid="bg-side-drawer"
              className="h-full min-h-0 flex flex-col rounded-2xl border border-slate-800 bg-slate-900/95 overflow-hidden shadow-xl"
            >
              <div
                role="tablist"
                aria-label="Thanh tác vụ bên phải"
                className="shrink-0 grid grid-cols-3 gap-1 p-1.5 border-b border-slate-800 bg-slate-950/90"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={desktopSidebarTab === 'role'}
                  data-testid="bg-sidebar-tab-role"
                  onClick={() => setDesktopSidebarTab('role')}
                  className={`min-h-[34px] rounded-xl px-1.5 text-xs font-black whitespace-nowrap transition cursor-pointer flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                    desktopSidebarTab === 'role'
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <span>🎭 Nhân vật</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={desktopSidebarTab === 'gear'}
                  data-testid="bg-sidebar-tab-gear"
                  onClick={() => setDesktopSidebarTab('gear')}
                  className={`min-h-[34px] rounded-xl px-1.5 text-xs font-black whitespace-nowrap transition cursor-pointer flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                    desktopSidebarTab === 'gear'
                      ? 'bg-cyan-400 text-slate-950 shadow'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <span>🎒 Trang bị</span>
                  {(unreadClueCount > 0 || (privateView?.equipped.length ?? 0) > 0) && (
                    <span
                      className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${
                        unreadClueCount > 0
                          ? 'bg-rose-500 text-white'
                          : desktopSidebarTab === 'gear'
                            ? 'bg-slate-950/20 text-slate-950'
                            : 'bg-sky-500/25 text-sky-200'
                      }`}
                    >
                      {unreadClueCount > 0 ? unreadClueCount : privateView?.equipped.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={desktopSidebarTab === 'log'}
                  data-testid="bg-sidebar-tab-log"
                  onClick={() => setDesktopSidebarTab('log')}
                  className={`min-h-[34px] rounded-xl px-1.5 text-xs font-black whitespace-nowrap transition cursor-pointer flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                    desktopSidebarTab === 'log'
                      ? 'bg-emerald-400 text-slate-950 shadow'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <span>📜 Nhật ký</span>
                  {unreadLogCount > 0 && desktopSidebarTab !== 'log' && (
                    <span
                      data-testid="bg-sidebar-tab-log-badge"
                      className="inline-flex items-center justify-center rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-black leading-none text-slate-950"
                    >
                      {unreadLogCount > 9 ? '9+' : unreadLogCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-2.5">
                {desktopSidebarTab === 'role' && (
                  <RoleCard
                    publicGame={publicGame}
                    privateView={privateView}
                    isSpectator={isSpectator}
                    section="character"
                    selfPlayerId={selfPlayerId}
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
                )}

                {desktopSidebarTab === 'gear' && (
                  <RoleCard
                    publicGame={publicGame}
                    privateView={privateView}
                    isSpectator={isSpectator}
                    section="gear"
                    selfPlayerId={selfPlayerId}
                    selectedTargetId={selectedTargetId}
                    attackableIds={attackableIdsOnBoard}
                    visualStyle="midnight-noir"
                    getPlayerLocation={getCommittedLocation}
                    onSelectPlayer={handleSelectPlayer}
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
                    onZoomRevealedRole={(p) =>
                      p.revealedRoleId &&
                      setZoomTarget({
                        kind: 'role',
                        roleId: p.revealedRoleId,
                        revealed: true,
                        viewerMode: 'other-player',
                        woundsTaken: p.woundsTaken,
                        currentHp: p.revealedMaxHp
                          ? Math.max(0, p.revealedMaxHp - p.woundsTaken)
                          : undefined,
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
                )}

                {desktopSidebarTab === 'log' && (
                  <GameLog
                    publicGame={publicGame}
                    unsettledRoll={!vfx.isDiceSettled ? publicGame.lastDiceRoll : null}
                    fillHeight
                  />
                )}
              </div>

              {/* Thanh Emote & Chat nhanh ghim gọn đáy Sidebar Desktop */}
              <div className="shrink-0 border-t border-slate-800 bg-slate-950/90 p-2 space-y-1.5">
                {latestEmote && (
                  <div
                    data-testid="bg-emote-toast"
                    className="rounded-lg bg-slate-800/90 border border-slate-700 px-2 py-1 text-xs font-semibold text-amber-100 truncate"
                  >
                    {latestEmote.emote ? EMOTE_META[latestEmote.emote]?.icon ?? '💬' : '💬'}{' '}
                    <strong>{latestEmote.displayName}:</strong>{' '}
                    {latestEmote.text || (latestEmote.emote ? EMOTE_META[latestEmote.emote]?.label : '')}
                  </div>
                )}
                <div className="grid grid-cols-6 gap-1">
                  {VALID_BOARD_GAME_EMOTES.map((eid) => (
                    <button
                      key={eid}
                      type="button"
                      data-testid={`bg-emote-${eid}`}
                      title={EMOTE_META[eid].label}
                      aria-label={EMOTE_META[eid].label}
                      onClick={() => onSendEmote?.(eid)}
                      className="px-1 py-1 min-h-[30px] rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-100 cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    >
                      {EMOTE_META[eid].icon}
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
                    className="flex gap-1.5"
                  >
                    <input
                      type="text"
                      data-testid="bg-chat-input"
                      value={chatText}
                      onChange={(e) => setChatText(e.target.value)}
                      maxLength={120}
                      placeholder="Nhắn nhanh với bàn..."
                      className="flex-1 min-w-0 rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 min-h-[32px] rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    >
                      Gửi
                    </button>
                  </form>
                )}
              </div>
            </aside>
          )}

          {/* NGĂN NỘI DUNG TAB MOBILE (< 1024px) */}
          {!isDesktopLayout && mobileTab !== 'board' && (
            <div data-testid="bg-side-drawer" className="w-full space-y-3">
              {mobileTab === 'role' && (
                <RoleCard
                  publicGame={publicGame}
                  privateView={privateView}
                  isSpectator={isSpectator}
                  section="all"
                  selfPlayerId={selfPlayerId}
                  selectedTargetId={selectedTargetId}
                  attackableIds={attackableIdsOnBoard}
                  visualStyle="midnight-noir"
                  foilEnabled={gfx.profile.enableFoil}
                  reducedMotion={!gfx.profile.enable3DTilt || vfx.reducedMotion}
                  getPlayerLocation={getCommittedLocation}
                  onSelectPlayer={handleSelectPlayer}
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
                  onZoomRevealedRole={(p) =>
                    p.revealedRoleId &&
                    setZoomTarget({
                      kind: 'role',
                      roleId: p.revealedRoleId,
                      revealed: true,
                      viewerMode: 'other-player',
                      woundsTaken: p.woundsTaken,
                      currentHp: p.revealedMaxHp
                        ? Math.max(0, p.revealedMaxHp - p.woundsTaken)
                        : undefined,
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
              )}

              {mobileTab === 'log' && (
                <>
                  <GameLog
                    publicGame={publicGame}
                    unsettledRoll={!vfx.isDiceSettled ? publicGame.lastDiceRoll : null}
                  />

                  <div className="rounded-2xl border border-slate-700/80 bg-slate-900/90 p-3 space-y-2">
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
                </>
              )}
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

      {/* MODAL TỔNG KẾT VÁN ĐẤU (chờ Victory/Defeat Cinematic V2 khép lại mượt mà; hiện ngay khi F5/Skip) */}
      {showMatchResultModal && (
        <MatchResult
          publicGame={publicGame}
          selfPlayerId={selfPlayerId}
          isSpectator={isSpectator}
          animateEntrance={animateMatchResultEntrance}
          reducedMotion={vfx.reducedMotion}
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

      {/* POPUP THÔNG BÁO THẺ XANH BÍ MẬT (CHỈ HIỆN CHO RIÊNG NGƯỜI ĐƯỢC NHẬN THẺ) */}
      {activeGreenClue && !isMatchFinished && (
        <div
          data-testid="bg-green-card-popup"
          role="dialog"
          aria-modal="true"
          aria-label="Thông báo nhận Thẻ Xanh bí mật"
          onClick={dismissActiveGreenClue}
          className={`fixed inset-0 z-[56] flex items-center justify-center p-4 ${
            gfx.profile.enableBackdropBlur ? 'bg-slate-950/75 backdrop-blur-sm' : 'bg-slate-950/90'
          }`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border-2 border-emerald-400/75 bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/95 p-5 space-y-4 shadow-[0_24px_64px_rgba(16,185,129,0.35)]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-emerald-500/30 pb-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-400/50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-200">
                    🕵️ Thẻ Xanh Bí Mật
                  </span>
                  <span className="rounded-full bg-amber-500/15 border border-amber-400/40 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                    🔒 Chỉ riêng bạn thấy
                  </span>
                </div>
                <h3 className="mt-1.5 text-base font-black text-white leading-snug">
                  {activeGreenClue.senderName ?? activeGreenClue.targetName} vừa đưa Thẻ Xanh cho bạn
                </h3>
              </div>
              {activeGreenClue.cardId && MIDNIGHT_CARD_ART[activeGreenClue.cardId] && (
                <img
                  src={MIDNIGHT_CARD_ART[activeGreenClue.cardId]}
                  alt={activeGreenClue.cardTitle}
                  width={56}
                  height={84}
                  className="h-20 w-14 shrink-0 rounded-lg border border-emerald-400/55 object-cover shadow-lg"
                />
              )}
            </div>

            {activeGreenClue.effectCategory ||
            activeGreenClue.cardShortName ||
            activeGreenClue.ruleDetail ||
            activeGreenClue.progression ||
            activeGreenClue.resultSummary ? (
              <dl className="rounded-xl border border-slate-700/80 bg-slate-950/85 p-3.5 space-y-2 text-xs sm:text-sm">
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 font-bold text-slate-400">Hiệu ứng:</dt>
                  <dd className="font-extrabold text-emerald-300">
                    {activeGreenClue.effectCategory ?? 'Thăm dò'}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 font-bold text-slate-400">Tên:</dt>
                  <dd className="font-black text-amber-200">
                    {activeGreenClue.cardShortName ?? activeGreenClue.cardTitle}
                  </dd>
                </div>
                {activeGreenClue.ruleDetail && (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 font-bold text-slate-400">Chi tiết:</dt>
                    <dd className="text-slate-100 leading-snug">{activeGreenClue.ruleDetail}</dd>
                  </div>
                )}
                {activeGreenClue.progression && (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 font-bold text-slate-400">Diễn biến:</dt>
                    <dd className="text-cyan-100 leading-snug">{activeGreenClue.progression}</dd>
                  </div>
                )}
                {activeGreenClue.resultSummary && (
                  <div className="flex gap-2 border-t border-slate-800 pt-2">
                    <dt className="w-20 shrink-0 font-bold text-slate-400">Kết quả:</dt>
                    <dd
                      className={`font-black ${
                        activeGreenClue.resultSummary.startsWith('-')
                          ? 'text-rose-300'
                          : activeGreenClue.resultSummary.startsWith('+')
                            ? 'text-emerald-300'
                            : 'text-amber-300'
                      }`}
                    >
                      {activeGreenClue.resultSummary}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="rounded-xl border border-slate-700/80 bg-slate-950/85 p-3.5 text-sm text-slate-100 leading-relaxed">
                {activeGreenClue.detail}
              </p>
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-400">
                Vòng {activeGreenClue.round} · Đã lưu trong Mật báo riêng
              </span>
              <button
                type="button"
                data-testid="bg-green-card-popup-dismiss"
                onClick={dismissActiveGreenClue}
                className="px-4 py-2 min-h-[38px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-black shadow-lg transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                {pendingGreenClues.length > 1
                  ? `Tiếp theo (còn ${pendingGreenClues.length - 1})`
                  : 'Đã hiểu'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                className="px-4 py-2 min-h-[40px] rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
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
                className="px-4 py-2 min-h-[40px] rounded-xl bg-rose-600 hover:bg-rose-500 text-sm font-black text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
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
