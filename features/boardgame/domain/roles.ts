// ---------------------------------------------------------------------------
// features/boardgame/domain/roles.ts — 3 Phe nguyên bản & 9 Nhân vật độc lập
// của "Bóng Đêm KTX — Secrets After Dark" (100% IP gốc).
// ---------------------------------------------------------------------------

import type { BoardGameFactionId, BoardGameRoleId } from '../../../shared/contracts/boardgame';
import type { RoleDefinition } from './types';

export const FACTION_LABELS: Record<BoardGameFactionId, string> = {
  'lantern-guard': 'Đội Gác Đèn',
  'mist-order': 'Hội Màn Sương',
  wanderer: 'Kẻ Lang Thang',
};

export const ROLES_CATALOG: readonly RoleDefinition[] = [
  {
    id: 'gac-ky-thuat',
    name: 'Minh — Kỹ Thuật Viên Tầng Thượng',
    faction: 'lantern-guard',
    maxHp: 12,
    skillName: 'Nối Mạch Dự Phòng',
    skillSummary: '+1 Chỉ số Tín hiệu và hồi +2 HP cho 1 người cùng khu vực (hoặc bản thân).',
    goalSummary: 'Đưa Chỉ số Tín hiệu chạm 6 hoặc loại toàn bộ Hội Màn Sương.',
  },
  {
    id: 'gac-truc-ban',
    name: 'Lan — Trực Ban Nội Trú',
    faction: 'lantern-guard',
    maxHp: 13,
    skillName: 'Kiểm Tra Sổ Trực',
    skillSummary: 'Xác minh bí mật xem 1 người cùng khu vực có thuộc Hội Màn Sương hay không và nhận +2 Khiên.',
    goalSummary: 'Đưa Chỉ số Tín hiệu chạm 6 hoặc loại toàn bộ Hội Màn Sương.',
  },
  {
    id: 'gac-radio',
    name: 'Khánh — Hội Viên Radio KTX',
    faction: 'lantern-guard',
    maxHp: 11,
    skillName: 'Sóng Ngắn Bách Khoa',
    skillSummary: '+1 Chỉ số Tín hiệu và rút thêm 1 thẻ Chiến thuật vào tay.',
    goalSummary: 'Đưa Chỉ số Tín hiệu chạm 6 hoặc loại toàn bộ Hội Màn Sương.',
  },
  {
    id: 'suong-an-danh',
    name: 'Tú — Cư Dân Vô Hình',
    faction: 'mist-order',
    maxHp: 12,
    skillName: 'Cắt Cầu Dao',
    skillSummary: '+1 Chỉ số Màn sương và gây mất điện cục bộ 1 vòng tại khu vực hiện tại.',
    goalSummary: 'Đưa Chỉ số Màn sương chạm 6 hoặc hạ toàn bộ Đội Gác Đèn.',
  },
  {
    id: 'suong-tin-gia',
    name: 'Vy — Người Gửi Tin Đồn',
    faction: 'mist-order',
    maxHp: 11,
    skillName: 'Bẻ Hướng Tần Số',
    skillSummary: 'Giảm 1 Chỉ số Tín hiệu (nếu >0) và tăng +1 Màn sương, gây 1 sát thương tầm gần.',
    goalSummary: 'Đưa Chỉ số Màn sương chạm 6 hoặc hạ toàn bộ Đội Gác Đèn.',
  },
  {
    id: 'suong-gac-cong',
    name: 'Dũng — Bóng Đêm Hành Lang',
    faction: 'mist-order',
    maxHp: 13,
    skillName: 'Khóa Cửa Chắn',
    skillSummary: 'Gây 2 sát thương cho 1 mục tiêu cùng/kề khu vực và khóa hồi phục lượt kế tiếp.',
    goalSummary: 'Đưa Chỉ số Màn sương chạm 6 hoặc hạ toàn bộ Đội Gác Đèn.',
  },
  {
    id: 'lang-anh-san',
    name: 'Hải — Người Săn Gói Tin Bí Mật',
    faction: 'wanderer',
    maxHp: 10,
    skillName: 'Lần Theo Dây Cáp',
    skillSummary: 'Nhận ngay +1 Mảnh Tin Đen và +1 Khiên, đồng thời soi phe 1 người cùng phòng.',
    goalSummary: 'Sở hữu >= 3 Mảnh Tin Đen (hoặc >= 2 Mảnh Tin và còn sống khi cạn vòng).',
  },
  {
    id: 'lang-quan-sat',
    name: 'Trang — Người Ghi Chép Đêm Khuya',
    faction: 'wanderer',
    maxHp: 10,
    skillName: 'Ghi Chép Lạnh Lùng',
    skillSummary: 'Soi chính xác phe của 1 sinh viên bất kỳ và nhận +2 Khiên.',
    goalSummary: 'Dự đoán đúng phe >= 2 lần qua Thăm dò hoặc sống sót với HP >= 6 khi hết vòng.',
  },
  {
    id: 'lang-cuu-ho',
    name: 'Bình — Người Bảo Hộ Ngầm',
    faction: 'wanderer',
    maxHp: 11,
    skillName: 'Che Chắn Khẩn Cấp',
    skillSummary: 'Hồi +3 HP và +2 Khiên cho đồng đội bảo hộ bí mật (hoặc chính mình).',
    goalSummary: 'Giữ mục tiêu bảo hộ còn sống tới cuối trận với HP bản thân >= 4 (hoặc >= 2 lần Che Chắn).',
  },
];

export const ROLES_BY_ID: Record<BoardGameRoleId, RoleDefinition> = {
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
      return { lanternGuard: 3, mistOrder: 2, wanderer: 1 };
    case 7:
      return { lanternGuard: 3, mistOrder: 3, wanderer: 1 };
    case 8:
    default:
      return { lanternGuard: 3, mistOrder: 3, wanderer: 2 };
  }
}

export function listRolesForFaction(faction: BoardGameFactionId): RoleDefinition[] {
  return ROLES_CATALOG.filter((r) => r.faction === faction);
}
