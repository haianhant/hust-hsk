/**
 * test/boardgame-e2e.cjs — Portable Playwright End-to-End Suite (Bóng Đêm KTX v3.1):
 *   E2E-01: 4-player mixed Desktop (3) + Mobile (1) full match lifecycle, rules modal, sound,
 *           emotes, hand masking, MatchPostcard (1200x675 PNG, zero MSSV) & return to KTX.
 *   E2E-02: 8-player full Table 2 match + 9th Spectator (privateView === null, zero hidden leaks).
 *   E2E-03: 5-checkpoint mid-session reload reconnect matrix (READY_CHECK, own turn, other turn,
 *           post-REVEAL_ROLE, FINISHED match result).
 *   E2E-04: Mobile 390x844 full responsive audit (Lobby & all 3 GameBoard tabs, overflow === 0,
 *           touch target bounding-box checks & playable turn on mobile).
 *   E2E-05: Concurrent 2-match isolation (Table 1 + Table 2) & /api/boardgame/health verification.
 *   E2E-06: Browser WebSocket security regression (wrong-match UNAUTHORIZED token, malformed JSON,
 *           unknown message type, prototype-key payload, out-of-turn action without DO crash).
 *
 * Run (after `npm run build`): npm run test:boardgame:e2e
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
const SHOT_DIR = process.env.BOARDGAME_SHOT_DIR || path.join(ROOT, 'test-results', 'boardgame');
const UI_TIMEOUT = 60000;
const VALID_SHARDS = new Set(['all', 'e2e-01-04', 'e2e-02', 'e2e-03', 'e2e-05-06']);

function parseShardArg() {
  const arg = process.argv.slice(2).find((a) => a.startsWith('--shard='));
  const raw = (arg ? arg.slice('--shard='.length) : process.env.BOARDGAME_E2E_SHARD || 'all').trim();
  const shard = raw || 'all';
  if (!VALID_SHARDS.has(shard)) {
    throw new Error(
      `Invalid --shard="${shard}". Expected one of: ${Array.from(VALID_SHARDS).join(', ')}`,
    );
  }
  return shard;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
};

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_CORE_PATH,
    path.join(ROOT, 'node_modules/playwright-core'),
    path.join(ROOT, 'node_modules/playwright'),
    'playwright-core',
    'playwright',
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      return require(p);
    } catch {
      // try next candidate
    }
  }
  throw new Error('playwright-core not found — run `npm ci` or install `playwright-core@1.48.2`.');
}

function resolveBrowserExecutable(chromium) {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  if (chromium && typeof chromium.executablePath === 'function') {
    const pwExec = chromium.executablePath();
    if (pwExec && fs.existsSync(pwExec)) {
      return undefined;
    }
  }
  for (const p of [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ]) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    'No Chromium/Chrome executable found. Run: npx playwright-core install --with-deps chromium',
  );
}

function buildLaunchOptions(executablePath) {
  return {
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
  };
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
      if (cleanUrl === '/__e2e-peer.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<!doctype html><html><head><title>E2E Browser Peer</title></head><body>OK</body></html>');
        return;
      }
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

const FORBIDDEN_PUBLIC_KEYS = [
  '"signalProgress"',
  '"mistProgress"',
  '"maxTrackValue"',
  '"secretSabotageLocation"',
  '"sabotagePlanted"',
  '"sabotageCanDetonate"',
  '"sabotageProgress"',
  '"activeArmor"',
  '"attackBonus"',
  '"rngState"',
];

function auditBoardGameFrameText(label, text, audit, forbiddenMssvs = ALL_TEST_MSSVS, expectSpectator = false) {
  audit.wsFramesChecked += 1;
  audit.rawFrames.push(text);
  if (audit.rawFrames.length > 250) {
    audit.rawFrames.shift();
  }

  for (const mssv of forbiddenMssvs) {
    if (text.includes(mssv)) {
      audit.auditErrors.push(`${label}: MSSV ${mssv} leaked in WS frame!`);
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
    audit.matchIdsSeen.add(msg.matchId);
    if (msg.protocolVersion !== undefined && msg.protocolVersion !== 1) {
      audit.auditErrors.push(`${label}: unexpected protocolVersion ${msg.protocolVersion}`);
    }
    if (expectSpectator && msg.isSpectator !== true) {
      audit.auditErrors.push(`${label}: spectator BG_AUTH_ISSUED missing isSpectator=true!`);
    }
    if (expectSpectator && msg.seatIndex !== null) {
      audit.auditErrors.push(`${label}: spectator BG_AUTH_ISSUED must have seatIndex=null!`);
    }
  }

  if (msg.type === 'BG_STATE_SYNC') {
    audit.latestSync = msg;
    audit.matchIdsSeen.add(msg.matchId);
    if (expectSpectator && msg.privateView !== null) {
      audit.auditErrors.push(`${label}: spectator received non-null privateView!`);
    }
    if (
      expectSpectator &&
      audit.selfPlayerId &&
      Array.isArray(msg.publicGame?.players) &&
      msg.publicGame.players.some((pl) => pl.playerId === audit.selfPlayerId)
    ) {
      audit.auditErrors.push(`${label}: spectator appeared inside publicGame.players!`);
    }

    if (msg.publicGame) {
      const pg = msg.publicGame;
      if (pg.rulesetVersion !== 4) {
        audit.auditErrors.push(`${label}: expected rulesetVersion 4, got ${String(pg.rulesetVersion)}`);
      }
      const rawPg = JSON.stringify(pg);
      for (const forbidden of FORBIDDEN_PUBLIC_KEYS) {
        if (rawPg.includes(forbidden)) {
          audit.auditErrors.push(`${label}: forbidden field ${forbidden} leaked in publicGame!`);
        }
      }
      const isPlaying = msg.status === 'PLAYING' || pg.turnPhase !== 'ENDED';
      if (isPlaying && (rawPg.includes('"hp":') || rawPg.includes('"maxHp":'))) {
        audit.auditErrors.push(`${label}: hidden hp/maxHp leaked in publicGame while PLAYING!`);
      }
      if (pg.turnPhase !== 'ENDED' && pg.finalReveal) {
        audit.auditErrors.push(`${label}: finalReveal leaked before ENDED!`);
      }
      if (msg.privateView && audit.selfPlayerId && msg.privateView.playerId !== audit.selfPlayerId) {
        audit.auditErrors.push(
          `${label}: privateView belongs to ${msg.privateView.playerId}, expected ${audit.selfPlayerId}`,
        );
      }
      for (const pl of pg.players || []) {
        if (pl.playerId !== audit.selfPlayerId && !pl.revealedRoleId) {
          const rawPlayer = JSON.stringify(pl);
          if (
            rawPlayer.includes('secretGoalText') ||
            rawPlayer.includes('"hand"') ||
            rawPlayer.includes('"skillName"')
          ) {
            audit.auditErrors.push(`${label}: hidden secretGoal/hand/skill exposed for ${pl.playerId}`);
          }
        }
      }
    }
  }
}

async function setupPlayerContext(chromium, launchOpts, user, shimWsBaseUrl, opts = {}) {
  const browser = opts.sharedBrowser ? null : await chromium.launch(launchOpts);
  const targetBrowser = opts.sharedBrowser || browser;
  const context = await targetBrowser.newContext(
    user.mobile
      ? { viewport: user.viewport, hasTouch: true, isMobile: true }
      : { viewport: user.viewport, hasTouch: true },
  );

  await context.addInitScript(
    ({ name, mssv, wsUrl }) => {
      window.__HUST_TEST_MP_WS_URL = wsUrl;
      if (!window.__hustTestWsHookInstalled && typeof window.WebSocket === 'function') {
        window.__hustTestWsHookInstalled = true;
        const OrigWS = window.WebSocket;
        window.WebSocket = function WrappedTestWebSocket(url, protocols) {
          const ws = protocols !== undefined ? new OrigWS(url, protocols) : new OrigWS(url);
          if (typeof url === 'string' && url.includes('/ws/boardgame')) {
            window.__testBgWs = ws;
          }
          return ws;
        };
        window.WebSocket.prototype = OrigWS.prototype;
        Object.assign(window.WebSocket, OrigWS);
      }
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
  context.setDefaultTimeout(UI_TIMEOUT);
  page.setDefaultTimeout(UI_TIMEOUT);
  const audit = {
    label: user.label,
    selfPlayerId: null,
    selfReconnectToken: null,
    wsFramesChecked: 0,
    latestSync: null,
    matchIdsSeen: new Set(),
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
      auditBoardGameFrameText(user.label, text, audit, ALL_TEST_MSSVS, Boolean(opts.expectSpectator));
    });
  });

  return { browser, context, page, audit };
}

/**
 * Lightweight browser WebSocket client inside a real Chromium page (zero 3D WebGL overhead),
 * used for non-focused seats in 8-player and multi-match scenarios.
 */
async function createBrowserWsPeer(context, outUrl, wsBaseUrl, displayName, preferredSeatIndex = null) {
  const page = await context.newPage();
  context.setDefaultTimeout(UI_TIMEOUT);
  page.setDefaultTimeout(UI_TIMEOUT);
  const audit = {
    label: displayName,
    selfPlayerId: null,
    selfReconnectToken: null,
    wsFramesChecked: 0,
    latestSync: null,
    matchIdsSeen: new Set(),
    rawFrames: [],
    auditErrors: [],
    pageErrors: [],
  };
  page.on('pageerror', (e) => audit.pageErrors.push(`${displayName}: ${e.message}`));
  page.on('websocket', (ws) => {
    if (!ws.url().includes('/ws/boardgame')) return;
    ws.on('framereceived', ({ payload }) => {
      auditBoardGameFrameText(displayName, String(payload), audit, ALL_TEST_MSSVS, false);
    });
  });

  await page.goto(`${outUrl}/__e2e-peer.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.__peerState = {
      ws: null,
      auth: null,
      latestSync: null,
      messages: [],
    };
  });

  async function join(matchId, inviteCode, asSpectator = false) {
    const auth = await page.evaluate(
      ({ wsUrl, matchId: mId, inviteCode: code, name, seatIdx, spec }) => {
        return new Promise((resolve, reject) => {
          const st = window.__peerState;
          const ws = new WebSocket(`${wsUrl}/ws/boardgame?matchId=${encodeURIComponent(mId)}`);
          st.ws = ws;
          let gotAuth = null;
          let gotSync = false;
          const timer = setTimeout(() => reject(new Error(`Peer ${name} join timeout`)), 10000);
          ws.onopen = () => {
            ws.send(
              JSON.stringify({
                type: 'BG_JOIN',
                matchId: mId,
                inviteCode: code,
                displayName: name,
                asSpectator: spec,
                ...(seatIdx !== null ? { preferredSeatIndex: seatIdx } : {}),
              }),
            );
          };
          ws.onmessage = (ev) => {
            const msg = JSON.parse(ev.data);
            st.messages.push(msg);
            if (msg.type === 'BG_AUTH_ISSUED') {
              gotAuth = msg;
              st.auth = msg;
            } else if (msg.type === 'BG_STATE_SYNC') {
              st.latestSync = msg;
              gotSync = true;
            } else if (msg.type === 'BG_ERROR' && !gotAuth) {
              clearTimeout(timer);
              reject(new Error(`Peer join BG_ERROR: ${msg.code} ${msg.message}`));
            }
            if (gotAuth && gotSync) {
              clearTimeout(timer);
              resolve(gotAuth);
            }
          };
          ws.onerror = () => {
            clearTimeout(timer);
            reject(new Error(`Peer ${name} ws error`));
          };
        });
      },
      {
        wsUrl: wsBaseUrl,
        matchId,
        inviteCode,
        name: displayName,
        seatIdx: preferredSeatIndex,
        spec: asSpectator,
      },
    );
    audit.selfPlayerId = auth.playerId;
    audit.selfReconnectToken = auth.reconnectToken;
    return auth;
  }

  async function setReady(ready = true) {
    await page.evaluate((r) => {
      window.__peerState.ws.send(
        JSON.stringify({
          type: 'BG_SET_READY',
          ready: r,
          requestId: `rdy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        }),
      );
    }, ready);
  }

  async function startMatch() {
    return page.evaluate(() => {
      const ws = window.__peerState && window.__peerState.ws;
      if (!ws || ws.readyState !== 1) return false;
      ws.send(
        JSON.stringify({
          type: 'BG_START_MATCH',
          requestId: `start-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        }),
      );
      return true;
    });
  }

  async function getState() {
    return page.evaluate(() => ({
      auth: window.__peerState.auth,
      sync: window.__peerState.latestSync,
    }));
  }

  async function sendAction(action) {
    return page.evaluate((act) => {
      return new Promise((resolve) => {
        const st = window.__peerState;
        const reqId = `peer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const expectedRev = st.latestSync ? st.latestSync.revision : 0;
        const startIdx = st.messages.length;
        st.ws.send(
          JSON.stringify({
            type: 'BG_GAME_ACTION',
            requestId: reqId,
            expectedRevision: expectedRev,
            action: act,
          }),
        );
        const deadline = Date.now() + 4000;
        const poll = () => {
          for (let i = startIdx; i < st.messages.length; i++) {
            const m = st.messages[i];
            if (m.type === 'BG_ACTION_ACK' && m.requestId === reqId) {
              if (!m.ok || (st.latestSync && st.latestSync.revision >= m.revision)) {
                resolve(m);
                return;
              }
              const waitSyncDeadline = Date.now() + 800;
              const waitSync = () => {
                if ((st.latestSync && st.latestSync.revision >= m.revision) || Date.now() >= waitSyncDeadline) {
                  resolve(m);
                  return;
                }
                setTimeout(waitSync, 15);
              };
              setTimeout(waitSync, 15);
              return;
            }
            if (m.type === 'BG_ERROR' && m.requestId === reqId) {
              resolve({ ok: false, code: m.code, reason: m.message });
              return;
            }
          }
          if (Date.now() > deadline) {
            resolve({ ok: false, code: 'TIMEOUT', reason: 'peer action wait timeout' });
            return;
          }
          setTimeout(poll, 20);
        };
        setTimeout(poll, 20);
      });
    }, action);
  }

  async function stepFullTurnIfActive(preferExplore = true, skipCombat = false) {
    const clusterOf = (locId, pairs) =>
      (pairs || []).find((c) => Array.isArray(c.locationIds) && c.locationIds.includes(locId))
        ?.clusterId || 'south';

    const st = await getState();
    const sync = st.sync;
    if (!sync || sync.status !== 'PLAYING' || sync.publicGame?.activePlayerId !== st.auth?.playerId) {
      return false;
    }
    const turnBefore = sync.publicGame.turnNumber;

    // 1. ROLL_MOVE / CHOOSE_MOVE
    for (let rollStep = 0; rollStep < 4; rollStep++) {
      const sNow = await getState();
      const pubNow = sNow.sync?.publicGame;
      if (
        !sNow.sync ||
        sNow.sync.status !== 'PLAYING' ||
        pubNow?.activePlayerId !== sNow.auth?.playerId ||
        pubNow.turnNumber !== turnBefore
      ) {
        break;
      }
      if (pubNow.turnPhase === 'ROLL_MOVE') {
        await sendAction({ type: 'ROLL_DICE' });
        await new Promise((r) => setTimeout(r, 80));
      } else if (pubNow.turnPhase === 'CHOOSE_MOVE') {
        const selfP = pubNow.players.find((p) => p.playerId === sNow.auth.playerId);
        const allowed =
          Array.isArray(pubNow.allowedMoveDestinations) && pubNow.allowedMoveDestinations.length > 0
            ? pubNow.allowedMoveDestinations
            : null;
        const dest = allowed
          ? allowed.includes('corridor')
            ? 'corridor'
            : allowed[0]
          : selfP?.location !== 'corridor'
            ? 'corridor'
            : 'lobby';
        await sendAction({ type: 'CHOOSE_DEST', location: dest });
        await new Promise((r) => setTimeout(r, 80));
      } else {
        break;
      }
    }

    // 2. LOCATION_ACTION
    const st2 = await getState();
    const pub2 = st2.sync?.publicGame;
    if (
      st2.sync?.status === 'PLAYING' &&
      pub2?.activePlayerId === st2.auth?.playerId &&
      pub2.turnNumber === turnBefore &&
      pub2.turnPhase === 'LOCATION_ACTION'
    ) {
      const self2 = pub2.players.find((p) => p.playerId === st2.auth.playerId);
      const otherAlive = pub2.players.find((p) => p.alive && p.playerId !== st2.auth.playerId);
      let locAct = { type: 'SKIP_LOC' };
      if (!skipCombat && preferExplore && self2) {
        if (self2.location === 'radio') locAct = { type: 'DRAW_CARD', deck: 'investigation' };
        else if (self2.location === 'lobby') locAct = { type: 'DRAW_CARD', deck: 'equipment' };
        else if (self2.location === 'breaker' || self2.location === 'canteen') locAct = { type: 'DRAW_CARD', deck: 'event' };
        else if (self2.location === 'corridor') {
          if (self2.woundsTaken >= 2) locAct = { type: 'USE_LOC_POWER', mode: 'heal', targetPlayerId: self2.playerId };
          else if (otherAlive) locAct = { type: 'USE_LOC_POWER', mode: 'damage', targetPlayerId: otherAlive.playerId };
        } else if (self2.location === 'court') {
          const donor = pub2.players.find((p) => p.alive && p.playerId !== st2.auth.playerId && p.equipped.length > 0);
          if (donor) locAct = { type: 'USE_LOC_POWER', mode: 'steal', targetPlayerId: donor.playerId };
        }
      }
      const locRes = await sendAction(locAct);
      await new Promise((r) => setTimeout(r, 80));
      if (!locRes.ok && locAct.type !== 'SKIP_LOC') {
        await sendAction({ type: 'SKIP_LOC' });
        await new Promise((r) => setTimeout(r, 80));
      }
    }

    // 3. MAIN_ACTION (resolve all hand cards -> reveal -> attack -> END_TURN)
    for (let mainStep = 0; mainStep < 6; mainStep++) {
      const st3 = await getState();
      const pub3 = st3.sync?.publicGame;
      const priv3 = st3.sync?.privateView;
      if (
        st3.sync?.status !== 'PLAYING' ||
        pub3?.activePlayerId !== st3.auth?.playerId ||
        pub3.turnNumber !== turnBefore ||
        pub3.turnPhase !== 'MAIN_ACTION'
      ) {
        break;
      }
      const self3 = pub3.players.find((p) => p.playerId === st3.auth.playerId);
      const allAliveOthers = pub3.players.filter((p) => p.alive && p.playerId !== st3.auth.playerId);
      const enemies = allAliveOthers.filter(
        (p) => !p.revealedFaction || priv3?.faction === 'wanderer' || p.revealedFaction !== priv3?.faction,
      );
      const otherAlive = enemies[0] || allAliveOthers[0];
      const hasHandgun = self3?.equipped?.some((c) => c.id === 'ev-05');
      const hasMasamune = self3?.equipped?.some((c) => c.id === 'ev-01');
      const reachableEnemies = enemies.filter((p) => {
        const same = clusterOf(p.location, pub3.clusterPairs) === clusterOf(self3.location, pub3.clusterPairs);
        return hasHandgun ? !same : same;
      });
      const reachableAny = allAliveOthers.filter((p) => {
        const same = clusterOf(p.location, pub3.clusterPairs) === clusterOf(self3.location, pub3.clusterPairs);
        return hasHandgun ? !same : same;
      });

      let act = { type: 'END_TURN' };
      if (!skipCombat && priv3?.hand && priv3.hand.length > 0) {
        const card = priv3.hand[0];
        if (card.deck === 'investigation' && otherAlive) {
          act = { type: 'INVESTIGATE_CARD', cardId: card.id, targetPlayerId: otherAlive.playerId };
        } else if (!card.isConsumable && card.deck !== 'investigation') {
          act = { type: 'EQUIP_CARD', cardId: card.id };
        } else if (card.id === 'eq-13' || card.id === 'eq-14' || card.id === 'ev-13') {
          act = { type: 'USE_CARD', cardId: card.id, skipEffect: true };
        } else if (
          ['eq-08', 'eq-09', 'ev-07', 'ev-08', 'ev-10', 'ev-11', 'ev-12'].includes(card.id) &&
          otherAlive
        ) {
          act = { type: 'USE_CARD', cardId: card.id, targetPlayerId: otherAlive.playerId };
        } else {
          act = { type: 'USE_CARD', cardId: card.id };
        }
      } else if (!skipCombat && priv3 && !priv3.revealed && priv3.roleId !== 'lang-tien-phong' && pub3.round >= 2) {
        act = { type: 'REVEAL_ROLE' };
      } else if (!skipCombat && (self3?.attacksThisTurn ?? 0) < 1 && reachableEnemies.length > 0) {
        act = { type: 'ATTACK', targetPlayerId: reachableEnemies[0].playerId };
      } else if (!skipCombat && (self3?.attacksThisTurn ?? 0) < 1 && hasMasamune && reachableAny.length > 0) {
        act = { type: 'ATTACK', targetPlayerId: reachableAny[0].playerId };
      }

      const res = await sendAction(act);
      await new Promise((r) => setTimeout(r, 80));
      if (!res.ok && act.type !== 'END_TURN') {
        await sendAction({ type: 'END_TURN' });
        await new Promise((r) => setTimeout(r, 80));
        break;
      }
      if (act.type === 'END_TURN') break;
    }

    const stAfter = await getState();
    return (
      stAfter.sync?.status === 'FINISHED' ||
      (stAfter.sync?.publicGame?.turnNumber ?? turnBefore) !== turnBefore ||
      stAfter.sync?.publicGame?.activePlayerId !== st.auth?.playerId
    );
  }

  return { page, audit, isPeer: true, join, setReady, startMatch, getState, sendAction, stepFullTurnIfActive };
}

