'use client';

// ---------------------------------------------------------------------------
// features/study/pomodoro/usePomodoro.ts — Thin React integration hook for the
// pure wall-clock Pomodoro state machine (`features/study/pomodoro/timer.ts`).
//
// ARCHITECTURAL INVARIANT:
// - Never calculates elapsed/remaining time by incrementing a counter.
// - A UI interval only triggers re-evaluation of `evaluatePomodoroAt(state, Date.now())`
//   and immediate reconciliation on `visibilitychange` / `focus`.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import {
  evaluatePomodoroAt,
  formatRemainingMmSs,
  formatTotalFocusedDuration,
  getPhaseDurationMs,
  getPomodoroPresetId,
  type PomodoroEvaluation,
  type PomodoroPresetId,
  type PomodoroState,
} from './timer';

export interface UsePomodoroDisplayResult {
  evaluation: PomodoroEvaluation;
  displayRemainingMmSs: string;
  displayTotalFocused: string;
  activePreset: PomodoroPresetId | 'custom';
}

export function usePomodoro(
  pomodoro: PomodoroState,
  onSyncAt?: (nowMs: number) => void,
): UsePomodoroDisplayResult {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const tick = () => {
      const currentNow = Date.now();
      setNowMs(currentNow);
      onSyncAt?.(currentNow);
    };

    tick();

    const onVisibility = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        tick();
      }
    };

    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', onVisibility);

    if (!pomodoro.running || pomodoro.phase === 'idle') {
      return () => {
        window.removeEventListener('focus', tick);
        document.removeEventListener('visibilitychange', onVisibility);
      };
    }

    const intervalId = window.setInterval(tick, 250);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pomodoro.running, pomodoro.phase, pomodoro.phaseEndsAtMs, onSyncAt]);

  const evaluation = useMemo(() => evaluatePomodoroAt(pomodoro, nowMs), [pomodoro, nowMs]);

  const effectiveRemainingMs =
    evaluation.state.phase === 'idle'
      ? getPhaseDurationMs('focus', evaluation.state.config)
      : evaluation.remainingMs;

  const displayRemainingMmSs = formatRemainingMmSs(effectiveRemainingMs);
  const displayTotalFocused = formatTotalFocusedDuration(evaluation.state.totalFocusedMs);
  const activePreset = getPomodoroPresetId(evaluation.state.config);

  return {
    evaluation,
    displayRemainingMmSs,
    displayTotalFocused,
    activePreset,
  };
}
