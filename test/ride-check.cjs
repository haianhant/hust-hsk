// ride-check.cjs — KIỂM CHỨNG HỒI QUY xe máy (đợt 3 giai đoạn 4).
// Chạy: node test/ride-check.cjs (server riêng 127.0.0.1:8339, một context
// WebGL tại một thời điểm — SwiftShader không chịu nổi 2 context cùng lúc).
// Kiểm tra: đỗ ban đầu + 1 instance; lên xe + tư thế ngồi (góc khớp thô);
// chuỗi lái có log vị trí/tốc độ (ga → rẽ → phanh → xuống xe); gọi xe 3 lần
// không nhân bản; tốc độ tối đa 12–14 m/s; va chạm góc nhà C9 + bờ kè hồ
// (dừng/trượt, không xuyên); xuống xe ở chỗ chật sát bờ hồ (đổi bên);
// "Đưa xe về đường"; mobile 390 px (cụm lái đủ lớn, không chồng joystick).
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const BASE = 'http://127.0.0.1:8339/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Dùng ĐÚNG code campus thật (transpile như leg-sim.cjs) để kiểm tra vị trí
// xe sau "Đưa xe về đường" có nằm trên đường không.
const campusSrc = fs.readFileSync(path.join(ROOT, 'lib/campus.ts'), 'utf8');
const { outputText } = ts.transpileModule(campusSrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const tmpCampus = path.join(__dirname, '_campus-ride.compiled.cjs');
fs.writeFileSync(tmpCampus, outputText);
const campus = require(tmpCampus);

const report = { tool: 'ride-check', at: new Date().toISOString(), steps: [], frames: [], shots: {}, consoleErrors: [], pageErrors: [] };
function logStep(id, name, ok, detail) {
  const s = { id, name, ok, detail: detail ?? null, at: new Date().toISOString() };
  report.steps.push(s);
  console.log(`${ok ? 'PASS' : 'FAIL'} [${id}] ${name}${detail ? ' — ' + detail : ''}`);
  return ok;
}
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
function attachErrorHooks(page) {
  page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => report.pageErrors.push(String(e)));
}
async function shot(page, name, note) {
  await page.screenshot({ path: path.join(OUT, name), timeout: 120000 });
  report.shots[name] = { note };
  console.log('shot', name);
}
const waitText = async (page, text, timeout = 60000) => {
  await page.waitForFunction((t) => document.body.innerText.includes(t), text, { timeout });
};
const getBike = (page) => page.evaluate(() => window.__bkhn.getBike());
const getPose = (page) => page.evaluate(() => window.__bkhn.getPose());
const getPos = (page) => page.evaluate(() => window.__bkhn.getPos());
// Chờ theo TRẠNG THÁI MÔ PHỎNG (không chờ theo đồng hồ): SwiftShader chỉ
// ~1–2 fps, delta kẹp 0,05 s nên thời gian trong game chậm hơn nhiều so
// với thời gian thực — poll tới khi điều kiện đạt, timeout dài.
async function waitBike(page, pred, timeoutMs = 90000) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < timeoutMs) {
    last = await getBike(page);
    if (pred(last)) return { ok: true, bike: last };
    await sleep(300);
  }
  return { ok: false, bike: last };
}

async function enterFresh(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#enter-campus', { timeout: 30000 });
  await page.click('#enter-campus');
  await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
  await sleep(2500);
}
// Lên xe từ vị trí hiện tại: chờ prompt rồi bấm E, kiểm tra riding=true.
async function mount(page) {
  await waitText(page, 'Lên xe');
  await page.keyboard.press('e');
  await sleep(300);
  const b = await getBike(page);
  return b.riding === true;
}

