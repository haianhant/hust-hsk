// ---------------------------------------------------------------------------
// test/ui-gameplay.test.cjs — Unit tests for PR5 Application UI & Gameplay
// Separation pure functions:
// - features/learning/hsk/objectives.ts (OBJECTIVES, questIdsForLesson,
//   statusForLesson, pickQuestForLesson)
// - features/campus/interaction/bridge.ts (findNearestInteractable priority
//   hierarchy, SPEECH_RATES, TOAST_MS, MINH_POS)
// ---------------------------------------------------------------------------

require('./register-ts.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  OBJECTIVES,
  questIdsForLesson,
  statusForLesson,
  pickQuestForLesson,
} = require('../features/learning/hsk/objectives.ts');
const {
  TOAST_MS,
  SPEECH_RATES,
  MINH_POS,
  MINH_RADIUS,
  findNearestInteractable,
} = require('../features/campus/interaction/bridge.ts');
const {
  CLASSROOM,
  CLASSROOM_DOOR,
  LIBRARY_DOOR,
  LIBRARY_LOBBY,
  AVATAR,
  resolveLibraryLobbyCollisions,
} = require('../features/campus/world-data/index.ts');
const {
  SEAT_INTERACT_RADIUS,
  createInitialSeatingState,
  getLibraryLobbySeats,
  findNearestLibrarySeat,
  computeSafeStandUpPosition,
  validateSeatSelection,
  transitionToSeated,
  transitionToStanding,
  reconcileSeatingWithEnvironment,
  reconcilePersistedSessionSeat,
  releaseActiveSeatSafely,
} = require('../features/campus/interaction/seat-interaction.ts');
const { playerState } = require('../lib/playerState.ts');
const {
  createInitialStudySession,
  startStudySession,
  bindSessionSeat,
  endStudySession,
} = require('../features/study/study-session/session.ts');

test('PR5 objectives.ts — questIdsForLesson maps HSK 3 and HSK 4 lessons accurately', () => {
  assert.deepEqual(questIdsForLesson('hsk3-l10'), ['first-lesson', 'l10-g234']);
  assert.deepEqual(questIdsForLesson('hsk3-l11'), ['l11']);
  assert.deepEqual(questIdsForLesson('hsk3-l18'), ['l18']);
  assert.deepEqual(questIdsForLesson('hsk4-shang-l1'), ['hsk4-shang-l1a', 'hsk4-shang-l1b']);
  assert.deepEqual(questIdsForLesson('hsk4-xia-l20'), ['hsk4-xia-l20a', 'hsk4-xia-l20b']);
  assert.ok(OBJECTIVES['greet-minh'].includes('Minh'));
  assert.ok(OBJECTIVES['goto-door'].includes('C1'));
  assert.ok(OBJECTIVES['final-review'].includes('Kiểm tra cuối'));
});

test('PR5 objectives.ts — statusForLesson and pickQuestForLesson handle all progression states', () => {
  // 1. Unstarted lesson
  assert.equal(statusForLesson('hsk3-l10', null, {}), 'Chưa bắt đầu — bấm để học');
  assert.equal(pickQuestForLesson('hsk3-l10', null, {}), 'first-lesson');

  // 2. Active quest in progress
  assert.equal(
    statusForLesson('hsk3-l10', 'l10-g234', { 'first-lesson': { at: '2026-11-08', points: 50 } }),
    'Đang học dở — bấm để học tiếp',
  );
  assert.equal(
    pickQuestForLesson('hsk3-l10', 'l10-g234', { 'first-lesson': { at: '2026-11-08', points: 50 } }),
    'l10-g234',
  );

  // 3. Partially completed HSK 3 Lesson 10 vs HSK 4 Lesson 1
  const partialL10 = { 'first-lesson': { at: '2026-11-08', points: 50 } };
  assert.equal(
    statusForLesson('hsk3-l10', null, partialL10),
    'Nhóm 1 ✓ · Nhóm 2–4 chưa bắt đầu — bấm để học tiếp',
  );
  assert.equal(pickQuestForLesson('hsk3-l10', null, partialL10), 'l10-g234');

  const partialHsk4 = { 'hsk4-shang-l1a': { at: '2026-11-08', points: 50 } };
  assert.equal(
    statusForLesson('hsk4-shang-l1', null, partialHsk4),
    'Đã học một phần — bấm để học tiếp',
  );
  assert.equal(pickQuestForLesson('hsk4-shang-l1', null, partialHsk4), 'hsk4-shang-l1b');

  // 4. Fully completed lesson replays from first quest
  const doneL10 = {
    'first-lesson': { at: '2026-11-08', points: 50 },
    'l10-g234': { at: '2026-11-08', points: 50 },
  };
  assert.equal(
    statusForLesson('hsk3-l10', null, doneL10),
    'Đã hoàn thành ✓ — bấm để chơi lại',
  );
  assert.equal(pickQuestForLesson('hsk3-l10', null, doneL10), 'first-lesson');
});

