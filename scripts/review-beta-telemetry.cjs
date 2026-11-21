#!/usr/bin/env node
/**
 * scripts/review-beta-telemetry.cjs — Lightweight Production Beta Telemetry Review CLI.
 *
 * Usage:
 *   node scripts/review-beta-telemetry.cjs
 *   node scripts/review-beta-telemetry.cjs --url=https://hust-hsk-rooms.hunganhz179.workers.dev --json
 *   BETA_TELEMETRY_TOKEN=... node scripts/review-beta-telemetry.cjs
 */
'use strict';

const DEFAULT_BASE_URL = 'https://hust-hsk-rooms.hunganhz179.workers.dev';

function parseArg(prefix, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from ${url} (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function main() {
  const baseUrl = parseArg('--url=', DEFAULT_BASE_URL).replace(/\/+$/, '');
  const asJson = process.argv.includes('--json');
  const token = process.env.BETA_TELEMETRY_TOKEN?.trim() || '';
  const headers = {
    Accept: 'application/json',
    Origin: 'https://hustverse.vercel.app',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const [health, rulesets, telemetry] = await Promise.all([
    fetchJson(`${baseUrl}/api/boardgame/health`, headers),
    fetchJson(`${baseUrl}/api/boardgame/rulesets`, headers),
    fetchJson(`${baseUrl}/api/boardgame/telemetry`, headers),
  ]);

  if (asJson) {
    console.log(JSON.stringify({ baseUrl, health, rulesets, telemetry }, null, 2));
    return;
  }

  const s = telemetry.summary || {};
  const op = telemetry.operational || {};
  console.log(`# HUSTVerse — Bóng Đêm KTX Production Beta Telemetry Report`);
  console.log(`- Worker Target       : ${baseUrl}`);
  console.log(`- Environment         : ${health.env ?? 'unknown'}`);
  console.log(`- Catalog / Protocol  : ${health.catalogVersion} / proto v${health.protocolVersion} / ruleset v${health.rulesetVersion}`);
  console.log(`- Beta Enabled        : ${rulesets.betaEnabled ? 'YES' : 'NO'} (${(rulesets.betaAllowedRulesets || []).join(', ') || 'none'})`);
  console.log(`- Active Matches Now  : ${s.activeMatchesNow ?? 0}`);
  console.log(`- Created / Started   : ${s.matchesCreated ?? 0} / ${s.matchesStarted ?? 0}`);
  console.log(`- Completed / Aband.  : ${s.matchesCompleted ?? 0} / ${s.matchesAbandoned ?? 0}`);
  console.log(`- Human Beta Progress : ${s.humanPlaytestProgressCompleted ?? 0} / ${s.humanPlaytestTargetMatches ?? 100} matches`);
  console.log(`- Avg Match Duration  : ${s.avgMatchDurationMs ? `${(s.avgMatchDurationMs / 1000).toFixed(1)}s` : 'N/A'}`);
  console.log('');
  console.log('## Operational Health');
  console.log(`- Disconnections / Reconnects : ${op.disconnections ?? 0} / ${op.reconnectAttempts ?? 0}`);
  console.log(`- Choice / Turn Timeouts      : ${op.pendingChoiceTimeouts ?? 0} / ${op.turnTimeouts ?? 0}`);
  console.log(`- Invalid Actions             : ${op.invalidActionAttempts ?? 0}`);
  console.log(`- Engine / Worker / Unhandled : ${op.engineErrors ?? 0} / ${op.workerErrors ?? 0} / ${op.unhandledExceptions ?? 0}`);
  console.log(`- State Restore / Unexpected  : ${op.stateRestoreFailures ?? 0} / ${op.unexpectedMatchEndings ?? 0}`);
  console.log('');
  console.log('## Ruleset Popularity');
  console.log(`- Created   : ${JSON.stringify(telemetry.rulesetPopularity?.created ?? {})}`);
  console.log(`- Completed : ${JSON.stringify(telemetry.rulesetPopularity?.completed ?? {})}`);
  console.log(`- Players   : ${JSON.stringify(telemetry.playerCountDistribution ?? {})}`);
  console.log(`- Victories : ${JSON.stringify(telemetry.victoryDistribution ?? {})}`);
  if (Array.isArray(telemetry.perCharacterStats) && telemetry.perCharacterStats.length > 0) {
    console.log('');
    console.log('## Per-Character Stats (Finished Matches Only — Top 15 by Appearances)');
    for (const r of telemetry.perCharacterStats.slice(0, 15)) {
      console.log(
        `- ${r.roleId}: ${r.appearances} games · ${r.wins} wins (${r.winRatePct}%) · ${r.survivals} survived · ${r.skillActivations} skill acts`,
      );
    }
  } else if (telemetry.perCharacterStats === null) {
    console.log('');
    console.log('## Per-Character Stats: gated by BETA_TELEMETRY_TOKEN (set env var to view).');
  }
}

main().catch((err) => {
  console.error('Telemetry review failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
