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
  PR9_SUPPORTED_STUDY_ROOM_ZONES,
  DEFAULT_POMODORO_CONFIG,
  isValidStudyRoomZone,
  isSupportedStudyRoomZone,
  isValidSeatId,
  isSupportedLibrarySeatId,
  getSeatsForStudyRoom,
  sanitizeRequestId,
  sanitizeSeatOccupancy,
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
  releaseSeat,
  releaseSeatByOccupant,
  getOccupantSeat,
  updateOccupantMetaInSeatRegistry,
  reconcileServerPresenceWithSeat,
  getStudyRoomAvailabilitySummary,
  restoreSeatRegistryFromAttachments,
} = require('../features/social/rooms/seat-manager.ts');

const {
  derivePlayerPresence,
  isSamePublicPresence,
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
      seatId: 'tqb-1f-t1-s1',
      occupiedAtMs: 5000,
      subjectTag: 'Giải tích 1',
    },
    {
      occupantId: 'student-c',
      occupantName: 'Lê Lan',
      occupantMssv: '20226012',
      seatId: 'tqb-1f-t1-s1', // duplicate claim later in time -> ignored deterministically
      occupiedAtMs: 6000,
    },
  ]);
  assert.equal(getOccupantSeat(restored, 'student-b').seatId, 'tqb-1f-t1-s1');
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

test('PR9 (1-10) Server-Authoritative Seat Manager — claims, zone restriction, auth, conflicts, switch, release & hibernation recovery', () => {
  assert.deepEqual(PR9_SUPPORTED_STUDY_ROOM_ZONES, ['library-lobby']);
  assert.equal(isSupportedStudyRoomZone('library-lobby'), true);
  assert.equal(isSupportedStudyRoomZone('library-reading-3f'), false);
  assert.equal(isSupportedLibrarySeatId('tqb-1f-t1-s1'), true);
  assert.equal(isSupportedLibrarySeatId('tqb-3f-t1-s1'), false);

  const registry = createSeatRegistry();

  // 1. Claiming a free library lobby seat succeeds
  const claimA = claimSeat(registry, {
    seatId: 'tqb-1f-t1-s1',
    occupantId: 'student-a',
    occupantName: 'Nguyễn Văn A',
    occupantMssv: '20226001',
    color: '#1F3A5F',
    gender: 'male',
    outfit: 'windbreaker-hust',
    hairStyle: 'short',
    glasses: true,
    backpack: true,
    subjectTag: 'Giải tích 1',
    nowMs: 1000,
  });
  assert.equal(claimA.ok, true);
  assert.equal(claimA.occupancy.seatId, 'tqb-1f-t1-s1');
  assert.equal(claimA.occupancy.occupantId, 'student-a');
  assert.equal(claimA.occupancy.occupantName, 'Nguyễn Văn A');
  assert.equal(claimA.occupancy.outfit, 'windbreaker-hust');
  assert.equal(claimA.releasedPreviousSeatId, null);
  // 16. Public seat occupancy omits occupantMssv
  assert.equal('occupantMssv' in claimA.occupancy, false);

  // 2. Claiming an occupied library lobby seat returns already-occupied with occupant info
  const claimBConflict = claimSeat(registry, {
    seatId: 'tqb-1f-t1-s1',
    occupantId: 'student-b',
    occupantName: 'Trần Thị B',
    nowMs: 1200,
  });
  assert.equal(claimBConflict.ok, false);
  assert.equal(claimBConflict.reason, 'already-occupied');
  assert.equal(claimBConflict.occupiedBy, 'student-a');
  assert.equal(claimBConflict.occupiedByName, 'Nguyễn Văn A');

  // 3. Claiming an unknown seat ID returns invalid-seat
  const claimInvalid = claimSeat(registry, {
    seatId: 'non-existent-seat',
    occupantId: 'student-b',
    occupantName: 'Trần Thị B',
  });
  assert.equal(claimInvalid.ok, false);
  assert.equal(claimInvalid.reason, 'invalid-seat');

  // 4. Claiming a non-lobby zone seat returns unsupported-zone during PR9
  const claimUnsupportedZone = claimSeat(registry, {
    seatId: 'tqb-3f-t1-s1',
    occupantId: 'student-b',
    occupantName: 'Trần Thị B',
  });
  assert.equal(claimUnsupportedZone.ok, false);
  assert.equal(claimUnsupportedZone.reason, 'unsupported-zone');

  // 5. Claiming without valid player identity returns not-authenticated
  const claimNoAuth = claimSeat(registry, {
    seatId: 'tqb-1f-t1-s2',
    occupantId: '   ',
    occupantName: 'Khách',
  });
  assert.equal(claimNoAuth.ok, false);
  assert.equal(claimNoAuth.reason, 'not-authenticated');

  // 6. Claiming a second seat by the same occupant atomically releases the first seat
  const switchA = claimSeat(registry, {
    seatId: 'tqb-1f-t2-s1',
    occupantId: 'student-a',
    occupantName: 'Nguyễn Văn A',
    subjectTag: 'Đại số tuyến tính',
    nowMs: 1500,
  });
  assert.equal(switchA.ok, true);
  assert.equal(switchA.releasedPreviousSeatId, 'tqb-1f-t1-s1');
  assert.equal(getOccupantSeat(registry, 'student-a').seatId, 'tqb-1f-t2-s1');

  // Now Student B can claim tqb-1f-t1-s1
  const claimBOk = claimSeat(registry, {
    seatId: 'tqb-1f-t1-s1',
    occupantId: 'student-b',
    occupantName: 'Trần Thị B',
    nowMs: 1600,
  });
  assert.equal(claimBOk.ok, true);

  // 8. Releasing a seat owned by another player fails without mutating that seat
  const releaseWrongOwner = releaseSeat(registry, 'tqb-1f-t2-s1', 'student-b');
  assert.equal(releaseWrongOwner.ok, false);
  assert.equal(getOccupantSeat(registry, 'student-a').seatId, 'tqb-1f-t2-s1');

  // 7. Releasing a seat owned by the caller succeeds
  const releaseB = releaseSeat(registry, 'tqb-1f-t1-s1', 'student-b');
  assert.equal(releaseB.ok, true);
  assert.equal(releaseB.released.seatId, 'tqb-1f-t1-s1');
  assert.equal(getOccupantSeat(registry, 'student-b'), null);

  // 9. Releasing all seats by occupant on disconnect clears only that occupant's seat
  claimSeat(registry, {
    seatId: 'tqb-1f-t1-s2',
    occupantId: 'student-b',
    occupantName: 'Trần Thị B',
    nowMs: 1800,
  });
  const disconnectA = releaseSeatByOccupant(registry, 'student-a');
  assert.equal(disconnectA.seatId, 'tqb-1f-t2-s1');
  assert.equal(getOccupantSeat(registry, 'student-a'), null);
  assert.equal(getOccupantSeat(registry, 'student-b').seatId, 'tqb-1f-t1-s2');

  // 10. Restoring seat registry from socket attachments preserves earliest claim and ignores duplicate/unsupported claims deterministically
  const restored = restoreSeatRegistryFromAttachments([
    {
      occupantId: 'student-late',
      occupantName: 'Muộn',
      seatId: 'tqb-1f-t1-s1',
      occupiedAtMs: 9000,
    },
    {
      occupantId: 'student-early',
      occupantName: 'Sớm',
      seatId: 'tqb-1f-t1-s1',
      occupiedAtMs: 4000,
      subjectTag: 'HSK 4',
    },
    {
      occupantId: 'student-unsupported',
      occupantName: 'Tầng 3',
      seatId: 'tqb-3f-t1-s1', // unsupported zone in PR9 -> ignored
      occupiedAtMs: 1000,
    },
  ]);
  assert.equal(getOccupantSeat(restored, 'student-early').seatId, 'tqb-1f-t1-s1');
  assert.equal(getOccupantSeat(restored, 'student-late'), null);
  assert.equal(getOccupantSeat(restored, 'student-unsupported'), null);
});

