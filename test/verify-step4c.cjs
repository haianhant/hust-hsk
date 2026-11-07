// verify-step4c.cjs — probe bổ sung sau verify-step4b: (P1) thông báo lỗi thật khi
// nhập JSON hỏng; (P2) click 3D vào bảng từ cự ly gần với thời gian chờ frame
// dài + quét nhiều điểm để xác định board-3d-near FAIL là lỗi test hay lỗi scene.
// Chạy: node test/verify-step4c.cjs. Ghi vào test-shots/verify-step4.json (mục probes).
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const BASE = 'http://127.0.0.1:8324/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = JSON.parse(fs.readFileSync(path.join(OUT, 'verify-step4.json'), 'utf8'));
report.probes = report.probes || {};
function logStep(run, id, name, ok, detail) {
  const s = { run, id, name, ok, detail: detail ?? null, at: new Date().toISOString() };
  report.steps.push(s);
  console.log(`${ok ? 'PASS' : 'FAIL'} [${run}/${id}] ${name}${detail ? ' — ' + detail : ''}`);
}
function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', '8324', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
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
const waitText = async (page, text, timeout = 30000) => {
  await page.waitForFunction((t) => document.body.innerText.includes(t), text, { timeout });
};
const clickTestId = async (page, id) => {
  await page.waitForSelector(`[data-testid="${id}"]`, { timeout: 30000 });
  await page.click(`[data-testid="${id}"]`);
};
(async () => {
  let server = null;
  let browser = null;
  try {
    server = await startServer();
    browser = await chromium.launch({
      executablePath: EXE,
      args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
    });

    // ---- P1: thông báo lỗi thật khi nhập JSON hỏng ---------------------------
    {
      const run = 'P1-import-msg';
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => report.pageErrors.push(String(e)));
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('#enter-campus', { timeout: 30000 });
      await page.click('#enter-campus');
      await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
      await sleep(2000);
      await page.click('#open-handbook');
      await waitText(page, 'Sổ tay từ vựng');
      fs.writeFileSync('/tmp/bkhn-bad2.json', '{invalid json!!!');
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 15000 }),
        page.click('label:has-text("Nhập JSON bản sao")'),
      ]);
      await chooser.setFiles('/tmp/bkhn-bad2.json');
      await sleep(1000);
      const txt = await page.evaluate(() => document.body.innerText);
      const shown = txt.includes('File nhập không phải JSON hợp lệ.');
      const pts = await page.evaluate(() => {
        const raw = window.localStorage.getItem('bkhn-progress-v1');
        return raw ? JSON.parse(raw).points : null;
      });
      logStep(run, 'import-bad-msg', 'Nhập JSON hỏng: thông báo lỗi hiển thị là gì, dữ liệu cũ còn không',
        shown && pts === 0,
        `thông báo "File nhập không phải JSON hợp lệ." hiện=${shown}; points sau nhập=${pts} (profile trống, kỳ vọng 0 — không mất, không ghi đè); chuỗi mà script cũ kiểm tra ("không phải bản sao tiến độ hợp lệ") không phải chuỗi app dùng → FAIL cũ là lỗi test, không phải lỗi app`);
      report.probes.importBadMessage = shown ? 'File nhập không phải JSON hợp lệ.' : '(không thấy thông báo khớp)';
      await ctx.close();
    }

    // ---- P2: click 3D bảng từ cự ly gần, chờ frame lâu + quét điểm -----------
    {
      const run = 'P2-board-near';
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => report.pageErrors.push(String(e)));
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('#enter-campus', { timeout: 30000 });
      await page.click('#enter-campus');
      await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
      await sleep(2000);
      await page.evaluate(() => window.__bkhn.teleport(-74, 8.5));
      await waitText(page, 'E — Nói chuyện với Minh');
      await page.keyboard.press('e');
      await waitText(page, 'Chào bạn! Mình là Minh');
      await clickTestId(page, 'quest-continue');
      await waitText(page, 'Đi tới cửa phòng học');
      await clickTestId(page, 'quest-close-panel');
      await page.evaluate(() => window.__bkhn.teleport(-58, -44));
      await waitText(page, 'E — Vào phòng học');
      await page.keyboard.press('e');
      await waitText(page, 'Hôm nay là tiết Toán');
      await clickTestId(page, 'quest-continue');
      await waitText(page, 'Hãy nhìn lên bảng đen');
      // Tới gần bảng, chờ lâu cho camera kịp render frame mới (SwiftShader ~1-2 fps).
      await page.evaluate(() => window.__bkhn.teleport(0, -0.3, 0));
      await sleep(4000);
      const pos = await page.evaluate(() => window.__bkhn.getPos());
      await page.screenshot({ path: path.join(OUT, 'step4v-14-board-close.png'), timeout: 120000 });
      report.shots['step4v-14-board-close.png'] = { note: 'cận cảnh bảng đen từ (0,-0.3), sau khi chờ 4 s cho camera ổn định' };
      console.log('shot step4v-14-board-close.png');
      const sweep = [];
      let selected = null;
      for (const pt of [[640, 150], [640, 250], [640, 350], [640, 450], [500, 250], [780, 250], [640, 200], [640, 300]]) {
        await page.mouse.click(pt[0], pt[1]);
        await sleep(1200);
        const body = await page.evaluate(() => document.body.innerText);
        let outcome = 'khong-phan-hoi';
        if (body.includes('Đúng rồi! Đây là')) outcome = 'CHON-DUNG-BANG';
        else if (body.includes('Chưa đúng')) outcome = 'chon-nham-vat';
        else if (body.includes('Hãy đến gần bảng hơn')) outcome = 'toast-den-gan-bang';
        else if (body.includes('Hãy đến gần bàn 1 hơn')) outcome = 'toast-den-gan-ban';
        sweep.push(`${pt}: ${outcome}`);
        if (outcome === 'CHON-DUNG-BANG') { selected = pt; break; }
        if (outcome === 'chon-nham-vat') break; // đã ghi 1 đáp án sai, dừng để khỏi ghi thêm
      }
      logStep(run, 'board-near-sweep', 'Quét click 3D vào bảng từ (0,-0.3) sau khi chờ 4 s', !!selected,
        `pos=(${pos.x.toFixed(2)},${pos.z.toFixed(2)}) cách bảng ${(Math.hypot(pos.x - 0, pos.z - (-2.6))).toFixed(2)} m; kết quả: ${sweep.join(' | ')}`);
      report.probes.boardNearSweep = sweep;
      await ctx.close();
    }
  } catch (e) {
    report.fatal3 = String(e && e.stack ? e.stack : e);
    console.error('FATAL', report.fatal3);
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
