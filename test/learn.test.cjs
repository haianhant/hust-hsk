/**
 * Test engine học tập (Bước 4) — chạy bằng MỘT lệnh, không cần cài thêm gì:
 *
 *   node --test test/learn.test.cjs
 *
 * (chạy từ thư mục gốc của repo ~/workspace/bach-khoa-han-ngu/)
 *
 * Cách chạy: file này tự biên dịch `lib/learn/*.ts` + `content/hsk3-l10.ts`
 * bằng `npx tsc` ra `test/.tmp-learn/` (thư mục build tạm, không commit),
 * rồi require các file JS đã biên dịch để test bằng node:test có sẵn.
 * Type-check đầy đủ của cả repo vẫn là:  npx tsc --noEmit
 */
'use strict';

const { execSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');

// Bước biên dịch nhẹ trước khi test (Node không chạy trực tiếp file .ts).
execSync(
  [
    'npx tsc',
    'lib/learn/types.ts lib/learn/pinyin.ts lib/learn/store.ts lib/learn/speech.ts lib/learn/quest-data.ts',
    'lib/learn/quest-data-hsk4-shang.ts lib/learn/quest-data-hsk4-xia.ts',
    'lib/learn/badges.ts lib/learn/suggest.ts',
    'content/hsk3-l10.ts content/hsk3-l11.ts content/hsk3-l12.ts content/hsk3-l13.ts',
    'content/hsk3-l14.ts content/hsk3-l15.ts content/hsk3-l16.ts content/hsk3-l17.ts content/hsk3-l18.ts',
    'content/hsk3-index.ts',
    'content/hsk4-shang-l1.ts content/hsk4-shang-l2.ts content/hsk4-shang-l3.ts content/hsk4-shang-l4.ts',
    'content/hsk4-shang-l5.ts content/hsk4-shang-l6.ts content/hsk4-shang-l7.ts content/hsk4-shang-l8.ts',
    'content/hsk4-shang-l9.ts content/hsk4-shang-l10.ts',
    'content/hsk4-xia-l11.ts content/hsk4-xia-l12.ts content/hsk4-xia-l13.ts content/hsk4-xia-l14.ts',
    'content/hsk4-xia-l15.ts content/hsk4-xia-l16.ts content/hsk4-xia-l17.ts content/hsk4-xia-l18.ts',
    'content/hsk4-xia-l19.ts content/hsk4-xia-l20.ts',
    'content/hsk4-index.ts',
    '--outDir test/.tmp-learn',
    '--module commonjs --target es2020 --moduleResolution node',
    '--esModuleInterop --skipLibCheck --lib es2020,dom',
  ].join(' '),
  { cwd: ROOT, stdio: 'pipe' },
);

const {
  normalizePinyin,
  pinyinToNumbered,
  checkPinyin,
  normalizeHanzi,
  checkHanzi,
} = require('./.tmp-learn/lib/learn/pinyin.js');

const store = require('./.tmp-learn/lib/learn/store.js');
const {
  createEmptyProgress,
  loadProgress,
  saveProgress,
  resetProgress,
  recordAnswer,
  recordReReview,
  scoreAnswer,
  awardQuestCompletion,
  getDueWords,
  getDueWordsIncludingTodayWrong,
  getReviewCalendar,
  getErrorWords,
  getSessionWrongIds,
  isWellKnownState,
  getWordState,
  markEncountered,
  todayKey,
  addDaysToKey,
  markActivityDay,
  exportProgress,
  importProgress,
  STORAGE_KEY,
} = store;

const speech = require('./.tmp-learn/lib/learn/speech.js');
const content = require('./.tmp-learn/content/hsk3-l10.js');

/** Storage giả trong bộ nhớ cho test (thay cho localStorage). */
function memoryStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}

const WORD = 'hsk3-l10-g1-shuxue';
const TODAY = todayKey();

// ---------------------------------------------------------------------------
// (1) normalizePinyin
// ---------------------------------------------------------------------------
test('(1) normalizePinyin: hoa/thường, khoảng trắng, ánh xạ ü', () => {
  assert.equal(normalizePinyin('Shù Xué'), 'shùxué');
  assert.equal(normalizePinyin('  RÈNZHĒN '), 'rènzhēn');
  // 'v' và 'u:' đều là cách gõ thay cho 'ü' → cùng ra 'nü'.
  // (Ghi chú: đầu vào không có dấu thanh nên kết quả là 'nü', không tự
  // thêm thanh 3 thành 'nǚ' — việc thêm dấu sẽ là bịa thanh điệu.)
  assert.equal(normalizePinyin('nv'), 'nü');
  assert.equal(normalizePinyin('nü'), 'nü');
  assert.equal(normalizePinyin('nu:'), 'nü');
  assert.equal(normalizePinyin('nǚ'), 'nǚ');
});

// ---------------------------------------------------------------------------
// (2) pinyinToNumbered
// ---------------------------------------------------------------------------
test('(2) pinyinToNumbered: dấu thanh → số', () => {
  assert.equal(pinyinToNumbered('shùxué'), 'shu4xue2');
  assert.equal(pinyinToNumbered('rènzhēn'), 'ren4zhen1');
  assert.equal(pinyinToNumbered('Shù Xué'), 'shu4xue2');
  assert.equal(pinyinToNumbered('māma'), 'ma1ma5'); // âm tiết sau không dấu → 5
  assert.equal(pinyinToNumbered('hēibǎn'), 'hei1ban3');
  assert.equal(pinyinToNumbered('tígāo'), 'ti2gao1');
});

// ---------------------------------------------------------------------------
// (3) checkPinyin
// ---------------------------------------------------------------------------
test("(3) checkPinyin mode 'tone': khớp số thanh mới đúng", () => {
  assert.equal(checkPinyin('shu4xue2', 'shùxué', 'tone').ok, true);
  assert.equal(checkPinyin('shùxué', 'shùxué', 'tone').ok, true);
  assert.equal(checkPinyin('SHÙXUÉ', 'shùxué', 'tone').ok, true); // hoa vẫn nhận
  // Bỏ dấu khi đáp án có dấu → SAI ở mode tone.
  const noTone = checkPinyin('shuxue', 'shùxué', 'tone');
  assert.equal(noTone.ok, false);
  assert.match(noTone.detail, /thanh điệu/);
  // Sai thanh → SAI, detail nói rõ thanh nào.
  const wrongTone = checkPinyin('shu3xue2', 'shùxué', 'tone');
  assert.equal(wrongTone.ok, false);
  assert.match(wrongTone.detail, /âm tiết 1/);
  assert.match(wrongTone.detail, /thanh 3/);
  // Sai chữ.
  assert.equal(checkPinyin('shu4xue1', 'shùxué', 'tone').ok, false);
});

test("(3) checkPinyin mode 'toneless': bỏ dấu vẫn đúng", () => {
  assert.equal(checkPinyin('shuxue', 'shùxué', 'toneless').ok, true);
  assert.equal(checkPinyin('SHUXUE', 'shùxué', 'toneless').ok, true);
  assert.equal(checkPinyin('shuxie', 'shùxué', 'toneless').ok, false);
});

// ---------------------------------------------------------------------------
// (4) checkHanzi
// ---------------------------------------------------------------------------
test('(4) checkHanzi: bỏ dấu câu/khoảng trắng, không bỏ qua từ sai', () => {
  assert.equal(checkHanzi('请把作业交给老师。', '请把作业交给老师').ok, true);
  assert.equal(checkHanzi('请 把 作 业 交 给 老 师', '请把作业交给老师').ok, true);
  assert.equal(checkHanzi('请把作业交给学生', '请把作业交给老师').ok, false);
  assert.equal(checkHanzi('请把作业交给老师们', '请把作业交给老师').ok, false);
  assert.equal(normalizeHanzi('你好，世界！'), '你好世界');
});

// ---------------------------------------------------------------------------
// (5) Ôn cách quãng qua recordAnswer
// ---------------------------------------------------------------------------
test('(5) review: đúng không gợi ý → level +1, nextDue +1 ngày', () => {
  const p0 = createEmptyProgress();
  const p1 = recordAnswer(p0, {
    lexemeId: WORD, correct: true, usedHint: false, activity: 'quiz',
  });
  const st = getWordState(p1, WORD);
  assert.equal(st.level, 1);
  assert.equal(st.nextDue, addDaysToKey(TODAY, 1));
  assert.equal(p1.points, 10);
  assert.equal(p1.encountered.includes(WORD), true);
  // Không mutate input.
  assert.equal(getWordState(p0, WORD), undefined);
  assert.equal(p0.points, 0);
});

test('(5) review: đúng có gợi ý → giữ level, nextDue ngày mai', () => {
  let p = createEmptyProgress();
  p = recordAnswer(p, { lexemeId: WORD, correct: true, usedHint: false, activity: 'quiz' });
  p = recordAnswer(p, { lexemeId: WORD, correct: true, usedHint: true, activity: 'quiz' });
  const st = getWordState(p, WORD);
  assert.equal(st.level, 1);
  assert.equal(st.nextDue, addDaysToKey(TODAY, 1));
  assert.equal(p.points, 15); // 10 + 5
});

