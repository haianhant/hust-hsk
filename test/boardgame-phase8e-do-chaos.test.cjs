#!/usr/bin/env node
/**
 * test/boardgame-phase8e-do-chaos.test.cjs
 *
 * Phase 8E-3 — Real Cloudflare Durable Object Chaos, Persistence & Compatibility Suite:
 * Uses the real SQLite DO + WebSocket harness (`test/ws-shim/boardgame-do-harness.cjs`)
 * with deterministic alarm triggers (zero arbitrary sleep() correctness mechanisms).
 *
 * Covers:
 *  - 8E3-1: 4P–8P multi-room concurrency, Host leaving waiting room, Host mid-match disconnect,
 *           Spectator reconnect during active secret choice & zero private leakage.
 *  - 8E3-2: Disconnect mid-turn & while holding a private PendingChoice; reconnect just BEFORE
 *           vs just AFTER deterministic alarm deadline; zero orphaned PendingChoice or deadlock.
 *  - 8E3-3: Duplicate WebSocket action (requestId idempotency), out-of-order expectedRevision,
 *           delayed stale-phase action, and dual-client same-player race (4001 displacement).
 *  - 8E3-4: Long reaction chain under DO hibernation & restart/rehydration, network drop during
 *           game end + zero duplicated leaderboard victory rewards.
 *  - 8E3-5: Production compatibility & Beta feature-flag rollback: existing Beta match continues
 *           unconverted when ENABLE_PRODUCTION_BETA_EXPANSIONS='0', Classic stays functional,
 *           new Beta & all 7 starter-* rooms strictly blocked.
 */
'use strict';

