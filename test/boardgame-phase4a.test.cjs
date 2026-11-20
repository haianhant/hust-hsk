'use strict';

/**
 * test/boardgame-phase4a.test.cjs — Phase 4A Baseline Reconciliation & Shared Engine Foundations
 *
 * Verifies:
 *  - P4A-1: Phase 3 simulation JSON & report reconciliation (`totalPendingChoicesResolved === 39533`)
 *  - P4A-2: Catalog faction partition consistency (`implemented + remaining === 17H / 18S / 21N`)
 *  - P4A-3: Canonical Shadow Hunters Card Metadata resolver (zero display-name coupling)
 *  - P4A-4: Dynamic `eq_chocolate` A/E/U eligibility (Classic untouched; Expanded derived from sourceName)
 *  - P4A-5: Remaining-HP helper & shuffled-cluster `listLivingPlayersInSameCluster` area scope
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

require('./register-ts.cjs');

const ROOT = path.resolve(__dirname, '..');

const {
  CANONICAL_SH_CARD_IDS,
  CARDS_CATALOG,
  CRUZ_QUALIFYING_CARD_IDS,
  DEFAULT_CHARACTER_REGISTRY,
  MASAMUNE_CARD_ID,
  createInitialGameState,
  getCardById,
  getCardIdByCanonicalShId,
  getCharacterSourceName,
  getRemainingHp,
  isCardCanonicalShId,
  isCruzQualifyingCardId,
  isEligibleForChocolateHeal,
  listLivingPlayersInSameCluster,
  applyPlayerGameAction,
} = require(path.join(ROOT, 'features/boardgame/domain/index.ts'));
const { sanitizeBoardGameAppearance } = require(path.join(ROOT, 'shared/contracts/boardgame.ts'));

test('P4A-1 — Phase 3 starter-sixteen JSON totalPendingChoicesResolved matches exact sum (39,533) & docs reconcile', () => {
  const simPath = path.join(ROOT, 'docs/boardgame-expansion/phase-3/starter-sixteen-sim-data.json');
  const sim = JSON.parse(fs.readFileSync(simPath, 'utf8'));
  const sum = Object.values(sim.pendingChoicesResolved).reduce((a, b) => a + b, 0);

  assert.equal(sum, 39533, 'Exact sum of starter-sixteen pendingChoicesResolved must be 39,533');
  assert.equal(
    sim.totalPendingChoicesResolved,
    sum,
    'starter-sixteen-sim-data.json must emit exact computed totalPendingChoicesResolved',
  );

  const simReport = fs.readFileSync(
    path.join(ROOT, 'docs/boardgame-expansion/phase-3/phase-3c-simulation-report.md'),
    'utf8',
  );
  const intReport = fs.readFileSync(
    path.join(ROOT, 'docs/boardgame-expansion/phase-3/integration-test-report.md'),
    'utf8',
  );
  assert.ok(simReport.includes('39,533'), 'phase-3c-simulation-report.md must report 39,533');
  assert.ok(intReport.includes('39,533'), 'integration-test-report.md must report 39,533');
  assert.equal(intReport.includes('49,533'), false, 'integration-test-report.md must not retain stale 49,533');
});

test('P4A-2 — Character catalog faction breakdown invariant (56 = 17H / 18S / 21N) & Phase 3 handoff erratum', () => {
  const cat = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'docs/boardgame-expansion/character-catalog.json'), 'utf8'),
  );
  assert.equal(cat.characters.length, 56);

  const totals = { hunter: 0, shadow: 0, neutral: 0 };
  const impl = { hunter: 0, shadow: 0, neutral: 0 };
  const rem = { hunter: 0, shadow: 0, neutral: 0 };

  for (const ch of cat.characters) {
    totals[ch.faction] += 1;
    if (ch.implementationStatus === 'implemented') {
      impl[ch.faction] += 1;
    } else {
      rem[ch.faction] += 1;
    }
    // Verify getCharacterSourceName stays 1-to-1 synced with CharacterRegistry
    const regEntry = DEFAULT_CHARACTER_REGISTRY.get(ch.id);
    assert.ok(regEntry, `Missing registry entry for ${ch.id}`);
    assert.equal(getCharacterSourceName(ch.id), regEntry.metadata.sourceName);
  }

  assert.deepEqual(totals, { hunter: 17, shadow: 18, neutral: 21 });
  assert.equal(impl.hunter + rem.hunter, 17);
  assert.equal(impl.shadow + rem.shadow, 18);
  assert.equal(impl.neutral + rem.neutral, 21);

  const handoff = fs.readFileSync(
    path.join(ROOT, 'docs/boardgame-expansion/phase-3/phase-3-handoff.md'),
    'utf8',
  );
  assert.ok(handoff.includes('10H / 11S / 19N'), 'phase-3-handoff.md must reflect corrected 10H / 11S / 19N');
});

test('P4A-3 — Canonical Shadow Hunters Card Metadata resolver validates 1-to-1 against CARDS_CATALOG', () => {
  assert.equal(CARDS_CATALOG.length, 40);
  assert.equal(getCardIdByCanonicalShId('vampire_bat'), 'ev-07');
  assert.equal(getCardIdByCanonicalShId('bloodthirsty_spider'), 'ev-08');
  assert.equal(getCardIdByCanonicalShId('dynamite'), 'ev-09');
  assert.equal(getCardIdByCanonicalShId('spiritual_doll'), 'ev-10');
  assert.equal(getCardIdByCanonicalShId('masamune'), 'ev-01');
  assert.equal(MASAMUNE_CARD_ID, 'ev-01');
  assert.deepEqual(CRUZ_QUALIFYING_CARD_IDS, ['ev-07', 'ev-08', 'ev-09', 'ev-10']);

  for (const [canonicalId, cardId] of Object.entries(CANONICAL_SH_CARD_IDS)) {
    const def = getCardById(cardId);
    assert.ok(def, `Canonical card ${canonicalId} -> ${cardId} missing from CARDS_CATALOG`);
    assert.equal(isCardCanonicalShId(cardId, canonicalId), true);
  }

  assert.equal(isCruzQualifyingCardId('ev-07'), true);
  assert.equal(isCruzQualifyingCardId('ev-08'), true);
  assert.equal(isCruzQualifyingCardId('ev-09'), true);
  assert.equal(isCruzQualifyingCardId('ev-10'), true);
  assert.equal(isCruzQualifyingCardId('ev-01'), false);
  assert.equal(isCruzQualifyingCardId('eq-11'), false);
});

test('P4A-4 — Dynamic eq_chocolate A/E/U eligibility preserves Classic bit-for-bit and derives Expansion from sourceName', () => {
  // Classic mode: strictly Allie, Emi, Unknown ONLY
  assert.equal(isEligibleForChocolateHeal('lang-quan-sat', false), true);
  assert.equal(isEligibleForChocolateHeal('gac-truc-ban', false), true);
  assert.equal(isEligibleForChocolateHeal('suong-tin-gia', false), true);
  assert.equal(isEligibleForChocolateHeal('gac-ky-thuat', false), false);
  assert.equal(isEligibleForChocolateHeal('exp1_undying', false), false);
  assert.equal(isEligibleForChocolateHeal('exp2_eleanor', false), false);

  // Expanded mode: dynamically derived from sourceName initial A/E/U (zero manual list)
  for (const okRole of [
    'lang-quan-sat', // Allie
    'gac-truc-ban', // Emi
    'suong-tin-gia', // Unknown
    'exp1_undying', // Undying
    'exp1_elysia', // Elysia
    'exp2_unchained', // Unchained
    'exp2_eleanor', // Eleanor
    'exp1_udi', // Udi
    'exp1_anathema', // Anathema
    'exp2_aaron', // Aaron
    'exp2_umibozu', // Umibozu
  ]) {
    assert.equal(isEligibleForChocolateHeal(okRole, true), true, `${okRole} must qualify in expanded mode`);
  }

  for (const noRole of [
    'gac-ky-thuat', // George
    'exp2_g43', // G43
    'exp1_fallen', // Fallen
    'exp1_fea', // Fea
    'exp2_fujiko', // Fujiko
    'exp1_wrath', // Wrath
    'exp1_vengeance', // Vengeance
    'exp2_visions', // Visions
    'exp2_cruz', // Cruz
    'exp2_bryon', // Bryon
  ]) {
    assert.equal(isEligibleForChocolateHeal(noRole, true), false, `${noRole} must NOT qualify in expanded mode`);
  }

  // Live effect check on expanded state for Elysia ('E') — now qualifies automatically!
  const appearance = sanitizeBoardGameAppearance({});
  const state = createInitialGameState({
    matchId: 'p4a-choco-elysia',
    seed: 44001,
    nowMs: 1_800_000_000_000,
    rulesetId: 'starter-sixteen',
    allowExperimental: true,
    players: ['p1', 'p2', 'p3', 'p4'].map((id, i) => ({
      playerId: id,
      displayName: `P${i + 1}`,
      seatIndex: i,
      appearance,
      connected: true,
    })),
  });
  state.players.p1.roleId = 'exp1_elysia';
  state.players.p1.faction = 'lantern-guard';
  state.players.p1.maxHp = 10;
  state.players.p1.hp = 5;
  state.players.p1.woundsTaken = 5;
  state.players.p1.revealed = false;
  state.players.p1.hand = ['eq-14'];
  state.activePlayerId = 'p1';
  state.turnPhase = 'MAIN_ACTION';

  const res = applyPlayerGameAction(state, 'p1', { type: 'USE_CARD', cardId: 'eq-14' }, 1_800_000_001_000);
  assert.equal(res.ok, true);
  assert.equal(state.players.p1.revealed, true);
  assert.equal(state.players.p1.hp, 10, 'Elysia (E) must full-heal with eq_chocolate via dynamic sourceName');
  assert.equal(state.players.p1.woundsTaken, 0);
});

test('P4A-5 — getRemainingHp & listLivingPlayersInSameCluster respect shuffled match clusterPairs deterministically', () => {
  const appearance = sanitizeBoardGameAppearance({});
  const state = createInitialGameState({
    matchId: 'p4a-cluster-test',
    seed: 44002,
    nowMs: 1_800_000_000_000,
    rulesetId: 'starter-sixteen',
    allowExperimental: true,
    players: ['p1', 'p2', 'p3', 'p4'].map((id, i) => ({
      playerId: id,
      displayName: `P${i + 1}`,
      seatIndex: i,
      appearance,
      connected: true,
    })),
  });

  // Deliberately shuffle cluster pairs away from defaults!
  state.clusterPairs = [
    { clusterId: 'north', locationIds: ['lobby', 'court'] },
    { clusterId: 'central', locationIds: ['radio', 'corridor'] },
    { clusterId: 'south', locationIds: ['breaker', 'canteen'] },
  ];
  state.players.p1.location = 'lobby';
  state.players.p2.location = 'court'; // Same shuffled cluster as p1!
  state.players.p3.location = 'canteen'; // Default pair of lobby, but DIFFERENT shuffled cluster!
  state.players.p4.location = 'court';
  state.players.p4.alive = false; // Dead -> must be excluded!

  state.players.p1.maxHp = 12;
  state.players.p1.hp = 8;
  state.players.p1.woundsTaken = 4;
  assert.equal(getRemainingHp(state.players.p1), 8);

  const othersInCluster = listLivingPlayersInSameCluster(state, state.players.p1);
  assert.deepEqual(
    othersInCluster.map((p) => p.playerId),
    ['p2'],
    'Must use shuffled clusterPairs and exclude self & dead players',
  );

  const withSelf = listLivingPlayersInSameCluster(state, state.players.p1, { includeSelf: true });
  assert.deepEqual(
    withSelf.map((p) => p.playerId),
    ['p1', 'p2'],
  );
});
