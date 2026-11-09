// ---------------------------------------------------------------------------
// features/campus/world-data/spatial-utils.ts — Các hàm không gian thuần túy
// (pure spatial functions): kiểm tra lòng hồ, giải quyết va chạm 2D cho người
// đi bộ / phòng học / sảnh thư viện / xe máy, tìm điểm đường gần nhất và tìm
// vị trí trống để gọi xe máy.
// ---------------------------------------------------------------------------

import { BIKE_RADIUS, BOUNDS, type AABB, type Vec2 } from './bounds';
import { CLASSROOM, LAKE, LIBRARY_LOBBY } from './buildings';
import {
  BUILDING_COLLIDERS,
  CLASSROOM_COLLIDERS,
  LIBRARY_LOBBY_COLLIDERS,
  NPC_CIRCLES,
  TREE_TRUNKS,
  type NamedCollider,
} from './colliders';
import { ROADS } from './roads';
import { resolveCanonicalLibraryPointCollision } from './library-spatial';

/** Điểm có nằm trong lòng Hồ Tiền (hình chữ nhật) không. `margin` thu hẹp hồ
 *  lại — dùng bán kính avatar khi kiểm tra va chạm. */
export function pointInLake(p: Vec2, margin = 0): boolean {
  return (
    Math.abs(p.x - LAKE.center.x) < LAKE.halfW - margin &&
    Math.abs(p.z - LAKE.center.z) < LAKE.halfL - margin
  );
}

/**
 * Đẩy vị trí `p` (bán kính `radius`) ra khỏi biên `bounds` và danh sách hộp AABB `colliders`.
 * Hàm thuần dùng chung cho sân trường, phòng học và sảnh thư viện.
 */
export function resolveAabbCollisions(
  p: Vec2,
  radius: number,
  bounds: AABB,
  colliders: readonly NamedCollider[],
): { pos: Vec2; hit: string | null } {
  let { x, z } = p;
  let hit: string | null = null;
  x = Math.min(Math.max(x, bounds.minX), bounds.maxX);
  z = Math.min(Math.max(z, bounds.minZ), bounds.maxZ);
  for (const c of colliders) {
    const b = c.box;
    const cx = Math.min(Math.max(x, b.minX), b.maxX);
    const cz = Math.min(Math.max(z, b.minZ), b.maxZ);
    const dx = x - cx;
    const dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * radius;
        z = cz + (dz / d) * radius;
      } else {
        // Tâm nằm trong hộp: đẩy ra theo cạnh gần nhất.
        const dl = x - (b.minX - radius);
        const dr = b.maxX + radius - x;
        const dt = z - (b.minZ - radius);
        const db = b.maxZ + radius - z;
        const m = Math.min(dl, dr, dt, db);
        if (m === dl) x = b.minX - radius;
        else if (m === dr) x = b.maxX + radius;
        else if (m === dt) z = b.minZ - radius;
        else z = b.maxZ + radius;
      }
      hit = c.name;
    }
  }
  return { pos: { x, z }, hit };
}

/** Đẩy vị trí ra khỏi mọi collider sân trường (AABB + Hồ Tiền + Thân cây + NPC + biên campus).
 *  Trả về vị trí đã sửa + tên vật cản (nếu có). */
export function resolveCollisions(p: Vec2, radius: number): { pos: Vec2; hit: string | null } {
  const base = resolveAabbCollisions(p, radius, BOUNDS, BUILDING_COLLIDERS);
  let { x, z } = base.pos;
  let hit = base.hit;

  // Hồ: đẩy ra khỏi hình chữ nhật (theo cạnh gần nhất; đúng tâm hồ thì đẩy về đông).
  if (pointInLake({ x, z }, radius)) {
    const dE = LAKE.center.x + LAKE.halfW - x;
    const dW = x - (LAKE.center.x - LAKE.halfW);
    const dS = LAKE.center.z + LAKE.halfL - z;
    const dN = z - (LAKE.center.z - LAKE.halfL);
    const m = Math.min(dE, dW, dS, dN);
    if (m === dE) x = LAKE.center.x + LAKE.halfW + radius * 0.5;
    else if (m === dW) x = LAKE.center.x - LAKE.halfW - radius * 0.5;
    else if (m === dS) z = LAKE.center.z + LAKE.halfL + radius * 0.5;
    else z = LAKE.center.z - LAKE.halfL - radius * 0.5;
    hit = 'Hồ Tiền';
  }

  // Đẩy ra khỏi thân cây (r = 0.3m) và NPC đứng/ngồi tĩnh trong sân trường để không đi xuyên qua cây và người khác
  const pushOutCircle = (cx: number, cz: number, r: number, name: string) => {
    const dx = x - cx;
    const dz = z - cz;
    const d = Math.hypot(dx, dz);
    const min = r + radius;
    if (d < min) {
      if (d > 1e-9) {
        x = cx + (dx / d) * min;
        z = cz + (dz / d) * min;
      } else {
        x = cx + min;
      }
      hit = name;
    }
  };
  for (const t of TREE_TRUNKS) pushOutCircle(t.x, t.z, 0.3, 'Thân cây');
  for (const n of NPC_CIRCLES) pushOutCircle(n.pos.x, n.pos.z, n.radius, n.name ?? 'Minh (NPC)');

  return { pos: { x, z }, hit };
}

