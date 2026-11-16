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
    skillName: 'Đòn Phá Vây 1d4',
    skillSummary: '1 lần/trận (sau khi lật vai): Chọn 1 người bất kỳ trên bàn, tung 1d4 gây sát thương trực tiếp bằng số nút xúc xắc.',
    cooldownRounds: 0,
    oncePerMatch: true,
    targetMode: 'any-other',
    secretGoalText:
      'Phe Đội Săn Đêm thắng khi toàn bộ Hội Bóng Đêm bị loại khỏi KTX.',
  },
  {
    id: 'gac-truc-ban',
    name: 'Lan "Trực Ban"',
    title: 'Chốt Trực Kiên Cố',
    faction: 'lantern-guard',
    maxHp: 12,
    skillName: 'Lá Chắn Chốt Trực',
    skillSummary: '1 lần/trận (sau khi lật vai): Bật lá chắn miễn nhiễm mọi sát thương cho bản thân tới đầu lượt kế tiếp.',
    cooldownRounds: 0,
    oncePerMatch: true,
    targetMode: 'self',
    secretGoalText:
      'Phe Đội Săn Đêm thắng khi toàn bộ Hội Bóng Đêm bị loại khỏi KTX.',
  },
  {
    id: 'gac-radio',
    name: 'Vy "Radio"',
    title: 'Trinh Sát Cao Áp',
    faction: 'lantern-guard',
    maxHp: 12,
    skillName: 'Xung Cao Áp 1d6',
    skillSummary: '1 lần/trận (sau khi lật vai): Chọn 1 người bất kỳ trên bàn, tung 1d6 gây sát thương trực tiếp bằng số nút xúc xắc.',
    cooldownRounds: 0,
    oncePerMatch: true,
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
    maxHp: 13,
    skillName: 'Hấp Thụ Đêm Khuya',
    skillSummary: 'Nội tại sau khi lật vai: Mỗi khi đòn đánh thường của bạn gây sát thương (> 0), bạn hồi lại 2 thương tích.',
    cooldownRounds: 0,
    oncePerMatch: false,
    targetMode: 'passive',
    secretGoalText:
      'Phe Hội Bóng Đêm thắng khi toàn bộ Đội Săn Đêm bị loại khỏi KTX.',
  },
  {
    id: 'suong-tin-gia',
    name: 'Khánh "Tin Giả"',
    title: 'Kẻ Ngụy Trang Đa Tầng',
    faction: 'mist-order',
    maxHp: 11,
    skillName: 'Ngụy Trang & Nhiễu Loạn',
    skillSummary: 'Khi đang úp vai: Tự động né mọi Thẻ Khám Phá Kín gây thương tích (báo Không phản ứng). Sau khi lật vai (hồi 2 vòng): Gây 2 sát thương lên 1 người cùng Cụm.',
    cooldownRounds: 2,
    oncePerMatch: false,
    targetMode: 'same-cluster',
    secretGoalText:
      'Phe Hội Bóng Đêm thắng khi toàn bộ Đội Săn Đêm bị loại khỏi KTX.',
  },
  {
    id: 'suong-gac-cong',
    name: 'Dũng "Gác Cổng"',
    title: 'Thủ Lĩnh Phản Kích',
    faction: 'mist-order',
    maxHp: 14,
    skillName: 'Phản Kích Tức Thì',
    skillSummary: 'Nội tại sau khi lật vai: Mỗi khi bị đánh thường mà còn sống, bạn lập tức tung đòn đánh trả (|1d6 - 1d4|) ngược lại kẻ tấn công.',
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
    maxHp: 10,
    skillName: 'Thu Thập Chiến Lợi Phẩm',
    skillSummary: 'Sau khi lật vai: Bấm cướp 1 Trang bị cùng Cụm (hồi 2 vòng); đồng thời đánh thường gây >= 2 sát thương lên người có đồ sẽ thu thêm 1 Trang bị.',
    cooldownRounds: 2,
    oncePerMatch: false,
    targetMode: 'same-cluster',
    secretGoalText:
      'Độc hành thắng ngay từ vòng 3 trở đi khi đã lật vai và sở hữu từ 3 Trang bị đang đeo trở lên (hoặc sống sót tới cuối trận với >= 2 Trang bị).',
  },
  {
    id: 'lang-quan-sat',
    name: 'Trang "Kiên Cường"',
    title: 'Người Sống Sót Bền Bỉ',
    faction: 'wanderer',
    maxHp: 9,
    skillName: 'Ý Chí Hồi Sinh',
    skillSummary: '1 lần/trận (sau khi lật vai): Hồi sạch toàn bộ thương tích về 0 cho bản thân.',
    cooldownRounds: 0,
    oncePerMatch: true,
    targetMode: 'self',
    secretGoalText:
      'Độc hành thắng khi bạn còn sống lúc ván đấu kết thúc (thắng chung với phe kết thúc trận đấu hoặc thắng một mình nếu trụ lại cuối cùng).',
  },
  {
    id: 'lang-cuu-ho',
    name: 'Bình "Bảo Vệ"',
    title: 'Vệ Sĩ Thầm Lặng',
    faction: 'wanderer',
    maxHp: 12,
    skillName: 'Hộ Vệ & Báo Thù',
    skillSummary: 'Hồi chiêu 2 vòng (sau khi lật vai): Hồi 2 thương tích cho 1 người cùng Cụm (tự chịu 1 ST); nếu Người được bảo hộ đã ngã, đổi thành gây 2 sát thương lên 1 người cùng Cụm.',
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
