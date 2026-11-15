/**
 * test/boardgame-perf-bench.cjs — Benchmark hiệu năng Worker/Durable Object SQLite
 * cho Bóng Đêm KTX v3.1:
 *  - Đo p50/p95/p99 latency (ms) cho createMatch, join+auth, action->commit+broadcast, BG_REQUEST_SYNC
 *  - Đo kích thước trung bình & cực đại của payload `BG_STATE_SYNC` (KB)
 *  - Đo kích thước row `matches.game_state_json` trong SQLite (bytes) ở bàn 4p và 8p
 */

const { performance } = require('node:perf_hooks');
const assert = require('node:assert/strict');
const { WebSocket } = require('./ws-shim/mini-ws');
const { startStandaloneBoardGameTestServer } = require('./ws-shim/boardgame-do-harness.cjs');
const { listLegalMovesForLocation } = require('../features/boardgame/domain/index.ts');

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Number(sorted[idx].toFixed(2));
}

function summarizeMs(samples) {
  const sorted = samples.slice().sort((a, b) => a - b);
  return {
    count: sorted.length,
    p50Ms: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    p99Ms: percentile(sorted, 99),
    maxMs: Number((sorted[sorted.length - 1] ?? 0).toFixed(2)),
  };
}

async function openBgClient(wsBaseUrl, matchId) {
  const ws = new WebSocket(`${wsBaseUrl}/ws/boardgame?matchId=${encodeURIComponent(matchId)}`);
  const inbox = [];
  const waiters = [];
  let latestSync = null;
  let lastRawBytes = 0;
  let maxSyncBytes = 0;

  ws.on('message', (raw) => {
    const rawStr = raw.toString();
    const bytes = Buffer.byteLength(rawStr, 'utf8');
    const msg = JSON.parse(rawStr);
    if (msg.type === 'BG_STATE_SYNC') {
      latestSync = msg;
      lastRawBytes = bytes;
      if (bytes > maxSyncBytes) maxSyncBytes = bytes;
    }
    inbox.push(msg);
    for (let i = waiters.length - 1; i >= 0; i--) {
      if (waiters[i].predicate(msg)) {
        const w = waiters.splice(i, 1)[0];
        clearTimeout(w.timer);
        w.resolve(msg);
      }
    }
  });

  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });

  function nextMsg(predicate, timeoutMs = 4000, fromIdx = 0) {
    for (let i = fromIdx; i < inbox.length; i++) {
      if (predicate(inbox[i])) return Promise.resolve(inbox[i]);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Bench WS timeout')), timeoutMs);
      waiters.push({ predicate, resolve, timer });
    });
  }

  return {
    send: (m) => ws.send(JSON.stringify(m)),
    nextMsg,
    getSync: () => latestSync,
    getInboxLen: () => inbox.length,
    getMaxSyncBytes: () => maxSyncBytes,
    getLastSyncBytes: () => lastRawBytes,
    close: () => ws.close(1000, 'bench-done'),
  };
}

