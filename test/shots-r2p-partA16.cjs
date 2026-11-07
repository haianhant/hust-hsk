// shots-r2p-partA16.cjs — PHẦN A mục 1–6: chụp đối chiếu TRƯỚC/SAU trên out/
// mới (sau khi sửa code r2p-A). Server riêng 127.0.0.1:8329 (verify dùng
// 8326, luồng bia đá dùng 8330 — KHÔNG chạy cùng lúc với script chụp khác).
// Chạy: node test/shots-r2p-partA16.cjs
// Ghi: test-shots/r2p-*.png + test-shots/r2p-partA16.json
// Ảnh "trước" dùng lại: r2m-library-topdown.png, r2m-library-front-sign2.png,
// r2m-lake-willow-close.png, r2m-lake-close-east.png, r2m-lake-eye.png,
// r2m-c1-front.png, r2-round2-bg-trees-north.png, r2-round2-love-road.png
// (xem cột before trong SHOTS; 2 ảnh r2-round2-* khác góc chụp, ghi rõ).
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8329/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
fs.mkdirSync(OUT, { recursive: true });
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// distM 7 = mặc định; 10 -> wheel +2000; 4 -> wheel -2000.
const SHOTS = [
  { file: 'r2p-north-row-love-road.png', x: 0, z: -16, yaw: 0, pitch: 0.1, distM: 10,
    before: 'r2-round2-bg-trees-north.png (KHAC GOC: anh truoc chup tu ria bac nhin ve nha, khong thay cay nao; anh sau dung duong tinh yeu nhin bac, thay hang cay truoc nha bac)',
    note: 'Muc 1: hang cay bac MOI (z=-62) tu duong tinh yeu nhin bac — 10 cay dung truoc 3 khoi nha bac' },
  { file: 'r2p-library-front.png', x: 38, z: 66, yaw: 0, pitch: 0.05, distM: 10,
    before: 'r2m-library-front-sign2.png (cung goc)',
    note: 'Muc 2+5+6: mat chinh nam thu vien dist 10 — lam tach thanh, cau la ru, cay dao co cum lech' },
  { file: 'r2p-library-palm-close.png', x: 38, z: 54, yaw: 0, pitch: 0.15, distM: 4,
    before: 'r2m-library-front-sign2.png (cau trong anh rong, khong co anh can truoc)',
    note: 'Muc 5: can 2 cay cau 2 ben loi vao — phien dai ru xuong, khong con o det' },
  { file: 'r2p-lake-willow-close.png', x: 24, z: 10, yaw: 1.571, pitch: 0.3, distM: 4,
    before: 'r2m-lake-willow-close.png (cung goc)',
    note: 'Muc 3: can lieu bo dong (22.2,10) — canh ru dai la lien mach, khong con chuoi hat' },
  { file: 'r2p-lake-willow-side.png', x: 25, z: 7, yaw: 2.2, pitch: 0.25, distM: 4,
    before: 'khong co (goc phu, thay canh ru khong bi avatar che)',
    note: 'Muc 3: lieu bo dong tu goc cheo — thay than + canh ru phia ho' },
  { file: 'r2p-lake-close-east.png', x: 23, z: 40, yaw: 1.571, pitch: 0.25, distM: 4,
    before: 'r2m-lake-close-east.png (cung goc)',
    note: 'Muc 4+6: can ho bo dong tam mat — hoa sen chen + cay bo xa khong con cau tron' },
  { file: 'r2p-lake-eye.png', x: 24, z: 48, yaw: 1.571, pitch: 0.12, distM: 10,
    before: 'r2m-lake-eye.png (cung goc)',
    note: 'Muc 4: ho tam mat tu bo dong nhin tay — hoa sen o tam mat' },
  { file: 'r2p-love-road.png', x: -30, z: -16, yaw: -1.571, pitch: 0.08, distM: 10,
    before: 'r2-round2-love-road.png (gan goc: avatar tren duong tinh yeu nhin dong)',
    note: 'Muc 6: cay duong tinh yeu nhin dong — tan cum lech, khong con dia/cau xep chong' },
  { file: 'r2p-c1-front.png', x: -52, z: -31, yaw: 0.3, pitch: 0.05, distM: 10,
    before: 'r2m-c1-front.png (cung goc)',
    note: 'Muc 6: C1 chinh dien — 2 cay Lipa tan cum lech 2 ben san' },
  { file: 'r2p-gate-trees.png', x: -80, z: 10, yaw: 1.571, pitch: 0.1, distM: 7,
    before: 'khong co (goc moi: cay cong truoc la 1 cau tron r 3,2 m)',
    note: 'Muc 6: cay lon 2 ben cong Parabol — tan cum lech' },
];

