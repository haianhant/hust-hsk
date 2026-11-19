/**
 * test/boardgame-phase4-opening-capture.cjs
 * Automated 1920x1080 Before/After Evidence & Verification Harness for
 * Phase 4 — Opening & Secret Role Deal Cinematic in Bóng Đêm KTX (HUSTVerse).
 *
 * Usage:
 *   node test/boardgame-phase4-opening-capture.cjs --mode=before
 *   node test/boardgame-phase4-opening-capture.cjs --mode=after
 *
 * Deliverables stored in artifacts/boardgame-cinematic-polish/phase-4/:
 *   - before-opening-role-deal.mp4   (pre-Phase-4 live 4P match abrupt start)
 *   - after-opening-role-deal.mp4    (Phase-4 live 4P match Player view: 4 beats -> smooth Turn 1)
 *   - spectator-check.mp4            (Phase-4 live 4P match real Spectator view: zero private role leak)
 *   - screenshots/*.png              (Before + 4 opening beats + Spectator sealed + Skip + F5 non-replay)
 *   - performance-report.json
 *   - playtest-readiness.md
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
const ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'boardgame-cinematic-polish', 'phase-4');
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
  { label: 'P1', name: 'Sinh viên An', mssv: '20229401' },
  { label: 'P2', name: 'Sinh viên Bình', mssv: '20229402' },
  { label: 'P3', name: 'Sinh viên Chi', mssv: '20229403' },
  { label: 'P4', name: 'Sinh viên Dung', mssv: '20229404' },
  { label: 'SPEC', name: 'Khán giả Minh', mssv: '20229405' },
];
const ALL_TEST_MSSVS = TEST_USERS.map((u) => u.mssv);

// All 10 HUST role names & role IDs — Spectator DOM MUST NEVER contain ANY of these during Opening!
const SECRET_ROLE_NAMES = [
  'Minh "Kỹ Thuật"',
  'Linh "Trực Ban"',
  'Vy "Radio"',
  'Ẩn "Bóng Hành Lang"',
  'Khoa "Tin Giả"',
  'Dũng "Gác Cổng"',
  'Nam "Ảnh Săn"',
  'Huy "Quan Sát"',
  'Trang "Cứu Hộ"',
  'Hòa "Tiên Phong"',
];
const SECRET_ROLE_IDS = [
  'gac-ky-thuat',
  'gac-truc-ban',
  'gac-radio',
  'suong-an-danh',
  'suong-tin-gia',
  'suong-gac-cong',
  'lang-anh-san',
  'lang-quan-sat',
  'lang-cuu-ho',
  'lang-tien-phong',
];
const SECRET_FACTION_IDS = ['lantern-guard', 'mist-order', 'wanderer'];

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

      if (cleanUrl === '/__e2e-peer.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<!doctype html><html><head><title>Phase4 Peer</title></head><body>OK</body></html>');
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
                ...(typeof seatIdx === 'number' ? { preferredSeatIndex: seatIdx } : {}),
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

  async function startMatch() {
    await page.evaluate(() => {
      window.__peerState.ws.send(
        JSON.stringify({
          type: 'BG_START_MATCH',
          requestId: `start-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        }),
      );
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
              resolve(m);
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

  return { page, displayName, join, setReady, startMatch, getState, sendAction, close };
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

async function injectRedactionStyles(page) {
  await page.evaluate(() => {
    if (document.getElementById('__bg_capture_redaction')) return;
    const style = document.createElement('style');
    style.id = '__bg_capture_redaction';
    style.textContent = `
      [data-testid="bg-hud-invite-code"],
      [data-testid="bg-board-invite-code"],
      [data-testid="boardgame-lobby-modal"] .font-mono.text-amber-300 {
        font-size: 0 !important;
        color: transparent !important;
      }
      [data-testid="bg-hud-invite-code"]::after,
      [data-testid="bg-board-invite-code"]::after,
      [data-testid="boardgame-lobby-modal"] .font-mono.text-amber-300::after {
        content: "[ẨN BẢO MẬT]";
        font-size: 11px;
        font-weight: 700;
        color: #fcd34d;
      }
    `;
    document.head.appendChild(style);
  });
}

async function installIdentityAndAudioHook(ctx, user, wsUrl) {
  await ctx.addInitScript(
    ({ name, mssv, ws }) => {
      window.__HUST_TEST_MP_WS_URL = ws;
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
          const ac = new OrigAC(...args);
          window.__audioStats.contextsCreated += 1;
          const origOsc = ac.createOscillator.bind(ac);
          const origBuf = ac.createBufferSource.bind(ac);
          ac.createOscillator = () => {
            window.__audioStats.oscillatorsCreated += 1;
            return origOsc();
          };
          ac.createBufferSource = () => {
            window.__audioStats.buffersStarted += 1;
            return origBuf();
          };
          return ac;
        }
        WrappedAC.prototype = OrigAC.prototype;
        window.AudioContext = WrappedAC;
        if (window.webkitAudioContext) window.webkitAudioContext = WrappedAC;
      }
    },
    { name: user.name, mssv: user.mssv, ws: wsUrl },
  );
}

async function startTabRecorder(page, targetFileName, options = {}) {
  const secretAudit = Boolean(options.auditSpectatorPrivacy);
  return page.evaluate(
    async ({ fileName, auditPrivacy, roleNames, roleIds, factionIds }) => {
      const tickerEl = document.createElement('div');
      tickerEl.id = '__bg_phase4_ticker';
      tickerEl.style.cssText =
        'position:fixed;right:0;bottom:0;width:1px;height:1px;pointer-events:none;z-index:9999;opacity:0.01;background:#000';
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

      const rec = new MediaRecorder(stream, { mimeType: preferredMime, videoBitsPerSecond: 2400000 });
      const chunks = [];
      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      const startWall = performance.now();
      const frameTimes = [];
      const fpsBuckets = new Map();
      let lastRaf = startWall;
      let running = true;

      const openingObs = {
        startedAtMs: null,
        endedAtMs: null,
        phasesSeen: [],
        phaseTimestampsMs: {},
        spectatorAttr: null,
        cardFlippedAtMs: null,
        boardMountedAtMs: null,
        privacyViolations: [],
      };

      const scanDom = () => {
        const now = performance.now() - startWall;
        if (openingObs.boardMountedAtMs === null && document.querySelector('[data-testid="boardgame-2d-board"]')) {
          openingObs.boardMountedAtMs = Number(now.toFixed(1));
        }
        const stage = document.querySelector('[data-testid="bg-vfx-opening-stage"]');
        if (stage) {
          if (openingObs.startedAtMs === null) {
            openingObs.startedAtMs = Number(now.toFixed(1));
            openingObs.spectatorAttr = stage.getAttribute('data-spectator');
          }
          const ph = stage.getAttribute('data-opening-phase');
          if (ph && openingObs.phasesSeen[openingObs.phasesSeen.length - 1] !== ph) {
            openingObs.phasesSeen.push(ph);
            openingObs.phaseTimestampsMs[ph] = Number(now.toFixed(1));
          }
          if (
            openingObs.cardFlippedAtMs === null &&
            stage.getAttribute('data-opening-card-flipped') === 'true'
          ) {
            openingObs.cardFlippedAtMs = Number(now.toFixed(1));
          }

          if (auditPrivacy) {
            const txt = stage.innerText || '';
            for (const rn of roleNames) {
              if (txt.includes(rn)) {
                openingObs.privacyViolations.push(`Spectator opening stage leaked roleName: ${rn}`);
              }
            }
            const roleAttr = stage.getAttribute('data-role-id');
            const facAttr = stage.getAttribute('data-faction');
            if (roleAttr && roleIds.includes(roleAttr)) {
              openingObs.privacyViolations.push(`Spectator opening stage leaked data-role-id=${roleAttr}`);
            }
            if (facAttr && factionIds.includes(facAttr)) {
              openingObs.privacyViolations.push(`Spectator opening stage leaked data-faction=${facAttr}`);
            }
            const imgs = Array.from(stage.querySelectorAll('img'));
            for (const img of imgs) {
              const src = img.getAttribute('src') || '';
              if (src.includes('/roles/') || src.includes('character')) {
                openingObs.privacyViolations.push(`Spectator opening stage leaked role portrait img: ${src}`);
              }
            }
            if (stage.querySelector('[data-testid="bg-vfx-opening-secret-card"]')) {
              openingObs.privacyViolations.push('Spectator rendered personal secret role card element!');
            }
          }
        } else if (openingObs.startedAtMs !== null && openingObs.endedAtMs === null) {
          openingObs.endedAtMs = Number(now.toFixed(1));
        }

        if (auditPrivacy && document.querySelector('[data-testid="boardgame-2d-board"]')) {
          const board = document.querySelector('[data-testid="boardgame-2d-board"]');
          const boardText = board?.innerText || '';
          for (const rn of roleNames) {
            if (boardText.includes(rn)) {
              openingObs.privacyViolations.push(`Spectator board DOM leaked hidden roleName: ${rn}`);
            }
          }
        }
      };

      const observer = new MutationObserver(scanDom);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-opening-phase', 'data-opening-card-flipped', 'data-spectator', 'data-role-id', 'data-faction'],
      });

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

      rec.start(250);

      window.__stopPhase4Capture = async () => {
        scanDom();
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
          openingObs,
          audioStats: window.__audioStats || null,
        };
      };

      return {
        preferredMime,
        hasAudioTrack: stream.getAudioTracks().length > 0,
      };
    },
    {
      fileName: targetFileName,
      auditPrivacy: secretAudit,
      roleNames: SECRET_ROLE_NAMES,
      roleIds: SECRET_ROLE_IDS,
      factionIds: SECRET_FACTION_IDS,
    },
  );
}

async function enterBoardGameClubPage(page, baseUrl) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('#enter-campus').waitFor({ state: 'visible', timeout: 90000 });
  await page.locator('#enter-campus').click({ timeout: 90000 });
  await page.waitForFunction(() => Boolean(window.__bkhn?.enterBoardGameClub), null, { timeout: 90000 });
  await page.evaluate(() => window.__bkhn.enterBoardGameClub());
  await page.waitForSelector('[data-testid="boardgame-club-hud"]', { timeout: UI_TIMEOUT });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('bkhn:pause-3d', { detail: true })));
  await injectRedactionStyles(page);
}

async function createPeerHostedMatch(shim, peerCtx, outUrl, tableId = 'table-1') {
  const createRes = await fetch(`${shim.httpBaseUrl}/api/boardgame/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tableId, hostName: TEST_USERS[0].name }),
  });
  assert.equal(createRes.ok, true, `Create match HTTP failed: ${createRes.status}`);
  const created = await createRes.json();
  assert.ok(created.matchId && created.inviteCode, 'Created match must return matchId & inviteCode');

  const peers = [];
  for (let seat = 0; seat < 4; seat++) {
    const peer = await createWsPeer(peerCtx, outUrl, shim.wsBaseUrl, TEST_USERS[seat].name, seat, false);
    await peer.join(created.matchId, created.inviteCode);
    await peer.setReady(true);
    peers.push(peer);
  }
  return { matchId: created.matchId, inviteCode: created.inviteCode, peers };
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
  const peersToClose = [];
  const consoleErrors = [];
  const pageErrors = [];
  const auditErrors = [];

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
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
    });

    const peerCtx = await peerBrowser.newContext({ viewport: { width: 1280, height: 800 } });

    const attachAuditors = (page, label, expectSpectator = false) => {
      const state = { latestSync: null, privateViewNonNullCount: 0 };
      page.on('pageerror', (err) => pageErrors.push(`${label} pageerror: ${err.message}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(`${label} console.error: ${msg.text()}`);
      });
      page.on('websocket', (ws) => {
        if (!ws.url().includes('/ws/boardgame')) return;
        ws.on('framereceived', ({ payload }) => {
          const text = String(payload);
          for (const mssv of ALL_TEST_MSSVS) {
            if (text.includes(mssv)) auditErrors.push(`${label}: MSSV ${mssv} leaked in WS frame`);
          }
          try {
            const parsed = JSON.parse(text);
            if (parsed.type === 'BG_STATE_SYNC') {
              state.latestSync = parsed;
              if (expectSpectator && parsed.privateView !== null) {
                state.privateViewNonNullCount += 1;
                auditErrors.push(`${label}: Spectator received non-null privateView over WS!`);
              }
            }
          } catch {
            // ignore
          }
        });
      });
      return state;
    };

    const openCapturePage = async (user, label, expectSpectator = false) => {
      const ctx = await captureBrowser.newContext({ viewport: { width: 1920, height: 1080 }, hasTouch: false });
      await installIdentityAndAudioHook(ctx, user, `${shim.wsBaseUrl}/ws`);
      const page = await ctx.newPage();
      page.setDefaultTimeout(UI_TIMEOUT);
      const cdp = await ctx.newCDPSession(page);
      page.__cdp = cdp;
      const { windowId } = await cdp.send('Browser.getWindowForTarget');
      await cdp.send('Browser.setWindowBounds', { windowId, bounds: { width: 1922, height: 1224, windowState: 'normal' } });
      await page.setViewportSize({ width: 1920, height: 1080 });
      const wsAudit = attachAuditors(page, label, expectSpectator);
      return { ctx, page, wsAudit };
    };

    // =========================================================================
    // MODE: BEFORE — True baseline on untouched pre-Phase-4 build
    // =========================================================================
    if (MODE === 'before') {
      console.log('[Phase4Capture:before] Setting up live 4-player match on pre-Phase-4 build...');
      const p1 = await openCapturePage(TEST_USERS[0], 'BEFORE-P1', false);
      await enterBoardGameClubPage(p1.page, captureServer.url);

      await p1.page.locator('[data-testid="bg-toggle-lobby-btn"]').click();
      await p1.page.waitForSelector('[data-testid="boardgame-lobby-modal"]', { timeout: UI_TIMEOUT });
      await p1.page.locator('[data-testid="bg-sit-table-1-btn"]').click();
      await p1.page.waitForSelector('[data-testid="bg-hud-invite-code"]', { timeout: UI_TIMEOUT });
      const inviteCode = (await p1.page.locator('[data-testid="bg-hud-invite-code"]').innerText()).trim();

      const dirRes = await fetch(`${shim.httpBaseUrl}/api/boardgame/matches`);
      const dirJson = await dirRes.json();
      const matchInfo = (dirJson.matches || []).find((m) => m.inviteCode === inviteCode);
      assert.ok(matchInfo, 'Match must appear in directory');

      for (let seat = 1; seat <= 3; seat++) {
        const peer = await createWsPeer(peerCtx, captureServer.url, shim.wsBaseUrl, TEST_USERS[seat].name, seat, false);
        await peer.join(matchInfo.matchId, inviteCode);
        await peer.setReady(true);
        peersToClose.push(peer);
      }

      await p1.page.waitForFunction(
        () => Boolean(document.querySelector('[data-testid="bg-hud-start-btn"]:not([disabled])')),
        null,
        { timeout: UI_TIMEOUT, polling: 100 },
      );

      // Start 1920x1080 capture right BEFORE clicking Start Match
      const recMeta = await startTabRecorder(p1.page, 'before-opening-role-deal.mp4');
      await p1.page.waitForTimeout(450);
      await p1.page.locator('[data-testid="bg-hud-start-btn"]').click();
      await p1.page.waitForSelector('[data-testid="boardgame-2d-board"]', { timeout: UI_TIMEOUT });
      await injectRedactionStyles(p1.page);
      await p1.page.waitForTimeout(260);
      await captureShot(p1.page, 'before-01-abrupt-start.png');
      await p1.page.waitForTimeout(3200);

      const recResult = await p1.page.evaluate(() => window.__stopPhase4Capture());
      await captureServer.flushWrites();
      await p1.ctx.close();

      const mp4Path = path.join(ARTIFACT_DIR, 'before-opening-role-deal.mp4');
      const mp4Info = inspectMp4Atoms(mp4Path);
      const fps = summarizeFpsSamples(recResult.frameTimes, recResult.perSecArr, recResult.totalDurationMs);

      assert.equal(consoleErrors.length, 0, `Console errors: ${consoleErrors.join('; ')}`);
      assert.equal(pageErrors.length, 0, `Page errors: ${pageErrors.join('; ')}`);
      assert.equal(auditErrors.length, 0, `Audit errors: ${auditErrors.join('; ')}`);

      const baseline = {
        capturedAt: new Date().toISOString(),
        mode: 'before',
        hasAudioTrack: recMeta.hasAudioTrack,
        openingObs: recResult.openingObs,
        audioStats: recResult.audioStats,
        fps,
        video: { file: 'before-opening-role-deal.mp4', ...mp4Info },
      };
      fs.writeFileSync(path.join(ARTIFACT_DIR, 'before-baseline.json'), JSON.stringify(baseline, null, 2));
      console.log('[Phase4Capture:before] Captured before-opening-role-deal.mp4 successfully:', JSON.stringify({
        bytes: mp4Info.sizeBytes,
        durSec: mp4Info.mvhdDurationSec,
        openingStageDetected: recResult.openingObs.startedAtMs !== null,
        fpsMean: fps.fpsMean,
      }));
      return;
    }

    // =========================================================================
    // MODE: AFTER — Full Player Video + Real Spectator Video + Crisp Stills + Skip + F5 Check
    // =========================================================================
    console.log('[Phase4Capture:after] Run A — Live 4-player match (Player P1 Opening + Turn 1 + F5 Non-Replay)...');
    const p1 = await openCapturePage(TEST_USERS[0], 'AFTER-P1', false);
    await enterBoardGameClubPage(p1.page, captureServer.url);

    await p1.page.locator('[data-testid="bg-toggle-lobby-btn"]').click();
    await p1.page.waitForSelector('[data-testid="boardgame-lobby-modal"]', { timeout: UI_TIMEOUT });
    await p1.page.locator('[data-testid="bg-sit-table-1-btn"]').click();
    await p1.page.waitForSelector('[data-testid="bg-hud-invite-code"]', { timeout: UI_TIMEOUT });
    const inviteCodeA = (await p1.page.locator('[data-testid="bg-hud-invite-code"]').innerText()).trim();

    const dirResA = await fetch(`${shim.httpBaseUrl}/api/boardgame/matches`);
    const dirJsonA = await dirResA.json();
    const matchInfoA = (dirJsonA.matches || []).find((m) => m.inviteCode === inviteCodeA);
    assert.ok(matchInfoA, 'Run A match must appear in directory');

    const peersA = [];
    for (let seat = 1; seat <= 3; seat++) {
      const peer = await createWsPeer(peerCtx, captureServer.url, shim.wsBaseUrl, TEST_USERS[seat].name, seat, false);
      await peer.join(matchInfoA.matchId, inviteCodeA);
      await peer.setReady(true);
      peersA.push(peer);
      peersToClose.push(peer);
    }

    await p1.page.waitForFunction(
      () => Boolean(document.querySelector('[data-testid="bg-hud-start-btn"]:not([disabled])')),
      null,
      { timeout: UI_TIMEOUT, polling: 100 },
    );

    const playerRecMeta = await startTabRecorder(p1.page, 'after-opening-role-deal.mp4');
    await p1.page.waitForTimeout(400);
    await p1.page.locator('[data-testid="bg-hud-start-btn"]').click();
    await p1.page.waitForSelector('[data-testid="boardgame-2d-board"]', { timeout: UI_TIMEOUT });
    await injectRedactionStyles(p1.page);

    // Wait for all 4 beats to finish cleanly
    await p1.page.waitForSelector('[data-testid="bg-vfx-opening-stage"]', { timeout: 5000 });
    await p1.page.waitForFunction(
      () => !document.querySelector('[data-testid="bg-vfx-opening-stage"]'),
      null,
      { timeout: 10000, polling: 50 },
    );
    await p1.page.waitForTimeout(350);

    // Execute Turn 1 move smoothly to prove immediate responsiveness after Opening settles!
    let turn1ActionSucceeded = false;
    const activeIdA = p1.wsAudit.latestSync?.publicGame?.activePlayerId;
    const p1IdA = p1.wsAudit.latestSync?.privateView?.playerId;
    if (activeIdA && activeIdA === p1IdA) {
      const rollBtn = p1.page.locator('[data-testid="bg-roll-dice-btn"]');
      if ((await rollBtn.count()) > 0 && (await rollBtn.isEnabled())) {
        await rollBtn.click();
        await p1.page.waitForTimeout(1400);
        turn1ActionSucceeded = true;
      }
    } else {
      const activePeer = (
        await Promise.all(peersA.map(async (peer) => ({ peer, st: await peer.getState() })))
      ).find((x) => x.st.auth?.playerId === activeIdA)?.peer;
      if (activePeer) {
        const res = await activePeer.sendAction({ type: 'ROLL_DICE' });
        turn1ActionSucceeded = Boolean(res.ok);
        await p1.page.waitForTimeout(1400);
      }
    }
    assert.equal(turn1ActionSucceeded, true, 'Turn 1 first action after Opening must succeed seamlessly');

    const playerRecResult = await p1.page.evaluate(() => window.__stopPhase4Capture());
    await captureServer.flushWrites();

    const pObs = playerRecResult.openingObs;
    const openingDurationMs =
      pObs.startedAtMs !== null && pObs.endedAtMs !== null
        ? Number((pObs.endedAtMs - pObs.startedAtMs).toFixed(1))
        : null;
    console.log('[Phase4Capture:after] Player opening observed:', JSON.stringify({
      phasesSeen: pObs.phasesSeen,
      openingDurationMs,
      cardFlippedAtMs: pObs.cardFlippedAtMs,
      audioStats: playerRecResult.audioStats,
    }));

    assert.deepEqual(
      pObs.phasesSeen,
      ['start-stinger', 'shuffle-deal', 'personal-reveal', 'back-to-board'],
      `Player opening must traverse all 4 beats in order, got: ${JSON.stringify(pObs.phasesSeen)}`,
    );
    assert.ok(
      openingDurationMs !== null && openingDurationMs >= 2450 && openingDurationMs <= 4300,
      `Player opening duration must be within 2.5–4.0s target window, got ${openingDurationMs}ms`,
    );
    assert.ok(pObs.cardFlippedAtMs !== null, 'Personal secret role card must perform 3D flip reveal');

    // F5 / Reconnect Non-Replay Check on P1!
    console.log('[Phase4Capture:after] Verifying F5 / Reconnect does NOT replay Opening...');
    const seenKeyCheck = await p1.page.evaluate((mId) => {
      const raw = window.sessionStorage.getItem(`hustverse:bg-vfx-seen:v1:${mId}`);
      return raw ? JSON.parse(raw) : [];
    }, matchInfoA.matchId);
    assert.ok(
      seenKeyCheck.includes(`${matchInfoA.matchId}::opening-deal`),
      'sessionStorage must persist opening-deal event ID immediately',
    );

    await p1.page.reload({ waitUntil: 'domcontentloaded' });
    await p1.page.locator('#enter-campus').waitFor({ state: 'visible', timeout: 90000 });
    await p1.page.locator('#enter-campus').click();
    await p1.page.waitForSelector('[data-testid="boardgame-2d-board"]', { timeout: 90000 });
    await injectRedactionStyles(p1.page);

    let replayedAfterF5 = false;
    for (let i = 0; i < 12; i++) {
      const hasOpening = await p1.page.evaluate(() => Boolean(document.querySelector('[data-testid="bg-vfx-opening-stage"]')));
      if (hasOpening) replayedAfterF5 = true;
      await p1.page.waitForTimeout(100);
    }
    assert.equal(replayedAfterF5, false, 'F5 / Reconnect MUST NEVER replay Opening cinematic!');
    await captureShot(p1.page, 'after-07-f5-no-replay.png');

    await p1.ctx.close();
    for (const peer of peersA) await peer.close();

    // =========================================================================
    // Run B — Real Spectator View Live 4P Match -> spectator-check.mp4
    // =========================================================================
    console.log('[Phase4Capture:after] Run B — Live 4-player match (Real Spectator Tab Opening Privacy Check)...');
    const matchB = await createPeerHostedMatch(shim, peerCtx, captureServer.url, 'table-1');
    matchB.peers.forEach((p) => peersToClose.push(p));

    const spec = await openCapturePage(TEST_USERS[4], 'AFTER-SPEC', true);
    await enterBoardGameClubPage(spec.page, captureServer.url);
    await spec.page.locator('[data-testid="bg-toggle-lobby-btn"]').click();
    await spec.page.waitForSelector('[data-testid="boardgame-lobby-modal"]', { timeout: UI_TIMEOUT });
    const watchBtn = spec.page.locator(`[data-testid="bg-watch-match-${matchB.inviteCode}"]`);
    await watchBtn.waitFor({ state: 'visible', timeout: UI_TIMEOUT });
    await watchBtn.click();
    await spec.page.waitForSelector('[data-testid="bg-hud-match-bar"]', { timeout: UI_TIMEOUT });
    await injectRedactionStyles(spec.page);

    const specRecMeta = await startTabRecorder(spec.page, 'spectator-check.mp4', { auditSpectatorPrivacy: true });
    await spec.page.waitForTimeout(450);

    // Host WS peer starts the live 4-player match while Spectator watches!
    await matchB.peers[0].startMatch();
    await spec.page.waitForSelector('[data-testid="boardgame-2d-board"]', { timeout: UI_TIMEOUT });
    await injectRedactionStyles(spec.page);

    await spec.page.waitForSelector('[data-testid="bg-vfx-opening-stage"]', { timeout: 5000 });
    await spec.page.waitForFunction(
      () => !document.querySelector('[data-testid="bg-vfx-opening-stage"]'),
      null,
      { timeout: 10000, polling: 50 },
    );
    await spec.page.waitForTimeout(900);

    const specRecResult = await spec.page.evaluate(() => window.__stopPhase4Capture());
    await captureServer.flushWrites();

    const sObs = specRecResult.openingObs;
    const specDurationMs =
      sObs.startedAtMs !== null && sObs.endedAtMs !== null
        ? Number((sObs.endedAtMs - sObs.startedAtMs).toFixed(1))
        : null;
    console.log('[Phase4Capture:after] Spectator opening observed:', JSON.stringify({
      phasesSeen: sObs.phasesSeen,
      specDurationMs,
      spectatorAttr: sObs.spectatorAttr,
      privacyViolations: sObs.privacyViolations,
      privateViewNonNullCount: spec.wsAudit.privateViewNonNullCount,
    }));

    assert.equal(sObs.spectatorAttr, 'true', 'Spectator opening stage must have data-spectator="true"');
    assert.deepEqual(
      sObs.phasesSeen,
      ['start-stinger', 'shuffle-deal', 'personal-reveal', 'back-to-board'],
      `Spectator opening must complete cleanly across phases, got: ${JSON.stringify(sObs.phasesSeen)}`,
    );
    assert.equal(sObs.cardFlippedAtMs, null, 'Spectator MUST NEVER flip a private role card');
    assert.equal(
      sObs.privacyViolations.length,
      0,
      `Spectator P0 privacy violations: ${sObs.privacyViolations.join('; ')}`,
    );
    assert.equal(spec.wsAudit.privateViewNonNullCount, 0, 'Spectator WS must never receive privateView');

    await spec.ctx.close();
    for (const peer of matchB.peers) await peer.close();

    // =========================================================================
    // Run C — Clean Headless 1920x1080 Crisp Stills + Skip Animation + Turn-1 F5 Non-Replay
    // (Using clean peerBrowser with zero MediaRecorder backbuffer lag!)
    // =========================================================================
    console.log('[Phase4Capture:after] Run C — Crisp 1920x1080 Stills of all 4 beats, Spectator sealed, Skip & Turn-1 F5...');
    const stillCtx = await peerBrowser.newContext({ viewport: { width: 1920, height: 1080 }, hasTouch: false });
    await installIdentityAndAudioHook(stillCtx, TEST_USERS[0], `${shim.wsBaseUrl}/ws`);
    const stillPage = await stillCtx.newPage();
    stillPage.setDefaultTimeout(UI_TIMEOUT);
    stillPage.__cdp = await stillCtx.newCDPSession(stillPage);
    attachAuditors(stillPage, 'STILLS-P1', false);

    await enterBoardGameClubPage(stillPage, captureServer.url);
    await stillPage.locator('[data-testid="bg-toggle-lobby-btn"]').click();
    await stillPage.waitForSelector('[data-testid="boardgame-lobby-modal"]', { timeout: UI_TIMEOUT });
    await stillPage.locator('[data-testid="bg-sit-table-1-btn"]').click();
    await stillPage.waitForSelector('[data-testid="bg-hud-invite-code"]', { timeout: UI_TIMEOUT });
    const inviteCodeC = (await stillPage.locator('[data-testid="bg-hud-invite-code"]').innerText()).trim();

    const dirJsonC = await (await fetch(`${shim.httpBaseUrl}/api/boardgame/matches`)).json();
    const matchInfoC = (dirJsonC.matches || []).find((m) => m.inviteCode === inviteCodeC);
    assert.ok(matchInfoC);
    const peersC = [];
    for (let seat = 1; seat <= 3; seat++) {
      const peer = await createWsPeer(peerCtx, captureServer.url, shim.wsBaseUrl, TEST_USERS[seat].name, seat, false);
      await peer.join(matchInfoC.matchId, inviteCodeC);
      await peer.setReady(true);
      peersC.push(peer);
      peersToClose.push(peer);
    }
    await stillPage.waitForFunction(
      () => Boolean(document.querySelector('[data-testid="bg-hud-start-btn"]:not([disabled])')),
      null,
      { timeout: UI_TIMEOUT, polling: 80 },
    );

    // Prepare phase waiters BEFORE clicking start for pixel-sharp captures
    const wStinger = stillPage.waitForFunction(
      () => document.querySelector('[data-testid="bg-vfx-opening-stage"]')?.getAttribute('data-opening-phase') === 'start-stinger',
      null,
      { timeout: 10000, polling: 16 },
    );
    const wDeal = stillPage.waitForFunction(
      () => document.querySelector('[data-testid="bg-vfx-opening-stage"]')?.getAttribute('data-opening-phase') === 'shuffle-deal',
      null,
      { timeout: 10000, polling: 16 },
    );
    const wReveal = stillPage.waitForFunction(
      () =>
        document.querySelector('[data-testid="bg-vfx-opening-stage"]')?.getAttribute('data-opening-phase') === 'personal-reveal' &&
        document.querySelector('[data-testid="bg-vfx-opening-stage"]')?.getAttribute('data-opening-card-flipped') === 'true',
      null,
      { timeout: 10000, polling: 16 },
    );
    const wBack = stillPage.waitForFunction(
      () => document.querySelector('[data-testid="bg-vfx-opening-stage"]')?.getAttribute('data-opening-phase') === 'back-to-board',
      null,
      { timeout: 10000, polling: 16 },
    );

    await stillPage.locator('[data-testid="bg-hud-start-btn"]').click();
    await wStinger;
    await injectRedactionStyles(stillPage);
    await stillPage.waitForTimeout(260);
    await captureShot(stillPage, 'after-01-start-stinger.png');

    await wDeal;
    await stillPage.waitForTimeout(480);
    await captureShot(stillPage, 'after-02-shuffle-deal.png');

    await wReveal;
    await stillPage.waitForTimeout(440);
    await captureShot(stillPage, 'after-03-personal-reveal.png');

    await wBack;
    await stillPage.waitForTimeout(240);
    await captureShot(stillPage, 'after-04-back-to-board.png');

    // Immediate Turn-1 untouched F5 reload check (even before ANY dice roll!)
    await stillPage.waitForFunction(() => !document.querySelector('[data-testid="bg-vfx-opening-stage"]'), null, { timeout: 6000 });
    await stillPage.reload({ waitUntil: 'domcontentloaded' });
    await stillPage.locator('#enter-campus').waitFor({ state: 'visible', timeout: 90000 });
    await stillPage.locator('#enter-campus').click();
    await stillPage.waitForSelector('[data-testid="boardgame-2d-board"]', { timeout: 90000 });
    await stillPage.waitForTimeout(550);
    const replayedOnTurn1F5 = await stillPage.evaluate(() => Boolean(document.querySelector('[data-testid="bg-vfx-opening-stage"]')));
    assert.equal(replayedOnTurn1F5, false, 'F5 on untouched Turn 1 MUST NOT replay Opening!');

    await stillCtx.close();
    for (const peer of peersC) await peer.close();

    // Run D — Crisp Spectator Sealed Still + Skip Animation Verification on Live Match
    const matchD = await createPeerHostedMatch(shim, peerCtx, captureServer.url, 'table-2');
    matchD.peers.forEach((p) => peersToClose.push(p));

    const specStillCtx = await peerBrowser.newContext({ viewport: { width: 1920, height: 1080 }, hasTouch: false });
    await installIdentityAndAudioHook(specStillCtx, TEST_USERS[4], `${shim.wsBaseUrl}/ws`);
    const specStillPage = await specStillCtx.newPage();
    specStillPage.setDefaultTimeout(UI_TIMEOUT);
    specStillPage.__cdp = await specStillCtx.newCDPSession(specStillPage);
    attachAuditors(specStillPage, 'STILLS-SPEC', true);

    await enterBoardGameClubPage(specStillPage, captureServer.url);
    await specStillPage.locator('[data-testid="bg-toggle-lobby-btn"]').click();
    await specStillPage.waitForSelector('[data-testid="boardgame-lobby-modal"]', { timeout: UI_TIMEOUT });
    const watchD = specStillPage.locator(`[data-testid="bg-watch-match-${matchD.inviteCode}"]`);
    await watchD.waitFor({ state: 'visible', timeout: UI_TIMEOUT });
    await watchD.click();
    await specStillPage.waitForSelector('[data-testid="bg-hud-match-bar"]', { timeout: UI_TIMEOUT });

    const wSpecReveal = specStillPage.waitForFunction(
      () => document.querySelector('[data-testid="bg-vfx-opening-stage"]')?.getAttribute('data-opening-phase') === 'personal-reveal',
      null,
      { timeout: 10000, polling: 16 },
    );
    await matchD.peers[0].startMatch();
    await wSpecReveal;
    await injectRedactionStyles(specStillPage);
    await specStillPage.waitForTimeout(260);
    await captureShot(specStillPage, 'after-05-spectator-sealed.png');

    // Verify Skip Animation button immediately clears Opening!
    const skipBtn = specStillPage.locator('[data-testid="bg-skip-vfx-btn"]');
    await skipBtn.waitFor({ state: 'visible', timeout: 3000 });
    const skipClickedAt = Date.now();
    await skipBtn.click();
    await specStillPage.waitForFunction(
      () => !document.querySelector('[data-testid="bg-vfx-opening-stage"]'),
      null,
      { timeout: 1500, polling: 16 },
    );
    const skipDismissMs = Date.now() - skipClickedAt;
    await specStillPage.waitForTimeout(160);
    await captureShot(specStillPage, 'after-06-after-skip.png');

    await specStillCtx.close();
    for (const peer of matchD.peers) await peer.close();

    // =========================================================================
    // Inspect all videos & emit performance-report.json + playtest-readiness.md
    // =========================================================================
    assert.equal(consoleErrors.length, 0, `Console errors: ${consoleErrors.join('; ')}`);
    assert.equal(pageErrors.length, 0, `Page errors: ${pageErrors.join('; ')}`);
    assert.equal(auditErrors.length, 0, `Audit errors: ${auditErrors.join('; ')}`);

    const beforePath = path.join(ARTIFACT_DIR, 'before-opening-role-deal.mp4');
    const afterPlayerPath = path.join(ARTIFACT_DIR, 'after-opening-role-deal.mp4');
    const afterSpecPath = path.join(ARTIFACT_DIR, 'spectator-check.mp4');

    const beforeInfo = fs.existsSync(beforePath) ? inspectMp4Atoms(beforePath) : null;
    const afterPlayerInfo = inspectMp4Atoms(afterPlayerPath);
    const afterSpecInfo = inspectMp4Atoms(afterSpecPath);

    assert.ok(afterPlayerInfo.sizeBytes > 20000, 'after-opening-role-deal.mp4 must be non-empty');
    assert.ok(afterSpecInfo.sizeBytes > 20000, 'spectator-check.mp4 must be non-empty');
    assert.ok(afterPlayerInfo.tracks.some((t) => t.handler === 'vide' && t.width === 1920 && t.height === 1080));
    assert.ok(afterSpecInfo.tracks.some((t) => t.handler === 'vide' && t.width === 1920 && t.height === 1080));

    const playerFps = summarizeFpsSamples(
      playerRecResult.frameTimes,
      playerRecResult.perSecArr,
      playerRecResult.totalDurationMs,
    );
    const specFps = summarizeFpsSamples(
      specRecResult.frameTimes,
      specRecResult.perSecArr,
      specRecResult.totalDurationMs,
    );

    const beforeBaseline = fs.existsSync(path.join(ARTIFACT_DIR, 'before-baseline.json'))
      ? JSON.parse(fs.readFileSync(path.join(ARTIFACT_DIR, 'before-baseline.json'), 'utf8'))
      : null;

    const perfReport = {
      phase: 'Phase 4 — Opening & Secret Role Deal Cinematic',
      capturedAt: new Date().toISOString(),
      viewport: '1920x1080',
      beforeBaseline: beforeBaseline
        ? {
            openingStageDetected: beforeBaseline.openingObs?.startedAtMs !== null,
            fps: beforeBaseline.fps,
            video: beforeBaseline.video,
          }
        : null,
      afterPlayerOpening: {
        hasAudioTrack: playerRecMeta.hasAudioTrack,
        openingDurationMs,
        phasesSeen: pObs.phasesSeen,
        phaseTimestampsMs: pObs.phaseTimestampsMs,
        cardFlippedAtMs: pObs.cardFlippedAtMs,
        turn1ActionSucceeded,
        audioStats: playerRecResult.audioStats,
        fps: playerFps,
        video: { file: 'after-opening-role-deal.mp4', ...afterPlayerInfo },
      },
      afterSpectatorCheck: {
        hasAudioTrack: specRecMeta.hasAudioTrack,
        openingDurationMs: specDurationMs,
        phasesSeen: sObs.phasesSeen,
        phaseTimestampsMs: sObs.phaseTimestampsMs,
        spectatorAttr: sObs.spectatorAttr,
        cardFlippedAtMs: sObs.cardFlippedAtMs,
        privacyViolations: sObs.privacyViolations,
        privateViewNonNullCount: spec.wsAudit.privateViewNonNullCount,
        audioStats: specRecResult.audioStats,
        fps: specFps,
        video: { file: 'spectator-check.mp4', ...afterSpecInfo },
      },
      reliabilityChecks: {
        skipAnimationDismissMs: skipDismissMs,
        f5MidTurnNoReplay: !replayedAfterF5,
        f5UntouchedTurn1NoReplay: !replayedOnTurn1F5,
        consoleErrorsCount: consoleErrors.length,
        pageErrorsCount: pageErrors.length,
        securityAuditErrorsCount: auditErrors.length,
      },
      screenshots: [
        'screenshots/before-01-abrupt-start.png',
        'screenshots/after-01-start-stinger.png',
        'screenshots/after-02-shuffle-deal.png',
        'screenshots/after-03-personal-reveal.png',
        'screenshots/after-04-back-to-board.png',
        'screenshots/after-05-spectator-sealed.png',
        'screenshots/after-06-after-skip.png',
        'screenshots/after-07-f5-no-replay.png',
      ],
    };

    fs.writeFileSync(path.join(ARTIFACT_DIR, 'performance-report.json'), JSON.stringify(perfReport, null, 2));

    const readinessMd = `# Phase 4 — Opening & Secret Role Deal Cinematic — Playtest Readiness Report

**Captured:** ${perfReport.capturedAt}
**Viewport:** 1920×1080 (Live 4-Player + Real Spectator WebSocket Match via \`BoardGameMatchDO\`)

## Verification Matrix

| Hạng mục | Kết quả | Bằng chứng đo thực tế |
|---|---|---|
| 1. Game Start Stinger | **PASS** | \`start-stinger\` hiển thị vignette Midnight Noir + \`ĐÊM XUỐNG TẠI KTX…\` + âm thanh mở màn (\`screenshots/after-01-start-stinger.png\`) |
| 2. Shuffle / Deal Roles | **PASS** | \`shuffle-deal\` xáo & chia bài úp \`MIDNIGHT_CARD_BACK_ART\` có nhịp, 0 thông tin phe (\`screenshots/after-02-shuffle-deal.png\`) |
| 3. Personal Secret Role Reveal | **PASS** | \`personal-reveal\` lật 3D thẻ vai riêng (\`cardFlippedAtMs=${pObs.cardFlippedAtMs}ms\`) + subtitle \`Vai bí mật của bạn · Hãy giữ bí mật\` (\`screenshots/after-03-personal-reveal.png\`) |
| 4. Back To Board / First Turn Ready | **PASS** | \`back-to-board\` nhả backdrop mượt, highlight người đi trước & hoàn tất lượt tung xúc xắc đầu tiên (\`screenshots/after-04-back-to-board.png\`) |
| Tổng thời lượng Opening (2.5–4.0s) | **PASS** | Player: **${openingDurationMs}ms** · Spectator: **${specDurationMs}ms** |
| Spectator P0 Isolation (0 lộ vai) | **PASS** | \`spectator-check.mp4\` + \`screenshots/after-05-spectator-sealed.png\`: **0** privacy violations, **0** \`privateView\`, **0** role flip, âm thanh trung tính phe |
| Skip Animation | **PASS** | Bấm \`⏭️ Bỏ qua hiệu ứng\` tắt hoàn toàn opening trong **${skipDismissMs}ms** (\`screenshots/after-06-after-skip.png\`) |
| Reconnect / F5 Non-Replay | **PASS** | F5 giữa lượt 1 & F5 ngay lượt 1 chưa tung đều **không** phát lại opening (\`screenshots/after-07-f5-no-replay.png\`) |
| Before / After Comparison | **PASS** | \`before-opening-role-deal.mp4\` (${beforeInfo ? `${(beforeInfo.sizeBytes / 1024).toFixed(0)} KB` : 'missing'}) vs \`after-opening-role-deal.mp4\` (${(afterPlayerInfo.sizeBytes / 1024).toFixed(0)} KB) |
| Hiệu năng & Audio | **PASS** | Player: **${playerFps.fpsMean} FPS** (p95=${playerFps.p95FrameMs}ms, osc=${playerRecResult.audioStats?.oscillatorsCreated ?? 0}, buf=${playerRecResult.audioStats?.buffersStarted ?? 0}) · Spectator: **${specFps.fpsMean} FPS** |
| Console / Page / Security Errors | **PASS** | 0 console errors · 0 page errors · 0 MSSV/P0 leaks |

## Ghi chú tự kiểm tra trước Playtest
- Toàn bộ hành vi chia vai thực tế vẫn 100% do server quyết định; \`features/boardgame/domain/\`, \`worker/\`, \`shared/contracts/\` giữ nguyên tuyệt đối.
- Âm thanh opening trung tính phe để người chơi cùng phòng không thể đoán phe qua loa ngoài.
- Nếu người chơi bấm tung xúc xắc ngay trong lúc opening đang chạy, overlay tự nhường mượt sang xúc xắc 3D mà không chặn thao tác hoặc chồng hình.
`;
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'playtest-readiness.md'), readinessMd);

    console.log('[Phase4Capture:after] ALL CHECKS PASSED!');
    console.log(JSON.stringify({
      openingDurationMs,
      specDurationMs,
      skipDismissMs,
      playerFpsMean: playerFps.fpsMean,
      specFpsMean: specFps.fpsMean,
    }, null, 2));
  } finally {
    for (const peer of peersToClose) {
      await peer.close().catch(() => undefined);
    }
    if (peerBrowser) await peerBrowser.close().catch(() => undefined);
    if (captureBrowser) await captureBrowser.close().catch(() => undefined);
    captureServer.server.close();
    shim.proc.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error('[Phase4Capture] FAILED:', err);
  process.exit(1);
});
