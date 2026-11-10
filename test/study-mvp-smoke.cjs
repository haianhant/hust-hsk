// ---------------------------------------------------------------------------
// test/study-mvp-smoke.cjs — Focused Playwright browser smoke test for PR7
// Study Experience MVP:
// 1. Enter campus
// 2. Open Study Panel & add study task
// 3. Start a focus session
// 4. Pause / resume
// 5. Refresh the page
// 6. Restore the session
// 7. Switch to Zen 2D
// 8. Return to 3D (preserving player position & facing)
// 9. Verify existing HUD and campus interactions remain functional
// ---------------------------------------------------------------------------
'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_CORE_PATH,
    'playwright',
    'playwright-core',
    '/home/bao/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-linux-x64/node_modules/playwright-core',
    '/home/hatch/workspace/mobile-test/node_modules/playwright-core',
  ].filter(Boolean);

  for (const mod of candidates) {
    try {
      return require(mod);
    } catch {
      // Try next candidate
    }
  }
  throw new Error('Could not resolve playwright or playwright-core');
}

function resolveBrowserExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell',
  ].filter(Boolean);

  for (const exe of candidates) {
    if (fs.existsSync(exe)) return exe;
  }
  return undefined;
}

const PORT = 8347;
const BASE_URL = `http://127.0.0.1:${PORT}/`;
const ROOT = path.join(__dirname, '..');
const SHOT_DIR = process.env.SHOT_DIR || path.join(ROOT, 'test-shots');

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'out'], {
      cwd: ROOT,
      stdio: 'ignore',
    });
    proc.on('error', reject);
    const t0 = Date.now();
    const check = () => {
      fetch(BASE_URL, { method: 'HEAD' })
        .then(() => resolve(proc))
        .catch(() => {
          if (Date.now() - t0 > 15000) {
            reject(new Error('Static server did not start within 15s'));
          } else {
            setTimeout(check, 250);
          }
        });
    };
    check();
  });
}

