// Chup BU phan con lai cua shots-round2-merged.cjs (lan chay truoc chet lang
// sau anh r2m-rock-oblique, khong ro nguyen nhan — nghi qua tai RAM, nen tach
// lam 2 lan: lan nay chi desktop 1280x800; anh HUST 2048x1280 chay rieng
// test/shots-round2-hires.cjs sau). Ghi JSON SAU MOI anh de crash khong mat log.
// Chay: node test/shots-round2-resume.cjs  (server rieng 127.0.0.1:8327)
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8327/';
const OUT = path.join(__dirname, '..', 'test-shots');
fs.mkdirSync(OUT, { recursive: true });
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SHOTS = [
  // 3 anh chup lai (ban dau hong/kem): dong ho lech truc tranh dao co;
  // mat nam rong quay ve cua thay vi nhin tay-bac; dai kinh dung pitch doc hon + xa hon.
  { file: 'r2m-library-clock-closeup.png', x: 33, z: 49.5, yaw: -0.75, pitch: 0.55, distM: 7,
    note: 'CHUP LAI lech truc tay-nam: dong ho moi (r 1,6 m) + bien ten, khong bi cay dao co (38,52) che' },
  { file: 'r2m-library-front-south-wide.png', x: 30, z: 54, yaw: -0.73, pitch: 0.1, distM: 7,
    note: 'CHUP LAI mat chinh nam tu goc tay-nam, quay ve cua: sanh + cot + cau 2 ben + dong ho' },
  { file: 'r2m-library-south-glass.png', x: 38, z: 70, yaw: 0, pitch: 0.55, distM: 10,
    note: 'CHUP LAI dai kinh dung + hang cua so tang 10 mat nam (pitch 0,55, dung xa hon)' },
  // Bia da chinh dien lech truc de avatar khong che chu (goc cua worker C1).
  { file: 'r2m-rock-front.png', x: -81.5, z: -26, yaw: 0.12, pitch: 0.08, distM: 4,
    note: 'CHUP LAI bia da chinh dien lech truc: chu 2 dong doc tron, khong bi avatar che' },
  // C1 (goc giong worker C1 + rework-after de so sanh truoc–sau).
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
      try { const r = await fetch(BASE); if (r.ok) return; } catch (e) { /* chua len */ }
      if (Date.now() - t0 > 20000) throw new Error('server 8327 khong len sau 20 s');
      await sleep(500);
    }
  };
  const logPath = path.join(OUT, 'round2-merged.json');
  let log = { meta: { purpose: 'Anh doi chieu BO SUNG tren ban GOP dot sua lan 2 (lan 1 + bu)', source: 'out/ repo chinh sau tich hop (build 06/11)', date: new Date().toISOString(), viewportDesktop: '1280x800' }, consoleErrors: [], pageErrors: [], shots: [], checks: {} };
  try { const prev = JSON.parse(fs.readFileSync(logPath, 'utf8')); if (prev.shots) log = prev; } catch (e) { /* lan 1 khong co JSON */ }
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
      log.shots = log.shots.filter((x) => x.file !== s.file);
      log.shots.push({ file: s.file, avatar: { x: +avatar.x.toFixed(2), z: +avatar.z.toFixed(2) }, camera: camPos(avatar, s.yaw, s.pitch), yaw: s.yaw, pitch: s.pitch, distM: dist, description: s.note });
      save();
      console.log('shot', s.file);
    };
    for (const s of SHOTS) { try { await shot(s); } catch (e) { console.error('SHOT FAIL', s.file, String(e).slice(0, 200)); log.shots.push({ file: s.file, error: String(e).slice(0, 300) }); save(); } }

    await page.evaluate(() => window.__bkhn.topView());
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT, 'r2m-library-topdown.png'), timeout: 120000 });
    log.shots = log.shots.filter((x) => x.file !== 'r2m-library-topdown.png');
    log.shots.push({ file: 'r2m-library-topdown.png', avatar: null, camera: { x: 0, y: 160, z: 5.01 }, yaw: null, pitch: null, distM: null, description: 'Top-view toan campus tren ban gop: footprint thu vien moi + san vao nam + dao co (38,52) + ho/C1' });
    save();
    await page.evaluate(() => window.__bkhn.followView());
    console.log('shot r2m-library-topdown.png');

    const teleport = (x, z, yaw, pitch) =>
      page.evaluate(([xx, zz, yy, pp]) => window.__bkhn.teleport(xx, zz, yy, pp), [x, z, yaw, pitch]);
    if (dist !== 4) await zoom(-2000);
    for (const a of AVATAR) {
      try {
        await teleport(-58, -30, a.yaw, a.pitch);
        await sleep(1200);
        await page.screenshot({ path: path.join(OUT, a.file), timeout: 120000 });
        log.shots = log.shots.filter((x) => x.file !== a.file);
        log.shots.push({ file: a.file, avatar: { x: -58, z: -30 }, yaw: a.yaw, pitch: a.pitch, distM: 4, description: a.note });
        save();
        console.log('shot', a.file);
      } catch (e) { console.error('SHOT FAIL', a.file, String(e).slice(0, 200)); }
    }
    await page.evaluate(() => window.__bkhn.setBackpack(false));
    await sleep(800);
    log.checks.backpackOff = await page.evaluate(() => window.__bkhn.getBackpack());
    await teleport(-58, -30, -Math.PI / 2, 0.12);
    await sleep(1200);
    await page.screenshot({ path: path.join(OUT, 'r2m-avatar-front-nopack.png'), timeout: 120000 });
    log.shots = log.shots.filter((x) => x.file !== 'r2m-avatar-front-nopack.png');
    log.shots.push({ file: 'r2m-avatar-front-nopack.png', avatar: { x: -58, z: -30 }, yaw: -Math.PI / 2, pitch: 0.12, distM: 4, description: 'Chinh dien, DA THAO BALO' });
    save();
    await page.screenshot({ path: path.join(OUT, 'r2m-avatar-polo-closeup.png'), timeout: 120000, clip: { x: 300, y: 80, width: 424, height: 470 } });
    log.shots = log.shots.filter((x) => x.file !== 'r2m-avatar-polo-closeup.png');
    log.shots.push({ file: 'r2m-avatar-polo-closeup.png', avatar: { x: -58, z: -30 }, yaw: -Math.PI / 2, pitch: 0.12, distM: 4, description: 'Can ao polo: co be vien trang, nep cuc 2 cuc, chu HUST nguc trai, vien tay ao' });
    save();
    await teleport(-58, -30, Math.PI / 2, 0.3);
    await sleep(1200);
    await page.screenshot({ path: path.join(OUT, 'r2m-avatar-back-nopack.png'), timeout: 120000 });
    log.shots = log.shots.filter((x) => x.file !== 'r2m-avatar-back-nopack.png');
    log.shots.push({ file: 'r2m-avatar-back-nopack.png', avatar: { x: -58, z: -30 }, yaw: Math.PI / 2, pitch: 0.3, distM: 4, description: 'Tu sau, DA THAO BALO — lung ao polo doc lap' });
    save();
    log.bbox = { noBackpack: await page.evaluate(() => window.__bkhn.measureAvatar()) };
    await page.evaluate(() => window.__bkhn.setBackpack(true));
    await sleep(800);
    log.checks.backpackOn = await page.evaluate(() => window.__bkhn.getBackpack());
    log.bbox.withBackpack = await page.evaluate(() => window.__bkhn.measureAvatar());
    console.log('bbox', JSON.stringify(log.bbox));
    log.checks.lakeCoverage = await page.evaluate(() => window.__bkhn.lakeCoverage());
    console.log('lakeCoverage =', log.checks.lakeCoverage);
    save();
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
