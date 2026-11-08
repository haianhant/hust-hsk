'use client';

// ---------------------------------------------------------------------------
// features/study/ui/StudySessionSummary.tsx — Displays personal study session
// progress summary and recent completed focus blocks (`feature.study.session`).
// ---------------------------------------------------------------------------

import { formatTotalFocusedDuration } from '../pomodoro/timer';
import {
  formatHskLessonLabel,
  type CompletedFocusBlock,
  type StudyTaskItem,
} from '../study-session/session';

export interface StudySessionSummaryProps {
  completedFocusBlocks: number;
  totalFocusedMs: number;
  tasks: StudyTaskItem[];
  history: CompletedFocusBlock[];
}

function formatBlockTimeRange(startedAtMs: number, endedAtMs: number): string {
  try {
    const fmt = new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${fmt.format(new Date(startedAtMs))} – ${fmt.format(new Date(endedAtMs))}`;
  } catch {
    return '';
  }
}

export function StudySessionSummary({
  completedFocusBlocks,
  totalFocusedMs,
  tasks,
  history,
}: StudySessionSummaryProps) {
  const completedTasks = tasks.filter((t) => t.done).length;
  const recentHistory = history.slice(-5).reverse();

  return (
    <section
      aria-label="Thống kê phiên tự học"
      className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
    >
      <h3 className="mb-3 text-sm font-extrabold text-[#1c2b1f]">
        📊 Thống kê &amp; Lịch sử phiên tự học
      </h3>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-stone-50 px-2.5 py-2">
          <span className="block text-stone-500">Số phiên</span>
          <span
            data-testid="summary-completed-blocks"
            className="mt-0.5 block text-sm font-extrabold text-[#A54432]"
          >
            {completedFocusBlocks}
          </span>
        </div>
        <div className="rounded-xl bg-stone-50 px-2.5 py-2">
          <span className="block text-stone-500">Tổng giờ học</span>
          <span
            data-testid="summary-total-focused"
            className="mt-0.5 block text-sm font-extrabold text-[#1c5c3a]"
          >
            {formatTotalFocusedDuration(totalFocusedMs)}
          </span>
        </div>
        <div className="rounded-xl bg-stone-50 px-2.5 py-2">
          <span className="block text-stone-500">Việc hoàn thành</span>
          <span
            data-testid="summary-completed-tasks"
            className="mt-0.5 block text-sm font-extrabold text-stone-800"
          >
            {completedTasks}/{tasks.length}
          </span>
        </div>
      </div>

      <div className="mt-3 border-t border-stone-100 pt-3">
        <p className="mb-1.5 text-xs font-bold text-stone-600">
          Các phiên Focus đã hoàn thành ({history.length}):
        </p>
        {recentHistory.length === 0 ? (
          <p className="text-xs text-stone-400">
            Chưa có phiên Focus nào hoàn tất trong nhật ký.
          </p>
        ) : (
          <ul data-testid="study-history-list" className="space-y-1.5 text-xs">
            {recentHistory.map((item) => {
              const lessonLabel = formatHskLessonLabel(item.linkedHskLessonId);
              return (
                <li
                  key={item.id}
                  data-testid="study-history-item"
                  className="flex items-center justify-between gap-2 rounded-xl bg-stone-50 px-3 py-1.5 text-stone-700"
                >
                  <span className="truncate font-semibold">
                    🍅 {item.subjectTag || 'Tự học HSK'}
                    {lessonLabel ? ` · ${lessonLabel}` : ''}
                  </span>
                  <span className="shrink-0 text-stone-500">
                    {Math.max(1, Math.round(item.durationMs / 60000))} phút
                    {item.startedAtMs && item.endedAtMs
                      ? ` (${formatBlockTimeRange(item.startedAtMs, item.endedAtMs)})`
                      : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

export default StudySessionSummary;
