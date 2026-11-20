'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/RoleCard.tsx — Thẻ Vai Trò Bí Mật Bóng Đêm KTX v4
// Đọc rõ ràng (13px–16px), bảo vệ úp thẻ khi chơi cạnh người khác, kèm Kho Trang Bị & Mật Báo.
// ---------------------------------------------------------------------------

import React from 'react';
import { getCardById } from '@/features/boardgame/domain/cards';
import { FACTION_LABELS, getRoleDesign } from '@/features/boardgame/domain/roles';
import type {
  BoardGamePrivateGameView,
  BoardGamePublicGameView,
  BoardGamePublicPlayerView,
} from '@/shared/contracts/boardgame';
import {
  FACTION_THEME,
  FactionCrestSvg,
  LOCATION_VISUAL_META,
  PlayerPawnToken,
  ROLE_VISUAL_META,
  RolePortraitSvg,
} from './BoardGameArt';
import {
  MIDNIGHT_CARD_ART,
  type ActionCardZone,
} from './midnight-noir-tokens';
import { MidnightCharacterCard } from './MidnightCharacterCard';

export interface RoleCardProps {
  publicGame: BoardGamePublicGameView;
  privateView: BoardGamePrivateGameView | null;
  isSpectator: boolean;
  section?: 'all' | 'character' | 'gear';
  selfPlayerId?: string | null;
  visualStyle?: 'classic' | 'midnight-noir';
  reducedMotion?: boolean;
  foilEnabled?: boolean;
  onZoomRole?: () => void;
  onZoomRevealedRole?: (player: BoardGamePublicPlayerView) => void;
  onZoomCard?: (cardId: string, zone?: ActionCardZone) => void;
}

