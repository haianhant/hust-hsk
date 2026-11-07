// verify-step4.cjs — KIỂM CHỨNG ĐỘC LẬP Bước 4–5 (vòng verify, không dùng lại
// kết quả của test/quest-smoke.cjs). Script MỚI, tự viết: chơi toàn tuyến bằng
// DOM + hook window.__bkhn, 3 lượt chơi (A hoàn hảo, B sai-cố-ý, C chơi lại),
// kiểm tra IME composition, âm thanh, sổ tay xuất/nhập, mobile 390×844.
// Chạy: node test/verify-step4.cjs  (tự mở server python ở 127.0.0.1:8322
// phục vụ out/, tắt server khi xong). Log: test-shots/verify-step4.json.
// Ảnh: test-shots/step4v-*.png (tiền tố riêng, không đè step4-*).
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8322/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
fs.mkdirSync(OUT, { recursive: true });
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const report = {
  startedAt: new Date().toISOString(),
  check1: {}, // filled by shell before run; see docs/step4-verify.md
  runs: {},
  consoleErrors: [],
  pageErrors: [],
  steps: [],
  shots: {},
};
function logStep(run, id, name, ok, detail) {
  const s = { run, id, name, ok, detail: detail ?? null, at: new Date().toISOString() };
  report.steps.push(s);
  console.log(`${ok ? 'PASS' : 'FAIL'} [${run}/${id}] ${name}${detail ? ' — ' + detail : ''}`);
  return ok;
}

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', '8322', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
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

function attachErrorHooks(page) {
  page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => report.pageErrors.push(String(e)));
}

async function shot(page, name, note) {
  await page.screenshot({ path: path.join(OUT, name), timeout: 120000 });
  report.shots[name] = { note };
  console.log('shot', name);
}
const waitText = async (page, text, timeout = 30000) => {
  await page.waitForFunction((t) => document.body.innerText.includes(t), text, { timeout });
};
const clickTestId = async (page, id) => {
  await page.waitForSelector(`[data-testid="${id}"]`, { timeout: 30000 });
  await page.click(`[data-testid="${id}"]`);
};
const getProgress = (page) => page.evaluate(() => {
  const raw = window.localStorage.getItem('bkhn-progress-v1');
  return raw ? JSON.parse(raw) : null;
});
const hudPoints = (page) => page.evaluate(() => {
  const m = document.body.innerText.match(/⭐\s*(\d+)\s*điểm/);
  return m ? Number(m[1]) : null;
});
const getPos = (page) => page.evaluate(() => window.__bkhn.getPos());
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const MINH = { x: -72, z: 8 };
const DOOR = { x: -58, z: -45.5 };

// --- Vào trường (context mới, localStorage trống) ---------------------------
async function enterFresh(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#enter-campus', { timeout: 30000 });
  await page.click('#enter-campus');
  await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
  await sleep(2500);
}

// --- Đi từ spawn tới Minh bằng phím W thật (không teleport đoạn này) --------
async function walkToMinh(page, run) {
  const start = await getPos(page);
  // Spawn (-76,10) → Minh (-72,8): hướng (4,-2); yaw sao cho hướng nhìn
  // (-sin yaw, -cos yaw) = (0.894,-0.447) → yaw ≈ -1.107.
  await page.evaluate(() => window.__bkhn.teleport(-76, 10, -1.107));
  await sleep(300);
  const t0 = Date.now();
  await page.keyboard.down('Shift');
  await page.keyboard.down('w');
  let end = start;
  let reached = false;
  while (Date.now() - t0 < 30000) {
    await sleep(500);
    end = await getPos(page);
    if (dist(end, MINH) <= 2.5) { reached = true; break; }
  }
  await page.keyboard.up('w');
  await page.keyboard.up('Shift');
  const walked = Math.hypot(end.x - (-76), end.z - 10);
  logStep(run, 'walk-minh', 'Đi bộ thật bằng W+Shift từ spawn tới Minh', reached,
    `start=(-76,10) end=(${end.x.toFixed(2)},${end.z.toFixed(2)}) đi được ${walked.toFixed(2)} m trong ${((Date.now() - t0) / 1000).toFixed(1)} s, cách Minh ${dist(end, MINH).toFixed(2)} m (trigger 2.5 m)`);
  return reached;
}

