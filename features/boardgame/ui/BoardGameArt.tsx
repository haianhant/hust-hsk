'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/BoardGameArt.tsx — Hệ thống Đồ họa Bàn Cờ Bóng Đêm KTX v4
// Minh họa SVG nguyên bản 3 Cụm / 6 Khu vực Đánh số Xúc xắc, Quân cờ 8 màu,
// Xúc xắc 1d6 / 1d4 và Chồng bài Khám Phá / Cung Ứng / Đột Kích.
// ---------------------------------------------------------------------------

import React from 'react';
import type {
  BoardGameDeckId,
  BoardGameFactionId,
  BoardGameLocationId,
  BoardGameRoleId,
  BoardGameZoneClusterId,
} from '@/shared/contracts/boardgame';

export const FACTION_THEME: Record<
  BoardGameFactionId,
  {
    label: string;
    shortLabel: string;
    accent: string;
    badgeBg: string;
    borderClass: string;
    textClass: string;
    cardGlow: string;
  }
> = {
  'lantern-guard': {
    label: 'Đội Săn Đêm',
    shortLabel: 'Săn Đêm',
    accent: '#34d399',
    badgeBg: 'bg-emerald-500/20 text-emerald-100 border-emerald-400/50',
    borderClass: 'border-emerald-400/55',
    textClass: 'text-emerald-200',
    cardGlow: 'shadow-[0_12px_36px_rgba(16,185,129,0.22)]',
  },
  'mist-order': {
    label: 'Hội Bóng Đêm',
    shortLabel: 'Bóng Đêm',
    accent: '#fb7185',
    badgeBg: 'bg-rose-500/20 text-rose-100 border-rose-400/50',
    borderClass: 'border-rose-400/55',
    textClass: 'text-rose-200',
    cardGlow: 'shadow-[0_12px_36px_rgba(244,63,94,0.22)]',
  },
  wanderer: {
    label: 'Kẻ Độc Hành',
    shortLabel: 'Độc Hành',
    accent: '#fbbf24',
    badgeBg: 'bg-amber-500/20 text-amber-100 border-amber-400/50',
    borderClass: 'border-amber-400/55',
    textClass: 'text-amber-200',
    cardGlow: 'shadow-[0_12px_36px_rgba(245,158,11,0.22)]',
  },
};

export interface RoleVisualMeta {
  codeName: string;
  title: string;
  accentHex: string;
  motif: string;
  shortAbility: string;
}

export const ROLE_VISUAL_META: Record<BoardGameRoleId, RoleVisualMeta> = {
  'gac-ky-thuat': {
    codeName: 'Minh "Kỹ Thuật"',
    title: 'Đội trưởng Xung Kích',
    accentHex: '#34d399',
    motif: 'Cờ lê & Ánh đèn pha',
    shortAbility: '1 lần/trận: Tung 1d4 gây sát thương toàn bàn',
  },
  'gac-truc-ban': {
    codeName: 'Lan "Trực Ban"',
    title: 'Chốt Trực Kiên Cố',
    accentHex: '#10b981',
    motif: 'Sổ trực & Lá chắn chốt',
    shortAbility: '1 lần/trận: Bật lá chắn miễn nhiễm sát thương 1 vòng',
  },
  'gac-radio': {
    codeName: 'Vy "Radio"',
    title: 'Trinh Sát Cao Áp',
    accentHex: '#38bdf8',
    motif: 'Tai nghe & Xung cao áp',
    shortAbility: '1 lần/trận: Tung 1d6 gây sát thương toàn bàn',
  },
  'suong-an-danh': {
    codeName: 'Tú "Ẩn Danh"',
    title: 'Bóng Đêm Hút Sinh Lực',
    accentHex: '#fb7185',
    motif: 'Bóng áo choàng đêm',
    shortAbility: 'Nội tại: Đánh trúng (> 0) hồi lại 2 máu',
  },
  'suong-tin-gia': {
    codeName: 'Khánh "Tin Giả"',
    title: 'Kẻ Ngụy Trang Đa Tầng',
    accentHex: '#f43f5e',
    motif: 'Mặt nạ & Tín hiệu nhiễu',
    shortAbility: 'Úp vai né Thẻ Khám Phá · Lật: 2 dmg cùng Cụm (2 vòng)',
  },
  'suong-gac-cong': {
    codeName: 'Dũng "Gác Cổng"',
    title: 'Thủ Lĩnh Phản Kích',
    accentHex: '#a78bfa',
    motif: 'Ổ khóa sắt & Khiên phản đòn',
    shortAbility: 'Nội tại: Bị đánh thường & sống → đánh trả |1d6-1d4|',
  },
  'lang-anh-san': {
    codeName: 'Hải "Sưu Tầm"',
    title: 'Thợ Săn Trang Bị',
    accentHex: '#fbbf24',
    motif: 'Túi đồ nghề KTX',
    shortAbility: 'Vòng 3+ thắng đủ 3 đồ · Đánh >=2 dmg hoặc cướp đồ cùng Cụm',
  },
  'lang-quan-sat': {
    codeName: 'Trang "Kiên Cường"',
    title: 'Người Sống Sót Bền Bỉ',
    accentHex: '#f59e0b',
    motif: 'Ngọn lửa hồi sinh',
    shortAbility: '1 lần/trận: Hồi sạch toàn bộ thương tích về 0',
  },
  'lang-cuu-ho': {
    codeName: 'Bình "Bảo Vệ"',
    title: 'Vệ Sĩ Thầm Lặng',
    accentHex: '#2dd4bf',
    motif: 'Dây bảo hộ & Báo thù',
    shortAbility: '2 vòng: Hồi 2 máu đồng đội cùng Cụm (hoặc 2 dmg nếu đã ngã)',
  },
};