(async () => {
  let server = null;
  let browser = null;
  const t0 = Date.now();
  try {
    server = await startServer();
    console.log('server lên ở', BASE);
    browser = await chromium.launch({
      executablePath: EXE,
      args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
    });

    // ============ DESKTOP 1280×800 ============
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      attachErrorHooks(page);
      await enterFresh(page);

      // --- A. Điểm đỗ ban đầu + 1 instance ---
      const b0 = await getBike(page);
      const parkOk = Math.hypot(b0.pos.x - (-70), b0.pos.z - 14.5) < 0.5 && b0.instances === 1 && b0.riding === false;
      logStep('park', 'Xe đỗ ban đầu (-70, 14.5), đúng 1 instance, chưa ai lái', parkOk, JSON.stringify(b0));
      await page.evaluate(() => window.__bkhn.teleport(-74, 13));
      await sleep(1200);
      await shot(page, 'r3-bike-parked.png', 'Xe đỗ cạnh cổng Parabol, ngoài đường chính');

      // --- Prompt duy nhất: gần xe thì chỉ hiện "Lên xe", không hiện Minh ---
      await page.evaluate(() => window.__bkhn.teleport(-70, 13));
      await waitText(page, 'Lên xe');
      const promptCheck = await page.evaluate(() => {
        const prompts = [...document.querySelectorAll('div')].filter(
          (d) => d.className.includes('animate-pulse') && /Lên xe|Nói chuyện với Minh/.test(d.textContent),
        );
        return { count: prompts.length, texts: prompts.map((p) => p.textContent.slice(0, 60)) };
      });
      logStep('prompt-single', 'Gần xe: chỉ 1 prompt E ("Lên xe"), không chồng prompt Minh',
        promptCheck.count === 1 && promptCheck.texts[0].includes('Lên xe'), JSON.stringify(promptCheck));

      // --- B. Lên xe + tư thế ngồi (góc khớp THÔ từ getPose) ---
      const mounted = await mount(page);
      logStep('mount', 'Bấm E gần xe → riding=true', mounted, `riding=${mounted}`);
      await sleep(1500); // chờ nội suy khớp về tư thế ngồi
      const pose = await getPose(page);
      const poseOk =
        pose.legL < -1.0 && pose.legL > -1.6 &&
        pose.kneeL > 0.9 && pose.kneeL < 1.5 &&
        pose.armL < -0.7 && pose.armL > -1.2 &&
        pose.elbowL < -0.3 && pose.elbowL > -0.8;
      logStep('seated-pose', 'Tư thế ngồi: đùi về trước, gối gập (knee +), tay lên tay lái, khuỷu gập (elbow −)',
        poseOk, `legL=${pose.legL.toFixed(2)} kneeL=${pose.kneeL.toFixed(2)} armL=${pose.armL.toFixed(2)} elbowL=${pose.elbowL.toFixed(2)}`);
      await shot(page, 'r3-bike-mounted.png', 'Người ngồi trên yên, tay lên tay lái, camera sau xe');

      // --- C. Chuỗi lái có log: ga → rẽ trái → phanh → xuống xe ---
      const frames = [];
      const sample = async (label) => {
        const b = await getBike(page);
        frames.push({ label, t: +((Date.now() - t0) / 1000).toFixed(1), x: +b.pos.x.toFixed(2), z: +b.pos.z.toFixed(2), speed: +b.speed.toFixed(2), heading: +b.heading.toFixed(2), steer: +b.steer.toFixed(2), lean: +b.lean.toFixed(2) });
      };
      await sample('mount');
      await page.keyboard.down('w');
      let accOk = false;
      let afterGas = null;
      for (let i = 0; i < 180; i++) {
        await sleep(500);
        await sample('ga');
        afterGas = frames[frames.length - 1];
        if (afterGas.speed > 6) { accOk = true; break; }
      }
      logStep('accelerate', 'Giữ W → tăng tốc mượt, tốc độ > 6 m/s (chờ theo trạng thái mô phỏng)',
        accOk && afterGas.speed <= 14.1, `speed=${afterGas.speed} m/s tại (${afterGas.x}, ${afterGas.z})`);
      await shot(page, 'r3-bike-riding.png', 'Đang lái trên đường chính, tốc độ cao');
      // Rẽ trái (A) trong khi vẫn ga: heading phải tăng (rẽ trái = heading +).
      const headingBefore = (await getBike(page)).heading;
      await page.keyboard.down('a');
      let dH = 0;
      let steerFrame = null;
      for (let i = 0; i < 200; i++) {
        await sleep(300);
        await sample('re-trai');
        steerFrame = frames[frames.length - 1];
        dH = steerFrame.heading - headingBefore;
        while (dH > Math.PI) dH -= Math.PI * 2;
        while (dH < -Math.PI) dH += Math.PI * 2;
        if (dH > 0.15) break;
      }
      await page.keyboard.up('a');
      logStep('steer-left', 'Giữ W+A → heading tăng (rẽ trái), xe nghiêng (lean ≠ 0)',
        dH > 0.15 && Math.abs(steerFrame.lean) > 0.03, `Δheading=${dH.toFixed(2)} rad; lean=${steerFrame.lean}`);
      // Phanh (S): nhả W, giữ S tới khi gần dừng rồi mới nhả (tránh lùi).
      await page.keyboard.up('w');
      await page.keyboard.down('s');
      let braked = false;
      for (let i = 0; i < 200; i++) {
        await sleep(300);
        await sample('phanh');
        const b = await getBike(page);
        if (Math.abs(b.speed) <= 0.5) { braked = true; break; }
      }
      await page.keyboard.up('s');
      const afterBrake = frames[frames.length - 1];
      logStep('brake', 'Giữ S → phanh dừng hẳn (|v| ≤ 0,5 m/s)',
        braked, `speed cuối=${afterBrake.speed} m/s tại (${afterBrake.x}, ${afterBrake.z})`);
      // Xuống xe: người xuất hiện cạnh xe, không kẹt.
      await waitText(page, 'Xuống xe');
      await page.keyboard.press('e');
      await sleep(400);
      const bAfter = await getBike(page);
      const pAfter = await getPos(page);
      const dBike = Math.hypot(pAfter.x - bAfter.pos.x, pAfter.z - bAfter.pos.z);
      logStep('dismount', 'Bấm E khi dừng → riding=false, người đứng cạnh xe (0,8–2 m)',
        bAfter.riding === false && dBike >= 0.8 && dBike <= 2.0, `riding=${bAfter.riding}; cách xe ${dBike.toFixed(2)} m; người ở (${pAfter.x.toFixed(1)}, ${pAfter.z.toFixed(1)})`);
      report.frames = frames;

      // --- D. Xuống xe khi đang chạy thì bị chặn ---
      await page.evaluate((b) => window.__bkhn.teleport(b.pos.x, b.pos.z), bAfter);
      await sleep(500);
      const mounted2 = await mount(page);
      await page.keyboard.down('w');
      const upToSpeed = await waitBike(page, (b) => b.speed > 3, 90000);
      const movingBike = await getBike(page);
      await page.keyboard.press('e'); // E khi đang chạy
      await sleep(300);
      const stillRiding = (await getBike(page)).riding;
      await page.keyboard.up('w');
      await page.keyboard.down('s');
      const stopped2 = await waitBike(page, (b) => Math.abs(b.speed) <= 0.5, 90000);
      await page.keyboard.up('s');
      await page.keyboard.press('e');
      await sleep(400);
      const offNow = (await getBike(page)).riding === false;
      logStep('dismount-blocked-moving', 'E khi đang chạy (v≈' + movingBike.speed.toFixed(1) + ' m/s) → vẫn ngồi trên xe; phanh dừng rồi E → xuống được',
        mounted2 && upToSpeed.ok && stillRiding === true && stopped2.ok && offNow, `riding khi E lúc chạy=${stillRiding}; xuống sau khi dừng=${offNow}`);

      // --- E. Gọi xe 3 lần liên tiếp: vẫn 1 xe ---
      await page.evaluate(() => window.__bkhn.teleport(-40, 10));
      await sleep(800);
      const callResults = [];
      for (let i = 1; i <= 3; i++) {
        await page.click('#call-bike');
        await sleep(600);
        const b = await getBike(page);
        const p = await getPos(page);
        callResults.push({ call: i, instances: b.instances, bikePos: b.pos, distToPlayer: +Math.hypot(b.pos.x - p.x, b.pos.z - p.z).toFixed(2) });
      }
      const callsOk = callResults.every((r) => r.instances === 1 && r.distToPlayer <= 8.5);
      logStep('call-3x', 'Gọi xe 3 lần liên tiếp → vẫn 1 instance, xe tới gần người chơi (≤ 8,5 m)',
        callsOk, JSON.stringify(callResults));

      // --- F. Tốc độ tối đa ~3–4 lần đi bộ ---
      await page.evaluate(() => window.__bkhn.teleport(-70, 10));
      await sleep(500);
      // Xe vừa gọi đang ở gần (-40, 10) — gọi lại về gần đây rồi lên xe.
      await page.click('#call-bike');
      await sleep(600);
      await page.evaluate(() => { const b = window.__bkhn.getBike(); window.__bkhn.teleport(b.pos.x, b.pos.z - 1.5); });
      await sleep(400);
      const mounted3 = await mount(page);
      await page.evaluate(() => window.__bkhn.setBikePose(-70, 10, Math.PI / 2)); // hướng đông, đường thẳng
      let maxSpeed = 0;
      await page.keyboard.down('w');
      {
        const t0w = Date.now();
        while (Date.now() - t0w < 120000) {
          const b = await getBike(page);
          maxSpeed = Math.max(maxSpeed, b.speed);
          if (b.speed >= 13.5) break;
          await sleep(300);
        }
      }
      await page.keyboard.up('w');
      logStep('max-speed', 'Giữ W trên đường thẳng → tốc độ tối đa 12–14 m/s (~3–3,5× đi bộ 4 m/s)',
        mounted3 && maxSpeed >= 12 && maxSpeed <= 14.1, `maxSpeed=${maxSpeed.toFixed(2)} m/s`);
      // Phanh dừng trước khi làm va chạm.
      await page.keyboard.down('s');
      await waitBike(page, (b) => Math.abs(b.speed) <= 0.5, 90000);
      await page.keyboard.up('s');

      // --- G. Va chạm góc nhà C9: đâm vào mặt nam nhà, không xuyên ---
      const colBefore = await page.evaluate(() => window.__bkhn.getPose());
      await page.evaluate(() => window.__bkhn.setBikePose(-40, 12, Math.PI)); // hướng bắc, vào mặt nam C9 (z = 4)
      await page.keyboard.down('w');
      let minZ = Infinity;
      let seenFastC9 = false;
      {
        const t0w = Date.now();
        while (Date.now() - t0w < 90000) {
          const b = await getBike(page);
          minZ = Math.min(minZ, b.pos.z);
          if (b.speed > 3) seenFastC9 = true;
          if (seenFastC9 && Math.abs(b.speed) < 0.5) break;
          await sleep(300);
        }
      }
      await page.keyboard.up('w');
      const bC9 = await getBike(page);
      logStep('collide-c9', 'Đâm vào mặt nam nhà C9: xe dừng ở z ≥ 4,0 (mặt nhà z = 4 + bán kính xe), không xuyên nhà',
        minZ >= 4.0 && bC9.pos.z >= 4.0, `minZ=${minZ.toFixed(2)}; z cuối=${bC9.pos.z.toFixed(2)}; speed cuối=${bC9.speed.toFixed(2)}`);
      await page.keyboard.down('s');
      await waitBike(page, (b) => Math.abs(b.speed) <= 0.5, 90000);
      await page.keyboard.up('s');

      // --- H. Va chạm bờ kè Hồ Tiền: đâm vào bờ đông, không xuống hồ ---
      // (z = 30 để tránh cây liễu (22.2, 10) và ghế (22.3, 20) trên cùng bờ).
      await page.evaluate(() => window.__bkhn.setBikePose(24, 30, -Math.PI / 2)); // hướng tây, vào bờ đông (x = 21,1)
      await page.keyboard.down('w');
      let minX = Infinity;
      let seenFastLake = false;
      {
        const t0w = Date.now();
        while (Date.now() - t0w < 90000) {
          const b = await getBike(page);
          minX = Math.min(minX, b.pos.x);
          if (b.speed > 3) seenFastLake = true;
          if (seenFastLake && Math.abs(b.speed) < 0.5) break;
          await sleep(300);
        }
      }
      await page.keyboard.up('w');
      const bLake = await getBike(page);
      const inLake = campus.pointInLake(bLake.pos, 0);
      logStep('collide-lake', 'Đâm vào bờ kè đông Hồ Tiền: xe dừng ở x ≥ 21,0 (mép kè 21,1 − bán kính), không xuống hồ',
        minX >= 21.0 && !inLake, `minX=${minX.toFixed(2)}; x cuối=${bLake.pos.x.toFixed(2)}; trong hồ=${inLake}`);
      await page.keyboard.down('s');
      await waitBike(page, (b) => Math.abs(b.speed) <= 0.5, 90000);
      await page.keyboard.up('s');

      // --- I. Xuống xe ở chỗ chật sát bờ hồ: bên trái bị kè chặn → sang bên phải ---
      await page.evaluate(() => window.__bkhn.setBikePose(22.3, 40, Math.PI)); // hướng bắc; trái = tây (kè), phải = đông (đường)
      await sleep(300);
      await waitText(page, 'Xuống xe');
      await page.keyboard.press('e');
      await sleep(400);
      const bTight = await getBike(page);
      const pTight = await getPos(page);
      const tightOk = bTight.riding === false && pTight.x > 22.3 && !campus.pointInLake(pTight, 0);
      logStep('dismount-tight', 'Xuống xe sát bờ kè: bên trái bị chặn → người xuất hiện bên phải (đông), không vào hồ/kè',
        tightOk, `người ở (${pTight.x.toFixed(2)}, ${pTight.z.toFixed(2)}); riding=${bTight.riding}`);
      // Va chạm cây: đâm vào thân cây đường tình yêu (28, -19.5) từ phía nam.
      await page.evaluate(() => window.__bkhn.teleport(28, -14));
      await sleep(400);
      await page.click('#call-bike');
      await sleep(800);
      await page.evaluate(() => { const b = window.__bkhn.getBike(); window.__bkhn.teleport(b.pos.x, b.pos.z - 1.5); });
      await sleep(400);
      const mounted4 = await mount(page);
      await page.evaluate(() => window.__bkhn.setBikePose(28, -14, Math.PI)); // hướng bắc, vào cây (28, -19.5)
      await page.keyboard.down('w');
      let treeMinZ = Infinity;
      let seenFastTree = false;
      {
        const t0w = Date.now();
        while (Date.now() - t0w < 90000) {
          const b = await getBike(page);
          treeMinZ = Math.min(treeMinZ, b.pos.z);
          if (b.speed > 3) seenFastTree = true;
          if (seenFastTree && Math.abs(b.speed) < 0.5) break;
          await sleep(300);
        }
      }
      await page.keyboard.up('w');
      const bTree = await getBike(page);
      logStep('collide-tree', 'Đâm vào thân cây đường tình yêu: xe dừng trước thân cây (z ≥ -18,6), không xuyên cây',
        treeMinZ >= -18.7 && bTree.pos.z >= -18.7, `minZ=${treeMinZ.toFixed(2)}; z cuối=${bTree.pos.z.toFixed(2)}`);
      await page.keyboard.down('s');
      await waitBike(page, (b) => Math.abs(b.speed) <= 0.5, 90000);
      await page.keyboard.up('s');
      await page.keyboard.press('e');
      await sleep(400);

      // --- J. "Đưa xe về đường": xe về điểm trên đường gần nhất ---
      const bBeforeRecall = await getBike(page);
      await page.click('#recall-bike');
      await sleep(600);
      const bRecall = await getBike(page);
      const roadPt = campus.nearestRoadPoint(bRecall.pos);
      const roadDist = Math.hypot(bRecall.pos.x - roadPt.x, bRecall.pos.z - roadPt.z);
      logStep('recall-to-road', '"Đưa xe về đường" → xe nằm trên/vệ đường gần nhất (cách tim đường ≤ 1 m)',
        roadDist <= 1.0, `xe từ (${bBeforeRecall.pos.x.toFixed(1)}, ${bBeforeRecall.pos.z.toFixed(1)}) về (${bRecall.pos.x.toFixed(2)}, ${bRecall.pos.z.toFixed(2)}); cách tim đường ${roadDist.toFixed(2)} m`);

      // --- K. Cửa phòng học: xe bị chặn + nhắc xuống xe ---
      await page.evaluate(() => window.__bkhn.teleport(-58, -38));
      await sleep(400);
      await page.click('#call-bike');
      await sleep(600);
      await page.evaluate(() => { const b = window.__bkhn.getBike(); window.__bkhn.teleport(b.pos.x, b.pos.z - 1.5); });
      await sleep(400);
      const mounted5 = await mount(page);
      await page.evaluate(() => window.__bkhn.setBikePose(-58, -38, Math.PI)); // hướng bắc, vào cửa lớp (-58, -45.5)
      await page.keyboard.down('w');
      let doorMinZ = Infinity;
      let seenFastDoor = false;
      let seenNotice = false;
      {
        const t0w = Date.now();
        while (Date.now() - t0w < 90000) {
          const b = await getBike(page);
          doorMinZ = Math.min(doorMinZ, b.pos.z);
          if (b.speed > 3) seenFastDoor = true;
          // Toast nhắc chỉ hiện 2,5 s — phải bắt ngay trong lúc lái, đọc
          // sau khi dừng thì toast đã tắt (không phải lỗi scene).
          if (!seenNotice) {
            const txt = await page.evaluate(() => document.body.innerText);
            if (txt.includes('không vào được phòng học')) seenNotice = true;
          }
          if (seenFastDoor && Math.abs(b.speed) < 0.5) break;
          await sleep(300);
        }
      }
      await page.keyboard.up('w');
      const bDoor = await getBike(page);
      logStep('classroom-door-block', 'Lái vào cửa phòng học: xe dừng trước bệ I LOVE BK / bậc tam cấp (z ≥ -43,5), có nhắc xuống xe',
        mounted5 && doorMinZ >= -43.5 && seenNotice,
        `minZ=${doorMinZ.toFixed(2)}; z cuối=${bDoor.pos.z.toFixed(2)}; có nhắc=${seenNotice}`);
      await page.keyboard.down('s');
      await waitBike(page, (b) => Math.abs(b.speed) <= 0.5, 90000);
      await page.keyboard.up('s');
      await ctx.close();
    }

    // ============ MOBILE 390×844 ============
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      attachErrorHooks(page);
      await enterFresh(page);
      await page.evaluate(() => window.__bkhn.teleport(-70, 13));
      await sleep(800);
      // Nút "Gọi xe" + "Đưa xe về đường" hiện trên mobile.
      const callBtn = await page.evaluate(() => {
        const el = document.querySelector('#call-bike');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      });
      logStep('mobile-call-btn', 'Mobile: nút "Gọi xe" hiện, đủ lớn (cao ≥ 32 px)',
        !!callBtn && callBtn.h >= 32, JSON.stringify(callBtn));
      // Lên xe bằng nút ✋ Tương tác (mobile không có phím E).
      await waitText(page, 'Lên xe');
      await page.click('#interact-button');
      await sleep(400);
      const ridingMobile = (await getBike(page)).riding;
      logStep('mobile-mount', 'Mobile: bấm nút ✋ Tương tác gần xe → lên xe được', ridingMobile === true, `riding=${ridingMobile}`);
      // Cụm lái mobile: 4 nút ≥ 56 px, không chồng joystick / nút Tương tác.
      const m = await page.evaluate(() => {
        const r = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const b = el.getBoundingClientRect();
          return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
        };
        const overlap = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        const gas = r('[data-testid="bike-gas"]');
        const brake = r('[data-testid="bike-brake"]');
        const left = r('[data-testid="bike-left"]');
        const right = r('[data-testid="bike-right"]');
        const interact = r('#interact-button');
        const joy = r('[aria-label="Cần điều khiển di chuyển"]');
        const all = [gas, brake, left, right];
        const overlapInteract = all.some((b) => overlap(b, interact));
        const overlapJoy = all.some((b) => overlap(b, joy));
        return { gas, brake, left, right, interact, joy, overlapInteract, overlapJoy, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth };
      });
      const sizesOk = [m.gas, m.brake, m.left, m.right].every((b) => b && b.w >= 56 && b.h >= 56);
      logStep('mobile-drive-pad', 'Mobile: 4 nút lái (GA/PHANH/◀/▶) ≥ 56 px, không chồng nút Tương tác hay joystick',
        sizesOk && !m.overlapInteract && !m.overlapJoy, JSON.stringify(m));
      // Giữ nút GA thật (pointerdown tổng hợp) → xe tăng tốc; nhả → hết ga.
      await page.evaluate(() => {
        document.querySelector('[data-testid="bike-gas"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });
      const gasUp = await waitBike(page, (b) => b.speed > 3, 60000);
      const speedGas = (await getBike(page)).speed;
      await page.evaluate(() => {
        document.querySelector('[data-testid="bike-gas"]').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      });
      logStep('mobile-gas', 'Mobile: giữ nút GA → xe tăng tốc (v > 3 m/s)',
        gasUp.ok && speedGas > 3, `speed=${speedGas.toFixed(2)} m/s`);
      await page.evaluate(() => {
        document.querySelector('[data-testid="bike-brake"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });
      const brakeDown = await waitBike(page, (b) => Math.abs(b.speed) <= 1, 60000);
      await page.evaluate(() => {
        document.querySelector('[data-testid="bike-brake"]').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      });
      const speedAfterBrake = (await getBike(page)).speed;
      logStep('mobile-brake', 'Mobile: giữ nút PHANH → xe dừng gần hẳn (|v| ≤ 1 m/s)',
        brakeDown.ok && Math.abs(speedAfterBrake) <= 1, `speed=${speedAfterBrake.toFixed(2)} m/s`);
      await shot(page, 'r3-bike-mobile.png', 'Mobile 390 px đang lái: cụm GA/PHANH/lái + chip tốc độ');
      await ctx.close();
    }

    report.durationMs = Date.now() - t0;
  } catch (e) {
    report.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', report.fatal);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
    try { fs.unlinkSync(tmpCampus); } catch { /* bỏ qua */ }
  }
  const okSteps = report.steps.filter((s) => s.ok).length;
  report.summary = { stepsTotal: report.steps.length, stepsPass: okSteps, consoleErrors: report.consoleErrors.length, pageErrors: report.pageErrors.length };
  fs.writeFileSync(path.join(OUT, 'ride-check.json'), JSON.stringify(report, null, 2));
  console.log('SUMMARY', JSON.stringify(report.summary));
  console.log('consoleErrors:', JSON.stringify(report.consoleErrors));
  console.log('pageErrors:', JSON.stringify(report.pageErrors));
  process.exit(report.steps.every((s) => s.ok) && report.consoleErrors.length === 0 && report.pageErrors.length === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
