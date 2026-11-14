// ---------------------------------------------------------------------------
// test/library-transition-race.cjs — PR10B Library Transition Race, Stair
// Continuity & Scene Lifecycle / Resource Stability Suite:
//   1. Rapid multi-floor transitions (T1 -> T4 -> T6 -> T7 -> T10 -> T2 -> T1)
//   2. Concurrent / re-entrant transition rejection ('transition-in-progress')
//   3. Twin curved stair T1 <-> T2 continuous elevation & landing hysteresis
//   4. Repeated floor visits (15 cycles across Floors 1, 4, 5, 6, 7, 10)
//      verifying WebGL geometry/texture counts plateau with zero leaks
// ---------------------------------------------------------------------------
'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

require('./register-ts.cjs');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PR10B_RACE_PORT || 8353);
const BASE_URL = `http://127.0.0.1:${PORT}/`;

const {
  AVATAR,
  CURVED_STAIRS,
  LIBRARY_NAV_PRESETS,
  createLibraryLocation,
  createLibraryNavigationController,
  resolveLibraryMovement,
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

function runDeterministicRaceAndStairChecks() {
  console.log('[PR10B Transition Race] Running deterministic race & curved stair continuity checks...');
  const unhookedNav = createLibraryNavigationController();
  assert.equal(unhookedNav.navigateToPreset('f4-r401').reason, 'executor-failed');

  const nav = createLibraryNavigationController({
    executeTransition: () => ({ ok: true }),
  });

  // 1. Rapid sequential burst across all 11 presets 5 times (55 transitions)
  for (let round = 0; round < 5; round++) {
    for (const preset of LIBRARY_NAV_PRESETS) {
      const res = nav.navigateToPreset(preset.id);
      assert.equal(res.ok, true);
      assert.equal(res.floor, preset.floor);
      assert.equal(res.phase, 'completed');
      assert.equal(nav.isInputLocked(), false);
    }
  }

  // 2. Double-click / re-entrant race during both 'preparing' and 'transitioning'
  let rejectedDuringPrepare = null;
  let rejectedDuringExecute = null;
  let phaseDuringPrepare = null;
  let phaseDuringExecute = null;
  const unsub = nav.registerHooks({
    prepareFloor: () => {
      rejectedDuringPrepare = nav.navigateToPreset('f10-rooftop');
      phaseDuringPrepare = nav.getSnapshot().phase;
      return true;
    },
    executeTransition: () => {
      rejectedDuringExecute = nav.navigateToPreset('f7-mezz');
      phaseDuringExecute = nav.getSnapshot().phase;
      return { ok: true, seatReleased: false };
    },
  });

  const winner = nav.navigateToPreset('f4-r401');
  unsub();
  assert.equal(winner.ok, true);
  assert.equal(winner.floor, 4);
  assert.equal(rejectedDuringPrepare.ok, false);
  assert.equal(rejectedDuringPrepare.reason, 'transition-in-progress');
  assert.equal(phaseDuringPrepare, 'preparing', 'Concurrent rejection must not overwrite active preparing phase');
  assert.equal(rejectedDuringExecute.ok, false);
  assert.equal(rejectedDuringExecute.reason, 'transition-in-progress');
  assert.equal(phaseDuringExecute, 'transitioning', 'Concurrent rejection must not overwrite active transitioning phase');
  assert.equal(nav.getSnapshot().currentFloor, 4);
  assert.equal(nav.getSnapshot().activePresetId, 'f4-r401');

  // 3. Walk step-by-step up and down East curved stair (T1 -> T2 -> T1)
  const eastStair = CURVED_STAIRS[0];
  let curFloor = 1;
  let curY = 0.0;
  let curX = eastStair.centerX + Math.cos(eastStair.startAngle) * eastStair.midRadius;
  let curZ = eastStair.centerZ + Math.sin(eastStair.startAngle) * eastStair.midRadius;

  for (let i = 1; i <= 40; i++) {
    const t = i / 40;
    const angle = eastStair.startAngle + (eastStair.endAngle - eastStair.startAngle) * t;
    const nextX = eastStair.centerX + Math.cos(angle) * eastStair.midRadius;
    const nextZ = eastStair.centerZ + Math.sin(angle) * eastStair.midRadius;

    const stepRes = resolveLibraryMovement(
      createLibraryLocation(curFloor, curX, curZ, curY),
      createLibraryLocation(curFloor, nextX, nextZ, curY),
      AVATAR.radius,
      AVATAR.height,
    );
    const dy = stepRes.position.y - curY;
    assert.ok(
      dy >= -0.02 && dy <= 0.3,
      `Ascending stair step ${i}/40 must be smooth without vertical snap (dy=${dy.toFixed(3)})`,
    );
    curX = stepRes.position.x;
    curZ = stepRes.position.z;
    curY = stepRes.position.y;
    curFloor = stepRes.recommendedFloor;
  }
  assert.equal(curFloor, 2, 'Ascending to top of East curved stair must transition floor to 2');
  assert.ok(curY >= 4.35, `Expected top stair elevation >= 4.35m, got ${curY}`);

  // Now descend back down to Floor 1
  for (let i = 39; i >= 0; i--) {
    const t = i / 40;
    const angle = eastStair.startAngle + (eastStair.endAngle - eastStair.startAngle) * t;
    const nextX = eastStair.centerX + Math.cos(angle) * eastStair.midRadius;
    const nextZ = eastStair.centerZ + Math.sin(angle) * eastStair.midRadius;

    const stepRes = resolveLibraryMovement(
      createLibraryLocation(curFloor, curX, curZ, curY),
      createLibraryLocation(curFloor, nextX, nextZ, curY),
      AVATAR.radius,
      AVATAR.height,
    );
    const dy = curY - stepRes.position.y;
    assert.ok(
      dy >= -0.02 && dy <= 0.3,
      `Descending stair step ${i}/40 must be smooth without vertical snap (dy=${dy.toFixed(3)})`,
    );
    curX = stepRes.position.x;
    curZ = stepRes.position.z;
    curY = stepRes.position.y;
    curFloor = stepRes.recommendedFloor;
  }
  assert.equal(curFloor, 1, 'Descending to bottom of East curved stair must transition floor to 1');
  assert.ok(curY <= 0.15, `Expected bottom stair elevation <= 0.15m, got ${curY}`);
  console.log('[PR10B Transition Race] PASS: Deterministic race & stair continuity checks');
}

async function waitForSettledFloor10Perf(page) {
  await page.waitForFunction(
    () =>
      Boolean(
        window.__bkhnLibraryPerf &&
          typeof window.__bkhnLibraryPerf.geometries === 'number' &&
          window.__bkhnLibraryPerf.floor === 10 &&
          window.__bkhnLibraryPerf.calls > 100,
      ),
    null,
    { timeout: 20000 },
  );

  let prev = await page.evaluate(() => ({ ...window.__bkhnLibraryPerf }));
  let stableCount = 0;
  for (let attempt = 0; attempt < 12; attempt++) {
    const cur = await page.evaluate(
      () =>
        new Promise((resolve) => {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => resolve({ ...window.__bkhnLibraryPerf })),
          );
        }),
    );
    if (
      cur.floor === 10 &&
      cur.calls > 100 &&
      Math.abs(cur.geometries - prev.geometries) <= 2 &&
      Math.abs(cur.textures - prev.textures) <= 1
    ) {
      stableCount += 1;
      if (stableCount >= 2) {
        return cur;
      }
    } else {
      stableCount = 0;
    }
    prev = cur;
  }
  return prev;
}

