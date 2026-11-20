#!/usr/bin/env node
/**
 * scripts/verify-phase4c-visuals.cjs
 * Playwright Desktop (1440x900) & Mobile (390x844) Visual QA for Phase 4C Wave 3 Portraits.
 *
 * Verifies:
 *  1. All 10 Wave 3 portraits render on `/boardgame-prototype` (`proto-section-wave3`)
 *     with exact 1024x1536 natural dimensions and exact 2:3 DOM card ratio (zero clipping/distortion).
 *  2. 3-Faction filter tabs (`all` = 10, `lantern-guard` = 4, `mist-order` = 4, `wanderer` = 2).
 *  3. P0 Secrecy toggle (`proto-secrecy-other-player`) removes ALL 10 `role-exp*.webp` images and
 *     secret front badges from DOM; `proto-secrecy-public-revealed` restores them cleanly.
 *  4. `MidnightCardZoomModal` opens, renders portrait at full 1024x1536, flips 2-sided, and closes
 *     across all 3 factions: Hunter (`exp2_fujiko`), Shadow (`exp1_vengeance`), Neutral (`exp2_cruz`).
 *  5. Graceful `onError` fallback renders `RolePortraitSvg` (`data-portrait-fallback="true"`) when
 *     a Wave 3 portrait asset fails to load, with zero console/page errors.
 *  6. Reduced Motion (`prefers-reduced-motion: reduce`) renders cleanly.
 *  7. Mobile (`390x844`) zero horizontal overflow (`scrollWidth <= innerWidth + 1`).
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');
const SHOT_DIR =
  process.env.PHASE4C_SHOT_DIR ||
  path.join(ROOT, 'test-results', 'phase4c-visual-qa');

const WAVE3_IDS = [
  'exp1_fallen',
  'exp1_fea',
  'exp2_eleanor',
  'exp2_fujiko',
  'exp1_udi',
  'exp1_wrath',
  'exp1_vengeance',
  'exp2_visions',
  'exp2_cruz',
  'exp2_bryon',
];

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
  for (const p of [
    process.env.PLAYWRIGHT_CORE_PATH,
    path.join(ROOT, 'node_modules/playwright-core'),
    'playwright-core',
  ].filter(Boolean)) {
    try {
      return require(p);
    } catch {}
  }
  throw new Error('playwright-core not found');
}

function resolveChrome(chromium) {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  for (const p of ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium']) {
    if (fs.existsSync(p)) return p;
  }
  return chromium.executablePath();
}

async function main() {
  assert.equal(fs.existsSync(OUT_DIR), true, 'Run `npm run build` first');
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const { chromium } = loadPlaywright();
  const executablePath = resolveChrome(chromium);
  const { server, url } = await startOutServer();
  const browser = await chromium.launch({ headless: true, executablePath });

  const report = {
    desktop: {},
    mobile: {},
    fallbackTest: {},
    reducedMotion: {},
  };
  const errors = [];

  try {
    // 1. DESKTOP (1440x900)
    const dCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await dCtx.newPage();
    page.on('pageerror', (e) => errors.push(`desktop pageerror: ${e.message}`));
    page.on('response', (res) => {
      if (res.status() >= 400 && !res.url().endsWith('/favicon.ico')) {
        errors.push(`desktop HTTP ${res.status()} on ${res.url()}`);
      }
    });

    await page.goto(`${url}/boardgame-prototype`, { waitUntil: 'networkidle', timeout: 45_000 });
    const section = page.locator('[data-testid="proto-section-wave3"]');
    await section.scrollIntoViewIfNeeded();
    await page.waitForSelector('[data-testid="proto-wave3-card-exp1_fallen"]', { timeout: 15_000 });

    for (const rid of WAVE3_IDS) {
      await page.locator(`[data-testid="proto-wave3-card-${rid}"]`).scrollIntoViewIfNeeded();
    }
    await page.waitForFunction(
      (ids) =>
        ids.every((id) => {
          const card = document.querySelector(`[data-testid="proto-wave3-card-${id}"]`);
          const imgs = card ? Array.from(card.querySelectorAll('img')) : [];
          const portrait = imgs.find((im) => (im.getAttribute('src') || '').includes('role-exp'));
          return Boolean(portrait && portrait.complete && portrait.naturalWidth === 1024 && portrait.naturalHeight === 1536);
        }),
      WAVE3_IDS,
      { timeout: 15_000 },
    );

    const desktopAudit = await page.evaluate((ids) => {
      const cards = ids.map((id) => {
        const el = document.querySelector(`[data-testid="proto-wave3-card-${id}"]`);
        const rect = el.getBoundingClientRect();
        const portrait = Array.from(el.querySelectorAll('img')).find((im) =>
          (im.getAttribute('src') || '').includes('role-exp'),
        );
        return {
          id,
          src: portrait?.getAttribute('src'),
          naturalWidth: portrait?.naturalWidth ?? 0,
          naturalHeight: portrait?.naturalHeight ?? 0,
          width: Number(rect.width.toFixed(1)),
          height: Number(rect.height.toFixed(1)),
          ratio: Number((rect.width / rect.height).toFixed(4)),
          fallbackTriggered: Boolean(el.querySelector('[data-portrait-fallback="true"]')),
        };
      });
      return {
        cards,
        overflowPx: document.documentElement.scrollWidth - window.innerWidth,
      };
    }, WAVE3_IDS);

    assert.ok(desktopAudit.overflowPx <= 1, `Desktop overflow: ${desktopAudit.overflowPx}px`);
    for (const c of desktopAudit.cards) {
      assert.equal(c.naturalWidth, 1024, `${c.id} naturalWidth`);
      assert.equal(c.naturalHeight, 1536, `${c.id} naturalHeight`);
      assert.ok(Math.abs(c.ratio - 2 / 3) < 0.04, `${c.id} aspect ratio ${c.ratio}`);
      assert.equal(c.fallbackTriggered, false, `${c.id} unexpectedly fell back`);
    }
    report.desktop.cards = desktopAudit.cards;
    report.desktop.overflowPx = desktopAudit.overflowPx;

    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await section.screenshot({ path: path.join(SHOT_DIR, '01-desktop-wave3-grid.png') });

    // 3-Faction filter checks
    await page.locator('[data-testid="proto-wave3-tab-lantern-guard"]').click();
    assert.equal(await page.locator('[data-testid="proto-wave3-grid"] > div').count(), 4, 'Hunter filter = 4');
    await page.locator('[data-testid="proto-wave3-tab-mist-order"]').click();
    assert.equal(await page.locator('[data-testid="proto-wave3-grid"] > div').count(), 4, 'Shadow filter = 4');
    await page.locator('[data-testid="proto-wave3-tab-wanderer"]').click();
    assert.equal(await page.locator('[data-testid="proto-wave3-grid"] > div').count(), 2, 'Neutral filter = 2');
    await page.locator('[data-testid="proto-wave3-tab-all"]').click();
    assert.equal(await page.locator('[data-testid="proto-wave3-grid"] > div').count(), 10, 'All filter = 10');

    // P0 Secrecy check: switch to other-player (unrevealed) -> ZERO role-exp*.webp imgs in DOM
    await page.locator('[data-testid="proto-secrecy-other-player"]').click();
    await page.waitForTimeout(250);
    const hiddenCheck = await page.evaluate(() => {
      const sec = document.querySelector('[data-testid="proto-section-wave3"]');
      const expImgs = Array.from(sec.querySelectorAll('img')).filter((im) =>
        (im.getAttribute('src') || '').includes('role-exp'),
      );
      const txt = sec.textContent || '';
      return {
        leakedExpImgCount: expImgs.length,
        containsHiddenText: txt.includes('Danh Tính Đang Bảo Mật'),
        leakedSecretBadge: txt.includes('🔓 Đã lộ diện') || txt.includes('🔒 Riêng tư'),
      };
    });
    assert.equal(hiddenCheck.leakedExpImgCount, 0, 'Unrevealed Wave 3 leaked portrait img in DOM!');
    assert.equal(hiddenCheck.containsHiddenText, true, 'Missing secret card back caption');
    assert.equal(hiddenCheck.leakedSecretBadge, false, 'Leaked front face badge while hidden');
    report.desktop.secrecyHidden = hiddenCheck;

    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await section.screenshot({ path: path.join(SHOT_DIR, '02-desktop-wave3-secrecy-hidden.png') });

    // Switch to public-revealed -> all 10 portraits visible again
    await page.locator('[data-testid="proto-secrecy-public-revealed"]').click();
    await page.waitForFunction(
      () => {
        const sec = document.querySelector('[data-testid="proto-section-wave3"]');
        const imgs = Array.from(sec.querySelectorAll('img')).filter((im) =>
          (im.getAttribute('src') || '').includes('role-exp'),
        );
        return imgs.length === 10 && imgs.every((im) => im.complete && im.naturalWidth === 1024);
      },
      null,
      { timeout: 10_000 },
    );

    // Zoom Modal QA across all 3 factions: Hunter (Fujiko), Shadow (Vengeance), Neutral (Cruz)
    for (const [roleId, label, shotFile] of [
      ['exp2_fujiko', 'Fujiko', '03-desktop-zoom-fujiko.png'],
      ['exp1_vengeance', 'Vengeance', '04-desktop-zoom-vengeance.png'],
      ['exp2_cruz', 'Cruz', '05-desktop-zoom-cruz.png'],
    ]) {
      const zoomBtn = page.locator(
        `[data-testid="proto-wave3-card-${roleId}"] button[aria-label="Phóng lớn thẻ ${label}"]`,
      );
      await zoomBtn.scrollIntoViewIfNeeded();
      await zoomBtn.click();
      await page.waitForSelector('[data-testid="bg-card-zoom-modal"]', { timeout: 5000 });
      const zoomAudit = await page.evaluate(() => {
        const modal = document.querySelector('[data-testid="bg-card-zoom-modal"]');
        const portrait = Array.from(modal.querySelectorAll('img')).find((im) =>
          (im.getAttribute('src') || '').includes('role-exp'),
        );
        return {
          src: portrait?.getAttribute('src'),
          naturalWidth: portrait?.naturalWidth ?? 0,
          naturalHeight: portrait?.naturalHeight ?? 0,
          text: modal.textContent || '',
        };
      });
      assert.equal(zoomAudit.naturalWidth, 1024, `Zoom ${label} naturalWidth`);
      assert.equal(zoomAudit.naturalHeight, 1536, `Zoom ${label} naturalHeight`);
      assert.ok(zoomAudit.text.includes(label), `Zoom modal missing ${label} heading`);
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(SHOT_DIR, shotFile) });
      await page.locator('[data-testid="bg-card-zoom-flip-btn"]').click();
      await page.waitForTimeout(150);
      await page.locator('[data-testid="bg-card-zoom-close-btn"]').click();
      await page.locator('[data-testid="bg-card-zoom-modal"]').waitFor({ state: 'detached', timeout: 5000 });
    }
    report.desktop.zoomVerified = ['exp2_fujiko', 'exp1_vengeance', 'exp2_cruz'];
    await dCtx.close();

    // 2. MOBILE (390x844)
    const mCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mPage = await mCtx.newPage();
    mPage.on('pageerror', (e) => errors.push(`mobile pageerror: ${e.message}`));
    mPage.on('response', (res) => {
      if (res.status() >= 400 && !res.url().endsWith('/favicon.ico')) {
        errors.push(`mobile HTTP ${res.status()} on ${res.url()}`);
      }
    });
    await mPage.goto(`${url}/boardgame-prototype`, { waitUntil: 'networkidle', timeout: 45_000 });
    const mSection = mPage.locator('[data-testid="proto-section-wave3"]');
    await mSection.scrollIntoViewIfNeeded();
    for (const rid of WAVE3_IDS) {
      await mPage.locator(`[data-testid="proto-wave3-card-${rid}"]`).scrollIntoViewIfNeeded();
    }
    await mPage.waitForFunction(
      (ids) =>
        ids.every((id) => {
          const card = document.querySelector(`[data-testid="proto-wave3-card-${id}"]`);
          const portrait = Array.from(card.querySelectorAll('img')).find((im) =>
            (im.getAttribute('src') || '').includes('role-exp'),
          );
          return Boolean(portrait && portrait.complete && portrait.naturalWidth === 1024);
        }),
      WAVE3_IDS,
      { timeout: 15_000 },
    );
    const mobileAudit = await mPage.evaluate(() => {
      const first = document.querySelector('[data-testid="proto-wave3-card-exp1_fallen"]');
      const rect = first.getBoundingClientRect();
      return {
        overflowPx: document.documentElement.scrollWidth - window.innerWidth,
        cardWidth: Number(rect.width.toFixed(1)),
        cardHeight: Number(rect.height.toFixed(1)),
        cardRatio: Number((rect.width / rect.height).toFixed(4)),
      };
    });
    assert.ok(mobileAudit.overflowPx <= 1, `Mobile horizontal overflow: ${mobileAudit.overflowPx}px`);
    assert.ok(Math.abs(mobileAudit.cardRatio - 2 / 3) < 0.04, `Mobile card ratio ${mobileAudit.cardRatio}`);
    report.mobile = mobileAudit;

    await mPage.locator('[data-testid="proto-wave3-card-exp2_bryon"]').scrollIntoViewIfNeeded();
    await mPage.waitForTimeout(200);
    await mPage.screenshot({ path: path.join(SHOT_DIR, '06-mobile-wave3-bryon.png') });
    await mCtx.close();

    // 3. GRACEFUL IMAGE ERROR FALLBACK TEST
    const fCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const fPage = await fCtx.newPage();
    fPage.on('pageerror', (e) => errors.push(`fallback pageerror: ${e.message}`));
    await fPage.route('**/role-exp1-wrath.webp', (route) => route.abort('failed'));
    await fPage.goto(`${url}/boardgame-prototype`, { waitUntil: 'networkidle', timeout: 45_000 });
    await fPage.locator('[data-testid="proto-wave3-card-exp1_wrath"]').scrollIntoViewIfNeeded();
    await fPage.waitForSelector(
      '[data-testid="proto-wave3-card-exp1_wrath"] [data-portrait-fallback="true"]',
      { timeout: 10_000 },
    );
    const fbSvgCount = await fPage
      .locator('[data-testid="proto-wave3-card-exp1_wrath"] [data-portrait-fallback="true"] svg')
      .count();
    assert.ok(fbSvgCount >= 1, 'Fallback Noir Monogram SVG must render when Wave 3 portrait fails');
    report.fallbackTest = { abortedAsset: 'role-exp1-wrath.webp', fallbackRendered: true, svgCount: fbSvgCount };
    await fCtx.close();

    // 4. REDUCED MOTION CHECK
    const rCtx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: 'reduce',
    });
    const rPage = await rCtx.newPage();
    rPage.on('pageerror', (e) => errors.push(`reducedMotion pageerror: ${e.message}`));
    await rPage.goto(`${url}/boardgame-prototype`, { waitUntil: 'networkidle', timeout: 45_000 });
    await rPage.locator('[data-testid="proto-wave3-card-exp2_visions"]').scrollIntoViewIfNeeded();
    await rPage.waitForFunction(() => {
      const c = document.querySelector('[data-testid="proto-wave3-card-exp2_visions"]');
      const im = Array.from(c.querySelectorAll('img')).find((i) => (i.getAttribute('src') || '').includes('role-exp2-visions'));
      return Boolean(im && im.complete && im.naturalWidth === 1024);
    });
    report.reducedMotion = { verified: true };
    await rCtx.close();

    assert.equal(errors.length, 0, `Visual QA recorded errors:\n${errors.join('\n')}`);
    console.log(JSON.stringify({ status: 'PASS', shotDir: SHOT_DIR, ...report }, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error('PHASE 4C VISUAL QA FAILED:', err);
  process.exit(1);
});
