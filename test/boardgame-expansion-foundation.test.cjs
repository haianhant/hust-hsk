/**
 * test/boardgame-expansion-foundation.test.cjs — Phase 1 Foundation Tests
 *
 * Covers ALL required Phase 1 test suites:
 *  A. Registry Tests:
 *     - Character lookup (66 total: 10 Classic + 56 Expansion)
 *     - Unique IDs & duplicate ID rejection
 *     - Ruleset filtering (classic / expansion-1 / expansion-2 / full-expansion)
 *     - Incomplete character rejection (unverified / not-implemented / null skillImpl/victoryImpl)
 *     - Invalid ruleset rejection
 *     - 1-to-1 sync with docs/boardgame-expansion/character-catalog.json
 *  B. Engine Tests:
 *     - Deterministic role distribution (4–8P exact faction split, zero duplicates)
 *     - Bit-for-bit Classic RNG snapshot equivalence across 25 pre-refactor baselines
 *     - Skill trigger priority & seat ordering, deterministic RNG, oncePerMatch/cooldown
 *     - Event recursion depth, infinite-loop protection, atomic rollback, idempotent eventKey
 *     - Victory condition dispatch across all 7 archetypes + cycle guard + Classic equivalence
 *  C. Multiplayer Durable Object Tests:
 *     - Real 4–8P match with Spectator P0 privacy (privateView === null, zero secret leaks)
 *     - Host-only BG_SET_RULESET validation & server rejection of unsupported/invalid rulesets
 *     - Unsupported ruleset rejection across HTTP createMatch, BG_SET_RULESET, and BG_START_MATCH
 *     - F5/Reconnect token restoration preserving private role without replay
 *     - Idempotent duplicate requestId handling (never double-applying action)
 *     - Backward compatibility loading pre-Phase-1 v4 SQLite state without rulesetId/catalogVersion
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { WebSocket } = require('./ws-shim/mini-ws');
const {
  startStandaloneBoardGameTestServer,
} = require('./ws-shim/boardgame-do-harness.cjs');

const {
  BOARD_GAME_CATALOG_VERSION,
  BOARD_GAME_DEFAULT_RULESET_ID,
  BOARD_GAME_RULESET_VERSION,
  validateBoardGameClientMessage,
} = require('../shared/contracts/boardgame.ts');

const {
  BoardGameRulesetError,
  DEFAULT_CHARACTER_REGISTRY,
  DEFAULT_RULESET_DEFINITIONS,
  DEFAULT_RULESET_REGISTRY,
  EXPANSION_CHARACTER_CATALOG,
  ROLES_CATALOG,
  VICTORY_ARCHETYPES,
  createCharacterRegistry,
  createInitialGameState,
  createRulesetRegistry,
  createSkillEngine,
  createVictoryEngine,
  evaluateVictory,
  evaluateVictoryWithEngine,
  getRoleDistribution,
  isCharacterPlayable,
} = require('../features/boardgame/domain/index.ts');

// Pre-Phase-1 bit-for-bit SHA-256 fingerprints captured directly from commit ce3b8c7
const PRE_PHASE1_CLASSIC_RNG_HASHES = {
  '4:1': 'aa23e65cac354706',
  '4:42': '62493216481779a4',
  '4:1337': '085ccb9204f10581',
  '4:202611': 'c140d2d1d36c3191',
  '4:999999': '70cf1f0faf746757',
  '5:1': 'd4edd68609fc3d9f',
  '5:42': '38e461dd4929a553',
  '5:1337': 'd7d86e3c919cc002',
  '5:202611': '9ce9bd1eb10eddf0',
  '5:999999': 'fc30e23933af0536',
  '6:1': 'ccde5a6b8f2134fa',
  '6:42': '5a1eb8eb082b17ba',
  '6:1337': '2e43636c14fcf151',
  '6:202611': '7684ccf90c9e740d',
  '6:999999': 'f228d8fa241b99fc',
  '7:1': 'ec1742bc587b737b',
  '7:42': '3fe4d1e951fc331e',
  '7:1337': '376c8a30a1935d50',
  '7:202611': '2f27e3b79bd62eda',
  '7:999999': 'bdc7f9ed2bdf2b01',
  '8:1': '3c534a119fb64bfc',
  '8:42': '0f52263cf62e5f97',
  '8:1337': '8ee856aaa5287e0c',
  '8:202611': '1565259b62d1e641',
  '8:999999': 'd72414ffe1815f70',
};

function makePlayers(count) {
  return Array.from({ length: count }, (_, i) => ({
    playerId: `p${i + 1}`,
    displayName: `SV ${i + 1}`,
    seatIndex: i,
    appearance: {},
    connected: true,
  }));
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
// A. REGISTRY TESTS
// ===========================================================================

test('A1 — CharacterRegistry lookup, unique 66 IDs, and JSON catalog 1-to-1 sync', () => {
  const all = DEFAULT_CHARACTER_REGISTRY.listAll();
  assert.equal(all.length, 66, 'Expected 10 Classic + 56 Expansion = 66 characters');

  const ids = new Set(all.map((c) => c.id));
  assert.equal(ids.size, 66, 'All 66 character IDs must be strictly unique');

  // Verify Classic 10 lookup and playability
  for (const role of ROLES_CATALOG) {
    const entry = DEFAULT_CHARACTER_REGISTRY.get(role.id);
    assert.ok(entry, `Missing Classic role ${role.id}`);
    assert.equal(entry.metadata.expansionId, 'classic');
    assert.equal(isCharacterPlayable(entry), true, `Classic role ${role.id} must be playable`);
    assert.ok(entry.skillImpl !== null);
    assert.ok(entry.victoryImpl !== null);
  }

  // Verify Expansion 56 lookup: implemented Phase 2 roles satisfy playability gate,
  // while all remaining unimplemented roles MUST stay coming-soon / null / non-playable.
  const jsonPath = path.resolve(__dirname, '../docs/boardgame-expansion/character-catalog.json');
  const jsonCatalog = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.equal(jsonCatalog.characters.length, 56);
  assert.deepEqual(EXPANSION_CHARACTER_CATALOG, jsonCatalog.characters);

  let implementedExpCount = 0;
  for (const rec of jsonCatalog.characters) {
    const entry = DEFAULT_CHARACTER_REGISTRY.get(rec.id);
    assert.ok(entry, `Missing expansion role ${rec.id}`);
    assert.equal(entry.metadata.sourceName, rec.sourceName);
    assert.equal(entry.metadata.maxHp, rec.maxHp);
    if (rec.implementationStatus === 'implemented') {
      implementedExpCount += 1;
      assert.equal(entry.availability, 'available');
      assert.ok(entry.skillImpl !== null, `Implemented role ${rec.id} must have skillImpl`);
      assert.ok(entry.victoryImpl !== null, `Implemented role ${rec.id} must have victoryImpl`);
      assert.equal(
        isCharacterPlayable(entry, { allowExperimentalHouseRules: rec.rulesStatus === 'house-rule-approved' }),
        true,
        `Implemented role ${rec.id} must satisfy playability gate`,
      );
    } else {
      assert.equal(entry.availability, 'coming-soon');
      assert.equal(entry.skillImpl, null, `Unimplemented role ${rec.id} must not have executable skillImpl`);
      assert.equal(entry.victoryImpl, null, `Unimplemented role ${rec.id} must not have executable victoryImpl`);
      assert.equal(isCharacterPlayable(entry), false, `Unimplemented role ${rec.id} MUST NOT be playable`);
    }
  }
  assert.ok(implementedExpCount <= 56, 'Total implemented expansion roles must never exceed catalog size (56)');

  assert.equal(DEFAULT_CHARACTER_REGISTRY.get('nonexistent_role'), null);
});

test('A2 — CharacterRegistry rejects duplicate IDs and metadata mismatch', () => {
  const sample = DEFAULT_CHARACTER_REGISTRY.get('gac-ky-thuat');
  assert.ok(sample);
  assert.throws(
    () => createCharacterRegistry([sample, sample]),
    /duplicate character id/i,
  );
  assert.throws(
    () =>
      createCharacterRegistry([
        {
          ...sample,
          id: 'custom_id_mismatch',
        },
      ]),
    /does not match metadata\.id/i,
  );
});

test('A3 — RulesetRegistry filtering, incomplete character rejection, and invalid ruleset rejection', () => {
  assert.equal(DEFAULT_RULESET_REGISTRY.listRulesets().length, 4);

  // Catalog counts by ruleset
  assert.equal(DEFAULT_RULESET_REGISTRY.listCatalogCharactersForRuleset('classic').length, 10);
  assert.equal(DEFAULT_RULESET_REGISTRY.listCatalogCharactersForRuleset('expansion-1').length, 36);
  assert.equal(DEFAULT_RULESET_REGISTRY.listCatalogCharactersForRuleset('expansion-2').length, 40);
  assert.equal(DEFAULT_RULESET_REGISTRY.listCatalogCharactersForRuleset('full-expansion').length, 66);

  // Playable counts in Phase 1: ONLY classic has playable characters
  assert.equal(DEFAULT_RULESET_REGISTRY.listPlayableCharactersForRuleset('classic').length, 10);
  assert.equal(DEFAULT_RULESET_REGISTRY.listPlayableCharactersForRuleset('expansion-1').length, 0);
  assert.equal(DEFAULT_RULESET_REGISTRY.listPlayableCharactersForRuleset('expansion-2').length, 0);
  assert.equal(DEFAULT_RULESET_REGISTRY.listPlayableCharactersForRuleset('full-expansion').length, 0);

  // Validation: classic passes for 4..8 players
  for (let n = 4; n <= 8; n++) {
    const res = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch('classic', n);
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.ruleset.id, 'classic');
      assert.equal(res.catalogVersion, BOARD_GAME_CATALOG_VERSION);
    }
  }

  // Disabled / coming-soon rulesets MUST be rejected with RULESET_UNAVAILABLE
  for (const rsId of ['expansion-1', 'expansion-2', 'full-expansion']) {
    const res = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch(rsId, 6);
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.code, 'RULESET_UNAVAILABLE');
  }

  // Invalid / unknown rulesets MUST be rejected with INVALID_RULESET
  for (const bad of ['unknown', '', null, undefined, 123, '__proto__']) {
    const res = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch(bad, 6);
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.code, 'INVALID_RULESET');
  }

  // Incomplete character rejection: even if a ruleset were marked enabledInProduction=true,
  // a single character missing skillImpl / victoryImpl / verified / implemented MUST block it!
  const classicEntries = DEFAULT_CHARACTER_REGISTRY.listByExpansions(['classic']);
  const incompleteEntry = {
    ...DEFAULT_CHARACTER_REGISTRY.get('exp1_wendigo'),
    availability: 'available',
    metadata: {
      ...DEFAULT_CHARACTER_REGISTRY.get('exp1_wendigo').metadata,
      implementationStatus: 'in-progress',
    },
  };
  const customChars = createCharacterRegistry([...classicEntries, incompleteEntry]);
  const customRulesets = createRulesetRegistry(customChars, [
    {
      ...DEFAULT_RULESET_DEFINITIONS[1],
      availability: 'available',
      enabledInProduction: true,
      expectedCharacterCount: 11,
    },
  ]);
  const gateCheck = customRulesets.validateRulesetForMatch('expansion-1', 6);
  assert.equal(gateCheck.ok, false);
  if (!gateCheck.ok) {
    assert.equal(gateCheck.code, 'RULESET_UNAVAILABLE');
    assert.match(gateCheck.error, /chưa hoàn thiện/i);
  }
});

// ===========================================================================
// B. ENGINE TESTS
// ===========================================================================

test('B1 — Deterministic role distribution (4–8P) & bit-for-bit Classic RNG equivalence (25 baselines)', () => {
  for (const [key, expectedHash] of Object.entries(PRE_PHASE1_CLASSIC_RNG_HASHES)) {
    const [nStr, seedStr] = key.split(':');
    const n = Number(nStr);
    const seed = Number(seedStr);
    const players = makePlayers(n);

    const s1 = createInitialGameState({
      matchId: `snap_${n}_${seed}`,
      seed,
      nowMs: 1700000000000,
      players,
    });
    const s2 = createInitialGameState({
      matchId: `snap_${n}_${seed}`,
      seed,
      nowMs: 1700000000000,
      rulesetId: 'classic',
      players,
    });

    assert.equal(s1.rulesetId, 'classic');
    assert.equal(s1.catalogVersion, BOARD_GAME_CATALOG_VERSION);
    assert.deepEqual(s1, s2, `Determinism failed for ${key}`);

    // Unique roles & exact faction distribution
    const roles = s1.turnOrder.map((id) => s1.players[id].roleId);
    assert.equal(new Set(roles).size, n, `Duplicate role detected in ${key}`);

    const split = getRoleDistribution(n);
    const guardCount = s1.turnOrder.filter((id) => s1.players[id].faction === 'lantern-guard').length;
    const shadowCount = s1.turnOrder.filter((id) => s1.players[id].faction === 'mist-order').length;
    const wandererCount = s1.turnOrder.filter((id) => s1.players[id].faction === 'wanderer').length;
    assert.equal(guardCount, split.lanternGuard);
    assert.equal(shadowCount, split.mistOrder);
    assert.equal(wandererCount, split.wanderer);

    // Bit-for-bit match against pre-Phase-1 commit ce3b8c7
    const payload = JSON.stringify({
      rngState: s1.rngState,
      roles,
      locs: s1.turnOrder.map((id) => s1.players[id].location),
      clusters: s1.clusterPairs.map((c) => c.locationIds),
      invTop5: s1.decks.investigation.slice(0, 5),
      eqTop5: s1.decks.equipment.slice(0, 5),
      evTop5: s1.decks.event.slice(0, 5),
    });
    const actualHash = crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
    assert.equal(actualHash, expectedHash, `Classic RNG drift detected at ${key}!`);
  }

  // Attempting to initialize match state with unsupported/invalid ruleset MUST throw
  for (const blocked of ['expansion-1', 'expansion-2', 'full-expansion']) {
    assert.throws(
      () =>
        createInitialGameState({
          matchId: 'blocked_test',
          seed: 42,
          nowMs: 1700000000000,
          rulesetId: blocked,
          players: makePlayers(5),
        }),
      (err) => err instanceof BoardGameRulesetError && err.code === 'RULESET_UNAVAILABLE',
    );
  }
  assert.throws(
    () =>
      createInitialGameState({
        matchId: 'invalid_test',
        seed: 42,
        nowMs: 1700000000000,
        rulesetId: 'totally-fake',
        players: makePlayers(5),
      }),
    (err) => err instanceof BoardGameRulesetError && err.code === 'INVALID_RULESET',
  );
});

test('B2 — SkillEngine trigger priority, seat ordering, deterministic RNG, oncePerMatch & cooldown', () => {
  const state = createInitialGameState({
    matchId: 'skill_order_test',
    seed: 1337,
    nowMs: 1700000000000,
    players: makePlayers(6),
  });
  const p1 = state.players.p1;
  const p2 = state.players.p2;
  const p3 = state.players.p3;
  p1.revealed = true;
  p2.revealed = true;
  p3.revealed = true;
  state.activePlayerId = p2.playerId; // Active seat = p2 -> seat distance: p2=0, p3=1, p1=5

  const engine = createSkillEngine();
  const orderLog = [];

  engine.registerHandler({
    id: 'h_low_prio_p2',
    roleId: p2.roleId,
    trigger: 'ON_TURN_START',
    priority: 20,
    oncePerMatch: true,
    execute(ctx) {
      const roll = ctx.rng.nextInt(1, 6);
      orderLog.push(`p2:prio20:r${roll}`);
      return { applied: true, note: `roll=${roll}` };
    },
  });
  engine.registerHandler({
    id: 'h_high_prio_p1',
    roleId: p1.roleId,
    trigger: 'ON_TURN_START',
    priority: 10,
    cooldownRounds: 2,
    execute() {
      orderLog.push('p1:prio10');
      return { applied: true };
    },
  });
  engine.registerHandler({
    id: 'h_same_prio_p3',
    roleId: p3.roleId,
    trigger: 'ON_TURN_START',
    priority: 10,
    execute() {
      orderLog.push('p3:prio10');
      return { applied: true };
    },
  });

  const res1 = engine.dispatch(state, {
    eventKey: 'turn:1:start',
    trigger: 'ON_TURN_START',
    actorPlayerId: p2.playerId,
    nowMs: 1700000001000,
  });
  assert.equal(res1.ok, true);
  // Same priority 10: p3 (distance 1 from active p2) runs BEFORE p1 (distance 5); then priority 20 (p2)
  assert.equal(orderLog.length, 3);
  assert.equal(orderLog[0], 'p3:prio10');
  assert.equal(orderLog[1], 'p1:prio10');
  assert.match(orderLog[2], /^p2:prio20:r[1-6]$/);
  assert.equal(p2.skillUsedOnce, true, 'oncePerMatch flag must be consumed');
  assert.equal(p1.skillCooldown, 2, 'cooldownRounds must be applied');

  // Re-dispatching with same eventKey MUST be idempotent no-op
  const resDup = engine.dispatch(state, {
    eventKey: 'turn:1:start',
    trigger: 'ON_TURN_START',
    actorPlayerId: p2.playerId,
    nowMs: 1700000001000,
  });
  assert.equal(resDup.ok, true);
  assert.equal(resDup.skippedIdempotent, true);
  assert.equal(orderLog.length, 3);

  // Next eventKey: p2 blocked by oncePerMatch, p1 blocked by cooldown, only p3 runs
  const res2 = engine.dispatch(state, {
    eventKey: 'turn:2:start',
    trigger: 'ON_TURN_START',
    actorPlayerId: p2.playerId,
    nowMs: 1700000002000,
  });
  assert.equal(res2.ok, true);
  assert.equal(res2.trace.length, 1);
  assert.equal(res2.trace[0].handlerId, 'h_same_prio_p3');
});

test('B3 — SkillEngine recursion guard, infinite-loop protection, and atomic rollback', () => {
  // 1. Direct loop detection (A -> B -> A)
  const sLoop = createInitialGameState({
    matchId: 'loop_test',
    seed: 42,
    nowMs: 1700000000000,
    players: makePlayers(4),
  });
  const engLoop = createSkillEngine();
  engLoop.registerHandler({
    id: 'ping',
    roleId: sLoop.players.p1.roleId,
    trigger: 'BEFORE_DAMAGE',
    priority: 10,
    execute(ctx) {
      ctx.emit({
        trigger: 'AFTER_DAMAGE',
        actorPlayerId: ctx.event.actorPlayerId,
        targetPlayerId: ctx.event.targetPlayerId,
      });
      return { applied: true };
    },
  });
  engLoop.registerHandler({
    id: 'pong',
    roleId: sLoop.players.p2.roleId,
    trigger: 'AFTER_DAMAGE',
    priority: 10,
    execute(ctx) {
      ctx.emit({
        trigger: 'BEFORE_DAMAGE',
        actorPlayerId: ctx.event.actorPlayerId,
        targetPlayerId: ctx.event.targetPlayerId,
      });
      return { applied: true };
    },
  });
  const loopRes = engLoop.dispatch(sLoop, {
    trigger: 'BEFORE_DAMAGE',
    actorPlayerId: 'p1',
    targetPlayerId: 'p2',
    nowMs: 1700000001000,
  });
  assert.equal(loopRes.ok, false);
  assert.equal(loopRes.abortedReason, 'LOOP_DETECTED');

  // 2. Max recursion depth protection (distinct targets/events exceeding maxDepth)
  const sDepth = createInitialGameState({
    matchId: 'depth_test',
    seed: 42,
    nowMs: 1700000000000,
    players: makePlayers(4),
  });
  const engDepth = createSkillEngine();
  engDepth.registerHandler({
    id: 'deep_chain',
    roleId: sDepth.players.p1.roleId,
    trigger: 'ON_HEAL',
    priority: 10,
    execute(ctx) {
      ctx.emit({
        trigger: 'ON_HEAL',
        actorPlayerId: `actor_${ctx.depth}`,
        targetPlayerId: `target_${ctx.depth}`,
      });
      return { applied: true };
    },
  });
  const depthRes = engDepth.dispatch(
    sDepth,
    { trigger: 'ON_HEAL', actorPlayerId: 'p1', targetPlayerId: 'p2', nowMs: 1700000001000 },
    { maxDepth: 3 },
  );
  assert.equal(depthRes.ok, false);
  assert.equal(depthRes.abortedReason, 'MAX_RECURSION_DEPTH');

  // 3. Atomic rollback on handler exception
  const sAtom = createInitialGameState({
    matchId: 'atomic_test',
    seed: 42,
    nowMs: 1700000000000,
    players: makePlayers(4),
  });
  const initialHp = sAtom.players.p1.hp;
  const engAtom = createSkillEngine();
  engAtom.registerHandler({
    id: 'step_mutate',
    roleId: sAtom.players.p1.roleId,
    trigger: 'ON_TURN_START',
    priority: 1,
    execute(ctx) {
      ctx.owner.hp -= 5;
      return { applied: true };
    },
  });
  engAtom.registerHandler({
    id: 'step_throw',
    roleId: sAtom.players.p2.roleId,
    trigger: 'ON_TURN_START',
    priority: 2,
    execute() {
      throw new Error('Simulated crash mid-resolution');
    },
  });
  const atomRes = engAtom.dispatch(sAtom, {
    trigger: 'ON_TURN_START',
    actorPlayerId: 'p1',
    nowMs: 1700000001000,
  });
  assert.equal(atomRes.ok, false);
  assert.equal(atomRes.rolledBack, true);
  assert.equal(sAtom.players.p1.hp, initialHp, 'Atomic rollback must restore pre-dispatch HP');
});

test('B4 — VictoryEngine 7 archetypes, copied-victory cycle detection, and Classic 100% equivalence', () => {
  assert.equal(VICTORY_ARCHETYPES.length, 7);

  // 1. Classic equivalence across diverse victory scenarios
  const base = createInitialGameState({
    matchId: 'vic_equiv',
    seed: 202611,
    nowMs: 1700000000000,
    players: makePlayers(7),
  });
  assert.deepEqual(evaluateVictoryWithEngine(base), evaluateVictory(base));

  // Hunters win (all shadows dead)
  const sHunters = structuredClone(base);
  for (const p of Object.values(sHunters.players)) {
    if (p.faction === 'mist-order') p.alive = false;
  }
  assert.deepEqual(evaluateVictoryWithEngine(sHunters), evaluateVictory(sHunters));
  assert.equal(evaluateVictoryWithEngine(sHunters).winnerFaction, 'lantern-guard');

  // Shadows win via 3 wanderers dead
  const sShadows3N = structuredClone(base);
  for (const p of Object.values(sShadows3N.players)) {
    if (p.faction === 'wanderer') p.alive = false;
  }
  assert.deepEqual(evaluateVictoryWithEngine(sShadows3N), evaluateVictory(sShadows3N));
  assert.equal(evaluateVictoryWithEngine(sShadows3N).winnerFaction, 'mist-order');

  // Mutual simultaneous tiebreak
  const sTie = structuredClone(base);
  for (const p of Object.values(sTie.players)) {
    if (p.faction === 'lantern-guard' || p.faction === 'mist-order') p.alive = false;
  }
  assert.deepEqual(evaluateVictoryWithEngine(sTie), evaluateVictory(sTie));

  // MaxRounds fallback
  const sMax = structuredClone(base);
  sMax.round = sMax.maxRounds + 1;
  assert.deepEqual(evaluateVictoryWithEngine(sMax), evaluateVictory(sMax));

  // 2. Pluggable custom evaluators: dynamic-allegiance + shared + copied-victory cycle protection
  const customEngine = createVictoryEngine();
  let detectedCycle = false;

  customEngine.registerEvaluator({
    id: 'test:dynamic-shadow-win',
    archetype: 'dynamic-allegiance',
    priority: 10,
    timing: 'immediate',
    evaluate(ctx) {
      const huntersAlive = ctx.alivePlayers.filter(
        (p) => ctx.getEffectiveFaction(p) === 'lantern-guard',
      ).length;
      if (huntersAlive > 0) return null;
      const shadows = ctx.allPlayers.filter((p) => ctx.getEffectiveFaction(p) === 'mist-order');
      return {
        evaluatorId: 'test:dynamic-shadow-win',
        archetype: 'dynamic-allegiance',
        priority: 10,
        timing: 'immediate',
        winnerFaction: 'mist-order',
        winnerLabel: 'Dynamic Shadow Victory',
        winnerPlayerIds: shadows.map((p) => p.playerId),
        winReason: 'Dynamic allegiance evaluator triggered.',
        triggersMatchEnd: true,
      };
    },
  });

  customEngine.registerEvaluator({
    id: 'test:copied-cycle-guard',
    archetype: 'copied-victory',
    priority: 20,
    timing: 'end-of-match',
    evaluate(ctx) {
      // Simulate Bethany(p1) -> Diana(p2) -> Bethany(p1) cycle
      const res = ctx.resolveLinkedWinner('p1', 'p2', (target, visited) => {
        const inner = ctx.resolveLinkedWinner(target.playerId, 'p1', () => true, visited);
        if (inner.cycleDetected) detectedCycle = true;
        return inner.ok;
      });
      assert.equal(res.ok, false);
      return null;
    },
  });

  const sDyn = structuredClone(base);
  const wanderer = Object.values(sDyn.players).find((p) => p.faction === 'wanderer');
  assert.ok(wanderer);
  for (const p of Object.values(sDyn.players)) {
    if (p.faction === 'lantern-guard') p.alive = false;
  }
  const dynEval = customEngine.evaluate(sDyn, {
    effectiveFactionOverrides: { [wanderer.playerId]: 'mist-order' },
  });
  assert.equal(dynEval.finished, true);
  assert.equal(detectedCycle, true, 'Copied-victory graph cycle guard must detect A -> B -> A');
  assert.ok(
    dynEval.winnerPlayerIds.includes(wanderer.playerId),
    'Dynamic-allegiance wanderer converted to Shadow must be included in winners',
  );
});

// ===========================================================================
// C. MULTIPLAYER DURABLE OBJECT TESTS (Real SQLite + WebSocket)
// ===========================================================================

test('C1 — Multiplayer DO: ruleset validation, host-only BG_SET_RULESET, spectator privacy, F5 reconnect, idempotency', async () => {
  const srv = await startStandaloneBoardGameTestServer(0);
  const openClients = [];

  try {
    // 1. HTTP createMatch rejects unsupported & invalid rulesets
    const badExpRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-1', hostName: 'Host', rulesetId: 'expansion-1' }),
    });
    assert.equal(badExpRes.status, 400);
    const badExpBody = await badExpRes.json();
    assert.equal(badExpBody.ok, false);
    assert.equal(badExpBody.code, 'RULESET_UNAVAILABLE');

    const badFakeRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-1', hostName: 'Host', rulesetId: 'custom-cheat' }),
    });
    assert.equal(badFakeRes.status, 400);
    const badFakeBody = await badFakeRes.json();
    assert.equal(badFakeBody.ok, false);
    assert.equal(badFakeBody.code, 'INVALID_RULESET');

    // 2. Create valid Classic match for 5 players + 1 spectator
    const createRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-1', hostName: 'HostSV', rulesetId: 'classic' }),
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.equal(created.ok, true);
    assert.equal(created.rulesetId, 'classic');

    // Join 5 players + 1 spectator
    const players = [];
    for (let i = 0; i < 5; i++) {
      const c = await openBgClient(srv.wsBaseUrl, created.matchId);
      openClients.push(c);
      c.send({
        type: 'BG_JOIN',
        matchId: created.matchId,
        inviteCode: created.inviteCode,
        displayName: `Player${i + 1}`,
        preferredSeatIndex: i,
        requestId: `join_${i}`,
      });
      const auth = await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
      const sync = await c.nextMsg((m) => m.type === 'BG_STATE_SYNC');
      assert.equal(sync.rulesetId, 'classic');
      players.push({ client: c, auth });
    }

    const spectator = await openBgClient(srv.wsBaseUrl, created.matchId);
    openClients.push(spectator);
    spectator.send({
      type: 'BG_JOIN',
      matchId: created.matchId,
      inviteCode: created.inviteCode,
      displayName: 'Spectator1',
      asSpectator: true,
      requestId: 'join_spec',
    });
    await spectator.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    const specLobbySync = await spectator.nextMsg((m) => m.type === 'BG_STATE_SYNC');
    assert.equal(specLobbySync.rulesetId, 'classic');
    assert.equal(specLobbySync.privateView, null);

    // Ready up guests
    for (let i = 1; i < 5; i++) {
      players[i].client.send({ type: 'BG_SET_READY', ready: true, requestId: `rdy_${i}` });
      await players[i].client.nextMsg((m) => m.type === 'BG_STATE_SYNC');
    }

    // 3. Non-host trying BG_SET_RULESET -> NOT_HOST
    const nonHostLen = players[1].client.inbox.length;
    players[1].client.send({
      type: 'BG_SET_RULESET',
      rulesetId: 'classic',
      requestId: 'nonhost_rs',
    });
    const nonHostErr = await players[1].client.nextMsg(
      (m) => m.type === 'BG_ERROR' && m.requestId === 'nonhost_rs',
      4000,
      nonHostLen,
    );
    assert.equal(nonHostErr.code, 'NOT_HOST');

    // 4. Host trying disabled ruleset via BG_SET_RULESET -> RULESET_UNAVAILABLE
    const hostLen1 = players[0].client.inbox.length;
    players[0].client.send({
      type: 'BG_SET_RULESET',
      rulesetId: 'full-expansion',
      requestId: 'host_exp_rs',
    });
    const expErr = await players[0].client.nextMsg(
      (m) => m.type === 'BG_ERROR' && m.requestId === 'host_exp_rs',
      4000,
      hostLen1,
    );
    assert.equal(expErr.code, 'RULESET_UNAVAILABLE');

    // 5. Host trying invalid ruleset string via BG_SET_RULESET -> INVALID_RULESET
    const hostLen2 = players[0].client.inbox.length;
    players[0].client.send({
      type: 'BG_SET_RULESET',
      rulesetId: 'not-a-ruleset',
      requestId: 'host_bad_rs',
    });
    const badRsErr = await players[0].client.nextMsg(
      (m) => m.type === 'BG_ERROR' && m.requestId === 'host_bad_rs',
      4000,
      hostLen2,
    );
    assert.equal(badRsErr.code, 'INVALID_RULESET');

    // 6. Host trying BG_START_MATCH with unsupported ruleset override -> RULESET_UNAVAILABLE
    const hostLen3 = players[0].client.inbox.length;
    players[0].client.send({
      type: 'BG_START_MATCH',
      rulesetId: 'expansion-2',
      requestId: 'start_bad_rs',
    });
    const startExpErr = await players[0].client.nextMsg(
      (m) => m.type === 'BG_ERROR' && m.requestId === 'start_bad_rs',
      4000,
      hostLen3,
    );
    assert.equal(startExpErr.code, 'RULESET_UNAVAILABLE');
    assert.notEqual(players[0].client.getLatestSync().status, 'PLAYING');

    // 7. Start valid Classic match -> verify lock + privacy + spectator isolation
    players[0].client.send({
      type: 'BG_START_MATCH',
      rulesetId: 'classic',
      requestId: 'start_classic',
    });

    const startSyncs = [];
    for (const p of players) {
      const s = await p.client.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING');
      startSyncs.push(s);
    }
    const specPlaySync = await spectator.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING',
    );

    assert.equal(specPlaySync.rulesetId, 'classic');
    assert.equal(specPlaySync.catalogVersion, BOARD_GAME_CATALOG_VERSION);
    assert.equal(specPlaySync.publicGame.rulesetId, 'classic');
    assert.equal(specPlaySync.publicGame.catalogVersion, BOARD_GAME_CATALOG_VERSION);
    assert.equal(specPlaySync.privateView, null, 'Spectator MUST NEVER receive privateView');

    // Verify ZERO hidden role/faction/maxHp/hp leaks in publicGame
    for (const pubPlayer of specPlaySync.publicGame.players) {
      assert.equal(pubPlayer.revealedRoleId, null);
      assert.equal(pubPlayer.revealedFaction, null);
      assert.equal(pubPlayer.revealedMaxHp, null);
    }
    const pubJson = JSON.stringify(specPlaySync.publicGame);
    assert.equal(pubJson.includes('"hp":'), false);
    assert.equal(pubJson.includes('"maxHp":'), false);
    assert.equal(pubJson.includes('"privateClues":'), false);

    // Every player received unique private Classic role
    const assignedRoles = startSyncs.map((s) => s.privateView.roleId);
    assert.equal(new Set(assignedRoles).size, 5);

    // 8. F5 / Reconnect preserves exact private role & state without leaking
    const p2OriginalRole = startSyncs[1].privateView.roleId;
    const p2OriginalHp = startSyncs[1].privateView.hp;
    players[1].client.close();
    const reconnected = await openBgClient(srv.wsBaseUrl, created.matchId);
    openClients.push(reconnected);
    reconnected.send({
      type: 'BG_JOIN',
      matchId: created.matchId,
      inviteCode: created.inviteCode,
      displayName: 'Player2',
      reconnectToken: players[1].auth.reconnectToken,
      requestId: 'f5_reconnect',
    });
    await reconnected.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    const reconSync = await reconnected.nextMsg((m) => m.type === 'BG_STATE_SYNC');
    assert.equal(reconSync.status, 'PLAYING');
    assert.equal(reconSync.rulesetId, 'classic');
    assert.equal(reconSync.privateView.roleId, p2OriginalRole);
    assert.equal(reconSync.privateView.hp, p2OriginalHp);

    // 9. Duplicate requestId idempotency (sending ROLL_DICE twice with same requestId only applies once!)
    const activeId = startSyncs[0].publicGame.activePlayerId;
    const activeEntry = players.find((p) => p.auth.playerId === activeId);
    assert.ok(activeEntry);
    const activeClient = activeEntry.auth.playerId === players[1].auth.playerId ? reconnected : activeEntry.client;
    await activeClient.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision >= reconSync.revision,
    );
    await new Promise((r) => setTimeout(r, 40));
    const revBefore = activeClient.getLatestSync().revision;

    activeClient.send({
      type: 'BG_GAME_ACTION',
      requestId: 'idem_roll_1',
      expectedRevision: revBefore,
      action: { type: 'ROLL_DICE' },
    });
    const ack1 = await activeClient.nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'idem_roll_1');
    assert.equal(ack1.ok, true);
    const syncAfter1 = await activeClient.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision >= ack1.revision,
    );
    const rollId1 = syncAfter1.publicGame.lastDiceRoll?.id;

    // Retry exact same requestId (simulating network retry/reconnect replay)
    await new Promise((r) => setTimeout(r, 40));
    const lenBeforeRetry = activeClient.inbox.length;
    activeClient.send({
      type: 'BG_GAME_ACTION',
      requestId: 'idem_roll_1',
      expectedRevision: revBefore,
      action: { type: 'ROLL_DICE' },
    });
    const ack2 = await activeClient.nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'idem_roll_1',
      4000,
      lenBeforeRetry,
    );
    assert.equal(ack2.ok, true);
    assert.equal(ack2.revision, ack1.revision, 'Duplicate requestId must NOT advance revision');
    assert.equal(
      activeClient.getLatestSync().publicGame.lastDiceRoll?.id,
      rollId1,
      'Duplicate requestId must NOT re-roll dice',
    );
  } finally {
    for (const c of openClients) c.close();
    await srv.close();
  }
});

test('C2 — Contract validator validates BG_SET_RULESET & rejects prototype pollution / unknown keys', () => {
  const ok = validateBoardGameClientMessage({
    type: 'BG_SET_RULESET',
    rulesetId: 'classic',
    requestId: 'rs_1',
  });
  assert.equal(ok.ok, true);

  const badRuleset = validateBoardGameClientMessage({
    type: 'BG_SET_RULESET',
    rulesetId: 'bogus',
    requestId: 'rs_2',
  });
  assert.equal(badRuleset.ok, false);
  if (!badRuleset.ok) assert.equal(badRuleset.code, 'INVALID_RULESET');

  const extraRoleList = validateBoardGameClientMessage({
    type: 'BG_START_MATCH',
    rulesetId: 'classic',
    customRoleIds: ['exp2_g43'],
    requestId: 'rs_3',
  });
  assert.equal(extraRoleList.ok, false, 'Client must NEVER be able to inject customRoleIds');
});

test('C3 — Real 8-player Classic match & pre-Phase-1 v4 live match backward compatibility', async () => {
  const srv = await startStandaloneBoardGameTestServer(0);
  const openClients = [];
  try {
    // 1. 8-player match via real DO
    const createRes = await fetch(`${srv.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'table-2', hostName: 'Host8P' }),
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.equal(created.rulesetId, BOARD_GAME_DEFAULT_RULESET_ID);

    const players = [];
    for (let i = 0; i < 8; i++) {
      const c = await openBgClient(srv.wsBaseUrl, created.matchId);
      openClients.push(c);
      c.send({
        type: 'BG_JOIN',
        matchId: created.matchId,
        inviteCode: created.inviteCode,
        displayName: `SV8P_${i + 1}`,
        preferredSeatIndex: i,
        requestId: `j8_${i}`,
      });
      const auth = await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
      await c.nextMsg((m) => m.type === 'BG_STATE_SYNC');
      players.push({ client: c, auth });
    }
    for (let i = 1; i < 8; i++) {
      players[i].client.send({ type: 'BG_SET_READY', ready: true, requestId: `r8_${i}` });
      await players[i].client.nextMsg((m) => m.type === 'BG_STATE_SYNC');
    }
    players[0].client.send({ type: 'BG_START_MATCH', requestId: 's8_1' });
    const syncs = [];
    for (const p of players) {
      const s = await p.client.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING');
      syncs.push(s);
    }
    const roleIds = syncs.map((s) => s.privateView.roleId);
    const factions = syncs.map((s) => s.privateView.faction);
    assert.equal(new Set(roleIds).size, 8, '8P match must assign 8 unique Classic roles');
    assert.equal(factions.filter((f) => f === 'lantern-guard').length, 3);
    assert.equal(factions.filter((f) => f === 'mist-order').length, 3);
    assert.equal(factions.filter((f) => f === 'wanderer').length, 2);

    // 2. Strip rulesetId & catalogVersion from persisted v4 game_state_json (simulating pre-Phase-1 live match)
    //    and verify reload restores seamlessly without closing/adapting match!
    const roomRecord = srv.containers.get(created.matchId);
    assert.ok(roomRecord, 'Expected DO container for matchId');
    const sql = roomRecord.ctx.storage.sql;
    const row = sql
      .exec('SELECT game_state_json FROM matches WHERE match_id = ?', created.matchId)
      .toArray()[0];
    const parsed = JSON.parse(row.game_state_json);
    assert.equal(parsed.rulesetVersion, BOARD_GAME_RULESET_VERSION);
    delete parsed.engineState.rulesetId;
    delete parsed.engineState.catalogVersion;
    sql.exec(
      'UPDATE matches SET catalog_version = NULL, game_state_json = ? WHERE match_id = ?',
      JSON.stringify(parsed),
      created.matchId,
    );

    const lenBefore = players[0].client.inbox.length;
    players[0].client.send({ type: 'BG_REQUEST_SYNC', requestId: 'compat_sync' });
    const synced = await players[0].client.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC',
      4000,
      lenBefore,
    );
    assert.equal(synced.status, 'PLAYING', 'Pre-Phase-1 live v4 match MUST stay PLAYING');
    assert.equal(synced.rulesetId, 'classic');
    assert.equal(synced.publicGame.rulesetId, 'classic');
    assert.equal(synced.publicGame.catalogVersion, BOARD_GAME_CATALOG_VERSION);
    assert.equal(synced.privateView.roleId, syncs[0].privateView.roleId);
  } finally {
    for (const c of openClients) c.close();
    await srv.close();
  }
});