/** Đẩy tọa độ `(x, z)` ra khỏi hình tròn `center` bán kính `obstacleRadius` (trả về `null` nếu không va chạm). */
export function pushOutOfCircle(
  x: number,
  z: number,
  center: Vec2,
  obstacleRadius: number,
  playerRadius: number,
): Vec2 | null {
  const dx = x - center.x;
  const dz = z - center.z;
  const d = Math.hypot(dx, dz);
  const min = obstacleRadius + playerRadius;
  if (d >= min) return null;
  if (d > 1e-9) {
    return { x: center.x + (dx / d) * min, z: center.z + (dz / d) * min };
  }
  return { x: center.x + min, z: center.z };
}

/**
 * Tính cao độ mặt sàn ngoài trời (Y) tại tọa độ `(x, z)` để khi người chơi
 * bước lên bậc tam cấp và hiên sảnh Thư viện Tạ Quang Bửu (z = 16.8..23.6, x = 31..45)
 * nhân vật bước LÊN trên mặt bậc thang thay vì đi xuyên qua bậc thang.
 */
export function getCampusGroundElevation(x: number, z: number): number {
  // Bậc tam cấp & hiên sảnh chính Thư viện Tạ Quang Bửu (x: 31.0..45.0, z: 16.8..23.6)
  if (x >= 31.0 && x <= 45.0 && z >= 16.8 && z <= 23.6) {
    if (z >= 19.0) return 0.6;
    const t = Math.max(0, Math.min(1, (z - 16.8) / (19.0 - 16.8)));
    return t * 0.6;
  }
  return 0;
}

/** Đẩy vị trí ra khỏi collider phòng học + biên phòng. */
export function resolveClassroomCollisions(
  p: Vec2,
  radius: number,
): { pos: Vec2; hit: string | null } {
  return resolveAabbCollisions(p, radius, CLASSROOM.bounds, CLASSROOM_COLLIDERS);
}

/** Đẩy vị trí ra khỏi collider Sảnh tầng 1–10 Thư viện + biên từng tầng. */
export function resolveLibraryLobbyCollisions(
  p: Vec2,
  radius: number,
  floor = 1,
): { pos: Vec2; hit: string | null } {
  return resolveCanonicalLibraryPointCollision(p, radius, floor);
}

/** Va chạm cho XE MÁY: resolveCollisions (nhà/hồ/bờ kè/biên/thân cây/NPC).
 *  Trả về vị trí đã sửa + tên vật cản (nếu có). */
export function resolveBikeCollisions(
  p: Vec2,
  radius: number,
): { pos: Vec2; hit: string | null } {
  return resolveCollisions(p, radius);
}

/** Điểm trên đường gần nhất (tính trên các đoạn polyline ROADS). */
export function nearestRoadPoint(p: Vec2): Vec2 {
  let best: Vec2 = { ...ROADS[0].points[0] };
  let bestD = Infinity;
  for (const road of ROADS) {
    for (let i = 0; i + 1 < road.points.length; i++) {
      const a = road.points[i];
      const b = road.points[i + 1];
      const abx = b.x - a.x;
      const abz = b.z - a.z;
      const len2 = abx * abx + abz * abz;
      const t =
        len2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * abx + (p.z - a.z) * abz) / len2));
      const q = { x: a.x + abx * t, z: a.z + abz * t };
      const d = Math.hypot(p.x - q.x, p.z - q.z);
      if (d < bestD) {
        bestD = d;
        best = q;
      }
    }
  }
  return best;
}

/** Tìm điểm trống hợp lệ gần `center`: thử các vòng tròn bán kính tăng dần
 *  (8 hướng/vòng). Điểm hợp lệ = resolveBikeCollisions không va chạm.
 *  Trả null nếu không tìm được trong maxR (hiếm — campus rộng). */
export function findFreeSpotNear(center: Vec2, minR: number, maxR: number): Vec2 | null {
  for (let r = minR; r <= maxR + 1e-9; r += 1.5) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const cand = { x: center.x + Math.cos(a) * r, z: center.z + Math.sin(a) * r };
      const { pos, hit } = resolveBikeCollisions(cand, BIKE_RADIUS);
      if (hit === null && Math.hypot(pos.x - cand.x, pos.z - cand.z) < 0.01) return cand;
    }
  }
  return null;
}
