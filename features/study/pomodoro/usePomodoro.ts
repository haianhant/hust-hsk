'use client';

// ---------------------------------------------------------------------------
// features/study/pomodoro/usePomodoro.ts — Leaf React display hook for the
// pure wall-clock Pomodoro state machine (`features/study/pomodoro/timer.ts`).
//
// ARCHITECTURAL INVARIANTS:
// 1. Never calculates elapsed/remaining time by incrementing a counter.
// 2. Updates local display state only when the displayed second changes or
//    when a phase boundary is crossed (`nowMs >= phaseEndsAtMs`), preventing
//    redundant 250ms state updates and localStorage writes.
// 3. Used inside leaf UI components (`PomodoroTimer`, `StudyHudButton`) so
//    `HomePage` and `<CampusScene />` never re-render on countdown ticks.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react';
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
  onPhaseBoundaryReached?: (nowMs: number) => void,
): UsePomodoroDisplayResult {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const onBoundaryRef = useRef(onPhaseBoundaryReached);
  onBoundaryRef.current = onPhaseBoundaryReached;
  const lastDisplayedSecRef = useRef<number>(-1);

  useEffect(() => {
    const checkNow = (forceUpdate: boolean) => {
      const currentNow = Date.now();
      if (
        pomodoro.running &&
        pomodoro.phase !== 'idle' &&
        pomodoro.phaseEndsAtMs !== null &&
        currentNow >= pomodoro.phaseEndsAtMs
      ) {
        setNowMs(currentNow);
        onBoundaryRef.current?.(currentNow);
        return;
      }

      if (!pomodoro.running || pomodoro.phase === 'idle' || pomodoro.phaseEndsAtMs === null) {
        if (forceUpdate) setNowMs(currentNow);
        return;
      }

      const remainingSec = Math.max(0, Math.ceil((pomodoro.phaseEndsAtMs - currentNow) / 1000));
      if (forceUpdate || remainingSec !== lastDisplayedSecRef.current) {
        lastDisplayedSecRef.current = remainingSec;
        setNowMs(currentNow);
      }
    };

    checkNow(true);

    const onVisibility = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        checkNow(true);
      }
    };
    const onFocus = () => checkNow(true);

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    if (!pomodoro.running || pomodoro.phase === 'idle') {
      return () => {
        window.removeEventListener('focus', onFocus);
        document.removeEventListener('visibilitychange', onVisibility);
      };
    }

    const intervalId = window.setInterval(() => checkNow(false), 250);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pomodoro.running, pomodoro.phase, pomodoro.phaseEndsAtMs]);

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
