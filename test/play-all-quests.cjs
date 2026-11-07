// play-all-quests.cjs — Chơi TRỌN 48 tuyến còn lại qua trình duyệt:
// 8 tuyến HSK 3 của Bước 6 chưa chơi trọn (l10-g234, l12–l18; l11 đã chơi
// ở play-l11, first-lesson đã chơi ở verify-step4fix) + 40 tuyến HSK 4
// Bước 7 (mỗi bài 2 quest phần 1 + phần 2). Seed đầu đợt: first-lesson đã
// xong (vì menu bài 10 mở quest chưa xong đầu tiên của bài — không seed thì
// bấm bài 10 sẽ mở first-lesson chứ không phải l10-g234).
// bấm "Tiếp tục" (completeQuest) rồi xác minh thưởng 50đ + huy hiệu +
// done=true, 0 lỗi console/page.
//
// Cách chơi (chung cho mọi quest, theo khung L11): chọn bài từ menu →
// chào Minh → tới cửa phòng (teleport + E) → cô giáo → 2 × pick-meaning
// (đáp án đúng lấy từ quest def) → bước 6 (order/choose-number/choose-goal)
// → kiểm tra cuối 5 từ (Q0/Q4 gõ pinyin, Q1/Q3 chọn nghĩa, Q2 nghe chép)
// → kết quả → Tiếp tục. Dữ liệu quest (bước, đáp án đúng, từ kiểm tra
// cuối + pinyin/chữ Hán) đọc từ file biên dịch test/.tmp-learn (biên dịch
// lại đầu script để luôn mới).
//
// Chạy: node test/play-all-quests.cjs (server riêng 127.0.0.1:8334, một
// context WebGL tại một thời điểm — SwiftShader không chịu nổi 2 context
// cùng lúc). Chạy lâu (~20–40 phút cho 48 tuyến); mỗi tuyến lỗi thì ghi
// FAIL, chụp ảnh, reload trang rồi chơi tuyến tiếp theo (không dừng cả đợt).
'use strict';
const { execSync } = require('node:child_process');
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8334/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Biên dịch lại dữ liệu quest/content để luôn mới ------------------------
execSync(
  [
    'npx tsc',
    'lib/learn/types.ts lib/learn/pinyin.ts lib/learn/store.ts lib/learn/speech.ts lib/learn/quest-data.ts',
    'lib/learn/quest-data-hsk4-shang.ts lib/learn/quest-data-hsk4-xia.ts',
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
const questData = require('./.tmp-learn/lib/learn/quest-data.js');
const index3 = require('./.tmp-learn/content/hsk3-index.js');
const index4 = require('./.tmp-learn/content/hsk4-index.js');
const LEXEME_BY_ID = {};
for (const l of [...index3.ALL_HSK3_LEXEMES, ...index4.ALL_HSK4_LEXEMES]) LEXEME_BY_ID[l.id] = l;

// --- Danh sách 48 tuyến: questId → lessonId (nút menu) ----------------------
const QUESTS = [];
for (const qid of ['l10-g234', 'l12', 'l13', 'l14', 'l15', 'l16', 'l17', 'l18']) {
  QUESTS.push({ questId: qid, lessonId: qid === 'l10-g234' ? 'hsk3-l10' : `hsk3-${qid}` });
}
for (const [lessonId, qids] of Object.entries(questData.HSK4_LESSON_QUEST_IDS)) {
  for (const qid of qids) QUESTS.push({ questId: qid, lessonId });
}

const report = { tool: 'play-all-quests', at: new Date().toISOString(), quests: [], consoleErrors: [], pageErrors: [] };
function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', '8334', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
    proc.on('error', reject);
    const t0 = Date.now();
    const tick = () => {
      fetch(BASE, { method: 'HEAD' }).then(() => resolve(proc)).catch(() => {
        if (Date.now() - t0 > 15000) reject(new Error('server không lên sau 15 s'));
        else setTimeout(tick, 300);
      });
    };
    tick();
  });
}
const waitText = async (page, text, timeout = 60000) => {
  await page.waitForFunction((t) => document.body.innerText.includes(t), text, { timeout });
};
const clickTestId = async (page, id) => {
  await page.waitForSelector(`[data-testid="${id}"]`, { timeout: 60000 });
  await page.click(`[data-testid="${id}"]`);
};
const getProgress = (page) => page.evaluate(() => {
  const raw = window.localStorage.getItem('bkhn-progress-v1');
  return raw ? JSON.parse(raw) : null;
});