test('PR9 (11-16) Live Presence Derivation, Server Seat Reconciliation, Sanitization & Privacy Boundaries', () => {
  const t0 = 1_700_000_000_000;
  let session = startStudySession(createInitialStudySession(), {
    nowMs: t0,
    subjectTag: 'HSK 4 · Bài 12',
    studyRoomId: 'library-lobby',
    seatId: 'tqb-1f-t1-s1',
  });
  session = addStudyTask(session, 'Private task — must never leak', t0 + 10);

  // 11. Presence derivation produces 'studying' during active focus while seated
  const focusSession = {
    ...session,
    pomodoro: startPomodoro(session.pomodoro, t0, 'focus'),
  };
  const presStudying = derivePlayerPresence({
    session: focusSession,
    inClassroom: false,
    inLibraryLobby: true,
    activeSeatId: 'tqb-1f-t1-s1',
    nowMs: t0 + 1000,
  });
  assert.equal(presStudying.status, 'studying');
  assert.equal(presStudying.seatId, 'tqb-1f-t1-s1');
  assert.equal(presStudying.studyRoomId, 'library-lobby');
  assert.equal(presStudying.pomodoroPhase, 'focus');

  // 12. Presence derivation produces 'break' during short/long break while seated
  const breakSession = {
    ...session,
    pomodoro: startPomodoro(session.pomodoro, t0, 'short-break'),
  };
  const presBreak = derivePlayerPresence({
    session: breakSession,
    inClassroom: false,
    inLibraryLobby: true,
    activeSeatId: 'tqb-1f-t1-s1',
    nowMs: t0 + 2000,
  });
  assert.equal(presBreak.status, 'break');
  assert.equal(presBreak.seatId, 'tqb-1f-t1-s1');
  assert.equal(formatPresenceBadge(presBreak), '☕ Giải lao · HSK 4 · Bài 12');

  // 13. Presence derivation produces 'idle' when seated with paused/idle timer
  const pausedSession = {
    ...focusSession,
    pomodoro: pausePomodoro(focusSession.pomodoro, t0 + 3000),
  };
  const presIdleSeated = derivePlayerPresence({
    session: pausedSession,
    inClassroom: false,
    inLibraryLobby: true,
    activeSeatId: 'tqb-1f-t1-s1',
    nowMs: t0 + 3000,
  });
  assert.equal(presIdleSeated.status, 'idle');
  assert.equal(presIdleSeated.seatId, 'tqb-1f-t1-s1');

  // 14. Presence derivation produces 'exploring' when standing / outside study flow
  const presExploring = derivePlayerPresence({
    session: createInitialStudySession(),
    inClassroom: false,
    inLibraryLobby: false,
    activeSeatId: null,
    nowMs: t0 + 4000,
  });
  assert.equal(presExploring.status, 'exploring');
  assert.equal(presExploring.seatId, null);
  assert.equal(presExploring.studyRoomId, null);

  // Deduplication helper ignores updatedAtMs and detects real state changes
  assert.equal(
    isSamePublicPresence(presStudying, { ...presStudying, updatedAtMs: t0 + 99999 }),
    true,
  );
  assert.equal(isSamePublicPresence(presStudying, presBreak), false);

  // Server presence reconciliation overrides spoofed seatId with actual SeatRegistry ownership
  const registry = createSeatRegistry();
  claimSeat(registry, {
    seatId: 'tqb-1f-t2-s2',
    occupantId: 'student-a',
    occupantName: 'Nguyễn Văn A',
    nowMs: t0,
  });
  const reconciledOwned = reconcileServerPresenceWithSeat(
    {
      status: 'studying',
      seatId: 'tqb-1f-t1-s1', // spoofed seatId!
      studyRoomId: 'c1-classroom-101',
      pomodoroPhase: 'focus',
      subjectTag: 'Vật lý đại cương',
    },
    getOccupantSeat(registry, 'student-a'),
    t0,
  );
  assert.equal(reconciledOwned.seatId, 'tqb-1f-t2-s2');
  assert.equal(reconciledOwned.studyRoomId, 'library-lobby');

  const reconciledUnseated = reconcileServerPresenceWithSeat(
    {
      status: 'studying',
      seatId: 'tqb-1f-t2-s2', // spoofed seatId while standing!
      studyRoomId: 'library-lobby',
      pomodoroPhase: 'focus',
    },
    getOccupantSeat(registry, 'student-b'),
    t0,
  );
  assert.equal(reconciledUnseated.seatId, null);

  // 15 & 16. Sanitization strips oversized subjectTag, invalid enums, and private fields
  const longSubject = 'A'.repeat(120);
  const sanitizedPres = sanitizeStudyPresence({
    status: 'invalid-status',
    studyRoomId: 'invalid-room',
    seatId: 'invalid-seat',
    pomodoroPhase: 'invalid-phase',
    subjectTag: longSubject,
    tasks: [{ id: 'secret' }],
    occupantMssv: '20226001',
  });
  assert.equal(sanitizedPres.status, 'exploring');
  assert.equal(sanitizedPres.studyRoomId, null);
  assert.equal(sanitizedPres.seatId, null);
  assert.equal(sanitizedPres.pomodoroPhase, 'idle');
  assert.equal(sanitizedPres.subjectTag.length, 36);
  assert.equal('tasks' in sanitizedPres, false);
  assert.equal('occupantMssv' in sanitizedPres, false);

  const sanitizedOcc = sanitizeSeatOccupancy({
    seatId: 'tqb-1f-t1-s1',
    studyRoomId: 'library-lobby',
    occupantId: 'student-a',
    occupantName: 'Nguyễn Văn A',
    occupantMssv: '20226001',
    occupiedAtMs: t0,
    subjectTag: longSubject,
  });
  assert.ok(sanitizedOcc);
  assert.equal(sanitizedOcc.subjectTag.length, 36);
  assert.equal('occupantMssv' in sanitizedOcc, false);
  assert.equal(sanitizeRequestId('req-123_ABC'), 'req-123_ABC');
  assert.equal(sanitizeRequestId('invalid space!'), undefined);
});

