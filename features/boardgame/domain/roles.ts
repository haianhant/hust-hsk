// ---------------------------------------------------------------------------
// features/boardgame/domain/roles.ts — Đủ 10 Nhân vật nguyên bản hộp cơ bản
// Shadow Hunters (3 Đội Săn Đêm / 3 Hội Bóng Đêm / 4 Kẻ Độc Hành).
// ---------------------------------------------------------------------------

import type {
  BoardGameFactionId,
  BoardGameRoleId,
  ClassicBoardGameRoleId,
} from '../../../shared/contracts/boardgame';
import { EXPANSION_CHARACTER_CATALOG, type ExpansionCatalogRecord } from './expansion-catalog';
import type { CharacterDesign } from './types';

export const FACTION_LABELS: Record<BoardGameFactionId, string> = {
  'lantern-guard': 'Đội Săn Đêm',
  'mist-order': 'Hội Bóng Đêm',
  wanderer: 'Kẻ Độc Hành',
};

export const ROLES_CATALOG: readonly CharacterDesign[] = [
  // -------------------- ĐỘI SĂN ĐÊM (3 Hunter gốc) --------------------
  {
    id: 'gac-ky-thuat',
    name: 'Minh "Kỹ Thuật"',
    title: 'George · Đội trưởng Phá Vây',
    faction: 'lantern-guard',
    maxHp: 14,
    skillName: 'Đòn Phá Vây 1d4',
    skillSummary:
      '1 lần/trận (sau khi lật vai): Chọn 1 người chơi bất kỳ trên bàn, tung 1d4 gây sát thương trực tiếp bằng số nút xúc xắc.',
    cooldownRounds: 0,
    oncePerMatch: true,
    targetMode: 'any-other',
    secretGoalText:
      'Phe Đội Săn Đêm thắng ngay khi toàn bộ Hội Bóng Đêm bị loại khỏi KTX.',
  },
  {
    id: 'gac-truc-ban',
    name: 'Lan "Trực Ban"',
    title: 'Emi · Bước Nhảy Tắt',
    faction: 'lantern-guard',
    maxHp: 10,
    skillName: 'Bước Nhảy Tắt',
    skillSummary:
      'Mỗi lượt (Pha di chuyển, sau khi lật vai): Chọn bước thẳng sang ô cặp đôi cùng Cụm thay vì tung xúc xắc.',
    cooldownRounds: 0,
    oncePerMatch: false,
    targetMode: 'self',
    secretGoalText:
      'Phe Đội Săn Đêm thắng ngay khi toàn bộ Hội Bóng Đêm bị loại khỏi KTX.',
  },
  {
    id: 'gac-radio',
    name: 'Vy "Radio"',
    title: 'Franklin · Sét Cao Áp',
    faction: 'lantern-guard',
    maxHp: 12,
    skillName: 'Xung Cao Áp 1d6',
    skillSummary:
      '1 lần/trận (sau khi lật vai): Chọn 1 người chơi bất kỳ trên bàn, tung 1d6 gây sát thương trực tiếp bằng số nút xúc xắc.',
    cooldownRounds: 0,
    oncePerMatch: true,
    targetMode: 'any-other',
    secretGoalText:
      'Phe Đội Săn Đêm thắng ngay khi toàn bộ Hội Bóng Đêm bị loại khỏi KTX.',
  },

  // -------------------- HỘI BÓNG ĐÊM (3 Shadow gốc) --------------------
  {
    id: 'suong-an-danh',
    name: 'Tú "Ẩn Danh"',
    title: 'Vampire · Hấp Thụ Đêm Khuya',
    faction: 'mist-order',
    maxHp: 13,
    skillName: 'Hấp Thụ Đêm Khuya',
    skillSummary:
      'Nội tại sau khi lật vai: Mỗi khi đòn đánh thường của bạn gây sát thương (> 0), bạn hồi ngay 2 thương tích.',
    cooldownRounds: 0,
    oncePerMatch: false,
    targetMode: 'passive',
    secretGoalText:
      'Hội Bóng Đêm thắng khi toàn bộ Đội Săn Đêm bị loại HOẶC có từ 3 Kẻ Độc Hành bị loại.',
  },
  {
    id: 'suong-tin-gia',
    name: 'Khánh "Tin Giả"',
    title: 'Unknown · Ngụy Trang Đa Tầng',
    faction: 'mist-order',
    maxHp: 11,
    skillName: 'Ngụy Trang Đa Tầng',
    skillSummary:
      'Nội tại khi úp vai: Nói dối trước Thẻ Khám Phá Kín — tự né đòn gây thương tích/cướp đồ và giả danh nhận hồi máu khi đang mất máu (trừ thẻ Tiên Tri vẫn soi thấy).',
    cooldownRounds: 0,
    oncePerMatch: false,
    targetMode: 'passive',
    secretGoalText:
      'Hội Bóng Đêm thắng khi toàn bộ Đội Săn Đêm bị loại HOẶC có từ 3 Kẻ Độc Hành bị loại.',
  },
  {
    id: 'suong-gac-cong',
    name: 'Dũng "Gác Cổng"',
    title: 'Werewolf · Phản Kích Tức Thì',
    faction: 'mist-order',
    maxHp: 14,
    skillName: 'Phản Kích Tức Thì',
    skillSummary:
      'Nội tại sau khi lật vai: Mỗi khi bị đánh thường mà còn sống, lập tức tung đòn đánh trả (|1d6 - 1d4|) ngược lại kẻ tấn công (kể cả từ Cụm khác).',
    cooldownRounds: 0,
    oncePerMatch: false,
    targetMode: 'passive',
    secretGoalText:
      'Hội Bóng Đêm thắng khi toàn bộ Đội Săn Đêm bị loại HOẶC có từ 3 Kẻ Độc Hành bị loại.',
  },

  // -------------------- KẺ ĐỘC HÀNH (4 Neutral gốc) --------------------
  {
    id: 'lang-anh-san',
    name: 'Hải "Sưu Tầm"',
    title: 'Bob · Thợ Săn Trang Bị',
    faction: 'wanderer',
    maxHp: 10,
    skillName: 'Cướp Đồ Thay Đòn',
    skillSummary:
      'Nội tại sau khi lật vai: Bàn 4–6 người nếu đòn đánh sắp gây >= 2 ST lên người có đồ thì cướp 1 Trang bị thay vì gây ST; bàn 7–8 người nếu kết liễu nạn nhân thì lột sạch toàn bộ Trang bị.',
    cooldownRounds: 0,
    oncePerMatch: false,
    targetMode: 'passive',
    secretGoalText:
      'Độc hành thắng ngay lập tức khi sở hữu từ 5 Trang bị đang đeo trở lên (bất kỳ vòng nào).',
  },
  {
    id: 'lang-quan-sat',
    name: 'Trang "Kiên Cường"',
    title: 'Allie · Người Sống Sót Bền Bỉ',
    faction: 'wanderer',
    maxHp: 8,
    skillName: 'Ý Chí Hồi Sinh',
    skillSummary:
      '1 lần/trận (sau khi lật vai): Hồi sạch toàn bộ thương tích về 0 cho bản thân.',
    cooldownRounds: 0,
    oncePerMatch: true,
    targetMode: 'self',
    secretGoalText:
      'Độc hành thắng khi bạn còn sống lúc ván đấu kết thúc (cùng thắng với phe/người kết thúc trận hoặc trụ lại cuối cùng).',
  },
  {
    id: 'lang-cuu-ho',
    name: 'Bách "Cuồng Chiến"',
    title: 'Charles · Yến Tiệc Đẫm Máu',
    faction: 'wanderer',
    maxHp: 11,
    skillName: 'Đòn Đánh Đẫm Máu',
    skillSummary:
      'Sau khi đánh thường (đã lật vai & còn > 2 HP): Có thể tự nhận 2 thương tích để chém bồi tiếp lên ĐÚNG mục tiêu vừa đánh (lặp lại được nếu còn > 2 HP).',
    cooldownRounds: 0,
    oncePerMatch: false,
    targetMode: 'same-cluster',
    secretGoalText:
      'Độc hành thắng ngay khi đòn đánh thường của bạn kết liễu 1 người mà lúc đó tổng số người đã chết từ 3 trở lên.',
  },
  {
    id: 'lang-tien-phong',
    name: 'Đạt "Cảm Tử"',
    title: 'Daniel · Tiếng Hét Tử Thần',
    faction: 'wanderer',
    maxHp: 13,
    skillName: 'Tiếng Hét Lộ Diện',
    skillSummary:
      'Nội tại bắt buộc: Không được tự ý lật vai; tự động lật vai ngay lập tức khi có một người chơi khác đầu tiên bị loại.',
    cooldownRounds: 0,
    oncePerMatch: false,
    targetMode: 'passive',
    secretGoalText:
      'Độc hành thắng ngay lập tức nếu bạn là NGƯỜI ĐẦU TIÊN bị loại, HOẶC còn sống khi Đội Săn Đêm tiêu diệt hết Hội Bóng Đêm.',
  },
];

