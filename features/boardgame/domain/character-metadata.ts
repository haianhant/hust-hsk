// ---------------------------------------------------------------------------
// features/boardgame/domain/character-metadata.ts — CAP-10 Curated, Versioned
// Fictional Character Metadata Registry (All 66 Role IDs).
//
// Nguyên tắc nghiêm ngặt:
// - Chỉ mô tả thuộc tính nhân vật hư cấu (role-level fictional design metadata).
// - TUYỆT ĐỐI KHÔNG suy diễn từ hồ sơ người chơi thật, avatar hay `player.appearance`.
// - Nhân vật không phải con người, sinh vật siêu nhiên, máy móc, danh hiệu hoặc
//   không có dữ liệu thiết kế giới tính rõ ràng ĐỀU được gán `'unspecified'`.
// - Phục vụ xác định mục tiêu hợp lệ cho Aaron (`exp2_aaron` — `RC-14`) một cách
//   thuần xác định trên server, không lộ metadata của vai đang úp cho client.
// ---------------------------------------------------------------------------

import { EXPANSION_CHARACTER_CATALOG } from './expansion-catalog';
import { ROLES_CATALOG } from './roles';

export const CHARACTER_METADATA_VERSION = '2026.11-p6a' as const;

export type CanonicalFictionalGender = 'female' | 'male' | 'unspecified';

export interface CanonicalCharacterMetadataEntry {
  readonly roleId: string;
  readonly sourceName: string;
  readonly fictionalGender: CanonicalFictionalGender;
  readonly provenance: string;
  readonly notes?: string;
}

const CURATED_GENDER_BY_ROLE_ID: Readonly<
  Record<string, { readonly gender: CanonicalFictionalGender; readonly provenance: string; readonly notes?: string }>
