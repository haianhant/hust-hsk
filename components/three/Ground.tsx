// ---------------------------------------------------------------------------
// Ground.tsx — mặt đất, đường đi, vỉa hè bó vỉa, sàn quảng trường (Giai đoạn 1 PBR)
// Mọi số đo lấy từ lib/campus.ts (source of truth duy nhất).
//
// Chống z-fighting (nền nối liên tục, mép sạch): các lớp cách nhau ≥ 0,01 m theo trục Y:
//   cỏ y = 0  →  quảng trường y = 0,015  →  đường y = 0,02  →  đĩa nối y = 0,03.
// Đường KHÔNG vẽ đè lên quảng trường: mỗi đoạn đường được cắt (Liang–Barsky)
// bỏ phần nằm trong hình chữ nhật quảng trường.
// Giai đoạn 1: tích hợp Procedural PBR CanvasTexture (cỏ tự nhiên, nhựa đường
// có vạch phân làn & bó vỉa bê tông 3D, gạch đất nung sân Thư viện có bumpMap,
// đá rửa sân C1, và lá vàng Lipa rụng trên sân C1).
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from 'react';
import { C1, LIBRARY, ROADS, TDN_SQUARE, type Vec2 } from '../../lib/campus';
import {
  createSeededRandom,
  makeAsphaltTexture,
  makeC1PlazaStoneTexture,
  makeCircuitPlazaTexture,
  makeGrassTexture,
  makeTerracottaTileTexture,
} from './materials';

const GRASS_COLOR = '#86A665';
const ROAD_COLOR = '#9d9d99';
const CURB_COLOR = '#D6D3C9'; // bó vỉa bê tông dọc hai mép đường
const C1_PLAZA_COLOR = '#DAD6CE'; // quảng trường C1, đá rửa xám sáng
const LIB_PLAZA_COLOR = '#B86B52'; // sân thư viện, gạch đỏ-nâu đất nung (nhân với map)
const TDN_PLAZA_COLOR = '#BFE3D8'; // quảng trường Trần Đại Nghĩa, xanh ngọc nhạt
const CIRCUIT_COLOR = '#F5F5F5'; // vạch trắng kiểu mạch điện trên sân TDN

const GRASS_Y = 0;
const PLAZA_Y = 0.015;
const ROAD_Y = 0.02;
const JOINT_Y = 0.03;

const GRASS_SIZE: [number, number] = [220, 190];
const GRASS_CENTER: [number, number, number] = [0, GRASS_Y, 5];

type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

const PLAZAS: Array<{ rect: Rect; color: string; kind: 'c1' | 'lib' | 'tdn' }> = [
  { rect: C1.plaza, color: C1_PLAZA_COLOR, kind: 'c1' },
  { rect: LIBRARY.plaza, color: LIB_PLAZA_COLOR, kind: 'lib' },
  { rect: TDN_SQUARE, color: TDN_PLAZA_COLOR, kind: 'tdn' },
];

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

const C1_JOINT_COLOR = '#B2ADA0';
const C1_JOINT_Y = 0.025;
const C1_JOINT_W = 0.08;
const C1_JOINTS_X: Array<{ cz: number; len: number }> = [
  { cz: -42, len: 48 }, { cz: -38, len: 48 }, { cz: -34, len: 48 }, { cz: -30, len: 48 },
];
const C1_JOINTS_Z: Array<{ cx: number; len: number }> = [
  { cx: -78, len: 18 }, { cx: -74, len: 18 }, { cx: -70, len: 18 },
  { cx: -66, len: 18 }, { cx: -62, len: 18 }, { cx: -58, len: 18 },
  { cx: -54, len: 18 }, { cx: -50, len: 18 }, { cx: -46, len: 18 },
  { cx: -42, len: 18 }, { cx: -38, len: 18 },
];

const GRASS_BED_COLOR = '#6B8F4E';
const GRASS_BED_EDGE = '#B9B9B0';
const C1_GRASS_BEDS: Array<{ cx: number; cz: number }> = [
  { cx: -73, cz: -44 },
  { cx: -43, cz: -44 },
];

// Lá vàng Lipa rụng quanh 2 cây cổ thụ sân C1 (reference-visual §2)
const FALLEN_LEAVES = (() => {
  const rnd = createSeededRandom(19862024);
  const items: Array<{ x: number; z: number; r: number; rot: number; color: string }> = [];
  const colors = ['#D9A419', '#E2B42E', '#C88A14', '#B89B28'];
  for (const tree of C1.lipaTrees) {
    for (let i = 0; i < 22; i++) {
      const ang = rnd() * Math.PI * 2;
      const dist = 0.8 + rnd() * 3.8;
      items.push({
        x: tree.x + Math.cos(ang) * dist,
        z: tree.z + Math.sin(ang) * dist,
        r: 0.09 + rnd() * 0.08,
        rot: rnd() * Math.PI * 2,
        color: colors[i % colors.length],
      });
    }
  }
  return items;
})();

