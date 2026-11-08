'use client';

// ---------------------------------------------------------------------------
// features/study/study-session/useStudySession.ts — Authoritative React state
// and persistence hook for Study Session, Wall-Clock Pomodoro, and Focus Mode.
//
// ARCHITECTURAL INVARIANTS:
// 1. `STUDY_SESSION_STORAGE_KEY` (`bkhn_study_session_v1`) is the single
//    authoritative store for the active StudySessionState and its embedded
//    `pomodoro: PomodoroState`.
// 2. Does NOT run a 250ms UI tick at the top-level `HomePage`. Business state
//    (`session`) and `localStorage` only update when a user action occurs or
//    when a phase boundary (`nowMs >= phaseEndsAtMs`) is reached.
// 3. All `setSession` functional updaters are 100% pure (zero side effects).
//    Focus block completion notifications are emitted in a dedicated `useEffect`
//    via `collectUnnotifiedFocusBlocks` so each completed block triggers at most
//    one notification even under React Strict Mode.
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
  type PomodoroPresetId,
} from '../pomodoro/timer';
import {
  addStudyTask,
  collectUnnotifiedFocusBlocks,
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
  focusPrefs: FocusModePreferences;
  focusPolicy: FocusRuntimePolicy;
  studyPanelOpen: boolean;
  setStudyPanelOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  reconcileAt: (nowMs?: number) => void;
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
  const notifiedBlockIdsRef = useRef<Set<string>>(new Set());

  // Load persisted session and focus preferences on client mount
  useEffect(() => {
    try {
      const nowMs = Date.now();
      const loadedSession = loadStudySession(window.localStorage, nowMs);
      const loadedFocus = loadFocusPreferences(window.localStorage);
      // Seed notified set with blocks already present at mount so reload doesn't re-toast old history
      notifiedBlockIdsRef.current = new Set(loadedSession.history.map((b) => b.id));
      setSession(loadedSession);
      setFocusPrefs(loadedFocus);
      saveStudySession(window.localStorage, loadedSession);
    } catch {
      // Ignore storage access errors in restricted environments
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist session changes to authoritative localStorage key (only when session state changes)
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

  // Emit at most one notification per newly completed focus block outside state updaters
  useEffect(() => {
    if (!hydrated) return;
    const freshBlocks = collectUnnotifiedFocusBlocks(
      session.history,
      notifiedBlockIdsRef.current,
    );
    if (freshBlocks.length > 0) {
      onNotifyRef.current?.(
        `🎉 Hoàn thành ${freshBlocks.length} phiên Focus! Chuyển sang pha nghỉ.`,
      );
    }
  }, [hydrated, session.history]);

  // Pure wall-clock phase reconciliation (no side effects inside setSession)
  const reconcileAt = useCallback((nowMs: number = Date.now()) => {
    setSession((prev) => {
      if (!prev.pomodoro.running || prev.pomodoro.phase === 'idle') {
        return prev;
      }
      if (prev.pomodoro.phaseEndsAtMs !== null && nowMs < prev.pomodoro.phaseEndsAtMs) {
        return prev;
      }
      const synced = syncStudySessionAt(prev, nowMs, { autoAdvance: true });
      return synced.session;
    });
  }, []);

  // Schedule exact boundary wakeup + background tab visibility reconciliation
  useEffect(() => {
    if (!session.pomodoro.running || session.pomodoro.phase === 'idle') {
      return;
    }

    const onVisibility = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        reconcileAt(Date.now());
      }
    };
    const onFocus = () => reconcileAt(Date.now());

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    const endsAt = session.pomodoro.phaseEndsAtMs;
    if (endsAt === null) {
      return () => {
        window.removeEventListener('focus', onFocus);
        document.removeEventListener('visibilitychange', onVisibility);
      };
    }

    const delayMs = Math.max(0, endsAt - Date.now() + 15);
    const timeoutId = window.setTimeout(() => {
      reconcileAt(Date.now());
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [
    session.pomodoro.running,
    session.pomodoro.phase,
    session.pomodoro.phaseEndsAtMs,
    reconcileAt,
  ]);

  const focusPolicy = useMemo(
    () => computeFocusRuntimePolicy(focusPrefs, session.pomodoro.phase),
    [focusPrefs, session.pomodoro.phase],
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
    focusPrefs,
    focusPolicy,
    studyPanelOpen,
    setStudyPanelOpen,
    reconcileAt,
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
