// ---------------------------------------------------------------------------
// test/library-spatial.test.cjs — Canonical Library Spatial Model & Collision
// Engine unit tests (PR10A).
// ---------------------------------------------------------------------------

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

require('./register-ts.cjs');

const ROOT = path.resolve(__dirname, '..');
const { STUDY_SEATS } = require(path.join(ROOT, 'shared/contracts/study.ts'));
const {
  AVATAR,
  BLOCK_B_DIMS,
  BLOCK_D_DIMS,
  LIBRARY_FLOORS,
  LIBRARY_FLOOR_SPAWNS,
  LIBRARY_LOBBY,
  LIBRARY_NAV_PRESETS,
  LIBRARY_PRESET_DESTINATIONS,
  PROP_DIMENSIONS,
  ROOM_401_DIMS,
  colliderFromFurniturePlacement,
  computeRotatedBoxBounds,
  createLibraryLocation,
  createLibraryNavigationController,
  getBlockAFurniturePlacements,
  getBlockForFloor,
  getCameraVerticalBoundsAt,
  getCollidersForFloor,
  getWalkableSurfacesForFloor,
  resolveLibraryCameraOcclusion,
  resolveLibraryMovement,
  resolveLibraryLobbyCollisions,
  stepLibraryCameraDistance,
} = require(path.join(ROOT, 'lib/campus.ts'));

test('PR10A Spatial (1) All canonical library floors have valid walkable surfaces, colliders, and collision-free grounded spawns & presets', () => {
  for (const floor of LIBRARY_FLOORS) {
    const surfaces = getWalkableSurfacesForFloor(floor);
    const colliders = getCollidersForFloor(floor);
    assert.ok(surfaces.length >= 1, `Floor ${floor} must have at least 1 walkable surface`);
    assert.ok(colliders.length >= 1, `Floor ${floor} must have interior/perimeter colliders`);

    const spawn = LIBRARY_FLOOR_SPAWNS[floor];
    assert.ok(spawn, `Missing spawn for floor ${floor}`);
    assert.equal(spawn.floor, floor);
    assert.equal(spawn.block, getBlockForFloor(floor));

    const loc = createLibraryLocation(floor, spawn.x, spawn.z, spawn.y);
    const res = resolveLibraryMovement(loc, loc, AVATAR.radius, AVATAR.height);
    assert.equal(
      res.blocked,
      false,
      `Spawn ${spawn.id} on floor ${floor} at (${spawn.x}, ${spawn.z}) is blocked by ${res.collisionIds.join(', ')}`,
    );
    assert.equal(res.grounded, true, `Spawn ${spawn.id} on floor ${floor} must be grounded`);
  }

  for (const preset of LIBRARY_NAV_PRESETS) {
    const loc = createLibraryLocation(preset.floor, preset.x, preset.z, preset.y);
    const res = resolveLibraryMovement(loc, loc, AVATAR.radius, AVATAR.height);
    assert.equal(
      res.blocked,
      false,
      `Preset ${preset.id} on floor ${preset.floor} at (${preset.x}, ${preset.z}) is blocked by ${res.collisionIds.join(', ')}`,
    );
    assert.equal(res.grounded, true, `Preset ${preset.id} on floor ${preset.floor} must be grounded`);
  }
});