test('(5) review: sai → level 0, nextDue ngày mai, wrongCount +1', () => {
  let p = createEmptyProgress();
  p = recordAnswer(p, { lexemeId: WORD, correct: true, usedHint: false, activity: 'quiz' });
  p = recordAnswer(p, { lexemeId: WORD, correct: false, usedHint: false, activity: 'quiz' });
  const st = getWordState(p, WORD);
  assert.equal(st.level, 0);
  assert.equal(st.nextDue, addDaysToKey(TODAY, 1));
  assert.equal(st.wrongCount, 1);
  assert.equal(st.correctCount, 1);
  assert.equal(p.points, 10); // sai không cộng điểm
  // Từ vừa sai (nextDue ngày mai) chưa đến hạn ôn trong hôm nay.
  assert.equal(getDueWords(p, TODAY).includes(WORD), false);
});

test('(5) review: đúng 5 lần liên tiếp → level 5, nextDue +30 ngày', () => {
  let p = createEmptyProgress();
  for (let i = 0; i < 5; i++) {
    p = recordAnswer(p, { lexemeId: WORD, correct: true, usedHint: false, activity: 'quiz' });
  }
  const st = getWordState(p, WORD);
  assert.equal(st.level, 5);
  assert.equal(st.nextDue, addDaysToKey(TODAY, 30));
  // Đúng lần 6 không vượt quá level 5.
  p = recordAnswer(p, { lexemeId: WORD, correct: true, usedHint: false, activity: 'quiz' });
  assert.equal(getWordState(p, WORD).level, 5);
});

// ---------------------------------------------------------------------------
// (6) awardQuestCompletion idempotent
// ---------------------------------------------------------------------------
test('(6) awardQuestCompletion: lần 2 không cộng điểm', () => {
  let p = createEmptyProgress();
  const r1 = awardQuestCompletion(p, 'quest-first-lesson', 50, 'first-lesson');
  assert.equal(r1.awarded, true);
  assert.equal(r1.points, 50);
  assert.equal(r1.progress.points, 50);
  assert.equal(r1.progress.badges.includes('first-lesson'), true);
  assert.equal(r1.progress.completedQuests['quest-first-lesson'].points, 50);

  const r2 = awardQuestCompletion(r1.progress, 'quest-first-lesson', 50, 'first-lesson');
  assert.equal(r2.awarded, false);
  assert.equal(r2.points, 0);
  assert.equal(r2.progress.points, 50);
  assert.equal(r2.progress.badges.length, 1);
});

// ---------------------------------------------------------------------------
// (7) Migration + JSON hỏng
// ---------------------------------------------------------------------------
test('(7) migration: progress thiếu trường settings → load ra đủ mặc định', () => {
  const storage = memoryStorage({
    [STORAGE_KEY]: JSON.stringify({
      version: 1,
      lexemes: {},
      encountered: [WORD],
      events: [],
      points: 20,
      badges: [],
      completedQuests: {},
      streak: { count: 3, lastDay: TODAY },
      // cố tình thiếu settings và questState
    }),
  });
  const p = loadProgress(storage);
  assert.equal(p.points, 20);
  assert.equal(p.encountered.includes(WORD), true);
  assert.deepEqual(p.settings, { soundOn: true, speechRate: 1, showPinyin: true });
  assert.equal(p.questState, null);
  assert.equal(p.loadError, undefined);
});

test('(7) JSON hỏng → progress rỗng, không throw, có loadError', () => {
  const storage = memoryStorage({ [STORAGE_KEY]: '{không phải json' });
  const p = loadProgress(storage);
  assert.equal(p.points, 0);
  assert.deepEqual(p.encountered, []);
  assert.match(p.loadError, /hỏng/);
  // saveProgress không lưu loadError trở lại.
  saveProgress(storage, p);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).loadError, undefined);
});

test('(7) save/load round-trip giữ nguyên tiến độ', () => {
  const storage = memoryStorage();
  let p = createEmptyProgress();
  p = recordAnswer(p, { lexemeId: WORD, correct: true, usedHint: false, activity: 'quiz' });
  saveProgress(storage, p);
  const loaded = loadProgress(storage);
  assert.equal(loaded.points, 10);
  assert.equal(getWordState(loaded, WORD).level, 1);
  const empty = resetProgress(storage);
  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.equal(empty.points, 0);
});

// ---------------------------------------------------------------------------
// (8) importProgress
// ---------------------------------------------------------------------------
test('(8) import: JSON hợp lệ ok; sai kiểu ok=false; id lạ bị loại kèm warning', () => {
  const good = exportProgress(
    recordAnswer(createEmptyProgress(), {
      lexemeId: WORD, correct: true, usedHint: false, activity: 'quiz',
    }),
  );
  const okRes = importProgress(good);
  assert.equal(okRes.ok, true);
  assert.equal(okRes.progress.points, 10);
  assert.equal(getWordState(okRes.progress, WORD).level, 1);

  const badType = importProgress(JSON.stringify({ version: 1, points: 'nhiều' }));
  assert.equal(badType.ok, false);
  assert.match(badType.error, /points/);

  const badJson = importProgress('không phải json');
  assert.equal(badJson.ok, false);

  const strange = importProgress(
    JSON.stringify({
      version: 1,
      lexemes: {
        [WORD]: {
          lexemeId: WORD, level: 2, nextDue: TODAY, lastSeen: null,
          correctCount: 2, wrongCount: 0, lastWrongAt: null,
        },
        'hsk9-l99-g9-khong-ton-tai': {
          lexemeId: 'hsk9-l99-g9-khong-ton-tai', level: 5, nextDue: TODAY,
          lastSeen: null, correctCount: 9, wrongCount: 0, lastWrongAt: null,
        },
      },
      encountered: [WORD, 'hsk9-l99-g9-khong-ton-tai'],
      points: 10,
    }),
  );
  assert.equal(strange.ok, true);
  assert.equal(getWordState(strange.progress, 'hsk9-l99-g9-khong-ton-tai'), undefined);
  assert.equal(strange.progress.encountered.includes('hsk9-l99-g9-khong-ton-tai'), false);
  assert.equal(strange.progress.encountered.includes(WORD), true);
  assert.ok(strange.warnings.length >= 2);
});

// ---------------------------------------------------------------------------
// (9) streak
// ---------------------------------------------------------------------------
test('(9) streak: cùng ngày không tăng, hôm sau +1, cách 2 ngày reset về 1', () => {
  // Dùng Date giả: 01:00 UTC = 08:00 giờ VN cùng ngày.
  const d1 = todayKey(new Date('2026-11-05T01:00:00Z'));
  const d2 = todayKey(new Date('2026-11-06T01:00:00Z'));
  const d4 = todayKey(new Date('2026-11-08T01:00:00Z'));
  assert.equal(d1, '2026-11-05');
  assert.equal(d2, '2026-11-06');
  assert.equal(d4, '2026-11-08');

  let p = createEmptyProgress();
  p = markActivityDay(p, d1);
  assert.equal(p.streak.count, 1);
  p = markActivityDay(p, d1); // cùng ngày
  assert.equal(p.streak.count, 1);
  p = markActivityDay(p, d2); // hôm sau
  assert.equal(p.streak.count, 2);
  p = markActivityDay(p, d4); // cách 2 ngày (bỏ 07/11)
  assert.equal(p.streak.count, 1);
  assert.equal(p.streak.lastDay, d4);
});

test('(9) recordAnswer đúng thì tính streak, sai thì không', () => {
  let p = createEmptyProgress();
  p = recordAnswer(p, { lexemeId: WORD, correct: false, usedHint: false, activity: 'quiz' });
  assert.equal(p.streak.count, 0);
  p = recordAnswer(p, { lexemeId: WORD, correct: true, usedHint: false, activity: 'quiz' });
  assert.equal(p.streak.count, 1);
  assert.equal(p.streak.lastDay, TODAY);
});

// ---------------------------------------------------------------------------
// (10) Bảng điểm + event
// ---------------------------------------------------------------------------
test('(10) scoreAnswer: 10 / 5 / 3 / 2 theo đúng bảng', () => {
  assert.equal(scoreAnswer(true, false, false), 10); // lần đầu, không gợi ý
  assert.equal(scoreAnswer(true, true, false), 5); // có gợi ý
  assert.equal(scoreAnswer(false, false, false), 3); // đúng sau khi sai
  assert.equal(scoreAnswer(true, false, true), 2); // replay
  assert.equal(scoreAnswer(true, true, true), 2); // replay vẫn chỉ 2
});

test('(10) recordAnswer cộng điểm đúng bảng và ghi event', () => {
  let p = createEmptyProgress();
  // Đúng lần đầu không gợi ý: 10đ.
  p = recordAnswer(p, { lexemeId: WORD, correct: true, usedHint: false, activity: 'quiz' });
  assert.equal(p.points, 10);
  // Đúng có gợi ý: 5đ.
  p = recordAnswer(p, { lexemeId: WORD, correct: true, usedHint: true, activity: 'flashcard' });
  assert.equal(p.points, 15);
  // Đúng sau khi sai (firstTry=false): 3đ.
  p = recordAnswer(p, { lexemeId: WORD, correct: true, usedHint: false, activity: 'quiz', firstTry: false });
  assert.equal(p.points, 18);
  // Sai: 0đ nhưng vẫn ghi event.
  p = recordAnswer(p, { lexemeId: WORD, correct: false, usedHint: false, activity: 'quiz' });
  assert.equal(p.points, 18);
  assert.equal(p.events.length, 4);
  assert.equal(p.events[3].correct, false);
  assert.equal(p.events[0].activity, 'quiz');
  // Replay quest đã hoàn thành: 2đ.
  const done = awardQuestCompletion(p, 'quest-first-lesson', 50, 'first-lesson');
  p = recordAnswer(done.progress, {
    lexemeId: WORD, correct: true, usedHint: false, activity: 'quest',
    questId: 'quest-first-lesson',
  });
  assert.equal(p.points, 18 + 50 + 2);
});