export const ROLES_BY_ID: Record<ClassicBoardGameRoleId, CharacterDesign> = {
  'gac-ky-thuat': ROLES_CATALOG[0],
  'gac-truc-ban': ROLES_CATALOG[1],
  'gac-radio': ROLES_CATALOG[2],
  'suong-an-danh': ROLES_CATALOG[3],
  'suong-tin-gia': ROLES_CATALOG[4],
  'suong-gac-cong': ROLES_CATALOG[5],
  'lang-anh-san': ROLES_CATALOG[6],
  'lang-quan-sat': ROLES_CATALOG[7],
  'lang-cuu-ho': ROLES_CATALOG[8],
  'lang-tien-phong': ROLES_CATALOG[9],
};

function mapCatalogFactionToBoardFaction(faction: ExpansionCatalogRecord['faction']): BoardGameFactionId {
  if (faction === 'hunter') return 'lantern-guard';
  if (faction === 'shadow') return 'mist-order';
  return 'wanderer';
}

function buildExpansionRoleDesign(rec: ExpansionCatalogRecord): CharacterDesign {
  const faction = mapCatalogFactionToBoardFaction(rec.faction);
  const packLabel = rec.expansionId === 'expansion-1' ? 'Mở rộng 1' : 'Mở rộng 2';
  const defaultGoal =
    faction === 'lantern-guard'
      ? 'Phe Đội Săn Đêm thắng ngay khi toàn bộ Hội Bóng Đêm bị loại khỏi KTX.'
      : faction === 'mist-order'
        ? 'Hội Bóng Đêm thắng khi toàn bộ Đội Săn Đêm bị loại HOẶC có từ 3 Kẻ Độc Hành bị loại.'
        : rec.id === 'exp1_cindy'
          ? 'Tất cả Kẻ Độc Hành khác đã bị loại và bạn còn sống (bàn 5P chỉ có 1 Neutral: đồng thắng nếu còn sống khi hết trận).'
          : rec.id === 'exp1_bipolar'
            ? 'Còn sống khi Đội Săn Đêm thắng, HOẶC đã chết khi Hội Bóng Đêm thắng.'
            : rec.id === 'exp2_cruz'
              ? 'Hạ gục một người chơi khác khi dùng hoặc sau khi dùng Dơi Hút Điện, Nhện Chập Mạch, Kíp Nổ Tự Động hoặc Búp Bê Tâm Linh trong cùng lượt.'
              : rec.id === 'exp2_bryon'
                ? 'Không có Kẻ Độc Hành nào bị loại khi trận đấu kết thúc hợp lệ (bạn phải còn sống).'
                : rec.victoryCondition;

  const targetMode: CharacterDesign['targetMode'] =
    rec.id === 'exp2_father_harrison' ||
    rec.id === 'exp1_bipolar' ||
    rec.id === 'exp2_eleanor' ||
    rec.id === 'exp1_wrath' ||
    rec.id === 'exp2_visions' ||
    rec.id === 'exp2_bryon'
      ? 'self'
      : 'passive';

  return {
    id: rec.id as BoardGameRoleId,
    name: rec.sourceName,
    title: `${rec.sourceName} · ${packLabel}`,
    faction,
    maxHp: rec.maxHp,
    skillName: rec.skillName,
    skillSummary: rec.skillDescription,
    cooldownRounds: 0,
    oncePerMatch: rec.usageLimit === 'once_per_match',
    targetMode,
    secretGoalText: defaultGoal,
  };
}

