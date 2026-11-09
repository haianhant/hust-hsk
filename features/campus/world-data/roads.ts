// ---------------------------------------------------------------------------
// features/campus/world-data/roads.ts — Mạng lưới đường nội bộ (polyline) và
// hàng cây/ghế dọc Đường Tình Yêu.
// ---------------------------------------------------------------------------

import type { Vec2 } from './bounds';

export type RoadSpec = {
  name: string;
  points: Vec2[];
  width: number;
};

// Quy hoạch lại mạng lưới đường nội bộ:
// - Duy nhất 1 trục đường chính thẳng tắp Đông–Tây từ Cổng Trần Đại Nghĩa (x = 92, z = -6)
//   đi thẳng sang Cổng Parabol (x = -88, z = -6).
// - Các đường nhánh vuông góc sạch sẽ, không chồng chéo hay cắt chéo nhau.
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
    name: 'Đường Thư viện – Hồ Tiền',
    width: 5.5,
    points: [
      { x: 24, z: -6 },
      { x: 24, z: 54 },
    ],
  },
  {
    name: 'Trục đường C7 (Đỗ ô tô giảng viên)',
    width: 6.5,
    points: [
      { x: 66, z: -6 },
      { x: 66, z: -50 },
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