test('PR10A Spatial (2) Floor 1 — outer boundaries, Book-Lending Room doorway vs wall, reception desk, statue, columns, PR8 tables/chairs & wall sliding', () => {
  // 1. Central atrium spawn is clear
  const start = createLibraryLocation(1, 0, 4.0, 0);
  const clearMove = resolveLibraryMovement(start, createLibraryLocation(1, 0, 3.2, 0), AVATAR.radius, AVATAR.height);
  assert.equal(clearMove.blocked, false);
  assert.equal(clearMove.grounded, true);

  // 2. Book-Lending Room (P.102) entry through West doorway (x = -19.5, z = -0.1, clear North of service counter)
  const beforeDoor = createLibraryLocation(1, -18.6, -0.1, 0);
  const throughDoor = createLibraryLocation(1, -20.6, -0.1, 0);
  const doorPass = resolveLibraryMovement(beforeDoor, throughDoor, AVATAR.radius, AVATAR.height);
  assert.equal(doorPass.blocked, false, `Doorway at (-19.5, -0.1) should allow entry, got ${doorPass.collisionIds}`);
  assert.ok(doorPass.position.x < -20.2, 'Player should pass into Book-Lending Room');
  assert.equal(doorPass.surfaceId, 'f1-borrow-room');

  // Walking inside Book-Lending Room along the aisle (x = -21.8, z = 1.5)
  const insideBrm = resolveLibraryMovement(
    doorPass.position,
    createLibraryLocation(1, -21.8, 1.5, 0),
    AVATAR.radius,
    AVATAR.height,
  );
  assert.equal(insideBrm.blocked, false);

  // Book-Lending Room West wall away from doorway (x = -19.5, z = -4.0) blocks movement
  const wallStart = createLibraryLocation(1, -18.5, -4.0, 0);
  const wallAttempt = createLibraryLocation(1, -21.0, -4.0, 0);
  const wallHit = resolveLibraryMovement(wallStart, wallAttempt, AVATAR.radius, AVATAR.height);
  assert.equal(wallHit.blocked, true);
  assert.ok(wallHit.position.x > -19.5, 'Solid West wall must block crossing into P.102 away from doorway');

  // 3. TQB Statue, South Reception Desk, Atrium Column, and PR8 Table/Chair colliders
  const statueHit = resolveLibraryLobbyCollisions({ x: 0, z: -2.1 }, AVATAR.radius, 1);
  assert.equal(statueHit.hit, 'Tượng GS. Tạ Quang Bửu');

  const receptionHit = resolveLibraryLobbyCollisions({ x: 0, z: 9.4 }, AVATAR.radius, 1);
  assert.equal(receptionHit.hit, 'Quầy lễ tân chính Tầng 1');

  const colHit = resolveLibraryLobbyCollisions({ x: -13.85, z: 0 }, AVATAR.radius, 1);
  assert.equal(colHit.hit, 'Cột thông tầng Sảnh T1');

  const tableHit1 = resolveLibraryLobbyCollisions({ x: -2.15, z: 1.75 }, AVATAR.radius, 1);
  assert.equal(tableHit1.hit, 'Bàn đọc Tây 1');
  const tableHit2 = resolveLibraryLobbyCollisions({ x: 2.15, z: 1.75 }, AVATAR.radius, 1);
  assert.equal(tableHit2.hit, 'Bàn đọc Đông 2');

  // All 6 P.102 bookshelves (4 East-facing at x=-23.95 + 2 West-wall rotated at x=-25.45) block movement
  const f1Shelves = getBlockAFurniturePlacements(1).filter((p) => p.prop === 'shelf');
  assert.equal(f1Shelves.length, 6, 'P.102 must have 6 canonical bookshelf placements');
  for (const shelf of f1Shelves) {
    const shelfHit = resolveLibraryLobbyCollisions({ x: shelf.x, z: shelf.z }, AVATAR.radius, 1);
    assert.ok(
      shelfHit.hit && shelfHit.hit.includes('P.102'),
      `Shelf ${shelf.id} at (${shelf.x}, ${shelf.z}) must block movement, got ${shelfHit.hit}`,
    );
  }

  // 4. Diagonal wall sliding along East wall (x = 19.5) preserves Z progress without NaN
  const slideStart = createLibraryLocation(1, 18.8, 0.0, 0);
  const slideDesired = createLibraryLocation(1, 20.5, 2.0, 0);
  const slideRes = resolveLibraryMovement(slideStart, slideDesired, AVATAR.radius, AVATAR.height);
  assert.equal(slideRes.blocked, true);
  assert.ok(Number.isFinite(slideRes.position.x) && Number.isFinite(slideRes.position.z));
  assert.ok(slideRes.position.z > 1.5, 'Diagonal movement against East wall must slide along Z');
});

test('PR10A Spatial (3) Floors 2–3 — walkable balcony, stadium atrium void protection, stair landing openings, columns & shared furniture colliders', () => {
  for (const floor of [2, 3]) {
    const baseY = (floor - 1) * 4.5;
    // Walkable east balcony aisle
    const balStart = createLibraryLocation(floor, 15.8, -1.5, baseY);
    const balEnd = createLibraryLocation(floor, 15.8, -0.5, baseY);
    const balRes = resolveLibraryMovement(balStart, balEnd, AVATAR.radius, AVATAR.height);
    assert.equal(balRes.blocked, false);
    assert.equal(balRes.grounded, true);

    // Every furniture category on Floors 2–3 (table4, round4, sofa, armchair, shelf) blocks movement through its center
    const placements = getBlockAFurniturePlacements(floor);
    for (const kind of ['table4', 'round4', 'sofa', 'armchair', 'shelf']) {
      const itemsOfKind = placements.filter((p) => p.prop === kind);
      assert.ok(itemsOfKind.length >= 4, `Floor ${floor} must have at least 4 placements of ${kind}`);
      for (const item of itemsOfKind) {
        const hit = resolveLibraryMovement(
          createLibraryLocation(floor, item.x, item.z, baseY),
          createLibraryLocation(floor, item.x, item.z, baseY),
          AVATAR.radius,
          AVATAR.height,
        );
        assert.equal(
          hit.blocked,
          true,
          `Floor ${floor} furniture ${item.id} (${item.prop}) at (${item.x}, ${item.z}) must block movement`,
        );
      }
    }

    // Stadium void between columns (x = 3.2, z = -9.0 -> z = -5.0) is blocked and pushed out to railing perimeter
    const voidAttempt = resolveLibraryMovement(
      createLibraryLocation(floor, 3.2, -9.0, baseY),
      createLibraryLocation(floor, 3.2, -5.0, baseY),
      AVATAR.radius,
      AVATAR.height,
    );
    assert.equal(voidAttempt.blocked, true);
    assert.ok(
      voidAttempt.collisionIds.some((id) => id.includes('atrium-void')),
      `Expected atrium-void collision on floor ${floor}, got ${voidAttempt.collisionIds}`,
    );
    assert.ok(Math.abs(voidAttempt.position.z) >= 7.8, 'Player must not enter stadium atrium void');
  }

  // On Floor 2, the East stair top landing opening (around x = 14.9, z = 2.6, angle ~ +0.32 rad) allows stepping onto the curved stair
  const f2Landing = createLibraryLocation(2, 15.8, 2.7, 4.5);
  const f2OnStair = createLibraryLocation(2, 14.5, 2.4, 4.5);
  const f2StairStep = resolveLibraryMovement(f2Landing, f2OnStair, AVATAR.radius, AVATAR.height);
  assert.equal(f2StairStep.grounded, true);
  assert.ok(f2StairStep.position.y < 4.5 && f2StairStep.position.y > 3.5, 'Stepping onto East stair landing lowers Y smoothly');
});

