/**
 * test/boardgame-e2e.cjs — Kiểm thử Playwright đa ngữ cảnh End-to-End cho BG4:
 *   1. Khởi chạy static out/ + local ws-shim (HskRoom + BoardGameRoom SQLite DO thật).
 *   2. 4 trình duyệt độc lập: 3 Desktop (1280x800) + 1 Mobile (390x844, hasTouch).
 *   3. Gắn MSSV test riêng cho từng trình duyệt (`20229101`..`20229104`) và audit
 *      mọi WS frame `framereceived`:
 *      - Tuyệt đối KHÔNG xuất hiện MSSV hay `reconnectToken` của người khác.
 *      - Trong lúc `PLAYING`, không bao giờ rò rỉ vai bí mật chưa lật / bài trên tay người khác.
 *   4. Host tạo bàn 1, kiểm tra nút sao chép link `?bgInvite=CODE`; Players 2 & 3 nhập mã;
 *      Mobile Player 4 mở thẳng `/?bgInvite=CODE` -> tự động vào CLB + phòng chờ -> chụp `bg4-01-lobby-4p.png`.
 *   5. Cả 4 người sẵn sàng -> Host bắt đầu trận -> kiểm tra RoleCard, nút tắt/bật âm thanh,
 *      gửi emote & hiện toast -> chụp `bg4-02-gameboard-desktop.png` + `bg4-03-gameboard-mobile.png`
 *      (kiểm tra Mobile không tràn ngang `scrollWidth <= 390`).
 *   6. F5 (`page.reload()`) giữa ván ở Player 2 -> tự động khôi phục đúng bàn & vai bí mật.
 *   7. Đánh lần lượt các lượt trên UI 2D cho tới khi `FINISHED` -> kiểm tra `MatchPostcard`
 *      (`1200x675` PNG Data URL, zero MSSV) -> chụp `bg4-04-match-result-postcard.png`.
 *   8. Thoát ván đấu & rời CLB Board Game quay lại sân KTX -> chụp `bg4-05-exit-ktx.png`.
 *
 * Run (after `npm run build`): node test/boardgame-e2e.cjs
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
        return {
          proc,
          httpBaseUrl: `http://127.0.0.1:${port}`,
          wsBaseUrl: `ws://127.0.0.1:${port}`,
        };
      }
    } catch {
      // wait for port bind
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  proc.kill('SIGKILL');
  throw new Error(`Timed out waiting for ws-shim health: ${stdoutBuf} ${stderrBuf}`);
}

const TEST_USERS = [
  { label: 'P1', name: 'Sinh viên An', mssv: '20229101', viewport: { width: 1280, height: 800 }, mobile: false },
  { label: 'P2', name: 'Sinh viên Bình', mssv: '20229102', viewport: { width: 1040, height: 640 }, mobile: false },
  { label: 'P3', name: 'Sinh viên Chi', mssv: '20229103', viewport: { width: 1040, height: 640 }, mobile: false },
  { label: 'P4', name: 'Sinh viên Dung', mssv: '20229104', viewport: { width: 390, height: 844 }, mobile: true },
];

const ALL_TEST_MSSVS = TEST_USERS.map((u) => u.mssv);

async function setupPlayerContext(chromium, launchOpts, user, shimWsBaseUrl) {
  const browser = await chromium.launch(launchOpts);
  const context = await browser.newContext(
    user.mobile
      ? { viewport: user.viewport, hasTouch: true, isMobile: true }
      : { viewport: user.viewport, hasTouch: true },
  );

  await context.addInitScript(
    ({ name, mssv, wsUrl }) => {
      window.__HUST_TEST_MP_WS_URL = wsUrl;
      if (!window.localStorage.getItem('bkhn-identity-v1')) {
        window.localStorage.setItem('bkhn-identity-v1', JSON.stringify({ name, mssv }));
      }
      if (!window.localStorage.getItem('bkhn-character-v1')) {
        window.localStorage.setItem(
          'bkhn-character-v1',
          JSON.stringify({
            name,
            mssv,
            gender: 'male',
            hairStyle: 'short',
            outfit: 'windbreaker-hust',
            skirt: false,
            backpack: true,
            glasses: false,
            lanyard: true,
          }),
        );
      }
    },
    { name: user.name, mssv: user.mssv, wsUrl: `${shimWsBaseUrl}/ws` },
  );

  const page = await context.newPage();
  const audit = {
    selfPlayerId: null,
    selfReconnectToken: null,
    wsFramesChecked: 0,
    rawFrames: [],
    auditErrors: [],
    pageErrors: [],
    consoleErrors: [],
  };

  page.on('pageerror', (err) => audit.pageErrors.push(`${user.label}: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      audit.consoleErrors.push(`${user.label}: ${msg.text()}`);
    }
  });

  page.on('websocket', (ws) => {
    if (!ws.url().includes('/ws/boardgame')) return;
    ws.on('framereceived', ({ payload }) => {
      const text = typeof payload === 'string' ? payload : String(payload);
      audit.wsFramesChecked += 1;
      audit.rawFrames.push(text);

      for (const mssv of ALL_TEST_MSSVS) {
        if (text.includes(mssv)) {
          audit.auditErrors.push(`${user.label}: MSSV ${mssv} leaked in WS frame!`);
        }
      }

      let msg;
      try {
        msg = JSON.parse(text);
      } catch {
        return;
      }

      if (msg.type === 'BG_AUTH_ISSUED') {
        audit.selfPlayerId = msg.playerId || audit.selfPlayerId;
        audit.selfReconnectToken = msg.reconnectToken || audit.selfReconnectToken;
      }

      if (msg.type === 'BG_STATE_SYNC' && msg.publicGame) {
        const pg = msg.publicGame;
        if (pg.turnPhase !== 'ENDED' && pg.finalReveal) {
          audit.auditErrors.push(`${user.label}: finalReveal leaked before ENDED!`);
        }
        if (msg.privateView && audit.selfPlayerId && msg.privateView.playerId !== audit.selfPlayerId) {
          audit.auditErrors.push(
            `${user.label}: privateView belongs to ${msg.privateView.playerId}, expected ${audit.selfPlayerId}`,
          );
        }
        for (const pl of pg.players || []) {
          if (pl.playerId !== audit.selfPlayerId && !pl.revealedRoleId) {
            const rawPlayer = JSON.stringify(pl);
            if (rawPlayer.includes('secretGoalText') || rawPlayer.includes('"hand"')) {
              audit.auditErrors.push(
                `${user.label}: hidden secretGoal/hand exposed for ${pl.playerId}`,
              );
            }
          }
        }
      }
    });
  });

  return { browser, context, page, audit };
}

async function enterCampusAndWaitHook(page, targetUrl, diagAudit) {
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  const enterBtn = page.locator('#enter-campus');
  await enterBtn.waitFor({ state: 'visible', timeout: 45000 });
  await enterBtn.click({ timeout: 45000 });
  try {
    await page.waitForFunction(() => Boolean(window.__bkhn && window.__bkhn.enterBoardGameClub), null, {
      timeout: 45000,
    });
  } catch (err) {
    const diag = await page.evaluate(() => ({
      url: window.location.href,
      hasBkhn: Boolean(window.__bkhn),
      bkhnKeys: window.__bkhn ? Object.keys(window.__bkhn) : [],
      hasEnterBtn: Boolean(document.querySelector('#enter-campus')),
      bodyText: document.body.innerText.slice(0, 400),
    }));
    console.error('DIAG enterCampusAndWaitHook:', JSON.stringify(diag), 'AUDIT:', JSON.stringify(diagAudit));
    throw err;
  }
}

async function playFirstValidStepOnPage(page) {
  const panel = page.locator('[data-testid="bg-action-panel"]');
  if ((await panel.count()) === 0) return false;
  if (!(await panel.isVisible().catch(() => false))) return false;

  const tryClick = async (selector) => {
    const loc = page.locator(selector).first();
    if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
      const disabled = await loc.isDisabled().catch(() => true);
      if (!disabled) {
        await loc.click();
        return true;
      }
    }
    return false;
  };

  // Pha 1: MOVE -> ưu tiên Phòng Phát Thanh ('radio') để sớm kích hoạt ADJUST_TRACK
  if (await tryClick('[data-testid="bg-move-radio"]')) return true;
  if (await tryClick('[data-testid^="bg-move-"]')) return true;

  // Pha 2: DRAW_OR_EXPLORE -> ưu tiên +1 Tín hiệu tại Phòng Phát Thanh, fallback Rút thẻ
  if (await tryClick('[data-testid="bg-adjust-signal"]')) return true;
  if (await tryClick('[data-testid="bg-draw-clue"]')) return true;
  if (await tryClick('[data-testid="bg-draw-event"]')) return true;
  if (await tryClick('[data-testid="bg-draw-tactic"]')) return true;

  // Pha 3: TACTICAL_ACTION -> Kết thúc lượt
  if (await tryClick('[data-testid="bg-end-turn-btn"]')) return true;

  return false;
}

async function main() {
  if (!fs.existsSync(path.join(OUT_DIR, 'index.html'))) {
    throw new Error('Missing out/index.html — run npm run build before boardgame-e2e.cjs');
  }

  const { chromium } = loadPlaywright();
  const shimPort = await getFreePort();
  const shim = await startWsShim(shimPort);
  const { server: outServer, url: outUrl } = await startOutServer();

  const browsers = [];
  const contexts = [];
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

    const players = [];
    for (const user of TEST_USERS) {
      const p = await setupPlayerContext(chromium, launchOpts, user, shim.wsBaseUrl);
      browsers.push(p.browser);
      contexts.push(p.context);
      players.push({ user, ...p });
    }
    const [p1, p2, p3, p4] = players;

    // 1. P1 (Host Desktop) vào campus -> CLB -> ngồi Bàn 1 -> Tạo bàn chơi & lấy mã mời
    console.log('[BG4 E2E] Step 1: P1 creating room...');
    await enterCampusAndWaitHook(p1.page, outUrl, p1.audit);
    await p1.page.evaluate(() => window.__bkhn.enterBoardGameClub());
    await p1.page.waitForSelector('[data-testid="boardgame-club-hud"]', { timeout: 20000 });
    await p1.page.locator('[data-testid="bg-toggle-lobby-btn"]').click();
    await p1.page.waitForSelector('[data-testid="boardgame-lobby-modal"]', { timeout: 20000 });
    await p1.page.locator('[data-testid="bg-sit-table-1-btn"]').click();
    // Sau khi ngồi ghế, mở lại Sảnh bàn chơi để tạo trận ở đúng bàn đang ngồi
    await p1.page.locator('[data-testid="bg-toggle-lobby-btn"]').click();
    await p1.page.waitForSelector('[data-testid="bg-create-match-btn"]', { timeout: 20000 });
    await p1.page.locator('[data-testid="bg-create-match-btn"]').click();
    await p1.page.waitForSelector('[data-testid="bg-invite-code"]', { timeout: 20000 });

    const inviteCode = (await p1.page.locator('[data-testid="bg-invite-code"]').innerText()).trim();
    assert.match(inviteCode, /^[A-Z0-9]{6}$/, `Mã mời không hợp lệ: "${inviteCode}"`);
    await p1.page.locator('[data-testid="bg-copy-invite-link-btn"]').click();

    // 2. P2 & P3 vào CLB và nhập mã mời
    console.log(`[BG4 E2E] Step 2: P2 & P3 joining invite ${inviteCode}...`);
    for (const peer of [p2, p3]) {
      await peer.page.bringToFront();
      await enterCampusAndWaitHook(peer.page, outUrl, peer.audit);
      await peer.page.evaluate(() => window.__bkhn.enterBoardGameClub());
      await peer.page.waitForSelector('[data-testid="boardgame-club-hud"]', { timeout: 45000 });
      await peer.page.locator('[data-testid="bg-toggle-lobby-btn"]').click();
      await peer.page.waitForSelector('[data-testid="bg-join-code-input"]', { timeout: 30000 });
      await peer.page.locator('[data-testid="bg-join-code-input"]').fill(inviteCode);
      await peer.page.locator('[data-testid="bg-join-code-btn"]').click();
      await peer.page.waitForSelector('[data-testid="bg-ready-toggle-btn"]', { timeout: 30000 });
    }

    // 3. P4 (Mobile 390x844) mở trực tiếp `/?bgInvite=CODE` -> auto-enter CLB + auto-join phòng
    console.log('[BG4 E2E] Step 3: P4 mobile opening ?bgInvite URL...');
    await p4.page.bringToFront();
    await p4.page.goto(`${outUrl}/?bgInvite=${inviteCode}`, { waitUntil: 'domcontentloaded' });
    const p4EnterBtn = p4.page.locator('#enter-campus');
    await p4EnterBtn.waitFor({ state: 'visible', timeout: 45000 });
    await p4EnterBtn.click({ timeout: 45000 });
    try {
      await p4.page.waitForSelector('[data-testid="boardgame-club-hud"]', { timeout: 45000 });
    } catch (err) {
      const diag4 = await p4.page.evaluate(() => ({
        url: window.location.href,
        hasHud: Boolean(document.querySelector('[data-testid="boardgame-club-hud"]')),
        isInClub: window.__bkhn?.isInBoardGameClub?.(),
        pos: window.__bkhn?.getPos?.(),
        bodyText: document.body.innerText.slice(0, 500),
      }));
      console.error('DIAG Step 3 P4:', JSON.stringify(diag4), 'AUDIT P4:', JSON.stringify(p4.audit));
      throw err;
    }
    await p4.page.waitForSelector('[data-testid="bg-ready-toggle-btn"]', { timeout: 45000 });
    const p4CleanedUrl = await p4.page.evaluate(() => window.location.search);
    assert.equal(p4CleanedUrl.includes('bgInvite='), false, 'URL phải được làm sạch sau khi đọc ?bgInvite=');

    // Chờ P1 thấy đủ 4/8 ghế trong phòng chờ
    await p1.page.bringToFront();
    await p1.page.waitForFunction(
      () =>
        document
          .querySelector('[data-testid="boardgame-lobby-modal"]')
          ?.textContent?.includes('4/8 ghế'),
      null,
      { timeout: 25000 },
    );
    await p1.page.waitForTimeout(350);
    await p1.page.screenshot({ path: path.join(SHOT_DIR, 'bg4-01-lobby-4p.png') });

    // 4. P2, P3, P4 bấm Sẵn sàng -> Host bấm Bắt đầu ván đấu
    console.log('[BG4 E2E] Step 4: Readying up and starting 4-player match...');
    for (const peer of [p2, p3, p4]) {
      await peer.page.bringToFront();
      await peer.page.locator('[data-testid="bg-ready-toggle-btn"]').click();
    }
    await p1.page.bringToFront();
    await p1.page.waitForFunction(
      () => {
        const btn = document.querySelector('[data-testid="bg-start-match-btn"]');
        return Boolean(btn && !btn.hasAttribute('disabled'));
      },
      null,
      { timeout: 30000 },
    );
    await p1.page.locator('[data-testid="bg-start-match-btn"]').click();

    // Tất cả 4 người vào màn hình bàn chơi 2D
    for (const p of players) {
      await p.page.bringToFront();
      await p.page.waitForSelector('[data-testid="boardgame-2d-board"]', { timeout: 30000 });
      if (!p.user.mobile) {
        await p.page.waitForSelector('[data-testid="bg-role-card"]', { timeout: 25000 });
      }
    }
    // Trên Mobile 390x844 (P4), kiểm tra chuyển tab "Vai bí mật" rồi quay lại tab "Bàn & Lượt"
    await p4.page.bringToFront();
    await p4.page.locator('button:has-text("Vai bí mật")').click();
    await p4.page.waitForSelector('[data-testid="bg-role-card-secret"]', { timeout: 20000 });
    await p4.page.locator('button:has-text("Bàn & Lượt")').click();
    await p4.page.waitForSelector('[data-testid="bg-loc-lobby"]', { timeout: 20000 });

    const p2RoleBeforeReload = (
      await p2.page.locator('[data-testid="bg-role-card-secret"] h3').innerText()
    ).trim();
    assert.ok(p2RoleBeforeReload.length > 0, 'P2 phải thấy thẻ vai bí mật của mình');

    // Test âm thanh toggle + biểu cảm toast real-time
    await p1.page.bringToFront();
    await p1.page.locator('[data-testid="bg-sound-toggle-btn"]').click();
    await p1.page.locator('[data-testid="bg-sound-toggle-btn"]').click();
    await p1.page.locator('[data-testid="bg-emote-wave"]').click();
    await p2.page.waitForSelector('[data-testid="bg-emote-toast"]', { timeout: 15000 });

    await p1.page.bringToFront();
    await p1.page.waitForTimeout(300);
    await p1.page.screenshot({ path: path.join(SHOT_DIR, 'bg4-02-gameboard-desktop.png') });

    // Kiểm tra Mobile 390x844 không tràn ngang
    await p4.page.bringToFront();
    const mobileOverflow = await p4.page.evaluate(() => {
      const board = document.querySelector('[data-testid="boardgame-2d-board"]');
      return {
        docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        boardOverflow: board ? board.scrollWidth > board.clientWidth + 1 : false,
        scrollW: document.documentElement.scrollWidth,
        innerW: window.innerWidth,
      };
    });
    assert.equal(
      mobileOverflow.docOverflow || mobileOverflow.boardOverflow,
      false,
      `Mobile 390x844 bị tràn ngang: ${JSON.stringify(mobileOverflow)}`,
    );
    await p4.page.screenshot({ path: path.join(SHOT_DIR, 'bg4-03-gameboard-mobile.png') });

    // 5. F5 (page.reload) giữa trận ở P2 -> khôi phục tự động đúng bàn & đúng vai bí mật
    console.log('[BG4 E2E] Step 5: Testing mid-match F5 reconnect on P2...');
    await p2.page.bringToFront();
    await p2.page.reload({ waitUntil: 'domcontentloaded' });
    await p2.page.locator('#enter-campus').waitFor({ state: 'visible', timeout: 45000 });
    await p2.page.locator('#enter-campus').click();
    await p2.page.waitForSelector('[data-testid="boardgame-2d-board"]', { timeout: 45000 });
    await p2.page.waitForSelector('[data-testid="bg-role-card-secret"]', { timeout: 30000 });
    const p2RoleAfterReload = (
      await p2.page.locator('[data-testid="bg-role-card-secret"] h3').innerText()
    ).trim();
    assert.equal(
      p2RoleAfterReload,
      p2RoleBeforeReload,
      'Sau F5 giữa trận, P2 phải nhận lại đúng nguyên vai bí mật của mình',
    );

    // 6. Chơi hết ván tới FINISHED bằng điều khiển UI thật trên cả 4 trình duyệt
    console.log('[BG4 E2E] Step 6: Playing turns to FINISHED...');
    let finished = false;
    for (let step = 0; step < 140; step++) {
      if (
        await p1.page
          .locator('[data-testid="bg-match-result-modal"]')
          .isVisible()
          .catch(() => false)
      ) {
        finished = true;
        break;
      }
      let acted = false;
      for (const p of players) {
        if (await playFirstValidStepOnPage(p.page)) {
          acted = true;
          break;
        }
      }
      await p1.page.waitForTimeout(acted ? 140 : 120);
    }
    assert.equal(finished, true, 'Trận đấu 4 người phải kết thúc FINISHED trong giới hạn bước');

    // Chờ MatchResult & MatchPostcard trên cả 4 màn hình
    for (const p of players) {
      await p.page.waitForSelector('[data-testid="bg-match-result-modal"]', { timeout: 20000 });
    }
    await p1.page.waitForSelector('[data-testid="bg-match-postcard-img"]', { timeout: 20000 });
    await p1.page.waitForSelector('[data-testid="bg-download-postcard-btn"]', { timeout: 20000 });

    const postcardMeta = await p1.page.evaluate(() => {
      const img = document.querySelector('[data-testid="bg-match-postcard-img"]');
      const link = document.querySelector('[data-testid="bg-download-postcard-btn"]');
      const modalText =
        document.querySelector('[data-testid="bg-match-result-modal"]')?.innerText || '';
      return {
        imgSrcPrefix: img ? img.getAttribute('src')?.slice(0, 22) : null,
        naturalWidth: img ? img.naturalWidth : 0,
        naturalHeight: img ? img.naturalHeight : 0,
        hrefPrefix: link ? link.getAttribute('href')?.slice(0, 22) : null,
        downloadAttr: link ? link.getAttribute('download') : null,
        modalText,
      };
    });

    assert.equal(postcardMeta.imgSrcPrefix, 'data:image/png;base64,', 'Postcard phải là PNG Data URL');
    assert.equal(postcardMeta.naturalWidth, 1200, 'MatchPostcard width phải là 1200');
    assert.equal(postcardMeta.naturalHeight, 675, 'MatchPostcard height phải là 675');
    assert.equal(postcardMeta.hrefPrefix, 'data:image/png;base64,', 'Link tải phải trỏ tới PNG');
    assert.ok(postcardMeta.downloadAttr?.endsWith('.png'), 'Thuộc tính download phải có đuôi .png');
    for (const mssv of ALL_TEST_MSSVS) {
      assert.equal(
        postcardMeta.modalText.includes(mssv),
        false,
        `Màn hình tổng kết tuyệt đối không được chứa MSSV ${mssv}`,
      );
    }

    await p1.page.waitForTimeout(250);
    await p1.page.screenshot({ path: path.join(SHOT_DIR, 'bg4-04-match-result-postcard.png') });

    // 7. Thoát ván -> Rời CLB về lại sân KTX
    console.log('[BG4 E2E] Step 7: Exiting match & CLB back to KTX campus...');
    await p1.page.locator('[data-testid="bg-leave-game-btn"]').click();
    await p1.page
      .locator('[data-testid="boardgame-2d-board"]')
      .waitFor({ state: 'detached', timeout: 20000 });

    const closeLobbyBtn = p1.page.locator('[data-testid="bg-close-lobby-btn"]');
    if ((await closeLobbyBtn.count()) > 0 && (await closeLobbyBtn.isVisible().catch(() => false))) {
      await closeLobbyBtn.click();
    }

    await p1.page.locator('[data-testid="bg-exit-lounge-btn"]').click();
    const confirmExitBtn = p1.page.locator('[data-testid="bg-confirm-exit-btn"]');
    if (
      (await confirmExitBtn.count()) > 0 &&
      (await confirmExitBtn.isVisible().catch(() => false))
    ) {
      await confirmExitBtn.click();
    }

    await p1.page.waitForFunction(
      () => {
        if (!window.__bkhn?.isInBoardGameClub || !window.__bkhn?.getPos) return false;
        const pos = window.__bkhn.getPos();
        return !window.__bkhn.isInBoardGameClub() && pos.x > 100 && pos.z < -45;
      },
      null,
      { timeout: 25000 },
    );
    await p1.page.waitForTimeout(500);
    await p1.page.screenshot({ path: path.join(SHOT_DIR, 'bg4-05-exit-ktx.png') });

    // 8. Kiểm tra tổng hợp WS security + cross-player token isolation + console errors
    const tokens = players.map((p) => p.audit.selfReconnectToken).filter(Boolean);
    assert.equal(tokens.length, 4, 'Cả 4 người chơi phải được cấp reconnectToken riêng');
    assert.equal(new Set(tokens).size, 4, '4 reconnectToken phải khác nhau hoàn toàn');

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      for (let j = 0; j < players.length; j++) {
        if (i === j) continue;
        const otherToken = players[j].audit.selfReconnectToken;
        if (!otherToken) continue;
        for (const frame of p.audit.rawFrames) {
          assert.equal(
            frame.includes(otherToken),
            false,
            `${p.user.label}: reconnectToken của ${players[j].user.label} bị rò rỉ trong WS frame!`,
          );
        }
      }
    }

    for (const p of players) {
      assert.ok(p.audit.wsFramesChecked > 0, `${p.user.label} phải nhận được WS frames thật`);
      assert.equal(
        p.audit.auditErrors.length,
        0,
        `${p.user.label} WS audit errors: ${p.audit.auditErrors.join('; ')}`,
      );
      assert.equal(
        p.audit.pageErrors.length,
        0,
        `${p.user.label} page errors: ${p.audit.pageErrors.join('; ')}`,
      );
    }

    console.log(
      'BG4 E2E PASS:',
      JSON.stringify({
        inviteCode,
        framesAudited: players.map((p) => ({ player: p.user.label, frames: p.audit.wsFramesChecked })),
        postcardSize: `${postcardMeta.naturalWidth}x${postcardMeta.naturalHeight}`,
      }),
    );
  } finally {
    for (const ctx of contexts) {
      await ctx.close().catch(() => undefined);
    }
    for (const b of browsers) {
      await b.close().catch(() => undefined);
    }
    outServer.close();
    if (shim && shim.proc && shim.proc.exitCode === null) {
      shim.proc.kill('SIGTERM');
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
