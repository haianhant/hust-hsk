// step8-check.cjs — Kiểm tra trình duyệt Bước 8: gợi ý mở app, lịch ôn SRS,
// sổ lỗi, huy hiệu toàn cục, streak HUD, phiên ôn nhanh (0 lỗi console/page).
//
// Chạy: node test/step8-check.cjs (server riêng 127.0.0.1:8333, một context
// WebGL tại một thời điểm — SwiftShader không chịu nổi 2 context cùng lúc).
//
// Seed tiến độ: 1 từ quá hạn 3 ngày, 1 từ đến hạn hôm nay, 2 từ sai chưa sửa
// (1 HSK 3 + 1 HSK 4), streak 5 ngày, đã xong 2 quest HSK 3.
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8333/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const report = { tool: 'step8-check', at: new Date().toISOString(), steps: [], shots: {}, consoleErrors: [], pageErrors: [] };
function logStep(id, name, ok, detail) {
  report.steps.push({ id, name, ok, detail: detail ?? null, at: new Date().toISOString() });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${id}] ${name}${detail ? ' — ' + detail : ''}`);
  return ok;
}
function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', '8333', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
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
const waitText = async (page, text, timeout = 60000) => {
  await page.waitForFunction((t) => document.body.innerText.includes(t), text, { timeout });
};
const clickTestId = async (page, id) => {
  await page.waitForSelector(`[data-testid="${id}"]`, { timeout: 60000 });
  await page.click(`[data-testid="${id}"]`);
};
const getProgress = (page) =>
  page.evaluate(() => {
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
    attachErrorHooks(page);

    // --- Seed tiến độ (ngày tương đối theo ngày hiện tại ICT — seed cũ ghi
    // cứng 2026-11-06 nên chạy sang ngày 07/11 thì nhóm "hôm nay" thành quá
    // hạn, phiên ôn quét luôn từ lỗi và sổ lỗi trống → fail oan, xem
    // PROGRESS đợt 3 tích hợp). Tính "hôm nay" theo giờ Asia/Ho_Chi_Minh. ---
    const nowICT = new Date(Date.now() + 7 * 3600 * 1000);
    const todayStr = nowICT.toISOString().slice(0, 10);
    const addDays = (s, n) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    const D = { today: todayStr, overdue: addDays(todayStr, -3), later: addDays(todayStr, 2), yesterday: addDays(todayStr, -1) };
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate((D) => {
      const mk = (id, level, nextDue, extra) => ({
        lexemeId: id, level, nextDue, lastSeen: `${D.yesterday}T10:00:00.000Z`,
        correctCount: level, wrongCount: extra?.wrongCount ?? 0,
        lastWrongAt: extra?.lastWrongAt ?? null, lastCorrectAt: extra?.lastCorrectAt ?? null,
      });
      window.localStorage.setItem('bkhn-progress-v1', JSON.stringify({
        version: 1,
        lexemes: {
          'hsk3-l10-g1-shuxue': mk('hsk3-l10-g1-shuxue', 1, D.overdue, { wrongCount: 1, lastWrongAt: `${D.yesterday}T02:00:00.000Z` }),
          'hsk3-l11-g2-jiejue': mk('hsk3-l11-g2-jiejue', 1, D.today),
          'hsk4-shang-l1-g1-qianzheng': mk('hsk4-shang-l1-g1-qianzheng', 0, D.today, { wrongCount: 2, lastWrongAt: `${D.today}T01:00:00.000Z` }),
          'hsk4-xia-l20-g1-cheng': mk('hsk4-xia-l20-g1-cheng', 2, D.later),
        },
        encountered: ['hsk3-l10-g1-shuxue', 'hsk3-l11-g2-jiejue', 'hsk4-shang-l1-g1-qianzheng', 'hsk4-xia-l20-g1-cheng'],
        events: [], points: 120, badges: ['first-lesson', 'l11'],
        completedQuests: {
          'first-lesson': { at: `${D.yesterday}T10:00:00.000Z`, points: 50 },
          l11: { at: `${D.yesterday}T11:00:00.000Z`, points: 50 },
        },
        streak: { count: 5, lastDay: D.yesterday },
        settings: { soundOn: true, speechRate: 1, showPinyin: true },
        questState: null,
      }));
    }, D);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });

    // --- 1. Màn mở đầu: gợi ý đến hạn ôn + nút Mở lịch ôn -------------------
    await page.waitForSelector('#enter-campus', { timeout: 30000 });
    const entryText = await page.evaluate(() => document.body.innerText);
    // 3 từ đến hạn: 1 quá hạn (shuxue) + 2 hôm nay (jiejue, qianzheng).
    logStep('entry-suggestion', 'Màn mở đầu hiện gợi ý từ đến hạn ôn',
      entryText.includes('đến hạn ôn') && entryText.includes('3 từ'), entryText.match(/Hôm nay có .* đến hạn ôn/)?.[0]);
    logStep('entry-streak', 'Màn mở đầu hiện chuỗi 5 ngày',
      entryText.includes('chuỗi 5 ngày'));
    await shot(page, 'step8-entry.png', 'Màn mở đầu: gợi ý ôn 3 từ đến hạn');
    const pointsBefore = (await getProgress(page)).points;

    // --- 2. Mở lịch ôn từ gợi ý ----------------------------------------------
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      btns.find((b) => b.innerText.includes('Mở lịch ôn'))?.click();
    });
    await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
    await sleep(2500);
    await page.waitForSelector('[data-testid="review-calendar"]', { timeout: 30000 });
    const calText = await page.evaluate(() => document.querySelector('[data-testid="review-calendar"]').innerText);
    logStep('calendar-overdue', `Lịch ôn hiện nhóm quá hạn (từ ${D.overdue})`,
      calText.includes('Quá hạn') && calText.includes('数学'));
    logStep('calendar-today', 'Lịch ôn hiện nhóm hôm nay',
      calText.includes('Hôm nay') && calText.includes('解决'));
    logStep('hud-streak', 'HUD hiện streak 🔥 5 ngày',
      (await page.evaluate(() => document.body.innerText)).includes('🔥 5 ngày'));
    await shot(page, 'step8-calendar.png', 'Sổ tay tab Lịch ôn: quá hạn + hôm nay');

    // --- 3. Phiên ôn nhanh từ lịch ôn (nhớ đúng → +10đ, level +1) ------------
    await page.evaluate(() => {
      const cal = document.querySelector('[data-testid="review-calendar"]');
      [...cal.querySelectorAll('button')].find((b) => b.innerText.startsWith('Ôn '))?.click();
    });
    await page.waitForSelector('[data-testid="review-session"]', { timeout: 30000 });
    // Ôn từng từ: hiện nghĩa → Đã nhớ.
    for (let i = 0; i < 5; i++) {
      const done = await page.evaluate(() => !!document.querySelector('[data-testid="review-summary"]'));
      if (done) break;
      await clickTestId(page, 'review-reveal');
      await clickTestId(page, 'review-remember');
      await sleep(300);
    }
    await page.waitForSelector('[data-testid="review-summary"]', { timeout: 30000 });
    const summary = await page.evaluate(() => document.querySelector('[data-testid="review-summary"]').innerText);
    logStep('review-session', 'Phiên ôn chạy tới màn tổng kết',
      summary.includes('Xong phiên ôn'), summary.split('\n')[1] ?? summary);
    const afterReview = await getProgress(page);
    logStep('review-points', 'Ôn đúng hạn cộng điểm (+10đ/từ nhớ)',
      afterReview.points > pointsBefore, `điểm ${pointsBefore} → ${afterReview.points}`);
    logStep('review-level', 'Từ nhớ đúng lên level (shuxue 1 → 2)',
      afterReview.lexemes['hsk3-l10-g1-shuxue'].level === 2,
      `level=${afterReview.lexemes['hsk3-l10-g1-shuxue'].level}`);
    await clickTestId(page, 'review-close');
    await sleep(500);

    // --- 4. Sổ lỗi: nhóm theo bài, vòng ôn lỗi 0đ ----------------------------
    await page.click('#open-handbook');
    await page.waitForSelector('[data-testid="lesson-picker"], [data-testid="review-calendar"], [data-testid="error-notebook"], [data-testid="badge-list"]', { timeout: 30000 }).catch(() => {});
    // Sổ tay mở ở tab mặc định; bấm tab "Sổ lỗi".
    await page.evaluate(() => {
      [...document.querySelectorAll('button')].find((b) => b.innerText.startsWith('Sổ lỗi'))?.click();
    });
    await page.waitForSelector('[data-testid="error-notebook"]', { timeout: 30000 });
    const errText = await page.evaluate(() => document.querySelector('[data-testid="error-notebook"]').innerText);
    // Phiên ôn ở bước 3 đã sửa đúng shuxue (quá hạn) nên nó rời sổ lỗi;
    // chỉ còn qianzheng (sai 2 lần, bài 1 thượng) trong sổ.
    logStep('error-notebook', 'Sổ lỗi gom từ sai chưa sửa theo bài (shuxue đã sửa ở bước 3 nên rời sổ)',
      errText.includes('签证') && errText.includes('sai 2 lần') && !errText.includes('数学'),
      errText.split('\n').slice(0, 3).join(' | '));
    await shot(page, 'step8-errors.png', 'Sổ tay tab Sổ lỗi');
    const pointsBeforeError = (await getProgress(page)).points;
    await page.evaluate(() => {
      const nb = document.querySelector('[data-testid="error-notebook"]');
      [...nb.querySelectorAll('button')].find((b) => b.innerText.includes('Ôn lại'))?.click();
    });
    await page.waitForSelector('[data-testid="review-session"]', { timeout: 30000 });
    // Ôn lỗi: nhớ đúng 1 từ → từ rời sổ, 0đ.
    await clickTestId(page, 'review-reveal');
    await clickTestId(page, 'review-remember');
    await sleep(300);
    // Nếu còn từ lỗi khác thì cũng ôn cho xong để tới tổng kết.
    for (let i = 0; i < 4; i++) {
      const done = await page.evaluate(() => !!document.querySelector('[data-testid="review-summary"]'));
      if (done) break;
      await clickTestId(page, 'review-reveal');
      await clickTestId(page, 'review-remember');
      await sleep(300);
    }
    await page.waitForSelector('[data-testid="review-summary"]', { timeout: 30000 });
    const afterError = await getProgress(page);
    logStep('error-zero-points', 'Vòng ôn lỗi 0 điểm',
      afterError.points === pointsBeforeError, `điểm giữ ${pointsBeforeError}`);
    logStep('error-fixed', 'Từ sửa đúng rời sổ lỗi (qianzheng lastCorrectAt mới hơn lastWrongAt)',
      (afterError.lexemes['hsk4-shang-l1-g1-qianzheng'].lastCorrectAt ?? '') >
      (afterError.lexemes['hsk4-shang-l1-g1-qianzheng'].lastWrongAt ?? ''));
    await clickTestId(page, 'review-close');
    await sleep(500);

    // --- 5. Huy hiệu toàn cục -------------------------------------------------
    await page.click('#open-handbook');
    await sleep(500);
    await page.evaluate(() => {
      [...document.querySelectorAll('button')].find((b) => b.innerText.startsWith('Huy hiệu'))?.click();
    });
    await page.waitForSelector('[data-testid="badge-list"]', { timeout: 30000 });
    const badgeText = await page.evaluate(() => document.querySelector('[data-testid="badge-list"]').innerText);
    logStep('badges-list', 'Tab Huy hiệu liệt kê 6 huy hiệu toàn cục + tiến độ',
      badgeText.includes('Bạn của thư viện') && badgeText.includes('Chăm ôn tập') &&
      badgeText.includes('Hoàn thành HSK 3') && badgeText.includes('Bền bỉ 7 ngày') &&
      badgeText.includes('2/10 quest HSK 3'));
    logStep('badges-lesson', 'Tab Huy hiệu hiện huy hiệu từng bài đã nhận',
      badgeText.includes('Buổi học đầu tiên'));
    await shot(page, 'step8-badges.png', 'Sổ tay tab Huy hiệu');

    await ctx.close();

    const failed = report.steps.filter((s) => !s.ok);
    console.log(`\nSTEP8-CHECK: ${report.steps.length - failed.length}/${report.steps.length} bước PASS; ` +
      `console errors: ${report.consoleErrors.length}; page errors: ${report.pageErrors.length}`);
    if (report.consoleErrors.length) console.log('consoleErrors:', report.consoleErrors.slice(0, 5));
    if (report.pageErrors.length) console.log('pageErrors:', report.pageErrors.slice(0, 5));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
  fs.writeFileSync(path.join(OUT, 'step8-check.json'), JSON.stringify(report, null, 2));
  console.log('report: test-shots/step8-check.json');
  const failed = report.steps.filter((s) => !s.ok);
  if (failed.length > 0 || report.consoleErrors.length > 0 || report.pageErrors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('step8-check lỗi:', e);
  process.exitCode = 1;
});
