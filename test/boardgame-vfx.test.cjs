// ---------------------------------------------------------------------------
// test/boardgame-vfx.test.cjs — Unit Tests cho Visual Event Queue, Multi-target,
// Chống phát trùng Reconnect, Spectator P0 Isolation & Reduced Motion.
// ---------------------------------------------------------------------------
'use strict';

require('./register-ts.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  VisualEventTracker,
  extractVisualEventsFromDiff,
} = require('../features/boardgame/ui/vfx-queue.ts');
const { DEFAULT_CLUSTER_PAIRS } = require('../features/boardgame/domain/rules.ts');
const { getCardById, toCardPublicMeta } = require('../features/boardgame/domain/cards.ts');
const { PROTOTYPE_CHARACTER_ART } = require('../features/boardgame/ui/midnight-noir-tokens.ts');

function eqMeta(id) {
  return toCardPublicMeta(getCardById(id));
}

function makePubState(overrides = {}) {
  return {
    rulesetVersion: 4,
    matchId: 'vfx-test-match-1',
    round: 2,
    maxRounds: 20,
    turnNumber: 4,
    turnPhase: 'MAIN_ACTION',
    activePlayerId: 'p1',
    turnOrder: ['p1', 'p2', 'p3', 'p4'],
    clusterPairs: DEFAULT_CLUSTER_PAIRS,
    deadCount: 0,
    players: [
      {
        playerId: 'p1',
        displayName: 'Minh An',
        seatIndex: 0,
        location: 'lobby',
        woundsTaken: 0,
        handCount: 0,
        equipped: [],
        attacksMade: 0,
        attacksThisTurn: 0,
        investigationsCount: 0,
        guardianShieldActive: false,
        alive: true,
        connected: true,
        revealedRoleId: null,
        revealedFaction: null,
        revealedMaxHp: null,
        revealedSkillCooldown: 0,
        revealedSkillUsedOnce: false,
        appearance: {},
      },
      {
        playerId: 'p2',
        displayName: 'Vy Hà',
        seatIndex: 1,
        location: 'canteen',
        woundsTaken: 1,
        handCount: 0,
        equipped: [],
        attacksMade: 0,
        attacksThisTurn: 0,
        investigationsCount: 0,
        guardianShieldActive: false,
        alive: true,
        connected: true,
        revealedRoleId: null,
        revealedFaction: null,
        revealedMaxHp: null,
        revealedSkillCooldown: 0,
        revealedSkillUsedOnce: false,
        appearance: {},
      },
      {
        playerId: 'p3',
        displayName: 'Dũng Kiên',
        seatIndex: 2,
        location: 'canteen',
        woundsTaken: 0,
        handCount: 0,
        equipped: [],
        attacksMade: 0,
        attacksThisTurn: 0,
        investigationsCount: 0,
        guardianShieldActive: false,
        alive: true,
        connected: true,
        revealedRoleId: null,
        revealedFaction: null,
        revealedMaxHp: null,
        revealedSkillCooldown: 0,
        revealedSkillUsedOnce: false,
        appearance: {},
      },
      {
        playerId: 'p4',
        displayName: 'Tú Linh',
        seatIndex: 3,
        location: 'radio',
        woundsTaken: 2,
        handCount: 0,
        equipped: [],
        attacksMade: 0,
        attacksThisTurn: 0,
        investigationsCount: 0,
        guardianShieldActive: false,
        alive: true,
        connected: true,
        revealedRoleId: null,
        revealedFaction: null,
        revealedMaxHp: null,
        revealedSkillCooldown: 0,
        revealedSkillUsedOnce: false,
        appearance: {},
      },
    ],
    deckCounts: { investigation: 14, equipment: 14, event: 14 },
    lastDiceRoll: null,
    lastInvestigation: null,
    lastRevealEvent: null,
    publicLog: [],
    highlights: [],
    winnerLabel: null,
    winnerFaction: null,
    winnerPlayerIds: [],
    winReason: null,
    finalReveal: null,
    ...overrides,
  };
}

