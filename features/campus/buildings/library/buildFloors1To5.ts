// ---------------------------------------------------------------------------
// buildFloors1To5.ts — Khối A: Đại sảnh thông tầng 5 tầng (Stadium Atrium Tầng 1–5),
// Phòng Mượn Sách tầng 1, hành lang tự học tầng 2–3 và 11 Phòng đọc tầng 4–5
// (401, 402, 404, 411, 418, 419, 501, 509, 511, 518, 525, 526).
// Chuyển thể chuẩn 1:1 từ mô hình thủ tục studywithhuster.cyou (moduleA).
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { buildRoom401, type Room401Controller } from './buildRoom401';
import { canvasTex, lin, mulberry32 } from './procedural-helpers';
import {
  createLibraryLocation,
  evaluateCurvedStairAt,
  getBlockAFurniturePlacements,
  queryLibraryGround,
  resolveLibraryMovement,
  sanitizeLibraryFloor,
  type LibraryFloor,
  type LibraryFurniturePlacement,
  type LibraryFurniturePropKind,
} from '../../world-data/library-spatial';

export interface CompositePropBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  maxRadiusXZ: number;
}

/**
 * Builds the exact Three.js composite geometry parts (`BufferGeometry` + local
 * `Matrix4`) for `chairR`, `table4` (table + 4 chairs), `round4` (round table +
 * 4 chairs), `armchair`, `sofa` (sofa + coffee table), and `shelf`.
 * Used by regression tests to verify that collision footprints match actual
 * composite Three.js mesh bounds 1:1.
 */
export function buildFurnitureCompositeGeometries(): Record<
  LibraryFurniturePropKind | 'chairR',
  Array<{ g: THREE.BufferGeometry; l: THREE.Matrix4 }>
> {
  const composeMat = (
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
    sx = 1,
    sy = 1,
    sz = 1,
  ) =>
    new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(sx, sy, sz),
    );
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const cylCache: Record<string, THREE.BufferGeometry> = {};
  const defs: Record<string, Array<{ g: THREE.BufferGeometry; l: THREE.Matrix4 }>> = {};
  let cParts: Array<{ g: THREE.BufferGeometry; l: THREE.Matrix4 }> | null = null;

  const defineProp = (name: string, fn: () => void) => {
    cParts = defs[name] = [];
    fn();
    cParts = null;
  };
  const pBox = (w: number, h: number, d: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    cParts!.push({ g: unitBox, l: composeMat(x, y, z, rx, ry, rz, w, h, d) });
  };
  const pCyl = (rt: number, rb: number, h: number, s: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const useUnit = Math.abs(rt - rb) < 1e-6;
    const g = useUnit
      ? (cylCache[`uc_${s}`] ??= new THREE.CylinderGeometry(1, 1, 1, s))
      : (cylCache[`c_${rt}_${rb}_${h}_${s}`] ??= new THREE.CylinderGeometry(rt, rb, h, s));
    const l = useUnit ? composeMat(x, y, z, rx, ry, rz, rt, h, rt) : composeMat(x, y, z, rx, ry, rz);
    cParts!.push({ g, l });
  };

  defineProp('chairR', () => {
    pBox(0.46, 0.05, 0.44, 0, 0.45, 0);
    pBox(0.44, 0.42, 0.05, 0, 0.68, -0.2, 0.08);
    for (const [lx, lz] of [
      [-0.19, -0.18],
      [0.19, -0.18],
      [-0.19, 0.18],
      [0.19, 0.18],
    ]) {
      pCyl(0.018, 0.018, 0.44, 6, lx, 0.22, lz);
    }
  });
  defineProp('table4', () => {
    pBox(1.5, 0.05, 0.85, 0, 0.74, 0);
    pBox(1.46, 0.03, 0.81, 0, 0.71, 0);
    for (const [lx, lz] of [
      [-0.68, -0.36],
      [0.68, -0.36],
      [-0.68, 0.36],
      [0.68, 0.36],
    ]) {
      pCyl(0.025, 0.025, 0.72, 6, lx, 0.36, lz);
    }
    for (const [cx, cz, ry] of [
      [-0.42, -0.56, 0],
      [0.42, -0.56, 0],
      [-0.42, 0.56, Math.PI],
      [0.42, 0.56, Math.PI],
    ]) {
      const xf = composeMat(cx, 0, cz, 0, ry, 0);
      for (const p of defs.chairR) cParts!.push({ g: p.g, l: xf.clone().multiply(p.l) });
    }
  });
  defineProp('round4', () => {
    pCyl(0.62, 0.62, 0.05, 18, 0, 0.74, 0);
    pCyl(0.06, 0.06, 0.7, 10, 0, 0.36, 0);
    pCyl(0.34, 0.36, 0.03, 14, 0, 0.02, 0);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const xf = composeMat(Math.cos(a) * 0.82, 0, Math.sin(a) * 0.82, 0, -a - Math.PI / 2, 0);
      for (const p of defs.chairR) cParts!.push({ g: p.g, l: xf.clone().multiply(p.l) });
    }
  });
  defineProp('armchair', () => {
    pBox(0.76, 0.36, 0.72, 0, 0.22, 0);
    pBox(0.76, 0.44, 0.16, 0, 0.56, -0.28);
    pBox(0.13, 0.34, 0.72, -0.32, 0.42, 0);
    pBox(0.13, 0.34, 0.72, 0.32, 0.42, 0);
    pBox(0.5, 0.08, 0.54, 0, 0.42, 0.04);
  });
  defineProp('sofa', () => {
    pBox(1.85, 0.36, 0.78, 0, 0.22, 0);
    pBox(1.85, 0.46, 0.16, 0, 0.58, -0.31);
    pBox(0.14, 0.36, 0.78, -0.86, 0.42, 0);
    pBox(0.14, 0.36, 0.78, 0.86, 0.42, 0);
    pBox(1.56, 0.08, 0.58, 0, 0.42, 0.04);
    pBox(0.95, 0.04, 0.52, 0, 0.42, 0.92);
    pCyl(0.03, 0.03, 0.4, 8, -0.38, 0.2, 0.92);
    pCyl(0.03, 0.03, 0.4, 8, 0.38, 0.2, 0.92);
  });
  defineProp('shelf', () => {
    const w = 2.4;
    const h = 2.15;
    const d = 0.42;
    pBox(w, h, 0.04, 0, h / 2, -d / 2);
    pBox(0.05, h, d, -w / 2, h / 2, 0);
    pBox(0.05, h, d, w / 2, h / 2, 0);
    pBox(0.04, h, d - 0.02, 0, h / 2, 0);
  });

  return defs as Record<
    LibraryFurniturePropKind | 'chairR',
    Array<{ g: THREE.BufferGeometry; l: THREE.Matrix4 }>
  >;
}

/**
 * Computes exact local-space bounding box and radial extent from the composite
 * Three.js vertex geometry of each Block A furniture prop (`table4`, `round4`,
 * `sofa`, `armchair`, `shelf`).
 */
export function computeCompositePropBounds(
  prop: LibraryFurniturePropKind,
): CompositePropBounds {
  const defs = buildFurnitureCompositeGeometries();
  const box = new THREE.Box3();
  let maxR = 0;
  const v = new THREE.Vector3();
  for (const { g, l } of defs[prop]) {
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(l);
      box.expandByPoint(v);
      const r = Math.hypot(v.x, v.z);
      if (r > maxR) maxR = r;
    }
  }
  return {
    minX: Number(box.min.x.toFixed(4)),
    maxX: Number(box.max.x.toFixed(4)),
    minY: Number(box.min.y.toFixed(4)),
    maxY: Number(box.max.y.toFixed(4)),
    minZ: Number(box.min.z.toFixed(4)),
    maxZ: Number(box.max.z.toFixed(4)),
    maxRadiusXZ: Number(maxR.toFixed(4)),
  };
}

/**
 * Computes the exact world-space `THREE.Box3` of a placed composite furniture
 * prop (`table4`, `round4`, `sofa`, `armchair`, `shelf`) at `(x, y, z, ry)`.
 */
export function computePlacedPropWorldBounds(
  placement: LibraryFurniturePlacement,
): CompositePropBounds {
  const defs = buildFurnitureCompositeGeometries();
  const placeMat = new THREE.Matrix4().compose(
    new THREE.Vector3(placement.x, placement.y, placement.z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, placement.ry, 0)),
    new THREE.Vector3(1, 1, 1),
  );
  const box = new THREE.Box3();
  let maxR = 0;
  const v = new THREE.Vector3();
  const worldMat = new THREE.Matrix4();
  for (const { g, l } of defs[placement.prop]) {
    worldMat.multiplyMatrices(placeMat, l);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(worldMat);
      box.expandByPoint(v);
      const r = Math.hypot(v.x - placement.x, v.z - placement.z);
      if (r > maxR) maxR = r;
    }
  }
  return {
    minX: Number(box.min.x.toFixed(4)),
    maxX: Number(box.max.x.toFixed(4)),
    minY: Number(box.min.y.toFixed(4)),
    maxY: Number(box.max.y.toFixed(4)),
    minZ: Number(box.min.z.toFixed(4)),
    maxZ: Number(box.max.z.toFixed(4)),
    maxRadiusXZ: Number(maxR.toFixed(4)),
  };
}

export interface ElevatorCarState {
  z: number;
  cab: THREE.Group;
  y: number;
  vy: number;
  floor: number;
  target: number;
  open: number;
  state: 'idle' | 'closing' | 'moving' | 'opening' | 'open';
  timer: number;
  doors: Record<number, { l: THREE.Mesh; r: THREE.Mesh }>;
  cabDL: THREE.Mesh;
  cabDR: THREE.Mesh;
}

export interface Floors1To5Controller {
  elevators: ElevatorCarState[];
  callLift: (floor: number, preferIdx?: number) => number;
  sendLift: (idx: number, targetFloor: number) => void;
  insideCab: (x: number, z: number) => number;
  nearShaft: (x: number, z: number) => number;
  stairAt: (x: number, z: number) => { y: number } | null;
  surface: (x: number, z: number, curY: number) => { ok: boolean; y: number };
  update: (dt: number, px: number, py: number, pz: number, activeFloor?: number) => void;
}

const BOOK_PAL = [
  0x8b2635, 0x1f4e79, 0x2e6f40, 0xb5651d, 0x5b3256, 0x3d5a80,
  0x9a6b2f, 0x6d2e46, 0x264653, 0xa44a3f, 0x3b5249, 0xc49a3c,
];