/** Chơi trọn 1 quest; trả { ok, detail }. Lỗi thì throw với message rõ. */
async function playQuest(page, q) {
  const def = questData.getQuestDef(q.questId);
  if (!def) throw new Error(`registry không có quest ${q.questId}`);
  // 1. Menu → chọn bài.
  await page.click('#change-lesson');
  await page.waitForSelector('[data-testid="lesson-picker"]', { timeout: 30000 });
  await clickTestId(page, `lesson-pick-${q.lessonId}`);
  await page.waitForFunction(
    (qid) => {
      const raw = window.localStorage.getItem('bkhn-progress-v1');
      if (!raw) return false;
      const qs = JSON.parse(raw).questState;
      return qs && qs.questId === qid && qs.stepIndex === 0;
    },
    q.questId,
    { timeout: 30000 },
  );
  // 2. Chào Minh → tới cửa phòng.
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'Đi tới cửa phòng học');
  await clickTestId(page, 'quest-close-panel');
  await page.evaluate(() => window.__bkhn.teleport(-58, -44));
  await waitText(page, 'Vào phòng học');
  await page.keyboard.press('e');
  await waitText(page, 'Phòng học mô phỏng');
  // 3. Cô giáo → 2 × pick-meaning.
  await clickTestId(page, 'quest-continue');
  for (const stepNo of [3, 4]) {
    const step = def.steps[stepNo];
    if (step.kind !== 'pick-meaning') throw new Error(`${q.questId} bước ${stepNo} không phải pick-meaning (kind=${step.kind})`);
    const correctIdx = step.options.findIndex((o) => o.correct);
    if (correctIdx < 0) throw new Error(`${q.questId} bước ${stepNo} không có đáp án đúng`);
    await waitText(page, step.scenario.slice(0, 20));
    await clickTestId(page, `meaning-option-${correctIdx}`);
    // Feedback pick-meaning là câu explain của đáp án đúng (không có tiền tố
    // "Đúng rồi!") — chờ phần đầu câu explain hiện ra.
    await waitText(page, step.options[correctIdx].explain.slice(0, 20));
    await clickTestId(page, 'quest-continue');
  }
  // 4. Bước 6: order / choose-number / choose-goal.
  const s6 = def.steps[5];
  if (s6.kind === 'order') {
    await waitText(page, 'Xếp các thẻ từ');
    for (const t of s6.tiles) await clickTestId(page, `order-tile-${t}`);
    await clickTestId(page, 'order-check');
    await waitText(page, 'Đúng rồi!');
  } else if (s6.kind === 'choose-number') {
    await waitText(page, s6.zh.slice(0, 12));
    await clickTestId(page, `number-option-${s6.correct}`);
    await waitText(page, 'Đúng rồi!');
  } else if (s6.kind === 'choose-goal') {
    await waitText(page, s6.zh.slice(0, 12));
    await clickTestId(page, 'goal-option-0');
    await waitText(page, 'Đã ghi nhận mục tiêu');
  } else {
    throw new Error(`${q.questId} bước 6 kind lạ: ${s6.kind}`);
  }
  await clickTestId(page, 'quest-continue');
  // 5. Kiểm tra cuối 5 từ: Q0/Q4 gõ pinyin, Q1/Q3 chọn nghĩa, Q2 nghe chép.
  const review = def.steps[6];
  if (review.kind !== 'review' || review.lexemeIds.length !== 5) {
    throw new Error(`${q.questId} bước kiểm tra cuối không đúng 5 từ`);
  }
  await waitText(page, 'Kiểm tra cuối');
  for (let i = 0; i < 5; i++) {
    const target = LEXEME_BY_ID[review.lexemeIds[i]];
    if (!target) throw new Error(`${q.questId} review Q${i}: không tìm thấy từ ${review.lexemeIds[i]}`);
    if (i === 2) {
      await page.fill('#review-dictation', target.hanzi);
    } else if (i % 2 === 0) {
      await page.fill('#review-pinyin', target.pinyin);
    } else {
      await page.click(`[data-testid="review-meaning-${target.id}"]`);
      await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
      await clickTestId(page, 'review-next');
      continue;
    }
    await clickTestId(page, 'review-check');
    await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
    await clickTestId(page, 'review-next');
  }
  await waitText(page, 'Bạn đã kiểm tra xong 5 từ');
  await clickTestId(page, 'review-done');
  // 6. Màn kết quả → Tiếp tục → xác minh thưởng + huy hiệu + done.
  await page.waitForSelector('[data-testid="result-continue"]', { timeout: 60000 });
  const pointsBefore = (await getProgress(page)).points;
  await clickTestId(page, 'result-continue');
  await sleep(1200);
  const p = await getProgress(page);
  const done = p && p.completedQuests && p.completedQuests[q.questId];
  if (!done) throw new Error(`${q.questId} chưa vào completedQuests sau khi bấm Tiếp tục`);
  if (done.points !== 50) throw new Error(`${q.questId} thưởng ${done.points}đ, kỳ vọng 50đ`);
  if (!(p.badges || []).includes(q.questId)) throw new Error(`${q.questId} thiếu huy hiệu ${q.questId}`);
  if (!p.questState || p.questState.done !== true) throw new Error(`${q.questId} questState chưa done`);
  return `thưởng 50đ, điểm ${pointsBefore} → ${p.points}`;
}

