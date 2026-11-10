// ---------------------------------------------------------------------------
// test/library-camera-smoke.cjs — PR10B Library Camera Collision & Occlusion
// Smoke Suite:
//   1. Deterministic 360-degree camera sweep across all 11 destinations +
//      narrow corridors, doorways, book stacks, mezzanine underside & rooftop
//   2. Verifies camera never clips through walls, ceilings, or floor slabs
//   3. Verifies smooth distance pull-in on obstruction and smooth recovery
//   4. Live Playwright WebGL camera rotation & screenshot verification
// ---------------------------------------------------------------------------
'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

require('./register-ts.cjs');

const ROOT = path.resolve(__dirname, '..');
const SHOT_DIR = process.env.SHOT_DIR || path.join(ROOT, 'test-shots');
const PORT = Number(process.env.PR10B_CAM_PORT || 8352);
const BASE_URL = `http://127.0.0.1:${PORT}/`;

const {
  LIBRARY_NAV_PRESETS,
  getCameraVerticalBoundsAt,
  resolveLibraryCameraOcclusion,
  stepLibraryCameraDistance,
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

function runDeterministicCameraSweep() {
  console.log('[PR10B Camera Smoke] Running 360° deterministic camera sweep across all 11 presets & tight spots...');
  const extraTightSpots = [
    { id: 'f1-p102-aisle', floor: 1, x: -23.0, y: 0.0, z: 1.8 },
    { id: 'f4-r401-near-south-wall', floor: 4, x: -5.0, y: 13.5, z: -13.7 },
    { id: 'f4-r401-bookstack-aisle', floor: 4, x: -9.12, y: 13.5, z: -32.08 },
    { id: 'f4-r419-near-east-wall', floor: 4, x: 34.6, y: 13.5, z: 0.0 },
    { id: 'f6-under-mezzanine', floor: 6, x: 0.0, y: 0.0, z: 13.8 },
    { id: 'f10-under-pergola', floor: 10, x: 0.0, y: 0.0, z: 4.8 },
  ];

  const allSpots = [...LIBRARY_NAV_PRESETS, ...extraTightSpots];
  const dist = 3.8;
  const pitches = [-0.15, 0.2, 0.65, 1.05];

  for (const spot of allSpots) {
    const target = { x: spot.x, y: spot.y + 1.2, z: spot.z };
    for (let yi = 0; yi < 16; yi++) {
      const yaw = (yi * Math.PI * 2) / 16;
      for (const pitch of pitches) {
        const cp = Math.cos(pitch);
        const sp = Math.sin(pitch);
        const desiredPosition = {
          x: target.x + Math.sin(yaw) * cp * dist,
          y: target.y + sp * dist,
          z: target.z + Math.cos(yaw) * cp * dist,
        };
        const occ = resolveLibraryCameraOcclusion({
          floor: spot.floor,
          target,
          desiredPosition,
        });

        assert.ok(Number.isFinite(occ.position.x) && Number.isFinite(occ.position.y) && Number.isFinite(occ.position.z));
        assert.ok(occ.safeDistance <= occ.desiredDistance + 1e-4);
        assert.ok(occ.safeDistance >= 0.2);

        const vBounds = getCameraVerticalBoundsAt(spot.floor, occ.position.x, occ.position.z);
        assert.ok(
          occ.position.y <= vBounds.maxY - 0.18,
          `Spot ${spot.id} yaw=${yaw.toFixed(2)} pitch=${pitch}: camera y (${occ.position.y.toFixed(2)}) must stay below ceiling (${vBounds.maxY.toFixed(2)})`,
        );
        assert.ok(
          occ.position.y >= vBounds.minY + 0.18,
          `Spot ${spot.id} yaw=${yaw.toFixed(2)} pitch=${pitch}: camera y (${occ.position.y.toFixed(2)}) must stay above floor (${vBounds.minY.toFixed(2)})`,
        );
      }
    }
  }

  // Verify smooth distance recovery without oscillation
  let curDist = 0.9;
  for (let i = 0; i < 40; i++) {
    const next = stepLibraryCameraDistance(curDist, 3.8, 3.8, 0.025);
    assert.ok(next >= curDist);
    curDist = next;
  }
  assert.ok(curDist > 3.5);
  console.log('[PR10B Camera Smoke] PASS: Deterministic 360° camera sweep & ceiling/wall bounds');
}

async function runBrowserCameraSmoke() {
  const pw = loadPlaywright();
  const executablePath = resolveBrowserExecutable();
  const outIndex = path.join(ROOT, 'out', 'index.html');
  assert.ok(pw, '[PR10B Camera Smoke] Playwright is required for browser verification (silent skip is forbidden)');
  assert.ok(executablePath, '[PR10B Camera Smoke] Chromium/Chrome executable is required for browser verification');
  assert.ok(
    fs.existsSync(outIndex),
    '[PR10B Camera Smoke] out/index.html is missing — run `npm run build` before browser verification',
  );

  fs.mkdirSync(SHOT_DIR, { recursive: true });
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

    // 1. Navigate to Room 401 and place player in the open aisle near South partition wall (z = -13.2)
    await page.evaluate(() => {
      window.__bkhn.setLibraryFloor(4, -2.8, -14.4, 0, 0.22);
      window.__bkhn.setCameraAngles(0, 0.22, 4.0);
    });
    await page.waitForTimeout(220);
    const r401OccDiag = await page.evaluate(() => window.__bkhn.getLibraryCameraDiagnostics());
    assert.equal(r401OccDiag.occlusion.occluded, true, 'Camera backed against Room 401 South wall must be occluded');
    assert.ok(
      r401OccDiag.cameraPos.z < -13.15,
      `Camera in Room 401 must not clip South of wall z = -13.0, got ${r401OccDiag.cameraPos.z}`,
    );
    await page.screenshot({ path: path.join(SHOT_DIR, 'pr10b-cam-01-r401-wall-occlusion.png') });

    // 2. Rotate camera 180° to look South (camera now in open Room 401 interior) and verify smooth recovery
    await page.evaluate(() => window.__bkhn.setCameraAngles(Math.PI, 0.22, 3.8));
    await page.waitForTimeout(350);
    const r401OpenDiag = await page.evaluate(() => window.__bkhn.getLibraryCameraDiagnostics());
    assert.equal(r401OpenDiag.occlusion.occluded, false, 'Camera in open Room 401 interior must be unobstructed');
    assert.ok(r401OpenDiag.activeDist > 3.2, `Expected recovered camera distance > 3.2m, got ${r401OpenDiag.activeDist}`);
    await page.screenshot({ path: path.join(SHOT_DIR, 'pr10b-cam-02-r401-open-recovery.png') });

    // 3. Navigate to Floor 6 outer ring under Floor 7 mezzanine with high pitch (0.85 rad)
    await page.evaluate(() => {
      window.__bkhn.setLibraryFloor(6, 0, 13.6, Math.PI, 0.85);
      window.__bkhn.setCameraAngles(Math.PI, 0.85, 4.0);
    });
    await page.waitForTimeout(200);
    const f6CeilDiag = await page.evaluate(() => window.__bkhn.getLibraryCameraDiagnostics());
    assert.ok(
      f6CeilDiag.cameraPos.y <= 4.82,
      `Camera on Floor 6 outer ring must stay below Floor 7 mezzanine underside (4.82m), got ${f6CeilDiag.cameraPos.y}`,
    );
    await page.screenshot({ path: path.join(SHOT_DIR, 'pr10b-cam-03-f6-mezzanine-ceiling.png') });

    // 4. Return to Floor 1, sit at tqb-1f-t1-s1, and verify seated camera behavior is preserved
    await page.evaluate(() => {
      window.__bkhn.setLibraryFloor(1, -2.4, 0.54, 0, 0.25);
      window.__bkhn.sitAtSeat('tqb-1f-t1-s1');
      window.__bkhn.setCameraAngles(-0.55, 0.28, 3.8);
    });
    await page.waitForTimeout(200);
    const seatedCamDiag = await page.evaluate(() => ({
      seat: window.__bkhn.getSeatState(),
      cam: window.__bkhn.getLibraryCameraDiagnostics(),
    }));
    assert.equal(seatedCamDiag.seat.seated, true);
    assert.ok(seatedCamDiag.cam.activeDist <= 2.65, 'Seated camera distance must stay within seated cap (<= 2.6m)');
    await page.screenshot({ path: path.join(SHOT_DIR, 'pr10b-cam-04-f1-seated-camera.png') });
    console.log('[PR10B Camera Smoke] PASS: Live WebGL camera occlusion, recovery & seated camera screenshots');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

async function main() {
  runDeterministicCameraSweep();
  await runBrowserCameraSmoke();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
