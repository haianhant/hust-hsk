// ---------------------------------------------------------------------------
// features/campus/world-data/roads.ts — Mạng lưới đường nội bộ (polyline) và
// hàng cây/ghế dọc trục chính theo Bản đồ Số chuẩn https://hustmap.com/.
// ---------------------------------------------------------------------------

import type { Vec2 } from './bounds';

export type RoadSpec = {
  name: string;
  points: Vec2[];
  width: number;
};

// Quy hoạch mạng lưới đường nội bộ khớp https://hustmap.com/:
// - Trục đường chính thẳng tắp Đông–Tây từ Cổng Trần Đại Nghĩa (x = 92, z = -6)
//   đi thẳng sang Cổng Parabol (x = -88, z = -6).
// - Các đường nhánh Bắc–Nam kết nối Quảng trường C1, Quảng trường ngã 5,
//   sảnh Tây Tòa C7 – Thư viện – Hồ Tiền và bãi xe giảng viên C7.
export const ROADS: RoadSpec[] = [
  {
    name: 'Trục chính Cổng Trần Đại Nghĩa – Cổng Parabol',
    width: 7.5,
    points: [
      { x: -88, z: -6 },
      { x: 114, z: -6 },
    ],
  },
  {
    name: 'Trục Quảng trường C1',
    width: 6,
    points: [
      { x: -58, z: -6 },
      { x: -58, z: -44 },
    ],
  },
  {
    name: 'Trục Quảng trường ngã 5 – Khu C',
    width: 5.2,
    points: [
      { x: -38, z: -6 },
      { x: -38, z: -28 },
    ],
  },
  {
    name: 'Đường nội bộ C7 – Thư viện – Hồ Tiền',
    width: 5.5,
    points: [
      { x: 24, z: -56 },
      { x: 24, z: -6 },
      { x: 24, z: 54 },
    ],
  },
  {
    name: 'Trục đường Bãi xe C7 (Đỗ ô tô giảng viên)',
    width: 6.2,
    points: [
      { x: 66, z: -6 },
      { x: 66, z: -52 },
    ],
  },
  {
    name: 'Lối vào Cổng Đại Cồ Việt – Bãi xe C1/C2',
    width: 5.6,
    points: [
      { x: -58, z: -74 },
      { x: -58, z: -63.5 },
    ],
  },
  {
    name: 'Đường nội bộ Bãi xe C1 – Bãi xe C2',
    width: 4.4,
    points: [
      { x: -58, z: -67.2 },
      { x: -81, z: -67.2 },
    ],
  },
  {
    name: 'Nhánh chéo Quảng trường ngã 5 – ITIMS',
    width: 4.6,
    points: [
      { x: -38, z: -16 },
      { x: -31, z: -27 },
    ],
  },
];

// Hàng cây dọc hai bên trục đường chính Cổng Trần Đại Nghĩa – Cổng Parabol (z = -6).
export const LOVE_ROAD_TREES: Vec2[] = [
  { x: -78, z: -10.8 }, { x: -78, z: -1.2 },
  { x: -46, z: -10.8 }, { x: -46, z: -1.2 },
  { x: -30, z: -10.8 }, { x: -30, z: -1.2 },
  { x: -14, z: -10.8 }, { x: -14, z: -1.2 },
  { x: 10, z: -10.8 }, { x: 10, z: -1.2 },
  { x: 54, z: -10.8 }, { x: 54, z: -1.2 },
];

export const LOVE_ROAD_BENCHES: Vec2[] = [
  { x: -38, z: -10.6 },
  { x: -22, z: -10.6 },
  { x: 16, z: -10.6 },
];
