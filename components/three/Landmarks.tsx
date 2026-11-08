// ---------------------------------------------------------------------------
// Landmarks.tsx — các công trình campus (đợt sửa kiến trúc ngoại thất, tích
// hợp 05/11/2026 tối). C1 / Parabol / Thư viện / C9 / Hồ Tiền đã tách thành
// file riêng (C1Building.tsx, ParabolGate.tsx, LibraryBuilding.tsx,
// C9Building.tsx, TienLake.tsx) — file này chỉ còn logo "I LOVE BK", khối
// đá trắng, quảng trường Trần Đại Nghĩa + tượng đài, và cây/ghế đường tình
// yêu. Logo "I LOVE BK" vẫn ở đây (không thuộc C1Building).
// MÀU CHỐT theo docs/reference-visual.md §0 (ước lượng bằng mắt từ ảnh).
// Chữ trong scene dùng canvas texture (components/three/TextPlate.tsx).
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  C1_FOUNTAIN,
  C2_BUILDING,
  DAI_CO_VIET_GATE,
  I_LOVE_BK,
  LOVE_ROAD_BENCHES,
  LOVE_ROAD_TREES,
  MONUMENT,
  TRAN_DAI_NGHIA_GATE,
  WHITE_ROCK,
} from '../../lib/campus';
import type { TimeOfDay } from '../../lib/playerState';
import {
  LabelPlane,
  drawLetterBK,
  drawLetterI,
  drawMonument,
  drawRockInscription,
  drawTdnSign,
} from './TextPlate';
import { C1Building } from './C1Building';
import { ParabolGate } from './ParabolGate';
import { LibraryBuilding } from './LibraryBuilding';
import { C9Building } from './C9Building';
import { TienLake } from './TienLake';
import ImprovedTree from './Trees'; // đợt sửa lần 2 §4: cây đường tình yêu dùng ImprovedTree (cùng chữ ký props với SimpleTree cũ)
import {
  makeGraniteStoneTexture,
  makeWeatheredConcreteTexture,
  makeWoodGrainTexture,
} from './materials';

// --- Bảng màu chốt (reference-visual §0, ước lượng từ ảnh) --------------------
const GATE_WHITE = '#F2EFE6'; // bê tông cổng Parabol, trắng ấm
const HUST_RED = '#E8202A'; // đỏ HUST (tim, biển, cờ)
const PLINTH_BLACK = '#1A1A1A';
const BANK_RIM = '#B9B9B0'; // gờ bê tông trên bờ kè
const BRONZE = '#C9A227'; // biển đồng vàng
const MARBLE = '#F5F5F3'; // bia cẩm thạch trắng
const BENCH_WOOD = '#7A5230'; // ghế gỗ nâu
const BENCH_IRON = '#1A1A1A'; // khung ghế sắt đen