// ---------------------------------------------------------------------------
// Nội dung + truy vấn ôn tập + speech guard
// ---------------------------------------------------------------------------
test('content: đúng 9 từ nhóm 1 HSK3 bài 10, id/thứ tự/liên kết khớp', () => {
  assert.equal(content.HSK3_L10_LEXEMES.length, 9);
  assert.deepEqual(
    content.HSK3_L10_LEXEMES.map((w) => w.hanzi),
    ['数学', '认真', '笔记', '清楚', '黑板', '把', '作业', '遍', '提高'],
  );
  assert.deepEqual(
    content.HSK3_L10_LEXEMES.map((w) => w.id),
    [
      'hsk3-l10-g1-shuxue', 'hsk3-l10-g1-renzhen', 'hsk3-l10-g1-biji',
      'hsk3-l10-g1-qingchu', 'hsk3-l10-g1-heiban', 'hsk3-l10-g1-ba',
      'hsk3-l10-g1-zuoye', 'hsk3-l10-g1-bian', 'hsk3-l10-g1-tigao',
    ],
  );
  assert.equal(content.HSK3_L10_LESSON.id, 'hsk3-l10');
  assert.equal(content.HSK3_L10_LESSON.title, '你明天再把书还给我');
  assert.equal(content.HSK3_L10_GROUP.id, 'hsk3-l10-g1');
  assert.equal(content.HSK3_L10_VOCABULARY.length, 9);
  assert.equal(content.HSK3_L10_EXAMPLES.length, 9);
  assert.ok(content.HSK3_L10_EXAMPLES.every((e) => e.source === 'authored'));
  assert.ok(content.HSK3_L10_LEXEMES.every((w) => w.status === 'verified'));
});

test('getDueWords: từ mới gặp thì đến hạn; nextDue tương lai thì chưa', () => {
  let p = createEmptyProgress();
  p = markEncountered(p, WORD);
  assert.equal(getDueWords(p, TODAY).includes(WORD), true); // gặp, chưa ôn
  p = recordAnswer(p, { lexemeId: WORD, correct: true, usedHint: false, activity: 'quiz' });
  assert.equal(getDueWords(p, TODAY).includes(WORD), false); // nextDue ngày mai
  assert.equal(getDueWords(p, addDaysToKey(TODAY, 1)).includes(WORD), true);
});

test('speech (node): không có window → không throw, báo lỗi qua onError', () => {
  assert.equal(speech.getChineseVoice(), null);
  assert.equal(speech.hasChineseVoice(), false);
  let code = null;
  assert.doesNotThrow(() => speech.speak('你好', { onError: (c) => { code = c; } }));
  assert.equal(code, 'no-speech');
  assert.doesNotThrow(() => speech.stopSpeaking());
});

// ---------------------------------------------------------------------------
// (11) Bước 4-fix — F2/F3/F5b: lastCorrectAt, isWellKnownState,
// getDueWordsIncludingTodayWrong, recordReReview, questState yaw/pitch
// ---------------------------------------------------------------------------
test('(11) lastCorrectAt: đúng ghi dấu, sai không đổi; F3 isWellKnownState', () => {
  let p = createEmptyProgress();
  // Chưa có trạng thái → chưa vững.
  assert.equal(isWellKnownState(getWordState(p, WORD)), false);
  // Đúng 3 lần liên tiếp → level 3, chưa từng sai → vững.
  for (let i = 0; i < 3; i++) {
    p = recordAnswer(p, { lexemeId: WORD, correct: true, usedHint: false, activity: 'quiz' });
  }
  let st = getWordState(p, WORD);
  assert.equal(st.level, 3);
  assert.ok(st.lastCorrectAt);
  assert.equal(st.lastWrongAt, null);
  assert.equal(isWellKnownState(st), true);
  // Sai → level 0, lastCorrectAt giữ nguyên (lần đúng cũ), lastWrongAt mới
  // hơn lần đúng gần nhất → KHÔNG còn vững (F3: từ vừa sai khỏi tab).
  p = recordAnswer(p, { lexemeId: WORD, correct: false, usedHint: false, activity: 'quiz' });
  st = getWordState(p, WORD);
  assert.equal(st.level, 0);
  assert.ok(st.lastWrongAt >= st.lastCorrectAt); // có thể cùng mili-giây
  assert.equal(isWellKnownState(st), false);
  // Level < 3 dù chưa từng sai → chưa vững.
  let p2 = createEmptyProgress();
  p2 = recordAnswer(p2, { lexemeId: WORD, correct: true, usedHint: false, activity: 'quiz' });
  assert.equal(getWordState(p2, WORD).level, 1);
  assert.equal(isWellKnownState(getWordState(p2, WORD)), false);
});

test('(11) F2: từ sai trong ngày hiện ở getDueWordsIncludingTodayWrong dù nextDue ngày mai', () => {
  let p = createEmptyProgress();
  p = recordAnswer(p, { lexemeId: WORD, correct: true, usedHint: false, activity: 'quiz' });
  p = recordAnswer(p, { lexemeId: WORD, correct: false, usedHint: false, activity: 'quiz' });
  const st = getWordState(p, WORD);
  assert.equal(st.level, 0);
  assert.equal(st.nextDue, addDaysToKey(TODAY, 1));
  assert.equal(getDueWords(p, TODAY).includes(WORD), false); // quy tắc cũ giữ nguyên
  assert.deepEqual(getSessionWrongIds(p, TODAY), [WORD]);
  assert.equal(getDueWordsIncludingTodayWrong(p, TODAY).includes(WORD), true);
  // Ngày hôm sau thì không còn tính là "sai trong phiên hôm nay" nữa
  // (nhưng lúc đó nextDue đã tới nên vẫn đến hạn theo getDueWords).
  assert.deepEqual(getSessionWrongIds(p, addDaysToKey(TODAY, 1)), []);
  assert.equal(getDueWordsIncludingTodayWrong(p, addDaysToKey(TODAY, 1)).includes(WORD), true);
  // Sai rồi sửa đúng ngay trong câu (đúng có điểm) → không còn tính là sai
  // trong phiên; sai ở kiểm tra cuối rồi ôn lại đúng (0đ) → vẫn tính.
  let p2 = createEmptyProgress();
  p2 = recordAnswer(p2, { lexemeId: WORD, correct: false, usedHint: false, activity: 'quiz' });
  assert.deepEqual(getSessionWrongIds(p2, TODAY), [WORD]);
  p2 = recordAnswer(p2, { lexemeId: WORD, correct: true, usedHint: false, activity: 'quiz', firstTry: false });
  assert.deepEqual(getSessionWrongIds(p2, TODAY), []);
  let p3 = createEmptyProgress();
  p3 = recordAnswer(p3, { lexemeId: WORD, correct: false, usedHint: false, activity: 'review' });
  p3 = recordReReview(p3, WORD, true); // ôn lại đúng nhưng 0đ, không sửa level
  assert.deepEqual(getSessionWrongIds(p3, TODAY), [WORD]);
});

test('(11) F2a: recordReReview đúng/sai đều 0đ, không đổi level/nextDue', () => {
  let p = createEmptyProgress();
  p = recordAnswer(p, { lexemeId: WORD, correct: true, usedHint: false, activity: 'quiz' });
  p = recordAnswer(p, { lexemeId: WORD, correct: false, usedHint: false, activity: 'quiz' });
  const before = getWordState(p, WORD);
  assert.equal(p.points, 10);
  // Ôn lại đúng → 0đ, level vẫn 0, nextDue vẫn ngày mai, correctCount +1.
  const p2 = recordReReview(p, WORD, true);
  const st2 = getWordState(p2, WORD);
  assert.equal(p2.points, 10);
  assert.equal(st2.level, 0);
  assert.equal(st2.nextDue, before.nextDue);
  assert.equal(st2.correctCount, before.correctCount + 1);
  assert.equal(p2.events[p2.events.length - 1].points, 0);
  // Không mutate input.
  assert.equal(getWordState(p, WORD).correctCount, before.correctCount);
  // Ôn lại vẫn sai → 0đ, wrongCount +1, lastWrongAt cập nhật.
  const p3 = recordReReview(p2, WORD, false);
  assert.equal(p3.points, 10);
  assert.equal(getWordState(p3, WORD).wrongCount, before.wrongCount + 1);
  assert.equal(getWordState(p3, WORD).level, 0);
});