test('PR10A Spatial (4) Floors 4–5 — Room 401/501 & secondary reading rooms doorway entry, wall blocking, interior furniture & swept anti-tunneling', () => {
  for (const floor of [4, 5]) {
    const baseY = (floor - 1) * 4.5;
    const roomLabel = floor === 4 ? '401' : '501';

    // 1. Entry into Room 401/501 through doorway at x = -10.8, z = -13.0
    const southOfDoor = createLibraryLocation(floor, -10.8, -12.1, baseY);
    const northOfDoor = createLibraryLocation(floor, -10.8, -14.2, baseY);
    const doorEntry = resolveLibraryMovement(southOfDoor, northOfDoor, AVATAR.radius, AVATAR.height);
    assert.equal(
      doorEntry.blocked,
      false,
      `Doorway into Room ${roomLabel} at (-10.8, -13.0) must be clear, got ${doorEntry.collisionIds}`,
    );
    assert.ok(doorEntry.position.z < -13.8);
    assert.equal(doorEntry.surfaceId, `f${floor}-room-${roomLabel}`);

    // 2. Room 401/501 South partition wall at z = -13.0 away from doorway (e.g. x = 0) blocks passage
    const wallSouth = createLibraryLocation(floor, 0, -12.1, baseY);
    const wallNorth = createLibraryLocation(floor, 0, -14.5, baseY);
    const wallBlocked = resolveLibraryMovement(wallSouth, wallNorth, AVATAR.radius, AVATAR.height);
    assert.equal(wallBlocked.blocked, true);
    assert.ok(wallBlocked.position.z > -13.0, `Room ${roomLabel} South wall at x=0 must block crossing`);

    // 3. Swept anti-tunneling check: high-speed 4.5m delta across Room 401/501 South wall at x = 0 must NOT tunnel through
    const tunnelAttempt = resolveLibraryMovement(
      createLibraryLocation(floor, 0, -11.5, baseY),
      createLibraryLocation(floor, 0, -16.0, baseY),
      AVATAR.radius,
      AVATAR.height,
    );
    assert.equal(tunnelAttempt.blocked, true);
    assert.ok(tunnelAttempt.position.z > -13.0, 'Swept substeps must prevent tunneling through thin partition wall');

    // 4. Inside Room 401/501: reading table, book stack, and librarian desk colliders
    const tableX = ROOM_401_DIMS.TX[0];
    const tableZ = ROOM_401_DIMS.R4Z + ROOM_401_DIMS.TZ_LOCAL[0];
    const tableHit = resolveLibraryLobbyCollisions({ x: tableX, z: tableZ }, AVATAR.radius, floor);
    assert.ok(tableHit.hit && tableHit.hit.includes(`P.${roomLabel}`), `Expected Room ${roomLabel} table hit, got ${tableHit.hit}`);

    const stackX = ROOM_401_DIMS.STACK_X[0];
    const stackZ = ROOM_401_DIMS.R4Z + ROOM_401_DIMS.STACK_Z_LOCAL;
    const stackHit = resolveLibraryLobbyCollisions({ x: stackX, z: stackZ }, AVATAR.radius, floor);
    assert.ok(stackHit.hit && stackHit.hit.includes('Giá sách'), `Expected book stack hit in P.${roomLabel}, got ${stackHit.hit}`);

    // 5. East reading room (419 / 526) doorway passage at x = 19.5, z = -9.0 vs solid wall at z = 0
    const eastDoorPass = resolveLibraryMovement(
      createLibraryLocation(floor, 18.6, -9.0, baseY),
      createLibraryLocation(floor, 20.6, -9.0, baseY),
      AVATAR.radius,
      AVATAR.height,
    );
    assert.equal(eastDoorPass.blocked, false, `East wing doorway at (19.5, -9.0) on floor ${floor} should allow passage`);

    const eastWallBlock = resolveLibraryMovement(
      createLibraryLocation(floor, 18.6, 0.0, baseY),
      createLibraryLocation(floor, 20.6, 0.0, baseY),
      AVATAR.radius,
      AVATAR.height,
    );
    assert.equal(eastWallBlock.blocked, true, `East wing wall at (19.5, 0.0) on floor ${floor} must block passage`);
  }
});

