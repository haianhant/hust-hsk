#!/usr/bin/env node
'use strict';

/**
 * scripts/phase8e-interaction-matrix.cjs
 *
 * Phase 8E-2 — 66-Character Mechanic Classifier, Interaction Risk Graph &
 * Risk-Weighted Pairwise / 3-Way Roster Generator.
 *
 * Never claims brute-force enumeration of all states. Instead:
 *  1. Classifies every one of the 66 roles across the 16 canonical mechanics.
 *  2. Computes pairwise risk scores over all C(66, 2) = 2,145 unordered pairs
 *     using shared hooks + conflicting state-transition weights.
 *  3. Cross-references existing behavioral tests (test/boardgame-*.test.cjs)
 *     to compute actual covered vs newly covered vs uncovered high-risk pairs.
 *  4. Exports deterministic risk-weighted pairwise & 3-way rosters for the
 *     extended stateful fuzzer.
 */

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
require(path.join(REPO, 'test/register-ts.cjs'));

const {
  DEFAULT_CHARACTER_REGISTRY,
  isKnownBoardGameRoleId,
} = require(path.join(REPO, 'features/boardgame/domain/index.ts'));

const MECHANICS = [
  'attack_declaration',
  'global_interrupt',
  'damage_redirection',
  'damage_reflection',
  'immunity_prevention',
  'healing',
  'equipment_transfer',
  'skill_copying',
  'victory_copying',
  'dynamic_allegiance',
  'resurrection',
  'turn_ownership',
  'reveal_events',
  'elimination_triggers',
  'immediate_victory',
  'private_pending_choice',
];

/**
 * Explicit mechanic tags for all 66 roles based on implemented handlers in
 * features/boardgame/domain/effects.ts, expansion-skills.ts & victory-engine.ts.
 */
