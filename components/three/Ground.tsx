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

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { C1, LIBRARY, LOVE_ROAD_TREES, NGA_5_PLAZA, ROADS, TDN_SQUARE, type Vec2 } from '../../lib/campus';
import { createAutumnLeafAssets } from '../../features/campus/atmosphere/CampusAtmosphereFX';
import {
  createSeededRandom,
  makeAsphaltTexture,
  makeC1PlazaStoneTexture,
  makeCircuitPlazaTexture,
  makeGrassTexture,
  makeSidewalkPaverTexture,
  makeTerracottaTileTexture,
  makeZebraAndDrainTextures,
} from './materials';

const GRASS_COLOR = '#86A665';
const ROAD_COLOR = '#9d9d99';
const CURB_COLOR = '#D6D3C9'; // bó vỉa bê tông dọc hai mép đường
const C1_PLAZA_COLOR = '#DAD6CE'; // quảng trường C1, đá rửa xám sáng
const LIB_PLAZA_COLOR = '#B86B52'; // sân thư viện, gạch đỏ-nâu đất nung (nhân với map)

const GRASS_Y = 0;
const PLAZA_Y = 0.015;
const ROAD_Y = 0.02;
const JOINT_Y = 0.03;

const GRASS_SIZE: [number, number] = [290, 220];
const GRASS_CENTER: [number, number, number] = [36, GRASS_Y, 16];

type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

const PLAZAS: Array<{ rect: Rect; color: string; kind: 'c1' | 'lib' | 'tdn' }> = [
  { rect: C1.plaza, color: C1_PLAZA_COLOR, kind: 'c1' },
  { rect: NGA_5_PLAZA.rect, color: C1_PLAZA_COLOR, kind: 'c1' },
  { rect: TDN_SQUARE, color: C1_PLAZA_COLOR, kind: 'tdn' },
  { rect: LIBRARY.plaza, color: LIB_PLAZA_COLOR, kind: 'lib' },
];

const C1_JOINT_COLOR = '#B2ADA0';
const C1_JOINT_Y = 0.025;
const C1_JOINT_W = 0.08;
const C1_JOINTS_X: Array<{ cz: number; len: number }> = [
  { cz: -46, len: 51.6 },
  { cz: -42, len: 51.6 },
  { cz: -38, len: 51.6 },
  { cz: -34, len: 51.6 },
  { cz: -30, len: 51.6 },
  { cz: -26, len: 51.6 },
];
const C1_JOINTS_Z: Array<{ cx: number; len: number }> = [
  { cx: -82, len: 25.2 }, { cx: -78, len: 25.2 }, { cx: -74, len: 25.2 },
  { cx: -70, len: 25.2 }, { cx: -66, len: 25.2 }, { cx: -62, len: 25.2 },
  { cx: -58, len: 25.2 }, { cx: -54, len: 25.2 }, { cx: -50, len: 25.2 },
  { cx: -46, len: 25.2 }, { cx: -42, len: 25.2 }, { cx: -38, len: 25.2 },
  { cx: -34, len: 25.2 },
];

const GRASS_BED_COLOR = '#6B8F4E';
const GRASS_BED_EDGE = '#B9B9B0';
const C1_GRASS_BEDS: Array<{ cx: number; cz: number; w: number; d: number }> = [
  // Cặp ô cỏ phía Bắc hai bên bậc thềm C1 (mở rộng khoảng sân lát đá trung tâm rộng 20,8 m)
  { cx: -74.45, cz: -46.0, w: 12.1, d: 2.8 },
  { cx: -41.55, cz: -46.0, w: 12.1, d: 2.8 },
  // Cặp ô cỏ phía Nam hai bên Đài phun nước lớn C1 (hoàn thiện 6 mảng cỏ đối xứng chuẩn https://hustmap.com/)
  { cx: -73.2, cz: -26.8, w: 9.6, d: 3.2 },
  { cx: -42.8, cz: -26.8, w: 9.6, d: 3.2 },
];

function getFallenLeafGroundY(x: number, z: number): number {
  for (const b of C1_GRASS_BEDS) {
    if (Math.abs(x - b.cx) <= b.w / 2 + 0.12 && Math.abs(z - b.cz) <= b.d / 2 + 0.12) {
      return 0.206;
    }
  }
  if ((Math.abs(x - -73.2) <= 4.95 || Math.abs(x - -42.8) <= 4.95) && z >= -43.15 && z <= -30.85) {
    return 0.126;
  }
  if (x >= -66.7 && x <= -49.3 && z >= -44.5 && z <= -23.9) {
    return 0.052;
  }
  return 0.032;
}

