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

test('(5) resolveCollisions and resolveBikeCollisions block both pedestrians and motorbikes on tree trunks and NPCs', () => {
  const { resolveCollisions, resolveBikeCollisions, TREE_TRUNKS, NPC_CIRCLES, AVATAR, BIKE_RADIUS } =
    campusFacade;

  const treePos = TREE_TRUNKS[0];
  // Pedestrian is blocked by tree trunk (cannot walk through trees)
  const pedTree = resolveCollisions(treePos, AVATAR.radius);
  assert.equal(pedTree.hit, 'Thân cây');
  assert.ok(Math.hypot(pedTree.pos.x - treePos.x, pedTree.pos.z - treePos.z) >= 0.3 + AVATAR.radius - 1e-6);

  // Motorbike is blocked by tree trunk
  const bikeTree = resolveBikeCollisions(treePos, BIKE_RADIUS);
  assert.equal(bikeTree.hit, 'Thân cây');
  assert.ok(Math.hypot(bikeTree.pos.x - treePos.x, bikeTree.pos.z - treePos.z) >= 0.3 + BIKE_RADIUS - 1e-6);

  // Pedestrian and Motorbike are blocked by NPC Minh and ambient student NPCs
  const minhPos = NPC_CIRCLES[0].pos;
  const pedMinh = resolveCollisions(minhPos, AVATAR.radius);
  assert.equal(pedMinh.hit, 'Minh (NPC)');
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

  // Default SPAWN is at Cổng Trần Đại Nghĩa (95.5, -6)
  assert.deepEqual(SPAWN, { x: 95.5, z: -6 });
  assert.equal(nearestZone(SPAWN), 'Cổng Trần Đại Nghĩa (Cổng B8)');
  assert.equal(nearestZone({ x: -88, z: -6 }), 'Cổng Parabol');
  assert.equal(nearestZone({ x: -60, z: -17 }), 'Nhà C9'); // C9 fast-travel spot in West C-cluster, separated from Tien Lake
  assert.equal(nearestZone({ x: 76, z: 7.5 }), 'Nhà để xe D3 - D5');
  assert.equal(nearestZone({ x: -2, z: 48 }), 'Hồ Tiền');
  assert.equal(nearestZone({ x: 38, z: 32 }), 'Thư viện Tạ Quang Bửu');
  assert.equal(nearestZone({ x: 112, z: 14 }), 'Nhà B1 (Trường CNTT&TT - SoICT)');
  assert.equal(nearestZone({ x: 132, z: 78 }), 'Sân vận động Bách Khoa');

  // nearestRoadPoint projects onto straight East-West main axis z = -6
  const rp = nearestRoadPoint({ x: -70, z: -1 });
  assert.equal(rp.x, -70);
  assert.equal(rp.z, -6);

  // findFreeSpotNear returns a valid bike spot
  const freeSpot = findFreeSpotNear(SPAWN, 2, 12);
  assert.ok(freeSpot !== null);
  const check = resolveBikeCollisions(freeSpot, BIKE_RADIUS);
  assert.equal(check.hit, null);

  // getFastTravelDestination lookup
  assert.equal(getFastTravelDestination('library')?.name, 'Thư viện Tạ Quang Bửu');
  assert.equal(getFastTravelDestination('spawn')?.desc, 'Cổng Trần Đại Nghĩa');
  assert.equal(getFastTravelDestination('spawn')?.x, 95.5);
  assert.equal(getFastTravelDestination('spawn')?.z, -6);
  assert.equal(getFastTravelDestination('non-existent'), undefined);
});