export const ALL_ROLE_DESIGNS_BY_ID: Readonly<Record<string, CharacterDesign>> = {
  ...ROLES_BY_ID,
  ...Object.fromEntries(
    EXPANSION_CHARACTER_CATALOG.map((rec) => [rec.id, buildExpansionRoleDesign(rec)]),
  ),
};

export function isKnownBoardGameRoleId(id: unknown): id is BoardGameRoleId {
  return typeof id === 'string' && Object.hasOwn(ALL_ROLE_DESIGNS_BY_ID, id);
}

const CLASSIC_SOURCE_NAMES: Readonly<Record<ClassicBoardGameRoleId, string>> = {
  'gac-ky-thuat': 'George',
  'gac-truc-ban': 'Emi',
  'gac-radio': 'Franklin',
  'suong-an-danh': 'Vampire',
  'suong-tin-gia': 'Unknown',
  'suong-gac-cong': 'Werewolf',
  'lang-anh-san': 'Bob',
  'lang-quan-sat': 'Allie',
  'lang-cuu-ho': 'Charles',
  'lang-tien-phong': 'Daniel',
};

const EXPANSION_SOURCE_NAMES: Readonly<Record<string, string>> = Object.fromEntries(
  EXPANSION_CHARACTER_CATALOG.map((rec) => [rec.id, rec.sourceName]),
);

