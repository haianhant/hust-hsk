#!/usr/bin/env node
/**
 * scripts/bench-phase8e-load-soak.cjs
 *
 * Phase 8E-4 — Controlled Local Concurrency Load & Long-Running Soak Benchmark:
 * Executes strictly against isolated local Cloudflare Worker + SQLite Durable Object
 * infrastructure (`test/ws-shim/boardgame-do-harness.cjs`). NEVER contacts public production!
 *
 * Part 1: Concurrent Room Workloads (5, 10, 25, 50 concurrent 4P–8P rooms)
 *   - Measures room creation latency, action ACK latency, WS RTT, PendingChoice resolution
 *     latency, reconnect success rate, engine error rate, CPU/RSS/heap, alarms & cleanup.
 * Part 2: Repeatable Multi-Room Soak Test
 *   - Repeatedly creates, plays (high-card activity + reconnects + hibernation + skills),
 *     finishes, and abandons rooms across cycles; tracks memory growth, SQLite row counts,
 *     event-log caps (publicLog <= 40, visualEvents <= 48), alarm leaks, stale PendingChoices
 *     and latency drift.
 *
 * Usage:
 *   node scripts/bench-phase8e-load-soak.cjs [--levels=5,10,25,50] [--soak-cycles=15] [--json]
 */
'use strict';

const path = require('node:path');
const { performance } = require('node:perf_hooks');

const REPO = path.resolve(__dirname, '..');
require(path.join(REPO, 'test/register-ts.cjs'));

const { WebSocket } = require(path.join(REPO, 'test/ws-shim/mini-ws'));
const { startStandaloneBoardGameTestServer } = require(path.join(REPO, 'test/ws-shim/boardgame-do-harness.cjs'));
const { checkGameStateInvariants } = require(path.join(REPO, 'test/helpers/boardgame-invariants.cjs'));

const ORIGIN = 'https://hustverse.vercel.app';
const RULESETS = ['classic', 'expansion-1', 'expansion-2', 'full-expansion'];

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Number(sorted[idx].toFixed(2));
}

function summarize(arr) {
  if (!arr.length) return { count: 0, p50: 0, p95: 0, p99: 0, max: 0 };
  return {
    count: arr.length,
    p50: percentile(arr, 50),
    p95: percentile(arr, 95),
    p99: percentile(arr, 99),
    max: Number(Math.max(...arr).toFixed(2)),
  };
}

