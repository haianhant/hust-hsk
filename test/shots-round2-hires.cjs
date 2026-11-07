// Can chu HUST o 2048x1280 — chay RIENG sau shots-round2-resume.cjs (trang
// 2048x1280 nang, de chung de chet vi RAM nhu lan chay gop truoc).
// Chay: node test/shots-round2-hires.cjs  (server rieng 127.0.0.1:8328)
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8328/';
const OUT = path.join(__dirname, '..', 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const { spawn } = require('child_process');
  const server = spawn('python3', ['-m', 'http.server', '8328', '--directory', 'out'], {
    cwd: path.join(__dirname, '..'), stdio: 'ignore',
  });
  const waitServer = async () => {
    const t0 = Date.now();
    for (;;) {
      try { const r = await fetch(BASE); if (r.ok) return; } catch (e) { /* chua len */ }
      if (Date.now() - t0 > 20000) throw new Error('server 8328 khong len sau 20 s');
      await sleep(500);
    }
  };
  const browser = await chromium.launch({
    executablePath: EXE,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
  });
  try {
    await waitServer();
    const hi = await browser.newPage({ viewport: { width: 2048, height: 1280 } });
    const errs = [];
    hi.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    hi.on('pageerror', (e) => errs.push(String(e)));
    await hi.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await hi.waitForSelector('#enter-campus', { timeout: 30000 });
    await hi.click('#enter-campus');
    await hi.waitForFunction(() => window.__bkhn, { timeout: 90000 });
    await sleep(5000);
    await hi.mouse.move(1024, 640);
    await hi.mouse.wheel(0, -2000);
    await sleep(600);
    await hi.evaluate(() => window.__bkhn.teleport(-58, -30, -Math.PI / 2, 0.18));
    await sleep(1500);
    await hi.screenshot({ path: path.join(OUT, 'r2m-avatar-hust-tight.png'), timeout: 180000 });
    console.log('shot r2m-avatar-hust-tight.png | consoleErrors:', errs.length);
    const logPath = path.join(OUT, 'round2-merged.json');
    try {
      const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      log.shots = log.shots.filter((x) => x.file !== 'r2m-avatar-hust-tight.png');
      log.shots.push({ file: 'r2m-avatar-hust-tight.png', avatar: { x: -58, z: -30 }, yaw: -Math.PI / 2, pitch: 0.18, distM: 4, description: 'Can chu HUST nguc trai o 2048x1280 (chu nho nen can do phan giai cao moi doc duoc)' });
      log.consoleErrors.push(...errs.map((e) => 'hi-res: ' + e));
      fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
    } catch (e) { console.error('khong ghi duoc log JSON:', String(e).slice(0, 200)); }
  } finally {
    await browser.close();
    server.kill();
  }
})().catch((e) => { console.error(e); process.exit(1); });
