// ---------------------------------------------------------------------------
// features/avatar/appearance/presets.ts — Bảng màu chuẩn, kiểu dữ liệu Rig/Outfit
// và 10 mẫu đồng phục HUST (OUTFIT_PRESETS)
// Module IDs: avatar.rig, avatar.outfit.*
// ---------------------------------------------------------------------------

import type { RefObject } from 'react';
import type * as THREE from 'three';
import type {
  AvatarGender,
  AvatarHairStyle,
  AvatarOutfitId,
} from '../../../lib/playerState';

// --- Bảng màu chuẩn ----------------------------------------------------------
export const POLO_RED = '#DA1E26';
export const POLO_DARK = '#8F1418';
export const HUST_CRIMSON = '#B5121B';
export const HUST_CRIMSON_DARK = '#7F0D14';
export const WINDBREAKER_WHITE = '#F4F6F9';
export const BUTTON_DARK = '#5A0E12';
export const NAVY = '#1F3A5F';
export const NAVY_DARK = '#152A45';
export const KHAKI = '#8A7B5C';
export const SHIRT_WHITE = '#F5F5F0';
export const SHIRT_DARK = '#D8D5CC';
export const PANTS = '#232E3D';
export const SHOE_WHITE = '#F5F5F5';
export const SHOE_SOLE = '#222222';
export const SKIN = '#ECC39E';
export const SKIN_WARM = '#E3AF89';
export const HAIR = '#1B1918';
export const HAIR_HIGHLIGHT = '#2C2826';
export const PACK_BLACK = '#1F2226';
export const PACK_GRAY = '#5A5A52';
export const PACK_GRAY_LIGHT = '#6E6E66';
export const PACK_ZIP = '#4A4F55';
export const WHITE = '#F5F5F5';
export const SILVER = '#C0C0C0';
export const SOCK = '#E8E2D5';

export const AVATAR_COLORS = {
  NAVY,
  NAVY_DARK,
  KHAKI,
  PACK_GRAY,
  PACK_GRAY_LIGHT,
  SHIRT_WHITE,
  SHIRT_DARK,
};

export interface FigureJoints {
  body: RefObject<THREE.Group>;
  armL: RefObject<THREE.Group>;
  armR: RefObject<THREE.Group>;
  elbowL: RefObject<THREE.Group>;
  elbowR: RefObject<THREE.Group>;
  legL: RefObject<THREE.Group>;
  legR: RefObject<THREE.Group>;
  kneeL: RefObject<THREE.Group>;
  kneeR: RefObject<THREE.Group>;
  footL: RefObject<THREE.Group>;
  footR: RefObject<THREE.Group>;
}

export type FigureVariant =
  | 'polo'
  | 'hoodie'
  | 'shirt'
  | 'windbreaker'
  | 'bomber'
  | 'tshirt'
  | 'sweater';
export type HairStyle = AvatarHairStyle;

export interface FigureProps {
  variant: FigureVariant;
  gender?: AvatarGender;
  shirt: string;
  shirtDark: string;
  /** Màu mảng ngực trên/vai (dùng cho áo khoác gió HUST trắng–đỏ) */
  upperYokeColor?: string;
  /** Màu tay áo phối riêng (dùng cho áo Bomber HUST) */
  sleeveColor?: string;
  /** Bật chế độ chân váy xếp ly cho nhân vật Nữ (dùng màu skirtColor hoặc pants) */
  skirt?: boolean;
  /** Màu chân váy xếp ly (khi bật chế độ chân váy cho nhân vật Nữ) */
  skirtColor?: string;
  pants: string;
  shoe: string;
  shoeSole: string;
  hairStyle: HairStyle;
  glasses?: boolean;
  lanyard?: boolean;
  wristwatch?: boolean;
  cap?: string;
  backpack?: boolean;
  backpackColors?: { pack: string; packLight: string; packZip: string };
  joints?: FigureJoints;
  showBackpack?: boolean;
}

export interface StudentAvatarProps {
  joints: FigureJoints;
  showBackpack?: boolean;
  gender?: AvatarGender;
  hairStyle?: AvatarHairStyle;
  outfit?: AvatarOutfitId;
  skirt?: boolean;
  glasses?: boolean;
  lanyard?: boolean;
}

export const OUTFIT_PRESETS: Record<
  AvatarOutfitId,
  {
    label: string;
    desc: string;
    variant: FigureVariant;
    shirt: string;
    shirtDark: string;
    upperYokeColor?: string;
    sleeveColor?: string;
    defaultSkirtColor?: string;
    pants: string;
    shoe: string;
    shoeSole: string;
  }
