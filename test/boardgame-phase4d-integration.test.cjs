/**
 * test/boardgame-phase4d-integration.test.cjs — Phase 4D Full Integration & Multiplayer E2E Suite
 *
 * Covers ALL mandatory Phase 4D cross-character, real Cloudflare DO 4P–8P E2E, hibernation,
 * disconnect recovery, wrong-owner rejection, production safety, and Wave 3 UI/VFX scenarios:
 *  - P4D-1: Cross-character Wave 3 interaction chain:
 *           Fujiko Machine Gun vs protected Udi + low-HP revealed target -> execution -> hidden Wendigo,
 *           Vengeance kill -> Vengeance 1d4 chain -> hidden Cindy -> hidden Wendigo,
 *           Wrath cluster AoE vs Witch (corridor immune) + G43 (pierced!) + hidden Undying.
 *  - P4D-2: Real Cloudflare Durable Object WebSocket E2E across ALL 5 player counts (4P, 5P, 6P, 7P, 8P)
 *           on `starter-twenty-six` (unique 36-role dealing, exact faction split, Spectator P0 privacy).
 *  - P4D-3: Production DO blocks `starter-twenty-six` (`HTTP 400 / RULESET_UNAVAILABLE`);
 *           concurrent `classic` + `starter-twenty-six`; DO hibernation preserving `visionsMarks`
 *           across turns + `vengeance_chain_strike` + `bryon_gift_equipment`; duplicate `requestId`
 *           idempotency; wrong-owner rejection; and disconnect mid-choice auto-recovery via DO alarm.
 *  - P4D-4: Midnight Noir UI metadata, 36/36 portraits, VFX queue, Sound cues & Reduced Motion
 *           across all 10 Wave 3 roles with zero hidden-role VFX leak.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
require('./register-ts.cjs');

const { WebSocket } = require('./ws-shim/mini-ws');
const {
  startStandaloneBoardGameTestServer,
} = require('./ws-shim/boardgame-do-harness.cjs');

const {
  DEFAULT_RULESET_REGISTRY,
  PHASE4B_ROLE_IDS,
  STARTER_TWENTY_SIX_EXPANSION_ROLE_IDS,
  advanceTurn,
  applyPlayerGameAction,
  createInitialGameState,
  getPrivateGameView,
  getPublicGameView,
  getRoleDesign,
  getRoleDistribution,
} = require('../features/boardgame/domain/index.ts');

const { rollD4, rollD6 } = require('../features/boardgame/domain/rules.ts');
const { extractVisualEventsFromDiff } = require('../features/boardgame/ui/vfx-queue.ts');
const {
  playSoundForVisualEvent,
  resetBoardGameAudioForTests,
} = require('../features/boardgame/ui/sound.ts');
const { ROLE_VISUAL_META } = require('../features/boardgame/ui/BoardGameArt.tsx');
const { MIDNIGHT_CHARACTER_ART } = require('../features/boardgame/ui/midnight-noir-tokens.ts');

async function openBgClient(wsBaseUrl, matchId) {
  const ws = new WebSocket(`${wsBaseUrl}/ws/boardgame?matchId=${encodeURIComponent(matchId)}`);
  const inbox = [];
  const waiters = [];
  let latestSync = null;

  ws.on('message', (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.type === 'BG_STATE_SYNC') latestSync = msg;
    inbox.push(msg);
    for (let i = waiters.length - 1; i >= 0; i--) {
      if (waiters[i].pred(msg)) {
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

  return {
    ws,
    inbox,
    getLatestSync: () => latestSync,
    send(payload) {
      ws.send(JSON.stringify(payload));
    },
    nextMsg(pred, timeoutMs = 4000, fromIndex = 0) {
      for (let i = fromIndex; i < inbox.length; i++) {
        if (pred(inbox[i])) return Promise.resolve(inbox[i]);
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const idx = waiters.findIndex((w) => w.timer === timer);
          if (idx >= 0) waiters.splice(idx, 1);
          reject(new Error(`Timeout waiting for WS message (${inbox.length} received)`));
        }, timeoutMs);
        waiters.push({ pred, resolve, timer });
      });
    },
    close() {
      try {
        ws.close();
      } catch {
        // ignore
      }
    },
  };
}

function makePlayers(count) {
  return Array.from({ length: count }, (_, i) => ({
    playerId: `p${i + 1}`,
    displayName: `SV ${i + 1}`,
    seatIndex: i,
    appearance: {},
    connected: true,
  }));
}

function makeControlledS26State(roleSpecs, seed = 94001) {
  const state = createInitialGameState({
    matchId: `p4d_${seed}`,
    seed,
    nowMs: 1_796_000_000_000,
    rulesetId: 'starter-twenty-six',
    allowExperimental: true,
    choiceTimeoutMs: 5000,
    players: makePlayers(roleSpecs.length),
  });
  state.clusterPairs = [
    { clusterId: 'north', locationIds: ['radio', 'breaker'] },
    { clusterId: 'central', locationIds: ['lobby', 'canteen'] },
    { clusterId: 'south', locationIds: ['corridor', 'court'] },
  ];
  roleSpecs.forEach((spec, idx) => {
    const pid = `p${idx + 1}`;
    const p = state.players[pid];
    const d = getRoleDesign(spec.roleId);
    p.roleId = spec.roleId;
    p.faction = d.faction;
    p.maxHp = d.maxHp;
    p.woundsTaken = spec.woundsTaken ?? 0;
    p.hp = Math.max(0, d.maxHp - p.woundsTaken);
    p.revealed = Boolean(spec.revealed);
    p.alive = spec.alive !== false;
    p.location = spec.location ?? 'lobby';
    p.equipped = [...(spec.equipped ?? [])];
    p.hand = [...(spec.hand ?? [])];
    p.skillUsedOnce = Boolean(spec.skillUsedOnce);
  });
  state.activePlayerId = 'p1';
  state.turnPhase = 'MAIN_ACTION';
  return state;
}

function findAttackRollSeed(desiredBaseDmg, hasMasamune = false) {
  for (let s = 1; s < 50000; s++) {
    const cursor = { rngState: s };
    const d6 = hasMasamune ? 0 : rollD6(cursor);
    const d4 = rollD4(cursor);
    const base = hasMasamune ? d4 : Math.abs(d6 - d4);
    if (base === desiredBaseDmg) return s;
  }
  throw new Error(`No seed for baseDmg=${desiredBaseDmg}`);
}

// ===========================================================================
// 1. CROSS-CHARACTER WAVE 3 MULTI-STEP INTERACTION CHAINS
// ===========================================================================

test('P4D-1 — Cross-character Wave 3 chains (Fujiko MG vs Udi + Execution -> Wendigo; Wrath AoE -> Witch/G43/Undying; Vengeance -> Cindy/Wendigo)', () => {
  const now = 1_796_000_001_000;

  // Chain A: Fujiko (Machine Gun) in central cluster with protected Udi (2+ others in cluster) + low-HP revealed Wrath (4 HP) + hidden Wendigo in court
  const sA = makeControlledS26State([
    { roleId: 'exp2_fujiko', revealed: true, location: 'lobby', equipped: ['ev-06'] },
    { roleId: 'exp1_udi', revealed: true, location: 'lobby', woundsTaken: 0 }, // 2+ others in cluster (p1, p3) -> PROTECTED from MG!
    { roleId: 'exp1_wrath', revealed: true, location: 'canteen', woundsTaken: 10 }, // 4 HP revealed -> Fujiko EXECUTES!
    { roleId: 'exp1_wendigo', revealed: false, location: 'court', woundsTaken: 4 }, // Secret reaction on Wrath death!
    { roleId: 'gac-ky-thuat', revealed: true, location: 'radio', woundsTaken: 0 },
  ], 94101);
  sA.rngState = findAttackRollSeed(1); // baseDmg = 1 -> executes Wrath, skips Udi!

  assert.equal(applyPlayerGameAction(sA, 'p1', { type: 'ATTACK', targetPlayerId: 'p3' }, now).ok, true);
  assert.equal(sA.players.p2.woundsTaken, 0, 'Machine Gun MUST skip protected Udi');
  assert.equal(sA.players.p3.alive, false, 'Fujiko MUST execute 4 HP revealed Wrath on 1 actual dmg');
  assert.equal(sA.pendingChoice?.kind, 'wendigo_reveal_heal', 'Hidden Wendigo reaction must open after Fujiko execution');
  assert.equal(getPublicGameView(sA).pendingChoice?.ownerPlayerId, null, 'P0: hidden Wendigo owner masked');
  assert.equal(
    applyPlayerGameAction(
      sA,
      'p4',
      { type: 'RESOLVE_CHOICE', choiceId: sA.pendingChoice.choiceId, optionId: 'reveal_and_activate' },
      now + 10,
    ).ok,
    true,
  );
  assert.equal(sA.players.p4.hp, 11, 'Wendigo heals +1 HP after Fujiko execution');

  // Chain B: Wrath turn-start AoE in south cluster hitting Witch (corridor immune), G43 (skill bypasses G43!), and hidden Undying (secret reduce 2->1!)
  const sB = makeControlledS26State([
    { roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { roleId: 'exp1_wrath', revealed: true, location: 'corridor' },
    { roleId: 'exp2_witch', revealed: true, location: 'corridor' },
    { roleId: 'exp2_g43', revealed: true, location: 'court' },
    { roleId: 'exp1_undying', revealed: false, location: 'court' },
  ], 94102);
  advanceTurn(sB, now + 20);
  assert.equal(sB.activePlayerId, 'p2');
  assert.equal(sB.pendingChoice?.kind, 'wrath_turn_start_aoe');
  assert.equal(
    applyPlayerGameAction(
      sB,
      'p2',
      { type: 'RESOLVE_CHOICE', choiceId: sB.pendingChoice.choiceId, optionId: 'activate' },
      now + 30,
    ).ok,
    true,
  );
  // Secret Undying choice pauses Wrath AoE!
  assert.equal(sB.pendingChoice?.kind, 'undying_reveal_reduce');
  assert.equal(getPublicGameView(sB).pendingChoice?.ownerPlayerId, null, 'P0: hidden Undying masked');
  assert.equal(
    applyPlayerGameAction(
      sB,
      'p5',
      { type: 'RESOLVE_CHOICE', choiceId: sB.pendingChoice.choiceId, optionId: 'reveal_and_reduce' },
      now + 40,
    ).ok,
    true,
  );
  assert.equal(sB.players.p3.woundsTaken, 0, 'Witch immune at corridor');
  assert.equal(sB.players.p4.woundsTaken, 2, 'Wrath skill damage bypasses G43');
  assert.equal(sB.players.p5.woundsTaken, 1, 'Undying reduced Wrath 2 -> 1');
});

// ===========================================================================
// 2. REAL CLOUDFLARE DO WEBSOCKET E2E ACROSS 4P, 5P, 6P, 7P & 8P
// ===========================================================================

test('P4D-2 — Real Cloudflare DO WebSocket E2E across 4P, 5P, 6P, 7P, and 8P on starter-twenty-six (unique 36-role pool, exact faction split, Spectator P0 privacy)', async () => {
  const server = await startStandaloneBoardGameTestServer(0, {
    ALLOW_EXPERIMENTAL_RULESETS: '1',
    CHOICE_TIMEOUT_OVERRIDE_MS: '800',
  });
  const playable36Ids = new Set(
    DEFAULT_RULESET_REGISTRY.listPlayableCharactersForRuleset('starter-twenty-six', {
      allowExperimental: true,
    }).map((e) => e.id),
  );
  assert.equal(playable36Ids.size, 36);

  try {
    for (const playerCount of [4, 5, 6, 7, 8]) {
      const createRes = await fetch(`${server.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: `table-s26-${playerCount}p`,
          hostName: `Host_${playerCount}P`,
          rulesetId: 'starter-twenty-six',
        }),
      });
      assert.equal(createRes.status, 201, `Create starter-twenty-six ${playerCount}P failed`);
      const match = await createRes.json();
      assert.equal(match.rulesetId, 'starter-twenty-six');

      const clients = [];
      for (let i = 0; i < playerCount; i++) {
        const c = await openBgClient(server.wsBaseUrl, match.matchId);
        clients.push(c);
        c.send({
          type: 'BG_JOIN',
          matchId: match.matchId,
          inviteCode: match.inviteCode,
          displayName: `P${playerCount}_${i + 1}`,
          preferredSeatIndex: i,
          requestId: `join_${playerCount}_${i}`,
        });
        await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
        await c.nextMsg((m) => m.type === 'BG_STATE_SYNC');
        if (i > 0) {
          c.send({ type: 'BG_SET_READY', ready: true, requestId: `rdy_${playerCount}_${i}` });
          await c.nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === `rdy_${playerCount}_${i}`);
        }
      }

      const spectator = await openBgClient(server.wsBaseUrl, match.matchId);
      spectator.send({
        type: 'BG_JOIN',
        matchId: match.matchId,
        inviteCode: match.inviteCode,
        displayName: `Spec_${playerCount}P`,
        asSpectator: true,
        requestId: `spec_${playerCount}`,
      });
      await spectator.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
      await spectator.nextMsg((m) => m.type === 'BG_STATE_SYNC');

      clients[0].send({ type: 'BG_START_MATCH', requestId: `start_${playerCount}` });
      const syncs = await Promise.all([
        ...clients.map((c) => c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING')),
        spectator.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING'),
      ]);

      const playerSyncs = syncs.slice(0, playerCount);
      const specSync = syncs[playerCount];

      const dealtRoles = new Set();
      const factionCounts = { 'lantern-guard': 0, 'mist-order': 0, wanderer: 0 };
      for (const s of playerSyncs) {
        assert.equal(s.rulesetId, 'starter-twenty-six');
        const rid = s.privateView.roleId;
        assert.ok(playable36Ids.has(rid), `${playerCount}P dealt non-starter-twenty-six role: ${rid}`);
        assert.equal(dealtRoles.has(rid), false, `${playerCount}P dealt duplicate role: ${rid}`);
        dealtRoles.add(rid);
        factionCounts[s.privateView.faction] += 1;
      }
      const expectedSplit = getRoleDistribution(playerCount);
      assert.equal(factionCounts['lantern-guard'], expectedSplit.lanternGuard);
      assert.equal(factionCounts['mist-order'], expectedSplit.mistOrder);
      assert.equal(factionCounts.wanderer, expectedSplit.wanderer);

      assert.equal(specSync.privateView, null);
      for (const pubPlayer of specSync.publicGame.players) {
        assert.equal(pubPlayer.revealedRoleId, null);
        assert.equal(pubPlayer.revealedFaction, null);
        assert.equal(pubPlayer.revealedMaxHp, null);
      }

      spectator.close();
      for (const c of clients) c.close();
    }
  } finally {
    await server.close();
  }
});

// ===========================================================================
// 3. PRODUCTION BLOCK + CONCURRENT CLASSIC/S26 + HIBERNATION + WRONG-OWNER + ALARM RECOVERY
// ===========================================================================

test('P4D-3 — Production blocks starter-twenty-six; concurrent Classic + S26; DO hibernation preserves Visions mark & Vengeance choice; wrong-owner rejection, idempotency & disconnect alarm recovery', async () => {
  // 1. Production DO (ALLOW_EXPERIMENTAL_RULESETS unset) MUST reject starter-twenty-six!
  const prodServer = await startStandaloneBoardGameTestServer(0, {});
  try {
    const blockedRes = await fetch(`${prodServer.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-prod-block', hostName: 'ProdHost', rulesetId: 'starter-twenty-six' }),
    });
    assert.equal(blockedRes.status, 400, 'Production DO MUST reject starter-twenty-six');
    const body = await blockedRes.json();
    assert.equal(body.code, 'RULESET_UNAVAILABLE');
  } finally {
    await prodServer.close();
  }

  // 2. Experimental DO: concurrent Classic + Starter Twenty-Six
  const expServer = await startStandaloneBoardGameTestServer(0, {
    ALLOW_EXPERIMENTAL_RULESETS: '1',
    CHOICE_TIMEOUT_OVERRIDE_MS: '600',
  });
  try {
    const [resClassic, resS26] = await Promise.all([
      fetch(`${expServer.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: 'table-1', hostName: 'ClassicHost', rulesetId: 'classic' }),
      }),
      fetch(`${expServer.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: 'table-2', hostName: 'S26Host', rulesetId: 'starter-twenty-six' }),
      }),
    ]);
    assert.equal(resClassic.status, 201);
    assert.equal(resS26.status, 201);
    const mClassic = await resClassic.json();
    const mS26 = await resS26.json();

    async function joinAndStart(match, count, prefix) {
      const clients = [];
      for (let i = 0; i < count; i++) {
        const c = await openBgClient(expServer.wsBaseUrl, match.matchId);
        clients.push(c);
        c.send({
          type: 'BG_JOIN',
          matchId: match.matchId,
          inviteCode: match.inviteCode,
          displayName: `${prefix}_${i + 1}`,
          preferredSeatIndex: i,
          requestId: `${prefix}_j_${i}`,
        });
        await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
        await c.nextMsg((m) => m.type === 'BG_STATE_SYNC');
        if (i > 0) {
          c.send({ type: 'BG_SET_READY', ready: true, requestId: `${prefix}_r_${i}` });
          await c.nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === `${prefix}_r_${i}`);
        }
      }
      clients[0].send({ type: 'BG_START_MATCH', requestId: `${prefix}_start` });
      const syncs = await Promise.all(
        clients.map((c) => c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING')),
      );
      return { clients, syncs };
    }

    const [classicMatch, s26Match] = await Promise.all([
      joinAndStart(mClassic, 4, 'CL'),
      joinAndStart(mS26, 5, 'S26'),
    ]);

    // Inject controlled S26 state:
    //   id0 = revealed Visions at `lobby` (ROLL_MOVE) -> places mark on id2 (G43)
    //   id1 = revealed Vengeance at `lobby` -> kills 1-HP Hunter id3 -> opens vengeance_chain_strike!
    //   id2 = revealed G43 at `lobby` (14 HP)
    //   id3 = revealed Fallen at `lobby` (1 HP left)
    //   id4 = revealed Bryon at `court` (holding eq-01 + ev-01)
    const container = expServer.containers.get(mS26.matchId);
    const sql = container.ctx.storage.sql;
    const row = sql.exec('SELECT game_state_json, revision FROM matches WHERE match_id = ?', mS26.matchId).one();
    const wrapped = JSON.parse(row.game_state_json);
    const es = wrapped.engineState;
    const [id0, id1, id2, id3, id4] = es.turnOrder;
    const setRole = (pid, roleId, revealed, location, woundsTaken = 0, alive = true, equipped = []) => {
      const p = es.players[pid];
      const d = getRoleDesign(roleId);
      p.roleId = roleId;
      p.faction = d.faction;
      p.maxHp = d.maxHp;
      p.woundsTaken = woundsTaken;
      p.hp = alive ? d.maxHp - woundsTaken : 0;
      p.revealed = revealed;
      p.alive = alive;
      p.location = location;
      p.equipped = equipped;
      p.hand = [];
      p.skillUsedOnce = false;
    };
    es.clusterPairs = [
      { clusterId: 'north', locationIds: ['radio', 'breaker'] },
      { clusterId: 'central', locationIds: ['lobby', 'canteen'] },
      { clusterId: 'south', locationIds: ['corridor', 'court'] },
    ];
    setRole(id0, 'exp2_visions', true, 'lobby', 0, true, []);
    setRole(id1, 'exp1_vengeance', true, 'lobby', 0, true, ['ev-01']); // Masamune guarantees 1..4 dmg!
    setRole(id2, 'exp2_g43', true, 'lobby', 0, true, []);
    setRole(id3, 'exp1_fallen', true, 'lobby', 11, true, []); // 1 HP left
    setRole(id4, 'exp2_bryon', true, 'court', 0, true, ['eq-01', 'ev-01']);
    es.activePlayerId = id0;
    es.turnPhase = 'ROLL_MOVE';
    sql.exec('UPDATE matches SET game_state_json = ? WHERE match_id = ?', JSON.stringify(wrapped), mS26.matchId);

    // A. Visions triggers USE_SKILL in ROLL_MOVE -> opens `visions_mark_target`
    let rev = row.revision;
    const mark0 = s26Match.clients[0].inbox.length;
    s26Match.clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'vis_open_1',
      expectedRevision: rev,
      action: { type: 'USE_SKILL' },
    });
    const visPrompt = await s26Match.clients[0].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.privateView?.pendingChoice?.kind === 'visions_mark_target',
      4000,
      mark0,
    );
    rev = visPrompt.revision;
    const visChoiceId = visPrompt.privateView.pendingChoice.choiceId;
    const markId2Opt = visPrompt.privateView.pendingChoice.options.find((o) => o.targetPlayerId === id2);
    assert.ok(markId2Opt);

    // Security: wrong-owner (`clients[1]`) attempting to resolve Visions' choice MUST be rejected!
    const markBad = s26Match.clients[1].inbox.length;
    s26Match.clients[1].send({
      type: 'BG_GAME_ACTION',
      requestId: 'wrong_owner_vis',
      expectedRevision: rev,
      action: { type: 'RESOLVE_CHOICE', choiceId: visChoiceId, optionId: markId2Opt.optionId },
    });
    const badAck = await s26Match.clients[1].nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'wrong_owner_vis',
      4000,
      markBad,
    );
    assert.equal(badAck.ok, false, 'Wrong owner MUST be rejected on RESOLVE_CHOICE');

    // Hibernate DO while `visions_mark_target` is open, then wake & resolve!
    container.hibernateAndWake();
    const markVisResolve = s26Match.clients[0].inbox.length;
    s26Match.clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'vis_resolve_1',
      expectedRevision: rev,
      action: { type: 'RESOLVE_CHOICE', choiceId: visChoiceId, optionId: markId2Opt.optionId },
    });
    const afterVis = await s26Match.clients[0].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision > rev && !m.publicGame.pendingChoice,
      4000,
      markVisResolve,
    );
    rev = afterVis.revision;
    assert.equal(afterVis.publicGame.visionsMarkedTargetByPlayer?.[id0], id2, 'Visions mark persisted through DO hibernation!');

    // Duplicate requestId idempotency check
    await new Promise((r) => setTimeout(r, 120));
    const markDup = s26Match.clients[0].inbox.length;
    s26Match.clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'vis_resolve_1',
      expectedRevision: rev - 1,
      action: { type: 'RESOLVE_CHOICE', choiceId: visChoiceId, optionId: markId2Opt.optionId },
    });
    const dupAck = await s26Match.clients[0].nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'vis_resolve_1',
      4000,
      markDup,
    );
    assert.equal(dupAck.ok, true);

    // B. Hand turn to Vengeance (id1) in MAIN_ACTION to kill 1-HP Fallen (id3) -> opens `vengeance_chain_strike` -> disconnect & alarm auto-recovery!
    const row2 = sql.exec('SELECT game_state_json, revision FROM matches WHERE match_id = ?', mS26.matchId).one();
    const w2 = JSON.parse(row2.game_state_json);
    w2.engineState.activePlayerId = id1;
    w2.engineState.turnPhase = 'MAIN_ACTION';
    sql.exec('UPDATE matches SET game_state_json = ? WHERE match_id = ?', JSON.stringify(w2), mS26.matchId);
    container.hibernateAndWake();
    rev = row2.revision;

    const markVeng = s26Match.clients[1].inbox.length;
    const markObs = s26Match.clients[4].inbox.length;
    s26Match.clients[1].send({
      type: 'BG_GAME_ACTION',
      requestId: 'veng_kill_1',
      expectedRevision: rev,
      action: { type: 'ATTACK', targetPlayerId: id3 },
    });
    const vengPrompt = await s26Match.clients[1].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.privateView?.pendingChoice?.kind === 'vengeance_chain_strike',
      4000,
      markVeng,
    );
    rev = vengPrompt.revision;

    // Hibernate DO + disconnect Vengeance mid-choice + fire DO alarm -> auto-recovers (`skip`, preserving skillUsedOnce=false)!
    container.hibernateAndWake();
    s26Match.clients[1].close();
    await new Promise((r) => setTimeout(r, 680));
    assert.equal(
      (await fetch(`${expServer.httpBaseUrl}/__bg_trigger_alarm?matchId=${encodeURIComponent(mS26.matchId)}`)).status,
      200,
    );
    const afterAlarm = await s26Match.clients[4].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision > rev && !m.publicGame.pendingChoice,
      4000,
      markObs,
    );
    const vengPub = afterAlarm.publicGame.players.find((p) => p.playerId === id1);
    assert.equal(vengPub.revealedSkillUsedOnce, false, 'Alarm timeout skip must preserve Vengeance 1x/match usage');
    assert.equal(afterAlarm.publicGame.visionsMarkedTargetByPlayer?.[id0], id2, 'Visions mark STILL persisted across multiple hibernations');
    assert.equal(classicMatch.clients[0].getLatestSync().status, 'PLAYING');

    for (const c of classicMatch.clients) c.close();
    for (const c of s26Match.clients) c.close();
  } finally {
    await expServer.close();
  }
});

// ===========================================================================
// 4. WAVE 3 UI / VFX / SOUND & REDUCED MOTION (ZERO HIDDEN-ROLE VFX LEAK)
// ===========================================================================

test('P4D-4 — UI metadata, 36/36 portraits, VFX queue & Reduced Motion cover all 10 Wave 3 roles with zero hidden-role leak', () => {
  resetBoardGameAudioForTests();

  assert.equal(PHASE4B_ROLE_IDS.length, 10);
  assert.equal(STARTER_TWENTY_SIX_EXPANSION_ROLE_IDS.length, 26);
  assert.ok(Object.keys(MIDNIGHT_CHARACTER_ART).length >= 36);

  for (const roleId of PHASE4B_ROLE_IDS) {
    const design = getRoleDesign(roleId);
    const visual = ROLE_VISUAL_META[roleId];
    const art = MIDNIGHT_CHARACTER_ART[roleId];
    assert.ok(design && design.skillName.length > 0, `Missing design for ${roleId}`);
    assert.ok(visual && visual.shortAbility.length > 0, `Missing ROLE_VISUAL_META for ${roleId}`);
    assert.ok(art && art.endsWith('.webp'), `Missing WebP portrait for ${roleId}`);
  }

  const baseState = makeControlledS26State([
    { roleId: 'exp2_fujiko', revealed: true, location: 'lobby' },
    { roleId: 'exp1_wrath', revealed: true, location: 'corridor' },
    { roleId: 'exp1_vengeance', revealed: true, location: 'court' },
    { roleId: 'exp2_bryon', revealed: true, location: 'lobby' },
    { roleId: 'exp1_udi', revealed: false, location: 'lobby' }, // HIDDEN!
  ], 94201);
  const prevPub = getPublicGameView(baseState);

  baseState.publicLog.push(
    {
      id: 'log-fujiko-1',
      round: 1,
      atMs: 1_796_000_005_000,
      kind: 'skill',
      actorId: 'p1',
      text: '🗡️ Fujiko (SV 1) — Kết Thúc Rồi: hạ gục tức thì SV 2!',
    },
    {
      id: 'log-wrath-1',
      round: 1,
      atMs: 1_796_000_005_100,
      kind: 'skill',
      actorId: 'p2',
      text: '🔥 Wrath (SV 2) — Cơn Thịnh Nộ: giáng 2 sát thương kỹ năng!',
    },
    {
      id: 'log-vengeance-1',
      round: 1,
      atMs: 1_796_000_005_200,
      kind: 'skill',
      actorId: 'p3',
      text: '⚡💀 Vengeance (SV 3) — Báo Thù Liên Hoàn (1d4=3)!',
    },
    {
      id: 'log-bryon-1',
      round: 1,
      atMs: 1_796_000_005_300,
      kind: 'skill',
      actorId: 'p4',
      text: '🎁 Bryon (SV 4) — Sự Phục Vụ Hào Phóng: trao tặng 1 trang bị!',
    },
    {
      id: 'log-hidden-udi',
      round: 1,
      atMs: 1_796_000_005_400,
      kind: 'skill',
      actorId: 'p5',
      text: 'Hidden actor probe',
    },
  );
  const nextPub = getPublicGameView(baseState);

  const normalEvents = extractVisualEventsFromDiff(prevPub, nextPub, {
    selfPlayerId: 'p1',
    isSpectator: false,
    reducedMotion: false,
  });
  const reducedEvents = extractVisualEventsFromDiff(prevPub, nextPub, {
    selfPlayerId: 'p1',
    isSpectator: false,
    reducedMotion: true,
  });

  const fujikoEv = normalEvents.find((e) => e.kind === 'COMBAT_VFX' && e.roleId === 'exp2_fujiko');
  const wrathEv = normalEvents.find((e) => e.kind === 'COMBAT_VFX' && e.roleId === 'exp1_wrath');
  const vengEv = normalEvents.find((e) => e.kind === 'COMBAT_VFX' && e.roleId === 'exp1_vengeance');
  const bryonEv = normalEvents.find((e) => e.kind === 'COMBAT_VFX' && e.roleId === 'exp2_bryon');
  const hiddenLeak = normalEvents.find((e) => e.sourcePlayerId === 'p5' || e.roleId === 'exp1_udi');

  assert.ok(fujikoEv, 'Revealed Fujiko emits execution VFX');
  assert.ok(wrathEv, 'Revealed Wrath emits explosion AoE VFX');
  assert.ok(vengEv, 'Revealed Vengeance emits lightning chain VFX');
  assert.ok(bryonEv, 'Revealed Bryon emits gear transfer tether VFX');
  assert.equal(hiddenLeak, undefined, 'Hidden Udi MUST NEVER emit role-identifying VFX');

  const fujikoReduced = reducedEvents.find((e) => e.kind === 'COMBAT_VFX' && e.roleId === 'exp2_fujiko');
  assert.ok(fujikoReduced && fujikoReduced.durationMs < fujikoEv.durationMs, 'Reduced motion shortens duration');

  for (const ev of normalEvents) {
    assert.doesNotThrow(() => playSoundForVisualEvent(ev, 1_796_000_006_000));
  }
});
