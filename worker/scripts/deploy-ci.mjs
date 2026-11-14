#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SCRIPT_NAME = 'hust-hsk-rooms';
const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
const CWD = process.cwd();
const TEMP_CONFIG = path.join(CWD, '.wrangler.ci.toml');
const DRY_DIST_DIR = path.join(CWD, '.wrangler-dist');

const dryCheckOnly = process.argv.includes('--dry-check');

function scrubSecrets(text, token) {
  let clean = String(text ?? '');
  if (token) {
    clean = clean.split(token).join('[REDACTED]');
  }
  return clean;
}

function runCommand(cmd, args, token) {
  const res = spawnSync(cmd, args, {
    cwd: CWD,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });
  const stdout = scrubSecrets(res.stdout ?? '', token);
  const stderr = scrubSecrets(res.stderr ?? '', token);
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  return {
    ok: res.status === 0,
    status: res.status ?? 1,
    combined: `${stdout}\n${stderr}`.trim(),
  };
}

async function fetchJsonSafe(url, token) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: res.status, ok: res.ok, json };
  } catch (err) {
    return { status: 0, ok: false, json: { error: err instanceof Error ? err.message : String(err) } };
  }
}

function extractBaseToml(rawToml) {
  const idx = rawToml.indexOf('[[migrations]]');
  return (idx === -1 ? rawToml : rawToml.slice(0, idx)).trimEnd() + '\n';
}

function buildTempToml(baseSection, liveTag, existingDoClasses) {
  if (existingDoClasses.includes('BoardGameRoom')) {
    return baseSection;
  }
  if (liveTag) {
    const targetTag = liveTag === 'v2' ? 'v3' : 'v2';
    return (
      `${baseSection}\n` +
      `[[migrations]]\n` +
      `tag = "${liveTag}"\n` +
      `new_sqlite_classes = ["HskRoom"]\n\n` +
      `[[migrations]]\n` +
      `tag = "${targetTag}"\n` +
      `new_sqlite_classes = ["BoardGameRoom"]\n`
    );
  }
  return (
    `${baseSection}\n` +
    `[[migrations]]\n` +
    `tag = "v2"\n` +
    `new_sqlite_classes = ["BoardGameRoom"]\n`
  );
}

function buildWorkerFormData(scriptContent, migrations) {
  const form = new FormData();
  const metadata = {
    main_module: 'index.js',
    compatibility_date: '2025-01-01',
    compatibility_flags: ['nodejs_compat'],
    keep_bindings: ['secret_text', 'secret_key'],
    bindings: [
      { type: 'durable_object_namespace', name: 'HSK_ROOM', class_name: 'HskRoom' },
      { type: 'durable_object_namespace', name: 'BOARD_GAME_ROOM', class_name: 'BoardGameRoom' },
    ],
    ...(migrations ? { migrations } : {}),
  };
  form.set('metadata', JSON.stringify(metadata));
  form.set(
    'index.js',
    new File([scriptContent], 'index.js', { type: 'application/javascript+module' }),
  );
  return form;
}

async function putWorkerDirect({ accountId, token, scriptContent, migrations }) {
  const form = buildWorkerFormData(scriptContent, migrations);
  const res = await fetch(
    `${CF_API_BASE}/accounts/${accountId}/workers/scripts/${SCRIPT_NAME}?excludeScript=true`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    },
  );
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  const errors = Array.isArray(json?.errors) ? json.errors : [];
  const summary = errors.length
    ? errors.map((e) => `${e.code ?? '?'}:${e.message ?? 'unknown'}`).join(' | ')
    : scrubSecrets(text.slice(0, 300), token);
  return { ok: res.ok && Boolean(json?.success), status: res.status, json, summary };
}

