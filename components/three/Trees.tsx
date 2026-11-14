// ---------------------------------------------------------------------------
// Trees.tsx — Hệ thống cây xanh Bách Khoa thế hệ mới:
//   1. Pháp tuyến vòm lá làm mượt liên tục + pha trộn hướng cầu (Hemispherical Smooth
//      Foliage Normals) xóa hoàn toàn vết vát tam giác cứng (flat-shaded facets).
//   2. CampusTreeBatchProvider: gom toàn bộ ~80 cây ImprovedTree toàn khuôn viên vào
//      các lớp InstancedMesh dùng chung vật liệu + lắc gió bằng Vertex Shader (GPU),
//      kéo ~2.500 mesh rời xuống còn ~8 draw calls và 1 uniform uWindTime duy nhất.
//   3. OrnamentalShrub: bụi cây cảnh đa thùy có hoa điểm xuyết & bóng AO mềm cho bồn hoa.
// ---------------------------------------------------------------------------

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getSharedLeafClusterCutoutTexture,
  makeBarkTexture,
  makeFoliageCanopyTexture,
  makeGraniteStoneTexture,
  makeSoftShadowTexture,
} from './materials';

export interface TreeProps {
  x: number;
  z: number;
  trunkH?: number;
  canopyR?: number;
  canopyY?: number;
  canopyColor?: string;
  withTreePit?: boolean;
}

const TRUNK = '#7A5E42';

let sharedTreeTex: {
  bark: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture };
  foliage: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture };
  granite: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture };
  shadow: THREE.CanvasTexture;
} | null = null;

let sharedTreeGeos: {
  canopyGeo: THREE.BufferGeometry;
  pitRimGeo: THREE.BufferGeometry;
  pitSoilGeo: THREE.BufferGeometry;
  rootFlareGeo: THREE.BufferGeometry;
  leafCardGeo: THREE.BufferGeometry;
  unitTrunkGeo: THREE.BufferGeometry;
  unitBranchGeo: THREE.BufferGeometry;
  shadowDiscGeo: THREE.BufferGeometry;
} | null = null;

/**
 * Tạo hình học vòm lá hữu cơ với pháp tuyến hàn mượt tại mọi đỉnh trùng tọa độ
 * kết hợp thiên hướng vòm cầu hướng sáng (62% spherical foliage normal) để
 * ánh nắng chuyển sắc êm như mây lá tự nhiên, không lộ cạnh tam giác phẳng.
 */
function createOrganicCanopyGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const bump =
      1 +
      0.115 * Math.sin(3.6 * x + 2.4 * y) * Math.cos(3.2 * z) +
      0.06 * Math.cos(5.8 * y - 4.1 * x + 2.7 * z);
    pos.setXYZ(i, x * bump, y * bump, z * bump);
  }

  // Bước 1: Tính pháp tuyến mặt cơ sở
  geo.computeVertexNormals();
  const norm = geo.attributes.normal as THREE.BufferAttribute;

  // Bước 2: Trung bình hóa pháp tuyến của mọi đỉnh trùng vị trí không gian (hàn mượt C1 qua đường nối UV)
  const accum = new Map<string, [number, number, number]>();
  const keys = new Array<string>(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const k = `${Math.round(pos.getX(i) * 2000)}_${Math.round(pos.getY(i) * 2000)}_${Math.round(pos.getZ(i) * 2000)}`;
    keys[i] = k;
    const cur = accum.get(k);
    if (cur) {
      cur[0] += norm.getX(i);
      cur[1] += norm.getY(i);
      cur[2] += norm.getZ(i);
    } else {
      accum.set(k, [norm.getX(i), norm.getY(i), norm.getZ(i)]);
    }
  }

  // Bước 3: Pha trộn 62% pháp tuyến vòm cầu hướng ra ngoài/lên trời giúp tán lá mịn & bắt nắng dịu
  for (let i = 0; i < pos.count; i++) {
    const sum = accum.get(keys[i])!;
    let snx = sum[0];
    let sny = sum[1];
    let snz = sum[2];
    const sLen = Math.hypot(snx, sny, snz) || 1;
    snx /= sLen;
    sny /= sLen;
    snz /= sLen;

    const px = pos.getX(i);
    const py = pos.getY(i) * 1.18 + 0.16;
    const pz = pos.getZ(i);
    const rLen = Math.hypot(px, py, pz) || 1;
    const rx = px / rLen;
    const ry = py / rLen;
    const rz = pz / rLen;

    const bx = snx * 0.38 + rx * 0.62;
    const by = sny * 0.38 + ry * 0.62;
    const bz = snz * 0.38 + rz * 0.62;
    const bLen = Math.hypot(bx, by, bz) || 1;
    norm.setXYZ(i, bx / bLen, by / bLen, bz / bLen);
  }
  norm.needsUpdate = true;
  return geo;
}

export function getSharedOrganicCanopyGeometry(): THREE.BufferGeometry {
  return getSharedTreeGeometries().canopyGeo;
}

