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
const {
  DEFAULT_GRAPHICS_PREFERENCES,
  detectAutoQualityTier,
  resolveGraphicsProfile,
} = require('../features/boardgame/ui/graphics-settings.ts');
const {
  getBoardGameAudioDiagnostics,
  isBoardGameSoundMuted,
  playSoundForVisualEvent,
  resetBoardGameAudioForTests,
  setBoardGameSoundMuted,
  stopAllBoardGameSounds,
} = require('../features/boardgame/ui/sound.ts');
const {
  createInitialGameState,
  getPublicGameView,
  appendPublicLog,
} = require('../features/boardgame/domain/index.ts');
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
  // Kiểm tra chủ sở hữu rút bài kín tự thấy mặt trước (không cần nút mở che bài)
  const ownerTracker = new VisualEventTracker();
  ownerTracker.seedBaseline(s0, { selfPlayerId: 'p1', isSpectator: false });
  const ownerEvents = ownerTracker.ingestSnapshot(s1, {
    selfPlayerId: 'p1',
    isSpectator: false,
    privateView: {
      playerId: 'p1',
      roleId: 'gac-ky-thuat',
      roleName: 'Minh "Kỹ Thuật"',
      faction: 'lantern-guard',
      hp: 14,
      maxHp: 14,
      woundsTaken: 0,
      skillCooldown: 0,
      skillUsedOnce: false,
      revealed: false,
      secretGoalText: '',
      protegePlayerId: null,
      protegeDisplayName: null,
      avengedProtegeKiller: false,
      investigatedTargetIds: [],
      hand: [{ ...eqMeta('inv-01') }],
      equipped: [],
      privateClues: [],
    },
  });
  const ownerCardEv = ownerEvents.find((e) => e.kind === 'CARD_DRAW');
  assert.ok(ownerCardEv, 'Owner draw event must be generated');
  assert.equal(ownerCardEv.showFront, true, 'Owner must auto-see drawn card front face');
  assert.equal(ownerCardEv.cardId, 'inv-01');

  // Kiểm tra không rò vai thật ở bất kỳ event nào và reducedMotion thu gọn duration
  const serialized = JSON.stringify(specEvents);
  assert.equal(serialized.includes('gac-ky-thuat'), false);
  assert.ok(cardEv.durationMs <= 260, 'reducedMotion must clamp animation duration');
});

test('Graphics Quality (4) — Tự động điều chỉnh High / Balanced / Low & tắt Rung mạnh', () => {
  const desktopEnv = {
    viewportWidth: 1440,
    hardwareConcurrency: 8,
    deviceMemory: 8,
    coarsePointer: false,
    prefersReducedMotion: false,
  };
  const mobileEnv = {
    viewportWidth: 390,
    hardwareConcurrency: 6,
    deviceMemory: 4,
    coarsePointer: true,
    prefersReducedMotion: false,
  };
  const lowEnv = {
    viewportWidth: 390,
    hardwareConcurrency: 2,
    deviceMemory: 2,
    coarsePointer: true,
    prefersReducedMotion: false,
  };

  assert.equal(detectAutoQualityTier(desktopEnv), 'high');
  assert.equal(detectAutoQualityTier(mobileEnv), 'balanced');
  assert.equal(detectAutoQualityTier(lowEnv), 'low');
  assert.equal(
    detectAutoQualityTier({ ...desktopEnv, prefersReducedMotion: true }),
    'low',
  );

  const deskHigh = resolveGraphicsProfile(DEFAULT_GRAPHICS_PREFERENCES, desktopEnv);
  assert.equal(deskHigh.tier, 'high');
  assert.equal(deskHigh.particleScale, 1);
  assert.equal(deskHigh.enableBackdropBlur, true);
  assert.equal(deskHigh.enableMistDrift, true);
  assert.equal(deskHigh.enableScreenShake, true);

  const mobBalanced = resolveGraphicsProfile(DEFAULT_GRAPHICS_PREFERENCES, mobileEnv);
  assert.equal(mobBalanced.tier, 'balanced');
  assert.equal(mobBalanced.dprCap, 1.5);
  assert.equal(mobBalanced.particleScale, 0.55);
  assert.equal(mobBalanced.enableBackdropBlur, false, 'Mobile Balanced must disable costly backdrop-blur');
  assert.equal(mobBalanced.enableMistDrift, false);
  assert.equal(mobBalanced.enable3DTilt, false);

  const lowTier = resolveGraphicsProfile({ quality: 'low', reducedMotionOverride: null, shakeEnabled: true }, desktopEnv);
  assert.equal(lowTier.tier, 'low');
  assert.equal(lowTier.particleScale, 0);
  assert.equal(lowTier.enableFoil, false);
  assert.equal(lowTier.enableScreenShake, false);
  assert.equal(lowTier.pawnGlideDurationMs, 0);

  // Người chơi tắt rung riêng dù vẫn để High VFX
  const noShakeHigh = resolveGraphicsProfile(
    { quality: 'high', reducedMotionOverride: false, shakeEnabled: false },
    desktopEnv,
  );
  assert.equal(noShakeHigh.tier, 'high');
  assert.equal(noShakeHigh.particleScale, 1);
  assert.equal(noShakeHigh.enableScreenShake, false, 'shakeEnabled=false must suppress screen shake even on High');
});

