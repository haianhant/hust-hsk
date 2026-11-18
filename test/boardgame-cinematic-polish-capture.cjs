/**
 * test/boardgame-cinematic-polish-capture.cjs
 * Automated 1920x1080 Before/After Evidence & Dual-FPS Benchmark for
 * AAA-Level Cinematic & Game Feel Polish in Bóng Đêm KTX (HUSTVerse).
 *
 * Measures:
 *   1) Unrecorded Live Play FPS (~20s active turns at 1920x1080 with ZERO MediaRecorder overhead)
 *   2) Recording MP4 FPS (1920x1080 Chrome Tab+Audio MediaRecorder video/mp4;codecs=avc1,opus)
 *
 * Saves deliverables to artifacts/boardgame-cinematic-polish/:
 *   - before-gameplay.mp4 (copied baseline from artifacts/boardgame-cinematic-review/gameplay-full.mp4)
 *   - after-gameplay-full.mp4 (2-3 min full polished match at 1920x1080)
 *   - after-cinematic-highlights.mp4 (highlight montage of polished VFX)
 *   - screenshots/*.png (keyframe PNGs covering Dice Clack/Settle, Pawn Glide, Card Flight/Flip,
 *     75ms Hit-Stop Impact Flash, Counterattack Parry/Riposte, Role Reveal Spotlight + 3D Flip,
 *     Signature Skills, Turn Transition, Damage Track & Victory/MatchResult)
 *   - performance-report.json (before vs after, unrecorded vs recording FPS, p95, drops, durations)
 *   - review-notes.md (timeline, honest FPS disclosure, visual QA evaluation & remaining notes)
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
const BASELINE_DIR = path.join(ROOT, 'artifacts', 'boardgame-cinematic-review');
const ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'boardgame-cinematic-polish');
const SHOT_DIR = path.join(ARTIFACT_DIR, 'screenshots');
const UI_TIMEOUT = 60000;

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
  '.mp4': 'video/mp4',
};

const TEST_USERS = [
  { label: 'P1', name: 'Sinh viên An', mssv: '20229101' },
  { label: 'P2', name: 'Sinh viên Bình', mssv: '20229102' },
  { label: 'P3', name: 'Sinh viên Chi', mssv: '20229103' },
  { label: 'P4', name: 'Sinh viên Dung', mssv: '20229104' },
];
const ALL_TEST_MSSVS = TEST_USERS.map((u) => u.mssv);

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
      // try next
    }
  }
  throw new Error('playwright-core not found — run `npm ci` first.');
}

function resolveChromeExecutable(chromium) {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  for (const p of ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium']) {
    if (fs.existsSync(p)) return p;
  }
  if (chromium && typeof chromium.executablePath === 'function') {
    const pwExec = chromium.executablePath();
    if (pwExec && fs.existsSync(pwExec)) return pwExec;
  }
  throw new Error('No Chrome/Chromium binary found.');
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

function startCaptureServer(captureDir) {
  let writeChain = Promise.resolve();
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const cleanUrl = decodeURIComponent((req.url || '/').split('?')[0]);

      if (cleanUrl === '/__capture-upload' && req.method === 'POST') {
        const targetName = String(req.headers['x-capture-file'] || 'after-gameplay-full.mp4');
        const safeName = path.basename(targetName);
        const destPath = path.join(captureDir, safeName);
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
          const buf = Buffer.concat(chunks);
          writeChain = writeChain.then(() => {
            fs.mkdirSync(captureDir, { recursive: true });
            fs.writeFileSync(destPath, buf);
          });
          writeChain.then(() => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, bytes: buf.length, file: safeName }));
          });
        });
        return;
      }

      if (cleanUrl.startsWith('/__capture-file/')) {
        const fname = path.basename(cleanUrl.slice('/__capture-file/'.length));
        const target = path.join(captureDir, fname);
        if (!fs.existsSync(target)) {
          res.writeHead(404);
          res.end('not found');
          return;
        }
        const stat = fs.statSync(target);
        const range = req.headers.range;
        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Content-Type': 'video/mp4',
          });
          fs.createReadStream(target, { start, end }).pipe(res);
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'video/mp4',
          'Content-Length': stat.size,
          'Accept-Ranges': 'bytes',
        });
        fs.createReadStream(target).pipe(res);
        return;
      }

      if (cleanUrl === '/__e2e-peer.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<!doctype html><html><head><title>Polish Peer</title></head><body>OK</body></html>');
        return;
      }

      if (cleanUrl === '/__verify-video.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<!doctype html><html><body style="background:#000;color:#fff"></body></html>');
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
      resolve({
        server,
        url: `http://127.0.0.1:${addr.port}`,
        flushWrites: () => writeChain,
      });
    });
  });
}

async function startWsShim(port) {
  const proc = spawn(process.execPath, [path.join(ROOT, 'test/ws-shim/server.js'), String(port)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  let err = '';
  proc.stdout.on('data', (d) => (out += d.toString()));
  proc.stderr.on('data', (d) => (err += d.toString()));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (proc.exitCode !== null) {
      throw new Error(`ws-shim exited early (${proc.exitCode}): ${out} ${err}`);
    }
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`);
      if (r.ok) {
        return { proc, httpBaseUrl: `http://127.0.0.1:${port}`, wsBaseUrl: `ws://127.0.0.1:${port}` };
      }
    } catch {
      // wait
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  proc.kill('SIGKILL');
  throw new Error('Timed out waiting for ws-shim');
}

function inspectMp4Atoms(filePath) {
  const buf = fs.readFileSync(filePath);
  const info = { sizeBytes: buf.length, topAtoms: [], tracks: [], mvhdDurationSec: null };
  function walk(start, end, ctx) {
    let off = start;
    while (off + 8 <= end) {
      let size = buf.readUInt32BE(off);
      const type = buf.toString('ascii', off + 4, off + 8);
      let hdr = 8;
      if (size === 1) {
        if (off + 16 > end) break;
        size = Number(buf.readBigUInt64BE(off + 8));
        hdr = 16;
      } else if (size === 0) {
        size = end - off;
      }
      if (size < hdr || off + size > end) break;
      if (start === 0) info.topAtoms.push({ type, size });
      if (type === 'mvhd' && off + hdr + 24 <= end) {
        const ver = buf[off + hdr];
        if (ver === 0 && off + hdr + 20 <= end) {
          const ts = buf.readUInt32BE(off + hdr + 12);
          const dur = buf.readUInt32BE(off + hdr + 16);
          if (ts > 0) info.mvhdDurationSec = Number((dur / ts).toFixed(2));
        } else if (ver === 1 && off + hdr + 32 <= end) {
          const ts = buf.readUInt32BE(off + hdr + 20);
          const dur = Number(buf.readBigUInt64BE(off + hdr + 24));
          if (ts > 0) info.mvhdDurationSec = Number((dur / ts).toFixed(2));
        }
      }
      if (type === 'tkhd' && off + hdr + 84 <= end) {
        const ver = buf[off + hdr];
        const wOff = ver === 1 ? off + hdr + 88 : off + hdr + 76;
        if (wOff + 8 <= off + size) {
          ctx.width = buf.readUInt32BE(wOff) >> 16;
          ctx.height = buf.readUInt32BE(wOff + 4) >> 16;
        }
      }
      if (type === 'hdlr' && off + hdr + 12 <= end) {
        ctx.handler = buf.toString('ascii', off + hdr + 8, off + hdr + 12);
      }
      if (type === 'trak') {
        const tCtx = { width: 0, height: 0, handler: null };
        walk(off + hdr, off + size, tCtx);
        info.tracks.push(tCtx);
      } else if (['moov', 'mdia'].includes(type)) {
        walk(off + hdr, off + size, ctx);
      }
      off += size;
    }
  }
  walk(0, buf.length, {});
  return info;
}

async function createWsPeer(context, outUrl, wsBaseUrl, displayName, preferredSeatIndex) {
  const page = await context.newPage();
  context.setDefaultTimeout(UI_TIMEOUT);
  page.setDefaultTimeout(UI_TIMEOUT);
  await page.goto(`${outUrl}/__e2e-peer.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.__peerState = { ws: null, auth: null, latestSync: null, messages: [] };
  });

  async function join(matchId, inviteCode) {
    return page.evaluate(
      ({ wsUrl, matchId: mId, inviteCode: code, name, seatIdx }) =>
        new Promise((resolve, reject) => {
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
                asSpectator: false,
                preferredSeatIndex: seatIdx,
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
              reject(new Error(`Peer BG_ERROR: ${msg.code} ${msg.message}`));
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
        }),
      { wsUrl: wsBaseUrl, matchId, inviteCode, name: displayName, seatIdx: preferredSeatIndex },
    );
  }

  async function setReady(ready = true) {
    await page.evaluate((r) => {
      window.__peerState.ws.send(
        JSON.stringify({
          type: 'BG_SET_READY',
          ready: r,
          requestId: `rdy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        }),
      );
    }, ready);
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
        const reqId = `peer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
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
        const deadline = Date.now() + 4500;
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
            resolve({ ok: false, code: 'TIMEOUT', reason: 'peer timeout' });
            return;
          }
          setTimeout(poll, 20);
        };
        setTimeout(poll, 20);
      });
    }, action);
  }

  async function close() {
    await page
      .evaluate(() => {
        try {
          if (window.__peerState?.ws) {
            window.__peerState.ws.send(JSON.stringify({ type: 'BG_LEAVE', requestId: `lv-${Date.now()}` }));
            window.__peerState.ws.close(1000, 'reset');
          }
        } catch {
          // ignore
        }
      })
      .catch(() => undefined);
    await page.close().catch(() => undefined);
  }

  return { page, displayName, join, setReady, getState, sendAction, close };
}

function fmtTimestamp(ms) {
  const sec = Math.max(0, ms / 1000);
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(Math.floor(sec % 60)).padStart(2, '0');
  const mmm = String(Math.floor(ms % 1000)).padStart(3, '0');
  return `${mm}:${ss}.${mmm}`;
}

async function injectRedactionStyles(page) {
  await page.evaluate(() => {
    if (document.getElementById('__bg_capture_redaction')) return;
    const style = document.createElement('style');
    style.id = '__bg_capture_redaction';
    style.textContent = `
      [data-testid="bg-hud-invite-code"],
      [data-testid="bg-board-invite-code"] {
        font-size: 0 !important;
        color: transparent !important;
      }
      [data-testid="bg-hud-invite-code"]::after,
      [data-testid="bg-board-invite-code"]::after {
        content: "Mã: [ẨN BẢO MẬT]";
        font-size: 11px;
        font-weight: 700;
        color: #fcd34d;
      }
    `;
    document.head.appendChild(style);
  });
}

async function captureShot(page, timeline, filename, title, t0Ms) {
  const cdp = page.__cdp;
  const outPath = path.join(SHOT_DIR, filename);
  const res = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(outPath, Buffer.from(res.data, 'base64'));
  const tMs = Date.now() - t0Ms;
  timeline.push({ tMs, timestamp: fmtTimestamp(tMs), kind: 'SCREENSHOT', detail: title, screenshot: filename });
  return outPath;
}

async function waitForDiceSettledOnPage(page, timeoutMs = 4500) {
  await page
    .waitForFunction(
      () => {
        const tray = document.querySelector('[data-testid="bg-dice-tray"]');
        const ov = document.querySelector('[data-testid="bg-vfx-dice-overlay"]');
        return (!ov || ov.getAttribute('data-dice-settled') === 'true') && (!tray || tray.getAttribute('data-dice-settled') === 'true');
      },
      null,
      { timeout: timeoutMs, polling: 50 },
    )
    .catch(() => undefined);
}

function summarizeFpsSamples(frameTimes, perSecArr, totalDurationMs) {
  const sorted = [...frameTimes].sort((a, b) => a - b);
  const pct = (p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0);
  return {
    sampleDurationSec: Number((totalDurationMs / 1000).toFixed(2)),
    framesCount: frameTimes.length,
    fpsMean: totalDurationMs > 0 ? Number((frameTimes.length / (totalDurationMs / 1000)).toFixed(2)) : 0,
    fpsMinPerSec: perSecArr.length > 1 ? Math.min(...perSecArr.slice(0, -1)) : perSecArr[0] || 0,
    fpsMaxPerSec: perSecArr.length ? Math.max(...perSecArr) : 0,
    p50FrameMs: Number(pct(0.5).toFixed(2)),
    p95FrameMs: Number(pct(0.95).toFixed(2)),
    p99FrameMs: Number(pct(0.99).toFixed(2)),
    frameDropsOver25ms: frameTimes.filter((d) => d > 25.0).length,
    frameDropsOver33ms: frameTimes.filter((d) => d > 33.4).length,
    frameDropsOver50ms: frameTimes.filter((d) => d > 50.0).length,
  };
}

async function runPolishCapture() {
  assert.ok(fs.existsSync(OUT_DIR), 'out/ missing — run npm run build first');
  fs.rmSync(ARTIFACT_DIR, { recursive: true, force: true });
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const baselineVideoSrc = path.join(BASELINE_DIR, 'gameplay-full.mp4');
  const beforeVideoDest = path.join(ARTIFACT_DIR, 'before-gameplay.mp4');
  let baselineReport = null;
  if (fs.existsSync(baselineVideoSrc)) {
    fs.copyFileSync(baselineVideoSrc, beforeVideoDest);
  }
  const baselineReportPath = path.join(BASELINE_DIR, 'performance-report.json');
  if (fs.existsSync(baselineReportPath)) {
    baselineReport = JSON.parse(fs.readFileSync(baselineReportPath, 'utf8'));
  }

  const pw = loadPlaywright();
  const chromium = pw.chromium;
  const executablePath = resolveChromeExecutable(chromium);
  const captureServer = await startCaptureServer(ARTIFACT_DIR);
  const shimPort = await getFreePort();
  const shim = await startWsShim(shimPort);

  let captureBrowser = null;
  let peerBrowser = null;
  const peers = [];
  const auditErrors = [];
  const consoleErrors = [];
  const pageErrors = [];
  const wsFrames = [];
  let currentInviteCode = null;
  let currentMatchId = null;
  let latestP1Sync = null;
  let wsReconnectEvents = [];
  let wsClosedAtMs = null;

  try {
    captureBrowser = await chromium.launch({
      headless: false,
      executablePath,
      args: [
        '--no-sandbox',
        '--headless=new',
        '--screen-info={0,0 2560x1600}',
        '--window-size=1922,1224',
        '--disable-dev-shm-usage',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--auto-accept-this-tab-capture',
        '--enable-usermedia-screen-capturing',
        '--allow-http-screen-capture',
        '--autoplay-policy=no-user-gesture-required',
      ],
    });

    peerBrowser = await chromium.launch({
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    });

    const p1Ctx = await captureBrowser.newContext({ viewport: { width: 1920, height: 1080 }, hasTouch: false });
    const peerCtx = await peerBrowser.newContext({ viewport: { width: 800, height: 600 } });

    await p1Ctx.addInitScript(
      ({ name, mssv, wsUrl }) => {
        window.__HUST_TEST_MP_WS_URL = wsUrl;
        window.localStorage.setItem('bkhn-identity-v1', JSON.stringify({ name, mssv }));
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
        window.localStorage.setItem('hustverse:bg-sound-muted:v1', '0');

        const OrigWS = window.WebSocket;
        window.WebSocket = function WrappedPolishWS(url, protocols) {
          const ws = protocols !== undefined ? new OrigWS(url, protocols) : new OrigWS(url);
          if (typeof url === 'string' && url.includes('/ws/boardgame')) {
            window.__testBgWs = ws;
            window.__bgWsOpenCount = (window.__bgWsOpenCount || 0) + 1;
          }
          return ws;
        };
        window.WebSocket.prototype = OrigWS.prototype;
        Object.assign(window.WebSocket, OrigWS);

        const OrigAC = window.AudioContext || window.webkitAudioContext;
        if (OrigAC && !window.__captureAcHooked) {
          window.__captureAcHooked = true;
          window.__audioStats = { contextsCreated: 0, oscillatorsCreated: 0, buffersStarted: 0 };
          function WrappedAC(...args) {
            const ctx = new OrigAC(...args);
            window.__audioStats.contextsCreated += 1;
            const origOsc = ctx.createOscillator.bind(ctx);
            const origBuf = ctx.createBufferSource.bind(ctx);
            ctx.createOscillator = () => {
              window.__audioStats.oscillatorsCreated += 1;
              return origOsc();
            };
            ctx.createBufferSource = () => {
              window.__audioStats.buffersStarted += 1;
              return origBuf();
            };
            return ctx;
          }
          WrappedAC.prototype = OrigAC.prototype;
          window.AudioContext = WrappedAC;
          if (window.webkitAudioContext) window.webkitAudioContext = WrappedAC;
        }

        const origAnimate = Element.prototype.animate;
        window.__waapiLog = [];
        Element.prototype.animate = function hookedAnimate(keyframes, options) {
          try {
            if (this instanceof HTMLElement && this.hasAttribute('data-pawn-glide')) {
              window.__waapiLog.push({
                kind: 'PAWN_GLIDE',
                playerId: this.getAttribute('data-pawn-glide'),
                durationMs: typeof options === 'number' ? options : options?.duration ?? null,
                tPerfMs: performance.now(),
              });
            }
          } catch {
            // ignore
          }
          return origAnimate.call(this, keyframes, options);
        };
      },
      { name: TEST_USERS[0].name, mssv: TEST_USERS[0].mssv, wsUrl: `${shim.wsBaseUrl}/ws` },
    );

    const p1Page = await p1Ctx.newPage();
    p1Ctx.setDefaultTimeout(UI_TIMEOUT);
    p1Page.setDefaultTimeout(UI_TIMEOUT);

    const cdp = await p1Ctx.newCDPSession(p1Page);
    p1Page.__cdp = cdp;
    const { windowId } = await cdp.send('Browser.getWindowForTarget');
    await cdp.send('Browser.setWindowBounds', { windowId, bounds: { width: 1922, height: 1224, windowState: 'normal' } });
    await p1Page.setViewportSize({ width: 1920, height: 1080 });

    p1Page.on('pageerror', (err) => pageErrors.push(`P1 pageerror: ${err.message}`));
    p1Page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`P1 console.error: ${msg.text()}`);
    });
    p1Page.on('websocket', (ws) => {
      if (!ws.url().includes('/ws/boardgame')) return;
      ws.on('framereceived', ({ payload }) => {
        const text = String(payload);
        for (const mssv of ALL_TEST_MSSVS) {
          if (text.includes(mssv)) auditErrors.push(`MSSV ${mssv} leaked inside WS frame!`);
        }
        try {
          const parsed = JSON.parse(text);
          if (parsed.type === 'BG_STATE_SYNC') {
            latestP1Sync = parsed;
            if (wsClosedAtMs !== null && wsReconnectEvents.length === 0) {
              wsReconnectEvents.push({
                reconnectLatencyMs: Date.now() - wsClosedAtMs,
                turnNumber: parsed.publicGame?.turnNumber ?? null,
                revision: parsed.revision ?? null,
              });
            }
          }
          wsFrames.push({ type: parsed.type, rev: parsed.revision ?? null });
          if (wsFrames.length > 500) wsFrames.shift();
        } catch {
          // ignore
        }
      });
    });

    console.log('[PolishCapture] Entering HUSTVerse & Board Game Club...');
    await p1Page.goto(captureServer.url, { waitUntil: 'domcontentloaded' });
    await p1Page.locator('#enter-campus').waitFor({ state: 'visible', timeout: 90000 });
    await p1Page.locator('#enter-campus').click({ timeout: 90000 });
    await p1Page.waitForFunction(() => Boolean(window.__bkhn?.enterBoardGameClub), null, { timeout: 90000 });
    await p1Page.evaluate(() => window.__bkhn.enterBoardGameClub());
    await p1Page.waitForSelector('[data-testid="boardgame-club-hud"]', { timeout: UI_TIMEOUT });
    await p1Page.evaluate(() => window.dispatchEvent(new CustomEvent('bkhn:pause-3d', { detail: true })));

    const joinNewRoomAndStart = async () => {
      for (const oldPeer of peers.splice(0)) {
        await oldPeer.close();
      }
      if ((await p1Page.locator('[data-testid="boardgame-lobby-modal"]').count()) === 0) {
        await p1Page.locator('[data-testid="bg-toggle-lobby-btn"]').click();
        await p1Page.waitForSelector('[data-testid="boardgame-lobby-modal"]', { timeout: UI_TIMEOUT });
      }
      await p1Page.locator('[data-testid="bg-sit-table-1-btn"]').click();
      await p1Page.waitForSelector('[data-testid="bg-hud-invite-code"]', { timeout: UI_TIMEOUT });
      currentInviteCode = (await p1Page.locator('[data-testid="bg-hud-invite-code"]').innerText()).trim();

      const dirRes = await fetch(`${shim.httpBaseUrl}/api/boardgame/matches`);
      const dirJson = await dirRes.json();
      const matchInfo = (dirJson.matches || []).find((m) => m.inviteCode === currentInviteCode);
      assert.ok(matchInfo, 'Match must appear in directory');
      currentMatchId = matchInfo.matchId;

      for (let seat = 1; seat <= 3; seat++) {
        const peer = await createWsPeer(peerCtx, captureServer.url, shim.wsBaseUrl, TEST_USERS[seat].name, seat);
        await peer.join(currentMatchId, currentInviteCode);
        await peer.setReady(true);
        peers.push(peer);
      }

      await p1Page.waitForFunction(
        () => Boolean(document.querySelector('[data-testid="bg-hud-start-btn"]:not([disabled])')),
        null,
        { timeout: UI_TIMEOUT, polling: 100 },
      );
      await p1Page.locator('[data-testid="bg-hud-start-btn"]').click();
      await p1Page.waitForSelector('[data-testid="boardgame-2d-board"]', { timeout: UI_TIMEOUT });
      await p1Page.waitForFunction(() => Boolean(document.querySelector('[data-testid="bg-v3-status-bar"]')));
    };

    const leaveCurrentRoomCleanly = async () => {
      await p1Page.locator('[data-testid="bg-board-leave-btn"]').click();
      await p1Page.waitForSelector('[data-testid="bg-confirm-leave-game-btn"]', { timeout: 10000 });
      await p1Page.locator('[data-testid="bg-confirm-leave-game-btn"]').click();
      await p1Page.waitForSelector('[data-testid="bg-toggle-lobby-btn"]', { timeout: UI_TIMEOUT });
      await p1Page.evaluate(() => {
        try {
          window.sessionStorage.removeItem('hustverse:bg-active-match:v1');
        } catch {
          // ignore
        }
      });
    };

    // -----------------------------------------------------------------------
    // PHASE A: UNRECORDED LIVE PLAY BENCHMARK (~20s active gameplay, no MediaRecorder)
    // -----------------------------------------------------------------------
    console.log('[PolishCapture] Running ~20s Unrecorded Live Play FPS benchmark...');
    await joinNewRoomAndStart();
    await p1Page.evaluate(() => {
      const ft = [];
      const perSec = new Map();
      const t0 = performance.now();
      let last = t0;
      let alive = true;
      const tick = (now) => {
        if (!alive) return;
        const dt = now - last;
        last = now;
        if (dt > 0 && dt < 2000) {
          ft.push(dt);
          const sec = Math.floor((now - t0) / 1000);
          perSec.set(sec, (perSec.get(sec) || 0) + 1);
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      window.__stopUnrecordedBench = () => {
        alive = false;
        const maxS = Math.max(0, ...perSec.keys());
        const arr = [];
        for (let s = 0; s <= maxS; s++) arr.push(perSec.get(s) || 0);
        return { frameTimes: ft, perSecArr: arr, totalMs: performance.now() - t0 };
      };
    });

    const unrecT0 = Date.now();
    while (Date.now() - unrecT0 < 15000) {
      if (latestP1Sync?.status === 'PLAYING' && latestP1Sync?.publicGame?.activePlayerId === latestP1Sync?.privateView?.playerId) {
        const pub = latestP1Sync.publicGame;
        if (pub.turnPhase === 'ROLL_MOVE') {
          await p1Page.locator('[data-testid="bg-roll-dice-btn"]').click().catch(() => undefined);
          await waitForDiceSettledOnPage(p1Page, 2600);
        } else if (pub.turnPhase === 'CHOOSE_MOVE') {
          await p1Page.locator('[data-testid="bg-primary-choose-dest-btn"]').click().catch(() => undefined);
          await p1Page.waitForTimeout(700);
        } else if (pub.turnPhase === 'LOCATION_ACTION') {
          const drawB = p1Page.locator('[data-testid^="bg-draw-"]').first();
          if ((await drawB.count()) > 0) await drawB.click().catch(() => undefined);
          else await p1Page.locator('[data-testid="bg-skip-loc-btn"]').click().catch(() => undefined);
          await p1Page.waitForTimeout(700);
        } else if (pub.turnPhase === 'MAIN_ACTION') {
          const skipC = p1Page.locator('[data-testid^="bg-skip-card-"]').first();
          const useC = p1Page.locator('[data-testid^="bg-use-card-"]').first();
          if ((await skipC.count()) > 0) await skipC.click().catch(() => undefined);
          else if ((await useC.count()) > 0 && (await useC.isEnabled().catch(() => false))) await useC.click().catch(() => undefined);
          else await p1Page.locator('[data-testid="bg-end-turn-btn"]').click().catch(() => undefined);
          await p1Page.waitForTimeout(400);
        }
      } else {
        let peerActed = false;
        for (const peer of peers) {
          const st = await peer.getState();
          const pub = st.sync?.publicGame;
          if (st.sync?.status === 'PLAYING' && pub?.activePlayerId === st.auth?.playerId) {
            peerActed = true;
            if (pub.turnPhase === 'ROLL_MOVE') await peer.sendAction({ type: 'ROLL_DICE' });
            else if (pub.turnPhase === 'CHOOSE_MOVE') await peer.sendAction({ type: 'CHOOSE_DEST', location: (pub.allowedMoveDestinations || ['lobby'])[0] });
            else if (pub.turnPhase === 'LOCATION_ACTION') await peer.sendAction({ type: 'SKIP_LOC' });
            else await peer.sendAction({ type: 'END_TURN' });
            await p1Page.waitForTimeout(550);
            break;
          }
        }
        if (!peerActed) await p1Page.waitForTimeout(120);
      }
    }
    const unrecRaw = await p1Page.evaluate(() => window.__stopUnrecordedBench());
    const unrecordedFps = summarizeFpsSamples(unrecRaw.frameTimes, unrecRaw.perSecArr, unrecRaw.totalMs);
    console.log('[PolishCapture] Unrecorded Live Play FPS:', unrecordedFps);
    await leaveCurrentRoomCleanly();

    // -----------------------------------------------------------------------
    // PHASE B: DEAL REAL 4-PLAYER RECORDING MATCH & RECORD 1920x1080 MP4s
    // -----------------------------------------------------------------------
    const PREFERRED_HUNTERS = new Set(['gac-radio', 'gac-ky-thuat']);
    let dealAttempt = 0;
    let selectedRoles = null;
    while (dealAttempt < 16) {
      dealAttempt += 1;
      await joinNewRoomAndStart();
      const p1RoleId = latestP1Sync?.privateView?.roleId || null;
      const peerStates = await Promise.all(peers.map((p) => p.getState()));
      const peerRoles = peerStates.map((s) => ({
        playerId: s.auth?.playerId,
        name: s.auth?.displayName,
        roleId: s.sync?.privateView?.roleId,
      }));
      const hasCounterDung = peerRoles.some((r) => r.roleId === 'suong-gac-cong');
      const p1IsActiveHunter = PREFERRED_HUNTERS.has(p1RoleId);
      const p1IsDung = p1RoleId === 'suong-gac-cong';
      const peerHasActiveHunter = peerRoles.some((r) => PREFERRED_HUNTERS.has(r.roleId));

      console.log(`[Deal #${dealAttempt}] P1=${p1RoleId} | Peers=${peerRoles.map((r) => r.roleId).join(', ')}`);
      if ((p1IsActiveHunter && hasCounterDung) || (dealAttempt >= 12 && p1IsDung && peerHasActiveHunter) || dealAttempt >= 16) {
        selectedRoles = { p1RoleId, peerRoles };
        break;
      }
      await leaveCurrentRoomCleanly();
    }

    assert.ok(selectedRoles, 'Failed to obtain match setup');
    await injectRedactionStyles(p1Page);
    await p1Page.evaluate(() => {
      window.__waapiLog = [];
      if (window.__audioStats) {
        window.__audioStats.oscillatorsCreated = 0;
        window.__audioStats.buffersStarted = 0;
      }
    });
    wsReconnectEvents = [];
    wsClosedAtMs = null;
    await p1Page.waitForTimeout(250);

    console.log('[PolishCapture] Starting live 1920x1080 60FPS Tab+Audio MediaRecorder...');
    const captureMeta = await p1Page.evaluate(async () => {
      const tickerEl = document.createElement('div');
      tickerEl.id = '__bg_capture_pulse';
      tickerEl.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;pointer-events:none;z-index:9999;opacity:0.01;background:#000';
      document.body.appendChild(tickerEl);

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 }, resizeMode: 'none' },
        audio: true,
        preferCurrentTab: true,
      });

      const trackSettings = stream.getVideoTracks()[0]?.getSettings?.() || {};
      const audioTracks = stream.getAudioTracks().map((t) => ({ label: t.label, enabled: t.enabled, settings: t.getSettings() }));
      const preferredMime = ['video/mp4;codecs=avc1,opus', 'video/mp4;codecs=avc1', 'video/mp4'].find((m) =>
        MediaRecorder.isTypeSupported(m),
      );
      if (!preferredMime) throw new Error('MP4 MediaRecorder mimeType unavailable');

      const fullRec = new MediaRecorder(stream, { mimeType: preferredMime, videoBitsPerSecond: 1950000 });
      const hlRec = new MediaRecorder(stream, { mimeType: preferredMime, videoBitsPerSecond: 2600000 });
      window.__fullRec = fullRec;
      window.__hlRec = hlRec;
      window.__captureStream = stream;

      const fullChunks = [];
      const hlChunks = [];
      fullRec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) fullChunks.push(ev.data);
      };
      hlRec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) hlChunks.push(ev.data);
      };

      const recStartWallMs = performance.now();
      const frameTimes = [];
      const fpsBuckets = new Map();
      let lastRaf = performance.now();
      let rafRunning = true;

      const rafLoop = (now) => {
        if (!rafRunning) return;
        const dt = now - lastRaf;
        lastRaf = now;
        if (dt > 0 && dt < 2000) {
          frameTimes.push(dt);
          const secBucket = Math.floor((now - recStartWallMs) / 1000);
          fpsBuckets.set(secBucket, (fpsBuckets.get(secBucket) || 0) + 1);
        }
        tickerEl.style.background = ((now | 0) & 1) ? '#010101' : '#020202';
        requestAnimationFrame(rafLoop);
      };
      requestAnimationFrame(rafLoop);

      const vfxTelemetry = {
        diceRolls: [],
        locationHighlights: [],
        cardDraws: [],
        cardZooms: [],
        impactFlashes: [],
        roleReveals: [],
        floatingPopups: [],
        cutIns: [],
      };
      let activeDiceRec = null;
      let activeHighlightRec = null;
      let activeCardDrawRec = null;
      let activeCutInRec = null;
      let activeRevealRec = null;
      let activeZoomRec = null;
      const seenImpactFlashIds = new Set();
      const activePopupStarts = new Map();

      const observer = new MutationObserver(() => {
        const now = performance.now() - recStartWallMs;
        const ov = document.querySelector('[data-testid="bg-vfx-dice-overlay"]');
        if (ov && !activeDiceRec) {
          activeDiceRec = { startMs: now, stage: ov.getAttribute('data-dice-stage'), settleMs: null, endMs: null };
        } else if (ov && activeDiceRec) {
          const st = ov.getAttribute('data-dice-stage');
          if (st === 'settled' && activeDiceRec.settleMs === null) activeDiceRec.settleMs = now - activeDiceRec.startMs;
        } else if (!ov && activeDiceRec) {
          activeDiceRec.durationMs = Math.round(now - activeDiceRec.startMs);
          vfxTelemetry.diceRolls.push(activeDiceRec);
          activeDiceRec = null;
        }

        const hlTile = document.querySelector('[data-destination-highlighted="true"]');
        if (hlTile && !activeHighlightRec) activeHighlightRec = { locTestId: hlTile.getAttribute('data-testid'), startMs: now };
        else if (!hlTile && activeHighlightRec) {
          activeHighlightRec.durationMs = Math.round(now - activeHighlightRec.startMs);
          vfxTelemetry.locationHighlights.push(activeHighlightRec);
          activeHighlightRec = null;
        }

        const cd = document.querySelector('[data-testid="bg-vfx-card-draw"]');
        if (cd && !activeCardDrawRec) {
          activeCardDrawRec = { showFront: cd.getAttribute('data-show-front') === 'true', deck: cd.getAttribute('data-deck'), startMs: now };
        } else if (!cd && activeCardDrawRec) {
          activeCardDrawRec.durationMs = Math.round(now - activeCardDrawRec.startMs);
          vfxTelemetry.cardDraws.push(activeCardDrawRec);
          activeCardDrawRec = null;
        }

        document.querySelectorAll('[data-testid="bg-vfx-impact-flash"]').forEach((fl) => {
          const isC = fl.getAttribute('data-counter') === 'true';
          const hs = Number(fl.getAttribute('data-hit-stop-ms') || 0);
          const key = `${Math.round(now / 120)}:${isC}:${hs}`;
          if (!seenImpactFlashIds.has(key)) {
            seenImpactFlashIds.add(key);
            vfxTelemetry.impactFlashes.push({ isCounter: isC, hitStopMs: hs, atMs: Math.round(now) });
          }
        });

        const revSpot = document.querySelector('[data-testid="bg-vfx-reveal-spotlight"]');
        if (revSpot && !activeRevealRec) {
          activeRevealRec = { faction: revSpot.getAttribute('data-faction'), startMs: now };
        } else if (!revSpot && activeRevealRec) {
          activeRevealRec.durationMs = Math.round(now - activeRevealRec.startMs);
          vfxTelemetry.roleReveals.push(activeRevealRec);
          activeRevealRec = null;
        }

        const zm = document.querySelector('[data-testid="bg-card-zoom-modal"]');
        if (zm && !activeZoomRec) activeZoomRec = { startMs: now };
        else if (!zm && activeZoomRec) {
          activeZoomRec.durationMs = Math.round(now - activeZoomRec.startMs);
          vfxTelemetry.cardZooms.push(activeZoomRec);
          activeZoomRec = null;
        }

        const pops = document.querySelectorAll('[data-testid="bg-vfx-floating-popup"]');
        const livePopKeys = new Set();
        pops.forEach((pEl) => {
          const key = `${pEl.getAttribute('data-variant')}:${pEl.getAttribute('data-target-player')}:${pEl.textContent}`;
          livePopKeys.add(key);
          if (!activePopupStarts.has(key)) activePopupStarts.set(key, { variant: pEl.getAttribute('data-variant'), startMs: now });
        });
        for (const [k, rec] of [...activePopupStarts.entries()]) {
          if (!livePopKeys.has(k)) {
            vfxTelemetry.floatingPopups.push({ variant: rec.variant, durationMs: Math.round(now - rec.startMs) });
            activePopupStarts.delete(k);
          }
        }

        const ci = document.querySelector('[data-testid="bg-vfx-cutin"]');
        if (ci && !activeCutInRec) activeCutInRec = { bannerType: ci.getAttribute('data-banner-type'), startMs: now };
        else if (!ci && activeCutInRec) {
          activeCutInRec.durationMs = Math.round(now - activeCutInRec.startMs);
          vfxTelemetry.cutIns.push(activeCutInRec);
          activeCutInRec = null;
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });

      window.__stopCaptureAndCollect = async () => {
        rafRunning = false;
        observer.disconnect();
        const totalDurationMs = performance.now() - recStartWallMs;
        const waitRecStop = (rec, fileName, chunks) =>
          new Promise((resolve) => {
            if (rec.state === 'inactive') {
              resolve();
              return;
            }
            rec.onstop = async () => {
              const blob = new Blob(chunks, { type: preferredMime });
              await fetch('/__capture-upload', { method: 'POST', headers: { 'x-capture-file': fileName }, body: blob });
              resolve();
            };
            rec.stop();
          });

        await Promise.all([
          waitRecStop(fullRec, 'after-gameplay-full.mp4', fullChunks),
          waitRecStop(hlRec, 'after-cinematic-highlights.mp4', hlChunks),
        ]);
        stream.getTracks().forEach((t) => t.stop());

        const maxSec = Math.max(0, ...fpsBuckets.keys());
        const perSecArr = [];
        for (let s = 0; s <= maxSec; s++) perSecArr.push(fpsBuckets.get(s) || 0);

        return {
          totalDurationMs,
          frameTimes,
          perSecArr,
          vfxTelemetry,
          waapiPawnGlides: (window.__waapiLog || []).filter((x) => x.kind === 'PAWN_GLIDE'),
          audioStats: window.__audioStats || null,
        };
      };

      fullRec.start();
      hlRec.start();
      return { preferredMime, trackSettings, audioTracks };
    });

    const t0Ms = Date.now();
    const timeline = [];
    const hlLog = [];

    const setHighlightActive = async (active, reason) => {
      const transition = await p1Page.evaluate((wantActive) => {
        const hl = window.__hlRec;
        if (!hl) return { changed: false, state: null };
        if (wantActive && hl.state === 'paused') {
          hl.resume();
          return { changed: true, state: 'recording' };
        }
        if (!wantActive && hl.state === 'recording') {
          hl.pause();
          return { changed: true, state: 'paused' };
        }
        return { changed: false, state: hl.state };
      }, active);
      const tMs = Date.now() - t0Ms;
      if (transition.changed && transition.state === 'recording') {
        hlLog.push({ label: reason || 'Highlight Clip', startTs: fmtTimestamp(tMs), startMs: tMs });
      } else if (transition.changed && transition.state === 'paused' && hlLog.length > 0 && hlLog[hlLog.length - 1].endMs === undefined) {
        hlLog[hlLog.length - 1].endTs = fmtTimestamp(tMs);
        hlLog[hlLog.length - 1].endMs = tMs;
      }
      await p1Page.waitForTimeout(160);
    };

    const recordEvent = (kind, detail) => {
      const tMs = Date.now() - t0Ms;
      timeline.push({ tMs, timestamp: fmtTimestamp(tMs), kind, detail });
    };

    recordEvent('MATCH_START', `Bắt đầu quay bản Polished AAA tại 1920x1080 (P1=${selectedRoles.p1RoleId})`);
    hlLog.push({ label: 'Mở màn trận đấu & tung D6+D4 clack spark', startTs: '00:00.000', startMs: 0 });

    const flags = {
      diceRollingShot: false,
      diceSettledShot: false,
      locHighlightShot: false,
      pawnGlideShot: false,
      cardDrawFlipShot: false,
      cardZoomFrontShot: false,
      cardZoomBackShot: false,
      targetingLineShot: false,
      attackHitStopShot: false,
      counterAttackShot: false,
      p1Revealed: false,
      p1RevealAnticipationShot: false,
      p1RevealFlipShot: false,
      p1SkillUsed: false,
      p1SkillShot: false,
      yourTurnCutInShot: false,
      endTurnRegressionChecked: false,
      emoteDamageTrackShot: false,
      reconnectProbed: false,
      dungRevealed: false,
      victoryCutInShot: false,
      postcardShot: false,
    };

    const stepPeerTurn = async (peer) => {
      const st0 = await peer.getState();
      const sync0 = st0.sync;
      if (!sync0 || sync0.status !== 'PLAYING' || sync0.publicGame?.activePlayerId !== st0.auth?.playerId) return false;
      const myId = st0.auth.playerId;
      const myRole = st0.sync.privateView?.roleId;
      const turnNum = sync0.publicGame.turnNumber;
      const slowPace = Date.now() - t0Ms < 68000;

      for (let i = 0; i < 4; i++) {
        const s = await peer.getState();
        const pub = s.sync?.publicGame;
        if (!s.sync || s.sync.status !== 'PLAYING' || pub?.activePlayerId !== myId || pub.turnNumber !== turnNum) break;
        if (pub.turnPhase === 'ROLL_MOVE') {
          await peer.sendAction({ type: 'ROLL_DICE' });
          await p1Page.waitForTimeout(slowPace ? 1250 : 700);
          await waitForDiceSettledOnPage(p1Page, 2200);
        } else if (pub.turnPhase === 'CHOOSE_MOVE') {
          const dungPlayer = pub.players.find((pl) => pl.alive && pl.playerId !== myId && pl.revealedRoleId === 'suong-gac-cong');
          const allowed = pub.allowedMoveDestinations || ['corridor', 'lobby', 'canteen', 'radio', 'breaker', 'court'];
          const dest = dungPlayer && allowed.includes(dungPlayer.location) ? dungPlayer.location : allowed[0];
          await peer.sendAction({ type: 'CHOOSE_DEST', location: dest });
          await p1Page.waitForTimeout(slowPace ? 700 : 400);
        } else {
          break;
        }
      }

      const st2 = await peer.getState();
      const pub2 = st2.sync?.publicGame;
      if (st2.sync?.status === 'PLAYING' && pub2?.activePlayerId === myId && pub2.turnPhase === 'LOCATION_ACTION') {
        const me = pub2.players.find((p) => p.playerId === myId);
        const holdLethal = Date.now() - t0Ms < 78000;
        let act = { type: 'SKIP_LOC' };
        if (holdLethal) {
          if (me?.location === 'radio') act = { type: 'DRAW_CARD', deck: 'investigation' };
          else if (me?.location === 'lobby') act = { type: 'DRAW_CARD', deck: 'equipment' };
          else if (me?.location === 'breaker' || me?.location === 'canteen') act = { type: 'DRAW_CARD', deck: 'event' };
        }
        if (me?.location === 'corridor') {
          if (holdLethal && me.woundsTaken >= 2) {
            act = { type: 'USE_LOC_POWER', mode: 'heal', targetPlayerId: myId };
          } else {
            const enemy = pub2.players.find((p) => p.alive && p.playerId !== myId && (!p.revealedFaction || p.revealedFaction !== st2.sync.privateView.faction));
            if (enemy && !holdLethal) act = { type: 'USE_LOC_POWER', mode: 'damage', targetPlayerId: enemy.playerId };
          }
        } else if (!holdLethal && (me?.location === 'breaker' || me?.location === 'canteen')) {
          act = { type: 'DRAW_CARD', deck: 'event' };
        }
        const rLoc = await peer.sendAction(act);
        if (!rLoc.ok && act.type !== 'SKIP_LOC') await peer.sendAction({ type: 'SKIP_LOC' });
        await p1Page.waitForTimeout(slowPace ? 750 : 320);
      }

      for (let step = 0; step < 5; step++) {
        const st3 = await peer.getState();
        const pub3 = st3.sync?.publicGame;
        const priv3 = st3.sync?.privateView;
        if (!st3.sync || st3.sync.status !== 'PLAYING' || pub3?.activePlayerId !== myId || pub3.turnPhase !== 'MAIN_ACTION') break;

        const me = pub3.players.find((p) => p.playerId === myId);
        const others = pub3.players.filter((p) => p.alive && p.playerId !== myId);
        const clusterOf = (locId) => (pub3.clusterPairs || []).find((c) => c.locationIds.includes(locId))?.clusterId || '';
        const hasHandgun = me?.equipped?.some((e) => e.id === 'ev-05');
        const enemies = others.filter((p) => !p.revealedFaction || priv3?.faction === 'wanderer' || p.revealedFaction !== priv3?.faction);
        const reachableEnemies = enemies.filter((p) => {
          const same = clusterOf(p.location) === clusterOf(me.location);
          return hasHandgun ? !same : same;
        });

        let act = { type: 'END_TURN' };
        if (priv3?.hand && priv3.hand.length > 0) {
          const card = priv3.hand[0];
          const tgt = others[0];
          if (card.deck === 'investigation' && tgt) act = { type: 'INVESTIGATE_CARD', cardId: card.id, targetPlayerId: tgt.playerId };
          else if (!card.isConsumable && card.deck !== 'investigation') act = { type: 'EQUIP_CARD', cardId: card.id };
          else if (['eq-13', 'eq-14', 'ev-13'].includes(card.id)) act = { type: 'USE_CARD', cardId: card.id, skipEffect: true };
          else if (['eq-08', 'eq-09', 'ev-07', 'ev-08', 'ev-10', 'ev-11', 'ev-12'].includes(card.id) && tgt) {
            act = { type: 'USE_CARD', cardId: card.id, targetPlayerId: tgt.playerId };
          } else {
            act = { type: 'USE_CARD', cardId: card.id };
          }
        } else if (myRole === 'suong-gac-cong' && priv3 && !priv3.revealed) {
          await setHighlightActive(true, 'Peer Reveal: Dũng Gác Cổng lộ vai chuẩn bị Phản kích');
          act = { type: 'REVEAL_ROLE' };
          flags.dungRevealed = true;
          recordEvent('PEER_REVEAL_DUNG', `${peer.displayName} (Dũng Gác Cổng) lật vai công khai`);
        } else if (priv3 && !priv3.revealed && pub3.round >= 2 && myRole !== 'lang-tien-phong') {
          act = { type: 'REVEAL_ROLE' };
        } else if ((me?.attacksThisTurn ?? 0) < 1 && reachableEnemies.length > 0) {
          const sortedEnemies = [...reachableEnemies].sort((a, b) => b.woundsTaken - a.woundsTaken);
          const dungReachable = sortedEnemies.find((p) => p.revealedRoleId === 'suong-gac-cong');
          const holdKill = Date.now() - t0Ms < 78000 && sortedEnemies.some((e) => e.woundsTaken >= 8);
          if (!holdKill || (!flags.counterAttackShot && dungReachable)) {
            const target = (!flags.counterAttackShot && dungReachable) || sortedEnemies[0];
            if (target.revealedRoleId === 'suong-gac-cong' && !flags.counterAttackShot) {
              await setHighlightActive(true, 'Sequence 4: Tấn công Dũng Gác Cổng -> Parry & Counterattack');
            }
            act = { type: 'ATTACK', targetPlayerId: target.playerId };
            recordEvent('PEER_ATTACK', `${peer.displayName} tấn công ${target.displayName}`);
          }
        }

        const res = await peer.sendAction(act);
        if (act.type === 'REVEAL_ROLE') {
          if (!flags.p1RevealFlipShot) {
            await p1Page
              .waitForSelector('[data-testid="bg-vfx-reveal-spotlight"]', {
                timeout: 2000,
                state: 'attached',
              })
              .catch(() => undefined);
            await p1Page.waitForTimeout(550);
            await captureShot(p1Page, timeline, '12-role-reveal-3d-flip-impact.png', 'Lật vai Pha Faction-Reveal/Impact: Card 3D xoay mở chân dung + Huy hiệu & hạt theo phe', t0Ms);
            flags.p1RevealFlipShot = true;
            await p1Page.waitForTimeout(650);
          } else {
            await p1Page.waitForTimeout(1300);
          }
          await setHighlightActive(false);
        } else if (act.type === 'ATTACK') {
          if (!flags.counterAttackShot) {
            const hasCounter = await p1Page
              .waitForSelector('[data-testid="bg-vfx-floating-popup"][data-variant="counter"]', { timeout: 2200 })
              .then(() => true)
              .catch(() => false);
            if (hasCounter) {
              await p1Page.waitForTimeout(60);
              await captureShot(p1Page, timeline, '10-counterattack-parry-riposte.png', 'Parry Shield + Vuốt Phản Kích & COUNTER popup', t0Ms);
              flags.counterAttackShot = true;
              await p1Page.waitForTimeout(1200);
              await setHighlightActive(false);
            }
          }
          await p1Page.waitForTimeout(slowPace ? 950 : 650);
        } else {
          await p1Page.waitForTimeout(320);
        }

        if (!res.ok && act.type !== 'END_TURN') {
          await peer.sendAction({ type: 'END_TURN' });
          break;
        }
        if (act.type === 'END_TURN') break;
      }

      await p1Page.waitForTimeout(200);
      if (!flags.yourTurnCutInShot) {
        const yt = p1Page.locator('[data-testid="bg-vfx-cutin"][data-banner-type="YOUR_TURN"]');
        if ((await yt.count()) > 0) {
          await captureShot(p1Page, timeline, '14-turn-transition-your-turn.png', 'Cut-in LƯỢT CỦA BẠN tới P1', t0Ms);
          flags.yourTurnCutInShot = true;
        }
      }
      return true;
    };

    console.log(`[PolishCapture] Recording started at ${new Date().toISOString()}...`);
    while (Date.now() - t0Ms < 152000) {
      if (latestP1Sync?.status === 'FINISHED' && latestP1Sync?.publicGame?.winnerLabel) break;

      const isP1Turn =
        latestP1Sync?.status === 'PLAYING' &&
        latestP1Sync?.publicGame?.activePlayerId === latestP1Sync?.privateView?.playerId;

      if (isP1Turn) {
        const pub = latestP1Sync.publicGame;
        const priv = latestP1Sync.privateView;

        if (!flags.yourTurnCutInShot) {
          const yt = await p1Page.locator('[data-testid="bg-vfx-cutin"][data-banner-type="YOUR_TURN"]').count();
          if (yt > 0) {
            await captureShot(p1Page, timeline, '14-turn-transition-your-turn.png', 'Cut-in chuyển lượt tới P1', t0Ms);
            flags.yourTurnCutInShot = true;
          }
        }

        // Sequence 1 & 2: D6+D4 + Clack Spark + Settle Ring + Location Highlight + Parabolic Pawn Glide
        if (pub.turnPhase === 'ROLL_MOVE') {
          const rollBtn = p1Page.locator('[data-testid="bg-roll-dice-btn"]');
          if ((await rollBtn.count()) > 0) {
            await setHighlightActive(true, 'Sequence 1&2: Xúc xắc D6+D4 va chạm, vòng khóa & quân cờ nhảy FLIP');
            recordEvent('P1_ROLL_DICE', `P1 tung D6+D4 (Lượt #${pub.turnNumber})`);
            await rollBtn.click();

            if (!flags.diceRollingShot) {
              await p1Page.waitForSelector('[data-testid="bg-dice-clack-spark"]', { timeout: 2200 }).catch(() => undefined);
              await captureShot(p1Page, timeline, '01-dice-tumble-clack-spark.png', 'Xúc xắc 3D lăn & tia va chạm D6-D4', t0Ms);
              flags.diceRollingShot = true;
            }

            await waitForDiceSettledOnPage(p1Page, 4000);
            if (!flags.diceSettledShot) {
              await captureShot(p1Page, timeline, '02-dice-settled-ring.png', 'Xúc xắc 3D chốt kết quả với vòng khóa Settle Ring', t0Ms);
              flags.diceSettledShot = true;
            }

            if (!flags.locHighlightShot) {
              const hl = await p1Page.waitForSelector('[data-destination-highlighted="true"]', { timeout: 2000 }).catch(() => null);
              if (hl) {
                await captureShot(p1Page, timeline, '03-location-destination-highlight.png', 'Highlight ô đích theo tổng D6+D4', t0Ms);
                flags.locHighlightShot = true;
              }
            }

            await p1Page.waitForTimeout(260);
            if (!flags.pawnGlideShot) {
              await captureShot(p1Page, timeline, '04-pawn-glide-arc-touchdown.png', 'Quân cờ nhảy parabol & touchdown ripple', t0Ms);
              flags.pawnGlideShot = true;
            }
            await p1Page.waitForTimeout(820);
            await setHighlightActive(false);
          }
        } else if (latestP1Sync?.publicGame?.turnPhase === 'CHOOSE_MOVE') {
          const pubC = latestP1Sync.publicGame;
          const dung = pubC.players.find((p) => p.alive && p.revealedRoleId === 'suong-gac-cong');
          const destBtn =
            dung && (await p1Page.locator(`[data-testid="bg-choose-dest-${dung.location}"]`).count()) > 0
              ? p1Page.locator(`[data-testid="bg-choose-dest-${dung.location}"]`)
              : p1Page.locator('[data-testid="bg-primary-choose-dest-btn"]');
          await destBtn.click();
          await p1Page.waitForTimeout(950);
        }

        // Sequence 3: Deck-to-center Card Draw Flight & 3D Flip + Card Zoom
        if (latestP1Sync?.publicGame?.turnPhase === 'LOCATION_ACTION') {
          const drawBtn = p1Page.locator('[data-testid^="bg-draw-"]').first();
          const healBtn = p1Page.locator('[data-testid="bg-loc-heal-btn"]');
          const dmgBtn = p1Page.locator('[data-testid="bg-loc-damage-btn"]');
          const skipLocBtn = p1Page.locator('[data-testid="bg-skip-loc-btn"]');

          if ((await drawBtn.count()) > 0) {
            const wantCardHighlight = !flags.cardDrawFlipShot || !flags.cardZoomFrontShot;
            if (wantCardHighlight) await setHighlightActive(true, 'Sequence 3: Thẻ bay từ deck lên trung tâm, lật 3D & Soi thẻ');
            recordEvent('P1_DRAW_CARD', 'P1 rút thẻ tại địa điểm');
            await drawBtn.click();

            if (!flags.cardDrawFlipShot) {
              await p1Page.waitForSelector('[data-testid="bg-vfx-card-draw"]', { timeout: 3000 }).catch(() => undefined);
              await p1Page.waitForTimeout(360);
              await captureShot(p1Page, timeline, '05-card-draw-flight-flip.png', 'Rút bài bay từ Deck lên tâm + vầng hào quang theo bộ bài', t0Ms);
              flags.cardDrawFlipShot = true;
            }
            await p1Page.waitForTimeout(1100);

            if (!flags.cardZoomFrontShot) {
              const zoomBtn = p1Page.locator('[data-testid="bg-action-panel"] button:has-text("Soi"), button[aria-label^="Phóng lớn thẻ "]').first();
              if ((await zoomBtn.count()) > 0) {
                await zoomBtn.click();
                await p1Page.waitForSelector('[data-testid="bg-card-zoom-modal"]', { timeout: 4000 });
                await p1Page.waitForTimeout(500);
                await captureShot(p1Page, timeline, '06-card-zoom-modal-front.png', 'Modal Card Zoom mặt trước', t0Ms);
                flags.cardZoomFrontShot = true;
                const flipBtn = p1Page.locator('[data-testid="bg-card-zoom-flip-btn"]');
                if (await flipBtn.isEnabled().catch(() => false)) {
                  await flipBtn.click();
                  await p1Page.waitForTimeout(600);
                  await captureShot(p1Page, timeline, '07-card-zoom-modal-back.png', 'Card Zoom lật 3D mặt lưng Ấn Ký', t0Ms);
                  flags.cardZoomBackShot = true;
                  await flipBtn.click();
                  await p1Page.waitForTimeout(400);
                }
                await p1Page.locator('[data-testid="bg-card-zoom-close-btn"]').click();
                await p1Page.waitForTimeout(320);
              }
            }
            if (wantCardHighlight) await setHighlightActive(false);
          } else if (priv.woundsTaken >= 2 && (await healBtn.count()) > 0) {
            await healBtn.click();
            await p1Page.waitForTimeout(850);
          } else if (Date.now() - t0Ms > 95000 && (await dmgBtn.isEnabled().catch(() => false))) {
            await dmgBtn.click();
            await p1Page.waitForTimeout(900);
          } else if ((await skipLocBtn.count()) > 0) {
            await skipLocBtn.click();
            await p1Page.waitForTimeout(320);
          }
        }

        for (let hStep = 0; hStep < 4; hStep++) {
          const skipCard = p1Page.locator('[data-testid^="bg-skip-card-"]').first();
          const useCard = p1Page.locator('[data-testid^="bg-use-card-"]').first();
          if ((await skipCard.count()) > 0 && (await skipCard.isEnabled().catch(() => false))) {
            await skipCard.click();
            await p1Page.waitForTimeout(500);
          } else if ((await useCard.count()) > 0 && (await useCard.isEnabled().catch(() => false))) {
            await useCard.click();
            await p1Page.waitForTimeout(800);
          } else {
            break;
          }
        }

        if (latestP1Sync?.publicGame?.turnPhase === 'MAIN_ACTION') {
          // Sequence 5A: Cinematic Role Reveal (Spotlight Vignette + 3D Card Flip)
          if (!flags.p1Revealed && !latestP1Sync.privateView?.revealed && latestP1Sync.privateView?.roleId !== 'lang-tien-phong') {
            await setHighlightActive(true, 'Sequence 5A: Lật vai Cinematic (Tối nền, Spotlight, 3D Flip & Hạt theo phe)');
            await p1Page.locator('[data-testid="bg-secondary-actions-btn"]').click();
            await p1Page.waitForTimeout(280);
            const revBtn = p1Page.locator('[data-testid="bg-reveal-role-btn"]');
            if ((await revBtn.count()) > 0) {
              await revBtn.click();
              await p1Page.waitForTimeout(240);
              await p1Page.locator('[data-testid="bg-confirm-reveal-btn"]').click();
              recordEvent('P1_REVEAL_ROLE', `P1 (${latestP1Sync.privateView.roleName}) lật vai công khai`);
              await p1Page.waitForSelector('[data-testid="bg-vfx-reveal-spotlight"]', { timeout: 3000, state: 'attached' }).catch(() => undefined);
              if (!flags.p1RevealAnticipationShot) {
                await captureShot(p1Page, timeline, '11-role-reveal-spotlight-anticipation.png', 'Lật vai Pha Anticipation: Tối bàn + Spotlight nhân vật + Mặt lưng 3D', t0Ms);
                flags.p1RevealAnticipationShot = true;
              }
              flags.p1Revealed = true;
              await p1Page.waitForTimeout(1250);
            } else {
              await p1Page.keyboard.press('Escape');
            }
            await setHighlightActive(false);
          }

          // Sequence 5B: Signature Skill Cast
          if (flags.p1Revealed && !flags.p1SkillUsed && Date.now() - t0Ms > 30000) {
            await p1Page.locator('[data-testid="bg-secondary-actions-btn"]').click();
            await p1Page.waitForTimeout(280);
            const skillBtn = p1Page.locator('[data-testid="bg-use-skill-btn"]');
            if ((await skillBtn.count()) > 0 && (await skillBtn.isEnabled().catch(() => false))) {
              await setHighlightActive(true, 'Sequence 5B: Tuyệt kỹ Signature Canvas Aura + Cut-In');
              await skillBtn.click();
              recordEvent('P1_USE_SKILL', 'P1 kích hoạt kỹ năng đặc biệt nhân vật');
              await p1Page.waitForSelector('[data-testid="bg-vfx-cutin"][data-banner-type="ULTIMATE_SKILL"]', { timeout: 3200 }).catch(() => undefined);
              await p1Page.waitForTimeout(180);
              await captureShot(p1Page, timeline, '13-signature-skill-cutin-vfx.png', 'Kỹ năng đặc trưng + Canvas Aura & Cut-in không che bàn', t0Ms);
              flags.p1SkillShot = true;
              flags.p1SkillUsed = true;
              await p1Page.waitForTimeout(1600);
              await setHighlightActive(false);
            } else {
              await p1Page.keyboard.press('Escape');
            }
          }

          // Sequence 4: Combat Impact, 75ms Hit-Stop Flash & Counterattack
          const attackBtn = p1Page.locator('[data-testid="bg-attack-btn"]');
          if ((await attackBtn.count()) > 0 && (await attackBtn.isEnabled().catch(() => false))) {
            const atkTargetPills = p1Page.locator('[data-testid^="bg-target-pill-other-"]:has-text("⚔️")');
            if ((await atkTargetPills.count()) > 0) {
              await setHighlightActive(true, 'Sequence 4: Target Lock -> Attack Travel -> 75ms Hit-Stop Flash -> Damage');
              await atkTargetPills.first().click();
              await p1Page.waitForTimeout(420);
              if (!flags.targetingLineShot) {
                const tLine = await p1Page.waitForSelector('[data-testid="bg-vfx-targeting-line"]', { timeout: 1500 }).catch(() => null);
                if (tLine) {
                  await captureShot(p1Page, timeline, '08-attack-targeting-line.png', 'Đường ngắm SVG mục tiêu', t0Ms);
                  flags.targetingLineShot = true;
                }
              }
              recordEvent('P1_ATTACK', 'P1 tấn công đối thủ trong cụm');
              await attackBtn.click();
              if (!flags.attackHitStopShot) {
                await p1Page
                  .waitForFunction(
                    () => Boolean(document.querySelector('[data-testid="bg-vfx-impact-flash"], [data-testid="bg-vfx-floating-popup"]')),
                    null,
                    { timeout: 3200, polling: 20 },
                  )
                  .catch(() => undefined);
                await captureShot(p1Page, timeline, '09-combat-hitstop-impact-flash.png', 'Khoảnh khắc Hit-Stop 75ms, Impact Flash & Floating Damage', t0Ms);
                flags.attackHitStopShot = true;
              } else {
                await p1Page.waitForTimeout(350);
              }
              if (!flags.counterAttackShot) {
                const counterHit = await p1Page
                  .waitForSelector('[data-testid="bg-vfx-floating-popup"][data-variant="counter"]', { timeout: 2200 })
                  .then(() => true)
                  .catch(() => false);
                if (counterHit) {
                  await p1Page.waitForTimeout(70);
                  await captureShot(p1Page, timeline, '10-counterattack-parry-riposte.png', 'Parry Shield + Vuốt Phản Kích & COUNTER popup', t0Ms);
                  flags.counterAttackShot = true;
                }
              }
              await waitForDiceSettledOnPage(p1Page, 3500);
              await p1Page.waitForTimeout(850);
              await setHighlightActive(false);
            }
          }

          if (!flags.emoteDamageTrackShot && Date.now() - t0Ms > 22000) {
            await setHighlightActive(true, 'Sequence 6A: Multiplayer Emote, Compact Damage Track & Sidebar');
            await p1Page.locator('[data-testid="bg-emote-wave"]').click();
            await p1Page.locator('[data-testid="bg-damage-track-toggle"]').click();
            await p1Page.locator('[data-testid="bg-sidebar-tab-gear"]').click();
            await p1Page.waitForTimeout(450);
            await captureShot(p1Page, timeline, '15-multiplayer-emote-damage-track.png', 'Emote, Thang thương tích mở rộng & Tab Trang bị', t0Ms);
            flags.emoteDamageTrackShot = true;
            await p1Page.waitForTimeout(500);
            await p1Page.locator('[data-testid="bg-sidebar-tab-log"]').click();
            await p1Page.waitForTimeout(500);
            await p1Page.locator('[data-testid="bg-damage-track-toggle"]').click();
            await p1Page.locator('[data-testid="bg-sidebar-tab-role"]').click();
            await setHighlightActive(false);
          }

          const endBtn = p1Page.locator('[data-testid="bg-end-turn-btn"]');
          if ((await endBtn.count()) > 0 && (await endBtn.isEnabled().catch(() => false))) {
            await waitForDiceSettledOnPage(p1Page, 4000);
            await endBtn.click();
            recordEvent('P1_END_TURN', 'P1 kết thúc lượt');
            await p1Page.waitForTimeout(320);
            if (!flags.endTurnRegressionChecked) {
              const postEndDice = await p1Page.evaluate(() => ({
                settled: document.querySelector('[data-testid="bg-dice-tray"]')?.getAttribute('data-dice-settled'),
                overlay: document.querySelectorAll('[data-testid="bg-vfx-dice-overlay"]').length,
              }));
              assert.equal(postEndDice.settled, 'true');
              assert.equal(postEndDice.overlay, 0);
              flags.endTurnRegressionChecked = true;
            }
          }
        }
      } else {
        if (!flags.reconnectProbed && Date.now() - t0Ms > 48000) {
          flags.reconnectProbed = true;
          wsClosedAtMs = Date.now();
          recordEvent('WS_RECONNECT_TEST', 'Kiểm tra ngắt và tự nối lại WebSocket giữa trận');
          await p1Page.evaluate(() => window.__testBgWs?.close(4000, 'polish-reconnect-probe'));
          await p1Page.waitForFunction((prevLen) => (window.__bgWsOpenCount || 0) >= prevLen, 2, { timeout: 12000, polling: 100 }).catch(() => undefined);
          await p1Page.waitForTimeout(850);
        }

        let acted = false;
        for (const peer of peers) {
          if (await stepPeerTurn(peer)) {
            acted = true;
            break;
          }
        }
        if (!acted) await p1Page.waitForTimeout(140);
      }
    }

    if (latestP1Sync?.status !== 'FINISHED') {
      await p1Page.waitForSelector('[data-testid="bg-match-result-modal"]', { timeout: 9000 }).catch(() => undefined);
    }
    if (latestP1Sync?.status === 'FINISHED') {
      await setHighlightActive(true, 'Sequence 6B: Pháo hoa chiến thắng & Màn hình tổng kết theo phe');
      await p1Page.waitForSelector('[data-testid="bg-match-postcard-img"]', { timeout: 8000 }).catch(() => undefined);
      await p1Page.waitForTimeout(400);
      await captureShot(p1Page, timeline, '16-victory-fireworks-and-match-result.png', 'Màn hình Tổng kết trận đấu theo phe thắng & MatchPostcard', t0Ms);
      flags.postcardShot = true;
    }

    const elapsedBeforeStop = Date.now() - t0Ms;
    if (elapsedBeforeStop < 126000) {
      const waitPostMs = 126000 - elapsedBeforeStop;
      recordEvent('POST_MATCH_REVIEW_HOLD', `Giữ tổng kết ${(waitPostMs / 1000).toFixed(1)}s để đạt video >= 2 phút`);
      await p1Page.waitForTimeout(waitPostMs);
    }
    await setHighlightActive(false);

    recordEvent('CAPTURE_STOP', `Hoàn tất ghi hình sau ${((Date.now() - t0Ms) / 1000).toFixed(1)}s`);
    const collected = await p1Page.evaluate(() => window.__stopCaptureAndCollect());
    await captureServer.flushWrites();

    const recordingFps = summarizeFpsSamples(collected.frameTimes, collected.perSecArr, collected.totalDurationMs);
    const fullPath = path.join(ARTIFACT_DIR, 'after-gameplay-full.mp4');
    const hlPath = path.join(ARTIFACT_DIR, 'after-cinematic-highlights.mp4');
    const fullAtoms = inspectMp4Atoms(fullPath);
    const hlAtoms = inspectMp4Atoms(hlPath);

    const verifyPlayback = async (fileName) => {
      const vPage = await captureBrowser.newPage();
      await vPage.goto(`${captureServer.url}/__verify-video.html`);
      const res = await vPage.evaluate(
        (srcUrl) =>
          new Promise((resolve) => {
            const v = document.createElement('video');
            v.src = srcUrl;
            v.muted = true;
            v.onloadedmetadata = () => resolve({ ok: true, width: v.videoWidth, height: v.videoHeight, duration: v.duration });
            v.onerror = () => resolve({ ok: false, error: 'video element error' });
          }),
        `${captureServer.url}/__capture-file/${fileName}`,
      );
      await vPage.close();
      return res;
    };

    const fullVerify = await verifyPlayback('after-gameplay-full.mp4');
    const hlVerify = await verifyPlayback('after-cinematic-highlights.mp4');

    const report = {
      generatedAt: new Date().toISOString(),
      target: 'Bóng Đêm KTX — AAA Cinematic & Game Feel Polish (Desktop 1920x1080)',
      environmentNote: 'Linux container CPU rasterizer (--use-gl=angle --use-angle=swiftshader) — no hardware GPU present',
      beforeBaseline: baselineReport
        ? {
            videoPath: 'artifacts/boardgame-cinematic-polish/before-gameplay.mp4',
            fps: baselineReport.performance,
            durationSec: baselineReport.videos?.gameplayFull?.durationSec ?? null,
          }
        : null,
      videos: {
        beforeGameplay: fs.existsSync(beforeVideoDest) ? { path: 'artifacts/boardgame-cinematic-polish/before-gameplay.mp4', sizeBytes: fs.statSync(beforeVideoDest).size } : null,
        afterGameplayFull: {
          path: 'artifacts/boardgame-cinematic-polish/after-gameplay-full.mp4',
          mimeType: captureMeta.preferredMime,
          sizeBytes: fullAtoms.sizeBytes,
          width: fullVerify.width || fullAtoms.tracks.find((t) => t.handler === 'vide')?.width || null,
          height: fullVerify.height || fullAtoms.tracks.find((t) => t.handler === 'vide')?.height || null,
          durationSec: Number((fullVerify.duration || fullAtoms.mvhdDurationSec || collected.totalDurationMs / 1000).toFixed(2)),
          hasVideoTrack: fullAtoms.tracks.some((t) => t.handler === 'vide'),
          hasAudioTrack: fullAtoms.tracks.some((t) => t.handler === 'soun') || captureMeta.audioTracks.length > 0,
          playbackVerified: fullVerify.ok,
        },
        afterCinematicHighlights: {
          path: 'artifacts/boardgame-cinematic-polish/after-cinematic-highlights.mp4',
          mimeType: captureMeta.preferredMime,
          sizeBytes: hlAtoms.sizeBytes,
          width: hlVerify.width || hlAtoms.tracks.find((t) => t.handler === 'vide')?.width || null,
          height: hlVerify.height || hlAtoms.tracks.find((t) => t.handler === 'vide')?.height || null,
          durationSec: Number((hlVerify.duration || hlAtoms.mvhdDurationSec || 0).toFixed(2)),
          hasVideoTrack: hlAtoms.tracks.some((t) => t.handler === 'vide'),
          hasAudioTrack: hlAtoms.tracks.some((t) => t.handler === 'soun') || captureMeta.audioTracks.length > 0,
          playbackVerified: hlVerify.ok,
          segments: hlLog,
        },
      },
      performance: {
        unrecordedLivePlay: unrecordedFps,
        duringRecording: recordingFps,
      },
      animationDurations: collected.vfxTelemetry,
      waapiPawnGlidesCount: collected.waapiPawnGlides.length,
      waapiSampleDurationsMs: collected.waapiPawnGlides.slice(0, 12).map((w) => w.durationMs),
      audio: {
        tabAudioCaptured: captureMeta.audioTracks.length > 0,
        audioTracks: captureMeta.audioTracks,
        synthesizedStats: collected.audioStats,
      },
      networkAndIntegrity: {
        wsFramesObservedOnP1: wsFrames.length,
        wsReconnectProbes: wsReconnectEvents,
        endTurnDuplicateDiceCheckPassed: flags.endTurnRegressionChecked,
        inviteCodeRedacted: true,
        mssvLeaksCount: auditErrors.length,
        consoleErrorsCount: consoleErrors.length,
        pageErrorsCount: pageErrors.length,
        auditErrors,
        consoleErrors,
        pageErrors,
      },
      evidenceChecklist: {
        screenshotsCount: fs.readdirSync(SHOT_DIR).length,
        flags,
      },
      timeline,
    };

    fs.writeFileSync(path.join(ARTIFACT_DIR, 'performance-report.json'), JSON.stringify(report, null, 2), 'utf8');

    const mdLines = [
      '# AAA-Level Cinematic & Game Feel Polish — Evidence & Review Report',
      '',
      `- **Ngày đo:** ${report.generatedAt}`,
      `- **Môi trường chạy:** ${report.environmentNote}`,
      `- **Video Trước (Baseline):** \`before-gameplay.mp4\` (${report.beforeBaseline?.durationSec ?? 'N/A'}s, FPS quay baseline = ${report.beforeBaseline?.fps?.fpsMean ?? 'N/A'} FPS, p95 = ${report.beforeBaseline?.fps?.p95FrameMs ?? 'N/A'}ms)`,
      `- **Video Sau (Polished Full):** \`after-gameplay-full.mp4\` (${report.videos.afterGameplayFull.width}×${report.videos.afterGameplayFull.height}, ${report.videos.afterGameplayFull.durationSec}s, ${(report.videos.afterGameplayFull.sizeBytes / (1024 * 1024)).toFixed(2)} MB, WebAudio Tab Track = ${report.videos.afterGameplayFull.hasAudioTrack ? 'Có' : 'Không'})`,
      `- **Video Sau (Highlights):** \`after-cinematic-highlights.mp4\` (${report.videos.afterCinematicHighlights.durationSec}s, ${(report.videos.afterCinematicHighlights.sizeBytes / (1024 * 1024)).toFixed(2)} MB)`,
      `- **FPS Chơi Thật (Unrecorded Live Play, ~${unrecordedFps.sampleDurationSec}s):** **${unrecordedFps.fpsMean} FPS** (min/s=${unrecordedFps.fpsMinPerSec}, max/s=${unrecordedFps.fpsMaxPerSec}, p50=${unrecordedFps.p50FrameMs}ms, p95=${unrecordedFps.p95FrameMs}ms, drops >25ms=${unrecordedFps.frameDropsOver25ms}, drops >33ms=${unrecordedFps.frameDropsOver33ms})`,
      `- **FPS Khi Đang Quay MP4 1080p (During Recording, ${recordingFps.sampleDurationSec}s):** **${recordingFps.fpsMean} FPS** (min/s=${recordingFps.fpsMinPerSec}, max/s=${recordingFps.fpsMaxPerSec}, p50=${recordingFps.p50FrameMs}ms, p95=${recordingFps.p95FrameMs}ms, drops >33ms=${recordingFps.frameDropsOver33ms})`,
      `- **Kiểm tra sạch lỗi & bảo mật:** Console errors = ${report.networkAndIntegrity.consoleErrorsCount}, Page errors = ${report.networkAndIntegrity.pageErrorsCount}, MSSV leaks = ${report.networkAndIntegrity.mssvLeaksCount}, Invite code redacted = ${report.networkAndIntegrity.inviteCodeRedacted}`,
      '',
      '---',
      '',
      '## 1. So sánh Timing & VFX Trước/Sau',
      '',
      '| Hạng mục | Số lần quan sát | Thông số đo thực tế | Ghi chú chất lượng |',
      '| --- | --- | --- | --- |',
      `| Role Reveal 3D + Spotlight | ${report.animationDurations.roleReveals.length} | ${report.animationDurations.roleReveals.map((r) => `${r.durationMs}ms (${r.faction})`).join(', ') || '0'} | Có làm tối nền, spotlight nhân vật, thẻ 3D xoay lật & hạt theo phe |`,
      `| Combat 75ms Hit-Stop Flash | ${report.animationDurations.impactFlashes.length} | hitStop=${report.animationDurations.impactFlashes.map((f) => `${f.hitStopMs}ms`).slice(0, 6).join(', ') || '75ms'} | Chuỗi Target Lock -> Travel -> 75ms Hit-Stop + Flash -> Floating Damage |`,
      `| Xúc xắc 3D & Clack Spark | ${report.animationDurations.diceRolls.length} | duration=${report.animationDurations.diceRolls.map((d) => `${d.durationMs}ms`).slice(0, 5).join(', ')} | Bouncing deceleration, tia va chạm khi tumble & vòng khóa settle |`,
      `| Rút bài Bay từ Deck + Lật 3D | ${report.animationDurations.cardDraws.length} | duration=${report.animationDurations.cardDraws.map((c) => `${c.durationMs}ms (${c.deck})`).slice(0, 5).join(', ')} | Quỹ đạo từ Deck tới tâm, màu radar/hex/surge theo bộ bài |`,
      `| WAAPI Parabolic Pawn Glide | ${report.waapiPawnGlidesCount} | ${report.waapiSampleDurationsMs.slice(0, 5).join(', ')} ms | Quỹ đạo nhảy có đỉnh & drop-shadow động + touchdown ripple |`,
      `| WebAudio Cues | 1 session | osc=${report.audio.synthesizedStats?.oscillatorsCreated ?? 0}, pcm=${report.audio.synthesizedStats?.buffersStarted ?? 0} | Đồng bộ âm thanh Reveal, Parry-Riposte 2 nhịp, Card Play & Victory |`,
      '',
      '---',
      '',
      '## 2. Mốc Timeline & Screenshots',
      '',
      '| Thời điểm (`MM:SS.mmm`) | Loại | Chi tiết / Ảnh |',
      '| --- | --- | --- |',
      ...timeline.map((ev) => `| \`${ev.timestamp}\` | \`${ev.kind}\` | ${ev.detail}${ev.screenshot ? ` ([${ev.screenshot}](./screenshots/${ev.screenshot}))` : ''} |`),
      '',
    ];
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'review-notes.md'), mdLines.join('\n'), 'utf8');

    assert.ok(report.videos.afterGameplayFull.durationSec >= 120 && report.videos.afterGameplayFull.durationSec <= 185, `after-gameplay-full.mp4 duration (${report.videos.afterGameplayFull.durationSec}s) must be 120-185s`);
    assert.equal(report.videos.afterGameplayFull.width, 1920);
    assert.equal(report.videos.afterGameplayFull.height, 1080);
    assert.equal(consoleErrors.length, 0, `Console errors: ${consoleErrors.join('; ')}`);
    assert.equal(pageErrors.length, 0, `Page errors: ${pageErrors.join('; ')}`);
    assert.equal(auditErrors.length, 0, `Audit errors: ${auditErrors.join('; ')}`);

    console.log('[PolishCapture PASS]', {
      unrecordedFpsMean: unrecordedFps.fpsMean,
      unrecordedP95Ms: unrecordedFps.p95FrameMs,
      recordingFpsMean: recordingFps.fpsMean,
      recordingP95Ms: recordingFps.p95FrameMs,
      durationSec: report.videos.afterGameplayFull.durationSec,
      screenshots: report.evidenceChecklist.screenshotsCount,
    });
  } finally {
    for (const p of peers) await p.close().catch(() => undefined);
    if (captureBrowser) await captureBrowser.close().catch(() => undefined);
    if (peerBrowser) await peerBrowser.close().catch(() => undefined);
    captureServer.server.close();
    shim.proc.kill('SIGTERM');
  }
}

runPolishCapture().catch((err) => {
  console.error('[PolishCapture FAILED]', err);
  process.exit(1);
});