test('PR5 bridge.ts — findNearestInteractable enforces 5-tier interaction priority', () => {
  assert.equal(TOAST_MS, 2500);
  assert.deepEqual(SPEECH_RATES, [0.6, 0.8, 1.0]);
  assert.equal(MINH_RADIUS, 2.5);

  const baseInput = {
    pos: { x: 0, z: 0 },
    inClassroom: false,
    inLibraryLobby: false,
    bikeRiding: false,
    bikeSpeed: 0,
    bikePos: { x: 999, z: 999 },
    questActive: false,
    questDoneBefore: false,
    anyQuestDone: false,
    stepId: undefined,
  };

  // Tier 1: Library Lobby interactables
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      inLibraryLobby: true,
      pos: { ...LIBRARY_LOBBY.statue },
    }),
    { id: 'lobby-statue', label: 'E — Tìm hiểu Tượng GS. Tạ Quang Bửu' },
  );
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      inLibraryLobby: true,
      pos: { ...LIBRARY_LOBBY.vocabBoard },
    }),
    { id: 'lobby-vocab-board', label: 'E — Xem bảng từ vựng Thư viện' },
  );
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      inLibraryLobby: true,
      pos: { ...LIBRARY_LOBBY.infoDesk },
    }),
    { id: 'lobby-info-desk', label: 'E — Quầy thông tin & mượn sách' },
  );

  // Tier 2: Riding motorbike outdoors (stopped vs moving)
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      bikeRiding: true,
      bikeSpeed: 0.2,
    }),
    { id: 'bike-dismount', label: 'E — Xuống xe' },
  );
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      bikeRiding: true,
      bikeSpeed: 4.5,
    }),
    { id: 'bike-dismount', label: 'E — Xuống xe (chỉ khi dừng hẳn)' },
  );

  // Tier 3: Standing near motorbike outdoors overrides NPC Minh
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      pos: { ...MINH_POS },
      bikePos: { x: MINH_POS.x + 1.0, z: MINH_POS.z },
    }),
    { id: 'bike-mount', label: 'E — Lên xe' },
  );

  // Tier 4: Outdoor NPC Minh, Classroom Door, Library Door
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      pos: { ...MINH_POS },
    }),
    { id: 'npc-minh', label: 'E — Nói chuyện với Minh' },
  );
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      pos: { ...CLASSROOM_DOOR.pos },
      questActive: true,
      stepId: 'goto-door',
    }),
    { id: 'classroom-door', label: 'E — Vào phòng học' },
  );
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      pos: { ...LIBRARY_DOOR.pos },
    }),
    { id: 'library-door', label: 'E — Vào sảnh Thư viện Tạ Quang Bửu' },
  );

  // Tier 5: Indoor Classroom quest objects gated by stepId
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      inClassroom: true,
      pos: { ...CLASSROOM.board },
      questActive: true,
      stepId: 'find-board',
    }),
    { id: 'board', label: 'E — Chọn bảng đen' },
  );
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      inClassroom: true,
      pos: { ...CLASSROOM.notebook },
      questActive: true,
      stepId: 'open-notebook',
    }),
    { id: 'notebook', label: 'E — Mở vở ghi chép' },
  );
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      inClassroom: true,
      pos: { ...CLASSROOM.homework },
      questActive: true,
      stepId: 'take-homework',
    }),
    { id: 'homework', label: 'E — Nhận bài tập' },
  );
});

test('PR5 tailwind.config.js — scans features/** and shared/** so HUD positioning classes are never purged', () => {
  const tailwindConfig = require('../tailwind.config.js');
  assert.ok(Array.isArray(tailwindConfig.content));
  assert.ok(tailwindConfig.content.includes('./app/**/*.{ts,tsx}'));
  assert.ok(tailwindConfig.content.includes('./components/**/*.{ts,tsx}'));
  assert.ok(tailwindConfig.content.includes('./features/**/*.{ts,tsx}'));
  assert.ok(tailwindConfig.content.includes('./shared/**/*.{ts,tsx}'));
});

