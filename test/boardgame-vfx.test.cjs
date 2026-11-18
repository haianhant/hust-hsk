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
  buildDiceRollEventFromSnapshot,
  computeDiceSig,
  extractVisualEventsFromDiff,
  resolveCombatSequenceTimings,
  resolveRoleRevealTimeline,
} = require('../features/boardgame/ui/vfx-queue.ts');
const {
  buildDiceRollTimeline,
  buildDirectMoveTimeline,
  isDiceResultRevealed,
  resolveDiceRollStage,
  resolveDiceStageTimings,
} = require('../features/boardgame/ui/MidnightDice3D.tsx');
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
  computePublicDamageChipState,
  deriveShortPlayerName,
} = require('../features/boardgame/ui/DamageTrack.tsx');
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

test('Game Feel P1 (7) — 3D Dice 4 giai đoạn (1.2–1.5s), chống lộ kết quả sớm & Reduced Motion / Reconnect', () => {
  // 1) Thời lượng DICE_ROLL bình thường nằm trong 1.2–1.5s và lưu đúng kết quả server + điểm đến
  const prevMove = makePubState({ turnNumber: 4, turnPhase: 'ROLL_MOVE', activePlayerId: 'p1' });
  const nextMove = makePubState({
    turnNumber: 4,
    turnPhase: 'LOCATION_ACTION',
    activePlayerId: 'p1',
    players: prevMove.players.map((p) =>
      p.playerId === 'p1' ? { ...p, location: 'canteen' } : p,
    ),
    lastDiceRoll: {
      kind: 'move',
      playerId: 'p1',
      displayName: 'Minh An',
      d6: 5,
      d4: 3,
      total: 8,
      rerollRequired: false,
      freeChoice: false,
      resolvedLocation: 'canteen',
      targetPlayerId: null,
      damageDealt: null,
    },
  });

  const fullEvents = extractVisualEventsFromDiff(prevMove, nextMove, {
    selfPlayerId: 'p1',
    isSpectator: false,
    reducedMotion: false,
  });
  const moveDice = fullEvents.find((e) => e.kind === 'DICE_ROLL');
  assert.ok(moveDice, 'Move roll must emit DICE_ROLL');
  assert.ok(
    moveDice.durationMs >= 1200 && moveDice.durationMs <= 1500,
    `Normal dice roll duration (${moveDice.durationMs}ms) must be within 1200..1500ms`,
  );
  assert.equal(moveDice.d6, 5);
  assert.equal(moveDice.d4, 3);
  assert.equal(moveDice.total, 8);
  assert.equal(moveDice.resolvedLocation, 'canteen');

  // 2) Phân kỳ 4 giai đoạn: windup -> tumble -> decelerate -> settled; KHÔNG được lộ trước settled
  const timings = resolveDiceStageTimings(moveDice.durationMs, false);
  assert.ok(timings.windupEndMs > 0 && timings.tumbleEndMs > timings.windupEndMs && timings.settleAtMs > timings.tumbleEndMs);
  const s0 = resolveDiceRollStage(40, moveDice.durationMs, false);
  const s1 = resolveDiceRollStage(timings.windupEndMs + 40, moveDice.durationMs, false);
  const s2 = resolveDiceRollStage(timings.tumbleEndMs + 40, moveDice.durationMs, false);
  const s3 = resolveDiceRollStage(timings.settleAtMs, moveDice.durationMs, false);
  assert.equal(s0, 'windup');
  assert.equal(s1, 'tumble');
  assert.equal(s2, 'decelerate');
  assert.equal(s3, 'settled');
  assert.equal(isDiceResultRevealed(s0), false, 'Windup must NOT reveal dice result');
  assert.equal(isDiceResultRevealed(s1), false, 'Tumble must NOT reveal dice result');
  assert.equal(isDiceResultRevealed(s2), false, 'Decelerate must NOT reveal dice result');
  assert.equal(isDiceResultRevealed(s3), true, 'Settled must reveal authoritative server result');

  // 3) Reduced Motion rút gọn dưới 260ms và chốt thẳng settled
  const reducedEvents = extractVisualEventsFromDiff(prevMove, nextMove, {
    selfPlayerId: 'p1',
    isSpectator: false,
    reducedMotion: true,
  });
  const fastDice = reducedEvents.find((e) => e.kind === 'DICE_ROLL');
  assert.ok(fastDice && fastDice.durationMs <= 260);
  assert.equal(resolveDiceRollStage(0, fastDice.durationMs, true), 'settled');

  // 4) Reconnect / F5 vào giữa lúc đã có lastDiceRoll không bao giờ replay xúc xắc cũ
  const tracker = new VisualEventTracker();
  const baselineEvents = tracker.seedBaseline(nextMove, { selfPlayerId: 'p1', isSpectator: false });
  assert.equal(baselineEvents.length, 0);
  const dup = tracker.ingestSnapshot(nextMove, { selfPlayerId: 'p1', isSpectator: false });
  assert.equal(dup.length, 0);
});

