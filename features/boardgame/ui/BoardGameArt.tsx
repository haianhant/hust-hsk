'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/BoardGameArt.tsx — Hệ thống Đồ họa Bàn Cờ Minh Họa
// (100% vector SVG thủ tục nguyên bản): Chân dung 9 lớp nhân vật, Huy hiệu 3 phe,
// Bản đồ 6 khu vực KTX, Mặt sau 3 bộ thẻ & Quân cờ Token theo đồng phục HUST.
// ---------------------------------------------------------------------------

import { useId } from 'react';
import { OUTFIT_PRESETS } from '../../avatar/appearance/presets';
import type {
  BoardGameDeckId,
  BoardGameFactionId,
  BoardGameLocationId,
  BoardGamePublicPlayerView,
  BoardGameRoleId,
} from '../network/contracts';

export const FACTION_THEME: Record<
  BoardGameFactionId,
  {
    label: string;
    shortLabel: string;
    badgeClasses: string;
    cardBorder: string;
    accentHex: string;
    glowHex: string;
    shortGoal: string;
  }
> = {
  'lantern-guard': {
    label: 'Đội Gác Đèn',
    shortLabel: 'Gác Đèn',
    badgeClasses: 'border-amber-400/60 bg-amber-950/75 text-amber-200',
    cardBorder: 'border-amber-400/50',
    accentHex: '#F59E0B',
    glowHex: '#FDE68A',
    shortGoal: 'Tín hiệu chạm 6 hoặc hạ hết Màn Sương',
  },
  'mist-order': {
    label: 'Hội Màn Sương',
    shortLabel: 'Màn Sương',
    badgeClasses: 'border-violet-400/60 bg-violet-950/75 text-violet-200',
    cardBorder: 'border-violet-400/50',
    accentHex: '#A855F7',
    glowHex: '#E9D5FF',
    shortGoal: 'Nhiễu sóng chạm 6 hoặc hạ hết Gác Đèn',
  },
  wanderer: {
    label: 'Kẻ Lang Thang',
    shortLabel: 'Lang Thang',
    badgeClasses: 'border-emerald-400/60 bg-emerald-950/75 text-emerald-200',
    cardBorder: 'border-emerald-400/50',
    accentHex: '#10B981',
    glowHex: '#A7F3D0',
    shortGoal: 'Hoàn thành nhiệm vụ bí mật cá nhân',
  },
};

export interface RoleVisualMeta {
  heroName: string;
  archetype: string;
  emblem: string;
  skillChips: readonly string[];
  winShort: string;
  bgFrom: string;
  bgTo: string;
  cloakHex: string;
  trimHex: string;
}

