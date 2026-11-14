// ---------------------------------------------------------------------------
// LibraryBuilding.tsx — Thư viện Tạ Quang Bửu (Tái thiết kế mặt ngoài đồ sộ &
// chuẩn xác theo ảnh thực tế 1308122022.jpg, untitled137.png & tham-khao/thu-vien/).
//
// ĐIỂM CỐT LÕI KIẾN TRÚC THỰC TẾ:
//   1. Quy mô đồ sộ (~37.000 m²):
//      - Khối tháp chính 10 tầng chia 3 nhịp đứng rộng 26,4 m (x = 25,6..52,0,
//        mái đua chữ T rộng 27,8 m), chiều sâu lớn 23,2 m (z = 26,8..50,0).
//      - Khối đế 2 tầng trải rộng 26,0 m (x = 25,8..51,8) gồm khối sảnh trung tâm
//        (x = 29,8..46,2 = 16,4 m) kết hợp hai cánh phòng đọc thấp tầng hai bên.
//   2. KHÔNG CÓ mái hiên thấp nhô ra phía trước che khuất Đồng hồ & Biển tên:
//      - Toàn bộ mặt đứng tầng 2–3 của khối đế trung tâm (y = 5,85..11,75 m) vươn
//        thẳng ra đặt trực tiếp lên hàng cột trụ tròn xám bạc mặt trước (z = 19,65).
//      - Ở chính giữa khối đế (x = 38,0) là khoang cổng vòm chữ U nâng trần (y = 6,32),
//        bên trên đặt ĐỒNG HỒ TRÒN (x = 38, y = 7,9, z = 19,28, r = 1,35 m) nổi phẳng
//        ở mặt ngoài cùng — đứng ngay chân bậc tam cấp nhìn ngước lên vẫn thấy trọn
//        100% mặt đồng hồ và cụm 5 thanh lam xanh dương phía trên!
//      - Hai bên đồng hồ là 2 cụm lam chắn nắng ngang màu xám bạc (y = 6,15..8,85).
//      - Phía trên cụm lam bên phải (khi nhìn từ sân Bắc vào Nam, x = 32,95) là mảng
//        tường trán trắng phẳng hoàn toàn (y = 8,98..11,42), gắn nổi biển chữ vàng 2 dòng
//        "THƯ VIỆN / TẠ QUANG BỬU" tại z = 19,25 — không bị bất kỳ gờ mái hay thanh
//        lam nào cắt ngang hay che khuất!
//   3. Sảnh cột thông thoáng & cửa kính tự động:
//      - Hàng cột trụ tròn bọc nhôm xám bạc (z = 19,65 & z = 22,8) đỡ trực tiếp khối đế;
//        vách cửa kính tự động đặt tại z = 23,62 khớp sát hộp va chạm khối đế (minZ = 23,5).
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LIBRARY } from '../../lib/campus';
import { playerState, type TimeOfDay } from '../../lib/playerState';
import { ExtrudedText3D } from './Signage3D';
import { LabelPlane, drawClockFace } from './TextPlate';
import { makeGraniteStoneTexture, makeWeatheredConcreteTexture } from './materials';
import { ImprovedTree } from './Trees';

const LIB_WHITE = '#F3F5F8';
const LIB_GLASS = '#283645';
const LIB_BLUE = '#1E5AA8';
const SLAT = '#525C65';
const STONE = '#B8B8B0';
const COLUMN_GREY = '#8C96A0';
const ROOF_GREY = '#C8CCC9';
const INK = '#1A1A1A';
const DARK_BOX = '#3A3F45';
const INTERIOR_DARK = '#161B22';
const TRUNK = '#6B5138';
const LEAF = '#5D7D4A';
const LAWN = '#688E56';
const YARD_GREY = '#C9CAC4';
const HUST_RED = '#D22630';
const LAMP_BLACK = '#1A1A1A';
const LAMP_BALL = '#F5F5F0';
const BIN_GREEN = '#2E7D32';
const BENCH_WOOD = '#8A6B45';

const PLINTH = 0.6;
const FH = LIBRARY.floorHeight; // 3.25 m/tầng
const WING_TOP = PLINTH + 8.05 * FH; // 26.76 m (2 cánh 8 tầng thấp hơn khối giữa 10 tầng đúng 2 tầng, có mái đua phẳng rộng)
const CENTER_TOP = PLINTH + 10.15 * FH; // 33.59 m (khối giữa 10 tầng + loggia hàng cột đỉnh)
const PODIUM_FRONT_Z = 19.35;
const DOOR_WALL_Z = 23.62;
const bandY = (f: number) => PLINTH + f * FH + 1.92;

function LibTree({
  x,
  z,
  trunkH = 2,
  canopyR = 1.3,
  canopyY = 2.9,
  canopyColor = LEAF,
}: {
  x: number;
  z: number;
  trunkH?: number;
  canopyR?: number;
  canopyY?: number;
  canopyColor?: string;
}) {
  return (
    <ImprovedTree
      x={x}
      z={z}
      trunkH={trunkH}
      canopyR={canopyR}
      canopyY={canopyY}
      canopyColor={canopyColor}
    />
  );
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeFrondGeometry(len: number): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.15, 0);
  s.quadraticCurveTo(-0.13, len * 0.55, 0, len);
  s.quadraticCurveTo(0.13, len * 0.55, 0.15, 0);
  s.closePath();
  const g = new THREE.ShapeGeometry(s, 8);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setZ(i, 0.22 * len * (y / len) ** 2);
  }
  g.computeVertexNormals();
  return g;
}

