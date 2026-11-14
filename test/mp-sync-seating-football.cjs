/**
 * test/mp-sync-seating-football.cjs — Kiểm thử Playwright 2 trình duyệt độc lập
 * cho 2 lỗi đồng bộ trạng thái multiplayer:
 *   A. CLB Board Game KTX: Ngồi vào bàn chơi không cần tạo trận trước ->
 *      người chơi còn lại thấy đúng sĩ số Bàn 1 (0/8 -> 1/8 -> 2/8 -> 1/8),
 *      bảng Sảnh bàn chơi cập nhật ghế & chặn ngồi trùng ghế bg-t1-s0.
 *   B. Sân vận động Bách Khoa (`SVĐ Bách Khoa`): Hai người chơi cùng nhìn thấy
 *      một quả bóng chung duy nhất; P1 sút bóng -> P2 thấy bóng lăn cùng quỹ đạo
 *      và vị trí; P2 reset bóng -> P1 & P2 cùng thấy bóng về tâm sân (132, 80).
 *
 * Run (after `npm run build`): node test/mp-sync-seating-football.cjs
 */
'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');
const SHOT_DIR =
  '/home/bao/.gemini/antigravity-cli/brain/f3119e13-33de-4820-bc0e-636c745568a1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_CORE_PATH,
    path.join(ROOT, 'node_modules/playwright-core'),
    path.join(ROOT, 'node_modules/playwright'),
    '/home/bao/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-linux-x64/node_modules/playwright-core',
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return require(p);
  }
  throw new Error('playwright-core not found');
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function startOutServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const cleanUrl = (req.url || '/').split('?')[0];
      let filePath = path.join(OUT_DIR, cleanUrl === '/' ? 'index.html' : cleanUrl);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (!fs.existsSync(filePath)) {
        filePath = path.join(OUT_DIR, 'index.html');
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

async function startWsShim(port) {
  const proc = spawn(process.execPath, [path.join(ROOT, 'test/ws-shim/server.js'), String(port)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdoutBuf = '';
  let stderrBuf = '';
  proc.stdout.on('data', (d) => {
    stdoutBuf += d.toString();
  });
  proc.stderr.on('data', (d) => {
    stderrBuf += d.toString();
  });

  const healthUrl = `http://127.0.0.1:${port}/health`;
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (proc.exitCode !== null) {
      throw new Error(
        `ws-shim exited early (${proc.exitCode}): stdout=${stdoutBuf} stderr=${stderrBuf}`,
      );
    }
    try {
      const res = await fetch(healthUrl);
      if (res.ok) {
        return { proc, wsBaseUrl: `ws://127.0.0.1:${port}` };
      }
    } catch {
      // wait for bind
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  proc.kill('SIGKILL');
  throw new Error(`Timed out waiting for ws-shim health: ${stdoutBuf} ${stderrBuf}`);
}

async function setupPlayer(chromium, launchOpts, user, shimWsBaseUrl) {
  const browser = await chromium.launch(launchOpts);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    hasTouch: true,
  });

  await context.addInitScript(
    ({ name, mssv, gender, outfit, hairStyle, wsUrl }) => {
      window.__HUST_TEST_MP_WS_URL = wsUrl;
      window.localStorage.setItem('bkhn-identity-v1', JSON.stringify({ name, mssv }));
      window.localStorage.setItem(
        'bkhn-character-v1',
        JSON.stringify({
          name,
          mssv,
          gender,
          hairStyle,
          outfit,
          skirt: gender === 'female',
          backpack: true,
          glasses: false,
          lanyard: true,
        }),
      );
    },
    { ...user, wsUrl: `${shimWsBaseUrl}/ws` },
  );

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(`${user.label} pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`${user.label} console.error: ${msg.text()}`);
    }
  });

  return { browser, context, page, errors };
}

async function enterCampus(page, outUrl) {
  await page.goto(outUrl, { waitUntil: 'domcontentloaded' });
  const enterBtn = page.locator('#enter-campus');
  await enterBtn.waitFor({ state: 'visible', timeout: 45000 });
  await enterBtn.click({ timeout: 45000 });
  await page.waitForFunction(
    () => Boolean(window.__bkhn?.enterBoardGameClub && window.__bkhnFootball?.getBall),
    null,
    { timeout: 45000 },
  );
}

async function saveShot(page, name) {
  try {
    if (fs.existsSync(SHOT_DIR)) {
      await page.screenshot({ path: path.join(SHOT_DIR, name) });
    }
  } catch {
    // ignore in CI
  }
}

async function main() {
  if (!fs.existsSync(path.join(OUT_DIR, 'index.html'))) {
    throw new Error('Missing out/index.html — run npm run build before mp-sync-seating-football.cjs');
  }

  const { chromium } = loadPlaywright();
  const shimPort = await getFreePort();
  const shim = await startWsShim(shimPort);
  const { server: outServer, url: outUrl } = await startOutServer();

  const browsers = [];
  try {
    const launchOpts = {
      headless: true,
      executablePath: fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
      ],
    };

    const p1 = await setupPlayer(
      chromium,
      launchOpts,
      {
        label: 'P1',
        name: 'Sinh viên An',
        mssv: '20229201',
        gender: 'male',
        outfit: 'windbreaker-hust',
        hairStyle: 'short',
      },
      shim.wsBaseUrl,
    );
    browsers.push(p1.browser);

    const p2 = await setupPlayer(
      chromium,
      launchOpts,
      {
        label: 'P2',
        name: 'Sinh viên Bình',
        mssv: '20229202',
        gender: 'female',
        outfit: 'polo-red',
        hairStyle: 'ponytail',
      },
      shim.wsBaseUrl,
    );
    browsers.push(p2.browser);

    console.log('[MP Sync E2E] 1. Entering campus with 2 independent browsers...');
    await Promise.all([enterCampus(p1.page, outUrl), enterCampus(p2.page, outUrl)]);

    // Đợi hai trình duyệt kết nối cùng phòng WS và nhìn thấy nhau (sĩ số >= 2)
    try {
      await Promise.all([
        p1.page.waitForFunction(
          () => {
            const snap = window.__bkhnMp?.();
            return Boolean(snap && snap.status === 'online' && snap.count >= 2);
          },
          null,
          { timeout: 25000 },
        ),
        p2.page.waitForFunction(
          () => {
            const snap = window.__bkhnMp?.();
            return Boolean(snap && snap.status === 'online' && snap.count >= 2);
          },
          null,
          { timeout: 25000 },
        ),
      ]);
    } catch (err) {
      const [d1, d2] = await Promise.all([
        p1.page.evaluate(() => ({
          chip: document.querySelector('[data-testid="mp-chip"]')?.textContent ?? null,
          mp: window.__bkhnMp?.() ?? null,
          wsOverride: window.__HUST_TEST_MP_WS_URL ?? null,
        })),
        p2.page.evaluate(() => ({
          chip: document.querySelector('[data-testid="mp-chip"]')?.textContent ?? null,
          mp: window.__bkhnMp?.() ?? null,
          wsOverride: window.__HUST_TEST_MP_WS_URL ?? null,
        })),
      ]);
      console.error('DIAG MP SYNC TIMEOUT:', JSON.stringify({ d1, d2 }, null, 2));
      throw err;
    }

    // -----------------------------------------------------------------------
    // A. CLB Board Game KTX — Đồng bộ ngồi ghế & sĩ số Bàn 1
    // -----------------------------------------------------------------------
    console.log('[MP Sync E2E] 2. Scenario A: Board Game Club seating & table count sync...');
    await p1.page.evaluate(() => window.__bkhn.enterBoardGameClub());
    await p2.page.evaluate(() => window.__bkhn.enterBoardGameClub());
    await Promise.all([
      p1.page.waitForSelector('[data-testid="boardgame-club-hud"]', { timeout: 15000 }),
      p2.page.waitForSelector('[data-testid="boardgame-club-hud"]', { timeout: 15000 }),
    ]);

    // P1 ngồi vào Bàn 1 (mà không cần tạo trận online)
    await p1.page.locator('[data-testid="bg-toggle-lobby-btn"]').click();
    await p1.page.waitForSelector('[data-testid="boardgame-lobby-modal"]', { timeout: 10000 });
    await p1.page.locator('[data-testid="bg-sit-table-1-btn"]').click();
    await p1.page.waitForFunction(
      () => window.__bkhn.getBoardGameSeatState().seatId === 'bg-t1-s0',
      null,
      { timeout: 10000 },
    );

    // P2 phải lập tức thấy Bàn 1: 1/8 trên HUD CLB Board Game
    await p2.page.waitForFunction(
      () => {
        const hud = document.querySelector('[data-testid="boardgame-club-hud"]');
        return Boolean(hud && hud.textContent && hud.textContent.includes('Bàn 1: 1/8'));
      },
      null,
      { timeout: 15000 },
    );
    console.log('[MP Sync E2E]    P2 HUD updated to Bàn 1: 1/8 after P1 sat.');

    // P2 mở Sảnh & Mã mời -> phải thấy "1/8 ghế" & nút ngồi tự động né bg-t1-s0 để vào bg-t1-s1
    await p2.page.locator('[data-testid="bg-toggle-lobby-btn"]').click();
    await p2.page.waitForSelector('[data-testid="boardgame-lobby-modal"]', { timeout: 10000 });
    await p2.page.waitForFunction(
      () => {
        const modal = document.querySelector('[data-testid="boardgame-lobby-modal"]');
        return Boolean(
          modal &&
            modal.textContent &&
            modal.textContent.includes('1/8 ghế') &&
            modal.textContent.includes('Đang có 1 sinh viên tại bàn'),
        );
      },
      null,
      { timeout: 10000 },
    );

    await p2.page.locator('[data-testid="bg-sit-table-1-btn"]').click();
    const p2Seat = await p2.page.evaluate(() => window.__bkhn.getBoardGameSeatState());
    assert.equal(
      p2Seat.seatId,
      'bg-t1-s1',
      `P2 must skip occupied bg-t1-s0 and take bg-t1-s1, got ${p2Seat.seatId}`,
    );

    // Cả P1 và P2 phải đều thấy Bàn 1: 2/8 trên HUD CLB Board Game
    await Promise.all([
      p1.page.waitForFunction(
        () => {
          const hud = document.querySelector('[data-testid="boardgame-club-hud"]');
          return Boolean(hud && hud.textContent && hud.textContent.includes('Bàn 1: 2/8'));
        },
        null,
        { timeout: 15000 },
      ),
      p2.page.waitForFunction(
        () => {
          const hud = document.querySelector('[data-testid="boardgame-club-hud"]');
          return Boolean(hud && hud.textContent && hud.textContent.includes('Bàn 1: 2/8'));
        },
        null,
        { timeout: 15000 },
      ),
    ]);
    await p2.page.waitForTimeout(350);
    await saveShot(p2.page, 'mp-sync-01-boardgame-2p-seated.png');
    console.log('[MP Sync E2E]    Both P1 & P2 HUDs show Bàn 1: 2/8; P2 took bg-t1-s1.');

    // P1 đứng dậy -> P2 HUD phải giảm về 1/8
    await p1.page.locator('[data-testid="bg-stand-up-btn"]').click();
    await p2.page.waitForFunction(
      () => {
        const hud = document.querySelector('[data-testid="boardgame-club-hud"]');
        return Boolean(hud && hud.textContent && hud.textContent.includes('Bàn 1: 1/8'));
      },
      null,
      { timeout: 15000 },
    );

    // P2 đứng dậy để cả hai thoát CLB Board Game sạch sẽ
    await p2.page.locator('[data-testid="bg-stand-up-btn"]').click();
    await p1.page.locator('[data-testid="bg-exit-lounge-btn"]').click();
    await p2.page.locator('[data-testid="bg-exit-lounge-btn"]').click();
    await Promise.all([
      p1.page.waitForFunction(() => !document.querySelector('[data-testid="boardgame-club-hud"]'), null, {
        timeout: 15000,
      }),
      p2.page.waitForFunction(() => !document.querySelector('[data-testid="boardgame-club-hud"]'), null, {
        timeout: 15000,
      }),
    ]);

    // -----------------------------------------------------------------------
    // B. SVĐ Bách Khoa — Đồng bộ 1 quả bóng chung giữa P1 & P2
    // -----------------------------------------------------------------------
    console.log('[MP Sync E2E] 3. Scenario B: Football Stadium shared ball sync...');
    await p1.page.evaluate(() => window.__bkhn.teleport(130.2, 80, -Math.PI / 2, 0.22));
    await p2.page.evaluate(() => window.__bkhn.teleport(130.0, 82.6, -Math.PI / 2, 0.24));

    // Nhấn nhẹ phím D để telemetry scene='campus' + facing được cập nhật ngay lên Worker/shim
    await p1.page.keyboard.down('KeyD');
    await p1.page.waitForTimeout(90);
    await p1.page.keyboard.up('KeyD');
    await p2.page.waitForTimeout(350);

    const ballBefore1 = await p1.page.evaluate(() => window.__bkhnFootball.getBall());
    const ballBefore2 = await p2.page.evaluate(() => window.__bkhnFootball.getBall());
    assert.ok(
      Math.hypot(ballBefore1.x - 132, ballBefore1.z - 80) < 0.2 &&
        Math.hypot(ballBefore2.x - 132, ballBefore2.z - 80) < 0.2,
      `Initial ball must be at center (132, 80), got P1=${JSON.stringify(ballBefore1)} P2=${JSON.stringify(ballBefore2)}`,
    );

    // P1 sút bóng gần chân (kick(false))
    const kickedOk = await p1.page.evaluate(() => window.__bkhnFootball.kick(false));
    assert.equal(kickedOk, true, 'P1 kick(false) near center spot must succeed');

    // Cả P1 và P2 phải thấy bóng bay sang phía Đông (x > 134.2) và khớp tọa độ nhau
    await Promise.all([
      p1.page.waitForFunction(() => window.__bkhnFootball.getBall().x > 134.2, null, {
        timeout: 10000,
      }),
      p2.page.waitForFunction(() => window.__bkhnFootball.getBall().x > 134.2, null, {
        timeout: 10000,
      }),
    ]);

    const [ballMid1, ballMid2] = await Promise.all([
      p1.page.evaluate(() => window.__bkhnFootball.getBall()),
      p2.page.evaluate(() => window.__bkhnFootball.getBall()),
    ]);
    const syncDelta = Math.hypot(ballMid1.x - ballMid2.x, ballMid1.z - ballMid2.z);
    assert.ok(
      syncDelta < 1.2,
      `Synced ball positions between P1 & P2 diverged too much (${syncDelta.toFixed(2)}m): P1=${JSON.stringify(ballMid1)}, P2=${JSON.stringify(ballMid2)}`,
    );
    await saveShot(p2.page, 'mp-sync-02-football-shared-ball.png');
    console.log(
      `[MP Sync E2E]    P1 ball=(${ballMid1.x.toFixed(2)}, ${ballMid1.z.toFixed(2)}), P2 ball=(${ballMid2.x.toFixed(2)}, ${ballMid2.z.toFixed(2)}), delta=${syncDelta.toFixed(2)}m.`,
    );

    // P2 đặt bóng lại giữa sân -> P1 cũng phải thấy bóng quay về (132, 80)
    await p2.page.waitForTimeout(450);
    await p2.page.evaluate(() => window.__bkhnFootball.reset());
    await Promise.all([
      p1.page.waitForFunction(
        () => {
          const b = window.__bkhnFootball.getBall();
          return Math.hypot(b.x - 132, b.z - 80) < 0.25;
        },
        null,
        { timeout: 10000 },
      ),
      p2.page.waitForFunction(
        () => {
          const b = window.__bkhnFootball.getBall();
          return Math.hypot(b.x - 132, b.z - 80) < 0.25;
        },
        null,
        { timeout: 10000 },
      ),
    ]);

    const allErrors = [...p1.errors, ...p2.errors];
    assert.equal(allErrors.length, 0, `Unexpected browser errors:\n${allErrors.join('\n')}`);
    console.log('PASS: 2-browser Playwright E2E sync verified for Board Game Club & Football Stadium!');
  } finally {
    await Promise.allSettled(browsers.map((b) => b.close()));
    outServer.close();
    if (shim.proc.exitCode === null) {
      shim.proc.kill('SIGTERM');
    }
  }
}

main().catch((err) => {
  console.error('MP SYNC E2E FAILED:', err);
  process.exit(1);
});
