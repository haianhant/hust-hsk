// ---------------------------------------------------------------------------
// test/library-floor-seating.test.cjs — Floor-Aware Library Seating,
// Interaction Prompts & Reconnect Reconciliation unit tests (PR10A).
// ---------------------------------------------------------------------------

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

require('./register-ts.cjs');

const ROOT = path.resolve(__dirname, '..');
const { AVATAR, LIBRARY_LOBBY, resolveLibraryLobbyCollisions } = require(path.join(ROOT, 'lib/campus.ts'));
const { createInitialStudySession } = require(path.join(ROOT, 'features/study/study-session/session.ts'));
const {
  createInitialSeatingState,
  evaluateReclaimOutcome,
  evaluateReconnectSeatAction,
  findNearestInteractable,
  findNearestLibrarySeat,
  getAllLibrarySeatsForFloor,
  getLibraryLobbySeats,
  reconcilePersistedSessionSeat,
  reconcileSeatingWithEnvironment,
  transitionToSeated,
  transitionToStanding,
  validateSeatSelection,
} = require(path.join(ROOT, 'features/campus/interaction/index.ts'));

const LIBRARY_LOBBY_SEATS = getLibraryLobbySeats();
const NON_FLOOR_1 = [2, 3, 4, 5, 6, 7, 10];

test('PR10A Floor-Seating (1) Floor 1 seating succeeds at all 4 PR8/PR9 seats and stands up to collision-free Floor 1 positions', () => {
  assert.equal(LIBRARY_LOBBY_SEATS.length, 4);
  for (const seat of LIBRARY_LOBBY_SEATS) {
    const approachPos = {
      x: seat.x,
      z: seat.z + 0.45,
    };

    const near = findNearestLibrarySeat(approachPos, 1.65, 1);
    assert.ok(near !== null, `Seat ${seat.seatId} must be discoverable on Floor 1`);

    const seatedRes = transitionToSeated(createInitialSeatingState(), {
      seatId: seat.seatId,
      playerPos: approachPos,
      inLibraryLobby: true,
      libraryFloor: 1,
      inClassroom: false,
      bikeRiding: false,
      uiLocked: false,
    });
    assert.equal(seatedRes.ok, true, `Sitting at ${seat.seatId} on Floor 1 must succeed`);
    assert.equal(seatedRes.state.status, 'seated');
    assert.equal(seatedRes.state.seatId, seat.seatId);

    const standRes = transitionToStanding(seatedRes.state);
    assert.equal(standRes.ok, true);
    assert.ok(standRes.standUpPos);

    const colCheck = resolveLibraryLobbyCollisions(standRes.standUpPos, AVATAR.radius, 1);
    assert.equal(
      colCheck.hit,
      null,
      `Stand-up spot for ${seat.seatId} at (${standRes.standUpPos.x}, ${standRes.standUpPos.z}) must be collision-free on Floor 1`,
    );
  }
});

test('PR10A Floor-Seating (2) Floors 2, 3, 4, 5, 6, 7, 10 at matching X/Z reject Floor 1 seat selection with reason "wrong-floor"', () => {
  const seat = LIBRARY_LOBBY_SEATS[0];
  const sameXZ = { x: seat.x, z: seat.z + 0.45 };

  for (const floor of NON_FLOOR_1) {
    // 1. findNearestLibrarySeat must return null on non-Floor-1
    const nearSeat = findNearestLibrarySeat(sameXZ, 2.0, floor);
    assert.equal(nearSeat, null, `findNearestLibrarySeat must return null on floor ${floor}`);

    // 2. validateSeatSelection must reject with 'wrong-floor'
    const check = validateSeatSelection({
      seatId: seat.seatId,
      playerPos: sameXZ,
      inLibraryLobby: true,
      libraryFloor: floor,
      inClassroom: false,
      bikeRiding: false,
      uiLocked: false,
      currentSeating: createInitialSeatingState(),
    });
    assert.equal(check.ok, false, `validateSeatSelection must fail on floor ${floor}`);
    assert.equal(check.reason, 'wrong-floor');

    // 3. transitionToSeated must reject with 'wrong-floor'
    const trans = transitionToSeated(createInitialSeatingState(), {
      seatId: seat.seatId,
      playerPos: sameXZ,
      inLibraryLobby: true,
      libraryFloor: floor,
      inClassroom: false,
      bikeRiding: false,
      uiLocked: false,
    });
    assert.equal(trans.ok, false);
    assert.equal(trans.reason, 'wrong-floor');
  }
});

