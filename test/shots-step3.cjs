// Browser self-test + ảnh đối chiếu — Bước 3 (theo skill
// web_3d_scene_test_and_scale_audit; mẫu test/shots.cjs Bước 2).
// Phục vụ out/ qua HTTP 127.0.0.1:8321, Playwright chromium headless shell +
// SwiftShader. Kiểm tra: WebGL2, lỗi console/page, di chuyển phím W, nút Về
// vị trí an toàn, phím E → toast, joystick mobile 390×844, FPS SwiftShader
// (chỉ để ghi nhận giới hạn render phần mềm), và chụp ảnh đối chiếu
// reference-visual.md ở cùng góc tham chiếu.
// Chạy: node test/shots-step3.cjs  (cần server ở 127.0.0.1:8321)
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
    const canvasInfo = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      return { canvasFound: !!c, w: c?.width, h: c?.height };
    });
    report.checks.canvas = canvasInfo;
    report.checks.hook = await page.evaluate(() => !!window.__bkhn);

    // FPS SwiftShader: đếm rAF trong 5 s (chỉ ghi nhận giới hạn render mềm).
    report.checks.fpsSwiftShader = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let n = 0;
          const t0 = performance.now();
          const tick = () => {
            n += 1;
            if (performance.now() - t0 < 5000) requestAnimationFrame(tick);
            else resolve(+(n / 5).toFixed(2));
          };
          requestAnimationFrame(tick);
        }),
    );

    // Di chuyển thật bằng phím W trong 2 s → vị trí phải đổi theo +X.
    const p0 = await page.evaluate(() => window.__bkhn.getPos());
    await page.keyboard.down('KeyW');
    await sleep(2000);
    await page.keyboard.up('KeyW');
    await sleep(500);
    const p1 = await page.evaluate(() => window.__bkhn.getPos());
    const movedM = Math.hypot(p1.x - p0.x, p1.z - p0.z);
    report.checks.keyboardMove = { from: p0, to: p1, movedM: +movedM.toFixed(2) };

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

    // Zoom: lăn chuột trên canvas (Player clamp dist 4..10 m).
    // deltaY dương = xa ra (10 m), âm = lại gần (4 m).
    const zoom = async (dy) => {
      await page.mouse.move(640, 400);
      await page.mouse.wheel(0, dy);
      await sleep(600);
    };

    // Chụp từng view: teleport(x, z, yaw, pitch) rồi chờ render.
    // Quy ước yaw: hướng nhìn = (-sin yaw, -cos yaw).
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

    // (a) Cổng Parabol chính diện — đứng đông cổng nhìn tây.
    await shot('step3-a-parabol-front.png', -62, 10, Math.PI / 2, 0.05, 1500,
      'nhìn tây về cổng Parabol (dải băng + huy hiệu), từ 26 m');
    // (b) C1 chính diện — quảng trường nhìn bắc: I LOVE BK + bậc + 9 sóng + tháp hoa gió.
    await shot('step3-b-c1-front.png', -58, -30, 0, 0.05, 1500,
      'nhìn bắc về C1: I LOVE BK, bậc tam cấp, 9 sóng mái, tháp hoa gió, 2 Lipa');
    // (c1) Thư viện — mặt tây + đồng hồ y=9,6, đứng trên đường ven hồ nhìn bắc-chếch.
    await shot('step3-c-library-clock.png', 24, 50, -0.105, 0.05, 1500,
      'nhìn bắc về mặt tây thư viện: đồng hồ trên mái hiên, sân gạch đỏ-nâu');
    // (c2) Thư viện toàn cảnh từ bắc hồ (thấy khối 10 tầng + hồ phía trước).
    await shot('step3-c2-library-wide.png', 0, -10, -Math.PI * 0.75, 0.05, 1500,
      'nhìn đông-nam từ bắc hồ: thư viện 10 tầng + Hồ Tiền phía trước');
    // (d1) Hồ Tiền ngang — từ bờ đông nhìn tây qua mặt hồ phủ lá súng.
    await shot('step3-d-lake-east.png', 24, 48, Math.PI / 2, 0.12, 0,
      'nhìn tây qua Hồ Tiền: lá súng + hoa hồng + bờ kè xa');
    // (d2) Hồ Tiền dọc — từ đầu bắc nhìn nam dọc 88 m.
    await shot('step3-d2-lake-north.png', 0, -10, Math.PI, 0.1, 0,
      'nhìn nam dọc Hồ Tiền chữ nhật 88 m');
    // (e1) C9 thang zic-zac — chính diện mặt đông từ xa (thấy đủ 5 đợt).
    await shot('step3-e-c9-stairs.png', -16, -2, Math.PI / 2, 0.05, 1500,
      'nhìn tây về thang zic-zac mặt đông C9 (5 đợt, lan can đỏ)');
    // (e2) C9 thang chéo — thấy chiều sâu zic-zac.
    await shot('step3-e2-c9-stairs-oblique.png', -22, 6, 0.71, 0.08, 0,
      'nhìn tây-bắc chéo về thang C9');
    // (f1) Avatar cận cảnh từ phía sau — ba lô đen + hoodie đỏ.
    await shot('step3-f-avatar-back.png', -58, -30, 0, 0.35, -1500,
      'cận cảnh avatar từ sau (zoom 4 m, pitch 0,35): ba lô đen + hoodie đỏ');
    // (f2) Avatar chính diện — đi lùi (S) để quay mặt về camera rồi chụp.
    await page.keyboard.down('KeyS');
    await sleep(2500);
    await page.keyboard.up('KeyS');
    await sleep(800);
    await page.screenshot({ path: path.join(OUT, 'step3-f2-avatar-front.png') });
    report.shots['step3-f2-avatar-front.png'] = {
      note: 'avatar chính diện sau khi đi lùi về phía camera',
      avatarAt: await page.evaluate(() => window.__bkhn.getPos()),
    };
    console.log('shot step3-f2-avatar-front.png');
    // (h) Khối đá trắng — từ nam nhìn bắc, C1 phía sau.
    await shot('step3-h-white-rock.png', -78, -24, 0, 0.08, 0,
      'nhìn bắc về khối đá trắng + chữ đen 2 dòng, tháp C1 phía sau');
    // (i) Quảng trường Trần Đại Nghĩa — biển đồng + bia + sân xanh ngọc.
    await shot('step3-i-tdn-square.png', 68, -14, -Math.PI / 2, 0.08, 1500,
      'nhìn đông về quảng trường TDN: biển đồng, bia tượng đài, sân xanh ngọc');
    // (g) Top-view mặt bằng mới.
    await page.evaluate(() => window.__bkhn.topView());
    await sleep(1000);
    await page.screenshot({ path: path.join(OUT, 'step3-g-topview.png') });
    report.shots['step3-g-topview.png'] = { note: 'mặt bằng từ trên cao (hồ chữ nhật, thư viện đông hồ)' };
    await page.evaluate(() => window.__bkhn.followView());
    console.log('shot step3-g-topview.png');

    // Mobile 390×844.
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
    await mob.screenshot({ path: path.join(OUT, 'step3-mobile.png') });
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
  fs.writeFileSync(
    path.join(OUT, 'browser-test-step3.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