test('(7) D3-D5 parking garage extended depth and D3-D5-D7 cluster next to Library do not overlap', () => {
  const { D3_D5_PARKING_GARAGE, LECTURE_BUILDINGS, LIBRARY, CAMPUS_SHADE_TREES } = campusFacade;

  // D3-D5 parking garage extends deep southward (>= 32m depth along +Z)
  assert.ok(D3_D5_PARKING_GARAGE.size.z >= 32, 'D3-D5 parking garage depth should be >= 32m');
  assert.ok(D3_D5_PARKING_GARAGE.box.maxZ >= 35, 'D3-D5 parking garage maxZ should reach >= 35');

  const d3 = LECTURE_BUILDINGS.find((b) => b.code === 'D3');
  const d5 = LECTURE_BUILDINGS.find((b) => b.code === 'D5');
  const d35 = LECTURE_BUILDINGS.find((b) => b.code === 'D3-5');
  const d7 = LECTURE_BUILDINGS.find((b) => b.code === 'D7');
  assert.ok(d3 && d5 && d35 && d7, 'D3, D5, D3-5, D7 must all be defined');

  // Cluster lies cleanly East of Library Plaza and West of D3-D5 Parking Garage
  for (const b of [d3, d5, d35, d7]) {
    assert.ok(b.box.minX > LIBRARY.plaza.maxX, `${b.code} must be East of Library Plaza`);
    assert.ok(
      b.box.maxX < D3_D5_PARKING_GARAGE.box.minX,
      `${b.code} must be West of D3-D5 Parking Garage`,
    );
  }

  // No shade tree trunk falls inside D3-D5 parking garage footprint
  for (const tree of CAMPUS_SHADE_TREES) {
    const insideGarage =
      tree.x >= D3_D5_PARKING_GARAGE.box.minX &&
      tree.x <= D3_D5_PARKING_GARAGE.box.maxX &&
      tree.z >= D3_D5_PARKING_GARAGE.box.minZ &&
      tree.z <= D3_D5_PARKING_GARAGE.box.maxZ;
    assert.equal(insideGarage, false, `Tree at (${tree.x}, ${tree.z}) must not clip D3-D5 garage`);
  }
});

test('(8) hustmap.com Source-of-Truth layout & Scope Boundary invariants', () => {
  const {
    BOUNDS,
    C15_BUILDING,
    C7_BUILDING,
    C7_DOOR,
    C1_FOUNTAIN,
    ALUMNI_HOUSE,
    VDZ_CENTER,
    EAST_CAMPUS_BLOCKS,
    SPORTS_COMPLEX,
    LECTURE_BUILDINGS,
    CAMPUS_MAP_BUILDINGS,
  } = campusFacade;

  // Demolished C8 and non-HUST H1/H3 are absent; C15, A1-5, A17, Nhà E, Nhà T are present
  assert.equal('C8_BUILDING' in campusFacade, false);
  assert.ok(C15_BUILDING.center.x > C7_BUILDING.center.x);
  assert.equal('h1' in EAST_CAMPUS_BLOCKS, false);
  assert.equal('h3' in EAST_CAMPUS_BLOCKS, false);
  assert.ok(EAST_CAMPUS_BLOCKS.a15 && EAST_CAMPUS_BLOCKS.a17 && EAST_CAMPUS_BLOCKS.nhaE && EAST_CAMPUS_BLOCKS.nhaT);

  // C7 runs North-South (size.z > size.x) with West-facing HSK entrance (C7_DOOR west of C7_BUILDING.box.minX)
  assert.ok(C7_BUILDING.size.z > C7_BUILDING.size.x);
  assert.ok(C7_DOOR.pos.x < C7_BUILDING.box.minX);
  assert.equal(C7_DOOR.pos.z, C7_BUILDING.center.z);

  // C1 Fountain centered on C1 symmetry axis (x = -58)
  assert.equal(C1_FOUNTAIN.center.x, -58);

  // D2A (west) & D2B (east) pair without erroneous third D2 block
  const d2a = LECTURE_BUILDINGS.find((b) => b.code === 'D2A');
  const d2b = LECTURE_BUILDINGS.find((b) => b.code === 'D2B');
  const d2Old = LECTURE_BUILDINGS.find((b) => b.code === 'D2');
  assert.ok(d2a && d2b && d2a.x < d2b.x);
  assert.equal(d2Old, undefined);

  // Alumni House (Digital Hub) sits East of VDZ along North bank of Tien Lake
  assert.ok(ALUMNI_HOUSE.center.x > VDZ_CENTER.center.x);

  // Sports complex aligns NE->SW along Le Thanh Nghi: Pool -> Stadium -> Nha TC, plus KTX A3 & A2
  assert.ok(SPORTS_COMPLEX.poolCenter.x > SPORTS_COMPLEX.stadiumCenter.x);
  assert.ok(SPORTS_COMPLEX.stadiumCenter.x > SPORTS_COMPLEX.nhaTcCenter.x);
  assert.ok(SPORTS_COMPLEX.ktxA3Box && SPORTS_COMPLEX.ktxA2Box);

  // Every mapped campus building stays strictly inside BOUNDS (not expanding outside HUST campus)
  for (const b of CAMPUS_MAP_BUILDINGS) {
    assert.ok(
      b.box.minX >= BOUNDS.minX &&
        b.box.maxX <= BOUNDS.maxX &&
        b.box.minZ >= BOUNDS.minZ &&
        b.box.maxZ <= BOUNDS.maxZ,
      `${b.code} (${b.label}) must stay inside HUST campus BOUNDS`,
    );
  }
});

