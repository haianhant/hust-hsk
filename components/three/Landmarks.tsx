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

// --- Logo "I LOVE BK" đúng hình: I trắng + tim đỏ + BK trắng, bệ đen ---------
function ILoveBK({ isNight = false }: { isNight?: boolean }) {
  const heartGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.35);
    s.bezierCurveTo(0, 0.62, -0.55, 0.62, -0.55, 0.15);
    s.bezierCurveTo(-0.55, -0.25, 0, -0.55, 0, -0.78);
    s.bezierCurveTo(0, -0.55, 0.55, -0.25, 0.55, 0.15);
    s.bezierCurveTo(0.55, 0.62, 0, 0.62, 0, 0.35);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.45, bevelEnabled: false });
    g.translate(0, 0, -0.225);
    return g;
  }, []);
  const granitePbr = useMemo(() => makeGraniteStoneTexture(3, 1), []);
  useEffect(() => () => {
    heartGeo.dispose();
    granitePbr.map.dispose();
    granitePbr.bumpMap.dispose();
  }, [heartGeo, granitePbr]);

  return (
    <group position={[I_LOVE_BK.center.x, 0, I_LOVE_BK.center.z]}>
      {/* Bệ đá granite đen bóng thấp. */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.6, 0.5, 1.2]} />
        <meshStandardMaterial
          color={PLINTH_BLACK}
          map={granitePbr.map}
          bumpMap={granitePbr.bumpMap}
          bumpScale={0.01}
          roughness={0.55}
          metalness={0.12}
        />
      </mesh>
      <LabelPlane
        textureKey="letter-i"
        canvasW={256}
        canvasH={256}
        draw={drawLetterI}
        size={[0.8, 1.9]}
        position={[-2.2, 1.5, 0.62]}
      />
      <mesh geometry={heartGeo} position={[-0.9, 1.55, 0.3]} scale={[1.35, 1.35, 1]} castShadow>
        <meshStandardMaterial
          color={HUST_RED}
          emissive={isNight ? '#FF2A36' : '#000000'}
          emissiveIntensity={isNight ? 0.52 : 0}
          roughness={0.45}
          metalness={0.08}
        />
      </mesh>
      <LabelPlane
        textureKey="letter-bk"
        canvasW={512}
        canvasH={256}
        draw={drawLetterBK}
        size={[1.9, 1.9]}
        position={[1.05, 1.5, 0.62]}
      />
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
  ctx.fillStyle = '#DCDCD6';
  ctx.fillRect(0, 0, 512, 512);
  let seed = 20260808;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  // Mảng loang xám/be nhạt.
  for (let i = 0; i < 28; i++) {
    const x = rnd() * 512;
    const y = rnd() * 512;
    const r = 20 + rnd() * 55;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tone = rnd() > 0.5 ? '120,118,105' : '255,255,250';
    g.addColorStop(0, `rgba(${tone},${0.05 + rnd() * 0.08})`);
    g.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Hạt đá nhỏ + lỗ sần.
  for (let i = 0; i < 2600; i++) {
    const v = 90 + Math.floor(rnd() * 110);
    ctx.fillStyle = `rgba(${v},${v},${v - 6},${0.08 + rnd() * 0.18})`;
    ctx.beginPath();
    ctx.arc(rnd() * 512, rnd() * 512, 0.5 + rnd() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = `rgba(70,70,66,${0.2 + rnd() * 0.2})`;
    ctx.beginPath();
    ctx.arc(rnd() * 512, rnd() * 512, 0.6 + rnd() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.3, 0.3);
  tex.anisotropy = 4;
  return tex;
}

function WhiteRock() {
  // Đường viền mặt trước: bè ngang, mép trên lượn sóng nhẹ, vai bo tròn.
  const rockGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-2.55, 0.1);
    s.splineThru([
      new THREE.Vector2(-2.62, 0.85),
      new THREE.Vector2(-2.45, 1.55),
      new THREE.Vector2(-2.18, 2.02),
      new THREE.Vector2(-1.65, 2.32),
      new THREE.Vector2(-1.05, 2.48),
      new THREE.Vector2(-0.45, 2.36),
      new THREE.Vector2(0.15, 2.54),
      new THREE.Vector2(0.75, 2.4),
      new THREE.Vector2(1.35, 2.5),
      new THREE.Vector2(1.88, 2.28),
      new THREE.Vector2(2.28, 1.92),
      new THREE.Vector2(2.52, 1.38),
      new THREE.Vector2(2.58, 0.75),
      new THREE.Vector2(2.48, 0.22),
      new THREE.Vector2(1.8, 0.06),
      new THREE.Vector2(0, 0.02),
      new THREE.Vector2(-1.8, 0.08),
    ]);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 1.7,
      bevelEnabled: true,
      bevelThickness: 0.16,
      bevelSize: 0.14,
      bevelSegments: 3,
      curveSegments: 10,
    });
    g.translate(0, 0, -0.85); // mặt trước z ≈ +1,01, mặt sau z ≈ −1,01
    // Biến dạng sin liên tục theo vị trí (không nứt mép): mảng lồi lõm
    // ±0,045 m; mặt trước giảm một nửa để giữ phẳng vùng chữ.
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const front = z > 0.9 ? 0.5 : 1;
      const dx = 0.045 * Math.sin(2.3 * y + 1.7) * Math.sin(1.9 * z + 0.4) * front;
      const dy = 0.04 * Math.sin(1.7 * x + 0.9) * Math.sin(2.6 * z + 2.1) * front;
      const dz = 0.03 * Math.sin(3.1 * x + 0.6) * Math.sin(2.7 * y + 1.2) * front;
      pos.setXYZ(i, x + dx, y + dy, z + dz);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const rockTex = useMemo(() => makeRockTexture(), []);
  useEffect(() => () => {
    rockGeo.dispose();
    rockTex.dispose();
  }, [rockGeo, rockTex]);

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
      {/* Đất sẫm dưới chân + bóng tiếp xúc (đá không lơ lửng). */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[5.5, 0.1, 2.1]} />
        <meshStandardMaterial color="#6B6258" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.11, 0]}>
        <planeGeometry args={[5.7, 2.3]} />
        <meshStandardMaterial color="#1A1A1A" transparent opacity={0.32} roughness={1} />
      </mesh>
      {/* Tảng đá: chân chìm 0,06 m vào đất, mặt trước hướng nam (+Z). */}
      <mesh geometry={rockGeo} position={[0, 0.06, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={rockTex} bumpMap={rockTex} bumpScale={0.02} roughness={1} />
      </mesh>
      {/* Chữ đen 2 dòng áp sát mặt đá (mặt trước z ≈ 1,01; chữ ở 1,09). */}
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

  // Đặt ở (-78, -36.5), phía bắc Khối đá trắng (-78, -31), hoàn toàn ngoài đường đi và chặng leg2
  return (
    <group position={[-78, 0, -36.5]}>
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

  // Đặt ở (-86, 0, -22), trục dài theo hướng Bắc–Nam (size 7.5 × 15 m), mặt chính hướng Đông (+X) ra vườn hoa C1
  return (
    <group position={[-86, 0, -22]} rotation-y={Math.PI / 2}>
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
    <group position={[-58, 0, -73.5]}>
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