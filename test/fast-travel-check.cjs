// fast-travel-check.cjs — KIỂM CHỨNG HỒI QUY dịch chuyển nhanh (đợt 3 giai đoạn 5).
// Chạy: node test/fast-travel-check.cjs (server riêng 127.0.0.1:8340, một context
// WebGL tại một thời điểm — SwiftShader không chịu nổi 2 context cùng lúc).
// Kiểm tra: 6 điểm đến qua nút HUD (đúng vị trí + đúng hướng nhìn + không
// trôi sau khi tới); chuỗi 5 thư viện (đi bộ vào tới mặt cửa phía bắc mới);
// chống bấm chồng (3 lần gọi hook đồng bộ chỉ 1 lần có hiệu lực); dịch
// chuyển khi sổ tay đang mở + đang giữ phím W (không kẹt phím, không tự
// di chuyển); chuỗi 4 (đang lái → C1 → đi bộ tới cửa lớp → vào được phòng
// học, xe về điểm đỗ hợp lệ, không nhân bản); nút "Đi tới đây" trong bảng
// nhiệm vụ; nút Đi nhanh trên bản đồ; tiến độ/điểm/quest không đổi sau
// các lần dịch chuyển thuần túy.
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const BASE = 'http://127.0.0.1:8340/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Dùng ĐÚNG code campus thật (transpile như ride-check.cjs) để kiểm tra điểm
// đến + vị trí xe sau dịch chuyển.
const campusSrc = fs.readFileSync(path.join(ROOT, 'lib/campus.ts'), 'utf8');
const { outputText } = ts.transpileModule(campusSrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const tmpCampus = path.join(__dirname, '_campus-ft.compiled.cjs');
fs.writeFileSync(tmpCampus, outputText);
const campus = require(tmpCampus);
const DESTS = campus.FAST_TRAVEL_DESTINATIONS;
const destById = (id) => DESTS.find((d) => d.id === id);

const report = { tool: 'fast-travel-check', at: new Date().toISOString(), steps: [], shots: {}, consoleErrors: [], pageErrors: [] };
function logStep(id, name, ok, detail) {
  const s = { id, name, ok, detail: detail ?? null, at: new Date().toISOString() };
  report.steps.push(s);
  console.log(`${ok ? 'PASS' : 'FAIL'} [${id}] ${name}${detail ? ' — ' + detail : ''}`);
  return ok;
}
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
function attachErrorHooks(page) {
  page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => report.pageErrors.push(String(e)));
}
async function shot(page, name, note) {
  await page.screenshot({ path: path.join(OUT, name), timeout: 180000 });
  report.shots[name] = { note };
  console.log('shot', name);
}
const waitText = async (page, text, timeout = 60000) => {
  await page.waitForFunction((t) => document.body.innerText.includes(t), text, { timeout });
};
const getPos = (page) => page.evaluate(() => window.__bkhn.getPos());
const getPose = (page) => page.evaluate(() => window.__bkhn.getPose());
const getBike = (page) => page.evaluate(() => window.__bkhn.getBike());
const getYaw = (page) => page.evaluate(() => window.__bkhn.getYaw());
const getFT = (page) => page.evaluate(() => window.__bkhn.getFastTravel());
const inClassroom = (page) => page.evaluate(() => window.__bkhn.isInClassroom());
const getProgress = (page) => page.evaluate(() => {
  const raw = window.localStorage.getItem('bkhn-progress-v1');
  if (!raw) return null;
  const p = JSON.parse(raw);
  return { points: p.points, completed: p.completedQuests, streak: p.streak, questState: p.questState };
});
const angDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
};
// Chờ theo TRẠNG THÁI MÔ PHỎNG (không chờ theo đồng hồ): SwiftShader chỉ
// ~1–2 fps, delta kẹp 0,05 s nên thời gian trong game chậm hơn nhiều so
// với thời gian thực — poll tới khi điều kiện đạt, timeout dài.
async function waitPos(page, pred, timeoutMs = 30000) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < timeoutMs) {
    last = await getPos(page);
    if (pred(last)) return { ok: true, pos: last };
    await sleep(300);
  }
  return { ok: false, pos: last };
}

