// ---------------------------------------------------------------------------
// features/campus/world-data/library-spatial/floors.ts — Canonical Floor,
// Block, Base Elevation, and Spawn/Preset definitions for Tạ Quang Bửu Library.
// Zero React or Three.js dependencies.
// ---------------------------------------------------------------------------

import type {
  LibraryBlock,
  LibraryFloor,
  LibraryLocation,
  LibrarySpawnPoint,
} from './types';

export const LIBRARY_FLOORS: readonly LibraryFloor[] = [
  1, 2, 3, 4, 5, 6, 7, 10,
] as const;

export const LIBRARY_BLOCKS: readonly LibraryBlock[] = ['A', 'B', 'D'] as const;

export const BLOCK_A_FLOOR_HEIGHT = 4.5;
export const BLOCK_B_PLATFORM_Y = 0.6;
export const BLOCK_B_MEZZANINE_Y = 5.25;
export const BLOCK_D_STARGAZING_DECK_Y = 0.18;

const FLOOR_TO_BLOCK: Record<LibraryFloor, LibraryBlock> = {
  1: 'A',
  2: 'A',
  3: 'A',
  4: 'A',
  5: 'A',
  6: 'B',
  7: 'B',
  10: 'D',
};

const FLOOR_BASE_ELEVATION: Record<LibraryFloor, number> = {
  1: 0.0,
  2: 4.5,
  3: 9.0,
  4: 13.5,
  5: 18.0,
  6: 0.0,
  7: 5.25,
  10: 0.0,
};

export function isValidLibraryFloor(value: unknown): value is LibraryFloor {
  return (
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 4 ||
    value === 5 ||
    value === 6 ||
    value === 7 ||
    value === 10
  );
}

export function sanitizeLibraryFloor(
  value: unknown,
  fallback: LibraryFloor = 1,
): LibraryFloor {
  return isValidLibraryFloor(value) ? value : fallback;
}

export function getBlockForFloor(floor: LibraryFloor): LibraryBlock {
  return FLOOR_TO_BLOCK[floor];
}

/**
  * Returns the canonical base slab elevation in the floor's block coordinate space.
  * Note: Block B (Floors 6–7) and Block D (Floor 10) use independent local scene
  * coordinate spaces and MUST NOT inherit Block A's `(floor - 1) * 4.5` formula.
  */
export function getFloorBaseElevation(floor: LibraryFloor): number {
  return FLOOR_BASE_ELEVATION[floor];
}

export function createLibraryLocation(
  floor: LibraryFloor,
  x: number,
  z: number,
  y: number = getFloorBaseElevation(floor),
): LibraryLocation {
  return {
    block: getBlockForFloor(floor),
    floor,
    x,
    y,
    z,
  };
}

/**
 * Canonical navigation presets across Floors 1–10 shared by
 * `LibraryFloorNav.tsx`, `Player.tsx`, and spatial tests (single source of truth).
 */
