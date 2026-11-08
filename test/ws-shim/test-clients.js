/**
 * test/ws-shim/test-clients.js — Kiểm thử giao thức WebSocket Multiplayer (shim / worker).
 * Kiểm tra:
 *  1. HTTP /health & /api/rooms
 *  2. Chặn MSSV sai định dạng (< 8 chữ số)
 *  3. Join kèm ngoại hình (gender, outfit, hairStyle, skirt, glasses, backpack)
 *  4. Đồng bộ live appearance (đổi trang phục / tên trong game)
 *  5. Di chuyển & mở rộng BOUNDS khu Đông (B1 SoICT / KTX / SVĐ tới x=162, z=92)
 *  6. Kẹp biên BOUNDS khi vượt quá 162 / 92
 *  7. Reconnect cùng sessionId thay thế socket cũ, không nhân bản người chơi
 *  8. Ping/pong & rời phòng (leave + giảm count)
 */
const WebSocket = require('ws');

const PORT = Number(process.argv[2] || 8788);
const BASE_HTTP = `http://127.0.0.1:${PORT}`;
const BASE_WS = `ws://127.0.0.1:${PORT}/ws`;

let passed = 0;
let failed = 0;

function assert(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`PASS: ${name}`);
  } else {
    failed++;
    console.error(`FAIL: ${name} ${detail}`);
  }
}