test('Audio Event Queue Sync (5) — Dedupe ID khi Reconnect, Cooldown gộp đa đòn & Mute/Stop', () => {
  setBoardGameSoundMuted(false);
  resetBoardGameAudioForTests();

  const diceEv = {
    id: 'm1::dice::1',
    kind: 'DICE_ROLL',
    order: 10,
    durationMs: 900,
    diceKind: 'attack',
    actorId: 'p1',
    actorName: 'Minh An',
    d6: 5,
    d4: 2,
    total: 3,
    freeChoice: false,
    rerollRequired: false,
  };
  const slashEv1 = {
    id: 'm1::combat::slash-1',
    kind: 'COMBAT_VFX',
    order: 30,
    durationMs: 520,
    effect: 'SLASH',
    sourcePlayerId: 'p1',
    targetPlayerIds: ['p2'],
    shake: 'light',
  };
  const slashEv2 = {
    id: 'm1::combat::slash-2',
    kind: 'COMBAT_VFX',
    order: 31,
    durationMs: 520,
    effect: 'SLASH',
    sourcePlayerId: 'p1',
    targetPlayerIds: ['p3'],
    shake: 'light',
  };
  const floatEv = {
    id: 'm1::float::1',
    kind: 'FLOATING_TEXT',
    order: 35,
    durationMs: 900,
    targetPlayerId: 'p2',
    label: '-3',
    variant: 'damage',
  };

  assert.equal(playSoundForVisualEvent(diceEv, 1000), true, 'First DICE_ROLL must fire');
  assert.equal(playSoundForVisualEvent(diceEv, 1500), false, 'Duplicate event ID must never replay');
  assert.equal(playSoundForVisualEvent(slashEv1, 1005), true, 'Different category SLASH at same tick must fire');
  assert.equal(playSoundForVisualEvent(slashEv2, 1020), false, 'Simultaneous same-category SLASH within cooldown must coalesce');
  assert.equal(playSoundForVisualEvent(floatEv, 1025), false, 'FLOATING_TEXT must not spam duplicate sounds');

  let diag = getBoardGameAudioDiagnostics();
  assert.equal(diag.totalTriggeredCount, 2);
  assert.equal(diag.dedupedCount, 1);
  assert.equal(diag.coalescedCount, 1);

  // Sau cooldown (> 80ms) vẫn đánh được slashEv3 mới
  const slashEv3 = { ...slashEv2, id: 'm1::combat::slash-3' };
  assert.equal(playSoundForVisualEvent(slashEv3, 1120), true);

  // Stop & Mute chặn toàn bộ cue sau đó
  stopAllBoardGameSounds();
  setBoardGameSoundMuted(true);
  assert.equal(isBoardGameSoundMuted(), true);
  assert.equal(playSoundForVisualEvent({ ...diceEv, id: 'm1::dice::2' }, 2000), false);
  diag = getBoardGameAudioDiagnostics();
  assert.equal(diag.muted, true);
  assert.ok(diag.stopCount >= 2);

  // Reconnect baseline qua VisualEventTracker phải phát 0 âm thanh
  setBoardGameSoundMuted(false);
  resetBoardGameAudioForTests();
  const reconnectTracker = new VisualEventTracker();
  const reconnectedEvents = reconnectTracker.seedBaseline(
    makePubState({ turnNumber: 9, activePlayerId: 'p3' }),
    { selfPlayerId: 'p1', isSpectator: false },
  );
  let reconnectTriggered = 0;
  for (const ev of reconnectedEvents) {
    if (playSoundForVisualEvent(ev, 3000)) reconnectTriggered += 1;
  }
  assert.equal(reconnectTriggered, 0, 'F5 Reconnect mid-game must trigger 0 sounds');
});

