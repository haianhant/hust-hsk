// ---------------------------------------------------------------------------
// test/study-social-contracts.test.cjs — Unit tests for PR6 Study & Social
// Architecture Preparation:
// - shared/contracts/study.ts (Study Rooms, Seats, Pomodoro Config, Presence)
// - features/study/pomodoro/timer.ts (Wall-clock Pomodoro, pause/resume,
//   multi-phase catch-up, refresh recovery)
// - features/study/study-session/session.ts (Personal Session State vs Room
//   State boundary, HSK non-interference, localStorage persistence)
// - features/study/focus-mode/focus-mode.ts (3D-independent Zen 2D mode)
// - features/social/rooms/seat-manager.ts (Authoritative seat claim, conflict
//   rejection, atomic seat switch, DO hibernation recovery)
// - features/social/presence/presence.ts (Public presence derivation & badge)
// ---------------------------------------------------------------------------

require('./register-ts.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  STUDY_ROOMS,
  STUDY_SEATS,
  DEFAULT_POMODORO_CONFIG,
  isValidStudyRoomZone,
  isValidSeatId,
  getSeatsForStudyRoom,
  sanitizePomodoroConfig,
  sanitizeStudyPresence,
} = require('../shared/contracts/study.ts');

const {
  POMODORO_STORAGE_KEY,
  POMODORO_PRESET_25_5,
  POMODORO_PRESET_50_10,
  getPomodoroPresetId,
  createPomodoroState,
  startPomodoro,
  pausePomodoro,
  resumePomodoro,
  resetPomodoro,
  applyPomodoroConfig,
  skipPomodoroPhase,
  evaluatePomodoroAt,
  formatRemainingMmSs,
  formatTotalFocusedDuration,
  serializePomodoroState,
  deserializePomodoroState,
} = require('../features/study/pomodoro/timer.ts');

const {
  STUDY_SESSION_STORAGE_KEY,
  MAX_STUDY_TASKS,
  MAX_FOCUS_HISTORY,
  CANONICAL_HSK_LESSON_OPTIONS,
  isValidCanonicalHskLessonId,
  formatHskLessonLabel,
  createInitialStudySession,
  startStudySession,
  endStudySession,
  addStudyTask,
  toggleStudyTask,
  removeStudyTask,
  linkHskLessonToSession,
  recordFocusBlockCompletion,
  syncStudySessionAt,
  collectUnnotifiedFocusBlocks,
  saveStudySession,
  loadStudySession,
} = require('../features/study/study-session/session.ts');

const {
  DEFAULT_FOCUS_PREFERENCES,
  FOCUS_MODE_STORAGE_KEY,
  sanitizeFocusPreferences,
  computeFocusRuntimePolicy,
  saveFocusPreferences,
  loadFocusPreferences,
} = require('../features/study/focus-mode/focus-mode.ts');

const {
  createSeatRegistry,
  claimSeat,
  releaseSeatByOccupant,
  getOccupantSeat,
  getStudyRoomAvailabilitySummary,
  restoreSeatRegistryFromAttachments,
} = require('../features/social/rooms/seat-manager.ts');

const {
  derivePlayerPresence,
  formatPresenceBadge,
} = require('../features/social/presence/presence.ts');

