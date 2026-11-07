// Chụp lại 2 góc bị ảnh hưởng bởi sửa sân thư viện + chậu hoa C1 sau đợt 2
// (06/11/2026): đảo cỏ dời khỏi trục cửa, lộc vừng thành cụm 3 tán, cau 7 lá,
// chậu hoa giấy thành cụm 3 khóm. Dùng out/ repo chính, serve 127.0.0.1:8328.
// Chạy SAU khi verify xong (không chạy cùng lúc với verify hay script chụp khác).
// Ghi: test-shots/r2m-library-front-sign2.png, r2m-c1-lattice-close2.png
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const BASE = 'http://127.0.0.1:8328/';
const OUT = path.join(__dirname, '..', 'test-shots');
fs.mkdirSync(OUT, { recursive: true });

const EXE =
  '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SHOTS = [
  { file: 'r2m-library-front-sign2.png', x: 38, z: 66, yaw: 0, pitch: 0.05, distM: 10,
    note: 'Thu vien mat chinh nam tu san nam SAU khi doi dao co khoi truc cua + loc vung cum 3 tan' },
  { file: 'r2m-c1-lattice-close2.png', x: -58, z: -40, yaw: 0, pitch: 0.1, distM: 4,
    note: 'Can hoa gio C1 + chau hoa giay SAU khi doi thanh cum 3 khom (khong con nam hong)' },
];

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8328', '--directory', 'out'], {
    cwd: path.join(__dirname, '..'), stdio: 'ignore',
  });
  const browser = await chromium.launch({
    executablePath: EXE,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
  });
  try {
    const t0 = Date.now();
    for (;;) {
      try { const r = await fetch(BASE); if (r.ok) break; } catch (e) {}
      if (Date.now() - t0 > 20000) throw new Error('server 8328 khong len sau 20 s');
      await sleep(500);
    }
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 200)));
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#enter-campus', { timeout: 30000 });
    await page.click('#enter-campus');
    await page.waitForFunction(() => window.__bkhn, { timeout: 30000 });
    await sleep(5000);
    let dist = 7;
    const zoom = async (dy) => {
      await page.mouse.move(640, 400);
      await page.mouse.wheel(0, dy);
      dist = dy > 0 ? 10 : 4;
      await sleep(600);
    };
    for (const s of SHOTS) {
      await page.evaluate(([xx, zz, yy, pp]) => window.__bkhn.teleport(xx, zz, yy, pp), [s.x, s.z, s.yaw, s.pitch]);
      if (s.distM === 10 && dist !== 10) await zoom(2000);
      else if (s.distM === 4 && dist !== 4) await zoom(-2000);
      await sleep(1500);
      await page.screenshot({ path: path.join(OUT, s.file), timeout: 120000 });
      console.log('shot', s.file, '—', s.note);
    }
  } finally {
    await browser.close();
    server.kill();
  }
  console.log('DONE');
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
