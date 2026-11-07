// Chụp BỔ SUNG trên bản GỘP đợt sửa lần 2 (06/11/2026) — các góc mà worker
// chụp trên bản sao thiếu phần của nhau, + cận liễu và cận cờ chưa xác minh.
// Dùng out/ repo chính sau tích hợp, serve ở 127.0.0.1:8327 (riêng — verify
// dùng 8326). Góc chụp tái dùng đúng góc của worker thư viện/C1/hồ/nhân vật.
// Chạy: node test/shots-round2-merged.cjs  (KHÔNG chạy cùng lúc với verify
// hay script chụp khác — SwiftShader timeout khi nhiều Chrome cùng lúc)
// Ghi: test-shots/r2m-*.png + test-shots/round2-merged.json
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8327/';
const OUT = path.join(__dirname, '..', 'test-shots');
fs.mkdirSync(OUT, { recursive: true });

const EXE =
  '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// distM 7 = mặc định (không zoom); 10 -> wheel +2000; 4 -> wheel -2000.
const SHOTS = [
  { file: 'r2m-library-west-from-lake.png', x: 24, z: 32, yaw: -1.571, pitch: 0.05, distM: 7,
    note: 'Thu vien MAT TAY MOI tu bo dong ho nhin dong: khong dong ho/lam/bien ten — chi cua so ngang + dau tay khoi de' },
  { file: 'r2m-library-west-close.png', x: 24, z: 32, yaw: -1.571, pitch: 0.05, distM: 4,
    note: 'Can mat tay thu vien (kiem chung anh sang moi: worker thu vien bao mat tay nhin gan doc xam)' },
  { file: 'r2m-library-front-south.png', x: 38, z: 57, yaw: 0, pitch: 0.12, distM: 7,
    note: 'Thu vien MAT CHINH NAM tu san nam, dung tren truc cua: dong ho + lam + bien ten + sanh; dao co (38,52) nam giua' },
  { file: 'r2m-library-front-south-wide.png', x: 30, z: 54, yaw: 0.35, pitch: 0.1, distM: 7,
    note: 'Mat chinh nam lech truc tay-nam: dong ho + sanh + cau/loc vung 2 ben loi vao' },
  { file: 'r2m-library-clock-closeup.png', x: 38, z: 49.5, yaw: 0, pitch: 0.55, distM: 7,
    note: 'Can dong ho moi (r 1,6 m, y 9,6) + bien ten tren mat nam' },
  { file: 'r2m-library-front-sign.png', x: 38, z: 66, yaw: 0, pitch: 0.05, distM: 10,
    note: 'Bien ten THU VIEN TA QUANG BUU doc tron ven (banner giong da gon, khong che nua)' },
  { file: 'r2m-library-south-glass.png', x: 38, z: 60, yaw: 0, pitch: 0.35, distM: 10,
    note: 'Dai kinh dung + hang cua so tang 10 mat nam (nhin chech len)' },
  { file: 'r2m-lake-close-east.png', x: 23, z: 40, yaw: 1.571, pitch: 0.25, distM: 4,
    note: 'Can ho bo dong: canh hoa/lá/khoang nuoc' },
  { file: 'r2m-lake-close-west.png', x: -27, z: 60, yaw: -1.571, pitch: 0.2, distM: 4,
    note: 'Can ho bo tay: canh hoa/lá/khoang nuoc' },
  { file: 'r2m-lake-willow-close.png', x: 24, z: 10, yaw: 1.571, pitch: 0.3, distM: 4,
    note: 'CAN LIEU bo dong (22.2,10) tren ban gop — worker ho chua chup duoc' },
  { file: 'r2m-lake-eye.png', x: 24, z: 48, yaw: 1.571, pitch: 0.12, distM: 10,
    note: 'Ho Tien tam mat tu bo dong nhin tay' },
  { file: 'r2m-rock-front.png', x: -78, z: -26, yaw: 0, pitch: 0.08, distM: 4,
    note: 'Bia da chinh dien (mat nam): khoi be ngang + chu 2 dong' },
  { file: 'r2m-rock-oblique.png', x: -73.5, z: -26.5, yaw: 0.7, pitch: 0.08, distM: 10,
    note: 'Bia da xien: thay be day + vai bo' },
  { file: 'r2m-c1-lattice-close.png', x: -58, z: -40, yaw: 0, pitch: 0.1, distM: 4,
    note: 'Can hoa gio C1: mang o nho mat do cao' },
  { file: 'r2m-c1-front.png', x: -52, z: -31, yaw: 0.3, pitch: 0.05, distM: 10,
    note: 'C1 chinh dien du mai + chan (so sanh truoc–sau voi rework-after-c1-front)' },
  { file: 'r2m-c1-oblique.png', x: -38, z: -26, yaw: 0.785, pitch: 0.05, distM: 10,
    note: 'C1 xien 45 do tu dong-nam' },
  { file: 'r2m-c1-flag.png', x: -58, z: -38, yaw: 0, pitch: -0.3, distM: 4,
    note: 'CAN CO tren noc C1 — worker C1 chua xac minh duoc sao vang bang render' },
];