> = {
  // ---- Classic (10 roles) ----
  'gac-ky-thuat': {
    gender: 'male',
    provenance: 'classic-core-design:george',
  },
  'gac-truc-ban': {
    gender: 'female',
    provenance: 'classic-core-design:emi',
  },
  'gac-radio': {
    gender: 'unspecified',
    provenance: 'classic-core-design:franklin-localized-vy',
    notes: 'Original SH Franklin vs localized HUSTVerse Vy diverge; conservatively marked unspecified.',
  },
  'suong-an-danh': {
    gender: 'unspecified',
    provenance: 'classic-core-design:vampire',
    notes: 'Supernatural monster archetype; unspecified.',
  },
  'suong-tin-gia': {
    gender: 'unspecified',
    provenance: 'classic-core-design:unknown',
    notes: 'Shapeshifter / unknown identity; unspecified.',
  },
  'suong-gac-cong': {
    gender: 'unspecified',
    provenance: 'classic-core-design:werewolf',
    notes: 'Supernatural beast archetype; unspecified.',
  },
  'lang-anh-san': {
    gender: 'male',
    provenance: 'classic-core-design:bob',
  },
  'lang-quan-sat': {
    gender: 'female',
    provenance: 'classic-core-design:allie',
  },
  'lang-cuu-ho': {
    gender: 'male',
    provenance: 'classic-core-design:charles',
  },
  'lang-tien-phong': {
    gender: 'male',
    provenance: 'classic-core-design:daniel',
  },

  // ---- Expansion 1 — Hunter (8 roles) ----
  exp1_gayle: {
    gender: 'unspecified',
    provenance: 'exp1-design:gayle',
    notes: 'Unisex source name without explicit canonical gender confirmation; marked unspecified.',
  },
  exp1_lloyd: {
    gender: 'male',
    provenance: 'exp1-design:lloyd',
  },
  exp1_felicia: {
    gender: 'female',
    provenance: 'exp1-design:felicia',
  },
  exp1_ernest: {
    gender: 'male',
    provenance: 'exp1-design:ernest',
  },
  exp1_elysia: {
    gender: 'female',
    provenance: 'exp1-design:elysia',
  },
  exp1_fallen: {
    gender: 'unspecified',
    provenance: 'exp1-design:fallen',
    notes: 'Title-based supernatural entity; marked unspecified.',
  },
  exp1_gwendolen: {
    gender: 'female',
    provenance: 'exp1-design:gwendolen',
  },
  exp1_fea: {
    gender: 'female',
    provenance: 'exp1-design:fea',
  },

  // ---- Expansion 1 — Shadow (9 roles) ----
  exp1_vengeful_spirit: {
    gender: 'unspecified',
    provenance: 'exp1-design:vengeful-spirit',
    notes: 'Non-human spirit archetype; marked unspecified.',
  },
  exp1_undying: {
    gender: 'unspecified',
    provenance: 'exp1-design:undying',
    notes: 'Armored supernatural entity; marked unspecified.',
  },
  exp1_victor: {
    gender: 'male',
    provenance: 'exp1-design:victor',
  },
  exp1_vengeance: {
    gender: 'unspecified',
    provenance: 'exp1-design:vengeance',
    notes: 'Concept/title archetype; marked unspecified.',
  },
  exp1_wendigo: {
    gender: 'unspecified',
    provenance: 'exp1-design:wendigo',
    notes: 'Mythic monster archetype; marked unspecified.',
  },
  exp1_voodoo: {
    gender: 'unspecified',
    provenance: 'exp1-design:voodoo',
    notes: 'Title archetype; marked unspecified.',
  },
  exp1_udi: {
    gender: 'unspecified',
    provenance: 'exp1-design:udi',
    notes: 'Ambiguous gender in source catalog; marked unspecified.',
  },
  exp1_wrath: {
    gender: 'unspecified',
    provenance: 'exp1-design:wrath',
    notes: 'Concept/title archetype; marked unspecified.',
  },
  exp1_undead: {
    gender: 'unspecified',
    provenance: 'exp1-design:undead',
    notes: 'Non-human undead archetype; marked unspecified.',
  },

  // ---- Expansion 1 — Neutral (9 roles) ----
  exp1_bipolar: {
    gender: 'unspecified',
    provenance: 'exp1-design:bipolar',
    notes: 'Dual persona archetype; marked unspecified.',
  },
  exp1_anathema: {
    gender: 'unspecified',
    provenance: 'exp1-design:anathema',
    notes: 'Spectral curse bearer title; marked unspecified.',
  },
  exp1_bethany: {
    gender: 'female',
    provenance: 'exp1-design:bethany',
  },
  exp1_cindy: {
    gender: 'female',
    provenance: 'exp1-design:cindy',
  },
  exp1_arnold: {
    gender: 'male',
    provenance: 'exp1-design:arnold',
  },
  exp1_antimony: {
    gender: 'unspecified',
    provenance: 'exp1-design:antimony',
    notes: 'Alchemical codename without explicit gender; marked unspecified.',
  },
  exp1_cassie: {
    gender: 'female',
    provenance: 'exp1-design:cassie',
  },
  exp1_clairvoyant: {
    gender: 'unspecified',
    provenance: 'exp1-design:clairvoyant',
    notes: 'Title-based seer archetype; marked unspecified.',
  },
  exp1_angel: {
    gender: 'female',
    provenance: 'exp1-design:angel',
  },

  // ---- Expansion 2 — Hunter (9 roles) ----
  exp2_father_harrison: {
    gender: 'male',
    provenance: 'exp2-design:father-harrison',
  },
  exp2_gloria: {
    gender: 'female',
    provenance: 'exp2-design:gloria',
  },
  exp2_fujiko: {
    gender: 'female',
    provenance: 'exp2-design:fujiko',
  },
  exp2_freyja: {
    gender: 'female',
    provenance: 'exp2-design:freyja',
  },
  exp2_gideon: {
    gender: 'male',
    provenance: 'exp2-design:gideon',
  },
  exp2_g43: {
    gender: 'unspecified',
    provenance: 'exp2-design:g43',
    notes: 'Android/codename unit; marked unspecified.',
  },
  exp2_eleanor: {
    gender: 'female',
    provenance: 'exp2-design:eleanor',
  },
  exp2_elise: {
    gender: 'female',
    provenance: 'exp2-design:elise',
  },
  exp2_fiona: {
    gender: 'female',
    provenance: 'exp2-design:fiona',
  },

  // ---- Expansion 2 — Shadow (9 roles) ----
  exp2_warlock: {
    gender: 'unspecified',
    provenance: 'exp2-design:warlock',
    notes: 'Title archetype; marked unspecified.',
  },
  exp2_witch: {
    gender: 'female',
    provenance: 'exp2-design:witch',
  },
  exp2_wyvern: {
    gender: 'unspecified',
    provenance: 'exp2-design:wyvern',
    notes: 'Draconic monster archetype; marked unspecified.',
  },
  exp2_umibozu: {
    gender: 'unspecified',
    provenance: 'exp2-design:umibozu',
    notes: 'Folklore sea entity; marked unspecified.',
  },
  exp2_urban_legend: {
    gender: 'unspecified',
    provenance: 'exp2-design:urban-legend',
    notes: 'Folklore entity archetype; marked unspecified.',
  },
  exp2_visions: {
    gender: 'unspecified',
    provenance: 'exp2-design:visions',
    notes: 'Abstract apparition archetype; marked unspecified.',
  },
  exp2_unchained: {
    gender: 'unspecified',
    provenance: 'exp2-design:unchained',
    notes: 'Title archetype; marked unspecified.',
  },
  exp2_warlord: {
    gender: 'unspecified',
    provenance: 'exp2-design:warlord',
    notes: 'Title archetype; marked unspecified.',
  },
  exp2_usurper: {
    gender: 'unspecified',
    provenance: 'exp2-design:usurper',
    notes: 'Title archetype; marked unspecified.',
  },

  // ---- Expansion 2 — Neutral (12 roles) ----
  exp2_cain: {
    gender: 'male',
    provenance: 'exp2-design:cain',
  },
  exp2_dalton: {
    gender: 'male',
    provenance: 'exp2-design:dalton',
  },
  exp2_april_skipps: {
    gender: 'female',
    provenance: 'exp2-design:april-skipps',
    notes: 'Primary human explorer April is female (accompanied by animal companion Skipps).',
  },
  exp2_bonnie: {
    gender: 'female',
    provenance: 'exp2-design:bonnie',
  },
  exp2_bianca: {
    gender: 'female',
    provenance: 'exp2-design:bianca',
  },
  exp2_colt: {
    gender: 'male',
    provenance: 'exp2-design:colt',
  },
  exp2_cruz: {
    gender: 'male',
    provenance: 'exp2-design:cruz',
  },
  exp2_diana: {
    gender: 'female',
    provenance: 'exp2-design:diana',
  },
  exp2_aaron: {
    gender: 'male',
    provenance: 'exp2-design:aaron',
  },
  exp2_arlene: {
    gender: 'female',
    provenance: 'exp2-design:arlene',
  },
  exp2_bryon: {
    gender: 'male',
    provenance: 'exp2-design:bryon',
  },
  exp2_nc_soldier: {
    gender: 'unspecified',
    provenance: 'exp2-design:nc-soldier',
    notes: 'Title/trooper archetype without explicit gender; marked unspecified.',
  },
};

