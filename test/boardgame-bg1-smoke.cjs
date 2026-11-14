/**
 * test/boardgame-bg1-smoke.cjs — Playwright Visual & Interactive Smoke Test cho BG1:
 *   1. Desktop (1280x800): Teleport tới trước cửa CLB Board Game KTX, kiểm tra prompt
 *      "🎲 Nhấn E — Vào CLB Board Game", chụp ảnh ngoại thất.
 *   2. Bấm E vào Phòng Sinh Hoạt Chung, chuyển Night lighting kiểm tra ấm áp,
 *      mở Sảnh bàn chơi (xác nhận Bàn 1 0/8, Bàn 2 0/8 - không có người chơi giả),
 *      ngồi vào ghế, mở Bảng luật chơi, xác nhận rời phòng quay về sân KTX.
 *   3. Mobile (390x844): Vào CLB, mở Sảnh bàn chơi, kiểm tra không tràn ngang (`scrollWidth <= innerWidth`),
 *      chụp ảnh kiểm tra bố cục thực tế.
 *
 * Run (after `npm run build`): node test/boardgame-bg1-smoke.cjs
 */
'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');
const SHOT_DIR = '/home/bao/.gemini/antigravity-cli/brain/f3119e13-33de-4820-bc0e-636c745568a1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};

function startOutServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const cleanUrl = (req.url || '/').split('?')[0];
      let filePath = path.join(OUT_DIR, cleanUrl === '/' ? 'index.html' : cleanUrl);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (!fs.existsSync(filePath)) {
        filePath = path.join(OUT_DIR, 'index.html');
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

function loadPlaywright() {
  const candidates = [
    path.join(ROOT, 'node_modules/playwright-core'),
    path.join(ROOT, 'node_modules/playwright'),
    '/home/bao/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-linux-x64/node_modules/playwright-core',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return require(p);
  }
  throw new Error('playwright-core not found');
}

async function main() {
  if (!fs.existsSync(path.join(OUT_DIR, 'index.html'))) {
    throw new Error('Missing out/index.html — run npm run build before boardgame-bg1-smoke.cjs');
  }
  const { chromium } = loadPlaywright();
  const { server, url } = await startOutServer();
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
      ],
    });

    // --- 1. Desktop (1280x800) ---
    const ctxDesktop = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const page = await ctxDesktop.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.locator('#enter-campus').click();
    await page.waitForFunction(() => Boolean(window.__bkhn && window.__bkhn.enterBoardGameClub), null, {
      timeout: 30000,
    });

    // Teleport đến trước cửa CLB Board Game KTX (109.9, -55.0) quay mặt về hướng Tây nhìn thẳng vào cửa nhà CLB
    await page.evaluate(() => {
      window.__bkhn.teleport(109.9, -55.0, Math.PI / 2, 0.14);
    });
    await page.waitForTimeout(450);
    try {
      await page.waitForFunction(
        () => document.body.innerText.includes('Vào CLB Board Game'),
        null,
        { timeout: 20000 },
      );
    } catch (err) {
      const diag = await page.evaluate(() => ({
        pos: window.__bkhn?.getPos?.(),
        text: document.body.innerText.slice(0, 400),
      }));
      console.error('DIAG:', JSON.stringify(diag), 'ERRORS:', errors);
      throw err;
    }
    await page.screenshot({ path: path.join(SHOT_DIR, 'bg1-01-exterior.png') });

    // Nhấn phím E để bước vào CLB Board Game KTX
    await page.keyboard.press('e');
    await page.waitForSelector('[data-testid="boardgame-club-hud"]', { timeout: 20000 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SHOT_DIR, 'bg1-02-lounge-day.png') });

    // Chuyển sang Ban đêm để kiểm tra ánh sáng tụ họp buổi tối ấm áp
    const nightBtn = page.locator('#toggle-time-of-day, button:has-text("Ngày"), button:has-text("Hoàng hôn"), button[aria-label*="thời gian"]').first();
    if (await nightBtn.count()) {
      await nightBtn.click();
      await page.waitForTimeout(150);
      await nightBtn.click();
      await page.waitForTimeout(350);
    }

    // Mở Sảnh bàn chơi, kiểm tra trạng thái thật 0/8 và ngồi vào Bàn 1
    await page.locator('[data-testid="bg-toggle-lobby-btn"]').click();
    await page.waitForSelector('[data-testid="boardgame-lobby-modal"]', { timeout: 20000 });
    const lobbyText = await page.locator('[data-testid="boardgame-lobby-modal"]').innerText();
    assert.ok(lobbyText.includes('0/8 ghế'), 'Sảnh ban đầu phải hiển thị đúng 0/8 ghế thật');
    await page.locator('[data-testid="bg-sit-table-1-btn"]').click();
    await page.waitForSelector('[data-testid="bg-stand-up-btn"]', { timeout: 20000 });
    await page.waitForTimeout(450);
    await page.screenshot({ path: path.join(SHOT_DIR, 'bg1-03-lounge-night-seated.png') });

    // Mở Luật chơi
    await page.locator('[data-testid="bg-toggle-rules-btn"]').click();
    await page.waitForSelector('[data-testid="boardgame-rules-modal"]', { timeout: 20000 });
    await page.screenshot({ path: path.join(SHOT_DIR, 'bg1-04-rules-modal.png') });
    await page.locator('[data-testid="bg-close-rules-btn"]').click();

    // Bấm Rời CLB khi đang ngồi ghế -> phải hiện hộp thoại xác nhận trước khi thoát
    await page.locator('[data-testid="bg-exit-lounge-btn"]').click();
    await page.waitForSelector('[data-testid="boardgame-exit-confirm-modal"]', { timeout: 20000 });
    await page.locator('[data-testid="bg-confirm-exit-btn"]').click();
    await page.waitForFunction(
      () => window.__bkhn.isInBoardGameClub && !window.__bkhn.isInBoardGameClub(),
      null,
      { timeout: 20000 },
    );

    const fatalErrors = errors.filter(
      (e) => !e.includes('WebSocket') && !e.includes('ERR_CONNECTION_REFUSED'),
    );
    assert.equal(fatalErrors.length, 0, `Desktop console/page errors: ${fatalErrors.join('; ')}`);
    await ctxDesktop.close();

    // --- 2. Mobile (390x844) ---
    const ctxMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const mPage = await ctxMobile.newPage();
    await mPage.goto(url, { waitUntil: 'domcontentloaded' });
    await mPage.locator('#enter-campus').click();
    await mPage.waitForFunction(() => Boolean(window.__bkhn && window.__bkhn.enterBoardGameClub), null, {
      timeout: 30000,
    });
    await mPage.evaluate(() => window.__bkhn.enterBoardGameClub());
    await mPage.waitForSelector('[data-testid="boardgame-club-hud"]', { timeout: 20000 });
    await mPage.locator('[data-testid="bg-toggle-lobby-btn"]').click();
    await mPage.waitForSelector('[data-testid="boardgame-lobby-modal"]');
    const noHorizontalOverflow = await mPage.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
    assert.equal(noHorizontalOverflow, true, 'Mobile 390x844 layout must not overflow horizontally');
    await mPage.screenshot({ path: path.join(SHOT_DIR, 'bg1-05-mobile-lobby.png') });
    await ctxMobile.close();

    console.log('BG1 Smoke PASS: desktop + mobile verified cleanly.');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
