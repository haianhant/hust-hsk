// ---------------------------------------------------------------------------
// Trees.tsx — cây cải tiến cho đợt sửa lần 2 (brief §4).
// ImprovedTree: CÙNG chữ ký props với SimpleTree trong Landmarks.tsx
// (x, z, trunkH?, canopyR?, canopyY?, canopyColor?) để luồng tích hợp thay
// thế trong một dòng: SimpleTree -> ImprovedTree.
// Khác SimpleTree cũ (1 thân trụ + 1 cầu tròn như chiếc mũ):
//   - thân thuôn dần + 1 nhánh/cụm tán, ngắm thẳng từ ngọn thân tới tâm
//     cụm (gốc chôn trong thân, ngọn nằm trong tán — không lơ lửng);
//   - tán = 4-6 cụm lệch nhau (quả dẹt, lệch tâm, lệch cao), không đối xứng;
//   - 3-4 sắc xanh gần nhau rút từ canopyColor (sáng/tối ±) để có chiều sâu;
//   - mỗi cây khác nhau về tỉ lệ/chiều cao/góc xoay nhờ seed cố định theo
//     vị trí (mulberry32) — load lại vẫn giống hệt, không dùng Math.random().
// DroopingTree (liễu rủ): cùng triết lý, cành CONG 2 đoạn (vươn ra rồi rủ
// xuống) + cụm lá nhỏ ĐI THEO cành, không dây thẳng đứng. CHỈ dùng cho ven
// hồ nếu cần — LƯU Ý: TienLake.tsx đã có LakeWillow phân lớp riêng (3 tán +
// cành rủ), nên luồng tích hợp KHÔNG thay LakeWillow bằng DroopingTree trừ
// khi luồng hồ yêu cầu; DroopingTree ở đây là biến thể dự phòng/ven hồ mới.
// Không cây nào có collider — cây không chặn đường (leg-sim chỉ dùng
// lib/campus.ts nên không bị ảnh hưởng); đặt cây ngoài đường đi chính.
// ---------------------------------------------------------------------------

import { useMemo, useRef } from 'react';
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

// Shared singleton PBR textures & geometries for all campus trees (avoids duplicating 50+ CanvasTextures in VRAM)
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
} | null = null;

function createOrganicCanopyGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Dịch chuyển theo hàm hướng đơn vị nên mọi đỉnh trùng vị trí luôn khớp khít tuyệt đối
    const bump =
      1 +
      0.13 * Math.sin(3.6 * x + 2.4 * y) * Math.cos(3.2 * z) +
      0.07 * Math.cos(5.8 * y - 4.1 * x + 2.7 * z);
    pos.setXYZ(i, x * bump, y * bump, z * bump);
  }
  geo.computeVertexNormals();
  return geo;
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
    sharedTreeGeos = { canopyGeo, pitRimGeo, pitSoilGeo, rootFlareGeo, leafCardGeo };
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

