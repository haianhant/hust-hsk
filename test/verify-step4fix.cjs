// verify-step4fix.cjs — KIỂM CHỨNG LẠI các lỗi Bước 4–5 sau khi sửa (F1–F9 + nút "Ôn lỗi ngay").
// Chạy: node test/verify-step4fix.cjs (server riêng 127.0.0.1:8326, một context
// WebGL tại một thời điểm — SwiftShader không chịu nổi 2 context cùng lúc).
// Lượt B-fix: sai cố ý 2 từ kiểm tra cuối → vòng ôn lại ngay 2 câu → màn kết
// quả liệt kê đủ 2 từ "ôn lại ngày mai" → bấm "Ôn lỗi ngay" mở lại vòng ôn
// lại → sổ tay (F1/F2c/F3) → prompt E (F4) → bảng đen + khôi phục yaw (F5).
// Lượt C-fix: chơi lại từ profile đã hoàn thành → màn kết quả chơi lại không
// tràn nút (F9). Lượt E-fix: mobile 390×844 — banner (F7) + nút "?" (F8).
'use strict';
const { chromium } = require('/home/hatch/workspace/mobile-test/node_modules/playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8326/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-shots');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const report = { tool: 'verify-step4fix', at: new Date().toISOString(), steps: [], shots: {}, consoleErrors: [], pageErrors: [], runs: {} };
function logStep(run, id, name, ok, detail) {
  const s = { run, id, name, ok, detail: detail ?? null, at: new Date().toISOString() };
  report.steps.push(s);
  console.log(`${ok ? 'PASS' : 'FAIL'} [${run}/${id}] ${name}${detail ? ' — ' + detail : ''}`);
  return ok;
}
function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', '8326', '--directory', 'out'], { cwd: ROOT, stdio: 'ignore' });
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
const clickTestId = async (page, id) => {
  await page.waitForSelector(`[data-testid="${id}"]`, { timeout: 60000 });
  await page.click(`[data-testid="${id}"]`);
};
const getProgress = (page) => page.evaluate(() => {
  const raw = window.localStorage.getItem('bkhn-progress-v1');
  return raw ? JSON.parse(raw) : null;
});
const hudPoints = (page) => page.evaluate(() => {
  const m = document.body.innerText.match(/⭐\s*(\d+)\s*điểm/);
  return m ? Number(m[1]) : null;
});
const getPos = (page) => page.evaluate(() => window.__bkhn.getPos());
const rectsOverlap = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

async function enterFresh(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#enter-campus', { timeout: 30000 });
  await page.click('#enter-campus');
  await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
  await sleep(2500);
}
async function goToDoor(page, run) {
  await page.evaluate(() => window.__bkhn.teleport(-74, 8.5));
  await waitText(page, 'Nói chuyện với Minh');
  await page.keyboard.press('e');
  await waitText(page, 'Chào bạn! Mình là Minh');
  logStep(run, 'greet', 'Bấm E gần Minh → panel chào mở', true);
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'Đi tới cửa phòng học');
  await clickTestId(page, 'quest-close-panel');
  await page.evaluate(() => window.__bkhn.teleport(-58, -44));
  await waitText(page, 'Vào phòng học');
  await page.keyboard.press('e');
  await waitText(page, 'Hôm nay là tiết Toán');
  await waitText(page, 'Phòng học mô phỏng');
  logStep(run, 'enter-classroom', 'E ở cửa → fade → vào phòng, bước cô giáo mở', true);
}

