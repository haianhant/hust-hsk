// r3-phase1.cjs — KIỂM CHỨNG GIAI ĐOẠN 1 đợt 3: nhân vật ngược.
// Chạy: node test/r3-phase1.cjs [before|after]   (mặc định before)
// Server riêng 127.0.0.1:8336, một context WebGL — SwiftShader ~1-2 fps.
// MODE before: pha gập gối cực đại kỳ vọng ở phase≈0 (công thức cũ cos).
// MODE after:  pha gập gối cực đại kỳ vọng ở phase≈π (công thức mới -cos).
// Ảnh ra test-shots/ tiền tố r3-av- ; log JSON ra test-shots/r3-av-<mode>.json
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const MODE = process.argv[2] === 'after' ? 'after' : 'before';
const BASE = 'http://127.0.0.1:8336/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TAU = Math.PI * 2;
const norm = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const mod2pi = (a) => ((a % TAU) + TAU) % TAU;

const report = { tool: 'r3-phase1', mode: MODE, at: new Date().toISOString(), steps: [], shots: {}, consoleErrors: [], pageErrors: [], poses: {} };
function logStep(id, name, ok, detail) {
  const s = { id, name, ok, detail: detail ?? null };
  report.steps.push(s);
  console.log(`${ok ? 'PASS' : 'FAIL'} [${id}] ${name}${detail ? ' — ' + detail : ''}`);
  return ok;
}
function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', '8336', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
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
function attachErrorHooks(page) {
  page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => report.pageErrors.push(String(e)));
}
async function shot(page, name, note) {
  await page.screenshot({ path: path.join(OUT, name), timeout: 120000 });
  report.shots[name] = { note };
  console.log('shot', name);
}
const getPose = (page) => page.evaluate(() => window.__bkhn.getPose());
const getYaw = (page) => page.evaluate(() => window.__bkhn.getYaw());
const tp = (page, x, z, yaw, pitch) => page.evaluate(([x, z, y, p]) => window.__bkhn.teleport(x, z, y, p), [x, z, yaw, pitch]);

async function enterFresh(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#enter-campus', { timeout: 30000 });
  await page.click('#enter-campus');
  await page.waitForFunction(() => window.__bkhn, { timeout: 120000 });
  await sleep(3000);
  // Đóng hộp "Cách di chuyển" cho khung hình sạch.
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((el) => el.textContent.trim() === '×');
    if (b) b.click();
  });
  await sleep(500);
}
async function zoomIn(page) {
  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, -4000);
  await sleep(800);
}

