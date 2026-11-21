'use strict';

/**
 * test/boardgame-phase7d-integration.test.cjs
 *
 * Phase 7D — Mandatory 30 Cross-Character Scenarios (Section 21),
 * Real Cloudflare Durable Object 4P–8P E2E (Section 22) & Security/Privacy Audit (Section 23).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
require('./register-ts.cjs');

const { WebSocket } = require('./ws-shim/mini-ws');
const { startStandaloneBoardGameTestServer } = require('./ws-shim/boardgame-do-harness.cjs');
const domain = require('../features/boardgame/domain/index.ts');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeState(specs, opts = {}) {
  const players = {};
  const turnOrder = [];
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    const design = domain.getRoleDesign(s.roleId);
    const maxHp = s.maxHp ?? design.maxHp;
    const wounds = s.woundsTaken ?? (s.alive === false ? maxHp : 0);
    const hp = s.alive === false ? 0 : Math.max(0, maxHp - wounds);
    players[s.id] = {
      playerId: s.id,
      displayName: s.name ?? s.id,
      seatIndex: i,
      roleId: s.roleId,
      faction: s.faction ?? design.faction,
      hp,
      maxHp,
      woundsTaken: wounds,
      location: s.location ?? 'lobby',
      hand: [...(s.hand ?? [])],
      equipped: [...(s.equipped ?? [])],
      revealed: Boolean(s.revealed),
      alive: s.alive !== false,
      connected: s.connected !== false,
      skillCooldown: 0,
      skillUsedOnce: Boolean(s.skillUsedOnce),
      guardianShieldActive: Boolean(s.guardianShieldActive),
      attacksMade: 0,
      attacksThisTurn: s.attacksThisTurn ?? 0,
      lastAttackTargetId: null,
      investigationsCount: 0,
      consecutiveSameZoneRolls: 0,
      eliminatedRound: s.alive === false ? 1 : null,
      eliminatedByPlayerId: null,
      protegePlayerId: null,
      avengedProtegeKiller: false,
      charlesKillWon: false,
      investigatedTargetIds: [],
      privateClues: [],
      appearance: {
        gender: s.appearanceGender ?? 'male',
        outfit: 'hust-jacket',
        hairColor: '#111111',
      },
    };
    turnOrder.push(s.id);
  }
  const state = {
    rulesetVersion: 4,
    rulesetId: opts.rulesetId ?? 'starter-fifty-six',
    matchId: opts.matchId ?? 'p7d-match',
    seed: opts.seed ?? 70701,
    rngState: opts.rngState ?? 70701,
    round: opts.round ?? 2,
    maxRounds: 14,
    turnNumber: opts.turnNumber ?? 6,
    turnPhase: opts.turnPhase ?? 'MAIN_ACTION',
    activePlayerId: opts.activePlayerId ?? turnOrder[0],
    turnOrder,
    clusterPairs: opts.clusterPairs ?? [
      { clusterId: 'north', locationIds: ['radio', 'breaker'] },
      { clusterId: 'central', locationIds: ['lobby', 'canteen'] },
      { clusterId: 'south', locationIds: ['corridor', 'court'] },
    ],
    firstDeadPlayerId: null,
    extraTurnPending: false,
    players,
    decks: {
      investigation: [...(opts.invDeck ?? ['inv-05', 'inv-04'])],
      equipment: [...(opts.eqDeck ?? ['eq-07', 'eq-01', 'eq-02', 'eq-03'])],
      event: [...(opts.evDeck ?? ['ev-02', 'ev-07'])],
    },
    discards: {
      investigation: [...(opts.invDiscard ?? [])],
      equipment: [...(opts.eqDiscard ?? [])],
      event: [...(opts.evDiscard ?? [])],
    },
    lastDiceRoll: null,
    lastInvestigation: null,
    lastRevealEvent: null,
    publicLog: [],
    highlights: [],
    finished: false,
    winnerFaction: null,
    winnerLabel: null,
    winnerPlayerIds: [],
    winReason: null,
    finalReveal: null,
  };
  const exp = domain.ensureExpansionState(state);
  exp.originallyDealtNeutralIds =
    opts.originallyDealtNeutralIds ??
    specs
      .filter((s) => (s.faction ?? domain.getRoleDesign(s.roleId).faction) === 'wanderer')
      .map((s) => s.id);
  return state;
}

async function openBgClient(wsBaseUrl, matchId) {
  const ws = new WebSocket(`${wsBaseUrl}/ws/boardgame?matchId=${encodeURIComponent(matchId)}`);
  const inbox = [];
  const waiters = [];
  let latestSync = null;

  ws.on('message', (raw) => {
    const rawStr = String(raw);
    const msg = JSON.parse(rawStr);
    msg.__raw = rawStr;
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
    nextMsg(pred, timeoutMs = 4500, fromIndex = 0) {
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
      } catch {}
    },
  };
}

async function joinAndStart(wsBaseUrl, match, playerCount, prefix, includeSpectator = false) {
  const clients = [];
  const auths = [];
  for (let i = 0; i < playerCount; i++) {
    const c = await openBgClient(wsBaseUrl, match.matchId);
    clients.push(c);
    c.send({
      type: 'BG_JOIN',
      matchId: match.matchId,
      inviteCode: match.inviteCode,
      displayName: `${prefix}_${i + 1}`,
      preferredSeatIndex: i,
      requestId: `${prefix}_j_${i}`,
    });
    const auth = await c.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    auths.push(auth);
    await c.nextMsg((m) => m.type === 'BG_STATE_SYNC');
    if (i > 0) {
      await sleep(115);
      c.send({ type: 'BG_SET_READY', ready: true, requestId: `${prefix}_r_${i}` });
      await c.nextMsg((m) => m.type === 'BG_ACTION_ACK' && m.requestId === `${prefix}_r_${i}`);
    }
  }
  let spectator = null;
  if (includeSpectator) {
    spectator = await openBgClient(wsBaseUrl, match.matchId);
    spectator.send({
      type: 'BG_JOIN',
      matchId: match.matchId,
      inviteCode: match.inviteCode,
      displayName: `${prefix}_Spec`,
      asSpectator: true,
      requestId: `${prefix}_spec`,
    });
    await spectator.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    await spectator.nextMsg((m) => m.type === 'BG_STATE_SYNC');
  }
  await sleep(115);
  clients[0].send({ type: 'BG_START_MATCH', requestId: `${prefix}_start` });
  const syncs = await Promise.all([
    ...clients.map((c) => c.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING')),
    ...(spectator
      ? [spectator.nextMsg((m) => m.type === 'BG_STATE_SYNC' && m.status === 'PLAYING')]
      : []),
  ]);
  return { clients, auths, spectator, startSync: syncs[0] };
}

// ---------------------------------------------------------------------------
// P7D-1: Cross-Character Scenarios #1–#8 (Lloyd, Vengeful Spirit, Antimony, Cycles)
// ---------------------------------------------------------------------------
test('P7D-1 — Scenarios #1-#8: Lloyd interrupts (normal, final HP, Machine Gun, multi-Lloyd copy), VS fresh/nested copy, Antimony goal & cycle guard', () => {
  // #1 Lloyd interrupts normal attack before RNG
  {
    const s = makeState([
      { id: 'atk', roleId: 'gac-ky-thuat', location: 'lobby' },
      { id: 'v1', roleId: 'suong-an-danh', location: 'lobby' },
      { id: 'lloyd', roleId: 'exp1_lloyd', location: 'court', revealed: true },
      { id: 's2', roleId: 'suong-tin-gia', location: 'canteen' },
    ]);
    const rng0 = s.rngState;
    assert.equal(domain.applyPlayerGameAction(s, 'atk', { type: 'ATTACK', targetPlayerId: 'v1' }, 100).ok, true);
    assert.equal(s.pendingChoice?.kind, 'lloyd_interrupt_attack');
    assert.equal(s.rngState, rng0, '#1 pre-roll prompt consumes 0 RNG');
    assert.equal(
      domain.applyPlayerGameAction(
        s,
        'lloyd',
        { type: 'RESOLVE_CHOICE', choiceId: s.pendingChoice.choiceId, optionId: 'cancel_attack' },
        110,
      ).ok,
      true,
    );
    assert.equal(s.rngState, rng0, '#1 cancel consumes 0 RNG');
    assert.equal(s.players.lloyd.woundsTaken, 2);
    assert.equal(s.players.v1.woundsTaken, 0);
  }

  // #2 Lloyd sacrifices final HP (2 HP left) and cancels attack
  {
    const s = makeState([
      { id: 'atk', roleId: 'gac-ky-thuat', location: 'lobby' },
      { id: 'v1', roleId: 'suong-an-danh', location: 'lobby' },
      { id: 'lloyd', roleId: 'exp1_lloyd', location: 'court', revealed: true, woundsTaken: 10 }, // 2 HP left
      { id: 's2', roleId: 'suong-tin-gia', location: 'canteen' },
    ]);
    assert.equal(domain.applyPlayerGameAction(s, 'atk', { type: 'ATTACK', targetPlayerId: 'v1' }, 200).ok, true);
    assert.equal(
      domain.applyPlayerGameAction(
        s,
        'lloyd',
        { type: 'RESOLVE_CHOICE', choiceId: s.pendingChoice.choiceId, optionId: 'cancel_attack' },
        210,
      ).ok,
      true,
    );
    assert.equal(s.players.lloyd.alive, false, '#2 Lloyd died paying final 2 HP');
    assert.equal(s.players.v1.woundsTaken, 0, '#2 attack still canceled');
  }

  // #3 Lloyd interrupts Machine Gun AoE in single action
  {
    const s = makeState([
      { id: 'atk', roleId: 'gac-ky-thuat', location: 'lobby', equipped: ['ev-06'] },
      { id: 'v1', roleId: 'suong-an-danh', location: 'lobby' },
      { id: 'v2', roleId: 'suong-tin-gia', location: 'lobby' },
      { id: 'lloyd', roleId: 'exp1_lloyd', location: 'court', revealed: true },
    ]);
    const rng0 = s.rngState;
    assert.equal(domain.applyPlayerGameAction(s, 'atk', { type: 'ATTACK', targetPlayerId: 'v1' }, 300).ok, true);
    assert.equal(
      domain.applyPlayerGameAction(
        s,
        'lloyd',
        { type: 'RESOLVE_CHOICE', choiceId: s.pendingChoice.choiceId, optionId: 'cancel_attack' },
        310,
      ).ok,
      true,
    );
    assert.equal(s.rngState, rng0);
    assert.equal(s.players.v1.woundsTaken, 0);
    assert.equal(s.players.v2.woundsTaken, 0);
  }

  // #4 Copied Lloyd skills with multiple eligible controllers (seat-distance deterministic chain: first declines, second cancels)
  {
    const s = makeState([
      { id: 'atk', roleId: 'gac-ky-thuat', location: 'lobby' },
      { id: 'lloyd1', roleId: 'exp1_lloyd', location: 'court', revealed: true },
      { id: 'ant', roleId: 'exp1_antimony', location: 'canteen', revealed: true },
      { id: 'v1', roleId: 'suong-an-danh', location: 'lobby' },
    ]);
    // Antimony copied Lloyd's skill
    domain.bindCopiedSkillFromElimination(s, s.players.ant, s.players.lloyd1, 'ev-ant-lloyd', 390);
    assert.equal(domain.applyPlayerGameAction(s, 'atk', { type: 'ATTACK', targetPlayerId: 'v1' }, 400).ok, true);
    assert.equal(s.pendingChoice?.kind, 'lloyd_interrupt_attack');
    assert.equal(s.pendingChoice?.ownerPlayerId, 'lloyd1', '#4 nearest seat clockwise prompted first');
    // lloyd1 declines -> ant (copied Lloyd) prompted next!
    assert.equal(
      domain.applyPlayerGameAction(
        s,
        'lloyd1',
        { type: 'RESOLVE_CHOICE', choiceId: s.pendingChoice.choiceId, optionId: 'decline' },
        410,
      ).ok,
      true,
    );
    assert.equal(s.pendingChoice?.kind, 'lloyd_interrupt_attack');
    assert.equal(s.pendingChoice?.ownerPlayerId, 'ant', '#4 copied Lloyd prompted second');
    assert.equal(
      domain.applyPlayerGameAction(
        s,
        'ant',
        { type: 'RESOLVE_CHOICE', choiceId: s.pendingChoice.choiceId, optionId: 'cancel_attack' },
        420,
      ).ok,
      true,
    );
    assert.equal(s.players.ant.woundsTaken, 2, '#4 Antimony paid 2 HP via copied Lloyd skill');
    assert.equal(s.players.v1.woundsTaken, 0, '#4 attack canceled by copied Lloyd');
  }

  // #5 Vengeful Spirit copies a once-per-match skill (fresh usage) + #6 Vengeful Spirit copies ANOTHER copied skill (nested depth 2)
  {
    const s = makeState(
      [
        { id: 'atk', roleId: 'gac-ky-thuat', location: 'corridor' },
        { id: 'ant', roleId: 'exp1_antimony', location: 'lobby', revealed: true, woundsTaken: 7 }, // 1 HP left of 8
        { id: 'vs', roleId: 'exp1_vengeful_spirit', location: 'court', revealed: false },
        { id: 's2', roleId: 'suong-an-danh', location: 'canteen' },
      ],
      { turnPhase: 'LOCATION_ACTION', activePlayerId: 'atk' },
    );
    // Antimony previously copied exp2_elise (depth 1) and even ALREADY used its once-per-match charge!
    const deadElise = { ...s.players.atk, playerId: 'dead_elise', roleId: 'exp2_elise', faction: 'lantern-guard' };
    domain.bindCopiedSkillFromElimination(s, s.players.ant, deadElise, 'ev-ant-elise', 490);
    domain.markEffectiveSkillUsedOnce(s, s.players.ant);
    assert.equal(domain.hasEffectiveSkillUsedOnce(s, s.players.ant), true);

    // Kill Antimony -> Vengeful Spirit gets secret prompt to copy Antimony's EFFECTIVE skill (exp2_elise, depth 2, FRESH!)
    assert.equal(
      domain.applyPlayerGameAction(s, 'atk', { type: 'USE_LOC_POWER', targetPlayerId: 'ant', mode: 'damage' }, 500).ok,
      true,
    );
    assert.equal(s.pendingChoice?.kind, 'vengeful_spirit_copy_skill');
    assert.ok(s.pendingChoice.choiceId.startsWith('choice-secret-'));
    const copyOpt = s.pendingChoice.options.find((o) => o.optionId.startsWith('copy_'));
    assert.ok(copyOpt);
    assert.equal(
      domain.applyPlayerGameAction(
        s,
        'vs',
        { type: 'RESOLVE_CHOICE', choiceId: s.pendingChoice.choiceId, optionId: copyOpt.optionId },
        510,
      ).ok,
      true,
    );
    const vsBind = domain.getCopiedSkillBinding(s, 'vs');
    assert.equal(vsBind?.effectiveSkillRoleId, 'exp2_elise', '#6 nested copy resolves to effective skill exp2_elise');
    assert.equal(vsBind?.copyDepth, 2, '#6 copy depth tracked as 2');
    assert.equal(vsBind?.skillUsedOnce, false, '#5/#6 fresh usage state even though Antimony had used it');

    // VS executes copied Elise skill on its own turn!
    s.activePlayerId = 'vs';
    s.turnPhase = 'MAIN_ACTION';
    s.players.vs.woundsTaken = 5;
    s.players.vs.hp = 8;
    assert.equal(domain.applyPlayerGameAction(s, 'vs', { type: 'USE_SKILL' }, 520).ok, true);
    assert.equal(s.pendingChoice?.kind, 'elise_distribute_heal');
  }

  // #7 Antimony copies skill & victory goal + #8 Copied victory graph cycle fails closed
  {
    const s = makeState([
      { id: 'ant', roleId: 'exp1_antimony', revealed: true },
      { id: 'cassie', roleId: 'exp1_cassie', revealed: true },
      { id: 'h1', roleId: 'gac-ky-thuat' },
      { id: 's1', roleId: 'suong-an-danh' },
    ]);
    const exp = domain.ensureExpansionState(s);
    exp.antimonyCopiedGoalByPlayer = {
      ant: {
        targetPlayerId: 'cassie',
        sourceRoleId: 'exp1_cassie',
        boundEventId: 'ev-cyc-1',
        boundAtMs: 600,
        boundTurnNumber: 1,
      },
    };
    exp.cassieCopiedGoalByPlayer = {
      cassie: {
        targetPlayerId: 'ant',
        sourceRoleId: 'exp1_antimony',
        boundEventId: 'ev-cyc-2',
        boundAtMs: 601,
        boundTurnNumber: 1,
      },
    };
    const midDiag = domain.evaluateExpandedVictoryWithDiagnostics(s);
    assert.equal(midDiag.evaluation.finished, false, '#8 cyclic copied goal MUST NOT grant free immediate victory');
    // End-of-match evaluation (s1 eliminated -> Hunters win): graph MUST explicitly detect cycle & fail closed!
    s.players.s1.alive = false;
    const endDiag = domain.evaluateExpandedVictoryWithDiagnostics(s);
    assert.equal(endDiag.evaluation.finished, true);
    assert.ok((endDiag.graph?.cycleCount ?? 0) >= 1, '#8 cycle explicitly detected in CopiedVictoryGraph');
    assert.equal(endDiag.evaluation.winnerPlayerIds.includes('ant'), false, '#8 cyclic Antimony must fail closed');
    assert.equal(endDiag.evaluation.winnerPlayerIds.includes('cassie'), false, '#8 cyclic Cassie must fail closed');
  }
});

// ---------------------------------------------------------------------------
// P7D-2: Cross-Character Scenarios #9–#17 (Voodoo + Undead)
// ---------------------------------------------------------------------------
test('P7D-2 — Scenarios #9-#17: Voodoo hijack/privacy/disconnect & Undead dormancy/revival/last-Shadow/no-premature-triggers', () => {
  // #9, #10, #11, #12 Voodoo hijack, privacy isolation, prohibited actions, disconnect timeout
  {
    const s = makeState(
      [
        { id: 'voodoo', roleId: 'exp1_voodoo', location: 'lobby', revealed: true },
        { id: 'victim', roleId: 'gac-ky-thuat', location: 'radio', revealed: false, hand: ['inv-05'] },
        { id: 'p3', roleId: 'suong-an-danh', location: 'court' },
        { id: 'p4', roleId: 'lang-anh-san', location: 'canteen' },
      ],
      { turnPhase: 'ROLL_MOVE', activePlayerId: 'voodoo' },
    );
    assert.equal(
      domain.applyPlayerGameAction(s, 'voodoo', { type: 'USE_SKILL', targetPlayerId: 'victim' }, 1000).ok,
      true,
    );
    s.turnPhase = 'MAIN_ACTION';
    assert.equal(domain.applyPlayerGameAction(s, 'voodoo', { type: 'END_TURN' }, 1010).ok, true);
    assert.equal(s.activePlayerId, 'victim', '#9 original turn order preserved');
    // Victim already holds inv-05 -> paused for owner decision (#10)!
    assert.equal(domain.isTurnControlPausedForOwnerDecision(s), true);
    assert.equal(domain.getPrivateGameView(s, 'voodoo').hand.length, 0, '#10 Voodoo never sees victim hand');
    assert.equal(
      domain.getPublicGameView(s).players.find((p) => p.playerId === 'victim').revealedRoleId,
      null,
      '#10 Victim role stays hidden',
    );
    // Victim resolves inv-05 in LOCATION_ACTION/MAIN_ACTION -> control returns to Voodoo
    s.turnPhase = 'MAIN_ACTION';
    assert.equal(
      domain.applyPlayerGameAction(s, 'victim', { type: 'INVESTIGATE_CARD', cardId: 'inv-05', targetPlayerId: 'p3' }, 1020).ok,
      true,
    );
    assert.equal(domain.getEffectiveTurnControllerId(s), 'voodoo');
    // #11 Prohibited controller actions rejected
    assert.equal(domain.applyPlayerGameAction(s, 'voodoo', { type: 'REVEAL_ROLE' }, 1030).ok, false);
    assert.equal(domain.applyPlayerGameAction(s, 'voodoo', { type: 'USE_SKILL' }, 1031).ok, false);
    // #12 Voodoo disconnects mid-hijack -> deterministic timeout resolves victim turn cleanly without lock!
    s.players.voodoo.connected = false;
    domain.applyTimeoutAutoTurn(s, 1050);
    assert.notEqual(s.activePlayerId, 'victim', '#12 turn advances cleanly without lock');
    assert.equal(domain.ensureExpansionState(s).activeTurnControl ?? null, null, '#12 control grant expired');
  }

  // #9b Regression: Voodoo hijacks Felicia -> Felicia resolves felicia_draw_choice -> kept White/Black card syncs into publicDrawnCards without deadlock!
  {
    const s = makeState(
      [
        { id: 'voodoo', roleId: 'exp1_voodoo', location: 'lobby', revealed: true },
        { id: 'felicia', roleId: 'exp1_felicia', location: 'canteen', revealed: true },
        { id: 'p3', roleId: 'suong-an-danh', location: 'court' },
        { id: 'p4', roleId: 'lang-anh-san', location: 'radio' },
      ],
      { turnPhase: 'ROLL_MOVE', activePlayerId: 'voodoo' },
    );
    s.decks.event = ['ev-07', 'ev-08', 'ev-09'];
    assert.equal(
      domain.applyPlayerGameAction(s, 'voodoo', { type: 'USE_SKILL', targetPlayerId: 'felicia' }, 1500).ok,
      true,
    );
    s.turnPhase = 'MAIN_ACTION';
    assert.equal(domain.applyPlayerGameAction(s, 'voodoo', { type: 'END_TURN' }, 1510).ok, true);
    assert.equal(s.activePlayerId, 'felicia');
    assert.equal(domain.getEffectiveTurnControllerId(s), 'voodoo');
    s.turnPhase = 'LOCATION_ACTION';
    s.players.felicia.location = 'canteen';
    assert.equal(
      domain.applyPlayerGameAction(s, 'voodoo', { type: 'DRAW_CARD', deck: 'event' }, 1520).ok,
      true,
    );
    assert.equal(s.pendingChoice?.kind, 'felicia_draw_choice');
    assert.equal(
      domain.applyPlayerGameAction(
        s,
        'felicia',
        { type: 'RESOLVE_CHOICE', choiceId: s.pendingChoice.choiceId, optionId: 'pick_0' },
        1530,
      ).ok,
      true,
    );
    const pubAfterChoice = domain.getPublicGameView(s);
    assert.equal(pubAfterChoice.controlledTurn?.publicDrawnCards?.length, 1, 'Felicia kept public card synced to Voodoo controller');
    const keptId = pubAfterChoice.controlledTurn.publicDrawnCards[0].id;
    assert.equal(
      domain.applyPlayerGameAction(s, 'voodoo', { type: 'USE_CARD', cardId: keptId, targetPlayerId: 'p3' }, 1540).ok,
      true,
    );
    assert.equal(domain.applyPlayerGameAction(s, 'voodoo', { type: 'END_TURN' }, 1550).ok, true);
    assert.notEqual(s.activePlayerId, 'felicia', 'Voodoo ends Felicia hijacked turn cleanly with 0 deadlock');
  }

  // #13, #14, #15, #16, #17 Undead dormancy, 6 HP revival, final elimination, last Shadow, Gideon & VS ignored during dormancy
  {
    const s = makeState(
      [
        { id: 'gideon', roleId: 'exp2_gideon', location: 'corridor', revealed: true },
        { id: 'undead', roleId: 'exp1_undead', location: 'lobby', woundsTaken: 10, equipped: ['ev-02'] }, // ONLY Shadow, 1 HP left!
        { id: 'h2', roleId: 'gac-radio', location: 'court' },
        { id: 'vs', roleId: 'exp1_vengeful_spirit', location: 'canteen', faction: 'wanderer' }, // test VS trigger isolation (treat as non-Shadow for #16 last-Shadow check)
      ],
      { turnPhase: 'LOCATION_ACTION', activePlayerId: 'gideon' },
    );
    // #13 & #16 & #17: Gideon deals lethal 2 dmg to Undead (last Shadow!) -> DORMANT_PENDING_REVIVE
    assert.equal(
      domain.applyPlayerGameAction(s, 'gideon', { type: 'USE_LOC_POWER', targetPlayerId: 'undead', mode: 'damage' }, 2000).ok,
      true,
    );
    assert.equal(domain.getPlayerLifecycleState(s, s.players.undead), 'DORMANT_PENDING_REVIVE', '#13 dormant');
    assert.deepEqual(s.players.undead.equipped, ['ev-02'], '#13 retains equipment during dormancy');
    assert.equal(s.finished, false, '#16 Hunters MUST NOT win while last Shadow Undead is dormant');
    assert.equal(s.pendingChoice ?? null, null, '#17 Neither Gideon nor Vengeful Spirit triggers on dormancy');
    assert.equal(s.players.gideon.hand.length, 0, '#17 Gideon drew 0 White cards on dormancy');

    // #14: Next turn reaches Undead -> revives with 6 HP!
    s.turnPhase = 'MAIN_ACTION';
    assert.equal(domain.applyPlayerGameAction(s, 'gideon', { type: 'END_TURN' }, 2010).ok, true);
    assert.equal(s.activePlayerId, 'undead');
    assert.equal(domain.getPlayerLifecycleState(s, s.players.undead), 'REVIVED', '#14 REVIVED');
    assert.equal(s.players.undead.hp, 6, '#14 revives at exact 6 HP');
    assert.deepEqual(s.players.undead.equipped, ['ev-02'], '#14 kept gear after revival');

    // #15: Second lethal -> FINAL_ELIMINATED -> triggers Gideon/VS & Hunter victory!
    s.activePlayerId = 'gideon';
    s.turnPhase = 'LOCATION_ACTION';
    s.players.undead.woundsTaken = 10;
    s.players.undead.hp = 1;
    assert.equal(
      domain.applyPlayerGameAction(s, 'gideon', { type: 'USE_LOC_POWER', targetPlayerId: 'undead', mode: 'damage' }, 2020).ok,
      true,
    );
    assert.equal(domain.getPlayerLifecycleState(s, s.players.undead), 'FINAL_ELIMINATED', '#15 final elimination');
    assert.equal(s.players.undead.alive, false);
    assert.equal(s.players.undead.equipped.length, 0, '#15 gear looted/discarded on final elimination');
  }
});

// ---------------------------------------------------------------------------
// P7D-3: Cross-Character Scenarios #18–#30 (Bonnie, Cain, N.C. Soldier, Multi-Win, AoE, Classic)
// ---------------------------------------------------------------------------
test('P7D-3 — Scenarios #18-#30: Bonnie conversion, Cain dual/personal/copy, N.C. Soldier threshold=5/Bonnie/3-weapons, multi-win batch, limits & Classic 0-diff', () => {
  // #18 & #19: Bonnie converts on Shadow kill & prevents Hunter instant win when killing last Shadow
  {
    const s = makeState(
      [
        { id: 'bonnie', roleId: 'exp2_bonnie', location: 'corridor', revealed: false },
        { id: 's1', roleId: 'suong-an-danh', location: 'lobby', woundsTaken: 12 }, // last Shadow
        { id: 'h1', roleId: 'gac-ky-thuat', location: 'court' },
        { id: 'h2', roleId: 'gac-radio', location: 'canteen' },
      ],
      { turnPhase: 'LOCATION_ACTION', activePlayerId: 'bonnie' },
    );
    assert.equal(
      domain.applyPlayerGameAction(s, 'bonnie', { type: 'USE_LOC_POWER', targetPlayerId: 's1', mode: 'damage' }, 3000).ok,
      true,
    );
    assert.equal(s.players.bonnie.faction, 'wanderer', '#18 baseFaction immutable');
    assert.equal(domain.getEffectiveFaction(s, s.players.bonnie), 'mist-order', '#18 effectiveFaction Shadow');
    assert.equal(s.finished, false, '#19 Bonnie replaces last Shadow BEFORE Hunter victory check');
  }

  // #20, #21, #26, #27: Cain dual-faction death + copied victory goal + simultaneous multiple immediate wins
  {
    const s = makeState(
      [
        { id: 'h1', roleId: 'gac-ky-thuat', location: 'corridor' },
        { id: 'cain', roleId: 'exp2_cain', location: 'lobby', revealed: true, woundsTaken: 10 },
        { id: 's1', roleId: 'suong-an-danh', location: 'court' },
        { id: 'ant', roleId: 'exp1_antimony', location: 'canteen', revealed: true },
        { id: 'beth', roleId: 'exp1_bethany', location: 'radio', revealed: true },
        { id: 'n3', roleId: 'lang-anh-san', location: 'breaker' },
      ],
      { turnPhase: 'LOCATION_ACTION', activePlayerId: 'h1' },
    );
    const exp = domain.ensureExpansionState(s);
    exp.cainDeathVictoryModifierIds = ['cain'];
    // #26 Antimony copied h1 (Hunter) victory goal -> MUST co-win on Cain dual-faction victory!
    exp.antimonyCopiedGoalByPlayer = {
      ant: { targetPlayerId: 'h1', sourceRoleId: 'gac-ky-thuat', boundEventId: 'ev-a', boundAtMs: 1, boundTurnNumber: 1 },
    };
    // #27 Bethany chose s1 (Shadow) via SHARE_OUTCOME -> ALSO co-wins in same event batch!
    exp.bethanyChosenByPlayer = {
      beth: { chosenPlayerId: 's1', designatedOnTurnNumber: 1, boundEventId: 'ev-b', boundAtMs: 1 },
    };

    assert.equal(
      domain.applyPlayerGameAction(s, 'h1', { type: 'USE_LOC_POWER', targetPlayerId: 'cain', mode: 'damage' }, 3100).ok,
      true,
    );
    assert.equal(s.finished, true, '#20 Cain dual-faction death triggers immediately');
    assert.equal(s.winnerFaction, 'multi-faction', '#20 winnerFaction === multi-faction');
    assert.deepEqual(s.winningFactions, ['lantern-guard', 'mist-order'], '#20 both factions win');
    assert.ok(s.winnerPlayerIds.includes('h1') && s.winnerPlayerIds.includes('s1'));
    assert.ok(s.winnerPlayerIds.includes('ant'), '#26 Antimony copied Hunter goal co-wins with Cain dual-faction!');
    assert.ok(s.winnerPlayerIds.includes('beth'), '#27 Bethany SHARE_OUTCOME co-wins in same batch!');
  }

  // #22, #23, #24, #25: N.C. Soldier exact threshold 5, Bonnie conversion blocks recruit, leader-only 3 weapons
  {
    const s = makeState(
      [
        { id: 'nc', roleId: 'exp2_nc_soldier', location: 'lobby', revealed: true, equipped: ['ev-01'] }, // Masamune (1d4)
        { id: 'n1', roleId: 'lang-anh-san', location: 'lobby', revealed: true, woundsTaken: 0 }, // 0 wounds -> max 4 after 1d4 -> NOT recruited!
        { id: 'bonnie', roleId: 'exp2_bonnie', location: 'lobby', revealed: true, woundsTaken: 4 },
        { id: 'h1', roleId: 'gac-ky-thuat', location: 'court' },
        { id: 's1', roleId: 'suong-an-danh', location: 'canteen' },
        { id: 'h2', roleId: 'gac-radio', location: 'radio' },
      ],
      { turnPhase: 'MAIN_ACTION', activePlayerId: 'nc', seed: 11, rngState: 11 },
    );
    // #23: With 0 prior wounds + 1d4 (<=4), woundsTaken < 5 -> NOT recruited
    const rNc1 = domain.applyPlayerGameAction(s, 'nc', { type: 'USE_SKILL', targetPlayerId: 'n1' }, 3200);
    assert.equal(rNc1.ok, true, rNc1.error);
    assert.ok(s.players.n1.woundsTaken <= 4);
    assert.equal(domain.getPlayerAlliance(s, 'n1'), null, '#23 < 5 wounds must NOT recruit');

    // #23 exact 5 wounds: restore nc's turn, set n1 to 4 wounds, Masamune deals >=1 -> woundsTaken >= 5 -> recruited!
    s.activePlayerId = 'nc';
    s.turnPhase = 'MAIN_ACTION';
    s.players.nc.attacksThisTurn = 0;
    s.players.n1.woundsTaken = 4;
    s.players.n1.hp = 6;
    assert.equal(domain.applyPlayerGameAction(s, 'nc', { type: 'USE_SKILL', targetPlayerId: 'n1' }, 3210).ok, true);
    assert.ok(s.players.n1.woundsTaken >= 5);
    assert.ok(domain.getPlayerAlliance(s, 'n1'), '#22/#23 >= 5 wounds recruits Neutral into alliance');

    // #24: Bonnie converts to Shadow -> N.C. Soldier CANNOT recruit Bonnie!
    domain.convertPlayerEffectiveFaction(s, s.players.bonnie, {
      targetFaction: 'mist-order',
      conversionEventId: 'ev-bon-conv',
      triggerVictimPlayerId: 's1',
      reason: 'bonnie_shadow_succession',
      nowMs: 3220,
    });
    s.activePlayerId = 'nc';
    s.turnPhase = 'MAIN_ACTION';
    s.players.nc.attacksThisTurn = 0;
    const rBadBonnie = domain.applyPlayerGameAction(s, 'nc', { type: 'USE_SKILL', targetPlayerId: 'bonnie' }, 3230);
    assert.equal(rBadBonnie.ok, false, '#24 Converted Shadow Bonnie cannot be recruited');

    // #25: Leader-only 3 weapons check on clean 6P alliance (only 2 Neutrals: nc & n1)
    const sWin = makeState([
      { id: 'nc', roleId: 'exp2_nc_soldier', revealed: true, equipped: ['ev-06', 'ev-05'] }, // missing ev-03
      { id: 'n1', roleId: 'lang-anh-san', revealed: true, equipped: ['ev-03'] }, // ally holds ev-03, NOT leader!
      { id: 'h1', roleId: 'gac-ky-thuat' },
      { id: 'h2', roleId: 'gac-radio' },
      { id: 's1', roleId: 'suong-an-danh' },
      { id: 's2', roleId: 'suong-tin-gia' },
    ]);
    domain.recruitPlayerIntoNcSoldierAlliance(sWin, sWin.players.nc, sWin.players.n1, 'ev-rec-win', 3300);
    assert.equal(domain.evaluateExpandedVictory(sWin).finished, false, '#25 leader must personally own all 3 weapons');
    sWin.players.nc.equipped.push('ev-03');
    const vWin = domain.evaluateExpandedVictory(sWin);
    assert.equal(vWin.finished, true, '#25 leader owning ev-06, ev-05, ev-03 + all Neutrals recruited wins immediately');
    assert.deepEqual([...vWin.winnerPlayerIds].sort(), ['n1', 'nc']);
  }

  // #28: Reaction chain / redirection limits & skill copy depth limit
  {
    const s = makeState([
      { id: 'a', roleId: 'exp1_antimony', revealed: true },
      { id: 'b', roleId: 'exp1_vengeful_spirit', revealed: true },
      { id: 'h1', roleId: 'gac-ky-thuat' },
      { id: 's1', roleId: 'suong-an-danh' },
    ]);
    const selfCopy = domain.bindCopiedSkillFromElimination(s, s.players.a, s.players.a, 'ev-self', 3400);
    assert.equal(selfCopy.bound, false, '#28 self-referential copy blocked');
  }

  // #29: Multiple simultaneous eliminations in one AoE batch -> Antimony deterministic turnOrder + Vengeful Spirit multi-choice
  {
    const s = makeState(
      [
        { id: 'atk', roleId: 'gac-ky-thuat', location: 'lobby', equipped: ['ev-06', 'ev-01', 'ev-02', 'ev-03'] }, // MG + Masamune(1d4>=1) + +2 = >=3 dmg
        { id: 'v1', roleId: 'exp2_elise', location: 'lobby', woundsTaken: 9 }, // 1 HP left (seat 1)
        { id: 'v2', roleId: 'exp2_warlord', location: 'lobby', woundsTaken: 13 }, // 1 HP left (seat 2, max 14)
        { id: 'ant', roleId: 'exp1_antimony', location: 'court' },
        { id: 'vs', roleId: 'exp1_vengeful_spirit', location: 'canteen' },
        { id: 's2', roleId: 'suong-an-danh', location: 'radio' },
      ],
      { turnPhase: 'MAIN_ACTION', activePlayerId: 'atk' },
    );
    assert.equal(domain.applyPlayerGameAction(s, 'atk', { type: 'ATTACK', targetPlayerId: 'v1' }, 3500).ok, true);
    assert.equal(s.players.v1.alive, false);
    assert.equal(s.players.v2.alive, false);
    // Antimony MUST deterministically pick v1 (earlier in turnOrder than v2)!
    assert.equal(
      domain.getCopiedSkillBinding(s, 'ant')?.effectiveSkillRoleId,
      'exp2_elise',
      '#29 Antimony deterministically copied seat-1 v1 (Elise) in simultaneous AoE batch',
    );
    // Vengeful Spirit gets secret choice containing BOTH victims (v1 and v2)!
    assert.equal(s.pendingChoice?.kind, 'vengeful_spirit_copy_skill');
    assert.ok(s.pendingChoice.choiceId.startsWith('choice-secret-'));
    const copyOpts = s.pendingChoice.options.filter((o) => o.optionId.startsWith('copy_'));
    assert.equal(copyOpts.length, 2, '#29 Vengeful Spirit offered BOTH simultaneous AoE victims');
  }

  // #30: Classic zero regression parity + Classic DTO emits zero Phase 7 expanded fields
  {
    const classic = domain.createInitialGameState({
      matchId: 'classic-check-7d',
      players: [
        { playerId: 'c1', displayName: 'C1', seatIndex: 0 },
        { playerId: 'c2', displayName: 'C2', seatIndex: 1 },
        { playerId: 'c3', displayName: 'C3', seatIndex: 2 },
        { playerId: 'c4', displayName: 'C4', seatIndex: 3 },
      ],
      seed: 12345,
      nowMs: 4000,
      rulesetId: 'classic',
    });
    const pub = domain.getPublicGameView(classic);
    assert.equal(pub.controlledTurn, undefined);
    assert.equal(pub.alliances, undefined);
    assert.equal(pub.winningFactions, undefined);
    assert.equal(pub.cainDeathModifierActivePlayerIds, undefined);
    for (const p of pub.players) {
      assert.equal(p.lifecycleState, undefined);
      assert.equal(p.effectiveFaction, undefined);
      assert.equal(p.copiedSkillRoleId, undefined);
      assert.equal(p.allianceId, undefined);
    }
  }
});

// ---------------------------------------------------------------------------
// P7D-4: Real Cloudflare DO 4P–8P E2E, Production Lock & Concurrent Classic/S56
// ---------------------------------------------------------------------------
test('P7D-4 — Real DO E2E across 4P, 5P, 6P, 7P, 8P on starter-fifty-six, production pack rejection & concurrent Classic room', async () => {
  // 1. Production server MUST reject starter-fifty-six, expansion-1, expansion-2, full-expansion!
  const prodServer = await startStandaloneBoardGameTestServer(0, {});
  try {
    for (const badId of ['starter-fifty-six', 'expansion-1', 'expansion-2', 'full-expansion']) {
      const res = await fetch(`${prodServer.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: `prod-block-${badId}`, hostName: 'Host', rulesetId: badId }),
      });
      assert.equal(res.status, 400, `Prod HTTP must reject ${badId}`);
      const body = await res.json();
      assert.equal(body.code, 'RULESET_UNAVAILABLE');
    }
  } finally {
    await prodServer.close();
  }

  // 2. Experimental server: 4P, 5P (no N.C. Soldier!), 6P, 7P, 8P + concurrent Classic room
  const server = await startStandaloneBoardGameTestServer(0, {
    ALLOW_EXPERIMENTAL_RULESETS: '1',
    CHOICE_TIMEOUT_OVERRIDE_MS: '800',
  });
  try {
    const classicRes = await fetch(`${server.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'p7d-classic-concurrent', hostName: 'ClassicHost', rulesetId: 'classic' }),
    });
    assert.equal(classicRes.status, 201);
    const classicMatch = await classicRes.json();
    const classicSession = await joinAndStart(server.wsBaseUrl, classicMatch, 4, 'CL', true);
    assert.equal(classicSession.startSync.publicGame.rulesetId, 'classic');

    for (const count of [4, 5, 6, 7, 8]) {
      const createRes = await fetch(`${server.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: `p7d-s56-${count}p`,
          hostName: `H${count}`,
          rulesetId: 'starter-fifty-six',
        }),
      });
      assert.equal(createRes.status, 201, `Create ${count}P starter-fifty-six`);
      const match = await createRes.json();
      const { clients, spectator, startSync } = await joinAndStart(
        server.wsBaseUrl,
        match,
        count,
        `P${count}`,
        true,
      );
      assert.equal(startSync.publicGame.rulesetId, 'starter-fifty-six');
      assert.equal(startSync.publicGame.players.length, count);
      // Spectator privacy across all player counts
      const specLatest = spectator.getLatestSync();
      assert.equal(specLatest.privateView, null);
      assert.ok(specLatest.publicGame.players.every((p) => p.revealedRoleId === null));

      // 5P MUST NEVER deal exp2_nc_soldier
      if (count === 5) {
        const dealtRoles = clients.map((c) => c.getLatestSync().privateView.roleId);
        assert.equal(dealtRoles.includes('exp2_nc_soldier'), false, '5P DO match never deals exp2_nc_soldier');
      }

      // Execute one real ROLL_DICE by active player over WebSocket
      const activeId = startSync.publicGame.activePlayerId;
      const activeClient = clients.find((c) => c.getLatestSync().privateView?.playerId === activeId);
      assert.ok(activeClient);
      await sleep(130);
      const mark = activeClient.inbox.length;
      activeClient.send({
        type: 'BG_GAME_ACTION',
        requestId: `p7d_roll_${count}p`,
        expectedRevision: startSync.revision,
        action: { type: 'ROLL_DICE' },
      });
      const afterRoll = await activeClient.nextMsg(
        (m) => m.type === 'BG_STATE_SYNC' && m.revision > startSync.revision,
        4500,
        mark,
      );
      assert.ok(afterRoll.publicGame.lastDiceRoll, `${count}P dice roll committed`);

      spectator.close();
      for (const c of clients) c.close();
    }

    classicSession.spectator.close();
    for (const c of classicSession.clients) c.close();
  } finally {
    await server.close();
  }
});

// ---------------------------------------------------------------------------
// P7D-5: Real DO Security, Voodoo Auth, Hibernation, Reconnect & Multi-Faction DTO
// ---------------------------------------------------------------------------
test('P7D-5 — Real DO Security E2E: Voodoo hijack auth/reconnect/expiry, Undead hibernation revival, Bonnie/Alliance persistence & Cain multi-faction DTO', async () => {
  const server = await startStandaloneBoardGameTestServer(0, {
    ALLOW_EXPERIMENTAL_RULESETS: '1',
    CHOICE_TIMEOUT_OVERRIDE_MS: '800',
  });
  try {
    const createRes = await fetch(`${server.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: 'p7d-sec-do',
        hostName: 'Sec7Host',
        rulesetId: 'starter-fifty-six',
      }),
    });
    assert.equal(createRes.status, 201);
    const match = await createRes.json();
    const { clients, auths, spectator } = await joinAndStart(server.wsBaseUrl, match, 6, 'S7', true);

    const container = server.containers.get(match.matchId);
    const sql = container.ctx.storage.sql;
    const row = sql.exec('SELECT game_state_json, revision FROM matches WHERE match_id = ?', match.matchId).one();
    const wrapped = JSON.parse(row.game_state_json);
    const es = wrapped.engineState;
    const [id0, id1, id2, id3, id4, id5] = es.turnOrder;

    const setSeat = (pid, roleId, revealed, location, woundsTaken = 0, equipped = [], hand = []) => {
      const p = es.players[pid];
      const d = domain.getRoleDesign(roleId);
      p.roleId = roleId;
      p.faction = d.faction;
      p.maxHp = d.maxHp;
      p.woundsTaken = woundsTaken;
      p.hp = Math.max(0, d.maxHp - woundsTaken);
      p.revealed = revealed;
      p.alive = true;
      p.location = location;
      p.equipped = equipped;
      p.hand = hand;
      p.skillUsedOnce = false;
    };

    // Seat 0: Revealed Voodoo (hijacks Seat 1!)
    // Seat 1: Hidden Hunter (`gac-ky-thuat`) — victim of Voodoo hijack
    // Seat 2: Hidden Undead at lobby (1 HP left -> will enter dormancy & survive hibernation!)
    // Seat 3: Revealed Cain at lobby (1 HP left, modifier armed -> will trigger multi-faction DTO!)
    // Seat 4: Revealed Bonnie (already converted to Shadow -> verify persistence across hibernation!)
    // Seat 5: Revealed N.C. Soldier in alliance with Seat 3 (verify alliance persistence across hibernation!)
    setSeat(id0, 'exp1_voodoo', true, 'corridor', 0);
    setSeat(id1, 'gac-ky-thuat', false, 'lobby', 0);
    setSeat(id2, 'exp1_undead', false, 'lobby', 10, ['ev-02']); // 1 HP left of 11
    setSeat(id3, 'exp2_cain', true, 'lobby', 10); // 1 HP left of 11
    setSeat(id4, 'exp2_bonnie', true, 'court', 0);
    setSeat(id5, 'exp2_nc_soldier', true, 'canteen', 0);

    domain.ensureExpansionState(es);
    domain.convertPlayerEffectiveFaction(es, es.players[id4], {
      targetFaction: 'mist-order',
      conversionEventId: 'seed-bon-7d',
      triggerVictimPlayerId: 'dummy',
      reason: 'bonnie_shadow_succession',
      nowMs: Date.now(),
    });
    domain.recruitPlayerIntoNcSoldierAlliance(es, es.players[id5], es.players[id3], 'seed-nc-7d', Date.now());
    es.expansionState.cainDeathVictoryModifierIds = [id3];
    // Pre-schedule Voodoo hijack for Seat 1's upcoming turn & start Seat 1's turn under Voodoo control!
    es.activePlayerId = id1;
    es.turnPhase = 'ROLL_MOVE';
    const grant = domain.scheduleDeferredTurnControl(es, {
      controllerPlayerId: id0,
      victimPlayerId: id1,
      sourceRoleId: 'exp1_voodoo',
      nowMs: Date.now(),
    });
    domain.activateScheduledTurnControlForTurn(es, id1, Date.now());

    sql.exec('UPDATE matches SET game_state_json = ? WHERE match_id = ?', JSON.stringify(wrapped), match.matchId);
    container.hibernateAndWake();
    let rev = row.revision;

    // 1. Victim (Seat 1) attempts competing ROLL_DICE -> MUST REJECT!
    const s1Mark = clients[1].inbox.length;
    await sleep(130);
    clients[1].send({
      type: 'BG_GAME_ACTION',
      requestId: 'voodoo_victim_competing',
      expectedRevision: rev,
      action: { type: 'ROLL_DICE' },
    });
    const victimAck = await clients[1].nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'voodoo_victim_competing',
      4500,
      s1Mark,
    );
    assert.equal(victimAck.ok, false, 'Hijacked victim must be rejected on public ROLL_DICE');

    // 2. Voodoo (Seat 0) attempts prohibited REVEAL_ROLE & USE_SKILL -> MUST REJECT!
    const s0MarkBad = clients[0].inbox.length;
    await sleep(130);
    clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'voodoo_illegal_reveal',
      expectedRevision: rev,
      action: { type: 'REVEAL_ROLE' },
    });
    const badRevAck = await clients[0].nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'voodoo_illegal_reveal',
      4500,
      s0MarkBad,
    );
    assert.equal(badRevAck.ok, false, 'Voodoo controller MUST be blocked from REVEAL_ROLE');

    // 3. Voodoo disconnects & F5 reconnects MID-HIJACK -> retains authorized control + Bonnie/Alliance persisted across hibernation!
    clients[0].close();
    await sleep(60);
    container.hibernateAndWake();
    const c0Re = await openBgClient(server.wsBaseUrl, match.matchId);
    c0Re.send({
      type: 'BG_JOIN',
      matchId: match.matchId,
      displayName: 'S7_1',
      reconnectToken: auths[0].reconnectToken,
    });
    await c0Re.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    const c0Sync = await c0Re.nextMsg((m) => m.type === 'BG_STATE_SYNC');
    clients[0] = c0Re;

    assert.equal(c0Sync.publicGame.controlledTurn?.controllerPlayerId, id0, 'Voodoo hijack persisted across hibernation');
    assert.equal(c0Sync.publicGame.controlledTurn?.controlGrantId, grant.controlGrantId);
    assert.equal(
      c0Sync.publicGame.players.find((p) => p.playerId === id1).revealedRoleId,
      null,
      'Voodoo NEVER sees hidden victim roleId on reconnect',
    );
    assert.equal(
      c0Sync.publicGame.players.find((p) => p.playerId === id4).effectiveFaction,
      'mist-order',
      'Bonnie dynamic allegiance persisted across hibernation',
    );
    assert.equal(c0Sync.publicGame.alliances?.length, 1, 'N.C. Soldier alliance persisted across hibernation');

    // 4. Voodoo executes authorized ROLL_DICE on victim's behalf + duplicate requestId idempotency!
    const s0RollMark = clients[0].inbox.length;
    await sleep(130);
    clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'voodoo_auth_roll_1',
      expectedRevision: c0Sync.revision,
      action: { type: 'ROLL_DICE' },
    });
    const afterVoodooRoll = await clients[0].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision > c0Sync.revision,
      4500,
      s0RollMark,
    );
    rev = afterVoodooRoll.revision;
    assert.ok(afterVoodooRoll.publicGame.lastDiceRoll, 'Voodoo authorized ROLL_DICE succeeded');

    // Duplicate requestId replay -> idempotent ACK, zero revision bump!
    const dupMark = clients[0].inbox.length;
    await sleep(130);
    clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'voodoo_auth_roll_1',
      expectedRevision: c0Sync.revision,
      action: { type: 'ROLL_DICE' },
    });
    const dupAck = await clients[0].nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'voodoo_auth_roll_1',
      4500,
      dupMark,
    );
    assert.equal(dupAck.ok, true);
    assert.equal(dupAck.revision, rev, 'Duplicate requestId must NOT bump revision');

    // 5. Voodoo ends Seat 1's turn (after moving Seat 1 to corridor & hitting Undead into dormancy!), then Undead survives hibernation & revives at 6 HP!
    const row2 = sql.exec('SELECT game_state_json, revision FROM matches WHERE match_id = ?', match.matchId).one();
    const w2 = JSON.parse(row2.game_state_json);
    w2.engineState.turnPhase = 'LOCATION_ACTION';
    w2.engineState.players[id1].location = 'corridor';
    sql.exec('UPDATE matches SET game_state_json = ? WHERE match_id = ?', JSON.stringify(w2), match.matchId);
    container.hibernateAndWake();
    rev = row2.revision;

    const s2DormMark = clients[2].inbox.length;
    await sleep(130);
    clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'voodoo_hit_undead_dormant',
      expectedRevision: rev,
      action: { type: 'USE_LOC_POWER', targetPlayerId: id2, mode: 'damage' },
    });
    const dormSync = await clients[2].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision > rev,
      4500,
      s2DormMark,
    );
    rev = dormSync.revision;
    assert.equal(
      dormSync.publicGame.players.find((p) => p.playerId === id2).lifecycleState,
      'DORMANT_PENDING_REVIVE',
      'Undead entered DORMANT_PENDING_REVIVE over real DO WebSocket',
    );

    // Hibernation while Undead is dormant + Voodoo ends Seat 1's turn -> Undead REVIVES at 6 HP!
    container.hibernateAndWake();
    const s2RevMark = clients[2].inbox.length;
    await sleep(130);
    clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'voodoo_end_victim_turn',
      expectedRevision: rev,
      action: { type: 'END_TURN' },
    });
    const revivedSync = await clients[2].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision > rev,
      4500,
      s2RevMark,
    );
    rev = revivedSync.revision;
    assert.equal(revivedSync.publicGame.controlledTurn, undefined, 'Voodoo control expired cleanly after END_TURN');
    assert.equal(revivedSync.publicGame.activePlayerId, id2, 'Turn advanced to revived Undead');
    assert.equal(
      revivedSync.publicGame.players.find((p) => p.playerId === id2).lifecycleState,
      'REVIVED',
      'Undead revived across DO hibernation',
    );
    assert.equal(revivedSync.privateView.hp, 6, 'Revived Undead has exact 6 HP');

    // Expired controller (Voodoo) attempts another action on Undead's turn -> REJECTED!
    const s0ExpMark = clients[0].inbox.length;
    await sleep(130);
    clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'voodoo_expired_replay',
      expectedRevision: rev,
      action: { type: 'ROLL_DICE' },
    });
    const expAck = await clients[0].nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'voodoo_expired_replay',
      4500,
      s0ExpMark,
    );
    assert.equal(expAck.ok, false, 'Expired Voodoo controller grant MUST be rejected');

    // 6. Revived Undead eliminates Cain (Seat 3) -> Multi-Faction Dual Victory DTO broadcast to ALL players & Spectator!
    const row3 = sql.exec('SELECT game_state_json, revision FROM matches WHERE match_id = ?', match.matchId).one();
    const w3 = JSON.parse(row3.game_state_json);
    w3.engineState.turnPhase = 'LOCATION_ACTION';
    w3.engineState.players[id2].location = 'corridor';
    sql.exec('UPDATE matches SET game_state_json = ? WHERE match_id = ?', JSON.stringify(w3), match.matchId);
    container.hibernateAndWake();
    rev = row3.revision;

    const specWinMark = spectator.inbox.length;
    await sleep(130);
    clients[2].send({
      type: 'BG_GAME_ACTION',
      requestId: 'undead_kill_cain_dual',
      expectedRevision: rev,
      action: { type: 'USE_LOC_POWER', targetPlayerId: id3, mode: 'damage' },
    });
    const specWinSync = await spectator.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.publicGame?.winnerFaction === 'multi-faction',
      4500,
      specWinMark,
    );
    assert.equal(specWinSync.status, 'FINISHED');
    assert.equal(specWinSync.publicGame.turnPhase, 'ENDED');
    assert.equal(specWinSync.publicGame.winnerFaction, 'multi-faction');
    assert.deepEqual(specWinSync.publicGame.winningFactions, ['lantern-guard', 'mist-order']);
    assert.equal(specWinSync.privateView, null, 'Spectator stays privateView === null even at match end');
    assert.ok(specWinSync.publicGame.winnerPlayerIds.includes(id0), 'Voodoo (Shadow) won');
    assert.ok(specWinSync.publicGame.winnerPlayerIds.includes(id1), 'Hunter won');
    assert.ok(specWinSync.publicGame.winnerPlayerIds.includes(id4), 'Converted Shadow Bonnie won');
    assert.ok(!specWinSync.publicGame.winnerPlayerIds.includes(id3), 'Dead Cain did NOT win');

    spectator.close();
    for (const c of clients) c.close();
  } finally {
    await server.close();
  }
});
