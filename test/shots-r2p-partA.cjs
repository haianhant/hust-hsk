// shots-r2p-partA.cjs — PHẦN A mục 8–9: chụp lại bia đá + cận hoa gió C1
// trên out/ hiện tại (bản đợt sửa lần 2), TRƯỚC khi sửa code HUD.
// Chạy: node test/shots-r2p-partA.cjs  (server riêng 127.0.0.1:8330)
// Ghi: test-shots/r2p-stele-{a,b,c}.png (3 góc thử) + r2p-lattice-{a,b}.png
// (2 góc thử); ảnh tốt nhất được copy thành r2p-stele-front.png /
// r2p-lattice-close.png sau khi xem. Log: test-shots/r2p-partA.json
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8330/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
fs.mkdirSync(OUT, { recursive: true });
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const log = { meta: { purpose: 'Phan A muc 8-9: chup lai bia da + can hoa gio C1 tren out/ dot sua lan 2', date: new Date().toISOString(), viewport: '1280x800' }, consoleErrors: [], pageErrors: [], shots: [] };

const SHOTS = [
  // Bia đá: tâm (-78,-31), mặt chữ hướng nam, chữ y ~1,1-1,8. Avatar lệch
  // sang bên để không che chữ; dist 10 để avatar nhỏ lại so với bia.
  { file: 'r2p-stele-a.png', x: -76, z: -26, yaw: 0, pitch: 0.2, distM: 10,
    note: 'Bia chinh dien, avatar lech dong 2m (x -76), pitch 0.2, dist 10' },
  { file: 'r2p-stele-b.png', x: -80, z: -26, yaw: 0, pitch: 0.2, distM: 10,
    note: 'Bia chinh dien, avatar lech tay 2m (x -80), pitch 0.2, dist 10' },
  { file: 'r2p-stele-c.png', x: -78, z: -24, yaw: 0, pitch: 0.15, distM: 10,
    note: 'Bia chinh dien, avatar dung truc (x -78) nhung xa hon (z -24), pitch 0.15, dist 10' },
  // Hoa gió C1: góc cũ (-58,-40) yaw 0 pitch 0.1 dist 4 — thử góc khác.
  { file: 'r2p-lattice-a.png', x: -52, z: -40, yaw: 0.5, pitch: 0.1, distM: 4,
    note: 'Can hoa gio, lech dong + xien (yaw 0.5), tranh logo I LOVE BK o truc' },
  { file: 'r2p-lattice-b.png', x: -58, z: -36, yaw: 0, pitch: 0.05, distM: 4,
    note: 'Can hoa gio, dung sat hon (z -36), pitch thap 0.05 nhin chech len' },
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
    // Đóng hộp "Cách di chuyển" để khỏi che phần dưới khung hình.
    const helpClose = await page.$('button[aria-label="Đóng hướng dẫn"]');
    if (helpClose) { await helpClose.click(); await sleep(500); }

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
      else if (s.distM === 7 && dist !== 7) { await page.mouse.move(640, 400); await page.mouse.wheel(0, dist === 10 ? -2000 : 2000); dist = 7; await sleep(600); }
      await sleep(1500);
      await page.screenshot({ path: path.join(OUT, s.file), timeout: 120000 });
      const avatar = await page.evaluate(() => window.__bkhn.getPos());
      const pitch = await page.evaluate(() => window.__bkhn.getPitch());
      log.shots.push({ file: s.file, avatar: { x: +avatar.x.toFixed(2), z: +avatar.z.toFixed(2) }, yaw: s.yaw, pitch, distM: dist, description: s.note });
      console.log('shot', s.file, 'avatar', JSON.stringify(avatar), 'pitch', pitch);
    }
  } catch (e) {
    log.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', log.fatal);
  } finally {
    await browser.close();
    server.kill();
  }
  fs.writeFileSync(path.join(OUT, 'r2p-partA.json'), JSON.stringify(log, null, 2));
  console.log('shots:', log.shots.length, '| consoleErrors:', log.consoleErrors.length, '| pageErrors:', log.pageErrors.length);
  process.exit(log.fatal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