test('PR10A Floor-Seating (3) findNearestInteractable hides Floor 1 seats, statue, vocab board & info desk when libraryFloor !== 1', () => {
  const seat = LIBRARY_LOBBY_SEATS[0];
  const baseInput = {
    inClassroom: false,
    inLibraryLobby: true,
    seated: false,
    seatId: null,
    bikeRiding: false,
    bikeSpeed: 0,
    bikePos: { x: 0, z: 0 },
    questActive: false,
    questDoneBefore: true,
    anyQuestDone: true,
  };

  // On Floor 1, all 4 Floor-1 interactables are detected at their anchors
  const f1Seat = findNearestInteractable({
    ...baseInput,
    libraryFloor: 1,
    pos: { x: seat.x, z: seat.z + 0.4 },
  });
  assert.equal(f1Seat?.id, `seat:${seat.seatId}`);

  const f1Statue = findNearestInteractable({
    ...baseInput,
    libraryFloor: 1,
    pos: { x: LIBRARY_LOBBY.statue.x, z: LIBRARY_LOBBY.statue.z - 0.8 },
  });
  assert.equal(f1Statue?.id, 'lobby-statue');

  const f1Vocab = findNearestInteractable({
    ...baseInput,
    libraryFloor: 1,
    pos: { x: LIBRARY_LOBBY.vocabBoard.x, z: LIBRARY_LOBBY.vocabBoard.z - 0.8 },
  });
  assert.equal(f1Vocab?.id, 'lobby-vocab-board');

  const f1Info = findNearestInteractable({
    ...baseInput,
    libraryFloor: 1,
    pos: { x: LIBRARY_LOBBY.infoDesk.x, z: LIBRARY_LOBBY.infoDesk.z - 0.8 },
  });
  assert.equal(f1Info?.id, 'lobby-info-desk');

  // On every other floor (2, 3, 4, 5, 6, 7, 10), exact same X/Z returns null
  for (const floor of NON_FLOOR_1) {
    assert.equal(
      findNearestInteractable({
        ...baseInput,
        libraryFloor: floor,
        pos: { x: seat.x, z: seat.z + 0.4 },
      }),
      null,
      `Seat prompt must not appear on floor ${floor}`,
    );
    assert.equal(
      findNearestInteractable({
        ...baseInput,
        libraryFloor: floor,
        pos: { x: LIBRARY_LOBBY.statue.x, z: LIBRARY_LOBBY.statue.z - 0.8 },
      }),
      null,
      `Statue prompt must not appear on floor ${floor}`,
    );
    assert.equal(
      findNearestInteractable({
        ...baseInput,
        libraryFloor: floor,
        pos: { x: LIBRARY_LOBBY.vocabBoard.x, z: LIBRARY_LOBBY.vocabBoard.z - 0.8 },
      }),
      null,
      `Vocab board prompt must not appear on floor ${floor}`,
    );
    assert.equal(
      findNearestInteractable({
        ...baseInput,
        libraryFloor: floor,
        pos: { x: LIBRARY_LOBBY.infoDesk.x, z: LIBRARY_LOBBY.infoDesk.z - 0.8 },
      }),
      null,
      `Info desk prompt must not appear on floor ${floor}`,
    );
  }
});