async function enterFresh(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#enter-campus', { timeout: 30000 });
  await page.click('#enter-campus');
  await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
  await sleep(2500);
}
// Đi nhanh qua nút HUD: mở panel → bấm điểm đến → chờ tới đúng vị trí.
// Chờ theo SỐ LẦN dịch chuyển (fastTravelState.count) rồi mới chờ vị trí:
// điểm bắt đầu trùng vị trí spawn nên chờ vị trí không thôi sẽ "đạt" ngay
// cả khi chuyển cảnh chưa chạy (lỗi race đã bắt được ở lượt chạy 2).
async function uiTravel(page, id) {
  const before = await getFT(page);
  await page.click('#fast-travel');
  await page.click(`[data-testid="fast-travel-${id}"]`);
  const d = destById(id);
  const t0 = Date.now();
  let counted = false;
  while (Date.now() - t0 < 20000) {
    const ft = await getFT(page);
    if (ft.count > before.count) { counted = true; break; }
    await sleep(300);
  }
  if (!counted) return { ok: false, pos: await getPos(page), reason: 'count-khong-tang' };
  const r = await waitPos(page, (p) => Math.hypot(p.x - d.x, p.z - d.z) < 0.15, 20000);
  return r;
}
async function checkDest(page, id) {
  const d = destById(id);
  const pos = await getPos(page);
  const yaw = await getYaw(page);
  const pose = await getPose(page);
  const dPos = Math.hypot(pos.x - d.x, pos.z - d.z);
  const dYaw = angDiff(yaw, d.yaw);
  const dFace = angDiff(pose.facing, d.facing);
  // Không trôi sau khi tới: đứng yên 1,5 s, vị trí không đổi.
  await sleep(1500);
  const pos2 = await getPos(page);
  const drift = Math.hypot(pos2.x - pos.x, pos2.z - pos.z);
  const ok = dPos < 0.15 && dYaw < 0.2 && dFace < 0.2 && drift < 0.05;
  return logStep(`dest-${id}`, `Tới ${d.name} đúng vị trí + hướng nhìn, không trôi`,
    ok, `pos=(${pos.x.toFixed(2)},${pos.z.toFixed(2)}) dPos=${dPos.toFixed(2)} dYaw=${dYaw.toFixed(2)} dFace=${dFace.toFixed(2)} drift=${drift.toFixed(3)}`);
}

