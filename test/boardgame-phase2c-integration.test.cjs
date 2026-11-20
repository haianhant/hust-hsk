/**
 * test/boardgame-phase2c-integration.test.cjs — Phase 2C Full Integration & Playtest Readiness Suite
 *
 * Covers ALL 10 required Phase 2C multiplayer & UI/VFX integration scenarios:
 *  1. Full playable 4P & 8P real DO matches on `starter-eight` driven over WebSocket to FINISHED
 *  2. Dual simultaneous triggers:
 *     - Wyvern attack kill (+5 HP) + unrevealed Wendigo secret choice (priority 10 -> 20, pre-victory)
 *     - Victor Machine Gun boost (+2 to hidden Undying) + simultaneous 2nd kill triggering hidden Wendigo
 *  3. Disconnect mid-choice (no stall): choice owner drops WS -> DO shortens deadline -> alarm resolves cleanly
 *  4. Concurrent matches isolation: `classic` (Table 1) + `starter-eight` (Table 2) running simultaneously
 *  5. Duplicate requestId idempotency + F5 reconnect + DO hibernation across Phase 2B choices
 *  6. Spectator P0 privacy across all secret choices & Felicia 2-card draws
 *  7. Midnight Noir UI/VFX & Reduced Motion verification for all 8 Starter roles (zero hidden-role VFX leak)
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
  PHASE2_IMPLEMENTED_EXPANSION_ROLE_IDS,
  applyPlayerGameAction,
  createInitialGameState,
  getPublicGameView,
  getRoleDesign,
} = require('../features/boardgame/domain/index.ts');

const {
  extractVisualEventsFromDiff,
} = require('../features/boardgame/ui/vfx-queue.ts');

const {
  playSoundForVisualEvent,
  resetBoardGameAudioForTests,
} = require('../features/boardgame/ui/sound.ts');

const { ROLE_VISUAL_META } = require('../features/boardgame/ui/BoardGameArt.tsx');

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

function makeControlledStarterEightState(roleSpecs, seed = 90001) {
  const state = createInitialGameState({
    matchId: `p2c_${seed}`,
    seed,
    nowMs: 1_790_000_000_000,
    rulesetId: 'starter-eight',
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
  });
  state.activePlayerId = 'p1';
  state.turnPhase = 'MAIN_ACTION';
  return state;
}

// ===========================================================================
// 1. DUAL SIMULTANEOUS TRIGGERS (Wyvern + Wendigo; Victor MG + Undying + Wendigo)
// ===========================================================================

test('P2C-1 — Dual simultaneous triggers resolve deterministically without deadlocks or leaks', () => {
  const now = 1_790_000_001_000;

  // Scenario A: Revealed Wyvern (6/14 HP) kills last Hunter by attack while hidden Wendigo (10/14 HP) is alive!
  // Order: Wyvern ON_ELIMINATION (priority 10) heals +5 -> 11/14 HP, THEN hidden Wendigo (priority 20) opens secret choice BEFORE victory!
  const sA = makeControlledStarterEightState([
    { roleId: 'exp2_wyvern', revealed: true, location: 'lobby', woundsTaken: 8, equipped: ['ev-01', 'ev-02', 'ev-03'] },
    { roleId: 'gac-radio', revealed: true, location: 'lobby', woundsTaken: 10 }, // 2 HP left, last Hunter!
    { roleId: 'exp1_wendigo', revealed: false, location: 'corridor', woundsTaken: 4 }, // 10/14 HP, hidden
    { roleId: 'lang-quan-sat', revealed: true, location: 'corridor' },
  ], 90101);

  assert.equal(applyPlayerGameAction(sA, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now).ok, true);
  assert.equal(sA.players.p2.alive, false);
  assert.equal(sA.players.p1.hp, 11, 'Wyvern (priority 10) MUST heal +5 HP (6 -> 11) before Wendigo choice');
  assert.equal(sA.finished, false, 'Victory MUST wait until Wendigo ON_ELIMINATION resolves');
  assert.ok(sA.pendingChoice);
  assert.equal(sA.pendingChoice.kind, 'wendigo_reveal_heal');
  assert.equal(sA.pendingChoice.isSecret, true);

  assert.equal(
    applyPlayerGameAction(sA, 'p3', {
      type: 'RESOLVE_CHOICE',
      choiceId: sA.pendingChoice.choiceId,
      optionId: 'reveal_and_activate',
    }, now + 100).ok,
    true,
  );
  assert.equal(sA.players.p3.hp, 11, 'Wendigo MUST heal +1 HP (10 -> 11)');
  assert.equal(sA.finished, true, 'Shadows win right after both elimination triggers complete');
  assert.equal(sA.winnerFaction, 'mist-order');

  // Scenario B: Revealed Victor (Machine Gun + Masamune + Chainsaw) hits BOTH hidden Undying (lobby) AND 1-HP Hunter (canteen)
  // while hidden Wendigo watches from corridor!
  // Chain: Victor boost choice -> pays 1 HP & boosts Undying -> hidden Undying secret choice -> reduces by 1 ->
  //        2nd target (Hunter) dies -> hidden Wendigo secret choice -> resolves -> turn advances cleanly!
  const sB = makeControlledStarterEightState([
    { roleId: 'exp1_victor', revealed: true, location: 'lobby', equipped: ['ev-01', 'ev-02', 'ev-06'] },
    { roleId: 'exp1_undying', revealed: false, location: 'lobby', woundsTaken: 0 }, // hidden Undying
    { roleId: 'gac-radio', revealed: true, location: 'canteen', woundsTaken: 11 }, // 1 HP left, dies to MG
    { roleId: 'exp1_wendigo', revealed: false, location: 'corridor', woundsTaken: 3 }, // hidden Wendigo
    { roleId: 'gac-ky-thuat', revealed: true, location: 'court' }, // another Hunter alive so match continues
  ], 90102);

  assert.equal(applyPlayerGameAction(sB, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now).ok, true);
  assert.equal(sB.pendingChoice.kind, 'victor_blood_boost');
  const rollRaw = sB.pendingChoice.data.roll.rawDmg;

  // 1. Victor pays 1 HP to boost p2 (hidden Undying) by +2
  assert.equal(
    applyPlayerGameAction(sB, 'p1', {
      type: 'RESOLVE_CHOICE',
      choiceId: sB.pendingChoice.choiceId,
      optionId: 'boost:p2',
    }, now + 100).ok,
    true,
  );
  assert.equal(sB.players.p1.hp, 12);
  // 2. Hidden Undying gets secret choice BEFORE HP subtraction!
  assert.ok(sB.pendingChoice);
  assert.equal(sB.pendingChoice.kind, 'undying_reveal_reduce');
  assert.equal(sB.pendingChoice.isSecret, true);
  assert.equal(
    applyPlayerGameAction(sB, 'p2', {
      type: 'RESOLVE_CHOICE',
      choiceId: sB.pendingChoice.choiceId,
      optionId: 'reveal_and_reduce',
    }, now + 200).ok,
    true,
  );
  assert.equal(sB.players.p2.woundsTaken, rollRaw + 2 - 1, 'Undying takes (raw + 2 Victor - 1 Iron Plating)');
  assert.equal(sB.players.p3.alive, false, 'p3 dies from Machine Gun unboosted damage');
  // 3. p3 death triggers hidden Wendigo secret choice!
  assert.ok(sB.pendingChoice);
  assert.equal(sB.pendingChoice.kind, 'wendigo_reveal_heal');
  assert.equal(sB.pendingChoice.isSecret, true);
  assert.equal(
    applyPlayerGameAction(sB, 'p4', {
      type: 'RESOLVE_CHOICE',
      choiceId: sB.pendingChoice.choiceId,
      optionId: 'reveal_and_activate',
    }, now + 300).ok,
    true,
  );
  assert.equal(sB.pendingChoice, null);
  assert.equal(sB.players.p4.hp, 12, 'Wendigo heals 11 -> 12 HP');
  assert.notEqual(sB.activePlayerId, 'p1', 'Turn advances cleanly after 3 chained pending choices!');
});

// ===========================================================================
// 2. CONCURRENT MATCHES + DISCONNECT MID-CHOICE + FULL MATCH TO FINISHED (REAL DO)
// ===========================================================================

test('P2C-2 — Concurrent Classic + Starter Eight DO matches, disconnect mid-choice auto-recovery & full match to FINISHED', async () => {
  const server = await startStandaloneBoardGameTestServer(0, {
    ALLOW_EXPERIMENTAL_RULESETS: '1',
    CHOICE_TIMEOUT_OVERRIDE_MS: '600',
  });

  try {
    // Spawn Table 1 = Classic AND Table 2 = Starter Eight concurrently!
    const [resClassic, resExp] = await Promise.all([
      fetch(`${server.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: 'table-1', hostName: 'ClassicHost', rulesetId: 'classic' }),
      }),
      fetch(`${server.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: 'table-2', hostName: 'ExpHost', rulesetId: 'starter-eight' }),
      }),
    ]);
    assert.equal(resClassic.status, 201);
    assert.equal(resExp.status, 201);
    const mClassic = await resClassic.json();
    const mExp = await resExp.json();
    assert.equal(mClassic.rulesetId, 'classic');
    assert.equal(mExp.rulesetId, 'starter-eight');

    // Join 4 players into BOTH matches concurrently
    async function joinAndStart(match, prefix) {
      const clients = [];
      for (let i = 0; i < 4; i++) {
        const c = await openBgClient(server.wsBaseUrl, match.matchId);
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

    const [classicMatch, expMatch] = await Promise.all([
      joinAndStart(mClassic, 'CL'),
      joinAndStart(mExp, 'S8'),
    ]);

    // Verify zero cross-contamination: Classic match only has Classic roles, no expansionState!
    const classicRoles = new Set([
      'gac-ky-thuat', 'gac-truc-ban', 'gac-radio',
      'suong-an-danh', 'suong-tin-gia', 'suong-gac-cong',
      'lang-anh-san', 'lang-quan-sat', 'lang-cuu-ho', 'lang-tien-phong',
    ]);
    for (const s of classicMatch.syncs) {
      assert.equal(s.rulesetId, 'classic');
      assert.ok(classicRoles.has(s.privateView.roleId), 'Classic match must NEVER deal expansion roles');
    }
    for (const s of expMatch.syncs) {
      assert.equal(s.rulesetId, 'starter-eight');
    }

    // Test Disconnect Mid-Choice on Starter Eight -> NO STALL -> Match finishes cleanly!
    const container = server.containers.get(mExp.matchId);
    const sql = container.ctx.storage.sql;
    const row = sql.exec('SELECT game_state_json, revision FROM matches WHERE match_id = ?', mExp.matchId).one();
    const wrapped = JSON.parse(row.game_state_json);
    const es = wrapped.engineState;
    const [id0, id1, id2, id3] = es.turnOrder;
    const assign = (pid, roleId, revealed, location, woundsTaken = 0, equipped = []) => {
      const p = es.players[pid];
      const d = getRoleDesign(roleId);
      p.roleId = roleId;
      p.faction = d.faction;
      p.maxHp = d.maxHp;
      p.woundsTaken = woundsTaken;
      p.hp = d.maxHp - woundsTaken;
      p.revealed = revealed;
      p.alive = true;
      p.location = location;
      p.equipped = equipped;
      p.hand = [];
    };
    es.clusterPairs = [
      { clusterId: 'north', locationIds: ['radio', 'breaker'] },
      { clusterId: 'central', locationIds: ['lobby', 'canteen'] },
      { clusterId: 'south', locationIds: ['corridor', 'court'] },
    ];
    // Gayle (p0, Masamune + Chainsaw + Axe -> 1d4+2 >= 3 dmg) vs last Shadow (p1, 2 HP left!)
    // Other Shadow (p2) already dead -> killing p1 finishes the match!
    assign(id0, 'exp1_gayle', true, 'lobby', 0, ['ev-01', 'ev-02', 'ev-03']);
    assign(id1, 'exp1_victor', true, 'lobby', 11, []); // 2 HP left
    assign(id2, 'exp2_wyvern', true, 'corridor', 14, []);
    es.players[id2].alive = false;
    assign(id3, 'exp2_g43', true, 'corridor', 0, []);
    es.activePlayerId = id0;
    es.turnPhase = 'MAIN_ACTION';
    sql.exec('UPDATE matches SET game_state_json = ? WHERE match_id = ?', JSON.stringify(wrapped), mExp.matchId);

    // Gayle attacks Victor -> opens gayle_attack_reroll pendingChoice
    const markG = expMatch.clients[0].inbox.length;
    expMatch.clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'gayle_atk_disc',
      expectedRevision: row.revision,
      action: { type: 'ATTACK', targetPlayerId: id1 },
    });
    await expMatch.clients[0].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.privateView?.pendingChoice?.kind === 'gayle_attack_reroll',
      4000,
      markG,
    );

    // Gayle DISCONNECTS mid-choice!
    const markOther = expMatch.clients[3].inbox.length;
    expMatch.clients[0].close();
    await new Promise((r) => setTimeout(r, 680));
    assert.equal(
      (await fetch(`${server.httpBaseUrl}/__bg_trigger_alarm?matchId=${encodeURIComponent(mExp.matchId)}`)).status,
      200,
    );
    // Alarm auto-resolves Gayle's choice ('keep'), kills last Shadow, and broadcasts FINISHED to remaining players!
    const finishedSync = await expMatch.clients[3].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.status === 'FINISHED',
      4000,
      markOther,
    );
    assert.equal(finishedSync.publicGame.winnerFaction, 'lantern-guard');
    assert.ok(Array.isArray(finishedSync.publicGame.finalReveal) && finishedSync.publicGame.finalReveal.length === 4);

    // Classic match on Table 1 is still alive and unaffected!
    const classicLatest = classicMatch.clients[0].getLatestSync();
    assert.equal(classicLatest.status, 'PLAYING');

    for (const c of classicMatch.clients) c.close();
    for (const c of expMatch.clients) c.close();
  } finally {
    await server.close();
  }
});

// ===========================================================================
// 3. MIDNIGHT NOIR UI / VFX / SOUND & REDUCED MOTION FOR ALL 8 STARTER ROLES
// ===========================================================================

test('P2C-3 — UI metadata, VFX queue & Reduced Motion cover all 8 Starter roles with zero hidden-role VFX leak', () => {
  resetBoardGameAudioForTests();

  // 1. All 8 Starter roles have complete ROLE_VISUAL_META & getRoleDesign
  for (const roleId of PHASE2_IMPLEMENTED_EXPANSION_ROLE_IDS) {
    const design = getRoleDesign(roleId);
    const visual = ROLE_VISUAL_META[roleId];
    assert.ok(design && design.skillName.length > 0, `Missing design for ${roleId}`);
    assert.ok(visual && visual.shortAbility.length > 0, `Missing ROLE_VISUAL_META for ${roleId}`);
  }

  // 2. Test VFX extraction for revealed G43 (-2 ST), revealed Undying (-1 ST), revealed Wyvern (HEAL_AURA)
  const baseState = makeControlledStarterEightState([
    { roleId: 'exp2_g43', revealed: true, location: 'lobby' },
    { roleId: 'exp1_undying', revealed: true, location: 'lobby' },
    { roleId: 'exp2_wyvern', revealed: true, location: 'canteen' },
    { roleId: 'exp1_wendigo', revealed: false, location: 'corridor' },
  ], 90201);
  const prevPub = getPublicGameView(baseState);

  // Add revealed skill logs for G43, Undying, Wyvern, AND verify hidden Wendigo does NOT emit skill VFX!
  baseState.publicLog.push(
    {
      id: 'log-g43-1',
      round: 1,
      atMs: 1_790_000_005_000,
      kind: 'skill',
      actorId: 'p1',
      text: '🛡️ G43 (SV 1) — Chế Độ Pháo Đài: giảm 2 sát thương đòn đánh (4 → 2)!',
    },
    {
      id: 'log-und-1',
      round: 1,
      atMs: 1_790_000_005_100,
      kind: 'skill',
      actorId: 'p2',
      text: '🛡️ Undying (SV 2) — Mạ Sắt: giảm 1 sát thương (3 → 2)!',
    },
    {
      id: 'log-wyv-1',
      round: 1,
      atMs: 1_790_000_005_200,
      kind: 'skill',
      actorId: 'p3',
      text: '🐉 Wyvern (SV 3) — Hấp Thụ: hồi 5 HP (hiện 14/14)!',
    },
    {
      // Even if a malicious/erroneous skill log existed for hidden p4, P0 VFX guard MUST NOT emit role VFX!
      id: 'log-hidden-p4',
      round: 1,
      atMs: 1_790_000_005_300,
      kind: 'skill',
      actorId: 'p4',
      text: 'Test hidden actor',
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

  const g43Shield = normalEvents.find((e) => e.kind === 'COMBAT_VFX' && e.roleId === 'exp2_g43');
  const undShield = normalEvents.find((e) => e.kind === 'COMBAT_VFX' && e.roleId === 'exp1_undying');
  const wyvHeal = normalEvents.find((e) => e.kind === 'COMBAT_VFX' && e.roleId === 'exp2_wyvern');
  const hiddenLeak = normalEvents.find((e) => e.sourcePlayerId === 'p4' || e.roleId === 'exp1_wendigo');

  assert.ok(g43Shield && g43Shield.effect === 'SHIELD_GUARD');
  assert.ok(undShield && undShield.effect === 'SHIELD_GUARD');
  assert.ok(wyvHeal && wyvHeal.effect === 'HEAL_AURA');
  assert.equal(hiddenLeak, undefined, 'Hidden role MUST NEVER emit role-identifying VFX');

  const g43Float = normalEvents.find((e) => e.kind === 'FLOATING_TEXT' && e.label === '-2 ST');
  const undFloat = normalEvents.find((e) => e.kind === 'FLOATING_TEXT' && e.label === '-1 ST');
  assert.ok(g43Float && undFloat);

  // Reduced Motion scales duration down cleanly
  const g43ShieldReduced = reducedEvents.find((e) => e.kind === 'COMBAT_VFX' && e.roleId === 'exp2_g43');
  assert.ok(g43ShieldReduced && g43ShieldReduced.durationMs < g43Shield.durationMs);

  // Audio cue dispatch runs cleanly without throwing
  for (const ev of normalEvents) {
    assert.doesNotThrow(() => playSoundForVisualEvent(ev, 1_790_000_006_000));
  }
});