// Lá vàng Lipa rụng quanh 2 cây cổ thụ sân C1 (dùng phiến lá 3D hữu cơ bám đúng cao độ từng bề mặt)
const FALLEN_LEAVES = (() => {
  const rnd = createSeededRandom(19862024);
  const items: Array<{
    x: number;
    y: number;
    z: number;
    r: number;
    rotY: number;
    tiltX: number;
    tiltZ: number;
    color: string;
  }> = [];
  const colors = ['#FDE047', '#EAB308', '#D97706', '#CA8A04'];
  for (const tree of C1.lipaTrees) {
    for (let i = 0; i < 24; i++) {
      const ang = rnd() * Math.PI * 2;
      const dist = 0.8 + rnd() * 3.8;
      const x = tree.x + Math.cos(ang) * dist;
      const z = tree.z + Math.sin(ang) * dist;
      items.push({
        x,
        y: getFallenLeafGroundY(x, z),
        z,
        r: 0.09 + rnd() * 0.08,
        rotY: rnd() * Math.PI * 2,
        tiltX: (rnd() - 0.5) * 0.05,
        tiltZ: (rnd() - 0.5) * 0.05,
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

/**
 * Sinh hình học bụi cỏ gồm 6 phiến lá dẹt uốn cong parabol tỏa ra các hướng
 * (thay thế hoàn toàn hình nón ConeGeometry), có vertexColors gốc đậm → ngọn sáng.
 */
function createCurvedGrassClumpGeometry(): THREE.BufferGeometry {
  const blades = [
    { ang: 0.0, lean: 0.085, h: 0.24, w: 0.032, tiltPhase: 0.1 },
    { ang: 1.05, lean: 0.075, h: 0.21, w: 0.028, tiltPhase: 1.1 },
    { ang: 2.15, lean: 0.095, h: 0.26, w: 0.03, tiltPhase: 2.2 },
    { ang: 3.25, lean: 0.072, h: 0.19, w: 0.027, tiltPhase: 0.6 },
    { ang: 4.35, lean: 0.088, h: 0.23, w: 0.03, tiltPhase: 1.7 },
    { ang: 5.4, lean: 0.065, h: 0.18, w: 0.026, tiltPhase: 2.8 },
  ];
  const segs = 4;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const cBase = new THREE.Color('#3B662B');
  const cTip = new THREE.Color('#8CC657');
  const cMix = new THREE.Color();

  for (const b of blades) {
    const dirX = Math.cos(b.ang);
    const dirZ = Math.sin(b.ang);
    const sideX = -dirZ;
    const sideZ = dirX;
    const ox = dirX * 0.018;
    const oz = dirZ * 0.018;
    const baseVert = positions.length / 3;

    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const halfW = (b.w * 0.5) * (1 - t * 0.88);
      const y = b.h * (t - 0.12 * t * t);
      const bend = b.lean * t * t;
      const cx = ox + dirX * bend;
      const cz = oz + dirZ * bend;
      cMix.copy(cBase).lerp(cTip, t);

      positions.push(
        cx - sideX * halfW,
        y,
        cz - sideZ * halfW,
        cx + sideX * halfW,
        y,
        cz + sideZ * halfW,
      );
      colors.push(cMix.r, cMix.g, cMix.b, cMix.r, cMix.g, cMix.b);
    }

    for (let s = 0; s < segs; s++) {
      const i0 = baseVert + s * 2;
      const i1 = i0 + 1;
      const i2 = i0 + 2;
      const i3 = i0 + 3;
      indices.push(i0, i2, i1, i1, i2, i3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sinh cụm hoa dại 5 cánh xòe ngang kèm cuống mảnh thay cho khối DodecahedronGeometry đơn điệu.
 */
function createWildflowerClusterGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const petalColor = new THREE.Color('#FFFFFF');
  const centerColor = new THREE.Color('#F59E0B');

  const headY = 0.21;
  // Cuống mảnh (tứ diện dẹt đứng)
  const stemTopColor = new THREE.Color('#5E8C3A');
  const stemVert = positions.length / 3;
  positions.push(-0.008, 0, -0.008, 0.008, 0, 0.008, -0.005, headY, -0.005, 0.005, headY, 0.005);
  for (let k = 0; k < 4; k++) colors.push(stemTopColor.r, stemTopColor.g, stemTopColor.b);
  indices.push(stemVert, stemVert + 2, stemVert + 1, stemVert + 1, stemVert + 2, stemVert + 3);

  // 5 cánh hoa dại xòe quanh tâm
  const petals = 5;
  for (let p = 0; p < petals; p++) {
    const a0 = (p / petals) * Math.PI * 2;
    const aL = a0 - 0.34;
    const aR = a0 + 0.34;
    const rTip = 0.068;
    const rMid = 0.044;
    const vIdx = positions.length / 3;
    positions.push(
      0, headY, 0,
      Math.cos(aL) * rMid, headY + 0.012, Math.sin(aL) * rMid,
      Math.cos(a0) * rTip, headY + 0.008, Math.sin(a0) * rTip,
      Math.cos(aR) * rMid, headY + 0.012, Math.sin(aR) * rMid,
    );
    colors.push(
      centerColor.r, centerColor.g, centerColor.b,
      petalColor.r, petalColor.g, petalColor.b,
      petalColor.r, petalColor.g, petalColor.b,
      petalColor.r, petalColor.g, petalColor.b,
    );
    indices.push(vIdx, vIdx + 1, vIdx + 2, vIdx, vIdx + 2, vIdx + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Cụm cỏ lá cong đung đưa theo gió & hoa dại 5 cánh (2 InstancedMesh = 2 draw calls). */
function GrassAndFlowerTufts() {
  const grassRef = useRef<THREE.InstancedMesh>(null);
  const flowerRef = useRef<THREE.InstancedMesh>(null);
  const dummyObj = useMemo(() => new THREE.Object3D(), []);
  const swayAccRef = useRef(0);

  const { grassGeo, flowerGeo, grassItems, flowerItems } = useMemo(() => {
    const rnd = createSeededRandom(20261108);
    const gGeo = createCurvedGrassClumpGeometry();
    const fGeo = createWildflowerClusterGeometry();

    const gList: Array<{
      x: number;
      y: number;
      z: number;
      sx: number;
      sy: number;
      rot: number;
      phase: number;
      color: string;
    }> = [];
    const fList: Array<{ x: number; y: number; z: number; s: number; color: string }> = [];
    const grassTones = ['#7BB24E', '#8BC35A', '#6A9F42', '#95CE62'];
    const flowerTones = ['#FFD54F', '#FFF176', '#FF8A65', '#F48FB1', '#FFFFFF'];

    // 1. Trên các bồn cỏ Quảng trường C1 (y = 0,19)
    for (const bed of C1_GRASS_BEDS) {
      for (let i = 0; i < 84; i++) {
        const x = bed.cx + (rnd() - 0.5) * (bed.w - 0.8);
        const z = bed.cz + (rnd() - 0.5) * (bed.d - 0.6);
        gList.push({
          x,
          y: 0.19,
          z,
          sx: 0.82 + rnd() * 0.55,
          sy: 0.78 + rnd() * 0.55,
          rot: rnd() * Math.PI * 2,
          phase: x * 0.25 + z * 0.19,
          color: grassTones[i % grassTones.length],
        });
        if (i % 4 === 0) {
          fList.push({
            x: x + (rnd() - 0.5) * 0.14,
            y: 0.19,
            z: z + (rnd() - 0.5) * 0.14,
            s: 0.85 + rnd() * 0.45,
            color: flowerTones[i % flowerTones.length],
          });
        }
      }
    }

    // 2. Quanh gốc các cây dọc Đường Tình Yêu (trên cỏ y = 0,01)
    for (const tree of LOVE_ROAD_TREES) {
      for (let i = 0; i < 20; i++) {
        const ang = rnd() * Math.PI * 2;
        const r = 0.72 + rnd() * 0.95;
        const x = tree.x + Math.cos(ang) * r;
        const z = tree.z + Math.sin(ang) * r;
        gList.push({
          x,
          y: 0.01,
          z,
          sx: 0.9 + rnd() * 0.55,
          sy: 0.85 + rnd() * 0.6,
          rot: rnd() * Math.PI * 2,
          phase: x * 0.25 + z * 0.19,
          color: grassTones[i % grassTones.length],
        });
        if (i % 5 === 0) {
          fList.push({
            x,
            y: 0.01,
            z,
            s: 0.85 + rnd() * 0.4,
            color: flowerTones[(i + 1) % flowerTones.length],
          });
        }
      }
    }

    // 3. Dải thảm cỏ phía tây lối dạo Hồ Tiền (x = -31.2..-28.4, z = -2..78)
    for (let i = 0; i < 145; i++) {
      const x = -31.2 + rnd() * 2.8;
      const z = -2 + rnd() * 80;
      gList.push({
        x,
        y: 0.01,
        z,
        sx: 0.9 + rnd() * 0.58,
        sy: 0.8 + rnd() * 0.65,
        rot: rnd() * Math.PI * 2,
        phase: x * 0.25 + z * 0.19,
        color: grassTones[i % grassTones.length],
      });
      if (i % 4 === 0) {
        fList.push({
          x,
          y: 0.01,
          z,
          s: 0.88 + rnd() * 0.45,
          color: flowerTones[(i + 2) % flowerTones.length],
        });
      }
    }

    return { grassGeo: gGeo, flowerGeo: fGeo, grassItems: gList, flowerItems: fList };
  }, []);

  useEffect(
    () => () => {
      grassGeo.dispose();
      flowerGeo.dispose();
    },
    [grassGeo, flowerGeo],
  );

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    const col = new THREE.Color();

    if (grassRef.current) {
      grassItems.forEach((it, idx) => {
        e.set(0, it.rot, 0);
        q.setFromEuler(e);
        v.set(it.x, it.y, it.z);
        s.set(it.sx, it.sy, it.sx);
        m.compose(v, q, s);
        grassRef.current!.setMatrixAt(idx, m);
        col.set(it.color);
        grassRef.current!.setColorAt(idx, col);
      });
      grassRef.current.instanceMatrix.needsUpdate = true;
      if (grassRef.current.instanceColor) grassRef.current.instanceColor.needsUpdate = true;
    }

    if (flowerRef.current) {
      flowerItems.forEach((it, idx) => {
        e.set(0, idx * 0.7, 0);
        q.setFromEuler(e);
        v.set(it.x, it.y, it.z);
        s.set(it.s, it.s, it.s);
        m.compose(v, q, s);
        flowerRef.current!.setMatrixAt(idx, m);
        col.set(it.color);
        flowerRef.current!.setColorAt(idx, col);
      });
      flowerRef.current.instanceMatrix.needsUpdate = true;
      if (flowerRef.current.instanceColor) flowerRef.current.instanceColor.needsUpdate = true;
    }
  }, [grassItems, flowerItems]);

  // Gió thổi nhẹ qua thảm cỏ (~24fps để giữ CPU gần như bằng 0)
  useFrame((state, rawDelta) => {
    const gMesh = grassRef.current;
    if (!gMesh) return;
    swayAccRef.current += rawDelta;
    if (swayAccRef.current < 0.042) return;
    swayAccRef.current = 0;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < grassItems.length; i++) {
      const it = grassItems[i];
      const wave = Math.sin(t * 2.1 + it.phase);
      dummyObj.position.set(it.x, it.y, it.z);
      dummyObj.rotation.set(wave * 0.075, it.rot, Math.cos(t * 1.6 + it.phase) * 0.055);
      dummyObj.scale.set(it.sx, it.sy, it.sx);
      dummyObj.updateMatrix();
      gMesh.setMatrixAt(i, dummyObj.matrix);
    }
    gMesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={grassRef} args={[grassGeo, undefined, grassItems.length]}>
        <meshStandardMaterial color="#FFFFFF" vertexColors roughness={0.88} side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={flowerRef} args={[flowerGeo, undefined, flowerItems.length]}>
        <meshStandardMaterial color="#FFFFFF" vertexColors roughness={0.72} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}

/**
 * Chi tiết hạ tầng đường phố ĐHBK Hà Nội: vạch kẻ qua đường (Zebra Crosswalk),
 * vạch tim đường nét đứt, song chắn rác gang đúc thu nước & vỉa hè gạch block tự chèn.
 */
function CampusStreetscapeDetails() {
  const crosswalkRef = useRef<THREE.InstancedMesh>(null);
  const centerLineRef = useRef<THREE.InstancedMesh>(null);
  const drainRef = useRef<THREE.InstancedMesh>(null);

  const assets = useMemo(() => {
    const { zebraMap, drainMap } = makeZebraAndDrainTextures();
    const sidewalk = makeSidewalkPaverTexture(14, 1);
    const stripeGeo = new THREE.PlaneGeometry(1, 1);
    const zebraMat = new THREE.MeshStandardMaterial({
      map: zebraMap,
      color: '#F1F5F9',
      roughness: 0.78,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const lineMat = new THREE.MeshStandardMaterial({
      color: '#E8ECEF',
      roughness: 0.82,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const drainMat = new THREE.MeshStandardMaterial({
      map: drainMap,
      roughness: 0.52,
      metalness: 0.65,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    return { zebraMap, drainMap, sidewalk, stripeGeo, zebraMat, lineMat, drainMat };
  }, []);

  useEffect(
    () => () => {
      assets.stripeGeo.dispose();
      assets.zebraMat.dispose();
      assets.lineMat.dispose();
      assets.drainMat.dispose();
      assets.zebraMap.dispose();
      assets.drainMap.dispose();
      assets.sidewalk.map.dispose();
      assets.sidewalk.bumpMap.dispose();
    },
    [assets],
  );

  // Vạch kẻ qua đường trắng ngà tại các giao lộ trọng điểm dọc ROADS
  const crosswalkStripes = useMemo(() => {
    const list: Array<{ x: number; z: number; w: number; l: number; rotY: number }> = [];
    const addCrosswalk = (cx: number, cz: number, roadWidth: number, orientation: 'ns' | 'ew') => {
      const count = Math.max(4, Math.floor((roadWidth - 0.8) / 0.92));
      const span = (count - 1) * 0.92;
      for (let i = 0; i < count; i++) {
        const off = -span / 2 + i * 0.92;
        if (orientation === 'ew') {
          // Băng ngang qua trục Đông-Tây (các vạch xếp theo chiều Z)
          list.push({ x: cx, z: cz + off, w: 2.35, l: 0.46, rotY: 0 });
        } else {
          // Băng ngang qua trục Bắc-Nam (các vạch xếp theo chiều X)
          list.push({ x: cx + off, z: cz, w: 0.46, l: 2.35, rotY: 0 });
        }
      }
    };

    // 1. Đầu Cổng Parabol lên Đại lộ chính
    addCrosswalk(-83.5, -6, 8.2, 'ew');
    // 2. Ngã tư Quảng trường C1 (trên nhánh Bắc + hai bên trên đại lộ chính)
    addCrosswalk(-58, -12.6, 5.4, 'ns');
    addCrosswalk(-64.2, -6, 8.2, 'ew');
    addCrosswalk(-51.8, -6, 8.2, 'ew');
    // 3. Giao lộ Đường Tình Yêu – Thư viện TQB / Hồ Tiền (x = 24, z = -6)
    addCrosswalk(18.5, -6, 8.2, 'ew');
    addCrosswalk(29.5, -6, 8.2, 'ew');
    addCrosswalk(24, 1.5, 5.4, 'ns');
    // 4. Lối rẽ nhánh C7 / D3 & Cổng Trần Đại Nghĩa
    addCrosswalk(51.2, -6, 8.2, 'ew');
    addCrosswalk(56.2, -13.5, 5.4, 'ns');
    addCrosswalk(56.2, 2.2, 5.2, 'ns');
    addCrosswalk(91.5, -10.4, 5.0, 'ew');
    addCrosswalk(91.5, -1.6, 5.0, 'ew');
    return list;
  }, []);

  // Vạch tim đường nét đứt trên các trục chính (không chạm quảng trường hay ngã tư)
  const centerDashes = useMemo(() => {
    const dashes: Array<{ x: number; z: number; w: number; l: number }> = [];
    const ewSpans: Array<[number, number, number]> = [
      [-80.5, -66.5, -6],
      [-49.0, -40.5, -6],
      [-31.5, 16.0, -6],
      [32.5, 48.5, -6],
      [97.5, 112.0, -6],
    ];
    for (const [x0, x1, z] of ewSpans) {
      for (let x = x0 + 1.4; x <= x1 - 1.4; x += 3.8) {
        dashes.push({ x, z, w: 1.9, l: 0.14 });
      }
    }
    const nsSpans: Array<[number, number, number]> = [
      [24, -52.5, -11.5],
      [24, 4.5, 51.0],
      [56.2, -54.5, -16.0],
      [56.2, 5.0, 56.5],
    ];
    for (const [x, z0, z1] of nsSpans) {
      for (let z = z0 + 1.4; z <= z1 - 1.4; z += 3.8) {
        dashes.push({ x, z, w: 0.14, l: 1.85 });
      }
    }
    return dashes;
  }, []);

  // Song chắn rác gang thu nước mưa dọc hai bên rãnh đường
  const drains = useMemo(() => {
    const items: Array<{ x: number; z: number; rotY: number }> = [];
    for (let x = -76; x <= 48; x += 18) {
      if (Math.abs(x - -58) < 5 || Math.abs(x - -38) < 6 || Math.abs(x - 24) < 5) continue;
      items.push({ x, z: -9.78, rotY: 0 });
      items.push({ x, z: -2.22, rotY: 0 });
    }
    for (const z of [-46, -28, 12, 28, 44]) {
      items.push({ x: 21.62, z, rotY: Math.PI / 2 });
      items.push({ x: 53.95, z, rotY: Math.PI / 2 });
    }
    return items;
  }, []);

  // Các dải vỉa hè gạch block dọc các tuyến đường thoáng (y = 0,031)
  const sidewalks: Array<{ x: number; z: number; w: number; d: number }> = useMemo(
    () => [
      { x: -49.5, z: -11.15, w: 10.2, d: 1.4 }, // Bắc Đại lộ C1 -> Ngã 5
      { x: -6.5, z: -11.15, w: 50.0, d: 1.4 },  // Bắc Đại lộ Đường Tình Yêu (Ngã 5 -> đường x=24)
      { x: 40.5, z: -11.15, w: 26.0, d: 1.4 },  // Bắc Đại lộ đoạn Thư viện -> C7/D3
      { x: -62.0, z: -0.9, w: 34.0, d: 1.35 },  // Nam Đại lộ đối diện C9/C1
      { x: -5.5, z: -0.9, w: 52.0, d: 1.35 },   // Nam Đại lộ trước dải xanh Hồ Tiền
      { x: 40.5, z: -0.9, w: 25.0, d: 1.35 },   // Nam Đại lộ phía Bắc sân Thư viện
    ],
    [],
  );

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const qRotY = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();

    if (crosswalkRef.current) {
      crosswalkStripes.forEach((st, idx) => {
        pos.set(st.x, 0.026, st.z);
        scl.set(st.w, st.l, 1);
        m.compose(pos, q, scl);
        crosswalkRef.current!.setMatrixAt(idx, m);
      });
      crosswalkRef.current.instanceMatrix.needsUpdate = true;
    }

    if (centerLineRef.current) {
      centerDashes.forEach((ds, idx) => {
        pos.set(ds.x, 0.025, ds.z);
        scl.set(ds.w, ds.l, 1);
        m.compose(pos, q, scl);
        centerLineRef.current!.setMatrixAt(idx, m);
      });
      centerLineRef.current.instanceMatrix.needsUpdate = true;
    }

    if (drainRef.current) {
      drains.forEach((dr, idx) => {
        qRotY.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, dr.rotY));
        pos.set(dr.x, 0.0245, dr.z);
        scl.set(0.68, 0.42, 1);
        m.compose(pos, qRotY, scl);
        drainRef.current!.setMatrixAt(idx, m);
      });
      drainRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [crosswalkStripes, centerDashes, drains]);

  return (
    <group name="CampusStreetscapeDetails">
      <instancedMesh
        ref={crosswalkRef}
        args={[assets.stripeGeo, assets.zebraMat, crosswalkStripes.length]}
        receiveShadow
      />
      <instancedMesh
        ref={centerLineRef}
        args={[assets.stripeGeo, assets.lineMat, centerDashes.length]}
        receiveShadow
      />
      <instancedMesh
        ref={drainRef}
        args={[assets.stripeGeo, assets.drainMat, drains.length]}
        receiveShadow
      />
      {sidewalks.map((sw, idx) => (
        <mesh
          key={`sidewalk-strip-${idx}`}
          rotation-x={-Math.PI / 2}
          position={[sw.x, 0.031, sw.z]}
          receiveShadow
        >
          <planeGeometry args={[sw.w, sw.d]} />
          <meshStandardMaterial
            color="#FFFFFF"
            map={assets.sidewalk.map}
            bumpMap={assets.sidewalk.bumpMap}
            bumpScale={0.012}
            roughness={0.88}
          />
        </mesh>
      ))}
    </group>
  );
}

function FallenLipaLeaves() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const assets = useMemo(
    () => createAutumnLeafAssets({ curvature: 0.45, minYFloor: 0.002, roughness: 0.85 }),
    [],
  );

  useEffect(
    () => () => {
      assets.geo.dispose();
      assets.mat.dispose();
      assets.map.dispose();
      assets.bumpMap.dispose();
    },
    [assets],
  );

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    const col = new THREE.Color();

    FALLEN_LEAVES.forEach((lf, idx) => {
      e.set(lf.tiltX, lf.rotY, lf.tiltZ);
      q.setFromEuler(e);
      v.set(lf.x, lf.y, lf.z);
      const scale = lf.r / 0.095;
      s.set(scale, scale, scale);
      m.compose(v, q, s);
      mesh.setMatrixAt(idx, m);
      col.set(lf.color);
      mesh.setColorAt(idx, col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  return <instancedMesh ref={ref} args={[assets.geo, assets.mat, FALLEN_LEAVES.length]} receiveShadow />;
}

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
      {/* Cỏ khuôn viên: mặt phẳng 220 × 190 tại y = 0, có vân cỏ tự nhiên + bumpMap. */}
      <mesh rotation-x={-Math.PI / 2} position={GRASS_CENTER} receiveShadow>
        <planeGeometry args={GRASS_SIZE} />
        <meshStandardMaterial
          color={GRASS_COLOR}
          map={textures.grass}
          bumpMap={textures.grass}
          bumpScale={0.008}
          roughness={0.96}
          metalness={0}
        />
      </mesh>
      <GrassAndFlowerTufts />
      <CampusStreetscapeDetails />

      {/* Các tuyến phố bên ngoài rìa Đông (Trần Đại Nghĩa, Tạ Quang Bửu, Lê Thanh Nghị) và sân trước cầu thang C9 (y = 0,012). */}
      {[
        { cx: 95.5, cz: -18, w: 6.0, d: 112, rotY: 0 }, // Phố Trần Đại Nghĩa phía ngoài cổng trường
        { cx: 127.8, cz: -18, w: 5.2, d: 108, rotY: 0 }, // Phố Tạ Quang Bửu chia đôi Khu KTX Bách Khoa & B1 / A1-5 – A17
        { cx: 120, cz: 58, w: 58, d: 5.2, rotY: 0.62 }, // Phố Lê Thanh Nghị chéo Tây-Nam → Đông-Bắc tách Khu Thể thao & SVĐ
        { cx: -61.5, cz: -17, w: 7.0, d: 9.0, rotY: 0 }, // Khoảng sân lát đá nối trục C1 vào chân cầu thang đỏ tòa C9
      ].map((p, idx) => (
        <group key={`sub-walkway-${idx}`} position={[p.cx, 0.012, p.cz]} rotation-y={p.rotY}>
          <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[p.w, p.d]} />
            <meshStandardMaterial
              color="#D2CEC4"
              map={textures.c1Stone}
              roughness={0.9}
              metalness={0}
            />
          </mesh>
        </group>
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
          position={[j.cx, C1_JOINT_Y, -35.8]}
          receiveShadow
        >
          <planeGeometry args={[C1_JOINT_W, j.len]} />
          <meshStandardMaterial color={C1_JOINT_COLOR} roughness={0.95} metalness={0} />
        </mesh>
      ))}

      {/* Lá vàng Lipa 3D rụng rải rác bám sát bề mặt bồn cỏ & mặt sân C1. */}
      <FallenLipaLeaves />

      {/* Các bồn cỏ đối xứng trên Quảng trường C1: viền bê tông + hộp cỏ thấp. */}
      {C1_GRASS_BEDS.map((b, i) => (
        <group key={`c1-bed-${i}`}>
          <mesh position={[b.cx, 0.05, b.cz]} castShadow receiveShadow>
            <boxGeometry args={[b.w + 0.2, 0.06, b.d + 0.2]} />
            <meshStandardMaterial color={GRASS_BED_EDGE} roughness={0.95} metalness={0} />
          </mesh>
          <mesh position={[b.cx, 0.11, b.cz]} castShadow receiveShadow>
            <boxGeometry args={[b.w, 0.18, b.d]} />
            <meshStandardMaterial color={GRASS_BED_COLOR} roughness={0.95} metalness={0} />
          </mesh>
        </group>
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
