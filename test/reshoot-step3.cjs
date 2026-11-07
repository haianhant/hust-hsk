// Chụp lại các góc chưa đạt ở vòng 1 Bước 3 (test/shots-step3.cjs):
// - b2: C1 toàn cảnh từ xa hơn (mái 9 sóng + cờ phải lọt khung)
// - b3: "I LOVE BK" chéo từ đông-nam (chữ I không bị avatar che, nền bậc đen)
// - c3: đồng hồ thư viện chính diện mặt tây, từ bờ tây hồ (nhìn đông)
// - e3: thang C9 chính diện từ đất khô phía bắc hồ
// - h2: khối đá trắng chéo (avatar lệch trục, không che chữ)
// - i2: biển TDN + bia cận cảnh, avatar lệch trục
// - f3: logo BK ngực trái cận cảnh (zoom 4 m, avatar quay mặt về camera)
// Chạy: node test/reshoot-step3.cjs  (cần server ở 127.0.0.1:8321)
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
    const shot = async (name, x, z, yaw, pitch, zoomDy, note) => {
      await page.evaluate(
        ([xx, zz, yy, pp]) => window.__bkhn.teleport(xx, zz, yy, pp),
        [x, z, yaw, pitch],
      );
      if (zoomDy) await zoom(zoomDy);
      await sleep(1500);
      await page.screenshot({ path: path.join(OUT, name) });
      const pos = await page.evaluate(() => window.__bkhn.getPos());
      report.shots[name] = { note, avatarAt: pos };
      console.log('shot', name, note, JSON.stringify(pos));
    };

    // b2: C1 toàn cảnh — đứng xa hơn về phía nam để mái + cờ lọt khung.
    await shot('step3-b2-c1-full.png', -58, -22, 0, 0.05, 1500,
      'C1 toàn cảnh từ 27 m: 9 sóng mái + cờ đỏ + tháp hoa gió');
    // b3: I LOVE BK chéo từ đông-nam, avatar lệch trục logo.
    await shot('step3-b3-ilovebk.png', -50, -34, 0.756, 0.08, 0,
      'I LOVE BK chéo: chữ I trắng + tim đỏ + BK trắng, nền bậc đen');
    // c3: đồng hồ thư viện chính diện mặt tây, từ bờ tây hồ nhìn đông.
    await shot('step3-c3-library-clock.png', -27, 32, -Math.PI / 2, 0.05, 1500,
      'đồng hồ thư viện chính diện từ bờ tây hồ (53 m)');
    // e3: thang C9 chính diện từ đất khô bắc hồ.
    await shot('step3-e3-c9-front.png', -14, -6, Math.PI / 2, 0.05, 1500,
      'thang C9 chính diện từ bắc hồ: 5 đợt + lan can đỏ');
    // h2: khối đá trắng chéo, avatar lệch trục chữ.
    await shot('step3-h2-rock.png', -74, -24, 0.52, 0.08, 0,
      'khối đá trắng chéo: chữ đen 2 dòng không bị che');
    // i2: biển TDN + bia cận cảnh, avatar lệch trục.
    await shot('step3-i2-tdn-sign.png', 71, -11, -Math.PI / 4, 0.1, -1500,
      'biển đồng TDN + bia tượng đài cận cảnh (zoom 4 m)');
    // f3: logo BK ngực trái cận cảnh — zoom 4 m rồi đi lùi để quay mặt về camera.
    await page.evaluate(() => window.__bkhn.teleport(-58, -30, 0, 0.2));
    await zoom(-1500);
    await page.keyboard.down('KeyS');
    await sleep(2500);
    await page.keyboard.up('KeyS');
    await sleep(800);
    await page.screenshot({ path: path.join(OUT, 'step3-f3-avatar-logo.png') });
    report.shots['step3-f3-avatar-logo.png'] = {
      note: 'logo BK ngực trái cận cảnh (zoom 4 m, chính diện)',
      avatarAt: await page.evaluate(() => window.__bkhn.getPos()),
    };
    console.log('shot step3-f3-avatar-logo.png');
  } catch (e) {
    report.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', report.fatal);
  } finally {
    await browser.close();
  }
  fs.writeFileSync(
    path.join(OUT, 'browser-test-step3-reshoot.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