export interface LocationVisualMeta {
  name: string;
  shortName: string;
  clusterId: BoardGameZoneClusterId;
  clusterTitle: string;
  diceLabel: string;
  accentHex: string;
  bgGradient: string;
  actionTitle: string;
  actionDesc: string;
  badgeText: string;
}

export const LOCATION_VISUAL_META: Record<BoardGameLocationId, LocationVisualMeta> = {
  radio: {
    name: 'Trạm Radio KTX',
    shortName: 'Radio',
    clusterId: 'north',
    clusterTitle: 'Cụm Bắc',
    diceLabel: '2–3',
    accentHex: '#10b981',
    bgGradient: 'from-emerald-950/90 via-slate-900/95 to-slate-950',
    actionTitle: 'Rút Thẻ Khám Phá',
    actionDesc: 'Rút 1 Thẻ Khám Phá (đưa kín 1-đối-1)',
    badgeText: 'Khám Phá',
  },
  breaker: {
    name: 'Tủ Cầu Dao Tổng',
    shortName: 'Cầu Dao',
    clusterId: 'north',
    clusterTitle: 'Cụm Bắc',
    diceLabel: '4–5',
    accentHex: '#f43f5e',
    bgGradient: 'from-rose-950/85 via-slate-900/95 to-slate-950',
    actionTitle: 'Rút Thẻ Đột Kích',
    actionDesc: 'Rút 1 Thẻ Đột Kích (Vũ khí / Sự kiện)',
    badgeText: 'Đột Kích',
  },
  lobby: {
    name: 'Sảnh Tầng 1',
    shortName: 'Sảnh',
    clusterId: 'central',
    clusterTitle: 'Cụm Trung Tâm',
    diceLabel: '6',
    accentHex: '#06b6d4',
    bgGradient: 'from-cyan-950/90 via-slate-900/95 to-slate-950',
    actionTitle: 'Rút Thẻ Cung Ứng',
    actionDesc: 'Rút 1 Thẻ Cung Ứng (Giáp / Hồi sức)',
    badgeText: 'Cung Ứng',
  },
  canteen: {
    name: 'Căng Tin Đêm',
    shortName: 'Căng Tin',
    clusterId: 'central',
    clusterTitle: 'Cụm Trung Tâm',
    diceLabel: '8',
    accentHex: '#f59e0b',
    bgGradient: 'from-amber-950/85 via-slate-900/95 to-slate-950',
    actionTitle: 'Tự Chọn 1 Chồng Bài',
    actionDesc: 'Chọn rút 1 thẻ Khám Phá, Cung Ứng hoặc Đột Kích',
    badgeText: 'Tự Chọn',
  },
  corridor: {
    name: 'Hành Lang Tầng 4',
    shortName: 'Hành Lang',
    clusterId: 'south',
    clusterTitle: 'Cụm Nam',
    diceLabel: '9',
    accentHex: '#8b5cf6',
    bgGradient: 'from-violet-950/85 via-slate-900/95 to-slate-950',
    actionTitle: 'Hồi 1 hoặc Gây 2 Dmg',
    actionDesc: 'Chọn 1 người bất kỳ: Hồi 1 máu HOẶC Gây 2 sát thương',
    badgeText: 'Sơ Cứu / Bẫy',
  },
  court: {
    name: 'Sân Bóng Rổ Đêm',
    shortName: 'Sân Bóng',
    clusterId: 'south',
    clusterTitle: 'Cụm Nam',
    diceLabel: '10',
    accentHex: '#38bdf8',
    bgGradient: 'from-sky-950/90 via-slate-900/95 to-slate-950',
    actionTitle: 'Cướp 1 Trang Bị',
    actionDesc: 'Lấy 1 Trang bị đang đeo từ đối thủ bất kỳ',
    badgeText: 'Cướp Đồ',
  },
};

