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
  getBlockAFurniturePlacements,
  getBlockForFloor,
  getCollidersForFloor,
  getWalkableSurfacesForFloor,
  resolveLibraryMovement,
  resolveLibraryLobbyCollisions,
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

  // 2. Shared Block A furniture placements (Floors 1–5) match collider bounding boxes 1:1
  for (const floor of [1, 2, 3, 4, 5]) {
    const placements = getBlockAFurniturePlacements(floor);
    const colliders = getCollidersForFloor(floor);
    assert.ok(placements.length > 0, `Floor ${floor} must have shared furniture placements`);

    for (const fp of placements) {
      const col = colliders.find((c) => c.id === fp.id);
      assert.ok(col, `Missing collider for shared furniture placement ${fp.id} on floor ${floor}`);
      const expected = colliderFromFurniturePlacement(fp);
      assert.deepEqual(col.bounds, expected.bounds, `Bounds mismatch for ${fp.id} on floor ${floor}`);

      if (fp.prop === 'round4') {
        assert.ok(col.cylinder, `Round table ${fp.id} must have cylinder collider metadata`);
        assert.equal(col.cylinder.radius, PROP_DIMENSIONS.round4.radius);
      } else {
        const d = PROP_DIMENSIONS[fp.prop];
        const rotBox = computeRotatedBoxBounds(fp.x, fp.z, fp.ry, d.minLX, d.maxLX, d.minLZ, d.maxLZ);
        assert.equal(col.bounds.minX, rotBox.minX);
        assert.equal(col.bounds.maxX, rotBox.maxX);
        assert.equal(col.bounds.minZ, rotBox.minZ);
        assert.equal(col.bounds.maxZ, rotBox.maxZ);
      }
    }
  }

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
