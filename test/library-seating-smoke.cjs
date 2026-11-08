// ---------------------------------------------------------------------------
// test/library-seating-smoke.cjs — Playwright browser smoke & visual audit
// for PR8 Interactive 3D Library Seating & Study Experience:
// 1. Enter campus
// 2. Enter LibraryLobby
// 3. Verify study tables and 4 chairs exist in the scene
// 4. Move near seat tqb-1f-t1-s1
// 5. Verify interaction prompt "E — Ngồi học" appears
// 6. Sit via E or click/tap
// 7. Verify player position, facing, and seated pose
// 8. Verify Study Session receives studyRoomId: 'library-lobby' and seatId: 'tqb-1f-t1-s1'
// 9. Open Study Panel and start Pomodoro focus session
// 10. Switch to Zen 2D and return to 3D while seated (preserving seated state)
// 11. Stand up and verify safe standing position and cleared seatId
// 12. Test all 4 library seats (tqb-1f-t1-s1..s2, tqb-1f-t2-s1..s2) & capture screenshots
// 13. Verify statue, info desk, and vocab board interactions still work
// 14. Exit LibraryLobby and verify clean state reset
// ---------------------------------------------------------------------------
'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

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
      // Try next candidate
    }
  }
  throw new Error('Could not resolve playwright or playwright-core');
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

const PORT = 8348;
const BASE_URL = `http://127.0.0.1:${PORT}/`;
const ROOT = path.join(__dirname, '..');
const SHOT_DIR = process.env.SHOT_DIR || path.join(ROOT, 'test-shots');

const LIBRARY_SEAT_SPECS = [
  {
    seatId: 'tqb-1f-t1-s1',
    label: 'Bàn đọc Tây 1 · Ghế A',
    x: -2.4,
    z: 1.2,
    facing: 0,
    approach: { x: -2.4, z: 0.54 },
    camYaw: -0.55,
    camPitch: 0.28,
    shotName: 'pr8-seat-1.png',
  },
  {
    seatId: 'tqb-1f-t1-s2',
    label: 'Bàn đọc Tây 1 · Ghế B',
    x: -1.9,
    z: 2.3,
    facing: Math.PI,
    approach: { x: -1.9, z: 2.96 },
    camYaw: Math.PI + 0.55,
    camPitch: 0.28,
    shotName: 'pr8-seat-2.png',
  },
  {
    seatId: 'tqb-1f-t2-s1',
    label: 'Bàn đọc Đông 2 · Ghế A',
    x: 1.9,
    z: 1.2,
    facing: 0,
    approach: { x: 1.9, z: 0.54 },
    camYaw: 0.55,
    camPitch: 0.28,
    shotName: 'pr8-seat-3.png',
  },
  {
    seatId: 'tqb-1f-t2-s2',
    label: 'Bàn đọc Đông 2 · Ghế B',
    x: 2.4,
    z: 2.3,
    facing: Math.PI,
    approach: { x: 2.4, z: 2.96 },
    camYaw: Math.PI - 0.55,
    camPitch: 0.28,
    shotName: 'pr8-seat-4.png',
  },
];

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

