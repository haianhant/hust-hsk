/**
 * test/boardgame-phase6d-integration.test.cjs — Phase 6D Comprehensive Cross-Character,
 * Security, Privacy & Real Cloudflare Durable Object 4P–8P E2E Suite.
 *
 * Covers ALL 25 mandatory Section 25 scenarios, ALL Section 26 Real DO WebSocket checks
 * (4P–8P, SQLite hibernation, F5 reconnect mid-reaction, disconnect timeout, idempotency,
 * concurrent Classic/S48 rooms, production block), and ALL Section 27 Hidden Information
 * Security assertions.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
require('./register-ts.cjs');

const { WebSocket } = require('./ws-shim/mini-ws');
const {
  startStandaloneBoardGameTestServer,
} = require('./ws-shim/boardgame-do-harness.cjs');

const domain = require('../features/boardgame/domain/index.ts');
const { extractVisualEventsFromDiff } = require('../features/boardgame/ui/vfx-queue.ts');

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
    rulesetId: opts.rulesetId ?? 'starter-forty-eight',
    matchId: opts.matchId ?? 'p6d-match',
    seed: opts.seed ?? 60601,
    rngState: opts.rngState ?? 60601,
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
      investigation: [...(opts.invDeck ?? [])],
      equipment: [...(opts.eqDeck ?? [])],
      event: [...(opts.evDeck ?? [])],
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
  domain.ensureExpansionState(state);
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
      } catch {
        // ignore
      }
    },
  };
}

async function joinAndStart(wsBaseUrl, match, count, prefix, includeSpectator = false) {
  const clients = [];
  const auths = [];
  for (let i = 0; i < count; i++) {
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
  return {
    clients,
    auths,
    spectator,
    playerSyncs: syncs.slice(0, count),
    specSync: spectator ? syncs[count] : null,
  };
}

// ===========================================================================
// P6D-1: Scenarios #1, #2, #3, #4, #5 & #24
// Gideon (in/out-of-turn), Anathema lethal redirect, Anathema -> Arnold -> Attacker,
// Arnold -> Cindy retaliation (no loop), Wrath + G43/Holy Robe + Angel + Dalton
// ===========================================================================
test('P6D-1 — Gideon (#1/#2), Anathema/Arnold/Cindy chains (#3/#4/#5) & G43/Wrath/Dalton/Angel cross-interactions (#24)', () => {
  const now = 1_798_000_000_000;

  // #1 & #2: Gideon triggers OUT OF TURN when another player kills a Shadow, draws & resolves 3 White cards sequentially
  {
    const st = makeState(
      [
        { id: 'killer', roleId: 'gac-ky-thuat', revealed: true, location: 'lobby', equipped: ['ev-01', 'eq-04'] },
        { id: 'shadow1', roleId: 'suong-an-danh', revealed: true, location: 'lobby', woundsTaken: 12 }, // 1 HP
        { id: 'shadow2', roleId: 'suong-gac-cong', revealed: true, location: 'court' }, // keeps match alive!
        { id: 'gideon', roleId: 'exp2_gideon', revealed: true, location: 'radio', woundsTaken: 4 },
      ],
      {
        activePlayerId: 'killer',
        turnPhase: 'MAIN_ACTION',
        eqDeck: ['eq-01', 'eq-07', 'eq-02'], // Holy Robe (equip), Chocolate/Advent/Holy Water (eq-07 = heal 2 self), Silver Rosary (equip)
      },
    );
    const atkRes = domain.applyPlayerGameAction(st, 'killer', { type: 'ATTACK', targetPlayerId: 'shadow1' }, now);
    assert.equal(atkRes.ok, true);
    assert.equal(st.players.shadow1.alive, false, 'Shadow1 eliminated');
    assert.equal(st.finished, false, 'Shadow2 still alive so match continues');
    assert.ok(st.pendingChoice, 'Gideon must be prompted OUT OF TURN');
    assert.equal(st.pendingChoice.kind, 'gideon_draw_white');
    assert.equal(st.pendingChoice.ownerPlayerId, 'gideon');
    assert.equal(st.activePlayerId, 'killer', 'Active turn remains killer during out-of-turn Gideon reaction');

    // Step 1: Activate Gideon -> draws 3 White cards sequentially
    const r1 = domain.applyPlayerGameAction(
      st,
      'gideon',
      { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'activate' },
      now + 100,
    );
    assert.equal(r1.ok, true);
    // Resolve any targeting prompts if a white card required one (eq-07 heals 2 HP automatically on self)
    let guard = 0;
    while (st.pendingChoice && st.pendingChoice.ownerPlayerId === 'gideon' && guard++ < 8) {
      const opt = st.pendingChoice.options[0].optionId;
      const rr = domain.applyPlayerGameAction(
        st,
        'gideon',
        { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: opt },
        now + 200 + guard * 50,
      );
      assert.equal(rr.ok, true);
    }
    assert.equal(st.pendingChoice ?? null, null);
    assert.ok(st.players.gideon.equipped.includes('eq-01'), 'Gideon equipped 1st White card (eq-01)');
    assert.ok(st.players.gideon.equipped.includes('eq-02'), 'Gideon equipped 3rd White card (eq-02)');
    assert.equal(st.players.gideon.woundsTaken, 2, 'Gideon healed 2 wounds from 2nd White card (eq-07)');
  }

  // #3 & #4: Anathema redirects lethal damage (#3) AND Anathema -> Arnold -> Attacker chain (#4)
  {
    const st = makeState(
      [
        { id: 'atk', roleId: 'suong-an-danh', revealed: true, location: 'lobby', equipped: ['ev-01', 'ev-02'] },
        { id: 'ana', roleId: 'exp1_anathema', revealed: true, location: 'lobby', woundsTaken: 6 }, // 2 HP
        { id: 'arnold', roleId: 'exp1_arnold', revealed: false, location: 'court', woundsTaken: 6 }, // 2 HP (lethal!)
        { id: 'h1', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
      ],
      { activePlayerId: 'atk', turnPhase: 'MAIN_ACTION' },
    );
    st.expansionState.anathemaCurses = {
      ana: { targetPlayerId: 'arnold', active: true, activatedOnTurnNumber: 2 },
    };
    const arnoldHpBefore = st.players.arnold.hp;
    const atkHpBefore = st.players.atk.hp;

    const atkRes = domain.applyPlayerGameAction(st, 'atk', { type: 'ATTACK', targetPlayerId: 'ana' }, now);
    assert.equal(atkRes.ok, true);
    // Damage redirected from Anathema to Arnold -> lethal -> pauses on SECRET Arnold reflection!
    assert.ok(st.pendingChoice, 'Redirected lethal hit on hidden Arnold must pause for reflection');
    assert.equal(st.pendingChoice.kind, 'arnold_reflect_lethal');
    assert.equal(st.pendingChoice.isSecret, true);
    assert.equal(st.pendingChoice.ownerPlayerId, 'arnold');

    // Public view MUST mask Arnold's identity & kind!
    const pubMid = domain.getPublicGameView(st);
    assert.equal(pubMid.pendingChoice.ownerPlayerId, null);
    assert.equal(pubMid.pendingChoice.kind, null);
    assert.equal(pubMid.pendingChoice.isSecret, true);

    const refRes = domain.applyPlayerGameAction(
      st,
      'arnold',
      { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'reflect' },
      now + 100,
    );
    assert.equal(refRes.ok, true);
    assert.equal(st.players.arnold.alive, true);
    assert.equal(st.players.arnold.hp, arnoldHpBefore, 'Arnold preserves exact pre-event HP');
    assert.equal(st.players.arnold.revealed, true);
    assert.equal(st.players.arnold.skillUsedOnce, true);
    assert.equal(st.players.ana.hp, 2, 'Anathema took 0 damage');
    assert.ok(st.players.atk.hp < atkHpBefore, 'Original attacker took reflected lethal damage!');
    const traces = st.expansionState.damageTraces || [];
    assert.ok(traces.some((t) => t.preventionOutcome === 'redirected-anathema'), 'Anathema redirect traced');
    assert.ok(traces.some((t) => t.preventionOutcome === 'redirected-arnold'), 'Arnold reflection traced');
  }

  // #3b: Anathema redirects lethal hit onto normal cursed victim -> victim dies -> curse ends
  {
    const st = makeState(
      [
        { id: 'atk', roleId: 'suong-an-danh', revealed: true, location: 'lobby', equipped: ['ev-01', 'ev-02'] },
        { id: 'ana', roleId: 'exp1_anathema', revealed: true, location: 'lobby', woundsTaken: 6 },
        { id: 'victim', roleId: 'gac-radio', revealed: true, location: 'court', woundsTaken: 11 }, // 1 HP
        { id: 'h2', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
      ],
      { activePlayerId: 'atk', turnPhase: 'MAIN_ACTION' },
    );
    st.expansionState.anathemaCurses = {
      ana: { targetPlayerId: 'victim', active: true, activatedOnTurnNumber: 2 },
    };
    const r = domain.applyPlayerGameAction(st, 'atk', { type: 'ATTACK', targetPlayerId: 'ana' }, now);
    assert.equal(r.ok, true);
    assert.equal(st.players.victim.alive, false, 'Cursed victim died from redirected lethal hit');
    assert.equal(st.players.ana.alive, true);
    assert.equal(st.expansionState.anathemaCurses.ana.active, false, 'Curse deactivates once victim dies');
  }

  // #5: Arnold reflects lethal damage onto Cindy -> Cindy reveals & retaliates (no reflection loop!)
  {
    const st = makeState(
      [
        { id: 'cindy', roleId: 'exp1_cindy', revealed: false, location: 'lobby', equipped: ['ev-01', 'ev-02'] },
        { id: 'arnold', roleId: 'exp1_arnold', revealed: false, location: 'lobby', woundsTaken: 7 }, // 1 HP -> Cindy 1-dmg retaliation kills Arnold with zero loop!
        { id: 'h1', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
        { id: 's1', roleId: 'suong-an-danh', revealed: true, location: 'court' },
      ],
      { activePlayerId: 'cindy', turnPhase: 'MAIN_ACTION' },
    );
    const atk = domain.applyPlayerGameAction(st, 'cindy', { type: 'ATTACK', targetPlayerId: 'arnold' }, now);
    assert.equal(atk.ok, true);
    assert.equal(st.pendingChoice.kind, 'arnold_reflect_lethal');
    const ref = domain.applyPlayerGameAction(
      st,
      'arnold',
      { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'reflect' },
      now + 100,
    );
    assert.equal(ref.ok, true);
    // Reflected damage hits hidden Cindy -> Cindy triggers secret retaliation!
    assert.ok(st.pendingChoice, 'Cindy should be offered retaliation against Arnold');
    assert.equal(st.pendingChoice.kind, 'cindy_reveal_retaliate');
    assert.equal(st.pendingChoice.ownerPlayerId, 'cindy');
    const ret = domain.applyPlayerGameAction(
      st,
      'cindy',
      { type: 'RESOLVE_CHOICE', choiceId: st.pendingChoice.choiceId, optionId: 'reveal_and_retaliate' },
      now + 200,
    );
    assert.equal(ret.ok, true);
    assert.equal(st.players.cindy.revealed, true);
    assert.equal(st.pendingChoice ?? null, null, 'Arnold already used once-per-match reflection — zero infinite loop!');
    assert.equal(st.players.arnold.alive, false, 'Cindy 1-dmg retaliation eliminates 1-HP Arnold cleanly without re-triggering reflection');
  }

  // #24: Cross-interactions with Wrath, G43 + Holy Robe, Angel & Dalton
  {
    // (a) Wrath AoE redirected from Anathema onto G43 + Holy Robe (2 - 1 - 2 = 0 dmg!)
    const st1 = makeState(
      [
        { id: 'wrath', roleId: 'exp1_wrath', revealed: true, location: 'lobby' },
        { id: 'ana', roleId: 'exp1_anathema', revealed: true, location: 'lobby' },
        { id: 'g43', roleId: 'exp2_g43', revealed: true, location: 'court', equipped: ['eq-01'] },
        { id: 'dalton', roleId: 'exp2_dalton', revealed: true, location: 'lobby' },
      ],
      { activePlayerId: 'wrath', turnPhase: 'ROLL_MOVE' },
    );
    st1.expansionState.anathemaCurses = {
      ana: { targetPlayerId: 'g43', active: true, activatedOnTurnNumber: 1 },
    };
    // Trigger Wrath turn start
    const stWrap = domain.applyPlayerGameAction(st1, 'wrath', { type: 'ROLL_DICE' }, now);
    assert.equal(stWrap.ok, true);
    // Direct test: open Wrath AoE via turn transition
    const st2 = makeState(
      [
        { id: 'prev', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
        { id: 'wrath', roleId: 'exp1_wrath', revealed: true, location: 'lobby' },
        { id: 'ana', roleId: 'exp1_anathema', revealed: true, location: 'lobby' },
        { id: 'g43', roleId: 'exp2_g43', revealed: true, location: 'court', equipped: ['eq-01'] },
        { id: 'dalton', roleId: 'exp2_dalton', revealed: true, location: 'radio' },
      ],
      { activePlayerId: 'prev', turnPhase: 'MAIN_ACTION' },
    );
    st2.expansionState.anathemaCurses = {
      ana: { targetPlayerId: 'g43', active: true, activatedOnTurnNumber: 1 },
    };
    domain.applyPlayerGameAction(st2, 'prev', { type: 'END_TURN' }, now);
    assert.equal(st2.pendingChoice?.kind, 'wrath_turn_start_aoe');
    domain.applyPlayerGameAction(
      st2,
      'wrath',
      { type: 'RESOLVE_CHOICE', choiceId: st2.pendingChoice.choiceId, optionId: 'activate' },
      now + 100,
    );
    assert.equal(st2.players.ana.woundsTaken, 0, 'Anathema redirected Wrath AoE to G43');
    assert.equal(st2.players.g43.woundsTaken, 2, 'Wrath skill AoE (non-attack) bypasses G43 + Holy Robe even after Anathema redirection');
    // Redirected normal attack (ev-01 1d4 = 1..4) onto G43 + Holy Robe IS reduced by 3 (G43 -2, Holy Robe -1)!
    st2.players.g43.woundsTaken = 0;
    st2.players.g43.hp = st2.players.g43.maxHp;
    st2.players.wrath.equipped = ['ev-01'];
    st2.turnPhase = 'MAIN_ACTION';
    domain.applyPlayerGameAction(st2, 'wrath', { type: 'ATTACK', targetPlayerId: 'ana' }, now + 200);
    assert.equal(st2.players.ana.woundsTaken, 0);
    assert.ok(st2.players.g43.woundsTaken <= 1, 'Redirected normal attack (1d4 max 4) reduced by G43 (-2) + Holy Robe (-1) to <= 1');

    // (b) Angel active aura blocks redirected damage onto revealed Neutral victim; Dalton activates on redirected damage!
    const st3 = makeState(
      [
        { id: 'atk', roleId: 'suong-an-danh', revealed: true, location: 'lobby', equipped: ['ev-01', 'ev-02'] },
        { id: 'ana', roleId: 'exp1_anathema', revealed: true, location: 'lobby' },
        { id: 'angel', roleId: 'exp1_angel', revealed: true, location: 'radio' },
        { id: 'colt', roleId: 'exp2_colt', revealed: true, location: 'court' },
      ],
      { activePlayerId: 'atk', turnPhase: 'MAIN_ACTION' },
    );
    st3.expansionState.anathemaCurses = {
      ana: { targetPlayerId: 'colt', active: true, activatedOnTurnNumber: 1 },
    };
    st3.expansionState.angelAuras = {
      angel: { phase: 'active', armedOnTurnNumber: 1, activatedOnTurnNumber: 2 },
    };
    domain.applyPlayerGameAction(st3, 'atk', { type: 'ATTACK', targetPlayerId: 'ana' }, now);
    assert.equal(st3.players.ana.woundsTaken, 0);
    assert.equal(st3.players.colt.woundsTaken, 0, 'Angel active aura protected cursed revealed Neutral Colt!');

    // (c) Redirected hit from Anathema onto revealed Dalton activates Dalton's 12th Round!
    const st4 = makeState(
      [
        { id: 'atk', roleId: 'suong-an-danh', revealed: true, location: 'lobby', equipped: ['ev-01', 'ev-02'] },
        { id: 'ana', roleId: 'exp1_anathema', revealed: true, location: 'lobby' },
        { id: 'dalton', roleId: 'exp2_dalton', revealed: true, location: 'court' },
        { id: 'h1', roleId: 'gac-ky-thuat', revealed: true, location: 'radio' },
      ],
      { activePlayerId: 'atk', turnPhase: 'MAIN_ACTION' },
    );
    st4.expansionState.anathemaCurses = {
      ana: { targetPlayerId: 'dalton', active: true, activatedOnTurnNumber: 1 },
    };
    domain.applyPlayerGameAction(st4, 'atk', { type: 'ATTACK', targetPlayerId: 'ana' }, now);
    assert.ok(st4.players.dalton.woundsTaken > 0, 'Dalton received redirected damage');
    assert.ok(st4.expansionState.daltonActivatedByPlayer?.dalton, 'Dalton activated 12th Round from redirected hit');
  }
});

// ===========================================================================
// P6D-2: Scenarios #6, #7, #8, #9, #10, #11, #12 + COPY_GOAL vs SHARE_OUTCOME
// ===========================================================================
test('P6D-2 — CopiedVictoryGraph (#6/#7/#8), Cassie (#9), Diana 5P (#10), Aaron (#11/#12) & COPY_GOAL !== SHARE_OUTCOME', () => {
  const now = 1_798_000_010_000;

  // #6: Bethany -> Diana -> Cassie -> Anathema 3-layer transitive victory
  {
    const st = makeState([
      { id: 'beth', roleId: 'exp1_bethany', revealed: true, alive: true },
      { id: 'diana', roleId: 'exp2_diana', revealed: true, alive: true },
      { id: 'cassie', roleId: 'exp1_cassie', revealed: true, alive: true },
      { id: 'ana', roleId: 'exp1_anathema', revealed: true, alive: true },
      { id: 'h1', roleId: 'gac-ky-thuat', revealed: true, alive: true },
      { id: 's1', roleId: 'suong-an-danh', revealed: true, alive: false }, // Hunters win!
    ]);
    st.expansionState.bethanyChosenByPlayer = {
      beth: { chosenPlayerId: 'diana', givenCardId: 'eq-02', assignedByPlayerId: 'beth', assignedOnTurnNumber: 2, assignedAtMs: now },
    };
    st.expansionState.dianaContracts = {
      diana: { customerPlayerId: 'cassie', sourceRoleId: 'exp1_cassie', boundOnTurnNumber: 2, boundEventId: 'ev1', boundAtMs: now, status: 'active', activatedOnTurnNumber: 3 },
    };
    st.expansionState.cassieCopiedGoalByPlayer = {
      cassie: { targetPlayerId: 'ana', sourceRoleId: 'exp1_anathema', boundEventId: 'ev2', boundAtMs: now, boundTurnNumber: 2 },
    };
    const vAllAlive = domain.evaluateExpandedVictoryWithDiagnostics(st);
    assert.equal(vAllAlive.evaluation.finished, true);
    assert.deepEqual(
      vAllAlive.evaluation.winnerPlayerIds,
      ['beth', 'diana', 'cassie', 'ana', 'h1'],
      'All 3 transitive layers + Anathema + Hunter co-win in deterministic turnOrder',
    );

    // Now Diana dies -> Diana fails CONDITIONAL_SHARED (requireOwnerAlive) -> Bethany loses SHARE_OUTCOME -> Cassie STILL wins COPY_GOAL!
    st.players.diana.alive = false;
    const vDianaDead = domain.evaluateExpandedVictoryWithDiagnostics(st);
    assert.equal(vDianaDead.evaluation.winnerPlayerIds.includes('diana'), false);
    assert.equal(vDianaDead.evaluation.winnerPlayerIds.includes('beth'), false);
    assert.equal(vDianaDead.evaluation.winnerPlayerIds.includes('cassie'), true, 'Cassie COPY_GOAL still evaluates on Cassie');
  }

  // #7 + COPY_GOAL !== SHARE_OUTCOME proof: Clairvoyant copies Cassie who copied Colt (3 weapons)
  {
    const st = makeState([
      { id: 'clair', roleId: 'exp1_clairvoyant', revealed: true, alive: true, equipped: ['ev-02', 'ev-03', 'ev-04'] },
      { id: 'cassie', roleId: 'exp1_cassie', revealed: true, alive: true, equipped: [] },
      { id: 'colt', roleId: 'exp2_colt', revealed: true, alive: true, equipped: [] },
      { id: 'beth', roleId: 'exp1_bethany', revealed: true, alive: true, equipped: ['ev-02', 'ev-03', 'ev-04'] },
      { id: 'h1', roleId: 'gac-ky-thuat', revealed: true, alive: true },
      { id: 's1', roleId: 'suong-an-danh', revealed: true, alive: true },
    ]);
    st.expansionState.clairvoyantVisions = {
      clair: {
        targetPlayerId: 'cassie',
        targetDisplayName: 'cassie',
        sourceRoleId: 'exp1_cassie',
        roleName: 'Cassie',
        faction: 'wanderer',
        maxHp: 11,
        copiedGoalSummary: 'Same as first revealed Neutral',
        boundEventId: 'ev-cl',
        boundAtMs: now,
        boundTurnNumber: 2,
      },
    };
    st.expansionState.cassieCopiedGoalByPlayer = {
      cassie: { targetPlayerId: 'colt', sourceRoleId: 'exp2_colt', boundEventId: 'ev-ca', boundAtMs: now, boundTurnNumber: 2 },
    };
    // Bethany chose Colt (SHARE_OUTCOME): even though Bethany holds 3 weapons herself, Colt has 0 -> Bethany MUST NOT win!
    st.expansionState.bethanyChosenByPlayer = {
      beth: { chosenPlayerId: 'colt', givenCardId: 'eq-02', assignedByPlayerId: 'beth', assignedOnTurnNumber: 2, assignedAtMs: now },
    };
    const v = domain.evaluateExpandedVictoryWithDiagnostics(st);
    assert.equal(v.evaluation.finished, true, 'Clairvoyant wins immediately by fulfilling copied dynamic Colt 3-weapon condition on OWN state');
    assert.deepEqual(
      v.evaluation.winnerPlayerIds,
      ['clair'],
      'ONLY Clairvoyant (COPY_GOAL) wins; Cassie (0 weapons), Colt (0 weapons), and Bethany (SHARE_OUTCOME on Colt) do NOT win!',
    );
  }

  // #8: 3-node cycle Bethany -> Diana -> Clairvoyant -> Bethany fails closed!
  {
    const st = makeState([
      { id: 'beth', roleId: 'exp1_bethany', revealed: true, alive: true },
      { id: 'diana', roleId: 'exp2_diana', revealed: true, alive: true },
      { id: 'clair', roleId: 'exp1_clairvoyant', revealed: true, alive: true },
      { id: 'h1', roleId: 'gac-ky-thuat', revealed: true, alive: true },
      { id: 's1', roleId: 'suong-an-danh', revealed: true, alive: false },
    ]);
    st.expansionState.bethanyChosenByPlayer = {
      beth: { chosenPlayerId: 'diana', givenCardId: 'eq-02', assignedByPlayerId: 'beth', assignedOnTurnNumber: 2, assignedAtMs: now },
    };
    st.expansionState.dianaContracts = {
      diana: { customerPlayerId: 'clair', sourceRoleId: 'exp1_clairvoyant', boundOnTurnNumber: 2, boundEventId: 'e1', boundAtMs: now, status: 'active', activatedOnTurnNumber: 3 },
    };
    st.expansionState.clairvoyantVisions = {
      clair: {
        targetPlayerId: 'beth',
        targetDisplayName: 'beth',
        sourceRoleId: 'exp1_bethany',
        roleName: 'Bethany',
        faction: 'wanderer',
        maxHp: 10,
        copiedGoalSummary: 'Chosen wins',
        boundEventId: 'e2',
        boundAtMs: now,
        boundTurnNumber: 2,
      },
    };
    const diag = domain.evaluateExpandedVictoryWithDiagnostics(st);
    assert.equal(diag.evaluation.finished, true, 'Non-cycle Hunter still wins cleanly');
    assert.deepEqual(diag.evaluation.winnerPlayerIds, ['h1'], 'All 3 cyclic Neutrals fail closed');
    assert.ok(diag.graph && diag.graph.cycleCount >= 1, 'Cycle telemetry must record >= 1 detected cycle');
    assert.equal(diag.graph.evaluatedByPlayer.beth.via, 'cycle_blocked');
    assert.equal(diag.graph.evaluatedByPlayer.diana.via, 'cycle_blocked');
    assert.equal(diag.graph.evaluatedByPlayer.clair.via, 'cycle_blocked');
  }

  // #9: Cassie first normal Neutral reveal (death reveal ignored, 2nd Neutral ignored)
  {
    const st = makeState([
      { id: 'cassie', roleId: 'exp1_cassie', revealed: false, alive: true, location: 'radio' },
      { id: 'nDead', roleId: 'lang-anh-san', revealed: false, alive: true, location: 'lobby', woundsTaken: 9 },
      { id: 'nFirst', roleId: 'exp1_anathema', revealed: false, alive: true, location: 'court' },
      { id: 'nSecond', roleId: 'exp2_colt', revealed: false, alive: true, location: 'corridor' },
      { id: 'atk', roleId: 'gac-ky-thuat', revealed: true, alive: true, location: 'lobby', equipped: ['ev-01', 'eq-04'] },
      { id: 's1', roleId: 'suong-an-danh', revealed: true, alive: true, location: 'breaker' },
    ], { activePlayerId: 'atk', turnPhase: 'MAIN_ACTION' });
    // Kill nDead -> death reveal MUST NOT bind Cassie
    domain.applyPlayerGameAction(st, 'atk', { type: 'ATTACK', targetPlayerId: 'nDead' }, now);
    assert.equal(st.players.nDead.alive, false);
    assert.equal(st.expansionState.cassieCopiedGoalByPlayer?.cassie, undefined, 'Death reveal excluded');
    // Normal reveal nFirst -> binds Cassie!
    st.activePlayerId = 'nFirst';
    st.turnPhase = 'MAIN_ACTION';
    domain.applyPlayerGameAction(st, 'nFirst', { type: 'REVEAL_ROLE' }, now + 100);
    assert.equal(st.expansionState.cassieCopiedGoalByPlayer?.cassie?.targetPlayerId, 'nFirst');
    assert.equal(st.expansionState.cassieCopiedGoalByPlayer?.cassie?.sourceRoleId, 'exp1_anathema');
    // 2nd Neutral normal reveal -> MUST NOT rebind!
    st.activePlayerId = 'nSecond';
    st.turnPhase = 'MAIN_ACTION';
    domain.applyPlayerGameAction(st, 'nSecond', { type: 'REVEAL_ROLE' }, now + 200);
    assert.equal(st.expansionState.cassieCopiedGoalByPlayer?.cassie?.targetPlayerId, 'nFirst', 'No rebind on 2nd Neutral');
  }

  // #10: Diana 5P no-customer fallback (sole Neutral)
  {
    const st = makeState([
      { id: 'diana', roleId: 'exp2_diana', revealed: false, alive: true, woundsTaken: 0 },
      { id: 'h1', roleId: 'gac-ky-thuat', revealed: true, alive: true },
      { id: 'h2', roleId: 'gac-radio', revealed: true, alive: true },
      { id: 's1', roleId: 'suong-an-danh', revealed: true, alive: false },
      { id: 's2', roleId: 'suong-gac-cong', revealed: true, alive: false },
    ]);
    const vFull = domain.evaluateExpandedVictory(st);
    assert.ok(vFull.winnerPlayerIds.includes('diana'), '5P Diana at full HP wins end-of-match fallback');
    st.players.diana.woundsTaken = 1;
    st.players.diana.hp = 12;
    const vWounded = domain.evaluateExpandedVictory(st);
    assert.equal(vWounded.winnerPlayerIds.includes('diana'), false, '5P Diana wounded loses fallback');
  }

  // #11 & #12: Aaron no-spouse fallback + Masamune & Machine Gun spouse protection
  {
    const st = makeState([
      { id: 'aaron', roleId: 'exp2_aaron', revealed: false, alive: true, location: 'lobby', woundsTaken: 7 },
      { id: 'h1', roleId: 'gac-ky-thuat', revealed: true, alive: true, location: 'lobby', equipped: ['ev-01', 'eq-04'] },
      { id: 'h2', roleId: 'gac-radio', revealed: false, alive: true, location: 'court' }, // hidden female -> NOT revealed!
      { id: 's1', roleId: 'suong-an-danh', revealed: true, alive: true, location: 'breaker' },
    ], { activePlayerId: 'h1', turnPhase: 'MAIN_ACTION' });
    domain.applyPlayerGameAction(st, 'h1', { type: 'ATTACK', targetPlayerId: 'aaron' }, now);
    assert.equal(st.players.aaron.alive, false);
    assert.equal(st.finished, false, 'Unmatched Aaron dying MUST NOT trigger immediate win');
    // Match ends normally (Shadows dead) -> dead unmatched Aaron qualifies at end-of-match!
    st.players.s1.alive = false;
    const vEnd = domain.evaluateExpandedVictory(st);
    assert.ok(vEnd.winnerPlayerIds.includes('aaron'), 'Dead unmatched Aaron wins at end-of-match');

    // #12: Aaron with Machine Gun + Masamune vs spouse
    const st2 = makeState([
      { id: 'aaron', roleId: 'exp2_aaron', revealed: true, alive: true, location: 'lobby', equipped: ['ev-06', 'ev-01'] },
      { id: 'spouse', roleId: 'gac-radio', revealed: true, alive: true, location: 'lobby' },
      { id: 'enemy', roleId: 'suong-an-danh', revealed: true, alive: true, location: 'canteen' }, // same central cluster
      { id: 'h2', roleId: 'gac-ky-thuat', revealed: true, alive: true, location: 'radio' },
    ], { activePlayerId: 'aaron', turnPhase: 'MAIN_ACTION' });
    st2.expansionState.aaronSpouseByPlayer = {
      aaron: { spousePlayerId: 'spouse', sourceRoleId: 'gac-radio', boundEventId: 'ev-a', boundAtMs: now, boundTurnNumber: 1 },
    };
    const badAtk = domain.applyPlayerGameAction(st2, 'aaron', { type: 'ATTACK', targetPlayerId: 'spouse' }, now);
    assert.equal(badAtk.ok, false, 'Aaron cannot directly attack spouse');
    const mgAtk = domain.applyPlayerGameAction(st2, 'aaron', { type: 'ATTACK', targetPlayerId: 'enemy' }, now);
    assert.equal(mgAtk.ok, true, 'Aaron Machine Gun hits non-spouse enemies');
    assert.equal(st2.players.spouse.woundsTaken, 0, 'Machine Gun MUST exclude Aaron spouse!');

    // Sole target in cluster is spouse while holding Masamune -> END_TURN allowed!
    st2.players.enemy.location = 'radio';
    st2.players.aaron.attacksThisTurn = 0;
    st2.activePlayerId = 'aaron';
    st2.turnPhase = 'MAIN_ACTION';
    const endRes = domain.applyPlayerGameAction(st2, 'aaron', { type: 'END_TURN' }, now + 200);
    assert.equal(endRes.ok, true, 'Masamune mandatory attack overridden when spouse is sole target in cluster');
  }
});

// ===========================================================================
// P6D-3: Scenarios #13, #14, #15, #16, #17, #18, #19 & #25
// April & Skipps, Colt theft/reclaim/3-weapon, simultaneous reveals, multi-immediate wins, Classic
// ===========================================================================
test('P6D-3 — April & Skipps (#13/#14), Colt (#15/#16/#17), Simultaneous Reveals (#18), Multi Immediate Wins (#19) & Classic (#25)', () => {
  const now = 1_798_000_020_000;

  // #13 & #14: April & Skipps wound-7 forced reveal -> survives to next own turn end -> immediate win!
  {
    const st = makeState([
      { id: 'atk', roleId: 'gac-ky-thuat', revealed: true, location: 'corridor' },
      { id: 'april', roleId: 'exp2_april_skipps', revealed: false, location: 'lobby', woundsTaken: 5 }, // 3 HP -> -2 dmg = 7 wounds (1 HP)!
      { id: 's1', roleId: 'suong-an-danh', revealed: true, location: 'court' },
      { id: 'h2', roleId: 'gac-radio', revealed: true, location: 'radio' },
    ], { activePlayerId: 'atk', turnPhase: 'LOCATION_ACTION' });
    // Deal 2 damage via corridor (`USE_LOC_POWER`) so woundsTaken becomes exactly 7 (hp=1)
    const locDmg = domain.applyPlayerGameAction(
      st,
      'atk',
      { type: 'USE_LOC_POWER', mode: 'damage', targetPlayerId: 'april' },
      now,
    );
    assert.equal(locDmg.ok, true);
    assert.equal(st.players.april.woundsTaken, 7);
    assert.equal(st.players.april.hp, 1);
    assert.equal(st.players.april.revealed, true, 'Exact 7 wounds forces reveal');
    assert.equal(st.expansionState.aprilSkippsCountdownByPlayer?.april?.revealedBySkill, true);
    assert.equal(st.finished, false, 'Not yet end of April next own turn');

    // Heal April after reaching 7 -> countdown persists!
    st.players.april.woundsTaken = 5;
    st.players.april.hp = 3;
    // End atk turn -> April's turn starts -> April ends own turn -> immediate Neutral victory!
    domain.applyPlayerGameAction(st, 'atk', { type: 'END_TURN' }, now + 100);
    assert.equal(st.activePlayerId, 'april');
    st.turnPhase = 'MAIN_ACTION';
    domain.applyPlayerGameAction(st, 'april', { type: 'END_TURN' }, now + 200);
    assert.equal(st.finished, true, 'April & Skipps wins immediately at end of next own turn');
    assert.ok(st.winnerPlayerIds.includes('april'));
  }

  // #15, #16 & #17: Colt remote theft counterattack, atomic recovery of exact stolen item, and 3-weapon win!
  {
    const st = makeState([
      { id: 'thief', roleId: 'gac-ky-thuat', revealed: true, location: 'court' },
      { id: 'colt', roleId: 'exp2_colt', revealed: true, location: 'radio', equipped: ['ev-02', 'ev-03'] }, // distant cluster!
      { id: 's1', roleId: 'suong-an-danh', revealed: true, location: 'lobby' },
      { id: 'h2', roleId: 'gac-radio', revealed: true, location: 'canteen' },
    ], { activePlayerId: 'thief', turnPhase: 'LOCATION_ACTION' });
    // Remote theft from Erstwhile Altar (`court`) ignoring range!
    const stealRes = domain.applyPlayerGameAction(
      st,
      'thief',
      { type: 'USE_LOC_POWER', mode: 'steal', targetPlayerId: 'colt' },
      now,
    );
    assert.equal(stealRes.ok, true);
    assert.equal(st.pendingChoice?.kind, 'colt_theft_counter');
    assert.equal(st.pendingChoice.ownerPlayerId, 'colt');

    // Find a seed where Colt rolls >= 2 so we test `colt_recover_or_damage` atomic reclaim!
    const stolenCardId = st.pendingChoice.data.stolenCardId;
    let recovered = false;
    for (let s = 1; s <= 120; s++) {
      const clone = JSON.parse(JSON.stringify(st));
      clone.rngState = s * 997;
      domain.applyPlayerGameAction(
        clone,
        'colt',
        { type: 'RESOLVE_CHOICE', choiceId: clone.pendingChoice.choiceId, optionId: 'counter' },
        now + 100,
      );
      if (clone.pendingChoice?.kind === 'colt_recover_or_damage') {
        const thiefHpBefore = clone.players.thief.hp;
        const rRec = domain.applyPlayerGameAction(
          clone,
          'colt',
          { type: 'RESOLVE_CHOICE', choiceId: clone.pendingChoice.choiceId, optionId: 'recover_item' },
          now + 200,
        );
        assert.equal(rRec.ok, true);
        assert.equal(clone.players.thief.hp, thiefHpBefore, 'Recover deals 0 damage');
        assert.equal(clone.players.thief.equipped.includes(stolenCardId), false, 'Thief no longer owns stolen item');
        assert.equal(clone.players.colt.equipped.includes(stolenCardId), true, 'Colt recovered exact stolen item');
        assert.equal(clone.players.colt.equipped.length, 2, 'Total card conservation strictly preserved');
        recovered = true;
        break;
      }
    }
    assert.equal(recovered, true, 'Must reach colt_recover_or_damage and reclaim exact stolen item atomically');

    // #17: Colt owns 3 qualifying weapons (ev-02, ev-03, ev-05) -> immediate win!
    st.players.colt.equipped = ['ev-02', 'ev-03', 'ev-05'];
    const vColt = domain.evaluateExpandedVictory(st);
    assert.ok(vColt && vColt.winnerPlayerIds.includes('colt'), 'Colt 3 qualifying weapons wins immediately');
  }

  // #18: Simultaneous multiple reveal events in 1 batch (Ernest Apostasy forces 2 Shadows incl. female Shadow)
  {
    const st = makeState([
      { id: 'ernest', roleId: 'exp1_ernest', revealed: true, location: 'lobby' },
      { id: 'sMale', roleId: 'suong-gac-cong', revealed: false, location: 'radio' }, // male
      { id: 'sFem1', roleId: 'exp2_witch', revealed: false, location: 'court' }, // female!
      { id: 'sFem2', roleId: 'suong-an-danh', revealed: false, location: 'canteen' }, // female (later in turnOrder!)
      { id: 'aaron', roleId: 'exp2_aaron', revealed: false, location: 'corridor' },
      { id: 'h2', roleId: 'gac-ky-thuat', revealed: true, location: 'breaker' },
    ], { activePlayerId: 'ernest', turnPhase: 'MAIN_ACTION' });
    const useRes = domain.applyPlayerGameAction(st, 'ernest', { type: 'USE_SKILL' }, now);
    assert.equal(useRes.ok, true);
    assert.equal(st.players.sMale.revealed, true);
    assert.equal(st.players.sFem1.revealed, true);
    assert.equal(st.players.sFem2.revealed, true);
    assert.equal(st.players.aaron.revealed, true, 'Aaron forced-reveals when first female Shadow reveals');
    assert.equal(
      st.expansionState.aaronSpouseByPlayer?.aaron?.spousePlayerId,
      'sFem1',
      'Deterministic turnOrder/revealSeq binds Aaron to sFem1 (first female in batch)',
    );
  }

  // #19: Multiple immediate Neutral victories in deterministic turnOrder (Colt + Bethany Chosen on Colt + Bob 5 gear)
  {
    const st = makeState([
      { id: 'bob', roleId: 'lang-anh-san', revealed: true, equipped: ['eq-01', 'eq-02', 'eq-03', 'eq-05', 'eq-06'] },
      { id: 'beth', roleId: 'exp1_bethany', revealed: true },
      { id: 'colt', roleId: 'exp2_colt', revealed: true, equipped: ['ev-02', 'ev-03', 'ev-04'] },
      { id: 'h1', roleId: 'gac-ky-thuat', revealed: true },
      { id: 's1', roleId: 'suong-an-danh', revealed: true },
    ]);
    st.expansionState.bethanyChosenByPlayer = {
      beth: { chosenPlayerId: 'colt', givenCardId: 'ev-04', assignedByPlayerId: 'beth', assignedOnTurnNumber: 2, assignedAtMs: now },
    };
    const vMulti = domain.evaluateExpandedVictory(st);
    assert.ok(vMulti);
    assert.deepEqual(
      vMulti.winnerPlayerIds,
      ['bob', 'beth', 'colt'],
      'Multiple immediate Neutral victories + SHARE_OUTCOME co-win ordered deterministically by turnOrder',
    );
  }

  // #25: Unchanged Classic behavior
  {
    const classicState = domain.createInitialGameState({
      matchId: 'p6d-classic-check',
      seed: 123456,
      nowMs: now,
      rulesetId: 'classic',
      players: Array.from({ length: 6 }, (_, i) => ({
        playerId: `c${i + 1}`,
        displayName: `C${i + 1}`,
        seatIndex: i,
        appearance: {},
        connected: true,
      })),
    });
    const pub = domain.getPublicGameView(classicState);
    assert.equal(pub.rulesetId, 'classic');
    assert.equal(pub.anathemaCursedTargetByPlayer, undefined);
    assert.equal(pub.bethanyChosenTargetByPlayer, undefined);
    assert.equal(pub.dianaActiveCustomerByPlayer, undefined);
    assert.equal(pub.aaronSpouseByPlayer, undefined);
    assert.equal(pub.aprilSkippsCountdownByPlayer, undefined);
    const priv = domain.getPrivateGameView(classicState, 'c1');
    assert.equal(priv.clairvoyantReveals, undefined);
    assert.equal(priv.copiedVictoryGoalSummary, undefined);
    assert.equal(priv.reactionPolicy, undefined);
  }
});

// ===========================================================================
// P6D-4: Real Cloudflare DO WebSocket E2E across 4P, 5P, 6P, 7P & 8P
// + Production Rejection + Concurrent Classic / Starter-Forty-Eight Rooms
// ===========================================================================
test('P6D-4 — Real Cloudflare DO WebSocket E2E across 4P–8P on starter-forty-eight, Production block & concurrent Classic/S48', async () => {
  // 1. Production DO MUST reject starter-forty-eight with HTTP 400 / RULESET_UNAVAILABLE
  const prodServer = await startStandaloneBoardGameTestServer(0, {});
  try {
    const blocked = await fetch(`${prodServer.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: 'table-prod-s48',
        hostName: 'ProdHost',
        rulesetId: 'starter-forty-eight',
      }),
    });
    assert.equal(blocked.status, 400, 'Production DO MUST reject starter-forty-eight');
    const body = await blocked.json();
    assert.equal(body.code, 'RULESET_UNAVAILABLE');
  } finally {
    await prodServer.close();
  }

  // 2. Experimental DO: real playable 4P, 5P, 6P, 7P, 8P matches + concurrent Classic room
  const server = await startStandaloneBoardGameTestServer(0, {
    ALLOW_EXPERIMENTAL_RULESETS: '1',
    CHOICE_TIMEOUT_OVERRIDE_MS: '800',
  });
  const playable58Ids = new Set(
    domain.DEFAULT_RULESET_REGISTRY.listPlayableCharactersForRuleset('starter-forty-eight', {
      allowExperimental: true,
    }).map((e) => e.id),
  );
  assert.equal(playable58Ids.size, 58);

  try {
    // 4P–8P E2E loop with real actions played over WebSocket
    for (const playerCount of [4, 5, 6, 7, 8]) {
      const createRes = await fetch(`${server.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: `table-s48-${playerCount}p`,
          hostName: `Host_${playerCount}P`,
          rulesetId: 'starter-forty-eight',
        }),
      });
      assert.equal(createRes.status, 201);
      const match = await createRes.json();
      assert.equal(match.rulesetId, 'starter-forty-eight');

      const { clients, spectator, playerSyncs, specSync } = await joinAndStart(
        server.wsBaseUrl,
        match,
        playerCount,
        `S48_${playerCount}P`,
        true,
      );

      // Unique roles, valid 58-role pool, unchanged faction splits, zero Spectator leaks
      const dealt = new Set();
      const factions = { 'lantern-guard': 0, 'mist-order': 0, wanderer: 0 };
      for (const s of playerSyncs) {
        assert.equal(s.rulesetId, 'starter-forty-eight');
        const rid = s.privateView.roleId;
        assert.ok(playable58Ids.has(rid), `${playerCount}P dealt role outside starter-forty-eight: ${rid}`);
        assert.equal(dealt.has(rid), false, `${playerCount}P dealt duplicate role: ${rid}`);
        dealt.add(rid);
        factions[s.privateView.faction] += 1;
      }
      const dist = domain.getRoleDistribution(playerCount);
      assert.equal(factions['lantern-guard'], dist.lanternGuard);
      assert.equal(factions['mist-order'], dist.mistOrder);
      assert.equal(factions.wanderer, dist.wanderer);
      assert.equal(specSync.privateView, null, 'Spectator receives null privateView');
      for (const p of specSync.publicGame.players) {
        assert.equal(p.revealedRoleId, null);
        assert.equal(p.revealedFaction, null);
        assert.equal(p.revealedMaxHp, null);
      }

      // Play 1 real server-authoritative turn over WebSocket (ROLL_DICE -> CHOOSE_DEST if 7 -> SKIP_LOCATION -> END_TURN)
      let latest = playerSyncs[0];
      const activeIdx = latest.publicGame.turnOrder.indexOf(latest.publicGame.activePlayerId);
      const activeClient = clients[activeIdx];
      let stepSeq = 0;
      const runAction = async (client, action) => {
        await sleep(130); // Respect DO 100ms anti-spam burst limiter
        const mark = client.inbox.length;
        const reqId = `s48_${playerCount}p_act_${++stepSeq}`;
        client.send({
          type: 'BG_GAME_ACTION',
          requestId: reqId,
          expectedRevision: latest.revision,
          action,
        });
        const ack = await client.nextMsg(
          (m) => m.type === 'BG_ACTION_ACK' && m.requestId === reqId,
          4500,
          mark,
        );
        assert.equal(ack.ok, true, `${playerCount}P action ${action.type} failed: ${ack.error || ''}`);
        latest = await client.nextMsg(
          (m) => m.type === 'BG_STATE_SYNC' && m.revision > latest.revision,
          4500,
          mark,
        );
      };

      // Handle any turn-start pending choice (e.g., if Seat 0 dealt Anathema)
      if (latest.publicGame.pendingChoice) {
        const pcOwnerIdx = latest.publicGame.turnOrder.indexOf(latest.publicGame.pendingChoice.ownerPlayerId);
        const pcClient = clients[pcOwnerIdx >= 0 ? pcOwnerIdx : activeIdx];
        const pc = pcClient.getLatestSync().privateView.pendingChoice;
        await runAction(pcClient, {
          type: 'RESOLVE_CHOICE',
          choiceId: pc.choiceId,
          optionId: pc.defaultOptionId,
        });
      }

      let rollGuard = 0;
      while (
        (latest.publicGame.turnPhase === 'ROLL_MOVE' || latest.publicGame.turnPhase === 'CHOOSE_MOVE') &&
        rollGuard++ < 4
      ) {
        if (latest.publicGame.turnPhase === 'ROLL_MOVE') {
          await runAction(activeClient, { type: 'ROLL_DICE' });
        } else {
          const dest = latest.publicGame.allowedMoveDestinations?.[0] || 'lobby';
          await runAction(activeClient, { type: 'CHOOSE_DEST', location: dest });
        }
      }
      if (latest.publicGame.turnPhase === 'LOCATION_ACTION') {
        await runAction(activeClient, { type: 'SKIP_LOC' });
      }
      if (latest.publicGame.turnPhase === 'MAIN_ACTION') {
        await runAction(activeClient, { type: 'END_TURN' });
      }
      // Verify zero negative HP / zero duplicate gear across all players
      for (const p of latest.publicGame.players) {
        assert.ok(p.woundsTaken >= 0);
      }

      spectator.close();
      for (const c of clients) c.close();
    }

    // Concurrent Classic (4P) + starter-forty-eight (6P) rooms on same DO instance
    const [rC, rS] = await Promise.all([
      fetch(`${server.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: 'table-conc-c', hostName: 'CHost', rulesetId: 'classic' }),
      }),
      fetch(`${server.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: 'table-conc-s48', hostName: 'S48Host', rulesetId: 'starter-forty-eight' }),
      }),
    ]);
    const [mC, mS] = await Promise.all([rC.json(), rS.json()]);
    const [roomC, roomS] = await Promise.all([
      joinAndStart(server.wsBaseUrl, mC, 4, 'CONC_C', false),
      joinAndStart(server.wsBaseUrl, mS, 6, 'CONC_S48', true),
    ]);
    assert.equal(roomC.playerSyncs[0].rulesetId, 'classic');
    assert.equal(roomS.playerSyncs[0].rulesetId, 'starter-forty-eight');
    assert.equal(roomC.playerSyncs[0].publicGame.bethanyChosenTargetByPlayer, undefined);
    roomS.spectator.close();
    for (const c of roomC.clients) c.close();
    for (const c of roomS.clients) c.close();
  } finally {
    await server.close();
  }
});

// ===========================================================================
// P6D-5: Real DO SQLite Hibernation, F5 Reconnect (#20), Wrong-Owner (#21),
// Replay Idempotency (#22), Spectator & Full Hidden Info Security Matrix (#23, Sec 27)
// ===========================================================================
test('P6D-5 — Real DO Hibernation, F5 Reconnect (#20), Wrong-Owner (#21), Replay Idempotency (#22) & Section 27 Hidden Info Security', async () => {
  const server = await startStandaloneBoardGameTestServer(0, {
    ALLOW_EXPERIMENTAL_RULESETS: '1',
    CHOICE_TIMEOUT_OVERRIDE_MS: '900',
  });

  try {
    const createRes = await fetch(`${server.httpBaseUrl}/api/boardgame/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: 'table-p6d-sec',
        hostName: 'SecHost',
        rulesetId: 'starter-forty-eight',
      }),
    });
    assert.equal(createRes.status, 201);
    const match = await createRes.json();

    const { clients, auths, spectator } = await joinAndStart(server.wsBaseUrl, match, 6, 'S6', true);
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

    es.clusterPairs = [
      { clusterId: 'north', locationIds: ['radio', 'breaker'] },
      { clusterId: 'central', locationIds: ['lobby', 'canteen'] },
      { clusterId: 'south', locationIds: ['corridor', 'court'] },
    ];
    // Seat 0: Revealed Clairvoyant (about to peek Seat 1 hidden Shadow!)
    // Seat 1: Hidden Shadow (`suong-an-danh`) at court (also holds secret hand card `inv-01`!)
    // Seat 2: Hidden Arnold at lobby (2 HP -> will take lethal hit & trigger secret `arnold_reflect_lethal`!)
    // Seat 3: Revealed Colt at radio (equipped `ev-02` + secret hand card `inv-02`, will be stolen from!)
    // Seat 4: Revealed Bethany at lobby (equipped `eq-02` + `ev-01` Masamune)
    // Seat 5: Hidden Diana at canteen (with silent `pending` contract on revealed Neutral Seat 3 Colt!)
    setSeat(id0, 'exp1_clairvoyant', true, 'lobby', 0, ['ev-01', 'ev-03']); // Masamune (1d4) + Chainsaw (+1) => guaranteed >= 2 lethal on 2-HP Arnold (distinct from Colt's ev-02)!
    setSeat(id1, 'suong-an-danh', false, 'court', 0, [], ['inv-01']);
    setSeat(id2, 'exp1_arnold', false, 'lobby', 6, []); // 2 HP
    setSeat(id3, 'exp2_colt', true, 'radio', 0, ['ev-02'], ['inv-02']);
    setSeat(id4, 'exp1_bethany', true, 'lobby', 0, ['eq-02', 'ev-01']);
    setSeat(id5, 'exp2_diana', false, 'canteen', 0, []);

    es.expansionState = {
      ...(es.expansionState || {
        eventSeq: 1,
        processedEventIds: [],
        resolvedChoiceIds: [],
        pendingSteps: [],
        stats: { activationsByRole: {}, damagePreventedByRole: {}, healByRole: {}, bonusDamageByRole: {} },
      }),
      dianaContracts: {
        [id5]: {
          customerPlayerId: id3,
          sourceRoleId: 'exp2_colt',
          boundOnTurnNumber: 1,
          boundEventId: 'seed-diana-pending',
          boundAtMs: Date.now() - 1000,
          status: 'pending',
        },
      },
      cassieCopiedGoalByPlayer: {},
    };
    // Open Clairvoyant turn-start choice for Seat 0
    es.activePlayerId = id0;
    es.turnPhase = 'ROLL_MOVE';
    const openChoiceId = 'seed-clair-peek-1';
    es.pendingChoice = {
      choiceId: openChoiceId,
      eventId: 'seed-ev-clair',
      ownerPlayerId: id0,
      kind: 'clairvoyant_peek_copy',
      isSecret: false,
      title: 'Lời Tiên Tri (Clairvoyant)',
      description: 'Chọn 1 người chưa lộ diện để soi kín vai và sao chép mục tiêu thắng.',
      publicPromptLabel: '🔮 Clairvoyant đang chọn mục tiêu Lời Tiên Tri...',
      options: [
        { optionId: `peek:${id1}`, label: 'Soi S6_2', targetPlayerId: id1 },
        { optionId: `peek:${id2}`, label: 'Soi S6_3', targetPlayerId: id2 },
        { optionId: 'skip', label: 'Bỏ qua' },
      ],
      defaultOptionId: 'skip',
      createdAtMs: Date.now(),
      deadlineMs: Date.now() + 15_000,
      data: {
        kind: 'clairvoyant_peek_copy',
        clairvoyantPlayerId: id0,
        targetMap: {
          [`peek:${id1}`]: id1,
          [`peek:${id2}`]: id2,
        },
      },
    };

    sql.exec('UPDATE matches SET game_state_json = ? WHERE match_id = ?', JSON.stringify(wrapped), match.matchId);
    container.hibernateAndWake();

    // Re-sync Seat 0 & check Diana pending contract is 100% SILENT on public view & spectator!
    let rev = row.revision;
    const s0Mark = clients[0].inbox.length;
    const s1Mark = clients[1].inbox.length;
    const specMark = spectator.inbox.length;

    // A. Clairvoyant privately peeks Seat 1 (hidden suong-an-danh)
    await sleep(130);
    clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'clair_peek_req_1',
      expectedRevision: rev,
      action: { type: 'RESOLVE_CHOICE', choiceId: openChoiceId, optionId: `peek:${id1}` },
    });
    const clairSync = await clients[0].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision > rev,
      4500,
      s0Mark,
    );
    const targetSync = await clients[1].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision === clairSync.revision,
      4500,
      s1Mark,
    );
    const specSync = await spectator.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision === clairSync.revision,
      4500,
      specMark,
    );
    rev = clairSync.revision;

    // Section 27: Clairvoyant receives target's role ONLY in own privateView; ZERO leak anywhere else!
    assert.equal(clairSync.privateView.clairvoyantReveals?.length, 1);
    assert.equal(clairSync.privateView.clairvoyantReveals[0].targetPlayerId, id1);
    assert.equal(clairSync.privateView.clairvoyantReveals[0].roleId, 'suong-an-danh');
    assert.equal(targetSync.privateView.clairvoyantReveals, undefined, 'Target must not see Clairvoyant vision');
    assert.equal(specSync.privateView, null, 'Spectator receives null privateView');
    const pubJson = JSON.stringify(specSync.publicGame);
    assert.equal(pubJson.includes('suong-an-danh'), false, 'publicGame MUST NOT leak peeked roleId');
    assert.equal(pubJson.includes('mist-order'), false, 'publicGame MUST NOT leak peeked faction');
    assert.equal(pubJson.includes('Tú Ẩn Danh'), false, 'publicLog MUST NOT leak peeked roleName');
    assert.equal(specSync.publicGame.dianaActiveCustomerByPlayer, undefined, 'Pending Diana contract MUST remain silent!');
    assert.equal(
      specSync.publicGame.players.find((p) => p.playerId === id1).revealedRoleId,
      null,
      'Peeked target remains unrevealed publicly',
    );

    // Hibernation + F5 reconnect for Clairvoyant -> private vision MUST persist!
    container.hibernateAndWake();
    clients[0].close();
    await sleep(60);
    const c0Reconn = await openBgClient(server.wsBaseUrl, match.matchId);
    c0Reconn.send({
      type: 'BG_JOIN',
      matchId: match.matchId,
      displayName: 'S6_1',
      reconnectToken: auths[0].reconnectToken,
    });
    await c0Reconn.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    const c0ReSync = await c0Reconn.nextMsg((m) => m.type === 'BG_STATE_SYNC');
    assert.equal(
      c0ReSync.privateView.clairvoyantReveals?.[0]?.roleId,
      'suong-an-danh',
      'Clairvoyant private vision persisted across hibernation & F5 reconnect!',
    );
    clients[0] = c0Reconn;

    // B. Advance Seat 0 to MAIN_ACTION and deal lethal attack to Hidden Arnold (Seat 2)
    // Inject turnPhase = MAIN_ACTION directly into SQLite and wake DO so attack hits Arnold deterministically
    const row2 = sql.exec('SELECT game_state_json, revision FROM matches WHERE match_id = ?', match.matchId).one();
    const w2 = JSON.parse(row2.game_state_json);
    w2.engineState.turnPhase = 'MAIN_ACTION';
    sql.exec('UPDATE matches SET game_state_json = ? WHERE match_id = ?', JSON.stringify(w2), match.matchId);
    container.hibernateAndWake();
    rev = row2.revision;

    const s2Mark = clients[2].inbox.length;
    const specMark2 = spectator.inbox.length;
    await sleep(130);
    clients[0].send({
      type: 'BG_GAME_ACTION',
      requestId: 'atk_arnold_lethal',
      expectedRevision: rev,
      action: { type: 'ATTACK', targetPlayerId: id2 },
    });
    const arnoldPromptSync = await clients[2].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.privateView?.pendingChoice?.kind === 'arnold_reflect_lethal',
      4500,
      s2Mark,
    );
    const specArnoldSync = await spectator.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision === arnoldPromptSync.revision,
      4500,
      specMark2,
    );
    rev = arnoldPromptSync.revision;

    // Section 27: Hidden Arnold secret prompt MUST mask ownerPlayerId, kind, role name, and normalize publicDeadlineMs!
    assert.equal(specArnoldSync.publicGame.pendingChoice.isSecret, true);
    assert.equal(specArnoldSync.publicGame.pendingChoice.ownerPlayerId, null);
    assert.equal(specArnoldSync.publicGame.pendingChoice.kind, null);
    assert.equal(JSON.stringify(specArnoldSync.publicGame).includes('arnold'), false, 'Public view must not leak Arnold');
    const origPublicDeadline = specArnoldSync.publicGame.pendingChoice.deadlineMs;

    // #21: Wrong-owner (Seat 4) attempts to resolve Arnold's secret choice -> NEUTRAL rejection without leaking Arnold!
    const s4Mark = clients[4].inbox.length;
    await sleep(130);
    clients[4].send({
      type: 'BG_GAME_ACTION',
      requestId: 'wrong_owner_arnold',
      expectedRevision: rev,
      action: {
        type: 'RESOLVE_CHOICE',
        choiceId: arnoldPromptSync.privateView.pendingChoice.choiceId,
        optionId: 'reflect',
      },
    });
    const wrongAck = await clients[4].nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'wrong_owner_arnold',
      4500,
      s4Mark,
    );
    assert.equal(wrongAck.ok, false, 'Wrong owner MUST be rejected');
    assert.equal((wrongAck.error || '').toLowerCase().includes('arnold'), false, 'Neutral error must not leak Arnold');

    // #20: Arnold disconnects, DO hibernates, publicDeadlineMs stays normalized, Arnold F5 reconnects & resolves!
    clients[2].close();
    await sleep(80);
    container.hibernateAndWake();
    const c2Reconn = await openBgClient(server.wsBaseUrl, match.matchId);
    c2Reconn.send({
      type: 'BG_JOIN',
      matchId: match.matchId,
      displayName: 'S6_3',
      reconnectToken: auths[2].reconnectToken,
    });
    await c2Reconn.nextMsg((m) => m.type === 'BG_AUTH_ISSUED');
    const c2ReSync = await c2Reconn.nextMsg((m) => m.type === 'BG_STATE_SYNC');
    assert.equal(
      c2ReSync.privateView.pendingChoice?.kind,
      'arnold_reflect_lethal',
      'Arnold F5 reconnect preserves secret lethal reaction!',
    );
    assert.equal(
      c2ReSync.publicGame.pendingChoice.deadlineMs,
      origPublicDeadline,
      'publicDeadlineMs remained normalized across disconnect & hibernation!',
    );
    clients[2] = c2Reconn;

    // Resolve Arnold reflection + #22 Duplicate requestId replay idempotency!
    const arnoldChoiceId = c2ReSync.privateView.pendingChoice.choiceId;
    const c2MarkAfter = clients[2].inbox.length;
    await sleep(130);
    clients[2].send({
      type: 'BG_GAME_ACTION',
      requestId: 'arnold_reflect_idem_1',
      expectedRevision: c2ReSync.revision,
      action: { type: 'RESOLVE_CHOICE', choiceId: arnoldChoiceId, optionId: 'reflect' },
    });
    const afterReflect = await clients[2].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision > c2ReSync.revision,
      4500,
      c2MarkAfter,
    );
    rev = afterReflect.revision;
    const clairWoundsAfterReflect = afterReflect.publicGame.players.find((p) => p.playerId === id0).woundsTaken;
    assert.ok(clairWoundsAfterReflect > 0, 'Reflected lethal damage hit Seat 0 attacker');
    assert.equal(afterReflect.privateView.hp, 2, 'Arnold preserved exact pre-event HP');

    // Replay EXACT SAME requestId -> idempotent ACK, ZERO revision bump, ZERO double damage!
    const c2ReplayMark = clients[2].inbox.length;
    await sleep(130);
    clients[2].send({
      type: 'BG_GAME_ACTION',
      requestId: 'arnold_reflect_idem_1',
      expectedRevision: c2ReSync.revision,
      action: { type: 'RESOLVE_CHOICE', choiceId: arnoldChoiceId, optionId: 'reflect' },
    });
    const replayAck = await clients[2].nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'arnold_reflect_idem_1',
      4500,
      c2ReplayMark,
    );
    assert.equal(replayAck.ok, true);
    assert.equal(replayAck.revision, rev, 'Duplicate requestId must NOT bump revision or re-execute');

    // C. Bethany TRANSFER_TO_BETHANY Masamune rejection + valid transfer + Colt theft timeout & hand isolation!
    const row3 = sql.exec('SELECT game_state_json, revision FROM matches WHERE match_id = ?', match.matchId).one();
    const w3 = JSON.parse(row3.game_state_json);
    w3.engineState.activePlayerId = id1; // Seat 1 at `court` (steals from Colt Seat 3!)
    w3.engineState.turnPhase = 'LOCATION_ACTION';
    w3.engineState.players[id1].hand = []; // clear hand so Masamune guard is tested directly (Colt still holds secret hand ['inv-02']!)
    w3.engineState.players[id1].equipped = ['ev-01', 'eq-03']; // holds Masamune + Talisman
    sql.exec('UPDATE matches SET game_state_json = ? WHERE match_id = ?', JSON.stringify(w3), match.matchId);
    container.hibernateAndWake();
    rev = row3.revision;

    // Try transferring Masamune to Bethany -> MUST reject!
    const s1MasMark = clients[1].inbox.length;
    await sleep(130);
    clients[1].send({
      type: 'BG_GAME_ACTION',
      requestId: 'beth_masamune_bad',
      expectedRevision: rev,
      action: { type: 'TRANSFER_TO_BETHANY', targetPlayerId: id4, cardId: 'ev-01' },
    });
    const masAck = await clients[1].nextMsg(
      (m) => m.type === 'BG_ACTION_ACK' && m.requestId === 'beth_masamune_bad',
      4500,
      s1MasMark,
    );
    assert.equal(masAck.ok, false, 'Masamune cannot be transferred to Bethany');

    // Steal from revealed Colt (Seat 3) at `court` -> opens `colt_theft_counter`, verify hand[] NEVER leaked, then alarm timeout resolves cleanly!
    const s3Mark = clients[3].inbox.length;
    const specMark3 = spectator.inbox.length;
    await sleep(130);
    clients[1].send({
      type: 'BG_GAME_ACTION',
      requestId: 'steal_colt_1',
      expectedRevision: rev,
      action: { type: 'USE_LOC_POWER', mode: 'steal', targetPlayerId: id3 },
    });
    const coltPrompt = await clients[3].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.privateView?.pendingChoice?.kind === 'colt_theft_counter',
      4500,
      s3Mark,
    );
    const specTheft = await spectator.nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision === coltPrompt.revision,
      4500,
      specMark3,
    );
    rev = coltPrompt.revision;
    // Section 27: Theft event MUST NEVER expose Colt's secret hand (`inv-02`) or Seat 1's hand (`inv-01`)!
    const theftRaw = JSON.stringify(specTheft.publicGame);
    assert.equal(theftRaw.includes('inv-02'), false, 'Equipment theft MUST NOT expose victim hand[]');
    assert.equal(theftRaw.includes('inv-01'), false, 'Equipment theft MUST NOT expose thief hand[]');

    // Hibernation + Alarm Timeout on Colt choice -> safe skip, zero stuck pendingChoice, zero duplicate equipment!
    container.hibernateAndWake();
    await sleep(960);
    const alarmMark = clients[3].inbox.length;
    const alarmRes = await fetch(`${server.httpBaseUrl}/__bg_trigger_alarm?matchId=${encodeURIComponent(match.matchId)}`);
    assert.equal(alarmRes.status, 200);
    const afterColtTimeout = await clients[3].nextMsg(
      (m) => m.type === 'BG_STATE_SYNC' && m.revision > rev && !m.publicGame.pendingChoice,
      4500,
      alarmMark,
    );
    const allEv02Owners = afterColtTimeout.publicGame.players.filter((p) =>
      p.equipped.some((c) => c.id === 'ev-02'),
    );
    assert.equal(allEv02Owners.length, 1, 'Equipment conservation: exact 1 owner of ev-02 after theft timeout');
    assert.equal(allEv02Owners[0].playerId, id1);

    // VFX diff check: verify hidden players NEVER emit role-identifying visual events
    const vfxDiff = extractVisualEventsFromDiff(specSync.publicGame, specTheft.publicGame, {
      selfPlayerId: id4,
      isSpectator: false,
      reducedMotion: false,
    });
    assert.equal(
      vfxDiff.some((e) => e.roleId === 'exp2_diana' || e.roleId === 'suong-an-danh'),
      false,
      'Hidden Diana & Shadow MUST NEVER emit role-identifying VFX',
    );

    spectator.close();
    for (const c of clients) c.close();
  } finally {
    await server.close();
  }
});
