'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/RoleCard.tsx — Thẻ Vai Trò Bí Mật Bóng Đêm KTX v4
// Đọc rõ ràng (13px–16px), bảo vệ úp thẻ khi chơi cạnh người khác, kèm Kho Trang Bị & Mật Báo.
// ---------------------------------------------------------------------------

import React from 'react';
import { getCardById } from '@/features/boardgame/domain/cards';
import { getRoleDesign } from '@/features/boardgame/domain/roles';
import type {
  BoardGamePrivateGameView,
  BoardGamePublicGameView,
} from '@/shared/contracts/boardgame';
import {
  FACTION_THEME,
  FactionCrestSvg,
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
  visualStyle?: 'classic' | 'midnight-noir';
  reducedMotion?: boolean;
  foilEnabled?: boolean;
  onZoomRole?: () => void;
  onZoomCard?: (cardId: string, zone?: ActionCardZone) => void;
}

export const RoleCard = React.memo(function RoleCard({
  publicGame,
  privateView,
  isSpectator,
  visualStyle = 'midnight-noir',
  reducedMotion = false,
  foilEnabled = true,
  onZoomRole,
  onZoomCard,
}: RoleCardProps) {
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
      : 'Cần lật vai'
    : roleDesign.targetMode === 'passive'
      ? 'Nội tại'
      : roleDesign.oncePerMatch && privateView.skillUsedOnce
        ? 'Đã dùng'
        : privateView.skillCooldown > 0
          ? `Hồi ${privateView.skillCooldown} vòng`
          : 'Sẵn sàng';

  const sharedDetailsBlocks = (
    <>
      {/* Mục tiêu thắng */}
      <div className="rounded-xl bg-slate-950/85 border border-slate-800 p-3">
        <p className="text-xs font-extrabold uppercase tracking-wider text-amber-300 mb-1">
          🎯 Điều kiện chiến thắng
        </p>
        <p className="text-sm text-slate-100 leading-snug">{privateView.secretGoalText}</p>
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
      <div className="rounded-xl bg-slate-950/85 border border-slate-800 p-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
            ✨ Kỹ năng: {roleDesign.skillName}
          </p>
          <span className="text-xs font-bold text-slate-300">{skillStatusLabel}</span>
        </div>
        <p className="text-sm text-slate-200 leading-snug">{roleDesign.skillSummary}</p>
      </div>

      {/* Trang bị đang đeo */}
      <div className="rounded-xl bg-slate-950/85 border border-slate-800 p-3">
        <p className="text-xs font-extrabold uppercase tracking-wider text-sky-300 mb-1.5">
          🎒 Trang bị đang đeo ({privateView.equipped.length})
        </p>
        {privateView.equipped.length === 0 ? (
          <p className="text-xs text-slate-400">Chưa trang bị món nào.</p>
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
      <div className="rounded-xl bg-slate-950/85 border border-slate-800 p-3">
        <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-300 mb-1.5">
          🔍 Mật báo riêng ({privateView.privateClues.length})
        </p>
        {privateView.privateClues.length === 0 ? (
          <p className="text-xs text-slate-400">
            Chưa có mật báo. Đưa Thẻ Khám Phá Kín để suy luận phe thật!
          </p>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
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

  return (
    <aside
      data-testid="bg-role-card"
      className={`rounded-2xl border ${factionTheme.borderClass} bg-slate-900/95 p-4 text-slate-100 ${factionTheme.cardGlow} flex flex-col gap-3`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
          Thẻ Nhân Vật Của Bạn
        </span>
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
            privateView.revealed
              ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50'
              : 'bg-slate-800 text-slate-300 border-slate-600'
          }`}
        >
          {privateView.revealed ? '🔓 Đã lộ toàn bàn' : '🔒 Riêng tư trên máy bạn'}
        </span>
      </div>

      <div data-testid="bg-role-card-secret" className="space-y-3">
        {visualStyle === 'midnight-noir' ? (
          <div className="mx-auto w-full max-w-[272px]">
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

        {sharedDetailsBlocks}
      </div>
    </aside>
  );
});

export default RoleCard;
