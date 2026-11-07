// verify-step4d.cjs — probe P3: màn kết quả chơi lại (chữ thưởng 2 dòng) có bị
// tràn nút "Học tiếp" khỏi khung nhìn không? Seed profile 160đ với questState
// ở bước result (stepIndex 12), vào bằng "Tiếp tục học", đo hình học panel.
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const BASE = 'http://127.0.0.1:8325/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = JSON.parse(fs.readFileSync(path.join(OUT, 'verify-step4.json'), 'utf8'));
const EXPORTED = JSON.parse(fs.readFileSync('/tmp/bkhn-verify-export.json', 'utf8'));
function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', '8325', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
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
    const seeded = { ...EXPORTED, questState: { questId: 'first-lesson', stepIndex: 12, done: false } };
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript((snap) => {
      window.localStorage.setItem('bkhn-progress-v1', snap);
    }, JSON.stringify(seeded));
    const page = await ctx.newPage();
    page.on('pageerror', (e) => report.pageErrors.push(String(e)));
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#continue-learning', { timeout: 30000 });
    await page.click('#continue-learning');
    await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
    await sleep(3000);
    await page.waitForFunction(() => document.body.innerText.includes('Xong buổi học đầu tiên!'), null, { timeout: 30000 });
    await sleep(1000);
    const m = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Học tiếp'));
      const panel = btn ? btn.closest('div[class*="max-h-"]') : null;
      const pr = panel ? panel.getBoundingClientRect() : null;
      const br = btn ? btn.getBoundingClientRect() : null;
      return {
        viewportH: window.innerHeight,
        panel: pr ? { top: Math.round(pr.top), bottom: Math.round(pr.bottom), h: Math.round(pr.height), scrollH: panel.scrollHeight, clientH: panel.clientHeight, scrollTop: panel.scrollTop } : null,
        button: br ? { top: Math.round(br.top), bottom: Math.round(br.bottom), h: Math.round(br.height) } : null,
        buttonFullyVisible: br ? br.bottom <= window.innerHeight && br.top >= 0 : false,
      };
    });
    await page.screenshot({ path: path.join(OUT, 'step4v-15-result-overflow.png'), timeout: 120000 });
    report.shots['step4v-15-result-overflow.png'] = { note: 'màn kết quả chơi lại (thưởng 2 dòng) — đo tràn nút Học tiếp' };
    const ok = m.buttonFullyVisible;
    report.steps.push({ run: 'P3-result-overflow', id: 'result-overflow', name: 'Màn kết quả chơi lại (2 dòng thưởng): nút Học tiếp có trong khung nhìn không', ok, detail: JSON.stringify(m), at: new Date().toISOString() });
    console.log(ok ? 'PASS' : 'FAIL', 'P3 result-overflow —', JSON.stringify(m));
    report.probes = report.probes || {};
    report.probes.resultOverflow = m;
    await ctx.close();
  } catch (e) {
    report.fatal4 = String(e && e.stack ? e.stack : e);
    console.error('FATAL', report.fatal4);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
  const okSteps = report.steps.filter((s) => s.ok).length;
  report.summary = { stepsTotal: report.steps.length, stepsPass: okSteps, consoleErrors: report.consoleErrors.length, pageErrors: report.pageErrors.length };
  fs.writeFileSync(path.join(OUT, 'verify-step4.json'), JSON.stringify(report, null, 2));
  console.log('SUMMARY', JSON.stringify(report.summary));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
