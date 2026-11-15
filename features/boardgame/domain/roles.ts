// ---------------------------------------------------------------------------
// features/boardgame/domain/roles.ts — 9 Nhân vật nguyên bản Bóng Đêm KTX v4
// chia 3 phe (Đội Săn Đêm / Hội Bóng Đêm / Kẻ Độc Hành).
// ---------------------------------------------------------------------------

import type {
  BoardGameFactionId,
  BoardGameRoleId,
} from '../../../shared/contracts/boardgame';
import type { CharacterDesign } from './types';

export const FACTION_LABELS: Record<BoardGameFactionId, string> = {
  'lantern-guard': 'Đội Săn Đêm',
  'mist-order': 'Hội Bóng Đêm',
  wanderer: 'Kẻ Độc Hành',
};

export const ROLES_CATALOG: readonly CharacterDesign[] = [
  // -------------------- ĐỘI SĂN ĐÊM (3 nhân vật) --------------------
  {
    id: 'gac-ky-thuat',
    name: 'Minh "Kỹ Thuật"',
    title: 'Đội trưởng Xung Kích',
    faction: 'lantern-guard',
    maxHp: 14,
    skillName: 'Đòn Phá Giáp Toàn Lực',
    skillSummary: '1 lần/trận (sau khi lật vai): Gây ngay 4 sát thương trực tiếp lên 1 người cùng Cụm.',
    cooldownRounds: 0,
    oncePerMatch: true,
    targetMode: 'same-cluster',
    secretGoalText:
      'Phe Đội Săn Đêm thắng khi toàn bộ Hội Bóng Đêm bị loại khỏi KTX.',
  },
  {
    id: 'gac-truc-ban',
    name: 'Lan "Trực Ban"',
    title: 'Điều Phối Y Tế KTX',
    faction: 'lantern-guard',
    maxHp: 12,
    skillName: 'Hiệu Lệnh Hồi Sức',
    skillSummary: '1 lần/trận (sau khi lật vai): Hồi đầy toàn bộ thương tích cho 1 người bất kỳ.',
    cooldownRounds: 0,
    oncePerMatch: true,
    targetMode: 'any-player',
    secretGoalText:
      'Phe Đội Săn Đêm thắng khi toàn bộ Hội Bóng Đêm bị loại khỏi KTX.',
  },
  {
    id: 'gac-radio',
    name: 'Vy "Radio"',
    title: 'Trinh Sát Tần Số',
    faction: 'lantern-guard',
    maxHp: 11,
    skillName: 'Soi Tần Số Thật',
    skillSummary: 'Hồi chiêu 2 vòng (sau khi lật vai): Soi bí mật phe thật của 1 người; nếu là Hội Bóng Đêm, gây 1 sát thương.',
    cooldownRounds: 2,
    oncePerMatch: false,
    targetMode: 'any-other',
    secretGoalText:
      'Phe Đội Săn Đêm thắng khi toàn bộ Hội Bóng Đêm bị loại khỏi KTX.',
  },

  // -------------------- HỘI BÓNG ĐÊM (3 nhân vật) --------------------
  {
    id: 'suong-an-danh',
    name: 'Tú "Ẩn Danh"',
    title: 'Bóng Đêm Hút Sinh Lực',
    faction: 'mist-order',
    maxHp: 14,
    skillName: 'Hấp Thụ Đêm Khuya',
    skillSummary: 'Nội tại sau khi lật vai: Mỗi khi đánh thường trúng địch (> 0), bạn hồi lại 2 thương tích.',
    cooldownRounds: 0,
    oncePerMatch: false,
    targetMode: 'passive',
    secretGoalText:
      'Phe Hội Bóng Đêm thắng khi toàn bộ Đội Săn Đêm bị loại khỏi KTX.',
  },
  {
    id: 'suong-tin-gia',
    name: 'Khánh "Tin Giả"',
    title: 'Kẻ Tung Sấm Chớp',
    faction: 'mist-order',
    maxHp: 12,
    skillName: 'Sấm Chớp Ký Túc',
    skillSummary: '1 lần/trận (sau khi lật vai): Chọn 1 người bất kỳ toàn bàn, tung 1d6 gây sát thương trực tiếp đúng bằng mặt xúc xắc.',
    cooldownRounds: 0,
    oncePerMatch: true,
    targetMode: 'any-other',
    secretGoalText:
      'Phe Hội Bóng Đêm thắng khi toàn bộ Đội Săn Đêm bị loại khỏi KTX.',
  },
  {
    id: 'suong-gac-cong',
    name: 'Dũng "Gác Cổng"',
    title: 'Thủ Lĩnh Phản Đòn',
    faction: 'mist-order',
    maxHp: 11,
    skillName: 'Phản Đòn Gai Góc',
    skillSummary: 'Nội tại sau khi lật vai: Mỗi khi bị đánh trúng và còn sống, kẻ tấn công chịu phản lại 2 sát thương.',
    cooldownRounds: 0,
    oncePerMatch: false,
    targetMode: 'passive',
    secretGoalText:
      'Phe Hội Bóng Đêm thắng khi toàn bộ Đội Săn Đêm bị loại khỏi KTX.',
  },

  // -------------------- KẺ ĐỘC HÀNH (3 nhân vật) --------------------
  {
    id: 'lang-anh-san',
    name: 'Hải "Sưu Tầm"',
    title: 'Thợ Săn Trang Bị',
    faction: 'wanderer',
    maxHp: 11,
    skillName: 'Thu Thập Nhanh',
    skillSummary: 'Hồi chiêu 2 vòng (sau khi lật vai): Cướp 1 Trang bị đang đeo của 1 người cùng Cụm.',
    cooldownRounds: 2,
    oncePerMatch: false,
    targetMode: 'same-cluster',
    secretGoalText:
      'Độc hành thắng ngay từ vòng 3 trở đi khi đã lật vai và sở hữu từ 3 Trang bị đang đeo trở lên (hoặc sống sót tới cuối trận với >= 2 Trang bị).',
  },
  {
    id: 'lang-quan-sat',
    name: 'Trang "Kiên Cường"',
    title: 'Người Sống Sót Cuối Cùng',
    faction: 'wanderer',
    maxHp: 12,
    skillName: 'Khiên Bất Hoại',
    skillSummary: '1 lần/trận (sau khi lật vai): Kích hoạt miễn nhiễm mọi sát thương cho tới đầu lượt kế tiếp của bạn.',
    cooldownRounds: 0,
    oncePerMatch: true,
    targetMode: 'self',
    secretGoalText:
      'Độc hành thắng khi lật vai và còn sống đến khi kết thúc giao tranh với >= 2 người đã ngã xuống, hoặc trụ lại <= 2 người cuối.',
  },
  {
    id: 'lang-cuu-ho',
    name: 'Bình "Bảo Vệ"',
    title: 'Vệ Sĩ Thầm Lặng',
    faction: 'wanderer',
    maxHp: 13,
    skillName: 'Che Chắn Sinh Tử',
    skillSummary: 'Hồi chiêu 2 vòng (sau khi lật vai): Hồi 2 thương tích cho 1 người cùng Cụm, đổi lại bạn tự chịu 1 sát thương.',
    cooldownRounds: 2,
    oncePerMatch: false,
    targetMode: 'same-cluster',
    secretGoalText:
      'Độc hành thắng nếu còn sống khi Người được bảo hộ ngầm còn sống hoặc thuộc phe chiến thắng, HOẶC lật vai tự tay hạ sát kẻ đã loại người đó.',
  },
];

export const ROLES_BY_ID: Record<BoardGameRoleId, CharacterDesign> = {
  'gac-ky-thuat': ROLES_CATALOG[0],
  'gac-truc-ban': ROLES_CATALOG[1],
  'gac-radio': ROLES_CATALOG[2],
  'suong-an-danh': ROLES_CATALOG[3],
  'suong-tin-gia': ROLES_CATALOG[4],
  'suong-gac-cong': ROLES_CATALOG[5],
  'lang-anh-san': ROLES_CATALOG[6],
  'lang-quan-sat': ROLES_CATALOG[7],
  'lang-cuu-ho': ROLES_CATALOG[8],
};

export function getRoleDesign(id: BoardGameRoleId): CharacterDesign {
  return ROLES_BY_ID[id];
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
      return { lanternGuard: 3, mistOrder: 3, wanderer: 1 };
    case 8:
    default:
      return { lanternGuard: 3, mistOrder: 3, wanderer: 2 };
  }
}

export function listRolesForFaction(faction: BoardGameFactionId): CharacterDesign[] {
  return ROLES_CATALOG.filter((r) => r.faction === faction);
}
