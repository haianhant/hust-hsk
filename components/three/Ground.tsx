// ---------------------------------------------------------------------------
// Ground.tsx — mặt đất, đường đi, sàn quảng trường (Bước 2, blockout)
// MÀU TẠM, trung tính: màu sơn thật của campus chưa xác minh (xem
// docs/campus-reference.md) nên mọi màu ở đây chỉ để phân biệt khối.
// Mọi số đo lấy từ lib/campus.ts (source of truth duy nhất).
//
// Chống z-fighting (theo skill web_3d_scene_test_and_scale_audit: nền nối
// liên tục, mép sạch): các lớp cách nhau ≥ 0,01 m theo trục Y:
//   cỏ y = 0  →  quảng trường y = 0,015  →  đường y = 0,02  →  đĩa nối y = 0,03.
// Đường KHÔNG vẽ đè lên quảng trường: mỗi đoạn đường được cắt (Liang–Barsky)
// bỏ phần nằm trong hình chữ nhật quảng trường, vì trong quảng trường thì
// chính sàn quảng trường là mặt đi. Nhờ vậy không có hai mặt phẳng nào chồng
// nhau ở cùng một độ cao. Các đoạn đường cũng được rút ngắn w/2 ở đầu nối
// trong polyline và nối bằng một đĩa tròn tại nút giao, để hai hình chữ nhật
// kề nhau không chồng lấn gây z-fighting.
//
// Đợt sửa kiến trúc ngoại thất §6/§8 (hồ + sân + đường): thêm mạch lát ô
// vuông trên sân C1 và 2 bồn cỏ hai bên bậc tam cấp C1. Cây toàn campus
// KHÔNG render ở đây — cây (đường tình yêu, Lipa C1, liễu Hồ Tiền) nằm
// trong Landmarks.tsx / TienLake.tsx; thêm cây vào Ground sẽ TRÙNG cây
// (cùng vị trí, 2 tán chồng nhau) nên file này giữ nguyên không có cây.
// Sân C1 (#CFCBC2), sân thư viện (#A65B43) và sân Trần Đại Nghĩa (#BFE3D8)
// giữ nguyên màu đã chốt.
// ---------------------------------------------------------------------------

import { C1, LIBRARY, ROADS, TDN_SQUARE, type Vec2 } from '../../lib/campus';

const GRASS_COLOR = '#7fa05e'; // cỏ — màu tạm
const ROAD_COLOR = '#9d9d99'; // đường — màu tạm, trung tính
// Màu sân CHỐT theo reference-visual §0/§2/§3/§7 (ước lượng từ ảnh).
const C1_PLAZA_COLOR = '#CFCBC2'; // quảng trường C1, đá xám nhạt
const LIB_PLAZA_COLOR = '#A65B43'; // sân thư viện, gạch đỏ-nâu đất nung
const TDN_PLAZA_COLOR = '#BFE3D8'; // quảng trường Trần Đại Nghĩa, xanh ngọc nhạt
const CIRCUIT_COLOR = '#F5F5F5'; // vạch trắng kiểu mạch điện trên sân TDN

const GRASS_Y = 0;
const PLAZA_Y = 0.015;
const ROAD_Y = 0.02;
const JOINT_Y = 0.03;

// Mặt đất cỏ 220 × 190, tâm (0, 5) để bao vừa BOUNDS (x −96..96, z −76..86).
const GRASS_SIZE: [number, number] = [220, 190];
const GRASS_CENTER: [number, number, number] = [0, GRASS_Y, 5];

type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

// Mỗi quảng trường có màu sân riêng (Bước 3). Đường được cắt khỏi cả 3 sân.
const PLAZAS: Array<{ rect: Rect; color: string }> = [
  { rect: C1.plaza, color: C1_PLAZA_COLOR },
  { rect: LIBRARY.plaza, color: LIB_PLAZA_COLOR },
  { rect: TDN_SQUARE, color: TDN_PLAZA_COLOR },
];