async function setPage3DPaused(page, paused) {
  await page
    .evaluate((p) => window.dispatchEvent(new CustomEvent('bkhn:pause-3d', { detail: Boolean(p) })), paused)
    .catch(() => undefined);
}

async function enterCampusAndWaitHook(page, targetUrl, diagAudit) {
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  const enterBtn = page.locator('#enter-campus');
  await enterBtn.waitFor({ state: 'visible', timeout: 90000 });
  await enterBtn.click({ timeout: 90000 });
  try {
    await page.waitForFunction(() => Boolean(window.__bkhn && window.__bkhn.enterBoardGameClub), null, {
      timeout: 90000,
      polling: 200,
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

async function playFirstValidStepOnPage(page, stepIndex = 0, triedSet = new Set(), options = {}) {
  const snap = await page
    .evaluate(() => {
      const confirmBtn = document.querySelector('[data-testid="bg-confirm-reveal-btn"]');
      if (confirmBtn && !confirmBtn.disabled) {
        return { mode: 'confirm-reveal', turnKey: '', enabledIds: [] };
      }
      const panel = document.querySelector('[data-testid="bg-action-panel"]');
      if (!panel) return { mode: 'none', turnKey: '', enabledIds: [] };
      const statusBar = document.querySelector('[data-testid="bg-v3-status-bar"]');
      const btns = Array.from(panel.querySelectorAll('button[data-testid]'));
      const enabledIds = btns
        .filter((b) => {
          if (b.disabled) return false;
          const r = b.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        })
        .map((b) => b.getAttribute('data-testid'))
        .filter(Boolean);
      const rawStatus = (statusBar?.textContent || '').replace(/\s+/g, ' ');
      const turnMatch = rawStatus.match(/Lượt\s*#\d+/);
      const roundMatch = rawStatus.match(/Vòng\s*\d+/);
      const actorMatch = rawStatus.match(/Lượt:\s*(.+?)(?=\s*(?:Mã:|Mở rộng|◧|⚙️|Cài đặt|VFX|Bật|Tắt|🏆|📖|🚪|$))/u);
      const turnNumStr = turnMatch
        ? turnMatch[0]
        : roundMatch
          ? `${roundMatch[0]}::${(actorMatch?.[1] || '').trim()}`
          : rawStatus.slice(0, 96);
      const phaseTag = enabledIds.includes('bg-roll-dice-btn')
        ? 'P1'
        : enabledIds.some((id) => id.startsWith('bg-choose-dest-'))
          ? 'P1B'
          : enabledIds.includes('bg-skip-loc-btn')
            ? 'P2'
            : 'P3';
      const turnKey = `${turnNumStr}::${phaseTag}`;
      return { mode: 'panel', turnKey, enabledIds };
    })
    .catch(() => ({ mode: 'none', turnKey: '', enabledIds: [] }));

  if (snap.mode === 'confirm-reveal') {
    return page
      .locator('[data-testid="bg-confirm-reveal-btn"]')
      .click({ timeout: 4000 })
      .then(() => true)
      .catch(() => false);
  }
  if (snap.mode !== 'panel' || snap.enabledIds.length === 0) return false;

  const NON_BLOCKABLE = new Set(['bg-roll-dice-btn', 'bg-skip-loc-btn', 'bg-end-turn-btn']);
  const isFresh = (id) => NON_BLOCKABLE.has(id) || !triedSet.has(`${snap.turnKey}::${id}`);
  const enabledSet = new Set(snap.enabledIds);

  const pickAndClick = async (id) => {
    if (!id || !enabledSet.has(id) || !isFresh(id)) return false;
    const loc = page.locator(`[data-testid="${id}"]`).first();
    await loc.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => undefined);
    let clicked = await loc
      .click({ timeout: 4000 })
      .then(() => true)
      .catch(() => false);
    if (!clicked && (await loc.isEnabled({ timeout: 500 }).catch(() => false))) {
      clicked = await loc
        .click({ force: true, timeout: 2000 })
        .then(() => true)
        .catch(() => false);
    }
    if (!clicked) return false;
    if (!NON_BLOCKABLE.has(id)) {
      triedSet.add(`${snap.turnKey}::${id}`);
    }
    if (id === 'bg-reveal-role-btn') {
      const confirmBtn = page.locator('[data-testid="bg-confirm-reveal-btn"]');
      if (
        await confirmBtn
          .waitFor({ state: 'visible', timeout: 2000 })
          .then(() => true)
          .catch(() => false)
      ) {
        await confirmBtn.click({ timeout: 2000 }).catch(() => undefined);
      }
    }
    return true;
  };

  if (await pickAndClick('bg-roll-dice-btn')) return true;
  for (const id of ['bg-choose-dest-radio', 'bg-choose-dest-corridor', 'bg-choose-dest-lobby']) {
    if (await pickAndClick(id)) return true;
  }
  const anyDest = snap.enabledIds.find((id) => id.startsWith('bg-choose-dest-') && isFresh(id));
  if (anyDest && (await pickAndClick(anyDest))) return true;

  const p2Order = [
    'bg-draw-investigation-btn',
    'bg-draw-equipment-btn',
    'bg-draw-event-btn',
    'bg-loc-steal-btn',
    'bg-loc-damage-btn',
    'bg-loc-heal-btn',
    'bg-skip-loc-btn',
  ];
  for (let i = 0; i < p2Order.length; i++) {
    if (await pickAndClick(p2Order[(stepIndex + i) % p2Order.length])) return true;
  }

  if (!options.skipReveal && (await pickAndClick('bg-reveal-role-btn'))) return true;
  if (await pickAndClick('bg-use-skill-btn')) return true;
  const anySkipCard = snap.enabledIds.find((id) => id.startsWith('bg-skip-card-') && isFresh(id));
  if (anySkipCard && (await pickAndClick(anySkipCard))) return true;
  const anyCard = snap.enabledIds.find((id) => id.startsWith('bg-use-card-') && isFresh(id));
  if (anyCard && (await pickAndClick(anyCard))) return true;
  if (await pickAndClick('bg-attack-btn')) return true;
  if (await pickAndClick('bg-end-turn-btn')) return true;

  return false;
}

async function clickControlViaSettingsIfCollapsed(page, testId, options = {}) {
  const settingsBtn = page.locator('[data-testid="bg-graphics-settings-btn"]');
  const target = page.locator(`[data-testid="${testId}"]`).first();
  const visibleAlready = await target.isVisible().catch(() => false);
  if (!visibleAlready) {
    await settingsBtn.waitFor({ state: 'visible', timeout: 5000 });
    await settingsBtn.click();
    await page.waitForSelector('[data-testid="bg-graphics-settings-panel"]', { timeout: 5000 });
    await target.waitFor({ state: 'visible', timeout: 5000 });
  }
  await target.click();
  if (!options.keepOpen) {
    const stillOpen = await page
      .locator('[data-testid="bg-graphics-settings-panel"]')
      .isVisible()
      .catch(() => false);
    if (stillOpen) {
      await settingsBtn.click();
      await page
        .locator('[data-testid="bg-graphics-settings-panel"]')
        .waitFor({ state: 'detached', timeout: 3000 })
        .catch(() => undefined);
    }
  }
}

async function ensureSecondaryMenuOpen(page) {
  const menu = page.locator('[data-testid="bg-secondary-actions-menu"]');
  if ((await menu.count()) === 0) {
    await page.locator('[data-testid="bg-secondary-actions-btn"]').click();
    await menu.waitFor({ state: 'visible', timeout: 3000 });
  }
}

async function verifyTilePopoverAndKeyboardA11y(page, options = {}) {
  const { savePopoverShot = false } = options;
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(120);

  // 1. Rules are collapsed by default into tooltip/popover
  assert.equal(
    await page.locator('[data-testid^="bg-tile-rule-popover-"]').count(),
    0,
    'Tile rule popovers must be hidden by default in compact mode',
  );

  // 2. Hover trigger opens rule popover cleanly without overlap, moving pointer out hides it
  const radioTrigger = page.locator('[data-testid="bg-tile-rule-trigger-radio"]');
  await radioTrigger.hover();
  const radioPopover = page.locator('[data-testid="bg-tile-rule-popover-radio"]');
  await radioPopover.waitFor({ state: 'visible', timeout: 3000 });
  const radioPopText = await radioPopover.innerText();
  assert.ok(radioPopText.includes('Khám Phá'), `Radio popover must describe draw rule, got: ${radioPopText}`);
  await page.mouse.move(4, 4);
  await radioPopover.waitFor({ state: 'detached', timeout: 3000 });

  // 3. Keyboard focus opens rule popover; Escape dismisses it cleanly
  const corridorTrigger = page.locator('[data-testid="bg-tile-rule-trigger-corridor"]');
  await corridorTrigger.focus();
  const corridorPopover = page.locator('[data-testid="bg-tile-rule-popover-corridor"]');
  await corridorPopover.waitFor({ state: 'visible', timeout: 3000 });
  assert.ok((await corridorPopover.innerText()).includes('sát thương'), 'Corridor popover must describe trap/heal rule');
  await page.keyboard.press('Escape');
  await corridorPopover.waitFor({ state: 'detached', timeout: 3000 });

  // 4. Click pins popover open, click outside closes it
  const courtTrigger = page.locator('[data-testid="bg-tile-rule-trigger-court"]');
  await courtTrigger.click();
  const courtPopover = page.locator('[data-testid="bg-tile-rule-popover-court"]');
  await courtPopover.waitFor({ state: 'visible', timeout: 3000 });
  if (savePopoverShot) {
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(SHOT_DIR, 'phase2-after-1440x900-popover.png') });
  }
  await page.locator('[data-testid="bg-damage-track"]').click({ position: { x: 16, y: 12 } });
  await courtPopover.waitFor({ state: 'detached', timeout: 3000 });

  // 5. Keyboard selection on self pawn inside compact tile + strict 1 self-here tile invariant
  const selfState = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('[data-testid^="bg-loc-"]:not([data-testid="bg-loc-pawn-self"])'));
    const selfTiles = tiles
      .filter((t) => t.getAttribute('data-self-here') === 'true')
      .map((t) => t.getAttribute('data-testid'));
    const selfPawn = document.querySelector('[data-testid="bg-loc-pawn-self"]');
    return {
      selfTiles,
      initialSelected: selfPawn?.getAttribute('aria-pressed') ?? null,
    };
  });
  assert.equal(selfState.selfTiles.length, 1, `Expected exactly 1 tile with data-self-here="true", got ${JSON.stringify(selfState)}`);
  const selfPawn = page.locator('[data-testid="bg-loc-pawn-self"]').first();
  await selfPawn.focus();
  await page.keyboard.press('Enter');
  const expectedAfterFirstEnter = selfState.initialSelected === 'true' ? 'false' : 'true';
  assert.equal(
    await selfPawn.getAttribute('aria-pressed'),
    expectedAfterFirstEnter,
    'Pressing Enter on focused pawn must toggle selection state',
  );
  assert.equal(
    await selfPawn.getAttribute('data-selected'),
    expectedAfterFirstEnter,
    'Pawn data-selected must match aria-pressed after keyboard Enter',
  );
  // Restore selection state
  await page.keyboard.press('Enter');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(100);
}

async function settleBoardLayoutAnimations(page, minWaitMs = 180) {
  await page.waitForTimeout(minWaitMs);
  await page.evaluate(async () => {
    const deadline = Date.now() + 2600;
    while (Date.now() < deadline) {
      const els = Array.from(document.querySelectorAll('[data-pawn-glide]'));
      const busy = els.some(
        (el) =>
          el.classList.contains('mn-pawn-touchdown-ripple') ||
          (typeof el.getAnimations === 'function' && el.getAnimations().length > 0),
      );
      if (!busy) break;
      await new Promise((r) => setTimeout(r, 60));
    }
  });
}

async function verifyDesktopTacticalLayoutV2(page, label = 'desktop', options = {}) {
  const { saveShots = false, afterPrefix = null, isSpectator = false } = options;
  const viewports = [
    { width: 1440, height: 900, requireZeroScroll: true, minTileHeight: 135, maxTileHeight: 155, shotName: 'tactical-v2-1440x900-role.png', suffix: '1440x900.png' },
    { width: 1280, height: 800, requireZeroScroll: true, minTileHeight: 120, maxTileHeight: 135, shotName: 'tactical-v2-1280x800.png', suffix: '1280x800.png' },
    { width: 1920, height: 1080, requireZeroScroll: true, minTileHeight: 160, maxTileHeight: 185, shotName: 'tactical-v2-1920x1080.png', suffix: '1920x1080.png' },
  ];
  const LOC_IDS = ['radio', 'lobby', 'breaker', 'canteen', 'corridor', 'court'];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await settleBoardLayoutAnimations(page, 180);

    const metrics = await page.evaluate((locIds) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const header = document.querySelector('[data-testid="bg-v3-status-bar"]');
      const boardCol = document.querySelector('[data-testid="bg-board-main-column"]');
      const sideDrawer = document.querySelector('[data-testid="bg-side-drawer"]');
      const damageTrack = document.querySelector('[data-testid="bg-damage-track"]');
      const diceTray = document.querySelector('[data-testid="bg-dice-tray"]');
      const actionBar =
        document.querySelector('[data-testid="bg-action-panel"]') ||
        document.querySelector('[data-testid="bg-waiting-turn-banner"]') ||
        document.querySelector('[data-testid="bg-action-spectator-banner"]');
      const scrollArea = document.querySelector('[data-testid="bg-board-scroll-area"]');

      const rectOf = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          left: Math.round(r.left),
          right: Math.round(r.right),
          width: Math.round(r.width),
          height: Math.round(r.height),
        };
      };
      const fontSizeOf = (el) =>
        el ? Math.round(parseFloat(window.getComputedStyle(el).fontSize || '0') * 10) / 10 : null;

      const locDetails = {};
      for (const id of locIds) {
        const el = document.querySelector(`[data-testid="bg-loc-${id}"]`);
        const diceEl = document.querySelector(`[data-testid="bg-tile-dice-${id}"]`);
        const nameEl = document.querySelector(`[data-testid="bg-tile-name-${id}"]`);
        const triggerEl = document.querySelector(`[data-testid="bg-tile-rule-trigger-${id}"]`);
        const iconEl = document.querySelector(`[data-testid="bg-tile-action-icon-${id}"]`);
        const actionLabelEl = document.querySelector(`[data-testid="bg-tile-action-label-${id}"]`);
        const pawnsEl = document.querySelector(`[data-testid="bg-tile-pawns-${id}"]`);
        const firstPawnText = pawnsEl?.querySelector(':scope > button > span, :scope > span');
        locDetails[id] = {
          rect: rectOf(el),
          diceRect: rectOf(diceEl),
          nameRect: rectOf(nameEl),
          iconRect: rectOf(iconEl),
          actionLabelRect: rectOf(actionLabelEl),
          pawnsRect: rectOf(pawnsEl),
          nameFontSize: fontSizeOf(nameEl),
          diceFontSize: fontSizeOf(diceEl),
          triggerFontSize: fontSizeOf(triggerEl),
          pawnTextFontSize: fontSizeOf(firstPawnText),
          tileOverflowX: el ? el.scrollWidth > el.clientWidth + 1 : false,
          hasStateAttrs: Boolean(
            el &&
              el.hasAttribute('data-self-here') &&
              el.hasAttribute('data-has-attackable') &&
              el.hasAttribute('data-destination-highlighted') &&
              el.hasAttribute('data-can-choose-dest') &&
              el.hasAttribute('data-location-selected'),
          ),
        };
      }

      const banners = [
        'bg-unread-clue-banner',
        'bg-last-investigation-banner',
        'bg-last-reveal-banner',
        'bg-emote-toast',
      ]
        .map((id) => ({ id, rect: rectOf(document.querySelector(`[data-testid="${id}"]`)) }))
        .filter((b) => b.rect && b.rect.width > 0 && b.rect.height > 0);

      const headerButtons = header
        ? Array.from(header.querySelectorAll('button')).map((b) => rectOf(b))
        : [];
      const diceTrayButtons = diceTray
        ? diceTray.querySelectorAll('button').length
        : 0;
      const actionPanelEl = document.querySelector('[data-testid="bg-action-panel"]');
      const primaryCtaCount = actionPanelEl
        ? actionPanelEl.querySelectorAll('[data-primary-cta="true"]').length
        : 0;
      const hasActionGuidance = Boolean(
        actionPanelEl?.querySelector('[data-testid="bg-action-guidance"]')?.textContent?.trim(),
      );

      const damageTrackExpanded = damageTrack?.getAttribute('data-expanded') || null;
      const woundChips = damageTrack
        ? Array.from(damageTrack.querySelectorAll('[data-testid^="bg-wound-chip-"]'))
        : [];
      const chipRects = woundChips.map((el) => el.getBoundingClientRect());
      let woundChipOverlaps = 0;
      for (let i = 0; i < chipRects.length; i++) {
        for (let j = i + 1; j < chipRects.length; j++) {
          const a = chipRects[i];
          const b = chipRects[j];
          const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          if (ix > 1 && iy > 1) woundChipOverlaps += 1;
        }
      }
      const turnHolderCount = woundChips.filter(
        (el) => el.getAttribute('data-turn-holder') === 'true',
      ).length;
      const damageTrackOverflowX = damageTrack
        ? damageTrack.scrollWidth > damageTrack.clientWidth + 1
        : false;

      return {
        vw,
        vh,
        docOverflowX: document.documentElement.scrollWidth > vw + 1,
        headerRect: rectOf(header),
        headerButtons,
        boardRect: rectOf(boardCol),
        sideRect: rectOf(sideDrawer),
        damageTrackRect: rectOf(damageTrack),
        damageTrackExpanded,
        woundChipCount: woundChips.length,
        turnHolderCount,
        damageTrackOverflowX,
        woundChipOverlaps,
        diceTrayRect: rectOf(diceTray),
        diceTrayButtons,
        actionBarRect: rectOf(actionBar),
        actionPanelExists: Boolean(actionPanelEl),
        primaryCtaCount,
        hasActionGuidance,
        boardScrollOverflowY: scrollArea
          ? scrollArea.scrollHeight - scrollArea.clientHeight
          : null,
        locDetails,
        banners,
        popoverCount: document.querySelectorAll('[data-testid^="bg-tile-rule-popover-"]').length,
        hasCollapsedRulesBtnOutsideSettings: Boolean(
          document.querySelector('[data-testid="bg-board-rules-btn"]'),
        ),
        hasDesktopTabs: Boolean(
          document.querySelector('[data-testid="bg-sidebar-tab-role"]') &&
            document.querySelector('[data-testid="bg-sidebar-tab-gear"]') &&
            document.querySelector('[data-testid="bg-sidebar-tab-log"]'),
        ),
      };
    }, LOC_IDS);

    const tag = `[${label} @ ${vp.width}x${vp.height}]`;
    assert.equal(metrics.docOverflowX, false, `${tag} must have zero horizontal overflow`);
    assert.equal(metrics.diceTrayButtons, 0, `${tag} Dice Tray must be display-only (zero interactive buttons)`);
    if (!isSpectator && metrics.actionPanelExists) {
      assert.equal(metrics.primaryCtaCount, 1, `${tag} Action Panel must expose exactly 1 primary CTA`);
      assert.equal(metrics.hasActionGuidance, true, `${tag} Action Panel must display concise guidance`);
    }
    assert.ok(metrics.headerRect && metrics.headerRect.height <= 48, `${tag} header must be 1 row (<=48px), got ${metrics.headerRect?.height}`);
    assert.equal(
      metrics.hasCollapsedRulesBtnOutsideSettings,
      false,
      `${tag} secondary rules button must be collapsed into Settings`,
    );
    assert.equal(metrics.hasDesktopTabs, true, `${tag} must render all 3 desktop sidebar tabs`);
    assert.equal(metrics.popoverCount, 0, `${tag} rule popovers must stay closed unless hovered/focused/clicked`);

    if (metrics.headerButtons.length >= 2) {
      const top0 = metrics.headerButtons[0].top;
      for (const hb of metrics.headerButtons) {
        assert.ok(Math.abs(hb.top - top0) <= 6, `${tag} header buttons wrapped onto multiple lines`);
      }
    }

    assert.ok(metrics.boardRect && metrics.sideRect, `${tag} board column and sidebar must be visible`);
    const totalColWidth = metrics.boardRect.width + metrics.sideRect.width;
    const boardRatio = metrics.boardRect.width / totalColWidth;
    assert.ok(
      boardRatio >= 0.71 && boardRatio <= 0.79,
      `${tag} board/sidebar split must be ~75/25, got ${(boardRatio * 100).toFixed(1)}% (${metrics.boardRect.width}/${totalColWidth})`,
    );
    assert.ok(
      metrics.boardRect.right <= metrics.sideRect.left + 1,
      `${tag} board and sidebar must not overlap horizontally`,
    );

    if (vp.requireZeroScroll) {
      assert.ok(
        metrics.damageTrackRect &&
          metrics.damageTrackRect.top >= 0 &&
          metrics.damageTrackRect.bottom <= vp.height,
        `${tag} damage track must fit inside viewport: ${JSON.stringify(metrics.damageTrackRect)}`,
      );
      assert.equal(
        metrics.damageTrackExpanded,
        'false',
        `${tag} damage track must stay collapsed (compact) by default`,
      );
      assert.ok(
        metrics.damageTrackRect.height <= 56,
        `${tag} compact damage track height (${metrics.damageTrackRect.height}px) must be <= 56px`,
      );
      assert.equal(metrics.damageTrackOverflowX, false, `${tag} damage track must not overflow horizontally`);
      assert.equal(metrics.woundChipOverlaps, 0, `${tag} damage track player chips must not overlap`);
      assert.ok(metrics.woundChipCount >= 4, `${tag} expected player wound chips rendered`);
      assert.equal(metrics.turnHolderCount, 1, `${tag} expected exactly 1 highlighted turn holder in damage track`);
      assert.ok(
        metrics.diceTrayRect &&
          metrics.diceTrayRect.top >= 0 &&
          metrics.diceTrayRect.bottom <= vp.height,
        `${tag} dice tray must fit inside viewport: ${JSON.stringify(metrics.diceTrayRect)}`,
      );
      assert.ok(
        metrics.actionBarRect &&
          metrics.actionBarRect.top >= 0 &&
          metrics.actionBarRect.bottom <= vp.height,
        `${tag} primary action bar must fit inside viewport: ${JSON.stringify(metrics.actionBarRect)}`,
      );
      let minTileTop = Infinity;
      let maxTileBottom = -Infinity;
      for (const id of LOC_IDS) {
        const d = metrics.locDetails[id];
        const lr = d.rect;
        assert.ok(
          lr && lr.width > 0 && lr.height > 0 && lr.top >= 0 && lr.bottom <= vp.height,
          `${tag} location "${id}" must fit cleanly in viewport: ${JSON.stringify(lr)}`,
        );
        minTileTop = Math.min(minTileTop, lr.top);
        maxTileBottom = Math.max(maxTileBottom, lr.bottom);
        assert.ok(
          lr.height >= vp.minTileHeight && lr.height <= vp.maxTileHeight,
          `${tag} location "${id}" height (${lr.height}px) must stay within adaptive band [${vp.minTileHeight}, ${vp.maxTileHeight}]`,
        );
        assert.equal(d.tileOverflowX, false, `${tag} location "${id}" must not overflow horizontally`);
        assert.equal(d.hasStateAttrs, true, `${tag} location "${id}" missing tactical state data-attributes`);
        assert.ok(d.diceRect && d.diceRect.width > 0 && d.diceRect.height > 0, `${tag} location "${id}" dice badge must be visible`);
        assert.ok(d.nameRect && d.nameRect.width > 0 && d.nameRect.height > 0, `${tag} location "${id}" title must be visible`);
        assert.ok(d.iconRect && d.iconRect.width > 0 && d.iconRect.height > 0, `${tag} location "${id}" action icon must be visible`);
        assert.ok(d.actionLabelRect && d.actionLabelRect.width > 0 && d.actionLabelRect.height > 0, `${tag} location "${id}" short action label must be visible`);
        assert.ok(d.pawnsRect && d.pawnsRect.width > 0 && d.pawnsRect.height > 0, `${tag} location "${id}" pawn tray must be visible`);
        assert.ok(
          d.nameFontSize >= 14 && d.nameFontSize <= 16,
          `${tag} location "${id}" title fontSize (${d.nameFontSize}px) must be 14–16px`,
        );
        assert.ok(d.diceFontSize >= 12, `${tag} location "${id}" dice fontSize (${d.diceFontSize}px) must be >= 12px`);
        assert.ok(d.triggerFontSize >= 12, `${tag} location "${id}" action label fontSize (${d.triggerFontSize}px) must be >= 12px`);
        if (d.pawnTextFontSize !== null) {
          assert.ok(d.pawnTextFontSize >= 12, `${tag} location "${id}" pawn fontSize (${d.pawnTextFontSize}px) must be >= 12px`);
        }

        for (const banner of metrics.banners) {
          const br = banner.rect;
          const overlaps =
            br.left < lr.right - 1 &&
            br.right > lr.left + 1 &&
            br.top < lr.bottom - 1 &&
            br.bottom > lr.top + 1;
          assert.equal(
            overlaps,
            false,
            `${tag} banner "${banner.id}" (${JSON.stringify(br)}) must not occlude location "${id}" (${JSON.stringify(lr)})`,
          );
        }
      }
      const gapTop = minTileTop - metrics.damageTrackRect.bottom;
      const gapBottom = metrics.diceTrayRect.top - maxTileBottom;
      assert.ok(
        gapTop >= 0 && gapTop <= 48,
        `${tag} vertical gap between Damage Track and Location Tiles must be balanced (<=48px), got ${gapTop}px`,
      );
      assert.ok(
        gapBottom >= 0 && gapBottom <= 48,
        `${tag} vertical gap between Location Tiles and Dice Tray must be balanced (<=48px), got ${gapBottom}px`,
      );
    }

    if (saveShots && vp.shotName) {
      await page.screenshot({ path: path.join(SHOT_DIR, vp.shotName) });
      if (afterPrefix && vp.suffix) {
        await page.screenshot({ path: path.join(SHOT_DIR, `${afterPrefix}-${vp.suffix}`) });
      }
    }
  }

  // Test switching across 3 desktop sidebar tabs & restoring to default 1280x800
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('[data-testid="bg-sidebar-tab-gear"]').click();
  await page.waitForSelector('[data-testid="bg-sidebar-gear-panel"]', { timeout: 3000 });
  if (saveShots) {
    await page.locator('[data-testid="bg-graphics-settings-btn"]').click();
    await page.waitForSelector('[data-testid="bg-graphics-settings-panel"]', { timeout: 3000 });
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(SHOT_DIR, 'tactical-v2-1440x900-gear-settings.png') });
    await page.locator('[data-testid="bg-graphics-settings-btn"]').click();
    await page
      .locator('[data-testid="bg-graphics-settings-panel"]')
      .waitFor({ state: 'detached', timeout: 3000 })
      .catch(() => undefined);
  }
  await page.locator('[data-testid="bg-sidebar-tab-log"]').click();
  await page.waitForSelector('[data-testid="bg-game-log"]', { timeout: 3000 });
  if (saveShots) {
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(SHOT_DIR, 'tactical-v2-1440x900-log.png') });
  }
  await page.locator('[data-testid="bg-sidebar-tab-role"]').click();
  if (isSpectator) {
    await page.waitForSelector('[data-testid="bg-spectator-role-placeholder"]', { timeout: 3000 });
    assert.equal(await page.locator('[data-testid="bg-role-card-secret"]').count(), 0);
  } else {
    await page.waitForSelector('[data-testid="bg-role-card-secret"]', { timeout: 3000 });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(120);
}

