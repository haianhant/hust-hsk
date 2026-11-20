'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/BoardGameLeaderboardModal.tsx — Bảng Xếp Hạng CLB
// Board Game "Bóng Đêm KTX" (Tuần & Toàn thời gian, lọc theo 3 phe).
// Module ID: feature.boardgame.leaderboard
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
import { getRoleDesign, isKnownBoardGameRoleId } from '../domain/roles';
import { boardGameClient } from '../network/client';
import {
  type BoardGameLeaderboardEntry,
  type BoardGameLeaderboardFactionFilter,
  type BoardGameLeaderboardPeriod,
  type BoardGameLeaderboardResponse,
} from '../network/contracts';
import { FACTION_THEME, RolePortraitSvg } from './BoardGameArt';

export interface BoardGameLeaderboardModalProps {
  open: boolean;
  onClose: () => void;
}

const PERIOD_TABS: ReadonlyArray<{
  id: BoardGameLeaderboardPeriod;
  label: string;
  subtitle: string;
}> = [
  {
    id: 'alltime',
    label: '🏅 Toàn thời gian',
    subtitle: 'Tổng điểm CLB, số trận thắng & chuỗi thắng cao nhất tại Phòng Sinh Hoạt KTX',
  },
  {
    id: 'weekly',
    label: '🔥 Tuần này',
    subtitle: 'Xếp hạng thi đua hàng tuần (Thứ Hai → Chủ Nhật, múi giờ Việt Nam UTC+7)',
  },
];

const FACTION_TABS: ReadonlyArray<{
  id: BoardGameLeaderboardFactionFilter;
  label: string;
}> = [
  { id: 'all', label: '🌐 Tất cả phe' },
  { id: 'lantern-guard', label: '🔦 Đội Săn Đêm' },
  { id: 'mist-order', label: '🌑 Hội Bóng Đêm' },
  { id: 'wanderer', label: '🎭 Kẻ Độc Hành' },
];

function rankBadge(rank: number): { icon: string; badgeClass: string; cardClass: string } {
  if (rank === 1) {
    return {
      icon: '🥇',
      badgeClass: 'bg-amber-400 text-slate-950 border-amber-300',
      cardClass: 'border-amber-400/70 bg-gradient-to-b from-amber-950/55 to-slate-950/90',
    };
  }
  if (rank === 2) {
    return {
      icon: '🥈',
      badgeClass: 'bg-slate-200 text-slate-950 border-slate-100',
      cardClass: 'border-slate-400/60 bg-gradient-to-b from-slate-800/70 to-slate-950/90',
    };
  }
  if (rank === 3) {
    return {
      icon: '🥉',
      badgeClass: 'bg-orange-400 text-slate-950 border-orange-300',
      cardClass: 'border-orange-400/60 bg-gradient-to-b from-orange-950/45 to-slate-950/90',
    };
  }
  return {
    icon: `#${rank}`,
    badgeClass: 'bg-slate-800 text-slate-200 border-slate-700',
    cardClass: 'border-slate-800 bg-slate-950/75',
  };
}

function getLastRoleBadge(entry: BoardGameLeaderboardEntry) {
  if (!entry.lastRoleId || !isKnownBoardGameRoleId(entry.lastRoleId)) return null;
  const role = getRoleDesign(entry.lastRoleId);
  if (!role) return null;
  const theme = FACTION_THEME[role.faction];
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
      <RolePortraitSvg roleId={role.id} faction={role.faction} size={22} />
      <span className={`truncate font-semibold ${theme.textClass}`}>{role.name}</span>
    </div>
  );
}