// Vạch trắng kiểu mạch điện trên sân Trần Đại Nghĩa (reference-visual §7):
// đường thẳng + nút tròn. Họa tiết cụ thể toàn sân CHƯA xác minh (chỉ có ảnh
// cận cảnh biển tên) nên vẽ theo ước lượng, nằm gọn trong sân.
const TDN_CIRCUIT_SEGS: Array<[Vec2, Vec2]> = [
  [{ x: 74, z: -14 }, { x: 84, z: -14 }],
  [{ x: 84, z: -14 }, { x: 84, z: -4 }],
  [{ x: 84, z: -4 }, { x: 90, z: -4 }],
  [{ x: 76, z: -8 }, { x: 76, z: -2 }],
  [{ x: 76, z: -2 }, { x: 82, z: -2 }],
  [{ x: 74, z: -12 }, { x: 74, z: -4 }],
  [{ x: 80, z: -16 }, { x: 80, z: -10 }],
];
const TDN_CIRCUIT_NODES: Vec2[] = [
  { x: 74, z: -14 }, { x: 84, z: -14 }, { x: 84, z: -4 },
  { x: 76, z: -2 }, { x: 80, z: -10 },
];

// Mạch lát ô vuông trên quảng trường C1 (reference-visual §2: sân lát đá
// xám nhạt, ô vuông đều — mạch 4 m). Mạch là mặt phẳng y = 0,025, cao hơn
// sàn quảng trường (0,015) 0,01 m nên không z-fighting; nằm gọn trong sân
// C1 (đường đã cắt khỏi sân nên mạch không chồng lên đường).
const C1_JOINT_COLOR = '#B9B4A8'; // mạch lát, xám sẫm hơn nền sân một nấc
const C1_JOINT_Y = 0.025;
const C1_JOINT_W = 0.08;
// Mạch dọc trục X (4 đường, dài 48 m = chiều rộng sân C1).
const C1_JOINTS_X: Array<{ cz: number; len: number }> = [
  { cz: -42, len: 48 }, { cz: -38, len: 48 }, { cz: -34, len: 48 }, { cz: -30, len: 48 },
];
// Mạch dọc trục Z (11 đường, dài 18 m = chiều sâu sân C1).
const C1_JOINTS_Z: Array<{ cx: number; len: number }> = [
  { cx: -78, len: 18 }, { cx: -74, len: 18 }, { cx: -70, len: 18 },
  { cx: -66, len: 18 }, { cx: -62, len: 18 }, { cx: -58, len: 18 },
  { cx: -54, len: 18 }, { cx: -50, len: 18 }, { cx: -46, len: 18 },
  { cx: -42, len: 18 }, { cx: -38, len: 18 },
];

// Bồn cỏ hai bên bậc tam cấp C1 (brief §2: "bồn cỏ và cây bố trí hai bên").
// Mỗi bồn 14 × 3 m, đặt trong sân C1, chừa lối giữa rộng 16 m (x −66..−50)
// dẫn vào bậc (x −64..−52) và chừa cây Lipa (x −72/−44, z −40).
// Bồn là hộp thấp (đỉnh y = 0,20) trên viền bê tông (đỉnh y = 0,08) — đáy
// hộp cao hơn sàn quảng trường 0,005 m nên không có mặt nào trùng nhau.
// CHƯA có collider (xem ghi chú cuối file): bồn thấp 0,2 m, luồng tích hợp
// quyết định có cần chặn avatar hay không.
const GRASS_BED_COLOR = '#6B8F4E'; // cỏ bồn, xanh đậm hơn cỏ nền một nấc
const GRASS_BED_EDGE = '#B9B9B0'; // viền bê tông quanh bồn
const C1_GRASS_BEDS: Array<{ cx: number; cz: number }> = [
  { cx: -73, cz: -44 },
  { cx: -43, cz: -44 },
];

function pointInRect(p: Vec2, r: Rect): boolean {
  return p.x >= r.minX && p.x <= r.maxX && p.z >= r.minZ && p.z <= r.maxZ;
}

