// Browser self-test + ảnh đối chiếu — SỬA 4 LỖI Bước 3 (theo skill
// web_3d_scene_test_and_scale_audit; mẫu test/shots-step3.cjs).
// Phục vụ out/ qua HTTP 127.0.0.1:8321, Playwright chromium headless shell +
// SwiftShader. Kiểm tra:
//   Lỗi 1 — độ phủ lá/bèo Hồ Tiền: đọc window.__bkhn.lakeCoverage() (đo thật
//     bằng rasterization trong LotusField) + ảnh top-view + ảnh ngang mặt hồ.
//   Lỗi 2 — chữ "I" trong "I LOVE BK": ảnh C1 chính diện (avatar lệch trục
//     để khỏi che chữ) + ảnh cận cảnh logo.
//   Lỗi 3 — kính C1/thư viện: ảnh C1 chính diện + thư viện chính diện mặt tây.
//   Lỗi 4 — nút "?" mobile: đo bounding box "?" vs joystick (không giao
//     nhau); top-view: hộp "Cách di chuyển" phải tự ẩn, nút "?" vẫn có.
// Chạy: node test/shots-step3fix.cjs  (cần server ở 127.0.0.1:8321)
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8321/';
const OUT = path.join(__dirname, '..', 'test-shots');
fs.mkdirSync(OUT, { recursive: true });

const EXE =
  '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const NODE_MODS = '/home/hatch/workspace/mobile-test/node_modules';

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
  const report = { webgl: null, consoleErrors: [], pageErrors: [], checks: {}, shots: {} };
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
    await page.click('#enter-campus');
    await page.waitForFunction(() => window.__bkhn, { timeout: 30000 });
    await sleep(4000);
    report.checks.canvas = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      return { canvasFound: !!c, w: c?.width, h: c?.height };
    });

    // Lỗi 1 — độ phủ lá/bèo đo thật trong scene (rasterization 0,25 m).
    report.checks.lakeCoverage = await page.evaluate(() => window.__bkhn.lakeCoverage());
    console.log('lakeCoverage =', report.checks.lakeCoverage);

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
      console.log('shot', name, note);
    };

    // Lỗi 1 — top-view: hồ phải đọc là thảm hồng-xanh; hộp hướng dẫn phải tự ẩn.
    // Chờ bằng polling (SwiftShader chỉ ~1–2 fps nên sleep cố định 900 ms
    // không đủ cho một frame rAF + poll 200 ms của HUD).
    await page.evaluate(() => window.__bkhn.topView());
    await page.waitForFunction(
      () => {
        const panel = Array.from(document.querySelectorAll('div')).find((d) =>
          d.textContent?.includes('Cách di chuyển'),
        );
        return !panel && !!document.querySelector('[aria-label="Mở hướng dẫn"]');
      },
      { timeout: 15000 },
    );
    report.checks.topViewHelpHidden = { helpPanelGone: true, reopenBtnPresent: true };
    await page.screenshot({ path: path.join(OUT, 'step3fix-lake-topview.png') });
    report.shots['step3fix-lake-topview.png'] = {
      note: 'top-view: hồ phủ lá + hộp hướng dẫn phải đã tự ẩn',
    };
    await page.evaluate(() => window.__bkhn.followView());
    await sleep(600);
    console.log('shot step3fix-lake-topview.png');

    // Lỗi 1 — ngang mặt hồ từ bờ đông nhìn tây (lá + hoa ở tầm mắt).
    await shot('step3fix-lake-eye.png', 24, 48, Math.PI / 2, 0.12, 0,
      'nhìn tây qua Hồ Tiền ở tầm mắt: thảm lá xanh + hoa hồng');

    // Lỗi 2 + 3 — C1 chính diện: avatar lệch trục (x=-52) để khỏi che chữ "I".
    await shot('step3fix-c1-front.png', -52, -31, 0.3, 0.05, 1200,
      'nhìn bắc về C1: tường trắng + kính xám-xanh + I LOVE BK (avatar lệch trục)');

    // Lỗi 2 — cận cảnh logo (camera 4 m, avatar lệch trái logo).
    await shot('step3fix-ilovebk-close.png', -56, -36, 0.25, 0.1, -1500,
      'cận cảnh I LOVE BK: chữ I có chân + viền tối, tim đỏ, BK trắng');

    // Lỗi 3 — thư viện chính diện mặt tây, đứng bờ tây hồ nhìn đông qua mặt
    // hồ (thấy đủ khối 10 tầng + đồng hồ + mặt tây; góc cũ đứng sát mặt
    // tiền nên khung chỉ toàn một dải kính).
    await shot('step3fix-library-front.png', -28, 32, -Math.PI / 2, 0.05, 1500,
      'nhìn đông qua Hồ Tiền về mặt tây thư viện: tường trắng + dải kính xám-xanh + đồng hồ');

    // Lỗi 4 — mobile 390×844: nút "?" không được giao với joystick.
    // Đóng tab desktop trước để nhường SwiftShader cho tab mobile (hai
    // WebGL context cùng chạy khiến tab mobile khởi tạo quá 30 s ở vòng trước).
    await page.close();
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
    await mob.click('#enter-campus');
    await mob.waitForFunction(() => window.__bkhn, { timeout: 90000 });
    await sleep(4000);
    report.checks.mobileHelpOverlap = await mob.evaluate(() => {
      const q = document.querySelector('[aria-label="Mở hướng dẫn"]');
      const j = document.querySelector('[aria-label="Cần điều khiển di chuyển"]');
      if (!q || !j) return { helpBtnFound: !!q, joystickFound: !!j };
      const a = q.getBoundingClientRect();
      const b = j.getBoundingClientRect();
      const overlap =
        a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      return {
        helpBtn: { x: a.x, y: a.y, w: a.width, h: a.height },
        joystick: { x: b.x, y: b.y, w: b.width, h: b.height },
        overlap,
      };
    });
    await mob.screenshot({
      path: path.join(OUT, 'step3fix-mobile.png'),
      // SwiftShader render ~1 fps với scene nặng (6.100 instance lá/bèo):
      // screenshot mặc định timeout 30 s không đủ một frame ổn định.
      timeout: 120000,
    });
    report.shots['step3fix-mobile.png'] = {
      note: 'mobile 390×844: nút "?" ở góc dưới-phải, không chồng joystick',
    };
    // Nút "?" mở lại được hộp hướng dẫn, nút ✕ đóng lại được.
    await mob.click('[aria-label="Mở hướng dẫn"]');
    await sleep(500);
    report.checks.mobileHelpReopen = await mob.evaluate(() => {
      const panel = Array.from(document.querySelectorAll('div')).find((d) =>
        d.textContent?.includes('Cách di chuyển'),
      );
      return { panelShownAfterTap: !!panel };
    });
    report.checks.mobileOverflow = await mob.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
    }));
    console.log('shot step3fix-mobile.png');
  } catch (e) {
    report.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', report.fatal);
  } finally {
    await browser.close();
  }
  fs.writeFileSync(
    path.join(OUT, 'browser-test-step3fix.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