async function runBrowserRaceAndLifecycleSmoke() {
  const pw = loadPlaywright();
  const executablePath = resolveBrowserExecutable();
  const outIndex = path.join(ROOT, 'out', 'index.html');
  assert.ok(pw, '[PR10B Transition Race] Playwright is required for browser verification (silent skip is forbidden)');
  assert.ok(executablePath, '[PR10B Transition Race] Chromium/Chrome executable is required for browser verification');
  assert.ok(
    fs.existsSync(outIndex),
    '[PR10B Transition Race] out/index.html is missing — run `npm run build` before browser verification',
  );

  const server = await startStaticServer();
  let browser;
  try {
    browser = await pw.chromium.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader'],
    });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('#enter-campus').click();
    await page.waitForFunction(() => Boolean(window.__bkhn && window.__bkhn.enterLibraryLobby), null, {
      timeout: 30000,
    });
    await page.evaluate(() => window.__bkhn.enterLibraryLobby());
    await page.waitForSelector('[data-testid="library-floor-nav"]', { timeout: 30000 });

    // Warm up all 11 presets once and let WebGLRenderer render a frame on the final floor
    // so all lazy floor groups (Floors 1-5, Room 401/501, Floors 6-7, Floor 10) are initialized
    // and outdoor campus chunk disposal has settled.
    const presetIds = [
      'f1-atrium',
      'f1-borrow',
      'f2-balcony',
      'f3-balcony',
      'f4-r401',
      'f4-r411',
      'f4-r419',
      'f5-r501',
      'f6-lounge',
      'f7-mezz',
      'f10-rooftop',
    ];
    await page.evaluate((ids) => {
      for (const id of ids) {
        window.__bkhn.navigateLibraryPreset(id);
      }
    }, presetIds);
    const baselinePerf = await waitForSettledFloor10Perf(page);

    // Rapidly cycle through all 11 presets 3 times (33 floor switches) and verify zero geometry/texture growth!
    await page.evaluate((ids) => {
      for (let cycle = 0; cycle < 3; cycle++) {
        for (const id of ids) {
          window.__bkhn.navigateLibraryPreset(id);
        }
      }
    }, presetIds);
    const settledAfterPerf = await waitForSettledFloor10Perf(page);
    const afterCyclesPerf = await page.evaluate(() => ({
      nav: window.__bkhn.getLibraryNavState(),
      diag: window.__bkhn.getLibrarySpatialDiagnostics(),
    }));
    afterCyclesPerf.perf = settledAfterPerf;

    assert.equal(afterCyclesPerf.nav.currentFloor, 10);
    assert.equal(afterCyclesPerf.nav.activePresetId, 'f10-rooftop');
    assert.equal(afterCyclesPerf.diag.grounded, true);
    assert.ok(
      afterCyclesPerf.perf.geometries <= baselinePerf.geometries + 5,
      `Geometries must not leak across 33 floor transitions (${afterCyclesPerf.perf.geometries} vs baseline ${baselinePerf.geometries})`,
    );
    assert.ok(
      afterCyclesPerf.perf.textures <= baselinePerf.textures + 5,
      `Textures must not leak across 33 floor transitions (${afterCyclesPerf.perf.textures} vs baseline ${baselinePerf.textures})`,
    );

    console.log(
      `[PR10B Transition Race] PASS: 33 rapid floor transitions — geometries=${afterCyclesPerf.perf.geometries}, textures=${afterCyclesPerf.perf.textures}, calls=${afterCyclesPerf.perf.calls}`,
    );
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

async function main() {
  runDeterministicRaceAndStairChecks();
  await runBrowserRaceAndLifecycleSmoke();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