/**
 * Cắt đoạn thẳng, chỉ giữ lại các phần NẰM NGOÀI hình chữ nhật (Liang–Barsky).
 * Trả về 0, 1 hoặc 2 đoạn con. Đoạn nằm hoàn toàn trong rect → [].
 */
function clipOutsideRect(p0: Vec2, p1: Vec2, rect: Rect): Array<[Vec2, Vec2]> {
  const dx = p1.x - p0.x;
  const dz = p1.z - p0.z;
  let tEnter = 0;
  let tExit = 1;
  const tests: Array<{ p: number; q: number }> = [
    { p: -dx, q: p0.x - rect.minX },
    { p: dx, q: rect.maxX - p0.x },
    { p: -dz, q: p0.z - rect.minZ },
    { p: dz, q: rect.maxZ - p0.z },
  ];
  for (const { p, q } of tests) {
    if (Math.abs(p) < 1e-12) {
      // Đoạn song song với cạnh: nằm ngoài hẳn → giữ nguyên cả đoạn.
      if (q < 0) return [[p0, p1]];
      continue;
    }
    const t = q / p;
    if (p < 0) {
      // Cạnh "vào": cập nhật điểm vào muộn nhất.
      if (t > tExit) return [[p0, p1]];
      if (t > tEnter) tEnter = t;
    } else {
      // Cạnh "ra": cập nhật điểm ra sớm nhất.
      if (t < tEnter) return [[p0, p1]];
      if (t < tExit) tExit = t;
    }
  }
  if (tEnter > tExit) return [[p0, p1]]; // không giao với rect
  const at = (t: number): Vec2 => ({ x: p0.x + dx * t, z: p0.z + dz * t });
  const pieces: Array<[Vec2, Vec2]> = [];
  if (tEnter > 1e-6) pieces.push([p0, at(tEnter)]);
  if (tExit < 1 - 1e-6) pieces.push([at(tExit), p1]);
  return pieces;
}

type RoadPiece = { a: Vec2; b: Vec2; width: number };

/** Chia mỗi polyline trong ROADS thành các đoạn đã rút ngắn đầu nối + cắt khỏi quảng trường. */
function buildRoadPieces(): RoadPiece[] {
  const pieces: RoadPiece[] = [];
  for (const road of ROADS) {
    const pts = road.points;
    const w = road.width;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const dx = p1.x - p0.x;
      const dz = p1.z - p0.z;
      const len = Math.hypot(dx, dz);
      if (len < 1e-6) continue;
      const ux = dx / len;
      const uz = dz / len;
      // Rút ngắn w/2 ở đầu nối trong polyline để hai đoạn kề không chồng nhau.
      // Đầu/cuối polyline giữ nguyên (nối với cổng / quảng trường / hồ).
      let a: Vec2 = p0;
      let b: Vec2 = p1;
      if (i > 0) a = { x: p0.x + ux * (w / 2), z: p0.z + uz * (w / 2) };
      if (i < pts.length - 2) b = { x: p1.x - ux * (w / 2), z: p1.z - uz * (w / 2) };
      if (Math.hypot(b.x - a.x, b.z - a.z) < 1e-6) continue; // rút ngắn hết cả đoạn
      let segs: Array<[Vec2, Vec2]> = [[a, b]];
      for (const plaza of PLAZAS) {
        segs = segs.flatMap(([s, e]) => clipOutsideRect(s, e, plaza.rect));
      }
      for (const [s, e] of segs) pieces.push({ a: s, b: e, width: w });
    }
  }
  return pieces;
}

