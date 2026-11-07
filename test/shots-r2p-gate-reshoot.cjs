// shots-r2p-gate-reshoot.cjs — chup bu 1 goc cay cong Parabol (r2p-gate-trees
// cu bi chan cong che mat tan). Server rieng 127.0.0.1:8329.
// Chay: node test/shots-r2p-gate-reshoot.cjs
// Ghi: test-shots/r2p-gate-trees2.png
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8329/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8329', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
  const waitServer = async () => {
    const t0 = Date.now();
    for (;;) {
      try { const r = await fetch(BASE); if (r.ok) return; } catch (e) { /* chua len */ }
      if (Date.now() - t0 > 20000) throw new Error('server 8329 khong len sau 20 s');
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
    page.on('pageerror', (e) => console.error('PAGEERROR', String(e)));
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#enter-campus', { timeout: 30000 });
    await page.click('#enter-campus');
    await page.waitForFunction(() => window.__bkhn, { timeout: 30000 });
    await sleep(5000);
    // Avatar dung phia bac cong, nhin ve cong: 2 cay bac (-93.5,16)/(-82.5,17.5)
    // o truoc mat, khong bi chan cong che.
    await page.evaluate(() => window.__bkhn.teleport(-88, 26, 0, 0.12));
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT, 'r2p-gate-trees2.png'), timeout: 120000 });
    const avatar = await page.evaluate(() => window.__bkhn.getPos());
    console.log('shot r2p-gate-trees2.png avatar', avatar.x.toFixed(1), avatar.z.toFixed(1));
  } catch (e) {
    console.error('FATAL', String(e && e.stack ? e.stack : e));
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.kill();
  }
})().catch((e) => { console.error(e); process.exit(1); });
