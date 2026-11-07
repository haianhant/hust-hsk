// Chụp bổ sung đợt 4 — 2 góc 3/4 + nhìn lên mái (chạy sau khi đã sửa yaw).
// Quy ước yaw của camera (đã xác minh bằng các góc trước): yaw 0 = nhìn bắc,
// yaw PI = nhìn nam, yaw -PI/2 = nhìn đông, yaw PI/2 = nhìn tây
// => yaw = -bearing (bearing đo từ bắc, theo chiều kim đồng hồ).
// Từ (22,8) tới tâm thư viện (38,36,5): bearing ≈ 151° => yaw ≈ -2,63.
// Từ (54,8) tới tâm thư viện: bearing ≈ 209° => yaw ≈ +2,63.
// Góc mái: avatar (38,12) nhìn lên dốc (pitch -0,55) để thấy tầng trên cùng,
// dải xanh dưới diềm mái, cụm ăng-ten, hộp thang máy, hộp vuông 2 đầu.
// Chạy: node test/r4-lib-retake34.cjs  (server riêng 127.0.0.1:8341)
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8341/';
const OUT = path.join(__dirname, '..', 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SHOTS = [
  { file: 'r4-lib-left34.png', x: 22, z: 8, yaw: -2.63, pitch: 0.0, distM: 10, note: 'Góc 3/4 tây-bắc (yaw -2,63): mặt tây (dải cửa ngang) + mặt chính + mái' },
  { file: 'r4-lib-right34.png', x: 54, z: 8, yaw: 2.63, pitch: 0.0, distM: 10, note: 'Góc 3/4 đông-bắc (yaw +2,63): mặt đông (dải cửa ngang) + mặt chính + mái' },
  { file: 'r4-lib-roof.png', x: 38, z: 12, yaw: Math.PI, pitch: -0.55, distM: 10, note: 'Nhìn lên dốc từ sân trước: tầng trên cùng (9 cửa đứng) + dải xanh dưới diềm mái + ăng-ten + hộp thang máy + hộp vuông 2 đầu' },
];

(async () => {
  const { spawn } = require('child_process');
  const server = spawn('python3', ['-m', 'http.server', '8341', '--directory', 'out'], {
    cwd: path.join(__dirname, '..'), stdio: 'ignore',
  });
  const waitServer = async () => {
    const t0 = Date.now();
    for (;;) {
      try { const r = await fetch(BASE); if (r.ok) return; } catch (e) { /* chua len */ }
      if (Date.now() - t0 > 20000) throw new Error('server 8341 khong len sau 20 s');
      await sleep(500);
    }
  };
  const logPath = path.join(OUT, 'r4-lib-shots-retake34.json');
  const log = { meta: { purpose: 'Chup bo sung dot 4 — 2 goc 3/4 (yaw da sua) + nhin len mai', date: new Date().toISOString(), viewportDesktop: '1280x800' }, consoleErrors: [], pageErrors: [], shots: [] };
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
    await page.mouse.move(640, 400);
    await page.mouse.wheel(0, 2000); // dist 10
    await sleep(600);
    for (const s of SHOTS) {
      await page.evaluate(([xx, zz, yy, pp]) => window.__bkhn.teleport(xx, zz, yy, pp), [s.x, s.z, s.yaw, s.pitch]);
      await sleep(1500);
      await page.screenshot({ path: path.join(OUT, s.file), timeout: 240000 });
      const avatar = await page.evaluate(() => window.__bkhn.getPos());
      log.shots.push({ file: s.file, avatar: { x: +avatar.x.toFixed(2), z: +avatar.z.toFixed(2) }, yaw: s.yaw, pitch: s.pitch, distM: 10, description: s.note });
      save();
      console.log('shot', s.file, 'avatar=', JSON.stringify(avatar));
    }
    await page.close();
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
