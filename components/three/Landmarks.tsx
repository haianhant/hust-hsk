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

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  I_LOVE_BK,
  LOVE_ROAD_BENCHES,
  LOVE_ROAD_TREES,
  MONUMENT,
  TRAN_DAI_NGHIA_GATE,
  WHITE_ROCK,
} from '../../lib/campus';
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
function SimpleBench({ x, z, rotationY = 0 }: { x: number; z: number; rotationY?: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={rotationY}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.8, 0.12, 0.55]} />
        <meshStandardMaterial color={BENCH_WOOD} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.78, -0.24]} castShadow>
        <boxGeometry args={[1.8, 0.55, 0.1]} />
        <meshStandardMaterial color={BENCH_WOOD} roughness={0.9} />
      </mesh>
      {[-0.8, 0.8].map((dx) => (
        <mesh key={dx} position={[dx, 0.22, 0]}>
          <boxGeometry args={[0.08, 0.45, 0.5]} />
          <meshStandardMaterial color={BENCH_IRON} roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

// --- Logo "I LOVE BK" đúng hình: I trắng + tim đỏ + BK trắng, bệ đen ---------
function ILoveBK() {
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
  useEffect(() => () => heartGeo.dispose(), [heartGeo]);

  return (
    <group position={[I_LOVE_BK.center.x, 0, I_LOVE_BK.center.z]}>
      {/* Bệ đen thấp. */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.6, 0.5, 1.2]} />
        <meshStandardMaterial color={PLINTH_BLACK} roughness={0.85} />
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
        <meshStandardMaterial color={HUST_RED} roughness={0.6} />
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

      {/* Bia tượng đài: cẩm thạch trắng + chữ khắc đỏ. KHÔNG dựng pho tượng
          "mũ cối trên sách mở" — chưa có ảnh toàn cảnh (reference-visual §5). */}
      <group position={[MONUMENT.center.x, 0, MONUMENT.center.z]}>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.4, 3]} />
          <meshStandardMaterial color={MARBLE} roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.9, 0]} castShadow>
          <boxGeometry args={[0.5, 3, 2.2]} />
          <meshStandardMaterial color={MARBLE} roughness={0.8} />
        </mesh>
        {/* Tấm nghiêng thấp hơn, tựa vào chân bia. */}
        <mesh position={[-0.75, 0.65, 0]} rotation-z={0.45} castShadow>
          <boxGeometry args={[0.25, 1.4, 1.6]} />
          <meshStandardMaterial color={MARBLE} roughness={0.8} />
        </mesh>
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

export default function Landmarks() {
  return (
    <group>
      <ParabolGate />
      <C1Building />
      <ILoveBK />
      <LibraryBuilding />
      <TienLake />
      <C9Building />
      <WhiteRock />
      <TranDaiNghiaSquare />
      {/* Cây + ghế dọc đường tình yêu (không dùng để che lỗi hình khối). */}
      {LOVE_ROAD_TREES.map((t, i) => (
        <ImprovedTree key={`love-tree-${i}`} x={t.x} z={t.z} />
      ))}
      {LOVE_ROAD_BENCHES.map((b, i) => (
        <SimpleBench key={`love-bench-${i}`} x={b.x} z={b.z} />
      ))}
    </group>
  );
}