const ROLE_MECHANIC_MAP = {
  // 10 Classic
  'gac-ky-thuat': ['reveal_events'],
  'gac-truc-ban': ['reveal_events'],
  'gac-radio': ['reveal_events'],
  'suong-an-danh': ['attack_declaration', 'healing', 'reveal_events'],
  'suong-tin-gia': ['reveal_events', 'immunity_prevention'],
  'suong-gac-cong': ['attack_declaration', 'damage_reflection', 'reveal_events'],
  'lang-anh-san': ['attack_declaration', 'equipment_transfer', 'immediate_victory', 'reveal_events'],
  'lang-quan-sat': ['healing', 'reveal_events'],
  'lang-cuu-ho': ['attack_declaration', 'elimination_triggers', 'immediate_victory', 'reveal_events'],
  'lang-tien-phong': ['reveal_events', 'elimination_triggers', 'immediate_victory'],

  // Expansion 1 — Hunters (8)
  exp1_gayle: ['attack_declaration', 'private_pending_choice', 'reveal_events'],
  exp1_lloyd: ['attack_declaration', 'global_interrupt', 'private_pending_choice', 'reveal_events'],
  exp1_felicia: ['private_pending_choice', 'reveal_events'],
  exp1_ernest: ['equipment_transfer', 'reveal_events'],
  exp1_elysia: ['attack_declaration', 'private_pending_choice', 'reveal_events'],
  exp1_fallen: ['attack_declaration', 'reveal_events'],
  exp1_gwendolen: ['attack_declaration', 'damage_reflection', 'private_pending_choice', 'reveal_events'],
  exp1_fea: ['private_pending_choice', 'reveal_events'],

  // Expansion 1 — Shadows (9)
  exp1_vengeful_spirit: ['skill_copying', 'elimination_triggers', 'private_pending_choice', 'reveal_events'],
  exp1_undying: ['immunity_prevention', 'private_pending_choice', 'reveal_events'],
  exp1_victor: ['attack_declaration', 'private_pending_choice', 'reveal_events'],
  exp1_vengeance: ['elimination_triggers', 'private_pending_choice', 'reveal_events'],
  exp1_wendigo: ['healing', 'elimination_triggers', 'private_pending_choice', 'reveal_events'],
  exp1_voodoo: ['turn_ownership', 'reveal_events'],
  exp1_udi: ['attack_declaration', 'immunity_prevention', 'reveal_events'],
  exp1_wrath: ['private_pending_choice', 'reveal_events'],
  exp1_undead: ['resurrection', 'elimination_triggers', 'reveal_events'],

  // Expansion 1 — Neutrals (9)
  exp1_bipolar: ['healing', 'private_pending_choice', 'reveal_events'],
  exp1_anathema: ['damage_redirection', 'private_pending_choice', 'reveal_events'],
  exp1_bethany: ['equipment_transfer', 'victory_copying', 'private_pending_choice', 'reveal_events'],
  exp1_cindy: ['damage_reflection', 'private_pending_choice', 'immediate_victory', 'reveal_events'],
  exp1_arnold: ['damage_reflection', 'immunity_prevention', 'private_pending_choice', 'reveal_events'],
  exp1_antimony: ['skill_copying', 'victory_copying', 'elimination_triggers', 'reveal_events'],
  exp1_cassie: ['healing', 'victory_copying', 'reveal_events'],
  exp1_clairvoyant: ['victory_copying', 'private_pending_choice', 'reveal_events'],
  exp1_angel: ['immunity_prevention', 'reveal_events'],

  // Expansion 2 — Hunters (9)
  exp2_father_harrison: ['reveal_events'],
  exp2_gloria: ['reveal_events'],
  exp2_fujiko: ['attack_declaration', 'elimination_triggers', 'reveal_events'],
  exp2_freyja: ['attack_declaration', 'equipment_transfer', 'private_pending_choice', 'reveal_events'],
  exp2_gideon: ['elimination_triggers', 'healing', 'private_pending_choice', 'reveal_events'],
  exp2_g43: ['immunity_prevention', 'reveal_events'],
  exp2_eleanor: ['attack_declaration', 'reveal_events'],
  exp2_elise: ['healing', 'private_pending_choice', 'reveal_events'],
  exp2_fiona: ['attack_declaration', 'private_pending_choice', 'reveal_events'],

  // Expansion 2 — Shadows (9)
  exp2_warlock: ['attack_declaration', 'reveal_events'],
  exp2_witch: ['immunity_prevention', 'reveal_events'],
  exp2_wyvern: ['elimination_triggers', 'reveal_events'],
  exp2_umibozu: ['reveal_events'],
  exp2_urban_legend: ['immunity_prevention', 'healing', 'private_pending_choice', 'reveal_events'],
  exp2_visions: ['private_pending_choice', 'reveal_events'],
  exp2_unchained: ['attack_declaration', 'reveal_events'],
  exp2_warlord: ['attack_declaration', 'reveal_events'],
  exp2_usurper: ['healing', 'private_pending_choice', 'reveal_events'],

  // Expansion 2 — Neutrals (12)
  exp2_cain: ['elimination_triggers', 'immediate_victory', 'reveal_events'],
  exp2_dalton: ['healing', 'elimination_triggers', 'immediate_victory', 'reveal_events'],
  exp2_april_skipps: ['immediate_victory', 'reveal_events'],
  exp2_bonnie: ['dynamic_allegiance', 'elimination_triggers', 'reveal_events'],
  exp2_bianca: ['immunity_prevention', 'equipment_transfer', 'private_pending_choice', 'reveal_events'],
  exp2_colt: ['equipment_transfer', 'damage_reflection', 'immediate_victory', 'reveal_events'],
  exp2_cruz: ['private_pending_choice', 'elimination_triggers', 'immediate_victory', 'reveal_events'],
  exp2_diana: ['victory_copying', 'reveal_events'],
  exp2_aaron: ['attack_declaration', 'immunity_prevention', 'victory_copying', 'reveal_events'],
  exp2_arlene: ['elimination_triggers', 'immediate_victory', 'reveal_events'],
  exp2_bryon: ['equipment_transfer', 'private_pending_choice', 'reveal_events'],
  exp2_nc_soldier: ['dynamic_allegiance', 'attack_declaration', 'immediate_victory', 'reveal_events'],
};

/**
 * High-risk mechanic conflict matrix (unordered mechanic pair -> risk weight).
 */