test('PR10A Spatial (5) Floors 6–7 & Floor 10 — Block B stadium hall/mezzanine & Block D rooftop boundaries and furniture', () => {
  // Floor 6: Grand Piano at (-6.6, 3.6) and Exhibition Desk at (0, -11.2) block movement
  const pianoHit = resolveLibraryLobbyCollisions(
    { x: BLOCK_B_DIMS.PIANO.x, z: BLOCK_B_DIMS.PIANO.z },
    AVATAR.radius,
    6,
  );
  assert.equal(pianoHit.hit, 'Đàn Grand Piano T6');

  const f6DeskHit = resolveLibraryLobbyCollisions(
    { x: BLOCK_B_DIMS.DESK.x, z: BLOCK_B_DIMS.DESK.z },
    AVATAR.radius,
    6,
  );
  assert.equal(f6DeskHit.hit, 'Quầy tròn Triển lãm & Cột phễu T6');

  // Floor 6 outer curved glass stadium wall clamps outside points
  const f6Outer = resolveLibraryLobbyCollisions({ x: 0, z: 25.0 }, AVATAR.radius, 6);
  assert.equal(f6Outer.hit, 'Tường kính cong Không gian Sáng tạo');
  assert.ok(f6Outer.pos.z < 16.5);

  // Floor 7 mezzanine ring: (0, 13.2) is walkable, but center (0, 0) is inside the atrium void (FR = 11.0)
  const f7Walk = createLibraryLocation(7, 0, 13.2, 5.25);
  const f7WalkRes = resolveLibraryMovement(f7Walk, createLibraryLocation(7, 1.5, 13.2, 5.25), AVATAR.radius, AVATAR.height);
  assert.equal(f7WalkRes.blocked, false);
  assert.equal(f7WalkRes.grounded, true);

  const f7Void = resolveLibraryLobbyCollisions({ x: 0, z: 5.0 }, AVATAR.radius, 7);
  assert.equal(f7Void.hit, 'Giếng trời thông tầng');
  assert.ok(Math.abs(f7Void.pos.z) >= 11.0);

  // Floor 10 rooftop: Telescope at (15.4, 0.6) and Elevator Technical Room at (0, -5.8) block movement
  const teleHit = resolveLibraryLobbyCollisions(
    { x: BLOCK_D_DIMS.TELESCOPE.x, z: BLOCK_D_DIMS.TELESCOPE.z },
    AVATAR.radius,
    10,
  );
  assert.equal(teleHit.hit, 'Kính thiên văn khúc xạ T10');

  const techRoomHit = resolveLibraryLobbyCollisions({ x: 0, z: -5.8 }, AVATAR.radius, 10);
  assert.equal(techRoomHit.hit, 'Phòng kỹ thuật thang máy T10');

  // Floor 10 rooftop perimeter railing clamps outside points
  const f10Outer = resolveLibraryLobbyCollisions({ x: 25.0, z: 0 }, AVATAR.radius, 10);
  assert.ok(f10Outer.hit !== null);
  assert.ok(f10Outer.pos.x < 22.4);
});

