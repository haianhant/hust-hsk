#!/usr/bin/env node
/**
 * Bóng Đêm KTX — Character Expansion Catalog Validator (Phase 0 & Phase 1)
 *
 * Verifies schema integrity, exact faction/expansion counts (26 + 30 = 56),
 * zero duplicate IDs/names, zero Classic ID collisions, source URL traceability,
 * and strict rule-status synchronization with rules-clarifications.md.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_JSON_PATH = path.join(ROOT, 'docs/boardgame-expansion/character-catalog.json');
const CATALOG_MD_PATH = path.join(ROOT, 'docs/boardgame-expansion/character-catalog.md');
const CLARIFICATIONS_PATH = path.join(ROOT, 'docs/boardgame-expansion/rules-clarifications.md');

const CLASSIC_ROLE_IDS = new Set([
  'gac-ky-thuat',
  'gac-truc-ban',
  'gac-radio',
  'suong-an-danh',
  'suong-tin-gia',
  'suong-gac-cong',
  'lang-anh-san',
  'lang-quan-sat',
  'lang-cuu-ho',
  'lang-tien-phong',
]);

const REQUIRED_FIELDS = [
  'id',
  'sourceName',
  'expansionId',
  'faction',
  'maxHp',
  'skillName',
  'skillDescription',
  'trigger',
  'activationConditions',
  'effect',
  'targetMode',
  'usageLimit',
  'revealRequirement',
  'victoryCondition',
  'complexity',
  'implementationDifficulty',
  'sourceUrl',
  'rulesStatus',
  'implementationStatus',
];

const VALID_EXPANSIONS = new Set(['expansion-1', 'expansion-2']);
const VALID_FACTIONS = new Set(['hunter', 'shadow', 'neutral']);
const VALID_TRIGGERS = new Set([
  'ON_TURN_START',
  'ON_MOVE',
  'ON_DRAW_CARD',
  'BEFORE_ATTACK',
  'AFTER_ATTACK',
  'BEFORE_DAMAGE',
  'AFTER_DAMAGE',
  'ON_HEAL',
  'ON_ROLE_REVEAL',
  'ON_ELIMINATION',
  'ON_EQUIPMENT_CHANGE',
  'ON_INVESTIGATE',
  'ON_VICTORY_CHECK',
  'PASSIVE',
  'ACTIVE_SKILL',
  'REACTION_INTERRUPT',
  'unknown',
]);
const VALID_TARGET_MODES = new Set([
  'self',
  'single_other',
  'single_any',
  'multi_other',
  'area_same_location',
  'all_faction',
  'attacker',
  'victim',
  'none',
  'needs-clarification',
  'unknown',
]);
const VALID_USAGE_LIMITS = new Set([
  'once_per_match',
  'passive',
  'repeatable',
  'per_turn',
  'per_attack',
  'needs-clarification',
  'unknown',
]);
const VALID_REVEAL_REQUIREMENTS = new Set([
  'must_be_revealed',
  'reveal_to_activate',
  'reveal_on_trigger',
  'hidden_allowed',
  'forced_reveal_on_condition',
  'needs-clarification',
  'unknown',
]);
const VALID_COMPLEXITY = new Set(['low', 'medium', 'high', 'very-high']);
const VALID_DIFFICULTY = new Set(['tier-1', 'tier-2', 'tier-3', 'tier-4']);
const VALID_RULES_STATUS = new Set(['verified', 'needs-clarification', 'unknown']);
const VALID_IMPL_STATUS = new Set(['not-started', 'in-progress', 'implemented']);

function fail(errors) {
  console.error('❌ Character Catalog Validation FAILED:');
  for (const err of errors) {
    console.error('  -', err);
  }
  process.exit(1);
}

function main() {
  const errors = [];

  if (!fs.existsSync(CATALOG_JSON_PATH)) {
    fail([`Missing catalog JSON: ${CATALOG_JSON_PATH}`]);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(CATALOG_JSON_PATH, 'utf8'));
  } catch (err) {
    fail([`Invalid JSON in character-catalog.json: ${err.message}`]);
  }

  if (!Array.isArray(data.characters)) {
    fail(['data.characters must be an array']);
  }

  if (data.activeInGameplay !== false) {
    errors.push('data.activeInGameplay must be false (expansion characters must not enter active pool)');
  }

  const expectedSources = new Set(Object.values(data.sources || {}));
  if (expectedSources.size !== 6) {
    errors.push(`Expected 6 primary source URLs in data.sources, got ${expectedSources.size}`);
  }

  const chars = data.characters;
  if (chars.length !== 56) {
    errors.push(`Expected exactly 56 expansion characters, got ${chars.length}`);
  }

  const seenIds = new Set();
  const seenNames = new Set();
  const counts = {
    'expansion-1': { hunter: 0, shadow: 0, neutral: 0 },
    'expansion-2': { hunter: 0, shadow: 0, neutral: 0 },
  };
  const statusCounts = { verified: 0, 'needs-clarification': 0, unknown: 0 };

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const label = `[#${i + 1} ${c && c.id ? c.id : 'MISSING_ID'}]`;

    for (const field of REQUIRED_FIELDS) {
      if (!(field in c) || c[field] === undefined || c[field] === null || c[field] === '') {
        errors.push(`${label} Missing or empty required field "${field}"`);
      }
    }

    if (typeof c.id !== 'string' || !/^exp[12]_[a-z0-9_]+$/.test(c.id)) {
      errors.push(`${label} Invalid id format "${c.id}"`);
    } else {
      if (seenIds.has(c.id)) errors.push(`${label} Duplicate id "${c.id}"`);
      seenIds.add(c.id);
      if (CLASSIC_ROLE_IDS.has(c.id)) errors.push(`${label} Collides with Classic roleId "${c.id}"`);
    }

    if (typeof c.sourceName === 'string') {
      const normName = c.sourceName.trim().toLowerCase();
      if (seenNames.has(normName)) errors.push(`${label} Duplicate sourceName "${c.sourceName}"`);
      seenNames.add(normName);
    }

    if (!VALID_EXPANSIONS.has(c.expansionId)) {
      errors.push(`${label} Invalid expansionId "${c.expansionId}"`);
    }
    if (!VALID_FACTIONS.has(c.faction)) {
      errors.push(`${label} Invalid faction "${c.faction}"`);
    }
    if (VALID_EXPANSIONS.has(c.expansionId) && VALID_FACTIONS.has(c.faction)) {
      counts[c.expansionId][c.faction] += 1;
      const expectedPrefix = c.expansionId === 'expansion-1' ? 'exp1_' : 'exp2_';
      if (typeof c.id === 'string' && !c.id.startsWith(expectedPrefix)) {
        errors.push(`${label} id prefix must match expansionId (${expectedPrefix})`);
      }
    }

    if (!Number.isInteger(c.maxHp) || c.maxHp < 8 || c.maxHp > 14) {
      errors.push(`${label} Invalid maxHp "${c.maxHp}" (expected integer 8..14)`);
    }

    if (!VALID_TRIGGERS.has(c.trigger)) {
      errors.push(`${label} Invalid trigger "${c.trigger}"`);
    }
    if (!VALID_TARGET_MODES.has(c.targetMode)) {
      errors.push(`${label} Invalid targetMode "${c.targetMode}"`);
    }
    if (!VALID_USAGE_LIMITS.has(c.usageLimit)) {
      errors.push(`${label} Invalid usageLimit "${c.usageLimit}"`);
    }
    if (!VALID_REVEAL_REQUIREMENTS.has(c.revealRequirement)) {
      errors.push(`${label} Invalid revealRequirement "${c.revealRequirement}"`);
    }
    if (!VALID_COMPLEXITY.has(c.complexity)) {
      errors.push(`${label} Invalid complexity "${c.complexity}"`);
    }
    if (!VALID_DIFFICULTY.has(c.implementationDifficulty)) {
      errors.push(`${label} Invalid implementationDifficulty "${c.implementationDifficulty}"`);
    }
    if (!VALID_RULES_STATUS.has(c.rulesStatus)) {
      errors.push(`${label} Invalid rulesStatus "${c.rulesStatus}"`);
    } else {
      statusCounts[c.rulesStatus] += 1;
    }
    if (!VALID_IMPL_STATUS.has(c.implementationStatus)) {
      errors.push(`${label} Invalid implementationStatus "${c.implementationStatus}"`);
    }
    if (c.implementationStatus !== 'not-started') {
      errors.push(`${label} Phase 0/1 constraint violation: implementationStatus must be "not-started", got "${c.implementationStatus}"`);
    }

    if (
      typeof c.sourceUrl !== 'string' ||
      !c.sourceUrl.startsWith('https://thegioiboardgame.vn/blogs/review-boardgame/') ||
      !expectedSources.has(c.sourceUrl)
    ) {
      errors.push(`${label} Invalid or unlisted sourceUrl "${c.sourceUrl}"`);
    }
  }

  // Exact expansion & faction counts
  const expectedCounts = {
    'expansion-1': { hunter: 8, shadow: 9, neutral: 9 },
    'expansion-2': { hunter: 9, shadow: 9, neutral: 12 },
  };
  for (const expId of Object.keys(expectedCounts)) {
    for (const faction of Object.keys(expectedCounts[expId])) {
      const actual = counts[expId][faction];
      const expected = expectedCounts[expId][faction];
      if (actual !== expected) {
        errors.push(`Count mismatch for ${expId}/${faction}: expected ${expected}, got ${actual}`);
      }
    }
  }

  // Cross-check with rules-clarifications.md
  if (!fs.existsSync(CLARIFICATIONS_PATH)) {
    errors.push(`Missing rules-clarifications.md at ${CLARIFICATIONS_PATH}`);
  } else {
    const clarText = fs.readFileSync(CLARIFICATIONS_PATH, 'utf8');
    for (const c of chars) {
      const idToken = '`' + c.id + '`';
      if (c.rulesStatus === 'needs-clarification') {
        if (!clarText.includes(idToken)) {
          errors.push(`Character ${c.id} has rulesStatus="needs-clarification" but is NOT documented in rules-clarifications.md`);
        }
      } else if (c.rulesStatus === 'verified') {
        // Ensure verified characters are not accidentally listed inside an RC-xx UNRESOLVED heading or bullet
        const rcSections = clarText.split(/^### RC-/m).slice(1);
        for (const section of rcSections) {
          if (section.includes('**`UNRESOLVED`**') && section.includes(idToken)) {
            // Only flag if it appears in the "Nhân vật liên quan:" or heading or primary bullet
            const firstLines = section.split('\n').slice(0, 12).join('\n');
            if (firstLines.includes(idToken)) {
              errors.push(`Character ${c.id} is marked "verified" in JSON but listed as primary subject of an UNRESOLVED section in rules-clarifications.md`);
            }
          }
        }
      }
    }
  }

  // Cross-check with character-catalog.md if present
  if (!fs.existsSync(CATALOG_MD_PATH)) {
    errors.push(`Missing character-catalog.md at ${CATALOG_MD_PATH}`);
  } else {
    const mdText = fs.readFileSync(CATALOG_MD_PATH, 'utf8');
    for (const c of chars) {
      if (!mdText.includes('`' + c.id + '`')) {
        errors.push(`Character ${c.id} missing from character-catalog.md`);
      }
      if (!mdText.includes(c.sourceName)) {
        errors.push(`Character sourceName "${c.sourceName}" missing from character-catalog.md`);
      }
    }
  }

  if (errors.length > 0) {
    fail(errors);
  }

  console.log('✅ Character Catalog Validation PASSED');
  console.log(`   Total expansion characters : ${chars.length} (+ 10 Classic = ${chars.length + 10})`);
  console.log(`   Expansion 1 (26)           : Hunter=${counts['expansion-1'].hunter}, Shadow=${counts['expansion-1'].shadow}, Neutral=${counts['expansion-1'].neutral}`);
  console.log(`   Expansion 2 (30)           : Hunter=${counts['expansion-2'].hunter}, Shadow=${counts['expansion-2'].shadow}, Neutral=${counts['expansion-2'].neutral}`);
  console.log(`   Rules status               : verified=${statusCounts.verified}, needs-clarification=${statusCounts['needs-clarification']}, unknown=${statusCounts.unknown}`);
  console.log(`   Active in gameplay         : ${data.activeInGameplay} (all 56 implementationStatus="not-started")`);
}

main();
