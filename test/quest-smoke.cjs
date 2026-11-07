// Smoke test tuyến "Buổi học đầu tiên" (Bước 5) — Playwright, chromium
// headless shell + SwiftShader (theo mẫu test/shots-step3fix.cjs).
// Chạy: node test/quest-smoke.cjs  (tự mở server python ở 127.0.0.1:8321
// phục vụ out/, tắt server khi xong).
// Luồng: vào trường → gặp Minh (E) → tới cửa C1 (E, dùng hook teleport cho
// đoạn đi bộ dài) → vào phòng học → trả lời đủ các bước bằng DOM → màn kết
// quả → sổ tay → reload giữ tiến độ. Log từng bước pass/fail ra
// test-shots/quest-smoke.json; 0 lỗi console là bắt buộc.
// Ảnh: test-shots/step4-*.png.
let chromium;
try {
  ({ chromium } = require('playwright-core'));
} catch {
  // Repo này không có playwright trong package.json — dùng bản đã cài ở
  // ~/workspace/mobile-test (cùng cách các test Bước 2–3 đã chạy).
  ({ chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core'));
}
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8321/';
const OUT = path.join(__dirname, '..', 'test-shots');
fs.mkdirSync(OUT, { recursive: true });

const EXE =
  '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const report = {
  startedAt: new Date().toISOString(),
  consoleErrors: [],
  pageErrors: [],
  steps: [],
  shots: {},
};
function logStep(id, name, ok, detail) {
  report.steps.push({ id, name, ok, detail: detail ?? null, at: new Date().toISOString() });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${id}] ${name}${detail ? ' — ' + detail : ''}`);
}

function startServer() {
  return new Promise((resolve, reject) => {
    const root = path.join(__dirname, '..');
    const proc = spawn('python3', ['-m', 'http.server', '8321', '--directory', 'out'], {
      cwd: root,
      stdio: 'ignore',
    });
    proc.on('error', reject);
    // Chờ server nhận kết nối.
    const t0 = Date.now();
    const tick = () => {
      fetch(BASE, { method: 'HEAD' })
        .then(() => resolve(proc))
        .catch(() => {
          if (Date.now() - t0 > 15000) reject(new Error('server không lên sau 15 s'));
          else setTimeout(tick, 300);
        });
    };
    tick();
  });
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
      args: [
        '--enable-unsafe-swiftshader',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--disable-gpu-sandbox',
        '--no-sandbox',
      ],
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('console', (m) => {
      if (m.type() === 'error') report.consoleErrors.push(m.text());
    });
    page.on('pageerror', (e) => report.pageErrors.push(String(e)));

    const shot = async (name, note) => {
      await page.screenshot({ path: path.join(OUT, name), timeout: 120000 });
      report.shots[name] = { note };
      console.log('shot', name);
    };
    const waitText = async (text, timeout = 30000) => {
      await page.waitForFunction(
        (t) => document.body.innerText.includes(t),
        text,
        { timeout },
      );
    };
    const clickTestId = async (id) => {
      await page.waitForSelector(`[data-testid="${id}"]`, { timeout: 30000 });
      await page.click(`[data-testid="${id}"]`);
    };
    const pressE = async () => {
      await page.keyboard.press('e');
    };

    // --- 1. Vào trường ------------------------------------------------------
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#enter-campus', { timeout: 30000 });
    await page.click('#enter-campus');
    await page.waitForFunction(() => window.__bkhn, { timeout: 30000 });
    await sleep(3000);
    logStep('s1-enter', 'Vào trường, WebGL + hook __bkhn sẵn', true);

    // --- 2. Gặp Minh ở cổng Parabol, bấm E nhận nhiệm vụ --------------------
    await page.evaluate(() => window.__bkhn.teleport(-74, 8.5));
    await waitText('E — Nói chuyện với Minh');
    await pressE();
    await waitText('Chào bạn! Mình là Minh');
    await shot('step4-01-greet.png', 'nhận nhiệm vụ từ NPC Minh ở cổng Parabol');
    logStep('s2-greet', 'Bấm E gần Minh → panel chào của Minh mở', true);
    await clickTestId('quest-continue');
    await waitText('Đi tới cửa phòng học');
    // Đóng panel để đi bộ tự do (panel mở thì E/WASD bị khóa).
    await clickTestId('quest-close-panel');
    logStep('s3-goto', 'Sang bước đi tới cửa, đóng panel để di chuyển', true);

    // --- 3. Tới cửa phòng học (chân bậc tam cấp C1), bấm E vào lớp ---------
    await page.evaluate(() => window.__bkhn.teleport(-58, -44));
    await waitText('E — Vào phòng học');
    await pressE();
    await waitText('Hôm nay là tiết Toán');
    await waitText('Phòng học mô phỏng');
    await shot('step4-02-classroom.png', 'vào phòng học mô phỏng, cô giáo giới thiệu tiết Toán');
    logStep('s4-enter-classroom', 'E ở cửa → fade → vào phòng, bước cô giáo (数学) mở', true);
    await clickTestId('quest-continue');
    await waitText('Hãy nhìn lên bảng đen');

    // --- 4. Chọn bảng đen ----------------------------------------------------
    await clickTestId('object-option-board');
    await waitText('Đúng rồi! Đây là');
    await shot('step4-03-board.png', 'chọn đúng bảng đen giữa các vật');
    logStep('s5-board', 'Chọn đúng 黑板 (bảng đen)', true);
    await clickTestId('quest-continue');
    await waitText('Mở vở');

    // --- 5. Mở vở 笔记 + nhận 作业 --------------------------------------------
    await clickTestId('object-action');
    await waitText('Bạn đã mở vở ghi chép');
    await shot('step4-04-notebook.png', 'mở vở 笔记 trên bàn 1');
    logStep('s6-notebook', 'Mở vở 笔记 (animation nắp vở + panel)', true);
    await clickTestId('quest-continue');
    await waitText('Nhận bài tập');
    await clickTestId('object-action');
    await waitText('Bạn đã nhận tập bài tập');
    logStep('s7-homework', 'Nhận tập 作业 (bay lên tay)', true);
    await clickTestId('quest-continue');

    // --- 6. 认真 / 清楚 --------------------------------------------------------
    await waitText('chăm chỉ, nghiêm túc');
    await clickTestId('meaning-option-0');
    await waitText('mỗi ngày học hai tiếng');
    logStep('s8-renzhen', 'Chọn đúng cách học 认真', true);
    await clickTestId('quest-continue');
    await waitText('rõ ràng');
    await clickTestId('meaning-option-0');
    await waitText('cô giáo nói rất rõ ràng');
    logStep('s9-qingchu', 'Chọn đúng câu 清楚', true);
    await clickTestId('quest-continue');

    // --- 7. Xếp câu 把 ---------------------------------------------------------
    await waitText('Xếp các thẻ từ');
    for (const t of ['请', '把', '作业', '交', '给', '老师', '。']) {
      await clickTestId(`order-tile-${t}`);
    }
    await clickTestId('order-check');
    await waitText('Đúng rồi! “请把作业交给老师。”');
    logStep('s10-ba', 'Xếp đúng câu 把, tập bài bay tới tay cô giáo', true);
    await clickTestId('quest-continue');

    // --- 8. 遍: chọn số lượt 3 -------------------------------------------------
    await waitText('hãy đọc ba lượt');
    await clickTestId('number-option-3');
    await waitText('hãy đọc ba lượt. 遍');
    logStep('s11-bian', 'Chọn đúng 3 lượt (遍)', true);
    await clickTestId('quest-continue');

    // --- 9. 提高: chọn mục tiêu ------------------------------------------------
    await waitText('nâng cao, cải thiện');
    await clickTestId('goal-option-0');
    await waitText('Đã ghi nhận mục tiêu');
    logStep('s12-tigao', 'Chọn mục tiêu 提高 (cả hai đều đúng)', true);
    await clickTestId('quest-continue');

    // --- 10. Kiểm tra cuối 5 từ (tự nhớ) ---------------------------------------
    await waitText('Kiểm tra cuối');
    // Câu 1 — 数学: gõ pinyin có dấu.
    await page.fill('#review-pinyin', 'shùxué');
    await clickTestId('review-check');
    await waitText('Đúng rồi! Bạn tự nhớ được từ này');
    await clickTestId('review-next');
    // Câu 2 — 黑板: chọn nghĩa "bảng đen".
    await page.click('button:has-text("bảng đen")');
    await waitText('Đúng rồi! Bạn tự nhớ được từ này');
    await clickTestId('review-next');
    // Câu 3 — 笔记: nghe chép chữ Hán.
    await page.fill('#review-dictation', '笔记');
    await clickTestId('review-check');
    await waitText('Đúng rồi! Bạn tự nhớ được từ này');
    await clickTestId('review-next');
    // Câu 4 — 作业: chọn nghĩa "bài tập về nhà".
    await page.click('button:has-text("bài tập về nhà")');
    await waitText('Đúng rồi! Bạn tự nhớ được từ này');
    await clickTestId('review-next');
    // Câu 5 — 提高: gõ pinyin có dấu.
    await page.fill('#review-pinyin', 'tígāo');
    await clickTestId('review-check');
    await waitText('Đúng rồi! Bạn tự nhớ được từ này');
    await shot('step4-05-review.png', 'kiểm tra cuối 5 từ, tự nhớ đúng 5/5');
    logStep('s13-review', 'Kiểm tra cuối 5/5 đúng (gõ pinyin ×2, chọn nghĩa ×2, nghe chép ×1)', true);
    await clickTestId('review-next');
    await clickTestId('review-done');

    // --- 11. Màn kết quả ---------------------------------------------------------
    await waitText('Xong buổi học đầu tiên!');
    await waitText('tự nhớ đúng 5/5');
    await shot('step4-06-result.png', 'màn kết quả: gặp 9/9 từ, tự nhớ 5/5');
    logStep('s14-result', 'Màn kết quả hiện đủ: gặp 9/9, tự nhớ 5/5', true);
    const pointsBeforeReward = await page.evaluate(() => document.body.innerText.match(/⭐\s*(\d+)\s*điểm/)?.[1] ?? null);
    logStep('s15-points', 'Điểm HUD sau quest (trước thưởng hoàn thành)', Number(pointsBeforeReward) >= 50, `points=${pointsBeforeReward} (kỳ vọng ≥ 50: 11 câu đúng lần đầu × 10đ)`);

    // Ôn lỗi ngay → sổ tay tab Cần ôn (không có từ sai nên tab trống).
    await page.click('button:has-text("Ôn lỗi ngay")');
    await waitText('Sổ tay từ vựng');
    await shot('step4-07-handbook.png', 'sổ tay mở từ nút Ôn lỗi ngay');
    logStep('s16-handbook', 'Nút Ôn lỗi ngay mở sổ tay', true);
    await page.click('[aria-label="Đóng sổ tay"]');
    // Mở lại panel kết quả để bấm Học tiếp.
    await page.click('#reopen-quest');
    await waitText('Xong buổi học đầu tiên!');
    await page.click('button:has-text("Học tiếp")');
    await sleep(1500);
    await waitText('Quảng trường C1');
    logStep('s17-continue', 'Học tiếp → ra khỏi phòng về campus (cửa C1)', true);
    // Điểm sau khi nhận thưởng hoàn thành 50đ — đây mới là mốc so sánh sau reload.
    const pointsText = await page.evaluate(() => document.body.innerText.match(/⭐\s*(\d+)\s*điểm/)?.[1] ?? null);
    logStep('s17b-reward', 'Thưởng hoàn thành 50đ đã cộng (chơi lại không cộng lại)', Number(pointsText) === Number(pointsBeforeReward) + 50, `trước=${pointsBeforeReward}, sau=${pointsText}`);

    // --- 12. Reload giữ tiến độ ---------------------------------------------------
    const saved = await page.evaluate(() => window.localStorage.getItem('bkhn-progress-v1'));
    const parsed = saved ? JSON.parse(saved) : null;
    logStep(
      's18-persist',
      'Tiến độ đã lưu localStorage (quest hoàn thành, điểm, encountered 9 từ)',
      !!parsed && !!parsed.completedQuests?.['first-lesson'] && (parsed.encountered?.length ?? 0) === 9,
      `points=${parsed?.points}, encountered=${parsed?.encountered?.length}, completed=${JSON.stringify(parsed?.completedQuests ?? {})}`,
    );
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#continue-learning', { timeout: 30000 });
    await page.click('#continue-learning');
    await page.waitForFunction(() => window.__bkhn, { timeout: 30000 });
    await sleep(2000);
    const pointsAfterReload = await page.evaluate(
      () => document.body.innerText.match(/⭐\s*(\d+)\s*điểm/)?.[1] ?? null,
    );
    logStep(
      's19-reload',
      'Reload → nút Tiếp tục học → điểm giữ nguyên',
      pointsAfterReload === pointsText,
      `points trước=${pointsText}, sau reload=${pointsAfterReload}`,
    );

    report.durationMs = Date.now() - t0;
  } catch (e) {
    report.fatal = String(e && e.stack ? e.stack : e);
    logStep('fatal', 'Smoke test dừng giữa chừng vì lỗi', false, report.fatal);
    console.error('FATAL', report.fatal);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
  report.consoleOk = report.consoleErrors.length === 0 && report.pageErrors.length === 0;
  fs.writeFileSync(path.join(OUT, 'quest-smoke.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.steps.every((s) => s.ok) && report.consoleOk ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
