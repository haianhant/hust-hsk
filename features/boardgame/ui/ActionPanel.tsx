'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/ActionPanel.tsx — Bảng Hành Động Theo Pha Xúc Xắc v4
// Đứng ngay dưới bàn cờ, chữ to rõ ràng, mỗi nút đúng pha hiện tại, zero wall of text.
// ---------------------------------------------------------------------------

import React, { useMemo, useState } from 'react';
import { getRoleDesign } from '@/features/boardgame/domain/roles';
import { getLocationDefinition, LOCATIONS_CATALOG } from '@/features/boardgame/domain/rules';
import type {
  BoardGameActionPayload,
  BoardGameLocationId,
  BoardGamePrivateGameView,
  BoardGamePublicGameView,
  BoardGamePublicPlayerView,
} from '@/shared/contracts/boardgame';
import { LOCATION_VISUAL_META } from './BoardGameArt';

export interface ActionPanelProps {
  publicGame: BoardGamePublicGameView;
  privateView: BoardGamePrivateGameView | null;
  selfPlayerId: string | null;
  isSpectator: boolean;
  selectedTargetId: string | null;
  onSelectTarget: (playerId: string | null) => void;
  onAction: (action: BoardGameActionPayload) => void;
  handMaskLocked: boolean;
  onToggleHandMask: () => void;
}

function getClusterForPlayer(p: BoardGamePublicPlayerView) {
  return LOCATION_VISUAL_META[p.location].clusterId;
}