function createTreePitRimGeometry(): THREE.BufferGeometry {
  const outer = 0.62;
  const inner = 0.46;
  const shape = new THREE.Shape();
  shape.moveTo(-outer, -outer);
  shape.lineTo(outer, -outer);
  shape.lineTo(outer, outer);
  shape.lineTo(-outer, outer);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-inner, -inner);
  hole.lineTo(-inner, inner);
  hole.lineTo(inner, inner);
  hole.lineTo(inner, -inner);
  hole.closePath();
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.085,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0.015, 0);
  geo.computeVertexNormals();
  return geo;
}

function getSharedTreeGeometries() {
  if (!sharedTreeGeos) {
    const canopyGeo = createOrganicCanopyGeometry();
    const pitRimGeo = createTreePitRimGeometry();
    const pitSoilGeo = new THREE.BoxGeometry(0.94, 0.055, 0.94);
    pitSoilGeo.translate(0, 0.028, 0);
    const rootFlareGeo = new THREE.CylinderGeometry(0.035, 0.14, 0.34, 6);
    rootFlareGeo.translate(0, 0.15, 0);
    const leafCardGeo = new THREE.PlaneGeometry(1, 1);
    const unitTrunkGeo = new THREE.CylinderGeometry(0.56, 1.0, 1.0, 10);
    unitTrunkGeo.translate(0, 0.5, 0);
    const unitBranchGeo = new THREE.CylinderGeometry(0.55, 1.0, 1.0, 6);
    unitBranchGeo.translate(0, 0.5, 0);
    const shadowDiscGeo = new THREE.PlaneGeometry(1, 1);
    shadowDiscGeo.rotateX(-Math.PI / 2);
    sharedTreeGeos = {
      canopyGeo,
      pitRimGeo,
      pitSoilGeo,
      rootFlareGeo,
      leafCardGeo,
      unitTrunkGeo,
      unitBranchGeo,
      shadowDiscGeo,
    };
  }
  return sharedTreeGeos;
}

