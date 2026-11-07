// Re-shoot — Bước 2, vòng 2 (sau khi sửa marker C1, bán kính zone, pitch mặc định).
// Điểm chụp đã tính để toàn bộ silhouette lọt khung (đứng đủ xa + pitch thấp).
// Kèm đo FPS thực tế trong SwiftShader để giải thích tốc độ di chuyển theo
// đồng hồ treo tường (skill: không đánh giá render phần mềm bằng wall-clock).
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
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
  });
  const report = { consoleErrors: [], pageErrors: [], fps: null, views: {} };
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => report.pageErrors.push(String(e)));
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#enter-campus', { timeout: 30000 });
    await page.click('#enter-campus');
    await page.waitForFunction(() => window.__bkhn, { timeout: 30000 });
    await sleep(4000);

    // Đo FPS: đếm requestAnimationFrame trong 3 s.
    report.fps = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let n = 0;
          const start = performance.now();
          const tick = () => {
            n += 1;
            if (performance.now() - start < 3000) requestAnimationFrame(tick);
            else resolve(+(n / 3).toFixed(1));
          };
          requestAnimationFrame(tick);
        }),
    );
    // Tốc độ di chuyển hiệu dụng theo FPS đo được: delta clamp 0,05 s/frame.
    report.effectiveWalkSpeed = +(Math.min(report.fps * 0.05, 1) * 4).toFixed(2);

    await page.screenshot({ path: path.join(OUT, '02b-spawn-eye-level.png') });

    const views = [
      { name: '05b-c1-plaza', x: -58, z: -10, yaw: 0, pitch: 0.12, note: 'C1 từ 35 m, thấy đủ mái 9 sóng' },
      { name: '06b-library', x: -6, z: 32, yaw: -Math.PI / 2, pitch: 0.12, note: 'Thư viện từ 52 m, thấy đồng hồ y=20' },
      { name: '07b-lake', x: 40, z: 48, yaw: Math.PI / 2, pitch: 0.18, note: 'Hồ Tiền từ bờ đông' },
      { name: '08b-parabol', x: -48, z: 10, yaw: Math.PI / 2, pitch: 0.12, note: 'Parabol từ 40 m, thấy đủ đỉnh vòm 12,5 m' },
      { name: '09b-c9', x: -42, z: 36, yaw: 0, pitch: 0.12, note: 'C9 từ 32 m, nhìn bắc (yaw 0, vòng trước sai yaw)' },
    ];
    for (const v of views) {
      await page.evaluate(([x, z, yaw, pitch]) => window.__bkhn.teleport(x, z, yaw, pitch), [v.x, v.z, v.yaw, v.pitch]);
      await sleep(1500);
      await page.screenshot({ path: path.join(OUT, `${v.name}.png`) });
      const zone = await page.evaluate(() => document.querySelector('header, div')?.textContent?.slice(0, 80));
      const zoneLabel = await page.evaluate(() => {
        const els = [...document.querySelectorAll('div')].map((e) => e.textContent).filter((t) => t && t.length < 40);
        return els.find((t) => /Cổng|Quảng trường|Thư viện|Hồ Tiền|Nhà C9|Sân trường|Đường tình/.test(t)) || null;
      });
      report.views[v.name] = { note: v.note, zoneLabel };
    }
  } catch (e) {
    report.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', report.fatal);
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(OUT, 'reshoot-test.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