function buildAllCanonicalMetadata(): readonly CanonicalCharacterMetadataEntry[] {
  const entries: CanonicalCharacterMetadataEntry[] = [];

  for (const classic of ROLES_CATALOG) {
    const sourceNameMatch = /^([A-Za-z0-9 &.'-]+)\s*·/.exec(classic.title);
    const sourceName = sourceNameMatch ? sourceNameMatch[1].trim() : classic.name;
    const curated = CURATED_GENDER_BY_ROLE_ID[classic.id];
    entries.push({
      roleId: classic.id,
      sourceName,
      fictionalGender: curated?.gender ?? 'unspecified',
      provenance: curated?.provenance ?? 'fallback:unspecified',
      ...(curated?.notes ? { notes: curated.notes } : {}),
    });
  }

  for (const exp of EXPANSION_CHARACTER_CATALOG) {
    const curated = CURATED_GENDER_BY_ROLE_ID[exp.id];
    entries.push({
      roleId: exp.id,
      sourceName: exp.sourceName,
      fictionalGender: curated?.gender ?? 'unspecified',
      provenance: curated?.provenance ?? 'fallback:unspecified',
      ...(curated?.notes ? { notes: curated.notes } : {}),
    });
  }

  return entries;
}

export const CANONICAL_CHARACTER_METADATA_LIST: readonly CanonicalCharacterMetadataEntry[] =
  buildAllCanonicalMetadata();

export const CANONICAL_CHARACTER_METADATA_BY_ROLE_ID: Readonly<
  Record<string, CanonicalCharacterMetadataEntry>
> = Object.fromEntries(CANONICAL_CHARACTER_METADATA_LIST.map((entry) => [entry.roleId, entry]));

export function getCanonicalCharacterMetadata(
  roleId: string,
): CanonicalCharacterMetadataEntry {
  return (
    CANONICAL_CHARACTER_METADATA_BY_ROLE_ID[roleId] ?? {
      roleId,
      sourceName: roleId,
      fictionalGender: 'unspecified',
      provenance: 'fallback:unknown-role',
    }
  );
}

export function getCanonicalCharacterGender(roleId: string): CanonicalFictionalGender {
  return getCanonicalCharacterMetadata(roleId).fictionalGender;
}

export function isEligibleFemaleRole(roleId: string): boolean {
  return getCanonicalCharacterGender(roleId) === 'female';
}

export function listAllCanonicalCharacterMetadata(): readonly CanonicalCharacterMetadataEntry[] {
  return CANONICAL_CHARACTER_METADATA_LIST;
}