function getSharedTreeTextures() {
  if (!sharedTreeTex) {
    sharedTreeTex = {
      bark: makeBarkTexture(2, 4),
      foliage: makeFoliageCanopyTexture(3, 3),
      granite: makeGraniteStoneTexture(2, 2),
      shadow: makeSoftShadowTexture(),
    };
  }
  return sharedTreeTex;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromXZ(x: number, z: number): number {
  let h = (Math.round(x * 100) + 100000) * 374761393 + (Math.round(z * 100) + 100000) * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

function leafTones(base: string): [string, string, string] {
  const c = new THREE.Color(base);
  const light = c.clone().offsetHSL(0.015, -0.05, 0.09);
  const dark = c.clone().offsetHSL(-0.01, 0.05, -0.09);
  return [`#${c.getHexString()}`, `#${light.getHexString()}`, `#${dark.getHexString()}`];
}

type Lobe = { dx: number; dy: number; dz: number; r: number; tone: number; sy: number };
type Branch = { az: number; tilt: number; len: number; r: number; startY: number };
type LeafCard = {
  dx: number;
  dy: number;
  dz: number;
  rx: number;
  ry: number;
  rz: number;
  size: number;
  tone: number;
};

function clampRadialOffset(dx: number, dz: number, maxReach: number): [number, number] {
  const dist = Math.hypot(dx, dz);
  if (dist <= maxReach || dist < 1e-6) return [dx, dz];
  const scale = maxReach / dist;
  return [dx * scale, dz * scale];
}

function buildImprovedSpec(x: number, z: number, trunkH: number, canopyR: number, canopyY: number) {
  const rand = mulberry32(seedFromXZ(x, z));
  const s = 0.94 + rand() * 0.14;
  const maxVisualUnscaled = (1.13 * canopyR) / s;
  const rotY = rand() * Math.PI * 2;
  const trunkTopR = 0.085 + rand() * 0.028;
  const trunkBotR = 0.17 + rand() * 0.055;
  const lean = (rand() - 0.5) * 0.08;

  const lobes: Lobe[] = [];
  const mainA = rand() * Math.PI * 2;
  lobes.push({
    dx: Math.cos(mainA) * canopyR * 0.1,
    dy: canopyY + canopyR * 0.08,
    dz: Math.sin(mainA) * canopyR * 0.1,
    r: canopyR * 0.54,
    tone: 0,
    sy: 0.58 + rand() * 0.1,
  });

  const midPhase = rand() * Math.PI * 2;
  for (let k = 0; k < 3; k++) {
    const a = midPhase + (k / 3) * Math.PI * 2 + (rand() - 0.5) * 0.45;
    const rr = canopyR * (0.36 + rand() * 0.07);
    const off = canopyR * (0.34 + rand() * 0.14);
    const [dx, dz] = clampRadialOffset(
      Math.cos(a) * off,
      Math.sin(a) * off,
      Math.max(0.05, maxVisualUnscaled - rr),
    );
    lobes.push({
      dx,
      dy: canopyY + (-0.12 + rand() * 0.2) * canopyR,
      dz,
      r: rr,
      tone: (k + Math.floor(rand() * 2)) % 3,
      sy: 0.52 + rand() * 0.14,
    });
  }

  const topPhase = midPhase + Math.PI / 3;
  for (let k = 0; k < 3; k++) {
    const a = topPhase + (k / 3) * Math.PI * 2 + (rand() - 0.5) * 0.4;
    const rr = canopyR * (0.28 + rand() * 0.06);
    const off = canopyR * (0.22 + rand() * 0.12);
    const [dx, dz] = clampRadialOffset(
      Math.cos(a) * off,
      Math.sin(a) * off,
      Math.max(0.05, maxVisualUnscaled - rr),
    );
    lobes.push({
      dx,
      dy: canopyY + (0.22 + rand() * 0.2) * canopyR,
      dz,
      r: rr,
      tone: k === 0 ? 1 : Math.floor(rand() * 3),
      sy: 0.62 + rand() * 0.12,
    });
  }

  const pivotY = trunkH * 0.9;
  const branches: Branch[] = [];
  for (const l of lobes) {
    const dy = l.dy - pivotY;
    const dist = Math.hypot(l.dx, dy, l.dz);
    const tilt = dist > 1e-6 ? Math.acos(Math.min(1, Math.max(-1, dy / dist))) : 0;
    const az = dist > 1e-6 ? Math.atan2(-l.dz, -l.dx) : 0;
    branches.push({
      az,
      tilt,
      len: dist * 0.96,
      r: 0.036 + dist * 0.016,
      startY: pivotY,
    });
  }

  const leafCards: LeafCard[] = [];
  const cardPhase = rand() * Math.PI * 2;
  for (let k = 0; k < 7; k++) {
    const a = cardPhase + (k / 7) * Math.PI * 2 + (rand() - 0.5) * 0.3;
    const cardSize = canopyR * (0.62 + rand() * 0.16);
    const radialReach = Math.max(0.1, maxVisualUnscaled - cardSize * 0.48);
    const off = Math.min(radialReach, canopyR * (0.44 + rand() * 0.14));
    const [dx, dz] = clampRadialOffset(Math.cos(a) * off, Math.sin(a) * off, radialReach);
    const dy = canopyY + (-0.16 + rand() * 0.48) * canopyR;
    leafCards.push({
      dx,
      dy,
      dz,
      rx: (rand() - 0.5) * 0.75,
      ry: a + (k % 2 === 0 ? 0.4 : -0.4),
      rz: (rand() - 0.5) * 0.55,
      size: cardSize,
      tone: k % 3,
    });
    if (k < 4) {
      const twDy = dy - pivotY;
      const twDist = Math.hypot(dx, twDy, dz);
      branches.push({
        az: twDist > 1e-6 ? Math.atan2(-dz, -dx) : 0,
        tilt: twDist > 1e-6 ? Math.acos(Math.min(1, Math.max(-1, twDy / twDist))) : 0,
        len: twDist * 0.92,
        r: 0.02,
        startY: pivotY + 0.06,
      });
    }
  }

  return { s, rotY, trunkTopR, trunkBotR, lean, branches, lobes, leafCards };
}

// ---------------------------------------------------------------------------
// CampusTreeBatchProvider — Gom toàn bộ cây ImprovedTree thành 8 InstancedMesh
// + lắc gió bằng Vertex Shader (0 CPU matrix loop mỗi frame).
// ---------------------------------------------------------------------------
type RegisteredTreeEntry = Required<TreeProps>;

interface TreeBatchContextValue {
  registerTree: (entry: RegisteredTreeEntry) => () => void;
}

const TreeBatchContext = createContext<TreeBatchContextValue | null>(null);
const NOOP_RAYCAST: THREE.Object3D['raycast'] = () => {};

function applyWindShaderToFoliageMaterial(
  mat: THREE.MeshStandardMaterial,
  windTimeUniform: { value: number },
  cacheKey: string,
) {
  mat.customProgramCacheKey = () => cacheKey;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = windTimeUniform;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uWindTime;`,
      )
      .replace(
        '#include <project_vertex>',
        `vec4 mvPosition = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
          float treePhase = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.53;
          float swayFactor = clamp((mvPosition.y - 1.4) * 0.014, 0.0, 0.055);
          mvPosition.x += sin(uWindTime * 1.2 + treePhase) * swayFactor;
          mvPosition.z += cos(uWindTime * 0.92 + treePhase * 1.27) * swayFactor * 0.82;
        #endif
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`,
      );
  };
}

export function CampusTreeBatchProvider({ children }: { children: ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const entriesRef = useRef<Map<number, RegisteredTreeEntry>>(new Map());
  const nextIdRef = useRef(1);
  const dirtyRef = useRef(true);
  const windTimeUniform = useMemo(() => ({ value: 0 }), []);

  const ctxVal = useMemo<TreeBatchContextValue>(
    () => ({
      registerTree: (entry) => {
        const id = nextIdRef.current++;
        entriesRef.current.set(id, entry);
        dirtyRef.current = true;
        return () => {
          entriesRef.current.delete(id);
          dirtyRef.current = true;
        };
      },
    }),
    [],
  );

  const batchMaterials = useMemo(() => {
    const tex = getSharedTreeTextures();
    const greenCutout = getSharedLeafClusterCutoutTexture('green');
    const goldenCutout = getSharedLeafClusterCutoutTexture('golden');

    const pitRimMat = new THREE.MeshStandardMaterial({
      color: '#CBD5E1',
      map: tex.granite.map,
      bumpMap: tex.granite.bumpMap,
      bumpScale: 0.012,
      roughness: 0.88,
    });
    const pitSoilMat = new THREE.MeshStandardMaterial({
      color: '#3E2F23',
      roughness: 0.96,
    });
    const shadowMat = new THREE.MeshBasicMaterial({
      map: tex.shadow,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });
    const barkMat = new THREE.MeshStandardMaterial({
      color: TRUNK,
      map: tex.bark.map,
      bumpMap: tex.bark.bumpMap,
      bumpScale: 0.025,
      roughness: 0.92,
    });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      map: tex.foliage.map,
      bumpMap: tex.foliage.bumpMap,
      bumpScale: 0.024,
      roughness: 0.84,
    });
    applyWindShaderToFoliageMaterial(canopyMat, windTimeUniform, 'hust-tree-canopy-wind-v1');

    const greenCardMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      map: greenCutout,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
      roughness: 0.82,
    });
    applyWindShaderToFoliageMaterial(greenCardMat, windTimeUniform, 'hust-tree-card-green-wind-v1');

    const goldenCardMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      map: goldenCutout,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
      roughness: 0.82,
    });
    applyWindShaderToFoliageMaterial(
      goldenCardMat,
      windTimeUniform,
      'hust-tree-card-golden-wind-v1',
    );

    return {
      pitRimMat,
      pitSoilMat,
      shadowMat,
      barkMat,
      canopyMat,
      greenCardMat,
      goldenCardMat,
    };
  }, [windTimeUniform]);

  const clearInstancedChildren = (grp: THREE.Group) => {
    for (let i = grp.children.length - 1; i >= 0; i--) {
      const ch = grp.children[i] as THREE.InstancedMesh;
      grp.remove(ch);
      if (ch.dispose) ch.dispose();
    }
  };

  useEffect(() => {
    const grp = groupRef.current;
    return () => {
      if (grp) clearInstancedChildren(grp);
      batchMaterials.pitRimMat.dispose();
      batchMaterials.pitSoilMat.dispose();
      batchMaterials.shadowMat.dispose();
      batchMaterials.barkMat.dispose();
      batchMaterials.canopyMat.dispose();
      batchMaterials.greenCardMat.dispose();
      batchMaterials.goldenCardMat.dispose();
    };
  }, [batchMaterials]);

  const rebuildBatches = () => {
    const grp = groupRef.current;
    if (!grp) return;
    clearInstancedChildren(grp);

    const list = Array.from(entriesRef.current.values());
    if (list.length === 0) return;

    const geos = getSharedTreeGeometries();
    const pitMats: THREE.Matrix4[] = [];
    const shadowMats: THREE.Matrix4[] = [];
    const trunkMats: THREE.Matrix4[] = [];
    const branchMats: THREE.Matrix4[] = [];
    const canopyMats: THREE.Matrix4[] = [];
    const canopyCols: THREE.Color[] = [];
    const greenCardMats: THREE.Matrix4[] = [];
    const greenCardCols: THREE.Color[] = [];
    const goldenCardMats: THREE.Matrix4[] = [];
    const goldenCardCols: THREE.Color[] = [];

    const mTree = new THREE.Matrix4();
    const mRotY = new THREE.Matrix4();
    const mScale = new THREE.Matrix4();
    const mLean = new THREE.Matrix4();
    const mLocal = new THREE.Matrix4();
    const mSub = new THREE.Matrix4();
    const mSub2 = new THREE.Matrix4();
    const vPos = new THREE.Vector3();
    const vScl = new THREE.Vector3();
    const qRot = new THREE.Quaternion();
    const eul = new THREE.Euler();

    for (const item of list) {
      const spec = buildImprovedSpec(item.x, item.z, item.trunkH, item.canopyR, item.canopyY);
      const tones = leafTones(item.canopyColor).map((hex) => new THREE.Color(hex));
      const isGolden =
        item.canopyColor.toLowerCase().startsWith('#e') ||
        item.canopyColor.toLowerCase().startsWith('#d');

      if (item.withTreePit) {
        pitMats.push(new THREE.Matrix4().makeTranslation(item.x, 0, item.z));
      }

      const shSize = item.canopyR * 2.2 * spec.s;
      vPos.set(item.x, 0.038, item.z);
      qRot.identity();
      vScl.set(shSize, 1, shSize);
      shadowMats.push(new THREE.Matrix4().compose(vPos, qRot, vScl));

      // M_tree = T(x, 0, z) * Ry(rotY) * S(s) * Rz(lean)
      mTree.makeTranslation(item.x, 0, item.z);
      mRotY.makeRotationY(spec.rotY);
      mScale.makeScale(spec.s, spec.s, spec.s);
      mLean.makeRotationZ(spec.lean);
      mTree.multiply(mRotY).multiply(mScale).multiply(mLean);

      // Thân chính
      vPos.set(0, 0, 0);
      qRot.identity();
      vScl.set(spec.trunkBotR, item.trunkH, spec.trunkBotR);
      mLocal.compose(vPos, qRot, vScl);
      trunkMats.push(new THREE.Matrix4().multiplyMatrices(mTree, mLocal));

      // 4 rễ bạnh
      for (let ri = 0; ri < 4; ri++) {
        const ang = (ri / 4) * Math.PI * 2 + 0.35;
        mSub.makeRotationY(ang);
        vPos.set(spec.trunkBotR * 0.52, -0.02, 0);
        eul.set(0, 0, -0.38);
        qRot.setFromEuler(eul);
        vScl.set(0.135, 0.34, 0.135);
        mSub2.compose(vPos, qRot, vScl);
        mLocal.multiplyMatrices(mSub, mSub2);
        branchMats.push(new THREE.Matrix4().multiplyMatrices(mTree, mLocal));
      }

      // Nhánh chính & cành con
      for (const b of spec.branches) {
        mSub.makeTranslation(0, b.startY, 0);
        mRotY.makeRotationY(-b.az);
        mSub.multiply(mRotY);
        mLean.makeRotationZ(b.tilt);
        mSub.multiply(mLean);
        mScale.makeScale(b.r, b.len, b.r);
        mSub.multiply(mScale);
        branchMats.push(new THREE.Matrix4().multiplyMatrices(mTree, mSub));
      }

      // 7 tầng vòm lá pháp tuyến mượt
      for (let i = 0; i < spec.lobes.length; i++) {
        const l = spec.lobes[i];
        vPos.set(l.dx, l.dy, l.dz);
        eul.set(i * 0.7, i * 1.1, 0);
        qRot.setFromEuler(eul);
        vScl.set(l.r, l.r * l.sy, l.r);
        mLocal.compose(vPos, qRot, vScl);
        canopyMats.push(new THREE.Matrix4().multiplyMatrices(mTree, mLocal));
        canopyCols.push(tones[l.tone]);
      }

      // Thẻ chùm lá cắt alphaTest (crossed cards)
      const targetMats = isGolden ? goldenCardMats : greenCardMats;
      const targetCols = isGolden ? goldenCardCols : greenCardCols;
      for (const lc of spec.leafCards) {
        vPos.set(lc.dx, lc.dy, lc.dz);
        eul.set(lc.rx, lc.ry, lc.rz);
        qRot.setFromEuler(eul);
        vScl.set(1, 1, 1);
        mSub.compose(vPos, qRot, vScl);

        mScale.makeScale(lc.size, lc.size, 1);
        mLocal.multiplyMatrices(mSub, mScale);
        targetMats.push(new THREE.Matrix4().multiplyMatrices(mTree, mLocal));
        targetCols.push(tones[lc.tone]);

        mRotY.makeRotationY(Math.PI * 0.48);
        mSub2.multiplyMatrices(mSub, mRotY).multiply(mScale);
        targetMats.push(new THREE.Matrix4().multiplyMatrices(mTree, mSub2));
        targetCols.push(tones[(lc.tone + 1) % 3]);
      }
    }

    const addLayer = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      matrices: THREE.Matrix4[],
      colors: THREE.Color[] | null,
      castShadow: boolean,
      receiveShadow: boolean,
    ) => {
      if (matrices.length === 0) return;
      const im = new THREE.InstancedMesh(geo, mat, matrices.length);
      im.castShadow = castShadow;
      im.receiveShadow = receiveShadow;
      im.frustumCulled = false;
      im.raycast = NOOP_RAYCAST;
      for (let i = 0; i < matrices.length; i++) {
        im.setMatrixAt(i, matrices[i]);
        if (colors) im.setColorAt(i, colors[i]);
      }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      grp.add(im);
    };

    addLayer(geos.pitRimGeo, batchMaterials.pitRimMat, pitMats, null, false, true);
    addLayer(geos.pitSoilGeo, batchMaterials.pitSoilMat, pitMats, null, false, true);
    addLayer(geos.shadowDiscGeo, batchMaterials.shadowMat, shadowMats, null, false, false);
    addLayer(geos.unitTrunkGeo, batchMaterials.barkMat, trunkMats, null, true, true);
    addLayer(geos.unitBranchGeo, batchMaterials.barkMat, branchMats, null, false, true);
    addLayer(geos.canopyGeo, batchMaterials.canopyMat, canopyMats, canopyCols, true, true);
    addLayer(geos.leafCardGeo, batchMaterials.greenCardMat, greenCardMats, greenCardCols, false, false);
    addLayer(
      geos.leafCardGeo,
      batchMaterials.goldenCardMat,
      goldenCardMats,
      goldenCardCols,
      false,
      false,
    );
  };

  useFrame((state) => {
    windTimeUniform.value = state.clock.elapsedTime;
    if (dirtyRef.current) {
      dirtyRef.current = false;
      rebuildBatches();
    }
  });

  return (
    <TreeBatchContext.Provider value={ctxVal}>
      <group ref={groupRef} name="CampusBatchedTrees" />
      {children}
    </TreeBatchContext.Provider>
  );
}

/**
 * Bụi cây cảnh cắt tỉa tự nhiên đa thùy (Ornamental Botanical Shrub) kèm bóng tiếp xúc AO
 * và nụ hoa điểm xuyết nhẹ — thay thế hoàn toàn các khối cầu nhựa đơn điệu ở bồn hoa.
 */
export function OrnamentalShrub({
  position = [0, 0, 0],
  radius = 0.5,
  color = '#367A3C',
  flowerColor,
}: {
  position?: [number, number, number];
  radius?: number;
  color?: string;
  flowerColor?: string;
}) {
  const geos = useMemo(() => getSharedTreeGeometries(), []);
  const tex = useMemo(() => getSharedTreeTextures(), []);
  const tones = useMemo(() => leafTones(color), [color]);

  return (
    <group position={position}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.018, 0]}>
        <planeGeometry args={[radius * 2.35, radius * 2.35]} />
        <meshBasicMaterial map={tex.shadow} transparent opacity={0.34} depthWrite={false} />
      </mesh>
      {[
        { dx: 0, dy: radius * 0.62, dz: 0, sx: radius * 0.96, sy: radius * 0.72, sz: radius * 0.96, t: 0, ry: 0.2 },
        { dx: -radius * 0.42, dy: radius * 0.48, dz: radius * 0.24, sx: radius * 0.66, sy: radius * 0.56, sz: radius * 0.66, t: 1, ry: 1.3 },
        { dx: radius * 0.44, dy: radius * 0.5, dz: -radius * 0.2, sx: radius * 0.64, sy: radius * 0.54, sz: radius * 0.64, t: 2, ry: 2.4 },
        { dx: radius * 0.08, dy: radius * 0.46, dz: -radius * 0.42, sx: radius * 0.58, sy: radius * 0.5, sz: radius * 0.58, t: 1, ry: 3.6 },
      ].map((lb, idx) => (
        <mesh
          key={`shrub-lobe-${idx}`}
          geometry={geos.canopyGeo}
          position={[lb.dx, lb.dy, lb.dz]}
          rotation={[0, lb.ry, 0]}
          scale={[lb.sx, lb.sy, lb.sz]}
          castShadow={idx === 0}
          receiveShadow
        >
          <meshStandardMaterial
            color={tones[lb.t]}
            map={tex.foliage.map}
            bumpMap={tex.foliage.bumpMap}
            bumpScale={0.02}
            roughness={0.85}
          />
        </mesh>
      ))}
      {flowerColor &&
        [
          [-0.26, 0.98, 0.28],
          [0.3, 0.94, 0.22],
          [0.06, 1.16, -0.14],
          [-0.22, 0.86, -0.32],
          [0.34, 0.82, -0.26],
        ].map(([fx, fy, fz], fIdx) => (
          <mesh
            key={`shrub-bud-${fIdx}`}
            position={[fx * radius, fy * radius, fz * radius]}
          >
            <icosahedronGeometry args={[radius * 0.095, 0]} />
            <meshStandardMaterial color={flowerColor} roughness={0.65} />
          </mesh>
        ))}
    </group>
  );
}

export function ImprovedTree({
  x,
  z,
  trunkH = 2,
  canopyR = 1.3,
  canopyY = 2.9,
  canopyColor = '#5D7D4A',
  withTreePit = true,
}: TreeProps) {
  const batchCtx = useContext(TreeBatchContext);

  useLayoutEffect(() => {
    if (!batchCtx) return;
    return batchCtx.registerTree({
      x,
      z,
      trunkH,
      canopyR,
      canopyY,
      canopyColor,
      withTreePit,
    });
  }, [batchCtx, x, z, trunkH, canopyR, canopyY, canopyColor, withTreePit]);

  if (batchCtx) {
    return null;
  }

  return (
    <StandaloneImprovedTree
      x={x}
      z={z}
      trunkH={trunkH}
      canopyR={canopyR}
      canopyY={canopyY}
      canopyColor={canopyColor}
      withTreePit={withTreePit}
    />
  );
}

function StandaloneImprovedTree({
  x,
  z,
  trunkH = 2,
  canopyR = 1.3,
  canopyY = 2.9,
  canopyColor = '#5D7D4A',
  withTreePit = true,
}: TreeProps) {
  const spec = useMemo(
    () => buildImprovedSpec(x, z, trunkH, canopyR, canopyY),
    [x, z, trunkH, canopyR, canopyY],
  );
  const tones = useMemo(() => leafTones(canopyColor), [canopyColor]);
  const tex = useMemo(() => getSharedTreeTextures(), []);
  const geos = useMemo(() => getSharedTreeGeometries(), []);
  const isGolden =
    canopyColor.toLowerCase().startsWith('#e') || canopyColor.toLowerCase().startsWith('#d');
  const leafCutoutTex = useMemo(
    () => getSharedLeafClusterCutoutTexture(isGolden ? 'golden' : 'green'),
    [isGolden],
  );
  const canopyRef = useRef<THREE.Group>(null!);
  const phase = useMemo(() => (seedFromXZ(x, z) % 1000) * 0.00628, [x, z]);

  useFrame((state) => {
    if (!canopyRef.current) return;
    const t = state.clock.elapsedTime;
    canopyRef.current.rotation.z = Math.sin(t * 1.15 + phase) * 0.018;
    canopyRef.current.rotation.x = Math.cos(t * 0.85 + phase * 1.3) * 0.014;
  });

  return (
    <group position={[x, 0, z]}>
      {withTreePit && (
        <group>
          <mesh geometry={geos.pitRimGeo} receiveShadow>
            <meshStandardMaterial
              color="#CBD5E1"
              map={tex.granite.map}
              bumpMap={tex.granite.bumpMap}
              bumpScale={0.012}
              roughness={0.88}
            />
          </mesh>
          <mesh geometry={geos.pitSoilGeo} receiveShadow>
            <meshStandardMaterial color="#3E2F23" roughness={0.96} />
          </mesh>
        </group>
      )}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.038, 0]}>
        <planeGeometry args={[canopyR * 2.2 * spec.s, canopyR * 2.2 * spec.s]} />
        <meshBasicMaterial map={tex.shadow} transparent opacity={0.36} depthWrite={false} />
      </mesh>
      <group rotation-y={spec.rotY} scale={spec.s} rotation-z={spec.lean}>
        {[0, 1, 2, 3].map((ri) => {
          const ang = (ri / 4) * Math.PI * 2 + 0.35;
          return (
            <group key={`root-${ri}`} rotation-y={ang}>
              <mesh
                geometry={geos.rootFlareGeo}
                position={[spec.trunkBotR * 0.52, -0.02, 0]}
                rotation-z={-0.38}
              >
                <meshStandardMaterial
                  color={TRUNK}
                  map={tex.bark.map}
                  bumpMap={tex.bark.bumpMap}
                  bumpScale={0.025}
                  roughness={0.92}
                />
              </mesh>
            </group>
          );
        })}
        <mesh position={[0, trunkH / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[spec.trunkTopR, spec.trunkBotR, trunkH, 10]} />
          <meshStandardMaterial
            color={TRUNK}
            map={tex.bark.map}
            bumpMap={tex.bark.bumpMap}
            bumpScale={0.025}
            roughness={0.92}
          />
        </mesh>
        {spec.branches.map((b, i) => (
          <group key={`br-${i}`} position={[0, b.startY, 0]} rotation-y={-b.az}>
            <group rotation-z={b.tilt}>
              <mesh position={[0, b.len / 2, 0]}>
                <cylinderGeometry args={[b.r * 0.55, b.r, b.len, 6]} />
                <meshStandardMaterial
                  color={TRUNK}
                  map={tex.bark.map}
                  bumpMap={tex.bark.bumpMap}
                  bumpScale={0.018}
                  roughness={0.92}
                />
              </mesh>
            </group>
          </group>
        ))}
        <group ref={canopyRef}>
          {spec.lobes.map((l, i) => (
            <mesh
              key={`lobe-${i}`}
              geometry={geos.canopyGeo}
              position={[l.dx, l.dy, l.dz]}
              rotation={[i * 0.7, i * 1.1, 0]}
              scale={[l.r, l.r * l.sy, l.r]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial
                color={tones[l.tone]}
                map={tex.foliage.map}
                bumpMap={tex.foliage.bumpMap}
                bumpScale={0.024}
                roughness={0.84}
              />
            </mesh>
          ))}
          {spec.leafCards.map((lc, i) => (
            <group key={`card-${i}`} position={[lc.dx, lc.dy, lc.dz]} rotation={[lc.rx, lc.ry, lc.rz]}>
              <mesh geometry={geos.leafCardGeo} scale={[lc.size, lc.size, 1]}>
                <meshStandardMaterial
                  color={tones[lc.tone]}
                  map={leafCutoutTex}
                  alphaTest={0.42}
                  side={THREE.DoubleSide}
                  roughness={0.82}
                />
              </mesh>
              <mesh
                geometry={geos.leafCardGeo}
                rotation-y={Math.PI * 0.48}
                scale={[lc.size, lc.size, 1]}
              >
                <meshStandardMaterial
                  color={tones[(lc.tone + 1) % 3]}
                  map={leafCutoutTex}
                  alphaTest={0.42}
                  side={THREE.DoubleSide}
                  roughness={0.82}
                />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

// --- Liễu rủ: cành cong + cụm lá nhỏ đi theo cành ----------------------------
type DroopArm = {
  az: number;
  tilt1: number;
  len1: number;
  len2: number;
  leafs: Array<{ t: number; r: number; tone: number }>;
};

function buildDroopingSpec(x: number, z: number, trunkH: number, canopyR: number, canopyY: number) {
  const rand = mulberry32(seedFromXZ(x, z) ^ 0x9e3779b9);
  const s = 0.94 + rand() * 0.14;
  const maxVisualUnscaled = (1.13 * canopyR) / s;
  const rotY = rand() * Math.PI * 2;
  const arms: DroopArm[] = Array.from({ length: 7 }, (_, k) => {
    const leafCount = 2 + Math.floor(rand() * 2);
    const len1 = Math.min(maxVisualUnscaled * 0.56, canopyR * (0.44 + rand() * 0.16));
    const len2 = canopyR * (0.48 + rand() * 0.28);
    return {
      az: (k / 7) * Math.PI * 2 + rand() * 0.45,
      tilt1: 0.45 + rand() * 0.25,
      len1,
      len2,
      leafs: Array.from({ length: leafCount }, (_, j) => ({
        t: 0.32 + (j / Math.max(leafCount - 1, 1)) * 0.62,
        r: canopyR * (0.34 + rand() * 0.1),
        tone: Math.floor(rand() * 3),
      })),
    };
  });
  const [l1x, l1z] = clampRadialOffset(canopyR * 0.32, canopyR * 0.16, maxVisualUnscaled - canopyR * 0.44);
  const [l2x, l2z] = clampRadialOffset(-canopyR * 0.3, -canopyR * 0.22, maxVisualUnscaled - canopyR * 0.4);
  const lobes: Lobe[] = [
    { dx: 0, dy: canopyY + 0.1, dz: 0, r: canopyR * 0.58, tone: 0, sy: 0.58 },
    { dx: l1x, dy: canopyY + canopyR * 0.18, dz: l1z, r: canopyR * 0.44, tone: 1, sy: 0.58 },
    { dx: l2x, dy: canopyY + canopyR * 0.08, dz: l2z, r: canopyR * 0.4, tone: 2, sy: 0.6 },
  ];
  return { s, rotY, trunkH, arms, lobes };
}

export function DroopingTree({
  x,
  z,
  trunkH = 2.6,
  canopyR = 1.9,
  canopyY = 3.6,
  canopyColor = '#7A9A5A',
}: TreeProps) {
  const spec = useMemo(
    () => buildDroopingSpec(x, z, trunkH, canopyR, canopyY),
    [x, z, trunkH, canopyR, canopyY],
  );
  const tones = useMemo(() => leafTones(canopyColor), [canopyColor]);
  const tex = useMemo(() => getSharedTreeTextures(), []);
  const geos = useMemo(() => getSharedTreeGeometries(), []);
  const willowCutoutTex = useMemo(() => getSharedLeafClusterCutoutTexture('willow'), []);
  return (
    <group position={[x, 0, z]} rotation-y={spec.rotY} scale={spec.s}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.038 / spec.s, 0]}>
        <planeGeometry args={[canopyR * 2.1, canopyR * 2.1]} />
        <meshBasicMaterial map={tex.shadow} transparent opacity={0.38} depthWrite={false} />
      </mesh>
      {[0, 1, 2, 3].map((ri) => (
        <group key={`droop-root-${ri}`} rotation-y={(ri / 4) * Math.PI * 2}>
          <mesh
            geometry={geos.rootFlareGeo}
            position={[0.14, -0.02, 0]}
            rotation-z={-0.36}
          >
            <meshStandardMaterial
              color={TRUNK}
              map={tex.bark.map}
              bumpMap={tex.bark.bumpMap}
              bumpScale={0.025}
              roughness={0.92}
            />
          </mesh>
        </group>
      ))}
      <mesh position={[0, trunkH / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.13, 0.23, trunkH, 10]} />
        <meshStandardMaterial
          color={TRUNK}
          map={tex.bark.map}
          bumpMap={tex.bark.bumpMap}
          bumpScale={0.025}
          roughness={0.92}
        />
      </mesh>
      {spec.lobes.map((l, i) => (
        <mesh
          key={`top-${i}`}
          geometry={geos.canopyGeo}
          position={[l.dx, l.dy, l.dz]}
          scale={[l.r, l.r * l.sy, l.r]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={tones[l.tone]}
            map={tex.foliage.map}
            bumpMap={tex.foliage.bumpMap}
            bumpScale={0.024}
            roughness={0.84}
          />
        </mesh>
      ))}
      {spec.arms.map((a, i) => (
        <group key={`arm-${i}`} position={[0, canopyY + 0.15, 0]} rotation-y={-a.az}>
          <group rotation-z={a.tilt1}>
            <mesh position={[0, a.len1 / 2, 0]}>
              <cylinderGeometry args={[0.028, 0.048, a.len1, 5]} />
              <meshStandardMaterial color={TRUNK} roughness={0.92} />
            </mesh>
            <group position={[0, a.len1, 0]} rotation-z={1.15}>
              <mesh position={[0, a.len2 / 2, 0]}>
                <cylinderGeometry args={[0.012, 0.028, a.len2, 5]} />
                <meshStandardMaterial color={TRUNK} roughness={0.92} />
              </mesh>
              {a.leafs.map((lf, j) => (
                <group
                  key={`lf-${j}`}
                  position={[0, lf.t * a.len2, 0]}
                  rotation={[0, j * 1.1, -(a.tilt1 + 1.15)]}
                >
                  <mesh geometry={geos.leafCardGeo} scale={[lf.r * 1.65, lf.r * 1.9, 1]}>
                    <meshStandardMaterial
                      color={tones[lf.tone]}
                      map={willowCutoutTex}
                      alphaTest={0.38}
                      side={THREE.DoubleSide}
                      roughness={0.84}
                    />
                  </mesh>
                  <mesh
                    geometry={geos.leafCardGeo}
                    rotation-y={Math.PI * 0.5}
                    scale={[lf.r * 1.65, lf.r * 1.9, 1]}
                  >
                    <meshStandardMaterial
                      color={tones[(lf.tone + 1) % 3]}
                      map={willowCutoutTex}
                      alphaTest={0.38}
                      side={THREE.DoubleSide}
                      roughness={0.84}
                    />
                  </mesh>
                </group>
              ))}
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}

export default ImprovedTree;
