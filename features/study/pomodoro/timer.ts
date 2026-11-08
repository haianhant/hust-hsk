// ---------------------------------------------------------------------------
// features/study/pomodoro/timer.ts — Pure wall-clock Pomodoro Timer state
// machine (`feature.study.pomodoro`).
//
// ARCHITECTURAL INVARIANTS (PR6):
// 1. Zero WebGL / Three.js / React / setInterval tick-counting dependencies.
// 2. Remaining & elapsed durations are computed strictly from wall-clock
//    timestamps (`nowMs` vs `phaseEndsAtMs` / `pausedRemainingMs`).
// 3. Survives background tab throttling and full page reload via deterministic
//    serialization and `reconcilePomodoroAfterReload(raw, nowMs)`.
// ---------------------------------------------------------------------------

import {
  DEFAULT_POMODORO_CONFIG,
  isValidPomodoroPhase,
  sanitizePomodoroConfig,
  type PomodoroConfig,
  type PomodoroPhase,
} from '../../../shared/contracts/study';

export const POMODORO_STORAGE_KEY = 'bkhn_pomodoro_state_v1';

export type PomodoroPresetId = '25-5' | '50-10';

export const POMODORO_PRESET_25_5: PomodoroConfig = {
  ...DEFAULT_POMODORO_CONFIG,
  focusDurationMs: 25 * 60 * 1000,
  shortBreakDurationMs: 5 * 60 * 1000,
};

export const POMODORO_PRESET_50_10: PomodoroConfig = {
  ...DEFAULT_POMODORO_CONFIG,
  focusDurationMs: 50 * 60 * 1000,
  shortBreakDurationMs: 10 * 60 * 1000,
};

export const POMODORO_PRESETS: Record<PomodoroPresetId, PomodoroConfig> = {
  '25-5': POMODORO_PRESET_25_5,
  '50-10': POMODORO_PRESET_50_10,
};

export function getPomodoroPresetId(config: PomodoroConfig): PomodoroPresetId | 'custom' {
  if (
    config.focusDurationMs === POMODORO_PRESET_25_5.focusDurationMs &&
    config.shortBreakDurationMs === POMODORO_PRESET_25_5.shortBreakDurationMs
  ) {
    return '25-5';
  }
  if (
    config.focusDurationMs === POMODORO_PRESET_50_10.focusDurationMs &&
    config.shortBreakDurationMs === POMODORO_PRESET_50_10.shortBreakDurationMs
  ) {
    return '50-10';
  }
  return 'custom';
}

export interface CompletedFocusWindow {
  startedAtMs: number;
  endedAtMs: number;
  durationMs: number;
}

export interface PomodoroState {
  version: 1;
  phase: PomodoroPhase;
  running: boolean;
  config: PomodoroConfig;
  /** Epoch ms when the current active stretch started (null when idle or paused). */
  phaseStartedAtMs: number | null;
  /** Epoch ms when the current phase will end (null when idle or paused). */
  phaseEndsAtMs: number | null;
  /** Remaining ms captured at the moment of pause (null when running or idle). */
  pausedRemainingMs: number | null;
  /** Number of focus blocks completed in the current session. */
  completedFocusBlocks: number;
  /** Cumulative focus milliseconds completed in the current session. */
  totalFocusedMs: number;
}

export interface PomodoroEvaluation {
  state: PomodoroState;
  remainingMs: number;
  phaseDurationMs: number;
  elapsedInPhaseMs: number;
  progressRatio: number;
  focusBlocksCompletedDelta: number;
  completedFocusWindows: CompletedFocusWindow[];
  transitioned: boolean;
}

export function getPhaseDurationMs(
  phase: PomodoroPhase,
  config: PomodoroConfig = DEFAULT_POMODORO_CONFIG,
): number {
  switch (phase) {
    case 'focus':
      return config.focusDurationMs;
    case 'short-break':
      return config.shortBreakDurationMs;
    case 'long-break':
      return config.longBreakDurationMs;
    case 'idle':
    default:
      return 0;
  }
}

