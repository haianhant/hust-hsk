// shots-r2p-lattice2.cjs — BỔ SUNG cận hoa gió: tháp đầu hồi ĐÔNG C1
// (lưới từ y=0,6 sát đất, khác tháp giữa lưới từ y=3,85 — đứng xa vẫn chỉ
// thấy dải lưới hẹp ở mép trên khung). Chạy: node test/shots-r2p-lattice2.cjs
// Ghi: test-shots/r2p-lattice-{c,d}.png; log: test-shots/r2p-partA2.json
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8330/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = { meta: { purpose: 'Phan A muc 9 bo sung: can hoa gio thap dau hoi dong C1', date: new Date().toISOString(), viewport: '1280x800' }, consoleErrors: [], pageErrors: [], shots: [] };

// Tháp đông: tâm (-33.23,-56), mặt lưới hướng đông, w 5 (dọc z), h 12,
// lưới y 0,6..12. Đứng phía đông nhìn về tây (yaw +PI/2: camera ở phía
// đông avatar, nhìn tây qua avatar tới tháp).
const SHOTS = [
  { file: 'r2p-lattice-c.png', x: -28, z: -56, yaw: Math.PI / 2, pitch: 0.05, distM: 4,
    note: 'Thap dong chinh dien: avatar (-28,-56) dung truc thap, yaw PI/2, dist 4, pitch 0.05' },
  { file: 'r2p-lattice-d.png', x: -28, z: -53, yaw: 1.2, pitch: 0.1, distM: 4,
    note: 'Thap dong lech nam + xien: avatar (-28,-53), yaw 1.2, dist 4, pitch 0.1' },
];

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8330', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
  const waitServer = async () => {
    const t0 = Date.now();
    for (;;) {
      try { const r = await fetch(BASE); if (r.ok) return; } catch (e) { /* chua len */ }
      if (Date.now() - t0 > 20000) throw new Error('server 8330 khong len sau 20 s');
      await sleep(500);
    }
  };
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
    await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
    await sleep(5000);
    const helpClose = await page.$('button[aria-label="Đóng hướng dẫn"]');
    if (helpClose) { await helpClose.click(); await sleep(500); }
    // Về dist 4.
    await page.mouse.move(640, 400);
    await page.mouse.wheel(0, -2000);
    await sleep(600);
    for (const s of SHOTS) {
      await page.evaluate(([xx, zz, yy, pp]) => window.__bkhn.teleport(xx, zz, yy, pp), [s.x, s.z, s.yaw, s.pitch]);
      await sleep(1500);
      await page.screenshot({ path: path.join(OUT, s.file), timeout: 120000 });
      const avatar = await page.evaluate(() => window.__bkhn.getPos());
      log.shots.push({ file: s.file, avatar: { x: +avatar.x.toFixed(2), z: +avatar.z.toFixed(2) }, yaw: s.yaw, pitch: s.pitch, distM: 4, description: s.note });
      console.log('shot', s.file, 'avatar', JSON.stringify(avatar));
    }
  } catch (e) {
    log.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', log.fatal);
  } finally {
    await browser.close();
    server.kill();
  }
  fs.writeFileSync(path.join(OUT, 'r2p-partA2.json'), JSON.stringify(log, null, 2));
  console.log('shots:', log.shots.length, '| consoleErrors:', log.consoleErrors.length, '| pageErrors:', log.pageErrors.length);
  process.exit(log.fatal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
