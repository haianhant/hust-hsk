/**
 * test/boardgame-visual-prototype.cjs
 * Kiểm thử trình duyệt Desktop (1440x900) & Mobile (390x844) cho route
 * `/boardgame-prototype` từ bản xuất tĩnh `out/`:
 *   1. Không lỗi console/pageerror/HTTP >= 400.
 *   2. Toàn bộ artwork AI 2:3 tải hoàn chỉnh (naturalWidth >= 700, 0 broken images).
 *   3. Kiểm chứng tỷ lệ khung thẻ chuẩn 2:3 trên DOM.
 *   4. Kiểm chứng bảo mật P0 khi chuyển sang chế độ Đối thủ/Khán giả chưa lật vai
 *      & khi người ngoài xem Thẻ Điều Tra kín.
 *   5. Kiểm tra Mobile 390x844 không tràn ngang (`scrollWidth <= innerWidth + 1`).
 *   6. Chụp bộ 5 screenshot vào `test-results/boardgame-prototype/`.
 */
'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');
const SHOT_DIR =
  process.env.PROTOTYPE_SHOT_DIR || path.join(ROOT, 'test-results', 'boardgame-prototype');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function startOutServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rawClean = (req.url || '/').split('?')[0];
      const cleanUrl = rawClean.length > 1 ? rawClean.replace(/\/+$/, '') : rawClean;
      let filePath = path.join(OUT_DIR, cleanUrl === '/' ? 'index.html' : cleanUrl);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      } else if (!fs.existsSync(filePath) && fs.existsSync(`${filePath}.html`)) {
        filePath = `${filePath}.html`;
      }
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
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
    process.env.PLAYWRIGHT_CORE_PATH,
    path.join(ROOT, 'node_modules/playwright-core'),
    path.join(ROOT, 'node_modules/playwright'),
    'playwright-core',
    'playwright',
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      return require(p);
    } catch {
      // try next candidate
    }
  }
  throw new Error('playwright-core not found — run `npm ci` or install `playwright-core@1.48.2`.');
}

function resolveBrowserExecutable(chromium) {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  if (chromium && typeof chromium.executablePath === 'function') {
    const pwExec = chromium.executablePath();
    if (pwExec && fs.existsSync(pwExec)) {
      return undefined;
    }
  }
  for (const p of [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ]) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No Chromium/Chrome executable found.');
}

