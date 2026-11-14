'use client';

// ---------------------------------------------------------------------------
// features/campus/atmosphere/CampusAtmosphereFX.tsx — Hiệu ứng không gian
// sống động ĐHBK Hà Nội:
//   - Lá vàng mùa thu rơi lững lờ (Ban ngày & Hoàng hôn) trên các trục dạo bộ
//   - Đom đóm phát sáng lơ lửng quanh mặt & bờ Hồ Tiền (Ban đêm)
//   - Đàn chim bồ câu Quảng trường C1 vỗ cánh bay vòng khi người chơi lại gần
// Module ID: feature.campus.atmosphere
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getCampusGroundElevation } from '../../../lib/campus';
import { playerState, type TimeOfDay } from '../../../lib/playerState';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LEAF_COUNT = 88;
const FIREFLY_COUNT = 48;
const PIGEON_COUNT = 8;

type LeafDatum = {
  baseX: number;
  baseZ: number;
  startY: number;
  fallSpeed: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  scale: number;
  colorHex: string;
};

type FireflyDatum = {
  x: number;
  y: number;
  z: number;
  phase: number;
  speed: number;
  driftR: number;
  colorHex: string;
};

type PigeonRuntime = {
  homeX: number;
  homeZ: number;
  baseYaw: number;
  peckPhase: number;
  flightRemain: number;
  flightOrbitOffset: number;
};

const LEAF_ZONES: ReadonlyArray<{ minX: number; maxX: number; minZ: number; maxZ: number }> = [
  { minX: -68, maxX: -42, minZ: -50, maxZ: -26 }, // Quảng trường C1
  { minX: -44, maxX: 20, minZ: -15, maxZ: -5 },   // Đường Tình Yêu
  { minX: 17, maxX: 28, minZ: 36, maxZ: 82 },     // Dạo bộ Đông Hồ Tiền
  { minX: -78, maxX: -56, minZ: -16, maxZ: 10 },  // Vườn cây Cổng Parabol
];

const LEAF_PALETTE = ['#FDE047', '#FBBF24', '#F59E0B', '#EA580C', '#D97706'] as const;
const FIREFLY_PALETTE = ['#FEF08A', '#D9F99D', '#BEF264', '#FDE047'] as const;

// Đặt đàn bồ câu dọc hai hành lang lát đá trống hai bên Đài phun nước C1 (x ∈ [-66.4..-63.5] & [-52.5..-49.6]),
// hoàn toàn tách khỏi bể nước Đài phun nước và bồn hoa giấy.
const PIGEON_HOMES: ReadonlyArray<{ x: number; z: number; yaw: number }> = [
  { x: -65.3, z: -33.0, yaw: 0.4 },
  { x: -64.5, z: -31.8, yaw: 1.9 },
  { x: -65.6, z: -31.4, yaw: -0.9 },
  { x: -64.6, z: -33.6, yaw: 2.6 },
  { x: -51.2, z: -33.2, yaw: -2.1 },
  { x: -50.3, z: -31.9, yaw: 0.8 },
  { x: -51.5, z: -31.4, yaw: 2.3 },
  { x: -50.4, z: -33.7, yaw: -0.4 },
];

function getPigeonSurfaceY(x: number, z: number): number {
  const base = getCampusGroundElevation(x, z);
  // Nền đá trục chính Quảng trường C1 cao 0.045m
  if (x >= -66.4 && x <= -49.6 && z >= -44.5 && z <= -23.9) {
    return Math.max(base, 0.045);
  }
  return base;
}

/**
 * Tạo hình học & cặp texture PBR (gân lá + bumpMap) cho lá vàng mùa thu 3D hữu cơ.
 * Xuất dùng chung cho cả lá rơi trên không trung (`CampusAtmosphereFX`) và lá
 * Lipa rụng trên mặt sân (`Ground.tsx`) nhằm tránh trùng lặp logic.
 */