// Chơi từ bước cô giáo tới hết kiểm tra cuối. opts.reviewWrong: [0,1] = sai
// Q1 (gõ pinyin không dấu) + Q2 (chọn nghĩa sai). Trả về số câu sai.
async function playClassroom(page, run, opts) {
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
  if (opts.wrongFirst && opts.wrongFirst.renzhen) {
    await clickTestId(page, 'meaning-option-1');
    await waitText(page, 'không phải là học chăm chỉ');
    await clickTestId(page, 'meaning-option-0');
  } else {
    await clickTestId(page, 'meaning-option-0');
  }
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
  if (opts.wrongFirst && opts.wrongFirst.number) {
    await clickTestId(page, 'number-option-2');
    await waitText(page, 'không phải 2 lượt');
    await clickTestId(page, 'number-option-3');
  } else {
    await clickTestId(page, 'number-option-3');
  }
  await waitText(page, 'hãy đọc ba lượt. 遍');
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'nâng cao, cải thiện');
  await clickTestId(page, 'goal-option-0');
  await waitText(page, 'Đã ghi nhận mục tiêu');
  await clickTestId(page, 'quest-continue');
  await waitText(page, 'Kiểm tra cuối');
  // F6 — placeholder ô gõ pinyin Q1 không được chứa đáp án.
  const ph = await page.evaluate(() => document.querySelector('#review-pinyin')?.getAttribute('placeholder'));
  logStep(run, 'f6-placeholder', 'F6: placeholder Q1 không lộ đáp án', ph === 'Nhập pinyin…', `placeholder="${ph}"`);
  if (opts.reviewWrong && opts.reviewWrong.includes(0)) {
    // Sai cố ý Q1 để vào vòng ôn lại ngay. Đợt 3 mục 7: câu gõ pinyin nay
    // chấm mode 'toneless' nên 'shuxue' (không dấu) đã là ĐÚNG — phải gõ
    // sai thật 'shuxie' (sai nguyên âm, sai ở cả 2 mode) mới vào nhánh sai.
    await page.fill('#review-pinyin', 'shuxie');
    await clickTestId(page, 'review-check');
    await waitText(page, 'Chưa đúng');
  } else {
    await page.fill('#review-pinyin', 'shùxué');
    await clickTestId(page, 'review-check');
    await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
  }
  await clickTestId(page, 'review-next');
  if (opts.reviewWrong && opts.reviewWrong.includes(1)) {
    await page.click('[data-testid="review-meaning-hsk3-l10-g1-shuxue"]');
    await waitText(page, 'Chưa đúng');
  } else {
    await page.click('[data-testid="review-meaning-hsk3-l10-g1-heiban"]');
    await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
  }
  await clickTestId(page, 'review-next');
  await page.fill('#review-dictation', '笔记');
  await clickTestId(page, 'review-check');
  await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
  await clickTestId(page, 'review-next');
  await page.click('[data-testid="review-meaning-hsk3-l10-g1-zuoye"]');
  await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
  await clickTestId(page, 'review-next');
  await page.fill('#review-pinyin', 'tígāo');
  await clickTestId(page, 'review-check');
  await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
  await clickTestId(page, 'review-next');
  // Hết 5 câu: sai 2 từ → vào vòng ôn lại ngay; đúng hết → màn "xong kiểm tra".
  if (opts.reviewWrong && opts.reviewWrong.length > 0) {
    await waitText(page, 'Ôn lại ngay — câu 1/2');
    logStep(run, 'f2-rereview-appears', 'F2a: sau kiểm tra cuối sai 2 từ → vòng ôn lại ngay mở (câu 1/2)', true);
    // Câu ôn lại 1: 数学 — câu gốc gõ pinyin → hỏi lại dạng chọn nghĩa.
    await page.click('[data-testid="review-meaning-hsk3-l10-g1-shuxue"]');
    await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
    logStep(run, 'f2-rereview-q1', 'F2a: ôn lại 数学 bằng dạng chọn nghĩa (khác câu cũ gõ pinyin) → đúng', true);
    await clickTestId(page, 'review-next');
    await waitText(page, 'Ôn lại ngay — câu 2/2');
    // Câu ôn lại 2: 黑板 — câu gốc chọn nghĩa → hỏi lại dạng gõ pinyin.
    await page.fill('#review-pinyin', 'hēibǎn');
    await clickTestId(page, 'review-check');
    await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
    logStep(run, 'f2-rereview-q2', 'F2a: ôn lại 黑板 bằng dạng gõ pinyin (khác câu cũ chọn nghĩa) → đúng', true);
    await clickTestId(page, 'review-next');
  } else {
    await waitText(page, 'Bạn đã kiểm tra xong 5 từ và tự nhớ đúng hết');
    await clickTestId(page, 'review-done');
  }
}

