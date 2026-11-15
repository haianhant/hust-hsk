/**
 * test/boardgame-engine.test.cjs — Kiểm thử đơn vị Pure Domain Engine v3 cho
 * "Bóng Đêm KTX v3 — Hidden Role, Investigation & Survival" (rulesetVersion = 3).
 *
 * GV3.1 Cốt lõi:
 *  - Setup 4–8 người chơi: phân bổ phe, vai không trùng, đối xứng 11/12/13 HP, bài khởi đầu luân phiên
 *  - Vòng lặp lượt 3 bước: MOVE_OR_STAY -> LOCATION_ACTION -> MAIN_ACTION -> chuyển lượt / qua vòng
 *  - Luật di chuyển & hiệu ứng 6 khu vực KTX
 *  - Timeout tự động trung lập 100% (`applyTimeoutAutoTurn`)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
require('./register-ts.cjs');

const {
  CARDS_BY_ID,
  CARDS_CATALOG,
  KTX_LOCATIONS,
  KTX_LOCATION_MAP,
  ROLES_CATALOG,
  applyPlayerGameAction,
  applyTimeoutAutoTurn,
  createInitialGameState,
  getActivePlayer,
  getMaxRoundsForPlayerCount,
  getPrivateGameView,
  getPublicGameView,
  getRoleDistribution,
  isAdjacentLocation,
  listLegalMovesForLocation,
} = require('../features/boardgame/domain/index.ts');

function makePlayers(n) {
  return Array.from({ length: n }, (_, i) => ({
    playerId: `p_${i + 1}`,
    displayName: `SV ${i + 1}`,
    seatIndex: i,
  }));
}

function collectObjectKeys(obj, out = new Set()) {
  if (!obj || typeof obj !== 'object') return out;
  if (Array.isArray(obj)) {
    for (const item of obj) collectObjectKeys(item, out);
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    out.add(k);
    collectObjectKeys(v, out);
  }
  return out;
}

test('GV3.1 — Setup 4–8 người: rulesetVersion=3, phân bổ phe, đối xứng 11/12/13 HP & không trùng vai', () => {
  assert.equal(CARDS_CATALOG.length, 26);
  assert.equal(ROLES_CATALOG.length, 9);
  assert.equal(KTX_LOCATIONS.length, 6);

  // Kiểm chứng mỗi phe có đúng 3 ngưỡng máu 11, 12, 13
  for (const faction of ['lantern-guard', 'mist-order', 'wanderer']) {
    const hps = ROLES_CATALOG.filter((r) => r.faction === faction)
      .map((r) => r.maxHp)
      .sort((a, b) => a - b);
    assert.deepEqual(hps, [11, 12, 13], `Faction ${faction} phải đối xứng 11/12/13 HP`);
  }

  for (let n = 4; n <= 8; n++) {
    const state = createInitialGameState({
      matchId: `gv31-setup-${n}`,
      seed: 1000 + n * 37,
      nowMs: 1_750_000_000_000,
      players: makePlayers(n),
    });

    assert.equal(state.players.length, n);
    assert.equal(state.round, 1);
    assert.equal(state.maxRounds, getMaxRoundsForPlayerCount(n));
    assert.equal(state.turnNumber, 1);
    assert.equal(state.turnPhase, 'MOVE_OR_STAY');

    const split = getRoleDistribution(n);
    assert.equal(
      state.players.filter((p) => p.faction === 'lantern-guard').length,
      split.lanternGuard,
    );
    assert.equal(
      state.players.filter((p) => p.faction === 'mist-order').length,
      split.mistOrder,
    );
    assert.equal(
      state.players.filter((p) => p.faction === 'wanderer').length,
      split.wanderer,
    );

    const uniqueRoles = new Set(state.players.map((p) => p.roleId));
    assert.equal(uniqueRoles.size, n);

    // Nếu có Bình ('lang-cuu-ho'), protegePlayerId phải là người chơi khác hợp lệ
    const binh = state.players.find((p) => p.roleId === 'lang-cuu-ho');
    if (binh) {
      assert.ok(binh.protegePlayerId);
      assert.notEqual(binh.protegePlayerId, binh.playerId);
    }

    // Kiểm tra bài khởi đầu luân phiên Điều tra / Trang bị & không lộ kênh công khai
    const pub = getPublicGameView(state);
    assert.equal(pub.rulesetVersion, 3);
    assert.equal(pub.finalReveal, null);
    assert.deepEqual(collectObjectKeys(pub).has('hp'), false);
    assert.deepEqual(collectObjectKeys(pub).has('maxHp'), false);

    state.players.forEach((p, idx) => {
      assert.equal(p.hand.length, 2);
      assert.equal(p.hand[0].deck, 'investigation');
      assert.equal(p.hand[1].deck, idx % 2 === 0 ? 'equipment' : 'event');
      assert.equal(pub.players[idx].handCount, 2);
      assert.equal(pub.players[idx].woundsTaken, 0);
      assert.equal(pub.players[idx].revealedRoleId, null);
      assert.equal(pub.players[idx].revealedFaction, null);
    });

    // Khán giả / ID không tồn tại nhận null
    assert.equal(getPrivateGameView(state, null), null);
    assert.equal(getPrivateGameView(state, 'unknown-user'), null);
  }
});

test('GV3.1 — Vòng lặp lượt 3 pha chuẩn & qua vòng khi hết lượt cuối', () => {
  const now = 1_750_000_100_000;
  const state = createInitialGameState({
    matchId: 'gv31-turn-loop',
    seed: 2026,
    nowMs: now,
    players: makePlayers(4),
  });

  for (let seat = 0; seat < 4; seat++) {
    const active = getActivePlayer(state);
    assert.ok(active);
    assert.equal(state.round, 1);
    assert.equal(state.turnNumber, seat + 1);
    assert.equal(state.turnPhase, 'MOVE_OR_STAY');

    // Sai pha ở Pha 1 phải bị từ chối
    const badPhase = applyPlayerGameAction(state, active.playerId, { type: 'EXPLORE_LOC' }, now);
    assert.equal(badPhase.ok, false);

    // Sai lượt phải bị từ chối
    const other = state.players.find((p) => p.playerId !== active.playerId);
    const notYourTurn = applyPlayerGameAction(state, other.playerId, { type: 'STAY' }, now);
    assert.equal(notYourTurn.ok, false);

    if (seat % 2 === 0) {
      const legalMoves = listLegalMovesForLocation(active.location);
      assert.ok(legalMoves.length >= 3);
      // Không được nhảy tới ô không kề cận
      const nonAdj = KTX_LOCATIONS.find(
        (loc) => loc.id !== active.location && !legalMoves.includes(loc.id),
      );
      if (nonAdj) {
        const illegalMove = applyPlayerGameAction(
          state,
          active.playerId,
          { type: 'MOVE', location: nonAdj.id },
          now,
        );
        assert.equal(illegalMove.ok, false);
      }

      const moveRes = applyPlayerGameAction(
        state,
        active.playerId,
        { type: 'MOVE', location: legalMoves[0] },
        now + seat * 1000,
      );
      assert.equal(moveRes.ok, true);
      assert.equal(active.location, legalMoves[0]);
      assert.equal(state.turnPhase, 'LOCATION_ACTION');
    } else {
      const stayRes = applyPlayerGameAction(
        state,
        active.playerId,
        { type: 'STAY' },
        now + seat * 1000,
      );
      assert.equal(stayRes.ok, true);
      assert.equal(active.stayedLastTurn, true);
      assert.equal(state.turnPhase, 'LOCATION_ACTION');
    }

    // Pha 2: Khảo sát hoặc rút bộ bài hợp lệ của ô
    if (seat === 0) {
      const badDeck = KTX_LOCATION_MAP[active.location].allowedDecks.includes('investigation')
        ? 'equipment'
        : 'investigation';
      if (!KTX_LOCATION_MAP[active.location].allowedDecks.includes(badDeck)) {
        const resBadDeck = applyPlayerGameAction(
          state,
          active.playerId,
          { type: 'DRAW_CARD', deck: badDeck },
          now + seat * 1000 + 100,
        );
        assert.equal(resBadDeck.ok, false);
      }
      const allowedDeck = KTX_LOCATION_MAP[active.location].allowedDecks[0];
      const drawRes = applyPlayerGameAction(
        state,
        active.playerId,
        { type: 'DRAW_CARD', deck: allowedDeck },
        now + seat * 1000 + 200,
      );
      assert.equal(drawRes.ok, true);
      assert.equal(CARDS_BY_ID[active.hand[active.hand.length - 1].id].deck, allowedDeck);
    } else {
      const exploreRes = applyPlayerGameAction(
        state,
        active.playerId,
        { type: 'EXPLORE_LOC' },
        now + seat * 1000 + 200,
      );
      assert.equal(exploreRes.ok, true);
    }

    assert.equal(state.turnPhase, 'MAIN_ACTION');

    // Pha 3: Phòng thủ hoặc Kết thúc lượt -> sang người kế
    const finishRes = applyPlayerGameAction(
      state,
      active.playerId,
      seat % 2 === 0 ? { type: 'DEFEND' } : { type: 'END_TURN' },
      now + seat * 1000 + 400,
    );
    assert.equal(finishRes.ok, true);
  }

  // Sau lượt của người thứ 4 -> tự động chuyển sang Vòng 2
  assert.equal(state.round, 2);
  assert.equal(state.turnNumber, 5);
  assert.equal(state.turnPhase, 'MOVE_OR_STAY');
});

test('GV3.1 — applyTimeoutAutoTurn trung lập hoàn toàn & không rò rỉ', () => {
  const now = 1_750_000_200_000;
  const s1 = createInitialGameState({
    matchId: 'gv31-timeout-1',
    seed: 99,
    nowMs: now,
    players: makePlayers(4),
  });
  const active = getActivePlayer(s1);
  assert.ok(active);

  const ran = applyTimeoutAutoTurn(s1, now + 40_000);
  assert.equal(ran, true);
  assert.equal(active.tempShield, 1);
  assert.equal(active.stayedLastTurn, true);
  assert.equal(s1.turnNumber, 2);
  assert.equal(s1.turnPhase, 'MOVE_OR_STAY');
  const lastLog = s1.publicLog[s1.publicLog.length - 1];
  assert.equal(lastLog.kind, 'timeout');
  assert.equal(lastLog.text.includes('Màn Sương'), false);
  assert.equal(lastLog.text.includes('Gác Đèn'), false);
  assert.equal(isAdjacentLocation('corridor', 'radio'), true);
  assert.equal(isAdjacentLocation('lobby', 'radio'), false);
});