async function runBenchForTable(srv, playerCount, turnBudget = 16) {
  const createSamples = [];
  const joinSamples = [];
  const actionSamples = [];
  const syncSamples = [];

  const t0 = performance.now();
  const createRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tableId: playerCount <= 4 ? 'table-1' : 'table-2', hostName: 'BenchHost', turnTimeoutMs: 40000 }),
  });
  const created = await createRes.json();
  createSamples.push(performance.now() - t0);
  assert.equal(created.ok, true);

  const clients = [];
  for (let i = 0; i < playerCount; i++) {
    const c = await openBgClient(srv.wsBaseUrl, created.matchId);
    const jt0 = performance.now();
    c.send({
      type: 'BG_JOIN',
      matchId: created.matchId,
      inviteCode: created.inviteCode,
      displayName: `BenchP${i + 1}`,
      preferredSeatIndex: i,
    });
    const auth = await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    await c.nextMsg((m) => m.type === 'BG_STATE_SYNC');
    joinSamples.push(performance.now() - jt0);
    clients.push({ c, playerId: auth.playerId });
  }

  for (let i = 1; i < playerCount; i++) {
    clients[i].c.send({ type: 'BG_SET_READY', ready: true, requestId: `rdy-${i}` });
  }
  await clients[0].c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'READY_CHECK');
  clients[0].c.send({ type: 'BG_START_MATCH', requestId: 'bench-start', turnTimeoutMs: 40000 });
  await clients[0].c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING');

  for (let step = 0; step < turnBudget; step++) {
    const sync = clients[0].c.getSync();
    if (!sync || sync.status !== 'PLAYING' || !sync.publicGame?.activePlayerId) break;
    const actor = clients.find((x) => x.playerId === sync.publicGame.activePlayerId);
    if (!actor) break;
    const curLoc = sync.publicGame.players.find((p) => p.playerId === actor.playerId).location;
    const moves = listLegalMovesForLocation(curLoc);

    const actions = [
      { type: 'MOVE', location: moves[step % moves.length] || curLoc },
      { type: 'EXPLORE_LOC' },
      { type: 'DEFEND' },
    ];

    let rev = actor.c.getSync().revision;
    for (let k = 0; k < actions.length; k++) {
      if (k > 0) {
        // Respect DO MIN_ACTION_INTERVAL_MS (25ms) anti-burst guard before timing the next action
        await new Promise((r) => setTimeout(r, 30));
      }
      const at0 = performance.now();
      const idxBefore = actor.c.getInboxLen();
      const reqId = `b-${step}-${k}`;
      actor.c.send({
        type: 'BG_GAME_ACTION',
        requestId: reqId,
        expectedRevision: rev,
        action: actions[k],
      });
      const ack = await actor.c.nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === reqId, 4000, idxBefore);
      assert.equal(ack.ok, true, `Bench action rejected: ${ack.code} ${ack.reason}`);
      const nextSync = await actor.c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.revision > rev, 4000, idxBefore);
      actionSamples.push(performance.now() - at0);
      rev = nextSync.revision;
      if (nextSync.status === 'FINISHED') break;
    }

    const st0 = performance.now();
    const sBefore = actor.c.getInboxLen();
    actor.c.send({ type: 'BG_REQUEST_SYNC', requestId: `sync-${step}` });
    await actor.c.nextMsg((m) => m.type === 'BG_STATE_SYNC', 4000, sBefore);
    syncSamples.push(performance.now() - st0);
  }

  const container = srv.containers.get(created.matchId);
  const row = container.ctx.storage.sql
    .exec('SELECT LENGTH(game_state_json) AS state_bytes FROM matches WHERE match_id = ?', created.matchId)
    .one();
  const maxSyncBytes = Math.max(...clients.map((cl) => cl.c.getMaxSyncBytes()));
  const lastSyncBytes = clients[0].c.getLastSyncBytes();

  clients.forEach((cl) => cl.c.close());

  return {
    playerCount,
    createMatch: summarizeMs(createSamples),
    joinAuthSync: summarizeMs(joinSamples),
    actionCommitBroadcast: summarizeMs(actionSamples),
    requestSync: summarizeMs(syncSamples),
    wsStateSyncKb: {
      latestKb: Number((lastSyncBytes / 1024).toFixed(2)),
      maxKb: Number((maxSyncBytes / 1024).toFixed(2)),
    },
    sqliteGameStateBytes: Number(row?.state_bytes ?? 0),
  };
}

async function main() {
  const srv = await startStandaloneBoardGameTestServer(0);
  try {
    const res4p = await runBenchForTable(srv, 4, 16);
    const res8p = await runBenchForTable(srv, 8, 24);
    const report = {
      benchmark: 'boardgame-v3.1-worker-do',
      p4: res4p,
      p8: res8p,
    };
    console.log(JSON.stringify(report, null, 2));
    assert.ok(res4p.actionCommitBroadcast.p95Ms < 200, '4p action p95 should stay well under 200ms');
    assert.ok(res8p.actionCommitBroadcast.p95Ms < 200, '8p action p95 should stay well under 200ms');
    assert.ok(res8p.wsStateSyncKb.maxKb < 64, '8p WS state sync payload should stay compact (<64 KB)');
    assert.ok(res8p.sqliteGameStateBytes < 128 * 1024, '8p SQLite state blob should stay <128 KB');
  } finally {
    await srv.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
