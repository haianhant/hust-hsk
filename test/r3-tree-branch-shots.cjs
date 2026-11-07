// r3-tree-branch-shots.cjs — Đợt 3 tích hợp: ảnh cận ImprovedTree SAU khi sửa
// nhánh ngắm thẳng (1 nhánh/cụm tán, gốc trong thân, ngọn trong tán).
// Chụp cây đường tình yêu (28,-19.5) và (28,-12.5) từ phía đông, đứng lệch
// trục (x≈31–32) để cây đôi không che khung (bài học từ r3-tree-shots §6.2).
// Camera: teleport(x, z, yaw, pitch) + lăn chuột thu về 4 m; yaw=π/2 → nhìn tây.
// Chạy: node test/r3-tree-branch-shots.cjs (server riêng 127.0.0.1:8342).
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8342/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const report = { tool: 'r3-tree-branch-shots', at: new Date().toISOString(), shots: [], consoleErrors: [], pageErrors: [] };

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', '8342', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
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

async function pose(page, x, z, yaw, pitch) {
  await page.evaluate(([px, pz, y, p]) => window.__bkhn.teleport(px, pz, y, p), [x, z, yaw, pitch]);
  await sleep(1200);
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, -400);
    await sleep(250);
  }
  await sleep(2500);
}

async function shot(page, name, note) {
  await page.screenshot({ path: path.join(OUT, name), timeout: 180000 });
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

    // Cận cây (28,-19.5) từ phía đông, nhìn tây — thấy thân + nhánh + tán.
    await pose(page, 32, -19.5, Math.PI / 2, 0.22);
    await shot(page, 'r3-branch-after-love-south.png', 'Cận ImprovedTree (28,-19.5) từ đông nhìn tây');
    // Cận cây (28,-12.5) từ phía đông-nam, nhìn tây-bắc.
    await pose(page, 31.5, -9.5, 0.85, 0.22);
    await shot(page, 'r3-branch-after-love-north.png', 'Cận ImprovedTree (28,-12.5) từ đông-nam nhìn tây-bắc');
    // Góc trung: cả hàng cây đường tình yêu từ phía đông.
    await pose(page, 34, -16, Math.PI / 2, 0.12);
    await shot(page, 'r3-branch-after-love-mid.png', 'Hàng cây đường tình yêu từ đông nhìn tây');
    console.log(`console errors: ${report.consoleErrors.length}; page errors: ${report.pageErrors.length}`);
  } finally {
    fs.writeFileSync(path.join(OUT, 'r3-tree-branch-shots.json'), JSON.stringify(report, null, 2));
    if (browser) await browser.close();
    if (server) server.kill();
  }
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