function LibPalm({ x, z }: { x: number; z: number }) {
  const fronds = useMemo(() => {
    const rand = mulberry32(Math.round(x * 100) + Math.round(z * 100) * 7 + 11);
    return Array.from({ length: 10 }, (_, k) => ({
      az: (k / 10) * Math.PI * 2 + (rand() - 0.5) * 0.35,
      tilt: 0.88 + (k % 2) * 0.22 + rand() * 0.24,
      len: 1.65 + rand() * 0.48,
      shade: k % 2 === 0 ? LEAF : '#2F6B2F',
    }));
  }, [x, z]);
  const frondGeo = useMemo(() => makeFrondGeometry(1.9), []);
  useEffect(() => () => frondGeo.dispose(), [frondGeo]);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.9, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.19, 3.8, 10]} />
        <meshStandardMaterial color={TRUNK} roughness={0.92} />
      </mesh>
      {[0.7, 1.4, 2.1, 2.8, 3.4].map((ry) => (
        <mesh key={`ring-${ry}`} position={[0, ry, 0]}>
          <torusGeometry args={[0.165 - ry * 0.011, 0.012, 6, 12]} />
          <meshStandardMaterial color="#584738" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 4.12, 0]} castShadow>
        <cylinderGeometry args={[0.135, 0.125, 0.68, 10]} />
        <meshStandardMaterial color="#4A8B3B" roughness={0.78} />
      </mesh>
      {fronds.map((f, i) => (
        <group key={`frond-${i}`} position={[0, 4.42, 0]} rotation-y={f.az}>
          <mesh
            geometry={frondGeo}
            rotation-x={f.tilt}
            scale={[1, f.len / 1.9, 1]}
            castShadow
          >
            <meshStandardMaterial color={f.shade} roughness={0.85} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {[0.1, 2.2, 4.2].map((az, i) => (
        <group key={`spear-${i}`} position={[0, 4.44, 0]} rotation-y={az}>
          <mesh
            geometry={frondGeo}
            rotation-x={0.22}
            scale={[0.68, 0.58, 0.68]}
            castShadow
          >
            <meshStandardMaterial color="#589E44" roughness={0.82} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function LibLamp({
  x,
  z,
  balls = 5,
  isNight = false,
}: {
  x: number;
  z: number;
  balls?: 5 | 3;
  isNight?: boolean;
}) {
  const h = balls === 5 ? 3.2 : 2.5;
  const r = balls === 5 ? 0.14 : 0.12;
  const offsets =
    balls === 5
      ? [
          [0, 0.16, 0],
          [0.26, 0, 0],
          [-0.26, 0, 0],
          [0, 0, 0.26],
          [0, 0, -0.26],
        ]
      : [
          [0, 0.12, 0],
          [0.22, -0.04, 0.12],
          [-0.22, -0.04, 0.12],
        ];
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, h, 8]} />
        <meshStandardMaterial color={LAMP_BLACK} roughness={0.6} metalness={0.3} />
      </mesh>
      {offsets.map(([dx, dy, dz], i) => (
        <mesh key={`ball-${i}`} position={[dx, h + dy, dz]} castShadow>
          <sphereGeometry args={[r, 12, 10]} />
          <meshStandardMaterial
            color={LAMP_BALL}
            emissive={isNight ? '#FFE099' : '#000000'}
            emissiveIntensity={isNight ? 1.35 : 0}
            roughness={0.35}
          />
        </mesh>
      ))}
    </group>
  );
}

function LibBench({ x, z, rotationY = 0 }: { x: number; z: number; rotationY?: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={rotationY}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.5, 0.08, 1.8]} />
        <meshStandardMaterial color={BENCH_WOOD} roughness={0.85} />
      </mesh>
      <mesh position={[0.24, 0.75, 0]} rotation-z={-0.15} castShadow>
        <boxGeometry args={[0.08, 0.55, 1.8]} />
        <meshStandardMaterial color={BENCH_WOOD} roughness={0.85} />
      </mesh>
      {[-0.8, 0.8].map((dz) => (
        <mesh key={`leg-${dz}`} position={[0, 0.22, dz]}>
          <boxGeometry args={[0.4, 0.45, 0.08]} />
          <meshStandardMaterial color={BENCH_WOOD} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

const LETTER_SEGMENTS: Record<string, Array<[number, number, number, number]>> = {
  H: [
    [0, 0, 0.28, 1.8],
    [0.82, 0, 0.28, 1.8],
    [0.28, 0.76, 0.54, 0.28],
  ],
  U: [
    [0, 0.28, 0.28, 1.52],
    [0.82, 0.28, 0.28, 1.52],
    [0, 0, 1.1, 0.28],
  ],
  S: [
    [0, 1.52, 1.1, 0.28],
    [0, 0.76, 0.28, 0.76],
    [0, 0.76, 1.1, 0.28],
    [0.82, 0, 0.28, 0.76],
    [0, 0, 1.1, 0.28],
  ],
  T: [
    [0, 1.52, 1.1, 0.28],
    [0.41, 0, 0.28, 1.52],
  ],
};

function BlockLetter({
  letter,
  x,
  y,
  z,
  isNight = false,
}: {
  letter: string;
  x: number;
  y: number;
  z: number;
  isNight?: boolean;
}) {
  const segs = LETTER_SEGMENTS[letter] ?? [];
  return (
    <group position={[x, y, z]}>
      {segs.map(([dx, dy, w, h], i) => (
        <mesh key={`${letter}-${i}`} position={[dx + w / 2, dy + h / 2, 0]} castShadow>
          <boxGeometry args={[w, h, 0.5]} />
          <meshStandardMaterial
            color={HUST_RED}
            emissive={isNight ? '#FF3A44' : '#000000'}
            emissiveIntensity={isNight ? 0.55 : 0}
            roughness={0.45}
            metalness={0.15}
          />
        </mesh>
      ))}
    </group>
  );
}

// --- Biển tên vàng đồng 2 dòng "THƯ VIỆN / TẠ QUANG BỬU" chuẩn bố cục ảnh thu-vien-mat-tien-01.jpg ---
function drawLibraryNameTwoLine(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.shadowColor = 'rgba(42, 26, 4, 0.65)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  // Trong ảnh thật (thu-vien-mat-tien-01.jpg & thu-vien-cao-nhin-cheo-01.jpg), dòng "THƯ VIỆN"
  // căn thẳng mép trái ngay phía trên chữ "TẠ QUANG" của dòng "TẠ QUANG BỬU" chữ nổi vàng đồng.
  const leftX = w * 0.06;

  // Dòng 1: "THƯ VIỆN"
  ctx.font = '800 68px "Be Vietnam Pro", Arial, sans-serif';
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#5C3D06';
  ctx.strokeText('THƯ VIỆN', leftX, h * 0.28);
  const g1 = ctx.createLinearGradient(0, h * 0.1, 0, h * 0.45);
  g1.addColorStop(0, '#FDE047');
  g1.addColorStop(0.55, '#EAB308');
  g1.addColorStop(1, '#B47B09');
  ctx.fillStyle = g1;
  ctx.fillText('THƯ VIỆN', leftX, h * 0.28);

  // Dòng 2: "TẠ QUANG BỬU" cỡ lớn trải rộng
  ctx.font = '800 100px "Be Vietnam Pro", Arial, sans-serif';
  ctx.lineWidth = 7;
  ctx.strokeText('TẠ QUANG BỬU', leftX, h * 0.74);
  const g2 = ctx.createLinearGradient(0, h * 0.52, 0, h * 0.94);
  g2.addColorStop(0, '#FEF08A');
  g2.addColorStop(0.5, '#F59E0B');
  g2.addColorStop(1, '#B45309');
  ctx.fillStyle = g2;
  ctx.fillText('TẠ QUANG BỬU', leftX, h * 0.74);
  ctx.restore();
}

function drawOneLoveSlogan(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 54px "Be Vietnam Pro", Arial, sans-serif';
  ctx.fillStyle = '#F5F7FA';
  ctx.fillText('ONE LOVE. ONE FUTURE.', w / 2, h / 2);
}

function makeLibraryWindowTexture(): { map: THREE.CanvasTexture; lobbyBackdrop: THREE.CanvasTexture } {
  const size = 256;
  const cMap = document.createElement('canvas');
  cMap.width = size;
  cMap.height = size;
  const ctx = cMap.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, size * 0.28, size);
  grad.addColorStop(0, '#5B84AE');
  grad.addColorStop(0.34, '#365678');
  grad.addColorStop(0.7, '#21364C');
  grad.addColorStop(1, '#2D4761');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Ánh đèn trần phòng đọc và giá sách mờ sâu bên trong kính (Pseudo-Interior)
  const ceilGlow = ctx.createLinearGradient(0, 8, 0, 96);
  ceilGlow.addColorStop(0, 'rgba(255, 241, 206, 0.34)');
  ceilGlow.addColorStop(0.55, 'rgba(255, 232, 184, 0.12)');
  ceilGlow.addColorStop(1, 'rgba(255, 232, 184, 0)');
  ctx.fillStyle = ceilGlow;
  ctx.fillRect(10, 8, size - 20, 90);
  ctx.fillStyle = 'rgba(255, 248, 224, 0.42)';
  ctx.fillRect(28, 16, 76, 5);
  ctx.fillRect(152, 16, 76, 5);

  // Rèm lá ngang che nắng 1/3 trên ô cửa thư viện
  ctx.fillStyle = 'rgba(226, 236, 248, 0.24)';
  for (let y = 12; y < 82; y += 7) {
    ctx.fillRect(10, y, size / 2 - 16, 3);
  }
  ctx.fillStyle = 'rgba(226, 236, 248, 0.16)';
  for (let y = 12; y < 56; y += 7) {
    ctx.fillRect(size / 2 + 6, y, size / 2 - 16, 3);
  }

  // Bóng kệ sách & bàn đọc thấp ở nửa dưới khung kính
  ctx.fillStyle = 'rgba(18, 30, 44, 0.42)';
  ctx.fillRect(18, 152, 74, 92);
  ctx.fillRect(154, 168, 78, 76);

  // Vệt phản chiếu bầu trời chéo sắc nét trên mặt kính
  const sheen = ctx.createLinearGradient(0, 0, size, size * 0.85);
  sheen.addColorStop(0, 'rgba(232, 245, 255, 0.34)');
  sheen.addColorStop(0.24, 'rgba(210, 234, 255, 0.18)');
  sheen.addColorStop(0.45, 'rgba(210, 234, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(106, 0);
  ctx.lineTo(24, size);
  ctx.lineTo(0, size);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#6D7A88';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, size - 10, size - 10);

  ctx.fillStyle = '#73808E';
  ctx.fillRect(size / 2 - 5, 5, 10, size - 10);
  ctx.fillRect(5, Math.round(size * 0.34) - 4, size - 10, 8);

  const map = new THREE.CanvasTexture(cMap);
  map.colorSpace = THREE.SRGBColorSpace;

  // Phông chiều sâu Đại sảnh Tạ Quang Bửu nhìn xuyên qua vách kính sảnh chính
  const lCanvas = document.createElement('canvas');
  lCanvas.width = 512;
  lCanvas.height = 256;
  const lCtx = lCanvas.getContext('2d')!;
  const lGrad = lCtx.createLinearGradient(0, 0, 0, 256);
  lGrad.addColorStop(0, '#5E462E');
  lGrad.addColorStop(0.32, '#8F6A43');
  lGrad.addColorStop(0.7, '#C49A68');
  lGrad.addColorStop(1, '#6E563B');
  lCtx.fillStyle = lGrad;
  lCtx.fillRect(0, 0, 512, 256);

  // Đèn chùm thông tầng & hành lang tầng lửng ấm áp bên trong đại sảnh
  const halo = lCtx.createRadialGradient(256, 62, 10, 256, 62, 190);
  halo.addColorStop(0, 'rgba(255, 244, 204, 0.95)');
  halo.addColorStop(0.45, 'rgba(255, 214, 130, 0.48)');
  halo.addColorStop(1, 'rgba(255, 196, 102, 0)');
  lCtx.fillStyle = halo;
  lCtx.fillRect(0, 0, 512, 256);

  // Dải lan can gỗ tầng 2 & hàng cột tròn đại sảnh mờ phía xa
  lCtx.fillStyle = 'rgba(92, 56, 30, 0.65)';
  lCtx.fillRect(0, 96, 512, 14);
  for (const cx of [68, 152, 360, 444]) {
    lCtx.fillStyle = 'rgba(236, 228, 214, 0.52)';
    lCtx.fillRect(cx - 10, 18, 20, 220);
  }
  // Bóng tượng & bệ trung tâm đại sảnh
  lCtx.fillStyle = 'rgba(58, 38, 24, 0.55)';
  lCtx.fillRect(236, 128, 40, 108);

  const lobbyBackdrop = new THREE.CanvasTexture(lCanvas);
  lobbyBackdrop.colorSpace = THREE.SRGBColorSpace;
  return { map, lobbyBackdrop };
}

function makeRedPaverTexture(): { map: THREE.CanvasTexture } {
  const size = 128;
  const cMap = document.createElement('canvas');
  cMap.width = size;
  cMap.height = size;
  const ctx = cMap.getContext('2d')!;

  ctx.fillStyle = '#8A4A32';
  ctx.fillRect(0, 0, size, size);

  const rows = 8;
  const cols = 4;
  const bh = size / rows;
  const bw = size / cols;
  let seed = 20061010;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (bw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * bw + offset;
      const y = r * bh;
      const delta = Math.round((rnd() - 0.5) * 18);
      ctx.fillStyle = `rgb(${138 + delta}, ${74 + Math.round(delta * 0.6)}, ${50 + Math.round(delta * 0.5)})`;
      ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
      ctx.strokeStyle = 'rgba(48, 24, 16, 0.55)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
    }
  }

  const map = new THREE.CanvasTexture(cMap);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(6, 3);
  return { map };
}

function GlassBox({
  p,
  s,
  mat,
}: {
  p: [number, number, number];
  s: [number, number, number];
  mat?: THREE.MeshStandardMaterial;
}) {
  return (
    <mesh position={p} material={mat}>
      <boxGeometry args={s} />
      {!mat && (
        <meshStandardMaterial
          color={LIB_GLASS}
          emissive={LIB_GLASS}
          emissiveIntensity={0.45}
          roughness={0.18}
          metalness={0.32}
        />
      )}
    </mesh>
  );
}

function WhiteBox({
  p,
  s,
  shadow = false,
  mat,
}: {
  p: [number, number, number];
  s: [number, number, number];
  shadow?: boolean;
  mat?: THREE.MeshStandardMaterial;
}) {
  return (
    <mesh position={p} castShadow={shadow} receiveShadow material={mat}>
      <boxGeometry args={s} />
      {!mat && <meshStandardMaterial color={LIB_WHITE} roughness={0.86} />}
    </mesh>
  );
}

export function LibraryBuilding({ timeOfDay = 'day' }: { timeOfDay?: TimeOfDay }) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset';
  const concretePbr = useMemo(() => makeWeatheredConcreteTexture(4, 8), []);
  const granitePbr = useMemo(() => makeGraniteStoneTexture(4, 4), []);
  const windowPbr = useMemo(() => makeLibraryWindowTexture(), []);
  const paverPbr = useMemo(() => makeRedPaverTexture(), []);
  const glassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#DCEAF8',
        map: windowPbr.map,
        emissive: new THREE.Color(LIB_GLASS),
        emissiveIntensity: 0.28,
        roughness: 0.15,
        metalness: 0.42,
        envMapIntensity: 1.25,
      }),
    [windowPbr],
  );
  const porticoGlassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#D8ECFF',
        map: windowPbr.map,
        transparent: true,
        opacity: isNight ? 0.56 : 0.72,
        roughness: 0.12,
        metalness: 0.48,
        envMapIntensity: 1.35,
      }),
    [windowPbr, isNight],
  );
  const whiteWallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: LIB_WHITE,
        map: concretePbr.map,
        bumpMap: concretePbr.bumpMap,
        bumpScale: 0.01,
        roughness: 0.84,
      }),
    [concretePbr],
  );

  const clockR = LIBRARY.clock.radius; // 1.35 m
  const clock = LIBRARY.clock; // (38, 7.9, 19.28)

  const hourHandRef = useRef<THREE.Group>(null);
  const minuteHandRef = useRef<THREE.Group>(null);
  const secondHandRef = useRef<THREE.Group>(null);
  const leftDoorRef = useRef<THREE.Group>(null);
  const rightDoorRef = useRef<THREE.Group>(null);
  const doorOpenRef = useRef(0);

  useFrame((_, rawDelta) => {
    const hanoiMs = Date.now() + 7 * 3600 * 1000;
    const d = new Date(hanoiMs);
    const sec = d.getUTCSeconds() + d.getUTCMilliseconds() / 1000;
    const min = d.getUTCMinutes() + sec / 60;
    const hr = (d.getUTCHours() % 12) + min / 60;
    if (hourHandRef.current) hourHandRef.current.rotation.z = -(hr / 12) * Math.PI * 2;
    if (minuteHandRef.current) minuteHandRef.current.rotation.z = -(min / 60) * Math.PI * 2;
    if (secondHandRef.current) secondHandRef.current.rotation.z = -(sec / 60) * Math.PI * 2;

    const px = playerState.pos.x;
    const pz = playerState.pos.z;
    const nearPorch =
      !playerState.inLibraryLobby &&
      !playerState.inClassroom &&
      px >= 32.5 &&
      px <= 43.5 &&
      pz >= 17.5 &&
      pz <= 25.0;
    const targetOpen = nearPorch ? 1 : 0;
    const dt = Math.min(rawDelta, 0.05);
    doorOpenRef.current += (targetOpen - doorOpenRef.current) * Math.min(1, dt * 6);
    const slideOffset = doorOpenRef.current * 1.45;
    if (leftDoorRef.current) leftDoorRef.current.position.x = 37.1 - slideOffset;
    if (rightDoorRef.current) rightDoorRef.current.position.x = 38.9 + slideOffset;
  });

  const clockTex = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) drawClockFace(ctx, 512, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useEffect(
    () => () => {
      clockTex.dispose();
      concretePbr.map.dispose();
      concretePbr.bumpMap.dispose();
      granitePbr.map.dispose();
      granitePbr.bumpMap.dispose();
      windowPbr.map.dispose();
      windowPbr.lobbyBackdrop.dispose();
      paverPbr.map.dispose();
      glassMat.dispose();
      porticoGlassMat.dispose();
      whiteWallMat.dispose();
    },
    [clockTex, concretePbr, granitePbr, windowPbr, paverPbr, glassMat, porticoGlassMat, whiteWallMat],
  );

  // 7 tầng lam chắn nắng ngang bê tông/nhôm sáng màu nhô sâu 0,50 m ra phía trước & ôm vòng qua 2 góc khối đế
  // (y = 6.32..8.72), nhường toàn bộ trán tường trắng phẳng phía trên (y = 8.95..11.45) cho biển chữ vàng!
  const slatY = Array.from({ length: 7 }, (_, i) => 6.32 + i * 0.4);
  // 5 thanh lam xanh dương đặc trưng phía trên đồng hồ (y = 9.48..10.16)
  const blueSlatY = Array.from({ length: 5 }, (_, i) => 9.48 + i * 0.17);
  // 8 cột tròn bạc ở hành lang loggia tầng 10 khối giữa (rộng 15,6 m: x = 30.2..45.8)
  const topColX = Array.from({ length: 8 }, (_, i) => 31.35 + i * 1.9);
  // 7 cụm cửa sổ đôi mỗi tầng trên khối giữa rộng 15,6 m
  const centerGroupX = Array.from({ length: 7 }, (_, i) => 31.7 + i * 2.1);
  // 4 cột trụ tròn mặt ngoài (z = 19,65) đỡ trực tiếp mặt tiền khối đế + 2 cột hàng trong (z = 22,8)
  const frontPorchColX = [30.6, 34.8, 41.2, 45.4];
  const innerPorchColX = [30.6, 45.4];

  return (
    <group>
      {/* ============ 1. BỆ ĐÁ GRANITE ĐỒ SỘ (y = 0..0.6 m) ============ */}
      <mesh position={[38, 0.3, 24.85]} receiveShadow>
        <boxGeometry args={[16.4, 0.6, 11.3]} />
        <meshStandardMaterial
          color={STONE}
          map={granitePbr.map}
          bumpMap={granitePbr.bumpMap}
          bumpScale={0.01}
          roughness={0.85}
        />
      </mesh>
      <mesh position={[38.8, 0.3, 39.4]} receiveShadow>
        <boxGeometry args={[26.4, 0.6, 21.6]} />
        <meshStandardMaterial
          color={STONE}
          map={granitePbr.map}
          bumpMap={granitePbr.bumpMap}
          bumpScale={0.01}
          roughness={0.85}
        />
      </mesh>

      {/* ============ 2. KHỐI THÁP CHÍNH 10 TẦNG + HAI CÁNH 8 TẦNG LÙI SAU CÓ MÁI ĐUA RỘNG ============ */}
      {/* Khối giữa 10 tầng nhô trước (x = 30.2..45.8 = 15,6 m; z = 26.8..50.0 = 23,2 m; y = 0.6..33.59 m) */}
      <WhiteBox
        p={[38.0, (PLINTH + CENTER_TOP) / 2, 38.4]}
        s={[15.6, CENTER_TOP - PLINTH, 23.2]}
        shadow
        mat={whiteWallMat}
      />
      {/* Hai trụ lõi thang bộ/thang máy vươn cao ở hai đầu khối giữa (khớp ảnh thu-vien-cao-nhin-cheo-01.jpg) */}
      <WhiteBox p={[31.5, 34.35, 28.4]} s={[2.6, 1.55, 3.2]} shadow mat={whiteWallMat} />
      <WhiteBox p={[44.5, 34.35, 28.4]} s={[2.6, 1.55, 3.2]} shadow mat={whiteWallMat} />

      {/* Cánh Tây 8 tầng lùi sau (x = 25.6..29.45 = 3,85 m; z = 28.8..50.0 = 21,2 m; tầng 1 thụt cột xám) */}
      <WhiteBox
        p={[27.525, (3.85 + WING_TOP) / 2, 39.4]}
        s={[3.85, WING_TOP - 3.85, 21.2]}
        shadow
        mat={whiteWallMat}
      />
      <mesh position={[27.7, 2.225, 39.4]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 3.25, 20.6]} />
        <meshStandardMaterial color="#AEB6BF" roughness={0.78} />
      </mesh>
      {[29.2, 35.8, 42.4, 49.0].map((cz) => (
        <mesh key={`lib-west-wing-col-${cz}`} position={[25.85, 2.225, cz]} castShadow>
          <cylinderGeometry args={[0.24, 0.24, 3.25, 16]} />
          <meshStandardMaterial color={COLUMN_GREY} roughness={0.48} metalness={0.32} />
        </mesh>
      ))}

      {/* Cánh Đông 8 tầng mở rộng lùi sau (x = 46.55..52.0 = 5,45 m; z = 28.8..50.0 = 21,2 m) */}
      <WhiteBox
        p={[49.275, (3.85 + WING_TOP) / 2, 39.4]}
        s={[5.45, WING_TOP - 3.85, 21.2]}
        shadow
        mat={whiteWallMat}
      />
      <mesh position={[49.1, 2.225, 39.4]} castShadow receiveShadow>
        <boxGeometry args={[5.0, 3.25, 20.6]} />
        <meshStandardMaterial color="#AEB6BF" roughness={0.78} />
      </mesh>
      {[29.2, 35.8, 42.4, 49.0].map((cz) => (
        <mesh key={`lib-east-wing-col-${cz}`} position={[51.75, 2.225, cz]} castShadow>
          <cylinderGeometry args={[0.24, 0.24, 3.25, 16]} />
          <meshStandardMaterial color={COLUMN_GREY} roughness={0.48} metalness={0.32} />
        </mesh>
      ))}

      {/* 2 Khe kính đứng chạy suốt chiều cao khớp nối khối tháp 10 tầng và hai cánh 8 tầng (Tây & Đông) */}
      {[29.82, 46.18].map((slotX) => (
        <group key={`lib-stair-slot-${slotX}`}>
          <GlassBox
            p={[slotX, (PLINTH + WING_TOP) / 2, 29.35]}
            s={[0.82, WING_TOP - PLINTH, 1.4]}
            mat={glassMat}
          />
          {[-0.24, 0.24].map((dx) => (
            <mesh key={`lib-slot-mull-${slotX}-${dx}`} position={[slotX + dx, (PLINTH + WING_TOP) / 2, 28.64]}>
              <boxGeometry args={[0.045, WING_TOP - PLINTH, 0.06]} />
              <meshStandardMaterial color="#CBD5E1" roughness={0.38} metalness={0.45} />
            </mesh>
          ))}
          {Array.from({ length: 8 }).map((_, f) => (
            <mesh key={`lib-slot-spandrel-${slotX}-${f}`} position={[slotX, PLINTH + (f + 1) * FH - 0.1, 28.64]}>
              <boxGeometry args={[0.84, 0.18, 0.06]} />
              <meshStandardMaterial color="#E2E8F0" roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}

      {/* --- Mặt BẮC khối tháp 10 tầng (tầng 4..9: 6 hàng × 7 băng cửa sổ ngang chuẩn ảnh thật) --- */}
      {[3, 4, 5, 6, 7, 8].map((f) => (
        <group key={`lib-c-n-${f}`}>
          {centerGroupX.map((x) => (
            <group key={`lib-c-n-${f}-${x}`}>
              <GlassBox p={[x, bandY(f), 26.74]} s={[1.66, 1.56, 0.08]} mat={glassMat} />
              <WhiteBox p={[x, bandY(f), 26.71]} s={[0.08, 1.58, 0.1]} mat={whiteWallMat} />
            </group>
          ))}
        </group>
      ))}
      {/* Tầng 10 khối giữa: Hàng cột tròn thông tầng (colonnade loggia) + dải diềm xanh dương */}
      <GlassBox p={[38.0, 31.35, 26.92]} s={[14.2, 2.75, 0.1]} mat={glassMat} />
      {topColX.map((x) => (
        <mesh key={`lib-top-col-${x}`} position={[x, 31.35, 26.74]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 2.8, 16]} />
          <meshStandardMaterial color={COLUMN_GREY} roughness={0.48} metalness={0.34} />
        </mesh>
      ))}
      <mesh position={[38.0, 33.15, 26.68]}>
        <boxGeometry args={[15.72, 0.44, 0.22]} />
        <meshStandardMaterial color={LIB_BLUE} roughness={0.82} />
      </mesh>

      {/* Cửa sổ mặt Bắc hai cánh 8 tầng (tầng 2..8: băng cửa sổ ngang chạy dài + tầng áp mái dưới mái đua) */}
      {[1, 2, 3, 4, 5, 6].map((f) => (
        <group key={`lib-w-n-${f}`}>
          <GlassBox p={[27.52, bandY(f), 28.74]} s={[3.15, 1.52, 0.08]} mat={glassMat} />
          <GlassBox p={[49.28, bandY(f), 28.74]} s={[4.65, 1.52, 0.08]} mat={glassMat} />
          {[26.72, 28.32].map((x) => (
            <WhiteBox key={`lib-wn-mw-${f}-${x}`} p={[x, bandY(f), 28.71]} s={[0.07, 1.54, 0.1]} mat={whiteWallMat} />
          ))}
          {[47.8, 49.28, 50.76].map((x) => (
            <WhiteBox key={`lib-wn-me-${f}-${x}`} p={[x, bandY(f), 28.71]} s={[0.07, 1.54, 0.1]} mat={whiteWallMat} />
          ))}
        </group>
      ))}
      <GlassBox p={[27.52, 25.45, 28.74]} s={[3.15, 1.15, 0.08]} mat={glassMat} />
      <GlassBox p={[49.28, 25.45, 28.74]} s={[4.65, 1.15, 0.08]} mat={glassMat} />

      {/* --- Mặt NAM (z = 50.0) & HAI MẶT BÊN ĐÔNG/TÂY sâu 21,2 m --- */}
      {Array.from({ length: 10 }).map((_, f) => {
        const wy = f === 9 ? 30.95 : bandY(f);
        const wh = f === 9 ? 1.25 : 1.54;
        return (
          <group key={`lib-rear-center-${f}`}>
            <GlassBox p={[38.0, wy, 50.05]} s={[14.4, wh, 0.08]} mat={glassMat} />
          </group>
        );
      })}
      {[1, 2, 3, 4, 5, 6, 7].map((f) => {
        const wy = f === 7 ? 25.45 : bandY(f);
        const wh = f === 7 ? 1.15 : 1.52;
        return (
          <group key={`lib-rear-wings-${f}`}>
            <GlassBox p={[27.52, wy, 50.05]} s={[3.1, wh, 0.08]} mat={glassMat} />
            <GlassBox p={[49.28, wy, 50.05]} s={[4.6, wh, 0.08]} mat={glassMat} />
            <GlassBox p={[25.55, wy, 39.4]} s={[0.08, wh, 18.8]} mat={glassMat} />
            <GlassBox p={[52.05, wy, 39.4]} s={[0.08, wh, 18.8]} mat={glassMat} />
          </group>
        );
      })}
      <mesh position={[38.0, 33.15, 50.05]}>
        <boxGeometry args={[15.64, 0.44, 0.1]} />
        <meshStandardMaterial color={LIB_BLUE} roughness={0.82} />
      </mesh>

      {/* --- Mái đua phẳng rộng chữ T trên đỉnh hai cánh 8 tầng (y = 26.92 m, vươn rộng ~1,3 m ra ngoài) --- */}
      <WhiteBox p={[27.15, WING_TOP + 0.16, 39.4]} s={[5.4, 0.34, 22.8]} shadow mat={whiteWallMat} />
      <WhiteBox p={[49.65, WING_TOP + 0.16, 39.4]} s={[6.9, 0.34, 22.8]} shadow mat={whiteWallMat} />
      <mesh position={[38.0, 33.8, 38.4]} castShadow receiveShadow>
        <boxGeometry args={[16.5, 0.44, 24.0]} />
        <meshStandardMaterial color={ROOF_GREY} roughness={0.92} />
      </mesh>
      {[31.1, 31.8].map((x) => (
        <group key={`lib-ant-${x}`}>
          <mesh position={[x, 36.1, 28.4]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, 2.4, 8]} />
            <meshStandardMaterial color={INK} roughness={0.6} metalness={0.4} />
          </mesh>
          {[35.6, 36.4].map((y) => (
            <mesh key={`lib-ant-bar-${x}-${y}`} position={[x, y, 28.4]}>
              <boxGeometry args={[0.75, 0.05, 0.05]} />
              <meshStandardMaterial color={INK} roughness={0.6} metalness={0.4} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[38.0, 34.8, 40.0]} castShadow>
        <boxGeometry args={[8.4, 1.55, 6.2]} />
        <meshStandardMaterial color={LIB_WHITE} roughness={0.86} />
      </mesh>

      {/* ============ 3. KHỐI ĐẾ SẢNH 6 CỘT TRUNG TÂM (x = 29.8..46.2, z = 19.35..26.8) ============ */}
      {/* BỐ CỤC CHUẨN 100% ẢNH THẬT (thu-vien-mat-tien-01.jpg & thu-vien-cao-nhin-cheo-01.jpg):
          - KHÔNG CÓ mái hiên thấp nhô ra phía trước che khuất Đồng hồ hay Biển tên!
          - Mặt đứng khối đế đặt trực tiếp trên hàng cột trụ tròn bạc (z = 19.65).
          - Khoang giữa (x = 36.15..39.85 = 3,7 m) giật cấp chữ U ngược cả cạnh dưới (y = 6.35 m)
            lẫn cạnh trên (y = 10.48 m), kẹp giữa hai mảng tường trán cao (y = 11.55 m) viền diềm xanh dương. */}
      <WhiteBox p={[32.975, 8.7, 23.15]} s={[6.35, 5.7, 7.6]} shadow mat={whiteWallMat} />
      <WhiteBox p={[43.025, 8.7, 23.15]} s={[6.35, 5.7, 7.6]} shadow mat={whiteWallMat} />
      <WhiteBox p={[38.0, 8.42, 23.15]} s={[3.7, 4.14, 7.6]} shadow mat={whiteWallMat} />

      {/* Trần sảnh (soffit) phẳng sạch bên dưới khối đế + 8 đèn âm trần LED chiếu sáng thềm sảnh */}
      <mesh position={[32.975, 5.83, 21.5]}>
        <boxGeometry args={[6.3, 0.05, 4.2]} />
        <meshBasicMaterial color="#E2E4E0" />
      </mesh>
      <mesh position={[43.025, 5.83, 21.5]}>
        <boxGeometry args={[6.3, 0.05, 4.2]} />
        <meshBasicMaterial color="#E2E4E0" />
      </mesh>
      <mesh position={[38.0, 6.33, 21.5]}>
        <boxGeometry args={[3.68, 0.05, 4.2]} />
        <meshBasicMaterial color="#EAECE8" />
      </mesh>
      {[20.4, 22.5].map((lz) =>
        [31.8, 34.2, 41.8, 44.2].map((lx) => (
          <mesh key={`lib-porch-downlight-${lx}-${lz}`} position={[lx, 5.79, lz]} rotation-x={Math.PI / 2}>
            <circleGeometry args={[0.15, 16]} />
            <meshBasicMaterial color={isNight ? '#FFE599' : '#FFF8E7'} />
          </mesh>
        )),
      )}

      {/* --- 2 Cụm lam chắn nắng ngang bê tông/nhôm xám sáng nhô nổi 3D & ôm vòng qua 2 góc khối đế --- */}
      {[
        { xc: 32.975, outerX: 29.8, sideSign: -1 },
        { xc: 43.025, outerX: 46.2, sideSign: 1 },
      ].map(({ xc, outerX, sideSign }) => (
        <group key={`lib-louver-bank-${xc}`}>
          {/* Dải cửa sổ kính tối lùi sâu phía sau hệ thanh lam chắn nắng */}
          <mesh position={[xc, 7.52, PODIUM_FRONT_Z - 0.02]}>
            <boxGeometry args={[5.95, 2.58, 0.05]} />
            <meshStandardMaterial color="#253342" roughness={0.28} metalness={0.35} />
          </mesh>
          {/* Đố đứng nhôm bạc chia khoang phía sau hệ lam ngang */}
          {[-2.2, -1.1, 0, 1.1, 2.2].map((dx) => (
            <mesh key={`lib-lam-mull-${xc}-${dx}`} position={[xc + dx, 7.52, PODIUM_FRONT_Z - 0.14]}>
              <boxGeometry args={[0.075, 2.58, 0.22]} />
              <meshStandardMaterial color="#9AA5B1" roughness={0.42} metalness={0.42} />
            </mesh>
          ))}
          {/* 7 bản lam ngang xám sáng nhô ra 0,50 m phía Bắc + ôm vòng 1,35 m sang mặt bên Tây/Đông */}
          {slatY.map((y) => (
            <group key={`lib-slat-${xc}-${y}`}>
              <mesh position={[xc, y, PODIUM_FRONT_Z - 0.24]} castShadow receiveShadow>
                <boxGeometry args={[6.52, 0.085, 0.52]} />
                <meshStandardMaterial color="#CFD6DE" roughness={0.55} metalness={0.22} />
              </mesh>
              <mesh position={[outerX + sideSign * 0.18, y, PODIUM_FRONT_Z + 0.56]} castShadow receiveShadow>
                <boxGeometry args={[0.42, 0.085, 1.45]} />
                <meshStandardMaterial color="#CFD6DE" roughness={0.55} metalness={0.22} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* ============ 4. ĐỒNG HỒ TRÒN CHÍNH GIỮA — KHÔNG BỊ MÁI CHE KHUẤT (x = 38, y = 7.85, z = 19.26) ============ */}
      <group position={[clock.x, clock.y, clock.z]} rotation-y={Math.PI}>
        <mesh>
          <circleGeometry args={[clockR, 48]} />
          <meshStandardMaterial
            map={clockTex}
            emissive={isNight ? '#FFF4D2' : '#FFFFFF'}
            emissiveMap={clockTex}
            emissiveIntensity={isNight ? 0.78 : 0.14}
            roughness={0.42}
          />
        </mesh>
        <mesh>
          <torusGeometry args={[clockR + 0.05, 0.095, 12, 64]} />
          <meshStandardMaterial color={LIB_BLUE} roughness={0.52} metalness={0.25} />
        </mesh>
        <group position={[0, 0, 0.07]}>
          <group ref={hourHandRef} rotation-z={-((10 * 30 + 10 * 0.5) * Math.PI) / 180}>
            <mesh position={[0, 0.38, 0]}>
              <boxGeometry args={[0.085, 0.76, 0.04]} />
              <meshStandardMaterial color={INK} roughness={0.5} />
            </mesh>
          </group>
          <group ref={minuteHandRef} rotation-z={-((10 * 6) * Math.PI) / 180}>
            <mesh position={[0, 0.52, 0]}>
              <boxGeometry args={[0.065, 1.04, 0.04]} />
              <meshStandardMaterial color={INK} roughness={0.5} />
            </mesh>
          </group>
          <group ref={secondHandRef} rotation-z={0}>
            <mesh position={[0, 0.46, 0.015]}>
              <boxGeometry args={[0.03, 1.1, 0.03]} />
              <meshStandardMaterial color={HUST_RED} roughness={0.4} />
            </mesh>
          </group>
          <mesh position={[0, 0, 0.025]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.08, 0.08, 0.06, 16]} />
            <meshStandardMaterial color={LIB_BLUE} roughness={0.4} metalness={0.35} />
          </mesh>
        </group>
      </group>
      {/* Cụm 5 thanh lam xanh dương đặc trưng ngay phía trên đồng hồ, lọt giữa 2 trán tường */}
      {blueSlatY.map((y) => (
        <mesh key={`lib-blue-slat-${y}`} position={[38.0, y, PODIUM_FRONT_Z - 0.08]}>
          <boxGeometry args={[2.85, 0.095, 0.12]} />
          <meshStandardMaterial color={LIB_BLUE} roughness={0.78} />
        </mesh>
      ))}

      {/* ============ 5. BIỂN CHỮ VÀNG ĐỒNG 3D KHỐI ĐẶC "THƯ VIỆN / TẠ QUANG BỬU" TRÊN TRÁN TƯỜNG TRẮNG ============ */}
      <group position={[32.95, 10.18, 19.21]} rotation={[0, Math.PI, 0]}>
        <ExtrudedText3D
          text="THƯ VIỆN"
          size={[2.65, 0.56]}
          depth={0.16}
          position={[-1.3, 0.46, 0]}
          frontColor="#EAB308"
          frontHighlightColor="#FEF08A"
          sideColor="#784B08"
          metalness={0.74}
          roughness={0.26}
          emissive="#CA8A04"
          emissiveIntensity={isNight ? 0.35 : 0.08}
        />
        <ExtrudedText3D
          text="TẠ QUANG BỬU"
          size={[5.25, 0.78]}
          depth={0.18}
          position={[0, -0.34, 0]}
          frontColor="#EAB308"
          frontHighlightColor="#FEF08A"
          sideColor="#784B08"
          metalness={0.74}
          roughness={0.26}
          emissive="#CA8A04"
          emissiveIntensity={isNight ? 0.35 : 0.08}
        />
      </group>

      {/* Diềm mái xanh dương đậm chia 2 nửa trái/phải chuẩn ảnh thu-vien-mat-tien-01.jpg & thu-vien-cao-nhin-cheo-01.jpg */}
      <mesh position={[32.92, 11.6, 23.08]} castShadow>
        <boxGeometry args={[6.65, 0.34, 7.95]} />
        <meshStandardMaterial color={LIB_BLUE} roughness={0.8} />
      </mesh>
      <mesh position={[43.08, 11.6, 23.08]} castShadow>
        <boxGeometry args={[6.65, 0.34, 7.95]} />
        <meshStandardMaterial color={LIB_BLUE} roughness={0.8} />
      </mesh>

      {/* Cửa sổ phòng đọc sáng đèn ấm áp trên cả khối tháp và hai cánh khi trời tối */}
      {isNight && (
        <group>
          {[4, 5, 6, 7, 8].map((f) =>
            centerGroupX
              .filter((_, idx) => (f + idx) % 2 === 0)
              .map((x) => (
                <mesh key={`lib-night-win-${f}-${x}`} position={[x, bandY(f), 26.68]}>
                  <planeGeometry args={[1.52, 1.48]} />
                  <meshStandardMaterial
                    color="#FFD27D"
                    emissive="#FFB84D"
                    emissiveIntensity={0.88}
                    roughness={0.3}
                  />
                </mesh>
              )),
          )}
          {[2, 4, 6].map((f) => (
            <group key={`lib-night-wing-${f}`}>
              <mesh position={[27.52, bandY(f), 28.68]}>
                <planeGeometry args={[3.0, 1.44]} />
                <meshStandardMaterial color="#FFD27D" emissive="#FFB84D" emissiveIntensity={0.78} />
              </mesh>
              <mesh position={[49.28, bandY(f), 28.68]}>
                <planeGeometry args={[4.5, 1.44]} />
                <meshStandardMaterial color="#FFD27D" emissive="#FFB84D" emissiveIntensity={0.78} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* ============ 7. SẢNH CỘT TRỤ TRÒN BỌC NHÔM & CỬA KÍNH TỰ ĐỘNG (z = 19.65..23.62) ============ */}
      {[
        ...frontPorchColX.map((x) => ({ x, z: 19.65, key: `front-${x}` })),
        ...innerPorchColX.map((x) => ({ x, z: 22.8, key: `inner-${x}` })),
      ].map(({ x, z, key }) => (
        <group key={`lib-col-${key}`} position={[x, 0, z]}>
          <mesh position={[0, 3.25, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.32, 0.32, 5.3, 24]} />
            <meshStandardMaterial
              color={COLUMN_GREY}
              map={concretePbr.map}
              bumpMap={concretePbr.bumpMap}
              bumpScale={0.008}
              roughness={0.45}
              metalness={0.35}
            />
          </mesh>
          <mesh position={[0, 0.82, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.38, 0.4, 0.44, 24]} />
            <meshStandardMaterial
              color="#4A525A"
              map={granitePbr.map}
              bumpMap={granitePbr.bumpMap}
              bumpScale={0.01}
              roughness={0.55}
              metalness={0.22}
            />
          </mesh>
          <mesh position={[0, 5.74, 0]}>
            <cylinderGeometry args={[0.4, 0.34, 0.24, 24]} />
            <meshStandardMaterial color="#7B848E" roughness={0.45} metalness={0.35} />
          </mesh>
          {[1.85, 2.95, 4.05, 5.1].map((ry) => (
            <mesh key={`col-ring-${ry}`} position={[0, ry, 0]} rotation-x={Math.PI / 2}>
              <torusGeometry args={[0.325, 0.01, 8, 24]} />
              <meshStandardMaterial color="#58616B" roughness={0.4} metalness={0.45} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Hai mảng tường trắng kẹp hai bên vách kính sảnh tầng trệt (z = 23.62) */}
      <WhiteBox p={[31.3, 3.25, 25.2]} s={[3.0, 5.3, 3.2]} shadow mat={whiteWallMat} />
      <WhiteBox p={[44.7, 3.25, 25.2]} s={[3.0, 5.3, 3.2]} shadow mat={whiteWallMat} />
      <mesh position={[38.0, 3.25, DOOR_WALL_Z + 0.8]}>
        <boxGeometry args={[10.4, 5.3, 1.4]} />
        <meshStandardMaterial color={INTERIOR_DARK} roughness={1} />
      </mesh>
      {/* Ánh sáng ấm & chiều sâu kiến trúc Đại sảnh thông tầng nhìn xuyên qua toàn bộ vách kính sảnh */}
      <mesh position={[38.0, 2.85, DOOR_WALL_Z + 0.14]}>
        <planeGeometry args={[10.1, 4.45]} />
        <meshStandardMaterial
          map={windowPbr.lobbyBackdrop}
          emissiveMap={windowPbr.lobbyBackdrop}
          emissive="#FFD98E"
          emissiveIntensity={isNight ? 0.95 : 0.52}
          roughness={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2 cánh cửa kính trung tâm tự động trượt mở sang hai bên */}
      <group ref={leftDoorRef} position={[37.1, 2.6, DOOR_WALL_Z]}>
        <GlassBox p={[0, 0, 0]} s={[1.65, 4.0, 0.06]} mat={porticoGlassMat} />
        <mesh position={[0.68, -0.1, -0.045]}>
          <boxGeometry args={[0.04, 0.72, 0.04]} />
          <meshStandardMaterial color="#D8DCE2" roughness={0.25} metalness={0.78} />
        </mesh>
      </group>
      <group ref={rightDoorRef} position={[38.9, 2.6, DOOR_WALL_Z]}>
        <GlassBox p={[0, 0, 0]} s={[1.65, 4.0, 0.06]} mat={porticoGlassMat} />
        <mesh position={[-0.68, -0.1, -0.045]}>
          <boxGeometry args={[0.04, 0.72, 0.04]} />
          <meshStandardMaterial color="#D8DCE2" roughness={0.25} metalness={0.78} />
        </mesh>
      </group>
      {[34.4, 41.6].map((x) => (
        <GlassBox key={`lib-door-side-${x}`} p={[x, 2.6, DOOR_WALL_Z]} s={[3.2, 4.0, 0.06]} mat={porticoGlassMat} />
      ))}
      {/* Khung nhôm xanh dương đậm bao quanh vách kính sảnh chính */}
      {[32.8, 36.0, 38.0, 40.0, 43.2].map((x) => (
        <mesh key={`lib-door-frame-v-${x}`} position={[x, 2.95, DOOR_WALL_Z - 0.03]}>
          <boxGeometry args={[0.16, 4.7, 0.1]} />
          <meshStandardMaterial color={LIB_BLUE} roughness={0.8} />
        </mesh>
      ))}
      {[0.66, 3.45, 5.22].map((y) => (
        <mesh key={`lib-door-frame-h-${y}`} position={[38.0, y, DOOR_WALL_Z - 0.03]}>
          <boxGeometry args={[10.56, 0.16, 0.1]} />
          <meshStandardMaterial color={LIB_BLUE} roughness={0.8} />
        </mesh>
      ))}

      {/* 2 bảng standee xanh dương chào mừng hai bên cửa chính */}
      {[35.3, 40.7].map((sx) => (
        <group key={`lib-standee-${sx}`} position={[sx, 0.6, DOOR_WALL_Z - 0.55]}>
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[0.56, 0.06, 0.36]} />
            <meshStandardMaterial color="#4A525A" roughness={0.45} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.78, 0]} castShadow>
            <boxGeometry args={[0.58, 1.38, 0.04]} />
            <meshStandardMaterial color={LIB_BLUE} roughness={0.45} metalness={0.15} />
          </mesh>
          <mesh position={[0, 1.24, -0.025]}>
            <boxGeometry args={[0.46, 0.24, 0.01]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.76, -0.025]}>
            <boxGeometry args={[0.46, 0.56, 0.01]} />
            <meshStandardMaterial color="#38BDF8" roughness={0.45} />
          </mesh>
        </group>
      ))}

      {/* Bậc tam cấp đá granite rộng 16,4 m (x = 29.8..46.2, z = 17.0..19.2) */}
      {[
        { y: 0.525, z: 18.9 },
        { y: 0.375, z: 18.35 },
        { y: 0.225, z: 17.8 },
        { y: 0.075, z: 17.25 },
      ].map(({ y, z }) => (
        <mesh key={`lib-step-${z}`} position={[38.0, y, z]} receiveShadow>
          <boxGeometry args={[16.4, 0.15, 0.55]} />
          <meshStandardMaterial
            color={STONE}
            map={granitePbr.map}
            bumpMap={granitePbr.bumpMap}
            bumpScale={0.01}
            roughness={0.85}
          />
        </mesh>
      ))}
      {[29.35, 46.65].map((x) => (
        <mesh key={`lib-step-side-${x}`} position={[x, 0.24, 18.1]} receiveShadow>
          <boxGeometry args={[0.9, 0.48, 2.5]} />
          <meshStandardMaterial
            color={STONE}
            map={granitePbr.map}
            bumpMap={granitePbr.bumpMap}
            bumpScale={0.01}
            roughness={0.85}
          />
        </mesh>
      ))}

      {/* ============ 8. TIỀN CẢNH PHÍA BẮC — SÂN QUẢNG TRƯỜNG RỘNG & CHỮ HUST 3D ============ */}
      <mesh rotation-x={-Math.PI / 2} position={[28.0, 0.035, 14]} receiveShadow>
        <planeGeometry args={[8.5, 4.4]} />
        <meshStandardMaterial color="#FFFFFF" map={paverPbr.map} roughness={0.86} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[40.2, 0.035, 14]} receiveShadow>
        <planeGeometry args={[16.0, 4.4]} />
        <meshStandardMaterial
          color={YARD_GREY}
          map={granitePbr.map}
          bumpMap={granitePbr.bumpMap}
          bumpScale={0.008}
          roughness={0.88}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[27.8, 0.04, 10.9]} receiveShadow>
        <planeGeometry args={[6.2, 1.8]} />
        <meshStandardMaterial color={LAWN} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[27.2, 0.04, 18.0]} receiveShadow>
        <planeGeometry args={[4.4, 3.2]} />
        <meshStandardMaterial color={LAWN} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[50.4, 0.04, 15.0]} receiveShadow>
        <planeGeometry args={[3.8, 8.6]} />
        <meshStandardMaterial color={LAWN} roughness={1} />
      </mesh>

      <LibTree x={29.5} z={13.8} trunkH={2.2} canopyR={1.45} canopyY={3.2} />
      <LibTree x={46.8} z={13.8} trunkH={2.2} canopyR={1.45} canopyY={3.2} />
      <LibPalm x={26.2} z={10.8} />
      <LibPalm x={26.2} z={14.8} />
      <LibPalm x={26.2} z={18.8} />
      <LibPalm x={28.0} z={22.8} />
      <LibPalm x={51.4} z={10.8} />
      <LibPalm x={51.4} z={14.8} />
      <LibPalm x={51.4} z={18.8} />
      <LibPalm x={48.2} z={22.8} />
      <LibBench x={50.6} z={13.4} />
      <LibBench x={50.6} z={16.6} />
      <LibBench x={25.0} z={14.0} rotationY={Math.PI} />
      <LibLamp x={25.8} z={10.8} balls={5} isNight={isNight} />
      <LibLamp x={30.0} z={10.8} balls={5} isNight={isNight} />
      <LibLamp x={25.8} z={17.5} balls={5} isNight={isNight} />
      <LibLamp x={48.6} z={11.8} balls={3} isNight={isNight} />
      <LibLamp x={48.6} z={18.2} balls={3} isNight={isNight} />
      {[12.4, 15.6].map((z) => (
        <mesh key={`lib-bin-${z}`} position={[24.8, 0.3, z]} castShadow>
          <cylinderGeometry args={[0.25, 0.22, 0.6, 12]} />
          <meshStandardMaterial color={BIN_GREEN} roughness={0.8} />
        </mesh>
      ))}

      {/* Cụm chữ 3D "HUST" đỏ trên bệ đá granite đen (x = 38, z = 14) */}
      <mesh position={[38, 0.06, 14]} receiveShadow>
        <boxGeometry args={[5.92, 0.12, 1.48]} />
        <meshStandardMaterial
          color="#2A2D32"
          map={granitePbr.map}
          bumpMap={granitePbr.bumpMap}
          bumpScale={0.01}
          roughness={0.62}
          metalness={0.18}
        />
      </mesh>
      <mesh position={[38, 0.25, 14]} castShadow receiveShadow>
        <boxGeometry args={[5.6, 0.5, 1.2]} />
        <meshStandardMaterial
          color={INK}
          map={granitePbr.map}
          bumpMap={granitePbr.bumpMap}
          bumpScale={0.01}
          roughness={0.55}
          metalness={0.18}
        />
      </mesh>
      {[35.9, 37.3, 38.7, 40.1].map((ux) => (
        <mesh key={`hust-uplight-${ux}`} position={[ux, 0.13, 13.33]}>
          <cylinderGeometry args={[0.06, 0.07, 0.04, 12]} />
          <meshBasicMaterial color={isNight ? '#FFE08A' : '#CBD5E1'} />
        </mesh>
      ))}
      <LabelPlane
        textureKey="hust-plinth-one-love"
        canvasW={1024}
        canvasH={96}
        draw={drawOneLoveSlogan}
        size={[4.8, 0.36]}
        position={[38, 0.26, 13.38]}
        rotation={[0, Math.PI, 0]}
      />
      <group position={[38, 0.5, 14]} rotation={[0, Math.PI, 0]}>
        {['H', 'U', 'S', 'T'].map((letter, i) => (
          <BlockLetter
            key={`hust-${letter}`}
            letter={letter}
            x={-2.575 + i * 1.35}
            y={0}
            z={0}
            isNight={isNight}
          />
        ))}
      </group>

      {/* ============ 9. GÓC ĐÔNG-BẮC VỈA HÈ BO TRÒN, BIỂN "CẤM DỪNG ĐỖ" & HÔNG PHẢI (PHÍA TÂY) THƯ VIỆN ============
          Đối chiếu 1:1 ảnh thực tế:
          - `tham-khao/NEW/từ cuối 2 nhánh đường nhìn chếch trái sang thư viện.jpg`
          - `tham-khao/NEW/bên phải thư viện.jpg` */}
      {/* Bó vỉa bê tông bo tròn góc Đông-Bắc sân Thư viện (x = 24..53.2, z = 6.8..22.8) + nắp cống thoát nước */}
      <mesh position={[38.0, 0.055, 6.88]} receiveShadow>
        <boxGeometry args={[26.6, 0.09, 0.24]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.86} />
      </mesh>
      <mesh position={[53.12, 0.055, 15.2]} receiveShadow>
        <boxGeometry args={[0.24, 0.09, 14.8]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.86} />
      </mesh>
      <mesh position={[51.9, 0.045, 8.1]} receiveShadow>
        <cylinderGeometry args={[1.32, 1.32, 0.07, 24]} />
        <meshStandardMaterial color="#C88275" roughness={0.88} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[52.3, 0.025, 6.15]}>
        <planeGeometry args={[0.72, 0.46]} />
        <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.45} />
      </mesh>

      {/* Hai cây bóng mát tán xanh rậm rạp góc Đông-Bắc sân Thư viện + bồn vườn cỏ viền bê tông */}
      <LibTree x={48.6} z={9.4} trunkH={2.1} canopyR={2.05} canopyY={3.25} />
      <LibTree x={43.6} z={9.5} trunkH={2.15} canopyR={1.95} canopyY={3.3} />

      {/* Vạch giảm tốc màu vàng qua trục x = 56.2 (bên trái sân Thư viện) & trục đại lộ chính z = -6 */}
      {[-0.4, -0.2, 0, 0.2, 0.4].map((d, idx) => (
        <group key={`lib-corner-speedbump-${idx}`}>
          <mesh rotation-x={-Math.PI / 2} position={[56.2, 0.026, 6.4 + d]}>
            <planeGeometry args={[4.6, 0.09]} />
            <meshStandardMaterial color="#EAB308" roughness={0.84} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={[48.6 + d, 0.026, -5.8]}>
            <planeGeometry args={[0.09, 7.4]} />
            <meshStandardMaterial color="#EAB308" roughness={0.84} />
          </mesh>
        </group>
      ))}

      {/* Biển báo di động màu đỏ "CẤM DỪNG ĐỖ" chân đế bê tông tròn đặt ngay góc bo Đông-Bắc sân Thư viện */}
      <group position={[52.75, 0, 6.85]} rotation-y={Math.atan2(3.4, -11.3)}>
        <mesh position={[0, 0.035, 0]} receiveShadow>
          <cylinderGeometry args={[0.24, 0.26, 0.07, 20]} />
          <meshStandardMaterial color="#A8A29E" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.56, 0]} castShadow>
          <cylinderGeometry args={[0.022, 0.024, 1.05, 10]} />
          <meshStandardMaterial color="#F1F5F9" roughness={0.45} metalness={0.35} />
        </mesh>
        <mesh position={[0, 1.04, 0]} castShadow>
          <boxGeometry args={[0.72, 0.5, 0.04]} />
          <meshStandardMaterial color="#B91C1C" roughness={0.55} />
        </mesh>
        <LabelPlane
          textureKey="lib-no-stopping-red-sign"
          canvasW={512}
          canvasH={360}
          draw={(ctx, w, h) => {
            ctx.fillStyle = '#B91C1C';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 8;
            ctx.strokeRect(8, 8, w - 16, h - 16);
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '700 24px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('ĐẠI HỌC BÁCH KHOA HÀ NỘI', w / 2, 54);
            ctx.font = '900 58px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('CẤM DỪNG ĐỖ', w / 2, 146);
            ctx.font = '700 26px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('CÁC LOẠI PHƯƠNG TIỆN', w / 2, 232);
            ctx.fillText('DƯỚI LÒNG ĐƯỜNG & TRÊN VỈA HÈ', w / 2, 286);
          }}
          size={[0.69, 0.47]}
          position={[0, 1.04, 0.028]}
          transparent={false}
        />
      </group>

      {/* BÊN PHẢI THƯ VIỆN (HÔNG TÂY, x ≈ 22..30 — khớp `bên phải thư viện.jpg`):
          1) Chân đế ốp đá granite đen bóng dọc tường Tây khối đế
          2) Dàn 8 cục nóng điều hòa trắng xếp dọc trong khe kỹ thuật Tây (x = 29.55, z = 28.25)
          3) Bậc cầu thang gạch nâu đỏ có lan can inox lên cửa phụ Tây (x = 28.9, z = 27.3)
          4) Quảng trường đường dạo lát đá xám rẻ quạt kèm bồn cây tường trắng bên phải lối đi */}
      <mesh position={[29.74, 0.52, 23.2]} receiveShadow>
        <boxGeometry args={[0.28, 1.04, 7.6]} />
        <meshStandardMaterial color="#181C22" roughness={0.32} metalness={0.25} />
      </mesh>
      <mesh position={[25.02, 0.52, 39.25]} receiveShadow>
        <boxGeometry args={[0.24, 1.04, 21.5]} />
        <meshStandardMaterial color="#181C22" roughness={0.32} metalness={0.25} />
      </mesh>
      <mesh position={[27.42, 0.52, 28.56]} receiveShadow>
        <boxGeometry args={[4.85, 1.04, 0.24]} />
        <meshStandardMaterial color="#181C22" roughness={0.32} metalness={0.25} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => 4.4 + i * 2.15).map((acy, idx) => (
        <group key={`lib-west-ac-stack-${idx}`} position={[29.55, acy, 28.25]}>
          <mesh castShadow>
            <boxGeometry args={[0.42, 0.68, 0.92]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.62} />
          </mesh>
          <mesh position={[-0.22, 0, -0.15]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.22, 0.22, 0.02, 14]} />
            <meshStandardMaterial color="#334155" roughness={0.7} />
          </mesh>
        </group>
      ))}
      <group position={[28.95, 0, 27.35]}>
        {[0, 1, 2, 3, 4].map((st) => (
          <mesh
            key={`lib-west-brick-step-${st}`}
            position={[0.18 * st, 0.09 + st * 0.16, 0]}
            receiveShadow
          >
            <boxGeometry args={[0.26, 0.16, 1.55]} />
            <meshStandardMaterial color="#6D3B32" roughness={0.85} />
          </mesh>
        ))}
        <mesh position={[0.38, 0.92, -0.74]} rotation={[0, 0, 0.68]}>
          <boxGeometry args={[1.25, 0.04, 0.04]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0.38, 0.92, 0.74]} rotation={[0, 0, 0.68]}>
          <boxGeometry args={[1.25, 0.04, 0.04]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>
      {/* Dải vỉa hè rộng lát đá xám bên Tây đường nội bộ x = 24 */}
      <mesh position={[22.1, 0.032, 34.5]} receiveShadow>
        <boxGeometry args={[2.5, 0.064, 30.0]} />
        <meshStandardMaterial
          color="#9CA3AF"
          map={granitePbr.map}
          bumpMap={granitePbr.bumpMap}
          bumpScale={0.01}
          roughness={0.88}
        />
      </mesh>

      {/* ============ 10. SÂN SAU PHÍA NAM (z = 54.5) ============ */}
      <mesh rotation-x={-Math.PI / 2} position={[30, 0.03, 54.5]} receiveShadow>
        <circleGeometry args={[2.8, 32]} />
        <meshStandardMaterial color={LEAF} roughness={1} />
      </mesh>
    </group>
  );
}
