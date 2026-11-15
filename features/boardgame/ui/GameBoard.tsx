'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/GameBoard.tsx — Bàn chơi 2D chính của "Bóng Đêm KTX v3"
// (6 khu vực KTX, trạng thái Giới nghiêm & 3 chồng bài, Spotlight điều tra / lật vai,
// đồng hồ đếm ngược 1 lượt, đồng bộ ẩn thẻ/bài tay, nhật ký & responsive 390x844).
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
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
import {
  KTX_LOCATION_MAP,
  isAdjacentLocation,
  listLegalMovesForLocation,
} from '../domain/rules';
import {
  BOARD_GRID_ORDER,
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

export default function GameBoard({
  inviteCode,
  publicGame,
  privateView,
  selfPlayerId,
  isSpectator,
  turnDeadlineMs,
  recentEmotes,
  lastError,
  soundMuted = false,
  onAction,
  onSendEmote,
  onSendChat,
  onToggleSound,
  onOpenRules,
  onPlayAgain,
  onLeaveMatch,
}: GameBoardProps) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [pendingAction, setPendingAction] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'board' | 'role' | 'log'>('board');
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [roleHiddenOnScreen, setRoleHiddenOnScreen] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [internalMuted, setInternalMuted] = useState<boolean>(() => isBoardGameSoundMuted());
  const [toastEmote, setToastEmote] = useState<BoardGameChatEmoteServerMessage | null>(null);

  const effectiveMuted = onToggleSound ? soundMuted : internalMuted;
  const handleToggleSound = () => {
    const next = !effectiveMuted;
    setBoardGameSoundMuted(next);
    setInternalMuted(next);
    onToggleSound?.();
  };

  const didInitAudioRefs = useRef(false);
  const prevActiveIdRef = useRef<string | null>(publicGame.activePlayerId);
  const prevInvestigationIdRef = useRef<string | null>(publicGame.lastInvestigation?.id ?? null);
  const prevRevealIdRef = useRef<string | null>(publicGame.lastRevealEvent?.id ?? null);
  const prevHandCountRef = useRef<number>(privateView?.hand.length ?? 0);
  const prevRevealedCountRef = useRef<number>(
    publicGame.players.filter((p) => Boolean(p.revealedFaction || p.revealedRoleId)).length,
  );
  const prevPhaseRef = useRef<string>(publicGame.turnPhase);
  const prevEmoteCountRef = useRef<number>(recentEmotes.length);

  useEffect(() => {
    const handCount = privateView?.hand.length ?? 0;
    const revealedCount = publicGame.players.filter((p) =>
      Boolean(p.revealedFaction || p.revealedRoleId),
    ).length;
    const latestInvId = publicGame.lastInvestigation?.id ?? null;
    const latestRevealId = publicGame.lastRevealEvent?.id ?? null;

    if (!didInitAudioRefs.current) {
      didInitAudioRefs.current = true;
      prevActiveIdRef.current = publicGame.activePlayerId;
      prevInvestigationIdRef.current = latestInvId;
      prevRevealIdRef.current = latestRevealId;
      prevHandCountRef.current = handCount;
      prevRevealedCountRef.current = revealedCount;
      prevPhaseRef.current = publicGame.turnPhase;
      return;
    }

    if (publicGame.turnPhase === 'ENDED' && prevPhaseRef.current !== 'ENDED') {
      playVictoryFanfare();
    } else if (
      publicGame.activePlayerId === selfPlayerId &&
      prevActiveIdRef.current !== selfPlayerId &&
      !isSpectator &&
      publicGame.turnPhase !== 'ENDED'
    ) {
      playTurnAlert();
    }

    if (latestInvId && latestInvId !== prevInvestigationIdRef.current) {
      playTrackAdvance();
    }
    if (handCount > prevHandCountRef.current) {
      playCardDraw();
    }
    if (
      (latestRevealId && latestRevealId !== prevRevealIdRef.current) ||
      revealedCount > prevRevealedCountRef.current
    ) {
      playRoleReveal();
    }

    prevActiveIdRef.current = publicGame.activePlayerId;
    prevInvestigationIdRef.current = latestInvId;
    prevRevealIdRef.current = latestRevealId;
    prevHandCountRef.current = handCount;
    prevRevealedCountRef.current = revealedCount;
    prevPhaseRef.current = publicGame.turnPhase;
  }, [
    publicGame.activePlayerId,
    publicGame.lastInvestigation?.id,
    publicGame.lastRevealEvent?.id,
    publicGame.players,
    publicGame.turnPhase,
    privateView?.hand.length,
    selfPlayerId,
    isSpectator,
  ]);

  useEffect(() => {
    if (recentEmotes.length <= prevEmoteCountRef.current) {
      prevEmoteCountRef.current = recentEmotes.length;
      return;
    }
    prevEmoteCountRef.current = recentEmotes.length;
    const latest = recentEmotes[recentEmotes.length - 1];
    if (!latest) return;
    playEmotePop();
    setToastEmote(latest);
    const timer = window.setTimeout(() => {
      setToastEmote((curr) => (curr === latest ? null : curr));
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [recentEmotes]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const secondsLeft =
    typeof turnDeadlineMs === 'number'
      ? Math.max(0, Math.ceil((turnDeadlineMs - nowMs) / 1000))
      : null;

  const activePlayer =
    publicGame.players.find((p) => p.playerId === publicGame.activePlayerId) ?? null;
  const selfPlayer = selfPlayerId
    ? publicGame.players.find((p) => p.playerId === selfPlayerId) ?? null
    : null;
  const canClickMoveOnBoard = Boolean(
    !isSpectator &&
      !pendingAction &&
      selfPlayer?.alive &&
      publicGame.activePlayerId === selfPlayerId &&
      publicGame.turnPhase === 'MOVE_OR_STAY',
  );

  const legalBoardMoves = (() => {
    if (!canClickMoveOnBoard || !selfPlayer) return new Set<BoardGameLocationId>();
    const oneStep = listLegalMovesForLocation(selfPlayer.location);
    const hasTwoStep =
      Boolean(privateView?.equipped.some((c) => c.effectId === 'eq-sneakers')) ||
      (selfPlayer.revealedRoleId === 'suong-an-danh' && selfPlayer.location === 'corridor');
    const dest = new Set<BoardGameLocationId>(oneStep);
    if (hasTwoStep) {
      for (const mid of oneStep) {
        for (const two of listLegalMovesForLocation(mid)) {
          if (two !== selfPlayer.location) dest.add(two);
        }
      }
    }
    return dest;
  })();

  const handleDispatchAction = async (action: BoardGameActionPayload) => {
    if (pendingAction) return;
    setActionErr(null);
    setPendingAction(true);
    try {
      const res = await onAction(action);
      if (!res.ok && res.reason) {
        setActionErr(res.reason);
      }
    } finally {
      setPendingAction(false);
    }
  };

  const latestEmotes = recentEmotes.slice(-4).reverse();
  const aliveCount = publicGame.players.filter((p) => p.alive).length;

  return (
    <div
      data-testid="boardgame-2d-board"
      className="fixed inset-0 z-[45] flex flex-col overflow-x-hidden bg-slate-950/94 text-slate-100 backdrop-blur-md"
    >
      {/* Thanh đỉnh: Tên trận, Vòng, Đồng hồ 1 lượt, Âm thanh, Luật & Thoát */}
      <header className="shrink-0 border-b border-slate-800 bg-slate-950/90 px-3 py-2.5 sm:px-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-sm font-extrabold text-amber-300">🎲 BÓNG ĐÊM KTX v3</span>
            {inviteCode && (
              <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-200">
                #{inviteCode}
              </span>
            )}
            <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-slate-300 ring-1 ring-slate-700">
              Vòng {Math.min(publicGame.round, publicGame.maxRounds)}/{publicGame.maxRounds}
            </span>
            {secondsLeft !== null && publicGame.turnPhase !== 'ENDED' && (
              <span
                data-testid="bg-turn-timer"
                className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ${
                  secondsLeft <= 10
                    ? 'bg-rose-950 text-rose-200 ring-1 ring-rose-500/50'
                    : 'bg-slate-900 text-emerald-300'
                }`}
              >
                ⏱️ {secondsLeft}s ({activePlayer?.displayName ?? '—'})
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              data-testid="bg-sound-toggle-btn"
              onClick={handleToggleSound}
              className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              title={effectiveMuted ? 'Bật âm thanh bàn chơi' : 'Tắt âm thanh bàn chơi'}
            >
              {effectiveMuted ? '🔇' : '🔊'}
            </button>
            <button
              type="button"
              data-testid="bg-board-rules-btn"
              onClick={onOpenRules}
              className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              📖 Luật
            </button>
            <button
              type="button"
              data-testid="bg-board-leave-btn"
              onClick={() => setLeaveConfirmOpen(true)}
              className="rounded-lg bg-rose-700/85 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-600"
            >
              🚪 Thoát
            </button>
          </div>
        </div>

        {/* Thanh Trạng thái v3: Giới Nghiêm, Sống sót, 3 Chồng bài & Spotlight Điều tra / Lật vai */}
        <div
          data-testid="bg-v3-status-bar"
          className="mx-auto mt-2 flex max-w-7xl flex-col gap-1.5"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-1.5 text-[11px] ${
                publicGame.curfewPressureActive
                  ? 'border-rose-400/70 bg-rose-950/45 text-rose-100'
                  : 'border-amber-500/35 bg-amber-950/25 text-amber-100'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <span>{publicGame.curfewPressureActive ? '🌙' : '🕵️'}</span>
                <span>
                  {publicGame.curfewPressureActive
                    ? 'Áp lực Giới nghiêm: đứng lẻ cuối vòng sẽ mất Giáp & 1 HP!'
                    : `Phiên trực đêm KTX — ${aliveCount}/${publicGame.players.length} người đang đứng vững`}
                </span>
              </div>
              <span className="rounded bg-slate-950/75 px-2 py-0.5 font-mono text-[10px] text-amber-200">
                Lượt #{publicGame.turnNumber}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-500/35 bg-slate-950/60 px-3 py-1.5 text-[11px] text-slate-200">
              <div className="flex flex-wrap items-center gap-2 font-semibold">
                <span className="text-amber-300">
                  🔎 Điều tra: {publicGame.deckCounts.investigation}
                </span>
                <span className="text-cyan-300">
                  🎒 Trang bị: {publicGame.deckCounts.equipment}
                </span>
                <span className="text-rose-300">
                  ⚡ Sự kiện: {publicGame.deckCounts.event}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Chỉ lộ vết thương &amp; đồ đeo công khai
              </span>
            </div>
          </div>

          {(publicGame.lastInvestigation || publicGame.lastRevealEvent) && (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {publicGame.lastInvestigation && (
                <div
                  data-testid="bg-last-investigation-banner"
                  className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/45 bg-amber-950/35 px-3 py-1 text-[11px] text-amber-100 transition motion-reduce:transition-none"
                >
                  <span className="truncate">
                    🔎 {publicGame.lastInvestigation.publicMessage}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      publicGame.lastInvestigation.outcome === 'condition-met'
                        ? 'bg-amber-500/25 text-amber-200'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {publicGame.lastInvestigation.outcome === 'condition-met'
                      ? 'Có phản ứng'
                      : 'Không phản ứng'}
                  </span>
                </div>
              )}

              {publicGame.lastRevealEvent && (
                <div
                  data-testid="bg-last-reveal-banner"
                  className="flex items-center justify-between gap-2 rounded-xl border border-orange-500/55 bg-orange-950/40 px-3 py-1 text-[11px] text-orange-100 transition motion-reduce:transition-none"
                >
                  <span className="truncate">
                    🎭 <strong>{publicGame.lastRevealEvent.displayName}</strong> lộ diện:{' '}
                    <strong>{publicGame.lastRevealEvent.roleName}</strong>
                  </span>
                  <span
                    className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                      FACTION_THEME[publicGame.lastRevealEvent.faction].badgeClasses
                    }`}
                  >
                    {FACTION_LABELS[publicGame.lastRevealEvent.faction]}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {(actionErr || lastError) && (
        <div className="mx-auto mt-2 w-full max-w-4xl px-3">
          <div className="rounded-xl border border-rose-500/50 bg-rose-950/75 px-3 py-1.5 text-center text-xs text-rose-100">
            ⚠️ {actionErr || lastError}
          </div>
        </div>
      )}

      {/* Thông báo biểu cảm / nhắn nhanh nổi phía góc trên phải */}
      {toastEmote && (
        <div
          data-testid="bg-emote-toast"
          className="pointer-events-none fixed right-3 top-20 z-[52] max-w-xs rounded-xl border border-amber-400/50 bg-slate-900/95 px-3 py-2 text-xs text-amber-100 shadow-xl transition duration-200 motion-reduce:transition-none"
        >
          <span className="font-bold text-amber-300">{toastEmote.displayName}: </span>
          {toastEmote.emote ? `${EMOTE_META[toastEmote.emote]?.icon ?? ''} ` : ''}
          {toastEmote.text ?? (toastEmote.emote ? EMOTE_META[toastEmote.emote]?.label : '')}
        </div>
      )}

      {/* Nội dung chính Responsive: Desktop 3 cột / Mobile tab */}
      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 pb-4 lg:grid-cols-12">
        {/* Cột Trái: Vai trò bí mật & Manh mối */}
        <section
          className={`lg:col-span-3 ${mobileTab === 'role' ? 'block' : 'hidden lg:block'}`}
        >
          <RoleCard
            privateView={privateView}
            publicGame={publicGame}
            isSpectator={isSpectator}
            hiddenOnScreen={roleHiddenOnScreen}
            onToggleHidden={() => setRoleHiddenOnScreen((v) => !v)}
          />
        </section>

        {/* Cột Giữa: Bàn Cờ Minh Họa 6 Khu Vực KTX & Bảng Điều Khiển Lượt */}
        <section
          className={`space-y-3 lg:col-span-6 ${mobileTab === 'board' ? 'block' : 'hidden lg:block'}`}
        >
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-[radial-gradient(ellipse_at_top,_rgba(30,41,59,0.92),_rgba(2,6,23,0.98))] p-2.5 shadow-2xl sm:p-3.5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5 px-1 text-[11px]">
              <span className="font-bold uppercase tracking-wider text-amber-300/90">
                🗺️ Bàn Cờ Khuôn Viên KTX Bách Khoa
              </span>
              <span className="text-[10px] text-slate-400">
                Đường nối hiển thị ô kề cận &amp; trục giao lộ Hành Lang B7
              </span>
            </div>

            <div className="relative">
              {/* Sơ đồ đường nối giữa 6 ô bàn cờ (hiện trên màn >= sm cho bố cục 3x2 phẳng) */}
              <svg
                viewBox="0 0 600 400"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 hidden h-full w-full sm:block"
                aria-hidden="true"
              >
                <line x1="100" y1="100" x2="300" y2="100" stroke="#F59E0B" strokeOpacity="0.28" strokeWidth="4" strokeDasharray="7 6" />
                <line x1="300" y1="100" x2="500" y2="100" stroke="#38BDF8" strokeOpacity="0.28" strokeWidth="4" strokeDasharray="7 6" />
                <line x1="100" y1="100" x2="100" y2="300" stroke="#C084FC" strokeOpacity="0.28" strokeWidth="4" strokeDasharray="7 6" />
                <line x1="500" y1="100" x2="500" y2="300" stroke="#38BDF8" strokeOpacity="0.28" strokeWidth="4" strokeDasharray="7 6" />
                <line x1="300" y1="300" x2="100" y2="100" stroke="#34D399" strokeOpacity="0.3" strokeWidth="3.5" />
                <line x1="300" y1="300" x2="300" y2="100" stroke="#34D399" strokeOpacity="0.3" strokeWidth="3.5" />
                <line x1="300" y1="300" x2="500" y2="100" stroke="#34D399" strokeOpacity="0.3" strokeWidth="3.5" />
                <line x1="300" y1="300" x2="100" y2="300" stroke="#34D399" strokeOpacity="0.32" strokeWidth="3.5" />
                <line x1="300" y1="300" x2="500" y2="300" stroke="#34D399" strokeOpacity="0.32" strokeWidth="3.5" />
                <path
                  d="M100 315 Q300 398 500 315"
                  fill="none"
                  stroke="#A855F7"
                  strokeOpacity="0.35"
                  strokeWidth="3.5"
                  strokeDasharray="6 5"
                />
              </svg>

              <div className="relative z-10 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5">
                {BOARD_GRID_ORDER.map((locId) => {
                  const loc = KTX_LOCATION_MAP[locId];
                  const vis = LOCATION_VISUAL_META[locId];
                  const occupants = publicGame.players.filter((p) => p.location === loc.id);
                  const isSelfHere = occupants.some((p) => p.playerId === selfPlayerId);
                  const canMoveHere = legalBoardMoves.has(loc.id);
                  const isNearCourt = Boolean(
                    selfPlayer &&
                      selfPlayer.location === 'court' &&
                      isAdjacentLocation('court', loc.id) &&
                      loc.id !== 'court',
                  );

                  return (
                    <div
                      key={loc.id}
                      data-testid={`bg-loc-${loc.id}`}
                      title={loc.description}
                      role={canMoveHere ? 'button' : undefined}
                      tabIndex={canMoveHere ? 0 : undefined}
                      onClick={
                        canMoveHere
                          ? () => void handleDispatchAction({ type: 'MOVE', location: loc.id })
                          : undefined
                      }
                      onKeyDown={
                        canMoveHere
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                void handleDispatchAction({ type: 'MOVE', location: loc.id });
                              }
                            }
                          : undefined
                      }
                      className={`group flex min-w-0 flex-col justify-between rounded-2xl border p-2 transition motion-reduce:transition-none ${
                        isSelfHere
                          ? 'border-amber-400/80 bg-slate-900/95 shadow-[0_0_16px_rgba(251,191,36,0.2)]'
                          : canMoveHere
                            ? 'cursor-pointer border-slate-700/90 bg-slate-900/90 hover:border-amber-400 hover:bg-slate-800/95'
                            : isNearCourt
                              ? 'border-sky-500/45 bg-slate-900/90'
                              : 'border-slate-800/95 bg-slate-900/88'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="relative overflow-hidden rounded-lg">
                          <LocationSceneSvg locationId={loc.id} />
                          <div className="absolute inset-x-1 top-1 flex flex-wrap items-center justify-between gap-1">
                            {isSelfHere && (
                              <span className="rounded-md bg-amber-400 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-950 shadow">
                                📍 Bạn
                              </span>
                            )}
                            {isNearCourt && !isSelfHere && (
                              <span className="ml-auto rounded-md bg-sky-900/90 px-1.5 py-0.5 text-[9px] font-semibold text-sky-200 ring-1 ring-sky-400/50">
                                🎯 Kề rổ
                              </span>
                            )}
                            {canMoveHere && (
                              <span className="ml-auto rounded-md bg-slate-950/85 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300 opacity-85 group-hover:bg-amber-500 group-hover:text-slate-950">
                                🚶 Tới ô
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-extrabold text-amber-100">
                              {vis.icon} {loc.shortLabel}
                            </div>
                            <div className="truncate text-[10px] text-slate-400">{loc.name}</div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                          <div
                            className={`inline-flex max-w-full items-center truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${vis.pillClasses}`}
                          >
                            {vis.badgeText}
                          </div>
                        </div>
                      </div>

                      {/* Quân cờ Token các sinh viên tại ô này */}
                      <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-800/70 pt-1.5">
                        {occupants.length === 0 ? (
                          <span className="text-[10px] italic text-slate-600">Ô trống</span>
                        ) : (
                          occupants.map((p) => (
                            <PlayerPawnToken
                              key={p.playerId}
                              player={p}
                              isSelf={p.playerId === selfPlayerId}
                              isActiveTurn={p.playerId === publicGame.activePlayerId}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <ActionPanel
            publicGame={publicGame}
            privateView={privateView}
            selfPlayerId={selfPlayerId}
            isSpectator={isSpectator}
            pendingAction={pendingAction}
            hiddenOnScreen={roleHiddenOnScreen}
            onToggleHidden={() => setRoleHiddenOnScreen((v) => !v)}
            onAction={handleDispatchAction}
          />
        </section>

        {/* Cột Phải: Nhật ký + Biểu cảm bàn chơi */}
        <section
          className={`space-y-3 lg:col-span-3 ${mobileTab === 'log' ? 'block' : 'hidden lg:block'}`}
        >
          {(onSendEmote || onSendChat) && !isSpectator && (
            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-3 text-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                💬 Biểu cảm bàn chơi
              </div>
              {onSendEmote && (
                <div className="flex flex-wrap gap-1.5">
                  {VALID_BOARD_GAME_EMOTES.map((eid) => (
                    <button
                      key={eid}
                      type="button"
                      data-testid={`bg-emote-${eid}`}
                      onClick={() => onSendEmote(eid)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs hover:border-amber-400 hover:bg-slate-700"
                      title={EMOTE_META[eid].label}
                    >
                      {EMOTE_META[eid].icon}
                    </button>
                  ))}
                </div>
              )}
              {onSendChat && (
                <form
                  className="flex gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = chatInput.trim();
                    if (!trimmed) return;
                    onSendChat(trimmed);
                    setChatInput('');
                  }}
                >
                  <input
                    data-testid="bg-chat-input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value.slice(0, 80))}
                    placeholder="Nhắn nhanh với bàn..."
                    className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-100 hover:bg-slate-600"
                  >
                    Gửi
                  </button>
                </form>
              )}
              {latestEmotes.length > 0 && (
                <div className="space-y-1 border-t border-slate-800 pt-1.5">
                  {latestEmotes.map((em, idx) => (
                    <div key={`${em.atMs}-${idx}`} className="text-[11px] text-amber-100">
                      <strong className="text-amber-300">{em.displayName}:</strong>{' '}
                      {em.emote ? `${EMOTE_META[em.emote]?.icon ?? ''} ` : ''}
                      {em.text ?? (em.emote ? EMOTE_META[em.emote]?.label : '')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <GameLog logs={publicGame.publicLog} highlights={publicGame.highlights} />
        </section>
      </div>

      {/* Thanh tab Mobile (dưới cùng trên < lg) */}
      <nav className="shrink-0 z-[46] grid grid-cols-3 border-t border-slate-800 bg-slate-950/95 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab('board')}
          className={`py-2.5 text-xs font-semibold ${
            mobileTab === 'board' ? 'bg-amber-500/15 text-amber-300' : 'text-slate-400'
          }`}
        >
          🗺️ Bàn &amp; Lượt
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('role')}
          className={`py-2.5 text-xs font-semibold ${
            mobileTab === 'role' ? 'bg-amber-500/15 text-amber-300' : 'text-slate-400'
          }`}
        >
          🎭 Vai bí mật
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('log')}
          className={`py-2.5 text-xs font-semibold ${
            mobileTab === 'log' ? 'bg-amber-500/15 text-amber-300' : 'text-slate-400'
          }`}
        >
          📜 Nhật ký
        </button>
      </nav>

      {/* Tổng kết trận đấu */}
      {publicGame.turnPhase === 'ENDED' && (
        <MatchResult
          publicGame={publicGame}
          selfPlayerId={selfPlayerId}
          isSpectator={isSpectator}
          postcardSlot={<MatchPostcard publicGame={publicGame} inviteCode={inviteCode} />}
          onPlayAgain={onPlayAgain}
          onLeaveMatch={onLeaveMatch}
        />
      )}

      {/* Hộp thoại xác nhận rời ván giữa chừng */}
      {leaveConfirmOpen && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-rose-500/45 bg-slate-900 p-4 text-xs text-slate-100 shadow-2xl">
            <h3 className="text-sm font-bold text-rose-300">Xác nhận rời ván đấu?</h3>
            <p className="mt-1.5 leading-relaxed text-slate-300">
              Bạn đang ở trong bàn Bóng Đêm KTX. Nếu thoát, ghế sẽ được giữ tạm trong thời gian
              ngắn để kết nối lại bằng tab này hoặc rời hẳn phòng.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLeaveConfirmOpen(false)}
                className="rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-700"
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
                className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-500"
              >
                Rời ván đấu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