export function buildFloors1To5(world: THREE.Group): Floors1To5Controller {
  const XW = 19.5;
  const ZB = -13;
  const ZF = 13;
  const FH = 4.5;
  const NF = 5;
  const H = FH * NF;
  const L = 6.5;
  const FR = 7.5;
  const PR = 7.38;
  const R4Z = -23.8;
  const R4H = 3.72;
  const R4DX = -10.8;
  const R4DW = 2.64;
  const BRM = { x0: -26, x1: -XW, z0: -2.2, z1: 5.8, h: 4.1, zc: 1.8, dw: 5.4, dh: 3.15 };

  const stadAt = (s: number, r: number): [number, number] => {
    const seg = L * 2;
    const arc = Math.PI * r;
    const per = 2 * (seg + arc);
    let u = ((s % 1) + 1) % 1 * per;
    if (u < seg) return [-L + u, -r];
    u -= seg;
    if (u < arc) {
      const a = -Math.PI / 2 + u / r;
      return [L + r * Math.cos(a), r * Math.sin(a)];
    }
    u -= arc;
    if (u < seg) return [L - u, r];
    u -= seg;
    const a = Math.PI / 2 + u / r;
    return [-L + r * Math.cos(a), r * Math.sin(a)];
  };
  const sOf = (x: number, z: number, r = FR) => {
    const seg = L * 2;
    const arc = Math.PI * r;
    const per = 2 * (seg + arc);
    if (x >= -L && x <= L && z < 0) return (x + L) / per;
    if (x > L) {
      let a = Math.atan2(z, x - L);
      if (a < -Math.PI / 2) a += Math.PI * 2;
      return (seg + (a + Math.PI / 2) * r) / per;
    }
    if (x >= -L && x <= L) return (seg + arc + (L - x)) / per;
    let a = Math.atan2(z, x + L);
    if (a < 0) a += Math.PI * 2;
    return (2 * seg + arc + (a - Math.PI / 2) * r) / per;
  };
  const atQ = (x: number, z: number) => {
    const cx = Math.max(-L, Math.min(L, x));
    const dx = x - cx;
    return { cx, dx, d: Math.hypot(dx, z), a: Math.atan2(z, dx) };
  };
  const ryOf = (x: number, z: number) => Math.atan2(-atQ(x, z).dx, -z);
  const inside = (x: number, z: number, r: number) => atQ(x, z).d < r;

  const G = (p: THREE.Object3D = world, x = 0, y = 0, z = 0, ry = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    if (ry) g.rotation.y = ry;
    p.add(g);
    return g;
  };
  const mk = (
    geo: THREE.BufferGeometry,
    m: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
    p: THREE.Object3D = world,
  ) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    if (rx || ry || rz) o.rotation.set(rx, ry, rz);
    p.add(o);
    return o;
  };

  const gCache: Record<string, THREE.BufferGeometry> = {};
  const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
  const mCache: Record<string, THREE.MeshStandardMaterial> = {};
  const mat = (c: number, r = 0.6, m = 0, ex?: THREE.MeshStandardMaterialParameters) => {
    const k = ex ? `${c}_${r}_${m}_${JSON.stringify(ex)}` : `${c}_${r}_${m}`;
    return (mCache[k] ??= new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...ex }));
  };
  const box = (
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
    p: THREE.Object3D = world,
  ) => {
    const hasMap = Boolean((m as { map?: unknown }).map);
    const geo = hasMap ? (gCache[`b_${w}_${h}_${d}`] ??= new THREE.BoxGeometry(w, h, d)) : UNIT_BOX;
    const mesh = mk(geo, m, x, y, z, rx, ry, rz, p);
    if (!hasMap) mesh.scale.set(w, h, d);
    return mesh;
  };
  const cyl = (
    rt: number,
    rb: number,
    h: number,
    s: number,
    m: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
    p: THREE.Object3D = world,
  ) => {
    const hasMap = Boolean((m as { map?: unknown }).map);
    const useUnit = !hasMap && Math.abs(rt - rb) < 1e-6;
    const geo = useUnit
      ? (gCache[`uc_${s}`] ??= new THREE.CylinderGeometry(1, 1, 1, s))
      : (gCache[`c_${rt}_${rb}_${h}_${s}`] ??= new THREE.CylinderGeometry(rt, rb, h, s));
    const mesh = mk(geo, m, x, y, z, rx, ry, rz, p);
    if (useUnit) mesh.scale.set(rt, h, rt);
    return mesh;
  };

  // Hệ thống gộp InstancedMesh cho nội thất lặp lại
  const P_DEFS: Record<string, Array<{ g: THREE.BufferGeometry; m: THREE.Material; l: THREE.Matrix4 }>> = {};
  const P_XF: Record<string, THREE.Matrix4[]> = {};
  let cParts: Array<{ g: THREE.BufferGeometry; m: THREE.Material; l: THREE.Matrix4 }> | null = null;
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _v = new THREE.Vector3();
  const _s = new THREE.Vector3(1, 1, 1);
  const compose = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    new THREE.Matrix4().compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
  const defineProp = (name: string, fn: () => void) => {
    cParts = P_DEFS[name] = [];
    P_XF[name] = [];
    fn();
    cParts = null;
  };
  const pBox = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const hasMap = Boolean((m as { map?: unknown }).map);
    const g = hasMap ? (gCache[`b_${w}_${h}_${d}`] ??= new THREE.BoxGeometry(w, h, d)) : UNIT_BOX;
    const l = hasMap ? compose(x, y, z, rx, ry, rz) : compose(x, y, z, rx, ry, rz, w, h, d);
    cParts!.push({ g, m, l });
  };
  const pCyl = (rt: number, rb: number, h: number, s: number, m: THREE.Material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const hasMap = Boolean((m as { map?: unknown }).map);
    const useUnit = !hasMap && Math.abs(rt - rb) < 1e-6;
    const g = useUnit
      ? (gCache[`uc_${s}`] ??= new THREE.CylinderGeometry(1, 1, 1, s))
      : (gCache[`c_${rt}_${rb}_${h}_${s}`] ??= new THREE.CylinderGeometry(rt, rb, h, s));
    const l = useUnit ? compose(x, y, z, rx, ry, rz, rt, h, rt) : compose(x, y, z, rx, ry, rz);
    cParts!.push({ g, m, l });
  };
  const pMesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    cParts!.push({ g, m, l: compose(x, y, z, rx, ry, rz, sx, sy, sz) });
  const place = (name: string, x = 0, y = 0, z = 0, ry = 0) => P_XF[name].push(compose(x, y, z, 0, ry, 0));
  const buildProps = (targetGroup: THREE.Object3D = world) => {
    const merged = new Map<
      string,
      { g: THREE.BufferGeometry; m: THREE.Material; mats: THREE.Matrix4[] }
    >();
    for (const k in P_DEFS) {
      const xfs = P_XF[k];
      const n = xfs.length;
      if (!n) continue;
      for (const { g, m, l } of P_DEFS[k]) {
        const key = `${g.uuid}_${m.uuid}`;
        let bucket = merged.get(key);
        if (!bucket) {
          bucket = { g, m, mats: [] };
          merged.set(key, bucket);
        }
        for (let i = 0; i < n; i++) {
          bucket.mats.push(new THREE.Matrix4().multiplyMatrices(xfs[i], l));
        }
      }
      P_XF[k] = [];
    }
    merged.forEach(({ g, m, mats }) => {
      const count = mats.length;
      if (!count) return;
      const im = new THREE.InstancedMesh(g, m, count);
      for (let i = 0; i < count; i++) {
        im.setMatrixAt(i, mats[i]);
      }
      im.instanceMatrix.needsUpdate = true;
      targetGroup.add(im);
    });
  };

  const ribbon = (pts: Array<[number, number]>, r0: number, r1: number, y0: number, y1: number, m: THREE.Material, p: THREE.Object3D = world) => {
    const pos: number[] = [];
    const idx: number[] = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const [x, z] = pts[i];
      const { cx, dx } = atQ(x, z);
      const len = Math.hypot(dx, z) || 1;
      const nx = dx / len;
      const nz = z / len;
      pos.push(
        cx + nx * r0, y0, nz * r0,
        cx + nx * r1, y0, nz * r1,
        cx + nx * r1, y1, nz * r1,
        cx + nx * r0, y1, nz * r0,
      );
    }
    const q = (a: number, b: number, c: number, d: number) => idx.push(a, b, c, a, c, d);
    for (let i = 0; i < n - 1; i++) {
      const A = i * 4;
      const B = A + 4;
      q(A + 3, B + 3, B + 2, A + 2);
      q(A, A + 1, B + 1, B);
      q(A, B, B + 3, A + 3);
      q(A + 1, A + 2, B + 2, B + 1);
    }
    q(0, 3, 2, 1);
    const L0 = (n - 1) * 4;
    q(L0, L0 + 1, L0 + 2, L0 + 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return mk(geo, m, 0, 0, 0, 0, 0, 0, p);
  };

  const stadPts = (r: number, seg = 72) => Array.from({ length: seg + 1 }, (_, i) => stadAt(i / seg, r));
  const stadRing = (r0: number, r1: number, y0: number, y1: number, m: THREE.Material, seg = 72) =>
    ribbon(stadPts(r0, seg), r0, r1, y0, y1, m);
  const arcRun = (s0: number, s1: number, r0: number, r1: number, y0: number, y1: number, m: THREE.Material, seg = 24) =>
    ribbon(
      Array.from({ length: seg + 1 }, (_, i) => stadAt(s0 + (s1 - s0) * (i / seg), (r0 + r1) / 2)),
      r0,
      r1,
      y0,
      y1,
      m,
    );
  const stadHolePath = (r: number) => {
    const h = new THREE.Path();
    h.moveTo(-L, -r);
    h.lineTo(L, -r);
    h.absarc(L, 0, r, -Math.PI / 2, Math.PI / 2, false);
    h.lineTo(-L, r);
    h.absarc(-L, 0, r, Math.PI / 2, (Math.PI * 3) / 2, false);
    return h;
  };
  const stadShape = (r: number) => {
    const s = new THREE.Shape();
    s.moveTo(-L, -r);
    s.lineTo(L, -r);
    s.absarc(L, 0, r, -Math.PI / 2, Math.PI / 2, false);
    s.lineTo(-L, r);
    s.absarc(-L, 0, r, Math.PI / 2, (Math.PI * 3) / 2, false);
    return s;
  };
  const stadFlat = (r: number, y: number, m: THREE.Material) => {
    const g = new THREE.ShapeGeometry(stadShape(r), 72);
    g.rotateX(-Math.PI / 2);
    return mk(g, m, 0, y, 0);
  };

  // Vật liệu
  const M_WALL = mat(0xf4f0e8, 0.82);
  const M_WALL2 = mat(0xebe5d9, 0.85);
  const M_COL = mat(0xf7f4ee, 0.72);
  const M_CEIL = mat(0xf6f3ec, 0.9);
  const M_TRIM = mat(0xd8d1c3, 0.75);
  const M_PARA = mat(0xf5f1e9, 0.78);
  const M_WOOD_D = mat(0x3e2415, 0.45, 0.08);
  const M_WOOD_M = mat(0x8c5a32, 0.52, 0.06);
  const M_WOOD_L = mat(0xc99b68, 0.55, 0.05);
  const M_CHR = mat(0xcfd4da, 0.22, 0.88);
  const M_STL = mat(0x8c939c, 0.3, 0.82);
  const M_DRK = mat(0x23262b, 0.4, 0.75);
  const M_RED = mat(0x8e2420, 0.48);
  const M_HUST = mat(0xa61c1c, 0.42);
  const M_CHAR = mat(0x2a2d32, 0.55);
  const M_GLS = new THREE.MeshStandardMaterial({ color: 0xcfe7f5, transparent: true, opacity: 0.34, roughness: 0.1, metalness: 0.12 });
  const M_MIR = mat(0x9bb0c4, 0.12, 0.92);
  const M_LGT = new THREE.MeshBasicMaterial({ color: 0xfff8e7 });
  const M_LED = new THREE.MeshBasicMaterial({ color: 0xffe6b0 });
  const M_SCR = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const M_LEAF = mat(0x2f6b34, 0.65);
  const M_POT = mat(0x4a3423, 0.7);
  const M_GOLD = mat(0xd4a937, 0.3, 0.82);
  const M_BRZ = mat(0x8c6239, 0.38, 0.75);

  const tileTex = (bg: string, gr: string, a: string, b: string, rep: number) =>
    canvasTex(
      256,
      256,
      (c) => {
        c.fillStyle = bg;
        c.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 4; y++) {
          for (let x = 0; x < 4; x++) {
            c.fillStyle = (x + y) & 1 ? a : b;
            c.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
          }
        }
        c.strokeStyle = gr;
        c.lineWidth = 2;
        for (let i = 0; i <= 4; i++) {
          c.beginPath();
          c.moveTo(i * 64, 0);
          c.lineTo(i * 64, 256);
          c.moveTo(0, i * 64);
          c.lineTo(256, i * 64);
          c.stroke();
        }
      },
      rep,
      rep,
    );

  const whiteTex = tileTex('#eeebe3', '#d4cec2', '#f3f0e8', '#ebe7de', 18);
  const redTex = tileTex('#8d2b24', '#6b1d17', '#943028', '#862620', 14);
  const starTex = canvasTex(1024, 1024, (c) => {
    const cx = 512;
    const cy = 512;
    c.fillStyle = '#8d2b24';
    c.fillRect(0, 0, 1024, 1024);
    c.strokeStyle = 'rgba(235,220,195,0.22)';
    c.lineWidth = 2;
    for (let i = -1024; i < 2048; i += 64) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i + 1024, 1024);
      c.moveTo(i, 1024);
      c.lineTo(i + 1024, 0);
      c.stroke();
    }
    const ring = (r: number, col: string, w: number) => {
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.strokeStyle = col;
      c.lineWidth = w;
      c.stroke();
    };
    ring(465, '#f2ede2', 22);
    ring(438, '#2b2623', 8);
    ring(420, '#d8cfb8', 14);
    c.save();
    c.translate(cx, cy);
    for (let i = 0; i < 36; i++) {
      const a0 = (i / 36) * Math.PI * 2;
      const a1 = ((i + 0.6) / 36) * Math.PI * 2;
      c.beginPath();
      c.arc(0, 0, 400, a0, a1);
      c.strokeStyle = '#f2ede2';
      c.lineWidth = 14;
      c.stroke();
    }
    const star = (pts: number, rO: number, rI: number, fill: string, str?: string) => {
      for (let i = 0; i < pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        const aL = a - Math.PI / pts;
        const aR = a + Math.PI / pts;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(Math.cos(aL) * rI, Math.sin(aL) * rI);
        c.lineTo(Math.cos(a) * rO, Math.sin(a) * rO);
        c.closePath();
        c.fillStyle = fill;
        c.fill();
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(Math.cos(a) * rO, Math.sin(a) * rO);
        c.lineTo(Math.cos(aR) * rI, Math.sin(aR) * rI);
        c.closePath();
        c.fillStyle = str || fill;
        c.fill();
      }
    };
    star(16, 385, 165, '#e8e0cf', '#cfc5b0');
    c.rotate(Math.PI / 8);
    star(8, 340, 130, '#8d2b24', '#6e1e18');
    c.rotate(-Math.PI / 8);
    star(8, 250, 95, '#f5f0e4', '#d9d0bc');
    c.restore();
    ring(95, '#8d2b24', 18);
    c.beginPath();
    c.arc(cx, cy, 78, 0, Math.PI * 2);
    c.fillStyle = '#f3eee2';
    c.fill();
    c.beginPath();
    c.arc(cx, cy, 36, 0, Math.PI * 2);
    c.fillStyle = '#8d2b24';
    c.fill();
  });

  const sunTex = canvasTex(1024, 512, (c) => {
    const g = c.createRadialGradient(512, 256, 20, 512, 256, 500);
    g.addColorStop(0, '#fffdf5');
    g.addColorStop(0.22, '#fde68a');
    g.addColorStop(0.5, '#f59e0b');
    g.addColorStop(0.78, '#b45309');
    g.addColorStop(1, '#78350f');
    c.fillStyle = g;
    c.fillRect(0, 0, 1024, 512);
    c.save();
    c.translate(512, 256);
    for (let i = 0; i < 48; i++) {
      c.rotate((Math.PI * 2) / 48);
      c.beginPath();
      c.moveTo(60, 0);
      c.lineTo(480, -10);
      c.lineTo(480, 10);
      c.closePath();
      c.fillStyle = i & 1 ? 'rgba(255,245,200,0.28)' : 'rgba(180,83,9,0.22)';
      c.fill();
    }
    c.restore();
  });

  // Sàn tầng 1: gạch trắng + sân vận động đỏ + ngôi sao 16 cánh ở tâm
  const M_FLR_W = new THREE.MeshStandardMaterial({ map: whiteTex, roughness: 0.25, metalness: 0.08 });
  const M_FLR_R = new THREE.MeshStandardMaterial({ map: redTex, roughness: 0.28, metalness: 0.08 });
  const M_STAR = new THREE.MeshStandardMaterial({ map: starTex, roughness: 0.22, metalness: 0.1 });
  mk(new THREE.PlaneGeometry(XW * 2, ZF - ZB), M_FLR_W, 0, 0, (ZF + ZB) / 2, -Math.PI / 2);
  stadFlat(FR + 1.6, 0.006, M_TRIM);
  stadFlat(FR + 1.35, 0.01, M_FLR_R);
  mk(new THREE.CircleGeometry(5.6, 64), M_STAR, 0, 0.015, 0, -Math.PI / 2);

  // Sàn các tầng 2–5 + Lan can thông tầng
  const slabGeo = (() => {
    const s = new THREE.Shape();
    s.moveTo(-XW, ZB);
    s.lineTo(XW, ZB);
    s.lineTo(XW, ZF);
    s.lineTo(-XW, ZF);
    s.closePath();
    s.holes.push(stadHolePath(FR));
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.32, bevelEnabled: false, curveSegments: 36 });
    g.rotateX(-Math.PI / 2);
    return g;
  })();
  const flrRingGeo = (() => {
    const s = new THREE.Shape();
    s.moveTo(-XW + 0.15, ZB + 0.15);
    s.lineTo(XW - 0.15, ZB + 0.15);
    s.lineTo(XW - 0.15, ZF - 0.15);
    s.lineTo(-XW + 0.15, ZF - 0.15);
    s.closePath();
    s.holes.push(stadHolePath(FR + 0.05));
    const g = new THREE.ShapeGeometry(s, 36);
    g.rotateX(-Math.PI / 2);
    return g;
  })();

  const S2R0 = 0.245;
  const S2R1 = 0.295;
  const S2L0 = 0.745;
  const S2L1 = 0.795;
  for (let f = 1; f < NF; f++) {
    const y = f * FH;
    mk(slabGeo, M_CEIL, 0, y - 0.32, 0);
    mk(flrRingGeo, M_FLR_W, 0, y + 0.005, 0);
    stadRing(PR, FR, y - 0.32, y + 0.12, M_TRIM);
    if (f === 1) {
      for (const [a, b] of [
        [0, S2R0],
        [S2R1, S2L0],
        [S2L1, 1],
      ]) {
        arcRun(a, b, PR, FR, y, y + 1.05, M_PARA, 48);
        arcRun(a, b, PR - 0.03, FR + 0.03, y + 1.05, y + 1.13, M_WOOD_D, 48);
      }
    } else {
      stadRing(PR, FR, y, y + 1.05, M_PARA);
      stadRing(PR - 0.03, FR + 0.03, y + 1.05, y + 1.13, M_WOOD_D);
    }
    stadRing(FR - 0.08, FR + 0.02, y - 0.28, y - 0.22, M_LED);
  }

  // Trần tầng 5 + Tranh vòm Mặt trời thông tầng
  box(XW * 2, 0.35, ZF - ZB, M_CEIL, 0, H + 0.17, (ZF + ZB) / 2);
  stadRing(FR, FR + 0.55, H - 0.55, H + 0.02, M_WALL);
  stadRing(FR - 0.05, FR + 0.05, H - 0.56, H - 0.48, M_LED);
  const ovalG = G(world, 0, H - 0.02, 0);
  const rimG = new THREE.RingGeometry(4.9, 5.4, 64);
  rimG.rotateX(Math.PI / 2);
  rimG.scale(1.95, 1, 0.92);
  mk(rimG, M_WOOD_D, 0, 0, 0, 0, 0, 0, ovalG);
  const sunG = new THREE.CircleGeometry(4.95, 64);
  sunG.rotateX(Math.PI / 2);
  sunG.scale(1.95, 1, 0.92);
  mk(sunG, new THREE.MeshBasicMaterial({ map: sunTex }), 0, 0.01, 0, 0, 0, 0, ovalG);

  // 8 cột thông tầng lớn
  const COLS: Array<[number, number]> = [
    [-L - FR * 0.98, 0],
    [L + FR * 0.98, 0],
    [-L, -FR - 0.3],
    [0, -FR - 0.3],
    [L, -FR - 0.3],
    [-L, FR + 0.3],
    [0, FR + 0.3],
    [L, FR + 0.3],
  ];
  for (const [cx, cz] of COLS) {
    cyl(0.42, 0.42, H, 24, M_COL, cx, H / 2, cz);
    cyl(0.5, 0.52, 0.18, 24, M_TRIM, cx, 0.09, cz);
  }

  // Đèn âm trần InstancedMesh cho 5 tầng
  {
    const pts: Array<[number, number, number]> = [];
    for (let f = 1; f <= NF; f++) {
      const cy = f * FH - 0.33;
      for (let x = -17; x <= 17; x += 3.4) {
        for (let z = -11.5; z <= 11.5; z += 3.3) {
          if (!inside(x, z, FR + 0.9)) pts.push([x, cy, z]);
        }
      }
    }
    const rG = new THREE.CylinderGeometry(0.16, 0.16, 0.02, 12);
    const dG = new THREE.CylinderGeometry(0.12, 0.12, 0.025, 12);
    const rI = new THREE.InstancedMesh(rG, M_CHR, pts.length);
    const dI = new THREE.InstancedMesh(dG, M_LGT, pts.length);
    pts.forEach(([x, y, z], i) => {
      _m.makeTranslation(x, y, z);
      rI.setMatrixAt(i, _m);
      _m.makeTranslation(x, y - 0.005, z);
      dI.setMatrixAt(i, _m);
    });
    world.add(rI, dI);
  }

  // Tường bao 5 tầng, vách ngăn các phòng tầng 4–5 & cửa sổ kính
  const wallSeg = (x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, t = 0.25, m: THREE.Material = M_WALL) => {
    const l = Math.hypot(x1 - x0, z1 - z0);
    if (l > 0.02) {
      box(l, y1 - y0, t, m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, 0, -Math.atan2(z1 - z0, x1 - x0), 0);
    }
  };
  const wallWithDoors = (
    axis: 'x' | 'z',
    fixed: number,
    a0: number,
    a1: number,
    y0: number,
    y1: number,
    doors: Array<[number, number, number, string?]>,
    t = 0.25,
    m: THREE.Material = M_WALL,
  ) => {
    const s = [...doors].sort((A, B) => A[0] - B[0]);
    let cur = a0;
    const seg = (u0: number, u1: number, v0: number, v1: number) =>
      axis === 'z' ? wallSeg(u0, fixed, u1, fixed, v0, v1, t, m) : wallSeg(fixed, u0, fixed, u1, v0, v1, t, m);
    for (const [c, w, dh, lbl] of s) {
      const d0 = c - w / 2;
      const d1 = c + w / 2;
      if (d0 > cur) seg(cur, d0, y0, y1);
      if (y0 + dh < y1) seg(d0, d1, y0 + dh, y1);
      const px = axis === 'z' ? c : fixed;
      const pz = axis === 'z' ? fixed : c;
      const ry = axis === 'z' ? 0 : Math.PI / 2;
      const fg = G(world, px, y0, pz, ry);
      box(0.09, dh, t + 0.05, M_WOOD_D, -w / 2, dh / 2, 0, 0, 0, 0, fg);
      box(0.09, dh, t + 0.05, M_WOOD_D, w / 2, dh / 2, 0, 0, 0, 0, fg);
      box(w + 0.18, 0.1, t + 0.06, M_WOOD_D, 0, dh, 0, 0, 0, 0, fg);
      if (lbl) {
        const tx = canvasTex(512, 112, (ct) => {
          ct.fillStyle = '#1e3a5f';
          ct.fillRect(0, 0, 512, 112);
          ct.strokeStyle = '#fbbf24';
          ct.lineWidth = 6;
          ct.strokeRect(5, 5, 502, 102);
          ct.fillStyle = '#fff';
          ct.font = 'bold 34px Segoe UI,sans-serif';
          ct.textAlign = 'center';
          ct.textBaseline = 'middle';
          ct.fillText(lbl, 256, 56);
        });
        box(Math.min(w * 0.9, 2.3), 0.42, 0.05, new THREE.MeshBasicMaterial({ map: tx }), 0, dh + 0.34, t / 2 + 0.03, 0, 0, 0, fg);
      }
      cur = d1;
    }
    if (cur < a1) seg(cur, a1, y0, y1);
  };

  for (let f = 0; f < NF; f++) {
    const y0 = f * FH;
    const y1 = y0 + FH - 0.32;
    const isR = f === 3 || f === 4;
    const p5 = f === 4;
    if (isR) {
      wallWithDoors(
        'z',
        ZB,
        -XW,
        XW,
        y0,
        y1,
        [
          [R4DX, R4DW, 2.34, p5 ? 'P.501 · PHÒNG HỌC NHÓM' : 'P.401 · PHÒNG ĐỌC TỰ DO'],
          [11.5, 2.4, 2.5, p5 ? 'P.525 · TỰ HỌC' : 'P.418 · PHÒNG TỰ HỌC'],
        ],
        0.3,
      );
      wallWithDoors('x', -XW, ZB, ZF, y0, y1, [[-6.5, 2.4, 2.5, p5 ? 'P.511 · BÁO - TẠP CHÍ' : 'P.404 · BÁO - TẠP CHÍ'], [4.5, 2.6, 2.5, p5 ? 'P.509 · PHÒNG ĐỌC' : 'P.402 · PHÒNG ĐỌC']], 0.3);
      wallWithDoors('x', XW, ZB, -5, y0, y1, [[-9, 2.4, 2.5, p5 ? 'P.526 · ĐỌC MỞ' : 'P.419 · PHÒNG ĐỌC MỞ']], 0.3);
      wallWithDoors('x', XW, 5, ZF, y0, y1, [[9, 2.4, 2.5, p5 ? 'P.526 · ĐỌC MỞ' : 'P.419 · PHÒNG ĐỌC MỞ']], 0.3);
      wallSeg(XW, -5, XW, 5, y0, y1, 0.3, M_WALL2);
      wallWithDoors('z', ZF, -XW, XW, y0, y1, [[0, 3.2, 2.6, p5 ? 'P.518 · ĐỌC CHUYÊN NGÀNH' : 'P.411 · ĐỌC CHUYÊN NGÀNH']], 0.3);
    } else {
      box(XW * 2, FH, 0.3, M_WALL, 0, y0 + FH / 2, ZB);
      if (f === 0) {
        wallWithDoors('x', -XW, ZB, ZF, 0, FH - 0.32, [[BRM.zc, BRM.dw, BRM.dh, 'PHÒNG MƯỢN SÁCH']], 0.3);
      } else {
        for (let z = -10.5; z <= 10.5; z += 3.5) {
          box(0.28, 1.1, 3.5, M_WALL, -XW, y0 + 0.55, z);
          box(0.28, 0.9, 3.5, M_WALL, -XW, y0 + FH - 0.45, z);
          box(0.08, 2.5, 3, M_GLS, -XW, y0 + 2.35, z);
          box(0.14, 2.55, 0.1, M_DRK, -XW, y0 + 2.35, z - 1.52);
          box(0.14, 2.55, 0.1, M_DRK, -XW, y0 + 2.35, z + 1.52);
        }
      }
      for (const s of [-1, 1]) {
        box(0.3, FH, 4, M_WALL, XW, y0 + FH / 2, s * 11);
        box(0.08, 2.6, 2.8, M_GLS, XW, y0 + 2.3, s * 7.2);
        box(0.3, 1, 3.6, M_WALL, XW, y0 + 0.5, s * 7.2);
      }
      box(0.3, FH, 10.8, M_WALL2, XW, y0 + FH / 2, 0);
      if (f === 0) {
        for (const s of [-1, 1]) {
          box(6.5, FH, 0.3, M_WALL, s * 16.25, FH / 2, ZF);
          box(6.8, 1.1, 0.25, M_WALL, s * 9.6, 0.55, ZF);
          box(6.8, 0.95, 0.25, M_WALL, s * 9.6, FH - 0.48, ZF);
          box(6.6, 2.45, 0.08, M_GLS, s * 9.6, 2.32, ZF);
        }
        box(12.4, 1.3, 0.3, M_WALL, 0, FH - 0.65, ZF);
        for (const x of [-6.1, -3.1, -1.55, 1.55, 3.1, 6.1]) {
          box(0.1, 3.2, 0.14, M_DRK, x, 1.6, ZF);
        }
        for (const x of [-4.6, -2.32, 2.32, 4.6]) {
          box(1.45, 3.1, 0.06, M_GLS, x, 1.55, ZF);
        }
        box(3.1, 0.1, 0.16, M_DRK, 0, 3.15, ZF);
        box(5.6, 0.7, 0.08, new THREE.MeshBasicMaterial({
          map: canvasTex(512, 96, (c) => {
            c.fillStyle = '#8e1b1b';
            c.fillRect(0, 0, 512, 96);
            c.strokeStyle = '#d4a937';
            c.lineWidth = 6;
            c.strokeRect(4, 4, 504, 88);
            c.fillStyle = '#fff5d6';
            c.font = 'bold 34px Segoe UI,sans-serif';
            c.textAlign = 'center';
            c.fillText('THƯ VIỆN TẠ QUANG BỬU', 256, 58);
          }),
        }), 0, 3.68, ZF - 0.18);
      } else {
        for (let x = -16.5; x <= 16.5; x += 3.3) {
          box(3.3, 1.05, 0.28, M_WALL, x, y0 + 0.52, ZF);
          box(3.3, 0.9, 0.28, M_WALL, x, y0 + FH - 0.45, ZF);
          box(2.9, 2.55, 0.08, M_GLS, x, y0 + 2.32, ZF);
          box(0.1, 2.6, 0.14, M_DRK, x - 1.48, y0 + 2.32, ZF);
        }
      }
    }
  }

  // 2 Cầu thang xoắn đôi lớn dẫn từ Tầng 1 lên Tầng 2 (Grand Curved Staircases)
  const STR = [
    { side: 1, a0: -0.34, a1: 0.34 },
    { side: -1, a0: Math.PI - 0.34, a1: Math.PI + 0.34 },
  ];
  const ST_R0 = 7.55;
  const ST_R1 = 9.35;
  for (const st of STR) {
    const N = 26;
    for (let i = 0; i < N; i++) {
      const t0 = i / N;
      const t1 = (i + 1) / N;
      const tm = (t0 + t1) / 2;
      const a = st.a0 + (st.a1 - st.a0) * tm;
      const rm = (ST_R0 + ST_R1) / 2;
      const x = st.side * L + rm * Math.cos(a);
      const z = rm * Math.sin(a);
      const tang = a + (st.a1 > st.a0 ? Math.PI / 2 : -Math.PI / 2);
      const sg = G(world, x, t1 * FH, z, -tang + Math.PI / 2);
      box(ST_R1 - ST_R0, 0.07, 0.34, M_WOOD_M, 0, -0.035, 0, 0, 0, 0, sg);
      box(ST_R1 - ST_R0 - 0.04, 0.18, 0.04, M_WALL, 0, -0.12, -0.14, 0, 0, 0, sg);
    }
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const a = st.a0 + (st.a1 - st.a0) * t;
      pts.push([st.side * L + ((ST_R0 + ST_R1) / 2) * Math.cos(a), ((ST_R0 + ST_R1) / 2) * Math.sin(a)]);
    }
    const ramp = (r0: number, r1: number, dy0: number, dy1: number, m: THREE.Material) => {
      const pos: number[] = [];
      const idx: number[] = [];
      const n = pts.length;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const yB = t * FH;
        const [x, z] = pts[i];
        const { cx, dx } = atQ(x, z);
        const l = Math.hypot(dx, z) || 1;
        const nx = dx / l;
        const nz = z / l;
        pos.push(
          cx + nx * r0, yB + dy0, nz * r0,
          cx + nx * r1, yB + dy0, nz * r1,
          cx + nx * r1, yB + dy1, nz * r1,
          cx + nx * r0, yB + dy1, nz * r0,
        );
      }
      const q = (a: number, b: number, c: number, d: number) => idx.push(a, b, c, a, c, d);
      for (let i = 0; i < n - 1; i++) {
        const A = i * 4;
        const B = A + 4;
        q(A + 3, B + 3, B + 2, A + 2);
        q(A, A + 1, B + 1, B);
        q(A, B, B + 3, A + 3);
        q(A + 1, A + 2, B + 2, B + 1);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      mk(g, m);
    };
    ramp(ST_R0 - 0.08, ST_R0 + 0.04, -0.22, 0.92, M_PARA);
    ramp(ST_R1 - 0.04, ST_R1 + 0.08, -0.22, 0.92, M_PARA);
    ramp(ST_R0 - 0.1, ST_R0 + 0.06, 0.92, 0.99, M_WOOD_D);
    ramp(ST_R1 - 0.06, ST_R1 + 0.1, 0.92, 0.99, M_WOOD_D);
    ramp(ST_R0 + 0.04, ST_R1 - 0.04, -0.28, -0.14, M_CEIL);
  }

  // 3 Thang máy hoạt động ở tường Đông (x = 19.5, z = -2.9, 0, 2.9)
  const LIFTS = [-2.9, 0, 2.9];
  const EX = XW - 0.22;
  const ECW = 2.0;
  const ECD = 1.9;
  const ECH = 2.65;
  const ECX = XW + 0.88;
  const elevators: ElevatorCarState[] = [];

  LIFTS.forEach((ez, idx) => {
    const car: ElevatorCarState = {
      z: ez,
      cab: G(world, ECX, 0, ez),
      y: 0,
      vy: 0,
      floor: 1,
      target: 1,
      open: idx === 1 ? 1 : 0,
      state: idx === 1 ? 'open' : 'idle',
      timer: idx === 1 ? 8 : 0,
      doors: {},
      cabDL: null as unknown as THREE.Mesh,
      cabDR: null as unknown as THREE.Mesh,
    };
    box(ECW + 0.3, H, 0.14, M_CHAR, ECX, H / 2, ez - ECD / 2 - 0.08);
    box(ECW + 0.3, H, 0.14, M_CHAR, ECX, H / 2, ez + ECD / 2 + 0.08);
    box(0.16, H, ECD + 0.3, M_CHAR, ECX + ECW / 2 + 0.08, H / 2, ez);

    for (let f = 0; f < NF; f++) {
      const y = f * FH;
      const fg = G(world, EX, y, ez);
      box(0.28, 2.55, 0.18, M_STL, 0, 1.275, -0.92, 0, 0, 0, fg);
      box(0.28, 2.55, 0.18, M_STL, 0, 1.275, 0.92, 0, 0, 0, fg);
      box(0.3, 0.24, 2.02, M_STL, 0, 2.48, 0, 0, 0, 0, fg);
      const dL = box(0.06, 2.36, 0.82, M_CHR, 0.02, 1.18, -0.42, 0, 0, 0, fg);
      const dR = box(0.06, 2.36, 0.82, M_CHR, 0.02, 1.18, 0.42, 0, 0, 0, fg);
      car.doors[f + 1] = { l: dL, r: dR };
      const disp = canvasTex(128, 64, (c) => {
        c.fillStyle = '#111';
        c.fillRect(0, 0, 128, 64);
        c.fillStyle = '#ef4444';
        c.font = 'bold 36px monospace';
        c.textAlign = 'center';
        c.fillText(`▲ ${f + 1}`, 64, 45);
      });
      box(0.05, 0.2, 0.42, new THREE.MeshBasicMaterial({ map: disp }), -0.14, 2.68, 0, 0, 0, 0, fg);
      if (idx < 2) {
        box(0.05, 0.32, 0.12, M_STL, -0.14, 1.15, 1.28, 0, 0, 0, fg);
        cyl(0.022, 0.022, 0.02, 12, M_LED, -0.17, 1.2, 1.28, 0, 0, Math.PI / 2, fg);
        cyl(0.022, 0.022, 0.02, 12, M_LED, -0.17, 1.1, 1.28, 0, 0, Math.PI / 2, fg);
      }
    }

    const cb = car.cab;
    box(ECW, 0.1, ECD, M_FLR_R, 0, 0.05, 0, 0, 0, 0, cb);
    box(ECW, 0.08, ECD, M_CEIL, 0, ECH, 0, 0, 0, 0, cb);
    box(ECW - 0.3, 0.02, ECD - 0.3, M_LGT, 0, ECH - 0.04, 0, 0, 0, 0, cb);
    box(0.08, ECH, ECD, M_WOOD_M, ECW / 2, ECH / 2, 0, 0, 0, 0, cb);
    box(0.03, 1.45, ECD - 0.35, M_MIR, ECW / 2 - 0.05, 1.55, 0, 0, 0, 0, cb);
    box(ECW, ECH, 0.08, M_WOOD_M, 0, ECH / 2, -ECD / 2, 0, 0, 0, cb);
    box(ECW, ECH, 0.08, M_WOOD_M, 0, ECH / 2, ECD / 2, 0, 0, 0, cb);
    cyl(0.022, 0.022, ECD - 0.25, 10, M_CHR, ECW / 2 - 0.1, 0.9, 0, Math.PI / 2, 0, 0, cb);
    box(0.08, ECH, 0.18, M_STL, -ECW / 2, ECH / 2, -ECD / 2 + 0.09, 0, 0, 0, cb);
    box(0.08, ECH, 0.18, M_STL, -ECW / 2, ECH / 2, ECD / 2 - 0.09, 0, 0, 0, cb);
    box(0.03, 0.75, 0.22, M_CHR, -ECW / 2 + 0.06, 1.25, -ECD / 2 + 0.22, 0, 0, 0, cb);
    for (let b = 0; b < 5; b++) {
      cyl(0.02, 0.02, 0.015, 12, M_LED, -ECW / 2 + 0.08, 1.02 + b * 0.09, -ECD / 2 + 0.22, 0, 0, Math.PI / 2, cb);
    }
    car.cabDL = box(0.04, 2.36, 0.8, M_STL, -ECW / 2 - 0.03, 1.18, -0.41, 0, 0, 0, cb);
    car.cabDR = box(0.04, 2.36, 0.8, M_STL, -ECW / 2 - 0.03, 1.18, 0.41, 0, 0, 0, cb);
    elevators.push(car);
  });

  box(3.4, 0.52, 0.08, new THREE.MeshBasicMaterial({
    map: canvasTex(512, 80, (c) => {
      c.fillStyle = '#1e293b';
      c.fillRect(0, 0, 512, 80);
      c.fillStyle = '#fbbf24';
      c.font = 'bold 30px Segoe UI,sans-serif';
      c.textAlign = 'center';
      c.fillText('THANG MÁY · TẦNG 1 - 10', 256, 50);
    }),
  }), EX - 0.12, 3.25, 0, 0, -Math.PI / 2);

  // Định nghĩa các đạo cụ InstancedMesh (ghế, bàn, sofa, giá sách, chậu cây, cổng từ, trụ biển)
  defineProp('chairR', () => {
    pBox(0.46, 0.05, 0.44, M_RED, 0, 0.45, 0);
    pBox(0.44, 0.42, 0.05, M_RED, 0, 0.68, -0.2, 0.08);
    for (const [lx, lz] of [
      [-0.19, -0.18],
      [0.19, -0.18],
      [-0.19, 0.18],
      [0.19, 0.18],
    ]) {
      pCyl(0.018, 0.018, 0.44, 6, M_CHR, lx, 0.22, lz);
    }
  });
  defineProp('table4', () => {
    pBox(1.5, 0.05, 0.85, M_WOOD_L, 0, 0.74, 0);
    pBox(1.46, 0.03, 0.81, M_WOOD_D, 0, 0.71, 0);
    for (const [lx, lz] of [
      [-0.68, -0.36],
      [0.68, -0.36],
      [-0.68, 0.36],
      [0.68, 0.36],
    ]) {
      pCyl(0.025, 0.025, 0.72, 6, M_DRK, lx, 0.36, lz);
    }
    const cPartsChair = P_DEFS.chairR;
    for (const [cx, cz, ry] of [
      [-0.42, -0.56, 0],
      [0.42, -0.56, 0],
      [-0.42, 0.56, Math.PI],
      [0.42, 0.56, Math.PI],
    ]) {
      const xf = compose(cx, 0, cz, 0, ry, 0);
      for (const p of cPartsChair) cParts!.push({ g: p.g, m: p.m, l: xf.clone().multiply(p.l) });
    }
  });
  defineProp('round4', () => {
    pCyl(0.62, 0.62, 0.05, 18, M_WOOD_D, 0, 0.74, 0);
    pCyl(0.06, 0.06, 0.7, 10, M_DRK, 0, 0.36, 0);
    pCyl(0.34, 0.36, 0.03, 14, M_DRK, 0, 0.02, 0);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const xf = compose(Math.cos(a) * 0.82, 0, Math.sin(a) * 0.82, 0, -a - Math.PI / 2, 0);
      for (const p of P_DEFS.chairR) cParts!.push({ g: p.g, m: p.m, l: xf.clone().multiply(p.l) });
    }
  });
  defineProp('armchair', () => {
    pBox(0.76, 0.36, 0.72, M_CHAR, 0, 0.22, 0);
    pBox(0.76, 0.44, 0.16, M_CHAR, 0, 0.56, -0.28);
    pBox(0.13, 0.34, 0.72, M_CHAR, -0.32, 0.42, 0);
    pBox(0.13, 0.34, 0.72, M_CHAR, 0.32, 0.42, 0);
    pBox(0.5, 0.08, 0.54, M_RED, 0, 0.42, 0.04);
  });
  defineProp('sofa', () => {
    pBox(1.85, 0.36, 0.78, M_CHAR, 0, 0.22, 0);
    pBox(1.85, 0.46, 0.16, M_CHAR, 0, 0.58, -0.31);
    pBox(0.14, 0.36, 0.78, M_CHAR, -0.86, 0.42, 0);
    pBox(0.14, 0.36, 0.78, M_CHAR, 0.86, 0.42, 0);
    pBox(1.56, 0.08, 0.58, M_RED, 0, 0.42, 0.04);
    pBox(0.95, 0.04, 0.52, M_WOOD_D, 0, 0.42, 0.92);
    pCyl(0.03, 0.03, 0.4, 8, M_CHR, -0.38, 0.2, 0.92);
    pCyl(0.03, 0.03, 0.4, 8, M_CHR, 0.38, 0.2, 0.92);
  });
  defineProp('shelf', () => {
    const w = 2.4;
    const h = 2.15;
    const d = 0.42;
    pBox(w, h, 0.04, M_WOOD_M, 0, h / 2, -d / 2);
    pBox(0.05, h, d, M_WOOD_D, -w / 2, h / 2, 0);
    pBox(0.05, h, d, M_WOOD_D, w / 2, h / 2, 0);
    pBox(0.04, h, d - 0.02, M_WOOD_D, 0, h / 2, 0);
    const rng = mulberry32(77);
    for (let l = 0; l <= 5; l++) {
      const sy = 0.1 + l * ((h - 0.18) / 5);
      pBox(w, 0.035, d, M_WOOD_D, 0, sy, 0);
      if (l < 5) {
        for (const side of [-1, 1]) {
          const bw = w / 2 - 0.12;
          const bh = 0.24 + (l % 2) * 0.04;
          pBox(bw, bh, 0.23, mat(BOOK_PAL[Math.floor(rng() * BOOK_PAL.length)], 0.55), side * (w / 4), sy + 0.02 + bh / 2, 0.02);
        }
      }
    }
  });
  defineProp('plant', () => {
    pCyl(0.26, 0.2, 0.46, 10, M_POT, 0, 0.23, 0);
    pCyl(0.035, 0.05, 0.65, 6, M_WOOD_D, 0, 0.62, 0);
    const sph = (gCache.sph1 ??= new THREE.SphereGeometry(0.36, 9, 7));
    pMesh(sph, M_LEAF, 0, 1.05, 0);
    pMesh(sph, M_LEAF, 0.16, 0.9, 0.1, 0, 0, 0, 0.72, 0.72, 0.72);
    pMesh(sph, M_LEAF, -0.15, 0.92, -0.1, 0, 0, 0, 0.72, 0.72, 0.72);
  });
  defineProp('gate', () => {
    pBox(0.09, 1.08, 0.72, M_CHR, 0, 0.54, 0);
    pBox(0.05, 0.86, 0.54, M_GLS, 0, 0.54, 0);
    pBox(0.1, 0.16, 0.14, M_HUST, 0, 0.92, 0.28);
  });
  const pyTx = canvasTex(256, 640, (c) => {
    c.fillStyle = '#991b1b';
    c.fillRect(0, 0, 256, 640);
    c.strokeStyle = '#fbbf24';
    c.lineWidth = 6;
    c.strokeRect(8, 8, 240, 624);
    c.fillStyle = '#fef3c7';
    c.font = 'bold 34px Segoe UI,sans-serif';
    c.textAlign = 'center';
    c.fillText('HUST', 128, 70);
    c.font = 'bold 20px Segoe UI,sans-serif';
    c.fillStyle = '#fff';
    ['THƯ VIỆN', 'TẠ QUANG BỬU', '───────', 'T1 · Sảnh & Mượn', 'T2-3 · Tự học', 'T4 · Phòng đọc', 'T5 · Học nhóm', 'T6-7 · Sáng tạo', 'T10 · Sân thượng'].forEach((t, i) =>
      c.fillText(t, 128, 130 + i * 50),
    );
  });
  defineProp('pylon', () => {
    pBox(0.68, 2.25, 0.16, new THREE.MeshBasicMaterial({ map: pyTx }), 0, 1.2, 0);
    pBox(0.82, 0.12, 0.34, M_DRK, 0, 0.06, 0);
  });

  // Chi tiết Sảnh tầng 1 xung quanh khu vực trung tâm
  // (Giữ nguyên không gian trung tâm x ∈ [-5.5, 5.5], z ∈ [-4.0, 3.5] thông thoáng 100%
  //  cho Tượng GS. Tạ Quang Bửu, Quầy thông tin, Bảng từ vựng & 2 bàn đọc multiplayer PR8/PR9)
  [-1.95, -0.65, 0.65, 1.95].forEach((x) => place('gate', x, 0, 11.15));

  // Quầy lễ tân cong lớn phía lối vào Nam (z = 9.45)
  {
    const dg = G(world, 0, 0, 9.45);
    const body = new THREE.CylinderGeometry(2.6, 2.6, 1.05, 32, 1, false, -Math.PI * 0.42, Math.PI * 0.84);
    mk(body, M_WOOD_M, 0, 0.525, 0, 0, Math.PI / 2, 0, dg);
    const top = new THREE.CylinderGeometry(2.74, 2.74, 0.07, 32, 1, false, -Math.PI * 0.43, Math.PI * 0.86);
    mk(top, M_TRIM, 0, 1.07, 0, 0, Math.PI / 2, 0, dg);
    for (const x of [-0.9, 0.9]) {
      box(0.46, 0.3, 0.04, M_DRK, x, 1.26, -2.2, 0, 0, 0, dg);
      box(0.42, 0.25, 0.045, M_SCR, x, 1.26, -2.18, 0, 0, 0, dg);
    }
    place('chairR', -0.9, 0, 7.85, 0);
    place('chairR', 0.9, 0, 7.85, 0);
  }
  place('pylon', -6.75, 0, 6.45);
  place('pylon', 6.75, 0, 6.45);

  for (const s of [-1, 1]) {
    const pg = G(world, s * 10.6, 0, 0);
    box(1.9, 0.48, 3.3, M_TRIM, 0, 0.24, 0, 0, 0, 0, pg);
    box(1.66, 0.08, 3.06, M_WOOD_D, 0, 0.46, 0, 0, 0, 0, pg);
    for (const dz of [-1, 0, 1]) place('plant', s * 10.6, 0.22, dz);
  }

  // Sofa, ghế bành sảnh Tầng 1 và 6 kệ giáo trình Phòng Mượn Sách P.102 từ nguồn chuẩn dùng chung (shared furniture placements)
  for (const fp of getBlockAFurniturePlacements(1)) {
    place(fp.prop, fp.x, fp.y, fp.z, fp.ry);
  }
  for (const [x, z] of [
    [-17.5, -11.2],
    [17.5, -11.2],
    [-17.5, 11.2],
    [17.5, 11.2],
    [-8.5, -11.5],
    [8.5, -11.5],
  ]) {
    place('plant', x, 0, z);
  }

  // Bức tường phù điêu lớn ở hậu cảnh Bắc của Đại sảnh (z = -12.72)
  {
    const sg = G(world, 0, 0, ZB + 0.28);
    box(9.6, 4.15, 0.22, M_WOOD_D, 0, 2.08, 0, 0, 0, 0, sg);
    box(8.8, 3.75, 0.08, M_WOOD_M, 0, 2.08, 0.12, 0, 0, 0, sg);
    for (let i = -18; i <= 18; i++) {
      if (Math.abs(i) < 4) continue;
      const h = 1.4 + Math.cos(i * 0.25) * 0.95 + (Math.abs(i) % 3) * 0.22;
      cyl(0.038, 0.038, h, 8, M_GOLD, i * 0.21, 2.1, 0.2, 0, 0, 0, sg);
    }
    const tx = canvasTex(512, 160, (c) => {
      c.fillStyle = '#3b1d11';
      c.fillRect(0, 0, 512, 160);
      c.strokeStyle = '#d4a937';
      c.lineWidth = 5;
      c.strokeRect(6, 6, 500, 148);
      c.fillStyle = '#fde68a';
      c.font = 'bold 28px Georgia,serif';
      c.textAlign = 'center';
      c.fillText('GIÁO SƯ TẠ QUANG BỬU', 256, 58);
      c.font = '20px Segoe UI,sans-serif';
      c.fillStyle = '#f5e6c8';
      c.fillText('1910 – 1986 · Hiệu trưởng đầu tiên ĐHBK Hà Nội', 256, 108);
    });
    box(3.4, 0.9, 0.05, new THREE.MeshBasicMaterial({ map: tx }), 0, 3.35, 0.22, 0, 0, 0, sg);
  }

  // Bàn tra cứu OPAC, Kiosk, Tủ trưng bày, Kệ báo, Cây nước & Máy bán nước tự động ở Tầng 1
  for (const oz of [-7.5, 7.5]) {
    const og = G(world, -17.3, 0, oz);
    box(1.1, 0.06, 2.6, M_WOOD_L, 0, 0.95, 0, 0, 0, 0, og);
    box(0.95, 0.92, 2.4, M_WOOD_D, 0, 0.46, 0, 0, 0, 0, og);
    for (const dz of [-0.8, 0, 0.8]) {
      box(0.38, 0.26, 0.03, M_DRK, 0.1, 1.15, dz, 0, Math.PI / 2, 0, og);
      box(0.34, 0.22, 0.035, M_SCR, 0.11, 1.15, dz, 0, Math.PI / 2, 0, og);
      box(0.28, 0.02, 0.14, M_DRK, 0.32, 0.99, dz, 0, Math.PI / 2, 0, og);
    }
  }
  {
    const kg = G(world, -16.1, 0, -9.2, Math.PI / 6);
    box(0.7, 0.08, 0.6, M_DRK, 0, 0.04, 0, 0, 0, 0, kg);
    box(0.55, 1.65, 0.12, M_CHAR, 0, 0.9, 0, -0.12, 0, 0, kg);
    box(0.46, 0.78, 0.02, M_SCR, 0, 1.12, 0.06, -0.12, 0, 0, kg);
  }
  for (const dx of [-14.6, -10.6]) {
    const cg = G(world, dx, 0, -11.9);
    box(2.2, 0.85, 0.9, M_WOOD_D, 0, 0.425, 0, 0, 0, 0, cg);
    box(2.14, 0.55, 0.84, M_GLS, 0, 1.12, 0, 0, 0, 0, cg);
    box(2.2, 0.05, 0.9, M_WOOD_D, 0, 1.42, 0, 0, 0, 0, cg);
    for (const bxX of [-0.65, 0, 0.65]) {
      box(0.38, 0.05, 0.28, M_HUST, bxX, 0.9, 0, -0.25, 0.15, 0, cg);
      box(0.34, 0.04, 0.24, M_GOLD, bxX, 0.94, 0.02, -0.25, -0.1, 0, cg);
    }
  }
  {
    const mg = G(world, -6.8, 0, -11.9);
    box(1.8, 1.55, 0.45, M_WOOD_M, 0, 0.775, 0, 0, 0, 0, mg);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5; c++) {
        box(0.24, 0.32, 0.03, mat(BOOK_PAL[(r * 5 + c) % BOOK_PAL.length], 0.5), -0.6 + c * 0.3, 0.42 + r * 0.42, 0.22, -0.2, 0, 0, mg);
      }
    }
  }
  for (let i = 0; i < 2; i++) {
    const wg = G(world, 11.8 + i * 0.7, 0, -11.9);
    box(0.42, 1.15, 0.42, M_CHR, 0, 0.575, 0, 0, 0, 0, wg);
    cyl(0.16, 0.16, 0.42, 12, M_GLS, 0, 1.36, 0, 0, 0, 0, wg);
  }
  {
    const vg = G(world, 14.3, 0, -11.9);
    box(1.15, 1.95, 0.85, M_HUST, 0, 0.975, 0, 0, 0, 0, vg);
    box(0.78, 1.25, 0.04, M_GLS, -0.1, 1.12, 0.43, 0, 0, 0, vg);
    box(0.72, 1.18, 0.02, M_LGT, -0.1, 1.12, 0.38, 0, 0, 0, vg);
  }

  // Phòng Mượn Sách (Book-Lending Room) bên tường Tây tầng 1
  {
    const { x0, x1, z0, z1, h, zc, dw } = BRM;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const bw = x1 - x0;
    const bd = z1 - z0;
    mk(new THREE.PlaneGeometry(bw, bd), M_FLR_W, cx, 0.008, cz, -Math.PI / 2);
    box(bw, 0.22, bd, M_CEIL, cx, h + 0.11, cz);
    box(0.28, h, bd, M_WALL, x0, h / 2, cz);
    box(bw, h, 0.28, M_WALL, cx, h / 2, z0);
    box(bw, h, 0.28, M_WALL, cx, h / 2, z1);
    for (const lx of [x0 + 1.8, x0 + 4.6]) {
      for (const lz of [z0 + 2, zc, z1 - 2]) {
        box(1.2, 0.04, 0.32, M_LGT, lx, h - 0.02, lz);
      }
    }
    const cd = dw - 1.8;
    const cX = x1 - 0.55;
    const cZ = zc + 0.65;
    box(0.78, 1.04, cd, M_WOOD_M, cX, 0.52, cZ);
    box(0.92, 0.07, cd + 0.12, M_TRIM, cX, 1.07, cZ);
    box(0.84, 0.14, cd + 0.04, M_HUST, cX + 0.04, 0.88, cZ);
    box(0.04, 0.65, cd - 0.4, M_GLS, cX + 0.34, 1.43, cZ);
    for (const dz of [-1.0, 0, 1.0]) {
      box(0.06, 0.72, 0.06, M_CHR, cX + 0.34, 1.44, cZ + dz);
      if (dz !== 0) {
        box(0.05, 0.32, 0.46, M_DRK, cX - 0.08, 1.26, cZ + dz);
        box(0.055, 0.27, 0.41, M_SCR, cX - 0.05, 1.26, cZ + dz);
        place('chairR', cX - 0.85, 0, cZ + dz, Math.PI / 2);
      }
    }
    for (let i = 0; i < 3; i++) {
      box(0.28, 0.18, 0.22, mat(BOOK_PAL[i * 3], 0.5), cX + 0.1, 1.18, cZ - 0.35 + i * 0.35);
    }
  }

  // Nội thất hành lang thông tầng Tầng 2–5 (từ getBlockAFurniturePlacements dùng chung với collision resolver)
  for (let f = 1; f < NF; f++) {
    const y = f * FH;
    const floorNum = (f + 1) as 2 | 3 | 4 | 5;
    for (const fp of getBlockAFurniturePlacements(floorNum)) {
      place(fp.prop, fp.x, fp.y, fp.z, fp.ry);
    }
    for (const [x, z] of [
      [-17.8, -11.5],
      [17.8, -11.5],
      [-17.8, 11.5],
      [17.8, 11.5],
      [-7.2, -9.2],
      [7.2, -9.2],
      [-7.2, 9.2],
      [7.2, 9.2],
    ]) {
      place('plant', x, y, z);
    }
  }

  // Máy pha cà phê tự động ở hành lang Tầng 4
  {
    const cg = G(world, 6.2, 3 * FH, -12.1);
    box(0.95, 1.85, 0.78, M_WOOD_D, 0, 0.925, 0, 0, 0, 0, cg);
    box(0.78, 0.72, 0.04, M_DRK, 0, 1.32, 0.39, 0, 0, 0, cg);
    box(0.42, 0.35, 0.05, M_SCR, -0.12, 1.35, 0.4, 0, 0, 0, cg);
  }

  // Khởi tạo ngay nội thất Đại sảnh & Hành lang Tầng 1–5
  buildProps(world);

  // Gộp toàn bộ các khối Mesh tĩnh cùng cặp (geometry, material) thành InstancedMesh
  // để giảm ~500 draw calls kiến trúc (tường, đố cửa, bậc thang xoắn, cột, nan đồng, tủ kệ) xuống còn ~20 draw calls.
  {
    const dynamicObjects = new Set<THREE.Object3D>();
    for (const c of elevators) {
      dynamicObjects.add(c.cab);
      for (const f in c.doors) {
        dynamicObjects.add(c.doors[f].l);
        dynamicObjects.add(c.doors[f].r);
      }
    }
    world.updateMatrixWorld(true);
    const buckets = new Map<
      string,
      { g: THREE.BufferGeometry; m: THREE.Material; meshes: THREE.Mesh[]; mats: THREE.Matrix4[] }
    >();
    const visit = (obj: THREE.Object3D) => {
      if (dynamicObjects.has(obj)) return;
      if ((obj as THREE.InstancedMesh).isInstancedMesh) return;
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry && mesh.material && !Array.isArray(mesh.material)) {
        const key = `${mesh.geometry.uuid}_${mesh.material.uuid}`;
        let b = buckets.get(key);
        if (!b) {
          b = { g: mesh.geometry, m: mesh.material, meshes: [], mats: [] };
          buckets.set(key, b);
        }
        b.meshes.push(mesh);
        b.mats.push(mesh.matrixWorld.clone());
      }
      for (const child of obj.children) visit(child);
    };
    visit(world);
    buckets.forEach(({ g, m, meshes, mats }) => {
      if (meshes.length < 2) return;
      for (const mesh of meshes) {
        mesh.parent?.remove(mesh);
      }
      const im = new THREE.InstancedMesh(g, m, mats.length);
      for (let i = 0; i < mats.length; i++) {
        im.setMatrixAt(i, mats[i]);
      }
      im.instanceMatrix.needsUpdate = true;
      world.add(im);
    });
  }

  // Phòng 401 (Tầng 4), Phòng 501 (Tầng 5) & 9 Phòng đọc phụ Tầng 4–5
  // (P419/P526, P402/P509, P411/P518, P418/P525, P404/P511)
  // — khởi tạo lười (lazy-init) ngay khi người chơi lên Tầng 4 hoặc Tầng 5
  const r401G = G(world, 0, 3 * FH + 0.01, R4Z);
  let r401: Room401Controller | null = null;
  const ensureR401 = () => (r401 ??= buildRoom401(r401G, 'PHÒNG ĐỌC 401'));

  const r501G = G(world, 0, 4 * FH + 0.01, R4Z);
  let r501: Room401Controller | null = null;
  const ensureR501 = () => (r501 ??= buildRoom401(r501G, 'PHÒNG HỌC NHÓM 501'));

  const f45Group = G(world, 0, 0, 0);
  const fans4: THREE.Group[] = [];
  let f45Built = false;
  const ensureFloors4To5 = () => {
    if (f45Built) return;
    f45Built = true;

    const M_BEIGE = mat(0xe6dcc8, 0.48);
    const M_BLUE_CH = mat(0x1d5fa6, 0.5);
    const M_CURT = mat(0x2563eb, 0.72);
    const M_TEAL = mat(0x14837b, 0.42, 0.25);

    defineProp('r4LongTbl', () => {
      pBox(2.6, 0.045, 0.96, M_BEIGE, 0, 0.75, 0);
      pBox(2.64, 0.05, 1.0, M_WOOD_M, 0, 0.73, 0);
      for (const [lx, lz] of [
        [-1.18, -0.4],
        [1.18, -0.4],
        [-1.18, 0.4],
        [1.18, 0.4],
      ]) {
        pBox(0.045, 0.73, 0.045, M_STL, lx, 0.365, lz);
      }
      pBox(2.36, 0.03, 0.03, M_STL, 0, 0.2, -0.4);
      pBox(2.36, 0.03, 0.03, M_STL, 0, 0.2, 0.4);
      for (const cx of [-0.82, 0, 0.82]) {
        for (const [cz, ry] of [
          [-0.64, 0],
          [0.64, Math.PI],
        ]) {
          pBox(0.38, 0.036, 0.36, M_BLUE_CH, cx, 0.43, cz);
          pBox(0.36, 0.34, 0.03, M_BLUE_CH, cx, 0.62, cz + (ry ? 0.16 : -0.16));
          for (const [dx, dz] of [
            [-0.15, -0.14],
            [0.15, -0.14],
            [-0.15, 0.14],
            [0.15, 0.14],
          ]) {
            pCyl(0.014, 0.014, 0.43, 6, M_CHR, cx + dx, 0.215, cz + dz);
          }
        }
      }
    });
    defineProp('r4Stack', () => {
      const w = 0.68;
      const h = 2.25;
      const d = 5.4;
      pBox(w, h, 0.05, M_WOOD_D, 0, h / 2, -d / 2);
      pBox(w, h, 0.05, M_WOOD_D, 0, h / 2, d / 2);
      pBox(0.03, h - 0.06, d - 0.1, M_WOOD_M, 0, h / 2, 0);
      pBox(w + 0.03, 0.05, d, M_WOOD_D, 0, h + 0.02, 0);
      const rng = mulberry32(419);
      for (let lv = 0; lv < 5; lv++) {
        const sy = 0.16 + lv * 0.42;
        pBox(w - 0.02, 0.03, d - 0.1, M_WOOD_L, 0, sy, 0);
        for (const s of [-1, 1]) {
          for (let b = 0; b < 6; b++) {
            const bz = -d / 2 + 0.5 + b * 0.82;
            const bh = 0.22 + (lv % 2) * 0.04;
            pBox(0.22, bh, 0.68, mat(BOOK_PAL[Math.floor(rng() * BOOK_PAL.length)], 0.6), s * 0.17, sy + 0.02 + bh / 2, bz);
          }
        }
      }
    });

    const addFan4 = (x: number, y: number, z: number, teal = false) => {
      const m = teal ? M_TEAL : M_COL;
      const g = G(f45Group, x, y, z);
      cyl(0.07, 0.05, 0.06, 10, m, 0, 0, 0, 0, 0, 0, g);
      cyl(0.018, 0.018, 0.34, 8, m, 0, -0.18, 0, 0, 0, 0, g);
      const h = G(g, 0, -0.36, 0);
      cyl(0.11, 0.11, 0.05, 12, m, 0, 0, 0, 0, 0, 0, h);
      for (let i = 0; i < 3; i++) {
        const b = G(h, 0, 0, 0, (i * Math.PI * 2) / 3);
        box(0.54, 0.012, 0.1, m, 0.33, 0, 0, 0.12, 0, 0, b);
      }
      fans4.push(h);
    };
    const shellRoom = (x0: number, x1: number, z0: number, z1: number, y0: number, h: number, skip: 'x0' | 'x1' | 'z0' | 'z1') => {
      const w = x1 - x0;
      const d = z1 - z0;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      mk(new THREE.PlaneGeometry(w, d), M_FLR_W, cx, y0 + 0.012, cz, -Math.PI / 2, 0, 0, f45Group);
      mk(new THREE.PlaneGeometry(w, d), M_CEIL, cx, y0 + h, cz, Math.PI / 2, 0, 0, f45Group);
      if (skip !== 'z0') box(w, h, 0.25, M_WALL, cx, y0 + h / 2, z0, 0, 0, 0, f45Group);
      if (skip !== 'z1') box(w, h, 0.25, M_WALL, cx, y0 + h / 2, z1, 0, 0, 0, f45Group);
      if (skip !== 'x0') box(0.25, h, d, M_WALL, x0, y0 + h / 2, cz, 0, 0, 0, f45Group);
      if (skip !== 'x1') box(0.25, h, d, M_WALL, x1, y0 + h / 2, cz, 0, 0, 0, f45Group);
      for (const lx of lin(3, x0 + 2.6, x1 - 2.6)) {
        for (const lz of lin(4, z0 + 2.8, z1 - 2.8)) {
          box(0.45, 0.03, 1.5, M_LGT, lx, y0 + h - 0.02, lz, 0, 0, 0, f45Group);
        }
      }
    };
    const room419 = (y0: number) => {
      const x0 = XW;
      const x1 = 35.5;
      const z0 = -13;
      const z1 = 13;
      const h = 3.9;
      shellRoom(x0, x1, z0, z1, y0, h, 'x0');
      for (const wz of lin(5, -9.6, 9.6)) {
        box(0.06, 1.5, 2.2, M_GLS, x1 - 0.14, y0 + 2.1, wz, 0, 0, 0, f45Group);
        box(0.08, 1.75, 0.55, M_CURT, x1 - 0.22, y0 + 2.05, wz - 0.95, 0, 0, 0, f45Group);
        box(0.08, 1.75, 0.55, M_CURT, x1 - 0.22, y0 + 2.05, wz + 0.95, 0, 0, 0, f45Group);
      }
      for (const tx of [24.2, 31.2]) {
        for (const tz of [-9.5, -5, 0, 5, 9.5]) {
          place('r4LongTbl', tx, y0, tz, 0);
          addFan4(tx, y0 + h, tz);
        }
      }
      for (const sx of [23.5, 28, 32.5]) {
        place('shelf', sx, y0, z0 + 0.55, 0);
        place('shelf', sx, y0, z1 - 0.55, Math.PI);
      }
    };
    const room402 = (y0: number) => {
      const x0 = -35.5;
      const x1 = -XW;
      const z0 = -13;
      const z1 = 13;
      const h = 3.9;
      shellRoom(x0, x1, z0, z1, y0, h, 'x1');
      for (const wz of lin(5, -9.6, 9.6)) box(0.06, 1.5, 2.2, M_GLS, x0 + 0.14, y0 + 2.1, wz, 0, 0, 0, f45Group);
      for (const sx of lin(6, -33.2, -22.2)) place('r4Stack', sx, y0, -6.2, 0);
      for (const tz of [1.5, 5.2, 8.9]) {
        place('r4LongTbl', -30.5, y0, tz, 0);
        place('r4LongTbl', -24.2, y0, tz, 0);
      }
      for (const fx of [-30.5, -24.2]) {
        for (const fz of [-7, 1.5, 8.5]) addFan4(fx, y0 + h, fz);
      }
    };
    const room411 = (y0: number) => {
      const x0 = -16;
      const x1 = 16;
      const z0 = ZF;
      const z1 = 27.5;
      const h = 3.9;
      shellRoom(x0, x1, z0, z1, y0, h, 'z0');
      for (const wx of lin(6, -12.5, 12.5)) box(2.3, 1.5, 0.06, M_GLS, wx, y0 + 2.1, z1 - 0.14, 0, 0, 0, f45Group);
      for (const cx of [-6.2, 6.2]) {
        for (const cz of [17.2, 22.8]) {
          cyl(0.34, 0.34, h - 0.55, 18, M_COL, cx, y0 + (h - 0.55) / 2, cz, 0, 0, 0, f45Group);
          cyl(0.68, 0.34, 0.55, 18, M_COL, cx, y0 + h - 0.28, cz, 0, 0, 0, f45Group);
          cyl(0.22, 0.22, 0.08, 12, M_BLUE_CH, cx + 0.38, y0 + 2.2, cz, 0, 0, Math.PI / 2, f45Group);
        }
      }
      for (const tx of [-11.5, -3.2, 3.2, 11.5]) {
        for (const tz of [16.5, 20.2, 24]) {
          place('r4LongTbl', tx, y0, tz, 0);
        }
      }
      for (const fx of [-10, -3.2, 3.2, 10]) {
        for (const fz of [16.8, 23.2]) addFan4(fx, y0 + h, fz, true);
      }
      place('gate', -0.7, y0, z0 + 1.1);
      place('gate', 0.7, y0, z0 + 1.1);
    };
    const fill418 = (y0: number) => {
      shellRoom(5.0, 18.0, -31.5, ZB, y0, 3.9, 'z1');
      for (const tx of [8.2, 13.8]) {
        for (const tz of [-17.5, -22, -26.5]) place('r4LongTbl', tx, y0, tz, 0);
      }
      place('shelf', 11.5, y0, -30, 0);
    };
    const fill404 = (y0: number) => {
      for (const tz of [-9.5, -3.5]) {
        place('round4', -22.2, y0, tz, 0.2);
        place('sofa', -24.5, y0, tz, Math.PI / 2);
      }
    };
    for (const fy of [3 * FH, 4 * FH]) {
      room419(fy);
      room402(fy);
      room411(fy);
      fill418(fy);
      fill404(fy);
    }

    buildProps(f45Group);
  };

  const insideCab = (x: number, z: number) =>
    elevators.findIndex((c) => Math.abs(x - ECX) < ECW / 2 - 0.15 && Math.abs(z - c.z) < ECD / 2 - 0.15);
  const nearShaft = (x: number, z: number) =>
    elevators.findIndex((c) => Math.abs(x - (EX - 0.7)) < 1.3 && Math.abs(z - c.z) < 1.1);
  const callLift = (flr: number, prefer = -1) => {
    let best = prefer >= 0 ? prefer : 0;
    let bestD = 99;
    elevators.forEach((c, i) => {
      const d = Math.abs(c.floor - flr) + (c.state === 'moving' ? 3 : 0);
      if (prefer < 0 && d < bestD) {
        bestD = d;
        best = i;
      }
    });
    const c = elevators[best];
    c.target = flr;
    if (Math.abs(c.y - (flr - 1) * FH) < 0.05) {
      c.state = 'opening';
    } else if (c.state === 'open' || c.state === 'opening') {
      c.state = 'closing';
    } else if (c.state === 'idle') {
      c.state = 'moving';
    }
    return best;
  };
  const sendLift = (idx: number, flr: number) => {
    const c = elevators[idx];
    if (!c || flr === c.floor) return;
    c.target = flr;
    c.state = c.open > 0.05 ? 'closing' : 'moving';
  };

  const stairAt = (x: number, z: number) => {
    const hit = evaluateCurvedStairAt(x, z);
    return hit ? { y: hit.elevation } : null;
  };

  const surface = (x: number, z: number, curY: number): { ok: boolean; y: number } => {
    const ci = insideCab(x, z);
    if (ci >= 0) {
      const c = elevators[ci];
      if (Math.abs(curY - c.y) < 0.9) return { ok: true, y: c.y };
    }
    const flrNum = Math.max(1, Math.min(NF, Math.round(curY / FH) + 1)) as LibraryFloor;
    const loc = createLibraryLocation(flrNum, x, z, curY);
    const moved = resolveLibraryMovement(loc, loc);
    if (moved.blocked || !moved.grounded) {
      return { ok: false, y: curY };
    }
    const ground = queryLibraryGround(moved.position);
    return {
      ok: ground.supported && ground.elevation !== null,
      y: ground.elevation ?? curY,
    };
  };

  const update = (dt: number, px: number, py: number, pz: number, activeFloor?: number) => {
    const pFlr =
      typeof activeFloor === 'number'
        ? sanitizeLibraryFloor(activeFloor, 1)
        : Math.max(1, Math.min(NF, Math.round(py / FH) + 1));
    const onF45 = pFlr === 4 || pFlr === 5;
    if (onF45) ensureFloors4To5();
    if (f45Group.visible !== onF45) f45Group.visible = onF45;
    if (r401G.visible !== (pFlr === 4)) r401G.visible = pFlr === 4;
    if (r501G.visible !== (pFlr === 5)) r501G.visible = pFlr === 5;
    if (pFlr === 4) ensureR401().update(dt, px, pz - R4Z, pz < ZB + 1);
    if (pFlr === 5) ensureR501().update(dt, px, pz - R4Z, pz < ZB + 1);
    if (onF45) {
      for (let i = 0; i < fans4.length; i++) {
        fans4[i].rotation.y += dt * (4.2 + (i % 3) * 0.3);
      }
    }
    // Tự động mở cửa thang máy khi người chơi đứng gần cửa thang máy ở tầng hiện tại
    const nearIdx = nearShaft(px, pz);
    if (nearIdx >= 0) {
      const c = elevators[nearIdx];
      if (c.state === 'idle' && c.floor === pFlr) {
        c.state = 'opening';
      }
    }
    for (const c of elevators) {
      const ty = (c.target - 1) * FH;
      if (c.state === 'opening') {
        c.open = Math.min(1, c.open + dt * 1.9);
        if (c.open >= 1) {
          c.state = 'open';
          c.timer = 6;
        }
      } else if (c.state === 'open') {
        c.timer -= dt;
        if (c.timer <= 0) c.state = 'closing';
      } else if (c.state === 'closing') {
        c.open = Math.max(0, c.open - dt * 1.9);
        if (c.open <= 0) c.state = Math.abs(c.y - ty) > 0.02 ? 'moving' : 'idle';
      } else if (c.state === 'moving') {
        const dir = Math.sign(ty - c.y);
        c.vy = dir * 3.6;
        c.y += c.vy * dt;
        if ((dir > 0 && c.y >= ty) || (dir < 0 && c.y <= ty)) {
          c.y = ty;
          c.vy = 0;
          c.floor = c.target;
          c.state = 'opening';
        }
      }
      c.cab.position.y = c.y;
      const s = c.open * 0.42;
      c.cabDL.position.z = -0.41 - s;
      c.cabDR.position.z = 0.41 + s;
      for (let f = 1; f <= NF; f++) {
        const d = c.doors[f];
        const fo = f === c.floor ? s : 0;
        d.l.position.z = -0.42 - fo;
        d.r.position.z = 0.42 + fo;
      }
    }
  };

  return {
    elevators,
    callLift,
    sendLift,
    insideCab,
    nearShaft,
    stairAt,
    surface,
    update,
  };
}
