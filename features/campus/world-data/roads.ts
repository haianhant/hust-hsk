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

// Quy hoạch mạng lưới đường nội bộ khớp https://hustmap.com/ & bộ ảnh tham-khao/NEW/ (yeucau4):
// - Từ Cổng Trần Đại Nghĩa (x = 92, z = -6) đi vào có 2 nhánh đường 1 chiều tách bởi dải phân cách cây xanh:
//   + Nhánh phải (z = -10.4): chiều đi vào (-X), sát mặt Nam tòa C7.
//   + Nhánh trái (z = -1.6): chiều đi ra (+X), sát mặt Bắc tòa D3.
// - Tại cuối tòa C7 & D3 (x = 59.5 -> 56.2, z = -6), 2 nhánh nhập làn thành 1 đại lộ chính rộng 8.2m
//   chạy thẳng sang Thư viện Tạ Quang Bửu, Tòa Cựu sinh viên Bách Khoa và Cổng Parabol (x = -88, z = -6),
//   đồng thời mở ngã tư rẽ phải (-Z: giữa C7 và Trường Vật liệu) & rẽ trái (+Z: dọc cụm D3, D5, D7, D9 & Thư viện).
export const ROADS: RoadSpec[] = [
  {
    name: 'Đại lộ chính sau nhập làn (C7/D3 – Thư viện – Cổng Parabol)',
    width: 8.2,
    points: [
      { x: -88, z: -6 },
      { x: 56.5, z: -6 },
    ],
  },
  {
    name: 'Nhánh phải Cổng Trần Đại Nghĩa (Chiều đi vào · Bên tòa C7)',
    width: 5.0,
    points: [
      { x: 94.5, z: -10.4 },
      { x: 60.2, z: -10.4 },
      { x: 56.2, z: -6 },
    ],
  },
  {
    name: 'Nhánh trái Cổng Trần Đại Nghĩa (Chiều đi ra · Bên tòa D3)',
    width: 5.0,
    points: [
      { x: 56.2, z: -6 },
      { x: 60.2, z: -1.6 },
      { x: 94.5, z: -1.6 },
    ],
  },
  {
    name: 'Đường nối Cổng Trần Đại Nghĩa – Phố Tạ Quang Bửu / B1',
    width: 6.4,
    points: [
      { x: 94.5, z: -6 },
      { x: 114, z: -6 },
    ],
  },
  {
    name: 'Trục rẽ phải cuối 2 nhánh (Tòa C7 – Trường Vật liệu – C6)',
    width: 5.4,
    points: [
      { x: 56.2, z: -6 },
      { x: 56.2, z: -58 },
    ],
  },
  {
    name: 'Trục rẽ trái cuối 2 nhánh (Cụm tòa D3, 5, 7, 9 & Thư viện TQB)',
    width: 5.2,
    points: [
      { x: 56.2, z: -6 },
      { x: 56.2, z: 62 },
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
    name: 'Đường nội bộ Khu C – Thư viện – Hồ Tiền',
    width: 5.5,
    points: [
      { x: 24, z: -56 },
      { x: 24, z: -6 },
      { x: 24, z: 54 },
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

// Hàng cây dọc hai bên đại lộ chính sau nhập làn (z = -6, vỉa hè ngoài biên đường 8.2m).
export const LOVE_ROAD_TREES: Vec2[] = [
  { x: -78, z: -11.0 }, { x: -78, z: -1.0 },
  { x: -46, z: -11.0 }, { x: -46, z: -1.0 },
  { x: -30, z: -11.0 }, { x: -30, z: -1.0 },
  { x: -14, z: -11.0 }, { x: -14, z: -1.0 },
  { x: 9.2, z: -11.0 }, { x: 5.2, z: -1.1 },
  { x: 34, z: -11.0 },
];

export const LOVE_ROAD_BENCHES: Vec2[] = [
  { x: -38, z: -10.9 },
  { x: -22, z: -10.9 },
  { x: 16, z: -10.9 },
];
