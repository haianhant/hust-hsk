'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/ActionPanel.tsx — Bảng điều khiển lượt hợp lệ
// theo 3 pha: MOVE -> DRAW_OR_EXPLORE -> TACTICAL_ACTION -> END_TURN.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import type {
  BoardGameActionPayload,
  BoardGameFactionId,
  BoardGameLocationId,
  BoardGamePrivateGameView,
  BoardGamePublicGameView,
} from '../network/contracts';
import { KTX_LOCATIONS, KTX_LOCATION_MAP, isAdjacentLocation } from '../domain/rules';
import { FACTION_LABELS } from '../domain/roles';

export interface ActionPanelProps {
  publicGame: BoardGamePublicGameView;
  privateView: BoardGamePrivateGameView | null;
  selfPlayerId: string | null;
  isSpectator: boolean;
  pendingAction: boolean;
  onAction: (action: BoardGameActionPayload) => void;
}

const PHASE_TITLES: Record<string, string> = {
  MOVE: 'Bước 1/3 · Di chuyển sang khu vực KTX mới',
  DRAW_OR_EXPLORE: 'Bước 2/3 · Điều tra rút thẻ (hoặc chỉnh Trạm)',
  TACTICAL_ACTION: 'Bước 3/3 · Dùng thẻ / Kỹ năng / Công kích hoặc Kết thúc lượt',
  ENDED: 'Ván đấu đã ngã ngũ',
};

