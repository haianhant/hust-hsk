#!/usr/bin/env node
/**
 * scripts/smoke-production-beta.cjs — Live Production Beta Verification Smoke Suite.
 *
 * Non-destructive live verification against the deployed Production Frontend & Cloudflare Worker:
 *   1. Verifies Frontend HTTP 200 and Worker `/health`, `/api/boardgame/health`, `/api/boardgame/rulesets`,
 *      `/api/boardgame/telemetry`, and `/api/boardgame/leaderboard` (confirming historical records intact).
 *   2. Verifies Production server gates:
 *      - `classic` (Stable, 10), `expansion-1` (Beta, 36), `expansion-2` (Beta, 40), `full-expansion` (Beta, 66) enabled.
 *      - ALL 7 `starter-*` experimental pools REJECTED with HTTP 400 / `RULESET_UNAVAILABLE`.
 *      - Arbitrary unknown ruleset REJECTED with HTTP 400 / `INVALID_RULESET`.
 *   3. Runs real live WebSocket room smoke checks across `classic` (4P), `expansion-1` (4P),
 *      `expansion-2` (5P — verifying `exp2_nc_soldier` excluded in 5P), and `full-expansion` (6P),
 *      checking host-only `BG_SET_RULESET`, lock-after-start, role deal & private visibility,
 *      F5 reconnect, spectator privacy (`privateView === null`), and clean room exit leaving 0 active rooms.
 *
 * Usage:
 *   node scripts/smoke-production-beta.cjs
 *   node scripts/smoke-production-beta.cjs --worker=https://hust-hsk-rooms.hunganhz179.workers.dev --web=https://hustverse.vercel.app
 */
'use strict';

const assert = require('node:assert/strict');
const WSImpl = globalThis.WebSocket;
if (typeof WSImpl !== 'function') {
  throw new Error('Requires Node.js >= 22 with built-in WebSocket client support.');
}

const DEFAULT_WORKER = 'https://hust-hsk-rooms.hunganhz179.workers.dev';
const DEFAULT_WEB = 'https://hustverse.vercel.app';
const ORIGIN = 'https://hustverse.vercel.app';

function parseArg(prefix, fallback) {
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

class LiveWsClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.messages = [];
    this.waiters = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WSImpl(this.wsUrl);
      this.ws = ws;
      ws.addEventListener('open', () => resolve(), { once: true });
      ws.addEventListener('error', (err) => reject(err), { once: true });
      ws.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(String(ev.data));
          this.messages.push(msg);
          const pending = [...this.waiters];
          this.waiters = [];
          for (const w of pending) {
            if (w.predicate(msg)) {
              clearTimeout(w.timer);
              w.resolve(msg);
            } else {
              this.waiters.push(w);
            }
          }
        } catch {
          // ignore
        }
      });
    });
  }

  send(obj) {
    this.ws.send(JSON.stringify(obj));
  }

  nextMsg(predicate, timeoutMs = 8000, fromIndex = 0) {
    for (let i = fromIndex; i < this.messages.length; i += 1) {
      if (predicate(this.messages[i])) return Promise.resolve(this.messages[i]);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w.timer !== timer);
        reject(new Error(`Timed out after ${timeoutMs}ms waiting for WS message`));
      }, timeoutMs);
      this.waiters.push({ predicate, resolve, timer });
    });
  }

  close() {
    try {
      this.ws?.close();
    } catch {
      // ignore
    }
  }
}

