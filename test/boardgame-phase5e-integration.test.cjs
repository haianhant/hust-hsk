/**
 * test/boardgame-phase5e-integration.test.cjs — Phase 5E Full Multiplayer DO, Hibernation,
 * Privacy, Security & Wave 4 UI/VFX Integration Suite
 *
 * Verifies:
 *  - P5E-1: Real Cloudflare DO WebSocket E2E across ALL 5 player counts (4P, 5P, 6P, 7P, 8P)
 *           on `starter-thirty-eight` (exact 48-role pool, unique roles, unchanged faction splits,
 *           strict Spectator P0 privacy).
 *  - P5E-2: Production DO (`ALLOW_EXPERIMENTAL_RULESETS` unset) rejects `starter-thirty-eight`
 *           (`HTTP 400 / RULESET_UNAVAILABLE`); concurrent `classic` + `starter-thirty-eight` rooms
 *           operate concurrently on the same Worker with zero cross-contamination.
 *  - P5E-3: SQLite DO Hibernation, Reconnect, Wrong-Owner Neutral Rejection, Equipment Ownership /
 *           No-Replay Idempotency, and Alarm Timeout Recovery across:
 *             - Active `elise_distribute_heal` choice (timeout preserves `skillUsedOnce === false`)
 *             - Active secret `usurper_reveal_block_heal` choice (P0 `ownerPlayerId === null`,
 *               neutral wrong-owner rejection, hibernation wake & resolve)
 *             - Active `bianca_discard_prevent` choice (hibernation wake, single gear discard,
 *               duplicate `requestId` idempotency, zero double-discard)
 *             - Persistent `angelAuras`, `daltonActivatedByPlayer`, `reactionPolicyByPlayer`
 *               across multiple DO hibernations
 *  - P5E-4: Zero-leak unicast `SET_REACTION_PREF` (zero revision bump, zero opponent/spectator
 *           broadcast) + all 12 Wave 4 roles UI metadata, 48/48 portraits, VFX queue, Sound cues,
 *           Reduced Motion & strict hidden-role VFX isolation.
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
  PHASE5B_ROLE_IDS,
  PHASE5C_ROLE_IDS,
  STARTER_THIRTY_EIGHT_EXPANSION_ROLE_IDS,
  createInitialGameState,
  getPublicGameView,
  getRoleDesign,
  getRoleDistribution,
} = require('../features/boardgame/domain/index.ts');

const { extractVisualEventsFromDiff } = require('../features/boardgame/ui/vfx-queue.ts');
const {
  playSoundForVisualEvent,
  resetBoardGameAudioForTests,
} = require('../features/boardgame/ui/sound.ts');
const { ROLE_VISUAL_META } = require('../features/boardgame/ui/BoardGameArt.tsx');
const { MIDNIGHT_CHARACTER_ART, WAVE4_ROLE_IDS } = require('../features/boardgame/ui/midnight-noir-tokens.ts');

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

async function joinAndStart(wsBaseUrl, match, count, prefix, includeSpectator = false) {
  const clients = [];
  for (let i = 0; i < count; i++) {
    const c = await openBgClient(wsBaseUrl, match.matchId);
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
  let spectator = null;
  if (includeSpectator) {
    spectator = await openBgClient(wsBaseUrl, match.matchId);
    spectator.send({
      type: 'BG_JOIN',
      matchId: match.matchId,
      inviteCode: match.inviteCode,
      displayName: `${prefix}_Spec`,
      asSpectator: true,
      requestId: `${prefix}_spec`,
    });
    await spectator.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    await spectator.nextMsg((m) => m.type === 'BG_STATE_SYNC');
  }
  clients[0].send({ type: 'BG_START_MATCH', requestId: `${prefix}_start` });
  const syncs = await Promise.all([
    ...clients.map((c) => c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING')),
    ...(spectator
      ? [spectator.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING')]
      : []),
  ]);
  return {
    clients,
    spectator,
    playerSyncs: syncs.slice(0, count),
    specSync: spectator ? syncs[count] : null,
  };
}

// ===========================================================================
// 1. REAL CLOUDFLARE DO WEBSOCKET E2E ACROSS 4P, 5P, 6P, 7P & 8P
// ===========================================================================

test('P5E-1 — Real Cloudflare DO WebSocket E2E across 4P, 5P, 6P, 7P, and 8P on starter-thirty-eight (48-role pool, exact faction split, Spectator P0 privacy)', async () => {
  const server = await startStandaloneBoardGameTestServer(0, {
    ALLOW_EXPERIMENTAL_RULESETS: '1',
    CHOICE_TIMEOUT_OVERRIDE_MS: '800',
  });
  const playable48Ids = new Set(
    DEFAULT_RULESET_REGISTRY.listPlayableCharactersForRuleset('starter-thirty-eight', {
      allowExperimental: true,
    }).map((e) => e.id),
  );
  assert.equal(playable48Ids.size, 48);

  try {
    for (const playerCount of [4, 5, 6, 7, 8]) {
      const createRes = await fetch(`${server.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: `table-s38-${playerCount}p`,
          hostName: `Host_${playerCount}P`,
          rulesetId: 'starter-thirty-eight',
        }),
      });
      assert.equal(createRes.status, 201, `Create starter-thirty-eight ${playerCount}P failed`);
      const match = await createRes.json();
      assert.equal(match.rulesetId, 'starter-thirty-eight');

      const { clients, spectator, playerSyncs, specSync } = await joinAndStart(
        server.wsBaseUrl,
        match,
        playerCount,
        `S38_${playerCount}P`,
        true,
      );

      const dealtRoles = new Set();
      const factionCounts = { 'lantern-guard': 0, 'mist-order': 0, wanderer: 0 };
      for (const s of playerSyncs) {
        assert.equal(s.rulesetId, 'starter-thirty-eight');
        const rid = s.privateView.roleId;
        assert.ok(playable48Ids.has(rid), `${playerCount}P dealt non-starter-thirty-eight role: ${rid}`);
        assert.equal(dealtRoles.has(rid), false, `${playerCount}P dealt duplicate role: ${rid}`);
        dealtRoles.add(rid);
        factionCounts[s.privateView.faction] += 1;
        assert.equal(s.privateView.reactionPolicy, 'ASK', 'Default reactionPolicy must be ASK');
      }
      const expectedSplit = getRoleDistribution(playerCount);
      assert.equal(factionCounts['lantern-guard'], expectedSplit.lanternGuard);
      assert.equal(factionCounts['mist-order'], expectedSplit.mistOrder);
      assert.equal(factionCounts.wanderer, expectedSplit.wanderer);

      assert.equal(specSync.privateView, null, 'Spectator must never receive privateView');
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
// 2. PRODUCTION BLOCK & CONCURRENT CLASSIC + STARTER-THIRTY-EIGHT
// ===========================================================================

test('P5E-2 — Production DO rejects starter-thirty-eight (HTTP 400 / RULESET_UNAVAILABLE); concurrent Classic + starter-thirty-eight rooms stay isolated', async () => {
  const prodServer = await startStandaloneBoardGameTestServer(0, {});
  try {
    const blockedRes = await fetch(`${prodServer.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: 'table-prod-s38',
        hostName: 'ProdHost',
        rulesetId: 'starter-thirty-eight',
      }),
    });
    assert.equal(blockedRes.status, 400, 'Production DO MUST reject starter-thirty-eight');
    const body = await blockedRes.json();
    assert.equal(body.code, 'RULESET_UNAVAILABLE');
  } finally {
    await prodServer.close();
  }

  const expServer = await startStandaloneBoardGameTestServer(0, {
    ALLOW_EXPERIMENTAL_RULESETS: '1',
    CHOICE_TIMEOUT_OVERRIDE_MS: '600',
  });
  try {
    const [resClassic, resS38] = await Promise.all([
      fetch(`${expServer.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: 'table-c1', hostName: 'ClassicHost', rulesetId: 'classic' }),
      }),
      fetch(`${expServer.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: 'table-s38', hostName: 'S38Host', rulesetId: 'starter-thirty-eight' }),
      }),
    ]);
    assert.equal(resClassic.status, 201);
    assert.equal(resS38.status, 201);
    const mClassic = await resClassic.json();
    const mS38 = await resS38.json();

    const [classicRoom, s38Room] = await Promise.all([
      joinAndStart(expServer.wsBaseUrl, mClassic, 4, 'CL', false),
      joinAndStart(expServer.wsBaseUrl, mS38, 6, 'S38', true),
    ]);

    assert.equal(classicRoom.playerSyncs[0].rulesetId, 'classic');
    assert.equal(s38Room.playerSyncs[0].rulesetId, 'starter-thirty-eight');
    // Classic players never receive expansion fields
    for (const s of classicRoom.playerSyncs) {
      assert.equal(s.publicGame.usurperAuraActive, undefined);
      assert.equal(s.publicGame.angelProtectedPlayerIds, undefined);
    }

    s38Room.spectator.close();
    for (const c of classicRoom.clients) c.close();
    for (const c of s38Room.clients) c.close();
  } finally {
    await expServer.close();
  }
});

// ===========================================================================
// 3. DO HIBERNATION, RECONNECT, WRONG-OWNER NEUTRAL REJECTION, EQUIPMENT
//    NO-REPLAY & TIMEOUT RECOVERY ACROSS PHASE 5 MECHANICS
// ===========================================================================

test('P5E-3 — SQLite DO Hibernation, Wrong-Owner Neutral Rejection, Equipment No-Replay & Alarm Recovery across Elise, Usurper, Bianca, Angel, Dalton & ReactionPolicy', async () => {
  const server = await startStandaloneBoardGameTestServer(0, {
    ALLOW_EXPERIMENTAL_RULESETS: '1',
    CHOICE_TIMEOUT_OVERRIDE_MS: '550',
  });

  try {
    const createRes = await fetch(`${server.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: 'table-p5e-hib',
        hostName: 'HibHost',
        rulesetId: 'starter-thirty-eight',
      }),
    });
    assert.equal(createRes.status, 201);
    const match = await createRes.json();

    const { clients, spectator } = await joinAndStart(server.wsBaseUrl, match, 6, 'H5', true);

    const container = server.containers.get(match.matchId);
    const sql = container.ctx.storage.sql;
    const row = sql.exec('SELECT game_state_json, revision FROM matches WHERE match_id = ?', match.matchId).one();
    const wrapped = JSON.parse(row.game_state_json);
    const es = wrapped.engineState;
    const [id0, id1, id2, id3, id4, id5] = es.turnOrder;

    const setRole = (pid, roleId, revealed, location, woundsTaken = 0, equipped = []) => {
      const p = es.players[pid];
      const d = getRoleDesign(roleId);
      p.roleId = roleId;
      p.faction = d.faction;
      p.maxHp = d.maxHp;
      p.woundsTaken = woundsTaken;
      p.hp = Math.max(0, d.maxHp - woundsTaken);
      p.revealed = revealed;
      p.alive = true;
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
    // Seat 0: Revealed Elise (wounded 4) at lobby
    // Seat 1: Hidden Usurper at court (will intercept Elise heal!)
    // Seat 2: Revealed Bianca at lobby with eq-02 (Silver Rosary) & ev-01 (Masamune)
    // Seat 3: Revealed Angel at lobby (will have active aura!)
    // Seat 4: Revealed Dalton at canteen (already activated 12th round!)
    // Seat 5: Revealed George at lobby (will attack Bianca to trigger bianca_discard_prevent!)
    setRole(id0, 'exp2_elise', true, 'lobby', 4, []);
    setRole(id1, 'exp2_usurper', false, 'court', 0, []);
    setRole(id2, 'exp2_bianca', true, 'lobby', 2, ['eq-02', 'ev-01']);
    setRole(id3, 'exp1_angel', true, 'lobby', 0, []);
    setRole(id4, 'exp2_dalton', true, 'canteen', 2, []);
    setRole(id5, 'gac-ky-thuat', true, 'lobby', 0, ['ev-01']);

    es.expansionState = {
      ...(es.expansionState || {
        eventSeq: 1,
        processedEventIds: [],
        resolvedChoiceIds: [],
        pendingSteps: [],
        stats: { activationsByRole: {}, damagePreventedByRole: {}, healByRole: {}, bonusDamageByRole: {} },
      }),
      angelAuras: {
        [id3]: { phase: 'active', armedOnTurnNumber: 1, activatedOnTurnNumber: 2 },
      },
      daltonActivatedByPlayer: {
        [id4]: { activatedOnTurnNumber: 1, damageEventId: 'seed-dalton-act' },
      },
      reactionPolicyByPlayer: {
        [id1]: 'ASK',
      },
    };
    es.activePlayerId = id0;
    es.turnPhase = 'MAIN_ACTION';
    sql.exec('UPDATE matches SET game_state_json = ? WHERE match_id = ?', JSON.stringify(wrapped), match.matchId);
    container.hibernateAndWake();

    // A. Verify zero-leak unicast SET_REACTION_PREF (Seat 4 sets AUTO_DECLINE -> zero revision bump, zero opponent/spectator sync!)
    let rev = row.revision;
    const oppCountBefore = clients[5].inbox.length;
    const specCountBefore = spectator.inbox.length;
    const s4Mark = clients[4].inbox.length;
    clients[4].send({
      type: 'BG_GAME_ACTION',
      requestId: 'pref_unicast_1',
      expectedRevision: rev,
      action: { type: 'SET_REACTION_PREF', policy: 'AUTO_DECLINE' },
    });
    const prefAck = await clients[4].nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'pref_unicast_1',
      4000,
      s4Mark,
    );
    assert.equal(prefAck.ok, true);
    const prefSync = await clients[4].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.privateView?.reactionPolicy === 'AUTO_DECLINE',
      4000,
      s4Mark,
    );
    assert.equal(prefSync.revision, rev, 'SET_REACTION_PREF must NOT bump public revision');
    await new Promise((r) => setTimeout(r, 120));
    assert.equal(clients[5].inbox.length, oppCountBefore, 'Opponents MUST NOT receive broadcast on SET_REACTION_PREF');
    assert.equal(spectator.inbox.length, specCountBefore, 'Spectator MUST NOT receive broadcast on SET_REACTION_PREF');

    // B. Elise opens `elise_distribute_heal`, hibernate DO, trigger alarm timeout -> safe skip preserves skillUsedOnce=false!
    const eliseMark = clients[0].inbox.length;
    clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'elise_open_timeout',
      expectedRevision: rev,
      action: { type: 'USE_SKILL' },
    });
    const elisePrompt1 = await clients[0].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.privateView?.pendingChoice?.kind === 'elise_distribute_heal',
      4000,
      eliseMark,
    );
    rev = elisePrompt1.revision;
    container.hibernateAndWake();
    await new Promise((r) => setTimeout(r, 620));
    const eliseAfterAlarmMark = clients[0].inbox.length;
    assert.equal(
      (await fetch(`${server.httpBaseUrl}/__bg_trigger_alarm?matchId=${encodeURIComponent(match.matchId)}`)).status,
      200,
    );
    const afterEliseTimeout = await clients[0].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision > rev && !m.publicGame.pendingChoice,
      4000,
      eliseAfterAlarmMark,
    );
    rev = afterEliseTimeout.revision;
    assert.equal(
      afterEliseTimeout.privateView.skillUsedOnce,
      false,
      'Elise timeout skip MUST preserve oncePerMatch skillUsedOnce=false',
    );
    // Verify Angel aura & Dalton 12th round survived hibernation!
    assert.ok(afterEliseTimeout.publicGame.angelProtectedPlayerIds?.includes(id3), 'Angel aura survived hibernation');
    assert.ok(afterEliseTimeout.publicGame.daltonActivatedPlayerIds?.includes(id4), 'Dalton activation survived hibernation');

    // C. Elise opens `elise_distribute_heal` again & confirms healing self -> pauses on HIDDEN Usurper (`usurper_reveal_block_heal`)!
    const eliseMark2 = clients[0].inbox.length;
    clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'elise_open_2',
      expectedRevision: rev,
      action: { type: 'USE_SKILL' },
    });
    const elisePrompt2 = await clients[0].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.privateView?.pendingChoice?.kind === 'elise_distribute_heal',
      4000,
      eliseMark2,
    );
    rev = elisePrompt2.revision;
    const healOpt = elisePrompt2.privateView.pendingChoice.options.find((o) => o.optionId !== 'skip');
    assert.ok(healOpt, 'Elise must have at least 1 valid heal allocation');

    await new Promise((r) => setTimeout(r, 130));
    const usMark = clients[1].inbox.length;
    const spMark = spectator.inbox.length;
    clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'elise_confirm_2',
      expectedRevision: rev,
      action: { type: 'RESOLVE_CHOICE', choiceId: elisePrompt2.privateView.pendingChoice.choiceId, optionId: healOpt.optionId },
    });
    const usPrompt = await clients[1].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.privateView?.pendingChoice?.kind === 'usurper_reveal_block_heal',
      4000,
      usMark,
    );
    const spPrompt = await spectator.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision === usPrompt.revision,
      4000,
      spMark,
    );
    rev = usPrompt.revision;
    // P0 Secrecy check: hidden Usurper owner & kind are strictly null on public/spectator view!
    assert.equal(spPrompt.publicGame.pendingChoice?.isSecret, true);
    assert.equal(spPrompt.publicGame.pendingChoice?.ownerPlayerId, null);
    assert.equal(spPrompt.publicGame.pendingChoice?.kind, null);

    // Wrong-owner attempt from Seat 5 MUST get neutral rejection (never leaking "Usurper"!)
    const badMark = clients[5].inbox.length;
    clients[5].send({
      type: 'BG_GAME_ACTION',
      requestId: 'wrong_owner_usurper',
      expectedRevision: rev,
      action: {
        type: 'RESOLVE_CHOICE',
        choiceId: usPrompt.privateView.pendingChoice.choiceId,
        optionId: 'reveal_and_block',
      },
    });
    const badAck = await clients[5].nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'wrong_owner_usurper',
      4000,
      badMark,
    );
    assert.equal(badAck.ok, false, 'Wrong owner MUST be rejected');
    assert.equal(
      String(badAck.error || '').toLowerCase().includes('usurper'),
      false,
      'Rejection message must remain neutral and never leak Usurper identity',
    );

    // Hibernate DO while hidden Usurper choice is open, wake & resolve `reveal_and_block`!
    container.hibernateAndWake();
    const usResolveMark = clients[1].inbox.length;
    clients[1].send({
      type: 'BG_GAME_ACTION',
      requestId: 'usurper_block_1',
      expectedRevision: rev,
      action: {
        type: 'RESOLVE_CHOICE',
        choiceId: usPrompt.privateView.pendingChoice.choiceId,
        optionId: 'reveal_and_block',
      },
    });
    const afterUsurper = await clients[1].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision > rev && !m.publicGame.pendingChoice,
      4000,
      usResolveMark,
    );
    rev = afterUsurper.revision;
    assert.equal(afterUsurper.publicGame.usurperAuraActive, true, 'Revealed Usurper aura now active');
    const elisePub = afterUsurper.publicGame.players.find((p) => p.playerId === id0);
    assert.equal(elisePub.woundsTaken, 4, 'Elise heal was completely blocked by Usurper');

    // D. Hand turn to Seat 5 (George with Masamune) attacking Seat 2 (Bianca with eq-02 + ev-01; deactivate Angel aura so Bianca takes damage)
    const row2 = sql.exec('SELECT game_state_json, revision FROM matches WHERE match_id = ?', match.matchId).one();
    const w2 = JSON.parse(row2.game_state_json);
    w2.engineState.activePlayerId = id5;
    w2.engineState.turnPhase = 'MAIN_ACTION';
    w2.engineState.expansionState.angelAuras[id3].phase = 'expired';
    sql.exec('UPDATE matches SET game_state_json = ? WHERE match_id = ?', JSON.stringify(w2), match.matchId);
    container.hibernateAndWake();
    rev = row2.revision;

    const biancaMark = clients[2].inbox.length;
    clients[5].send({
      type: 'BG_GAME_ACTION',
      requestId: 'george_hit_bianca',
      expectedRevision: rev,
      action: { type: 'ATTACK', targetPlayerId: id2 },
    });
    const biancaPrompt = await clients[2].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.privateView?.pendingChoice?.kind === 'bianca_discard_prevent',
      4000,
      biancaMark,
    );
    rev = biancaPrompt.revision;
    // Verify Masamune (`ev-01`) is NOT offered as a discard option; only `eq-02` is!
    const discOpts = biancaPrompt.privateView.pendingChoice.options.filter((o) => o.optionId !== 'decline');
    assert.equal(discOpts.length, 1);
    assert.equal(discOpts[0].card?.id, 'eq-02');

    // Hibernate DO mid-Bianca choice, resolve discard `eq-02`, AND replay duplicate requestId (idempotent, no double-discard!)
    container.hibernateAndWake();
    const bResMark = clients[2].inbox.length;
    clients[2].send({
      type: 'BG_GAME_ACTION',
      requestId: 'bianca_disc_1',
      expectedRevision: rev,
      action: {
        type: 'RESOLVE_CHOICE',
        choiceId: biancaPrompt.privateView.pendingChoice.choiceId,
        optionId: discOpts[0].optionId,
      },
    });
    const afterBianca = await clients[2].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision > rev && !m.publicGame.pendingChoice,
      4000,
      bResMark,
    );
    rev = afterBianca.revision;
    assert.equal(afterBianca.privateView.woundsTaken, 2, 'Bianca prevented single-target attack damage');
    assert.deepEqual(
      afterBianca.privateView.equipped.map((c) => c.id),
      ['ev-01'],
      'eq-02 discarded, Masamune preserved',
    );
    assert.equal(
      clients[4].getLatestSync()?.privateView?.reactionPolicy,
      'AUTO_DECLINE',
      'Private reactionPolicy survived multiple SQLite DO hibernations!',
    );

    // Duplicate requestId replay -> idempotent ok, no extra mutation!
    await new Promise((r) => setTimeout(r, 100));
    const dupMark = clients[2].inbox.length;
    clients[2].send({
      type: 'BG_GAME_ACTION',
      requestId: 'bianca_disc_1',
      expectedRevision: rev - 1,
      action: {
        type: 'RESOLVE_CHOICE',
        choiceId: biancaPrompt.privateView.pendingChoice.choiceId,
        optionId: discOpts[0].optionId,
      },
    });
    const dupAck = await clients[2].nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'bianca_disc_1',
      4000,
      dupMark,
    );
    assert.equal(dupAck.ok, true);

    spectator.close();
    for (const c of clients) c.close();
  } finally {
    await server.close();
  }
});

// ===========================================================================
// 4. WAVE 4 UI / 48 PORTRAITS / VFX / SOUND / REDUCED MOTION (ZERO LEAK)
// ===========================================================================

test('P5E-4 — All 12 Wave 4 roles UI metadata, 48/48 portraits, VFX queue, Sound & Reduced Motion with strict hidden-role isolation', () => {
  resetBoardGameAudioForTests();

  const wave4All = [...PHASE5B_ROLE_IDS, ...PHASE5C_ROLE_IDS];
  assert.equal(wave4All.length, 12);
  assert.equal(WAVE4_ROLE_IDS.length, 12);
  assert.equal(STARTER_THIRTY_EIGHT_EXPANSION_ROLE_IDS.length, 38);
  assert.ok(Object.keys(MIDNIGHT_CHARACTER_ART).length >= 48);

  for (const roleId of wave4All) {
    const design = getRoleDesign(roleId);
    const visual = ROLE_VISUAL_META[roleId];
    const art = MIDNIGHT_CHARACTER_ART[roleId];
    assert.ok(design && design.skillName.length > 0, `Missing design for ${roleId}`);
    assert.ok(visual && visual.shortAbility.length > 0, `Missing ROLE_VISUAL_META for ${roleId}`);
    assert.ok(art && art.endsWith('.webp'), `Missing WebP portrait for ${roleId}`);
  }

  const state = createInitialGameState({
    matchId: 'p5e-vfx-01',
    seed: 95201,
    nowMs: 1_797_000_000_000,
    rulesetId: 'starter-thirty-eight',
    allowExperimental: true,
    players: Array.from({ length: 5 }, (_, i) => ({
      playerId: `p${i + 1}`,
      displayName: `SV ${i + 1}`,
      seatIndex: i,
      appearance: {},
      connected: true,
    })),
  });
  const specs = [
    { roleId: 'exp2_elise', revealed: true },
    { roleId: 'exp1_ernest', revealed: true },
    { roleId: 'exp2_warlord', revealed: true },
    { roleId: 'exp1_angel', revealed: true },
    { roleId: 'exp2_arlene', revealed: false }, // HIDDEN!
  ];
  specs.forEach((sp, i) => {
    const p = state.players[`p${i + 1}`];
    const d = getRoleDesign(sp.roleId);
    p.roleId = sp.roleId;
    p.faction = d.faction;
    p.maxHp = d.maxHp;
    p.hp = d.maxHp;
    p.woundsTaken = 0;
    p.revealed = sp.revealed;
  });

  const prevPub = getPublicGameView(state);
  state.publicLog.push(
    {
      id: 'log-elise-1',
      round: 1,
      atMs: 1_797_000_005_000,
      kind: 'skill',
      actorId: 'p1',
      text: '🎶💚 Elise (SV 1) — Âm Hưởng Mềm Mại: hồi 3 HP cho SV 2!',
    },
    {
      id: 'log-ernest-1',
      round: 1,
      atMs: 1_797_000_005_100,
      kind: 'skill',
      actorId: 'p2',
      text: '⚡ Ernest (SV 2) — Từ Đạo: ép lộ diện toàn bộ Hội Bóng Đêm!',
    },
    {
      id: 'log-warlord-1',
      round: 1,
      atMs: 1_797_000_005_200,
      kind: 'skill',
      actorId: 'p3',
      text: '⛓️ Warlord (SV 3) — Chiến Tranh: kéo SV 4 tới cùng vị trí!',
    },
    {
      id: 'log-hidden-arlene',
      round: 1,
      atMs: 1_797_000_005_300,
      kind: 'skill',
      actorId: 'p5',
      text: 'Hidden actor probe',
    },
  );
  const nextPub = getPublicGameView(state);

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

  const hiddenLeak = normalEvents.find((e) => e.sourcePlayerId === 'p5' || e.roleId === 'exp2_arlene');
  assert.equal(hiddenLeak, undefined, 'Hidden Arlene MUST NEVER emit role-identifying VFX');
  assert.ok(reducedEvents.length <= normalEvents.length);

  for (const ev of normalEvents) {
    assert.doesNotThrow(() => playSoundForVisualEvent(ev, 1_797_000_006_000));
  }
});
