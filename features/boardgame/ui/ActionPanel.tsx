'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/ActionPanel.tsx — Bảng điều khiển lượt v3 (3 pha):
// ① MOVE_OR_STAY (Di chuyển hoặc Đứng yên)
// -> ② LOCATION_ACTION (Khảo sát hiệu ứng khu vực hoặc Rút 1 lá bài hợp lệ)
// -> ③ MAIN_ACTION (Trang bị miễn phí, Dùng Thẻ Điều tra có điều kiện,
//     Dùng Trang bị tiêu hao / Sự kiện, Công kích, Phòng thủ, Lật vai & Kỹ năng).
// Bảo mật P0: Tuyệt đối không hiển thị HP gốc hay tên bài/kỹ năng ẩn khi Thẻ đang ÚP.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import type {
  BoardGameActionPayload,
  BoardGameDeckId,
  BoardGameLocationId,
  BoardGamePrivateGameView,
  BoardGamePublicGameView,
} from '../network/contracts';
import { ROLES_BY_ID } from '../domain/roles';
import {
  KTX_LOCATIONS,
  KTX_LOCATION_MAP,
  isAdjacentLocation,
  listLegalMovesForLocation,
} from '../domain/rules';
import { DeckCardBackSvg, LOCATION_VISUAL_META } from './BoardGameArt';

export interface ActionPanelProps {
  publicGame: BoardGamePublicGameView;
  privateView: BoardGamePrivateGameView | null;
  selfPlayerId: string | null;
  isSpectator: boolean;
  pendingAction: boolean;
  hiddenOnScreen?: boolean;
  onToggleHidden?: () => void;
  onAction: (action: BoardGameActionPayload) => void;
}

const PHASE_STEPS = [
  { id: 'MOVE_OR_STAY', label: '① Di chuyển / Đứng yên' },
  { id: 'LOCATION_ACTION', label: '② Khảo sát / Rút thẻ' },
  { id: 'MAIN_ACTION', label: '③ Hành động chính' },
] as const;

const DECK_META: Record<
  BoardGameDeckId,
  { label: string; desc: string; classes: string; textClass: string }
> = {
  investigation: {
    label: 'Điều tra',
    desc: 'Thẻ điều kiện · Soi dấu',
    classes: 'border-amber-500/50 bg-amber-950/40 hover:border-amber-400 hover:bg-amber-900/55',
    textClass: 'text-amber-200',
  },
  equipment: {
    label: 'Trang bị',
    desc: 'Vật phẩm · Giáp & Tiêu hao',
    classes: 'border-sky-500/50 bg-sky-950/40 hover:border-sky-400 hover:bg-sky-900/55',
    textClass: 'text-sky-200',
  },
  event: {
    label: 'Sự kiện',
    desc: 'Biến cố & Đổi vị trí',
    classes: 'border-rose-500/50 bg-rose-950/40 hover:border-rose-400 hover:bg-rose-900/55',
    textClass: 'text-rose-200',
  },
};

