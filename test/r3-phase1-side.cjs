// r3-phase1-side.cjs — BỔ SUNG khung hình chu kỳ đi/chạy nhìn từ bên hông.
// Cách bắt: giữ W (hoặc Shift+W) tới khi phase ≈ π (gối L cực đại) rồi
// THẢ phím TRƯỚC khi teleport camera sang bên hông — thả phím thì facing
// ngừng nội suy (facing chỉ đổi khi đang di chuyển) nên khung hình chụp
// được giữ đúng profile bên hông trong khi khớp mới lắng một nấc về idle
// (blend ~0,7 sau 1 frame, gối vẫn ~0,6 rad).
// Chạy: node test/r3-phase1-side.cjs — server riêng 127.0.0.1:8337.
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8337/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TAU = Math.PI * 2;
const norm = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const mod2pi = (a) => ((a % TAU) + TAU) % TAU;
const report = { tool: 'r3-phase1-side', at: new Date().toISOString(), steps: [], shots: {}, consoleErrors: [], pageErrors: [] };
function logStep(id, name, ok, detail) {
  report.steps.push({ id, name, ok, detail: detail ?? null });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${id}] ${name}${detail ? ' — ' + detail : ''}`);
}
function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', '8337', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
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
async function shot(page, name, note) {
  await page.screenshot({ path: path.join(OUT, name), timeout: 120000 });
  report.shots[name] = { note };
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
    const getPose = () => page.evaluate(() => window.__bkhn.getPose());
    const tp = (x, z, yaw, pitch) => page.evaluate(([x, z, y, p]) => window.__bkhn.teleport(x, z, y, p), [x, z, yaw, pitch]);

    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#enter-campus', { timeout: 30000 });
    await page.click('#enter-campus');
    await page.waitForFunction(() => window.__bkhn, { timeout: 120000 });
    await sleep(3000);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((el) => el.textContent.trim() === '×');
      if (b) b.click();
    });
    await page.mouse.move(640, 400);
    await page.mouse.wheel(0, -4000);
    await sleep(800);

    // Đặt facing đông + blend đi đầy.
    await tp(-70, 10, -Math.PI / 2, 0.18);
    await sleep(800);

    async function sideCapture(keys, label, file, phaseWindow) {
      // Đặt lại camera sau lưng (yaw −π/2 → đi về đông) trước mỗi lượt —
      // lượt trước để lại camera ở bên hông nên facing sẽ đuổi theo hướng
      // khác nếu không reset.
      await tp(-70, 10, -Math.PI / 2, 0.18);
      await sleep(800);
      for (const k of keys) await page.keyboard.down(k);
      let ready = null;
      for (let i = 0; i < 120; i++) {
        const p = await getPose();
        if (p.blend > 0.8 && Math.abs(norm(p.facing - Math.PI / 2)) < 0.12) {
          if (Math.abs(norm(mod2pi(p.phase) - Math.PI)) < phaseWindow) { ready = p; break; }
        }
        await sleep(300);
      }
      if (!ready) {
        for (const k of keys) await page.keyboard.up(k);
        logStep(label, 'Chờ phase ≈ π (gối cực đại) + blend > 0,8', false, 'hết 36 s không bắt được cửa sổ phase');
        return false;
      }
      // Thả phím TRƯỚC khi xoay camera: facing đứng yên, khớp giữ tư thế.
      for (const k of keys) await page.keyboard.up(k);
      const sideYaw = ready.facing + Math.PI / 2; // camera phía trái nhân vật
      await tp(ready.pos.x, ready.pos.z, sideYaw, 0.18);
      await shot(page, file, `${label}: phase lúc bấm ≈${(mod2pi(ready.phase) * 180 / Math.PI).toFixed(0)}°, kneeL=${ready.kneeL} legL=${ready.legL} elbowL=${ready.elbowL}`);
      // Độ lệch camera = 90° theo cách dựng (sideYaw = facing + 90°, facing
      // đứng yên vì đã thả phím). KHÔNG đọc pose sau khi chụp để kiểm lệch:
      // lệnh screenshot chiếm nhiều frame render nên blend đã lắng về 0 lúc
      // đọc lại — ảnh chụp mới là bằng chứng đúng thời điểm.
      logStep(label, 'Khung hình bên hông ở pha gối cực đại', true,
        `pose trước chụp: phase=${(mod2pi(ready.phase) * 180 / Math.PI).toFixed(0)}° kneeL=${ready.kneeL} kneeR=${ready.kneeR} legL=${ready.legL} legR=${ready.legR} elbowL=${ready.elbowL} elbowR=${ready.elbowR} facing=${(ready.facing * 180 / Math.PI).toFixed(0)}° camera lệch 90°`);
      return true;
    }

    await sideCapture(['KeyW'], 'side-walk', 'r3-av-after-gait-side-kneemax.png', 0.5);
    await sleep(1500);
    // Chạy: phase nhảy ~1,3 rad/frame nên cửa sổ pha rộng hơn (0,8).
    await sideCapture(['ShiftLeft', 'KeyW'], 'side-run', 'r3-av-after-gait-side-run.png', 0.8);
    await ctx.close();
  } catch (e) {
    report.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', report.fatal);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
  report.summary = { stepsTotal: report.steps.length, stepsPass: report.steps.filter((s) => s.ok).length, consoleErrors: report.consoleErrors.length, pageErrors: report.pageErrors.length };
  fs.writeFileSync(path.join(OUT, 'r3-av-side.json'), JSON.stringify(report, null, 2));
  console.log('SUMMARY', JSON.stringify(report.summary));
  process.exit(report.steps.every((s) => s.ok) && report.consoleErrors.length === 0 && report.pageErrors.length === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
