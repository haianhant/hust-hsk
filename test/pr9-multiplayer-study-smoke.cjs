// ---------------------------------------------------------------------------
// test/pr9-multiplayer-study-smoke.cjs — End-to-End Playwright Two-Browser
// Verification & Visual Audit for PR9 Server-Authoritative Seat Occupancy &
// Live Study Presence:
//
// 1. Start local HskRoom WebSocket server (test/ws-shim/server.js) + static server
// 2. Open two isolated browser contexts (Student A & Student B) in room hsk-1
// 3. Both enter HUST 3D Campus and enter Ta Quang Buu Library 1F Lobby
// 4. Student A sits at tqb-1f-t1-s1 via real R3F mouse click
// 5. Student A opens StudyPanel, sets subject, adds private task, starts Pomodoro Focus
// 6. Student B sees Student A's 3D seated avatar + overhead badge ("🍅 Đang tự học")
//    and StudyPanel room presence list (with zero private task or MSSV leakage)
// 7. Student B walks to tqb-1f-t1-s1, sees locked prompt, clicks A's chair ->
//    rejected with Vietnamese toast and Student B remains standing
// 8. Student B walks to tqb-1f-t1-s2 and sits via real R3F mouse click
// 9. Student A sees Student B seated across Table 1 in 3D
// 10. Student B switches to tqb-1f-t2-s1; tqb-1f-t1-s2 becomes free
// 11. Trigger mid-session DO Hibernation (POST /__hibernate?room=hsk-1) and verify
//     authoritative seats & presences survive wakeup
// 12. Room isolation: Student C in room hsk-2 claims tqb-1f-t1-s1 independently
// 13. Student A enters Zen 2D while seated and clicks "⏹ Kết thúc phiên" ->
//     tqb-1f-t1-s1 is released on server and Student B sees it become free
// 14. Student B disconnects -> tqb-1f-t2-s1 is released on server; Student A sees
//     all 4 seats free
// 15. Offline fallback: unreachable WS still allows local seating with explicit
//     "Chế độ ngoại tuyến (chỉ hiển thị cục bộ)" indicator
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
      // try next
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

const HTTP_PORT = 8359;
const WS_PORT = 8799;
const BASE_HTTP = `http://127.0.0.1:${HTTP_PORT}`;
const WS_URL = `ws://127.0.0.1:${WS_PORT}/ws`;
const ROOT = path.join(__dirname, '..');
const SHOT_DIR = process.env.SHOT_DIR || path.join(ROOT, 'test-shots');

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', String(HTTP_PORT), '--directory', 'out'], {
      cwd: ROOT,
      stdio: 'ignore',
    });
    proc.on('error', reject);
    const t0 = Date.now();
    const check = () => {
      fetch(`${BASE_HTTP}/`, { method: 'HEAD' })
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

function startWsShimServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      process.execPath,
      [path.join(ROOT, 'test/ws-shim/server.js'), String(WS_PORT)],
      {
        cwd: ROOT,
        stdio: 'ignore',
      },
    );
    proc.on('error', reject);
    const t0 = Date.now();
    const check = () => {
      fetch(`http://127.0.0.1:${WS_PORT}/health`)
        .then((r) => (r.ok ? resolve(proc) : Promise.reject()))
        .catch(() => {
          if (Date.now() - t0 > 10000) {
            reject(new Error('WS shim server did not start within 10s'));
          } else {
            setTimeout(check, 200);
          }
        });
    };
    check();
  });
}