test('Shared Timeline & Frame-1 Anti-Flicker (8) — Đồng bộ Dice Settled -> Highlight -> Pawn Glide & Chống lóe Frame 1', () => {
  // 1) Timeline đồng bộ chặt chẽ trên mọi quality tier + reducedMotion
  for (const tier of ['high', 'balanced', 'low']) {
    const glideDur = tier === 'high' ? 520 : tier === 'balanced' ? 340 : 0;
    const tl = buildDiceRollTimeline({
      diceKind: 'move',
      qualityTier: tier,
      pawnGlideDurationMs: glideDur,
      reducedMotion: false,
      hasDestinationMove: true,
    });
    assert.ok(tl.windupEndMs > 0 && tl.windupEndMs < tl.tumbleEndMs);
    assert.ok(tl.tumbleEndMs < tl.diceSettleAtMs);
    assert.equal(
      tl.diceSettleAtMs,
      tl.destHighlightStartMs,
      `${tier}: destHighlightStartMs phải khớp đúng diceSettleAtMs`,
    );
    assert.ok(
      tl.pawnGlideStartMs >= tl.destHighlightStartMs,
      `${tier}: pawnGlideStartMs (${tl.pawnGlideStartMs}) không được chạy trước destHighlightStartMs (${tl.destHighlightStartMs})`,
    );
    if (glideDur > 0) {
      assert.ok(
        tl.pawnGlideStartMs > tl.destHighlightStartMs,
        `${tier}: pawnGlideStartMs phải nhường nhịp cho beacon đích sáng trước`,
      );
    }
    assert.equal(tl.pawnTouchdownAtMs, tl.pawnGlideStartMs + tl.pawnGlideDurationMs);
    assert.ok(
      tl.destHighlightEndMs > tl.pawnTouchdownAtMs && tl.destHighlightEndMs > tl.diceOverlayEndMs,
      `${tier}: highlight đích phải giữ sáng qua lúc đáp quân cờ`,
    );
  }

  const rmTl = buildDiceRollTimeline({
    diceKind: 'move',
    qualityTier: 'high',
    pawnGlideDurationMs: 520,
    reducedMotion: true,
    hasDestinationMove: true,
  });
  assert.equal(rmTl.diceSettleAtMs, 0);
  assert.equal(rmTl.destHighlightStartMs, 0);
  assert.equal(rmTl.pawnGlideStartMs, 0);
  assert.equal(rmTl.pawnGlideDurationMs, 0);
  assert.equal(rmTl.pawnTouchdownAtMs, 0);
  assert.ok(rmTl.diceOverlayEndMs <= 260);

  const directTl = buildDirectMoveTimeline({ pawnGlideDurationMs: 520, reducedMotion: false });
  assert.equal(directTl.destHighlightStartMs, 0);
  assert.ok(directTl.pawnGlideStartMs > 0);
  assert.equal(directTl.pawnTouchdownAtMs, directTl.pawnGlideStartMs + 520);

  // 2) Chọn ô sau tổng 7 / La Bàn giữ nguyên lastDiceRoll.id không được phát trùng DICE_ROLL
  const roll7Pub = makePubState({
    turnNumber: 6,
    turnPhase: 'CHOOSE_MOVE',
    lastDiceRoll: {
      id: 'roll-6-1000',
      round: 2,
      atMs: 1000,
      kind: 'move',
      playerId: 'p1',
      displayName: 'Minh An',
      d6: 4,
      d4: 3,
      total: 7,
      rerollRequired: false,
      freeChoice: true,
      resolvedLocation: null,
    },
  });
  const chooseDestPub = {
    ...roll7Pub,
    turnPhase: 'LOCATION_ACTION',
    players: roll7Pub.players.map((p) => (p.playerId === 'p1' ? { ...p, location: 'court' } : p)),
    lastDiceRoll: {
      ...roll7Pub.lastDiceRoll,
      resolvedLocation: 'court',
    },
  };
  assert.equal(computeDiceSig(roll7Pub), computeDiceSig(chooseDestPub));
  const chooseEvents = extractVisualEventsFromDiff(roll7Pub, chooseDestPub, {
    selfPlayerId: 'p1',
    isSpectator: false,
  });
  assert.equal(
    chooseEvents.some((e) => e.kind === 'DICE_ROLL'),
    false,
    'CHOOSE_DEST cùng roll id không được kích hoạt lại DICE_ROLL',
  );

  // 3) peekPendingDiceRoll phát hiện ngay trong render Frame 1 nhưng không đánh dấu sai khi mới mount / F5
  const freshTracker = new VisualEventTracker();
  const initialWithOldRoll = makePubState({
    turnNumber: 3,
    turnPhase: 'MAIN_ACTION',
    lastDiceRoll: {
      id: 'roll-3-900',
      round: 1,
      atMs: 900,
      kind: 'move',
      playerId: 'p2',
      displayName: 'Vy Hà',
      d6: 2,
      d4: 2,
      total: 4,
      rerollRequired: false,
      freeChoice: false,
      resolvedLocation: 'canteen',
    },
  });
  assert.equal(
    freshTracker.peekPendingDiceRoll(initialWithOldRoll, false),
    null,
    'Chưa có baseline (mount / F5 reconnect) thì peekPendingDiceRoll phải trả về null',
  );

  freshTracker.seedBaseline(initialWithOldRoll, { selfPlayerId: 'p1', isSpectator: false });
  assert.equal(freshTracker.peekPendingDiceRoll(initialWithOldRoll, false), null);

  const brandNewRollState = makePubState({
    turnNumber: 4,
    turnPhase: 'LOCATION_ACTION',
    players: initialWithOldRoll.players.map((p) =>
      p.playerId === 'p1' ? { ...p, location: 'radio' } : p,
    ),
    lastDiceRoll: {
      id: 'roll-4-2000',
      round: 2,
      atMs: 2000,
      kind: 'move',
      playerId: 'p1',
      displayName: 'Minh An',
      d6: 5,
      d4: 4,
      total: 9,
      rerollRequired: false,
      freeChoice: false,
      resolvedLocation: 'radio',
    },
  });
  const pendingEv = freshTracker.peekPendingDiceRoll(brandNewRollState, false);
  assert.ok(pendingEv, 'Snapshot mới có lastDiceRoll mới phải kích hoạt pending ngay ở Frame 1');
  assert.equal(pendingEv.d6, 5);
  assert.equal(pendingEv.d4, 4);
  assert.equal(isDiceResultRevealed('windup'), false);
  // Gọi peek lần 2 trước useEffect vẫn trả kết quả thuần túy y hệt
  const builtSnap = buildDiceRollEventFromSnapshot(brandNewRollState, false);
  assert.equal(freshTracker.peekPendingDiceRoll(brandNewRollState, false)?.id, builtSnap.id);

  // Sau khi ingestSnapshot hoặc acknowledgeSnapshotDice thì peek phải trở về null
  const ingested = freshTracker.ingestSnapshot(brandNewRollState, {
    selfPlayerId: 'p1',
    isSpectator: false,
  });
  assert.equal(ingested.filter((e) => e.kind === 'DICE_ROLL').length, 1);
  assert.equal(freshTracker.peekPendingDiceRoll(brandNewRollState, false), null);
});