export function getNextPomodoroPhase(
  currentPhase: PomodoroPhase,
  completedFocusBlocksAfterCurrent: number,
  config: PomodoroConfig = DEFAULT_POMODORO_CONFIG,
): Exclude<PomodoroPhase, 'idle'> {
  if (currentPhase === 'focus') {
    const isLongBreak =
      completedFocusBlocksAfterCurrent > 0 &&
      completedFocusBlocksAfterCurrent % config.cyclesBeforeLongBreak === 0;
    return isLongBreak ? 'long-break' : 'short-break';
  }
  return 'focus';
}

export function createPomodoroState(
  customConfig?: Partial<PomodoroConfig>,
): PomodoroState {
  const config = sanitizePomodoroConfig(customConfig);
  return {
    version: 1,
    phase: 'idle',
    running: false,
    config,
    phaseStartedAtMs: null,
    phaseEndsAtMs: null,
    pausedRemainingMs: null,
    completedFocusBlocks: 0,
    totalFocusedMs: 0,
  };
}

export function startPomodoro(
  state: PomodoroState,
  nowMs: number,
  targetPhase: Exclude<PomodoroPhase, 'idle'> = 'focus',
): PomodoroState {
  const durationMs = getPhaseDurationMs(targetPhase, state.config);
  return {
    ...state,
    phase: targetPhase,
    running: true,
    phaseStartedAtMs: nowMs,
    phaseEndsAtMs: nowMs + durationMs,
    pausedRemainingMs: null,
  };
}

export function pausePomodoro(state: PomodoroState, nowMs: number): PomodoroState {
  if (!state.running || state.phase === 'idle' || state.phaseEndsAtMs === null) {
    return state;
  }
  const remainingMs = Math.max(0, state.phaseEndsAtMs - nowMs);
  return {
    ...state,
    running: false,
    phaseStartedAtMs: null,
    phaseEndsAtMs: null,
    pausedRemainingMs: remainingMs,
  };
}

export function resumePomodoro(state: PomodoroState, nowMs: number): PomodoroState {
  if (state.running || state.phase === 'idle') {
    return state;
  }
  const remainingMs =
    state.pausedRemainingMs !== null
      ? Math.max(0, state.pausedRemainingMs)
      : getPhaseDurationMs(state.phase, state.config);
  return {
    ...state,
    running: true,
    phaseStartedAtMs: nowMs,
    phaseEndsAtMs: nowMs + remainingMs,
    pausedRemainingMs: null,
  };
}

export function resetPomodoro(state: PomodoroState): PomodoroState {
  return {
    ...state,
    phase: 'idle',
    running: false,
    phaseStartedAtMs: null,
    phaseEndsAtMs: null,
    pausedRemainingMs: null,
  };
}

export function applyPomodoroConfig(
  state: PomodoroState,
  customConfig: Partial<PomodoroConfig>,
): PomodoroState {
  const nextConfig = sanitizePomodoroConfig({ ...state.config, ...customConfig });
  if (state.phase === 'idle') {
    return {
      ...state,
      config: nextConfig,
    };
  }
  return {
    ...state,
    config: nextConfig,
    phase: 'idle',
    running: false,
    phaseStartedAtMs: null,
    phaseEndsAtMs: null,
    pausedRemainingMs: null,
  };
}

export function skipPomodoroPhase(
  state: PomodoroState,
  nowMs: number,
  autoStartNext: boolean = true,
): PomodoroState {
  if (state.phase === 'idle') {
    return startPomodoro(state, nowMs, 'focus');
  }
  const nextPhase = getNextPomodoroPhase(
    state.phase,
    state.completedFocusBlocks,
    state.config,
  );
  const nextDurationMs = getPhaseDurationMs(nextPhase, state.config);
  if (!autoStartNext) {
    return {
      ...state,
      phase: nextPhase,
      running: false,
      phaseStartedAtMs: null,
      phaseEndsAtMs: null,
      pausedRemainingMs: nextDurationMs,
    };
  }
  return {
    ...state,
    phase: nextPhase,
    running: true,
    phaseStartedAtMs: nowMs,
    phaseEndsAtMs: nowMs + nextDurationMs,
    pausedRemainingMs: null,
  };
}

