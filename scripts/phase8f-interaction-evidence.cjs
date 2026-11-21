#!/usr/bin/env node
'use strict';

/**
 * scripts/phase8f-interaction-evidence.cjs
 *
 * Phase 8F-1 — Explicit Traceable Behavioral Interaction Evidence Registry.
 *
 * Strictly separates pairwise coverage into four evidence tiers:
 *   - CO_OCCURRENCE_ONLY:    Both roles appeared in a test block, but NO verified
 *                            behavioral interaction assertion links them.
 *   - INTERACTION_EXECUTED:  Both roles co-occurred and activated their relevant
 *                            mechanics in stateful fuzzing without a dedicated
 *                            deterministic assertion.
 *   - INTERACTION_ASSERTED:  Dedicated deterministic test explicitly triggered
 *                            and asserted the pair's shared mechanic outcome.
 *   - DO_E2E_ASSERTED:       Verified end-to-end through real Cloudflare Durable
 *                            Object WebSocket / SQLite persistence integration.
 *
 * ONLY `INTERACTION_ASSERTED` and `DO_E2E_ASSERTED` count as verified
 * deterministic pairwise coverage.
 *
 * Every entry is machine-checked at load time against the actual test file on
 * disk (ensuring `testFile` exists and contains `testCaseId` and both role IDs).
 */

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');

function canonicalPairId(roleA, roleB) {
  return roleA < roleB ? `${roleA}::${roleB}` : `${roleB}::${roleA}`;
}

/**
 * Verified behavioral interaction evidence registry.
 * Every entry was manually audited against the actual test code to confirm that
 * the pair's shared mechanics ACTUALLY interact and are deterministically asserted
 * (NOT incidental co-occurrence in an unrelated test or multi-subtest block).
 *
 * Fields required by Phase 8F-1:
 *  - pairId:             canonical sorted `roleA::roleB`
 *  - roles:              [roleA, roleB]
 *  - rulesetId:          ruleset under which interaction was verified
 *  - playerCount:        seat count in the deterministic test
 *  - testFile:           relative path from repo root
 *  - testCaseId:         exact test title prefix / stable ID present in testFile
 *  - triggeredMechanics: mechanics actually executed in the test
 *  - assertedOutcomes:   explicit behavioral assertions checked by the test
 *  - evidenceType:       'INTERACTION_ASSERTED' | 'DO_E2E_ASSERTED'
 *  - introducedInPhase:  'pre-8f' | '8f'
 */
