/**
 * test/boardgame-match-do.test.cjs — Kiểm thử Durable Object `BoardGameRoom`
 * tích hợp Full Gameplay Engine "Bóng Đêm KTX — Secrets After Dark" (BG3):
 *  (1) Ván 4 người + 1 khán giả chơi tới `FINISHED` trên WS + SQLite DO thật;
 *      kiểm toán TỪNG WS frame đảm bảo P0 isolation (khán giả `privateView === null`,
 *      tuyệt đối không lộ vai chưa lật / tay bài / ghi chú / token / MSSV sang người khác)
 *  (2) Idempotency theo `requestId` (`processed_requests`) + `STALE_REVISION` resync
 *  (3) Bàn 8 người với `alarm()` timeout auto-turn + Hibernation `/__bg_hibernate`
 *      + F5/reconnect khôi phục nguyên vẹn vai bí mật & bài trên tay + Chơi ván mới
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { WebSocket } = require('./ws-shim/mini-ws');
const {
  startStandaloneBoardGameTestServer,
} = require('./ws-shim/boardgame-do-harness.cjs');
const { listLegalMovesForLocation } = require('../features/boardgame/domain/index.ts');

function assertPublicGameNoV1OrSecretLeaks(pub, status) {
  assert.equal(pub.rulesetVersion, 2);
  const raw = JSON.stringify(pub);
  const alwaysForbidden = [
    '"secretSabotageLocation":',
    '"signalProgress":',
    '"mistProgress":',
    '"maxTrackValue":',
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
  };
}

test('BG3 DO Authoritative Match & P0 Security Suite', async (t) => {
  const srv = await startStandaloneBoardGameTestServer(0);
  t.after(async () => {
    await srv.close();
  });

  await t.test('(1) Full 4p + Spectator match to FINISHED + per-frame P0 secret & zero-MSSV audit', async () => {
    const createRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-1', hostName: 'Minh 20229999' }),
    });
    assert.equal(createRes.status, 201);
    const { matchId, inviteCode } = await createRes.json();

    const players = [];
    const tokens = [];
    const rawNames = ['Minh 20221111', 'Lan 20222222', 'Khánh 20223333', 'Hải 20224444'];
    const mssvList = ['20221111', '20222222', '20223333', '20224444', '20229999'];

    for (let i = 0; i < 4; i++) {
      const c = await openBgClient(srv.wsBaseUrl, { matchId });
      c.send({
        type: 'BG_JOIN',
        matchId,
        inviteCode,
        displayName: rawNames[i],
      });
      const auth = await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
      tokens.push(auth.reconnectToken);
      players.push({ c, auth, playerId: auth.playerId });
    }

    // Khán giả tham gia chỉ xem
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

    // 3 người không phải host bấm sẵn sàng -> Host bắt đầu
    for (let i = 1; i < 4; i++) {
      const lenBefore = players[0].c.inbox.length;
      players[i].c.send({ type: 'BG_SET_READY', ready: true, requestId: `rdy-${i}` });
      await players[0].c.nextMsg((m) => m.type === 'BG_STATE_SYNC', 4000, lenBefore);
    }

    players[0].c.send({ type: 'BG_START_MATCH', requestId: 'start-4p' });
    for (const p of players) {
      await p.c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING');
    }
    const specStartSync = await spectator.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING',
    );
    assert.equal(specStartSync.privateView, null);

    // Khán giả thử gửi lệnh chơi -> SPECTATOR_READ_ONLY
    const specLenBefore = spectator.inbox.length;
    spectator.send({
      type: 'BG_GAME_ACTION',
      requestId: 'spec-cheat',
      expectedRevision: specStartSync.revision,
      action: { type: 'END_TURN' },
    });
    const specErr = await spectator.nextMsg(
      (m) => m.type === 'BG_ERROR' && m.code === 'SPECTATOR_READ_ONLY',
      4000,
      specLenBefore,
    );
    assert.ok(specErr);

    // Ghi nhận vai/bài thật khởi đầu của từng người từ server DO SQLite để audit rò rỉ frame
    const container = srv.containers.get(matchId);
    const initialEngine = JSON.parse(
      container.ctx.storage.sql.exec('SELECT game_state_json FROM matches').one().game_state_json,
    ).engineState;
    const roleById = new Map(initialEngine.players.map((ep) => [ep.playerId, ep.roleId]));

    // Chơi ván v2 hợp lệ qua WS cho tới khi FINISHED
    let actionSeq = 0;
    let safety = 0;
    let plantedRound = null;
    while (players[0].c.getLatestSync().status === 'PLAYING' && safety < 180) {
      safety += 1;
      const latest = players[0].c.getLatestSync();
      const pub = latest.publicGame;
      if (!pub || pub.turnPhase === 'ENDED') break;

      const actorEntry = players.find((p) => p.playerId === pub.activePlayerId);
      assert.ok(actorEntry, 'Active player must exist');
      const actorSync = actorEntry.c.getLatestSync();
      const actorPub = actorSync.publicGame.players.find((x) => x.playerId === actorEntry.playerId);

      let act;
      if (pub.turnPhase === 'MOVE') {
        const adj = listLegalMovesForLocation(actorPub.location);
        const preferred =
          actorSync.privateView?.secretSabotageLocation &&
          adj.includes(actorSync.privateView.secretSabotageLocation)
            ? actorSync.privateView.secretSabotageLocation
            : adj.find((id) => id === 'corridor' || id === 'radio' || id === 'breaker') ?? adj[0];
        act = { type: 'MOVE', location: preferred };
      } else if (pub.turnPhase === 'DRAW_OR_EXPLORE') {
        if (
          actorSync.privateView?.secretSabotageLocation === actorPub.location &&
          !pub.sabotageArmed &&
          plantedRound === null &&
          pub.blackoutLocation !== actorPub.location
        ) {
          plantedRound = pub.round;
          act = { type: 'INTERACT_LOC', mode: 'sabotage' };
        } else if (pub.blackoutLocation !== actorPub.location) {
          act = { type: 'INTERACT_LOC', mode: 'scan' };
        } else {
          act = { type: 'DRAW_CARD', deck: 'clue' };
        }
      } else if (pub.turnPhase === 'TACTICAL_ACTION') {
        if (
          actorSync.privateView?.faction === 'mist-order' &&
          pub.sabotageArmed &&
          plantedRound !== null &&
          pub.round > plantedRound &&
          actorPub.location === actorSync.privateView.secretSabotageLocation
        ) {
          act = { type: 'DETONATE_PLOT' };
        } else {
          act = { type: 'END_TURN' };
        }
      }

      actionSeq += 1;
      const reqId = `act-${actionSeq}`;
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

      // Đợi cả 4 người & khán giả đồng bộ revision mới nhất
      await Promise.all([
        ...players.map((p) =>
          p.c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.revision >= ack.revision),
        ),
        spectator.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.revision >= ack.revision),
      ]);
      await delay(28);
    }

    const finalSync = players[0].c.getLatestSync();
    assert.equal(finalSync.status, 'FINISHED', 'Ván 4 người phải đạt trạng thái FINISHED');
    assert.ok(finalSync.publicGame.finalReveal && finalSync.publicGame.finalReveal.length === 4);

    // Audit TOÀN BỘ WS frame nhận được của cả 4 người chơi & khán giả:
    // - Zero MSSV trong tất cả frame
    // - Khán giả luôn có privateView === null
    // - Trong khi status === 'PLAYING', không frame nào gửi tới player i chứa roleId chưa lật của player j != i
    for (const msg of spectator.inbox) {
      for (const mssv of mssvList) {
        assert.equal(msg.__raw.includes(mssv), false, `Spectator leaked MSSV ${mssv}`);
      }
      if (msg.type === 'BG_STATE_SYNC') {
        assert.equal(msg.privateView, null, 'Khán giả không bao giờ nhận privateView');
        if (msg.publicGame) {
          assertPublicGameNoV1OrSecretLeaks(msg.publicGame, msg.status);
        }
        if (msg.status === 'PLAYING' && msg.publicGame) {
          for (const pp of msg.publicGame.players) {
            if (!pp.revealedRoleId) {
              assert.equal(
                msg.__raw.includes(roleById.get(pp.playerId)),
                false,
                `Spectator frame during PLAYING leaked hidden role ${roleById.get(pp.playerId)}`,
              );
            }
          }
        }
      }
    }

    for (let i = 0; i < players.length; i++) {
      for (const msg of players[i].c.inbox) {
        for (const mssv of mssvList) {
          assert.equal(msg.__raw.includes(mssv), false, `Player ${i} frame leaked MSSV ${mssv}`);
        }
        if (msg.type === 'BG_STATE_SYNC') {
          if (msg.publicGame) {
            assertPublicGameNoV1OrSecretLeaks(msg.publicGame, msg.status);
          }
          if (msg.privateView) {
            assert.equal(msg.privateView.playerId, players[i].playerId);
          }
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

    // Kiểm tra luồng Chơi lại ("Sẵn sàng ván mới": FINISHED -> WAITING -> READY_CHECK -> PLAYING)
    const beforeRematchLen = players[0].c.inbox.length;
    players[0].c.send({ type: 'BG_SET_READY', ready: true, requestId: 'rematch-0' });
    const waitingAfterFinish = await players[0].c.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.status === 'WAITING',
      4000,
      beforeRematchLen,
    );
    assert.equal(waitingAfterFinish.publicGame, null);

    spectator.close();
    players.forEach(({ c }) => c.close());
  });

  await t.test('(2) Idempotency (processed_requests) & STALE_REVISION resync', async () => {
    const createRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-2', hostName: 'Chủ Bàn' }),
    });
    const { matchId, inviteCode } = await createRes.json();

    const clients = [];
    for (let i = 0; i < 4; i++) {
      const c = await openBgClient(srv.wsBaseUrl, { matchId });
      c.send({ type: 'BG_JOIN', matchId, inviteCode, displayName: `SV${i}` });
      await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
      clients.push(c);
    }
    for (let i = 1; i < 4; i++) {
      const idxBefore = clients[0].inbox.length;
      clients[i].send({ type: 'BG_SET_READY', ready: true, requestId: `r2-${i}` });
      await clients[0].nextMsg((m) => m.type === 'BG_STATE_SYNC', 4000, idxBefore);
    }
    clients[0].send({ type: 'BG_START_MATCH', requestId: 'start-idem' });
    const startSync = await clients[0].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING',
    );
    const revAtStart = startSync.revision;
    const startActor = startSync.publicGame.players.find(
      (p) => p.playerId === startSync.publicGame.activePlayerId,
    );
    const adjMoveDest = listLegalMovesForLocation(startActor.location)[0];

    // Gửi trùng lặp 1 requestId hai lần liên tiếp (không delay -> kiểm chứng chạy trước rate limit!)
    const lenBefore = clients[0].inbox.length;
    const payload = {
      type: 'BG_GAME_ACTION',
      requestId: 'idem-move-1',
      expectedRevision: revAtStart,
      action: { type: 'MOVE', location: adjMoveDest },
    };
    clients[0].send(payload);
    clients[0].send(payload);

    const ack1 = await clients[0].nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'idem-move-1',
      4000,
      lenBefore,
    );
    assert.equal(ack1.ok, true);
    assert.equal(ack1.revision, revAtStart + 1);

    const ack1Idx = clients[0].inbox.indexOf(ack1);
    const ack2 = await clients[0].nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'idem-move-1',
      4000,
      ack1Idx + 1,
    );
    assert.equal(ack2.ok, true);
    assert.equal(ack2.revision, ack1.revision, 'Retry trùng requestId phải trả đúng revision cũ, không tăng thêm');

    const afterSync = clients[0].getLatestSync();
    assert.equal(afterSync.revision, revAtStart + 1);
    assert.equal(afterSync.publicGame.turnPhase, 'DRAW_OR_EXPLORE');

    await delay(30);
    // Gửi lệnh với expectedRevision lỗi thời (1) -> nhận STALE_REVISION + resync
    const staleLen = clients[0].inbox.length;
    clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'stale-req-1',
      expectedRevision: 1,
      action: { type: 'DRAW_CARD', deck: 'event' },
    });
    const staleErr = await clients[0].nextMsg(
      (m) => m.type === 'BG_ERROR' && m.code === 'STALE_REVISION',
      4000,
      staleLen,
    );
    assert.equal(staleErr.revision, revAtStart + 1);

    clients.forEach((c) => c.close());
  });

  await t.test('(3) 8-player alarm() timeout auto-turn + mid-game hibernation & reconnect preserves role/hand', async () => {
    const createRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-1', hostName: 'Bàn 8 Người', turnTimeoutMs: 1500 }),
    });
    const { matchId, inviteCode } = await createRes.json();

    const clients = [];
    const auths = [];
    for (let i = 0; i < 8; i++) {
      const c = await openBgClient(srv.wsBaseUrl, { matchId });
      c.send({ type: 'BG_JOIN', matchId, inviteCode, displayName: `P${i + 1}` });
      const auth = await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
      clients.push(c);
      auths.push(auth);
    }

    for (let i = 1; i < 8; i++) {
      const idxBefore = clients[0].inbox.length;
      clients[i].send({ type: 'BG_SET_READY', ready: true, requestId: `r8-${i}` });
      await clients[0].nextMsg((m) => m.type === 'BG_STATE_SYNC', 4000, idxBefore);
    }

    clients[0].send({ type: 'BG_START_MATCH', requestId: 'start-8p', turnTimeoutMs: 1500 });
    const startSync0 = await clients[0].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING',
    );
    const startSync3 = await clients[3].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING',
    );
    assert.equal(startSync0.publicGame.players.length, 8);
    const p3RoleBefore = startSync3.privateView.roleId;
    const p3HandBefore = startSync3.privateView.hand.map((c) => c.id);

    // Chờ hết turnTimeoutMs (1500ms) và kích hoạt DO alarm()
    await delay(1600);
    const alarmRes = await fetch(`${srv.httpBaseUrl}/__bg_trigger_alarm?matchId=${matchId}`, {
      method: 'POST',
    });
    assert.equal(alarmRes.status, 200);

    const afterAlarmSync = await clients[1].nextMsg(
      (m) =>
        m.type === 'BG_STATE_SYNC' &&
        m.revision > startSync0.revision &&
        m.publicGame?.activePlayerId === auths[1].playerId,
    );
    assert.equal(afterAlarmSync.publicGame.turnPhase, 'MOVE');
    assert.ok(
      afterAlarmSync.publicGame.publicLog.some((l) => l.kind === 'timeout'),
      'Phải ghi nhận timeout auto-turn trong nhật ký công khai',
    );

    // Hibernation DO giữa ván + Người chơi #3 đóng tab cũ & reconnect bằng reconnectToken
    const hibRes = await fetch(`${srv.httpBaseUrl}/__bg_hibernate?matchId=${matchId}`, {
      method: 'POST',
    });
    assert.equal(hibRes.status, 200);

    clients[3].close();
    await delay(40);

    const p3Reconn = await openBgClient(srv.wsBaseUrl, { matchId });
    p3Reconn.send({
      type: 'BG_JOIN',
      matchId,
      displayName: 'P4 Quay Lại',
      reconnectToken: auths[3].reconnectToken,
    });
    const reAuth = await p3Reconn.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    assert.equal(reAuth.playerId, auths[3].playerId);
    assert.equal(reAuth.seatIndex, 3);

    const reSync = await p3Reconn.nextMsg((m) => m.type === 'BG_STATE_SYNC');
    assert.equal(reSync.status, 'PLAYING');
    assert.equal(reSync.privateView.roleId, p3RoleBefore);
    assert.deepEqual(
      reSync.privateView.hand.map((c) => c.id),
      p3HandBefore,
    );

    p3Reconn.close();
    clients.forEach((c, idx) => {
      if (idx !== 3) c.close();
    });
  });

  await t.test('(4) Legacy v1 SQLite row graceful adaptation & clean v2 rematch', async () => {
    const createRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-2', hostName: 'LegacyCheck' }),
    });
    const { matchId, inviteCode } = await createRes.json();

    const clients = [];
    const auths = [];
    for (let i = 0; i < 4; i++) {
      const c = await openBgClient(srv.wsBaseUrl, { matchId });
      c.send({ type: 'BG_JOIN', matchId, inviteCode, displayName: `LV${i + 1}` });
      const auth = await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
      clients.push(c);
      auths.push(auth);
    }
    for (let i = 1; i < 4; i++) {
      const lenBefore = clients[0].inbox.length;
      clients[i].send({ type: 'BG_SET_READY', ready: true, requestId: `lv-rdy-${i}` });
      await clients[0].nextMsg((m) => m.type === 'BG_STATE_SYNC', 4000, lenBefore);
    }
    clients[0].send({ type: 'BG_START_MATCH', requestId: 'lv-start' });
    const startSync = await clients[0].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING',
    );

    // Overwrite DO SQLite row with legacy v1 shape (no rulesetVersion, deprecated keys)
    const container = srv.containers.get(matchId);
    const legacyBlob = JSON.stringify({
      engineState: {
        matchId,
        round: 3,
        maxRounds: 7,
        signalProgress: 4,
        mistProgress: 2,
        players: auths.map((a, idx) => ({
          playerId: a.playerId,
          displayName: `LV${idx + 1}`,
          seatIndex: idx,
          roleId: 'hieu-minh',
          location: 'lobby',
          alive: true,
          connected: true,
          hp: 10,
          maxHp: 10,
        })),
      },
    });
    container.ctx.storage.sql.exec(
      'UPDATE matches SET game_state_json = ? WHERE match_id = ?',
      legacyBlob,
      matchId,
    );

    // Hibernating & reconnecting or sending action cleanly transitions legacy match to FINISHED without crash
    const beforeActLen = clients[0].inbox.length;
    clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'lv-act-1',
      expectedRevision: startSync.revision,
      action: { type: 'END_TURN' },
    });
    const legacyFinished = await clients[0].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.status === 'FINISHED',
      4000,
      beforeActLen,
    );
    assert.equal(legacyFinished.publicGame.rulesetVersion, 2);
    assert.match(legacyFinished.publicGame.winnerLabel, /Luật v2/);

    // Players can immediately ready up & start a clean v2 rematch
    const beforeReady = clients[0].inbox.length;
    for (let i = 1; i < 4; i++) {
      clients[i].send({ type: 'BG_SET_READY', ready: true, requestId: `lv-re-${i}` });
    }
    await clients[0].nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'READY_CHECK', 4000, beforeReady);
    clients[0].send({ type: 'BG_START_MATCH', requestId: 'lv-rematch' });
    const rematchPlaying = await clients[0].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING',
      4000,
      beforeReady,
    );
    assert.equal(rematchPlaying.publicGame.rulesetVersion, 2);

    clients.forEach((c) => c.close());
  });
});
