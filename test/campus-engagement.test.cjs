// ---------------------------------------------------------------------------
// test/campus-engagement.test.cjs — Unit & contract tests cho HUSTVerse 3-Stage
// Engagement Roadmap:
//   1. features/campus/quests/campus-quests.ts (6 nhiệm vụ, uniqueFlag, claim,
//      unlocks titles & gradCap, localStorage roundtrip)
//   2. shared/contracts/memory.ts + features/social/memory-wall/memory-wall.ts
//      + Worker HskRoom /__memories & /__memories/like
//   3. features/campus/interaction/bridge.ts (`bench:*`, `bench-stand-up`,
//      `drink-stall:*`, `memory-board:*`, `football-kick` + priority preservation)
//   4. OUTDOOR_SITTABLE_BENCHES standPos collision-free, `stadium` fast travel,
//      and OUTFIT_PRESETS 10-uniform invariant
// ---------------------------------------------------------------------------
'use strict';

require('./register-ts.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const campus = require(path.join(ROOT, 'lib/campus.ts'));
const presetsMod = require(path.join(ROOT, 'features/avatar/appearance/presets.ts'));
const questsMod = require(path.join(ROOT, 'features/campus/quests/campus-quests.ts'));
const memoryContracts = require(path.join(ROOT, 'shared/contracts/memory.ts'));
const memoryWallMod = require(path.join(ROOT, 'features/social/memory-wall/memory-wall.ts'));
const bridgeMod = require(path.join(ROOT, 'features/campus/interaction/bridge.ts'));
const workerRoom = require(path.join(ROOT, 'worker/src/room.ts'));

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(k, String(v));
    },
  };
}

function createMockDoState() {
  const sockets = [];
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

test('(1) Campus Quests: progression across all 6 quests, uniqueFlag dedup, claim rewards & localStorage', () => {
  const storage = createMemoryStorage();
  let state = questsMod.createInitialCampusQuestsState();
  assert.equal(questsMod.CAMPUS_LIFE_QUESTS.length, 6);
  assert.equal(questsMod.isGradCapUnlocked(state), false);

  // Deduplication on chillLake (`ordered-drink` + `sat-bench`)
  const rDrink1 = questsMod.recordCampusQuestMetric(state, 'chillLake', { uniqueFlag: 'ordered-drink' });
  state = rDrink1.next;
  assert.equal(state.metrics.chillLake, 1);
  const rDrinkDup = questsMod.recordCampusQuestMetric(state, 'chillLake', { uniqueFlag: 'ordered-drink' });
  state = rDrinkDup.next;
  assert.equal(state.metrics.chillLake, 1, 'Repeated uniqueFlag must not double-increment');
  const rBench = questsMod.recordCampusQuestMetric(state, 'chillLake', { uniqueFlag: 'sat-bench' });
  state = rBench.next;
  assert.equal(state.metrics.chillLake, 2);
  assert.deepEqual(rBench.newlyCompletedQuestIds, ['chieu-ho-tien']);

  // Cannot claim incomplete quest
  const invalidClaim = questsMod.claimCampusQuest(state, 'luu-but-ky-yeu');
  assert.equal(invalidClaim.claimed, false);

  // Claim completed chillLake quest
  const claimChill = questsMod.claimCampusQuest(state, 'chieu-ho-tien');
  assert.equal(claimChill.claimed, true);
  assert.equal(claimChill.rewardPoints, 25);
  assert.equal(claimChill.unlockedTitleId, 'ban-than-ho-tien');
  assert.equal(claimChill.unlockedGradCap, false);
  state = claimChill.next;

  // Double-claim must be rejected
  assert.equal(questsMod.claimCampusQuest(state, 'chieu-ho-tien').claimed, false);

  // Completing Quest 6 unlocks Graduation Cap & final title
  const rMem = questsMod.recordCampusQuestMetric(state, 'memoryActions');
  state = rMem.next;
  assert.deepEqual(rMem.newlyCompletedQuestIds, ['luu-but-ky-yeu']);
  assert.equal(questsMod.isGradCapUnlocked(state), true);

  const claimGrad = questsMod.claimCampusQuest(state, 'luu-but-ky-yeu');
  assert.equal(claimGrad.claimed, true);
  assert.equal(claimGrad.unlockedGradCap, true);
  assert.equal(claimGrad.unlockedTitleId, 'huyen-thoai-bk');
  state = claimGrad.next;

  const unlocked = questsMod.getUnlockedTitleIds(state);
  assert.ok(unlocked.includes('ban-than-ho-tien'));
  assert.ok(unlocked.includes('huyen-thoai-bk'));

  questsMod.saveCampusQuestsState(state, storage);
  const reloaded = questsMod.loadCampusQuestsState(storage);
  assert.deepEqual(reloaded, state);
});

test('(2) Memory Wall contracts, localStorage persistence & Worker HskRoom /__memories CRUD + likes', async () => {
  const storage = createMemoryStorage();
  const initial = memoryWallMod.loadLocalMemories(storage);
  assert.ok(initial.length >= 6, 'Seed memories must populate empty local storage');

  assert.equal(memoryContracts.sanitizeMemoryText('   <Hello>   Bách Khoa!   '), 'Hello Bách Khoa!');
  assert.equal(memoryContracts.isValidMemoryBoardId('c1-board'), true);
  assert.equal(memoryContracts.isValidMemoryColor('blue'), true);

  const customNote = {
    id: 'test-note-1',
    boardId: 'c1-board',
    authorName: 'Minh Khôi',
    cohortBadge: 'SoICT · 20226010',
    message: 'Đêm trước hạn đồ án tại C1!',
    color: 'yellow',
    likes: 1,
    createdAtMs: Date.now() + 1000,
  };
  memoryWallMod.saveLocalMemories([customNote, ...initial], storage);
  const reloaded = memoryWallMod.loadLocalMemories(storage);
  assert.equal(reloaded[0].id, 'test-note-1');

  // Test Worker Durable Object endpoints
  const room = new workerRoom.HskRoom(createMockDoState());
  const listInitRes = await room.fetch(new Request('https://internal/__memories?boardId=c1-board'));
  assert.equal(listInitRes.status, 200);
  const listInitJson = await listInitRes.json();
  assert.equal(listInitJson.ok, true);
  assert.ok(listInitJson.notes.length >= 2);
  assert.ok(listInitJson.notes.every((n) => n.boardId === 'c1-board'));

  const postRes = await room.fetch(
    new Request('https://internal/__memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardId: 'library-board',
        authorName: 'Lan Chi',
        cohortBadge: 'K67 · SME',
        message: 'Tầng 10 Thư viện Tạ Quang Bửu ngắm hoàng hôn cực chill!',
        color: 'mint',
      }),
    }),
  );
  assert.equal(postRes.status, 200);
  const postJson = await postRes.json();
  assert.equal(postJson.ok, true);
  assert.equal(postJson.note.boardId, 'library-board');
  assert.equal(postJson.note.likes, 0);

  const likeRes = await room.fetch(
    new Request('https://internal/__memories/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postJson.note.id }),
    }),
  );
  assert.equal(likeRes.status, 200);
  const likeJson = await likeRes.json();
  assert.equal(likeJson.ok, true);
  assert.equal(likeJson.note.likes, 1);
});