test('Phase 4 Compact Damage Track (9) — Pure public wound state never infers danger from secret HP, highlights active/near-threshold/eliminated cleanly', () => {
  assert.equal(deriveShortPlayerName('Sinh viên An', 0), 'An');
  assert.equal(deriveShortPlayerName('Sinh viên Bình', 1), 'Bình');
  assert.equal(deriveShortPlayerName('Chu Ban 8P', 2), 'Chu Ban');
  assert.equal(deriveShortPlayerName('SinhVien_4', 3), 'SV 4');
  assert.equal(deriveShortPlayerName('Nguyễn Minh Khôi', 4), 'Minh Khôi');

  const base = makePubState();
  const baseP1 = base.players[0];

  // 1) Nhân vật chưa lật vai (dù bí mật là Allie 8 HP) ở mốc 7 thương tích -> KHÔNG được suy đoán sắp gục
  const unrevealedSeven = computePublicDamageChipState(
    { ...baseP1, woundsTaken: 7, revealedMaxHp: null, revealedRoleId: null },
    'p2',
  );
  assert.equal(unrevealedSeven.isNearThreshold, false);
  assert.equal(unrevealedSeven.isTurnHolder, false);
  assert.equal(unrevealedSeven.woundBadgeText, '7');
  assert.equal(unrevealedSeven.woundBadgeText.includes('/'), false);
  assert.equal(/\bHP\b/i.test(unrevealedSeven.woundBadgeText), false);

  // 2) Nhân vật chưa lật vai chỉ báo cảnh báo công khai ở mốc cao >= 9 trên thang 0..14
  const unrevealedExtreme = computePublicDamageChipState(
    { ...baseP1, woundsTaken: 9, revealedMaxHp: null, revealedRoleId: null },
    'p1',
  );
  assert.equal(unrevealedExtreme.isNearThreshold, true);
  assert.equal(unrevealedExtreme.isTurnHolder, true);
  assert.equal(unrevealedExtreme.woundBadgeText, '9');

  // 3) Nhân vật ĐÃ lật vai, cách ngưỡng công khai <= 3 vết -> Highlight gần ngưỡng gục & hiện wounds/maxHp (không kèm HP)
  const revealedDanger = computePublicDamageChipState(
    { ...baseP1, woundsTaken: 7, revealedMaxHp: 10, revealedRoleId: 'gac-truc-ban', revealedFaction: 'lantern-guard' },
    'p2',
  );
  assert.equal(revealedDanger.isNearThreshold, true);
  assert.equal(revealedDanger.woundBadgeText, '7/10');
  assert.equal(/\bHP\b/i.test(revealedDanger.woundBadgeText), false);

  // 4) Nhân vật ĐÃ lật vai nhưng còn > 3 máu (vd 6/14) -> Chưa gần ngưỡng gục
  const revealedSafe = computePublicDamageChipState(
    { ...baseP1, woundsTaken: 6, revealedMaxHp: 14, revealedRoleId: 'gac-ky-thuat', revealedFaction: 'lantern-guard' },
    'p1',
  );
  assert.equal(revealedSafe.isNearThreshold, false);
  assert.equal(revealedSafe.isTurnHolder, true);
  assert.equal(revealedSafe.woundBadgeText, '6/14');

  // 5) Nhân vật ĐÃ bị loại -> Tắt active/danger, bật eliminated
  const eliminated = computePublicDamageChipState(
    { ...baseP1, alive: false, woundsTaken: 10, revealedMaxHp: 10, revealedRoleId: 'gac-truc-ban', revealedFaction: 'lantern-guard' },
    'p1',
  );
  assert.equal(eliminated.isEliminated, true);
  assert.equal(eliminated.isTurnHolder, false);
  assert.equal(eliminated.isNearThreshold, false);
});