export function ActionPanel({
  publicGame,
  privateView,
  selfPlayerId,
  isSpectator,
  selectedTargetId,
  onSelectTarget,
  onAction,
  handMaskLocked,
  onToggleHandMask,
}: ActionPanelProps) {
  const [confirmingReveal, setConfirmingReveal] = useState(false);
  const [blastLocation, setBlastLocation] = useState<BoardGameLocationId>('lobby');

  const selfPlayer = useMemo(
    () => publicGame.players.find((p) => p.playerId === selfPlayerId) ?? null,
    [publicGame.players, selfPlayerId],
  );
  const alivePlayers = useMemo(
    () => publicGame.players.filter((p) => p.alive),
    [publicGame.players],
  );
  const aliveOthers = useMemo(
    () => alivePlayers.filter((p) => p.playerId !== selfPlayerId),
    [alivePlayers, selfPlayerId],
  );

  // Tầm đánh chuẩn kiểu Shadow Hunters: cùng Cụm Khu Vực, trừ khi mang Dây Cáp Đàn Hồi (ev-04).
  const attackableTargets = useMemo(() => {
    if (!selfPlayer) return [];
    const selfCluster = getClusterForPlayer(selfPlayer);
    const hasLongCable = selfPlayer.equipped.some((eq) => eq.id === 'ev-04');
    if (hasLongCable) {
      const remote = aliveOthers.filter((p) => getClusterForPlayer(p) !== selfCluster);
      return remote.length > 0 ? remote : aliveOthers;
    }
    return aliveOthers.filter((p) => getClusterForPlayer(p) === selfCluster);
  }, [aliveOthers, selfPlayer]);

  if (isSpectator || !selfPlayer || !privateView) {
    return (
      <section
        data-testid="bg-action-spectator-banner"
        className="rounded-2xl border border-slate-700/80 bg-slate-900/95 p-4 text-sm font-semibold text-slate-200 flex items-center justify-between gap-3"
      >
        <span>👀 Bạn đang theo dõi bàn đấu ở chế độ khán giả.</span>
        <span className="text-xs text-cyan-300 font-bold">
          Vòng {publicGame.round} · Lượt #{publicGame.turnNumber}
        </span>
      </section>
    );
  }

  if (!selfPlayer.alive) {
    return (
      <section
        data-testid="bg-eliminated-banner"
        className="rounded-2xl border border-rose-500/40 bg-rose-950/35 p-4"
      >
        <p className="text-sm font-bold text-rose-200">
          💀 Bạn đã bị loại khỏi ván này. Có thể tiếp tục theo dõi bàn đấu cho tới khi kết thúc!
        </p>
      </section>
    );
  }

  const isMyTurn =
    !publicGame.winnerLabel &&
    publicGame.turnPhase !== 'ENDED' &&
    publicGame.activePlayerId === selfPlayer.playerId;

  const activePlayer = publicGame.players.find(
    (p) => p.playerId === publicGame.activePlayerId,
  );

  if (!isMyTurn) {
    return (
      <section
        data-testid="bg-waiting-turn-banner"
        className="rounded-2xl border border-slate-700/80 bg-slate-900/95 p-4 flex flex-wrap items-center justify-between gap-3"
      >
        <p className="text-sm sm:text-base font-bold text-slate-100">
          ⏳ Đang chờ lượt của{' '}
          <span className="text-amber-300">
            {activePlayer?.displayName ?? 'người chơi khác'}
          </span>
        </p>
        <span className="text-xs sm:text-sm font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-400/35 px-3 py-1.5 rounded-xl">
          ∞ Không giới hạn thời gian — tự động tới lượt bạn ngay khi xong
        </span>
      </section>
    );
  }

  const currentLoc = getLocationDefinition(selfPlayer.location);
  const roleDesign = getRoleDesign(privateView.roleId);
  const validAttackTarget =
    attackableTargets.find((p) => p.playerId === selectedTargetId) ??
    attackableTargets[0] ??
    null;
  const validOtherTarget =
    aliveOthers.find((p) => p.playerId === selectedTargetId) ??
    aliveOthers[0] ??
    null;
  const validAnyTarget =
    alivePlayers.find((p) => p.playerId === selectedTargetId) ?? selfPlayer;
  const equippedTargets = aliveOthers.filter((p) => p.equipped.length > 0);
  const validStealTarget =
    equippedTargets.find((p) => p.playerId === selectedTargetId) ??
    equippedTargets[0] ??
    null;

  const sameClusterOthers = aliveOthers.filter(
    (p) => getClusterForPlayer(p) === getClusterForPlayer(selfPlayer),
  );
  const canUseSkillNow =
    privateView.revealed &&
    roleDesign.targetMode !== 'passive' &&
    privateView.skillCooldown === 0 &&
    !(roleDesign.oncePerMatch && privateView.skillUsedOnce) &&
    (publicGame.turnPhase === 'LOCATION_ACTION' || publicGame.turnPhase === 'MAIN_ACTION');

  const sameClusterEquippedOthers = sameClusterOthers.filter((p) => p.equipped.length > 0);
  const skillCandidates =
    privateView.roleId === 'lang-anh-san' ? sameClusterEquippedOthers : sameClusterOthers;
  const skillTarget =
    roleDesign.targetMode === 'self'
      ? selfPlayer
      : roleDesign.targetMode === 'any-player'
        ? validAnyTarget
        : roleDesign.targetMode === 'any-other'
          ? validOtherTarget
          : skillCandidates.find((p) => p.playerId === selectedTargetId) ??
            skillCandidates[0] ??
            null;

  const rerollPrompt =
    publicGame.turnPhase === 'ROLL_MOVE' &&
    publicGame.lastDiceRoll?.rerollRequired &&
    publicGame.lastDiceRoll.playerId === selfPlayer.playerId;

  const equippedPreciseStick = selfPlayer.equipped.some((eq) => eq.id === 'ev-01');

  return (
    <section
      data-testid="bg-action-panel"
      className="rounded-2xl border border-amber-400/50 bg-slate-900/95 p-4 shadow-[0_12px_36px_rgba(245,158,11,0.12)] space-y-4"
    >
      {/* Thanh trạng thái lượt của tôi */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs sm:text-sm font-black">
            🎯 LƯỢT CỦA BẠN
          </span>
          <span className="text-sm font-bold text-slate-100">
            Đang đứng tại:{' '}
            <span className="text-cyan-300">
              Ô {currentLoc.diceLabel} · {currentLoc.name}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!privateView.revealed &&
            (confirmingReveal ? (
              <button
                type="button"
                data-testid="bg-confirm-reveal-btn"
                onClick={() => {
                  setConfirmingReveal(false);
                  onAction({ type: 'REVEAL_ROLE' });
                }}
                className="px-4 py-2 min-h-[42px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black transition cursor-pointer"
              >
                ✅ Xác nhận Lật Vai Công Khai
              </button>
            ) : (
              <button
                type="button"
                data-testid="bg-reveal-role-btn"
                onClick={() => setConfirmingReveal(true)}
                className="px-3.5 py-2 min-h-[42px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-400/50 text-amber-200 text-sm font-bold transition cursor-pointer"
              >
                🎭 Lật vai
              </button>
            ))}

          {canUseSkillNow && (
            <button
              type="button"
              data-testid="bg-use-skill-btn"
              disabled={roleDesign.targetMode !== 'self' && !skillTarget}
              onClick={() => {
                if (roleDesign.targetMode === 'self') {
                  onAction({ type: 'USE_SKILL' });
                } else if (skillTarget) {
                  onAction({ type: 'USE_SKILL', targetPlayerId: skillTarget.playerId });
                }
              }}
              className="px-3.5 py-2 min-h-[42px] rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-45 text-white text-sm font-bold transition cursor-pointer"
            >
              ✨ {roleDesign.skillName}
              {skillTarget && roleDesign.targetMode !== 'self' ? ` (${skillTarget.displayName})` : ''}
            </button>
          )}
        </div>
      </div>

      {/* PHA 1: TUNG XÚC XẮC DI CHUYỂN */}
      {publicGame.turnPhase === 'ROLL_MOVE' && (
        <div className="space-y-3">
          <p className="text-sm sm:text-base text-slate-200 font-semibold">
            {rerollPrompt
              ? `🎲 Bạn vừa tung trùng ô ${currentLoc.name} (${currentLoc.diceLabel}) — hãy bấm ĐỔ LẠI xúc xắc ngay!`
              : 'Bước 1: Tung đồng thời 1d6 + 1d4 để di chuyển sang khu vực kế tiếp (tổng 7 được tự chọn).'}
          </p>
          <button
            type="button"
            data-testid="bg-roll-dice-btn"
            onClick={() => onAction({ type: 'ROLL_DICE' })}
            className="w-full sm:w-auto px-6 py-3 min-h-[48px] rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-base font-black shadow-lg transition cursor-pointer"
          >
            {rerollPrompt
              ? '🎲 ĐỔ LẠI XÚC XẮC DI CHUYỂN (1d6 + 1d4)'
              : '🎲 TUNG XÚC XẮC DI CHUYỂN (1d6 + 1d4)'}
          </button>
        </div>
      )}

      {/* PHA 1B: CHỌN KHU VỰC TỰ DO KHI TỔNG XÚC XẮC = 7 */}
      {publicGame.turnPhase === 'CHOOSE_MOVE' && (
        <div className="space-y-3">
          <p className="text-sm sm:text-base font-bold text-amber-200">
            ✨ Tổng xúc xắc bằng 7! Hãy chọn bất kỳ khu vực nào khác để tới:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {LOCATIONS_CATALOG.filter((l) => l.id !== selfPlayer.location).map((loc) => (
              <button
                key={loc.id}
                type="button"
                data-testid={`bg-choose-dest-${loc.id}`}
                onClick={() => onAction({ type: 'CHOOSE_DEST', location: loc.id })}
                className="flex items-center justify-between gap-2 px-4 py-3 min-h-[48px] rounded-xl border border-amber-400/50 bg-amber-950/40 hover:bg-amber-900/55 text-left transition cursor-pointer"
              >
                <div>
                  <p className="text-sm font-black text-white">
                    Ô {loc.diceLabel} · {loc.name}
                  </p>
                  <p className="text-xs text-amber-100/90">{loc.subtitle}</p>
                </div>
                <span className="text-sm font-black text-amber-300">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PHA 2: HÀNH ĐỘNG KHU VỰC */}
      {publicGame.turnPhase === 'LOCATION_ACTION' && (
        <div className="space-y-3">
          <p className="text-sm sm:text-base font-bold text-cyan-200">
            Bước 2 — Quyền năng {currentLoc.name} (Ô {currentLoc.diceLabel}):{' '}
            <span className="font-normal text-slate-200">{currentLoc.actionSummary}</span>
          </p>

          {(currentLoc.deckHint === 'investigation' || currentLoc.deckHint === 'any') && (
            <button
              type="button"
              data-testid="bg-draw-investigation-btn"
              onClick={() => onAction({ type: 'DRAW_CARD', deck: 'investigation' })}
              className="mr-2 mb-1 px-5 py-3 min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black transition cursor-pointer"
            >
              🔍 Rút 1 Thẻ Khám Phá ({publicGame.deckCounts.investigation})
            </button>
          )}
          {(currentLoc.deckHint === 'equipment' || currentLoc.deckHint === 'any') && (
            <button
              type="button"
              data-testid="bg-draw-equipment-btn"
              onClick={() => onAction({ type: 'DRAW_CARD', deck: 'equipment' })}
              className="mr-2 mb-1 px-5 py-3 min-h-[46px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-black transition cursor-pointer"
            >
              🛡️ Rút 1 Thẻ Cung Ứng ({publicGame.deckCounts.equipment})
            </button>
          )}
          {(currentLoc.deckHint === 'event' || currentLoc.deckHint === 'any') && (
            <button
              type="button"
              data-testid="bg-draw-event-btn"
              onClick={() => onAction({ type: 'DRAW_CARD', deck: 'event' })}
              className="mr-2 mb-1 px-5 py-3 min-h-[46px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-black transition cursor-pointer"
            >
              ⚡ Rút 1 Thẻ Đột Kích ({publicGame.deckCounts.event})
            </button>
          )}

          {currentLoc.deckHint === 'power-9' && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap gap-2">
                {alivePlayers.map((p) => {
                  const selected = validAnyTarget.playerId === p.playerId;
                  return (
                    <button
                      key={p.playerId}
                      type="button"
                      onClick={() => onSelectTarget(p.playerId)}
                      className={`px-3 py-2 min-h-[40px] rounded-xl border text-xs sm:text-sm font-bold transition cursor-pointer ${
                        selected
                          ? 'bg-violet-600 border-violet-300 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {p.displayName} ({p.woundsTaken} vết)
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="bg-loc-heal-btn"
                  onClick={() =>
                    onAction({
                      type: 'USE_LOC_POWER',
                      targetPlayerId: validAnyTarget.playerId,
                      mode: 'heal',
                    })
                  }
                  className="px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black transition cursor-pointer"
                >
                  💚 Hồi 1 cho {validAnyTarget.displayName}
                </button>
                <button
                  type="button"
                  data-testid="bg-loc-damage-btn"
                  onClick={() =>
                    onAction({
                      type: 'USE_LOC_POWER',
                      targetPlayerId: validAnyTarget.playerId,
                      mode: 'damage',
                    })
                  }
                  className="px-4 py-2.5 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-black transition cursor-pointer"
                >
                  💥 Gây 2 dmg lên {validAnyTarget.displayName}
                </button>
              </div>
            </div>
          )}

          {currentLoc.deckHint === 'power-10' && (
            <div className="space-y-2">
              {equippedTargets.length === 0 ? (
                <p className="text-sm text-amber-200">
                  Hiện chưa có ai đeo Trang bị trên bàn — bạn có thể Bỏ qua khu vực để sang pha đánh/kết thúc.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {equippedTargets.map((p) => {
                    const selected = validStealTarget?.playerId === p.playerId;
                    return (
                      <button
                        key={p.playerId}
                        type="button"
                        onClick={() => onSelectTarget(p.playerId)}
                        className={`px-3 py-2 min-h-[40px] rounded-xl border text-xs sm:text-sm font-bold transition cursor-pointer ${
                          selected
                            ? 'bg-sky-600 border-sky-300 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        {p.displayName} ({p.equipped.length} đồ)
                      </button>
                    );
                  })}
                  {validStealTarget && (
                    <button
                      type="button"
                      data-testid="bg-loc-steal-btn"
                      onClick={() =>
                        onAction({
                          type: 'USE_LOC_POWER',
                          targetPlayerId: validStealTarget.playerId,
                          mode: 'steal',
                        })
                      }
                      className="px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-black transition cursor-pointer"
                    >
                      🧤 Cướp 1 Trang bị của {validStealTarget.displayName}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="pt-1">
            <button
              type="button"
              data-testid="bg-skip-loc-btn"
              onClick={() => onAction({ type: 'SKIP_LOC' })}
              className="px-4 py-2 min-h-[40px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-sm font-bold transition cursor-pointer"
            >
              ⏭️ Bỏ qua khu vực → Pha Hành Động
            </button>
          </div>
        </div>
      )}

      {/* PHA 3: DÙNG BÀI / TẤN CÔNG / KẾT THÚC LƯỢT */}
      {publicGame.turnPhase === 'MAIN_ACTION' && (
        <div className="space-y-4">
          {/* Chọn mục tiêu nhanh cho Thẻ & Đòn Đánh */}
          <div className="space-y-1.5">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
              Chọn mục tiêu hành động / tấn công:
            </p>
            <div className="flex flex-wrap gap-2">
              {aliveOthers.map((p) => {
                const inRange = attackableTargets.some((t) => t.playerId === p.playerId);
                const selected = (selectedTargetId ?? validOtherTarget?.playerId) === p.playerId;
                return (
                  <button
                    key={p.playerId}
                    type="button"
                    onClick={() => onSelectTarget(p.playerId)}
                    className={`px-3 py-2 min-h-[40px] rounded-xl border text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      selected
                        ? 'bg-rose-600/85 border-rose-300 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <span>{p.displayName}</span>
                    {inRange && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-black/30 text-amber-200">
                        🎯 Tầm đánh
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bài trên tay (kèm lớp che chống nhìn trộm màn hình) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                🃏 Bài trên tay ({privateView.hand.length}/3):
              </p>
              {privateView.hand.length > 0 && (
                <button
                  type="button"
                  onClick={onToggleHandMask}
                  className="px-2.5 py-1.5 min-h-[36px] rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
                >
                  {handMaskLocked ? '👁️ Hiện bài trên tay' : '🙈 Che bài'}
                </button>
              )}
            </div>

            {privateView.hand.length === 0 ? (
              <p className="text-sm text-slate-400">Chưa có thẻ nào trên tay.</p>
            ) : handMaskLocked ? (
              <div
                data-testid="bg-hand-masked-banner"
                className="rounded-xl border border-dashed border-amber-400/45 bg-slate-950/85 p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <p className="text-sm font-semibold text-amber-100">
                  🙈 Bài trên tay đang được che để chống nhìn màn hình ({privateView.hand.length} lá).
                </p>
                <button
                  type="button"
                  data-testid="bg-unmask-hand-btn"
                  onClick={onToggleHandMask}
                  className="px-4 py-2 min-h-[40px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black cursor-pointer"
                >
                  👁️ Mở xem bài của tôi
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {privateView.hand.map((card, idx) => {
                  const isInv = card.deck === 'investigation';
                  const isGear = !isInv && !card.isConsumable;
                  const isLocBlast = card.effectId === 'ev-07';

                  return (
                    <div
                      key={`${card.id}-${idx}`}
                      className={`rounded-xl border p-3 flex flex-col justify-between gap-2.5 ${
                        isInv
                          ? 'border-emerald-500/45 bg-emerald-950/35'
                          : card.deck === 'equipment'
                            ? 'border-sky-500/45 bg-sky-950/35'
                            : 'border-rose-500/45 bg-rose-950/35'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-black text-white">{card.title}</p>
                        <p className="text-xs sm:text-sm text-slate-200 mt-1 leading-snug">
                          {card.summary}
                        </p>
                      </div>

                      {isLocBlast && (
                        <select
                          value={blastLocation}
                          onChange={(e) => setBlastLocation(e.target.value as BoardGameLocationId)}
                          className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-100"
                          aria-label="Chọn khu vực ném thẻ Mất Điện"
                        >
                          {LOCATIONS_CATALOG.map((l) => (
                            <option key={l.id} value={l.id}>
                              Ô {l.diceLabel} · {l.name}
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        type="button"
                        data-testid={`bg-use-card-${card.id}`}
                        disabled={isInv && !validOtherTarget}
                        onClick={() => {
                          if (isInv && validOtherTarget) {
                            onAction({
                              type: 'INVESTIGATE_CARD',
                              cardId: card.id,
                              targetPlayerId: validOtherTarget.playerId,
                            });
                          } else if (isGear) {
                            onAction({ type: 'EQUIP_CARD', cardId: card.id });
                          } else if (isLocBlast) {
                            onAction({
                              type: 'USE_CARD',
                              cardId: card.id,
                              targetLocation: blastLocation,
                            });
                          } else if (card.targetMode === 'single-player') {
                            const tgt =
                              card.deck === 'equipment'
                                ? validAnyTarget.playerId
                                : validOtherTarget?.playerId;
                            if (tgt) {
                              onAction({
                                type: 'USE_CARD',
                                cardId: card.id,
                                targetPlayerId: tgt,
                              });
                            }
                          } else {
                            onAction({ type: 'USE_CARD', cardId: card.id });
                          }
                        }}
                        className="w-full px-3 py-2 min-h-[40px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs sm:text-sm font-black text-white transition cursor-pointer"
                      >
                        {isInv
                          ? `🔍 Đưa kín → ${validOtherTarget?.displayName ?? '?'}`
                          : isGear
                            ? '🎒 Trang bị ngay'
                            : isLocBlast
                              ? `💥 Nổ tại Ô ${LOCATION_VISUAL_META[blastLocation].diceLabel}`
                              : card.deck === 'equipment' && card.targetMode === 'single-player'
                                ? `💚 Hồi → ${validAnyTarget.displayName}`
                                : card.targetMode === 'single-player'
                                  ? `⚡ Kích hoạt → ${validOtherTarget?.displayName ?? '?'}`
                                  : '⚡ Kích hoạt ngay'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hàng nút chính cuối pha: Tấn công hoặc Kết thúc lượt */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              data-testid="bg-attack-btn"
              disabled={!validAttackTarget}
              onClick={() => {
                if (validAttackTarget) {
                  onAction({ type: 'ATTACK', targetPlayerId: validAttackTarget.playerId });
                }
              }}
              className="px-5 py-3 min-h-[46px] rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-sm sm:text-base font-black shadow transition cursor-pointer"
            >
              {validAttackTarget
                ? `⚔️ Tấn công ${validAttackTarget.displayName} (${equippedPreciseStick ? '1d4' : '|1d6-1d4|'})`
                : '⚔️ Chưa có mục tiêu cùng Cụm'}
            </button>

            <button
              type="button"
              data-testid="bg-end-turn-btn"
              onClick={() => onAction({ type: 'END_TURN' })}
              className="px-5 py-3 min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm sm:text-base font-black shadow transition cursor-pointer"
            >
              ✔️ Kết thúc lượt
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default ActionPanel;