async function verifyPhase3ContextualUi(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await settleBoardLayoutAnimations(page, 140);

  const measureTilesAndViewport = async () =>
    page.evaluate(() => {
      const ids = ['radio', 'lobby', 'breaker', 'canteen', 'corridor', 'court'];
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const tiles = {};
      for (const id of ids) {
        const el = document.querySelector(`[data-testid="bg-loc-${id}"]`);
        const r = el?.getBoundingClientRect();
        tiles[id] = r
          ? {
              top: Math.round(r.top),
              bottom: Math.round(r.bottom),
              left: Math.round(r.left),
              width: Math.round(r.width),
              height: Math.round(r.height),
            }
          : null;
      }
      return {
        vw,
        vh,
        docOverflowX: document.documentElement.scrollWidth > vw + 1,
        tiles,
      };
    });

  const beforeTiles = await measureTilesAndViewport();

  // 1. Select any non-destination location tile by clicking its middle artwork strip
  const inspectTile = page
    .locator('[data-testid^="bg-loc-"][data-can-choose-dest="false"]')
    .first();
  const box = await inspectTile.boundingBox();
  assert.ok(box && box.height > 80, 'Inspectable location tile must have Phase 2.1 height');
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.55);

  const locContextBar = page.locator('[data-testid="bg-tactical-context-bar"][data-context-kind="location"]');
  await locContextBar.waitFor({ state: 'visible', timeout: 3000 });
  const locCtxSnap = await measureTilesAndViewport();
  assert.equal(locCtxSnap.docOverflowX, false, 'Location context bar must not overflow 1440x900 horizontally');
  for (const [id, r] of Object.entries(locCtxSnap.tiles)) {
    assert.ok(r && r.height >= 135 && r.height <= 155 && r.bottom <= 900, `Location context altered tile ${id} bounds: ${JSON.stringify(r)}`);
  }
  await page.screenshot({ path: path.join(SHOT_DIR, 'phase3-after-1440x900-context-location.png') });

  // 2. Select self player strip card -> player context bar without HP leak
  await page.locator('[data-testid="bg-player-strip-self"]').click();
  const playerContextBar = page.locator('[data-testid="bg-tactical-context-bar"][data-context-kind="player"]');
  await playerContextBar.waitFor({ state: 'visible', timeout: 3000 });
  const playerCtxText = await playerContextBar.innerText();
  assert.equal(/\b\d+\s*\/\s*\d+\s*HP\b/i.test(playerCtxText), false, `Player context bar leaked HP ratio: ${playerCtxText}`);
  await page.screenshot({ path: path.join(SHOT_DIR, 'phase3-after-1440x900-context-player.png') });

  // 3. Clear context bar cleanly
  await page.locator('[data-testid="bg-clear-context-btn"]').click();
  assert.equal(await page.locator('[data-testid="bg-tactical-context-bar"]').count(), 0, 'Clear button must close tactical context bar');

  // 4. Secondary actions popover opens upward without shifting tiles, closes on Escape
  await ensureSecondaryMenuOpen(page);
  const afterMenuSnap = await measureTilesAndViewport();
  for (const id of Object.keys(beforeTiles.tiles)) {
    const b = beforeTiles.tiles[id];
    const a = afterMenuSnap.tiles[id];
    assert.ok(b && a && Math.abs(b.top - a.top) <= 1 && Math.abs(b.height - a.height) <= 1, `Secondary menu shifted tile ${id}`);
  }
  await page.screenshot({ path: path.join(SHOT_DIR, 'phase3-after-1440x900-secondary-menu.png') });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="bg-secondary-actions-menu"]').length === 0, null, { timeout: 2000 });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(100);
}

async function verifyPhase4CompactDamageTrack(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await settleBoardLayoutAnimations(page, 140);

  const track = page.locator('[data-testid="bg-damage-track"]');
  const toggleBtn = page.locator('[data-testid="bg-damage-track-toggle"]');
  const drawer = page.locator('[data-testid="bg-damage-track-drawer"]');

  // 1. Default compact state: collapsed, concise HP secrecy preserved (no secret /MaxHP or HP keyword)
  assert.equal(await track.getAttribute('data-expanded'), 'false', 'Damage Track must default to compact');
  assert.equal(await drawer.getAttribute('aria-hidden'), 'true', 'Expanded 0-14 drawer must stay hidden by default');
  const compactAudit = await page.evaluate(() => {
    const t = document.querySelector('[data-testid="bg-damage-track"]');
    const chips = Array.from(document.querySelectorAll('[data-testid^="bg-wound-chip-"]'));
    return {
      height: t ? Math.round(t.getBoundingClientRect().height) : 0,
      hasHpWordLeak: chips.some((c) => /\bHP\b/i.test(c.textContent || '')),
    };
  });
  assert.ok(compactAudit.height <= 56, `Default Damage Track height (${compactAudit.height}px) must stay compact <= 56px`);
  assert.equal(compactAudit.hasHpWordLeak, false, 'Compact chips must never display HP label');

  // 2. Smoothly expand to view full 0-14 track while keeping all 6 tiles & action panel in viewport
  await toggleBtn.click();
  await page.waitForFunction(
    (minH) => {
      const t = document.querySelector('[data-testid="bg-damage-track"]');
      return Boolean(
        t &&
          t.getAttribute('data-expanded') === 'true' &&
          Math.round(t.getBoundingClientRect().height) > minH,
      );
    },
    compactAudit.height + 40,
    { timeout: 2500, polling: 40 },
  );
  assert.equal(await track.getAttribute('data-expanded'), 'true', 'Toggle must expand Damage Track');
  assert.equal(await drawer.getAttribute('aria-hidden'), 'false', 'Expanded 0-14 drawer must set aria-hidden=false');
  const expandedCheck = await page.evaluate(() => {
    const t = document.querySelector('[data-testid="bg-damage-track"]');
    const grid = document.querySelector('[data-testid="bg-damage-track-grid"]');
    const action = document.querySelector('[data-testid="bg-action-panel"]');
    const actionRect = action?.getBoundingClientRect();
    return {
      trackHeight: t ? Math.round(t.getBoundingClientRect().height) : 0,
      notchCount: grid ? grid.children.length : 0,
      actionBottom: actionRect ? Math.round(actionRect.bottom) : 0,
      vh: window.innerHeight,
    };
  });
  assert.equal(expandedCheck.notchCount, 15, 'Expanded track must display all 15 notches (0..14)');
  assert.ok(
    expandedCheck.trackHeight > compactAudit.height + 20,
    `Expanded track (${expandedCheck.trackHeight}px vs compact ${compactAudit.height}px) must reveal full 0..14 notches`,
  );
  assert.ok(expandedCheck.actionBottom <= expandedCheck.vh, `Expanded Damage Track pushed action bar outside 900vh: ${expandedCheck.actionBottom}`);
  await page.screenshot({ path: path.join(SHOT_DIR, 'phase5-after-1440x900-expanded.png') });

  // 3. Collapse back smoothly
  await toggleBtn.click();
  await page.waitForFunction(
    () => {
      const t = document.querySelector('[data-testid="bg-damage-track"]');
      return Boolean(
        t &&
          t.getAttribute('data-expanded') === 'false' &&
          Math.round(t.getBoundingClientRect().height) <= 56,
      );
    },
    null,
    { timeout: 2500, polling: 40 },
  );
  assert.equal(await track.getAttribute('data-expanded'), 'false', 'Toggle must collapse Damage Track');
  const recollapsedHeight = await page.evaluate(() =>
    Math.round(document.querySelector('[data-testid="bg-damage-track"]')?.getBoundingClientRect().height || 0),
  );
  assert.ok(recollapsedHeight <= 56, `Collapsed Damage Track height (${recollapsedHeight}px) must restore <= 56px`);

  // 4. Reduced Motion support: zero CSS transition delay/duration during expand/collapse
  await clickControlViaSettingsIfCollapsed(page, 'bg-vfx-motion-toggle-btn');
  await page.waitForSelector('[data-testid="bg-vfx-stage"][data-reduced-motion="true"]', { timeout: 3000 });
  const rmDuration = await page.evaluate(() => {
    const d = document.querySelector('[data-testid="bg-damage-track-drawer"]');
    return d ? window.getComputedStyle(d).transitionDuration : '';
  });
  assert.equal(rmDuration, '0s', `Reduced Motion drawer transitionDuration must be 0s, got "${rmDuration}"`);
  await toggleBtn.click();
  assert.equal(await track.getAttribute('data-expanded'), 'true', 'Reduced Motion expand must update state immediately');
  await toggleBtn.click();
  assert.equal(await track.getAttribute('data-expanded'), 'false', 'Reduced Motion collapse must update state immediately');
  await clickControlViaSettingsIfCollapsed(page, 'bg-vfx-motion-toggle-btn');
  await page.waitForSelector('[data-testid="bg-vfx-stage"][data-reduced-motion="false"]', { timeout: 3000 });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(100);
}

async function verifyPhase5FinalPolishAndPerf(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await settleBoardLayoutAnimations(page, 140);

  // 1. Keyboard Navigation (:focus-visible rings) + Expand/Collapse Damage Track + Escape dismissal
  await page.locator('[data-testid="bg-wound-chip-1"]').focus();
  await page.keyboard.press('Shift+Tab');
  const chipFocusAudit = await page.evaluate(() => {
    const el = document.activeElement;
    const cs = el ? window.getComputedStyle(el) : null;
    return {
      testId: el?.getAttribute('data-testid') || null,
      focusVisible: Boolean(el && el.matches(':focus-visible')),
      boxShadow: cs ? cs.boxShadow : 'none',
    };
  });
  assert.equal(chipFocusAudit.testId, 'bg-wound-chip-0', 'Shift+Tab from chip 1 must focus chip 0');
  assert.equal(chipFocusAudit.focusVisible, true, 'Keyboard focus on wound chip 0 must match :focus-visible');
  assert.notEqual(chipFocusAudit.boxShadow, 'none', 'Wound chip focus ring must render visible boxShadow');

  // Press Enter to select player 0 -> context bar + chip state sync -> Enter again to deselect
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-testid="bg-tactical-context-bar"][data-context-kind="player"]', { timeout: 3000 });
  assert.equal(
    await page.locator('[data-testid="bg-wound-chip-0"]').getAttribute('aria-pressed'),
    'true',
    'Keyboard Enter on wound chip must select player',
  );
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="bg-tactical-context-bar"]').length === 0,
    null,
    { timeout: 2500 },
  );

  // Tab from last wound chip to Damage Track toggle, press Enter to expand, press Escape to collapse
  await page.locator('[data-testid="bg-wound-chip-3"]').focus();
  await page.keyboard.press('Tab');
  const toggleFocusAudit = await page.evaluate(() => {
    const el = document.activeElement;
    const cs = el ? window.getComputedStyle(el) : null;
    return {
      testId: el?.getAttribute('data-testid') || null,
      focusVisible: Boolean(el && el.matches(':focus-visible')),
      boxShadow: cs ? cs.boxShadow : 'none',
    };
  });
  assert.equal(toggleFocusAudit.testId, 'bg-damage-track-toggle', 'Tab from last wound chip must focus toggle button');
  assert.equal(toggleFocusAudit.focusVisible, true, 'Toggle button must match :focus-visible');
  assert.notEqual(toggleFocusAudit.boxShadow, 'none', 'Toggle button must show focus ring');
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => document.querySelector('[data-testid="bg-damage-track"]')?.getAttribute('data-expanded') === 'true',
    null,
    { timeout: 2500 },
  );
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => document.querySelector('[data-testid="bg-damage-track"]')?.getAttribute('data-expanded') === 'false',
    null,
    { timeout: 2500 },
  );

  // Tab from radio tile to rule trigger, then Escape closes tooltip/popover
  await page.locator('[data-testid="bg-loc-radio"]').focus();
  await page.keyboard.press('Tab');
  await page.waitForSelector('[data-testid="bg-tile-rule-popover-radio"]', { timeout: 3000 });
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="bg-tile-rule-popover-radio"]').length === 0,
    null,
    { timeout: 2500 },
  );

  // Keyboard open Settings Panel & Escape dismiss
  await page.locator('[data-testid="bg-board-leave-btn"]').focus();
  await page.keyboard.press('Shift+Tab');
  assert.equal(
    await page.evaluate(() => document.activeElement?.getAttribute('data-testid')),
    'bg-graphics-settings-btn',
  );
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-testid="bg-graphics-settings-panel"]', { timeout: 3000 });
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="bg-graphics-settings-panel"]').length === 0,
    null,
    { timeout: 2500 },
  );

  // 2. Bottom Player Strip de-duplication + P0 Secrecy Tooltip/aria-label Audit
  const uiPolishAudit = await page.evaluate(() => {
    const board = document.querySelector('[data-testid="boardgame-2d-board"]');
    if (!board) return { missingBoard: true };
    const stripCards = Array.from(document.querySelectorAll('[data-testid^="bg-player-strip-card-"]'));
    const duplicateWoundBadges = stripCards.filter((el) => (el.textContent || '').includes('🩸')).length;

    const clone = board.cloneNode(true);
    clone.querySelectorAll('[data-testid="bg-role-card-secret"]').forEach((el) => el.remove());
    const textMatch = (clone.textContent || '').match(/\b\d+\s*\/\s*\d+\s*HP\b/i);
    const leakedAttr = Array.from(clone.querySelectorAll('[title], [aria-label]'))
      .map((el) => `${el.getAttribute('title') || ''} ${el.getAttribute('aria-label') || ''}`.trim())
      .find((s) => /\b\d+\s*\/\s*\d+\s*HP\b/i.test(s) || /Đội Săn Đêm|Hội Bóng Đêm|Kẻ Độc Hành/.test(s));

    return {
      stripCount: stripCards.length,
      duplicateWoundBadges,
      publicHpTextLeak: textMatch ? textMatch[0] : null,
      leakedAttr: leakedAttr || null,
    };
  });
  assert.equal(uiPolishAudit.missingBoard, undefined);
  assert.equal(uiPolishAudit.stripCount, 4);
  assert.equal(uiPolishAudit.duplicateWoundBadges, 0, 'Bottom Player Strip must not duplicate Damage Track wound badges');
  assert.equal(uiPolishAudit.publicHpTextLeak, null, `Public DOM leaked HP ratio: ${uiPolishAudit.publicHpTextLeak}`);
  assert.equal(uiPolishAudit.leakedAttr, null, `Public tooltip/aria-label leaked secret info: ${uiPolishAudit.leakedAttr}`);

  // 3. Skip Animation verification
  await clickControlViaSettingsIfCollapsed(page, 'bg-panel-skip-cinematic-btn');
  assert.equal(
    await page.locator('[data-testid="bg-dice-tray"]').getAttribute('data-dice-settled'),
    'true',
    'Skip Animation must guarantee settled Dice Tray state',
  );
  await page.waitForTimeout(140);

  // 4. Live GameBoard rAF FPS & smooth frame-time verification at 1440x900 (skip 2 warm-up ticks, record 35 steady frames)
  const fpsProbe = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const stamps = [];
        let tick = 0;
        const step = (ts) => {
          tick += 1;
          if (tick > 2) {
            stamps.push(ts);
          }
          if (stamps.length < 36) {
            requestAnimationFrame(step);
          } else {
            const deltas = [];
            for (let i = 1; i < stamps.length; i++) {
              deltas.push(stamps[i] - stamps[i - 1]);
            }
            const sorted = [...deltas].sort((a, b) => a - b);
            const totalMs = stamps[stamps.length - 1] - stamps[0];
            const fps = totalMs > 0 ? Math.round(((stamps.length - 1) * 10000) / totalMs) / 10 : 0;
            const p50DeltaMs = Math.round((sorted[Math.floor(sorted.length * 0.5)] || 0) * 10) / 10;
            const p95DeltaMs = Math.round((sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] || 0) * 10) / 10;
            const maxDeltaMs = Math.round(Math.max(...deltas) * 10) / 10;
            resolve({ fps, p50DeltaMs, p95DeltaMs, maxDeltaMs, frames: deltas.length });
          }
        };
        requestAnimationFrame(step);
      }),
  );
  console.log(
    `  [Phase 5 Live Board FPS Probe @ 1440x900] ${fpsProbe.fps} FPS (p50=${fpsProbe.p50DeltaMs}ms, p95=${fpsProbe.p95DeltaMs}ms, max=${fpsProbe.maxDeltaMs}ms)`,
  );
  assert.ok(fpsProbe.fps >= 15, `Live GameBoard FPS too low under multi-browser SwiftShader: ${fpsProbe.fps}`);
  assert.ok(fpsProbe.p95DeltaMs < 200, `Live GameBoard p95 frame time >= 200ms: ${fpsProbe.p95DeltaMs}ms`);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(100);
}