test('PR8 (1-3) Library Lobby seat geometry, reachable interaction positions & collision-free stand-up spots', () => {
  const seats = getLibraryLobbySeats();
  assert.equal(seats.length, 4);
  assert.deepEqual(
    seats.map((s) => s.seatId),
    ['tqb-1f-t1-s1', 'tqb-1f-t1-s2', 'tqb-1f-t2-s1', 'tqb-1f-t2-s2'],
  );

  for (const seat of seats) {
    // 1. Every seat is strictly inside LIBRARY_LOBBY.bounds with avatar margin
    assert.ok(
      seat.x >= LIBRARY_LOBBY.bounds.minX + AVATAR.radius &&
        seat.x <= LIBRARY_LOBBY.bounds.maxX - AVATAR.radius,
      `Seat ${seat.seatId} X (${seat.x}) out of lobby bounds`,
    );
    assert.ok(
      seat.z >= LIBRARY_LOBBY.bounds.minZ + AVATAR.radius &&
        seat.z <= LIBRARY_LOBBY.bounds.maxZ - AVATAR.radius,
      `Seat ${seat.seatId} Z (${seat.z}) out of lobby bounds`,
    );

    // 2. Safe stand-up / approach position is reachable ( within SEAT_INTERACT_RADIUS )
    //    and has zero collision against walls, columns, tables, or chairs.
    const standPos = computeSafeStandUpPosition(seat);
    const resolved = resolveLibraryLobbyCollisions(standPos, AVATAR.radius);
    assert.equal(resolved.hit, null, `Stand-up spot for ${seat.seatId} hit ${resolved.hit}`);
    assert.ok(
      Math.hypot(resolved.pos.x - standPos.x, resolved.pos.z - standPos.z) < 0.005,
      `Stand-up spot for ${seat.seatId} was displaced by collision resolver`,
    );

    const distToSeat = Math.hypot(standPos.x - seat.x, standPos.z - seat.z);
    assert.ok(
      distToSeat <= SEAT_INTERACT_RADIUS,
      `Approach/stand-up spot for ${seat.seatId} must be within SEAT_INTERACT_RADIUS (${distToSeat}m > ${SEAT_INTERACT_RADIUS}m)`,
    );

    // 3. Nearest seat detector finds this seat from its approach position
    const nearest = findNearestLibrarySeat(standPos, SEAT_INTERACT_RADIUS);
    assert.ok(nearest, `findNearestLibrarySeat returned null at approach position for ${seat.seatId}`);
    assert.equal(nearest.seat.seatId, seat.seatId);

    // 4. findNearestInteractable returns "E — Ngồi học" at the approach position
    const prompt = findNearestInteractable({
      pos: standPos,
      inClassroom: false,
      inLibraryLobby: true,
      seated: false,
      seatId: null,
      bikeRiding: false,
      bikeSpeed: 0,
      bikePos: { x: 999, z: 999 },
      questActive: false,
      questDoneBefore: false,
      anyQuestDone: false,
    });
    assert.deepEqual(prompt, {
      id: `seat:${seat.seatId}`,
      label: 'E — Ngồi học',
    });
  }
});

