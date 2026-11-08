// ---------------------------------------------------------------------------
// test/world-data.test.cjs — Unit tests cho `features/campus/world-data/*`
// và compatibility facade `lib/campus.ts` (PR3).
// ---------------------------------------------------------------------------

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

require('./register-ts.cjs');

const ROOT = path.resolve(__dirname, '..');
const campusFacade = require(path.join(ROOT, 'lib/campus.ts'));
const worldDataIndex = require(path.join(ROOT, 'features/campus/world-data/index.ts'));
const boundsMod = require(path.join(ROOT, 'features/campus/world-data/bounds.ts'));
const buildingsMod = require(path.join(ROOT, 'features/campus/world-data/buildings.ts'));
const roadsMod = require(path.join(ROOT, 'features/campus/world-data/roads.ts'));
const collidersMod = require(path.join(ROOT, 'features/campus/world-data/colliders.ts'));
const zonesMod = require(path.join(ROOT, 'features/campus/world-data/zones.ts'));
const navigationMod = require(path.join(ROOT, 'features/campus/world-data/navigation.ts'));
const spatialMod = require(path.join(ROOT, 'features/campus/world-data/spatial-utils.ts'));

test('(1) Compatibility facade lib/campus.ts re-exports 100% of features/campus/world-data', () => {
  const indexKeys = Object.keys(worldDataIndex).sort();
  const facadeKeys = Object.keys(campusFacade).sort();
  assert.deepEqual(facadeKeys, indexKeys);
  for (const key of indexKeys) {
    assert.strictEqual(campusFacade[key], worldDataIndex[key], `Mismatch on export ${key}`);
  }
  // Spot-check key domain exports from submodules
  assert.strictEqual(boundsMod.BOUNDS, campusFacade.BOUNDS);
  assert.strictEqual(buildingsMod.LIBRARY, campusFacade.LIBRARY);
  assert.strictEqual(roadsMod.ROADS, campusFacade.ROADS);
  assert.strictEqual(collidersMod.BUILDING_COLLIDERS, campusFacade.BUILDING_COLLIDERS);
  assert.strictEqual(zonesMod.ZONES, campusFacade.ZONES);
  assert.strictEqual(navigationMod.FAST_TRAVEL_DESTINATIONS, campusFacade.FAST_TRAVEL_DESTINATIONS);
  assert.strictEqual(spatialMod.resolveCollisions, campusFacade.resolveCollisions);
});

test('(2) pointInLake accurately checks rectangular Tien Lake with margin', () => {
  const { pointInLake, LAKE } = campusFacade;
  // Center of Tien Lake (-2, 40)
  assert.equal(pointInLake({ x: -2, z: 40 }), true);
  // East walkway (24, 40) is outside lake (east edge is -2 + 22.5 = 20.5)
  assert.equal(pointInLake({ x: 24, z: 40 }), false);
  // Just inside east edge at x = 20.3: inside when margin = 0, outside when margin = 0.4
  assert.equal(pointInLake({ x: 20.3, z: 40 }, 0), true);
  assert.equal(pointInLake({ x: 20.3, z: 40 }, 0.4), false);
  assert.equal(LAKE.halfW, 22.5);
  assert.equal(LAKE.halfL, 44);
});

test('(3) resolveCollisions preserves all Fast Travel spots, building colliders, and lake push-out', () => {
  const { resolveCollisions, FAST_TRAVEL_DESTINATIONS, AVATAR, BOUNDS } = campusFacade;
  // All 6 fast travel destinations settle within < 0.15m with zero drift on subsequent frames
  for (const dest of FAST_TRAVEL_DESTINATIONS) {
    const res = resolveCollisions({ x: dest.x, z: dest.z }, AVATAR.radius);
    assert.ok(
      Math.hypot(res.pos.x - dest.x, res.pos.z - dest.z) < 0.15,
      `Fast travel ${dest.id} displacement should be < 0.15m`,
    );
    const settled = resolveCollisions(res.pos, AVATAR.radius);
    assert.ok(
      Math.hypot(settled.pos.x - res.pos.x, settled.pos.z - res.pos.z) < 1e-9,
      `Fast travel ${dest.id} must have zero drift after settling`,
    );
    if (dest.id !== 'c1') {
      assert.equal(res.hit, null, `Fast travel ${dest.id} should have no hit`);
    }
  }

  // World bounds clamping
  const clamped = resolveCollisions({ x: 999, z: -999 }, AVATAR.radius);
  assert.equal(clamped.pos.x, BOUNDS.maxX);
  assert.equal(clamped.pos.z, BOUNDS.minZ);

  // Library podium push-out (standing inside north edge of podium at z=24.5 -> pushed to z=23.1)
  const libHit = resolveCollisions({ x: 38, z: 24.5 }, AVATAR.radius);
  assert.equal(libHit.hit, 'Thư viện Tạ Quang Bửu (khối đế)');
  assert.ok(Math.abs(libHit.pos.z - 23.1) < 1e-6);

  // HUST sign plinth push-out
  const hustHit = resolveCollisions({ x: 38, z: 14 }, AVATAR.radius);
  assert.equal(hustHit.hit, 'Bệ chữ HUST');
  assert.ok(Math.abs(hustHit.pos.z - 13.0) < 1e-6);

  // Tien Lake push-out
  const lakeHit = resolveCollisions({ x: -2, z: 40 }, AVATAR.radius);
  assert.equal(lakeHit.hit, 'Hồ Tiền');
  assert.equal(spatialMod.pointInLake(lakeHit.pos, AVATAR.radius), false);
});