async function run() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const { chromium } = loadPlaywright();
  const executablePath = resolveBrowserExecutable();
  const server = await startStaticServer();

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader'],
    });

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    // 1. Enter campus
    console.log('[1/14] Navigating to HUST 3D Campus and entering...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('#enter-campus').click();
    await page.waitForFunction(() => Boolean(window.__bkhn && window.__bkhn.getPos), null, {
      timeout: 30000,
    });
    console.log('  PASS: Entered HUST 3D Campus.');

    // 2. Enter LibraryLobby via Library door interaction
    console.log('[2/14] Walking to Ta Quang Buu Library door and entering LibraryLobby...');
    await page.evaluate(() => window.__bkhn.teleport(38, 22, 0));
    await page.waitForFunction(
      () => document.body.innerText.includes('Vào sảnh Thư viện Tạ Quang Bửu'),
      null,
      { timeout: 10000 },
    );
    await page.keyboard.press('KeyE');
    await page.waitForFunction(
      () => Boolean(window.__bkhn && window.__bkhn.isInLibraryLobby && window.__bkhn.isInLibraryLobby()),
      null,
      { timeout: 10000 },
    );
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(SHOT_DIR, 'pr8-lobby-overview.png') });
    console.log('  PASS: Entered LibraryLobby.');

    // 3. Verify study tables and 4 chairs exist
    console.log('[3/14] Verifying study tables and 4 chairs exist in LibraryLobby...');
    const lobbyPos = await page.evaluate(() => window.__bkhn.getPos());
    assert.equal(Math.round(lobbyPos.x), 0);
    assert.ok(Math.abs(lobbyPos.z - 2.4) < 0.2);

    // Verify clicking / selecting from too far away is rejected cleanly without teleporting
    await page.evaluate(() => window.__bkhn.teleport(0, -1.0, 0));
    const farAttempt = await page.evaluate(() => window.__bkhn.sitAtSeat('tqb-1f-t1-s1'));
    assert.equal(farAttempt.ok, false);
    assert.equal(farAttempt.reason, 'too-far');
    const posAfterFarAttempt = await page.evaluate(() => window.__bkhn.getPos());
    assert.ok(Math.abs(posAfterFarAttempt.x - 0) < 0.05);
    console.log('  PASS: Far seat selection rejected cleanly without teleporting.');

    // 4 & 5. Move near seat tqb-1f-t1-s1 and verify interaction prompt "E — Ngồi học" appears
    console.log('[4-5/14] Moving near seat tqb-1f-t1-s1 and checking "E — Ngồi học" prompt...');
    await page.evaluate(() => window.__bkhn.teleport(-2.4, 0.54, 0));
    await page.waitForFunction(
      () => document.body.innerText.includes('Ngồi học'),
      null,
      { timeout: 5000 },
    );
    console.log('  PASS: Interaction prompt "E — Ngồi học" displayed.');

    // 6 & 7. Sit via E and verify player position, facing, and seated pose
    console.log('[6-7/14] Pressing E to sit at tqb-1f-t1-s1 and verifying seated pose...');
    await page.keyboard.press('KeyE');
    await page.waitForFunction(
      () => Boolean(window.__bkhn.getSeatState && window.__bkhn.getSeatState().seated),
      null,
      { timeout: 5000 },
    );
    // Allow a few frames for pose interpolation
    await new Promise((r) => setTimeout(r, 600));
    const pose1 = await page.evaluate(() => window.__bkhn.getPose());
    assert.equal(pose1.seated, true);
    assert.equal(pose1.seatId, 'tqb-1f-t1-s1');
    assert.ok(Math.abs(pose1.pos.x - -2.4) < 0.02);
    assert.ok(Math.abs(pose1.pos.z - 1.2) < 0.02);
    assert.ok(Math.abs(pose1.facing - 0) < 0.02);
    assert.ok(pose1.legL < -1.0, `Expected seated hip flexion < -1.0 rad, got ${pose1.legL}`);
    assert.ok(pose1.kneeL > 1.0, `Expected seated knee flexion > 1.0 rad, got ${pose1.kneeL}`);

    // Verify movement keys are disabled while seated
    await page.keyboard.down('KeyW');
    await new Promise((r) => setTimeout(r, 300));
    await page.keyboard.up('KeyW');
    const posWhileSeated = await page.evaluate(() => window.__bkhn.getPos());
    assert.ok(Math.abs(posWhileSeated.x - -2.4) < 0.02);
    assert.ok(Math.abs(posWhileSeated.z - 1.2) < 0.02);
    console.log('  PASS: Avatar seated at (-2.4, 1.2) facing 0 with seated joint pose and movement locked.');

    // 8. Verify Study Session receives studyRoomId: 'library-lobby' and seatId: 'tqb-1f-t1-s1'
    console.log('[8/14] Verifying StudySessionState persisted seat binding...');
    const sessionSeat1 = await page.evaluate(() => {
      const raw = window.localStorage.getItem('bkhn_study_session_v1');
      return raw ? JSON.parse(raw) : null;
    });
    assert.ok(sessionSeat1);
    assert.equal(sessionSeat1.studyRoomId, 'library-lobby');
    assert.equal(sessionSeat1.seatId, 'tqb-1f-t1-s1');
    const hudSeatedText = await page.locator('[data-testid="hud-seated-status"]').innerText();
    assert.ok(hudSeatedText.includes('Bàn đọc Tây 1 · Ghế A'));
    console.log('  PASS: Study Session bound to library-lobby / tqb-1f-t1-s1.');

    // 9. Open Study Panel and start Pomodoro focus session while seated
    console.log('[9/14] Opening Study Panel and starting Pomodoro focus session while seated...');
    await page.locator('[data-testid="hud-seated-open-study"]').click();
    const studyPanel = page.locator('[data-testid="study-panel"]');
    await studyPanel.waitFor({ state: 'visible', timeout: 5000 });
    const panelSeatBadge = await page.locator('[data-testid="study-panel-seat-badge"]').innerText();
    assert.ok(panelSeatBadge.includes('Bàn đọc Tây 1 · Ghế A'));

    // Set Normal 3D focus preference so HUD remains visible for subsequent checks
    await page.locator('[data-testid="focus-mode-off"]').click();
    await page.locator('[data-testid="focus-auto-hide-checkbox"]').uncheck();
    await page.locator('[data-testid="pomodoro-start"]').click();
    const phaseBadge = await page.locator('[data-testid="pomodoro-phase-badge"]').innerText();
    assert.ok(phaseBadge.includes('Đang Tập trung'));
    console.log('  PASS: Pomodoro focus session running while seated.');

    // 10. Switch to Zen 2D and return to 3D while seated
    console.log('[10/14] Switching to Zen 2D and returning to 3D while seated...');
    await page.locator('[data-testid="focus-mode-zen-2d"]').click();
    await page.locator('[data-testid="zen-2d-view"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('canvas').count(), 0);

    await page.locator('[data-testid="exit-zen-2d"]').click();
    await page.waitForFunction(
      () => document.querySelectorAll('canvas').length > 0 && Boolean(window.__bkhn),
      null,
      { timeout: 20000 },
    );
    await new Promise((r) => setTimeout(r, 500));
    const seatAfterZen = await page.evaluate(() => window.__bkhn.getSeatState());
    assert.equal(seatAfterZen.seated, true);
    assert.equal(seatAfterZen.seatId, 'tqb-1f-t1-s1');
    assert.ok(Math.abs(seatAfterZen.pos.x - -2.4) < 0.02);
    assert.ok(Math.abs(seatAfterZen.pos.z - 1.2) < 0.02);
    console.log('  PASS: Seated state and coordinates preserved across Zen 2D -> 3D.');

    // 11. Stand up and verify safe standing position and cleared seatId
    console.log('[11/14] Standing up and verifying safe standing position & cleared seatId...');
    await page.locator('[data-testid="hud-stand-up-button"]').click();
    await page.waitForFunction(
      () => Boolean(window.__bkhn.getSeatState && !window.__bkhn.getSeatState().seated),
      null,
      { timeout: 5000 },
    );
    const afterStand = await page.evaluate(() => ({
      seatState: window.__bkhn.getSeatState(),
      session: JSON.parse(window.localStorage.getItem('bkhn_study_session_v1')),
    }));
    assert.equal(afterStand.seatState.seated, false);
    assert.equal(afterStand.seatState.seatId, null);
    assert.ok(Math.abs(afterStand.seatState.pos.x - -2.4) < 0.05);
    assert.ok(Math.abs(afterStand.seatState.pos.z - 0.54) < 0.05);
    assert.equal(afterStand.session.seatId, null);
    assert.equal(afterStand.session.pomodoro.phase, 'focus');
    assert.equal(afterStand.session.pomodoro.running, true);
    console.log('  PASS: Stood up to safe position (-2.4, 0.54), cleared seatId, kept Pomodoro running.');

    // 12. Test all 4 library seats and capture visual screenshots of each seat
    console.log('[12/14] Testing all 4 library seats and capturing visual screenshots...');
    for (const spec of LIBRARY_SEAT_SPECS) {
      await page.evaluate(
        ({ ax, az, yaw, pitch }) => window.__bkhn.teleport(ax, az, yaw, pitch),
        {
          ax: spec.approach.x,
          az: spec.approach.z,
          yaw: spec.camYaw,
          pitch: spec.camPitch,
        },
      );
      const sitRes = await page.evaluate((id) => window.__bkhn.sitAtSeat(id), spec.seatId);
      assert.equal(sitRes.ok, true, `Failed to sit at ${spec.seatId}: ${JSON.stringify(sitRes)}`);
      await new Promise((r) => setTimeout(r, 650));

      const stateNow = await page.evaluate(() => window.__bkhn.getSeatState());
      assert.equal(stateNow.seated, true);
      assert.equal(stateNow.seatId, spec.seatId);
      assert.ok(Math.abs(stateNow.pos.x - spec.x) < 0.02);
      assert.ok(Math.abs(stateNow.pos.z - spec.z) < 0.02);
      assert.ok(Math.abs(stateNow.facing - spec.facing) < 0.02);

      await page.screenshot({ path: path.join(SHOT_DIR, spec.shotName) });
      console.log(`  PASS: Verified & captured ${spec.seatId} (${spec.label}) -> ${spec.shotName}`);

      const standRes = await page.evaluate(() => window.__bkhn.standUp());
      assert.equal(standRes.ok, true);
    }

    // 13. Verify statue, info desk, and vocab board interactions still work
    console.log('[13/14] Verifying statue, info desk, and vocab board interactions...');
    await page.evaluate(() => window.__bkhn.teleport(0, -1.1, 0));
    await page.waitForFunction(
      () => document.body.innerText.includes('Tượng GS. Tạ Quang Bửu'),
      null,
      { timeout: 5000 },
    );

    await page.evaluate(() => window.__bkhn.teleport(-2.3, -0.6, Math.PI / 2));
    await page.waitForFunction(
      () => document.body.innerText.includes('Quầy thông tin'),
      null,
      { timeout: 5000 },
    );

    await page.evaluate(() => window.__bkhn.teleport(2.4, -0.6, -Math.PI / 2));
    await page.waitForFunction(
      () => document.body.innerText.includes('Xem bảng từ vựng Thư viện'),
      null,
      { timeout: 5000 },
    );
    console.log('  PASS: Statue, Info Desk, and Vocab Board prompts verified.');

    // 14. Sit at a seat, then exit LibraryLobby and verify clean state reset
    console.log('[14/14] Sitting at tqb-1f-t2-s1 and exiting LibraryLobby to verify clean reset...');
    await page.evaluate(() => window.__bkhn.teleport(1.9, 0.54, 0));
    await page.evaluate(() => window.__bkhn.sitAtSeat('tqb-1f-t2-s1'));
    assert.equal((await page.evaluate(() => window.__bkhn.getSeatState())).seated, true);

    await page.locator('#exit-library-lobby').click();
    await page.waitForFunction(
      () => Boolean(window.__bkhn && !window.__bkhn.isInLibraryLobby()),
      null,
      { timeout: 10000 },
    );
    const afterExit = await page.evaluate(() => ({
      seatState: window.__bkhn.getSeatState(),
      session: JSON.parse(window.localStorage.getItem('bkhn_study_session_v1')),
    }));
    assert.equal(afterExit.seatState.seated, false);
    assert.equal(afterExit.seatState.seatId, null);
    assert.equal(afterExit.session.seatId, null);
    console.log('  PASS: Exiting LibraryLobby cleanly released local seat state and cleared seatId.');

    assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.join('; ')}`);
    console.log('ALL 14 LIBRARY SEATING SMOKE TEST STEPS PASSED!');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

run().catch((err) => {
  console.error('LIBRARY SEATING SMOKE TEST FAILED:', err);
  process.exit(1);
});