async function seedCharacterAndEnterLibrary(page, profile, roomUrl, wsOverrideUrl = WS_URL) {
  await page.addInitScript(
    ({ prof, wsUrl }) => {
      if (wsUrl) {
        window.__HUST_TEST_MP_WS_URL = wsUrl;
      }
      window.localStorage.setItem(
        'bkhn-identity-v1',
        JSON.stringify({ name: prof.name, mssv: prof.mssv }),
      );
      window.localStorage.setItem('bkhn-character-v1', JSON.stringify(prof));
      if (!window.localStorage.getItem('bkhn-reconnect-token-v1')) {
        window.localStorage.setItem('bkhn-session-id', prof.sessionId);
      }
    },
    { prof: profile, wsUrl: wsOverrideUrl },
  );

  await page.goto(roomUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('#enter-campus').click();
  await page.waitForFunction(() => Boolean(window.__bkhn && window.__bkhn.getPos), null, {
    timeout: 30000,
  });

  // Teleport to Ta Quang Buu Library entrance and press E to enter 1F Lobby
  await page.evaluate(() => window.__bkhn.teleport(38, 22, 0));
  await page.waitForFunction(
    () => document.body.innerText.includes('Vào sảnh Thư viện Tạ Quang Bửu'),
    null,
    { timeout: 15000 },
  );
  await page.keyboard.press('KeyE');
  // Fallback dispatch if keydown was dropped while SwiftShader compiled shaders in another context
  await new Promise((r) => setTimeout(r, 900));
  const alreadyInLobby = await page.evaluate(() =>
    Boolean(window.__bkhn && window.__bkhn.isInLibraryLobby && window.__bkhn.isInLibraryLobby()),
  );
  if (!alreadyInLobby) {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('bkhn:interact')));
  }
  await page.waitForFunction(
    () => Boolean(window.__bkhn && window.__bkhn.isInLibraryLobby && window.__bkhn.isInLibraryLobby()),
    null,
    { timeout: 15000 },
  );
}