const {
  TRUSTED_PROD_WS_URL,
  validateWsEndpointUrl,
  resolveWsUrl,
  MultiplayerClient,
} = require('../lib/multiplayer.ts');

test('PR9 Review Fix 1 — Untrusted WebSocket Endpoint Override Prevention & URL Validation', () => {
  // 1. Production ignores mpWs query override and uses configured trusted WS endpoint
  const prodWithMpWs = resolveWsUrl({
    configuredUrl: TRUSTED_PROD_WS_URL,
    nodeEnv: 'production',
    pageHostname: 'hust-hsk.pages.dev',
    pageSearch: '?room=hsk-2&mpWs=wss%3A%2F%2Fattacker.example%2Fws',
    testOverrideUrl: 'ws://127.0.0.1:8799/ws', // ignored on non-loopback prod page
  });
  assert.equal(prodWithMpWs.ok, true);
  assert.equal(prodWithMpWs.source, 'configured');
  assert.equal(
    prodWithMpWs.url,
    'wss://hust-hsk-rooms.hunganhz179.workers.dev/ws?room=hsk-2',
  );

  // 2. Production uses configured WebSocket endpoint cleanly
  const prodClean = resolveWsUrl({
    configuredUrl: TRUSTED_PROD_WS_URL,
    nodeEnv: 'production',
    pageHostname: 'hust-hsk.pages.dev',
    pageSearch: '',
  });
  assert.equal(prodClean.ok, true);
  assert.equal(prodClean.url, TRUSTED_PROD_WS_URL);

  // 3. Local development / localhost test override works ONLY for trusted local URLs
  const localLoopbackOverride = resolveWsUrl({
    configuredUrl: TRUSTED_PROD_WS_URL,
    nodeEnv: 'production',
    pageHostname: '127.0.0.1',
    pageSearch: '?room=hsk-1&mpWs=wss%3A%2F%2Fevil.example%2Fws',
    testOverrideUrl: 'ws://127.0.0.1:8799/ws',
  });
  assert.equal(localLoopbackOverride.ok, true);
  assert.equal(localLoopbackOverride.source, 'test-override');
  assert.equal(localLoopbackOverride.url, 'ws://127.0.0.1:8799/ws?room=hsk-1');

  // Non-loopback testOverrideUrl on localhost is rejected
  const localEvilOverride = resolveWsUrl({
    configuredUrl: TRUSTED_PROD_WS_URL,
    nodeEnv: 'development',
    pageHostname: '127.0.0.1',
    pageSearch: '?room=hsk-1',
    testOverrideUrl: 'wss://evil.example/ws',
  });
  assert.equal(localEvilOverride.ok, false);

  // 4. Malformed URLs, invalid protocols, plaintext non-loopback, and credentials are rejected safely
  assert.equal(validateWsEndpointUrl('').ok, false);
  assert.equal(validateWsEndpointUrl('not a valid url').ok, false);
  assert.equal(validateWsEndpointUrl('https://hust-hsk-rooms.hunganhz179.workers.dev/ws').ok, false);
  assert.equal(validateWsEndpointUrl('javascript:alert(1)').ok, false);
  assert.equal(
    validateWsEndpointUrl('ws://hust-hsk-rooms.hunganhz179.workers.dev/ws').ok,
    false,
    'Plaintext ws:// on non-loopback host must be rejected',
  );
  assert.equal(
    validateWsEndpointUrl('wss://user:pass@hust-hsk-rooms.hunganhz179.workers.dev/ws').ok,
    false,
    'Embedded credentials in WS URL must be rejected',
  );
  assert.equal(
    validateWsEndpointUrl('wss://attacker.example/ws').ok,
    false,
    'Untrusted external host must be rejected',
  );

  // 5. Client never sends join/sessionId/mssv when URL validation fails
  let socketCreated = false;
  const blockedClient = new MultiplayerClient({
    resolveUrlFn: () => ({ ok: false, url: null, reason: 'Blocked untrusted endpoint' }),
    webSocketFactory: () => {
      socketCreated = true;
      throw new Error('Should not create WebSocket');
    },
  });
  blockedClient.connect('sess-secret', 'Nguyễn Hải Anh', '20226001');
  assert.equal(socketCreated, false, 'Must not instantiate WebSocket when URL is rejected');
  assert.equal(blockedClient.getSnapshot().status, 'offline');
});

