// ---------------------------------------------------------------------------
// test/library-seating-smoke.cjs — Playwright browser smoke & visual audit
// for PR8 Interactive 3D Library Seating & Study Experience (including PR8
// Final Review Fixes):
// 1. Enter campus
// 2. Enter LibraryLobby via Library door ("E — Vào sảnh Thư viện Tạ Quang Bửu")
// 3. Real R3F raycast mouse click distance rejection without teleporting
// 4. Move near seat tqb-1f-t1-s1 and verify "E — Ngồi học" prompt
// 5. Sit via keyboard E and verify player position, facing, seated pose & locked WASD
// 6. Verify Study Session receives studyRoomId: 'library-lobby' & seatId: 'tqb-1f-t1-s1'
// 7. Open Study Panel, add subject/task, start Pomodoro focus session while seated
// 8. Switch to Zen 2D and return to 3D while seated (preserving seated state)
// 9. [Finding 1 Regression] End Study Session ("⏹ Kết thúc phiên") while seated in Zen 2D:
//    - Clears StudySession seatId while preserving subject, tasks & focus history
//    - Clears local player seat state
//    - Remounts 3D with a standing avatar at collision-safe position (-2.4, 0.54)
//    - Verifies WASD movement works after 3D remount
// 10. [Finding 2 Regression] Real R3F raycast mouse click selection across all 4 seats
//     (tqb-1f-t1-s1..s2, tqb-1f-t2-s1..s2) + visual screenshots
// 11. [Finding 2 Regression] Real mobile viewport (390x844) touch/tap on chair via
//     R3F raycast + touch tap on "🚶 Đứng dậy" + mobile screenshot
// 12. Verify statue, info desk, and vocab board interactions still work
// 13. Sit via real click and exit LibraryLobby to verify clean seat release
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

