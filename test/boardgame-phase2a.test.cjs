/**
 * test/boardgame-phase2a.test.cjs — Phase 2A Comprehensive Test Suite
 *
 * Covers ALL Phase 2A characters & acceptance criteria:
 *  1. Registry & Playability Gate (4 implemented / 52 unimplemented / prod locked)
 *  2. Wendigo (Shadow, 14 HP) — ON_ELIMINATION secret choice, revealed no-cooldown, max 14 HP, self-death, multi-elim, pre-victory
 *  3. G43 (Hunter, 14 HP) — BEFORE_DAMAGE -2 attack only, floor 0, Holy Robe, critical, Machine Gun, Werewolf counter
 *  4. Fiona (Hunter, 12 HP) — BEFORE_ATTACK 2 deterministic rolls, Masamune, Machine Gun, anti-spoof, no 3rd roll, timeout fallback
 *  5. Wyvern (Shadow, 14 HP) — ON_ELIMINATION attack kill Hunter/Neutral +5 vs Shadow full heal, non-attack excluded, dead guard, cap 14
 *  6. Real 4P + Spectator & 8P Durable Object Multiplayer:
 *     - Prod DO rejects starter-four; experimental DO accepts starter-four
 *     - Spectator P0 privacy & secret reaction zero-leak
 *     - F5 reconnect & DO hibernation mid-pendingChoice (zero RNG/skill replay)
 *     - Duplicate requestId idempotency & alarm timeout fallback (no deadlock)
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
require('./register-ts.cjs');

const { WebSocket } = require('./ws-shim/mini-ws');
const {
  startStandaloneBoardGameTestServer,
} = require('./ws-shim/boardgame-do-harness.cjs');

const {
  validateBoardGameActionPayload,
} = require('../shared/contracts/boardgame.ts');

const {
  DEFAULT_CHARACTER_REGISTRY,
  DEFAULT_RULESET_REGISTRY,
  PHASE2_IMPLEMENTED_EXPANSION_ROLE_IDS,
  applyPendingChoiceTimeout,
  applyPlayerGameAction,
  createInitialGameState,
  getPrivateGameView,
  getPublicGameView,
  getRoleDesign,
  isCharacterPlayable,
} = require('../features/boardgame/domain/index.ts');

function makePlayers(count) {
  return Array.from({ length: count }, (_, i) => ({
    playerId: `p${i + 1}`,
    displayName: `SV ${i + 1}`,
    seatIndex: i,
    appearance: {},
    connected: true,
  }));
}

function makeControlledExpandedState(roleSpecs, seed = 202620) {
  const state = createInitialGameState({
    matchId: `p2a_${seed}`,
    seed,
    nowMs: 1_700_000_000_000,
    rulesetId: 'starter-four',
    allowExperimental: true,
    choiceTimeoutMs: 5000,
    players: makePlayers(roleSpecs.length),
  });

  state.clusterPairs = [
    { clusterId: 'north', locationIds: ['radio', 'breaker'] },
    { clusterId: 'central', locationIds: ['lobby', 'canteen'] },
    { clusterId: 'south', locationIds: ['corridor', 'court'] },
  ];

  roleSpecs.forEach((spec, idx) => {
    const pid = `p${idx + 1}`;
    const p = state.players[pid];
    const design = getRoleDesign(spec.roleId);
    p.roleId = spec.roleId;
    p.faction = design.faction;
    p.maxHp = design.maxHp;
    p.woundsTaken = spec.woundsTaken ?? 0;
    p.hp = Math.max(0, design.maxHp - p.woundsTaken);
    p.revealed = Boolean(spec.revealed);
    p.alive = spec.alive !== false;
    p.location = spec.location ?? 'lobby';
    p.equipped = [...(spec.equipped ?? [])];
    p.hand = [...(spec.hand ?? [])];
    p.guardianShieldActive = Boolean(spec.guardianShieldActive);
  });

  state.activePlayerId = 'p1';
  state.turnPhase = 'MAIN_ACTION';
  return state;
}

async function openBgClient(wsBaseUrl, matchId) {
  const ws = new WebSocket(`${wsBaseUrl}/ws/boardgame?matchId=${encodeURIComponent(matchId)}`);
  const inbox = [];
  const waiters = [];
  let latestSync = null;

  ws.on('message', (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.type === 'BG_STATE_SYNC') latestSync = msg;
    inbox.push(msg);
    for (let i = waiters.length - 1; i >= 0; i--) {
      if (waiters[i].pred(msg)) {
        const w = waiters.splice(i, 1)[0];
        clearTimeout(w.timer);
        w.resolve(msg);
      }
    }
  });

  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });

  return {
    ws,
    inbox,
    getLatestSync: () => latestSync,
    send(payload) {
      ws.send(JSON.stringify(payload));
    },
    nextMsg(pred, timeoutMs = 4000, fromIndex = 0) {
      for (let i = fromIndex; i < inbox.length; i++) {
        if (pred(inbox[i])) return Promise.resolve(inbox[i]);
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const idx = waiters.findIndex((w) => w.timer === timer);
          if (idx >= 0) waiters.splice(idx, 1);
          reject(new Error(`Timeout waiting for WS message (${inbox.length} received)`));
        }, timeoutMs);
        waiters.push({ pred, resolve, timer });
      });
    },
    close() {
      try {
        ws.close();
      } catch {
        // ignore
      }
    },
  };
}

// ===========================================================================
// 1. REGISTRY & PLAYABILITY GATE
// ===========================================================================

test('P2A-1 — Exactly 4 Phase 2A characters playable; production rulesets remain Classic-only', () => {
  const expectedIds = ['exp1_wendigo', 'exp2_g43', 'exp2_fiona', 'exp2_wyvern'];
  for (const id of expectedIds) {
    assert.ok(PHASE2_IMPLEMENTED_EXPANSION_ROLE_IDS.includes(id));
    const entry = DEFAULT_CHARACTER_REGISTRY.get(id);
    assert.ok(entry, `Missing ${id}`);
    assert.equal(entry.metadata.rulesStatus, 'verified');
    assert.equal(entry.metadata.implementationStatus, 'implemented');
    assert.ok(entry.skillImpl !== null);
    assert.ok(entry.victoryImpl !== null);
    assert.equal(isCharacterPlayable(entry), true);
  }

  // Production ruleset list stays strictly 4 (classic + 3 coming-soon expansions)
  assert.equal(DEFAULT_RULESET_REGISTRY.listRulesets().length, 4);

  // Production validation MUST block expansion-1/2/full AND starter-four
  for (const blocked of ['expansion-1', 'expansion-2', 'full-expansion', 'starter-four']) {
    const prodCheck = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch(blocked, 6);
    assert.equal(prodCheck.ok, false, `Prod must block ${blocked}`);
    if (!prodCheck.ok) assert.equal(prodCheck.code, 'RULESET_UNAVAILABLE');
  }

  // Experimental harness enables starter-four (14 playable chars) while STILL blocking incomplete expansions!
  const expOk = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch('starter-four', 8, {
    allowExperimental: true,
  });
  assert.equal(expOk.ok, true);
  if (expOk.ok) {
    assert.equal(expOk.pools.lanternGuard.length, 5); // 3 Classic + G43 + Fiona
    assert.equal(expOk.pools.mistOrder.length, 5); // 3 Classic + Wendigo + Wyvern
    assert.equal(expOk.pools.wanderer.length, 4); // 4 Classic
  }
  for (const incomplete of ['expansion-1', 'expansion-2', 'full-expansion']) {
    const stillBlocked = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch(incomplete, 6, {
      allowExperimental: true,
    });
    assert.equal(stillBlocked.ok, false, `Incomplete ruleset ${incomplete} must stay blocked`);
  }
});

// ===========================================================================
// 2. WENDIGO (Shadow, 14 HP)
// ===========================================================================

test('P2A-2a — Wendigo unrevealed opens secret choice (zero public leak), reveal heals +1 HP, decline stays hidden', () => {
  const now = 1_700_000_001_000;

  // Case A: Unrevealed Wendigo chooses reveal_and_activate
  const s1 = makeControlledExpandedState([
    { roleId: 'gac-ky-thuat', revealed: true, location: 'lobby', equipped: ['ev-01', 'ev-02', 'ev-03', 'ev-04'] }, // 1d4+3 >= 4 dmg
    { roleId: 'suong-an-danh', revealed: true, location: 'lobby', woundsTaken: 11 }, // 2 HP left -> guaranteed kill
    { roleId: 'exp1_wendigo', revealed: false, location: 'radio', woundsTaken: 4 }, // 10/14 HP, hidden
    { roleId: 'gac-radio', revealed: false, location: 'corridor' },
  ]);

  const atk = applyPlayerGameAction(s1, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  assert.equal(atk.ok, true);
  assert.equal(s1.players.p2.alive, false);
  assert.ok(s1.pendingChoice, 'Hidden Wendigo must open a pending choice instead of auto-revealing');
  assert.equal(s1.pendingChoice.kind, 'wendigo_reveal_heal');
  assert.equal(s1.pendingChoice.ownerPlayerId, 'p3');
  assert.equal(s1.players.p3.revealed, false, 'Must NOT auto-reveal before player chooses');

  // P0 Privacy check on public view & non-owner private view
  const pub = getPublicGameView(s1);
  assert.ok(pub.pendingChoice);
  assert.equal(pub.pendingChoice.isSecret, true);
  assert.equal(pub.pendingChoice.ownerPlayerId, null, 'Public view must NOT leak secret reaction owner');
  assert.equal(pub.pendingChoice.kind, null, 'Public view must NOT leak secret reaction kind');
  assert.equal(getPrivateGameView(s1, 'p1').pendingChoice, undefined);
  assert.equal(getPrivateGameView(s1, 'p4').pendingChoice, undefined);
  assert.equal(getPrivateGameView(s1, 'p3').pendingChoice.kind, 'wendigo_reveal_heal');

  // Non-owner trying to resolve or send another action MUST be rejected neutrally
  const spoof = applyPlayerGameAction(
    s1,
    'p1',
    { type: 'RESOLVE_CHOICE', choiceId: s1.pendingChoice.choiceId, optionId: 'decline' },
    now + 10,
  );
  assert.equal(spoof.ok, false);
  assert.equal(spoof.error.toLowerCase().includes('wendigo'), false);

  const blockedEnd = applyPlayerGameAction(s1, 'p1', { type: 'END_TURN' }, now + 15);
  assert.equal(blockedEnd.ok, false);

  // Wendigo resolves: reveal_and_activate
  const cid = s1.pendingChoice.choiceId;
  const res = applyPlayerGameAction(
    s1,
    'p3',
    { type: 'RESOLVE_CHOICE', choiceId: cid, optionId: 'reveal_and_activate' },
    now + 20,
  );
  assert.equal(res.ok, true);
  assert.equal(s1.pendingChoice, null);
  assert.equal(s1.players.p3.revealed, true);
  assert.equal(s1.players.p3.hp, 11, 'Wendigo should heal +1 HP (10 -> 11)');

  // Replaying resolved choiceId MUST be rejected
  const replay = applyPlayerGameAction(
    s1,
    'p3',
    { type: 'RESOLVE_CHOICE', choiceId: cid, optionId: 'reveal_and_activate' },
    now + 30,
  );
  assert.equal(replay.ok, false);

  // Case B: Unrevealed Wendigo chooses decline -> stays hidden, no heal, ZERO Wendigo log leak
  const s2 = makeControlledExpandedState([
    { roleId: 'gac-ky-thuat', revealed: true, location: 'lobby', equipped: ['ev-01', 'ev-02', 'ev-03', 'ev-04'] },
    { roleId: 'suong-an-danh', revealed: true, location: 'lobby', woundsTaken: 11 },
    { roleId: 'exp1_wendigo', revealed: false, location: 'radio', woundsTaken: 4 },
    { roleId: 'gac-radio', revealed: false, location: 'corridor' },
  ]);
  applyPlayerGameAction(s2, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  const logsBeforeDecline = s2.publicLog.length;
  const dec = applyPlayerGameAction(
    s2,
    'p3',
    { type: 'RESOLVE_CHOICE', choiceId: s2.pendingChoice.choiceId, optionId: 'decline' },
    now + 20,
  );
  assert.equal(dec.ok, true);
  assert.equal(s2.players.p3.revealed, false);
  assert.equal(s2.players.p3.hp, 10, 'Declining must not heal');
  const addedLogs = s2.publicLog.slice(logsBeforeDecline).map((l) => l.text).join(' ');
  assert.equal(addedLogs.includes('Wendigo'), false, 'Declining must emit zero public log mentioning Wendigo');
});

test('P2A-2b — Wendigo revealed has no cooldown, caps at 14 HP, ignores self-death, triggers before victory', () => {
  const now = 1_700_000_002_000;

  // 1. Multi-elimination with Machine Gun + revealed Wendigo -> heals once per victim, no cooldown, capped at 14
  const sMulti = makeControlledExpandedState([
    { roleId: 'gac-ky-thuat', revealed: true, location: 'lobby', equipped: ['ev-01', 'ev-02', 'ev-03', 'ev-04', 'ev-06'] },
    { roleId: 'lang-quan-sat', revealed: true, location: 'lobby', woundsTaken: 7 }, // 1 HP
    { roleId: 'gac-radio', revealed: true, location: 'lobby', woundsTaken: 11 }, // 1 HP
    { roleId: 'exp1_wendigo', revealed: true, location: 'corridor', woundsTaken: 1 }, // 13/14 HP
    { roleId: 'suong-an-danh', revealed: true, location: 'corridor' },
  ]);
  const resMulti = applyPlayerGameAction(sMulti, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  assert.equal(resMulti.ok, true);
  assert.equal(sMulti.players.p2.alive, false);
  assert.equal(sMulti.players.p3.alive, false);
  assert.equal(sMulti.players.p4.hp, 14, 'Wendigo must heal up to maxHp 14 and never exceed 14');
  assert.equal(sMulti.players.p4.woundsTaken, 0);

  // 2. Self-death: Wendigo dying does NOT trigger or resurrect itself
  const sSelf = makeControlledExpandedState([
    { roleId: 'gac-ky-thuat', revealed: true, location: 'lobby', equipped: ['ev-01', 'ev-02', 'ev-03', 'ev-04'] },
    { roleId: 'exp1_wendigo', revealed: true, location: 'lobby', woundsTaken: 13 }, // 1 HP
    { roleId: 'suong-an-danh', revealed: true, location: 'corridor' },
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
  ]);
  applyPlayerGameAction(sSelf, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  assert.equal(sSelf.players.p2.alive, false);
  assert.equal(sSelf.players.p2.hp, 0, 'Dead Wendigo must never self-heal or resurrect');

  // 3. Deterministic order before victory: last Hunter dies -> revealed Wendigo heals BEFORE match ends
  const sPreVic = makeControlledExpandedState([
    { roleId: 'suong-an-danh', revealed: true, location: 'lobby', equipped: ['ev-01', 'ev-02', 'ev-03', 'ev-04'] },
    { roleId: 'gac-ky-thuat', revealed: true, location: 'lobby', woundsTaken: 13 }, // last Hunter at 1 HP
    { roleId: 'exp1_wendigo', revealed: true, location: 'corridor', woundsTaken: 5 }, // 9/14 HP
    { roleId: 'gac-radio', revealed: true, location: 'corridor', alive: false, woundsTaken: 12 },
  ]);
  applyPlayerGameAction(sPreVic, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  assert.equal(sPreVic.finished, true);
  assert.equal(sPreVic.winnerFaction, 'mist-order');
  assert.equal(sPreVic.players.p3.hp, 10, 'Wendigo must heal +1 HP before victory finalizes');
  assert.equal(sPreVic.players.p2.alive, false);
});

// ===========================================================================
// 3. G43 (Hunter, 14 HP)
// ===========================================================================

test('P2A-3 — G43 reduces attack by 2 only when revealed, floors at 0, ignores non-attack, works with Holy Robe / crit / Machine Gun / counter', () => {
  const now = 1_700_000_003_000;

  // 1. Unrevealed G43 gets NO reduction
  const sHidden = makeControlledExpandedState([
    { roleId: 'suong-an-danh', revealed: true, location: 'lobby', equipped: ['ev-01'] }, // 1d4 attack
    { roleId: 'exp2_g43', revealed: false, location: 'lobby' },
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
    { roleId: 'suong-gac-cong', revealed: true, location: 'corridor' },
  ], 1001);
  applyPlayerGameAction(sHidden, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  const rawRollHidden = sHidden.lastDiceRoll.total;
  assert.equal(sHidden.players.p2.woundsTaken, rawRollHidden, 'Hidden G43 must take full damage');

  // 2. Revealed G43 reduces attack by 2, floored at 0 (never heals)
  const sFloor = makeControlledExpandedState([
    { roleId: 'suong-an-danh', revealed: true, location: 'lobby', equipped: ['ev-01', 'eq-01'] }, // 1d4 - 1 <= 3
    { roleId: 'exp2_g43', revealed: true, location: 'lobby', woundsTaken: 3 },
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
    { roleId: 'suong-gac-cong', revealed: true, location: 'corridor' },
  ], 1002);
  const hpBeforeFloor = sFloor.players.p2.hp;
  applyPlayerGameAction(sFloor, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  const expectedFloorDmg = Math.max(0, sFloor.lastDiceRoll.total - 2);
  assert.equal(hpBeforeFloor - sFloor.players.p2.hp, expectedFloorDmg);
  assert.ok(sFloor.players.p2.hp <= hpBeforeFloor, 'G43 reduction must never heal');

  // 3. Revealed G43 + Holy Robe (eq-01) stacks: -1 (Holy Robe) and -2 (G43) = -3 total on critical/high damage
  const sRobe = makeControlledExpandedState([
    { roleId: 'gac-ky-thuat', revealed: true, location: 'lobby', equipped: ['ev-01', 'eq-04', 'ev-02', 'ev-03', 'ev-04'] }, // 1d4 + 5 => 6..9 dmg
    { roleId: 'exp2_g43', revealed: true, location: 'lobby', equipped: ['eq-01'] },
    { roleId: 'suong-an-danh', revealed: true, location: 'corridor' },
    { roleId: 'suong-gac-cong', revealed: true, location: 'corridor' },
  ], 1003);
  applyPlayerGameAction(sRobe, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  const rawCrit = sRobe.lastDiceRoll.total;
  assert.ok(rawCrit >= 6);
  assert.equal(sRobe.players.p2.woundsTaken, Math.max(0, rawCrit - 3), 'G43 (-2) + Holy Robe (-1) must stack cleanly');

  // 4. Multi-target Machine Gun: G43 reduces its own instance by 2 once; non-G43 takes full raw damage
  const sMg = makeControlledExpandedState([
    { roleId: 'suong-an-danh', revealed: true, location: 'lobby', equipped: ['ev-01', 'ev-02', 'ev-03', 'ev-06'] }, // 1d4 + 2 => 3..6
    { roleId: 'exp2_g43', revealed: true, location: 'lobby' },
    { roleId: 'gac-radio', revealed: true, location: 'lobby' },
    { roleId: 'suong-gac-cong', revealed: true, location: 'corridor' },
  ], 1004);
  applyPlayerGameAction(sMg, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  const mgRaw = sMg.lastDiceRoll.total;
  assert.equal(sMg.players.p2.woundsTaken, Math.max(0, mgRaw - 2), 'G43 reduces Machine Gun hit by 2');
  assert.equal(sMg.players.p3.woundsTaken, mgRaw, 'Other Machine Gun target takes full damage');

  // 5. Non-attack sources (skill / card / location / investigation) MUST NOT be reduced by G43
  const sNonAtk = makeControlledExpandedState([
    { roleId: 'gac-radio', revealed: true, location: 'corridor', hand: ['eq-11', 'inv-11'] },
    { roleId: 'exp2_g43', revealed: true, location: 'lobby' },
    { roleId: 'suong-an-danh', revealed: true, location: 'radio' },
    { roleId: 'suong-gac-cong', revealed: true, location: 'radio' },
  ], 1005);
  sNonAtk.turnPhase = 'LOCATION_ACTION';
  // Location power (corridor 2 dmg)
  applyPlayerGameAction(sNonAtk, 'p1', { type: 'USE_LOC_POWER', targetPlayerId: 'p2', mode: 'damage' }, now);
  assert.equal(sNonAtk.players.p2.woundsTaken, 2, 'G43 must NOT reduce location damage');
  // Card (eq-11 Flare 2 dmg)
  applyPlayerGameAction(sNonAtk, 'p1', { type: 'USE_CARD', cardId: 'eq-11' }, now + 10);
  assert.equal(sNonAtk.players.p2.woundsTaken, 4, 'G43 must NOT reduce card/event damage');
  // Investigation card (inv-11 Tough Lesson 2 dmg for maxHp >= 12)
  applyPlayerGameAction(sNonAtk, 'p1', { type: 'INVESTIGATE_CARD', cardId: 'inv-11', targetPlayerId: 'p2' }, now + 20);
  assert.equal(sNonAtk.players.p2.woundsTaken, 6, 'G43 must NOT reduce investigation card damage');
  // Skill (gac-radio 1d6 dmg)
  const wBeforeSkill = sNonAtk.players.p2.woundsTaken;
  applyPlayerGameAction(sNonAtk, 'p1', { type: 'USE_SKILL', targetPlayerId: 'p2' }, now + 30);
  assert.ok(sNonAtk.players.p2.woundsTaken > wBeforeSkill, 'G43 must NOT reduce skill damage');
  const skillLog = sNonAtk.publicLog[sNonAtk.publicLog.length - 1].text;
  const rollMatch = /(?:1d6|xs 6 mặt)\s*=\s*(\d)/.exec(skillLog);
  assert.ok(rollMatch);
  assert.equal(sNonAtk.players.p2.woundsTaken - wBeforeSkill, Number(rollMatch[1]));

  // 6. Werewolf counterattack IS sourceType='attack' -> revealed G43 reduces counterattack by 2
  const sCounter = makeControlledExpandedState([
    { roleId: 'exp2_g43', revealed: true, location: 'lobby', equipped: ['ev-01'] },
    { roleId: 'suong-gac-cong', revealed: true, location: 'lobby', equipped: ['ev-01', 'ev-02', 'ev-03'] }, // counter 1d4+2 => 3..6
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
    { roleId: 'suong-an-danh', revealed: true, location: 'corridor' },
  ], 1006);
  applyPlayerGameAction(sCounter, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  assert.ok(sCounter.lastDiceRoll.counterRoll);
  assert.equal(
    sCounter.players.p1.woundsTaken,
    Math.max(0, sCounter.lastDiceRoll.counterRoll.total - 2),
    'Revealed G43 must reduce Werewolf counterattack damage by 2',
  );
});

// ===========================================================================
// 4. FIONA (Hunter, 12 HP)
// ===========================================================================

test('P2A-4 — Fiona double deterministic roll, Masamune consistency, anti-spoof, no 3rd roll, timeout fallback to roll 0', () => {
  const now = 1_700_000_004_000;

  // 1. Contract rejects spoofed dice values in RESOLVE_CHOICE
  const badPayload = validateBoardGameActionPayload({
    type: 'RESOLVE_CHOICE',
    choiceId: 'choice-1',
    optionId: 'roll_0',
    d6: 6,
    d4: 1,
  });
  assert.equal(badPayload.ok, false, 'Client MUST NOT be allowed to submit dice fields');

  // 2. Revealed Fiona generates 2 deterministic rolls; choosing roll_1 applies roll_1 (no 3rd roll)
  const s1 = makeControlledExpandedState([
    { roleId: 'exp2_fiona', revealed: true, location: 'lobby' },
    { roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
    { roleId: 'suong-gac-cong', revealed: true, location: 'corridor' },
  ], 2001);
  const s1Clone = structuredClone(s1);

  const a1 = applyPlayerGameAction(s1, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  const a1Clone = applyPlayerGameAction(s1Clone, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  assert.equal(a1.ok, true);
  assert.equal(a1Clone.ok, true);
  assert.ok(s1.pendingChoice);
  assert.equal(s1.pendingChoice.kind, 'fiona_attack_roll');
  assert.equal(s1.pendingChoice.options.length, 2);
  // Deterministic RNG produces exact same 2 rolls
  assert.deepEqual(s1.pendingChoice.data.rolls, s1Clone.pendingChoice.data.rolls);

  const [roll0, roll1] = s1.pendingChoice.data.rolls;
  const rngBeforePick = s1.rngState;
  const cid = s1.pendingChoice.choiceId;
  const pick1 = applyPlayerGameAction(
    s1,
    'p1',
    { type: 'RESOLVE_CHOICE', choiceId: cid, optionId: 'roll_1' },
    now + 10,
  );
  assert.equal(pick1.ok, true);
  assert.equal(s1.pendingChoice, null);
  assert.equal(s1.rngState, rngBeforePick, 'Choosing roll_1 must NOT roll a 3rd time');
  assert.equal(s1.players.p2.woundsTaken, roll1.rawDmg);
  assert.equal(s1.activePlayerId, 'p2', 'Turn must advance cleanly after Fiona attack resolves');

  // 3. Timeout fallback picks roll_0 (first result) automatically and advances turn
  const timedOut = applyPendingChoiceTimeout(s1Clone, now + 10_000);
  assert.equal(timedOut, true);
  assert.equal(s1Clone.pendingChoice, null);
  assert.equal(s1Clone.players.p2.woundsTaken, roll0.rawDmg, 'Timeout fallback MUST apply first roll (roll_0)');
  assert.equal(s1Clone.activePlayerId, 'p2', 'Turn must advance after timeout fallback');

  // 4. Masamune (ev-01) applies consistently to BOTH Fiona rolls
  const sMasa = makeControlledExpandedState([
    { roleId: 'exp2_fiona', revealed: true, location: 'lobby', equipped: ['ev-01'] },
    { roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
    { roleId: 'suong-gac-cong', revealed: true, location: 'corridor' },
  ], 2002);
  applyPlayerGameAction(sMasa, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  const masaRolls = sMasa.pendingChoice.data.rolls;
  for (const r of masaRolls) {
    assert.equal(r.hasMasamune, true);
    assert.equal(r.d6, 0);
    assert.ok(r.d4 >= 1 && r.d4 <= 4);
    assert.equal(r.baseDmg, r.d4);
  }

  // 5. Hidden Fiona does NOT trigger double roll
  const sHidden = makeControlledExpandedState([
    { roleId: 'exp2_fiona', revealed: false, location: 'lobby' },
    { roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
    { roleId: 'suong-gac-cong', revealed: true, location: 'corridor' },
  ], 2003);
  applyPlayerGameAction(sHidden, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  assert.equal(sHidden.pendingChoice, null, 'Unrevealed Fiona must not trigger skill');
});

// ===========================================================================
// 5. WYVERN (Shadow, 14 HP)
// ===========================================================================

test('P2A-5 — Wyvern heals +5 on Hunter/Neutral attack kill, full on Shadow attack kill, ignores non-attack/hidden/dead, caps at 14', () => {
  const now = 1_700_000_005_000;

  // 1. Revealed Wyvern kills Hunter by attack -> heals 5 HP (capped at 14)
  const sHunter = makeControlledExpandedState([
    { roleId: 'exp2_wyvern', revealed: true, location: 'lobby', woundsTaken: 8, equipped: ['ev-01', 'ev-02', 'ev-03'] }, // 6/14 HP
    { roleId: 'gac-radio', revealed: true, location: 'lobby', woundsTaken: 10 }, // 2 HP
    { roleId: 'gac-ky-thuat', revealed: true, location: 'corridor' },
    { roleId: 'suong-an-danh', revealed: true, location: 'corridor' },
  ], 3001);
  applyPlayerGameAction(sHunter, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  assert.equal(sHunter.players.p2.alive, false);
  assert.equal(sHunter.players.p1.hp, 11, 'Wyvern killing Hunter must heal +5 (6 -> 11)');

  // 2. Revealed Wyvern kills Neutral by attack when only 2 wounds -> capped at 14 HP
  const sNeutral = makeControlledExpandedState([
    { roleId: 'exp2_wyvern', revealed: true, location: 'lobby', woundsTaken: 2, equipped: ['ev-01', 'ev-02', 'ev-03'] }, // 12/14 HP
    { roleId: 'lang-quan-sat', revealed: true, location: 'lobby', woundsTaken: 7 }, // 1 HP
    { roleId: 'gac-ky-thuat', revealed: true, location: 'corridor' },
    { roleId: 'suong-an-danh', revealed: true, location: 'corridor' },
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
  ], 3002);
  applyPlayerGameAction(sNeutral, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  assert.equal(sNeutral.players.p2.alive, false);
  assert.equal(sNeutral.players.p1.hp, 14, 'Wyvern heal must cap at maxHp 14');

  // 3. Revealed Wyvern kills Shadow by attack -> heals FULL to 14 HP (from 3/14)
  const sShadow = makeControlledExpandedState([
    { roleId: 'exp2_wyvern', revealed: true, location: 'lobby', woundsTaken: 11, equipped: ['ev-01', 'ev-02', 'ev-03'] }, // 3/14 HP
    { roleId: 'suong-an-danh', revealed: true, location: 'lobby', woundsTaken: 11 }, // 2 HP
    { roleId: 'gac-ky-thuat', revealed: true, location: 'corridor' },
    { roleId: 'gac-radio', revealed: true, location: 'corridor' },
  ], 3003);
  applyPlayerGameAction(sShadow, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  assert.equal(sShadow.players.p2.alive, false);
  assert.equal(sShadow.players.p1.hp, 14, 'Wyvern killing Shadow must heal FULL (3 -> 14)');
  assert.equal(sShadow.players.p1.woundsTaken, 0);

  // 4. Non-attack kill (location corridor 9 / ev_vampire_bat / eq_flare) -> NO Wyvern heal!
  const sLocKill = makeControlledExpandedState([
    { roleId: 'exp2_wyvern', revealed: true, location: 'corridor', woundsTaken: 8 }, // 6/14 HP
    { roleId: 'gac-radio', revealed: true, location: 'lobby', woundsTaken: 11 }, // 1 HP
    { roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
    { roleId: 'suong-an-danh', revealed: true, location: 'radio' },
  ], 3004);
  sLocKill.turnPhase = 'LOCATION_ACTION';
  applyPlayerGameAction(sLocKill, 'p1', { type: 'USE_LOC_POWER', targetPlayerId: 'p2', mode: 'damage' }, now);
  assert.equal(sLocKill.players.p2.alive, false);
  assert.equal(sLocKill.players.p1.hp, 6, 'Wyvern must NOT heal from location damage kill');

  // 5. Hidden Wyvern killing by attack -> NO heal!
  const sHidden = makeControlledExpandedState([
    { roleId: 'exp2_wyvern', revealed: false, location: 'lobby', woundsTaken: 8, equipped: ['ev-01', 'ev-02', 'ev-03'] },
    { roleId: 'gac-radio', revealed: true, location: 'lobby', woundsTaken: 10 },
    { roleId: 'gac-ky-thuat', revealed: true, location: 'corridor' },
    { roleId: 'suong-an-danh', revealed: true, location: 'corridor' },
  ], 3005);
  applyPlayerGameAction(sHidden, 'p1', { type: 'ATTACK', targetPlayerId: 'p2' }, now);
  assert.equal(sHidden.players.p2.alive, false);
  assert.equal(sHidden.players.p1.hp, 6, 'Hidden Wyvern must NOT heal');
});

// ===========================================================================
// 6. REAL MULTIPLAYER DURABLE OBJECT TESTS (4P + Spectator & 8P)
// ===========================================================================

test('P2A-6 — Real DO Multiplayer: prod gate, 4P+Spectator & 8P starter-four, F5 reconnect, hibernation, duplicate requestId & alarm timeout', async () => {
  // Part A: Production-like DO (NO ALLOW_EXPERIMENTAL_RULESETS) MUST reject starter-four
  const prodServer = await startStandaloneBoardGameTestServer(0);
  try {
    const resProd = await fetch(`${prodServer.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-1', hostName: 'HostProd', rulesetId: 'starter-four' }),
    });
    assert.equal(resProd.status, 400);
    const prodData = await resProd.json();
    assert.equal(prodData.code, 'RULESET_UNAVAILABLE');
  } finally {
    await prodServer.close();
  }

  // Part B: Experimental DO (ALLOW_EXPERIMENTAL_RULESETS='1') runs real 4P + Spectator & 8P matches
  const expServer = await startStandaloneBoardGameTestServer(0, {
    ALLOW_EXPERIMENTAL_RULESETS: '1',
    CHOICE_TIMEOUT_OVERRIDE_MS: '600',
  });
  try {
    // --- 4P + Spectator Match ---
    const createRes = await fetch(`${expServer.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-1', hostName: 'P2AHost', rulesetId: 'starter-four' }),
    });
    assert.equal(createRes.status, 201);
    const { matchId, inviteCode } = await createRes.json();

    const clients = [];
    const tokens = [];
    for (let i = 0; i < 4; i++) {
      const c = await openBgClient(expServer.wsBaseUrl, matchId);
      clients.push(c);
      c.send({
        type: 'BG_JOIN',
        matchId,
        inviteCode,
        displayName: `Player${i + 1}`,
        preferredSeatIndex: i,
        requestId: `join_${i}`,
      });
      const auth = await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
      tokens.push({ playerId: auth.playerId, token: auth.reconnectToken });
      await c.nextMsg((m) => m.type === 'BG_STATE_SYNC');
      if (i > 0) {
        c.send({ type: 'BG_SET_READY', ready: true, requestId: `ready_${i}` });
        await c.nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === `ready_${i}`);
      }
    }

    // Add Spectator
    const spec = await openBgClient(expServer.wsBaseUrl, matchId);
    spec.send({
      type: 'BG_JOIN',
      matchId,
      inviteCode,
      displayName: 'SpectatorP2A',
      asSpectator: true,
      requestId: 'join_spec',
    });
    await spec.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    await spec.nextMsg((m) => m.type === 'BG_STATE_SYNC');

    // Start match on starter-four
    clients[0].send({ type: 'BG_START_MATCH', requestId: 'start_p2a' });
    await clients[0].nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING');
    const specSync = await spec.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING');

    assert.equal(specSync.rulesetId, 'starter-four');
    assert.equal(specSync.privateView, null, 'Spectator MUST receive privateView === null');
    for (const p of specSync.publicGame.players) {
      assert.equal(p.revealedRoleId, null, 'Hidden roles must not leak to Spectator');
      assert.equal(p.revealedFaction, null);
      assert.equal(p.revealedMaxHp, null);
    }

    // Inject deterministic Fiona (p1) vs hidden Wendigo (p3) scenario directly inside DO SQLite to test
    // REAL WebSocket RESOLVE_CHOICE, F5 Reconnect, DO Hibernation, Duplicate requestId & Timeout Alarm!
    const container = expServer.containers.get(matchId);
    const sql = container.ctx.storage.sql;
    const row = sql.exec('SELECT game_state_json, revision FROM matches WHERE match_id = ?', matchId).one();
    const wrapped = JSON.parse(row.game_state_json);
    const es = wrapped.engineState;
    const [id0, id1, id2, id3] = es.turnOrder;

    // Assign p0 = Fiona (revealed, lobby), p1 = Vampire (2 HP, lobby), p2 = Wendigo (hidden, 10/14 HP, radio), p3 = G43 (revealed, corridor)
    const assign = (pid, roleId, revealed, location, woundsTaken, equipped = []) => {
      const p = es.players[pid];
      const d = getRoleDesign(roleId);
      p.roleId = roleId;
      p.faction = d.faction;
      p.maxHp = d.maxHp;
      p.woundsTaken = woundsTaken;
      p.hp = d.maxHp - woundsTaken;
      p.revealed = revealed;
      p.alive = true;
      p.location = location;
      p.equipped = equipped;
      p.hand = [];
    };
    es.clusterPairs = [
      { clusterId: 'north', locationIds: ['radio', 'breaker'] },
      { clusterId: 'central', locationIds: ['lobby', 'canteen'] },
      { clusterId: 'south', locationIds: ['corridor', 'court'] },
    ];
    assign(id0, 'exp2_fiona', true, 'lobby', 0, ['ev-01', 'ev-02', 'ev-03', 'ev-04']); // 1d4+3 >= 4 dmg
    assign(id1, 'suong-an-danh', true, 'lobby', 11, []); // 2 HP left
    assign(id2, 'exp1_wendigo', false, 'radio', 4, []); // 10/14 HP, hidden
    assign(id3, 'exp2_g43', true, 'corridor', 0, []);
    es.activePlayerId = id0;
    es.turnPhase = 'MAIN_ACTION';
    sql.exec('UPDATE matches SET game_state_json = ? WHERE match_id = ?', JSON.stringify(wrapped), matchId);

    // Sync Fiona
    const revBeforeAtk = row.revision;
    const fionaClient = clients[0];
    const wendigoClient = clients[2];

    // Step 1: Fiona attacks Vampire -> opens fiona_attack_roll pendingChoice
    const fionaInboxMark = fionaClient.inbox.length;
    fionaClient.send({
      type: 'BG_GAME_ACTION',
      requestId: 'fiona_atk_1',
      expectedRevision: revBeforeAtk,
      action: { type: 'ATTACK', targetPlayerId: id1 },
    });
    const fionaChoiceSync = await fionaClient.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.privateView?.pendingChoice?.kind === 'fiona_attack_roll',
      4000,
      fionaInboxMark,
    );
    const fionaChoiceId = fionaChoiceSync.privateView.pendingChoice.choiceId;
    const revAfterFionaChoice = fionaChoiceSync.revision;
    assert.equal(fionaChoiceSync.privateView.pendingChoice.options.length, 2);

    // Step 2: Simulate DO Hibernation + F5 Reconnect for Fiona mid-choice!
    const hibRes = await fetch(`${expServer.httpBaseUrl}/__bg_hibernate?matchId=${encodeURIComponent(matchId)}`);
    assert.equal(hibRes.status, 200);
    fionaClient.close();

    const fionaReconnected = await openBgClient(expServer.wsBaseUrl, matchId);
    fionaReconnected.send({
      type: 'BG_JOIN',
      matchId,
      inviteCode,
      displayName: 'Player1',
      reconnectToken: tokens[0].token,
      requestId: 'rejoin_fiona',
    });
    const fionaRestoredSync = await fionaReconnected.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.privateView?.pendingChoice?.choiceId === fionaChoiceId,
    );
    assert.deepEqual(
      fionaRestoredSync.privateView.pendingChoice.options,
      fionaChoiceSync.privateView.pendingChoice.options,
      'F5 reconnect + hibernation MUST restore exact same Fiona dice options without re-rolling RNG',
    );

    // Step 3: Fiona picks roll_0 -> kills Vampire -> triggers hidden Wendigo secret choice!
    const wendigoInboxMark = wendigoClient.inbox.length;
    const specInboxMark = spec.inbox.length;
    const revAfterReconnect = fionaRestoredSync.revision;
    fionaReconnected.send({
      type: 'BG_GAME_ACTION',
      requestId: 'fiona_pick_0',
      expectedRevision: revAfterReconnect,
      action: { type: 'RESOLVE_CHOICE', choiceId: fionaChoiceId, optionId: 'roll_0' },
    });
    const ackPick = await fionaReconnected.nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'fiona_pick_0',
    );
    assert.equal(ackPick.ok, true);

    // Duplicate requestId retry MUST be idempotent (same revision, no double execution)
    fionaReconnected.send({
      type: 'BG_GAME_ACTION',
      requestId: 'fiona_pick_0',
      expectedRevision: revAfterReconnect,
      action: { type: 'RESOLVE_CHOICE', choiceId: fionaChoiceId, optionId: 'roll_0' },
    });
    const dupAck = await fionaReconnected.nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'fiona_pick_0',
      4000,
      fionaReconnected.inbox.indexOf(ackPick) + 1,
    );
    assert.equal(dupAck.ok, true);
    assert.equal(dupAck.revision, ackPick.revision);

    // Hidden Wendigo receives secret pendingChoice; Spectator & Fiona see ZERO owner/kind leak!
    const wendigoSync = await wendigoClient.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.privateView?.pendingChoice?.kind === 'wendigo_reveal_heal',
      4000,
      wendigoInboxMark,
    );
    const specDuringSecret = await spec.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.publicGame?.pendingChoice?.isSecret === true,
      4000,
      specInboxMark,
    );
    assert.equal(specDuringSecret.privateView, null);
    assert.equal(specDuringSecret.publicGame.pendingChoice.ownerPlayerId, null);
    assert.equal(specDuringSecret.publicGame.pendingChoice.kind, null);
    assert.ok(wendigoSync.privateView.pendingChoice.choiceId);

    // Step 4: Trigger alarm after Wendigo choice timeout -> resolves cleanly with 'decline' (no stall, no secret leak!)
    await new Promise((r) => setTimeout(r, 650));
    const afterAlarmMark = wendigoClient.inbox.length;
    const alarmRes = await fetch(
      `${expServer.httpBaseUrl}/__bg_trigger_alarm?matchId=${encodeURIComponent(matchId)}`,
    );
    assert.equal(alarmRes.status, 200);
    const postAlarmSync = await wendigoClient.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && !m.publicGame?.pendingChoice,
      4000,
      afterAlarmMark,
    );
    assert.equal(postAlarmSync.privateView.revealed, false, 'Timeout fallback must keep Wendigo hidden');
    assert.equal(postAlarmSync.privateView.hp, 10, 'Timeout fallback must not heal Wendigo');
    assert.notEqual(postAlarmSync.publicGame.activePlayerId, id0, 'Match must advance cleanly without deadlock');

    fionaReconnected.close();
    spec.close();
    for (const c of clients) c.close();

    // --- 8P Match on starter-four ---
    const create8Res = await fetch(`${expServer.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-2', hostName: 'Host8P', rulesetId: 'starter-four' }),
    });
    assert.equal(create8Res.status, 201);
    const m8 = await create8Res.json();
    const clients8 = [];
    for (let i = 0; i < 8; i++) {
      const c = await openBgClient(expServer.wsBaseUrl, m8.matchId);
      clients8.push(c);
      c.send({
        type: 'BG_JOIN',
        matchId: m8.matchId,
        inviteCode: m8.inviteCode,
        displayName: `SV8_${i + 1}`,
        preferredSeatIndex: i,
        requestId: `j8_${i}`,
      });
      await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
      await c.nextMsg((m) => m.type === 'BG_STATE_SYNC');
      if (i > 0) {
        c.send({ type: 'BG_SET_READY', ready: true, requestId: `r8_${i}` });
        await c.nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === `r8_${i}`);
      }
    }
    clients8[0].send({ type: 'BG_START_MATCH', requestId: 'start_8p_p2a' });
    const syncs8 = await Promise.all(
      clients8.map((c) => c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING')),
    );
    const dealtRoles = syncs8.map((s) => s.privateView.roleId);
    assert.equal(new Set(dealtRoles).size, 8, '8P starter-four must deal 8 strictly unique roles');
    const factionCounts = { 'lantern-guard': 0, 'mist-order': 0, wanderer: 0 };
    for (const s of syncs8) factionCounts[s.privateView.faction] += 1;
    assert.deepEqual(factionCounts, { 'lantern-guard': 3, 'mist-order': 3, wanderer: 2 });
    for (const c of clients8) c.close();
  } finally {
    await expServer.close();
  }
});