export const RoleCard = React.memo(function RoleCard({
  publicGame,
  privateView,
  isSpectator,
  section = 'all',
  selfPlayerId = null,
  visualStyle = 'midnight-noir',
  reducedMotion = false,
  foilEnabled = true,
  onZoomRole,
  onZoomRevealedRole,
  onZoomCard,
}: RoleCardProps) {
  const renderTableEquipmentOverview = () => (
    <div className="rounded-xl bg-slate-950/85 border border-slate-800 p-2.5 space-y-2">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-300">
        🧾 Trang bị &amp; Sinh tồn toàn bàn ({publicGame.players.length})
      </p>
      <div className="space-y-1.5">
        {publicGame.players.map((p) => {
          const isSelf = p.playerId === selfPlayerId;
          const isActive = p.playerId === publicGame.activePlayerId;
          const locMeta = LOCATION_VISUAL_META[p.location];
          const pFactionTheme = p.revealedFaction ? FACTION_THEME[p.revealedFaction] : null;
          return (
            <div
              key={p.playerId}
              className={`rounded-lg border px-2 py-1.5 space-y-1 ${
                !p.alive
                  ? 'opacity-55 border-slate-800 bg-slate-950/60'
                  : isSelf
                    ? 'border-cyan-500/45 bg-cyan-950/25'
                    : isActive
                      ? 'border-amber-400/50 bg-slate-900/90'
                      : 'border-slate-800 bg-slate-900/75'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <PlayerPawnToken
                    compact
                    elevated={false}
                    displayName={p.displayName}
                    seatIndex={p.seatIndex}
                    alive={p.alive}
                    isActive={isActive}
                    isSelf={isSelf}
                    revealedFaction={p.revealedFaction}
                    revealedRoleId={p.revealedRoleId}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {p.displayName}
                      {isSelf ? ' (Bạn)' : ''}
                    </p>
                    <p
                      className={`text-[10px] font-semibold truncate ${
                        pFactionTheme ? pFactionTheme.textClass : 'text-slate-400'
                      }`}
                    >
                      {p.revealedFaction
                        ? `${FACTION_LABELS[p.revealedFaction]} · Ô ${locMeta.diceLabel}`
                        : `Vai ẩn · Ô ${locMeta.diceLabel}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 text-[10px] font-bold">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-rose-200">
                    🩸 {p.woundsTaken}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
                    🃏 {p.handCount}
                  </span>
                </div>
              </div>

              {(p.revealedRoleId || p.equipped.length > 0 || p.guardianShieldActive) && (
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  {p.guardianShieldActive && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/35">
                      🛡️ Khiên bảo vệ
                    </span>
                  )}
                  {p.revealedRoleId && onZoomRevealedRole && (
                    <button
                      type="button"
                      onClick={() => onZoomRevealedRole(p)}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/75 border border-amber-400/45 text-amber-200 hover:bg-amber-900/75 cursor-pointer"
                    >
                      🔍 Soi vai
                    </button>
                  )}
                  {p.equipped.map((eq, idx) => (
                    <button
                      key={`${eq.id}-${idx}`}
                      type="button"
                      onClick={() => onZoomCard?.(eq.id, 'equipped-table')}
                      title={`${eq.summary} (Bấm để phóng lớn)`}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-950/80 border border-sky-500/40 text-sky-200 hover:border-sky-300 truncate max-w-full cursor-pointer"
                    >
                      🎒 {eq.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (section === 'gear' && (isSpectator || !privateView)) {
    return (
      <aside data-testid="bg-sidebar-gear-panel" className="space-y-2.5 text-slate-100">
        {renderTableEquipmentOverview()}
      </aside>
    );
  }

  if (isSpectator || !privateView) {
    return (
      <aside
        data-testid="bg-role-card"
        className="rounded-2xl border border-slate-700/70 bg-slate-900/90 p-4 text-slate-200"
      >
        <div data-testid="bg-spectator-role-placeholder" className="flex items-center gap-3 mb-2">
          <FactionCrestSvg faction={null} size={30} />
          <div>
            <p className="text-sm font-bold text-cyan-200">Chế độ Khán Giả</p>
            <p className="text-xs text-slate-400">
              Danh tính bí mật được ẩn hoàn toàn cho đến khi hết ván.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
          <div className="rounded-xl bg-slate-950/80 p-2 text-center">
            <p className="font-bold text-emerald-300">Khám Phá</p>
            <p className="text-base font-black text-white">{publicGame.deckCounts.investigation}</p>
          </div>
          <div className="rounded-xl bg-slate-950/80 p-2 text-center">
            <p className="font-bold text-cyan-300">Cung Ứng</p>
            <p className="text-base font-black text-white">{publicGame.deckCounts.equipment}</p>
          </div>
          <div className="rounded-xl bg-slate-950/80 p-2 text-center">
            <p className="font-bold text-rose-300">Đột Kích</p>
            <p className="text-base font-black text-white">{publicGame.deckCounts.event}</p>
          </div>
        </div>
      </aside>
    );
  }

  const roleDesign = getRoleDesign(privateView.roleId);
  const roleMeta = ROLE_VISUAL_META[privateView.roleId];
  const factionTheme = FACTION_THEME[privateView.faction];
  const hpPct = Math.max(0, Math.min(100, (privateView.hp / privateView.maxHp) * 100));

  const skillStatusLabel = !privateView.revealed
    ? privateView.roleId === 'lang-tien-phong'
      ? 'Tự lộ khi có người ngã'
      : privateView.roleId === 'exp1_fallen' && privateView.hp < 8
        ? 'Cần ≥ 8 HP để tự lật'
        : privateView.roleId === 'exp1_wendigo' ||
            privateView.roleId === 'exp1_undying' ||
            privateView.roleId === 'exp1_cindy'
          ? 'Sẵn sàng lật phản ứng'
          : 'Cần lật vai'
    : privateView.roleId === 'exp1_fallen'
      ? privateView.hp >= 8
        ? 'Đang bật (+2 ST đánh trúng)'
        : 'Tắt (< 8 HP)'
      : privateView.roleId === 'exp1_fea'
        ? 'Sẵn sàng khi đổ di chuyển'
        : privateView.roleId === 'exp2_eleanor'
          ? 'Pha 3: Rút thẻ Xanh thay đánh'
          : privateView.roleId === 'exp2_fujiko'
            ? 'Nội tại (Kết liễu lộ diện ≤ 4 HP)'
            : privateView.roleId === 'exp1_udi'
              ? 'Nội tại (Miễn đánh khi ≥ 2 cùng Cụm)'
              : privateView.roleId === 'exp1_wrath'
                ? 'Đầu lượt (2 ST cùng Cụm)'
                : privateView.roleId === 'exp1_vengeance'
                  ? privateView.skillUsedOnce
                    ? 'Đã dùng (1 lần/trận)'
                    : 'Sẵn sàng khi hạ gục (1d4 x2)'
                  : privateView.roleId === 'exp2_visions'
                    ? privateView.skillUsedOnce
                      ? 'Dấu ấn đang trừ 1 HP/lượt'
                      : 'Đầu lượt (Đặt dấu ấn 1 lần/trận)'
                    : privateView.roleId === 'exp2_cruz'
                      ? 'Sẵn sàng khi rút thẻ Đen'
                      : privateView.roleId === 'exp2_bryon'
                        ? 'Pha 3 trước đánh: Tặng đồ Neutral'
                        : privateView.roleId === 'exp1_victor'
      ? privateView.hp >= 2
        ? 'Sẵn sàng (Trả 1 HP → +2 ST)'
        : 'Cần ≥ 2 HP'
      : privateView.roleId === 'exp2_fiona' ||
          privateView.roleId === 'exp1_gayle' ||
          privateView.roleId === 'exp1_elysia'
        ? 'Sẵn sàng khi tấn công'
        : privateView.roleId === 'exp1_felicia'
          ? 'Sẵn sàng khi rút Trắng/Đen'
          : privateView.roleId === 'exp2_gloria'
            ? 'Sẵn sàng khi vào Sảnh (6)'
            : privateView.roleId === 'exp2_father_harrison'
              ? 'Pha di chuyển → Sảnh (6)'
              : privateView.roleId === 'exp1_bipolar'
                ? privateView.skillUsedOnce
                  ? 'Đã dùng (1 lần/trận)'
                  : 'Đầu lượt (d4+2 hồi/ST)'
                : privateView.roleId === 'exp2_g43' ||
                    privateView.roleId === 'exp2_wyvern' ||
                    privateView.roleId === 'exp1_wendigo' ||
                    privateView.roleId === 'exp1_undying' ||
                    privateView.roleId === 'exp2_unchained' ||
                    privateView.roleId === 'exp2_warlock' ||
                    privateView.roleId === 'exp2_witch' ||
                    privateView.roleId === 'exp1_cindy'
                  ? 'Nội tại đang kích hoạt'
                  : roleDesign.targetMode === 'passive'
                    ? 'Nội tại'
                    : roleDesign.oncePerMatch && privateView.skillUsedOnce
                      ? 'Đã dùng'
                      : privateView.skillCooldown > 0
                        ? `Hồi ${privateView.skillCooldown} vòng`
                        : 'Sẵn sàng';

  const characterDetailsBlocks = (
    <>
      {/* Mục tiêu thắng */}
      <div className="rounded-xl bg-slate-950/85 border border-slate-800 p-2.5 sm:p-3">
        <p className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-amber-300 mb-1">
          🎯 Điều kiện chiến thắng
        </p>
        <p className="text-xs sm:text-sm text-slate-100 leading-snug">{privateView.secretGoalText}</p>
        {privateView.roleId === 'lang-anh-san' && (
          <p className="text-xs font-bold text-amber-300 mt-1.5">
            Tiến độ thắng (Hải): {privateView.equipped.length} / 5 món
          </p>
        )}
        {privateView.roleId === 'lang-cuu-ho' && (
          <p className="text-xs font-bold text-orange-300 mt-1.5">
            💀 Tổng người đã gục trên bàn: {publicGame.deadCount} / 3+ (giết từ xác thứ 3 để thắng!)
          </p>
        )}
        {privateView.roleId === 'lang-tien-phong' && (
          <p className="text-xs font-bold text-teal-300 mt-1.5">
            {publicGame.deadCount === 0
              ? '⚡ Chưa ai gục — nếu bạn gục ĐẦU TIÊN, bạn thắng ngay lập tức!'
              : `🗣️ Đã có ${publicGame.deadCount} người gục — đồng hành cùng Đội Săn Đêm tới cuối trận!`}
          </p>
        )}
      </div>

      {/* Kỹ năng nhân vật */}
      <div className="rounded-xl bg-slate-950/85 border border-slate-800 p-2.5 sm:p-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-cyan-300">
            ✨ Kỹ năng: {roleDesign.skillName}
          </p>
          <span className="text-[11px] sm:text-xs font-bold text-slate-300 shrink-0">{skillStatusLabel}</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-200 leading-snug">{roleDesign.skillSummary}</p>
      </div>
    </>
  );

  const gearAndCluesBlocks = (
    <>
      {/* Trang bị đang đeo */}
      <div className="rounded-xl bg-slate-950/85 border border-slate-800 p-2.5 sm:p-3">
        <p className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-sky-300 mb-1.5">
          🎒 Trang bị đang đeo ({privateView.equipped.length})
        </p>
        {privateView.equipped.length === 0 ? (
          <p className="text-xs text-slate-400">Chưa trang bị món nào — rút thẻ Cung Ứng xanh để đeo tự động.</p>
        ) : (
          <div className="space-y-1.5">
            {privateView.equipped.map((eq, i) => {
              const full = getCardById(eq.id) ?? eq;
              const thumbSrc = MIDNIGHT_CARD_ART[full.id] ?? null;
              return (
                <div
                  key={`${eq.id}-${i}`}
                  className="rounded-lg bg-slate-900 border border-slate-700/80 px-2.5 py-2 flex items-start gap-2.5"
                >
                  {thumbSrc && (
                    <img
                      src={thumbSrc}
                      alt={full.title}
                      width={600}
                      height={900}
                      loading="lazy"
                      decoding="async"
                      className="h-12 w-8 shrink-0 rounded-md border border-sky-400/40 object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="text-xs font-bold text-sky-200 truncate">{full.title}</p>
                      {onZoomCard && (
                        <button
                          type="button"
                          onClick={() => onZoomCard(full.id, 'equipped-table')}
                          aria-label={`Phóng lớn ${full.title}`}
                          className="shrink-0 rounded border border-sky-400/40 bg-slate-950 px-1.5 py-0.5 text-[10px] font-bold text-sky-200 hover:bg-sky-950 cursor-pointer"
                        >
                          🔍 Soi
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-snug">{full.summary}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mật báo điều tra riêng 1-đối-1 */}
      <div className="rounded-xl bg-slate-950/85 border border-slate-800 p-2.5 sm:p-3">
        <p className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-emerald-300 mb-1.5">
          🔍 Mật báo riêng ({privateView.privateClues.length})
        </p>
        {privateView.privateClues.length === 0 ? (
          <p className="text-xs text-slate-400">
            Chưa có mật báo. Đưa Thẻ Khám Phá Kín để suy luận phe thật!
          </p>
        ) : (
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {[...privateView.privateClues].reverse().map((clue) => (
              <div
                key={clue.id}
                className={`rounded-lg px-2.5 py-2 border text-xs ${
                  clue.outcome === 'condition-met'
                    ? 'bg-amber-950/50 border-amber-500/40 text-amber-100'
                    : 'bg-slate-900 border-slate-700/70 text-slate-300'
                }`}
              >
                <p className="font-bold">
                  Vòng {clue.round} · {clue.targetName}
                </p>
                <p className="leading-snug mt-0.5">{clue.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (section === 'gear') {
    return (
      <aside data-testid="bg-sidebar-gear-panel" className="space-y-2.5 text-slate-100">
        {gearAndCluesBlocks}
        {renderTableEquipmentOverview()}
      </aside>
    );
  }

  return (
    <aside
      data-testid="bg-role-card"
      className={`rounded-2xl border ${factionTheme.borderClass} bg-slate-900/95 ${
        section === 'character' ? 'p-3 gap-2.5' : 'p-4 gap-3'
      } text-slate-100 ${factionTheme.cardGlow} flex flex-col`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-300">
          Thẻ Nhân Vật
        </span>
        <span
          className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
            privateView.revealed
              ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50'
              : 'bg-slate-800 text-slate-300 border-slate-600'
          }`}
        >
          {privateView.revealed ? '🔓 Đã lộ toàn bàn' : '🔒 Riêng tư trên máy'}
        </span>
      </div>

      <div data-testid="bg-role-card-secret" className={section === 'character' ? 'space-y-2.5' : 'space-y-3'}>
        {visualStyle === 'midnight-noir' ? (
          <div className={`mx-auto w-full ${section === 'character' ? 'max-w-[232px] xl:max-w-[254px]' : 'max-w-[272px]'}`}>
            <MidnightCharacterCard
              roleId={privateView.roleId}
              revealed={privateView.revealed}
              viewerMode="owner-peek"
              woundsTaken={privateView.woundsTaken}
              currentHp={privateView.hp}
              priority
              foilEnabled={foilEnabled}
              reducedMotion={reducedMotion}
              showGoalFooter={false}
              onZoom={onZoomRole}
            />
          </div>
        ) : (
          <>
            {/* Chân dung nhân vật + Phe */}
            <div className="flex items-center gap-3">
              <RolePortraitSvg roleId={privateView.roleId} faction={privateView.faction} size={52} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${factionTheme.badgeBg}`}>
                    {factionTheme.label}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                      privateView.revealed
                        ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50'
                        : 'bg-slate-800 text-slate-300 border-slate-600'
                    }`}
                  >
                    {privateView.revealed ? 'Đã lộ diện' : 'Đang ẩn vai'}
                  </span>
                </div>
                <h3 className="text-base font-black text-white mt-1 leading-tight">
                  {privateView.roleName}
                </h3>
                <p className="text-xs text-slate-400">{roleMeta.title}</p>
              </div>
            </div>

            {/* Thanh Máu HP & Thương tích */}
            <div className="rounded-xl bg-slate-950/85 border border-slate-800 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300">Sinh lực (HP)</span>
                <span className="text-sm font-black text-emerald-300">
                  {privateView.hp} / {privateView.maxHp}{' '}
                  <span className="text-rose-300 font-semibold">
                    ({privateView.woundsTaken} vết thương)
                  </span>
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${hpPct}%` }}
                  className={`h-full rounded-full transition-all ${
                    hpPct > 55 ? 'bg-emerald-500' : hpPct > 28 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                />
              </div>
            </div>
          </>
        )}

        {characterDetailsBlocks}
        {section === 'all' && gearAndCluesBlocks}
      </div>
    </aside>
  );
});

export default RoleCard;