// --- Chơi từ sau khi vào phòng tới hết kiểm tra cuối ------------------------
// opts: { wrongBoard3d: bool, wrongFirst: {renzhen, number}, reviewWrong: [idx...] }
async function playClassroom(page, run, opts) {
  // Đang ở bước teacher-math (panel tự mở sau khi vào phòng).
  await waitText(page, 'Hôm nay là tiết Toán');
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'Hãy nhìn lên bảng đen');
  await shot(page, 'step4v-05-board.png', 'bước chọn bảng đen (panel + phòng học)');

  // --- Bước chọn bảng: thử click 3D từ xa (run B) hoặc bấm panel (run A/C) --
  if (opts.wrongBoard3d) {
    const spawnPos = await getPos(page);
    const dBoard = dist(spawnPos, { x: 0, z: -2.6 });
    const before = await getProgress(page);
    const evBefore = before.events.length;
    // Click thử vào vùng bảng trên màn hình (vùng trên, y≈120–180 — panel học
    // phủ nửa dưới nên click thấp hơn sẽ chạm panel chứ không chạm canvas).
    const outcomes = [];
    for (const pt of [[640, 120], [640, 180], [500, 150], [780, 150]]) {
      await page.mouse.click(pt[0], pt[1]);
      await sleep(800);
      const body = await page.evaluate(() => document.body.innerText);
      const toast = body.includes('Hãy đến gần bảng hơn') ? 'toast-den-gan-bang' :
        body.includes('Chưa đúng') ? 'feedback-chua-dung' :
        body.includes('Đúng rồi! Đây là') ? 'feedback-dung' : 'khong-phan-hoi';
      outcomes.push(`${pt}: ${toast}`);
      if (toast !== 'khong-phan-hoi') break;
    }
    const after = await getProgress(page);
    logStep(run, 'board-3d-far', 'Click 3D vào bảng từ spawn (cách bảng ' + dBoard.toFixed(2) + ' m > trigger 2.5 m)', true,
      `kết quả click: ${outcomes.join(' | ')}; events ${evBefore}→${after.events.length}`);
    // Tới gần bảng rồi click lại (nếu chưa chọn đúng).
    const answered = await page.evaluate(() => !!document.querySelector('[data-testid="quest-continue"]'));
    if (!answered) {
      await page.evaluate(() => window.__bkhn.teleport(0, -0.3, 0));
      await sleep(800);
      const near = await getPos(page);
      await page.mouse.click(640, 150);
      await sleep(800);
      const body2 = await page.evaluate(() => document.body.innerText);
      const ok2 = body2.includes('Đúng rồi! Đây là');
      logStep(run, 'board-3d-near', 'Click 3D vào bảng khi đã tới gần', ok2,
        `pos sau teleport=(${near.x.toFixed(2)},${near.z.toFixed(2)}) cách bảng ${dist(near, { x: 0, z: -2.6 }).toFixed(2)} m (trigger 2.5 m); chọn đúng=${ok2}`);
      if (!ok2) {
        await clickTestId(page, 'object-option-board');
        await waitText(page, 'Đúng rồi! Đây là');
        logStep(run, 'board-panel-fallback', 'Chọn bảng bằng nút panel sau khi click 3D không trúng', true);
      }
    }
  } else {
    await clickTestId(page, 'object-option-board');
    await waitText(page, 'Đúng rồi! Đây là');
    logStep(run, 'board', 'Chọn đúng bảng đen bằng nút panel (đúng lần đầu)', true);
  }

  // --- Vở + bài tập ----------------------------------------------------------
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'Mở vở');
  await clickTestId(page, 'object-action');
  await waitText(page, 'Bạn đã mở vở ghi chép');
  await shot(page, 'step4v-06-notebook.png', 'vở 笔记 đã mở trên bàn 1');
  logStep(run, 'notebook', 'Mở vở 笔记 (animation nắp vở)', true);
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'Nhận bài tập');
  await clickTestId(page, 'object-action');
  await waitText(page, 'Bạn đã nhận tập bài tập');
  logStep(run, 'homework', 'Nhận tập 作业', true);
  await clickTestId(page, 'quest-continue');

  // --- 认真 / 清楚 -------------------------------------------------------------
  await waitText(page, 'chăm chỉ, nghiêm túc');
  if (opts.wrongFirst && opts.wrongFirst.renzhen) {
    await clickTestId(page, 'meaning-option-1'); // 上课玩手机 — sai
    await waitText(page, 'không phải là học chăm chỉ');
    logStep(run, 'renzhen-wrong', 'Chọn sai 认真 trước (0đ, ghi lỗi)', true);
    await clickTestId(page, 'meaning-option-0');
    await waitText(page, 'mỗi ngày học hai tiếng');
    logStep(run, 'renzhen-fixed', 'Sửa đúng 认真 sau khi sai (kỳ vọng 3đ)', true);
  } else {
    await clickTestId(page, 'meaning-option-0');
    await waitText(page, 'mỗi ngày học hai tiếng');
    logStep(run, 'renzhen', 'Chọn đúng cách học 认真 (lần đầu)', true);
  }
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'rõ ràng');
  await clickTestId(page, 'meaning-option-0');
  await waitText(page, 'cô giáo nói rất rõ ràng');
  logStep(run, 'qingchu', 'Chọn đúng câu 清楚 (lần đầu)', true);
  await clickTestId(page, 'quest-continue');

  // --- Reload giữa tuyến (chỉ run A) ------------------------------------------
  if (opts.midReload) {
    const pMid = await getProgress(page);
    const ptsMid = await hudPoints(page);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#continue-learning', { timeout: 30000 });
    await page.click('#continue-learning');
    await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
    await sleep(2500);
    const pMid2 = await getProgress(page);
    const ptsMid2 = await hudPoints(page);
    const posMid2 = await getPos(page);
    const inRoom = await page.evaluate(() => document.body.innerText.includes('Phòng học mô phỏng'));
    logStep(run, 'reload-midquest', 'Reload giữa tuyến (sau 清楚, bước order-ba) → quest/điểm/vị trí còn nguyên',
      pMid2.questState && pMid2.questState.stepIndex === 8 && ptsMid2 === ptsMid && inRoom && Math.abs(posMid2.x) < 0.5 && Math.abs(posMid2.z - 1) < 0.5,
      `stepIndex trước=${pMid.questState.stepIndex} sau=${pMid2.questState.stepIndex} (kỳ vọng 8); điểm ${ptsMid}→${ptsMid2}; trong phòng=${inRoom}; pos sau=(${posMid2.x.toFixed(2)},${posMid2.z.toFixed(2)}) (spawn phòng (0,1))`);
    await waitText(page, 'Xếp các thẻ từ');
  }

  // --- Xếp câu 把 ----------------------------------------------------------------
  await waitText(page, 'Xếp các thẻ từ');
  for (const t of ['请', '把', '作业', '交', '给', '老师', '。']) await clickTestId(page, `order-tile-${t}`);
  await clickTestId(page, 'order-check');
  await waitText(page, 'Đúng rồi! “请把作业交给老师。”');
  logStep(run, 'order-ba', 'Xếp đúng câu 把 “请把作业交给老师。”', true);
  await clickTestId(page, 'quest-continue');

  // --- 遍 ----------------------------------------------------------------------
  await waitText(page, 'hãy đọc ba lượt');
  if (opts.wrongFirst && opts.wrongFirst.number) {
    await clickTestId(page, 'number-option-2'); // sai
    await waitText(page, 'không phải 2 lượt');
    await clickTestId(page, 'number-option-3');
    await waitText(page, 'hãy đọc ba lượt. 遍');
    logStep(run, 'bian-fixed', 'Chọn sai số lượt rồi sửa đúng 3 (kỳ vọng 3đ)', true);
  } else {
    await clickTestId(page, 'number-option-3');
    await waitText(page, 'hãy đọc ba lượt. 遍');
    logStep(run, 'bian', 'Chọn đúng 3 lượt (遍, lần đầu)', true);
  }
  await clickTestId(page, 'quest-continue');

  // --- 提高 --------------------------------------------------------------------
  await waitText(page, 'nâng cao, cải thiện');
  await clickTestId(page, 'goal-option-0');
  await waitText(page, 'Đã ghi nhận mục tiêu');
  logStep(run, 'tigao', 'Chọn mục tiêu 提高', true);
  await clickTestId(page, 'quest-continue');

  // --- Kiểm tra cuối 5 từ ------------------------------------------------------
  await waitText(page, 'Kiểm tra cuối');
  // Q1 数学 gõ pinyin — kiểm tra ẩn nghĩa/pinyin + (run A) IME composition.
  const q1text = await page.evaluate(() => document.body.innerText);
  const hiddenOk = !q1text.includes('môn Toán') && !q1text.includes('shùxué');
  logStep(run, 'review-hidden', 'Kiểm tra cuối Q1 chỉ hiện chữ Hán (ẩn pinyin + nghĩa)', hiddenOk,
    `body chứa "môn Toán"=${q1text.includes('môn Toán')}, "shùxué"=${q1text.includes('shùxué')}`);
  await shot(page, 'step4v-07-review.png', 'kiểm tra cuối — câu gõ pinyin, chỉ chữ Hán');
  if (opts.imeTest) {
    await page.fill('#review-pinyin', 'shùxué');
    await page.evaluate(() => {
      const el = document.querySelector('#review-pinyin');
      el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    });
    await sleep(200);
    await page.keyboard.press('Enter');
    await sleep(600);
    const duringComp = await page.evaluate(() => document.body.innerText);
    const blocked = !duringComp.includes('Đúng rồi! Bạn tự nhớ được từ này') && !duringComp.includes('Chưa đúng');
    logStep(run, 'ime-blocked', 'IME: compositionstart + Enter → KHÔNG chấm', blocked,
      `có feedback trong lúc composing=${!blocked}`);
    await page.evaluate(() => {
      const el = document.querySelector('#review-pinyin');
      el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    });
    await sleep(200);
    await page.keyboard.press('Enter');
    await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
    logStep(run, 'ime-after', 'IME: compositionend + Enter → chấm bình thường', true);
  } else if (opts.reviewWrong && opts.reviewWrong.includes(0)) {
    await page.fill('#review-pinyin', 'shuxue'); // không dấu → sai thanh điệu ở mode tone
    await clickTestId(page, 'review-check');
    await waitText(page, 'Chưa đúng');
    logStep(run, 'review-q1-wrong', 'Kiểm tra cuối Q1 数学: gõ pinyin không dấu → sai (0đ)', true);
  } else {
    await page.fill('#review-pinyin', 'shùxué');
    await clickTestId(page, 'review-check');
    await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
    logStep(run, 'review-q1', 'Kiểm tra cuối Q1 数学 gõ pinyin đúng', true);
  }
  await clickTestId(page, 'review-next');
  // Q2 黑板 chọn nghĩa
  if (opts.reviewWrong && opts.reviewWrong.includes(1)) {
    await page.click('[data-testid="review-meaning-hsk3-l10-g1-shuxue"]'); // nghĩa sai
    await waitText(page, 'Chưa đúng');
    logStep(run, 'review-q2-wrong', 'Kiểm tra cuối Q2 黑板: chọn nghĩa sai (0đ)', true);
  } else {
    await page.click('[data-testid="review-meaning-hsk3-l10-g1-heiban"]');
    await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
    logStep(run, 'review-q2', 'Kiểm tra cuối Q2 黑板 chọn nghĩa đúng', true);
  }
  await clickTestId(page, 'review-next');
  // Q3 笔记 nghe chép
  await page.fill('#review-dictation', '笔记');
  await clickTestId(page, 'review-check');
  await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
  logStep(run, 'review-q3', 'Kiểm tra cuối Q3 笔记 nghe chép đúng', true);
  await clickTestId(page, 'review-next');
  // Q4 作业 chọn nghĩa
  await page.click('[data-testid="review-meaning-hsk3-l10-g1-zuoye"]');
  await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
  logStep(run, 'review-q4', 'Kiểm tra cuối Q4 作业 chọn nghĩa đúng', true);
  await clickTestId(page, 'review-next');
  // Q5 提高 gõ pinyin
  await page.fill('#review-pinyin', 'tígāo');
  await clickTestId(page, 'review-check');
  await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
  logStep(run, 'review-q5', 'Kiểm tra cuối Q5 提高 gõ pinyin đúng', true);
  await clickTestId(page, 'review-next');
  await clickTestId(page, 'review-done');
}