const VERIFIED_INTERACTION_EVIDENCE = [
  // ==========================================================================
  // PRE-8F VERIFIED HIGH-RISK PAIRS (15 truly verified out of historical 56!)
  // ==========================================================================
  {
    roles: ['exp1_undead', 'exp2_bonnie'],
    rulesetId: 'full-expansion',
    playerCount: 7,
    testFile: 'test/boardgame-phase8e-interactions.test.cjs',
    testCaseId: '8E2-B',
    triggeredMechanics: ['resurrection', 'dynamic_allegiance', 'elimination_triggers'],
    assertedOutcomes: [
      '1st lethal by Bonnie puts Undead into DORMANT_PENDING_REVIVE without converting Bonnie (stays wanderer)',
      '2nd lethal by Bonnie commits FINAL_ELIMINATED and converts Bonnie to effective mist-order',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_antimony', 'exp1_cassie'],
    rulesetId: 'starter-fifty-six',
    playerCount: 4,
    testFile: 'test/boardgame-phase7d-integration.test.cjs',
    testCaseId: 'P7D-1',
    triggeredMechanics: ['skill_copying', 'victory_copying'],
    assertedOutcomes: [
      'Cyclic COPY_GOAL Antimony <-> Cassie detected by CopiedVictoryGraph (cycleCount >= 1) and both fail closed',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp2_bonnie', 'exp2_nc_soldier'],
    rulesetId: 'full-expansion',
    playerCount: 8,
    testFile: 'test/boardgame-phase8e-interactions.test.cjs',
    testCaseId: '8E2-E',
    triggeredMechanics: ['dynamic_allegiance', 'elimination_triggers', 'immediate_victory'],
    assertedOutcomes: [
      'N.C. Soldier recruitment against Shadow-converted Bonnie rejected (ok: false)',
      'Bonnie converting away from Neutral blocks N.C. Soldier alliance victory even with 3 weapons',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_lloyd', 'exp1_voodoo'],
    rulesetId: 'full-expansion',
    playerCount: 4,
    testFile: 'test/boardgame-phase8e-interactions.test.cjs',
    testCaseId: '8E2-A',
    triggeredMechanics: ['turn_ownership', 'global_interrupt', 'private_pending_choice'],
    assertedOutcomes: [
      'Lloyd interrupts Voodoo-hijacked victim ATTACK pre-roll via lloyd_interrupt_attack and hijacked turn remains invariant-clean',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_vengeful_spirit', 'exp1_undead'],
    rulesetId: 'starter-fifty-six',
    playerCount: 4,
    testFile: 'test/boardgame-phase7b.test.cjs',
    testCaseId: 'P7B-5',
    triggeredMechanics: ['resurrection', 'skill_copying', 'elimination_triggers', 'private_pending_choice'],
    assertedOutcomes: [
      '1st lethal on Undead enters DORMANT_PENDING_REVIVE with pendingChoice === null (VS does NOT trigger)',
      '2nd lethal commits FINAL_ELIMINATED and opens secret vengeful_spirit_copy_skill',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_voodoo', 'exp2_cruz'],
    rulesetId: 'full-expansion',
    playerCount: 5,
    testFile: 'test/boardgame-phase8e-interactions.test.cjs',
    testCaseId: '8E2-A',
    triggeredMechanics: ['turn_ownership', 'private_pending_choice', 'reveal_events'],
    assertedOutcomes: [
      'Voodoo commanding Cruz to draw Black card opens cruz_black_redraw owned by Cruz',
      'Voodoo rejected on RESOLVE_CHOICE; Cruz resolves cleanly and control returns',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_undead', 'exp1_antimony'],
    rulesetId: 'full-expansion',
    playerCount: 6,
    testFile: 'test/boardgame-phase8e-interactions.test.cjs',
    testCaseId: '8E2-D',
    triggeredMechanics: ['resurrection', 'skill_copying', 'elimination_triggers'],
    assertedOutcomes: [
      'Undead dormancy does not trigger Antimony; permanent death copies exp1_undead skill',
      'Antimony copying Undead enters DORMANT_PENDING_REVIVE on Antimony 1st lethal',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_bethany', 'exp2_colt'],
    rulesetId: 'starter-forty-eight',
    playerCount: 6,
    testFile: 'test/boardgame-phase6d-integration.test.cjs',
    testCaseId: 'P6D-2',
    triggeredMechanics: ['victory_copying', 'equipment_transfer', 'immediate_victory'],
    assertedOutcomes: [
      'Bethany SHARE_OUTCOME bound to Colt does NOT win when Bethany holds 3 Colt weapons while Colt holds 0',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_bethany', 'exp1_antimony'],
    rulesetId: 'full-expansion',
    playerCount: 4,
    testFile: 'test/boardgame-phase8b-stateful-audit.test.cjs',
    testCaseId: 'BUG-8B-08',
    triggeredMechanics: ['skill_copying', 'victory_copying'],
    assertedOutcomes: [
      'Antimony copying unbound Bethany and later designating Chosen h1 shares h1 victory via buildVictoryDependencyLinks',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_undead', 'exp2_cain'],
    rulesetId: 'starter-fifty-six',
    playerCount: 6,
    testFile: 'test/boardgame-phase7d-integration.test.cjs',
    testCaseId: 'P7D-5',
    triggeredMechanics: ['resurrection', 'elimination_triggers', 'immediate_victory'],
    assertedOutcomes: [
      'Undead dormancy blocks Cain 6P personal victory (8E2-B) and revived Undead eliminating Cain over real DO WebSocket triggers multi-faction dual victory',
    ],
    evidenceType: 'DO_E2E_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_anathema', 'exp1_arnold'],
    rulesetId: 'full-expansion',
    playerCount: 6,
    testFile: 'test/boardgame-phase8e-do-chaos.test.cjs',
    testCaseId: '8E3-4',
    triggeredMechanics: ['damage_redirection', 'damage_reflection', 'private_pending_choice'],
    assertedOutcomes: [
      'Anathema lethal redirect onto hidden Arnold opens secret arnold_reflect_lethal, survives SQLite DO hibernation, reflects onto original attacker without infinite loop',
    ],
    evidenceType: 'DO_E2E_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_anathema', 'exp1_antimony'],
    rulesetId: 'full-expansion',
    playerCount: 4,
    testFile: 'test/boardgame-phase8b-stateful-audit.test.cjs',
    testCaseId: 'BUG-8B-07',
    triggeredMechanics: ['skill_copying', 'damage_redirection'],
    assertedOutcomes: [
      'Antimony copying dead Anathema casts curse via USE_SKILL, suffers 1 HP unpreventable end-turn cost, and redirects incoming ev-07 damage onto cursed target',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp2_cain', 'exp2_bonnie'],
    rulesetId: 'starter-fifty-six',
    playerCount: 6,
    testFile: 'test/boardgame-phase7d-integration.test.cjs',
    testCaseId: 'P7D-5',
    triggeredMechanics: ['dynamic_allegiance', 'immediate_victory'],
    assertedOutcomes: [
      'Converted Shadow Bonnie persists across DO hibernation and co-wins when Cain death triggers multi-faction dual victory over real DO WebSocket',
    ],
    evidenceType: 'DO_E2E_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_cindy', 'exp1_arnold'],
    rulesetId: 'starter-forty-eight',
    playerCount: 4,
    testFile: 'test/boardgame-phase6d-integration.test.cjs',
    testCaseId: 'P6D-1',
    triggeredMechanics: ['damage_reflection', 'private_pending_choice'],
    assertedOutcomes: [
      'Cindy lethal attack on hidden Arnold -> Arnold reflects -> Cindy triggers secret retaliation killing 1-HP Arnold cleanly with zero loop',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['lang-anh-san', 'exp2_nc_soldier'],
    rulesetId: 'starter-fifty-six',
    playerCount: 6,
    testFile: 'test/boardgame-phase7b.test.cjs',
    testCaseId: 'P7B-9',
    triggeredMechanics: ['dynamic_allegiance', 'attack_declaration', 'immediate_victory'],
    assertedOutcomes: [
      'N.C. Soldier recruits revealed Bob at >=5 wounds into alliance, grants copied recruitment skill, enforces leader-only 3-weapon ownership',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },

  // ==========================================================================
  // PRE-8F VERIFIED NON-HIGH-RISK PAIRS (0 < score < 15 — traceable evidence)
  // ==========================================================================
  {
    roles: ['exp1_voodoo', 'exp1_felicia'],
    rulesetId: 'full-expansion',
    playerCount: 4,
    testFile: 'test/boardgame-phase8e-interactions.test.cjs',
    testCaseId: '8E2-A',
    triggeredMechanics: ['turn_ownership', 'private_pending_choice'],
    assertedOutcomes: ['Felicia owns felicia_draw_choice under Voodoo hijack; Voodoo cannot view or resolve it'],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_voodoo', 'exp2_gloria'],
    rulesetId: 'full-expansion',
    playerCount: 4,
    testFile: 'test/boardgame-phase8e-interactions.test.cjs',
    testCaseId: '8E2-A',
    triggeredMechanics: ['turn_ownership', 'reveal_events'],
    assertedOutcomes: ['Voodoo controlling Gloria at Church draws and resolves both White cards sequentially without deadlock'],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_voodoo', 'exp2_father_harrison'],
    rulesetId: 'full-expansion',
    playerCount: 4,
    testFile: 'test/boardgame-phase8e-interactions.test.cjs',
    testCaseId: '8E2-A',
    triggeredMechanics: ['turn_ownership', 'reveal_events'],
    assertedOutcomes: ['Voodoo controlling revealed Father Harrison rolls dice cleanly without BUG-8B-09 deadlock'],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_undead', 'exp2_gideon'],
    rulesetId: 'full-expansion',
    playerCount: 7,
    testFile: 'test/boardgame-phase8e-interactions.test.cjs',
    testCaseId: '8E2-B',
    triggeredMechanics: ['resurrection', 'elimination_triggers'],
    assertedOutcomes: ['Undead dormancy grants Gideon 0 draws; permanent Shadow elimination triggers Gideon 3 White card draw'],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_anathema', 'exp1_wrath'],
    rulesetId: 'full-expansion',
    playerCount: 6,
    testFile: 'test/boardgame-phase8e-interactions.test.cjs',
    testCaseId: '8E2-C',
    triggeredMechanics: ['damage_redirection', 'private_pending_choice'],
    assertedOutcomes: ['Wrath turn-start AoE redirected from Anathema onto cursed victim'],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_anathema', 'exp2_gideon'],
    rulesetId: 'full-expansion',
    playerCount: 5,
    testFile: 'test/boardgame-phase8e-interactions.test.cjs',
    testCaseId: '8E2-C',
    triggeredMechanics: ['damage_redirection', 'elimination_triggers'],
    assertedOutcomes: ['Anathema redirected lethal onto Shadow triggers Gideon White-card reward'],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_vengeful_spirit', 'exp2_gideon'],
    rulesetId: 'full-expansion',
    playerCount: 6,
    testFile: 'test/boardgame-phase8e-interactions.test.cjs',
    testCaseId: '8E2-D',
    triggeredMechanics: ['skill_copying', 'healing', 'elimination_triggers'],
    assertedOutcomes: ['BUG-8E-02: Shadow VS copying Gideon does NOT get Hunter-only eq-13 Advent heal'],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_antimony', 'exp2_gideon'],
    rulesetId: 'full-expansion',
    playerCount: 6,
    testFile: 'test/boardgame-phase8e-interactions.test.cjs',
    testCaseId: '8E2-D',
    triggeredMechanics: ['skill_copying', 'healing', 'elimination_triggers'],
    assertedOutcomes: ['BUG-8E-02: Neutral Antimony copying Gideon gets A/E/U eq-14 Chocolate heal, blocked on eq-13 Advent'],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_bethany', 'exp2_diana'],
    rulesetId: 'full-expansion',
    playerCount: 8,
    testFile: 'test/boardgame-phase8e-interactions.test.cjs',
    testCaseId: '8E2-D',
    triggeredMechanics: ['victory_copying'],
    assertedOutcomes: ['Bethany -> Diana transitive SHARE_OUTCOME wins; Bethany <-> Diana cycle detected and fails closed'],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_cassie', 'exp1_clairvoyant'],
    rulesetId: 'full-expansion',
    playerCount: 8,
    testFile: 'test/boardgame-phase8e-interactions.test.cjs',
    testCaseId: '8E2-D',
    triggeredMechanics: ['victory_copying'],
    assertedOutcomes: ['Cassie <-> Clairvoyant cyclic COPY_GOAL detected and fails closed; Clairvoyant -> Cassie -> Colt non-cyclic chain verified in P6D-2'],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_cassie', 'exp2_bonnie'],
    rulesetId: 'full-expansion',
    playerCount: 8,
    testFile: 'test/boardgame-phase8e-interactions.test.cjs',
    testCaseId: '8E2-E',
    triggeredMechanics: ['dynamic_allegiance', 'victory_copying'],
    assertedOutcomes: ['Cassie does NOT bind to Shadow-converted Bonnie'],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp2_diana', 'exp2_bonnie'],
    rulesetId: 'full-expansion',
    playerCount: 6,
    testFile: 'test/boardgame-phase8b-stateful-audit.test.cjs',
    testCaseId: 'BUG-8B-06',
    triggeredMechanics: ['dynamic_allegiance', 'victory_copying'],
    assertedOutcomes: ['Diana does NOT bind Shadow-converted Bonnie as Neutral customer'],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_vengeful_spirit', 'exp1_arnold'],
    rulesetId: 'full-expansion',
    playerCount: 4,
    testFile: 'test/boardgame-phase8b-stateful-audit.test.cjs',
    testCaseId: 'BUG-8B-07',
    triggeredMechanics: ['skill_copying', 'damage_reflection'],
    assertedOutcomes: ['VS copying dead Arnold reflects lethal damage and keeps 1 HP'],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_vengeful_spirit', 'exp2_usurper'],
    rulesetId: 'full-expansion',
    playerCount: 4,
    testFile: 'test/boardgame-phase8b-stateful-audit.test.cjs',
    testCaseId: 'BUG-8B-07',
    triggeredMechanics: ['skill_copying', 'healing'],
    assertedOutcomes: ['VS copying dead Usurper blocks First Aid heal and sets public usurperAuraActive'],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_lloyd', 'exp1_antimony'],
    rulesetId: 'starter-fifty-six',
    playerCount: 4,
    testFile: 'test/boardgame-phase7d-integration.test.cjs',
    testCaseId: 'P7D-1',
    triggeredMechanics: ['global_interrupt', 'skill_copying'],
    assertedOutcomes: ['Multi-Lloyd seat-distance chain: original Lloyd declines -> Antimony copied Lloyd cancels attack for 2 HP'],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: 'pre-8f',
  },
  {
    roles: ['exp1_voodoo', 'exp1_undead'],
    rulesetId: 'starter-fifty-six',
    playerCount: 6,
    testFile: 'test/boardgame-phase7d-integration.test.cjs',
    testCaseId: 'P7D-5',
    triggeredMechanics: ['turn_ownership', 'resurrection'],
    assertedOutcomes: ['Voodoo hijacked turn sends Undead dormant over real DO, expires grant cleanly, Undead revives across hibernation'],
    evidenceType: 'DO_E2E_ASSERTED',
    introducedInPhase: 'pre-8f',
  },

  // ==========================================================================
  // PHASE 8F-2 — ALL 16 HISTORICAL HIGH-RISK GAPS CLOSED DETERMINISTICALLY!
  // ==========================================================================
  // Group A — Voodoo + Elimination Triggers (#1–#2)
  {
    roles: ['exp1_voodoo', 'exp1_vengeance'],
    rulesetId: 'expansion-1',
    playerCount: 4,
    testFile: 'test/boardgame-phase8f-16-pairs.test.cjs',
    testCaseId: '8F2-A1',
    triggeredMechanics: ['turn_ownership', 'elimination_triggers', 'private_pending_choice'],
    assertedOutcomes: [
      'Hijacked Vengeance owns kill credit & vengeance_chain_strike choice; Voodoo rejected on RESOLVE_CHOICE',
      'Vengeance killing Voodoo via chain cancels active TurnControlGrant with zero event duplication',
      'Decline & timeout preserve once-per-match and complete hijacked turn cleanly',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: '8f',
  },
  {
    roles: ['exp1_voodoo', 'exp1_wendigo'],
    rulesetId: 'expansion-1',
    playerCount: 4,
    testFile: 'test/boardgame-phase8f-16-pairs.test.cjs',
    testCaseId: '8F2-A2',
    triggeredMechanics: ['turn_ownership', 'elimination_triggers', 'private_pending_choice', 'healing'],
    assertedOutcomes: [
      'Secret wendigo_reveal_heal owned by Wendigo, hidden from controller Voodoo privateView & publicView',
      'Accept reveals & heals exactly 1 HP once; decline & timeout leak zero role identity and finish hijacked turn',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: '8f',
  },

  // Group B — Undead + Immediate Victory (#3–#7)
  {
    roles: ['exp1_undead', 'lang-tien-phong'],
    rulesetId: 'expansion-1',
    playerCount: 5,
    testFile: 'test/boardgame-phase8f-16-pairs.test.cjs',
    testCaseId: '8F2-B1',
    triggeredMechanics: ['resurrection', 'elimination_triggers', 'immediate_victory'],
    assertedOutcomes: [
      'Undead 1st lethal dormancy leaves firstDeadPlayerId === null and Daniel hidden',
      'Daniel dying while Undead dormant wins immediately as 1st committed death; Undead 2nd lethal triggers Daniel Scream once',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: '8f',
  },
  {
    roles: ['exp1_undead', 'lang-cuu-ho'],
    rulesetId: 'expansion-1',
    playerCount: 5,
    testFile: 'test/boardgame-phase8f-16-pairs.test.cjs',
    testCaseId: '8F2-B2',
    triggeredMechanics: ['resurrection', 'elimination_triggers', 'immediate_victory'],
    assertedOutcomes: [
      '1st lethal by Charles on Undead with deadCount=2 does NOT satisfy deadCount>=3 or charlesKillWon',
      '2nd lethal on revived Undead commits deadCount=3 and triggers Charles immediate victory once',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: '8f',
  },
  {
    roles: ['exp1_undead', 'exp2_dalton'],
    rulesetId: 'full-expansion',
    playerCount: 5,
    testFile: 'test/boardgame-phase8f-16-pairs.test.cjs',
    testCaseId: '8F2-B3',
    triggeredMechanics: ['resurrection', 'elimination_triggers', 'immediate_victory'],
    assertedOutcomes: [
      'Activated Dalton 1st lethal on Undead creates dormancy with zero Dalton kill credit',
      '2nd lethal on revived Undead commits single daltonKillWinTriggeredIds entry and immediate Dalton victory',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: '8f',
  },
  {
    roles: ['exp1_undead', 'exp2_cruz'],
    rulesetId: 'full-expansion',
    playerCount: 5,
    testFile: 'test/boardgame-phase8f-16-pairs.test.cjs',
    testCaseId: '8F2-B4',
    triggeredMechanics: ['resurrection', 'elimination_triggers', 'immediate_victory'],
    assertedOutcomes: [
      'Cruz ev-07 Black-card 1st lethal on Undead enters dormancy with zero Cruz victory trigger',
      'Cruz ev-08 2nd lethal on revived Undead commits single cruzWinTriggeredIds entry and immediate Cruz victory',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: '8f',
  },
  {
    roles: ['exp1_undead', 'exp2_arlene'],
    rulesetId: 'full-expansion',
    playerCount: 5,
    testFile: 'test/boardgame-phase8f-16-pairs.test.cjs',
    testCaseId: '8F2-B5',
    triggeredMechanics: ['resurrection', 'elimination_triggers', 'immediate_victory'],
    assertedOutcomes: [
      'Hunter Flare hitting last-Shadow Undead (dormant) + Arlene (dead) grants Arlene solo win without premature Hunter co-win',
      'Revived Shadow Undead killing Arlene does NOT trigger Arlene Hunter-kill victory',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: '8f',
  },

  // Group C — Voodoo + Start-of-Turn Skills (#8–#13)
  {
    roles: ['exp1_voodoo', 'exp1_wrath'],
    rulesetId: 'expansion-1',
    playerCount: 4,
    testFile: 'test/boardgame-phase8f-16-pairs.test.cjs',
    testCaseId: '8F2-C1',
    triggeredMechanics: ['turn_ownership', 'private_pending_choice', 'reveal_events'],
    assertedOutcomes: [
      'wrath_turn_start_aoe owned by Wrath; Voodoo rejected on RESOLVE_CHOICE and USE_SKILL',
      'Wrath AoE killing Voodoo cancels grant immediately; decline & timeout return control to Voodoo and expire grant cleanly',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: '8f',
  },
  {
    roles: ['exp1_voodoo', 'exp1_bipolar'],
    rulesetId: 'expansion-1',
    playerCount: 5,
    testFile: 'test/boardgame-phase8f-16-pairs.test.cjs',
    testCaseId: '8F2-C2',
    triggeredMechanics: ['turn_ownership', 'private_pending_choice', 'healing'],
    assertedOutcomes: [
      'bipolar_fate_coin owned by Bipolar; Voodoo rejected on RESOLVE_CHOICE',
      'Bipolar self-kill cancels grant & advances turn; heal & timeout keep turn ownership and grant expiry deterministic',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: '8f',
  },
  {
    roles: ['exp1_voodoo', 'exp1_anathema'],
    rulesetId: 'expansion-1',
    playerCount: 5,
    testFile: 'test/boardgame-phase8f-16-pairs.test.cjs',
    testCaseId: '8F2-C3',
    triggeredMechanics: ['turn_ownership', 'private_pending_choice', 'reveal_events'],
    assertedOutcomes: [
      'Revealed Anathema owns anathema_curse_target; hijacked END_TURN still applies Anathema 1 HP unpreventable end-of-turn cost',
      'Hidden Anathema does not auto-prompt and Voodoo is blocked on REVEAL_ROLE & USE_SKILL',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: '8f',
  },
  {
    roles: ['exp1_voodoo', 'exp1_bethany'],
    rulesetId: 'expansion-1',
    playerCount: 5,
    testFile: 'test/boardgame-phase8f-16-pairs.test.cjs',
    testCaseId: '8F2-C4',
    triggeredMechanics: ['turn_ownership', 'private_pending_choice', 'equipment_transfer'],
    assertedOutcomes: [
      'bethany_designate_chosen owned by Bethany; Voodoo rejected on RESOLVE_CHOICE',
      'Designation transfers item atomically; timeout preserves equipment and returns control to Voodoo until expiry',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: '8f',
  },
  {
    roles: ['exp1_voodoo', 'exp1_clairvoyant'],
    rulesetId: 'expansion-1',
    playerCount: 5,
    testFile: 'test/boardgame-phase8f-16-pairs.test.cjs',
    testCaseId: '8F2-C-DO',
    triggeredMechanics: ['turn_ownership', 'private_pending_choice', 'reveal_events'],
    assertedOutcomes: [
      'clairvoyant_peek_copy owned by Clairvoyant; private peek clue strictly isolated from controller Voodoo & public view',
      'Real SQLite DO disconnect + hibernation + F5 reconnect preserves Clairvoyant choice ownership & privacy (8F2-C-DO + 8F2-C5)',
    ],
    evidenceType: 'DO_E2E_ASSERTED',
    introducedInPhase: '8f',
  },
  {
    roles: ['exp1_voodoo', 'exp2_visions'],
    rulesetId: 'full-expansion',
    playerCount: 4,
    testFile: 'test/boardgame-phase8f-16-pairs.test.cjs',
    testCaseId: '8F2-C6',
    triggeredMechanics: ['turn_ownership', 'private_pending_choice', 'reveal_events'],
    assertedOutcomes: [
      'visions_mark_target owned by Visions; Voodoo cannot attack Visions marked target during hijack',
      'Start-of-turn Visions tick killing 1-HP Voodoo cancels grant immediately so Visions regains own turn',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: '8f',
  },

  // Group D — Arnold + Damage Prevention (#14–#16)
  {
    roles: ['exp1_arnold', 'exp1_gwendolen'],
    rulesetId: 'expansion-1',
    playerCount: 5,
    testFile: 'test/boardgame-phase8f-16-pairs.test.cjs',
    testCaseId: '8F2-D1',
    triggeredMechanics: ['damage_reflection', 'immunity_prevention', 'private_pending_choice'],
    assertedOutcomes: [
      'Gwendolen lethal counterattack opens secret arnold_reflect_lethal; Arnold keeps exact 1 HP, reflects onto Gwendolen with zero loop',
      'Non-lethal Gwendolen counter does NOT open Arnold lethal reflection',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: '8f',
  },
  {
    roles: ['exp1_arnold', 'exp1_undying'],
    rulesetId: 'expansion-1',
    playerCount: 5,
    testFile: 'test/boardgame-phase8f-16-pairs.test.cjs',
    testCaseId: '8F2-D2',
    triggeredMechanics: ['damage_reflection', 'immunity_prevention', 'private_pending_choice'],
    assertedOutcomes: [
      'Arnold reflects 2 lethal dmg onto hidden 2-HP Undying -> Undying BEFORE_DAMAGE reduces 2->1 and survives at >=1 HP',
      'Undying declining reduction dies cleanly once with zero loop',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: '8f',
  },
  {
    roles: ['exp1_arnold', 'exp2_urban_legend'],
    rulesetId: 'full-expansion',
    playerCount: 5,
    testFile: 'test/boardgame-phase8f-16-pairs.test.cjs',
    testCaseId: '8F2-D3',
    triggeredMechanics: ['damage_reflection', 'immunity_prevention', 'healing', 'private_pending_choice'],
    assertedOutcomes: [
      'Arnold reflection of ev-07 lethal is skill dmg (NOT converted to heal by Urban Legend); Arnold keeps exact 2 HP',
      'Urban Legend BEFORE_DAMAGE converts incoming Arnold ev-07 into +2 HP heal prior to lethal check; non-lethal ev-07 skips Arnold reflection',
    ],
    evidenceType: 'INTERACTION_ASSERTED',
    introducedInPhase: '8f',
  },
].map((entry) => ({
  pairId: canonicalPairId(entry.roles[0], entry.roles[1]),
  ...entry,
}));

/**
 * Machine-verify every evidence registry entry against actual disk test files
 * so phantom or stale testCaseIds immediately fail validation.
 */
function validateEvidenceRegistry() {
  const fileCache = new Map();
  const errors = [];
  const byPair = new Map();

  for (const entry of VERIFIED_INTERACTION_EVIDENCE) {
    if (!['INTERACTION_ASSERTED', 'DO_E2E_ASSERTED'].includes(entry.evidenceType)) {
      errors.push(`Invalid evidenceType ${entry.evidenceType} for ${entry.pairId}`);
    }
    const abs = path.join(REPO, entry.testFile);
    if (!fs.existsSync(abs)) {
      errors.push(`Missing testFile ${entry.testFile} for ${entry.pairId}`);
      continue;
    }
    if (!fileCache.has(abs)) {
      fileCache.set(abs, fs.readFileSync(abs, 'utf8'));
    }
    const src = fileCache.get(abs);
    if (!src.includes(entry.testCaseId)) {
      errors.push(`testCaseId "${entry.testCaseId}" not found in ${entry.testFile} for ${entry.pairId}`);
    }
    for (const rid of entry.roles) {
      if (!src.includes(rid)) {
        errors.push(`Role "${rid}" not referenced in ${entry.testFile} for ${entry.pairId}`);
      }
    }
    if (!byPair.has(entry.pairId)) byPair.set(entry.pairId, []);
    byPair.get(entry.pairId).push(entry);
  }

  return { ok: errors.length === 0, errors, byPair };
}

module.exports = {
  canonicalPairId,
  VERIFIED_INTERACTION_EVIDENCE,
  validateEvidenceRegistry,
};