export function createAutumnLeafAssets(options?: {
  curvature?: number;
  minYFloor?: number;
  roughness?: number;
}) {
  const curvature = options?.curvature ?? 1.0;
  const minYFloor = options?.minYFloor ?? -Infinity;
  const roughness = options?.roughness ?? 0.68;

  const uSteps = 12;
  const vSteps = 4;
  const cols = vSteps + 1;

  const bladeLen = 0.19;
  const maxHalfW = 0.056;
  const zOrigin = -0.085;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iu = 0; iu <= uSteps; iu++) {
    const t = iu / uSteps;
    // Biên dạng lá bầu ở giữa-gốc và thuôn nhọn thành mũi lá tự nhiên
    const profile =
      t === 0
        ? 0.04
        : t === 1
          ? 0
          : Math.pow(Math.sin(Math.pow(t, 0.72) * Math.PI), 0.78) *
            (1 + 0.06 * Math.sin(t * Math.PI * 5));
    const halfW = maxHalfW * profile;
    const z = zOrigin + t * bladeLen;

    for (let iv = 0; iv <= vSteps; iv++) {
      const s = (iv / vSteps) * 2 - 1; // -1..1 ngang phiến lá
      const x = s * halfW;
      const archY = Math.sin(t * Math.PI) * 0.015 - Math.pow(t, 2.2) * 0.013;
      const foldY = Math.abs(s) * 0.016 * Math.sin(t * Math.PI);
      const twistY = s * (t - 0.4) * 0.011;
      const rawY = curvature * (archY + foldY + twistY);
      const y = Number.isFinite(minYFloor) ? Math.max(minYFloor, rawY + 0.008) : rawY;

      positions.push(x, y, z);
      // UV vùng phiến lá: v ∈ [0.16, 0.98] (dưới cùng 0..0.16 dành cho cuống lá)
      uvs.push(0.5 + s * 0.44 * Math.max(0.15, profile), 0.16 + t * 0.82);
    }
  }

  for (let iu = 0; iu < uSteps; iu++) {
    for (let iv = 0; iv < vSteps; iv++) {
      const a = iu * cols + iv;
      const b = a + 1;
      const c = (iu + 1) * cols + iv;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  // Cuống lá mảnh nối ở gốc lá (z từ -0.115 đến -0.082)
  const stemBaseIdx = positions.length / 3;
  const stemYTip = Number.isFinite(minYFloor) ? Math.max(minYFloor, 0.005) : -0.003 * curvature;
  const stemYJoin = Number.isFinite(minYFloor) ? Math.max(minYFloor, 0.007) : 0;
  positions.push(
    -0.0035, stemYTip, zOrigin - 0.032,
     0.0035, stemYTip, zOrigin - 0.032,
    -0.0028, stemYJoin, zOrigin + 0.002,
     0.0028, stemYJoin, zOrigin + 0.002,
  );
  uvs.push(0.45, 0.02, 0.55, 0.02, 0.46, 0.15, 0.54, 0.15);
  indices.push(
    stemBaseIdx, stemBaseIdx + 2, stemBaseIdx + 1,
    stemBaseIdx + 1, stemBaseIdx + 2, stemBaseIdx + 3,
  );

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // Texture gân lá & sắc độ chuyển màu tự nhiên (Canvas 2D có seed cố định)
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');

  const bc = document.createElement('canvas');
  bc.width = 256;
  bc.height = 256;
  const bctx = bc.getContext('2d');

  const rnd = mulberry32(20261119);
  if (ctx && bctx) {
    // Nền lá sáng ấm để nhân màu với instanceColor mà không bị xỉn
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 130);
    grad.addColorStop(0, '#FFFBEB');
    grad.addColorStop(0.55, '#FEF3C7');
    grad.addColorStop(0.88, '#FDE68A');
    grad.addColorStop(1, '#F59E0B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Dải màu nâu ấm cho vùng UV cuống lá (đáy canvas tương ứng UV y = 0..0.16)
    ctx.fillStyle = '#92400E';
    ctx.fillRect(0, 215, 256, 41);

    bctx.fillStyle = '#7A7A7A';
    bctx.fillRect(0, 0, 256, 256);

    // Đốm lá thu tự nhiên rải nhẹ
    for (let i = 0; i < 65; i++) {
      const sx = 24 + rnd() * 208;
      const sy = 14 + rnd() * 194;
      const sr = 1.5 + rnd() * 4.5;
      ctx.fillStyle =
        rnd() > 0.45 ? 'rgba(180, 83, 9, 0.14)' : 'rgba(255, 251, 235, 0.22)';
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Gân chính dọc sống lá
    ctx.strokeStyle = 'rgba(146, 64, 14, 0.48)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(128, 224);
    ctx.lineTo(128, 14);
    ctx.stroke();

    bctx.strokeStyle = '#DFDFDF';
    bctx.lineWidth = 5;
    bctx.lineCap = 'round';
    bctx.beginPath();
    bctx.moveTo(128, 224);
    bctx.lineTo(128, 14);
    bctx.stroke();

    // 7 cặp gân nhánh cong về phía mũi lá
    ctx.strokeStyle = 'rgba(146, 64, 14, 0.34)';
    ctx.lineWidth = 2.1;
    bctx.strokeStyle = '#BDBDBD';
    bctx.lineWidth = 2.5;
    for (let k = 0; k < 7; k++) {
      const yBase = 198 - k * 25;
      const span = 96 - k * 9;
      const yTip = Math.max(12, yBase - (34 - k * 2));
      for (const dir of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(128, yBase);
        ctx.quadraticCurveTo(128 + dir * span * 0.55, yBase - 12, 128 + dir * span, yTip);
        ctx.stroke();

        bctx.beginPath();
        bctx.moveTo(128, yBase);
        bctx.quadraticCurveTo(128 + dir * span * 0.55, yBase - 12, 128 + dir * span, yTip);
        bctx.stroke();
      }
    }
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bc);
  bumpMap.needsUpdate = true;

  const mat = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    map,
    bumpMap,
    bumpScale: 0.008,
    roughness,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });

  return { geo, mat, map, bumpMap };
}