test('PR8 (4-8) Seat selection validation & local seating state machine transitions', () => {
  const seats = getLibraryLobbySeats();
  const seat1 = seats[0]; // tqb-1f-t1-s1
  const seat2 = seats[1]; // tqb-1f-t1-s2
  const approach1 = computeSafeStandUpPosition(seat1);

  let state = createInitialSeatingState();
  assert.equal(state.status, 'standing');

  // (5) Selecting from too far away (across the room) fails cleanly without teleporting
  const farRes = transitionToSeated(state, {
    seatId: seat1.seatId,
    playerPos: { x: 3.5, z: -2.5 },
    inLibraryLobby: true,
    inClassroom: false,
    bikeRiding: false,
  });
  assert.equal(farRes.ok, false);
  assert.equal(farRes.reason, 'too-far');
  assert.equal(farRes.state.status, 'standing');

  // (6) Selecting outside LibraryLobby (on campus or in classroom) fails cleanly
  const outdoorRes = transitionToSeated(state, {
    seatId: seat1.seatId,
    playerPos: approach1,
    inLibraryLobby: false,
    inClassroom: false,
    bikeRiding: false,
  });
  assert.equal(outdoorRes.ok, false);
  assert.equal(outdoorRes.reason, 'wrong-room');

  const classroomRes = transitionToSeated(state, {
    seatId: seat1.seatId,
    playerPos: approach1,
    inLibraryLobby: true,
    inClassroom: true,
    bikeRiding: false,
  });
  assert.equal(classroomRes.ok, false);
  assert.equal(classroomRes.reason, 'wrong-room');

  // (7) Selecting while riding a motorbike fails cleanly
  const bikeRes = transitionToSeated(state, {
    seatId: seat1.seatId,
    playerPos: approach1,
    inLibraryLobby: true,
    inClassroom: false,
    bikeRiding: true,
  });
  assert.equal(bikeRes.ok, false);
  assert.equal(bikeRes.reason, 'riding-bike');

  // Unknown or non-lobby seat ID fails cleanly
  const invalidSeatRes = validateSeatSelection({
    seatId: 'c1-101-d1-s1',
    playerPos: approach1,
    inLibraryLobby: true,
    inClassroom: false,
    bikeRiding: false,
    currentSeating: state,
  });
  assert.equal(invalidSeatRes.ok, false);
  assert.equal(invalidSeatRes.reason, 'invalid-seat');

  // (4) Selecting a valid library seat inside LibraryLobby within proximity succeeds
  const sitRes = transitionToSeated(state, {
    seatId: seat1.seatId,
    playerPos: approach1,
    inLibraryLobby: true,
    inClassroom: false,
    bikeRiding: false,
  });
  assert.equal(sitRes.ok, true);
  state = sitRes.state;
  assert.equal(state.status, 'seated');
  assert.equal(state.seatId, 'tqb-1f-t1-s1');
  assert.equal(state.studyRoomId, 'library-lobby');
  assert.deepEqual(state.anchorPos, { x: seat1.x, z: seat1.z });
  assert.equal(state.facing, seat1.facing);

  // While seated, findNearestInteractable returns "E — Đứng dậy"
  assert.deepEqual(
    findNearestInteractable({
      pos: state.anchorPos,
      inClassroom: false,
      inLibraryLobby: true,
      seated: true,
      seatId: state.seatId,
      bikeRiding: false,
      bikeSpeed: 0,
      bikePos: { x: 999, z: 999 },
      questActive: false,
      questDoneBefore: false,
      anyQuestDone: false,
    }),
    { id: 'seat-stand-up', label: 'E — Đứng dậy' },
  );

  // (8) Selecting another seat while already seated is rejected with 'already-seated-other'
  const otherSeatRes = transitionToSeated(state, {
    seatId: seat2.seatId,
    playerPos: state.anchorPos,
    inLibraryLobby: true,
    inClassroom: false,
    bikeRiding: false,
  });
  assert.equal(otherSeatRes.ok, false);
  assert.equal(otherSeatRes.reason, 'already-seated-other');
  assert.equal(otherSeatRes.state.seatId, 'tqb-1f-t1-s1');

  // Standing up returns a safe standing position and resets seating state
  const standRes = transitionToStanding(state);
  assert.equal(standRes.ok, true);
  assert.equal(standRes.releasedSeatId, 'tqb-1f-t1-s1');
  assert.ok(standRes.standUpPos);
  assert.equal(
    resolveLibraryLobbyCollisions(standRes.standUpPos, AVATAR.radius).hit,
    null,
  );
  state = standRes.state;
  assert.equal(state.status, 'standing');
  assert.equal(state.seatId, null);
});