(async () => {
  let server = null;
  let browser = null;
  let failed = false;
  const t0 = Date.now();
  try {
    server = await startServer();
    console.log('server lên ở', BASE);
    browser = await chromium.launch({
      executablePath: EXE,
      args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
    });

    // ============ A. Điểm đến hợp lệ theo code campus thật ============
    {
      let allOk = DESTS.length === 6;
      const ids = DESTS.map((d) => d.id).sort().join(',');
      if (ids !== 'c1,c9,lake,library,parabol,spawn') allOk = false;
      for (const d of DESTS) {
        // Điểm hợp lệ = resolveCollisions là điểm bất động (trả về đúng
        // điểm đó). LƯU Ý: C1 (-58,-43.5) nằm đúng ngưỡng chạm của 2
        // collider kề (bậc tam cấp + bệ I LOVE BK) nên resolve vẫn ghi
        // hit='Bệ chữ I LOVE BK' dù vị trí trả về không đổi (moved=0):
        // đó là cân bằng chạm, không phải lún vào vật cản — kiểm bằng
        // moved, không kiểm hit.
        const r = campus.resolveCollisions({ x: d.x, z: d.z }, 0.4);
        const moved = Math.hypot(r.pos.x - d.x, r.pos.z - d.z);
        if (moved > 0.01) {
          allOk = false;
          console.log(`  dest ${d.id} KHÔNG ổn định: hit=${r.hit} moved=${moved.toFixed(2)}`);
        }
      }
      // Thư viện phải ở phía bắc sảnh mới: z < collider khối đế minZ 23,5,
      // trong plaza (minZ 10), trước cửa kính z 26,5.
      const lib = destById('library');
      if (!(lib.z < 23.5 && lib.z >= 10 && lib.z < 26.5)) allOk = false;
      if (!logStep('dests-valid', '6 điểm đến đúng danh sách, resolveCollisions là điểm bất động (trả về đúng điểm)',
        allOk, `ids=${ids} library z=${lib.z} (plaza minZ 10, collider đế minZ 23,5, cửa z 26,5)`)) failed = true;
    }

    // ============ DESKTOP 1280×800 — context 1 ============
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      attachErrorHooks(page);
      await enterFresh(page);
      const prog0 = await getProgress(page);

      // --- B. 6 điểm đến qua nút HUD ---
      const order = ['spawn', 'parabol', 'c9', 'lake', 'library', 'c1'];
      for (const id of order) {
        const r = await uiTravel(page, id);
        if (!r.ok) {
          failed = true;
          logStep(`dest-${id}`, `Tới ${destById(id).name} qua nút HUD`, false, `pos cuối=${JSON.stringify(r.pos)}`);
          continue;
        }
        if (!await checkDest(page, id)) failed = true;
        await shot(page, `r3-ft-${id}.png`, `${destById(id).name} sau khi dịch chuyển tới`);
      }
      // Tiến độ không đổi sau 6 lần dịch chuyển thuần túy.
      const prog1 = await getProgress(page);
      const progSame = JSON.stringify(prog0) === JSON.stringify(prog1);
      if (!logStep('progress-unchanged', 'Dịch chuyển không đổi điểm/quest/streak',
        progSame, `trước=${JSON.stringify(prog0)} sau=${JSON.stringify(prog1)}`)) failed = true;

      // --- C. Chuỗi 5: thư viện sau dựng lại — đi bộ vào tới mặt cửa phía bắc mới ---
      // Điểm đến (38,12.5) nằm ngay trước bệ chữ HUST (bệ x 35,2..40,8 có
      // collider) nên KHÔNG đi thẳng vào được: lách ngang sang tây bằng D
      // (yaw π → D lách về −X) tới x ≤ 34,5, rồi mới đi thẳng (W) về phía
      // nam tới mặt collider khối đế (z ≈ 23,1).
      {
        const r = await uiTravel(page, 'library');
        let ok = r.ok;
        let detail = '';
        if (ok) {
          await page.keyboard.down('d');
          const s = await waitPos(page, (p) => p.x <= 34.5, 120000);
          await page.keyboard.up('d');
          let w = { ok: false, pos: await getPos(page) };
          if (s.ok) {
            await page.keyboard.down('w');
            w = await waitPos(page, (p) => p.z >= 22.8, 120000);
            await page.keyboard.up('w');
          }
          const pos = await getPos(page);
          detail = `pos=(${pos.x.toFixed(2)},${pos.z.toFixed(2)}) lách-tây=${s.ok} collider đế mặt bắc z=23,5, cửa kính z=26,5`;
          ok = s.ok && w.ok && pos.z > 22.8 && pos.z < 23.5 && pos.x > 34 && pos.x < 35.2;
          if (ok) await shot(page, 'r3-ft-library-door.png', 'Đi bộ từ điểm thư viện (vòng qua bệ HUST) tới mặt cửa phía bắc mới');
        }
        if (!logStep('chain-library', 'Chuỗi 5: tới thư viện (phía bắc) rồi đi bộ vào tới cửa', ok, detail)) failed = true;
      }

      // --- D. Chống bấm chồng: 3 lần gọi hook đồng bộ, chỉ 1 lần có hiệu lực ---
      {
        const before = await getFT(page);
        const res = await page.evaluate(() => {
          const h = window.__bkhn;
          return [h.fastTravel('lake'), h.fastTravel('c9'), h.fastTravel('library')];
        });
        const after = await getFT(page);
        const pos = await getPos(page);
        const lake = destById('lake');
        const ok = res[0].ok === true && res[1].reason === 'busy' && res[2].reason === 'busy'
          && after.count === before.count + 1 && after.lastDestId === 'lake'
          && Math.hypot(pos.x - lake.x, pos.z - lake.z) < 0.15;
        if (!logStep('triple-click', 'Bấm Đi nhanh 3 lần liên tiếp: chỉ 1 lần chuyển cảnh có hiệu lực',
          ok, `results=${JSON.stringify(res)} count ${before.count}→${after.count} pos=(${pos.x.toFixed(2)},${pos.z.toFixed(2)})`)) failed = true;
        // Hết khóa (900 ms) thì đi lại được bình thường.
        await sleep(1200);
        const r = await uiTravel(page, 'spawn');
        if (!logStep('triple-click-recover', 'Sau khi hết khóa, đi nhanh lại được bình thường',
          r.ok, r.ok ? '' : `pos=${JSON.stringify(r.pos)}`)) failed = true;
      }

      // --- E. Dịch chuyển khi sổ tay đang mở + đang giữ phím W: không kẹt phím ---
      {
        await page.click('#open-handbook');
        await waitText(page, 'Sổ tay từ vựng', 30000);
        await page.keyboard.down('w');
        await sleep(500);
        await page.click('#fast-travel');
        await page.click('[data-testid="fast-travel-parabol"]');
        const r = await waitPos(page, (p) => {
          const d = destById('parabol');
          return Math.hypot(p.x - d.x, p.z - d.z) < 0.15;
        }, 20000);
        await page.keyboard.up('w');
        let ok = r.ok;
        let detail = '';
        if (ok) {
          // Panel đã đóng chưa (tiêu đề riêng của sổ tay không còn; nút HUD
          // "📖 Sổ tay" thì lúc nào cũng hiện nên không dùng để kiểm).
          const handbookGone = await page.evaluate(() => !document.body.innerText.includes('Sổ tay từ vựng'));
          const p1 = await getPos(page);
          await sleep(2000);
          const p2 = await getPos(page);
          const pose = await getPose(page);
          const drift = Math.hypot(p2.x - p1.x, p2.z - p1.z);
          detail = `handbookGone=${handbookGone} drift=${drift.toFixed(3)} moving=${pose.moving}`;
          ok = handbookGone && drift < 0.05 && !pose.moving;
        }
        if (!logStep('panel-open-travel', 'Dịch chuyển khi sổ tay mở + giữ W: panel đóng, không kẹt phím/tự di chuyển',
          ok, detail)) failed = true;
      }

      // --- F. Chuỗi 4: đang lái → C1 → đi bộ vào điểm học (mở được bảng học) ---
      {
        // Gặp Minh để bắt đầu quest, sang bước đi tới cửa (goto-door).
        await page.evaluate(() => window.__bkhn.teleport(-72, 10, -Math.PI / 2));
        await waitText(page, 'Nói chuyện với Minh', 60000);
        await page.keyboard.press('e');
        await page.waitForSelector('[data-testid="quest-continue"]', { timeout: 30000 });
        await page.click('[data-testid="quest-continue"]');
        await page.waitForSelector('[data-testid="quest-close-panel"]', { timeout: 30000 });
        // Đóng panel, tới gần xe, lên xe. Xe đỗ (-70,14.5): đứng ở (-70,13)
        // thì cách xe 1,5 m < bán kính lên xe 2,2 m (đứng (-70,12) thì cách
        // 2,5 m — ngoài tầm, prompt "Lên xe" không bao giờ hiện).
        await page.click('[data-testid="quest-close-panel"]');
        await page.evaluate(() => window.__bkhn.teleport(-70, 13, 0));
        await waitText(page, 'Lên xe', 60000);
        await page.keyboard.press('e');
        await sleep(500);
        let b = await getBike(page);
        let ok = b.riding === true;
        if (!logStep('chain4-mount', 'Chuỗi 4: lên xe trước khi dịch chuyển', ok, JSON.stringify(b))) failed = true;
        // Dịch chuyển tới C1 khi đang lái.
        const r = await uiTravel(page, 'c1');
        b = await getBike(page);
        const c1 = destById('c1');
        const bikeD = Math.hypot(b.pos.x - c1.x, b.pos.z - c1.z);
        const bikeHit = campus.resolveBikeCollisions(b.pos, 0.55).hit;
        ok = r.ok && b.riding === false && b.instances === 1 && bikeD <= 8.5 && bikeHit === null;
        if (ok) await shot(page, 'r3-ft-bike-c1.png', 'Sau dịch chuyển khi đang lái: người ở C1, xe về điểm đỗ gần đó');
        if (!logStep('chain4-travel', 'Chuỗi 4: đang lái → C1, người đi bộ, xe về điểm đỗ hợp lệ gần đó, không nhân bản',
          ok, `riding=${b.riding} instances=${b.instances} bike=(${b.pos.x.toFixed(1)},${b.pos.z.toFixed(1)}) cách đích ${bikeD.toFixed(1)} m hit=${bikeHit}`)) failed = true;
        // Đi bộ tại C1 (phím D đi ngang quảng trường) rồi tới cửa lớp.
        await page.keyboard.down('d');
        const wD = await waitPos(page, (p) => p.x > -57.3, 60000);
        await page.keyboard.up('d');
        await waitText(page, 'Vào phòng học', 30000);
        await page.keyboard.press('e');
        let inRoom = false;
        const t1 = Date.now();
        while (Date.now() - t1 < 30000) {
          if (await inClassroom(page)) { inRoom = true; break; }
          await sleep(300);
        }
        if (!logStep('chain4-enter', 'Chuỗi 4: đi bộ vào điểm học — bấm E ở cửa C1 mở được phòng học',
          wD.ok && inRoom, `đi ngang ok=${wD.ok} pos=${JSON.stringify(wD.pos)} inClassroom=${inRoom}`)) failed = true;
        if (inRoom) {
          await page.click('#exit-classroom');
          await sleep(1500);
        }
      }

      // Tiến độ cuối: vẫn 0 điểm, chưa hoàn thành quest nào (chỉ đi lại + mở phòng).
      const progEnd = await getProgress(page);
      const progOk = progEnd && progEnd.points === 0 && Object.keys(progEnd.completed ?? {}).length === 0;
      if (!logStep('progress-final', 'Cuối phiên: vẫn 0 điểm, không quest nào tự hoàn thành',
        progOk, JSON.stringify(progEnd))) failed = true;
      await ctx.close();
    }

    // ============ DESKTOP — context 2 (tươi): nút "Đi tới đây" + minimap ============
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      attachErrorHooks(page);
      await enterFresh(page);
      // Tới bước goto-door rồi bấm "Đi tới đây" trong bảng nhiệm vụ.
      await page.evaluate(() => window.__bkhn.teleport(-72, 10, -Math.PI / 2));
      await waitText(page, 'Nói chuyện với Minh', 60000);
      await page.keyboard.press('e');
      await page.waitForSelector('[data-testid="quest-continue"]', { timeout: 30000 });
      await page.click('[data-testid="quest-continue"]');
      await page.waitForSelector('[data-testid="quest-fast-travel"]', { timeout: 30000 });
      const progBefore = await getProgress(page);
      await page.click('[data-testid="quest-fast-travel"]');
      const r = await waitPos(page, (p) => {
        const d = destById('c1');
        return Math.hypot(p.x - d.x, p.z - d.z) < 0.15;
      }, 20000);
      const progAfter = await getProgress(page);
      const panelGone = await page.evaluate(() => !document.body.innerText.includes('Đóng bảng để đi tới lớp'));
      const stepSame = progBefore?.questState?.stepIndex === progAfter?.questState?.stepIndex
        && progBefore?.questState?.stepIndex === 1;
      if (!logStep('quest-goto', '"Đi tới đây" ở bước goto-door: tới Nhà C1, panel đóng, bước quest không tự tiến',
        r.ok && panelGone && stepSame,
        `pos=${JSON.stringify(r.pos)} panelGone=${panelGone} stepIndex ${progBefore?.questState?.stepIndex}→${progAfter?.questState?.stepIndex}`)) failed = true;
      // Nút Đi nhanh trên bản đồ (Minimap) tới Hồ Tiền.
      await page.click('#minimap-fast-travel');
      await page.click('[data-testid="minimap-fast-travel-lake"]');
      const r2 = await waitPos(page, (p) => {
        const d = destById('lake');
        return Math.hypot(p.x - d.x, p.z - d.z) < 0.15;
      }, 20000);
      if (!logStep('minimap-travel', 'Nút Đi nhanh trên bản đồ: tới Hồ Tiền',
        r2.ok, `pos=${JSON.stringify(r2.pos)}`)) failed = true;
      await ctx.close();
    }
  } catch (e) {
    failed = true;
    console.log('FATAL', e);
    report.fatal = String(e && e.stack || e);
  } finally {
    try { fs.unlinkSync(tmpCampus); } catch { /* đã xóa */ }
    if (browser) await browser.close();
    if (server) server.kill();
  }
  const consoleOk = report.consoleErrors.length === 0;
  const pageOk = report.pageErrors.length === 0;
  logStep('console-clean', '0 console error', consoleOk, report.consoleErrors.slice(0, 3).join(' | '));
  logStep('pageerror-clean', '0 page error', pageOk, report.pageErrors.slice(0, 3).join(' | '));
  const passed = report.steps.filter((s) => s.ok).length;
  const total = report.steps.length;
  report.summary = { passed, total, failed, ms: Date.now() - t0 };
  fs.writeFileSync(path.join(OUT, 'fast-travel-check.json'), JSON.stringify(report, null, 2));
  console.log(`\n== fast-travel-check: ${passed}/${total} PASS, ${failed ? 'FAIL' : 'OK'} (${Math.round((Date.now() - t0) / 1000)} s) ==`);
  process.exit(failed || !consoleOk || !pageOk ? 1 : 0);
})();
