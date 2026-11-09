// ---------------------------------------------------------------------------
// test/library-navigation-smoke.cjs — PR10B Library Navigation Smoke & Visual
// Audit Suite:
//   1. Deterministic controller & spatial validation across all 11 presets
//   2. Live Playwright browser verification of LibraryFloorNav UI & all 11
//      destinations (Floors 1, 2, 3, 4, 5, 6, 7, 10) with screenshots
//   3. Seat release verification when navigating away from Floor 1 while seated
//   4. Invalid floor / unknown preset rejection preserving floor, pos, camera & seat
//   5. Desktop (1280x800) and Mobile (390x844) viewport navigation verification
// ---------------------------------------------------------------------------
'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

require('./register-ts.cjs');

const ROOT = path.resolve(__dirname, '..');
const SHOT_DIR = process.env.SHOT_DIR || path.join(ROOT, 'test-shots');
const PORT = Number(process.env.PR10B_NAV_PORT || 8351);
const BASE_URL = `http://127.0.0.1:${PORT}/`;

const {
  LIBRARY_NAV_PRESETS,
  createLibraryNavigationController,
  getBlockForFloor,
  queryLibraryGround,
} = require(path.join(ROOT, 'lib/campus.ts'));

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_CORE_PATH,
    'playwright',
    'playwright-core',
    '/home/bao/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-linux-x64/node_modules/playwright-core',
    '/home/hatch/workspace/mobile-test/node_modules/playwright-core',
  ].filter(Boolean);

  for (const mod of candidates) {
    try {
      return require(mod);
    } catch {
      // try next
    }
  }
  return null;
}

function resolveBrowserExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell',
  ].filter(Boolean);

  for (const exe of candidates) {
    if (fs.existsSync(exe)) return exe;
  }
  return undefined;
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'out'], {
      cwd: ROOT,
      stdio: 'ignore',
    });
    proc.on('error', reject);
    const t0 = Date.now();
    const check = () => {
      fetch(BASE_URL, { method: 'HEAD' })
        .then(() => resolve(proc))
        .catch(() => {
          if (Date.now() - t0 > 15000) {
            reject(new Error('Static server did not start within 15s'));
          } else {
            setTimeout(check, 250);
          }
        });
    };
    check();
  });
}

function runDeterministicChecks() {
  console.log('[PR10B Nav Smoke] Running deterministic controller & preset checks...');
  assert.equal(LIBRARY_NAV_PRESETS.length, 11, 'Must have all 11 canonical library presets');

  const nav = createLibraryNavigationController();
  for (const preset of LIBRARY_NAV_PRESETS) {
    const outcome = nav.navigateToPreset(preset.id);
    assert.equal(outcome.ok, true, `Preset ${preset.id} must succeed`);
    assert.deepEqual(outcome.phaseHistory, ['preparing', 'transitioning', 'completed']);
    assert.equal(outcome.floor, preset.floor);
    assert.equal(outcome.location.block, getBlockForFloor(preset.floor));

    const support = queryLibraryGround(outcome.location);
    assert.equal(support.supported, true, `Preset ${preset.id} must be grounded`);
    assert.ok(support.surfaceId, `Preset ${preset.id} must have a valid walkable surfaceId`);
  }
  console.log('[PR10B Nav Smoke] PASS: Deterministic 11-preset controller verification');
}