async function main() {
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: EXE,
      args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
    });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => report.pageErrors.push(String(e)));

    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Seed: tuyến bài 10 nhóm 1 (first-lesson) đã hoàn thành — vì menu bài 10
    // luôn mở quest chưa xong ĐẦU TIÊN của bài, nên không seed thì bấm bài 10
    // sẽ mở first-lesson chứ không phải l10-g234 (tuyến này đã chơi trọn ở
    // verify-step4fix 24/24). Seed theo đúng mẫu smoke-step6 lượt B.
    await page.evaluate(() => {
      window.localStorage.setItem('bkhn-progress-v1', JSON.stringify({
        version: 1, lexemes: {}, encountered: [], events: [], points: 50,
        badges: ['first-lesson'],
        completedQuests: { 'first-lesson': { at: new Date().toISOString(), points: 50 } },
        streak: { count: 1, lastDay: null },
        settings: { soundOn: true, speechRate: 1, showPinyin: true },
        questState: null,
      }));
    });
    await page.waitForSelector('#enter-campus', { timeout: 30000 });
    await page.click('#enter-campus');
    await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
    await sleep(2500);
    console.log(`Bắt đầu chơi ${QUESTS.length} tuyến (đã seed first-lesson xong).`);

    for (const q of QUESTS) {
      const t0 = Date.now();
      try {
        const detail = await playQuest(page, q);
        report.quests.push({ questId: q.questId, ok: true, detail, ms: Date.now() - t0 });
        console.log(`PASS [${q.questId}] ${detail} (${Math.round((Date.now() - t0) / 1000)}s)`);
      } catch (e) {
        const detail = String((e && e.message) || e);
        report.quests.push({ questId: q.questId, ok: false, detail, ms: Date.now() - t0 });
        console.log(`FAIL [${q.questId}] ${detail}`);
        try {
          await page.screenshot({ path: path.join(OUT, `play-all-${q.questId}-fail.png`), timeout: 120000 });
        } catch { /* bỏ qua lỗi chụp */ }
        // Khôi phục: reload trang (tiến độ trong localStorage còn nguyên),
        // vào lại trường rồi chơi tuyến tiếp theo.
        try {
          await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
          await page.waitForSelector('#enter-campus', { timeout: 30000 });
          await page.click('#enter-campus');
          await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
          await sleep(2500);
        } catch (re) {
          console.log(`Không khôi phục được sau lỗi ${q.questId}: ${String(re)} — DỪNG ĐỢT.`);
          break;
        }
      }
    }
    await ctx.close();
    const passed = report.quests.filter((x) => x.ok).length;
    console.log(`\nPLAY-ALL: ${passed}/${report.quests.length} tuyến PASS; ` +
      `console errors: ${report.consoleErrors.length}; page errors: ${report.pageErrors.length}`);
    if (report.consoleErrors.length) console.log('consoleErrors:', report.consoleErrors.slice(0, 5));
    if (report.pageErrors.length) console.log('pageErrors:', report.pageErrors.slice(0, 5));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
  fs.writeFileSync(path.join(OUT, 'play-all-quests.json'), JSON.stringify(report, null, 2));
  console.log('report: test-shots/play-all-quests.json');
  const failed = report.quests.filter((x) => !x.ok);
  if (failed.length > 0 || report.consoleErrors.length > 0 || report.pageErrors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('play-all-quests lỗi:', e);
  process.exitCode = 1;
});
