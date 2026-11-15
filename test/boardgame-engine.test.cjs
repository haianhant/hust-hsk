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

// ===========================================================================
// GV3.2 — 9 Nhân vật, 26 Thẻ bài, Ma trận Điều tra có điều kiện & Anti-Leakage
// ===========================================================================

function createForcedMatch(roleIds, seed = 4242) {
  const now = 1_750_000_500_000;
  const base = createInitialGameState({
    matchId: `gv32-${roleIds.length}-${seed}`,
    seed,
    nowMs: now,
    players: makePlayers(roleIds.length),
  });
  const rolesById = Object.fromEntries(ROLES_CATALOG.map((r) => [r.id, r]));
  base.players.forEach((p, idx) => {
    const rid = roleIds[idx];
    const r = rolesById[rid];
    assert.ok(r, `Missing role ${rid}`);
    p.roleId = r.id;
    p.faction = r.faction;
    p.maxHp = r.maxHp;
    p.hp = r.maxHp;
    p.protegePlayerId = null;
  });
  base.players.forEach((p, idx) => {
    if (p.roleId === 'lang-cuu-ho') {
      p.protegePlayerId = base.players[(idx + 1) % base.players.length].playerId;
    }
  });
  return { state: base, now };
}

function setActiveTurnPhase(state, playerId, phase = 'MAIN_ACTION', location = null) {
  const idx = state.turnOrder.indexOf(playerId);
  assert.ok(idx >= 0, `Player ${playerId} not in turnOrder`);
  state.activeTurnIdx = idx;
  state.turnPhase = phase;
  const actor = state.players.find((p) => p.playerId === playerId);
  assert.ok(actor);
  if (location) actor.location = location;
  return actor;
}

