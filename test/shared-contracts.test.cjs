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