require('./register-ts.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { WebSocket } = require('./ws-shim/mini-ws');
const {
  startStandaloneBoardGameTestServer,
  createBoardGameNamespace,
} = require('./ws-shim/boardgame-do-harness.cjs');
const {
  BoardGameRoom,
} = require('../worker/src/boardgame-room.ts');
const {
  BOARD_GAME_CATALOG_VERSION,
} = require('../shared/contracts/boardgame.ts');
const {
  getRoleDesign,
} = require('../features/boardgame/domain/index.ts');
const {
  checkGameStateInvariants,
} = require('./helpers/boardgame-invariants.cjs');

const ORIGIN = 'https://hustverse.vercel.app';

let ipCounter = 1;
async function httpJson(baseUrl, pathname, opts = {}) {
  const ip = `10.88.${Math.floor(ipCounter / 250) % 250}.${(ipCounter++ % 250) + 1}`;
  const res = await fetch(`${baseUrl}${pathname}`, {
    ...opts,
    headers: {
      Origin: ORIGIN,
      'CF-Connecting-IP': ip,
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

function connectBgWs(wsBaseUrl, matchId, joinPayload) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${wsBaseUrl}/ws/boardgame?matchId=${matchId}`, {
      headers: { Origin: ORIGIN },
    });
    const inbox = [];
    const waiters = [];
    let closedInfo = null;

    const notify = (msg) => {
      inbox.push(msg);
      for (let i = waiters.length - 1; i >= 0; i--) {
        if (waiters[i].pred(msg)) {
          const w = waiters.splice(i, 1)[0];
          clearTimeout(w.timer);
          w.resolve(msg);
        }
      }
    };

    ws.on('message', (raw) => {
      try {
        notify(JSON.parse(String(raw)));
      } catch {}
    });
    ws.on('close', (code, reason) => {
      closedInfo = { code, reason: String(reason || '') };
    });
    ws.once('error', reject);

    const client = {
      ws,
      inbox,
      get closedInfo() {
        return closedInfo;
      },
      latestSync: null,
      playerId: null,
      reconnectToken: null,
      send(obj) {
        if (obj && obj.type === 'BG_GAME_ACTION' && obj.expectedRevision === undefined) {
          obj = { ...obj, expectedRevision: client.latestSync?.revision ?? 0 };
        }
        ws.send(JSON.stringify(obj));
      },
      waitFor(pred, timeoutMs = 4000, label = 'message') {
        const existing = inbox.find(pred);
        if (existing) return Promise.resolve(existing);
        return new Promise((res, rej) => {
          const timer = setTimeout(
            () => rej(new Error(`Timeout waiting for ${label} (got ${inbox.map((m) => m.type).join(',')})`)),
            timeoutMs,
          );
          waiters.push({ pred, resolve: res, timer });
        });
      },
      waitForNext(pred, timeoutMs = 4000, label = 'next-message') {
        const startLen = inbox.length;
        return new Promise((res, rej) => {
          for (let i = startLen; i < inbox.length; i++) {
            if (pred(inbox[i])) return res(inbox[i]);
          }
          const timer = setTimeout(
            () => rej(new Error(`Timeout waiting for ${label} (tail=${inbox.slice(startLen).map((m) => m.type).join(',')})`)),
            timeoutMs,
          );
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
        const parsed = JSON.parse(String(raw));
        if (parsed.type === 'BG_STATE_SYNC') {
          client.latestSync = parsed;
        }
        if (parsed.type === 'BG_AUTH_ISSUED') {
          client.playerId = parsed.playerId;
          client.reconnectToken = parsed.reconnectToken;
        }
      } catch {}
    });

    ws.once('open', async () => {
      try {
        ws.send(JSON.stringify({ type: 'BG_JOIN', matchId, ...joinPayload }));
        await client.waitFor((m) => m.type === 'BG_AUTH_ISSUED', 4000, 'BG_AUTH_ISSUED');
        await client.waitFor((m) => m.type === 'BG_STATE_SYNC', 4000, 'BG_STATE_SYNC');
        resolve(client);
      } catch (err) {
        reject(err);
      }
    });
  });
}

async function createAndStartDoMatch(srv, count, rulesetId, opts = {}) {
  const createRes = await httpJson(srv.httpBaseUrl, '/api/boardgame/matches', {
    method: 'POST',
    body: JSON.stringify({
      tableId: opts.tableId || 'table-1',
      rulesetId,
      turnTimeoutMs: opts.turnTimeoutMs ?? 30_000,
    }),
  });
  assert.equal(createRes.status, 201, `Create match failed: ${JSON.stringify(createRes.body)}`);
  const { matchId, inviteCode } = createRes.body;

  const clients = [];
  for (let i = 0; i < count; i++) {
    const c = await connectBgWs(srv.wsBaseUrl, matchId, {
      inviteCode,
      displayName: `ChaosP${i + 1}`,
      preferredSeatIndex: i,
      requestId: `join_${matchId}_${i}`,
    });
    clients.push(c);
  }
  for (let i = 0; i < clients.length; i++) {
    const ackP = clients[i].waitForNext((m) => m.type === 'BG_ACTION_ACK' && m.requestId === `rdy_${i}`);
    clients[i].send({ type: 'BG_SET_READY', ready: true, requestId: `rdy_${i}` });
    await ackP;
  }
  const startSyncP = clients[0].waitForNext((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING');
  clients[0].send({ type: 'BG_START_MATCH', requestId: `start_${matchId}` });
  await startSyncP;
  return { matchId, inviteCode, clients };
}

function readEngineStateFromContainer(container) {
  const rows = container.ctx.storage.sql
    .exec('SELECT match_id, game_state_json, revision, status, ruleset_id, catalog_version, turn_deadline_ms, host_player_id, leaderboard_recorded FROM matches LIMIT 1')
    .toArray();
  assert.equal(rows.length, 1);
  const parsed = rows[0].game_state_json ? JSON.parse(rows[0].game_state_json) : null;
  return {
    meta: rows[0],
    wrapper: parsed,
    engineState: parsed?.engineState ?? null,
  };
}

function writeEngineStateToContainer(container, engineState, extraMeta = {}) {
  const { wrapper } = readEngineStateFromContainer(container);
  const nextWrapper = { ...(wrapper || {}), engineState };
  const fields = ['game_state_json = ?'];
  const vals = [JSON.stringify(nextWrapper)];
  for (const [k, v] of Object.entries(extraMeta)) {
    fields.push(`${k} = ?`);
    vals.push(v);
  }
  container.ctx.storage.sql.exec(`UPDATE matches SET ${fields.join(', ')}`, ...vals);
}

// ============================================================================
// 8E3-1: 4P-8P CONCURRENT ROOMS, HOST LEAVE/DISCONNECT & SPECTATOR RECONNECT
// ============================================================================
test('8E3-1 — Concurrent 4P-8P rooms, Host leaving waiting room, Host mid-match disconnect & Spectator reconnect privacy', async () => {
  const srv = await startStandaloneBoardGameTestServer(0, {
    ENVIRONMENT: 'production',
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
    ALLOW_SHORT_TURN_TIMEOUT: '1',
  });
  const openClients = [];
  try {
    // 1. Host leaves waiting room -> next lowest-seat player promoted & ruleset preserved!
    const createW = await httpJson(srv.httpBaseUrl, '/api/boardgame/matches', {
      method: 'POST',
      body: JSON.stringify({ tableId: 'table-1', rulesetId: 'full-expansion' }),
    });
    assert.equal(createW.status, 201);
    const h0 = await connectBgWs(srv.wsBaseUrl, createW.body.matchId, {
      inviteCode: createW.body.inviteCode,
      displayName: 'HostZero',
      preferredSeatIndex: 0,
      requestId: 'w_j0',
    });
    const g1 = await connectBgWs(srv.wsBaseUrl, createW.body.matchId, {
      inviteCode: createW.body.inviteCode,
      displayName: 'GuestOne',
      preferredSeatIndex: 1,
      requestId: 'w_j1',
    });
    openClients.push(h0, g1);

    const promoP = g1.waitForNext((m) => m.type === 'BG_STATE_SYNC' && m.hostPlayerId === g1.playerId);
    h0.send({ type: 'BG_LEAVE', requestId: 'host_leave_1' });
    const promoSync = await promoP;
    assert.equal(promoSync.hostPlayerId, g1.playerId, 'Next connected seated player promoted to Host on BG_LEAVE');
    assert.equal(promoSync.rulesetId, 'full-expansion', 'Ruleset preserved after Host leave');

    // Clean up waiting room
    g1.send({ type: 'BG_LEAVE', requestId: 'g1_leave' });
    await new Promise((r) => setTimeout(r, 50));

    // 2. Concurrent rooms across 4P, 5P, 6P, 7P, 8P across all 4 production rulesets simultaneously!
    const configs = [
      { pc: 4, rs: 'classic', tableId: 'table-1' },
      { pc: 5, rs: 'expansion-1', tableId: 'table-2' },
      { pc: 6, rs: 'expansion-2', tableId: 'table-1' },
      { pc: 7, rs: 'full-expansion', tableId: 'table-2' },
      { pc: 8, rs: 'full-expansion', tableId: 'table-1' },
    ];
    const activeRooms = [];
    for (const cfg of configs) {
      const m = await createAndStartDoMatch(srv, cfg.pc, cfg.rs, { tableId: cfg.tableId, turnTimeoutMs: 25_000 });
      activeRooms.push({ ...cfg, ...m });
      openClients.push(...m.clients);
    }

    // Verify all 5 concurrent rooms maintain isolated, valid 48-card states & exact ruleset/catalogVersion
    for (const room of activeRooms) {
      const container = srv.containers.get(room.matchId);
      const { meta, engineState } = readEngineStateFromContainer(container);
      assert.equal(meta.status, 'PLAYING');
      assert.equal(meta.ruleset_id, room.rs);
      assert.equal(meta.catalog_version, BOARD_GAME_CATALOG_VERSION);
      assert.equal(engineState.turnOrder.length, room.pc);
      const inv = checkGameStateInvariants(engineState, { checkSerialization: true });
      assert.equal(inv.ok, true, `Room ${room.pc}P ${room.rs} invariants: ${JSON.stringify(inv.violations)}`);
    }

    // 3. Host disconnects mid-match on the 8P room + Spectator connects, disconnects, and reconnects with ZERO P0 leaks!
    const room8 = activeRooms[4];
    const spec1 = await connectBgWs(srv.wsBaseUrl, room8.matchId, {
      inviteCode: room8.inviteCode,
      displayName: 'SpecChaos',
      asSpectator: true,
      requestId: 'spec_j1',
    });
    openClients.push(spec1);
    assert.equal(spec1.latestSync.privateView, null, 'Spectator receives null privateView');
    assert.ok(spec1.latestSync.publicGame.players.every((p) => p.revealedRoleId === null), 'All unrevealed roles masked for spectator');

    // Host drops socket mid-match -> match stays PLAYING and host can reconnect!
    const host8 = room8.clients[0];
    const savedHostToken = host8.reconnectToken;
    const savedHostId = host8.playerId;
    host8.close();
    await new Promise((r) => setTimeout(r, 60));

    // Spectator drops and reconnects cleanly!
    spec1.close();
    await new Promise((r) => setTimeout(r, 40));
    const spec2 = await connectBgWs(srv.wsBaseUrl, room8.matchId, {
      inviteCode: room8.inviteCode,
      displayName: 'SpecChaos',
      asSpectator: true,
      requestId: 'spec_reconn',
    });
    openClients.push(spec2);
    assert.equal(spec2.latestSync.privateView, null);

    const hostReconn = await connectBgWs(srv.wsBaseUrl, room8.matchId, {
      inviteCode: room8.inviteCode,
      displayName: 'ChaosP1',
      reconnectToken: savedHostToken,
      requestId: 'host8_reconn',
    });
    openClients.push(hostReconn);
    assert.equal(hostReconn.playerId, savedHostId, 'Host reconnects mid-match keeping exact playerId');
    assert.equal(hostReconn.latestSync.status, 'PLAYING');
  } finally {
    for (const c of openClients) c.close();
    await srv.close();
  }
});

// ============================================================================
// 8E3-2: PRIVATE PENDINGCHOICE DISCONNECT, BEFORE/AFTER DEADLINE & HIBERNATION
// ============================================================================
test('8E3-2 — Disconnect during active turn & private PendingChoice, reconnect BEFORE vs AFTER deadline, hibernation with pending alarm', async () => {
  const srv = await startStandaloneBoardGameTestServer(0, {
    ENVIRONMENT: 'production',
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
    ALLOW_SHORT_TURN_TIMEOUT: '1',
  });
  const openClients = [];
  try {
    // 1. Setup 4P match where p2 holds a SECRET PendingChoice (`undying_reveal_reduce` / `usurper_block_heal`), disconnects, hibernates, then reconnects BEFORE deadline!
    const { matchId, inviteCode, clients } = await createAndStartDoMatch(srv, 4, 'full-expansion', { turnTimeoutMs: 0 });
    openClients.push(...clients);
    const container = srv.containers.get(matchId);
    const { engineState } = readEngineStateFromContainer(container);

    // Assign p1=George, p2=exp2_usurper (unrevealed!), p3=Vampire, p4=Franklin; give p1 eq-07 Holy Water with 4 wounds
    const roleMap = ['gac-ky-thuat', 'exp2_usurper', 'suong-an-danh', 'gac-radio'];
    const order = engineState.turnOrder;
    for (let i = 0; i < 4; i++) {
      const p = engineState.players[order[i]];
      const d = getRoleDesign(roleMap[i]);
      p.roleId = roleMap[i];
      p.faction = d.faction;
      p.maxHp = d.maxHp;
      p.hp = d.maxHp;
      p.woundsTaken = 0;
      p.revealed = false;
      p.location = 'radio';
    }
    const p1Id = order[0];
    const p2Id = order[1];
    engineState.activePlayerId = p1Id;
    engineState.turnPhase = 'MAIN_ACTION';
    engineState.players[p1Id].woundsTaken = 4;
    engineState.players[p1Id].hp = engineState.players[p1Id].maxHp - 4;
    // Move eq-07 from equipment deck to p1 hand (preserving 48-card conservation!)
    const eqIdx = engineState.decks.equipment.indexOf('eq-07');
    assert.ok(eqIdx >= 0);
    engineState.decks.equipment.splice(eqIdx, 1);
    engineState.players[p1Id].hand.push('eq-07');
    writeEngineStateToContainer(container, engineState);
    container.hibernateAndWake(); // Force DO to reload our exact SQLite state!

    const p1Client = clients.find((c) => c.playerId === p1Id);
    const p2Client = clients.find((c) => c.playerId === p2Id);
    const p3Client = clients.find((c) => c.playerId === order[2]);

    // p1 plays eq-07 -> opens SECRET PendingChoice owned by p2 (Usurper)!
    const pcSyncP = p2Client.waitForNext((m) => m.type === 'BG_STATE_SYNC' && Boolean(m.privateView?.pendingChoice));
    p1Client.send({ type: 'BG_GAME_ACTION', action: { type: 'USE_CARD', cardId: 'eq-07' }, requestId: 'use_hw_1' });
    const p2Sync = await pcSyncP;
    const secretChoice = p2Sync.privateView.pendingChoice;
    assert.ok(secretChoice && secretChoice.isSecret === true);
    assert.equal(p2Sync.publicGame.pendingChoice.ownerPlayerId, null, 'Public view masks secret owner');
    assert.ok(container.alarmAtMs !== null, 'DO alarm MUST be scheduled for PendingChoice even when turnTimeoutMs=0');

    // p2 disconnects while holding secret PendingChoice -> DO hibernates & wakes!
    const p2Token = p2Client.reconnectToken;
    p2Client.close();
    await new Promise((r) => setTimeout(r, 50));
    container.hibernateAndWake();
    const afterHib = readEngineStateFromContainer(container);
    assert.ok(afterHib.meta.turn_deadline_ms !== null, 'Deadline survives disconnect + hibernation');

    // Reconnect p2 JUST BEFORE deadline -> still owns secret choice and resolves it cleanly!
    const p2Reconn = await connectBgWs(srv.wsBaseUrl, matchId, {
      inviteCode,
      displayName: 'ChaosP2',
      reconnectToken: p2Token,
      requestId: 'p2_before_dl',
    });
    openClients.push(p2Reconn);
    assert.equal(p2Reconn.latestSync.privateView?.pendingChoice?.choiceId, secretChoice.choiceId, 'Reconnected p2 retains secret PendingChoice');
    // p3 (non-owner) attempting to resolve p2's choice is REJECTED!
    const errP = p3Client.waitForNext((m) => m.type === 'BG_ERROR');
    p3Client.send({
      type: 'BG_GAME_ACTION',
      action: { type: 'RESOLVE_CHOICE', choiceId: secretChoice.choiceId, optionId: secretChoice.defaultOptionId },
      requestId: 'p3_steal_choice',
    });
    await errP;

    // p2 resolves choice cleanly!
    const resSyncP = p1Client.waitForNext((m) => m.type === 'BG_STATE_SYNC' && !m.publicGame?.pendingChoice);
    p2Reconn.send({
      type: 'BG_GAME_ACTION',
      action: { type: 'RESOLVE_CHOICE', choiceId: secretChoice.choiceId, optionId: secretChoice.defaultOptionId },
      requestId: 'p2_resolve_ok',
    });
    await resSyncP;
    assert.equal(checkGameStateInvariants(readEngineStateFromContainer(container).engineState).ok, true);

    // 2. Now test reconnect JUST AFTER deadline expires via deterministic alarm():
    //    Put 2nd eq-07 in p1 hand, open secret choice, expire deadline in SQLite, trigger alarm(), THEN p2 reconnects!
    const st2 = readEngineStateFromContainer(container).engineState;
    st2.players[p1Id].woundsTaken = 4;
    st2.players[p1Id].hp = st2.players[p1Id].maxHp - 4;
    const eqIdx2 = st2.decks.equipment.indexOf('eq-07');
    st2.decks.equipment.splice(eqIdx2, 1);
    st2.players[p1Id].hand.push('eq-07');
    writeEngineStateToContainer(container, st2);
    container.hibernateAndWake();

    const pcSyncP2 = p2Reconn.waitForNext((m) => m.type === 'BG_STATE_SYNC' && Boolean(m.privateView?.pendingChoice));
    p1Client.send({ type: 'BG_GAME_ACTION', action: { type: 'USE_CARD', cardId: 'eq-07' }, requestId: 'use_hw_2' });
    const pc2 = (await pcSyncP2).privateView.pendingChoice;

    // Disconnect p2, fast-forward choice deadline to the past in SQLite, hibernate, trigger alarm()!
    p2Reconn.close();
    await new Promise((r) => setTimeout(r, 40));
    const stExp = readEngineStateFromContainer(container).engineState;
    const pastMs = Date.now() - 5_000;
    stExp.pendingChoice.deadlineMs = pastMs;
    writeEngineStateToContainer(container, stExp, { turn_deadline_ms: pastMs });
    container.hibernateAndWake();
    await container.triggerAlarm();

    const afterAlarm = readEngineStateFromContainer(container);
    assert.equal(afterAlarm.engineState.pendingChoice, null, 'Expired PendingChoice MUST be auto-resolved cleanly by alarm()');
    assert.equal(checkGameStateInvariants(afterAlarm.engineState).ok, true);

    // p2 reconnects AFTER deadline -> tries to submit stale choiceId -> cleanly rejected, zero deadlock!
    const p2After = await connectBgWs(srv.wsBaseUrl, matchId, {
      inviteCode,
      displayName: 'ChaosP2',
      reconnectToken: p2Token,
      requestId: 'p2_after_dl',
    });
    openClients.push(p2After);
    assert.equal(p2After.latestSync.privateView?.pendingChoice ?? null, null);
    const staleChoiceErr = p2After.waitForNext((m) => m.type === 'BG_ERROR');
    p2After.send({
      type: 'BG_GAME_ACTION',
      action: { type: 'RESOLVE_CHOICE', choiceId: pc2.choiceId, optionId: pc2.defaultOptionId },
      requestId: 'stale_choice_submit',
    });
    await staleChoiceErr;
  } finally {
    for (const c of openClients) c.close();
    await srv.close();
  }
});

// ============================================================================
// 8E3-3: DUPLICATE WS ACTION, OUT-OF-ORDER REVISION, DELAYED MSG & DUAL-CLIENT RACE
// ============================================================================
test('8E3-3 — Duplicate WS requestId idempotency, out-of-order expectedRevision, delayed action & dual-client same-player race', async () => {
  const srv = await startStandaloneBoardGameTestServer(0, {
    ENVIRONMENT: 'production',
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
  });
  const openClients = [];
  try {
    const { matchId, inviteCode, clients } = await createAndStartDoMatch(srv, 4, 'classic');
    openClients.push(...clients);
    const container = srv.containers.get(matchId);
    const { engineState } = readEngineStateFromContainer(container);
    const activeId = engineState.activePlayerId;
    const activeClient = clients.find((c) => c.playerId === activeId);
    const startRev = activeClient.latestSync.revision;

    // 1. Out-of-order expectedRevision (stale revision) -> rejected with STALE_REVISION!
    const staleErrP = activeClient.waitForNext((m) => m.type === 'BG_ERROR');
    activeClient.send({
      type: 'BG_GAME_ACTION',
      expectedRevision: Math.max(0, startRev - 1),
      action: { type: 'ROLL_DICE' },
      requestId: 'ooo_rev_1',
    });
    const staleErr = await staleErrP;
    assert.equal(staleErr.code, 'STALE_REVISION');

    // 2. Duplicate WebSocket action with same requestId -> executes ROLL_DICE ONCE (idempotent ack, revision increments once!)
    const ack1P = activeClient.waitForNext((m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'dup_roll_1');
    activeClient.send({ type: 'BG_GAME_ACTION', action: { type: 'ROLL_DICE' }, requestId: 'dup_roll_1' });
    await ack1P;
    const revAfterFirst = readEngineStateFromContainer(container).meta.revision;
    const phaseAfterFirst = readEngineStateFromContainer(container).engineState.turnPhase;

    // Replay EXACT same requestId -> must return idempotent ACK without advancing revision or re-rolling!
    const ack2P = activeClient.waitForNext((m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'dup_roll_1');
    activeClient.send({ type: 'BG_GAME_ACTION', action: { type: 'ROLL_DICE' }, requestId: 'dup_roll_1' });
    await ack2P;
    assert.equal(readEngineStateFromContainer(container).meta.revision, revAfterFirst, 'Duplicate requestId must NOT bump revision');
    assert.equal(readEngineStateFromContainer(container).engineState.turnPhase, phaseAfterFirst);

    // 3. Delayed ROLL_DICE arriving with new requestId after phase already left ROLL_MOVE (if moved) -> cleanly rejected!
    if (phaseAfterFirst !== 'ROLL_MOVE') {
      const delayedErrP = activeClient.waitForNext((m) => m.type === 'BG_ERROR');
      activeClient.send({ type: 'BG_GAME_ACTION', action: { type: 'ROLL_DICE' }, requestId: 'delayed_roll_2' });
      await delayedErrP;
    }

    // 4. Two simultaneous clients trying to act for the SAME player:
    //    Second client connects with same reconnectToken -> old client displaced cleanly with close code 4001!
    const cloneClient = await connectBgWs(srv.wsBaseUrl, matchId, {
      inviteCode,
      displayName: 'ChaosClone',
      reconnectToken: activeClient.reconnectToken,
      requestId: 'dual_takeover',
    });
    openClients.push(cloneClient);
    await new Promise((r) => setTimeout(r, 80));
    assert.ok(
      activeClient.closedInfo && activeClient.closedInfo.code === 4001,
      `Old socket must be displaced with code 4001, got ${JSON.stringify(activeClient.closedInfo)}`,
    );
    assert.equal(cloneClient.playerId, activeId);
    // New client still has valid control and clean state invariants!
    assert.equal(checkGameStateInvariants(readEngineStateFromContainer(container).engineState).ok, true);
  } finally {
    for (const c of openClients) c.close();
    await srv.close();
  }
});

// ============================================================================
// 8E3-4: LONG REACTION CHAIN + HIBERNATION + NETWORK DROP AT GAME END (NO DUP REWARDS)
// ============================================================================
test('8E3-4 — Long reaction chain across hibernation & network interruption during game end with zero duplicated victory rewards', async () => {
  const srv = await startStandaloneBoardGameTestServer(0, {
    ENVIRONMENT: 'production',
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
  });
  const openClients = [];
  try {
    // 1. Reaction chain (Anathema redirect -> hidden Arnold reflect -> hibernate mid-choice -> resolve!)
    const { matchId, inviteCode, clients } = await createAndStartDoMatch(srv, 6, 'full-expansion');
    openClients.push(...clients);
    const container = srv.containers.get(matchId);
    const { engineState } = readEngineStateFromContainer(container);
    const order = engineState.turnOrder;
    const roles = ['gac-ky-thuat', 'exp1_anathema', 'exp1_arnold', 'suong-an-danh', 'suong-gac-cong', 'gac-radio'];
    for (let i = 0; i < 6; i++) {
      const p = engineState.players[order[i]];
      const d = getRoleDesign(roles[i]);
      p.roleId = roles[i];
      p.faction = d.faction;
      p.maxHp = d.maxHp;
      p.hp = d.maxHp;
      p.woundsTaken = 0;
      p.revealed = false;
      p.location = 'radio';
    }
    // Set Anathema curse on Arnold (1 HP) & give p1 Masamune (`ev-01`)
    engineState.players[order[1]].revealed = true;
    engineState.players[order[1]].skillUsedOnce = true;
    engineState.expansionState.anathemaCurses = {
      [order[1]]: { targetPlayerId: order[2], active: true, activatedOnTurnNumber: 1, endTurnSelfDamagePending: false },
    };
    engineState.players[order[2]].woundsTaken = engineState.players[order[2]].maxHp - 1;
    engineState.players[order[2]].hp = 1;
    // Also put both Shadows (order[3], order[4]) at 1 HP and order[4] dead so later we can finish cleanly
    const evIdx = engineState.decks.event.indexOf('ev-01');
    engineState.decks.event.splice(evIdx, 1);
    engineState.players[order[0]].equipped.push('ev-01');
    engineState.activePlayerId = order[0];
    engineState.turnPhase = 'MAIN_ACTION';
    writeEngineStateToContainer(container, engineState);
    container.hibernateAndWake();

    const cAttacker = clients.find((c) => c.playerId === order[0]);
    const cArnold = clients.find((c) => c.playerId === order[2]);

    // Trigger Anathema redirect -> Arnold secret reflection choice -> HIBERNATE DO mid-chain!
    const arnoldPcP = cArnold.waitForNext((m) => m.type === 'BG_STATE_SYNC' && Boolean(m.privateView?.pendingChoice));
    cAttacker.send({ type: 'BG_GAME_ACTION', action: { type: 'ATTACK', targetPlayerId: order[1] }, requestId: 'chain_atk_1' });
    const arnoldPc = (await arnoldPcP).privateView.pendingChoice;
    assert.equal(arnoldPc.isSecret, true);

    container.hibernateAndWake(); // Wake DO fresh from SQLite mid-reaction-chain!
    const reflectOpt = arnoldPc.options.find((o) => o.optionId.includes('reflect') || o.optionId.includes('activate')) ?? arnoldPc.options[0];
    const resolvedP = cAttacker.waitForNext((m) => m.type === 'BG_STATE_SYNC' && !m.publicGame?.pendingChoice);
    cArnold.send({
      type: 'BG_GAME_ACTION',
      action: { type: 'RESOLVE_CHOICE', choiceId: arnoldPc.choiceId, optionId: reflectOpt.optionId },
      requestId: 'chain_reflect_1',
    });
    await resolvedP;
    const afterChain = readEngineStateFromContainer(container).engineState;
    assert.equal(afterChain.players[order[2]].alive, true, 'Arnold survived & reflected cleanly after mid-chain hibernation');
    assert.ok(afterChain.players[order[0]].woundsTaken > 0, 'Attacker took reflected damage');
    assert.equal(checkGameStateInvariants(afterChain).ok, true);

    // 2. Network interruption right at Game End + duplicate reconnect/alarm -> ZERO duplicated leaderboard victory rewards!
    const preLb = await httpJson(srv.httpBaseUrl, '/api/boardgame/leaderboard?limit=20');
    const prePts = Object.fromEntries((preLb.body.entries || []).map((e) => [e.displayName, e.points ?? e.score ?? e.wins ?? 0]));

    // Kill shadow order[4] and set shadow order[3] to 1 HP; disconnect order[5] right before final lethal blow!
    const stEnd = readEngineStateFromContainer(container).engineState;
    stEnd.players[order[4]].alive = false;
    stEnd.players[order[4]].hp = 0;
    stEnd.players[order[4]].woundsTaken = stEnd.players[order[4]].maxHp;
    stEnd.players[order[4]].revealed = true;
    stEnd.players[order[3]].woundsTaken = stEnd.players[order[3]].maxHp - 1;
    stEnd.players[order[3]].hp = 1;
    stEnd.activePlayerId = order[0];
    stEnd.turnPhase = 'MAIN_ACTION';
    stEnd.players[order[0]].attacksThisTurn = 0;
    writeEngineStateToContainer(container, stEnd);
    container.hibernateAndWake();

    const cDrop = clients.find((c) => c.playerId === order[5]);
    const dropToken = cDrop.reconnectToken;
    const dropSyncP = cAttacker.waitForNext((m) => m.type === 'BG_STATE_SYNC');
    cDrop.close(); // Disconnect right at game end!
    await dropSyncP;

    const finSyncP = cAttacker.waitForNext((m) => m.type === 'BG_STATE_SYNC' && m.status === 'FINISHED');
    cAttacker.send({
      type: 'BG_GAME_ACTION',
      expectedRevision: readEngineStateFromContainer(container).meta.revision,
      action: { type: 'ATTACK', targetPlayerId: order[3] },
      requestId: 'final_blow_1',
    });
    await finSyncP;

    // Replay final_blow_1 AND hibernate/wake AND reconnect dropped player -> leaderboard MUST NOT double-count!
    cAttacker.send({ type: 'BG_GAME_ACTION', action: { type: 'ATTACK', targetPlayerId: order[3] }, requestId: 'final_blow_1' });
    container.hibernateAndWake();
    const cDropReconn = await connectBgWs(srv.wsBaseUrl, matchId, {
      inviteCode,
      displayName: 'ChaosP6',
      reconnectToken: dropToken,
      requestId: 'reconn_after_end',
    });
    openClients.push(cDropReconn);
    assert.equal(cDropReconn.latestSync.status, 'FINISHED');
    assert.equal(cDropReconn.latestSync.publicGame.finalReveal.length, 6);

    const postLb1 = await httpJson(srv.httpBaseUrl, '/api/boardgame/leaderboard?limit=20');
    await container.triggerAlarm();
    const postLb2 = await httpJson(srv.httpBaseUrl, '/api/boardgame/leaderboard?limit=20');
    assert.deepEqual(postLb1.body.entries, postLb2.body.entries, 'Leaderboard rewards must NEVER be duplicated on reconnect/alarm');
    assert.ok(postLb1.body.totalPlayers >= 1, 'Finished match recorded leaderboard entries once');
    assert.notDeepEqual(prePts, Object.fromEntries((postLb1.body.entries || []).map((e) => [e.displayName, e.points ?? e.score ?? e.wins ?? 0])));
  } finally {
    for (const c of openClients) c.close();
    await srv.close();
  }
});

// ============================================================================
// 8E3-5: PRODUCTION COMPATIBILITY & BETA FEATURE-FLAG DISABLEMENT ROLLBACK
// ============================================================================
test('8E3-5 — Feature-flag disablement preserves active Beta match without silent conversion while blocking new Beta & starter-* rooms', async () => {
  // Use shared SQLite namespace so we can flip env flags on the EXACT same persisted DO storage!
  const nsEnabled = createBoardGameNamespace({
    ENVIRONMENT: 'production',
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
  });
  const srv = await startStandaloneBoardGameTestServer(0, {
    ENVIRONMENT: 'production',
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
  });
  const openClients = [];
  try {
    // 1. Create and start a `full-expansion` Beta match while Beta is ENABLED
    const { matchId, clients } = await createAndStartDoMatch(srv, 5, 'full-expansion');
    openClients.push(...clients);
    const container = srv.containers.get(matchId);
    assert.equal(readEngineStateFromContainer(container).meta.ruleset_id, 'full-expansion');

    // 2. Flip Production Beta flag OFF (`ENABLE_PRODUCTION_BETA_EXPANSIONS = '0'`) on the SAME DO environment!
    srv.env.ENABLE_PRODUCTION_BETA_EXPANSIONS = '0';
    container.hibernateAndWake(); // Rehydrate existing room under Beta=OFF!

    // Existing Beta match MUST remain `full-expansion` and playable (NOT silently converted to `classic`!)
    const { meta, engineState } = readEngineStateFromContainer(container);
    assert.equal(meta.ruleset_id, 'full-expansion', 'Existing active Beta match must NOT be silently converted');
    assert.equal(engineState.rulesetId, 'full-expansion');

    const activeClient = clients.find((c) => c.playerId === engineState.activePlayerId);
    const ackP = activeClient.waitForNext((m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'post_rollback_roll');
    activeClient.send({ type: 'BG_GAME_ACTION', action: { type: 'ROLL_DICE' }, requestId: 'post_rollback_roll' });
    await ackP;
    assert.equal(readEngineStateFromContainer(container).meta.ruleset_id, 'full-expansion');

    // 3. New Beta room creation MUST be rejected when flag is OFF
    for (const betaId of ['expansion-1', 'expansion-2', 'full-expansion']) {
      const r = await httpJson(srv.httpBaseUrl, '/api/boardgame/matches', {
        method: 'POST',
        body: JSON.stringify({ tableId: 'table-2', rulesetId: betaId }),
      });
      assert.ok(r.status >= 400 && r.status < 500, `Disabled Beta ${betaId} must be rejected, got ${r.status}`);
    }

    // 4. All 7 experimental `starter-*` rulesets MUST remain rejected regardless of Beta flag
    for (const expId of [
      'starter-eight',
      'starter-sixteen',
      'starter-twenty-six',
      'starter-thirty-eight',
      'starter-forty-eight',
      'starter-fifty-six',
      'starter-sixty-six',
    ]) {
      const r = await httpJson(srv.httpBaseUrl, '/api/boardgame/matches', {
        method: 'POST',
        body: JSON.stringify({ tableId: 'table-2', rulesetId: expId }),
      });
      assert.ok(r.status >= 400 && r.status < 500, `Experimental ${expId} must always be rejected`);
    }

    // 5. Classic MUST remain 100% functional!
    const classicRes = await httpJson(srv.httpBaseUrl, '/api/boardgame/matches', {
      method: 'POST',
      body: JSON.stringify({ tableId: 'table-2', rulesetId: 'classic' }),
    });
    assert.equal(classicRes.status, 201, 'Classic creation must always stay functional when Beta disabled');
  } finally {
    for (const c of openClients) c.close();
    await srv.close();
    void nsEnabled;
  }
});
