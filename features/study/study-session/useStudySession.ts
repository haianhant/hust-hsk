'use client';

// ---------------------------------------------------------------------------
// features/study/study-session/useStudySession.ts — Authoritative React state
// and persistence hook for Study Session, Wall-Clock Pomodoro, and Focus Mode.
//
// PERSISTENCE STRATEGY:
// - `STUDY_SESSION_STORAGE_KEY` (`bkhn_study_session_v1`) is the single
//   authoritative store for the active StudySessionState and its embedded
//   `pomodoro: PomodoroState`. We never write to two separate timer keys.
// - `FOCUS_MODE_STORAGE_KEY` (`bkhn_focus_mode_v1`) persists user Focus Mode
//   preferences (`off`, `minimal-hud`, `zen-2d`).
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sanitizeSubjectTag } from '../../../shared/contracts/study';
import {
  DEFAULT_FOCUS_PREFERENCES,
  computeFocusRuntimePolicy,
  loadFocusPreferences,
  saveFocusPreferences,
  type FocusModeLevel,
  type FocusModePreferences,
  type FocusRuntimePolicy,
} from '../focus-mode/focus-mode';
import {
  POMODORO_PRESETS,
  applyPomodoroConfig,
  pausePomodoro,
  resetPomodoro,
  resumePomodoro,
  skipPomodoroPhase,
  startPomodoro,
  type PomodoroEvaluation,
  type PomodoroPresetId,
} from '../pomodoro/timer';
import { usePomodoro } from '../pomodoro/usePomodoro';
import {
  addStudyTask,
  createInitialStudySession,
  endStudySession,
  linkHskLessonToSession,
  loadStudySession,
  removeStudyTask,
  saveStudySession,
  startStudySession,
  syncStudySessionAt,
  toggleStudyTask,
  type StudySessionState,
} from './session';

export interface UseStudySessionOptions {
  onNotify?: (message: string) => void;
}

export interface UseStudySessionResult {
  session: StudySessionState;
  evaluation: PomodoroEvaluation;
  displayRemainingMmSs: string;
  displayTotalFocused: string;
  activePreset: PomodoroPresetId | 'custom';
  focusPrefs: FocusModePreferences;
  focusPolicy: FocusRuntimePolicy;
  studyPanelOpen: boolean;
  setStudyPanelOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  startSession: (params?: { subjectTag?: string | null; linkedHskLessonId?: string | null }) => void;
  endSession: () => void;
  updateSubject: (subjectTag: string) => void;
  setLinkedHskLesson: (lessonId: string | null) => void;
  addTask: (title: string) => void;
  toggleTask: (taskId: string) => void;
  removeTask: (taskId: string) => void;
  startFocus: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  skipPhase: () => void;
  resetTimer: () => void;
  selectPreset: (preset: PomodoroPresetId) => void;
  setFocusLevel: (level: FocusModeLevel) => void;
  setAutoHideHudOnFocus: (enabled: boolean) => void;
  exitFocusMode: () => void;
}

