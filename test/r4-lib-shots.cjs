// Chụp đối chiếu đợt 4 — thư viện dựng lại theo studywithhuster.cyou.
// Góc chụp (avatar + yaw + pitch + dist):
//  - front: (38, 6) yaw PI pitch 0,12 dist 7 — chính diện từ sân trước mới,
//    chữ HUST ở tiền cảnh, đồng hồ + lam + biển tên + sảnh phía sau.
//  - forecourt: (24, 14) yaw -PI/2 pitch 0,08 dist 7 — từ mép đường nhìn đông
//    dọc lối đi đỏ vào sảnh (chữ HUST + bậc + cột hiên).
//  - left (từ hồ): (22, 30) yaw -PI/2 pitch 0,05 dist 7 — mặt tây: lưới cửa
//    10 hàng, không đồng hồ/lam/biển/sảnh.
//  - right: (54, 30) yaw PI/2 pitch 0,05 dist 7 — mặt đông (suy đối xứng).
//  - back: (38, 57) yaw 0 pitch 0,12 dist 7 — mặt sau từ sân nam (đảo cỏ,
//    lộc vừng giữ nguyên; mặt sau chỉ có dải cửa ngang + dải xanh mái).
//  - clock-closeup hi-res 2048x1280: (38, 9) yaw PI pitch -0,05 dist 10 —
//    cận đồng hồ + lam + biển tên + sảnh + chữ HUST.
// Chạy: node test/r4-lib-shots.cjs  (server riêng 127.0.0.1:8341)
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8341/';
const OUT = path.join(__dirname, '..', 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SHOTS = [
  { file: 'r4-lib-front.png', x: 38, z: 6, yaw: Math.PI, pitch: 0.12, distM: 7, note: 'Chính diện từ sân trước mới: chữ HUST (đã sửa đảo) tiền cảnh, biển tên y 13,8 + đồng hồ + 2 cụm lam + trần hiên xám phía sau' },
  { file: 'r4-lib-forecourt.png', x: 24, z: 14, yaw: -Math.PI / 2, pitch: 0.08, distM: 7, note: 'Từ mép đường nhìn đông dọc lối đi đỏ: bồn cỏ 2 bên, chữ HUST, bậc + cột hiên + cửa kính' },
  { file: 'r4-lib-left34.png', x: 22, z: 8, yaw: -2.63, pitch: 0.0, distM: 10, note: 'Góc 3/4 tây-bắc (yaw -2,63 = bearing 151°): mặt tây (dải cửa ngang) + mặt chính + mái (ăng-ten, hộp thang máy)' },
  { file: 'r4-lib-right34.png', x: 54, z: 8, yaw: 2.63, pitch: 0.0, distM: 10, note: 'Góc 3/4 đông-bắc (yaw +2,63 = bearing 209°): mặt đông (dải cửa ngang) + mặt chính + mái' },
  { file: 'r4-lib-roof.png', x: 38, z: 12, yaw: Math.PI, pitch: -0.55, distM: 10, note: 'Nhìn lên dốc từ sân trước: tầng trên cùng (9 cửa đứng) + dải xanh dưới diềm mái + ăng-ten + hộp thang máy + hộp vuông 2 đầu' },
  { file: 'r4-lib-wide.png', x: 38, z: 0, yaw: Math.PI, pitch: -0.2, distM: 10, note: 'Toàn tháp từ phía bắc (sân trước + chữ HUST + biển tên + mái); đỉnh tháp có thể vẫn ngoài khung do FOV' },
  { file: 'r4-lib-back.png', x: 38, z: 60, yaw: 0, pitch: -0.05, distM: 10, note: 'Mặt sau từ sân nam: dải cửa ngang + dải xanh dưới diềm mái; đảo cỏ + lộc vừng giữ nguyên' },
];

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
  const logPath = path.join(OUT, 'r4-lib-shots.json');
  const log = { meta: { purpose: 'Doi chieu dot 4 — thu vien dung lai theo studywithhuster.cyou', date: new Date().toISOString(), viewportDesktop: '1280x800' }, consoleErrors: [], pageErrors: [], shots: [] };
  const save = () => fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  const browser = await chromium.launch({
    executablePath: EXE,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
  });
  try {
    await waitServer();
    console.log('server len o', BASE);
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('console', (m) => { if (m.type() === 'error') log.consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => log.pageErrors.push(String(e)));
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#enter-campus', { timeout: 30000 });
    await page.click('#enter-campus');
    await page.waitForFunction(() => window.__bkhn, { timeout: 30000 });
    await sleep(5000);

    let dist = 7;
    const shot = async (s) => {
      await page.evaluate(([xx, zz, yy, pp]) => window.__bkhn.teleport(xx, zz, yy, pp), [s.x, s.z, s.yaw, s.pitch]);
      if (s.distM === 10 && dist !== 10) { await page.mouse.move(640, 400); await page.mouse.wheel(0, 2000); dist = 10; }
      else if (s.distM === 7 && dist !== 7) { await page.mouse.move(640, 400); await page.mouse.wheel(0, -2000); dist = 7; }
      await sleep(1500);
      await page.screenshot({ path: path.join(OUT, s.file), timeout: 240000 });
      const avatar = await page.evaluate(() => window.__bkhn.getPos());
      log.shots.push({ file: s.file, avatar: { x: +avatar.x.toFixed(2), z: +avatar.z.toFixed(2) }, yaw: s.yaw, pitch: s.pitch, distM: dist, description: s.note });
      save();
      console.log('shot', s.file, 'avatar=', JSON.stringify(avatar));
    };
    for (const s of SHOTS) await shot(s);

    // Top-view toàn campus — CHỈ chụp khi cần (footprint đợt 4 không đổi sau
    // vòng sửa, giữ nguyên file r4-lib-topdown.png từ lần chụp đầu).
    if (process.argv.includes('--topdown')) {
      await page.evaluate(() => window.__bkhn.topView());
      await sleep(1500);
      await page.screenshot({ path: path.join(OUT, 'r4-lib-topdown.png'), timeout: 240000 });
      log.shots.push({ file: 'r4-lib-topdown.png', avatar: null, camera: { x: 0, y: 160, z: 5.01 }, yaw: null, pitch: null, distM: null, description: 'Top-view toàn campus: footprint thư viện mới (tấm đứng 21×13) + sân trước phía bắc (plaza minZ 10) + đảo cỏ/lộc vừng giữ sân nam' });
      save();
      console.log('shot r4-lib-topdown.png');
    }
    await page.close();

    // Hi-res: closeup đồng hồ + sảnh + chữ HUST.
    const hi = await browser.newPage({ viewport: { width: 2048, height: 1280 } });
    hi.on('console', (m) => { if (m.type() === 'error') log.consoleErrors.push('hi-res: ' + m.text()); });
    hi.on('pageerror', (e) => log.pageErrors.push('hi-res: ' + String(e)));
    await hi.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await hi.waitForSelector('#enter-campus', { timeout: 30000 });
    await hi.click('#enter-campus');
    await hi.waitForFunction(() => window.__bkhn, { timeout: 90000 });
    await sleep(5000);
    await hi.mouse.move(1024, 640);
    await hi.mouse.wheel(0, 2000);
    await sleep(600);
    await hi.evaluate(() => window.__bkhn.teleport(38, 9, Math.PI, -0.05));
    await sleep(1500);
    await hi.screenshot({ path: path.join(OUT, 'r4-lib-clock-closeup.png'), timeout: 240000 });
    log.shots.push({ file: 'r4-lib-clock-closeup.png', avatar: { x: 38, z: 9 }, yaw: Math.PI, pitch: -0.05, distM: 10, description: 'Cận đồng hồ + 2 cụm lam + biển tên + sảnh 6 cột + chữ HUST ở 2048x1280' });
    save();
    console.log('shot r4-lib-clock-closeup.png');
  } catch (e) {
    log.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', log.fatal);
    save();
  } finally {
    await browser.close();
    server.kill();
  }
  console.log('shots:', log.shots.length, '| consoleErrors:', log.consoleErrors.length, '| pageErrors:', log.pageErrors.length);
})().catch((e) => { console.error(e); process.exit(1); });