test('GV3.2 — Cả 9 nhân vật: khóa skill khi ẩn danh, lật vai nhận thưởng, dùng skill chủ động, hồi chiêu & nội tại', () => {
  const allRoles = ROLES_CATALOG.map((r) => r.id);
  assert.equal(allRoles.length, 9);

  // Kiểm tra từng cặp 4 người chứa vai cần thử để verify 100% hành vi của cả 9 vai
  for (const rid of allRoles) {
    const squad =
      rid === 'gac-ky-thuat'
        ? ['gac-ky-thuat', 'gac-truc-ban', 'suong-an-danh', 'suong-gac-cong']
        : rid === 'lang-anh-san' || rid === 'lang-quan-sat' || rid === 'lang-cuu-ho'
          ? [rid, 'gac-ky-thuat', 'suong-an-danh', 'suong-tin-gia', 'gac-truc-ban']
          : [rid, 'gac-ky-thuat', 'suong-an-danh', 'gac-radio'].map((x, idx) =>
              idx === 0 ? rid : x === rid ? 'suong-gac-cong' : x,
            );

    const uniqueSquad = Array.from(new Set(squad));
    while (uniqueSquad.length < 4) {
      const filler = allRoles.find((r) => !uniqueSquad.includes(r));
      uniqueSquad.push(filler);
    }

    const { state, now } = createForcedMatch(uniqueSquad, 700 + rid.length);
    const actor = setActiveTurnPhase(state, 'p_1', 'MAIN_ACTION', 'lobby');
    const target = state.players[1];
    target.location = 'lobby';
    target.attacksMade = 1;
    target.hp = target.maxHp - 2; // có vết thương để Dũng / hồi máu đều kiểm chứng được
    actor.hp = actor.maxHp - 1;
    actor.tempShield = 0;

    // 1. Khi chưa lật vai KHÔNG thể dùng USE_SKILL
    const blockedSkill = applyPlayerGameAction(
      state,
      actor.playerId,
      { type: 'USE_SKILL', targetPlayerId: target.playerId },
      now,
    );
    assert.equal(blockedSkill.ok, false);

    // 2. Tự lật vai công khai -> nhận thưởng lật vai, không kết thúc lượt, phát lastRevealEvent
    const handBefore = actor.hand.length;
    const hpBefore = actor.hp;
    const revRes = applyPlayerGameAction(state, actor.playerId, { type: 'REVEAL_ROLE' }, now + 100);
    assert.equal(revRes.ok, true);
    assert.equal(actor.revealed, true);
    assert.equal(state.turnPhase, 'MAIN_ACTION');
    assert.ok(state.lastRevealEvent);
    assert.equal(state.lastRevealEvent.roleId, rid);
    assert.equal(state.lastRevealEvent.reason, 'voluntary');

    // Kiểm tra thưởng riêng từng nhân vật sau lật vai
    if (rid === 'gac-ky-thuat' || rid === 'lang-anh-san') {
      assert.equal(actor.tempShield, 1);
      assert.equal(actor.hand.length, handBefore + 1);
      assert.equal(actor.hand[actor.hand.length - 1].deck, 'equipment');
    } else if (rid === 'gac-truc-ban') {
      assert.equal(actor.hp, hpBefore + 1);
      assert.equal(actor.hand.length, handBefore + 1);
      assert.equal(actor.hand[actor.hand.length - 1].deck, 'investigation');
    } else if (rid === 'gac-radio') {
      assert.equal(actor.globalInvestigateThisTurn, true);
      assert.equal(actor.tempShield, 1);
    } else if (rid === 'suong-an-danh') {
      assert.equal(actor.tempShield, 1);
      assert.equal(actor.extendedRangeThisTurn, true);
    } else if (rid === 'suong-tin-gia') {
      assert.equal(actor.tempShield, 1);
      assert.equal(actor.hand.length, handBefore + 1);
      assert.equal(actor.hand[actor.hand.length - 1].deck, 'event');
    } else if (rid === 'suong-gac-cong') {
      assert.equal(actor.extendedRangeThisTurn, true);
    } else if (rid === 'lang-quan-sat' || rid === 'lang-cuu-ho') {
      assert.equal(actor.hp, hpBefore + 1);
      assert.equal(actor.tempShield, 1);
    }

    // 3. Kích hoạt Kỹ năng chủ động sau khi lật vai -> đặt skillCooldown = 2 & chuyển lượt
    const turnBeforeSkill = state.turnNumber;
    if (rid === 'lang-anh-san') {
      // Hải ở Vòng 1 (chưa V5): kích hoạt để rút 1 Điều tra & +1 Giáp tạm
      actor.tempShield = 0;
      const useSkillRes = applyPlayerGameAction(state, actor.playerId, { type: 'USE_SKILL' }, now + 200);
      assert.equal(useSkillRes.ok, true);
      assert.equal(actor.tempShield, 1);
      assert.equal(state.finished, false);
    } else {
      if (rid === 'suong-an-danh') {
        target.location = 'canteen'; // khác phòng để test hoán đổi vị trí
      } else if (rid === 'gac-truc-ban') {
        target.wardedUntilRound = 0;
      } else if (rid === 'lang-cuu-ho') {
        actor.protegePlayerId = target.playerId;
      }
      const targetLocBefore = target.location;
      const targetHpBefore = target.hp;
      target.tempShield = 1;

      const useSkillRes = applyPlayerGameAction(
        state,
        actor.playerId,
        { type: 'USE_SKILL', targetPlayerId: target.playerId },
        now + 200,
      );
      assert.equal(useSkillRes.ok, true, `Skill failed for ${rid}: ${useSkillRes.reason}`);

      if (rid === 'gac-ky-thuat') {
        assert.equal(target.hp, Math.min(target.maxHp, targetHpBefore + 2));
        assert.equal(target.tempShield, 2);
      } else if (rid === 'gac-truc-ban') {
        assert.ok(target.wardedUntilRound > state.turnNumber);
      } else if (rid === 'gac-radio') {
        assert.equal(target.exposedMark, 1);
      } else if (rid === 'suong-an-danh') {
        assert.equal(actor.location, targetLocBefore);
        assert.equal(target.location, 'lobby');
      } else if (rid === 'suong-tin-gia') {
        assert.equal(target.tempShield, 0);
        assert.notEqual(target.location, 'lobby');
      } else if (rid === 'suong-gac-cong') {
        assert.equal(target.hp, Math.max(0, targetHpBefore - 2)); // 3 ST - 1 Giáp tạm = 2
      } else if (rid === 'lang-quan-sat') {
        assert.equal(actor.tempShield, 2);
        assert.equal(target.tempShield, 2);
      } else if (rid === 'lang-cuu-ho') {
        assert.equal(target.hp, targetHpBefore + 1);
        assert.equal(target.tempShield, 2);
        assert.equal(actor.protectedProtegeCount, 1);
      }
    }

    assert.equal(actor.skillCooldown, 2);
    assert.equal(state.turnNumber, turnBeforeSkill + 1);

    // 4. Đưa ngay lại lượt p_1 để chứng minh hồi chiêu chặn dùng skill liên tiếp
    setActiveTurnPhase(state, actor.playerId, 'MAIN_ACTION');
    const cdBlocked = applyPlayerGameAction(
      state,
      actor.playerId,
      { type: 'USE_SKILL', targetPlayerId: target.playerId },
      now + 300,
    );
    assert.equal(cdBlocked.ok, false);
  }

  // Kiểm tra các Nội tại đặc trưng sau khi lật vai:
  // - Minh: miễn sát thương Sự kiện khi mang >= 1 Trang bị
  {
    const { state, now } = createForcedMatch(['gac-ky-thuat', 'suong-an-danh', 'gac-radio', 'suong-tin-gia'], 881);
    const minh = state.players[0];
    minh.revealed = true;
    minh.equipped = [CARDS_BY_ID['eq-01']];
    minh.tempShield = 0;
    minh.location = 'court';
    const evPlayer = setActiveTurnPhase(state, 'p_2', 'MAIN_ACTION', 'lobby');
    evPlayer.hand = [CARDS_BY_ID['ev-02']]; // Bữa khuya căng tin gây thương ngoài Căng tin/Sảnh
    const hpBefore = minh.hp;
    assert.equal(applyPlayerGameAction(state, 'p_2', { type: 'PLAY_EVENT', cardId: 'ev-02' }, now).ok, true);
    assert.equal(minh.hp, hpBefore);
  }

  // - Lan: đọc thêm chính xác số bài tay mục tiêu khi dùng Thẻ Điều tra
  // - Vy: đối thủ dùng DEFEND cùng phòng bị nhiễu không đọc được số bài của Vy
  {
    const { state, now } = createForcedMatch(['gac-truc-ban', 'suong-tin-gia', 'gac-ky-thuat', 'suong-gac-cong'], 882);
    const lan = setActiveTurnPhase(state, 'p_1', 'MAIN_ACTION', 'lobby');
    const vy = state.players[1];
    vy.revealed = true;
    lan.revealed = true;
    lan.hand = [CARDS_BY_ID['inv-02']];
    assert.equal(applyPlayerGameAction(state, 'p_1', { type: 'INVESTIGATE_CARD', cardId: 'inv-02', targetPlayerId: 'p_2' }, now).ok, true);
    assert.match(lan.privateClues[lan.privateClues.length - 1].detail, /Sổ trực Lan/);

    setActiveTurnPhase(state, 'p_1', 'MAIN_ACTION', vy.location);
    assert.equal(applyPlayerGameAction(state, 'p_1', { type: 'DEFEND' }, now + 50).ok, true);
    const lastNote = lan.privateNotes[lan.privateNotes.length - 1].text;
    assert.match(lastNote, /bị nhiễu/);
  }
});