// Seed cố định theo vị trí: cùng (x, z) luôn cho cùng một cây.
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromXZ(x: number, z: number): number {
  // Băm vị trí thành số nguyên 32-bit ổn định (tránh trùng khi x/z đổi dấu).
  let h = (Math.round(x * 100) + 100000) * 374761393 + (Math.round(z * 100) + 100000) * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

// 3 sắc xanh gần nhau rút từ màu tán gốc: gốc, sáng hơn, tối hơn.
function leafTones(base: string): [string, string, string] {
  const c = new THREE.Color(base);
  const light = c.clone().offsetHSL(0.015, -0.05, 0.09);
  const dark = c.clone().offsetHSL(-0.01, 0.05, -0.09);
  return [
    `#${c.getHexString()}`,
    `#${light.getHexString()}`,
    `#${dark.getHexString()}`,
  ];
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
  const s = 0.94 + rand() * 0.14; // giới hạn s <= 1.08 để maxVisualR <= 1.15 * canopyR
  const maxVisualUnscaled = (1.13 * canopyR) / s;
  const rotY = rand() * Math.PI * 2;
  const trunkTopR = 0.085 + rand() * 0.028;
  const trunkBotR = 0.17 + rand() * 0.055;
  const lean = (rand() - 0.5) * 0.08;

  // Tán phân tầng tự nhiên gồm vòm dù trung tâm + 3 nhánh tầng giữa + 3 đỉnh tán vươn sáng
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

  // 3 tầng giữa tỏa ngang gọn bên trong phạm vi tán (không tách rời kiểu kẹo mút)
  const midPhase = rand() * Math.PI * 2;
  for (let k = 0; k < 3; k++) {
    const a = midPhase + (k / 3) * Math.PI * 2 + (rand() - 0.5) * 0.45;
    const rr = canopyR * (0.36 + rand() * 0.07);
    const off = canopyR * (0.34 + rand() * 0.14);
    const [dx, dz] = clampRadialOffset(Math.cos(a) * off, Math.sin(a) * off, Math.max(0.05, maxVisualUnscaled - rr));
    lobes.push({
      dx,
      dy: canopyY + (-0.12 + rand() * 0.2) * canopyR,
      dz,
      r: rr,
      tone: (k + Math.floor(rand() * 2)) % 3,
      sy: 0.52 + rand() * 0.14,
    });
  }

  // 3 cụm đỉnh tán nhỏ hứng nắng phía trên
  const topPhase = midPhase + Math.PI / 3;
  for (let k = 0; k < 3; k++) {
    const a = topPhase + (k / 3) * Math.PI * 2 + (rand() - 0.5) * 0.4;
    const rr = canopyR * (0.28 + rand() * 0.06);
    const off = canopyR * (0.22 + rand() * 0.12);
    const [dx, dz] = clampRadialOffset(Math.cos(a) * off, Math.sin(a) * off, Math.max(0.05, maxVisualUnscaled - rr));
    lobes.push({
      dx,
      dy: canopyY + (0.22 + rand() * 0.2) * canopyR,
      dz,
      r: rr,
      tone: k === 0 ? 1 : Math.floor(rand() * 3),
      sy: 0.62 + rand() * 0.12,
    });
  }

  // Nhánh chính cắm vào từng tầng tán + cành cấp 2 chẽ nhánh tạo bộ xương tán khi nhìn ngước lên
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

  // 7 thẻ cành lá cắt alphaTest (crossed leaf-sprig cards) ôm rìa vòm tán
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

export function ImprovedTree({
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
  const isGolden = canopyColor.toLowerCase().startsWith('#e') || canopyColor.toLowerCase().startsWith('#d');
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
      {/* Bồn cây bó vỉa đá granite + đất nâu ẩm (thuần thị giác, không collider, nằm phẳng trục sân/vỉa hè) */}
      {withTreePit && (
        <group>
          <mesh geometry={geos.pitRimGeo} receiveShadow castShadow>
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
      {/* Bóng đổ tiếp xúc mềm dưới gốc cây (Ambient Occlusion, nâng lên 0.038m để luôn nổi trên vỉa hè 0.031m) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.038, 0]}>
        <planeGeometry args={[canopyR * 2.2 * spec.s, canopyR * 2.2 * spec.s]} />
        <meshBasicMaterial
          map={tex.shadow}
          transparent
          opacity={0.36}
          depthWrite={false}
        />
      </mesh>
      <group rotation-y={spec.rotY} scale={spec.s} rotation-z={spec.lean}>
        {/* Rễ bạnh loe tự nhiên ôm chân thân cây */}
        {[0, 1, 2, 3].map((ri) => {
          const ang = (ri / 4) * Math.PI * 2 + 0.35;
          return (
            <group key={`root-${ri}`} rotation-y={ang}>
              <mesh
                geometry={geos.rootFlareGeo}
                position={[spec.trunkBotR * 0.52, -0.02, 0]}
                rotation-z={-0.38}
                castShadow
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
        {/* Thân thuôn dần (đáy to, ngọn nhỏ) có vân vỏ cây PBR. */}
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
        {/* Nhánh chính & cành con chẽ lên các tầng tán. */}
        {spec.branches.map((b, i) => (
          <group key={`br-${i}`} position={[0, b.startY, 0]} rotation-y={-b.az}>
            <group rotation-z={b.tilt}>
              <mesh position={[0, b.len / 2, 0]} castShadow>
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
        {/* Tán dù phân tầng gọn (maxVisualR <= 1.15 * canopyR) + thẻ lá cắt alphaTest + đung đưa nhẹ theo gió. */}
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
                bumpScale={0.032}
                roughness={0.86}
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
                  roughness={0.84}
                />
              </mesh>
              <mesh geometry={geos.leafCardGeo} rotation-y={Math.PI * 0.48} scale={[lc.size, lc.size, 1]}>
                <meshStandardMaterial
                  color={tones[(lc.tone + 1) % 3]}
                  map={leafCutoutTex}
                  alphaTest={0.42}
                  side={THREE.DoubleSide}
                  roughness={0.84}
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
// Mỗi cành rủ = 2 đoạn: đoạn 1 vươn chéo ra ngoài từ tán, đoạn 2 gập xuống
// (cong ở khớp giữa) + 2-3 cụm lá nhỏ (quả dẹt r 0,22-0,4) bám dọc đoạn 2.
// Không có sợi dây thẳng đứng nào.
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
            castShadow
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
      {/* Tán trên 3 tầng vòm hữu cơ gọn (maxVisualR <= 1.15 * canopyR). */}
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
            bumpScale={0.032}
            roughness={0.86}
          />
        </mesh>
      ))}
      {/* Cành rủ cong: chùm thẻ lá liễu alphaTest buông dọc nhánh thay cho khối cầu tròn. */}
      {spec.arms.map((a, i) => (
        <group key={`arm-${i}`} position={[0, canopyY + 0.15, 0]} rotation-y={-a.az}>
          <group rotation-z={a.tilt1}>
            <mesh position={[0, a.len1 / 2, 0]} castShadow>
              <cylinderGeometry args={[0.028, 0.048, a.len1, 5]} />
              <meshStandardMaterial color={TRUNK} roughness={0.92} />
            </mesh>
            <group position={[0, a.len1, 0]} rotation-z={1.15}>
              <mesh position={[0, a.len2 / 2, 0]} castShadow>
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