test('PR6 (1) Shared Study Contracts — rooms, seats, config & presence sanitizers', () => {
  assert.equal(STUDY_ROOMS.length, 4);
  assert.ok(isValidStudyRoomZone('library-lobby'));
  assert.ok(isValidStudyRoomZone('library-reading-3f'));
  assert.ok(isValidStudyRoomZone('c1-classroom-101'));
  assert.ok(isValidStudyRoomZone('tien-lake-pavilion'));
  assert.equal(isValidStudyRoomZone('unknown-zone'), false);

  const lobbySeats = getSeatsForStudyRoom('library-lobby');
  assert.equal(lobbySeats.length, 4);
  assert.ok(isValidSeatId('tqb-1f-t1-s1'));
  assert.equal(isValidSeatId('non-existent-seat'), false);
  assert.ok(STUDY_SEATS.length >= 14);

  // Config sanitizer clamps out-of-range durations
  const clamped = sanitizePomodoroConfig({
    focusDurationMs: 500, // too short -> clamped to 60_000
    shortBreakDurationMs: 999_999_999, // too long -> clamped to 7_200_000
    cyclesBeforeLongBreak: 0, // clamped to 1
  });
  assert.equal(clamped.focusDurationMs, 60_000);
  assert.equal(clamped.shortBreakDurationMs, 120 * 60 * 1000);
  assert.equal(clamped.cyclesBeforeLongBreak, 1);

  // Presence sanitizer strips control characters and resolves room from seatId
  const presence = sanitizeStudyPresence(
    {
      status: 'studying',
      seatId: 'tqb-3f-t1-s1',
      subjectTag: '  HSK 4 · Bài 10 \u0000\u0007 ',
    },
    1700000000000,
  );
  assert.equal(presence.status, 'studying');
  assert.equal(presence.studyRoomId, 'library-reading-3f');
  assert.equal(presence.seatId, 'tqb-3f-t1-s1');
  assert.equal(presence.pomodoroPhase, 'focus');
  assert.equal(presence.subjectTag, 'HSK 4 · Bài 10');
});

test('PR6 (2) Wall-Clock Pomodoro Timer — zero drift, pause/resume & multi-phase catch-up', () => {
  const t0 = 1_700_000_000_000;
  const focusMs = DEFAULT_POMODORO_CONFIG.focusDurationMs; // 25m
  const shortBreakMs = DEFAULT_POMODORO_CONFIG.shortBreakDurationMs; // 5m
  const longBreakMs = DEFAULT_POMODORO_CONFIG.longBreakDurationMs; // 15m

  let state = createPomodoroState();
  state = startPomodoro(state, t0, 'focus');
  assert.equal(state.phase, 'focus');
  assert.equal(state.running, true);
  assert.equal(state.phaseEndsAtMs, t0 + focusMs);

  // 10 minutes later: exact wall-clock calculation without any intermediate ticks
  const eval10m = evaluatePomodoroAt(state, t0 + 10 * 60 * 1000);
  assert.equal(eval10m.remainingMs, 15 * 60 * 1000);
  assert.equal(formatRemainingMmSs(eval10m.remainingMs), '15:00');

  // Pause at +10m, wait 20 minutes while paused, then resume at +30m
  const paused = pausePomodoro(eval10m.state, t0 + 10 * 60 * 1000);
  assert.equal(paused.running, false);
  assert.equal(paused.pausedRemainingMs, 15 * 60 * 1000);

  const evalWhilePaused = evaluatePomodoroAt(paused, t0 + 30 * 60 * 1000);
  assert.equal(evalWhilePaused.remainingMs, 15 * 60 * 1000);

  const resumed = resumePomodoro(paused, t0 + 30 * 60 * 1000);
  assert.equal(resumed.running, true);
  assert.equal(resumed.phaseEndsAtMs, t0 + 45 * 60 * 1000);

  // Simulate background tab or reload after 4 full cycles:
  // 4 focus blocks (4 * 25m = 100m) + 3 short breaks (3 * 5m = 15m) + 2m into long break = 117m
  let cycleState = startPomodoro(createPomodoroState(), t0, 'focus');
  const elapsedForLongBreak = 4 * focusMs + 3 * shortBreakMs + 2 * 60 * 1000;
  const evalLongBreak = evaluatePomodoroAt(cycleState, t0 + elapsedForLongBreak, {
    autoAdvance: true,
  });

  assert.equal(evalLongBreak.state.phase, 'long-break');
  assert.equal(evalLongBreak.state.completedFocusBlocks, 4);
  assert.equal(evalLongBreak.state.totalFocusedMs, 4 * focusMs);
  assert.equal(evalLongBreak.remainingMs, longBreakMs - 2 * 60 * 1000);

  // Serialization & reload recovery
  const rawJson = serializePomodoroState(cycleState);
  const recovered = deserializePomodoroState(rawJson, t0 + focusMs + 60 * 1000);
  assert.equal(recovered.state.phase, 'short-break');
  assert.equal(recovered.state.completedFocusBlocks, 1);
  assert.equal(recovered.remainingMs, shortBreakMs - 60 * 1000);
});