test('(9) Complete main campus plazas, 9 parking areas & C7 ramps, C10b, C-connectors, D8 11F, and 3 North Tien Lake buildings', () => {
  const {
    BOUNDS,
    TDN_SQUARE,
    MONUMENT,
    C2_BUILDING,
    C9,
    NGA_5_PLAZA,
    VDZ_CENTER,
    HUST_DIGITAL_HUB,
    ALUMNI_HOUSE,
    C_CONNECTOR_BUILDINGS,
    LECTURE_BUILDINGS,
    CAMPUS_PARKING_LOTS,
    C7_UNDERGROUND_RAMPS,
    CAMPUS_ANNEX_BLOCKS,
    CAMPUS_AMENITIES,
    CAMPUS_MAP_PLAZAS,
    CAMPUS_MAP_BUILDINGS,
  } = campusFacade;

  // 1. Quảng trường Trần Đại Nghĩa sits cleanly West of C2 and North of C9, with Monument inside it
  assert.ok(TDN_SQUARE.maxX < C2_BUILDING.box.minX, 'TDN Square must lie West of C2');
  assert.ok(TDN_SQUARE.maxZ < C9.center.z - C9.size.z / 2, 'TDN Square must lie North of C9');
  assert.ok(
    MONUMENT.center.x > TDN_SQUARE.minX &&
      MONUMENT.center.x < TDN_SQUARE.maxX &&
      MONUMENT.center.z > TDN_SQUARE.minZ &&
      MONUMENT.center.z < TDN_SQUARE.maxZ,
    'Memorial monument must sit inside Quảng trường Trần Đại Nghĩa',
  );

  // 2. Quảng trường ngã 5 has central 5-way junction + southern island + circular planter
  assert.ok(NGA_5_PLAZA.southLawnCenter && NGA_5_PLAZA.itimsRoundPlanter);
  assert.equal(CAMPUS_MAP_PLAZAS.length, 5);
  assert.ok(CAMPUS_MAP_PLAZAS.some((p) => p.id === 'b1-forecourt'));

  // 3. North bank of Tien Lake has 3 separated buildings West -> East: VDZ (4F) -> HUST Digital Hub -> Alumni House
  assert.equal(VDZ_CENTER.floors, 4);
  assert.ok(VDZ_CENTER.center.x < HUST_DIGITAL_HUB.center.x);
  assert.ok(HUST_DIGITAL_HUB.center.x < ALUMNI_HOUSE.center.x);
  assert.ok(VDZ_CENTER.box.maxX < HUST_DIGITAL_HUB.box.minX, 'VDZ and Digital Hub must not overlap');
  assert.ok(
    HUST_DIGITAL_HUB.box.maxX < ALUMNI_HOUSE.box.minX,
    'Digital Hub and Alumni House must not overlap',
  );

  // 4. C3-4, C4-5, C5-10 connectors + C10b + 11-story D8
  assert.deepEqual(
    C_CONNECTOR_BUILDINGS.map((c) => c.code),
    ['C3-4', 'C4-5', 'C5-10'],
  );
  const c10b = LECTURE_BUILDINGS.find((b) => b.code === 'C10b');
  const d8 = LECTURE_BUILDINGS.find((b) => b.code === 'D8');
  assert.ok(c10b, 'C10b must exist East of C10');
  assert.ok(d8 && d8.h >= 28, 'D8 must represent an 11-story lecture building (h >= 28m)');

  // 5. All parking lots & C7 underground garage entry/exit ramps exist inside BOUNDS
  assert.ok(
    CAMPUS_PARKING_LOTS.c1West &&
      CAMPUS_PARKING_LOTS.c1East &&
      CAMPUS_PARKING_LOTS.c2Carport &&
      CAMPUS_PARKING_LOTS.c9Lot &&
      CAMPUS_PARKING_LOTS.c5NorthShed &&
      CAMPUS_PARKING_LOTS.c5SouthShed &&
      CAMPUS_PARKING_LOTS.d7d9Lot &&
      CAMPUS_PARKING_LOTS.d3d5Courtyard,
  );
  assert.ok(C7_UNDERGROUND_RAMPS.exitRamp && C7_UNDERGROUND_RAMPS.entryRamp);
  assert.ok(C7_UNDERGROUND_RAMPS.exitRamp.center.z < C7_UNDERGROUND_RAMPS.entryRamp.center.z);
  assert.ok(CAMPUS_ANNEX_BLOCKS.length >= 5);
  assert.ok(
    CAMPUS_AMENITIES.tdnBusStop &&
      CAMPUS_AMENITIES.tngoStation &&
      CAMPUS_AMENITIES.vmacLibrary &&
      CAMPUS_AMENITIES.vmacD4,
  );

  const parkingEntries = CAMPUS_MAP_BUILDINGS.filter((b) => b.kind === 'parking');
  assert.ok(parkingEntries.length >= 10, 'Map must expose all campus parking lots and C7 ramps');
  assert.ok(
    CAMPUS_MAP_BUILDINGS.some((b) => b.code === 'Cổng ĐCV' && b.kind === 'gate'),
    'Cổng Đại Cồ Việt must appear on CAMPUS_MAP_BUILDINGS',
  );
  for (const plaza of CAMPUS_MAP_PLAZAS) {
    assert.ok(
      plaza.box.minX >= BOUNDS.minX &&
        plaza.box.maxX <= BOUNDS.maxX &&
        plaza.box.minZ >= BOUNDS.minZ &&
        plaza.box.maxZ <= BOUNDS.maxZ,
      `Plaza ${plaza.id} must stay inside BOUNDS`,
    );
  }
});

