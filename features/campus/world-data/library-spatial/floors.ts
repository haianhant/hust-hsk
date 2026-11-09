// ---------------------------------------------------------------------------
// features/campus/world-data/library-spatial/floors.ts — Canonical Floor,
// Block, Base Elevation, and Spawn definitions for Tạ Quang Bửu Library.
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
 * Canonical navigation presets (11 destinations across Floors 1–10) shared by
 * `LibraryFloorNav.tsx`, `Player.tsx`, and spatial tests.
 */
export const LIBRARY_NAV_PRESETS: readonly LibrarySpawnPoint[] = [
  {
    id: 'f1-lobby',
    floor: 1,
    block: 'A',
    shortLabel: 'T1 · Sảnh',
    label: 'Tầng 1 — Sảnh chính Thông tầng',
    description: 'Bàn học nhóm PR8/PR9, Tượng GS. Tạ Quang Bửu, Bảng nhị phân 0/1 & Thang xoắn đôi',
    x: 0,
    y: 0.0,
    z: 5.2,
    yaw: Math.PI,
    pitch: 0.05,
  },
  {
    id: 'f1-borrow',
    floor: 1,
    block: 'A',
    shortLabel: 'T1 · Mượn sách',
    label: 'Tầng 1 — Phòng Mượn Giáo Trình (P.102)',
    description: 'Quầy thủ thư mượn trả giáo trình & 6 dãy kệ sách chuyên ngành',
    x: -22.2,
    y: 0.0,
    z: 1.8,
    yaw: -Math.PI / 2,
    pitch: 0,
  },
  {
    id: 'f2-balcony',
    floor: 2,
    block: 'A',
    shortLabel: 'T2 · Hành lang',
    label: 'Tầng 2 — Hành lang Ban công & Đỉnh Thang xoắn',
    description: 'Lan can kính nhìn xuống sảnh thông tầng Stadium & ghế sofa đọc sách',
    x: 0,
    y: 4.5,
    z: 9.8,
    yaw: Math.PI,
    pitch: -0.1,
  },
  {
    id: 'f3-balcony',
    floor: 3,
    block: 'A',
    shortLabel: 'T3 · Tự học',
    label: 'Tầng 3 — Hành lang Tự học & Kệ sách mở',
    description: 'Không gian học nhóm yên tĩnh quanh giếng trời tầng 3',
    x: -15.6,
    y: 9.0,
    z: 0,
    yaw: -Math.PI / 2,
    pitch: -0.08,
  },
  {
    id: 'f4-corridor',
    floor: 4,
    block: 'A',
    shortLabel: 'T4 · Sảnh',
    label: 'Tầng 4 — Hành lang Các Phòng Đọc',
    description: 'Lối vào Phòng 401, 402, 404, 411, 418, 419',
    x: -10.8,
    y: 13.5,
    z: -11.2,
    yaw: Math.PI,
    pitch: 0,
  },
  {
    id: 'f4-r401',
    floor: 4,
    block: 'A',
    shortLabel: 'P.401',
    label: 'Tầng 4 — Phòng đọc 401 (Sách Khoa học Kỹ thuật)',
    description: '144 chỗ đọc sách, 17 máy tính tra cứu chữ L, 6 kệ sách đôi & Cổng xoay 3 chấu',
    x: -10.8,
    y: 13.5,
    z: -15.0,
    yaw: Math.PI,
    pitch: 0,
  },
  {
    id: 'f4-r419',
    floor: 4,
    block: 'A',
    shortLabel: 'P.419',
    label: 'Tầng 4 — Phòng tự học lớn 419 (Cánh Đông)',
    description: 'Phòng tự học sức chứa lớn với 10 bàn dài & giá sách tham khảo',
    x: 27.7,
    y: 13.5,
    z: -2.5,
    yaw: -Math.PI / 2,
    pitch: 0,
  },
  {
    id: 'f5-r501',
    floor: 5,
    block: 'A',
    shortLabel: 'P.501',
    label: 'Tầng 5 — Phòng đọc 501 (Luận văn & Báo tạp chí)',
    description: 'Phòng đọc chuyên khảo tầng 5 đồng bộ chuẩn kiến trúc TQB',
    x: 0,
    y: 18.0,
    z: -19.5,
    yaw: Math.PI,
    pitch: 0,
  },
  {
    id: 'f5-r526',
    floor: 5,
    block: 'A',
    shortLabel: 'P.526',
    label: 'Tầng 5 — Phòng tự học 526 (Cánh Đông)',
    description: 'Không gian tự học yên tĩnh tầng 5',
    x: 27.7,
    y: 18.0,
    z: -2.5,
    yaw: -Math.PI / 2,
    pitch: 0,
  },
  {
    id: 'f6-creative',
    floor: 6,
    block: 'B',
    shortLabel: 'T6 · Sáng tạo',
    label: 'Tầng 6 — Không gian Sáng tạo & Triển lãm',
    description: 'Sàn gỗ nâng hình Stadium, Đảo thuyền cây xanh, Đàn Grand Piano & Quầy tròn cột phễu',
    x: 0,
    y: 0.6,
    z: 6.2,
    yaw: Math.PI,
    pitch: 0,
  },
  {
    id: 'f7-mezz',
    floor: 7,
    block: 'B',
    shortLabel: 'T7 · Gác lửng',
    label: 'Tầng 7 — Gác lửng Không gian Xanh & Ghế Lười',
    description: 'Tầng lửng nhìn xuống không gian sáng tạo tầng 6, ghế beanbag & kệ sách sóng',
    x: 0,
    y: 5.25,
    z: 13.8,
    yaw: Math.PI,
    pitch: -0.15,
  },
  {
    id: 'f10-rooftop',
    floor: 10,
    block: 'D',
    shortLabel: 'T10 · Sân thượng',
    label: 'Tầng 10 — Vườn Thượng Uyển & Đài Quan Sát Sao',
    description: 'Giàn hoa giấy Pergola, Đài ngắm sao gỗ nâng cao, Kính thiên văn khúc xạ & Bản đồ sao Hà Nội',
    x: 0,
    y: 0.0,
    z: 1.5,
    yaw: 0,
    pitch: 0,
  },
] as const;

export const LIBRARY_FLOOR_SPAWNS: Record<LibraryFloor, LibrarySpawnPoint> = {
  1: LIBRARY_NAV_PRESETS[0], // f1-lobby (0, 0, 5.2)
  2: LIBRARY_NAV_PRESETS[2], // f2-balcony (0, 4.5, 9.8)
  3: LIBRARY_NAV_PRESETS[3], // f3-balcony (-15.6, 9.0, 0)
  4: LIBRARY_NAV_PRESETS[4], // f4-corridor (-10.8, 13.5, -11.2)
  5: LIBRARY_NAV_PRESETS[7], // f5-r501 (0, 18.0, -19.5)
  6: LIBRARY_NAV_PRESETS[9], // f6-creative (0, 0.6, 6.2)
  7: LIBRARY_NAV_PRESETS[10], // f7-mezz (0, 5.25, 13.8)
  10: LIBRARY_NAV_PRESETS[11], // f10-rooftop (0, 0.0, 1.5)
};

export function getLibraryFloorSpawn(floor: LibraryFloor): LibrarySpawnPoint {
  return LIBRARY_FLOOR_SPAWNS[floor];
}