test('VFX Queue (6) — Multi-log sau mốc 40 vẫn giữ nguyên chuỗi VFX (không rơi event vì trùng log.id)', () => {
  const players = Array.from({ length: 4 }, (_, idx) => ({
    playerId: `p_${idx + 1}`,
    displayName: `SV ${idx + 1}`,
    seatIndex: idx,
    appearance: {
      gender: 'male',
      topStyle: 'jacket',
      hairColor: '#1f2937',
      skinTone: '#f1c27d',
    },
    connected: true,
  }));
  const authState = createInitialGameState({
    matchId: 'vfx-cap40-match',
    seed: 1234,
    nowMs: 1_750_400_000_000,
    players,
  });
  for (let i = 0; i < 42; i++) {
    appendPublicLog(authState, 'system', `Warmup ${i}`, 1_750_400_001_000 + i);
  }
  assert.equal(authState.publicLog.length, 40);

  const tracker = new VisualEventTracker();
  tracker.seedBaseline(getPublicGameView(authState), {
    selfPlayerId: 'p_1',
    isSpectator: false,
  });

  // Cùng turnNumber và sameTs phát sinh đồng thời 3 log liên tiếp sau mốc 40
  const sameTs = 1_750_400_100_000;
  authState.players.p_2.woundsTaken += 3;
  authState.players.p_1.woundsTaken += 1;
  authState.players.p_2.alive = false;
  authState.players.p_2.revealed = true;
  appendPublicLog(
    authState,
    'attack',
    '⚔️ SV 1 tấn công SV 2 (|5 - 2|=3, tổng 3) → gây 3 sát thương!',
    sameTs,
    'p_1',
  );
  appendPublicLog(
    authState,
    'skill',
    '🥊 Dũng "Gác Cổng" (SV 2) phản kích tức thì (|3 - 2|, tổng 1) → SV 1 chịu 1 sát thương!',
    sameTs,
    'p_2',
  );
  appendPublicLog(
    authState,
    'elimination',
    '💀 SV 2 đã gục ngã và lộ vai!',
    sameTs,
    'p_2',
  );

  const emitted = tracker.ingestSnapshot(getPublicGameView(authState), {
    selfPlayerId: 'p_1',
    isSpectator: false,
  });
  const slashEv = emitted.find((e) => e.kind === 'COMBAT_VFX' && e.effect === 'SLASH');
  const counterEv = emitted.find((e) => e.kind === 'COMBAT_VFX' && e.effect === 'COUNTER_STRIKE');
  const elimEv = emitted.find((e) => e.kind === 'CINEMATIC_CUTIN' && e.bannerType === 'ELIMINATION');
  assert.ok(slashEv, 'Đòn đánh chính sau mốc 40 phải kích hoạt SLASH');
  assert.ok(counterEv, 'Log thứ 2 cùng ms sau mốc 40 phải kích hoạt COUNTER_STRIKE');
  assert.ok(elimEv, 'Log thứ 3 cùng ms sau mốc 40 phải kích hoạt ELIMINATION');
  assert.equal(new Set(emitted.map((e) => e.id)).size, emitted.length);
});