function createTestMultiplayerHarness() {
  let nowMs = 1_700_000_000_000;
  let nextTimerId = 1;
  const timers = new Map();
  const sockets = [];

  const setTimeoutFn = (fn, ms) => {
    const id = nextTimerId++;
    timers.set(id, { fn, runAt: nowMs + ms });
    return id;
  };
  const clearTimeoutFn = (id) => {
    timers.delete(id);
  };
  const advanceTime = (deltaMs) => {
    nowMs += deltaMs;
    while (true) {
      let dueId = null;
      let dueTimer = null;
      for (const [id, t] of timers.entries()) {
        if (t.runAt <= nowMs && (!dueTimer || t.runAt < dueTimer.runAt)) {
          dueId = id;
          dueTimer = t;
        }
      }
      if (dueId === null) break;
      timers.delete(dueId);
      dueTimer.fn();
    }
  };

  const webSocketFactory = (url) => {
    const sent = [];
    const sock = {
      url,
      readyState: 0, // CONNECTING
      sent,
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      send(raw) {
        sent.push(JSON.parse(String(raw)));
      },
      close() {
        this.readyState = 3; // CLOSED
        if (typeof this.onclose === 'function') {
          this.onclose({ code: 1000 });
        }
      },
      serverOpen(selfId = 'student-a', roomId = 'hsk-1') {
        this.readyState = 1; // OPEN
        if (typeof this.onopen === 'function') this.onopen({});
        this.serverSend({
          type: 'welcome',
          id: selfId,
          roomId,
          count: 1,
          players: [{ id: selfId, name: 'Nguyễn Văn A', x: 0, z: 0, facing: 0, state: 'idle' }],
        });
        this.serverSend({
          type: 'study:room-snapshot',
          roomId,
          revision: 1,
          seats: [],
          presences: {},
        });
      },
      serverSend(msg) {
        if (typeof this.onmessage === 'function') {
          this.onmessage({ data: JSON.stringify(msg) });
        }
      },
    };
    sockets.push(sock);
    return sock;
  };

  const client = new MultiplayerClient({
    webSocketFactory,
    setTimeoutFn,
    clearTimeoutFn,
    nowFn: () => nowMs,
    claimTimeoutMs: 4000,
    resolveUrlFn: () => ({
      ok: true,
      url: 'ws://127.0.0.1:8799/ws?room=hsk-1',
      source: 'test-override',
    }),
  });

  return {
    client,
    sockets,
    advanceTime,
    getNow: () => nowMs,
  };
}

