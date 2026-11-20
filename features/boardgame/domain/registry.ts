// ---------------------------------------------------------------------------
// features/boardgame/domain/registry.ts — CharacterRegistry & RulesetRegistry
//
// Phân tách rõ 5 lớp trách nhiệm cho từng nhân vật (10 Classic + 56 Mở rộng = 66):
//  1. CharacterMetadata           — thông số chuẩn hóa & truy xuất nguồn
//  2. SkillDefinition             — đặc tả kỹ năng phi thực thi
//  3. ExecutableSkillBinding|null — liên kết thực thi kỹ năng (null với 56 tướng mới)
//  4. VictoryConditionDefinition  — đặc tả & liên kết thực thi điều kiện thắng
//  5. CharacterUiPresentation     — thông tin hiển thị UI
//
// Cổng an toàn bắt buộc (Phase 1):
// - Một nhân vật CHỈ hợp lệ để vào pool phân vai khi đồng thời:
//   rulesStatus === 'verified' && implementationStatus === 'implemented' &&
//   availability === 'available' && skillImpl !== null && victoryImpl !== null.
// - Chỉ ruleset `classic` được phép chạy production trong Phase 1.
// ---------------------------------------------------------------------------

import {
  BOARD_GAME_CATALOG_VERSION,
  BOARD_GAME_MAX_PLAYERS,
  BOARD_GAME_MIN_PLAYERS,
  isValidBoardGameRulesetId,
  type BoardGameFactionId,
  type BoardGameRoleId,
  type BoardGameRulesetAvailability,
  type BoardGameRulesetId,
  type ClassicBoardGameRoleId,
} from '../../../shared/contracts/boardgame';
import {
  EXPANSION_CHARACTER_CATALOG,
  type CatalogComplexity,
  type CatalogImplementationDifficulty,
  type CatalogImplementationStatus,
  type CatalogRulesStatus,
  type ExpansionCatalogRecord,
  type ExpansionPackId,
  type SourceFactionId,
} from './expansion-catalog';
import {
  ALL_EXPANSION_SKILL_BINDINGS,
  ALL_EXPANSION_VICTORY_BINDINGS,
  PHASE2A_ROLE_IDS,
  PHASE2_IMPLEMENTED_EXPANSION_ROLE_IDS,
  STARTER_SIXTEEN_EXPANSION_ROLE_IDS,
  STARTER_TWENTY_SIX_EXPANSION_ROLE_IDS,
} from './expansion-skills';
import { ROLES_CATALOG, getRoleDistribution } from './roles';
import {
  CLASSIC_SKILL_ADAPTER_BINDINGS,
  type SkillDefinition,
  type SkillTrigger,
} from './skill-engine';
import {
  CLASSIC_VICTORY_DEFINITIONS,
  type VictoryArchetype,
  type VictoryConditionDefinition,
} from './victory-engine';

export type CharacterAvailability = 'available' | 'coming-soon' | 'disabled';
export type CharacterExpansionId = 'classic' | ExpansionPackId;

export interface CharacterMetadata {
  readonly id: string;
  readonly sourceName: string;
  readonly expansionId: CharacterExpansionId;
  readonly faction: BoardGameFactionId;
  readonly sourceFaction: SourceFactionId;
  readonly maxHp: number;
  readonly sourceUrl: string;
  readonly rulesStatus: CatalogRulesStatus;
  readonly implementationStatus: CatalogImplementationStatus;
  readonly complexity: CatalogComplexity;
  readonly implementationDifficulty: CatalogImplementationDifficulty;
}

export interface ExecutableSkillBinding {
  readonly handlerId: string;
  readonly trigger: SkillTrigger;
  readonly resolverSymbol: string;
}

export interface ExecutableVictoryBinding {
  readonly evaluatorId: string;
  readonly archetype: VictoryArchetype;
}

export interface CharacterUiPresentation {
  readonly displayName: string;
  readonly title: string;
  readonly secretGoalText: string;
  readonly portraitKey: string;
}

export interface CharacterRegistryEntry {
  readonly id: string;
  readonly availability: CharacterAvailability;
  readonly metadata: CharacterMetadata;
  readonly skillSpec: SkillDefinition;
  readonly skillImpl: ExecutableSkillBinding | null;
  readonly victorySpec: VictoryConditionDefinition;
  readonly victoryImpl: ExecutableVictoryBinding | null;
  readonly uiMeta: CharacterUiPresentation;
}

