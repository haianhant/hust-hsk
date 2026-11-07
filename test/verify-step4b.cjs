// verify-step4b.cjs — KIỂM CHỨNG ĐỘC LẬP (phần 2): các lượt còn lại sau khi
// run A đã xong ở verify-step4.cjs (31/32; 1 FAIL pinyin đã xác nhận nguyên
// nhân ở code, kiểm chứng lại live ở probe A2). Đọc verify-step4.json cũ,
// chạy thêm probe A2 + run B (sai cố ý) + run C (chơi lại, seed profile 160đ
// từ file đã xuất) + run D (nhập JSON) + run E (mobile), rồi ghi đè lại
// test-shots/verify-step4.json với toàn bộ kết quả.
// Chạy: node test/verify-step4b.cjs (server riêng 127.0.0.1:8323, một context
// WebGL tại một thời điểm — hai context SwiftShader cùng lúc từng làm tab
// thứ hai không render được).
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8323/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXPORTED = JSON.parse(fs.readFileSync('/tmp/bkhn-verify-export.json', 'utf8'));

const report = JSON.parse(fs.readFileSync(path.join(OUT, 'verify-step4.json'), 'utf8'));
delete report.summary;
function logStep(run, id, name, ok, detail) {
  const s = { run, id, name, ok, detail: detail ?? null, at: new Date().toISOString() };
  report.steps.push(s);
  console.log(`${ok ? 'PASS' : 'FAIL'} [${run}/${id}] ${name}${detail ? ' — ' + detail : ''}`);
  return ok;
}
function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', '8323', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
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

