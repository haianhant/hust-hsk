'use strict';

/**
 * test/boardgame-phase8a1-ruleset-selector.test.cjs
 *
 * Phase 8A.1 — Pre-Match HUD Ruleset Selector UX Fix:
 *  - Part A: Unit & SSR Component Tests (12/12 criteria from Section 11)
 *  - Part B: Real Durable Object Integration Tests for 3D Seat-to-Match flow (13/13 criteria)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
require('./register-ts.cjs');

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { WebSocket } = require('./ws-shim/mini-ws');
const { startStandaloneBoardGameTestServer } = require('./ws-shim/boardgame-do-harness.cjs');

const contracts = require('../shared/contracts/boardgame.ts');
const domain = require('../features/boardgame/domain/index.ts');
const helpers = require('../features/boardgame/ui/ruleset-selector-helpers.ts');
const { BoardGameClient } = require('../features/boardgame/network/client.ts');
const BoardGameHUD = require('../features/boardgame/ui/BoardGameHUD.tsx').default;
const BoardGameLobby = require('../features/boardgame/ui/BoardGameLobby.tsx').default;

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

let ipCounter = 10;
function testHeaders() {
  ipCounter += 1;
  return {
    'Content-Type': 'application/json',
    Origin: 'https://hustverse.vercel.app',
    'X-Forwarded-For': `10.81.0.${(ipCounter % 240) + 1}`,
  };
}

const FULL_BETA_CAPABILITIES = domain.DEFAULT_RULESET_REGISTRY.getPublicServerCapabilities({
  productionBeta: contracts.resolveProductionBetaConfigFromEnv({
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
  }),
}).rulesets;

const CLASSIC_ONLY_CAPABILITIES =
  domain.DEFAULT_RULESET_REGISTRY.getPublicServerCapabilities().rulesets;

// ===========================================================================
// PART A — UNIT & COMPONENT TESTS (Section 11: 12/12)
// ===========================================================================

test('P8A1-U1..U7 — Default Classic, 4 server capabilities, Stable/Beta labels, Host vs Guest vs Spectator, Unavailable mode disabled', () => {
  // 1. Default Classic + 4 server capabilities + exact UI labels & counts
  const hostState = helpers.resolveRulesetSelectorState({
    rulesetId: 'classic',
    serverRulesets: FULL_BETA_CAPABILITIES,
    matchStatus: 'WAITING',
    isHost: true,
    isSpectator: false,
    hasSelectHandler: true,
  });
  assert.equal(hostState.activeRuleset.id, 'classic');
  assert.equal(hostState.effectiveRulesets.length, 4);
  assert.deepEqual(
    hostState.effectiveRulesets.map((r) => [
      r.id,
      helpers.formatRulesetDisplayLabel(r),
      r.expectedCharacterCount,
      helpers.formatRulesetReleaseBadge(r.status),
    ]),
    [
      ['classic', 'Classic', 10, 'Stable'],
      ['expansion-1', 'Expansion 1', 36, 'Beta'],
      ['expansion-2', 'Expansion 2', 40, 'Beta'],
      ['full-expansion', 'Full Expansion', 66, 'Beta'],
    ],
  );
  assert.equal(hostState.canOpenSelector, true, 'Host selector must be enabled in WAITING');

  // 2. Guest selector is read-only with clear hint
  const guestState = helpers.resolveRulesetSelectorState({
    rulesetId: 'full-expansion',
    serverRulesets: FULL_BETA_CAPABILITIES,
    matchStatus: 'WAITING',
    isHost: false,
    isSpectator: false,
    hasSelectHandler: true,
  });
  assert.equal(guestState.canOpenSelector, false);
  assert.equal(guestState.readOnlyReason, 'Chủ bàn chọn chế độ chơi');
  assert.equal(
    helpers.formatRulesetTriggerSummary(guestState.activeRuleset),
    'Full Expansion (66 tướng)',
  );

  // 3. Spectator selector is read-only even if isHost somehow passed true
  const specState = helpers.resolveRulesetSelectorState({
    rulesetId: 'expansion-2',
    serverRulesets: FULL_BETA_CAPABILITIES,
    matchStatus: 'READY_CHECK',
    isHost: true,
    isSpectator: true,
    hasSelectHandler: true,
  });
  assert.equal(specState.canOpenSelector, false);
  assert.equal(specState.activeRuleset.id, 'expansion-2');

  // 4. Unavailable modes are disabled when Beta flags are OFF
  const classicOnlyState = helpers.resolveRulesetSelectorState({
    rulesetId: 'classic',
    serverRulesets: CLASSIC_ONLY_CAPABILITIES,
    matchStatus: 'WAITING',
    isHost: true,
    isSpectator: false,
    hasSelectHandler: true,
  });
  const exp1Opt = classicOnlyState.effectiveRulesets.find((r) => r.id === 'expansion-1');
  const fullOpt = classicOnlyState.effectiveRulesets.find((r) => r.id === 'full-expansion');
  assert.equal(helpers.formatRulesetReleaseBadge(exp1Opt.status), 'Unavailable');
  assert.equal(helpers.canRequestRulesetOption(classicOnlyState, exp1Opt), false);
  assert.equal(helpers.canRequestRulesetOption(classicOnlyState, fullOpt), false);
});

test('P8A1-U8..U12 — Pending state, Server-authoritative state, Status locks, Client rejection guards & HUD/Lobby sync', async () => {
  // 1. Status locks match worker/src/boardgame-room.ts 1-to-1
  for (const editable of ['CREATED', 'WAITING', 'READY_CHECK', 'FINISHED']) {
    assert.equal(helpers.isRulesetLockedForMatchStatus(editable), false, `${editable} should be editable`);
  }
  for (const locked of ['STARTING', 'PLAYING', 'CLOSED']) {
    assert.equal(helpers.isRulesetLockedForMatchStatus(locked), true, `${locked} must lock ruleset`);
    const st = helpers.resolveRulesetSelectorState({
      rulesetId: 'full-expansion',
      serverRulesets: FULL_BETA_CAPABILITIES,
      matchStatus: locked,
      isHost: true,
      hasSelectHandler: true,
    });
    assert.equal(st.canOpenSelector, false);
    assert.equal(st.lockedByMatch, true);
  }

  // 2. Pending state blocks duplicate option requests
  const pendingState = helpers.resolveRulesetSelectorState({
    rulesetId: 'classic',
    pendingRulesetId: 'full-expansion',
    serverRulesets: FULL_BETA_CAPABILITIES,
    matchStatus: 'WAITING',
    isHost: true,
    hasSelectHandler: true,
  });
  assert.equal(pendingState.isPending, true);
  assert.equal(
    helpers.canRequestRulesetOption(
      pendingState,
      FULL_BETA_CAPABILITIES.find((r) => r.id === 'expansion-1'),
    ),
    false,
    'Pending request must prevent double-click / concurrent mode request',
  );

  // 3. BoardGameClient.setRuleset enforces host, capability, lock & disconnect guards and never optimistically overwrites rulesetId
  const client = new BoardGameClient();
  const sentMsgs = [];
  const fakeWs = {
    readyState: 1,
    send(raw) {
      sentMsgs.push(JSON.parse(raw));
    },
  };
  client.ws = fakeWs;
  client.snap = {
    ...client.getSnapshot(),
    connectionState: 'connected',
    matchId: 'bg_unit_1',
    inviteCode: 'UNIT01',
    status: 'WAITING',
    rulesetId: 'classic',
    playerId: 'p_host',
    hostPlayerId: 'p_host',
    isSpectator: false,
    serverRulesets: FULL_BETA_CAPABILITIES,
  };

  // Duplicate same ruleset is a clean no-op
  const noopRes = await client.setRuleset('classic');
  assert.equal(noopRes.ok, true);
  assert.equal(sentMsgs.length, 0);

  // Valid switch sends BG_SET_RULESET, sets pendingRulesetId, keeps rulesetId='classic' until server confirms
  const reqPromise = client.setRuleset('full-expansion');
  assert.equal(sentMsgs.length, 1);
  assert.equal(sentMsgs[0].type, 'BG_SET_RULESET');
  assert.equal(sentMsgs[0].rulesetId, 'full-expansion');
  assert.equal(client.getSnapshot().pendingRulesetId, 'full-expansion');
  assert.equal(client.getSnapshot().rulesetId, 'classic', 'Must NOT optimistically mutate rulesetId');

  // Duplicate click while in flight is rejected cleanly without sending a 2nd socket frame
  const dupRes = await client.setRuleset('full-expansion');
  assert.equal(dupRes.ok, false);
  assert.equal(sentMsgs.length, 1);

  // Simulate server rejection (BG_ERROR) -> clears pending, surfaces error, keeps classic!
  client.handleServerMessage({
    type: 'BG_ERROR',
    code: 'RULESET_UNAVAILABLE',
    message: 'Gói Beta tạm khóa bởi server.',
    requestId: sentMsgs[0].requestId,
  });
  const rejRes = await reqPromise;
  assert.equal(rejRes.ok, false);
  assert.equal(client.getSnapshot().pendingRulesetId, null);
  assert.equal(client.getSnapshot().rulesetId, 'classic');
  assert.ok(client.getSnapshot().lastError.includes('Gói Beta'));

  // Non-host blocked client-side before sending
  client.snap = { ...client.getSnapshot(), playerId: 'p_guest', lastError: null };
  const guestRes = await client.setRuleset('expansion-1');
  assert.equal(guestRes.ok, false);
  assert.equal(sentMsgs.length, 1);

  // Playing match blocked client-side
  client.snap = { ...client.getSnapshot(), playerId: 'p_host', status: 'PLAYING', lastError: null };
  const playingRes = await client.setRuleset('expansion-1');
  assert.equal(playingRes.ok, false);
  assert.equal(sentMsgs.length, 1);

  // 4. SSR Component verification: HUD + Lobby render synchronized authoritative state
  const sharedProps = {
    inviteCode: 'SYNC99',
    matchStatus: 'WAITING',
    rulesetId: 'full-expansion',
    serverRulesets: FULL_BETA_CAPABILITIES,
  };
  const hostHudHtml = renderToStaticMarkup(
    React.createElement(BoardGameHUD, {
      seatId: 'bg-t1-s0',
      table1Count: 4,
      table2Count: 0,
      lobbyOpen: false,
      rulesOpen: false,
      isHost: true,
      isSpectator: false,
      canStartMatch: true,
      seatedPlayerCount: 4,
      readyPlayerCount: 4,
      onToggleLobby: () => {},
      onToggleRules: () => {},
      onStandUpSeat: () => {},
      onSelectRuleset: () => {},
      onStartMatch: () => {},
      onRequestExit: () => {},
      ...sharedProps,
    }),
  );
  assert.ok(hostHudHtml.includes('data-testid="bg-hud-ruleset-trigger"'));
  assert.ok(hostHudHtml.includes('Full Expansion (66 tướng)'));
  assert.ok(hostHudHtml.includes('Beta'));
  assert.ok(hostHudHtml.includes('▶ Bắt đầu · Full Expansion'));

  const guestHudHtml = renderToStaticMarkup(
    React.createElement(BoardGameHUD, {
      seatId: 'bg-t1-s1',
      table1Count: 4,
      table2Count: 0,
      lobbyOpen: false,
      rulesOpen: false,
      isHost: false,
      isSpectator: false,
      localReady: false,
      seatedPlayerCount: 4,
      readyPlayerCount: 2,
      onToggleLobby: () => {},
      onToggleRules: () => {},
      onStandUpSeat: () => {},
      onToggleReady: () => {},
      onRequestExit: () => {},
      ...sharedProps,
    }),
  );
  assert.ok(guestHudHtml.includes('data-testid="bg-hud-ruleset-readonly"'));
  assert.equal(guestHudHtml.includes('data-testid="bg-hud-ruleset-trigger"'), false);
  assert.ok(guestHudHtml.includes('Full Expansion (66 tướng)'));
  assert.ok(guestHudHtml.includes('Chủ bàn chọn chế độ chơi'));

  const lobbyHtml = renderToStaticMarkup(
    React.createElement(BoardGameLobby, {
      open: true,
      rulesOpen: false,
      exitConfirmOpen: false,
      currentSeatId: 'bg-t1-s0',
      isHost: true,
      supportsOnlineLobby: true,
      onCloseLobby: () => {},
      onCloseRules: () => {},
      onCancelExit: () => {},
      onConfirmExit: () => {},
      onSelectSeat: () => {},
      onStandUpSeat: () => {},
      onSelectRuleset: () => {},
      ...sharedProps,
    }),
  );
  assert.ok(lobbyHtml.includes('data-testid="bg-ruleset-opt-full-expansion"'));
  assert.ok(lobbyHtml.includes('Full Expansion'));
  assert.ok(lobbyHtml.includes('66 tướng'));
});

// ===========================================================================
// PART B — REAL DURABLE OBJECT INTEGRATION TESTS (Section 11: 13/13)
// ===========================================================================

test('P8A1-DO-1 — 3D seat-to-match (/api/boardgame/join-table): default Classic -> Host Full Expansion -> Guest join preserves mode -> F5 reconnect -> Start deals 66-pool -> Lock -> Rematch preserves mode', async () => {
  const srv = await startStandaloneBoardGameTestServer(0, {
    ENVIRONMENT: 'production',
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
  });
  const clients = [];
  const auths = [];
  let spectator = null;
  try {
    // 1 & 2. Host sits at Table 1 via /api/boardgame/join-table -> auto-created room defaults to `classic`
    const join1Res = await fetch(`${srv.httpBaseUrl}/api/boardgame/join-table`, {
      method: 'POST',
      headers: testHeaders(),
      body: JSON.stringify({ tableId: 'table-1', hostName: 'Host3D', turnTimeoutMs: 0 }),
    });
    const join1 = await join1Res.json();
    assert.equal(join1Res.status, 201);
    assert.equal(join1.ok, true);
    assert.equal(join1.created, true);
    const { matchId, inviteCode } = join1;

    const c0 = new WsTestClient(`${srv.wsBaseUrl}/ws/boardgame?matchId=${matchId}`);
    await c0.connect();
    clients.push(c0);
    c0.send({
      type: 'BG_JOIN',
      matchId,
      inviteCode,
      displayName: 'Host3D',
      asSpectator: false,
      preferredSeatIndex: 0,
      requestId: 'j0',
    });
    auths.push(await c0.nextMsg((m) => m.type === 'BG_AUTH_ISSUED'));
    const sync0 = await c0.nextMsg((m) => m.type === 'BG_STATE_SYNC');
    assert.equal(sync0.rulesetId, 'classic', 'Auto-created 3D table match must default to classic');
    assert.equal(sync0.availableRulesets.length, 4);

    // 3 & 4. Host switches to `full-expansion` via BG_SET_RULESET -> persisted without changing inviteCode/seat
    const c0Idx = c0.messages.length;
    c0.send({ type: 'BG_SET_RULESET', rulesetId: 'full-expansion', requestId: 'set_full' });
    const ack = await c0.nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'set_full');
    assert.equal(ack.ok, true);
    const syncFull = await c0.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.rulesetId === 'full-expansion',
      6000,
      c0Idx,
    );
    assert.equal(syncFull.inviteCode, inviteCode);
    assert.equal(syncFull.players[0].seatIndex, 0);

    // 5 & 13. Guests 2..4 sit at physical seats via /api/boardgame/join-table -> MUST join existing room & NEVER override `full-expansion`!
    for (let i = 1; i < 4; i += 1) {
      const jr = await fetch(`${srv.httpBaseUrl}/api/boardgame/join-table`, {
        method: 'POST',
        headers: testHeaders(),
        body: JSON.stringify({ tableId: 'table-1', hostName: `Guest3D_${i}`, turnTimeoutMs: 0 }),
      });
      const jd = await jr.json();
      assert.equal(jd.ok, true);
      assert.equal(jd.created, false, 'Subsequent 3D seat join must attach to existing room');
      assert.equal(jd.matchId, matchId);

      const ci = new WsTestClient(`${srv.wsBaseUrl}/ws/boardgame?matchId=${matchId}`);
      await ci.connect();
      clients.push(ci);
      ci.send({
        type: 'BG_JOIN',
        matchId,
        inviteCode,
        displayName: `Guest3D_${i}`,
        asSpectator: false,
        preferredSeatIndex: i,
        requestId: `j${i}`,
      });
      auths.push(await ci.nextMsg((m) => m.type === 'BG_AUTH_ISSUED'));
      const gs = await ci.nextMsg((m) => m.type === 'BG_STATE_SYNC');
      assert.equal(gs.rulesetId, 'full-expansion', `Guest ${i} must see host-chosen full-expansion`);
    }

    // Spectator joins & sees full-expansion with zero private data
    spectator = new WsTestClient(`${srv.wsBaseUrl}/ws/boardgame?matchId=${matchId}`);
    await spectator.connect();
    spectator.send({
      type: 'BG_JOIN',
      matchId,
      inviteCode,
      displayName: 'Spec3D',
      asSpectator: true,
      requestId: 'jspec',
    });
    await spectator.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    const specSync = await spectator.nextMsg((m) => m.type === 'BG_STATE_SYNC');
    assert.equal(specSync.rulesetId, 'full-expansion');
    assert.equal(specSync.privateView, null);

    // 9. Non-host change rejected with NOT_HOST
    clients[1].send({ type: 'BG_SET_RULESET', rulesetId: 'classic', requestId: 'nonhost_try' });
    const nonHostErr = await clients[1].nextMsg(
      (m) => m.type === 'BG_ERROR' && m.requestId === 'nonhost_try',
    );
    assert.equal(nonHostErr.code, 'NOT_HOST');

    // 12. starter-* pools remain inaccessible even for Host
    for (const starterId of contracts.BOARD_GAME_EXPERIMENTAL_RULESETS) {
      const rid = `starter_${starterId}`;
      c0.send({ type: 'BG_SET_RULESET', rulesetId: starterId, requestId: rid });
      const err = await c0.nextMsg((m) => m.type === 'BG_ERROR' && m.requestId === rid);
      assert.equal(err.code, 'RULESET_UNAVAILABLE');
    }

    // 6. F5 Reconnect preserves full-expansion:
    //    6A: Guest F5 reconnect keeps seat & full-expansion while Host stays Host
    clients[1].close();
    const c1Re = new WsTestClient(`${srv.wsBaseUrl}/ws/boardgame?matchId=${matchId}`);
    await c1Re.connect();
    clients[1] = c1Re;
    c1Re.send({
      type: 'BG_JOIN',
      matchId,
      inviteCode,
      displayName: 'Guest3D_1',
      asSpectator: false,
      reconnectToken: auths[1].reconnectToken,
      requestId: 're_guest',
    });
    await c1Re.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    const reGuestSync = await c1Re.nextMsg((m) => m.type === 'BG_STATE_SYNC');
    assert.equal(reGuestSync.rulesetId, 'full-expansion');
    assert.equal(reGuestSync.hostPlayerId, auths[0].playerId);

    // 7 & 8. Ready + Start -> server deals from full-expansion pool
    for (let i = 1; i < 4; i += 1) {
      clients[i].send({ type: 'BG_SET_READY', ready: true, requestId: `rdy_${i}` });
      await clients[i].nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === `rdy_${i}`);
    }
    const startIdxs = clients.map((c) => c.messages.length);
    c0.send({ type: 'BG_START_MATCH', requestId: 'start_full' });
    const playingSyncs = await Promise.all(
      clients.map((c, idx) =>
        c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING', 6000, startIdxs[idx]),
      ),
    );
    const fullPoolIds = new Set(
      domain.DEFAULT_RULESET_REGISTRY.listCatalogCharactersForRuleset('full-expansion').map(
        (e) => e.id,
      ),
    );
    for (const s of playingSyncs) {
      assert.equal(s.rulesetId, 'full-expansion');
      assert.equal(s.publicGame.rulesetId, 'full-expansion');
      assert.ok(fullPoolIds.has(s.privateView.roleId));
    }

    // 10. Post-start BG_SET_RULESET rejected
    c0.send({ type: 'BG_SET_RULESET', rulesetId: 'classic', requestId: 'post_start_lock' });
    const lockErr = await c0.nextMsg(
      (m) => m.type === 'BG_ERROR' && m.requestId === 'post_start_lock',
    );
    assert.equal(lockErr.code, 'INVALID_ACTION');

    // Rematch policy check: transition FINISHED -> WAITING preserves full-expansion without silently resetting to classic
    const sql = srv.containers.get(matchId).ctx.storage.sql;
    sql.exec("UPDATE matches SET status = 'FINISHED' WHERE match_id = ?", matchId);
    const remIdx = c0.messages.length;
    c0.send({ type: 'BG_SET_READY', ready: true, requestId: 'rematch_rdy' });
    const remSync = await c0.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.status === 'WAITING',
      6000,
      remIdx,
    );
    assert.equal(
      remSync.rulesetId,
      'full-expansion',
      'Rematch reset FINISHED -> WAITING must preserve host-selected ruleset',
    );
  } finally {
    spectator?.close();
    for (const c of clients) c.close();
    await srv.close();
  }
});

test('P8A1-DO-2 — Disabled Beta flags DO server blocks expansion selection on 3D auto-created room', async () => {
  const srv = await startStandaloneBoardGameTestServer(0, {});
  let c0 = null;
  try {
    const res = await fetch(`${srv.httpBaseUrl}/api/boardgame/join-table`, {
      method: 'POST',
      headers: testHeaders(),
      body: JSON.stringify({ tableId: 'table-2', hostName: 'ClassicOnlyHost', turnTimeoutMs: 0 }),
    });
    const jd = await res.json();
    assert.equal(jd.ok, true);

    c0 = new WsTestClient(`${srv.wsBaseUrl}/ws/boardgame?matchId=${jd.matchId}`);
    await c0.connect();
    c0.send({
      type: 'BG_JOIN',
      matchId: jd.matchId,
      inviteCode: jd.inviteCode,
      displayName: 'ClassicOnlyHost',
      asSpectator: false,
      preferredSeatIndex: 0,
      requestId: 'j_off',
    });
    await c0.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    const s0 = await c0.nextMsg((m) => m.type === 'BG_STATE_SYNC');
    assert.equal(s0.rulesetId, 'classic');
    assert.equal(s0.betaEnabled, false);
    assert.equal(s0.availableRulesets.filter((r) => r.selectable).length, 1);

    for (const blocked of ['expansion-1', 'expansion-2', 'full-expansion']) {
      const rid = `off_${blocked}`;
      c0.send({ type: 'BG_SET_RULESET', rulesetId: blocked, requestId: rid });
      const err = await c0.nextMsg((m) => m.type === 'BG_ERROR' && m.requestId === rid);
      assert.equal(err.code, 'RULESET_UNAVAILABLE');
    }
  } finally {
    c0?.close();
    await srv.close();
  }
});
