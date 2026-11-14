// ---------------------------------------------------------------------------
// features/campus/world-data/navigation.ts — Các điểm Dịch chuyển nhanh
// (FAST_TRAVEL_DESTINATIONS) và các chặng kiểm thử điều hướng (LEGS).
// ---------------------------------------------------------------------------

import { SPAWN, type Vec2 } from './bounds';

// --- Dịch chuyển nhanh (đợt 3 giai đoạn 5) ----------------------------------
// 6 điểm đến mở ngay từ đầu, lấy từ địa điểm thật trong game. Mỗi điểm:
// pos = điểm đứng AN TOÀN ngoài công trình (đã kiểm bằng resolveCollisions
// với bán kính avatar 0,4 m — đặt vào thì resolve trả về đúng điểm đó,
// hit = null); yaw = góc camera (hướng nhìn = (−sin yaw, −cos yaw));
// facing = hướng mặt avatar (atan2(dirX, dirZ)).
export type FastTravelDestination = {
  id: string;
  name: string;
  icon: string;
  desc: string;
  x: number;
  z: number;
  /** góc camera sau khi tới (radian) */
  yaw: number;
  /** hướng mặt avatar sau khi tới (radian, atan2(dirX, dirZ)) */
  facing: number;
};

export const FAST_TRAVEL_DESTINATIONS: FastTravelDestination[] = [
  { id: 'c7', name: 'Tòa C7 (Học HSK)', icon: '🎓', desc: 'Giảng đường chữ E · Học HSK theo bài', x: 54.8, z: -32.8, yaw: -Math.PI / 2, facing: Math.PI / 2 },
  { id: 'library', name: 'Thư viện Tạ Quang Bửu', icon: '📚', desc: 'Tự học Pomodoro · Piano · Sân thượng', x: 38, z: 12.2, yaw: Math.PI, facing: 0 },
  { id: 'c1', name: 'Nhà C1', icon: '🏫', desc: 'Phòng Truyền thống & I ❤ BK', x: -58, z: -43.2, yaw: 0, facing: Math.PI },
  { id: 'b1', name: 'Nhà B1 (SoICT)', icon: '💻', desc: 'Sân trước & Phòng Lab Thuật ngữ CNTT & AI', x: 115.5, z: 1.8, yaw: Math.PI, facing: 0 },
  { id: 'lake', name: 'Hồ Tiền', icon: '🌊', desc: 'Bờ đông ven hồ & nhạc Lofi', x: 24, z: 48, yaw: Math.PI / 2, facing: -Math.PI / 2 },
  { id: 'parabol', name: 'Cổng Parabol', icon: '⛩️', desc: 'Biểu tượng kiến trúc Giải Phóng', x: -88, z: -6, yaw: -Math.PI / 2, facing: Math.PI / 2 },
  { id: 'c9', name: 'Khu C9', icon: '🏢', desc: 'Trước cầu thang đỏ zic-zac', x: -60, z: -17, yaw: Math.PI / 2, facing: -Math.PI / 2 },
  { id: 'ktx', name: 'Khu KTX B8–B9', icon: '🏘️', desc: 'Đời sống nội trú, Căng tin B5-9 & CLB Board Game', x: 112.5, z: -45, yaw: -Math.PI / 2, facing: Math.PI / 2 },
  { id: 'stadium', name: 'SVĐ Bách Khoa', icon: '⚽', desc: 'Sân bóng đá tương tác & Khu thể thao', x: 132, z: 73.2, yaw: Math.PI, facing: 0 },
  { id: 'spawn', name: 'Điểm bắt đầu', icon: '📍', desc: 'Cổng Trần Đại Nghĩa', x: SPAWN.x, z: SPAWN.z, yaw: Math.PI / 2, facing: -Math.PI / 2 },
];

export function getFastTravelDestination(id: string): FastTravelDestination | undefined {
  return FAST_TRAVEL_DESTINATIONS.find((d) => d.id === id);
}

// --- Chặng kiểm tra Bước 2–3 (một chặng một đích, điểm bắt đầu cố định) -----
export type Leg = {
  id: string;
  name: string;
  from: Vec2;
  waypoints: Vec2[];
};

export const LEGS: Leg[] = [
  {
    id: 'leg1',
    name: 'Cổng Parabol → Nhà C9',
    from: { x: -76, z: -6 },
    waypoints: [
      { x: -60, z: -6 },
      { x: -60, z: -17 },
    ],
  },
  {
    id: 'leg2',
    name: 'Nhà C9 → Quảng trường C1',
    from: { x: -60, z: -17 },
    waypoints: [
      { x: -50.6, z: -17 },
      { x: -50.6, z: -34.5 },
      { x: -58, z: -36.4 },
    ],
  },
  {
    id: 'leg3',
    name: 'Quảng trường C1 → Thư viện',
    from: { x: -58, z: -36.4 },
    waypoints: [
      { x: -50.6, z: -34.5 },
      { x: -50.6, z: -6 },
      { x: 24, z: -6 },
      { x: 24, z: 28 },
    ],
  },
  {
    id: 'leg4',
    name: 'Thư viện → Bờ Hồ Tiền',
    from: { x: 24, z: 28 },
    waypoints: [
      { x: 24, z: 48 },
      { x: 23, z: 54 },
    ],
  },
];