function cleanupTempArtifacts() {
  try {
    if (fs.existsSync(TEMP_CONFIG)) fs.unlinkSync(TEMP_CONFIG);
  } catch {
    // ignore cleanup errors
  }
  try {
    if (fs.existsSync(DRY_DIST_DIR)) fs.rmSync(DRY_DIST_DIR, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
}

async function main() {
  cleanupTempArtifacts();

  if (dryCheckOnly) {
    const bundle = runCommand('npx', [
      '--yes',
      'wrangler@3',
      'deploy',
      '--dry-run',
      '--outdir',
      '.wrangler-dist',
    ]);
    const entryOut = path.join(DRY_DIST_DIR, 'index.js');
    if (!bundle.ok || !fs.existsSync(entryOut)) {
      console.error('::error::Dry-check bundle failed to produce .wrangler-dist/index.js');
      process.exit(1);
    }
    const bytes = fs.statSync(entryOut).size;
    console.log(`Dry-check PASS: produced .wrangler-dist/index.js (${bytes} bytes)`);
    return;
  }

  const token = process.env.CLOUDFLARE_API_TOKEN?.trim() || '';
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || '';
  if (!token) {
    console.error('::error::CLOUDFLARE_API_TOKEN is missing.');
    process.exit(1);
  }
  if (!accountId) {
    console.error('::error::CLOUDFLARE_ACCOUNT_ID is missing.');
    process.exit(1);
  }

  const [r1, r2, r3] = await Promise.all([
    fetchJsonSafe(`${CF_API_BASE}/accounts/${accountId}/workers/services/${SCRIPT_NAME}`, token),
    fetchJsonSafe(`${CF_API_BASE}/accounts/${accountId}/workers/scripts`, token),
    fetchJsonSafe(
      `${CF_API_BASE}/accounts/${accountId}/workers/scripts/${SCRIPT_NAME}/settings`,
      token,
    ),
  ]);

  const servicesTag = r1.json?.result?.default_environment?.script?.migration_tag ?? null;
  const scriptsList = Array.isArray(r2.json?.result) ? r2.json.result : [];
  const scriptsItem = scriptsList.find((item) => item?.id === SCRIPT_NAME) ?? null;
  const scriptsTag = scriptsItem?.migration_tag ?? null;
  const settingsTag = r3.json?.result?.migration_tag ?? null;
  const existingDoClasses = Array.isArray(r3.json?.result?.bindings)
    ? r3.json.result.bindings
        .filter((b) => b?.type === 'durable_object_namespace' && typeof b?.class_name === 'string')
        .map((b) => b.class_name)
    : [];

  const liveTag = servicesTag || scriptsTag || settingsTag || null;
  console.log(
    `::notice::Cloudflare preflight: liveTag=${liveTag ?? 'none'}, existingDoClasses=${JSON.stringify(existingDoClasses)}, httpStatuses=[${r1.status},${r2.status},${r3.status}]`,
  );

  const rawToml = fs.readFileSync(path.join(CWD, 'wrangler.toml'), 'utf8');
  const baseSection = extractBaseToml(rawToml);
  const ciToml = buildTempToml(baseSection, liveTag, existingDoClasses);
  fs.writeFileSync(TEMP_CONFIG, ciToml, 'utf8');

  // Attempt A: Wrangler CLI with aligned temporary config
  const initialArgs = ['--yes', 'wrangler@3', 'deploy', '-c', '.wrangler.ci.toml'];
  if (r1.status !== 200) {
    initialArgs.push('--legacy-env', 'true');
  }

  let attemptA = runCommand('npx', initialArgs, token);
  if (!attemptA.ok && r1.status === 200) {
    console.log('Retrying Attempt A with --legacy-env true...');
    attemptA = runCommand(
      'npx',
      ['--yes', 'wrangler@3', 'deploy', '-c', '.wrangler.ci.toml', '--legacy-env', 'true'],
      token,
    );
  }
  if (attemptA.ok) {
    console.log('::notice::Cloudflare Worker deployed cleanly via Wrangler CLI (Attempt A).');
    return;
  }

  // Attempt B: Direct Cloudflare Script Upload API fallback
  console.log('Attempt A failed; building bundle for direct Cloudflare API fallback (Attempt B)...');
  const bundleRes = runCommand(
    'npx',
    ['--yes', 'wrangler@3', 'deploy', '--dry-run', '--outdir', '.wrangler-dist'],
    token,
  );
  const bundledPath = path.join(DRY_DIST_DIR, 'index.js');
  if (!bundleRes.ok || !fs.existsSync(bundledPath)) {
    const errTail = scrubSecrets(bundleRes.combined.slice(-300), token);
    console.error(`::error::Cloudflare deploy failed: dry-run bundle failed: ${errTail}`);
    process.exit(1);
  }
  const scriptContent = fs.readFileSync(bundledPath, 'utf8');

  const candidates = existingDoClasses.includes('BoardGameRoom')
    ? [undefined]
    : [
        {
          ...(liveTag ? { old_tag: liveTag } : { old_tag: 'v1' }),
          new_tag: 'v2',
          new_sqlite_classes: ['BoardGameRoom'],
        },
        {
          new_tag: 'v2',
          new_sqlite_classes: ['BoardGameRoom'],
        },
      ];

  let lastFail = null;
  let deployed = false;
  for (let i = 0; i < candidates.length; i += 1) {
    const res = await putWorkerDirect({
      accountId,
      token,
      scriptContent,
      migrations: candidates[i],
    });
    if (res.ok) {
      deployed = true;
      console.log(
        `::notice::Cloudflare Worker deployed cleanly via direct API fallback (candidate #${i + 1}).`,
      );
      break;
    }
    lastFail = res;
    console.warn(`Attempt B candidate #${i + 1} returned HTTP ${res.status}: ${res.summary}`);
    if (
      !existingDoClasses.includes('BoardGameRoom') &&
      candidates.length === 2 &&
      i === candidates.length - 1 &&
      /already|10074|exists|duplicate/i.test(res.summary)
    ) {
      const noMigRes = await putWorkerDirect({
        accountId,
        token,
        scriptContent,
        migrations: undefined,
      });
      if (noMigRes.ok) {
        deployed = true;
        console.log('::notice::Cloudflare Worker deployed via direct API without migrations.');
        break;
      }
      lastFail = noMigRes;
    }
  }

  if (!deployed) {
    const aTail = scrubSecrets(attemptA.combined.slice(-280).replace(/\s+/g, ' '), token);
    const bSummary = lastFail ? `HTTP ${lastFail.status} ${lastFail.summary}` : 'unknown';
    console.error(
      `::error::Cloudflare deploy failed: AttemptA=[${aTail}] | AttemptB=[${bSummary}]`,
    );
    process.exit(1);
  }

  // Bảo đảm subdomain workers.dev tiếp tục bật (bỏ qua lỗi non-fatal)
  try {
    await fetch(`${CF_API_BASE}/accounts/${accountId}/workers/scripts/${SCRIPT_NAME}/subdomain`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled: true }),
    });
  } catch {
    // non-fatal
  }
}

try {
  await main();
} finally {
  cleanupTempArtifacts();
}
