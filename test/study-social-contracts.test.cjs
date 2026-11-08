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
  createPomodoroState,
  startPomodoro,
  pausePomodoro,
  resumePomodoro,
  evaluatePomodoroAt,
  formatRemainingMmSs,
  serializePomodoroState,
  deserializePomodoroState,
} = require('../features/study/pomodoro/timer.ts');

const {
  STUDY_SESSION_STORAGE_KEY,
  createInitialStudySession,
  startStudySession,
  endStudySession,
  addStudyTask,
  toggleStudyTask,
  linkHskLessonToSession,
  recordFocusBlockCompletion,
  saveStudySession,
  loadStudySession,
} = require('../features/study/study-session/session.ts');

const {
  DEFAULT_FOCUS_PREFERENCES,
  sanitizeFocusPreferences,
  computeFocusRuntimePolicy,
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