test('PR6 (3) Focus Mode — Pomodoro & HSK work with 3D WebGL rendering suspended', () => {
  const defaultPolicy = computeFocusRuntimePolicy(DEFAULT_FOCUS_PREFERENCES, 'idle');
  assert.equal(defaultPolicy.suspend3DRendering, false);
  assert.equal(defaultPolicy.hideNavigationHud, false);
  assert.equal(defaultPolicy.allowLearningAndPomodoro, true);

  // Auto-minimal HUD when entering focus phase
  const focusAutoPolicy = computeFocusRuntimePolicy(DEFAULT_FOCUS_PREFERENCES, 'focus');
  assert.equal(focusAutoPolicy.effectiveLevel, 'minimal-hud');
  assert.equal(focusAutoPolicy.suspend3DRendering, false);
  assert.equal(focusAutoPolicy.hideNavigationHud, true);
  assert.equal(focusAutoPolicy.allowLearningAndPomodoro, true);

  // Explicit Zen 2D mode suspends 3D rendering completely while keeping Pomodoro + HSK active
  const zenPrefs = sanitizeFocusPreferences({ level: 'zen-2d', ambientTrack: 'library-rain' });
  const zenPolicy = computeFocusRuntimePolicy(zenPrefs, 'focus');
  assert.equal(zenPolicy.effectiveLevel, 'zen-2d');
  assert.equal(zenPolicy.suspend3DRendering, true);
  assert.equal(zenPolicy.hideNavigationHud, true);
  assert.equal(zenPolicy.hideMovementControls, true);
  assert.equal(zenPolicy.allowLearningAndPomodoro, true);
});

test('PR6 (4) Study Session & HSK Boundary — isolated storage & optional lesson linking', () => {
  const mem = new Map();
  const storage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, v),
  };

  // Seed a mock HSK progress entry to verify StudySession never touches or overwrites it
  storage.setItem('bkhn_hsk3_progress_v1', '{"points":250}');

  const t0 = 1_700_000_000_000;
  let session = createInitialStudySession();
  session = startStudySession(session, {
    nowMs: t0,
    subjectTag: 'Ôn thi HSK 4',
    linkedHskLessonId: 'hsk4-shang-l3',
    studyRoomId: 'library-lobby',
    seatId: 'tqb-1f-t1-s1',
  });
  session = addStudyTask(session, 'Ôn 20 từ bài 3 HSK 4', t0 + 1000);
  session = toggleStudyTask(session, session.tasks[0].id, t0 + 5000);
  session = recordFocusBlockCompletion(session, {
    startedAtMs: t0,
    endedAtMs: t0 + 25 * 60 * 1000,
    durationMs: 25 * 60 * 1000,
  });

  saveStudySession(storage, session);
  assert.equal(storage.getItem('bkhn_hsk3_progress_v1'), '{"points":250}');
  assert.ok(storage.getItem(STUDY_SESSION_STORAGE_KEY));

  const loaded = loadStudySession(storage, t0 + 25 * 60 * 1000);
  assert.equal(loaded.active, true);
  assert.equal(loaded.linkedHskLessonId, 'hsk4-shang-l3');
  assert.equal(loaded.tasks.length, 1);
  assert.equal(loaded.tasks[0].done, true);
  assert.equal(loaded.history.length, 1);
  assert.equal(loaded.history[0].durationMs, 25 * 60 * 1000);

  const ended = endStudySession(linkHskLessonToSession(loaded, 'hsk3-l12'));
  assert.equal(ended.active, false);
  assert.equal(ended.seatId, null);
  assert.equal(ended.linkedHskLessonId, 'hsk3-l12');
});

