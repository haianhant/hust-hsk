// smoke-step6.cjs — Smoke test Bước 6 + Bước 7: menu "Đổi bài" mở khóa
// 9 bài HSK 3 + 20 bài HSK 4 (HSK 5 vẫn khóa) + bước đầu tiên của từng
// quest mới hiện đúng, 0 lỗi console/page.
//
// Chạy: node test/smoke-step6.cjs (server riêng 127.0.0.1:8331, một context
// WebGL tại một thời điểm — SwiftShader không chịu nổi 2 context cùng lúc).
//
// Lượt A (profile trống): menu hiện đủ 9 bài HSK 3 + 20 bài HSK 4 ở trạng
// thái "Chưa bắt đầu", HSK 5 vẫn khóa; bấm từng bài 10–18 → bước chào của
// Minh hiện đúng chủ đề bài đó (bài 10 mở tuyến nhóm 1 như cũ).
// Lượt B (profile đã hoàn thành tuyến bài 10 nhóm 1): bấm bài 10 → mở
// tuyến nhóm 2–4 (l10-g234), nhãn bài 10 hiện "Nhóm 1 ✓".
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8331/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const report = { tool: 'smoke-step6', at: new Date().toISOString(), steps: [], shots: {}, consoleErrors: [], pageErrors: [] };
function logStep(run, id, name, ok, detail) {
  const s = { run, id, name, ok, detail: detail ?? null, at: new Date().toISOString() };
  report.steps.push(s);
  console.log(`${ok ? 'PASS' : 'FAIL'} [${run}/${id}] ${name}${detail ? ' — ' + detail : ''}`);
  return ok;
}
function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', '8331', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
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

/** Câu chào Minh (vi) đặc trưng từng quest + tiêu đề hiện ở nhãn panel. */
const QUESTS = [
  { lesson: 'hsk3-l10', quest: 'first-lesson', title: 'Buổi học đầu tiên', lessonTitle: '你明天再把书还给我', greet: 'Hôm nay có tiết Toán' },
  { lesson: 'hsk3-l11', quest: 'l11', title: 'Bài 11 — Giải quyết vấn đề', lessonTitle: '看来我没办法解决这个问题', greet: 'Hôm nay mình cùng đi họp' },
  { lesson: 'hsk3-l12', quest: 'l12', title: 'Bài 12 — Thời tiết bốn mùa', lessonTitle: '这个季节天气变化很快', greet: 'Hôm nay thời tiết rất đẹp' },
  { lesson: 'hsk3-l13', quest: 'l13', title: 'Bài 13 — Hàng xóm mới', lessonTitle: '我的新邻居来自英国', greet: 'hàng xóm mới của mình đãi khách' },
  { lesson: 'hsk3-l14', quest: 'l14', title: 'Bài 14 — Sách bị mượn mất', lessonTitle: '这本书被别人借走了', greet: 'Hôm nay mình cùng đến thư viện' },
  { lesson: 'hsk3-l15', quest: 'l15', title: 'Bài 15 — Nửa người Nam Kinh', lessonTitle: '我是半个南京人', greet: 'Hôm nay mình cùng tìm hiểu về Nam Kinh' },
  { lesson: 'hsk3-l16', quest: 'l16', title: 'Bài 16 — Gấu trúc ra nước ngoài', lessonTitle: '我听说有的熊猫出国了', greet: 'Hôm nay là cuối tuần, mình cùng đi vườn thú' },
  { lesson: 'hsk3-l17', quest: 'l17', title: 'Bài 17 — Học hỏi người chăm chỉ', lessonTitle: '我要多向认真的人学习', greet: 'Hôm nay mình cùng học hỏi những người thông minh' },
  { lesson: 'hsk3-l18', quest: 'l18', title: 'Bài 18 — Học gói bánh chẻo', lessonTitle: '我学会了包饺子', greet: 'Tết Nguyên đán sắp đến' },
];

async function enterFresh(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#enter-campus', { timeout: 30000 });
  await page.click('#enter-campus');
  await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
  await sleep(2500);
}

async function openMenu(page) {
  // Idempotent: menu đang mở thì không bấm lại (overlay z-40 đang che nút
  // Đổi bài phía dưới, bấm lại sẽ bị chặn pointer events).
  const alreadyOpen = await page.evaluate(() => !!document.querySelector('[data-testid="lesson-picker"]'));
  if (alreadyOpen) return;
  await page.click('#change-lesson');
  await page.waitForSelector('[data-testid="lesson-picker"]', { timeout: 30000 });
}

/** Thoát buổi học giữa chừng (nút 🚪 Thoát ở panel) để chọn bài khác. */
async function exitLesson(page) {
  await page.waitForSelector('button[aria-label="Thoát buổi học"]', { timeout: 30000 });
  await page.click('button[aria-label="Thoát buổi học"]');
  await sleep(800);
}

