// ---------------------------------------------------------------------------
// features/boardgame/domain/roles.ts — 3 Phe nguyên bản & 9 Nhân vật độc lập
// của "Bóng Đêm KTX v2 — Secrets After Dark" (100% IP gốc).
// Ma trận đặc điểm 3×3 trực giao bảo đảm mọi nhãn đơn lẻ khớp 1 Gác Đèn +
// 1 Màn Sương + 1 Lang Thang (không suy ra phe từ 1 manh mối duy nhất).
// ---------------------------------------------------------------------------

import type {
  BoardGameAccessTag,
  BoardGameFactionId,
  BoardGameRoleId,
  BoardGameTraceTag,
} from '../../../shared/contracts/boardgame';
import type { RoleDefinition } from './types';

export const FACTION_LABELS: Record<BoardGameFactionId, string> = {
  'lantern-guard': 'Đội Gác Đèn',
  'mist-order': 'Hội Màn Sương',
  wanderer: 'Kẻ Lang Thang',
};

export const ACCESS_TAG_LABELS: Record<BoardGameAccessTag, string> = {
  'tech-key': 'Chìa Kỹ Thuật',
  'broadcast-gear': 'Thiết Bị Tần Số',
  'patrol-badge': 'Thẻ Nội Trú',
};

export const TRACE_TAG_LABELS: Record<BoardGameTraceTag, string> = {
  'insulated-gloves': 'Găng Cách Điện',
  'signal-meter': 'Máy Đo Sóng',
  'magnetic-card': 'Thẻ Từ Phân Luồng',
};