// --- Ghế gỗ nâu, khung sắt đen ------------------------------------------------
function SimpleBench({
  x,
  z,
  rotationY = 0,
  woodTex,
}: {
  x: number;
  z: number;
  rotationY?: number;
  woodTex?: THREE.CanvasTexture;
}) {
  return (
    <group position={[x, 0, z]} rotation-y={rotationY}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.8, 0.12, 0.55]} />
        <meshStandardMaterial
          color={BENCH_WOOD}
          map={woodTex}
          bumpMap={woodTex}
          bumpScale={0.01}
          roughness={0.85}
        />
      </mesh>
      <mesh position={[0, 0.78, -0.24]} castShadow>
        <boxGeometry args={[1.8, 0.55, 0.1]} />
        <meshStandardMaterial
          color={BENCH_WOOD}
          map={woodTex}
          bumpMap={woodTex}
          bumpScale={0.01}
          roughness={0.85}
        />
      </mesh>
      {[-0.8, 0.8].map((dx) => (
        <mesh key={dx} position={[dx, 0.22, 0]}>
          <boxGeometry args={[0.08, 0.45, 0.5]} />
          <meshStandardMaterial color={BENCH_IRON} roughness={0.5} metalness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

// --- Logo "I ❤ BK" 2 tầng khối 3D chuẩn ảnh thật (c1-san-truoc-i-love-bk-03.jpg):
//     Tầng dưới: chữ "B" và "K" khối 3D trắng đứng trên bệ đá đen.
//     Tầng trên: chữ "I" có chân (serif) khối 3D trắng đè lên chữ B + trái tim đỏ 3D nghiêng nhẹ đè lên chữ K.
function ILoveBK({ isNight = false }: { isNight?: boolean }) {
  const heartGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.28);
    s.bezierCurveTo(0, 0.56, -0.52, 0.56, -0.52, 0.14);
    s.bezierCurveTo(-0.52, -0.22, 0, -0.48, 0, -0.68);
    s.bezierCurveTo(0, -0.48, 0.52, -0.22, 0.52, 0.14);
    s.bezierCurveTo(0.52, 0.56, 0, 0.56, 0, 0.28);
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.36,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.025,
      bevelSegments: 3,
    });
    g.translate(0, 0, -0.18);
    return g;
  }, []);

  // Chữ B khối 3D có 2 lỗ khuyết chuẩn
  const letterBGeo = useMemo(() => {
    const bShape = new THREE.Shape();
    bShape.moveTo(-0.48, 0);
    bShape.lineTo(0.18, 0);
    bShape.quadraticCurveTo(0.52, 0, 0.52, 0.31);
    bShape.quadraticCurveTo(0.52, 0.55, 0.28, 0.6);
    bShape.quadraticCurveTo(0.48, 0.66, 0.48, 0.9);
    bShape.quadraticCurveTo(0.48, 1.2, 0.14, 1.2);
    bShape.lineTo(-0.48, 1.2);
    bShape.closePath();

    const lowerHole = new THREE.Path();
    lowerHole.moveTo(-0.2, 0.22);
    lowerHole.lineTo(0.12, 0.22);
    lowerHole.quadraticCurveTo(0.24, 0.22, 0.24, 0.35);
    lowerHole.quadraticCurveTo(0.24, 0.48, 0.12, 0.48);
    lowerHole.lineTo(-0.2, 0.48);
    lowerHole.closePath();

    const upperHole = new THREE.Path();
    upperHole.moveTo(-0.2, 0.7);
    upperHole.lineTo(0.1, 0.7);
    upperHole.quadraticCurveTo(0.21, 0.7, 0.21, 0.83);
    upperHole.quadraticCurveTo(0.21, 0.96, 0.1, 0.96);
    upperHole.lineTo(-0.2, 0.96);
    upperHole.closePath();

    bShape.holes.push(lowerHole, upperHole);
    const g = new THREE.ExtrudeGeometry(bShape, { depth: 0.36, bevelEnabled: false });
    g.translate(0, 0, -0.18);
    return g;
  }, []);

  // Chữ K khối 3D
  const letterKGeo = useMemo(() => {
    const kShape = new THREE.Shape();
    kShape.moveTo(-0.48, 0);
    kShape.lineTo(-0.18, 0);
    kShape.lineTo(-0.18, 0.48);
    kShape.lineTo(0.22, 0);
    kShape.lineTo(0.56, 0);
    kShape.lineTo(0.05, 0.62);
    kShape.lineTo(0.54, 1.2);
    kShape.lineTo(0.2, 1.2);
    kShape.lineTo(-0.18, 0.72);
    kShape.lineTo(-0.18, 1.2);
    kShape.lineTo(-0.48, 1.2);
    kShape.closePath();
    const g = new THREE.ExtrudeGeometry(kShape, { depth: 0.36, bevelEnabled: false });
    g.translate(0, 0, -0.18);
    return g;
  }, []);

  const granitePbr = useMemo(() => makeGraniteStoneTexture(3, 1), []);
  useEffect(() => () => {
    heartGeo.dispose();
    letterBGeo.dispose();
    letterKGeo.dispose();
    granitePbr.map.dispose();
    granitePbr.bumpMap.dispose();
  }, [heartGeo, letterBGeo, letterKGeo, granitePbr]);

  const whiteLetterMatProps = {
    color: '#F8FAFC',
    emissive: isNight ? '#E2E8F0' : '#000000',
    emissiveIntensity: isNight ? 0.35 : 0,
    roughness: 0.38,
    metalness: 0.08,
  };

  return (
    <group position={[I_LOVE_BK.center.x, 0, I_LOVE_BK.center.z]}>
      {/* Bệ đá granite đen bóng gọn 2.7m × 0.42m × 0.8m (khớp c1-san-truoc-i-love-bk-03.jpg) */}
      <mesh position={[0, 0.21, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.7, 0.42, 0.8]} />
        <meshStandardMaterial
          color={PLINTH_BLACK}
          map={granitePbr.map}
          bumpMap={granitePbr.bumpMap}
          bumpScale={0.01}
          roughness={0.5}
          metalness={0.15}
        />
      </mesh>

      {/* TẦNG DƯỚI (y = 0.42..1.62): Khối chữ 3D "B" và "K" màu trắng */}
      <mesh geometry={letterBGeo} position={[-0.64, 0.42, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...whiteLetterMatProps} />
      </mesh>
      <mesh geometry={letterKGeo} position={[0.64, 0.42, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...whiteLetterMatProps} />
      </mesh>

      {/* TẦNG TRÊN BÊN TRÁI (y = 1.62..2.78): Chữ "I" có chân (serif) khối 3D trắng đè lên chữ B */}
      <group position={[-0.64, 1.62, 0]}>
        <mesh position={[0, 0.11, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.78, 0.22, 0.36]} />
          <meshStandardMaterial {...whiteLetterMatProps} />
        </mesh>
        <mesh position={[0, 0.58, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.74, 0.36]} />
          <meshStandardMaterial {...whiteLetterMatProps} />
        </mesh>
        <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.78, 0.22, 0.36]} />
          <meshStandardMaterial {...whiteLetterMatProps} />
        </mesh>
      </group>

      {/* TẦNG TRÊN BÊN PHẢI (y = 2.25): Trái tim 3D màu đỏ tươi đặt hơi nghiêng trên chữ K */}
      <mesh
        geometry={heartGeo}
        position={[0.62, 2.24, 0.02]}
        rotation-z={-0.18}
        scale={[1.08, 1.08, 1]}
        castShadow
      >
        <meshStandardMaterial
          color={HUST_RED}
          emissive={isNight ? '#FF2A36' : '#000000'}
          emissiveIntensity={isNight ? 0.58 : 0}
          roughness={0.35}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}