test('PR10A Spatial (6) Regression — Mesh & collider bounding boxes match 1:1 and navigation presets are unified', () => {
  // 1. PR8 Floor-1 study table colliders match LIBRARY_LOBBY.studyTables[].box 1:1
  const f1Colliders = getCollidersForFloor(1);
  for (const table of LIBRARY_LOBBY.studyTables) {
    const col = f1Colliders.find((c) => c.id === `study-table-${table.tableId}`);
    assert.ok(col, `Missing collider for PR8 table ${table.tableId}`);
    assert.equal(col.name, table.label);
    assert.equal(col.bounds.minX, table.box.minX);
    assert.equal(col.bounds.maxX, table.box.maxX);
    assert.equal(col.bounds.minZ, table.box.minZ);
    assert.equal(col.bounds.maxZ, table.box.maxZ);
    assert.equal(col.bounds.maxY, table.height);

    // Ensure table collider does not overlap any PR8 chair collider on that table
    for (const seat of STUDY_SEATS.filter((s) => s.tableId === table.tableId)) {
      const chairCol = f1Colliders.find((c) => c.id === `study-chair-${seat.seatId}`);
      assert.ok(chairCol, `Missing chair collider for ${seat.seatId}`);
      const overlapsZ =
        chairCol.bounds.minZ < col.bounds.maxZ && chairCol.bounds.maxZ > col.bounds.minZ;
      assert.equal(
        overlapsZ,
        false,
        `Chair collider ${chairCol.id} must not overlap table collider ${col.id} in Z`,
      );
    }
  }

  // 2. Composite Three.js geometry bounds (including chairs in table4 & round4) match PROP_DIMENSIONS & colliders
  const {
    computeCompositePropBounds,
    computePlacedPropWorldBounds,
  } = require(path.join(ROOT, 'features/campus/buildings/library/buildFloors1To5.ts'));

  for (const prop of ['table4', 'round4', 'sofa', 'armchair', 'shelf']) {
    const actualLocal = computeCompositePropBounds(prop);
    const dim = PROP_DIMENSIONS[prop];
    assert.equal(dim.minLX, actualLocal.minX, `${prop} minLX must match composite geometry minX`);
    assert.equal(dim.maxLX, actualLocal.maxX, `${prop} maxLX must match composite geometry maxX`);
    assert.equal(dim.minLZ, actualLocal.minZ, `${prop} minLZ must match composite geometry minZ`);
    assert.equal(dim.maxLZ, actualLocal.maxZ, `${prop} maxLZ must match composite geometry maxZ`);
    assert.equal(dim.height, actualLocal.maxY, `${prop} height must match composite geometry maxY`);
    if (prop === 'round4') {
      assert.equal(
        dim.radius,
        actualLocal.maxRadiusXZ,
        'round4 radius must match composite geometry outer radius including 4 chairs',
      );
    }
  }

  for (const floor of [1, 2, 3, 4, 5]) {
    const placements = getBlockAFurniturePlacements(floor);
    const colliders = getCollidersForFloor(floor);
    assert.ok(placements.length > 0, `Floor ${floor} must have shared furniture placements`);

    for (const fp of placements) {
      const col = colliders.find((c) => c.id === fp.id);
      assert.ok(col, `Missing collider for shared furniture placement ${fp.id} on floor ${floor}`);
      const expected = colliderFromFurniturePlacement(fp);
      assert.deepEqual(col.bounds, expected.bounds, `Bounds mismatch for ${fp.id} on floor ${floor}`);

      const actualWorld = computePlacedPropWorldBounds(fp);
      if (fp.prop === 'round4') {
        assert.ok(col.cylinder, `Round table ${fp.id} must have cylinder collider metadata`);
        assert.equal(col.cylinder.radius, actualWorld.maxRadiusXZ);
        assert.ok(col.bounds.minX <= actualWorld.minX + 1e-3);
        assert.ok(col.bounds.maxX >= actualWorld.maxX - 1e-3);
        assert.ok(col.bounds.minZ <= actualWorld.minZ + 1e-3);
        assert.ok(col.bounds.maxZ >= actualWorld.maxZ - 1e-3);
      } else {
        assert.ok(Math.abs(col.bounds.minX - actualWorld.minX) <= 1e-3, `${fp.id} minX mismatch: ${col.bounds.minX} vs ${actualWorld.minX}`);
        assert.ok(Math.abs(col.bounds.maxX - actualWorld.maxX) <= 1e-3, `${fp.id} maxX mismatch: ${col.bounds.maxX} vs ${actualWorld.maxX}`);
        assert.ok(Math.abs(col.bounds.minZ - actualWorld.minZ) <= 1e-3, `${fp.id} minZ mismatch: ${col.bounds.minZ} vs ${actualWorld.minZ}`);
        assert.ok(Math.abs(col.bounds.maxZ - actualWorld.maxZ) <= 1e-3, `${fp.id} maxZ mismatch: ${col.bounds.maxZ} vs ${actualWorld.maxZ}`);
      }
      assert.ok(Math.abs(col.bounds.maxY - actualWorld.maxY) <= 1e-3, `${fp.id} maxY mismatch: ${col.bounds.maxY} vs ${actualWorld.maxY}`);
    }
  }

  // Verify outer chair positions of table4 (|z_local| = 0.78m) and round4 (r = 1.02m) block movement
  const f4CorrTable = getBlockAFurniturePlacements(4).find((p) => p.prop === 'table4' && p.x === 0 && p.z === -9.6);
  assert.ok(f4CorrTable, 'Expected Floor 4 corridor table4 at (0, -9.6)');
  const chairBackrestHit = resolveLibraryMovement(
    createLibraryLocation(4, 0, -9.6 - 0.78, 13.5),
    createLibraryLocation(4, 0, -9.6 - 0.78, 13.5),
    AVATAR.radius,
    AVATAR.height,
  );
  assert.equal(chairBackrestHit.blocked, true, 'Outer chair backrest of table4 must block movement');

  const f4CorrRound = getBlockAFurniturePlacements(4).find((p) => p.prop === 'round4' && p.x === 15.8 && p.z === 0);
  assert.ok(f4CorrRound, 'Expected Floor 4 corridor round4 at (15.8, 0)');
  const roundChairHit = resolveLibraryMovement(
    createLibraryLocation(4, 15.8 + 1.02, 0, 13.5),
    createLibraryLocation(4, 15.8 + 1.02, 0, 13.5),
    AVATAR.radius,
    AVATAR.height,
  );
  assert.equal(roundChairHit.blocked, true, 'Outer chair ring of round4 must block movement');

  // 3. Navigation presets in LibraryFloorNav.tsx use the exact canonical LIBRARY_NAV_PRESETS
  const navModule = require(path.join(ROOT, 'components/ui/LibraryFloorNav.tsx'));
  assert.equal(
    navModule.LIBRARY_PRESET_DESTINATIONS,
    LIBRARY_PRESET_DESTINATIONS,
    'LibraryFloorNav.tsx must re-export canonical LIBRARY_PRESET_DESTINATIONS',
  );
  assert.equal(
    LIBRARY_PRESET_DESTINATIONS,
    LIBRARY_NAV_PRESETS,
    'LIBRARY_PRESET_DESTINATIONS and LIBRARY_NAV_PRESETS must reference the same canonical array',
  );
  for (const preset of LIBRARY_PRESET_DESTINATIONS) {
    assert.ok(preset.fullLabel && preset.fullLabel.length > 0, `Preset ${preset.id} must include fullLabel`);
  }
});