function verifyCommonAudits(items) {
  const tokens = items.map((p) => p.audit.selfReconnectToken).filter(Boolean);
  assert.equal(new Set(tokens).size, tokens.length, 'All reconnectTokens must be globally distinct');

  for (let i = 0; i < items.length; i++) {
    const p = items[i];
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const otherToken = items[j].audit.selfReconnectToken;
      if (!otherToken) continue;
      for (const frame of p.audit.rawFrames) {
        assert.equal(
          frame.includes(otherToken),
          false,
          `${p.audit.label}: reconnectToken of ${items[j].audit.label} leaked in WS frame!`,
        );
      }
    }
    assert.ok(p.audit.wsFramesChecked > 0, `${p.audit.label} must receive live WS frames`);
    assert.equal(
      p.audit.auditErrors.length,
      0,
      `${p.audit.label} WS audit errors: ${p.audit.auditErrors.join('; ')}`,
    );
    assert.equal(
      p.audit.pageErrors.length,
      0,
      `${p.audit.label} page errors: ${p.audit.pageErrors.join('; ')}`,
    );
  }
}

async function captureFailureArtifacts(scenarioId, entries, error) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const trace = {
    scenario: scenarioId,
    error: error instanceof Error ? `${error.message}\n${error.stack}` : String(error),
    pages: [],
  };
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry?.page || entry.page.isClosed()) continue;
    const label = entry.label || entry.audit?.label || `page-${i}`;
    if (!entry.isPeer) {
      const shotPath = path.join(SHOT_DIR, `failure-${scenarioId}-${label}.png`);
      await Promise.race([
        entry.page.screenshot({ path: shotPath, timeout: 15000 }).catch(() => undefined),
        new Promise((r) => setTimeout(r, 16000)),
      ]);
    }
    trace.pages.push({
      label,
      url: entry.page.url(),
      auditErrors: entry.audit?.auditErrors || [],
      pageErrors: entry.audit?.pageErrors || [],
      lastFrames: (entry.audit?.rawFrames || []).slice(-5),
    });
  }
  console.error('[E2E FAILURE TRACE]', JSON.stringify(trace));
  fs.writeFileSync(
    path.join(SHOT_DIR, `failure-${scenarioId}-trace.json`),
    JSON.stringify(trace, null, 2),
    'utf8',
  );
}

// ===========================================================================
// E2E-01 & E2E-04: 4-Player Full Lifecycle + Mobile (390x844) Playability
// ===========================================================================
async function runE2E01AndE2E04(chromium, launchOpts, peerBrowser, outUrl, shim) {
  console.log('[E2E-01 & E2E-04] Running 4-player mixed Desktop+Mobile lifecycle...');
  const browsers = [];
  const contexts = [];
  const uiPlayers = [];
  const allAudited = [];
  try {
    const p1 = {
      user: TEST_USERS[0],
      ...(await setupPlayerContext(chromium, launchOpts, TEST_USERS[0], shim.wsBaseUrl)),
    };
    browsers.push(p1.browser);
    contexts.push(p1.context);
    uiPlayers.push(p1);
    allAudited.push(p1);

    // Step 1: P1 Host sits at Table 1 -> auto-create Lobby bar on HUD
    await enterCampusAndWaitHook(p1.page, outUrl, p1.audit);
    await p1.page.evaluate(() => window.__bkhn.enterBoardGameClub());
    await p1.page.waitForSelector('[data-testid="boardgame-club-hud"]', { timeout: UI_TIMEOUT });
    await p1.page.locator('[data-testid="bg-toggle-lobby-btn"]').click();
    await p1.page.waitForSelector('[data-testid="boardgame-lobby-modal"]', { timeout: UI_TIMEOUT });
    await p1.page.locator('[data-testid="bg-sit-table-1-btn"]').click();
    await p1.page.waitForSelector('[data-testid="bg-hud-invite-code"]', { timeout: UI_TIMEOUT });

    const inviteCode = (await p1.page.locator('[data-testid="bg-hud-invite-code"]').innerText()).trim();
    assert.match(inviteCode, /^[A-Z0-9]{6}$/, `Invalid invite code: "${inviteCode}"`);
    await p1.page.locator('[data-testid="bg-hud-copy-link-btn"]').click();
    await setPage3DPaused(p1.page, true);

    const dirRes = await fetch(`${shim.httpBaseUrl}/api/boardgame/matches`);
    const dirJson = await dirRes.json();
    const matchInfo = (dirJson.matches || []).find((m) => m.inviteCode === inviteCode);
    assert.ok(matchInfo, `Table 1 match ${inviteCode} must appear in directory`);

    // Step 2: P4 (Mobile 390x844) opens ?bgInvite=CODE, tests overflow, leaves, and re-joins via invite code input
    const p4 = {
      user: TEST_USERS[3],
      ...(await setupPlayerContext(chromium, launchOpts, TEST_USERS[3], shim.wsBaseUrl)),
    };
    browsers.push(p4.browser);
    contexts.push(p4.context);
    uiPlayers.push(p4);
    allAudited.push(p4);
    await p4.page.bringToFront();
    await p4.page.goto(`${outUrl}/?bgInvite=${inviteCode}`, { waitUntil: 'domcontentloaded' });
    const p4EnterBtn = p4.page.locator('#enter-campus');
    await p4EnterBtn.waitFor({ state: 'visible', timeout: 90000 });
    await p4EnterBtn.click({ timeout: 90000 });
    await p4.page.waitForSelector('[data-testid="boardgame-club-hud"]', { timeout: UI_TIMEOUT });
    await p4.page.waitForSelector('[data-testid="bg-ready-toggle-btn"]', { timeout: UI_TIMEOUT });
    const p4CleanedUrl = await p4.page.evaluate(() => window.location.search);
    assert.equal(p4CleanedUrl.includes('bgInvite='), false, 'URL query param ?bgInvite= must be stripped');
    // E2E-04: Mobile Lobby overflow check
    const mobileLobbyOverflow = await p4.page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    assert.equal(mobileLobbyOverflow, false, 'Mobile 390x844 Lobby must not overflow horizontally');

    // Exercise Leave + Manual Invite-Code Join on Mobile UI
    await p4.page.locator('[data-testid="bg-leave-match-btn"]').click();
    await p4.page.waitForSelector('[data-testid="bg-join-code-input"]', { timeout: UI_TIMEOUT });
    await p4.page.waitForTimeout(150);
    await p4.page.locator('[data-testid="bg-join-code-input"]').fill(inviteCode);
    await p4.page.locator('[data-testid="bg-join-code-btn"]').click();
    await p4.page.waitForSelector('[data-testid="bg-ready-toggle-btn"]', { timeout: UI_TIMEOUT });
    await p4.page.locator('[data-testid="bg-close-lobby-btn"]').click();
    await p4.page.waitForSelector('[data-testid="bg-hud-ready-btn"]', { timeout: UI_TIMEOUT });
    await setPage3DPaused(p4.page, true);

    // Step 3: Peers 2 & 3 join via lightweight Chromium WS peer pages (max 2 WebGL contexts active)
    const peerCtx = await peerBrowser.newContext({ viewport: { width: 800, height: 600 } });
    contexts.push(peerCtx);
    const peers = [];
    for (let seat = 2; seat < 4; seat++) {
      const peer = await createBrowserWsPeer(peerCtx, outUrl, shim.wsBaseUrl, TEST_USERS[seat - 1].name, seat);
      await peer.join(matchInfo.matchId, inviteCode, false);
      peers.push(peer);
      allAudited.push(peer);
    }

    await setPage3DPaused(p1.page, false);
    await p1.page.bringToFront();
    await p1.page.waitForFunction(
      () => document.querySelector('[data-testid="bg-hud-match-bar"]')?.textContent?.includes('/4 sẵn sàng'),
      null,
      { timeout: UI_TIMEOUT, polling: 200 },
    );
    await p1.page.waitForTimeout(350);
    await p1.page.screenshot({ path: path.join(SHOT_DIR, 'bg4-01-lobby-4p.png'), timeout: 120000 });
    await setPage3DPaused(p1.page, true);

    // Step 4: Start match from HUD
    for (const peer of peers) {
      await peer.setReady(true);
    }
    await p4.page.bringToFront();
    await p4.page.locator('[data-testid="bg-hud-ready-btn"]').click();
    await p1.page.bringToFront();
    await p1.page.waitForFunction(
      () => Boolean(document.querySelector('[data-testid="bg-hud-start-btn"]:not([disabled])')),
      null,
      { timeout: UI_TIMEOUT, polling: 200 },
    );
    await p1.page.locator('[data-testid="bg-hud-start-btn"]').click();

    for (const p of uiPlayers) {
      await p.page.bringToFront();
      await p.page.waitForSelector('[data-testid="boardgame-2d-board"]', { timeout: UI_TIMEOUT });
      if (!p.user.mobile) {
        await p.page.waitForSelector('[data-testid="bg-role-card"]', { timeout: UI_TIMEOUT });
      }
    }

    // E2E-04: Mobile 3-tab horizontal overflow + touch button geometry verification on P4
    await p4.page.bringToFront();
    const checkMobileOverflowAndTabs = async (tabName) => {
      const stats = await p4.page.evaluate(() => {
        const board = document.querySelector('[data-testid="boardgame-2d-board"]');
        const navBtns = Array.from(document.querySelectorAll('nav button')).map((el) => {
          const r = el.getBoundingClientRect();
          return { text: (el.textContent || '').trim(), w: r.width, h: r.height, left: r.left, right: r.right };
        });
        return {
          docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          boardOverflow: board ? board.scrollWidth > board.clientWidth + 1 : false,
          navBtns,
        };
      });
      assert.equal(
        stats.docOverflow || stats.boardOverflow,
        false,
        `Mobile 390x844 overflow on tab "${tabName}": ${JSON.stringify(stats)}`,
      );
      for (const b of stats.navBtns) {
        assert.ok(b.w >= 32 && b.h >= 32, `Mobile nav button "${b.text}" too small: ${b.w}x${b.h}`);
        assert.ok(b.left >= -1 && b.right <= 391, `Mobile nav button "${b.text}" clipped horizontally`);
      }
    };

    await p4.page.locator('button:has-text("Vai bí mật")').click();
    await p4.page.waitForSelector('[data-testid="bg-role-card-secret"]', { timeout: UI_TIMEOUT });
    assert.equal(await p4.page.locator('[data-testid="bg-role-card-facedown"]').count(), 0, 'Role card must render open directly without local facedown mask');
    assert.equal(await p4.page.locator('[data-testid="bg-toggle-role-card"]').count(), 0, 'Local toggle-role-card mask button must be removed');
    await checkMobileOverflowAndTabs('Vai bí mật');

    await p4.page.locator('button:has-text("Nhật ký")').click();
    await p4.page.waitForSelector('[data-testid="bg-game-log"]', { timeout: UI_TIMEOUT });
    await checkMobileOverflowAndTabs('Nhật ký');

    await p4.page.locator('button:has-text("Bàn & Lượt")').click();
    await p4.page.waitForSelector('[data-testid="bg-loc-corridor"]', { timeout: UI_TIMEOUT });
    await checkMobileOverflowAndTabs('Bàn & Lượt');
    await p4.page.screenshot({ path: path.join(SHOT_DIR, 'bg4-03-gameboard-mobile.png') });
    await p4.page.screenshot({ path: path.join(SHOT_DIR, 'polish-04-gameboard-mobile-390x844.png') });
    await p4.page.screenshot({ path: path.join(SHOT_DIR, 'tactical-v2-390x844-mobile.png') });
    await p4.page.screenshot({ path: path.join(SHOT_DIR, 'phase2-after-390x844-mobile.png') });

    // Rules modal, sound toggle, emote toast, Tactical V2 layout + HP leak check on P1 & P4
    await p1.page.bringToFront();
    await p1.page.waitForSelector('[data-testid="bg-v3-status-bar"]', { timeout: UI_TIMEOUT });
    const timerText = await p1.page.locator('[data-testid="bg-turn-timer"]').innerText();
    assert.ok(
      timerText.includes('Suy nghĩ tự do') || timerText.includes('∞'),
      `Default turn timer must show infinite thinking mode, got: ${timerText}`,
    );
    await verifyDesktopTacticalLayoutV2(p1.page, 'E2E-01-Initial');
    await verifyTilePopoverAndKeyboardA11y(p1.page);
    await clickControlViaSettingsIfCollapsed(p1.page, 'bg-board-rules-btn');
    await p1.page.waitForSelector('[data-testid="boardgame-rules-modal"]', { timeout: UI_TIMEOUT });
    const rulesModalText = await p1.page.locator('[data-testid="boardgame-rules-modal"]').innerText();
    assert.ok(
      rulesModalText.includes('Bối cảnh v4') && rulesModalText.includes('Bảo mật màn hình'),
      'Rules modal must reflect v4 mechanics',
    );
    await p1.page.locator('[data-testid="bg-close-rules-btn"]').click();

    await clickControlViaSettingsIfCollapsed(p1.page, 'bg-sound-toggle-btn', { keepOpen: true });
    await clickControlViaSettingsIfCollapsed(p1.page, 'bg-sound-toggle-btn');
    await p1.page.locator('[data-testid="bg-emote-wave"]').click();
    await p4.page.waitForSelector('[data-testid="bg-emote-toast"]', { timeout: UI_TIMEOUT });

    let activePlayer = null;
    for (let waitTurn = 0; waitTurn < 12; waitTurn++) {
      for (const p of uiPlayers) {
        if ((await p.page.locator('[data-testid="bg-action-panel"]').count()) > 0) {
          activePlayer = p;
          break;
        }
      }
      if (activePlayer) break;
      for (const peer of peers) {
        if (await peer.stepFullTurnIfActive(true)) break;
      }
      await new Promise((r) => setTimeout(r, 120));
    }
    assert.ok(activePlayer, 'Either P1 or P4 must display ActionPanel');
    await activePlayer.page.bringToFront();
    for (let s = 0; s < 5; s++) {
      const phaseAudit = await activePlayer.page.evaluate(() => {
        const panel = document.querySelector('[data-testid="bg-action-panel"]');
        if (!panel) return null;
        const atk = panel.querySelector('[data-testid="bg-attack-btn"]');
        return {
          primaryCount: panel.querySelectorAll('[data-primary-cta="true"]').length,
          hasGuidance: Boolean(panel.querySelector('[data-testid="bg-action-guidance"]')?.textContent?.trim()),
          inMainAction: Boolean(panel.querySelector('[data-testid="bg-end-turn-btn"]')),
          attackDisabled: Boolean(atk && atk.disabled),
          attackLockReason: atk?.getAttribute('data-lock-reason') || null,
          hasLockSummary: Boolean(panel.querySelector('[data-testid="bg-locked-reasons"]')),
        };
      });
      if (phaseAudit) {
        assert.equal(phaseAudit.primaryCount, 1, `Expected 1 primary CTA at step ${s}, got ${JSON.stringify(phaseAudit)}`);
        assert.equal(phaseAudit.hasGuidance, true, `Expected action guidance at step ${s}`);
        if (phaseAudit.inMainAction && phaseAudit.attackDisabled) {
          assert.ok(phaseAudit.attackLockReason && phaseAudit.hasLockSummary, `Disabled attack must display lock reason: ${JSON.stringify(phaseAudit)}`);
        }
      }
      if ((await activePlayer.page.locator('[data-testid="bg-end-turn-btn"]').count()) > 0) break;
      await playFirstValidStepOnPage(activePlayer.page, 0, undefined, {
        skipReveal: true,
      });
      await activePlayer.page.waitForTimeout(160);
    }
    assert.equal(
      await activePlayer.page.locator('[data-testid="bg-hand-masked-banner"]').count(),
      0,
      'Hand cards must render open directly without masked banner',
    );

    // Verify self-targeting never gets stuck on an opponent after clicking another player pill/card
    const otherPill = activePlayer.page.locator('[data-testid^="bg-target-pill-other-"]').first();
    await otherPill.click();
    assert.equal(
      await activePlayer.page.locator('[data-testid="bg-target-pill-self"]').getAttribute('aria-pressed'),
      'false',
      'Clicking opponent pill must leave bg-target-pill-self unpressed',
    );
    await activePlayer.page.locator('[data-testid="bg-target-pill-self"]').click();
    assert.equal(
      await activePlayer.page.locator('[data-testid="bg-target-pill-self"]').getAttribute('aria-pressed'),
      'true',
      'Clicking bg-target-pill-self must select self cleanly',
    );
    const stripSelf = activePlayer.page.locator('[data-testid="bg-player-strip-self"]');
    await stripSelf.click();
    assert.equal(
      await activePlayer.page.locator('[data-testid="bg-target-pill-self"]').getAttribute('aria-pressed'),
      'false',
      'Clicking self player strip card while selected must toggle selection back to null',
    );
    await stripSelf.click();
    assert.equal(
      await activePlayer.page.locator('[data-testid="bg-target-pill-self"]').getAttribute('aria-pressed'),
      'true',
      'Clicking self player strip card again must re-select self',
    );

    const healSelectCount = await activePlayer.page.locator('[data-testid^="bg-heal-select-"]').count();
    if (healSelectCount > 0) {
      const healSel = activePlayer.page.locator('[data-testid^="bg-heal-select-"]').first();
      const healCardId = (await healSel.getAttribute('data-testid')).replace('bg-heal-select-', '');
      const initialHealTarget = await healSel.inputValue();
      assert.equal(
        initialHealTarget,
        activePlayer.audit.selfPlayerId,
        'Single-player healing card select must default to self even after clicking opponents',
      );
      const optionVals = await healSel.locator('option').evaluateAll((els) => els.map((o) => o.value));
      if (optionVals.length > 1) {
        await healSel.selectOption(optionVals[1]);
        await healSel.selectOption(activePlayer.audit.selfPlayerId);
      }
      const healBtnText = await activePlayer.page.locator(`[data-testid="bg-use-card-${healCardId}"]`).innerText();
      assert.ok(healBtnText.includes('(Bạn)'), `Heal button must target self after reset, got: ${healBtnText}`);
    }

    assert.equal(
      await activePlayer.page.locator('[data-testid="bg-reveal-role-btn"]').count(),
      0,
      'Secondary reveal button must stay collapsed inside menu by default',
    );
    assert.equal(
      await activePlayer.page.locator('[data-testid="bg-use-skill-btn"]').count(),
      0,
      'Secondary skill button must stay collapsed inside menu by default',
    );
    await ensureSecondaryMenuOpen(activePlayer.page);
    if ((await activePlayer.page.locator('[data-testid="bg-skill-locked-reason"]').count()) > 0) {
      const skillLockText = await activePlayer.page.locator('[data-testid="bg-skill-locked-reason"]').innerText();
      assert.ok(skillLockText.length > 0, 'Locked skill inside secondary menu must show reason');
    }
    if ((await activePlayer.page.locator('[data-testid="bg-reveal-role-btn"]').count()) > 0) {
      await activePlayer.page.locator('[data-testid="bg-reveal-role-btn"]').click();
      await activePlayer.page.waitForSelector('[data-testid="bg-confirm-reveal-btn"]', { timeout: UI_TIMEOUT });
      await activePlayer.page.waitForSelector('[data-testid="bg-cancel-reveal-btn"]', { timeout: UI_TIMEOUT });
      await activePlayer.page.locator('[data-testid="bg-cancel-reveal-btn"]').click();
      await activePlayer.page.waitForSelector('[data-testid="bg-reveal-role-btn"]', { timeout: UI_TIMEOUT });
      assert.equal(
        await activePlayer.page.locator('[data-testid="bg-confirm-reveal-btn"]').count(),
        0,
        'Cancelling reveal must dismiss bg-confirm-reveal-btn immediately',
      );
    }
    await activePlayer.page.keyboard.press('Escape');
    await activePlayer.page.waitForFunction(
      () => document.querySelectorAll('[data-testid="bg-secondary-actions-menu"]').length === 0,
      null,
      { timeout: 2000 },
    );

    for (let clr = 0; clr < 4; clr++) {
      const skipBtn = activePlayer.page.locator('[data-testid^="bg-skip-card-"]').first();
      const useBtn = activePlayer.page.locator('[data-testid^="bg-use-card-"]').first();
      if ((await skipBtn.count()) > 0 && (await skipBtn.isEnabled().catch(() => false))) {
        await skipBtn.click();
        await activePlayer.page.waitForTimeout(140);
      } else if ((await useBtn.count()) > 0 && (await useBtn.isEnabled().catch(() => false))) {
        await useBtn.click();
        await activePlayer.page.waitForTimeout(140);
      } else {
        break;
      }
    }
    const endTurnBtn = activePlayer.page.locator('[data-testid="bg-end-turn-btn"]');
    if ((await endTurnBtn.count()) > 0 && (await endTurnBtn.isEnabled().catch(() => false))) {
      await endTurnBtn.click();
    } else if ((await activePlayer.page.locator('[data-testid="bg-attack-btn"]').count()) > 0) {
      await activePlayer.page.locator('[data-testid="bg-attack-btn"]').click();
    }

    await p1.page.bringToFront();
    await p1.page.waitForSelector('[data-testid="bg-role-card-secret"]', { timeout: UI_TIMEOUT });
    assert.equal(
      await p1.page.locator('[data-testid="bg-role-card-facedown"]').count(),
      0,
      'Desktop P1 role card must be open by default',
    );
    const leakedHpText = await p1.page.evaluate(() => {
      const board = document.querySelector('[data-testid="boardgame-2d-board"]');
      if (!board) return 'MISSING_BOARD';
      const clone = board.cloneNode(true);
      clone.querySelectorAll('[data-testid="bg-role-card-secret"]').forEach((el) => el.remove());
      const match = (clone.textContent || '').match(/\b\d+\s*\/\s*\d+\s*HP\b/i);
      return match ? match[0] : null;
    });
    assert.equal(leakedHpText, null, `Public board leaked HP text: ${leakedHpText}`);
    await p1.page.evaluate(() =>
      Promise.all(
        Array.from(document.querySelectorAll('[data-testid="bg-role-card-secret"] img')).map((im) =>
          typeof im.decode === 'function' ? im.decode().catch(() => undefined) : Promise.resolve(),
        ),
      ),
    );
    await p1.page.waitForTimeout(250);
    await p1.page.screenshot({ path: path.join(SHOT_DIR, 'bg4-02-gameboard-desktop.png') });
    await p1.page.screenshot({ path: path.join(SHOT_DIR, 'polish-03-gameboard-desktop.png') });

    // Drive full 4-player match to FINISHED while explicitly verifying E2E-04 mobile turn execution on P4
    let finished = false;
    let lastBroughtIdx = -1;
    let p1DesktopActiveChecked = false;
    let p4MobileButtonsChecked = false;
    let p4MobileActionsExecuted = 0;
    const triedActionsPerTurn = new Set();

    for (let step = 0; step < 540; step++) {
      const modalVisible = await p1.page
        .evaluate(() => Boolean(document.querySelector('[data-testid="bg-match-result-modal"]')))
        .catch(() => false);
      if (modalVisible) {
        finished = true;
        break;
      }
      const panelFlags = await Promise.all(
        uiPlayers.map((p) =>
          p.page
            .evaluate(() =>
              Boolean(
                document.querySelector('[data-testid="bg-action-panel"]') ||
                  document.querySelector('[data-testid="bg-confirm-reveal-btn"]'),
              ),
            )
            .catch(() => false),
        ),
      );
      const activeIdx = panelFlags.findIndex(Boolean);
      if (activeIdx >= 0) {
        const activeUi = uiPlayers[activeIdx];
        if (activeIdx !== lastBroughtIdx) {
          await activeUi.page.bringToFront().catch(() => undefined);
          lastBroughtIdx = activeIdx;
        }
        if (activeUi === p1 && !p1DesktopActiveChecked) {
          const hasActionPanel = await p1.page.locator('[data-testid="bg-action-panel"]').count();
          if (hasActionPanel > 0) {
            await verifyDesktopTacticalLayoutV2(p1.page, 'E2E-01-ActiveTurn', {
              saveShots: true,
              afterPrefix: 'phase5-after',
            });
            await verifyTilePopoverAndKeyboardA11y(p1.page, { savePopoverShot: false });
            await verifyPhase3ContextualUi(p1.page);
            await verifyPhase4CompactDamageTrack(p1.page);
            await verifyPhase5FinalPolishAndPerf(p1.page);
            p1DesktopActiveChecked = true;
          }
        }
        if (activeUi === p4 && !p4MobileButtonsChecked) {
          const btnMetrics = await p4.page.evaluate(() =>
            Array.from(document.querySelectorAll('[data-testid="bg-action-panel"] button[data-testid]'))
              .filter((el) => {
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
              })
              .map((el) => {
                const r = el.getBoundingClientRect();
                return { id: el.getAttribute('data-testid'), w: r.width, h: r.height, left: r.left, right: r.right };
              }),
          );
          for (const m of btnMetrics) {
            assert.ok(m.h >= 32 && m.w >= 32, `Mobile action button ${m.id} hit box < 32px: ${m.w}x${m.h}`);
            assert.ok(m.left >= -1 && m.right <= 391, `Mobile action button ${m.id} off-screen: ${m.right}`);
          }
          // RC Mobile Check: Auto quality resolves to balanced & settings panel does not overflow 390x844
          const mobTier = await p4.page.locator('[data-testid="bg-vfx-stage"]').getAttribute('data-quality-tier');
          assert.equal(mobTier, 'balanced', 'Mobile 390x844 Auto quality tier must resolve to balanced');
          await p4.page.locator('[data-testid="bg-graphics-settings-btn"]').click();
          await p4.page.waitForSelector('[data-testid="bg-graphics-settings-panel"]', { timeout: 3000 });
          const panelOverflow = await p4.page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          );
          assert.ok(panelOverflow <= 1, `Mobile settings panel overflowed horizontally: ${panelOverflow}px`);
          await p4.page.locator('[data-testid="bg-graphics-settings-btn"]').click();
          await p4.page.locator('[data-testid="bg-graphics-settings-panel"]').waitFor({ state: 'detached', timeout: 3000 });
          p4MobileButtonsChecked = true;
        }
        const healSelectOnTurn = await activeUi.page
          .evaluate((selfId) => {
            const sel = document.querySelector('[data-testid^="bg-heal-select-"]');
            if (!sel) return null;
            const id = (sel.getAttribute('data-testid') || '').replace('bg-heal-select-', '');
            const btn = document.querySelector(`[data-testid="bg-use-card-${id}"]`);
            return {
              id,
              val: sel.value,
              selfId,
              btnText: btn ? (btn.textContent || '').trim() : '',
            };
          }, activeUi.audit.selfPlayerId)
          .catch(() => null);
        if (healSelectOnTurn) {
          assert.equal(
            healSelectOnTurn.val,
            healSelectOnTurn.selfId,
            `Heal card ${healSelectOnTurn.id} must default to self (${healSelectOnTurn.selfId})`,
          );
          assert.ok(
            healSelectOnTurn.btnText.includes('(Bạn)'),
            `Heal card button must display (Bạn) when targeting self, got: ${healSelectOnTurn.btnText}`,
          );
        }
        if (activeUi === p4) {
          const p4MaskedBefore = await p4.page
            .locator('[data-testid="bg-hand-masked-banner"]')
            .count()
            .catch(() => 0);
          assert.equal(
            p4MaskedBefore,
            0,
            'Mobile hand cards must never show local masked banner',
          );
        }
        const acted = await playFirstValidStepOnPage(activeUi.page, step, triedActionsPerTurn);
        if (acted && activeUi === p4) {
          p4MobileActionsExecuted += 1;
        }
        await new Promise((r) => setTimeout(r, acted ? 110 : 60));
      } else {
        let peerStepped = false;
        for (const peer of peers) {
          if (await peer.stepFullTurnIfActive(true)) {
            peerStepped = true;
            break;
          }
        }
        await new Promise((r) => setTimeout(r, peerStepped ? 50 : 60));
      }
    }
    assert.equal(finished, true, 'E2E-01 4-player match must reach FINISHED');
    assert.equal(
      p1DesktopActiveChecked,
      true,
      'E2E-01 desktop player P1 must reach an active turn and pass Desktop Tactical Layout V2 geometry audit',
    );
    assert.ok(
      p4MobileButtonsChecked && p4MobileActionsExecuted >= 2,
      `E2E-04 mobile player P4 must execute playable actions (${p4MobileActionsExecuted})`,
    );

    for (const p of uiPlayers) {
      await p.page.waitForSelector('[data-testid="bg-match-result-modal"]', { timeout: UI_TIMEOUT });
    }
    await p1.page.waitForSelector('[data-testid="bg-match-postcard-img"]', { timeout: UI_TIMEOUT });
    await p1.page.waitForSelector('[data-testid="bg-download-postcard-btn"]', { timeout: UI_TIMEOUT });
    const postcardMeta = await p1.page.evaluate(() => {
      const img = document.querySelector('[data-testid="bg-match-postcard-img"]');
      const link = document.querySelector('[data-testid="bg-download-postcard-btn"]');
      const modalText = document.querySelector('[data-testid="bg-match-result-modal"]')?.innerText || '';
      return {
        imgSrcPrefix: img ? img.getAttribute('src')?.slice(0, 22) : null,
        naturalWidth: img ? img.naturalWidth : 0,
        naturalHeight: img ? img.naturalHeight : 0,
        hrefPrefix: link ? link.getAttribute('href')?.slice(0, 22) : null,
        downloadAttr: link ? link.getAttribute('download') : null,
        modalText,
      };
    });
    assert.equal(postcardMeta.imgSrcPrefix, 'data:image/png;base64,');
    assert.equal(postcardMeta.naturalWidth, 1200);
    assert.equal(postcardMeta.naturalHeight, 675);
    assert.equal(postcardMeta.hrefPrefix, 'data:image/png;base64,');
    assert.ok(postcardMeta.downloadAttr?.endsWith('.png'));
    for (const mssv of ALL_TEST_MSSVS) {
      assert.equal(postcardMeta.modalText.includes(mssv), false, `MatchResult leaked MSSV ${mssv}`);
    }
    await p1.page.screenshot({ path: path.join(SHOT_DIR, 'bg4-04-match-result-postcard.png') });

    // Gate Leaderboard UI từ MatchResult (Tuần này / Lọc phe / Toàn thời gian & Zero-MSSV)
    await p1.page.locator('[data-testid="bg-result-open-leaderboard-btn"]').click();
    await p1.page.waitForSelector('[data-testid="boardgame-leaderboard-modal"]', { timeout: UI_TIMEOUT });
    await p1.page.waitForFunction(
      () => document.querySelectorAll('[data-testid="bg-leaderboard-row"]').length >= 4,
      null,
      { timeout: UI_TIMEOUT },
    );
    const lbModalText = await p1.page
      .locator('[data-testid="boardgame-leaderboard-modal"]')
      .innerText();
    for (const mssv of ALL_TEST_MSSVS) {
      assert.equal(lbModalText.includes(mssv), false, `Leaderboard leaked MSSV ${mssv}`);
    }
    await p1.page.locator('[data-testid="bg-leaderboard-tab-weekly"]').click();
    await p1.page.waitForSelector('[data-testid="bg-leaderboard-my-summary"]', { timeout: UI_TIMEOUT });
    await p1.page.locator('[data-testid="bg-leaderboard-faction-lantern-guard"]').click();
    await p1.page.locator('[data-testid="bg-leaderboard-faction-all"]').click();
    await p1.page.locator('[data-testid="bg-close-leaderboard-btn"]').click();
    await p1.page
      .locator('[data-testid="boardgame-leaderboard-modal"]')
      .waitFor({ state: 'detached', timeout: UI_TIMEOUT });

    verifyCommonAudits(allAudited);
    await p4.context.close().catch(() => undefined);
    if (p4.browser) await p4.browser.close().catch(() => undefined);
    await peerCtx.close().catch(() => undefined);

    // Exit back to KTX courtyard (keep 3D paused during DOM/fade exit, then resume for courtyard shot)
    await setPage3DPaused(p1.page, true);
    await p1.page.bringToFront();
    await p1.page.locator('[data-testid="bg-leave-game-btn"]').click();
    await p1.page.locator('[data-testid="boardgame-2d-board"]').waitFor({ state: 'detached', timeout: UI_TIMEOUT });
    const closeLobbyBtn = p1.page.locator('[data-testid="bg-close-lobby-btn"]');
    if ((await closeLobbyBtn.count()) > 0 && (await closeLobbyBtn.isVisible().catch(() => false))) {
      await closeLobbyBtn.click();
    }
    await p1.page.locator('[data-testid="bg-exit-lounge-btn"]').click();
    const confirmExitBtn = p1.page.locator('[data-testid="bg-confirm-exit-btn"]');
    if (
      await confirmExitBtn
        .waitFor({ state: 'visible', timeout: 800 })
        .then(() => true)
        .catch(() => false)
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
      { timeout: 120000, polling: 200 },
    );
    await setPage3DPaused(p1.page, false);
    await p1.page.waitForTimeout(350);
    const exitIsolation = await p1.page.evaluate(() => {
      const diag = window.__hustBgAudioDiag ? window.__hustBgAudioDiag() : null;
      return {
        lingeringBoard: document.querySelectorAll('[data-testid="boardgame-2d-board"]').length,
        lingeringVfxCanvas: document.querySelectorAll('[data-testid="bg-vfx-combat-canvas"]').length,
        activeVoices: diag ? diag.activeVoices : 0,
        contextState: diag ? diag.contextState : 'uninitialized',
      };
    });
    assert.equal(exitIsolation.lingeringBoard, 0, 'No boardgame-2d-board may linger after exiting match');
    assert.equal(exitIsolation.lingeringVfxCanvas, 0, 'No VFX canvas may linger after exiting match');
    assert.equal(exitIsolation.activeVoices, 0, 'Boardgame WebAudio active voices must be 0 after exiting match');
    assert.notEqual(exitIsolation.contextState, 'running', 'Boardgame AudioContext must be suspended when returning to 3D');
    await p1.page.screenshot({ path: path.join(SHOT_DIR, 'bg4-05-exit-ktx.png'), timeout: 120000 });
    assert.equal(p1.audit.pageErrors.length, 0, `P1 exit page errors: ${p1.audit.pageErrors.join('; ')}`);
    return {
      inviteCode,
      postcardSize: `${postcardMeta.naturalWidth}x${postcardMeta.naturalHeight}`,
      p4MobileActionsExecuted,
      framesChecked: allAudited.reduce((acc, p) => acc + p.audit.wsFramesChecked, 0),
    };
  } catch (err) {
    await captureFailureArtifacts('E2E-01-04', allAudited, err);
    throw err;
  } finally {
    for (const ctx of contexts) {
      await ctx.close().catch(() => undefined);
    }
    for (const b of browsers) {
      if (b) await b.close().catch(() => undefined);
    }
  }
}

