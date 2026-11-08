// ---------------------------------------------------------------------------
// features/study/study-session/session.ts — Personal Study Session state
// (`feature.study.session`).
//
// ARCHITECTURAL INVARIANTS (PR6):
// 1. Personal Session State (tasks, focus block history, linked HSK context)
//    is strictly isolated from Shared Room State (seats & multiplayer presence).
// 2. HSK Learning (`feature.learning.hsk` / `lib/learn/store.ts`) remains an
//    independent module with its own storage key (`bkhn_hsk3_progress_v1`);
//    Study Session only stores optional non-intrusive references (`linkedHskLessonId`).
// ---------------------------------------------------------------------------

import {
  isValidStudyRoomZone,
  sanitizeSubjectTag,
  type StudyRoomZoneId,
} from '../../../shared/contracts/study';
import {
  createPomodoroState,
  deserializePomodoroState,
  serializePomodoroState,
  type PomodoroState,
} from '../pomodoro/timer';

export const STUDY_SESSION_STORAGE_KEY = 'bkhn_study_session_v1';
export const MAX_STUDY_TASKS = 25;
export const MAX_FOCUS_HISTORY = 50;

export interface StudyTaskItem {
  id: string;
  title: string;
  done: boolean;
  createdAtMs: number;
  completedAtMs: number | null;
}

export interface CompletedFocusBlock {
  id: string;
  startedAtMs: number;
  endedAtMs: number;
  durationMs: number;
  studyRoomId: StudyRoomZoneId | null;
  seatId: string | null;
  subjectTag: string | null;
  linkedHskLessonId: string | null;
}

