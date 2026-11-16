/**
 * test/boardgame-engine.test.cjs — Kiểm thử đơn vị Pure Domain Engine v4 cho
 * "Bóng Đêm KTX v4 — 100% Luật gốc Shadow Hunters" (rulesetVersion = 4).
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
  CARDS_CATALOG,
  DEFAULT_CLUSTER_PAIRS,
  LOCATIONS_CATALOG,
  ROLES_CATALOG,
  applyPlayerGameAction,
  applyTimeoutAutoTurn,
  areInSameCluster,
  canPlayerAttackTarget,
  createInitialGameState,
  evaluateVictory,
  getActivePlayer,
  getPairedLocationInCluster,
  getPrivateGameView,
  getPublicGameView,
  getRoleDistribution,
  listCardIdsByDeck,
  resolveLocationForDiceTotal,
} = require('../features/boardgame/domain/index.ts');
const {
  resolveActionTargets,
  toggleSelectedTargetId,
} = require('../features/boardgame/ui/target-selection.ts');

function makePlayers(n) {
  return Array.from({ length: n }, (_, idx) => ({
    playerId: `p_${idx + 1}`,
    displayName: `SV ${idx + 1}`,
    seatIndex: idx,
    appearance: {
      gender: idx % 2 === 0 ? 'male' : 'female',
      topStyle: 'jacket',
      hairColor: '#1f2937',
      skinTone: '#f1c27d',
    },
    connected: true,
  }));
}

function collectObjectKeys(root, out = new Set()) {
  if (!root || typeof root !== 'object') return out;
  if (Array.isArray(root)) {
    for (const item of root) collectObjectKeys(item, out);
    return out;
  }
  for (const [k, v] of Object.entries(root)) {
    out.add(k);
    collectObjectKeys(v, out);
  }
  return out;
}

function stepSingleTurnThroughRoll(state, nowMs) {
  const active = getActivePlayer(state);
  assert.ok(active);
  for (let i = 0; i < 4 && state.turnPhase === 'ROLL_MOVE'; i++) {
    const res = applyPlayerGameAction(state, active.playerId, { type: 'ROLL_DICE' }, nowMs + i);
    assert.equal(res.ok, true);
  }
  if (state.turnPhase === 'CHOOSE_MOVE') {
    const pool = state.allowedMoveDestinations?.length
      ? state.allowedMoveDestinations
      : LOCATIONS_CATALOG.filter((l) => l.id !== active.location).map((l) => l.id);
    const res = applyPlayerGameAction(
      state,
      active.playerId,
      { type: 'CHOOSE_DEST', location: pool[0] },
      nowMs + 10,
    );
    assert.equal(res.ok, true);
  }
  assert.equal(state.turnPhase, 'LOCATION_ACTION');
  return active;
}

test('V4.1 — Setup Shadow Hunters gốc (4–8 SV): 10 vai, 48 lá (16×3), 0 bài khởi đầu, 7 SV (2-2-3), xáo 3 Cụm', () => {
  assert.equal(BOARD_GAME_RULESET_VERSION, 4);
  assert.equal(BOARD_GAME_DEFAULT_TURN_TIMEOUT_MS, 0);
  assert.equal(ROLES_CATALOG.length, 10);
  assert.equal(LOCATIONS_CATALOG.length, 6);
  assert.equal(listCardIdsByDeck('investigation').length, 16);
  assert.equal(listCardIdsByDeck('equipment').length, 16);
  assert.equal(listCardIdsByDeck('event').length, 16);
  assert.ok(CARDS_CATALOG.length >= 40);

  // Ô 4-5 (breaker) là Rút Bất Kỳ; Ô 8 (canteen) là Rút Đột Kích chuẩn Shadow Hunters
  assert.equal(LOCATIONS_CATALOG.find((l) => l.id === 'breaker').deckHint, 'any');
  assert.equal(LOCATIONS_CATALOG.find((l) => l.id === 'canteen').deckHint, 'event');

  // Kiểm tra chia phe 7 người đúng 2-2-3
  assert.deepEqual(getRoleDistribution(7), { lanternGuard: 2, mistOrder: 2, wanderer: 3 });

  const clusterSignatures = new Set();
  for (let n = 4; n <= 8; n++) {
    const state = createInitialGameState({
      matchId: `v4-setup-${n}`,
      seed: 1000 + n * 41,
      nowMs: 1_750_000_000_000,
      players: makePlayers(n),
    });

    assert.equal(state.rulesetVersion, 4);
    assert.equal(state.clusterPairs.length, 3);
    clusterSignatures.add(
      state.clusterPairs.map((c) => [...c.locationIds].sort().join('+')).sort().join('|'),
    );

    const playersList = Object.values(state.players);
    const split = getRoleDistribution(n);
    assert.equal(playersList.filter((p) => p.faction === 'lantern-guard').length, split.lanternGuard);
    assert.equal(playersList.filter((p) => p.faction === 'mist-order').length, split.mistOrder);
    assert.equal(playersList.filter((p) => p.faction === 'wanderer').length, split.wanderer);
    assert.equal(new Set(playersList.map((p) => p.roleId)).size, n);

    for (const p of playersList) {
      assert.equal(p.hand.length, 0, 'Shadow Hunters gốc khởi đầu với 0 bài trên tay');
      assert.equal(p.woundsTaken, 0);
      assert.equal(p.revealed, false);
    }

    // P0 Public View Audit trước khi lật vai
    const pub = getPublicGameView(state);
    assert.equal(pub.rulesetVersion, 4);
    assert.equal(pub.clusterPairs.length, 3);
    const pubKeys = collectObjectKeys(pub);
    assert.equal(pubKeys.has('hp'), false);
    assert.equal(pubKeys.has('maxHp'), false);
    assert.equal(pubKeys.has('protegePlayerId'), false);
    assert.equal(pubKeys.has('privateClues'), false);
    assert.equal(pubKeys.has('rngState'), false);
  }
  assert.ok(clusterSignatures.size >= 2, '3 Cụm phải được xáo ngẫu nhiên giữa các ván');
});

test('V4.2 — Xúc xắc 1d6+1d4: đổ lại khi trùng, tổng 7 chọn bất kỳ & La Bàn Định Hướng (eq-05)', () => {
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
    if (state.lastDiceRoll.total === 7) {
      sawFreeChoice = true;
      assert.equal(state.turnPhase, 'CHOOSE_MOVE');
      assert.equal(state.allowedMoveDestinations.length, 5);
    } else if (state.lastDiceRoll.rerollRequired) {
      sawReroll = true;
      assert.equal(state.turnPhase, 'ROLL_MOVE');
    } else {
      assert.equal(state.turnPhase, 'LOCATION_ACTION');
      assert.notEqual(active.location, startLoc);
    }
  }
  assert.ok(sawReroll && sawFreeChoice);

  // Kiểm chứng La Bàn Định Hướng (eq-05): tung 2 lần -> cho phép chọn trong allowedMoveDestinations
  let sawCompassChoice = false;
  for (let seed = 1; seed <= 25; seed++) {
    const sComp = createInitialGameState({
      matchId: `comp-${seed}`,
      seed,
      nowMs: 1_750_000_000_000,
      players: makePlayers(4),
    });
    const active = getActivePlayer(sComp);
    active.equipped.push('eq-05');
    applyPlayerGameAction(sComp, active.playerId, { type: 'ROLL_DICE' }, 1_750_000_001_000);
    if (sComp.turnPhase === 'CHOOSE_MOVE') {
      sawCompassChoice = true;
      const picked = sComp.allowedMoveDestinations[0];
      const chRes = applyPlayerGameAction(
        sComp,
        active.playerId,
        { type: 'CHOOSE_DEST', location: picked },
        1_750_000_002_000,
      );
      assert.equal(chRes.ok, true);
      assert.equal(active.location, picked);
      break;
    }
  }
  assert.ok(sawCompassChoice, 'La Bàn Định Hướng (eq-05) phải mở CHOOSE_MOVE với các kết quả tung');
});

test('V4.3 — Rút Trang bị đeo ngay, chặn giữ bài qua lượt, Thẻ Khám Phá (Aid 0→1 ST, Khánh Deceit, Tiên Tri)', () => {
  const state = createInitialGameState({
    matchId: 'cards-inv-test',
    seed: 2025,
    nowMs: 1_750_000_000_000,
    players: makePlayers(4),
  });
  state.clusterPairs = [...DEFAULT_CLUSTER_PAIRS];
  const actor = getActivePlayer(state);
  const target = Object.values(state.players).find((p) => p.playerId !== actor.playerId);

  // Rút Trang bị ở Lobby (Ô 6) tự đeo lên bàn ngay, không nằm kẹt trong hand
  state.turnPhase = 'LOCATION_ACTION';
  actor.location = 'lobby';
  state.decks.equipment.unshift('eq-01');
  const drawGearRes = applyPlayerGameAction(
    state,
    actor.playerId,
    { type: 'DRAW_CARD', deck: 'equipment' },
    1_750_000_001_000,
  );
  assert.equal(drawGearRes.ok, true);
  assert.ok(actor.equipped.includes('eq-01'));
  assert.equal(actor.hand.length, 0);

  // Rút bài Dùng 1 lần vào hand -> bị chặn END_TURN & ATTACK cho tới khi giải quyết
  actor.hand.push('eq-07');
  assert.equal(
    applyPlayerGameAction(state, actor.playerId, { type: 'END_TURN' }, 1_750_000_001_100).ok,
    false,
  );
  assert.equal(
    applyPlayerGameAction(state, actor.playerId, { type: 'USE_CARD', cardId: 'eq-07' }, 1_750_000_001_200).ok,
    true,
  );
  assert.equal(actor.hand.length, 0);

  // Thẻ Aid (inv-07): Đội Săn Đêm đang 0 thương tích nhận thẻ Aid PHẢI nhận 1 ST!
  target.roleId = 'gac-ky-thuat';
  target.faction = 'lantern-guard';
  target.hp = 14;
  target.woundsTaken = 0;
  actor.hand.push('inv-07');
  assert.equal(
    applyPlayerGameAction(
      state,
      actor.playerId,
      { type: 'INVESTIGATE_CARD', cardId: 'inv-07', targetPlayerId: target.playerId },
      1_750_000_002_000,
    ).ok,
    true,
  );
  assert.equal(target.woundsTaken, 1, 'Aid (inv-07) khi target có 0 wounds phải gây 1 thương tích!');

  // P0 privacy
  const pub = getPublicGameView(state);
  assert.equal(pub.lastInvestigation.cardId, 'inv-00');
  assert.equal(JSON.stringify(pub).includes('Tiếp Sức'), false);

  // Khánh "Tin Giả" (Unknown): úp vai né inv-06 (Exorcism), nói dối nhận hồi 1 từ inv-07 (Aid), lộ thật trước inv-12 (Tiên Tri)
  const khanh = Object.values(state.players).find(
    (p) => p.playerId !== actor.playerId && p.playerId !== target.playerId,
  );
  khanh.roleId = 'suong-tin-gia';
  khanh.faction = 'mist-order';
  khanh.maxHp = 11;
  khanh.revealed = false;
  khanh.woundsTaken = 3;
  khanh.hp = 8;
  actor.hand.push('inv-06', 'inv-07', 'inv-12');
  applyPlayerGameAction(
    state,
    actor.playerId,
    { type: 'INVESTIGATE_CARD', cardId: 'inv-06', targetPlayerId: khanh.playerId },
    1_750_000_002_100,
  );
  assert.equal(khanh.woundsTaken, 3, 'Khánh úp vai phải né được 2 ST của Exorcism');

  applyPlayerGameAction(
    state,
    actor.playerId,
    { type: 'INVESTIGATE_CARD', cardId: 'inv-07', targetPlayerId: khanh.playerId },
    1_750_000_002_200,
  );
  assert.equal(khanh.woundsTaken, 2, 'Khánh mất máu giả danh Săn Đêm để hồi 1 thương tích từ Aid');

  applyPlayerGameAction(
    state,
    actor.playerId,
    { type: 'INVESTIGATE_CARD', cardId: 'inv-12', targetPlayerId: khanh.playerId },
    1_750_000_002_300,
  );
  const actorPriv = getPrivateGameView(state, actor.playerId);
  assert.ok(actorPriv.privateClues.at(-1).detail.includes('Khánh "Tin Giả"'));
});

test('V4.4 — Tầm đánh Handgun (ev-05), Machine Gun (ev-06), Spear (eq-04), Holy Robe (eq-01), Masamune, Tú, Dũng & 10 vai', () => {
  const state = createInitialGameState({
    matchId: 'combat-test',
    seed: 999,
    nowMs: 1_750_000_000_000,
    players: makePlayers(4),
  });
  state.clusterPairs = [...DEFAULT_CLUSTER_PAIRS];
  const [id1, id2, id3, id4] = state.turnOrder;
  const p1 = state.players[id1];
  const p2 = state.players[id2];
  const p3 = state.players[id3];
  const p4 = state.players[id4];

  p1.location = 'radio'; // north
  p2.location = 'breaker'; // north (cùng Cụm)
  p3.location = 'court'; // south (khác Cụm)
  p4.location = 'corridor'; // south (khác Cụm)

  assert.equal(areInSameCluster(p1.location, p2.location, state.clusterPairs), true);
  assert.equal(canPlayerAttackTarget(state, p1, p2), true);
  assert.equal(canPlayerAttackTarget(state, p1, p3), false);

  // Handgun (ev-05): BẮT BUỘC đánh khác Cụm, KHÔNG đánh được cùng Cụm!
  p1.equipped = ['ev-05'];
  assert.equal(canPlayerAttackTarget(state, p1, p3), true);
  assert.equal(canPlayerAttackTarget(state, p1, p2), false);

  // Machine Gun (ev-06) + Masamune (ev-01) + Spear (eq-04):
  // Đánh p3 tại Cụm Nam -> bắn cả p3 lẫn p4, bắt buộc đánh khi đeo ev-01
  state.activePlayerId = p1.playerId;
  state.turnPhase = 'MAIN_ACTION';
  p1.roleId = 'gac-ky-thuat';
  p1.faction = 'lantern-guard';
  p1.revealed = false; // chưa lật vai -> eq-04 không cộng +2!
  p1.equipped = ['ev-01', 'ev-05', 'ev-06', 'eq-04'];
  p3.woundsTaken = 0;
  p3.hp = 14;
  p3.maxHp = 14;
  p4.woundsTaken = 0;
  p4.hp = 14;
  p4.maxHp = 14;

  // Masamune bắt buộc phải tấn công trước khi END_TURN
  assert.equal(
    applyPlayerGameAction(state, p1.playerId, { type: 'END_TURN' }, 1_750_000_005_000).ok,
    false,
  );
  // Đánh cùng lúc p3 và p4 (Machine Gun + Handgun khác Cụm)
  const mgRes = applyPlayerGameAction(
    state,
    p1.playerId,
    { type: 'ATTACK', targetPlayerId: p3.playerId },
    1_750_000_006_000,
  );
  assert.equal(mgRes.ok, true);
  assert.ok(p3.woundsTaken >= 1 && p3.woundsTaken <= 4, 'Spear khi chưa lật vai chỉ gây 1d4');
  assert.equal(p4.woundsTaken, p3.woundsTaken, 'Machine Gun phải gây cùng lượng sát thương cho p4');

  // Tú (Vampire) + Dũng (Werewolf) counterattack + counterRoll
  state.activePlayerId = p2.playerId;
  state.turnPhase = 'MAIN_ACTION';
  p2.attacksThisTurn = 0;
  p2.roleId = 'suong-an-danh';
  p2.faction = 'mist-order';
  p2.revealed = true;
  p2.woundsTaken = 4;
  p2.hp = 9;
  p2.equipped = ['ev-01'];
  p2.location = 'radio';

  p3.location = 'breaker';
  p3.roleId = 'suong-gac-cong';
  p3.faction = 'mist-order';
  p3.revealed = true;
  p3.alive = true;
  p3.maxHp = 14;
  p3.hp = 14;
  p3.woundsTaken = 0;
  p3.equipped = ['ev-01', 'eq-01']; // Holy Robe giảm 1 dmg nhận & 1 dmg đánh!

  p4.roleId = 'gac-radio';
  p4.faction = 'lantern-guard';

  const vRes = applyPlayerGameAction(
    state,
    p2.playerId,
    { type: 'ATTACK', targetPlayerId: p3.playerId },
    1_750_000_007_000,
  );
  assert.equal(vRes.ok, true);
  assert.ok(state.lastDiceRoll.counterRoll, 'Dũng phải ghi nhận counterRoll');

  // Lan "Trực Ban" (Emi 10 HP): Bước Nhảy Tắt ở Pha 1 ROLL_MOVE
  state.activePlayerId = p1.playerId;
  state.turnPhase = 'ROLL_MOVE';
  p1.roleId = 'gac-truc-ban';
  p1.maxHp = 10;
  p1.revealed = true;
  p1.location = 'radio';
  const expectedPair = getPairedLocationInCluster('radio', state.clusterPairs);
  const emiRes = applyPlayerGameAction(
    state,
    p1.playerId,
    { type: 'USE_SKILL' },
    1_750_000_008_000,
  );
  assert.equal(emiRes.ok, true);
  assert.equal(p1.location, expectedPair);
  assert.equal(state.turnPhase, 'LOCATION_ACTION');

  // Trang "Kiên Cường" (Allie 8 HP): Ý Chí Hồi Sinh
  p1.roleId = 'lang-quan-sat';
  p1.skillUsedOnce = false;
  p1.maxHp = 8;
  p1.woundsTaken = 6;
  p1.hp = 2;
  const allieRes = applyPlayerGameAction(state, p1.playerId, { type: 'USE_SKILL' }, 1_750_000_009_000);
  assert.equal(allieRes.ok, true);
  assert.equal(p1.woundsTaken, 0);
  assert.equal(p1.hp, 8);
});

function createStateWithRole(playerCount, roleId, matchPrefix) {
  for (let seed = 1; seed <= 120; seed += 1) {
    const state = createInitialGameState({
      matchId: `${matchPrefix}-${seed}`,
      seed,
      nowMs: 1_750_000_000_000,
      players: makePlayers(playerCount),
    });
    const found = Object.values(state.players).find((p) => p.roleId === roleId);
    if (found) return { state, player: found };
  }
  throw new Error(`Could not find role ${roleId} for ${playerCount} players`);
}

test('V4.5 — Điều kiện thắng chuẩn Shadow Hunters: Hải 5 đồ, Bách >= 3 xác & Đánh Đẫm Máu, Đạt chết đầu & Scream, 3 Neutral chết', () => {
  // 1. Hải "Sưu Tầm" (Bob): đủ 5 Trang bị thắng ngay (không cần đợi vòng 3, không bắt buộc lật vai)
  const { state: sBob, player: bob } = createStateWithRole(6, 'lang-anh-san', 'win-bob');
  bob.equipped = ['eq-01', 'eq-02', 'eq-03', 'eq-04', 'eq-05'];
  const vBob = evaluateVictory(sBob);
  assert.equal(vBob.finished, true);
  assert.ok(vBob.winnerPlayerIds.includes(bob.playerId));

  // Bob 4-6p Robbery: lật vai đánh >= 2 dmg (Masamune + Butcher Knife + Chainsaw -> 3..6 ST) cướp đồ THAY VÌ gây ST
  const { state: sRob, player: robBob } = createStateWithRole(5, 'lang-anh-san', 'bob-rob');
  sRob.clusterPairs = [...DEFAULT_CLUSTER_PAIRS];
  const victim = Object.values(sRob.players).find((p) => p.playerId !== robBob.playerId);
  robBob.revealed = true;
  robBob.equipped = ['ev-01', 'ev-02', 'ev-03']; // tối thiểu 1d4+2 >= 3 ST
  robBob.location = 'radio';
  victim.location = 'breaker';
  victim.equipped = ['eq-03'];
  victim.woundsTaken = 0;
  victim.hp = victim.maxHp;
  sRob.activePlayerId = robBob.playerId;
  sRob.turnPhase = 'MAIN_ACTION';
  robBob.attacksThisTurn = 0;
  applyPlayerGameAction(sRob, robBob.playerId, { type: 'ATTACK', targetPlayerId: victim.playerId }, 1_750_000_001_000);
  assert.equal(victim.woundsTaken, 0, 'Bob 4-6p cướp đồ thì không gây sát thương lên nạn nhân');
  assert.ok(robBob.equipped.includes('eq-03'));

  // 2. Bách "Cuồng Chiến" (Charles): Đòn Đánh Đẫm Máu + thắng khi kết liễu nạn nhân lúc deadCount >= 3
  const { state: sCharles, player: charles } = createStateWithRole(7, 'lang-cuu-ho', 'win-charles');
  sCharles.clusterPairs = [...DEFAULT_CLUSTER_PAIRS];
  const deadOnes = Object.values(sCharles.players)
    .filter((p) => p.playerId !== charles.playerId && p.faction === 'lantern-guard')
    .slice(0, 1);
  deadOnes[0].alive = false;
  deadOnes[0].hp = 0;
  const secondVictim = Object.values(sCharles.players).find(
    (p) => p.playerId !== charles.playerId && p.alive && p.faction === 'wanderer',
  );
  secondVictim.alive = false;
  secondVictim.hp = 0;
  const thirdVictim = Object.values(sCharles.players).find(
    (p) => p.playerId !== charles.playerId && p.alive && p.faction === 'lantern-guard',
  );
  thirdVictim.location = 'breaker';
  thirdVictim.hp = 1;
  thirdVictim.woundsTaken = thirdVictim.maxHp - 1;
  charles.revealed = true;
  charles.location = 'radio';
  charles.equipped = ['ev-01'];
  sCharles.activePlayerId = charles.playerId;
  sCharles.turnPhase = 'MAIN_ACTION';
  charles.attacksThisTurn = 0;
  // Thêm 1 Hunter còn sống để không kích hoạt allHuntersDead trước
  const extraVictim = Object.values(sCharles.players).find(
    (p) => p.playerId !== charles.playerId && p.playerId !== thirdVictim.playerId && p.alive,
  );
  extraVictim.faction = 'lantern-guard';
  const charRes = applyPlayerGameAction(
    sCharles,
    charles.playerId,
    { type: 'ATTACK', targetPlayerId: thirdVictim.playerId },
    1_750_000_002_000,
  );
  assert.equal(charRes.ok, true);
  assert.equal(sCharles.finished, true);
  assert.ok(sCharles.winnerPlayerIds.includes(charles.playerId));

  // Charles Bloody Feast giữ lượt để chém lần 2
  const { state: sBf, player: bfCharles } = createStateWithRole(6, 'lang-cuu-ho', 'bf-charles');
  sBf.clusterPairs = [...DEFAULT_CLUSTER_PAIRS];
  const bfTarget = Object.values(sBf.players).find((p) => p.playerId !== bfCharles.playerId);
  bfCharles.revealed = true;
  bfCharles.hp = 11;
  bfCharles.woundsTaken = 0;
  bfCharles.location = 'radio';
  bfCharles.equipped = ['ev-01'];
  bfTarget.location = 'breaker';
  bfTarget.maxHp = 14;
  bfTarget.hp = 14;
  bfTarget.woundsTaken = 0;
  sBf.activePlayerId = bfCharles.playerId;
  sBf.turnPhase = 'MAIN_ACTION';
  bfCharles.attacksThisTurn = 0;
  applyPlayerGameAction(sBf, bfCharles.playerId, { type: 'ATTACK', targetPlayerId: bfTarget.playerId }, 1_750_000_003_000);
  assert.equal(sBf.activePlayerId, bfCharles.playerId, 'Sau đòn đánh 1, Bách phải còn lượt để chọn chém bồi');
  assert.equal(bfCharles.attacksThisTurn, 1);
  applyPlayerGameAction(sBf, bfCharles.playerId, { type: 'USE_SKILL', targetPlayerId: bfTarget.playerId }, 1_750_000_003_500);
  assert.ok(bfCharles.woundsTaken >= 2, 'Chém bồi tự nhận 2 thương tích');

  // 3. Đạt "Cảm Tử" (Daniel): không tự lật vai, người đầu tiên chết -> thắng ngay; người khác chết đầu -> tự Scream lộ vai
  const { state: sDan1, player: dan1 } = createStateWithRole(7, 'lang-tien-phong', 'dan-scream');
  const firstCasualty = Object.values(sDan1.players).find((p) => p.playerId !== dan1.playerId);
  sDan1.activePlayerId = firstCasualty.playerId;
  assert.equal(
    applyPlayerGameAction(sDan1, firstCasualty.playerId, { type: 'REVEAL_ROLE' }, 1_750_000_004_000).ok,
    true,
  );
  sDan1.activePlayerId = dan1.playerId;
  assert.equal(
    applyPlayerGameAction(sDan1, dan1.playerId, { type: 'REVEAL_ROLE' }, 1_750_000_004_100).ok,
    false,
    'Đạt không được tự ý lật vai trước khi có người ngã xuống',
  );
  // Chết đầu tiên -> thắng tức thì
  sDan1.turnPhase = 'MAIN_ACTION';
  dan1.hp = 1;
  dan1.hand.push('ev-12'); // Banana Peel với 0 đồ tự mất 1 máu -> Đạt chết ĐẦU TIÊN!
  applyPlayerGameAction(sDan1, dan1.playerId, { type: 'USE_CARD', cardId: 'ev-12' }, 1_750_000_004_200);
  assert.equal(sDan1.finished, true);
  assert.ok(sDan1.winnerPlayerIds.includes(dan1.playerId), 'Đạt chết đầu tiên phải thắng tức thì!');

  // 4. Hội Bóng Đêm thắng khi có 3 Kẻ Độc Hành ngã xuống (bàn 7 người)
  const { state: s7 } = createStateWithRole(7, 'lang-tien-phong', 'shadow-3-neutrals');
  for (const p of Object.values(s7.players)) {
    if (p.faction === 'wanderer') {
      p.alive = false;
      p.hp = 0;
    }
  }
  const v3n = evaluateVictory(s7);
  assert.equal(v3n.finished, true);
  assert.equal(v3n.winnerFaction, 'mist-order');

  // 5. applyTimeoutAutoTurn không làm kẹt bàn
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
});

test('V4.6 — Hợp đồng Validate Action & turnTimeoutMs === 0 (Vô hạn)', () => {
  assert.equal(validateBoardGameActionPayload({ type: 'ROLL_DICE' }).ok, true);
  assert.equal(validateBoardGameActionPayload({ type: 'CHOOSE_DEST', location: 'court' }).ok, true);
  assert.equal(validateBoardGameActionPayload({ type: 'SKIP_LOC' }).ok, true);
  assert.equal(
    validateBoardGameActionPayload({ type: 'USE_LOC_POWER', targetPlayerId: 'p_1', mode: 'steal', equipCardId: 'eq-01' }).ok,
    true,
  );
  assert.equal(
    validateBoardGameActionPayload({ type: 'USE_CARD', cardId: 'eq-13', skipEffect: true }).ok,
    true,
  );
  assert.equal(
    validateBoardGameActionPayload({ type: 'USE_CARD', cardId: 'ev-07', targetLocation: 'toString' }).ok,
    false,
  );
  assert.equal(validateBoardGameActionPayload({ type: 'PLAY_EVENT', cardId: 'ev-07' }).ok, false);

  const startZero = validateBoardGameClientMessage({
    type: 'BG_START_MATCH',
    requestId: 's0',
    turnTimeoutMs: 0,
  });
  assert.equal(startZero.ok, true);
});

test('V4.7 — Hiệu ứng thẻ Cung Ứng / Đột Kích gốc (First Aid mốc 7, Blessing, Talisman, Concealed Knowledge, Dynamite)', () => {
  const state = createInitialGameState({
    matchId: 'v4-cards-authentic',
    seed: 515,
    nowMs: 1_750_000_000_000,
    players: makePlayers(4),
  });
  const list = Object.values(state.players);
  const actor = getActivePlayer(state);
  const enemy = list.find((p) => p.playerId !== actor.playerId);
  const ally = list.find((p) => p.playerId !== actor.playerId && p.playerId !== enemy.playerId);
  assert.ok(actor && enemy && ally);

  state.turnPhase = 'MAIN_ACTION';
  actor.roleId = 'gac-truc-ban';
  actor.faction = 'lantern-guard';
  actor.maxHp = 10;
  actor.woundsTaken = 9;
  actor.hp = 1;

  // Holy Water (eq-07): tự hồi 2 thương tích (9 -> 7)
  actor.hand.push('eq-07');
  assert.equal(
    applyPlayerGameAction(state, actor.playerId, { type: 'USE_CARD', cardId: 'eq-07' }, 1_750_000_001_000).ok,
    true,
  );
  assert.equal(actor.woundsTaken, 7);

  // First Aid (eq-09): đặt thương tích từ 1 -> đúng mốc 7 (hoặc từ 9 -> 7)
  actor.woundsTaken = 1;
  actor.hp = 9;
  actor.hand.push('eq-09');
  assert.equal(
    applyPlayerGameAction(
      state,
      actor.playerId,
      { type: 'USE_CARD', cardId: 'eq-09', targetPlayerId: actor.playerId },
      1_750_000_002_000,
    ).ok,
    true,
  );
  assert.equal(actor.woundsTaken, 7);

  // Blessing (eq-08): hồi 1d6 cho người khác
  enemy.woundsTaken = 6;
  enemy.hp = enemy.maxHp - 6;
  actor.hand.push('eq-08');
  assert.equal(
    applyPlayerGameAction(
      state,
      actor.playerId,
      { type: 'USE_CARD', cardId: 'eq-08', targetPlayerId: enemy.playerId },
      1_750_000_003_000,
    ).ok,
    true,
  );
  assert.ok(enemy.woundsTaken < 6);

  // Talisman (eq-03): miễn 100% sát thương Vampire Bat (ev-07)
  enemy.equipped.push('eq-03');
  const enemyWoundsBeforeBat = enemy.woundsTaken;
  actor.hand.push('ev-07');
  assert.equal(
    applyPlayerGameAction(
      state,
      actor.playerId,
      { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: enemy.playerId },
      1_750_000_004_000,
    ).ok,
    true,
  );
  assert.equal(enemy.woundsTaken, enemyWoundsBeforeBat, 'Talisman phải chặn 100% sát thương từ Vampire Bat');

  // Concealed Knowledge (eq-15): đi thêm 1 lượt phụ ngay sau END_TURN
  actor.hand.push('eq-15');
  assert.equal(
    applyPlayerGameAction(state, actor.playerId, { type: 'USE_CARD', cardId: 'eq-15' }, 1_750_000_005_000).ok,
    true,
  );
  assert.equal(state.extraTurnPending, true);
  assert.equal(
    applyPlayerGameAction(state, actor.playerId, { type: 'END_TURN' }, 1_750_000_006_000).ok,
    true,
  );
  assert.equal(state.activePlayerId, actor.playerId, 'Sổ Tay Bí Truyền phải giữ nguyên lượt phụ cho người vừa kích hoạt');
  assert.equal(state.turnPhase, 'ROLL_MOVE');

  // UI target-selection check
  const pub = getPublicGameView(state);
  const selfPub = pub.players.find((p) => p.playerId === actor.playerId);
  const enemyPub = pub.players.find((p) => p.playerId === enemy.playerId);
  const alivePlayers = pub.players.filter((p) => p.alive);
  const aliveOthers = alivePlayers.filter((p) => p.playerId !== selfPub.playerId);
  assert.equal(toggleSelectedTargetId(enemyPub.playerId, selfPub.playerId, true), selfPub.playerId);
  const resolved = resolveActionTargets({
    selfPlayer: selfPub,
    alivePlayers,
    aliveOthers,
    attackableTargets: [enemyPub],
    selectedTargetId: enemyPub.playerId,
    healTargetId: null,
  });
  assert.equal(resolved.validHealCardTarget.playerId, selfPub.playerId);
});

test('V4.8 — Không trần 3 Trang bị, chặn tự bắn Ô 9 & giải quyết thẻ Pha 2', () => {
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
  const target = list.find((p) => p.playerId !== actor.playerId);

  actor.roleId = 'gac-truc-ban';
  actor.faction = 'lantern-guard';
  target.roleId = 'suong-an-danh';
  target.faction = 'mist-order';

  state.turnPhase = 'LOCATION_ACTION';
  actor.location = 'lobby';
  for (const eqId of ['eq-01', 'eq-02', 'eq-03', 'eq-04', 'eq-05']) {
    actor.hand.push(eqId);
    assert.equal(
      applyPlayerGameAction(state, actor.playerId, { type: 'EQUIP_CARD', cardId: eqId }, 1_750_100_001_000).ok,
      true,
    );
  }
  assert.equal(actor.equipped.length, 5, 'Đeo 5 trang bị không bị rớt món cũ');

  actor.location = 'corridor';
  assert.equal(
    applyPlayerGameAction(
      state,
      actor.playerId,
      { type: 'USE_LOC_POWER', targetPlayerId: actor.playerId, mode: 'damage' },
      1_750_100_002_000,
    ).ok,
    false,
  );
  actor.woundsTaken = 2;
  actor.hp = actor.maxHp - 2;
  assert.equal(
    applyPlayerGameAction(
      state,
      actor.playerId,
      { type: 'USE_LOC_POWER', targetPlayerId: actor.playerId, mode: 'heal' },
      1_750_100_003_000,
    ).ok,
    true,
  );
  assert.equal(actor.woundsTaken, 1);
});
