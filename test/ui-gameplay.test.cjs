// ---------------------------------------------------------------------------
// test/ui-gameplay.test.cjs — Unit tests for PR5 Application UI & Gameplay
// Separation pure functions:
// - features/learning/hsk/objectives.ts (OBJECTIVES, questIdsForLesson,
//   statusForLesson, pickQuestForLesson)
// - features/campus/interaction/bridge.ts (findNearestInteractable priority
//   hierarchy, SPEECH_RATES, TOAST_MS, MINH_POS)
// ---------------------------------------------------------------------------

require('./register-ts.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  OBJECTIVES,
  questIdsForLesson,
  statusForLesson,
  pickQuestForLesson,
} = require('../features/learning/hsk/objectives.ts');
const {
  TOAST_MS,
  SPEECH_RATES,
  MINH_POS,
  MINH_RADIUS,
  findNearestInteractable,
} = require('../features/campus/interaction/bridge.ts');
const {
  CLASSROOM,
  CLASSROOM_DOOR,
  LIBRARY_DOOR,
  LIBRARY_LOBBY,
} = require('../features/campus/world-data/index.ts');

test('PR5 objectives.ts — questIdsForLesson maps HSK 3 and HSK 4 lessons accurately', () => {
  assert.deepEqual(questIdsForLesson('hsk3-l10'), ['first-lesson', 'l10-g234']);
  assert.deepEqual(questIdsForLesson('hsk3-l11'), ['l11']);
  assert.deepEqual(questIdsForLesson('hsk3-l18'), ['l18']);
  assert.deepEqual(questIdsForLesson('hsk4-shang-l1'), ['hsk4-shang-l1a', 'hsk4-shang-l1b']);
  assert.deepEqual(questIdsForLesson('hsk4-xia-l20'), ['hsk4-xia-l20a', 'hsk4-xia-l20b']);
  assert.ok(OBJECTIVES['greet-minh'].includes('Minh'));
  assert.ok(OBJECTIVES['goto-door'].includes('C1'));
  assert.ok(OBJECTIVES['final-review'].includes('Kiểm tra cuối'));
});

test('PR5 objectives.ts — statusForLesson and pickQuestForLesson handle all progression states', () => {
  // 1. Unstarted lesson
  assert.equal(statusForLesson('hsk3-l10', null, {}), 'Chưa bắt đầu — bấm để học');
  assert.equal(pickQuestForLesson('hsk3-l10', null, {}), 'first-lesson');

  // 2. Active quest in progress
  assert.equal(
    statusForLesson('hsk3-l10', 'l10-g234', { 'first-lesson': { at: '2026-11-08', points: 50 } }),
    'Đang học dở — bấm để học tiếp',
  );
  assert.equal(
    pickQuestForLesson('hsk3-l10', 'l10-g234', { 'first-lesson': { at: '2026-11-08', points: 50 } }),
    'l10-g234',
  );

  // 3. Partially completed HSK 3 Lesson 10 vs HSK 4 Lesson 1
  const partialL10 = { 'first-lesson': { at: '2026-11-08', points: 50 } };
  assert.equal(
    statusForLesson('hsk3-l10', null, partialL10),
    'Nhóm 1 ✓ · Nhóm 2–4 chưa bắt đầu — bấm để học tiếp',
  );
  assert.equal(pickQuestForLesson('hsk3-l10', null, partialL10), 'l10-g234');

  const partialHsk4 = { 'hsk4-shang-l1a': { at: '2026-11-08', points: 50 } };
  assert.equal(
    statusForLesson('hsk4-shang-l1', null, partialHsk4),
    'Đã học một phần — bấm để học tiếp',
  );
  assert.equal(pickQuestForLesson('hsk4-shang-l1', null, partialHsk4), 'hsk4-shang-l1b');

  // 4. Fully completed lesson replays from first quest
  const doneL10 = {
    'first-lesson': { at: '2026-11-08', points: 50 },
    'l10-g234': { at: '2026-11-08', points: 50 },
  };
  assert.equal(
    statusForLesson('hsk3-l10', null, doneL10),
    'Đã hoàn thành ✓ — bấm để chơi lại',
  );
  assert.equal(pickQuestForLesson('hsk3-l10', null, doneL10), 'first-lesson');
});

test('PR5 bridge.ts — findNearestInteractable enforces 5-tier interaction priority', () => {
  assert.equal(TOAST_MS, 2500);
  assert.deepEqual(SPEECH_RATES, [0.6, 0.8, 1.0]);
  assert.equal(MINH_RADIUS, 2.5);

  const baseInput = {
    pos: { x: 0, z: 0 },
    inClassroom: false,
    inLibraryLobby: false,
    bikeRiding: false,
    bikeSpeed: 0,
    bikePos: { x: 999, z: 999 },
    questActive: false,
    questDoneBefore: false,
    anyQuestDone: false,
    stepId: undefined,
  };

  // Tier 1: Library Lobby interactables
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      inLibraryLobby: true,
      pos: { ...LIBRARY_LOBBY.statue },
    }),
    { id: 'lobby-statue', label: 'E — Tìm hiểu Tượng GS. Tạ Quang Bửu' },
  );
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      inLibraryLobby: true,
      pos: { ...LIBRARY_LOBBY.vocabBoard },
    }),
    { id: 'lobby-vocab-board', label: 'E — Xem bảng từ vựng Thư viện' },
  );
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      inLibraryLobby: true,
      pos: { ...LIBRARY_LOBBY.infoDesk },
    }),
    { id: 'lobby-info-desk', label: 'E — Quầy thông tin & mượn sách' },
  );

  // Tier 2: Riding motorbike outdoors (stopped vs moving)
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      bikeRiding: true,
      bikeSpeed: 0.2,
    }),
    { id: 'bike-dismount', label: 'E — Xuống xe' },
  );
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      bikeRiding: true,
      bikeSpeed: 4.5,
    }),
    { id: 'bike-dismount', label: 'E — Xuống xe (chỉ khi dừng hẳn)' },
  );

  // Tier 3: Standing near motorbike outdoors overrides NPC Minh
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      pos: { ...MINH_POS },
      bikePos: { x: MINH_POS.x + 1.0, z: MINH_POS.z },
    }),
    { id: 'bike-mount', label: 'E — Lên xe' },
  );

  // Tier 4: Outdoor NPC Minh, Classroom Door, Library Door
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      pos: { ...MINH_POS },
    }),
    { id: 'npc-minh', label: 'E — Nói chuyện với Minh' },
  );
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      pos: { ...CLASSROOM_DOOR.pos },
      questActive: true,
      stepId: 'goto-door',
    }),
    { id: 'classroom-door', label: 'E — Vào phòng học' },
  );
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      pos: { ...LIBRARY_DOOR.pos },
    }),
    { id: 'library-door', label: 'E — Vào sảnh Thư viện Tạ Quang Bửu' },
  );

  // Tier 5: Indoor Classroom quest objects gated by stepId
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      inClassroom: true,
      pos: { ...CLASSROOM.board },
      questActive: true,
      stepId: 'find-board',
    }),
    { id: 'board', label: 'E — Chọn bảng đen' },
  );
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      inClassroom: true,
      pos: { ...CLASSROOM.notebook },
      questActive: true,
      stepId: 'open-notebook',
    }),
    { id: 'notebook', label: 'E — Mở vở ghi chép' },
  );
  assert.deepEqual(
    findNearestInteractable({
      ...baseInput,
      inClassroom: true,
      pos: { ...CLASSROOM.homework },
      questActive: true,
      stepId: 'take-homework',
    }),
    { id: 'homework', label: 'E — Nhận bài tập' },
  );
});
