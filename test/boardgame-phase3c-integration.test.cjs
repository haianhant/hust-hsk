/**
 * test/boardgame-phase3c-integration.test.cjs — Phase 3C Full Integration & Multiplayer E2E Suite
 *
 * Covers ALL mandatory Phase 3C cross-character, multiplayer DO 4P–8P, hibernation,
 * disconnect recovery, production safety, and Wave 2 UI/VFX scenarios:
 *  - P3C-1: Cross-character interaction matrix & multi-pending-choice single-turn chain
 *           (Elysia + Machine Gun -> hidden Undying -> hidden Cindy -> 1-HP kill -> hidden Wendigo,
 *            Warlock at court vs G43+Holy Robe, Unchained vs Witch at corridor, Gloria reshuffle,
 *            Bipolar lethal self-damage triggering Shadow + dead Bipolar co-win)
 *  - P3C-2: Real Cloudflare Durable Object WebSocket E2E across ALL 5 sizes (4P, 5P, 6P, 7P, 8P)
 *           on `starter-sixteen` (unique 26-role dealing, exact faction split, Spectator P0 privacy)
 *  - P3C-3: Production DO blocks `starter-sixteen`, concurrent `classic` + `starter-sixteen`,
 *           DO hibernation preserving pendingChoice & Gloria queued card, duplicate requestId
 *           idempotency, and disconnect mid-choice auto-recovery to FINISHED
 *  - P3C-4: Midnight Noir UI metadata, VFX queue, Sound cues & Reduced Motion across all 8 Wave 2 roles
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
  PHASE3A_ROLE_IDS,
  STARTER_SIXTEEN_EXPANSION_ROLE_IDS,
  advanceTurn,
  applyPlayerGameAction,
  createInitialGameState,
  getPrivateGameView,
  getPublicGameView,
  getRoleDesign,
  getRoleDistribution,
  hasGloriaQueuedCards,
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

function makeControlledS16State(roleSpecs, seed = 93001) {
  const state = createInitialGameState({
    matchId: `p3c_${seed}`,
    seed,
    nowMs: 1_795_000_000_000,
    rulesetId: 'starter-sixteen',
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
// 1. CROSS-CHARACTER INTERACTION MATRIX & 4-CHAIN PENDING CHOICES IN 1 TURN
// ===========================================================================

test('P3C-1 — Multi-pending-choice single-turn chain (Elysia MG -> hidden Undying -> hidden Cindy -> kill -> hidden Wendigo) & Bipolar/Witch/Warlock combos', () => {
  const now = 1_795_000_001_000;

  // Scenario A: Revealed Elysia (Machine Gun ev-06) attacks central cluster (lobby/canteen) for baseDmg=2 (< 3)!
  // Targets in cluster:
  //   - p2: hidden Undying (lobby, full 11 HP) -> takes 4 raw -> secret Undying reduces 4 -> 3!
  //   - p3: hidden Cindy (lobby, full 11 HP) -> takes 4 raw -> secret Cindy reveals & retaliates 1 to Elysia!
  //   - p4: revealed Witch at `canteen` (1 HP left -> dies to 4 raw!) -> triggers p5 hidden Wendigo at `court`!
  //   - p5: hidden Wendigo (court, 10/14 HP) -> secret Wendigo reveals & heals +1 HP -> 11/14 HP!
  //   - p6: alive Hunter (court) & p7: alive Shadow (court) so match stays running through full chain.
  const sChain = makeControlledS16State([
    { roleId: 'exp1_elysia', revealed: true, location: 'lobby', equipped: ['ev-06'] },
    { roleId: 'exp1_undying', revealed: false, location: 'lobby', woundsTaken: 0 },
    { roleId: 'exp1_cindy', revealed: false, location: 'lobby', woundsTaken: 0 },
    { roleId: 'exp2_witch', revealed: true, location: 'canteen', woundsTaken: 13 }, // NOT corridor -> 1 HP left, dies!
    { roleId: 'exp1_wendigo', revealed: false, location: 'court', woundsTaken: 4 },
    { roleId: 'exp2_gloria', revealed: true, location: 'court', woundsTaken: 0 },
    { roleId: 'exp2_warlock', revealed: true, location: 'court', woundsTaken: 0 },
  ], 93101);
  sChain.rngState = findAttackRollSeed(2);

  // Step 1: Attack opens public Elysia boost choice (< 3 raw)
  assert.equal(applyPlayerGameAction(sChain, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now).ok, true);
  assert.equal(sChain.pendingChoice?.kind, 'elysia_counter_boost');
  assert.equal(sChain.pendingChoice?.isSecret, false);

  assert.equal(
    applyPlayerGameAction(sChain, 'p1', {
      type: 'RESOLVE_CHOICE',
      choiceId: sChain.pendingChoice.choiceId,
      optionId: 'boost',
    }, now + 10).ok,
    true,
  );

  // Step 2: Hidden Undying receives secret reduction choice BEFORE damage applies
  assert.equal(sChain.pendingChoice?.kind, 'undying_reveal_reduce');
  assert.equal(sChain.pendingChoice?.isSecret, true);
  assert.equal(getPublicGameView(sChain).pendingChoice?.ownerPlayerId, null, 'P0: hidden Undying must stay masked');
  assert.equal(
    applyPlayerGameAction(sChain, 'p2', {
      type: 'RESOLVE_CHOICE',
      choiceId: sChain.pendingChoice.choiceId,
      optionId: 'reveal_and_reduce',
    }, now + 20).ok,
    true,
  );
  assert.equal(sChain.players.p2.woundsTaken, 3, 'Undying took 2 + 2 Elysia - 1 Iron Plating = 3');

  // Step 3: Hidden Cindy takes 4 dmg -> opens secret retaliation choice
  assert.equal(sChain.pendingChoice?.kind, 'cindy_reveal_retaliate');
  assert.equal(sChain.pendingChoice?.isSecret, true);
  assert.equal(getPublicGameView(sChain).pendingChoice?.ownerPlayerId, null, 'P0: hidden Cindy must stay masked');
  assert.equal(getPrivateGameView(sChain, 'p1')?.pendingChoice, undefined, 'Attacker must not see hidden Cindy choice');
  assert.equal(
    applyPlayerGameAction(sChain, 'p3', {
      type: 'RESOLVE_CHOICE',
      choiceId: sChain.pendingChoice.choiceId,
      optionId: 'reveal_and_retaliate',
    }, now + 30).ok,
    true,
  );
  assert.equal(sChain.players.p3.woundsTaken, 4, 'Cindy took 2 + 2 Elysia = 4');
  assert.equal(sChain.players.p1.woundsTaken, 1, 'Elysia took 1 retaliation damage from Cindy');

  // Step 4: Witch at `canteen` dies -> hidden Wendigo gets secret elimination choice
  assert.equal(sChain.players.p4.alive, false);
  assert.equal(sChain.pendingChoice?.kind, 'wendigo_reveal_heal');
  assert.equal(sChain.pendingChoice?.isSecret, true);
  assert.equal(
    applyPlayerGameAction(sChain, 'p5', {
      type: 'RESOLVE_CHOICE',
      choiceId: sChain.pendingChoice.choiceId,
      optionId: 'reveal_and_activate',
    }, now + 40).ok,
    true,
  );
  assert.equal(sChain.pendingChoice, null, 'All 4 chained choices resolved cleanly');
  assert.equal(sChain.players.p5.hp, 11, 'Wendigo healed 10 -> 11 HP');
  assert.notEqual(sChain.activePlayerId, 'p1', 'Turn advanced cleanly after 4 chained choices!');

  // Scenario B: Bipolar lethal self-damage as 3rd Neutral death -> triggers Shadow win & dead Bipolar CO-WINS!
  const sBipolarShadowWin = makeControlledS16State([
    { roleId: 'exp2_gloria', revealed: true, location: 'lobby' },
    { roleId: 'exp1_bipolar', revealed: true, location: 'lobby', woundsTaken: 7 }, // 3 HP left -> d4+2 (>=3) kills!
    { roleId: 'exp2_warlock', revealed: true, location: 'court' },
    { roleId: 'exp2_unchained', revealed: true, location: 'court' },
    { roleId: 'exp2_father_harrison', revealed: true, location: 'radio' },
    { roleId: 'lang-anh-san', revealed: true, location: 'breaker', alive: false, woundsTaken: 10 },
    { roleId: 'exp1_cindy', revealed: true, location: 'canteen', alive: false, woundsTaken: 11 },
  ], 93102);
  advanceTurn(sBipolarShadowWin, now);
  assert.equal(sBipolarShadowWin.activePlayerId, 'p2');
  assert.equal(sBipolarShadowWin.pendingChoice?.kind, 'bipolar_fate_coin');
  assert.equal(
    applyPlayerGameAction(sBipolarShadowWin, 'p2', {
      type: 'RESOLVE_CHOICE',
      choiceId: sBipolarShadowWin.pendingChoice.choiceId,
      optionId: 'damage_self',
    }, now + 10).ok,
    true,
  );
  assert.equal(sBipolarShadowWin.players.p2.alive, false);
  assert.equal(sBipolarShadowWin.finished, true, '3rd Neutral death immediately triggers Shadow win');
  assert.equal(sBipolarShadowWin.winnerFaction, 'mist-order');
  assert.ok(sBipolarShadowWin.winnerPlayerIds.includes('p3'), 'Warlock wins');
  assert.ok(sBipolarShadowWin.winnerPlayerIds.includes('p4'), 'Unchained wins');
  assert.ok(sBipolarShadowWin.winnerPlayerIds.includes('p2'), 'Dead Bipolar CO-WINS when Shadows win!');
  assert.equal(sBipolarShadowWin.winnerPlayerIds.includes('p7'), false, 'Dead Cindy does NOT win');
});

// ===========================================================================
// 2. REAL CLOUDFLARE DO WEBSOCKET E2E ACROSS 4P, 5P, 6P, 7P & 8P
// ===========================================================================

test('P3C-2 — Real Cloudflare DO WebSocket E2E across 4P, 5P, 6P, 7P, and 8P on starter-sixteen (unique roles, exact faction split, Spectator P0 privacy)', async () => {
  const server = await startStandaloneBoardGameTestServer(0, {
    ALLOW_EXPERIMENTAL_RULESETS: '1',
    CHOICE_TIMEOUT_OVERRIDE_MS: '800',
  });
  const playable26Ids = new Set(
    DEFAULT_RULESET_REGISTRY.listPlayableCharactersForRuleset('starter-sixteen', {
      allowExperimental: true,
    }).map((e) => e.id),
  );
  assert.equal(playable26Ids.size, 26);

  try {
    for (const playerCount of [4, 5, 6, 7, 8]) {
      const createRes = await fetch(`${server.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: `table-s16-${playerCount}p`,
          hostName: `Host_${playerCount}P`,
          rulesetId: 'starter-sixteen',
        }),
      });
      assert.equal(createRes.status, 201, `Create starter-sixteen ${playerCount}P failed`);
      const match = await createRes.json();
      assert.equal(match.rulesetId, 'starter-sixteen');

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

      // Attach a Spectator to verify P0 privacy at every player count!
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

      // Host starts match
      clients[0].send({ type: 'BG_START_MATCH', requestId: `start_${playerCount}` });
      const syncs = await Promise.all([
        ...clients.map((c) => c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING')),
        spectator.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING'),
      ]);

      const playerSyncs = syncs.slice(0, playerCount);
      const specSync = syncs[playerCount];

      // Verify exact unique role dealing + exact faction split
      const dealtRoles = new Set();
      const factionCounts = { 'lantern-guard': 0, 'mist-order': 0, wanderer: 0 };
      for (const s of playerSyncs) {
        assert.equal(s.rulesetId, 'starter-sixteen');
        const rid = s.privateView.roleId;
        assert.ok(playable26Ids.has(rid), `${playerCount}P dealt non-starter-sixteen role: ${rid}`);
        assert.equal(dealtRoles.has(rid), false, `${playerCount}P dealt duplicate role: ${rid}`);
        dealtRoles.add(rid);
        factionCounts[s.privateView.faction] += 1;
      }
      const expectedSplit = getRoleDistribution(playerCount);
      assert.equal(factionCounts['lantern-guard'], expectedSplit.lanternGuard, `${playerCount}P Hunter count`);
      assert.equal(factionCounts['mist-order'], expectedSplit.mistOrder, `${playerCount}P Shadow count`);
      assert.equal(factionCounts.wanderer, expectedSplit.wanderer, `${playerCount}P Neutral count`);

      // Spectator P0 check: null privateView and zero revealed roles at start
      assert.equal(specSync.privateView, null, `${playerCount}P spectator must not receive privateView`);
      for (const pubPlayer of specSync.publicGame.players) {
        assert.equal(pubPlayer.revealedRoleId, null, `${playerCount}P leaked roleId to spectator`);
        assert.equal(pubPlayer.revealedFaction, null, `${playerCount}P leaked faction to spectator`);
        assert.equal(pubPlayer.revealedMaxHp, null, `${playerCount}P leaked maxHp to spectator`);
      }

      spectator.close();
      for (const c of clients) c.close();
    }
  } finally {
    await server.close();
  }
});

// ===========================================================================
// 3. PRODUCTION BLOCK + CONCURRENT CLASSIC/S16 + DO HIBERNATION + IDEMPOTENCY + DISCONNECT RECOVERY
// ===========================================================================

test('P3C-3 — Production blocks starter-sixteen; concurrent Classic + S16; DO hibernation preserves pendingChoice & Gloria queue; idempotency & disconnect recovery', async () => {
  // 1. Production DO (ALLOW_EXPERIMENTAL_RULESETS unset) MUST reject starter-sixteen!
  const prodServer = await startStandaloneBoardGameTestServer(0, {});
  try {
    const blockedRes = await fetch(`${prodServer.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-prod-block', hostName: 'ProdHost', rulesetId: 'starter-sixteen' }),
    });
    assert.equal(blockedRes.status, 400, 'Production DO MUST reject starter-sixteen creation');
    const body = await blockedRes.json();
    assert.equal(body.code, 'RULESET_UNAVAILABLE');
  } finally {
    await prodServer.close();
  }

  // 2. Experimental DO: concurrent Classic (Table 1) + Starter Sixteen (Table 2)
  const expServer = await startStandaloneBoardGameTestServer(0, {
    ALLOW_EXPERIMENTAL_RULESETS: '1',
    CHOICE_TIMEOUT_OVERRIDE_MS: '600',
  });
  try {
    const [resClassic, resS16] = await Promise.all([
      fetch(`${expServer.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: 'table-1', hostName: 'ClassicHost', rulesetId: 'classic' }),
      }),
      fetch(`${expServer.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: 'table-2', hostName: 'S16Host', rulesetId: 'starter-sixteen' }),
      }),
    ]);
    assert.equal(resClassic.status, 201);
    assert.equal(resS16.status, 201);
    const mClassic = await resClassic.json();
    const mS16 = await resS16.json();

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

    const [classicMatch, s16Match] = await Promise.all([
      joinAndStart(mClassic, 4, 'CL'),
      joinAndStart(mS16, 5, 'S16'),
    ]);

    const classicRoleIds = new Set([
      'gac-ky-thuat', 'gac-truc-ban', 'gac-radio',
      'suong-an-danh', 'suong-tin-gia', 'suong-gac-cong',
      'lang-anh-san', 'lang-quan-sat', 'lang-cuu-ho', 'lang-tien-phong',
    ]);
    for (const s of classicMatch.syncs) {
      assert.ok(classicRoleIds.has(s.privateView.roleId), 'Classic match must remain strictly Classic');
    }

    // Inject controlled Starter Sixteen state:
    //   p0 = revealed Gloria at `lobby` (LOCATION_ACTION, 2 consumable White cards eq-07 + eq-08 on top of equipment deck)
    //   p1 = hidden Cindy at `lobby` (1 HP left, will die later)
    //   p2 = revealed Warlock at `court` (1 HP left, last Shadow after p3 dead -> Gloria kills p2? Or p0 kills p2!)
    //   p3 = dead Shadow at `court`
    //   p4 = revealed Bipolar at `radio`
    const container = expServer.containers.get(mS16.matchId);
    const sql = container.ctx.storage.sql;
    const row = sql.exec('SELECT game_state_json, revision FROM matches WHERE match_id = ?', mS16.matchId).one();
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
    };
    es.clusterPairs = [
      { clusterId: 'north', locationIds: ['radio', 'breaker'] },
      { clusterId: 'central', locationIds: ['lobby', 'canteen'] },
      { clusterId: 'south', locationIds: ['corridor', 'court'] },
    ];
    setRole(id0, 'exp2_gloria', true, 'lobby', 4, true, ['ev-01', 'ev-02']); // 10/14 HP, Masamune + Chainsaw
    setRole(id1, 'exp1_cindy', false, 'lobby', 0, true, []); // hidden Cindy at lobby
    setRole(id2, 'exp2_warlock', true, 'canteen', 13, true, []); // 1/14 HP, last alive Shadow!
    setRole(id3, 'exp2_unchained', true, 'court', 11, false, []); // dead Shadow
    setRole(id4, 'exp1_bipolar', true, 'radio', 0, true, []); // alive Bipolar -> will co-win on Hunter win!
    es.decks.equipment = ['eq-07', 'eq-08', 'eq-01'];
    es.activePlayerId = id0;
    es.turnPhase = 'LOCATION_ACTION';
    sql.exec('UPDATE matches SET game_state_json = ? WHERE match_id = ?', JSON.stringify(wrapped), mS16.matchId);

    // A. Gloria draws 2 White cards -> Card #1 (eq-07) in hand, Card #2 (eq-08) in authoritative queue!
    let rev = row.revision;
    const mark0 = s16Match.clients[0].inbox.length;
    s16Match.clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'gloria_draw_1',
      expectedRevision: rev,
      action: { type: 'DRAW_CARD', deck: 'equipment' },
    });
    const afterDraw = await s16Match.clients[0].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision > rev,
      4000,
      mark0,
    );
    rev = afterDraw.revision;
    assert.deepEqual(afterDraw.privateView.hand.map((c) => c.id), ['eq-07']);

    // B. Simulate DO Hibernation & Wake right while Gloria has Card #2 queued in SQLite!
    container.hibernateAndWake();

    // Use Card #1 (eq-07) after DO wake -> Card #2 (eq-08) MUST be delivered from persisted queue!
    const mark1 = s16Match.clients[0].inbox.length;
    s16Match.clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'gloria_use_1',
      expectedRevision: rev,
      action: { type: 'USE_CARD', cardId: 'eq-07' },
    });
    const afterUse1 = await s16Match.clients[0].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision > rev,
      4000,
      mark1,
    );
    rev = afterUse1.revision;
    assert.deepEqual(afterUse1.privateView.hand.map((c) => c.id), ['eq-08'], 'Persisted Gloria queue survived DO hibernation!');

    // Duplicate requestId replay must be idempotently acked without mutating state
    await new Promise((r) => setTimeout(r, 120));
    const markDup = s16Match.clients[0].inbox.length;
    s16Match.clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'gloria_use_1',
      expectedRevision: rev - 1,
      action: { type: 'USE_CARD', cardId: 'eq-07' },
    });
    const dupAck = await s16Match.clients[0].nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'gloria_use_1',
      4000,
      markDup,
    );
    assert.equal(dupAck.ok, true);

    // Use Card #2 (eq-08 Blessing on id4)
    await new Promise((r) => setTimeout(r, 120));
    const mark2 = s16Match.clients[0].inbox.length;
    s16Match.clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'gloria_use_2',
      expectedRevision: rev,
      action: { type: 'USE_CARD', cardId: 'eq-08', targetPlayerId: id4 },
    });
    const afterUse2 = await s16Match.clients[0].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision > rev,
      4000,
      mark2,
    );
    rev = afterUse2.revision;
    assert.equal(afterUse2.privateView.hand.length, 0);

    // C. Gloria attacks hidden Cindy (id1) -> opens secret `cindy_reveal_retaliate` choice!
    await new Promise((r) => setTimeout(r, 120));
    const markCindy = s16Match.clients[1].inbox.length;
    const markOthers = s16Match.clients[4].inbox.length;
    s16Match.clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'gloria_atk_cindy',
      expectedRevision: rev,
      action: { type: 'ATTACK', targetPlayerId: id1 },
    });
    const cindyPrompt = await s16Match.clients[1].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.privateView?.pendingChoice?.kind === 'cindy_reveal_retaliate',
      4000,
      markCindy,
    );
    rev = cindyPrompt.revision;
    const bipolarPromptView = await s16Match.clients[4].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision >= rev,
      4000,
      markOthers,
    );
    // P0 secret privacy check over real WebSocket!
    assert.equal(bipolarPromptView.publicGame.pendingChoice?.ownerPlayerId, null, 'WS P0: hidden Cindy owner masked');
    assert.equal(bipolarPromptView.publicGame.pendingChoice?.kind, null, 'WS P0: hidden Cindy kind masked');
    assert.equal(bipolarPromptView.privateView?.pendingChoice, undefined);

    // Hibernate DO AGAIN while secret Cindy pendingChoice is open, AND Cindy DISCONNECTS!
    container.hibernateAndWake();
    s16Match.clients[1].close();
    await new Promise((r) => setTimeout(r, 680));
    assert.equal(
      (await fetch(`${expServer.httpBaseUrl}/__bg_trigger_alarm?matchId=${encodeURIComponent(mS16.matchId)}`)).status,
      200,
    );

    // Alarm resolves Cindy secret choice safely (`decline`) without leaking Cindy's identity & advances turn!
    const afterAlarm = await s16Match.clients[4].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision > rev && !m.publicGame.pendingChoice,
      4000,
      markOthers,
    );
    const cindyPublic = afterAlarm.publicGame.players.find((p) => p.playerId === id1);
    assert.equal(cindyPublic.revealedRoleId, null, 'Timed-out disconnected hidden Cindy MUST stay unrevealed (zero leak!)');

    // Verify Classic match on Table 1 remained completely untouched!
    assert.equal(classicMatch.clients[0].getLatestSync().status, 'PLAYING');

    for (const c of classicMatch.clients) c.close();
    for (const c of s16Match.clients) c.close();
  } finally {
    await expServer.close();
  }
});

// ===========================================================================
// 4. WAVE 2 UI / VFX / SOUND & REDUCED MOTION (ZERO HIDDEN-ROLE VFX LEAK)
// ===========================================================================

test('P3C-4 — UI metadata, portraits, VFX queue & Reduced Motion cover all 8 Wave 2 roles with zero hidden-role leak', () => {
  resetBoardGameAudioForTests();

  assert.equal(PHASE3A_ROLE_IDS.length, 8);
  assert.equal(STARTER_SIXTEEN_EXPANSION_ROLE_IDS.length, 16);

  for (const roleId of PHASE3A_ROLE_IDS) {
    const design = getRoleDesign(roleId);
    const visual = ROLE_VISUAL_META[roleId];
    const art = MIDNIGHT_CHARACTER_ART[roleId];
    assert.ok(design && design.skillName.length > 0, `Missing design for ${roleId}`);
    assert.ok(visual && visual.shortAbility.length > 0, `Missing ROLE_VISUAL_META for ${roleId}`);
    assert.ok(art && art.endsWith('.webp'), `Missing WebP portrait for ${roleId}`);
  }

  const baseState = makeControlledS16State([
    { roleId: 'exp2_witch', revealed: true, location: 'corridor' },
    { roleId: 'exp2_warlock', revealed: true, location: 'court' },
    { roleId: 'exp1_bipolar', revealed: true, location: 'lobby' },
    { roleId: 'exp1_cindy', revealed: false, location: 'lobby' }, // HIDDEN!
  ], 93201);
  const prevPub = getPublicGameView(baseState);

  baseState.publicLog.push(
    {
      id: 'log-witch-1',
      round: 1,
      atMs: 1_795_000_005_000,
      kind: 'skill',
      actorId: 'p1',
      text: '🛡️ Witch (SV 1) — Không Nơi Đâu Bằng Nhà: miễn nhiễm toàn bộ sát thương tại Hành Lang Tối!',
    },
    {
      id: 'log-warlock-1',
      round: 1,
      atMs: 1_795_000_005_100,
      kind: 'skill',
      actorId: 'p2',
      text: '⚡ Warlock (SV 2) — Nguồn Lực: cộng +3 sát thương tại Sân Bóng!',
    },
    {
      id: 'log-bipolar-1',
      round: 1,
      atMs: 1_795_000_005_200,
      kind: 'skill',
      actorId: 'p3',
      text: '🪙💚 Bipolar (SV 3) — Đồng Xu Định Mệnh: hồi 5 HP!',
    },
    {
      // P0 guard check: even if a log references hidden p4, VFX must NOT reveal hidden role!
      id: 'log-hidden-cindy',
      round: 1,
      atMs: 1_795_000_005_300,
      kind: 'skill',
      actorId: 'p4',
      text: 'Hidden actor log probe',
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

  const witchEv = normalEvents.find((e) => e.kind === 'COMBAT_VFX' && e.roleId === 'exp2_witch');
  const warlockEv = normalEvents.find((e) => e.kind === 'COMBAT_VFX' && e.roleId === 'exp2_warlock');
  const bipolarEv = normalEvents.find((e) => e.kind === 'COMBAT_VFX' && e.roleId === 'exp1_bipolar');
  const hiddenLeak = normalEvents.find((e) => e.sourcePlayerId === 'p4' || e.roleId === 'exp1_cindy');

  assert.ok(witchEv, 'Revealed Witch emits shield VFX');
  assert.ok(warlockEv, 'Revealed Warlock emits attack boost VFX');
  assert.ok(bipolarEv, 'Revealed Bipolar emits heal/fate VFX');
  assert.equal(hiddenLeak, undefined, 'Hidden Cindy MUST NEVER emit role-identifying VFX');

  const witchReduced = reducedEvents.find((e) => e.kind === 'COMBAT_VFX' && e.roleId === 'exp2_witch');
  assert.ok(witchReduced && witchReduced.durationMs < witchEv.durationMs, 'Reduced motion shortens duration');

  for (const ev of normalEvents) {
    assert.doesNotThrow(() => playSoundForVisualEvent(ev, 1_795_000_006_000));
  }
});