test('PR6 (5) Authoritative Seat Occupancy & DO Hibernation Recovery', () => {
  const registry = createSeatRegistry();

  // Student A claims seat 1 in Library Lobby
  const claimA = claimSeat(registry, {
    seatId: 'tqb-1f-t1-s1',
    occupantId: 'student-a',
    occupantName: 'Nguyễn Hải Anh',
    occupantMssv: '20226010',
    subjectTag: 'HSK 4 · Bài 2',
    nowMs: 1000,
  });
  assert.equal(claimA.ok, true);
  assert.equal(claimA.releasedPreviousSeatId, null);

  // Student B tries to claim the same seat -> rejected authoritatively
  const claimBConflict = claimSeat(registry, {
    seatId: 'tqb-1f-t1-s1',
    occupantId: 'student-b',
    occupantName: 'Trần Minh',
    occupantMssv: '20226011',
    nowMs: 1500,
  });
  assert.equal(claimBConflict.ok, false);
  assert.equal(claimBConflict.reason, 'already-occupied');
  assert.equal(claimBConflict.occupiedBy, 'student-a');

  // Student A switches to seat 2 -> seat 1 is atomically released
  const switchA = claimSeat(registry, {
    seatId: 'tqb-1f-t1-s2',
    occupantId: 'student-a',
    occupantName: 'Nguyễn Hải Anh',
    occupantMssv: '20226010',
    nowMs: 2000,
  });
  assert.equal(switchA.ok, true);
  assert.equal(switchA.releasedPreviousSeatId, 'tqb-1f-t1-s1');

  // Now Student B can claim seat 1
  const claimBOk = claimSeat(registry, {
    seatId: 'tqb-1f-t1-s1',
    occupantId: 'student-b',
    occupantName: 'Trần Minh',
    occupantMssv: '20226011',
    nowMs: 2500,
  });
  assert.equal(claimBOk.ok, true);

  // Availability summary reflects 2 occupied seats in library-lobby
  const summary = getStudyRoomAvailabilitySummary(registry);
  const lobbySummary = summary.find((r) => r.studyRoomId === 'library-lobby');
  assert.equal(lobbySummary.occupiedSeats, 2);
  assert.equal(lobbySummary.availableSeats, 2);

  // Disconnect cleanup releases Student A's seat
  const released = releaseSeatByOccupant(registry, 'student-a');
  assert.equal(released.seatId, 'tqb-1f-t1-s2');
  assert.equal(getOccupantSeat(registry, 'student-a'), null);

  // Durable Object Hibernation restoration from socket attachments
  const restored = restoreSeatRegistryFromAttachments([
    {
      occupantId: 'student-b',
      occupantName: 'Trần Minh',
      occupantMssv: '20226011',
      seatId: 'tqb-3f-t1-s1',
      occupiedAtMs: 5000,
      subjectTag: 'Giải tích 1',
    },
    {
      occupantId: 'student-c',
      occupantName: 'Lê Lan',
      occupantMssv: '20226012',
      seatId: 'tqb-3f-t1-s1', // duplicate claim later in time -> ignored deterministically
      occupiedAtMs: 6000,
    },
  ]);
  assert.equal(getOccupantSeat(restored, 'student-b').seatId, 'tqb-3f-t1-s1');
  assert.equal(getOccupantSeat(restored, 'student-c'), null);
});