export const ROLE_VISUAL_META: Record<BoardGameRoleId, RoleVisualMeta> = {
  'gac-ky-thuat': {
    heroName: 'Minh',
    archetype: 'Kỹ Thuật Tầng Thượng',
    emblem: '🔧',
    skillChips: ['1×/ván', '+1 📡 Tín hiệu', '+2 ❤️ cùng khu'],
    winShort: 'Tín hiệu 6/6 hoặc hạ Màn Sương',
    bgFrom: '#451A03',
    bgTo: '#92400E',
    cloakHex: '#D97706',
    trimHex: '#FDE68A',
  },
  'gac-truc-ban': {
    heroName: 'Lan',
    archetype: 'Trực Ban Nội Trú',
    emblem: '📋',
    skillChips: ['1×/ván', '🔍 Soi Sương cùng khu', '+2 🛡️ Khiên'],
    winShort: 'Tín hiệu 6/6 hoặc hạ Màn Sương',
    bgFrom: '#422006',
    bgTo: '#78350F',
    cloakHex: '#B45309',
    trimHex: '#FEF08A',
  },
  'gac-radio': {
    heroName: 'Khánh',
    archetype: 'Hội Viên Radio KTX',
    emblem: '🎙️',
    skillChips: ['1×/ván', '+1 📡 Tín hiệu', '+1 🟦 Thẻ Chiến thuật'],
    winShort: 'Tín hiệu 6/6 hoặc hạ Màn Sương',
    bgFrom: '#431407',
    bgTo: '#9A3412',
    cloakHex: '#EA580C',
    trimHex: '#FED7AA',
  },
  'suong-an-danh': {
    heroName: 'Tú',
    archetype: 'Cư Dân Vô Hình',
    emblem: '🔌',
    skillChips: ['1×/ván', '+1 🌫️ Màn sương', '⚡ Tắt điện 1 vòng'],
    winShort: 'Nhiễu sóng 6/6 hoặc hạ Gác Đèn',
    bgFrom: '#2E1065',
    bgTo: '#581C87',
    cloakHex: '#6D28D9',
    trimHex: '#DDD6FE',
  },
  'suong-tin-gia': {
    heroName: 'Vy',
    archetype: 'Người Gửi Tin Đồn',
    emblem: '🎭',
    skillChips: ['1×/ván', '-1 📡 · +1 🌫️', '💥 1 ST tầm gần'],
    winShort: 'Nhiễu sóng 6/6 hoặc hạ Gác Đèn',
    bgFrom: '#3B0764',
    bgTo: '#701A75',
    cloakHex: '#A21CAF',
    trimHex: '#F5D0FE',
  },
  'suong-gac-cong': {
    heroName: 'Dũng',
    archetype: 'Bóng Đêm Hành Lang',
    emblem: '🔒',
    skillChips: ['1×/ván', '💥 2 ST cùng/kề khu', '🚫 Khóa hồi máu'],
    winShort: 'Nhiễu sóng 6/6 hoặc hạ Gác Đèn',
    bgFrom: '#1E1B4B',
    bgTo: '#4C1D95',
    cloakHex: '#4338CA',
    trimHex: '#C7D2FE',
  },
  'lang-anh-san': {
    heroName: 'Hải',
    archetype: 'Săn Gói Tin Bí Mật',
    emblem: '💎',
    skillChips: ['1×/ván', '+1 🧩 · +1 🛡️', '🔍 Soi phe cùng khu'],
    winShort: '≥ 3 Mảnh Tin Đen (hoặc ≥ 2 hết vòng)',
    bgFrom: '#022C22',
    bgTo: '#065F46',
    cloakHex: '#047857',
    trimHex: '#6EE7B7',
  },
  'lang-quan-sat': {
    heroName: 'Trang',
    archetype: 'Ghi Chép Đêm Khuya',
    emblem: '📓',
    skillChips: ['1×/ván', '🔍 Soi mọi khu', '+2 🛡️ Khiên'],
    winShort: 'Đoán đúng ≥ 2 lần (hoặc HP ≥ 6 cuối ván)',
    bgFrom: '#042F2E',
    bgTo: '#115E59',
    cloakHex: '#0F766E',
    trimHex: '#99F6E4',
  },
  'lang-cuu-ho': {
    heroName: 'Bình',
    archetype: 'Người Bảo Hộ Ngầm',
    emblem: '🩺',
    skillChips: ['1×/ván', '+3 ❤️ & +2 🛡️ Bảo hộ', '🤝 Theo dấu đồng đội'],
    winShort: 'Giữ Bảo hộ sống (HP≥4) hoặc Che ≥ 2 lần',
    bgFrom: '#052E16',
    bgTo: '#166534',
    cloakHex: '#15803D',
    trimHex: '#86EFAC',
  },
};

export interface LocationVisualMeta {
  icon: string;
  badgeText: string;
  frameAccent: string;
  pillClasses: string;
}

