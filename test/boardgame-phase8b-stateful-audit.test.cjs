'use strict';

/**
 * test/boardgame-phase8b-stateful-audit.test.cjs
 *
 * Phase 8B — Deep Gameplay Logic Audit, Formal Invariants,
 * Minimal Regression Reproductions for BUG-8B-01..BUG-8B-09 (including real SQLite DO tests),
 * and Reproducible Stateful + Targeted + Adversarial + Deterministic Replay Fuzzing.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
require('./register-ts.cjs');

const { WebSocket } = require('./ws-shim/mini-ws');
const { startStandaloneBoardGameTestServer } = require('./ws-shim/boardgame-do-harness.cjs');
const { resolveProductionBetaConfigFromEnv } = require('../shared/contracts/boardgame.ts');
const domain = require('../features/boardgame/domain/index.ts');
const {
  captureInitialIdentitySnapshot,
  checkGameStateInvariants,
} = require('./helpers/boardgame-invariants.cjs');
const {
  TARGETED_HIGH_INTERACTION_ROSTERS,
  runValidFuzzMatch,
  runAdversarialFuzzMatch,
  replayTraceAndCheck,
} = require('../scripts/fuzz-boardgame-stateful.cjs');

const PROD_BETA_ALL = resolveProductionBetaConfigFromEnv({
  ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
  BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeState(specs, opts = {}) {
  const players = {};
  const turnOrder = [];
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    const design = domain.getRoleDesign(s.roleId);
    const maxHp = s.maxHp ?? design.maxHp;
    const wounds = s.woundsTaken ?? (s.alive === false ? maxHp : 0);
    const hp = s.alive === false ? 0 : Math.max(0, maxHp - wounds);
    players[s.id] = {
      playerId: s.id,
      displayName: s.name ?? s.id,
      seatIndex: i,
      roleId: s.roleId,
      faction: s.faction ?? design.faction,
      hp,
      maxHp,
      woundsTaken: wounds,
      location: s.location ?? 'lobby',
      hand: [...(s.hand ?? [])],
      equipped: [...(s.equipped ?? [])],
      revealed: Boolean(s.revealed),
      alive: s.alive !== false,
      connected: s.connected !== false,
      skillCooldown: 0,
      skillUsedOnce: Boolean(s.skillUsedOnce),
      guardianShieldActive: Boolean(s.guardianShieldActive),
      attacksMade: 0,
      attacksThisTurn: s.attacksThisTurn ?? 0,
      lastAttackTargetId: s.lastAttackTargetId ?? null,
      investigationsCount: 0,
      consecutiveSameZoneRolls: 0,
      eliminatedRound: s.alive === false ? 1 : null,
      eliminatedByPlayerId: null,
      protegePlayerId: null,
      avengedProtegeKiller: false,
      charlesKillWon: false,
      investigatedTargetIds: [],
      privateClues: [],
      appearance: {
        gender: s.appearanceGender ?? 'male',
        outfit: 'hust-jacket',
        hairColor: '#111111',
      },
    };
    turnOrder.push(s.id);
  }
  const state = {
    rulesetVersion: 4,
    rulesetId: opts.rulesetId ?? 'full-expansion',
    matchId: opts.matchId ?? 'p8b-match',
    seed: opts.seed ?? 88081,
    rngState: opts.rngState ?? 88081,
    round: opts.round ?? 2,
    maxRounds: 14,
    turnNumber: opts.turnNumber ?? 6,
    turnPhase: opts.turnPhase ?? 'MAIN_ACTION',
    activePlayerId: opts.activePlayerId ?? turnOrder[0],
    turnOrder,
    clusterPairs: opts.clusterPairs ?? [
      { clusterId: 'north', locationIds: ['radio', 'breaker'] },
      { clusterId: 'central', locationIds: ['lobby', 'canteen'] },
      { clusterId: 'south', locationIds: ['corridor', 'court'] },
    ],
    firstDeadPlayerId: opts.firstDeadPlayerId ?? null,
    extraTurnPending: false,
    players,
    decks: {
      investigation: [...(opts.invDeck ?? ['inv-05', 'inv-04'])],
      equipment: [...(opts.eqDeck ?? ['eq-07', 'eq-01', 'eq-02', 'eq-03'])],
      event: [...(opts.evDeck ?? ['ev-02', 'ev-07'])],
    },
    discards: {
      investigation: [...(opts.invDiscard ?? [])],
      equipment: [...(opts.eqDiscard ?? [])],
      event: [...(opts.evDiscard ?? [])],
    },
    lastDiceRoll: null,
    lastInvestigation: null,
    lastRevealEvent: null,
    publicLog: [],
    highlights: [],
    finished: false,
    winnerFaction: null,
    winnerLabel: null,
    winnerPlayerIds: [],
    winReason: null,
    finalReveal: null,
  };
  const exp = domain.ensureExpansionState(state);
  exp.originallyDealtNeutralIds =
    opts.originallyDealtNeutralIds ??
    specs
      .filter((s) => (s.faction ?? domain.getRoleDesign(s.roleId).faction) === 'wanderer')
      .map((s) => s.id);
  return state;
}

async function openBgClient(wsBaseUrl, matchId) {
  const ws = new WebSocket(`${wsBaseUrl}/ws/boardgame?matchId=${encodeURIComponent(matchId)}`);
  const inbox = [];
  const waiters = [];
  let latestSync = null;

  ws.on('message', (raw) => {
    const rawStr = String(raw);
    const msg = JSON.parse(rawStr);
    msg.__raw = rawStr;
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
    nextMsg(pred, timeoutMs = 4500, fromIndex = 0) {
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
        ws.close(1000, 'test-done');
      } catch {
        // ignore
      }
    },
  };
}

// ===========================================================================
// 1. Formal Game State Invariant Verifier Self-Test
// ===========================================================================

test('8B.INV: checkGameStateInvariants accepts valid initial states and flags corrupted states', () => {
  const state = domain.createInitialGameState({
    matchId: 'inv-self-test',
    seed: 80001,
    nowMs: 1_795_000_000_000,
    rulesetId: 'full-expansion',
    productionBeta: PROD_BETA_ALL,
    players: Array.from({ length: 6 }, (_, i) => ({
      playerId: `p${i + 1}`,
      displayName: `SV${i + 1}`,
      seatIndex: i,
      connected: true,
    })),
  });
  const initId = captureInitialIdentitySnapshot(state);
  const okRes = checkGameStateInvariants(state, { initialIdentity: initId, checkSerialization: true });
  assert.equal(okRes.ok, true, `Fresh state must pass invariants: ${JSON.stringify(okRes.violations)}`);

  // Synthetic corruption: duplicate card + HP/wounds mismatch
  state.players.p1.woundsTaken += 2;
  state.decks.equipment.push('eq-01');
  const badRes = checkGameStateInvariants(state, { initialIdentity: initId });
  assert.equal(badRes.ok, false);
  assert.ok(badRes.violations.some((v) => v.code === 'HP_WOUNDS_SUM_MISMATCH'));
  assert.ok(badRes.violations.some((v) => v.code === 'CARD_TOTAL_CONSERVATION'));
});

// ===========================================================================
// 2. BUG-8B-09 (P0): Father Harrison ROLL_DICE deadlock & rejected-action state mutation
// ===========================================================================

test('BUG-8B-09 (P0): Revealed Father Harrison outside Church can ROLL_DICE cleanly without Sunday Service hijacking ON_MOVE', () => {
  const state = makeState(
    [
      { id: 'fh', roleId: 'exp2_father_harrison', location: 'court', revealed: true },
      { id: 'voodoo', roleId: 'exp1_voodoo', location: 'canteen', revealed: true },
      { id: 'h2', roleId: 'gac-den', location: 'radio', revealed: false },
      { id: 's2', roleId: 'suong-gac-cong', location: 'breaker', revealed: false },
    ],
    { turnPhase: 'ROLL_MOVE', activePlayerId: 'fh', turnNumber: 4 },
  );

  // Case A: Revealed Father Harrison voluntarily chooses ROLL_DICE instead of USE_SKILL (Sunday Service)
  const res = domain.applyPlayerGameAction(state, 'fh', { type: 'ROLL_DICE' }, 1_795_001_000_000);
  assert.equal(res.ok, true, `Father Harrison ROLL_DICE must succeed, got: ${res.error}`);
  assert.ok(
    state.turnPhase === 'LOCATION_ACTION' || state.turnPhase === 'CHOOSE_MOVE',
    `Expected move phase transition, got ${state.turnPhase}`,
  );
  assert.ok(state.lastDiceRoll !== null, 'ROLL_DICE must record dice roll rather than silently teleporting via Sunday Service');

  // Case B: Voodoo hijacks revealed Father Harrison (outside Church) — Voodoo cannot USE_SKILL, MUST be able to ROLL_DICE!
  const state2 = makeState(
    [
      { id: 'fh', roleId: 'exp2_father_harrison', location: 'court', revealed: true },
      { id: 'voodoo', roleId: 'exp1_voodoo', location: 'canteen', revealed: true },
      { id: 'h2', roleId: 'gac-den', location: 'radio', revealed: false },
      { id: 's2', roleId: 'suong-gac-cong', location: 'breaker', revealed: false },
    ],
    { turnPhase: 'ROLL_MOVE', activePlayerId: 'fh', turnNumber: 5 },
  );
  const exp2 = domain.ensureExpansionState(state2);
  exp2.activeTurnControl = {
    controlGrantId: 'vcg-fh-1',
    controllerPlayerId: 'voodoo',
    activePlayerId: 'fh',
    actingPawnPlayerId: 'fh',
    privateInformationOwnerId: 'fh',
    activeOnTurnNumber: 5,
    status: 'ACTIVE',
    createdAtMs: 1_795_001_000_000,
    publicDrawnCardIds: [],
  };
  const voodooRoll = domain.applyPlayerGameAction(state2, 'voodoo', { type: 'ROLL_DICE' }, 1_795_001_001_000);
  assert.equal(voodooRoll.ok, true, `Voodoo controlling Father Harrison must be able to ROLL_DICE without deadlock: ${voodooRoll.error}`);

  // Case C: Explicit USE_SKILL for Sunday Service STILL teleports Father Harrison to Church (lobby)
  const state3 = makeState(
    [
      { id: 'fh', roleId: 'exp2_father_harrison', location: 'court', revealed: true },
      { id: 'voodoo', roleId: 'exp1_voodoo', location: 'canteen', revealed: true },
      { id: 'h2', roleId: 'gac-den', location: 'radio', revealed: false },
      { id: 's2', roleId: 'suong-gac-cong', location: 'breaker', revealed: false },
    ],
    { turnPhase: 'ROLL_MOVE', activePlayerId: 'fh', turnNumber: 6 },
  );
  const sundayRes = domain.applyPlayerGameAction(state3, 'fh', { type: 'USE_SKILL' }, 1_795_001_002_000);
  assert.equal(sundayRes.ok, true);
  assert.equal(state3.players.fh.location, 'lobby');
  assert.equal(state3.turnPhase, 'LOCATION_ACTION');
});

// ===========================================================================
// 3. BUG-8B-01 (P0): Voodoo Privacy / Authorization Oracle on Advent / Chocolate / Diabolic Ritual
// ===========================================================================

test('BUG-8B-01 (P0): Voodoo cannot force-reveal or probe hidden victim via eq_advent, eq_chocolate, or ev_diabolic_ritual', () => {
  const cases = [
    { cardId: 'eq-13', roleId: 'gac-den', label: 'Advent on hidden Hunter' },
    { cardId: 'eq-14', roleId: 'lang-quan-sat', label: 'Chocolate on hidden Allie' },
    { cardId: 'ev-13', roleId: 'suong-gac-cong', label: 'Diabolic Ritual on hidden Shadow' },
  ];

  for (const tc of cases) {
    const state = makeState(
      [
        { id: 'victim', roleId: tc.roleId, location: 'lobby', revealed: false, woundsTaken: 4, hand: [tc.cardId] },
        { id: 'voodoo', roleId: 'exp1_voodoo', location: 'canteen', revealed: true },
        { id: 'p3', roleId: 'gac-ky-thuat', location: 'radio', revealed: false },
        { id: 'p4', roleId: 'suong-luu-lac', location: 'breaker', revealed: false },
      ],
      { turnPhase: 'LOCATION_ACTION', activePlayerId: 'victim', turnNumber: 7 },
    );
    const exp = domain.ensureExpansionState(state);
    exp.activeTurnControl = {
      controlGrantId: `vcg-${tc.cardId}`,
      controllerPlayerId: 'voodoo',
      activePlayerId: 'victim',
      actingPawnPlayerId: 'victim',
      privateInformationOwnerId: 'victim',
      activeOnTurnNumber: 7,
      status: 'ACTIVE',
      createdAtMs: 1_795_002_000_000,
      publicDrawnCardIds: [tc.cardId],
    };

    const res = domain.applyPlayerGameAction(
      state,
      'voodoo',
      { type: 'USE_CARD', cardId: tc.cardId, skipEffect: false },
      1_795_002_001_000,
    );
    assert.equal(res.ok, true, `${tc.label}: card resolution must succeed without deadlocking hand`);
    assert.equal(state.players.victim.revealed, false, `${tc.label}: Voodoo MUST NOT force-reveal hidden victim!`);
    assert.equal(state.players.victim.woundsTaken, 4, `${tc.label}: Voodoo MUST NOT trigger hidden-faction reveal heal oracle!`);
    assert.equal(state.players.victim.hand.length, 0, `${tc.label}: card must be cleanly discarded`);
  }
});

// ===========================================================================
// 4. BUG-8B-02 (P0) & BUG-8B-03 (P1): Real SQLite DO Reconnect / PendingChoice Alarm Integrity
// ===========================================================================

test('BUG-8B-02 (P0): Reconnecting (F5) during pendingChoice with turnTimeoutMs=0 MUST NOT clear choice alarm deadline', async () => {
  const srv = await startStandaloneBoardGameTestServer(0, {
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
    ALLOW_SHORT_TURN_TIMEOUT: '1',
  });

  try {
    const createRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: 'table-1',
        rulesetId: 'full-expansion',
        turnTimeoutMs: 0, // Production default!
      }),
    });
    const created = await createRes.json();
    assert.equal(created.ok, true);
    const { matchId, inviteCode } = created;

    const clients = [];
    const tokens = {};
    for (let i = 0; i < 4; i++) {
      const c = await openBgClient(srv.wsBaseUrl, matchId);
      clients.push(c);
      c.send({
        type: 'BG_JOIN',
        matchId,
        inviteCode,
        displayName: `P${i + 1}`,
        playerKey: `bgk_8b02_${i}_abcdef`,
      });
      const auth = await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
      tokens[auth.playerId] = { token: auth.reconnectToken, seatIndex: i, clientIdx: i };
    }
    for (let i = 1; i < clients.length; i++) {
      clients[i].send({ type: 'BG_SET_READY', ready: true, requestId: `rdy-02-${i}` });
    }
    await sleep(60);
    clients[0].send({ type: 'BG_START_MATCH', requestId: 'start-02' });
    await clients[0].nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING');

    // Inject an active pendingChoice owned by the active player into SQLite & schedule alarm
    const container = srv.containers.get(matchId);
    const sql = container.ctx.storage.sql;
    const matchRow = sql.exec('SELECT game_state_json FROM matches WHERE match_id = ?', matchId).one();
    const parsed = JSON.parse(matchRow.game_state_json);
    const activeId = parsed.engineState.activePlayerId;
    const nowMs = Date.now();
    const choiceDeadline = nowMs + 650;
    parsed.engineState.pendingChoice = {
      choiceId: 'choice-test-reconnect-1',
      eventId: 'evt-test-reconnect-1',
      ownerPlayerId: activeId,
      kind: 'bipolar_fate_coin',
      isSecret: false,
      title: 'Test Choice',
      description: 'Test pendingChoice reconnect alarm survival',
      publicPromptLabel: 'Waiting...',
      options: [
        { optionId: 'decline', label: 'Skip', detail: 'Skip' },
      ],
      defaultOptionId: 'decline',
      createdAtMs: nowMs,
      deadlineMs: choiceDeadline,
      data: { kind: 'bipolar_fate_coin', bipolarPlayerId: activeId },
    };
    sql.exec(
      'UPDATE matches SET turn_deadline_ms = ?, game_state_json = ? WHERE match_id = ?',
      choiceDeadline,
      JSON.stringify(parsed),
      matchId,
    );
    await container.ctx.storage.setAlarm(choiceDeadline);

    // Owner hits F5 (reconnects with same reconnectToken while turn_timeout_ms === 0)
    const ownerInfo = tokens[activeId];
    const reconn = await openBgClient(srv.wsBaseUrl, matchId);
    reconn.send({
      type: 'BG_JOIN',
      matchId,
      inviteCode,
      displayName: `P${ownerInfo.seatIndex + 1}`,
      reconnectToken: ownerInfo.token,
    });
    await reconn.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    await reconn.nextMsg((m) => m.type === 'BG_STATE_SYNC');

    const postRow = sql.exec('SELECT turn_deadline_ms FROM matches WHERE match_id = ?', matchId).one();
    assert.ok(
      typeof postRow.turn_deadline_ms === 'number' && postRow.turn_deadline_ms > 0,
      `BUG-8B-02: turn_deadline_ms MUST NOT be wiped to NULL when pendingChoice is active! Got: ${postRow.turn_deadline_ms}`,
    );
    assert.ok(
      typeof container.alarmAtMs === 'number' && container.alarmAtMs > 0,
      `BUG-8B-02: DO storage alarm MUST remain scheduled after owner F5 reconnect! Got: ${container.alarmAtMs}`,
    );

    // Wait past deadline & fire the scheduled DO alarm to verify automatic resolution
    await sleep(700);
    await container.triggerAlarm();
    const afterAlarm = sql.exec('SELECT game_state_json FROM matches WHERE match_id = ?', matchId).one();
    const afterParsed = JSON.parse(afterAlarm.game_state_json);
    assert.equal(
      afterParsed.engineState.pendingChoice ?? null,
      null,
      'PendingChoice MUST auto-resolve via alarm even after owner F5 reconnect!',
    );

    reconn.close();
    for (const c of clients) c.close();
  } finally {
    await srv.close();
  }
});

test('BUG-8B-03 (P1): Resolving a pendingChoice within the same turn refreshes turn_deadline_ms instead of keeping stale choice deadline', async () => {
  const srv = await startStandaloneBoardGameTestServer(0, {
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
    ALLOW_SHORT_TURN_TIMEOUT: '1',
  });

  try {
    const createRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: 'table-2',
        rulesetId: 'full-expansion',
        turnTimeoutMs: 20_000,
      }),
    });
    const created = await createRes.json();
    assert.equal(created.ok, true);
    const { matchId, inviteCode } = created;

    const clients = [];
    const byPlayerId = {};
    for (let i = 0; i < 4; i++) {
      const c = await openBgClient(srv.wsBaseUrl, matchId);
      clients.push(c);
      c.send({
        type: 'BG_JOIN',
        matchId,
        inviteCode,
        displayName: `Q${i + 1}`,
        playerKey: `bgk_8b03_${i}_abcdef`,
      });
      const auth = await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
      byPlayerId[auth.playerId] = c;
    }
    for (let i = 1; i < clients.length; i++) {
      clients[i].send({ type: 'BG_SET_READY', ready: true, requestId: `rdy-03-${i}` });
    }
    await sleep(60);
    clients[0].send({ type: 'BG_START_MATCH', requestId: 'start-03' });
    await clients[0].nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING');

    const container = srv.containers.get(matchId);
    const sql = container.ctx.storage.sql;
    const matchRow = sql.exec('SELECT game_state_json FROM matches WHERE match_id = ?', matchId).one();
    const parsed = JSON.parse(matchRow.game_state_json);
    const activeId = parsed.engineState.activePlayerId;
    const nowMs = Date.now();
    // Simulate a choice whose deadline was only 400ms from now (e.g. shortened or near expiry)
    const shortChoiceDeadline = nowMs + 400;
    parsed.engineState.turnPhase = 'ROLL_MOVE';
    parsed.engineState.players[activeId].roleId = 'exp1_bipolar';
    parsed.engineState.players[activeId].revealed = true;
    parsed.engineState.pendingChoice = {
      choiceId: 'choice-bipolar-stale-dl',
      eventId: 'evt-bipolar-stale-dl',
      ownerPlayerId: activeId,
      kind: 'bipolar_fate_coin',
      isSecret: false,
      title: 'Đồng Xu Định Mệnh',
      description: 'Test stale deadline',
      publicPromptLabel: 'Waiting...',
      options: [{ optionId: 'decline', label: 'Bỏ qua', detail: 'Skip' }],
      defaultOptionId: 'decline',
      createdAtMs: nowMs - 14_000,
      deadlineMs: shortChoiceDeadline,
      data: { kind: 'bipolar_fate_coin', bipolarPlayerId: activeId },
    };
    sql.exec(
      'UPDATE matches SET turn_deadline_ms = ?, game_state_json = ? WHERE match_id = ?',
      shortChoiceDeadline,
      JSON.stringify(parsed),
      matchId,
    );

    const activeClient = byPlayerId[activeId];
    activeClient.send({
      type: 'BG_GAME_ACTION',
      requestId: 'req-resolve-bipolar-1',
      expectedRevision: activeClient.getLatestSync().revision,
      action: { type: 'RESOLVE_CHOICE', choiceId: 'choice-bipolar-stale-dl', optionId: 'decline' },
    });
    const ack = await activeClient.nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'req-resolve-bipolar-1',
    );
    assert.equal(ack.ok, true);

    const postRow = sql.exec('SELECT turn_deadline_ms FROM matches WHERE match_id = ?', matchId).one();
    assert.ok(
      typeof postRow.turn_deadline_ms === 'number' && postRow.turn_deadline_ms >= Date.now() + 10_000,
      `BUG-8B-03: After pendingChoice resolves in same turn, turn_deadline_ms must refresh to ~20s, got delta=${postRow.turn_deadline_ms - Date.now()}ms`,
    );

    for (const c of clients) c.close();
  } finally {
    await srv.close();
  }
});

// ===========================================================================
// 5. BUG-8B-04 (P1): Double Turn Advance in applyTimeoutAutoTurn
// ===========================================================================

test('BUG-8B-04 (P1): applyTimeoutAutoTurn does NOT skip the next player turn when expiring pendingChoice already advanced the turn', () => {
  const state = makeState(
    [
      { id: 'atk', roleId: 'gac-den', location: 'lobby', revealed: true },
      { id: 'lloyd', roleId: 'exp1_lloyd', location: 'court', revealed: true },
      { id: 'victim', roleId: 'suong-gac-cong', location: 'lobby', revealed: false },
      { id: 'p4', roleId: 'lang-quan-sat', location: 'radio', revealed: false },
    ],
    { turnPhase: 'MAIN_ACTION', activePlayerId: 'atk', turnNumber: 10 },
  );

  // atk attacks victim -> Lloyd GlobalAttackInterrupt pendingChoice opens!
  const atkRes = domain.applyPlayerGameAction(
    state,
    'atk',
    { type: 'ATTACK', targetPlayerId: 'victim' },
    1_795_003_000_000,
  );
  assert.equal(atkRes.ok, true);
  assert.equal(state.pendingChoice?.kind, 'lloyd_interrupt_attack');

  // Force applyTimeoutAutoTurn while Lloyd's pendingChoice is open:
  // Expiring Lloyd's choice completes atk's attack and advances turn from 10 -> 11 (lloyd's turn).
  // applyTimeoutAutoTurn MUST STOP at turn 11 and NOT auto-skip lloyd's brand new turn to turn 12!
  domain.applyTimeoutAutoTurn(state, 1_795_003_030_000);
  assert.equal(
    state.turnNumber,
    11,
    `Expected turn to advance exactly once (10 -> 11), got turnNumber=${state.turnNumber}`,
  );
  assert.equal(state.activePlayerId, 'lloyd', 'Next player (lloyd) must receive their turn cleanly');
  assert.equal(state.turnPhase, 'ROLL_MOVE', 'Next player must start at ROLL_MOVE');
});

// ===========================================================================
// 6. BUG-8B-05 (P1): Undead Pre-Lethal Reveal Blocked on ev_diabolic_ritual
// ===========================================================================

test('BUG-8B-05 (P1): Unrevealed Undead CANNOT bypass pre-lethal reveal restriction via ev-13 Diabolic Ritual', () => {
  const state = makeState(
    [
      { id: 'undead', roleId: 'exp1_undead', location: 'lobby', revealed: false, woundsTaken: 5, hand: ['ev-13'] },
      { id: 'p2', roleId: 'gac-den', location: 'canteen', revealed: false },
      { id: 'p3', roleId: 'gac-ky-thuat', location: 'radio', revealed: false },
      { id: 'p4', roleId: 'suong-gac-cong', location: 'breaker', revealed: false },
    ],
    { turnPhase: 'LOCATION_ACTION', activePlayerId: 'undead', turnNumber: 8 },
  );

  const res = domain.applyPlayerGameAction(
    state,
    'undead',
    { type: 'USE_CARD', cardId: 'ev-13', skipEffect: false },
    1_795_004_000_000,
  );
  assert.equal(res.ok, true);
  assert.equal(state.players.undead.revealed, false, 'Undead MUST stay hidden before first lethal event even on ev-13!');
  assert.equal(state.players.undead.woundsTaken, 5, 'Undead MUST NOT heal via Diabolic Ritual before reveal');
});

// ===========================================================================
// 7. BUG-8B-06 (P1): DynamicAllegiance Consistency after Bonnie Converts to Shadow
// ===========================================================================

test('BUG-8B-06 (P1): Bonnie converted to Shadow gets Shadow faction on reveal, is NOT bound by Cassie/Diana, is NOT in Angel aura projection, and CAN use ev-13', () => {
  const state = makeState(
    [
      { id: 'bonnie', roleId: 'exp2_bonnie', location: 'lobby', revealed: false, woundsTaken: 3, equipped: ['ev-03'] },
      { id: 'shadow', roleId: 'suong-gac-cong', location: 'lobby', revealed: true, woundsTaken: 13 }, // 1 HP left
      { id: 'cassie', roleId: 'exp1_cassie', location: 'canteen', revealed: false },
      { id: 'diana', roleId: 'exp2_diana', location: 'radio', revealed: false },
      { id: 'angel', roleId: 'exp1_angel', location: 'breaker', revealed: true },
      { id: 'hunter', roleId: 'gac-den', location: 'court', revealed: true },
    ],
    { turnPhase: 'MAIN_ACTION', activePlayerId: 'bonnie', turnNumber: 9 },
  );
  const exp = domain.ensureExpansionState(state);
  exp.angelAuras = {
    angel: { phase: 'active', armedOnTurnNumber: 3, activatedOnTurnNumber: 6 },
  };
  // Give Bonnie guaranteed lethal damage via ev-07 Vampire Bat (2 ST) on 1-HP shadow
  state.players.bonnie.hand = ['ev-07'];
  const killRes = domain.applyPlayerGameAction(
    state,
    'bonnie',
    { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'shadow' },
    1_795_005_000_000,
  );
  assert.equal(killRes.ok, true);
  assert.equal(domain.getEffectiveFaction(state, state.players.bonnie), 'mist-order');
  assert.equal(state.players.bonnie.revealed, true);

  // 1) Authoritative revealHistory & lastRevealEvent must record effective faction 'mist-order'
  const bonnieRev = exp.revealHistory?.find((r) => r.revealedPlayerId === 'bonnie');
  assert.equal(bonnieRev?.factionAtReveal, 'mist-order', 'revealHistory must record effective faction mist-order');
  assert.equal(state.lastRevealEvent?.faction, 'mist-order', 'lastRevealEvent must record effective faction mist-order');

  // 2) Cassie & Diana MUST NOT bind to Shadow-converted Bonnie as a Neutral!
  assert.equal(exp.cassieCopiedGoalByPlayer?.cassie ?? null, null, 'Cassie must NOT copy Shadow-converted Bonnie as Neutral');
  assert.equal(exp.dianaContracts?.diana ?? null, null, 'Diana must NOT bind Shadow-converted Bonnie as Neutral customer');

  // 3) Public projection angelProtectedPlayerIds MUST NOT include Shadow-converted Bonnie!
  const pub = domain.getPublicGameView(state);
  assert.equal(
    (pub.angelProtectedPlayerIds ?? []).includes('bonnie'),
    false,
    'angelProtectedPlayerIds must NOT falsely mark Shadow-converted Bonnie',
  );

  // 4) Bonnie (now effective Shadow) CAN activate ev-13 Diabolic Ritual!
  state.players.bonnie.woundsTaken = 4;
  state.players.bonnie.hp = state.players.bonnie.maxHp - 4;
  state.players.bonnie.hand = ['ev-13'];
  const ritRes = domain.applyPlayerGameAction(
    state,
    'bonnie',
    { type: 'USE_CARD', cardId: 'ev-13', skipEffect: false },
    1_795_005_002_000,
  );
  assert.equal(ritRes.ok, true);
  assert.equal(state.players.bonnie.woundsTaken, 0, 'Shadow-converted Bonnie must heal via ev-13 Diabolic Ritual');
});

// ===========================================================================
// 8. BUG-8B-07 (P1): DynamicSkillCopy works across Anathema, Arnold, Usurper, Angel, Visions, Bianca, Fujiko, Bob
// ===========================================================================

test('BUG-8B-07 (P1): Vengeful Spirit / Antimony copied skills execute through Anathema, Arnold, Usurper, Angel, Visions, Fujiko', () => {
  // Subtest A: Vengeful Spirit copies Usurper -> blocks healing & updates public usurperAuraActive
  const sUsurper = makeState(
    [
      { id: 'vs', roleId: 'exp1_vengeful_spirit', location: 'lobby', revealed: true },
      { id: 'deadU', roleId: 'exp2_usurper', location: 'canteen', revealed: true, alive: false },
      { id: 'healer', roleId: 'gac-den', location: 'lobby', revealed: true, woundsTaken: 4, hand: ['eq-11'] },
      { id: 'p4', roleId: 'gac-ky-thuat', location: 'radio', revealed: false },
    ],
    { turnPhase: 'LOCATION_ACTION', activePlayerId: 'healer', turnNumber: 12 },
  );
  domain.bindCopiedSkillFromElimination(
    sUsurper,
    sUsurper.players.vs,
    sUsurper.players.deadU,
    'copy-usurper-1',
    1_795_006_000_000,
  );
  const pubU = domain.getPublicGameView(sUsurper);
  assert.equal(pubU.usurperAuraActive, true, 'Public view must show usurperAuraActive for revealed copier of Usurper');
  const healRes = domain.applyPlayerGameAction(
    sUsurper,
    'healer',
    { type: 'USE_CARD', cardId: 'eq-11', targetPlayerId: 'healer' },
    1_795_006_001_000,
  );
  assert.equal(healRes.ok, true);
  assert.equal(sUsurper.players.healer.woundsTaken, 4, 'Copied Usurper must block First Aid heal!');

  // Subtest B: Antimony copies Anathema -> redirects incoming damage & pays 1 HP end-turn cost
  const sAnathema = makeState(
    [
      { id: 'ant', roleId: 'exp1_antimony', location: 'lobby', revealed: true },
      { id: 'deadA', roleId: 'exp1_anathema', location: 'canteen', revealed: true, alive: false },
      { id: 'cursed', roleId: 'gac-den', location: 'lobby', revealed: true },
      { id: 'atk', roleId: 'suong-gac-cong', location: 'lobby', revealed: true, hand: ['ev-07'] },
    ],
    { turnPhase: 'ROLL_MOVE', activePlayerId: 'ant', turnNumber: 14 },
  );
  domain.bindCopiedSkillFromElimination(
    sAnathema,
    sAnathema.players.ant,
    sAnathema.players.deadA,
    'copy-anathema-1',
    1_795_006_010_000,
  );
  const curseRes = domain.applyPlayerGameAction(
    sAnathema,
    'ant',
    { type: 'USE_SKILL' },
    1_795_006_011_000,
  );
  assert.equal(curseRes.ok, true);
  assert.equal(sAnathema.pendingChoice?.kind, 'anathema_curse_target');
  const cursedOpt = sAnathema.pendingChoice.options.find((o) => o.targetPlayerId === 'cursed');
  assert.ok(cursedOpt, 'Anathema curse choice must include cursed player');
  const chooseCurseRes = domain.applyPlayerGameAction(
    sAnathema,
    'ant',
    { type: 'RESOLVE_CHOICE', choiceId: sAnathema.pendingChoice.choiceId, optionId: cursedOpt.optionId },
    1_795_006_011_500,
  );
  assert.equal(chooseCurseRes.ok, true);
  // Advance to MAIN_ACTION and end Antimony's turn -> must suffer 1 unpreventable self-damage from Anathema curse!
  sAnathema.turnPhase = 'MAIN_ACTION';
  const endRes = domain.applyPlayerGameAction(sAnathema, 'ant', { type: 'END_TURN' }, 1_795_006_012_000);
  assert.equal(endRes.ok, true);
  assert.equal(sAnathema.players.ant.woundsTaken, 1, 'Copied Anathema must apply 1 HP end-of-turn cost');
  // Now atk hits ant with ev-07 (2 dmg) -> must redirect to cursed!
  sAnathema.activePlayerId = 'atk';
  sAnathema.turnPhase = 'LOCATION_ACTION';
  const hitRes = domain.applyPlayerGameAction(
    sAnathema,
    'atk',
    { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'ant' },
    1_795_006_013_000,
  );
  assert.equal(hitRes.ok, true);
  assert.equal(sAnathema.players.ant.woundsTaken, 1, 'Copied Anathema must redirect incoming damage away from Antimony');
  assert.equal(sAnathema.players.cursed.woundsTaken, 2, 'Cursed target must receive redirected 2 damage');

  // Subtest C: Vengeful Spirit copies Arnold -> reflects lethal damage & consumes copied skillUsedOnce
  const sArnold = makeState(
    [
      { id: 'vs', roleId: 'exp1_vengeful_spirit', location: 'lobby', revealed: true, woundsTaken: 12 }, // 1 HP left
      { id: 'deadArn', roleId: 'exp1_arnold', location: 'canteen', revealed: true, alive: false },
      { id: 'atk', roleId: 'gac-den', location: 'lobby', revealed: true, hand: ['ev-07'] },
      { id: 'p4', roleId: 'suong-gac-cong', location: 'radio', revealed: false },
    ],
    { turnPhase: 'LOCATION_ACTION', activePlayerId: 'atk', turnNumber: 15 },
  );
  domain.bindCopiedSkillFromElimination(
    sArnold,
    sArnold.players.vs,
    sArnold.players.deadArn,
    'copy-arnold-1',
    1_795_006_020_000,
  );
  const lethalRes = domain.applyPlayerGameAction(
    sArnold,
    'atk',
    { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'vs' },
    1_795_006_021_000,
  );
  assert.equal(lethalRes.ok, true);
  assert.equal(sArnold.pendingChoice?.kind, 'arnold_reflect_lethal', 'Copied Arnold must trigger lethal reflection choice!');
  const reflectRes = domain.applyPlayerGameAction(
    sArnold,
    'vs',
    { type: 'RESOLVE_CHOICE', choiceId: sArnold.pendingChoice.choiceId, optionId: 'reflect' },
    1_795_006_022_000,
  );
  assert.equal(reflectRes.ok, true);
  assert.equal(sArnold.players.vs.hp, 1, 'Copied Arnold keeps 1 HP after reflecting lethal');
  assert.equal(
    sArnold.players.atk.woundsTaken,
    1,
    'Attacker takes reflected 2 damage from Arnold then heals 1 HP from Vampire Bat (net 1 wound)',
  );

  // Subtest D: Vengeful Spirit copies Visions -> turn-start mark tick deals 1 damage on natural turn advance
  const sVisions = makeState(
    [
      { id: 'p4', roleId: 'suong-gac-cong', location: 'breaker', revealed: false },
      { id: 'vs', roleId: 'exp1_vengeful_spirit', location: 'lobby', revealed: true },
      { id: 'deadV', roleId: 'exp2_visions', location: 'canteen', revealed: true, alive: false },
      { id: 'marked', roleId: 'gac-den', location: 'radio', revealed: true },
    ],
    { turnPhase: 'MAIN_ACTION', activePlayerId: 'p4', turnNumber: 17 },
  );
  domain.bindCopiedSkillFromElimination(
    sVisions,
    sVisions.players.vs,
    sVisions.players.deadV,
    'copy-visions-1',
    1_795_006_030_000,
  );
  domain.ensureExpansionState(sVisions).visionsMarks = {
    vs: { targetPlayerId: 'marked', markedOnTurnNumber: 14 },
  };
  const advRes = domain.applyPlayerGameAction(sVisions, 'p4', { type: 'END_TURN' }, 1_795_006_031_000);
  assert.equal(advRes.ok, true);
  assert.equal(sVisions.activePlayerId, 'vs');
  assert.equal(sVisions.players.marked.woundsTaken, 1, 'Copied Visions must deal 1 mark tick damage at turn start');
});

// ===========================================================================
// 9. BUG-8B-08 (P1): COPY_GOAL Dormant Guard, Event-Flag Victory & Antimony Own Link
// ===========================================================================

test('BUG-8B-08 (P1): COPY_GOAL respects Undead dormancy, tracks Cruz/Arlene/Dalton/Charles flags, and resolves Antimony own Bethany/Clairvoyant link', () => {
  // Subtest A: Cassie copied Allie (lang-quan-sat) MUST NOT win sole-survivor while another player (e.g. Antimony copying Undead) is DORMANT_PENDING_REVIVE!
  const sDormant = makeState(
    [
      { id: 'cassie', roleId: 'exp1_cassie', location: 'lobby', revealed: true },
      { id: 'allie', roleId: 'lang-quan-sat', location: 'canteen', revealed: true, alive: false },
      { id: 'dormantAnt', roleId: 'exp1_antimony', location: 'radio', revealed: true, alive: false },
      { id: 'h1', roleId: 'gac-den', location: 'breaker', revealed: true },
      { id: 's1', roleId: 'suong-gac-cong', location: 'court', revealed: true },
    ],
    { turnPhase: 'MAIN_ACTION', activePlayerId: 'cassie', turnNumber: 20 },
  );
  // Directly test evaluateDirectRoleGoalForSubject('lang-quan-sat', timing='immediate') with 1 alive + 1 dormant
  sDormant.players.h1.alive = false;
  sDormant.players.h1.hp = 0;
  sDormant.players.h1.woundsTaken = sDormant.players.h1.maxHp;
  sDormant.players.s1.alive = false;
  sDormant.players.s1.hp = 0;
  sDormant.players.s1.woundsTaken = sDormant.players.s1.maxHp;
  const expD = domain.ensureExpansionState(sDormant);
  expD.cassieCopiedGoalByPlayer = {
    cassie: {
      targetPlayerId: 'allie',
      sourceRoleId: 'lang-quan-sat',
      boundEventId: 'rev-allie',
      boundAtMs: 1_795_007_000_000,
      boundTurnNumber: 5,
    },
  };
  expD.lifecycleByPlayer = {
    allie: { lifecycleState: 'FINAL_ELIMINATED', resurrectionChargesUsed: 0, reviveHpTarget: 6 },
    h1: { lifecycleState: 'FINAL_ELIMINATED', resurrectionChargesUsed: 0, reviveHpTarget: 6 },
    s1: { lifecycleState: 'FINAL_ELIMINATED', resurrectionChargesUsed: 0, reviveHpTarget: 6 },
    dormantAnt: { lifecycleState: 'DORMANT_PENDING_REVIVE', resurrectionChargesUsed: 0, reviveHpTarget: 6 },
  };
  const wanderersD = [sDormant.players.cassie, sDormant.players.allie, sDormant.players.dormantAnt];
  assert.equal(
    domain.evaluateDirectRoleGoalForSubject(sDormant, sDormant.players.cassie, 'lang-quan-sat', null, wanderersD, 'immediate'),
    false,
    'COPY_GOAL Allie sole-survivor MUST return false while another player is DORMANT_PENDING_REVIVE!',
  );
  assert.equal(
    domain.evaluateDirectRoleGoalForSubject(sDormant, sDormant.players.cassie, 'exp1_anathema', null, wanderersD, 'immediate'),
    false,
    'COPY_GOAL Anathema sole-survivor MUST return false while another player is DORMANT_PENDING_REVIVE!',
  );
  // Also verify Angel end-of-match counts dormant Neutral as living-or-pending-revive (consistent with Bryon)
  assert.equal(
    domain.areAllNeutralsAlive([sDormant.players.cassie, sDormant.players.dormantAnt], sDormant),
    true,
    'areAllNeutralsAlive must treat DORMANT_PENDING_REVIVE Neutral as living-or-pending-revive',
  );

  // Subtest B: Cassie copied Arlene -> when Hunter kills Cassie, Cassie wins immediately!
  const sArlene = makeState(
    [
      { id: 'cassie', roleId: 'exp1_cassie', location: 'lobby', revealed: true, woundsTaken: 10 }, // 1 HP left
      { id: 'arlene', roleId: 'exp2_arlene', location: 'canteen', revealed: true },
      { id: 'hunter', roleId: 'gac-den', location: 'lobby', revealed: true, hand: ['ev-07'] },
      { id: 'shadow', roleId: 'suong-gac-cong', location: 'radio', revealed: true },
    ],
    { turnPhase: 'LOCATION_ACTION', activePlayerId: 'hunter', turnNumber: 12 },
  );
  domain.ensureExpansionState(sArlene).cassieCopiedGoalByPlayer = {
    cassie: {
      targetPlayerId: 'arlene',
      sourceRoleId: 'exp2_arlene',
      boundEventId: 'rev-arlene',
      boundAtMs: 1_795_007_010_000,
      boundTurnNumber: 4,
    },
  };
  const arlRes = domain.applyPlayerGameAction(
    sArlene,
    'hunter',
    { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: 'cassie' },
    1_795_007_011_000,
  );
  assert.equal(arlRes.ok, true);
  assert.equal(sArlene.finished, true, 'Cassie with COPY_GOAL(Arlene) killed by Hunter must win immediately!');
  assert.ok(sArlene.winnerPlayerIds.includes('cassie'));

  // Subtest C: Antimony copied unbound Bethany -> Antimony later chooses a Chosen -> Antimony wins when Chosen wins!
  const sAntBeth = makeState(
    [
      { id: 'ant', roleId: 'exp1_antimony', location: 'lobby', revealed: true },
      { id: 'deadBeth', roleId: 'exp1_bethany', location: 'canteen', revealed: true, alive: false },
      { id: 'h1', roleId: 'gac-den', location: 'radio', revealed: true },
      { id: 's1', roleId: 'suong-gac-cong', location: 'breaker', revealed: true, alive: false },
    ],
    { turnPhase: 'MAIN_ACTION', activePlayerId: 'h1', turnNumber: 16 },
  );
  const expAB = domain.ensureExpansionState(sAntBeth);
  expAB.antimonyCopiedGoalByPlayer = {
    ant: {
      targetPlayerId: 'deadBeth',
      sourceRoleId: 'exp1_bethany',
      boundEventId: 'ant-copy-beth',
      boundAtMs: 1_795_007_020_000,
      boundTurnNumber: 10,
    },
  };
  expAB.bethanyChosenByPlayer = {
    ant: {
      chosenPlayerId: 'h1',
      designatedOnTurnNumber: 12,
      boundEventId: 'ant-beth-chosen-h1',
      boundAtMs: 1_795_007_021_000,
    },
  };
  const evalAB = domain.evaluateExpandedVictoryWithDiagnostics(sAntBeth).evaluation;
  assert.equal(evalAB.finished, true);
  assert.ok(
    evalAB.winnerPlayerIds.includes('ant'),
    'Antimony who copied unbound Bethany and designated h1 must share h1 Hunter victory!',
  );
});

// ===========================================================================
// 10. Reproducible Stateful Fuzzing, Targeted High-Interaction Fuzzing,
//     Adversarial Input Fuzzing & Deterministic Replay Gate
// ===========================================================================

test('8B.FUZZ: Valid gameplay (40 matches), Targeted High-Interaction (16 matches), Adversarial (20 matches) & Deterministic Replay pass with 0 violations', () => {
  const rulesets = ['classic', 'expansion-1', 'expansion-2', 'full-expansion'];
  const samples = [];

  for (let i = 0; i < 40; i++) {
    const rulesetId = rulesets[i % rulesets.length];
    const playerCount = 4 + (i % 5);
    const seed = 88_100_000 + i * 97 + playerCount * 7;
    const res = runValidFuzzMatch(seed, rulesetId, playerCount, 380);
    assert.equal(
      res.ok,
      true,
      `Valid fuzz failed on ${rulesetId} ${playerCount}P seed=${seed}: ${JSON.stringify(res.violations)}`,
    );
    if (i < 12) samples.push(res);
  }

  for (let i = 0; i < 16; i++) {
    const roster = TARGETED_HIGH_INTERACTION_ROSTERS[i % TARGETED_HIGH_INTERACTION_ROSTERS.length];
    const seed = 77_100_000 + i * 73;
    const res = runValidFuzzMatch(seed, roster.rulesetId, roster.roles.length, 380, roster.roles);
    assert.equal(
      res.ok,
      true,
      `Targeted fuzz failed on ${roster.name} seed=${seed}: ${JSON.stringify(res.violations)}`,
    );
    if (i < 8) samples.push(res);
  }

  for (const s of samples) {
    const replay = replayTraceAndCheck(s.config, s.trace);
    assert.equal(replay.ok, true, `Replay invariant failed on seed=${s.seed}: ${JSON.stringify(replay.violations)}`);
    const crypto = require('node:crypto');
    const replayHash = crypto.createHash('sha256').update(JSON.stringify(replay.state)).digest('hex');
    assert.equal(replayHash, s.finalHash, `Replay state hash drifted on seed=${s.seed} (${s.rulesetId})`);
  }

  for (let i = 0; i < 20; i++) {
    const rulesetId = rulesets[i % rulesets.length];
    const playerCount = 4 + (i % 5);
    const seed = 99_100_000 + i * 131 + playerCount * 11;
    const res = runAdversarialFuzzMatch(seed, rulesetId, playerCount, 100);
    assert.equal(
      res.ok,
      true,
      `Adversarial fuzz failed on ${rulesetId} ${playerCount}P seed=${seed}: ${JSON.stringify(res.violations)}`,
    );
  }
});
