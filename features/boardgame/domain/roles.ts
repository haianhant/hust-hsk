// ---------------------------------------------------------------------------
// features/boardgame/domain/roles.ts — Đủ 10 Nhân vật nguyên bản hộp cơ bản
// Shadow Hunters (3 Đội Săn Đêm / 3 Hội Bóng Đêm / 4 Kẻ Độc Hành).
// ---------------------------------------------------------------------------

import type {
  BoardGameFactionId,
  BoardGameRoleId,
  BoardGameRulesetId,
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
    name: 'George',
    title: 'Đội trưởng Phá Vây',
    faction: 'lantern-guard',
    maxHp: 14,
    skillName: 'Đòn Phá Vây (xs 4 mặt)',
    skillSummary:
      '1 lần/trận (sau khi lật vai): Chọn 1 người chơi bất kỳ trên bàn, tung xs 4 mặt gây sát thương trực tiếp bằng số nút xúc xắc.',
    cooldownRounds: 0,
    oncePerMatch: true,
    targetMode: 'any-other',
    secretGoalText:
      'Phe Đội Săn Đêm thắng ngay khi toàn bộ Hội Bóng Đêm bị loại khỏi KTX.',
  },
  {
    id: 'gac-truc-ban',
    name: 'Emi',
    title: 'Bước Nhảy Tắt',
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
    name: 'Franklin',
    title: 'Sét Cao Áp',
    faction: 'lantern-guard',
    maxHp: 12,
    skillName: 'Xung Cao Áp (xs 6 mặt)',
    skillSummary:
      '1 lần/trận (sau khi lật vai): Chọn 1 người chơi bất kỳ trên bàn, tung xs 6 mặt gây sát thương trực tiếp bằng số nút xúc xắc.',
    cooldownRounds: 0,
    oncePerMatch: true,
    targetMode: 'any-other',
    secretGoalText:
      'Phe Đội Săn Đêm thắng ngay khi toàn bộ Hội Bóng Đêm bị loại khỏi KTX.',
  },

  // -------------------- HỘI BÓNG ĐÊM (3 Shadow gốc) --------------------
  {
    id: 'suong-an-danh',
    name: 'Vampire',
    title: 'Hấp Thụ Đêm Khuya',
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
    name: 'Unknown',
    title: 'Ngụy Trang Đa Tầng',
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
    name: 'Werewolf',
    title: 'Phản Kích Tức Thì',
    faction: 'mist-order',
    maxHp: 14,
    skillName: 'Phản Kích Tức Thì',
    skillSummary:
      'Nội tại sau khi lật vai: Mỗi khi bị đánh thường mà còn sống, lập tức tung đòn đánh trả (|xs 6 mặt - xs 4 mặt|) ngược lại kẻ tấn công (kể cả từ Cụm khác).',
    cooldownRounds: 0,
    oncePerMatch: false,
    targetMode: 'passive',
    secretGoalText:
      'Hội Bóng Đêm thắng khi toàn bộ Đội Săn Đêm bị loại HOẶC có từ 3 Kẻ Độc Hành bị loại.',
  },

  // -------------------- KẺ ĐỘC HÀNH (4 Neutral gốc) --------------------
  {
    id: 'lang-anh-san',
    name: 'Bob',
    title: 'Thợ Săn Trang Bị',
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
    name: 'Allie',
    title: 'Người Sống Sót Bền Bỉ',
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
    name: 'Charles',
    title: 'Yến Tiệc Đẫm Máu',
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
    name: 'Daniel',
    title: 'Tiếng Hét Tử Thần',
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
                : rec.id === 'exp2_arlene'
                  ? 'Bạn bị hạ gục bởi một nhân vật thuộc Đội Săn Đêm (Hunter).'
                  : rec.id === 'exp1_angel'
                    ? 'Còn sống khi trận đấu kết thúc VÀ (tất cả Kẻ Độc Hành đều còn sống HOẶC bạn đứng tại chính xác Church).'
                    : rec.id === 'exp2_bianca'
                      ? 'Còn sống khi trận đấu kết thúc và có lượng HP còn lại thấp nhất trong các người chơi còn sống (cho phép hòa).'
                    : rec.id === 'exp2_dalton'
                      ? 'Hạ gục một người chơi khác sau khi kích hoạt Vòng Đấu Thứ 12, HOẶC còn nhiều máu nhất khi trận đấu kết thúc (cho phép hòa).'
                      : rec.id === 'exp1_anathema'
                        ? 'Còn sống khi trò chơi kết thúc.'
                        : rec.id === 'exp1_bethany'
                          ? 'Người được chọn của bạn giành chiến thắng (không yêu cầu Bethany phải còn sống; nếu không có Người được chọn sẽ thua).'
                          : rec.id === 'exp1_arnold'
                            ? 'Còn sống khi trận đấu kết thúc và có nhiều hơn 2 người chơi còn sống trên bàn.'
                            : rec.id === 'exp1_cassie'
                              ? 'Sao chép điều kiện thắng của Neutral KHÁC đầu tiên lộ diện trong gameplay bình thường (áp dụng trên trạng thái của chính bạn).'
                              : rec.id === 'exp1_clairvoyant'
                                ? 'Sao chép điều kiện thắng của nhân vật chưa lộ diện mà bạn đã soi bí mật bằng Lời Tiên Tri.'
                                : rec.id === 'exp2_april_skipps'
                                  ? 'Chưa lộ diện và còn sống khi trận đấu kết thúc, HOẶC sống sót tới hết lượt tiếp theo của mình sau khi bị kỹ năng ép lộ ở ô 7 vết thương.'
                                  : rec.id === 'exp2_colt'
                                    ? 'Thắng tức thì khi đang đeo ít nhất 3 vũ khí trong nhóm Dao Rọc (ev-02), Cưa Máy (ev-03), Rìu Sắt (ev-04), Súng Bắn Đinh (ev-05).'
                                    : rec.id === 'exp2_diana'
                                      ? 'Còn sống và Khách hàng đang hoạt động của bạn thắng; nếu chưa kích hoạt được Khách hàng thì phải còn sống với đầy máu khi hết trận.'
                                      : rec.id === 'exp2_aaron'
                                        ? 'Cả bạn và Người vợ (nhân vật nữ đầu tiên lộ diện) đều còn sống khi hết trận; nếu chưa tìm thấy vợ, phải chết trước khi hết trận.'
                                        : rec.id === 'exp1_antimony'
                                          ? 'Bắt buộc lộ diện ở cái chết vĩnh viễn đầu tiên của người chơi khác để sao chép kỹ năng hiệu lực & điều kiện thắng của họ (trước khi kích hoạt chưa có điều kiện thắng).'
                                          : rec.id === 'exp2_cain'
                                            ? 'Còn sống khi có ít nhất 1 Hunter, 1 Shadow và 1 Neutral khác bị loại vĩnh viễn (bàn 5P: chính bạn tự tay kết liễu ≥ 1 Hunter và ≥ 1 Shadow).'
                                            : rec.id === 'exp2_bonnie'
                                              ? 'Hạ gục một Shadow để chuyển phe động sang Hội Bóng Đêm và giành chiến thắng cùng phe Shadow.'
                                              : rec.id === 'exp2_nc_soldier'
                                                ? 'Còn sống, chiêu mộ toàn bộ các Neutral ban đầu khác (tích lũy ≥ 5 vết thương sau đòn Chiêu Mộ) và tự mình sở hữu đủ 3 vũ khí: Súng Máy (ev-06), Súng Ngắn (ev-05), Cưa Máy (ev-03).'
                                                : rec.victoryCondition;

  const targetMode: CharacterDesign['targetMode'] =
    rec.id === 'exp2_father_harrison' ||
    rec.id === 'exp1_bipolar' ||
    rec.id === 'exp2_eleanor' ||
    rec.id === 'exp1_wrath' ||
    rec.id === 'exp2_visions' ||
    rec.id === 'exp2_bryon' ||
    rec.id === 'exp2_elise' ||
    rec.id === 'exp1_ernest' ||
    rec.id === 'exp2_warlord' ||
    rec.id === 'exp1_angel' ||
    rec.id === 'exp1_anathema' ||
    rec.id === 'exp1_bethany' ||
    rec.id === 'exp1_cassie' ||
    rec.id === 'exp1_clairvoyant' ||
    rec.id === 'exp1_voodoo' ||
    rec.id === 'exp2_cain'
      ? 'self'
      : rec.id === 'exp2_nc_soldier'
        ? 'any-other'
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

/**
 * Các nhân vật Neutral có điều kiện thắng phụ thuộc cấu trúc vào ít nhất 1 Neutral khác
 * trên bàn (không có điều kiện thắng dự phòng độc lập). Ở bàn 5P (`wanderer = 1`),
 * bắt buộc loại khỏi pool chia vai của mọi chế độ mở rộng để không chia ra nhân vật bất khả thắng:
 * - `exp2_nc_soldier` (N.C. Soldier): phải chiêu mộ toàn bộ Neutral gốc khác (`>= 1`).
 * - `exp1_cassie` (Cassie): phải sao chép mục tiêu của Neutral khác đầu tiên lộ diện (`>= 1`).
 */
export const FIVE_PLAYER_EXCLUDED_NEUTRAL_ROLE_IDS: ReadonlySet<BoardGameRoleId> =
  new Set<BoardGameRoleId>(['exp2_nc_soldier', 'exp1_cassie']);

export function filterEligibleWandererPoolForPlayerCount<T extends BoardGameRoleId>(
  rawWandererPool: readonly T[],
  rulesetId: BoardGameRulesetId,
  playerCount: number,
): T[] {
  if (rulesetId === 'classic' || playerCount !== 5) {
    return [...rawWandererPool];
  }
  return rawWandererPool.filter((id) => !FIVE_PLAYER_EXCLUDED_NEUTRAL_ROLE_IDS.has(id));
}
