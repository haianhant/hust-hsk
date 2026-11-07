// r3-tree-shots.cjs — Giai đoạn 3 đợt 3: ảnh cận liễu ven hồ + cây thường
// (ImprovedTree) TRƯỚC/SAU sửa, cùng góc. Chạy:
//   node test/r3-tree-shots.cjs before   (server riêng 127.0.0.1:8338)
//   node test/r3-tree-shots.cjs after
// Camera: teleport(x, z, yaw, pitch) + lăn chuột thu camera về 4 m (min).
// Hướng nhìn = -(sin yaw, cos yaw): yaw=π/2 → nhìn về -X (tây),
// yaw=-π/2 → nhìn về +X (đông), yaw=0 → nhìn về -Z (bắc).
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const MODE = process.argv[2] === 'after' ? 'after' : 'before';
const BASE = 'http://127.0.0.1:8338/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const report = { tool: 'r3-tree-shots', mode: MODE, at: new Date().toISOString(), shots: [], consoleErrors: [], pageErrors: [] };

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', '8338', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
    proc.on('error', reject);
    const t0 = Date.now();
    const tick = () => {
      fetch(BASE, { method: 'HEAD' }).then(() => resolve(proc)).catch(() => {
        if (Date.now() - t0 > 15000) reject(new Error('server không lên sau 15 s'));
        else setTimeout(tick, 300);
      });
    };
    tick();
  });
}

// Đứng cách cây ~3 m, mặt hướng về cây, pitch 0.22 (hơi chúc xuống để thấy
// cả thân + tán + cành rủ), zoom camera về tối thiểu 4 m.
async function pose(page, x, z, yaw, pitch) {
  await page.evaluate(([px, pz, y, p]) => window.__bkhn.teleport(px, pz, y, p), [x, z, yaw, pitch]);
  await sleep(1200);
  // Lăn chuột thu camera 7 m → 4 m (min). Mỗi lần lăn -240 ≈ ×e^-0.24.
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, -400);
    await sleep(250);
  }
  await sleep(2500); // chờ SwiftShader render xong khung hình
}

async function shot(page, name, note) {
  await page.screenshot({ path: path.join(OUT, name), timeout: 120000 });
  report.shots.push({ name, note });
  console.log('shot', name);
}

(async () => {
  let server = null;
  let browser = null;
  try {
    server = await startServer();
    console.log('server lên ở', BASE);
    browser = await chromium.launch({
      executablePath: EXE,
      args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
    });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => report.pageErrors.push(String(e)));
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#enter-campus', { timeout: 30000 });
    await page.click('#enter-campus');
    await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
    await sleep(3000);

    // 1. Cận liễu bờ đông (22.2, 10): đứng đông-nam của cây, nhìn về tây-bắc
    // (lệch sang bên để thân không che giữa khung như lần chụp đầu).
    await pose(page, 25.0, 12.5, 0.85, 0.22);
    await shot(page, `r3-tree-${MODE}-willow-east-close.png`, 'Cận liễu bờ đông (22.2,10), đứng (25.0,12.5) nhìn tây-bắc');

    // 2. Cận liễu bờ tây (-27.5, 50): đứng tây của cây, nhìn về đông.
    await pose(page, -30.9, 50, -Math.PI / 2, 0.22);
    await shot(page, `r3-tree-${MODE}-willow-west-close.png`, 'Cận liễu bờ tây (-27.5,50), đứng (-30.9,50) nhìn đông');

    // 3. Cận cây thường ImprovedTree đường tình yêu (28, -19.5): đứng nam
    // cách 5,3 m, nhìn bắc (lần chụp đầu đứng quá sát nên thân che hết khung).
    await pose(page, 28, -14.2, 0, 0.22);
    await shot(page, `r3-tree-${MODE}-love-close.png`, 'Cận ImprovedTree (28,-19.5), đứng (28,-14.2) nhìn bắc');

    // 4. Góc trung: liễu bờ đông trong bối cảnh hồ (đứng xa hơn, nhìn tây-bắc).
    await pose(page, 30, 16, Math.PI / 2 + 0.35, 0.18);
    await shot(page, `r3-tree-${MODE}-willow-east-mid.png`, 'Góc trung: liễu bờ đông + mặt hồ, đứng (30,16)');

    // 5. Góc trung: liễu bờ tây trong bối cảnh (đứng tây-nam, nhìn đông-bắc).
    await pose(page, -32, 56, -Math.PI / 2 - 0.3, 0.18);
    await shot(page, `r3-tree-${MODE}-willow-west-mid.png`, 'Góc trung: liễu bờ tây + mặt hồ, đứng (-32,56)');

    await ctx.close();
  } catch (e) {
    report.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', report.fatal);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
  fs.writeFileSync(path.join(OUT, `r3-tree-shots-${MODE}.json`), JSON.stringify(report, null, 2));
  console.log('SUMMARY', JSON.stringify({ shots: report.shots.length, consoleErrors: report.consoleErrors.length, pageErrors: report.pageErrors.length }));
  console.log('consoleErrors:', JSON.stringify(report.consoleErrors));
  console.log('pageErrors:', JSON.stringify(report.pageErrors));
  process.exit(report.fatal || report.consoleErrors.length || report.pageErrors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
