// ---------------------------------------------------------------------------
// test/library-elevation.test.cjs — Canonical Library Elevation, Stair
// Progression & Block Isolation unit tests (PR10A).
// ---------------------------------------------------------------------------

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

require('./register-ts.cjs');

const ROOT = path.resolve(__dirname, '..');
const {
  AVATAR,
  CURVED_STAIRS,
  createLibraryLocation,
  evaluateCurvedStairAt,
  getBlockForFloor,
  getCameraVerticalBoundsAt,
  getFloorBaseElevation,
  queryLibraryGround,
  resolveLibraryFloorTransition,
  resolveLibraryMovement,
} = require(path.join(ROOT, 'lib/campus.ts'));
const { computeLibraryElevation } = require(path.join(ROOT, 'lib/playerState.ts'));

test('PR10A Elevation (1) Block A Floors 1–5 base elevations are strictly 0, 4.5, 9.0, 13.5, 18.0 m', () => {
  const expected = {
    1: 0,
    2: 4.5,
    3: 9.0,
    4: 13.5,
    5: 18.0,
  };
  for (const [floorStr, expY] of Object.entries(expected)) {
    const floor = Number(floorStr);
    assert.equal(getBlockForFloor(floor), 'A');
    assert.equal(getFloorBaseElevation(floor), expY);
    const ground = queryLibraryGround(createLibraryLocation(floor, 16.5, 0, expY));
    assert.equal(ground.supported, true);
    assert.equal(ground.elevation, expY);
    assert.equal(ground.block, 'A');
    assert.equal(ground.floor, floor);
  }
});

test('PR10A Elevation (2) Twin curved stairs (East & West) provide continuous elevation from 0.0m (Floor 1) to 4.5m (Floor 2) with hysteresis', () => {
  assert.equal(CURVED_STAIRS.length, 2);

  for (const stair of CURVED_STAIRS) {
    let prevY = -0.01;
    // Sample 20 points along the stair arc from bottom (t=0.05) to top (t=0.95)
    for (let i = 1; i <= 19; i++) {
      const t = i / 20;
      const angle = stair.startAngle + (stair.endAngle - stair.startAngle) * t;
      const x = stair.centerX + Math.cos(angle) * stair.midRadius;
      const z = stair.centerZ + Math.sin(angle) * stair.midRadius;

      const hit = evaluateCurvedStairAt(x, z);
      assert.ok(hit !== null, `Point on ${stair.id} at t=${t} (${x.toFixed(2)}, ${z.toFixed(2)}) must be on stair`);
      assert.ok(hit.elevation > prevY, `Stair elevation must increase monotonically: ${hit.elevation} > ${prevY}`);
      prevY = hit.elevation;
    }

    // Hysteresis check around midpoint (t = 0.5 -> y = 2.25m):
    // When coming from Floor 1, recommendedFloor stays 1 until y >= 4.15m;
    // When coming from Floor 2, recommendedFloor stays 2 until y <= 0.35m.
    const midAngle = (stair.startAngle + stair.endAngle) * 0.5;
    const midX = stair.centerX + Math.cos(midAngle) * stair.midRadius;
    const midZ = stair.centerZ + Math.sin(midAngle) * stair.midRadius;

    const fromF1 = computeLibraryElevation(midX, midZ, 1, 2.1);
    assert.equal(fromF1.floor, 1, 'Hysteresis must keep active floor = 1 at midpoint when ascending from Floor 1');
    assert.ok(Math.abs(fromF1.y - 2.25) < 0.15);

    const fromF2 = computeLibraryElevation(midX, midZ, 2, 2.4);
    assert.equal(fromF2.floor, 2, 'Hysteresis must keep active floor = 2 at midpoint when descending from Floor 2');
    assert.ok(Math.abs(fromF2.y - 2.25) < 0.15);

    // Near top landing (t = 0.96 -> y ~ 4.32m), ascending from Floor 1 transitions to Floor 2
    const topAngle = stair.startAngle + (stair.endAngle - stair.startAngle) * 0.96;
    const topX = stair.centerX + Math.cos(topAngle) * stair.midRadius;
    const topZ = stair.centerZ + Math.sin(topAngle) * stair.midRadius;
    const nearTop = computeLibraryElevation(topX, topZ, 1, 4.1);
    assert.equal(nearTop.floor, 2);

    // Near bottom landing (t = 0.04 -> y ~ 0.18m), descending from Floor 2 transitions to Floor 1
    const botAngle = stair.startAngle + (stair.endAngle - stair.startAngle) * 0.04;
    const botX = stair.centerX + Math.cos(botAngle) * stair.midRadius;
    const botZ = stair.centerZ + Math.sin(botAngle) * stair.midRadius;
    const nearBot = computeLibraryElevation(botX, botZ, 2, 0.4);
    assert.equal(nearBot.floor, 1);

    // Double-height stairwell cutout check: ceiling above curved stairs is Floor 3 underside (8.64m), never Floor 1 ceiling (4.14m)
    const vBoundsF1 = getCameraVerticalBoundsAt(1, midX, midZ);
    const vBoundsF2 = getCameraVerticalBoundsAt(2, midX, midZ);
    assert.equal(vBoundsF1.ceilingId, 'f2-stairwell-ceiling');
    assert.ok(vBoundsF1.maxY >= 8.6, `Expected stairwell ceiling >= 8.6m on floor 1, got ${vBoundsF1.maxY}`);
    assert.equal(vBoundsF2.ceilingId, 'f2-stairwell-ceiling');
    assert.ok(vBoundsF2.maxY >= 8.6, `Expected stairwell ceiling >= 8.6m on floor 2, got ${vBoundsF2.maxY}`);

    // On Floor 2 (y = 4.5), walking sideways from the balcony into the middle of the stairwell cutout is blocked by the guardrail
    const balconyOutsideX = stair.centerX + Math.cos(midAngle) * (stair.outerRadius + 0.6);
    const balconyOutsideZ = stair.centerZ + Math.sin(midAngle) * (stair.outerRadius + 0.6);
    const guardrailTest = resolveLibraryMovement(
      createLibraryLocation(2, balconyOutsideX, balconyOutsideZ, 4.5),
      createLibraryLocation(2, midX, midZ, 4.5),
      AVATAR.radius,
      AVATAR.height,
    );
    assert.equal(guardrailTest.blocked, true, `Floor 2 outer stairwell guardrail must block walking into mid-stair void on ${stair.id}`);
    assert.ok(guardrailTest.collisionIds.includes(`${stair.id}-f2-guardrail`));
  }
});

