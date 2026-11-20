'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/ActionPanel.tsx — Contextual Action-First UI (Phase 3)
// - Chỉ 1 Primary CTA rõ ràng mỗi pha, bỏ nút trùng lặp với Khay Xúc Xắc
// - Hướng dẫn ngắn theo ngữ cảnh & lý do cụ thể khi hành động bị khóa
// - Nhóm Lật vai & Kỹ năng vào menu phụ có thể mở rộng (bg-secondary-actions-menu)
// - Hiển thị thanh thông tin chiến thuật khi chọn người chơi hoặc địa điểm
// ---------------------------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FACTION_LABELS, getRoleDesign } from '@/features/boardgame/domain/roles';
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
  BoardGameLocationId,
  BoardGamePrivateGameView,
  BoardGamePublicGameView,
} from '@/shared/contracts/boardgame';
import { MIDNIGHT_CARD_ART, type ActionCardZone } from './midnight-noir-tokens';
import { playCardPlay } from './sound';
import { resolveActionTargets } from './target-selection';

const LOCATION_ROLL_PROB_LABEL: Record<BoardGameLocationId, string> = {
  radio: '3/24',
  breaker: '7/24',
  lobby: '4/24',
  canteen: '3/24',
  corridor: '2/24',
  court: '1/24',
};

const ANY_DECK_OPTIONS = [
  { id: 'investigation', label: 'Khám Phá', short: 'Xanh', activeCls: 'border-emerald-400 bg-emerald-950/80 text-emerald-100', ctaCls: 'from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950', icon: '🔍' },
  { id: 'equipment', label: 'Cung Ứng', short: 'Trắng', activeCls: 'border-sky-400 bg-sky-950/80 text-sky-100', ctaCls: 'from-sky-400 to-cyan-300 hover:from-sky-300 hover:to-cyan-200 text-slate-950', icon: '🛡️' },
  { id: 'event', label: 'Đột Kích', short: 'Đen', activeCls: 'border-rose-400 bg-rose-950/80 text-rose-100', ctaCls: 'from-rose-500 to-amber-400 hover:from-rose-400 hover:to-amber-300 text-slate-950', icon: '⚡' },
] as const;

export interface ActionPanelProps {
  publicGame: BoardGamePublicGameView;
  privateView: BoardGamePrivateGameView | null;
  selfPlayerId: string | null;
  isSpectator: boolean;
  selectedTargetId: string | null;
  selectedLocationId?: BoardGameLocationId | null;
  onSelectTarget: (playerId: string | null) => void;
  onSelectLocation?: (locId: BoardGameLocationId | null) => void;
  onClearContext?: () => void;
  onAction: (action: BoardGameActionPayload) => void;
  onZoomCard?: (cardId: string, zone: ActionCardZone) => void;
}