// --- Khối đá trắng — dựng lại theo ảnh Tuổi Trẻ (c1-stele-brief §1) -------
// Tảng đá tự nhiên BÈ NGANG (viền ngoài ~5,5 × 2,9 m, dày ~2,0 m — rộng
// hơn cao ~1,9 lần), mép trên lượn sóng nhẹ không đều, hai vai bo tròn
// thuôn xuống chân nặng; mặt trước tương đối phẳng để khắc chữ. Khối đá
// là ExtrudeGeometry từ đường viền lượn (có bevel bo mép) + biến dạng sin
// biên độ nhỏ cho mảng lồi lõm — KHÔNG phải hộp méo hay mặt phẳng mỏng.
// Vật liệu xám trắng hơi loang (canvas texture đốm hạt tự sinh), nhám,
// không bóng gương. Chữ 2 dòng đen áp sát mặt đá (cách 0,08 m, không nổi
// dày). Đá nằm trong ô cỏ chữ nhật thấp có viền bê tông + đất/bóng tiếp
// xúc dưới chân; KHÔNG đặt trên bệ cao. VỊ TRÍ GIỮ NGUYÊN (WHITE_ROCK).
function makeRockTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');
  ctx.fillStyle = '#E2E1DB';
  ctx.fillRect(0, 0, 512, 512);
  let seed = 20260808;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  // Mảng loang đá hoa cương tự nhiên (thạch anh trắng sáng + fenspat xám ấm).
  for (let i = 0; i < 42; i++) {
    const x = rnd() * 512;
    const y = rnd() * 512;
    const r = 24 + rnd() * 64;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tone = rnd() > 0.45 ? '115,112,102' : '252,251,247';
    g.addColorStop(0, `rgba(${tone},${0.07 + rnd() * 0.1})`);
    g.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Vân đá tự nhiên chéo nhẹ.
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 18; i++) {
    const x0 = rnd() * 512;
    const y0 = rnd() * 512;
    ctx.strokeStyle = `rgba(95,92,85,${0.08 + rnd() * 0.1})`;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(
      x0 + (rnd() - 0.5) * 140,
      y0 + (rnd() - 0.5) * 90,
      x0 + (rnd() - 0.5) * 180,
      y0 + (rnd() - 0.5) * 120,
      x0 + (rnd() - 0.5) * 220,
      y0 + (rnd() - 0.5) * 150,
    );
    ctx.stroke();
  }
  // Hạt tinh thể đá granite (mica đen + thạch anh xám/trắng).
  for (let i = 0; i < 3400; i++) {
    const v = 85 + Math.floor(rnd() * 135);
    ctx.fillStyle = `rgba(${v},${v},${v - 5},${0.1 + rnd() * 0.2})`;
    ctx.beginPath();
    ctx.arc(rnd() * 512, rnd() * 512, 0.5 + rnd() * 1.9, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 360; i++) {
    ctx.fillStyle = `rgba(58,56,52,${0.22 + rnd() * 0.24})`;
    ctx.beginPath();
    ctx.arc(rnd() * 512, rnd() * 512, 0.6 + rnd() * 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.32, 0.32);
  tex.anisotropy = 4;
  return tex;
}

function WhiteRock() {
  // Khối đá hoa cương tự nhiên 3D đa diện: chân bè vững chãi, thuôn dần lên
  // đỉnh và hai vai, lưng đá vát tự nhiên có gờ lồi lõm, mặt trước phẳng vùng khắc chữ.
  const { rockGeo, sideRockGeoL, sideRockGeoR } = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-2.62, 0.08);
    s.splineThru([
      new THREE.Vector2(-2.68, 0.82),
      new THREE.Vector2(-2.5, 1.56),
      new THREE.Vector2(-2.2, 2.05),
      new THREE.Vector2(-1.68, 2.35),
      new THREE.Vector2(-1.05, 2.52),
      new THREE.Vector2(-0.42, 2.4),
      new THREE.Vector2(0.18, 2.58),
      new THREE.Vector2(0.78, 2.44),
      new THREE.Vector2(1.38, 2.52),
      new THREE.Vector2(1.92, 2.3),
      new THREE.Vector2(2.32, 1.94),
      new THREE.Vector2(2.56, 1.4),
      new THREE.Vector2(2.62, 0.76),
      new THREE.Vector2(2.52, 0.2),
      new THREE.Vector2(1.85, 0.05),
      new THREE.Vector2(0, 0.02),
      new THREE.Vector2(-1.85, 0.06),
    ]);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      steps: 8,
      depth: 1.72,
      bevelEnabled: true,
      bevelThickness: 0.2,
      bevelSize: 0.16,
      bevelSegments: 5,
      curveSegments: 14,
    });
    g.translate(0, 0, -0.86); // mặt trước z ≈ +1,06, mặt sau z ≈ −1,06

    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Độ cao chuẩn hóa (0 ở chân đá -> 1 ở đỉnh đá ~2.6m)
      const hNorm = Math.max(0, Math.min(1, y / 2.65));
      // Khối đá tự nhiên thuôn nhẹ về phía đỉnh và bo vát phần lưng/vai đá,
      // trong khi chân đá bè rộng vững chãi.
      const depthTaper = 1.08 - 0.24 * Math.pow(hNorm, 1.35);
      const shoulderRatio = Math.min(1, Math.abs(x) / 2.65);
      const sideDepthTaper = 1 - 0.18 * Math.pow(shoulderRatio, 2.1);

      // Vùng khắc chữ mặt trước (z > 0.82, |x| < 2.2, 0.65 < y < 2.15) giữ phẳng
      const inPlaqueZone =
        z > 0.82 && Math.abs(x) < 2.22 && y > 0.62 && y < 2.15;

      if (inPlaqueZone) {
        z = Math.min(z, 1.03) + 0.008 * Math.sin(1.8 * x) * Math.cos(1.6 * y);
      } else {
        z *= depthTaper * sideDepthTaper;
        // Lưng đá (z < 0) phồng tự nhiên ở phần bụng dưới và vát về phía đỉnh
        if (z < 0) {
          z -= 0.14 * (1 - hNorm) * Math.cos(shoulderRatio * 1.2);
        }
        // Biến dạng đa tần tạo thớ đá tự nhiên (không phẳng lì kiểu hộp 2D)
        const facetX =
          0.065 * Math.sin(2.1 * y + 1.4) * Math.sin(1.8 * z + 0.5) +
          0.03 * Math.cos(4.3 * y + 2.2 * z);
        const facetY =
          0.055 * Math.sin(1.6 * x + 0.8) * Math.sin(2.4 * z + 1.9) +
          0.025 * Math.cos(3.7 * x - 1.8 * z);
        const facetZ =
          0.05 * Math.sin(2.7 * x + 0.6) * Math.sin(2.3 * y + 1.1) +
          0.028 * Math.cos(4.1 * x + 3.2 * y);
        const frontDamp = z > 0.65 ? 0.35 : 1.0;
        x += facetX * frontDamp;
        y = Math.max(0.01, y + facetY * frontDamp);
        z = Math.min(1.03, z + facetZ * frontDamp);
      }

      pos.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals();

    // Hai tảng đá cuội/granite phụ đặt ôm chân khối đá chính trong bồn cỏ
    const makeBoulder = (rx: number, ry: number, rz: number, seedOffset: number) => {
      const b = new THREE.DodecahedronGeometry(1, 2);
      const bp = b.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < bp.count; i++) {
        const vx = bp.getX(i);
        const vy = bp.getY(i);
        const vz = bp.getZ(i);
        const n =
          1 +
          0.12 * Math.sin(3.1 * vx + seedOffset) * Math.cos(2.7 * vy - seedOffset) +
          0.08 * Math.sin(4.2 * vz + 1.3);
        bp.setXYZ(i, vx * rx * n, Math.max(-0.25 * ry, vy * ry * n), vz * rz * n);
      }
      b.computeVertexNormals();
      return b;
    };

    return {
      rockGeo: g,
      sideRockGeoL: makeBoulder(0.62, 0.38, 0.48, 1.2),
      sideRockGeoR: makeBoulder(0.54, 0.34, 0.44, 3.7),
    };
  }, []);
  const rockTex = useMemo(() => makeRockTexture(), []);
  useEffect(() => () => {
    rockGeo.dispose();
    sideRockGeoL.dispose();
    sideRockGeoR.dispose();
    rockTex.dispose();
  }, [rockGeo, sideRockGeoL, sideRockGeoR, rockTex]);

  return (
    <group position={[WHITE_ROCK.center.x, 0, WHITE_ROCK.center.z]}>
      {/* Ô cảnh quan thấp hình chữ nhật: cỏ + viền bê tông (như ảnh). */}
      <mesh position={[0, 0.025, 0]} receiveShadow>
        <boxGeometry args={[7.2, 0.05, 3.8]} />
        <meshStandardMaterial color="#86A860" roughness={1} />
      </mesh>
      {[
        { p: [0, 0.07, -1.95] as [number, number, number], s: [7.6, 0.14, 0.2] as [number, number, number] },
        { p: [0, 0.07, 1.95] as [number, number, number], s: [7.6, 0.14, 0.2] as [number, number, number] },
        { p: [-3.65, 0.07, 0] as [number, number, number], s: [0.2, 0.14, 3.9] as [number, number, number] },
        { p: [3.65, 0.07, 0] as [number, number, number], s: [0.2, 0.14, 3.9] as [number, number, number] },
      ].map((b, i) => (
        <mesh key={`rim-${i}`} position={b.p} receiveShadow>
          <boxGeometry args={b.s} />
          <meshStandardMaterial color={BANK_RIM} roughness={1} />
        </mesh>
      ))}
      {/* Đất sẫm dưới chân + bệ đá tự nhiên chìm + bóng tiếp xúc (đá không lơ lửng). */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[5.6, 0.1, 2.3]} />
        <meshStandardMaterial color="#6B6258" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.105, 0]}>
        <planeGeometry args={[5.9, 2.5]} />
        <meshStandardMaterial color="#1A1A1A" transparent opacity={0.34} roughness={1} />
      </mesh>
      {/* Tảng đá hoa cương chính: chân chìm vào đất, mặt trước hướng nam (+Z). */}
      <mesh geometry={rockGeo} position={[0, 0.05, 0]} castShadow receiveShadow>
        <meshStandardMaterial
          color="#EAE8E1"
          map={rockTex}
          bumpMap={rockTex}
          bumpScale={0.032}
          roughness={0.88}
        />
      </mesh>
      {/* Đá tảng nhỏ tự nhiên ôm hai bên chân bia */}
      <mesh geometry={sideRockGeoL} position={[-2.65, 0.22, 0.42]} rotation={[0.08, 0.35, -0.06]} castShadow receiveShadow>
        <meshStandardMaterial color="#DCD9D0" map={rockTex} bumpMap={rockTex} bumpScale={0.025} roughness={0.9} />
      </mesh>
      <mesh geometry={sideRockGeoR} position={[2.62, 0.2, 0.38]} rotation={[0.05, -0.42, 0.08]} castShadow receiveShadow>
        <meshStandardMaterial color="#DFDCD3" map={rockTex} bumpMap={rockTex} bumpScale={0.025} roughness={0.9} />
      </mesh>
      {/* Chữ đen 2 dòng áp sát mặt đá (mặt trước phẳng ở z ≈ 1,03; chữ ở 1,09). */}
      <LabelPlane
        textureKey="rock-inscription"
        canvasW={1024}
        canvasH={256}
        draw={drawRockInscription}
        size={[4.3, 1.075]}
        position={[0, 1.45, 1.09]}
      />
      {/* Ghế gỗ bên trái ô đá, quay mặt về bia (như ảnh). */}
      <SimpleBench x={-4.9} z={0} rotationY={Math.PI / 2} />
    </group>
  );
}

