// play-l11.cjs — Chơi TRỌN tuyến mới Bài 11 (l11) từ profile trống tới màn
// kết quả + nhận thưởng, 0 lỗi console/page.
//
// Bối cảnh: smoke-step6 chỉ tới bước chào đầu tiên; thưởng/idempotent của
// quest mới mới được kiểm ở unit test. Script này đóng khoảng trống đó cho
// 1 tuyến mẫu (l11, 8 bước): Minh chào → cửa phòng → cô giáo → 2 ×
// pick-meaning → order → kiểm tra cuối 5 từ → kết quả + thưởng 50đ.
// Loại câu kiểm tra cuối cố định theo reviewKind(i): i=2 dictation,
// i chẵn type-pinyin, i lẻ pick-meaning (QuestPanel.tsx).
//
// Chạy: node test/play-l11.cjs (server riêng 127.0.0.1:8332, một context
// WebGL tại một thời điểm — SwiftShader không chịu nổi 2 context cùng lúc).
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8332/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const report = { tool: 'play-l11', at: new Date().toISOString(), steps: [], shots: {}, consoleErrors: [], pageErrors: [] };
function logStep(id, name, ok, detail) {
  const s = { id, name, ok, detail: detail ?? null, at: new Date().toISOString() };
  report.steps.push(s);
  console.log(`${ok ? 'PASS' : 'FAIL'} [${id}] ${name}${detail ? ' — ' + detail : ''}`);
  return ok;
}
function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', '8332', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
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

    // --- Vào trường, profile trống -----------------------------------------
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#enter-campus', { timeout: 30000 });
    await page.click('#enter-campus');
    await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
    await sleep(2500);
    logStep('enter', 'Vào trường, profile trống', true);

    // --- Mở menu Đổi bài → chọn Bài 11 --------------------------------------
    await page.click('#change-lesson');
    await page.waitForSelector('[data-testid="lesson-picker"]', { timeout: 30000 });
    await clickTestId(page, 'lesson-pick-hsk3-l11');
    await waitText(page, 'Hôm nay mình cùng đi họp');
    await waitText(page, 'Bài 11 — Giải quyết vấn đề');
    const qs0 = await page.evaluate(() => JSON.parse(window.localStorage.getItem('bkhn-progress-v1')).questState);
    logStep('start-l11', 'Chọn Bài 11 → tuyến l11 bắt đầu, bước chào đúng chủ đề',
      qs0 && qs0.questId === 'l11' && qs0.stepIndex === 0, `questState=${JSON.stringify(qs0)}`);

    // --- Bước chào → đi tới cửa phòng ---------------------------------------
    await clickTestId(page, 'quest-continue');
    await waitText(page, 'Đi tới cửa phòng học');
    await clickTestId(page, 'quest-close-panel');
    await page.evaluate(() => window.__bkhn.teleport(-58, -44));
    await waitText(page, 'Vào phòng học');
    await page.keyboard.press('e');
    await waitText(page, 'Cuộc họp bắt đầu lúc mười giờ');
    await waitText(page, 'Phòng học mô phỏng');
    logStep('enter-classroom', 'E ở cửa → vào phòng, bước cô giáo mở', true);

    // --- Cô giáo → 2 × pick-meaning -----------------------------------------
    await clickTestId(page, 'quest-continue');
    await waitText(page, '解决 nghĩa là giải quyết');
    await clickTestId(page, 'meaning-option-0');
    await waitText(page, '我们解决问题');
    logStep('pick-jiejue', 'pick-meaning 解决: chọn đúng → giải thích hiện', true);
    await clickTestId(page, 'quest-continue');
    await waitText(page, '请假 nghĩa là xin nghỉ');
    await clickTestId(page, 'meaning-option-0');
    await waitText(page, '我今天请假');
    logStep('pick-qingjia', 'pick-meaning 请假: chọn đúng → giải thích hiện', true);
    await clickTestId(page, 'quest-continue');

    // --- Order: 我们开会解决问题。 --------------------------------------------
    await waitText(page, 'Xếp các thẻ từ');
    for (const t of ['我们', '开会', '解决', '问题', '。']) await clickTestId(page, `order-tile-${t}`);
    await clickTestId(page, 'order-check');
    await waitText(page, 'Đúng rồi!');
    logStep('order', 'order 开会: xếp đúng "我们开会解决问题。"', true);
    await clickTestId(page, 'quest-continue');

    // --- Kiểm tra cuối 5 từ (Q0 pinyin huiyi, Q1 nghĩa kaihui,
    // Q2 dictation jiejue, Q3 nghĩa qingjia, Q4 pinyin jihui) --------------
    await waitText(page, 'Kiểm tra cuối');
    await page.fill('#review-pinyin', 'huìyì');
    await clickTestId(page, 'review-check');
    await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
    await clickTestId(page, 'review-next');
    await page.click('[data-testid="review-meaning-hsk3-l11-g1-kaihui"]');
    await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
    await clickTestId(page, 'review-next');
    await page.fill('#review-dictation', '解决');
    await clickTestId(page, 'review-check');
    await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
    await clickTestId(page, 'review-next');
    await page.click('[data-testid="review-meaning-hsk3-l11-g3-qingjia"]');
    await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
    await clickTestId(page, 'review-next');
    await page.fill('#review-pinyin', 'jīhuì');
    await clickTestId(page, 'review-check');
    await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
    await clickTestId(page, 'review-next');
    await waitText(page, 'Bạn đã kiểm tra xong 5 từ và tự nhớ đúng hết');
    logStep('review', 'Kiểm tra cuối 5 từ: đúng hết lần đầu (pinyin/nghĩa/dictation)', true);
    await clickTestId(page, 'review-done');

    // --- Màn kết quả + thưởng -------------------------------------------------
    // completeQuest (thưởng 50đ + huy hiệu + done=true) chỉ chạy khi bấm
    // "Tiếp tục" ở màn kết quả (result-continue) — không phải lúc màn kết
    // quả vừa hiện. Bấm nút rồi mới đọc tiến độ.
    await page.waitForSelector('[data-testid="result-continue"]', { timeout: 60000 });
    await sleep(800);
    await page.screenshot({ path: path.join(OUT, 'play-l11-result.png'), timeout: 120000 });
    report.shots['play-l11-result.png'] = { note: 'Màn kết quả tuyến Bài 11 sau khi chơi trọn 8 bước' };
    await clickTestId(page, 'result-continue');
    await sleep(1200);
    const p = await getProgress(page);
    const done = p && p.completedQuests && p.completedQuests.l11;
    logStep('reward', 'Màn kết quả hiện; l11 hoàn thành, thưởng 50đ, huy hiệu l11',
      !!done && done.points === 50 && (p.badges || []).includes('l11') && p.points >= 50,
      `completedQuests.l11=${JSON.stringify(done)}, badges=${JSON.stringify(p && p.badges)}, points=${p && p.points}`);
    const qsEnd = p && p.questState;
    logStep('quest-done', 'questState l11 đã done',
      !!qsEnd && qsEnd.done === true, `questState=${JSON.stringify(qsEnd)}`);

    await ctx.close();
    const failed = report.steps.filter((s) => !s.ok);
    console.log(`\nPLAY-L11: ${report.steps.length - failed.length}/${report.steps.length} bước PASS; ` +
      `console errors: ${report.consoleErrors.length}; page errors: ${report.pageErrors.length}`);
    if (report.consoleErrors.length) console.log('consoleErrors:', report.consoleErrors.slice(0, 5));
    if (report.pageErrors.length) console.log('pageErrors:', report.pageErrors.slice(0, 5));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
  fs.writeFileSync(path.join(OUT, 'play-l11.json'), JSON.stringify(report, null, 2));
  console.log('report: test-shots/play-l11.json');
  const failed = report.steps.filter((s) => !s.ok);
  if (failed.length > 0 || report.consoleErrors.length > 0 || report.pageErrors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('play-l11 lỗi:', e);
  process.exitCode = 1;
});