export function ActionPanel({
  publicGame,
  privateView,
  selfPlayerId,
  isSpectator,
  selectedTargetId,
  selectedLocationId = null,
  onSelectTarget,
  onSelectLocation,
  onClearContext,
  onAction,
  onZoomCard,
}: ActionPanelProps) {
  const [confirmingReveal, setConfirmingReveal] = useState(false);
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [healTargetId, setHealTargetId] = useState<string | null>(null);
  const [stealEquipId, setStealEquipId] = useState<string>('');
  const [bananaEquipId, setBananaEquipId] = useState<string>('');
  const [selectedAnyDeck, setSelectedAnyDeck] = useState<'investigation' | 'equipment' | 'event'>('investigation');
  const secondaryWrapRef = useRef<HTMLDivElement>(null);

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
    setSecondaryOpen(false);
    setSelectedAnyDeck('investigation');
  }, [publicGame.turnNumber]);

  useEffect(() => {
    setConfirmingReveal(false);
  }, [publicGame.turnNumber, publicGame.turnPhase]);

  useEffect(() => {
    if (selfPlayerId && selectedTargetId === selfPlayerId) {
      setHealTargetId(selfPlayerId);
    }
  }, [selectedTargetId, selfPlayerId]);

  useEffect(() => {
    if (!secondaryOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (secondaryWrapRef.current && !secondaryWrapRef.current.contains(e.target as Node)) {
        setSecondaryOpen(false);
        setConfirmingReveal(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSecondaryOpen(false);
        setConfirmingReveal(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [secondaryOpen]);

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

  const clearContext = () => {
    if (onClearContext) {
      onClearContext();
    } else {
      onSelectTarget(null);
      onSelectLocation?.(null);
    }
  };

  // Thanh thông tin chiến thuật ngữ cảnh khi người chơi / khán giả chọn Địa điểm hoặc Người chơi
  const renderTacticalContextBar = () => {
    const selectedPlayer = selectedTargetId
      ? publicGame.players.find((p) => p.playerId === selectedTargetId) ?? null
      : null;

    if (selectedPlayer) {
      const pLoc = getLocationDefinition(selectedPlayer.location);
      const isSelfCtx = selectedPlayer.playerId === selfPlayerId;
      const inRangeCtx = Boolean(
        selfPlayer &&
          selfPlayer.alive &&
          !isSelfCtx &&
          selectedPlayer.alive &&
          attackableTargets.some((t) => t.playerId === selectedPlayer.playerId),
      );
      const selfHasHandgun = Boolean(
        selfPlayer?.equipped.some((eq) => eq.id === 'ev-05'),
      );
      const rangeBadge = !selectedPlayer.alive
        ? '💀 Đã bị loại'
        : isSelfCtx
          ? '📍 Vị trí của bạn'
          : !selfPlayer
            ? `🔗 Cặp Ô ${getLocationDefinition(getPairedLocationInCluster(selectedPlayer.location, clusterPairs)).diceLabel}`
            : inRangeCtx
              ? '⚔️ Trong tầm đánh'
              : `🛡️ Ngoài tầm (${selfHasHandgun ? 'cùng Cụm' : 'khác Cụm'})`;

      const publicRoleText = selectedPlayer.revealedRoleId
        ? `🎭 ${getRoleDesign(selectedPlayer.revealedRoleId).name} (${FACTION_LABELS[selectedPlayer.revealedFaction!]}) · Ngưỡng ${selectedPlayer.revealedMaxHp}`
        : '❓ Vai ẩn';

      const gearNames = selectedPlayer.equipped.map((e) => e.title);

      return (
        <div
          data-testid="bg-tactical-context-bar"
          data-context-kind="player"
          data-context-id={selectedPlayer.playerId}
          className="flex items-center justify-between gap-2 rounded-xl border border-cyan-500/40 bg-slate-950/90 px-2.5 py-1 text-xs"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
            <span className="font-black text-white whitespace-nowrap">
              👤 {selectedPlayer.displayName}
              {isSelfCtx ? ' (Bạn)' : ''}
            </span>
            <span className="font-bold text-cyan-200 whitespace-nowrap">
              Ô {pLoc.diceLabel} · {pLoc.shortName}
            </span>
            <span
              className={`font-bold whitespace-nowrap ${
                inRangeCtx
                  ? 'text-rose-300'
                  : isSelfCtx
                    ? 'text-emerald-300'
                    : 'text-slate-300'
              }`}
            >
              {rangeBadge}
            </span>
            <span className="font-semibold text-amber-200 whitespace-nowrap">
              🩸 {selectedPlayer.woundsTaken} vết · {publicRoleText}
            </span>
            {selectedPlayer.guardianShieldActive && (
              <span className="font-bold text-emerald-300 whitespace-nowrap">
                🛡️ Khiên 0 ST
              </span>
            )}
            {selectedPlayer.revealedRoleId === 'suong-gac-cong' && !isSelfCtx && (
              <span className="font-bold text-amber-300 whitespace-nowrap">
                🥊 Phản kích
              </span>
            )}
            {gearNames.length > 0 && (
              <span className="font-semibold text-sky-200 truncate max-w-[260px]">
                🎒 {gearNames.slice(0, 2).join(', ')}
                {gearNames.length > 2 ? ` +${gearNames.length - 2}` : ''}
              </span>
            )}
          </div>
          <button
            type="button"
            data-testid="bg-clear-context-btn"
            aria-label="Đóng thông tin chiến thuật"
            onClick={clearContext}
            className="shrink-0 px-2 py-0.5 min-h-[32px] min-w-[36px] rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            ✕
          </button>
        </div>
      );
    }

    if (selectedLocationId) {
      const loc = getLocationDefinition(selectedLocationId);
      const paired = getLocationDefinition(
        getPairedLocationInCluster(selectedLocationId, clusterPairs),
      );
      const occupants = publicGame.players.filter((p) => p.location === selectedLocationId);
      const deckBadge =
        loc.deckHint === 'investigation'
          ? ` (${publicGame.deckCounts.investigation} lá)`
          : loc.deckHint === 'equipment'
            ? ` (${publicGame.deckCounts.equipment} lá)`
            : loc.deckHint === 'event'
              ? ` (${publicGame.deckCounts.event} lá)`
              : '';
      const sameClusterAsSelf = selfPlayer
        ? areInSameCluster(selfPlayer.location, selectedLocationId, clusterPairs)
        : null;

      return (
        <div
          data-testid="bg-tactical-context-bar"
          data-context-kind="location"
          data-context-id={selectedLocationId}
          className="flex items-center justify-between gap-2 rounded-xl border border-indigo-400/45 bg-slate-950/90 px-2.5 py-1 text-xs"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
            <span className="font-black text-white whitespace-nowrap">
              📍 Ô {loc.diceLabel} · {loc.name}
            </span>
            <span className="font-bold text-amber-200 whitespace-nowrap">
              🎲 Xác suất {LOCATION_ROLL_PROB_LABEL[selectedLocationId]}
            </span>
            <span className="font-semibold text-cyan-200 whitespace-nowrap">
              ⚡ {loc.subtitle}
              {deckBadge}
            </span>
            <span className="font-semibold text-slate-300 whitespace-nowrap">
              🔗 Cặp Ô {paired.diceLabel}
              {sameClusterAsSelf !== null
                ? sameClusterAsSelf
                  ? ' · 🎯 Cùng Cụm'
                  : ' · ↔️ Khác Cụm'
                : ''}
            </span>
            <span className="font-semibold text-slate-200 truncate max-w-[260px]">
              👥{' '}
              {occupants.length > 0
                ? `${occupants.length} người (${occupants
                    .map((o) => o.displayName)
                    .slice(0, 3)
                    .join(', ')}${occupants.length > 3 ? '…' : ''})`
                : 'Trống'}
            </span>
          </div>
          <button
            type="button"
            data-testid="bg-clear-context-btn"
            aria-label="Đóng thông tin chiến thuật"
            onClick={clearContext}
            className="shrink-0 px-2 py-0.5 min-h-[32px] min-w-[36px] rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            ✕
          </button>
        </div>
      );
    }

    return null;
  };

  if (isSpectator || !selfPlayer || !privateView) {
    const contextBar = renderTacticalContextBar();
    return (
      <section
        data-testid="bg-action-spectator-banner"
        className="rounded-2xl border border-slate-700/80 bg-slate-900/95 px-3.5 py-2 text-sm font-semibold text-slate-200 space-y-1.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>👀 Bạn đang theo dõi bàn đấu ở chế độ khán giả. Bấm vào ô hoặc quân cờ để soi thông tin.</span>
          <span className="text-xs text-cyan-300 font-bold">
            Vòng {publicGame.round} · Lượt #{publicGame.turnNumber}
          </span>
        </div>
        {contextBar}
      </section>
    );
  }

  if (!selfPlayer.alive) {
    const contextBar = renderTacticalContextBar();
    return (
      <section
        data-testid="bg-eliminated-banner"
        className="rounded-2xl border border-rose-500/40 bg-rose-950/35 px-3.5 py-2 space-y-1.5"
      >
        <p className="text-sm font-bold text-rose-200">
          💀 Bạn đã bị loại khỏi ván này. Có thể tiếp tục theo dõi bàn đấu cho tới khi kết thúc!
        </p>
        {contextBar}
      </section>
    );
  }

  const privatePendingChoice = privateView.pendingChoice ?? null;
  const publicPendingChoice = publicGame.pendingChoice ?? null;

  // Khi chính người chơi này đang sở hữu Pending Choice (trong lượt HOẶC phản ứng bí mật ngoài lượt như Wendigo/Undying):
  if (privatePendingChoice) {
    const contextBar = renderTacticalContextBar();
    return (
      <section
        data-testid="bg-pending-choice-panel"
        data-choice-kind={privatePendingChoice.kind}
        className="rounded-2xl border-2 border-amber-400/75 bg-slate-900/95 px-3.5 py-2.5 shadow-[0_0_28px_rgba(251,191,36,0.22)] space-y-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-300/60 text-amber-200 text-xs font-black">
              {privatePendingChoice.isSecret ? '🔮 PHẢN ỨNG BÍ MẬT' : '⚡ LỰA CHỌN KỸ NĂNG'}
            </span>
            <p className="text-xs sm:text-sm font-black text-white truncate">
              {privatePendingChoice.title}
            </p>
          </div>
          <span className="text-[11px] font-bold text-amber-200 bg-amber-950/60 border border-amber-400/40 px-2 py-0.5 rounded-lg">
            ⏱️ Có thời hạn tự chọn mặc định
          </span>
        </div>
        <p className="text-xs text-slate-200 leading-snug">{privatePendingChoice.description}</p>
        <div className="flex flex-wrap items-stretch gap-2">
          {privatePendingChoice.options.map((opt, idx) => (
            <button
              key={opt.optionId}
              type="button"
              data-testid={`bg-choice-opt-${opt.optionId}`}
              data-primary-cta={idx === 0 ? 'true' : undefined}
              onClick={() =>
                onAction({
                  type: 'RESOLVE_CHOICE',
                  choiceId: privatePendingChoice.choiceId,
                  optionId: opt.optionId,
                })
              }
              className={`flex-1 min-w-[160px] rounded-xl border px-3 py-2 text-left transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                idx === 0
                  ? 'border-amber-300/80 bg-gradient-to-r from-amber-500/25 to-emerald-500/20 hover:from-amber-500/35 hover:to-emerald-500/30 text-white'
                  : 'border-slate-600 bg-slate-800/90 hover:bg-slate-700 text-slate-100'
              }`}
            >
              <span className="block text-xs font-black">{opt.label}</span>
              {opt.detail && (
                <span className="mt-0.5 block text-[11px] text-slate-300">{opt.detail}</span>
              )}
            </button>
          ))}
        </div>
        {contextBar}
      </section>
    );
  }

  // Khi bàn đang chờ 1 Pending Choice của người khác (KHÔNG lộ danh tính nếu isSecret === true):
  if (publicPendingChoice) {
    const contextBar = renderTacticalContextBar();
    return (
      <section
        data-testid="bg-waiting-choice-banner"
        className="rounded-2xl border border-amber-500/45 bg-slate-900/95 px-3.5 py-2 space-y-1.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs sm:text-sm font-bold text-amber-100">
            {publicPendingChoice.promptLabel}
          </p>
          <span className="text-xs font-semibold text-amber-200 bg-amber-500/15 border border-amber-400/35 px-2.5 py-0.5 rounded-xl">
            ⏳ Tự động tiếp tục khi hết giờ
          </span>
        </div>
        {contextBar}
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
    const contextBar = renderTacticalContextBar();
    return (
      <section
        data-testid="bg-waiting-turn-banner"
        className="rounded-2xl border border-slate-700/80 bg-slate-900/95 px-3 py-2 space-y-1.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs sm:text-sm font-bold text-slate-100">
            ⏳ Đang chờ lượt của{' '}
            <span className="text-amber-300">
              {activePlayer?.displayName ?? 'người chơi khác'}
            </span>
          </p>
          <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-400/35 px-2.5 py-0.5 rounded-xl">
            ∞ Tự do · Tự động tới lượt bạn ngay khi xong
          </span>
        </div>
        {contextBar}
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

  const charlesFeastTarget = selfPlayer.lastAttackTargetId
    ? attackableTargets.find((p) => p.playerId === selfPlayer.lastAttackTargetId) ?? null
    : null;

  // Điều kiện kích hoạt & lý do khóa cụ thể cho Kỹ năng nhân vật
  const skillLockReason: string | null = (() => {
    if (!privateView.revealed) {
      return 'Cần lật vai công khai trước khi dùng kỹ năng';
    }
    if (roleDesign.targetMode === 'passive') {
      return 'Kỹ năng nội tại — tự động kích hoạt theo điều kiện';
    }
    if (roleDesign.oncePerMatch && privateView.skillUsedOnce) {
      return 'Đã sử dụng (giới hạn 1 lần/trận)';
    }
    if (privateView.skillCooldown > 0) {
      return `Đang hồi chiêu (${privateView.skillCooldown} vòng)`;
    }
    if (privateView.roleId === 'gac-truc-ban' && publicGame.turnPhase !== 'ROLL_MOVE') {
      return 'Chỉ kích hoạt ở Pha 1 trước khi tung xúc xắc';
    }
    if (privateView.roleId === 'lang-cuu-ho') {
      if (publicGame.turnPhase !== 'MAIN_ACTION' || attacksThisTurn < 1) {
        return 'Chỉ dùng ở Pha 3 sau khi đánh thường';
      }
      if (privateView.hp <= 2) {
        return 'Cần còn trên 2 máu để chém bồi';
      }
      if (hasAnyHandCard) {
        return 'Giải quyết thẻ vừa rút trước';
      }
      if (!charlesFeastTarget) {
        return 'Mục tiêu vừa đánh không còn hợp lệ';
      }
    }
    if (
      publicGame.turnPhase !== 'ROLL_MOVE' &&
      publicGame.turnPhase !== 'CHOOSE_MOVE' &&
      publicGame.turnPhase !== 'LOCATION_ACTION' &&
      publicGame.turnPhase !== 'MAIN_ACTION'
    ) {
      return 'Không thể dùng trong pha hiện tại';
    }
    if (roleDesign.targetMode !== 'self' && !validOtherTarget) {
      return 'Chưa có mục tiêu hợp lệ';
    }
    return null;
  })();

  const canUseSkillNow = skillLockReason === null;

  const skillTarget =
    roleDesign.targetMode === 'self'
      ? selfPlayer
      : privateView.roleId === 'lang-cuu-ho'
        ? charlesFeastTarget
        : validOtherTarget;

  const rerollPrompt =
    publicGame.turnPhase === 'ROLL_MOVE' &&
    publicGame.lastDiceRoll?.rerollRequired &&
    publicGame.lastDiceRoll.playerId === selfPlayer.playerId;

  const selectedIsSelf = selectedTargetId === selfPlayer.playerId;
  const explicitlySelectedOther =
    !selectedIsSelf && selectedTargetId
      ? aliveOthers.find((p) => p.playerId === selectedTargetId) ?? null
      : null;
  const selectedIsOutOfRange = Boolean(
    explicitlySelectedOther &&
      !attackableTargets.some((t) => t.playerId === explicitlySelectedOther.playerId),
  );

  const effectiveAttackTarget = selectedIsOutOfRange ? null : validAttackTarget;

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
  const attackTargetWarning = effectiveAttackTarget
    ? effectiveAttackTarget.guardianShieldActive
      ? ' · 🛡️ Khiên 0 ST'
      : effectiveAttackTarget.revealedRoleId === 'suong-gac-cong'
        ? ' · 🥊 Phản kích'
        : ''
    : '';

  const mustResolveCardFirst = hasAnyHandCard;
  const mustAttackMasamune =
    hasMasamune && attacksThisTurn === 0 && attackableTargets.length > 0;
  const canEndTurn = !mustResolveCardFirst && !mustAttackMasamune;

  const attackLockReason: string | null = mustResolveCardFirst
    ? 'Giải quyết thẻ vừa rút trước'
    : attacksThisTurn >= 1
      ? 'Đã tấn công (1 lần/lượt)'
      : selectedIsOutOfRange && explicitlySelectedOther
        ? `${explicitlySelectedOther.displayName} ngoài tầm đánh (${hasHandgun ? 'cùng Cụm' : 'khác Cụm'})`
        : !effectiveAttackTarget
          ? hasHandgun
            ? 'Không có mục tiêu ở Cụm khác'
            : 'Không có mục tiêu cùng Cụm'
          : null;

  const endTurnLockReason: string | null = mustResolveCardFirst
    ? 'Dùng hết thẻ vừa rút trước'
    : mustAttackMasamune
      ? 'Kiếm Masamune bắt buộc tấn công'
      : null;

  const canAttackNow = attackLockReason === null;

  const allowedMoveList = publicGame.allowedMoveDestinations
    ? LOCATIONS_CATALOG.filter(
        (l) => l.id !== selfPlayer.location && publicGame.allowedMoveDestinations!.includes(l.id),
      )
    : LOCATIONS_CATALOG.filter((l) => l.id !== selfPlayer.location);
  const isCompassChoice = Boolean(
    publicGame.allowedMoveDestinations && publicGame.allowedMoveDestinations.length < 5,
  );
  const chosenMoveLoc =
    allowedMoveList.find((l) => l.id === selectedLocationId) ?? allowedMoveList[0] ?? null;

  const chosenStealEquipId =
    validStealTarget && validStealTarget.equipped.some((e) => e.id === stealEquipId)
      ? stealEquipId
      : validStealTarget?.equipped[0]?.id ?? '';
  const chosenBananaEquipId = selfPlayer.equipped.some((e) => e.id === bananaEquipId)
    ? bananaEquipId
    : selfPlayer.equipped[0]?.id ?? '';

  const phaseGuidanceText: string = (() => {
    switch (publicGame.turnPhase) {
      case 'ROLL_MOVE':
        return rerollPrompt
          ? `Vừa trùng Ô ${currentLoc.diceLabel} — tung lại xúc xắc để di chuyển`
          : `Ô ${currentLoc.diceLabel} ${currentLoc.shortName} · Tung 1d6 + 1d4 để di chuyển`;
      case 'CHOOSE_MOVE':
        return isCompassChoice
          ? `La Bàn · Chọn 1 trong ${allowedMoveList.length} khu vực hợp lệ`
          : 'Tổng 7 · Chọn khu vực bất kỳ trên bàn hoặc nút bên dưới';
      case 'LOCATION_ACTION':
        if (hasAnyHandCard) {
          return 'Giải quyết thẻ vừa rút để chuyển sang Pha 3';
        }
        return `Ô ${currentLoc.diceLabel} ${currentLoc.shortName} · ${currentLoc.subtitle}`;
      case 'MAIN_ACTION':
        if (hasAnyHandCard) {
          return `Dùng hoặc trang bị ${privateView.hand.length} thẻ vừa rút`;
        }
        if (mustAttackMasamune && selectedIsOutOfRange) {
          return 'Masamune bắt buộc chọn mục tiêu trong tầm đánh';
        }
        if (canAttackNow && effectiveAttackTarget) {
          return hasMachineGun
            ? `Súng Liên Thanh: bắn ${attackableTargets.length} người trong tầm hoặc kết thúc lượt`
            : `Tầm đánh hợp lệ: ${effectiveAttackTarget.displayName} (hoặc Kết thúc lượt)`;
        }
        return 'Chọn Kết thúc lượt để chuyển lượt';
      default:
        return '';
    }
  })();

  const renderTargetSelector = (title: string) => (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 mr-1">
        {title}
      </span>
      <button
        type="button"
        data-testid="bg-target-pill-self"
        aria-pressed={selectedIsSelf}
        onClick={() => {
          onSelectTarget(selfPlayer.playerId);
          setHealTargetId(selfPlayer.playerId);
        }}
        className={`px-2 py-1 min-h-[34px] min-w-[36px] rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
          selectedIsSelf
            ? 'bg-emerald-600/85 border-emerald-300 text-white'
            : 'bg-slate-800 border-emerald-500/40 text-emerald-200 hover:bg-slate-700'
        }`}
      >
        <span>💚 Bản thân ({selfPlayer.woundsTaken} vết)</span>
      </button>
      {aliveOthers.map((p) => {
        const inRange = attackableTargets.some((t) => t.playerId === p.playerId);
        const selected = !selectedIsSelf && selectedTargetId === p.playerId;
        return (
          <button
            key={p.playerId}
            type="button"
            data-testid={`bg-target-pill-other-${p.seatIndex}`}
            aria-pressed={selected}
            title={inRange ? `${p.displayName} · Trong tầm đánh` : `${p.displayName} · Ngoài tầm đánh`}
            onClick={() => onSelectTarget(p.playerId)}
            className={`px-2 py-1 min-h-[34px] min-w-[36px] rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
              selected
                ? inRange
                  ? 'bg-rose-600/90 border-rose-300 text-white'
                  : 'bg-sky-700/85 border-sky-300 text-white'
                : inRange
                  ? 'bg-slate-800 border-rose-400/45 text-slate-100 hover:bg-slate-700'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {inRange && <span aria-hidden="true">⚔️</span>}
            <span>{p.displayName}</span>
          </button>
        );
      })}
    </div>
  );

  const renderHandCardsSection = (primaryFirstUseBtn = false) => {
    if (!hasAnyHandCard) return null;

    return (
      <div className="space-y-1.5">
        <p className="text-xs font-extrabold text-amber-300">
          🃏 Thẻ vừa rút cần giải quyết ({privateView.hand.length}/{BOARD_GAME_MAX_HAND}):
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
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

            const handArtSrc = MIDNIGHT_CARD_ART[card.id] ?? null;
            const zoomZone: ActionCardZone = isInv ? 'private-investigation' : 'event-resolved';
            const isPrimaryCardCta = primaryFirstUseBtn && idx === 0;

            return (
              <div
                key={`${card.id}-${idx}`}
                className={`group relative overflow-hidden rounded-xl border p-2 flex flex-col justify-between gap-1.5 transition-all duration-150 ${
                  disabled
                    ? ''
                    : 'hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-6px_rgba(251,191,36,0.28)]'
                } ${
                  isInv
                    ? 'border-emerald-500/45 bg-emerald-950/35 hover:border-emerald-300/80'
                    : card.deck === 'equipment'
                      ? 'border-sky-500/45 bg-sky-950/35 hover:border-sky-300/80'
                      : 'border-rose-500/45 bg-rose-950/35 hover:border-rose-300/80'
                }`}
              >
                {!disabled && (
                  <div
                    aria-hidden="true"
                    className="mn-foil-sweep pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-20"
                    style={{
                      backgroundImage:
                        'linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.45) 48%, transparent 72%)',
                    }}
                  />
                )}
                <div className="relative z-10 flex items-start gap-2">
                  {handArtSrc && (
                    <div className="shrink-0 space-y-1">
                      <img
                        src={handArtSrc}
                        alt={card.title}
                        width={600}
                        height={900}
                        loading="lazy"
                        decoding="async"
                        className="h-14 w-10 rounded-lg border border-white/20 object-cover shadow"
                      />
                      {onZoomCard && (
                        <button
                          type="button"
                          onClick={() => onZoomCard(card.id, zoomZone)}
                          className="block w-full rounded bg-slate-900/90 border border-white/15 py-0.5 text-[10px] font-bold text-slate-200 hover:border-amber-300/70 hover:text-amber-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                        >
                          🔍 Soi
                        </button>
                      )}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-white">{card.title}</p>
                    <p className="text-xs text-slate-200 mt-0.5 leading-snug" title={card.summary}>
                      {card.summary}
                    </p>
                  </div>
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
                    data-primary-cta={isPrimaryCardCta ? 'true' : undefined}
                    data-lock-reason={disabled ? 'Chưa có mục tiêu hợp lệ' : undefined}
                    disabled={disabled}
                    onClick={() => {
                      playCardPlay(card.deck);
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
                    className={`w-full px-3 py-1.5 min-h-[36px] min-w-[44px] rounded-xl disabled:opacity-45 border text-xs font-black transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                      isPrimaryCardCta
                        ? 'bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 border-amber-200 text-slate-950 shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 border-white/15 text-white'
                    }`}
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
                      className="w-full px-3 py-1 min-h-[34px] min-w-[44px] rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    >
                      🙈 Không kích hoạt (Giữ kín vai / Hủy thẻ)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const canManualReveal =
    !privateView.revealed && privateView.roleId !== 'lang-tien-phong';
  const secondaryActionAvailable = canManualReveal || canUseSkillNow;

  // Render nội dung Pha 2 (LOCATION_ACTION) với đúng 1 Primary CTA
  const renderLocationPhaseContent = () => {
    if (hasAnyHandCard) {
      return renderHandCardsSection(true);
    }

    if (currentLoc.deckHint === 'any') {
      const activeDeckOpt =
        ANY_DECK_OPTIONS.find((d) => d.id === selectedAnyDeck) ?? ANY_DECK_OPTIONS[0];
      return (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {ANY_DECK_OPTIONS.map((opt) => {
              const chosen = opt.id === selectedAnyDeck;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`bg-select-deck-${opt.id}`}
                  aria-pressed={chosen}
                  onClick={() => setSelectedAnyDeck(opt.id)}
                  className={`px-2.5 py-1 min-h-[34px] min-w-[44px] rounded-xl border text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                    chosen
                      ? opt.activeCls
                      : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {opt.icon} {opt.short} ({publicGame.deckCounts[opt.id]})
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <button
              type="button"
              data-testid={`bg-draw-${activeDeckOpt.id}-btn`}
              data-primary-cta="true"
              onClick={() => onAction({ type: 'DRAW_CARD', deck: activeDeckOpt.id })}
              className={`px-3.5 py-1.5 min-h-[36px] min-w-[44px] rounded-xl bg-gradient-to-r ${activeDeckOpt.ctaCls} text-xs sm:text-sm font-black shadow-lg transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300`}
            >
              {activeDeckOpt.icon} Rút 1 Thẻ {activeDeckOpt.label} ({publicGame.deckCounts[activeDeckOpt.id]})
            </button>
            <button
              type="button"
              data-testid="bg-skip-loc-btn"
              onClick={() => onAction({ type: 'SKIP_LOC' })}
              className="px-3 py-1.5 min-h-[36px] min-w-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              ⏭️ Bỏ qua
            </button>
          </div>
        </div>
      );
    }

    if (
      currentLoc.deckHint === 'investigation' ||
      currentLoc.deckHint === 'equipment' ||
      currentLoc.deckHint === 'event'
    ) {
      const singleDeckMeta =
        currentLoc.deckHint === 'investigation'
          ? {
              testId: 'bg-draw-investigation-btn',
              deck: 'investigation' as const,
              label: `🔍 Rút 1 Thẻ Khám Phá (${publicGame.deckCounts.investigation})`,
              cls: 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950',
            }
          : currentLoc.deckHint === 'equipment'
            ? {
                testId: 'bg-draw-equipment-btn',
                deck: 'equipment' as const,
                label: `🛡️ Rút 1 Thẻ Cung Ứng (${publicGame.deckCounts.equipment})`,
                cls: 'bg-gradient-to-r from-sky-400 to-cyan-300 hover:from-sky-300 hover:to-cyan-200 text-slate-950',
              }
            : {
                testId: 'bg-draw-event-btn',
                deck: 'event' as const,
                label: `⚡ Rút 1 Thẻ Đột Kích (${publicGame.deckCounts.event})`,
                cls: 'bg-gradient-to-r from-rose-500 to-amber-400 hover:from-rose-400 hover:to-amber-300 text-slate-950',
              };

      return (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid={singleDeckMeta.testId}
            data-primary-cta="true"
            onClick={() => onAction({ type: 'DRAW_CARD', deck: singleDeckMeta.deck })}
            className={`px-3.5 py-1.5 min-h-[36px] min-w-[44px] rounded-xl text-xs sm:text-sm font-black shadow-lg transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${singleDeckMeta.cls}`}
          >
            {singleDeckMeta.label}
          </button>
          <button
            type="button"
            data-testid="bg-skip-loc-btn"
            onClick={() => onAction({ type: 'SKIP_LOC' })}
            className="px-3 py-1.5 min-h-[36px] min-w-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold transition cursor-pointer sm:ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            ⏭️ Bỏ qua
          </button>
        </div>
      );
    }

    if (currentLoc.deckHint === 'power-9') {
      const damagePreferred =
        Boolean(selectedTargetId) && !selectedIsSelf && Boolean(validOtherTarget);
      const damageLockReason = !validOtherTarget ? 'Không còn mục tiêu khác' : null;
      return (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1">
            {alivePlayers.map((p) => {
              const selected = validAnyTarget.playerId === p.playerId;
              return (
                <button
                  key={p.playerId}
                  type="button"
                  onClick={() => onSelectTarget(p.playerId)}
                  className={`px-2 py-1 min-h-[34px] min-w-[36px] rounded-xl border text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="bg-loc-heal-btn"
              data-primary-cta={!damagePreferred ? 'true' : undefined}
              onClick={() =>
                onAction({
                  type: 'USE_LOC_POWER',
                  targetPlayerId: validAnyTarget.playerId,
                  mode: 'heal',
                })
              }
              className={`px-3 py-1.5 min-h-[36px] min-w-[44px] rounded-xl text-xs sm:text-sm font-black transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                !damagePreferred
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 shadow-lg'
                  : 'bg-slate-800 hover:bg-slate-700 border border-emerald-500/45 text-emerald-200'
              }`}
            >
              💚 Hồi 1 cho {validAnyTarget.playerId === selfPlayer.playerId ? 'Bản thân' : validAnyTarget.displayName}
            </button>
            <button
              type="button"
              data-testid="bg-loc-damage-btn"
              data-primary-cta={damagePreferred ? 'true' : undefined}
              data-lock-reason={damageLockReason ?? undefined}
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
              className={`px-3 py-1.5 min-h-[36px] min-w-[44px] rounded-xl disabled:opacity-45 text-xs sm:text-sm font-black transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                damagePreferred
                  ? 'bg-gradient-to-r from-rose-500 to-amber-400 hover:from-rose-400 hover:to-amber-300 text-slate-950 shadow-lg'
                  : 'bg-slate-800 hover:bg-slate-700 border border-rose-500/45 text-rose-200'
              }`}
            >
              💥 Gây 2 ST lên {validOtherTarget?.displayName ?? '?'}
            </button>
            {damageLockReason && (
              <span data-testid="bg-locked-reasons" className="text-xs font-semibold text-slate-400">
                🔒 {damageLockReason}
              </span>
            )}
            <button
              type="button"
              data-testid="bg-skip-loc-btn"
              onClick={() => onAction({ type: 'SKIP_LOC' })}
              className="px-3 py-1.5 min-h-[36px] min-w-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold transition cursor-pointer sm:ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              ⏭️ Bỏ qua
            </button>
          </div>
        </div>
      );
    }

    // power-10 (Sân Bóng Rổ Đêm — Cướp Trang bị)
    const stealLockReason = !validStealTarget ? 'Chưa có ai đeo Trang bị' : null;
    return (
      <div className="space-y-1.5">
        {equippedTargets.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {equippedTargets.map((p) => {
              const selected = validStealTarget?.playerId === p.playerId;
              return (
                <button
                  key={p.playerId}
                  type="button"
                  onClick={() => onSelectTarget(p.playerId)}
                  className={`px-2 py-1 min-h-[34px] min-w-[36px] rounded-xl border text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                    selected
                      ? 'bg-sky-600 border-sky-300 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {p.displayName} ({p.equipped.length} đồ)
                </button>
              );
            })}
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="bg-loc-steal-btn"
            data-primary-cta={validStealTarget ? 'true' : undefined}
            data-lock-reason={stealLockReason ?? undefined}
            disabled={!validStealTarget}
            onClick={() => {
              if (!validStealTarget) return;
              onAction({
                type: 'USE_LOC_POWER',
                targetPlayerId: validStealTarget.playerId,
                mode: 'steal',
                ...(chosenStealEquipId ? { equipCardId: chosenStealEquipId } : {}),
              });
            }}
            className={`px-3.5 py-1.5 min-h-[36px] min-w-[44px] rounded-xl disabled:opacity-45 text-xs sm:text-sm font-black transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
              validStealTarget
                ? 'bg-gradient-to-r from-sky-400 to-cyan-300 hover:from-sky-300 hover:to-cyan-200 text-slate-950 shadow-lg'
                : 'bg-slate-800 border border-slate-700 text-slate-400'
            }`}
          >
            {validStealTarget
              ? `🧤 Cướp đồ của ${validStealTarget.displayName}`
              : '🔒 Cướp đồ (Trống)'}
          </button>
          {stealLockReason && (
            <span data-testid="bg-locked-reasons" className="text-xs font-semibold text-slate-400">
              🔒 {stealLockReason}
            </span>
          )}
          <button
            type="button"
            data-testid="bg-skip-loc-btn"
            data-primary-cta={!validStealTarget ? 'true' : undefined}
            onClick={() => onAction({ type: 'SKIP_LOC' })}
            className={`px-3.5 py-1.5 min-h-[36px] min-w-[44px] rounded-xl text-xs font-black transition cursor-pointer sm:ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
              !validStealTarget
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 shadow-lg'
                : 'bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold'
            }`}
          >
            {!validStealTarget ? '⏭️ Bỏ qua khu vực → Pha 3' : '⏭️ Bỏ qua'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <section
      data-testid="bg-action-panel"
      className="relative rounded-2xl border border-amber-400/50 bg-slate-900/95 px-3 py-1.5 sm:px-3.5 sm:py-2 shadow-[0_-6px_28px_rgba(15,23,42,0.75)] space-y-1.5"
    >
      {/* HÀNG 1: HƯỚNG DẪN NGẮN THEO PHA + NÚT MENU HÀNH ĐỘNG PHỤ (LẬT VAI / KỸ NĂNG) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs font-black">
            🎯 LƯỢT CỦA BẠN
          </span>
          <p
            data-testid="bg-action-guidance"
            className="text-xs sm:text-sm font-semibold text-slate-200 truncate"
            title={phaseGuidanceText}
          >
            {phaseGuidanceText}
          </p>
        </div>

        {/* MENU MỞ RỘNG CHO HÀNH ĐỘNG PHỤ */}
        <div ref={secondaryWrapRef} className="relative shrink-0">
          <button
            type="button"
            data-testid="bg-secondary-actions-btn"
            aria-expanded={secondaryOpen}
            aria-haspopup="dialog"
            onClick={() => setSecondaryOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[34px] min-w-[44px] rounded-xl border text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
              secondaryOpen
                ? 'border-cyan-400 bg-cyan-950/75 text-cyan-100'
                : secondaryActionAvailable
                  ? 'border-amber-400/55 bg-slate-800 hover:bg-slate-700 text-amber-100'
                  : 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <span>🎭 Vai &amp; Kỹ năng</span>
            {canUseSkillNow ? (
              <span className="text-xs font-black text-emerald-300">● Sẵn sàng</span>
            ) : canManualReveal ? (
              <span className="text-xs font-bold text-amber-300">● Ẩn</span>
            ) : null}
          </button>

          {secondaryOpen && (
            <div
              data-testid="bg-secondary-actions-menu"
              role="dialog"
              aria-label="Hành động phụ: Lật vai và Kỹ năng"
              className="fixed inset-x-3 bottom-16 sm:absolute sm:inset-x-auto sm:right-0 sm:bottom-full sm:mb-1.5 z-50 sm:w-[min(92vw,370px)] rounded-2xl border border-cyan-500/45 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-200">
                  🎭 Hành động phụ
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSecondaryOpen(false);
                    setConfirmingReveal(false);
                  }}
                  aria-label="Đóng menu hành động phụ"
                  className="px-2 py-0.5 min-h-[32px] min-w-[36px] rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  ✕
                </button>
              </div>

              {/* 1. Lật vai */}
              <div className="space-y-1">
                {canManualReveal ? (
                  confirmingReveal ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        data-testid="bg-confirm-reveal-btn"
                        onClick={() => {
                          setConfirmingReveal(false);
                          setSecondaryOpen(false);
                          onAction({ type: 'REVEAL_ROLE' });
                        }}
                        className="flex-1 px-3 py-1.5 min-h-[34px] min-w-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                      >
                        ✅ Xác nhận Lật Vai
                      </button>
                      <button
                        type="button"
                        data-testid="bg-cancel-reveal-btn"
                        onClick={() => setConfirmingReveal(false)}
                        className="px-2.5 py-1.5 min-h-[34px] min-w-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                      >
                        ✕ Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      data-testid="bg-reveal-role-btn"
                      onClick={() => setConfirmingReveal(true)}
                      className="w-full px-3 py-1.5 min-h-[34px] min-w-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-400/50 text-amber-200 text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    >
                      🎭 Lật vai công khai ({roleDesign.name})
                    </button>
                  )
                ) : (
                  <p data-testid="bg-reveal-locked-reason" className="text-xs font-semibold text-slate-300">
                    {privateView.revealed
                      ? `✅ Đã lật vai: ${roleDesign.name}`
                      : '🔒 Nội tại Đạt "Cảm Tử": tự lộ khi có người đầu tiên gục'}
                  </p>
                )}
              </div>

              {/* 2. Kỹ năng nhân vật */}
              <div className="space-y-1.5 border-t border-slate-800 pt-2">
                <p className="text-xs font-black text-white">
                  ✨ {roleDesign.skillName}
                </p>
                <p className="text-xs text-slate-300 leading-snug line-clamp-2">
                  {roleDesign.skillSummary}
                </p>
                {canUseSkillNow && roleDesign.targetMode === 'any-other' && (
                  <div className="flex flex-wrap gap-1">
                    {aliveOthers.map((p) => {
                      const chosen = skillTarget?.playerId === p.playerId;
                      return (
                        <button
                          key={p.playerId}
                          type="button"
                          onClick={() => onSelectTarget(p.playerId)}
                          className={`px-2 py-1 min-h-[32px] min-w-[36px] rounded-lg border text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                            chosen
                              ? 'bg-violet-600 border-violet-300 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                          }`}
                        >
                          {p.displayName}
                        </button>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  data-testid="bg-use-skill-btn"
                  data-lock-reason={skillLockReason ?? undefined}
                  disabled={!canUseSkillNow}
                  onClick={() => {
                    if (!canUseSkillNow) return;
                    setSecondaryOpen(false);
                    if (roleDesign.targetMode === 'self') {
                      onAction({ type: 'USE_SKILL' });
                    } else if (skillTarget) {
                      onAction({ type: 'USE_SKILL', targetPlayerId: skillTarget.playerId });
                    }
                  }}
                  className={`w-full px-3 py-1.5 min-h-[34px] min-w-[44px] rounded-xl disabled:opacity-45 text-white text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                    privateView.roleId === 'lang-cuu-ho'
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : 'bg-violet-600 hover:bg-violet-500'
                  }`}
                >
                  {privateView.roleId === 'gac-truc-ban'
                    ? `✨ Bước Nhảy Tắt → Ô ${pairedLoc.diceLabel}`
                    : privateView.roleId === 'lang-cuu-ho'
                      ? `🩸 Chém bồi (-2 HP → ${skillTarget?.displayName ?? '?'})`
                      : `✨ Kích hoạt ${roleDesign.skillName}${
                          skillTarget && roleDesign.targetMode !== 'self'
                            ? ` → ${skillTarget.displayName}`
                            : ''
                        }`}
                </button>
                {skillLockReason && (
                  <p data-testid="bg-skill-locked-reason" className="text-xs font-semibold text-amber-200/90">
                    🔒 {skillLockReason}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* THANH THÔNG TIN CHIẾN THUẬT KHI CHỌN NGƯỜI CHƠI HOẶC ĐỊA ĐIỂM */}
      {renderTacticalContextBar()}

      {/* PHA 1: CHỈ 1 PRIMARY CTA — TUNG XÚC XẮC */}
      {publicGame.turnPhase === 'ROLL_MOVE' && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-300 font-semibold">
            {rerollPrompt
              ? `🔁 Trùng Ô ${currentLoc.diceLabel} — bấm để đổ lại`
              : selfPlayer.equipped.some((e) => e.id === 'eq-05')
                ? '🧭 La Bàn Định Hướng: tung 2 cặp để chọn kết quả tốt nhất'
                : 'Kết quả xúc xắc sẽ hiển thị tại Khay Xúc Xắc trên bàn'}
          </span>
          <button
            type="button"
            data-testid="bg-roll-dice-btn"
            data-primary-cta="true"
            onClick={() => onAction({ type: 'ROLL_DICE' })}
            className="w-full sm:w-auto shrink-0 px-4 py-1.5 min-h-[38px] min-w-[44px] rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs sm:text-sm font-black shadow-lg transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            {rerollPrompt
              ? '🎲 ĐỔ LẠI XÚC XẮC (1d6 + 1d4)'
              : selfPlayer.equipped.some((e) => e.id === 'eq-05')
                ? '🧭 TUNG XÚC XẮC x2 (LA BÀN)'
                : '🎲 TUNG XÚC XẮC (1d6 + 1d4)'}
          </button>
        </div>
      )}

      {/* PHA 1B: CHỌN KHU VỰC (CHỈ 1 PRIMARY CTA + CÁC Ô PHỤ GỌN) */}
      {publicGame.turnPhase === 'CHOOSE_MOVE' && (
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {allowedMoveList.map((loc) => (
              <button
                key={loc.id}
                type="button"
                data-testid={`bg-choose-dest-${loc.id}`}
                onClick={() => onAction({ type: 'CHOOSE_DEST', location: loc.id })}
                className={`px-2.5 py-1 min-h-[34px] min-w-[44px] rounded-xl border text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                  selectedLocationId === loc.id
                    ? 'border-amber-300 bg-amber-950/60 text-amber-100'
                    : 'border-slate-700 bg-slate-800/85 hover:border-amber-400/70 hover:bg-slate-800 text-slate-200'
                }`}
              >
                Ô {loc.diceLabel} · {loc.shortName}
              </button>
            ))}
          </div>
          {chosenMoveLoc && (
            <button
              type="button"
              data-testid="bg-primary-choose-dest-btn"
              data-primary-cta="true"
              onClick={() => onAction({ type: 'CHOOSE_DEST', location: chosenMoveLoc.id })}
              className="w-full sm:w-auto shrink-0 px-3.5 py-1.5 min-h-[38px] min-w-[44px] rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 text-xs sm:text-sm font-black shadow-lg transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              🧭 Đi tới Ô {chosenMoveLoc.diceLabel} · {chosenMoveLoc.shortName}
            </button>
          )}
        </div>
      )}

      {/* PHA 2: HÀNH ĐỘNG KHU VỰC */}
      {publicGame.turnPhase === 'LOCATION_ACTION' && renderLocationPhaseContent()}

      {/* PHA 3: GIẢI QUYẾT THẺ / TẤN CÔNG / KẾT THÚC LƯỢT */}
      {publicGame.turnPhase === 'MAIN_ACTION' && (
        <div className="space-y-1.5">
          {renderTargetSelector('Mục tiêu:')}

          {renderHandCardsSection(true)}

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
            <button
              type="button"
              data-testid="bg-attack-btn"
              data-primary-cta={
                (!hasAnyHandCard && canAttackNow) || (!hasAnyHandCard && !canAttackNow && !canEndTurn)
                  ? 'true'
                  : undefined
              }
              data-lock-reason={attackLockReason ?? undefined}
              disabled={!canAttackNow}
              onClick={() => {
                if (effectiveAttackTarget) {
                  onAction({ type: 'ATTACK', targetPlayerId: effectiveAttackTarget.playerId });
                }
              }}
              className={`px-3.5 py-1.5 min-h-[36px] min-w-[44px] rounded-xl disabled:opacity-45 text-xs sm:text-sm font-black transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                canAttackNow && !hasAnyHandCard
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 shadow-lg'
                  : 'bg-slate-800 border border-slate-700 text-slate-300'
              }`}
            >
              {attacksThisTurn >= 1
                ? '⚔️ Đã tấn công'
                : effectiveAttackTarget
                  ? `${hasMachineGun ? `🔫 Xả đạn ${attackableTargets.length} người` : `⚔️ Tấn công ${effectiveAttackTarget.displayName}`} (${attackDiceFormula}${attackTargetWarning})`
                  : hasHandgun
                    ? '🔫 Chưa có mục tiêu (Cụm khác)'
                    : '⚔️ Chưa có mục tiêu cùng Cụm'}
            </button>

            <button
              type="button"
              data-testid="bg-end-turn-btn"
              data-primary-cta={!hasAnyHandCard && !canAttackNow && canEndTurn ? 'true' : undefined}
              data-lock-reason={endTurnLockReason ?? undefined}
              disabled={!canEndTurn}
              onClick={() => onAction({ type: 'END_TURN' })}
              className={`px-3.5 py-1.5 min-h-[36px] min-w-[44px] rounded-xl disabled:opacity-45 text-xs sm:text-sm font-black transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                !hasAnyHandCard && !canAttackNow && canEndTurn
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 shadow-lg'
                  : 'bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200'
              }`}
            >
              {mustResolveCardFirst
                ? '🃏 Dùng hết thẻ trước'
                : mustAttackMasamune
                  ? '⚔️ Bắt buộc đánh'
                  : '✔️ Kết thúc lượt'}
            </button>

            {(attackLockReason || endTurnLockReason) && (
              <span data-testid="bg-locked-reasons" className="text-xs font-semibold text-slate-400">
                🔒 {endTurnLockReason ?? attackLockReason}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default ActionPanel;
