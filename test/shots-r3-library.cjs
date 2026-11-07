// Chup doi chieu dot 3 giai doan 2 — thu vien xoay 180°.
// Cung goc voi anh dot 2 (r2m-*) de co cap TRUOC/SAU:
//  - topdown: window.__bkhn.topView() (camera (0,160,5.01), bac len tren)
//  - west-from-lake: avatar (24,32) yaw -PI/2 pitch 0,05 dist 7 (nhu r2m)
//  - front-south goc cu: avatar (38,57) yaw 0 pitch 0,12 dist 7 — nay la MAT SAU
//  - front-north moi: avatar (38,6) yaw PI pitch 0,12 dist 7 — mat dong ho moi
//  - forecourt: avatar (38,12) yaw PI pitch 0,1 dist 7 — san truoc cua moi
//  - clock-closeup hi-res 2048x1280: avatar (38,8) yaw PI pitch -0,1 dist 10
//    (doi xung anh r2m-library-clock-closeup tu (38,56)).
// Chay: node test/shots-r3-library.cjs  (server rieng 127.0.0.1:8337)
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8337/';
const OUT = path.join(__dirname, '..', 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SHOTS = [
  { file: 'r3-lib-west-from-lake.png', x: 24, z: 32, yaw: -Math.PI / 2, pitch: 0.05, distM: 7, note: 'Cung goc r2m-library-west-from-lake.png: tu ben ho nhin dong — mat tay moi (khong dong ho) + khoi ben moi phia bac' },
  { file: 'r3-lib-south-from-yard.png', x: 38, z: 57, yaw: 0, pitch: 0.12, distM: 7, note: 'Cung goc r2m-library-front-south.png: tu san nam cu nhin bac — nay la MAT SAU (khong dong ho, khong sanh)' },
  { file: 'r3-lib-front-north.png', x: 38, z: 6, yaw: Math.PI, pitch: 0.12, distM: 7, note: 'Mat chinh MOI: tu phia bac nhin nam — dong ho + lam + bien ten + sanh, mai hien z 16,6..20, cot z 17,2' },
  { file: 'r3-lib-forecourt.png', x: 38, z: 12, yaw: Math.PI, pitch: 0.1, distM: 7, note: 'San truoc cua moi: dung giua 2 cau (33/43, 15,5), nhin vao cua kinh moi z 21,44 + dong ho phia tren' },
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
  const log = { meta: { purpose: 'Doi chieu dot 3 giai doan 2 — thu vien xoay 180°', date: new Date().toISOString(), viewportDesktop: '1280x800' }, consoleErrors: [], pageErrors: [], shots: [] };
  const save = () => fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
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

    let dist = 7;
    const shot = async (s) => {
      await page.evaluate(([xx, zz, yy, pp]) => window.__bkhn.teleport(xx, zz, yy, pp), [s.x, s.z, s.yaw, s.pitch]);
      if (s.distM === 10 && dist !== 10) { await page.mouse.move(640, 400); await page.mouse.wheel(0, 2000); dist = 10; }
      else if (s.distM === 7 && dist !== 7) { await page.mouse.move(640, 400); await page.mouse.wheel(0, -2000); dist = 7; }
      await sleep(1500);
      await page.screenshot({ path: path.join(OUT, s.file), timeout: 240000 });
      const avatar = await page.evaluate(() => window.__bkhn.getPos());
      log.shots.push({ file: s.file, avatar: { x: +avatar.x.toFixed(2), z: +avatar.z.toFixed(2) }, yaw: s.yaw, pitch: s.pitch, distM: dist, description: s.note });
      save();
      console.log('shot', s.file, 'avatar=', JSON.stringify(avatar));
    };
    for (const s of SHOTS) await shot(s);

    // Top-view toan campus, cung goc dot 2.
    await page.evaluate(() => window.__bkhn.topView());
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT, 'r3-lib-topdown.png'), timeout: 240000 });
    log.shots.push({ file: 'r3-lib-topdown.png', avatar: null, camera: { x: 0, y: 160, z: 5.01 }, yaw: null, pitch: null, distM: null, description: 'Top-view toan campus: footprint thu vien sau xoay 180° + san truoc cua moi phia bac (plaza minZ 14) + dao co/loc vung giu san nam' });
    save();
    console.log('shot r3-lib-topdown.png');
    await page.close();

    // Hi-res: closeup dong ho mat bac moi (doi xung anh r2m-library-clock-closeup).
    const hi = await browser.newPage({ viewport: { width: 2048, height: 1280 } });
    hi.on('console', (m) => { if (m.type() === 'error') log.consoleErrors.push('hi-res: ' + m.text()); });
    hi.on('pageerror', (e) => log.pageErrors.push('hi-res: ' + String(e)));
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
    log.shots.push({ file: 'r3-lib-clock-closeup.png', avatar: { x: 38, z: 8 }, yaw: Math.PI, pitch: -0.1, distM: 10, description: 'Dong ho + bien ten o 2048x1280 tu (38,8) pitch -0,1 — doi xung r2m-library-clock-closeup.png (tu (38,56) mat nam cu)' });
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