export const LOCATION_VISUAL_META: Record<BoardGameLocationId, LocationVisualMeta> = {
  lobby: {
    icon: '🏮',
    badgeText: 'Dừng: +1 ❤️',
    frameAccent: '#F59E0B',
    pillClasses: 'bg-amber-950/80 text-amber-200 ring-amber-400/40',
  },
  canteen: {
    icon: '🍜',
    badgeText: 'Sự kiện: +1 🛡️',
    frameAccent: '#FB923C',
    pillClasses: 'bg-orange-950/80 text-orange-200 ring-orange-400/40',
  },
  court: {
    icon: '🏀',
    badgeText: 'Tầm xa khu kề',
    frameAccent: '#38BDF8',
    pillClasses: 'bg-sky-950/80 text-sky-200 ring-sky-400/40',
  },
  breaker: {
    icon: '⚡',
    badgeText: 'Manh mối: +1 🛡️',
    frameAccent: '#C084FC',
    pillClasses: 'bg-purple-950/80 text-purple-200 ring-purple-400/40',
  },
  corridor: {
    icon: '🧭',
    badgeText: 'Nối cả 5 khu',
    frameAccent: '#34D399',
    pillClasses: 'bg-emerald-950/80 text-emerald-200 ring-emerald-400/40',
  },
  radio: {
    icon: '📡',
    badgeText: 'Chỉnh sóng ±1',
    frameAccent: '#FBBF24',
    pillClasses: 'bg-yellow-950/80 text-yellow-200 ring-yellow-400/40',
  },
};

/** Bố cục phẳng 3×2 đặt Hành Lang B7 ở trung tâm dưới nối thẳng tới 5 khu vực xung quanh. */
export const BOARD_GRID_ORDER: readonly BoardGameLocationId[] = [
  'lobby',
  'canteen',
  'court',
  'breaker',
  'corridor',
  'radio',
];

export const SEAT_RING_PALETTE = [
  '#F59E0B',
  '#38BDF8',
  '#34D399',
  '#F472B6',
  '#A78BFA',
  '#FB923C',
  '#2DD4BF',
  '#FACC15',
] as const;

export function FactionCrestSvg({
  faction,
  className = 'h-4 w-4',
}: {
  faction: BoardGameFactionId;
  className?: string;
}) {
  if (faction === 'lantern-guard') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          d="M12 2L14 4H10L12 2ZM8 6H16L17 9V17L15 19H9L7 17V9L8 6Z"
          fill="#F59E0B"
          stroke="#FEF3C7"
          strokeWidth="1.2"
        />
        <circle cx="12" cy="12.5" r="2.6" fill="#FEF08A" />
        <path d="M9 21H15" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (faction === 'mist-order') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          d="M12 3C7 3 4 7 4 11.5C4 16 7.5 19.5 12 21C16.5 19.5 20 16 20 11.5C20 7 17 3 12 3Z"
          fill="#581C87"
          stroke="#D8B4FE"
          strokeWidth="1.3"
        />
        <path
          d="M6.5 11.5C8 10 9.5 10 11 11.5C12.5 13 14 13 17.5 11"
          fill="none"
          stroke="#E9D5FF"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M7.5 15C9 14 11 14 12.5 15C14 16 15.5 15.5 16.8 14.5"
          fill="none"
          stroke="#C084FC"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="#064E3B" stroke="#6EE7B7" strokeWidth="1.3" />
      <polygon points="12,5 14.2,10.5 19,12 14.2,13.5 12,19 9.8,13.5 5,12 9.8,10.5" fill="#34D399" />
      <circle cx="12" cy="12" r="1.6" fill="#ECFDF5" />
    </svg>
  );
}

