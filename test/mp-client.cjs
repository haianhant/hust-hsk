// test/mp-client.cjs — KIỂM CHỨNG HAI CLIENT THẬT THẤY NHAU (đợt 5).
// Chạy: node test/mp-client.cjs [--shim | --real]
//   --shim: nối tới shim local (ws://127.0.0.1:8788/ws) — cần build với
//           NEXT_PUBLIC_HUST_MULTIPLAYER_WS_URL=ws://127.0.0.1:8788/ws
//   --real (mặc định): nối tới Worker thật wss://hust-hsk-rooms... (build
//           production, fallback URL). Chromium trong VM đi qua egress
//           proxy (lấy từ env HTTPS_PROXY lúc chạy, không hardcode).
// Server riêng 127.0.0.1:8339. Hai context cùng lúc (mỗi context một
// canvas WebGL SwiftShader, viewport nhỏ 960×600 cho nhẹ).
// Kiểm tra: form tên + MSSV; vào trường; chip HUD phòng + số người thật;
// A đi bộ → B thấy vị trí A đổi (qua __bkhnMp); teleport → B thấy A hội
// tụ về chỗ mới; hai nhân vật cùng khung hình với bảng tên "Tên (MSSV)".
// Mất mạng kiểm riêng ở test/mp-offline.cjs (1 context — 3 context WebGL
// cùng lúc dễ làm browser chết).
// Log: test-shots/r5-mp-client-<mode>.log ; ảnh: test-shots/r5-mp-*.
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
const LOG = path.join(OUT, `r5-mp-client-${MODE}.log`);

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
  // bypass: server test chạy trên 127.0.0.1:8339 — KHÔNG đi qua proxy
  // (proxy trả ERR_EMPTY_RESPONSE cho địa chỉ local); chỉ WS tới
  // workers.dev đi qua proxy.
  return { server: `http://${m[3]}:${m[4]}`, username: m[1], password: m[2], bypass: '127.0.0.1,localhost' };
}