// --- Quảng trường Trần Đại Nghĩa + tượng đài --------------------------------------
function TranDaiNghiaSquare() {
  const { x, z } = TRAN_DAI_NGHIA_GATE.center; // (92, −6)
  return (
    <group>
      {/* Cổng Trần Đại Nghĩa: 2 trụ + xà ngang. */}
      <mesh position={[x, 2.5, z - 3.5]} castShadow>
        <boxGeometry args={[1.2, 5, 1.2]} />
        <meshStandardMaterial color={GATE_WHITE} roughness={0.9} />
      </mesh>
      <mesh position={[x, 2.5, z + 3.5]} castShadow>
        <boxGeometry args={[1.2, 5, 1.2]} />
        <meshStandardMaterial color={GATE_WHITE} roughness={0.9} />
      </mesh>
      <mesh position={[x, 5.5, z]} castShadow>
        <boxGeometry args={[1.2, 1, 8.2]} />
        <meshStandardMaterial color={GATE_WHITE} roughness={0.9} />
      </mesh>
      <LabelPlane
        textureKey="tdn-gate-arch-sign"
        canvasW={1024}
        canvasH={192}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#A81C24';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#FFD166';
          ctx.lineWidth = 7;
          ctx.strokeRect(8, 8, w - 16, h - 16);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 30px Arial, sans-serif';
          ctx.fillText('ĐẠI HỌC BÁCH KHOA HÀ NỘI · CỔNG TRẦN ĐẠI NGHĨA (B8)', w / 2, h / 2);
        }}
        size={[7.4, 0.82]}
        position={[x - 0.63, 5.5, z]}
        rotation={[0, -Math.PI / 2, 0]}
        transparent={false}
      />

      {/* Biển đồng vàng nghiêng, mặt hướng về phía tây (hướng người đi tới).
          Tấm biển mỏng theo trục X, ngửa ra sau (đỉnh nghiêng về phía đông). */}
      <group position={[MONUMENT.sign.x, 0, MONUMENT.sign.z]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.3, 1.0, 0.3]} />
          <meshStandardMaterial color="#F5F5F3" roughness={0.9} />
        </mesh>
        <group position={[0, 1.35, 0]} rotation-z={-0.5}>
          <mesh castShadow>
            <boxGeometry args={[0.12, 1.7, 3.4]} />
            <meshStandardMaterial color={BRONZE} roughness={0.35} metalness={0.5} />
          </mesh>
          <LabelPlane
            textureKey="tdn-sign"
            canvasW={1024}
            canvasH={512}
            draw={drawTdnSign}
            size={[3.2, 1.6]}
            position={[-0.08, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
          />
        </group>
      </group>

      {/* Bia tượng đài "Xếp bút nghiên" trước Hội trường C2: bia cẩm thạch trắng +
          chữ khắc đỏ + cụm điêu khắc Trang sách mở & Mũ cối cẩm thạch trắng + đôi bình gốm. */}
      <group position={[MONUMENT.center.x, 0, MONUMENT.center.z]}>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.4, 3.2]} />
          <meshStandardMaterial color={MARBLE} roughness={0.75} />
        </mesh>
        <mesh position={[0, 1.9, 0]} castShadow>
          <boxGeometry args={[0.5, 3, 2.2]} />
          <meshStandardMaterial color={MARBLE} roughness={0.75} />
        </mesh>
        {/* Tấm nghiêng thấp hơn, tựa vào chân bia. */}
        <mesh position={[-0.75, 0.65, 0]} rotation-z={0.45} castShadow>
          <boxGeometry args={[0.25, 1.4, 1.6]} />
          <meshStandardMaterial color={MARBLE} roughness={0.75} />
        </mesh>
        {/* Trang sách mở cẩm thạch trắng đặt trên bệ trước bia */}
        <group position={[-0.55, 0.92, 0]} rotation={[0, 0, 0.35]}>
          <mesh position={[0, 0, -0.36]} rotation={[0.18, 0, 0]} castShadow>
            <boxGeometry args={[0.55, 0.08, 0.68]} />
            <meshStandardMaterial color="#FAF9F5" roughness={0.65} />
          </mesh>
          <mesh position={[0, 0, 0.36]} rotation={[-0.18, 0, 0]} castShadow>
            <boxGeometry args={[0.55, 0.08, 0.68]} />
            <meshStandardMaterial color="#FAF9F5" roughness={0.65} />
          </mesh>
          {/* Chiếc mũ cối sinh viên đặt trên trang sách mở */}
          <group position={[-0.04, 0.14, 0.12]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.24, 0.28, 0.05, 20]} />
              <meshStandardMaterial color="#F2EFE9" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.04, 0]} scale={[1, 0.68, 1]} castShadow>
              <sphereGeometry args={[0.2, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#F7F5F0" roughness={0.6} />
            </mesh>
          </group>
        </group>
        {/* Đôi bình hoa gốm sứ xanh trắng đặt đối xứng hai bên chân bia */}
        {[-1.25, 1.25].map((vz) => (
          <group key={`vase-${vz}`} position={[-0.45, 0.4, vz]}>
            <mesh position={[0, 0.22, 0]} castShadow>
              <cylinderGeometry args={[0.14, 0.11, 0.44, 16]} />
              <meshStandardMaterial color="#EBF2FA" roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.46, 0]}>
              <cylinderGeometry args={[0.16, 0.12, 0.06, 16]} />
              <meshStandardMaterial color="#2B5B84" roughness={0.4} />
            </mesh>
          </group>
        ))}
        <LabelPlane
          textureKey="monument"
          canvasW={512}
          canvasH={768}
          draw={drawMonument}
          size={[1.8, 2.6]}
          position={[-0.28, 1.9, 0]}
          rotation={[0, -Math.PI / 2, 0]}
        />
      </group>
    </group>
  );
}

