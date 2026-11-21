#!/usr/bin/env node
/**
 * scripts/verify-phase8c-visuals.cjs
 * Playwright Desktop (1440x900) & Mobile (390x844) Visual QA for Phase 8C
 * Structured Visual Events, All 8 Tier-4 Signature VFX, MultiFactionVictory & Tier-3 Families.
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');
const SHOT_DIR =
  process.env.PHASE8C_SHOT_DIR ||
  path.join(ROOT, 'test-results', 'phase8c-visual-qa');

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

async function sampleCanvasNonEmpty(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="bg-vfx-combat-canvas"]');
    if (!canvas || canvas.width === 0 || canvas.height === 0) return { width: 0, height: 0, nonZeroAlphaPixels: 0 };
    const ctx = canvas.getContext('2d');
    if (!ctx) return { width: canvas.width, height: canvas.height, nonZeroAlphaPixels: 0 };
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonZero = 0;
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] > 10) nonZero += 1;
    }
    return { width: canvas.width, height: canvas.height, nonZeroAlphaPixels: nonZero };
  });
}

async function main() {
  assert.equal(fs.existsSync(OUT_DIR), true, 'Run `npm run build` first');
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const { chromium } = loadPlaywright();
  const executablePath = resolveChrome(chromium);
  const { server, url } = await startOutServer();
  const browser = await chromium.launch({ headless: true, executablePath });

  const errors = [];
  const summary = {
    desktop: {},
    mobile: {},
    interactions: {},
    screenshots: [],
  };

  try {
    // =========================================================================
    // 1. DESKTOP 1440x900
    // =========================================================================
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('status of 404')) {
        errors.push(`console.error: ${msg.text()}`);
      }
    });
    page.on('response', (res) => {
      if (res.status() >= 400 && !res.url().endsWith('/favicon.ico')) {
        errors.push(`HTTP ${res.status()}: ${res.url()}`);
      }
    });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

    await page.goto(`${url}/boardgame-prototype`, { waitUntil: 'networkidle' });
    const sandbox = page.locator('[data-testid="proto-section-vfx-sandbox"]');
    await sandbox.waitFor({ state: 'visible', timeout: 15000 });
    await sandbox.scrollIntoViewIfNeeded();

    const arena = page.locator('[data-testid="proto-vfx-arena"]');
    await arena.waitFor({ state: 'visible' });

    // 1A. Lloyd Intercept
    await page.click('[data-testid="proto-vfx-8c-lloyd"]');
    await page.waitForTimeout(320);
    const lloydCanvas = await sampleCanvasNonEmpty(page);
    const lloydCutInVisible = await page.locator('[data-testid="bg-vfx-cutin"]').isVisible();
    assert.equal(lloydCutInVisible, true, 'Lloyd cut-in must be visible');
    assert.ok(lloydCanvas.nonZeroAlphaPixels > 20, `Lloyd canvas should have rendered pixels, got ${lloydCanvas.nonZeroAlphaPixels}`);
    const lloydShot = path.join(SHOT_DIR, 'desktop-lloyd-intercept.png');
    await arena.screenshot({ path: lloydShot });
    summary.screenshots.push(lloydShot);
    summary.desktop.lloyd = { cutInVisible: lloydCutInVisible, ...lloydCanvas };

    // 1B. Voodoo Puppet + Paused indicator
    await page.click('[data-testid="proto-vfx-8c-voodoo"]');
    await page.waitForTimeout(340);
    const voodooCanvas = await sampleCanvasNonEmpty(page);
    const puppetPausedAttr = await page.locator('[data-vfx-player="sb-vy"]').getAttribute('data-puppet-paused');
    assert.equal(puppetPausedAttr, 'true', 'Voodoo victim pawn must reflect paused puppet state');
    assert.ok(voodooCanvas.nonZeroAlphaPixels > 20, 'Voodoo puppet strings must render on canvas');
    const voodooShot = path.join(SHOT_DIR, 'desktop-voodoo-puppet.png');
    await arena.screenshot({ path: voodooShot });
    summary.screenshots.push(voodooShot);
    summary.desktop.voodoo = { puppetPausedAttr, ...voodooCanvas };

    // 1C. Undead Dormant (distinct from Elimination!) -> Undead Revive
    await page.click('[data-testid="proto-vfx-8c-undead-dormant"]');
    await page.waitForTimeout(340);
    const dormantLifecycle = await page.locator('[data-vfx-player="sb-dung"]').getAttribute('data-lifecycle-state');
    const elimCutInCount = await page.locator('[data-testid="bg-vfx-cutin"][data-banner-type="ELIMINATION"]').count();
    const dormantCanvas = await sampleCanvasNonEmpty(page);
    assert.equal(dormantLifecycle, 'DORMANT_PENDING_REVIVE', 'Undead pawn must display DORMANT_PENDING_REVIVE state');
    assert.equal(elimCutInCount, 0, 'Undead dormancy must NEVER display ELIMINATION cut-in');
    assert.ok(dormantCanvas.nonZeroAlphaPixels > 20, 'Undead dormancy shroud must render on canvas');
    const dormantShot = path.join(SHOT_DIR, 'desktop-undead-dormant.png');
    await arena.screenshot({ path: dormantShot });
    summary.screenshots.push(dormantShot);
    summary.desktop.undeadDormant = { dormantLifecycle, elimCutInCount, ...dormantCanvas };

    await page.click('[data-testid="proto-vfx-8c-undead-revive"]');
    await page.waitForTimeout(340);
    const revivedLifecycle = await page.locator('[data-vfx-player="sb-dung"]').getAttribute('data-lifecycle-state');
    const reviveCanvas = await sampleCanvasNonEmpty(page);
    assert.equal(revivedLifecycle, 'REVIVED', 'Undead pawn must transition to REVIVED on revive');
    assert.ok(reviveCanvas.nonZeroAlphaPixels > 20, 'Undead revive pillar must render on canvas');
    const reviveShot = path.join(SHOT_DIR, 'desktop-undead-revive.png');
    await arena.screenshot({ path: reviveShot });
    summary.screenshots.push(reviveShot);
    summary.desktop.undeadRevive = { revivedLifecycle, ...reviveCanvas };

    // 1D. Bonnie Shadow Conversion
    await page.click('[data-testid="proto-vfx-8c-bonnie"]');
    await page.waitForTimeout(340);
    const bonnieCanvas = await sampleCanvasNonEmpty(page);
    const bonnieCutIn = await page.locator('[data-testid="bg-vfx-cutin"]').isVisible();
    assert.equal(bonnieCutIn, true, 'Bonnie conversion cut-in must be visible');
    const bonnieShot = path.join(SHOT_DIR, 'desktop-bonnie-succession.png');
    await arena.screenshot({ path: bonnieShot });
    summary.screenshots.push(bonnieShot);
    summary.desktop.bonnie = { bonnieCutIn, ...bonnieCanvas };

    // 1E. Cain MultiFactionVictory (dual crests & emerald/crimson spotlight)
    await page.click('[data-testid="proto-vfx-8c-cain-victory"]');
    await page.waitForTimeout(950);
    const vicStage = page.locator('[data-testid="bg-vfx-victory-stage"]');
    await vicStage.waitFor({ state: 'visible', timeout: 4000 });
    const multiFactionAttr = await vicStage.getAttribute('data-multi-faction');
    const winningFactionsAttr = await page.locator('[data-testid="bg-vfx-cutin"]').getAttribute('data-winning-factions');
    const dualCrestSvgs = await page.locator('[data-testid="bg-vfx-victory-crest"] svg').count();
    assert.equal(multiFactionAttr, 'true', 'Cain victory stage must mark data-multi-faction=true');
    assert.equal(winningFactionsAttr, 'lantern-guard,mist-order');
    assert.equal(dualCrestSvgs, 2, 'MultiFactionVictory must render 2 faction crests side-by-side');
    const cainShot = path.join(SHOT_DIR, 'desktop-cain-multifaction-victory.png');
    await arena.screenshot({ path: cainShot });
    summary.screenshots.push(cainShot);
    summary.desktop.cainMultiFactionVictory = { multiFactionAttr, winningFactionsAttr, dualCrestSvgs };

    // 1F. Skip mid-animation clears DOM cleanly
    await page.click('[data-testid="proto-vfx-skip-btn"]');
    await page.waitForTimeout(120);
    const cutInAfterSkip = await page.locator('[data-testid="bg-vfx-cutin"]').count();
    assert.equal(cutInAfterSkip, 0, 'Skip button must clear active cinematic immediately');
    summary.interactions.skipClearsDom = true;

    // 1G. Vengeful Spirit, Antimony, N.C. Soldier (success & fail), Tier-3 Redirect & Combo
    await page.click('[data-testid="proto-vfx-8c-vengeful"]');
    await page.waitForTimeout(280);
    const vengefulPx = (await sampleCanvasNonEmpty(page)).nonZeroAlphaPixels;
    assert.ok(vengefulPx > 20, 'Vengeful Spirit echo must render on canvas');

    await page.click('[data-testid="proto-vfx-8c-antimony"]');
    await page.waitForTimeout(280);
    const antimonyPx = (await sampleCanvasNonEmpty(page)).nonZeroAlphaPixels;
    assert.ok(antimonyPx > 20, 'Antimony mirror must render on canvas');

    await page.click('[data-testid="proto-vfx-8c-nc-success"]');
    await page.waitForTimeout(280);
    const ncOkPx = (await sampleCanvasNonEmpty(page)).nonZeroAlphaPixels;
    assert.ok(ncOkPx > 20, 'N.C. Soldier recruit success must render on canvas');

    await page.click('[data-testid="proto-vfx-8c-nc-fail"]');
    await page.waitForTimeout(280);
    const ncFailPx = (await sampleCanvasNonEmpty(page)).nonZeroAlphaPixels;
    assert.ok(ncFailPx > 10, 'N.C. Soldier recruit fail fizzle must render on canvas');

    await page.click('[data-testid="proto-vfx-8c-redirect"]');
    await page.waitForTimeout(280);
    const redirectPx = (await sampleCanvasNonEmpty(page)).nonZeroAlphaPixels;
    assert.ok(redirectPx > 20, 'Arnold/Anathema REDIRECT_ARC must render on canvas');

    await page.click('[data-testid="proto-vfx-8c-tier3-combo"]');
    await page.waitForTimeout(320);
    const comboCanvas = await sampleCanvasNonEmpty(page);
    assert.ok(comboCanvas.nonZeroAlphaPixels > 40, 'Tier-3 combo (Nova+3-Card+Angel+Finisher) must render');
    const comboShot = path.join(SHOT_DIR, 'desktop-tier3-combo.png');
    await arena.screenshot({ path: comboShot });
    summary.screenshots.push(comboShot);
    summary.desktop.remainingTier4And3 = { vengefulPx, antimonyPx, ncOkPx, ncFailPx, redirectPx, comboPx: comboCanvas.nonZeroAlphaPixels };

    // 1H. Consecutive rapid triggers stress test (zero console errors)
    for (const tid of [
      'proto-vfx-8c-lloyd',
      'proto-vfx-8c-voodoo',
      'proto-vfx-8c-undead-dormant',
      'proto-vfx-8c-bonnie',
      'proto-vfx-8c-nc-success',
    ]) {
      await page.click(`[data-testid="${tid}"]`);
      await page.waitForTimeout(45);
    }
    await page.click('[data-testid="proto-vfx-skip-btn"]');
    await page.waitForTimeout(120);
    summary.interactions.rapidTriggersClean = true;

    // 1I. Mute toggle check
    await page.click('[data-testid="proto-sound-toggle"]');
    const diagBeforeMuted = await page.evaluate(() => window.__hustBgAudioDiag?.() ?? null);
    assert.equal(diagBeforeMuted?.muted, true, 'Mute button must mute boardgame audio');
    await page.click('[data-testid="proto-vfx-8c-lloyd"]');
    await page.waitForTimeout(120);
    const diagAfterMuted = await page.evaluate(() => window.__hustBgAudioDiag?.() ?? null);
    assert.equal(
      diagAfterMuted?.totalTriggeredCount,
      diagBeforeMuted?.totalTriggeredCount,
      'Muted audio must trigger 0 new cues',
    );
    await page.click('[data-testid="proto-sound-toggle"]');
    await page.click('[data-testid="proto-vfx-skip-btn"]');
    summary.interactions.muteToggleVerified = true;

    // 1J. Spectator privacy check
    await page.click('[data-testid="proto-vfx-p4-opening-spectator"]');
    await page.waitForTimeout(260);
    const specStage = page.locator('[data-testid="bg-vfx-opening-stage"]');
    assert.equal(await specStage.getAttribute('data-spectator'), 'true');
    const specText = await specStage.innerText();
    assert.equal(specText.includes('Dũng "Gác Cổng"'), false, 'Spectator opening must never leak hidden role names');
    await page.click('[data-testid="proto-vfx-skip-btn"]');
    summary.interactions.spectatorPrivacyVerified = true;

    // 1K. Low Graphics Tier + Reduced Motion
    await page.click('[data-testid="proto-quality-low"]');
    await page.click('[data-testid="proto-vfx-reduced-toggle"]');
    await page.waitForTimeout(100);
    assert.equal(await arena.getAttribute('data-active-tier'), 'low');
    assert.equal(await arena.getAttribute('data-reduced-motion'), 'true');
    await page.click('[data-testid="proto-vfx-8c-cain-victory"]');
    await page.waitForTimeout(80);
    const rmShot = path.join(SHOT_DIR, 'desktop-low-reduced-motion.png');
    await arena.screenshot({ path: rmShot });
    summary.screenshots.push(rmShot);
    await page.waitForTimeout(320);
    assert.equal(await page.locator('[data-testid="bg-vfx-cutin"]').count(), 0, 'Reduced motion victory cut-in must auto-finish quickly (<= 280ms)');
    summary.interactions.lowTierReducedMotionVerified = true;

    await ctx.close();

    // =========================================================================
    // 2. MOBILE 390x844
    // =========================================================================
    const mobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobPage = await mobCtx.newPage();
    mobPage.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('status of 404')) {
        errors.push(`mobile console.error: ${msg.text()}`);
      }
    });
    mobPage.on('response', (res) => {
      if (res.status() >= 400 && !res.url().endsWith('/favicon.ico')) {
        errors.push(`mobile HTTP ${res.status()}: ${res.url()}`);
      }
    });
    mobPage.on('pageerror', (err) => errors.push(`mobile pageerror: ${err.message}`));

    await mobPage.goto(`${url}/boardgame-prototype`, { waitUntil: 'networkidle' });
    const mobSandbox = mobPage.locator('[data-testid="proto-section-vfx-sandbox"]');
    await mobSandbox.waitFor({ state: 'visible', timeout: 15000 });
    await mobSandbox.scrollIntoViewIfNeeded();

    const overflow = await mobPage.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    assert.ok(
      overflow.scrollWidth <= overflow.innerWidth + 2,
      `Mobile 390x844 horizontal overflow detected: scrollWidth=${overflow.scrollWidth} > innerWidth=${overflow.innerWidth}`,
    );

    const mobArena = mobPage.locator('[data-testid="proto-vfx-arena"]');
    await mobPage.click('[data-testid="proto-vfx-8c-cain-victory"]');
    await mobPage.waitForTimeout(950);
    assert.equal(await mobPage.locator('[data-testid="bg-vfx-victory-stage"]').getAttribute('data-multi-faction'), 'true');
    const mobShot = path.join(SHOT_DIR, 'mobile-cain-multifaction-victory.png');
    await mobArena.screenshot({ path: mobShot });
    summary.screenshots.push(mobShot);
    summary.mobile = { ...overflow, multiFactionVictoryRendered: true };
    await mobCtx.close();

    assert.equal(errors.length, 0, `Unexpected browser errors:\n${errors.join('\n')}`);
    console.log(JSON.stringify({ ok: true, summary }, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error('❌ Phase 8C Visual QA FAILED:', err);
  process.exit(1);
});