/**
 * Pure wall-clock evaluator. Computes remaining time from `nowMs` without
 * relying on how many times `setInterval` or `requestAnimationFrame` fired.
 * If `nowMs >= phaseEndsAtMs`, deterministically advances across completed
 * phase boundaries.
 */
export function evaluatePomodoroAt(
  state: PomodoroState,
  nowMs: number,
  options: { autoAdvance?: boolean; maxTransitions?: number } = {},
): PomodoroEvaluation {
  const autoAdvance = options.autoAdvance ?? true;
  const maxTransitions = options.maxTransitions ?? 32;

  if (state.phase === 'idle') {
    return {
      state,
      remainingMs: 0,
      phaseDurationMs: 0,
      elapsedInPhaseMs: 0,
      progressRatio: 0,
      focusBlocksCompletedDelta: 0,
      completedFocusWindows: [],
      transitioned: false,
    };
  }

  if (!state.running) {
    const phaseDurationMs = getPhaseDurationMs(state.phase, state.config);
    const remainingMs = Math.max(0, state.pausedRemainingMs ?? phaseDurationMs);
    const elapsedInPhaseMs = Math.max(0, phaseDurationMs - remainingMs);
    const progressRatio =
      phaseDurationMs > 0 ? Math.min(1, Math.max(0, elapsedInPhaseMs / phaseDurationMs)) : 0;
    return {
      state,
      remainingMs,
      phaseDurationMs,
      elapsedInPhaseMs,
      progressRatio,
      focusBlocksCompletedDelta: 0,
      completedFocusWindows: [],
      transitioned: false,
    };
  }

  let cur = { ...state };
  let focusDelta = 0;
  const completedFocusWindows: CompletedFocusWindow[] = [];
  let transitioned = false;
  let transitions = 0;

  while (
    cur.running &&
    cur.phase !== 'idle' &&
    cur.phaseEndsAtMs !== null &&
    nowMs >= cur.phaseEndsAtMs &&
    transitions < maxTransitions
  ) {
    const finishedPhase = cur.phase;
    const finishedEndMs = cur.phaseEndsAtMs;
    const finishedDurationMs = getPhaseDurationMs(finishedPhase, cur.config);

    let nextCompletedBlocks = cur.completedFocusBlocks;
    let nextTotalFocusedMs = cur.totalFocusedMs;
    if (finishedPhase === 'focus') {
      nextCompletedBlocks += 1;
      nextTotalFocusedMs += finishedDurationMs;
      focusDelta += 1;
      completedFocusWindows.push({
        startedAtMs: finishedEndMs - finishedDurationMs,
        endedAtMs: finishedEndMs,
        durationMs: finishedDurationMs,
      });
    }

    const nextPhase = getNextPomodoroPhase(
      finishedPhase,
      nextCompletedBlocks,
      cur.config,
    );
    const nextDurationMs = getPhaseDurationMs(nextPhase, cur.config);
    transitioned = true;
    transitions += 1;

    if (!autoAdvance) {
      cur = {
        ...cur,
        phase: nextPhase,
        running: false,
        phaseStartedAtMs: null,
        phaseEndsAtMs: null,
        pausedRemainingMs: nextDurationMs,
        completedFocusBlocks: nextCompletedBlocks,
        totalFocusedMs: nextTotalFocusedMs,
      };
      break;
    }

    cur = {
      ...cur,
      phase: nextPhase,
      running: true,
      phaseStartedAtMs: finishedEndMs,
      phaseEndsAtMs: finishedEndMs + nextDurationMs,
      pausedRemainingMs: null,
      completedFocusBlocks: nextCompletedBlocks,
      totalFocusedMs: nextTotalFocusedMs,
    };
  }

  const phaseDurationMs = getPhaseDurationMs(cur.phase, cur.config);
  const remainingMs = cur.running && cur.phaseEndsAtMs !== null
    ? Math.max(0, cur.phaseEndsAtMs - nowMs)
    : Math.max(0, cur.pausedRemainingMs ?? phaseDurationMs);
  const elapsedInPhaseMs = Math.max(0, phaseDurationMs - remainingMs);
  const progressRatio =
    phaseDurationMs > 0 ? Math.min(1, Math.max(0, elapsedInPhaseMs / phaseDurationMs)) : 0;

  return {
    state: cur,
    remainingMs,
    phaseDurationMs,
    elapsedInPhaseMs,
    progressRatio,
    focusBlocksCompletedDelta: focusDelta,
    completedFocusWindows,
    transitioned,
  };
}

