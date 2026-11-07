// check-partA-help.cjs — Kiểm tra nhanh mục 7 trên out/ mới (KHÔNG phải full
// verify — coordinator chạy ở cổng cuối): hộp "Cách di chuyển" mặc định thu
// gọn trong game (desktop + mobile), nút "?" mở/đóng được, F8: nút "?" không
// đè nút "Tương tác" trên mobile 390×844 (đo bounding box).
// Chạy: node test/check-partA-help.cjs  (server riêng 127.0.0.1:8331)
// Ghi: test-shots/r2p-partA-help.json
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8331/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = { meta: { purpose: 'Phan A muc 7: hop huong dan mac dinh thu gon + nut ? mo/dong + F8 mobile', date: new Date().toISOString() }, consoleErrors: [], pageErrors: [], checks: [] };
const check = (id, name, ok, detail) => {
  log.checks.push({ id, name, ok, detail: detail ?? null });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${id}] ${name}${detail ? ' — ' + detail : ''}`);
};
const rectsOverlap = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8331', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
  const waitServer = async () => {
    const t0 = Date.now();
    for (;;) {
      try { const r = await fetch(BASE); if (r.ok) return; } catch (e) { /* chua len */ }
      if (Date.now() - t0 > 20000) throw new Error('server 8331 khong len sau 20 s');
      await sleep(500);
    }
  };
  const browser = await chromium.launch({
    executablePath: EXE,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
  });
  try {
    await waitServer();
    // ---- Desktop 1280×800 ----
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      page.on('console', (m) => { if (m.type() === 'error') log.consoleErrors.push('desktop: ' + m.text()); });
      page.on('pageerror', (e) => log.pageErrors.push('desktop: ' + String(e)));
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('#enter-campus', { timeout: 30000 });
      await page.click('#enter-campus');
      await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
      await sleep(2500);
      const state1 = await page.evaluate(() => ({
        helpShown: document.body.innerText.includes('Cách di chuyển'),
        q: !!document.querySelector('button[aria-label="Mở hướng dẫn"]'),
      }));
      check('d1-default-collapsed', 'Desktop: hộp "Cách di chuyển" mặc định ẨN, chỉ có nút "?"',
        !state1.helpShown && state1.q, JSON.stringify(state1));
      await page.click('button[aria-label="Mở hướng dẫn"]');
      await sleep(500);
      const state2 = await page.evaluate(() => ({
        helpShown: document.body.innerText.includes('Cách di chuyển') && document.body.innerText.includes('WASD'),
        q: !!document.querySelector('button[aria-label="Mở hướng dẫn"]'),
      }));
      check('d2-q-opens', 'Desktop: bấm "?" → hộp hướng dẫn mở lại (đủ 5 dòng WASD/E/Shift)',
        state2.helpShown && !state2.q, JSON.stringify(state2));
      await page.click('button[aria-label="Đóng hướng dẫn"]');
      await sleep(500);
      const state3 = await page.evaluate(() => ({
        helpShown: document.body.innerText.includes('Cách di chuyển'),
        q: !!document.querySelector('button[aria-label="Mở hướng dẫn"]'),
      }));
      check('d3-x-closes', 'Desktop: bấm ✕ → hộp đóng, nút "?" hiện lại',
        !state3.helpShown && state3.q, JSON.stringify(state3));
      await ctx.close();
    }
    // ---- Mobile 390×844: F8 ----
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      page.on('console', (m) => { if (m.type() === 'error') log.consoleErrors.push('mobile: ' + m.text()); });
      page.on('pageerror', (e) => log.pageErrors.push('mobile: ' + String(e)));
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('#enter-campus', { timeout: 30000 });
      await page.click('#enter-campus');
      await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
      await sleep(3000);
      const m = await page.evaluate(() => {
        const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
        return {
          helpShown: document.body.innerText.includes('Cách di chuyển'),
          q: r(document.querySelector('button[aria-label="Mở hướng dẫn"]')),
          interact: r(document.querySelector('#interact-button')),
          scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
        };
      });
      check('m1-default-collapsed', 'Mobile: hộp mặc định ẨN, nút "?" hiện',
        !m.helpShown && !!m.q, JSON.stringify({ helpShown: m.helpShown, q: m.q }));
      const overlap = rectsOverlap(m.q, m.interact);
      check('m2-f8', 'F8: nút "?" không đè nút "Tương tác" trên mobile 390×844',
        !!m.q && !!m.interact && !overlap, `?=${JSON.stringify(m.q)}; Tương tác=${JSON.stringify(m.interact)}; chồng lấn=${overlap}`);
      check('m3-overflow', 'Mobile không tràn ngang', m.scrollW === m.innerW,
        `scrollWidth=${m.scrollW}, innerWidth=${m.innerW}`);
      // Mở hộp trên mobile rồi đo lại F8 với hộp đang mở.
      await page.click('button[aria-label="Mở hướng dẫn"]');
      await sleep(500);
      const m2 = await page.evaluate(() => {
        const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
        const smallest = (els) => {
          let best = null, bestArea = Infinity;
          for (const el of els) { const b = el.getBoundingClientRect(); const area = b.width * b.height; if (area > 0 && area < bestArea) { best = el; bestArea = area; } }
          return best;
        };
        const help = smallest([...document.querySelectorAll('div')].filter((d) => d.textContent.includes('Cách di chuyển') && d.textContent.includes('WASD')));
        return { help: r(help), interact: r(document.querySelector('#interact-button')) };
      });
      const overlap2 = rectsOverlap(m2.help, m2.interact);
      check('m4-help-open-no-overlap', 'Mobile: hộp mở lại cũng không đè nút "Tương tác"',
        !!m2.help && !!m2.interact && !overlap2, `hộp=${JSON.stringify(m2.help)}; Tương tác=${JSON.stringify(m2.interact)}; chồng lấn=${overlap2}`);
      await ctx.close();
    }
  } catch (e) {
    log.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', log.fatal);
  } finally {
    await browser.close();
    server.kill();
  }
  fs.writeFileSync(path.join(OUT, 'r2p-partA-help.json'), JSON.stringify(log, null, 2));
  const nOk = log.checks.filter((c) => c.ok).length;
  console.log(`SUMMARY ${nOk}/${log.checks.length} checks pass | consoleErrors: ${log.consoleErrors.length} | pageErrors: ${log.pageErrors.length}`);
  process.exit(log.checks.every((c) => c.ok) && log.consoleErrors.length === 0 && log.pageErrors.length === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