export const BOARD_CLUSTERS_ORDER: readonly {
  clusterId: BoardGameZoneClusterId;
  title: string;
  subtitle: string;
  ringClass: string;
  badgeClass: string;
  locations: readonly [BoardGameLocationId, BoardGameLocationId];
}[] = [
  {
    clusterId: 'north',
    title: 'Cụm Bắc',
    subtitle: '2–3 Radio · 4–5 Cầu Dao (Đánh chung cụm)',
    ringClass: 'border-emerald-400/35 bg-emerald-950/20',
    badgeClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
    locations: ['radio', 'breaker'],
  },
  {
    clusterId: 'central',
    title: 'Cụm Trung Tâm',
    subtitle: '6 Sảnh · 8 Căng Tin (Đánh chung cụm)',
    ringClass: 'border-cyan-400/35 bg-cyan-950/20',
    badgeClass: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
    locations: ['lobby', 'canteen'],
  },
  {
    clusterId: 'south',
    title: 'Cụm Nam',
    subtitle: '9 Hành Lang · 10 Sân Bóng (Đánh chung cụm)',
    ringClass: 'border-violet-400/35 bg-violet-950/20',
    badgeClass: 'bg-violet-500/20 text-violet-200 border-violet-400/40',
    locations: ['corridor', 'court'],
  },
];

export const BOARD_GRID_ORDER: readonly BoardGameLocationId[] = [
  'radio',
  'breaker',
  'lobby',
  'canteen',
  'corridor',
  'court',
];

export const SEAT_RING_PALETTE: readonly string[] = [
  '#38bdf8', // seat 0 - sky
  '#fbbf24', // seat 1 - amber
  '#a78bfa', // seat 2 - violet
  '#34d399', // seat 3 - emerald
  '#fb7185', // seat 4 - rose
  '#f472b6', // seat 5 - pink
  '#2dd4bf', // seat 6 - teal
  '#fb923c', // seat 7 - orange
];

export function FactionCrestSvg({
  faction,
  size = 24,
}: {
  faction: BoardGameFactionId | null;
  size?: number;
}) {
  if (faction === 'lantern-guard') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path
          d="M16 3L27 8V16.5C27 23.2 22.1 27.6 16 29.5C9.9 27.6 5 23.2 5 16.5V8L16 3Z"
          fill="#064e3b"
          stroke="#34d399"
          strokeWidth="2.2"
        />
        <circle cx="16" cy="16" r="5" fill="#6ee7b7" />
        <path d="M16 7.5V10.5M16 21.5V24.5M9.5 16H12.5M19.5 16H22.5" stroke="#a7f3d0" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (faction === 'mist-order') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="16" r="13" fill="#4c0519" stroke="#fb7185" strokeWidth="2.2" />
        <path
          d="M19.5 9.5C15.8 10 13 13 13 16.5C13 20 15.8 22.8 19.8 23.2C14.8 24.4 9.5 21.2 9.5 16C9.5 10.8 14.5 7.8 19.5 9.5Z"
          fill="#fda4af"
        />
        <circle cx="21.5" cy="13" r="2" fill="#ffe4e6" />
      </svg>
    );
  }
  if (faction === 'wanderer') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <polygon points="16,3 29,16 16,29 3,16" fill="#451a03" stroke="#fbbf24" strokeWidth="2.2" />
        <circle cx="16" cy="16" r="4.5" fill="#fde68a" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="#1e293b" stroke="#64748b" strokeWidth="2" strokeDasharray="3 2" />
      <text x="16" y="21" textAnchor="middle" fill="#94a3b8" fontSize="14" fontWeight="800">
        ?
      </text>
    </svg>
  );
}