test('GV3.2 — Tất cả 26 thẻ bài (9 Điều tra, 9 Trang bị, 8 Sự kiện), giới hạn 4 lá tay, 2 trang bị & xào lại chồng bài', () => {
  // 1. Trang bị: tối đa 2 món (món cũ nhất vào discard), mỗi lượt chỉ đeo 1 món, tiêu hao dùng hết lượt
  {
    const { state, now } = createForcedMatch(['gac-ky-thuat', 'suong-an-danh', 'gac-radio', 'suong-tin-gia'], 901);
    const actor = setActiveTurnPhase(state, 'p_1', 'MAIN_ACTION', 'lobby');
    actor.hand = [CARDS_BY_ID['eq-01'], CARDS_BY_ID['eq-02'], CARDS_BY_ID['eq-03']];

    assert.equal(applyPlayerGameAction(state, 'p_1', { type: 'EQUIP_CARD', cardId: 'eq-01' }, now).ok, true);
    assert.equal(actor.equipped.length, 1);
    assert.equal(state.turnPhase, 'MAIN_ACTION'); // EQUIP_CARD miễn phí lượt!
    // Đeo món thứ 2 cùng lượt bị chặn
    assert.equal(applyPlayerGameAction(state, 'p_1', { type: 'EQUIP_CARD', cardId: 'eq-02' }, now + 1).ok, false);

    // Qua 2 lượt khác của p_1 để test thay thế khi vượt quá 2 trang bị
    setActiveTurnPhase(state, 'p_1', 'MAIN_ACTION', 'lobby');
    actor.equipUsedThisTurn = false;
    assert.equal(applyPlayerGameAction(state, 'p_1', { type: 'EQUIP_CARD', cardId: 'eq-02' }, now + 2).ok, true);

    setActiveTurnPhase(state, 'p_1', 'MAIN_ACTION', 'lobby');
    actor.equipUsedThisTurn = false;
    assert.equal(applyPlayerGameAction(state, 'p_1', { type: 'EQUIP_CARD', cardId: 'eq-03' }, now + 3).ok, true);
    assert.equal(actor.equipped.map((e) => e.id).join(','), 'eq-02,eq-03');
    assert.ok(state.discards.equipment.includes('eq-01'));

    // Giày eq-03 cho phép MOVE 2 bước từ lobby -> radio (gián tiếp qua breaker hoặc corridor)
    setActiveTurnPhase(state, 'p_1', 'MOVE_OR_STAY', 'lobby');
    const twoStepRes = applyPlayerGameAction(state, 'p_1', { type: 'MOVE', location: 'radio' }, now + 4);
    assert.equal(twoStepRes.ok, true);
    assert.equal(actor.location, 'radio');
  }

  // 2. Trang bị tiêu hao eq-08 (Trà Gừng) & eq-09 (Thẻ Từ Đa Năng)
  {
    const { state, now } = createForcedMatch(['gac-ky-thuat', 'suong-an-danh', 'gac-radio', 'suong-tin-gia'], 902);
    const actor = setActiveTurnPhase(state, 'p_1', 'MAIN_ACTION', 'lobby');
    const ally = state.players[1];
    ally.location = 'lobby';
    ally.hp = ally.maxHp - 4;
    actor.hand = [CARDS_BY_ID['eq-08'], CARDS_BY_ID['eq-09']];
    assert.equal(applyPlayerGameAction(state, 'p_1', { type: 'USE_EQUIPMENT', cardId: 'eq-08', targetPlayerId: 'p_2' }, now).ok, true);
    assert.equal(ally.hp, ally.maxHp - 1);

    setActiveTurnPhase(state, 'p_1', 'MAIN_ACTION', 'lobby');
    actor.tempShield = 0;
    const invDeckBefore = state.decks.investigation.length;
    assert.equal(applyPlayerGameAction(state, 'p_1', { type: 'USE_EQUIPMENT', cardId: 'eq-09' }, now + 10).ok, true);
    assert.equal(actor.tempShield, 2);
    assert.equal(state.decks.investigation.length, invDeckBefore - 1);
  }

  // 3. Cả 8 Thẻ Sự kiện ev-01 .. ev-08 hoạt động & bỏ bài sau khi dùng
  const eventIds = ['ev-01', 'ev-02', 'ev-03', 'ev-04', 'ev-05', 'ev-06', 'ev-07', 'ev-08'];
  for (const evId of eventIds) {
    const { state, now } = createForcedMatch(['gac-ky-thuat', 'suong-an-danh', 'gac-radio', 'suong-tin-gia'], 920 + Number(evId.slice(3)));
    const actor = setActiveTurnPhase(state, 'p_1', 'MAIN_ACTION', 'lobby');
    const other = state.players[1];
    other.location = evId === 'ev-04' ? 'court' : evId === 'ev-01' ? 'corridor' : 'canteen';
    other.tempShield = evId === 'ev-01' ? 1 : 0;
    other.equipped = evId === 'ev-05' ? [CARDS_BY_ID['eq-01']] : [];
    other.hand = [CARDS_BY_ID['inv-01'], CARDS_BY_ID['inv-02'], CARDS_BY_ID['eq-02']];
    actor.hp = actor.maxHp - 2;
    actor.hand = [CARDS_BY_ID[evId]];

    const res = applyPlayerGameAction(
      state,
      'p_1',
      {
        type: 'PLAY_EVENT',
        cardId: evId,
        targetPlayerId: 'p_2',
        targetLocation: evId === 'ev-01' ? 'lobby' : evId === 'ev-03' ? 'canteen' : undefined,
      },
      now,
    );
    assert.equal(res.ok, true, `Event ${evId} failed: ${res.reason}`);
    assert.ok(state.discards.event.includes(evId));
  }

  // 4. Tràn tay > 4 lá & Xào lại chồng bài khi hết bài
  {
    const { state, now } = createForcedMatch(['gac-ky-thuat', 'suong-an-danh', 'gac-radio', 'suong-tin-gia'], 950);
    const actor = setActiveTurnPhase(state, 'p_1', 'LOCATION_ACTION', 'radio');
    actor.hand = [CARDS_BY_ID['inv-01'], CARDS_BY_ID['inv-02'], CARDS_BY_ID['inv-03'], CARDS_BY_ID['inv-04']];
    state.decks.investigation = [];
    state.discards.investigation = ['inv-05', 'inv-06'];

    const drawRes = applyPlayerGameAction(state, 'p_1', { type: 'DRAW_CARD', deck: 'investigation' }, now);
    assert.equal(drawRes.ok, true);
    assert.equal(actor.hand.length, 4);
    assert.ok(state.discards.investigation.includes('inv-01')); // bỏ lá cũ nhất khi tay đầy
    assert.equal(state.decks.investigation.length, 1); // đã xào từ discard sang deck rồi rút 1
  }
});