const CONFLICT_WEIGHTS = [
  ['turn_ownership', 'private_pending_choice', 10],
  ['turn_ownership', 'elimination_triggers', 9],
  ['turn_ownership', 'reveal_events', 4],
  ['resurrection', 'elimination_triggers', 10],
  ['resurrection', 'skill_copying', 10],
  ['resurrection', 'dynamic_allegiance', 10],
  ['resurrection', 'immediate_victory', 8],
  ['damage_redirection', 'damage_reflection', 10],
  ['damage_redirection', 'immunity_prevention', 8],
  ['damage_redirection', 'elimination_triggers', 9],
  ['damage_reflection', 'immunity_prevention', 7],
  ['damage_reflection', 'damage_reflection', 9],
  ['global_interrupt', 'attack_declaration', 10],
  ['global_interrupt', 'turn_ownership', 9],
  ['global_interrupt', 'skill_copying', 9],
  ['skill_copying', 'victory_copying', 10],
  ['skill_copying', 'healing', 8],
  ['skill_copying', 'damage_redirection', 9],
  ['skill_copying', 'damage_reflection', 8],
  ['skill_copying', 'dynamic_allegiance', 9],
  ['victory_copying', 'victory_copying', 10],
  ['victory_copying', 'dynamic_allegiance', 10],
  ['victory_copying', 'immediate_victory', 7],
  ['dynamic_allegiance', 'dynamic_allegiance', 10],
  ['dynamic_allegiance', 'elimination_triggers', 9],
  ['dynamic_allegiance', 'immediate_victory', 8],
  ['healing', 'healing', 6],
  ['equipment_transfer', 'equipment_transfer', 7],
  ['equipment_transfer', 'immediate_victory', 7],
  ['immunity_prevention', 'immunity_prevention', 6],
];

function computePairRisk(idA, idB, roleById) {
  const mA = new Set(ROLE_MECHANIC_MAP[idA] || []);
  const mB = new Set(ROLE_MECHANIC_MAP[idB] || []);
  let score = 0;
  const reasons = [];

  for (const [x, y, weight] of CONFLICT_WEIGHTS) {
    const match = (mA.has(x) && mB.has(y)) || (mA.has(y) && mB.has(x));
    if (match) {
      score += weight;
      reasons.push(x === y ? `${x}×${x}` : `${x}×${y}`);
    }
  }

  // Same server hook overlap adds interaction risk
  const hookA = roleById[idA]?.skillImpl?.trigger;
  const hookB = roleById[idB]?.skillImpl?.trigger;
  if (hookA && hookB && hookA === hookB && hookA !== 'ACTIVE_SKILL') {
    score += 3;
    reasons.push(`hook:${hookA}`);
  }

  return { score, reasons: [...new Set(reasons)] };
}

/**
 * Risk-weighted deterministic rosters for Phase 8E extended stateful fuzzing.
 * Every single role ID is strictly validated against isKnownBoardGameRoleId().
 */