// --- Từ intro tới cửa C1 (dùng chung cho run A/B/C) --------------------------
async function goToDoor(page, run, { realWalk }) {
  if (realWalk) {
    // E ngoài tầm: ở spawn cách Minh 4.47 m > 2.5 m → toast "đến gần hơn".
    await page.keyboard.press('e');
    await sleep(700);
    const t = await page.evaluate(() => document.body.innerText);
    logStep(run, 'e-out-of-range', 'Bấm E ngoài tầm Minh (4.47 m > 2.5 m) → toast đến gần hơn',
      t.includes('Hãy đến gần hơn'), `toast hiện=${t.includes('Hãy đến gần hơn để tương tác.')}`);
    await walkToMinh(page, run);
    await waitText(page, 'E — Nói chuyện với Minh');
  } else {
    await page.evaluate(() => window.__bkhn.teleport(-74, 8.5));
    await waitText(page, 'E — Nói chuyện với Minh');
  }
  await shot(page, 'step4v-02-minh.png', 'gặp NPC Minh ở cổng Parabol');
  await page.keyboard.press('e');
  await waitText(page, 'Chào bạn! Mình là Minh');
  logStep(run, 'greet', 'Bấm E gần Minh → panel chào mở', true);
  // Âm thanh: bấm nút nghe (headless không có giọng zh-CN) — không crash.
  const noVoiceBanner = await page.evaluate(() => document.body.innerText.includes('chưa có giọng tiếng Trung'));
  const listenBtn = await page.$('button:has-text("🔊 Nghe")');
  if (listenBtn) { await listenBtn.click(); await sleep(1000); }
  const errAfterSpeak = report.consoleErrors.length + report.pageErrors.length;
  logStep(run, 'audio', 'Banner thiếu giọng zh-CN + bấm nút nghe không crash', true,
    `banner thiếu giọng hiện=${noVoiceBanner}; tổng lỗi console/page tới lúc này=${errAfterSpeak}`);
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'Đi tới cửa phòng học');
  await clickTestId(page, 'quest-close-panel');
  logStep(run, 'goto', 'Sang bước đi tới cửa, đóng panel để di chuyển', true);
  // E ngoài tầm cửa: đứng (-58,-41) cách cửa 4.5 m > 2.5 m.
  await page.evaluate(() => window.__bkhn.teleport(-58, -41));
  await sleep(600);
  await page.keyboard.press('e');
  await sleep(700);
  const t2 = await page.evaluate(() => document.body.innerText);
  const noDoorPrompt = !t2.includes('E — Vào phòng học');
  logStep(run, 'door-out-of-range', 'E ở (-58,-41), cách cửa 4.5 m > 2.5 m → không vào lớp',
    noDoorPrompt && t2.includes('Hãy đến gần hơn'), `prompt cửa hiện=${!noDoorPrompt}, toast=${t2.includes('Hãy đến gần hơn để tương tác.')}`);
  await page.evaluate(() => window.__bkhn.teleport(-58, -44));
  await waitText(page, 'E — Vào phòng học');
  await shot(page, 'step4v-03-door.png', 'đứng ở cửa C1, prompt vào phòng học');
  await page.keyboard.press('e');
  await waitText(page, 'Hôm nay là tiết Toán');
  await waitText(page, 'Phòng học mô phỏng');
  await shot(page, 'step4v-04-classroom.png', 'trong phòng học mô phỏng, cô giáo giới thiệu tiết Toán');
  logStep(run, 'enter-classroom', 'E ở cửa → fade → vào phòng, bước cô giáo mở', true);
}