const log = { meta: { purpose: 'Phan A muc 1-6: anh doi chieu TRUOC/SAU tren out/ moi (r2p-A)', date: new Date().toISOString(), viewport: '1280x800' }, consoleErrors: [], pageErrors: [], shots: [], checks: {} };

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8329', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
  const waitServer = async () => {
    const t0 = Date.now();
    for (;;) {
      try { const r = await fetch(BASE); if (r.ok) return; } catch (e) { /* chua len */ }
      if (Date.now() - t0 > 20000) throw new Error('server 8329 khong len sau 20 s');
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
    await page.waitForFunction(() => window.__bkhn, { timeout: 30000 });
    await sleep(5000);

    let dist = 7;
    const zoom = async (dy) => {
      await page.mouse.move(640, 400);
      await page.mouse.wheel(0, dy);
      dist = dy > 0 ? 10 : 4;
      await sleep(600);
    };
    const camPos = (avatar, yaw, pitch) => ({
      x: +(avatar.x + Math.sin(yaw) * Math.cos(pitch) * dist).toFixed(2),
      y: +(1.2 + Math.sin(pitch) * dist).toFixed(2),
      z: +(avatar.z + Math.cos(yaw) * Math.cos(pitch) * dist).toFixed(2),
    });
    const shot = async (s) => {
      await page.evaluate(([xx, zz, yy, pp]) => window.__bkhn.teleport(xx, zz, yy, pp), [s.x, s.z, s.yaw, s.pitch]);
      if (s.distM === 10 && dist !== 10) await zoom(2000);
      else if (s.distM === 4 && dist !== 4) await zoom(-2000);
      else if (s.distM === 7 && dist !== 7) { await page.mouse.move(640, 400); await page.mouse.wheel(0, dist === 10 ? -2000 : 2000); dist = 7; await sleep(600); }
      await sleep(1500);
      await page.screenshot({ path: path.join(OUT, s.file), timeout: 120000 });
      const avatar = await page.evaluate(() => window.__bkhn.getPos());
      log.shots.push({ file: s.file, before: s.before, avatar: { x: +avatar.x.toFixed(2), z: +avatar.z.toFixed(2) }, camera: camPos(avatar, s.yaw, s.pitch), yaw: s.yaw, pitch: s.pitch, distM: dist, description: s.note });
      console.log('shot', s.file, 'avatar', avatar.x.toFixed(1), avatar.z.toFixed(1));
    };
    for (const s of SHOTS) await shot(s);

    // Top-view toan campus (doi chieu muc 1).
    await page.evaluate(() => window.__bkhn.topView());
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT, 'r2p-north-row-topdown.png'), timeout: 120000 });
    log.shots.push({ file: 'r2p-north-row-topdown.png', before: 'r2m-library-topdown.png (cung goc top-view)', avatar: null, camera: { x: 0, y: 160, z: 5.01 }, yaw: null, pitch: null, distM: null, description: 'Muc 1: top-view — hang cay bac moi (z=-62) dung truoc 3 khoi nha bac' });
    await page.evaluate(() => window.__bkhn.followView());
    console.log('shot r2p-north-row-topdown.png');

    log.checks.lakeCoverage = await page.evaluate(() => window.__bkhn.lakeCoverage());
    console.log('lakeCoverage =', log.checks.lakeCoverage);
  } catch (e) {
    log.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', log.fatal);
  } finally {
    await browser.close();
    server.kill();
  }
  fs.writeFileSync(path.join(OUT, 'r2p-partA16.json'), JSON.stringify(log, null, 2));
  console.log('shots:', log.shots.length, '| consoleErrors:', log.consoleErrors.length, '| pageErrors:', log.pageErrors.length);
})().catch((e) => { console.error(e); process.exit(1); });
