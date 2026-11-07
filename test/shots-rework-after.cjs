// Chụp HIỆN TRẠNG SAU KHI SỬA — đợt sửa kiến trúc ngoại thất (brief §10 bước 8).
// Tái dùng ĐÚNG các góc trong test-shots/rework-before.json (avatar/yaw/pitch/
// distM đã chốt sau các lần retake) để đối chiếu trước/sau. Dùng out/ mới
// (build sau tích hợp) serve ở 127.0.0.1:8321. Tái dùng hook window.__bkhn +
// cách chạy Playwright của /tmp/shots-rework-before.cjs.
// Chạy: node test/shots-rework-after.cjs   (cần server ở 127.0.0.1:8321)
// Ghi: test-shots/rework-after-*.png + test-shots/rework-after.json
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8321/';
const OUT = path.join(__dirname, '..', 'test-shots');
fs.mkdirSync(OUT, { recursive: true });

const EXE =
  '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Góc chụp = rework-before.json (sau retake). distM 10 -> zoom +2000, 4 -> -2000.
const SHOTS = [
  { file: 'rework-after-c1-front.png', x: -52, z: -31, yaw: 0.3, pitch: 0.05, distM: 10,
    note: 'C1 chinh dien tu quang truong nhin bac: mat tien + mai 9 vom + thap hoa gio + I LOVE BK' },
  { file: 'rework-after-c1-oblique.png', x: -38, z: -26, yaw: 0.785, pitch: 0.05, distM: 10,
    note: 'C1 xien 45 do tu dong-nam: mat tien + mai vom + khoi nha 4 tang' },
  { file: 'rework-after-parabol-front.png', x: -62, z: 10, yaw: 1.571, pitch: 0.05, distM: 10,
    note: 'Cong Parabol chinh dien tu dong nhin tay: dai bang phang + huy hieu + go chia khoang' },
  { file: 'rework-after-parabol-oblique.png', x: -70, z: 26, yaw: 0.85, pitch: 0.05, distM: 10,
    note: 'Cong Parabol xien 45 do tu dong-bac: dai bang + chan chon dat + nha gac' },
  { file: 'rework-after-parabol-under.png', x: -76, z: 10, yaw: 1.571, pitch: -0.1, distM: 10,
    note: 'Dung tai spawn ngay trong cong Parabol, camera thap 10 m nhin chech len ve vom: dai bang + do day + gom be mat trong' },
  { file: 'rework-after-library-front.png', x: -28, z: 32, yaw: -1.571, pitch: 0.05, distM: 10,
    note: 'Thu vien chinh dien mat tay, dung bo tay ho nhin dong qua mat ho: khoi 10 tang + dong ho + lam/dai kinh' },
  { file: 'rework-after-library-oblique.png', x: 0, z: -10, yaw: -2.356, pitch: 0.05, distM: 10,
    note: 'Thu vien xien tu bac ho nhin dong-nam: khoi 10 tang + mat tay (dong ho, dai kinh/lam) + Ho Tien phia truoc' },
  { file: 'rework-after-c9-front.png', x: -16, z: -4.2, yaw: 1.571, pitch: 0.05, distM: 10,
    note: 'C9 chinh dien mat dong tu xa: thang zic-zac 4 ve + lan can do' },
  { file: 'rework-after-c9-oblique.png', x: -24.7, z: 6, yaw: 0.71, pitch: 0.08, distM: 10,
    note: 'C9 cheo tu dong-bac: chieu sau zic-zac, cac ve thang + chieu nghi + lan can do' },
  { file: 'rework-after-lake-eye.png', x: 24, z: 48, yaw: 1.571, pitch: 0.12, distM: 10,
    note: 'Ho Tien tam mat tu bo dong nhin tay: tham la/beo + hoa + bo ke xa' },
  { file: 'rework-after-lake-top.png', x: 0, z: 86, yaw: 0, pitch: 0.5, distM: 10,
    note: 'Ho Tien nhin chech xuong doc truc bac-nam tu dau nam ho: toan mat ho 45x88 m + do phu la/beo' },
  { file: 'rework-after-avatar-back.png', x: -58, z: -30, yaw: 0, pitch: 0.35, distM: 4,
    note: 'Nhan vat can canh tu sau (camera 4 m): hoodie do Bach khoa + ba lo den' },
];