test('PR10B Navigation (7) Unified LibraryNavigationController — state machine, 11 presets, concurrency lock, input lock & seat release', () => {
  const nav = createLibraryNavigationController();
  const initialSnap = nav.getSnapshot();
  assert.equal(initialSnap.phase, 'idle');
  assert.equal(initialSnap.currentFloor, 1);
  assert.equal(initialSnap.activePresetId, 'f1-atrium');
  assert.equal(nav.getPresets().length, 11);

  const callOrder = [];
  const lockEvents = [];
  let simulatedPlayer = {
    floor: 1,
    x: 0,
    y: 0,
    z: 2.4,
    yaw: 0,
    pitch: 0.2,
    seated: true,
    seatId: 'tqb-1f-t1-s1',
  };

  nav.registerHooks({
    getPlayerContext: () => ({ ...simulatedPlayer }),
    prepareFloor: (floor) => {
      callOrder.push(`prepare:${floor}`);
      return true;
    },
    setInputLocked: (locked) => {
      lockEvents.push(locked);
    },
    executeTransition: (payload) => {
      callOrder.push(`execute:${payload.targetFloor}`);
      const wasSeated = simulatedPlayer.seated;
      simulatedPlayer = {
        floor: payload.targetFloor,
        x: payload.location.x,
        y: payload.location.y,
        z: payload.location.z,
        yaw: payload.yaw,
        pitch: payload.pitch,
        seated: false,
        seatId: null,
      };
      return { ok: true, seatReleased: wasSeated };
    },
  });

  // 1. Navigate across all 11 canonical presets and verify phaseHistory = ['preparing', 'transitioning', 'completed']
  for (const preset of LIBRARY_NAV_PRESETS) {
    callOrder.length = 0;
    lockEvents.length = 0;
    const outcome = nav.navigateToPreset(preset.id);
    assert.equal(outcome.ok, true, `Preset ${preset.id} must succeed`);
    assert.equal(outcome.phase, 'completed');
    assert.deepEqual(outcome.phaseHistory, ['preparing', 'transitioning', 'completed']);
    assert.equal(outcome.floor, preset.floor);
    assert.equal(outcome.presetId, preset.id);
    assert.deepEqual(callOrder, [`prepare:${preset.floor}`, `execute:${preset.floor}`]);
    assert.equal(lockEvents[0], true, 'Input must be locked at start of transition');
    assert.equal(lockEvents[lockEvents.length - 1], false, 'Input must be unlocked after transition');
    assert.equal(nav.isInputLocked(), false);

    const snap = nav.getSnapshot();
    assert.equal(snap.currentFloor, preset.floor);
    assert.equal(snap.activePresetId, preset.id);
    assert.equal(snap.location.floor, preset.floor);
    assert.equal(snap.location.block, getBlockForFloor(preset.floor));
    if (preset.id === LIBRARY_NAV_PRESETS[0].id) {
      assert.equal(outcome.seatReleased, true, 'First transition while seated must release seat');
      assert.equal(simulatedPlayer.seated, false);
    }
  }

  // 2. Invalid floor and unknown preset fail without mutating floor, position, camera or seating
  nav.navigateToPreset('f4-r401');
  simulatedPlayer.seated = false;
  const beforeFail = nav.getSnapshot();

  for (const badFloor of [0, 8, 9, 99, -2, null, undefined, 'invalid']) {
    const badRes = nav.navigateToFloor(badFloor);
    assert.equal(badRes.ok, false);
    assert.equal(badRes.status, 'failed');
    assert.equal(badRes.reason, 'invalid-floor');
    assert.deepEqual(badRes.phaseHistory, ['failed']);
    const afterFail = nav.getSnapshot();
    assert.equal(afterFail.currentFloor, beforeFail.currentFloor);
    assert.equal(afterFail.activePresetId, beforeFail.activePresetId);
    assert.deepEqual(afterFail.location, beforeFail.location);
    assert.equal(afterFail.yaw, beforeFail.yaw);
    assert.equal(afterFail.pitch, beforeFail.pitch);
  }

  const unknownPresetRes = nav.navigateToPreset('non-existent-preset');
  assert.equal(unknownPresetRes.ok, false);
  assert.equal(unknownPresetRes.reason, 'preset-not-found');
  assert.equal(nav.getSnapshot().currentFloor, 4);
  assert.equal(nav.getSnapshot().activePresetId, 'f4-r401');

  // 3. Double-click / re-entrant concurrent transition during 'preparing' is rejected with 'transition-in-progress'
  let nestedOutcome = null;
  const unsubReentry = nav.registerHooks({
    prepareFloor: () => {
      nestedOutcome = nav.navigateToPreset('f10-rooftop');
      return true;
    },
  });
  const primaryOutcome = nav.navigateToPreset('f6-lounge');
  unsubReentry();
  assert.equal(primaryOutcome.ok, true);
  assert.equal(primaryOutcome.floor, 6);
  assert.ok(nestedOutcome !== null);
  assert.equal(nestedOutcome.ok, false);
  assert.equal(nestedOutcome.reason, 'transition-in-progress');
  assert.equal(nav.getSnapshot().currentFloor, 6);
  assert.equal(nav.getSnapshot().activePresetId, 'f6-lounge');
});