/** Đĩa tròn nối tại các nút giao trong polyline (không nằm trong quảng trường). */
function buildJointDiscs(): Array<{ center: Vec2; radius: number }> {
  const discs: Array<{ center: Vec2; radius: number }> = [];
  for (const road of ROADS) {
    const pts = road.points;
    for (let i = 1; i < pts.length - 1; i++) {
      const c = pts[i];
      if (PLAZAS.some((pl) => pointInRect(c, pl.rect))) continue; // trong quảng trường thì sàn quảng trường nối
      discs.push({ center: c, radius: road.width * 0.75 });
    }
  }
  // Giao cắt GIỮA hai đường khác nhau (ví dụ đường tình yêu cắt đường dọc
  // x = −54 và x = 24): thêm đĩa nối để hai mặt đường cùng cao độ không
  // chồng lấn gây z-fighting. Đĩa đã có sẵn gần đó (≤ 1,5 m) thì bỏ qua.
  const near = (p: Vec2) => discs.some((d) => Math.hypot(d.center.x - p.x, d.center.z - p.z) <= 1.5);
  const segList: Array<{ a: Vec2; b: Vec2; width: number }> = [];
  for (const road of ROADS) {
    for (let i = 0; i < road.points.length - 1; i++) {
      segList.push({ a: road.points[i], b: road.points[i + 1], width: road.width });
    }
  }
  const cross = (a: Vec2, b: Vec2, c: Vec2, d: Vec2): Vec2 | null => {
    const r = { x: b.x - a.x, z: b.z - a.z };
    const s = { x: d.x - c.x, z: d.z - c.z };
    const den = r.x * s.z - r.z * s.x;
    if (Math.abs(den) < 1e-12) return null; // song song/trùng nhau
    const qp = { x: c.x - a.x, z: c.z - a.z };
    const t = (qp.x * s.z - qp.z * s.x) / den;
    const u = (qp.x * r.z - qp.z * r.x) / den;
    if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) return null;
    return { x: a.x + t * r.x, z: a.z + t * r.z };
  };
  for (let i = 0; i < segList.length; i++) {
    for (let j = i + 1; j < segList.length; j++) {
      const s1 = segList[i];
      const s2 = segList[j];
      // Hai đoạn cùng một đường thì nút giao đã có đĩa riêng (hoặc thẳng hàng).
      if (s1.a === s2.a || s1.b === s2.b) continue;
      const p = cross(s1.a, s1.b, s2.a, s2.b);
      if (!p) continue;
      if (PLAZAS.some((pl) => pointInRect(p, pl.rect))) continue;
      if (near(p)) continue;
      discs.push({ center: p, radius: Math.max(s1.width, s2.width) * 0.75 });
    }
  }
  return discs;
}

const ROAD_PIECES = buildRoadPieces();
const JOINT_DISCS = buildJointDiscs();