// Đo 2 nút cuối màn kết quả có nằm trọn trong panel không (F9).
async function checkResultButtons(page, run, id) {
  const m = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('[data-testid="result-review-now"], [data-testid="result-continue"]')];
    if (btns.length !== 2) return { found: btns.length };
    const panel = btns[0].closest('div[class*="max-h-"]') || btns[0].parentElement?.parentElement;
    const pr = panel.getBoundingClientRect();
    const rs = btns.map((b) => { const r = b.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) }; });
    return {
      found: 2,
      panel: { top: Math.round(pr.top), bottom: Math.round(pr.bottom), scrollH: panel.scrollHeight, clientH: panel.clientHeight },
      btns: rs,
      fullyVisible: rs.every((r) => r.top >= Math.round(pr.top) && r.bottom <= Math.round(pr.bottom)),
      noScrollNeeded: panel.scrollHeight <= panel.clientHeight + 1,
    };
  });
  logStep(run, id, 'F9: 2 nút kết quả nhìn thấy trọn vẹn trong panel ở 1280×800 (không cần cuộn)', m.found === 2 && m.fullyVisible === true, JSON.stringify(m));
  return m;
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

    // ============ RUN B-fix — sai cố ý 2 từ (desktop 1280×800) ===============
    {
      const run = 'B-fix';
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      attachErrorHooks(page);
      const runT0 = Date.now();
      await enterFresh(page);

      // F4 — prompt E khi hộp hướng dẫn đang mở (mặc định desktop).
      await page.evaluate(() => window.__bkhn.teleport(-74, 8.5));
      await waitText(page, 'Nói chuyện với Minh');
      const f4 = await page.evaluate(() => {
        const smallest = (els) => {
          let best = null, bestArea = Infinity;
          for (const el of els) {
            const b = el.getBoundingClientRect();
            const area = b.width * b.height;
            if (area > 0 && area < bestArea) { best = el; bestArea = area; }
          }
          return best;
        };
        // Prompt E mới (06/11): hộp to giữa màn hình, phím E là keycap riêng +
        // tên hành động — tìm theo class animate-pulse chứa tên hành động.
        const prompt = [...document.querySelectorAll('div')].find((d) => d.className.includes('animate-pulse') && d.textContent.includes('Nói chuyện với Minh'));
        const help = smallest([...document.querySelectorAll('div')].filter((d) => d.textContent.includes('Cách di chuyển') && d.textContent.includes('WASD')));
        const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
        const pr = r(prompt), hr = r(help);
        const overlap = !!(pr && hr && pr.x < hr.x + hr.w && hr.x < pr.x + pr.w && pr.y < hr.y + hr.h && hr.y < pr.y + pr.h);
        const actionEl = prompt ? [...prompt.querySelectorAll('span')].find((sp) => sp.textContent.includes('Nói chuyện với Minh')) : null;
        const fontPx = actionEl ? parseFloat(getComputedStyle(actionEl).fontSize) : 0;
        const keycap = prompt ? [...prompt.querySelectorAll('span')].find((sp) => sp.textContent.trim() === 'E') : null;
        return { prompt: pr, help: hr, overlap, promptInView: !!pr && pr.y >= 0 && pr.y + pr.h <= window.innerHeight, promptBig: !!pr && pr.w >= 400 && fontPx >= 24, hasKeycap: !!keycap, fontPx };
      });
      logStep(run, 'f4-prompt', 'F4: prompt E to giữa màn hình (phím E + tên hành động ≥24px, rộng ≥400px), không bị hộp "Cách di chuyển" che', !f4.overlap && f4.promptInView && f4.promptBig && f4.hasKeycap, JSON.stringify(f4));
      await shot(page, 'step4fix-05-prompt-e.png', 'F4: prompt E gần Minh, hộp hướng dẫn đang mở');

      await page.keyboard.press('e');
      await waitText(page, 'Chào bạn! Mình là Minh');
      await clickTestId(page, 'quest-continue');
      await waitText(page, 'Đi tới cửa phòng học');
      await clickTestId(page, 'quest-close-panel');
      await page.evaluate(() => window.__bkhn.teleport(-58, -44));
      await waitText(page, 'Vào phòng học');
      await page.keyboard.press('e');
      await waitText(page, 'Hôm nay là tiết Toán');
      // F5a — ảnh bảng đen từ góc mặc định trong phòng (panel vẫn mở phía dưới).
      await sleep(1500);
      await shot(page, 'step4fix-06-classroom-board.png', 'F5a: bảng đen từ góc camera mặc định trong phòng');
      // F5b — xoay camera trong phòng, đợi lưu yaw, reload → khôi phục yaw.
      // (Làm ngay khi còn dở trong phòng; sau "Học tiếp" đã ra khỏi phòng.)
      await page.evaluate(() => window.__bkhn.teleport(0, 1, 1.2, 0.25));
      await sleep(3500);
      const savedYaw = await page.evaluate(() => {
        const p = JSON.parse(window.localStorage.getItem('bkhn-progress-v1'));
        return p.questState ? p.questState.yaw : null;
      });
      logStep(run, 'f5b-yaw-saved', 'F5b: yaw camera trong phòng được lưu vào tiến độ',
        typeof savedYaw === 'number' && Math.abs(savedYaw - 1.2) < 0.15, `questState.yaw=${savedYaw} (đặt 1.2)`);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#continue-learning', { timeout: 30000 });
      await page.click('#continue-learning');
      await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
      await sleep(2500);
      const yawAfter = await page.evaluate(() => (window.__bkhn.getYaw ? window.__bkhn.getYaw() : null));
      const inRoom = await page.evaluate(() => document.body.innerText.includes('Phòng học mô phỏng'));
      logStep(run, 'f5b-yaw-restored', 'F5b: reload trong phòng → khôi phục yaw (không quay về hướng đông -π/2)',
        inRoom && typeof yawAfter === 'number' && Math.abs(yawAfter - 1.2) < 0.15,
        `trong phòng=${inRoom}; yaw sau reload=${yawAfter} (kỳ vọng ~1.2, hướng đông là ${(-Math.PI / 2).toFixed(2)})`);
      await shot(page, 'step4fix-07-classroom-reload.png', 'F5b: trong phòng sau reload, yaw đã khôi phục');
      await playClassroom(page, run, { wrongFirst: { renzhen: true, number: true }, reviewWrong: [0, 1] });

      // Vòng ôn lại xong → màn kết quả.
      await waitText(page, 'Xong buổi học đầu tiên!');
      const resTxt = await page.evaluate(() => document.body.innerText);
      logStep(run, 'f2-result-lists-wrong', 'F2b: màn kết quả liệt kê đủ 2 từ sai cần ôn, nhãn "ôn lại ngày mai"',
        resTxt.includes('tự nhớ đúng 3/5') && resTxt.includes('数学') && resTxt.includes('黑板') && resTxt.includes('ôn lại ngày mai'),
        `tự nhớ 3/5=${resTxt.includes('tự nhớ đúng 3/5')}; có 数学=${resTxt.includes('数学')}; có 黑板=${resTxt.includes('黑板')}; nhãn ôn lại ngày mai=${resTxt.includes('ôn lại ngày mai')}`);
      const pMid = await getProgress(page);
      const stShu = pMid.lexemes['hsk3-l10-g1-shuxue'];
      const stHei = pMid.lexemes['hsk3-l10-g1-heiban'];
      const reEvents = pMid.events.filter((e) => e.activity === 'review' && e.points === 0);
      logStep(run, 'f2-rereview-no-side-effect', 'F2a: vòng ôn lại 0đ, level vẫn 0, nextDue vẫn ngày mai',
        pMid.points === 76 && stShu.level === 0 && stHei.level === 0 && reEvents.length >= 2,
        `points=${pMid.points} (kỳ vọng 76); shuxue=${JSON.stringify(stShu)}; heiban=${JSON.stringify(stHei)}; event ôn lại 0đ=${reEvents.length}`);
      await shot(page, 'step4fix-01-result.png', 'F2b/F9: màn kết quả lượt sai 2 từ (đã ôn lại ngay)');
      await checkResultButtons(page, run, 'f9-result-first');

      // Nút "Ôn lỗi ngay" (item 10): bấm thật → mở lại vòng hỏi lại đúng 2 từ sai.
      await clickTestId(page, 'result-review-now');
      await waitText(page, 'Ôn lại ngay — câu 1/2');
      const reTxt = await page.evaluate(() => document.body.innerText);
      logStep(run, 'review-now-opens-rereview', 'Nút "Ôn lỗi ngay": mở vòng hỏi lại với đúng từ sai (không mở sổ tay suông)',
        reTxt.includes('Ôn lại ngay') && !reTxt.includes('Sổ tay từ vựng'),
        `mở vòng ôn lại=${reTxt.includes('Ôn lại ngay')}; không mở sổ tay=${!reTxt.includes('Sổ tay từ vựng')}`);
      await page.click('[data-testid="review-meaning-hsk3-l10-g1-shuxue"]');
      await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
      await clickTestId(page, 'review-next');
      await waitText(page, 'Ôn lại ngay — câu 2/2');
      await page.fill('#review-pinyin', 'hēibǎn');
      await clickTestId(page, 'review-check');
      await waitText(page, 'Đúng rồi! Bạn tự nhớ được từ này');
      await clickTestId(page, 'review-next');
      await waitText(page, 'Xong buổi học đầu tiên!');
      logStep(run, 'review-now-roundtrip', '"Ôn lỗi ngay": trả lời đủ 2 câu ôn lại → quay lại màn kết quả', true);
      await page.click('[data-testid="result-continue"]');
      await sleep(1500);
      const pAfter = await getProgress(page);
      logStep(run, 'reward', 'Thưởng +50đ sau Học tiếp (76 → 126)', pAfter.points === 126, `points=${pAfter.points}`);
      fs.writeFileSync('/tmp/bkhn-fix-export.json', JSON.stringify(pAfter));

      // Sổ tay sau khi sai (F1/F2c/F3).
      await page.click('#open-handbook');
      await waitText(page, 'Sổ tay từ vựng');
      await page.click('button:has-text("Cần ôn")');
      await sleep(500);
      const dueTxt = await page.evaluate(() => document.body.innerText);
      const dueCount = (dueTxt.match(/Cần ôn \((\d+)\)/) || [])[1];
      logStep(run, 'f2c-handbook-due', 'F2c: tab "Cần ôn" chứa cả 2 từ sai trong phiên',
        dueCount === '2' && dueTxt.includes('数学') && dueTxt.includes('黑板'),
        `tab Cần ôn (${dueCount}); có 数学=${dueTxt.includes('数学')}; có 黑板=${dueTxt.includes('黑板')}`);
      await shot(page, 'step4fix-03-handbook-due.png', 'F2c/F3: sổ tay tab Cần ôn (2 từ sai)');
      await page.click('button:has-text("Đã nhớ vững")');
      await sleep(400);
      const knownTxt = await page.evaluate(() => document.body.innerText);
      const knownCount = (knownTxt.match(/Đã nhớ vững \((\d+)\)/) || [])[1];
      logStep(run, 'f3-handbook-known', 'F3: tab "Đã nhớ vững" KHÔNG chứa từ vừa sai',
        knownCount === '0' && !knownTxt.includes('数学') && !knownTxt.includes('黑板'),
        `tab Đã nhớ vững (${knownCount}); chứa 数学=${knownTxt.includes('数学')}; chứa 黑板=${knownTxt.includes('黑板')}`);
      await shot(page, 'step4fix-04-handbook-known.png', 'F3: sổ tay tab Đã nhớ vững (0 từ)');
      // F1 — tắt pinyin: pinyin trong câu ví dụ phải biến mất theo.
      await page.click('button:has-text("Pinyin: Hiện")');
      await sleep(500);
      const f1 = await page.evaluate(() => ({
        exampleGone: !document.body.innerText.includes('(wǒ xǐhuān shùxué.)'),
        anyPinyinGone: !document.body.innerText.includes('shùxué'),
      }));
      logStep(run, 'f1-example-pinyin', 'F1: tắt pinyin → pinyin trong câu ví dụ cũng ẩn',
        f1.exampleGone && f1.anyPinyinGone, JSON.stringify(f1));

      // (F5b đã kiểm tra ở đầu lượt, khi còn dở trong phòng.)
      report.runs[run] = { durationMs: Date.now() - runT0, points: pAfter.points };
      await ctx.close();
    }

    // ============ RUN C-fix — chơi lại (seed profile đã hoàn thành) ===========
    // Seed: export của lượt B (chỉ xong tuyến nhóm 1, 126đ) + hoàn thành tuyến
    // nhóm 2–4 (tổng hợp): menu Bài 10 chỉ chơi lại tuyến nhóm 1 khi CẢ HAI
    // quest bài 10 đã xong — còn dở nhóm 2–4 thì bấm Bài 10 sẽ mở nhóm 2–4
    // (routing này do test/smoke-step6.cjs lượt B kiểm chứng). Điểm seed:
    // 126 + 80 (8 đáp án nhóm 2–4 × 10đ lượt đầu) + 50 (thưởng) = 256.
    {
      const run = 'C-fix';
      const baseSeed = JSON.parse(fs.readFileSync('/tmp/bkhn-fix-export.json', 'utf8'));
      baseSeed.completedQuests['l10-g234'] = { at: new Date().toISOString(), points: 50 };
      if (!baseSeed.badges.includes('l10-g234')) baseSeed.badges.push('l10-g234');
      baseSeed.points = (baseSeed.points ?? 0) + 130;
      const seed = JSON.stringify(baseSeed);
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await ctx.addInitScript((snap) => {
        window.localStorage.setItem('bkhn-progress-v1', snap);
      }, seed);
      const page = await ctx.newPage();
      attachErrorHooks(page);
      const runT0 = Date.now();
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('#choose-lesson', { timeout: 30000 });
      await page.click('#choose-lesson');
      await page.click('button:has-text("HSK 3 · Bài 10")');
      await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
      await sleep(2500);
      await waitText(page, 'Chào bạn! Mình là Minh');
      await clickTestId(page, 'quest-continue');
      await waitText(page, 'Đi tới cửa phòng học');
      await clickTestId(page, 'quest-close-panel');
      await page.evaluate(() => window.__bkhn.teleport(-58, -44));
      await waitText(page, 'Vào phòng học');
      await page.keyboard.press('e');
      await waitText(page, 'Hôm nay là tiết Toán');
      await playClassroom(page, run, {});
      await waitText(page, 'Xong buổi học đầu tiên!');
      const resTxt = await page.evaluate(() => document.body.innerText);
      const rewardOneLine = await page.evaluate(() => {
        const ps = [...document.querySelectorAll('p')];
        const el = ps.find((e) => e.textContent.includes('đã nhận ở lần chơi trước'));
        if (!el) return { found: false };
        const r = el.getBoundingClientRect();
        return { found: true, height: Math.round(r.height), text: el.textContent };
      });
      logStep(run, 'f9-reward-one-line', 'F9: chữ thưởng chơi lại gọn 1 dòng',
        rewardOneLine.found && rewardOneLine.height <= 26, JSON.stringify(rewardOneLine));
      const hudBefore = await hudPoints(page);
      logStep(run, 'replay-points', 'Chơi lại: 11 câu × 2đ = 22đ (256 → 278)', hudBefore === 278, `HUD=${hudBefore}`);
      await shot(page, 'step4fix-02-result-replay.png', 'F9: màn kết quả chơi lại ở 1280×800');
      await checkResultButtons(page, run, 'f9-result-replay');
      await page.click('[data-testid="result-continue"]');
      await sleep(1500);
      const pAfter = await getProgress(page);
      logStep(run, 'replay-idempotent', 'Học tiếp lần 2: thưởng KHÔNG cộng lại (giữ 278)', pAfter.points === 278, `points=${pAfter.points}`);
      report.runs[run] = { durationMs: Date.now() - runT0, points: pAfter.points };
      await ctx.close();
    }

    // ============ RUN E-fix — mobile 390×844 (F7/F8) ==========================
    {
      const run = 'E-fix';
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      attachErrorHooks(page);
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('#enter-campus', { timeout: 30000 });
      await page.click('#enter-campus');
      await page.waitForFunction(() => window.__bkhn, { timeout: 90000 });
      await sleep(3000);
      const m = await page.evaluate(() => {
        const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
        const smallest = (els) => {
          let best = null, bestArea = Infinity;
          for (const el of els) {
            const b = el.getBoundingClientRect();
            const area = b.width * b.height;
            if (area > 0 && area < bestArea) { best = el; bestArea = area; }
          }
          return best;
        };
        const banner = smallest([...document.querySelectorAll('div')].filter((d) => d.textContent.includes('Chưa có giọng tiếng Trung')));
        const points = [...document.querySelectorAll('div')].find((d) => /⭐\s*0 điểm/.test(d.textContent) && d.children.length === 0);
        const q = document.querySelector('button[aria-label="Mở hướng dẫn"]');
        const interact = document.querySelector('#interact-button');
        return { banner: r(banner), points: r(points), q: r(q), interact: r(interact), scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth };
      });
      const bannerOverlap = rectsOverlap(m.banner, m.points);
      logStep(run, 'f7-banner', 'F7: banner thiếu giọng không che chip điểm trên mobile 390 px',
        !!m.banner && !bannerOverlap, `banner=${JSON.stringify(m.banner)}; chip điểm=${JSON.stringify(m.points)}; chồng lấn=${bannerOverlap}`);
      const qOverlap = rectsOverlap(m.q, m.interact);
      logStep(run, 'f8-help-btn', 'F8: nút "?" không đè lên nút "Tương tác" trên mobile 390×844',
        !!m.q && !!m.interact && !qOverlap, `?=${JSON.stringify(m.q)}; Tương tác=${JSON.stringify(m.interact)}; chồng lấn=${qOverlap}`);
      logStep(run, 'mobile-overflow', 'Mobile không tràn ngang', m.scrollW === m.innerW, `scrollWidth=${m.scrollW}, innerWidth=${m.innerW}`);
      await shot(page, 'step4fix-08-mobile.png', 'F7/F8: mobile 390×844 trong trường (banner + nút ?)');
      await ctx.close();
    }

    report.durationMs = Date.now() - t0;
  } catch (e) {
    report.fatal = String(e && e.stack ? e.stack : e);
    console.error('FATAL', report.fatal);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
  const okSteps = report.steps.filter((s) => s.ok).length;
  report.summary = { stepsTotal: report.steps.length, stepsPass: okSteps, consoleErrors: report.consoleErrors.length, pageErrors: report.pageErrors.length };
  fs.writeFileSync(path.join(OUT, 'verify-step4fix.json'), JSON.stringify(report, null, 2));
  console.log('SUMMARY', JSON.stringify(report.summary));
  console.log('consoleErrors:', JSON.stringify(report.consoleErrors));
  console.log('pageErrors:', JSON.stringify(report.pageErrors));
  process.exit(report.steps.every((s) => s.ok) && report.consoleErrors.length === 0 && report.pageErrors.length === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