> = {
  'windbreaker-hust': {
    label: 'Áo khoác gió HUST',
    desc: 'Đồng phục chính thức ĐHBK Hà Nội (Trắng – Đỏ)',
    variant: 'windbreaker',
    shirt: HUST_CRIMSON,
    shirtDark: HUST_CRIMSON_DARK,
    upperYokeColor: WINDBREAKER_WHITE,
    defaultSkirtColor: '#1E293B',
    pants: '#1E293B',
    shoe: SHOE_WHITE,
    shoeSole: SHOE_SOLE,
  },
  'bomber-red-grey': {
    label: 'Bomber HUST Đỏ – Ghi',
    desc: 'Thân đỏ Bách khoa, tay ghi sáng, bo cổ kẻ sọc',
    variant: 'bomber',
    shirt: '#9E1B22',
    shirtDark: '#6E1117',
    sleeveColor: '#D8DCE3',
    defaultSkirtColor: '#1E293B',
    pants: '#1E293B',
    shoe: SHOE_WHITE,
    shoeSole: SHOE_SOLE,
  },
  'bomber-navy-white': {
    label: 'Bomber HUST Xanh – Trắng',
    desc: 'Thân xanh tím than, tay trắng kem năng động',
    variant: 'bomber',
    shirt: '#1B2A4A',
    shirtDark: '#111C33',
    sleeveColor: '#F1F5F9',
    defaultSkirtColor: '#F8FAFC',
    pants: '#1E2430',
    shoe: SHOE_WHITE,
    shoeSole: SHOE_SOLE,
  },
  'bomber-red-navy': {
    label: 'Bomber HUST Đỏ – Xanh',
    desc: 'Thân đỏ Bách khoa, tay xanh navy đậm',
    variant: 'bomber',
    shirt: '#A6192E',
    shirtDark: '#75101F',
    sleeveColor: '#18243E',
    defaultSkirtColor: '#18243E',
    pants: '#1E293B',
    shoe: SHOE_WHITE,
    shoeSole: SHOE_SOLE,
  },
  'polo-red': {
    label: 'Áo Polo Đỏ HUST',
    desc: 'Áo thun cổ bẻ đỏ tươi Bách khoa',
    variant: 'polo',
    shirt: POLO_RED,
    shirtDark: POLO_DARK,
    defaultSkirtColor: '#1E293B',
    pants: PANTS,
    shoe: SHOE_WHITE,
    shoeSole: SHOE_SOLE,
  },
  'hoodie-hust': {
    label: 'Áo Hoodie Đỏ BK',
    desc: 'Áo nỉ có mũ BST Thu-Đông Bách khoa',
    variant: 'hoodie',
    shirt: '#B81D24',
    shirtDark: '#7F1217',
    defaultSkirtColor: '#1E293B',
    pants: '#1E293B',
    shoe: SHOE_WHITE,
    shoeSole: SHOE_SOLE,
  },
  'tshirt-navy': {
    label: 'Áo phông Xanh HUST',
    desc: 'Áo phông xanh tím than chữ HUST trắng lớn (phối chân váy trắng ở Nữ)',
    variant: 'tshirt',
    shirt: '#1B2A4A',
    shirtDark: '#111C33',
    defaultSkirtColor: '#F8FAFC',
    pants: '#E2E8F0',
    shoe: SHOE_WHITE,
    shoeSole: SHOE_SOLE,
  },
  'sweater-cream': {
    label: 'Sweater Kem Thu-Đông',
    desc: 'Áo nỉ cổ tròn màu kem phối bo đỏ Bách khoa (BST Thu-Đông)',
    variant: 'sweater',
    shirt: '#F3EFE6',
    shirtDark: '#9E1B22',
    defaultSkirtColor: '#1E293B',
    pants: '#1E293B',
    shoe: SHOE_WHITE,
    shoeSole: SHOE_SOLE,
  },
  'shirt-white': {
    label: 'Áo Sơ mi Trắng',
    desc: 'Sơ mi thanh lịch (phối chân váy đen ở Nữ / quần âu ở Nam)',
    variant: 'shirt',
    shirt: SHIRT_WHITE,
    shirtDark: SHIRT_DARK,
    defaultSkirtColor: '#1E293B',
    pants: '#1F2937',
    shoe: '#2B2623',
    shoeSole: '#141210',
  },
  'sport-pe': {
    label: 'Đồ Thể chất HUST',
    desc: 'Trang phục Giáo dục thể chất xanh Bách khoa',
    variant: 'polo',
    shirt: '#1D4ED8',
    shirtDark: '#1E3A8A',
    defaultSkirtColor: '#F8FAFC',
    pants: '#172554',
    shoe: SHOE_WHITE,
    shoeSole: SHOE_SOLE,
  },
};