// Each seat has a standing approach position, a click-framing camera yaw/pitch
// where the chair is unobstructed on screen for real R3F raycast clicking, and
// a seated inspection camera yaw/pitch for visual screenshots.
const LIBRARY_SEAT_SPECS = [
  {
    seatId: 'tqb-1f-t1-s1',
    label: 'Bàn đọc Tây 1 · Ghế A',
    x: -2.4,
    z: 1.2,
    facing: 0,
    approach: { x: -2.4, z: 0.54 },
    clickYaw: Math.PI - 0.65,
    clickPitch: 0.36,
    seatedYaw: -0.55,
    seatedPitch: 0.28,
    shotName: 'pr8-seat-1.png',
  },
  {
    seatId: 'tqb-1f-t1-s2',
    label: 'Bàn đọc Tây 1 · Ghế B',
    x: -1.9,
    z: 2.3,
    facing: Math.PI,
    approach: { x: -1.9, z: 2.96 },
    clickYaw: 0.65,
    clickPitch: 0.36,
    seatedYaw: Math.PI + 0.55,
    seatedPitch: 0.28,
    shotName: 'pr8-seat-2.png',
  },
  {
    seatId: 'tqb-1f-t2-s1',
    label: 'Bàn đọc Đông 2 · Ghế A',
    x: 1.9,
    z: 1.2,
    facing: 0,
    approach: { x: 1.9, z: 0.54 },
    clickYaw: Math.PI + 0.65,
    clickPitch: 0.36,
    seatedYaw: 0.55,
    seatedPitch: 0.28,
    shotName: 'pr8-seat-3.png',
  },
  {
    seatId: 'tqb-1f-t2-s2',
    label: 'Bàn đọc Đông 2 · Ghế B',
    x: 2.4,
    z: 2.3,
    facing: Math.PI,
    approach: { x: 2.4, z: 2.96 },
    clickYaw: -0.65,
    clickPitch: 0.36,
    seatedYaw: Math.PI - 0.55,
    seatedPitch: 0.28,
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

    // Enable hasTouch: true so both desktop mouse clicks and mobile touch taps can be tested
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      hasTouch: true,
    });
    const page = await context.newPage();

    // Seed 1 completed focus block in initial storage so we can verify that ending a session in Zen 2D preserves completed focus history
    await page.addInitScript(() => {
      if (!window.localStorage.getItem('bkhn_study_session_v1')) {
        window.localStorage.setItem(
          'bkhn_study_session_v1',
          JSON.stringify({
            version: 1,
            active: false,
            sessionStartedAtMs: null,
            subjectTag: 'Tự học HSK',
            linkedHskLessonId: null,
            studyRoomId: null,
            seatId: null,
            pomodoro: {
              phase: 'idle',
              running: false,
              config: {
                focusDurationMs: 1500000,
                shortBreakDurationMs: 300000,
                longBreakDurationMs: 900000,
                longBreakEvery: 4,
              },
              phaseStartedAtMs: null,
              phaseEndsAtMs: null,
              pausedRemainingMs: null,
              completedFocusBlocks: 1,
              totalFocusedMs: 1500000,
            },
            tasks: [],
            history: [
              {
                id: 'focus-1700000001500',
                startedAtMs: 1700000000000,
                endedAtMs: 1700000001500,
                durationMs: 1500000,
                studyRoomId: 'library-lobby',
                seatId: 'tqb-1f-t1-s1',
                subjectTag: 'Tự học HSK',
                linkedHskLessonId: 'hsk4-shang-l01',
              },
            ],
          }),
        );
      }
    });

    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    // 1. Enter campus
    console.log('[1/13] Navigating to HUST 3D Campus and entering...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('#enter-campus').click();
    await page.waitForFunction(() => Boolean(window.__bkhn && window.__bkhn.getPos), null, {
      timeout: 30000,
    });
    console.log('  PASS: Entered HUST 3D Campus.');

    // 2. Enter LibraryLobby via Library door interaction
    console.log('[2/13] Walking to Ta Quang Buu Library door and entering LibraryLobby...');
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

    // 3. Real R3F raycast mouse click distance rejection without teleporting
    console.log('[3/13] Verifying real R3F mouse click distance rejection from across the lobby...');
    // Stand at (0, -0.6) looking South-West toward seat tqb-1f-t1-s1 (-2.4, 1.2) -> distance = 3.0m > 1.65m
    await page.evaluate(() => window.__bkhn.teleport(0, -0.6, Math.PI + 0.75, 0.32));
    await new Promise((r) => setTimeout(r, 450));
    const farPt = await page.evaluate(() => window.__bkhn.projectSeatToScreen('tqb-1f-t1-s1'));
    assert.ok(farPt && farPt.inFront, `Expected far seat in front of camera, got ${JSON.stringify(farPt)}`);
    await page.mouse.click(farPt.x, farPt.y);
    await page.waitForFunction(
      () => document.body.innerText.includes('Hãy bước lại gần ghế hơn để ngồi học.'),
      null,
      { timeout: 5000 },
    );
    const afterFarClick = await page.evaluate(() => ({
      pos: window.__bkhn.getPos(),
      seatState: window.__bkhn.getSeatState(),
    }));
    assert.equal(afterFarClick.seatState.seated, false);
    assert.equal(afterFarClick.seatState.seatId, null);
    assert.ok(Math.abs(afterFarClick.pos.x - 0) < 0.05);
    assert.ok(Math.abs(afterFarClick.pos.z - -0.6) < 0.05);
    console.log('  PASS: Real R3F mouse click on far chair rejected with toast and zero teleportation.');

    // 4. Move near seat tqb-1f-t1-s1 and verify interaction prompt "E — Ngồi học" appears
    console.log('[4/13] Moving near seat tqb-1f-t1-s1 and checking "E — Ngồi học" prompt...');
    await page.evaluate(() => window.__bkhn.teleport(-2.4, 0.54, 0));
    await page.waitForFunction(
      () => document.body.innerText.includes('Ngồi học'),
      null,
      { timeout: 5000 },
    );
    console.log('  PASS: Interaction prompt "E — Ngồi học" displayed.');

    // 5. Sit via keyboard E and verify player position, facing, and seated pose
    console.log('[5/13] Pressing E to sit at tqb-1f-t1-s1 and verifying seated pose...');
    await page.keyboard.press('KeyE');
    await page.waitForFunction(
      () => Boolean(window.__bkhn.getSeatState && window.__bkhn.getSeatState().seated),
      null,
      { timeout: 5000 },
    );
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
    await new Promise((r) => setTimeout(r, 250));
    await page.keyboard.up('KeyW');
    const posWhileSeated = await page.evaluate(() => window.__bkhn.getPos());
    assert.ok(Math.abs(posWhileSeated.x - -2.4) < 0.02);
    assert.ok(Math.abs(posWhileSeated.z - 1.2) < 0.02);
    console.log('  PASS: Avatar seated at (-2.4, 1.2) facing 0 with seated joint pose and movement locked.');

    // 6. Verify Study Session receives studyRoomId: 'library-lobby' and seatId: 'tqb-1f-t1-s1'
    console.log('[6/13] Verifying StudySessionState persisted seat binding...');
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

    // 7. Open Study Panel, configure subject + task + 1 completed focus block, and run Pomodoro
    console.log('[7/13] Opening Study Panel, adding subject & task, and starting Pomodoro while seated...');
    await page.locator('[data-testid="hud-seated-open-study"]').click();
    const studyPanel = page.locator('[data-testid="study-panel"]');
    await studyPanel.waitFor({ state: 'visible', timeout: 5000 });
    const panelSeatBadge = await page.locator('[data-testid="study-panel-seat-badge"]').innerText();
    assert.ok(panelSeatBadge.includes('Bàn đọc Tây 1 · Ghế A'));

    await page.locator('[data-testid="study-subject-input"]').fill('Ôn ngữ pháp HSK 4');
    await page.locator('[data-testid="study-task-input"]').fill('Viết 10 câu chữ 把');
    await page.locator('[data-testid="study-task-add"]').click();

    await page.locator('[data-testid="focus-mode-off"]').click();
    await page.locator('[data-testid="focus-auto-hide-checkbox"]').uncheck();
    await page.locator('[data-testid="pomodoro-start"]').click();
    const phaseBadge = await page.locator('[data-testid="pomodoro-phase-badge"]').innerText();
    assert.ok(phaseBadge.includes('Đang Tập trung'));
    console.log('  PASS: Pomodoro focus session running with subject, task, and 1 completed focus block.');

    // 8. Switch to Zen 2D and return to 3D while seated (verifying normal Zen 2D -> 3D keeps seat)
    console.log('[8/13] Switching to Zen 2D and returning to 3D while seated...');
    await page.locator('[data-testid="focus-mode-zen-2d"]').click();
    await page.locator('[data-testid="zen-2d-view"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('canvas').count(), 0);

    await page.locator('[data-testid="exit-zen-2d"]').click();
    await page.waitForFunction(
      () => document.querySelectorAll('canvas').length > 0 && Boolean(window.__bkhn),
      null,
      { timeout: 20000 },
    );
    const seatAfterZen = await page.evaluate(() => window.__bkhn.getSeatState());
    assert.equal(seatAfterZen.seated, true);
    assert.equal(seatAfterZen.seatId, 'tqb-1f-t1-s1');
    assert.ok(Math.abs(seatAfterZen.pos.x - -2.4) < 0.02);
    assert.ok(Math.abs(seatAfterZen.pos.z - 1.2) < 0.02);
    console.log('  PASS: Seated state and coordinates preserved across normal Zen 2D -> 3D.');

    // 9. [Finding 1 Regression] Enter Zen 2D while seated and click "⏹ Kết thúc phiên" directly in Zen 2D
    console.log('[9/13] Regression test: Ending Study Session while seated in Zen 2D...');
    await page.locator('[data-testid="hud-seated-open-study"]').click();
    await studyPanel.waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('[data-testid="focus-mode-zen-2d"]').click();
    await page.locator('[data-testid="zen-2d-view"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('canvas').count(), 0);
    assert.equal(await page.evaluate(() => typeof window.__bkhn), 'undefined');

    // Click "⏹ Kết thúc phiên" without leaving Zen 2D first
    await page.locator('[data-testid="zen-end-session"]').click();

    // Zen 2D automatically exits back to 3D when session ends
    await page.waitForFunction(
      () => document.querySelectorAll('canvas').length > 0 && Boolean(window.__bkhn && window.__bkhn.getPose),
      null,
      { timeout: 20000 },
    );
    await new Promise((r) => setTimeout(r, 450));

    const afterZenEnd = await page.evaluate(() => ({
      pose: window.__bkhn.getPose(),
      seatState: window.__bkhn.getSeatState(),
      session: JSON.parse(window.localStorage.getItem('bkhn_study_session_v1')),
    }));

    // Verify Study Session seat binding is cleared while subject, tasks, and history are preserved
    assert.equal(afterZenEnd.session.active, false);
    assert.equal(afterZenEnd.session.seatId, null);
    assert.equal(afterZenEnd.session.subjectTag, 'Ôn ngữ pháp HSK 4');
    assert.equal(afterZenEnd.session.tasks.length, 1);
    assert.equal(afterZenEnd.session.tasks[0].title, 'Viết 10 câu chữ 把');
    assert.ok(afterZenEnd.session.history.length >= 1);

    // Verify local player seat state is cleared and 3D remount shows a standing avatar at safe position (-2.4, 0.54)
    assert.equal(afterZenEnd.seatState.seated, false);
    assert.equal(afterZenEnd.seatState.seatId, null);
    assert.equal(afterZenEnd.pose.seated, false);
    assert.ok(Math.abs(afterZenEnd.pose.legL) < 0.25, `Expected standing legL near 0, got ${afterZenEnd.pose.legL}`);
    assert.ok(Math.abs(afterZenEnd.pose.pos.x - -2.4) < 0.05);
    assert.ok(Math.abs(afterZenEnd.pose.pos.z - 0.54) < 0.05);
    assert.equal(await page.locator('[data-testid="hud-seated-status"]').count(), 0);

    await page.screenshot({ path: path.join(SHOT_DIR, 'pr8-zen2d-end-session-standing.png') });

    // Verify WASD controls work and player is not stuck inside furniture
    await page.evaluate(() => window.__bkhn.teleport(-2.4, 0.54, 0, 0.24));
    const beforeWalk = await page.evaluate(() => window.__bkhn.getPos());
    await page.keyboard.down('KeyW');
    await new Promise((r) => setTimeout(r, 550));
    await page.keyboard.up('KeyW');
    const afterWalk = await page.evaluate(() => window.__bkhn.getPos());
    const movedDist = Math.hypot(afterWalk.x - beforeWalk.x, afterWalk.z - beforeWalk.z);
    assert.ok(movedDist > 0.25, `Expected WASD movement > 0.25m after Zen 2D end session, moved ${movedDist}m`);
    console.log('  PASS: Ending Study Session in Zen 2D cleared seat, preserved history/tasks, remounted standing avatar at (-2.4, 0.54), and restored WASD movement.');

    // 10. [Finding 2 Regression] Real R3F raycast mouse click selection across all 4 seats
    console.log('[10/13] Testing all 4 library seats via real R3F mouse click raycast & capturing screenshots...');
    // Start a fresh focus timer so the HUD timer badge is shown in the 4 seat screenshots
    await page.locator('[data-testid="open-study-panel"]').click();
    await studyPanel.waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('[data-testid="pomodoro-start"]').click();
    await page.locator('[data-testid="close-study-panel"]').click();
    await studyPanel.waitFor({ state: 'hidden', timeout: 5000 });

    for (const spec of LIBRARY_SEAT_SPECS) {
      // Position player at the standing approach spot looking toward the chair
      await page.evaluate(
        ({ ax, az, yaw, pitch }) => window.__bkhn.teleport(ax, az, yaw, pitch),
        {
          ax: spec.approach.x,
          az: spec.approach.z,
          yaw: spec.clickYaw,
          pitch: spec.clickPitch,
        },
      );
      await new Promise((r) => setTimeout(r, 450));

      const screenPt = await page.evaluate(
        (id) => window.__bkhn.projectSeatToScreen(id),
        spec.seatId,
      );
      assert.ok(
        screenPt && screenPt.inFront,
        `Seat ${spec.seatId} not projected in front of camera: ${JSON.stringify(screenPt)}`,
      );

      // Perform a real mouse click on the <canvas> at the projected chair coordinates
      await page.mouse.click(screenPt.x, screenPt.y);

      await page.waitForFunction(
        (expectedId) =>
          Boolean(
            window.__bkhn.getSeatState &&
              window.__bkhn.getSeatState().seated &&
              window.__bkhn.getSeatState().seatId === expectedId,
          ),
        spec.seatId,
        { timeout: 5000 },
      );

      // Rotate camera to the 3/4 inspection angle to capture the seated avatar screenshot
      await page.evaluate(
        ({ yaw, pitch }) => {
          const curYaw = window.__bkhn.getYaw();
          const curPitch = window.__bkhn.getPitch();
          return { curYaw, curPitch, yaw, pitch };
        },
        { yaw: spec.seatedYaw, pitch: spec.seatedPitch },
      );
      await new Promise((r) => setTimeout(r, 450));

      const stateNow = await page.evaluate(() => ({
        seatState: window.__bkhn.getSeatState(),
        session: JSON.parse(window.localStorage.getItem('bkhn_study_session_v1')),
      }));
      assert.equal(stateNow.seatState.seated, true);
      assert.equal(stateNow.seatState.seatId, spec.seatId);
      assert.equal(stateNow.session.seatId, spec.seatId);
      assert.ok(Math.abs(stateNow.seatState.pos.x - spec.x) < 0.02);
      assert.ok(Math.abs(stateNow.seatState.pos.z - spec.z) < 0.02);
      assert.ok(Math.abs(stateNow.seatState.facing - spec.facing) < 0.02);

      await page.screenshot({ path: path.join(SHOT_DIR, spec.shotName) });
      console.log(
        `  PASS: Real R3F mouse click selected ${spec.seatId} (${spec.label}) at (${screenPt.x}, ${screenPt.y}) -> ${spec.shotName}`,
      );

      // Stand up via real HUD click
      await page.locator('[data-testid="hud-stand-up-button"]').click();
      await page.waitForFunction(
        () => Boolean(window.__bkhn.getSeatState && !window.__bkhn.getSeatState().seated),
        null,
        { timeout: 5000 },
      );
    }

    // 11. [Finding 2 Regression] Real touch/tap on a chair at a mobile viewport (390x844)
    console.log('[11/13] Testing real touch/tap on chair at mobile viewport (390x844)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await new Promise((r) => setTimeout(r, 500));

    const mobileSeat = LIBRARY_SEAT_SPECS[2]; // tqb-1f-t2-s1
    await page.evaluate(
      ({ ax, az, yaw, pitch }) => window.__bkhn.teleport(ax, az, yaw, pitch),
      {
        ax: mobileSeat.approach.x,
        az: mobileSeat.approach.z,
        yaw: mobileSeat.clickYaw,
        pitch: mobileSeat.clickPitch,
      },
    );
    await new Promise((r) => setTimeout(r, 450));

    const mobilePt = await page.evaluate(
      (id) => window.__bkhn.projectSeatToScreen(id),
      mobileSeat.seatId,
    );
    assert.ok(
      mobilePt && mobilePt.inFront,
      `Mobile seat ${mobileSeat.seatId} not in front: ${JSON.stringify(mobilePt)}`,
    );

    // Perform a real touch tap on the chair via Playwright touchscreen
    await page.touchscreen.tap(mobilePt.x, mobilePt.y);

    await page.waitForFunction(
      (expectedId) =>
        Boolean(
          window.__bkhn.getSeatState &&
            window.__bkhn.getSeatState().seated &&
            window.__bkhn.getSeatState().seatId === expectedId,
        ),
      mobileSeat.seatId,
      { timeout: 5000 },
    );
    await new Promise((r) => setTimeout(r, 450));
    await page.screenshot({ path: path.join(SHOT_DIR, 'pr8-mobile-tap-seat.png') });

    // Stand up via touch tap on the mobile bottom-right "🚶 Đứng dậy" button
    const standBtnBox = await page.locator('[data-testid="hud-bottom-stand-up"]').boundingBox();
    assert.ok(standBtnBox, 'Expected mobile stand-up button to be visible');
    await page.touchscreen.tap(
      Math.round(standBtnBox.x + standBtnBox.width / 2),
      Math.round(standBtnBox.y + standBtnBox.height / 2),
    );
    await page.waitForFunction(
      () => Boolean(window.__bkhn.getSeatState && !window.__bkhn.getSeatState().seated),
      null,
      { timeout: 5000 },
    );

    // Restore desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await new Promise((r) => setTimeout(r, 450));
    console.log(
      `  PASS: Mobile viewport (390x844) touch tap selected ${mobileSeat.seatId} at (${mobilePt.x}, ${mobilePt.y}) & stood up cleanly -> pr8-mobile-tap-seat.png`,
    );

    // 12. Verify statue, info desk, and vocab board interactions still work
    console.log('[12/13] Verifying statue, info desk, and vocab board interactions...');
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

    await page.locator('[data-testid="toggle-hsk-mode"]').click();
    await page.waitForFunction(
      () => document.body.innerText.includes('HSK: Bật'),
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

    // 13. Sit via real click, then exit LibraryLobby and verify clean state reset
    console.log('[13/13] Sitting at tqb-1f-t2-s1 via real click and exiting LibraryLobby to verify clean reset...');
    const exitSeat = LIBRARY_SEAT_SPECS[2];
    await page.evaluate(
      ({ ax, az, yaw, pitch }) => window.__bkhn.teleport(ax, az, yaw, pitch),
      {
        ax: exitSeat.approach.x,
        az: exitSeat.approach.z,
        yaw: exitSeat.clickYaw,
        pitch: exitSeat.clickPitch,
      },
    );
    await new Promise((r) => setTimeout(r, 400));
    const exitSeatPt = await page.evaluate(
      (id) => window.__bkhn.projectSeatToScreen(id),
      exitSeat.seatId,
    );
    await page.mouse.click(exitSeatPt.x, exitSeatPt.y);
    await page.waitForFunction(
      () => Boolean(window.__bkhn.getSeatState && window.__bkhn.getSeatState().seated),
      null,
      { timeout: 5000 },
    );

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
    console.log('ALL 13 LIBRARY SEATING SMOKE & REGRESSION TEST STEPS PASSED!');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

run().catch((err) => {
  console.error('LIBRARY SEATING SMOKE TEST FAILED:', err);
  process.exit(1);
});