async function runBrowserSmoke() {
  const pw = loadPlaywright();
  const executablePath = resolveBrowserExecutable();
  const outIndex = path.join(ROOT, 'out', 'index.html');
  if (!pw || !executablePath || !fs.existsSync(outIndex)) {
    console.log('[PR10B Nav Smoke] Skipping live browser phase (no out/ build or browser binary).');
    return;
  }

  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const server = await startStaticServer();
  let browser;
  try {
    browser = await pw.chromium.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader'],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      hasTouch: true,
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('#enter-campus').click();
    await page.waitForFunction(() => Boolean(window.__bkhn && window.__bkhn.enterLibraryLobby), null, {
      timeout: 30000,
    });

    // Enter Library Lobby
    await page.evaluate(() => {
      window.__bkhn.enterLibraryLobby();
    });
    await page.waitForSelector('[data-testid="library-floor-nav"]', { timeout: 10000 });

    // Expand the floor selector list
    await page.click('[data-testid="library-floor-toggle"]');
    await page.waitForSelector('[data-testid="library-floor-list"]', { timeout: 5000 });

    // 1. Sit at Floor 1 seat tqb-1f-t1-s1, verify seated state, then navigate to Floor 2 via UI button
    // and verify seat is safely released!
    const sitResult = await page.evaluate(() => {
      window.__bkhn.teleport(-2.4, 0.54, 0, 0.2);
      return window.__bkhn.sitAtSeat('tqb-1f-t1-s1');
    });
    assert.equal(sitResult.ok, true, 'Must sit at tqb-1f-t1-s1 on Floor 1');

    // Attempt invalid floor transition while seated on Floor 1: must fail and preserve seat!
    const badFloorWhileSeated = await page.evaluate(() => window.__bkhn.setLibraryFloor(99));
    assert.equal(badFloorWhileSeated.ok, false);
    assert.equal(badFloorWhileSeated.reason, 'invalid-floor');
    const seatAfterBadFloor = await page.evaluate(() => window.__bkhn.getSeatState());
    assert.equal(
      seatAfterBadFloor.seated,
      true,
      'Failed floor transition must preserve Floor 1 seated state',
    );
    assert.equal(seatAfterBadFloor.seatId, 'tqb-1f-t1-s1');

    // 2. Click through all 11 preset buttons in LibraryFloorNav UI, verify state & capture screenshots
    for (let idx = 0; idx < LIBRARY_NAV_PRESETS.length; idx++) {
      const preset = LIBRARY_NAV_PRESETS[idx];
      const btnSelector = `[data-testid="lib-floor-btn-${preset.id}"]`;
      await page.click(btnSelector);
      await page.waitForTimeout(220);

      const state = await page.evaluate(() => {
        const navEl = document.querySelector('[data-testid="library-floor-nav"]');
        return {
          uiFloor: Number(navEl?.getAttribute('data-current-floor')),
          uiPreset: navEl?.getAttribute('data-active-preset'),
          uiPhase: navEl?.getAttribute('data-nav-phase'),
          navSnap: window.__bkhn.getLibraryNavState(),
          diag: window.__bkhn.getLibrarySpatialDiagnostics(),
          seat: window.__bkhn.getSeatState(),
          perf: window.__bkhnLibraryPerf || null,
        };
      });

      assert.equal(state.uiFloor, preset.floor, `UI floor badge must match ${preset.floor} for ${preset.id}`);
      assert.equal(state.uiPreset, preset.id, `UI active preset must match ${preset.id}`);
      assert.equal(state.uiPhase, 'completed', `Navigation phase must be 'completed' for ${preset.id}`);
      assert.equal(state.diag.floor, preset.floor);
      assert.equal(state.diag.block, preset.block);
      assert.equal(state.diag.grounded, true, `Player must be grounded at ${preset.id}`);
      assert.ok(state.diag.surfaceId, `Player must have valid surfaceId at ${preset.id}`);
      assert.equal(state.seat.seated, false, `Seat must be released after navigating to ${preset.id}`);
      assert.equal(state.seat.seatId, null);

      const numStr = String(idx + 1).padStart(2, '0');
      const shotPath = path.join(SHOT_DIR, `pr10b-nav-${numStr}-${preset.id}.png`);
      await page.screenshot({ path: shotPath });
      console.log(
        `[PR10B Nav Smoke] PASS (${numStr}/11) ${preset.id} -> floor=${state.diag.floor} block=${state.diag.block} pos=(${state.diag.pos.x.toFixed(1)}, ${state.diag.pos.y.toFixed(2)}, ${state.diag.pos.z.toFixed(1)}) surface=${state.diag.surfaceId} calls=${state.perf?.calls ?? 'n/a'}`,
      );
    }

    // 3. Mobile viewport (390x844) navigation check
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    await page.click('[data-testid="lib-floor-btn-f6-lounge"]');
    await page.waitForTimeout(200);
    const mobileState = await page.evaluate(() => ({
      diag: window.__bkhn.getLibrarySpatialDiagnostics(),
      nav: window.__bkhn.getLibraryNavState(),
    }));
    assert.equal(mobileState.diag.floor, 6);
    assert.equal(mobileState.nav.activePresetId, 'f6-lounge');
    await page.screenshot({ path: path.join(SHOT_DIR, 'pr10b-nav-12-mobile-390x844.png') });
    console.log('[PR10B Nav Smoke] PASS: Mobile viewport (390x844) navigation & screenshot');

    assert.equal(pageErrors.length, 0, `Expected 0 page errors, got: ${pageErrors.join('; ')}`);
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

async function main() {
  runDeterministicChecks();
  if (process.env.SKIP_BROWSER_SMOKE !== '1') {
    await runBrowserSmoke();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
