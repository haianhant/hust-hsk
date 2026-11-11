'use client';

// ---------------------------------------------------------------------------
// features/study/ui/StudyLeaderboardModal.tsx — Bảng Xếp Hạng Giờ Học Bách Khoa
// (Cloudflare Durable Object SQLite + Wall-Clock Pomodoro Study Sync).
// Module ID: feature.study.leaderboard
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  multiplayer,
  type LeaderboardPeriod,
  type StudyLeaderboardEntry,
  type StudyLeaderboardResponse,
} from '../../../lib/multiplayer';
import {
  formatStudyDurationVi,
  formatStudyHoursShort,
} from '../../../shared/contracts/study';
import {
  computeLocalStudyLeaderboardStats,
  type StudySessionState,
} from '../study-session/session';

export interface StudyLeaderboardModalProps {
  open: boolean;
  session: StudySessionState;
  onClose: () => void;
  onOpenStudyPanel?: () => void;
}

const PERIOD_TABS: ReadonlyArray<{
  id: LeaderboardPeriod;
  label: string;
  subtitle: string;
}> = [
  {
    id: 'daily',
    label: '🔥 Hôm nay',
    subtitle: 'Xếp hạng giờ tự học trong ngày (Múi giờ Việt Nam UTC+7)',
  },
  {
    id: 'weekly',
    label: '📅 Tuần này',
    subtitle: 'Tổng thời gian tập trung Pomodoro từ Thứ Hai đến Chủ Nhật',
  },
  {
    id: 'alltime',
    label: '🏅 Toàn thời gian',
    subtitle: 'Bảng vàng tích lũy giờ tự học tại Thư viện Tạ Quang Bửu',
  },
];

function rankMedal(rank: number): { icon: string; badgeClass: string; ringClass: string } {
  if (rank === 1) {
    return {
      icon: '🥇',
      badgeClass: 'bg-amber-400 text-amber-950 border-amber-300',
      ringClass: 'border-amber-300 bg-gradient-to-b from-amber-50 to-white shadow-md',
    };
  }
  if (rank === 2) {
    return {
      icon: '🥈',
      badgeClass: 'bg-slate-200 text-slate-800 border-slate-300',
      ringClass: 'border-slate-300 bg-gradient-to-b from-slate-50 to-white shadow-sm',
    };
  }
  if (rank === 3) {
    return {
      icon: '🥉',
      badgeClass: 'bg-orange-200 text-orange-950 border-orange-300',
      ringClass: 'border-orange-200 bg-gradient-to-b from-orange-50/70 to-white shadow-sm',
    };
  }
  return {
    icon: `#${rank}`,
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-200',
    ringClass: 'border-stone-200 bg-white',
  };
}