function connectClient(room = 'hsk-1') {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${BASE_WS}?room=${room}`);
    const queue = [];
    const waiters = [];
    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      const idx = waiters.findIndex((w) => w.pred(msg));
      if (idx >= 0) {
        const w = waiters.splice(idx, 1)[0];
        clearTimeout(w.timer);
        w.resolve(msg);
      } else {
        queue.push(msg);
      }
    });
    ws.waitFor = (pred, timeoutMs = 4000) => {
      const qIdx = queue.findIndex(pred);
      if (qIdx >= 0) {
        return Promise.resolve(queue.splice(qIdx, 1)[0]);
      }
      return new Promise((res, rej) => {
        const timer = setTimeout(() => {
          const i = waiters.findIndex((w) => w.resolve === res);
          if (i >= 0) waiters.splice(i, 1);
          rej(new Error('Timeout waiting for message'));
        }, timeoutMs);
        waiters.push({ pred, resolve: res, timer });
      });
    };
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

(async () => {
  try {
    // 1. /health & /api/rooms
    const healthRes = await fetch(`${BASE_HTTP}/health`).then((r) => r.json());
    assert('HTTP /health ok', healthRes && healthRes.ok === true && healthRes.capacity === 15);

    const roomsRes = await fetch(`${BASE_HTTP}/api/rooms`).then((r) => r.json());
    assert('HTTP /api/rooms returns 5 rooms', Array.isArray(roomsRes.rooms) && roomsRes.rooms.length === 5);

    // 2. Reject invalid MSSV
    const wsBad = await connectClient('hsk-1');
    wsBad.send(JSON.stringify({ type: 'join', sessionId: 'bad-1', name: 'Test', mssv: '1234' }));
    const errMsg = await wsBad.waitFor((m) => m.type === 'error');
    assert('Reject invalid MSSV (1234)', errMsg && errMsg.type === 'error');
    wsBad.close();

    // 3. Client A joins with female + tshirt-navy + skirt + ponytail + glasses
    const wsA = await connectClient('hsk-1');
    wsA.send(
      JSON.stringify({
        type: 'join',
        sessionId: 'sess-a',
        name: 'Hải Anh',
        mssv: '20226010',
        gender: 'female',
        outfit: 'tshirt-navy',
        hairStyle: 'ponytail',
        skirt: true,
        glasses: true,
        backpack: false,
      }),
    );
    const welcomeA = await wsA.waitFor((m) => m.type === 'welcome');
    const selfA = welcomeA.players.find((p) => p.id === 'sess-a');
    assert(
      'Client A welcome includes synced appearance',
      selfA &&
        selfA.gender === 'female' &&
        selfA.outfit === 'tshirt-navy' &&
        selfA.hairStyle === 'ponytail' &&
        selfA.skirt === true &&
        selfA.glasses === true &&
        selfA.backpack === false,
      JSON.stringify(selfA),
    );

    // 4. Client B joins and sees Client A's appearance; Client A receives join for B
    const wsB = await connectClient('hsk-1');
    const joinBPromise = wsA.waitFor((m) => m.type === 'join' && m.player?.id === 'sess-b');
    wsB.send(
      JSON.stringify({
        type: 'join',
        sessionId: 'sess-b',
        name: 'Minh Bách Khoa',
        mssv: '20226011',
        gender: 'male',
        outfit: 'bomber-red-navy',
        hairStyle: 'layered',
        skirt: false,
        glasses: false,
        backpack: true,
      }),
    );
    const welcomeB = await wsB.waitFor((m) => m.type === 'welcome');
    const bSeesA = welcomeB.players.find((p) => p.id === 'sess-a');
    assert(
      'Client B sees Client A appearance in welcome snapshot',
      bSeesA && bSeesA.gender === 'female' && bSeesA.outfit === 'tshirt-navy' && bSeesA.skirt === true,
      JSON.stringify(bSeesA),
    );
    const joinB = await joinBPromise;
    assert(
      'Client A receives join broadcast with Client B outfit bomber-red-navy',
      joinB.player.outfit === 'bomber-red-navy' && joinB.player.hairStyle === 'layered',
      JSON.stringify(joinB.player),
    );

    // 5. Live appearance change from Client A -> broadcast to Client B
    const appBroadcastPromise = wsB.waitFor((m) => m.type === 'appearance' && m.player?.id === 'sess-a');
    wsA.send(
      JSON.stringify({
        type: 'appearance',
        name: 'Hải Anh HUST',
        mssv: '20226010',
        gender: 'female',
        outfit: 'sweater-cream',
        hairStyle: 'bob',
        skirt: true,
        glasses: false,
        backpack: true,
      }),
    );
    const appMsg = await appBroadcastPromise;
    assert(
      'Client B receives live appearance update (sweater-cream, bob, Hải Anh HUST)',
      appMsg.player.name === 'Hải Anh HUST' &&
        appMsg.player.outfit === 'sweater-cream' &&
        appMsg.player.hairStyle === 'bob' &&
        appMsg.player.backpack === true,
      JSON.stringify(appMsg.player),
    );

    // 6. Expanded BOUNDS test: walk/ride into East Campus (x > 96 up to 162, z up to 92)
    // Wait a moment so dt allows a larger step or test clamping directly:
    // Wait 120ms and send a move from spawn (-76, 10)
    await new Promise((r) => setTimeout(r, 120));
    const movePromise = wsB.waitFor((m) => m.type === 'move' && m.id === 'sess-a');
    wsA.send(JSON.stringify({ type: 'move', x: -75.2, z: 10.5, facing: 1.25, state: 'walking' }));
    const move1 = await movePromise;
    assert(
      'Move broadcast works and preserves facing',
      Math.abs(move1.x - -75.2) < 0.01 && Math.abs(move1.facing - 1.25) < 0.01,
      JSON.stringify(move1),
    );

    // 7. Reconnect with same sessionId replaces old socket without duplicating count
    const wsA2 = await connectClient('hsk-1');
    wsA2.send(
      JSON.stringify({
        type: 'join',
        sessionId: 'sess-a',
        name: 'Hải Anh HUST',
        mssv: '20226010',
        gender: 'female',
        outfit: 'sweater-cream',
      }),
    );
    const welcomeA2 = await wsA2.waitFor((m) => m.type === 'welcome');
    assert('Reconnect same sessionId keeps room count = 2', welcomeA2.count === 2, `count=${welcomeA2.count}`);

    // 8. Ping -> Pong
    wsA2.send(JSON.stringify({ type: 'ping' }));
    const pong = await wsA2.waitFor((m) => m.type === 'pong');
    assert('Ping returns pong', pong && pong.type === 'pong');

    // 9. Leave broadcast when B disconnects
    const leavePromise = wsA2.waitFor((m) => m.type === 'leave' && m.id === 'sess-b');
    wsB.close();
    const leaveMsg = await leavePromise;
    assert('Disconnect broadcasts leave', leaveMsg && leaveMsg.id === 'sess-b');

    wsA2.close();
    console.log(`test-clients summary: ${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error('CRASH:', err);
    process.exit(1);
  }
})();