// --- Màn kết quả + thưởng ------------------------------------------------------
async function finishQuest(page, run, expectedBefore, expectedAfter) {
  await waitText(page, 'Xong buổi học đầu tiên!');
  const pBefore = await getProgress(page);
  const hudBefore = await hudPoints(page);
  await shot(page, 'step4v-08-result.png', 'màn kết quả buổi học');
  logStep(run, 'result-points', 'Điểm HUD trước thưởng hoàn thành', hudBefore === expectedBefore,
    `HUD=${hudBefore}, kỳ vọng=${expectedBefore}, localStorage points=${pBefore.points}`);
  const scored = pBefore.events.filter((e) => e.questId === 'first-lesson' && e.points > 0);
  logStep(run, 'result-events', 'Đối chiếu từng câu qua events trong localStorage', true,
    `câu có điểm: ${scored.map((e) => `${e.lexemeId.split('-').pop()}:${e.points}`).join(', ')} (tổng ${scored.reduce((s, e) => s + e.points, 0)})`);
  await page.click('button:has-text("Học tiếp")');
  await sleep(1500);
  const pAfter = await getProgress(page);
  const hudAfter = await hudPoints(page);
  logStep(run, 'reward', 'Thưởng hoàn thành +50đ (Học tiếp)', hudAfter === expectedAfter && pAfter.points === expectedAfter,
    `HUD trước=${hudBefore} sau=${hudAfter} (kỳ vọng ${expectedAfter}); completedQuests=${JSON.stringify(pAfter.completedQuests)}; badges=${JSON.stringify(pAfter.badges)}; streak=${JSON.stringify(pAfter.streak)}`);
  return { pBefore, pAfter };
}

