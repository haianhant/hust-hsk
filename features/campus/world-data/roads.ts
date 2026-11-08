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

// Bước 3: đường C1–Thư viện đi vòng ĐÔNG hồ (x = 24, ven bờ đông) thay vì cắt
// chéo qua đầu bắc hồ; đường tình yêu dời xuống z = −16 (đi vòng bắc hồ, không
// cắt qua hồ và không trùng đường chính Parabol–C1).
export const ROADS: RoadSpec[] = [
  {
    name: 'Đường chính Parabol – C9 – C1',
    width: 6,
    points: [
      { x: -84, z: 10 },
      { x: -54, z: 10 },
      { x: -54, z: -34 },
      { x: -58, z: -38 },
    ],
  },
  {
    name: 'Đường C1 – Thư viện',
    width: 6,
    points: [
      { x: -58, z: -34 },
      { x: 24, z: -20 },
      // Đợt 3: kéo điểm cuối từ (24, 28) lên phía bắc tới (24, 18) — đường chạm
      // mép bắc sân trước cửa mới (plaza minZ 10 từ đợt 4); từ đây đi bộ qua sân vào sảnh mới.
      { x: 24, z: 18 },
    ],
  },
  {
    name: 'Đường Thư viện – Hồ Tiền',
    width: 5,
    points: [
      // Đợt 3: đổi đầu đường theo điểm cuối mới của đường C1 – Thư viện (24, 18);
      // đoạn x = 24 chạy dọc bờ đông hồ, ngoài footprint thư viện mới.
      { x: 24, z: 18 },
      { x: 24, z: 46 },
    ],
  },
  {
    name: 'Đường tình yêu',
    width: 5,
    points: [
      { x: -58, z: 10 },
      { x: -58, z: -16 },
      { x: 60, z: -16 },
      { x: 84, z: -6 },
      { x: 98, z: -6 },
    ],
  },
];

// Cây + ghế dọc đường tình yêu (không dùng để che lỗi hình khối).
export const LOVE_ROAD_TREES: Vec2[] = [
  { x: -44, z: -19.5 }, { x: -44, z: -12.5 },
  { x: -20, z: -19.5 }, { x: -20, z: -12.5 },
  { x: 4, z: -19.5 }, { x: 4, z: -12.5 },
  { x: 28, z: -19.5 }, { x: 28, z: -12.5 },
  { x: 52, z: -19.5 }, { x: 52, z: -12.5 },
];

export const LOVE_ROAD_BENCHES: Vec2[] = [
  { x: -30, z: -13 }, { x: 20, z: -13 }, { x: 70, z: -13 },
];
