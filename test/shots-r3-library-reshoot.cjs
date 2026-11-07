// Chup LAI sau khi them fill bac 0,5 (CampusScene.tsx) — ghi de 3 anh huong
// bac + 1 anh mat tay (kiem tra khong hoi sang). Cung setup voi
// test/shots-r3-library.cjs. Chay: node test/shots-r3-library-reshoot.cjs
// (server rieng 127.0.0.1:8337)
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8337/';
const OUT = path.join(__dirname, '..', 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SHOTS = [
  { file: 'r3-lib-front-north.png', x: 38, z: 6, yaw: Math.PI, pitch: 0.12, distM: 7, note: 'Chup lai sau fill bac: mat chinh moi tu phia bac' },
  { file: 'r3-lib-forecourt.png', x: 38, z: 12, yaw: Math.PI, pitch: 0.1, distM: 7, note: 'Chup lai sau fill bac: san truoc cua moi' },
  { file: 'r3-lib-west-from-lake.png', x: 24, z: 32, yaw: -Math.PI / 2, pitch: 0.05, distM: 7, note: 'Chup lai sau fill bac: mat tay tu ben ho (kiem tra khong hoi sang)' },
];

(async () => {
  const { spawn } = require('child_process');
  const server = spawn('python3', ['-m', 'http.server', '8337', '--directory', 'out'], {
    cwd: path.join(__dirname, '..'), stdio: 'ignore',
  });
  const waitServer = async () => {
    const t0 = Date.now();
    for (;;) {
      try { const r = await fetch(BASE); if (r.ok) return; } catch (e) { /* chua len */ }
      if (Date.now() - t0 > 20000) throw new Error('server 8337 khong len sau 20 s');
      await sleep(500);
    }
  };
  const logPath = path.join(OUT, 'r3-lib-shots.json');
  const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  const save = () => fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  const browser = await chromium.launch({
    executablePath: EXE,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
  });
  try {
    await waitServer();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('console', (m) => { if (m.type() === 'error') log.consoleErrors.push('reshoot: ' + m.text()); });
    page.on('pageerror', (e) => log.pageErrors.push('reshoot: ' + String(e)));
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#enter-campus', { timeout: 30000 });
    await page.click('#enter-campus');
    await page.waitForFunction(() => window.__bkhn, { timeout: 30000 });
    await sleep(5000);
    let dist = 7;
    for (const s of SHOTS) {
      await page.evaluate(([xx, zz, yy, pp]) => window.__bkhn.teleport(xx, zz, yy, pp), [s.x, s.z, s.yaw, s.pitch]);
      await sleep(1500);
      await page.screenshot({ path: path.join(OUT, s.file), timeout: 240000 });
      const avatar = await page.evaluate(() => window.__bkhn.getPos());
      log.shots = log.shots.filter((x) => x.file !== s.file);
      log.shots.push({ file: s.file, avatar: { x: +avatar.x.toFixed(2), z: +avatar.z.toFixed(2) }, yaw: s.yaw, pitch: s.pitch, distM: dist, description: s.note + ' (chup lai sau fill bac 0,5)' });
      save();
      console.log('shot', s.file);
    }
    await page.close();

    const hi = await browser.newPage({ viewport: { width: 2048, height: 1280 } });
    hi.on('console', (m) => { if (m.type() === 'error') log.consoleErrors.push('hi-res reshoot: ' + m.text()); });
    hi.on('pageerror', (e) => log.pageErrors.push('hi-res reshoot: ' + String(e)));
    await hi.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await hi.waitForSelector('#enter-campus', { timeout: 30000 });
    await hi.click('#enter-campus');
    await hi.waitForFunction(() => window.__bkhn, { timeout: 90000 });
    await sleep(5000);
    await hi.mouse.move(1024, 640);
    await hi.mouse.wheel(0, 2000);
    await sleep(600);
    await hi.evaluate(() => window.__bkhn.teleport(38, 8, Math.PI, -0.1));
    await sleep(1500);
    await hi.screenshot({ path: path.join(OUT, 'r3-lib-clock-closeup.png'), timeout: 240000 });
    log.shots = log.shots.filter((x) => x.file !== 'r3-lib-clock-closeup.png');
    log.shots.push({ file: 'r3-lib-clock-closeup.png', avatar: { x: 38, z: 8 }, yaw: Math.PI, pitch: -0.1, distM: 10, description: 'Dong ho + bien ten o 2048x1280 tu (38,8) pitch -0,1 (chup lai sau fill bac 0,5)' });
    save();
    console.log('shot r3-lib-clock-closeup.png');
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
