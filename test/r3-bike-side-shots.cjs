// Tạm: chụp ảnh nghiêng người ngồi xe để soi tay lái / chân / balô.
// Không phải test hồi quy — chỉ chạy tay khi cần soi tư thế.
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8340/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', '8340', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
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
(async () => {
  let server = null;
  let browser = null;
  try {
    server = await startServer();
    browser = await chromium.launch({
      executablePath: EXE,
      args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
    });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#enter-campus', { timeout: 30000 });
    await page.click('#enter-campus');
    await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
    await sleep(2500);
    await page.evaluate(() => window.__bkhn.teleport(-70, 13));
    await page.waitForFunction(() => document.body.innerText.includes('Lên xe'), null, { timeout: 60000 });
    await page.keyboard.press('e');
    await sleep(1800);
    // Góc nghiêng: xe hướng đông (+X); camera đặt phía bắc (yaw π) nhìn
    // từ bên hông — thấy tay lên tay lái, chân gập, balô sau lưng.
    await page.evaluate(() => { const b = window.__bkhn.getBike(); window.__bkhn.teleport(b.pos.x, b.pos.z, Math.PI, 0.12); });
    await sleep(1200);
    await page.screenshot({ path: path.join(OUT, 'r3-bike-side.png'), timeout: 120000 });
    console.log('shot r3-bike-side.png');
    // Góc 3/4 trước: camera đông-nam nhìn về tây-bắc.
    await page.evaluate(() => { const b = window.__bkhn.getBike(); window.__bkhn.teleport(b.pos.x, b.pos.z, Math.PI * 0.75, 0.15); });
    await sleep(1200);
    await page.screenshot({ path: path.join(OUT, 'r3-bike-front34.png'), timeout: 120000 });
    console.log('shot r3-bike-front34.png');
    await ctx.close();
  } catch (e) {
    console.error('FATAL', e);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
})().catch((e) => { console.error(e); process.exit(1); });