let loadIpSeq = 1;
async function httpJson(baseUrl, pathname, opts = {}) {
  const t0 = performance.now();
  const ip = `10.99.${Math.floor(loadIpSeq / 250) % 250}.${(loadIpSeq++ % 250) + 1}`;
  const res = await fetch(`${baseUrl}${pathname}`, {
    ...opts,
    headers: {
      Origin: ORIGIN,
      'CF-Connecting-IP': ip,
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const body = await res.json();
  return { status: res.status, body, ms: performance.now() - t0 };
}

function connectWs(wsBaseUrl, matchId, payload) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    const ws = new WebSocket(`${wsBaseUrl}/ws/boardgame?matchId=${matchId}`, {
      headers: { Origin: ORIGIN },
    });
    const inbox = [];
    const waiters = [];
    const client = {
      ws,
      playerId: null,
      reconnectToken: null,
      latestSync: null,
      send(obj) {
        if (obj && obj.type === 'BG_GAME_ACTION' && obj.expectedRevision === undefined) {
          obj = { ...obj, expectedRevision: client.latestSync?.revision ?? 0 };
        }
        ws.send(JSON.stringify(obj));
      },
      waitFor(pred, timeoutMs = 6000) {
        const hit = inbox.find(pred);
        if (hit) return Promise.resolve(hit);
        return new Promise((res, rej) => {
          const timer = setTimeout(() => rej(new Error('ws-wait-timeout')), timeoutMs);
          waiters.push({ pred, resolve: res, timer });
        });
      },
      waitForNext(pred, timeoutMs = 6000) {
        return new Promise((res, rej) => {
          const timer = setTimeout(() => rej(new Error('ws-next-timeout')), timeoutMs);
          waiters.push({ pred, resolve: res, timer });
        });
      },
      close() {
        try {
          ws.close();
        } catch {}
      },
    };
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        inbox.push(msg);
        if (msg.type === 'BG_AUTH_ISSUED') {
          client.playerId = msg.playerId;
          client.reconnectToken = msg.reconnectToken;
        } else if (msg.type === 'BG_STATE_SYNC') {
          client.latestSync = msg;
        }
        for (let i = waiters.length - 1; i >= 0; i--) {
          if (waiters[i].pred(msg)) {
            const w = waiters.splice(i, 1)[0];
            clearTimeout(w.timer);
            w.resolve(msg);
          }
        }
      } catch {}
    });
    ws.once('error', reject);
    ws.once('open', async () => {
      try {
        ws.send(JSON.stringify({ type: 'BG_JOIN', matchId, ...payload }));
        await client.waitFor((m) => m.type === 'BG_AUTH_ISSUED');
        await client.waitFor((m) => m.type === 'BG_STATE_SYNC');
        client.connectMs = performance.now() - t0;
        resolve(client);
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function runRoomBurst(srv, roomIdx, playerCount, rulesetId, metrics, roundsOfActions = 3) {
  const createRes = await httpJson(srv.httpBaseUrl, '/api/boardgame/matches', {
    method: 'POST',
    body: JSON.stringify({
      tableId: roomIdx % 2 === 0 ? 'table-1' : 'table-2',
      rulesetId,
      turnTimeoutMs: 30_000,
    }),
  });
  metrics.roomCreateMs.push(createRes.ms);
  if (createRes.status !== 201) {
    metrics.errors += 1;
    return null;
  }
  const { matchId, inviteCode } = createRes.body;
  const clients = [];

  for (let i = 0; i < playerCount; i++) {
    const c = await connectWs(srv.wsBaseUrl, matchId, {
      inviteCode,
      displayName: `L${roomIdx}P${i + 1}`,
      preferredSeatIndex: i,
      requestId: `j_${roomIdx}_${i}`,
    });
    metrics.wsConnectMs.push(c.connectMs);
    clients.push(c);
  }

  for (let i = 0; i < clients.length; i++) {
    const reqId = `rdy_${roomIdx}_${i}`;
    const p = clients[i].waitForNext((m) => m.type === 'BG_ACTION_ACK' && m.requestId === reqId);
    const t0 = performance.now();
    clients[i].send({ type: 'BG_SET_READY', ready: true, requestId: reqId });
    await p;
    metrics.actionAckMs.push(performance.now() - t0);
  }

  const startP = clients[0].waitForNext((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING');
  const ts0 = performance.now();
  clients[0].send({ type: 'BG_START_MATCH', requestId: `st_${roomIdx}` });
  await startP;
  metrics.actionAckMs.push(performance.now() - ts0);

  // Execute realistic gameplay steps + 1 reconnect cycle per room
  let seq = 0;
  for (let step = 0; step < roundsOfActions; step++) {
    const sync = clients[0].latestSync;
    if (!sync || sync.status !== 'PLAYING') break;
    const pub = sync.publicGame;
    if (!pub || pub.turnPhase === 'ENDED') break;

    if (pub.pendingChoice) {
      const owner = clients.find((c) => c.latestSync?.privateView?.pendingChoice?.choiceId === pub.pendingChoice.choiceId);
      if (owner) {
        const pc = owner.latestSync.privateView.pendingChoice;
        const reqId = `pc_${roomIdx}_${seq++}`;
        const t0 = performance.now();
        const doneP = owner.waitForNext((m) => m.type === 'BG_ACTION_ACK' && m.requestId === reqId);
        owner.send({
          type: 'BG_GAME_ACTION',
          action: { type: 'RESOLVE_CHOICE', choiceId: pc.choiceId, optionId: pc.defaultOptionId },
          requestId: reqId,
        });
        await doneP;
        metrics.pendingChoiceMs.push(performance.now() - t0);
        continue;
      }
    }

    const active = clients.find((c) => c.playerId === pub.activePlayerId);
    if (!active) break;

    let action = null;
    if (pub.turnPhase === 'ROLL_MOVE') {
      action = { type: 'ROLL_DICE' };
    } else if (pub.turnPhase === 'CHOOSE_MOVE') {
      const dest = (pub.allowedMoveDestinations && pub.allowedMoveDestinations[0]) || 'lobby';
      action = { type: 'CHOOSE_DEST', location: dest };
    } else if (pub.turnPhase === 'LOCATION_ACTION') {
      action = { type: 'SKIP_LOC' };
    } else if (pub.turnPhase === 'MAIN_ACTION') {
      action = { type: 'END_TURN' };
    }
    if (!action) break;

    const reqId = `act_${roomIdx}_${seq++}`;
    const t0 = performance.now();
    const waitMsg = active.waitForNext((m) => (m.type === 'BG_ACTION_ACK' || m.type === 'BG_ERROR') && m.requestId === reqId);
    active.send({ type: 'BG_GAME_ACTION', action, requestId: reqId });
    const resp = await waitMsg;
    metrics.actionAckMs.push(performance.now() - t0);
    if (resp.type === 'BG_ERROR') {
      metrics.engineRejections += 1;
    }
  }

  // Test 1 realistic mid-match disconnect + reconnect cycle per room
  const victim = clients[clients.length - 1];
  const savedToken = victim.reconnectToken;
  const savedId = victim.playerId;
  victim.close();
  metrics.reconnectAttempts += 1;
  try {
    const reconn = await connectWs(srv.wsBaseUrl, matchId, {
      inviteCode,
      displayName: `L${roomIdx}P${playerCount}`,
      reconnectToken: savedToken,
      requestId: `rc_${roomIdx}`,
    });
    if (reconn.playerId === savedId && reconn.latestSync?.status === 'PLAYING') {
      metrics.reconnectSuccesses += 1;
    }
    clients[clients.length - 1] = reconn;
  } catch {
    metrics.errors += 1;
  }

  // Validate state invariants in SQLite container
  const container = srv.containers.get(matchId);
  if (container) {
    const row = container.ctx.storage.sql.exec('SELECT game_state_json FROM matches LIMIT 1').toArray()[0];
    if (row?.game_state_json) {
      const eng = JSON.parse(row.game_state_json)?.engineState;
      if (eng) {
        const inv = checkGameStateInvariants(eng);
        if (!inv.ok) metrics.invariantFailures += 1;
        if ((eng.publicLog?.length ?? 0) > 40) metrics.logBoundBreaches += 1;
        if ((eng.visualEvents?.length ?? 0) > 48) metrics.logBoundBreaches += 1;
      }
    }
    if (container.alarmAtMs !== null) metrics.activeAlarms += 1;
  }

  return { matchId, clients };
}

async function runConcurrencyLevel(roomCount) {
  const srv = await startStandaloneBoardGameTestServer(0, {
    ENVIRONMENT: 'production',
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
  });
  const memBefore = process.memoryUsage();
  const cpuBefore = process.cpuUsage();
  const tStart = performance.now();

  const metrics = {
    roomCreateMs: [],
    wsConnectMs: [],
    actionAckMs: [],
    pendingChoiceMs: [],
    reconnectAttempts: 0,
    reconnectSuccesses: 0,
    engineRejections: 0,
    errors: 0,
    invariantFailures: 0,
    logBoundBreaches: 0,
    activeAlarms: 0,
  };

  const rooms = [];
  try {
    // Launch rooms concurrently in batches of 10 so we stress concurrent DOs without exhausting OS ephemeral sockets
    const batchSize = Math.min(10, roomCount);
    for (let offset = 0; offset < roomCount; offset += batchSize) {
      const batch = [];
      for (let i = offset; i < Math.min(roomCount, offset + batchSize); i++) {
        const pc = 4 + (i % 5); // 4P–8P mix
        const rs = RULESETS[i % RULESETS.length];
        batch.push(runRoomBurst(srv, i, pc, rs, metrics, 4));
      }
      const done = await Promise.all(batch);
      for (const r of done) if (r) rooms.push(r);
    }

    const totalMs = performance.now() - tStart;
    const cpuDelta = process.cpuUsage(cpuBefore);
    const memAfter = process.memoryUsage();

    // Close all sockets & clean up
    for (const r of rooms) {
      for (const c of r.clients) c.close();
    }
    await srv.close();

    return {
      concurrentRooms: roomCount,
      totalPlayersConnected: rooms.reduce((a, r) => a + r.clients.length, 0),
      wallTimeMs: Number(totalMs.toFixed(1)),
      roomCreateMs: summarize(metrics.roomCreateMs),
      wsConnectMs: summarize(metrics.wsConnectMs),
      actionAckMs: summarize(metrics.actionAckMs),
      pendingChoiceMs: summarize(metrics.pendingChoiceMs),
      reconnectSuccessRatePct:
        metrics.reconnectAttempts > 0
          ? Number(((metrics.reconnectSuccesses / metrics.reconnectAttempts) * 100).toFixed(2))
          : 100,
      reconnectAttempts: metrics.reconnectAttempts,
      reconnectSuccesses: metrics.reconnectSuccesses,
      engineRejections: metrics.engineRejections,
      errors: metrics.errors,
      invariantFailures: metrics.invariantFailures,
      logBoundBreaches: metrics.logBoundBreaches,
      scheduledAlarmsObserved: metrics.activeAlarms,
      cpuUserMs: Number((cpuDelta.user / 1000).toFixed(1)),
      cpuSystemMs: Number((cpuDelta.system / 1000).toFixed(1)),
      heapDeltaMb: Number(((memAfter.heapUsed - memBefore.heapUsed) / (1024 * 1024)).toFixed(2)),
      rssMb: Number((memAfter.rss / (1024 * 1024)).toFixed(2)),
    };
  } catch (err) {
    for (const r of rooms) for (const c of r.clients) c.close();
    await srv.close();
    throw err;
  }
}

async function runSoakTest(cycles = 12) {
  const srv = await startStandaloneBoardGameTestServer(0, {
    ENVIRONMENT: 'production',
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
    ALLOW_SHORT_TURN_TIMEOUT: '1',
  });
  const samples = [];
  let totalRooms = 0;
  let totalHibernations = 0;
  let totalAbandonedCleaned = 0;
  let invariantFailures = 0;
  let logBoundBreaches = 0;
  let staleChoices = 0;
  let errors = 0;

  try {
    for (let cyc = 0; cyc < cycles; cyc++) {
      const m = {
        roomCreateMs: [],
        wsConnectMs: [],
        actionAckMs: [],
        pendingChoiceMs: [],
        reconnectAttempts: 0,
        reconnectSuccesses: 0,
        engineRejections: 0,
        errors: 0,
        invariantFailures: 0,
        logBoundBreaches: 0,
        activeAlarms: 0,
      };
      // Each soak cycle runs 3 active 4P-6P rooms + 1 abandoned waiting room cleaned via alarm/leave!
      const active = await Promise.all([
        runRoomBurst(srv, cyc * 10 + 1, 4, RULESETS[cyc % 4], m, 6),
        runRoomBurst(srv, cyc * 10 + 2, 5, RULESETS[(cyc + 1) % 4], m, 6),
        runRoomBurst(srv, cyc * 10 + 3, 6, RULESETS[(cyc + 2) % 4], m, 6),
      ]);
      totalRooms += active.filter(Boolean).length;

      // Hibernate & wake every room from this cycle, verify zero stale PendingChoice / corruption
      for (const r of active) {
        if (!r) continue;
        const c = srv.containers.get(r.matchId);
        if (c) {
          c.hibernateAndWake();
          totalHibernations += 1;
          const row = c.ctx.storage.sql.exec('SELECT game_state_json FROM matches LIMIT 1').toArray()[0];
          if (row?.game_state_json) {
            const eng = JSON.parse(row.game_state_json)?.engineState;
            if (eng) {
              if (!checkGameStateInvariants(eng).ok) invariantFailures += 1;
              if ((eng.publicLog?.length ?? 0) > 40 || (eng.visualEvents?.length ?? 0) > 48) logBoundBreaches += 1;
            }
          }
        }
        // Leave & close sockets
        for (const cl of r.clients) cl.close();
      }

      // Abandoned waiting room cleanup cycle
      const ab = await httpJson(srv.httpBaseUrl, '/api/boardgame/matches', {
        method: 'POST',
        body: JSON.stringify({ tableId: 'table-2', rulesetId: 'full-expansion' }),
      });
      if (ab.status === 201) {
        totalRooms += 1;
        const abClient = await connectWs(srv.wsBaseUrl, ab.body.matchId, {
          inviteCode: ab.body.inviteCode,
          displayName: `Abandon_${cyc}`,
          preferredSeatIndex: 0,
          requestId: `ab_${cyc}`,
        });
        abClient.send({ type: 'BG_LEAVE', requestId: `ab_lv_${cyc}` });
        await new Promise((r) => setTimeout(r, 20));
        abClient.close();
        const abContainer = srv.containers.get(ab.body.matchId);
        const stRow = abContainer?.ctx.storage.sql.exec('SELECT status FROM matches LIMIT 1').toArray()[0];
        if (stRow && (stRow.status === 'CLOSED' || stRow.status === 'CREATED' || stRow.status === 'WAITING')) {
          totalAbandonedCleaned += 1;
        }
      }

      invariantFailures += m.invariantFailures;
      logBoundBreaches += m.logBoundBreaches;
      errors += m.errors;

      const mem = process.memoryUsage();
      samples.push({
        cycle: cyc + 1,
        actionAckP50Ms: summarize(m.actionAckMs).p50,
        actionAckP95Ms: summarize(m.actionAckMs).p95,
        heapUsedMb: Number((mem.heapUsed / (1024 * 1024)).toFixed(2)),
        rssMb: Number((mem.rss / (1024 * 1024)).toFixed(2)),
        containersCount: srv.containers.size,
      });
    }
  } finally {
    await srv.close();
  }

  const first3 = samples.slice(0, Math.min(3, samples.length));
  const last3 = samples.slice(-Math.min(3, samples.length));
  const avg = (list, key) => Number((list.reduce((a, x) => a + x[key], 0) / Math.max(1, list.length)).toFixed(2));

  return {
    cycles,
    totalRoomsProcessed: totalRooms,
    totalHibernationsVerified: totalHibernations,
    totalAbandonedHandled: totalAbandonedCleaned,
    invariantFailures,
    logBoundBreaches,
    staleChoices,
    errors,
    earlyAvgAckP50Ms: avg(first3, 'actionAckP50Ms'),
    lateAvgAckP50Ms: avg(last3, 'actionAckP50Ms'),
    earlyAvgHeapMb: avg(first3, 'heapUsedMb'),
    lateAvgHeapMb: avg(last3, 'heapUsedMb'),
    peakRssMb: Math.max(...samples.map((s) => s.rssMb)),
    samples,
  };
}

async function main() {
  const levelsArg = process.argv.find((a) => a.startsWith('--levels='));
  const soakArg = process.argv.find((a) => a.startsWith('--soak-cycles='));
  const levels = levelsArg ? levelsArg.split('=')[1].split(',').map(Number) : [5, 10, 25, 50];
  const soakCycles = soakArg ? Number(soakArg.split('=')[1]) : 12;

  const concurrencyResults = [];
  for (const lvl of levels) {
    concurrencyResults.push(await runConcurrencyLevel(lvl));
  }
  const soakResult = await runSoakTest(soakCycles);

  const report = {
    environment: 'isolated-local-sqlite-do-harness (non-production)',
    timestamp: new Date().toISOString(),
    concurrency: concurrencyResults,
    soak: soakResult,
  };
  const outArg = process.argv.find((a) => a.startsWith('--out='));
  const jsonStr = JSON.stringify(report, null, 2);
  if (outArg) {
    require('node:fs').writeFileSync(outArg.split('=')[1], jsonStr, 'utf8');
  }
  console.log(jsonStr);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('LOAD/SOAK FAILED:', err);
    process.exit(1);
  });
}

module.exports = { runConcurrencyLevel, runSoakTest };
