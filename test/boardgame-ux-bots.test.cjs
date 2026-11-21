/**
 * test/boardgame-ux-bots.test.cjs — Kiểm thử 9 điểm tối ưu UX, Animation mượt,
 * Đồng bộ tên nhân vật/khu vực, Mật báo có cấu trúc + Popup Thẻ Xanh & Bot AI trên DO thật.
 */
'use strict';

require('./register-ts.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { WebSocket } = require('./ws-shim/mini-ws');
const {
  startStandaloneBoardGameTestServer,
} = require('./ws-shim/boardgame-do-harness.cjs');

const {
  ALL_ROLE_DESIGNS_BY_ID,
  CARDS_CATALOG,
  DEFAULT_CLUSTER_PAIRS,
  LOCATIONS_CATALOG,
  ROLES_CATALOG,
  applyPlayerGameAction,
  chooseBotAction,
  createInitialGameState,
  getPrivateGameView,
} = require('../features/boardgame/domain/index.ts');
const { tokenizeGameLogText } = require('../features/boardgame/ui/game-log-format.ts');
const {
  resolveGraphicsProfile,
  DEFAULT_GRAPHICS_PREFERENCES,
} = require('../features/boardgame/ui/graphics-settings.ts');
const {
  buildDiceRollTimeline,
  buildDirectMoveTimeline,
  resolveDiceStageTimings,
} = require('../features/boardgame/ui/MidnightDice3D.tsx');
const {
  resolveCombatSequenceTimings,
  resolveRoleRevealTimeline,
  resolveVictoryCinematicTimeline,
} = require('../features/boardgame/ui/vfx-queue.ts');
const {
  validateBoardGameClientMessage,
} = require('../shared/contracts/boardgame.ts');

function makePlayers(n) {
  return Array.from({ length: n }, (_, i) => ({
    playerId: `p${i + 1}`,
    displayName: `Người chơi ${i + 1}`,
    seatIndex: i,
    appearance: {},
    connected: true,
  }));
}

async function openBgClient(wsBaseUrl, params) {
  const qs = new URLSearchParams({ matchId: params.matchId });
  const ws = new WebSocket(`${wsBaseUrl}/ws/boardgame?${qs.toString()}`);
  const inbox = [];
  const waiters = [];
  let latestSync = null;

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    inbox.push(msg);
    if (msg.type === 'BG_STATE_SYNC') latestSync = msg;
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

  return {
    ws,
    inbox,
    send,
    nextMsg,
    getLatestSync: () => latestSync,
    close: () => ws.close(1000, 'test done'),
  };
}

test('UX-1 & UX-8 — Đồng bộ tên 10 nhân vật Classic, 6 khu vực tiếng Anh & bỏ thuật ngữ 1d4/1d6', () => {
  const expectedClassicNames = [
    'George',
    'Emi',
    'Franklin',
    'Vampire',
    'Unknown',
    'Werewolf',
    'Bob',
    'Allie',
    'Charles',
    'Daniel',
  ];
  assert.deepEqual(
    ROLES_CATALOG.map((r) => r.name),
    expectedClassicNames,
  );

  const expectedLocations = [
    "Hermit's Cabin",
    'Underworld Gate',
    'Church',
    'Cemetery',
    'Weird Woods',
    'Erstwhile Altar',
  ];
  assert.deepEqual(
    LOCATIONS_CATALOG.map((l) => l.name),
    expectedLocations,
  );

  for (const role of Object.values(ALL_ROLE_DESIGNS_BY_ID)) {
    assert.equal(/\b1d[46]\b/i.test(role.skillSummary), false, `Role ${role.id} leaked 1d4/1d6 in skillSummary`);
    assert.equal(/\b1d[46]\b/i.test(role.secretGoalText), false, `Role ${role.id} leaked 1d4/1d6 in secretGoalText`);
  }
  for (const card of CARDS_CATALOG) {
    assert.equal(/\b1d[46]\b/i.test(card.summary), false, `Card ${card.id} leaked 1d4/1d6 in summary`);
  }
});

test('UX-4 & UX-5 — Mật báo riêng có cấu trúc 5 phần & gắn cờ direction=received cho Popup Thẻ Xanh', () => {
  for (const rulesetId of ['classic', 'full-expansion']) {
    const state = createInitialGameState({
      matchId: `clue-format-${rulesetId}`,
      seed: 2026,
      nowMs: 1_760_000_000_000,
      rulesetId,
      productionBeta: {
        enableProductionBetaExpansions: true,
        betaAllowedRulesets: ['expansion-1', 'expansion-2', 'full-expansion'],
      },
      players: makePlayers(4),
    });
    state.clusterPairs = [...DEFAULT_CLUSTER_PAIRS];
    const [id1, id2] = state.turnOrder;
    const actor = state.players[id1];
    const target = state.players[id2];
    target.roleId = 'lang-anh-san'; // Bob (Kẻ Độc Hành)
    target.faction = 'wanderer';
    target.equipped = [];
    target.woundsTaken = 0;
    target.hp = target.maxHp;
    state.turnPhase = 'MAIN_ACTION';
    actor.hand = ['inv-03', 'inv-12']; // Tham Lam + Tiên Tri

    const r1 = applyPlayerGameAction(
      state,
      actor.playerId,
      { type: 'INVESTIGATE_CARD', cardId: 'inv-03', targetPlayerId: target.playerId },
      1_760_000_001_000,
    );
    assert.equal(r1.ok, true);

    const targetPriv = getPrivateGameView(state, target.playerId);
    const actorPriv = getPrivateGameView(state, actor.playerId);
    const receivedClue = targetPriv.privateClues.at(-1);
    const sentClue = actorPriv.privateClues.at(-1);

    assert.equal(receivedClue.direction, 'received');
    assert.equal(receivedClue.cardId, 'inv-03');
    assert.equal(receivedClue.effectCategory, 'Thăm dò');
    assert.equal(receivedClue.cardShortName, 'Tham Lam');
    assert.ok(receivedClue.ruleDetail.includes('Kẻ Độc Hành / Hội Bóng Đêm'));
    assert.ok(receivedClue.progression.includes('không có Trang bị'));
    assert.equal(receivedClue.resultSummary, '-1 ST');
    assert.equal(receivedClue.senderName, actor.displayName);

    assert.equal(sentClue.direction, 'sent');
    assert.equal(sentClue.cardShortName, 'Tham Lam');
    assert.equal(sentClue.resultSummary, '-1 ST');

    // Tiên Tri cũng tạo mật báo có cấu trúc cho cả 2 phía
    const r2 = applyPlayerGameAction(
      state,
      actor.playerId,
      { type: 'INVESTIGATE_CARD', cardId: 'inv-12', targetPlayerId: target.playerId },
      1_760_000_002_000,
    );
    assert.equal(r2.ok, true);
    const predRec = getPrivateGameView(state, target.playerId).privateClues.at(-1);
    assert.equal(predRec.direction, 'received');
    assert.equal(predRec.cardShortName, 'Tiên Tri');
    assert.ok(predRec.resultSummary.includes('Bob'));
  }
});

test('UX-7 — Nhật ký tô đậm tên người chơi, trang bị/tên thẻ, khu vực & sát thương không mất chữ', () => {
  const line =
    '⚔️ Bảo An dùng "Kiếm Gỗ Masamune" tại Weird Woods (9) tấn công Minh Vũ → gây 3 sát thương!';
  const tokens = tokenizeGameLogText(line, ['Bảo An', 'Minh Vũ']);
  assert.equal(tokens.map((t) => t.text).join(''), line, 'Tokenization must be 100% lossless');
  assert.ok(tokens.some((t) => t.kind === 'player' && t.text === 'Bảo An'));
  assert.ok(tokens.some((t) => t.kind === 'player' && t.text === 'Minh Vũ'));
  assert.ok(tokens.some((t) => t.kind === 'card' && t.text === '"Kiếm Gỗ Masamune"'));
  assert.ok(tokens.some((t) => t.kind === 'location' && t.text.includes('Weird Woods')));
  assert.ok(tokens.some((t) => t.kind === 'damage' && t.text === '3 sát thương'));
});

test('UX-3 — Animation mượt và chậm hơn (~+1.5s) nhưng giữ nguyên tốc độ cho reducedMotion', () => {
  const highProfile = resolveGraphicsProfile(DEFAULT_GRAPHICS_PREFERENCES, {
    viewportWidth: 1440,
    hardwareConcurrency: 8,
    deviceMemory: 8,
    coarsePointer: false,
    prefersReducedMotion: false,
  });
  const reducedProfile = resolveGraphicsProfile(DEFAULT_GRAPHICS_PREFERENCES, {
    viewportWidth: 1440,
    hardwareConcurrency: 8,
    deviceMemory: 8,
    coarsePointer: false,
    prefersReducedMotion: true,
  });

  assert.ok(
    highProfile.pawnGlideDurationMs >= 550 && highProfile.pawnGlideDurationMs <= 800,
    'Pawn glide must be brisk & smooth (~0.65s) on High',
  );
  assert.equal(reducedProfile.pawnGlideDurationMs, 0, 'Reduced motion keeps pawn glide instant');

  const dice = resolveDiceStageTimings(2800, false);
  assert.ok(dice.totalMs >= 2200 && dice.totalMs <= 2900);
  const diceReduced = resolveDiceStageTimings(2800, true);
  assert.ok(diceReduced.totalMs <= 260);

  const moveTl = buildDiceRollTimeline({ diceKind: 'move', qualityTier: 'high', reducedMotion: false });
  assert.ok(moveTl.diceOverlayEndMs >= 2500);
  assert.ok(moveTl.pawnGlideDurationMs >= 550 && moveTl.pawnGlideDurationMs <= 800);

  const directTl = buildDirectMoveTimeline({ reducedMotion: false });
  assert.ok(directTl.pawnGlideDurationMs >= 550 && directTl.pawnGlideDurationMs <= 800);

  const combat = resolveCombatSequenceTimings(2400, 'SLASH', false, { qualityTier: 'high' });
  assert.ok(combat.recoveryEndMs >= 1900 && combat.recoveryEndMs <= 2600);
  const combatReduced = resolveCombatSequenceTimings(2400, 'SLASH', true);
  assert.ok(combatReduced.recoveryEndMs <= 240);

  const reveal = resolveRoleRevealTimeline(3120, false, 'high');
  assert.ok(reveal.totalMs >= 2400 && reveal.totalMs <= 3300);
  const victory = resolveVictoryCinematicTimeline(3600, false, 'high');
  assert.ok(victory.totalMs >= 2800 && victory.totalMs <= 3900);
});

test('UX-9 — Contract validation & Server-Authoritative Bot AI trên SQLite DO thật (Classic + Full Expansion)', async () => {
  assert.equal(validateBoardGameClientMessage({ type: 'BG_ADD_BOT', requestId: 'r1' }).ok, true);
  assert.equal(
    validateBoardGameClientMessage({ type: 'BG_REMOVE_BOT', playerId: 'bgbot_abc', requestId: 'r2' }).ok,
    true,
  );

  // Unit check chooseBotAction trên state cục bộ
  const localState = createInitialGameState({
    matchId: 'bot-local-1',
    seed: 77,
    nowMs: 1_760_000_000_000,
    players: makePlayers(4),
  });
  const firstAction = chooseBotAction(localState, localState.activePlayerId);
  assert.ok(firstAction && firstAction.type === 'ROLL_DICE');

  // Real SQLite DO E2E
  const srv = await startStandaloneBoardGameTestServer(0, {
    ALLOW_SHORT_TURN_TIMEOUT: '1',
    ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
    BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
  });

  try {
    // 1. Tạo phòng với 1 người thật, thêm 3 Bot, xóa 1 Bot, thêm lại 1 Bot -> đủ 4 ghế
    const createRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-1', hostName: 'Host Thật', rulesetId: 'full-expansion' }),
    });
    const created = await createRes.json();
    assert.equal(created.ok, true);

    const host = await openBgClient(srv.wsBaseUrl, { matchId: created.matchId });
    host.send({
      type: 'BG_JOIN',
      matchId: created.matchId,
      inviteCode: created.inviteCode,
      displayName: 'Host Thật',
      appearance: {},
      asSpectator: false,
      requestId: 'j-host',
    });
    const authHost = await host.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    await host.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.players.length === 1);

    // Thêm 3 Bot
    for (let i = 1; i <= 3; i++) {
      host.send({ type: 'BG_ADD_BOT', requestId: `add-bot-${i}` });
      const ack = await host.nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === `add-bot-${i}`);
      assert.equal(ack.ok, true);
    }
    const sync4 = await host.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.players.length === 4);
    const bots = sync4.players.filter((p) => p.isBot);
    assert.equal(bots.length, 3, 'Must have 3 bots seated');
    assert.ok(bots.every((b) => b.ready && b.connected && !b.isHost));
    assert.equal(sync4.status, 'READY_CHECK', '1 human host + 3 ready bots must reach READY_CHECK');

    // Xóa 1 Bot cụ thể -> còn 3 ghế (2 bots), rồi thêm lại
    host.send({ type: 'BG_REMOVE_BOT', playerId: bots[0].playerId, requestId: 'rm-bot-1' });
    const rmAck = await host.nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'rm-bot-1');
    assert.equal(rmAck.ok, true);
    const sync3 = await host.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.players.length === 3);
    assert.equal(sync3.players.filter((p) => p.isBot).length, 2);

    host.send({ type: 'BG_ADD_BOT', requestId: 'add-bot-back' });
    await host.nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'add-bot-back');
    await host.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.players.length === 4);

    // Bắt đầu trận đấu Full Expansion (1 người + 3 Bot)
    host.send({ type: 'BG_START_MATCH', requestId: 'start-bot-match' });
    const startSync = await host.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING' && m.publicGame,
    );
    assert.equal(startSync.publicGame.players.filter((p) => p.isBot).length, 3);
    assert.ok(startSync.privateView && startSync.privateView.playerId === authHost.playerId);

    // Cho người chơi & 3 Bot chạy tuần tự nhiều bước cho tới khi ít nhất 2 Bot đi hết lượt
    let steps = 0;
    let botTurnsObserved = 0;
    const botIds = new Set(startSync.publicGame.players.filter((p) => p.isBot).map((p) => p.playerId));
    let prevTurn = startSync.publicGame.turnNumber;

    while (steps < 28 && botTurnsObserved < 2) {
      steps += 1;
      const snap = host.getLatestSync();
      if (!snap || snap.status === 'FINISHED' || !snap.publicGame) break;

      const pub = snap.publicGame;
      const priv = snap.privateView;

      // Bảo mật P0: publicGame không bao giờ lộ privateClues hay role chưa lật của Bot
      assert.equal(JSON.stringify(pub).includes('"privateClues"'), false);

      if (priv?.pendingChoice) {
        const opt = priv.pendingChoice.options[0];
        await new Promise((r) => setTimeout(r, 120));
        host.send({
          type: 'BG_GAME_ACTION',
          requestId: `h-ch-${steps}`,
          expectedRevision: snap.revision,
          action: { type: 'RESOLVE_CHOICE', choiceId: priv.pendingChoice.choiceId, optionId: opt.optionId },
        });
        await host.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.revision > snap.revision);
        continue;
      }

      const activeIsHuman = pub.activePlayerId === authHost.playerId;
      if (activeIsHuman) {
        let action = null;
        if (pub.turnPhase === 'ROLL_MOVE') action = { type: 'ROLL_DICE' };
        else if (pub.turnPhase === 'CHOOSE_MOVE') {
          const dest = (pub.allowedMoveDestinations && pub.allowedMoveDestinations[0]) || 'radio';
          action = { type: 'CHOOSE_DEST', location: dest };
        } else if (pub.turnPhase === 'LOCATION_ACTION') {
          action = { type: 'SKIP_LOC' };
        } else if (pub.turnPhase === 'MAIN_ACTION') {
          if (priv && priv.hand.length > 0) {
            const c = priv.hand[0];
            const other = pub.players.find((p) => p.alive && p.playerId !== authHost.playerId);
            action =
              c.deck === 'investigation' && other
                ? { type: 'INVESTIGATE_CARD', cardId: c.id, targetPlayerId: other.playerId }
                : { type: 'USE_CARD', cardId: c.id, targetPlayerId: other?.playerId };
          } else {
            action = { type: 'END_TURN' };
          }
        }
        if (action) {
          await new Promise((r) => setTimeout(r, 120));
          host.send({
            type: 'BG_GAME_ACTION',
            requestId: `h-act-${steps}`,
            expectedRevision: snap.revision,
            action,
          });
          const resMsg = await host.nextMsg(
            (m) =>
              (m.type === 'BG_STATE_SYNC' && m.revision > snap.revision) ||
              (m.type === 'BG_ACTION_ACK' && m.requestId === `h-act-${steps}` && !m.ok),
          );
          if (resMsg.type === 'BG_ACTION_ACK' && !resMsg.ok) {
            await new Promise((r) => setTimeout(r, 120));
            host.send({
              type: 'BG_GAME_ACTION',
              requestId: `h-end-${steps}`,
              expectedRevision: host.getLatestSync().revision,
              action: { type: 'END_TURN' },
            });
            await host.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.revision > snap.revision);
          }
        }
      } else {
        // Lượt của Bot — kiểm tra DO đã đặt lịch Alarm và kích hoạt alarm thực tế
        await new Promise((r) => setTimeout(r, 140));
        const alarmRes = await fetch(
          `${srv.httpBaseUrl}/__bg_trigger_alarm?matchId=${encodeURIComponent(created.matchId)}`,
        );
        const alarmData = await alarmRes.json();
        assert.equal(alarmData.ok, true);
        const nextSync = await host.nextMsg(
          (m) => m.type === 'BG_STATE_SYNC' && m.revision > snap.revision,
          4000,
        );
        if (
          nextSync.publicGame &&
          nextSync.publicGame.turnNumber > prevTurn &&
          botIds.has(pub.activePlayerId)
        ) {
          botTurnsObserved += 1;
        }
        if (nextSync.publicGame) {
          prevTurn = nextSync.publicGame.turnNumber;
        }
      }
    }

    assert.ok(botTurnsObserved >= 2, `Expected bots to complete >= 2 turns via DO alarm, got ${botTurnsObserved}`);

    // Bảng xếp hạng phải hoàn toàn sạch (0 bot bị ghi vào leaderboard)
    const lbRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/leaderboard`);
    const lb = await lbRes.json();
    assert.equal(lb.ok, true);
    assert.equal(
      lb.entries.some((e) => e.displayName.startsWith('Bot ')),
      false,
      'Bots must never appear on leaderboard',
    );

    host.close();

    // 2. Kiểm tra phòng chỉ còn Bot sau khi Host rời phòng chờ -> phòng tự đóng sạch (không thăng Bot làm Host)
    const cr2Res = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-2', hostName: 'Host Rời' }),
    });
    const cr2 = await cr2Res.json();
    const h2 = await openBgClient(srv.wsBaseUrl, { matchId: cr2.matchId });
    h2.send({
      type: 'BG_JOIN',
      matchId: cr2.matchId,
      inviteCode: cr2.inviteCode,
      displayName: 'Host Rời',
      appearance: {},
      asSpectator: false,
      requestId: 'j-h2',
    });
    await h2.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.players.length === 1);
    h2.send({ type: 'BG_ADD_BOT', requestId: 'h2-bot-1' });
    await h2.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.players.length === 2);
    h2.send({ type: 'BG_LEAVE', requestId: 'h2-leave' });
    await new Promise((r) => setTimeout(r, 120));

    const metaRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`);
    const dir = await metaRes.json();
    assert.equal(
      dir.matches.some((m) => m.matchId === cr2.matchId),
      false,
      'Lobby with only bots left after human leaves must close cleanly',
    );
  } finally {
    await srv.close();
  }
});
