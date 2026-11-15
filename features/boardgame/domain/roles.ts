// ---------------------------------------------------------------------------
// features/boardgame/domain/roles.ts — 3 Phe nguyên bản & 9 Nhân vật v3
// ("Bóng Đêm KTX v3 — Hidden Role, Investigation & Survival").
//
// Cân bằng đối xứng: cả 3 phe đều sở hữu đúng 1 nhân vật ở mỗi ngưỡng HP
// tối đa (`11 / 12 / 13 HP`), không để lộ phe từ thông số ban đầu.
// Mọi kỹ năng chủ động công khai đều yêu cầu TỰ LẬT VAI trước khi sử dụng.
// ---------------------------------------------------------------------------

import type { BoardGameFactionId, BoardGameRoleId } from '../../../shared/contracts/boardgame';
import type { CharacterDesign } from './types';

export const FACTION_LABELS: Record<BoardGameFactionId, string> = {
  'lantern-guard': 'Đội Gác Đèn',
  'mist-order': 'Hội Màn Sương',
  wanderer: 'Kẻ Lang Thang',
};

export const ROLES_CATALOG: readonly CharacterDesign[] = [
  {
    id: 'gac-ky-thuat',
    name: 'Minh — Kỹ Thuật Viên',
    faction: 'lantern-guard',
    maxHp: 13,
    secretObjective:
      'Xác định và hạ toàn bộ thành viên Hội Màn Sương (hoặc giữ lợi thế kiểm soát tới Rạng Sáng).',
    activeAbility: {
      id: 'skill-minh-fortify',
      name: 'Gia Cố Chốt Trực',
      cooldownRounds: 2,
      summary:
        'Chọn bản thân hoặc 1 người cùng/kề phòng: hồi 2 vết thương và tặng +1 Giáp tạm (+2 nếu họ chưa bị thương).',
    },
    passiveAbility: {
      id: 'passive-minh-gear',
      name: 'Tay Nghề Xưởng Thực Tập',
      cooldownRounds: 0,
      summary:
        'Sau khi lật vai: miễn nhiễm sát thương từ thẻ Sự kiện khi đang mang ít nhất 1 Trang bị.',
    },
    revealBenefit: 'Nhận ngay +1 Giáp tạm và rút 1 thẻ Trang bị.',
    weaknesses: [
      'HP tối đa 13 khiến một số Thẻ Điều tra nhầm lẫn với Dũng hoặc Bình.',
      'Kỹ năng hỗ trợ đồng đội mạnh nhưng dễ bị tập trung sau khi lật vai.',
    ],
  },
  {
    id: 'gac-truc-ban',
    name: 'Lan — Trực Ban Nội Trú',
    faction: 'lantern-guard',
    maxHp: 12,
    secretObjective:
      'Xác định và hạ toàn bộ thành viên Hội Màn Sương (hoặc giữ lợi thế kiểm soát tới Rạng Sáng).',
    activeAbility: {
      id: 'skill-lan-ward',
      name: 'Lệnh Bảo Hộ Trực Đêm',
      cooldownRounds: 2,
      summary:
        'Bảo hộ 1 người khác cùng/kề phòng tới đầu lượt sau của Lan: giảm 1 ST nhận vào và chặn không rơi xuống dưới 1 HP.',
    },
    passiveAbility: {
      id: 'passive-lan-ledger',
      name: 'Sổ Quản Lý Balo',
      cooldownRounds: 0,
      summary:
        'Sau khi lật vai: mỗi lần dùng Thẻ Điều tra đọc thêm chính xác số bài trên tay mục tiêu.',
    },
    revealBenefit: 'Hồi ngay 1 vết thương và rút 1 thẻ Điều tra.',
    weaknesses: [
      'Kỹ năng bảo hộ không thể đặt lên chính bản thân.',
      'Cần manh mối rõ trước khi che chắn để tránh bảo vệ nhầm Màn Sương.',
    ],
  },
  {
    id: 'gac-radio',
    name: 'Khánh — Phát Thanh Viên KTX',
    faction: 'lantern-guard',
    maxHp: 11,
    secretObjective:
      'Xác định và hạ toàn bộ thành viên Hội Màn Sương (hoặc giữ lợi thế kiểm soát tới Rạng Sáng).',
    activeAbility: {
      id: 'skill-khanh-broadcast',
      name: 'Phát Sóng Kiểm Chứng',
      cooldownRounds: 2,
      summary:
        'Kiểm tra công khai 1 người ở bất kỳ đâu: nếu từng Tấn công hoặc đeo Trang bị sẽ gắn dấu Hở sườn (+1 ST đòn kế).',
    },
    passiveAbility: {
      id: 'passive-khanh-radar',
      name: 'Đài Liên Lạc Toàn Khu',
      cooldownRounds: 0,
      summary:
        'Sau khi lật vai: dùng Thẻ Điều tra nhắm tới mọi khu vực không cần đứng gần.',
    },
    revealBenefit: 'Mở tầm điều tra toàn bản đồ ngay lượt này và nhận +1 Giáp tạm.',
    weaknesses: [
      'Ngưỡng máu 11 dễ gục nếu lật vai sớm khi chưa có áo khoác hoặc giáp.',
      'Khả năng gắn dấu hở sườn khiến Hội Màn Sương ưu tiên truy tìm.',
    ],
  },
  {
    id: 'suong-an-danh',
    name: 'Tú — Cư Dân Vô Hình',
    faction: 'mist-order',
    maxHp: 12,
    secretObjective:
      'Hạ toàn bộ Đội Gác Đèn hoặc duy trì ẩn danh / áp lực kiểm soát vượt trội tới hết Vòng cuối.',
    activeAbility: {
      id: 'skill-tu-ambush',
      name: 'Đánh Tráo Bóng Tối',
      cooldownRounds: 2,
      summary:
        'Chọn 1 người cùng/kề phòng: hoán đổi vị trí với họ (nếu ở ô kề) và gây 2 ST phục kích (tính giáp/áo).',
    },
    passiveAbility: {
      id: 'passive-tu-slip',
      name: 'Đột Kích Im Lặng',
      cooldownRounds: 0,
      summary:
        'Sau khi lật vai: đòn ATTACK bỏ qua giảm thương Bình Tĩnh Tự Vệ và đi xa hơn khi xuất phát từ Hành Lang B7.',
    },
    revealBenefit: 'Nhận +1 Giáp tạm và mở tầm đánh kề phòng ngay lượt này.',
    weaknesses: [
      'Không biết mặt đồng đội Màn Sương lúc đầu, cần giữ bí mật trước khi đánh úp.',
      'Đòn Đánh Tráo đưa bản thân vào vị trí mới có thể bị vây ngược.',
    ],
  },
  {
    id: 'suong-tin-gia',
    name: 'Vy — Người Gửi Tin Đồn',
    faction: 'mist-order',
    maxHp: 11,
    secretObjective:
      'Hạ toàn bộ Đội Gác Đèn hoặc duy trì ẩn danh / áp lực kiểm soát vượt trội tới hết Vòng cuối.',
    activeAbility: {
      id: 'skill-vy-smoke',
      name: 'Tung Hỏa Mù Hành Lang',
      cooldownRounds: 2,
      summary:
        'Chọn 1 người cùng/kề phòng: xóa 1 Giáp tạm, gây 1 ST và đẩy họ dạt sang 1 khu vực kề cận.',
    },
    passiveAbility: {
      id: 'passive-vy-jam',
      name: 'Nhiễu Sóng Quan Sát',
      cooldownRounds: 0,
      summary:
        'Sau khi lật vai: đối thủ dùng DEFEND cùng phòng không đọc được số bài trên tay Vy.',
    },
    revealBenefit: 'Rút ngay 1 thẻ Sự kiện và nhận +1 Giáp tạm.',
    weaknesses: [
      '11 HP tối đa mỏng manh trong giao tranh trực diện kéo dài.',
      'Dễ lộ hành tung nếu liên tục gây nhiễu trước khi xác nhận đồng đội.',
    ],
  },
  {
    id: 'suong-gac-cong',
    name: 'Dũng — Bóng Đêm Hành Lang',
    faction: 'mist-order',
    maxHp: 13,
    secretObjective:
      'Hạ toàn bộ Đội Gác Đèn hoặc duy trì ẩn danh / áp lực kiểm soát vượt trội tới hết Vòng cuối.',
    activeAbility: {
      id: 'skill-dung-pounce',
      name: 'Áp Sát Bất Ngờ',
      cooldownRounds: 2,
      summary:
        'Lao vào phòng 1 mục tiêu cùng/kề phòng đang bị thương (>= 1 vết) hoặc đã lật vai và tung đòn 3 ST cơ bản.',
    },
    passiveAbility: {
      id: 'passive-dung-hunter',
      name: 'Truy Kích Thương Tích',
      cooldownRounds: 0,
      summary:
        'Sau khi lật vai: đòn ATTACK vào mục tiêu có >= 3 vết thương gây thêm +1 ST.',
    },
    revealBenefit: 'Mở tầm đánh kề phòng ngay trong lượt lật vai.',
    weaknesses: [
      'Kỹ năng chủ động không dùng được lên người chưa lật và chưa từng bị thương.',
      'Lộ diện quá sớm khiến Gác Đèn dồn thẻ Điều tra và Còi báo động.',
    ],
  },
  {
    id: 'lang-anh-san',
    name: 'Hải — Người Săn Gói Tin',
    faction: 'wanderer',
    maxHp: 12,
    secretObjective:
      'Đồng thắng nếu sống tới cuối trận với >= 2 Trang bị & >= 2 lần điều tra; hoặc từ Vòng 5+ lật vai kích hoạt kỹ năng với >= 2 Trang bị & >= 3 lần điều tra để THẮNG ĐƠN ĐỘC!',
    activeAbility: {
      id: 'skill-hai-packet',
      name: 'Chốt Gói Tin Đêm',
      cooldownRounds: 2,
      summary:
        'Từ Vòng 5+ với >= 2 Trang bị và >= 3 lần điều tra -> thắng ngay! Nếu chưa đủ: rút 1 thẻ Điều tra & +1 Giáp tạm.',
    },
    passiveAbility: {
      id: 'passive-hai-scavenger',
      name: 'Thợ Săn Tài Nguyên',
      cooldownRounds: 0,
      summary:
        'Tận dụng Căng tin và Phòng Phát Thanh để tích lũy trang bị và điều tra âm thầm.',
    },
    revealBenefit: 'Nhận +1 Giáp tạm và rút ngay 1 thẻ Trang bị.',
    weaknesses: [
      'Đeo đủ 2 trang bị rất thu hút sự chú ý của thẻ Kiểm tra tủ đồ và cả 2 phe.',
      'Phải cân bằng giữa tích lũy Điều tra và sinh tồn qua Vòng 5.',
    ],
  },
  {
    id: 'lang-quan-sat',
    name: 'Trang — Người Ghi Chép',
    faction: 'wanderer',
    maxHp: 11,
    secretObjective:
      'Đồng thắng nếu sống sót tới cuối trận với >= 2 lần điều tra khi đã có >= 3 người bị loại (hoặc đã tự lật vai với >= 2 người bị loại); THẮNG ĐƠN ĐỘC tức thì nếu đã lật vai khi cả bàn chỉ còn <= 2 người sống (và >= 2 người bị loại).',
    activeAbility: {
      id: 'skill-trang-deposition',
      name: 'Biên Bản Đối Chất',
      cooldownRounds: 2,
      summary:
        'Chọn 1 người cùng/kề phòng: cả Trang và người đó nhận +1 Giáp tạm, đồng thời Trang rút 1 thẻ Điều tra.',
    },
    passiveAbility: {
      id: 'passive-trang-notes',
      name: 'Nhân Chứng Kiên Nhẫn',
      cooldownRounds: 0,
      summary:
        'Hợp tác phòng thủ với người có nguy cơ thấp để kéo dài trận tới cuối ván.',
    },
    revealBenefit: 'Hồi ngay 1 vết thương và nhận +1 Giáp tạm.',
    weaknesses: [
      'HP tối đa 11 thấp nhất nhóm Lang Thang nếu bị hai phe ép góc.',
      'Không có sát thương kỹ năng chủ động, phải khéo léo thương lượng giữ thế cân bằng.',
    ],
  },
  {
    id: 'lang-cuu-ho',
    name: 'Bình — Người Bảo Hộ',
    faction: 'wanderer',
    maxHp: 13,
    secretObjective:
      'Bảo vệ Mục tiêu Bảo hộ bí mật cùng sống sót tới hết ván (với >= 1 lần che chắn mục tiêu); nếu Mục tiêu gục, vẫn thắng nếu sống sót cuối ván VÀ đã kết liễu kẻ hạ Mục tiêu.',
    activeAbility: {
      id: 'skill-binh-shield',
      name: 'Lá Chắn Thân Mình',
      cooldownRounds: 2,
      summary:
        'Chọn 1 người cùng/kề phòng: hồi 1 thương & tặng +2 Giáp tạm cho họ, Bình nhận +1 Giáp tạm (tính tiến độ bảo hộ nếu đúng mục tiêu).',
    },
    passiveAbility: {
      id: 'passive-binh-guardian',
      name: 'Lời Hứa Trực Đêm',
      cooldownRounds: 0,
      summary:
        'Khả năng chịu đòn 13 HP giúp bám sát khu vực trung tâm bảo vệ mục tiêu bí mật.',
    },
    revealBenefit: 'Hồi ngay 1 vết thương và nhận +1 Giáp tạm.',
    weaknesses: [
      'Lộ hướng di chuyển bám theo 1 người dễ bị đoán ra mục tiêu bảo hộ.',
      'Nếu mục tiêu bảo hộ liều lĩnh chết sớm, phải chuyển hướng trả thù hoặc sinh tồn cuối ván.',
    ],
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