async function run() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const { chromium } = loadPlaywright();
  const executablePath = resolveBrowserExecutable();
  const server = await startStaticServer();

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader'],
    });

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    // 1. Enter campus
    console.log('[1/9] Navigating to HUST 3D Campus and entering...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('#enter-campus').click();
    await page.waitForFunction(() => Boolean(window.__bkhn && window.__bkhn.getPos), null, {
      timeout: 30000,
    });
    const initialPos = await page.evaluate(() => window.__bkhn.getPos());
    assert.equal(Math.round(initialPos.x), 96);
    assert.equal(Math.round(initialPos.z), -6);
    console.log('  PASS: Entered campus at Cổng Trần Đại Nghĩa:', initialPos);

    // Move player slightly to verify position preservation across Zen 2D later
    await page.evaluate(() => window.__bkhn.teleport(84, -6, 1.25));
    const movedPos = await page.evaluate(() => window.__bkhn.getPos());
    assert.equal(Math.round(movedPos.x), 84);

    // 2. Open Study Panel & add task
    console.log('[2/9] Opening Study Panel ("🍅 Tự học") and adding task...');
    const openStudyBtn = page.locator('[data-testid="open-study-panel"]');
    await openStudyBtn.waitFor({ state: 'visible', timeout: 10000 });
    await openStudyBtn.click();

    const studyPanel = page.locator('[data-testid="study-panel"]');
    await studyPanel.waitFor({ state: 'visible', timeout: 10000 });

    await page.locator('[data-testid="study-subject-input"]').fill('Ôn HSK 4 · Bài 5');
    await page.locator('[data-testid="study-hsk-lesson-select"]').selectOption('hsk4-shang-l5');
    await page.locator('[data-testid="study-task-input"]').fill('Ghi nhớ 15 từ mới Bài 5');
    await page.locator('[data-testid="study-task-add"]').click();

    const taskCountText = await page.locator('[data-testid="study-task-counter"]').innerText();
    assert.equal(taskCountText.trim(), '0/1 hoàn thành');
    console.log('  PASS: Study Panel opened, subject, canonical HSK lesson & task added.');

    // 3. Start a focus session & verify zero localStorage writes on countdown UI ticks
    console.log('[3/9] Starting Pomodoro focus session...');
    await page.locator('[data-testid="pomodoro-start"]').click();
    const phaseBadgeText = await page.locator('[data-testid="pomodoro-phase-badge"]').innerText();
    assert.ok(phaseBadgeText.includes('Đang Tập trung'));

    await page.evaluate(() => {
      window.__studySetItemCalls = 0;
      const origSetItem = window.Storage.prototype.setItem;
      window.Storage.prototype.setItem = function (k, v) {
        if (k === 'bkhn_study_session_v1') {
          window.__studySetItemCalls += 1;
        }
        return origSetItem.call(this, k, v);
      };
    });
    await new Promise((r) => setTimeout(r, 1500));
    const tickWrites = await page.evaluate(() => window.__studySetItemCalls);
    assert.equal(tickWrites, 0, 'Must not write StudySessionState to localStorage on UI ticks');
    const storedLessonId = await page.evaluate(
      () => JSON.parse(window.localStorage.getItem('bkhn_study_session_v1')).linkedHskLessonId,
    );
    assert.equal(storedLessonId, 'hsk4-shang-l5');
    await page.screenshot({ path: path.join(SHOT_DIR, 'pr7-01-study-panel-focus.png') });
    console.log('  PASS: Focus session started (0 localStorage writes during 1.5s countdown ticks).');

    // 4. Pause / resume
    console.log('[4/9] Testing Pause and Resume...');
    await page.locator('[data-testid="pomodoro-pause"]').click();
    const pausedBadge = await page.locator('[data-testid="pomodoro-phase-badge"]').innerText();
    assert.ok(pausedBadge.includes('Đã tạm dừng'));

    await page.locator('[data-testid="pomodoro-resume"]').click();
    const resumedBadge = await page.locator('[data-testid="pomodoro-phase-badge"]').innerText();
    assert.ok(!resumedBadge.includes('Đã tạm dừng'));
    console.log('  PASS: Pause and Resume verified.');

    // 5. Refresh the page
    console.log('[5/9] Refreshing the page during active focus session...');
    await page.reload({ waitUntil: 'domcontentloaded' });

    // 6. Restore the session
    console.log('[6/9] Re-entering campus and verifying restored study session...');
    await page.locator('#enter-campus').click();
    await page.waitForFunction(() => Boolean(window.__bkhn && window.__bkhn.getPos), null, {
      timeout: 30000,
    });
    const hudStudyBtnText = await page.locator('[data-testid="open-study-panel"]').innerText();
    assert.ok(hudStudyBtnText.includes('🍅 Tự học ·'));

    await page.locator('[data-testid="open-study-panel"]').click();
    await studyPanel.waitFor({ state: 'visible', timeout: 10000 });
    const restoredSubject = await page.locator('[data-testid="study-subject-input"]').inputValue();
    assert.equal(restoredSubject, 'Ôn HSK 4 · Bài 5');
    const restoredTaskCounter = await page.locator('[data-testid="study-task-counter"]').innerText();
    assert.equal(restoredTaskCounter.trim(), '0/1 hoàn thành');
    const restoredPhase = await page.locator('[data-testid="pomodoro-phase-badge"]').innerText();
    assert.ok(restoredPhase.includes('Đang Tập trung'));
    console.log('  PASS: Session, timer, subject, and tasks restored after reload.');

    // Teleport to a distinctive coordinate before switching to Zen 2D
    await page.evaluate(() => window.__bkhn.teleport(82, -6, 1.1));
    const posBeforeZen = await page.evaluate(() => window.__bkhn.getPos());

    // 7. Switch to Zen 2D
    console.log('[7/9] Switching to Zen 2D mode...');
    await page.locator('[data-testid="focus-mode-zen-2d"]').click();
    const zenView = page.locator('[data-testid="zen-2d-view"]');
    await zenView.waitFor({ state: 'visible', timeout: 10000 });
    const canvasCountInZen = await page.locator('canvas').count();
    assert.equal(canvasCountInZen, 0, '3D WebGL Canvas must be unmounted in Zen 2D');
    await page.screenshot({ path: path.join(SHOT_DIR, 'pr7-02-zen-2d-mode.png') });
    console.log('  PASS: Zen 2D active and 3D WebGL Canvas unmounted (count = 0).');

    // 8. Return to 3D
    console.log('[8/9] Returning from Zen 2D to 3D Campus...');
    await page.locator('[data-testid="exit-zen-2d"]').click();
    await page.waitForFunction(() => document.querySelectorAll('canvas').length > 0 && Boolean(window.__bkhn), null, {
      timeout: 20000,
    });
    const posAfterZen = await page.evaluate(() => window.__bkhn.getPos());
    assert.equal(Math.round(posAfterZen.x), Math.round(posBeforeZen.x));
    assert.equal(Math.round(posAfterZen.z), Math.round(posBeforeZen.z));
    await page.screenshot({ path: path.join(SHOT_DIR, 'pr7-03-returned-to-3d.png') });
    console.log('  PASS: Returned to 3D Campus with position preserved:', posAfterZen);

    // 9. Verify existing HUD and campus interactions remain functional
    console.log('[9/9] Verifying HUD controls (Minimap 210x210, Lofi Chill, Handbook, Time of Day)...');
    const minimapBox = await page.locator('[data-testid="minimap"] canvas').boundingBox();
    assert.ok(minimapBox && minimapBox.width >= 200 && minimapBox.height >= 200, 'Minimap should be enlarged (~210x210px)');
    assert.equal(await page.locator('#interact-button').count(), 0, 'Bottom-right interact button should be removed');
    assert.equal(await page.locator('#call-bike').count(), 0, 'Call bike button should be removed');
    assert.equal(await page.locator('#recall-bike').count(), 0, 'Recall bike button should be removed');
    assert.equal(await page.locator('#fast-travel').count(), 0, 'Fast travel button should be removed');

    const lofiBtn = page.locator('#toggle-lofi');
    await lofiBtn.waitFor({ state: 'visible', timeout: 5000 });
    await lofiBtn.click();

    await page.locator('#open-handbook').click();
    await page.waitForFunction(() => document.body.innerText.includes('Sổ tay'), null, {
      timeout: 5000,
    });

    assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.join('; ')}`);
    console.log('ALL 9 SMOKE TEST STEPS PASSED!');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

run().catch((err) => {
  console.error('SMOKE TEST FAILED:', err);
  process.exit(1);
});