export const ROLES_CATALOG: readonly RoleDefinition[] = [
  {
    id: 'gac-ky-thuat',
    name: 'Minh — Kỹ Thuật Viên Tầng Thượng',
    faction: 'lantern-guard',
    maxHp: 12,
    accessTag: 'tech-key',
    traceTag: 'insulated-gloves',
    skillName: 'Nối Mạch Xuyên Mất Điện',
    skillSummary:
      'Lật vai thực hiện kiểm tra/gỡ mạch ngay cả khi khu vực mất điện và hồi +2 vết thương cho người cùng phòng (hoặc bản thân).',
    covertSummary: 'Ẩn mình khảo sát Cầu Dao / Phát Thanh.',
    revealBenefitSummary: 'Gỡ mạch xuyên mất điện và hồi phục +2 cho đồng đội cùng phòng.',
    goalSummary:
      'Gỡ âm mưu Màn Sương, tạm giữ hết phe Màn Sương qua Đối chất, hoặc niêm phong Cầu Dao & Phát Thanh an toàn tới Rạng Sáng.',
  },
  {
    id: 'gac-truc-ban',
    name: 'Lan — Trực Ban Nội Trú',
    faction: 'lantern-guard',
    maxHp: 12,
    accessTag: 'patrol-badge',
    traceTag: 'signal-meter',
    skillName: 'Kiểm Tra Sổ Trực',
    skillSummary:
      'Lật vai nhận +2 Khiên và đọc chi tiết các vòng mục tiêu cùng phòng từng thao tác kỹ thuật hoặc gây sát thương.',
    covertSummary: 'Ghi chép lối di chuyển ở Sảnh KTX và Cầu Dao.',
    revealBenefitSummary: 'Nhận +2 Khiên và xem rõ lịch sử thao tác kỹ thuật của 1 nghi phạm.',
    goalSummary:
      'Gỡ âm mưu Màn Sương, tạm giữ hết phe Màn Sương qua Đối chất, hoặc niêm phong Cầu Dao & Phát Thanh an toàn tới Rạng Sáng.',
  },
  {
    id: 'gac-radio',
    name: 'Khánh — Hội Viên Radio KTX',
    faction: 'lantern-guard',
    maxHp: 11,
    accessTag: 'broadcast-gear',
    traceTag: 'magnetic-card',
    skillName: 'Khóa Sóng Khẩn Cấp',
    skillSummary:
      'Lật vai rút thêm 1 thẻ Chiến thuật vào tay và nhận +1 Khiên; nếu đứng ở Phát Thanh sẽ niêm phong ngay trạm sóng.',
    covertSummary: 'Theo dõi biến động tại Phòng Phát Thanh và Hành Lang B7.',
    revealBenefitSummary: 'Nhận thêm 1 thẻ Chiến thuật, +1 Khiên và khóa nhanh Phát Thanh.',
    goalSummary:
      'Gỡ âm mưu Màn Sương, tạm giữ hết phe Màn Sương qua Đối chất, hoặc niêm phong Cầu Dao & Phát Thanh an toàn tới Rạng Sáng.',
  },
  {
    id: 'suong-an-danh',
    name: 'Tú — Cư Dân Vô Hình',
    faction: 'mist-order',
    maxHp: 12,
    accessTag: 'tech-key',
    traceTag: 'signal-meter',
    skillName: 'Cắt Cầu Dao & Xóa Dấu',
    skillSummary:
      'Lật vai gây mất điện 1 vòng tại khu vực hiện tại, xóa bản ghi thao tác gần nhất ở phòng này và nhận +1 Khiên.',
    covertSummary: 'Âm thầm tiếp cận trạm mục tiêu để gài mạch quá tải.',
    revealBenefitSummary: 'Ngắt điện khu vực 1 vòng và xóa dấu chân kỹ thuật gần nhất tại phòng.',
    goalSummary:
      'Gài Mạch Quá Tải tại Trạm Mục Tiêu rồi Kích nổ từ vòng sau (hoặc giữ mạch còn nguyên tới Rạng Sáng / hạ Đội Gác Đèn).',
  },
  {
    id: 'suong-tin-gia',
    name: 'Vy — Người Gửi Tin Đồn',
    faction: 'mist-order',
    maxHp: 11,
    accessTag: 'broadcast-gear',
    traceTag: 'insulated-gloves',
    skillName: 'Gieo Nhiễu Giả',
    skillSummary:
      'Có thể DÙNG LÉN khi chưa lật vai (1×/ván): cấy dấu thao tác kỹ thuật giả lên 1 người cùng phòng mà không lộ danh tính!',
    covertSummary: 'Dùng lén để đổ dấu thao tác kỹ thuật sang người vô tội.',
    revealBenefitSummary: 'Đã lật vai: phát 1 đòn nhiễu sóng 2 sát thương cùng phòng và +1 Khiên.',
    goalSummary:
      'Đánh lạc hướng điều tra bằng dấu giả, hỗ trợ gài & kích nổ Mạch Quá Tải tại Trạm Mục Tiêu (hoặc từ Phòng Phát Thanh sau khi lật).',
  },
  {
    id: 'suong-gac-cong',
    name: 'Dũng — Bóng Đêm Hành Lang',
    faction: 'mist-order',
    maxHp: 12,
    accessTag: 'patrol-badge',
    traceTag: 'magnetic-card',
    skillName: 'Khóa Cửa Chắn',
    skillSummary:
      'Sau khi lật vai, mọi đòn ATTACK xuyên qua 1 điểm Khiên; kích hoạt kỹ năng gây 2 sát thương và khóa hồi phục mục tiêu 1 lượt.',
    covertSummary: 'Bảo vệ trạm mục tiêu và uy hiếp người điều tra.',
    revealBenefitSummary: 'Đòn đánh thường xuyên 1 Khiên; kỹ năng gây 2 ST & khóa hồi phục.',
    goalSummary:
      'Áp đảo thể lực đội tuần tra, câu giờ kích nổ Mạch Quá Tải hoặc loại toàn bộ Đội Gác Đèn.',
  },
  {
    id: 'lang-anh-san',
    name: 'Hải — Người Săn Gói Tin Bí Mật',
    faction: 'wanderer',
    maxHp: 11,
    accessTag: 'tech-key',
    traceTag: 'magnetic-card',
    skillName: 'Trích Xuất Hiện Trường',
    skillSummary:
      'Lật vai thu thập thêm 1 chứng cứ khu vực tại nơi đang đứng (xác thực hiện trường) và nhận +1 Khiên.',
    covertSummary: 'Thu thập đủ 3 chứng cứ và quét ít nhất 2 hiện trường có dấu kỹ thuật.',
    revealBenefitSummary: 'Nhận ngay 1 dấu vết hiện trường & +1 Khiên để chuẩn bị công bố hồ sơ.',
    goalSummary:
      'Từ Vòng 4+, sau khi xác thực >= 2 khu có dấu kỹ thuật và giữ >= 3 chứng cứ, tới Phòng Phát Thanh Công Bố Hồ Sơ để thắng độc lập (hoặc đồng thắng cuối trận).',
  },
  {
    id: 'lang-quan-sat',
    name: 'Trang — Người Ghi Chép Đêm Khuya',
    faction: 'wanderer',
    maxHp: 10,
    accessTag: 'broadcast-gear',
    traceTag: 'signal-meter',
    skillName: 'Đối Chiếu Tức Thời',
    skillSummary:
      'Lật vai nhận +2 Khiên và đọc thêm 1 đặc điểm thật (dụng cụ hoặc dấu vết) của 1 người cùng hoặc kề khu vực.',
    covertSummary: 'Gặp gỡ người chơi, đối chiếu chéo để ghi nhận giả thuyết phe chuẩn xác.',
    revealBenefitSummary: 'Nhận +2 Khiên và kiểm tra ngay đặc điểm trang bị tầm gần.',
    goalSummary:
      'Ghi >= 2 giả thuyết ĐÚNG PHE (0 sai) trên những người chưa lật vai mà bạn đã gặp mặt/điều tra và sống sót tới cuối ván.',
  },
  {
    id: 'lang-cuu-ho',
    name: 'Bình — Người Bảo Hộ Ngầm',
    faction: 'wanderer',
    maxHp: 11,
    accessTag: 'patrol-badge',
    traceTag: 'insulated-gloves',
    skillName: 'Che Chắn Khẩn Cấp',
    skillSummary:
      'Lật vai hồi 3 vết thương & +2 Khiên cho Mục tiêu Bảo Hộ (hoặc bản thân), đồng thời bật chế độ Đỡ Đòn Thay khi đứng cùng phòng.',
    covertSummary: 'Theo dõi thầm lặng để giữ Mục tiêu Bảo Hộ sống sót.',
    revealBenefitSummary: 'Che chắn +2 Khiên, hồi 3 thương và tự động đỡ đòn thay nếu đứng cạnh Mục tiêu Bảo Hộ.',
    goalSummary:
      'Giữ Mục tiêu Bảo Hộ bí mật sống sót tới cuối ván và có ít nhất 1 lần hỗ trợ/hồi phục cho họ (hoặc hy sinh đỡ đòn thay cho họ).',
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

export function listRolesMatchingAccessTag(tag: BoardGameAccessTag): RoleDefinition[] {
  return ROLES_CATALOG.filter((r) => r.accessTag === tag);
}

export function listRolesMatchingTraceTag(tag: BoardGameTraceTag): RoleDefinition[] {
  return ROLES_CATALOG.filter((r) => r.traceTag === tag);
}

export function formatRoleMatchSummary(roles: readonly RoleDefinition[]): string {
  return roles
    .map((r) => `${r.name.split(' — ')[0]} (${FACTION_LABELS[r.faction]})`)
    .join(' · ');
}