test('PR10A Floor-Seating (4) Switching floors while seated or reconnecting on non-Floor-1 safely releases local and server seat', () => {
  const seat = LIBRARY_LOBBY_SEATS[0];
  const seatedRes = transitionToSeated(createInitialSeatingState(), {
    seatId: seat.seatId,
    playerPos: { x: seat.x, z: seat.z + 0.45 },
    inLibraryLobby: true,
    libraryFloor: 1,
    inClassroom: false,
    bikeRiding: false,
    uiLocked: false,
  });
  assert.equal(seatedRes.ok, true);

  for (const floor of NON_FLOOR_1) {
    // 1. reconcileSeatingWithEnvironment releases local seating when libraryFloor !== 1
    const envRec = reconcileSeatingWithEnvironment(seatedRes.state, {
      inLibraryLobby: true,
      libraryFloor: floor,
      inClassroom: false,
      bikeRiding: false,
    });
    assert.equal(envRec.released, true, `reconcileSeatingWithEnvironment must release seat on floor ${floor}`);
    assert.equal(envRec.releasedSeatId, seat.seatId);
    assert.equal(envRec.state.status, 'standing');

    // 2. reconcilePersistedSessionSeat clears persisted session seat when libraryFloor !== 1
    const baseSession = {
      ...createInitialStudySession(1000),
      studyRoomId: 'library-lobby',
      seatId: seat.seatId,
    };
    const persRec = reconcilePersistedSessionSeat(baseSession, {
      inLibraryLobby: true,
      activeSeatId: seat.seatId,
      libraryFloor: floor,
    });
    assert.equal(persRec.seatId, null);

    // 3. evaluateReconnectSeatAction releases stale server seat when player is on floor !== 1
    const snapAction = evaluateReconnectSeatAction({
      inLibraryLobby: true,
      libraryFloor: floor,
      localSeated: true,
      localSeatId: seat.seatId,
      mpStatus: 'online',
      selfId: 'self-123',
      seatMap: {
        [seat.seatId]: {
          seatId: seat.seatId,
          studyRoomId: 'library-lobby',
          occupantId: 'self-123',
          occupantName: 'Bách Khoa',
          claimedAtMs: 1000,
        },
      },
    });
    assert.equal(snapAction.action, 'release-stale-server-seat');
    assert.equal(snapAction.seatId, seat.seatId);

    // 4. evaluateReclaimOutcome releases server seat if player moved to floor !== 1 while claim was in flight
    const postReclaim = evaluateReclaimOutcome({
      targetSeatId: seat.seatId,
      outcome: { ok: true },
      currentlyInLibraryLobby: true,
      currentLibraryFloor: floor,
      currentlySeated: true,
      currentLocalSeatId: seat.seatId,
      previousServerSeatId: null,
    });
    assert.equal(postReclaim.action, 'release-server-seat');
    assert.equal(postReclaim.seatId, seat.seatId);
  }
});

test('PR11 Multi-Floor Seating (5) All accessible floors (1, 2, 3, 4, 5, 6, 7, 10) provide interactive seats that sit and stand up cleanly', () => {
  const allAccessibleFloors = [1, 2, 3, 4, 5, 6, 7, 10];
  for (const floor of allAccessibleFloors) {
    const seats = getAllLibrarySeatsForFloor(floor);
    assert.ok(seats.length > 0, `Floor ${floor} must have at least 1 interactive seat`);
    const sampleSeat = seats[0];
    const nearPos = { x: sampleSeat.x + 0.1, z: sampleSeat.z + 0.1 };

    const found = findNearestLibrarySeat(nearPos, 1.85, floor);
    assert.ok(found !== null, `Floor ${floor} seat ${sampleSeat.seatId} must be discoverable`);

    const seatedRes = transitionToSeated(createInitialSeatingState(), {
      seatId: sampleSeat.seatId,
      playerPos: nearPos,
      inLibraryLobby: true,
      libraryFloor: floor,
      inClassroom: false,
      bikeRiding: false,
      uiLocked: false,
    });
    assert.equal(seatedRes.ok, true, `Sitting at ${sampleSeat.seatId} on Floor ${floor} must succeed`);
    assert.equal(seatedRes.state.status, 'seated');

    // Staying on the same floor keeps the seat
    const stayEnv = reconcileSeatingWithEnvironment(seatedRes.state, {
      inLibraryLobby: true,
      libraryFloor: floor,
      inClassroom: false,
      bikeRiding: false,
    });
    assert.equal(stayEnv.released, false, `Staying on Floor ${floor} must keep seat ${sampleSeat.seatId}`);

    // Standing up succeeds
    const standRes = transitionToStanding(seatedRes.state);
    assert.equal(standRes.ok, true);
    assert.ok(standRes.standUpPos);
  }
});

test('PR11 Library Elevator (6) Approaching the elevator doors on Floors 1–7 and 10 triggers the E — Sử dụng Thang máy Thư viện prompt', () => {
  const baseInput = {
    inClassroom: false,
    inLibraryLobby: true,
    seated: false,
    seatId: null,
    occupiedByOtherSeatIds: new Set(),
    pendingSeatId: null,
    bikeRiding: false,
    bikeSpeed: 0,
    bikePos: { x: 999, z: 999 },
    questActive: false,
    questDoneBefore: false,
    anyQuestDone: false,
    stepId: undefined,
  };

  for (const floor of [1, 2, 3, 4, 5]) {
    const found = findNearestInteractable({
      ...baseInput,
      libraryFloor: floor,
      pos: { x: 18.0, z: -1.6 },
    });
    assert.deepEqual(found, {
      id: 'library-elevator',
      label: 'E — Sử dụng Thang máy Thư viện (T1–T10)',
    });
  }

  for (const floor of [6, 7]) {
    const found = findNearestInteractable({
      ...baseInput,
      libraryFloor: floor,
      pos: { x: 22.0, z: -1.8 },
    });
    assert.deepEqual(found, {
      id: 'library-elevator',
      label: 'E — Sử dụng Thang máy Thư viện (T1–T10)',
    });
  }

  const found10 = findNearestInteractable({
    ...baseInput,
    libraryFloor: 10,
    pos: { x: -2.4, z: -3.2 },
  });
  assert.deepEqual(found10, {
    id: 'library-elevator',
    label: 'E — Sử dụng Thang máy Thư viện (T1–T10)',
  });
});