// ===========================================================================
// E2E-02: 8-Player Full Table + 9th Spectator Isolation
// ===========================================================================
async function runE2E02(chromium, launchOpts, peerBrowser, outUrl, shim) {
  console.log('[E2E-02] Running 8-player Table 2 + 9th Spectator isolation...');
  const browsers = [];
  const contexts = [];
  const allAudited = [];
  let peerContext = null;
  try {
    const hostUser = { label: 'E2E02-Host', name: 'Chu Ban 8P', mssv: '20229101', viewport: { width: 1280, height: 800 }, mobile: false };
    const specUser = { label: 'E2E02-Spec', name: 'Khan Gia 9', mssv: '20229102', viewport: { width: 1280, height: 800 }, mobile: false };
    const host = await setupPlayerContext(chromium, launchOpts, hostUser, shim.wsBaseUrl);
    browsers.push(host.browser);
    contexts.push(host.context);
    allAudited.push(host);

    await enterCampusAndWaitHook(host.page, outUrl, host.audit);
    await host.page.evaluate(() => window.__bkhn.enterBoardGameClub());
    await host.page.waitForSelector('[data-testid="boardgame-club-hud"]', { timeout: UI_TIMEOUT });
    await host.page.locator('[data-testid="bg-toggle-lobby-btn"]').click();
    await host.page.waitForSelector('[data-testid="bg-sit-table-2-btn"]', { timeout: UI_TIMEOUT });
    await host.page.locator('[data-testid="bg-sit-table-2-btn"]').click();
    await host.page.waitForSelector('[data-testid="bg-hud-invite-code"]', { timeout: UI_TIMEOUT });

    const inviteCode = (await host.page.locator('[data-testid="bg-hud-invite-code"]').innerText()).trim();
    await setPage3DPaused(host.page, true);
    const dirRes = await fetch(`${shim.httpBaseUrl}/api/boardgame/matches`);
    const dirJson = await dirRes.json();
    const matchInfo = (dirJson.matches || []).find((m) => m.inviteCode === inviteCode);
    assert.ok(matchInfo, `Table 2 match ${inviteCode} must appear in directory`);
    assert.equal(matchInfo.maxPlayers, 8);

    peerContext = await peerBrowser.newContext({ viewport: { width: 800, height: 600 } });
    contexts.push(peerContext);
    const peers = [];
    for (let seat = 1; seat < 8; seat++) {
      const peer = await createBrowserWsPeer(peerContext, outUrl, shim.wsBaseUrl, `SinhVien_${seat + 1}`, seat);
      await peer.join(matchInfo.matchId, inviteCode, false);
      await peer.setReady(true);
      peers.push(peer);
      allAudited.push(peer);
    }

    await host.page.waitForFunction(
      () => document.querySelector('[data-testid="bg-hud-match-bar"]')?.textContent?.includes('8'),
      null,
      { timeout: UI_TIMEOUT, polling: 200 },
    );

    // Host starts 8-player match FIRST so host's 3D Lounge Canvas is suspended (suspend3D=true) before launching 9th Spectator
    await host.page.bringToFront();
    await host.page.waitForFunction(
      () => Boolean(document.querySelector('[data-testid="bg-hud-start-btn"]:not([disabled])')),
      null,
      { timeout: UI_TIMEOUT, polling: 200 },
    );
    await host.page.locator('[data-testid="bg-hud-start-btn"]').click();
    await host.page.waitForSelector('[data-testid="boardgame-2d-board"]', { timeout: UI_TIMEOUT });
    await host.page.waitForSelector('[data-testid="bg-role-card-secret"]', { timeout: UI_TIMEOUT });
    await verifyDesktopTacticalLayoutV2(host.page, 'E2E-02-8P-Player');

    // 9th participant joins ongoing match as Spectator via directory "👁 Xem" button
    const spec = await setupPlayerContext(chromium, launchOpts, specUser, shim.wsBaseUrl, {
      expectSpectator: true,
    });
    browsers.push(spec.browser);
    contexts.push(spec.context);
    allAudited.push(spec);
    await spec.page.bringToFront();
    await enterCampusAndWaitHook(spec.page, outUrl, spec.audit);
    await spec.page.evaluate(() => window.__bkhn.enterBoardGameClub());
    await spec.page.waitForSelector('[data-testid="boardgame-club-hud"]', { timeout: UI_TIMEOUT });
    await setPage3DPaused(spec.page, true);
    await spec.page.locator('[data-testid="bg-toggle-lobby-btn"]').click();
    await spec.page.waitForSelector('[data-testid="boardgame-lobby-modal"]', { timeout: UI_TIMEOUT });
    const watchBtn = spec.page.locator(`[data-testid="bg-watch-match-${inviteCode}"]`).first();
    await watchBtn.waitFor({ state: 'visible', timeout: UI_TIMEOUT });
    await watchBtn.click();

    await spec.page.waitForSelector('[data-testid="boardgame-2d-board"]', { timeout: UI_TIMEOUT });
    await spec.page.waitForSelector('[data-testid="bg-spectator-role-placeholder"]', { timeout: UI_TIMEOUT });
    await spec.page.waitForSelector('[data-testid="bg-action-spectator-banner"]', { timeout: UI_TIMEOUT });
    assert.equal(await spec.page.locator('[data-testid="bg-action-panel"]').count(), 0);
    await verifyDesktopTacticalLayoutV2(spec.page, 'E2E-02-8P-Spectator', { isSpectator: true });
    const specPrivacy = await spec.page.evaluate(() => {
      const boardText = document.querySelector('[data-testid="boardgame-2d-board"]')?.textContent || '';
      const tiles = Array.from(
        document.querySelectorAll('[data-testid^="bg-loc-"]:not([data-testid="bg-loc-pawn-self"])'),
      );
      const leakedAria = tiles
        .flatMap((t) => Array.from(t.querySelectorAll('[aria-label]')))
        .map((el) => el.getAttribute('aria-label') || '')
        .filter((s) => /Đội Săn Đêm|Hội Bóng Đêm|Kẻ Độc Hành|\b\d+\s*\/\s*\d+\s*HP\b/i.test(s));
      return {
        revealedPawns: document.querySelectorAll('[data-pawn-revealed="true"]').length,
        hasHpLeakText: /\b\d+\s*\/\s*\d+\s*HP\b/i.test(boardText),
        leakedAria,
      };
    });
    assert.equal(specPrivacy.revealedPawns, 0, '8P spectator view must keep all unrevealed pawns secret at match start');
    assert.equal(specPrivacy.hasHpLeakText, false, '8P spectator view must never leak HP totals');
    assert.equal(specPrivacy.leakedAria.length, 0, `8P tiles aria-labels leaked secret info: ${JSON.stringify(specPrivacy.leakedAria)}`);
    await spec.page.screenshot({ path: path.join(SHOT_DIR, 'bg-v31-8p-spectator.png') });
    await spec.page.screenshot({ path: path.join(SHOT_DIR, 'phase5-after-8p-spectator.png') });

    // Phase 5: Verify 8-player Damage Track chip names remain legible (>= 2 chars, zero overflow) across 1280/1440/1920 + zero duplicate wound badges in Player Strip
    for (const vp of [
      { width: 1280, height: 800 },
      { width: 1440, height: 900 },
      { width: 1920, height: 1080 },
    ]) {
      await spec.page.setViewportSize(vp);
      await spec.page.waitForTimeout(100);
      const nameAudit = await spec.page.evaluate(() => {
        const names = Array.from(document.querySelectorAll('[data-testid^="bg-wound-name-"]')).map((el) => ({
          id: el.getAttribute('data-testid'),
          text: (el.textContent || '').trim(),
          scrollW: Math.ceil(el.scrollWidth),
          clientW: Math.floor(el.clientWidth),
        }));
        const stripWoundDupes = Array.from(document.querySelectorAll('[data-testid^="bg-player-strip-card-"]')).filter((el) =>
          (el.textContent || '').includes('🩸'),
        ).length;
        return { names, stripWoundDupes };
      });
      assert.equal(nameAudit.names.length, 8, `Expected 8 wound chip names @ ${vp.width}x${vp.height}`);
      for (const n of nameAudit.names) {
        assert.ok(n.text.length >= 2, `8P wound chip ${n.id} too short @ ${vp.width}x${vp.height}: "${n.text}"`);
        assert.ok(
          n.scrollW <= n.clientW + 1,
          `8P wound chip ${n.id} ("${n.text}") truncated @ ${vp.width}x${vp.height}: scrollW=${n.scrollW} > clientW=${n.clientW}`,
        );
      }
      assert.equal(nameAudit.stripWoundDupes, 0, `8P Player Strip @ ${vp.width}x${vp.height} must not duplicate 🩸 badges`);
    }
    await spec.page.setViewportSize({ width: 1280, height: 800 });
    await spec.page.waitForTimeout(80);

    // Verify Spectator can inspect a location cleanly via context bar while staying strictly read-only
    const radioBox = await spec.page.locator('[data-testid="bg-loc-radio"]').boundingBox();
    assert.ok(radioBox, 'Spectator must see radio tile');
    await spec.page.mouse.click(radioBox.x + radioBox.width * 0.5, radioBox.y + radioBox.height * 0.55);
    await spec.page.waitForSelector('[data-testid="bg-tactical-context-bar"][data-context-kind="location"]', { timeout: 3000 });
    const specCtxAudit = await spec.page.evaluate(() => {
      const banner = document.querySelector('[data-testid="bg-action-spectator-banner"]');
      const barText = banner?.textContent || '';
      const btns = Array.from(banner?.querySelectorAll('button') || []).map((b) =>
        b.getAttribute('data-testid'),
      );
      return { btns, hasHpLeak: /\b\d+\s*\/\s*\d+\s*HP\b/i.test(barText) };
    });
    assert.deepEqual(specCtxAudit.btns, ['bg-clear-context-btn'], 'Spectator banner may only expose clear-context button');
    assert.equal(specCtxAudit.hasHpLeak, false, 'Spectator context bar must not leak HP ratio');
    await spec.page.locator('[data-testid="bg-clear-context-btn"]').click();
    assert.equal(await spec.page.locator('[data-testid="bg-tactical-context-bar"]').count(), 0);

    // Execute 8 turns (1 full round across 8p) verifying active state sync
    const hostTried = new Set();
    let turnsCompleted = 0;
    for (let step = 0; step < 90 && turnsCompleted < 8; step++) {
      const hostActive = await host.page
        .evaluate(() => Boolean(document.querySelector('[data-testid="bg-action-panel"]')))
        .catch(() => false);
      if (hostActive) {
        await playFirstValidStepOnPage(host.page, step, hostTried);
        await new Promise((r) => setTimeout(r, 70));
        continue;
      }
      let peerStepped = false;
      for (const peer of peers) {
        if (await peer.stepFullTurnIfActive(true)) {
          peerStepped = true;
          turnsCompleted += 1;
          break;
        }
      }
      if (!peerStepped) await new Promise((r) => setTimeout(r, 60));
    }
    assert.ok(turnsCompleted >= 6, `Expected >= 6 8p peer turns completed, got ${turnsCompleted}`);
    assert.equal(await spec.page.locator('[data-testid="bg-action-panel"]').count(), 0);

    // Synthetic Visual QA: verify 8 pawns AND 4 pawns on the exact same tile render cleanly with zero overflow or overlap
    if (spec.audit.latestSync && spec.audit.latestSync.publicGame) {
      const baseSync = spec.audit.latestSync;
      const sendSynthLocs = async (locAssignments, revDelta) => {
        const cloned = JSON.parse(JSON.stringify(baseSync));
        cloned.revision = (baseSync.revision || 1) + revDelta;
        cloned.publicGame.players = cloned.publicGame.players.map((p, idx) => ({
          ...p,
          location: locAssignments[idx] || p.location,
        }));
        await spec.page.evaluate((msgText) => {
          if (window.__testBgWs) {
            window.__testBgWs.dispatchEvent(new MessageEvent('message', { data: msgText }));
          }
        }, JSON.stringify(cloned));
        await settleBoardLayoutAnimations(spec.page, 620);
      };

      // Clear any residual turn-9 cut-in banner before crowded-tile screenshot & QA
      const vfxSkipBtn = spec.page.locator('[data-testid="bg-vfx-skip-btn"]');
      if (await vfxSkipBtn.isVisible().catch(() => false)) {
        await vfxSkipBtn.click().catch(() => {});
        await spec.page.waitForTimeout(150);
      }

      // Case A: All 8 pawns stacked inside 1 location tile ('radio') across 1280x800, 1440x900, 1920x1080
      await sendSynthLocs(new Array(8).fill('radio'), 100);
      for (const vp of [
        { width: 1440, height: 900, shot: true },
        { width: 1280, height: 800, shot: false },
        { width: 1920, height: 1080, shot: false },
      ]) {
        await spec.page.setViewportSize({ width: vp.width, height: vp.height });
        await settleBoardLayoutAnimations(spec.page, 120);
        const crowdCheck = await spec.page.evaluate(() => {
          const tile = document.querySelector('[data-testid="bg-loc-radio"]');
          if (!tile) return { missingTile: true };
          const tr = tile.getBoundingClientRect();
          const pawns = Array.from(tile.querySelectorAll('[data-vfx-player]')).map((el) => {
            const r = el.getBoundingClientRect();
            return {
              id: el.getAttribute('data-vfx-player'),
              left: r.left,
              right: r.right,
              top: r.top,
              bottom: r.bottom,
              w: r.width,
              h: r.height,
            };
          });
          let overlappingPairs = 0;
          for (let i = 0; i < pawns.length; i++) {
            for (let j = i + 1; j < pawns.length; j++) {
              const a = pawns[i];
              const b = pawns[j];
              const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
              const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
              if (ix > 1 && iy > 1) overlappingPairs += 1;
            }
          }
          const clippedCount = pawns.filter(
            (p) => p.w <= 0 || p.h <= 0 || p.left < tr.left - 1 || p.right > tr.right + 1 || p.top < tr.top - 1 || p.bottom > tr.bottom + 1,
          ).length;
          return {
            pawnCount: pawns.length,
            overlappingPairs,
            clippedCount,
            tileOverflowX: tile.scrollWidth > tile.clientWidth + 1,
            tileBottom: Math.round(tr.bottom),
            vh: window.innerHeight,
            docOverflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
          };
        });
        assert.equal(crowdCheck.missingTile, undefined);
        assert.equal(crowdCheck.pawnCount, 8, `Expected all 8 pawns rendered in 'radio' @ ${vp.width}x${vp.height}`);
        assert.equal(crowdCheck.overlappingPairs, 0, `8 pawns in 1 tile must not overlap @ ${vp.width}x${vp.height}`);
        assert.equal(crowdCheck.clippedCount, 0, `8 pawns in 1 tile must stay inside tile bounds @ ${vp.width}x${vp.height}: ${JSON.stringify(crowdCheck)}`);
        assert.equal(crowdCheck.tileOverflowX, false, `Crowded tile must not overflow X @ ${vp.width}x${vp.height}`);
        assert.equal(crowdCheck.docOverflowX, false, `Document must not overflow X with 8 pawns in 1 tile @ ${vp.width}x${vp.height}`);
        assert.ok(crowdCheck.tileBottom <= crowdCheck.vh, `Crowded tile bottom must remain in viewport @ ${vp.width}x${vp.height}`);
        if (vp.shot) {
          await spec.page.screenshot({ path: path.join(SHOT_DIR, 'phase2_1-after-8p-crowded-tile.png') });
        }
      }

      // Case B: 4 pawns on 'radio' + 4 pawns on 'lobby'
      await sendSynthLocs(['radio', 'radio', 'radio', 'radio', 'lobby', 'lobby', 'lobby', 'lobby'], 101);
      await spec.page.setViewportSize({ width: 1280, height: 800 });
      await spec.page.waitForTimeout(120);
      const fourPerTile = await spec.page.evaluate(() => ({
        radioCount: document.querySelector('[data-testid="bg-loc-radio"]')?.querySelectorAll('[data-vfx-player]').length ?? 0,
        lobbyCount: document.querySelector('[data-testid="bg-loc-lobby"]')?.querySelectorAll('[data-vfx-player]').length ?? 0,
        radioOverflowX: (() => {
          const t = document.querySelector('[data-testid="bg-loc-radio"]');
          return t ? t.scrollWidth > t.clientWidth + 1 : true;
        })(),
      }));
      assert.equal(fourPerTile.radioCount, 4);
      assert.equal(fourPerTile.lobbyCount, 4);
      assert.equal(fourPerTile.radioOverflowX, false);

      // Case C: Compact Damage Track 8P highlights (eliminated, revealed near-threshold, unrevealed secret-safe, turn holder)
      const stateCloned = JSON.parse(JSON.stringify(baseSync));
      stateCloned.revision = (baseSync.revision || 1) + 102;
      stateCloned.publicGame.winnerLabel = null;
      stateCloned.publicGame.turnPhase = 'ROLL_MOVE';
      stateCloned.publicGame.activePlayerId = stateCloned.publicGame.players[3].playerId;
      stateCloned.publicGame.players = stateCloned.publicGame.players.map((p, idx) => {
        if (idx === 0) {
          return {
            ...p,
            alive: false,
            woundsTaken: 10,
            revealedRoleId: 'gac-truc-ban',
            revealedFaction: 'lantern-guard',
            revealedMaxHp: 10,
          };
        }
        if (idx === 1) {
          return {
            ...p,
            alive: true,
            woundsTaken: 11,
            revealedRoleId: 'gac-ky-thuat',
            revealedFaction: 'lantern-guard',
            revealedMaxHp: 14,
          };
        }
        if (idx === 2) {
          return {
            ...p,
            alive: true,
            woundsTaken: 7,
            revealedRoleId: null,
            revealedFaction: null,
            revealedMaxHp: null,
          };
        }
        return { ...p, alive: true, woundsTaken: idx === 3 ? 4 : 2 };
      });
      await spec.page.evaluate((msgText) => {
        if (window.__testBgWs) {
          window.__testBgWs.dispatchEvent(new MessageEvent('message', { data: msgText }));
        }
      }, JSON.stringify(stateCloned));
      await settleBoardLayoutAnimations(spec.page, 180);
      for (const vp of [
        { width: 1440, height: 900, shot: true },
        { width: 1280, height: 800, shot: false },
      ]) {
        await spec.page.setViewportSize({ width: vp.width, height: vp.height });
        await spec.page.waitForTimeout(120);
        const dtCheck = await spec.page.evaluate(() => {
          const track = document.querySelector('[data-testid="bg-damage-track"]');
          const chip0 = document.querySelector('[data-testid="bg-wound-chip-0"]');
          const chip1 = document.querySelector('[data-testid="bg-wound-chip-1"]');
          const chip2 = document.querySelector('[data-testid="bg-wound-chip-2"]');
          const chip3 = document.querySelector('[data-testid="bg-wound-chip-3"]');
          const c0 = document.querySelector('[data-testid="bg-wound-count-0"]')?.textContent || '';
          const c1 = document.querySelector('[data-testid="bg-wound-count-1"]')?.textContent || '';
          const c2 = document.querySelector('[data-testid="bg-wound-count-2"]')?.textContent || '';
          const chipNames = Array.from(document.querySelectorAll('[data-testid^="bg-wound-name-"]')).map((el) => ({
            id: el.getAttribute('data-testid'),
            text: (el.textContent || '').trim(),
            scrollW: Math.ceil(el.scrollWidth),
            clientW: Math.floor(el.clientWidth),
          }));
          return {
            height: track ? Math.round(track.getBoundingClientRect().height) : 0,
            overflowX: track ? track.scrollWidth > track.clientWidth + 1 : true,
            elimAttr: chip0?.getAttribute('data-eliminated'),
            near1Attr: chip1?.getAttribute('data-near-threshold'),
            near2Attr: chip2?.getAttribute('data-near-threshold'),
            turn3Attr: chip3?.getAttribute('data-turn-holder'),
            c0,
            c1,
            c2,
            chipNames,
          };
        });
        assert.ok(dtCheck.height <= 56, `8p Damage Track @ ${vp.width}x${vp.height} height (${dtCheck.height}px) must be <= 56px`);
        assert.equal(dtCheck.overflowX, false, `8p Damage Track @ ${vp.width}x${vp.height} must not overflow X`);
        assert.equal(dtCheck.elimAttr, 'true', 'Seat 0 eliminated chip must mark data-eliminated=true');
        assert.equal(dtCheck.near1Attr, 'true', 'Seat 1 revealed 11/14 must highlight near-threshold');
        assert.equal(dtCheck.c1, '11/14', `Expected public wound ratio 11/14 on revealed chip, got ${dtCheck.c1}`);
        assert.equal(dtCheck.near2Attr, 'false', 'Seat 2 unrevealed at 7 wounds must NEVER infer danger from secret maxHp');
        assert.equal(dtCheck.c2.includes('/'), false, `Unrevealed chip must never expose /MaxHP: ${dtCheck.c2}`);
        assert.equal(dtCheck.turn3Attr, 'true', 'Seat 3 active turn holder must mark data-turn-holder=true');
        for (const n of dtCheck.chipNames) {
          assert.ok(n.text.length >= 2, `Case C 8P wound chip ${n.id} too short @ ${vp.width}x${vp.height}: "${n.text}"`);
          assert.ok(
            n.scrollW <= n.clientW + 1,
            `Case C 8P wound chip ${n.id} ("${n.text}") truncated @ ${vp.width}x${vp.height}: scrollW=${n.scrollW} > clientW=${n.clientW}`,
          );
        }
        if (vp.shot) {
          await spec.page.screenshot({ path: path.join(SHOT_DIR, 'phase5-after-8p-states.png') });
        }
      }
    }

    verifyCommonAudits(allAudited);
    return { inviteCode, players: 8, spectatorVerified: true, turnsCompleted };
  } catch (err) {
    await captureFailureArtifacts('E2E-02', allAudited, err);
    throw err;
  } finally {
    for (const ctx of contexts) {
      await ctx.close().catch(() => undefined);
    }
    for (const b of browsers) {
      if (b) await b.close().catch(() => undefined);
    }
  }
}