export interface RulesetDefinition {
  readonly id: BoardGameRulesetId;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly availability: BoardGameRulesetAvailability;
  readonly enabledInProduction: boolean;
  readonly isExperimental?: boolean;
  readonly allowExperimentalHouseRules?: boolean;
  readonly includedExpansions: readonly CharacterExpansionId[];
  readonly explicitCharacterIds?: readonly string[];
  readonly expectedCharacterCount: number;
  readonly catalogVersion: string;
}

export interface CharacterPlayabilityOptions {
  readonly allowExperimentalHouseRules?: boolean;
}

export interface RulesetValidationOptions {
  readonly allowExperimental?: boolean;
}

export interface PlayableRolePools {
  readonly lanternGuard: readonly string[];
  readonly mistOrder: readonly string[];
  readonly wanderer: readonly string[];
}

export type RulesetValidationResult =
  | {
      readonly ok: true;
      readonly ruleset: RulesetDefinition;
      readonly catalogVersion: string;
      readonly pools: PlayableRolePools;
    }
  | {
      readonly ok: false;
      readonly code: 'INVALID_RULESET' | 'RULESET_UNAVAILABLE';
      readonly error: string;
    };

export class BoardGameRulesetError extends Error {
  readonly code: 'INVALID_RULESET' | 'RULESET_UNAVAILABLE';

  constructor(code: 'INVALID_RULESET' | 'RULESET_UNAVAILABLE', message: string) {
    super(message);
    this.name = 'BoardGameRulesetError';
    this.code = code;
  }
}

export function mapSourceFactionToBoardGameFaction(
  sourceFaction: SourceFactionId,
): BoardGameFactionId {
  switch (sourceFaction) {
    case 'hunter':
      return 'lantern-guard';
    case 'shadow':
      return 'mist-order';
    case 'neutral':
      return 'wanderer';
  }
}

export function mapBoardGameFactionToSourceFaction(
  faction: BoardGameFactionId,
): SourceFactionId {
  switch (faction) {
    case 'lantern-guard':
      return 'hunter';
    case 'mist-order':
      return 'shadow';
    case 'wanderer':
      return 'neutral';
  }
}

/**
 * Cổng kiểm tra bắt buộc: chỉ cho phép nhân vật vào pool chơi thực tế khi toàn bộ
 * luật đã được xác minh (hoặc house-rule được chấp thuận trong experimental test pool),
 * triển khai hoàn chỉnh, bật khả dụng và có cả skillImpl + victoryImpl.
 */
export function isCharacterPlayable(
  entry: CharacterRegistryEntry,
  options?: CharacterPlayabilityOptions,
): boolean {
  const rulesOk =
    entry.metadata.rulesStatus === 'verified' ||
    (Boolean(options?.allowExperimentalHouseRules) &&
      entry.metadata.rulesStatus === 'house-rule-approved');
  return (
    entry.availability === 'available' &&
    rulesOk &&
    entry.metadata.implementationStatus === 'implemented' &&
    entry.skillImpl !== null &&
    entry.victoryImpl !== null
  );
}

function inferExpansionVictoryArchetype(rec: ExpansionCatalogRecord): VictoryArchetype {
  if (rec.faction === 'hunter' || rec.faction === 'shadow') return 'faction';
  switch (rec.id) {
    case 'exp2_bonnie':
    case 'exp2_nc_soldier':
      return 'dynamic-allegiance';
    case 'exp1_antimony':
    case 'exp1_cassie':
    case 'exp1_clairvoyant':
    case 'exp2_diana':
      return 'copied-victory';
    case 'exp2_cain':
      return 'simultaneous-victory';
    case 'exp1_bethany':
    case 'exp2_aaron':
    case 'exp2_bryon':
      return 'shared';
    case 'exp1_bipolar':
      return 'conditional';
    default:
      return 'individual';
  }
}

