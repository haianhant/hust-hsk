#!/usr/bin/env node
'use strict';

/**
 * scripts/phase8e-interaction-matrix.cjs
 *
 * Phase 8E-2 + Phase 8F-1 — 66-Character Mechanic Classifier, Interaction Risk Graph,
 * Legal Role-Pair Eligibility Calculator, and Evidence-Based Pairwise Coverage Auditor.
 *
 * Phase 8F-1 Corrections:
 *  1. Strictly separates pairwise evidence into 4 categories:
 *       - DO_E2E_ASSERTED       (verified deterministic coverage)
 *       - INTERACTION_ASSERTED  (verified deterministic coverage)
 *       - INTERACTION_EXECUTED  (fuzzing co-activation only — NOT verified deterministic!)
 *       - CO_OCCURRENCE_ONLY    (incidental test/fuzz presence — NOT verified deterministic!)
 *       - NONE                  (no evidence)
 *     ONLY `INTERACTION_ASSERTED` and `DO_E2E_ASSERTED` count as verified deterministic
 *     pairwise coverage. Historical Phase 8E co-occurrence numbers are preserved separately
 *     and explicitly marked deprecated.
 *  2. Computes legal role-pair eligibility (`computePairEligibility`) directly from real
 *     domain rules: `DEFAULT_RULESET_REGISTRY.resolvePlayableRolePoolOrThrow()`,
 *     `getRoleDistribution(playerCount)` (4P–8P), and exact 5P `exp2_nc_soldier` exclusion
 *     from `features/boardgame/domain/state-machine.ts`.
 */

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
require(path.join(REPO, 'test/register-ts.cjs'));

const {
  resolveProductionBetaConfigFromEnv,
} = require(path.join(REPO, 'shared/contracts/boardgame.ts'));
const {
  DEFAULT_CHARACTER_REGISTRY,
  DEFAULT_RULESET_REGISTRY,
  getRoleDistribution,
  isKnownBoardGameRoleId,
} = require(path.join(REPO, 'features/boardgame/domain/index.ts'));
const {
  canonicalPairId,
  VERIFIED_INTERACTION_EVIDENCE,
  validateEvidenceRegistry,
} = require('./phase8f-interaction-evidence.cjs');

const PRODUCTION_RULESETS = ['classic', 'expansion-1', 'expansion-2', 'full-expansion'];
const PLAYER_COUNTS = [4, 5, 6, 7, 8];

const PROD_BETA_ALL = resolveProductionBetaConfigFromEnv({
  ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
  BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
});

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

// ============================================================================
// Phase 8F-1 Problem B: Domain-Accurate Legal Role-Pair Eligibility Calculator
// ============================================================================

const ALL_ROLES_CACHE = DEFAULT_CHARACTER_REGISTRY.listAll();
const ROLE_BY_ID_CACHE = Object.fromEntries(ALL_ROLES_CACHE.map((r) => [r.id, r]));

// Pre-resolve production ruleset pools across 4P..8P directly from DEFAULT_RULESET_REGISTRY
const RULESET_POOL_SETS = Object.create(null);
for (const rulesetId of PRODUCTION_RULESETS) {
  RULESET_POOL_SETS[rulesetId] = Object.create(null);
  for (const pc of PLAYER_COUNTS) {
    const resolved = DEFAULT_RULESET_REGISTRY.resolvePlayableRolePoolOrThrow(rulesetId, pc, {
      productionBeta: PROD_BETA_ALL,
    });
    // Mirror exact 5P Neutral dealing exclusions (exp2_nc_soldier, exp1_cassie) from features/boardgame/domain/state-machine.ts
    const wandererPool =
      rulesetId !== 'classic' && pc === 5
        ? resolved.pools.wanderer.filter((id) => id !== 'exp2_nc_soldier' && id !== 'exp1_cassie')
        : resolved.pools.wanderer;
    RULESET_POOL_SETS[rulesetId][pc] = {
      'lantern-guard': new Set(resolved.pools.lanternGuard),
      'mist-order': new Set(resolved.pools.mistOrder),
      wanderer: new Set(wandererPool),
      all: new Set([...resolved.pools.lanternGuard, ...resolved.pools.mistOrder, ...wandererPool]),
    };
  }
}