// --- Đài phun nước & Hồ cảnh quan trước Tòa C1 (góc tây Quảng trường C1) -----
function C1Fountain() {
  const sprayRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (!sprayRef.current) return;
    const t = state.clock.elapsedTime;
    sprayRef.current.scale.y = 0.92 + Math.sin(t * 4.2) * 0.08;
    sprayRef.current.rotation.y = t * 0.6;
  });

  // Đặt ở C1_FOUNTAIN.center (-78, -36.5), phía bắc Khối đá trắng (-78, -31), hoàn toàn ngoài đường đi và chặng leg2
  return (
    <group position={[C1_FOUNTAIN.center.x, 0, C1_FOUNTAIN.center.z]}>
      {/* Thành bể đá hình chữ nhật vát góc 4.8 × 2.6 m */}
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.8, 0.36, 2.6]} />
        <meshStandardMaterial color="#B5B2A8" roughness={0.85} />
      </mesh>
      {/* Lòng nước xanh trong */}
      <mesh position={[0, 0.31, 0]} receiveShadow>
        <boxGeometry args={[4.3, 0.12, 2.1]} />
        <meshStandardMaterial color="#2C6E7A" roughness={0.22} metalness={0.12} />
      </mesh>
      {/* Tháp phun nước đá 2 tầng ở giữa bể */}
      <mesh position={[0, 0.52, 0]} castShadow>
        <cylinderGeometry args={[0.38, 0.48, 0.45, 16]} />
        <meshStandardMaterial color="#D8D5CC" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.82, 0]} castShadow>
        <cylinderGeometry args={[0.72, 0.28, 0.18, 18]} />
        <meshStandardMaterial color="#E5E2D9" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.2, 0.35, 14]} />
        <meshStandardMaterial color="#D8D5CC" roughness={0.75} />
      </mesh>
      {/* Tia nước phun trắng bạc chuyển động */}
      <group ref={sprayRef} position={[0, 1.22, 0]}>
        <mesh position={[0, 0.32, 0]}>
          <coneGeometry args={[0.36, 0.68, 16, 1, true]} />
          <meshStandardMaterial color="#E6F7FF" transparent opacity={0.55} roughness={0.2} side={THREE.DoubleSide} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((k) => {
          const ang = (k / 6) * Math.PI * 2;
          return (
            <mesh
              key={`jet-${k}`}
              position={[Math.cos(ang) * 0.42, -0.08, Math.sin(ang) * 0.42]}
              rotation={[0, -ang, 0.48]}
            >
              <cylinderGeometry args={[0.02, 0.04, 0.62, 8]} />
              <meshStandardMaterial color="#F0FAFF" transparent opacity={0.6} roughness={0.2} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

// --- Nhà C2 (VP Đoàn Thanh niên C2-208, VP Đảng ủy C2-203 & Hội trường C2) ---
// Theo Bản đồ Bách Khoa (khuon-vien-truong.png): Nhà C2 là khối nhà dọc Bắc–Nam
// nằm ở phía Tây vườn hoa C1, ngay phía Bắc của Nhà C9 (center: -86, -22; 7.5 × 15 m).
function drawC2Sign(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#F5F2EB';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#8A6B48';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = '#B02A24';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 44px Arial, sans-serif';
  ctx.fillText('NHÀ C2 · VP ĐOÀN TN & ĐẢNG ỦY', w / 2, h * 0.52);
}

function C2Building({ isNight = false }: { isNight?: boolean }) {
  const concretePbr = useMemo(() => makeWeatheredConcreteTexture(3, 2), []);
  useEffect(
    () => () => {
      concretePbr.map.dispose();
      concretePbr.bumpMap.dispose();
    },
    [concretePbr],
  );

  // Đặt ở C2_BUILDING.center (-86, 0, -22), trục dài theo hướng Bắc–Nam (size 7.5 × 15 m), mặt chính hướng Đông (+X) ra vườn hoa C1
  return (
    <group position={[C2_BUILDING.center.x, 0, C2_BUILDING.center.z]} rotation-y={Math.PI / 2}>
      {/* Khối nhà C2 15 × 7.5 m (sau khi xoay 90°: dọc Bắc–Nam 15 m, ngang Đông–Tây 7.5 m), cao 7.8 m */}
      <mesh position={[0, 3.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[15, 7.8, 7.5]} />
        <meshStandardMaterial
          color="#D9B38C"
          map={concretePbr.map}
          bumpMap={concretePbr.bumpMap}
          bumpScale={0.015}
          roughness={0.86}
        />
      </mesh>
      {/* Chân đế sẫm màu */}
      <mesh position={[0, 0.45, 0]} receiveShadow>
        <boxGeometry args={[15.12, 0.9, 7.62]} />
        <meshStandardMaterial color="#A67F58" roughness={0.9} />
      </mesh>
      {/* Mái vòm/phẳng đặc trưng của Nhà C2 */}
      <mesh position={[0, 7.8, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.28, 1, 1]} castShadow>
        <cylinderGeometry args={[3.9, 3.9, 15.4, 20, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#B89470" roughness={0.85} />
      </mesh>
      {/* Hàng cột hiên mặt Đông (quay ra Quảng trường / Vườn hoa C1) */}
      {[-5.5, -2.75, 0, 2.75, 5.5].map((cx) => (
        <mesh key={`c2-col-${cx}`} position={[cx, 3.5, 3.95]} castShadow>
          <boxGeometry args={[0.42, 7.0, 0.42]} />
          <meshStandardMaterial color="#FAF6EE" roughness={0.82} />
        </mesh>
      ))}
      {/* Mái hiên sảnh mặt Đông */}
      <mesh position={[0, 4.1, 4.35]} castShadow>
        <boxGeometry args={[13.6, 0.32, 1.3]} />
        <meshStandardMaterial color="#EDE4D3" roughness={0.85} />
      </mesh>
      {/* Cửa kính lớn tầng 1 & tầng 2 (phản chiếu bầu trời IBL ban ngày, sáng ấm về đêm) */}
      {[-4.2, -1.4, 1.4, 4.2].map((wx, idx) => {
        const lit = isNight && idx !== 2;
        return (
          <group key={`c2-win-${wx}`}>
            <mesh position={[wx, 1.8, 3.78]}>
              <planeGeometry args={[1.95, 2.5]} />
              <meshStandardMaterial
                color={lit ? '#FFE0A3' : '#3A5368'}
                emissive={lit ? '#FFB84D' : '#000000'}
                emissiveIntensity={lit ? 0.65 : 0}
                roughness={0.22}
                metalness={0.35}
              />
            </mesh>
            <mesh position={[wx, 5.5, 3.78]}>
              <planeGeometry args={[1.95, 1.75]} />
              <meshStandardMaterial
                color={lit ? '#FFE0A3' : '#4A657A'}
                emissive={lit ? '#FFB84D' : '#000000'}
                emissiveIntensity={lit ? 0.55 : 0}
                roughness={0.22}
                metalness={0.35}
              />
            </mesh>
          </group>
        );
      })}
      <LabelPlane
        textureKey="c2-hall-sign"
        canvasW={512}
        canvasH={128}
        draw={drawC2Sign}
        size={[4.2, 0.95]}
        position={[0, 4.8, 3.83]}
        transparent={false}
      />
    </group>
  );
}

// --- Cổng chính Số 1 Đại Cồ Việt (Rìa bắc sau Tòa C1, z = -73.5) --------------
function drawDaiCoVietGateSign(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#A81C24';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#F5C518';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 46px Arial, sans-serif';
  ctx.fillText('ĐẠI HỌC BÁCH KHOA HÀ NỘI', w / 2, h * 0.36);
  ctx.fillStyle = '#FFD966';
  ctx.font = '700 30px Arial, sans-serif';
  ctx.fillText('SỐ 1 ĐẠI CỒ VIỆT · HANOI UNIVERSITY OF SCIENCE AND TECHNOLOGY', w / 2, h * 0.74);
}

function DaiCoVietGate() {
  return (
    <group position={[DAI_CO_VIET_GATE.center.x, 0, DAI_CO_VIET_GATE.center.z]}>
      {/* Hai trụ cổng chính ốp đá trang nghiêm */}
      {[-5.2, 5.2].map((gx) => (
        <group key={`dcv-pillar-${gx}`} position={[gx, 0, 0]}>
          <mesh position={[0, 2.8, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.3, 5.6, 1.3]} />
            <meshStandardMaterial color="#EAE4D7" roughness={0.85} />
          </mesh>
          <mesh position={[0, 5.75, 0]} castShadow>
            <boxGeometry args={[1.55, 0.3, 1.55]} />
            <meshStandardMaterial color="#C8C0B0" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* Dầm ngang cổng chính mang biển tên trường */}
      <mesh position={[0, 5.1, 0]} castShadow>
        <boxGeometry args={[11.8, 1.15, 0.9]} />
        <meshStandardMaterial color="#EAE4D7" roughness={0.85} />
      </mesh>
      <LabelPlane
        textureKey="dcv-gate-sign-south"
        canvasW={1024}
        canvasH={220}
        draw={drawDaiCoVietGateSign}
        size={[9.6, 1.02]}
        position={[0, 5.1, 0.48]}
        transparent={false}
      />
      <LabelPlane
        textureKey="dcv-gate-sign-north"
        canvasW={1024}
        canvasH={220}
        draw={drawDaiCoVietGateSign}
        size={[9.6, 1.02]}
        position={[0, 5.1, -0.48]}
        rotation={[0, Math.PI, 0]}
        transparent={false}
      />
      {/* Hàng rào sắt thoáng hai bên cổng Đại Cồ Việt */}
      {[-12, -8.5, 8.5, 12].map((fx) => (
        <group key={`dcv-fence-${fx}`} position={[fx, 0, 0]}>
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[3.4, 0.7, 0.35]} />
            <meshStandardMaterial color="#D8D2C5" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.35, 0]}>
            <boxGeometry args={[3.3, 1.3, 0.08]} />
            <meshStandardMaterial color="#2B2F33" roughness={0.5} metalness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function Landmarks({ timeOfDay = 'day' }: { timeOfDay?: TimeOfDay }) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset';
  const benchWoodTex = useMemo(() => makeWoodGrainTexture(2, 1), []);
  useEffect(() => () => benchWoodTex.dispose(), [benchWoodTex]);
  return (
    <group>
      <ParabolGate timeOfDay={timeOfDay} />
      <C1Building timeOfDay={timeOfDay} />
      <ILoveBK isNight={isNight} />
      <LibraryBuilding timeOfDay={timeOfDay} />
      <TienLake />
      <C9Building timeOfDay={timeOfDay} />
      <WhiteRock />
      <C1Fountain />
      <TranDaiNghiaSquare />
      <C2Building isNight={isNight} />
      <DaiCoVietGate />
      {/* Cây + ghế dọc đường tình yêu (không dùng để che lỗi hình khối). */}
      {LOVE_ROAD_TREES.map((t, i) => (
        <ImprovedTree key={`love-tree-${i}`} x={t.x} z={t.z} />
      ))}
      {LOVE_ROAD_BENCHES.map((b, i) => (
        <SimpleBench key={`love-bench-${i}`} x={b.x} z={b.z} woodTex={benchWoodTex} />
      ))}
    </group>
  );
}