test('Phase 5 Final Polish (10) — Crowded 8-player compact short names & strict public HP secrecy', () => {
  // Mặc định (< 7 người) không thay đổi tên chuẩn
  assert.equal(deriveShortPlayerName('SinhVien_2', 1), 'SV 2');
  assert.equal(deriveShortPlayerName('Chu Ban 8P', 0), 'Chu Ban');

  // Chế độ bàn đông (>= 7 người): compact ngắn gọn nhưng đủ đọc, không cắt 1 chữ
  assert.equal(deriveShortPlayerName('SinhVien_2', 1, { compact: true }), 'SV2');
  assert.equal(deriveShortPlayerName('SinhVien_8', 7, { compact: true }), 'SV8');
  assert.equal(deriveShortPlayerName('Chu Ban 8P', 0, { compact: true }), 'C.Ban');
  assert.equal(deriveShortPlayerName('Nguyễn Minh Khôi', 2, { compact: true }), 'Khôi');
  assert.equal(deriveShortPlayerName('ReconnectPeer_1', 3, { compact: true }), 'P1');
  assert.equal(deriveShortPlayerName('Lê An', 4, { compact: true }), 'Lê An');

  const base = makePubState();
  const baseP1 = base.players[0];
  const crowdedUnrevealed = computePublicDamageChipState(
    { ...baseP1, displayName: 'SinhVien_7', seatIndex: 6, woundsTaken: 7, revealedMaxHp: null, revealedRoleId: null },
    'p2',
    { compact: true },
  );
  assert.equal(crowdedUnrevealed.shortName, 'SV7');
  assert.equal(crowdedUnrevealed.isNearThreshold, false);
  assert.equal(crowdedUnrevealed.woundBadgeText, '7');
  assert.equal(crowdedUnrevealed.woundBadgeText.includes('/'), false);
});