// ===========================================================================
// E2E-03: 5-Checkpoint Mid-Session Browser Reload Reconnect Matrix
// ===========================================================================
async function runE2E03(chromium, launchOpts, peerBrowser, outUrl, shim) {
  console.log('[E2E-03] Running 5-checkpoint reload reconnect matrix...');
  const browsers = [];
  const contexts = [];
  const allAudited = [];
  try {
    const p1User = { label: 'E2E03-P1', name: 'Reconnect P1', mssv: '20229101', viewport: { width: 1280, height: 800 }, mobile: false };
    const p1 = await setupPlayerContext(chromium, launchOpts, p1User, shim.wsBaseUrl);
    browsers.push(p1.browser);
    contexts.push(p1.context);
    allAudited.push(p1);

    const reloadAndRestoreTo = async (selector) => {
      await p1.page.reload({ waitUntil: 'domcontentloaded' });
      const enter = p1.page.locator('#enter-campus');
      await enter.waitFor({ state: 'visible', timeout: 90000 });
      await enter.click();
      await p1.page.waitForSelector(selector, { timeout: 90000 });
    };

    await enterCampusAndWaitHook(p1.page, outUrl, p1.audit);
    await p1.page.evaluate(() => window.__bkhn.enterBoardGameClub());
    await p1.page.waitForSelector('[data-testid="boardgame-club-hud"]', { timeout: UI_TIMEOUT });
    await p1.page.locator('[data-testid="bg-toggle-lobby-btn"]').click();
    await p1.page.waitForSelector('[data-testid="bg-sit-table-1-btn"]', { timeout: UI_TIMEOUT });
    await p1.page.locator('[data-testid="bg-sit-table-1-btn"]').click();
    await p1.page.waitForSelector('[data-testid="bg-hud-invite-code"]', { timeout: UI_TIMEOUT });
    const inviteCode = (await p1.page.locator('[data-testid="bg-hud-invite-code"]').innerText()).trim();

    const dirRes = await fetch(`${shim.httpBaseUrl}/api/boardgame/matches`);
    const dirJson = await dirRes.json();
    const matchInfo = (dirJson.matches || []).find((m) => m.inviteCode === inviteCode);
    assert.ok(matchInfo);

    const peerCtx = await peerBrowser.newContext({ viewport: { width: 800, height: 600 } });
    contexts.push(peerCtx);
    const peers = [];
    for (let seat = 1; seat < 4; seat++) {
      const peer = await createBrowserWsPeer(peerCtx, outUrl, shim.wsBaseUrl, `ReconnectPeer_${seat}`, seat);
      await peer.join(matchInfo.matchId, inviteCode, false);
      await peer.setReady(true);
      peers.push(peer);
      allAudited.push(peer);
    }

    await p1.page.waitForFunction(
      () => Boolean(document.querySelector('[data-testid="bg-hud-start-btn"]:not([disabled])')),
      null,
      { timeout: UI_TIMEOUT, polling: 200 },
    );
    const p1IdBefore = p1.audit.selfPlayerId;

    // Checkpoint 1: Reload during READY_CHECK lobby
    await reloadAndRestoreTo('[data-testid="bg-hud-invite-code"]');
    const codeAfterC1 = (await p1.page.locator('[data-testid="bg-hud-invite-code"]').innerText()).trim();
    assert.equal(codeAfterC1, inviteCode, 'Checkpoint 1: must restore READY_CHECK inviteCode');
    assert.equal(p1.audit.selfPlayerId, p1IdBefore, 'Checkpoint 1: must preserve exact playerId');

    // DO intentionally promotes next connected player when the host disconnects on reload;
    // support both host-retained and promoted-host flows to start the match cleanly.
    const isP1StillHost = await p1.page
      .evaluate(() => Boolean(document.querySelector('[data-testid="bg-hud-start-btn"]')))
      .catch(() => false);
    if (isP1StillHost) {
      await p1.page.waitForFunction(
        () => Boolean(document.querySelector('[data-testid="bg-hud-start-btn"]:not([disabled])')),
        null,
        { timeout: UI_TIMEOUT, polling: 200 },
      );
      await p1.page.locator('[data-testid="bg-hud-start-btn"]').click();
    } else {
      const readyBtn = p1.page.locator('[data-testid="bg-hud-ready-btn"]');
      await readyBtn.waitFor({ state: 'visible', timeout: UI_TIMEOUT });
      const readyLabel = (await readyBtn.innerText()).trim();
      if (!readyLabel.includes('Đã sẵn sàng')) {
        await readyBtn.click();
        await p1.page.waitForFunction(
          () => {
            const btn = document.querySelector('[data-testid="bg-hud-ready-btn"]');
            return Boolean(btn && (btn.textContent || '').includes('Đã sẵn sàng'));
          },
          null,
          { timeout: UI_TIMEOUT, polling: 150 },
        );
      }
      let started = false;
      for (let attempt = 0; attempt < 30 && !started; attempt++) {
        for (const peer of peers) {
          const st = await peer.getState();
          if (st.sync?.status === 'PLAYING') {
            started = true;
            break;
          }
          if (st.sync?.hostPlayerId && st.sync.hostPlayerId === st.auth?.playerId) {
            await peer.startMatch();
          }
        }
        if (!started) await new Promise((r) => setTimeout(r, 250));
      }
      assert.ok(started, 'Checkpoint 1: promoted host peer must start match once P1 restores ready');
    }
    await p1.page.waitForSelector('[data-testid="boardgame-2d-board"]', { timeout: UI_TIMEOUT });

    // Read secret role name once before checkpoints (role card renders open directly without local mask)
    await p1.page.waitForSelector('[data-testid="bg-role-card-secret"]', { timeout: UI_TIMEOUT });
    const expectedRoleName = (await p1.page.locator('[data-testid="bg-role-card-secret"] h3').innerText()).trim();

    // Helper: advance peers until P1 has ActionPanel
    const advancePeersUntilP1Active = async ({ skipCombat = false } = {}) => {
      for (let i = 0; i < 40; i++) {
        const isP1Turn = await p1.page
          .evaluate(() => Boolean(document.querySelector('[data-testid="bg-action-panel"]')))
          .catch(() => false);
        if (isP1Turn) return;
        for (const peer of peers) {
          await peer.stepFullTurnIfActive(true, skipCombat);
        }
        await new Promise((r) => setTimeout(r, 60));
      }
      throw new Error('Timed out waiting for P1 turn');
    };

    const finishP1TurnPassively = async () => {
      for (let step = 0; step < 12; step++) {
        const ownTurn = await p1.page
          .evaluate(() => Boolean(document.querySelector('[data-testid="bg-action-panel"]')))
          .catch(() => false);
        if (!ownTurn) break;
        const chooseDest = p1.page.locator('[data-testid^="bg-choose-dest-"]').first();
        const skipLoc = p1.page.locator('[data-testid="bg-skip-loc-btn"]');
        const skipCard = p1.page.locator('[data-testid^="bg-skip-card-"]').first();
        const useCard = p1.page.locator('[data-testid^="bg-use-card-"]').first();
        const endTurn = p1.page.locator('[data-testid="bg-end-turn-btn"]');
        const rollBtn = p1.page.locator('[data-testid="bg-roll-dice-btn"]');
        if ((await chooseDest.count()) > 0 && (await chooseDest.isEnabled().catch(() => false))) {
          await chooseDest.click();
        } else if ((await skipLoc.count()) > 0 && (await skipLoc.isEnabled().catch(() => false))) {
          await skipLoc.click();
        } else if ((await skipCard.count()) > 0 && (await skipCard.isEnabled().catch(() => false))) {
          await skipCard.click();
        } else if ((await useCard.count()) > 0 && (await useCard.isEnabled().catch(() => false))) {
          await useCard.click();
        } else if ((await endTurn.count()) > 0 && (await endTurn.isEnabled().catch(() => false))) {
          await endTurn.click();
        } else if ((await rollBtn.count()) > 0 && (await rollBtn.isEnabled().catch(() => false))) {
          await rollBtn.click();
        }
        await p1.page.waitForTimeout(100);
      }
    };

    await advancePeersUntilP1Active();

    // Checkpoint 2: Reload during P1's own turn (MOVE_OR_STAY)
    await reloadAndRestoreTo('[data-testid="boardgame-2d-board"]');
    assert.equal(p1.audit.selfPlayerId, p1IdBefore, 'Checkpoint 2: must preserve exact playerId');
    await p1.page.waitForSelector('[data-testid="bg-role-card-secret"]', { timeout: UI_TIMEOUT });
    assert.equal(
      (await p1.page.locator('[data-testid="bg-role-card-secret"] h3').innerText()).trim(),
      expectedRoleName,
      'Checkpoint 2: secret role restored open directly on own turn',
    );
    // Reloading full Next.js + WebGL campus under SwiftShader can exceed
    // BOARD_GAME_DISCONNECTED_TURN_TIMEOUT_MS (12s); advance peers back to P1 if turn timed out.
    const hasActionAfterC2 = await p1.page
      .evaluate(() => Boolean(document.querySelector('[data-testid="bg-action-panel"]')))
      .catch(() => false);
    if (!hasActionAfterC2) {
      await p1.page.waitForSelector('[data-testid="bg-waiting-turn-banner"]', { timeout: UI_TIMEOUT });
      await advancePeersUntilP1Active();
    }
    // Complete P1 turn via UI after reload -> pass turn to a peer
    const p1Tried = new Set();
    for (let s = 0; s < 20; s++) {
      const stillOwn = await p1.page
        .evaluate(() => Boolean(document.querySelector('[data-testid="bg-action-panel"]')))
        .catch(() => false);
      if (!stillOwn) break;
      await playFirstValidStepOnPage(p1.page, s, p1Tried, { skipReveal: true });
      await new Promise((r) => setTimeout(r, 70));
    }

    // Checkpoint 3: Reload during another player's turn
    await p1.page.waitForSelector('[data-testid="bg-waiting-turn-banner"]', { timeout: UI_TIMEOUT });
    await reloadAndRestoreTo('[data-testid="bg-waiting-turn-banner"]');
    assert.equal(await p1.page.locator('[data-testid="bg-action-panel"]').count(), 0);
    await p1.page.waitForSelector('[data-testid="bg-role-card-secret"]', { timeout: UI_TIMEOUT });
    assert.equal(
      (await p1.page.locator('[data-testid="bg-role-card-secret"] h3').innerText()).trim(),
      expectedRoleName,
      'Checkpoint 3: secret role restored open directly during opponent turn',
    );

    // Direct Real-GameBoard Audit:
    // (A) Zero Frame-1 Dice Flicker + Shared Timeline (Dice Settled -> Destination Highlight -> Pawn Glide)
    // (B) Live Skip Animation on GameBoard
    // (C) Live Reduced Motion on GameBoard
    // (D) Checkpoint 4 F5 Reconnect idempotency + settled historical tray
    await advancePeersUntilP1Active({ skipCombat: true });
    await p1.page.waitForSelector('[data-testid="bg-dice-tray"][data-turn-active="true"]', { timeout: UI_TIMEOUT });
    await p1.page
      .locator('[data-testid="bg-vfx-dice-overlay"]')
      .waitFor({ state: 'detached', timeout: 3000 })
      .catch(() => undefined);
    await p1.page.waitForFunction(
      () => document.querySelector('[data-testid="bg-dice-tray"]')?.getAttribute('data-dice-settled') === 'true',
      null,
      { timeout: 3000, polling: 40 },
    );

    let zeroFlickerVerified = false;
    let movedTimelineVerified = false;
    for (let rollAttempt = 0; rollAttempt < 3 && !movedTimelineVerified; rollAttempt++) {
      if ((await p1.page.locator('[data-testid="bg-roll-dice-btn"]').count()) === 0) break;

      await p1.page.evaluate(() => {
        const board = document.querySelector('[data-testid="boardgame-2d-board"]');
        const tray = document.querySelector('[data-testid="bg-dice-tray"]');
        const initialHeadline = tray?.querySelector('p')?.textContent?.trim() || '';
        const findSelfLocId = () => {
          const selfPawn = document.querySelector('[data-testid="bg-loc-pawn-self"]');
          const tile = selfPawn?.closest('[data-testid^="bg-loc-"]');
          return tile ? tile.getAttribute('data-testid').replace('bg-loc-', '') : null;
        };
        const initialLocId = findSelfLocId();
        const initialTileRect = initialLocId
          ? document.querySelector(`[data-testid="bg-loc-${initialLocId}"]`)?.getBoundingClientRect()
          : null;
        const pRect0 = document.querySelector('[data-testid="bg-loc-pawn-self"]')?.getBoundingClientRect();
        const state = {
          initialHeadline,
          initialLocId,
          initialPawnRect: pRect0
            ? {
                left: pRect0.left,
                top: pRect0.top,
                cx: pRect0.left + pRect0.width / 2,
                cy: pRect0.top + pRect0.height / 2,
              }
            : null,
          initialTileCenter: initialTileRect
            ? {
                x: initialTileRect.left + initialTileRect.width / 2,
                y: initialTileRect.top + initialTileRect.height / 2,
              }
            : null,
          rollStarted: false,
          firstRollChangeAt: null,
          firstUnsettledAt: null,
          firstSettledAt: null,
          firstDestHighlightAt: null,
          firstDestHighlightLocId: null,
          maxPawnDriftWhileUnsettled: 0,
          pawnSampleWhileUnsettledCount: 0,
          settledTransitions: [],
          flickerViolations: [],
          stopped: false,
          rafId: 0,
          observer: null,
        };

        const sample = (source) => {
          const now = performance.now();
          const tr = document.querySelector('[data-testid="bg-dice-tray"]');
          const ov = document.querySelector('[data-testid="bg-vfx-dice-overlay"]');
          const traySettled = tr?.getAttribute('data-dice-settled') || null;
          const headline = tr?.querySelector('p')?.textContent?.trim() || '';
          const trayText = tr?.textContent || '';
          const ovSettled = ov?.getAttribute('data-dice-settled') || null;
          const ovStage = ov?.getAttribute('data-dice-stage') || null;
          const ovText = ov?.textContent || '';
          const trayD6 = tr?.querySelector('[data-testid="bg-die-d6-3d"]')?.getAttribute('data-settled-value') || null;
          const trayD4 = tr?.querySelector('[data-testid="bg-die-d4-3d"]')?.getAttribute('data-settled-value') || null;
          const ovD6 = ov?.querySelector('[data-testid="bg-die-d6-3d"]')?.getAttribute('data-settled-value') || null;
          const ovD4 = ov?.querySelector('[data-testid="bg-die-d4-3d"]')?.getAttribute('data-settled-value') || null;
          const litDestIds = Array.from(
            document.querySelectorAll('[data-testid^="bg-loc-"][data-destination-highlighted="true"]'),
          ).map((el) => el.getAttribute('data-testid').replace('bg-loc-', ''));

          const isIdleFallbackHeadline =
            headline === 'Khay Xúc Xắc Bóng Đêm (1d6 + 1d4)' ||
            headline.startsWith('⚡ Lượt của bạn!');
          if (
            !state.rollStarted &&
            (traySettled === 'false' ||
              ov !== null ||
              (headline !== state.initialHeadline && !isIdleFallbackHeadline))
          ) {
            state.rollStarted = true;
            state.firstRollChangeAt = now;
            if (traySettled !== 'false') {
              state.flickerViolations.push(
                `Frame-1 flicker: headline changed to "${headline}" with data-dice-settled=${traySettled}`,
              );
            }
          }
          if (!state.rollStarted) return;

          const lastTr = state.settledTransitions[state.settledTransitions.length - 1];
          if (traySettled && traySettled !== lastTr) {
            state.settledTransitions.push(traySettled);
          }

          if (traySettled === 'false' || ovSettled === 'false') {
            if (state.firstUnsettledAt === null) state.firstUnsettledAt = now;
            if (state.firstSettledAt !== null) {
              state.flickerViolations.push(`Oscillated settled true->false (+${Math.round(now - state.firstRollChangeAt)}ms)`);
            }
            if (trayD6 && trayD6 !== 'hidden') state.flickerViolations.push(`Tray D6 revealed early: ${trayD6}`);
            if (trayD4 && trayD4 !== 'hidden') state.flickerViolations.push(`Tray D4 revealed early: ${trayD4}`);
            if (ov && (ovD6 !== 'hidden' || ovD4 !== 'hidden')) {
              state.flickerViolations.push(`Overlay dice revealed early (${ovD6}/${ovD4}) stage=${ovStage}`);
            }
            if (/=\s*\d+/.test(ovText) || ovText.includes('Tổng:') || ovText.includes('Kết quả:')) {
              state.flickerViolations.push(`Overlay spoiled sum early: "${ovText}"`);
            }
            if (/tung\s+\d+\s*\+\s*\d+\s*=/.test(trayText) || trayText.includes('Điểm đến:') || trayText.includes('ĐỔ LẠI!')) {
              state.flickerViolations.push(`Tray spoiled result early: "${trayText}"`);
            }
            if (litDestIds.length > 0) {
              state.flickerViolations.push(`Destination highlighted before dice settled: ${litDestIds.join(',')}`);
            }
            if (source === 'raf') {
              const pawnRect = document.querySelector('[data-testid="bg-loc-pawn-self"]')?.getBoundingClientRect();
              if (pawnRect && state.initialPawnRect) {
                const drift = Math.hypot(
                  pawnRect.left + pawnRect.width / 2 - state.initialPawnRect.cx,
                  pawnRect.top + pawnRect.height / 2 - state.initialPawnRect.cy,
                );
                state.pawnSampleWhileUnsettledCount += 1;
                if (drift > state.maxPawnDriftWhileUnsettled) {
                  state.maxPawnDriftWhileUnsettled = drift;
                }
              }
            }
          } else if (state.firstUnsettledAt !== null && traySettled === 'true') {
            if (state.firstSettledAt === null) state.firstSettledAt = now;
            if (litDestIds.length > 0 && state.firstDestHighlightAt === null) {
              state.firstDestHighlightAt = now;
              state.firstDestHighlightLocId = litDestIds[0];
            }
          }
        };

        state.observer = new MutationObserver(() => sample('mut'));
        state.observer.observe(board, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        });
        const tick = () => {
          sample('raf');
          if (!state.stopped) state.rafId = requestAnimationFrame(tick);
        };
        state.rafId = requestAnimationFrame(tick);
        window.__bgRealBoardProbe = state;
      });

      await p1.page.locator('[data-testid="bg-roll-dice-btn"]').click();
      await p1.page.waitForFunction(
        () => Boolean(window.__bgRealBoardProbe?.firstUnsettledAt),
        null,
        { timeout: 4000, polling: 20 },
      );
      await p1.page.waitForFunction(
        () =>
          Boolean(window.__bgRealBoardProbe?.firstSettledAt) &&
          !document.querySelector('[data-testid="bg-vfx-dice-overlay"]'),
        null,
        { timeout: 5000, polling: 40 },
      );
      await p1.page.waitForTimeout(750);

      const probe = await p1.page.evaluate(() => {
        const s = window.__bgRealBoardProbe;
        s.stopped = true;
        s.observer?.disconnect();
        if (s.rafId) cancelAnimationFrame(s.rafId);
        const selfPawn = document.querySelector('[data-testid="bg-loc-pawn-self"]');
        const finalTile = selfPawn?.closest('[data-testid^="bg-loc-"]');
        const finalLocId = finalTile ? finalTile.getAttribute('data-testid').replace('bg-loc-', '') : null;
        const ftRect = finalTile?.getBoundingClientRect();
        const fpRect = selfPawn?.getBoundingClientRect();
        const tray = document.querySelector('[data-testid="bg-dice-tray"]');
        return {
          initialLocId: s.initialLocId,
          finalLocId,
          rollStarted: s.rollStarted,
          unsettledDurationMs:
            s.firstSettledAt !== null && s.firstUnsettledAt !== null
              ? Math.round(s.firstSettledAt - s.firstUnsettledAt)
              : 0,
          firstSettledAt: s.firstSettledAt,
          firstDestHighlightAt: s.firstDestHighlightAt,
          firstDestHighlightLocId: s.firstDestHighlightLocId,
          maxPawnDriftWhileUnsettled: Math.round(s.maxPawnDriftWhileUnsettled),
          pawnSampleWhileUnsettledCount: s.pawnSampleWhileUnsettledCount,
          tileDistance:
            ftRect && s.initialTileCenter
              ? Math.round(
                  Math.hypot(
                    ftRect.left + ftRect.width / 2 - s.initialTileCenter.x,
                    ftRect.top + ftRect.height / 2 - s.initialTileCenter.y,
                  ),
                )
              : 0,
          finalDistToDestTile:
            ftRect && fpRect
              ? Math.round(
                  Math.hypot(
                    fpRect.left + fpRect.width / 2 - (ftRect.left + ftRect.width / 2),
                    fpRect.top + fpRect.height / 2 - (ftRect.top + ftRect.height / 2),
                  ),
                )
              : 0,
          settledTransitions: s.settledTransitions,
          flickerViolations: s.flickerViolations,
          trayD6After: tray?.querySelector('[data-testid="bg-die-d6-3d"]')?.getAttribute('data-settled-value'),
        };
      });

      assert.equal(probe.rollStarted, true, 'Real GameBoard roll must trigger state transition');
      assert.deepEqual(
        probe.flickerViolations,
        [],
        `Real GameBoard Frame-1 / early reveal violations: ${probe.flickerViolations.join('; ')}`,
      );
      assert.ok(
        probe.unsettledDurationMs >= 750,
        `Real GameBoard dice tumble duration too short: ${probe.unsettledDurationMs}ms`,
      );
      assert.match(probe.trayD6After || '', /^[1-6]$/, 'Settled tray D6 must expose server value');
      zeroFlickerVerified = true;

      if (probe.finalLocId && probe.initialLocId && probe.finalLocId !== probe.initialLocId) {
        assert.ok(
          probe.firstDestHighlightAt !== null && probe.firstDestHighlightAt >= probe.firstSettledAt,
          `Destination highlight must fire at/after diceSettleAt (settled=${probe.firstSettledAt}, hl=${probe.firstDestHighlightAt})`,
        );
        assert.equal(
          probe.firstDestHighlightLocId,
          probe.finalLocId,
          `Destination highlight loc mismatch: ${probe.firstDestHighlightLocId} vs ${probe.finalLocId}`,
        );
        if (probe.tileDistance > 70 && probe.pawnSampleWhileUnsettledCount > 0) {
          assert.ok(
            probe.maxPawnDriftWhileUnsettled < Math.max(48, probe.tileDistance * 0.4),
            `Pawn drifted ${probe.maxPawnDriftWhileUnsettled}px during dice roll (tileDistance=${probe.tileDistance}px) — expected hold until diceSettleAtMs`,
          );
        }
        movedTimelineVerified = true;
      }
    }
    assert.equal(zeroFlickerVerified, true, 'Real GameBoard zero-flicker roll probe must run');

    // Finish turn passively -> Check (B): Skip Animation mid-roll on real GameBoard
    await finishP1TurnPassively();
    await advancePeersUntilP1Active({ skipCombat: true });
    await p1.page.waitForSelector('[data-testid="bg-roll-dice-btn"]', { timeout: UI_TIMEOUT });
    await p1.page
      .locator('[data-testid="bg-vfx-dice-overlay"]')
      .waitFor({ state: 'detached', timeout: 3000 })
      .catch(() => undefined);
    await p1.page.waitForFunction(
      () => document.querySelector('[data-testid="bg-dice-tray"]')?.getAttribute('data-dice-settled') === 'true',
      null,
      { timeout: 3000, polling: 40 },
    );
    await p1.page.locator('[data-testid="bg-roll-dice-btn"]').click();
    await p1.page.waitForSelector('[data-testid="bg-vfx-dice-overlay"][data-dice-settled="false"]', {
      timeout: 3000,
    });
    await p1.page.waitForSelector('[data-testid="bg-skip-vfx-btn"]', { timeout: 2000 });
    await p1.page.locator('[data-testid="bg-skip-vfx-btn"]').click();
    await p1.page.locator('[data-testid="bg-vfx-dice-overlay"]').waitFor({ state: 'detached', timeout: 800 });
    const afterSkipTrayMeta = await p1.page.evaluate(() => {
      const tr = document.querySelector('[data-testid="bg-dice-tray"]');
      return {
        settled: tr?.getAttribute('data-dice-settled'),
        d6Val: tr?.querySelector('[data-testid="bg-die-d6-3d"]')?.getAttribute('data-settled-value'),
      };
    });
    assert.equal(afterSkipTrayMeta.settled, 'true', 'Skip Animation on GameBoard must settle dice tray immediately');
    assert.match(afterSkipTrayMeta.d6Val || '', /^[1-6]$/, 'Skip Animation must reveal settled D6 value');

    // Finish turn passively -> Check (C): Reduced Motion on real GameBoard (zero unsettled frames)
    await finishP1TurnPassively();
    await advancePeersUntilP1Active({ skipCombat: true });
    await p1.page.waitForSelector('[data-testid="bg-roll-dice-btn"]', { timeout: UI_TIMEOUT });
    await p1.page
      .locator('[data-testid="bg-vfx-dice-overlay"]')
      .waitFor({ state: 'detached', timeout: 3000 })
      .catch(() => undefined);
    await p1.page.waitForFunction(
      () => document.querySelector('[data-testid="bg-dice-tray"]')?.getAttribute('data-dice-settled') === 'true',
      null,
      { timeout: 3000, polling: 40 },
    );
    await clickControlViaSettingsIfCollapsed(p1.page, 'bg-vfx-motion-toggle-btn');
    await p1.page.waitForSelector('[data-testid="bg-vfx-stage"][data-reduced-motion="true"]', {
      timeout: 3000,
    });
    await p1.page.evaluate(() => {
      const board = document.querySelector('[data-testid="boardgame-2d-board"]');
      const tray = document.querySelector('[data-testid="bg-dice-tray"]');
      const rmProbe = {
        initialHeadline: tray?.querySelector('p')?.textContent?.trim() || '',
        headlineChanged: false,
        unsettledSeen: 0,
        observer: null,
      };
      const checkRm = () => {
        const tr = document.querySelector('[data-testid="bg-dice-tray"]');
        const ov = document.querySelector('[data-testid="bg-vfx-dice-overlay"]');
        const hl = tr?.querySelector('p')?.textContent?.trim() || '';
        const isIdleFallbackHeadline =
          hl === 'Khay Xúc Xắc Bóng Đêm (1d6 + 1d4)' || hl.startsWith('⚡ Lượt của bạn!');
        if ((hl !== rmProbe.initialHeadline && !isIdleFallbackHeadline) || ov) {
          rmProbe.headlineChanged = true;
        }
        if (tr?.getAttribute('data-dice-settled') === 'false' || ov?.getAttribute('data-dice-settled') === 'false') {
          rmProbe.unsettledSeen += 1;
        }
      };
      rmProbe.observer = new MutationObserver(checkRm);
      rmProbe.observer.observe(board, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
      window.__bgRmRollProbe = rmProbe;
    });
    await p1.page.locator('[data-testid="bg-roll-dice-btn"]').click();
    await p1.page.waitForFunction(
      () => Boolean(window.__bgRmRollProbe?.headlineChanged),
      null,
      { timeout: 4000, polling: 20 },
    );
    const rmResult = await p1.page.evaluate(() => {
      const p = window.__bgRmRollProbe;
      p.observer?.disconnect();
      return {
        unsettledSeen: p.unsettledSeen,
        settled: document.querySelector('[data-testid="bg-dice-tray"]')?.getAttribute('data-dice-settled'),
      };
    });
    assert.equal(rmResult.unsettledSeen, 0, 'Reduced Motion on GameBoard must produce zero unsettled dice frames');
    assert.equal(rmResult.settled, 'true', 'Reduced Motion on GameBoard must settle immediately');
    await clickControlViaSettingsIfCollapsed(p1.page, 'bg-vfx-motion-toggle-btn');
    await p1.page.waitForSelector('[data-testid="bg-vfx-stage"][data-reduced-motion="false"]', {
      timeout: 3000,
    });
    await p1.page
      .locator('[data-testid="bg-vfx-dice-overlay"]')
      .waitFor({ state: 'detached', timeout: 1500 })
      .catch(() => undefined);

    await p1.page.waitForSelector('[data-testid="bg-action-panel"]', { timeout: UI_TIMEOUT });
    for (let s = 0; s < 5; s++) {
      await ensureSecondaryMenuOpen(p1.page);
      if ((await p1.page.locator('[data-testid="bg-reveal-role-btn"]').count()) > 0) break;
      await p1.page.keyboard.press('Escape');
      if ((await p1.page.locator('[data-testid="bg-roll-dice-btn"]').count()) > 0) {
        await p1.page.locator('[data-testid="bg-roll-dice-btn"]').click();
      } else if ((await p1.page.locator('[data-testid^="bg-choose-dest-"]').count()) > 0) {
        await p1.page.locator('[data-testid^="bg-choose-dest-"]').first().click();
      }
      await p1.page.waitForTimeout(180);
    }
    await ensureSecondaryMenuOpen(p1.page);
    await p1.page.waitForSelector('[data-testid="bg-reveal-role-btn"]', { timeout: UI_TIMEOUT });
    await p1.page.locator('[data-testid="bg-reveal-role-btn"]').click();
    await p1.page.waitForSelector('[data-testid="bg-confirm-reveal-btn"]', { timeout: UI_TIMEOUT });
    await p1.page.locator('[data-testid="bg-confirm-reveal-btn"]').click();
    await p1.page.waitForSelector('[data-testid="bg-last-reveal-banner"]', { timeout: UI_TIMEOUT });

    // Checkpoint 4: Reload after voluntary role revelation — must NOT replay historical DICE_ROLL overlay & tray stays settled
    await reloadAndRestoreTo('[data-testid="boardgame-2d-board"]');
    assert.equal(await p1.page.locator('[data-testid="bg-vfx-dice-overlay"]').count(), 0, 'F5 reload must not replay completed dice roll VFX');
    assert.equal(
      await p1.page.locator('[data-testid="bg-dice-tray"]').getAttribute('data-dice-settled'),
      'true',
      'F5 reload must keep historical dice tray settled (never stuck masked)',
    );
    assert.equal(p1.audit.selfPlayerId, p1IdBefore, 'Checkpoint 4: must preserve exact playerId');
    await p1.page.waitForSelector('[data-testid="bg-role-card-secret"]', { timeout: UI_TIMEOUT });
    const roleCardTextC4 = await p1.page.locator('[data-testid="bg-role-card-secret"]').innerText();
    assert.equal(
      roleCardTextC4.includes('Cần lật vai'),
      false,
      'Checkpoint 4: revealed skill status must persist across reload after REVEAL_ROLE',
    );
    const chipAfterReconnect = await p1.page.evaluate((pid) => {
      const track = document.querySelector('[data-testid="bg-damage-track"]');
      const chip = document.querySelector(`[data-testid^="bg-wound-chip-"][data-player-id="${pid}"]`);
      const countEl = chip?.querySelector('[data-testid^="bg-wound-count-"]');
      return {
        expanded: track?.getAttribute('data-expanded'),
        height: track ? Math.round(track.getBoundingClientRect().height) : 0,
        countText: (countEl?.textContent || '').trim(),
      };
    }, p1IdBefore);
    assert.equal(chipAfterReconnect.expanded, 'false', 'Checkpoint 4: Damage Track stays compact after F5 reload');
    assert.ok(chipAfterReconnect.height <= 56, `Checkpoint 4: Damage Track height <= 56px, got ${chipAfterReconnect.height}`);
    assert.match(
      chipAfterReconnect.countText,
      /^\d+\/(?:8|10|11|12|13|14)$/,
      `Checkpoint 4: revealed /MaxHp threshold must display on compact chip after F5 reconnect, got "${chipAfterReconnect.countText}"`,
    );
    await p1.page.screenshot({ path: path.join(SHOT_DIR, 'bg-v31-reconnect-check.png') });

    // Drive match to FINISHED fast via peers + UI P1
    for (let step = 0; step < 300; step++) {
      const done = await p1.page
        .evaluate(() => Boolean(document.querySelector('[data-testid="bg-match-result-modal"]')))
        .catch(() => false);
      if (done) break;
      const ownTurn = await p1.page
        .evaluate(() => Boolean(document.querySelector('[data-testid="bg-action-panel"]')))
        .catch(() => false);
      if (ownTurn) {
        await playFirstValidStepOnPage(p1.page, step, p1Tried);
        await new Promise((r) => setTimeout(r, 65));
      } else {
        for (const peer of peers) {
          await peer.stepFullTurnIfActive(true);
        }
        await new Promise((r) => setTimeout(r, 40));
      }
    }
    await p1.page.waitForSelector('[data-testid="bg-match-result-modal"]', { timeout: UI_TIMEOUT });

    // Checkpoint 5: Reload during FINISHED screen
    await reloadAndRestoreTo('[data-testid="bg-match-result-modal"]');
    await p1.page.waitForSelector('[data-testid="bg-match-postcard-img"]', { timeout: UI_TIMEOUT });

    verifyCommonAudits(allAudited);
    return { inviteCode, checkpointsPassed: 5, restoredRole: expectedRoleName };
  } catch (err) {
    await captureFailureArtifacts('E2E-03', allAudited, err);
    throw err;
  } finally {
    for (const ctx of contexts) {
      await ctx.close().catch(() => undefined);
    }
    for (const b of browsers) {
      if (b) await b.close().catch(() => undefined);
    }
  }
}