async function mpSnap(page) {
  return page.evaluate(() => (typeof window.__bkhnMp === 'function' ? window.__bkhnMp() : null));
}
async function waitMp(page, want, timeout = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const s = await mpSnap(page).catch(() => null);
    if (s && s.status === want) return s;
    await sleep(500);
  }
  return mpSnap(page).catch(() => null);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(LOG, '');
  log(`mp-client mode=${MODE} at ${new Date().toISOString()}`);
  let server = null;
  let shim = null;
  let browser = null;
  const consoleErrors = [];
  const pageErrors = [];
  try {
    server = await startServer();
    log('server lên ở ' + BASE);
    if (MODE === 'shim') {
      shim = await startShim();
      log('shim lên ở 127.0.0.1:8788');
    }
    const launchOpts = {
      executablePath: EXE,
      args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
    };
    if (MODE === 'real') {
      const proxy = proxyFromEnv();
      if (proxy) {
        launchOpts.proxy = proxy;
        log('real mode: Chromium qua egress proxy ' + proxy.server);
      } else {
        log('real mode: KHÔNG có proxy env — thử nối trực tiếp');
      }
    }
    browser = await chromium.launch(launchOpts);

    // ---- Context A: identity lưu sẵn, bấm "Vào trường" luôn ----
    const ctxA = await browser.newContext({ viewport: { width: 960, height: 600 } });
    const pageA = await ctxA.newPage();
    pageA.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('A: ' + m.text()); });
    pageA.on('pageerror', (e) => pageErrors.push('A: ' + String(e)));
    await pageA.addInitScript(() => {
      localStorage.setItem('bkhn-identity-v1', JSON.stringify({ name: 'Hải Anh', mssv: '20226010' }));
    });
    await pageA.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await pageA.waitForSelector('#enter-campus', { timeout: 30000 });
    // Dòng identity đã lưu hiện qua effect sau mount (tránh hydration
    // mismatch) — chờ nó thay vì kiểm ngay.
    await pageA.waitForSelector('text=Hải Anh (20226010)', { timeout: 10000 });
    check('A: màn vào hiện identity đã lưu "Hải Anh (20226010)"', true);
    await pageA.click('#enter-campus');
    await pageA.locator('canvas').first().waitFor({ state: 'visible', timeout: 120000 });
    const snapA = await waitMp(pageA, 'online', 60000);
    check('A: nối multiplayer online', snapA && snapA.status === 'online', JSON.stringify(snapA));
    check('A: vào phòng hsk-1', snapA && snapA.roomId === 'hsk-1', JSON.stringify(snapA));

    // ---- Context B: nhập form tay (kiểm form), rồi vào trường ----
    const ctxB = await browser.newContext({ viewport: { width: 960, height: 600 } });
    const pageB = await ctxB.newPage();
    pageB.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('B: ' + m.text()); });
    pageB.on('pageerror', (e) => pageErrors.push('B: ' + String(e)));
    await pageB.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await pageB.waitForSelector('#identity-name', { timeout: 30000 });
    await pageB.screenshot({ path: path.join(OUT, 'r5-mp-entry.png'), timeout: 120000 });
    log('shot r5-mp-entry.png');
    // MSSV sai: phải chặn, không vào được.
    await pageB.fill('#identity-name', 'Minh');
    await pageB.fill('#identity-mssv', '123');
    await pageB.click('#enter-campus');
    await sleep(800);
    const blocked = await pageB.locator('#enter-campus').isVisible().catch(() => false);
    // Dùng css=p[role="alert"]: selector [role="alert"] còn trúng cả
    // #__next-route-announcer__ của Next.js (div role=alert ẩn).
    const errShown = await pageB.locator('css=p[role="alert"]').isVisible().catch(() => false);
    check('B: MSSV sai (123) bị chặn + báo lỗi', blocked && errShown);
    await pageB.fill('#identity-mssv', '20226011');
    await pageB.click('#enter-campus');
    await pageB.locator('canvas').first().waitFor({ state: 'visible', timeout: 120000 });
    const snapB = await waitMp(pageB, 'online', 60000);
    check('B: nối multiplayer online', snapB && snapB.status === 'online', JSON.stringify(snapB));
    check('B: cùng phòng hsk-1 với A', snapB && snapB.roomId === 'hsk-1', JSON.stringify(snapB));

    // ---- A thấy B và B thấy A (tên + MSSV) ----
    await sleep(1500);
    const snapA2 = await mpSnap(pageA);
    const snapB2 = await mpSnap(pageB);
    const aSeesB = snapA2?.players?.find((p) => p.mssv === '20226011');
    const bSeesA = snapB2?.players?.find((p) => p.mssv === '20226010');
    check('A thấy B "Minh (20226011)"', !!aSeesB && aSeesB.name === 'Minh', JSON.stringify(snapA2?.players));
    check('B thấy A "Hải Anh (20226010)"', !!bSeesA && bSeesA.name === 'Hải Anh', JSON.stringify(snapB2?.players));
    // Chip HUD: chờ text "2 người" thay vì đọc một lần — dưới tải
    // SwiftShader 2 context, broadcast count + re-render React có thể
    // chậm vài giây (run 7 đọc ngay đã gặp chip chưa kịp cập nhật).
    // Đọc qua evaluate (querySelector) thay vì locator.textContent:
    // locator từng timeout 30 s liền dù chip CÓ trong DOM (ảnh run 12
    // cho thấy "Phòng hsk-1 · 2 người" trên màn B) — renderer nghẽn
    // không đáp kịp thao tác chờ gắn phần tử của Playwright.
    const waitChip = async (pg, substr, timeout = 30000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < timeout) {
        const t = await pg.evaluate(() => document.querySelector('[data-testid="mp-chip"]')?.textContent ?? null).catch(() => null);
        if (t && t.includes(substr)) return t;
        await sleep(500);
      }
      return pg.evaluate(() => document.querySelector('[data-testid="mp-chip"]')?.textContent ?? null).catch(() => null);
    };
    const chipA = await waitChip(pageA, '2 người');
    const chipB = await waitChip(pageB, '2 người');
    check('HUD A: "Phòng hsk-1 · 2 người"', (chipA || '').includes('2 người'), chipA || '');
    check('HUD B: "Phòng hsk-1 · 2 người"', (chipB || '').includes('2 người'), chipB || '');

    // ---- A đi bộ về phía trước → B thấy vị trí A đổi ----
    // SwiftShader ~1 fps + delta kẹp 0,05 s/frame → giữ W 8 s chỉ đi
    // được ~0–0,6 m (có lượt 0 khung hình chạy trong 8 s). Chỉ chấm
    // khi A nhúc nhích TẠI CHỖ trước đã (getPos đổi) — nếu A đứng yên
    // vì không có khung hình nào chạy thì không có gì để đồng bộ, SKIP
    // có ghi lý do (teleport bên dưới vẫn kiểm đồng bộ dịch chuyển).
    const before = bSeesA ? { x: bSeesA.x, z: bSeesA.z } : null;
    const localBefore = await pageA.evaluate(() => window.__bkhn.getPos());
    await pageA.keyboard.down('w');
    await sleep(8000);
    await pageA.keyboard.up('w');
    await sleep(1500);
    const localAfter = await pageA.evaluate(() => window.__bkhn.getPos());
    const localMoved = Math.hypot(localAfter.x - localBefore.x, localAfter.z - localBefore.z);
    const snapB3 = await mpSnap(pageB);
    const bSeesA2 = snapB3?.players?.find((p) => p.mssv === '20226010');
    if (localMoved > 0.15) {
      const moved = before && bSeesA2 && Math.hypot(bSeesA2.x - before.x, bSeesA2.z - before.z) > 0.15;
      check('B thấy A di chuyển khi đi bộ (>0,15 m)', !!moved, `trước ${JSON.stringify(before)} sau ${JSON.stringify(bSeesA2 && { x: bSeesA2.x, z: bSeesA2.z })}`);
    } else {
      log(`SKIP B thấy A di chuyển — A không nhúc nhích tại chỗ (${localMoved.toFixed(2)} m, 0 khung hình chạy trong 8 s, SwiftShader); teleport bên dưới vẫn kiểm đồng bộ`);
    }
    check('B thấy A trạng thái walking/idle', !!bSeesA2 && ['walking', 'idle', 'running'].includes(bSeesA2.state), bSeesA2?.state);
    await pageA.evaluate(() => window.__bkhn.teleport(-70, 14, Math.PI / 4, 0.18));
    await sleep(4000);
    const snapB4 = await mpSnap(pageB);
    const bSeesA3 = snapB4?.players?.find((p) => p.mssv === '20226010');
    const converged = bSeesA3 && Math.hypot(bSeesA3.x - -70, bSeesA3.z - 14) < 1.5;
    check('B thấy A hội tụ về chỗ teleport (-70,14) trong 1,5 m', !!converged, JSON.stringify(bSeesA3 && { x: bSeesA3.x, z: bSeesA3.z }));
    log('snapshot B lúc chụp ảnh: ' + JSON.stringify(snapB4?.players));
    log('snapshot A lúc chụp ảnh: ' + JSON.stringify((await mpSnap(pageA))?.players));

    // ---- Hai nhân vật cùng khung hình ----
    // A (-68,22) yaw 1,27; B (-72,22) yaw -1,27: cả hai cách xe máy
    // (~(-72,14)) 8–9 m nên không hiện overlay "E Lên xe" (run 12 B
    // đứng cạnh xe nên overlay che mất bảng tên của A). Camera mỗi bên
    // lệch ~0,3 rad khỏi trục hai người để người kia không chồng lên
    // avatar của mình.
    await pageA.evaluate(() => window.__bkhn.teleport(-68, 22, 1.27, 0.18));
    await pageB.evaluate(() => window.__bkhn.teleport(-72, 22, -1.27, 0.18));
    // Chờ 6 s để nội suy phía B bắt kịp (SwiftShader chậm, mỗi khung
    // chỉ tiến tối đa 2,25 m).
    await sleep(6000);
    log('render B thấy A: ' + JSON.stringify(await pageB.evaluate(() => window.__bkhnMpRender?.())));
    log('render A thấy B: ' + JSON.stringify(await pageA.evaluate(() => window.__bkhnMpRender?.())));
    await pageB.screenshot({ path: path.join(OUT, 'r5-mp-two-players.png'), timeout: 120000 });
    log('shot r5-mp-two-players.png (góc B: A đứng lệch bên, kèm bảng tên)');
    await pageA.screenshot({ path: path.join(OUT, 'r5-mp-two-players-a.png'), timeout: 120000 });
    log('shot r5-mp-two-players-a.png (góc A: B đứng lệch bên, kèm bảng tên)');

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
  log(`mp-client (${MODE}): ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
