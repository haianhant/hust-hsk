// Final re-shoot — 2 góc còn lại sau khi sửa zone Hồ Tiền (ellipse) + teleport
// có resolveCollisions: thư viện nhìn từ tây-bắc trên cạn, C9 nhìn từ 34 m.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8321/';
const OUT = path.join(__dirname, '..', 'test-shots');
const EXE =
  '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({
    executablePath: EXE,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
  });
  const report = { consoleErrors: [], pageErrors: [], views: {} };
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => report.pageErrors.push(String(e)));
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#enter-campus', { timeout: 30000 });
    await page.click('#enter-campus');
    await page.waitForFunction(() => window.__bkhn, { timeout: 30000 });
    await sleep(4000);
    const views = [
      // Thư viện từ (-1, 10) — trên cạn, tây-bắc, cách đồng hồ ~52 m, nhìn đông-nam (yaw ≈ -2,01).
      { name: '06c-library', x: -1, z: 10, yaw: -2.01, pitch: 0.12 },
      // C9 từ (-42, 34) — 30 m, nhìn bắc, pitch thấp để thấy nóc.
      { name: '09c-c9', x: -42, z: 34, yaw: 0, pitch: 0.08 },
    ];
    for (const v of views) {
      await page.evaluate(([x, z, yaw, pitch]) => window.__bkhn.teleport(x, z, yaw, pitch), [v.x, v.z, v.yaw, v.pitch]);
      await sleep(1500);
      await page.screenshot({ path: path.join(OUT, `${v.name}.png`) });
      report.views[v.name] = await page.evaluate(() => window.__bkhn.getPos());
    }
    // Kiểm tra teleport vào trong hồ bị đẩy ra ngoài (hook resolveCollisions).
    const lakeTeleport = await page.evaluate(() => {
      window.__bkhn.teleport(-2, 52, 0, 0.12);
      return window.__bkhn.getPos();
    });
    await sleep(500);
    report.lakeTeleportPushOut = lakeTeleport;
  } catch (e) {
    report.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', report.fatal);
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(OUT, 'final-reshoot.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