const PHASE8E_RISK_WEIGHTED_ROSTERS = [
  // Family A — Voodoo + Turn Ownership
  {
    name: '8e-familyA-voodoo-draw-move-interrupt',
    family: 'A',
    rulesetId: 'full-expansion',
    roles: ['exp1_voodoo', 'exp1_felicia', 'exp2_gloria', 'exp2_cruz', 'exp2_father_harrison', 'exp1_lloyd'],
  },
  // Family B — Resurrection + Elimination
  {
    name: '8e-familyB-undead-elimination-chain',
    family: 'B',
    rulesetId: 'full-expansion',
    roles: ['exp1_undead', 'exp2_gideon', 'exp1_vengeful_spirit', 'exp1_antimony', 'exp2_bonnie', 'exp2_cain'],
  },
  // Family C — Damage Resolution (Redirect + Reflect + Mitigation + Interrupt)
  {
    name: '8e-familyC-damage-redirect-reflect',
    family: 'C',
    rulesetId: 'full-expansion',
    roles: ['exp1_anathema', 'exp1_arnold', 'exp1_wrath', 'exp1_cindy', 'exp1_lloyd', 'exp2_witch', 'exp2_g43'],
  },
  // Family D — Copied Skill & Victory Graph + Cycles
  {
    name: '8e-familyD-copied-skill-victory-graph',
    family: 'D',
    rulesetId: 'full-expansion',
    roles: ['exp1_antimony', 'exp1_vengeful_spirit', 'exp1_clairvoyant', 'exp1_cassie', 'exp2_diana', 'exp1_bethany', 'exp2_gideon'],
  },
  // Family E — Dynamic Faction, Alliance & Simultaneous Winners
  {
    name: '8e-familyE-dynamic-allegiance-alliance',
    family: 'E',
    rulesetId: 'full-expansion',
    roles: ['exp2_bonnie', 'exp2_cain', 'exp2_nc_soldier', 'exp1_cassie', 'exp2_diana', 'exp1_angel', 'exp2_aaron', 'exp2_usurper'],
  },
  // 3-Way Risk Roster 1 — Healing Block + Damage Conversion + Equipment Steal
  {
    name: '8e-3way-heal-gear-theft',
    family: '3WAY',
    rulesetId: 'full-expansion',
    roles: ['exp2_usurper', 'exp2_elise', 'exp2_urban_legend', 'exp2_colt', 'exp2_freyja', 'exp2_bianca', 'exp2_bryon', 'exp2_dalton'],
  },
  // 3-Way Risk Roster 2 — Reveal Storm + Protection + Execution
  {
    name: '8e-3way-reveal-protect-execute',
    family: '3WAY',
    rulesetId: 'full-expansion',
    roles: ['exp1_ernest', 'exp2_umibozu', 'exp1_gwendolen', 'exp2_fujiko', 'exp2_arlene', 'exp2_april_skipps', 'exp1_undying', 'exp1_vengeance'],
  },
  // 3-Way Risk Roster 3 — Movement + Attack Modifiers + Marks
  {
    name: '8e-3way-move-attack-marks',
    family: '3WAY',
    rulesetId: 'full-expansion',
    roles: ['exp1_fea', 'exp2_warlord', 'exp2_visions', 'exp1_udi', 'exp1_victor', 'exp2_warlock', 'exp1_bipolar', 'exp1_wendigo'],
  },
];

for (const roster of PHASE8E_RISK_WEIGHTED_ROSTERS) {
  for (const rid of roster.roles) {
    if (!isKnownBoardGameRoleId(rid)) {
      throw new Error(`Invalid roleId ${rid} in PHASE8E_RISK_WEIGHTED_ROSTERS (${roster.name})`);
    }
  }
}