test('Dice Roll Regression (11) — ROLL_DICE -> SKIP_LOC -> END_TURN increments turnNumber without re-spinning previous lastDiceRoll', () => {
  const tracker = new VisualEventTracker();

  const turn1Start = makePubState({
    turnNumber: 1,
    turnPhase: 'ROLL_MOVE',
    activePlayerId: 'p1',
    lastDiceRoll: null,
    publicLog: [],
  });
  tracker.seedBaseline(turn1Start, { selfPlayerId: 'p1', isSpectator: false });

  // 1) Người chơi p1 tung xúc xắc di chuyển (turnNumber = 1)
  const afterRoll = makePubState({
    turnNumber: 1,
    turnPhase: 'LOCATION_ACTION',
    activePlayerId: 'p1',
    players: turn1Start.players.map((p) =>
      p.playerId === 'p1' ? { ...p, location: 'lobby' } : p,
    ),
    lastDiceRoll: {
      id: 'roll-1-1500',
      round: 1,
      atMs: 1500,
      kind: 'move',
      playerId: 'p1',
      displayName: 'Minh An',
      d6: 4,
      d4: 2,
      total: 6,
      rerollRequired: false,
      freeChoice: false,
      resolvedLocation: 'lobby',
      targetPlayerId: null,
      damageDealt: null,
    },
    publicLog: [
      {
        id: 'log-1-roll',
        round: 1,
        atMs: 1500,
        kind: 'move',
        actorId: 'p1',
        text: '🚶 Minh An tung 4 + 2 = 6 → di chuyển tới Ô 6 (Sảnh Tầng 1).',
      },
    ],
  });

  const pendingOnRoll = tracker.peekPendingDiceRoll(afterRoll, false);
  assert.ok(pendingOnRoll, 'Cú tung xúc xắc mới ở Lượt 1 phải kích hoạt pending DICE_ROLL ở Frame 1');
  assert.equal(pendingOnRoll.kind, 'DICE_ROLL');

  const rollEvents = tracker.ingestSnapshot(afterRoll, {
    selfPlayerId: 'p1',
    isSpectator: false,
  });
  assert.equal(rollEvents.filter((e) => e.kind === 'DICE_ROLL').length, 1);

  // 2) Người chơi p1 bỏ qua hành động khu vực sang Pha 3 (turnNumber vẫn là 1, cùng lastDiceRoll)
  const afterSkipLoc = {
    ...afterRoll,
    turnPhase: 'MAIN_ACTION',
    publicLog: [
      ...afterRoll.publicLog,
      {
        id: 'log-1-skip',
        round: 1,
        atMs: 1600,
        kind: 'system',
        actorId: 'p1',
        text: '⏭️ Minh An bỏ qua hành động khu vực để vào pha Chiến đấu.',
      },
    ],
  };
  assert.equal(tracker.peekPendingDiceRoll(afterSkipLoc, false), null);
  const skipEvents = tracker.ingestSnapshot(afterSkipLoc, {
    selfPlayerId: 'p1',
    isSpectator: false,
  });
  assert.equal(skipEvents.filter((e) => e.kind === 'DICE_ROLL').length, 0);

  // 3) Người chơi p1 bấm Kết thúc lượt (END_TURN): server tăng turnNumber -> 2, giữ nguyên lastDiceRoll cũ
  const afterEndTurn = {
    ...afterSkipLoc,
    turnNumber: 2,
    turnPhase: 'ROLL_MOVE',
    activePlayerId: 'p2',
    publicLog: [
      ...afterSkipLoc.publicLog,
      {
        id: 'log-1-end',
        round: 1,
        atMs: 1700,
        kind: 'system',
        actorId: 'p1',
        text: '✔️ Minh An kết thúc lượt.',
      },
    ],
  };

  assert.equal(
    computeDiceSig(afterEndTurn),
    computeDiceSig(afterRoll),
    'computeDiceSig phải bất biến qua END_TURN dù turnNumber tăng từ 1 -> 2',
  );
  assert.equal(
    tracker.peekPendingDiceRoll(afterEndTurn, false),
    null,
    'Sau END_TURN tuyệt đối KHÔNG được kích hoạt windup xúc xắc ở Frame 1',
  );
  const endTurnEvents = tracker.ingestSnapshot(afterEndTurn, {
    selfPlayerId: 'p2',
    isSpectator: false,
  });
  assert.equal(
    endTurnEvents.filter((e) => e.kind === 'DICE_ROLL').length,
    0,
    'Sau END_TURN không được phát trùng DICE_ROLL',
  );
  assert.equal(
    endTurnEvents.some((e) => e.kind === 'CINEMATIC_CUTIN' && e.bannerType === 'YOUR_TURN'),
    true,
    'Vẫn phải phát banner LƯỢT CỦA BẠN cho người chơi p2 khi qua lượt mới',
  );
});

