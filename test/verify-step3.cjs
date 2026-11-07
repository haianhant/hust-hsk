// Xác minh cuối vòng kiểm tra Bước 3:
// - v1: logo BK đã dời lên túi kangaroo — cận cảnh chính diện, zoom 4 m.
// - v2: chữ "I" trong "I LOVE BK" — đứng sát logo (6,7 m), zoom 4 m, để chữ I
//   (0,8 m) phải hiện rõ nếu có render; nền sau là kính tối tầng trệt C1.
// Chạy: node test/verify-step3.cjs  (cần server ở 127.0.0.1:8321)
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
  const report = { consoleErrors: [], pageErrors: [], shots: {} };
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('console', (m) => {
      if (m.type() === 'error') report.consoleErrors.push(m.text());
    });
    page.on('pageerror', (e) => report.pageErrors.push(String(e)));
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#enter-campus', { timeout: 30000 });
    await page.click('#enter-campus');
    await page.waitForFunction(() => window.__bkhn, { timeout: 30000 });
    await sleep(4000);

    const zoom = async (dy) => {
      await page.mouse.move(640, 400);
      await page.mouse.wheel(0, dy);
      await sleep(600);
    };

    // v1: logo BK trên túi kangaroo, chính diện, zoom 4 m.
    await page.evaluate(() => window.__bkhn.teleport(-58, -30, 0, 0.2));
    await zoom(-1500);
    await page.keyboard.down('KeyS');
    await sleep(2500);
    await page.keyboard.up('KeyS');
    await sleep(800);
    await page.screenshot({ path: path.join(OUT, 'step3-v1-avatar-logo-fixed.png') });
    report.shots['step3-v1-avatar-logo-fixed.png'] = {
      note: 'logo BK sau khi dời lên túi kangaroo (zoom 4 m, chính diện)',
      avatarAt: await page.evaluate(() => window.__bkhn.getPos()),
    };
    console.log('shot step3-v1-avatar-logo-fixed.png');

    // v2: chữ "I" — đứng sát logo, nhìn tây-bắc.
    await page.evaluate(() => window.__bkhn.teleport(-54, -38, 0.927, 0.08));
    await zoom(-1500);
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT, 'step3-v2-letter-i.png') });
    report.shots['step3-v2-letter-i.png'] = {
      note: 'chữ I trong I LOVE BK, đứng sát 6,7 m, zoom 4 m',
      avatarAt: await page.evaluate(() => window.__bkhn.getPos()),
    };
    console.log('shot step3-v2-letter-i.png');
  } catch (e) {
    report.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', report.fatal);
  } finally {
    await browser.close();
  }
  fs.writeFileSync(
    path.join(OUT, 'browser-test-step3-verify.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