function createFireflyAssets() {
  // 3 mặt phẳng giao nhau vuông góc (crossed quads) giúp đom đóm phát quầng tròn đều từ mọi góc nhìn
  const planes = [
    new THREE.PlaneGeometry(0.28, 0.28),
    new THREE.PlaneGeometry(0.28, 0.28).rotateY(Math.PI / 2),
    new THREE.PlaneGeometry(0.28, 0.28).rotateX(Math.PI / 2),
  ];
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let offset = 0;
  for (const g of planes) {
    const p = g.attributes.position.array as Float32Array;
    const n = g.attributes.normal.array as Float32Array;
    const u = g.attributes.uv.array as Float32Array;
    for (let i = 0; i < p.length; i++) positions.push(p[i]);
    for (let i = 0; i < n.length; i++) normals.push(n[i]);
    for (let i = 0; i < u.length; i++) uvs.push(u[i]);
    const idx = g.index!;
    for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + offset);
    offset += g.attributes.position.count;
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);

  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);
    const grad = ctx.createRadialGradient(64, 64, 1, 64, 64, 62);
    grad.addColorStop(0.0, 'rgba(255, 255, 240, 1.0)');
    grad.addColorStop(0.16, 'rgba(254, 249, 195, 0.92)');
    grad.addColorStop(0.36, 'rgba(217, 249, 157, 0.45)');
    grad.addColorStop(0.7, 'rgba(132, 204, 22, 0.12)');
    grad.addColorStop(1.0, 'rgba(132, 204, 22, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  glowTex.needsUpdate = true;

  const mat = new THREE.MeshBasicMaterial({
    color: '#FFFFFF',
    map: glowTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });

  return { geo, mat, glowTex };
}

