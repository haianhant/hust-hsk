/**
 * test/boardgame-engine.test.cjs — Kiểm thử đơn vị Pure Domain Engine v4 cho
 * "Bóng Đêm KTX v4 — Săn Bóng Đêm KTX" (rulesetVersion = 4).
 *
 * Bao phủ:
 *  - Setup 4–8 người chơi: rulesetVersion=4, phân bổ phe chuẩn, vai không trùng, khởi tạo pha ROLL_MOVE
 *  - Di chuyển bằng xúc xắc 1d6 + 1d4: trúng ô hiện tại -> rerollRequired=true, chống kẹt sau 2 lần, tổng 7 -> CHOOSE_MOVE
 *  - Quyền năng 6 khu vực (ô 2–3, 4–5, 6, 8, 9 Hồi/Bẫy, 10 Cướp đồ)
 *  - Thẻ Thăm Dò Kín 1-đối-1: bảo mật P0 không lộ tên/điều kiện thẻ ở kênh công khai
 *  - Chiến đấu |1d6 - 1d4| cùng Cụm, Gậy Gỗ Tập Võ (1d4), Dây Cáp Đàn Hồi (khác Cụm), Móc Kéo (cướp đồ), Tú hút máu, Dũng phản đòn
 *  - Điều kiện thắng 3 phe + Kẻ Độc Hành (Hải 3 đồ, Trang trụ <=2 người, Bình bảo hộ/báo thù)
 *  - Ràng buộc hợp đồng & chống prototype pollution (`validateBoardGameActionPayload`, `turnTimeoutMs === 0`)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
require('./register-ts.cjs');

const {
  BOARD_GAME_DEFAULT_TURN_TIMEOUT_MS,
  BOARD_GAME_RULESET_VERSION,
  validateBoardGameActionPayload,
  validateBoardGameClientMessage,
} = require('../shared/contracts/boardgame.ts');
const {
  BOARD_GAME_MAX_EQUIPPED,
  BOARD_GAME_MAX_HAND,
  LOCATIONS_CATALOG,
  ROLES_CATALOG,
  applyPlayerGameAction,
  applyTimeoutAutoTurn,
  areInSameCluster,
  canPlayerAttackTarget,
  createInitialGameState,
  evaluateVictory,
  getActivePlayer,
  getPrivateGameView,
  getPublicGameView,
  getRoleDistribution,
  resolveLocationForDiceTotal,
} = require('../features/boardgame/domain/index.ts');
const {
  resolveActionTargets,
  toggleSelectedTargetId,
} = require('../features/boardgame/ui/target-selection.ts');

function makePlayers(n) {
  return Array.from({ length: n }, (_, i) => ({
    playerId: `p_${i + 1}`,
    displayName: `SV ${i + 1}`,
    seatIndex: i,
    appearance: { gender: 'male', topStyle: 'hoodie', hairColor: '#1f2937', skinTone: '#f1c27d' },
    connected: true,
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

function stepSingleTurnThroughRollAndLoc(state, nowMs) {
  const active = getActivePlayer(state);
  assert.ok(active);
  for (let r = 0; r < 4 && state.turnPhase === 'ROLL_MOVE' && !state.finished; r++) {
    const res = applyPlayerGameAction(state, active.playerId, { type: 'ROLL_DICE' }, nowMs + r * 10);
    assert.equal(res.ok, true);
  }
  if (state.turnPhase === 'CHOOSE_MOVE') {
    const dest = LOCATIONS_CATALOG.find((l) => l.id !== active.location).id;
    const res = applyPlayerGameAction(state, active.playerId, { type: 'CHOOSE_DEST', location: dest }, nowMs + 50);
    assert.equal(res.ok, true);
  }
  assert.equal(state.turnPhase, 'LOCATION_ACTION');
  return active;
}

test('V4.1 — Setup 4–8 người chơi: rulesetVersion=4, phân bổ phe, bài khởi đầu & mặc định vô hạn thời gian', () => {
  assert.equal(BOARD_GAME_RULESET_VERSION, 4);
  assert.equal(BOARD_GAME_DEFAULT_TURN_TIMEOUT_MS, 0);
  assert.equal(ROLES_CATALOG.length, 9);
  assert.equal(LOCATIONS_CATALOG.length, 6);

  for (let n = 4; n <= 8; n++) {
    const state = createInitialGameState({
      matchId: `v4-setup-${n}`,
      seed: 1000 + n * 41,
      nowMs: 1_750_000_000_000,
      players: makePlayers(n),
    });

    assert.equal(state.rulesetVersion, 4);
    assert.equal(Object.keys(state.players).length, n);
    assert.equal(state.turnOrder.length, n);
    assert.equal(state.round, 1);
    assert.equal(state.turnPhase, 'ROLL_MOVE');

    const playersList = Object.values(state.players);
    const split = getRoleDistribution(n);
    assert.equal(playersList.filter((p) => p.faction === 'lantern-guard').length, split.lanternGuard);
    assert.equal(playersList.filter((p) => p.faction === 'mist-order').length, split.mistOrder);
    assert.equal(playersList.filter((p) => p.faction === 'wanderer').length, split.wanderer);
    assert.equal(new Set(playersList.map((p) => p.roleId)).size, n);

    for (const p of playersList) {
      assert.equal(p.hand.length, 1);
      assert.equal(p.woundsTaken, 0);
      assert.equal(p.revealed, false);
    }

    // P0 Public View Audit trước khi lật vai
    const pub = getPublicGameView(state);
    assert.equal(pub.rulesetVersion, 4);
    const pubKeys = collectObjectKeys(pub);
    assert.equal(pubKeys.has('hp'), false);
    assert.equal(pubKeys.has('maxHp'), false);
    assert.equal(pubKeys.has('protegePlayerId'), false);
    assert.equal(pubKeys.has('privateClues'), false);
    assert.equal(pubKeys.has('rngState'), false);
    for (const pl of pub.players) {
      assert.equal(pl.revealedRoleId, null);
      assert.equal(pl.revealedFaction, null);
      assert.equal(pl.revealedMaxHp, null);
      assert.equal(pl.woundsTaken, 0);
    }
  }
});

test('V4.2 — Xúc xắc di chuyển 1d6+1d4: đổ lại khi trùng ô hiện tại, chống kẹt sau 2 lần & tổng 7 chọn bất kỳ', () => {
  assert.equal(resolveLocationForDiceTotal(2), 'radio');
  assert.equal(resolveLocationForDiceTotal(3), 'radio');
  assert.equal(resolveLocationForDiceTotal(4), 'breaker');
  assert.equal(resolveLocationForDiceTotal(5), 'breaker');
  assert.equal(resolveLocationForDiceTotal(6), 'lobby');
  assert.equal(resolveLocationForDiceTotal(7), 'choose-any');
  assert.equal(resolveLocationForDiceTotal(8), 'canteen');
  assert.equal(resolveLocationForDiceTotal(9), 'corridor');
  assert.equal(resolveLocationForDiceTotal(10), 'court');

  let sawReroll = false;
  let sawFreeChoice = false;
  for (let seed = 1; seed <= 80 && (!sawReroll || !sawFreeChoice); seed++) {
    const state = createInitialGameState({
      matchId: `dice-${seed}`,
      seed,
      nowMs: 1_750_000_000_000,
      players: makePlayers(4),
    });
    const active = getActivePlayer(state);
    const startLoc = active.location;
    const res = applyPlayerGameAction(state, active.playerId, { type: 'ROLL_DICE' }, 1_750_000_001_000);
    assert.equal(res.ok, true);
    assert.ok(state.lastDiceRoll);
    assert.ok(state.lastDiceRoll.d6 >= 1 && state.lastDiceRoll.d6 <= 6);
    assert.ok(state.lastDiceRoll.d4 >= 1 && state.lastDiceRoll.d4 <= 4);

    if (state.lastDiceRoll.total === 7) {
      sawFreeChoice = true;
      assert.equal(state.turnPhase, 'CHOOSE_MOVE');
      assert.equal(state.lastDiceRoll.freeChoice, true);
      // Không được chọn trùng ô đang đứng
      const sameErr = applyPlayerGameAction(
        state,
        active.playerId,
        { type: 'CHOOSE_DEST', location: startLoc },
        1_750_000_002_000,
      );
      assert.equal(sameErr.ok, false);
      const nextLoc = LOCATIONS_CATALOG.find((l) => l.id !== startLoc).id;
      const moveOk = applyPlayerGameAction(
        state,
        active.playerId,
        { type: 'CHOOSE_DEST', location: nextLoc },
        1_750_000_003_000,
      );
      assert.equal(moveOk.ok, true);
      assert.equal(state.turnPhase, 'LOCATION_ACTION');
      assert.equal(active.location, nextLoc);
    } else if (state.lastDiceRoll.rerollRequired) {
      sawReroll = true;
      assert.equal(state.turnPhase, 'ROLL_MOVE');
      assert.equal(active.location, startLoc);
      // Đổ tối đa thêm 2 lần phải thoát được khỏi ô hiện tại
      let escaped = false;
      for (let k = 0; k < 3; k++) {
        applyPlayerGameAction(state, active.playerId, { type: 'ROLL_DICE' }, 1_750_000_004_000 + k);
        if (state.turnPhase !== 'ROLL_MOVE') {
          escaped = true;
          break;
        }
      }
      assert.equal(escaped, true, 'Anti-loop guard must guarantee leaving ROLL_MOVE');
    } else {
      assert.equal(state.turnPhase, 'LOCATION_ACTION');
      assert.notEqual(active.location, startLoc);
    }
  }
  assert.ok(sawReroll, 'Expected to observe at least one same-zone reroll across seeds');
  assert.ok(sawFreeChoice, 'Expected to observe at least one total=7 CHOOSE_MOVE across seeds');
});

test('V4.3 — Quyền năng 6 ô & Thẻ Thăm Dò Kín 1-đối-1 bảo mật P0', () => {
  const state = createInitialGameState({
    matchId: 'loc-and-inv',
    seed: 2025,
    nowMs: 1_750_000_000_000,
    players: makePlayers(4),
  });
  const actor = getActivePlayer(state);
  const target = Object.values(state.players).find((p) => p.playerId !== actor.playerId);

  // Đẩy qua ROLL_MOVE vào LOCATION_ACTION
  stepSingleTurnThroughRollAndLoc(state, 1_750_000_000_100);

  // Thử ô 9 (corridor): Heal / Damage
  actor.location = 'corridor';
  target.woundsTaken = 2;
  target.hp = target.maxHp - 2;
  const healRes = applyPlayerGameAction(
    state,
    actor.playerId,
    { type: 'USE_LOC_POWER', targetPlayerId: target.playerId, mode: 'heal' },
    1_750_000_001_000,
  );
  assert.equal(healRes.ok, true);
  assert.equal(target.woundsTaken, 1);
  assert.equal(state.turnPhase, 'MAIN_ACTION');

  // Cầm inv-01..inv-02 chính xác và kiểm tra P0 không rò tên thẻ công khai
  target.roleId = 'gac-ky-thuat';
  target.faction = 'lantern-guard';
  target.hp = target.maxHp;
  target.woundsTaken = 0;
  actor.hand = ['inv-01'];
  const invRes = applyPlayerGameAction(
    state,
    actor.playerId,
    { type: 'INVESTIGATE_CARD', cardId: 'inv-01', targetPlayerId: target.playerId },
    1_750_000_002_000,
  );
  assert.equal(invRes.ok, true);
  assert.equal(target.woundsTaken, 1, 'inv-01 must inflict 1 wound on lantern-guard target');

  const pub = getPublicGameView(state);
  assert.ok(pub.lastInvestigation);
  assert.equal(pub.lastInvestigation.cardId, 'inv-00');
  assert.equal(pub.lastInvestigation.cardTitle, 'Thẻ Thăm Dò Kín');
  assert.equal(JSON.stringify(pub).includes('Phiếu Thử: Đội Săn Đêm'), false);

  const actorPriv = getPrivateGameView(state, actor.playerId);
  const targetPriv = getPrivateGameView(state, target.playerId);
  assert.equal(actorPriv.privateClues[actorPriv.privateClues.length - 1].cardTitle, 'Phiếu Thử: Đội Săn Đêm');
  assert.equal(targetPriv.privateClues[targetPriv.privateClues.length - 1].cardTitle, 'Phiếu Thử: Đội Săn Đêm');

  // Khánh "Tin Giả" (suong-tin-gia) khi đang úp vai phải né mọi Thẻ Khám Phá Kín gây thương tích (báo Không phản ứng)
  const khanh = Object.values(state.players).find(
    (p) => p.playerId !== actor.playerId && p.playerId !== target.playerId,
  );
  khanh.roleId = 'suong-tin-gia';
  khanh.faction = 'mist-order';
  khanh.revealed = false;
  khanh.woundsTaken = 0;
  khanh.hp = 11;
  actor.hand = ['inv-02', 'inv-08'];
  applyPlayerGameAction(
    state,
    actor.playerId,
    { type: 'INVESTIGATE_CARD', cardId: 'inv-02', targetPlayerId: khanh.playerId },
    1_750_000_002_100,
  );
  assert.equal(khanh.woundsTaken, 0, 'Unrevealed Khánh must evade inv-02 shadow damage');
  assert.equal(state.lastInvestigation.outcome, 'no-reaction');
  applyPlayerGameAction(
    state,
    actor.playerId,
    { type: 'INVESTIGATE_CARD', cardId: 'inv-08', targetPlayerId: khanh.playerId },
    1_750_000_002_200,
  );
  assert.equal(khanh.woundsTaken, 0, 'Unrevealed Khánh must evade inv-08 unrevealed damage');
  assert.equal(state.lastInvestigation.outcome, 'no-reaction');
});

test('V4.4 — Tầm đánh 3 Cụm, Gậy 1d4 (ev-01), Dây Cáp (ev-04), Móc Kéo (ev-05), Tú hút máu & Dũng phản đòn', () => {
  const state = createInitialGameState({
    matchId: 'combat-test',
    seed: 999,
    nowMs: 1_750_000_000_000,
    players: makePlayers(4),
  });
  const [id1, id2, id3] = state.turnOrder;
  const p1 = state.players[id1];
  const p2 = state.players[id2];
  const p3 = state.players[id3];

  p1.location = 'radio'; // north
  p2.location = 'breaker'; // north (cùng cụm!)
  p3.location = 'court'; // south (khác cụm!)

  assert.equal(areInSameCluster(p1.location, p2.location), true);
  assert.equal(areInSameCluster(p1.location, p3.location), false);
  assert.equal(canPlayerAttackTarget(state, p1, p2), true);
  assert.equal(canPlayerAttackTarget(state, p1, p3), false);

  // Trang bị Dây Cáp Đàn Hồi (ev-04) -> đổi tầm sang cụm khác
  p1.equipped = ['ev-04'];
  assert.equal(canPlayerAttackTarget(state, p1, p3), true);
  assert.equal(canPlayerAttackTarget(state, p1, p2), false);

  // Kiểm tra Tú hút máu & Dũng phản đòn khi Tú dùng Gậy Gỗ (ev-01) đánh Dũng
  state.turnPhase = 'MAIN_ACTION';
  p1.roleId = 'suong-an-danh';
  p1.faction = 'mist-order';
  p1.revealed = true;
  p1.woundsTaken = 3;
  p1.hp = p1.maxHp - 3;
  p1.equipped = ['ev-01', 'ev-05']; // luôn trúng 1d4 + cướp đồ nếu >=2 dmg

  p2.location = 'radio';
  p2.roleId = 'suong-gac-cong';
  p2.faction = 'mist-order';
  p2.maxHp = 14;
  p2.hp = 14;
  p2.woundsTaken = 0;
  p2.revealed = true;
  p2.equipped = ['eq-03', 'ev-01']; // Gậy 1d4 phản công chắc chắn gây 1..4 sát thương!

  const p2HpBefore = p2.hp;
  const p1WoundsBefore = p1.woundsTaken;
  const res = applyPlayerGameAction(
    state,
    p1.playerId,
    { type: 'ATTACK', targetPlayerId: p2.playerId },
    1_750_000_010_000,
  );
  assert.equal(res.ok, true);
  assert.ok(p2.woundsTaken >= 1 && p2.woundsTaken <= 4);
  assert.ok(p2.hp < p2HpBefore);
  // Dũng (14 HP) sống nên lập tức tung phản kích (với Gậy 1d4 gây 1..4 dmg; Tú hút 2 khi trúng -> tổng wounds >= p1WoundsBefore - 1)
  assert.ok(p1.woundsTaken >= p1WoundsBefore - 1 && p1.woundsTaken <= p1WoundsBefore + 2);
  if (p2.woundsTaken >= 2) {
    assert.equal(p2.equipped.length, 1, 'Móc Kéo Đồ KTX phải cướp đồ giá trị cao nhất từ Dũng');
    assert.ok(p1.equipped.includes('ev-01'));
  }

  // Kiểm tra Minh 1d4 toàn bàn, Vy 1d6 toàn bàn, Lan khiên 1 vòng & Trang 9 HP hồi đầy máu
  state.activePlayerId = p1.playerId;
  state.turnPhase = 'MAIN_ACTION';
  p1.roleId = 'gac-ky-thuat';
  p1.revealed = true;
  p1.skillUsedOnce = false;
  p3.hp = 14;
  p3.woundsTaken = 0;
  const minhSkill = applyPlayerGameAction(
    state,
    p1.playerId,
    { type: 'USE_SKILL', targetPlayerId: p3.playerId },
    1_750_000_011_000,
  );
  assert.equal(minhSkill.ok, true);
  assert.ok(p3.woundsTaken >= 1 && p3.woundsTaken <= 4, 'Minh 1d4 must deal 1..4 global dmg');

  p1.roleId = 'gac-radio';
  p1.skillUsedOnce = false;
  const p3WoundsAfterMinh = p3.woundsTaken;
  const vySkill = applyPlayerGameAction(
    state,
    p1.playerId,
    { type: 'USE_SKILL', targetPlayerId: p3.playerId },
    1_750_000_012_000,
  );
  assert.equal(vySkill.ok, true);
  assert.ok(p3.woundsTaken >= p3WoundsAfterMinh + 1 && p3.woundsTaken <= p3WoundsAfterMinh + 6);

  p1.roleId = 'gac-truc-ban';
  p1.skillUsedOnce = false;
  const lanSkill = applyPlayerGameAction(state, p1.playerId, { type: 'USE_SKILL' }, 1_750_000_013_000);
  assert.equal(lanSkill.ok, true);
  assert.equal(p1.guardianShieldActive, true);

  p1.roleId = 'lang-quan-sat';
  p1.skillUsedOnce = false;
  p1.maxHp = 9;
  p1.woundsTaken = 6;
  p1.hp = 3;
  const trangSkill = applyPlayerGameAction(state, p1.playerId, { type: 'USE_SKILL' }, 1_750_000_014_000);
  assert.equal(trangSkill.ok, true);
  assert.equal(p1.woundsTaken, 0);
  assert.equal(p1.hp, 9);
});

function createStateWithRole(playerCount, roleId, matchPrefix) {
  for (let seed = 1; seed <= 80; seed += 1) {
    const state = createInitialGameState({
      matchId: `${matchPrefix}-${seed}`,
      seed,
      nowMs: 1_750_000_000_000,
      players: makePlayers(playerCount),
    });
    const found = Object.values(state.players).find((p) => p.roleId === roleId);
    if (found) {
      return { state, player: found };
    }
  }
  throw new Error(`Could not find role ${roleId} for ${playerCount} players within seed 1..80`);
}

test('V4.5 — Điều kiện thắng: Đội Săn Đêm, Hội Bóng Đêm, Hải 3 đồ từ vòng 3 (lật vai), Trang, Bình báo thù, tự loại giữa lượt & Timeout', () => {
  // 1. Hải thắng ngay từ vòng 3 khi lật vai và có 3 Trang bị
  const { state: sHai, player: hai } = createStateWithRole(6, 'lang-anh-san', 'win-hai');
  assert.ok(hai);
  sHai.round = 3;
  hai.revealed = true;
  hai.equipped = ['eq-01', 'eq-02', 'eq-03'];
  const vHai = evaluateVictory(sHai);
  assert.equal(vHai.finished, true);
  assert.ok(vHai.winnerPlayerIds.includes(hai.playerId));

  // 2. Trang sống sót tới cuối trận (khi phe chính thắng) sẽ thắng cùng phe kết thúc trận đấu
  const { state: sTrang, player: trang } = createStateWithRole(6, 'lang-quan-sat', 'win-trang');
  assert.ok(trang);
  for (const p of Object.values(sTrang.players)) {
    if (p.faction === 'mist-order') {
      p.alive = false;
      p.hp = 0;
    }
  }
  const vTrang = evaluateVictory(sTrang);
  assert.equal(vTrang.finished, true);
  assert.ok(vTrang.winnerPlayerIds.includes(trang.playerId));

  // 3. Bình tự tay kết liễu thủ phạm loại người được bảo hộ
  const { state: sBinh, player: binh } = createStateWithRole(6, 'lang-cuu-ho', 'win-binh');
  assert.ok(binh);
  binh.revealed = true;
  binh.avengedProtegeKiller = true;
  const vBinh = evaluateVictory(sBinh);
  assert.equal(vBinh.finished, true);
  assert.ok(vBinh.winnerPlayerIds.includes(binh.playerId));

  // 4. applyTimeoutAutoTurn chuyển lượt mượt mà ở mọi pha
  const sTimeout = createInitialGameState({
    matchId: 'timeout-auto',
    seed: 77,
    nowMs: 1_750_000_000_000,
    players: makePlayers(4),
  });
  const firstId = sTimeout.activePlayerId;
  applyTimeoutAutoTurn(sTimeout, 1_750_000_090_000);
  assert.notEqual(sTimeout.activePlayerId, firstId);
  assert.equal(sTimeout.turnPhase, 'ROLL_MOVE');

  // 5. Tự sát/tự loại giữa lượt (ev-07 vào ô mình khi <= 2 HP) không làm kẹt phòng: tự sang lượt người kế
  const sSelfKo = createInitialGameState({
    matchId: 'self-ko',
    seed: 91,
    nowMs: 1_750_000_000_000,
    players: makePlayers(5),
  });
  const killerActor = getActivePlayer(sSelfKo);
  sSelfKo.turnPhase = 'MAIN_ACTION';
  killerActor.hp = 2;
  killerActor.woundsTaken = killerActor.maxHp - 2;
  killerActor.hand.push('ev-07');
  const koRes = applyPlayerGameAction(
    sSelfKo,
    killerActor.playerId,
    { type: 'USE_CARD', cardId: 'ev-07', targetLocation: killerActor.location },
    1_750_000_001_000,
  );
  assert.equal(koRes.ok, true);
  assert.equal(killerActor.alive, false);
  if (!sSelfKo.finished) {
    assert.notEqual(sSelfKo.activePlayerId, killerActor.playerId);
    assert.equal(sSelfKo.turnPhase, 'ROLL_MOVE');
  }
});

test('V4.6 — Hợp đồng Validate Action & turnTimeoutMs === 0 (Vô hạn)', () => {
  assert.equal(validateBoardGameActionPayload({ type: 'ROLL_DICE' }).ok, true);
  assert.equal(validateBoardGameActionPayload({ type: 'CHOOSE_DEST', location: 'court' }).ok, true);
  assert.equal(validateBoardGameActionPayload({ type: 'SKIP_LOC' }).ok, true);
  assert.equal(validateBoardGameActionPayload({ type: 'USE_LOC_POWER', targetPlayerId: 'p_1', mode: 'heal' }).ok, true);
  assert.equal(validateBoardGameActionPayload({ type: 'USE_CARD', cardId: 'ev-07', targetLocation: 'radio' }).ok, true);
  assert.equal(validateBoardGameActionPayload({ type: 'USE_CARD', cardId: 'ev-07', targetLocation: 'toString' }).ok, false);
  assert.equal(validateBoardGameActionPayload({ type: 'PLAY_EVENT', cardId: 'ev-07' }).ok, false);

  const startZero = validateBoardGameClientMessage({
    type: 'BG_START_MATCH',
    requestId: 's0',
    turnTimeoutMs: 0,
  });
  assert.equal(startZero.ok, true);
});

test('V4.7 — Tự hồi máu (eq-05, eq-06, eq-07, eq-08, ô 9) & không bị kẹt mục tiêu đối thủ trên UI', () => {
  const state = createInitialGameState({
    matchId: 'v4-self-heal',
    seed: 515,
    nowMs: 1_750_000_000_000,
    players: makePlayers(4),
  });
  const list = Object.values(state.players);
  const actor = getActivePlayer(state);
  const enemy = list.find((p) => p.playerId !== actor.playerId);
  const ally = list.find((p) => p.playerId !== actor.playerId && p.playerId !== enemy.playerId);
  assert.ok(actor && enemy && ally);

  // 1. Engine: eq-05 (Nước Tăng Lực) & eq-06 (Bộ Sơ Cứu) hồi cho chính bản thân ngay cả sau khi tương tác đối thủ
  state.turnPhase = 'LOCATION_ACTION';
  actor.location = 'corridor';
  actor.woundsTaken = 5;
  actor.hp = actor.maxHp - 5;
  const locSelfHeal = applyPlayerGameAction(
    state,
    actor.playerId,
    { type: 'USE_LOC_POWER', targetPlayerId: actor.playerId, mode: 'heal' },
    1_750_000_001_000,
  );
  assert.equal(locSelfHeal.ok, true);
  assert.equal(actor.woundsTaken, 4);
  assert.equal(state.turnPhase, 'MAIN_ACTION');

  actor.hand.push('eq-05', 'eq-06', 'eq-07');
  const eq05Res = applyPlayerGameAction(
    state,
    actor.playerId,
    { type: 'USE_CARD', cardId: 'eq-05', targetPlayerId: actor.playerId },
    1_750_000_002_000,
  );
  assert.equal(eq05Res.ok, true);
  assert.equal(actor.woundsTaken, 2, 'eq-05 phải hồi 2 vết thương cho chính mình');

  actor.woundsTaken = 5;
  actor.hp = actor.maxHp - 5;
  const eq06Res = applyPlayerGameAction(
    state,
    actor.playerId,
    { type: 'USE_CARD', cardId: 'eq-06', targetPlayerId: actor.playerId },
    1_750_000_003_000,
  );
  assert.equal(eq06Res.ok, true);
  assert.equal(actor.woundsTaken, 2, 'eq-06 phải hồi 3 vết thương cho chính mình');

  // eq-07 hồi cả cụm gồm cả bản thân
  enemy.location = actor.location;
  enemy.woundsTaken = 3;
  enemy.hp = enemy.maxHp - 3;
  const eq07Res = applyPlayerGameAction(
    state,
    actor.playerId,
    { type: 'USE_CARD', cardId: 'eq-07' },
    1_750_000_004_000,
  );
  assert.equal(eq07Res.ok, true);
  assert.equal(actor.woundsTaken, 0, 'eq-07 phải hồi 2 vết thương cho bản thân');
  assert.equal(enemy.woundsTaken, 1, 'eq-07 phải hồi 2 vết thương cho người cùng cụm');

  // eq-08 hồi đầy cho Đội Săn Đêm đã lật vai
  actor.faction = 'lantern-guard';
  actor.revealed = true;
  actor.woundsTaken = 4;
  actor.hp = actor.maxHp - 4;
  actor.hand.push('eq-08');
  const eq08Res = applyPlayerGameAction(
    state,
    actor.playerId,
    { type: 'USE_CARD', cardId: 'eq-08' },
    1_750_000_005_000,
  );
  assert.equal(eq08Res.ok, true);
  assert.equal(actor.woundsTaken, 0);

  // 2. UI target-selection logic: click lại chính mình & tách riêng mục tiêu thẻ hồi máu
  const pub = getPublicGameView(state);
  const selfPub = pub.players.find((p) => p.playerId === actor.playerId);
  const enemyPub = pub.players.find((p) => p.playerId === enemy.playerId);
  const allyPub = pub.players.find((p) => p.playerId === ally.playerId);
  const alivePlayers = pub.players.filter((p) => p.alive);
  const aliveOthers = alivePlayers.filter((p) => p.playerId !== selfPub.playerId);
  const attackableTargets = [enemyPub];

  // Cho phép toggle chọn chính mình và bỏ chọn
  assert.equal(toggleSelectedTargetId(enemyPub.playerId, selfPub.playerId, true), selfPub.playerId);
  assert.equal(toggleSelectedTargetId(selfPub.playerId, selfPub.playerId, true), null);
  assert.equal(toggleSelectedTargetId(null, selfPub.playerId, false), null);

  // Sau khi đã click vào kẻ địch để đánh (selectedTargetId = enemy), thẻ hồi máu vẫn phải mặc định chọn Bản thân!
  const afterEnemySelected = resolveActionTargets({
    selfPlayer: selfPub,
    alivePlayers,
    aliveOthers,
    attackableTargets,
    selectedTargetId: enemyPub.playerId,
    healTargetId: null,
  });
  assert.equal(afterEnemySelected.validAttackTarget?.playerId, enemyPub.playerId);
  assert.equal(afterEnemySelected.validOtherTarget?.playerId, enemyPub.playerId);
  assert.equal(afterEnemySelected.validHealCardTarget.playerId, selfPub.playerId);

  // Người chơi chủ động chọn hồi cho đồng đội rồi đổi về lại bản thân đều hợp lệ
  const allyHeal = resolveActionTargets({
    selfPlayer: selfPub,
    alivePlayers,
    aliveOthers,
    attackableTargets,
    selectedTargetId: enemyPub.playerId,
    healTargetId: allyPub.playerId,
  });
  assert.equal(allyHeal.validHealCardTarget.playerId, allyPub.playerId);

  const backToSelf = resolveActionTargets({
    selfPlayer: selfPub,
    alivePlayers,
    aliveOthers,
    attackableTargets,
    selectedTargetId: selfPub.playerId,
    healTargetId: selfPub.playerId,
  });
  assert.equal(backToSelf.validHealCardTarget.playerId, selfPub.playerId);
  assert.equal(backToSelf.validAnyTarget.playerId, selfPub.playerId);
  assert.notEqual(backToSelf.validAttackTarget?.playerId, selfPub.playerId);
  assert.notEqual(backToSelf.validOtherTarget?.playerId, selfPub.playerId);
});

test('V4.8 — Gỡ trần 3 Trang bị, tay 5 lá + dùng thẻ ở Pha 2, chặn tự bắn Ô 9 & counterRoll', () => {
  assert.equal(BOARD_GAME_MAX_HAND, 5);
  assert.ok(BOARD_GAME_MAX_EQUIPPED >= 99);

  const state = createInitialGameState({
    matchId: 'v4-pack-a',
    seed: 909,
    nowMs: 1_750_100_000_000,
    players: makePlayers(4),
  });
  const list = Object.values(state.players);
  const actor = getActivePlayer(state);
  const dung = list.find((p) => p.playerId !== actor.playerId);
  assert.ok(actor && dung);

  // Cố định phe 2 vs 2 rõ ràng để không kết thúc sớm giữa chừng
  const others = list.filter((p) => p.playerId !== actor.playerId && p.playerId !== dung.playerId);
  actor.roleId = 'gac-truc-ban';
  actor.faction = 'lantern-guard';
  actor.maxHp = 13;
  actor.hp = 13;
  actor.woundsTaken = 0;

  dung.roleId = 'suong-gac-cong';
  dung.faction = 'mist-order';
  dung.maxHp = 14;
  dung.hp = 14;
  dung.woundsTaken = 0;
  dung.revealed = true;
  dung.equipped = ['ev-01'];

  others[0].roleId = 'gac-radio';
  others[0].faction = 'lantern-guard';
  others[1].roleId = 'suong-an-danh';
  others[1].faction = 'mist-order';

  // 1. Dùng bài Hành động & Thăm Dò Kín ngay trong Pha 2 (LOCATION_ACTION) mà vẫn còn lượt rút ở khu vực
  state.turnPhase = 'LOCATION_ACTION';
  actor.location = 'radio';
  actor.woundsTaken = 3;
  actor.hp = actor.maxHp - 3;
  actor.hand = ['eq-05', 'inv-01', 'eq-01', 'eq-02', 'eq-03'];

  const p2Heal = applyPlayerGameAction(
    state,
    actor.playerId,
    { type: 'USE_CARD', cardId: 'eq-05', targetPlayerId: actor.playerId },
    1_750_100_001_000,
  );
  assert.equal(p2Heal.ok, true);
  assert.equal(state.turnPhase, 'LOCATION_ACTION', 'Dùng thẻ ở Pha 2 không được làm mất Pha 2');
  assert.equal(actor.hand.length, 4);

  const p2Inv = applyPlayerGameAction(
    state,
    actor.playerId,
    { type: 'INVESTIGATE_CARD', cardId: 'inv-01', targetPlayerId: dung.playerId },
    1_750_100_002_000,
  );
  assert.equal(p2Inv.ok, true);
  assert.equal(state.turnPhase, 'LOCATION_ACTION');
  assert.equal(actor.hand.length, 3);

  // 2. Trang bị đủ 4 món từ tay + cướp thêm món thứ 5 tại Sân Bóng (10): không món nào bị vứt bỏ!
  for (const eqId of ['eq-01', 'eq-02', 'eq-03']) {
    const eqRes = applyPlayerGameAction(
      state,
      actor.playerId,
      { type: 'EQUIP_CARD', cardId: eqId },
      1_750_100_003_000,
    );
    assert.equal(eqRes.ok, true);
  }
  actor.hand.push('eq-04');
  assert.equal(
    applyPlayerGameAction(state, actor.playerId, { type: 'EQUIP_CARD', cardId: 'eq-04' }, 1_750_100_004_000).ok,
    true,
  );
  assert.deepEqual(actor.equipped, ['eq-01', 'eq-02', 'eq-03', 'eq-04']);

  actor.location = 'court';
  const stealFifth = applyPlayerGameAction(
    state,
    actor.playerId,
    { type: 'USE_LOC_POWER', targetPlayerId: dung.playerId, mode: 'steal' },
    1_750_100_005_000,
  );
  assert.equal(stealFifth.ok, true);
  assert.equal(actor.equipped.length, 5, 'Trang bị đặt ngửa chuẩn Shadow Hunters không giới hạn 3 món');
  assert.ok(actor.equipped.includes('eq-01') && actor.equipped.includes('ev-01'));

  // 3. Chặn tự gây 2 sát thương lên chính mình tại Ô 9 (corridor), vẫn cho phép tự hồi 1
  state.turnPhase = 'LOCATION_ACTION';
  actor.location = 'corridor';
  const selfDmgBlock = applyPlayerGameAction(
    state,
    actor.playerId,
    { type: 'USE_LOC_POWER', targetPlayerId: actor.playerId, mode: 'damage' },
    1_750_100_006_000,
  );
  assert.equal(selfDmgBlock.ok, false);
  actor.woundsTaken = 2;
  actor.hp = actor.maxHp - 2;
  const selfHealOk = applyPlayerGameAction(
    state,
    actor.playerId,
    { type: 'USE_LOC_POWER', targetPlayerId: actor.playerId, mode: 'heal' },
    1_750_100_007_000,
  );
  assert.equal(selfHealOk.ok, true);
  assert.equal(actor.woundsTaken, 1);

  // 4. Đầy 5 lá trên tay rút thêm mới bỏ lá cũ & ghi log ẩn tên bài
  state.turnPhase = 'LOCATION_ACTION';
  actor.location = 'lobby';
  actor.hand = ['inv-02', 'inv-03', 'eq-06', 'eq-07', 'ev-06'];
  const overflowDraw = applyPlayerGameAction(
    state,
    actor.playerId,
    { type: 'DRAW_CARD', deck: 'equipment' },
    1_750_100_008_000,
  );
  assert.equal(overflowDraw.ok, true);
  assert.equal(actor.hand.length, 5);
  assert.equal(actor.hand[0], 'inv-03');
  const lastLog = state.publicLog[state.publicLog.length - 1];
  assert.ok(lastLog.text.includes('đầy tay 5 lá'), `Expected full-hand note in log, got: ${lastLog.text}`);
  assert.equal(lastLog.text.includes('inv-02'), false);

  // 5. Đòn phản kích của Dũng "Gác Cổng" ghi nhận counterRoll trên lastDiceRoll
  state.activePlayerId = actor.playerId;
  state.turnPhase = 'MAIN_ACTION';
  actor.location = 'radio';
  dung.location = 'radio';
  dung.equipped = ['ev-01']; // Dụng cụ chắc chắn gây 1d4 phản công
  const atkRes = applyPlayerGameAction(
    state,
    actor.playerId,
    { type: 'ATTACK', targetPlayerId: dung.playerId },
    1_750_100_009_000,
  );
  assert.equal(atkRes.ok, true);
  assert.ok(state.lastDiceRoll?.counterRoll, 'Phản kích của Dũng phải điền lastDiceRoll.counterRoll');
  assert.equal(state.lastDiceRoll.counterRoll.playerId, dung.playerId);
  assert.ok(state.lastDiceRoll.counterRoll.damageDealt >= 1);
});
