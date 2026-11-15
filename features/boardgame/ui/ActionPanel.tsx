'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/ActionPanel.tsx — Bảng điều khiển lượt v2:
// ① MOVE (kề cận) -> ② DRAW_OR_EXPLORE (Khảo sát phòng / Gài mạch / Rút bài)
// -> ③ TACTICAL_ACTION (Điều tra / Dùng thẻ / Kỹ năng / Công kích / Đối chất / Kích nổ / Công bố / Lật vai).
// Bảo mật P0: Không bao giờ hiển thị `hp` hay `maxHp` của người khác trên UI.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import type {
  BoardGameActionPayload,
  BoardGameLocationId,
  BoardGamePrivateGameView,
  BoardGamePublicGameView,
} from '../network/contracts';
import { KTX_LOCATIONS, KTX_LOCATION_MAP, isAdjacentLocation } from '../domain/rules';
import { DeckCardBackSvg, LOCATION_VISUAL_META } from './BoardGameArt';

export interface ActionPanelProps {
  publicGame: BoardGamePublicGameView;
  privateView: BoardGamePrivateGameView | null;
  selfPlayerId: string | null;
  isSpectator: boolean;
  pendingAction: boolean;
  onAction: (action: BoardGameActionPayload) => void;
}

const PHASE_STEPS = [
  { id: 'MOVE', label: '① Di chuyển' },
  { id: 'DRAW_OR_EXPLORE', label: '② Khảo sát / Rút thẻ' },
  { id: 'TACTICAL_ACTION', label: '③ Suy luận & Chiến thuật' },
] as const;

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
      !selfPublic?.detained &&
      publicGame.activePlayerId === selfPlayerId &&
      publicGame.turnPhase !== 'ENDED',
  );

  const aliveTargets = useMemo(
    () =>
      publicGame.players.filter(
        (p) => p.alive && !p.detained && (!selfPlayerId || p.playerId !== selfPlayerId),
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
  const [cardDestinationLoc, setCardDestinationLoc] = useState<BoardGameLocationId>('lobby');
  const [confirmRevealMode, setConfirmRevealMode] = useState<'reveal' | 'skill' | null>(null);

  useEffect(() => {
    const preferred = inRangeTargets[0]?.playerId ?? aliveTargets[0]?.playerId ?? '';
    if (!selectedTargetId || !aliveTargets.some((t) => t.playerId === selectedTargetId)) {
      setSelectedTargetId(preferred);
    }
  }, [inRangeTargets, aliveTargets, selectedTargetId]);

  useEffect(() => {
    if (!isMyTurn) setConfirmRevealMode(null);
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

  if (!selfPublic.alive || selfPublic.detained) {
    return (
      <div className="rounded-2xl border border-rose-500/40 bg-rose-950/35 px-4 py-3 text-xs text-rose-200">
        {selfPublic.detained
          ? '🔒 Bạn đã bị Tạm giữ sau phiên Đối chất — hãy theo dõi diễn biến tới khi có kết quả.'
          : '🕯️ Bạn đã kiệt sức — hãy theo dõi phần còn lại để xem phe nào chiến thắng.'}
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
            {publicGame.turnPhase === 'MOVE'
              ? 'Pha ① Di chuyển'
              : publicGame.turnPhase === 'DRAW_OR_EXPLORE'
                ? 'Pha ② Khảo sát / Rút thẻ'
                : 'Pha ③ Suy luận & Chiến thuật'}
            )
          </span>
        </div>
        {privateView && privateView.hand.length > 0 && (
          <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
            🃏 Bài Chiến thuật đang giữ: {privateView.hand.length}
          </span>
        )}
      </div>
    );
  }

  const currentLoc = selfPublic.location;
  const moveOptions = KTX_LOCATIONS.filter(
    (loc) => loc.id !== currentLoc && isAdjacentLocation(currentLoc, loc.id),
  );
  const isCurrentBlackout = publicGame.blackoutLocation === currentLoc;
  const activeTargetObj =
    aliveTargets.find((t) => t.playerId === selectedTargetId) ?? aliveTargets[0] ?? null;
  const anywhereConfront = publicGame.breakerSealed && publicGame.radioSealed;
  const canConfrontLocation =
    anywhereConfront || currentLoc === 'lobby' || currentLoc === 'breaker';
  const canConfrontNow =
    publicGame.round >= 3 && !privateView?.confrontUsed && canConfrontLocation;

  const isCovertSabotageAvailable =
    privateView?.faction === 'mist-order' &&
    !selfPublic.detained &&
    privateView.secretSabotageLocation === currentLoc &&
    !privateView.sabotagePlanted &&
    !publicGame.sabotageArmed;

  const canDetonateNow =
    privateView?.faction === 'mist-order' &&
    !selfPublic.detained &&
    privateView.sabotageCanDetonate &&
    (currentLoc === privateView.secretSabotageLocation ||
      (privateView.revealed && currentLoc === 'radio'));

  const canPublishDossier =
    privateView?.roleId === 'lang-anh-san' &&
    publicGame.round >= 4 &&
    currentLoc === 'radio' &&
    privateView.verifiedSceneLocations.length >= 2 &&
    privateView.evidenceList.length >= 3;

  const isCovertSkillActor =
    privateView?.roleId === 'suong-tin-gia' &&
    !privateView.revealed &&
    !privateView.covertSkillUsed;

  return (
    <div
      data-testid="bg-action-panel"
      className="space-y-3 rounded-2xl border border-amber-500/45 bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-3.5 text-xs text-slate-100 shadow-2xl"
    >
      {/* Thanh bước lượt trực quan */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {PHASE_STEPS.map((step) => {
            const active = publicGame.turnPhase === step.id;
            return (
              <span
                key={step.id}
                className={`rounded-lg px-2 py-1 text-[11px] font-bold transition ${
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
          ✨ Tới lượt bạn ({KTX_LOCATION_MAP[currentLoc].shortLabel})
        </span>
      </div>

      {/* Pha 1: MOVE (kề cận) */}
      {publicGame.turnPhase === 'MOVE' && (
        <div className="space-y-2">
          <div className="text-[11px] text-slate-300">
            Chọn khu vực có đường nối kề cận để di chuyển (hoặc bấm trực tiếp ô sáng trên bàn cờ):
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {moveOptions.map((loc) => {
              const blackout = publicGame.blackoutLocation === loc.id;
              const vis = LOCATION_VISUAL_META[loc.id];
              const occCount = publicGame.players.filter((p) => p.location === loc.id).length;
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
                      {blackout ? '⚡' : occCount > 0 ? `👥${occCount}` : ''}
                    </span>
                  </div>
                  <span className="mt-1 truncate text-[10px] font-medium text-amber-300/90">
                    {vis.badgeText}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Pha 2: DRAW_OR_EXPLORE */}
      {publicGame.turnPhase === 'DRAW_OR_EXPLORE' && (
        <div className="space-y-2">
          {isCurrentBlackout && (
            <div className="rounded-lg border border-violet-500/45 bg-violet-950/45 px-2.5 py-1 text-[11px] text-violet-200">
              ⚡ {KTX_LOCATION_MAP[currentLoc].shortLabel} đang mất điện 1 vòng — không thể quét
              thiết bị phòng, hãy rút thẻ bài.
            </div>
          )}

          {/* Thao tác hiện trường tại phòng */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="bg-interact-location"
              disabled={pendingAction || isCurrentBlackout}
              onClick={() => onAction({ type: 'INTERACT_LOC', mode: 'scan' })}
              className="flex-1 rounded-xl border border-teal-500/60 bg-teal-950/55 px-3 py-2 text-left font-bold text-teal-100 transition hover:bg-teal-900/70 disabled:opacity-45"
            >
              <div>🔍 {KTX_LOCATION_MAP[currentLoc].actionLabel}</div>
              <div className="mt-0.5 text-[10px] font-normal text-teal-200/85">
                {KTX_LOCATION_MAP[currentLoc].isInfrastructure
                  ? 'Kiểm tra & gỡ Mạch Quá Tải (nếu có), đọc dấu kỹ thuật gần nhất.'
                  : KTX_LOCATION_MAP[currentLoc].description}
              </div>
            </button>

            {isCovertSabotageAvailable && (
              <button
                type="button"
                data-testid="bg-plant-sabotage"
                disabled={pendingAction || isCurrentBlackout}
                onClick={() => onAction({ type: 'INTERACT_LOC', mode: 'sabotage' })}
                className="flex-1 rounded-xl border border-violet-500/70 bg-violet-950/70 px-3 py-2 text-left font-bold text-violet-100 transition hover:bg-violet-900/80 disabled:opacity-45"
              >
                <div>💣 Gài Mạch Quá Tải Ngầm</div>
                <div className="mt-0.5 text-[10px] font-normal text-violet-200/85">
                  Nhật ký công khai chỉ ghi là &ldquo;kiểm tra thiết bị bình thường&rdquo; — chờ sang
                  vòng sau để Kích nổ!
                </div>
              </button>
            )}
          </div>

          {/* 3 bộ bài */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              data-testid="bg-draw-clue"
              disabled={pendingAction}
              onClick={() => onAction({ type: 'DRAW_CARD', deck: 'clue' })}
              className="flex items-center gap-2.5 rounded-xl border border-amber-500/50 bg-amber-950/40 p-2 text-left transition hover:border-amber-400 hover:bg-amber-900/55 disabled:opacity-45"
            >
              <DeckCardBackSvg deck="clue" />
              <div className="min-w-0">
                <div className="font-bold text-amber-200">
                  Điều tra ({publicGame.deckCounts.clue})
                </div>
                <div className="text-[10px] text-amber-100/80">Chứng cứ · Soi dấu</div>
              </div>
            </button>

            <button
              type="button"
              data-testid="bg-draw-event"
              disabled={pendingAction}
              onClick={() => onAction({ type: 'DRAW_CARD', deck: 'event' })}
              className="flex items-center gap-2.5 rounded-xl border border-rose-500/50 bg-rose-950/40 p-2 text-left transition hover:border-rose-400 hover:bg-rose-900/55 disabled:opacity-45"
            >
              <DeckCardBackSvg deck="event" />
              <div className="min-w-0">
                <div className="font-bold text-rose-200">
                  Sự kiện ({publicGame.deckCounts.event})
                </div>
                <div className="text-[10px] text-rose-100/80">Biến cố &amp; Đèn phòng</div>
              </div>
            </button>

            <button
              type="button"
              data-testid="bg-draw-tactic"
              disabled={pendingAction}
              onClick={() => onAction({ type: 'DRAW_CARD', deck: 'tactic' })}
              className="flex items-center gap-2.5 rounded-xl border border-sky-500/50 bg-sky-950/40 p-2 text-left transition hover:border-sky-400 hover:bg-sky-900/55 disabled:opacity-45"
            >
              <DeckCardBackSvg deck="tactic" />
              <div className="min-w-0">
                <div className="font-bold text-sky-200">
                  Chiến thuật ({publicGame.deckCounts.tactic})
                </div>
                <div className="text-[10px] text-sky-100/80">Giữ kín · Hỗ trợ</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Pha 3: TACTICAL_ACTION */}
      {publicGame.turnPhase === 'TACTICAL_ACTION' && (
        <div className="space-y-2.5">
          {/* Chọn mục tiêu (CHỈ HIỂN THỊ VẾT THƯƠNG & KHIÊN CÔNG KHAI, TUYỆT ĐỐI KHÔNG HP GỐC) */}
          <div className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/75 p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-300">
                🎯 Mục tiêu ({inRangeTargets.length} người trong tầm):
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
                    {t.visibleShield > 0 ? ` · 🛡️${t.visibleShield}` : ''})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {aliveTargets.map((t) => {
                const inSameRoom = t.location === currentLoc;
                const inAdjCourt =
                  currentLoc === 'court' && isAdjacentLocation('court', t.location);
                const inRange = inSameRoom || inAdjCourt;
                const selected = (activeTargetObj?.playerId ?? '') === t.playerId;
                return (
                  <button
                    key={t.playerId}
                    type="button"
                    onClick={() => setSelectedTargetId(t.playerId)}
                    className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                      selected
                        ? 'border-amber-400 bg-amber-500/20 text-amber-100 shadow-sm'
                        : inRange
                          ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500'
                          : 'border-slate-800/80 bg-slate-950 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {t.displayName} · 🩹{t.woundsTaken}
                    {t.visibleShield > 0 ? ` · 🛡️${t.visibleShield}` : ''}
                    {inSameRoom ? ' (cùng khu)' : inAdjCourt ? ' (kề sân)' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hàng nút Điều tra có điều kiện / Đối chất / Công kích / Kỹ năng / Âm mưu */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              data-testid="bg-investigate-equip-btn"
              disabled={pendingAction || !activeTargetObj}
              onClick={() =>
                activeTargetObj &&
                onAction({
                  type: 'INVESTIGATE',
                  targetPlayerId: activeTargetObj.playerId,
                  focus: 'equipment',
                })
              }
              className="rounded-lg border border-sky-500/60 bg-sky-950/65 px-2.5 py-1.5 font-semibold text-sky-100 hover:bg-sky-900/80 disabled:opacity-45"
            >
              🧰 Điều tra Trang bị
            </button>

            <button
              type="button"
              data-testid="bg-investigate-act-btn"
              disabled={pendingAction || !activeTargetObj}
              onClick={() =>
                activeTargetObj &&
                onAction({
                  type: 'INVESTIGATE',
                  targetPlayerId: activeTargetObj.playerId,
                  focus: 'activity',
                })
              }
              className="rounded-lg border border-indigo-500/60 bg-indigo-950/65 px-2.5 py-1.5 font-semibold text-indigo-100 hover:bg-indigo-900/80 disabled:opacity-45"
            >
              👣 Điều tra Hành tung
            </button>

            <button
              type="button"
              data-testid="bg-attack-btn"
              disabled={pendingAction || !activeTargetObj}
              onClick={() =>
                activeTargetObj &&
                onAction({ type: 'ATTACK', targetPlayerId: activeTargetObj.playerId })
              }
              className="rounded-lg border border-rose-500/60 bg-rose-950/65 px-2.5 py-1.5 font-semibold text-rose-100 hover:bg-rose-900/80 disabled:opacity-45"
            >
              ⚔️ Công kích (2 ST)
            </button>

            <button
              type="button"
              data-testid="bg-confront-btn"
              disabled={
                pendingAction ||
                !activeTargetObj ||
                !canConfrontNow ||
                Boolean(activeTargetObj?.revealedFaction)
              }
              title="Từ Vòng 3 tại Sảnh/Cầu Dao (hoặc mọi nơi khi đã niêm phong cả Cầu Dao & Phát Thanh): Tạm giữ đúng Màn Sương, sai chịu 2 vết thương trực tiếp!"
              onClick={() =>
                activeTargetObj &&
                onAction({ type: 'CONFRONT', targetPlayerId: activeTargetObj.playerId })
              }
              className="rounded-lg border border-amber-500/70 bg-amber-950/70 px-2.5 py-1.5 font-semibold text-amber-100 hover:bg-amber-900/80 disabled:opacity-40"
            >
              ⚖️ Đối Chất {publicGame.round < 3 ? '(Từ V3)' : ''}
            </button>

            <button
              type="button"
              data-testid="bg-use-skill-btn"
              disabled={
                pendingAction || (privateView?.skillUsed ?? true) && !isCovertSkillActor
              }
              onClick={() => {
                if (isCovertSkillActor || privateView?.revealed) {
                  onAction({
                    type: 'USE_SKILL',
                    targetPlayerId: activeTargetObj?.playerId,
                  });
                } else {
                  setConfirmRevealMode('skill');
                }
              }}
              className="rounded-lg border border-fuchsia-500/60 bg-fuchsia-950/65 px-2.5 py-1.5 font-semibold text-fuchsia-100 hover:bg-fuchsia-900/80 disabled:opacity-45"
            >
              {isCovertSkillActor
                ? '🎭 Gieo nhiễu giả (Ẩn danh)'
                : privateView?.revealed
                  ? '⚡ Kích hoạt Kỹ năng'
                  : '⚡ Lật vai & Kỹ năng'}
            </button>

            {privateView?.faction === 'mist-order' && (
              <button
                type="button"
                data-testid="bg-detonate-btn"
                disabled={pendingAction || !canDetonateNow}
                onClick={() => onAction({ type: 'DETONATE_PLOT' })}
                className="rounded-lg border border-violet-400/75 bg-violet-900/75 px-2.5 py-1.5 font-bold text-white hover:bg-violet-800 disabled:opacity-40"
              >
                💥 Kích Nổ Mạch Quá Tải
              </button>
            )}

            {privateView?.roleId === 'lang-anh-san' && (
              <button
                type="button"
                data-testid="bg-publish-dossier-btn"
                disabled={pendingAction || !canPublishDossier}
                onClick={() => onAction({ type: 'PUBLISH_DOSSIER' })}
                className="rounded-lg border border-emerald-400/75 bg-emerald-900/75 px-2.5 py-1.5 font-bold text-white hover:bg-emerald-800 disabled:opacity-40"
              >
                🎙️ Công Bố Hồ Sơ (V4+)
              </button>
            )}
          </div>

          {/* Bài Chiến thuật đang giữ trên tay */}
          {privateView && privateView.hand.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  🃏 Bài Chiến thuật trên tay ({privateView.hand.length})
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
                        Điểm đến: {loc.shortLabel}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {privateView.hand.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    data-testid={`bg-use-card-${card.id}`}
                    disabled={pendingAction}
                    onClick={() =>
                      onAction({
                        type: 'USE_CARD',
                        cardId: card.id,
                        targetPlayerId: activeTargetObj?.playerId,
                        targetLocation:
                          card.targetMode === 'location' ? cardDestinationLoc : undefined,
                      })
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950/90 p-2 text-left transition hover:border-amber-400 hover:bg-slate-900 disabled:opacity-45"
                  >
                    <div className="flex items-center justify-between gap-1 font-bold text-amber-200">
                      <span>{card.title}</span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] uppercase text-slate-300">
                        Dùng
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] leading-snug text-slate-300">
                      {card.summary}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hộp xác nhận trước khi Lật vai công khai */}
          {confirmRevealMode && (
            <div
              data-testid="bg-reveal-confirm-modal"
              className="rounded-xl border border-orange-400/70 bg-orange-950/75 p-2.5 text-[11px] text-orange-100 shadow-lg"
            >
              <div className="font-bold text-amber-200">
                ⚠️ Xác nhận công khai nhân vật thật?
              </div>
              <p className="mt-0.5 text-orange-200/90">
                Mọi sinh viên tại bàn sẽ thấy nhân vật và phe của bạn ngay lập tức (nhận +1 Khiên
                {confirmRevealMode === 'skill' ? ' và kích hoạt kỹ năng riêng' : ''}).
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  data-testid="bg-confirm-reveal-btn"
                  disabled={pendingAction}
                  onClick={() => {
                    const mode = confirmRevealMode;
                    setConfirmRevealMode(null);
                    if (mode === 'skill') {
                      onAction({
                        type: 'USE_SKILL',
                        targetPlayerId: activeTargetObj?.playerId,
                      });
                    } else {
                      onAction({ type: 'REVEAL_ROLE' });
                    }
                  }}
                  className="rounded-lg bg-orange-600 px-3 py-1 font-bold text-white hover:bg-orange-500"
                >
                  Xác nhận Lật vai
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRevealMode(null)}
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
                onClick={() => setConfirmRevealMode('reveal')}
                className="rounded-lg border border-orange-500/60 bg-orange-950/60 px-2.5 py-1.5 font-semibold text-orange-200 hover:bg-orange-900/75 disabled:opacity-45"
              >
                📢 Lật vai (+1 🛡️)
              </button>
            ) : (
              <span className="text-[11px] font-semibold text-emerald-300">
                ✅ Bạn đã công khai danh tính
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