test('(11) F5b + migration: questState yaw/pitch giữ qua save/load; dữ liệu cũ thiếu thì mặc định', () => {
  const storage = memoryStorage();
  let p = createEmptyProgress();
  p = { ...p, questState: { questId: 'first-lesson', stepIndex: 5, done: false, yaw: 0.4, pitch: 0.38 } };
  saveProgress(storage, p);
  const loaded = loadProgress(storage);
  assert.equal(loaded.questState.yaw, 0.4);
  assert.equal(loaded.questState.pitch, 0.38);
  // Import cũng giữ yaw/pitch; dữ liệu cũ không có yaw/pitch thì undefined.
  const imp = importProgress(exportProgress(p));
  assert.equal(imp.ok, true);
  assert.equal(imp.progress.questState.yaw, 0.4);
  const oldJson = JSON.stringify({
    version: 1, lexemes: {}, encountered: [], events: [], points: 0,
    badges: [], completedQuests: {}, streak: { count: 0, lastDay: null },
    settings: { soundOn: true, speechRate: 1, showPinyin: true },
    questState: { questId: 'first-lesson', stepIndex: 5, done: false },
  });
  const impOld = importProgress(oldJson);
  assert.equal(impOld.ok, true);
  assert.equal(impOld.progress.questState.yaw, undefined);
  // lastCorrectAt thiếu trong dữ liệu cũ → migrate về null, không mất level.
  const oldLex = JSON.stringify({
    version: 1,
    lexemes: { [WORD]: { lexemeId: WORD, level: 3, nextDue: TODAY, lastSeen: null, correctCount: 3, wrongCount: 0, lastWrongAt: null } },
    encountered: [WORD], events: [], points: 30, badges: [], completedQuests: {},
    streak: { count: 0, lastDay: null },
    settings: { soundOn: true, speechRate: 1, showPinyin: true }, questState: null,
  });
  const loadedOld = loadProgress(memoryStorage({ [STORAGE_KEY]: oldLex }));
  assert.equal(getWordState(loadedOld, WORD).level, 3);
  assert.equal(getWordState(loadedOld, WORD).lastCorrectAt, null);
  assert.equal(isWellKnownState(getWordState(loadedOld, WORD)), true); // level 3, chưa từng sai
});

// ---------------------------------------------------------------------------
// (12) Bước 6 — content HSK 3 đầy đủ: 246 từ / 36 nhóm (audit §3a)
// ---------------------------------------------------------------------------
const index = require('./.tmp-learn/content/hsk3-index.js');
const index4 = require('./.tmp-learn/content/hsk4-index.js');
const questData = require('./.tmp-learn/lib/learn/quest-data.js');
const badges = require('./.tmp-learn/lib/learn/badges.js');
const suggest = require('./.tmp-learn/lib/learn/suggest.js');

/** Số từ mỗi bài theo audit §3a. */
const AUDIT_LESSON_COUNTS = {
  'hsk3-l10': 28,
  'hsk3-l11': 28,
  'hsk3-l12': 27,
  'hsk3-l13': 28,
  'hsk3-l14': 27,
  'hsk3-l15': 26,
  'hsk3-l16': 26,
  'hsk3-l17': 27,
  'hsk3-l18': 29,
};

/** Số từ mỗi nhóm (nhóm 1→4) theo audit §3a. */
const AUDIT_GROUP_COUNTS = {
  'hsk3-l10': [9, 9, 6, 4],
  'hsk3-l11': [9, 6, 6, 7],
  'hsk3-l12': [6, 11, 3, 7],
  'hsk3-l13': [8, 5, 6, 9],
  'hsk3-l14': [7, 4, 8, 8],
  'hsk3-l15': [9, 9, 4, 4],
  'hsk3-l16': [10, 8, 6, 2],
  'hsk3-l17': [8, 6, 7, 6],
  'hsk3-l18': [7, 8, 7, 7],
};

test('(12) index: 246 từ / 36 nhóm, số từ mỗi bài/nhóm khớp audit §3a', () => {
  assert.equal(index.ALL_HSK3_LEXEMES.length, 246);
  assert.equal(index.HSK3_LESSONS.length, 9);
  const groupIds = new Set(index.ALL_HSK3_LEXEMES.map((w) => w.groupId));
  assert.equal(groupIds.size, 36);
  assert.equal(Object.keys(index.HSK3_LESSON_GROUPS).length, 9);
  for (const [lessonId, count] of Object.entries(AUDIT_LESSON_COUNTS)) {
    const words = index.HSK3_LESSON_LEXEMES[lessonId];
    assert.equal(words.length, count, `${lessonId} phải có ${count} từ`);
    assert.ok(words.every((w) => w.lessonId === lessonId));
    // Số từ mỗi nhóm (theo groupId g1..g4, đúng thứ tự).
    const perGroup = [1, 2, 3, 4].map(
      (g) => words.filter((w) => w.groupId === `${lessonId}-g${g}`).length,
    );
    assert.deepEqual(perGroup, AUDIT_GROUP_COUNTS[lessonId], `${lessonId} nhóm`);
    assert.equal(index.HSK3_LESSON_GROUPS[lessonId].length, 4);
  }
  assert.equal(index.ALL_HSK3_VOCABULARY.length, 246);
  assert.equal(index.ALL_HSK3_EXAMPLES.length, 246);
});

test('(12) index: id duy nhất; mỗi từ đúng 1 ví dụ authored; KNOWN 246 id', () => {
  const ids = index.ALL_HSK3_LEXEMES.map((w) => w.id);
  assert.equal(new Set(ids).size, 246);
  assert.deepEqual(index.KNOWN_LEXEME_IDS, ids);
  assert.equal(index.KNOWN_LEXEME_IDS.length, 246);
  // Mỗi từ đúng 1 ví dụ, ví dụ trỏ đúng từ, tất cả source 'authored'.
  const byLexeme = new Map();
  for (const ex of index.ALL_HSK3_EXAMPLES) {
    assert.equal(ex.source, 'authored', `${ex.id} phải là authored`);
    assert.ok(ids.includes(ex.lexemeId), `${ex.id} trỏ tới từ có thật`);
    byLexeme.set(ex.lexemeId, (byLexeme.get(ex.lexemeId) ?? 0) + 1);
  }
  assert.equal(byLexeme.size, 246);
  for (const id of ids) assert.equal(byLexeme.get(id), 1, `${id} phải có đúng 1 ví dụ`);
  assert.ok(index.ALL_HSK3_LEXEMES.every((w) => w.status === 'verified'));
  assert.ok(index.ALL_HSK3_LEXEMES.every((w) => w.courseId === 'hsk3'));
});

test('(12) index: metadata 9 bài khớp audit (title/topic); export cũ l10 còn 9 id', () => {
  assert.deepEqual(
    index.HSK3_LESSONS.map((l) => [l.number, l.title, l.topic]),
    [
      [10, '你明天再把书还给我', 'Học tập & câu chữ 把'],
      [11, '看来我没办法解决这个问题', 'Công sở & giải quyết vấn đề'],
      [12, '这个季节天气变化很快', 'Thời tiết & bốn mùa'],
      [13, '我的新邻居来自英国', 'Hàng xóm & văn hóa'],
      [14, '这本书被别人借走了', 'Thư viện & câu chữ 被'],
      [15, '我是半个南京人', 'Nam Kinh & Hoàng Hà'],
      [16, '我听说有的熊猫出国了', 'Động vật & vườn thú'],
      [17, '我要多向认真的人学习', 'Định hướng & học tập'],
      [18, '我学会了包饺子', 'Tết & gia đình'],
    ],
  );
  // Export KNOWN_LEXEME_IDS cũ trong hsk3-l10.ts giữ nguyên vẹn (9 id
  // nhóm 1) để không vỡ import khác; store đã dùng bản 246 id ở index.
  assert.equal(content.KNOWN_LEXEME_IDS.length, 9);
  assert.deepEqual(content.KNOWN_LEXEME_IDS, content.HSK3_L10_LEXEMES.map((w) => w.id));
});

// ---------------------------------------------------------------------------
// (13) Bước 6 — 9 quest mới
// ---------------------------------------------------------------------------
const NEW_QUEST_IDS = ['l10-g234', 'l11', 'l12', 'l13', 'l14', 'l15', 'l16', 'l17', 'l18'];
const NEW_QUEST_WORD_COUNTS = {
  'l10-g234': 19,
  l11: 28,
  l12: 27,
  l13: 28,
  l14: 27,
  l15: 26,
  l16: 26,
  l17: 27,
  l18: 29,
};