export const LIBRARY_NAV_PRESETS: readonly LibrarySpawnPoint[] = [
  {
    id: 'f1-atrium',
    floor: 1,
    block: 'A',
    shortLabel: 'T1 · Đại sảnh',
    label: 'Tầng 1 — Đại sảnh Ngôi sao 16 cánh',
    fullLabel: 'Tầng 1 · Đại sảnh Ngôi sao 16 cánh',
    description: 'Bàn học nhóm PR8/PR9, Tượng GS. Tạ Quang Bửu, Bảng nhị phân 0/1 & Thang xoắn đôi',
    x: 0,
    y: 0.0,
    z: 2.4,
    yaw: 0,
    pitch: 0.2,
  },
  {
    id: 'f1-borrow',
    floor: 1,
    block: 'A',
    shortLabel: 'T1 · Phòng mượn',
    label: 'Tầng 1 — Phòng Mượn Giáo Trình (P.102)',
    fullLabel: 'Tầng 1 · Phòng Mượn Sách',
    description: 'Quầy thủ thư mượn trả giáo trình & 6 dãy kệ sách chuyên ngành',
    x: -21.9,
    y: 0.0,
    z: 1.8,
    yaw: Math.PI / 2,
    pitch: 0.18,
  },
  {
    id: 'f2-balcony',
    floor: 2,
    block: 'A',
    shortLabel: 'T2 · Tự học',
    label: 'Tầng 2 — Hành lang thông tầng & Đỉnh Thang xoắn',
    fullLabel: 'Tầng 2 · Hành lang thông tầng',
    description: 'Lan can kính nhìn xuống sảnh thông tầng Stadium & ghế sofa đọc sách',
    x: 14.8,
    y: 4.5,
    z: 0,
    yaw: Math.PI / 2,
    pitch: 0.22,
  },
  {
    id: 'f3-balcony',
    floor: 3,
    block: 'A',
    shortLabel: 'T3 · Hành lang',
    label: 'Tầng 3 — Hành lang đọc sách & Kệ sách mở',
    fullLabel: 'Tầng 3 · Hành lang đọc sách',
    description: 'Không gian học nhóm yên tĩnh quanh giếng trời tầng 3',
    x: 0,
    y: 9.0,
    z: -10.8,
    yaw: 0,
    pitch: 0.22,
  },
  {
    id: 'f4-r401',
    floor: 4,
    block: 'A',
    shortLabel: 'P.401 · Đọc tự do',
    label: 'Tầng 4 — Phòng đọc 401 (Sách Khoa học Kỹ thuật)',
    fullLabel: 'Tầng 4 · Phòng đọc 401 (144 chỗ + 17 PC)',
    description: '144 chỗ đọc sách, 17 máy tính tra cứu chữ L, 6 kệ sách đôi & Cổng xoay 3 chấu',
    x: -10.8,
    y: 13.5,
    z: -15.0,
    yaw: 0,
    pitch: 0.2,
  },
  {
    id: 'f4-r411',
    floor: 4,
    block: 'A',
    shortLabel: 'P.411 · Chuyên ngành',
    label: 'Tầng 4 — Phòng đọc chuyên ngành 411',
    fullLabel: 'Tầng 4 · Phòng đọc chuyên ngành 411',
    description: 'Phòng đọc chuyên ngành phía Nam tầng 4',
    x: 0,
    y: 13.5,
    z: 15.0,
    yaw: Math.PI,
    pitch: 0.2,
  },
  {
    id: 'f4-r419',
    floor: 4,
    block: 'A',
    shortLabel: 'P.419 · Đọc mở',
    label: 'Tầng 4 — Phòng tự học lớn 419 (Cánh Đông)',
    fullLabel: 'Tầng 4 · Phòng đọc mở 419',
    description: 'Phòng tự học sức chứa lớn với 10 bàn dài & giá sách tham khảo',
    x: 27.7,
    y: 13.5,
    z: -2.5,
    yaw: -Math.PI / 2,
    pitch: 0.2,
  },
  {
    id: 'f5-r501',
    floor: 5,
    block: 'A',
    shortLabel: 'P.501 · Học nhóm',
    label: 'Tầng 5 — Phòng học nhóm 501 (Luận văn & Báo tạp chí)',
    fullLabel: 'Tầng 5 · Phòng học nhóm 501',
    description: 'Phòng đọc chuyên khảo tầng 5 đồng bộ chuẩn kiến trúc TQB',
    x: 0,
    y: 18.0,
    z: -19.5,
    yaw: 0,
    pitch: 0.2,
  },
  {
    id: 'f6-lounge',
    floor: 6,
    block: 'B',
    shortLabel: 'T6 · Sáng tạo 🎹',
    label: 'Tầng 6 — Không gian Sáng tạo & Đại dương cầm',
    fullLabel: 'Tầng 6 · Không gian Sáng tạo & Đại dương cầm',
    description: 'Sàn gỗ nâng hình Stadium, Đảo thuyền cây xanh, Đàn Grand Piano & Quầy tròn cột phễu',
    x: -4.2,
    y: 0.6,
    z: 5.5,
    yaw: 0.55,
    pitch: 0.22,
  },
  {
    id: 'f7-mezz',
    floor: 7,
    block: 'B',
    shortLabel: 'T7 · Tầng lửng',
    label: 'Tầng 7 — Tầng lửng INNOVATE · CONNECT · CREATE',
    fullLabel: 'Tầng 7 · Tầng lửng INNOVATE · CONNECT · CREATE',
    description: 'Tầng lửng nhìn xuống không gian sáng tạo tầng 6, ghế beanbag & kệ sách sóng',
    x: 0,
    y: 5.25,
    z: 13.2,
    yaw: 0,
    pitch: 0.25,
  },
  {
    id: 'f10-rooftop',
    floor: 10,
    block: 'D',
    shortLabel: 'T10 · Sân thượng 🔭',
    label: 'Tầng 10 — Sân thượng Pergola & Đài ngắm sao',
    fullLabel: 'Tầng 10 · Sân thượng Pergola & Đài ngắm sao',
    description: 'Giàn hoa giấy Pergola, Đài ngắm sao gỗ nâng cao, Kính thiên văn khúc xạ & Bản đồ sao Hà Nội',
    x: 8.5,
    y: 0.0,
    z: -0.6,
    yaw: -Math.PI / 2,
    pitch: 0.16,
  },
] as const;

export const LIBRARY_PRESET_DESTINATIONS: readonly LibrarySpawnPoint[] = LIBRARY_NAV_PRESETS;

export const LIBRARY_FLOOR_SPAWNS: Record<LibraryFloor, LibrarySpawnPoint> = {
  1: LIBRARY_NAV_PRESETS[0], // f1-atrium (0, 0, 2.4)
  2: LIBRARY_NAV_PRESETS[2], // f2-balcony (14.8, 4.5, 0)
  3: LIBRARY_NAV_PRESETS[3], // f3-balcony (0, 9.0, -10.8)
  4: LIBRARY_NAV_PRESETS[4], // f4-r401 (-10.8, 13.5, -15.0)
  5: LIBRARY_NAV_PRESETS[7], // f5-r501 (0, 18.0, -19.5)
  6: LIBRARY_NAV_PRESETS[8], // f6-lounge (-4.2, 0.6, 5.5)
  7: LIBRARY_NAV_PRESETS[9], // f7-mezz (0, 5.25, 13.2)
  10: LIBRARY_NAV_PRESETS[10], // f10-rooftop (8.5, 0.0, -0.6)
};

export function getLibraryFloorSpawn(floor: LibraryFloor): LibrarySpawnPoint {
  return LIBRARY_FLOOR_SPAWNS[floor];
}