function buildClassicCharacterEntries(): CharacterRegistryEntry[] {
  return ROLES_CATALOG.map((role) => {
    const classicId = role.id as ClassicBoardGameRoleId;
    const skillBinding = CLASSIC_SKILL_ADAPTER_BINDINGS[classicId];
    const victoryDef = CLASSIC_VICTORY_DEFINITIONS[classicId];
    const sourceNameMatch = /^([A-Za-z0-9 &.'-]+)\s*·/.exec(role.title);
    const sourceName = sourceNameMatch ? sourceNameMatch[1].trim() : role.name;

    return {
      id: role.id,
      availability: 'available',
      metadata: {
        id: role.id,
        sourceName,
        expansionId: 'classic',
        faction: role.faction,
        sourceFaction: mapBoardGameFactionToSourceFaction(role.faction),
        maxHp: role.maxHp,
        sourceUrl: 'internal://features/boardgame/domain/roles.ts',
        rulesStatus: 'verified',
        implementationStatus: 'implemented',
        complexity: 'low',
        implementationDifficulty: 'tier-1',
      },
      skillSpec: {
        skillId: skillBinding.handlerId,
        name: role.skillName,
        description: role.skillSummary,
        trigger: skillBinding.trigger,
        usageLimit: role.oncePerMatch
          ? 'once_per_match'
          : role.targetMode === 'passive'
            ? 'passive'
            : 'repeatable',
        revealRequirement:
          role.id === 'suong-tin-gia'
            ? 'hidden_allowed'
            : role.id === 'lang-tien-phong'
              ? 'forced_reveal_on_condition'
              : 'must_be_revealed',
        targetMode: role.targetMode,
        cooldownRounds: role.cooldownRounds,
        oncePerMatch: role.oncePerMatch,
      },
      skillImpl: {
        handlerId: skillBinding.handlerId,
        trigger: skillBinding.trigger,
        resolverSymbol: skillBinding.resolverSymbol,
      },
      victorySpec: victoryDef,
      victoryImpl: {
        evaluatorId: victoryDef.evaluatorId ?? `classic:${role.id}`,
        archetype: victoryDef.archetype,
      },
      uiMeta: {
        displayName: role.name,
        title: role.title,
        secretGoalText: role.secretGoalText,
        portraitKey: role.id,
      },
    };
  });
}

function buildExpansionCharacterEntries(): CharacterRegistryEntry[] {
  return EXPANSION_CHARACTER_CATALOG.map((rec) => {
    const faction = mapSourceFactionToBoardGameFaction(rec.faction);
    const archetype = inferExpansionVictoryArchetype(rec);
    const skillBinding = ALL_EXPANSION_SKILL_BINDINGS[rec.id] ?? null;
    const victoryBinding = ALL_EXPANSION_VICTORY_BINDINGS[rec.id] ?? null;
    const isImplemented =
      rec.implementationStatus === 'implemented' &&
      skillBinding !== null &&
      victoryBinding !== null;

    return {
      id: rec.id,
      availability: isImplemented ? 'available' : 'coming-soon',
      metadata: {
        id: rec.id,
        sourceName: rec.sourceName,
        expansionId: rec.expansionId,
        faction,
        sourceFaction: rec.faction,
        maxHp: rec.maxHp,
        sourceUrl: rec.sourceUrl,
        rulesStatus: rec.rulesStatus,
        implementationStatus: rec.implementationStatus,
        complexity: rec.complexity,
        implementationDifficulty: rec.implementationDifficulty,
      },
      skillSpec: {
        skillId: skillBinding?.handlerId ?? `${rec.id}:skill`,
        name: rec.skillName,
        description: rec.skillDescription,
        trigger: rec.trigger,
        usageLimit: rec.usageLimit,
        revealRequirement: rec.revealRequirement,
        targetMode: rec.targetMode,
        cooldownRounds: 0,
        oncePerMatch: rec.usageLimit === 'once_per_match',
      },
      skillImpl: skillBinding
        ? {
            handlerId: skillBinding.handlerId,
            trigger: skillBinding.trigger,
            resolverSymbol: skillBinding.resolverSymbol,
          }
        : null,
      victorySpec: {
        id: `${rec.id}:victory`,
        archetype,
        summary: rec.victoryCondition,
        timing: archetype === 'faction' ? 'immediate' : 'both',
        evaluatorId: victoryBinding?.evaluatorId ?? null,
      },
      victoryImpl: victoryBinding
        ? {
            evaluatorId: victoryBinding.evaluatorId,
            archetype: victoryBinding.archetype,
          }
        : null,
      uiMeta: {
        displayName: rec.sourceName,
        title: `${rec.sourceName} · ${rec.expansionId === 'expansion-1' ? 'Mở rộng 1' : 'Mở rộng 2'}`,
        secretGoalText: rec.victoryCondition,
        portraitKey: rec.id,
      },
    };
  });
}

export class CharacterRegistry {
  private readonly entriesById = new Map<string, CharacterRegistryEntry>();
  private readonly orderedEntries: CharacterRegistryEntry[] = [];

  constructor(initialEntries: readonly CharacterRegistryEntry[] = []) {
    for (const entry of initialEntries) {
      this.register(entry);
    }
  }

  register(entry: CharacterRegistryEntry): void {
    const cleanId = entry.id.trim();
    if (!cleanId) {
      throw new Error('CharacterRegistry: character id must be non-empty.');
    }
    if (this.entriesById.has(cleanId)) {
      throw new Error(`CharacterRegistry: duplicate character id "${cleanId}".`);
    }
    if (entry.metadata.id !== cleanId) {
      throw new Error(
        `CharacterRegistry: entry.id "${cleanId}" does not match metadata.id "${entry.metadata.id}".`,
      );
    }
    this.entriesById.set(cleanId, entry);
    this.orderedEntries.push(entry);
  }

  get(id: string): CharacterRegistryEntry | null {
    return this.entriesById.get(id) ?? null;
  }

  has(id: string): boolean {
    return this.entriesById.has(id);
  }

  size(): number {
    return this.orderedEntries.length;
  }

  listAll(): readonly CharacterRegistryEntry[] {
    return [...this.orderedEntries];
  }

  listByExpansions(
    expansions: readonly CharacterExpansionId[],
  ): readonly CharacterRegistryEntry[] {
    const allowed = new Set<CharacterExpansionId>(expansions);
    return this.orderedEntries.filter((entry) => allowed.has(entry.metadata.expansionId));
  }

  listPlayableByExpansions(
    expansions: readonly CharacterExpansionId[],
    options?: CharacterPlayabilityOptions,
  ): readonly CharacterRegistryEntry[] {
    return this.listByExpansions(expansions).filter((entry) =>
      isCharacterPlayable(entry, options),
    );
  }

  listIncompleteByExpansions(
    expansions: readonly CharacterExpansionId[],
    options?: CharacterPlayabilityOptions,
  ): readonly CharacterRegistryEntry[] {
    return this.listByExpansions(expansions).filter(
      (entry) => !isCharacterPlayable(entry, options),
    );
  }
}

export const DEFAULT_RULESET_DEFINITIONS: readonly RulesetDefinition[] = [
  {
    id: 'classic',
    label: 'Classic (Bản Gốc · 10 tướng)',
    shortLabel: 'Classic',
    description:
      '10 nhân vật chuẩn hộp cơ bản Shadow Hunters (3 Đội Săn Đêm · 3 Hội Bóng Đêm · 4 Kẻ Độc Hành). Đã kiểm thử đầy đủ.',
    availability: 'available',
    enabledInProduction: true,
    includedExpansions: ['classic'],
    expectedCharacterCount: 10,
    catalogVersion: BOARD_GAME_CATALOG_VERSION,
  },
  {
    id: 'expansion-1',
    label: 'Expansion 1 (Classic + 26 tướng)',
    shortLabel: 'Expansion 1',
    description:
      'Bổ sung 26 nhân vật Mở rộng 1 (8 Hunter · 9 Shadow · 9 Neutral). Đang ở giai đoạn hoàn thiện kỹ năng.',
    availability: 'coming-soon',
    enabledInProduction: false,
    includedExpansions: ['classic', 'expansion-1'],
    expectedCharacterCount: 36,
    catalogVersion: BOARD_GAME_CATALOG_VERSION,
  },
  {
    id: 'expansion-2',
    label: 'Expansion 2 (Classic + 30 tướng)',
    shortLabel: 'Expansion 2',
    description:
      'Bổ sung 30 nhân vật Mở rộng 2 (9 Hunter · 9 Shadow · 12 Neutral). Đang ở giai đoạn hoàn thiện kỹ năng.',
    availability: 'coming-soon',
    enabledInProduction: false,
    includedExpansions: ['classic', 'expansion-2'],
    expectedCharacterCount: 40,
    catalogVersion: BOARD_GAME_CATALOG_VERSION,
  },
  {
    id: 'full-expansion',
    label: 'Full Expansion (Toàn bộ 66 tướng)',
    shortLabel: 'Full 66',
    description:
      'Tổng hợp toàn bộ 66 nhân vật (10 Classic + 26 MR1 + 30 MR2). Chỉ mở khi toàn bộ kỹ năng & điều kiện thắng được kiểm chứng.',
    availability: 'coming-soon',
    enabledInProduction: false,
    includedExpansions: ['classic', 'expansion-1', 'expansion-2'],
    expectedCharacterCount: 66,
    catalogVersion: BOARD_GAME_CATALOG_VERSION,
  },
];

export const EXPERIMENTAL_RULESET_DEFINITIONS: readonly RulesetDefinition[] = [
  {
    id: 'starter-four',
    label: 'Starter Four (Nội bộ · 10 Classic + 4 Phase 2A)',
    shortLabel: 'Starter 4 (Test)',
    description:
      'Pool kiểm thử nội bộ gồm 10 tướng Classic + 4 tướng Phase 2A đã xác minh (Wendigo, G43, Fiona, Wyvern). Tắt trên production.',
    availability: 'experimental',
    enabledInProduction: false,
    isExperimental: true,
    allowExperimentalHouseRules: false,
    includedExpansions: ['classic', 'expansion-1', 'expansion-2'],
    explicitCharacterIds: [
      ...ROLES_CATALOG.map((r) => r.id),
      ...PHASE2A_ROLE_IDS,
    ],
    expectedCharacterCount: 14,
    catalogVersion: BOARD_GAME_CATALOG_VERSION,
  },
  {
    id: 'starter-eight',
    label: 'Starter Eight (Thử nghiệm nội bộ · 10 Classic + 8 Tướng Mở rộng)',
    shortLabel: 'Starter 8 (Exp)',
    description:
      'Pool thử nghiệm nội bộ gồm 10 tướng Classic + 8 tướng Starter Eight (4 luật xác minh Phase 2A + 4 house-rule thử nghiệm HUSTVerse Phase 2B). Tắt trên production.',
    availability: 'experimental',
    enabledInProduction: false,
    isExperimental: true,
    allowExperimentalHouseRules: true,
    includedExpansions: ['classic', 'expansion-1', 'expansion-2'],
    explicitCharacterIds: [
      ...ROLES_CATALOG.map((r) => r.id),
      ...PHASE2_IMPLEMENTED_EXPANSION_ROLE_IDS,
    ],
    expectedCharacterCount: 18,
    catalogVersion: BOARD_GAME_CATALOG_VERSION,
  },
  {
    id: 'starter-sixteen',
    label: 'Starter Sixteen (Thử nghiệm Wave 2 · 10 Classic + 16 Tướng Mở rộng)',
    shortLabel: 'Starter 16 (Exp)',
    description:
      'Pool thử nghiệm nội bộ gồm 26 nhân vật (10 Classic + 8 Phase 2 + 8 Phase 3 Wave 2: 10 Hunter · 10 Shadow · 6 Neutral). Tắt trên production.',
    availability: 'experimental',
    enabledInProduction: false,
    isExperimental: true,
    allowExperimentalHouseRules: true,
    includedExpansions: ['classic', 'expansion-1', 'expansion-2'],
    explicitCharacterIds: [
      ...ROLES_CATALOG.map((r) => r.id),
      ...STARTER_SIXTEEN_EXPANSION_ROLE_IDS,
    ],
    expectedCharacterCount: 26,
    catalogVersion: BOARD_GAME_CATALOG_VERSION,
  },
  {
    id: 'starter-twenty-six',
    label: 'Starter Twenty-Six (Thử nghiệm Wave 3 · 10 Classic + 26 Tướng Mở rộng)',
    shortLabel: 'Starter 26 (Exp)',
    description:
      'Pool thử nghiệm nội bộ gồm 36 nhân vật (10 Classic + 8 Phase 2 + 8 Wave 2 + 10 Wave 3: 14 Hunter · 14 Shadow · 8 Neutral). Tắt trên production.',
    availability: 'experimental',
    enabledInProduction: false,
    isExperimental: true,
    allowExperimentalHouseRules: true,
    includedExpansions: ['classic', 'expansion-1', 'expansion-2'],
    explicitCharacterIds: [
      ...ROLES_CATALOG.map((r) => r.id),
      ...STARTER_TWENTY_SIX_EXPANSION_ROLE_IDS,
    ],
    expectedCharacterCount: 36,
    catalogVersion: BOARD_GAME_CATALOG_VERSION,
  },
];

export class RulesetRegistry {
  private readonly rulesetsById = new Map<BoardGameRulesetId, RulesetDefinition>();
  private readonly orderedRulesets: RulesetDefinition[] = [];
  private readonly experimentalRulesetsById = new Map<BoardGameRulesetId, RulesetDefinition>();
  private readonly characters: CharacterRegistry;

  constructor(
    characterRegistry: CharacterRegistry,
    rulesets: readonly RulesetDefinition[] = DEFAULT_RULESET_DEFINITIONS,
    experimentalRulesets: readonly RulesetDefinition[] = EXPERIMENTAL_RULESET_DEFINITIONS,
  ) {
    this.characters = characterRegistry;
    for (const def of rulesets) {
      if (this.rulesetsById.has(def.id)) {
        throw new Error(`RulesetRegistry: duplicate ruleset id "${def.id}".`);
      }
      this.rulesetsById.set(def.id, def);
      this.orderedRulesets.push(def);
    }
    for (const expDef of experimentalRulesets) {
      if (this.rulesetsById.has(expDef.id) || this.experimentalRulesetsById.has(expDef.id)) {
        throw new Error(`RulesetRegistry: duplicate experimental ruleset id "${expDef.id}".`);
      }
      this.experimentalRulesetsById.set(expDef.id, expDef);
    }
  }

  getRuleset(id: unknown, options?: RulesetValidationOptions): RulesetDefinition | null {
    if (!isValidBoardGameRulesetId(id)) return null;
    const prod = this.rulesetsById.get(id);
    if (prod) return prod;
    if (options?.allowExperimental) {
      return this.experimentalRulesetsById.get(id) ?? null;
    }
    return null;
  }

  listRulesets(options?: RulesetValidationOptions): readonly RulesetDefinition[] {
    if (options?.allowExperimental) {
      return [...this.orderedRulesets, ...Array.from(this.experimentalRulesetsById.values())];
    }
    return [...this.orderedRulesets];
  }

  private resolveEntriesForDefinition(def: RulesetDefinition): readonly CharacterRegistryEntry[] {
    if (def.explicitCharacterIds && def.explicitCharacterIds.length > 0) {
      const out: CharacterRegistryEntry[] = [];
      for (const cid of def.explicitCharacterIds) {
        const entry = this.characters.get(cid);
        if (entry) out.push(entry);
      }
      return out;
    }
    return this.characters.listByExpansions(def.includedExpansions);
  }

  listCatalogCharactersForRuleset(
    rulesetId: BoardGameRulesetId,
    options?: RulesetValidationOptions,
  ): readonly CharacterRegistryEntry[] {
    const def = this.getRuleset(rulesetId, options);
    if (!def) return [];
    return this.resolveEntriesForDefinition(def);
  }

  listPlayableCharactersForRuleset(
    rulesetId: BoardGameRulesetId,
    options?: RulesetValidationOptions,
  ): readonly CharacterRegistryEntry[] {
    const def = this.getRuleset(rulesetId, options);
    if (!def) return [];
    const allowedByMode = def.isExperimental
      ? Boolean(options?.allowExperimental)
      : def.enabledInProduction && def.availability === 'available';
    if (!allowedByMode) {
      return [];
    }
    return this.resolveEntriesForDefinition(def).filter((entry) =>
      isCharacterPlayable(entry, {
        allowExperimentalHouseRules: Boolean(def.allowExperimentalHouseRules),
      }),
    );
  }

  validateRulesetForMatch(
    rawRulesetId: unknown,
    playerCount: number = BOARD_GAME_MIN_PLAYERS,
    options?: RulesetValidationOptions,
  ): RulesetValidationResult {
    if (!isValidBoardGameRulesetId(rawRulesetId)) {
      return {
        ok: false,
        code: 'INVALID_RULESET',
        error: `Bộ luật "${String(rawRulesetId)}" không tồn tại trong hệ thống.`,
      };
    }

    const def =
      this.rulesetsById.get(rawRulesetId) ??
      this.experimentalRulesetsById.get(rawRulesetId);
    if (!def) {
      return {
        ok: false,
        code: 'INVALID_RULESET',
        error: `Không tìm thấy cấu hình cho bộ luật "${rawRulesetId}".`,
      };
    }

    if (def.isExperimental) {
      if (!options?.allowExperimental) {
        return {
          ok: false,
          code: 'RULESET_UNAVAILABLE',
          error: `Bộ luật thử nghiệm "${def.shortLabel}" bị khóa trên production — chỉ cho phép chế độ Classic.`,
        };
      }
    } else if (!def.enabledInProduction || def.availability !== 'available') {
      return {
        ok: false,
        code: 'RULESET_UNAVAILABLE',
        error: `Bộ luật "${def.shortLabel}" hiện chưa mở khóa (Coming Soon) — chỉ cho phép chế độ Classic.`,
      };
    }

    const allInRuleset = this.resolveEntriesForDefinition(def);
    if (allInRuleset.length < def.expectedCharacterCount) {
      return {
        ok: false,
        code: 'RULESET_UNAVAILABLE',
        error: `Bộ luật "${def.shortLabel}" mới đăng ký ${allInRuleset.length}/${def.expectedCharacterCount} nhân vật theo quy chuẩn.`,
      };
    }
    const playabilityOpts: CharacterPlayabilityOptions = {
      allowExperimentalHouseRules: Boolean(def.allowExperimentalHouseRules),
    };
    const incomplete = allInRuleset.filter((entry) => !isCharacterPlayable(entry, playabilityOpts));
    if (incomplete.length > 0) {
      return {
        ok: false,
        code: 'RULESET_UNAVAILABLE',
        error: `Bộ luật "${def.shortLabel}" còn ${incomplete.length} nhân vật chưa hoàn thiện gameplay implementation.`,
      };
    }

    const clampedCount = Math.max(
      BOARD_GAME_MIN_PLAYERS,
      Math.min(BOARD_GAME_MAX_PLAYERS, Math.floor(playerCount)),
    );
    const split = getRoleDistribution(clampedCount);
    const lanternGuard = allInRuleset
      .filter((c) => c.metadata.faction === 'lantern-guard')
      .map((c) => c.id);
    const mistOrder = allInRuleset
      .filter((c) => c.metadata.faction === 'mist-order')
      .map((c) => c.id);
    const wanderer = allInRuleset
      .filter((c) => c.metadata.faction === 'wanderer')
      .map((c) => c.id);

    if (
      lanternGuard.length < split.lanternGuard ||
      mistOrder.length < split.mistOrder ||
      wanderer.length < split.wanderer
    ) {
      return {
        ok: false,
        code: 'RULESET_UNAVAILABLE',
        error: `Bộ luật "${def.shortLabel}" không đủ số tướng khả dụng cho trận ${clampedCount} người.`,
      };
    }

    return {
      ok: true,
      ruleset: def,
      catalogVersion: def.catalogVersion,
      pools: {
        lanternGuard,
        mistOrder,
        wanderer,
      },
    };
  }

  resolvePlayableRolePoolOrThrow(
    rawRulesetId: unknown,
    playerCount: number,
    options?: RulesetValidationOptions,
  ): Extract<RulesetValidationResult, { ok: true }> {
    const res = this.validateRulesetForMatch(rawRulesetId, playerCount, options);
    if (!res.ok) {
      throw new BoardGameRulesetError(res.code, res.error);
    }
    return res;
  }
}

export function createCharacterRegistry(
  entries: readonly CharacterRegistryEntry[],
): CharacterRegistry {
  return new CharacterRegistry(entries);
}

export function createRulesetRegistry(
  characters: CharacterRegistry,
  rulesets?: readonly RulesetDefinition[],
  experimentalRulesets?: readonly RulesetDefinition[],
): RulesetRegistry {
  return new RulesetRegistry(characters, rulesets, experimentalRulesets);
}

export const DEFAULT_CHARACTER_REGISTRY = new CharacterRegistry([
  ...buildClassicCharacterEntries(),
  ...buildExpansionCharacterEntries(),
]);

export const DEFAULT_RULESET_REGISTRY = new RulesetRegistry(
  DEFAULT_CHARACTER_REGISTRY,
  DEFAULT_RULESET_DEFINITIONS,
  EXPERIMENTAL_RULESET_DEFINITIONS,
);

/**
 * Helper đọc metadata chuẩn cho bất kỳ roleId Classic nào (tương thích ngược).
 */
export function isClassicRoleId(roleId: string): roleId is ClassicBoardGameRoleId {
  const entry = DEFAULT_CHARACTER_REGISTRY.get(roleId);
  return entry !== null && entry.metadata.expansionId === 'classic';
}