test('PR6 (6) Player Presence Derivation & Badge Formatting', () => {
  const t0 = 1_700_000_000_000;
  let session = startStudySession(createInitialStudySession(), {
    nowMs: t0,
    subjectTag: 'HSK 4 · Bài 8',
    studyRoomId: 'library-lobby',
    seatId: 'tqb-1f-t1-s1',
  });
  session = {
    ...session,
    pomodoro: startPomodoro(session.pomodoro, t0, 'focus'),
  };

  const presence = derivePlayerPresence({
    session,
    inClassroom: false,
    inLibraryLobby: true,
    nowMs: t0,
  });
  assert.equal(presence.status, 'studying');
  assert.equal(presence.studyRoomId, 'library-lobby');
  assert.equal(presence.seatId, 'tqb-1f-t1-s1');
  assert.equal(presence.pomodoroPhase, 'focus');
  assert.equal(formatPresenceBadge(presence), '🍅 Đang tự học · HSK 4 · Bài 8');
});

test('PR7 (7) Pomodoro Presets (25/5 & 50/10), Skip Phase, Reset & Duration Formatting', () => {
  const t0 = 1_700_000_000_000;
  let state = createPomodoroState();
  assert.equal(getPomodoroPresetId(state.config), '25-5');

  // Switch to 50/10 preset
  state = applyPomodoroConfig(state, POMODORO_PRESET_50_10);
  assert.equal(getPomodoroPresetId(state.config), '50-10');
  assert.equal(state.config.focusDurationMs, 50 * 60 * 1000);
  assert.equal(state.config.shortBreakDurationMs, 10 * 60 * 1000);

  // Start focus in 50/10 mode
  state = startPomodoro(state, t0, 'focus');
  assert.equal(state.phase, 'focus');
  assert.equal(state.phaseEndsAtMs, t0 + 50 * 60 * 1000);

  // Skip phase transitions focus -> short-break without crediting an unfinished focus block
  const skipped = skipPomodoroPhase(state, t0 + 5 * 60 * 1000, true);
  assert.equal(skipped.phase, 'short-break');
  assert.equal(skipped.completedFocusBlocks, 0);
  assert.equal(skipped.phaseEndsAtMs, t0 + 15 * 60 * 1000);

  // Reset returns to idle while preserving completedFocusBlocks & totalFocusedMs
  const withStats = {
    ...skipped,
    completedFocusBlocks: 3,
    totalFocusedMs: 75 * 60 * 1000,
  };
  const reset = resetPomodoro(withStats);
  assert.equal(reset.phase, 'idle');
  assert.equal(reset.running, false);
  assert.equal(reset.completedFocusBlocks, 3);
  assert.equal(reset.totalFocusedMs, 75 * 60 * 1000);
  assert.equal(formatTotalFocusedDuration(reset.totalFocusedMs), '1 giờ 15 phút');
  assert.equal(formatTotalFocusedDuration(25 * 60 * 1000), '25 phút');
  assert.equal(formatTotalFocusedDuration(120 * 60 * 1000), '2 giờ');
});