function buildInteractionAnalysis() {
  const allRoles = DEFAULT_CHARACTER_REGISTRY.listAll();
  const roleById = Object.fromEntries(allRoles.map((r) => [r.id, r]));

  // Verify every single one of 66 roles is classified
  const unclassified = allRoles.filter((r) => !ROLE_MECHANIC_MAP[r.id]).map((r) => r.id);
  if (unclassified.length > 0) {
    throw new Error(`Unclassified roles: ${unclassified.join(', ')}`);
  }

  // Scan test blocks to see which pairs are co-tested with behavioral assertions
  const testDir = path.join(REPO, 'test');
  const testFiles = fs
    .readdirSync(testDir)
    .filter((f) => f.startsWith('boardgame-') && f.endsWith('.test.cjs'))
    .filter(
      (f) =>
        !f.includes('portraits') &&
        f !== 'boardgame-lounge.test.cjs' &&
        f !== 'boardgame-vfx.test.cjs' &&
        f !== 'boardgame-phase8a1-ruleset-selector.test.cjs',
    );

  const existingBlocks = [];
  const phase8eBlocks = [];
  for (const file of testFiles) {
    const src = fs.readFileSync(path.join(testDir, file), 'utf8');
    const regex = /\btest\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
    const starts = [];
    let m;
    while ((m = regex.exec(src)) !== null) starts.push({ title: m[2], idx: m.index });
    for (let i = 0; i < starts.length; i++) {
      const body = src.slice(starts[i].idx, i + 1 < starts.length ? starts[i + 1].idx : src.length);
      // Extract only roles referenced in this block
      const present = new Set();
      for (const r of allRoles) {
        if (body.includes(`'${r.id}'`) || body.includes(`"${r.id}"`)) present.add(r.id);
      }
      const rec = { file, title: starts[i].title, present };
      if (file.includes('phase8e')) phase8eBlocks.push(rec);
      else existingBlocks.push(rec);
    }
  }

  const pairs = [];
  for (let i = 0; i < allRoles.length; i++) {
    for (let j = i + 1; j < allRoles.length; j++) {
      const a = allRoles[i];
      const b = allRoles[j];
      const { score, reasons } = computePairRisk(a.id, b.id, roleById);
      const isNeutralPair = a.metadata.faction === 'wanderer' && b.metadata.faction === 'wanderer';
      // 4P has 0 Neutrals, 5P has 1 Neutral -> Neutral-Neutral pairs only eligible in 6P-8P!
      const minPlayersEligible = isNeutralPair ? 6 : 4;
      const existingHits = existingBlocks.filter((blk) => blk.present.has(a.id) && blk.present.has(b.id));
      const newHits = phase8eBlocks.filter((blk) => blk.present.has(a.id) && blk.present.has(b.id));
      pairs.push({
        a: a.id,
        b: b.id,
        nameA: a.metadata.sourceName,
        nameB: b.metadata.sourceName,
        score,
        reasons,
        minPlayersEligible,
        coveredExisting: existingHits.length > 0,
        coveredPhase8E: newHits.length > 0,
        existingRef: existingHits[0] ? `${existingHits[0].file}` : null,
        phase8eRef: newHits[0] ? `${newHits[0].file}` : null,
      });
    }
  }

  const eligiblePairs = pairs.filter((p) => p.score > 0);
  const highRiskPairs = pairs.filter((p) => p.score >= 15).sort((x, y) => y.score - x.score);
  const criticalPairs = pairs.filter((p) => p.score >= 25).sort((x, y) => y.score - x.score);
  const coveredExistingHigh = highRiskPairs.filter((p) => p.coveredExisting);
  const newlyCoveredHigh = highRiskPairs.filter((p) => !p.coveredExisting && p.coveredPhase8E);
  const uncoveredHigh = highRiskPairs.filter((p) => !p.coveredExisting && !p.coveredPhase8E);
  const coveredCritical = criticalPairs.filter((p) => p.coveredExisting || p.coveredPhase8E);

  return {
    totalRoles: allRoles.length,
    totalUnorderedPairs: pairs.length,
    eligibleInteractionPairs: eligiblePairs.length,
    highRiskThreshold: 15,
    highRiskPairsTotal: highRiskPairs.length,
    highRiskCoveredExisting: coveredExistingHigh.length,
    highRiskNewlyCoveredPhase8E: newlyCoveredHigh.length,
    highRiskTotalCovered: coveredExistingHigh.length + newlyCoveredHigh.length,
    highRiskUncovered: uncoveredHigh.length,
    criticalThreshold: 25,
    criticalPairsTotal: criticalPairs.length,
    criticalPairsCovered: coveredCritical.length,
    topCriticalPairs: criticalPairs.slice(0, 40),
    topUncoveredHighRiskPairs: uncoveredHigh.slice(0, 25),
    rosters: PHASE8E_RISK_WEIGHTED_ROSTERS,
  };
}

if (require.main === module) {
  const analysis = buildInteractionAnalysis();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(analysis, null, 2));
  } else {
    console.log(`66-Role Interaction Risk Graph:`);
    console.log(`  Total unordered pairs:       ${analysis.totalUnorderedPairs}`);
    console.log(`  Eligible overlapping pairs:  ${analysis.eligibleInteractionPairs}`);
    console.log(`  High-risk pairs (score>=15): ${analysis.highRiskPairsTotal} (existing=${analysis.highRiskCoveredExisting}, new8E=${analysis.highRiskNewlyCoveredPhase8E}, uncovered=${analysis.highRiskUncovered})`);
    console.log(`  Critical pairs (score>=25):  ${analysis.criticalPairsTotal} (covered=${analysis.criticalPairsCovered})`);
  }
}

module.exports = {
  MECHANICS,
  ROLE_MECHANIC_MAP,
  PHASE8E_RISK_WEIGHTED_ROSTERS,
  buildInteractionAnalysis,
};