export default function ActionPanel({
  publicGame,
  privateView,
  selfPlayerId,
  isSpectator,
  pendingAction,
  onAction,
}: ActionPanelProps) {
  const activePlayer =
    publicGame.players.find((p) => p.playerId === publicGame.activePlayerId) ?? null;
  const selfPublic = selfPlayerId
    ? publicGame.players.find((p) => p.playerId === selfPlayerId) ?? null
    : null;
  const isMyTurn = Boolean(
    !isSpectator &&
      selfPlayerId &&
      selfPublic?.alive &&
      publicGame.activePlayerId === selfPlayerId &&
      publicGame.turnPhase !== 'ENDED',
  );

  const aliveTargets = useMemo(
    () =>
      publicGame.players.filter(
        (p) => p.alive && (!selfPlayerId || p.playerId !== selfPlayerId),
      ),
    [publicGame.players, selfPlayerId],
  );

  const inRangeTargets = useMemo(() => {
    if (!selfPublic) return [];
    return aliveTargets.filter(
      (p) =>
        p.location === selfPublic.location ||
        (selfPublic.location === 'court' && isAdjacentLocation(selfPublic.location, p.location)),
    );
  }, [aliveTargets, selfPublic]);

  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [probeFaction, setProbeFaction] = useState<BoardGameFactionId>('mist-order');

  useEffect(() => {
    const preferred = inRangeTargets[0]?.playerId ?? aliveTargets[0]?.playerId ?? '';
    if (!selectedTargetId || !aliveTargets.some((t) => t.playerId === selectedTargetId)) {
      setSelectedTargetId(preferred);
    }
  }, [inRangeTargets, aliveTargets, selectedTargetId]);

  if (publicGame.turnPhase === 'ENDED') {
    return null;
  }

  if (isSpectator || !selfPublic) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3 text-xs text-slate-300">
        <div className="font-semibold text-sky-300">
          ⏳ Đang theo dõi lượt của {activePlayer?.displayName ?? 'người chơi'}
        </div>
        <div className="mt-1 text-slate-400">
          {PHASE_TITLES[publicGame.turnPhase] ?? publicGame.turnPhase}
        </div>
      </div>
    );
  }

  if (!selfPublic.alive) {
    return (
      <div className="rounded-2xl border border-rose-500/35 bg-rose-950/35 p-3 text-xs text-rose-200">
        Bạn đã tạm rời cuộc điều tra trong ván này — vẫn có thể theo dõi phần còn lại và chờ tổng
        kết.
      </div>
    );
  }

  if (!isMyTurn) {
    return (
      <div
        data-testid="bg-waiting-turn-banner"
        className="rounded-2xl border border-slate-700/80 bg-slate-900/90 p-3 text-xs text-slate-200"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-amber-200">
            ⏳ Đang chờ lượt của {activePlayer?.displayName ?? 'đồng đội'}
          </span>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
            {PHASE_TITLES[publicGame.turnPhase] ?? publicGame.turnPhase}
          </span>
        </div>
      </div>
    );
  }

  const currentLoc: BoardGameLocationId = selfPublic.location;
  const isCurrentBlackout = publicGame.blackoutLocation === currentLoc;
  const moveOptions = KTX_LOCATIONS.filter((l) => l.id !== currentLoc);
  const effectiveTargetId = selectedTargetId || inRangeTargets[0]?.playerId || aliveTargets[0]?.playerId;
  const hasRangeTarget = inRangeTargets.length > 0;
  const rangeTargetId = inRangeTargets.some((t) => t.playerId === effectiveTargetId)
    ? effectiveTargetId
    : inRangeTargets[0]?.playerId;

  return (
    <div
      data-testid="bg-action-panel"
      className="space-y-3 rounded-2xl border border-amber-400/50 bg-slate-900/95 p-3.5 text-xs text-slate-100 shadow-xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-bold text-amber-300">
          <span>🎯 LƯỢT CỦA BẠN</span>
          <span className="font-normal text-slate-300">
            ({PHASE_TITLES[publicGame.turnPhase] ?? publicGame.turnPhase})
          </span>
        </span>
        {privateView && !privateView.revealed && (
          <button
            type="button"
            data-testid="bg-reveal-role-btn"
            disabled={pendingAction}
            onClick={() => onAction({ type: 'REVEAL_ROLE' })}
            className="rounded-lg border border-rose-400/45 bg-rose-950/60 px-2.5 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-900/70 disabled:opacity-45"
          >
            📢 Tự lật vai
          </button>
        )}
      </div>

      {/* Pha 1: MOVE */}
      {publicGame.turnPhase === 'MOVE' && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {moveOptions.map((loc) => {
            const blackout = publicGame.blackoutLocation === loc.id;
            return (
              <button
                key={loc.id}
                type="button"
                data-testid={`bg-move-${loc.id}`}
                disabled={pendingAction}
                onClick={() => onAction({ type: 'MOVE', location: loc.id })}
                className="flex flex-col items-start rounded-xl border border-slate-700 bg-slate-950/80 p-2.5 text-left transition hover:border-amber-400 hover:bg-amber-950/35 disabled:opacity-45 motion-reduce:transition-none"
              >
                <div className="flex w-full items-center justify-between gap-1 font-semibold text-amber-200">
                  <span>🚶 {loc.name}</span>
                  {blackout && (
                    <span className="rounded bg-violet-950 px-1.5 py-0.5 text-[10px] text-violet-200">
                      Mất điện
                    </span>
                  )}
                </div>
                <span className="mt-1 text-[11px] leading-snug text-slate-400">
                  {loc.description}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Pha 2: DRAW_OR_EXPLORE */}
      {publicGame.turnPhase === 'DRAW_OR_EXPLORE' && (
        <div className="space-y-2.5">
          {isCurrentBlackout && (
            <div className="rounded-lg border border-violet-500/40 bg-violet-950/45 px-2.5 py-1.5 text-[11px] text-violet-200">
              ⚡ Khu vực {KTX_LOCATION_MAP[currentLoc].name} đang mất điện cục bộ trong vòng này —
              tính năng đặc biệt tạm vô hiệu.
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              data-testid="bg-draw-clue"
              disabled={pendingAction}
              onClick={() => onAction({ type: 'DRAW_CARD', deck: 'clue' })}
              className="rounded-xl border border-amber-500/50 bg-amber-950/45 p-2.5 text-left hover:bg-amber-900/55 disabled:opacity-45"
            >
              <div className="font-bold text-amber-200">
                🟨 Rút Manh mối ({publicGame.deckCounts.clue})
              </div>
              <div className="mt-0.5 text-[11px] text-amber-100/80">
                Nhặt Mảnh tin hoặc soi phe bí mật.
              </div>
            </button>

            <button
              type="button"
              data-testid="bg-draw-event"
              disabled={pendingAction}
              onClick={() => onAction({ type: 'DRAW_CARD', deck: 'event' })}
              className="rounded-xl border border-rose-500/50 bg-rose-950/45 p-2.5 text-left hover:bg-rose-900/55 disabled:opacity-45"
            >
              <div className="font-bold text-rose-200">
                🟥 Rút Sự kiện ({publicGame.deckCounts.event})
              </div>
              <div className="mt-0.5 text-[11px] text-rose-100/80">
                Biến cố trực tiếp lên khu vực & Tín hiệu.
              </div>
            </button>

            <button
              type="button"
              data-testid="bg-draw-tactic"
              disabled={pendingAction}
              onClick={() => onAction({ type: 'DRAW_CARD', deck: 'tactic' })}
              className="rounded-xl border border-sky-500/50 bg-sky-950/45 p-2.5 text-left hover:bg-sky-900/55 disabled:opacity-45"
            >
              <div className="font-bold text-sky-200">
                🟦 Rút Chiến thuật ({publicGame.deckCounts.tactic})
              </div>
              <div className="mt-0.5 text-[11px] text-sky-100/80">
                Giữ kín trên tay để tung ra đúng thời điểm.
              </div>
            </button>
          </div>

          {currentLoc === 'radio' && !isCurrentBlackout && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-2.5">
              <span className="text-[11px] font-semibold text-emerald-200">
                📡 Đặc quyền Phòng Phát Thanh:
              </span>
              <button
                type="button"
                data-testid="bg-adjust-signal"
                disabled={pendingAction}
                onClick={() => onAction({ type: 'ADJUST_TRACK', mode: 'signal' })}
                className="rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-45"
              >
                +1 Tín hiệu 🏮
              </button>
              <button
                type="button"
                data-testid="bg-adjust-mist"
                disabled={pendingAction}
                onClick={() => onAction({ type: 'ADJUST_TRACK', mode: 'mist' })}
                className="rounded-lg bg-violet-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-violet-500 disabled:opacity-45"
              >
                +1 Nhiễu sóng 🌫️
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pha 3: TACTICAL_ACTION */}
      {publicGame.turnPhase === 'TACTICAL_ACTION' && (
        <div className="space-y-3">
          {/* Chọn mục tiêu */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-950/75 p-2.5">
            <label htmlFor="bg-target-select" className="text-[11px] font-semibold text-slate-300">
              🎯 Mục tiêu:
            </label>
            <select
              id="bg-target-select"
              data-testid="bg-target-select"
              value={effectiveTargetId ?? ''}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-amber-100 outline-none focus:border-amber-400"
            >
              {aliveTargets.map((t) => {
                const inRange = inRangeTargets.some((r) => r.playerId === t.playerId);
                return (
                  <option key={t.playerId} value={t.playerId}>
                    {t.displayName} ({KTX_LOCATION_MAP[t.location].shortLabel} · {t.hp} HP
                    {inRange ? ' · Trong tầm' : ''})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Lá bài Chiến thuật trên tay */}
          {privateView && privateView.hand.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
                🃏 Lá bài Chiến thuật trên tay ({privateView.hand.length}/4)
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {privateView.hand.map((card, idx) => (
                  <button
                    key={`${card.id}-${idx}`}
                    type="button"
                    data-testid={`bg-use-card-${card.id}`}
                    disabled={pendingAction}
                    onClick={() =>
                      onAction({
                        type: 'USE_CARD',
                        cardId: card.id,
                        targetPlayerId: effectiveTargetId,
                      })
                    }
                    className="rounded-xl border border-sky-500/40 bg-slate-950/85 p-2 text-left hover:border-sky-400 hover:bg-sky-950/40 disabled:opacity-45"
                  >
                    <div className="font-semibold text-sky-200">✨ {card.title}</div>
                    <div className="mt-0.5 text-[11px] leading-snug text-slate-400">
                      {card.summary}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hành động chiến thuật + Kết thúc lượt */}
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-2.5">
            <button
              type="button"
              data-testid="bg-use-skill-btn"
              disabled={pendingAction || Boolean(privateView?.skillUsed)}
              onClick={() =>
                onAction({
                  type: 'USE_SKILL',
                  targetPlayerId: effectiveTargetId,
                })
              }
              className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-500 disabled:opacity-40"
            >
              ⚡ Kỹ năng (Lật vai)
            </button>

            <button
              type="button"
              data-testid="bg-attack-btn"
              disabled={pendingAction || !hasRangeTarget || !rangeTargetId}
              title={
                hasRangeTarget
                  ? 'Công kích -2 HP mục tiêu trong tầm'
                  : 'Cần có sinh viên khác đứng cùng khu vực (hoặc kề cạnh tại Sân Bóng Rổ)'
              }
              onClick={() =>
                rangeTargetId &&
                onAction({
                  type: 'ATTACK',
                  targetPlayerId: rangeTargetId,
                })
              }
              className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-40"
            >
              ⚔️ Công kích
            </button>

            <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-950/80 p-1">
              <select
                data-testid="bg-probe-faction-select"
                value={probeFaction}
                onChange={(e) => setProbeFaction(e.target.value as BoardGameFactionId)}
                className="rounded-lg bg-slate-900 px-1.5 py-1 text-[11px] text-slate-100 outline-none"
              >
                <option value="mist-order">{FACTION_LABELS['mist-order']}</option>
                <option value="lantern-guard">{FACTION_LABELS['lantern-guard']}</option>
                <option value="wanderer">{FACTION_LABELS.wanderer}</option>
              </select>
              <button
                type="button"
                data-testid="bg-probe-btn"
                disabled={pendingAction || !hasRangeTarget || !rangeTargetId}
                onClick={() =>
                  rangeTargetId &&
                  onAction({
                    type: 'PROBE',
                    targetPlayerId: rangeTargetId,
                    claimedFaction: probeFaction,
                  })
                }
                className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                🔍 Thăm dò
              </button>
            </div>

            <button
              type="button"
              data-testid="bg-end-turn-btn"
              disabled={pendingAction}
              onClick={() => onAction({ type: 'END_TURN' })}
              className="ml-auto rounded-xl bg-emerald-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-45"
            >
              ✓ Kết thúc lượt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
