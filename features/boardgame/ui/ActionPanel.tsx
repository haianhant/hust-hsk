'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/ActionPanel.tsx — Bảng Hành Động Chuẩn Shadow Hunters
// Đứng cố định đáy bàn cờ, không bẫy thao tác, hỗ trợ đủ 10 Nhân vật & 48 Thẻ bài.
// ---------------------------------------------------------------------------

import React, { useEffect, useMemo, useState } from 'react';
import { getRoleDesign } from '@/features/boardgame/domain/roles';
import {
  areInSameCluster,
  BOARD_GAME_MAX_HAND,
  DEFAULT_CLUSTER_PAIRS,
  getLocationDefinition,
  getPairedLocationInCluster,
  LOCATIONS_CATALOG,
} from '@/features/boardgame/domain/rules';
import type {
  BoardGameActionPayload,
  BoardGamePrivateGameView,
  BoardGamePublicGameView,
} from '@/shared/contracts/boardgame';
import { resolveActionTargets } from './target-selection';

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
  const [healTargetId, setHealTargetId] = useState<string | null>(null);
  const [stealEquipId, setStealEquipId] = useState<string>('');
  const [bananaEquipId, setBananaEquipId] = useState<string>('');

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

  useEffect(() => {
    setHealTargetId(null);
    setStealEquipId('');
    setBananaEquipId('');
  }, [publicGame.turnNumber]);

  useEffect(() => {
    setConfirmingReveal(false);
  }, [publicGame.turnNumber, publicGame.turnPhase]);

  useEffect(() => {
    if (selfPlayerId && selectedTargetId === selfPlayerId) {
      setHealTargetId(selfPlayerId);
    }
  }, [selectedTargetId, selfPlayerId]);

  const clusterPairs = publicGame.clusterPairs ?? DEFAULT_CLUSTER_PAIRS;

  // Tầm đánh chuẩn Shadow Hunters: cùng Cụm, trừ Súng Bắn Đinh (ev-05 Handgun) bắn mọi Cụm khác.
  const attackableTargets = useMemo(() => {
    if (!selfPlayer) return [];
    const hasHandgun = selfPlayer.equipped.some((eq) => eq.id === 'ev-05');
    return aliveOthers.filter((p) => {
      const same = areInSameCluster(selfPlayer.location, p.location, clusterPairs);
      return hasHandgun ? !same : same;
    });
  }, [aliveOthers, selfPlayer, clusterPairs]);

  if (isSpectator || !selfPlayer || !privateView) {
    return (
      <section
        data-testid="bg-action-spectator-banner"
        className="rounded-2xl border border-slate-700/80 bg-slate-900/95 px-3.5 py-2.5 text-sm font-semibold text-slate-200 flex flex-wrap items-center justify-between gap-2"
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
        className="rounded-2xl border border-rose-500/40 bg-rose-950/35 px-3.5 py-2.5"
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
        className="rounded-2xl border border-slate-700/80 bg-slate-900/95 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2"
      >
        <p className="text-sm font-bold text-slate-100">
          ⏳ Đang chờ lượt của{' '}
          <span className="text-amber-300">
            {activePlayer?.displayName ?? 'người chơi khác'}
          </span>
        </p>
        <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-400/35 px-2.5 py-1 rounded-xl">
          ∞ Không giới hạn thời gian — tự động tới lượt bạn ngay khi xong
        </span>
      </section>
    );
  }

  const currentLoc = getLocationDefinition(selfPlayer.location);
  const pairedLoc = getLocationDefinition(
    getPairedLocationInCluster(selfPlayer.location, clusterPairs),
  );
  const roleDesign = getRoleDesign(privateView.roleId);
  const {
    validAttackTarget,
    validOtherTarget,
    validAnyTarget,
    validHealCardTarget,
    validStealTarget,
  } = resolveActionTargets({
    selfPlayer,
    alivePlayers,
    aliveOthers,
    attackableTargets,
    selectedTargetId,
    healTargetId,
  });
  const equippedTargets = aliveOthers.filter((p) => p.equipped.length > 0);
  const hasAnyHandCard = privateView.hand.length > 0;
  const hasMasamune = selfPlayer.equipped.some((eq) => eq.id === 'ev-01');
  const hasMachineGun = selfPlayer.equipped.some((eq) => eq.id === 'ev-06');
  const hasHandgun = selfPlayer.equipped.some((eq) => eq.id === 'ev-05');
  const attacksThisTurn = selfPlayer.attacksThisTurn ?? 0;

  // Điều kiện kích hoạt kỹ năng theo từng nhân vật chuẩn Shadow Hunters
  const canUseSkillNow = (() => {
    if (!privateView.revealed || roleDesign.targetMode === 'passive') return false;
    if (roleDesign.oncePerMatch && privateView.skillUsedOnce) return false;
    if (privateView.skillCooldown > 0) return false;
    switch (privateView.roleId) {
      case 'gac-truc-ban': // Emi Teleport: Pha 1 ROLL_MOVE
        return publicGame.turnPhase === 'ROLL_MOVE';
      case 'lang-cuu-ho': // Charles Bloody Feast: sau đòn đánh 1 trong MAIN_ACTION & còn > 2 HP
        return (
          publicGame.turnPhase === 'MAIN_ACTION' &&
          attacksThisTurn === 1 &&
          privateView.hp > 2 &&
          !hasAnyHandCard &&
          attackableTargets.length > 0
        );
      default: // George, Franklin, Allie: ROLL_MOVE / LOCATION_ACTION / MAIN_ACTION
        return (
          publicGame.turnPhase === 'ROLL_MOVE' ||
          publicGame.turnPhase === 'LOCATION_ACTION' ||
          publicGame.turnPhase === 'MAIN_ACTION'
        );
    }
  })();

  const skillTarget =
    roleDesign.targetMode === 'self'
      ? selfPlayer
      : privateView.roleId === 'lang-cuu-ho'
        ? validAttackTarget
        : validOtherTarget;

  const rerollPrompt =
    publicGame.turnPhase === 'ROLL_MOVE' &&
    publicGame.lastDiceRoll?.rerollRequired &&
    publicGame.lastDiceRoll.playerId === selfPlayer.playerId;

  const selectedIsSelf = selectedTargetId === selfPlayer.playerId;
  const selectedIsOutOfRange = Boolean(
    !selectedIsSelf &&
      validOtherTarget &&
      !attackableTargets.some((t) => t.playerId === validOtherTarget.playerId),
  );

  const attackWeaponBonus = selfPlayer.equipped.reduce((sum, eq) => {
    if (eq.id === 'eq-04') {
      return sum + (privateView.revealed && privateView.faction === 'lantern-guard' ? 2 : 0);
    }
    if (eq.id === 'ev-02' || eq.id === 'ev-03' || eq.id === 'ev-04') return sum + 1;
    if (eq.id === 'eq-01') return sum - 1;
    return sum;
  }, 0);
  const attackDiceFormula = `${hasMasamune ? '1d4' : '|1d6-1d4|'}${
    attackWeaponBonus > 0 ? `+${attackWeaponBonus}` : attackWeaponBonus < 0 ? `${attackWeaponBonus}` : ''
  }`;
  const attackTargetWarning = validAttackTarget
    ? validAttackTarget.guardianShieldActive
      ? ' · 🛡️ Khiên 0 ST!'
      : validAttackTarget.revealedRoleId === 'suong-gac-cong'
        ? ' · 🥊 Phản kích!'
        : ''
    : '';

  const mustResolveCardFirst = hasAnyHandCard;
  const mustAttackMasamune =
    hasMasamune && attacksThisTurn === 0 && attackableTargets.length > 0;
  const canEndTurn = !mustResolveCardFirst && !mustAttackMasamune;

  const allowedMoveList = publicGame.allowedMoveDestinations
    ? LOCATIONS_CATALOG.filter(
        (l) => l.id !== selfPlayer.location && publicGame.allowedMoveDestinations!.includes(l.id),
      )
    : LOCATIONS_CATALOG.filter((l) => l.id !== selfPlayer.location);
  const isCompassChoice = Boolean(
    publicGame.allowedMoveDestinations && publicGame.allowedMoveDestinations.length < 5,
  );

  const chosenStealEquipId =
    validStealTarget && validStealTarget.equipped.some((e) => e.id === stealEquipId)
      ? stealEquipId
      : validStealTarget?.equipped[0]?.id ?? '';
  const chosenBananaEquipId = selfPlayer.equipped.some((e) => e.id === bananaEquipId)
    ? bananaEquipId
    : selfPlayer.equipped[0]?.id ?? '';

  const renderTargetSelector = (title: string) => (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
          {title}
        </p>
        {selectedIsSelf ? (
          <span className="text-[11px] font-semibold text-emerald-300">
            💚 Đang chọn Bản thân — các thẻ chỉ định mọi người sẽ nhắm vào bạn
          </span>
        ) : (
          selectedIsOutOfRange &&
          validOtherTarget && (
            <span className="text-[11px] font-semibold text-sky-300">
              {validOtherTarget.displayName} ngoài tầm đánh ({hasHandgun ? 'đứng cùng Cụm' : 'đứng khác Cụm'})
            </span>
          )
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          data-testid="bg-target-pill-self"
          aria-pressed={selectedIsSelf}
          onClick={() => {
            onSelectTarget(selfPlayer.playerId);
            setHealTargetId(selfPlayer.playerId);
          }}
          className={`px-2.5 py-1.5 min-h-[36px] min-w-[44px] rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
            selectedIsSelf
              ? 'bg-emerald-600/85 border-emerald-300 text-white'
              : 'bg-slate-800 border-emerald-500/40 text-emerald-200 hover:bg-slate-700'
          }`}
        >
          <span>💚 Bản thân ({selfPlayer.woundsTaken} vết)</span>
        </button>
        {aliveOthers.map((p) => {
          const inRange = attackableTargets.some((t) => t.playerId === p.playerId);
          const selected = !selectedIsSelf && validOtherTarget?.playerId === p.playerId;
          return (
            <button
              key={p.playerId}
              type="button"
              data-testid={`bg-target-pill-other-${p.seatIndex}`}
              aria-pressed={selected}
              onClick={() => onSelectTarget(p.playerId)}
              className={`px-2.5 py-1.5 min-h-[36px] min-w-[44px] rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                selected
                  ? inRange
                    ? 'bg-rose-600/85 border-rose-300 text-white'
                    : 'bg-sky-700/80 border-sky-300 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <span>{p.displayName}</span>
              {inRange ? (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-black/30 text-amber-200">
                  🎯 Tầm đánh
                </span>
              ) : selected ? (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-black/30 text-sky-100">
                  🃏 Dùng thẻ
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderHandCardsSection = () => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
          🃏 Thẻ vừa rút cần giải quyết ({privateView.hand.length}/{BOARD_GAME_MAX_HAND}):
        </p>
        {hasAnyHandCard && (
          <button
            type="button"
            onClick={onToggleHandMask}
            className="px-2.5 py-1 min-h-[32px] rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
          >
            {handMaskLocked ? '👁️ Hiện thẻ vừa rút' : '🙈 Che thẻ'}
          </button>
        )}
      </div>

      {!hasAnyHandCard ? (
        <p className="text-xs text-slate-400">
          Không còn thẻ chờ giải quyết — Trang bị rút được tự động đeo ngay lên bàn.
        </p>
      ) : handMaskLocked ? (
        <div
          data-testid="bg-hand-masked-banner"
          className="rounded-xl border border-dashed border-amber-400/45 bg-slate-950/85 px-3 py-2 flex flex-wrap items-center justify-between gap-2.5"
        >
          <p className="text-xs sm:text-sm font-semibold text-amber-100">
            🙈 Thẻ vừa rút đang được che để chống nhìn màn hình ({privateView.hand.length} lá).
          </p>
          <button
            type="button"
            data-testid="bg-unmask-hand-btn"
            onClick={onToggleHandMask}
            className="px-3.5 py-1.5 min-h-[36px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-black cursor-pointer"
          >
            👁️ Mở xem bài của tôi
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {privateView.hand.map((card, idx) => {
            const isInv = card.deck === 'investigation';
            const isGear = !isInv && !card.isConsumable;
            const isFirstAid = card.id === 'eq-09';
            const isBlessing = card.id === 'eq-08';
            const isMoodyGoblin = card.id === 'ev-11';
            const isBananaPeel = card.id === 'ev-12';
            const isOptionalRevealCard =
              card.id === 'eq-13' || card.id === 'eq-14' || card.id === 'ev-13';
            const isOtherSinglePlayer =
              !isInv &&
              !isGear &&
              !isFirstAid &&
              !isMoodyGoblin &&
              !isBananaPeel &&
              card.targetMode === 'single-player';

            const disabled =
              (isInv && !validOtherTarget) ||
              (isOtherSinglePlayer && !validOtherTarget) ||
              (isBlessing && !validOtherTarget);

            return (
              <div
                key={`${card.id}-${idx}`}
                className={`rounded-xl border p-2.5 flex flex-col justify-between gap-2 ${
                  isInv
                    ? 'border-emerald-500/45 bg-emerald-950/35'
                    : card.deck === 'equipment'
                      ? 'border-sky-500/45 bg-sky-950/35'
                      : 'border-rose-500/45 bg-rose-950/35'
                }`}
              >
                <div>
                  <p className="text-xs sm:text-sm font-black text-white">{card.title}</p>
                  <p className="text-xs text-slate-200 mt-0.5 leading-snug" title={card.summary}>
                    {card.summary}
                  </p>
                </div>

                {isFirstAid && (
                  <select
                    data-testid={`bg-heal-select-${card.id}`}
                    value={validHealCardTarget.playerId}
                    onChange={(e) => setHealTargetId(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-emerald-500/50 px-2 py-1 text-xs font-bold text-emerald-100"
                    aria-label="Chọn người đặt mốc 7 thương tích"
                  >
                    <option value={selfPlayer.playerId}>
                      💚 Bản thân: {selfPlayer.displayName} ({selfPlayer.woundsTaken} vết)
                    </option>
                    {aliveOthers.map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        🩺 {p.displayName} ({p.woundsTaken} vết)
                      </option>
                    ))}
                  </select>
                )}

                {isMoodyGoblin && validStealTarget && validStealTarget.equipped.length > 0 && (
                  <select
                    data-testid="bg-steal-equip-select"
                    value={chosenStealEquipId}
                    onChange={(e) => setStealEquipId(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-sky-500/50 px-2 py-1 text-xs font-bold text-sky-100"
                    aria-label="Chọn món Trang bị muốn cướp"
                  >
                    {validStealTarget.equipped.map((eq, i) => (
                      <option key={`${eq.id}-${i}`} value={eq.id}>
                        🧤 Lấy "{eq.title}" từ {validStealTarget.displayName}
                      </option>
                    ))}
                  </select>
                )}

                {isBananaPeel && selfPlayer.equipped.length > 0 && (
                  <select
                    data-testid="bg-banana-equip-select"
                    value={chosenBananaEquipId}
                    onChange={(e) => setBananaEquipId(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-amber-500/50 px-2 py-1 text-xs font-bold text-amber-100"
                    aria-label="Chọn Trang bị để giao"
                  >
                    {selfPlayer.equipped.map((eq, i) => (
                      <option key={`${eq.id}-${i}`} value={eq.id}>
                        🍌 Giao "{eq.title}" → {validOtherTarget?.displayName ?? '?'}
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    data-testid={`bg-use-card-${card.id}`}
                    disabled={disabled}
                    onClick={() => {
                      if (isInv && validOtherTarget) {
                        onAction({
                          type: 'INVESTIGATE_CARD',
                          cardId: card.id,
                          targetPlayerId: validOtherTarget.playerId,
                        });
                      } else if (isGear) {
                        onAction({ type: 'EQUIP_CARD', cardId: card.id });
                      } else if (isFirstAid) {
                        onAction({
                          type: 'USE_CARD',
                          cardId: card.id,
                          targetPlayerId: validHealCardTarget.playerId,
                        });
                      } else if (isMoodyGoblin) {
                        onAction({
                          type: 'USE_CARD',
                          cardId: card.id,
                          ...(validStealTarget
                            ? {
                                targetPlayerId: validStealTarget.playerId,
                                ...(chosenStealEquipId ? { equipCardId: chosenStealEquipId } : {}),
                              }
                            : {}),
                        });
                      } else if (isBananaPeel) {
                        onAction({
                          type: 'USE_CARD',
                          cardId: card.id,
                          ...(validOtherTarget ? { targetPlayerId: validOtherTarget.playerId } : {}),
                          ...(chosenBananaEquipId ? { equipCardId: chosenBananaEquipId } : {}),
                        });
                      } else if (isOtherSinglePlayer && validOtherTarget) {
                        onAction({
                          type: 'USE_CARD',
                          cardId: card.id,
                          targetPlayerId: validOtherTarget.playerId,
                        });
                      } else {
                        onAction({ type: 'USE_CARD', cardId: card.id });
                      }
                    }}
                    className="w-full px-3 py-1.5 min-h-[36px] rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-45 border border-white/15 text-xs font-black text-white transition cursor-pointer"
                  >
                    {isInv
                      ? `🔍 Đưa kín → ${validOtherTarget?.displayName ?? '?'}`
                      : isGear
                        ? '🎒 Trang bị ngay'
                        : isFirstAid
                          ? `🩺 Mốc 7 → ${
                              validHealCardTarget.playerId === selfPlayer.playerId
                                ? `${selfPlayer.displayName} (Bạn)`
                                : validHealCardTarget.displayName
                            }`
                          : isMoodyGoblin
                            ? validStealTarget
                              ? `👺 Cướp đồ từ ${validStealTarget.displayName}`
                              : '👺 Bỏ qua (Chưa ai có đồ)'
                            : isBananaPeel
                              ? selfPlayer.equipped.length === 0
                                ? '🍌 Không có đồ → Tự nhận 1 ST'
                                : `🍌 Giao đồ → ${validOtherTarget?.displayName ?? '?'}`
                              : isOtherSinglePlayer
                                ? `⚡ Kích hoạt → ${validOtherTarget?.displayName ?? '?'}`
                                : '⚡ Kích hoạt ngay'}
                  </button>

                  {isOptionalRevealCard && (
                    <button
                      type="button"
                      data-testid={`bg-skip-card-${card.id}`}
                      onClick={() =>
                        onAction({ type: 'USE_CARD', cardId: card.id, skipEffect: true })
                      }
                      className="w-full px-3 py-1 min-h-[32px] rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-300 transition cursor-pointer"
                    >
                      🙈 Không kích hoạt (Giữ kín vai / Hủy thẻ)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <section
      data-testid="bg-action-panel"
      className="rounded-2xl border border-amber-400/50 bg-slate-900/95 px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-[0_-6px_28px_rgba(15,23,42,0.75)] space-y-2.5"
    >
      {/* Thanh trạng thái lượt của tôi */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs font-black">
            🎯 LƯỢT CỦA BẠN
          </span>
          <span className="text-xs sm:text-sm font-bold text-slate-100">
            Đang đứng tại:{' '}
            <span className="text-cyan-300">
              Ô {currentLoc.diceLabel} · {currentLoc.name}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!privateView.revealed &&
            (privateView.roleId === 'lang-tien-phong' ? (
              <span className="px-2.5 py-1 rounded-xl bg-teal-950/60 border border-teal-500/40 text-teal-200 text-[11px] font-bold">
                🗣️ Tự lộ khi có người ngã
              </span>
            ) : confirmingReveal ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  data-testid="bg-confirm-reveal-btn"
                  onClick={() => {
                    setConfirmingReveal(false);
                    onAction({ type: 'REVEAL_ROLE' });
                  }}
                  className="px-3.5 py-1.5 min-h-[36px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-black transition cursor-pointer"
                >
                  ✅ Xác nhận Lật Vai Công Khai
                </button>
                <button
                  type="button"
                  data-testid="bg-cancel-reveal-btn"
                  onClick={() => setConfirmingReveal(false)}
                  className="px-3 py-1.5 min-h-[36px] min-w-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs sm:text-sm font-bold transition cursor-pointer"
                >
                  ✕ Hủy
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-testid="bg-reveal-role-btn"
                onClick={() => setConfirmingReveal(true)}
                className="px-3 py-1.5 min-h-[36px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-400/50 text-amber-200 text-xs sm:text-sm font-bold transition cursor-pointer"
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
              className={`px-3 py-1.5 min-h-[36px] rounded-xl disabled:opacity-45 text-white text-xs sm:text-sm font-bold transition cursor-pointer ${
                privateView.roleId === 'lang-cuu-ho'
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-violet-600 hover:bg-violet-500'
              }`}
            >
              {privateView.roleId === 'gac-truc-ban'
                ? `✨ Bước Nhảy Tắt → Ô ${pairedLoc.diceLabel} (${pairedLoc.shortName})`
                : privateView.roleId === 'lang-cuu-ho'
                  ? `🩸 Đòn Đánh Đẫm Máu (-2 HP → Chém bồi ${skillTarget?.displayName ?? '?'})`
                  : `✨ ${roleDesign.skillName}${
                      skillTarget && roleDesign.targetMode !== 'self'
                        ? ` (${skillTarget.displayName})`
                        : ''
                    }`}
            </button>
          )}
        </div>
      </div>

      {/* PHA 1: TUNG XÚC XẮC DI CHUYỂN */}
      {publicGame.turnPhase === 'ROLL_MOVE' && (
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <p className="text-xs sm:text-sm text-slate-200 font-semibold">
              {rerollPrompt
                ? `🎲 Vừa tung trùng ô ${currentLoc.name} (${currentLoc.diceLabel}) — bấm ĐỔ LẠI xúc xắc ngay!`
                : 'Bước 1: Tung đồng thời 1d6 + 1d4 (hoặc bấm thẳng vào Khay Xúc Xắc trên bàn) để di chuyển.'}
            </p>
            <button
              type="button"
              data-testid="bg-roll-dice-btn"
              onClick={() => onAction({ type: 'ROLL_DICE' })}
              className="w-full sm:w-auto shrink-0 px-5 py-2.5 min-h-[42px] rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-sm sm:text-base font-black shadow-lg transition cursor-pointer"
            >
              {rerollPrompt
                ? '🎲 ĐỔ LẠI XÚC XẮC (1d6 + 1d4)'
                : selfPlayer.equipped.some((e) => e.id === 'eq-05')
                  ? '🧭 TUNG XÚC XẮC x2 (LA BÀN)'
                  : '🎲 TUNG XÚC XẮC (1d6 + 1d4)'}
            </button>
          </div>
          {canUseSkillNow &&
            roleDesign.targetMode !== 'self' &&
            renderTargetSelector('Chọn mục tiêu cho Kỹ năng đầu lượt:')}
        </div>
      )}

      {/* PHA 1B: CHỌN KHU VỰC (TỔNG 7 HOẶC LA BÀN ĐỊNH HƯỚNG) */}
      {publicGame.turnPhase === 'CHOOSE_MOVE' && (
        <div className="space-y-2">
          <p className="text-xs sm:text-sm font-bold text-amber-200">
            {isCompassChoice
              ? `🧭 La Bàn Định Hướng! Chọn 1 trong ${allowedMoveList.length} khu vực bên dưới hoặc bấm thẳng lên bàn cờ:`
              : '✨ Tổng xúc xắc bằng 7! Chọn khu vực bên dưới hoặc bấm thẳng lên bàn cờ để di chuyển tới:'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {allowedMoveList.map((loc) => (
              <button
                key={loc.id}
                type="button"
                data-testid={`bg-choose-dest-${loc.id}`}
                onClick={() => onAction({ type: 'CHOOSE_DEST', location: loc.id })}
                className="flex items-center justify-between gap-2 px-3 py-2 min-h-[42px] rounded-xl border border-amber-400/50 bg-amber-950/40 hover:bg-amber-900/55 text-left transition cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-black text-white truncate">
                    Ô {loc.diceLabel} · {loc.name}
                  </p>
                  <p className="text-[11px] text-amber-100/90 truncate">{loc.subtitle}</p>
                </div>
                <span className="text-xs font-black text-amber-300 shrink-0">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PHA 2: HÀNH ĐỘNG KHU VỰC */}
      {publicGame.turnPhase === 'LOCATION_ACTION' && (
        <div className="space-y-2">
          <p className="text-xs sm:text-sm font-bold text-cyan-200">
            Bước 2 — Quyền năng {currentLoc.name} (Ô {currentLoc.diceLabel}):{' '}
            <span className="font-normal text-slate-200">{currentLoc.actionSummary}</span>
          </p>

          {currentLoc.deckHint === 'power-9' && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {alivePlayers.map((p) => {
                  const selected = validAnyTarget.playerId === p.playerId;
                  return (
                    <button
                      key={p.playerId}
                      type="button"
                      onClick={() => onSelectTarget(p.playerId)}
                      className={`px-2.5 py-1.5 min-h-[36px] rounded-xl border text-xs font-bold transition cursor-pointer ${
                        selected
                          ? 'bg-violet-600 border-violet-300 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {p.playerId === selfPlayer.playerId
                        ? `💚 ${p.displayName} (Bạn)`
                        : p.displayName}{' '}
                      ({p.woundsTaken} vết)
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {currentLoc.deckHint === 'power-10' && equippedTargets.length === 0 && (
            <p className="text-xs sm:text-sm text-amber-200">
              Hiện chưa có ai đeo Trang bị trên bàn — bạn có thể Bỏ qua khu vực để sang pha đánh/kết thúc.
            </p>
          )}

          {currentLoc.deckHint === 'power-10' && equippedTargets.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                {equippedTargets.map((p) => {
                  const selected = validStealTarget?.playerId === p.playerId;
                  return (
                    <button
                      key={p.playerId}
                      type="button"
                      onClick={() => onSelectTarget(p.playerId)}
                      className={`px-2.5 py-1.5 min-h-[36px] rounded-xl border text-xs font-bold transition cursor-pointer ${
                        selected
                          ? 'bg-sky-600 border-sky-300 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {p.displayName} ({p.equipped.length} đồ)
                    </button>
                  );
                })}
              </div>
              {validStealTarget && validStealTarget.equipped.length > 1 && (
                <select
                  data-testid="bg-loc-steal-select"
                  value={chosenStealEquipId}
                  onChange={(e) => setStealEquipId(e.target.value)}
                  className="rounded-lg bg-slate-950 border border-sky-500/50 px-2.5 py-1 text-xs font-bold text-sky-100"
                  aria-label="Chọn Trang bị muốn cướp tại Sân Bóng"
                >
                  {validStealTarget.equipped.map((eq, i) => (
                    <option key={`${eq.id}-${i}`} value={eq.id}>
                      🧤 Cướp "{eq.title}"
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {(currentLoc.deckHint === 'investigation' || currentLoc.deckHint === 'any') && (
              <button
                type="button"
                data-testid="bg-draw-investigation-btn"
                onClick={() => onAction({ type: 'DRAW_CARD', deck: 'investigation' })}
                className="px-4 py-2 min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black transition cursor-pointer"
              >
                🔍 Rút 1 Thẻ Khám Phá ({publicGame.deckCounts.investigation})
              </button>
            )}
            {(currentLoc.deckHint === 'equipment' || currentLoc.deckHint === 'any') && (
              <button
                type="button"
                data-testid="bg-draw-equipment-btn"
                onClick={() => onAction({ type: 'DRAW_CARD', deck: 'equipment' })}
                className="px-4 py-2 min-h-[40px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-black transition cursor-pointer"
              >
                🛡️ Rút 1 Thẻ Cung Ứng ({publicGame.deckCounts.equipment})
              </button>
            )}
            {(currentLoc.deckHint === 'event' || currentLoc.deckHint === 'any') && (
              <button
                type="button"
                data-testid="bg-draw-event-btn"
                onClick={() => onAction({ type: 'DRAW_CARD', deck: 'event' })}
                className="px-4 py-2 min-h-[40px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-black transition cursor-pointer"
              >
                ⚡ Rút 1 Thẻ Đột Kích ({publicGame.deckCounts.event})
              </button>
            )}
            {currentLoc.deckHint === 'power-9' && (
              <>
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
                  className="px-3.5 py-2 min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black transition cursor-pointer"
                >
                  💚 Hồi 1 cho {validAnyTarget.displayName}
                </button>
                <button
                  type="button"
                  data-testid="bg-loc-damage-btn"
                  disabled={!validOtherTarget}
                  onClick={() => {
                    if (validOtherTarget) {
                      onAction({
                        type: 'USE_LOC_POWER',
                        targetPlayerId: validOtherTarget.playerId,
                        mode: 'damage',
                      });
                    }
                  }}
                  className="px-3.5 py-2 min-h-[40px] rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs sm:text-sm font-black transition cursor-pointer"
                >
                  💥 Gây 2 dmg lên {validOtherTarget?.displayName ?? '?'}
                </button>
              </>
            )}
            {currentLoc.deckHint === 'power-10' && validStealTarget && (
              <button
                type="button"
                data-testid="bg-loc-steal-btn"
                onClick={() =>
                  onAction({
                    type: 'USE_LOC_POWER',
                    targetPlayerId: validStealTarget.playerId,
                    mode: 'steal',
                    ...(chosenStealEquipId ? { equipCardId: chosenStealEquipId } : {}),
                  })
                }
                className="px-3.5 py-2 min-h-[40px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-black transition cursor-pointer"
              >
                🧤 Cướp 1 Trang bị của {validStealTarget.displayName}
              </button>
            )}
            <button
              type="button"
              data-testid="bg-skip-loc-btn"
              onClick={() => onAction({ type: 'SKIP_LOC' })}
              className="px-3.5 py-2 min-h-[38px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs sm:text-sm font-bold transition cursor-pointer sm:ml-auto"
            >
              ⏭️ Bỏ qua khu vực → Pha Hành Động
            </button>
          </div>

          {currentLoc.deckHint !== 'power-9' &&
            ((hasAnyHandCard && !handMaskLocked) ||
              (canUseSkillNow && roleDesign.targetMode !== 'self')) &&
            renderTargetSelector('Chọn mục tiêu cho Kỹ năng / Thẻ:')}

          {hasAnyHandCard && renderHandCardsSection()}
        </div>
      )}

      {/* PHA 3: GIẢI QUYẾT THẺ VỪA RÚT / TẤN CÔNG / KẾT THÚC LƯỢT */}
      {publicGame.turnPhase === 'MAIN_ACTION' && (
        <div className="space-y-2.5">
          {renderTargetSelector('Chọn mục tiêu hành động / tấn công:')}

          {renderHandCardsSection()}

          {/* Hàng nút chính cuối pha: Tấn công hoặc Kết thúc lượt */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1.5 border-t border-slate-800/80">
            <button
              type="button"
              data-testid="bg-attack-btn"
              disabled={!validAttackTarget || mustResolveCardFirst || attacksThisTurn >= 1}
              onClick={() => {
                if (validAttackTarget) {
                  onAction({ type: 'ATTACK', targetPlayerId: validAttackTarget.playerId });
                }
              }}
              className="px-4 py-2 min-h-[40px] rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs sm:text-sm font-black shadow transition cursor-pointer"
            >
              {attacksThisTurn >= 1
                ? '⚔️ Đã tấn công trong lượt'
                : validAttackTarget
                  ? `${hasMachineGun ? `🔫 Xả đạn ${attackableTargets.length} người` : `⚔️ Tấn công ${validAttackTarget.displayName}`} (${attackDiceFormula}${attackTargetWarning})`
                  : hasHandgun
                    ? '🔫 Chưa có mục tiêu ở Cụm khác'
                    : '⚔️ Chưa có mục tiêu cùng Cụm'}
            </button>

            <button
              type="button"
              data-testid="bg-end-turn-btn"
              disabled={!canEndTurn}
              onClick={() => onAction({ type: 'END_TURN' })}
              className="px-4 py-2 min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-45 text-white text-xs sm:text-sm font-black shadow transition cursor-pointer"
            >
              {mustResolveCardFirst
                ? '🃏 Hãy dùng hết thẻ vừa rút'
                : mustAttackMasamune
                  ? '⚔️ Bắt buộc đánh (Masamune)'
                  : '✔️ Kết thúc lượt'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default ActionPanel;