test('PR10B Camera (8) Collision-aware third-person indoor camera prevents wall, ceiling, column & tall furniture clipping', () => {
  // 1. Room 401 South partition wall at z = -13.0 blocks camera ray when player at (-5, 13.5, -14.2) looks North (camera behind player toward z = -11.0)
  const r401WallOcc = resolveLibraryCameraOcclusion({
    floor: 4,
    target: { x: -5.0, y: 13.5 + 1.2, z: -14.2 },
    desiredPosition: { x: -5.0, y: 13.5 + 1.8, z: -10.8 },
  });
  assert.equal(r401WallOcc.occluded, true);
  assert.equal(r401WallOcc.blockerKind, 'wall');
  assert.ok(
    r401WallOcc.position.z < -13.15,
    `Camera inside Room 401 must not clip South across wall z = -13.0, got z = ${r401WallOcc.position.z}`,
  );
  assert.ok(r401WallOcc.safeDistance < r401WallOcc.desiredDistance);

  // 2. Room 401 ceiling at 13.5 + 3.66 = 17.16m clamps high-pitch camera ray
  const r401CeilOcc = resolveLibraryCameraOcclusion({
    floor: 4,
    target: { x: 0, y: 13.5 + 1.2, z: -20.0 },
    desiredPosition: { x: 0, y: 13.5 + 5.5, z: -17.0 },
  });
  assert.equal(r401CeilOcc.occluded, true);
  assert.ok(
    r401CeilOcc.position.y <= 13.5 + 3.66,
    `Camera inside Room 401 must stay below acoustic ceiling (17.16m), got y = ${r401CeilOcc.position.y}`,
  );

  // 3. Tall bookshelf stack in Room 401 (height 2.28m >= 1.35m) blocks camera ray
  const stackX = ROOM_401_DIMS.STACK_X[2]; // -8.16
  const stackZ = ROOM_401_DIMS.R4Z + ROOM_401_DIMS.STACK_Z_LOCAL; // -32.08
  const stackOcc = resolveLibraryCameraOcclusion({
    floor: 4,
    target: { x: stackX - 1.1, y: 13.5 + 1.2, z: stackZ },
    desiredPosition: { x: stackX + 1.2, y: 13.5 + 1.4, z: stackZ },
  });
  assert.equal(stackOcc.occluded, true);
  assert.equal(stackOcc.blockerKind, 'furniture');
  assert.ok(stackOcc.position.x < stackX - 0.3);

  // 4. Player standing near a wall looking INTO the room (camera moving away from wall) is NOT falsely occluded by that wall
  const lookAwayFromWall = resolveLibraryCameraOcclusion({
    floor: 4,
    target: { x: 0, y: 13.5 + 1.2, z: -13.45 }, // 0.45m inside Room 401 near z = -13.0 wall
    desiredPosition: { x: 0, y: 13.5 + 1.6, z: -16.8 }, // camera deeper inside Room 401 (away from z = -13.0 wall)
  });
  assert.equal(lookAwayFromWall.occluded, false);
  assert.ok(Math.abs(lookAwayFromWall.safeDistance - lookAwayFromWall.desiredDistance) < 1e-3);

  // 5. Floor 6 curved stadium outer wall & Floor 7 mezzanine underside clamp camera cleanly
  const f6StadiumOcc = resolveLibraryCameraOcclusion({
    floor: 6,
    target: { x: 0, y: 1.2, z: 14.5 },
    desiredPosition: { x: 0, y: 1.8, z: 18.5 },
  });
  assert.equal(f6StadiumOcc.occluded, true);
  assert.ok(f6StadiumOcc.position.z < 16.3);

  const f6MezzCeilBounds = getCameraVerticalBoundsAt(6, 0, 13.5);
  assert.ok(f6MezzCeilBounds.maxY <= 4.85, 'Outer ring of Floor 6 sits under Floor 7 mezzanine slab (~4.82m)');

  // 6. Smooth camera distance stepping: immediate pull-in on obstruction, smooth exponential recovery when clear
  const pulledIn = stepLibraryCameraDistance(3.8, 3.8, 1.4, 0.016);
  assert.equal(pulledIn, 1.4, 'Must pull in immediately when obstructed to prevent single-frame wall penetration');

  let recovered = pulledIn;
  for (let frame = 0; frame < 30; frame++) {
    const next = stepLibraryCameraDistance(recovered, 3.8, 3.8, 0.033);
    assert.ok(next >= recovered, 'Recovery distance must increase monotonically without oscillation');
    assert.ok(next <= 3.8);
    recovered = next;
  }
  assert.ok(recovered > 3.5, `Expected smooth recovery near 3.8m after 1s, got ${recovered}`);
});

