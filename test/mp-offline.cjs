// test/mp-offline.cjs — KIỂM CHỨNG CHƠI MỘT MÌNH KHI MẤT MẠNG (đợt 5).
// Chạy: node test/mp-offline.cjs [--shim | --real]
//   --shim: nối tới shim local (cần build với URL shim, như mp-client).
//   --real (mặc định): nối tới Worker thật (build production).
// Một context duy nhất: tải trang, setOffline(true), bấm "Vào trường" —
// WebSocket nối thất bại → status offline, chip "Chơi một mình (mất kết
// nối)", không người chơi giả, scene vẫn chơi được (canvas hiện).
// Log: test-shots/r5-mp-offline.log ; ảnh: test-shots/r5-mp-offline.png.
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const MODE = process.argv.includes('--shim') ? 'shim' : 'real';
const BASE = 'http://127.0.0.1:8339/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LOG = path.join(OUT, 'r5-mp-offline.log');

let pass = 0;
let fail = 0;
function log(s) {
  fs.appendFileSync(LOG, s + '\n');
  console.log(s);
}
function check(name, cond, extra = '') {
  if (cond) { pass += 1; log(`PASS ${name}`); }
  else { fail += 1; log(`FAIL ${name} ${extra}`); }
  return !!cond;
}
function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', '8339', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
    proc.on('error', reject);
    const t0 = Date.now();
    const tick = () => {
      fetch(BASE, { method: 'HEAD' }).then(() => resolve(proc)).catch(() => {
        if (Date.now() - t0 > 15000) reject(new Error('server không lên sau 15 s'));
        else setTimeout(tick, 300);
      });
    };
    tick();
  });
}
function startShim() {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['test/ws-shim/server.js', '8788'], { cwd: ROOT, stdio: 'ignore' });
    proc.on('error', reject);
    const t0 = Date.now();
    const tick = () => {
      fetch('http://127.0.0.1:8788/health').then(() => resolve(proc)).catch(() => {
        if (Date.now() - t0 > 15000) reject(new Error('shim không lên sau 15 s'));
        else setTimeout(tick, 300);
      });
    };
    tick();
  });
}
function proxyFromEnv() {
  const raw = process.env.HTTPS_PROXY || process.env.https_proxy || '';
  const m = raw.match(/^https?:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)/);
  if (!m) return undefined;
  return { server: `http://${m[3]}:${m[4]}`, username: m[1], password: m[2] };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(LOG, '');
  log(`mp-offline mode=${MODE} at ${new Date().toISOString()}`);
  let server = null;
  let shim = null;
  let browser = null;
  const consoleErrors = [];
  const pageErrors = [];
  try {
    server = await startServer();
    if (MODE === 'shim') shim = await startShim();
    const launchOpts = {
      executablePath: EXE,
      args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
    };
    if (MODE === 'real') {
      const proxy = proxyFromEnv();
      if (proxy) launchOpts.proxy = proxy;
    }
    browser = await chromium.launch(launchOpts);
    const ctx = await browser.newContext({ viewport: { width: 960, height: 600 } });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await page.addInitScript(() => {
      localStorage.setItem('bkhn-identity-v1', JSON.stringify({ name: 'Khách', mssv: '20226099' }));
    });
    // Chặn RIÊNG WebSocket (routeWebSocket) — không chặn HTTP như
    // setOffline (setOffline còn chặn cả chunk CampusScene tải lazy khi
    // vào trường, làm test chết oan; ngoài đời thật "Worker không tới
    // được" cũng chỉ mất WS, trang vẫn tải bình thường).
    await page.routeWebSocket('**/ws', (route) => route.close());
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#enter-campus', { timeout: 30000 });
    await page.click('#enter-campus');
    await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 120000 });
    // Đợi status offline (nối thất bại → onclose → offline ngay).
    let snap = null;
    const t0 = Date.now();
    while (Date.now() - t0 < 30000) {
      snap = await page.evaluate(() => (typeof window.__bkhnMp === 'function' ? window.__bkhnMp() : null)).catch(() => null);
      if (snap && snap.status === 'offline') break;
      await sleep(500);
    }
    check('mất mạng → status offline, vẫn vào trường chơi được', snap && snap.status === 'offline', JSON.stringify(snap));
    const chip = await page.locator('[data-testid="mp-chip"]').textContent().catch(() => '');
    check('chip ghi "Chơi một mình (mất kết nối)"', (chip || '').includes('Chơi một mình'), chip || '');
    check('không có người chơi giả', snap && snap.players.length === 0, JSON.stringify(snap?.players));
    await page.screenshot({ path: path.join(OUT, 'r5-mp-offline.png'), timeout: 120000 });
    log('shot r5-mp-offline.png');
    check('0 console errors', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '));
    check('0 page errors', pageErrors.length === 0, pageErrors.slice(0, 5).join(' | '));
  } catch (e) {
    fail += 1;
    log('CRASH ' + (e && e.stack ? e.stack : String(e)));
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (shim) shim.kill('SIGTERM');
    if (server) server.kill('SIGTERM');
  }
  log(`mp-offline (${MODE}): ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