(async () => {
  const browser = await chromium.launch({
    executablePath: EXE,
    args: [
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--disable-gpu-sandbox',
      '--no-sandbox',
    ],
  });
  const log = {
    meta: {
      purpose: 'Hien trang SAU KHI SUA — dot sua kien truc ngoai that (brief §10 buoc 8)',
      source: 'out/ moi sau tich hop (build 05/11 toi)',
      date: new Date().toISOString(),
      viewportDesktop: '1280x800',
      viewportMobile: '390x844',
      beforeRef: 'test-shots/rework-before.json (cung goc avatar/yaw/pitch/distM)',
    },
    consoleErrors: [],
    pageErrors: [],
    shots: [],
    checks: {},
  };
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('console', (m) => {
      if (m.type() === 'error') log.consoleErrors.push(m.text());
    });
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
      await page.evaluate(
        ([xx, zz, yy, pp]) => window.__bkhn.teleport(xx, zz, yy, pp),
        [s.x, s.z, s.yaw, s.pitch],
      );
      if (dist !== s.distM) await zoom(s.distM === 10 ? 2000 : -2000);
      await sleep(1500);
      await page.screenshot({ path: path.join(OUT, s.file), timeout: 120000 });
      const avatar = await page.evaluate(() => window.__bkhn.getPos());
      log.shots.push({
        file: s.file,
        avatar: { x: +avatar.x.toFixed(2), z: +avatar.z.toFixed(2) },
        camera: camPos(avatar, s.yaw, s.pitch),
        yaw: s.yaw,
        pitch: s.pitch,
        distM: dist,
        description: s.note,
      });
      console.log('shot', s.file);
    };

    for (const s of SHOTS) await shot(s);

    // Nhan vat chinh dien: di lui (S) de avatar quay mat ve camera roi chup
    // (giong ban truoc: tu avatar-back, giu S 2,5 s).
    await page.keyboard.down('KeyS');
    await sleep(2500);
    await page.keyboard.up('KeyS');
    await sleep(800);
    await page.screenshot({ path: path.join(OUT, 'rework-after-avatar-front.png'), timeout: 120000 });
    {
      const avatar = await page.evaluate(() => window.__bkhn.getPos());
      const yaw = await page.evaluate(() => window.__bkhn.getYaw());
      const pitch = await page.evaluate(() => window.__bkhn.getPitch());
      log.shots.push({
        file: 'rework-after-avatar-front.png',
        avatar: { x: +avatar.x.toFixed(2), z: +avatar.z.toFixed(2) },
        camera: camPos(avatar, yaw, pitch),
        yaw: +yaw.toFixed(3),
        pitch: +pitch.toFixed(3),
        distM: dist,
        description: 'Nhan vat chinh dien sau khi di lui ve phia camera: mat + logo ao + ba lo (dang truoc nguoi)',
      });
      console.log('shot rework-after-avatar-front.png');
    }

    // Do phu ho that trong scene moi (rasterization trong LotusField).
    log.checks.lakeCoverage = await page.evaluate(() => window.__bkhn.lakeCoverage());
    console.log('lakeCoverage =', log.checks.lakeCoverage);

    // Top-view toan campus.
    await page.evaluate(() => window.__bkhn.topView());
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT, 'rework-after-campus-topview.png'), timeout: 120000 });
    log.shots.push({
      file: 'rework-after-campus-topview.png',
      avatar: null,
      camera: { x: 0, y: 160, z: 5.01 },
      yaw: null,
      pitch: null,
      distM: null,
      description: 'Top-view toan campus (camera co dinh 0,160,5 nhin xuong 0,0,5): C1, cong Parabol, C9, Ho Tien chu nhat, thu vien',
    });
    await page.evaluate(() => window.__bkhn.followView());
    console.log('shot rework-after-campus-topview.png');

    // Mobile 390x844 trong game (dong tab desktop truoc de nhuong SwiftShader).
    await page.close();
    const mob = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2,
    });
    mob.on('console', (m) => {
      if (m.type() === 'error') log.consoleErrors.push('mobile: ' + m.text());
    });
    mob.on('pageerror', (e) => log.pageErrors.push('mobile: ' + String(e)));
    await mob.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await mob.waitForSelector('#enter-campus', { timeout: 30000 });
    await mob.click('#enter-campus');
    await mob.waitForFunction(() => window.__bkhn, { timeout: 90000 });
    await sleep(5000);
    await mob.screenshot({ path: path.join(OUT, 'rework-after-mobile.png'), timeout: 120000 });
    {
      const avatar = await mob.evaluate(() => window.__bkhn.getPos());
      log.shots.push({
        file: 'rework-after-mobile.png',
        avatar: { x: +avatar.x.toFixed(2), z: +avatar.z.toFixed(2) },
        camera: null,
        yaw: null,
        pitch: null,
        distM: null,
        description: 'Mobile 390x844 trong game tai diem spawn (cong Parabol): giao dien mobile + joystick + khung canh spawn',
      });
      console.log('shot rework-after-mobile.png');
    }
    log.checks.mobileOverflow = await mob.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
    }));
  } catch (e) {
    log.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', log.fatal);
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(OUT, 'rework-after.json'), JSON.stringify(log, null, 2));
  console.log('shots:', log.shots.length, '| consoleErrors:', log.consoleErrors.length, '| pageErrors:', log.pageErrors.length);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