test('PR10A Elevation (3) Block B (Floors 6–7) and Block D (Floor 10) use isolated local coordinate spaces and never inherit (floor - 1) * 4.5', () => {
  // Floor 6: outer hall is 0.0m, central stadium wooden platform is 0.6m
  assert.equal(getBlockForFloor(6), 'B');
  assert.equal(getFloorBaseElevation(6), 0.0);

  const f6Outer = computeLibraryElevation(0, 12.0, 6, 0);
  assert.equal(f6Outer.floor, 6);
  assert.equal(f6Outer.y, 0.0);

  const f6Platform = computeLibraryElevation(0, 0, 6, 0);
  assert.equal(f6Platform.floor, 6);
  assert.equal(f6Platform.y, 0.6);

  // Floor 7: mezzanine is 5.25m in Block B local space (never (7-1)*4.5 = 27.0m)
  assert.equal(getBlockForFloor(7), 'B');
  assert.equal(getFloorBaseElevation(7), 5.25);

  const f7Mezz = computeLibraryElevation(0, 13.2, 7, 5.25);
  assert.equal(f7Mezz.floor, 7);
  assert.equal(f7Mezz.y, 5.25);
  assert.notEqual(f7Mezz.y, (7 - 1) * 4.5);

  // Floor 10: main rooftop is 0.0m, stargazing deck around (14.8, 0.4) is 0.18m (never (10-1)*4.5 = 40.5m)
  assert.equal(getBlockForFloor(10), 'D');
  assert.equal(getFloorBaseElevation(10), 0.0);

  const f10Main = computeLibraryElevation(0, 0, 10, 0);
  assert.equal(f10Main.floor, 10);
  assert.equal(f10Main.y, 0.0);
  assert.notEqual(f10Main.y, (10 - 1) * 4.5);

  const f10Deck = computeLibraryElevation(12.5, 0.4, 10, 0);
  assert.equal(f10Deck.floor, 10);
  assert.equal(f10Deck.y, 0.18);

  // Verify resolveLibraryFloorTransition across all floors
  for (const floor of [1, 2, 3, 4, 5, 6, 7, 10]) {
    const trans = resolveLibraryFloorTransition(
      floor,
      undefined,
      undefined,
      undefined,
      undefined,
      AVATAR.radius,
      AVATAR.height,
    );
    assert.equal(trans.ok, true);
    assert.equal(trans.status, 'success');
    assert.equal(trans.usedFallbackSpawn, false);
    assert.equal(trans.location.floor, floor);
    assert.equal(trans.location.block, getBlockForFloor(floor));
    if (floor === 7) assert.equal(trans.location.y, 5.25);
    if (floor === 10) assert.ok(trans.location.y === 0 || trans.location.y === 0.18);
  }
});