test('(13) quest mới: 50 quest trong registry; mỗi quest mới 8 bước đúng kind', () => {
  assert.equal(Object.keys(questData.QUEST_REGISTRY).length, 50);
  assert.equal(questData.ALL_QUEST_DEFS.length, 50);
  assert.deepEqual(questData.L10_QUEST_IDS, ['first-lesson', 'l10-g234']);
  const badges = questData.ALL_QUEST_DEFS.map((d) => d.quest.badgeId);
  assert.equal(new Set(badges).size, 50, 'badgeId phải riêng từng quest');
  for (const def of questData.ALL_QUEST_DEFS) {
    assert.equal(def.quest.rewardPoints, 50);
  }
  // 10 quest HSK 3 vẫn trỏ đúng bài HSK 3.
  for (const def of questData.ALL_QUEST_DEFS.filter((d) => d.quest.lessonId.startsWith('hsk3-l'))) {
    assert.equal(def.quest.lessonId.startsWith('hsk3-l'), true);
  }
  for (const qid of NEW_QUEST_IDS) {
    const def = questData.getQuestDef(qid);
    assert.ok(def, `registry phải có ${qid}`);
    assert.equal(def.quest.id, qid);
    assert.equal(def.quest.lexemeIds.length, NEW_QUEST_WORD_COUNTS[qid], `${qid} số từ`);
    assert.equal(def.steps.length, 8, `${qid} phải có 8 bước`);
    assert.deepEqual(
      def.steps.map((s) => s.kind),
      ['talk', 'goto', 'talk', 'pick-meaning', 'pick-meaning', def.steps[5].kind, 'review', 'result'],
    );
    assert.equal(def.steps[0].npc, 'minh');
    assert.equal(def.steps[1].kind, 'goto');
    assert.equal(def.steps[1].targetId, 'classroom-door');
    assert.equal(def.steps[2].npc, 'teacher');
    assert.ok(
      ['order', 'choose-number', 'choose-goal'].includes(def.steps[5].kind),
      `${qid} bước 6 phải là order/choose-number/choose-goal`,
    );
    // Không dùng kind gắn cứng phòng học bài 10 ở quest mới.
    assert.ok(def.steps.every((s) => s.kind !== 'pick-object' && s.kind !== 'interact-object'));
    // Review cuối đúng 5 từ.
    const review = def.steps[6];
    assert.equal(review.kind, 'review');
    assert.equal(review.lexemeIds.length, 5, `${qid} review phải có 5 từ`);
    assert.equal(def.steps[7].kind, 'result');
  }
  assert.equal(questData.getQuestDef('khong-ton-tai'), undefined);
});

test('(13) quest mới: lexemeIds khớp content; mọi từ trong bước đều có thật', () => {
  const knownIds = new Set(index.ALL_HSK3_LEXEMES.map((w) => w.id));
  for (const qid of NEW_QUEST_IDS) {
    const def = questData.getQuestDef(qid);
    // lexemeIds của quest = toàn bộ từ của bài (l10-g234 = 19 từ nhóm 2–4).
    const expected =
      qid === 'l10-g234'
        ? index.HSK3_LESSON_LEXEMES['hsk3-l10'].filter((w) => w.groupId !== 'hsk3-l10-g1').map((w) => w.id)
        : index.HSK3_LESSON_LEXEMES[def.quest.lessonId].map((w) => w.id);
    assert.deepEqual(def.quest.lexemeIds, expected, `${qid} lexemeIds khớp content`);
    const questSet = new Set(def.quest.lexemeIds);
    // Mọi lexemeId xuất hiện trong bước đều thuộc bài đó.
    for (const s of def.steps) {
      if ('lexemeId' in s && s.lexemeId) {
        assert.ok(knownIds.has(s.lexemeId), `${qid}/${s.id} từ có thật`);
        assert.ok(questSet.has(s.lexemeId), `${qid}/${s.id} từ thuộc bài`);
      }
    }
    // Review 5 từ đều thuộc bài.
    for (const id of def.steps[6].lexemeIds) assert.ok(questSet.has(id), `${qid} review ${id} thuộc bài`);
    // pick-meaning: đúng 1 đáp án đúng trong 2 lựa chọn.
    for (const s of def.steps.filter((x) => x.kind === 'pick-meaning')) {
      assert.equal(s.options.filter((o) => o.correct).length, 1, `${qid}/${s.id} đúng 1 đáp án đúng`);
      assert.equal(s.options.length, 2);
    }
    // order: các thẻ ghép đúng thành đáp án; choose-number: đáp án trong options.
    const s6 = def.steps[5];
    if (s6.kind === 'order') {
      assert.equal(s6.tiles.join(''), s6.answer, `${qid} tiles ghép thành answer`);
      assert.equal(s6.source, 'authored');
    }
    if (s6.kind === 'choose-number') {
      assert.ok(s6.options.includes(s6.correct), `${qid} correct nằm trong options`);
      assert.equal(s6.source, 'authored');
    }
    if (s6.kind === 'choose-goal') assert.equal(s6.source, 'authored');
  }
});

test('(13) tuyến bài 10 không đổi: 13 bước, id/thứ tự/câu order giữ nguyên', () => {
  const steps = questData.FIRST_LESSON_STEPS;
  assert.equal(steps.length, 13);
  assert.deepEqual(
    steps.map((s) => s.id),
    [
      'greet-minh', 'goto-door', 'teacher-math', 'find-board', 'open-notebook',
      'take-homework', 'learn-renzhen', 'learn-qingchu', 'order-ba',
      'count-bian', 'goal-tigao', 'final-review', 'result',
    ],
  );
  const order = steps.find((s) => s.id === 'order-ba');
  assert.equal(order.answer, '请把作业交给老师。');
  assert.equal(order.tiles.join(''), '请把作业交给老师。');
  assert.equal(questData.FIRST_LESSON_QUEST.rewardPoints, 50);
  assert.equal(questData.FIRST_LESSON_QUEST.lexemeIds.length, 9);
  assert.equal(questData.FIRST_LESSON_QUEST.badgeId, 'first-lesson');
  // Registry trỏ đúng tuyến cũ (không copy lệch).
  assert.equal(questData.QUEST_REGISTRY['first-lesson'].steps, steps);
});

// ---------------------------------------------------------------------------
// (14) Bước 6 — thưởng quest mới idempotent (dùng awardQuestCompletion có sẵn)
// ---------------------------------------------------------------------------
test('(14) awardQuestCompletion cho quest mới: lần 2 không cộng điểm', () => {
  let p = createEmptyProgress();
  const r1 = awardQuestCompletion(p, 'l11', 50, 'l11');
  assert.equal(r1.awarded, true);
  assert.equal(r1.progress.points, 50);
  assert.equal(r1.progress.badges.includes('l11'), true);
  const r2 = awardQuestCompletion(r1.progress, 'l11', 50, 'l11');
  assert.equal(r2.awarded, false);
  assert.equal(r2.progress.points, 50);
  assert.equal(r2.progress.badges.length, 1);
  // Quest khác vẫn nhận thưởng riêng.
  const r3 = awardQuestCompletion(r2.progress, 'l12', 50, 'l12');
  assert.equal(r3.awarded, true);
  assert.equal(r3.progress.points, 100);
});

// ---------------------------------------------------------------------------
// (15) Bước 6 — importProgress với 246 id đã biết
// ---------------------------------------------------------------------------
test('(15) import: id từ bài mới được nhận; id lạ vẫn bị loại', () => {
  const NEW_WORD = 'hsk3-l18-g1-chunjie';
  const good = importProgress(
    JSON.stringify({
      version: 1,
      lexemes: {
        [NEW_WORD]: {
          lexemeId: NEW_WORD, level: 2, nextDue: TODAY, lastSeen: null,
          correctCount: 2, wrongCount: 0, lastWrongAt: null,
        },
      },
      encountered: [NEW_WORD],
      points: 10,
    }),
  );
  assert.equal(good.ok, true);
  assert.equal(getWordState(good.progress, NEW_WORD).level, 2);
  assert.equal(good.progress.encountered.includes(NEW_WORD), true);
  assert.equal((good.warnings ?? []).length, 0);
  // Id lạ vẫn bị loại kèm warning (như cũ).
  const strange = importProgress(
    JSON.stringify({
      version: 1,
      lexemes: {
        'hsk9-l99-g9-khong-ton-tai': {
          lexemeId: 'hsk9-l99-g9-khong-ton-tai', level: 5, nextDue: TODAY,
          lastSeen: null, correctCount: 9, wrongCount: 0, lastWrongAt: null,
        },
      },
      encountered: ['hsk9-l99-g9-khong-ton-tai'],
      points: 10,
    }),
  );
  assert.equal(strange.ok, true);
  assert.equal(getWordState(strange.progress, 'hsk9-l99-g9-khong-ton-tai'), undefined);
  assert.ok(strange.warnings.length >= 2);
});

// ---------------------------------------------------------------------------
// (16) Bước 7 — HSK 4: content, quest, registry, import
// ---------------------------------------------------------------------------
/** Số từ mỗi bài theo audit §3b (thượng) / §3c (hạ). */
const AUDIT_HSK4_LESSON_COUNTS = {
  'hsk4-shang-l1': 40, 'hsk4-shang-l2': 37, 'hsk4-shang-l3': 42, 'hsk4-shang-l4': 40,
  'hsk4-shang-l5': 44, 'hsk4-shang-l6': 39, 'hsk4-shang-l7': 39, 'hsk4-shang-l8': 40,
  'hsk4-shang-l9': 40, 'hsk4-shang-l10': 43,
  'hsk4-xia-l11': 41, 'hsk4-xia-l12': 43, 'hsk4-xia-l13': 43, 'hsk4-xia-l14': 41,
  'hsk4-xia-l15': 37, 'hsk4-xia-l16': 41, 'hsk4-xia-l17': 41, 'hsk4-xia-l18': 39,
  'hsk4-xia-l19': 40, 'hsk4-xia-l20': 41,
};