test('(3) bridge.ts findNearestInteractable: new outdoor prompts & legacy priority invariants', () => {
  const baseInput = {
    inClassroom: false,
    inLibraryLobby: false,
    bikeRiding: false,
    bikeSpeed: 0,
    bikePos: { x: -79.5, z: -2.5 },
    questActive: false,
    questDoneBefore: false,
    anyQuestDone: false,
    hskMode: false,
  };

  // Bench stand up takes precedence when outdoorBenchId is active
  const benchStand = bridgeMod.findNearestInteractable({
    ...baseInput,
    pos: { x: 22.18, z: 58.5 },
    outdoorBenchId: 'bench-lake-east-1',
  });
  assert.equal(benchStand?.id, 'bench-stand-up');

  // Drink stall detection
  const teaStall = campus.CAMPUS_DRINK_STALLS[0];
  const nearStall = bridgeMod.findNearestInteractable({
    ...baseInput,
    pos: { x: teaStall.x + 1.0, z: teaStall.z },
  });
  assert.equal(nearStall?.id, `drink-stall:${teaStall.id}`);

  // Memory board detection
  const lakeBoard = campus.CAMPUS_MEMORY_BOARDS[1];
  const nearBoard = bridgeMod.findNearestInteractable({
    ...baseInput,
    pos: { x: lakeBoard.x + 0.5, z: lakeBoard.z },
  });
  assert.equal(nearBoard?.id, `memory-board:${lakeBoard.id}`);

  // Football kick detection
  const nearBall = bridgeMod.findNearestInteractable({
    ...baseInput,
    pos: { x: 132.5, z: 80 },
    footballPos: { x: 132, z: 80 },
  });
  assert.equal(nearBall?.id, 'football-kick');

  // Outdoor bench detection
  const lakeBench = campus.OUTDOOR_SITTABLE_BENCHES[0];
  const nearBench = bridgeMod.findNearestInteractable({
    ...baseInput,
    pos: { x: lakeBench.seatPos.x + 1.0, z: lakeBench.seatPos.z },
  });
  assert.equal(nearBench?.id, `bench:${lakeBench.id}`);

  // Bike mount & library door keep higher priority than outdoor props
  const bikeOverride = bridgeMod.findNearestInteractable({
    ...baseInput,
    pos: { x: lakeBench.seatPos.x, z: lakeBench.seatPos.z },
    bikePos: { x: lakeBench.seatPos.x, z: lakeBench.seatPos.z },
  });
  assert.equal(bikeOverride?.id, 'bike-mount');
});

test('(4) World invariants: outdoor benches collision-free standPos, stadium fast-travel, 10 outfits', () => {
  assert.equal(Object.keys(presetsMod.OUTFIT_PRESETS).length, 10);

  const stadium = campus.FAST_TRAVEL_DESTINATIONS.find((d) => d.id === 'stadium');
  assert.ok(stadium, 'FAST_TRAVEL_DESTINATIONS must include stadium');
  const stadiumRes = campus.resolveCollisions({ x: stadium.x, z: stadium.z }, campus.AVATAR.radius);
  assert.equal(stadiumRes.hit, null);

  assert.equal(campus.OUTDOOR_SITTABLE_BENCHES.length, 6);
  for (const bench of campus.OUTDOOR_SITTABLE_BENCHES) {
    const res = campus.resolveCollisions(bench.standPos, campus.AVATAR.radius);
    assert.equal(
      res.hit,
      null,
      `StandUp spot for ${bench.id} (${bench.standPos.x}, ${bench.standPos.z}) collided with ${res.hit}`,
    );
  }
});