test('PR9 Review Fix 2 — Deterministic Seat Claim Lifecycle, Timeout/Cancellation & Late ACK Orphan Release', async () => {
  // 1. Claim ACK arrives before timeout -> confirmed
  {
    const h = createTestMultiplayerHarness();
    h.client.connect('student-a', 'Nguyễn Văn A', '20226001');
    const ws = h.sockets[0];
    ws.serverOpen('student-a');

    const claimPromise = h.client.requestSeatClaim('tqb-1f-t1-s1', {
      subjectTag: 'Giải tích 1',
      pomodoroPhase: 'focus',
    });
    assert.equal(h.client.getSnapshot().seatClaimState, 'requesting');
    const reqMsg = ws.sent.find((m) => m.type === 'study:claim-seat');
    assert.ok(reqMsg);

    ws.serverSend({
      type: 'study:seat-claimed',
      revision: 2,
      requestId: reqMsg.requestId,
      occupancy: {
        seatId: 'tqb-1f-t1-s1',
        studyRoomId: 'library-lobby',
        occupantId: 'student-a',
        occupantName: 'Nguyễn Văn A',
        occupiedAtMs: h.getNow(),
        subjectTag: 'Giải tích 1',
      },
    });

    const outcome = await claimPromise;
    assert.equal(outcome.ok, true);
    assert.equal(h.client.getSnapshot().mySeatId, 'tqb-1f-t1-s1');
    assert.equal(h.client.getSnapshot().seatClaimState, 'confirmed');
  }

  // 2. Claim is rejected -> rejected, mySeatId remains null
  {
    const h = createTestMultiplayerHarness();
    h.client.connect('student-a', 'Nguyễn Văn A', '20226001');
    const ws = h.sockets[0];
    ws.serverOpen('student-a');

    const claimPromise = h.client.requestSeatClaim('tqb-1f-t1-s1');
    const reqMsg = ws.sent.find((m) => m.type === 'study:claim-seat');
    ws.serverSend({
      type: 'study:seat-rejected',
      revision: 2,
      seatId: 'tqb-1f-t1-s1',
      reason: 'already-occupied',
      occupiedBy: 'student-b',
      occupiedByName: 'Trần Thị B',
      requestId: reqMsg.requestId,
    });

    const outcome = await claimPromise;
    assert.equal(outcome.ok, false);
    assert.equal(outcome.reason, 'already-occupied');
    assert.equal(h.client.getSnapshot().mySeatId, null);
    assert.equal(h.client.getSnapshot().seatClaimState, 'rejected');
  }

  // 3. Claim times out, then delayed ACK arrives -> client does NOT accept seat locally AND sends study:release-seat
  {
    const h = createTestMultiplayerHarness();
    h.client.connect('student-a', 'Nguyễn Văn A', '20226001');
    const ws = h.sockets[0];
    ws.serverOpen('student-a');

    const claimPromise = h.client.requestSeatClaim('tqb-1f-t1-s1');
    const reqMsg = ws.sent.find((m) => m.type === 'study:claim-seat');

    // Advance past 4000ms timeout
    h.advanceTime(4100);
    const outcome = await claimPromise;
    assert.equal(outcome.ok, false);
    assert.equal(outcome.reason, 'timeout');
    assert.equal(h.client.getSnapshot().mySeatId, null);
    assert.equal(h.client.getSnapshot().seatClaimState, 'timed-out');

    // Now delayed study:seat-claimed arrives from server
    ws.sent.length = 0;
    ws.serverSend({
      type: 'study:seat-claimed',
      revision: 2,
      requestId: reqMsg.requestId,
      occupancy: {
        seatId: 'tqb-1f-t1-s1',
        studyRoomId: 'library-lobby',
        occupantId: 'student-a',
        occupantName: 'Nguyễn Văn A',
        occupiedAtMs: h.getNow(),
      },
    });

    // Client must NOT transition to confirmed or set mySeatId; it must send study:release-seat
    assert.equal(h.client.getSnapshot().mySeatId, null);
    assert.notEqual(h.client.getSnapshot().seatClaimState, 'confirmed');
    const releaseMsg = ws.sent.find(
      (m) => m.type === 'study:release-seat' && m.seatId === 'tqb-1f-t1-s1',
    );
    assert.ok(releaseMsg, 'Client must immediately send study:release-seat for timed-out late ACK');

    // Server broadcasts study:seat-released -> seat is free for another player
    ws.serverSend({
      type: 'study:seat-released',
      revision: 3,
      seatId: 'tqb-1f-t1-s1',
      occupantId: 'student-a',
      reason: 'stand-up',
    });
    assert.equal(h.client.getSnapshot().seatClaimState, 'idle');
    assert.equal(h.client.getSnapshot().seatMap['tqb-1f-t1-s1'], undefined);

    // 7. Released seat can now be claimed by another player
    ws.serverSend({
      type: 'study:seat-claimed',
      revision: 4,
      occupancy: {
        seatId: 'tqb-1f-t1-s1',
        studyRoomId: 'library-lobby',
        occupantId: 'student-b',
        occupantName: 'Trần Thị B',
        occupiedAtMs: h.getNow(),
      },
    });
    assert.equal(h.client.getSnapshot().seatMap['tqb-1f-t1-s1'].occupantId, 'student-b');
  }

  // 4. Claim is cancelled (player stands up / cancels), then delayed ACK arrives -> auto-released
  {
    const h = createTestMultiplayerHarness();
    h.client.connect('student-a', 'Nguyễn Văn A', '20226001');
    const ws = h.sockets[0];
    ws.serverOpen('student-a');

    const claimPromise = h.client.requestSeatClaim('tqb-1f-t1-s2');
    const reqMsg = ws.sent.find((m) => m.type === 'study:claim-seat');

    h.client.cancelPendingSeatClaim('Player walked away');
    const outcome = await claimPromise;
    assert.equal(outcome.ok, false);
    assert.equal(outcome.reason, 'cancelled');
    assert.equal(h.client.getSnapshot().seatClaimState, 'cancelled');

    ws.sent.length = 0;
    ws.serverSend({
      type: 'study:seat-claimed',
      revision: 2,
      requestId: reqMsg.requestId,
      occupancy: {
        seatId: 'tqb-1f-t1-s2',
        studyRoomId: 'library-lobby',
        occupantId: 'student-a',
        occupantName: 'Nguyễn Văn A',
        occupiedAtMs: h.getNow(),
      },
    });
    assert.equal(h.client.getSnapshot().mySeatId, null);
    assert.ok(
      ws.sent.some((m) => m.type === 'study:release-seat' && m.seatId === 'tqb-1f-t1-s2'),
      'Cancelled claim whose ACK arrives late must send study:release-seat',
    );
  }

  // 5 & 6. WebSocket disconnects during a claim, and stale ACK after reconnect is rejected
  {
    const h = createTestMultiplayerHarness();
    h.client.connect('student-a', 'Nguyễn Văn A', '20226001');
    const ws1 = h.sockets[0];
    ws1.serverOpen('student-a');

    const claimPromise = h.client.requestSeatClaim('tqb-1f-t2-s1');
    const staleReqMsg = ws1.sent.find((m) => m.type === 'study:claim-seat');

    // Socket closes mid-claim
    ws1.close();
    const outcome = await claimPromise;
    assert.equal(outcome.ok, false);
    assert.equal(outcome.reason, 'offline');
    assert.equal(h.client.getSnapshot().mySeatId, null);

    // Reconnect timer opens ws2
    h.advanceTime(1500);
    assert.equal(h.sockets.length, 2);
    const ws2 = h.sockets[1];
    ws2.serverOpen('student-a');

    // Stale ACK from older connection arrives on ws2 -> must not be accepted locally and must trigger release
    ws2.sent.length = 0;
    ws2.serverSend({
      type: 'study:seat-claimed',
      revision: 2,
      requestId: staleReqMsg.requestId,
      occupancy: {
        seatId: 'tqb-1f-t2-s1',
        studyRoomId: 'library-lobby',
        occupantId: 'student-a',
        occupantName: 'Nguyễn Văn A',
        occupiedAtMs: h.getNow(),
      },
    });
    assert.equal(h.client.getSnapshot().mySeatId, null);
    assert.ok(
      ws2.sent.some((m) => m.type === 'study:release-seat' && m.seatId === 'tqb-1f-t2-s1'),
      'Stale ACK after reconnect must be released on server',
    );
  }
});