test('VFX Queue (1) — Event ID duy nhất, thứ tự rõ ràng & Multi-target Machine Gun + Shield BLOCK', () => {
  const prev = makePubState({
    players: makePubState().players.map((p) =>
      p.playerId === 'p1'
        ? { ...p, equipped: [eqMeta('ev-06')] }
        : p.playerId === 'p3'
          ? { ...p, guardianShieldActive: true }
          : p,
    ),
  });

  const next = makePubState({
    turnNumber: 5,
    players: prev.players.map((p) => {
      if (p.playerId === 'p2') return { ...p, woundsTaken: p.woundsTaken + 3 };
      if (p.playerId === 'p3') return { ...p, guardianShieldActive: false };
      if (p.playerId === 'p4') return { ...p, woundsTaken: p.woundsTaken + 2 };
      return p;
    }),
    lastDiceRoll: {
      kind: 'attack',
      playerId: 'p1',
      displayName: 'Minh An',
      d6: 5,
      d4: 2,
      total: 3,
      rerollRequired: false,
      freeChoice: false,
      resolvedLocation: null,
      targetPlayerId: 'p2',
      damageDealt: 5,
    },
    publicLog: [
      {
        id: 'log-blk-1',
        round: 2,
        atMs: 1000,
        kind: 'skill',
        actorId: 'p3',
        text: '🛡️ Lá Chắn Thiên Thần che chở Dũng Kiên — miễn nhiễm đòn đánh!',
      },
      {
        id: 'log-mg-1',
        round: 2,
        atMs: 1001,
        kind: 'attack',
        actorId: 'p1',
        text: '🔫 Súng Liên Thanh! Minh An xả đạn (|5 - 2|, tổng 3) vào 3 người trong tầm → tổng 5 sát thương!',
      },
    ],
  });

  const events = extractVisualEventsFromDiff(prev, next, {
    selfPlayerId: 'p2',
    isSpectator: false,
    handUnmasked: false,
  });

  // Kiểm tra không có ID trùng
  const ids = events.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, 'Every visual event must have a unique ID');

  // Thứ tự phải không giảm
  for (let i = 1; i < events.length; i++) {
    assert.ok(events[i].order >= events[i - 1].order, 'Events must be sorted by order');
  }

  const diceEv = events.find((e) => e.kind === 'DICE_ROLL');
  assert.equal(diceEv.d6, 5);
  assert.equal(diceEv.d4, 2);

  const mgEv = events.find((e) => e.kind === 'COMBAT_VFX' && e.effect === 'MACHINE_GUN_BARRAGE');
  assert.ok(mgEv, 'Expected MACHINE_GUN_BARRAGE event');
  assert.ok(mgEv.targetPlayerIds.includes('p2'));
  assert.ok(mgEv.targetPlayerIds.includes('p4'));

  const shieldEv = events.find((e) => e.kind === 'COMBAT_VFX' && e.effect === 'SHIELD_GUARD');
  assert.ok(shieldEv && shieldEv.targetPlayerIds.includes('p3'));

  const pops = events.filter((e) => e.kind === 'FLOATING_TEXT');
  assert.ok(pops.some((f) => f.targetPlayerId === 'p2' && f.label === '-3' && f.variant === 'damage'));
  assert.ok(pops.some((f) => f.targetPlayerId === 'p3' && f.label === 'BLOCK' && f.variant === 'block'));
  assert.ok(pops.some((f) => f.targetPlayerId === 'p4' && f.label === '-2' && f.variant === 'damage'));
});

test('VFX Queue (2) — Masamune + Dũng COUNTER + Vy Radio Tuyệt Kỹ chân dung lớn', () => {
  const prev = makePubState({
    players: makePubState().players.map((p) => {
      if (p.playerId === 'p1') return { ...p, equipped: [eqMeta('ev-01')] };
      if (p.playerId === 'p2') {
        return {
          ...p,
          revealedRoleId: 'gac-radio',
          revealedFaction: 'lantern-guard',
          revealedMaxHp: 12,
        };
      }
      return p;
    }),
  });

  // Bước 2A: Minh cầm Masamune chém Dũng và bị Phản kích COUNTER
  const mid = makePubState({
    turnNumber: 6,
    players: prev.players.map((p) => {
      if (p.playerId === 'p1') return { ...p, woundsTaken: p.woundsTaken + 1 };
      if (p.playerId === 'p3') return { ...p, woundsTaken: p.woundsTaken + 4 };
      return p;
    }),
    publicLog: [
      {
        id: 'log-masa-6',
        round: 2,
        atMs: 2000,
        kind: 'attack',
        actorId: 'p1',
        text: '⚔️ Minh An tấn công Dũng Kiên (1d4=4, tổng 4) → gây 4 sát thương!',
      },
      {
        id: 'log-ctr-6',
        round: 2,
        atMs: 2001,
        kind: 'skill',
        actorId: 'p3',
        text: '🥊 Dũng "Gác Cổng" (Dũng Kiên) phản kích tức thì (|3 - 2|, tổng 1) → Minh An chịu 1 sát thương!',
      },
    ],
  });

  const evA = extractVisualEventsFromDiff(prev, mid, {
    selfPlayerId: 'p1',
    isSpectator: false,
  });
  assert.ok(evA.some((e) => e.kind === 'COMBAT_VFX' && e.effect === 'MASAMUNE_SLASH'));
  assert.ok(evA.some((e) => e.kind === 'COMBAT_VFX' && e.effect === 'COUNTER_STRIKE'));
  assert.ok(evA.some((e) => e.kind === 'FLOATING_TEXT' && e.label === 'COUNTER' && e.targetPlayerId === 'p3'));

  // Bước 2B: Vy Radio (đã lộ vai) tung Xung Cao Áp 1d6 lên p4 -> Cut-in chân dung lớn + Sét
  const next = makePubState({
    turnNumber: 7,
    activePlayerId: 'p2',
    players: mid.players.map((p) =>
      p.playerId === 'p4' ? { ...p, woundsTaken: p.woundsTaken + 5 } : p,
    ),
    publicLog: [
      ...mid.publicLog,
      {
        id: 'log-vy-ult-7',
        round: 3,
        atMs: 3000,
        kind: 'skill',
        actorId: 'p2',
        text: '⚡ Vy Hà phóng Xung Cao Áp (1d6=5) lên Tú Linh → 5 sát thương!',
      },
    ],
  });

  const evB = extractVisualEventsFromDiff(mid, next, {
    selfPlayerId: 'p1',
    isSpectator: false,
  });
  const cutIn = evB.find((e) => e.kind === 'CINEMATIC_CUTIN' && e.bannerType === 'ULTIMATE_SKILL');
  assert.ok(cutIn, 'Expected Vy Radio ULTIMATE_SKILL cut-in');
  assert.equal(cutIn.roleId, 'gac-radio');
  assert.equal(cutIn.portraitSrc, PROTOTYPE_CHARACTER_ART['gac-radio']);
  assert.equal(cutIn.skillName, 'XUNG CAO ÁP 1D6');
  assert.ok(evB.some((e) => e.kind === 'COMBAT_VFX' && e.effect === 'LIGHTNING_STRIKE' && e.targetPlayerIds.includes('p4')));
});