async function run() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const { chromium } = loadPlaywright();
  const executablePath = resolveBrowserExecutable();
  const staticServer = await startStaticServer();
  const wsServer = await startWsShimServer();

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader'],
    });

    // Include an untrusted ?mpWs= query parameter in roomHsk1Url to prove FIX 1 ignores it in the browser
    const roomHsk1Url = `${BASE_HTTP}/?room=hsk-1&mpWs=${encodeURIComponent('wss://attacker.example/ws')}`;
    const roomHsk2Url = `${BASE_HTTP}/?room=hsk-2`;

    const contextA = await browser.newContext({ viewport: { width: 960, height: 600 } });
    const contextB = await browser.newContext({ viewport: { width: 960, height: 600 } });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const errors = [];
    pageA.on('pageerror', (e) => errors.push(`A: ${String(e)}`));
    pageB.on('pageerror', (e) => errors.push(`B: ${String(e)}`));

    // 1-3. Student A & Student B enter campus & LibraryLobby in room hsk-1
    console.log('[1/12] Student A & Student B entering HUST 3D Campus (room hsk-1) and LibraryLobby...');
    await seedCharacterAndEnterLibrary(
      pageA,
      {
        sessionId: 'pr9-student-a',
        name: 'Nguyễn Hải Anh',
        mssv: '20226001',
        gender: 'female',
        outfit: 'windbreaker-hust',
        hairStyle: 'ponytail',
        skirt: true,
        glasses: true,
        backpack: true,
      },
      roomHsk1Url,
    );
    await seedCharacterAndEnterLibrary(
      pageB,
      {
        sessionId: 'pr9-student-b',
        name: 'Trần Minh Quân',
        mssv: '20226002',
        gender: 'male',
        outfit: 'bomber-red-navy',
        hairStyle: 'layered',
        skirt: false,
        glasses: false,
        backpack: true,
      },
      roomHsk1Url,
    );

    // Wait for both clients to show online status in hsk-1
    await pageA.waitForFunction(
      () => document.body.innerText.includes('hsk-1') && document.body.innerText.includes('Còn trống 4/4 ghế'),
      null,
      { timeout: 10000 },
    );
    await pageB.waitForFunction(
      () => document.body.innerText.includes('hsk-1') && document.body.innerText.includes('Còn trống 4/4 ghế'),
      null,
      { timeout: 10000 },
    );
    console.log('  PASS: Both Student A and Student B connected to room hsk-1 inside LibraryLobby (4/4 seats available).');

    // 4. Student A walks to tqb-1f-t1-s1 and sits via real R3F mouse click
    console.log('[2/12] Student A approaching tqb-1f-t1-s1 and sitting via real R3F mouse click...');
    await pageA.evaluate(() => window.__bkhn.teleport(-2.4, 0.54, Math.PI - 0.65, 0.36));
    await new Promise((r) => setTimeout(r, 450));
    const ptA1 = await pageA.evaluate(() => window.__bkhn.projectSeatToScreen('tqb-1f-t1-s1'));
    assert.ok(ptA1 && ptA1.inFront, 'Expected tqb-1f-t1-s1 in front of Student A camera');
    await pageA.mouse.click(ptA1.x, ptA1.y);

    await pageA.waitForFunction(
      () =>
        Boolean(
          window.__bkhn.getSeatState &&
            window.__bkhn.getSeatState().seated &&
            window.__bkhn.getSeatState().seatId === 'tqb-1f-t1-s1',
        ),
      null,
      { timeout: 6000 },
    );
    console.log('  PASS: Student A seated authoritatively at tqb-1f-t1-s1.');

    // 5. Student A opens StudyPanel, sets subject, adds private task, starts Pomodoro Focus
    console.log('[3/12] Student A starting Pomodoro focus session with subject & private task...');
    await pageA.locator('[data-testid="hud-seated-open-study"]').click();
    await pageA.locator('[data-testid="study-panel"]').waitFor({ state: 'visible', timeout: 5000 });
    await pageA.locator('[data-testid="study-subject-input"]').fill('Giải tích 1 · Bách khoa');
    await pageA.locator('[data-testid="study-task-input"]').fill('Mật: Bài tập riêng của Hải Anh');
    await pageA.locator('[data-testid="study-task-add"]').click();
    await pageA.locator('[data-testid="focus-mode-off"]').click();
    await pageA.locator('[data-testid="focus-auto-hide-checkbox"]').uncheck();
    await pageA.locator('[data-testid="pomodoro-start"]').click();
    await pageA.locator('[data-testid="close-study-panel"]').click();
    await pageA.locator('[data-testid="study-panel"]').waitFor({ state: 'hidden', timeout: 5000 });
    console.log('  PASS: Student A is now studying ("Giải tích 1 · Bách khoa") in focus phase.');

    // 6. Student B sees Student A's 3D seated avatar + overhead badge & StudyPanel presence
    console.log('[4/12] Verifying Student B sees Student A seated in 3D with live Pomodoro presence...');
    await pageB.waitForFunction(
      () => {
        const list = window.__bkhnRemoteStudySeats ? window.__bkhnRemoteStudySeats() : [];
        return (
          list.length === 1 &&
          list[0].seatId === 'tqb-1f-t1-s1' &&
          list[0].status === 'studying' &&
          list[0].badgeLine2.includes('Giải tích 1 · Bách khoa')
        );
      },
      null,
      { timeout: 8000 },
    );

    const remoteOnB = await pageB.evaluate(() => window.__bkhnRemoteStudySeats());
    assert.equal(remoteOnB.length, 1);
    assert.equal(remoteOnB[0].seatId, 'tqb-1f-t1-s1');
    assert.equal(remoteOnB[0].occupantName, 'Nguyễn Hải Anh');
    assert.ok(Math.abs(remoteOnB[0].x - -2.4) < 0.02);
    assert.ok(Math.abs(remoteOnB[0].z - 1.2) < 0.02);
    assert.equal(remoteOnB[0].status, 'studying');
    assert.ok(remoteOnB[0].badgeLine1.includes('Nguyễn Hải Anh · 🔒 Đã có người ngồi'));
    assert.ok(!remoteOnB[0].badgeLine1.includes('20226001'), 'Must never expose MSSV on study badge');
    assert.ok(remoteOnB[0].badgeLine2.includes('🍅 Đang tự học · Giải tích 1 · Bách khoa'));

    // Open StudyPanel on B to verify room presence list & privacy boundary
    await pageB.locator('[data-testid="open-study-panel"]').click();
    await pageB.locator('[data-testid="study-panel"]').waitFor({ state: 'visible', timeout: 5000 });
    const panelBText = await pageB.locator('[data-testid="study-room-presence-section"]').innerText();
    assert.ok(panelBText.includes('Phòng hsk-1'));
    assert.ok(panelBText.includes('Còn trống 3/4 ghế · Đang ngồi 1/4'));
    assert.ok(panelBText.includes('Nguyễn Hải Anh'));
    assert.ok(panelBText.includes('Bàn đọc Tây 1 · Ghế A'));
    assert.ok(panelBText.includes('🍅 Đang tự học · Giải tích 1 · Bách khoa'));
    assert.ok(!panelBText.includes('20226001'), 'Must never leak Student A MSSV in StudyPanel');
    assert.ok(
      !panelBText.includes('Bài tập riêng của Hải Anh'),
      'Must never leak Student A private tasks in StudyPanel',
    );
    await pageB.screenshot({ path: path.join(SHOT_DIR, 'pr9-05-study-panel-presence.png') });
    await pageB.locator('[data-testid="close-study-panel"]').click();
    await pageB.locator('[data-testid="study-panel"]').waitFor({ state: 'hidden', timeout: 5000 });

    // Position Student B at (-0.6, 1.2) (>1.65m from seats and >2.5m from statue so no center E prompt banner overlays the 3D view) looking West at Student A seated at tqb-1f-t1-s1
    await pageB.evaluate(() => window.__bkhn.teleport(-0.6, 1.2, Math.PI / 2, 0.22));
    await new Promise((r) => setTimeout(r, 500));
    await pageB.screenshot({ path: path.join(SHOT_DIR, 'pr9-01-b-sees-a-studying.png') });
    console.log('  PASS: Student B sees Student A seated in 3D + live Pomodoro badge -> pr9-01-b-sees-a-studying.png & pr9-05-study-panel-presence.png');

    // 7. Student B approaches tqb-1f-t1-s1, sees occupied prompt, and clicks A's chair -> rejected
    console.log('[5/12] Student B attempting to claim Student A occupied seat tqb-1f-t1-s1...');
    await pageB.evaluate(() => window.__bkhn.teleport(-2.4, 0.54, Math.PI - 0.65, 0.36));
    await pageB.waitForFunction(
      () => document.body.innerText.includes('Ghế đang có người ngồi — hãy chọn ghế khác'),
      null,
      { timeout: 5000 },
    );
    await new Promise((r) => setTimeout(r, 400));
    const ptBConflict = await pageB.evaluate(() => window.__bkhn.projectSeatToScreen('tqb-1f-t1-s1'));
    assert.ok(ptBConflict && ptBConflict.inFront);
    await pageB.mouse.click(ptBConflict.x, ptBConflict.y);

    await pageB.waitForFunction(
      () => document.body.innerText.includes('Ghế này đang có Nguyễn Hải Anh ngồi học'),
      null,
      { timeout: 5000 },
    );
    const stateBAfterConflict = await pageB.evaluate(() => window.__bkhn.getSeatState());
    assert.equal(stateBAfterConflict.seated, false);
    assert.equal(stateBAfterConflict.seatId, null);
    await pageB.screenshot({ path: path.join(SHOT_DIR, 'pr9-02-b-conflict-rejected.png') });
    console.log('  PASS: Student B seat conflict rejected with Vietnamese toast; Student B remains standing -> pr9-02-b-conflict-rejected.png');

    // 8. Student B walks to tqb-1f-t1-s2 and sits via real R3F mouse click
    console.log('[6/12] Student B walking to tqb-1f-t1-s2 and sitting via real R3F mouse click...');
    await pageB.evaluate(() => window.__bkhn.teleport(-1.9, 2.96, 0.65, 0.36));
    await new Promise((r) => setTimeout(r, 450));
    const ptB2 = await pageB.evaluate(() => window.__bkhn.projectSeatToScreen('tqb-1f-t1-s2'));
    assert.ok(ptB2 && ptB2.inFront);
    await pageB.mouse.click(ptB2.x, ptB2.y);

    await pageB.waitForFunction(
      () =>
        Boolean(
          window.__bkhn.getSeatState &&
            window.__bkhn.getSeatState().seated &&
            window.__bkhn.getSeatState().seatId === 'tqb-1f-t1-s2',
        ),
      null,
      { timeout: 6000 },
    );

    // 9. Student A sees Student B seated at tqb-1f-t1-s2
    console.log('[7/12] Verifying Student A sees Student B seated at tqb-1f-t1-s2...');
    await pageA.waitForFunction(
      () => {
        const list = window.__bkhnRemoteStudySeats ? window.__bkhnRemoteStudySeats() : [];
        return list.length === 1 && list[0].seatId === 'tqb-1f-t1-s2';
      },
      null,
      { timeout: 8000 },
    );
    await new Promise((r) => setTimeout(r, 500));
    await pageA.screenshot({ path: path.join(SHOT_DIR, 'pr9-03-both-seated-table1.png') });
    console.log('  PASS: Both Student A and Student B seated at Table 1 -> pr9-03-both-seated-table1.png');

    // 10. Student B stands up and switches to tqb-1f-t2-s1; tqb-1f-t1-s2 becomes free
    console.log('[8/12] Student B switching from tqb-1f-t1-s2 to tqb-1f-t2-s1...');
    await pageB.locator('[data-testid="hud-stand-up-button"]').click();
    await pageB.waitForFunction(
      () => Boolean(window.__bkhn.getSeatState && !window.__bkhn.getSeatState().seated),
      null,
      { timeout: 5000 },
    );
    await pageB.evaluate(() => window.__bkhn.teleport(1.9, 0.54, Math.PI + 0.65, 0.36));
    await new Promise((r) => setTimeout(r, 450));
    const ptB3 = await pageB.evaluate(() => window.__bkhn.projectSeatToScreen('tqb-1f-t2-s1'));
    assert.ok(ptB3 && ptB3.inFront);
    await pageB.mouse.click(ptB3.x, ptB3.y);

    await pageB.waitForFunction(
      () =>
        Boolean(
          window.__bkhn.getSeatState &&
            window.__bkhn.getSeatState().seated &&
            window.__bkhn.getSeatState().seatId === 'tqb-1f-t2-s1',
        ),
      null,
      { timeout: 6000 },
    );
    await pageA.waitForFunction(
      () => {
        const list = window.__bkhnRemoteStudySeats ? window.__bkhnRemoteStudySeats() : [];
        return list.length === 1 && list[0].seatId === 'tqb-1f-t2-s1';
      },
      null,
      { timeout: 8000 },
    );
    console.log('  PASS: Student B switched to tqb-1f-t2-s1 and tqb-1f-t1-s2 is free.');

    // 11. Trigger DO Hibernation on hsk-1 mid-session and verify seats survive
    console.log('[9/12] Triggering mid-session DO Hibernation on hsk-1 and verifying state preservation...');
    const hibResp = await fetch(`http://127.0.0.1:${WS_PORT}/__hibernate?room=hsk-1`, {
      method: 'POST',
    }).then((r) => r.json());
    assert.equal(hibResp.ok, true);

    // Student B starts break phase after DO hibernation -> Student A must receive updated presence
    await pageB.locator('[data-testid="hud-seated-open-study"]').click();
    await pageB.locator('[data-testid="study-panel"]').waitFor({ state: 'visible', timeout: 5000 });
    await pageB.locator('[data-testid="study-subject-input"]').fill('Ôn từ vựng HSK 3');
    await pageB.locator('[data-testid="pomodoro-start"]').click();
    await pageB.locator('[data-testid="pomodoro-skip"]').click(); // focus -> short-break
    await pageB.locator('[data-testid="close-study-panel"]').click();

    await pageA.waitForFunction(
      () => {
        const list = window.__bkhnRemoteStudySeats ? window.__bkhnRemoteStudySeats() : [];
        return (
          list.length === 1 &&
          list[0].seatId === 'tqb-1f-t2-s1' &&
          list[0].status === 'break' &&
          list[0].badgeLine2.includes('Giải lao · Ôn từ vựng HSK 3')
        );
      },
      null,
      { timeout: 8000 },
    );
    console.log('  PASS: DO Hibernation preserved seats & live break presence broadcast ("☕ Giải lao · Ôn từ vựng HSK 3").');

    // 12. Student A enters Zen 2D while seated and ends Study Session -> releases tqb-1f-t1-s1 on server
    console.log('[10/12] Student A entering Zen 2D and ending Study Session -> verifying server seat release...');
    await pageA.locator('[data-testid="hud-seated-open-study"]').click();
    await pageA.locator('[data-testid="study-panel"]').waitFor({ state: 'visible', timeout: 5000 });
    await pageA.locator('[data-testid="focus-mode-zen-2d"]').click();
    await pageA.locator('[data-testid="zen-2d-view"]').waitFor({ state: 'visible', timeout: 5000 });
    await pageA.locator('[data-testid="zen-end-session"]').click();

    await pageA.waitForFunction(
      () =>
        document.querySelectorAll('canvas').length > 0 &&
        Boolean(window.__bkhn && window.__bkhn.getSeatState && !window.__bkhn.getSeatState().seated),
      null,
      { timeout: 20000 },
    );

    // Student B must see Student A's seat released (0 remote seats on B)
    await pageB.waitForFunction(
      () => {
        const list = window.__bkhnRemoteStudySeats ? window.__bkhnRemoteStudySeats() : [];
        return list.length === 0;
      },
      null,
      { timeout: 8000 },
    );
    console.log('  PASS: Ending Study Session in Zen 2D released tqb-1f-t1-s1 both locally and on the server.');

    // 13. Student B disconnects -> tqb-1f-t2-s1 is released; Student A sees 4/4 seats available
    console.log('[11/12] Closing Student B browser context & verifying disconnect seat release...');
    await contextB.close();
    await pageA.waitForFunction(
      () => {
        const list = window.__bkhnRemoteStudySeats ? window.__bkhnRemoteStudySeats() : [];
        return list.length === 0 && document.body.innerText.includes('Còn trống 4/4 ghế');
      },
      null,
      { timeout: 8000 },
    );
    await pageA.screenshot({ path: path.join(SHOT_DIR, 'pr9-04-after-release-free.png') });
    console.log('  PASS: Student B disconnect released tqb-1f-t2-s1 -> pr9-04-after-release-free.png');

    // 14. Room isolation & Offline fallback verification
    console.log('[12/12] Verifying room isolation (hsk-1 vs hsk-2) and offline fallback...');
    // Student A claims tqb-1f-t1-s1 again in hsk-1
    await pageA.evaluate(() => window.__bkhn.teleport(-2.4, 0.54, 0));
    await pageA.waitForFunction(() => document.body.innerText.includes('Ngồi học'), null, {
      timeout: 5000,
    });
    await pageA.evaluate(() => window.dispatchEvent(new CustomEvent('bkhn:interact')));
    await pageA.waitForFunction(
      () =>
        Boolean(
          window.__bkhn.getSeatState &&
            window.__bkhn.getSeatState().seated &&
            window.__bkhn.getSeatState().seatId === 'tqb-1f-t1-s1',
        ),
      null,
      { timeout: 6000 },
    );

    // Student C in room hsk-2 claims tqb-1f-t1-s1 independently while Student A holds it in hsk-1
    const contextC = await browser.newContext({ viewport: { width: 960, height: 600 } });
    const pageC = await contextC.newPage();
    await seedCharacterAndEnterLibrary(
      pageC,
      {
        sessionId: 'pr9-student-c',
        name: 'Lê Hoàng Nam',
        mssv: '20226003',
        gender: 'male',
        outfit: 'polo-red',
        hairStyle: 'short',
        skirt: false,
        glasses: false,
        backpack: true,
      },
      roomHsk2Url,
    );
    await pageC.waitForFunction(
      () => document.body.innerText.includes('hsk-2') && document.body.innerText.includes('Còn trống 4/4 ghế'),
      null,
      { timeout: 10000 },
    );
    await pageC.evaluate(() => window.__bkhn.teleport(-2.4, 0.54, 0));
    await pageC.waitForFunction(() => document.body.innerText.includes('Ngồi học'), null, {
      timeout: 5000,
    });
    await pageC.keyboard.press('KeyE');
    await new Promise((r) => setTimeout(r, 800));
    const seatedC = await pageC.evaluate(
      () => Boolean(window.__bkhn.getSeatState && window.__bkhn.getSeatState().seated),
    );
    if (!seatedC) {
      await pageC.evaluate(() => window.dispatchEvent(new CustomEvent('bkhn:interact')));
    }
    await pageC.waitForFunction(
      () =>
        Boolean(
          window.__bkhn.getSeatState &&
            window.__bkhn.getSeatState().seated &&
            window.__bkhn.getSeatState().seatId === 'tqb-1f-t1-s1',
        ),
      null,
      { timeout: 6000 },
    );
    await contextC.close();

    const identitySeparation = await pageA.evaluate(() => ({
      publicId: localStorage.getItem('bkhn-session-id'),
      reconnectToken: localStorage.getItem('bkhn-reconnect-token-v1'),
    }));
    assert.ok(
      identitySeparation.publicId &&
        identitySeparation.publicId.startsWith('p-') &&
        identitySeparation.reconnectToken &&
        /^rt-[0-9a-f]{32,64}$/.test(identitySeparation.reconnectToken) &&
        identitySeparation.reconnectToken !== 'pr9-student-a' &&
        identitySeparation.publicId !== 'pr9-student-a' &&
        identitySeparation.publicId !== identitySeparation.reconnectToken,
      `Expected separated publicId vs CSPRNG reconnectToken (never reusing legacy sessionId), got ${JSON.stringify(identitySeparation)}`,
    );

    // Verify FIX 5 on connected Student A: if a reconnect snapshot / remote claim indicates
    // tqb-1f-t1-s1 was claimed by another student while A was seated, A stands up safely
    await pageA.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('bkhn:mp-seat-claimed', {
          detail: {
            occupancy: {
              seatId: 'tqb-1f-t1-s1',
              studyRoomId: 'library-lobby',
              occupantId: 'pr9-student-b',
              occupantName: 'Trần Minh Quân',
              occupiedAtMs: Date.now(),
            },
          },
        }),
      );
    });
    await pageA.waitForFunction(
      () =>
        Boolean(
          window.__bkhn.getSeatState &&
            !window.__bkhn.getSeatState().seated &&
            window.__bkhn.getSeatState().seatId === null,
        ),
      null,
      { timeout: 5000 },
    );
    const standPosAfterConflict = await pageA.evaluate(() => window.__bkhn.getPos());
    assert.ok(
      Math.hypot(standPosAfterConflict.x - -2.4, standPosAfterConflict.z - 0.54) < 0.05,
      `Expected avatar to stand at safe spot (-2.4, 0.54), got (${standPosAfterConflict.x}, ${standPosAfterConflict.z})`,
    );
    await contextA.close();
    console.log('  PASS: Student C in room hsk-2 claimed tqb-1f-t1-s1 while Student A held it in room hsk-1, public identity is separated from reconnectToken, and FIX 5 remote seat takeover stood Student A up safely.');

    // 15. Offline fallback verification
    const contextOffline = await browser.newContext({ viewport: { width: 960, height: 600 } });
    const pageOffline = await contextOffline.newPage();
    const offlineUrl = `${BASE_HTTP}/?room=hsk-1`;
    await seedCharacterAndEnterLibrary(
      pageOffline,
      {
        sessionId: 'pr9-offline-user',
        name: 'Sinh viên Ngoại tuyến',
        mssv: '20226099',
        gender: 'male',
        outfit: 'windbreaker-hust',
        hairStyle: 'short',
        skirt: false,
        glasses: false,
        backpack: true,
      },
      offlineUrl,
      'ws://127.0.0.1:1/ws',
    );
    await pageOffline.waitForFunction(
      () => document.body.innerText.includes('Chế độ ngoại tuyến (chỉ hiển thị cục bộ)'),
      null,
      { timeout: 10000 },
    );
    await pageOffline.evaluate(() => window.__bkhn.teleport(-2.4, 0.54, 0));
    await pageOffline.waitForFunction(() => document.body.innerText.includes('Ngồi học'), null, {
      timeout: 5000,
    });
    await pageOffline.keyboard.press('KeyE');
    await new Promise((r) => setTimeout(r, 800));
    const seatedOff = await pageOffline.evaluate(
      () => Boolean(window.__bkhn.getSeatState && window.__bkhn.getSeatState().seated),
    );
    if (!seatedOff) {
      await pageOffline.evaluate(() => window.dispatchEvent(new CustomEvent('bkhn:interact')));
    }
    await pageOffline.waitForFunction(
      () =>
        Boolean(
          window.__bkhn.getSeatState &&
            window.__bkhn.getSeatState().seated &&
            window.__bkhn.getSeatState().seatId === 'tqb-1f-t1-s1',
        ),
      null,
      { timeout: 5000 },
    );
    await contextOffline.close();
    console.log('  PASS: Offline fallback mode explicitly shown and local seating works.');

    assert.equal(errors.length, 0, `Unexpected page errors: ${errors.join('; ')}`);
    console.log('ALL PR9 MULTIPLAYER STUDY ROOM E2E SMOKE TESTS PASSED!');
  } finally {
    if (browser) await browser.close();
    wsServer.kill();
    staticServer.kill();
  }
}

run().catch((err) => {
  console.error('PR9 MULTIPLAYER STUDY SMOKE TEST FAILED:', err);
  process.exit(1);
});