test('PR12 Multi-Floor Seating, Grand Piano Bench & Floor 10 Daybed Lying Pose + Telemetry Sync', () => {
  const {
    decodeMoveTelemetry,
    encodeMoveTelemetry,
  } = require(path.join(ROOT, 'shared/contracts/multiplayer.ts'));
  const {
    LYING_GROUP_Y_OFFSET,
    computeLyingPoseTargets,
    computePianoPoseTargets,
    isLyingSeatId,
    isPianoBenchSeatId,
  } = require(path.join(ROOT, 'features/avatar/animation/gait.ts'));

  // 1. Floor 4 Room 401 reading table seats (6 chairs per table)
  const f4Seats = getAllLibrarySeatsForFloor(4);
  const r401Seat = f4Seats.find((s) => s.seatId === 'tqb-f4-r401-table-1-s1');
  assert.ok(r401Seat, 'Room 401 table 1 seat 1 must exist');
  assert.equal(r401Seat.y, 13.5);

  // 2. Floor 6 Grand Piano bench seat & prompt
  const f6Seats = getAllLibrarySeatsForFloor(6);
  const pianoBench = f6Seats.find((s) => s.seatId === 'tqb-6f-piano-bench');
  assert.ok(pianoBench, 'Floor 6 piano bench must exist');
  assert.equal(isPianoBenchSeatId(pianoBench.seatId), true);
  assert.equal(pianoBench.y, 0.6);

  const pianoTele = encodeMoveTelemetry({
    x: pianoBench.x,
    z: pianoBench.z,
    facing: pianoBench.facing,
    scene: 'library',
    libraryFloor: 6,
    seatedSeatId: 'tqb-6f-piano-bench',
  });
  const decodedPiano = decodeMoveTelemetry(pianoTele);
  assert.equal(decodedPiano.scene, 'library');
  assert.equal(decodedPiano.libraryFloor, 6);
  assert.equal(decodedPiano.seatedSeatId, 'tqb-6f-piano-bench');

  const pianoPoseIdle = computePianoPoseTargets(1.0, false);
  const pianoPoseActive = computePianoPoseTargets(1.0, true);
  assert.notEqual(pianoPoseIdle.armLTarget, pianoPoseActive.armLTarget);

  // 3. Floor 10 Rooftop Daybeds & Sun Loungers (lying down pose & telemetry)
  const f10Seats = getAllLibrarySeatsForFloor(10);
  const bed1 = f10Seats.find((s) => s.seatId === 'tqb-10f-bed-1');
  const lounger1 = f10Seats.find((s) => s.seatId === 'tqb-10f-lounger-1');
  assert.ok(bed1, 'Floor 10 daybed 1 must exist');
  assert.ok(lounger1, 'Floor 10 sun lounger 1 must exist');
  assert.equal(isLyingSeatId(bed1.seatId), true);
  assert.equal(isLyingSeatId(lounger1.seatId), true);
  assert.equal(LYING_GROUP_Y_OFFSET, -0.44);

  const lyingTele = encodeMoveTelemetry({
    x: bed1.x,
    z: bed1.z,
    facing: bed1.facing,
    scene: 'library',
    libraryFloor: 10,
    seatedSeatId: bed1.seatId,
  });
  const decodedLying = decodeMoveTelemetry(lyingTele);
  assert.equal(decodedLying.scene, 'library');
  assert.equal(decodedLying.libraryFloor, 10);
  assert.equal(decodedLying.seatedSeatId, 'lying-floor-10');
  assert.equal(isLyingSeatId(decodedLying.seatedSeatId), true);

  const lyingPose = computeLyingPoseTargets(1.5);
  assert.ok(lyingPose.bodyLeanTarget < -1.0, 'Lying pose leans torso backward onto bed');
});