async function main() {
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: EXE,
      args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
    });

    // --- Lượt A: profile trống ---------------------------------------------
    {
      const run = 'A-fresh';
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      attachErrorHooks(page);
      await enterFresh(page);
      await openMenu(page);
      await shot(page, 'step6-menu.png', 'Menu Đổi bài: 9 bài HSK 3 + 20 bài HSK 4 mở khóa, HSK 5 khóa');
      const menuText = await page.evaluate(() => document.body.innerText);
      for (const q of QUESTS) {
        logStep(run, `menu-${q.lesson}`, `Menu có nút bài ${q.lesson} (“${q.lessonTitle}”)`, menuText.includes(q.lessonTitle));
      }
      logStep(run, 'menu-all-unstarted', 'Menu: các bài đều "Chưa bắt đầu" (profile trống)',
        (menuText.match(/Chưa bắt đầu/g) || []).length >= 29, `số nhãn "Chưa bắt đầu": ${(menuText.match(/Chưa bắt đầu/g) || []).length}`);
      const hsk4Count = await page.evaluate(
        () => document.querySelectorAll('[data-testid^="lesson-pick-hsk4-"]').length,
      );
      logStep(run, 'menu-hsk4-unlocked', 'Menu: HSK 4 mở khóa đủ 20 bài, HSK 5 vẫn khóa',
        hsk4Count === 20 && menuText.includes('HSK 5 — Sắp ra mắt') && !menuText.includes('Sắp ra mắt ở Bước 7'),
        `số nút HSK 4: ${hsk4Count}`);
      for (const q of QUESTS) {
        // Sau lần Thoát trước, menu đã đóng → mở lại trước mỗi bài.
        await openMenu(page);
        await clickTestId(page, `lesson-pick-${q.lesson}`);
        await waitText(page, q.greet);
        await waitText(page, q.title);
        const qs = await page.evaluate(() => {
          const raw = window.localStorage.getItem('bkhn-progress-v1');
          return raw ? JSON.parse(raw).questState : null;
        });
        logStep(run, `first-step-${q.quest}`, `Bài ${q.lesson} → bước chào Minh đúng chủ đề ("${q.greet}")`,
          qs && qs.questId === q.quest && qs.stepIndex === 0, `questState=${JSON.stringify(qs)}`);
        if (q.quest === 'l11') {
          await shot(page, 'step6-l11-first-step.png', 'Tuyến bài 11 mới: bước chào Minh');
        }
        await exitLesson(page);
      }
      await ctx.close();
    }

    // --- Lượt B: đã hoàn thành tuyến bài 10 nhóm 1 --------------------------
    {
      const run = 'B-l10-done';
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      attachErrorHooks(page);
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
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
      await openMenu(page);
      const menuText = await page.evaluate(() => document.body.innerText);
      logStep(run, 'menu-l10-partial', 'Menu: bài 10 hiện "Nhóm 1 ✓ · Nhóm 2–4 chưa bắt đầu"',
        menuText.includes('Nhóm 1 ✓ · Nhóm 2–4 chưa bắt đầu'));
      await clickTestId(page, 'lesson-pick-hsk3-l10');
      await waitText(page, 'ôn tập tiếng Hán và nỗ lực học tập');
      await waitText(page, 'Bài 10 — Ôn tập & nỗ lực (nhóm 2–4)');
      const qs = await page.evaluate(() => {
        const raw = window.localStorage.getItem('bkhn-progress-v1');
        return raw ? JSON.parse(raw).questState : null;
      });
      logStep(run, 'first-step-l10-g234', 'Bài 10 → mở tuyến nhóm 2–4 (l10-g234), bước chào đúng',
        qs && qs.questId === 'l10-g234' && qs.stepIndex === 0, `questState=${JSON.stringify(qs)}`);
      await shot(page, 'step6-l10g234-first-step.png', 'Tuyến bài 10 nhóm 2–4: bước chào Minh');
      await ctx.close();
    }

    const failed = report.steps.filter((s) => !s.ok);
    console.log(`\nSMOKE-STEP6: ${report.steps.length - failed.length}/${report.steps.length} bước PASS; ` +
      `console errors: ${report.consoleErrors.length}; page errors: ${report.pageErrors.length}`);
    if (report.consoleErrors.length) console.log('consoleErrors:', report.consoleErrors.slice(0, 5));
    if (report.pageErrors.length) console.log('pageErrors:', report.pageErrors.slice(0, 5));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
  fs.writeFileSync(path.join(OUT, 'smoke-step6.json'), JSON.stringify(report, null, 2));
  console.log('report: test-shots/smoke-step6.json');
  const failed = report.steps.filter((s) => !s.ok);
  if (failed.length > 0 || report.consoleErrors.length > 0 || report.pageErrors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('smoke-step6 lỗi:', e);
  process.exitCode = 1;
});