const SEAT_CAPACITY_BY_PC = Object.fromEntries(
  PLAYER_COUNTS.map((pc) => {
    const split = getRoleDistribution(pc);
    return [
      pc,
      {
        'lantern-guard': split.lanternGuard,
        'mist-order': split.mistOrder,
        wanderer: split.wanderer,
      },
    ];
  }),
);

/**
 * Compute exact legal co-occurrence eligibility for any unordered role pair (idA, idB)
 * across all 4 production rulesets (`classic`, `expansion-1`, `expansion-2`, `full-expansion`)
 * and all valid player counts (4P–8P) using real domain distribution & dealing rules.
 */
function computePairEligibility(idA, idB) {
  if (!isKnownBoardGameRoleId(idA) || !isKnownBoardGameRoleId(idB)) {
    throw new Error(`Unknown roleId in computePairEligibility(${idA}, ${idB})`);
  }
  const roleA = ROLE_BY_ID_CACHE[idA];
  const roleB = ROLE_BY_ID_CACHE[idB];
  const facA = roleA.metadata.faction;
  const facB = roleB.metadata.faction;

  const byRuleset = Object.create(null);
  const eligibleRulesets = [];
  const eligiblePlayerCountSet = new Set();
  const exclusionReasonSet = new Set();

  for (const rulesetId of PRODUCTION_RULESETS) {
    const legalPcs = [];
    // Check base pack membership (using 6P as canonical non-5P pool)
    const basePool = RULESET_POOL_SETS[rulesetId][6].all;
    const aInPack = basePool.has(idA);
    const bInPack = basePool.has(idB);
    if (!aInPack || !bInPack) {
      byRuleset[rulesetId] = [];
      const missing = [!aInPack ? idA : null, !bInPack ? idB : null].filter(Boolean).join(', ');
      exclusionReasonSet.add(`ruleset ${rulesetId}: pack excludes ${missing}`);
      continue;
    }

    for (const pc of PLAYER_COUNTS) {
      const cap = SEAT_CAPACITY_BY_PC[pc];
      const pool = RULESET_POOL_SETS[rulesetId][pc].all;

      // 1. Check 5P explicit Neutral deal exclusions (exp2_nc_soldier, exp1_cassie)
      if (!pool.has(idA) || !pool.has(idB)) {
        const excluded = [!pool.has(idA) ? idA : null, !pool.has(idB) ? idB : null]
          .filter(Boolean)
          .join(', ');
        exclusionReasonSet.add(`${pc}P: explicit dealing pool exclusion (${excluded})`);
        continue;
      }

      // 2. Check faction seat capacities from getRoleDistribution(pc)
      if (facA === facB) {
        if (cap[facA] < 2) {
          exclusionReasonSet.add(
            `${pc}P: requires 2 ${facA} seats, but getRoleDistribution(${pc}) provides ${cap[facA]}`,
          );
          continue;
        }
      } else {
        if (cap[facA] < 1) {
          exclusionReasonSet.add(
            `${pc}P: requires >=1 ${facA} seat, but getRoleDistribution(${pc}) provides ${cap[facA]}`,
          );
          continue;
        }
        if (cap[facB] < 1) {
          exclusionReasonSet.add(
            `${pc}P: requires >=1 ${facB} seat, but getRoleDistribution(${pc}) provides ${cap[facB]}`,
          );
          continue;
        }
      }

      legalPcs.push(pc);
      eligiblePlayerCountSet.add(pc);
    }

    byRuleset[rulesetId] = legalPcs;
    if (legalPcs.length > 0) {
      eligibleRulesets.push(rulesetId);
    }
  }

  const eligiblePlayerCounts = [...eligiblePlayerCountSet].sort((a, b) => a - b);
  return {
    pairId: canonicalPairId(idA, idB),
    roles: [idA, idB].sort(),
    factions: [facA, facB],
    eligibleRulesets,
    eligiblePlayerCounts,
    minPlayersEligible: eligiblePlayerCounts.length > 0 ? eligiblePlayerCounts[0] : null,
    byRuleset,
    exclusionReasons: [...exclusionReasonSet],
  };
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

function loadOptionalFuzzReport(fuzzReportPath) {
  if (!fuzzReportPath) return null;
  const resolved = path.resolve(process.cwd(), fuzzReportPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Fuzz report JSON not found at: ${resolved}`);
  }
  const parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  return {
    path: fuzzReportPath,
    observedPairIds: new Set(parsed?.instrumentation?.observedPairIds ?? []),
    executedInteractionPairIds: new Set(parsed?.instrumentation?.executedInteractionPairIds ?? []),
    validMatches: parsed?.validFuzz?.matchesRun ?? 0,
    targetedMatches: parsed?.targetedInteractionFuzz?.matchesRun ?? 0,
  };
}

function classifyPair(pairId, evidenceEntries, hasTestCoOccurrence, fuzzData) {
  if (evidenceEntries && evidenceEntries.length > 0) {
    if (evidenceEntries.some((e) => e.evidenceType === 'DO_E2E_ASSERTED')) {
      return 'DO_E2E_ASSERTED';
    }
    return 'INTERACTION_ASSERTED';
  }
  if (fuzzData && fuzzData.executedInteractionPairIds.has(pairId)) {
    return 'INTERACTION_EXECUTED';
  }
  if (hasTestCoOccurrence || (fuzzData && fuzzData.observedPairIds.has(pairId))) {
    return 'CO_OCCURRENCE_ONLY';
  }
  return 'NONE';
}

function countByCategory(list, field) {
  const counts = {
    DO_E2E_ASSERTED: 0,
    INTERACTION_ASSERTED: 0,
    INTERACTION_EXECUTED: 0,
    CO_OCCURRENCE_ONLY: 0,
    NONE: 0,
  };
  for (const item of list) {
    counts[item[field]] = (counts[item[field]] || 0) + 1;
  }
  counts.verifiedDeterministic = counts.DO_E2E_ASSERTED + counts.INTERACTION_ASSERTED;
  return counts;
}

function buildInteractionAnalysis(options = {}) {
  const allRoles = ALL_ROLES_CACHE;
  const roleById = ROLE_BY_ID_CACHE;

  // Verify every single one of 66 roles is classified
  const unclassified = allRoles.filter((r) => !ROLE_MECHANIC_MAP[r.id]).map((r) => r.id);
  if (unclassified.length > 0) {
    throw new Error(`Unclassified roles: ${unclassified.join(', ')}`);
  }

  // Machine-validate the traceable behavioral evidence registry (throws on stale/phantom refs!)
  const evidenceValidation = validateEvidenceRegistry();
  if (!evidenceValidation.ok) {
    throw new Error(`Evidence registry validation failed:\n  - ${evidenceValidation.errors.join('\n  - ')}`);
  }

  const fuzzData = loadOptionalFuzzReport(options.fuzzReportPath || null);

  // Build historical (deprecated) test-block co-occurrence scan ONLY for comparison with Phase 8E
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

  const pre8EBlocks = [];
  const phase8EBlocks = [];
  const phase8FBlocks = [];
  for (const file of testFiles) {
    const src = fs.readFileSync(path.join(testDir, file), 'utf8');
    const regex = /\btest\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
    const starts = [];
    let m;
    while ((m = regex.exec(src)) !== null) starts.push({ title: m[2], idx: m.index });
    for (let i = 0; i < starts.length; i++) {
      const body = src.slice(starts[i].idx, i + 1 < starts.length ? starts[i + 1].idx : src.length);
      const present = new Set();
      for (const r of allRoles) {
        if (body.includes(`'${r.id}'`) || body.includes(`"${r.id}"`)) present.add(r.id);
      }
      const rec = { file, title: starts[i].title, present };
      if (file.includes('phase8f')) phase8FBlocks.push(rec);
      else if (file.includes('phase8e')) phase8EBlocks.push(rec);
      else pre8EBlocks.push(rec);
    }
  }

  const pairs = [];
  let eligibilityMismatchTotal = 0;
  const eligibilityMismatchesHighRisk = [];

  for (let i = 0; i < allRoles.length; i++) {
    for (let j = i + 1; j < allRoles.length; j++) {
      const a = allRoles[i];
      const b = allRoles[j];
      const pairId = canonicalPairId(a.id, b.id);
      const { score, reasons } = computePairRisk(a.id, b.id, roleById);

      // Historical (buggy) Phase 8E eligibility heuristic vs real Phase 8F domain eligibility
      const isNeutralPair = a.metadata.faction === 'wanderer' && b.metadata.faction === 'wanderer';
      const historicalNaiveMinPlayers = isNeutralPair ? 6 : 4;
      const eligibility = computePairEligibility(a.id, b.id);
      const eligibilityCorrected = eligibility.minPlayersEligible !== historicalNaiveMinPlayers;
      if (eligibilityCorrected) eligibilityMismatchTotal += 1;

      // Historical (deprecated) co-occurrence flags (Phase 8E snapshot)
      const histPre8EHits = pre8EBlocks.filter((blk) => blk.present.has(a.id) && blk.present.has(b.id));
      const hist8EHits = phase8EBlocks.filter((blk) => blk.present.has(a.id) && blk.present.has(b.id));
      const hist8FHits = phase8FBlocks.filter((blk) => blk.present.has(a.id) && blk.present.has(b.id));
      const historical8ECoOccurred = histPre8EHits.length > 0 || hist8EHits.length > 0;
      const anyTestCoOccurred = historical8ECoOccurred || hist8FHits.length > 0;

      // Truthful Phase 8F verified behavioral evidence
      const allEvidence = evidenceValidation.byPair.get(pairId) || [];
      const pre8FEvidence = allEvidence.filter((e) => e.introducedInPhase === 'pre-8f');

      const pre8FCategory = classifyPair(pairId, pre8FEvidence, historical8ECoOccurred, fuzzData);
      const post8FCategory = classifyPair(pairId, allEvidence, anyTestCoOccurred, fuzzData);
      const verifiedPre8F = pre8FCategory === 'INTERACTION_ASSERTED' || pre8FCategory === 'DO_E2E_ASSERTED';
      const verifiedPost8F = post8FCategory === 'INTERACTION_ASSERTED' || post8FCategory === 'DO_E2E_ASSERTED';

      const pairRecord = {
        pairId,
        a: a.id,
        b: b.id,
        nameA: a.metadata.sourceName,
        nameB: b.metadata.sourceName,
        factionA: a.metadata.faction,
        factionB: b.metadata.faction,
        score,
        reasons,
        // Domain-accurate eligibility (Phase 8F-1 Problem B)
        minPlayersEligible: eligibility.minPlayersEligible,
        eligiblePlayerCounts: eligibility.eligiblePlayerCounts,
        eligibleRulesets: eligibility.eligibleRulesets,
        byRuleset: eligibility.byRuleset,
        exclusionReasons: eligibility.exclusionReasons,
        historicalNaiveMinPlayers,
        eligibilityCorrected,
        // Historical Phase 8E naive co-occurrence flags (DEPRECATED)
        historicalPhase8ECoveredPre8E: histPre8EHits.length > 0,
        historicalPhase8ECovered8E: hist8EHits.length > 0,
        historicalPhase8ECoOccurred: historical8ECoOccurred,
        // Recalculated truthful Phase 8F categories
        pre8FCategory,
        post8FCategory,
        verifiedPre8F,
        verifiedPost8F,
        newlyVerifiedIn8F: !verifiedPre8F && verifiedPost8F,
        evidence: allEvidence,
      };

      if (score >= 15 && eligibilityCorrected) {
        eligibilityMismatchesHighRisk.push({
          pairId,
          names: `${a.metadata.sourceName} × ${b.metadata.sourceName}`,
          score,
          historicalNaiveMinPlayers,
          correctedMinPlayers: eligibility.minPlayersEligible,
          eligiblePlayerCounts: eligibility.eligiblePlayerCounts,
          eligibleRulesets: eligibility.eligibleRulesets,
          exclusionReasons: eligibility.exclusionReasons,
        });
      }

      pairs.push(pairRecord);
    }
  }

  const overlappingPairs = pairs.filter((p) => p.score > 0);
  const highRiskPairs = pairs.filter((p) => p.score >= 15).sort((x, y) => y.score - x.score || x.pairId.localeCompare(y.pairId));
  const criticalPairs = pairs.filter((p) => p.score >= 25).sort((x, y) => y.score - x.score || x.pairId.localeCompare(y.pairId));

  // Historical Phase 8E (deprecated naive co-occurrence)
  const histHighPre8E = highRiskPairs.filter((p) => p.historicalPhase8ECoveredPre8E);
  const histHighNew8E = highRiskPairs.filter((p) => !p.historicalPhase8ECoveredPre8E && p.historicalPhase8ECovered8E);
  const histHighUncovered = highRiskPairs.filter((p) => !p.historicalPhase8ECoOccurred);
  const histCritCovered = criticalPairs.filter((p) => p.historicalPhase8ECoOccurred);
  const histHighFalsePositives = highRiskPairs.filter((p) => p.historicalPhase8ECoOccurred && !p.verifiedPre8F);

  // Recalculated Phase 8F strict verified coverage
  const pre8FHighCounts = countByCategory(highRiskPairs, 'pre8FCategory');
  const post8FHighCounts = countByCategory(highRiskPairs, 'post8FCategory');
  const pre8FCritCounts = countByCategory(criticalPairs, 'pre8FCategory');
  const post8FCritCounts = countByCategory(criticalPairs, 'post8FCategory');
  const post8FOverlapCounts = countByCategory(overlappingPairs, 'post8FCategory');
  const post8FAllCounts = countByCategory(pairs, 'post8FCategory');

  const historical16UncoveredPairs = histHighUncovered.map((p) => ({
    pairId: p.pairId,
    names: `${p.nameA} × ${p.nameB}`,
    score: p.score,
    eligibleRulesets: p.eligibleRulesets,
    eligiblePlayerCounts: p.eligiblePlayerCounts,
    post8FCategory: p.post8FCategory,
    verifiedPost8F: p.verifiedPost8F,
    testCaseIds: p.evidence.map((e) => `${e.testFile}::${e.testCaseId}`),
  }));

  const uncoveredHighRiskBacklog = highRiskPairs
    .filter((p) => !p.verifiedPost8F)
    .map((p) => ({
      pairId: p.pairId,
      names: `${p.nameA} × ${p.nameB}`,
      score: p.score,
      reasons: p.reasons,
      eligibleRulesets: p.eligibleRulesets,
      eligiblePlayerCounts: p.eligiblePlayerCounts,
      historicalPhase8EClaimedCovered: p.historicalPhase8ECoOccurred,
      currentCategory: p.post8FCategory,
    }));

  return {
    schemaVersion: '2.0.0',
    phase: '8F',
    generatedAt: new Date().toISOString(),
    fuzzReportUsed: fuzzData
      ? {
          path: fuzzData.path,
          validMatches: fuzzData.validMatches,
          targetedMatches: fuzzData.targetedMatches,
          observedPairs: fuzzData.observedPairIds.size,
          executedInteractionPairs: fuzzData.executedInteractionPairIds.size,
        }
      : null,
    methodology: {
      evidenceCategories: [
        'DO_E2E_ASSERTED',
        'INTERACTION_ASSERTED',
        'INTERACTION_EXECUTED',
        'CO_OCCURRENCE_ONLY',
        'NONE',
      ],
      verifiedDeterministicCategories: ['DO_E2E_ASSERTED', 'INTERACTION_ASSERTED'],
      evidenceRegistryEntriesCount: VERIFIED_INTERACTION_EVIDENCE.length,
      evidenceRegistryValidated: evidenceValidation.ok,
    },
    totals: {
      totalRoles: allRoles.length,
      totalUnorderedPairs: pairs.length,
      overlappingMechanicPairs: overlappingPairs.length,
      highRiskThreshold: 15,
      highRiskPairsTotal: highRiskPairs.length,
      criticalThreshold: 25,
      criticalPairsTotal: criticalPairs.length,
    },
    historicalPhase8EMethod: {
      deprecated: true,
      warning:
        'Historical Phase 8E numbers counted role-ID string co-occurrence inside any test() block and conflated incidental presence with behavioral interaction verification.',
      highRiskCoveredExistingPre8E: histHighPre8E.length,
      highRiskNewlyCovered8E: histHighNew8E.length,
      highRiskTotalClaimedCovered: histHighPre8E.length + histHighNew8E.length,
      highRiskClaimedUncovered: histHighUncovered.length,
      criticalClaimedCovered: histCritCovered.length,
      coOccurrenceOnlyFalsePositivesInsideHistorical56: histHighFalsePositives.length,
    },
    recalculatedPhase8FMethod: {
      pre8FBaseline: {
        highRisk: pre8FHighCounts,
        highRiskVerifiedPct: Number(((pre8FHighCounts.verifiedDeterministic / highRiskPairs.length) * 100).toFixed(2)),
        critical: pre8FCritCounts,
        criticalVerifiedPct: Number(((pre8FCritCounts.verifiedDeterministic / criticalPairs.length) * 100).toFixed(2)),
      },
      post8FVerified: {
        allPairs: post8FAllCounts,
        overlappingPairs: post8FOverlapCounts,
        highRisk: post8FHighCounts,
        highRiskVerifiedPct: Number(((post8FHighCounts.verifiedDeterministic / highRiskPairs.length) * 100).toFixed(2)),
        highRiskNewlyVerifiedIn8F: highRiskPairs.filter((p) => p.newlyVerifiedIn8F).length,
        highRiskUncoveredBacklogCount: uncoveredHighRiskBacklog.length,
        critical: post8FCritCounts,
        criticalVerifiedPct: Number(((post8FCritCounts.verifiedDeterministic / criticalPairs.length) * 100).toFixed(2)),
        historical16GapsClosedCount: historical16UncoveredPairs.filter((p) => p.verifiedPost8F).length,
        historical16GapsTotal: historical16UncoveredPairs.length,
      },
    },
    eligibilityAudit: {
      totalPairsWithCorrectedMinPlayers: eligibilityMismatchTotal,
      highRiskPairsWithCorrectedMinPlayers: eligibilityMismatchesHighRisk.length,
      pairsIneligibleIn4P: pairs.filter((p) => !p.eligiblePlayerCounts.includes(4)).length,
      pairsIneligibleIn5P: pairs.filter((p) => !p.eligiblePlayerCounts.includes(5)).length,
      pairsRestrictedToFullExpansionOnly: pairs.filter(
        (p) => p.eligibleRulesets.length === 1 && p.eligibleRulesets[0] === 'full-expansion',
      ).length,
      highRiskEligibilityCorrections: eligibilityMismatchesHighRisk,
    },
    historical16UncoveredPairs,
    criticalPairs,
    highRiskPairs,
    uncoveredHighRiskBacklog,
    verifiedEvidence: VERIFIED_INTERACTION_EVIDENCE,
    rosters: PHASE8E_RISK_WEIGHTED_ROSTERS,
  };
}

if (require.main === module) {
  const fuzzArg = process.argv.find((a) => a.startsWith('--fuzz-json='));
  const fuzzReportPath = fuzzArg ? fuzzArg.slice('--fuzz-json='.length) : null;
  const analysis = buildInteractionAnalysis({ fuzzReportPath });
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(analysis, null, 2));
  } else {
    const hist = analysis.historicalPhase8EMethod;
    const pre = analysis.recalculatedPhase8FMethod.pre8FBaseline;
    const post = analysis.recalculatedPhase8FMethod.post8FVerified;
    console.log(`66-Role Interaction Risk Graph & Phase 8F Evidence-Based Coverage:`);
    console.log(`  Total unordered pairs:           ${analysis.totals.totalUnorderedPairs}`);
    console.log(`  Overlapping pairs (score>0):     ${analysis.totals.overlappingMechanicPairs}`);
    console.log(`  Eligibility corrected (total):   ${analysis.eligibilityAudit.totalPairsWithCorrectedMinPlayers}/2145 (${analysis.eligibilityAudit.highRiskPairsWithCorrectedMinPlayers}/72 high-risk)`);
    console.log(`  [Historical 8E co-occurrence]:   High-risk ${hist.highRiskTotalClaimedCovered}/72, Critical ${hist.criticalClaimedCovered}/6 (${hist.coOccurrenceOnlyFalsePositivesInsideHistorical56} co-occurrence-only!)`);
    console.log(`  [Recalculated Pre-8F verified]:  High-risk ${pre.highRisk.verifiedDeterministic}/72 (${pre.highRiskVerifiedPct}%), Critical ${pre.critical.verifiedDeterministic}/6 (${pre.criticalVerifiedPct}%)`);
    console.log(`  [Recalculated Post-8F verified]: High-risk ${post.highRisk.verifiedDeterministic}/72 (${post.highRiskVerifiedPct}%, +${post.highRiskNewlyVerifiedIn8F} in 8F), Critical ${post.critical.verifiedDeterministic}/6 (${post.criticalVerifiedPct}%)`);
    console.log(`  Historical 16 gaps closed in 8F: ${post.historical16GapsClosedCount}/${post.historical16GapsTotal}`);
    console.log(`  Remaining high-risk backlog:     ${post.highRiskUncoveredBacklogCount}/72`);
  }
}

module.exports = {
  PRODUCTION_RULESETS,
  PLAYER_COUNTS,
  MECHANICS,
  ROLE_MECHANIC_MAP,
  PHASE8E_RISK_WEIGHTED_ROSTERS,
  computePairEligibility,
  buildInteractionAnalysis,
};
