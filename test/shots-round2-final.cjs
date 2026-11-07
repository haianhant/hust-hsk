// Chup CUOI dot 2 — 3 anh con thieu chuan (sau khi hieu dung camera:
// camera LUON nhin vao avatar y=1,2; pitch duong = camera CAO nhin xuong,
// pitch am (chi dat duoc qua teleport) = camera THAP nhin chech len).
// - south-glass: dung xa (38,85) + pitch -0,1 de dai kinh dung + tang 10 vao khung.
// - rock-front: avatar lech tay (-84,5,-26), yaw 0,1, dist 10 — bia lech phai,
//   avatar khong che chu, toan bo chu trong khung.
// - co noc C1: dung xa (-58,-20) + pitch -0,1 — co o y 19,15 vao khung tren.
// - clock-closeup: hi-res 2048x1280 tu (38,56) pitch -0,1 + crop.
// Chay: node test/shots-round2-final.cjs  (server rieng 127.0.0.1:8329)
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8329/';
const OUT = path.join(__dirname, '..', 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const { spawn } = require('child_process');
  const server = spawn('python3', ['-m', 'http.server', '8329', '--directory', 'out'], {
    cwd: path.join(__dirname, '..'), stdio: 'ignore',
  });
  const waitServer = async () => {
    const t0 = Date.now();
    for (;;) {
      try { const r = await fetch(BASE); if (r.ok) return; } catch (e) { /* chua len */ }
      if (Date.now() - t0 > 20000) throw new Error('server 8329 khong len sau 20 s');
      await sleep(500);
    }
  };
  const logPath = path.join(OUT, 'round2-merged.json');
  const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  const save = () => fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  const upsert = (entry) => { log.shots = log.shots.filter((x) => x.file !== entry.file); log.shots.push(entry); save(); };
  const browser = await chromium.launch({
    executablePath: EXE,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
  });
  try {
    await waitServer();
    console.log('server len o', BASE);
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('console', (m) => { if (m.type() === 'error') log.consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => log.pageErrors.push(String(e)));
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#enter-campus', { timeout: 30000 });
    await page.click('#enter-campus');
    await page.waitForFunction(() => window.__bkhn, { timeout: 30000 });
    await sleep(5000);
    const teleport = (x, z, yaw, pitch) =>
      page.evaluate(([xx, zz, yy, pp]) => window.__bkhn.teleport(xx, zz, yy, pp), [x, z, yaw, pitch]);
    const zoomOut = async () => { await page.mouse.move(640, 400); await page.mouse.wheel(0, 2000); await sleep(600); };

    await teleport(38, 85, 0, -0.1);
    await zoomOut();
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT, 'r2m-library-south-glass.png'), timeout: 120000 });
    upsert({ file: 'r2m-library-south-glass.png', avatar: { x: 38, z: 85 }, yaw: 0, pitch: -0.1, distM: 10, description: 'CHUP LAI lan 3: dai kinh dung + hang cua so tang 10 mat nam, dung xa (38,85) + pitch -0,1 (camera thap nhin len)' });
    console.log('shot r2m-library-south-glass.png');

    await teleport(-84.5, -26, 0.1, 0.08);
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT, 'r2m-rock-front.png'), timeout: 120000 });
    upsert({ file: 'r2m-rock-front.png', avatar: { x: -84.5, z: -26 }, yaw: 0.1, pitch: 0.08, distM: 10, description: 'CHUP LAI lan 3: bia da chinh dien, avatar lech tay — toan bo chu 2 dong trong khung, avatar khong che chu' });
    console.log('shot r2m-rock-front.png');

    await teleport(-58, -20, 0, -0.1);
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT, 'r2m-c1-flag.png'), timeout: 120000 });
    upsert({ file: 'r2m-c1-flag.png', avatar: { x: -58, z: -20 }, yaw: 0, pitch: -0.1, distM: 10, description: 'CHUP LAI lan 3: QUOC KY tren noc C1 (cot co y 14,7..19,7, co 1,9x1,1 m tai (-57,05, 19,15, -56)) — dung xa + pitch -0,1' });
    console.log('shot r2m-c1-flag.png');
    await page.close();

    // Hi-res: dong ho + co noc.
    const hi = await browser.newPage({ viewport: { width: 2048, height: 1280 } });
    hi.on('console', (m) => { if (m.type() === 'error') log.consoleErrors.push('hi-res: ' + m.text()); });
    hi.on('pageerror', (e) => log.pageErrors.push('hi-res: ' + String(e)));
    await hi.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await hi.waitForSelector('#enter-campus', { timeout: 30000 });
    await hi.click('#enter-campus');
    await hi.waitForFunction(() => window.__bkhn, { timeout: 90000 });
    await sleep(5000);
    const teleportHi = (x, z, yaw, pitch) =>
      hi.evaluate(([xx, zz, yy, pp]) => window.__bkhn.teleport(xx, zz, yy, pp), [x, z, yaw, pitch]);
    await hi.mouse.move(1024, 640);
    await hi.mouse.wheel(0, 2000);
    await sleep(600);
    await teleportHi(38, 56, 0, -0.1);
    await sleep(1500);
    await hi.screenshot({ path: path.join(OUT, 'r2m-library-clock-hires.png'), timeout: 180000 });
    upsert({ file: 'r2m-library-clock-hires.png', avatar: { x: 38, z: 56 }, yaw: 0, pitch: -0.1, distM: 10, description: 'Dong ho + bien ten o 2048x1280 tu (38,56) pitch -0,1 (ban goc de crop)' });
    console.log('shot r2m-library-clock-hires.png');
    await teleportHi(-58, -20, 0, -0.1);
    await sleep(1500);
    await hi.screenshot({ path: path.join(OUT, 'r2m-c1-flag-hires.png'), timeout: 180000 });
    upsert({ file: 'r2m-c1-flag-hires.png', avatar: { x: -58, z: -20 }, yaw: 0, pitch: -0.1, distM: 10, description: 'Quoc ky noc C1 o 2048x1280 tu (-58,-20) pitch -0,1 (ban goc de crop)' });
    console.log('shot r2m-c1-flag-hires.png');
  } catch (e) {
    log.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', log.fatal);
    save();
  } finally {
    await browser.close();
    server.kill();
  }
  console.log('shots:', log.shots.length, '| consoleErrors:', log.consoleErrors.length, '| pageErrors:', log.pageErrors.length);
})().catch((e) => { console.error(e); process.exit(1); });