export function RolePortraitSvg({
  roleId,
  faction,
  size = 44,
}: {
  roleId: BoardGameRoleId | null;
  faction: BoardGameFactionId | null;
  size?: number;
}) {
  const accent =
    roleId && ROLE_VISUAL_META[roleId]
      ? ROLE_VISUAL_META[roleId].accentHex
      : faction
        ? FACTION_THEME[faction].accent
        : '#94a3b8';

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#0f172a" stroke={accent} strokeWidth="2.2" />
      <circle cx="24" cy="18" r="7.5" fill={accent} fillOpacity="0.28" stroke={accent} strokeWidth="2" />
      <path
        d="M11 40C12.2 32.8 17.5 29 24 29C30.5 29 35.8 32.8 37 40"
        fill={accent}
        fillOpacity="0.22"
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {roleId === 'gac-radio' && (
        <path d="M16 18C16 12.5 32 12.5 32 18" stroke="#e0f2fe" strokeWidth="2.2" strokeLinecap="round" />
      )}
      {roleId === 'suong-tin-gia' && (
        <path d="M25 8L20 17H26L22 25" stroke="#fecdd3" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {roleId === 'lang-anh-san' && (
        <rect x="28" y="29" width="9" height="7" rx="2" fill="#fbbf24" />
      )}
    </svg>
  );
}

export function LocationSceneSvg({
  location,
  size = 44,
}: {
  location: BoardGameLocationId;
  size?: number;
}) {
  const accent = LOCATION_VISUAL_META[location].accentHex;
  switch (location) {
    case 'radio':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#052e2b" stroke={accent} strokeWidth="1.8" />
          <path d="M24 38V18M17 38H31" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="24" cy="15" r="3.5" fill="#34d399" />
          <path d="M16 12C12.5 15.5 12.5 21.5 16 25M32 12C35.5 15.5 35.5 21.5 32 25" stroke="#a7f3d0" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'breaker':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#2f0a17" stroke={accent} strokeWidth="1.8" />
          <rect x="13" y="10" width="22" height="28" rx="3" fill="#4c0519" stroke="#fb7185" strokeWidth="2" />
          <path d="M26 15L19 25H25L22 33" stroke="#fde047" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'lobby':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#082f49" stroke={accent} strokeWidth="1.8" />
          <rect x="11" y="13" width="26" height="24" rx="2.5" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="2" />
          <rect x="18" y="21" width="12" height="16" fill="#0284c7" />
          <circle cx="24" cy="17" r="2.2" fill="#fde68a" />
        </svg>
      );
    case 'canteen':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#3b2004" stroke={accent} strokeWidth="1.8" />
          <path d="M14 21H30V31C30 34.5 27 37 22 37C17 37 14 34.5 14 31V21Z" fill="#f59e0b" />
          <path d="M30 23H33.5C35.2 23 36.5 24.3 36.5 26C36.5 27.7 35.2 29 33.5 29H30" stroke="#fde68a" strokeWidth="2.2" />
          <path d="M19 13V17M24 12V17" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'corridor':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#1e1b4b" stroke={accent} strokeWidth="1.8" />
          <path d="M24 11V37M14 24H34" stroke="#34d399" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="35" cy="14" r="4.5" fill="#f43f5e" />
        </svg>
      );
    case 'court':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#0f2942" stroke={accent} strokeWidth="1.8" />
          <circle cx="24" cy="24" r="11" fill="#ea580c" stroke="#fdba74" strokeWidth="2" />
          <path d="M13 24H35M24 13V35M17 16C21 20 21 28 17 32M31 16C27 20 27 28 31 32" stroke="#431407" strokeWidth="1.6" />
        </svg>
      );
  }
}