test('PR7 (8) Single-Counted Focus Block Completion across Reload, Background Tab & Duplicate Ticks', () => {
  const mem = new Map();
  const storage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, v),
  };

  const t0 = 1_700_000_000_000;
  const focusMs = POMODORO_PRESET_25_5.focusDurationMs;

  let session = startStudySession(createInitialStudySession(), {
    nowMs: t0,
    subjectTag: 'Giải tích 1',
  });
  session = {
    ...session,
    pomodoro: startPomodoro(session.pomodoro, t0, 'focus'),
  };
  saveStudySession(storage, session);

  // 1) Reload while focusing (at +10m): still in focus, 15m remaining, 0 completed blocks
  const reloadedMidFocus = loadStudySession(storage, t0 + 10 * 60 * 1000);
  assert.equal(reloadedMidFocus.active, true);
  assert.equal(reloadedMidFocus.pomodoro.phase, 'focus');
  assert.equal(reloadedMidFocus.pomodoro.running, true);
  assert.equal(reloadedMidFocus.pomodoro.completedFocusBlocks, 0);
  assert.equal(reloadedMidFocus.history.length, 0);

  // 2) Pause at +10m, save, and reload while paused at +40m: remains paused with 15m left
  const pausedSession = {
    ...reloadedMidFocus,
    pomodoro: pausePomodoro(reloadedMidFocus.pomodoro, t0 + 10 * 60 * 1000),
  };
  saveStudySession(storage, pausedSession);
  const reloadedPaused = loadStudySession(storage, t0 + 40 * 60 * 1000);
  assert.equal(reloadedPaused.pomodoro.running, false);
  assert.equal(reloadedPaused.pomodoro.phase, 'focus');
  assert.equal(reloadedPaused.pomodoro.pausedRemainingMs, 15 * 60 * 1000);
  assert.equal(reloadedPaused.history.length, 0);

  // 3) Resume at +40m (ends at +55m). Simulate timer reaching zero while tab is hidden/closed,
  //    then reload at +56m: block is counted ONCE in both pomodoro.completedFocusBlocks and history.
  const resumedSession = {
    ...reloadedPaused,
    pomodoro: resumePomodoro(reloadedPaused.pomodoro, t0 + 40 * 60 * 1000),
  };
  saveStudySession(storage, resumedSession);

  const reloadedAfterFinish1 = loadStudySession(storage, t0 + 56 * 60 * 1000);
  const reloadedAfterFinish2 = loadStudySession(storage, t0 + 56 * 60 * 1000);
  assert.equal(reloadedAfterFinish1.pomodoro.phase, 'short-break');
  assert.equal(reloadedAfterFinish1.pomodoro.completedFocusBlocks, 1);
  assert.equal(reloadedAfterFinish1.history.length, 1);
  assert.equal(reloadedAfterFinish2.history.length, 1);

  // Save the reconciled session and run multiple sync ticks: still counted exactly once
  saveStudySession(storage, reloadedAfterFinish1);
  const tick1 = syncStudySessionAt(reloadedAfterFinish1, t0 + 56 * 60 * 1000 + 250);
  const tick2 = syncStudySessionAt(tick1.session, t0 + 56 * 60 * 1000 + 500);
  assert.equal(tick1.newlyCompletedBlocks, 0);
  assert.equal(tick2.newlyCompletedBlocks, 0);
  assert.equal(tick2.session.pomodoro.completedFocusBlocks, 1);
  assert.equal(tick2.session.history.length, 1);

  // Duplicate manual recordFocusBlockCompletion with the same endedAtMs is a no-op
  const dupAttempt = recordFocusBlockCompletion(tick2.session, {
    startedAtMs: t0 + 30 * 60 * 1000,
    endedAtMs: t0 + 55 * 60 * 1000,
    durationMs: focusMs,
  });
  assert.equal(dupAttempt.history.length, 1);
});