const AVATAR = [
  { file: 'r2m-avatar-front.png', yaw: -Math.PI / 2, pitch: 0.3, note: 'Nhan vat CHINH DIEN: polo do HUST + chu HUST nguc trai' },
  { file: 'r2m-avatar-side-left.png', yaw: 0, pitch: 0.15, note: 'Nhan vat BEN TRAI' },
  { file: 'r2m-avatar-back.png', yaw: Math.PI / 2, pitch: 0.3, note: 'Nhan vat TU SAU: balo' },
  { file: 'r2m-avatar-side-right.png', yaw: Math.PI, pitch: 0.15, note: 'Nhan vat BEN PHAI' },
];

(async () => {
  const { spawn } = require('child_process');
  const server = spawn('python3', ['-m', 'http.server', '8327', '--directory', 'out'], {
    cwd: path.join(__dirname, '..'), stdio: 'ignore',
  });
  const waitServer = async () => {
    const t0 = Date.now();
    for (;;) {
      try {
        const r = await fetch(BASE);
        if (r.ok) return;
      } catch (e) { /* chua len */ }
      if (Date.now() - t0 > 20000) throw new Error('server 8327 khong len sau 20 s');
      await sleep(500);
    }
  };
  const browser = await chromium.launch({
    executablePath: EXE,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
  });
  const log = { meta: { purpose: 'Anh doi chieu BO SUNG tren ban GOP dot sua lan 2', source: 'out/ repo chinh sau tich hop (build 06/11)', date: new Date().toISOString(), viewportDesktop: '1280x800' }, consoleErrors: [], pageErrors: [], shots: [], checks: {} };
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
      log.shots.push({ file: s.file, avatar: { x: +avatar.x.toFixed(2), z: +avatar.z.toFixed(2) }, camera: camPos(avatar, s.yaw, s.pitch), yaw: s.yaw, pitch: s.pitch, distM: dist, description: s.note });
      console.log('shot', s.file);
    };
    for (const s of SHOTS) await shot(s);

    // Top-view toan campus.
    await page.evaluate(() => window.__bkhn.topView());
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT, 'r2m-library-topdown.png'), timeout: 120000 });
    log.shots.push({ file: 'r2m-library-topdown.png', avatar: null, camera: { x: 0, y: 160, z: 5.01 }, yaw: null, pitch: null, distM: null, description: 'Top-view toan campus tren ban gop: footprint thu vien moi + san vao nam + dao co (38,52) + ho/C1' });
    await page.evaluate(() => window.__bkhn.followView());
    console.log('shot r2m-library-topdown.png');

    // Nhan vat 4 goc (dist 4) tai quang truong C1.
    const teleport = (x, z, yaw, pitch) =>
      page.evaluate(([xx, zz, yy, pp]) => window.__bkhn.teleport(xx, zz, yy, pp), [x, z, yaw, pitch]);
    if (dist !== 4) await zoom(-2000);
    for (const a of AVATAR) {
      await teleport(-58, -30, a.yaw, a.pitch);
      await sleep(1200);
      await page.screenshot({ path: path.join(OUT, a.file), timeout: 120000 });
      log.shots.push({ file: a.file, avatar: { x: -58, z: -30 }, yaw: a.yaw, pitch: a.pitch, distM: 4, description: a.note });
      console.log('shot', a.file);
    }
    // Thao balo: truoc + sau + can ao.
    await page.evaluate(() => window.__bkhn.setBackpack(false));
    await sleep(800);
    log.checks.backpackOff = await page.evaluate(() => window.__bkhn.getBackpack());
    await teleport(-58, -30, -Math.PI / 2, 0.12);
    await sleep(1200);
    await page.screenshot({ path: path.join(OUT, 'r2m-avatar-front-nopack.png'), timeout: 120000 });
    log.shots.push({ file: 'r2m-avatar-front-nopack.png', avatar: { x: -58, z: -30 }, yaw: -Math.PI / 2, pitch: 0.12, distM: 4, description: 'Chinh dien, DA THAO BALO' });
    await page.screenshot({ path: path.join(OUT, 'r2m-avatar-polo-closeup.png'), timeout: 120000, clip: { x: 300, y: 80, width: 424, height: 470 } });
    log.shots.push({ file: 'r2m-avatar-polo-closeup.png', avatar: { x: -58, z: -30 }, yaw: -Math.PI / 2, pitch: 0.12, distM: 4, description: 'Can ao polo: co be vien trang, nep cuc 2 cuc, chu HUST nguc trai, vien tay ao' });
    await teleport(-58, -30, Math.PI / 2, 0.3);
    await sleep(1200);
    await page.screenshot({ path: path.join(OUT, 'r2m-avatar-back-nopack.png'), timeout: 120000 });
    log.shots.push({ file: 'r2m-avatar-back-nopack.png', avatar: { x: -58, z: -30 }, yaw: Math.PI / 2, pitch: 0.3, distM: 4, description: 'Tu sau, DA THAO BALO — lung ao polo doc lap' });
    log.bbox = { noBackpack: await page.evaluate(() => window.__bkhn.measureAvatar()) };
    await page.evaluate(() => window.__bkhn.setBackpack(true));
    await sleep(800);
    log.checks.backpackOn = await page.evaluate(() => window.__bkhn.getBackpack());
    log.bbox.withBackpack = await page.evaluate(() => window.__bkhn.measureAvatar());
    console.log('bbox', JSON.stringify(log.bbox));
    log.checks.lakeCoverage = await page.evaluate(() => window.__bkhn.lakeCoverage());
    console.log('lakeCoverage =', log.checks.lakeCoverage);
    await page.close();

    // Can chu HUST o do phan giai cao (2048x1280).
    const hi = await browser.newPage({ viewport: { width: 2048, height: 1280 } });
    hi.on('console', (m) => { if (m.type() === 'error') log.consoleErrors.push('hi-res: ' + m.text()); });
    hi.on('pageerror', (e) => log.pageErrors.push('hi-res: ' + String(e)));
    await hi.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await hi.waitForSelector('#enter-campus', { timeout: 30000 });
    await hi.click('#enter-campus');
    await hi.waitForFunction(() => window.__bkhn, { timeout: 90000 });
    await sleep(5000);
    await hi.mouse.move(1024, 640);
    await hi.mouse.wheel(0, -2000);
    await sleep(600);
    await hi.evaluate(() => window.__bkhn.teleport(-58, -30, -Math.PI / 2, 0.18));
    await sleep(1500);
    await hi.screenshot({ path: path.join(OUT, 'r2m-avatar-hust-tight.png'), timeout: 180000 });
    log.shots.push({ file: 'r2m-avatar-hust-tight.png', avatar: { x: -58, z: -30 }, yaw: -Math.PI / 2, pitch: 0.18, distM: 4, description: 'Can chu HUST nguc trai o 2048x1280 (chu nho nen can do phan giai cao moi doc duoc)' });
    console.log('shot r2m-avatar-hust-tight.png');
  } catch (e) {
    log.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', log.fatal);
  } finally {
    await browser.close();
    server.kill();
  }
  fs.writeFileSync(path.join(OUT, 'round2-merged.json'), JSON.stringify(log, null, 2));
  console.log('shots:', log.shots.length, '| consoleErrors:', log.consoleErrors.length, '| pageErrors:', log.pageErrors.length);
})().catch((e) => { console.error(e); process.exit(1); });
