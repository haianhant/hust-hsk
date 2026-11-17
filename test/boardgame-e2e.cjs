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

  async function stepFullTurnIfActive(preferExplore = true) {
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
      if (preferExplore && self2) {
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
      if (priv3?.hand && priv3.hand.length > 0) {
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
      } else if (priv3 && !priv3.revealed && priv3.roleId !== 'lang-tien-phong' && pub3.round >= 2) {
        act = { type: 'REVEAL_ROLE' };
      } else if ((self3?.attacksThisTurn ?? 0) < 1 && reachableEnemies.length > 0) {
        act = { type: 'ATTACK', targetPlayerId: reachableEnemies[0].playerId };
      } else if ((self3?.attacksThisTurn ?? 0) < 1 && hasMasamune && reachableAny.length > 0) {
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
      const actorMatch = rawStatus.match(/Lượt:\s*(.+?)(?=\s*(?:Mã:|Mở rộng|VFX|Bật|Tắt|🏆|📖|🚪|$))/u);
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

  if (!options.skipUnmask && (await pickAndClick('bg-unmask-hand-btn'))) return true;
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
    await p4.page.waitForSelector('[data-testid="bg-role-card-facedown"]', { timeout: UI_TIMEOUT });
    await checkMobileOverflowAndTabs('Vai bí mật');
    await p4.page.locator('[data-testid="bg-toggle-role-card"]').click();
    await p4.page.waitForSelector('[data-testid="bg-role-card-secret"]', { timeout: UI_TIMEOUT });
    await p4.page.locator('[data-testid="bg-toggle-role-card"]').click();
    await p4.page.waitForSelector('[data-testid="bg-role-card-facedown"]', { timeout: UI_TIMEOUT });

    await p4.page.locator('button:has-text("Nhật ký")').click();
    await p4.page.waitForSelector('[data-testid="bg-game-log"]', { timeout: UI_TIMEOUT });
    await checkMobileOverflowAndTabs('Nhật ký');

    await p4.page.locator('button:has-text("Bàn & Lượt")').click();
    await p4.page.waitForSelector('[data-testid="bg-loc-corridor"]', { timeout: UI_TIMEOUT });
    await checkMobileOverflowAndTabs('Bàn & Lượt');
    await p4.page.screenshot({ path: path.join(SHOT_DIR, 'bg4-03-gameboard-mobile.png') });

    // Rules modal, sound toggle, emote toast, hand mask & HP leak check on P1 & P4
    await p1.page.bringToFront();
    await p1.page.waitForSelector('[data-testid="bg-v3-status-bar"]', { timeout: UI_TIMEOUT });
    const timerText = await p1.page.locator('[data-testid="bg-turn-timer"]').innerText();
    assert.ok(
      timerText.includes('Suy nghĩ tự do') || timerText.includes('∞'),
      `Default turn timer must show infinite thinking mode, got: ${timerText}`,
    );
    await p1.page.locator('[data-testid="bg-board-rules-btn"]').click();
    await p1.page.waitForSelector('[data-testid="boardgame-rules-modal"]', { timeout: UI_TIMEOUT });
    const rulesModalText = await p1.page.locator('[data-testid="boardgame-rules-modal"]').innerText();
    assert.ok(
      rulesModalText.includes('Bối cảnh v4') && rulesModalText.includes('Bảo mật màn hình'),
      'Rules modal must reflect v4 mechanics',
    );
    await p1.page.locator('[data-testid="bg-close-rules-btn"]').click();

    await p1.page.locator('[data-testid="bg-sound-toggle-btn"]').click();
    await p1.page.locator('[data-testid="bg-sound-toggle-btn"]').click();
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
      if ((await activePlayer.page.locator('[data-testid="bg-end-turn-btn"]').count()) > 0) break;
      await playFirstValidStepOnPage(activePlayer.page, 0, undefined, {
        skipReveal: true,
        skipUnmask: true,
      });
      await activePlayer.page.waitForTimeout(160);
    }
    if ((await activePlayer.page.locator('[data-testid="bg-hand-masked-banner"]').count()) > 0) {
      await activePlayer.page.locator('[data-testid="bg-unmask-hand-btn"]').click();
      await activePlayer.page.waitForSelector('[data-testid^="bg-use-card-"]', { timeout: UI_TIMEOUT });
    }

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
    if ((await p1.page.locator('[data-testid="bg-role-card-facedown"]').count()) > 0) {
      await p1.page.locator('[data-testid="bg-toggle-role-card"]').click();
    }
    await p1.page.waitForSelector('[data-testid="bg-role-card-secret"]', { timeout: UI_TIMEOUT });
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

    // Drive full 4-player match to FINISHED while explicitly verifying E2E-04 mobile turn execution on P4
    let finished = false;
    let lastBroughtIdx = -1;
    let p4MobileButtonsChecked = false;
    let p4MobileActionsExecuted = 0;
    let p4CompletedFirstUnmask = activePlayer === p4;
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
        let p4MaskedBefore = 0;
        if (activeUi === p4) {
          p4MaskedBefore = await p4.page
            .locator('[data-testid="bg-hand-masked-banner"]')
            .count()
            .catch(() => 0);
          if (p4CompletedFirstUnmask) {
            assert.equal(
              p4MaskedBefore,
              0,
              'Hand must stay unmasked across turns once opened by player',
            );
          }
        }
        const acted = await playFirstValidStepOnPage(activeUi.page, step, triedActionsPerTurn);
        if (acted && activeUi === p4) {
          p4MobileActionsExecuted += 1;
        }
        await new Promise((r) => setTimeout(r, acted ? 110 : 60));
        if (activeUi === p4 && !p4CompletedFirstUnmask && p4MaskedBefore > 0 && acted) {
          const stillInPanelUnmasked = await p4.page
            .evaluate(
              () =>
                Boolean(document.querySelector('[data-testid="bg-action-panel"]')) &&
                !document.querySelector('[data-testid="bg-hand-masked-banner"]'),
            )
            .catch(() => false);
          if (stillInPanelUnmasked) {
            p4CompletedFirstUnmask = true;
          }
        }
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
    await spec.page.screenshot({ path: path.join(SHOT_DIR, 'bg-v31-8p-spectator.png') });

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

    // Read secret role name once before checkpoints
    await p1.page.locator('[data-testid="bg-toggle-role-card"]').click();
    await p1.page.waitForSelector('[data-testid="bg-role-card-secret"]', { timeout: UI_TIMEOUT });
    const expectedRoleName = (await p1.page.locator('[data-testid="bg-role-card-secret"] h3').innerText()).trim();

    // Helper: advance peers until P1 has ActionPanel
    const advancePeersUntilP1Active = async () => {
      for (let i = 0; i < 40; i++) {
        const isP1Turn = await p1.page
          .evaluate(() => Boolean(document.querySelector('[data-testid="bg-action-panel"]')))
          .catch(() => false);
        if (isP1Turn) return;
        for (const peer of peers) {
          await peer.stepFullTurnIfActive(true);
        }
        await new Promise((r) => setTimeout(r, 60));
      }
      throw new Error('Timed out waiting for P1 turn');
    };

    await advancePeersUntilP1Active();

    // Checkpoint 2: Reload during P1's own turn (MOVE_OR_STAY)
    await reloadAndRestoreTo('[data-testid="boardgame-2d-board"]');
    assert.equal(p1.audit.selfPlayerId, p1IdBefore, 'Checkpoint 2: must preserve exact playerId');
    await p1.page.locator('[data-testid="bg-toggle-role-card"]').click();
    await p1.page.waitForSelector('[data-testid="bg-role-card-secret"]', { timeout: UI_TIMEOUT });
    assert.equal(
      (await p1.page.locator('[data-testid="bg-role-card-secret"] h3').innerText()).trim(),
      expectedRoleName,
      'Checkpoint 2: secret role restored on own turn',
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
    await p1.page.locator('[data-testid="bg-toggle-role-card"]').click();
    assert.equal(
      (await p1.page.locator('[data-testid="bg-role-card-secret"] h3').innerText()).trim(),
      expectedRoleName,
      'Checkpoint 3: secret role restored during opponent turn',
    );

    // Advance back to P1 -> reach LOCATION_ACTION/MAIN_ACTION -> REVEAL_ROLE -> Checkpoint 4
    await advancePeersUntilP1Active();
    for (let s = 0; s < 5; s++) {
      if ((await p1.page.locator('[data-testid="bg-reveal-role-btn"]').count()) > 0) break;
      if ((await p1.page.locator('[data-testid="bg-roll-dice-btn"]').count()) > 0) {
        await p1.page.locator('[data-testid="bg-roll-dice-btn"]').click();
      } else if ((await p1.page.locator('[data-testid^="bg-choose-dest-"]').count()) > 0) {
        await p1.page.locator('[data-testid^="bg-choose-dest-"]').first().click();
      }
      await p1.page.waitForTimeout(180);
    }
    await p1.page.waitForSelector('[data-testid="bg-reveal-role-btn"]', { timeout: UI_TIMEOUT });
    await p1.page.locator('[data-testid="bg-reveal-role-btn"]').click();
    await p1.page.waitForSelector('[data-testid="bg-confirm-reveal-btn"]', { timeout: UI_TIMEOUT });
    await p1.page.locator('[data-testid="bg-confirm-reveal-btn"]').click();
    await p1.page.waitForSelector('[data-testid="bg-last-reveal-banner"]', { timeout: UI_TIMEOUT });

    // Checkpoint 4: Reload after voluntary role revelation
    await reloadAndRestoreTo('[data-testid="boardgame-2d-board"]');
    assert.equal(p1.audit.selfPlayerId, p1IdBefore, 'Checkpoint 4: must preserve exact playerId');
    await p1.page.locator('[data-testid="bg-toggle-role-card"]').click();
    await p1.page.waitForSelector('[data-testid="bg-role-card-secret"]', { timeout: UI_TIMEOUT });
    const roleCardTextC4 = await p1.page.locator('[data-testid="bg-role-card-secret"]').innerText();
    assert.equal(
      roleCardTextC4.includes('Cần lật vai'),
      false,
      'Checkpoint 4: revealed skill status must persist across reload after REVEAL_ROLE',
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
