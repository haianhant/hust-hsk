// r3-phase1-teacher-back.cjs — CHỤP cô giáo từ sau lưng chếch đông-nam.
// Phòng học sâu chỉ 5,2 m, cô đứng sát tường bắc (z=-2) nên không thể đặt
// camera thẳng sau lưng cô (camera bị kẹp tường bắc ngay trên đầu người
// chơi — 2 lần thử trước đều ra ảnh cận đầu người chơi). Bản này dùng góc
// chếch 3/4 từ đông-nam: người chơi (3.8,-0.5), camera yaw π/4.
// Chạy: node test/r3-phase1-teacher-back.cjs — server riêng 127.0.0.1:8339.
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8339/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = { tool: 'r3-phase1-teacher-back', at: new Date().toISOString(), shots: {}, consoleErrors: [], pageErrors: [] };
function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', '8339', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
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
    await page.waitForFunction(() => window.__bkhn, { timeout: 120000 });
    await sleep(3000);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((el) => el.textContent.trim() === '×');
      if (b) b.click();
    });
    await page.evaluate(() => window.__bkhn.enterClassroom());
    await sleep(2500);
    await page.evaluate(() => window.__bkhn.teleport(3.8, -0.5, Math.PI / 4, 0.25));
    await sleep(2500);
    await page.screenshot({ path: path.join(OUT, 'r3-av-after-teacher-back.png'), timeout: 120000 });
    report.shots['r3-av-after-teacher-back.png'] = { note: 'Cô giáo từ sau lưng chếch đông-nam: búi tóc + trâm, không thấy mặt' };
    console.log('shot r3-av-after-teacher-back.png');
    await ctx.close();
  } catch (e) {
    report.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', report.fatal);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
  fs.writeFileSync(path.join(OUT, 'r3-av-teacher-back.json'), JSON.stringify(report, null, 2));
  console.log('consoleErrors:', JSON.stringify(report.consoleErrors));
  console.log('pageErrors:', JSON.stringify(report.pageErrors));
  process.exit(report.consoleErrors.length === 0 && report.pageErrors.length === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
