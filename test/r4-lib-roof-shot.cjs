// Chụp 1 góc duy nhất: nhìn lên mái thư viện (đợt 4).
// Avatar (38,12) yaw PI pitch -0,55 dist 10 — thấy tầng trên cùng (9 cửa
// đứng) + dải xanh dưới diềm mái + cụm ăng-ten + hộp thang máy + hộp vuông.
// Chạy: node test/r4-lib-roof-shot.cjs  (server riêng 127.0.0.1:8341)
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8341/';
const OUT = path.join(__dirname, '..', 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const { spawn } = require('child_process');
  const server = spawn('python3', ['-m', 'http.server', '8341', '--directory', 'out'], {
    cwd: path.join(__dirname, '..'), stdio: 'ignore',
  });
  const waitServer = async () => {
    const t0 = Date.now();
    for (;;) {
      try { const r = await fetch(BASE); if (r.ok) return; } catch (e) { /* chua len */ }
      if (Date.now() - t0 > 20000) throw new Error('server 8341 khong len sau 20 s');
      await sleep(500);
    }
  };
  const browser = await chromium.launch({
    executablePath: EXE,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
  });
  try {
    await waitServer();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errs = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#enter-campus', { timeout: 30000 });
    await page.click('#enter-campus');
    await page.waitForFunction(() => window.__bkhn, { timeout: 30000 });
    await sleep(5000);
    await page.mouse.move(640, 400);
    await page.mouse.wheel(0, 2000);
    await sleep(600);
    await page.evaluate(() => window.__bkhn.teleport(38, 12, Math.PI, -0.55));
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT, 'r4-lib-roof.png'), timeout: 240000 });
    console.log('shot r4-lib-roof.png | consoleErrors:', errs.length, errs);
    await page.close();
  } finally {
    await browser.close();
    server.kill();
  }
})().catch((e) => { console.error(e); process.exit(1); });
