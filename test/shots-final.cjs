// shots-final.cjs — Ảnh đầu ra Bước 7/8: menu Đổi bài đã mở HSK 4 (thượng +
// hạ) và màn kết quả 1 tuyến HSK 4 chơi trọn. Seed để tuyến l1a là tuyến
// cuối cùng còn thiếu: hoàn thành l1a sẽ đạt 3 huy hiệu toàn cục cùng lúc
// (Bạn của thư viện ≥100 từ, Hoàn thành HSK 4 40/40, Bền bỉ 7 ngày) để màn
// kết quả hiện rõ mục "Huy hiệu toàn cục mới đạt". Dữ liệu quest (đáp án
// đúng, từ kiểm tra cuối + pinyin/chữ Hán) đọc từ file biên dịch
// test/.tmp-learn (biên dịch lại đầu script, giống play-all-quests).
//
// Chạy: node test/shots-final.cjs (server riêng 127.0.0.1:8335).
'use strict';
const { execSync } = require('node:child_process');
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const path = require('path');

const BASE = 'http://127.0.0.1:8335/';
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
const index4 = require('./.tmp-learn/content/hsk4-index.js');
const LEXEME_BY_ID = {};
for (const l of index4.ALL_HSK4_LEXEMES) LEXEME_BY_ID[l.id] = l;

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', '8335', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
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
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    page.on('pageerror', (e) => errors.push('page: ' + String(e)));

    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Seed: xong 39/40 quest HSK 4 (chừa l1a), gặp 99 từ HSK 4, streak 6
    // ngày (lastDay hôm qua) — hoàn thành l1a sẽ đạt 3 huy hiệu toàn cục.
    await page.evaluate(() => {
      const allQ = [
        'hsk4-shang-l1b', 'hsk4-shang-l2a', 'hsk4-shang-l2b', 'hsk4-shang-l3a', 'hsk4-shang-l3b',
        'hsk4-shang-l4a', 'hsk4-shang-l4b', 'hsk4-shang-l5a', 'hsk4-shang-l5b', 'hsk4-shang-l6a',
        'hsk4-shang-l6b', 'hsk4-shang-l7a', 'hsk4-shang-l7b', 'hsk4-shang-l8a', 'hsk4-shang-l8b',
        'hsk4-shang-l9a', 'hsk4-shang-l9b', 'hsk4-shang-l10a', 'hsk4-shang-l10b',
        'hsk4-xia-l11a', 'hsk4-xia-l11b', 'hsk4-xia-l12a', 'hsk4-xia-l12b', 'hsk4-xia-l13a',
        'hsk4-xia-l13b', 'hsk4-xia-l14a', 'hsk4-xia-l14b', 'hsk4-xia-l15a', 'hsk4-xia-l15b',
        'hsk4-xia-l16a', 'hsk4-xia-l16b', 'hsk4-xia-l17a', 'hsk4-xia-l17b', 'hsk4-xia-l18a',
        'hsk4-xia-l18b', 'hsk4-xia-l19a', 'hsk4-xia-l19b', 'hsk4-xia-l20a', 'hsk4-xia-l20b',
      ];
      const completedQuests = {};
      allQ.forEach((q) => { completedQuests[q] = { at: '2026-11-06T00:00:00.000Z', points: 50 }; });
      const lexemes = {};
      const encountered = [];
      for (let i = 0; i < 99; i++) {
        const id = `seed-word-${i}`;
        encountered.push(id);
        lexemes[id] = { seen: true, correctCount: 0, wrongCount: 0, level: 0, nextDue: null, lastWrongAt: null, lastCorrectAt: null };
      }
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      window.localStorage.setItem('bkhn-progress-v1', JSON.stringify({
        version: 1, lexemes, encountered, events: [], points: 1950,
        badges: [...allQ], completedQuests,
        streak: { count: 6, lastDay: yesterday },
        settings: { soundOn: true, speechRate: 1, showPinyin: true },
        questState: null,
      }));
    });
    await page.waitForSelector('#enter-campus', { timeout: 30000 });
    await page.click('#enter-campus');
    await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
    await sleep(2500);

    // 1. Menu Đổi bài: cuộn tới HSK 4 thượng rồi HSK 4 hạ, chụp 2 ảnh.
    await page.click('#change-lesson');
    await page.waitForSelector('[data-testid="lesson-picker"]', { timeout: 30000 });
    await page.evaluate(() => {
      document.querySelector('[data-testid="lesson-pick-hsk4-shang-l1"]').scrollIntoView({ block: 'center' });
    });
    await sleep(600);
    await page.screenshot({ path: path.join(OUT, 'final-menu-hsk4-shang.png'), timeout: 120000 });
    await page.evaluate(() => {
      document.querySelector('[data-testid="lesson-pick-hsk4-xia-l11"]').scrollIntoView({ block: 'center' });
    });
    await sleep(600);
    await page.screenshot({ path: path.join(OUT, 'final-menu-hsk4-xia.png'), timeout: 120000 });
    console.log('menu shots: final-menu-hsk4-shang.png, final-menu-hsk4-xia.png');

    // 2. Chơi trọn hsk4-shang-l1a tới màn kết quả (đúng khung L11, đáp án
    // lấy từ quest def đã biên dịch).
    const def = questData.getQuestDef('hsk4-shang-l1a');
    await clickTestId(page, 'lesson-pick-hsk4-shang-l1');
    await clickTestId(page, 'quest-continue');
    await waitText(page, 'Đi tới cửa phòng học');
    await clickTestId(page, 'quest-close-panel');
    await page.evaluate(() => window.__bkhn.teleport(-58, -44));
    await waitText(page, 'Vào phòng học');
    await page.keyboard.press('e');
    await waitText(page, 'Phòng học mô phỏng');
    await clickTestId(page, 'quest-continue');
    for (const stepNo of [3, 4]) {
      const step = def.steps[stepNo];
      const correctIdx = step.options.findIndex((o) => o.correct);
      await waitText(page, step.scenario.slice(0, 20));
      await clickTestId(page, `meaning-option-${correctIdx}`);
      await waitText(page, step.options[correctIdx].explain.slice(0, 20));
      await clickTestId(page, 'quest-continue');
    }
    const s6 = def.steps[5];
    if (s6.kind !== 'order') throw new Error('l1a bước 6 không phải order, script chụp ảnh chưa hỗ trợ');
    await waitText(page, 'Xếp các thẻ từ');
    for (const t of s6.tiles) await clickTestId(page, `order-tile-${t}`);
    await clickTestId(page, 'order-check');
    await waitText(page, 'Đúng rồi!');
    await clickTestId(page, 'quest-continue');
    const review = def.steps[6];
    await waitText(page, 'Kiểm tra cuối');
    for (let i = 0; i < 5; i++) {
      const target = LEXEME_BY_ID[review.lexemeIds[i]];
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
    await page.waitForSelector('[data-testid="result-continue"]', { timeout: 60000 });
    await sleep(800);
    await page.screenshot({ path: path.join(OUT, 'final-result-hsk4-l1a.png'), timeout: 120000 });
    console.log('result shot: final-result-hsk4-l1a.png');
    // Xác minh trên màn kết quả (chưa bấm "Tiếp tục" nên completedQuests
    // chưa có l1a — kiểm tra text huy hiệu hiển thị, không đọc localStorage).
    const resultText = await page.evaluate(() => document.body.innerText);
    const hasHsk4Badge = resultText.includes('Hoàn thành HSK 4') && resultText.includes('mới đạt!');
    const newBadgeCount = (resultText.match(/mới đạt!/g) || []).length;
    console.log(`màn kết quả: "Hoàn thành HSK 4 · mới đạt!" = ${hasHsk4Badge}; số "mới đạt!" = ${newBadgeCount} (kỳ vọng 3) | errors:`, errors.length ? errors : '0');
    if (!hasHsk4Badge || newBadgeCount !== 3) throw new Error('màn kết quả thiếu huy hiệu toàn cục mới đạt');
    await ctx.close();
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

main().catch((e) => {
  console.error('shots-final lỗi:', e);
  process.exitCode = 1;
});