/** Trả về tên nguồn chuẩn (`sourceName`) khớp 1-1 với CharacterRegistry cho toàn bộ 66 nhân vật. */
export function getCharacterSourceName(roleId: string): string {
  if (Object.hasOwn(CLASSIC_SOURCE_NAMES, roleId)) {
    return CLASSIC_SOURCE_NAMES[roleId as ClassicBoardGameRoleId];
  }
  if (Object.hasOwn(EXPANSION_SOURCE_NAMES, roleId)) {
    return EXPANSION_SOURCE_NAMES[roleId];
  }
  return '';
}

/**
 * Kiểm tra điều kiện hồi đầy máu của thẻ `eq_chocolate` (`eq-14` — chữ cái đầu A / E / U).
 * - Chế độ Classic (`isExpandedMode === false`): giữ nguyên 100% bit-for-bit 3 vai gốc (Allie, Emi, Unknown).
 * - Chế độ Expansion (`isExpandedMode === true`): suy xuất tự động từ chữ cái đầu của `sourceName`
 *   trong catalog/registry (A / E / U), không cần duy trì danh sách roleId thủ công.
 */
export function isEligibleForChocolateHeal(roleId: string, isExpandedMode: boolean): boolean {
  if (!isExpandedMode) {
    return (
      roleId === 'lang-quan-sat' ||
      roleId === 'gac-truc-ban' ||
      roleId === 'suong-tin-gia'
    );
  }
  const sourceName = getCharacterSourceName(roleId).trim();
  return /^[AEU]/i.test(sourceName);
}

export function getRoleDesign(id: BoardGameRoleId): CharacterDesign {
  const classic = ROLES_BY_ID[id as ClassicBoardGameRoleId];
  if (classic) return classic;
  const expanded = ALL_ROLE_DESIGNS_BY_ID[id];
  if (expanded) return expanded;
  return ROLES_BY_ID['gac-ky-thuat'];
}

export interface FactionCountSplit {
  lanternGuard: number;
  mistOrder: number;
  wanderer: number;
}

export function getRoleDistribution(playerCount: number): FactionCountSplit {
  switch (playerCount) {
    case 4:
      return { lanternGuard: 2, mistOrder: 2, wanderer: 0 };
    case 5:
      return { lanternGuard: 2, mistOrder: 2, wanderer: 1 };
    case 6:
      return { lanternGuard: 2, mistOrder: 2, wanderer: 2 };
    case 7:
      return { lanternGuard: 2, mistOrder: 2, wanderer: 3 };
    case 8:
    default:
      return { lanternGuard: 3, mistOrder: 3, wanderer: 2 };
  }
}

export function listRolesForFaction(faction: BoardGameFactionId): CharacterDesign[] {
  return ROLES_CATALOG.filter((r) => r.faction === faction);
}