export function DeckCardBackSvg({
  deck,
  size = 44,
}: {
  deck: BoardGameDeckId;
  size?: number;
}) {
  const palette =
    deck === 'investigation'
      ? { bg: '#064e3b', border: '#10b981', glyph: '🔍' }
      : deck === 'equipment'
        ? { bg: '#0c4a6e', border: '#38bdf8', glyph: '🛡️' }
        : { bg: '#4c0519', border: '#f43f5e', glyph: '⚡' };
  const h = Math.round(size * 1.32);
  return (
    <div
      style={{
        width: size,
        height: h,
        backgroundColor: palette.bg,
        borderColor: palette.border,
      }}
      className="shrink-0 rounded-xl border-2 flex flex-col items-center justify-center shadow-md select-none"
      aria-hidden="true"
    >
      <span className="text-lg leading-none">{palette.glyph}</span>
    </div>
  );
}

export function DiceD6Svg({ value, size = 44 }: { value: number; size?: number }) {
  const v = Math.max(1, Math.min(6, Math.round(value)));
  const pips: Record<number, readonly [number, number][]> = {
    1: [[24, 24]],
    2: [
      [15, 15],
      [33, 33],
    ],
    3: [
      [15, 15],
      [24, 24],
      [33, 33],
    ],
    4: [
      [15, 15],
      [33, 15],
      [15, 33],
      [33, 33],
    ],
    5: [
      [15, 15],
      [33, 15],
      [24, 24],
      [15, 33],
      [33, 33],
    ],
    6: [
      [15, 13],
      [33, 13],
      [15, 24],
      [33, 24],
      [15, 35],
      [33, 35],
    ],
  };
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label={`1d6 ra ${v}`}>
      <rect x="3" y="3" width="42" height="42" rx="10" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2.5" />
      {(pips[v] ?? pips[1]).map(([cx, cy], idx) => (
        <circle key={idx} cx={cx} cy={cy} r="3.8" fill={v === 1 ? '#e11d48' : '#0f172a'} />
      ))}
    </svg>
  );
}

export function DiceD4Svg({ value, size = 44 }: { value: number; size?: number }) {
  const v = Math.max(1, Math.min(4, Math.round(value)));
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label={`1d4 ra ${v}`}>
      <polygon
        points="24,4 44,41 4,41"
        fill="#f59e0b"
        stroke="#fef3c7"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <text
        x="24"
        y="34"
        textAnchor="middle"
        fill="#1e1b4b"
        fontSize="18"
        fontWeight="900"
      >
        {v}
      </text>
    </svg>
  );
}

export function PlayerPawnToken({
  displayName,
  seatIndex,
  alive,
  isActive,
  isSelf,
  revealedFaction,
  compact = false,
}: {
  displayName: string;
  seatIndex: number;
  alive: boolean;
  isActive: boolean;
  isSelf: boolean;
  revealedFaction: BoardGameFactionId | null;
  compact?: boolean;
}) {
  const ringHex = SEAT_RING_PALETTE[seatIndex % SEAT_RING_PALETTE.length];
  const initial = displayName.trim().slice(0, 2).toUpperCase() || `P${seatIndex + 1}`;
  const sizeClass = compact ? 'w-7 h-7 text-[11px]' : 'w-9 h-9 text-xs';
  const factionBg =
    revealedFaction === 'lantern-guard'
      ? 'bg-emerald-700'
      : revealedFaction === 'mist-order'
        ? 'bg-rose-700'
        : revealedFaction === 'wanderer'
          ? 'bg-amber-700'
          : 'bg-slate-800';

  return (
    <div
      style={{ borderColor: alive ? ringHex : '#475569' }}
      className={`relative rounded-full border-2 ${sizeClass} ${factionBg} ${
        !alive ? 'opacity-45 grayscale' : ''
      } ${isActive ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-slate-950 scale-105' : ''} flex items-center justify-center font-black text-white shadow-md select-none transition-transform`}
      title={displayName}
    >
      <span>{alive ? initial : '✕'}</span>
      {isSelf && (
        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-slate-950" />
      )}
    </div>
  );
}