test('PR8 (9-12) Study Session seat binding, stand-up release, leaving lobby & stale reload cleanup', () => {
  const t0 = 1_700_000_000_000;
  let session = startStudySession(createInitialStudySession(), {
    nowMs: t0,
    subjectTag: 'HSK 4 · Bài 6',
  });

  // (9) Sitting binds studyRoomId: 'library-lobby' and seatId into Study Session
  session = bindSessionSeat(session, 'library-lobby', 'tqb-1f-t2-s1');
  assert.equal(session.studyRoomId, 'library-lobby');
  assert.equal(session.seatId, 'tqb-1f-t2-s1');

  // (10) Standing up clears seatId
  session = bindSessionSeat(session, 'library-lobby', null);
  assert.equal(session.seatId, null);

  // (11) Leaving LibraryLobby releases local seat state and clears seatId
  const seatedState = transitionToSeated(createInitialSeatingState(), {
    seatId: 'tqb-1f-t2-s1',
    playerPos: { x: 1.9, z: 0.54 },
    inLibraryLobby: true,
    inClassroom: false,
    bikeRiding: false,
  }).state;
  assert.equal(seatedState.status, 'seated');

  const afterLeave = reconcileSeatingWithEnvironment(seatedState, {
    inLibraryLobby: false,
    inClassroom: false,
    bikeRiding: false,
  });
  assert.equal(afterLeave.released, true);
  assert.equal(afterLeave.releasedSeatId, 'tqb-1f-t2-s1');
  assert.equal(afterLeave.state.status, 'standing');
  assert.equal(afterLeave.state.seatId, null);

  // (12) Reloading with a stale persisted seatId when player is outdoors clears seatId
  //      while keeping active Pomodoro and history intact
  const sessionWithStaleSeat = bindSessionSeat(session, 'library-lobby', 'tqb-1f-t1-s2');
  const reconciledReload = reconcilePersistedSessionSeat(sessionWithStaleSeat, {
    inLibraryLobby: false,
    activeSeatId: null,
  });
  assert.equal(reconciledReload.seatId, null);
  assert.equal(reconciledReload.studyRoomId, null);
  assert.equal(reconciledReload.active, true);
  assert.equal(reconciledReload.subjectTag, 'HSK 4 · Bài 6');

  // Ending session also clears seatId
  const ended = endStudySession(sessionWithStaleSeat);
  assert.equal(ended.seatId, null);
});

test('PR8 Review Fix (13) releaseActiveSeatSafely handles both mounted Player and unmounted Zen 2D seat release', () => {
  // Case A: Mounted Player (driver.standUp available) — delegates to driver without mutating externally
  let driverStandUpCalls = 0;
  const mountedRes = releaseActiveSeatSafely({
    driver: {
      standUp: () => {
        driverStandUpCalls += 1;
        return {
          ok: true,
          releasedSeatId: 'tqb-1f-t1-s1',
          pos: { x: -2.4, z: 0.54 },
        };
      },
    },
    fallbackSeatId: 'tqb-1f-t1-s1',
  });
  assert.equal(driverStandUpCalls, 1);
  assert.equal(mountedRes.released, true);
  assert.equal(mountedRes.viaMountedPlayer, true);
  assert.equal(mountedRes.releasedSeatId, 'tqb-1f-t1-s1');
  assert.deepEqual(mountedRes.standUpPos, { x: -2.4, z: 0.54 });

  // Case B: Unmounted Player in Zen 2D (driver is undefined)
  playerState.inLibraryLobby = true;
  playerState.seated = true;
  playerState.seatId = 'tqb-1f-t1-s1';
  playerState.pos = { x: -2.4, z: 1.2 };

  const unmountedRes = releaseActiveSeatSafely({
    driver: undefined,
    fallbackSeatId: 'tqb-1f-t1-s1',
  });
  assert.equal(unmountedRes.released, true);
  assert.equal(unmountedRes.viaMountedPlayer, false);
  assert.equal(unmountedRes.releasedSeatId, 'tqb-1f-t1-s1');
  assert.equal(playerState.seated, false);
  assert.equal(playerState.seatId, null);
  assert.deepEqual(playerState.pos, { x: -2.4, z: 0.54 });
  assert.equal(
    resolveLibraryLobbyCollisions(playerState.pos, AVATAR.radius).hit,
    null,
  );
});

test('PR9 (14) findNearestInteractable distinguishes available, pending, and occupied-by-other library seats', () => {
  const approach1 = { x: -2.4, z: 0.54 }; // near tqb-1f-t1-s1
  const base = {
    pos: approach1,
    inClassroom: false,
    inLibraryLobby: true,
    seated: false,
    seatId: null,
    bikeRiding: false,
    bikeSpeed: 0,
    bikePos: { x: 999, z: 999 },
    questActive: false,
    questDoneBefore: false,
    anyQuestDone: false,
  };

  assert.deepEqual(findNearestInteractable(base), {
    id: 'seat:tqb-1f-t1-s1',
    label: 'E — Ngồi học',
  });

  assert.deepEqual(
    findNearestInteractable({
      ...base,
      pendingSeatId: 'tqb-1f-t1-s1',
    }),
    {
      id: 'seat:tqb-1f-t1-s1',
      label: '⏳ Đang giữ chỗ...',
    },
  );

  assert.deepEqual(
    findNearestInteractable({
      ...base,
      occupiedByOtherSeatIds: new Set(['tqb-1f-t1-s1']),
    }),
    {
      id: 'seat:tqb-1f-t1-s1',
      label: '🔒 Ghế đang có người ngồi — hãy chọn ghế khác',
    },
  );
});