test('AAA Polish (12) — Cinematic Role Reveal 4 phases (1.2-1.8s) & Reduced Motion collapse', () => {
  const normal = resolveRoleRevealTimeline(1560, false);
  assert.ok(normal.totalMs >= 1200 && normal.totalMs <= 1800, 'Role reveal duration must stay within 1.2-1.8s');
  assert.ok(
    normal.anticipationEndMs > 0 &&
      normal.anticipationEndMs < normal.revealEndMs &&
      normal.revealEndMs < normal.impactEndMs &&
      normal.impactEndMs < normal.totalMs,
    'Role reveal must strictly follow anticipation -> reveal -> impact -> settle',
  );

  const clampedLow = resolveRoleRevealTimeline(900, false);
  assert.equal(clampedLow.totalMs, 1200);
  const clampedHigh = resolveRoleRevealTimeline(2400, false);
  assert.equal(clampedHigh.totalMs, 1800);

  const reduced = resolveRoleRevealTimeline(1560, true);
  assert.equal(reduced.anticipationEndMs, 0);
  assert.equal(reduced.revealEndMs, 0);
  assert.equal(reduced.impactEndMs, 0);
  assert.ok(reduced.totalMs <= 260, 'Reduced Motion must clamp Role Reveal to <= 260ms');
});