test('GV3.2 — Bảng chân trị Điều tra có điều kiện: mọi lá inv-01..inv-09 đều trải >= 2 phe ở cả 2 nhánh, ghép nhiều manh mối thu hẹp nghi phạm', () => {
  const allRoles = ROLES_CATALOG.map((r) => r.id);
  const invCards = CARDS_CATALOG.filter((c) => c.deck === 'investigation');
  assert.equal(invCards.length, 9);

  for (const card of invCards) {
    const metFactions = new Set();
    const noReactionFactions = new Set();

    // Thử từng cặp (actor = gac-radio ở Phát thanh để có tầm toàn khu, target = mỗi trong 9 nhân vật)
    for (const targetRole of allRoles) {
      const actorRole = targetRole === 'gac-radio' ? 'gac-ky-thuat' : 'gac-radio';
      const remaining = allRoles.filter((r) => r !== actorRole && r !== targetRole);

      // Trường hợp A: trạng thái mặc định (hoặc chưa kích hoạt hành vi)
      {
        const { state, now } = createForcedMatch([actorRole, targetRole, remaining[0], remaining[1]], 1100);
        const actor = setActiveTurnPhase(state, 'p_1', 'MAIN_ACTION', 'radio');
        const target = state.players[1];
        target.visitedLocations = ['lobby'];
        target.stayedCount = 0;
        target.attacksMade = 0;
        target.equipped = [];
        target.hand = [CARDS_BY_ID['inv-01']];
        actor.hand = [card];

        const res = applyPlayerGameAction(
          state,
          'p_1',
          { type: 'INVESTIGATE_CARD', cardId: card.id, targetPlayerId: target.playerId },
          now,
        );
        assert.equal(res.ok, true);
        if (state.lastInvestigation.outcome === 'condition-met') {
          metFactions.add(target.faction);
        } else {
          noReactionFactions.add(target.faction);
        }
      }

      // Trường hợp B (cho các thẻ điều tra hành vi inv-07/inv-08/inv-09): đã ghé Radio / tấn công / cầm >=2 lá
      if (card.id === 'inv-07' || card.id === 'inv-08' || card.id === 'inv-09') {
        const { state, now } = createForcedMatch([actorRole, targetRole, remaining[0], remaining[1]], 1101);
        const actor = setActiveTurnPhase(state, 'p_1', 'MAIN_ACTION', 'radio');
        const target = state.players[1];
        target.visitedLocations = ['lobby', 'radio'];
        target.attacksMade = 1;
        target.hand = [CARDS_BY_ID['inv-01'], CARDS_BY_ID['eq-01']];
        actor.hand = [card];

        const res = applyPlayerGameAction(
          state,
          'p_1',
          { type: 'INVESTIGATE_CARD', cardId: card.id, targetPlayerId: target.playerId },
          now,
        );
        assert.equal(res.ok, true);
        if (state.lastInvestigation.outcome === 'condition-met') {
          metFactions.add(target.faction);
        } else {
          noReactionFactions.add(target.faction);
        }
      }
    }

    assert.ok(
      metFactions.size >= 2,
      `Thẻ ${card.id} (${card.title}) nhánh condition-met chỉ khớp ${metFactions.size} phe — có nguy cơ chỉ đích danh 1 phe quá sớm!`,
    );
    assert.ok(
      noReactionFactions.size >= 2,
      `Thẻ ${card.id} (${card.title}) nhánh no-reaction chỉ khớp ${noReactionFactions.size} phe — có nguy cơ loại trừ 1 phe quá sớm!`,
    );
  }

  // Chứng minh ghép 2–3 manh mối điều tra thu hẹp chính xác nghi phạm (Minh Guard 13 vs Dũng Mist 13)
  const { state, now } = createForcedMatch(['gac-radio', 'suong-gac-cong', 'gac-ky-thuat', 'suong-tin-gia'], 1200);
  const khanh = setActiveTurnPhase(state, 'p_1', 'MAIN_ACTION', 'radio');
  khanh.hand = [CARDS_BY_ID['inv-01'], CARDS_BY_ID['inv-02'], CARDS_BY_ID['inv-05']];

  // Thử soi lên Dũng (p_2) với inv-01 (Khớp Mist or 13) -> thu về {Minh, Tú, Vy, Dũng, Bình}
  assert.equal(applyPlayerGameAction(state, 'p_1', { type: 'INVESTIGATE_CARD', cardId: 'inv-01', targetPlayerId: 'p_2' }, now).ok, true);
  assert.equal(state.lastInvestigation.outcome, 'condition-met');

  // Tiếp tục soi lên p_2 với inv-02 (Guard or 12) -> Không khớp => loại Minh, còn {Dũng, Vy, Bình} (trong 4p không có Bình nên còn Dũng/Vy!)
  setActiveTurnPhase(state, 'p_1', 'MAIN_ACTION', 'radio');
  assert.equal(applyPlayerGameAction(state, 'p_1', { type: 'INVESTIGATE_CARD', cardId: 'inv-02', targetPlayerId: 'p_2' }, now + 100).ok, true);
  assert.equal(state.lastInvestigation.outcome, 'no-reaction');

  // Tiếp tục soi p_2 với inv-05 (Guard / Dũng / Trang) -> Khớp => chỉ còn DUY NHẤT Dũng!
  setActiveTurnPhase(state, 'p_1', 'MAIN_ACTION', 'radio');
  assert.equal(applyPlayerGameAction(state, 'p_1', { type: 'INVESTIGATE_CARD', cardId: 'inv-05', targetPlayerId: 'p_2' }, now + 200).ok, true);
  assert.equal(state.lastInvestigation.outcome, 'condition-met');
  assert.equal(khanh.privateClues.length, 3);
});

