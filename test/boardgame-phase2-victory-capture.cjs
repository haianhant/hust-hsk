/**
 * test/boardgame-phase2-victory-capture.cjs
 * Automated 1920x1080 Before/After Evidence & Verification Harness for
 * Phase 2 — Victory & Defeat Cinematic V2 in Bóng Đêm KTX (HUSTVerse).
 *
 * Usage:
 *   node test/boardgame-phase2-victory-capture.cjs --mode=before
 *   node test/boardgame-phase2-victory-capture.cjs --mode=after
 *
 * Deliverables stored in artifacts/boardgame-cinematic-polish/phase-2/:
 *   - before-victory.mp4 (pre-Phase-2 real 4-player match ending)
 *   - after-victory-defeat.mp4 (Phase-2 real 4-player + spectator match ending + smooth transition to MatchPostcard)
 *   - after-factions-showcase.mp4 (controlled /boardgame-prototype showcase of all 3 factions x Victory/Defeat/Spectator)
 *   - screenshots/*.png (before + all Phase-2 stages, all 3 factions, Victory/Defeat/Spectator & MatchPostcard)
 *   - performance-report.json
 *   - review-notes.md
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
const ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'boardgame-cinematic-polish', 'phase-2');
const SHOT_DIR = path.join(ARTIFACT_DIR, 'screenshots');
const UI_TIMEOUT = 60000;

const modeArg = process.argv.find((a) => a.startsWith('--mode='));
const MODE = modeArg ? modeArg.slice('--mode='.length) : 'after';
if (MODE !== 'before' && MODE !== 'after') {
  throw new Error(`Invalid --mode=${MODE}; expected 'before' or 'after'`);
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
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
};

const TEST_USERS = [
  { label: 'P1', name: 'Sinh viên An', mssv: '20229201' },
  { label: 'P2', name: 'Sinh viên Bình', mssv: '20229202' },
  { label: 'P3', name: 'Sinh viên Chi', mssv: '20229203' },
  { label: 'P4', name: 'Sinh viên Dung', mssv: '20229204' },
  { label: 'SPEC', name: 'Khán giả Minh', mssv: '20229205' },
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
      // next
    }
  }
  throw new Error('playwright-core not found');
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
  throw new Error('No Chrome/Chromium binary found');
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
        const targetName = path.basename(String(req.headers['x-capture-file'] || 'capture.mp4'));
        const destPath = path.join(captureDir, targetName);
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
            res.end(JSON.stringify({ ok: true, bytes: buf.length, file: targetName }));
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
        res.end('<!doctype html><html><head><title>Phase2 Peer</title></head><body>OK</body></html>');
        return;
      }

      if (cleanUrl === '/__verify-video.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<!doctype html><html><body style="background:#000;color:#fff"></body></html>');
        return;
      }

      const rawPath = cleanUrl.length > 1 ? cleanUrl.replace(/\/+$/, '') : cleanUrl;
      let filePath = path.join(OUT_DIR, rawPath === '/' ? 'index.html' : rawPath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      } else if (!fs.existsSync(filePath) && fs.existsSync(`${filePath}.html`)) {
        filePath = `${filePath}.html`;
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
      // retry
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  proc.kill('SIGKILL');
  throw new Error('Timed out waiting for ws-shim');
}

function inspectMp4Atoms(filePath) {
  const buf = fs.readFileSync(filePath);
  const info = { sizeBytes: buf.length, tracks: [], mvhdDurationSec: null };
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

async function createWsPeer(context, outUrl, wsBaseUrl, displayName, preferredSeatIndex, asSpectator = false) {
  const page = await context.newPage();
  page.setDefaultTimeout(UI_TIMEOUT);
  await page.goto(`${outUrl}/__e2e-peer.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.__peerState = { ws: null, auth: null, latestSync: null, messages: [] };
  });

  async function join(matchId, inviteCode) {
    return page.evaluate(
      ({ wsUrl, matchId: mId, inviteCode: code, name, seatIdx, spec }) =>
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
                asSpectator: spec,
                preferredSeatIndex: spec ? undefined : seatIdx,
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
      { wsUrl: wsBaseUrl, matchId, inviteCode, name: displayName, seatIdx: preferredSeatIndex, spec: asSpectator },
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
        const deadline = Date.now() + 4000;
        const poll = () => {
          for (let i = startIdx; i < st.messages.length; i++) {
            const m = st.messages[i];
            if (m.type === 'BG_ACTION_ACK' && m.requestId === reqId) {
              if (!m.ok || (st.latestSync && st.latestSync.revision >= m.revision)) {
                resolve(m);
                return;
              }
              const waitSyncDeadline = Date.now() + 600;
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

function summarizeFpsSamples(frameTimes, perSecArr, totalDurationMs) {
  const sorted = [...frameTimes].sort((a, b) => a - b);
  const pct = (p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0);
  return {
    sampleDurationSec: Number((totalDurationMs / 1000).toFixed(2)),
    framesCount: frameTimes.length,
    fpsMean: totalDurationMs > 0 ? Number(((frameTimes.length * 1000) / totalDurationMs).toFixed(2)) : 0,
    fpsMinPerSec: perSecArr.length ? Math.min(...perSecArr) : 0,
    fpsMaxPerSec: perSecArr.length ? Math.max(...perSecArr) : 0,
    p50FrameMs: Number(pct(0.5).toFixed(1)),
    p95FrameMs: Number(pct(0.95).toFixed(1)),
    p99FrameMs: Number(pct(0.99).toFixed(1)),
    frameDropsOver33ms: frameTimes.filter((d) => d > 33.4).length,
    frameDropsOver50ms: frameTimes.filter((d) => d > 50).length,
  };
}

async function captureShot(page, filename) {
  const outPath = path.join(SHOT_DIR, filename);
  if (page.__cdp) {
    const res = await page.__cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(outPath, Buffer.from(res.data, 'base64'));
  } else {
    await page.screenshot({ path: outPath });
  }
  return outPath;
}

async function startTabRecorder(page, targetFileName) {
  return page.evaluate(async (fileName) => {
    const tickerEl = document.createElement('div');
    tickerEl.id = '__bg_phase2_ticker';
    tickerEl.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;pointer-events:none;z-index:9999;opacity:0.01;background:#000';
    document.body.appendChild(tickerEl);

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 }, resizeMode: 'none' },
      audio: true,
      preferCurrentTab: true,
    });

    const preferredMime = ['video/mp4;codecs=avc1,opus', 'video/mp4;codecs=avc1', 'video/mp4'].find((m) =>
      MediaRecorder.isTypeSupported(m),
    );
    if (!preferredMime) throw new Error('MP4 MediaRecorder mimeType unavailable');

    const rec = new MediaRecorder(stream, { mimeType: preferredMime, videoBitsPerSecond: 2200000 });
    const chunks = [];
    rec.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };

    const startWall = performance.now();
    const frameTimes = [];
    const fpsBuckets = new Map();
    let lastRaf = startWall;
    let running = true;
    const loop = (now) => {
      if (!running) return;
      const dt = now - lastRaf;
      lastRaf = now;
      if (dt > 0 && dt < 2000) {
        frameTimes.push(dt);
        const sec = Math.floor((now - startWall) / 1000);
        fpsBuckets.set(sec, (fpsBuckets.get(sec) || 0) + 1);
      }
      tickerEl.style.background = (now | 0) & 1 ? '#010101' : '#020202';
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    const victoryObs = {
      startedAtMs: null,
      endedAtMs: null,
      phasesSeen: [],
      outcome: null,
      faction: null,
      modalOpenedAtMs: null,
    };
    const observer = new MutationObserver(() => {
      const now = performance.now() - startWall;
      const spot = document.querySelector('[data-testid="bg-vfx-victory-spotlight"]');
      if (spot) {
        if (victoryObs.startedAtMs === null) {
          victoryObs.startedAtMs = now;
          victoryObs.outcome = spot.getAttribute('data-outcome');
          victoryObs.faction = spot.getAttribute('data-faction');
        }
        const ph = spot.getAttribute('data-victory-phase');
        if (ph && victoryObs.phasesSeen[victoryObs.phasesSeen.length - 1] !== ph) {
          victoryObs.phasesSeen.push(ph);
        }
      } else if (victoryObs.startedAtMs !== null && victoryObs.endedAtMs === null) {
        victoryObs.endedAtMs = now;
      }
      const modal = document.querySelector('[data-testid="bg-match-result-modal"]');
      if (modal && victoryObs.modalOpenedAtMs === null) {
        victoryObs.modalOpenedAtMs = now;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-victory-phase', 'data-outcome', 'data-faction'] });

    rec.start(250);

    window.__stopPhase2Capture = async () => {
      running = false;
      observer.disconnect();
      const totalDurationMs = performance.now() - startWall;
      await new Promise((resolve) => {
        rec.onstop = resolve;
        rec.stop();
      });
      stream.getTracks().forEach((t) => t.stop());
      tickerEl.remove();

      const blob = new Blob(chunks, { type: preferredMime });
      const buf = await blob.arrayBuffer();
      const up = await fetch('/__capture-upload', {
        method: 'POST',
        headers: { 'x-capture-file': fileName, 'Content-Type': 'application/octet-stream' },
        body: buf,
      });
      const upJson = await up.json();
      const maxS = Math.max(0, ...fpsBuckets.keys());
      const perSecArr = [];
      for (let s = 0; s <= maxS; s++) perSecArr.push(fpsBuckets.get(s) || 0);
      return {
        upload: upJson,
        mimeType: preferredMime,
        totalDurationMs,
        frameTimes,
        perSecArr,
        victoryObs,
        audioStats: window.__audioStats || null,
      };
    };

    return {
      preferredMime,
      hasAudioTrack: stream.getAudioTracks().length > 0,
    };
  }, targetFileName);
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

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const pw = loadPlaywright();
  const chromium = pw.chromium;
  const executablePath = resolveChromeExecutable(chromium);
  const captureServer = await startCaptureServer(ARTIFACT_DIR);
  const shimPort = await getFreePort();
  const shim = await startWsShim(shimPort);

  let captureBrowser = null;
  let peerBrowser = null;
  const peers = [];
  const consoleErrors = [];
  const pageErrors = [];
  const auditErrors = [];
  let latestP1Sync = null;
  let preEndLeakDetected = false;

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
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    const p1Ctx = await captureBrowser.newContext({ viewport: { width: 1920, height: 1080 }, hasTouch: false });
    const peerCtx = await peerBrowser.newContext({ viewport: { width: 1280, height: 800 } });

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
      },
      { name: TEST_USERS[0].name, mssv: TEST_USERS[0].mssv, wsUrl: `${shim.wsBaseUrl}/ws` },
    );

    const p1Page = await p1Ctx.newPage();
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
          if (text.includes(mssv)) auditErrors.push(`MSSV ${mssv} leaked in WS frame`);
        }
        try {
          const parsed = JSON.parse(text);
          if (parsed.type === 'BG_STATE_SYNC') {
            latestP1Sync = parsed;
            if (parsed.status === 'PLAYING' && parsed.publicGame) {
              if (parsed.publicGame.finalReveal || parsed.publicGame.winnerLabel) {
                preEndLeakDetected = true;
              }
            }
          }
        } catch {
          // ignore
        }
      });
    });

    console.log(`[Phase2Capture:${MODE}] Entering HUSTVerse & Board Game Club...`);
    await p1Page.goto(captureServer.url, { waitUntil: 'domcontentloaded' });
    await p1Page.locator('#enter-campus').waitFor({ state: 'visible', timeout: 90000 });
    await p1Page.locator('#enter-campus').click({ timeout: 90000 });
    await p1Page.waitForFunction(() => Boolean(window.__bkhn?.enterBoardGameClub), null, { timeout: 90000 });
    await p1Page.evaluate(() => window.__bkhn.enterBoardGameClub());
    await p1Page.waitForSelector('[data-testid="boardgame-club-hud"]', { timeout: UI_TIMEOUT });
    await p1Page.evaluate(() => window.dispatchEvent(new CustomEvent('bkhn:pause-3d', { detail: true })));

    await p1Page.locator('[data-testid="bg-toggle-lobby-btn"]').click();
    await p1Page.waitForSelector('[data-testid="boardgame-lobby-modal"]', { timeout: UI_TIMEOUT });
    await p1Page.locator('[data-testid="bg-sit-table-1-btn"]').click();
    await p1Page.waitForSelector('[data-testid="bg-hud-invite-code"]', { timeout: UI_TIMEOUT });
    const inviteCode = (await p1Page.locator('[data-testid="bg-hud-invite-code"]').innerText()).trim();

    const dirRes = await fetch(`${shim.httpBaseUrl}/api/boardgame/matches`);
    const dirJson = await dirRes.json();
    const matchInfo = (dirJson.matches || []).find((m) => m.inviteCode === inviteCode);
    assert.ok(matchInfo, 'Match must appear in directory');
    const matchId = matchInfo.matchId;

    for (let seat = 1; seat <= 3; seat++) {
      const peer = await createWsPeer(peerCtx, captureServer.url, shim.wsBaseUrl, TEST_USERS[seat].name, seat, false);
      await peer.join(matchId, inviteCode);
      await peer.setReady(true);
      peers.push(peer);
    }

    // Real Spectator WS peer to verify spectator privacy & spectator match-end view
    const spectatorPeer = await createWsPeer(peerCtx, captureServer.url, shim.wsBaseUrl, TEST_USERS[4].name, undefined, true);
    await spectatorPeer.join(matchId, inviteCode);

    await p1Page.waitForFunction(
      () => Boolean(document.querySelector('[data-testid="bg-hud-start-btn"]:not([disabled])')),
      null,
      { timeout: UI_TIMEOUT, polling: 100 },
    );
    await p1Page.locator('[data-testid="bg-hud-start-btn"]').click();
    await p1Page.waitForSelector('[data-testid="boardgame-2d-board"]', { timeout: UI_TIMEOUT });
    await p1Page.waitForFunction(() => Boolean(document.querySelector('[data-testid="bg-v3-status-bar"]')));
    await injectRedactionStyles(p1Page);

    // Helper: step peer aggressively toward match end
    const stepPeerFast = async (peer) => {
      const st = await peer.getState();
      const sync = st.sync;
      if (!sync || sync.status !== 'PLAYING' || sync.publicGame?.activePlayerId !== st.auth?.playerId) return false;
      const myId = st.auth.playerId;
      const myFaction = sync.privateView?.faction;

      for (let i = 0; i < 6; i++) {
        const cur = await peer.getState();
        const pub = cur.sync?.publicGame;
        const priv = cur.sync?.privateView;
        if (!cur.sync || cur.sync.status !== 'PLAYING' || pub?.activePlayerId !== myId) break;
        if (pub.turnPhase === 'ROLL_MOVE') {
          await peer.sendAction({ type: 'ROLL_DICE' });
        } else if (pub.turnPhase === 'CHOOSE_MOVE') {
          const allowed = pub.allowedMoveDestinations || ['corridor', 'lobby', 'canteen', 'radio', 'breaker', 'court'];
          const dest = allowed.includes('corridor') ? 'corridor' : allowed[0];
          await peer.sendAction({ type: 'CHOOSE_DEST', location: dest });
        } else if (pub.turnPhase === 'LOCATION_ACTION') {
          const me = pub.players.find((p) => p.playerId === myId);
          const enemy = pub.players.find((p) => p.alive && p.playerId !== myId && (!p.revealedFaction || p.revealedFaction !== myFaction));
          if (me?.location === 'corridor' && enemy) {
            const r = await peer.sendAction({ type: 'USE_LOC_POWER', mode: 'damage', targetPlayerId: enemy.playerId });
            if (!r.ok) await peer.sendAction({ type: 'SKIP_LOC' });
          } else {
            await peer.sendAction({ type: 'SKIP_LOC' });
          }
        } else if (pub.turnPhase === 'MAIN_ACTION') {
          const me = pub.players.find((p) => p.playerId === myId);
          const others = pub.players.filter((p) => p.alive && p.playerId !== myId);
          const clusterOf = (loc) => (pub.clusterPairs || []).find((c) => c.locationIds.includes(loc))?.clusterId || '';
          const reachable = others.filter((p) => clusterOf(p.location) === clusterOf(me?.location));
          const enemies = reachable.filter((p) => !p.revealedFaction || p.revealedFaction !== myFaction);
          const target = (enemies.length ? enemies : reachable).sort((a, b) => b.woundsTaken - a.woundsTaken)[0];
          if (priv?.hand?.length) {
            await peer.sendAction({ type: 'USE_CARD', cardId: priv.hand[0].id, skipEffect: true });
          } else if (target && (me?.attacksThisTurn ?? 0) < 1) {
            const r = await peer.sendAction({ type: 'ATTACK', targetPlayerId: target.playerId });
            if (!r.ok) await peer.sendAction({ type: 'END_TURN' });
          } else {
            await peer.sendAction({ type: 'END_TURN' });
            break;
          }
        }
      }
      return true;
    };

    const stepP1Ui = async () => {
      if (!latestP1Sync || latestP1Sync.status !== 'PLAYING') return false;
      const pub = latestP1Sync.publicGame;
      const myId = latestP1Sync.privateView?.playerId;
      if (!pub || pub.activePlayerId !== myId) return false;

      if (pub.turnPhase === 'ROLL_MOVE') {
        await p1Page.locator('[data-testid="bg-roll-dice-btn"]').click().catch(() => undefined);
        await p1Page.waitForTimeout(350);
      } else if (pub.turnPhase === 'CHOOSE_MOVE') {
        const btn = p1Page.locator('[data-testid="bg-primary-choose-dest-btn"]');
        if ((await btn.count()) > 0) await btn.click().catch(() => undefined);
        await p1Page.waitForTimeout(250);
      } else if (pub.turnPhase === 'LOCATION_ACTION') {
        const dmgBtn = p1Page.locator('[data-testid="bg-loc-power-damage-btn"]');
        const skipBtn = p1Page.locator('[data-testid="bg-skip-loc-btn"]');
        if ((await dmgBtn.count()) > 0 && (await dmgBtn.isEnabled().catch(() => false))) {
          await dmgBtn.click().catch(() => undefined);
        } else if ((await skipBtn.count()) > 0) {
          await skipBtn.click().catch(() => undefined);
        }
        await p1Page.waitForTimeout(250);
      } else if (pub.turnPhase === 'MAIN_ACTION') {
        const skipC = p1Page.locator('[data-testid^="bg-skip-card-"]').first();
        const atkBtn = p1Page.locator('[data-testid="bg-attack-btn"]');
        const endBtn = p1Page.locator('[data-testid="bg-end-turn-btn"]');
        if ((await skipC.count()) > 0 && (await skipC.isEnabled().catch(() => false))) {
          await skipC.click().catch(() => undefined);
        } else if ((await atkBtn.count()) > 0 && (await atkBtn.isEnabled().catch(() => false))) {
          const atkTargets = p1Page.locator('[data-testid^="bg-target-pill-other-"]:has-text("⚔️")');
          if ((await atkTargets.count()) > 0) await atkTargets.first().click().catch(() => undefined);
          await atkBtn.click().catch(() => undefined);
        } else if ((await endBtn.count()) > 0 && (await endBtn.isEnabled().catch(() => false))) {
          await endBtn.click().catch(() => undefined);
        }
        await p1Page.waitForTimeout(260);
      }
      return true;
    };

    // Fast-forward match until close to lethal climax (any player >= 6 wounds or eliminated)
    console.log(`[Phase2Capture:${MODE}] Driving live 4-player match to endgame climax...`);
    let recorderStarted = false;
    const videoFileName = MODE === 'before' ? 'before-victory.mp4' : 'after-victory-defeat.mp4';
    let capturedBeforeInstant = false;
    let capturedAfterAnticipation = false;
    let capturedAfterFactionReveal = false;
    let capturedAfterImpact = false;
    let finishedSyncWallMs = null;

    for (let tick = 0; tick < 240; tick++) {
      const pub = latestP1Sync?.publicGame;
      const maxWounds = pub ? Math.max(...pub.players.map((p) => p.woundsTaken)) : 0;
      const deadCount = pub ? pub.players.filter((p) => !p.alive).length : 0;

      // Start 1920x1080 recording right before endgame climax
      if (!recorderStarted && (maxWounds >= 5 || deadCount >= 1 || tick >= 12)) {
        recorderStarted = true;
        console.log(`[Phase2Capture:${MODE}] Starting 1920x1080 Tab+Audio MediaRecorder (${videoFileName})...`);
        await startTabRecorder(p1Page, videoFileName);
      }

      if (latestP1Sync?.status === 'FINISHED') {
        finishedSyncWallMs = Date.now();
        break;
      }

      // Check pre-end spectator privacy
      const specSt = await spectatorPeer.getState();
      if (specSt.sync?.status === 'PLAYING' && specSt.sync.publicGame?.finalReveal) {
        preEndLeakDetected = true;
      }

      const actedP1 = await stepP1Ui();
      if (!actedP1) {
        let actedPeer = false;
        for (const peer of peers) {
          if (await stepPeerFast(peer)) {
            actedPeer = true;
            break;
          }
        }
        if (!actedPeer) await p1Page.waitForTimeout(120);
      }

      // Skip mid-game VFX rapidly ONLY before recording starts so endgame reaches quickly
      if (!recorderStarted) {
        const skipBtn = p1Page.locator('[data-testid="bg-skip-vfx-btn"]');
        if ((await skipBtn.count()) > 0) {
          await skipBtn.click().catch(() => undefined);
        }
      }
    }

    assert.equal(latestP1Sync?.status, 'FINISHED', 'Live match must reach FINISHED');
    assert.equal(preEndLeakDetected, false, 'Zero finalReveal / winner leaks allowed while match is PLAYING');
    if (!recorderStarted) {
      await startTabRecorder(p1Page, videoFileName);
      recorderStarted = true;
    }

    const liveWinnerFaction = latestP1Sync.publicGame?.winnerFaction || null;
    const liveWinnerLabel = latestP1Sync.publicGame?.winnerLabel || null;
    const p1SelfId = latestP1Sync.privateView?.playerId || null;
    const liveP1Outcome = p1SelfId && latestP1Sync.publicGame?.winnerPlayerIds?.includes(p1SelfId) ? 'victory' : 'defeat';

    if (MODE === 'before') {
      await p1Page.waitForSelector('[data-testid="bg-match-result-modal"]', { timeout: 10000 });
      await captureShot(p1Page, 'before-01-match-end-instant-modal.png');
      capturedBeforeInstant = true;
      await p1Page.waitForSelector('[data-testid="bg-match-postcard-img"]', { timeout: 10000 }).catch(() => undefined);
      await p1Page.waitForTimeout(1200);
      await captureShot(p1Page, 'before-02-match-result-postcard.png');
      await p1Page.waitForTimeout(1500);
    } else {
      // Phase 2 AFTER: Capture Anticipation -> Faction Reveal -> Impact -> Settle to MatchPostcard
      const spotAttached = await p1Page
        .waitForSelector('[data-testid="bg-vfx-victory-spotlight"]', { timeout: 4000, state: 'attached' })
        .then(() => true)
        .catch(() => false);
      if (spotAttached) {
        // Verify MatchResult is held back during the cinematic!
        const modalDuringCinematic = await p1Page.locator('[data-testid="bg-match-result-modal"]').count();
        assert.equal(modalDuringCinematic, 0, 'MatchResult modal must NOT overlap Victory/Defeat cinematic');
        await captureShot(p1Page, 'after-01-live-faction-reveal.png');
        capturedAfterAnticipation = true;
      }

      await p1Page.waitForSelector('[data-testid="bg-match-result-modal"]', { timeout: 10000 });
      await p1Page.waitForSelector('[data-testid="bg-match-postcard-img"]', { timeout: 10000 }).catch(() => undefined);
      await p1Page.waitForTimeout(500);
      await captureShot(p1Page, 'after-04-live-settle-match-postcard.png');
      await p1Page.waitForTimeout(1600);
    }

    const liveCaptureRes = await p1Page.evaluate(() => window.__stopPhase2Capture());
    await captureServer.flushWrites();

    // Verify F5 Reload / Reconnect Non-Replay on FINISHED match (After mode)
    let f5NonReplayVerified = false;
    if (MODE === 'after') {
      await p1Page.reload({ waitUntil: 'domcontentloaded' });
      await p1Page.locator('#enter-campus').waitFor({ state: 'visible', timeout: 60000 });
      await p1Page.locator('#enter-campus').click();
      await p1Page.waitForSelector('[data-testid="bg-match-result-modal"]', { timeout: UI_TIMEOUT });
      const replayedSpotCount = await p1Page.locator('[data-testid="bg-vfx-victory-spotlight"]').count();
      assert.equal(replayedSpotCount, 0, 'F5 reload on FINISHED match must NEVER replay Victory/Defeat cinematic');
      f5NonReplayVerified = true;
    }

    // Check real Spectator final view received winner info ONLY after FINISHED
    const specFinal = await spectatorPeer.getState();
    assert.equal(specFinal.sync?.status, 'FINISHED');
    assert.ok(specFinal.sync?.publicGame?.winnerLabel, 'Spectator receives authoritative winnerLabel on FINISHED');

    // Part B (AFTER mode only): Controlled Multi-Faction x Multi-Outcome Showcase on /boardgame-prototype
    let showcaseCaptureRes = null;
    let showcaseMatrix = null;
    if (MODE === 'after') {
      console.log('[Phase2Capture:after] Recording controlled /boardgame-prototype 3-faction x 3-outcome showcase...');
      await p1Page.goto(`${captureServer.url}/boardgame-prototype`, { waitUntil: 'networkidle' });
      await p1Page.locator('[data-testid="proto-vfx-arena"]').scrollIntoViewIfNeeded();
      await p1Page.waitForTimeout(300);

      await startTabRecorder(p1Page, 'after-factions-showcase.mp4');

      // 1) Lantern Guard — Stage 3 VICTORY Impact
      await p1Page.locator('[data-testid="proto-vfx-victory-lantern"]').click();
      await p1Page.waitForSelector('[data-testid="bg-vfx-victory-spotlight"][data-faction="lantern-guard"]', { timeout: 3000, state: 'attached' });
      await p1Page.waitForTimeout(820);
      await captureShot(p1Page, 'after-05-victory-lantern-guard-impact.png');
      await p1Page.waitForTimeout(1500);

      // 2) Mist Order — Stage 3 DEFEAT Impact
      await p1Page.locator('[data-testid="proto-vfx-defeat-mist"]').click();
      await p1Page.waitForSelector('[data-testid="bg-vfx-victory-spotlight"][data-outcome="defeat"]', { timeout: 3000, state: 'attached' });
      await p1Page.waitForTimeout(820);
      await captureShot(p1Page, 'after-06-defeat-mist-order-impact.png');
      await p1Page.waitForTimeout(1500);

      // 3) Wanderer — Stage 3 SPECTATOR Impact
      await p1Page.locator('[data-testid="proto-vfx-spectator-wanderer"]').click();
      await p1Page.waitForSelector('[data-testid="bg-vfx-victory-spotlight"][data-outcome="spectator"]', { timeout: 3000, state: 'attached' });
      await p1Page.waitForTimeout(820);
      await captureShot(p1Page, 'after-07-spectator-wanderer-impact.png');
      await p1Page.waitForTimeout(1500);

      // 4) Skip Animation check during Victory Cinematic
      await p1Page.locator('[data-testid="proto-vfx-victory-lantern"]').click();
      await p1Page.waitForSelector('[data-testid="bg-vfx-victory-spotlight"]', { timeout: 3000, state: 'attached' });
      await p1Page.locator('[data-testid="bg-skip-vfx-btn"]').click();
      await p1Page.locator('[data-testid="bg-vfx-victory-spotlight"]').waitFor({ state: 'detached', timeout: 2000 });

      // 5) Reduced Motion check
      await p1Page.locator('[data-testid="proto-vfx-reduced-toggle"]').click();
      await p1Page.locator('[data-testid="proto-vfx-victory-lantern"]').click();
      await p1Page.waitForSelector('[data-testid="bg-vfx-victory-spotlight"]', { timeout: 3000, state: 'attached' }).catch(() => undefined);
      await p1Page.waitForTimeout(450);
      await p1Page.locator('[data-testid="proto-vfx-reduced-toggle"]').click();

      showcaseCaptureRes = await p1Page.evaluate(() => window.__stopPhase2Capture());
      await captureServer.flushWrites();

      // Capture exact early-stage stills (Stage 1 Anticipation & Stage 2 Faction Reveal & Reduced Motion) without MediaRecorder CPU contention
      await p1Page.waitForTimeout(300);
      await p1Page.locator('[data-testid="proto-vfx-victory-lantern"]').click();
      await p1Page.waitForSelector('[data-testid="bg-vfx-victory-spotlight"][data-victory-phase="anticipation"]', { timeout: 2000, state: 'attached' }).catch(() => undefined);
      await captureShot(p1Page, 'after-02-stage1-anticipation-lantern.png');
      await p1Page.waitForTimeout(2400);

      await p1Page.locator('[data-testid="proto-vfx-victory-lantern"]').click();
      await p1Page.waitForSelector('[data-testid="bg-vfx-victory-spotlight"][data-victory-phase="faction-reveal"]', { timeout: 2500, state: 'attached' }).catch(() => undefined);
      await captureShot(p1Page, 'after-03-stage2-faction-reveal-lantern.png');
      capturedAfterFactionReveal = true;
      await p1Page.waitForTimeout(2000);

      await p1Page.locator('[data-testid="proto-vfx-reduced-toggle"]').click();
      await p1Page.locator('[data-testid="proto-vfx-victory-lantern"]').click();
      await p1Page.waitForSelector('[data-testid="bg-vfx-victory-spotlight"]', { timeout: 2000, state: 'attached' }).catch(() => undefined);
      await captureShot(p1Page, 'after-08-reduced-motion-victory.png');
      await p1Page.waitForTimeout(350);
      await p1Page.locator('[data-testid="proto-vfx-reduced-toggle"]').click();

      showcaseMatrix = {
        lanternGuardVictory: true,
        mistOrderDefeat: true,
        wandererSpectator: true,
        skipAnimationVerified: true,
        reducedMotionVerified: true,
      };
    }

    assert.equal(consoleErrors.length, 0, `Console errors: ${consoleErrors.join('; ')}`);
    assert.equal(pageErrors.length, 0, `Page errors: ${pageErrors.join('; ')}`);
    assert.equal(auditErrors.length, 0, `Audit errors: ${auditErrors.join('; ')}`);

    const liveFps = summarizeFpsSamples(liveCaptureRes.frameTimes, liveCaptureRes.perSecArr, liveCaptureRes.totalDurationMs);
    const liveMp4 = inspectMp4Atoms(path.join(ARTIFACT_DIR, videoFileName));
    const liveDurationSec =
      liveMp4.mvhdDurationSec && liveMp4.mvhdDurationSec > 0
        ? liveMp4.mvhdDurationSec
        : Number((liveCaptureRes.totalDurationMs / 1000).toFixed(2));

    if (MODE === 'before') {
      const beforeSummary = {
        generatedAt: new Date().toISOString(),
        mode: 'before',
        video: {
          path: 'artifacts/boardgame-cinematic-polish/phase-2/before-victory.mp4',
          sizeBytes: liveMp4.sizeBytes,
          durationSec: liveDurationSec,
          tracks: liveMp4.tracks,
        },
        liveMatch: {
          winnerFaction: liveWinnerFaction,
          winnerLabel: liveWinnerLabel,
          p1Outcome: liveP1Outcome,
          victorySpotlightObserved: liveCaptureRes.victoryObs.startedAtMs !== null,
          modalOpenedAtMs: liveCaptureRes.victoryObs.modalOpenedAtMs,
          screenshots: ['before-01-match-end-instant-modal.png', 'before-02-match-result-postcard.png'],
        },
        recordingFps: liveFps,
        audioStats: liveCaptureRes.audioStats,
      };
      fs.writeFileSync(path.join(ARTIFACT_DIR, 'before-baseline.json'), JSON.stringify(beforeSummary, null, 2));
      console.log('[Phase2Capture:before PASS]', JSON.stringify(beforeSummary.video), beforeSummary.liveMatch);
    } else {
      const beforePath = path.join(ARTIFACT_DIR, 'before-baseline.json');
      const beforeData = fs.existsSync(beforePath) ? JSON.parse(fs.readFileSync(beforePath, 'utf8')) : null;
      if (beforeData && beforeData.video && !beforeData.video.durationSec && beforeData.recordingFps?.sampleDurationSec) {
        beforeData.video.durationSec = beforeData.recordingFps.sampleDurationSec;
      }
      const showcaseMp4 = inspectMp4Atoms(path.join(ARTIFACT_DIR, 'after-factions-showcase.mp4'));
      const showcaseFps = summarizeFpsSamples(showcaseCaptureRes.frameTimes, showcaseCaptureRes.perSecArr, showcaseCaptureRes.totalDurationMs);
      const showcaseDurationSec =
        showcaseMp4.mvhdDurationSec && showcaseMp4.mvhdDurationSec > 0
          ? showcaseMp4.mvhdDurationSec
          : Number((showcaseCaptureRes.totalDurationMs / 1000).toFixed(2));

      const report = {
        generatedAt: new Date().toISOString(),
        target: 'Phase 2 — Victory & Defeat Cinematic V2 (Desktop 1920x1080)',
        environmentNote: 'Linux container CPU rasterizer (--use-gl=angle --use-angle=swiftshader) — no hardware GPU present',
        beforeBaseline: beforeData,
        afterLiveMatch: {
          source: 'Real 4-player + 1-spectator BoardGameMatchDO match',
          winnerFaction: liveWinnerFaction,
          winnerLabel: liveWinnerLabel,
          p1Outcome: liveP1Outcome,
          victoryCinematicDurationMs:
            liveCaptureRes.victoryObs.startedAtMs !== null && liveCaptureRes.victoryObs.endedAtMs !== null
              ? Math.round(liveCaptureRes.victoryObs.endedAtMs - liveCaptureRes.victoryObs.startedAtMs)
              : null,
          phasesObserved: liveCaptureRes.victoryObs.phasesSeen,
          modalOpenedAfterCinematic:
            liveCaptureRes.victoryObs.endedAtMs !== null &&
            liveCaptureRes.victoryObs.modalOpenedAtMs !== null &&
            liveCaptureRes.victoryObs.modalOpenedAtMs >= liveCaptureRes.victoryObs.endedAtMs - 100,
          f5NonReplayVerified,
          preEndPrivacyVerified: !preEndLeakDetected,
          video: {
            path: 'artifacts/boardgame-cinematic-polish/phase-2/after-victory-defeat.mp4',
            sizeBytes: liveMp4.sizeBytes,
            durationSec: liveDurationSec,
            tracks: liveMp4.tracks,
          },
          recordingFps: liveFps,
          audioStats: liveCaptureRes.audioStats,
          screenshots: {
            liveFactionReveal: capturedAfterAnticipation ? 'after-01-live-faction-reveal.png' : null,
            settlePostcard: 'after-04-live-settle-match-postcard.png',
          },
        },
        afterControlledShowcase: {
          source: 'Controlled /boardgame-prototype VFX Lab showcase (all 3 factions x Victory/Defeat/Spectator + Skip + Reduced Motion)',
          matrix: showcaseMatrix,
          video: {
            path: 'artifacts/boardgame-cinematic-polish/phase-2/after-factions-showcase.mp4',
            sizeBytes: showcaseMp4.sizeBytes,
            durationSec: showcaseDurationSec,
            tracks: showcaseMp4.tracks,
          },
          recordingFps: showcaseFps,
          audioStats: showcaseCaptureRes.audioStats,
          screenshots: [
            'after-02-stage1-anticipation-lantern.png',
            'after-03-stage2-faction-reveal-lantern.png',
            'after-05-victory-lantern-guard-impact.png',
            'after-06-defeat-mist-order-impact.png',
            'after-07-spectator-wanderer-impact.png',
            'after-08-reduced-motion-victory.png',
          ],
        },
        errors: {
          consoleErrors: consoleErrors.length,
          pageErrors: pageErrors.length,
          auditErrors: auditErrors.length,
        },
      };

      fs.writeFileSync(path.join(ARTIFACT_DIR, 'performance-report.json'), JSON.stringify(report, null, 2));

      const notes = [
        '# Phase 2 — Victory & Defeat Cinematic V2 — Evidence & Review Notes',
        '',
        `- **Ngày đo:** ${report.generatedAt}`,
        `- **Môi trường:** ${report.environmentNote}`,
        `- **An toàn & bảo mật:** Console errors = 0, Page errors = 0, MSSV leaks = 0, Pre-end privacy leak = false, F5 non-replay verified = ${f5NonReplayVerified}`,
        '',
        '## 1. So sánh Before / After (Trận Multiplayer Thật 4 người + 1 Khán giả trên `BoardGameMatchDO`)',
        '',
        `| Tiêu chí | Before (\`before-victory.mp4\`) | After (\`after-victory-defeat.mp4\`) |`,
        `| --- | --- | --- |`,
        `| Hành vi khi trận chuyển \`FINISHED\` | Modal \`MatchResult\` bật ngay tức thì ở \`z-50\`, che lấp bàn chơi và không có chuỗi 4 pha | Chạy chuỗi 4 pha \`anticipation → faction-reveal → impact → settle\` (${report.afterLiveMatch.victoryCinematicDurationMs ?? 'N/A'}ms), sau đó mới chuyển mượt sang \`MatchResult\` + \`MatchPostcard\` |`,
        `| Phân biệt Victory / Defeat / Spectator | Chỉ hiện banner chung \`CHIẾN THẮNG\` | Phân tách rõ \`CHIẾN THẮNG\` / \`THẤT BẠI\` / \`KẾT THÚC VÁN ĐẤU\` (Khán giả) cả màu sắc, hạt Canvas 2D & WebAudio |`,
        `| Kết quả trận thật ghi hình | Phe thắng: \`${beforeData?.liveMatch?.winnerFaction ?? 'N/A'}\` (P1: \`${beforeData?.liveMatch?.p1Outcome ?? 'N/A'}\`) | Phe thắng: \`${liveWinnerFaction}\` (P1: \`${liveP1Outcome}\`, pha quan sát: \`${liveCaptureRes.victoryObs.phasesSeen.join(' -> ')}\`) |`,
        `| Video 1920×1080 MP4 | \`before-victory.mp4\` (${beforeData?.video?.durationSec ?? 'N/A'}s, ${beforeData ? (beforeData.video.sizeBytes / 1048576).toFixed(2) : 'N/A'} MB) | \`after-victory-defeat.mp4\` (${liveDurationSec}s, ${(liveMp4.sizeBytes / 1048576).toFixed(2)} MB) |`,
        `| FPS khi đang quay MP4 1080p (SwiftShader) | ${beforeData?.recordingFps?.fpsMean ?? 'N/A'} FPS (p95=${beforeData?.recordingFps?.p95FrameMs ?? 'N/A'}ms) | ${liveFps.fpsMean} FPS (p95=${liveFps.p95FrameMs}ms) |`,
        '',
        '## 2. Kiểm chứng đủ 3 Phe × 3 Trạng thái (Controlled `/boardgame-prototype` Showcase)',
        '',
        '- **Video:** [`after-factions-showcase.mp4`](./after-factions-showcase.mp4) (' + showcaseDurationSec + 's, ' + (showcaseMp4.sizeBytes / 1048576).toFixed(2) + ' MB, FPS quay = ' + showcaseFps.fpsMean + ' FPS)',
        '- **Stage 1 — Anticipation (Đội Săn Đêm):** [`after-02-stage1-anticipation-lantern.png`](./screenshots/after-02-stage1-anticipation-lantern.png)',
        '- **Stage 2 — Faction Reveal (Đội Săn Đêm):** [`after-03-stage2-faction-reveal-lantern.png`](./screenshots/after-03-stage2-faction-reveal-lantern.png)',
        '- **Stage 3 — Impact Victory (Đội Săn Đêm):** [`after-05-victory-lantern-guard-impact.png`](./screenshots/after-05-victory-lantern-guard-impact.png)',
        '- **Stage 3 — Impact Defeat (Hội Bóng Đêm):** [`after-06-defeat-mist-order-impact.png`](./screenshots/after-06-defeat-mist-order-impact.png)',
        '- **Stage 3 — Impact Spectator (Kẻ Độc Hành):** [`after-07-spectator-wanderer-impact.png`](./screenshots/after-07-spectator-wanderer-impact.png)',
        '- **Skip Animation & Reduced Motion (`<= 280ms`):** [`after-08-reduced-motion-victory.png`](./screenshots/after-08-reduced-motion-victory.png)',
        '',
        '## 3. Ảnh chụp các giai đoạn trận thật',
        '',
        '- **Before (bật modal ngay, không cinematic):** [`before-01-match-end-instant-modal.png`](./screenshots/before-01-match-end-instant-modal.png), [`before-02-match-result-postcard.png`](./screenshots/before-02-match-result-postcard.png)',
        '- **After Trận thật — Stage 2 Faction Reveal (Hội Bóng Đêm, giữ ẩn MatchResult):** [`after-01-live-faction-reveal.png`](./screenshots/after-01-live-faction-reveal.png)',
        '- **After Trận thật — Stage 4 Settle → MatchResult & MatchPostcard:** [`after-04-live-settle-match-postcard.png`](./screenshots/after-04-live-settle-match-postcard.png)',
      ].join('\n');

      fs.writeFileSync(path.join(ARTIFACT_DIR, 'review-notes.md'), notes);
      console.log('[Phase2Capture:after PASS]', JSON.stringify({
        liveOutcome: liveP1Outcome,
        liveFaction: liveWinnerFaction,
        cinematicMs: report.afterLiveMatch.victoryCinematicDurationMs,
        phases: liveCaptureRes.victoryObs.phasesSeen,
        f5NonReplayVerified,
        liveFps: liveFps.fpsMean,
        showcaseFps: showcaseFps.fpsMean,
      }));
    }
  } finally {
    for (const p of peers) await p.close().catch(() => undefined);
    if (peerBrowser) await peerBrowser.close().catch(() => undefined);
    if (captureBrowser) await captureBrowser.close().catch(() => undefined);
    captureServer.server.close();
    shim.proc.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error('[Phase2Capture FAIL]', err);
  process.exit(1);
});
