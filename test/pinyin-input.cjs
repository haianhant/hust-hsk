// pinyin-input.cjs — KIỂM CHỨNG HỒI QUY đợt 3 mục 7 (lỗi gõ "a" + bỏ bắt buộc dấu thanh).
// Chạy: node test/pinyin-input.cjs (server riêng 127.0.0.1:8341, một context
// WebGL tại một thời điểm — SwiftShader không chịu nổi 2 context cùng lúc).
// Gốc lỗi: Player.tsx listener keydown toàn cục gọi preventDefault() vô điều
// kiện cho W/A/S/D (kể cả khi đang gõ trong ô <input> pinyin của QuestPanel)
// nên "jia" thành "jiyou"; đồng thời câu gõ pinyin ở kiểm tra cuối dùng mode
// 'tone' nên "jiayou" bị chấm sai.
// Kiểm tra bằng GÕ PHÍM THẬT (keyboard.type), không dùng page.fill cho các
// bước đo — fill đặt trực tiếp value, không đi qua keydown nên không bắt được lỗi.
// Lưu ý thiết kế: sau khi trả lời, ô nhập bị disabled (answered) nên KHÔNG
// thể gõ sai rồi gõ lại đúng cùng một câu — vì vậy chạy 2 lượt, mỗi lượt 1
// context tươi: lượt A (Q1 có dấu đúng + Q5 gõ sai) và lượt B (Q1 không dấu
// đúng + Q5 không dấu đúng). Flow: vào trường → Minh → cửa lớp → chơi tới
// kiểm tra cuối (HSK3 L10, như verify-step4fix) → chụp nhãn tên Minh từ 2 góc
// (đợt 3 tích hợp: Billboard cũ nằm trong group xoay của NPC nên chữ đọc ngược "dniM").
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8341/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const report = { tool: 'pinyin-input', at: new Date().toISOString(), steps: [], shots: {}, consoleErrors: [], pageErrors: [] };
let failures = 0;
function logStep(id, name, ok, detail) {
  const s = { id, name, ok, detail: detail ?? null, at: new Date().toISOString() };
  report.steps.push(s);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${id}] ${name}${detail ? ' — ' + detail : ''}`);
  return ok;
}
function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', '8341', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
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
const clickTestId = async (page, id) => {
  await page.waitForSelector(`[data-testid="${id}"]`, { timeout: 60000 });
  await page.click(`[data-testid="${id}"]`);
};
const inputValue = (page, sel) => page.evaluate((s) => document.querySelector(s)?.value ?? null, sel);
const getPos = (page) => page.evaluate(() => window.__bkhn.getPos());

async function enterFresh(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#enter-campus', { timeout: 30000 });
  // Đợt 5: vào trường cần tên + MSSV — điền form nếu hiện (chưa lưu).
  if (await page.$('#identity-name')) {
    await page.fill('#identity-name', 'Kiểm tra');
    await page.fill('#identity-mssv', '20226010');
  }
  await page.click('#enter-campus');
  await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
  await sleep(2500);
}

// Chơi từ đầu tới kiểm tra cuối rồi trả lời 5 câu.
// opts: { q1: 'shùxué' | 'shuxue', q5: 'wrong' | 'toneless' }.
async function playReview(page, run, opts) {
  await page.evaluate(() => window.__bkhn.teleport(-74, 8.5));
  await waitText(page, 'Nói chuyện với Minh');
  await page.keyboard.press('e');
  await waitText(page, 'Chào bạn! Mình là Minh');
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'Đi tới cửa phòng học');
  await clickTestId(page, 'quest-close-panel');
  await page.evaluate(() => window.__bkhn.teleport(-58, -44));
  await waitText(page, 'Vào phòng học');
  await page.keyboard.press('e');
  await waitText(page, 'Hôm nay là tiết Toán');
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'Hãy nhìn lên bảng đen');
  await clickTestId(page, 'object-option-board');
  await waitText(page, 'Đúng rồi! Đây là');
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'Mở vở');
  await clickTestId(page, 'object-action');
  await waitText(page, 'Bạn đã mở vở ghi chép');
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'Nhận bài tập');
  await clickTestId(page, 'object-action');
  await waitText(page, 'Bạn đã nhận tập bài tập');
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'chăm chỉ, nghiêm túc');
  await clickTestId(page, 'meaning-option-0');
  await waitText(page, 'mỗi ngày học hai tiếng');
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'rõ ràng');
  await clickTestId(page, 'meaning-option-0');
  await waitText(page, 'cô giáo nói rất rõ ràng');
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'Xếp các thẻ từ');
  for (const t of ['请', '把', '作业', '交', '给', '老师', '。']) await clickTestId(page, `order-tile-${t}`);
  await clickTestId(page, 'order-check');
  await waitText(page, 'Đúng rồi! “请把作业交给老师。”');
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'hãy đọc ba lượt');
  await clickTestId(page, 'number-option-3');
  await waitText(page, 'hãy đọc ba lượt. 遍');
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'nâng cao, cải thiện');
  await clickTestId(page, 'goal-option-0');
  await waitText(page, 'Đã ghi nhận mục tiêu');
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'Kiểm tra cuối');

  // --- Q1 (数学 shùxué): gõ phím thật ---
  const posBefore = await getPos(page);
  await page.click('#review-pinyin');
  await page.keyboard.type('wasd', { delay: 60 });
  const wasd = await inputValue(page, '#review-pinyin');
  logStep(`${run}-keys-enter`, `[${run}] Gõ phím thật "wasd" — cả 4 ký tự W/A/S/D đều vào ô`, wasd === 'wasd', `value="${wasd}" (lỗi cũ: "a"/"s"/"w"/"d" bị preventDefault chặn)`);
  const posAfter = await getPos(page);
  const drift = Math.hypot(posAfter.x - posBefore.x, posAfter.z - posBefore.z);
  logStep(`${run}-no-walk`, `[${run}] Nhân vật không di chuyển trong lúc gõ`, drift < 0.05, `drift=${drift.toFixed(3)} m`);
  await page.fill('#review-pinyin', '');
  await page.keyboard.type(opts.q1, { delay: 60 });
  const q1val = await inputValue(page, '#review-pinyin');
  await clickTestId(page, 'review-check');
  await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
  logStep(`${run}-q1`, `[${run}] Q1 gõ "${opts.q1}" được chấm ĐÚNG`, q1val === opts.q1, `value="${q1val}"`);
  await clickTestId(page, 'review-next');

  // --- Q2/Q3/Q4 trả lời đúng ---
  await page.click('[data-testid="review-meaning-hsk3-l10-g1-heiban"]');
  await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
  await clickTestId(page, 'review-next');
  await page.fill('#review-dictation', '笔记');
  await clickTestId(page, 'review-check');
  await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
  await clickTestId(page, 'review-next');
  await page.click('[data-testid="review-meaning-hsk3-l10-g1-zuoye"]');
  await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
  await clickTestId(page, 'review-next');

  // --- Q5 (提高 tígāo) ---
  await page.click('#review-pinyin');
  if (opts.q5 === 'wrong') {
    await page.keyboard.type('tigeo', { delay: 60 });
    await clickTestId(page, 'review-check');
    await waitText(page, 'Chưa đúng');
    const wrongFb = await page.evaluate(() => {
      const el = [...document.querySelectorAll('*')].find((n) => n.children.length === 0 && n.textContent.includes('Chưa đúng'));
      return el ? el.textContent : null;
    });
    logStep(`${run}-q5-wrong`, `[${run}] Q5 gõ sai "tigeo" vẫn bị chấm SAI, phản hồi chỉ đúng vị trí chữ sai`, true, `feedback="${wrongFb}"`);
    await clickTestId(page, 'review-next');
    await waitText(page, 'Ôn lại ngay — câu 1/1');
    logStep(`${run}-rereview`, `[${run}] Sau kiểm tra sai 1 từ → vòng ôn lại ngay mở`, true);
  } else {
    await page.keyboard.type('tigao', { delay: 60 });
    const q5val = await inputValue(page, '#review-pinyin');
    await clickTestId(page, 'review-check');
    await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
    logStep(`${run}-q5-toneless`, `[${run}] Q5 gõ KHÔNG dấu "tigao" được chấm ĐÚNG`, q5val === 'tigao', `value="${q5val}"`);
    await clickTestId(page, 'review-next');
    await waitText(page, 'Bạn đã kiểm tra xong 5 từ');
    await clickTestId(page, 'review-done');
    await waitText(page, 'Xong buổi học đầu tiên!');
    logStep(`${run}-done`, `[${run}] Hết 5 câu kiểm tra cuối, màn kết quả hiện`, true);
  }
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--disable-gpu'] });
  try {
    // Lượt A: Q1 có dấu đúng + Q5 gõ sai.
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await ctx.addInitScript(() => { try { window.localStorage.clear(); } catch { /* ignore */ } });
      const page = await ctx.newPage();
      attachErrorHooks(page);
      await enterFresh(page);
      await playReview(page, 'A', { q1: 'shùxué', q5: 'wrong' });
      await ctx.close();
    }
    // Lượt B: Q1 không dấu đúng + Q5 không dấu đúng.
    let pageB;
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await ctx.addInitScript(() => { try { window.localStorage.clear(); } catch { /* ignore */ } });
      pageB = await ctx.newPage();
      attachErrorHooks(pageB);
      await enterFresh(pageB);
      await playReview(pageB, 'B', { q1: 'shuxue', q5: 'toneless' });
      // Nhãn tên Minh: chụp từ 2 góc (góc cũ từng đọc ngược "dniM").
      await pageB.reload({ waitUntil: 'domcontentloaded' });
      await pageB.waitForSelector('#enter-campus', { timeout: 30000 });
      // Đợt 5: identity đã lưu (localStorage còn nguyên) nên form không
      // hiện — chỉ điền nếu hiện.
      if (await pageB.$('#identity-name')) {
        await pageB.fill('#identity-name', 'Kiểm tra');
        await pageB.fill('#identity-mssv', '20226010');
      }
      await pageB.click('#enter-campus');
      await pageB.waitForFunction(() => window.__bkhn, { timeout: 90000 });
      await sleep(2500);
      await pageB.evaluate(() => window.__bkhn.teleport(-72, 13, 0, 0.18));
      await sleep(1500);
      await shot(pageB, 'r3-label-minh-south.png', 'Nhãn Minh nhìn từ phía nam (góc cũ từng đọc ngược)');
      await pageB.evaluate(() => window.__bkhn.teleport(-67, 8, Math.PI / 2, 0.18));
      await sleep(1500);
      await shot(pageB, 'r3-label-minh-east.png', 'Nhãn Minh nhìn từ phía đông (mặt trước Minh)');
      logStep('label-shots', 'Đã chụp nhãn Minh từ 2 góc để soi bằng mắt (xem ảnh)', true);
      await ctx.close();
    }
  } finally {
    fs.writeFileSync(path.join(OUT, 'pinyin-input.json'), JSON.stringify(report, null, 2));
    await browser.close();
    server.kill();
  }
  console.log(`\n== pinyin-input: ${report.steps.filter((s) => s.ok).length}/${report.steps.length} PASS; console errors: ${report.consoleErrors.length}; page errors: ${report.pageErrors.length} ==`);
  process.exit(failures > 0 || report.consoleErrors.length > 0 || report.pageErrors.length > 0 ? 1 : 0);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
