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
  { id: 'c1', name: 'Nhà C1', icon: '🏫', desc: 'Trước cửa phòng học', x: -58, z: -43.5, yaw: 0, facing: Math.PI },
  { id: 'library', name: 'Thư viện Tạ Quang Bửu', icon: '📚', desc: 'Sảnh chính phía bắc', x: 38, z: 12.5, yaw: Math.PI, facing: 0 },
  { id: 'lake', name: 'Hồ Tiền', icon: '🌊', desc: 'Bờ đông ven hồ', x: 24, z: 48, yaw: Math.PI / 2, facing: -Math.PI / 2 },
  { id: 'parabol', name: 'Cổng Parabol', icon: '⛩️', desc: 'Giữa cổng, nhìn vào trường', x: -88, z: -6, yaw: -Math.PI / 2, facing: Math.PI / 2 },
  { id: 'c9', name: 'Khu C9', icon: '🏢', desc: 'Trước cầu thang đỏ', x: -60, z: -17, yaw: Math.PI / 2, facing: -Math.PI / 2 },
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
      { x: -53.5, z: -17 },
      { x: -53.5, z: -34 },
      { x: -58, z: -36 },
    ],
  },
  {
    id: 'leg3',
    name: 'Quảng trường C1 → Thư viện',
    from: { x: -58, z: -36 },
    waypoints: [
      { x: -53.5, z: -34 },
      { x: -53.5, z: -6 },
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