test('(10) yeucau4 — Divided 2-branch Trần Đại Nghĩa boulevard, merge junction, Trường Vật liệu (SMSE), C7 & D3-D5-D7-D9 alignment', () => {
  const {
    TDN_DIVIDED_MEDIAN,
    TDN_MEDIAN_TREES,
    SCHOOL_OF_MATERIALS,
    C7_BUILDING,
    LECTURE_BUILDINGS,
    LIBRARY,
    ALUMNI_HOUSE,
    ROADS,
    CAMPUS_MAP_BUILDINGS,
    AVATAR,
    resolveCollisions,
  } = campusFacade;

  // 1. Divided median splits North inbound lane (z = -10.4) and South outbound lane (z = -1.6)
  assert.equal(TDN_DIVIDED_MEDIAN.center.z, -6.0);
  assert.equal(TDN_MEDIAN_TREES.length, 5);
  const inboundLane = ROADS.find((r) => r.name.includes('Chiều đi vào'));
  const outboundLane = ROADS.find((r) => r.name.includes('Chiều đi ra'));
  const mergedBoulevard = ROADS.find((r) => r.name.includes('Đại lộ chính sau nhập làn'));
  assert.ok(inboundLane && outboundLane && mergedBoulevard);
  assert.ok(inboundLane.points[0].z < TDN_DIVIDED_MEDIAN.box.minZ, 'Inbound lane must run North of median');
  assert.ok(outboundLane.points[2].z > TDN_DIVIDED_MEDIAN.box.maxZ, 'Outbound lane must run South of median');
  assert.ok(mergedBoulevard.width >= 8.0, 'Merged boulevard must be wider than each one-way branch');

  // 2. Both lanes are completely collision-free for walking/riding and merge right where C7 & D3 end
  const d3 = LECTURE_BUILDINGS.find((b) => b.code === 'D3');
  const d9 = LECTURE_BUILDINGS.find((b) => b.code === 'D9');
  assert.ok(d3 && d9);
  assert.equal(C7_BUILDING.box.minX, d3.box.minX, 'C7 and D3 West edges must terminate aligned at the merge');
  assert.equal(resolveCollisions({ x: 75, z: -10.4 }, AVATAR.radius).hit, null);
  assert.equal(resolveCollisions({ x: 75, z: -1.6 }, AVATAR.radius).hit, null);
  assert.equal(resolveCollisions({ x: 56.2, z: -6.0 }, AVATAR.radius).hit, null);

  // 3. Turning right (-Z) at x = 56.2 passes cleanly between Trường Vật liệu (West) and Tòa C7 (East)
  assert.ok(SCHOOL_OF_MATERIALS.box.maxX < 56.2 && 56.2 < C7_BUILDING.box.minX);
  assert.equal(resolveCollisions({ x: 56.2, z: -22.0 }, AVATAR.radius).hit, null);
  assert.ok(CAMPUS_MAP_BUILDINGS.some((b) => b.code === 'SMSE'));

  // 4. Turning left (+Z) at x = 56.2 passes cleanly between Library/D9 (West) and D3/D5/D7 (East)
  assert.ok(LIBRARY.plaza.maxX < 56.2 && 56.2 < d3.box.minX);
  assert.ok(d9.box.maxX < 56.2);
  assert.equal(resolveCollisions({ x: 56.2, z: 25.0 }, AVATAR.radius).hit, null);
  assert.equal(resolveCollisions({ x: 56.2, z: 60.5 }, AVATAR.radius).hit, null);

  // 5. Alumni House faces the merged boulevard North of Tien Lake
  assert.ok(ALUMNI_HOUSE.floors === 2 && ALUMNI_HOUSE.size.x > 9.5);
});