test('PR10A Elevation (4) Floor transition safety — status success/corrected/failed & invalid floors never teleport to Floor 1', () => {
  const prevOnFloor4 = createLibraryLocation(4, -5.0, -20.0, 13.5);

  // 1. Invalid floor numbers (0, 8, 9, 99, -1, NaN, null, undefined) return status: "failed" and preserve previousLocation
  for (const invalidFloor of [0, 8, 9, 99, -1, 2.5, NaN, null, undefined, 'invalid']) {
    const res = resolveLibraryFloorTransition(
      invalidFloor,
      undefined,
      undefined,
      undefined,
      undefined,
      AVATAR.radius,
      AVATAR.height,
      prevOnFloor4,
    );
    assert.equal(res.ok, false, `Invalid floor ${String(invalidFloor)} must fail`);
    assert.equal(res.status, 'failed');
    assert.equal(res.reason, 'invalid-floor');
    assert.equal(res.usedFallbackSpawn, false);
    assert.deepEqual(
      res.location,
      prevOnFloor4,
      `Invalid floor ${String(invalidFloor)} must preserve previous location on Floor 4 instead of teleporting to Floor 1`,
    );
  }

  // 2. Custom coordinates inside an obstacle or atrium void fall back to safe spawn with status: "corrected"
  const intoStatueOnF1 = resolveLibraryFloorTransition(
    1,
    0,
    -2.1, // Inside TQB Statue collider
    undefined,
    undefined,
    AVATAR.radius,
    AVATAR.height,
    prevOnFloor4,
  );
  assert.equal(intoStatueOnF1.ok, true);
  assert.equal(intoStatueOnF1.status, 'corrected');
  assert.equal(intoStatueOnF1.usedFallbackSpawn, true);
  assert.equal(intoStatueOnF1.location.floor, 1);

  const intoAtriumVoidOnF3 = resolveLibraryFloorTransition(
    3,
    0,
    0, // Inside Floor 3 stadium atrium void
    undefined,
    undefined,
    AVATAR.radius,
    AVATAR.height,
    prevOnFloor4,
  );
  assert.equal(intoAtriumVoidOnF3.ok, true);
  assert.equal(intoAtriumVoidOnF3.status, 'corrected');
  assert.equal(intoAtriumVoidOnF3.usedFallbackSpawn, true);
  assert.equal(intoAtriumVoidOnF3.location.floor, 3);
  assert.equal(intoAtriumVoidOnF3.location.x, 0);
  assert.equal(intoAtriumVoidOnF3.location.z, -10.8);

  // 3. Valid custom coordinates on a walkable, unblocked surface return status: "success"
  const validRoom401 = resolveLibraryFloorTransition(
    4,
    0,
    -20.0,
    undefined,
    Math.PI,
    AVATAR.radius,
    AVATAR.height,
    prevOnFloor4,
  );
  assert.equal(validRoom401.ok, true);
  assert.equal(validRoom401.status, 'success');
  assert.equal(validRoom401.usedFallbackSpawn, false);
  assert.equal(validRoom401.location.floor, 4);
  assert.equal(validRoom401.location.x, 0);
  assert.equal(validRoom401.location.z, -20.0);
  assert.equal(validRoom401.location.y, 13.5);
});
