'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/GameBoard.tsx — Bàn chơi 2D chính của "Bóng Đêm KTX"
// (6 khu vực KTX, thanh Tín hiệu/Nhiễu sóng, đồng hồ đếm ngược, vai bí mật,
// điều khiển theo lượt, nhật ký, kết quả & responsive Mobile 390x844).
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import {
  VALID_BOARD_GAME_EMOTES,
  type BoardGameActionPayload,
  type BoardGameChatEmoteServerMessage,
  type BoardGameEmoteId,
  type BoardGamePrivateGameView,
  type BoardGamePublicGameView,
} from '../network/contracts';
import { KTX_LOCATION_MAP, isAdjacentLocation } from '../domain/rules';
import {
  BOARD_GRID_ORDER,
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
  const prevSignalRef = useRef<number>(publicGame.signalProgress);
  const prevMistRef = useRef<number>(publicGame.mistProgress);
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
    if (!didInitAudioRefs.current) {
      didInitAudioRefs.current = true;
      prevActiveIdRef.current = publicGame.activePlayerId;
      prevSignalRef.current = publicGame.signalProgress;
      prevMistRef.current = publicGame.mistProgress;
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

    if (
      publicGame.signalProgress > prevSignalRef.current ||
      publicGame.mistProgress > prevMistRef.current
    ) {
      playTrackAdvance();
    }
    if (handCount > prevHandCountRef.current) {
      playCardDraw();
    }
    if (revealedCount > prevRevealedCountRef.current) {
      playRoleReveal();
    }

    prevActiveIdRef.current = publicGame.activePlayerId;
    prevSignalRef.current = publicGame.signalProgress;
    prevMistRef.current = publicGame.mistProgress;
    prevHandCountRef.current = handCount;
    prevRevealedCountRef.current = revealedCount;
    prevPhaseRef.current = publicGame.turnPhase;
  }, [
    publicGame.activePlayerId,
    publicGame.signalProgress,
    publicGame.mistProgress,
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
      publicGame.turnPhase === 'MOVE',
  );

  const trackSteps = Array.from({ length: publicGame.maxTrackValue }, (_, idx) => idx + 1);

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

  return (
    <div
      data-testid="boardgame-2d-board"
      className="fixed inset-0 z-[45] flex flex-col overflow-x-hidden bg-slate-950/94 text-slate-100 backdrop-blur-md"
    >
      {/* Thanh đỉnh: Tên trận, Chỉ số Tín hiệu vs Màn sương, Vòng, Đồng hồ, Nút */}
      <header className="shrink-0 border-b border-slate-800 bg-slate-950/90 px-3 py-2.5 sm:px-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-sm font-extrabold text-amber-300">🎲 BÓNG ĐÊM KTX</span>
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

        {/* Hai thanh tiến độ Tín hiệu (Đội Gác Đèn) vs Nhiễu sóng (Hội Màn Sương) dạng nút cờ */}
        <div className="mx-auto mt-2 grid max-w-7xl grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/35 bg-amber-950/25 px-3 py-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-200">
              <span>🏮</span>
              <span>Tín hiệu Gác Đèn</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1" aria-hidden="true">
                {trackSteps.map((step) => {
                  const lit = step <= publicGame.signalProgress;
                  return (
                    <span
                      key={`sig-${step}`}
                      className={`flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-bold transition ${
                        lit
                          ? 'border-amber-200 bg-amber-400 text-slate-950 shadow-[0_0_8px_rgba(251,191,36,0.75)]'
                          : 'border-slate-700 bg-slate-900 text-slate-500'
                      }`}
                    >
                      {step}
                    </span>
                  );
                })}
              </div>
              <span
                data-testid="bg-signal-score"
                className="min-w-[26px] text-right font-mono text-[11px] font-bold text-amber-300"
              >
                {publicGame.signalProgress}/{publicGame.maxTrackValue}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-violet-500/35 bg-violet-950/25 px-3 py-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-200">
              <span>🌫️</span>
              <span>Nhiễu sóng Màn Sương</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1" aria-hidden="true">
                {trackSteps.map((step) => {
                  const lit = step <= publicGame.mistProgress;
                  return (
                    <span
                      key={`mist-${step}`}
                      className={`flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-bold transition ${
                        lit
                          ? 'border-fuchsia-200 bg-violet-500 text-white shadow-[0_0_8px_rgba(167,139,250,0.75)]'
                          : 'border-slate-700 bg-slate-900 text-slate-500'
                      }`}
                    >
                      {step}
                    </span>
                  );
                })}
              </div>
              <span
                data-testid="bg-mist-score"
                className="min-w-[26px] text-right font-mono text-[11px] font-bold text-violet-300"
              >
                {publicGame.mistProgress}/{publicGame.maxTrackValue}
              </span>
            </div>
          </div>
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
      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 pb-16 lg:grid-cols-12 lg:pb-4">
        {/* Cột Trái: Vai trò bí mật & Sổ ghi chép */}
        <section
          className={`lg:col-span-3 ${mobileTab === 'role' ? 'block' : 'hidden lg:block'}`}
        >
          <RoleCard privateView={privateView} isSpectator={isSpectator} />
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
                Đường nối hiển thị ô kề (tầm xa Sân Bóng Rổ &amp; lưới Hành Lang B7)
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
                {/* Vành ngoài & Trục dọc */}
                <line x1="100" y1="100" x2="300" y2="100" stroke="#F59E0B" strokeOpacity="0.28" strokeWidth="4" strokeDasharray="7 6" />
                <line x1="300" y1="100" x2="500" y2="100" stroke="#38BDF8" strokeOpacity="0.28" strokeWidth="4" strokeDasharray="7 6" />
                <line x1="100" y1="100" x2="100" y2="300" stroke="#C084FC" strokeOpacity="0.28" strokeWidth="4" strokeDasharray="7 6" />
                {/* Giao lộ Hành Lang B7 nối thẳng tới 5 ô */}
                <line x1="300" y1="300" x2="100" y2="100" stroke="#34D399" strokeOpacity="0.3" strokeWidth="3.5" />
                <line x1="300" y1="300" x2="300" y2="100" stroke="#34D399" strokeOpacity="0.3" strokeWidth="3.5" />
                <line x1="300" y1="300" x2="500" y2="100" stroke="#34D399" strokeOpacity="0.3" strokeWidth="3.5" />
                <line x1="300" y1="300" x2="100" y2="300" stroke="#34D399" strokeOpacity="0.32" strokeWidth="3.5" />
                <line x1="300" y1="300" x2="500" y2="300" stroke="#34D399" strokeOpacity="0.32" strokeWidth="3.5" />
                {/* Mạch điện ngầm nối Cầu Dao <-> Phát Thanh */}
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
                  const isBlackout = publicGame.blackoutLocation === loc.id;
                  const canMoveHere = canClickMoveOnBoard && selfPlayer?.location !== loc.id;
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
                        isBlackout
                          ? 'border-violet-500/70 bg-violet-950/65 shadow-[0_0_16px_rgba(124,58,237,0.22)]'
                          : isSelfHere
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
                          <LocationSceneSvg locationId={loc.id} isBlackout={isBlackout} />
                          <div className="absolute inset-x-1 top-1 flex flex-wrap items-center justify-between gap-1">
                            {isSelfHere && (
                              <span className="rounded-md bg-amber-400 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-950 shadow">
                                📍 Bạn
                              </span>
                            )}
                            {isBlackout && (
                              <span className="ml-auto rounded-md bg-violet-700 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                                ⚡ Mất điện
                              </span>
                            )}
                            {!isBlackout && isNearCourt && (
                              <span className="ml-auto rounded-md bg-sky-900/90 px-1.5 py-0.5 text-[9px] font-semibold text-sky-200 ring-1 ring-sky-400/50">
                                🎯 Tầm rổ
                              </span>
                            )}
                            {canMoveHere && !isBlackout && !isNearCourt && (
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

                        <div
                          className={`inline-flex max-w-full items-center truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${vis.pillClasses}`}
                        >
                          {vis.badgeText}
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
      <nav className="fixed inset-x-0 bottom-0 z-[46] grid grid-cols-3 border-t border-slate-800 bg-slate-950/95 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab('board')}
          className={`py-2.5 text-xs font-semibold ${
            mobileTab === 'board' ? 'bg-amber-500/15 text-amber-300' : 'text-slate-400'
          }`}
        >
          🗺️ Bàn & Lượt
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