function createPigeonAssets() {
  const bodyGeo = new THREE.SphereGeometry(0.092, 10, 8);
  bodyGeo.scale(0.84, 0.82, 1.34);
  const headGeo = new THREE.SphereGeometry(0.048, 10, 8);
  const neckCollarGeo = new THREE.TorusGeometry(0.044, 0.015, 6, 12);
  const eyeGeo = new THREE.SphereGeometry(0.008, 6, 6);
  const cereGeo = new THREE.SphereGeometry(0.014, 6, 5);
  const beakGeo = new THREE.ConeGeometry(0.014, 0.042, 6);
  const legGeo = new THREE.CylinderGeometry(0.006, 0.005, 0.062, 6);
  const footGeo = new THREE.ConeGeometry(0.014, 0.028, 4);

  // Cánh chim hữu cơ có lông đầu cánh (pivot ngay khớp vai x = 0)
  const buildWingGeo = (sideSign: 1 | -1) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.055);
    s.quadraticCurveTo(0.09, 0.072, 0.21, 0.025);
    // 3 khía lông cánh sơ cấp ở đầu cánh
    s.lineTo(0.225, -0.005);
    s.lineTo(0.185, -0.022);
    s.lineTo(0.2, -0.042);
    s.lineTo(0.14, -0.068);
    s.quadraticCurveTo(0.06, -0.075, 0, -0.055);
    s.closePath();

    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.003,
      bevelSegments: 1,
    });
    g.rotateX(-Math.PI / 2);
    if (sideSign < 0) {
      g.scale(-1, 1, 1);
      // Đảo thứ tự tam giác khi phản chiếu gương qua trục X để normal không bị lộn vào trong
      const pos = g.attributes.position as THREE.BufferAttribute;
      if (g.index) {
        const idx = g.index;
        for (let i = 0; i < idx.count; i += 3) {
          const b = idx.getX(i + 1);
          idx.setX(i + 1, idx.getX(i + 2));
          idx.setX(i + 2, b);
        }
      } else {
        for (let i = 0; i < pos.count; i += 3) {
          for (let k = 0; k < 3; k++) {
            const tmp = pos.array[(i + 1) * 3 + k];
            (pos.array as Float32Array)[(i + 1) * 3 + k] = pos.array[(i + 2) * 3 + k];
            (pos.array as Float32Array)[(i + 2) * 3 + k] = tmp;
          }
        }
      }
      g.computeVertexNormals();
    }
    // Gán UV phẳng chuẩn hóa 0..1 lên mặt cánh để vẽ vạch cánh bồ câu (wing bars)
    const p = g.attributes.position as THREE.BufferAttribute;
    const uvArr = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      const px = Math.abs(p.getX(i));
      const pz = p.getZ(i);
      uvArr[i * 2] = Math.min(1, Math.max(0, px / 0.225));
      uvArr[i * 2 + 1] = Math.min(1, Math.max(0, (pz + 0.08) / 0.16));
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
    return g;
  };

  const wingLGeo = buildWingGeo(1);
  const wingRGeo = buildWingGeo(-1);

  // Đuôi chim xòe quạt
  const tailShape = new THREE.Shape();
  tailShape.moveTo(-0.024, 0);
  tailShape.lineTo(0.024, 0);
  tailShape.lineTo(0.056, -0.115);
  tailShape.quadraticCurveTo(0, -0.132, -0.056, -0.115);
  tailShape.closePath();
  const tailGeo = new THREE.ExtrudeGeometry(tailShape, {
    depth: 0.01,
    bevelEnabled: false,
  });
  tailGeo.rotateX(Math.PI / 2);
  const tailPos = tailGeo.attributes.position as THREE.BufferAttribute;
  const tailUv = new Float32Array(tailPos.count * 2);
  for (let i = 0; i < tailPos.count; i++) {
    tailUv[i * 2] = (tailPos.getX(i) + 0.06) / 0.12;
    tailUv[i * 2 + 1] = Math.min(1, Math.max(0, -tailPos.getZ(i) / 0.135));
  }
  tailGeo.setAttribute('uv', new THREE.BufferAttribute(tailUv, 2));

  // Texture cánh & đuôi bồ câu (2 vạch đen + đầu cánh xám sẫm)
  const wingCanvas = document.createElement('canvas');
  wingCanvas.width = 128;
  wingCanvas.height = 128;
  const wctx = wingCanvas.getContext('2d');
  if (wctx) {
    const grad = wctx.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, '#CBD5E1');
    grad.addColorStop(0.55, '#94A3B8');
    grad.addColorStop(1, '#334155');
    wctx.fillStyle = grad;
    wctx.fillRect(0, 0, 128, 128);
    // Hai vạch cánh đặc trưng
    wctx.fillStyle = '#1E293B';
    wctx.fillRect(46, 0, 9, 128);
    wctx.fillRect(68, 0, 9, 128);
  }
  const wingTex = new THREE.CanvasTexture(wingCanvas);
  wingTex.colorSpace = THREE.SRGBColorSpace;
  wingTex.needsUpdate = true;

  const tailCanvas = document.createElement('canvas');
  tailCanvas.width = 64;
  tailCanvas.height = 128;
  const tctx = tailCanvas.getContext('2d');
  if (tctx) {
    tctx.fillStyle = '#94A3B8';
    tctx.fillRect(0, 0, 64, 128);
    tctx.fillStyle = '#1E293B';
    tctx.fillRect(0, 0, 64, 34);
  }
  const tailTex = new THREE.CanvasTexture(tailCanvas);
  tailTex.colorSpace = THREE.SRGBColorSpace;
  tailTex.needsUpdate = true;

  const bodyMat = new THREE.MeshStandardMaterial({ color: '#CBD5E1', roughness: 0.78 });
  const headMat = new THREE.MeshStandardMaterial({ color: '#64748B', roughness: 0.7 });
  const collarMat = new THREE.MeshStandardMaterial({
    color: '#0F766E',
    roughness: 0.42,
    metalness: 0.28,
  });
  const beakMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.55 });
  const cereMat = new THREE.MeshStandardMaterial({ color: '#F1F5F9', roughness: 0.65 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.2 });
  const footMat = new THREE.MeshStandardMaterial({ color: '#FB7185', roughness: 0.6 });
  const wingMat = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    map: wingTex,
    roughness: 0.72,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    map: tailTex,
    roughness: 0.76,
  });

  return {
    geos: [
      bodyGeo,
      headGeo,
      neckCollarGeo,
      eyeGeo,
      cereGeo,
      beakGeo,
      legGeo,
      footGeo,
      wingLGeo,
      wingRGeo,
      tailGeo,
    ] as const,
    mats: [
      bodyMat,
      headMat,
      collarMat,
      beakMat,
      cereMat,
      eyeMat,
      footMat,
      wingMat,
      tailMat,
    ] as const,
    texs: [wingTex, tailTex] as const,
    bodyGeo,
    headGeo,
    neckCollarGeo,
    eyeGeo,
    cereGeo,
    beakGeo,
    legGeo,
    footGeo,
    wingLGeo,
    wingRGeo,
    tailGeo,
    bodyMat,
    headMat,
    collarMat,
    beakMat,
    cereMat,
    eyeMat,
    footMat,
    wingMat,
    tailMat,
  };
}