function pointInRect(p: Vec2, r: Rect): boolean {
  return p.x >= r.minX && p.x <= r.maxX && p.z >= r.minZ && p.z <= r.maxZ;
}

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
      if (q < 0) return [[p0, p1]];
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > tExit) return [[p0, p1]];
      if (t > tEnter) tEnter = t;
    } else {
      if (t < tEnter) return [[p0, p1]];
      if (t < tExit) tExit = t;
    }
  }
  if (tEnter > tExit) return [[p0, p1]];
  const at = (t: number): Vec2 => ({ x: p0.x + dx * t, z: p0.z + dz * t });
  const pieces: Array<[Vec2, Vec2]> = [];
  if (tEnter > 1e-6) pieces.push([p0, at(tEnter)]);
  if (tExit < 1 - 1e-6) pieces.push([at(tExit), p1]);
  return pieces;
}

type RoadPiece = { a: Vec2; b: Vec2; width: number };

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
      let a: Vec2 = p0;
      let b: Vec2 = p1;
      if (i > 0) a = { x: p0.x + ux * (w / 2), z: p0.z + uz * (w / 2) };
      if (i < pts.length - 2) b = { x: p1.x - ux * (w / 2), z: p1.z - uz * (w / 2) };
      if (Math.hypot(b.x - a.x, b.z - a.z) < 1e-6) continue;
      let segs: Array<[Vec2, Vec2]> = [[a, b]];
      for (const plaza of PLAZAS) {
        segs = segs.flatMap(([s, e]) => clipOutsideRect(s, e, plaza.rect));
      }
      for (const [s, e] of segs) pieces.push({ a: s, b: e, width: w });
    }
  }
  return pieces;
}

