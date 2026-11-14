/**
 * test/boardgame-lobby-do.test.cjs — Kiểm thử Durable Object `BoardGameRoom`
 * trên nền SQLite thật + WebSocket + Hibernation (BG2):
 *  (1) 4 client tạo phòng / vào bằng mã mời, ghế 0..3 duy nhất, Sẵn sàng -> READY_CHECK -> PLAYING
 *  (2) 8 client lấp đủ ghế 0..7; người thứ 9 bị từ chối (`ROOM_FULL`); khán giả chỉ xem (`SPECTATOR_READ_ONLY`)
 *  (3) 2 trận song song độc lập + liệt kê qua `/api/boardgame/matches` (không lộ token/MSSV)
 *  (4) Reconnect bằng `reconnectToken` đóng tab cũ với close code `4001` mà không rớt chỗ
 *  (5) Hibernation `/__bg_hibernate` khởi tạo lại DO mới từ SQLite mà giữ nguyên sảnh/ghế/host
 *  (6) Host ngắt kết nối tự chuyển quyền chủ bàn & chặn `Origin` lạ (HTTP 403)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { WebSocket } = require('./ws-shim/mini-ws');
const {
  startStandaloneBoardGameTestServer,
} = require('./ws-shim/boardgame-do-harness.cjs');

async function openBgClient(wsBaseUrl, params) {
  const qs = new URLSearchParams({ matchId: params.matchId });
  const ws = new WebSocket(`${wsBaseUrl}/ws/boardgame?${qs.toString()}`);
  const inbox = [];
  const waiters = [];
  let closeEvent = null;

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    inbox.push(msg);
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
    closeEvent = { code, reason };
    for (let i = waiters.length - 1; i >= 0; i--) {
      const w = waiters[i];
      if (w.onCloseResolve) {
        waiters.splice(i, 1);
        clearTimeout(w.timer);
        w.resolve({ __closed: true, code, reason });
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
        onCloseResolve: false,
        timer: setTimeout(() => {
          const idx = waiters.indexOf(entry);
          if (idx >= 0) waiters.splice(idx, 1);
          reject(new Error(`Timed out waiting for WS message (${inbox.length} received)`));
        }, timeoutMs),
      };
      waiters.push(entry);
    });
  }

  function waitClosed(timeoutMs = 4000) {
    if (closeEvent) return Promise.resolve(closeEvent);
    return new Promise((resolve, reject) => {
      const entry = {
        predicate: () => false,
        onCloseResolve: true,
        resolve: (v) => resolve(v),
        timer: setTimeout(() => {
          const idx = waiters.indexOf(entry);
          if (idx >= 0) waiters.splice(idx, 1);
          reject(new Error('Timed out waiting for WS close'));
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

  return { ws, inbox, nextMsg, waitClosed, send, close, getCloseEvent: () => closeEvent };
}

test('BG2 DO SQLite & Lobby Protocol Full Suite', async (t) => {
  const srv = await startStandaloneBoardGameTestServer(0);
  t.after(async () => {
    await srv.close();
  });

  await t.test('(1) 4 clients create/join via inviteCode, READY_CHECK & start PLAYING (hashed tokens in SQLite)', async () => {
    const createRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-1', hostName: 'An Bách Khoa 20226010' }),
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.ok(created.ok);
    assert.match(created.inviteCode, /^[A-HJ-NP-Z2-9]{6}$/);

    // Tra cứu mã mời qua /api/boardgame/join-by-code
    const lookupRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/join-by-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode: created.inviteCode.toLowerCase() }),
    });
    assert.equal(lookupRes.status, 200);
    const lookupData = await lookupRes.json();
    assert.equal(lookupData.match.matchId, created.matchId);
    // Đảm bảo MSSV "20226010" bị che sạch trong tên hiển thị
    assert.ok(!lookupData.match.hostName.includes('20226010'));

    const clients = [];
    const tokens = [];
    const names = ['Minh', 'Lan', 'Khánh', 'Hải'];

    for (let i = 0; i < 4; i++) {
      const c = await openBgClient(srv.wsBaseUrl, { matchId: created.matchId });
      c.send({
        type: 'BG_JOIN',
        matchId: created.matchId,
        inviteCode: created.inviteCode,
        displayName: names[i],
      });
      const auth = await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
      assert.equal(auth.seatIndex, i);
      assert.ok(auth.reconnectToken.length >= 24);
      tokens.push(auth.reconnectToken);
      clients.push({ c, auth });
    }

    // Bảo mật: không socket nào khác nhận được reconnectToken của người khác
    for (let i = 0; i < 4; i++) {
      const leakedOtherToken = clients[0].c.inbox.some((m) => {
        const s = JSON.stringify(m);
        return i !== 0 && s.includes(tokens[i]);
      });
      assert.equal(leakedOtherToken, false, 'Không bao giờ broadcast reconnectToken sang client khác');
    }

    // Kiểm tra SQLite chỉ lưu SHA-256 hash thay vì plaintext reconnectToken
    const doContainer = srv.containers.get(created.matchId);
    const dbRows = doContainer.ctx.storage.sql
      .exec('SELECT player_id, seat_index, reconnect_token_hash FROM match_players')
      .toArray();
    assert.equal(dbRows.length, 4);
    for (const row of dbRows) {
      assert.match(row.reconnect_token_hash, /^[0-9a-f]{64}$/);
      assert.ok(!tokens.includes(row.reconnect_token_hash));
    }

    // Chưa đủ sẵn sàng -> host bắt đầu phải bị từ chối NOT_READY
    const markLen = clients[0].c.inbox.length;
    clients[0].c.send({ type: 'BG_START_MATCH', requestId: 's-early' });
    const notReadyErr = await clients[0].c.nextMsg(
      (m) => m.type === 'BG_ERROR' && m.code === 'NOT_READY',
      4000,
      markLen,
    );
    assert.ok(notReadyErr.message);

    // 3 người còn lại bấm Sẵn sàng -> READY_CHECK
    for (let i = 1; i < 4; i++) {
      const idxBefore = clients[0].c.inbox.length;
      clients[i].c.send({ type: 'BG_SET_READY', ready: true, requestId: `rdy-${i}` });
      await clients[0].c.nextMsg((m) => m.type === 'BG_STATE_SYNC', 4000, idxBefore);
    }
    const readySync = [...clients[0].c.inbox].reverse().find((m) => m.type === 'BG_STATE_SYNC');
    assert.equal(readySync.status, 'READY_CHECK');

    // Host bắt đầu -> PLAYING
    const startBefore = clients[1].c.inbox.length;
    clients[0].c.send({ type: 'BG_START_MATCH', requestId: 's-ok' });
    const playingSync = await clients[1].c.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING',
      4000,
      startBefore,
    );
    assert.equal(playingSync.players.length, 4);
    assert.ok(playingSync.publicGame);
    assert.equal(playingSync.publicGame.round, 1);

    clients.forEach(({ c }) => c.close());
  });

  await t.test('(2) 8 seated max, 9th rejected ROOM_FULL, spectator strictly read-only', async () => {
    const res = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-2', hostName: 'Bình' }),
    });
    const { matchId, inviteCode } = await res.json();

    const seated = [];
    for (let i = 0; i < 8; i++) {
      const c = await openBgClient(srv.wsBaseUrl, { matchId });
      c.send({ type: 'BG_JOIN', matchId, inviteCode, displayName: `SV${i}` });
      const auth = await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
      assert.equal(auth.seatIndex, i);
      seated.push(c);
    }

    // Người thứ 9 muốn ngồi -> ROOM_FULL
    const c9 = await openBgClient(srv.wsBaseUrl, { matchId });
    c9.send({ type: 'BG_JOIN', matchId, inviteCode, displayName: 'SV8' });
    const fullErr = await c9.nextMsg((m) => m.type === 'BG_ERROR' && m.code === 'ROOM_FULL');
    assert.ok(fullErr.message.includes('8/8'));

    // Người thứ 9 vào với chế độ khán giả -> được phép và read-only
    const cSpec = await openBgClient(srv.wsBaseUrl, { matchId });
    cSpec.send({ type: 'BG_JOIN', matchId, inviteCode, displayName: 'Khán giả 1', asSpectator: true });
    const specAuth = await cSpec.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    assert.equal(specAuth.isSpectator, true);
    assert.equal(specAuth.seatIndex, null);

    cSpec.send({ type: 'BG_SELECT_SEAT', seatIndex: 0, requestId: 'spec-sit' });
    const roErr = await cSpec.nextMsg(
      (m) => m.type === 'BG_ERROR' && m.code === 'SPECTATOR_READ_ONLY',
    );
    assert.equal(roErr.requestId, 'spec-sit');

    // Người chơi 1 chọn ghế đang có người ngồi -> SEAT_TAKEN
    seated[1].send({ type: 'BG_SELECT_SEAT', seatIndex: 0, requestId: 'dup-seat' });
    const takenErr = await seated[1].nextMsg(
      (m) => m.type === 'BG_ERROR' && m.code === 'SEAT_TAKEN',
    );
    assert.equal(takenErr.requestId, 'dup-seat');

    seated.forEach((c) => c.close());
    c9.close();
    cSpec.close();
  });

  await t.test('(3) 2 parallel matches isolated + directory listing clean', async () => {
    const rA = await (
      await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: 'table-1', hostName: 'Trận A' }),
      })
    ).json();
    const rB = await (
      await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: 'table-2', hostName: 'Trận B' }),
      })
    ).json();
    assert.notEqual(rA.matchId, rB.matchId);
    assert.notEqual(rA.inviteCode, rB.inviteCode);

    const cA = await openBgClient(srv.wsBaseUrl, { matchId: rA.matchId });
    cA.send({ type: 'BG_JOIN', matchId: rA.matchId, displayName: 'Khách A' });
    await cA.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.players.length === 1);

    const listData = await (await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`)).json();
    assert.ok(listData.ok);
    const sumA = listData.matches.find((m) => m.matchId === rA.matchId);
    const sumB = listData.matches.find((m) => m.matchId === rB.matchId);
    assert.ok(sumA && sumB);
    assert.equal(sumA.playerCount, 1);
    assert.equal(sumB.playerCount, 0);
    assert.equal(JSON.stringify(listData).includes('reconnect'), false);

    cA.close();
  });

  await t.test('(4 & 5) Token reconnect 4001 fence + Hibernation wakeup from SQLite + Host transfer + Origin guard', async () => {
    // Origin lạ phải bị chặn HTTP 403
    const evilRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil-phish.example',
      },
      body: JSON.stringify({ tableId: 'table-1', hostName: 'Bad' }),
    });
    assert.equal(evilRes.status, 403);

    const created = await (
      await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: 'table-1', hostName: 'Host1' }),
      })
    ).json();

    const c1 = await openBgClient(srv.wsBaseUrl, { matchId: created.matchId });
    c1.send({ type: 'BG_JOIN', matchId: created.matchId, displayName: 'Host1' });
    const auth1 = await c1.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');

    const c2 = await openBgClient(srv.wsBaseUrl, { matchId: created.matchId });
    c2.send({ type: 'BG_JOIN', matchId: created.matchId, displayName: 'Peer2' });
    const auth2 = await c2.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    assert.equal(auth2.seatIndex, 1);

    // Kích hoạt Hibernation: re-instantiate BoardGameRoom từ SQLite
    const hibRes = await fetch(`${srv.httpBaseUrl}/__bg_hibernate?matchId=${created.matchId}`);
    assert.equal(hibRes.status, 200);

    // Mở tab mới dùng reconnectToken của Host1 -> tab cũ c1 phải bị đóng với mã 4001!
    const c1New = await openBgClient(srv.wsBaseUrl, { matchId: created.matchId });
    c1New.send({
      type: 'BG_JOIN',
      matchId: created.matchId,
      displayName: 'Host1 Tab Mới',
      reconnectToken: auth1.reconnectToken,
    });
    const closedInfo = await c1.waitClosed(4000);
    assert.equal(closedInfo.code, 4001);

    const auth1New = await c1New.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    assert.equal(auth1New.playerId, auth1.playerId);
    assert.equal(auth1New.seatIndex, 0);

    // Host1 Tab Mới rời hẳn (`BG_LEAVE`) -> Peer2 phải được tự động thăng chức làm host mới
    const beforeLeave = c2.inbox.length;
    c1New.send({ type: 'BG_LEAVE' });
    const hostTransferSync = await c2.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.hostPlayerId === auth2.playerId,
      4000,
      beforeLeave,
    );
    assert.equal(hostTransferSync.players.length, 1);

    c2.close();
  });
});