export function RolePortraitSvg({
  roleId,
  size = 'md',
}: {
  roleId: BoardGameRoleId;
  size?: 'sm' | 'md' | 'lg';
}) {
  const uid = useId().replace(/:/g, '');
  const meta = ROLE_VISUAL_META[roleId];
  const dimClass =
    size === 'sm' ? 'h-10 w-10' : size === 'lg' ? 'h-20 w-20' : 'h-16 w-16';
  const isFemale = roleId === 'gac-truc-ban' || roleId === 'suong-tin-gia' || roleId === 'lang-quan-sat';
  const hasHood = roleId === 'suong-an-danh' || roleId === 'suong-gac-cong' || roleId === 'lang-anh-san';

  return (
    <svg
      viewBox="0 0 96 96"
      className={`${dimClass} shrink-0 rounded-xl shadow-inner`}
      aria-label={meta.archetype}
    >
      <defs>
        <linearGradient id={`bg_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={meta.bgFrom} />
          <stop offset="100%" stopColor={meta.bgTo} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="96" height="96" rx="16" fill={`url(#bg_${uid})`} />
      <circle cx="48" cy="44" r="34" fill={meta.trimHex} opacity="0.12" />
      <circle cx="48" cy="44" r="33" fill="none" stroke={meta.trimHex} strokeOpacity="0.35" strokeWidth="1.5" />

      {/* Mũ trùm hoặc vầng tóc sau */}
      {hasHood ? (
        <path
          d="M23 54C23 26 35 16 48 16C61 16 73 26 73 54L68 62H28L23 54Z"
          fill="#0F172A"
          stroke={meta.trimHex}
          strokeOpacity="0.55"
          strokeWidth="1.6"
        />
      ) : isFemale ? (
        <path d="M27 42C27 25 36 18 48 18C60 18 69 25 69 42L72 60H24L27 42Z" fill="#1E1B18" />
      ) : (
        <path d="M29 38C29 24 37 18 48 18C59 18 67 24 67 38Z" fill="#1E1B18" />
      )}

      {/* Vai & Áo đặc trưng lớp nhân vật */}
      <path
        d="M16 94C18 71 30 62 48 62C66 62 78 71 80 94Z"
        fill={meta.cloakHex}
        stroke={meta.trimHex}
        strokeWidth="1.6"
      />
      <path d="M37 64L48 77L59 64" fill="none" stroke={meta.trimHex} strokeWidth="2.2" />

      {/* Đầu & Cổ */}
      <rect x="42" y="51" width="12" height="14" rx="5" fill="#EAC09E" />
      <circle cx="48" cy="39" r="15" fill="#F2CBA9" />

      {/* Tóc mái / Tai nghe */}
      {!hasHood && (
        <path
          d="M33 36C34 25 42 22 48 22C54 22 62 25 63 36C58 30 39 30 33 36Z"
          fill="#1B1918"
        />
      )}

      {/* Mắt & Phụ kiện riêng theo từng class */}
      {roleId === 'lang-anh-san' ? (
        <>
          <rect x="36" y="34" width="24" height="7" rx="3" fill="#0F172A" stroke="#34D399" strokeWidth="1.5" />
          <line x1="40" y1="37.5" x2="56" y2="37.5" stroke="#6EE7B7" strokeWidth="1.8" />
        </>
      ) : roleId === 'suong-tin-gia' ? (
        <>
          <path d="M35 35H61L57 42H49L48 40L47 42H39Z" fill="#311042" stroke="#F5D0FE" strokeWidth="1" />
          <circle cx="42.5" cy="38.2" r="1.5" fill="#F0ABFC" />
          <circle cx="53.5" cy="38.2" r="1.5" fill="#F0ABFC" />
        </>
      ) : (
        <>
          <circle cx="42.5" cy="39" r="1.8" fill="#1E293B" />
          <circle cx="53.5" cy="39" r="1.8" fill="#1E293B" />
          <path d="M44 46.5Q48 49 52 46.5" fill="none" stroke="#9A6B52" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}

      {/* Trang bị nhận diện từng nhân vật */}
      {roleId === 'gac-ky-thuat' && (
        <>
          {/* Mũ bảo hộ & đèn pin trán */}
          <path d="M31 31C32 20 39 16 48 16C57 16 64 20 65 31Z" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="1.4" />
          <rect x="43" y="21" width="10" height="6" rx="2" fill="#FEF08A" stroke="#78350F" strokeWidth="1.2" />
          {/* Cờ lê bên vai phải */}
          <path d="M68 79L76 70" stroke="#E2E8F0" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="77" cy="69" r="4" fill="none" stroke="#E2E8F0" strokeWidth="2.2" />
        </>
      )}

      {roleId === 'gac-truc-ban' && (
        <>
          {/* Kính thanh lịch + Sổ trực + Băng tay đỏ */}
          <rect x="38" y="36" width="8" height="5.5" rx="1.5" fill="none" stroke="#1E293B" strokeWidth="1.3" />
          <rect x="50" y="36" width="8" height="5.5" rx="1.5" fill="none" stroke="#1E293B" strokeWidth="1.3" />
          <rect x="24" y="68" width="14" height="17" rx="2" fill="#FEF3C7" stroke="#78350F" strokeWidth="1.4" />
          <line x1="27" y1="73" x2="35" y2="73" stroke="#92400E" strokeWidth="1.4" />
          <line x1="27" y1="77" x2="35" y2="77" stroke="#92400E" strokeWidth="1.4" />
        </>
      )}

      {roleId === 'gac-radio' && (
        <>
          {/* Tai nghe chụp đầu + micro thu âm */}
          <path d="M31 38C31 23 39 18 48 18C57 18 65 23 65 38" fill="none" stroke="#F8FAFC" strokeWidth="3" />
          <rect x="28" y="33" width="6" height="12" rx="3" fill="#EA580C" stroke="#FEF3C7" strokeWidth="1.2" />
          <rect x="62" y="33" width="6" height="12" rx="3" fill="#EA580C" stroke="#FEF3C7" strokeWidth="1.2" />
          <path d="M64 43L52 48" stroke="#CBD5E1" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="51" cy="48.5" r="2.2" fill="#FDE047" />
        </>
      )}

      {roleId === 'suong-an-danh' && (
        <>
          {/* Biểu tượng cầu dao ngắt điện */}
          <rect x="64" y="67" width="14" height="18" rx="3" fill="#1E1B4B" stroke="#C4B5FD" strokeWidth="1.4" />
          <path d="M72 70L68 76H73L69 82" fill="none" stroke="#F472B6" strokeWidth="2" strokeLinecap="round" />
        </>
      )}

      {roleId === 'suong-tin-gia' && (
        <>
          {/* Sóng nhiễu bên góc */}
          <path d="M64 69L70 65L74 71L80 67" fill="none" stroke="#F0ABFC" strokeWidth="2" strokeLinecap="round" />
          <circle cx="71" cy="79" r="5" fill="#701A75" stroke="#F5D0FE" strokeWidth="1.4" />
        </>
      )}

      {roleId === 'suong-gac-cong' && (
        <>
          {/* Khăn choàng cổ & ổ khóa */}
          <rect x="33" y="58" width="30" height="8" rx="4" fill="#312E81" stroke="#A5B4FC" strokeWidth="1.2" />
          <rect x="65" y="72" width="13" height="11" rx="2.5" fill="#C7D2FE" stroke="#1E1B4B" strokeWidth="1.4" />
          <path d="M68 72V68.5C68 66.5 75 66.5 75 68.5V72" fill="none" stroke="#C7D2FE" strokeWidth="1.8" />
        </>
      )}

      {roleId === 'lang-anh-san' && (
        <>
          {/* Viên Mảnh Tin Đen phát sáng */}
          <polygon points="71,65 78,74 71,83 64,74" fill="#34D399" stroke="#ECFDF5" strokeWidth="1.4" />
        </>
      )}

      {roleId === 'lang-quan-sat' && (
        <>
          {/* Kính tròn + Sổ tay & Bút */}
          <circle cx="42.5" cy="39" r="4.3" fill="none" stroke="#99F6E4" strokeWidth="1.3" />
          <circle cx="53.5" cy="39" r="4.3" fill="none" stroke="#99F6E4" strokeWidth="1.3" />
          <rect x="23" y="68" width="15" height="18" rx="2.5" fill="#0F172A" stroke="#5EEAD4" strokeWidth="1.4" />
          <circle cx="30.5" cy="77" r="3" fill="none" stroke="#5EEAD4" strokeWidth="1.3" />
        </>
      )}

      {roleId === 'lang-cuu-ho' && (
        <>
          {/* Khiên chữ thập y tế KTX */}
          <path
            d="M71 66L79 69V76C79 81 75 84 71 86C67 84 63 81 63 76V69L71 66Z"
            fill="#ECFDF5"
            stroke="#10B981"
            strokeWidth="1.5"
          />
          <path d="M71 71V79M67 75H75" stroke="#EF4444" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function LocationSceneSvg({
  locationId,
  isBlackout = false,
}: {
  locationId: BoardGameLocationId;
  isBlackout?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const skyTop = isBlackout ? '#1E1033' : '#0F172A';
  const glow = isBlackout ? '#7C3AED' : LOCATION_VISUAL_META[locationId].frameAccent;

  return (
    <svg
      viewBox="0 0 200 62"
      className="h-12 w-full rounded-lg border border-slate-800/80 object-cover sm:h-14"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`loc_${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTop} />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="62" fill={`url(#loc_${uid})`} />
      {/* Sao đêm */}
      <circle cx="24" cy="11" r="1" fill="#E2E8F0" opacity="0.65" />
      <circle cx="88" cy="8" r="1.2" fill="#FEF08A" opacity="0.55" />
      <circle cx="172" cy="14" r="1" fill="#E2E8F0" opacity="0.6" />
      <rect x="0" y="50" width="200" height="12" fill="#0B1220" />

      {locationId === 'lobby' && (
        <>
          <rect x="52" y="18" width="96" height="32" rx="3" fill="#1E293B" stroke="#475569" strokeWidth="1.2" />
          <polygon points="46,18 100,7 154,18" fill="#334155" />
          <rect x="88" y="30" width="24" height="20" fill="#F59E0B" opacity={isBlackout ? '0.2' : '0.6'} />
          <circle cx="100" cy="24" r="7" fill={glow} opacity="0.25" />
          <circle cx="100" cy="24" r="2.8" fill={glow} />
          <rect x="64" y="25" width="12" height="10" rx="1.5" fill="#FDE68A" opacity={isBlackout ? '0.2' : '0.75'} />
          <rect x="124" y="25" width="12" height="10" rx="1.5" fill="#FDE68A" opacity={isBlackout ? '0.2' : '0.75'} />
        </>
      )}

      {locationId === 'canteen' && (
        <>
          <rect x="44" y="22" width="112" height="28" rx="3" fill="#1E293B" />
          <path d="M40 22L54 13H146L160 22Z" fill="#EA580C" />
          <path d="M60 13V22M80 13V22M100 13V22M120 13V22M140 13V22" stroke="#FEF3C7" strokeWidth="3" opacity="0.7" />
          <rect x="58" y="33" width="84" height="5" fill="#FDBA74" opacity="0.75" />
          <circle cx="72" cy="27" r="2.6" fill="#FDE047" />
          <circle cx="100" cy="27" r="2.6" fill="#FDE047" />
          <circle cx="128" cy="27" r="2.6" fill="#FDE047" />
        </>
      )}

      {locationId === 'court' && (
        <>
          {/* Đèn pha sân bóng rổ & bảng rổ */}
          <line x1="34" y1="50" x2="34" y2="14" stroke="#64748B" strokeWidth="2.5" />
          <polygon points="34,15 70,48 20,48" fill={glow} opacity="0.12" />
          <circle cx="34" cy="14" r="3.5" fill="#BAE6FD" />
          <rect x="136" y="18" width="20" height="14" rx="2" fill="#F8FAFC" stroke="#38BDF8" strokeWidth="1.5" />
          <line x1="146" y1="32" x2="146" y2="50" stroke="#94A3B8" strokeWidth="2.5" />
          <ellipse cx="141" cy="29" rx="5.5" ry="2" fill="none" stroke="#FB923C" strokeWidth="2" />
          <path d="M65 50Q100 37 135 50" fill="none" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.65" />
          <circle cx="96" cy="43" r="4" fill="#F97316" />
        </>
      )}

      {locationId === 'breaker' && (
        <>
          <rect x="64" y="15" width="72" height="35" rx="4" fill="#1E1B4B" stroke="#7E22CE" strokeWidth="1.5" />
          <rect x="74" y="22" width="22" height="20" rx="2" fill="#0F172A" stroke="#A855F7" strokeWidth="1.2" />
          <path d="M87 24L82 32H87L83 39" fill="none" stroke="#FACC15" strokeWidth="2" strokeLinecap="round" />
          <circle cx="114" cy="27" r="3" fill={isBlackout ? '#EF4444' : '#34D399'} />
          <circle cx="124" cy="27" r="3" fill="#F59E0B" />
          <line x1="108" y1="36" x2="128" y2="36" stroke="#C084FC" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {locationId === 'corridor' && (
        <>
          {/* Hành lang phối cảnh B7 */}
          <rect x="36" y="14" width="128" height="36" fill="#0F172A" stroke="#334155" strokeWidth="1.2" />
          <line x1="36" y1="14" x2="80" y2="27" stroke="#34D399" strokeOpacity="0.45" strokeWidth="1.4" />
          <line x1="164" y1="14" x2="120" y2="27" stroke="#34D399" strokeOpacity="0.45" strokeWidth="1.4" />
          <rect x="80" y="25" width="40" height="25" fill="#064E3B" stroke="#34D399" strokeWidth="1.5" />
          <circle cx="100" cy="20" r="3" fill="#6EE7B7" />
          <polygon points="100,32 104,37 100,42 96,37" fill="#A7F3D0" />
        </>
      )}

      {locationId === 'radio' && (
        <>
          {/* Tháp phát thanh & sóng đồng tâm */}
          <polygon points="90,50 100,18 110,50" fill="none" stroke="#CBD5E1" strokeWidth="2" />
          <line x1="94" y1="38" x2="106" y2="38" stroke="#94A3B8" strokeWidth="1.5" />
          <circle cx="100" cy="17" r="3.5" fill={glow} />
          <path d="M84 19C82 13 86 8 92 7" fill="none" stroke={glow} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M116 19C118 13 114 8 108 7" fill="none" stroke={glow} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M77 24C73 14 80 5 90 3" fill="none" stroke={glow} strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M123 24C127 14 120 5 110 3" fill="none" stroke={glow} strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function DeckCardBackSvg({ deck }: { deck: BoardGameDeckId }) {
  const palette =
    deck === 'clue'
      ? { bg: '#451A03', border: '#F59E0B', fg: '#FDE68A' }
      : deck === 'event'
        ? { bg: '#4C0519', border: '#F43F5E', fg: '#FECDD3' }
        : { bg: '#082F49', border: '#38BDF8', fg: '#BAE6FD' };

  return (
    <svg viewBox="0 0 36 48" className="h-10 w-8 shrink-0 rounded-md shadow" aria-hidden="true">
      <rect x="1" y="1" width="34" height="46" rx="5" fill={palette.bg} stroke={palette.border} strokeWidth="2" />
      <rect x="4.5" y="4.5" width="27" height="39" rx="3" fill="none" stroke={palette.fg} strokeOpacity="0.35" strokeDasharray="2 2" />
      {deck === 'clue' && (
        <>
          <circle cx="16.5" cy="21" r="6" fill="none" stroke={palette.fg} strokeWidth="2.2" />
          <line x1="21" y1="25.5" x2="26" y2="31" stroke={palette.fg} strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}
      {deck === 'event' && (
        <path d="M19 12L12 24H18L15 36L25 22H19L22 12Z" fill={palette.fg} />
      )}
      {deck === 'tactic' && (
        <>
          <path d="M18 13L26 16.5V23.5C26 28.5 22.5 32 18 34C13.5 32 10 28.5 10 23.5V16.5L18 13Z" fill="none" stroke={palette.fg} strokeWidth="2" />
          <circle cx="18" cy="23" r="2.8" fill={palette.fg} />
        </>
      )}
    </svg>
  );
}

export function PlayerPawnToken({
  player,
  isSelf,
  isActiveTurn,
}: {
  player: BoardGamePublicPlayerView;
  isSelf: boolean;
  isActiveTurn: boolean;
}) {
  const outfitId = player.appearance?.outfit ?? 'windbreaker-hust';
  const preset = OUTFIT_PRESETS[outfitId] ?? OUTFIT_PRESETS['windbreaker-hust'];
  const ringHex = player.revealedFaction
    ? FACTION_THEME[player.revealedFaction].accentHex
    : SEAT_RING_PALETTE[player.seatIndex % SEAT_RING_PALETTE.length];
  const isFemale = player.appearance?.gender === 'female';

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-xl border px-1.5 py-1 text-[11px] transition motion-reduce:transition-none ${
        !player.alive
          ? 'border-slate-800 bg-slate-950/65 text-slate-500 opacity-65 line-through'
          : isActiveTurn
            ? 'border-amber-400 bg-amber-950/70 text-amber-50 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
            : isSelf
              ? 'border-emerald-400/60 bg-emerald-950/45 text-emerald-50'
              : 'border-slate-700/90 bg-slate-950/85 text-slate-100'
      }`}
    >
      {/* Quân cờ Avatar thu nhỏ */}
      <svg viewBox="0 0 28 28" className="h-6 w-6 shrink-0" aria-hidden="true">
        <circle cx="14" cy="14" r="12.5" fill="#0F172A" stroke={ringHex} strokeWidth="2.2" />
        {/* Áo theo đúng preset đồng phục */}
        <path d="M6 25C7 19.5 10 17 14 17C18 17 21 19.5 22 25Z" fill={preset.shirt} />
        {preset.upperYokeColor && (
          <path d="M8.5 19L14 23L19.5 19" fill="none" stroke={preset.upperYokeColor} strokeWidth="2" />
        )}
        {/* Tóc & Mặt */}
        <circle cx="14" cy="11.2" r="4.6" fill="#F2CBA9" />
        <path
          d={
            isFemale
              ? 'M8.8 11.5C8.8 7.5 11.2 6 14 6C16.8 6 19.2 7.5 19.2 11.5V15H17.6V10.5H10.4V15H8.8Z'
              : 'M9.3 10.5C9.5 7 11.5 6 14 6C16.5 6 18.5 7 18.7 10.5C16.5 9 11.5 9 9.3 10.5Z'
          }
          fill="#1B1918"
        />
      </svg>

      <div className="min-w-0 leading-tight">
        <div className="flex items-center gap-1 truncate font-semibold">
          {isActiveTurn && <span className="text-amber-300">▶</span>}
          <span className="max-w-[76px] truncate sm:max-w-[92px]">{player.displayName}</span>
          {player.revealedFaction && (
            <FactionCrestSvg faction={player.revealedFaction} className="h-3.5 w-3.5 shrink-0" />
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
          <span className="font-semibold text-rose-300">❤️{player.hp}</span>
          {player.shield > 0 && <span className="font-semibold text-sky-300">🛡️{player.shield}</span>}
          {!player.connected && <span className="text-rose-400">📡✕</span>}
        </div>
      </div>
    </div>
  );
}
