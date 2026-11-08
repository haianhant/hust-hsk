// ---------------------------------------------------------------------------
// features/campus/world-data/bounds.ts — Biên thế giới, điểm xuất phát và chuẩn tỉ lệ
// Hệ trục tọa độ: đơn vị mét (m). +X = Đông (Trần Đại Nghĩa), -X = Tây (Giải Phóng),
// -Z = Bắc (Đại Cồ Việt), +Z = Nam (Tạ Quang Bửu / Lê Thanh Nghị). Mặt đất y = 0.
// ---------------------------------------------------------------------------

import {
  AVATAR,
  BIKE_MAX_SPEED,
  BIKE_PARK,
  BIKE_RADIUS,
  BOUNDS,
  SPAWN as SHARED_SPAWN,
  clampScalar,
  clampToWorldBounds,
  type AABB,
  type Vec2,
} from '../../../shared/constants/world';

export {
  AVATAR,
  BIKE_MAX_SPEED,
  BIKE_PARK,
  BIKE_RADIUS,
  BOUNDS,
  clampScalar,
  clampToWorldBounds,
  type AABB,
  type Vec2,
};

/** Điểm xuất phát mặc định ngay phía trong Cổng Parabol. */
export const SPAWN: Vec2 = { x: SHARED_SPAWN.x, z: SHARED_SPAWN.z };