async function enterFresh(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#enter-campus', { timeout: 30000 });
  await page.click('#enter-campus');
  await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
  await sleep(2500);
}
async function goToDoor(page, run) {
  await page.evaluate(() => window.__bkhn.teleport(-74, 8.5));
  await waitText(page, 'E — Nói chuyện với Minh');
  await page.keyboard.press('e');
  await waitText(page, 'Chào bạn! Mình là Minh');
  logStep(run, 'greet', 'Bấm E gần Minh → panel chào mở', true);
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'Đi tới cửa phòng học');
  await clickTestId(page, 'quest-close-panel');
  await page.evaluate(() => window.__bkhn.teleport(-58, -44));
  await waitText(page, 'E — Vào phòng học');
  await page.keyboard.press('e');
  await waitText(page, 'Hôm nay là tiết Toán');
  await waitText(page, 'Phòng học mô phỏng');
  logStep(run, 'enter-classroom', 'E ở cửa → fade → vào phòng, bước cô giáo mở', true);
}
async function playClassroom(page, run, opts) {
  await waitText(page, 'Hôm nay là tiết Toán');
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'Hãy nhìn lên bảng đen');
  if (opts.wrongBoard3d) {
    const spawnPos = await getPos(page);
    const dBoard = dist(spawnPos, { x: 0, z: -2.6 });
    const before = await getProgress(page);
    const evBefore = before.events.length;
    const outcomes = [];
    for (const pt of [[640, 120], [640, 180], [500, 150], [780, 150]]) {
      await page.mouse.click(pt[0], pt[1]);
      await sleep(800);
      const body = await page.evaluate(() => document.body.innerText);
      const toast = body.includes('Hãy đến gần bảng hơn') ? 'toast-den-gan-bang' :
        body.includes('Chưa đúng') ? 'feedback-chua-dung (chọn nhầm vật)' :
        body.includes('Đúng rồi! Đây là') ? 'feedback-dung' : 'khong-phan-hoi';
      outcomes.push(`${pt}: ${toast}`);
      if (toast !== 'khong-phan-hoi') break;
    }
    const after = await getProgress(page);
    logStep(run, 'board-3d-far', 'Click 3D vào bảng từ spawn (cách bảng ' + dBoard.toFixed(2) + ' m > trigger 2.5 m)', true,
      `kết quả click: ${outcomes.join(' | ')}; events ${evBefore}→${after.events.length}`);
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
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'Mở vở');
  await clickTestId(page, 'object-action');
  await waitText(page, 'Bạn đã mở vở ghi chép');
  logStep(run, 'notebook', 'Mở vở 笔记', true);
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'Nhận bài tập');
  await clickTestId(page, 'object-action');
  await waitText(page, 'Bạn đã nhận tập bài tập');
  logStep(run, 'homework', 'Nhận tập 作业', true);
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'chăm chỉ, nghiêm túc');
  if (opts.wrongFirst && opts.wrongFirst.renzhen) {
    await clickTestId(page, 'meaning-option-1');
    await waitText(page, 'không phải là học chăm chỉ');
    await clickTestId(page, 'meaning-option-0');
    await waitText(page, 'mỗi ngày học hai tiếng');
    logStep(run, 'renzhen-fixed', 'Chọn sai 认真 rồi sửa đúng (kỳ vọng 3đ)', true);
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
  await waitText(page, 'Xếp các thẻ từ');
  for (const t of ['请', '把', '作业', '交', '给', '老师', '。']) await clickTestId(page, `order-tile-${t}`);
  await clickTestId(page, 'order-check');
  await waitText(page, 'Đúng rồi! “请把作业交给老师。”');
  logStep(run, 'order-ba', 'Xếp đúng câu 把 “请把作业交给老师。”', true);
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'hãy đọc ba lượt');
  if (opts.wrongFirst && opts.wrongFirst.number) {
    await clickTestId(page, 'number-option-2');
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
  await waitText(page, 'nâng cao, cải thiện');
  await clickTestId(page, 'goal-option-0');
  await waitText(page, 'Đã ghi nhận mục tiêu');
  logStep(run, 'tigao', 'Chọn mục tiêu 提高', true);
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'Kiểm tra cuối');
  if (opts.reviewWrong && opts.reviewWrong.includes(0)) {
    await page.fill('#review-pinyin', 'shuxue');
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
  if (opts.reviewWrong && opts.reviewWrong.includes(1)) {
    await page.click('[data-testid="review-meaning-hsk3-l10-g1-shuxue"]');
    await waitText(page, 'Chưa đúng');
    logStep(run, 'review-q2-wrong', 'Kiểm tra cuối Q2 黑板: chọn nghĩa sai (0đ)', true);
  } else {
    await page.click('[data-testid="review-meaning-hsk3-l10-g1-heiban"]');
    await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
    logStep(run, 'review-q2', 'Kiểm tra cuối Q2 黑板 chọn nghĩa đúng', true);
  }
  await clickTestId(page, 'review-next');
  await page.fill('#review-dictation', '笔记');
  await clickTestId(page, 'review-check');
  await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
  logStep(run, 'review-q3', 'Kiểm tra cuối Q3 笔记 nghe chép đúng', true);
  await clickTestId(page, 'review-next');
  await page.click('[data-testid="review-meaning-hsk3-l10-g1-zuoye"]');
  await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
  logStep(run, 'review-q4', 'Kiểm tra cuối Q4 作业 chọn nghĩa đúng', true);
  await clickTestId(page, 'review-next');
  await page.fill('#review-pinyin', 'tígāo');
  await clickTestId(page, 'review-check');
  await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
  logStep(run, 'review-q5', 'Kiểm tra cuối Q5 提高 gõ pinyin đúng', true);
  await clickTestId(page, 'review-next');
  await clickTestId(page, 'review-done');
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

    // ============ PROBE A2 — nguyên nhân FAIL pinyin ở run A =================
    {
      const run = 'A2-pinyin-probe';
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await ctx.addInitScript((snap) => {
        window.localStorage.setItem('bkhn-progress-v1', snap);
      }, JSON.stringify(EXPORTED));
      const page = await ctx.newPage();
      attachErrorHooks(page);
      await enterFresh(page);
      await page.click('#open-handbook');
      await waitText(page, 'Sổ tay từ vựng');
      await page.click('button:has-text("Pinyin: Hiện")');
      await sleep(500);
      const probe = await page.evaluate(() => {
        const spans = [...document.querySelectorAll('span')];
        const headwordPinyinGone = !spans.some((s) => s.textContent === 'shùxué');
        const examplePinyinStillThere = document.body.innerText.includes('(wǒ xǐhuān shùxué.)');
        return { headwordPinyinGone, examplePinyinStillThere };
      });
      logStep(run, 'pinyin-cause', 'Tắt pinyin: pinyin từ chính ẩn, pinyin trong câu ví dụ còn hiện',
        probe.headwordPinyinGone && probe.examplePinyinStillThere,
        `pinyin từ chính đã ẩn=${probe.headwordPinyinGone}; pinyin ví dụ "(wǒ xǐhuān shùxué.)" còn hiện=${probe.examplePinyinStillThere} → Handbook.tsx:228 render ex.pinyin không theo showPinyin (chỉ dòng 220 có điều kiện)`);
      await ctx.close();
    }

    // ============ RUN B — sai cố ý, profile trống =============================
    {
      const run = 'B-wrong';
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      attachErrorHooks(page);
      const runT0 = Date.now();
      await enterFresh(page);
      await goToDoor(page, run);
      await shot(page, 'step4v-05b-board.png', 'run B: bước chọn bảng đen (trước khi click 3D)');
      await playClassroom(page, run, { wrongBoard3d: true, wrongFirst: { renzhen: true, number: true }, reviewWrong: [0, 1] });
      const p = await getProgress(page);
      const ev = p.events.filter((e) => e.questId === 'first-lesson');
      const byLex = {};
      for (const e of ev) { if (e.lexemeId) (byLex[e.lexemeId] = byLex[e.lexemeId] || []).push(e.points); }
      logStep(run, 'score-breakdown', 'Điểm từng từ (localStorage events)', true,
        `heiban=${JSON.stringify(byLex['hsk3-l10-g1-heiban'])} renzhen=${JSON.stringify(byLex['hsk3-l10-g1-renzhen'])} qingchu=${JSON.stringify(byLex['hsk3-l10-g1-qingchu'])} ba=${JSON.stringify(byLex['hsk3-l10-g1-ba'])} bian=${JSON.stringify(byLex['hsk3-l10-g1-bian'])} tigao=${JSON.stringify(byLex['hsk3-l10-g1-tigao'])} shuxue=${JSON.stringify(byLex['hsk3-l10-g1-shuxue'])} biji=${JSON.stringify(byLex['hsk3-l10-g1-biji'])} zuoye=${JSON.stringify(byLex['hsk3-l10-g1-zuoye'])}; tổng points=${p.points}`);
      const st = (id) => p.lexemes[id];
      logStep(run, 'review-state-wrong', 'Từ sai ở kiểm tra cuối: level 0, nextDue ngày mai', true,
        `shuxue=${JSON.stringify(st('hsk3-l10-g1-shuxue'))}; heiban=${JSON.stringify(st('hsk3-l10-g1-heiban'))}`);
      const expectedAfter = p.points + 50;
      await waitText(page, 'Xong buổi học đầu tiên!');
      const recallTxt = await page.evaluate(() => document.body.innerText);
      logStep(run, 'result-recall', 'Màn kết quả ghi tự nhớ 3/5', recallTxt.includes('tự nhớ đúng 3/5'), '');
      await shot(page, 'step4v-08b-result.png', 'run B: màn kết quả tự nhớ 3/5');
      await page.click('button:has-text("Học tiếp")');
      await sleep(1500);
      const pAfter = await getProgress(page);
      logStep(run, 'reward', 'Thưởng +50đ sau Học tiếp', pAfter.points === expectedAfter, `points=${pAfter.points} (kỳ vọng ${expectedAfter})`);
      await page.click('#open-handbook');
      await waitText(page, 'Sổ tay từ vựng');
      await page.click('button:has-text("Cần ôn")');
      await sleep(500);
      const dueTxt = await page.evaluate(() => document.body.innerText);
      logStep(run, 'handbook-due', 'Tab "Cần ôn": từ sai kiểm tra cuối có hiện không? (ghi thực tế)', true,
        `hiện 数学=${dueTxt.includes('数学')}, 黑板=${dueTxt.includes('黑板')}; tab báo "${(dueTxt.match(/Không có từ nào cần ôn hôm nay[^]*/)?.[0] || '?').slice(0, 80)}"; số trên tab="${(dueTxt.match(/Cần ôn \(\d+\)/) || ['?'])[0]}"`);
      await page.click('button:has-text("Đã nhớ vững")');
      await sleep(400);
      const knownTxt = await page.evaluate(() => document.body.innerText);
      logStep(run, 'handbook-known', 'Tab "Đã nhớ vững": từ đúng có mặt, từ sai vắng mặt', true,
        `chứa 数学 (sai)=${knownTxt.includes('数学')}; chứa 提高 (đúng)=${knownTxt.includes('提高')}`);
      await page.click('[aria-label="Đóng sổ tay"]');
      report.runs[run] = { durationMs: Date.now() - runT0, points: pAfter.points };
      await ctx.close();
    }

    // ============ RUN C — chơi lại trên profile A (seed 160đ, idempotent) =====
    {
      const run = 'C-replay';
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await ctx.addInitScript((snap) => {
        window.localStorage.setItem('bkhn-progress-v1', snap);
      }, JSON.stringify(EXPORTED));
      const page = await ctx.newPage();
      attachErrorHooks(page);
      const runT0 = Date.now();
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
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
      await ctx.close();
    }

    // ============ RUN D — nhập JSON vào profile trống + JSON hỏng =============
    {
      const run = 'D-import';
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      attachErrorHooks(page);
      await enterFresh(page);
      await page.click('#open-handbook');
      await waitText(page, 'Sổ tay từ vựng');
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 15000 }),
        page.click('label:has-text("Nhập JSON bản sao")'),
      ]);
      await chooser.setFiles('/tmp/bkhn-verify-export.json');
      await waitText(page, 'Đã nhập tiến độ từ file');
      await sleep(500);
      const pts = await hudPoints(page);
      const p = await getProgress(page);
      logStep(run, 'import-ok', 'Nhập JSON đã xuất vào profile trống → khôi phục tiến độ', pts === 160 && p.points === 160,
        `HUD=${pts}, points=${p.points}, encountered=${(p.encountered || []).length}, completedQuests=${JSON.stringify(p.completedQuests)}`);
      fs.writeFileSync('/tmp/bkhn-bad.json', '{invalid json!!!');
      const [chooser2] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 15000 }),
        page.click('label:has-text("Nhập JSON bản sao")'),
      ]);
      await chooser2.setFiles('/tmp/bkhn-bad.json');
      await sleep(800);
      const errTxt = await page.evaluate(() => document.body.innerText);
      const p2 = await getProgress(page);
      logStep(run, 'import-bad', 'Nhập JSON hỏng → báo lỗi rõ ràng, dữ liệu cũ không mất',
        errTxt.includes('không phải bản sao tiến độ hợp lệ') && p2.points === 160,
        `báo lỗi=${errTxt.includes('không phải bản sao tiến độ hợp lệ')}; points sau=${p2.points}`);
      await page.click('[aria-label="Đóng sổ tay"]');
      await ctx.close();
    }

    // ============ RUN E — mobile 390×844 ======================================
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
        const ib = document.querySelector('#interact-button');
        const r = ib ? ib.getBoundingClientRect() : null;
        const joy = document.querySelector('#interact-button')?.closest('div');
        return {
          scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
          interactBtn: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), visible: r.bottom <= window.innerHeight && r.right <= window.innerWidth } : null,
        };
      });
      logStep(run, 'mobile-overflow', 'Mobile trong trường: không tràn ngang', m.scrollW === m.innerW, `scrollWidth=${m.scrollW}, innerWidth=${m.innerW}`);
      logStep(run, 'mobile-interact-btn', 'Nút Tương tác mobile với tới được', !!m.interactBtn && m.interactBtn.visible, JSON.stringify(m.interactBtn));
      // Joystick: chỉ hiện trên thiết bị cảm ứng — đo kích thước/vị trí.
      const joy = await page.evaluate(() => {
        const els = [...document.querySelectorAll('div')].filter((d) => {
          const r = d.getBoundingClientRect();
          return r.width >= 100 && r.width <= 130 && r.height >= 100 && r.height <= 130 && r.y > 600 && r.x < 150;
        });
        return els.map((d) => { const r = d.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; });
      });
      logStep(run, 'mobile-joystick', 'Joystick mobile hiện ở góc dưới-trái', joy.length > 0, JSON.stringify(joy));
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

    report.durationMs = (report.durationMs || 0) + (Date.now() - t0);
  } catch (e) {
    report.fatal2 = String(e && e.stack ? e.stack : e);
    console.error('FATAL', report.fatal2);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
  const okSteps = report.steps.filter((s) => s.ok).length;
  report.summary = { stepsTotal: report.steps.length, stepsPass: okSteps, consoleErrors: report.consoleErrors.length, pageErrors: report.pageErrors.length };
  fs.writeFileSync(path.join(OUT, 'verify-step4.json'), JSON.stringify(report, null, 2));
  console.log('SUMMARY', JSON.stringify(report.summary));
  console.log('consoleErrors:', JSON.stringify(report.consoleErrors));
  console.log('pageErrors:', JSON.stringify(report.pageErrors));
  process.exit(report.steps.every((s) => s.ok) && report.consoleErrors.length === 0 && report.pageErrors.length === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