// ===========================================================================
// E2E-05 & E2E-06: Concurrent 2-Match Isolation + Browser WS Security Probes
// ===========================================================================
async function runE2E05AndE2E06(chromium, launchOpts, peerBrowser, outUrl, shim) {
  console.log('[E2E-05 & E2E-06] Running 2-match concurrent isolation & security probe suite...');
  const browsers = [];
  const contexts = [];
  const allAudited = [];
  try {
    const healthRes = await fetch(`${shim.httpBaseUrl}/api/boardgame/health`);
    assert.equal(healthRes.status, 200);
    const healthJson = await healthRes.json();
    assert.equal(healthJson.ok, true);
    assert.equal(healthJson.rulesetVersion, 4);
    assert.equal(healthJson.protocolVersion, 1);

    const hostA = await setupPlayerContext(
      chromium,
      launchOpts,
      { label: 'MatchA-Host', name: 'Chu Ban A', mssv: '20229101', viewport: { width: 1280, height: 800 }, mobile: false },
      shim.wsBaseUrl,
    );
    browsers.push(hostA.browser);
    contexts.push(hostA.context);
    allAudited.push(hostA);

    await enterCampusAndWaitHook(hostA.page, outUrl, hostA.audit);
    await hostA.page.evaluate(() => window.__bkhn.enterBoardGameClub());
    await hostA.page.waitForSelector('[data-testid="boardgame-club-hud"]', { timeout: UI_TIMEOUT });
    await hostA.page.locator('[data-testid="bg-toggle-lobby-btn"]').click();
    await hostA.page.waitForSelector('[data-testid="bg-sit-table-1-btn"]', { timeout: UI_TIMEOUT });
    await hostA.page.locator('[data-testid="bg-sit-table-1-btn"]').click();
    await hostA.page.waitForSelector('[data-testid="bg-hud-invite-code"]', { timeout: UI_TIMEOUT });
    const codeA = (await hostA.page.locator('[data-testid="bg-hud-invite-code"]').innerText()).trim();
    await setPage3DPaused(hostA.page, true);

    const dirResA = await fetch(`${shim.httpBaseUrl}/api/boardgame/matches`);
    const dirJsonA = await dirResA.json();
    const matchA = (dirJsonA.matches || []).find((m) => m.inviteCode === codeA);
    assert.ok(matchA, `Match A (${codeA}) must appear in directory`);

    const peerCtx = await peerBrowser.newContext({ viewport: { width: 800, height: 600 } });
    contexts.push(peerCtx);
    const peersA = [];
    for (let s = 1; s < 4; s++) {
      const pA = await createBrowserWsPeer(peerCtx, outUrl, shim.wsBaseUrl, `MatchA_P${s + 1}`, s);
      await pA.join(matchA.matchId, codeA, false);
      await pA.setReady(true);
      peersA.push(pA);
      allAudited.push(pA);
    }

    // Start Match A FIRST so hostA transitions to 2D board (suspend3D=true -> 0% WebGL CPU) before booting hostB
    await hostA.page.bringToFront();
    await hostA.page.waitForFunction(
      () => Boolean(document.querySelector('[data-testid="bg-hud-start-btn"]:not([disabled])')),
      null,
      { timeout: UI_TIMEOUT, polling: 200 },
    );
    await hostA.page.locator('[data-testid="bg-hud-start-btn"]').click();
    await hostA.page.waitForSelector('[data-testid="boardgame-2d-board"]', { timeout: UI_TIMEOUT });

    const hostB = await setupPlayerContext(
      chromium,
      launchOpts,
      { label: 'MatchB-Host', name: 'Chu Ban B', mssv: '20229102', viewport: { width: 1280, height: 800 }, mobile: false },
      shim.wsBaseUrl,
    );
    browsers.push(hostB.browser);
    contexts.push(hostB.context);
    allAudited.push(hostB);

    await hostB.page.bringToFront();
    await enterCampusAndWaitHook(hostB.page, outUrl, hostB.audit);
    await hostB.page.evaluate(() => window.__bkhn.enterBoardGameClub());
    await hostB.page.waitForSelector('[data-testid="boardgame-club-hud"]', { timeout: UI_TIMEOUT });
    await hostB.page.locator('[data-testid="bg-toggle-lobby-btn"]').click();
    await hostB.page.waitForSelector('[data-testid="bg-sit-table-2-btn"]', { timeout: UI_TIMEOUT });
    await hostB.page.locator('[data-testid="bg-sit-table-2-btn"]').click();
    await hostB.page.waitForSelector('[data-testid="bg-hud-invite-code"]', { timeout: UI_TIMEOUT });
    const codeB = (await hostB.page.locator('[data-testid="bg-hud-invite-code"]').innerText()).trim();
    await setPage3DPaused(hostB.page, true);
    assert.notEqual(codeA, codeB);

    const dirRes = await fetch(`${shim.httpBaseUrl}/api/boardgame/matches`);
    const dirJson = await dirRes.json();
    const matchANow = (dirJson.matches || []).find((m) => m.inviteCode === codeA);
    const matchB = (dirJson.matches || []).find((m) => m.inviteCode === codeB);
    assert.ok(matchANow && matchB && matchANow.matchId === matchA.matchId && matchA.matchId !== matchB.matchId);

    const peersB = [];
    for (let s = 1; s < 4; s++) {
      const pB = await createBrowserWsPeer(peerCtx, outUrl, shim.wsBaseUrl, `MatchB_P${s + 1}`, s);
      await pB.join(matchB.matchId, codeB, false);
      await pB.setReady(true);
      peersB.push(pB);
      allAudited.push(pB);
    }

    await hostB.page.bringToFront();
    await hostB.page.waitForFunction(
      () => Boolean(document.querySelector('[data-testid="bg-hud-start-btn"]:not([disabled])')),
      null,
      { timeout: UI_TIMEOUT, polling: 200 },
    );
    await hostB.page.locator('[data-testid="bg-hud-start-btn"]').click();
    await hostB.page.waitForSelector('[data-testid="boardgame-2d-board"]', { timeout: UI_TIMEOUT });

    // E2E-05: Assert matchId isolation on both Hosts & peers
    assert.deepEqual([...hostA.audit.matchIdsSeen], [matchA.matchId]);
    assert.deepEqual([...hostB.audit.matchIdsSeen], [matchB.matchId]);

    // E2E-06: Security probe from a real Chromium browser context
    const probePage = await peerCtx.newPage();
    await probePage.goto(`${outUrl}/__e2e-peer.html`, { waitUntil: 'domcontentloaded' });
    const secResults = await probePage.evaluate(
      async ({ wsUrl, mA, mB, foreignToken }) => {
        const openAndSend = (targetMatchId, payloads) =>
          new Promise((resolve) => {
            const ws = new WebSocket(`${wsUrl}/ws/boardgame?matchId=${encodeURIComponent(targetMatchId)}`);
            const received = [];
            let done = false;
            const finish = () => {
              if (done) return;
              done = true;
              clearTimeout(fallbackTimer);
              try {
                ws.close();
              } catch {
                // ignore close errors
              }
              resolve(received);
            };
            const fallbackTimer = setTimeout(finish, payloads.length * 60 + 2000);
            ws.onopen = () => {
              payloads.forEach((p, idx) => {
                setTimeout(() => {
                  ws.send(typeof p === 'string' ? p : JSON.stringify(p));
                }, idx * 45);
              });
            };
            ws.onmessage = (ev) => {
              try {
                received.push(JSON.parse(ev.data));
              } catch {
                received.push({ raw: ev.data });
              }
              if (received.length >= payloads.length) {
                finish();
              }
            };
            ws.onerror = () => finish();
          });

        const wrongTokenMsgs = await openAndSend(mB, [
          {
            type: 'BG_JOIN',
            matchId: mB,
            displayName: 'Attacker',
            reconnectToken: foreignToken,
          },
        ]);

        const fuzzMsgs = await openAndSend(mA, [
          '{"broken_json',
          { type: 'BG_FORCE_WIN' },
          { type: 'BG_SET_READY', ready: 'invalid-string' },
        ]);

        return { wrongTokenMsgs, fuzzMsgs };
      },
      {
        wsUrl: shim.wsBaseUrl,
        mA: matchA.matchId,
        mB: matchB.matchId,
        foreignToken: hostA.audit.selfReconnectToken,
      },
    );

    assert.ok(
      secResults.wrongTokenMsgs.some((m) => m.type === 'BG_ERROR' && m.code === 'UNAUTHORIZED'),
      `Cross-match token must fail with UNAUTHORIZED: ${JSON.stringify(secResults.wrongTokenMsgs)}`,
    );
    const invalidErrCount = secResults.fuzzMsgs.filter(
      (m) => m.type === 'BG_ERROR' && m.code === 'INVALID_ACTION',
    ).length;
    assert.equal(
      invalidErrCount,
      3,
      `All 3 malformed/unknown browser payloads must return INVALID_ACTION: ${JSON.stringify(secResults.fuzzMsgs)}`,
    );

    // Send prototype-key action & wrong-phase action from authenticated peer without crashing Match A DO
    const peerProtoRes = await peersA[0].sendAction({
      type: 'USE_CARD',
      cardId: 'ev-07',
      targetLocation: 'toString',
    });
    assert.equal(peerProtoRes.ok, false);
    assert.equal(peerProtoRes.code, 'INVALID_ACTION');

    // Step turns in Match A & Match B after probes to confirm full health
    let turnedA = false;
    let turnedB = false;
    for (let i = 0; i < 6 && (!turnedA || !turnedB); i++) {
      for (const p of peersA) {
        if (await p.stepFullTurnIfActive(true)) turnedA = true;
      }
      for (const p of peersB) {
        if (await p.stepFullTurnIfActive(true)) turnedB = true;
      }
      if (!turnedA) {
        const aOwn = await hostA.page
          .evaluate(() => Boolean(document.querySelector('[data-testid="bg-action-panel"]')))
          .catch(() => false);
        if (aOwn) {
          await hostA.page.bringToFront();
          turnedA = await playFirstValidStepOnPage(hostA.page, 0, new Set());
        }
      }
      if (!turnedB) {
        const bOwn = await hostB.page
          .evaluate(() => Boolean(document.querySelector('[data-testid="bg-action-panel"]')))
          .catch(() => false);
        if (bOwn) {
          await hostB.page.bringToFront();
          turnedB = await playFirstValidStepOnPage(hostB.page, 0, new Set());
        }
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    assert.equal(turnedA && turnedB, true, 'Both concurrent matches must process post-probe actions cleanly');

    verifyCommonAudits(allAudited);
    return { codeA, codeB, securityProbesPassed: 4 };
  } catch (err) {
    await captureFailureArtifacts('E2E-05-06', allAudited, err);
    throw err;
  } finally {
    for (const ctx of contexts) {
      await ctx.close().catch(() => undefined);
    }
    for (const b of browsers) {
      if (b) await b.close().catch(() => undefined);
    }
  }
}

async function main() {
  const shard = parseShardArg();
  if (!fs.existsSync(path.join(OUT_DIR, 'index.html'))) {
    throw new Error('Missing out/index.html — run npm run build before boardgame-e2e.cjs');
  }
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  for (const f of fs.readdirSync(SHOT_DIR)) {
    if (f.startsWith('failure-')) {
      fs.unlinkSync(path.join(SHOT_DIR, f));
    }
  }

  const { chromium } = loadPlaywright();
  const executablePath = resolveBrowserExecutable(chromium);
  const launchOpts = buildLaunchOptions(executablePath);
  const shimPort = await getFreePort();
  const shim = await startWsShim(shimPort);
  const { server: outServer, url: outUrl } = await startOutServer();

  let peerBrowser;
  try {
    peerBrowser = await chromium.launch(launchOpts);

    const summary = {
      shard,
      shotDir: SHOT_DIR,
      startedAt: new Date().toISOString(),
      scenarios: {},
    };

    if (shard === 'all' || shard === 'e2e-01-04') {
      const t1 = Date.now();
      summary.scenarios['E2E-01_E2E-04'] = {
        ...(await runE2E01AndE2E04(chromium, launchOpts, peerBrowser, outUrl, shim)),
        durationMs: Date.now() - t1,
      };
    }

    if (shard === 'all' || shard === 'e2e-02') {
      const t2 = Date.now();
      summary.scenarios['E2E-02'] = {
        ...(await runE2E02(chromium, launchOpts, peerBrowser, outUrl, shim)),
        durationMs: Date.now() - t2,
      };
    }

    if (shard === 'all' || shard === 'e2e-03') {
      const t3 = Date.now();
      summary.scenarios['E2E-03'] = {
        ...(await runE2E03(chromium, launchOpts, peerBrowser, outUrl, shim)),
        durationMs: Date.now() - t3,
      };
    }

    if (shard === 'all' || shard === 'e2e-05-06') {
      const t4 = Date.now();
      summary.scenarios['E2E-05_E2E-06'] = {
        ...(await runE2E05AndE2E06(chromium, launchOpts, peerBrowser, outUrl, shim)),
        durationMs: Date.now() - t4,
      };
    }

    summary.finishedAt = new Date().toISOString();
    const summaryText = JSON.stringify(summary, null, 2);
    fs.writeFileSync(path.join(SHOT_DIR, 'e2e-summary.json'), summaryText, 'utf8');
    if (shard !== 'all') {
      fs.writeFileSync(path.join(SHOT_DIR, `e2e-summary-${shard}.json`), summaryText, 'utf8');
    }
    console.log(`BOARDGAME V3.1 E2E PASS (${shard}):`, JSON.stringify(summary));
  } finally {
    if (peerBrowser) await peerBrowser.close().catch(() => undefined);
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