export default function Ground() {
  return (
    <group>
      {/* Cỏ: mặt phẳng 220 × 190 tại y = 0, tâm (0, 5). */}
      <mesh rotation-x={-Math.PI / 2} position={GRASS_CENTER} receiveShadow>
        <planeGeometry args={GRASS_SIZE} />
        <meshStandardMaterial color={GRASS_COLOR} roughness={1} metalness={0} />
      </mesh>

      {/* Sàn quảng trường: C1 đá xám nhạt, thư viện gạch đỏ-nâu,
          Trần Đại Nghĩa xanh ngọc — y = 0,015. */}
      {PLAZAS.map((pl, i) => (
        <mesh
          key={`plaza-${i}`}
          rotation-x={-Math.PI / 2}
          position={[(pl.rect.minX + pl.rect.maxX) / 2, PLAZA_Y, (pl.rect.minZ + pl.rect.maxZ) / 2]}
          receiveShadow
        >
          <planeGeometry args={[pl.rect.maxX - pl.rect.minX, pl.rect.maxZ - pl.rect.minZ]} />
          <meshStandardMaterial color={pl.color} roughness={0.95} metalness={0} />
        </mesh>
      ))}

      {/* Mạch lát ô vuông trên quảng trường C1, y = 0,025. */}
      {C1_JOINTS_X.map((j, i) => (
        <mesh
          key={`c1-joint-x-${i}`}
          rotation-x={-Math.PI / 2}
          position={[-58, C1_JOINT_Y, j.cz]}
          receiveShadow
        >
          <planeGeometry args={[j.len, C1_JOINT_W]} />
          <meshStandardMaterial color={C1_JOINT_COLOR} roughness={0.95} metalness={0} />
        </mesh>
      ))}
      {C1_JOINTS_Z.map((j, i) => (
        <mesh
          key={`c1-joint-z-${i}`}
          rotation-x={-Math.PI / 2}
          position={[j.cx, C1_JOINT_Y, -37]}
          receiveShadow
        >
          <planeGeometry args={[C1_JOINT_W, j.len]} />
          <meshStandardMaterial color={C1_JOINT_COLOR} roughness={0.95} metalness={0} />
        </mesh>
      ))}

      {/* Bồn cỏ hai bên bậc tam cấp C1: viền bê tông + hộp cỏ thấp. */}
      {C1_GRASS_BEDS.map((b, i) => (
        <group key={`c1-bed-${i}`}>
          <mesh position={[b.cx, 0.05, b.cz]} castShadow receiveShadow>
            <boxGeometry args={[14.2, 0.06, 3.2]} />
            <meshStandardMaterial color={GRASS_BED_EDGE} roughness={1} metalness={0} />
          </mesh>
          <mesh position={[b.cx, 0.11, b.cz]} castShadow receiveShadow>
            <boxGeometry args={[14, 0.18, 3]} />
            <meshStandardMaterial color={GRASS_BED_COLOR} roughness={1} metalness={0} />
          </mesh>
        </group>
      ))}

      {/* Vạch trắng kiểu mạch điện trên sân Trần Đại Nghĩa, y = 0,025. */}
      {TDN_CIRCUIT_SEGS.map(([a, b], i) => {
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len = Math.hypot(dx, dz);
        return (
          <group
            key={`circuit-${i}`}
            position={[(a.x + b.x) / 2, 0.025, (a.z + b.z) / 2]}
            rotation-y={Math.atan2(-dz, dx)}
          >
            <mesh rotation-x={-Math.PI / 2} receiveShadow>
              <planeGeometry args={[len, 0.35]} />
              <meshStandardMaterial color={CIRCUIT_COLOR} roughness={0.9} metalness={0} />
            </mesh>
          </group>
        );
      })}
      {TDN_CIRCUIT_NODES.map((n, i) => (
        <mesh
          key={`circuit-node-${i}`}
          rotation-x={-Math.PI / 2}
          position={[n.x, 0.025, n.z]}
          receiveShadow
        >
          <circleGeometry args={[0.55, 24]} />
          <meshStandardMaterial color={CIRCUIT_COLOR} roughness={0.9} metalness={0} />
        </mesh>
      ))}

      {/* Đường đi dọc ROADS: mỗi đoạn là một mặt phẳng y = 0,02, rộng road.width. */}
      {ROAD_PIECES.map((seg, i) => {
        const dx = seg.b.x - seg.a.x;
        const dz = seg.b.z - seg.a.z;
        const len = Math.hypot(dx, dz);
        return (
          <group
            key={`road-${i}`}
            position={[(seg.a.x + seg.b.x) / 2, ROAD_Y, (seg.a.z + seg.b.z) / 2]}
            rotation-y={Math.atan2(-dz, dx)}
          >
            <mesh rotation-x={-Math.PI / 2} receiveShadow>
              <planeGeometry args={[len, seg.width]} />
              <meshStandardMaterial color={ROAD_COLOR} roughness={0.95} metalness={0} />
            </mesh>
          </group>
        );
      })}

      {/* Đĩa nối tròn tại nút giao của đường, y = 0,03 (cách đường 0,01). */}
      {JOINT_DISCS.map((d, i) => (
        <mesh
          key={`joint-${i}`}
          rotation-x={-Math.PI / 2}
          position={[d.center.x, JOINT_Y, d.center.z]}
          receiveShadow
        >
          <circleGeometry args={[d.radius, 32]} />
          <meshStandardMaterial color={ROAD_COLOR} roughness={0.95} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}