test('AAA Polish (13) — Combat 5 phases + 75ms Hit-Stop (60-100ms) for strikes vs 0ms for heal/shield', () => {
  for (const eff of ['SLASH', 'MASAMUNE_SLASH', 'SPEAR_THRUST', 'HANDGUN_SHOT', 'MACHINE_GUN_BARRAGE', 'LIGHTNING_STRIKE', 'EXPLOSION', 'COUNTER_STRIKE']) {
    const t = resolveCombatSequenceTimings(680, eff, false);
    assert.ok(t.targetLockEndMs > 0 && t.targetLockEndMs < t.travelEndMs);
    assert.equal(t.hitStopStartMs, t.travelEndMs);
    assert.ok(t.hitStopDurationMs >= 60 && t.hitStopDurationMs <= 100, `${eff} hitStopDurationMs must be 60-100ms`);
    assert.equal(t.hitStopDurationMs, 75);
    assert.equal(t.hitStopEndMs, t.hitStopStartMs + t.hitStopDurationMs);
    assert.ok(t.damagePopAtMs >= t.hitStopStartMs && t.damagePopAtMs <= t.hitStopEndMs);
    assert.ok(t.hitStopEndMs < t.recoveryEndMs);
  }

  for (const eff of ['HEAL_AURA', 'SHIELD_GUARD', 'STEAL_TETHER']) {
    const t = resolveCombatSequenceTimings(680, eff, false);
    assert.equal(t.hitStopDurationMs, 0);
  }

  const reduced = resolveCombatSequenceTimings(680, 'COUNTER_STRIKE', true);
  assert.equal(reduced.hitStopDurationMs, 0);
  assert.equal(reduced.targetLockEndMs, 0);
  assert.ok(reduced.recoveryEndMs <= 260);
});