async function main() {
  assert.equal(fs.existsSync(OUT_DIR), true, 'Run `npm run build` before running prototype visual test');
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const { chromium } = loadPlaywright();
  const executablePath = resolveBrowserExecutable(chromium);
  const { server, url } = await startOutServer();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  const errors = [];
  try {
    // -------------------- 1. DESKTOP (1440x900) --------------------
    const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await desktopCtx.newPage();
    page.on('pageerror', (err) => errors.push(`desktop pageerror: ${err.message}`));
    page.on('response', (res) => {
      if (res.status() >= 400 && !res.url().endsWith('/favicon.ico')) {
        errors.push(`desktop HTTP ${res.status()} on ${res.url()}`);
      }
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const txt = msg.text();
        // Browser logs a generic 404 console error for missing default /favicon.ico;
        // real asset/JS 404s are caught strictly by page.on('response') above.
        if (!txt.includes('Failed to load resource: the server responded with a status of 404')) {
          errors.push(`desktop console.error: ${txt}`);
        }
      }
    });

    await page.goto(`${url}/boardgame-prototype`, { waitUntil: 'networkidle', timeout: 45_000 });
    await page.waitForSelector('[data-testid="bg-visual-prototype-page"]', { timeout: 20_000 });
    await page.waitForSelector('[data-testid="proto-new-card-minh"]', { timeout: 20_000 });

    // Kiểm tra toàn bộ ảnh đã tải thành công + kích thước hợp lệ
    const imgAudit = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.map((im) => ({
        src: im.getAttribute('src'),
        complete: im.complete,
        naturalWidth: im.naturalWidth,
        naturalHeight: im.naturalHeight,
      }));
    });
    assert.ok(imgAudit.length >= 8, `Expected prototype images on DOM, got ${imgAudit.length}`);
    for (const im of imgAudit) {
      assert.equal(im.complete, true, `Image not complete: ${im.src}`);
      assert.ok(im.naturalWidth >= 700, `Image naturalWidth too small (${im.naturalWidth}): ${im.src}`);
    }

    // Kiểm tra tỷ lệ khung thẻ chuẩn 2:3 (Minh, Vy & 3 lá bài)
    const ratioAudit = await page.evaluate(() => {
      const ids = [
        'proto-new-card-minh',
        'proto-new-card-vy',
        'proto-action-card-inv-12',
        'proto-action-card-eq-04',
        'proto-action-card-ev-01',
      ];
      return ids.map((id) => {
        const el = document.querySelector(`[data-testid="${id}"]`);
        const rect = el ? el.getBoundingClientRect() : null;
        return {
          id,
          width: rect?.width ?? 0,
          height: rect?.height ?? 0,
          ratio: rect && rect.height > 0 ? rect.width / rect.height : 0,
        };
      });
    });
    for (const r of ratioAudit) {
      assert.ok(r.width >= 200 && r.height >= 300, `Card ${r.id} dimensions too small: ${r.width}x${r.height}`);
      assert.ok(Math.abs(r.ratio - 2 / 3) < 0.04, `Card ${r.id} aspect ratio ${r.ratio} deviates from 2:3`);
    }

    // Kiểm tra ngang desktop
    const desktopOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    assert.ok(desktopOverflow <= 1, `Desktop horizontal overflow: ${desktopOverflow}px`);

    // Screenshot 1A: VFX Sandbox Demo — Súng Liên Thanh & Vy Radio Tuyệt Kỹ
    await page.locator('[data-testid="proto-section-vfx-sandbox"]').scrollIntoViewIfNeeded();
    await page.waitForSelector('[data-testid="bg-vfx-targeting-line"]', { timeout: 5000 });

    // Demo 1: Đánh thường
    await page.locator('[data-testid="proto-vfx-demo-normal"]').click();
    await page.waitForSelector('[data-testid="bg-vfx-dice-overlay"]', { timeout: 3000 });
    await page.waitForSelector('[data-testid="bg-vfx-floating-popup"]', { timeout: 3000 });

    // Demo 2: Masamune + Dũng Phản kích
    await page.locator('[data-testid="proto-vfx-demo-masamune"]').click();
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('[data-testid="bg-vfx-floating-popup"]')).some((el) => el.textContent?.includes('COUNTER')),
      null,
      { timeout: 3000 },
    );

    // Demo 3: Súng Liên Thanh (đa mục tiêu + BLOCK)
    await page.locator('[data-testid="proto-vfx-demo-machinegun"]').click();
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('[data-testid="bg-vfx-floating-popup"]')).some((el) => el.textContent?.includes('BLOCK')),
      null,
      { timeout: 3000 },
    );

    // Test Skip Animation (bấm Skip phải dọn sạch ngay cut-in/popup)
    await page.locator('[data-testid="proto-vfx-demo-vy-radio"]').click();
    await page.waitForSelector('[data-testid="bg-vfx-cutin"]', { timeout: 3000 });
    const cutInMeta = await page.evaluate(() => {
      const ci = document.querySelector('[data-testid="bg-vfx-cutin"]');
      const img = ci?.querySelector('img');
      return {
        bannerType: ci?.getAttribute('data-banner-type'),
        text: ci?.textContent || '',
        portraitSrc: img?.getAttribute('src') || null,
      };
    });
    assert.equal(cutInMeta.bannerType, 'ULTIMATE_SKILL');
    assert.ok(cutInMeta.text.includes('XUNG CAO ÁP 1D6'));
    assert.ok(cutInMeta.portraitSrc?.includes('role-vy-radio.webp'), 'Vy Radio Ultimate cut-in must show large Vy portrait');
    await page.screenshot({ path: path.join(SHOT_DIR, 'prototype-06-desktop-vfx-demo.png') });

    await page.locator('[data-testid="bg-skip-vfx-btn"]').click();
    await page.locator('[data-testid="bg-vfx-cutin"]').waitFor({ state: 'detached', timeout: 2000 });

    // Demo 5: Lật Vai Minh + Rút Trang Bị 3D
    await page.locator('[data-testid="proto-vfx-demo-reveal"]').click();
    await page.waitForSelector('[data-testid="bg-vfx-card-draw"]', { timeout: 3000 });
    await page.waitForSelector('[data-testid="bg-vfx-cutin"]', { timeout: 3000 });
    await page.locator('[data-testid="bg-skip-vfx-btn"]').click();

    // Screenshot 1: So sánh Cũ vs Mới (Minh)
    await page.locator('[data-testid="proto-compare-minh"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(SHOT_DIR, 'prototype-01-desktop-comparison.png') });

    // Screenshot 1B: So sánh Cũ vs Mới (Vy) + 3 Hệ màu phe
    await page.locator('[data-testid="proto-compare-vy"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(SHOT_DIR, 'prototype-01b-desktop-vy.png') });

    // Screenshot 2: 3 Thẻ bài mẫu Điều tra / Trang bị / Đột Kích & Mặt lưng chồng bài
    await page.locator('[data-testid="proto-section-action-cards"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(SHOT_DIR, 'prototype-02-desktop-cards-and-factions.png') });

    // Test Bảo mật P0: cuộn về vùng So sánh Nhân vật, chuyển sang "Đối thủ / Khán giả chưa lật vai" & "Người ngoài nhìn Thẻ Điều Tra"
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await page.waitForTimeout(150);
    await page.locator('[data-testid="proto-secrecy-other-player"]').click();
    await page.locator('[data-testid="proto-card-zone-1"]').click();
    await page.waitForTimeout(750); // chờ animation lật 3D hoàn tất

    const secrecyAudit = await page.evaluate(() => {
      const minhEl = document.querySelector('[data-testid="proto-new-card-minh"]');
      const vyEl = document.querySelector('[data-testid="proto-new-card-vy"]');
      const invEl = document.querySelector('[data-testid="proto-action-card-inv-12"]');
      const eqEl = document.querySelector('[data-testid="proto-action-card-eq-04"]');
      const statusText = document.querySelector('[data-testid="proto-secrecy-status"]')?.textContent || '';
      return {
        minhHtml: minhEl?.innerHTML || '',
        vyHtml: vyEl?.innerHTML || '',
        invText: invEl?.textContent || '',
        eqText: eqEl?.textContent || '',
        statusText,
      };
    });

    assert.equal(secrecyAudit.minhHtml.includes('role-minh-ky-thuat.webp'), false, 'Hidden Minh card leaked portrait URL');
    assert.equal(secrecyAudit.minhHtml.includes('14/14'), false, 'Hidden Minh card leaked max HP');
    assert.equal(secrecyAudit.vyHtml.includes('role-vy-radio.webp'), false, 'Hidden Vy card leaked portrait URL');
    assert.equal(secrecyAudit.vyHtml.includes('12/12'), false, 'Hidden Vy card leaked max HP');
    assert.equal(secrecyAudit.invText.includes('THƯ KHÁM PHÁ KÍN 1-ĐỐI-1'), true, 'Outsider must see Investigation back');
    assert.equal(secrecyAudit.invText.includes('Thăm Dò: Tiên Tri'), false, 'Outsider must NOT see hidden Investigation card title');
    assert.equal(secrecyAudit.eqText.includes('Thương Ánh Sáng'), true, 'Equipped gear must remain visible to table');
    assert.equal(secrecyAudit.statusText.includes('showFront=false'), true);

    // Screenshot 3: Chế độ Bảo mật Ẩn vai & Mặt lưng
    await page.screenshot({ path: path.join(SHOT_DIR, 'prototype-03-desktop-secrecy-facedown.png') });
    await desktopCtx.close();

    // -------------------- 2. MOBILE (390x844) --------------------
    const mobileCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const mPage = await mobileCtx.newPage();
    mPage.on('pageerror', (err) => errors.push(`mobile pageerror: ${err.message}`));
    mPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        const txt = msg.text();
        if (!txt.includes('Failed to load resource: the server responded with a status of 404')) {
          errors.push(`mobile console.error: ${txt}`);
        }
      }
    });
    mPage.on('response', (res) => {
      if (res.status() >= 400 && !res.url().endsWith('/favicon.ico')) {
        errors.push(`mobile HTTP ${res.status()} on ${res.url()}`);
      }
    });

    await mPage.goto(`${url}/boardgame-prototype`, { waitUntil: 'networkidle', timeout: 45_000 });
    await mPage.waitForSelector('[data-testid="proto-new-card-minh"]', { timeout: 20_000 });

    const mobileOverflow = await mPage.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    assert.ok(mobileOverflow <= 1, `Mobile horizontal overflow: ${mobileOverflow}px`);

    // Screenshot 4: Mobile VFX Demo + So sánh thẻ Minh & Vy
    await mPage.locator('[data-testid="proto-vfx-demo-vy-radio"]').click();
    await mPage.waitForSelector('[data-testid="bg-vfx-cutin"]', { timeout: 3000 });
    await mPage.locator('[data-testid="proto-vfx-arena"]').evaluate((el) =>
      el.scrollIntoView({ block: 'center', behavior: 'instant' }),
    );
    await mPage.waitForTimeout(180);
    await mPage.screenshot({ path: path.join(SHOT_DIR, 'prototype-07-mobile-vfx-demo.png') });
    await mPage.locator('[data-testid="bg-skip-vfx-btn"]').click();

    await mPage.locator('[data-testid="proto-new-card-minh"]').scrollIntoViewIfNeeded();
    await mPage.waitForTimeout(200);
    await mPage.screenshot({ path: path.join(SHOT_DIR, 'prototype-04-mobile-comparison.png') });

    // Screenshot 5: Mobile 3 thẻ bài mẫu (lọc chế độ "Mới" cho gọn nét)
    await mPage.locator('[data-testid="proto-mobile-view-new"]').click();
    await mPage.locator('[data-testid="proto-action-card-inv-12"]').scrollIntoViewIfNeeded();
    await mPage.waitForTimeout(250);
    await mPage.screenshot({ path: path.join(SHOT_DIR, 'prototype-05-mobile-action-cards.png') });
    await mobileCtx.close();

    assert.deepEqual(errors, [], `Unexpected browser errors:\n${errors.join('\n')}`);
    console.log(
      JSON.stringify(
        {
          ok: true,
          shotDir: SHOT_DIR,
          desktopOverflow,
          mobileOverflow,
          imagesChecked: imgAudit.length,
          ratios: ratioAudit.map((r) => ({ id: r.id, size: `${Math.round(r.width)}x${Math.round(r.height)}`, ratio: +r.ratio.toFixed(3) })),
        },
        null,
        2,
      ),
    );
  } finally {
    if (errors.length > 0) {
      console.error('Collected browser errors:', errors);
    }
    await browser.close().catch(() => undefined);
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