export function StudyLeaderboardModal({
  open,
  session,
  onClose,
  onOpenStudyPanel,
}: StudyLeaderboardModalProps) {
  const [period, setPeriod] = useState<LeaderboardPeriod>('daily');
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<StudyLeaderboardResponse | null>(null);

  const localStats = useMemo(
    () => computeLocalStudyLeaderboardStats(session, Date.now()),
    [session],
  );

  const loadLeaderboard = useCallback(
    async (targetPeriod: LeaderboardPeriod) => {
      setLoading(true);
      try {
        const currentLocal = computeLocalStudyLeaderboardStats(session, Date.now());
        const res = await multiplayer.fetchLeaderboard(targetPeriod, currentLocal);
        setData(res);
      } finally {
        setLoading(false);
      }
    },
    [session],
  );

  useEffect(() => {
    if (!open) return;
    void loadLeaderboard(period);
  }, [open, period, loadLeaderboard]);

  if (!open) return null;

  const entries: StudyLeaderboardEntry[] = data?.entries ?? [];
  const topThree = entries.slice(0, 3);
  const myEntry = data?.myEntry ?? entries.find((e) => e.isSelf) ?? null;
  const currentTabInfo = PERIOD_TABS.find((t) => t.id === period) ?? PERIOD_TABS[0];

  const myFocusSeconds =
    myEntry?.focusSeconds ??
    (period === 'daily'
      ? localStats.dailyFocusSeconds
      : period === 'weekly'
        ? localStats.weeklyFocusSeconds
        : localStats.totalFocusSeconds);

  return (
    <div
      data-testid="study-leaderboard-backdrop"
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-xs sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Bảng xếp hạng giờ học Bách khoa"
    >
      <div
        data-testid="study-leaderboard-modal"
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-[#FAF7F2] text-[#1c2b1f] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-stone-200 bg-gradient-to-r from-[#8E1B20] via-[#A54432] to-[#B85435] px-5 py-4 text-white sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold tracking-tight sm:text-xl">
                🏆 Bảng Xếp Hạng Giờ Học Bách Khoa
              </h2>
              <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-300/25 px-2.5 py-0.5 text-[11px] font-bold text-amber-100 ring-1 ring-amber-200/40">
                SQLite Cloud Sync
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-white/85">{currentTabInfo.subtitle}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              data-testid="leaderboard-refresh-btn"
              onClick={() => void loadLeaderboard(period)}
              disabled={loading}
              className="shrink-0 whitespace-nowrap rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/25 disabled:opacity-50"
              title="Làm mới bảng xếp hạng"
            >
              {loading ? '⏳ Đang tải...' : '🔄 Làm mới'}
            </button>
            <button
              type="button"
              data-testid="close-study-leaderboard"
              onClick={onClose}
              aria-label="Đóng bảng xếp hạng"
              className="shrink-0 whitespace-nowrap rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-bold text-white transition hover:bg-white/25"
            >
              ✕ Đóng
            </button>
          </div>
        </div>

        {/* Period Tabs */}
        <div className="flex items-center justify-between gap-2 border-b border-stone-200 bg-stone-100/90 px-4 py-2.5 sm:px-5">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist">
            {PERIOD_TABS.map((tab) => {
              const active = period === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={`leaderboard-tab-${tab.id}`}
                  onClick={() => setPeriod(tab.id)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-extrabold transition sm:text-sm ${
                    active
                      ? 'bg-[#A54432] text-white shadow-sm'
                      : 'bg-white text-stone-700 hover:bg-stone-200/70'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {data && (
            <span className="hidden shrink-0 whitespace-nowrap text-xs font-semibold text-stone-500 sm:inline">
              👥 {data.totalStudents} sinh viên tham gia
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {/* Thẻ thành tích cá nhân của bạn */}
          <section
            data-testid="leaderboard-my-summary"
            className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 p-3.5 shadow-xs sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center whitespace-nowrap rounded-2xl bg-[#A54432] text-sm font-black text-white shadow-xs">
                {myEntry ? `#${myEntry.rank}` : 'SV'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-extrabold text-stone-900">
                    {myEntry ? `${myEntry.name} (Bạn)` : 'Thành tích tự học của bạn'}
                  </span>
                  {myEntry?.cohortBadge && (
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-200/70 px-2 py-0.5 text-[11px] font-bold text-amber-950">
                      {myEntry.cohortBadge}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-600">
                  <span className="whitespace-nowrap">
                    ⏱️ Đã tập trung:{' '}
                    <strong className="font-extrabold tabular-nums text-[#A54432]">
                      {formatStudyDurationVi(myFocusSeconds)}
                    </strong>
                  </span>
                  <span className="text-stone-400">·</span>
                  <span className="whitespace-nowrap tabular-nums">
                    🍅 {Math.max(myEntry?.completedBlocks ?? 0, localStats.completedBlocks)} hiệp Pomodoro
                  </span>
                  <span className="text-stone-400">·</span>
                  <span className="whitespace-nowrap tabular-nums">
                    🔥 Chuỗi {myEntry?.streakDays ?? 1} ngày
                  </span>
                </div>
              </div>
            </div>

            {onOpenStudyPanel && (
              <button
                type="button"
                data-testid="leaderboard-open-study-btn"
                onClick={() => {
                  onClose();
                  onOpenStudyPanel();
                }}
                className="shrink-0 self-start whitespace-nowrap rounded-full bg-[#A54432] px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#8A3828] sm:self-center"
              >
                🍅 Bấm giờ học thêm
              </button>
            )}
          </section>

          {/* Top 3 Podium */}
          {topThree.length > 0 && (
            <section
              data-testid="leaderboard-podium"
              aria-label="Top 3 Sinh viên dẫn đầu"
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            >
              {topThree.map((item) => {
                const medal = rankMedal(item.rank);
                return (
                  <div
                    key={`podium-${item.playerId}`}
                    data-testid={`leaderboard-podium-${item.rank}`}
                    className={`relative flex min-w-0 flex-col justify-between rounded-2xl border p-3.5 transition ${medal.ringClass} ${
                      item.isSelf ? 'ring-2 ring-[#A54432]' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-extrabold ${medal.badgeClass}`}
                        >
                          <span>{medal.icon}</span>
                          <span>Hạng {item.rank}</span>
                        </span>
                        <span className="shrink-0 whitespace-nowrap rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-600">
                          {item.cohortBadge}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center gap-2.5">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black text-white shadow-xs"
                          style={{ backgroundColor: item.color || '#1F3A5F' }}
                        >
                          {item.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold text-stone-900">
                            {item.name}
                            {item.isSelf ? ' (Bạn)' : ''}
                          </p>
                          <p className="truncate text-[11px] text-stone-500">
                            📚 {item.subjectTag || 'Tự học HSK · Thư viện TQB'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-stone-200/70 pt-2 text-xs">
                      <span className="whitespace-nowrap font-extrabold tabular-nums text-[#A54432]">
                        ⏱️ {formatStudyDurationVi(item.focusSeconds)}
                      </span>
                      <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-stone-600">
                        🍅 {item.completedBlocks} hiệp
                      </span>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* Danh sách xếp hạng chi tiết */}
          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs">
            <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-4 py-2.5 text-xs font-extrabold text-stone-600">
              <span className="whitespace-nowrap">Hạng & Sinh viên Bách Khoa</span>
              <span className="whitespace-nowrap text-right">Thời gian tập trung</span>
            </div>

            <div
              data-testid="leaderboard-list"
              className="divide-y divide-stone-100"
            >
              {entries.map((entry) => {
                const medal = rankMedal(entry.rank);
                return (
                  <div
                    key={entry.playerId}
                    data-testid="leaderboard-row"
                    className={`flex items-center justify-between gap-3 px-4 py-3 transition ${
                      entry.isSelf
                        ? 'bg-amber-50/90 font-semibold'
                        : 'hover:bg-stone-50/80'
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        className={`flex h-7 w-10 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border text-xs font-extrabold ${medal.badgeClass}`}
                      >
                        {medal.icon}
                      </span>

                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: entry.color || '#1F3A5F' }}
                      >
                        {entry.name.slice(0, 1).toUpperCase()}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="truncate text-sm font-bold text-stone-900">
                            {entry.name}
                            {entry.isSelf ? ' (Bạn)' : ''}
                          </span>
                          <span className="shrink-0 whitespace-nowrap rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-600">
                            {entry.cohortBadge}
                          </span>
                          {entry.streakDays >= 2 && (
                            <span className="shrink-0 whitespace-nowrap rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-800">
                              🔥 {entry.streakDays} ngày
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-500">
                          <span className="truncate">
                            {entry.subjectTag
                              ? `📚 ${entry.subjectTag}`
                              : '📚 Tự học tại Thư viện Tạ Quang Bửu'}
                          </span>
                          <span className="shrink-0 whitespace-nowrap tabular-nums">
                            · 🍅 {entry.completedBlocks} hiệp
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right tabular-nums">
                      <div className="whitespace-nowrap text-sm font-extrabold text-[#A54432]">
                        {formatStudyDurationVi(entry.focusSeconds)}
                      </div>
                      <div className="whitespace-nowrap text-[11px] font-medium text-stone-500">
                        Tổng tích lũy: {formatStudyHoursShort(entry.totalFocusSeconds)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
export default StudyLeaderboardModal;