export default function BoardGameLeaderboardModal({
  open,
  onClose,
}: BoardGameLeaderboardModalProps) {
  const [period, setPeriod] = useState<BoardGameLeaderboardPeriod>('alltime');
  const [faction, setFaction] = useState<BoardGameLeaderboardFactionFilter>('all');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BoardGameLeaderboardResponse | null>(null);

  const loadLeaderboard = useCallback(
    async (nextPeriod: BoardGameLeaderboardPeriod, nextFaction: BoardGameLeaderboardFactionFilter) => {
      setLoading(true);
      try {
        const res = await boardGameClient.fetchLeaderboard(nextPeriod, nextFaction);
        setData(res);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    void loadLeaderboard(period, faction);
  }, [open, period, faction, loadLeaderboard]);

  if (!open) return null;

  const entries = data?.entries ?? [];
  const topThree = entries.slice(0, 3);
  const myEntry = data?.myEntry ?? entries.find((e) => e.isSelf) ?? null;
  const currentTab = PERIOD_TABS.find((t) => t.id === period) ?? PERIOD_TABS[0];

  return (
    <div
      data-testid="boardgame-leaderboard-backdrop"
      className="fixed inset-0 z-[56] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        data-testid="boardgame-leaderboard-modal"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-amber-400/45 bg-slate-900 text-slate-100 shadow-2xl"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-gradient-to-r from-amber-950/55 via-slate-900 to-indigo-950/55 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-base font-black text-amber-300 sm:text-lg">
              🏆 Bảng Xếp Hạng CLB Board Game — Bóng Đêm KTX
            </h2>
            <p className="text-xs text-slate-300">{currentTab.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="bg-refresh-leaderboard-btn"
              onClick={() => void loadLeaderboard(period, faction)}
              disabled={loading}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? '⏳ Đang tải...' : '🔄 Làm mới'}
            </button>
            <button
              type="button"
              data-testid="bg-close-leaderboard-btn"
              onClick={onClose}
              className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-100 hover:bg-slate-700"
            >
              ✕ Đóng
            </button>
          </div>
        </div>

        {/* Filter bar: Kỳ xếp hạng & Phe */}
        <div className="flex flex-col gap-2 border-b border-slate-800 bg-slate-950/70 px-4 py-2.5 sm:px-5">
          <div className="flex flex-wrap items-center gap-1.5">
            {PERIOD_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                data-testid={`bg-leaderboard-tab-${tab.id}`}
                onClick={() => setPeriod(tab.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                  period === tab.id
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {FACTION_TABS.map((ft) => (
              <button
                key={ft.id}
                type="button"
                data-testid={`bg-leaderboard-faction-${ft.id}`}
                onClick={() => setFaction(ft.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                  faction === ft.id
                    ? 'bg-cyan-400 text-slate-950'
                    : 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {ft.label}
              </button>
            ))}
          </div>
        </div>

        {/* Nội dung có thể cuộn */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs sm:p-5">
          {/* Tóm tắt thành tích cá nhân */}
          <div
            data-testid="bg-leaderboard-my-summary"
            className="rounded-2xl border border-cyan-500/40 bg-cyan-950/25 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2"
          >
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                Thành tích của bạn ({period === 'weekly' ? 'Tuần này' : 'Toàn thời gian'})
              </div>
              {myEntry ? (
                <div className="mt-0.5 text-sm font-black text-white">
                  Hạng #{myEntry.rank} · {myEntry.ratingPoints} điểm CLB · {myEntry.wins}/
                  {myEntry.matchesPlayed} trận thắng ({myEntry.winRatePct}%)
                </div>
              ) : (
                <div className="mt-0.5 text-xs text-slate-300">
                  Chưa có ván hoàn tất nào được ghi nhận — hãy hoàn thành 1 trận Bóng Đêm KTX để lên bảng!
                </div>
              )}
            </div>
            {myEntry && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                <span className="rounded-lg bg-slate-900 px-2 py-1 text-emerald-300">
                  🔦 {myEntry.hunterWins}
                </span>
                <span className="rounded-lg bg-slate-900 px-2 py-1 text-rose-300">
                  🌑 {myEntry.shadowWins}
                </span>
                <span className="rounded-lg bg-slate-900 px-2 py-1 text-amber-300">
                  🎭 {myEntry.wandererWins}
                </span>
                <span className="rounded-lg bg-slate-900 px-2 py-1 text-orange-300">
                  🔥 Chuỗi max: {myEntry.bestWinStreak}
                </span>
              </div>
            )}
          </div>

          {entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-center text-slate-300">
              {loading
                ? 'Đang tải dữ liệu xếp hạng từ máy chủ CLB...'
                : 'Chưa có trận đấu hoàn tất nào trong kỳ này. Hãy rủ 4–8 bạn cùng chơi 1 ván để khai trương bảng vàng!'}
            </div>
          ) : (
            <>
              {/* Podium Top 3 */}
              <div
                data-testid="bg-leaderboard-podium"
                className="grid grid-cols-1 gap-2 sm:grid-cols-3"
              >
                {topThree.map((item) => {
                  const st = rankBadge(item.rank);
                  return (
                    <div
                      key={item.playerKey}
                      className={`rounded-2xl border p-3 space-y-1.5 ${st.cardClass} ${
                        item.isSelf ? 'ring-2 ring-cyan-400/70' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-black ${st.badgeClass}`}
                        >
                          {st.icon}
                        </span>
                        <span className="text-sm font-black text-amber-300">
                          {item.ratingPoints} đ
                        </span>
                      </div>
                      <div className="truncate text-sm font-black text-white">
                        {item.displayName}
                        {item.isSelf ? ' (Bạn)' : ''}
                      </div>
                      {getLastRoleBadge(item)}
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-300 pt-1 border-t border-white/10">
                        <span>
                          🏆 {item.wins}/{item.matchesPlayed} ({item.winRatePct}%)
                        </span>
                        <span>🔥 Chuỗi {item.bestWinStreak}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Danh sách chi tiết */}
              <div data-testid="bg-leaderboard-list" className="space-y-1.5">
                {entries.map((entry) => {
                  const st = rankBadge(entry.rank);
                  return (
                    <div
                      key={entry.playerKey}
                      data-testid="bg-leaderboard-row"
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                        entry.isSelf
                          ? 'border-cyan-400/70 bg-cyan-950/30'
                          : 'border-slate-800 bg-slate-950/75'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={`inline-flex h-7 min-w-[32px] items-center justify-center rounded-lg border px-1.5 text-xs font-black ${st.badgeClass}`}
                        >
                          {st.icon}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-extrabold text-white">
                            {entry.displayName}
                            {entry.isSelf ? ' (Bạn)' : ''}
                          </div>
                          {getLastRoleBadge(entry)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                        <span className="rounded-lg bg-slate-900 px-2 py-1 text-emerald-300">
                          🔦 {entry.hunterWins}
                        </span>
                        <span className="rounded-lg bg-slate-900 px-2 py-1 text-rose-300">
                          🌑 {entry.shadowWins}
                        </span>
                        <span className="rounded-lg bg-slate-900 px-2 py-1 text-amber-300">
                          🎭 {entry.wandererWins}
                        </span>
                        <span
                          className="rounded-lg bg-slate-900 px-2 py-1 text-slate-200"
                          title="Số mạng hạ gục / Tỷ lệ thắng"
                        >
                          ⚔️ {entry.eliminationsDealt} · 🏆 {entry.wins}/{entry.matchesPlayed} ({entry.winRatePct}%)
                        </span>
                        <span className="rounded-lg bg-amber-500/20 border border-amber-400/40 px-2.5 py-1 text-amber-200">
                          {entry.ratingPoints} đ
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <p className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-400">
            📏 <strong>Quy tắc tính Điểm CLB:</strong> Hoàn thành trận +5đ · Thắng phe Săn Đêm / Bóng Đêm +25đ ·
            Thắng vai Độc Hành +30đ · Mỗi mạng hạ gục +3đ · Sống sót cuối ván +2đ. Tên sinh viên được ẩn MSSV tuyệt đối.
          </p>
        </div>
      </div>
    </div>
  );
}