test('PR10B Stairs & Elevators (9) Curved stair T1↔T2 landing thresholds, side-rail channel & elevator shaft safety', () => {
  // 1. Standing and walking on Floor 2 balcony at f2-balcony (14.8, 4.5, 0) stays at y = 4.5m without snapping to mid-stair (2.25m)
  const f2Start = createLibraryLocation(2, 14.8, 0.0, 4.5);
  const f2WalkMid = resolveLibraryMovement(
    f2Start,
    createLibraryLocation(2, 14.8, 1.2, 4.5),
    AVATAR.radius,
    AVATAR.height,
  );
  assert.equal(f2WalkMid.position.y, 4.5, 'Walking along Floor 2 balcony near z = 1.2 must stay on Floor 2 slab (4.5m)');
  assert.equal(f2WalkMid.recommendedFloor, 2);

  // 2. Mid-stair side railings keep a player on the curved stair within [innerRadius, outerRadius]
  const onStairMid = createLibraryLocation(1, 6.5 + 8.45, 0.0, 2.25);
  const pushInner = resolveLibraryMovement(
    onStairMid,
    createLibraryLocation(1, 6.5 + 6.8, 0.0, 2.25),
    AVATAR.radius,
    AVATAR.height,
  );
  const rInner = Math.hypot(pushInner.position.x - 6.5, pushInner.position.z);
  assert.ok(rInner >= 7.55, `Inner curved stair railing must keep player at r >= 7.55, got ${rInner}`);

  // 3. Elevator bank shaft colliders on Floors 1–7 block entry and buildFloors1To5.surface() never treats cabs as walkable
  const { buildFloors1To5 } = require(path.join(ROOT, 'features/campus/buildings/library/buildFloors1To5.ts'));
  const THREE = require('three');
  const dummyGroup = new THREE.Group();
  const ctrl15 = buildFloors1To5(dummyGroup);
  const cabSurf = ctrl15.surface(20.38, 0, 0);
  assert.equal(cabSurf.ok, false, 'Elevator cab interior at x = 20.38 must not be treated as walkable gameplay floor');

  for (const floor of [1, 2, 3, 4, 5, 6, 7]) {
    const colliders = getCollidersForFloor(floor);
    const elevShaft = colliders.find((c) => c.id === `f${floor}-elevator-bank`);
    assert.ok(elevShaft, `Floor ${floor} must have an explicit elevator-bank shaft collider`);
    assert.equal(elevShaft.kind, 'shaft');
  }

  // 4. Scene lifecycle & InstancedMesh batching: Room 401, Floors 4–5, Floors 6–7 & Floor 10 use InstancedMesh & NOOP_RAYCAST
  const { buildRoom401 } = require(path.join(ROOT, 'features/campus/buildings/library/buildRoom401.ts'));
  const { buildFloors6To7 } = require(path.join(ROOT, 'features/campus/buildings/library/buildFloors6To7.ts'));
  const { buildFloor10Rooftop } = require(path.join(ROOT, 'features/campus/buildings/library/buildFloor10Rooftop.ts'));
  const { NOOP_RAYCAST, disposeObject3D } = require(path.join(ROOT, 'features/campus/buildings/library/procedural-helpers.ts'));

  const r401Group = new THREE.Group();
  buildRoom401(r401Group, 'PHÒNG ĐỌC 401');
  let r401InstancedCount = 0;
  let r401MeshCount = 0;
  r401Group.traverse((obj) => {
    if (obj.isInstancedMesh) {
      r401InstancedCount += 1;
      assert.equal(obj.raycast, NOOP_RAYCAST, 'InstancedMesh in Room 401 must use NOOP_RAYCAST');
    } else if (obj.isMesh) {
      r401MeshCount += 1;
      assert.equal(obj.raycast, NOOP_RAYCAST, 'Static/dynamic Mesh in Room 401 must use NOOP_RAYCAST');
    }
  });
  assert.ok(r401InstancedCount >= 20, `Expected Room 401 to batch into >= 20 InstancedMeshes, got ${r401InstancedCount}`);
  assert.ok(r401MeshCount < 160, `Expected Room 401 un-batched Mesh count < 160 (down from ~1,200), got ${r401MeshCount}`);

  ctrl15.prepareFloor(4);
  ctrl15.prepareFloor(5);
  const f67Group = new THREE.Group();
  const ctrl67 = buildFloors6To7(f67Group);
  const f10Group = new THREE.Group();
  buildFloor10Rooftop(f10Group);

  ctrl67.dispose();
  disposeObject3D(dummyGroup);
  disposeObject3D(r401Group);
  disposeObject3D(f67Group);
  disposeObject3D(f10Group);
});

