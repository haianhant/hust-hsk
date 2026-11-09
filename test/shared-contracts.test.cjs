/**
 * test/shared-contracts.test.cjs — Unit & integration tests for PR1:
 *  - Authoritative world bounds parity (shared/constants/world.ts <-> lib/campus.ts <-> worker/src/room.ts)
 *  - Shared multiplayer contracts, validators, and movement speed/bounds clamping
 *  - HskRoom Durable Object join/leave, reconnect deduplication, and WebSocket hibernation restoration
 *
 * Run: node --test test/shared-contracts.test.cjs
 */
'use strict';

require('./register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const world = require(path.join(ROOT, 'shared/constants/world.ts'));
const mpContracts = require(path.join(ROOT, 'shared/contracts/multiplayer.ts'));
const campus = require(path.join(ROOT, 'lib/campus.ts'));
const workerRoom = require(path.join(ROOT, 'worker/src/room.ts'));

function createMockSocket() {
  let attachment = null;
  const sent = [];
  const closed = [];
  return {
    readyState: 1,
    sent,
    closed,
    send(data) {
      sent.push(JSON.parse(String(data)));
    },
    close(code, reason) {
      this.readyState = 3;
      closed.push({ code, reason });
    },
    serializeAttachment(val) {
      attachment = JSON.parse(JSON.stringify(val));
    },
    deserializeAttachment() {
      return attachment ? JSON.parse(JSON.stringify(attachment)) : null;
    },
  };
}

function createMockDoState(initialSockets = []) {
  const sockets = [...initialSockets];
  return {
    sockets,
    acceptWebSocket(ws) {
      sockets.push(ws);
    },
    getWebSockets() {
      return sockets.filter((s) => s.readyState !== 3);
    },
  };
}

test('(1) Authoritative BOUNDS and SPAWN match across shared, campus, and worker', () => {
  assert.deepEqual(world.BOUNDS, { minX: -96, maxX: 168, minZ: -76, maxZ: 108 });
  assert.deepEqual(campus.BOUNDS, world.BOUNDS);
  assert.deepEqual(workerRoom.BOUNDS, world.BOUNDS);

  assert.equal(campus.SPAWN.x, world.SPAWN.x);
  assert.equal(campus.SPAWN.z, world.SPAWN.z);
  assert.equal(workerRoom.SPAWN.x, world.SPAWN.x);
  assert.equal(workerRoom.SPAWN.z, world.SPAWN.z);
});

test('(2) clampToWorldBounds preserves East/South-East campus positions up to (168, 108)', () => {
  assert.deepEqual(world.clampToWorldBounds({ x: 165, z: 104 }), { x: 165, z: 104 });
  assert.deepEqual(world.clampToWorldBounds({ x: -120, z: 220 }), { x: -96, z: 108 });
  assert.deepEqual(world.clampToWorldBounds({ x: 200, z: -99 }), { x: 168, z: -76 });
});

test('(3) Shared sanitizers: sanitizeName, sanitizeMssv, extractValidAppearance, pickShirtColor', () => {
  assert.equal(mpContracts.sanitizeName('  Hải <script>Anh/\\  '), 'Hải scriptAnh');
  assert.equal(mpContracts.sanitizeName(''), 'Bạn');
  assert.equal(mpContracts.sanitizeName(null), 'Bạn');
  assert.equal(mpContracts.sanitizeName('A'.repeat(50)).length, 30);

  assert.equal(mpContracts.sanitizeMssv('20226010'), '20226010');
  assert.equal(mpContracts.sanitizeMssv(' 20226011 '), '20226011');
  assert.equal(mpContracts.sanitizeMssv('1234567'), null);
  assert.equal(mpContracts.sanitizeMssv('202260109'), null);
  assert.equal(mpContracts.sanitizeMssv('2022601a'), null);

  const validApp = mpContracts.extractValidAppearance({
    gender: 'female',
    outfit: 'tshirt-navy',
    hairStyle: 'ponytail',
    skirt: true,
    glasses: false,
    backpack: true,
  });
  assert.deepEqual(validApp, {
    gender: 'female',
    outfit: 'tshirt-navy',
    hairStyle: 'ponytail',
    skirt: true,
    glasses: false,
    backpack: true,
  });

  const invalidApp = mpContracts.extractValidAppearance({
    gender: 'invalid',
    outfit: 'unknown-suit',
    hairStyle: 'mohawk',
    skirt: 'yes',
  });
  assert.deepEqual(invalidApp, {});

  for (let i = 0; i < 25; i++) {
    const c = mpContracts.pickShirtColor(`session-${i}`);
    assert.notEqual(c.toUpperCase(), '#DA1E26');
  }
});

test('(4) clampMoveStep enforces both world bounds and walk vs ride speed caps', () => {
  // Small legal walk step (1m over 0.2s, maxDist = 7 * 0.2 + 0.5 = 1.9m)
  const step1 = mpContracts.clampMoveStep(0, 0, 1, 0, 'walking', 0.2);
  assert.deepEqual(step1, { x: 1, z: 0 });

  // Teleport attempt while walking (50m over 0.1s, maxDist = 7 * 0.1 + 0.5 = 1.2m)
  const step2 = mpContracts.clampMoveStep(0, 0, 50, 0, 'walking', 0.1);
  assert.ok(Math.abs(step2.x - 1.2) < 1e-6);
  assert.equal(step2.z, 0);

  // Riding allows faster movement (50m over 0.1s -> maxDist = 15 * 0.1 + 0.5 = 2.0m)
  const step3 = mpContracts.clampMoveStep(0, 0, 50, 0, 'riding', 0.1);
  assert.ok(Math.abs(step3.x - 2.0) < 1e-6);

  // World boundary clamping in East Campus (at x=167.5, moving to x=180 over 1s -> clamped at 168)
  const step4 = mpContracts.clampMoveStep(167.5, 107.0, 180, 120, 'walking', 1.0);
  assert.deepEqual(step4, { x: 168, z: 108 });
});

test('(5) HskRoom Durable Object: join, hibernation wakeup restoration, reconnect deduplication, and leave', async () => {
  const ctx = createMockDoState();
  const room1 = new workerRoom.HskRoom(ctx);

  const wsA = createMockSocket();
  const wsB = createMockSocket();
  ctx.acceptWebSocket(wsA);
  ctx.acceptWebSocket(wsB);

  // Client A joins
  await room1.webSocketMessage(
    wsA,
    JSON.stringify({
      type: 'join',
      sessionId: 'sess-a',
      name: 'Lan Anh',
      mssv: '20226088',
      gender: 'female',
      outfit: 'tshirt-navy',
      hairStyle: 'ponytail',
      skirt: true,
      glasses: true,
      backpack: false,
    }),
  );
  assert.equal(wsA.sent[0].type, 'welcome');
  assert.equal(wsA.sent[0].count, 1);

  // Client B joins
  await room1.webSocketMessage(
    wsB,
    JSON.stringify({
      type: 'join',
      sessionId: 'sess-b',
      name: 'Minh Quân',
      mssv: '20225102',
      gender: 'male',
      outfit: 'bomber-red-navy',
    }),
  );
  const welcomeB = wsB.sent.find((m) => m.type === 'welcome');
  assert.equal(welcomeB.count, 2);
  const aInB = welcomeB.players.find((p) => p.id === 'sess-a');
  assert.equal(aInB.outfit, 'tshirt-navy');
  assert.equal(aInB.skirt, true);

  // Simulate Cloudflare Durable Object Hibernation:
  // Create a fresh HskRoom instance with the same `ctx` (in-memory Maps are empty on cold start,
  // state must be restored from `ws.deserializeAttachment()`).
  const hibernatedRoom = new workerRoom.HskRoom(ctx);

  const countResp = await hibernatedRoom.fetch(new Request('https://internal/__count'));
  const countJson = await countResp.json();
  assert.equal(countJson.count, 2, 'Hibernated room must restore count=2 from socket attachments');

  // After hibernation, Client A sends a `move` message — must NOT be dropped!
  wsB.sent.length = 0;
  const targetX = world.SPAWN.x - 0.5;
  const targetZ = world.SPAWN.z + 0.2;
  await hibernatedRoom.webSocketMessage(
    wsA,
    JSON.stringify({
      type: 'move',
      x: targetX,
      z: targetZ,
      facing: -Math.PI / 2,
      state: 'walking',
    }),
  );
  assert.equal(wsB.sent.length, 1, 'Client B must receive move broadcast after DO hibernation');
  assert.equal(wsB.sent[0].type, 'move');
  assert.equal(wsB.sent[0].id, 'sess-a');
  assert.ok(Math.abs(wsB.sent[0].x - targetX) < 0.01);

  // After hibernation, Client A reconnects with a new socket `wsA2` using the same sessionId 'sess-a'
  const wsA2 = createMockSocket();
  ctx.acceptWebSocket(wsA2);
  await hibernatedRoom.webSocketMessage(
    wsA2,
    JSON.stringify({
      type: 'join',
      sessionId: 'sess-a',
      name: 'Lan Anh',
      mssv: '20226088',
      gender: 'female',
      outfit: 'sweater-cream',
    }),
  );

  // Old socket wsA must have been closed with 1000 'Replaced by reconnect'
  assert.equal(wsA.closed.length, 1);
  assert.equal(wsA.closed[0].code, 1000);

  // When the old socket's close handler fires, 'sess-a' must NOT be deleted because wsA2 is active
  wsB.sent.length = 0;
  await hibernatedRoom.webSocketClose(wsA);
  assert.equal(
    wsB.sent.some((m) => m.type === 'leave'),
    false,
    'Closing replaced socket must not broadcast leave',
  );

  const countAfterReconnect = await (
    await hibernatedRoom.fetch(new Request('https://internal/__count'))
  ).json();
  assert.equal(countAfterReconnect.count, 2);

  // Now Client B disconnects for real -> must broadcast leave and count=1
  wsA2.sent.length = 0;
  wsB.close(1000, 'Client left');
  await hibernatedRoom.webSocketClose(wsB);
  assert.equal(wsA2.sent.some((m) => m.type === 'leave' && m.id === 'sess-b'), true);
  assert.equal(wsA2.sent.some((m) => m.type === 'count' && m.count === 1), true);
});

test('(6) PR9 HskRoom Durable Object: authoritative seat claims, conflicts, atomic switch, presence spoofing override, hibernation & room isolation', async () => {
  const ctx1 = createMockDoState();
  const roomHsk1 = new workerRoom.HskRoom(ctx1);

  const wsA = createMockSocket();
  const wsB = createMockSocket();
  ctx1.acceptWebSocket(wsA);
  ctx1.acceptWebSocket(wsB);

  // 1. Client A joins and receives welcome + study:room-snapshot
  await roomHsk1.webSocketMessage(
    wsA,
    JSON.stringify({
      type: 'join',
      sessionId: 'sess-a',
      name: 'Nguyễn Văn A',
      mssv: '20226001',
      gender: 'male',
      outfit: 'windbreaker-hust',
    }),
  );
  const snapA0 = wsA.sent.find((m) => m.type === 'study:room-snapshot');
  assert.ok(snapA0, 'Client A must receive initial study:room-snapshot on join');
  assert.deepEqual(snapA0.seats, []);

  // Client B joins hsk-1
  await roomHsk1.webSocketMessage(
    wsB,
    JSON.stringify({
      type: 'join',
      sessionId: 'sess-b',
      name: 'Trần Thị B',
      mssv: '20226002',
      gender: 'female',
      outfit: 'polo-red',
    }),
  );

  // 2. Client A claims tqb-1f-t1-s1; both A and B receive study:seat-claimed (without occupantMssv)
  wsA.sent.length = 0;
  wsB.sent.length = 0;
  await roomHsk1.webSocketMessage(
    wsA,
    JSON.stringify({
      type: 'study:claim-seat',
      seatId: 'tqb-1f-t1-s1',
      subjectTag: 'Giải tích 1',
      pomodoroPhase: 'focus',
      requestId: 'req-a-1',
    }),
  );
  const claimedOnA = wsA.sent.find((m) => m.type === 'study:seat-claimed');
  const claimedOnB = wsB.sent.find((m) => m.type === 'study:seat-claimed');
  assert.ok(claimedOnA && claimedOnB, 'Both A and B must receive study:seat-claimed');
  assert.equal(claimedOnA.requestId, 'req-a-1');
  assert.equal(claimedOnB.occupancy.seatId, 'tqb-1f-t1-s1');
  assert.equal(claimedOnB.occupancy.occupantId, 'sess-a');
  assert.equal(claimedOnB.occupancy.occupantName, 'Nguyễn Văn A');
  assert.equal('occupantMssv' in claimedOnB.occupancy, false);

  // 3. Client B attempts to claim tqb-1f-t1-s1 -> receives study:seat-rejected ('already-occupied')
  wsB.sent.length = 0;
  await roomHsk1.webSocketMessage(
    wsB,
    JSON.stringify({
      type: 'study:claim-seat',
      seatId: 'tqb-1f-t1-s1',
      requestId: 'req-b-conflict',
    }),
  );
  const rejectedB = wsB.sent.find((m) => m.type === 'study:seat-rejected');
  assert.ok(rejectedB, 'Client B must receive study:seat-rejected');
  assert.equal(rejectedB.reason, 'already-occupied');
  assert.equal(rejectedB.occupiedBy, 'sess-a');
  assert.equal(rejectedB.occupiedByName, 'Nguyễn Văn A');
  assert.equal(rejectedB.requestId, 'req-b-conflict');

  // 4. Client A switches to tqb-1f-t1-s2; tqb-1f-t1-s1 becomes available; Client B claims tqb-1f-t1-s1
  wsA.sent.length = 0;
  wsB.sent.length = 0;
  await roomHsk1.webSocketMessage(
    wsA,
    JSON.stringify({
      type: 'study:claim-seat',
      seatId: 'tqb-1f-t1-s2',
      subjectTag: 'Giải tích 1',
      requestId: 'req-a-switch',
    }),
  );
  const releasedPrevOnB = wsB.sent.find(
    (m) => m.type === 'study:seat-released' && m.seatId === 'tqb-1f-t1-s1',
  );
  const claimedSwitchOnB = wsB.sent.find(
    (m) => m.type === 'study:seat-claimed' && m.occupancy.seatId === 'tqb-1f-t1-s2',
  );
  assert.ok(releasedPrevOnB, 'Switching seats must broadcast study:seat-released for old seat');
  assert.equal(releasedPrevOnB.reason, 'switched-seat');
  assert.ok(claimedSwitchOnB, 'Switching seats must broadcast study:seat-claimed for new seat');
  assert.equal(claimedSwitchOnB.releasedSeatId, 'tqb-1f-t1-s1');

  wsB.sent.length = 0;
  await roomHsk1.webSocketMessage(
    wsB,
    JSON.stringify({
      type: 'study:claim-seat',
      seatId: 'tqb-1f-t1-s1',
      subjectTag: 'HSK 4',
      requestId: 'req-b-ok',
    }),
  );
  const claimedBOk = wsB.sent.find(
    (m) => m.type === 'study:seat-claimed' && m.occupancy.seatId === 'tqb-1f-t1-s1',
  );
  assert.ok(claimedBOk, 'Client B must now succeed in claiming tqb-1f-t1-s1');
  assert.equal(claimedBOk.occupancy.occupantId, 'sess-b');

  // 5. Client A sends study:presence ('studying', 'focus', subjectTag); Client B receives study:presence
  wsB.sent.length = 0;
  await roomHsk1.webSocketMessage(
    wsA,
    JSON.stringify({
      type: 'study:presence',
      presence: {
        status: 'studying',
        studyRoomId: 'library-lobby',
        seatId: 'tqb-1f-t1-s2',
        pomodoroPhase: 'focus',
        subjectTag: 'Đại số tuyến tính',
      },
    }),
  );
  const presFromA = wsB.sent.find((m) => m.type === 'study:presence' && m.playerId === 'sess-a');
  assert.ok(presFromA, 'Client B must receive study:presence broadcast from Client A');
  assert.equal(presFromA.presence.status, 'studying');
  assert.equal(presFromA.presence.seatId, 'tqb-1f-t1-s2');
  assert.equal(presFromA.presence.subjectTag, 'Đại số tuyến tính');

  // 6. Client B spoofs study:presence with seatId 'tqb-1f-t2-s1' while owning 'tqb-1f-t1-s1'
  wsA.sent.length = 0;
  await roomHsk1.webSocketMessage(
    wsB,
    JSON.stringify({
      type: 'study:presence',
      presence: {
        status: 'studying',
        studyRoomId: 'library-lobby',
        seatId: 'tqb-1f-t2-s1', // spoofed seatId!
        pomodoroPhase: 'focus',
        subjectTag: 'HSK 4',
      },
    }),
  );
  const presFromB = wsA.sent.find((m) => m.type === 'study:presence' && m.playerId === 'sess-b');
  assert.ok(presFromB);
  assert.equal(
    presFromB.presence.seatId,
    'tqb-1f-t1-s1',
    'Server must override spoofed presence seatId with authoritative owned seat',
  );

  // 8 & 9. Simulated DO hibernation while A & B are seated, plus A reconnecting with same sessionId
  const hibernatedRoom = new workerRoom.HskRoom(ctx1);
  const wsA2 = createMockSocket();
  ctx1.acceptWebSocket(wsA2);
  await hibernatedRoom.webSocketMessage(
    wsA2,
    JSON.stringify({
      type: 'join',
      sessionId: 'sess-a',
      name: 'Nguyễn Văn A',
      mssv: '20226001',
      gender: 'male',
      outfit: 'windbreaker-hust',
    }),
  );
  await hibernatedRoom.webSocketClose(wsA);
  const snapAfterHibernation = wsA2.sent.find((m) => m.type === 'study:room-snapshot');
  assert.ok(snapAfterHibernation, 'Reconnected A after DO hibernation receives study:room-snapshot');
  assert.equal(snapAfterHibernation.seats.length, 2, 'Both seats must survive DO hibernation & reconnect');
  const seatAInSnap = snapAfterHibernation.seats.find((s) => s.occupantId === 'sess-a');
  const seatBInSnap = snapAfterHibernation.seats.find((s) => s.occupantId === 'sess-b');
  assert.equal(seatAInSnap.seatId, 'tqb-1f-t1-s2');
  assert.equal(seatBInSnap.seatId, 'tqb-1f-t1-s1');

  // 10. Two simultaneous claims for tqb-1f-t2-s1 result in 1 claimed and 1 rejected
  wsA2.sent.length = 0;
  wsB.sent.length = 0;
  await Promise.all([
    hibernatedRoom.webSocketMessage(
      wsA2,
      JSON.stringify({
        type: 'study:claim-seat',
        seatId: 'tqb-1f-t2-s1',
        requestId: 'race-a',
      }),
    ),
    hibernatedRoom.webSocketMessage(
      wsB,
      JSON.stringify({
        type: 'study:claim-seat',
        seatId: 'tqb-1f-t2-s1',
        requestId: 'race-b',
      }),
    ),
  ]);
  const allMessages = [...wsA2.sent, ...wsB.sent];
  const raceClaims = allMessages.filter(
    (m) =>
      m.type === 'study:seat-claimed' &&
      m.occupancy?.seatId === 'tqb-1f-t2-s1' &&
      (m.requestId === 'race-a' || m.requestId === 'race-b'),
  );
  const raceRejects = allMessages.filter(
    (m) =>
      m.type === 'study:seat-rejected' &&
      m.seatId === 'tqb-1f-t2-s1' &&
      (m.requestId === 'race-a' || m.requestId === 'race-b'),
  );
  assert.equal(raceClaims.length, 2, 'Exactly 1 winner broadcast to both sockets (2 messages)');
  assert.equal(raceRejects.length, 1, 'Exactly 1 loser receives study:seat-rejected');

  // 7. Client A disconnects -> Client B receives study:seat-released and leave
  wsB.sent.length = 0;
  wsA2.close(1000, 'Client left');
  await hibernatedRoom.webSocketClose(wsA2);
  const releaseOnDisconnect = wsB.sent.find(
    (m) => m.type === 'study:seat-released' && m.occupantId === 'sess-a',
  );
  assert.ok(releaseOnDisconnect, 'Disconnect must broadcast study:seat-released for occupant seat');
  assert.equal(releaseOnDisconnect.reason, 'disconnect');

  // 11. Room isolation: Client C in separate HskRoom instance (hsk-2) can claim tqb-1f-t1-s1
  const ctx2 = createMockDoState();
  const roomHsk2 = new workerRoom.HskRoom(ctx2);
  const wsC = createMockSocket();
  ctx2.acceptWebSocket(wsC);
  await roomHsk2.webSocketMessage(
    wsC,
    JSON.stringify({
      type: 'join',
      sessionId: 'sess-c',
      name: 'Lê Văn C',
      mssv: '20226003',
    }),
  );
  wsC.sent.length = 0;
  await roomHsk2.webSocketMessage(
    wsC,
    JSON.stringify({
      type: 'study:claim-seat',
      seatId: 'tqb-1f-t1-s1',
      requestId: 'req-c-hsk2',
    }),
  );
  const claimedInHsk2 = wsC.sent.find((m) => m.type === 'study:seat-claimed');
  assert.ok(claimedInHsk2, 'Client C in hsk-2 must be able to claim tqb-1f-t1-s1 independently');
  assert.equal(claimedInHsk2.occupancy.occupantId, 'sess-c');
});

test('(7) PR9 Review Fix 4 — HskRoom enforces 1-socket-to-1-sessionId invariant and prevents orphaned sessions/seats', async () => {
  const ctx = createMockDoState();
  const room = new workerRoom.HskRoom(ctx);

  const ws1 = createMockSocket();
  const wsObserver = createMockSocket();
  ctx.acceptWebSocket(ws1);
  ctx.acceptWebSocket(wsObserver);

  // 1. Socket ws1 joins session A and claims seat tqb-1f-t1-s1
  await room.webSocketMessage(
    ws1,
    JSON.stringify({
      type: 'join',
      sessionId: 'sess-alpha',
      name: 'Sinh viên Alpha',
      mssv: '20226001',
    }),
  );
  await room.webSocketMessage(
    ws1,
    JSON.stringify({
      type: 'study:claim-seat',
      seatId: 'tqb-1f-t1-s1',
      subjectTag: 'Giải tích 1',
      requestId: 'req-alpha-seat',
    }),
  );
  assert.ok(
    ws1.sent.some(
      (m) => m.type === 'study:seat-claimed' && m.occupancy?.occupantId === 'sess-alpha',
    ),
  );

  // Repeating join with the SAME sessionId on the same socket is idempotent
  ws1.sent.length = 0;
  await room.webSocketMessage(
    ws1,
    JSON.stringify({
      type: 'join',
      sessionId: 'sess-alpha',
      name: 'Sinh viên Alpha Updated',
      mssv: '20226001',
    }),
  );
  const welcomeSame = ws1.sent.find((m) => m.type === 'welcome');
  assert.ok(welcomeSame, 'Same sessionId re-join on same socket is idempotent');
  assert.equal(welcomeSame.count, 1);

  // 2. Same socket ws1 attempts to join session B ('sess-beta') -> rejected!
  ws1.sent.length = 0;
  await room.webSocketMessage(
    ws1,
    JSON.stringify({
      type: 'join',
      sessionId: 'sess-beta',
      name: 'Attacker Beta',
      mssv: '20226999',
    }),
  );
  const errSwitch = ws1.sent.find((m) => m.type === 'error');
  assert.ok(errSwitch, 'Attempting to switch sessionId on a bound socket must return error');
  assert.match(errSwitch.message, /already bound to a different sessionId/i);

  // Verify 'sess-beta' was never created and room count is still 1
  const countBeforeClose = await (
    await room.fetch(new Request('https://internal/__count'))
  ).json();
  assert.equal(countBeforeClose.count, 1);

  // 3. Legitimate reconnect: new socket ws1Reconnect joins with 'sess-alpha' -> replaces ws1
  const ws1Reconnect = createMockSocket();
  ctx.acceptWebSocket(ws1Reconnect);
  await room.webSocketMessage(
    ws1Reconnect,
    JSON.stringify({
      type: 'join',
      sessionId: 'sess-alpha',
      name: 'Sinh viên Alpha',
      mssv: '20226001',
    }),
  );
  assert.equal(ws1.closed.length, 1, 'Old socket ws1 must be closed upon reconnect');

  // Closing the old replaced socket ws1 must NOT release 'sess-alpha' or its seat
  await room.webSocketClose(ws1);
  const countAfterOldClose = await (
    await room.fetch(new Request('https://internal/__count'))
  ).json();
  assert.equal(
    countAfterOldClose.count,
    1,
    'Closing replaced socket must not drop active reconnected session',
  );

  // Observer joins to watch final disconnect cleanup
  await room.webSocketMessage(
    wsObserver,
    JSON.stringify({
      type: 'join',
      sessionId: 'sess-observer',
      name: 'Quan sát viên',
      mssv: '20226002',
    }),
  );
  const obsSnap = wsObserver.sent.find((m) => m.type === 'study:room-snapshot');
  assert.equal(obsSnap.seats.length, 1);
  assert.equal(obsSnap.seats[0].occupantId, 'sess-alpha');

  // 4. Close ws1Reconnect -> session A and seat tqb-1f-t1-s1 are released; observer sees count=1 and seat released
  wsObserver.sent.length = 0;
  ws1Reconnect.close(1000, 'Done');
  await room.webSocketClose(ws1Reconnect);
  assert.ok(
    wsObserver.sent.some(
      (m) =>
        m.type === 'study:seat-released' &&
        m.seatId === 'tqb-1f-t1-s1' &&
        m.occupantId === 'sess-alpha',
    ),
    'Closing active socket must release its seat',
  );
  assert.ok(
    wsObserver.sent.some((m) => m.type === 'leave' && m.id === 'sess-alpha'),
    'Closing active socket must broadcast leave for sess-alpha',
  );

  // Close observer -> room count is 0
  wsObserver.close(1000, 'Done');
  await room.webSocketClose(wsObserver);
  const finalCount = await (await room.fetch(new Request('https://internal/__count'))).json();
  assert.equal(finalCount.count, 0, 'Room count must be 0 after all sockets close');
});