test('PR9 Review Fix 3 — Concurrent / Superseded Seat Claim Requests & Out-of-Order Server ACKs', async () => {
  // 1. Claim A then Claim B -> Server accepts A, Server accepts B -> Client ends seated on B
  {
    const h = createTestMultiplayerHarness();
    h.client.connect('student-a', 'Nguyễn Văn A', '20226001');
    const ws = h.sockets[0];
    ws.serverOpen('student-a');

    const promiseA = h.client.requestSeatClaim('tqb-1f-t1-s1');
    const promiseB = h.client.requestSeatClaim('tqb-1f-t1-s2');

    // Promise A must settle immediately as cancelled when superseded by B
    const outA = await promiseA;
    assert.equal(outA.ok, false);
    assert.equal(outA.reason, 'cancelled');
    assert.equal(outA.seatId, 'tqb-1f-t1-s1');

    const claimMsgs = ws.sent.filter((m) => m.type === 'study:claim-seat');
    assert.equal(claimMsgs.length, 2);
    const [reqA, reqB] = claimMsgs;

    // Server accepts A first (while B is still pending)
    ws.serverSend({
      type: 'study:seat-claimed',
      revision: 2,
      requestId: reqA.requestId,
      occupancy: {
        seatId: 'tqb-1f-t1-s1',
        studyRoomId: 'library-lobby',
        occupantId: 'student-a',
        occupantName: 'Nguyễn Văn A',
        occupiedAtMs: h.getNow(),
      },
    });
    // Promise B must STILL be pending (not resolved with A!)
    assert.equal(h.client.getSnapshot().seatClaimState, 'requesting');
    assert.equal(h.client.getSnapshot().mySeatId, null);

    // Server accepts B (atomically switching from A to B)
    ws.serverSend({
      type: 'study:seat-released',
      revision: 3,
      seatId: 'tqb-1f-t1-s1',
      occupantId: 'student-a',
      reason: 'switched-seat',
    });
    ws.serverSend({
      type: 'study:seat-claimed',
      revision: 3,
      requestId: reqB.requestId,
      releasedSeatId: 'tqb-1f-t1-s1',
      occupancy: {
        seatId: 'tqb-1f-t1-s2',
        studyRoomId: 'library-lobby',
        occupantId: 'student-a',
        occupantName: 'Nguyễn Văn A',
        occupiedAtMs: h.getNow(),
      },
    });

    const outB = await promiseB;
    assert.equal(outB.ok, true);
    assert.equal(outB.occupancy.seatId, 'tqb-1f-t1-s2');
    assert.equal(h.client.getSnapshot().mySeatId, 'tqb-1f-t1-s2');
    assert.equal(h.client.getSnapshot().seatClaimState, 'confirmed');
  }

  // 2. Claim A then Claim B -> Server accepts A, Server rejects B -> Client releases A (zero ghost seat!)
  {
    const h = createTestMultiplayerHarness();
    h.client.connect('student-a', 'Nguyễn Văn A', '20226001');
    const ws = h.sockets[0];
    ws.serverOpen('student-a');

    const promiseA = h.client.requestSeatClaim('tqb-1f-t1-s1');
    const promiseB = h.client.requestSeatClaim('tqb-1f-t1-s2');

    const outA = await promiseA;
    assert.equal(outA.ok, false);
    assert.equal(outA.reason, 'cancelled');

    const [reqA, reqB] = ws.sent.filter((m) => m.type === 'study:claim-seat');

    // Server accepts A
    ws.serverSend({
      type: 'study:seat-claimed',
      revision: 2,
      requestId: reqA.requestId,
      occupancy: {
        seatId: 'tqb-1f-t1-s1',
        studyRoomId: 'library-lobby',
        occupantId: 'student-a',
        occupantName: 'Nguyễn Văn A',
        occupiedAtMs: h.getNow(),
      },
    });

    // Server rejects B (already occupied by someone else)
    ws.sent.length = 0;
    ws.serverSend({
      type: 'study:seat-rejected',
      revision: 2,
      seatId: 'tqb-1f-t1-s2',
      reason: 'already-occupied',
      occupiedBy: 'student-b',
      occupiedByName: 'Trần Thị B',
      requestId: reqB.requestId,
    });

    const outB = await promiseB;
    assert.equal(outB.ok, false);
    assert.equal(outB.seatId, 'tqb-1f-t1-s2');
    assert.equal(outB.reason, 'already-occupied');
    assert.equal(h.client.getSnapshot().mySeatId, null);

    // Client must automatically send study:release-seat for orphaned seat A ('tqb-1f-t1-s1')
    assert.ok(
      ws.sent.some((m) => m.type === 'study:release-seat' && m.seatId === 'tqb-1f-t1-s1'),
      'Client must release superseded seat A when seat B is rejected',
    );
  }

  // 3. Reversed ACK order: Claim A then Claim B -> Server accepts B first, then delayed/out-of-order A arrives
  {
    const h = createTestMultiplayerHarness();
    h.client.connect('student-a', 'Nguyễn Văn A', '20226001');
    const ws = h.sockets[0];
    ws.serverOpen('student-a');

    const promiseA = h.client.requestSeatClaim('tqb-1f-t1-s1');
    const promiseB = h.client.requestSeatClaim('tqb-1f-t1-s2');
    await promiseA;
    const [reqA, reqB] = ws.sent.filter((m) => m.type === 'study:claim-seat');

    // Server ACK for B (revision 3) arrives first
    ws.serverSend({
      type: 'study:seat-claimed',
      revision: 3,
      requestId: reqB.requestId,
      occupancy: {
        seatId: 'tqb-1f-t1-s2',
        studyRoomId: 'library-lobby',
        occupantId: 'student-a',
        occupantName: 'Nguyễn Văn A',
        occupiedAtMs: h.getNow(),
      },
    });
    const outB = await promiseB;
    assert.equal(outB.ok, true);
    assert.equal(h.client.getSnapshot().mySeatId, 'tqb-1f-t1-s2');

    // Out-of-order older ACK for A (revision 2 < 3) arrives late -> ignored completely, mySeatId remains B
    ws.sent.length = 0;
    ws.serverSend({
      type: 'study:seat-claimed',
      revision: 2,
      requestId: reqA.requestId,
      occupancy: {
        seatId: 'tqb-1f-t1-s1',
        studyRoomId: 'library-lobby',
        occupantId: 'student-a',
        occupantName: 'Nguyễn Văn A',
        occupiedAtMs: h.getNow(),
      },
    });
    assert.equal(h.client.getSnapshot().mySeatId, 'tqb-1f-t1-s2');
    assert.equal(ws.sent.length, 0);
  }

  // 4. Duplicate in-flight claim for the same seat or rejectIfPending returns 'pending-request'
  {
    const h = createTestMultiplayerHarness();
    h.client.connect('student-a', 'Nguyễn Văn A', '20226001');
    const ws = h.sockets[0];
    ws.serverOpen('student-a');

    const firstClaim = h.client.requestSeatClaim('tqb-1f-t1-s1');
    const duplicateSameSeat = await h.client.requestSeatClaim('tqb-1f-t1-s1');
    assert.equal(duplicateSameSeat.ok, false);
    assert.equal(duplicateSameSeat.reason, 'pending-request');

    const rejectedWhileBusy = await h.client.requestSeatClaim('tqb-1f-t1-s2', {
      rejectIfPending: true,
    });
    assert.equal(rejectedWhileBusy.ok, false);
    assert.equal(rejectedWhileBusy.reason, 'pending-request');

    // First claim is still active and resolves normally when ACK arrives
    const reqMsg = ws.sent.find((m) => m.type === 'study:claim-seat');
    ws.serverSend({
      type: 'study:seat-claimed',
      revision: 2,
      requestId: reqMsg.requestId,
      occupancy: {
        seatId: 'tqb-1f-t1-s1',
        studyRoomId: 'library-lobby',
        occupantId: 'student-a',
        occupantName: 'Nguyễn Văn A',
        occupiedAtMs: h.getNow(),
      },
    });
    const firstOut = await firstClaim;
    assert.equal(firstOut.ok, true);
  }
});

