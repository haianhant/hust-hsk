// ---------------------------------------------------------------------------
// features/campus/landscape/C1SquareLandmarks.tsx — Các công trình cảnh quan
// Quảng trường C1: Ghế gỗ SimpleBench, Cụm chữ 3D "I ❤ BK", Khối đá trắng
// nguyên khối 3D (WhiteRock) & Đài phun nước C1 (C1Fountain)
// Module IDs: landscape.i-love-bk, landscape.white-rock, landscape.c1-fountain
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { C1_FOUNTAIN, I_LOVE_BK, WHITE_ROCK } from '../world-data';
import { LabelPlane, drawRockInscription } from '../../../components/three/TextPlate';
import { makeGraniteStoneTexture } from '../../../components/three/materials';

const HUST_RED = '#E8202A';
const PLINTH_BLACK = '#1A1A1A';
const BANK_RIM = '#B9B9B0';
const BENCH_WOOD = '#7A5230';
const BENCH_IRON = '#1A1A1A';

export function SimpleBench({
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
export function ILoveBK({ isNight = false }: { isNight?: boolean }) {
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

export function makeRockTexture(): THREE.CanvasTexture {
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

export function WhiteRock() {
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

export function C1Fountain() {
  const sprayRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (!sprayRef.current) return;
    const t = state.clock.elapsedTime;
    sprayRef.current.scale.y = 0.92 + Math.sin(t * 4.2) * 0.08;
    sprayRef.current.rotation.y = t * 0.6;
  });

  // Đặt chính tâm trục đối xứng Quảng trường C1 (-58, -31.2) giữa I ❤ BK và Khối đá trắng theo đúng https://hustmap.com/
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
