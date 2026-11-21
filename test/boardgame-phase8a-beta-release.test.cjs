'use strict';

/**
 * test/boardgame-phase8a-beta-release.test.cjs
 *
 * Phase 8A — Production Beta Feature Flags, Server Validation, Lobby Capabilities,
 * Tier-4 Full-Expansion Gameplay under Production Beta Flags, Safe Rollback Preservation,
 * and Privacy-Safe Beta Telemetry Verification.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
require('./register-ts.cjs');

const { WebSocket } = require('./ws-shim/mini-ws');
const { startStandaloneBoardGameTestServer } = require('./ws-shim/boardgame-do-harness.cjs');
const contracts = require('../shared/contracts/boardgame.ts');
const domain = require('../features/boardgame/domain/index.ts');
const observability = require('../worker/src/boardgame-observability.ts');

class WsTestClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.messages = [];
    this.waiters = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url, { headers: { Origin: 'https://hustverse.vercel.app' } });
      this.ws = ws;
      ws.once('open', () => resolve());
      ws.once('error', reject);
      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(String(raw));
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

  nextMsg(predicate, timeoutMs = 6000, fromIndex = 0) {
    for (let i = fromIndex; i < this.messages.length; i += 1) {
      if (predicate(this.messages[i])) return Promise.resolve(this.messages[i]);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w.timer !== timer);
        reject(new Error(`Timed out waiting for WS message (${timeoutMs}ms)`));
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

let testIpCounter = 1;
function nextTestHeaders() {
  testIpCounter += 1;
  return {
    'Content-Type': 'application/json',
    Origin: 'https://hustverse.vercel.app',
    'X-Forwarded-For': `10.8.0.${(testIpCounter % 250) + 1}`,
  };
}

async function createAndJoinRoom(srv, { rulesetId, playerCount, withSpectator = true }) {
  const createRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
    method: 'POST',
    headers: nextTestHeaders(),
    body: JSON.stringify({
      tableId: 'table-1',
      hostName: 'HostBeta',
      ...(rulesetId ? { rulesetId } : {}),
      turnTimeoutMs: 0,
    }),
  });
  const created = await createRes.json();
  assert.equal(createRes.status, 201, `Create room failed: ${JSON.stringify(created)}`);
  const { matchId, inviteCode } = created;

  const clients = [];
  const auths = [];
  for (let i = 0; i < playerCount; i += 1) {
    const c = new WsTestClient(`${srv.wsBaseUrl}/ws/boardgame?matchId=${matchId}`);
    await c.connect();
    clients.push(c);
    c.send({
      type: 'BG_JOIN',
      matchId,
      inviteCode,
      displayName: `Player_${i + 1}`,
      asSpectator: false,
      preferredSeatIndex: i,
      requestId: `j_${matchId}_${i}`,
    });
    const auth = await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    auths.push(auth);
    await c.nextMsg((m) => m.type === 'BG_STATE_SYNC');
  }

  let spectator = null;
  if (withSpectator) {
    spectator = new WsTestClient(`${srv.wsBaseUrl}/ws/boardgame?matchId=${matchId}`);
    await spectator.connect();
    spectator.send({
      type: 'BG_JOIN',
      matchId,
      inviteCode,
      displayName: 'SpecBeta',
      asSpectator: true,
      requestId: `jspec_${matchId}`,
    });
    await spectator.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    await spectator.nextMsg((m) => m.type === 'BG_STATE_SYNC');
  }

  return { matchId, inviteCode, clients, auths, spectator };
}

async function startRoom(room) {
  for (let i = 1; i < room.clients.length; i += 1) {
    room.clients[i].send({ type: 'BG_SET_READY', ready: true, requestId: `rdy_${room.matchId}_${i}` });
    await room.clients[i].nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === `rdy_${room.matchId}_${i}`);
  }
  const idxs = room.clients.map((c) => c.messages.length);
  const specIdx = room.spectator ? room.spectator.messages.length : 0;
  room.clients[0].send({ type: 'BG_START_MATCH', requestId: `start_${room.matchId}` });
  const syncs = await Promise.all(
    room.clients.map((c, idx) =>
      c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING', 6000, idxs[idx]),
    ),
  );
  const specSync = room.spectator
    ? await room.spectator.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING', 6000, specIdx)
    : null;
  return { syncs, specSync };
}

function closeRoom(room) {
  room.spectator?.close();
  for (const c of room.clients) c.close();
}

// ---------------------------------------------------------------------------
// P8A-1: Feature Flag Parser & RulesetRegistry Gating (Default-Off / Partial / Full / Starter Lock)
// ---------------------------------------------------------------------------
test('P8A-1 — Production Beta feature flags default OFF, independent allowlist, starter-* always gated, releaseStatus distinct', () => {
  // 1. Default-off when env missing or '0'
  const off1 = contracts.resolveProductionBetaConfigFromEnv({});
  assert.equal(off1.enableProductionBetaExpansions, false);
  assert.deepEqual(off1.betaAllowedRulesets, []);

  const off2 = contracts.resolveProductionBetaConfigFromEnv({
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '0',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
  });
  assert.equal(off2.enableProductionBetaExpansions, false);
  assert.deepEqual(off2.betaAllowedRulesets, []);

  const defaultCaps = domain.DEFAULT_RULESET_REGISTRY.getPublicServerCapabilities();
  assert.equal(defaultCaps.betaEnabled, false);
  assert.equal(defaultCaps.rulesets.length, 4, 'Public API exposes ONLY 4 production rulesets');
  assert.equal(defaultCaps.rulesets.find((r) => r.id === 'classic').status, 'stable');
  assert.equal(defaultCaps.rulesets.find((r) => r.id === 'classic').releaseStatus, 'PUBLIC_RELEASE_APPROVED');
  for (const id of ['expansion-1', 'expansion-2', 'full-expansion']) {
    const item = defaultCaps.rulesets.find((r) => r.id === id);
    assert.equal(item.selectable, false);
    assert.equal(item.status, 'unavailable');
    assert.equal(domain.DEFAULT_RULESET_REGISTRY.validateRulesetForMatch(id, 4).ok, false);
  }

  // 2. Partial independent allowlist (only expansion-1) + attempted smuggling of starter-fifty-six
  const partialCfg = contracts.resolveProductionBetaConfigFromEnv({
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,starter-fifty-six,custom-hack,expansion-1',
  });
  assert.equal(partialCfg.enableProductionBetaExpansions, true);
  assert.deepEqual(partialCfg.betaAllowedRulesets, ['expansion-1']);

  assert.equal(
    domain.DEFAULT_RULESET_REGISTRY.validateRulesetForMatch('expansion-1', 6, { productionBeta: partialCfg }).ok,
    true,
  );
  assert.equal(
    domain.DEFAULT_RULESET_REGISTRY.validateRulesetForMatch('expansion-2', 6, { productionBeta: partialCfg }).code,
    'RULESET_UNAVAILABLE',
  );
  assert.equal(
    domain.DEFAULT_RULESET_REGISTRY.validateRulesetForMatch('full-expansion', 6, { productionBeta: partialCfg }).code,
    'RULESET_UNAVAILABLE',
  );
  assert.equal(
    domain.DEFAULT_RULESET_REGISTRY.validateRulesetForMatch('starter-fifty-six', 6, { productionBeta: partialCfg }).code,
    'RULESET_UNAVAILABLE',
  );

  // 3. Full Production Beta (all 3 beta packs enabled; starter-* STILL blocked; releaseStatus distinct!)
  const fullBetaCfg = contracts.resolveProductionBetaConfigFromEnv({
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
  });
  const betaCaps = domain.DEFAULT_RULESET_REGISTRY.getPublicServerCapabilities({
    productionBeta: fullBetaCfg,
  });
  assert.equal(betaCaps.betaEnabled, true);
  assert.deepEqual(betaCaps.betaAllowedRulesets, ['expansion-1', 'expansion-2', 'full-expansion']);
  assert.equal(betaCaps.rulesets.length, 4, 'Never expose starter-* in public capabilities');
  const byId = Object.fromEntries(betaCaps.rulesets.map((r) => [r.id, r]));
  assert.equal(byId.classic.releaseStatus, 'PUBLIC_RELEASE_APPROVED');
  assert.equal(byId.classic.isDefault, true);
  for (const [id, count] of [
    ['expansion-1', 36],
    ['expansion-2', 40],
    ['full-expansion', 66],
  ]) {
    assert.equal(byId[id].status, 'beta');
    assert.equal(byId[id].releaseStatus, 'PRODUCTION_BETA_ENABLED');
    assert.notEqual(byId[id].releaseStatus, 'PUBLIC_RELEASE_APPROVED');
    assert.equal(byId[id].selectable, true);
    assert.equal(byId[id].isBeta, true);
    assert.equal(byId[id].expectedCharacterCount, count);
    const val = domain.DEFAULT_RULESET_REGISTRY.validateRulesetForMatch(id, 8, {
      productionBeta: fullBetaCfg,
    });
    assert.equal(val.ok, true);
  }
  for (const starterId of contracts.BOARD_GAME_EXPERIMENTAL_RULESETS) {
    const val = domain.DEFAULT_RULESET_REGISTRY.validateRulesetForMatch(starterId, 6, {
      productionBeta: fullBetaCfg,
    });
    assert.equal(val.ok, false);
    assert.equal(val.code, 'RULESET_UNAVAILABLE', `${starterId} must remain gated under Production Beta`);
  }
});

// ---------------------------------------------------------------------------
// P8A-2: Real DO HTTP/WS Validation — Disabled vs Enabled, 4P–8P, 5P N.C. Soldier, Host-Only & Reconnect
// ---------------------------------------------------------------------------
test('P8A-2 — Real DO: disabled-flag rejection, enabled Beta 4P-8P rooms, host-only BG_SET_RULESET, lock-after-start, F5 reconnect & spectator privacy', async () => {
  // Part A: Disabled flags server MUST reject all Beta & starter rulesets
  const offSrv = await startStandaloneBoardGameTestServer(0, {});
  try {
    const rsRes = await fetch(`${offSrv.httpBaseUrl}/api/boardgame/rulesets`);
    const rsJson = await rsRes.json();
    assert.equal(rsRes.status, 200);
    assert.equal(rsJson.betaEnabled, false);
    assert.equal(rsJson.rulesets.filter((r) => r.selectable).length, 1);

    for (const blocked of ['expansion-1', 'expansion-2', 'full-expansion', 'starter-fifty-six']) {
      const r = await fetch(`${offSrv.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: nextTestHeaders(),
        body: JSON.stringify({ tableId: 'table-1', hostName: 'OffHost', rulesetId: blocked }),
      });
      assert.equal(r.status, 400);
      const j = await r.json();
      assert.equal(j.code, 'RULESET_UNAVAILABLE');
    }
  } finally {
    await offSrv.close();
  }

  // Part B: Enabled Production Beta server (ALLOW_EXPERIMENTAL_RULESETS UNSET!)
  const betaSrv = await startStandaloneBoardGameTestServer(0, {
    ENVIRONMENT: 'production',
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
  });
  try {
    const capsRes = await fetch(`${betaSrv.httpBaseUrl}/api/boardgame/rulesets`);
    const caps = await capsRes.json();
    assert.equal(capsRes.status, 200);
    assert.equal(caps.betaEnabled, true);
    assert.deepEqual(caps.betaAllowedRulesets, ['expansion-1', 'expansion-2', 'full-expansion']);
    assert.equal(caps.rulesets.some((r) => r.id.startsWith('starter-')), false);

    // Every legacy starter-* pool MUST remain rejected!
    for (const starterId of contracts.BOARD_GAME_EXPERIMENTAL_RULESETS) {
      const r = await fetch(`${betaSrv.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: nextTestHeaders(),
        body: JSON.stringify({ tableId: 'table-1', hostName: 'Probe', rulesetId: starterId }),
      });
      assert.equal(r.status, 400);
      const j = await r.json();
      assert.equal(j.code, 'RULESET_UNAVAILABLE');
    }

    // Verify Classic (4P), Expansion 1 (5P), Expansion 2 (5P), Full Expansion (4P, 5P, 6P, 7P, 8P)
    const matrix = [
      { rulesetId: 'classic', playerCount: 4, switchFromClassic: false },
      { rulesetId: 'expansion-1', playerCount: 5, switchFromClassic: true },
      { rulesetId: 'expansion-2', playerCount: 5, switchFromClassic: false },
      { rulesetId: 'full-expansion', playerCount: 4, switchFromClassic: false },
      { rulesetId: 'full-expansion', playerCount: 5, switchFromClassic: false },
      { rulesetId: 'full-expansion', playerCount: 6, switchFromClassic: false },
      { rulesetId: 'full-expansion', playerCount: 7, switchFromClassic: false },
      { rulesetId: 'full-expansion', playerCount: 8, switchFromClassic: false },
    ];

    for (const item of matrix) {
      const room = await createAndJoinRoom(betaSrv, {
        rulesetId: item.switchFromClassic ? 'classic' : item.rulesetId,
        playerCount: item.playerCount,
        withSpectator: true,
      });
      try {
        if (item.switchFromClassic) {
          // Non-host rejected
          room.clients[1].send({
            type: 'BG_SET_RULESET',
            rulesetId: item.rulesetId,
            requestId: 'bad_nonhost',
          });
          const err = await room.clients[1].nextMsg((m) => m.type === 'BG_ERROR');
          assert.equal(err.code, 'NOT_HOST');

          // Host switches to expansion-1
          const p2Idx = room.clients[1].messages.length;
          room.clients[0].send({
            type: 'BG_SET_RULESET',
            rulesetId: item.rulesetId,
            requestId: 'ok_host_rs',
          });
          const syncP2 = await room.clients[1].nextMsg(
            (m) => m.type === 'BG_STATE_SYNC' && m.rulesetId === item.rulesetId,
            6000,
            p2Idx,
          );
          assert.equal(syncP2.rulesetId, item.rulesetId);
          assert.equal(syncP2.betaEnabled, true);
          assert.equal(syncP2.availableRulesets.length, 4);
        }

        const { syncs, specSync } = await startRoom(room);
        const roles = syncs.map((s) => s.privateView.roleId);
        assert.equal(new Set(roles).size, item.playerCount);
        assert.equal(specSync.privateView, null, 'Spectator privacy preserved');
        if (item.playerCount === 5) {
          assert.equal(
            roles.includes('exp2_nc_soldier'),
            false,
            `exp2_nc_soldier excluded from 5P in ${item.rulesetId}`,
          );
        }

        // Ruleset cannot change after start
        room.clients[0].send({
          type: 'BG_SET_RULESET',
          rulesetId: 'classic',
          requestId: `lock_${item.rulesetId}_${item.playerCount}`,
        });
        const lockErr = await room.clients[0].nextMsg(
          (m) => m.type === 'BG_ERROR' && m.requestId === `lock_${item.rulesetId}_${item.playerCount}`,
        );
        assert.equal(lockErr.code, 'INVALID_ACTION');

        // F5 reconnect preserves rulesetId + private role + availableRulesets
        const p0Role = syncs[0].privateView.roleId;
        room.clients[0].close();
        const re = new WsTestClient(`${betaSrv.wsBaseUrl}/ws/boardgame?matchId=${room.matchId}`);
        await re.connect();
        room.clients[0] = re;
        re.send({
          type: 'BG_JOIN',
          matchId: room.matchId,
          inviteCode: room.inviteCode,
          displayName: 'Player_1',
          asSpectator: false,
          reconnectToken: room.auths[0].reconnectToken,
          requestId: `re_${item.rulesetId}_${item.playerCount}`,
        });
        const reSync = await re.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING');
        assert.equal(reSync.rulesetId, item.rulesetId);
        assert.equal(reSync.privateView.roleId, p0Role);
        assert.equal(reSync.availableRulesets.length, 4);
      } finally {
        closeRoom(room);
      }
    }
  } finally {
    await betaSrv.close();
  }
});

// ---------------------------------------------------------------------------
// P8A-3: Tier-4 Mechanics on Production Beta `full-expansion` + Safe Rollback Preservation
// ---------------------------------------------------------------------------
test('P8A-3 — Production Beta `full-expansion` Tier-4 mechanics (Voodoo/Undead/Bonnie/Cain/N.C. Soldier) & Safe Rollback preserves active match', async () => {
  const mutableEnv = {
    ENVIRONMENT: 'production',
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
  };
  const srv = await startStandaloneBoardGameTestServer(0, mutableEnv);
  let room = null;
  try {
    room = await createAndJoinRoom(srv, {
      rulesetId: 'full-expansion',
      playerCount: 6,
      withSpectator: true,
    });
    await startRoom(room);

    // Inspect SQLite DO directly to verify persisted ruleset_id & inject deterministic Tier-4 state
    const sql = srv.containers.get(room.matchId).ctx.storage.sql;
    const currentRev = () => Number(sql.exec('SELECT revision FROM matches LIMIT 1').one().revision);
    const matchRow = sql.exec('SELECT ruleset_id, catalog_version, game_state_json FROM matches LIMIT 1').one();
    assert.equal(matchRow.ruleset_id, 'full-expansion');
    assert.equal(matchRow.catalog_version, contracts.BOARD_GAME_CATALOG_VERSION);
    const wrapped = JSON.parse(matchRow.game_state_json);
    const st = wrapped.engineState;
    assert.equal(st.rulesetId, 'full-expansion');

    // Deterministic Tier-4 check on full-expansion:
    // p0=Voodoo, p1=Undead (1 HP), p2=Bonnie, p3=Cain (skill armed, 1 HP), p4=N.C. Soldier, p5=Hidden Neutral
    const pids = room.auths.map((a) => a.playerId);
    const assign = (pid, roleId, extra = {}) => {
      const d = domain.getRoleDesign(roleId);
      const p = st.players[pid];
      p.roleId = roleId;
      p.faction = d.faction;
      p.maxHp = d.maxHp;
      p.woundsTaken = extra.woundsTaken ?? 0;
      p.hp = Math.max(0, d.maxHp - p.woundsTaken);
      p.revealed = Boolean(extra.revealed);
      p.location = extra.location ?? 'corridor';
      p.alive = true;
      p.hand = [];
      p.equipped = extra.equipped ?? [];
      p.skillUsedOnce = Boolean(extra.skillUsedOnce);
    };
    assign(pids[0], 'exp1_voodoo', { revealed: true, location: 'lobby' });
    assign(pids[1], 'exp1_undead', { woundsTaken: 10, location: 'corridor' });
    assign(pids[2], 'exp2_bonnie', { revealed: false, location: 'corridor' });
    assign(pids[3], 'exp2_cain', { revealed: true, woundsTaken: 10, location: 'corridor' });
    assign(pids[4], 'exp2_nc_soldier', { revealed: true, location: 'corridor' });
    assign(pids[5], 'lang-quan-sat', { revealed: false, woundsTaken: 6, location: 'corridor' });

    const exp = domain.ensureExpansionState(st);
    exp.cainDeathVictoryModifierIds = [pids[3]];
    st.turnOrder = [...pids];
    st.activePlayerId = pids[0];
    st.turnPhase = 'ROLL_MOVE';
    sql.exec('UPDATE matches SET game_state_json = ? WHERE match_id = ?', JSON.stringify(wrapped), room.matchId);

    // 1. Voodoo schedules hijack on Bonnie (p2)
    room.clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'p8_voodoo_skill',
      expectedRevision: currentRev(),
      action: { type: 'USE_SKILL', targetPlayerId: pids[2] },
    });
    const vAck = await room.clients[0].nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'p8_voodoo_skill');
    assert.equal(vAck.ok, true);

    // 2. N.C. Soldier recruitment restriction on hidden Neutral (p5) MUST fail on server (oracle protection!)
    const curWrapped = JSON.parse(sql.exec('SELECT game_state_json FROM matches LIMIT 1').one().game_state_json);
    const st2 = curWrapped.engineState;
    st2.activePlayerId = pids[4];
    st2.turnPhase = 'MAIN_ACTION';
    sql.exec('UPDATE matches SET game_state_json = ? WHERE match_id = ?', JSON.stringify(curWrapped), room.matchId);

    room.clients[4].send({
      type: 'BG_GAME_ACTION',
      requestId: 'p8_nc_hidden_probe',
      expectedRevision: currentRev(),
      action: { type: 'USE_SKILL', targetPlayerId: pids[5] },
    });
    const ncReject = await room.clients[4].nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'p8_nc_hidden_probe',
    );
    assert.equal(ncReject.ok, false, 'N.C. Soldier MUST NOT recruit unrevealed Neutral');

    // 3. Undead dormancy -> 6 HP revival & Bonnie dynamic allegiance verified on full-expansion state!
    const st3 = JSON.parse(sql.exec('SELECT game_state_json FROM matches LIMIT 1').one().game_state_json).engineState;
    st3.activePlayerId = pids[2];
    st3.turnPhase = 'LOCATION_ACTION';
    const dormRes = domain.applyPlayerGameAction(
      st3,
      pids[2],
      { type: 'USE_LOC_POWER', targetPlayerId: pids[1], mode: 'damage' },
      Date.now(),
    );
    assert.equal(dormRes.ok, true);
    assert.equal(domain.getPlayerLifecycleState(st3, st3.players[pids[1]]), 'DORMANT_PENDING_REVIVE');
    // Force revival on Undead's next turn -> 6 HP, then Bonnie kills Revived Undead -> Bonnie converts to mist-order!
    st3.turnPhase = 'MAIN_ACTION';
    st3.turnOrder = [pids[2], pids[1], pids[3], pids[4], pids[5], pids[0]];
    assert.equal(domain.applyPlayerGameAction(st3, pids[2], { type: 'END_TURN' }, Date.now()).ok, true);
    assert.equal(st3.players[pids[1]].hp, 6, 'Undead revived with 6 HP on full-expansion');
    assert.equal(domain.getPlayerLifecycleState(st3, st3.players[pids[1]]), 'REVIVED');
    st3.activePlayerId = pids[2];
    st3.turnPhase = 'LOCATION_ACTION';
    st3.players[pids[1]].hp = 1;
    st3.players[pids[1]].woundsTaken = 10;
    assert.equal(
      domain.applyPlayerGameAction(st3, pids[2], { type: 'USE_LOC_POWER', targetPlayerId: pids[1], mode: 'damage' }, Date.now()).ok,
      true,
    );
    assert.equal(domain.getEffectiveFaction(st3, st3.players[pids[2]]), 'mist-order', 'Bonnie converted to Shadow');

    // 4. SAFE ROLLBACK SIMULATION: flip ENABLE_PRODUCTION_BETA_EXPANSIONS = '0' while `full-expansion` room is LIVE!
    srv.env.ENABLE_PRODUCTION_BETA_EXPANSIONS = '0';

    // 4a. New Beta room creation MUST be blocked immediately
    const blockedBeta = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: nextTestHeaders(),
      body: JSON.stringify({ tableId: 'table-2', hostName: 'AfterRollback', rulesetId: 'full-expansion' }),
    });
    assert.equal(blockedBeta.status, 400);
    assert.equal((await blockedBeta.json()).code, 'RULESET_UNAVAILABLE');

    // 4b. Classic room creation MUST stay available!
    const okClassic = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: nextTestHeaders(),
      body: JSON.stringify({ tableId: 'table-2', hostName: 'ClassicAfterRollback', rulesetId: 'classic' }),
    });
    assert.equal(okClassic.status, 201);

    // 4c. Already-running `full-expansion` match MUST survive rollback without conversion or data loss AND complete Cain multi-faction victory!
    room.clients[2].close();
    const reBonnie = new WsTestClient(`${srv.wsBaseUrl}/ws/boardgame?matchId=${room.matchId}`);
    await reBonnie.connect();
    room.clients[2] = reBonnie;
    reBonnie.send({
      type: 'BG_JOIN',
      matchId: room.matchId,
      inviteCode: room.inviteCode,
      displayName: 'Player_3',
      asSpectator: false,
      reconnectToken: room.auths[2].reconnectToken,
      requestId: 're_after_rollback',
    });
    const reSync = await reBonnie.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING');
    assert.equal(reSync.rulesetId, 'full-expansion', 'Active Beta match preserved its rulesetId after rollback');
    assert.equal(reSync.betaEnabled, false, 'Updated server capability reflects rollback');

    // Trigger Cain multi-faction victory on the active match to finish cleanly & record telemetry!
    const finWrapped = JSON.parse(sql.exec('SELECT game_state_json FROM matches LIMIT 1').one().game_state_json);
    finWrapped.engineState.activePlayerId = pids[2];
    finWrapped.engineState.turnPhase = 'LOCATION_ACTION';
    sql.exec('UPDATE matches SET game_state_json = ? WHERE match_id = ?', JSON.stringify(finWrapped), room.matchId);
    const idxFin = reBonnie.messages.length;
    reBonnie.send({
      type: 'BG_GAME_ACTION',
      requestId: 'kill_cain_finish',
      expectedRevision: currentRev(),
      action: { type: 'USE_LOC_POWER', targetPlayerId: pids[3], mode: 'damage' },
    });
    const finSync = await reBonnie.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.status === 'FINISHED',
      6000,
      idxFin,
    );
    assert.equal(finSync.publicGame.winnerFaction, 'multi-faction', 'Cain multi-faction victory completed after rollback');
    assert.deepEqual(finSync.publicGame.winningFactions, ['lantern-guard', 'mist-order']);
  } finally {
    if (room) closeRoom(room);
    await srv.close();
  }
});

// ---------------------------------------------------------------------------
// P8A-4: Production Beta Telemetry Accuracy, Token Gate & Strict P0 Privacy Audit
// ---------------------------------------------------------------------------
test('P8A-4 — Beta telemetry records matches/rulesets/errors/durations/roles with ZERO tokens, ZERO PII, ZERO active hidden roles', async () => {
  const capturedLogs = [];
  observability.resetBoardGameObservabilityForTest();
  observability.setBoardGameLogSink((entry) => capturedLogs.push(entry));

  const srv = await startStandaloneBoardGameTestServer(0, {
    ENVIRONMENT: 'production',
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
    BETA_TELEMETRY_TOKEN: 'secret-ops-token-8a',
  });
  let room = null;
  try {
    room = await createAndJoinRoom(srv, {
      rulesetId: 'expansion-1',
      playerCount: 4,
      withSpectator: false,
    });
    const { syncs } = await startRoom(room);

    // Trigger an invalid action (wrong player tries ROLL_DICE) so invalidActionAttempts increments
    const activeId = syncs[0].publicGame.activePlayerId;
    const wrongIdx = room.auths.findIndex((a) => a.playerId !== activeId);
    room.clients[wrongIdx].send({
      type: 'BG_GAME_ACTION',
      requestId: 'bad_turn_probe',
      expectedRevision: syncs[0].revision,
      action: { type: 'ROLL_DICE' },
    });
    await room.clients[wrongIdx].nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'bad_turn_probe');

    // Trigger a disconnect + reconnect so disconnections & reconnectAttempts increment
    const p0Token = room.auths[0].reconnectToken;
    room.clients[0].close();
    await new Promise((r) => setTimeout(r, 80));
    const re0 = new WsTestClient(`${srv.wsBaseUrl}/ws/boardgame?matchId=${room.matchId}`);
    await re0.connect();
    room.clients[0] = re0;
    re0.send({
      type: 'BG_JOIN',
      matchId: room.matchId,
      inviteCode: room.inviteCode,
      displayName: 'Player_1',
      asSpectator: false,
      reconnectToken: p0Token,
      requestId: 're_tel_0',
    });
    await re0.nextMsg((m) => m.type === 'BG_STATE_SYNC');

    // Before match finishes: unauthenticated telemetry MUST hide perCharacterStats (gated by token) & NEVER expose active roles!
    const unauthTelRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/telemetry`);
    const unauthTel = await unauthTelRes.json();
    assert.equal(unauthTelRes.status, 200);
    assert.equal(unauthTel.perCharacterStats, null, 'Per-role stats gated when BETA_TELEMETRY_TOKEN is set');
    assert.equal(unauthTel.summary.matchesCreated, 1);
    assert.equal(unauthTel.summary.matchesStarted, 1);
    assert.equal(unauthTel.summary.matchesCompleted, 0);
    assert.equal(unauthTel.rulesetPopularity.created['expansion-1'], 1);
    assert.equal(unauthTel.playerCountDistribution['4'], 1);
    assert.ok(unauthTel.operational.invalidActionAttempts >= 1);
    assert.ok(unauthTel.operational.disconnections >= 1);
    assert.ok(unauthTel.operational.reconnectAttempts >= 1);

    // Authenticated telemetry while match is STILL PLAYING MUST have 0 role rows (post-match aggregate ONLY!)
    const authTelPlaying = await (
      await fetch(`${srv.httpBaseUrl}/api/boardgame/telemetry`, {
        headers: { Authorization: 'Bearer secret-ops-token-8a' },
      })
    ).json();
    assert.deepEqual(
      authTelPlaying.perCharacterStats,
      [],
      'Active match hidden roles MUST NEVER appear in telemetry before match finishes',
    );

    // Finish the match cleanly via lethal location power on last Shadow -> verify post-match aggregate telemetry
    const sql = srv.containers.get(room.matchId).ctx.storage.sql;
    const revNow = Number(sql.exec('SELECT revision FROM matches LIMIT 1').one().revision);
    const wrapped = JSON.parse(sql.exec('SELECT game_state_json FROM matches LIMIT 1').one().game_state_json);
    const st = wrapped.engineState;
    const pids = room.auths.map((a) => a.playerId);
    for (let i = 0; i < 4; i++) {
      const rid = i < 2 ? (i === 0 ? 'gac-ky-thuat' : 'exp1_lloyd') : (i === 2 ? 'suong-an-danh' : 'exp1_voodoo');
      const d = domain.getRoleDesign(rid);
      st.players[pids[i]].roleId = rid;
      st.players[pids[i]].faction = d.faction;
      st.players[pids[i]].maxHp = d.maxHp;
      st.players[pids[i]].hp = i === 3 ? 1 : i === 2 ? 0 : d.maxHp;
      st.players[pids[i]].woundsTaken = i === 3 ? d.maxHp - 1 : i === 2 ? d.maxHp : 0;
      st.players[pids[i]].alive = i !== 2;
      st.players[pids[i]].location = 'corridor';
    }
    st.activePlayerId = pids[0];
    st.turnPhase = 'LOCATION_ACTION';
    sql.exec('UPDATE matches SET game_state_json = ? WHERE match_id = ?', JSON.stringify(wrapped), room.matchId);

    const idxBeforeFin = re0.messages.length;
    re0.send({
      type: 'BG_GAME_ACTION',
      requestId: 'finish_exp1_match',
      expectedRevision: revNow,
      action: { type: 'USE_LOC_POWER', targetPlayerId: pids[3], mode: 'damage' },
    });
    await re0.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'FINISHED', 6000, idxBeforeFin);

    const authTelDone = await (
      await fetch(`${srv.httpBaseUrl}/api/boardgame/telemetry`, {
        headers: { Authorization: 'Bearer secret-ops-token-8a' },
      })
    ).json();
    assert.equal(authTelDone.summary.matchesCompleted, 1);
    assert.equal(authTelDone.rulesetPopularity.completed['expansion-1'], 1);
    assert.equal(authTelDone.victoryDistribution['lantern-guard'], 1);
    assert.equal(authTelDone.perCharacterStats.length, 4);
    assert.equal(authTelDone.perCharacterStats.find((r) => r.roleId === 'exp1_lloyd').wins, 1);

    // Strict P0 privacy scan across telemetry JSON + all captured logs!
    const allTokens = room.auths.map((a) => a.reconnectToken);
    const telRaw = JSON.stringify(authTelDone);
    const logsRaw = JSON.stringify(capturedLogs);
    for (const tok of allTokens) {
      assert.equal(telRaw.includes(tok), false, 'Telemetry MUST NEVER leak reconnectToken');
      assert.equal(logsRaw.includes(tok), false, 'Logs MUST NEVER leak reconnectToken');
    }
    assert.equal(telRaw.includes('Player_1'), false, 'Telemetry MUST NEVER include player display names');
    assert.equal(telRaw.includes('HostBeta'), false, 'Telemetry MUST NEVER include host display names');
    assert.equal(telRaw.includes(room.matchId), false, 'Telemetry MUST NEVER include raw matchId');
  } finally {
    observability.setBoardGameLogSink(null);
    if (room) closeRoom(room);
    await srv.close();
  }
});