export interface StudySessionState {
  version: 1;
  active: boolean;
  sessionStartedAtMs: number | null;
  subjectTag: string | null;
  /** Optional link to an HSK 3/4 lesson (does not replace HSK Progress store). */
  linkedHskLessonId: string | null;
  studyRoomId: StudyRoomZoneId | null;
  seatId: string | null;
  pomodoro: PomodoroState;
  tasks: StudyTaskItem[];
  history: CompletedFocusBlock[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createInitialStudySession(): StudySessionState {
  return {
    version: 1,
    active: false,
    sessionStartedAtMs: null,
    subjectTag: 'Tự học HSK',
    linkedHskLessonId: null,
    studyRoomId: null,
    seatId: null,
    pomodoro: createPomodoroState(),
    tasks: [],
    history: [],
  };
}

export function startStudySession(
  session: StudySessionState,
  params: {
    nowMs: number;
    subjectTag?: string | null;
    linkedHskLessonId?: string | null;
    studyRoomId?: StudyRoomZoneId | null;
    seatId?: string | null;
  },
): StudySessionState {
  return {
    ...session,
    active: true,
    sessionStartedAtMs: session.sessionStartedAtMs ?? params.nowMs,
    subjectTag:
      params.subjectTag !== undefined
        ? sanitizeSubjectTag(params.subjectTag)
        : session.subjectTag,
    linkedHskLessonId:
      params.linkedHskLessonId !== undefined
        ? params.linkedHskLessonId
        : session.linkedHskLessonId,
    studyRoomId:
      params.studyRoomId !== undefined ? params.studyRoomId : session.studyRoomId,
    seatId: params.seatId !== undefined ? params.seatId : session.seatId,
  };
}

export function endStudySession(session: StudySessionState): StudySessionState {
  return {
    ...session,
    active: false,
    sessionStartedAtMs: null,
    seatId: null,
    pomodoro: {
      ...session.pomodoro,
      phase: 'idle',
      running: false,
      phaseStartedAtMs: null,
      phaseEndsAtMs: null,
      pausedRemainingMs: null,
    },
  };
}

export function bindSessionSeat(
  session: StudySessionState,
  studyRoomId: StudyRoomZoneId | null,
  seatId: string | null,
): StudySessionState {
  return {
    ...session,
    studyRoomId,
    seatId,
  };
}

export function linkHskLessonToSession(
  session: StudySessionState,
  lessonId: string | null,
  subjectTag?: string | null,
): StudySessionState {
  return {
    ...session,
    linkedHskLessonId: lessonId,
    subjectTag:
      subjectTag !== undefined
        ? sanitizeSubjectTag(subjectTag)
        : lessonId
          ? sanitizeSubjectTag(`HSK · ${lessonId}`)
          : session.subjectTag,
  };
}

export function addStudyTask(
  session: StudySessionState,
  title: string,
  nowMs: number = Date.now(),
): StudySessionState {
  const cleaned = title.trim().slice(0, 120);
  if (!cleaned) return session;
  const newItem: StudyTaskItem = {
    id: `task-${nowMs}-${session.tasks.length + 1}`,
    title: cleaned,
    done: false,
    createdAtMs: nowMs,
    completedAtMs: null,
  };
  const tasks = [...session.tasks, newItem].slice(-MAX_STUDY_TASKS);
  return { ...session, tasks };
}

export function toggleStudyTask(
  session: StudySessionState,
  taskId: string,
  nowMs: number = Date.now(),
): StudySessionState {
  const tasks = session.tasks.map((t) =>
    t.id === taskId
      ? {
          ...t,
          done: !t.done,
          completedAtMs: !t.done ? nowMs : null,
        }
      : t,
  );
  return { ...session, tasks };
}

export function removeStudyTask(
  session: StudySessionState,
  taskId: string,
): StudySessionState {
  return {
    ...session,
    tasks: session.tasks.filter((t) => t.id !== taskId),
  };
}

export function recordFocusBlockCompletion(
  session: StudySessionState,
  block: {
    startedAtMs: number;
    endedAtMs: number;
    durationMs: number;
  },
): StudySessionState {
  const entry: CompletedFocusBlock = {
    id: `focus-${block.endedAtMs}-${session.history.length + 1}`,
    startedAtMs: block.startedAtMs,
    endedAtMs: block.endedAtMs,
    durationMs: Math.max(0, block.durationMs),
    studyRoomId: session.studyRoomId,
    seatId: session.seatId,
    subjectTag: session.subjectTag,
    linkedHskLessonId: session.linkedHskLessonId,
  };
  const history = [...session.history, entry].slice(-MAX_FOCUS_HISTORY);
  return { ...session, history };
}

export function saveStudySession(
  storage: StorageLike,
  session: StudySessionState,
): void {
  storage.setItem(STUDY_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function loadStudySession(
  storage: StorageLike,
  nowMs: number = Date.now(),
): StudySessionState {
  const raw = storage.getItem(STUDY_SESSION_STORAGE_KEY);
  if (!raw) return createInitialStudySession();
  try {
    const parsed = JSON.parse(raw) as Partial<StudySessionState>;
    if (!parsed || typeof parsed !== 'object') return createInitialStudySession();

    const pomodoroEval = deserializePomodoroState(
      parsed.pomodoro ? serializePomodoroState(parsed.pomodoro as PomodoroState) : null,
      nowMs,
      { autoAdvance: true },
    );

    const tasks: StudyTaskItem[] = Array.isArray(parsed.tasks)
      ? parsed.tasks
          .filter(
            (t): t is StudyTaskItem =>
              !!t &&
              typeof t.id === 'string' &&
              typeof t.title === 'string' &&
              typeof t.done === 'boolean',
          )
          .slice(-MAX_STUDY_TASKS)
      : [];

    const history: CompletedFocusBlock[] = Array.isArray(parsed.history)
      ? parsed.history
          .filter(
            (h): h is CompletedFocusBlock =>
              !!h &&
              typeof h.id === 'string' &&
              typeof h.durationMs === 'number' &&
              Number.isFinite(h.durationMs),
          )
          .slice(-MAX_FOCUS_HISTORY)
      : [];

    return {
      version: 1,
      active: Boolean(parsed.active),
      sessionStartedAtMs:
        typeof parsed.sessionStartedAtMs === 'number' &&
        Number.isFinite(parsed.sessionStartedAtMs)
          ? parsed.sessionStartedAtMs
          : null,
      subjectTag: sanitizeSubjectTag(parsed.subjectTag) ?? 'Tự học HSK',
      linkedHskLessonId:
        typeof parsed.linkedHskLessonId === 'string' ? parsed.linkedHskLessonId : null,
      studyRoomId: isValidStudyRoomZone(parsed.studyRoomId) ? parsed.studyRoomId : null,
      seatId: typeof parsed.seatId === 'string' ? parsed.seatId : null,
      pomodoro: pomodoroEval.state,
      tasks,
      history,
    };
  } catch {
    return createInitialStudySession();
  }
}