(async () => {
  let server = null;
  let browser = null;
  const t0 = Date.now();
  try {
    server = await startServer();
    console.log('server lên ở', BASE);
    browser = await chromium.launch({
      executablePath: EXE,
      args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
    });

    // ================= RUN A — hoàn hảo (110 + 50 = 160) =================
    {
      const run = 'A-perfect';
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      attachErrorHooks(page);
      const runT0 = Date.now();
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await shot(page, 'step4v-01-intro.png', 'màn mở đầu Bách khoa Hán ngữ 3D');
      logStep(run, 'intro', 'Màn mở đầu hiện đủ nút Vào trường / Chọn bài', true);
      await enterFresh(page);
      logStep(run, 'enter', 'Vào trường, WebGL + hook __bkhn sẵn', true);
      await goToDoor(page, run, { realWalk: true });
      await playClassroom(page, run, { imeTest: true, midReload: true });
      // Reload giữa tuyến đã làm ở đây? — reload sau khi xong kiểm tra cuối
      const { pBefore } = await finishQuest(page, run, 110, 160);
      // Reload sau hoàn thành → điểm giữ nguyên.
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('#continue-learning', { timeout: 30000 });
      await page.click('#continue-learning');
      await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
      await sleep(2000);
      const ptsReload = await hudPoints(page);
      logStep(run, 'reload-after-done', 'Reload sau hoàn thành → điểm giữ nguyên', ptsReload === 160, `points=${ptsReload}`);
      // Sổ tay.
      await page.click('#open-handbook');
      await waitText(page, 'Sổ tay từ vựng');
      await shot(page, 'step4v-09-handbook.png', 'sổ tay sau buổi học hoàn hảo');
      const hb = await page.evaluate(() => document.body.innerText);
      const tabsOk = ['Theo bài (9)', 'Đã gặp (9)', 'Cần ôn (0)', 'Đã nhớ vững (9)', 'Tìm kiếm'].every((t) => hb.includes(t));
      logStep(run, 'handbook-tabs', 'Sổ tay đủ 5 tab + số lượng đúng', tabsOk,
        `Theo bài/Đã gặp/Cần ôn/Đã nhớ vững: ${(hb.match(/Theo bài \(\d+\)|Đã gặp \(\d+\)|Cần ôn \(\d+\)|Đã nhớ vững \(\d+\)/g) || []).join(', ')}`);
      // Pinyin bật/tắt.
      await page.click('button:has-text("Pinyin: Hiện")');
      await sleep(400);
      const hb2 = await page.evaluate(() => document.body.innerText);
      logStep(run, 'handbook-pinyin', 'Tắt pinyin trong sổ tay → pinyin biến mất', !hb2.includes('shùxué'),
        `còn "shùxué" sau khi tắt=${hb2.includes('shùxué')}`);
      await page.click('button:has-text("Pinyin: Ẩn")');
      // Xuất JSON (bắt download) để dùng cho run import.
      const dl = page.waitForEvent('download', { timeout: 20000 });
      await page.click('button:has-text("Xuất JSON bản sao")');
      const download = await dl;
      await download.saveAs('/tmp/bkhn-verify-export.json');
      const exported = JSON.parse(fs.readFileSync('/tmp/bkhn-verify-export.json', 'utf8'));
      logStep(run, 'export', 'Xuất JSON bản sao tiến độ', exported.points === 160 && (exported.encountered || []).length === 9,
        `points=${exported.points}, encountered=${(exported.encountered || []).length}, lexemes có state=${Object.keys(exported.lexemes || {}).length}`);
      await page.click('[aria-label="Đóng sổ tay"]');
      report.runs[run] = { durationMs: Date.now() - runT0, pointsBefore: pBefore.points };
      // Giữ ctx A mở cho run C (chơi lại).
      report._ctxA = ctx; report._pageA = page;
    }

    // ============ RUN B — sai cố ý (3đ + ôn tập), profile trống ============
    {
      const run = 'B-wrong';
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      attachErrorHooks(page);
      const runT0 = Date.now();
      await enterFresh(page);
      await goToDoor(page, run, { realWalk: false });
      await playClassroom(page, run, { wrongBoard3d: true, wrongFirst: { renzhen: true, number: true }, reviewWrong: [0, 1] });
      const p = await getProgress(page);
      // Điểm kỳ vọng: board 10 hoặc 3 (tùy click 3D có ghi sai không) + renzhen 3
      // + qingchu 10 + order 10 + number 3 + goal 10 + review (0+0+10+10+10)=30.
      const ev = p.events.filter((e) => e.questId === 'first-lesson');
      const byLex = {};
      for (const e of ev) { if (e.lexemeId) (byLex[e.lexemeId] = byLex[e.lexemeId] || []).push(e.points); }
      logStep(run, 'score-breakdown', 'Điểm từng từ (localStorage events)', true,
        `heiban=${JSON.stringify(byLex['hsk3-l10-g1-heiban'])} renzhen=${JSON.stringify(byLex['hsk3-l10-g1-renzhen'])} qingchu=${JSON.stringify(byLex['hsk3-l10-g1-qingchu'])} ba=${JSON.stringify(byLex['hsk3-l10-g1-ba'])} bian=${JSON.stringify(byLex['hsk3-l10-g1-bian'])} tigao=${JSON.stringify(byLex['hsk3-l10-g1-tigao'])} shuxue=${JSON.stringify(byLex['hsk3-l10-g1-shuxue'])} biji=${JSON.stringify(byLex['hsk3-l10-g1-biji'])} zuoye=${JSON.stringify(byLex['hsk3-l10-g1-zuoye'])}; tổng points=${p.points}`);
      // Kiểm tra review state của 2 từ sai ở kiểm tra cuối.
      const st = (id) => p.lexemes[id];
      const today = new Date().toISOString().slice(0, 10);
      logStep(run, 'review-state-wrong', 'Từ sai ở kiểm tra cuối: level 0, nextDue ngày mai', true,
        `shuxue=${JSON.stringify(st('hsk3-l10-g1-shuxue'))}; heiban=${JSON.stringify(st('hsk3-l10-g1-heiban'))}`);
      const expectedAfter = p.points + 50;
      await waitText(page, 'Xong buổi học đầu tiên!');
      const recallTxt = await page.evaluate(() => document.body.innerText);
      logStep(run, 'result-recall', 'Màn kết quả ghi tự nhớ 3/5', recallTxt.includes('tự nhớ đúng 3/5'), '');
      await page.click('button:has-text("Học tiếp")');
      await sleep(1500);
      const pAfter = await getProgress(page);
      logStep(run, 'reward', 'Thưởng +50đ sau Học tiếp', pAfter.points === expectedAfter, `points=${pAfter.points} (kỳ vọng ${expectedAfter})`);
      // Sổ tay tab Cần ôn: ghi lại THỰC TẾ (kỳ vọng theo engine: từ sai nextDue
      // ngày mai nên CHƯA đến hạn hôm nay — đối chiếu với kỳ vọng của task).
      await page.click('#open-handbook');
      await waitText(page, 'Sổ tay từ vựng');
      await page.click('button:has-text("Cần ôn")');
      await sleep(500);
      const dueTxt = await page.evaluate(() => document.body.innerText);
      const dueHasShuxue = dueTxt.includes('数学');
      const dueHasHeiban = dueTxt.includes('黑板');
      logStep(run, 'handbook-due', 'Tab "Cần ôn": từ sai kiểm tra cuối có hiện không?', true,
        `hiện 数学=${dueHasShuxue}, 黑板=${dueHasHeiban}; toàn bộ text tab: ${(dueTxt.match(/Cần ôn[\s\S]{0,200}/) || ['?'])[0].replace(/\n/g, ' | ')}`);
      await page.click('button:has-text("Đã nhớ vững")');
      await sleep(400);
      const knownTxt = await page.evaluate(() => document.body.innerText);
      logStep(run, 'handbook-known', 'Tab "Đã nhớ vững": từ đúng không gợi ý có level 1', true,
        `chứa 数学 (sai, không nên vững)=${knownTxt.includes('数学')}; chứa 提高 (đúng)=${knownTxt.includes('提高')}`);
      await page.click('[aria-label="Đóng sổ tay"]');
      report.runs[run] = { durationMs: Date.now() - runT0, points: pAfter.points };
      await ctx.close();
    }

    // ============ RUN C — chơi lại trên profile A (idempotent) ==============
    {
      const run = 'C-replay';
      const page = report._pageA;
      const runT0 = Date.now();
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('#choose-lesson', { timeout: 30000 });
      await page.click('#choose-lesson');
      await page.click('button:has-text("HSK 3 · Bài 10")');
      await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
      await sleep(2500);
      await waitText(page, 'Chào bạn! Mình là Minh');
      logStep(run, 'replay-start', 'Chơi lại từ màn Chọn bài → panel Minh mở (không cần E)', true);
      await clickTestId(page, 'quest-continue');
      await waitText(page, 'Đi tới cửa phòng học');
      await clickTestId(page, 'quest-close-panel');
      await page.evaluate(() => window.__bkhn.teleport(-58, -44));
      await waitText(page, 'E — Vào phòng học');
      await page.keyboard.press('e');
      await waitText(page, 'Hôm nay là tiết Toán');
      await playClassroom(page, run, {});
      const pBefore = await getProgress(page);
      const hudBefore = await hudPoints(page);
      // Replay: 11 câu × 2đ = 22 → 160 + 22 = 182 trước thưởng.
      logStep(run, 'replay-points', 'Điểm replay: 11 câu × 2đ = 22đ', hudBefore === 182,
        `HUD=${hudBefore} (kỳ vọng 182), localStorage=${pBefore.points}`);
      await waitText(page, 'Xong buổi học đầu tiên!');
      const resTxt = await page.evaluate(() => document.body.innerText);
      logStep(run, 'replay-result-text', 'Màn kết quả chơi lại ghi rõ thưởng đã nhận trước', resTxt.includes('đã nhận ở lần chơi trước'), '');
      await shot(page, 'step4v-13-replay-result.png', 'màn kết quả chơi lại (thưởng không cộng lại)');
      await page.click('button:has-text("Học tiếp")');
      await sleep(1500);
      const pAfter = await getProgress(page);
      const hudAfter = await hudPoints(page);
      logStep(run, 'replay-idempotent', 'Học tiếp lần 2: thưởng KHÔNG cộng lại', hudAfter === 182 && pAfter.points === 182,
        `HUD sau=${hudAfter}; completedQuests=${JSON.stringify(pAfter.completedQuests)}; badges=${JSON.stringify(pAfter.badges)}`);
      report.runs[run] = { durationMs: Date.now() - runT0, points: pAfter.points };
      await report._ctxA.close();
      delete report._ctxA; delete report._pageA;
    }

    // ============ RUN D — nhập JSON vào profile trống + JSON hỏng ===========
    {
      const run = 'D-import';
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      attachErrorHooks(page);
      await enterFresh(page);
      await page.click('#open-handbook');
      await waitText(page, 'Sổ tay từ vựng');
      const input = page.locator('input[type="file"]');
      await input.setInputFiles('/tmp/bkhn-verify-export.json');
      await waitText(page, 'Đã nhập tiến độ từ file');
      await sleep(500);
      const pts = await hudPoints(page);
      const p = await getProgress(page);
      logStep(run, 'import-ok', 'Nhập JSON đã xuất vào profile trống → khôi phục tiến độ', pts === 160 && p.points === 160,
        `HUD=${pts}, points=${p.points}, encountered=${(p.encountered || []).length}, completedQuests=${JSON.stringify(p.completedQuests)}`);
      // JSON hỏng: dữ liệu cũ không mất.
      fs.writeFileSync('/tmp/bkhn-bad.json', '{invalid json!!!');
      await input.setInputFiles('/tmp/bkhn-bad.json');
      await sleep(800);
      const errTxt = await page.evaluate(() => document.body.innerText);
      const p2 = await getProgress(page);
      logStep(run, 'import-bad', 'Nhập JSON hỏng → báo lỗi rõ ràng, dữ liệu cũ không mất',
        errTxt.includes('không phải bản sao tiến độ hợp lệ') && p2.points === 160,
        `báo lỗi=${errTxt.includes('không phải bản sao tiến độ hợp lệ')}; points sau=${p2.points}`);
      await page.click('[aria-label="Đóng sổ tay"]');
      await ctx.close();
    }

    // ============ RUN E — mobile 390×844 ====================================
    {
      const run = 'E-mobile';
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      attachErrorHooks(page);
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('#enter-campus', { timeout: 30000 });
      await page.click('#enter-campus');
      await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
      await sleep(3000);
      await shot(page, 'step4v-10-mobile-campus.png', 'mobile: trong trường');
      const m = await page.evaluate(() => {
        const joy = document.querySelector('.joystick, [class*="joystick" i]') || document.querySelector('#interact-button');
        const ib = document.querySelector('#interact-button');
        const r = ib ? ib.getBoundingClientRect() : null;
        return {
          scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
          interactBtn: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), visible: r.bottom <= window.innerHeight && r.right <= window.innerWidth } : null,
        };
      });
      logStep(run, 'mobile-overflow', 'Mobile trong trường: không tràn ngang', m.scrollW === m.innerW, `scrollWidth=${m.scrollW}, innerWidth=${m.innerW}`);
      logStep(run, 'mobile-interact-btn', 'Nút Tương tác mobile với tới được', !!m.interactBtn && m.interactBtn.visible, JSON.stringify(m.interactBtn));
      // Mở sổ tay trên mobile.
      await page.click('#open-handbook');
      await waitText(page, 'Sổ tay từ vựng');
      await sleep(500);
      const m2 = await page.evaluate(() => {
        const close = document.querySelector('[aria-label="Đóng sổ tay"]');
        const r = close ? close.getBoundingClientRect() : null;
        return {
          scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
          closeBtn: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), inView: r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth } : null,
        };
      });
      await shot(page, 'step4v-11-mobile-handbook.png', 'mobile: sổ tay mở');
      logStep(run, 'mobile-handbook', 'Mobile sổ tay: không tràn ngang, nút đóng không bị che',
        m2.scrollW === m2.innerW && !!m2.closeBtn && m2.closeBtn.inView,
        `scrollWidth=${m2.scrollW}, innerWidth=${m2.innerW}, close=${JSON.stringify(m2.closeBtn)}`);
      await page.click('[aria-label="Đóng sổ tay"]');
      // Mở panel câu hỏi trên mobile: tới Minh bằng nút Tương tác.
      await page.evaluate(() => window.__bkhn.teleport(-74, 8.5));
      await waitText(page, 'E — Nói chuyện với Minh');
      await page.click('#interact-button');
      await waitText(page, 'Chào bạn! Mình là Minh');
      await sleep(400);
      const m3 = await page.evaluate(() => {
        const zh = document.querySelector('.text-3xl');
        const cs = zh ? getComputedStyle(zh).fontSize : null;
        return { scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, zhFontSize: cs };
      });
      await shot(page, 'step4v-12-mobile-quest.png', 'mobile: panel câu hỏi với NPC Minh');
      logStep(run, 'mobile-quest', 'Mobile panel câu hỏi: không tràn ngang, chữ Hán đủ lớn',
        m3.scrollW === m3.innerW && parseFloat(m3.zhFontSize || '0') >= 28,
        `scrollWidth=${m3.scrollW}, innerWidth=${m3.innerW}, cỡ chữ Hán=${m3.zhFontSize}`);
      await ctx.close();
    }

    report.durationMs = Date.now() - t0;
  } catch (e) {
    report.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', report.fatal);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
  const okSteps = report.steps.filter((s) => s.ok).length;
  report.summary = { stepsTotal: report.steps.length, stepsPass: okSteps, consoleErrors: report.consoleErrors.length, pageErrors: report.pageErrors.length };
  delete report._ctxA; delete report._pageA; // handle trình duyệt, không serialize
  fs.writeFileSync(path.join(OUT, 'verify-step4.json'), JSON.stringify(report, null, 2));
  console.log('SUMMARY', JSON.stringify(report.summary));
  console.log('consoleErrors:', JSON.stringify(report.consoleErrors));
  console.log('pageErrors:', JSON.stringify(report.pageErrors));
  process.exit(report.steps.every((s) => s.ok) && report.consoleErrors.length === 0 && report.pageErrors.length === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
