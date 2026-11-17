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

async function measureVfxBurstPerformance(page, durationMs = 950) {
  const recPromise = page.evaluate((ms) => {
    return new Promise((resolve) => {
      const deltas = [];
      let prev = performance.now();
      const start = prev;
      function step(now) {
        deltas.push(now - prev);
        prev = now;
        if (now - start >= ms) {
          const valid = deltas.slice(1);
          const sorted = [...valid].sort((a, b) => a - b);
          const sum = valid.reduce((acc, v) => acc + v, 0);
          const avg = valid.length > 0 ? sum / valid.length : 16.67;
          const p50 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.5)] : avg;
          const p95 = sorted.length > 0 ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : avg;
          const max = sorted.length > 0 ? sorted[sorted.length - 1] : avg;
          const mem = performance.memory && typeof performance.memory.usedJSHeapSize === 'number'
            ? Number((performance.memory.usedJSHeapSize / 1048576).toFixed(2))
            : null;
          resolve({
            frames: valid.length,
            durationMs: Math.round(now - start),
            avgFrameMs: Number(avg.toFixed(2)),
            p50FrameMs: Number(p50.toFixed(2)),
            p95FrameMs: Number(p95.toFixed(2)),
            maxFrameMs: Number(max.toFixed(2)),
            measuredFps: Number((1000 / Math.max(0.5, avg)).toFixed(1)),
            jsHeapUsedMB: mem,
          });
          return;
        }
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }, durationMs);

  await page.locator('[data-testid="proto-vfx-demo-machinegun"]').click();
  await page.waitForTimeout(160);
  await page.locator('[data-testid="proto-vfx-demo-vy-radio"]').click();
  await page.waitForTimeout(180);
  await page.locator('[data-testid="proto-vfx-demo-masamune"]').click();

  const metrics = await recPromise;
  const skipBtn = page.locator('[data-testid="bg-skip-vfx-btn"]');
  if (await skipBtn.isVisible().catch(() => false)) {
    await skipBtn.click().catch(() => undefined);
  }
  await page.waitForTimeout(80);
  return metrics;
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
  const perfBenchmark = {
    environment: 'Headless Chromium (SwiftShader software rendering, Linux)',
    measuredAtIso: new Date().toISOString(),
    desktop: {},
    mobile: {},
  };
  try {
    // -------------------- 1. DESKTOP (1440x900) --------------------
    const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await desktopCtx.addInitScript(() => {
      window.__clsTotal = 0;
      window.__webglCreateCount = 0;
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (typeof type === 'string' && type.toLowerCase().includes('webgl')) {
          window.__webglCreateCount += 1;
        }
        return origGetContext.call(this, type, ...rest);
      };
      try {
        const obs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput && typeof entry.value === 'number') {
              window.__clsTotal += entry.value;
            }
          }
        });
        obs.observe({ type: 'layout-shift', buffered: true });
      } catch {}
    });
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

    // Kiểm tra ảnh eager trên màn hình đầu + đếm thẻ sử dụng loading="lazy"
    const imgAudit = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.map((im) => ({
        src: im.getAttribute('src'),
        loading: im.getAttribute('loading') || 'eager',
        decoding: im.getAttribute('decoding') || 'auto',
        complete: im.complete,
        naturalWidth: im.naturalWidth,
        naturalHeight: im.naturalHeight,
      }));
    });
    const eagerImgs = imgAudit.filter((im) => im.loading !== 'lazy');
    const lazyImgs = imgAudit.filter((im) => im.loading === 'lazy');
    assert.ok(eagerImgs.length >= 6, `Expected eager priority images, got ${eagerImgs.length}`);
    assert.ok(lazyImgs.length >= 40, `Expected lazy loading on below-fold library images, got ${lazyImgs.length}`);
    for (const im of eagerImgs) {
      assert.equal(im.complete, true, `Eager image not complete: ${im.src}`);
      assert.ok(im.naturalWidth >= 600, `Eager image naturalWidth too small (${im.naturalWidth}): ${im.src}`);
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

    // Screenshot 1A: VFX Sandbox Demo — 3D Dice Roll (1.2-1.5s), Súng Liên Thanh & Vy Radio Tuyệt Kỹ
    await page.locator('[data-testid="proto-section-vfx-sandbox"]').scrollIntoViewIfNeeded();
    await page.waitForSelector('[data-testid="bg-vfx-targeting-line"]', { timeout: 5000 });

    // Demo 0: Tung Xúc Xắc 3D -> chống lộ kết quả sớm -> chốt đúng kết quả server -> Skip -> Reduced Motion
    await page.locator('[data-testid="proto-vfx-demo-dice-move"]').click();
    await page.waitForSelector('[data-testid="bg-vfx-dice-overlay"]', { timeout: 3000 });
    const earlyDiceMeta = await page.evaluate(() => {
      const ov = document.querySelector('[data-testid="bg-vfx-dice-overlay"]');
      const d6 = document.querySelector('[data-testid="bg-vfx-dice-overlay"] [data-testid="bg-die-d6-3d"]');
      const d4 = document.querySelector('[data-testid="bg-vfx-dice-overlay"] [data-testid="bg-die-d4-3d"]');
      return {
        settled: ov?.getAttribute('data-dice-settled'),
        stage: ov?.getAttribute('data-dice-stage'),
        d6Val: d6?.getAttribute('data-settled-value'),
        d4Val: d4?.getAttribute('data-settled-value'),
        text: ov?.textContent || '',
      };
    });
    assert.equal(earlyDiceMeta.settled, 'false', '3D dice must NOT settle immediately under normal motion');
    assert.equal(earlyDiceMeta.d6Val, 'hidden', '3D D6 must hide settled value while tumbling');
    assert.equal(earlyDiceMeta.d4Val, 'hidden', '3D D4 must hide settled value while tumbling');
    assert.equal(earlyDiceMeta.text.includes('5 + 3 = 8'), false, 'Overlay must NOT spoil server sum before dice settle');

    await page.waitForFunction(
      () => document.querySelector('[data-testid="bg-vfx-dice-overlay"]')?.getAttribute('data-dice-settled') === 'true',
      null,
      { timeout: 3000, polling: 40 },
    );
    const settledDiceMeta = await page.evaluate(() => {
      const ov = document.querySelector('[data-testid="bg-vfx-dice-overlay"]');
      const d6 = document.querySelector('[data-testid="bg-vfx-dice-overlay"] [data-testid="bg-die-d6-3d"]');
      const d4 = document.querySelector('[data-testid="bg-vfx-dice-overlay"] [data-testid="bg-die-d4-3d"]');
      return {
        d6Val: d6?.getAttribute('data-settled-value'),
        d4Val: d4?.getAttribute('data-settled-value'),
        text: ov?.textContent || '',
      };
    });
    assert.equal(settledDiceMeta.d6Val, '5', 'Settled D6 must lock on authoritative server face 5');
    assert.equal(settledDiceMeta.d4Val, '3', 'Settled D4 must lock on authoritative server face 3');
    assert.ok(settledDiceMeta.text.includes('5 + 3 = 8'), 'Settled overlay must show server sum 5 + 3 = 8');
    await page.screenshot({ path: path.join(SHOT_DIR, 'polish-01-desktop-3d-dice-and-vfx.png') });

    // Bấm tung lại rồi bấm Skip Animation ngay -> phải ẩn overlay lập tức
    await page.locator('[data-testid="bg-vfx-dice-overlay"]').waitFor({ state: 'detached', timeout: 2500 }).catch(() => undefined);
    await page.locator('[data-testid="proto-vfx-demo-dice-move"]').click();
    await page.waitForSelector('[data-testid="bg-skip-vfx-btn"]', { timeout: 2000 });
    await page.locator('[data-testid="bg-skip-vfx-btn"]').click();
    await page.locator('[data-testid="bg-vfx-dice-overlay"]').waitFor({ state: 'detached', timeout: 1500 });

    // Bật Reduced Motion -> xúc xắc chốt kết quả ngay lập tức không lag
    await page.locator('[data-testid="proto-vfx-reduced-toggle"]').click();
    await page.locator('[data-testid="proto-vfx-demo-dice-move"]').click();
    await page.waitForSelector('[data-testid="bg-vfx-dice-overlay"]', { timeout: 2000 });
    assert.equal(
      await page.locator('[data-testid="bg-vfx-dice-overlay"]').getAttribute('data-dice-settled'),
      'true',
      'Reduced Motion must settle 3D dice immediately without spin wait',
    );
    await page.locator('[data-testid="bg-skip-vfx-btn"]').click().catch(() => undefined);
    await page.locator('[data-testid="proto-vfx-reduced-toggle"]').click();

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

    // RC QA: Kiểm thử 3 mức Quality (High / Balanced / Low), tắt Shake mạnh & Mute/Audio diag
    await page.locator('[data-testid="proto-quality-high"]').click();
    assert.equal(await page.locator('[data-testid="proto-vfx-arena"]').getAttribute('data-active-tier'), 'high');
    perfBenchmark.desktop.high = await measureVfxBurstPerformance(page, 950);

    await page.locator('[data-testid="proto-quality-balanced"]').click();
    assert.equal(await page.locator('[data-testid="proto-vfx-arena"]').getAttribute('data-active-tier'), 'balanced');
    perfBenchmark.desktop.balanced = await measureVfxBurstPerformance(page, 950);

    await page.locator('[data-testid="proto-quality-low"]').click();
    assert.equal(await page.locator('[data-testid="proto-vfx-arena"]').getAttribute('data-active-tier'), 'low');
    perfBenchmark.desktop.low = await measureVfxBurstPerformance(page, 950);

    // Quay về High + bật Shake OFF -> xác nhận không gắn class bg-vfx-shake-*
    await page.locator('[data-testid="proto-quality-high"]').click();
    await page.locator('[data-testid="proto-shake-toggle"]').click();
    assert.equal(await page.locator('[data-testid="proto-vfx-arena"]').getAttribute('data-shake-enabled'), 'false');
    await page.locator('[data-testid="proto-vfx-demo-machinegun"]').click();
    await page.waitForTimeout(80);
    const hasShakeClass = await page.evaluate(() => {
      const cls = document.querySelector('[data-testid="proto-vfx-arena"]')?.className || '';
      return cls.includes('bg-vfx-shake-heavy') || cls.includes('bg-vfx-shake-light');
    });
    assert.equal(hasShakeClass, false, 'Shake OFF must never attach bg-vfx-shake-* class');

    // Test Mute + Skip synchronization với window.__hustBgAudioDiag
    await page.locator('[data-testid="proto-sound-toggle"]').click();
    const audioDiag = await page.evaluate(() => window.__hustBgAudioDiag?.() ?? null);
    assert.ok(audioDiag, 'Expected window.__hustBgAudioDiag to be exposed');
    assert.equal(audioDiag.muted, true, 'Mute button must sync sound engine state');
    assert.equal(audioDiag.activeVoices, 0, 'Mute must stop all active WebAudio voices');
    await page.locator('[data-testid="proto-vfx-demo-vy-radio"]').click();
    await page.waitForSelector('[data-testid="bg-vfx-cutin"]', { timeout: 3000 });
    await page.screenshot({ path: path.join(SHOT_DIR, 'rc-01-desktop-vfx-quality-controls.png') });
    await page.locator('[data-testid="bg-skip-vfx-btn"]').click();
    // Khôi phục mặc định Auto + Shake BẬT + Sound BẬT
    await page.locator('[data-testid="proto-shake-toggle"]').click();
    await page.locator('[data-testid="proto-sound-toggle"]').click();
    await page.locator('[data-testid="proto-quality-auto"]').click();

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

    // Quay về chế độ "Chủ thẻ soi vai" để kiểm thử Phần 5 (10 nhân vật), Phần 6 (40 thẻ), Phần 7 (6 KTX tiles + pawn glide) & Zoom Modal
    await page.locator('[data-testid="proto-secrecy-owner-peek"]').click();
    await page.locator('[data-testid="proto-card-zone-0"]').click();
    await page.waitForTimeout(300);

    // Phần 5: Trọn bộ 10/10 nhân vật full-art
    const rosterCount = await page.locator('.mn-card-perspective[data-testid^="proto-roster-card-"]').count();
    assert.equal(rosterCount, 10, `Expected all 10 character cards, got ${rosterCount}`);
    await page.locator('[data-testid="proto-section-roster-10"]').scrollIntoViewIfNeeded();
    const rosterCardLocs = page.locator('.mn-card-perspective[data-testid^="proto-roster-card-"]');
    await rosterCardLocs.nth(0).scrollIntoViewIfNeeded();
    await rosterCardLocs.nth(9).scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('[data-testid="proto-roster-grid"] img')).every(
          (im) => im.complete && im.naturalWidth >= 600,
        ),
      null,
      { timeout: 15_000 },
    );
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.querySelectorAll('[data-testid="proto-roster-grid"] img')).map((im) =>
          typeof im.decode === 'function' ? im.decode().catch(() => undefined) : Promise.resolve(),
        ),
      ),
    );
    await page.locator('[data-testid="proto-section-roster-10"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(SHOT_DIR, 'phase2-01-desktop-10-characters.png') });

    // Phần 6: Đủ 40 loại thẻ / 48 bản sao
    await page.locator('[data-testid="proto-lib-tab-all"]').click();
    const cardLocs = page.locator('.mn-card-perspective[data-testid^="proto-library-card-"]');
    const libraryCardsCount = await cardLocs.count();
    assert.equal(libraryCardsCount, 40, `Expected 40 distinct cards in library, got ${libraryCardsCount}`);
    await page.locator('[data-testid="proto-section-card-library-40"]').scrollIntoViewIfNeeded();
    // Cuộn từng phần lưới thư viện để kích hoạt lazy-loading cho đủ 40 ảnh và xác minh decode
    for (const idx of [0, 10, 20, 30, 39]) {
      await cardLocs.nth(idx).scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
    }
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('[data-testid="proto-card-library"] img')).every(
          (im) => im.complete && im.naturalWidth >= 600,
        ),
      null,
      { timeout: 20_000 },
    );
    await cardLocs.nth(0).scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(SHOT_DIR, 'phase2-02-desktop-40-cards-library.png') });

    // Mở Modal phóng lớn + kiểm thử nút Lật 2 Mặt & Đóng
    await page.locator('[data-testid="proto-library-card-ev-06"] button[aria-label^="Phóng lớn"]').first().click();
    await page.waitForSelector('[data-testid="bg-card-zoom-modal"]', { timeout: 3000 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(SHOT_DIR, 'phase2-04-desktop-card-zoom-modal.png') });
    await page.locator('[data-testid="bg-card-zoom-flip-btn"]').click();
    await page.waitForTimeout(350);
    await page.locator('[data-testid="bg-card-zoom-close-btn"]').click();
    await page.locator('[data-testid="bg-card-zoom-modal"]').waitFor({ state: 'detached', timeout: 2000 });

    // Phần 7: 6 Địa điểm KTX Tabletop Tiles, Quân cờ đế nổi & Di chuyển mượt + Lật vai P0
    await page.locator('[data-testid="proto-section-tabletop-6-ktx"]').scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('[data-testid="proto-tabletop-map"] > div img')).every(
          (im) => im.complete && im.naturalWidth >= 600,
        ),
      null,
      { timeout: 15_000 },
    );
    const hiddenPawnCheck = await page.evaluate(() => {
      const hidden = Array.from(document.querySelectorAll('[data-testid="proto-tabletop-map"] [data-pawn-revealed="false"]'));
      return {
        count: hidden.length,
        leakedImgs: hidden.filter((el) => el.querySelector('img') !== null).length,
      };
    });
    assert.ok(hiddenPawnCheck.count >= 4, 'Expected at least 4 hidden pawns before reveal');
    assert.equal(hiddenPawnCheck.leakedImgs, 0, 'Unrevealed pawns MUST NOT render portrait images');

    // Bấm Lật vai -> kiểm tra quân cờ hiện chân dung thật & Di chuyển mượt
    await page.locator('[data-testid="proto-reveal-pawn-btn"]').click();
    await page.locator('[data-testid="proto-glide-pawn-btn"]').click();
    await page.waitForFunction(
      () => {
        const shown = Array.from(document.querySelectorAll('[data-testid="proto-tabletop-map"] [data-pawn-revealed="true"] img'));
        return shown.length >= 4 && shown.every((im) => im.complete && im.naturalWidth >= 600);
      },
      null,
      { timeout: 5000 },
    );
    await page.waitForTimeout(580);
    await page.screenshot({ path: path.join(SHOT_DIR, 'phase2-03-desktop-ktx-tabletop-tiles-pawns.png') });

    const perfAudit = await page.evaluate(() => ({
      cls: Number((window.__clsTotal || 0).toFixed(4)),
      webglContexts: window.__webglCreateCount || 0,
      decodedUniqueAssets: new Set(
        Array.from(document.querySelectorAll('img'))
          .filter((im) => im.complete && im.naturalWidth > 0)
          .map((im) => im.getAttribute('src')),
      ).size,
    }));
    assert.equal(perfAudit.webglContexts, 0, 'Prototype & 2D boardgame VFX must create zero WebGL contexts');
    assert.ok(perfAudit.cls < 0.05, `Desktop CLS too high: ${perfAudit.cls}`);
    assert.ok(perfAudit.decodedUniqueAssets >= 56, `Expected >= 56 decoded unique WebP assets, got ${perfAudit.decodedUniqueAssets}`);

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

    // Screenshot 5: Mobile 3 thẻ bài mẫu (lọc chế độ "Mới" cho gọn nét) + KTX Tabletop Tiles
    await mPage.locator('[data-testid="proto-mobile-view-new"]').click();
    await mPage.locator('[data-testid="proto-action-card-inv-12"]').scrollIntoViewIfNeeded();
    await mPage.waitForTimeout(250);
    await mPage.screenshot({ path: path.join(SHOT_DIR, 'prototype-05-mobile-action-cards.png') });

    await mPage.locator('[data-testid="proto-reveal-pawn-btn"]').click();
    await mPage.locator('[data-testid="proto-section-tabletop-6-ktx"]').scrollIntoViewIfNeeded();
    await mPage.waitForTimeout(300);
    await mPage.screenshot({ path: path.join(SHOT_DIR, 'phase2-05-mobile-ktx-tiles-and-cards.png') });

    // RC Mobile (390x844): Tự động nhận Balanced tier, tắt mist/blur tốn GPU & đo FPS thực tế
    await mPage.locator('[data-testid="proto-vfx-arena"]').evaluate((el) =>
      el.scrollIntoView({ block: 'center', behavior: 'instant' }),
    );
    const mobileQualityMeta = await mPage.evaluate(() => ({
      activeTier: document.querySelector('[data-testid="proto-vfx-arena"]')?.getAttribute('data-active-tier'),
      mistElements: document.querySelectorAll('[data-testid="proto-tabletop-map"] .bg-tile-mist-drift').length,
    }));
    assert.equal(mobileQualityMeta.activeTier, 'balanced', 'Mobile 390x844 Auto tier must resolve to balanced');
    assert.equal(mobileQualityMeta.mistElements, 0, 'Mobile Balanced tier must disable fog drift animation layer');
    perfBenchmark.mobile.balanced = await measureVfxBurstPerformance(mPage, 950);
    perfBenchmark.mobile.autoDetectedTier = mobileQualityMeta.activeTier;
    await mPage.locator('[data-testid="proto-vfx-demo-vy-radio"]').click();
    await mPage.waitForSelector('[data-testid="bg-vfx-cutin"]', { timeout: 3000 });
    await mPage.screenshot({ path: path.join(SHOT_DIR, 'rc-02-mobile-390x844-balanced.png') });
    await mPage.locator('[data-testid="bg-skip-vfx-btn"]').click().catch(() => undefined);

    await mPage.locator('[data-testid="proto-vfx-demo-dice-move"]').click();
    await mPage.waitForSelector('[data-testid="bg-vfx-dice-overlay"]', { timeout: 3000 });
    await mPage.locator('[data-testid="proto-vfx-arena"]').evaluate((el) =>
      el.scrollIntoView({ block: 'center', behavior: 'instant' }),
    );
    await mPage.waitForFunction(
      () => document.querySelector('[data-testid="bg-vfx-dice-overlay"]')?.getAttribute('data-dice-settled') === 'true',
      null,
      { timeout: 3000, polling: 40 },
    );
    await mPage.screenshot({ path: path.join(SHOT_DIR, 'polish-02-mobile-390x844-vfx.png') });
    await mPage.locator('[data-testid="bg-skip-vfx-btn"]').click().catch(() => undefined);

    await mobileCtx.close();

    assert.deepEqual(errors, [], `Unexpected browser errors:\n${errors.join('\n')}`);
    const perfOutPath = path.join(SHOT_DIR, 'rc-perf-report.json');
    const summaryPayload = {
      ok: true,
      shotDir: SHOT_DIR,
      desktopOverflow,
      mobileOverflow,
      eagerImagesCount: eagerImgs.length,
      lazyImagesCount: lazyImgs.length,
      rosterCount,
      libraryCardsCount,
      perfAudit,
      perfBenchmark,
      ratios: ratioAudit.map((r) => ({ id: r.id, size: `${Math.round(r.width)}x${Math.round(r.height)}`, ratio: +r.ratio.toFixed(3) })),
    };
    fs.writeFileSync(perfOutPath, JSON.stringify(summaryPayload, null, 2));
    console.log(JSON.stringify(summaryPayload, null, 2));
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