export function useStudySession(options: UseStudySessionOptions = {}): UseStudySessionResult {
  const { onNotify } = options;
  const onNotifyRef = useRef(onNotify);
  onNotifyRef.current = onNotify;

  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<StudySessionState>(() => createInitialStudySession());
  const [focusPrefs, setFocusPrefs] = useState<FocusModePreferences>(() => ({
    ...DEFAULT_FOCUS_PREFERENCES,
  }));
  const [studyPanelOpen, setStudyPanelOpen] = useState(false);

  // Load persisted session and focus preferences on client mount
  useEffect(() => {
    try {
      const nowMs = Date.now();
      const loadedSession = loadStudySession(window.localStorage, nowMs);
      const loadedFocus = loadFocusPreferences(window.localStorage);
      setSession(loadedSession);
      setFocusPrefs(loadedFocus);
      saveStudySession(window.localStorage, loadedSession);
    } catch {
      // Ignore storage access errors in restricted environments
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist session changes to authoritative localStorage key
  useEffect(() => {
    if (!hydrated) return;
    try {
      saveStudySession(window.localStorage, session);
    } catch {
      // Ignore quota/storage errors
    }
  }, [hydrated, session]);

  // Persist Focus Mode preferences
  useEffect(() => {
    if (!hydrated) return;
    try {
      saveFocusPreferences(window.localStorage, focusPrefs);
    } catch {
      // Ignore quota/storage errors
    }
  }, [hydrated, focusPrefs]);

  // Reconcile wall-clock transitions and record completed focus blocks idempotently
  const handleSyncAt = useCallback((nowMs: number) => {
    setSession((prev) => {
      if (!prev.pomodoro.running || prev.pomodoro.phase === 'idle') {
        return prev;
      }
      const synced = syncStudySessionAt(prev, nowMs, { autoAdvance: true });
      if (
        synced.newlyCompletedBlocks > 0 ||
        synced.evaluation.transitioned ||
        synced.session.pomodoro !== prev.pomodoro
      ) {
        if (synced.newlyCompletedBlocks > 0) {
          onNotifyRef.current?.(
            `🎉 Hoàn thành ${synced.newlyCompletedBlocks} phiên Focus! Chuyển sang pha nghỉ.`,
          );
        }
        return synced.session;
      }
      return prev;
    });
  }, []);

  const { evaluation, displayRemainingMmSs, displayTotalFocused, activePreset } = usePomodoro(
    session.pomodoro,
    handleSyncAt,
  );

  const focusPolicy = useMemo(
    () => computeFocusRuntimePolicy(focusPrefs, evaluation.state.phase),
    [focusPrefs, evaluation.state.phase],
  );

  const startSession = useCallback(
    (params?: { subjectTag?: string | null; linkedHskLessonId?: string | null }) => {
      const nowMs = Date.now();
      setSession((prev) =>
        startStudySession(prev, {
          nowMs,
          subjectTag: params?.subjectTag,
          linkedHskLessonId: params?.linkedHskLessonId,
        }),
      );
    },
    [],
  );

  const endSession = useCallback(() => {
    setSession((prev) => endStudySession(prev));
    setFocusPrefs((prev) => (prev.level === 'zen-2d' ? { ...prev, level: 'off' } : prev));
  }, []);

  const updateSubject = useCallback((subjectTag: string) => {
    setSession((prev) => ({
      ...prev,
      subjectTag: sanitizeSubjectTag(subjectTag) ?? 'Tự học HSK',
    }));
  }, []);

  const setLinkedHskLesson = useCallback((lessonId: string | null) => {
    setSession((prev) => linkHskLessonToSession(prev, lessonId, prev.subjectTag));
  }, []);

  const addTask = useCallback((title: string) => {
    setSession((prev) => addStudyTask(prev, title, Date.now()));
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setSession((prev) => toggleStudyTask(prev, taskId, Date.now()));
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setSession((prev) => removeStudyTask(prev, taskId));
  }, []);

  const startFocus = useCallback(() => {
    const nowMs = Date.now();
    setSession((prev) => {
      const activated = prev.active ? prev : startStudySession(prev, { nowMs });
      return {
        ...activated,
        pomodoro: startPomodoro(activated.pomodoro, nowMs, 'focus'),
      };
    });
  }, []);

  const pauseTimer = useCallback(() => {
    const nowMs = Date.now();
    setSession((prev) => {
      const synced = syncStudySessionAt(prev, nowMs, { autoAdvance: true }).session;
      return {
        ...synced,
        pomodoro: pausePomodoro(synced.pomodoro, nowMs),
      };
    });
  }, []);

  const resumeTimer = useCallback(() => {
    const nowMs = Date.now();
    setSession((prev) => ({
      ...prev,
      active: true,
      sessionStartedAtMs: prev.sessionStartedAtMs ?? nowMs,
      pomodoro: resumePomodoro(prev.pomodoro, nowMs),
    }));
  }, []);

  const skipPhase = useCallback(() => {
    const nowMs = Date.now();
    setSession((prev) => {
      const synced = syncStudySessionAt(prev, nowMs, { autoAdvance: true }).session;
      return {
        ...synced,
        active: true,
        sessionStartedAtMs: synced.sessionStartedAtMs ?? nowMs,
        pomodoro: skipPomodoroPhase(synced.pomodoro, nowMs, true),
      };
    });
  }, []);

  const resetTimer = useCallback(() => {
    const nowMs = Date.now();
    setSession((prev) => {
      const synced = syncStudySessionAt(prev, nowMs, { autoAdvance: true }).session;
      return {
        ...synced,
        pomodoro: resetPomodoro(synced.pomodoro),
      };
    });
  }, []);

  const selectPreset = useCallback((preset: PomodoroPresetId) => {
    const presetConfig = POMODORO_PRESETS[preset];
    if (!presetConfig) return;
    setSession((prev) => ({
      ...prev,
      pomodoro: applyPomodoroConfig(prev.pomodoro, presetConfig),
    }));
  }, []);

  const setFocusLevel = useCallback((level: FocusModeLevel) => {
    setFocusPrefs((prev) => ({
      ...prev,
      level,
      // When the user explicitly selects Normal 3D ('off'), disable auto-hide so
      // they immediately see the full 3D HUD even during an active focus block.
      autoHideHudOnFocus: level === 'off' ? false : prev.autoHideHudOnFocus,
    }));
    if (level === 'zen-2d') {
      setStudyPanelOpen(false);
    }
  }, []);

  const setAutoHideHudOnFocus = useCallback((enabled: boolean) => {
    setFocusPrefs((prev) => ({
      ...prev,
      autoHideHudOnFocus: enabled,
    }));
  }, []);

  const exitFocusMode = useCallback(() => {
    setFocusPrefs((prev) => ({
      ...prev,
      level: 'off',
      autoHideHudOnFocus: false,
    }));
    setStudyPanelOpen(false);
  }, []);

  return {
    session,
    evaluation,
    displayRemainingMmSs,
    displayTotalFocused,
    activePreset,
    focusPrefs,
    focusPolicy,
    studyPanelOpen,
    setStudyPanelOpen,
    startSession,
    endSession,
    updateSubject,
    setLinkedHskLesson,
    addTask,
    toggleTask,
    removeTask,
    startFocus,
    pauseTimer,
    resumeTimer,
    skipPhase,
    resetTimer,
    selectPreset,
    setFocusLevel,
    setAutoHideHudOnFocus,
    exitFocusMode,
  };
}