test('PR7 (9) Corrupted Storage Recovery, Legacy Migration, Task CRUD & Focus Preferences', () => {
  const mem = new Map();
  const storage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, v),
  };

  // Corrupted JSON in both keys recovers cleanly without throwing
  storage.setItem(STUDY_SESSION_STORAGE_KEY, '{corrupted-json');
  storage.setItem(FOCUS_MODE_STORAGE_KEY, 'not-valid-json');
  const recoveredSession = loadStudySession(storage, 1_700_000_000_000);
  const recoveredFocus = loadFocusPreferences(storage);
  assert.equal(recoveredSession.active, false);
  assert.equal(recoveredSession.pomodoro.phase, 'idle');
  assert.equal(recoveredFocus.level, 'off');

  // Legacy POMODORO_STORAGE_KEY migration when STUDY_SESSION_STORAGE_KEY is absent
  mem.delete(STUDY_SESSION_STORAGE_KEY);
  const legacyTimer = startPomodoro(createPomodoroState(), 1_700_000_000_000, 'focus');
  storage.setItem(POMODORO_STORAGE_KEY, serializePomodoroState(legacyTimer));
  const migratedSession = loadStudySession(storage, 1_700_000_000_000 + 5 * 60 * 1000);
  assert.equal(migratedSession.active, true);
  assert.equal(migratedSession.pomodoro.phase, 'focus');

  // Task CRUD: add, ignore blank, toggle, remove, cap at MAX_STUDY_TASKS
  let s = createInitialStudySession();
  s = addStudyTask(s, '   ', 1000);
  assert.equal(s.tasks.length, 0);
  s = addStudyTask(s, 'Đọc ngữ pháp bài 10', 1001);
  s = addStudyTask(s, 'Làm bài tập đọc hiểu', 1002);
  assert.equal(s.tasks.length, 2);
  s = toggleStudyTask(s, s.tasks[0].id, 1005);
  assert.equal(s.tasks[0].done, true);
  assert.equal(s.tasks[0].completedAtMs, 1005);
  s = removeStudyTask(s, s.tasks[0].id);
  assert.equal(s.tasks.length, 1);
  assert.equal(s.tasks[0].title, 'Làm bài tập đọc hiểu');

  for (let i = 0; i < MAX_STUDY_TASKS + 5; i++) {
    s = addStudyTask(s, `Task ${i}`, 2000 + i);
  }
  assert.equal(s.tasks.length, MAX_STUDY_TASKS);

  // Focus Mode preference persistence & Normal 3D override during focus
  saveFocusPreferences(storage, {
    level: 'off',
    ambientTrack: 'none',
    ambientVolume: 0.4,
    autoHideHudOnFocus: false,
    muteMovementNotifications: true,
  });
  const loadedPrefs = loadFocusPreferences(storage);
  assert.equal(loadedPrefs.autoHideHudOnFocus, false);
  const normalDuringFocusPolicy = computeFocusRuntimePolicy(loadedPrefs, 'focus');
  assert.equal(normalDuringFocusPolicy.effectiveLevel, 'off');
  assert.equal(normalDuringFocusPolicy.suspend3DRendering, false);
  assert.equal(normalDuringFocusPolicy.hideNavigationHud, false);
});

test('PR7 Review Fix (10) Referential Identity on Non-Transition Ticks & Strict Mode Notification Deduplication', () => {
  const t0 = 1_700_000_000_000;
  let session = startStudySession(createInitialStudySession(), {
    nowMs: t0,
    subjectTag: 'HSK 4 · Bài 5',
  });
  session = {
    ...session,
    pomodoro: startPomodoro(session.pomodoro, t0, 'focus'),
  };

  // Evaluating at +250ms, +500ms, +10s (before phaseEndsAtMs) must preserve
  // exact object references (===) so React state and localStorage are not dirtied.
  const eval250 = evaluatePomodoroAt(session.pomodoro, t0 + 250);
  assert.equal(eval250.transitioned, false);
  assert.equal(eval250.state, session.pomodoro);

  const sync250 = syncStudySessionAt(session, t0 + 250);
  assert.equal(sync250.newlyCompletedBlocks, 0);
  assert.equal(sync250.session, session);

  // When phase boundary IS reached at +25m, a new session is returned and
  // collectUnnotifiedFocusBlocks emits the completed block AT MOST ONCE even
  // when invoked twice (React Strict Mode double effect invocation).
  const syncDone = syncStudySessionAt(session, t0 + 25 * 60 * 1000);
  assert.equal(syncDone.newlyCompletedBlocks, 1);
  assert.notEqual(syncDone.session, session);

  const notifiedIds = new Set();
  const firstEffectPass = collectUnnotifiedFocusBlocks(syncDone.session.history, notifiedIds);
  const secondStrictModePass = collectUnnotifiedFocusBlocks(syncDone.session.history, notifiedIds);
  assert.equal(firstEffectPass.length, 1);
  assert.equal(secondStrictModePass.length, 0);
});