test('(4) resolveClassroomCollisions and resolveLibraryLobbyCollisions enforce interior bounds and furniture', () => {
  const {
    CLASSROOM,
    LIBRARY_LOBBY,
    AVATAR,
    resolveClassroomCollisions,
    resolveLibraryLobbyCollisions,
  } = campusFacade;

  // Classroom aisle at (0, 1.5) is clear; spawn (0, 1) settles at z = 1.3 outside Desk 2
  const clsAisle = resolveClassroomCollisions({ x: 0, z: 1.5 }, AVATAR.radius);
  assert.equal(clsAisle.hit, null);
  const clsSpawn = resolveClassroomCollisions(CLASSROOM.spawn, AVATAR.radius);
  const clsSettled = resolveClassroomCollisions(clsSpawn.pos, AVATAR.radius);
  assert.equal(clsSettled.hit, null);

  // Classroom desk 1 collision
  const deskHit = resolveClassroomCollisions({ x: -2.2, z: 0.6 }, AVATAR.radius);
  assert.equal(deskHit.hit, 'Bàn học 1');

  // Library Lobby spawn is clear
  const lobbySpawn = resolveLibraryLobbyCollisions(LIBRARY_LOBBY.spawn, AVATAR.radius);
  assert.equal(lobbySpawn.hit, null);

  // Statue collision in Library Lobby
  const statueHit = resolveLibraryLobbyCollisions(LIBRARY_LOBBY.statue, AVATAR.radius);
  assert.equal(statueHit.hit, 'Tượng GS. Tạ Quang Bửu');
});

test('(5) resolveBikeCollisions blocks motorbike on tree trunks and NPC Minh while pedestrians pass trees', () => {
  const { resolveCollisions, resolveBikeCollisions, TREE_TRUNKS, NPC_CIRCLES, AVATAR, BIKE_RADIUS } =
    campusFacade;

  const treePos = TREE_TRUNKS[0];
  // Pedestrian is not blocked by tree trunk
  const pedTree = resolveCollisions(treePos, AVATAR.radius);
  assert.equal(pedTree.hit, null);

  // Motorbike is blocked by tree trunk
  const bikeTree = resolveBikeCollisions(treePos, BIKE_RADIUS);
  assert.equal(bikeTree.hit, 'Thân cây');
  assert.ok(Math.hypot(bikeTree.pos.x - treePos.x, bikeTree.pos.z - treePos.z) >= 0.3 + BIKE_RADIUS - 1e-6);

  // Motorbike is blocked by NPC Minh
  const minhPos = NPC_CIRCLES[0].pos;
  const bikeMinh = resolveBikeCollisions(minhPos, BIKE_RADIUS);
  assert.equal(bikeMinh.hit, 'Minh (NPC)');
});

test('(6) nearestZone, nearestRoadPoint, findFreeSpotNear, and getFastTravelDestination', () => {
  const {
    nearestZone,
    nearestRoadPoint,
    findFreeSpotNear,
    getFastTravelDestination,
    resolveBikeCollisions,
    BIKE_RADIUS,
    SPAWN,
  } = campusFacade;

  // Default SPAWN is at Cổng Trần Đại Nghĩa (90, -6)
  assert.deepEqual(SPAWN, { x: 90, z: -6 });
  assert.equal(nearestZone(SPAWN), 'Cổng Trần Đại Nghĩa (Cổng B8)');
  assert.equal(nearestZone({ x: -88, z: 10 }), 'Cổng Parabol');
  assert.equal(nearestZone({ x: -29, z: -2 }), 'Nhà C9'); // C9 fast-travel spot must not be swallowed by Tien Lake
  assert.equal(nearestZone({ x: -2, z: 40 }), 'Hồ Tiền');
  assert.equal(nearestZone({ x: 38, z: 32 }), 'Thư viện Tạ Quang Bửu');
  assert.equal(nearestZone({ x: 112, z: 14 }), 'Nhà B1 (Viện CNTT&TT - SoICT)');
  assert.equal(nearestZone({ x: 132, z: 78 }), 'Sân vận động Bách Khoa');

  // nearestRoadPoint projects onto ROADS
  const rp = nearestRoadPoint({ x: -70, z: 15 });
  assert.equal(rp.x, -70);
  assert.equal(rp.z, 10);

  // findFreeSpotNear returns a valid bike spot
  const freeSpot = findFreeSpotNear(SPAWN, 2, 12);
  assert.ok(freeSpot !== null);
  const check = resolveBikeCollisions(freeSpot, BIKE_RADIUS);
  assert.equal(check.hit, null);

  // getFastTravelDestination lookup
  assert.equal(getFastTravelDestination('library')?.name, 'Thư viện Tạ Quang Bửu');
  assert.equal(getFastTravelDestination('spawn')?.desc, 'Cổng Trần Đại Nghĩa');
  assert.equal(getFastTravelDestination('spawn')?.x, 90);
  assert.equal(getFastTravelDestination('spawn')?.z, -6);
  assert.equal(getFastTravelDestination('non-existent'), undefined);
});