export function formatRemainingMmSs(remainingMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatTotalFocusedDuration(totalFocusedMs: number): string {
  const totalMinutes = Math.max(0, Math.floor(totalFocusedMs / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} phút`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
}

export function serializePomodoroState(state: PomodoroState): string {
  return JSON.stringify(state);
}

export function parseStoredPomodoroSnapshot(
  raw: unknown,
  nowMs: number = Date.now(),
): PomodoroState {
  if (!raw) return createPomodoroState();
  try {
    const parsed: Partial<PomodoroState> =
      typeof raw === 'string' ? (JSON.parse(raw) as Partial<PomodoroState>) : (raw as Partial<PomodoroState>);
    if (!parsed || typeof parsed !== 'object') {
      return createPomodoroState();
    }
    const config = sanitizePomodoroConfig(parsed.config);
    const phase: PomodoroPhase = isValidPomodoroPhase(parsed.phase) ? parsed.phase : 'idle';
    const running = Boolean(parsed.running) && phase !== 'idle';
    const completedFocusBlocks =
      typeof parsed.completedFocusBlocks === 'number' &&
      Number.isFinite(parsed.completedFocusBlocks) &&
      parsed.completedFocusBlocks >= 0
        ? Math.floor(parsed.completedFocusBlocks)
        : 0;
    const totalFocusedMs =
      typeof parsed.totalFocusedMs === 'number' &&
      Number.isFinite(parsed.totalFocusedMs) &&
      parsed.totalFocusedMs >= 0
        ? Math.floor(parsed.totalFocusedMs)
        : 0;

    const phaseDurationMs = getPhaseDurationMs(phase, config);
    const phaseStartedAtMs =
      running && typeof parsed.phaseStartedAtMs === 'number' && Number.isFinite(parsed.phaseStartedAtMs)
        ? parsed.phaseStartedAtMs
        : running
          ? nowMs
          : null;
    const phaseEndsAtMs =
      running && typeof parsed.phaseEndsAtMs === 'number' && Number.isFinite(parsed.phaseEndsAtMs)
        ? parsed.phaseEndsAtMs
        : running
          ? nowMs + phaseDurationMs
          : null;
    const pausedRemainingMs =
      !running && phase !== 'idle'
        ? typeof parsed.pausedRemainingMs === 'number' && Number.isFinite(parsed.pausedRemainingMs)
          ? Math.max(0, Math.min(phaseDurationMs, parsed.pausedRemainingMs))
          : phaseDurationMs
        : null;

    return {
      version: 1,
      phase,
      running,
      config,
      phaseStartedAtMs,
      phaseEndsAtMs,
      pausedRemainingMs,
      completedFocusBlocks,
      totalFocusedMs,
    };
  } catch {
    return createPomodoroState();
  }
}

export function deserializePomodoroState(
  rawJson: string | null | undefined,
  nowMs: number = Date.now(),
  options: { autoAdvance?: boolean } = { autoAdvance: true },
): PomodoroEvaluation {
  if (!rawJson || typeof rawJson !== 'string') {
    return evaluatePomodoroAt(createPomodoroState(), nowMs, options);
  }
  const restored = parseStoredPomodoroSnapshot(rawJson, nowMs);
  return evaluatePomodoroAt(restored, nowMs, options);
}
