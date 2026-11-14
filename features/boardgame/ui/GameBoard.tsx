'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/GameBoard.tsx — Bàn chơi 2D chính của "Bóng Đêm KTX"
// (6 khu vực KTX, thanh Tín hiệu/Nhiễu sóng, đồng hồ đếm ngược, vai bí mật,
// điều khiển theo lượt, nhật ký, kết quả & responsive Mobile 390x844).
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import {
  VALID_BOARD_GAME_EMOTES,
  type BoardGameActionPayload,
  type BoardGameChatEmoteServerMessage,
  type BoardGameEmoteId,
  type BoardGamePrivateGameView,
  type BoardGamePublicGameView,
} from '../network/contracts';
import { KTX_LOCATIONS } from '../domain/rules';
import { FACTION_LABELS } from '../domain/roles';
import RoleCard from './RoleCard';
import ActionPanel from './ActionPanel';
import GameLog from './GameLog';
import MatchResult from './MatchResult';

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

  const signalPct = Math.round((publicGame.signalProgress / publicGame.maxTrackValue) * 100);
  const mistPct = Math.round((publicGame.mistProgress / publicGame.maxTrackValue) * 100);

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
      className="fixed inset-0 z-40 flex flex-col overflow-x-hidden bg-slate-950/94 text-slate-100 backdrop-blur-md"
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
            {onToggleSound && (
              <button
                type="button"
                data-testid="bg-sound-toggle-btn"
                onClick={onToggleSound}
                className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                title={soundMuted ? 'Bật âm thanh bàn chơi' : 'Tắt âm thanh bàn chơi'}
              >
                {soundMuted ? '🔇' : '🔊'}
              </button>
            )}
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

        {/* Hai thanh tiến độ Tín hiệu (Đội Gác Đèn) vs Nhiễu sóng (Hội Màn Sương) */}
        <div className="mx-auto mt-2 grid max-w-7xl grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-amber-200">
              <span>📡 Tín hiệu Gác Đèn</span>
              <span data-testid="bg-signal-score">
                {publicGame.signalProgress}/{publicGame.maxTrackValue}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${signalPct}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 px-3 py-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-violet-200">
              <span>🌫️ Nhiễu sóng Màn Sương</span>
              <span data-testid="bg-mist-score">
                {publicGame.mistProgress}/{publicGame.maxTrackValue}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400 transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${mistPct}%` }}
              />
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

      {/* Nội dung chính Responsive: Desktop 3 cột / Mobile tab */}
      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 pb-16 lg:grid-cols-12 lg:pb-4">
        {/* Cột Trái: Vai trò bí mật & Sổ ghi chép */}
        <section
          className={`lg:col-span-3 ${mobileTab === 'role' ? 'block' : 'hidden lg:block'}`}
        >
          <RoleCard privateView={privateView} isSpectator={isSpectator} />
        </section>

        {/* Cột Giữa: Bản đồ 6 Khu Vực KTX & Bảng Lượt */}
        <section
          className={`space-y-3 lg:col-span-6 ${mobileTab === 'board' ? 'block' : 'hidden lg:block'}`}
        >
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {KTX_LOCATIONS.map((loc) => {
              const occupants = publicGame.players.filter((p) => p.location === loc.id);
              const isSelfHere = occupants.some((p) => p.playerId === selfPlayerId);
              const isBlackout = publicGame.blackoutLocation === loc.id;
              return (
                <div
                  key={loc.id}
                  data-testid={`bg-loc-${loc.id}`}
                  className={`flex flex-col justify-between rounded-2xl border p-3 transition motion-reduce:transition-none ${
                    isBlackout
                      ? 'border-violet-500/55 bg-violet-950/30'
                      : isSelfHere
                        ? 'border-amber-400/60 bg-slate-900/95'
                        : 'border-slate-800 bg-slate-900/80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-amber-200">{loc.name}</span>
                      <div className="flex items-center gap-1">
                        {isBlackout && (
                          <span className="rounded bg-violet-900 px-1.5 py-0.5 text-[10px] font-semibold text-violet-100">
                            ⚡ Mất điện
                          </span>
                        )}
                        {isSelfHere && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                            Bạn ở đây
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-slate-400">{loc.description}</p>
                  </div>

                  {/* Sinh viên đang có mặt tại khu vực */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {occupants.length === 0 ? (
                      <span className="text-[11px] italic text-slate-600">Chưa có ai</span>
                    ) : (
                      occupants.map((p) => {
                        const isActive = p.playerId === publicGame.activePlayerId;
                        const isMe = p.playerId === selfPlayerId;
                        return (
                          <div
                            key={p.playerId}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] ${
                              !p.alive
                                ? 'border-slate-800 bg-slate-950/60 text-slate-500 line-through'
                                : isActive
                                  ? 'border-amber-400 bg-amber-950/55 text-amber-100'
                                  : isMe
                                    ? 'border-emerald-500/45 bg-emerald-950/35 text-emerald-100'
                                    : 'border-slate-700 bg-slate-950/75 text-slate-200'
                            }`}
                          >
                            <span className="font-semibold">
                              {isActive ? '▶ ' : ''}
                              {p.displayName}
                            </span>
                            <span className="text-[10px] text-rose-300">❤️{p.hp}</span>
                            {p.shield > 0 && (
                              <span className="text-[10px] text-sky-300">🛡️{p.shield}</span>
                            )}
                            {p.revealedFaction && (
                              <span className="rounded bg-slate-800 px-1 text-[10px] text-amber-300">
                                {FACTION_LABELS[p.revealedFaction]}
                              </span>
                            )}
                            {!p.connected && (
                              <span className="text-[10px] text-rose-400">(Mất mạng)</span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
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
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-slate-800 bg-slate-950/95 lg:hidden">
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
          onPlayAgain={onPlayAgain}
          onLeaveMatch={onLeaveMatch}
        />
      )}

      {/* Hộp thoại xác nhận rời ván giữa chừng */}
      {leaveConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
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
