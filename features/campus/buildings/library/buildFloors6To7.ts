// ---------------------------------------------------------------------------
// buildFloors6To7.ts — Khối B: Tầng 6 (Không gian Sáng tạo, Lounge & Đại dương cầm
// Grand Piano 88 phím) và Tầng 7 (Tầng lửng thông tầng "INNOVATE · CONNECT ·
// COLLABORATE · CREATE").
// Chuyển thể chuẩn 1:1 từ mô hình thủ tục studywithhuster.cyou (moduleB).
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { canvasTex, mulberry32 } from './procedural-helpers';
import {
  BLOCK_B_DIMS,
  createLibraryLocation,
  queryLibraryGround,
  resolveLibraryMovement,
} from '../../world-data/library-spatial';

export interface PianoKey3D {
  midi: number;
  name: string;
  black: boolean;
  pivot: THREE.Group;
  press: number;
  target: number;
}

export interface Floors6To7Controller {
  pianoPos: { x: number; z: number };
  pianoKeys: PianoKey3D[];
  playPianoNote: (midi: number, velocity?: number) => void;
  groundY: (x: number, z: number, level: 6 | 7) => number;
  blockedAt: (x: number, z: number, level: 6 | 7) => boolean;
  update: (dt: number) => void;
}

export function buildFloors6To7(world: THREE.Group): Floors6To7Controller {
  const L = 7.5;
  const PR = 9.5;
  const PY = 0.6;
  const FR = 11.0;
  const WR = 16.5;
  const MZ = 5.25;
  const CH = 9.8;
  const EX = L + WR + 0.12;
  const ELEV_Z = [-3.6, 0, 3.6];
  const DESK = { x: 0, z: -11.2 };
  const PIANO = { x: -6.6, z: 3.6 };

  const stadAt = (s: number, r: number): [number, number] => {
    const seg = L * 2;
    const arc = Math.PI * r;
    const per = 2 * (seg + arc);
    let u = (((s % 1) + 1) % 1) * per;
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
  const atQ = (x: number, z: number) => {
    const cx = Math.max(-L, Math.min(L, x));
    const dx = x - cx;
    return { cx, dx, d: Math.hypot(dx, z) };
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
  ) => mk((gCache[`b_${w}_${h}_${d}`] ??= new THREE.BoxGeometry(w, h, d)), m, x, y, z, rx, ry, rz, p);
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
  ) => mk((gCache[`c_${rt}_${rb}_${h}_${s}`] ??= new THREE.CylinderGeometry(rt, rb, h, s)), m, x, y, z, rx, ry, rz, p);

  const stadHolePath = (r: number) => {
    const h = new THREE.Path();
    h.moveTo(-L, -r);
    h.lineTo(L, -r);
    h.absarc(L, 0, r, -Math.PI / 2, Math.PI / 2, false);
    h.lineTo(-L, r);
    h.absarc(-L, 0, r, Math.PI / 2, (Math.PI * 3) / 2, false);
    return h;
  };
  const stadShape = (rOuter: number, rInner = 0) => {
    const s = new THREE.Shape();
    s.moveTo(-L, -rOuter);
    s.lineTo(L, -rOuter);
    s.absarc(L, 0, rOuter, -Math.PI / 2, Math.PI / 2, false);
    s.lineTo(-L, rOuter);
    s.absarc(-L, 0, rOuter, Math.PI / 2, (Math.PI * 3) / 2, false);
    if (rInner > 0) s.holes.push(stadHolePath(rInner));
    return s;
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
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return mk(geo, m, 0, 0, 0, 0, 0, 0, p);
  };
  const stadRing = (r0: number, r1: number, y0: number, y1: number, m: THREE.Material, seg = 140) =>
    ribbon(Array.from({ length: seg + 1 }, (_, i) => stadAt(i / seg, r0)), r0, r1, y0, y1, m);

  // Vật liệu
  const M_WALL = mat(0xf4f1ea, 0.8);
  const M_CEIL = mat(0xf7f5ef, 0.88);
  const M_COL = mat(0xfaf8f2, 0.68);
  const M_TRIM = mat(0xd8d0c0, 0.72);
  const M_WOOD_D = mat(0x3b2314, 0.44, 0.08);
  const M_WOOD_M = mat(0x9b6b3e, 0.5, 0.06);
  const M_WOOD_L = mat(0xd8b482, 0.48, 0.05);
  const M_NAVY = mat(0x1b3058, 0.82);
  const M_MUSTARD = mat(0xd49a2a, 0.65);
  const M_RED_CH = mat(0xb82924, 0.52);
  const M_CHR = mat(0xd2d7dd, 0.2, 0.88);
  const M_DRK = mat(0x1f2328, 0.38, 0.72);
  const M_PIANO_BLK = mat(0x0c0d10, 0.12, 0.35);
  const M_GOLD = mat(0xd4af37, 0.26, 0.85);
  const M_GLS = new THREE.MeshStandardMaterial({ color: 0xd4ecfa, transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.1 });
  const M_LED = new THREE.MeshBasicMaterial({ color: 0xffe9b5 });
  const M_SCR = new THREE.MeshBasicMaterial({ color: 0x2563eb });
  const M_LEAF = mat(0x2e6f38, 0.68);

  const woodFloorTex = canvasTex(
    256,
    256,
    (c) => {
      c.fillStyle = '#c89e68';
      c.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 8; y++) {
        c.fillStyle = y & 1 ? '#be925c' : '#cea572';
        c.fillRect(0, y * 32, 256, 30);
        c.strokeStyle = 'rgba(75,45,20,0.28)';
        c.strokeRect(0, y * 32, 256, 32);
      }
    },
    14,
    14,
  );
  const tileFloorTex = canvasTex(
    256,
    256,
    (c) => {
      c.fillStyle = '#ece7dc';
      c.fillRect(0, 0, 256, 256);
      c.strokeStyle = '#d4ccb8';
      c.lineWidth = 3;
      for (let i = 0; i <= 4; i++) {
        c.beginPath();
        c.moveTo(i * 64, 0);
        c.lineTo(i * 64, 256);
        c.moveTo(0, i * 64);
        c.lineTo(256, i * 64);
        c.stroke();
      }
    },
    18,
    18,
  );
  const M_FLR_WOOD = new THREE.MeshStandardMaterial({ map: woodFloorTex, roughness: 0.35, metalness: 0.06 });
  const M_FLR_TILE = new THREE.MeshStandardMaterial({ map: tileFloorTex, roughness: 0.3, metalness: 0.06 });

  // Sàn hành lang Tầng 6 (y = 0) & Bục trung tâm hình sân vận động (y = PY = 0.6)
  {
    const corrGeo = new THREE.ShapeGeometry(stadShape(WR, PR - 0.1), 96);
    corrGeo.rotateX(-Math.PI / 2);
    mk(corrGeo, M_FLR_TILE, 0, 0, 0);

    const platGeo = new THREE.ExtrudeGeometry(stadShape(PR), { depth: PY, bevelEnabled: false, curveSegments: 80 });
    platGeo.rotateX(-Math.PI / 2);
    mk(platGeo, M_WOOD_M, 0, 0, 0);

    const topGeo = new THREE.ShapeGeometry(stadShape(PR - 0.05), 80);
    topGeo.rotateX(-Math.PI / 2);
    mk(topGeo, M_FLR_WOOD, 0, PY + 0.008, 0);
    stadRing(PR - 0.06, PR + 0.04, PY - 0.08, PY + 0.02, M_LED);

    // 4 cụm bậc tam cấp bước lên bục trung tâm
    for (const s of [0.08, 0.42, 0.58, 0.92]) {
      const [sx, sz] = stadAt(s, PR + 0.35);
      const ry = ryOf(sx, sz);
      const sg = G(world, sx, 0, sz, ry);
      for (let st = 0; st < 3; st++) {
        box(2.2, 0.2, 0.36, M_WOOD_L, 0, (st + 0.5) * 0.2, (1 - st) * 0.34, 0, 0, 0, sg);
      }
    }
  }

  // Tầng lửng Tầng 7 (y = MZ = 5.25) + Dải chữ phát sáng "INNOVATE · CONNECT · COLLABORATE · CREATE"
  {
    const mzSlab = new THREE.ExtrudeGeometry(stadShape(WR, FR), { depth: 0.38, bevelEnabled: false, curveSegments: 88 });
    mzSlab.rotateX(-Math.PI / 2);
    mk(mzSlab, M_CEIL, 0, MZ - 0.38, 0);

    const mzTop = new THREE.ShapeGeometry(stadShape(WR - 0.1, FR + 0.04), 88);
    mzTop.rotateX(-Math.PI / 2);
    mk(mzTop, M_FLR_TILE, 0, MZ + 0.006, 0);

    // Lan can kính + tay vịn gỗ Tầng 7
    stadRing(FR - 0.04, FR + 0.04, MZ, MZ + 1.05, M_GLS);
    stadRing(FR - 0.06, FR + 0.06, MZ + 1.05, MZ + 1.12, M_WOOD_D);
    stadRing(FR - 0.08, FR + 0.02, MZ - 0.36, MZ - 0.28, M_LED);

    // Dải chữ phát sáng chạy quanh diềm thông tầng Tầng 7
    const fasciaTex = canvasTex(
      2048,
      128,
      (c) => {
        c.fillStyle = '#162847';
        c.fillRect(0, 0, 2048, 128);
        c.strokeStyle = '#fbbf24';
        c.lineWidth = 6;
        c.strokeRect(0, 4, 2048, 120);
        c.fillStyle = '#fef3c7';
        c.font = 'bold 48px Segoe UI,sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('INNOVATE  ·  CONNECT  ·  COLLABORATE  ·  CREATE  ·  HUST LIBRARY  ·', 1024, 64);
      },
      3,
      1,
    );
    stadRing(FR - 0.09, FR - 0.01, MZ - 0.28, MZ + 0.02, new THREE.MeshBasicMaterial({ map: fasciaTex }));
  }

  // Tường bao hình sân vận động & Trần cao CH = 9.8m + 12 cột tròn lớn
  stadRing(WR, WR + 0.32, 0, CH, M_WALL, 120);
  {
    const ceilGeo = new THREE.ShapeGeometry(stadShape(WR + 0.2), 96);
    ceilGeo.rotateX(Math.PI / 2);
    mk(ceilGeo, M_CEIL, 0, CH, 0);
    stadRing(FR - 1.2, FR - 0.9, CH - 0.08, CH, M_LED, 96);
  }
  for (let i = 0; i < 12; i++) {
    const [cx, cz] = stadAt(i / 12, FR + 0.55);
    cyl(0.36, 0.36, CH, 20, M_COL, cx, CH / 2, cz);
    cyl(0.44, 0.46, 0.18, 20, M_TRIM, cx, 0.09, cz);
  }

  // 3 Cửa thang máy ở sảnh Đông Tầng 6 & Tầng 7
  for (const lvY of [0, MZ]) {
    for (const ez of ELEV_Z) {
      const eg = G(world, EX - 0.35, lvY, ez, -Math.PI / 2);
      box(1.9, 2.48, 0.22, M_CHR, 0, 1.24, 0, 0, 0, 0, eg);
      box(0.78, 2.32, 0.06, M_DRK, -0.41, 1.16, 0.09, 0, 0, 0, eg);
      box(0.78, 2.32, 0.06, M_DRK, 0.41, 1.16, 0.09, 0, 0, 0, eg);
    }
  }

  // Quầy triển lãm tròn + Cột phễu loe (LatheGeometry Funnel Column) ở Bắc (DESK: 0, -11.2)
  {
    const dg = G(world, DESK.x, 0, DESK.z);
    cyl(2.2, 2.2, 0.98, 36, M_WOOD_M, 0, 0.49, 0, 0, 0, 0, dg);
    cyl(1.65, 1.65, 1.0, 36, M_WALL, 0, 0.5, 0, 0, 0, 0, dg);
    cyl(2.32, 2.32, 0.06, 36, M_TRIM, 0, 1.0, 0, 0, 0, 0, dg);

    const lathePts: THREE.Vector2[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const r = 0.42 + Math.pow(t, 2.2) * 2.4;
      lathePts.push(new THREE.Vector2(r, 1.02 + t * (MZ - 1.38)));
    }
    const funnelGeo = new THREE.LatheGeometry(lathePts, 36);
    mk(funnelGeo, M_COL, 0, 0, 0, 0, 0, 0, dg);
    cyl(2.9, 2.9, 0.08, 36, M_LED, 0, MZ - 0.38, 0, 0, 0, 0, dg);

    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      const sg = G(dg, Math.cos(a) * 1.98, 1.18, Math.sin(a) * 1.98, -a + Math.PI / 2);
      box(0.52, 0.34, 0.04, M_DRK, 0, 0, 0, -0.35, 0, 0, sg);
      box(0.46, 0.28, 0.045, M_SCR, 0, 0, 0.01, -0.35, 0, 0, sg);
    }
  }

  // Thảm bầu dục xanh Navy + Đảo gỗ hình thuyền 3 ô dù + Ghế bành vàng Mustard trên bục Tầng 6
  {
    const rugGeo = new THREE.CircleGeometry(4.8, 48);
    rugGeo.rotateX(-Math.PI / 2);
    rugGeo.scale(1.45, 1, 0.92);
    mk(rugGeo, M_NAVY, 1.2, PY + 0.014, 0);

    // Đảo gỗ hình thoi cong (Boat Island) với 3 cây dù trắng ngà
    const boatShape = new THREE.Shape();
    boatShape.moveTo(-3.6, 0);
    boatShape.quadraticCurveTo(0, 1.45, 3.6, 0);
    boatShape.quadraticCurveTo(0, -1.45, -3.6, 0);
    const boatGeo = new THREE.ExtrudeGeometry(boatShape, { depth: 0.46, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04 });
    boatGeo.rotateX(-Math.PI / 2);
    const boatG = G(world, 2.2, PY, -1.2, 0.18);
    mk(boatGeo, M_WOOD_L, 0, 0, 0, 0, 0, 0, boatG);
    for (const ux of [-2.1, 0, 2.1]) {
      cyl(0.04, 0.04, 2.55, 10, M_CHR, ux, 1.5, 0, 0, 0, 0, boatG);
      cyl(0.05, 1.25, 0.38, 16, M_WALL, ux, 2.72, 0, 0, 0, 0, boatG);
      cyl(0.24, 0.18, 0.35, 10, M_LEAF, ux * 0.5, 0.64, 0, 0, 0, 0, boatG);
    }

    // Cụm ghế bành vàng Mustard + bàn trà tròn có đèn ngủ
    for (const [ax, az, ry] of [
      [-1.8, -2.8, 0.4],
      [0.4, -3.4, -0.2],
      [4.2, -3.2, -0.6],
      [-1.4, 2.6, 2.5],
      [1.8, 3.1, 3.0],
      [4.8, 2.4, -2.4],
    ]) {
      const ag = G(world, ax, PY, az, ry);
      box(0.82, 0.38, 0.78, M_MUSTARD, 0, 0.24, 0, 0, 0, 0, ag);
      box(0.82, 0.46, 0.18, M_MUSTARD, 0, 0.58, -0.3, 0, 0, 0, ag);
      box(0.14, 0.36, 0.78, M_MUSTARD, -0.35, 0.42, 0, 0, 0, 0, ag);
      box(0.14, 0.36, 0.78, M_MUSTARD, 0.35, 0.42, 0, 0, 0, 0, ag);
      cyl(0.38, 0.38, 0.04, 16, M_WOOD_D, 0.85, 0.48, 0.2, 0, 0, 0, ag);
      cyl(0.03, 0.03, 0.46, 8, M_CHR, 0.85, 0.24, 0.2, 0, 0, 0, ag);
      cyl(0.14, 0.2, 0.26, 12, M_LED, 0.85, 0.76, 0.2, 0, 0, 0, ag);
    }
  }

  // =========================================================================
  // ĐẠI DƯƠNG CẦM 88 PHÍM (GRAND PIANO) TRÊN BỤC TẦNG 6 (PIANO: -6.6, 3.6)
  // =========================================================================
  const pianoKeys: PianoKey3D[] = [];
  {
    const pg = G(world, PIANO.x, PY, PIANO.z, 0.38);
    // Thân đàn Grand Piano sơn đen bóng
    const bodyS = new THREE.Shape();
    bodyS.moveTo(-0.82, -0.55);
    bodyS.lineTo(0.82, -0.55);
    bodyS.lineTo(0.82, 0.35);
    bodyS.bezierCurveTo(0.82, 1.35, 0.15, 1.45, -0.1, 0.95);
    bodyS.bezierCurveTo(-0.35, 0.55, -0.82, 0.85, -0.82, 0.15);
    bodyS.closePath();
    const bodyGeo = new THREE.ExtrudeGeometry(bodyS, { depth: 0.38, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 });
    bodyGeo.rotateX(-Math.PI / 2);
    mk(bodyGeo, M_PIANO_BLK, 0, 0.68, 0, 0, 0, 0, pg);

    // Khung gang mạ vàng + dây đàn bên trong
    const plateGeo = new THREE.ExtrudeGeometry(bodyS, { depth: 0.03, bevelEnabled: false });
    plateGeo.rotateX(-Math.PI / 2);
    plateGeo.scale(0.9, 1, 0.9);
    mk(plateGeo, M_GOLD, 0, 1.05, 0.04, 0, 0, 0, pg);

    // Nắp đàn mở nghiêng 38° + thanh chống vàng
    const lidGeo = new THREE.ExtrudeGeometry(bodyS, { depth: 0.025, bevelEnabled: false });
    lidGeo.rotateX(-Math.PI / 2);
    const lidPivot = G(pg, -0.8, 1.08, 0);
    lidPivot.rotation.z = 0.62;
    mk(lidGeo, M_PIANO_BLK, 0.8, 0, 0, 0, 0, 0, lidPivot);
    cyl(0.012, 0.012, 0.92, 8, M_GOLD, 0.42, 1.42, -0.1, 0, 0, -0.38, pg);

    // 3 chân đàn tiện + bộ 3 bàn đạp Pedal vàng
    for (const [lx, lz] of [
      [-0.68, -0.42],
      [0.68, -0.42],
      [-0.12, 0.98],
    ]) {
      cyl(0.065, 0.04, 0.68, 12, M_PIANO_BLK, lx, 0.34, lz, 0, 0, 0, pg);
      cyl(0.03, 0.03, 0.05, 10, M_GOLD, lx, 0.025, lz, 0, 0, 0, pg);
    }
    box(0.28, 0.52, 0.04, M_PIANO_BLK, 0, 0.42, -0.42, 0, 0, 0, pg);
    for (const px of [-0.08, 0, 0.08]) {
      box(0.03, 0.02, 0.14, M_GOLD, px, 0.12, -0.48, 0, 0, 0, pg);
    }

    // Giá để bản nhạc + bản nhạc trắng
    box(0.72, 0.24, 0.02, M_PIANO_BLK, 0, 1.18, -0.48, -0.25, 0, 0, pg);
    box(0.46, 0.2, 0.01, M_WALL, 0, 1.19, -0.465, -0.25, 0, 0, pg);

    // Ghế đàn bọc nhung đen
    box(0.76, 0.08, 0.38, M_PIANO_BLK, 0, 0.48, -0.98, 0, 0, 0, pg);
    for (const [bxX, bzZ] of [
      [-0.33, -1.12],
      [0.33, -1.12],
      [-0.33, -0.84],
      [0.33, -0.84],
    ]) {
      box(0.045, 0.46, 0.045, M_PIANO_BLK, bxX, 0.23, bzZ, 0, 0, 0, pg);
    }

    // Bàn phím 88 phím (A0 = MIDI 21 .. C8 = MIDI 108, 52 phím trắng + 36 phím đen)
    const kbG = G(pg, 0, 0.76, -0.58);
    box(1.52, 0.06, 0.24, M_PIANO_BLK, 0, -0.02, 0, 0, 0, 0, kbG);
    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const isBlack = (m: number) => [1, 3, 6, 8, 10].includes(m % 12);
    const wKeyGeo = new THREE.BoxGeometry(0.025, 0.022, 0.145);
    const bKeyGeo = new THREE.BoxGeometry(0.015, 0.028, 0.092);
    const wKeyMat = mat(0xfbfaf6, 0.2, 0.05);
    const bKeyMat = mat(0x141619, 0.25, 0.2);

    let whiteIdx = 0;
    const totalWhites = 52;
    const spanW = 1.42;
    const stepW = spanW / totalWhites;
    for (let midi = 21; midi <= 108; midi++) {
      const blk = isBlack(midi);
      const oct = Math.floor(midi / 12) - 1;
      const name = `${NOTE_NAMES[midi % 12]}${oct}`;
      const kx = -spanW / 2 + (blk ? (whiteIdx - 0.5) * stepW : (whiteIdx + 0.5) * stepW);
      if (!blk) whiteIdx++;
      const pivot = G(kbG, kx, blk ? 0.022 : 0.01, blk ? 0.025 : 0);
      mk(blk ? bKeyGeo : wKeyGeo, blk ? bKeyMat : wKeyMat, 0, 0, blk ? -0.02 : -0.04, 0, 0, 0, pivot);
      pianoKeys.push({ midi, name, black: blk, pivot, press: 0, target: 0 });
    }
  }

  // Bàn học & Kệ sách trên hành lang Tầng 7 (y = MZ = 5.25)
  {
    const rng = mulberry32(607);
    for (let i = 0; i < 14; i++) {
      const s = (i + 0.5) / 14;
      const [tx, tz] = stadAt(s, FR + 2.2);
      if (tx > L + 6) continue;
      const tg = G(world, tx, MZ, tz, ryOf(tx, tz));
      box(1.6, 0.05, 0.85, M_WOOD_L, 0, 0.74, 0, 0, 0, 0, tg);
      for (const [lx, lz] of [
        [-0.7, -0.35],
        [0.7, -0.35],
        [-0.7, 0.35],
        [0.7, 0.35],
      ]) {
        cyl(0.024, 0.024, 0.72, 8, M_CHR, lx, 0.36, lz, 0, 0, 0, tg);
      }
      for (const [cx, cz] of [
        [-0.42, -0.55],
        [0.42, -0.55],
        [-0.42, 0.55],
        [0.42, 0.55],
      ]) {
        box(0.42, 0.05, 0.4, M_RED_CH, cx, 0.44, cz, 0, 0, 0, tg);
        box(0.4, 0.38, 0.05, M_RED_CH, cx, 0.66, cz + (cz > 0 ? 0.18 : -0.18), 0, 0, 0, tg);
      }
      if (rng() > 0.4) {
        box(0.32, 0.03, 0.22, M_MUSTARD, 0.2, 0.78, 0, 0, 0.2, 0, tg);
      }
    }
  }

  // Bộ tổng hợp âm thanh WebAudio cho Đại dương cầm 88 phím
  let audioCtx: AudioContext | null = null;
  const playPianoNote = (midi: number, velocity = 0.75) => {
    const keyObj = pianoKeys.find((k) => k.midi === midi);
    if (keyObj) {
      keyObj.target = 1;
      setTimeout(() => {
        keyObj.target = 0;
      }, 220);
    }
    if (typeof window === 'undefined') return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const master = audioCtx.createGain();
      master.gain.setValueAtTime(0.001, now);
      master.gain.linearRampToValueAtTime(0.22 * velocity, now + 0.012);
      master.gain.exponentialRampToValueAtTime(0.0008, now + 1.85);
      master.connect(audioCtx.destination);

      for (const [mult, amp] of [
        [1, 0.7],
        [2, 0.22],
        [3, 0.08],
      ]) {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = mult === 1 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq * mult, now);
        g.gain.setValueAtTime(amp, now);
        osc.connect(g);
        g.connect(master);
        osc.start(now);
        osc.stop(now + 1.9);
      }
    } catch {
      // Bỏ qua nếu trình duyệt chặn tự động phát âm thanh
    }
  };

  const groundY = (x: number, z: number, level: 6 | 7) => {
    const support = queryLibraryGround(createLibraryLocation(level, x, z, level === 7 ? BLOCK_B_DIMS.MZ : 0));
    return support.supported && support.elevation !== null
      ? support.elevation
      : level === 7
        ? BLOCK_B_DIMS.MZ
        : 0;
  };

  const blockedAt = (x: number, z: number, level: 6 | 7) => {
    const loc = createLibraryLocation(level, x, z, level === 7 ? BLOCK_B_DIMS.MZ : 0);
    const res = resolveLibraryMovement(loc, loc);
    return res.blocked || !res.grounded;
  };

  const update = (dt: number) => {
    for (const k of pianoKeys) {
      k.press += (k.target - k.press) * Math.min(1, dt * 18);
      k.pivot.rotation.x = k.press * 0.08;
    }
  };

  return {
    pianoPos: PIANO,
    pianoKeys,
    playPianoNote,
    groundY,
    blockedAt,
    update,
  };
}