export default function CampusAtmosphereFX({ timeOfDay }: { timeOfDay: TimeOfDay }) {
  const leafMeshRef = useRef<THREE.InstancedMesh>(null);
  const fireflyMeshRef = useRef<THREE.InstancedMesh>(null);
  const pigeonRootRefs = useRef<Array<THREE.Group | null>>([]);
  const pigeonWingLRefs = useRef<Array<THREE.Mesh | null>>([]);
  const pigeonWingRRefs = useRef<Array<THREE.Mesh | null>>([]);
  const pigeonLegsRefs = useRef<Array<THREE.Group | null>>([]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  const leaves = useMemo<LeafDatum[]>(() => {
    const rng = mulberry32(20261114);
    const out: LeafDatum[] = [];
    for (let i = 0; i < LEAF_COUNT; i++) {
      const z = LEAF_ZONES[i % LEAF_ZONES.length];
      out.push({
        baseX: z.minX + rng() * (z.maxX - z.minX),
        baseZ: z.minZ + rng() * (z.maxZ - z.minZ),
        startY: 0.2 + rng() * 7.8,
        fallSpeed: 0.44 + rng() * 0.38,
        swayAmp: 0.45 + rng() * 0.62,
        swayFreq: 0.85 + rng() * 0.85,
        phase: rng() * Math.PI * 2,
        scale: 0.85 + rng() * 0.65,
        colorHex: LEAF_PALETTE[Math.floor(rng() * LEAF_PALETTE.length)],
      });
    }
    return out;
  }, []);

  const fireflies = useMemo<FireflyDatum[]>(() => {
    const rng = mulberry32(778899);
    const out: FireflyDatum[] = [];
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      // Tập trung quanh bờ và mặt nước Hồ Tiền (x: -20..23, z: 38..86)
      out.push({
        x: -20 + rng() * 43,
        y: 0.45 + rng() * 1.9,
        z: 38 + rng() * 48,
        phase: rng() * Math.PI * 2,
        speed: 1.1 + rng() * 1.6,
        driftR: 0.55 + rng() * 0.85,
        colorHex: FIREFLY_PALETTE[Math.floor(rng() * FIREFLY_PALETTE.length)],
      });
    }
    return out;
  }, []);

  const pigeonsRef = useRef<PigeonRuntime[]>(
    PIGEON_HOMES.slice(0, PIGEON_COUNT).map((h, idx) => ({
      homeX: h.x,
      homeZ: h.z,
      baseYaw: h.yaw,
      peckPhase: idx * 0.9,
      flightRemain: 0,
      flightOrbitOffset: (idx / PIGEON_COUNT) * Math.PI * 2,
    })),
  );

  // Shared Geometries, Textures & Materials with explicit unmount cleanup
  const leafAssets = useMemo(() => createAutumnLeafAssets({ curvature: 1.0 }), []);
  const fireflyAssets = useMemo(() => createFireflyAssets(), []);
  const pigeonAssets = useMemo(() => createPigeonAssets(), []);

  useEffect(() => {
    const mesh = leafMeshRef.current;
    if (!mesh) return;
    const c = new THREE.Color();
    for (let i = 0; i < leaves.length; i++) {
      c.set(leaves[i].colorHex);
      mesh.setColorAt(i, c);
    }
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [leaves]);

  useEffect(() => {
    const flyMesh = fireflyMeshRef.current;
    if (!flyMesh) return;
    const c = new THREE.Color();
    for (let i = 0; i < fireflies.length; i++) {
      c.set(fireflies[i].colorHex);
      flyMesh.setColorAt(i, c);
    }
    if (flyMesh.instanceColor) {
      flyMesh.instanceColor.needsUpdate = true;
    }
  }, [fireflies]);

  useEffect(() => {
    return () => {
      leafAssets.geo.dispose();
      leafAssets.mat.dispose();
      leafAssets.map.dispose();
      leafAssets.bumpMap.dispose();
      fireflyAssets.geo.dispose();
      fireflyAssets.mat.dispose();
      fireflyAssets.glowTex.dispose();
      pigeonAssets.geos.forEach((g) => g.dispose());
      pigeonAssets.mats.forEach((m) => m.dispose());
      pigeonAssets.texs.forEach((t) => t.dispose());
    };
  }, [leafAssets, fireflyAssets, pigeonAssets]);

  const showLeaves = timeOfDay !== 'night';
  const showFireflies = timeOfDay === 'night';

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;

    // 1) Lá vàng mùa thu 3D chao liệng mềm mại theo gió
    const leafMesh = leafMeshRef.current;
    if (leafMesh) {
      leafMesh.visible = showLeaves;
      if (showLeaves) {
        for (let i = 0; i < leaves.length; i++) {
          const l = leaves[i];
          const span = 8.0;
          const y = 0.08 + (((l.startY - t * l.fallSpeed) % span + span) % span);
          const swayPhase = t * l.swayFreq + l.phase;
          const x = l.baseX + Math.sin(swayPhase) * l.swayAmp;
          const z = l.baseZ + Math.cos(swayPhase * 0.8 + l.phase) * l.swayAmp;
          dummy.position.set(x, y, z);
          // Góc nghiêng khí động học ăn khớp với hướng chao ngang
          dummy.rotation.set(
            Math.sin(t * 1.6 + l.phase) * 0.55,
            t * 0.75 + l.phase + Math.sin(swayPhase) * 0.4,
            Math.cos(swayPhase) * 0.65,
          );
          dummy.scale.setScalar(l.scale);
          dummy.updateMatrix();
          leafMesh.setMatrixAt(i, dummy.matrix);
        }
        leafMesh.instanceMatrix.needsUpdate = true;
      }
    }

    // 2) Đom đóm Hồ Tiền ban đêm phát quầng sáng nhấp nháy
    const flyMesh = fireflyMeshRef.current;
    if (flyMesh) {
      flyMesh.visible = showFireflies;
      if (showFireflies) {
        for (let i = 0; i < fireflies.length; i++) {
          const f = fireflies[i];
          const px = f.x + Math.cos(t * 0.55 + f.phase) * f.driftR;
          const pz = f.z + Math.sin(t * 0.48 + f.phase * 1.3) * f.driftR;
          const py = f.y + Math.sin(t * f.speed + f.phase) * 0.32;
          const pulse = 0.45 + 0.9 * (0.5 + 0.5 * Math.sin(t * f.speed * 2.2 + f.phase));
          dummy.position.set(px, py, pz);
          dummy.rotation.set(0, f.phase + t * 0.3, 0);
          dummy.scale.setScalar(pulse);
          dummy.updateMatrix();
          flyMesh.setMatrixAt(i, dummy.matrix);
        }
        flyMesh.instanceMatrix.needsUpdate = true;
      }
    }

    // 3) Đàn chim bồ câu Quảng trường C1: đi bộ nhặt thóc, bay vút lên khi người chơi lại gần
    const playerX = playerState.pos.x;
    const playerZ = playerState.pos.z;
    const pigeons = pigeonsRef.current;
    for (let i = 0; i < pigeons.length; i++) {
      const p = pigeons[i];
      const root = pigeonRootRefs.current[i];
      if (!root) continue;

      const distToHome = Math.hypot(playerX - p.homeX, playerZ - p.homeZ);
      if (distToHome < 3.8 && p.flightRemain < 4.5) {
        p.flightRemain = 6.2;
      }
      if (p.flightRemain > 0) {
        p.flightRemain = Math.max(0, p.flightRemain - dt);
      }

      const groundY = getPigeonSurfaceY(p.homeX, p.homeZ);
      const legsGroup = pigeonLegsRefs.current[i];
      if (p.flightRemain > 0) {
        const progress = p.flightRemain / 6.2;
        const arc = Math.sin(Math.min(1, progress) * Math.PI);
        const orbitAngle = t * 1.65 + p.flightOrbitOffset;
        const radius = 2.6 + (i % 3) * 0.85;
        const fx = p.homeX + Math.cos(orbitAngle) * radius * arc;
        const fz = p.homeZ + Math.sin(orbitAngle) * radius * arc;
        const fy = groundY + 0.1 + arc * (5.2 + (i % 3) * 0.7);
        root.position.set(fx, fy, fz);
        root.rotation.set(-0.22 * arc, -orbitAngle, 0);

        const flap = Math.sin(t * 22 + i) * 0.92;
        const wL = pigeonWingLRefs.current[i];
        const wR = pigeonWingRRefs.current[i];
        if (wL) wL.rotation.z = flap;
        if (wR) wR.rotation.z = -flap;
        if (legsGroup) legsGroup.rotation.x = -0.9;
      } else {
        const wanderX = p.homeX + Math.sin(t * 0.45 + p.peckPhase) * 0.42;
        const wanderZ = p.homeZ + Math.cos(t * 0.42 + p.peckPhase) * 0.42;
        const peckBob = Math.max(0, Math.sin(t * 3.8 + p.peckPhase)) * 0.04;
        root.position.set(wanderX, groundY + 0.098, wanderZ);
        root.rotation.set(peckBob * 3.2, p.baseYaw + Math.sin(t * 0.6 + p.peckPhase) * 0.5, 0);
        const wL = pigeonWingLRefs.current[i];
        const wR = pigeonWingRRefs.current[i];
        if (wL) wL.rotation.z = -0.22;
        if (wR) wR.rotation.z = 0.22;
        if (legsGroup) legsGroup.rotation.x = 0;
      }
    }
  });

  return (
    <group name="CampusAtmosphereFX">
      <instancedMesh
        ref={leafMeshRef}
        args={[leafAssets.geo, leafAssets.mat, LEAF_COUNT]}
        frustumCulled={false}
        visible={showLeaves}
      />
      <instancedMesh
        ref={fireflyMeshRef}
        args={[fireflyAssets.geo, fireflyAssets.mat, FIREFLY_COUNT]}
        frustumCulled={false}
        visible={showFireflies}
      />
      <group name="C1PlazaPigeons">
        {PIGEON_HOMES.slice(0, PIGEON_COUNT).map((h, i) => (
          <group
            key={`pigeon-${i}`}
            ref={(el) => {
              pigeonRootRefs.current[i] = el;
            }}
            position={[h.x, getPigeonSurfaceY(h.x, h.z) + 0.098, h.z]}
            rotation={[0, h.yaw, 0]}
          >
            <mesh geometry={pigeonAssets.bodyGeo} material={pigeonAssets.bodyMat} castShadow />
            <mesh
              position={[0, 0.055, 0.078]}
              rotation={[Math.PI / 2 + 0.35, 0, 0]}
              geometry={pigeonAssets.neckCollarGeo}
              material={pigeonAssets.collarMat}
            />
            <mesh
              position={[0, 0.088, 0.1]}
              geometry={pigeonAssets.headGeo}
              material={pigeonAssets.headMat}
            />
            {[-1, 1].map((side) => (
              <mesh
                key={`eye-${side}`}
                position={[side * 0.036, 0.096, 0.125]}
                geometry={pigeonAssets.eyeGeo}
                material={pigeonAssets.eyeMat}
              />
            ))}
            <mesh
              position={[0, 0.086, 0.145]}
              geometry={pigeonAssets.cereGeo}
              material={pigeonAssets.cereMat}
            />
            <mesh
              position={[0, 0.082, 0.165]}
              rotation={[Math.PI / 2, 0, 0]}
              geometry={pigeonAssets.beakGeo}
              material={pigeonAssets.beakMat}
            />
            <mesh
              position={[0, 0.015, -0.095]}
              rotation={[0.2, 0, 0]}
              geometry={pigeonAssets.tailGeo}
              material={pigeonAssets.tailMat}
            />
            <mesh
              ref={(el) => {
                pigeonWingLRefs.current[i] = el;
              }}
              position={[0.058, 0.025, 0.005]}
              rotation={[0, 0, -0.22]}
              geometry={pigeonAssets.wingLGeo}
              material={pigeonAssets.wingMat}
              castShadow
            />
            <mesh
              ref={(el) => {
                pigeonWingRRefs.current[i] = el;
              }}
              position={[-0.058, 0.025, 0.005]}
              rotation={[0, 0, 0.22]}
              geometry={pigeonAssets.wingRGeo}
              material={pigeonAssets.wingMat}
              castShadow
            />
            <group
              ref={(el) => {
                pigeonLegsRefs.current[i] = el;
              }}
              position={[0, -0.04, 0.005]}
            >
              {[-0.026, 0.026].map((lx, li) => (
                <group key={`leg-${li}`} position={[lx, 0, 0]}>
                  <mesh
                    position={[0, -0.025, 0]}
                    geometry={pigeonAssets.legGeo}
                    material={pigeonAssets.footMat}
                  />
                  <mesh
                    position={[0, -0.052, 0.012]}
                    rotation={[Math.PI / 2, 0, 0]}
                    geometry={pigeonAssets.footGeo}
                    material={pigeonAssets.footMat}
                  />
                </group>
              ))}
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}