(async () => {
  let server = null;
  let browser = null;
  const t0 = Date.now();
  try {
    server = await startServer();
    console.log('server lên ở', BASE, 'mode=', MODE);
    browser = await chromium.launch({
      executablePath: EXE,
      args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
    });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    attachErrorHooks(page);
    await enterFresh(page);

    // ---- 1. Đặt facing ĐÔNG (π/2): đi W với camera yaw -π/2 (forward +X).
    await tp(page, -70, 10, -Math.PI / 2, 0.18);
    await sleep(1200);
    await page.keyboard.down('KeyW');
    let facingOk = false;
    // SwiftShader ~0,25 fps: mỗi frame facing chỉ nội suy một nấc nên phải
    // poll tới khi hội tụ thật, không sleep cố định.
    for (let i = 0; i < 120; i++) {
      await sleep(300);
      const p = await getPose(page);
      if (Math.abs(norm(p.facing - Math.PI / 2)) < 0.08) { facingOk = true; break; }
    }
    await page.keyboard.up('KeyW');
    const poseSettled = await getPose(page);
    logStep('facing-east', 'Đi W đặt facing về đông (+X, π/2)', facingOk, `facing=${poseSettled.facing.toFixed(2)}`);
    // Chờ blend → 0 hẳn (tư thế đứng trung tính thật, không còn dư bước).
    let blendOk = false;
    for (let i = 0; i < 150; i++) {
      const p = await getPose(page);
      if (p.blend < 0.08) { blendOk = true; break; }
      await sleep(400);
    }
    const poseIdle = await getPose(page);
    report.poses.idle = poseIdle;
    logStep('idle-settled', 'Đứng yên: blend về ~0', blendOk, `blend=${poseIdle.blend.toFixed(2)} phase=${poseIdle.phase.toFixed(2)}`);
    await zoomIn(page);

    // ---- 2. Bốn hướng (facing π/2): trước π/2, sau -π/2, trái π, phải 0.
    const dirs = [
      ['front', Math.PI / 2, 'TRƯỚC: mặt/mắt/mũi/HUST/mũi giày cùng +X, balô khuất sau'],
      ['back', -Math.PI / 2, 'SAU: balô đen sau lưng, không thấy mặt/HUST'],
      ['left', Math.PI, 'TRÁI (phía +X cục bộ của nhân vật): tay trái, ngón cái'],
      ['right', 0, 'PHẢI: tay phải, ngón cái'],
    ];
    for (const [label, yaw, note] of dirs) {
      await tp(page, -70, 10, yaw, 0.18);
      await sleep(1500);
      const p = await getPose(page);
      await shot(page, `r3-av-${MODE}-player-${label}.png`, note);
      report.poses['dir-' + label] = { yaw, facing: p.facing };
    }
    // ---- 3. Quay đủ một vòng: camera yaw từng 45° quanh nhân vật đứng yên.
    for (let k = 0; k < 8; k++) {
      const yaw = Math.PI / 2 + (k * Math.PI) / 4;
      await tp(page, -70, 10, yaw, 0.18);
      await sleep(900);
      await shot(page, `r3-av-${MODE}-orbit-${k * 45}.png`, `quay vòng: camera yaw ${(yaw * 180 / Math.PI).toFixed(0)}°`);
    }
    // ---- 4. Đo bounding box avatar (local).
    const m = await page.evaluate(() => window.__bkhn.measureAvatar());
    report.poses.measureAvatar = m;
    logStep('measure', 'measureAvatar: cao ~1,707 m', !!m && Math.abs(m.size.y - 1.707) < 0.05, JSON.stringify(m));

    // ---- 5. Đi thẳng về trước: hướng di chuyển có khớp hướng mặt?
    await tp(page, -70, 10, -Math.PI / 2, 0.18);
    await sleep(800);
    const p0 = await getPose(page);
    await page.keyboard.down('KeyW');
    await sleep(9000);
    const p1 = await getPose(page);
    await page.keyboard.up('KeyW');
    const dx = p1.pos.x - p0.pos.x, dz = p1.pos.z - p0.pos.z;
    const dist = Math.hypot(dx, dz);
    const moveAng = Math.atan2(dx, dz);
    const faceErr = Math.abs(norm(moveAng - p1.facing));
    logStep('walk-forward', 'Đi W: di chuyển theo hướng mặt (không đi lùi)', dist > 0.5 && faceErr < 0.35,
      `Δ=(${dx.toFixed(2)}, ${dz.toFixed(2)}) ${dist.toFixed(2)} m; hướng đi ${(moveAng * 180 / Math.PI).toFixed(0)}° vs facing ${(p1.facing * 180 / Math.PI).toFixed(0)}°; lệch ${(faceErr * 180 / Math.PI).toFixed(0)}°`);
    report.poses.walkForward = { from: p0.pos, to: p1.pos, dist: +dist.toFixed(2), moveDeg: +(moveAng * 180 / Math.PI).toFixed(1), facingDeg: +(p1.facing * 180 / Math.PI).toFixed(1) };
    await sleep(2500);

    // ---- 6. Chu kỳ đi: lấy mẫu getPose theo phase + chụp khung hình ở pha gối cực đại.
    // Gối L cực đại: before → phase≈0 ; after → phase≈π.
    const kneeMaxPhase = MODE === 'after' ? Math.PI : 0;
    await tp(page, -70, 10, -Math.PI / 2, 0.18);
    await sleep(800);
    const samples = [];
    const bins = {};
    await page.keyboard.down('KeyW');
    let shotBack = false;
    const gaitT0 = Date.now();
    while (Date.now() - gaitT0 < 20000) {
      const p = await getPose(page);
      const ph = mod2pi(p.phase);
      const bin = Math.floor(ph / (Math.PI / 6)) % 12;
      if (!(bin in bins)) bins[bin] = p;
      samples.push({ ph: +ph.toFixed(2), legL: +p.legL.toFixed(2), legR: +p.legR.toFixed(2), kneeL: +p.kneeL.toFixed(2), kneeR: +p.kneeR.toFixed(2), footL: +p.footL.toFixed(2), footR: +p.footR.toFixed(2), armL: +p.armL.toFixed(2), armR: +p.armR.toFixed(2), elbowL: +p.elbowL.toFixed(2), elbowR: +p.elbowR.toFixed(2), ankleYL: p.ankleYL, ankleYR: p.ankleYR, blend: +p.blend.toFixed(2) });
      if (!shotBack && Math.abs(norm(ph - kneeMaxPhase)) < 0.45 && p.blend > 0.8) {
        const atShot = await getPose(page);
        await shot(page, `r3-av-${MODE}-gait-back-kneemax.png`, `đi thẳng, camera sau, phase≈${(kneeMaxPhase * 180 / Math.PI).toFixed(0)}° (gối L cực đại kỳ vọng); pose lúc chụp ${JSON.stringify({ ph: +mod2pi(atShot.phase).toFixed(2), kneeL: atShot.kneeL, kneeR: atShot.kneeR, legL: atShot.legL, legR: atShot.legR })}`);
        shotBack = true;
      }
      await sleep(150);
    }
    await page.keyboard.up('KeyW');
    report.poses.gaitSamples = samples;
    report.poses.gaitBins = bins;
    // Phân tích số: gối L đạt cực đại ở phase nào? (dùng |kneeL| lớn nhất trong mẫu)
    let maxK = null;
    for (const s of samples) { if (!maxK || Math.abs(s.kneeL) > Math.abs(maxK.kneeL)) maxK = s; }
    logStep('gait-knee-phase', `Gối L |knee| cực đại rơi ở phase ${(maxK.ph * 180 / Math.PI).toFixed(0)}° (kỳ vọng ${MODE === 'after' ? '~180° (chân vung về trước qua dưới thân)' : '~0°/360° (công thức cũ)'})`,
      MODE === 'after' ? Math.abs(norm(maxK.ph - Math.PI)) < 1.1 : Math.abs(norm(maxK.ph)) < 0.9,
      `maxKneeL=${maxK.kneeL} tại phase ${(maxK.ph * 180 / Math.PI).toFixed(0)}°; legL lúc đó=${maxK.legL}; ankleYL=${maxK.ankleYL} ankleYR=${maxK.ankleYR}`);
    // Cổ chân thấp nhất khi tiếp đất (knee ~ min): đế giày ≈ ankleY - 0.07 phải ≈ 0.
    const stance = samples.filter((s) => Math.abs(s.kneeL) < 0.15 || Math.abs(s.kneeR) < 0.15);
    const minAnkle = stance.length ? Math.min(...stance.map((s) => Math.min(s.ankleYL, s.ankleYR))) : null;
    const maxAnkle = samples.length ? Math.max(...samples.map((s) => Math.max(s.ankleYL, s.ankleYR))) : null;
    logStep('gait-ankle', 'Cổ chân lúc tiếp đất không xuyên nền (ankleY min ≥ 0.02), lúc vung nhấc khỏi đất',
      minAnkle !== null && minAnkle >= 0.02 && minAnkle <= 0.12,
      `ankleY min lúc gối duỗi=${minAnkle}; ankleY max lúc vung=${maxAnkle}`);
    report.poses.gaitAnalysis = { kneeMaxPhaseDeg: +(maxK.ph * 180 / Math.PI).toFixed(1), kneeMaxVal: maxK.kneeL, minAnkle, maxAnkle, samples: samples.length };
    await sleep(2500);

    // ---- 7. Khung hình chu kỳ đi nhìn từ bên hông: xoay camera NHANH trong lúc đi.
    // Một cú kéo lớn (dx≈320px → yaw nhảy ~1,6 rad trong một sự kiện) khiến
    // facing chưa kịp đuổi theo trong vài frame render chậm → camera lệch
    // ~90° so với hướng mặt trong khi chân vẫn chạy animation đi.
    await tp(page, -70, 10, -Math.PI / 2, 0.18);
    await sleep(800);
    await page.keyboard.down('KeyW');
    await page.mouse.move(640, 400);
    await page.mouse.down();
    await page.mouse.move(960, 400);
    let sideShot = false;
    for (let i = 0; i < 60 && !sideShot; i++) {
      await sleep(150);
      const p = await getPose(page);
      const yaw = await getYaw(page);
      const off = Math.abs(norm(yaw - p.facing));
      const ph = mod2pi(p.phase);
      if (off > 1.0 && off < 2.0 && Math.abs(norm(ph - kneeMaxPhase)) < 0.8 && p.blend > 0.8) {
        await shot(page, `r3-av-${MODE}-gait-side-kneemax.png`, `đi, camera lệch ${(off * 180 / Math.PI).toFixed(0)}° so với mặt, phase ${(ph * 180 / Math.PI).toFixed(0)}°; kneeL=${p.kneeL} kneeR=${p.kneeR} legL=${p.legL} legR=${p.legR} elbowL=${p.elbowL} elbowR=${p.elbowR}`);
        sideShot = true;
      }
    }
    await page.mouse.up();
    await page.keyboard.up('KeyW');
    logStep('gait-side-shot', 'Chụp được khung hình đi nhìn từ bên hông ở pha gối cực đại', sideShot, sideShot ? '' : 'không bắt được cửa sổ offset+phase trong 30 bước kéo — xem lại bằng log số + ảnh sau lưng');
    await sleep(2500);

    // ---- 8. Chạy (Shift+W): lấy mẫu nhanh.
    await tp(page, -70, 10, -Math.PI / 2, 0.18);
    await sleep(800);
    await page.keyboard.down('ShiftLeft');
    await page.keyboard.down('KeyW');
    const runSamples = [];
    const runT0 = Date.now();
    while (Date.now() - runT0 < 8000) {
      const p = await getPose(page);
      runSamples.push({ ph: +mod2pi(p.phase).toFixed(2), legL: +p.legL.toFixed(2), kneeL: +p.kneeL.toFixed(2), kneeR: +p.kneeR.toFixed(2), elbowL: +p.elbowL.toFixed(2), elbowR: +p.elbowR.toFixed(2), ankleYL: p.ankleYL, ankleYR: p.ankleYR, blend: +p.blend.toFixed(2), run: p.run });
      await sleep(200);
    }
    await page.keyboard.up('KeyW');
    await page.keyboard.up('ShiftLeft');
    report.poses.runSamples = runSamples;
    const runMoving = runSamples.some((s) => s.run && s.blend > 0.8);
    logStep('run-sample', 'Chạy Shift+W: run=true, blend→1', runMoving, `mẫu=${runSamples.length}`);
    await sleep(2500);

    // ---- 9. Minh (hoodie navy, mũ đỏ): 4 hướng. Minh ở (-72,8), mặt +X (đông).
    // Người chơi đứng lệch sang bên để không che Minh; camera sau lưng người chơi.
    const minhShots = [
      ['front', -68, 9.5, Math.PI / 2, 'Minh TRƯỚC: mặt + mũ lưỡi trai + túi kangaroo'],
      ['back', -76, 9.5, -Math.PI / 2, 'Minh SAU: balô xám sau lưng'],
      ['left', -70.5, 4, Math.PI, 'Minh TRÁI (phía bắc, tay trái)'],
      ['right', -70.5, 12, 0, 'Minh PHẢI (phía nam, tay phải)'],
    ];
    await zoomIn(page);
    for (const [label, x, z, yaw, note] of minhShots) {
      await tp(page, x, z, yaw, 0.18);
      await sleep(1500);
      await shot(page, `r3-av-${MODE}-minh-${label}.png`, note);
    }

    // ---- 10. Cô giáo trong phòng học: trước + bên.
    await page.evaluate(() => window.__bkhn.enterClassroom());
    await sleep(2500);
    await tp(page, 1.0, 0.3, 0, 0.25);
    await sleep(1500);
    await shot(page, `r3-av-${MODE}-teacher-front.png`, 'Cô giáo TRƯỚC: sơ mi trắng + kính + tóc búi, mặt +Z (nam)');
    await tp(page, 0.5, -2, -Math.PI / 2, 0.25);
    await sleep(1500);
    await shot(page, `r3-av-${MODE}-teacher-side.png`, 'Cô giáo nhìn từ phía tây (bên hông)');
    await tp(page, 0.8, -2.3, Math.PI, 0.25);
    await sleep(1500);
    await shot(page, `r3-av-${MODE}-teacher-back.png`, 'Cô giáo nhìn từ phía bắc (sau lưng, búi tóc + trâm)');

    report.durationMs = Date.now() - t0;
    await ctx.close();
  } catch (e) {
    report.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', report.fatal);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
  const okSteps = report.steps.filter((s) => s.ok).length;
  report.summary = { stepsTotal: report.steps.length, stepsPass: okSteps, consoleErrors: report.consoleErrors.length, pageErrors: report.pageErrors.length };
  fs.writeFileSync(path.join(OUT, `r3-av-${MODE}.json`), JSON.stringify(report, null, 2));
  console.log('SUMMARY', JSON.stringify(report.summary));
  console.log('consoleErrors:', JSON.stringify(report.consoleErrors));
  console.log('pageErrors:', JSON.stringify(report.pageErrors));
  process.exit(report.steps.every((s) => s.ok) && report.consoleErrors.length === 0 && report.pageErrors.length === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
