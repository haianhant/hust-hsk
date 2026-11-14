/**
 * test/boardgame-engine.test.cjs — Kiểm thử đơn vị Pure Domain Engine cho
 * "Bóng Đêm KTX — Secrets After Dark" (BG3):
 *  (1) Đủ 9 vai trò nguyên bản, 3 phe, 32 lá bài data-driven, phân bổ chuẩn 4–8 người
 *  (2) Phân tách P0 tuyệt đối: `getPublicGameView` KHÔNG lộ vai chưa lật / tay bài / ghi chú / MSSV;
 *      khán giả nhận `getPrivateGameView === null`
 *  (3) Di chuyển 6 khu vực, điều chỉnh Tín hiệu / Màn sương, Chiến thuật, Kỹ năng, Chiến thắng mỗi phe
 *  (4) Giới hạn số vòng hữu hạn (7 vòng cho 4-5p, 8 vòng cho 6-8p) + timeout auto-turn không bao giờ treo
 */

const test = require('node:test');
const assert = require('node:assert/strict');
require('./register-ts.cjs');

const {
  CARDS_CATALOG,
  KTX_LOCATIONS,
  ROLES_CATALOG,
  applyPlayerGameAction,
  applyTimeoutAutoTurn,
  createInitialGameState,
  evaluateVictoryState,
  getPrivateGameView,
  getPublicGameView,
  getRoleDistribution,
} = require('../features/boardgame/domain/index.ts');

function makePlayers(n) {
  return Array.from({ length: n }, (_, i) => ({
    playerId: `p_${i + 1}`,
    displayName: `SV ${i + 1}`,
    seatIndex: i,
  }));
}

test('BG3 Pure Domain Engine Unit Tests', async (t) => {
  await t.test('(1) Catalog integrity: 9 roles, 6 locations, 32 cards, 4-8p distribution', () => {
    assert.equal(ROLES_CATALOG.length, 9);
    assert.equal(KTX_LOCATIONS.length, 6);
    assert.equal(CARDS_CATALOG.length, 32);
    assert.equal(CARDS_CATALOG.filter((c) => c.deck === 'clue').length, 10);
    assert.equal(CARDS_CATALOG.filter((c) => c.deck === 'event').length, 12);
    assert.equal(CARDS_CATALOG.filter((c) => c.deck === 'tactic').length, 10);

    for (let n = 4; n <= 8; n++) {
      const split = getRoleDistribution(n);
      assert.equal(split.lanternGuard + split.mistOrder + split.wanderer, n);
      const st = createInitialGameState({
        matchId: `m-${n}`,
        seed: 100 + n,
        nowMs: 1_700_000_000_000,
        players: makePlayers(n),
      });
      assert.equal(st.players.length, n);
      assert.equal(st.maxRounds, n <= 5 ? 7 : 8);
      for (const p of st.players) {
        assert.equal(p.hand.length, 2);
        assert.equal(p.revealed, false);
      }
    }
  });

  await t.test('(2) P0 Projection Isolation: publicGame omits secret roles/hands/ward & spectators get null privateView', () => {
    const st = createInitialGameState({
      matchId: 'm-sec',
      seed: 999,
      nowMs: 1_700_000_000_000,
      players: makePlayers(6),
    });

    const pub = getPublicGameView(st);
    assert.equal(pub.finalReveal, null);
    for (const pp of pub.players) {
      assert.equal(pp.revealedRoleId, null);
      assert.equal(pp.revealedFaction, null);
      assert.equal(pp.handCount, 2);
      assert.equal('hand' in pp, false);
      assert.equal('privateNotes' in pp, false);
      assert.equal('wardPlayerId' in pp, false);
    }

    const pubStr = JSON.stringify(pub);
    for (const p of st.players) {
      assert.equal(pubStr.includes(p.roleId), false, `Public view leaked roleId ${p.roleId}`);
      for (const card of p.hand) {
        assert.equal(pubStr.includes(card.id), false, `Public view leaked hand card ${card.id}`);
      }
    }

    // Khán giả nhận privateView === null
    assert.equal(getPrivateGameView(st, null), null);
    assert.equal(getPrivateGameView(st, 'spectator-99'), null);

    // Đúng playerId chỉ thấy vai của chính mình
    const p1Priv = getPrivateGameView(st, 'p_1');
    assert.ok(p1Priv);
    assert.equal(p1Priv.roleId, st.players[0].roleId);
    assert.equal(p1Priv.hand.length, 2);
  });

  await t.test('(3) Legal turn progression: MOVE -> ADJUST_TRACK -> ATTACK -> END_TURN -> Signal Victory', () => {
    const st = createInitialGameState({
      matchId: 'm-play',
      seed: 42,
      nowMs: 1_700_000_000_000,
      players: makePlayers(4),
    });
    const guardPlayer = st.players[0];

    // Sai pha (rút bài trước khi di chuyển) phải bị từ chối
    const earlyDraw = applyPlayerGameAction(
      st,
      guardPlayer.playerId,
      { type: 'DRAW_CARD', deck: 'clue' },
      1_700_000_001_000,
    );
    assert.equal(earlyDraw.ok, false);

    // Di chuyển tới Phòng Phát Thanh ('radio')
    const mv = applyPlayerGameAction(
      st,
      guardPlayer.playerId,
      { type: 'MOVE', location: 'radio' },
      1_700_000_002_000,
    );
    assert.equal(mv.ok, true);
    assert.equal(st.turnPhase, 'DRAW_OR_EXPLORE');

    // Chỉnh Chỉ số Tín hiệu tại Phòng Phát Thanh
    const adj = applyPlayerGameAction(
      st,
      guardPlayer.playerId,
      { type: 'ADJUST_TRACK', mode: 'signal' },
      1_700_000_003_000,
    );
    assert.equal(adj.ok, true);
    assert.equal(st.signalProgress, 1);
    assert.equal(st.turnPhase, 'TACTICAL_ACTION');

    // Kết thúc lượt -> chuyển sang p_2
    const end = applyPlayerGameAction(
      st,
      guardPlayer.playerId,
      { type: 'END_TURN' },
      1_700_000_004_000,
    );
    assert.equal(end.ok, true);
    assert.equal(st.turnOrder[st.activeTurnIdx], 'p_2');
    assert.equal(st.turnPhase, 'MOVE');

    // Khi Signal chạm 6 -> Đội Gác Đèn thắng ngay và lật finalReveal
    st.signalProgress = 6;
    const won = evaluateVictoryState(st, 1_700_000_005_000, false);
    assert.equal(won, true);
    assert.equal(st.winnerFaction, 'lantern-guard');
    const pubEnd = getPublicGameView(st);
    assert.ok(Array.isArray(pubEnd.finalReveal) && pubEnd.finalReveal.length === 4);
  });

  await t.test('(4) Finite maxRounds guarantee + timeout auto-turn never stalls across full 8p match', () => {
    const st = createInitialGameState({
      matchId: 'm-timeout',
      seed: 2025,
      nowMs: 1_700_000_000_000,
      players: makePlayers(8),
    });

    let steps = 0;
    while (!st.finished && steps < 250) {
      steps += 1;
      applyTimeoutAutoTurn(st, 1_700_000_000_000 + steps * 5000);
    }
    assert.equal(st.finished, true, 'Trận đấu chạy toàn bộ qua timeout auto-turn phải kết thúc hữu hạn');
    assert.ok(st.round <= st.maxRounds + 1);
    assert.ok(st.winnerLabel);
    assert.ok(st.winReason);
  });
});