test('GV3.2 — Anti-Leakage (§18): zero HP/role/hand leak, publicLogSeq liền mạch, không rò rỉ hành động ẩn & cách ly privateView', () => {
  const { state: sGuard, now } = createForcedMatch(
    ['gac-ky-thuat', 'suong-an-danh', 'gac-truc-ban', 'lang-cuu-ho', 'suong-gac-cong'],
    3300,
  );
  const { state: sMist } = createForcedMatch(
    ['suong-an-danh', 'gac-ky-thuat', 'gac-truc-ban', 'lang-cuu-ho', 'suong-gac-cong'],
    3300,
  );

  // 1. Đồng bộ Turn-0 public view across seats regardless of player 0 faction
  const pubG0 = getPublicGameView(sGuard);
  const pubM0 = getPublicGameView(sMist);
  assert.deepEqual(pubG0.players.map((p) => p.woundsTaken), pubM0.players.map((p) => p.woundsTaken));
  assert.deepEqual(pubG0.players.map((p) => p.tempShield), pubM0.players.map((p) => p.tempShield));
  assert.deepEqual(pubG0.players.map((p) => p.revealedRoleId), [null, null, null, null, null]);
  assert.deepEqual(pubG0.players.map((p) => p.revealedFaction), [null, null, null, null, null]);

  // Kiểm tra tuyệt đối không chứa từ khóa nhạy cảm trong JSON publicGame khi đang chơi
  for (const key of ['hp', 'maxHp', 'privateClues', 'privateNotes', 'protegePlayerId', 'secretGoalText']) {
    assert.equal(collectObjectKeys(pubG0).has(key), false, `Public view leaked key ${key}`);
  }
  const rawPub = JSON.stringify(pubG0);
  for (const role of ROLES_CATALOG) {
    assert.equal(rawPub.includes(role.id), false, `Public view leaked unrevealed role ${role.id}`);
  }

  // 2. Cách ly kênh riêng: Player A không thấy hand/clues/protege của Bình (p_4), Khán giả luôn null
  assert.equal(getPrivateGameView(sGuard, null), null);
  assert.equal(getPrivateGameView(sGuard, 'outsider'), null);
  const privP1 = getPrivateGameView(sGuard, 'p_1');
  const privBinh = getPrivateGameView(sGuard, 'p_4');
  assert.ok(privP1 && privBinh);
  assert.equal(privP1.protegePlayerId, null);
  assert.ok(privBinh.protegePlayerId);
  assert.notDeepEqual(privP1.hand, privBinh.hand.length ? [{ id: 'impossible' }] : []);

  // 3. Hành động khi chưa lật vai (MOVE -> EXPLORE -> DEFEND) giữa Gác Đèn và Màn Sương sinh publicLog đồng nhất
  applyPlayerGameAction(sGuard, 'p_1', { type: 'MOVE', location: 'corridor' }, now + 10);
  applyPlayerGameAction(sMist, 'p_1', { type: 'MOVE', location: 'corridor' }, now + 10);
  applyPlayerGameAction(sGuard, 'p_1', { type: 'EXPLORE_LOC' }, now + 20);
  applyPlayerGameAction(sMist, 'p_1', { type: 'EXPLORE_LOC' }, now + 20);
  applyPlayerGameAction(sGuard, 'p_1', { type: 'DEFEND' }, now + 30);
  applyPlayerGameAction(sMist, 'p_1', { type: 'DEFEND' }, now + 30);

  const logsG = getPublicGameView(sGuard).publicLog;
  const logsM = getPublicGameView(sMist).publicLog;
  assert.deepEqual(logsG, logsM, 'Unrevealed actions between Guard and Mist must produce identical public logs');

  // 4. publicLogSeq phải tăng đều 1, 2, 3... không bị nhảy số dù có nhiều privateNote & highlight ở giữa
  applyPlayerGameAction(sGuard, 'p_2', { type: 'STAY' }, now + 40);
  applyPlayerGameAction(sGuard, 'p_2', { type: 'DRAW_CARD', deck: 'event' }, now + 50);
  applyPlayerGameAction(sGuard, 'p_2', { type: 'END_TURN' }, now + 60);
  const afterPrivateLogs = getPublicGameView(sGuard).publicLog;
  const ids = afterPrivateLogs.map((l) => Number(l.id.replace('log-', '')));
  for (let i = 1; i < ids.length; i++) {
    assert.equal(ids[i], ids[i - 1] + 1, 'publicLog IDs phải liên tiếp không để lộ private event');
  }
});