test('AAA Polish (14) — Character Signature Skill VFX with strict P0 secret role isolation', () => {
  const base = makePubState({ turnNumber: 5 });

  // Unrevealed shadow triggers passive/skill without revealedRoleId -> must NEVER emit portrait cut-in or roleId on COMBAT_VFX
  const afterSecretCounter = {
    ...base,
    publicLog: [
      {
        id: 'log-secret-counter',
        round: 2,
        atMs: 5000,
        kind: 'skill',
        actorId: 'p4',
        text: '🛡️ Dung kích hoạt phản kích gây 1 sát thương lên Minh An!',
      },
    ],
  };
  const secretEvents = extractVisualEventsFromDiff(base, afterSecretCounter, {
    selfPlayerId: 'p1',
    isSpectator: true,
  });
  const counterFxSecret = secretEvents.find((e) => e.kind === 'COMBAT_VFX' && e.effect === 'COUNTER_STRIKE');
  assert.ok(counterFxSecret);
  assert.equal(counterFxSecret.roleId ?? null, null, 'Unrevealed actor must not leak roleId on COUNTER_STRIKE');
  assert.equal(
    secretEvents.some((e) => e.kind === 'CINEMATIC_CUTIN' && e.roleId),
    false,
    'Spectator must not receive portrait Cut-In for unrevealed character',
  );

  // Revealed gac-truc-ban, lang-quan-sat, suong-an-danh, lang-anh-san emit bespoke roleId on COMBAT_VFX
  const revealedPrev = makePubState({
    turnNumber: 6,
    players: base.players.map((p) => {
      if (p.playerId === 'p1') return { ...p, revealed: true, revealedFaction: 'lantern-guard', revealedRoleId: 'gac-truc-ban' };
      if (p.playerId === 'p2') return { ...p, revealed: true, revealedFaction: 'wanderer', revealedRoleId: 'lang-quan-sat' };
      if (p.playerId === 'p3') return { ...p, revealed: true, revealedFaction: 'mist-order', revealedRoleId: 'suong-an-danh' };
      return { ...p, revealed: true, revealedFaction: 'wanderer', revealedRoleId: 'lang-anh-san' };
    }),
  });
  const revealedNext = {
    ...revealedPrev,
    publicLog: [
      {
        id: 'log-truc-ban',
        round: 3,
        atMs: 6000,
        kind: 'skill',
        actorId: 'p1',
        text: '⚡ Minh An dùng Bước Nhảy Tắt dịch chuyển tức thì!',
      },
      {
        id: 'log-quan-sat',
        round: 3,
        atMs: 6001,
        kind: 'skill',
        actorId: 'p2',
        text: '💚 Bình kích hoạt Ý Chí Hồi Sinh hồi thương tích!',
      },
      {
        id: 'log-an-danh',
        round: 3,
        atMs: 6002,
        kind: 'skill',
        actorId: 'p3',
        text: '🌒 Chi dùng Hấp Thụ Đêm Khuya hút sinh lực!',
      },
      {
        id: 'log-anh-san',
        round: 3,
        atMs: 6003,
        kind: 'skill',
        actorId: 'p4',
        text: '🧲 Dung dùng Cướp Đồ Thay Đòn từ Minh An!',
      },
    ],
  };
  const sigEvents = extractVisualEventsFromDiff(revealedPrev, revealedNext, {
    selfPlayerId: 'p1',
    isSpectator: true,
  });
  for (const rid of ['gac-truc-ban', 'lang-quan-sat', 'suong-an-danh', 'lang-anh-san']) {
    assert.ok(
      sigEvents.some((e) => e.kind === 'COMBAT_VFX' && e.roleId === rid),
      `Expected signature COMBAT_VFX with roleId=${rid}`,
    );
    assert.ok(
      sigEvents.some((e) => e.kind === 'CINEMATIC_CUTIN' && e.bannerType === 'ULTIMATE_SKILL' && e.roleId === rid),
      `Expected ULTIMATE_SKILL banner for revealed ${rid}`,
    );
  }
});

test('AAA Polish (15) — Reconnect idempotency after Victory & Signature Skill batch', () => {
  const tracker = new VisualEventTracker();
  const base = makePubState({ turnNumber: 8 });
  const victorySnap = {
    ...base,
    winnerFaction: 'mist-order',
    winnerLabel: 'Hội Sương Mù chiến thắng',
    winReason: 'Tất cả Vệ Đèn đã bị hạ gục.',
  };
  tracker.seedBaseline(base, { selfPlayerId: 'p1', isSpectator: false });
  const firstPass = tracker.ingestSnapshot(victorySnap, { selfPlayerId: 'p1', isSpectator: false });
  assert.equal(firstPass.some((e) => e.kind === 'CINEMATIC_CUTIN' && e.bannerType === 'VICTORY'), true);

  // Simulate F5 / WebSocket reconnect ingesting the exact same victory snapshot
  const trackerAfterReconnect = new VisualEventTracker();
  trackerAfterReconnect.seedBaseline(victorySnap, { selfPlayerId: 'p1', isSpectator: false });
  const replay = trackerAfterReconnect.ingestSnapshot(victorySnap, { selfPlayerId: 'p1', isSpectator: false });
  assert.equal(replay.length, 0, 'Reconnect after victory must not replay any VFX');
});