function buildJointDiscs(): Array<{ center: Vec2; radius: number }> {
  const discs: Array<{ center: Vec2; radius: number }> = [];
  for (const road of ROADS) {
    const pts = road.points;
    for (let i = 1; i < pts.length - 1; i++) {
      const c = pts[i];
      if (PLAZAS.some((pl) => pointInRect(c, pl.rect))) continue;
      discs.push({ center: c, radius: road.width * 0.75 });
    }
  }
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
    if (Math.abs(den) < 1e-12) return null;
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
  const textures = useMemo(() => {
    const grass = makeGrassTexture(28, 24);
    const asphalt = makeAsphaltTexture(4, 1);
    const c1Stone = makeC1PlazaStoneTexture(12, 6);
    const libTile = makeTerracottaTileTexture(14, 22);
    const tdnCircuit = makeCircuitPlazaTexture(2, 2);
    return { grass, asphalt, c1Stone, libTile, tdnCircuit };
  }, []);

  useEffect(
    () => () => {
      textures.grass.dispose();
      textures.asphalt.dispose();
      textures.c1Stone.dispose();
      textures.libTile.map.dispose();
      textures.libTile.bumpMap.dispose();
      textures.tdnCircuit.dispose();
    },
    [textures],
  );

  return (
    <group>
      {/* Cỏ khuôn viên: mặt phẳng 220 × 190 tại y = 0, có vân cỏ tự nhiên. */}
      <mesh rotation-x={-Math.PI / 2} position={GRASS_CENTER} receiveShadow>
        <planeGeometry args={GRASS_SIZE} />
        <meshStandardMaterial
          color={GRASS_COLOR}
          map={textures.grass}
          roughness={0.96}
          metalness={0}
        />
      </mesh>

      {/* Các lối dạo bộ lát đá nối đường chính vào Tòa C7, VDZ, Khu Thể thao, KTX B6–B10 & Cổng Nam (y = 0,012). */}
      {[
        { cx: -16, cz: -38.5, w: 6, d: 8 }, // Lối vào sảnh Tòa C7
        { cx: 10, cz: -28.5, w: 4.5, d: 6.5 }, // Lối vào Trung tâm Việt – Đức VDZ
        { cx: -54, cz: 22.5, w: 4.5, d: 24 }, // Đường nội bộ từ trục Parabol xuống Khu Thể thao & Nhà thi đấu
        { cx: 61, cz: 34, w: 22, d: 4.5 }, // Đường nội bộ nối Thư viện sang Căng-tin & KTX B6–B10
        { cx: 38, cz: 69.5, w: 5.5, d: 27 }, // Trục đường phía Nam từ Thư viện ra Cổng Tạ Quang Bửu
      ].map((p, idx) => (
        <mesh
          key={`sub-walkway-${idx}`}
          rotation-x={-Math.PI / 2}
          position={[p.cx, 0.012, p.cz]}
          receiveShadow
        >
          <planeGeometry args={[p.w, p.d]} />
          <meshStandardMaterial
            color="#D2CEC4"
            map={textures.c1Stone}
            roughness={0.9}
            metalness={0}
          />
        </mesh>
      ))}

      {/* Sàn quảng trường: C1 đá rửa, Thư viện gạch đất nung có bumpMap,
          Trần Đại Nghĩa bản mạch điện tử xanh ngọc — y = 0,015. */}
      {PLAZAS.map((pl, i) => (
        <mesh
          key={`plaza-${i}`}
          rotation-x={-Math.PI / 2}
          position={[(pl.rect.minX + pl.rect.maxX) / 2, PLAZA_Y, (pl.rect.minZ + pl.rect.maxZ) / 2]}
          receiveShadow
        >
          <planeGeometry args={[pl.rect.maxX - pl.rect.minX, pl.rect.maxZ - pl.rect.minZ]} />
          {pl.kind === 'c1' ? (
            <meshStandardMaterial
              color={pl.color}
              map={textures.c1Stone}
              bumpMap={textures.c1Stone}
              bumpScale={0.008}
              roughness={0.88}
              metalness={0}
            />
          ) : pl.kind === 'lib' ? (
            <meshStandardMaterial
              color="#FFFFFF"
              map={textures.libTile.map}
              bumpMap={textures.libTile.bumpMap}
              bumpScale={0.015}
              roughness={0.85}
              metalness={0}
            />
          ) : (
            <meshStandardMaterial
              color="#FFFFFF"
              map={textures.tdnCircuit}
              bumpMap={textures.tdnCircuit}
              bumpScale={0.008}
              roughness={0.82}
              metalness={0.05}
            />
          )}
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

      {/* Lá vàng Lipa rụng rải rác trên sân C1 (y = 0,065, trên mặt bồn/sân). */}
      {FALLEN_LEAVES.map((lf, i) => (
        <mesh
          key={`lipa-leaf-${i}`}
          rotation-x={-Math.PI / 2}
          rotation-z={lf.rot}
          position={[lf.x, 0.13, lf.z]}
        >
          <circleGeometry args={[lf.r, 6]} />
          <meshStandardMaterial color={lf.color} roughness={0.9} />
        </mesh>
      ))}

      {/* Bồn cỏ hai bên bậc tam cấp C1: viền bê tông + hộp cỏ thấp. */}
      {C1_GRASS_BEDS.map((b, i) => (
        <group key={`c1-bed-${i}`}>
          <mesh position={[b.cx, 0.05, b.cz]} castShadow receiveShadow>
            <boxGeometry args={[14.2, 0.06, 3.2]} />
            <meshStandardMaterial color={GRASS_BED_EDGE} roughness={0.95} metalness={0} />
          </mesh>
          <mesh position={[b.cx, 0.11, b.cz]} castShadow receiveShadow>
            <boxGeometry args={[14, 0.18, 3]} />
            <meshStandardMaterial color={GRASS_BED_COLOR} roughness={0.95} metalness={0} />
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
              <meshStandardMaterial color={CIRCUIT_COLOR} roughness={0.85} metalness={0} />
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
          <meshStandardMaterial color={CIRCUIT_COLOR} roughness={0.85} metalness={0} />
        </mesh>
      ))}

      {/* Đường đi dọc ROADS: mặt nhựa đường PBR + bó vỉa bê tông 2 bên mép đường. */}
      {ROAD_PIECES.map((seg, i) => {
        const dx = seg.b.x - seg.a.x;
        const dz = seg.b.z - seg.a.z;
        const len = Math.hypot(dx, dz);
        const curbOffset = seg.width / 2 + 0.12;
        return (
          <group
            key={`road-${i}`}
            position={[(seg.a.x + seg.b.x) / 2, ROAD_Y, (seg.a.z + seg.b.z) / 2]}
            rotation-y={Math.atan2(-dz, dx)}
          >
            <mesh rotation-x={-Math.PI / 2} receiveShadow>
              <planeGeometry args={[len, seg.width]} />
              <meshStandardMaterial
                color="#FFFFFF"
                map={textures.asphalt}
                bumpMap={textures.asphalt}
                bumpScale={0.01}
                roughness={0.9}
                metalness={0}
              />
            </mesh>
            {/* Bó vỉa bê tông hai bên mép đường (cao 0,07 m, rộng 0,22 m). */}
            {len > 2.5 && (
              <>
                <mesh position={[0, 0.025, -curbOffset]} receiveShadow>
                  <boxGeometry args={[len - 0.4, 0.07, 0.22]} />
                  <meshStandardMaterial color={CURB_COLOR} roughness={0.92} />
                </mesh>
                <mesh position={[0, 0.025, curbOffset]} receiveShadow>
                  <boxGeometry args={[len - 0.4, 0.07, 0.22]} />
                  <meshStandardMaterial color={CURB_COLOR} roughness={0.92} />
                </mesh>
              </>
            )}
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
          <meshStandardMaterial color={ROAD_COLOR} roughness={0.9} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}
