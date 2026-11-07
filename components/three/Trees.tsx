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
  makeBarkTexture,
  makeFoliageCanopyTexture,
  makeSoftShadowTexture,
} from './materials';

export interface TreeProps {
  x: number;
  z: number;
  trunkH?: number;
  canopyR?: number;
  canopyY?: number;
  canopyColor?: string;
}

const TRUNK = '#7A5E42';

// Shared singleton PBR textures for all campus trees (avoids duplicating 50+ CanvasTextures in VRAM)
let sharedTreeTex: {
  bark: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture };
  foliage: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture };
  shadow: THREE.CanvasTexture;
} | null = null;

function getSharedTreeTextures() {
  if (!sharedTreeTex) {
    sharedTreeTex = {
      bark: makeBarkTexture(2, 4),
      foliage: makeFoliageCanopyTexture(3, 3),
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
type Branch = { az: number; tilt: number; len: number; r: number };

function buildImprovedSpec(x: number, z: number, trunkH: number, canopyR: number, canopyY: number) {
  const rand = mulberry32(seedFromXZ(x, z));
  const s = 0.9 + rand() * 0.25; // tỉ lệ tổng thể 0,90-1,15
  const rotY = rand() * Math.PI * 2;
  const trunkTopR = 0.09 + rand() * 0.03;
  const trunkBotR = 0.17 + rand() * 0.06;
  const lean = (rand() - 0.5) * 0.1; // nghiêng nhẹ, cây không dựng như cột
  // Tán: 6 cụm LỆCH HẲN nhau, không còn 1 cầu tròn (đợt r2p-A mục 6).
  // Khối chính LỆCH TÂM; các khối phụ lệch cao/thấp + lệch ngang ở góc
  // NGẪU NHIÊN (không chia đều quanh tâm), dẹt/tròn không đều — silhouette
  // từ xa đọc thành cụm bướu lệch. Bản cũ 5 cụm chia đều góc, dẹt đều
  // 0,6–0,72, nhìn từ đường tình yêu vẫn đọc như đĩa/cầu xếp chồng.
  const lobeCount = 6;
  const lobes: Lobe[] = [];
  const mainA = rand() * Math.PI * 2;
  lobes.push({
    dx: Math.cos(mainA) * canopyR * 0.3,
    dy: canopyY + (rand() - 0.5) * canopyR * 0.35,
    dz: Math.sin(mainA) * canopyR * 0.3,
    r: canopyR * 0.62,
    tone: 0,
    sy: 0.72 + rand() * 0.25,
  });
  for (let k = 1; k < lobeCount; k++) {
    const a = rand() * Math.PI * 2; // góc ngẫu nhiên, không chia đều
    const rr = canopyR * (0.32 + rand() * 0.28);
    const off = canopyR * (0.75 + rand() * 0.4);
    lobes.push({
      dx: Math.cos(a) * off,
      dy: canopyY + (rand() - 0.55) * canopyR * 0.9,
      dz: Math.sin(a) * off,
      r: rr,
      tone: Math.floor(rand() * 3),
      sy: 0.55 + rand() * 0.45, // dẹt/tròn không đều
    });
  }
  // Nhánh: MỘT nhánh cho MỖI cụm tán, NGẮM THẲNG từ ngọn thân tới tâm cụm.
  // (Đợt 3 tích hợp: 3 nhánh cũ chĩa theo góc cố định ~120°, đầu nhánh
  // thường hụt tâm cụm 0,6–1,1 m — đo bằng node trên 4 cây mẫu: 4–5/6 cụm
  // không có nhánh nào chạm tới, tán lơ lửng, nhánh chọc lên khoảng không.
  // Nay mỗi nhánh đi từ trong thân tới hẳn trong cụm của nó.)
  // Quy ước hướng (render dùng rotation-y={-az} rồi rotation-z={tilt}):
  // +Y sau 2 góc xoay = (-sin tilt·cos az, cos tilt, -sin tilt·sin az),
  // nên với vector ngắm d: tilt = acos(d.y/|d|), az = atan2(-d.z, -d.x).
  const pivotY = trunkH * 0.92;
  const branches: Branch[] = lobes.map((l) => {
    const dx = l.dx;
    const dy = l.dy - pivotY;
    const dz = l.dz;
    const dist = Math.hypot(dx, dy, dz);
    const tilt = dist > 1e-6 ? Math.acos(Math.min(1, Math.max(-1, dy / dist))) : 0;
    const az = dist > 1e-6 ? Math.atan2(-dz, -dx) : 0;
    return {
      az,
      tilt,
      len: dist * 1.08, // đầu nhánh vượt tâm cụm một chút, nằm hẳn trong tán
      r: 0.04 + dist * 0.018,
    };
  });
  return { s, rotY, trunkTopR, trunkBotR, lean, pivotY, branches, lobes };
}

export function ImprovedTree({
  x,
  z,
  trunkH = 2,
  canopyR = 1.3,
  canopyY = 2.9,
  canopyColor = '#5D7D4A',
}: TreeProps) {
  const spec = useMemo(
    () => buildImprovedSpec(x, z, trunkH, canopyR, canopyY),
    [x, z, trunkH, canopyR, canopyY],
  );
  const tones = useMemo(() => leafTones(canopyColor), [canopyColor]);
  const tex = useMemo(() => getSharedTreeTextures(), []);
  const canopyRef = useRef<THREE.Group>(null!);
  const phase = useMemo(() => (seedFromXZ(x, z) % 1000) * 0.00628, [x, z]);

  useFrame((state) => {
    if (!canopyRef.current) return;
    const t = state.clock.elapsedTime;
    canopyRef.current.rotation.z = Math.sin(t * 1.15 + phase) * 0.018;
    canopyRef.current.rotation.x = Math.cos(t * 0.85 + phase * 1.3) * 0.014;
  });

  return (
    <group position={[x, 0, z]} rotation-y={spec.rotY} scale={spec.s} rotation-z={spec.lean}>
      {/* Bóng đổ tiếp xúc mềm dưới gốc cây (Ambient Occlusion / Contact Shadow) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.022 / spec.s, 0]}>
        <planeGeometry args={[canopyR * 2.2, canopyR * 2.2]} />
        <meshBasicMaterial
          map={tex.shadow}
          transparent
          opacity={0.38}
          depthWrite={false}
        />
      </mesh>
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
      {/* Nhánh: 1 nhánh/cụm tán, ngắm thẳng từ ngọn thân tới tâm cụm. */}
      {spec.branches.map((b, i) => (
        <group key={`br-${i}`} position={[0, spec.pivotY, 0]} rotation-y={-b.az}>
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
      {/* Tán nhiều cụm lệch nhau, 3 sắc xanh gần nhau + vân tán lá PBR + đung đưa nhẹ theo gió. */}
      <group ref={canopyRef}>
        {spec.lobes.map((l, i) => (
          <mesh
            key={`lobe-${i}`}
            position={[l.dx, l.dy, l.dz]}
            scale={[1, l.sy, 1]}
            castShadow
            receiveShadow
          >
            <sphereGeometry args={[l.r, 16, 12]} />
            <meshStandardMaterial
              color={tones[l.tone]}
              map={tex.foliage.map}
              bumpMap={tex.foliage.bumpMap}
              bumpScale={0.032}
              roughness={0.86}
            />
          </mesh>
        ))}
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
  const s = 0.9 + rand() * 0.25;
  const rotY = rand() * Math.PI * 2;
  const arms: DroopArm[] = Array.from({ length: 7 }, (_, k) => {
    const leafCount = 2 + Math.floor(rand() * 2);
    return {
      az: (k / 7) * Math.PI * 2 + rand() * 0.5,
      tilt1: 0.5 + rand() * 0.35, // vươn ra ngoài
      len1: canopyR * (0.5 + rand() * 0.25),
      len2: canopyR * (0.55 + rand() * 0.4), // đoạn rủ xuống, dài hơn
      leafs: Array.from({ length: leafCount }, (_, j) => ({
        t: 0.35 + (j / Math.max(leafCount - 1, 1)) * 0.6,
        r: canopyR * (0.16 + rand() * 0.1),
        tone: Math.floor(rand() * 3),
      })),
    };
  });
  // Tán trên: 3 cụm lệch (quả chính + 2 phụ), dẹt.
  const lobes: Lobe[] = [
    { dx: 0, dy: canopyY, dz: 0, r: canopyR * 0.7, tone: 0, sy: 0.6 },
    { dx: canopyR * 0.45, dy: canopyY + canopyR * 0.22, dz: canopyR * 0.2, r: canopyR * 0.5, tone: 1, sy: 0.6 },
    { dx: -canopyR * 0.4, dy: canopyY + canopyR * 0.1, dz: -canopyR * 0.3, r: canopyR * 0.45, tone: 2, sy: 0.6 },
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
  return (
    <group position={[x, 0, z]} rotation-y={spec.rotY} scale={spec.s}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.022 / spec.s, 0]}>
        <planeGeometry args={[canopyR * 2.2, canopyR * 2.2]} />
        <meshBasicMaterial map={tex.shadow} transparent opacity={0.38} depthWrite={false} />
      </mesh>
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
      {/* Tán trên 3 cụm lệch. */}
      {spec.lobes.map((l, i) => (
        <mesh key={`top-${i}`} position={[l.dx, l.dy, l.dz]} scale={[1, l.sy, 1]} castShadow receiveShadow>
          <sphereGeometry args={[l.r, 16, 12]} />
          <meshStandardMaterial
            color={tones[l.tone]}
            map={tex.foliage.map}
            bumpMap={tex.foliage.bumpMap}
            bumpScale={0.032}
            roughness={0.86}
          />
        </mesh>
      ))}
      {/* Cành rủ cong: đoạn 1 chéo ra, đoạn 2 gập xuống + cụm lá dọc đoạn 2. */}
      {spec.arms.map((a, i) => (
        <group key={`arm-${i}`} position={[0, canopyY + 0.2, 0]} rotation-y={-a.az}>
          <group rotation-z={a.tilt1}>
            <mesh position={[0, a.len1 / 2, 0]} castShadow>
              <cylinderGeometry args={[0.03, 0.05, a.len1, 5]} />
              <meshStandardMaterial color={TRUNK} roughness={0.92} />
            </mesh>
            {/* Khớp cong: đoạn 2 gập thêm ~65° so với đoạn 1 (rủ xuống). */}
            <group position={[0, a.len1, 0]} rotation-z={1.15}>
              <mesh position={[0, a.len2 / 2, 0]} castShadow>
                <cylinderGeometry args={[0.012, 0.03, a.len2, 5]} />
                <meshStandardMaterial color={TRUNK} roughness={0.92} />
              </mesh>
              {a.leafs.map((lf, j) => (
                <mesh
                  key={`lf-${j}`}
                  position={[0, lf.t * a.len2, 0]}
                  scale={[1, 0.7, 1]}
                  castShadow
                >
                  <sphereGeometry args={[lf.r, 10, 8]} />
                  <meshStandardMaterial
                    color={tones[lf.tone]}
                    map={tex.foliage.map}
                    bumpMap={tex.foliage.bumpMap}
                    bumpScale={0.025}
                    roughness={0.86}
                  />
                </mesh>
              ))}
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}

export default ImprovedTree;
