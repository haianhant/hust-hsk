// Browser self-test — Bước 2 (theo skill web_3d_scene_test_and_scale_audit).
// Phục vụ out/ qua HTTP, mở bằng Playwright (chromium headless shell +
// SwiftShader WebGL), kiểm tra: không lỗi console, vào trường được, di chuyển
// bằng phím thật, nút Về vị trí an toàn, và chụp ảnh: intro, tầm mắt spawn,
// từ trên cao, C1, thư viện, hồ, mobile.
// Chạy: node test/shots.cjs  (cần server ở 127.0.0.1:8321, xem test/serve.sh)
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8321/';
const OUT = path.join(__dirname, '..', 'test-shots');
fs.mkdirSync(OUT, { recursive: true });

const EXE =
  '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const report = { webgl: null, consoleErrors: [], pageErrors: [], checks: {} };
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('console', (m) => {
      if (m.type() === 'error') report.consoleErrors.push(m.text());
    });
    page.on('pageerror', (e) => report.pageErrors.push(String(e)));

    report.webgl = await page.evaluate(() => {
      const c = document.createElement('canvas');
      return { webgl2: !!c.getContext('webgl2'), webgl1: !!c.getContext('webgl') };
    });

    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#enter-campus', { timeout: 30000 });
    await page.screenshot({ path: path.join(OUT, '01-intro-desktop.png') });

    await page.click('#enter-campus');
    await page.waitForFunction(() => window.__bkhn, { timeout: 30000 });
    await sleep(4000); // chờ Canvas + frame đầu
    const canvasInfo = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      return { canvasFound: !!c, w: c?.width, h: c?.height };
    });
    report.checks.canvas = canvasInfo;
    report.checks.hook = await page.evaluate(() => !!window.__bkhn);
    await page.screenshot({ path: path.join(OUT, '02-spawn-eye-level.png') });

    // Di chuyển thật bằng phím W trong 2 s → vị trí phải đổi theo +X (yaw mặc định nhìn đông).
    const p0 = await page.evaluate(() => window.__bkhn.getPos());
    await page.keyboard.down('KeyW');
    await sleep(2000);
    await page.keyboard.up('KeyW');
    await sleep(500);
    const p1 = await page.evaluate(() => window.__bkhn.getPos());
    const movedM = Math.hypot(p1.x - p0.x, p1.z - p0.z);
    report.checks.keyboardMove = { from: p0, to: p1, movedM: +movedM.toFixed(2) };
    await page.screenshot({ path: path.join(OUT, '03-after-walk.png') });

    // Nút Về vị trí an toàn → về spawn (-76, 10).
    await page.click('#safe-position');
    await sleep(800);
    const p2 = await page.evaluate(() => window.__bkhn.getPos());
    report.checks.safePosition = {
      after: p2,
      backAtSpawn: Math.hypot(p2.x + 76, p2.z - 10) < 1,
    };

    // Phím E → toast placeholder.
    await page.keyboard.press('KeyE');
    await sleep(400);
    report.checks.eToast = await page.evaluate(() => {
      const el = document.querySelector('[role="status"]');
      return el ? el.textContent : null;
    });

    // Ảnh từ trên cao (mặt bằng).
    await page.evaluate(() => window.__bkhn.topView());
    await sleep(800);
    await page.screenshot({ path: path.join(OUT, '04-top-view.png') });
    await page.evaluate(() => window.__bkhn.followView());

    // Ảnh tầm mắt tại từng landmark (teleport + yaw nhìn về công trình).
    const views = [
      { name: '05-c1-plaza', x: -58, z: -36, yaw: 0, note: 'nhìn bắc về C1 (9 sóng mái)' },
      { name: '06-library', x: 40, z: 28, yaw: -Math.PI / 2, note: 'nhìn đông về thư viện + đồng hồ' },
      { name: '07-lake', x: 40, z: 48, yaw: Math.PI / 2, note: 'nhìn tây ra Hồ Tiền' },
      { name: '08-parabol', x: -70, z: 10, yaw: Math.PI / 2, note: 'nhìn tây về cổng Parabol' },
      { name: '09-c9', x: -42, z: 14, yaw: Math.PI, note: 'nhìn bắc về khối nhà C9' },
    ];
    for (const v of views) {
      await page.evaluate(([x, z, yaw]) => window.__bkhn.teleport(x, z, yaw), [v.x, v.z, v.yaw]);
      await sleep(1200);
      await page.screenshot({ path: path.join(OUT, `${v.name}.png`) });
      report.checks[v.name] = v.note;
    }

    // Mobile 390×844: intro + sau khi vào (joystick chỉ hiện trên cảm ứng).
    const mob = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2,
    });
    mob.on('console', (m) => {
      if (m.type() === 'error') report.consoleErrors.push('mobile: ' + m.text());
    });
    mob.on('pageerror', (e) => report.pageErrors.push('mobile: ' + String(e)));
    await mob.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await mob.waitForSelector('#enter-campus', { timeout: 30000 });
    await mob.screenshot({ path: path.join(OUT, '10-intro-mobile.png') });
    await mob.click('#enter-campus');
    await mob.waitForFunction(() => window.__bkhn, { timeout: 30000 });
    await sleep(4000);
    const joyVisible = await mob.evaluate(() => {
      const el = document.querySelector('[aria-label="Cần điều khiển di chuyển"]');
      if (!el) return { found: false };
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { found: true, display: cs.display, w: r.width, h: r.height };
    });
    report.checks.mobileJoystick = joyVisible;
    await mob.screenshot({ path: path.join(OUT, '11-in-game-mobile.png') });
    // Lỗi tràn ngang?
    report.checks.mobileOverflow = await mob.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
    }));
  } catch (e) {
    report.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', report.fatal);
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(OUT, 'browser-test.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