/** Số từ mỗi nhóm thượng (nhóm 1→4) theo audit §3b. */
const AUDIT_HSK4_GROUP_COUNTS = {
  'hsk4-shang-l1': [7, 11, 12, 10],
  'hsk4-shang-l2': [8, 7, 10, 12],
  'hsk4-shang-l3': [7, 12, 10, 13],
  'hsk4-shang-l4': [9, 9, 10, 12],
  'hsk4-shang-l5': [11, 7, 14, 12],
  'hsk4-shang-l6': [7, 9, 15, 8],
  'hsk4-shang-l7': [12, 8, 10, 9],
  'hsk4-shang-l8': [11, 9, 9, 11],
  'hsk4-shang-l9': [10, 8, 12, 10],
  'hsk4-shang-l10': [12, 8, 10, 13],
};

test('(16) index HSK 4: 811 từ / 50 nhóm, số từ mỗi bài khớp audit §3b/§3c', () => {
  assert.equal(index4.ALL_HSK4_LEXEMES.length, 811);
  assert.equal(index4.HSK4_SHANG_LESSONS.length, 10);
  assert.equal(index4.HSK4_XIA_LESSONS.length, 10);
  assert.equal(index4.HSK4_LESSONS.length, 20);
  const groupIds = new Set(index4.ALL_HSK4_LEXEMES.map((w) => w.groupId));
  assert.equal(groupIds.size, 50, 'thượng 40 nhóm + hạ 10 nhóm');
  assert.equal(Object.keys(index4.HSK4_LESSON_GROUPS).length, 20);
  for (const [lessonId, count] of Object.entries(AUDIT_HSK4_LESSON_COUNTS)) {
    const words = index4.HSK4_LESSON_LEXEMES[lessonId];
    assert.equal(words.length, count, `${lessonId} phải có ${count} từ`);
    assert.ok(words.every((w) => w.lessonId === lessonId));
    // Thượng 4 nhóm/bài, hạ đúng 1 nhóm/bài (audit §6 đã xác minh).
    const expectedGroups = lessonId.includes('shang') ? 4 : 1;
    assert.equal(index4.HSK4_LESSON_GROUPS[lessonId].length, expectedGroups, `${lessonId} số nhóm`);
    const perGroup = [...new Set(words.map((w) => w.groupId))];
    assert.equal(perGroup.length, expectedGroups, `${lessonId} groupId`);
    // Thượng: cỡ từng nhóm khớp audit §3b (vd bài 1: 7+11+12+10).
    if (lessonId.includes('shang')) {
      const sizes = [1, 2, 3, 4].map(
        (g) => words.filter((w) => w.groupId === `${lessonId}-g${g}`).length,
      );
      assert.deepEqual(sizes, AUDIT_HSK4_GROUP_COUNTS[lessonId], `${lessonId} cỡ nhóm`);
    } else {
      // Hạ: toàn bộ từ trong 1 nhóm duy nhất.
      assert.ok(words.every((w) => w.groupId === `${lessonId}-g1`), `${lessonId} chỉ nhóm 1`);
    }
  }
  assert.equal(index4.ALL_HSK4_VOCABULARY.length, 811);
  assert.equal(index4.ALL_HSK4_EXAMPLES.length, 811);
});

test('(16) index HSK 4: id duy nhất toàn cục 1057 (HSK 3 + HSK 4); ví dụ authored', () => {
  const ids3 = index.ALL_HSK3_LEXEMES.map((w) => w.id);
  const ids4 = index4.ALL_HSK4_LEXEMES.map((w) => w.id);
  assert.equal(new Set(ids4).size, 811);
  assert.deepEqual(index4.KNOWN_HSK4_LEXEME_IDS, ids4);
  assert.equal(index4.KNOWN_HSK4_LEXEME_IDS.length, 811);
  const allIds = [...ids3, ...ids4];
  assert.equal(new Set(allIds).size, 1057, 'không trùng id giữa HSK 3 và HSK 4');
  const byLexeme = new Map();
  for (const ex of index4.ALL_HSK4_EXAMPLES) {
    assert.equal(ex.source, 'authored', `${ex.id} phải là authored`);
    assert.ok(ids4.includes(ex.lexemeId), `${ex.id} trỏ tới từ có thật`);
    byLexeme.set(ex.lexemeId, (byLexeme.get(ex.lexemeId) ?? 0) + 1);
  }
  assert.equal(byLexeme.size, 811);
  for (const id of ids4) assert.equal(byLexeme.get(id), 1, `${id} phải có đúng 1 ví dụ`);
  assert.ok(index4.ALL_HSK4_LEXEMES.every((w) => w.status === 'verified'));
  assert.ok(index4.ALL_HSK4_LEXEMES.every((w) => w.courseId === 'hsk4-shang' || w.courseId === 'hsk4-xia'));
});

test('(16) quest HSK 4: 40 quest trong registry, mỗi quest 8 bước đúng khung L11', () => {
  const hsk4Defs = questData.ALL_QUEST_DEFS.filter((d) => d.quest.lessonId.startsWith('hsk4-'));
  assert.equal(hsk4Defs.length, 40);
  assert.equal(Object.keys(questData.HSK4_LESSON_QUEST_IDS).length, 20);
  for (const [lessonId, qids] of Object.entries(questData.HSK4_LESSON_QUEST_IDS)) {
    assert.equal(qids.length, 2, `${lessonId} có 2 quest`);
    assert.ok(qids[0].endsWith('a') && qids[1].endsWith('b'), `${lessonId} phần 1/2`);
    assert.equal(questData.getQuestDef(qids[0]).quest.lessonId, lessonId);
    assert.equal(questData.getQuestDef(qids[1]).quest.lessonId, lessonId);
  }
  for (const def of hsk4Defs) {
    assert.equal(def.quest.rewardPoints, 50);
    assert.equal(def.quest.badgeId, def.quest.id);
    assert.equal(def.steps.length, 8, `${def.quest.id} phải có 8 bước`);
    assert.deepEqual(
      def.steps.map((s) => s.kind),
      ['talk', 'goto', 'talk', 'pick-meaning', 'pick-meaning', def.steps[5].kind, 'review', 'result'],
    );
    assert.equal(def.steps[0].npc, 'minh');
    assert.equal(def.steps[0].id, 'greet-minh');
    assert.equal(def.steps[1].id, 'goto-door');
    assert.equal(def.steps[1].targetId, 'classroom-door');
    assert.equal(def.steps[2].npc, 'teacher');
    assert.ok(
      ['order', 'choose-number', 'choose-goal'].includes(def.steps[5].kind),
      `${def.quest.id} bước 6 phải là order/choose-number/choose-goal`,
    );
    assert.ok(def.steps.every((s) => s.kind !== 'pick-object' && s.kind !== 'interact-object'));
    assert.equal(def.steps[6].kind, 'review');
    assert.equal(def.steps[6].lexemeIds.length, 5, `${def.quest.id} review phải có 5 từ`);
    assert.equal(def.steps[7].kind, 'result');
  }
});

test('(16) quest HSK 4: lexemeIds khớp content; A+B = toàn bộ từ của bài', () => {
  const knownIds = new Set(index4.ALL_HSK4_LEXEMES.map((w) => w.id));
  for (const [lessonId, qids] of Object.entries(questData.HSK4_LESSON_QUEST_IDS)) {
    const lessonWords = index4.HSK4_LESSON_LEXEMES[lessonId].map((w) => w.id);
    const combined = qids.flatMap((q) => questData.getQuestDef(q).quest.lexemeIds);
    assert.deepEqual(combined, lessonWords, `${lessonId} A+B = toàn bộ từ của bài, đúng thứ tự`);
    for (const qid of qids) {
      const def = questData.getQuestDef(qid);
      const questSet = new Set(def.quest.lexemeIds);
      for (const s of def.steps) {
        if ('lexemeId' in s && s.lexemeId) {
          assert.ok(knownIds.has(s.lexemeId), `${qid}/${s.id} từ có thật`);
          assert.ok(questSet.has(s.lexemeId), `${qid}/${s.id} từ thuộc quest`);
        }
      }
      for (const id of def.steps[6].lexemeIds) assert.ok(questSet.has(id), `${qid} review ${id} thuộc quest`);
      for (const s of def.steps.filter((x) => x.kind === 'pick-meaning')) {
        assert.equal(s.options.filter((o) => o.correct).length, 1, `${qid}/${s.id} đúng 1 đáp án đúng`);
        assert.equal(s.options.length, 2);
      }
      const s6 = def.steps[5];
      if (s6.kind === 'order') {
        assert.equal(s6.tiles.join(''), s6.answer, `${qid} tiles ghép thành answer`);
        assert.equal(s6.source, 'authored');
      }
      if (s6.kind === 'choose-number') {
        assert.ok(s6.options.includes(s6.correct), `${qid} correct nằm trong options`);
        assert.equal(s6.source, 'authored');
      }
      if (s6.kind === 'choose-goal') assert.equal(s6.source, 'authored');
    }
  }
});

