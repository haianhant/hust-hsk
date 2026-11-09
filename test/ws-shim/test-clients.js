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
const WebSocket = require('./mini-ws');

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

    // 6. Move & authoritative BOUNDS clamping test
    await new Promise((r) => setTimeout(r, 120));
    const movePromise = wsB.waitFor((m) => m.type === 'move' && m.id === 'sess-a');
    wsA.send(JSON.stringify({ type: 'move', x: 94.8, z: -5.5, facing: -1.25, state: 'walking' }));
    const move1 = await movePromise;
    assert(
      'Move broadcast works and preserves facing',
      Math.abs(move1.x - 94.8) < 0.01 && Math.abs(move1.facing - -1.25) < 0.01,
      JSON.stringify(move1),
    );

    // Ride East past maxX (168) -> clamped and capped by riding speed
    await new Promise((r) => setTimeout(r, 120));
    const moveClampPromise = wsB.waitFor((m) => m.type === 'move' && m.id === 'sess-a');
    wsA.send(JSON.stringify({ type: 'move', x: 200, z: -5.5, facing: Math.PI / 2, state: 'riding' }));
    const moveClamp = await moveClampPromise;
    assert(
      'Move beyond maxX (168) is speed-capped and stays <= 168',
      moveClamp.x <= 168 && moveClamp.x > 94.8 && moveClamp.state === 'riding',
      JSON.stringify(moveClamp),
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

    // 9. PR9 Study Room Snapshot received on join
    const snapA2 = await wsA2.waitFor((m) => m.type === 'study:room-snapshot');
    assert(
      'PR9: Client A receives study:room-snapshot on join',
      snapA2 && Array.isArray(snapA2.seats) && snapA2.seats.length === 0,
      JSON.stringify(snapA2),
    );

    // 10. PR9 Authoritative Seat Claim: A claims tqb-1f-t1-s1 -> B receives study:seat-claimed
    const bSeeClaimAPromise = wsB.waitFor(
      (m) => m.type === 'study:seat-claimed' && m.occupancy?.seatId === 'tqb-1f-t1-s1',
    );
    wsA2.send(
      JSON.stringify({
        type: 'study:claim-seat',
        seatId: 'tqb-1f-t1-s1',
        subjectTag: 'Giải tích 1',
        pomodoroPhase: 'focus',
        requestId: 'ws-req-a1',
      }),
    );
    const bSeeClaimA = await bSeeClaimAPromise;
    assert(
      'PR9: Client B receives study:seat-claimed for tqb-1f-t1-s1 (omits occupantMssv)',
      bSeeClaimA.occupancy.occupantId === 'sess-a' &&
        bSeeClaimA.occupancy.occupantName === 'Hải Anh HUST' &&
        !('occupantMssv' in bSeeClaimA.occupancy),
      JSON.stringify(bSeeClaimA),
    );

    // 11. PR9 Seat Conflict Rejection: B tries to claim tqb-1f-t1-s1 -> rejected
    wsB.send(
      JSON.stringify({
        type: 'study:claim-seat',
        seatId: 'tqb-1f-t1-s1',
        requestId: 'ws-req-b-conflict',
      }),
    );
    const bRejected = await wsB.waitFor(
      (m) => m.type === 'study:seat-rejected' && m.requestId === 'ws-req-b-conflict',
    );
    assert(
      'PR9: Client B receives study:seat-rejected (already-occupied) when claiming A seat',
      bRejected.reason === 'already-occupied' && bRejected.occupiedBy === 'sess-a',
      JSON.stringify(bRejected),
    );

    // 12. PR9 Atomic Seat Switch: A switches to tqb-1f-t1-s2 -> B can claim tqb-1f-t1-s1
    const bSeeReleasePrevPromise = wsB.waitFor(
      (m) => m.type === 'study:seat-released' && m.seatId === 'tqb-1f-t1-s1',
    );
    const bSeeClaimSwitchPromise = wsB.waitFor(
      (m) => m.type === 'study:seat-claimed' && m.occupancy?.seatId === 'tqb-1f-t1-s2',
    );
    wsA2.send(
      JSON.stringify({
        type: 'study:claim-seat',
        seatId: 'tqb-1f-t1-s2',
        subjectTag: 'Giải tích 1',
        requestId: 'ws-req-a-switch',
      }),
    );
    const [bSeeReleasePrev, bSeeClaimSwitch] = await Promise.all([
      bSeeReleasePrevPromise,
      bSeeClaimSwitchPromise,
    ]);
    assert(
      'PR9: Atomic seat switch releases old seat and claims new seat',
      bSeeReleasePrev.reason === 'switched-seat' &&
        bSeeClaimSwitch.occupancy.seatId === 'tqb-1f-t1-s2',
    );

    wsB.send(
      JSON.stringify({
        type: 'study:claim-seat',
        seatId: 'tqb-1f-t1-s1',
        subjectTag: 'HSK 4',
        requestId: 'ws-req-b-ok',
      }),
    );
    const bClaimOk = await wsB.waitFor(
      (m) => m.type === 'study:seat-claimed' && m.requestId === 'ws-req-b-ok',
    );
    assert(
      'PR9: Client B claims freed seat tqb-1f-t1-s1',
      bClaimOk.occupancy.occupantId === 'sess-b',
      JSON.stringify(bClaimOk),
    );

    // 13. PR9 Presence Broadcast & Spoofing Override
    const bSeePresAPromise = wsB.waitFor(
      (m) =>
        m.type === 'study:presence' &&
        m.playerId === 'sess-a' &&
        m.presence?.subjectTag === 'Vật lý đại cương',
    );
    wsA2.send(
      JSON.stringify({
        type: 'study:presence',
        presence: {
          status: 'studying',
          studyRoomId: 'library-lobby',
          seatId: 'tqb-1f-t1-s2',
          pomodoroPhase: 'focus',
          subjectTag: 'Vật lý đại cương',
        },
      }),
    );
    const bSeePresA = await bSeePresAPromise;
    assert(
      'PR9: Client B receives live study:presence from Client A',
      bSeePresA.presence.status === 'studying' && bSeePresA.presence.seatId === 'tqb-1f-t1-s2',
    );

    const aSeePresBPromise = wsA2.waitFor(
      (m) =>
        m.type === 'study:presence' &&
        m.playerId === 'sess-b' &&
        m.presence?.subjectTag === 'Spoof Test',
    );
    wsB.send(
      JSON.stringify({
        type: 'study:presence',
        presence: {
          status: 'studying',
          studyRoomId: 'library-lobby',
          seatId: 'tqb-1f-t2-s2', // spoofed seatId!
          pomodoroPhase: 'focus',
          subjectTag: 'Spoof Test',
        },
      }),
    );
    const aSeePresB = await aSeePresBPromise;
    assert(
      'PR9: Server overrides spoofed seatId in study:presence with authoritative owned seat',
      aSeePresB.presence.seatId === 'tqb-1f-t1-s1',
      JSON.stringify(aSeePresB),
    );

    // 14. PR9 DO Hibernation Recovery over HTTP /__hibernate
    const hibRes = await fetch(`${BASE_HTTP}/__hibernate?room=hsk-1`, { method: 'POST' }).then((r) =>
      r.json(),
    );
    assert('PR9: Simulated DO hibernation endpoint succeeds', hibRes && hibRes.ok === true);

    const wsD = await connectClient('hsk-1');
    wsD.send(
      JSON.stringify({
        type: 'join',
        sessionId: 'sess-d',
        name: 'Phạm Văn D',
        mssv: '20226014',
      }),
    );
    const snapD = await wsD.waitFor((m) => m.type === 'study:room-snapshot');
    assert(
      'PR9: New joiner after DO hibernation receives restored seats & presences in study:room-snapshot',
      snapD &&
        Array.isArray(snapD.seats) &&
        snapD.seats.length === 2 &&
        snapD.presences['sess-a']?.subjectTag === 'Vật lý đại cương',
      JSON.stringify(snapD),
    );
    wsD.close();

    // 15. PR9 Room Isolation: Client C in hsk-2 can claim tqb-1f-t1-s1 while B holds it in hsk-1
    const wsC = await connectClient('hsk-2');
    wsC.send(
      JSON.stringify({
        type: 'join',
        sessionId: 'sess-c',
        name: 'Lê Thị C',
        mssv: '20226015',
      }),
    );
    await wsC.waitFor((m) => m.type === 'welcome');
    wsC.send(
      JSON.stringify({
        type: 'study:claim-seat',
        seatId: 'tqb-1f-t1-s1',
        requestId: 'ws-req-c-hsk2',
      }),
    );
    const cClaimOk = await wsC.waitFor(
      (m) => m.type === 'study:seat-claimed' && m.requestId === 'ws-req-c-hsk2',
    );
    assert(
      'PR9: Room isolation allows Client C in hsk-2 to claim tqb-1f-t1-s1',
      cClaimOk.occupancy.occupantId === 'sess-c',
      JSON.stringify(cClaimOk),
    );
    wsC.close();

    // 16. Leave & Seat Release broadcast when B disconnects
    const releaseOnLeavePromise = wsA2.waitFor(
      (m) =>
        m.type === 'study:seat-released' &&
        m.seatId === 'tqb-1f-t1-s1' &&
        m.occupantId === 'sess-b',
    );
    const leavePromise = wsA2.waitFor((m) => m.type === 'leave' && m.id === 'sess-b');
    wsB.close();
    const [releaseOnLeave, leaveMsg] = await Promise.all([releaseOnLeavePromise, leavePromise]);
    assert(
      'PR9: Disconnect broadcasts study:seat-released (reason=disconnect) and leave',
      releaseOnLeave.occupantId === 'sess-b' &&
        releaseOnLeave.reason === 'disconnect' &&
        leaveMsg &&
        leaveMsg.id === 'sess-b',
    );

    // 17. PR9 Review Fix 4: Prevent multiple sessionIds on the same WebSocket
    wsA2.send(
      JSON.stringify({
        type: 'join',
        sessionId: 'sess-spoofed-second-id',
        name: 'Spoofed Second Session',
        mssv: '20226099',
      }),
    );
    const switchErr = await wsA2.waitFor((m) => m.type === 'error');
    assert(
      'PR9 Fix 4: Server rejects joining a second sessionId on an already bound socket',
      switchErr &&
        switchErr.type === 'error' &&
        String(switchErr.message).includes('different sessionId'),
      JSON.stringify(switchErr),
    );

    wsA2.close();
    await new Promise((r) => setTimeout(r, 150));
    const roomsAfterAllClose = await fetch(`${BASE_HTTP}/api/rooms`).then((r) => r.json());
    const hsk1Room = (roomsAfterAllClose.rooms || []).find((r) => r.id === 'hsk-1');
    assert(
      'PR9 Fix 4: Room hsk-1 count returns to 0 with no orphaned sessions after socket closes',
      hsk1Room && hsk1Room.count === 0,
      JSON.stringify(hsk1Room),
    );
    console.log(`test-clients summary: ${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error('CRASH:', err);
    process.exit(1);
  }
})();
