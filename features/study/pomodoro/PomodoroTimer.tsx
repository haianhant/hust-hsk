'use client';

// ---------------------------------------------------------------------------
// features/study/pomodoro/PomodoroTimer.tsx — Pomodoro countdown & controls UI
// component (`feature.study.pomodoro`).
// ---------------------------------------------------------------------------

import type { PomodoroPhase } from '../../../shared/contracts/study';
import {
  formatTotalFocusedDuration,
  type PomodoroEvaluation,
  type PomodoroPresetId,
} from './timer';

export interface PomodoroTimerProps {
  evaluation: PomodoroEvaluation;
  displayRemainingMmSs: string;
  activePreset: PomodoroPresetId | 'custom';
  onSelectPreset: (preset: PomodoroPresetId) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkipPhase: () => void;
  onReset: () => void;
}

const PHASE_LABELS: Record<PomodoroPhase, { title: string; badgeClass: string }> = {
  idle: {
    title: 'Sẵn sàng tập trung',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-300',
  },
  focus: {
    title: '🍅 Đang Tập trung (Focus)',
    badgeClass: 'bg-[#A54432]/15 text-[#A54432] border-[#A54432]/30',
  },
  'short-break': {
    title: '☕ Nghỉ ngắn (Short Break)',
    badgeClass: 'bg-[#1c5c3a]/15 text-[#1c5c3a] border-[#1c5c3a]/30',
  },
  'long-break': {
    title: '🌿 Nghỉ dài (Long Break)',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
  },
};

export function PomodoroTimer({
  evaluation,
  displayRemainingMmSs,
  activePreset,
  onSelectPreset,
  onStart,
  onPause,
  onResume,
  onSkipPhase,
  onReset,
}: PomodoroTimerProps) {
  const { state, progressRatio } = evaluation;
  const phaseMeta = PHASE_LABELS[state.phase] ?? PHASE_LABELS.idle;
  const isIdle = state.phase === 'idle';
  const isRunning = state.running && !isIdle;
  const isPaused = !state.running && !isIdle;
  const progressPct = Math.round(Math.min(100, Math.max(0, progressRatio * 100)));

  return (
    <section
      aria-label="Đồng hồ Pomodoro"
      className="rounded-2xl border border-stone-200 bg-stone-50/90 p-4 shadow-sm"
    >
      {/* Hàng chọn nhịp Pomodoro (25/5 hoặc 50/10) */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span
          data-testid="pomodoro-phase-badge"
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${phaseMeta.badgeClass}`}
        >
          {phaseMeta.title}
          {isPaused ? ' · Đã tạm dừng' : ''}
        </span>

        <div className="inline-flex rounded-xl border border-stone-200 bg-white p-0.5 text-xs font-semibold">
          <button
            type="button"
            data-testid="pomodoro-preset-25-5"
            onClick={() => onSelectPreset('25-5')}
            className={`rounded-lg px-2.5 py-1 transition ${
              activePreset === '25-5'
                ? 'bg-[#A54432] text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            25 / 5 phút
          </button>
          <button
            type="button"
            data-testid="pomodoro-preset-50-10"
            onClick={() => onSelectPreset('50-10')}
            className={`rounded-lg px-2.5 py-1 transition ${
              activePreset === '50-10'
                ? 'bg-[#A54432] text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            50 / 10 phút
          </button>
        </div>
      </div>

      {/* Đồng hồ đếm ngược */}
      <div className="my-2 text-center">
        <div
          data-testid="pomodoro-countdown"
          className="font-mono text-5xl font-black tracking-tight text-[#1c2b1f] sm:text-6xl"
        >
          {displayRemainingMmSs}
        </div>
        <p className="mt-1 text-xs font-medium text-stone-500">
          Chu kỳ chuẩn Bách khoa: {state.config.cyclesBeforeLongBreak} phiên Focus → Nghỉ dài{' '}
          {Math.round(state.config.longBreakDurationMs / 60000)} phút
        </p>
      </div>

      {/* Thanh tiến trình pha hiện tại */}
      <div className="my-3 h-2 w-full overflow-hidden rounded-full bg-stone-200">
        <div
          className={`h-full transition-all duration-200 ${
            state.phase === 'focus' ? 'bg-[#A54432]' : 'bg-[#1c5c3a]'
          }`}
          style={{ width: `${isIdle ? 0 : progressPct}%` }}
        />
      </div>

      {/* Các nút điều khiển Start / Pause / Resume / Skip / Reset */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {isIdle && (
          <button
            type="button"
            data-testid="pomodoro-start"
            onClick={onStart}
            className="rounded-xl bg-[#A54432] px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-[#8A3828]"
          >
            ▶ Bắt đầu Focus
          </button>
        )}

        {isRunning && (
          <button
            type="button"
            data-testid="pomodoro-pause"
            onClick={onPause}
            className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-amber-700"
          >
            ⏸ Tạm dừng
          </button>
        )}

        {isPaused && (
          <button
            type="button"
            data-testid="pomodoro-resume"
            onClick={onResume}
            className="rounded-xl bg-[#1c5c3a] px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-[#16492e]"
          >
            ▶ Tiếp tục
          </button>
        )}

        {!isIdle && (
          <button
            type="button"
            data-testid="pomodoro-skip"
            onClick={onSkipPhase}
            className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs font-bold text-stone-700 transition hover:bg-stone-100"
          >
            ⏭ Chuyển pha
          </button>
        )}

        {!isIdle && (
          <button
            type="button"
            data-testid="pomodoro-reset"
            onClick={onReset}
            className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs font-bold text-stone-700 transition hover:bg-stone-100"
          >
            ↺ Đặt lại
          </button>
        )}
      </div>

      {/* Chỉ số nhanh: số phiên Focus hoàn thành & tổng thời gian tập trung */}
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-stone-200 pt-3 text-center text-xs">
        <div className="rounded-xl bg-white px-3 py-2">
          <span className="block text-stone-500">Phiên Focus hoàn thành</span>
          <span
            data-testid="pomodoro-completed-blocks"
            className="mt-0.5 block text-base font-extrabold text-[#A54432]"
          >
            {state.completedFocusBlocks} phiên
          </span>
        </div>
        <div className="rounded-xl bg-white px-3 py-2">
          <span className="block text-stone-500">Tổng thời gian tập trung</span>
          <span
            data-testid="pomodoro-total-focused"
            className="mt-0.5 block text-base font-extrabold text-[#1c5c3a]"
          >
            {formatTotalFocusedDuration(state.totalFocusedMs)}
          </span>
        </div>
      </div>
    </section>
  );
}

export default PomodoroTimer;