test('(16) import: id HSK 4 được nhận; id lạ vẫn bị loại; migration store cũ 9 từ', () => {
  const HSK4_WORD = 'hsk4-shang-l1-g1-qianzheng';
  const good = importProgress(
    JSON.stringify({
      version: 1,
      lexemes: {
        [HSK4_WORD]: {
          lexemeId: HSK4_WORD, level: 2, nextDue: TODAY, lastSeen: null,
          correctCount: 2, wrongCount: 0, lastWrongAt: null,
        },
      },
      encountered: [HSK4_WORD],
      points: 10,
    }),
  );
  assert.equal(good.ok, true);
  assert.equal(getWordState(good.progress, HSK4_WORD).level, 2);
  assert.equal((good.warnings ?? []).length, 0);
  // Store cũ (chỉ 9 từ bài 10 nhóm 1) vẫn load được, không mất tiến độ.
  const oldIds = index.HSK3_LESSON_LEXEMES['hsk3-l10']
    .filter((w) => w.groupId === 'hsk3-l10-g1')
    .map((w) => w.id);
  assert.equal(oldIds.length, 9);
  const oldLexemes = {};
  for (const id of oldIds) {
    oldLexemes[id] = {
      lexemeId: id, level: 1, nextDue: TODAY, lastSeen: null,
      correctCount: 1, wrongCount: 0, lastWrongAt: null,
    };
  }
  const migrated = importProgress(JSON.stringify({
    version: 1, lexemes: oldLexemes, encountered: oldIds, points: 90,
  }));
  assert.equal(migrated.ok, true);
  assert.equal((migrated.warnings ?? []).length, 0);
  assert.equal(migrated.progress.points, 90);
  for (const id of oldIds) assert.equal(getWordState(migrated.progress, id).level, 1);
});

test('(16) awardQuestCompletion cho quest HSK 4: lần 2 không cộng điểm', () => {
  let p = createEmptyProgress();
  const r1 = awardQuestCompletion(p, 'hsk4-shang-l1a', 50, 'hsk4-shang-l1a');
  assert.equal(r1.awarded, true);
  assert.equal(r1.progress.points, 50);
  assert.equal(r1.progress.badges.includes('hsk4-shang-l1a'), true);
  const r2 = awardQuestCompletion(r1.progress, 'hsk4-shang-l1a', 50, 'hsk4-shang-l1a');
  assert.equal(r2.awarded, false);
  assert.equal(r2.progress.points, 50);
  assert.equal(r2.progress.badges.length, 1);
  const r3 = awardQuestCompletion(r2.progress, 'hsk4-xia-l20b', 50, 'hsk4-xia-l20b');
  assert.equal(r3.awarded, true);
  assert.equal(r3.progress.points, 100);
});

// ---------------------------------------------------------------------------
// (17) Bước 8 — lịch ôn SRS, sổ lỗi, huy hiệu toàn cục, streak, gợi ý,
// xuất/nhập + migration với dữ liệu HSK 3 + HSK 4
// ---------------------------------------------------------------------------
/** Progress giả với trạng thái nhớ cho trước (nextDue/lastWrongAt...). */
function progressWithStates(states, extra) {
  const p = createEmptyProgress();
  p.lexemes = {};
  for (const [id, st] of Object.entries(states)) {
    p.lexemes[id] = {
      lexemeId: id, level: st.level ?? 0, nextDue: st.nextDue ?? TODAY,
      lastSeen: st.lastSeen ?? null, correctCount: st.correctCount ?? 0,
      wrongCount: st.wrongCount ?? 0, lastWrongAt: st.lastWrongAt ?? null,
      lastCorrectAt: st.lastCorrectAt ?? null,
    };
  }
  p.encountered = Object.keys(states);
  if (extra) Object.assign(p, extra);
  return p;
}

test('(17) lịch ôn: quá hạn gộp 1 nhóm, hôm nay, từng ngày sau, sau 7 ngày riêng', () => {
  const W1 = 'hsk3-l10-g1-shuxue';
  const W2 = 'hsk3-l11-g1-jiejue';
  const W3 = 'hsk4-shang-l1-g1-qianzheng';
  const W4 = 'hsk4-xia-l20-g1-daoyou';
  const p = progressWithStates({
    [W1]: { level: 1, nextDue: addDaysToKey(TODAY, -3) }, // quá hạn 3 ngày
    [W2]: { level: 0, nextDue: TODAY }, // hôm nay
    [W3]: { level: 2, nextDue: addDaysToKey(TODAY, 2) }, // sau 2 ngày
    [W4]: { level: 5, nextDue: addDaysToKey(TODAY, 30) }, // sau 30 ngày
  });
  const cal = getReviewCalendar(p, TODAY);
  assert.equal(cal.days.length, 9, 'quá hạn + hôm nay + 7 ngày sau');
  const overdue = cal.days.find((d) => d.overdue);
  assert.ok(overdue, 'có nhóm quá hạn');
  assert.deepEqual(overdue.lexemeIds, [W1]);
  assert.equal(overdue.overdueDays, 3, 'quá hạn lâu nhất 3 ngày');
  assert.deepEqual(cal.days.find((d) => d.dayKey === TODAY).lexemeIds, [W2]);
  assert.deepEqual(cal.days.find((d) => d.dayKey === addDaysToKey(TODAY, 2)).lexemeIds, [W3]);
  assert.deepEqual(cal.days.find((d) => d.dayKey === addDaysToKey(TODAY, 1)).lexemeIds, []);
  assert.deepEqual(cal.laterIds, [W4], 'từ đến hạn sau 7 ngày nằm riêng ở laterIds');
  // Không có từ quá hạn thì không có nhóm quá hạn.
  const empty = getReviewCalendar(createEmptyProgress(), TODAY);
  assert.equal(empty.days.length, 8, 'chỉ hôm nay + 7 ngày sau');
  assert.ok(empty.days.every((d) => !d.overdue));
  assert.deepEqual(empty.laterIds, []);
});

test('(17) sổ lỗi: sai chưa sửa thì có, sửa đúng thì rời sổ; nhóm theo từ', () => {
  const W1 = 'hsk3-l10-g1-shuxue';
  const W2 = 'hsk3-l11-g1-jiejue';
  const W3 = 'hsk4-shang-l1-g1-qianzheng';
  const p = progressWithStates({
    [W1]: { level: 0, wrongCount: 2, lastWrongAt: '2026-11-06T01:00:00.000Z', lastCorrectAt: null },
    [W2]: { level: 1, wrongCount: 1, lastWrongAt: '2026-11-05T01:00:00.000Z', lastCorrectAt: '2026-11-06T02:00:00.000Z' },
    [W3]: { level: 0, wrongCount: 1, lastWrongAt: '2026-11-06T03:00:00.000Z', lastCorrectAt: '2026-11-06T02:00:00.000Z' },
  });
  const errors = getErrorWords(p);
  assert.deepEqual(errors.map((e) => e.lexemeId), [W3, W1], 'mới sai nhất trước; W2 đã sửa đúng nên rời sổ');
  assert.equal(errors.find((e) => e.lexemeId === W1).wrongCount, 2);
  // Sửa đúng ở vòng ôn lại 0đ (recordReReview) cũng rời sổ.
  const fixed = recordReReview(p, W1, true);
  assert.deepEqual(getErrorWords(fixed).map((e) => e.lexemeId), [W3]);
  assert.equal(fixed.lexemes[W1].level, 0, 'ôn lại 0đ không đổi level');
  assert.equal(fixed.points, 0, 'ôn lại 0đ không cộng điểm');
  // Sai lại thì quay vào sổ.
  const wrongAgain = recordAnswer(fixed, { lexemeId: W1, correct: false, usedHint: false, activity: 'review' });
  assert.ok(getErrorWords(wrongAgain).some((e) => e.lexemeId === W1));
  // Hồi quy: hai lần ghi trong cùng một mili-giây cho chuỗi ISO bằng nhau —
  // mốc mới phải luôn mới hơn mốc đối diện, không thì sổ lỗi không phân
  // biệt được "sai sau đúng". Dựng trạng thái hai mốc bằng nhau rồi ghi.
  const equalStamps = progressWithStates({
    [W1]: { level: 0, wrongCount: 1, lastWrongAt: '2026-11-06T03:00:00.000Z', lastCorrectAt: '2026-11-06T03:00:00.000Z' },
  });
  const wrongAfterEqual = recordAnswer(equalStamps, { lexemeId: W1, correct: false, usedHint: false, activity: 'review' });
  assert.ok(
    wrongAfterEqual.lexemes[W1].lastWrongAt > equalStamps.lexemes[W1].lastCorrectAt,
    'sai sau đúng (cùng mili-giây) vẫn ghi mốc sai mới hơn',
  );
  assert.ok(getErrorWords(wrongAfterEqual).some((e) => e.lexemeId === W1));
  const correctAfterEqual = recordReReview(equalStamps, W1, true);
  assert.ok(
    correctAfterEqual.lexemes[W1].lastCorrectAt > equalStamps.lexemes[W1].lastWrongAt,
    'đúng sau sai (cùng mili-giây) vẫn ghi mốc đúng mới hơn',
  );
  assert.ok(!getErrorWords(correctAfterEqual).some((e) => e.lexemeId === W1));
});

