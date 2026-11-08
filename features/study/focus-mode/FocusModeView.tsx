'use client';

// ---------------------------------------------------------------------------
// features/study/focus-mode/FocusModeView.tsx — Lightweight Zen 2D study view
// (`feature.study.focus-mode`).
//
// ARCHITECTURAL INVARIANT:
// - Rendered when `focusPolicy.suspend3DRendering === true` (`zen-2d`).
// - Runs Pomodoro countdown, Study Session, Task List, and HSK Handbook access
//   with zero WebGL / Three.js rendering overhead.
// - Preserves multiplayer connection and player coordinates in `playerState`,
//   so clicking "Quay lại khuôn viên 3D" remounts `<CampusScene />` at the
//   exact previous location and facing.
// ---------------------------------------------------------------------------

import type { MultiplayerSnapshot } from '../../../lib/multiplayer';
import { MultiplayerStatusChip } from '../../social/multiplayer/MultiplayerStatusBar';
import { PomodoroTimer } from '../pomodoro/PomodoroTimer';
import type { PomodoroEvaluation, PomodoroPresetId } from '../pomodoro/timer';
import { StudyTaskList } from '../study-session/StudyTaskList';
import type { StudySessionState } from '../study-session/session';
import { StudySessionSummary } from '../ui/StudySessionSummary';

export interface FocusModeViewProps {
  zoneLabel: string;
  points: number;
  streakCount: number;
  mpSnap: MultiplayerSnapshot;
  session: StudySessionState;
  evaluation: PomodoroEvaluation;
  displayRemainingMmSs: string;
  activePreset: PomodoroPresetId | 'custom';
  onExitZen2D: () => void;
  onOpenHandbook: () => void;
  onStartSession: () => void;
  onEndSession: () => void;
  onUpdateSubject: (subject: string) => void;
  onAddTask: (title: string) => void;
  onToggleTask: (taskId: string) => void;
  onRemoveTask: (taskId: string) => void;
  onStartFocus: () => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onSkipPhase: () => void;
  onResetTimer: () => void;
  onSelectPreset: (preset: PomodoroPresetId) => void;
}

export function FocusModeView({
  zoneLabel,
  points,
  streakCount,
  mpSnap,
  session,
  evaluation,
  displayRemainingMmSs,
  activePreset,
  onExitZen2D,
  onOpenHandbook,
  onStartSession,
  onEndSession,
  onUpdateSubject,
  onAddTask,
  onToggleTask,
  onRemoveTask,
  onStartFocus,
  onPauseTimer,
  onResumeTimer,
  onSkipPhase,
  onResetTimer,
  onSelectPreset,
}: FocusModeViewProps) {
  return (
    <div
      data-testid="zen-2d-view"
      className="relative flex h-dvh w-full flex-col overflow-y-auto bg-gradient-to-br from-[#F6F3EC] via-[#EFECE4] to-[#E5E0D5] text-[#1c2b1f]"
    >
      {/* Thanh trạng thái trên cùng của Zen 2D */}
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-stone-300/80 bg-[#FAF7F2]/95 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#1c5c3a] px-3.5 py-1.5 text-xs font-extrabold text-white">
            🌿 Chế độ Zen 2D (Đã tạm dừng 3D WebGL)
          </span>
          <span className="rounded-full bg-stone-200/90 px-3 py-1.5 text-xs font-bold text-stone-700">
            📍 {zoneLabel}
          </span>
          <span className="rounded-full bg-[#A54432]/15 px-3 py-1.5 text-xs font-bold text-[#A54432]">
            ⭐ {points} điểm{streakCount > 0 ? ` · 🔥 ${streakCount} ngày` : ''}
          </span>
          <MultiplayerStatusChip snapshot={mpSnap} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="zen-open-handbook"
            onClick={onOpenHandbook}
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-[#1c2b1f] shadow-sm transition hover:bg-stone-100"
          >
            📖 Sổ tay HSK
          </button>
          <button
            type="button"
            data-testid="exit-zen-2d"
            onClick={onExitZen2D}
            className="rounded-full bg-[#A54432] px-4 py-2 text-xs font-extrabold text-white shadow transition hover:bg-[#8A3828]"
          >
            🏞️ Quay lại khuôn viên 3D
          </button>
        </div>
      </header>

      {/* Nội dung bàn học 2D */}
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4 sm:p-6">
        {/* Thông tin môn học / chủ đề */}
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-[220px] flex-1">
              <label className="block text-xs font-bold text-stone-500">
                Chủ đề đang tự học tại Bách khoa
                <input
                  type="text"
                  data-testid="zen-subject-input"
                  value={session.subjectTag ?? ''}
                  onChange={(e) => onUpdateSubject(e.target.value)}
                  maxLength={36}
                  placeholder="Nhập môn học hoặc mục tiêu..."
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-base font-bold text-[#1c2b1f] focus:border-[#A54432] focus:bg-white focus:outline-none"
                />
              </label>
            </div>
            <div className="flex items-center gap-2">
              {!session.active ? (
                <button
                  type="button"
                  onClick={onStartSession}
                  className="rounded-xl bg-[#1c5c3a] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#16492e]"
                >
                  + Bắt đầu phiên
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onEndSession}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
                >
                  ⏹ Kết thúc phiên
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PomodoroTimer
            evaluation={evaluation}
            displayRemainingMmSs={displayRemainingMmSs}
            activePreset={activePreset}
            onSelectPreset={onSelectPreset}
            onStart={onStartFocus}
            onPause={onPauseTimer}
            onResume={onResumeTimer}
            onSkipPhase={onSkipPhase}
            onReset={onResetTimer}
          />

          <StudyTaskList
            tasks={session.tasks}
            onAddTask={onAddTask}
            onToggleTask={onToggleTask}
            onRemoveTask={onRemoveTask}
          />
        </div>

        <StudySessionSummary
          completedFocusBlocks={evaluation.state.completedFocusBlocks}
          totalFocusedMs={evaluation.state.totalFocusedMs}
          tasks={session.tasks}
          history={session.history}
        />
      </div>
    </div>
  );
}

export default FocusModeView;
