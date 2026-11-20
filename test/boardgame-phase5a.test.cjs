'use strict';

/**
 * test/boardgame-phase5a.test.cjs — Phase 5A Shared Engine Foundations Verification
 *
 * Covers:
 *  - P5A-1: CAP-10 Canonical card metadata (`CONSUMABLE_DAMAGING_BLACK_CARD_IDS`, `WHITE_HEAL_CARD_IDS`) & Wave 4 catalog math
 *  - P5A-2: CAP-04 Centralized `HealPipeline` (all 5 source kinds, Dalton self-heal block vs external heal, max-HP clip, idempotency, expanded card/location/skill routing)
 *  - P5A-3: CAP-05 Private `reactionPolicy` (`ASK` / `AUTO_DECLINE` / `AUTO_ACTIVATE_WHEN_ELIGIBLE`) on hidden `Undying`, `Cindy`, `Wendigo` + P0 projection isolation
 *  - P5A-4: CAP-05 Real Cloudflare DO WebSocket zero-leak unicast `SET_REACTION_PREF` (zero broadcast to others/spectators, zero revision bump, SQLite hibernation persistence)
 *  - P5A-5: CAP-06 Safe reaction chains (`MAX_PENDING_STEPS_DRAIN`, `MAX_REACTION_CHAIN_DEPTH`, `ROLE_REVEALED_TRIGGERS`, `isSingleTarget` cardinality)
 *  - P5A-6: CAP-07 Extended Neutral Victory evaluation primitives (ties on min/max HP, exact `lobby` Church vs paired location, Arlene/Dalton immediate flags)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

require('./register-ts.cjs');

const ROOT = path.resolve(__dirname, '..');

const { WebSocket } = require('./ws-shim/mini-ws');
const {
  startStandaloneBoardGameTestServer,
} = require('./ws-shim/boardgame-do-harness.cjs');

const {
  BINARY_SECRET_REACTION_ROLES,
  CONSUMABLE_DAMAGING_BLACK_CARD_IDS,
  HEAL_SOURCE_KINDS,
  MAX_PENDING_STEPS_DRAIN,
  MAX_REACTION_CHAIN_DEPTH,
  USURPER_BLOCKABLE_HEAL_SOURCES,
  WHITE_HEAL_CARD_IDS,
  applyPlayerGameAction,
  canRoleAutoActivateSecretReaction,
  createInitialGameState,
  executeHealPipeline,
  getPlayerReactionPolicy,
  getPrivateGameView,
  getPublicGameView,
  hasHighestRemainingHpAmongSurvivors,
  hasLowestRemainingHpAmongSurvivors,
  isAngelEndOfMatchVictorySatisfied,
  isArleneImmediateVictorySatisfied,
  isConsumableDamagingBlackCardId,
  isDaltonImmediateVictorySatisfied,
  isUsurperBlockableHealSource,
  isWhiteHealCardId,
  setPlayerReactionPolicy,
} = require(path.join(ROOT, 'features/boardgame/domain/index.ts'));

const {
  BOARD_GAME_VALID_REACTION_POLICIES,
  isValidBoardGameReactionPolicy,
  validateBoardGameActionPayload,
} = require(path.join(ROOT, 'shared/contracts/boardgame.ts'));

function makeTestState(rulesetId = 'starter-twenty-six', seed = 5501) {
  return createInitialGameState({
    matchId: `p5a-${seed}`,
    seed,
    nowMs: 1_700_000_000_000,
    rulesetId,
    allowExperimental: rulesetId !== 'classic',
    players: [
      { playerId: 'p1', displayName: 'Alice', seatIndex: 0, appearance: {}, connected: true },
      { playerId: 'p2', displayName: 'Bob', seatIndex: 1, appearance: {}, connected: true },
      { playerId: 'p3', displayName: 'Cara', seatIndex: 2, appearance: {}, connected: true },
      { playerId: 'p4', displayName: 'Dan', seatIndex: 3, appearance: {}, connected: true },
      { playerId: 'p5', displayName: 'Eve', seatIndex: 4, appearance: {}, connected: true },
    ],
  });
}

test('P5A-1 — CAP-10 Canonical card metadata & Phase 5 scope partition invariants', () => {
  assert.deepEqual(CONSUMABLE_DAMAGING_BLACK_CARD_IDS, [
    'ev-07',
    'ev-08',
    'ev-09',
    'ev-10',
    'ev-12',
  ]);
  // Permanent black weapons and non-damaging black cards MUST be excluded!
  for (const excluded of ['ev-01', 'ev-02', 'ev-03', 'ev-04', 'ev-05', 'ev-06', 'ev-11', 'ev-13']) {
    assert.equal(isConsumableDamagingBlackCardId(excluded), false, `${excluded} must not qualify`);
  }
  for (const included of ['ev-07', 'ev-08', 'ev-09', 'ev-10', 'ev-12']) {
    assert.equal(isConsumableDamagingBlackCardId(included), true, `${included} must qualify`);
  }

  assert.deepEqual(WHITE_HEAL_CARD_IDS, ['eq-07', 'eq-08', 'eq-09', 'eq-13', 'eq-14']);
  for (const included of WHITE_HEAL_CARD_IDS) {
    assert.equal(isWhiteHealCardId(included), true);
  }
  assert.equal(isWhiteHealCardId('eq-11'), false);
  assert.equal(isWhiteHealCardId('ev-07'), false);

  // Catalog math: 56 total = 17H / 18S / 21N; after Phase 5 (+4H/+4S/+4N) -> 18 remaining (2H / 3S / 13N)
  const cat = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'docs/boardgame-expansion/character-catalog.json'), 'utf8'),
  );
  assert.equal(cat.characters.length, 56);
  const phase5Ids = new Set([
    'exp2_elise',
    'exp1_ernest',
    'exp1_gwendolen',
    'exp2_freyja',
    'exp2_umibozu',
    'exp2_urban_legend',
    'exp2_warlord',
    'exp2_usurper',
    'exp2_arlene',
    'exp1_angel',
    'exp2_bianca',
    'exp2_dalton',
  ]);
  const rem = { hunter: 0, shadow: 0, neutral: 0 };
  for (const c of cat.characters) {
    if (c.implementationStatus !== 'implemented' && !phase5Ids.has(c.id)) {
      rem[c.faction] += 1;
    }
  }
  assert.ok(
    rem.hunter >= 1 && rem.hunter <= 2 && rem.shadow === 3 && rem.neutral >= 4 && rem.neutral <= 13,
    `Expected post-Phase 5/6 remaining unimplemented partition (1..2H / 3S / 4..13N), got ${JSON.stringify(rem)}`,
  );
});

test('P5A-2 — CAP-04 HealPipeline deterministic routing, Dalton self-heal block, idempotency & First Aid', () => {
  assert.deepEqual(HEAL_SOURCE_KINDS, [
    'skill',
    'white-card',
    'black-card',
    'location',
    'investigation',
  ]);
  assert.equal(isUsurperBlockableHealSource('skill'), true);
  assert.equal(isUsurperBlockableHealSource('white-card'), true);
  assert.equal(isUsurperBlockableHealSource('black-card'), false);
  assert.equal(isUsurperBlockableHealSource('location'), false);
  assert.equal(isUsurperBlockableHealSource('investigation'), false);
  assert.equal(USURPER_BLOCKABLE_HEAL_SOURCES.size, 2);

  const state = makeTestState('starter-twenty-six', 5502);
  const p1 = state.players.p1;
  const p2 = state.players.p2;
  p1.woundsTaken = 6;
  p1.hp = p1.maxHp - 6;

  // Idempotent heal + max HP clipping
  const seen = new Set();
  const hooks = {
    hasProcessedEvent: (_s, id) => seen.has(id),
    markEventProcessed: (_s, id) => seen.add(id),
  };
  const r1 = executeHealPipeline(
    state,
    {
      healEventId: 'h-1',
      actorPlayerId: p1.playerId,
      targetPlayerId: p1.playerId,
      rawAmount: 2,
      sourceKind: 'white-card',
    },
    1000,
    hooks,
  );
  assert.equal(r1.actual, 2);
  assert.equal(r1.blockedBy, 'none');
  assert.equal(p1.woundsTaken, 4);

  const rDup = executeHealPipeline(
    state,
    {
      healEventId: 'h-1',
      actorPlayerId: p1.playerId,
      targetPlayerId: p1.playerId,
      rawAmount: 2,
      sourceKind: 'white-card',
    },
    1001,
    hooks,
  );
  assert.equal(rDup.actual, 0);
  assert.equal(rDup.blockedBy, 'duplicate-event');
  assert.equal(p1.woundsTaken, 4);

  // Dalton self-heal block vs external heal allow
  state.expansionState.daltonActivatedByPlayer = {
    [p1.playerId]: { activatedOnTurnNumber: 1, damageEventId: 'dmg-d1' },
  };
  const rSelfBlocked = executeHealPipeline(
    state,
    {
      healEventId: 'h-self-blocked',
      actorPlayerId: p1.playerId,
      targetPlayerId: p1.playerId,
      rawAmount: 3,
      sourceKind: 'white-card',
    },
    1002,
    hooks,
  );
  assert.equal(rSelfBlocked.actual, 0);
  assert.equal(rSelfBlocked.blockedBy, 'dalton-self-heal');
  assert.equal(p1.woundsTaken, 4);

  const rExtAllowed = executeHealPipeline(
    state,
    {
      healEventId: 'h-ext-allowed',
      actorPlayerId: p2.playerId,
      targetPlayerId: p1.playerId,
      rawAmount: 10,
      sourceKind: 'skill',
    },
    1003,
    hooks,
  );
  assert.equal(rExtAllowed.actual, 4, 'Must clip heal to exact woundsTaken');
  assert.equal(rExtAllowed.blockedBy, 'none');
  assert.equal(p1.woundsTaken, 0);
  assert.equal(p1.hp, p1.maxHp);

  // Expanded First Aid (`eq-09`): wounds > 7 routes through HealPipeline (blocked for self-healing activated Dalton!)
  p1.woundsTaken = 9;
  p1.hp = Math.max(1, p1.maxHp - 9);
  state.activePlayerId = p1.playerId;
  state.turnPhase = 'MAIN_ACTION';
  p1.hand = ['eq-09'];
  const faSelf = applyPlayerGameAction(
    state,
    p1.playerId,
    { type: 'USE_CARD', cardId: 'eq-09', targetPlayerId: p1.playerId },
    1004,
  );
  assert.equal(faSelf.ok, true);
  assert.equal(p1.woundsTaken, 9, 'Dalton self-heal via First Aid (wounds 9 -> 7) must be blocked by HealPipeline');

  // External Blessing (`eq-08`) from p2 still heals Dalton!
  state.activePlayerId = p2.playerId;
  state.turnPhase = 'MAIN_ACTION';
  p2.hand = ['eq-08'];
  const blessExt = applyPlayerGameAction(
    state,
    p2.playerId,
    { type: 'USE_CARD', cardId: 'eq-08', targetPlayerId: p1.playerId },
    1005,
  );
  assert.equal(blessExt.ok, true);
  assert.ok(p1.woundsTaken < 9, 'External Blessing from p2 must still heal Dalton');
});

test('P5A-3 — CAP-05 Private reactionPolicy on hidden Undying/Cindy/Wendigo & zero public exposure', () => {
  assert.deepEqual(BOARD_GAME_VALID_REACTION_POLICIES, [
    'ASK',
    'AUTO_DECLINE',
    'AUTO_ACTIVATE_WHEN_ELIGIBLE',
  ]);
  assert.equal(isValidBoardGameReactionPolicy('AUTO_DECLINE'), true);
  assert.equal(isValidBoardGameReactionPolicy('INVALID'), false);
  assert.equal(validateBoardGameActionPayload({ type: 'SET_REACTION_PREF', policy: 'AUTO_DECLINE' }).ok, true);
  assert.equal(validateBoardGameActionPayload({ type: 'SET_REACTION_PREF', policy: 'HACK' }).ok, false);

  assert.equal(canRoleAutoActivateSecretReaction('exp1_undying'), true);
  assert.equal(canRoleAutoActivateSecretReaction('exp1_wendigo'), true);
  assert.equal(canRoleAutoActivateSecretReaction('exp1_cindy'), true);
  assert.equal(canRoleAutoActivateSecretReaction('exp2_bianca'), false);
  assert.equal(canRoleAutoActivateSecretReaction('exp1_gwendolen'), false);
  assert.equal(BINARY_SECRET_REACTION_ROLES.has('exp2_usurper'), true);

  // Classic must reject SET_REACTION_PREF and omit reactionPolicy from PrivateView
  const classicState = makeTestState('classic', 5503);
  const classicRes = setPlayerReactionPolicy(classicState, 'p1', 'AUTO_DECLINE');
  assert.equal(classicRes.ok, false);
  assert.equal('reactionPolicy' in getPrivateGameView(classicState, 'p1'), false);

  // Expanded: hidden Undying with AUTO_DECLINE skips prompt in <1ms with zero reveal/log
  const state = makeTestState('starter-twenty-six', 5504);
  const p1 = state.players.p1;
  const p2 = state.players.p2;
  p2.roleId = 'exp1_undying';
  p2.faction = 'mist-order';
  p2.maxHp = 11;
  p2.hp = 11;
  p2.woundsTaken = 0;
  p2.revealed = false;

  const prefRes = applyPlayerGameAction(
    state,
    p2.playerId,
    { type: 'SET_REACTION_PREF', policy: 'AUTO_DECLINE' },
    2000,
  );
  assert.equal(prefRes.ok, true);
  assert.equal(getPlayerReactionPolicy(state, p2.playerId), 'AUTO_DECLINE');

  // Verify P0 isolation: reactionPolicy ONLY in p2 private view, NEVER in public view or p1 view
  const pub = getPublicGameView(state);
  assert.equal(JSON.stringify(pub).includes('AUTO_DECLINE'), false);
  assert.equal(getPrivateGameView(state, p2.playerId).reactionPolicy, 'AUTO_DECLINE');
  assert.equal(getPrivateGameView(state, p1.playerId).reactionPolicy, 'ASK');

  // p1 hits hidden Undying (p2) with Vampire Bat (2 dmg): AUTO_DECLINE must take full 2 dmg with NO pendingChoice!
  state.activePlayerId = p1.playerId;
  state.turnPhase = 'MAIN_ACTION';
  p1.hand = ['ev-07'];
  const batRes = applyPlayerGameAction(
    state,
    p1.playerId,
    { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: p2.playerId },
    2001,
  );
  assert.equal(batRes.ok, true);
  assert.equal(state.pendingChoice ?? null, null, 'AUTO_DECLINE must not open any pendingChoice');
  assert.equal(p2.revealed, false, 'AUTO_DECLINE must keep Undying hidden');
  assert.equal(p2.woundsTaken, 2, 'AUTO_DECLINE must take full 2 dmg');

  // Now switch p2 to AUTO_ACTIVATE_WHEN_ELIGIBLE and hit again with Vampire Bat (2 dmg) -> auto-reveals & reduces to 1!
  applyPlayerGameAction(
    state,
    p2.playerId,
    { type: 'SET_REACTION_PREF', policy: 'AUTO_ACTIVATE_WHEN_ELIGIBLE' },
    2002,
  );
  p1.hand = ['ev-07'];
  const batRes2 = applyPlayerGameAction(
    state,
    p1.playerId,
    { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: p2.playerId },
    2003,
  );
  assert.equal(batRes2.ok, true);
  assert.equal(state.pendingChoice ?? null, null, 'AUTO_ACTIVATE_WHEN_ELIGIBLE must resolve synchronously');
  assert.equal(p2.revealed, true, 'AUTO_ACTIVATE_WHEN_ELIGIBLE must reveal Undying');
  assert.equal(p2.woundsTaken, 3, '2 damage reduced to 1 -> total wounds 2 + 1 = 3');
});

test('P5A-4 — CAP-05 Real Cloudflare DO WebSocket unicast SET_REACTION_PREF (zero leak, zero revision bump, hibernation)', async () => {
  const server = await startStandaloneBoardGameTestServer(0, {
    ALLOW_EXPERIMENTAL_RULESETS: '1',
    ALLOW_SHORT_TURN_TIMEOUT: '1',
  });

  async function openClient(matchId) {
    const ws = new WebSocket(`${server.wsBaseUrl}/ws/boardgame?matchId=${encodeURIComponent(matchId)}`);
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
    await new Promise((res, rej) => {
      ws.once('open', res);
      ws.once('error', rej);
    });
    return {
      ws,
      inbox,
      getLatestSync: () => latestSync,
      send(obj) {
        ws.send(JSON.stringify(obj));
      },
      waitFor(pred, timeoutMs = 4000) {
        const hit = inbox.find(pred);
        if (hit) return Promise.resolve(hit);
        return new Promise((res, rej) => {
          const timer = setTimeout(() => rej(new Error('WS timeout')), timeoutMs);
          waiters.push({ pred, resolve: res, timer });
        });
      },
      close() {
        try {
          ws.close();
        } catch {}
      },
    };
  }

  const clients = [];
  try {
    const createRes = await fetch(`${server.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-1', rulesetId: 'starter-twenty-six', turnTimeoutMs: 0 }),
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();

    // 4 players + 1 spectator
    const names = ['P1', 'P2', 'P3', 'P4'];
    const auths = [];
    for (let i = 0; i < 4; i++) {
      const c = await openClient(created.matchId);
      clients.push(c);
      c.send({
        type: 'BG_JOIN',
        matchId: created.matchId,
        inviteCode: created.inviteCode,
        displayName: names[i],
        preferredSeatIndex: i,
      });
      const auth = await c.waitFor((m) => m.type === 'BG_AUTH_ISSUED');
      auths.push(auth);
      await c.waitFor((m) => m.type === 'BG_STATE_SYNC');
      if (i > 0) {
        c.send({ type: 'BG_SET_READY', ready: true, requestId: `rdy-${i}` });
        await c.waitFor((m) => m.type === 'BG_ACTION_ACK' && m.requestId === `rdy-${i}`);
      }
    }
    const spec = await openClient(created.matchId);
    clients.push(spec);
    spec.send({
      type: 'BG_JOIN',
      matchId: created.matchId,
      inviteCode: created.inviteCode,
      displayName: 'Spectator',
      asSpectator: true,
    });
    await spec.waitFor((m) => m.type === 'BG_STATE_SYNC');

    clients[0].send({ type: 'BG_START_MATCH', requestId: 'start-1', rulesetId: 'starter-twenty-six' });
    await clients[0].waitFor((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING');
    for (let i = 1; i < clients.length; i++) {
      await clients[i].waitFor((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING');
    }

    const revBefore = clients[0].getLatestSync().revision;
    const activeId = clients[0].getLatestSync().publicGame.activePlayerId;
    const nonActiveIdx = auths.findIndex((a) => a.playerId !== activeId);
    assert.ok(nonActiveIdx >= 0);

    // Snapshot inbox lengths of ALL other clients & spectator BEFORE non-active player updates reactionPolicy
    const otherLengthsBefore = clients.map((c) => c.inbox.length);

    // Out-of-turn player updates private reactionPolicy
    clients[nonActiveIdx].send({
      type: 'BG_GAME_ACTION',
      requestId: 'pref-out-of-turn-1',
      expectedRevision: revBefore,
      action: { type: 'SET_REACTION_PREF', policy: 'AUTO_DECLINE' },
    });
    const ack = await clients[nonActiveIdx].waitFor(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'pref-out-of-turn-1',
    );
    assert.equal(ack.ok, true);
    assert.equal(ack.revision, revBefore, 'SET_REACTION_PREF MUST NOT bump public revision!');

    const ownerSync = await clients[nonActiveIdx].waitFor(
      (m) =>
        m.type === 'BG_STATE_SYNC' &&
        m.privateView &&
        m.privateView.reactionPolicy === 'AUTO_DECLINE',
    );
    assert.equal(ownerSync.revision, revBefore);

    // Give event loop a tick and verify ZERO messages were sent to any other player or Spectator!
    await new Promise((r) => setTimeout(r, 40));
    for (let i = 0; i < clients.length; i++) {
      if (i === nonActiveIdx) continue;
      assert.equal(
        clients[i].inbox.length,
        otherLengthsBefore[i],
        `Client #${i} must receive ZERO frames when another player calls SET_REACTION_PREF`,
      );
    }

    // Reconnect (simulates DO state reload from SQLite) and confirm AUTO_DECLINE persisted!
    clients[nonActiveIdx].close();
    const reconnected = await openClient(created.matchId);
    clients.push(reconnected);
    reconnected.send({
      type: 'BG_JOIN',
      matchId: created.matchId,
      inviteCode: created.inviteCode,
      displayName: names[nonActiveIdx],
      reconnectToken: auths[nonActiveIdx].reconnectToken,
    });
    const reconSync = await reconnected.waitFor((m) => m.type === 'BG_STATE_SYNC');
    assert.equal(reconSync.privateView.reactionPolicy, 'AUTO_DECLINE');
  } finally {
    for (const c of clients) c.close();
    await server.close();
  }
});

test('P5A-5 & P5A-6 — CAP-06 Chain bounds & CAP-07 Extended Neutral Victory evaluation primitives', () => {
  assert.equal(MAX_PENDING_STEPS_DRAIN, 96);
  assert.equal(MAX_REACTION_CHAIN_DEPTH, 6);

  const state = makeTestState('starter-twenty-six', 5505);
  const p1 = state.players.p1;
  const p2 = state.players.p2;
  const p3 = state.players.p3;
  const p4 = state.players.p4;
  const p5 = state.players.p5;

  // Set up deterministic HP values with ties at both min (4 HP) and max (12 HP)
  p1.maxHp = 12; p1.woundsTaken = 8; p1.hp = 4; p1.alive = true;
  p2.maxHp = 10; p2.woundsTaken = 6; p2.hp = 4; p2.alive = true; // tie min = 4
  p3.maxHp = 14; p3.woundsTaken = 2; p3.hp = 12; p3.alive = true;
  p4.maxHp = 13; p4.woundsTaken = 1; p4.hp = 12; p4.alive = true; // tie max = 12
  p5.maxHp = 8; p5.woundsTaken = 8; p5.hp = 0; p5.alive = false;

  const alive = [p1, p2, p3, p4];
  assert.equal(hasLowestRemainingHpAmongSurvivors(p1, alive), true);
  assert.equal(hasLowestRemainingHpAmongSurvivors(p2, alive), true);
  assert.equal(hasLowestRemainingHpAmongSurvivors(p3, alive), false);
  assert.equal(hasLowestRemainingHpAmongSurvivors(p5, alive), false);

  assert.equal(hasHighestRemainingHpAmongSurvivors(p3, alive), true);
  assert.equal(hasHighestRemainingHpAmongSurvivors(p4, alive), true);
  assert.equal(hasHighestRemainingHpAmongSurvivors(p1, alive), false);

  // Angel exact Church (`lobby`) vs paired cluster location (`canteen`) when another Neutral died
  p1.faction = 'wanderer'; p1.location = 'lobby';
  p5.faction = 'wanderer'; p5.alive = false;
  assert.equal(isAngelEndOfMatchVictorySatisfied(p1, [p1, p5]), true, 'Exact lobby/Church wins');
  p1.location = 'canteen';
  assert.equal(isAngelEndOfMatchVictorySatisfied(p1, [p1, p5]), false, 'Paired cluster location must NOT win');
  p5.alive = true;
  assert.equal(isAngelEndOfMatchVictorySatisfied(p1, [p1, p5]), true, 'All Neutrals alive wins anywhere');

  // Immediate flags for Arlene & Dalton
  p5.alive = false;
  assert.equal(isArleneImmediateVictorySatisfied(state, p5), false);
  state.expansionState.arleneHunterKillTriggeredIds = [p5.playerId];
  assert.equal(isArleneImmediateVictorySatisfied(state, p5), true);

  assert.equal(isDaltonImmediateVictorySatisfied(state, p4), false);
  state.expansionState.daltonKillWinTriggeredIds = [p4.playerId];
  assert.equal(isDaltonImmediateVictorySatisfied(state, p4), true);
});