export default function ActionPanel({
  publicGame,
  privateView,
  selfPlayerId,
  isSpectator,
  pendingAction,
  hiddenOnScreen = false,
  onToggleHidden,
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

  const inSameOrAdjacentTargets = useMemo(() => {
    if (!selfPublic) return [];
    return aliveTargets.filter((p) => isAdjacentLocation(selfPublic.location, p.location));
  }, [aliveTargets, selfPublic]);

  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [cardDestinationLoc, setCardDestinationLoc] = useState<BoardGameLocationId>('lobby');
  const [confirmRevealOpen, setConfirmRevealOpen] = useState(false);

  useEffect(() => {
    const preferred = inSameOrAdjacentTargets[0]?.playerId ?? aliveTargets[0]?.playerId ?? '';
    if (!selectedTargetId || !aliveTargets.some((t) => t.playerId === selectedTargetId)) {
      setSelectedTargetId(preferred);
    }
  }, [inSameOrAdjacentTargets, aliveTargets, selectedTargetId]);

  useEffect(() => {
    if (!isMyTurn) setConfirmRevealOpen(false);
  }, [isMyTurn]);

  if (publicGame.winnerLabel || publicGame.turnPhase === 'ENDED') {
    return null;
  }

  if (isSpectator || !selfPublic) {
    return (
      <div
        data-testid="bg-action-spectator-banner"
        className="rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-xs text-slate-300"
      >
        👁️ Bạn đang theo dõi trận đấu ở chế độ khán giả. Lượt hiện tại:{' '}
        <strong className="text-amber-200">{activePlayer?.displayName ?? 'Đang cập nhật'}</strong>.
      </div>
    );
  }

  if (!selfPublic.alive) {
    return (
      <div className="rounded-2xl border border-rose-500/40 bg-rose-950/35 px-4 py-3 text-xs text-rose-200">
        🕯️ Bạn đã kiệt sức — hãy theo dõi diễn biến tới khi trận đấu ngã ngũ.
      </div>
    );
  }

  if (!isMyTurn) {
    return (
      <div
        data-testid="bg-waiting-turn-banner"
        className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-xs text-slate-300"
      >
        <div>
          ⏳ Đang chờ lượt của{' '}
          <strong className="text-amber-300">{activePlayer?.displayName ?? 'sinh viên khác'}</strong>{' '}
          <span className="text-slate-400">
            (
            {publicGame.turnPhase === 'MOVE_OR_STAY'
              ? 'Pha ① Di chuyển'
              : publicGame.turnPhase === 'LOCATION_ACTION'
                ? 'Pha ② Khảo sát / Rút thẻ'
                : 'Pha ③ Hành động chính'}
            )
          </span>
        </div>
        {privateView && privateView.hand.length > 0 && (
          <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
            🃏 Thẻ trên tay: {privateView.hand.length}
          </span>
        )}
      </div>
    );
  }

  const currentLoc = selfPublic.location;
  const locDef = KTX_LOCATION_MAP[currentLoc];

  // Danh sách ô di chuyển hợp lệ (kể cả Giày Thể Thao / Tú lướt từ Hành Lang B7)
  const legalMoveIds = (() => {
    const oneStep = listLegalMovesForLocation(currentLoc);
    const hasTwoStep =
      Boolean(privateView?.equipped.some((c) => c.effectId === 'eq-sneakers')) ||
      (selfPublic.revealedRoleId === 'suong-an-danh' && currentLoc === 'corridor');
    if (!hasTwoStep) return oneStep;
    const dest = new Set<BoardGameLocationId>(oneStep);
    for (const mid of oneStep) {
      for (const two of listLegalMovesForLocation(mid)) {
        if (two !== currentLoc) dest.add(two);
      }
    }
    return Array.from(dest);
  })();
  const moveOptions = KTX_LOCATIONS.filter((loc) => legalMoveIds.includes(loc.id));

  const activeTargetObj =
    aliveTargets.find((t) => t.playerId === selectedTargetId) ?? aliveTargets[0] ?? null;

  const isSameRoom = Boolean(activeTargetObj && activeTargetObj.location === currentLoc);
  const isAdjacentRoom = Boolean(
    activeTargetObj && !isSameRoom && isAdjacentLocation(currentLoc, activeTargetObj.location),
  );
  const hasBaton = Boolean(privateView?.equipped.some((c) => c.effectId === 'eq-baton'));
  const hasWalkie = Boolean(
    privateView?.equipped.some((c) => c.effectId === 'eq-walkie-talkie'),
  );
  const canAttackTarget = Boolean(
    activeTargetObj &&
      (isSameRoom ||
        (isAdjacentRoom &&
          (hasBaton ||
            currentLoc === 'court' ||
            selfPublic.revealedRoleId === 'suong-an-danh' ||
            selfPublic.revealedRoleId === 'suong-gac-cong'))),
  );
  const canInvestigateTarget = Boolean(
    activeTargetObj &&
      (isSameRoom ||
        isAdjacentRoom ||
        currentLoc === 'radio' ||
        hasWalkie ||
        (privateView?.revealed && privateView.roleId === 'gac-radio')),
  );

  const roleDef = privateView ? ROLES_BY_ID[privateView.roleId] : null;
  const canUseSkillNow = Boolean(privateView?.revealed && privateView.skillCooldown === 0);

  return (
    <div
      data-testid="bg-action-panel"
      className="space-y-3 rounded-2xl border border-amber-500/45 bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-3.5 text-xs text-slate-100 shadow-2xl"
    >
      {/* Thanh bước lượt trực quan */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {PHASE_STEPS.map((step) => {
            const active = publicGame.turnPhase === step.id;
            return (
              <span
                key={step.id}
                className={`rounded-lg px-2 py-1 text-[11px] font-bold transition motion-reduce:transition-none ${
                  active
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'bg-slate-800/80 text-slate-400'
                }`}
              >
                {step.label}
              </span>
            );
          })}
        </div>
        <span className="text-[11px] font-semibold text-emerald-300">
          ✨ Lượt của bạn ({locDef.shortLabel})
        </span>
      </div>

      {/* Pha 1: MOVE_OR_STAY */}
      {publicGame.turnPhase === 'MOVE_OR_STAY' && (
        <div className="space-y-2">
          <div className="text-[11px] text-slate-300">
            Chọn khu vực kế tiếp để di chuyển (hoặc bấm trực tiếp ô có đường nối trên bàn cờ), hay đứng yên tại{' '}
            <strong className="text-amber-200">{locDef.shortLabel}</strong>:
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {moveOptions.map((loc) => {
              const vis = LOCATION_VISUAL_META[loc.id];
              const occCount = publicGame.players.filter((p) => p.location === loc.id && p.alive).length;
              return (
                <button
                  key={loc.id}
                  type="button"
                  data-testid={`bg-move-${loc.id}`}
                  disabled={pendingAction}
                  title={loc.description}
                  onClick={() => onAction({ type: 'MOVE', location: loc.id })}
                  className="flex flex-col items-start rounded-xl border border-slate-700 bg-slate-950/85 p-2 text-left transition hover:border-amber-400 hover:bg-amber-950/40 disabled:opacity-45 motion-reduce:transition-none"
                >
                  <div className="flex w-full items-center justify-between gap-1 font-bold text-amber-100">
                    <span className="truncate">
                      {vis.icon} {loc.shortLabel}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {occCount > 0 ? `👥${occCount}` : ''}
                    </span>
                  </div>
                  <span className="mt-1 truncate text-[10px] font-medium text-amber-300/90">
                    {vis.badgeText}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              data-testid="bg-stay-btn"
              disabled={pendingAction}
              onClick={() => onAction({ type: 'STAY' })}
              className="flex flex-col items-start rounded-xl border border-emerald-600/60 bg-emerald-950/40 p-2 text-left transition hover:border-emerald-400 hover:bg-emerald-900/50 disabled:opacity-45 motion-reduce:transition-none"
            >
              <div className="font-bold text-emerald-200">⏸️ Đứng yên</div>
              <span className="mt-1 text-[10px] text-emerald-300/85">
                Giữ vị trí tại {locDef.shortLabel}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Pha 2: LOCATION_ACTION */}
      {publicGame.turnPhase === 'LOCATION_ACTION' && (
        <div className="space-y-2.5">
          <button
            type="button"
            data-testid="bg-explore-loc"
            disabled={pendingAction}
            onClick={() => onAction({ type: 'EXPLORE_LOC' })}
            className="w-full rounded-xl border border-teal-500/60 bg-teal-950/55 px-3 py-2 text-left font-bold text-teal-100 transition hover:bg-teal-900/70 disabled:opacity-45 motion-reduce:transition-none"
          >
            <div>🔍 Khảo sát khu vực: {locDef.actionLabel}</div>
            <div className="mt-0.5 text-[10px] font-normal text-teal-200/85">
              {locDef.description}
            </div>
          </button>

          <div className="text-[11px] font-semibold text-slate-300">
            Hoặc rút 1 thẻ thuộc khu vực {locDef.shortLabel}:
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(['investigation', 'equipment', 'event'] as const).map((deck) => {
              const allowed = locDef.allowedDecks.includes(deck);
              const meta = DECK_META[deck];
              return (
                <button
                  key={deck}
                  type="button"
                  data-testid={`bg-draw-${deck}`}
                  disabled={pendingAction || !allowed}
                  onClick={() => onAction({ type: 'DRAW_CARD', deck })}
                  className={`flex items-center gap-2.5 rounded-xl border p-2 text-left transition disabled:cursor-not-allowed disabled:opacity-35 motion-reduce:transition-none ${meta.classes}`}
                >
                  <DeckCardBackSvg deck={deck} />
                  <div className="min-w-0">
                    <div className={`font-bold ${meta.textClass}`}>
                      {meta.label} ({publicGame.deckCounts[deck]})
                    </div>
                    <div className="text-[10px] text-slate-200/80">
                      {allowed ? meta.desc : 'Không có tại ô này'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Pha 3: MAIN_ACTION */}
      {publicGame.turnPhase === 'MAIN_ACTION' && (
        <div className="space-y-2.5">
          {/* Chọn mục tiêu (CHỈ HIỂN THỊ DỮ LIỆU CÔNG KHAI) */}
          <div className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/75 p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-300">
                🎯 Chọn mục tiêu ({inSameOrAdjacentTargets.length} người trong vùng gần):
              </span>
              <select
                data-testid="bg-target-select"
                aria-label="Chọn sinh viên mục tiêu"
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100"
              >
                {aliveTargets.map((t) => (
                  <option key={t.playerId} value={t.playerId}>
                    {t.displayName} ({KTX_LOCATION_MAP[t.location].shortLabel} · 🩹{t.woundsTaken}
                    {t.tempShield > 0 ? ` · 🛡️${t.tempShield}` : ''}
                    {t.equipped.length > 0 ? ` · 🎒${t.equipped.length}` : ''})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {aliveTargets.map((t) => {
                const same = t.location === currentLoc;
                const adj = !same && isAdjacentLocation(currentLoc, t.location);
                const selected = (activeTargetObj?.playerId ?? '') === t.playerId;
                return (
                  <button
                    key={t.playerId}
                    type="button"
                    onClick={() => setSelectedTargetId(t.playerId)}
                    className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition motion-reduce:transition-none ${
                      selected
                        ? 'border-amber-400 bg-amber-500/20 text-amber-100 shadow-sm'
                        : same || adj
                          ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500'
                          : 'border-slate-800/80 bg-slate-950 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {t.displayName} · 🩹{t.woundsTaken}
                    {t.tempShield > 0 ? ` · 🛡️${t.tempShield}` : ''}
                    {same ? ' (cùng phòng)' : adj ? ' (kề)' : ' (xa)'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hàng nút Chiến đấu / Phòng thủ / Kỹ năng */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              data-testid="bg-attack-btn"
              disabled={pendingAction || !canAttackTarget}
              onClick={() =>
                activeTargetObj &&
                onAction({ type: 'ATTACK', targetPlayerId: activeTargetObj.playerId })
              }
              title={
                canAttackTarget
                  ? 'Gây 2 ST cơ bản (giảm 1 nếu mục tiêu chưa từng tấn công & chưa lật vai)'
                  : 'Cần đứng cùng phòng (hoặc có Gậy Bảo Vệ / Tầm Sân Bóng Rổ)'
              }
              className="rounded-lg border border-rose-500/60 bg-rose-950/65 px-2.5 py-1.5 font-semibold text-rose-100 hover:bg-rose-900/80 disabled:opacity-40"
            >
              ⚔️ Công kích (2 ST)
            </button>

            <button
              type="button"
              data-testid="bg-defend-btn"
              disabled={pendingAction}
              onClick={() => onAction({ type: 'DEFEND' })}
              className="rounded-lg border border-sky-500/60 bg-sky-950/65 px-2.5 py-1.5 font-semibold text-sky-100 hover:bg-sky-900/80 disabled:opacity-45"
            >
              🛡️ Phòng thủ (+1 🛡️ &amp; Quan sát)
            </button>

            <button
              type="button"
              data-testid="bg-use-skill-btn"
              disabled={pendingAction || !canUseSkillNow}
              onClick={() =>
                onAction({
                  type: 'USE_SKILL',
                  targetPlayerId: activeTargetObj?.playerId,
                })
              }
              title={
                !privateView?.revealed
                  ? 'Hãy Lật vai công khai trước để mở khóa Kỹ năng riêng'
                  : privateView.skillCooldown > 0
                    ? `Đang hồi chiêu (${privateView.skillCooldown} vòng)`
                    : hiddenOnScreen
                      ? 'Kích hoạt kỹ năng riêng'
                      : roleDef?.activeAbility.summary
              }
              className="rounded-lg border border-fuchsia-500/60 bg-fuchsia-950/65 px-2.5 py-1.5 font-semibold text-fuchsia-100 hover:bg-fuchsia-900/80 disabled:opacity-40"
            >
              {!privateView?.revealed
                ? '⚡ Kỹ năng riêng (Cần lật vai)'
                : privateView.skillCooldown > 0
                  ? `⚡ Hồi chiêu (${privateView.skillCooldown}v)`
                  : hiddenOnScreen
                    ? '⚡ Kích hoạt Kỹ năng'
                    : `⚡ ${roleDef?.activeAbility.name ?? 'Kỹ năng'}`}
            </button>
          </div>

          {/* Bài trên tay (Ẩn hoàn toàn tên & nội dung khi Thẻ vai đang ÚP chống nhìn trộm!) */}
          {privateView && privateView.hand.length > 0 && (
            <div className="space-y-1.5">
              {hiddenOnScreen ? (
                <div
                  data-testid="bg-hand-masked-banner"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-amber-500/45 bg-slate-950/85 px-3 py-2 text-[11px] text-amber-100"
                >
                  <span>
                    🃏 Đang giữ <strong>{privateView.hand.length}</strong> lá bài trên tay (đã ẩn
                    chống nhìn trộm màn hình).
                  </span>
                  {onToggleHidden && (
                    <button
                      type="button"
                      data-testid="bg-unmask-hand-btn"
                      onClick={onToggleHidden}
                      className="rounded-lg bg-amber-500/20 px-2.5 py-1 font-bold text-amber-200 ring-1 ring-amber-400/50 hover:bg-amber-500/30"
                    >
                      👁️ Lật xem bài &amp; vai
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      🃏 Bài trên tay ({privateView.hand.length}/4)
                    </div>
                    {privateView.hand.some((c) => c.targetMode === 'location') && (
                      <select
                        data-testid="bg-card-location-select"
                        value={cardDestinationLoc}
                        onChange={(e) =>
                          setCardDestinationLoc(e.target.value as BoardGameLocationId)
                        }
                        className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-200"
                      >
                        {KTX_LOCATIONS.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            Khu vực: {loc.shortLabel}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {privateView.hand.map((card) => {
                      const isInv = card.deck === 'investigation';
                      const isEquip = card.deck === 'equipment';
                      const isPassiveEquip = isEquip && !card.isConsumable;
                      const needsTarget =
                        card.targetMode === 'single-player' ||
                        card.targetMode === 'adjacent-or-same' ||
                        card.targetMode === 'same-location';
                      const targetWithinRange =
                        card.targetMode === 'same-location'
                          ? isSameRoom
                          : card.targetMode === 'adjacent-or-same'
                            ? isSameRoom || isAdjacentRoom
                            : Boolean(activeTargetObj);
                      const disabled =
                        pendingAction ||
                        (isInv && (!activeTargetObj || !canInvestigateTarget)) ||
                        (needsTarget && !isInv && (!activeTargetObj || !targetWithinRange));

                      const handlePlayCard = () => {
                        if (isInv && activeTargetObj) {
                          onAction({
                            type: 'INVESTIGATE_CARD',
                            cardId: card.id,
                            targetPlayerId: activeTargetObj.playerId,
                          });
                          return;
                        }
                        if (isPassiveEquip) {
                          onAction({ type: 'EQUIP_CARD', cardId: card.id });
                          return;
                        }
                        if (isEquip) {
                          onAction({
                            type: 'USE_EQUIPMENT',
                            cardId: card.id,
                            targetPlayerId: needsTarget ? activeTargetObj?.playerId : undefined,
                          });
                          return;
                        }
                        onAction({
                          type: 'PLAY_EVENT',
                          cardId: card.id,
                          targetPlayerId: needsTarget ? activeTargetObj?.playerId : undefined,
                          targetLocation:
                            card.targetMode === 'location' ? cardDestinationLoc : undefined,
                        });
                      };

                      return (
                        <button
                          key={card.id}
                          type="button"
                          data-testid={`bg-use-card-${card.id}`}
                          disabled={disabled}
                          onClick={handlePlayCard}
                          className={`flex flex-col justify-between rounded-xl border p-2.5 text-left transition disabled:opacity-45 motion-reduce:transition-none ${
                            isInv
                              ? 'border-amber-500/50 bg-amber-950/30 hover:border-amber-400 hover:bg-amber-950/55'
                              : isEquip
                                ? 'border-cyan-500/50 bg-cyan-950/25 hover:border-cyan-400 hover:bg-cyan-950/50'
                                : 'border-rose-500/50 bg-rose-950/25 hover:border-rose-400 hover:bg-rose-950/50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 font-bold text-amber-100">
                              <span className="truncate">{card.title}</span>
                              <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[9px] uppercase text-slate-200">
                                {isInv
                                  ? '🔎 Soi'
                                  : isPassiveEquip
                                    ? '🎒 Đeo (Free)'
                                    : isEquip
                                      ? '🧪 Tiêu hao'
                                      : '⚡ Sự kiện'}
                              </span>
                            </div>
                            {card.conditionText && (
                              <div className="mt-1 inline-block rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-400/30">
                                ĐK: {card.conditionText}
                              </div>
                            )}
                            <p className="mt-1 text-[10px] leading-snug text-slate-300">
                              {card.summary}
                            </p>
                          </div>
                          {isInv && activeTargetObj && (
                            <div className="mt-1.5 text-[10px] font-semibold text-amber-300">
                              {canInvestigateTarget
                                ? `→ Soi lên ${activeTargetObj.displayName}`
                                : '→ Ngoài tầm soi (cần đứng kề / Phát thanh)'}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Hộp xác nhận trước khi Lật vai công khai */}
          {confirmRevealOpen && (
            <div
              data-testid="bg-reveal-confirm-modal"
              className="rounded-xl border border-orange-400/70 bg-orange-950/75 p-2.5 text-[11px] text-orange-100 shadow-lg"
            >
              <div className="font-bold text-amber-200">
                ⚠️ Xác nhận Lật vai công khai vĩnh viễn?
              </div>
              <p className="mt-0.5 text-orange-200/90">
                Mọi sinh viên tại bàn sẽ thấy nhân vật &amp; phe thật của bạn ngay lập tức, kích
                hoạt thưởng lật vai và mở khóa Kỹ năng riêng (không làm kết thúc lượt).
                {!hiddenOnScreen && roleDef ? ` Thưởng riêng: ${roleDef.revealBenefit}` : ''}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  data-testid="bg-confirm-reveal-btn"
                  disabled={pendingAction}
                  onClick={() => {
                    setConfirmRevealOpen(false);
                    onAction({ type: 'REVEAL_ROLE' });
                  }}
                  className="rounded-lg bg-orange-600 px-3 py-1 font-bold text-white hover:bg-orange-500"
                >
                  Xác nhận Lật vai
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRevealOpen(false)}
                  className="rounded-lg bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700"
                >
                  Hủy (giữ ẩn danh)
                </button>
              </div>
            </div>
          )}

          {/* Lật vai / Kết thúc lượt */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2">
            {!privateView?.revealed ? (
              <button
                type="button"
                data-testid="bg-reveal-role-btn"
                disabled={pendingAction}
                onClick={() => setConfirmRevealOpen(true)}
                className="rounded-lg border border-orange-500/60 bg-orange-950/60 px-2.5 py-1.5 font-semibold text-orange-200 hover:bg-orange-900/75 disabled:opacity-45"
              >
                📢 Lật vai (Mở kỹ năng &amp; Thưởng)
              </button>
            ) : (
              <span className="text-[11px] font-semibold text-emerald-300">
                ✅ Đã công khai danh tính
              </span>
            )}

            <button
              type="button"
              data-testid="bg-end-turn-btn"
              disabled={pendingAction}
              onClick={() => onAction({ type: 'END_TURN' })}
              className="rounded-xl bg-amber-400 px-4 py-1.5 font-extrabold text-slate-950 shadow hover:bg-amber-300 disabled:opacity-45"
            >
              ⏭️ Kết thúc lượt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