test('PR7 Review Fix (11) 50-Entry Focus History Cap (MAX_FOCUS_HISTORY) & Duplicate Reconciliation', () => {
  const t0 = 1_700_000_000_000;
  const focusMs = POMODORO_PRESET_25_5.focusDurationMs;
  const shortBreakMs = POMODORO_PRESET_25_5.shortBreakDurationMs;

  let session = startStudySession(createInitialStudySession(), {
    nowMs: t0,
    subjectTag: 'Ôn tập dài hạn',
  });

  // Pre-populate exactly MAX_FOCUS_HISTORY (50) completed focus blocks
  for (let i = 1; i <= MAX_FOCUS_HISTORY; i++) {
    const startMs = t0 + (i - 1) * 30 * 60 * 1000;
    session = recordFocusBlockCompletion(session, {
      startedAtMs: startMs,
      endedAtMs: startMs + focusMs,
      durationMs: focusMs,
    });
  }
  assert.equal(session.history.length, MAX_FOCUS_HISTORY);
  assert.equal(session.history[0].id, `focus-${t0 + focusMs}`);

  // Start the 51st focus block after the first 50 blocks
  const t51Start = t0 + 60 * 60 * 60 * 1000;
  session = {
    ...session,
    pomodoro: startPomodoro(session.pomodoro, t51Start, 'focus'),
  };

  // Complete the 51st focus block: history stays capped at 50, AND newlyCompletedBlocks === 1
  const sync51 = syncStudySessionAt(session, t51Start + focusMs);
  assert.equal(sync51.newlyCompletedBlocks, 1);
  assert.equal(sync51.session.history.length, MAX_FOCUS_HISTORY);
  assert.equal(sync51.session.history[MAX_FOCUS_HISTORY - 1].endedAtMs, t51Start + focusMs);

  // Advance across short break + 52nd focus + short break + 53rd focus (2 more focus blocks at once)
  const elapsedTwoMoreFocus = shortBreakMs + focusMs + shortBreakMs + focusMs;
  const sync53 = syncStudySessionAt(sync51.session, t51Start + focusMs + elapsedTwoMoreFocus);
  assert.equal(sync53.newlyCompletedBlocks, 2);
  assert.equal(sync53.session.history.length, MAX_FOCUS_HISTORY);

  // Re-running sync at the same timestamp or recording the 53rd block again produces 0 new blocks
  const sync53Dup = syncStudySessionAt(sync53.session, t51Start + focusMs + elapsedTwoMoreFocus);
  assert.equal(sync53Dup.newlyCompletedBlocks, 0);
  assert.equal(sync53Dup.session, sync53.session);
});

test('PR7 Review Fix (12) Canonical HSK Lesson IDs & Friendly Labels', () => {
  // 9 HSK 3 lessons (l10..l18) + 20 HSK 4 lessons (shang l1..l10, xia l11..l20) = 29 lessons
  assert.equal(CANONICAL_HSK_LESSON_OPTIONS.length, 29);
  assert.equal(CANONICAL_HSK_LESSON_OPTIONS[0].id, 'hsk3-l10');
  assert.ok(CANONICAL_HSK_LESSON_OPTIONS[0].label.includes('HSK 3 · Bài 10'));
  assert.ok(isValidCanonicalHskLessonId('hsk3-l10'));
  assert.ok(isValidCanonicalHskLessonId('hsk4-shang-l5'));
  assert.ok(isValidCanonicalHskLessonId('hsk4-xia-l20'));
  assert.equal(isValidCanonicalHskLessonId('HSK 3 · Bài 10'), false);

  const label = formatHskLessonLabel('hsk4-shang-l5');
  assert.ok(label && label.startsWith('HSK 4 · Bài 5 — '));
});