test('(28) Reconnect reconciliation when local player is already standing while server still holds seat + separated public ID vs CSPRNG reconnectToken & safe legacy migration', async () => {
  const { derivePublicPlayerId } = require('../shared/contracts/multiplayer.ts');
  const {
    RECONNECT_TOKEN_KEY,
    SESSION_KEY,
    getReconnectToken,
    getSessionId,
    isValidReconnectToken,
  } = require('../lib/identity.ts');

  // 1. Verify safe migration from a previously broadcast legacy bkhn-session-id + F5 persistence
  const storeMap = new Map([[SESSION_KEY, 's-legacy-broadcast-id-001']]);
  const mockStorage = {
    getItem: (k) => (storeMap.has(k) ? storeMap.get(k) : null),
    setItem: (k, v) => storeMap.set(k, String(v)),
  };

  const token = getReconnectToken(mockStorage);
  const publicId = getSessionId(mockStorage);
  assert.equal(isValidReconnectToken(token), true, 'reconnectToken must be generated via CSPRNG');
  assert.notEqual(token, 's-legacy-broadcast-id-001', 'Must never reuse legacy session ID as reconnectToken');
  assert.equal(publicId, derivePublicPlayerId(token));
  assert.notEqual(publicId, token);
  assert.notEqual(publicId, 's-legacy-broadcast-id-001');
  assert.notEqual(publicId, derivePublicPlayerId('s-legacy-broadcast-id-001'));
  assert.equal(mockStorage.getItem(RECONNECT_TOKEN_KEY), token);
  assert.equal(mockStorage.getItem(SESSION_KEY), publicId);

  // F5 persistence: subsequent calls return the exact same CSPRNG token and derived publicId
  assert.equal(getReconnectToken(mockStorage), token);
  assert.equal(getSessionId(mockStorage), publicId);

  // 2. Verify MultiplayerClient sends both public sessionId and secret reconnectToken on join
  const h = createTestMultiplayerHarness();
  h.client.connect(publicId, 'Nguyễn Văn A', '20226001', {}, token);
  const ws = h.sockets[0];
  ws.serverOpen(publicId);
  const joinMsg = ws.sent.find((m) => m.type === 'join');
  assert.ok(joinMsg, 'Client must send join message on socket open');
  assert.equal(joinMsg.sessionId, publicId);
  assert.equal(joinMsg.reconnectToken, token);

  // 3. Player claims tqb-1f-t1-s1 while online -> confirmed
  const claimP = h.client.requestSeatClaim('tqb-1f-t1-s1');
  const claimReq = ws.sent.find((m) => m.type === 'study:claim-seat');
  ws.serverSend({
    type: 'study:seat-claimed',
    revision: 2,
    requestId: claimReq.requestId,
    occupancy: {
      seatId: 'tqb-1f-t1-s1',
      studyRoomId: 'library-lobby',
      occupantId: publicId,
      occupantName: 'Nguyễn Văn A',
      occupiedAtMs: h.getNow(),
    },
  });
  const claimOut = await claimP;
  assert.equal(claimOut.ok, true);
  assert.equal(h.client.getSnapshot().mySeatId, 'tqb-1f-t1-s1');
  assert.equal(h.client.getLocalSeatedSeatId(), 'tqb-1f-t1-s1');

  // 4. Connection drops (offline), and while offline the player stands up locally
  ws.close();
  assert.equal(h.client.getSnapshot().status, 'offline');
  h.client.setLocalSeatedSeatId(null);
  h.client.requestSeatRelease('tqb-1f-t1-s1');
  assert.equal(h.client.getLocalSeatedSeatId(), null);

  // 5. Reconnect fires, and the server snapshot STILL holds 'tqb-1f-t1-s1' for `publicId`
  h.advanceTime(1500);
  const ws2 = h.sockets[1];
  assert.ok(ws2, 'Reconnect must open a second socket');
  ws2.readyState = 1;
  ws2.onopen({});
  ws2.serverSend({
    type: 'welcome',
    id: publicId,
    roomId: 'hsk-1',
    count: 1,
    players: [{ id: publicId, name: 'Nguyễn Văn A', x: 0, z: 0, facing: 0, state: 'idle' }],
  });
  ws2.sent.length = 0;

  ws2.serverSend({
    type: 'study:room-snapshot',
    roomId: 'hsk-1',
    revision: 3,
    seats: [
      {
        seatId: 'tqb-1f-t1-s1',
        studyRoomId: 'library-lobby',
        occupantId: publicId,
        occupantName: 'Nguyễn Văn A',
        occupiedAtMs: h.getNow() - 5000,
      },
    ],
    presences: {
      [publicId]: {
        status: 'studying',
        studyRoomId: 'library-lobby',
        seatId: 'tqb-1f-t1-s1',
        pomodoroPhase: 'focus',
        subjectTag: 'Giải tích 1',
        updatedAtMs: h.getNow() - 5000,
      },
    },
  });

  // Because local player is already standing (`localDesiredSeatId === null`),
  // MultiplayerClient must NOT adopt `tqb-1f-t1-s1` as `mySeatId` and must immediately
  // send `study:release-seat` to the server to release the stale seat!
  assert.equal(
    h.client.getSnapshot().mySeatId,
    null,
    'Standing local client must not adopt stale server seat on reconnect snapshot',
  );
  assert.equal(
    Boolean(h.client.getSnapshot().seatMap['tqb-1f-t1-s1']),
    false,
    'Stale server seat for selfId must be removed from local seatMap immediately',
  );
  const autoReleaseMsg = ws2.sent.find(
    (m) => m.type === 'study:release-seat' && m.seatId === 'tqb-1f-t1-s1',
  );
  assert.ok(
    autoReleaseMsg,
    'Client must automatically send study:release-seat when server snapshot still holds a seat while local is standing',
  );
});