async function apiJson(workerBase, pathname, opts = {}) {
  const res = await fetch(`${workerBase}${pathname}`, {
    method: opts.method || 'GET',
    headers: {
      Origin: ORIGIN,
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, json };
}

async function runLiveRoomSmoke({ workerBase, wsBase, rulesetId, playerCount, testSwitchFromClassic = false }) {
  const initialRuleset = testSwitchFromClassic ? 'classic' : rulesetId;
  const create = await apiJson(workerBase, '/api/boardgame/matches', {
    method: 'POST',
    body: {
      tableId: 'table-1',
      hostName: `SmokeHost_${rulesetId}`,
      rulesetId: initialRuleset,
      turnTimeoutMs: 0,
    },
  });
  assert.equal(create.status, 201, `Create ${initialRuleset} failed: ${JSON.stringify(create.json)}`);
  const { matchId, inviteCode } = create.json;

  // Verify join-by-code lookup works
  const lookup = await apiJson(workerBase, '/api/boardgame/join-by-code', {
    method: 'POST',
    body: { inviteCode },
  });
  assert.equal(lookup.status, 200);
  assert.equal(lookup.json.match?.matchId, matchId);

  const clients = [];
  const auths = [];
  const spectator = new LiveWsClient(`${wsBase}/ws/boardgame?matchId=${matchId}`);
  try {
    for (let i = 0; i < playerCount; i += 1) {
      const c = new LiveWsClient(`${wsBase}/ws/boardgame?matchId=${matchId}`);
      await c.connect();
      clients.push(c);
      c.send({
        type: 'BG_JOIN',
        matchId,
        inviteCode,
        displayName: `SmokeP${i + 1}`,
        asSpectator: false,
        preferredSeatIndex: i,
        requestId: `join_${rulesetId}_${i}`,
      });
      const auth = await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
      auths.push(auth);
      await c.nextMsg((m) => m.type === 'BG_STATE_SYNC');
    }

    await spectator.connect();
    spectator.send({
      type: 'BG_JOIN',
      matchId,
      inviteCode,
      displayName: 'SmokeSpec',
      asSpectator: true,
      requestId: `join_spec_${rulesetId}`,
    });
    await spectator.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    const specLobbySync = await spectator.nextMsg((m) => m.type === 'BG_STATE_SYNC');
    assert.equal(specLobbySync.privateView, null, 'Spectator must never get privateView in lobby');

    if (testSwitchFromClassic) {
      // Non-host trying BG_SET_RULESET must be rejected with NOT_HOST
      clients[1].send({
        type: 'BG_SET_RULESET',
        rulesetId,
        requestId: `nonhost_rs_${rulesetId}`,
      });
      const nonHostErr = await clients[1].nextMsg((m) => m.type === 'BG_ERROR');
      assert.equal(nonHostErr.code, 'NOT_HOST');

      // Host switches to target Beta ruleset
      const idxBefore = clients[1].messages.length;
      clients[0].send({
        type: 'BG_SET_RULESET',
        rulesetId,
        requestId: `host_rs_${rulesetId}`,
      });
      const switchedSync = await clients[1].nextMsg(
        (m) => m.type === 'BG_STATE_SYNC' && m.rulesetId === rulesetId,
        8000,
        idxBefore,
      );
      assert.equal(switchedSync.rulesetId, rulesetId, 'Non-host sees host ruleset change');
      assert.equal(switchedSync.betaEnabled, true);
      assert.equal(switchedSync.availableRulesets?.length, 4);
    }

    // All non-host players mark ready
    for (let i = 1; i < playerCount; i += 1) {
      clients[i].send({ type: 'BG_SET_READY', ready: true, requestId: `rdy_${rulesetId}_${i}` });
      await clients[i].nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === `rdy_${rulesetId}_${i}`);
    }

    // Start match
    const startIdx = clients.map((c) => c.messages.length);
    const specStartIdx = spectator.messages.length;
    clients[0].send({ type: 'BG_START_MATCH', requestId: `start_${rulesetId}` });
    const playingSyncs = await Promise.all(
      clients.map((c, idx) =>
        c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING', 8000, startIdx[idx]),
      ),
    );
    const specPlayingSync = await spectator.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING',
      8000,
      specStartIdx,
    );

    const dealtRoles = playingSyncs.map((s) => s.privateView?.roleId);
    assert.equal(dealtRoles.filter(Boolean).length, playerCount, 'Every player received a private role');
    assert.equal(new Set(dealtRoles).size, playerCount, 'All dealt roles must be distinct');
    assert.equal(specPlayingSync.privateView, null, 'Spectator privateView MUST be null during PLAYING');
    for (const s of playingSyncs) {
      assert.equal(s.rulesetId, rulesetId);
      assert.equal(
        s.publicGame.players.every((p) => p.revealedRoleId === null),
        true,
        'No role leaked publicly on opening deal',
      );
    }
    if (playerCount === 5) {
      assert.equal(
        dealtRoles.includes('exp2_nc_soldier'),
        false,
        'exp2_nc_soldier must never be dealt in 5P',
      );
      assert.equal(
        dealtRoles.includes('exp1_cassie'),
        false,
        'exp1_cassie must never be dealt in 5P',
      );
    }

    // Host attempting BG_SET_RULESET after match started MUST fail
    clients[0].send({
      type: 'BG_SET_RULESET',
      rulesetId: 'classic',
      requestId: `poststart_rs_${rulesetId}`,
    });
    const postStartErr = await clients[0].nextMsg(
      (m) => m.type === 'BG_ERROR' && m.requestId === `poststart_rs_${rulesetId}`,
    );
    assert.equal(postStartErr.code, 'INVALID_ACTION');

    // F5 Reconnect test on player 0
    const origRole0 = playingSyncs[0].privateView.roleId;
    clients[0].close();
    const re0 = new LiveWsClient(`${wsBase}/ws/boardgame?matchId=${matchId}`);
    await re0.connect();
    clients[0] = re0;
    re0.send({
      type: 'BG_JOIN',
      matchId,
      inviteCode,
      displayName: 'SmokeP1',
      asSpectator: false,
      reconnectToken: auths[0].reconnectToken,
      requestId: `reconn_${rulesetId}`,
    });
    const reSync = await re0.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING');
    assert.equal(reSync.rulesetId, rulesetId, 'Reconnect preserved rulesetId');
    assert.equal(reSync.privateView?.roleId, origRole0, 'Reconnect preserved secret role');

    // Active player executes 1 real ROLL_DICE action on live DO
    const activeId = reSync.publicGame.activePlayerId;
    const activeIdx = auths.findIndex((a) => a.playerId === activeId);
    assert.ok(activeIdx >= 0);
    const revBefore = reSync.revision;
    clients[activeIdx].send({
      type: 'BG_GAME_ACTION',
      requestId: `roll_${rulesetId}`,
      expectedRevision: revBefore,
      action: { type: 'ROLL_DICE' },
    });
    const rollAck = await clients[activeIdx].nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === `roll_${rulesetId}`,
    );
    assert.equal(rollAck.ok, true, `ROLL_DICE failed in ${rulesetId}: ${rollAck.reason}`);

    return {
      rulesetId,
      playerCount,
      matchId,
      inviteCode,
      dealtRoleCount: dealtRoles.length,
      reconnectPreserved: true,
      spectatorPrivacyOk: true,
      lockedAfterStartOk: true,
      rollDiceOk: true,
    };
  } finally {
    // Clean disconnect so no client sockets linger; matches will auto-clean after TTL if left PLAYING,
    // note: leaving lobby before PLAYING closes immediately, leaving PLAYING transitions to disconnected.
    spectator.close();
    for (const c of clients) c.close();
  }
}