test('(11) yeucau5 — Widened C1 Plaza & enlarged Bách Khoa Fountain invariants', () => {
  const { C1, C1_FOUNTAIN, I_LOVE_BK, WHITE_ROCK, AVATAR, resolveCollisions } = campusFacade;

  // C1 Plaza is widened (>= 51m wide and >= 25m deep)
  const plazaW = C1.plaza.maxX - C1.plaza.minX;
  const plazaD = C1.plaza.maxZ - C1.plaza.minZ;
  assert.ok(plazaW >= 51.0, `Expected C1.plaza width >= 51m, got ${plazaW}`);
  assert.ok(plazaD >= 25.0, `Expected C1.plaza depth >= 25m, got ${plazaD}`);

  // C1 Fountain is enlarged (>= 9.0m × 5.2m) and centered on C1 symmetry axis x = -58
  const fountainW = C1_FOUNTAIN.box.maxX - C1_FOUNTAIN.box.minX;
  const fountainD = C1_FOUNTAIN.box.maxZ - C1_FOUNTAIN.box.minZ;
  assert.equal(C1_FOUNTAIN.center.x, -58);
  assert.ok(fountainW >= 9.0, `Expected C1_FOUNTAIN width >= 9.0m, got ${fountainW}`);
  assert.ok(fountainD >= 5.2, `Expected C1_FOUNTAIN depth >= 5.2m, got ${fountainD}`);
  assert.ok(C1_FOUNTAIN.box.minZ > I_LOVE_BK.plinth.maxZ + 3.0);
  assert.ok(C1_FOUNTAIN.box.maxZ < WHITE_ROCK.box.minZ - 3.0);

  // Wide open pedestrian corridors around the fountain are completely collision-free
  assert.equal(resolveCollisions({ x: -65.5, z: -31.0 }, AVATAR.radius).hit, null);
  assert.equal(resolveCollisions({ x: -50.5, z: -31.0 }, AVATAR.radius).hit, null);
  assert.equal(resolveCollisions({ x: -58.0, z: -36.4 }, AVATAR.radius).hit, null);
});
