#!/usr/bin/env node
/**
 * scripts/verify-phase8a1-e2e.cjs
 *
 * Phase 8A.1 Real-Browser 3D Seat-to-Match Playwright E2E + Visual QA:
 * Reproduces the exact 3D user flow WITHOUT opening Lobby:
 *   Enter 3D CLB -> Walk/Teleport to physical chair -> Press E -> Auto-create room
 *   -> Observe HUD "Chế độ chơi: Classic (10 tướng)" -> Keyboard & click dropdown
 *   -> HUD/Lobby sync -> Mobile Guest 3D auto-join sees read-only Full Expansion
 *   -> Spectator privacy -> F5 reconnect preserves selection -> Ready -> Start Match
 *   -> Match launches with Full Expansion (66-character pool).
 *
 * Captures Desktop (1440x900) & Mobile (390x844) AFTER screenshots into
 * docs/boardgame-expansion/phase-8/screenshots/phase-8a1/.
 */
'use strict';

require('../test/register-ts.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { WebSocket } = require('../test/ws-shim/mini-ws');
const { startStandaloneBoardGameTestServer } = require('../test/ws-shim/boardgame-do-harness.cjs');
const { BOARD_GAME_SEATS } = require('../features/campus/world-data/buildings.ts');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');
const SHOT_DIR =
  process.env.PHASE8A1_SHOT_DIR ||
  path.join(ROOT, 'docs/boardgame-expansion/phase-8/screenshots/phase-8a1');

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
      resolve({ server, url: `http://127.0.0.1:${server.address().port}` });
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

function connectWsPeer(wsUrl, matchId, inviteCode, displayName, seatIndex, asSpectator = false) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${wsUrl}/ws/boardgame?matchId=${matchId}`, {
      headers: { Origin: 'https://hustverse.vercel.app' },
    });
    const messages = [];
    ws.on('message', (raw) => {
      try {
        messages.push(JSON.parse(String(raw)));
      } catch {}
    });
    ws.once('error', reject);
    ws.once('open', () => {
      ws.send(
        JSON.stringify({
          type: 'BG_JOIN',
          matchId,
          inviteCode,
          displayName,
          asSpectator,
          ...(asSpectator ? {} : { preferredSeatIndex: seatIndex }),
          requestId: `peer_${displayName}`,
        }),
      );
      const waitSync = setInterval(() => {
        const sync = messages.find((m) => m.type === 'BG_STATE_SYNC');
        if (sync) {
          clearInterval(waitSync);
          resolve({
            ws,
            messages,
            setReady: () =>
              ws.send(
                JSON.stringify({
                  type: 'BG_SET_READY',
                  ready: true,
                  requestId: `rdy_${displayName}`,
                }),
              ),
          });
        }
      }, 40);
    });
  });
}

async function enterClubAndSitPhysically(page, outUrl, seat) {
  await page.goto(outUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('#enter-campus').waitFor({ state: 'visible', timeout: 90000 });
  await page.locator('#enter-campus').click();
  await page.waitForFunction(() => Boolean(window.__bkhn && window.__bkhn.enterBoardGameClub), null, {
    timeout: 90000,
    polling: 200,
  });
  await page.evaluate(() => window.__bkhn.enterBoardGameClub());
  await page.waitForSelector('[data-testid="boardgame-club-hud"]', { timeout: 60000 });
  await page.evaluate(
    ({ x, z }) => window.__bkhn.teleport(x, z, 0, 0),
    { x: seat.standPos.x, z: seat.standPos.z },
  );
  await page.waitForTimeout(500);
  await page.keyboard.press('e');
  await page.waitForSelector('[data-testid="bg-hud-invite-code"]', { timeout: 30000 });
}

async function main() {
  assert.equal(fs.existsSync(path.join(OUT_DIR, 'index.html')), true, 'Run `npm run build` first');
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const srv = await startStandaloneBoardGameTestServer(0, {
    ENVIRONMENT: 'production',
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
  });
  const { server: outServer, url: outUrl } = await startOutServer();
  const { chromium } = loadPlaywright();
  const executablePath = resolveChrome(chromium);
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
    ],
  });

  const errors = [];
  const peers = [];
  const report = {};

  try {
    const seat0 = BOARD_GAME_SEATS.find((s) => s.seatId === 'bg-t1-s0');
    const seat1 = BOARD_GAME_SEATS.find((s) => s.seatId === 'bg-t1-s1');
    const seatT2 = BOARD_GAME_SEATS.find((s) => s.seatId === 'bg-t2-s0');

    // =========================================================================
    // 1. HOST (Desktop 1440x900) — 3D Seat-to-Match WITHOUT opening Lobby
    // =========================================================================
    const hostCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await hostCtx.addInitScript(({ wsUrl }) => {
      window.__HUST_TEST_MP_WS_URL = wsUrl;
    }, { wsUrl: `${srv.wsBaseUrl}/ws` });
    const hostPage = await hostCtx.newPage();
    hostPage.on('pageerror', (e) => errors.push(`host pageerror: ${e.message}`));

    await enterClubAndSitPhysically(hostPage, outUrl, seat0);
    await hostPage.waitForTimeout(350);

    // Must NOT have Lobby open; HUD must immediately show Classic (10 tướng)
    assert.equal(await hostPage.locator('[data-testid="boardgame-lobby-modal"]').count(), 0);
    const trigger = hostPage.locator('[data-testid="bg-hud-ruleset-trigger"]');
    await trigger.waitFor({ state: 'visible', timeout: 10000 });
    const initialLabel = (await hostPage.locator('[data-testid="bg-hud-ruleset-active-label"]').innerText()).trim();
    assert.equal(initialLabel, 'Classic (10 tướng)');
    const inviteCode = (await hostPage.locator('[data-testid="bg-hud-invite-code"]').innerText()).trim();
    assert.match(inviteCode, /^[A-Z0-9]{6}$/);
    const desktopOverflow1 = await hostPage.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
    assert.equal(desktopOverflow1, true, 'Desktop HUD must not overflow');
    await hostPage.screenshot({ path: path.join(SHOT_DIR, 'after-desktop-classic-closed.png') });

    // Open dropdown via click, inspect all 4 modes & stacking/bounds, capture screenshot
    await trigger.click();
    const menu = hostPage.locator('[data-testid="bg-hud-ruleset-menu"]');
    await menu.waitFor({ state: 'visible', timeout: 5000 });
    for (const id of ['classic', 'expansion-1', 'expansion-2', 'full-expansion']) {
      await hostPage.locator(`[data-testid="bg-hud-ruleset-opt-${id}"]`).waitFor({ state: 'visible' });
    }
    const menuBox = await menu.boundingBox();
    assert.ok(menuBox && menuBox.x >= 0 && menuBox.x + menuBox.width <= 1440, 'Desktop dropdown within viewport');
    await hostPage.screenshot({ path: path.join(SHOT_DIR, 'after-desktop-dropdown-open.png') });

    // Keyboard navigation: ArrowDown -> Escape closes & restores focus
    await hostPage.keyboard.press('ArrowDown');
    await hostPage.keyboard.press('Escape');
    assert.equal(await menu.count(), 0, 'Escape must close dropdown');

    // Click outside closes dropdown
    await trigger.click();
    await menu.waitFor({ state: 'visible' });
    await hostPage.mouse.click(20, 450);
    assert.equal(await menu.count(), 0, 'Clicking outside must close dropdown');

    // Host switches to Expansion 1 from HUD -> verify Lobby reflects Expansion 1 -> switch to Full Expansion from Lobby -> close Lobby -> verify HUD reflects Full Expansion
    await trigger.click();
    await hostPage.locator('[data-testid="bg-hud-ruleset-opt-expansion-1"]').click();
    await hostPage.waitForFunction(
      () => document.querySelector('[data-testid="bg-hud-ruleset-active-label"]')?.textContent?.includes('Expansion 1 (36 tướng)'),
      null,
      { timeout: 8000 },
    );
    await hostPage.locator('[data-testid="bg-toggle-lobby-btn"]').click();
    await hostPage.locator('[data-testid="boardgame-lobby-modal"]').waitFor({ state: 'visible' });
    await hostPage.locator('[data-testid="bg-ruleset-opt-full-expansion"]').click();
    await hostPage.locator('[data-testid="bg-close-lobby-btn"]').click();
    await hostPage.waitForFunction(
      () => document.querySelector('[data-testid="bg-hud-ruleset-active-label"]')?.textContent?.includes('Full Expansion (66 tướng)'),
      null,
      { timeout: 8000 },
    );
    const noticeText = await hostPage.locator('[data-testid="bg-hud-ruleset-notice"]').innerText();
    assert.ok(noticeText.includes('Full Expansion'), `Expected mode change notice, got: ${noticeText}`);
    report.hudLobbySync = true;

    // Solo Host F5 Refresh preserves Host role, seat, inviteCode & Full Expansion!
    await hostPage.reload({ waitUntil: 'domcontentloaded' });
    await hostPage.locator('#enter-campus').waitFor({ state: 'visible', timeout: 90000 });
    await hostPage.locator('#enter-campus').click();
    await hostPage.waitForSelector('[data-testid="bg-hud-ruleset-trigger"]', { timeout: 60000 });
    await hostPage.waitForFunction(
      () =>
        document.querySelector('[data-testid="bg-hud-ruleset-active-label"]')?.textContent?.includes('Full Expansion (66 tướng)'),
      null,
      { timeout: 30000 },
    );
    assert.equal((await hostPage.locator('[data-testid="bg-hud-invite-code"]').innerText()).trim(), inviteCode);
    report.f5ReconnectPreserved = true;

    // Pause host 3D to keep headless SwiftShader fast when Mobile Guest opens
    await hostPage.evaluate(() => window.dispatchEvent(new CustomEvent('bkhn:pause-3d', { detail: true })));

    // =========================================================================
    // 2. GUEST (Mobile 390x844) — 3D Seat-to-Match Auto-Join + Read-Only Sync
    // =========================================================================
    const guestCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await guestCtx.addInitScript(({ wsUrl }) => {
      window.__HUST_TEST_MP_WS_URL = wsUrl;
    }, { wsUrl: `${srv.wsBaseUrl}/ws` });
    const guestPage = await guestCtx.newPage();
    guestPage.on('pageerror', (e) => errors.push(`guest pageerror: ${e.message}`));

    await enterClubAndSitPhysically(guestPage, outUrl, seat1);
    await guestPage.waitForTimeout(350);

    const guestInvite = (await guestPage.locator('[data-testid="bg-hud-invite-code"]').innerText()).trim();
    assert.equal(guestInvite, inviteCode, 'Mobile guest must auto-join host room on Table 1');
    assert.equal(await guestPage.locator('[data-testid="bg-hud-ruleset-trigger"]').count(), 0, 'Guest must NOT get interactive selector');
    const guestReadonly = guestPage.locator('[data-testid="bg-hud-ruleset-readonly"]');
    await guestReadonly.waitFor({ state: 'visible', timeout: 8000 });
    const guestRoText = await guestReadonly.innerText();
    assert.ok(guestRoText.includes('Full Expansion (66 tướng)'), `Guest must see Full Expansion, got: ${guestRoText}`);
    assert.ok(guestRoText.includes('Chủ bàn chọn chế độ chơi'), 'Guest must see host hint');

    const mobOverflow = await guestPage.evaluate(
      () => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }),
    );
    assert.ok(mobOverflow.scrollWidth <= mobOverflow.innerWidth + 1, `Mobile overflow: ${JSON.stringify(mobOverflow)}`);
    await guestPage.screenshot({ path: path.join(SHOT_DIR, 'after-mobile-guest-390x844.png') });
    report.mobileGuest = { inviteCode: guestInvite, readonlyText: guestRoText, ...mobOverflow };

    // Live sync test: Host switches Expansion 2 -> Full Expansion, Guest receives update live!
    await hostPage.locator('[data-testid="bg-hud-ruleset-trigger"]').click();
    await hostPage.locator('[data-testid="bg-hud-ruleset-opt-expansion-2"]').click();
    await guestPage.waitForFunction(
      () => document.querySelector('[data-testid="bg-hud-ruleset-active-label"]')?.textContent?.includes('Expansion 2 (40 tướng)'),
      null,
      { timeout: 8000 },
    );
    await hostPage.locator('[data-testid="bg-hud-ruleset-trigger"]').click();
    await hostPage.locator('[data-testid="bg-hud-ruleset-opt-full-expansion"]').click();
    await guestPage.waitForFunction(
      () => document.querySelector('[data-testid="bg-hud-ruleset-active-label"]')?.textContent?.includes('Full Expansion (66 tướng)'),
      null,
      { timeout: 8000 },
    );
    report.liveHostToGuestSync = true;

    // Guest clicks Ready on HUD
    await guestPage.locator('[data-testid="bg-hud-ready-btn"]').click();
    await guestPage.evaluate(() => window.dispatchEvent(new CustomEvent('bkhn:pause-3d', { detail: true })));

    // =========================================================================
    // 3. Peers 3 & 4 + Spectator join -> F5 Reconnect Host -> Start Match!
    // =========================================================================
    const dirRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`);
    const dirJson = await dirRes.json();
    const matchRow = dirJson.matches.find((m) => m.inviteCode === inviteCode);
    assert.ok(matchRow, 'Match must appear in directory');
    assert.equal(matchRow.rulesetId, 'full-expansion', 'Directory must reflect full-expansion');

    const p3 = await connectWsPeer(srv.wsBaseUrl, matchRow.matchId, inviteCode, 'Peer3', 2, false);
    const p4 = await connectWsPeer(srv.wsBaseUrl, matchRow.matchId, inviteCode, 'Peer4', 3, false);
    const spec = await connectWsPeer(srv.wsBaseUrl, matchRow.matchId, inviteCode, 'Spec1', 0, true);
    peers.push(p3, p4, spec);
    p3.setReady();
    p4.setReady();
    const specInit = spec.messages.find((m) => m.type === 'BG_STATE_SYNC');
    assert.equal(specInit.rulesetId, 'full-expansion');
    assert.equal(specInit.privateView, null);

    // Host unpauses 3D briefly to capture ready state screenshot & clicks Start Match!
    await hostPage.evaluate(() => window.dispatchEvent(new CustomEvent('bkhn:pause-3d', { detail: false })));
    await hostPage.waitForFunction(
      () =>
        document.querySelector('[data-testid="bg-hud-ruleset-active-label"]')?.textContent?.includes('Full Expansion (66 tướng)') &&
        Boolean(document.querySelector('[data-testid="bg-hud-start-btn"]:not([disabled])')),
      null,
      { timeout: 30000 },
    );
    const startBtnText = (await hostPage.locator('[data-testid="bg-hud-start-btn"]').innerText()).trim();
    assert.ok(startBtnText.includes('Full Expansion'), `Start button should announce mode, got: ${startBtnText}`);
    await hostPage.waitForTimeout(350);
    await hostPage.screenshot({ path: path.join(SHOT_DIR, 'after-desktop-full-expansion-ready.png') });

    // Host starts match from HUD -> GameBoard opens on Host & Guest with full-expansion pool!
    await hostPage.locator('[data-testid="bg-hud-start-btn"]').click();
    await hostPage.waitForSelector('[data-testid="boardgame-2d-board"]', { timeout: 30000 });
    await guestPage.waitForSelector('[data-testid="boardgame-2d-board"]', { timeout: 30000 });
    const sqlRow = srv.containers.get(matchRow.matchId).ctx.storage.sql
      .exec('SELECT status, ruleset_id FROM matches LIMIT 1')
      .one();
    assert.equal(sqlRow.status, 'PLAYING');
    assert.equal(sqlRow.ruleset_id, 'full-expansion');
    report.matchStartedWithFullExpansion = true;

    await hostCtx.close();
    await guestCtx.close();

    // =========================================================================
    // 4. Mobile Host (390x844) Dropdown Bounds & Zero Overflow Check on Table 2
    // =========================================================================
    const mobHostCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await mobHostCtx.addInitScript(({ wsUrl }) => {
      window.__HUST_TEST_MP_WS_URL = wsUrl;
    }, { wsUrl: `${srv.wsBaseUrl}/ws` });
    const mobHostPage = await mobHostCtx.newPage();
    mobHostPage.on('pageerror', (e) => errors.push(`mobHost pageerror: ${e.message}`));

    await enterClubAndSitPhysically(mobHostPage, outUrl, seatT2);
    await mobHostPage.locator('[data-testid="bg-hud-ruleset-trigger"]').click();
    const mobMenu = mobHostPage.locator('[data-testid="bg-hud-ruleset-menu"]');
    await mobMenu.waitFor({ state: 'visible', timeout: 8000 });
    const mobMenuBox = await mobMenu.boundingBox();
    const mobHostOverflow = await mobHostPage.evaluate(
      () => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }),
    );
    assert.ok(mobHostOverflow.scrollWidth <= mobHostOverflow.innerWidth + 1, 'Mobile host overflow detected');
    assert.ok(
      mobMenuBox && mobMenuBox.x >= 0 && mobMenuBox.x + mobMenuBox.width <= 391,
      `Mobile dropdown clipped/overflowed: ${JSON.stringify(mobMenuBox)}`,
    );
    await mobHostPage.screenshot({ path: path.join(SHOT_DIR, 'after-mobile-host-dropdown-390x844.png') });
    report.mobileHostDropdown = { mobMenuBox, ...mobHostOverflow };
    await mobHostCtx.close();

    assert.equal(errors.length, 0, `Unexpected browser errors: ${errors.join('; ')}`);
    console.log(JSON.stringify({ ok: true, report }, null, 2));
  } finally {
    for (const p of peers) {
      try {
        p.ws.close();
      } catch {}
    }
    await browser.close();
    outServer.close();
    await srv.close();
  }
}

main().catch((err) => {
  console.error('❌ Phase 8A.1 E2E FAILED:', err);
  process.exit(1);
});