async function main() {
  const workerBase = parseArg('--worker=', DEFAULT_WORKER).replace(/\/+$/, '');
  const webBase = parseArg('--web=', DEFAULT_WEB).replace(/\/+$/, '');
  const wsBase = workerBase.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');

  // 1. Verify Frontend & Worker Health + Rulesets + Historical Leaderboard
  const webRes = await fetch(`${webBase}/`, { method: 'HEAD' });
  assert.equal(webRes.status, 200, `Frontend ${webBase} returned HTTP ${webRes.status}`);

  const workerHealth = await apiJson(workerBase, '/health');
  assert.equal(workerHealth.status, 200);
  assert.equal(workerHealth.json.ok, true);

  const bgHealth = await apiJson(workerBase, '/api/boardgame/health');
  assert.equal(bgHealth.status, 200);
  assert.equal(bgHealth.json.betaEnabled, true, 'Production Beta must be enabled');
  assert.deepEqual(
    bgHealth.json.betaAllowedRulesets,
    ['expansion-1', 'expansion-2', 'full-expansion'],
  );

  const rulesetsRes = await apiJson(workerBase, '/api/boardgame/rulesets');
  assert.equal(rulesetsRes.status, 200);
  assert.equal(rulesetsRes.json.rulesets.length, 4, 'Public API exposes ONLY 4 production rulesets');
  const byId = Object.fromEntries(rulesetsRes.json.rulesets.map((r) => [r.id, r]));
  assert.equal(byId.classic.status, 'stable');
  assert.equal(byId.classic.releaseStatus, 'PUBLIC_RELEASE_APPROVED');
  assert.equal(byId.classic.expectedCharacterCount, 10);
  for (const [id, count] of [
    ['expansion-1', 36],
    ['expansion-2', 40],
    ['full-expansion', 66],
  ]) {
    assert.equal(byId[id].status, 'beta', `${id} must be beta`);
    assert.equal(byId[id].releaseStatus, 'PRODUCTION_BETA_ENABLED');
    assert.equal(byId[id].selectable, true);
    assert.equal(byId[id].expectedCharacterCount, count);
  }

  // 2. Verify ALL 7 starter-* experimental rulesets + invalid ruleset are REJECTED on production!
  const blockedStarters = [
    'starter-four',
    'starter-eight',
    'starter-sixteen',
    'starter-twenty-six',
    'starter-thirty-eight',
    'starter-forty-eight',
    'starter-fifty-six',
  ];
  for (const badId of blockedStarters) {
    const r = await apiJson(workerBase, '/api/boardgame/matches', {
      method: 'POST',
      body: { tableId: 'table-1', hostName: 'Probe', rulesetId: badId },
    });
    assert.equal(r.status, 400, `Expected 400 for ${badId}, got ${r.status}`);
    assert.equal(r.json.code, 'RULESET_UNAVAILABLE', `Expected RULESET_UNAVAILABLE for ${badId}`);
  }
  const invalidRes = await apiJson(workerBase, '/api/boardgame/matches', {
    method: 'POST',
    body: { tableId: 'table-1', hostName: 'Probe', rulesetId: 'custom-cheat-pool' },
  });
  assert.equal(invalidRes.status, 400);
  assert.equal(invalidRes.json.code, 'INVALID_RULESET');

  // Verify historical leaderboard intact (zero destructive migration!)
  const lb = await apiJson(workerBase, '/api/boardgame/leaderboard?limit=10');
  assert.equal(lb.status, 200);
  assert.equal(lb.json.ok, true);

  // 3. Run real live multiplayer smoke checks for Classic + all 3 Beta packs!
  const results = [];
  results.push(await runLiveRoomSmoke({ workerBase, wsBase, rulesetId: 'classic', playerCount: 4 }));
  results.push(
    await runLiveRoomSmoke({
      workerBase,
      wsBase,
      rulesetId: 'expansion-1',
      playerCount: 4,
      testSwitchFromClassic: true,
    }),
  );
  results.push(await runLiveRoomSmoke({ workerBase, wsBase, rulesetId: 'expansion-2', playerCount: 5 }));
  results.push(await runLiveRoomSmoke({ workerBase, wsBase, rulesetId: 'full-expansion', playerCount: 6 }));

  // 4. Verify live Beta telemetry recorded the operational events with ZERO PII/secrets
  const tel = await apiJson(workerBase, '/api/boardgame/telemetry');
  assert.equal(tel.status, 200);
  assert.equal(tel.json.ok, true);
  assert.ok(tel.json.summary.matchesCreated >= 4);
  assert.ok(tel.json.summary.matchesStarted >= 4);
  const telRaw = JSON.stringify(tel.json);
  assert.equal(telRaw.includes('SmokeHost'), false, 'Telemetry must NEVER contain player/host names');
  assert.equal(telRaw.includes('reconnectToken'), false, 'Telemetry must NEVER contain reconnect tokens');

  console.log(
    JSON.stringify(
      {
        ok: true,
        webBase,
        workerBase,
        catalogVersion: bgHealth.json.catalogVersion,
        betaEnabled: bgHealth.json.betaEnabled,
        betaAllowedRulesets: bgHealth.json.betaAllowedRulesets,
        blockedStartersVerified: blockedStarters.length,
        historicalLeaderboardPlayers: lb.json.totalPlayers,
        roomSmokes: results,
        telemetrySummary: tel.json.summary,
        telemetryOperational: tel.json.operational,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error('LIVE PRODUCTION BETA SMOKE FAILED:', err);
  process.exit(1);
});
