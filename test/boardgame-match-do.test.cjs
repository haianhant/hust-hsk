/**
 * test/boardgame-match-do.test.cjs — Kiểm thử Durable Object `BoardGameRoom`
 * tích hợp Full Gameplay Engine v3 "Bóng Đêm KTX v3 — Hidden Role, Investigation & Survival":
 *  (1) Ván 4 người + 1 khán giả chơi tới `FINISHED` trên WS + SQLite DO thật + Audit P0 từng WS frame + Rematch
 *  (2) Hai bàn song song độc lập (`table-1` & `table-2`), Idempotency (`processed_requests`),
 *      `STALE_REVISION`, từ chối sai lượt/sai pha/khán giả, và duplicate-tab `4001` fence
 *  (3) Ngân sách 1 đồng hồ mỗi lượt (`40s`): chuyển pha Move->Location->Main / Equip / Reveal KHÔNG reset timer,
 *      chỉ reset khi sang lượt mới (`turnNumber` tăng)
 *  (4) Bàn 8 người + Ngắt kết nối giữa pha (`LOCATION_ACTION` / `MAIN_ACTION`) + `alarm()` rút ngắn +
 *      Hibernation `/__bg_hibernate` + F5 reconnect giữ nguyên vai/tay bài/manh mối
 *  (5) Tương thích dữ liệu SQLite cũ v1/v2 (cả ván đang dở lẫn ván đã FINISHED — không xóa dữ liệu)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { WebSocket } = require('./ws-shim/mini-ws');
const {
  startStandaloneBoardGameTestServer,
} = require('./ws-shim/boardgame-do-harness.cjs');
const {
  BOARD_GAME_ABANDONED_MATCH_TTL_MS,
  BOARD_GAME_RECONNECT_HOLD_MS,
} = require('../shared/contracts/boardgame.ts');
const {
  setBoardGameLogSink,
  resetBoardGameObservabilityForTest,
} = require('../worker/src/boardgame-observability.ts');
const { clampBoardGameTurnTimeoutMs } = require('../worker/src/boardgame-room.ts');
const { listLegalMovesForLocation } = require('../features/boardgame/domain/index.ts');

function assertPublicGameV3NoLeaks(pub, status) {
  assert.equal(pub.rulesetVersion, 3);
  const raw = JSON.stringify(pub);
  const alwaysForbidden = [
    '"secretSabotageLocation":',
    '"signalProgress":',
    '"mistProgress":',
    '"maxTrackValue":',
    '"protegePlayerId":',
    '"privateClues":',
    '"privateNotes":',
  ];
  if (status === 'PLAYING') {
    alwaysForbidden.push('"maxHp":', '"hp":');
  }
  for (const forbidden of alwaysForbidden) {
    assert.equal(raw.includes(forbidden), false, `publicGame (${status}) leaked ${forbidden}`);
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function openBgClient(wsBaseUrl, params) {
  const qs = new URLSearchParams({ matchId: params.matchId });
  const ws = new WebSocket(`${wsBaseUrl}/ws/boardgame?${qs.toString()}`);
  const inbox = [];
  const waiters = [];
  let latestSync = null;
  let closedEvent = null;

  ws.on('message', (raw) => {
    const rawStr = raw.toString();
    const msg = JSON.parse(rawStr);
    msg.__raw = rawStr;
    inbox.push(msg);
    if (msg.type === 'BG_STATE_SYNC') {
      latestSync = msg;
    }
    for (let i = waiters.length - 1; i >= 0; i--) {
      const w = waiters[i];
      if (w.predicate(msg)) {
        waiters.splice(i, 1);
        clearTimeout(w.timer);
        w.resolve(msg);
      }
    }
  });

  ws.on('close', (code, reason) => {
    closedEvent = { code, reason: reason ? reason.toString() : '' };
  });

  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });

  function nextMsg(predicate, timeoutMs = 4000, fromIndex = 0) {
    for (let i = fromIndex; i < inbox.length; i++) {
      if (predicate(inbox[i])) return Promise.resolve(inbox[i]);
    }
    return new Promise((resolve, reject) => {
      const entry = {
        predicate,
        resolve,
        timer: setTimeout(() => {
          const idx = waiters.indexOf(entry);
          if (idx >= 0) waiters.splice(idx, 1);
          reject(new Error(`Timed out waiting for WS message (${inbox.length} received)`));
        }, timeoutMs),
      };
      waiters.push(entry);
    });
  }

  function send(obj) {
    ws.send(JSON.stringify(obj));
  }

  function close() {
    ws.close(1000, 'test close');
  }

  return {
    ws,
    inbox,
    nextMsg,
    send,
    close,
    getLatestSync: () => latestSync,
    getClosedEvent: () => closedEvent,
  };
}

async function setupStartedMatch(srv, tableId, names, extraStartPayload = {}) {
  const createRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tableId,
      hostName: names[0],
      turnTimeoutMs: extraStartPayload.turnTimeoutMs,
    }),
  });
  assert.equal(createRes.status, 201);
  const { matchId, inviteCode } = await createRes.json();

  const clients = [];
  for (let i = 0; i < names.length; i++) {
    const c = await openBgClient(srv.wsBaseUrl, { matchId });
    c.send({
      type: 'BG_JOIN',
      matchId,
      inviteCode,
      displayName: names[i],
    });
    const auth = await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    clients.push({ c, auth, playerId: auth.playerId });
  }

  for (let i = 1; i < clients.length; i++) {
    const lenBefore = clients[0].c.inbox.length;
    clients[i].c.send({ type: 'BG_SET_READY', ready: true, requestId: `rdy-${matchId}-${i}` });
    await clients[0].c.nextMsg((m) => m.type === 'BG_STATE_SYNC', 4000, lenBefore);
  }

  clients[0].c.send({
    type: 'BG_START_MATCH',
    requestId: `start-${matchId}`,
    ...extraStartPayload,
  });
  for (const entry of clients) {
    await entry.c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING');
  }

  return { matchId, inviteCode, clients };
}

test('GV3.3 DO Authoritative Match v3 & Section 19 Resilience Suite', async (t) => {
  const srv = await startStandaloneBoardGameTestServer(0);
  t.after(async () => {
    await srv.close();
  });

  await t.test('(1) Full 4p + Spectator v3 match to FINISHED + per-frame P0 & zero-MSSV audit + rematch', async () => {
    const rawNames = ['Minh 20221111', 'Lan 20222222', 'Khánh 20223333', 'Hải 20224444'];
    const mssvList = ['20221111', '20222222', '20223333', '20224444'];

    const createRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-1', hostName: 'Minh 20229999' }),
    });
    assert.equal(createRes.status, 201);
    const { matchId, inviteCode } = await createRes.json();

    const players = [];
    for (let i = 0; i < 4; i++) {
      const c = await openBgClient(srv.wsBaseUrl, { matchId });
      c.send({ type: 'BG_JOIN', matchId, inviteCode, displayName: rawNames[i] });
      const auth = await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
      players.push({ c, auth, playerId: auth.playerId });
    }

    const spectator = await openBgClient(srv.wsBaseUrl, { matchId });
    spectator.send({
      type: 'BG_JOIN',
      matchId,
      inviteCode,
      displayName: 'Khán Giả',
      asSpectator: true,
    });
    const specAuth = await spectator.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    assert.equal(specAuth.isSpectator, true);

    for (let i = 1; i < 4; i++) {
      const lenBefore = players[0].c.inbox.length;
      players[i].c.send({ type: 'BG_SET_READY', ready: true, requestId: `rdy-${i}` });
      await players[0].c.nextMsg((m) => m.type === 'BG_STATE_SYNC', 4000, lenBefore);
    }

    players[0].c.send({ type: 'BG_START_MATCH', requestId: 'start-v3-4p' });
    for (const p of players) {
      await p.c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING');
    }
    const specStartSync = await spectator.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING',
    );
    assert.equal(specStartSync.privateView, null);
    assert.equal(specStartSync.publicGame.rulesetVersion, 3);

    // Khán giả gửi hành động -> SPECTATOR_READ_ONLY
    const specLenBefore = spectator.inbox.length;
    spectator.send({
      type: 'BG_GAME_ACTION',
      requestId: 'spec-cheat-v3',
      expectedRevision: specStartSync.revision,
      action: { type: 'END_TURN' },
    });
    const specErr = await spectator.nextMsg(
      (m) => m.type === 'BG_ERROR' && m.code === 'SPECTATOR_READ_ONLY',
      4000,
      specLenBefore,
    );
    assert.ok(specErr);

    // Lấy role thật ban đầu từ DO SQLite để audit zero-leak trên từng frame
    const container = srv.containers.get(matchId);
    const initialEngine = JSON.parse(
      container.ctx.storage.sql.exec('SELECT game_state_json FROM matches').one().game_state_json,
    ).engineState;
    const roleById = new Map(initialEngine.players.map((ep) => [ep.playerId, ep.roleId]));

    // Chơi ván v3 thực tế qua WS cho tới khi FINISHED (gặp nhau tại Hành Lang B7 để điều tra & giao tranh)
    let actionSeq = 0;
    let safety = 0;
    let exercisedInvestigate = false;
    let exercisedReveal = false;

    while (players[0].c.getLatestSync().status === 'PLAYING' && safety < 240) {
      safety += 1;
      const latest = players[0].c.getLatestSync();
      const pub = latest.publicGame;
      if (!pub || pub.turnPhase === 'ENDED') break;

      const actorEntry = players.find((p) => p.playerId === pub.activePlayerId);
      assert.ok(actorEntry, 'Active player must exist');
      const actorSync = actorEntry.c.getLatestSync();
      const actorPub = actorSync.publicGame.players.find((x) => x.playerId === actorEntry.playerId);
      const priv = actorSync.privateView;

      let act;
      if (pub.turnPhase === 'MOVE_OR_STAY') {
        const legalAdj = listLegalMovesForLocation(actorPub.location);
        if (actorPub.location === 'lobby') {
          act = { type: 'STAY' };
        } else if (legalAdj.includes('lobby')) {
          act = { type: 'MOVE', location: 'lobby' };
        } else {
          act = { type: 'MOVE', location: legalAdj.includes('corridor') ? 'corridor' : legalAdj[0] };
        }
      } else if (pub.turnPhase === 'LOCATION_ACTION') {
        if (actorPub.location === 'court') {
          act = { type: 'EXPLORE_LOC' };
        } else {
          act = { type: 'EXPLORE_LOC' };
        }
      } else if (pub.turnPhase === 'MAIN_ACTION') {
        const sameRoomEnemy = actorSync.publicGame.players.find(
          (p) =>
            p.alive &&
            p.playerId !== actorEntry.playerId &&
            p.location === actorPub.location &&
            (!p.revealedFaction || p.revealedFaction !== priv.faction),
        );
        const passiveEquip = priv.hand.find((c) => c.deck === 'equipment' && !c.isConsumable);
        const invCard = priv.hand.find((c) => c.deck === 'investigation');
        const otherAlive = actorSync.publicGame.players.find(
          (p) => p.alive && p.playerId !== actorEntry.playerId,
        );

        if (passiveEquip && actorPub.equipped.length === 0) {
          act = { type: 'EQUIP_CARD', cardId: passiveEquip.id };
        } else if (!priv.revealed && !exercisedReveal && pub.round >= 2) {
          exercisedReveal = true;
          act = { type: 'REVEAL_ROLE' };
        } else if (!exercisedInvestigate && invCard && sameRoomEnemy) {
          exercisedInvestigate = true;
          act = {
            type: 'INVESTIGATE_CARD',
            cardId: invCard.id,
            targetPlayerId: sameRoomEnemy.playerId,
          };
        } else if (sameRoomEnemy) {
          act = { type: 'ATTACK', targetPlayerId: sameRoomEnemy.playerId };
        } else if (otherAlive) {
          act = { type: 'END_TURN' };
        } else {
          act = { type: 'END_TURN' };
        }
      }

      actionSeq += 1;
      const reqId = `v3-act-${actionSeq}`;
      const lenBefore = actorEntry.c.inbox.length;
      actorEntry.c.send({
        type: 'BG_GAME_ACTION',
        requestId: reqId,
        expectedRevision: actorSync.revision,
        action: act,
      });
      const ack = await actorEntry.c.nextMsg(
        (m) => m.type === 'BG_ACTION_ACK' && m.requestId === reqId,
        4000,
        lenBefore,
      );
      assert.equal(ack.ok, true, `Action ${JSON.stringify(act)} failed: ${ack.reason}`);

      await Promise.all([
        ...players.map((p) =>
          p.c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.revision >= ack.revision),
        ),
        spectator.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.revision >= ack.revision),
      ]);
      await delay(28);
    }

    const finalSync = players[0].c.getLatestSync();
    assert.equal(finalSync.status, 'FINISHED', 'Ván 4 người v3 phải kết thúc FINISHED');
    assert.ok(finalSync.publicGame.finalReveal && finalSync.publicGame.finalReveal.length === 4);
    assert.equal(exercisedInvestigate, true);
    assert.equal(exercisedReveal, true);

    // Audit TOÀN BỘ WS frames của cả 4 người & khán giả
    for (const msg of spectator.inbox) {
      for (const mssv of [...mssvList, '20229999']) {
        assert.equal(msg.__raw.includes(mssv), false, `Spectator leaked MSSV ${mssv}`);
      }
      if (msg.type === 'BG_STATE_SYNC') {
        assert.equal(msg.privateView, null);
        if (msg.publicGame) {
          assertPublicGameV3NoLeaks(msg.publicGame, msg.status);
          if (msg.status === 'PLAYING') {
            for (const pp of msg.publicGame.players) {
              if (!pp.revealedRoleId) {
                assert.equal(
                  msg.__raw.includes(roleById.get(pp.playerId)),
                  false,
                  `Spectator leaked hidden role ${roleById.get(pp.playerId)}`,
                );
              }
            }
          }
        }
      }
    }

    for (let i = 0; i < players.length; i++) {
      for (const msg of players[i].c.inbox) {
        for (const mssv of [...mssvList, '20229999']) {
          assert.equal(msg.__raw.includes(mssv), false, `Player ${i} leaked MSSV ${mssv}`);
        }
        if (msg.type === 'BG_STATE_SYNC') {
          if (msg.publicGame) assertPublicGameV3NoLeaks(msg.publicGame, msg.status);
          if (msg.privateView) assert.equal(msg.privateView.playerId, players[i].playerId);
          if (msg.status === 'PLAYING' && msg.publicGame) {
            for (let j = 0; j < players.length; j++) {
              if (j === i) continue;
              const otherPub = msg.publicGame.players.find((x) => x.playerId === players[j].playerId);
              if (otherPub && !otherPub.revealedRoleId) {
                assert.equal(
                  msg.__raw.includes(roleById.get(players[j].playerId)),
                  false,
                  `Player ${i} leaked hidden role of player ${j}`,
                );
              }
            }
          }
        }
      }
    }

    // Luồng Sẵn sàng ván mới: FINISHED -> WAITING
    const beforeRematchLen = players[0].c.inbox.length;
    players[0].c.send({ type: 'BG_SET_READY', ready: true, requestId: 'rematch-v3-0' });
    const waitingSync = await players[0].c.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.status === 'WAITING',
      4000,
      beforeRematchLen,
    );
    assert.equal(waitingSync.publicGame, null);

    spectator.close();
    players.forEach(({ c }) => c.close());
  });

  await t.test('(2) 2 Simultaneous matches + Idempotency + STALE_REVISION + Invalid Action + Duplicate Tab 4001', async () => {
    const mA = await setupStartedMatch(srv, 'table-1', ['A1', 'A2', 'A3', 'A4']);
    const mB = await setupStartedMatch(srv, 'table-2', ['B1', 'B2', 'B3', 'B4']);

    const revA0 = mA.clients[0].c.getLatestSync().revision;
    const revB0 = mB.clients[0].c.getLatestSync().revision;

    // 1. Out-of-turn action ở Bàn A -> NOT_YOUR_TURN
    const wrongIdx = mA.clients.findIndex((x) => x.playerId !== mA.clients[0].c.getLatestSync().publicGame.activePlayerId);
    const wrongPlayer = mA.clients[wrongIdx];
    const wrongLen = wrongPlayer.c.inbox.length;
    wrongPlayer.c.send({
      type: 'BG_GAME_ACTION',
      requestId: 'not-turn-1',
      expectedRevision: revA0,
      action: { type: 'STAY' },
    });
    const notTurnErr = await wrongPlayer.c.nextMsg(
      (m) => m.type === 'BG_ERROR' && m.code === 'NOT_YOUR_TURN',
      4000,
      wrongLen,
    );
    assert.ok(notTurnErr);

    // 2. Sai pha (`EXPLORE_LOC` khi đang `MOVE_OR_STAY`) -> INVALID_ACTION
    const activeA = mA.clients.find((x) => x.playerId === mA.clients[0].c.getLatestSync().publicGame.activePlayerId);
    const invLen = activeA.c.inbox.length;
    activeA.c.send({
      type: 'BG_GAME_ACTION',
      requestId: 'bad-phase-1',
      expectedRevision: revA0,
      action: { type: 'EXPLORE_LOC' },
    });
    const invErr = await activeA.c.nextMsg(
      (m) => m.type === 'BG_ERROR' && m.code === 'INVALID_ACTION',
      4000,
      invLen,
    );
    assert.ok(invErr);

    await delay(35);
    // 3. Idempotency: gửi 2 lần liên tiếp cùng requestId
    const actorPubA = mA.clients[0].c.getLatestSync().publicGame.players.find((p) => p.playerId === activeA.playerId);
    const moveDest = listLegalMovesForLocation(actorPubA.location)[0];
    const idemLen = activeA.c.inbox.length;
    const movePayload = {
      type: 'BG_GAME_ACTION',
      requestId: 'idem-v3-move',
      expectedRevision: revA0,
      action: { type: 'MOVE', location: moveDest },
    };
    activeA.c.send(movePayload);
    activeA.c.send(movePayload);
    const ack1 = await activeA.c.nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'idem-v3-move', 4000, idemLen);
    const ack2 = await activeA.c.nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'idem-v3-move',
      4000,
      activeA.c.inbox.indexOf(ack1) + 1,
    );
    assert.equal(ack1.ok, true);
    assert.equal(ack2.revision, ack1.revision);
    assert.equal(ack1.revision, revA0 + 1);

    // Bàn B hoàn toàn cô lập, revision vẫn nguyên vẹn revB0!
    assert.equal(mB.clients[0].c.getLatestSync().revision, revB0);

    await delay(30);
    // 4. STALE_REVISION check
    const staleLen = activeA.c.inbox.length;
    activeA.c.send({
      type: 'BG_GAME_ACTION',
      requestId: 'stale-v3',
      expectedRevision: 1,
      action: { type: 'EXPLORE_LOC' },
    });
    const staleErr = await activeA.c.nextMsg((m) => m.type === 'BG_ERROR' && m.code === 'STALE_REVISION', 4000, staleLen);
    assert.equal(staleErr.revision, ack1.revision);

    // 5. Duplicate tab supersede fence (4001)
    const dupClient = await openBgClient(srv.wsBaseUrl, { matchId: mA.matchId });
    dupClient.send({
      type: 'BG_JOIN',
      matchId: mA.matchId,
      displayName: 'A1 Tab 2',
      reconnectToken: mA.clients[0].auth.reconnectToken,
    });
    const dupSync = await dupClient.nextMsg((m) => m.type === 'BG_STATE_SYNC');
    assert.equal(dupSync.revision, ack1.revision + 1);
    await delay(50);
    assert.equal(mA.clients[0].c.getClosedEvent()?.code, 4001);

    dupClient.close();
    mA.clients.forEach(({ c }, idx) => {
      if (idx !== 0) c.close();
    });
    mB.clients.forEach(({ c }) => c.close());
  });

  await t.test('(3) Single per-turn 40s timer budget: intra-turn phases & free actions never reset turnDeadlineMs', async () => {
    const m = await setupStartedMatch(srv, 'table-1', ['T1', 'T2', 'T3', 'T4'], {
      turnTimeoutMs: 40_000,
    });
    const s0 = m.clients[0].c.getLatestSync();
    const initialDeadline = s0.turnDeadlineMs;
    assert.ok(typeof initialDeadline === 'number');

    const actor = m.clients.find((x) => x.playerId === s0.publicGame.activePlayerId);
    let rev = s0.revision;

    // 1. MOVE_OR_STAY -> LOCATION_ACTION: timer KHÔNG được reset
    await delay(25);
    actor.c.send({
      type: 'BG_GAME_ACTION',
      requestId: 'tm-1',
      expectedRevision: rev,
      action: { type: 'STAY' },
    });
    const s1 = await actor.c.nextMsg((msg) => msg.type === 'BG_STATE_SYNC' && msg.revision === rev + 1);
    rev = s1.revision;
    assert.equal(s1.publicGame.turnPhase, 'LOCATION_ACTION');
    assert.equal(s1.turnDeadlineMs, initialDeadline, 'STAY phải giữ nguyên turnDeadlineMs trong cùng lượt');

    // 2. LOCATION_ACTION -> MAIN_ACTION: timer VẪN giữ nguyên
    await delay(25);
    actor.c.send({
      type: 'BG_GAME_ACTION',
      requestId: 'tm-2',
      expectedRevision: rev,
      action: { type: 'EXPLORE_LOC' },
    });
    const s2 = await actor.c.nextMsg((msg) => msg.type === 'BG_STATE_SYNC' && msg.revision === rev + 1);
    rev = s2.revision;
    assert.equal(s2.publicGame.turnPhase, 'MAIN_ACTION');
    assert.equal(s2.turnDeadlineMs, initialDeadline, 'EXPLORE_LOC phải giữ nguyên turnDeadlineMs');

    // 3. Free REVEAL_ROLE trong MAIN_ACTION: vẫn cùng lượt nên KHÔNG reset timer!
    await delay(25);
    actor.c.send({
      type: 'BG_GAME_ACTION',
      requestId: 'tm-3',
      expectedRevision: rev,
      action: { type: 'REVEAL_ROLE' },
    });
    const s3 = await actor.c.nextMsg((msg) => msg.type === 'BG_STATE_SYNC' && msg.revision === rev + 1);
    rev = s3.revision;
    assert.equal(s3.turnDeadlineMs, initialDeadline, 'REVEAL_ROLE không được gia hạn đồng hồ lượt');

    // 4. END_TURN chuyển sang người kế -> lúc này turnDeadlineMs MỚI được làm mới!
    await delay(25);
    actor.c.send({
      type: 'BG_GAME_ACTION',
      requestId: 'tm-4',
      expectedRevision: rev,
      action: { type: 'END_TURN' },
    });
    const s4 = await actor.c.nextMsg((msg) => msg.type === 'BG_STATE_SYNC' && msg.revision === rev + 1);
    assert.equal(s4.publicGame.turnNumber, 2);
    assert.equal(s4.publicGame.turnPhase, 'MOVE_OR_STAY');
    assert.ok(s4.turnDeadlineMs > initialDeadline, 'Sang lượt mới phải reset turnDeadlineMs cho người kế');

    m.clients.forEach(({ c }) => c.close());
  });

  await t.test('(4) 8-player disconnect mid-phase + shortened alarm() neutral timeout + hibernation & reconnect', async () => {
    const names8 = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
    const m = await setupStartedMatch(srv, 'table-2', names8, { turnTimeoutMs: 1500 });

    const startSync0 = m.clients[0].c.getLatestSync();
    const startSync3 = m.clients[3].c.getLatestSync();
    assert.equal(startSync0.publicGame.players.length, 8);
    assert.equal(startSync0.publicGame.rulesetVersion, 3);
    const p3RoleBefore = startSync3.privateView.roleId;
    const p3HandBefore = startSync3.privateView.hand.map((c) => c.id);

    // Đưa active player (P1) sang LOCATION_ACTION rồi ngắt kết nối giữa chừng
    m.clients[0].c.send({
      type: 'BG_GAME_ACTION',
      requestId: 'd8-stay',
      expectedRevision: startSync0.revision,
      action: { type: 'STAY' },
    });
    const midSync = await m.clients[1].c.nextMsg(
      (msg) => msg.type === 'BG_STATE_SYNC' && msg.revision === startSync0.revision + 1,
    );
    assert.equal(midSync.publicGame.turnPhase, 'LOCATION_ACTION');

    m.clients[0].c.close();
    await delay(1600);
    const alarmRes = await fetch(`${srv.httpBaseUrl}/__bg_trigger_alarm?matchId=${m.matchId}`, {
      method: 'POST',
    });
    assert.equal(alarmRes.status, 200);

    const afterAlarm = await m.clients[1].c.nextMsg(
      (msg) =>
        msg.type === 'BG_STATE_SYNC' &&
        msg.publicGame?.activePlayerId === m.clients[1].playerId,
    );
    assert.equal(afterAlarm.publicGame.turnPhase, 'MOVE_OR_STAY');
    assert.ok(afterAlarm.publicGame.publicLog.some((l) => l.kind === 'timeout'));

    // Hibernation DO giữa trận & P4 reconnect bằng reconnectToken
    const hibRes = await fetch(`${srv.httpBaseUrl}/__bg_hibernate?matchId=${m.matchId}`, {
      method: 'POST',
    });
    assert.equal(hibRes.status, 200);

    m.clients[3].c.close();
    await delay(40);

    const p3Reconn = await openBgClient(srv.wsBaseUrl, { matchId: m.matchId });
    p3Reconn.send({
      type: 'BG_JOIN',
      matchId: m.matchId,
      displayName: 'P4 Reconn',
      reconnectToken: m.clients[3].auth.reconnectToken,
    });
    const reAuth = await p3Reconn.nextMsg((msg) => msg.type === 'BG_AUTH_ISSUED');
    assert.equal(reAuth.playerId, m.clients[3].playerId);
    const reSync = await p3Reconn.nextMsg((msg) => msg.type === 'BG_STATE_SYNC');
    assert.equal(reSync.status, 'PLAYING');
    assert.equal(reSync.privateView.roleId, p3RoleBefore);
    assert.deepEqual(reSync.privateView.hand.map((c) => c.id), p3HandBefore);

    p3Reconn.close();
    m.clients.forEach(({ c }, idx) => {
      if (idx !== 0 && idx !== 3) c.close();
    });
  });

  await t.test('(5) Legacy v2 in-progress & finished SQLite rows migrate/read safely without data loss', async () => {
    // Subcase A: In-progress v2 row safely closes to v3 FINISHED & supports rematch
    const mA = await setupStartedMatch(srv, 'table-1', ['LV1', 'LV2', 'LV3', 'LV4']);
    const containerA = srv.containers.get(mA.matchId);
    const legacyPlayingBlob = JSON.stringify({
      rulesetVersion: 2,
      engineState: {
        rulesetVersion: 2,
        matchId: mA.matchId,
        round: 4,
        maxRounds: 7,
        secretSabotageLocation: 'radio',
        sabotagePlanted: true,
        players: mA.clients.map((cl, idx) => ({
          playerId: cl.playerId,
          displayName: `LV${idx + 1}`,
          seatIndex: idx,
          roleId: idx < 2 ? 'gac-ky-thuat' : 'suong-an-danh',
          location: 'lobby',
          alive: true,
          connected: true,
          hp: 10,
          maxHp: 11,
        })),
      },
    });
    containerA.ctx.storage.sql.exec(
      'UPDATE matches SET game_state_json = ? WHERE match_id = ?',
      legacyPlayingBlob,
      mA.matchId,
    );

    // Hibernate + reconnect P1: nhận ngay FINISHED với rulesetVersion=3, không crash
    await fetch(`${srv.httpBaseUrl}/__bg_hibernate?matchId=${mA.matchId}`, { method: 'POST' });
    mA.clients[0].c.close();
    await delay(30);
    const reA0 = await openBgClient(srv.wsBaseUrl, { matchId: mA.matchId });
    reA0.send({
      type: 'BG_JOIN',
      matchId: mA.matchId,
      displayName: 'LV1',
      reconnectToken: mA.clients[0].auth.reconnectToken,
    });
    const reSyncA0 = await reA0.nextMsg((msg) => msg.type === 'BG_STATE_SYNC');
    assert.equal(reSyncA0.status, 'FINISHED');
    assert.equal(reSyncA0.publicGame.rulesetVersion, 3);
    assert.match(reSyncA0.publicGame.winnerLabel, /Luật v3/);

    // Bắt đầu ván mới v3 sạch
    for (let i = 1; i < 4; i++) {
      mA.clients[i].c.send({ type: 'BG_SET_READY', ready: true, requestId: `lv-re-${i}` });
    }
    const readyBefore = reA0.inbox.length;
    await reA0.nextMsg((msg) => msg.type === 'BG_STATE_SYNC' && msg.status === 'READY_CHECK', 4000, readyBefore);
    reA0.send({ type: 'BG_START_MATCH', requestId: 'lv-start-v3' });
    const playingV3 = await reA0.nextMsg((msg) => msg.type === 'BG_STATE_SYNC' && msg.status === 'PLAYING', 4000, readyBefore);
    assert.equal(playingV3.publicGame.rulesetVersion, 3);

    reA0.close();
    mA.clients.forEach(({ c }, idx) => {
      if (idx !== 0) c.close();
    });

    // Subcase B: Finished v2 row preserves historical winnerLabel & winnerPlayerIds
    const mB = await setupStartedMatch(srv, 'table-2', ['HF1', 'HF2', 'HF3', 'HF4']);
    const containerB = srv.containers.get(mB.matchId);
    const legacyFinishedBlob = JSON.stringify({
      rulesetVersion: 2,
      engineState: {
        rulesetVersion: 2,
        matchId: mB.matchId,
        round: 5,
        maxRounds: 7,
        finished: true,
        winnerFaction: 'lantern-guard',
        winnerLabel: 'Đội Gác Đèn v2',
        winnerPlayerIds: [mB.clients[0].playerId],
        winReason: 'Niêm phong an toàn v2.',
        players: mB.clients.map((cl, idx) => ({
          playerId: cl.playerId,
          displayName: `HF${idx + 1}`,
          seatIndex: idx,
          roleId: idx < 2 ? 'gac-ky-thuat' : 'suong-an-danh',
          location: 'lobby',
          alive: idx < 2,
          connected: true,
          hp: idx < 2 ? 8 : 0,
          maxHp: 11,
        })),
      },
    });
    containerB.ctx.storage.sql.exec(
      "UPDATE matches SET status = 'FINISHED', turn_deadline_ms = NULL, game_state_json = ? WHERE match_id = ?",
      legacyFinishedBlob,
      mB.matchId,
    );
    await fetch(`${srv.httpBaseUrl}/__bg_hibernate?matchId=${mB.matchId}`, { method: 'POST' });
    mB.clients[0].c.close();
    await delay(30);
    const reB0 = await openBgClient(srv.wsBaseUrl, { matchId: mB.matchId });
    reB0.send({
      type: 'BG_JOIN',
      matchId: mB.matchId,
      displayName: 'HF1',
      reconnectToken: mB.clients[0].auth.reconnectToken,
    });
    const reSyncB0 = await reB0.nextMsg((msg) => msg.type === 'BG_STATE_SYNC');
    assert.equal(reSyncB0.status, 'FINISHED');
    assert.equal(reSyncB0.publicGame.rulesetVersion, 3);
    assert.equal(reSyncB0.publicGame.winnerLabel, 'Đội Gác Đèn v2');
    assert.deepEqual(reSyncB0.publicGame.winnerPlayerIds, [mB.clients[0].playerId]);

    reB0.close();
    mB.clients.forEach(({ c }, idx) => {
      if (idx !== 0) c.close();
    });
  });

  await t.test('(6) Strict payload validation, cross-match UNAUTHORIZED & BG_REQUEST_SYNC recovery', async () => {
    const mA = await setupStartedMatch(srv, 'table-1', ['SEC1', 'SEC2', 'SEC3', 'SEC4']);
    const createBRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-2', hostName: 'SEC_B_Host' }),
    });
    const mBCreated = await createBRes.json();
    assert.equal(mBCreated.ok, true);

    // 0. Production turnTimeoutMs clamp guard
    assert.equal(clampBoardGameTurnTimeoutMs(1500, {}), 15_000);
    assert.equal(clampBoardGameTurnTimeoutMs(300_000, {}), 90_000);
    assert.equal(clampBoardGameTurnTimeoutMs(1500, { ALLOW_SHORT_TURN_TIMEOUT: '1' }), 1500);

    // 1. Raw WebSocket security checks: malformed JSON, >8KB payload, prototype pollution -> BG_ERROR (no silent drop/crash)
    const rawWs = new WebSocket(`${srv.wsBaseUrl}/ws/boardgame?matchId=${mA.matchId}`);
    const errQueue = [];
    rawWs.on('message', (d) => errQueue.push(JSON.parse(d.toString())));
    await new Promise((r) => rawWs.once('open', r));
    rawWs.send('{not-json');
    rawWs.send('x'.repeat(9000));
    rawWs.send('{"type":"BG_JOIN","__proto__":{"polluted":true},"matchId":"' + mA.matchId + '","displayName":"Hacker"}');
    await delay(120);
    assert.ok(errQueue.filter((e) => e.type === 'BG_ERROR' && e.code === 'INVALID_ACTION').length >= 3);
    rawWs.close();

    // 2. Token của phòng A gửi tới phòng B (CREATED/WAITING) cũng bị UNAUTHORIZED ngay lập tức
    const cCross = await openBgClient(srv.wsBaseUrl, { matchId: mBCreated.matchId });
    cCross.send({
      type: 'BG_JOIN',
      matchId: mBCreated.matchId,
      inviteCode: mBCreated.inviteCode,
      displayName: 'CrossRoomUser',
      reconnectToken: mA.clients[0].auth.reconnectToken,
    });
    const unauthErr = await cCross.nextMsg((msg) => msg.type === 'BG_ERROR');
    assert.equal(unauthErr.code, 'UNAUTHORIZED');
    cCross.close();

    // Token sai trên một phòng đang PLAYING cũng phải từ chối UNAUTHORIZED ngay
    const cCrossPlaying = await openBgClient(srv.wsBaseUrl, { matchId: mA.matchId });
    cCrossPlaying.send({
      type: 'BG_JOIN',
      matchId: mA.matchId,
      inviteCode: mA.inviteCode,
      displayName: 'CrossRoomPlaying',
      reconnectToken: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
    const unauthPlaying = await cCrossPlaying.nextMsg((msg) => msg.type === 'BG_ERROR');
    assert.equal(unauthPlaying.code, 'UNAUTHORIZED');
    cCrossPlaying.close();

    // 3. Commit -> Retry identical requestId idempotency -> Invalid action -> BG_REQUEST_SYNC -> Valid retry
    const curSync = mA.clients[0].c.getLatestSync();
    const active = mA.clients.find((cl) => cl.playerId === curSync.publicGame.activePlayerId);
    const revBefore = curSync.revision;
    const reqDup = 'dup-idemp-req-1';
    active.c.send({
      type: 'BG_GAME_ACTION',
      requestId: reqDup,
      expectedRevision: revBefore,
      action: { type: 'STAY' },
    });
    const ack1 = await active.c.nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === reqDup);
    assert.equal(ack1.ok, true);
    assert.equal(ack1.revision, revBefore + 1);
    const syncAfterStay = await active.c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.revision === revBefore + 1);
    assert.equal(syncAfterStay.publicGame.turnPhase, 'LOCATION_ACTION');

    // Retry exact same requestId (even with old expectedRevision) returns cached ack + sync without bumping revision
    const idxBeforeDup = active.c.inbox.length;
    active.c.send({
      type: 'BG_GAME_ACTION',
      requestId: reqDup,
      expectedRevision: revBefore,
      action: { type: 'STAY' },
    });
    const ackDup = await active.c.nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === reqDup, 4000, idxBeforeDup);
    assert.equal(ackDup.ok, true);
    assert.equal(ackDup.revision, revBefore + 1);
    const dupSync = await active.c.nextMsg((m) => m.type === 'BG_STATE_SYNC', 4000, idxBeforeDup);
    assert.equal(dupSync.revision, revBefore + 1);

    // Rejected invalid action -> BG_REQUEST_SYNC -> valid retry succeeds cleanly
    const idxBeforeErr = active.c.inbox.length;
    active.c.send({
      type: 'BG_GAME_ACTION',
      requestId: 'bad-action-after-stay',
      expectedRevision: revBefore + 1,
      action: { type: 'DEFEND' }, // sai pha (đang LOCATION_ACTION)
    });
    const badAck = await active.c.nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'bad-action-after-stay', 4000, idxBeforeErr);
    assert.equal(badAck.ok, false);
    const idxBeforeReqSync = active.c.inbox.length;
    active.c.send({ type: 'BG_REQUEST_SYNC', requestId: 'req-sync-1' });
    const resynced = await active.c.nextMsg((m) => m.type === 'BG_STATE_SYNC', 4000, idxBeforeReqSync);
    assert.equal(resynced.revision, revBefore + 1);
    assert.equal(resynced.publicGame.turnPhase, 'LOCATION_ACTION');

    await delay(40);
    active.c.send({
      type: 'BG_GAME_ACTION',
      requestId: 'valid-retry-explore',
      expectedRevision: resynced.revision,
      action: { type: 'EXPLORE_LOC' },
    });
    const okExplore = await active.c.nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'valid-retry-explore');
    assert.equal(okExplore.ok, true);

    mA.clients.forEach(({ c }) => c.close());
  });

  await t.test('(7) Reconnect in READY_CHECK, orphan CREATED & all-disconnected PLAYING cleanup via alarm() + /api/boardgame/health', async () => {
    // 1. Reconnect trong READY_CHECK phải recomputeLobbyStatus về lại READY_CHECK tự động
    const createLobbyRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-1', hostName: 'ReadyHost' }),
    });
    const lobbyMeta = await createLobbyRes.json();
    const lClients = [];
    for (let i = 0; i < 4; i++) {
      const c = await openBgClient(srv.wsBaseUrl, { matchId: lobbyMeta.matchId });
      c.send({ type: 'BG_JOIN', matchId: lobbyMeta.matchId, inviteCode: lobbyMeta.inviteCode, displayName: `Rdy_${i}`, preferredSeatIndex: i });
      const auth = await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
      await c.nextMsg((m) => m.type === 'BG_STATE_SYNC');
      lClients.push({ c, auth });
    }
    for (let i = 1; i < 4; i++) {
      lClients[i].c.send({ type: 'BG_SET_READY', ready: true, requestId: `rcheck-${i}` });
    }
    await lClients[0].c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'READY_CHECK');
    // P2 disconnect -> status drops to WAITING -> P2 reconnect -> recomputes READY_CHECK!
    lClients[1].c.close();
    await lClients[0].c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'WAITING');
    const p2Re = await openBgClient(srv.wsBaseUrl, { matchId: lobbyMeta.matchId });
    p2Re.send({
      type: 'BG_JOIN',
      matchId: lobbyMeta.matchId,
      displayName: 'Rdy_1',
      reconnectToken: lClients[1].auth.reconnectToken,
    });
    const restoredReady = await lClients[0].c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'READY_CHECK');
    assert.equal(restoredReady.status, 'READY_CHECK');
    p2Re.close();
    lClients.forEach(({ c }, i) => { if (i !== 1) c.close(); });

    // 2. Orphan CREATED cleanup past BOARD_GAME_RECONNECT_HOLD_MS
    const orphanRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-2', hostName: 'OrphanHost' }),
    });
    const orphan = await orphanRes.json();
    const orphanContainer = srv.containers.get(orphan.matchId);
    orphanContainer.ctx.storage.sql.exec(
      'UPDATE matches SET created_at_ms = ? WHERE match_id = ?',
      Date.now() - BOARD_GAME_RECONNECT_HOLD_MS - 5000,
      orphan.matchId,
    );
    await fetch(`${srv.httpBaseUrl}/__bg_trigger_alarm?matchId=${orphan.matchId}`, { method: 'POST' });
    const orphanRow = orphanContainer.ctx.storage.sql
      .exec('SELECT status FROM matches WHERE match_id = ?', orphan.matchId)
      .one();
    assert.equal(orphanRow.status, 'CLOSED');

    // 3. Abandoned all-disconnected PLAYING cleanup past BOARD_GAME_ABANDONED_MATCH_TTL_MS
    const mAbd = await setupStartedMatch(srv, 'table-1', ['AB1', 'AB2', 'AB3', 'AB4']);
    mAbd.clients.forEach(({ c }) => c.close());
    await delay(50);
    const abdContainer = srv.containers.get(mAbd.matchId);
    abdContainer.ctx.storage.sql.exec(
      'UPDATE match_players SET connected = 0, last_seen_ms = ?',
      Date.now() - BOARD_GAME_ABANDONED_MATCH_TTL_MS - 5000,
    );
    await fetch(`${srv.httpBaseUrl}/__bg_trigger_alarm?matchId=${mAbd.matchId}`, { method: 'POST' });
    const abdRow = abdContainer.ctx.storage.sql
      .exec('SELECT status, turn_deadline_ms FROM matches WHERE match_id = ?', mAbd.matchId)
      .one();
    assert.equal(abdRow.status, 'CLOSED');
    assert.equal(abdRow.turn_deadline_ms, null);

    // 4. Health endpoint returns clean metrics without secret exposure
    const healthRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/health`);
    assert.equal(healthRes.status, 200);
    const healthJson = await healthRes.json();
    assert.equal(healthJson.ok, true);
    assert.equal(healthJson.component, 'boardgame');
    assert.ok(healthJson.metrics && typeof healthJson.metrics.counts.MATCH_CREATED === 'number');
  });

  await t.test('(8) Structured observability logs emit full lifecycle without secret leakage', async () => {
    const capturedLogs = [];
    resetBoardGameObservabilityForTest();
    setBoardGameLogSink((entry) => capturedLogs.push(entry));
    t.after(() => setBoardGameLogSink(null));

    const m = await setupStartedMatch(srv, 'table-2', ['SV 20226010', 'LogB', 'LogC', 'LogD'], { turnTimeoutMs: 1500 });
    const tokens = m.clients.map((cl) => cl.auth.reconnectToken);

    const sync0 = m.clients[0].c.getLatestSync();
    const actor = m.clients.find((cl) => cl.playerId === sync0.publicGame.activePlayerId);
    // Emit ACTION_APPLIED and ACTION_REJECTED
    actor.c.send({
      type: 'BG_GAME_ACTION',
      requestId: 'log-act-1',
      expectedRevision: sync0.revision,
      action: { type: 'STAY' },
    });
    await actor.c.nextMsg((msg) => msg.type === 'BG_ACTION_ACK' && msg.requestId === 'log-act-1');
    await actor.c.nextMsg((msg) => msg.type === 'BG_STATE_SYNC' && msg.revision === sync0.revision + 1);
    await delay(40);
    actor.c.send({
      type: 'BG_GAME_ACTION',
      requestId: 'log-act-bad',
      expectedRevision: sync0.revision + 1,
      action: { type: 'END_TURN' },
    });
    await actor.c.nextMsg((msg) => msg.type === 'BG_ACTION_ACK' && msg.requestId === 'log-act-bad');

    // Emit PLAYER_DISCONNECTED & PLAYER_RECONNECTED
    m.clients[1].c.close();
    await delay(40);
    const c1Re = await openBgClient(srv.wsBaseUrl, { matchId: m.matchId });
    c1Re.send({
      type: 'BG_JOIN',
      matchId: m.matchId,
      displayName: 'SV 20226010',
      reconnectToken: m.clients[1].auth.reconnectToken,
    });
    await c1Re.nextMsg((msg) => msg.type === 'BG_AUTH_ISSUED');
    await c1Re.nextMsg((msg) => msg.type === 'BG_STATE_SYNC');

    // Emit TURN_TIMEOUT via alarm
    await delay(1600);
    await fetch(`${srv.httpBaseUrl}/__bg_trigger_alarm?matchId=${m.matchId}`, { method: 'POST' });

    c1Re.close();
    m.clients.forEach(({ c }, i) => { if (i !== 1) c.close(); });
    await delay(40);

    const eventSet = new Set(capturedLogs.map((e) => e.event));
    for (const reqEvent of [
      'MATCH_CREATED',
      'PLAYER_JOINED',
      'MATCH_STARTED',
      'ACTION_APPLIED',
      'ACTION_REJECTED',
      'PLAYER_DISCONNECTED',
      'PLAYER_RECONNECTED',
      'TURN_TIMEOUT',
    ]) {
      assert.ok(eventSet.has(reqEvent), `Structured log missing event ${reqEvent}`);
    }

    const logBlob = JSON.stringify(capturedLogs);
    assert.equal(logBlob.includes('20226010'), false, 'Logs must scrub 8-digit MSSV');
    for (const tok of tokens) {
      assert.equal(logBlob.includes(tok), false, 'Logs must never contain plaintext reconnectToken');
    }
    for (const forbiddenField of [
      '"roleId"',
      '"privateClues"',
      '"privateNotes"',
      '"protegePlayerId"',
      '"reconnectToken"',
      '"rngState"',
      '"hand"',
      '"maxHp"',
    ]) {
      assert.equal(logBlob.includes(forbiddenField), false, `Logs must never contain ${forbiddenField}`);
    }
  });
});
