/**
 * test/boardgame-lounge.test.cjs — Unit tests cho BG1 (HUSTVerse Board Game Club Lounge):
 *  - Ngoại thất & collider BOARD_GAME_CLUB không đè lên KTX B5–B9 hay cây xanh
 *  - 16 ghế chuẩn quanh 2 bàn, standPos thông thoáng không kẹt vào bàn/tường
 *  - Collider nội thất & clamp camera không cho xuyên tường/trần
 *  - Chuỗi prompt tương tác trong sân KTX & trong CLB Board Game
 *  - Encode/decode MultiplayerSceneId = 'boardgame' qua telemetry envelope
 *
 * Run: node --test test/boardgame-lounge.test.cjs
 */
'use strict';

require('./register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const campus = require(path.join(ROOT, 'lib/campus.ts'));
const world = require(path.join(ROOT, 'shared/constants/world.ts'));
const mpContracts = require(path.join(ROOT, 'shared/contracts/multiplayer.ts'));
const bridge = require(path.join(ROOT, 'features/campus/interaction/bridge.ts'));
const bgCamera = require(path.join(ROOT, 'features/boardgame/world/BoardGameCamera.tsx'));

function aabbOverlap(a, b) {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

test('(1) BOARD_GAME_CLUB không đè lên KTX B6/B7/Căng tin B5-9 hay thân cây', () => {
  const clubBox = campus.BOARD_GAME_CLUB.box;
  const neighbors = [
    campus.DORM_COMPLEX.b6Box,
    campus.DORM_COMPLEX.b7Box,
    campus.DORM_COMPLEX.b59CanteenBox,
    campus.DORM_COMPLEX.b5Box,
    campus.DORM_COMPLEX.b9Box,
  ];
  for (const box of neighbors) {
    assert.equal(aabbOverlap(clubBox, box), false, 'CLB không được giao cắt với nhà KTX');
  }
  for (const tree of campus.TREE_TRUNKS) {
    const inClub =
      tree.x >= clubBox.minX - 0.5 &&
      tree.x <= clubBox.maxX + 0.5 &&
      tree.z >= clubBox.minZ - 0.5 &&
      tree.z <= clubBox.maxZ + 0.5;
    assert.equal(inClub, false, `Không có cây nằm đè lên nhà CLB tại (${tree.x}, ${tree.z})`);
  }

  const doorResolved = campus.resolveCollisions(campus.BOARD_GAME_CLUB_DOOR.pos, world.AVATAR.radius);
  assert.equal(doorResolved.hit, null, 'Điểm kích hoạt cửa vào CLB phải đứng được ngoài collider');
  const exitResolved = campus.resolveCollisions(
    campus.BOARD_GAME_CLUB_DOOR.exitReturnPos,
    world.AVATAR.radius,
  );
  assert.equal(exitResolved.hit, null, 'Điểm trả về khi thoát CLB phải đứng được ngoài collider');
});

test('(2) CLB có đúng 2 bàn x 8 ghế = 16 ghế với standPos hợp lệ không đâm bàn/tường', () => {
  assert.equal(campus.BOARD_GAME_TABLES.length, 2);
  assert.equal(campus.BOARD_GAME_SEATS.length, 16);

  const ids = new Set(campus.BOARD_GAME_SEATS.map((s) => s.seatId));
  assert.equal(ids.size, 16);

  for (const seat of campus.BOARD_GAME_SEATS) {
    const res = campus.resolveBoardGameLoungeCollisions(seat.standPos, world.AVATAR.radius);
    assert.equal(
      res.hit,
      null,
      `standPos của ${seat.seatId} (${seat.standPos.x}, ${seat.standPos.z}) không được chạm ${res.hit}`,
    );
  }
});

test('(3) Va chạm phòng CLB & camera clamp giữ người chơi + góc nhìn trong phòng', () => {
  const pushedNorth = campus.resolveBoardGameLoungeCollisions({ x: 0, z: -20 }, world.AVATAR.radius);
  assert.ok(pushedNorth.pos.z >= campus.BOARD_GAME_LOUNGE.bounds.minZ + world.AVATAR.radius);

  const pushedTable1 = campus.resolveBoardGameLoungeCollisions(
    campus.BOARD_GAME_TABLES[0].center,
    world.AVATAR.radius,
  );
  assert.ok(pushedTable1.hit !== null, 'Avatar không được xuyên qua tâm Bàn 1');

  const cam = bgCamera.clampBoardGameLoungeCamera({ x: -12, y: 8.5, z: 12 });
  assert.ok(cam.x >= bgCamera.BOARD_GAME_CAMERA_LIMITS.minX && cam.x <= bgCamera.BOARD_GAME_CAMERA_LIMITS.maxX);
  assert.ok(cam.y >= bgCamera.BOARD_GAME_CAMERA_LIMITS.minY && cam.y <= bgCamera.BOARD_GAME_CAMERA_LIMITS.maxY);
  assert.ok(cam.z >= bgCamera.BOARD_GAME_CAMERA_LIMITS.minZ && cam.z <= bgCamera.BOARD_GAME_CAMERA_LIMITS.maxZ);
});

test('(4) Prompt tương tác ngoài sân KTX & trong CLB Board Game hoạt động đúng ưu tiên', () => {
  const base = {
    pos: { ...campus.BOARD_GAME_CLUB_DOOR.pos },
    inClassroom: false,
    inLibraryLobby: false,
    inBoardGameClub: false,
    bikeRiding: false,
    bikeSpeed: 0,
    bikePos: { x: 95, z: -6 },
    questActive: false,
    questDoneBefore: false,
    anyQuestDone: false,
    hskMode: false,
  };
  const doorPrompt = bridge.findNearestInteractable(base);
  assert.equal(doorPrompt?.id, 'boardgame-door');
  assert.equal(doorPrompt?.label, '🎲 Nhấn E — Vào CLB Board Game');

  const seat0 = campus.BOARD_GAME_SEATS[0];
  const nearSeatPrompt = bridge.findNearestInteractable({
    ...base,
    inBoardGameClub: true,
    pos: { x: seat0.x, z: seat0.z },
  });
  assert.equal(nearSeatPrompt?.id, `bg-seat:${seat0.seatId}`);

  const occupiedPrompt = bridge.findNearestInteractable({
    ...base,
    inBoardGameClub: true,
    pos: { x: seat0.x, z: seat0.z },
    occupiedBoardGameSeatIds: new Set([seat0.seatId]),
  });
  assert.ok(occupiedPrompt?.label.includes('🔒'));

  const seatedPrompt = bridge.findNearestInteractable({
    ...base,
    inBoardGameClub: true,
    boardGameSeatId: seat0.seatId,
    pos: { x: seat0.x, z: seat0.z },
  });
  assert.equal(seatedPrompt?.id, 'bg-seat-stand-up');

  const exitPrompt = bridge.findNearestInteractable({
    ...base,
    inBoardGameClub: true,
    pos: { ...campus.BOARD_GAME_LOUNGE.exitDoorPos },
  });
  assert.equal(exitPrompt?.id, 'boardgame-exit');
});

test('(5) Telemetry envelope mã hóa & giải mã đúng scene boardgame', () => {
  const encoded = mpContracts.encodeMoveTelemetry({
    x: 0,
    z: 4.1,
    facing: 1.25,
    scene: 'boardgame',
  });
  const decoded = mpContracts.decodeMoveTelemetry(encoded);
  assert.equal(decoded.hasTelemetry, true);
  assert.equal(decoded.scene, 'boardgame');
  assert.ok(Math.abs(Math.sin(decoded.facing) - Math.sin(1.25)) < 1e-3);
});