test('(17) huy hiệu toàn cục: 6 huy hiệu, điều kiện rõ ràng, tính từ tiến độ', () => {
  assert.equal(badges.GLOBAL_BADGES.length, 6);
  const fresh = badges.getGlobalBadgeStates(createEmptyProgress());
  assert.ok(fresh.every((b) => !b.earned), 'profile trống chưa đạt huy hiệu nào');
  // Bạn của thư viện: gặp 100 từ.
  const p100 = createEmptyProgress();
  p100.encountered = Array.from({ length: 100 }, (_, i) => `word-${i}`);
  assert.equal(badges.getGlobalBadgeStates(p100).find((b) => b.def.id === 'friend-of-library').earned, true);
  assert.equal(badges.getGlobalBadgeStates(p100).find((b) => b.def.id === 'friend-of-library').progressText, '100/100 từ đã gặp');
  const p99 = createEmptyProgress();
  p99.encountered = Array.from({ length: 99 }, (_, i) => `word-${i}`);
  assert.equal(badges.getGlobalBadgeStates(p99).find((b) => b.def.id === 'friend-of-library').earned, false);
  // Chăm ôn tập: 20 từ nhớ vững (level ≥ 3, không sai chưa sửa).
  const states = {};
  for (let i = 0; i < 20; i++) states[`w${i}`] = { level: 3, nextDue: TODAY, correctCount: 3 };
  const pKnown = progressWithStates(states);
  assert.equal(badges.getGlobalBadgeStates(pKnown).find((b) => b.def.id === 'diligent-reviewer').earned, true);
  // Hoàn thành HSK 3: đủ 10 quest; HSK 4: đủ 40 quest.
  let p = createEmptyProgress();
  for (const q of badges.HSK3_QUEST_IDS) p = awardQuestCompletion(p, q, 50, q).progress;
  const st3 = badges.getGlobalBadgeStates(p);
  assert.equal(st3.find((b) => b.def.id === 'hsk3-complete').earned, true);
  assert.equal(st3.find((b) => b.def.id === 'hsk4-complete').earned, false);
  assert.equal(st3.find((b) => b.def.id === 'hsk3-complete').progressText, '10/10 quest HSK 3');
  for (const q of badges.HSK4_QUEST_IDS) p = awardQuestCompletion(p, q, 50, q).progress;
  assert.equal(badges.getGlobalBadgeStates(p).find((b) => b.def.id === 'hsk4-complete').earned, true);
  assert.equal(p.points, 50 * 50, '50 quest × 50 điểm');
});

test('(17) streak nhiều ngày (mô phỏng ngày Asia/Ho_Chi_Minh): 7 và 30 ngày', () => {
  // 7 ngày liên tục 2026-11-01 → 2026-11-07.
  let p = createEmptyProgress();
  for (let i = 0; i < 7; i++) p = markActivityDay(p, addDaysToKey('2026-11-01', i));
  assert.equal(p.streak.count, 7);
  assert.equal(p.streak.lastDay, '2026-11-07');
  assert.equal(badges.getGlobalBadgeStates(p).find((b) => b.def.id === 'streak-7').earned, true);
  assert.equal(badges.getGlobalBadgeStates(p).find((b) => b.def.id === 'streak-30').earned, false);
  // Cùng ngày không tăng; cách 2 ngày reset về 1.
  const same = markActivityDay(p, '2026-11-07');
  assert.equal(same.streak.count, 7);
  const gap = markActivityDay(p, '2026-11-09');
  assert.equal(gap.streak.count, 1);
  // 30 ngày liên tục.
  let p30 = createEmptyProgress();
  for (let i = 0; i < 30; i++) p30 = markActivityDay(p30, addDaysToKey('2026-10-08', i));
  assert.equal(p30.streak.count, 30);
  assert.equal(badges.getGlobalBadgeStates(p30).find((b) => b.def.id === 'streak-30').earned, true);
  // Streak chỉ tăng khi có đáp án đúng (recordAnswer), không tăng khi sai.
  const pAns = createEmptyProgress();
  const afterWrong = recordAnswer(pAns, { lexemeId: 'hsk3-l10-g1-shuxue', correct: false, usedHint: false, activity: 'review' });
  assert.equal(afterWrong.streak.count, 0, 'trả lời sai không tính streak');
  const afterRight = recordAnswer(afterWrong, { lexemeId: 'hsk3-l10-g1-shuxue', correct: true, usedHint: false, activity: 'review' });
  assert.equal(afterRight.streak.count, 1, 'trả lời đúng tính streak ngày đó');
});

test('(17) gợi ý: đến hạn → học dở → bài tiếp theo → hoàn thành tất cả', () => {
  assert.deepEqual(
    suggest.getNextSuggestion(null),
    { kind: 'next', text: 'Bắt đầu với "Buổi học đầu tiên" — gặp Minh ở cổng Parabol.', action: 'start', questId: 'first-lesson', dueCount: 0 },
  );
  // Có từ đến hạn → ưu tiên ôn.
  const pDue = progressWithStates({ 'hsk3-l10-g1-shuxue': { level: 1, nextDue: TODAY } });
  const sDue = suggest.getNextSuggestion(pDue);
  assert.equal(sDue.kind, 'due');
  assert.equal(sDue.action, 'calendar');
  assert.equal(sDue.dueCount, 1);
  // Không từ đến hạn, có quest dở → học tiếp.
  const pActive = createEmptyProgress();
  pActive.questState = { questId: 'l11', stepIndex: 3, done: false };
  const sActive = suggest.getNextSuggestion(pActive);
  assert.equal(sActive.kind, 'unfinished');
  assert.equal(sActive.action, 'resume');
  assert.equal(sActive.questId, 'l11');
  // Không dở, chưa xong quest nào → bài tiếp theo là tuyến đầu.
  const sNext = suggest.getNextSuggestion(createEmptyProgress());
  assert.equal(sNext.kind, 'next');
  assert.equal(sNext.questId, 'first-lesson');
  // Xong 1 quest → bài tiếp theo là quest kế tiếp theo thứ tự.
  let pOne = createEmptyProgress();
  pOne = awardQuestCompletion(pOne, 'first-lesson', 50, 'first-lesson').progress;
  assert.equal(suggest.getNextSuggestion(pOne).questId, 'l10-g234');
  // Hoàn thành tất cả 50 quest → done.
  let pAll = createEmptyProgress();
  for (const q of [...badges.HSK3_QUEST_IDS, ...badges.HSK4_QUEST_IDS]) {
    pAll = awardQuestCompletion(pAll, q, 50, q).progress;
  }
  const sDone = suggest.getNextSuggestion(pAll);
  assert.equal(sDone.kind, 'done');
  assert.equal(sDone.action, 'calendar');
});

test('(17) xuất/nhập JSON vòng tròn với dữ liệu HSK 3 + HSK 4, không mất tiến độ', () => {
  let p = createEmptyProgress();
  p = recordAnswer(p, { lexemeId: 'hsk3-l10-g1-shuxue', correct: true, usedHint: false, activity: 'review' });
  p = recordAnswer(p, { lexemeId: 'hsk4-shang-l1-g1-qianzheng', correct: true, usedHint: false, activity: 'review' });
  p = recordAnswer(p, { lexemeId: 'hsk4-xia-l20-g1-daoyou', correct: false, usedHint: false, activity: 'review' });
  p = awardQuestCompletion(p, 'first-lesson', 50, 'first-lesson').progress;
  p = awardQuestCompletion(p, 'hsk4-shang-l1a', 50, 'hsk4-shang-l1a').progress;
  const json = exportProgress(p);
  const back = importProgress(json);
  assert.equal(back.ok, true);
  assert.equal(back.progress.points, p.points);
  assert.equal(back.progress.encountered.length, 3);
  assert.deepEqual(back.progress.badges, ['first-lesson', 'hsk4-shang-l1a']);
  assert.deepEqual(Object.keys(back.progress.completedQuests).sort(), ['first-lesson', 'hsk4-shang-l1a']);
  assert.equal(getWordState(back.progress, 'hsk3-l10-g1-shuxue').level, 1);
  assert.equal(getWordState(back.progress, 'hsk4-xia-l20-g1-daoyou').wrongCount, 1);
  assert.equal(back.progress.streak.count, p.streak.count, 'streak giữ nguyên qua xuất/nhập');
  // Migration: store cũ chỉ có 9 từ bài 10 nhóm 1 + 1 quest vẫn load đủ.
  const oldIds = index.HSK3_LESSON_LEXEMES['hsk3-l10']
    .filter((w) => w.groupId === 'hsk3-l10-g1')
    .map((w) => w.id);
  const oldLexemes = {};
  for (const id of oldIds) {
    oldLexemes[id] = {
      lexemeId: id, level: 1, nextDue: TODAY, lastSeen: null,
      correctCount: 1, wrongCount: 0, lastWrongAt: null, lastCorrectAt: null,
    };
  }
  const migrated = importProgress(JSON.stringify({
    version: 1, lexemes: oldLexemes, encountered: oldIds, points: 90,
    badges: ['first-lesson'], completedQuests: { 'first-lesson': { at: new Date().toISOString(), points: 50 } },
    streak: { count: 3, lastDay: TODAY },
    settings: { soundOn: true, speechRate: 1, showPinyin: true },
    questState: null,
  }));
  assert.equal(migrated.ok, true);
  assert.equal((migrated.warnings ?? []).length, 0);
  assert.equal(migrated.progress.points, 90);
  assert.equal(migrated.progress.streak.count, 3);
  for (const id of oldIds) assert.equal(getWordState(migrated.progress, id).level, 1);
});