test('VFX Queue (3) — Reconnect Idempotency, Spectator P0 Isolation & Reduced Motion', () => {
  const tracker = new VisualEventTracker();

  // Giả lập F5 Reconnect vào ván đang ở turn 8 có lịch sử log cũ & người chơi vừa bị thương
  const midGame = makePubState({
    turnNumber: 8,
    activePlayerId: 'p2',
    publicLog: [
      {
        id: 'old-log-1',
        round: 2,
        atMs: 1000,
        kind: 'attack',
        actorId: 'p1',
        text: '⚔️ Minh An tấn công Vy Hà (|5 - 2|, tổng 3) → gây 3 sát thương!',
      },
    ],
  });

  const onReconnect = tracker.seedBaseline(midGame, {
    selfPlayerId: 'p2',
    isSpectator: false,
  });
  assert.equal(onReconnect.length, 0, 'F5 Reconnect mid-game must NOT replay historical animations');

  // Nhận lại chính snapshot đó (duplicate sync) -> 0 event
  const dupSync = tracker.ingestSnapshot(midGame, {
    selfPlayerId: 'p2',
    isSpectator: false,
  });
  assert.equal(dupSync.length, 0, 'Duplicate state sync must emit 0 events');

  // Spectator & P0 Isolation: p1 còn ẩn vai rút bài kín tại Trạm Radio (không trang bị ngay)
  const specTracker = new VisualEventTracker();
  const s0 = makePubState({ turnNumber: 2, activePlayerId: 'p1' });
  specTracker.seedBaseline(s0, { selfPlayerId: 'spec-1', isSpectator: true });

  const s1 = makePubState({
    turnNumber: 3,
    activePlayerId: 'p2', // p2 vừa tới lượt, nhưng viewer là spectator!
    players: s0.players.map((p) => (p.playerId === 'p1' ? { ...p, handCount: 1 } : p)),
    publicLog: [
      {
        id: 'draw-secret-3',
        round: 1,
        atMs: 1200,
        kind: 'draw',
        actorId: 'p1',
        text: '🃏 Minh An rút 1 thẻ Khám Phá tại Trạm Radio KTX (cần giải quyết trong lượt).',
      },
    ],
  });

  const specEvents = specTracker.ingestSnapshot(s1, {
    selfPlayerId: 'spec-1',
    isSpectator: true,
    reducedMotion: true,
  });

  // Khán giả không được nhận banner YOUR_TURN
  assert.equal(
    specEvents.some((e) => e.kind === 'CINEMATIC_CUTIN' && e.bannerType === 'YOUR_TURN'),
    false,
    'Spectator must never see YOUR_TURN banner',
  );
  // Lá bài rút kín phải úp mặt lưng với khán giả
  const cardEv = specEvents.find((e) => e.kind === 'CARD_DRAW');
  assert.ok(cardEv);
  assert.equal(cardEv.showFront, false);
  assert.equal(cardEv.cardId, null);
  assert.equal(cardEv.cardTitle, null);
  // Kiểm tra không rò vai thật ở bất kỳ event nào và reducedMotion thu gọn duration
  const serialized = JSON.stringify(specEvents);
  assert.equal(serialized.includes('gac-ky-thuat'), false);
  assert.ok(cardEv.durationMs <= 260, 'reducedMotion must clamp animation duration');
});
