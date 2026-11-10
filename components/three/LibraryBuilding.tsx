// ---------------------------------------------------------------------------
// LibraryBuilding.tsx — Thư viện Tạ Quang Bửu, dựng lại HOÀN TOÀN đợt 4
// (11/11/2026) theo tư liệu studywithhuster.cyou (docs/ref-library-studywithhuster.md).
// User xác nhận trang đó dựng ĐÚNG kiến trúc thư viện; mấy tòa xung quanh của
// trang đó KHÔNG đúng nên không đụng tới. Tiền cảnh phía trước thư viện của
// trang đó cũng đúng — làm theo.
//
// KIẾN TRÚC MỚI (tọa độ THẾ GIỚI trực tiếp, không còn group xoay 180° — hướng
// mặt chính vẫn giữ về phía BẮC của scene (−Z) như đợt 3 đã chốt):
//   - Khối tháp tấm đứng DUY NHẤT, mặt tiền 3 nhịp dọc: khối giữa nhô về trước
//     2 m + cao hơn nửa tầng (y 0,6..32,6), hai cánh lùi sau + thấp hơn nửa tầng
//     (y 0,6..31,0); dải kính tối dọc, hẹp, lõm vào giữa khối giữa và cánh phải
//     (lõi thang), chạy suốt chiều cao.
//   - ~10 tầng (trệt + 9): khối giữa tầng trên cùng 9 cửa đứng cao hẹp + dải
//     xanh dương ngang phía trên; các tầng dưới lưới cửa đều (khối giữa 7 nhóm/
//     hàng, cánh 4 nhóm/hàng, mỗi nhóm 2 ô); tường trắng ngà, kính xanh đen,
//     không ban công.
//   - Khối đế chỉ ôm khối giữa, nhô ra trước tạo mái hiên/sảnh: mặt trước đế
//     2 tấm lam ngang lớn màu xám (mỗi tấm 13 thanh) hai bên đồng hồ; đồng hồ
//     TRÒN, mặt trắng, viền xanh dương đậm, r 1,3 m, hơi lệch trái trục giữa,
//     ngay dưới mái xanh của đế và ngay trên mái hiên sảnh; phía trên đồng hồ
//     khối lam xanh dương nhỏ (5 thanh); 2 chấm đen nhỏ hai bên đồng hồ.
//   - Sảnh lõm vào dưới đế: 6 cột vuông xám to thưa đỡ mái hiên phẳng trắng
//     nhô ra; cửa kính đôi ở giữa, khung dọc xanh dương, hai bên panel kính
//     xanh đậm, bên trong tối; bậc tam cấp rộng (4 bậc) chạy suốt chiều rộng
//     sảnh xuống sân, hai đầu có bậc bên.
//   - Mái phẳng xám nhạt, diềm nhô ra ở hai cánh, dải xanh dương đậm chạy ngang
//     dưới diềm mái khối giữa; trên mái khối giữa: cụm ăng-ten đen cao mảnh
//     phía trên-trái (theo ảnh tham khảo), hộp thang máy tối gần giữa mái,
//     2 hộp vuông nhỏ ở hai đầu mái cánh; mái đế xanh dương đậm, 2 cao độ
//     (mái chính + gờ thấp phía trước, 2 lớp xanh song song khi nhìn chéo).
//   - Biển tên vàng "THƯ VIỆN TẠ QUANG BỬU" giữ nguyên chữ (đã chốt, đọc trọn),
//     đặt trên mặt tháp ngay trên mái đế (mặt đế đã kín bởi đồng hồ + 2 cụm lam).
//
// FOOTPRINT (xem docs/ref-library-rebuild-report.md §1 — lý luận đầy đủ):
//   - Khối tháp x 27,5..48,5 (rộng 21 m), z 30..43 (sâu 13 m), tâm (38, 36,5).
//     Mặt tiền rộng/sâu = 1,6 — lô đất (plaza x 23..50) chỉ cho tối đa ~22 m
//     rộng nên không đạt 2,5–3 như tư liệu; bù lại bằng bố cục 3 nhịp + dải
//     ngang để đọc ra là tấm đứng rộng. Tâm tháp dời 4,5 m về nam so với
//     (38, 32) cũ để có đủ sân mở phía bắc bậc sảnh (giữ tâm cũ thì sân mở
//     chỉ còn ~2 m, không đủ đặt chữ HUST + lối đi + bồn cỏ đối xứng).
//   - Khối đế x 32,5..43,5, z 24..30; sảnh/mái hiên z 18..24,5, cột z 19,5,
//     cửa kính z 26,5, bậc z 17..19; đồng hồ (38, 7,3, 23,9) r 1,3 m.
//   - Sân nam giữ nguyên (đảo cỏ (30,52), lộc vừng (49,52)).
//   - Collider (lib/campus.ts): 2 hộp — tháp x 27,5..48,5, z 29,5..43,5 và
//     khối đế x 32,5..43,5, z 23,5..30,5; mái hiên + bậc ngoài collider như cũ
//     để avatar đứng được dưới mái trước cửa; bệ chữ HUST có collider riêng.
// Sân gạch đỏ-nâu #A65B43 vẽ ở Ground.tsx (LIBRARY.plaza) — file này chỉ vẽ
// thêm chi tiết tiền cảnh (lối đỏ, sân xám, bồn cỏ, chữ HUST, đèn, ghế).
// Chữ dùng canvas texture (TextPlate.tsx), không dùng drei Text.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LIBRARY } from '../../lib/campus';
import { playerState, type TimeOfDay } from '../../lib/playerState';
import { LabelPlane, drawClockFace } from './TextPlate';
import { makeGraniteStoneTexture, makeWeatheredConcreteTexture } from './materials';
import { ImprovedTree } from './Trees';

// --- Màu chốt (theo tư liệu studywithhuster — màu phẳng low-poly) -----------
const LIB_WHITE = '#F2F3F5'; // tường thư viện, trắng ngà
const LIB_GLASS = '#2E3A47'; // kính cửa sổ, xanh đen/xám đen (đậm hơn bản cũ để đọc rõ trên tường trắng)
const LIB_BLUE = '#1E5AA8'; // đường nhấn xanh dương đậm (viền đồng hồ, dải mái, khung cửa, mái đế)
const SLAT = '#4A5258'; // thanh lam ngang, xám vừa
const LAM_BACK = '#8A939B'; // nền sau lam, xám-xanh sáng (thanh lam tối đọc tách nhau trên nền sáng)
const STONE = '#B9B9B0'; // bậc đá + bệ, xám nhạt
const COLUMN_GREY = '#8A939B'; // cột sảnh vuông, xám
const ROOF_GREY = '#C9CBC8'; // mái tháp phẳng, xám nhạt
const INK = '#1A1A1A'; // kim đồng hồ, khung tối, bệ đen
const DARK_BOX = '#3A3A3A'; // hộp thang máy trên mái
const INTERIOR_DARK = '#141414'; // bên trong sảnh tối
const TRUNK = '#6B5138';
const LEAF = '#5D7D4A';
const LAWN = '#6B8F5A'; // cỏ bồn sân trước
const RED_LEAF = '#B03A2E'; // lộc vừng lá đỏ
const WALK_RED = '#8A4A32'; // lối đi chính màu nâu đỏ (đậm hơn sân #A65B43 để tách)
const YARD_GREY = '#C9C9C2'; // sân lát xám trước sảnh
const HUST_RED = '#D22630'; // chữ HUST đỏ tươi, khối 3D
const LAMP_BLACK = '#1A1A1A'; // cột đèn đen mảnh
const LAMP_BALL = '#F5F5F0'; // bóng đèn trắng hình cầu
const BIN_GREEN = '#2E7D32'; // thùng rác xanh
const BENCH_WOOD = '#8A6B45'; // ghế gỗ nâu

// --- Kích thước chốt (m, tọa độ thế giới, mở rộng chuẩn tỉ lệ theo 5 ảnh tham-khao/thu-vien/) ---
const PLINTH = 0.6; // bệ chân nâng toàn bộ công trình
const FH = LIBRARY.floorHeight; // 3,2 m/tầng
const TOWER = { x0: 25.5, x1: 50.5, z0: 30, z1: 43 }; // khối tháp 3 nhịp rộng 25 m (mái đua đạt 26,6 m)
const CENTER = { x0: 31.0, x1: 45.0, z0: 28, z1: 43 }; // khối giữa rộng 14 m (nhô trước 2 m)
const WING_TOP = PLINTH + 9.5 * FH; // 31,0 — cánh thấp hơn khối giữa nửa tầng
const CENTER_TOP = PLINTH + 10 * FH; // 32,6 — khối giữa
const BASE = { x0: 31.0, x1: 45.0, z0: 24, z1: 30, y0: 6, y1: 11.3 }; // khối đế rộng 14 m ôm khối giữa
const CANOPY_Y = 5.6; // mặt dưới mái hiên sảnh (mái dày 0,4 → đỉnh 6,0)
const bandY = (f: number) => PLINTH + f * FH + 1.9; // tâm dải cửa tầng f

// --- Cây tối giản (bản sao cục bộ — helper SimpleTree/Palm của Landmarks.tsx
//     không được export; chỉ dùng cho đảo cỏ + hàng cau + sân trước) ----------
function LibTree({ x, z, trunkH = 2, canopyR = 1.3, canopyY = 2.9, canopyColor = LEAF }: {
  x: number; z: number; trunkH?: number; canopyR?: number; canopyY?: number; canopyColor?: string;
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

// Seed cố định theo vị trí (chỉ dùng cho cau/cọ — cùng (x, z) luôn cho cùng cây).
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Phiến lá cau/cọ: tam giác nhọn dài (rộng 0,3 m ở gốc, nhọn ở đầu), cong sẵn
// về phía +Z cục bộ — sau khi nghiêng phiến ra ngoài, +Z hướng xuống nên
// đầu phiến gập thêm xuống, đọc thành lá rủ chứ không phải đĩa phẳng.
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
    pos.setZ(i, 0.22 * len * (y / len) ** 2); // đầu phiến gập xuống ~0,22×len
  }
  g.computeVertexNormals();
  return g;
}

function LibPalm({ x, z }: { x: number; z: number }) {
  // Cau vua tiền cảnh Thư viện: thân xám có đốt vòng, bẹ cau xanh mướt trên ngọn,
  // 10 tàu lá cong rủ đa sắc độ kèm sống tàu lá 3D và 3 búp non vươn đứng ở tâm.
  const fronds = useMemo(() => {
    const rand = mulberry32(Math.round(x * 100) + Math.round(z * 100) * 7 + 11);
    return Array.from({ length: 10 }, (_, k) => ({
      az: (k / 10) * Math.PI * 2 + (rand() - 0.5) * 0.35,
      tilt: 0.88 + (k % 2) * 0.22 + rand() * 0.24, // 2 tầng tàu lá cao/thấp đan xen
      len: 1.65 + rand() * 0.48,
      shade: k % 2 === 0 ? LEAF : '#2F6B2F',
    }));
  }, [x, z]);
  const frondGeo = useMemo(() => makeFrondGeometry(1.9), []);
  useEffect(() => () => frondGeo.dispose(), [frondGeo]);
  return (
    <group position={[x, 0, z]}>
      {/* Thân cau xám nâu thuôn nhẹ */}
      <mesh position={[0, 1.9, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.19, 3.8, 10]} />
        <meshStandardMaterial color={TRUNK} roughness={0.92} />
      </mesh>
      {/* Các vòng đốt thân cau đặc trưng */}
      {[0.7, 1.4, 2.1, 2.8, 3.4].map((ry) => (
        <mesh key={`ring-${ry}`} position={[0, ry, 0]}>
          <torusGeometry args={[0.165 - ry * 0.011, 0.012, 6, 12]} />
          <meshStandardMaterial color="#584738" roughness={0.95} />
        </mesh>
      ))}
      {/* Bẹ cau xanh mướt (crownshaft) ở đoạn cổ ngọn */}
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

// Cọ cao ở bồn cỏ đầu sân (theo tư liệu: thân xám, tán lá xanh hình sao):
// thân xám cao 5,5 m, 8 phiến NGẮN + CỨNG hơn cau (nghiêng 35–50° khỏi
// phương đứng, dài 1,4–1,8 m) xòe thành tán sao; 3 búp non dựng đứng.
function LibFanPalm({ x, z }: { x: number; z: number }) {
  const fronds = useMemo(() => {
    const rand = mulberry32(Math.round(x * 100) + Math.round(z * 100) * 7 + 23);
    return Array.from({ length: 8 }, (_, k) => ({
      az: (k / 8) * Math.PI * 2 + (rand() - 0.5) * 0.4,
      tilt: 0.61 + rand() * 0.26, // 35–50° khỏi phương đứng — cứng hơn cau
      len: 1.4 + rand() * 0.4,
    }));
  }, [x, z]);
  const frondGeo = useMemo(() => makeFrondGeometry(1.6), []);
  useEffect(() => () => frondGeo.dispose(), [frondGeo]);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 2.75, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.2, 5.5, 8]} />
        <meshStandardMaterial color="#8A8A8A" roughness={1} />
      </mesh>
      {fronds.map((f, i) => (
        <group key={`fan-${i}`} position={[0, 5.5, 0]} rotation-y={f.az}>
          <mesh
            geometry={frondGeo}
            rotation-x={f.tilt}
            scale={[1, f.len / 1.6, 1]}
            castShadow
          >
            <meshStandardMaterial color={LEAF} roughness={1} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {[0.3, 2.4, 4.4].map((az, i) => (
        <group key={`fan-spear-${i}`} position={[0, 5.5, 0]} rotation-y={az}>
          <mesh
            geometry={frondGeo}
            rotation-x={0.2}
            scale={[0.7, 0.5, 0.7]}
            castShadow
          >
            <meshStandardMaterial color={LEAF} roughness={1} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// --- Đèn sân trước: cột đen mảnh, đầu chùm bóng trắng hình cầu ------------
// Loại chính 5 bóng (dọc lối đi, cao 3,2 m) và loại 3 bóng nhỏ hơn (cao 2,5 m).
function LibLamp({ x, z, balls = 5, isNight = false }: { x: number; z: number; balls?: 5 | 3; isNight?: boolean }) {
  const h = balls === 5 ? 3.2 : 2.5;
  const r = balls === 5 ? 0.14 : 0.12;
  const offsets =
    balls === 5
      ? [[0, 0.16, 0], [0.26, 0, 0], [-0.26, 0, 0], [0, 0, 0.26], [0, 0, -0.26]]
      : [[0, 0.12, 0], [0.22, -0.04, 0.12], [-0.22, -0.04, 0.12]];
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
            emissiveIntensity={isNight ? 1.3 : 0}
            roughness={0.35}
          />
        </mesh>
      ))}
    </group>
  );
}

// --- Ghế gỗ nâu nhỏ (bồn cỏ đầu sân): mặt ngồi + tựa lưng + 2 chân ---------
function LibBench({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* Mặt ngồi hướng về phía tây (ra sân) — tựa lưng ở phía đông. */}
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

// --- Chữ "HUST" đỏ khối 3D: mỗi chữ ghép từ các hộp (font khối) -------------
const LETTER_SEGMENTS: Record<string, Array<[number, number, number, number]>> = {
  H: [[0, 0, 0.28, 1.8], [0.82, 0, 0.28, 1.8], [0.28, 0.76, 0.54, 0.28]],
  U: [[0, 0.28, 0.28, 1.52], [0.82, 0.28, 0.28, 1.52], [0, 0, 1.1, 0.28]],
  S: [[0, 1.52, 1.1, 0.28], [0, 0.76, 0.28, 0.76], [0, 0.76, 1.1, 0.28], [0.82, 0, 0.28, 0.76], [0, 0, 1.1, 0.28]],
  T: [[0, 1.52, 1.1, 0.28], [0.41, 0, 0.28, 1.52]],
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

// --- Biển tên vàng 2 dòng trên trán tường trắng khối đế bên phải đồng hồ (theo thu-vien-mat-tien-01.jpg) ---
function drawLibraryNameTwoLine(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.textBaseline = 'middle';

  // Dòng 1: "THƯ VIỆN" cỡ nhỏ hơn, căn lệch trái theo bố cục chữ thật
  ctx.textAlign = 'left';
  ctx.font = '800 58px Arial, sans-serif';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(72, 52, 12, 0.72)';
  ctx.strokeText('THƯ VIỆN', w * 0.05, h * 0.30);
  ctx.fillStyle = '#D6A828';
  ctx.fillText('THƯ VIỆN', w * 0.05, h * 0.30);

  // Dòng 2: "TẠ QUANG BỬU" cỡ lớn trải rộng bên dưới
  ctx.font = '900 84px Arial, sans-serif';
  ctx.strokeText('TẠ QUANG BỬU', w * 0.05, h * 0.73);
  ctx.fillStyle = '#DFB32E';
  ctx.fillText('TẠ QUANG BỬU', w * 0.05, h * 0.73);
}

// --- Slogan trắng "ONE LOVE. ONE FUTURE." trên mặt trước bệ đá chữ HUST (thu-vien-mat-tien-chu-hust-01.jpg) ---
function drawOneLoveSlogan(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 54px Arial, sans-serif';
  ctx.fillStyle = '#F5F7FA';
  ctx.fillText('ONE LOVE. ONE FUTURE.', w / 2, h / 2);
}

// --- Texture kính cửa sổ 4 ô khung nhôm & phản chiếu bầu trời + rèm sáo ngang ---
function makeLibraryWindowTexture(): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const size = 256;
  const cMap = document.createElement('canvas');
  cMap.width = size;
  cMap.height = size;
  const ctx = cMap.getContext('2d')!;

  const cBump = document.createElement('canvas');
  cBump.width = size;
  cBump.height = size;
  const ctxB = cBump.getContext('2d')!;

  // Nền kính xanh đá đậm có gradient phản chiếu bầu trời
  const grad = ctx.createLinearGradient(0, 0, size * 0.35, size);
  grad.addColorStop(0, '#3C546E');
  grad.addColorStop(0.38, '#2B3E52');
  grad.addColorStop(0.72, '#1F2E3D');
  grad.addColorStop(1, '#293B4E');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctxB.fillStyle = '#505050';
  ctxB.fillRect(0, 0, size, size);

  // Vệt phản chiếu chéo nhẹ trên mặt kính
  ctx.fillStyle = 'rgba(210, 232, 255, 0.11)';
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(88, 0);
  ctx.lineTo(20, size);
  ctx.lineTo(0, size);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(210, 232, 255, 0.07)';
  ctx.beginPath();
  ctx.moveTo(148, 0);
  ctx.lineTo(192, 0);
  ctx.lineTo(118, size);
  ctx.lineTo(78, size);
  ctx.closePath();
  ctx.fill();

  // Rèm sáo ngang mờ phía trên ô cửa
  ctx.fillStyle = 'rgba(226, 232, 240, 0.12)';
  for (let y = 14; y < 74; y += 9) {
    ctx.fillRect(12, y, size - 24, 4);
  }

  // Khung nhôm bao ngoài + đố đứng giữa + đố ngang (transom)
  ctx.strokeStyle = '#6D7A88';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, size - 12, size - 12);

  ctx.fillStyle = '#73808E';
  ctx.fillRect(size / 2 - 5, 6, 10, size - 12);
  ctx.fillRect(6, Math.round(size * 0.34) - 4, size - 12, 8);

  // Bump map nổi cho khung nhôm
  ctxB.strokeStyle = '#E0E0E0';
  ctxB.lineWidth = 12;
  ctxB.strokeRect(6, 6, size - 12, size - 12);
  ctxB.fillStyle = '#D8D8D8';
  ctxB.fillRect(size / 2 - 5, 6, 10, size - 12);
  ctxB.fillRect(6, Math.round(size * 0.34) - 4, size - 12, 8);

  const map = new THREE.CanvasTexture(cMap);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;

  const bumpMap = new THREE.CanvasTexture(cBump);
  bumpMap.anisotropy = 4;

  return { map, bumpMap };
}

// --- Texture gạch lát đỏ-nâu lối đi chính sân trước Thư viện ------------------
function makeRedPaverTexture(): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const size = 256;
  const cMap = document.createElement('canvas');
  cMap.width = size;
  cMap.height = size;
  const ctx = cMap.getContext('2d')!;

  const cBump = document.createElement('canvas');
  cBump.width = size;
  cBump.height = size;
  const ctxB = cBump.getContext('2d')!;

  ctx.fillStyle = '#8A4A32';
  ctx.fillRect(0, 0, size, size);
  ctxB.fillStyle = '#909090';
  ctxB.fillRect(0, 0, size, size);

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
      ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      ctx.strokeStyle = 'rgba(48, 24, 16, 0.55)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, bw - 2, bh - 2);

      ctxB.fillStyle = '#C8C8C8';
      ctxB.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      ctxB.strokeStyle = '#383838';
      ctxB.lineWidth = 2;
      ctxB.strokeRect(x + 1, y + 1, bw - 2, bh - 2);
    }
  }

  const map = new THREE.CanvasTexture(cMap);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(6, 3);
  map.anisotropy = 4;

  const bumpMap = new THREE.CanvasTexture(cBump);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(6, 3);
  bumpMap.anisotropy = 4;

  return { map, bumpMap };
}

// --- Hộp kính / hộp trắng dùng chung (có phản chiếu IBL & vật liệu PBR dùng chung) ----
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
        color: '#D8E6F5',
        map: windowPbr.map,
        bumpMap: windowPbr.bumpMap,
        bumpScale: 0.015,
        emissive: new THREE.Color(LIB_GLASS),
        emissiveIntensity: 0.36,
        roughness: 0.16,
        metalness: 0.38,
      }),
    [windowPbr],
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
  const clockR = LIBRARY.clock.radius; // 1,3 m — giữ đúng hằng số (đợt 4)
  const clock = LIBRARY.clock; // (38, 7,3, 23,9), mặt bắc

  const hourHandRef = useRef<THREE.Group>(null);
  const minuteHandRef = useRef<THREE.Group>(null);
  const secondHandRef = useRef<THREE.Group>(null);
  const leftDoorRef = useRef<THREE.Group>(null);
  const rightDoorRef = useRef<THREE.Group>(null);
  const doorOpenRef = useRef(0);

  useFrame((_, rawDelta) => {
    // 1. Đồng hồ thời gian thực theo múi giờ Hà Nội (UTC+7) như studywithhuster.cyou
    const hanoiMs = Date.now() + 7 * 3600 * 1000;
    const d = new Date(hanoiMs);
    const sec = d.getUTCSeconds() + d.getUTCMilliseconds() / 1000;
    const min = d.getUTCMinutes() + sec / 60;
    const hr = (d.getUTCHours() % 12) + min / 60;
    if (hourHandRef.current) hourHandRef.current.rotation.z = -(hr / 12) * Math.PI * 2;
    if (minuteHandRef.current) minuteHandRef.current.rotation.z = -(min / 60) * Math.PI * 2;
    if (secondHandRef.current) secondHandRef.current.rotation.z = -(sec / 60) * Math.PI * 2;

    // 2. Cửa kính tự động trượt mở hai bên khi người chơi lại gần thềm sảnh Thư viện
    const px = playerState.pos.x;
    const pz = playerState.pos.z;
    const nearPorch =
      !playerState.inLibraryLobby &&
      !playerState.inClassroom &&
      px >= 33.5 &&
      px <= 42.5 &&
      pz >= 18.5 &&
      pz <= 27.2;
    const targetOpen = nearPorch ? 1 : 0;
    const dt = Math.min(rawDelta, 0.05);
    doorOpenRef.current += (targetOpen - doorOpenRef.current) * Math.min(1, dt * 6);
    const slideOffset = doorOpenRef.current * 1.45;
    if (leftDoorRef.current) leftDoorRef.current.position.x = 37.1 - slideOffset;
    if (rightDoorRef.current) rightDoorRef.current.position.x = 38.9 + slideOffset;
  });

  // Mặt đồng hồ vẽ bằng canvas (vạch + số 12/3/6/9), tạo một lần.
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
      windowPbr.bumpMap.dispose();
      paverPbr.map.dispose();
      paverPbr.bumpMap.dispose();
      glassMat.dispose();
      whiteWallMat.dispose();
    },
    [clockTex, concretePbr, granitePbr, windowPbr, paverPbr, glassMat, whiteWallMat],
  );

  // Lam khối đế: 13 thanh/cụm, cách nhau 0,25 m, dày 0,14 m
  const slatY = Array.from({ length: 13 }, (_, i) => 6.25 + i * 0.25);
  // Lam xanh nhỏ phía trên đồng hồ: 5 thanh, cách nhau 0,16 m.
  const blueSlatY = Array.from({ length: 5 }, (_, i) => 8.85 + i * 0.16);
  // 7 cột tròn bạc ở hành lang loggia tầng trên cùng khối giữa (tạo 8 khoang kính đứng theo thu-vien-mat-tien-01.jpg)
  const topColX = Array.from({ length: 7 }, (_, i) => 32.6 + i * 1.8);
  // Cửa khối giữa các tầng dưới: 7 nhóm/hàng trên bề rộng 14 m (x 31..45), tâm cách nhau 1,9 m.
  const centerGroupX = Array.from({ length: 7 }, (_, i) => 32.3 + i * 1.9);
  // 6 cột TRÒN lớn màu xám bạc đỡ mái hiên sảnh: 4 cột hàng trước (z = 19,5) + 2 cột hàng trong (z = 22,8)
  const frontPorchColX = [32.2, 36.0, 39.8, 43.6];
  const innerPorchColX = [32.2, 43.6];

  return (
    <group>
      {/* ============ BỆ CHÂN (y 0..0,6) — nâng toàn bộ công trình rộng 25 m ============ */}
      <mesh position={[38, 0.3, 24.5]} receiveShadow>
        <boxGeometry args={[14, 0.6, 11]} />
        <meshStandardMaterial
          color={STONE}
          map={granitePbr.map}
          bumpMap={granitePbr.bumpMap}
          bumpScale={0.01}
          roughness={0.85}
        />
      </mesh>
      <mesh position={[28.25, 0.3, 36.5]} receiveShadow>
        <boxGeometry args={[5.5, 0.6, 13]} />
        <meshStandardMaterial
          color={STONE}
          map={granitePbr.map}
          bumpMap={granitePbr.bumpMap}
          bumpScale={0.01}
          roughness={0.85}
        />
      </mesh>
      <mesh position={[47.75, 0.3, 36.5]} receiveShadow>
        <boxGeometry args={[5.5, 0.6, 13]} />
        <meshStandardMaterial
          color={STONE}
          map={granitePbr.map}
          bumpMap={granitePbr.bumpMap}
          bumpScale={0.01}
          roughness={0.85}
        />
      </mesh>

      {/* ============ KHỐI THÁP — 3 nhịp mở rộng (x 25,5..50,5 = 25 m) ============ */}
      <mesh position={[38, (PLINTH + CENTER_TOP) / 2, 35.5]} castShadow receiveShadow>
        <boxGeometry args={[14, CENTER_TOP - PLINTH, 15]} />
        <meshStandardMaterial
          color={LIB_WHITE}
          map={concretePbr.map}
          bumpMap={concretePbr.bumpMap}
          bumpScale={0.012}
          roughness={0.86}
        />
      </mesh>
      <mesh position={[28.25, (PLINTH + WING_TOP) / 2, 36.5]} castShadow receiveShadow>
        <boxGeometry args={[5.5, WING_TOP - PLINTH, 13]} />
        <meshStandardMaterial
          color={LIB_WHITE}
          map={concretePbr.map}
          bumpMap={concretePbr.bumpMap}
          bumpScale={0.012}
          roughness={0.86}
        />
      </mesh>
      <mesh position={[47.75, (PLINTH + WING_TOP) / 2, 36.5]} castShadow receiveShadow>
        <boxGeometry args={[5.5, WING_TOP - PLINTH, 13]} />
        <meshStandardMaterial
          color={LIB_WHITE}
          map={concretePbr.map}
          bumpMap={concretePbr.bumpMap}
          bumpScale={0.012}
          roughness={0.86}
        />
      </mesh>

      {/* Dải kính đứng tối, hẹp, lõm vào giữa khối giữa và cánh bên phải ảnh (x = 30.35):
          z 28,5..29,9, chạy suốt chiều cao y 0,6..31,0 + đố nhôm đứng & dải spandrel từng tầng (khớp thu-vien-cao-nhin-cheo-01.jpg). */}
      <GlassBox p={[30.35, (PLINTH + WING_TOP) / 2, 29.2]} s={[1.3, WING_TOP - PLINTH, 1.4]} mat={glassMat} />
      {[30.0, 30.7].map((mx) => (
        <mesh key={`lib-core-mull-v-${mx}`} position={[mx, (PLINTH + WING_TOP) / 2, 28.48]}>
          <boxGeometry args={[0.05, WING_TOP - PLINTH, 0.06]} />
          <meshStandardMaterial color="#707D8B" roughness={0.35} metalness={0.55} />
        </mesh>
      ))}
      {Array.from({ length: 9 }).map((_, f) => (
        <mesh key={`lib-core-spandrel-${f}`} position={[30.35, PLINTH + (f + 1) * FH - 0.12, 28.48]}>
          <boxGeometry args={[1.32, 0.24, 0.06]} />
          <meshStandardMaterial color={LIB_BLUE} roughness={0.65} metalness={0.25} />
        </mesh>
      ))}

      {/* --- Mặt BẮC (mặt chính, z = 28 khối giữa / z = 30 hai cánh) --- */}
      {/* Khối giữa, tầng 4..8 (5 hàng lộ trên khối đế): 7 nhóm/hàng trên bề rộng 14 m */}
      {[4, 5, 6, 7, 8].map((f) => (
        <group key={`lib-c-n-${f}`}>
          {centerGroupX.map((x) => (
            <group key={`lib-c-n-${f}-${x}`}>
              <GlassBox p={[x, bandY(f), 27.94]} s={[1.45, 1.5, 0.08]} mat={glassMat} />
              <WhiteBox p={[x, bandY(f), 27.92]} s={[0.09, 1.5, 0.1]} mat={whiteWallMat} />
            </group>
          ))}
        </group>
      ))}
      {/* Khối giữa, tầng trên cùng (f=9): Hàng cột tròn thông tầng (colonnade loggia)
          gồm 7 cột trụ tròn màu xám bạc tạo 8 khoang kính lùi sâu + dải diềm xanh dương đậm phía trên */}
      <GlassBox p={[38, 30.45, 28.08]} s={[12.6, 2.65, 0.1]} mat={glassMat} />
      {topColX.map((x) => (
        <mesh key={`lib-top-col-${x}`} position={[x, 30.45, 27.92]} castShadow>
          <cylinderGeometry args={[0.17, 0.17, 2.7, 16]} />
          <meshStandardMaterial color={COLUMN_GREY} roughness={0.5} metalness={0.32} />
        </mesh>
      ))}
      <mesh position={[38, 32.2, 27.94]}>
        <boxGeometry args={[14, 0.42, 0.12]} />
        <meshStandardMaterial color={LIB_BLUE} roughness={0.85} />
      </mesh>
      {/* Hai cánh, mặt bắc: dải kính ngang từng tầng + 3 đố chia 4 nhóm cửa mỗi cánh. */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((f) => (
        <group key={`lib-w-n-${f}`}>
          <GlassBox p={[28.25, bandY(f), 29.94]} s={[4.9, 1.5, 0.08]} mat={glassMat} />
          <GlassBox p={[47.75, bandY(f), 29.94]} s={[4.9, 1.5, 0.08]} mat={glassMat} />
          {[27.0, 28.25, 29.5].map((x) => (
            <WhiteBox key={`lib-w-n-mull-${f}-${x}`} p={[x, bandY(f), 29.92]} s={[0.08, 1.5, 0.1]} mat={whiteWallMat} />
          ))}
          {[46.5, 47.75, 49.0].map((x) => (
            <WhiteBox key={`lib-w-n-mull-e-${f}-${x}`} p={[x, bandY(f), 29.92]} s={[0.08, 1.5, 0.1]} mat={whiteWallMat} />
          ))}
        </group>
      ))}
      <GlassBox p={[28.25, 30.2, 29.94]} s={[4.9, 1.2, 0.08]} mat={glassMat} />
      <GlassBox p={[47.75, 30.2, 29.94]} s={[4.9, 1.2, 0.08]} mat={glassMat} />
      {[27.0, 28.25, 29.5].map((x) => (
        <WhiteBox key={`lib-w-n9-mull-${x}`} p={[x, 30.2, 29.92]} s={[0.08, 1.2, 0.1]} mat={whiteWallMat} />
      ))}
      {[46.5, 47.75, 49.0].map((x) => (
        <WhiteBox key={`lib-w-n9-mull-e-${x}`} p={[x, 30.2, 29.92]} s={[0.08, 1.2, 0.1]} mat={whiteWallMat} />
      ))}

      {/* --- Mặt NAM (mặt sau, z = 43) — dải kính ngang --- */}
      {Array.from({ length: 10 }).map((_, f) => (
        <GlassBox key={`lib-s-${f}`} p={[38, bandY(f), 43.06]} s={[13.2, 1.5, 0.08]} mat={glassMat} />
      ))}
      {Array.from({ length: 10 }).map((_, f) => (
        <group key={`lib-sw-${f}`}>
          <GlassBox p={[28.25, f === 9 ? 30.2 : bandY(f), 43.06]} s={[4.9, f === 9 ? 1.2 : 1.5, 0.08]} mat={glassMat} />
          <GlassBox p={[47.75, f === 9 ? 30.2 : bandY(f), 43.06]} s={[4.9, f === 9 ? 1.2 : 1.5, 0.08]} mat={glassMat} />
        </group>
      ))}
      {/* Dải xanh dương dưới diềm mái khối giữa, mặt nam (đối xứng mặt bắc). */}
      <mesh position={[38, 32.2, 43.05]}>
        <boxGeometry args={[14, 0.42, 0.1]} />
        <meshStandardMaterial color={LIB_BLUE} roughness={0.85} />
      </mesh>

      {/* --- Mặt TÂY (nhìn từ hồ, x = 25,5) và mặt ĐÔNG (x = 50,5) --- */}
      {Array.from({ length: 10 }).map((_, f) => (
        <group key={`lib-side-${f}`}>
          <GlassBox p={[25.44, f === 9 ? 30.2 : bandY(f), 36.5]} s={[0.08, f === 9 ? 1.2 : 1.5, 11]} mat={glassMat} />
          <GlassBox p={[50.56, f === 9 ? 30.2 : bandY(f), 36.5]} s={[0.08, f === 9 ? 1.2 : 1.5, 11]} mat={glassMat} />
        </group>
      ))}

      {/* ============ MÁI PHẲNG + DIỀM ĐUA RỘNG + CẤU TRÚC TRÊN MÁI ============ */}
      {/* Mái hai cánh đua rộng ra hai đầu tạo dáng chữ T mở ở đỉnh (theo thu-vien-mat-tien-01.jpg). */}
      <WhiteBox p={[28.1, 31.2, 36.5]} s={[6.8, 0.4, 13.8]} shadow mat={whiteWallMat} />
      <WhiteBox p={[47.9, 31.2, 36.5]} s={[6.8, 0.4, 13.8]} shadow mat={whiteWallMat} />
      {/* Mái khối giữa (diềm nhô 0,4 m) — mặt trên xám nhạt. */}
      <mesh position={[38, 32.8, 35.5]} castShadow receiveShadow>
        <boxGeometry args={[14.8, 0.4, 15.8]} />
        <meshStandardMaterial color={ROOF_GREY} roughness={0.95} />
      </mesh>
      {/* Cụm ăng-ten đen cao mảnh phía trên-trái mái khối giữa */}
      {[42.0, 42.6, 43.2].map((x) => (
        <group key={`lib-ant-${x}`}>
          <mesh position={[x, 34.25, 36]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 2.5, 8]} />
            <meshStandardMaterial color={INK} roughness={0.6} metalness={0.4} />
          </mesh>
          {[33.8, 34.6].map((y) => (
            <mesh key={`lib-ant-bar-${x}-${y}`} position={[x, y, 36]}>
              <boxGeometry args={[0.8, 0.05, 0.05]} />
              <meshStandardMaterial color={INK} roughness={0.6} metalness={0.4} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Hộp thang máy / hộp kỹ thuật tối gần giữa mái khối giữa. */}
      <mesh position={[38, 33.75, 38]} castShadow>
        <boxGeometry args={[2.5, 1.5, 2.4]} />
        <meshStandardMaterial color={DARK_BOX} roughness={0.9} />
      </mesh>
      {/* 2 hộp vuông nhỏ ở hai đầu mái cánh. */}
      <mesh position={[27.2, 31.8, 36]} castShadow>
        <boxGeometry args={[1.1, 0.8, 1.1]} />
        <meshStandardMaterial color={ROOF_GREY} roughness={0.95} />
      </mesh>
      <mesh position={[48.8, 31.8, 36]} castShadow>
        <boxGeometry args={[1.1, 0.8, 1.1]} />
        <meshStandardMaterial color={ROOF_GREY} roughness={0.95} />
      </mesh>

      {/* ============ KHỐI ĐẾ MẶT TRƯỚC (x 31..45 = 14 m, z 24..30, y 6..11,3) ============ */}
      {/* Hai trụ bên tầng trệt (tây/đông) — giữa là sảnh lõm vào. */}
      <WhiteBox p={[32.2, 3.3, 27]} s={[2.4, 5.4, 6]} shadow mat={whiteWallMat} />
      <WhiteBox p={[43.8, 3.3, 27]} s={[2.4, 5.4, 6]} shadow mat={whiteWallMat} />
      {/* Tầng trên khối đế (y 6..11,3): tường trước mang 2 cụm lam + đồng hồ + biển tên vàng 2 dòng. */}
      <WhiteBox p={[38, 8.65, 27]} s={[14, 5.3, 6]} shadow mat={whiteWallMat} />

      {/* --- 2 cụm lam ngang lớn màu xám, hai bên đồng hồ (có hệ kính lùi sâu & đố nhôm đứng phía sau) --- */}
      {[33.8, 42.2].map((x) => (
        <group key={`lib-lam-back-${x}`}>
          <mesh position={[x, 7.65, 24.03]}>
            <boxGeometry args={[4.6, 3.1, 0.06]} />
            <meshStandardMaterial color="#314152" roughness={0.32} metalness={0.35} />
          </mesh>
          {[-1.15, 0, 1.15].map((dx) => (
            <mesh key={`lib-lam-mull-${x}-${dx}`} position={[x + dx, 7.65, 24.08]}>
              <boxGeometry args={[0.07, 3.05, 0.05]} />
              <meshStandardMaterial color="#7B8794" roughness={0.4} metalness={0.45} />
            </mesh>
          ))}
        </group>
      ))}
      {[33.8, 42.2].map((xc) =>
        slatY.map((y) => (
          <mesh key={`lib-slat-${xc}-${y}`} position={[xc, y, 24.2]} rotation-x={-0.45} castShadow>
            <boxGeometry args={[4.45, 0.14, 0.07]} />
            <meshStandardMaterial color={SLAT} roughness={0.62} metalness={0.22} />
          </mesh>
        )),
      )}
      {/* Khung trắng quanh mỗi cụm lam (đứng 2 bên + ngang trên/dưới). */}
      {[31.45, 36.15, 39.85, 44.55].map((x) => (
        <WhiteBox key={`lib-lam-frame-v-${x}`} p={[x, 7.65, 24.05]} s={[0.14, 3.1, 0.08]} mat={whiteWallMat} />
      ))}
      {[33.8, 42.2].map((x) => (
        <group key={`lib-lam-frame-h-${x}`}>
          <WhiteBox p={[x, 6.05, 24.05]} s={[4.7, 0.14, 0.08]} mat={whiteWallMat} />
          <WhiteBox p={[x, 9.25, 24.05]} s={[4.7, 0.14, 0.08]} mat={whiteWallMat} />
        </group>
      ))}

      {/* ============ ĐỒNG HỒ — giữa khối đế, trên lối vào (y 7,3) ============ */}
      <group position={[clock.x, clock.y, clock.z]} rotation-y={Math.PI}>
        <mesh>
          <circleGeometry args={[clockR, 48]} />
          <meshStandardMaterial
            map={clockTex}
            emissive={isNight ? '#FFF4D2' : '#000000'}
            emissiveIntensity={isNight ? 0.65 : 0}
            roughness={0.5}
          />
        </mesh>
        <mesh>
          <torusGeometry args={[clockR + 0.04, 0.08, 12, 64]} />
          <meshStandardMaterial color={LIB_BLUE} roughness={0.65} metalness={0.2} />
        </mesh>
        <group position={[0, 0, 0.08]}>
          <group ref={hourHandRef} rotation-z={-((10 * 30 + 10 * 0.5) * Math.PI) / 180}>
            <mesh position={[0, 0.365, 0]}>
              <boxGeometry args={[0.08, 0.73, 0.05]} />
              <meshStandardMaterial color={INK} roughness={0.6} />
            </mesh>
          </group>
          <group ref={minuteHandRef} rotation-z={-((10 * 6) * Math.PI) / 180}>
            <mesh position={[0, 0.505, 0]}>
              <boxGeometry args={[0.06, 1.01, 0.05]} />
              <meshStandardMaterial color={INK} roughness={0.6} />
            </mesh>
          </group>
          <group ref={secondHandRef} rotation-z={0}>
            <mesh position={[0, 0.44, 0.015]}>
              <boxGeometry args={[0.028, 1.08, 0.03]} />
              <meshStandardMaterial color={HUST_RED} roughness={0.4} />
            </mesh>
          </group>
          <mesh position={[0, 0, 0.025]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.075, 0.075, 0.06, 16]} />
            <meshStandardMaterial color={LIB_BLUE} roughness={0.4} metalness={0.35} />
          </mesh>
        </group>
      </group>
      {/* 2 chấm đen nhỏ hai bên đồng hồ */}
      {[36.4, 39.6].map((x) => (
        <mesh key={`lib-clock-dot-${x}`} position={[x, clock.y, clock.z - 0.02]}>
          <sphereGeometry args={[0.09, 12, 10]} />
          <meshStandardMaterial color={INK} roughness={0.6} />
        </mesh>
      ))}
      {/* Khối lam xanh dương nhỏ phía trên đồng hồ (5 thanh ngang). */}
      {blueSlatY.map((y) => (
        <mesh key={`lib-blue-slat-${y}`} position={[38, y, 23.95]} castShadow>
          <boxGeometry args={[2.5, 0.1, 0.06]} />
          <meshStandardMaterial color={LIB_BLUE} roughness={0.85} />
        </mesh>
      ))}
      {/* Gờ mái đế thấp đối xứng hai bên cụm lam + dải diềm xanh giật cấp phía trên đồng hồ + mái đế xanh dương đậm trên đỉnh khối đế (khớp thu-vien-mat-tien-01.jpg & thu-vien-cao-nhin-cheo-01.jpg). */}
      <mesh position={[33.8, 9.95, 24.0]} castShadow>
        <boxGeometry args={[5.4, 0.28, 0.9]} />
        <meshStandardMaterial color={LIB_BLUE} roughness={0.85} />
      </mesh>
      <mesh position={[42.2, 9.95, 24.0]} castShadow>
        <boxGeometry args={[5.4, 0.28, 0.9]} />
        <meshStandardMaterial color={LIB_BLUE} roughness={0.85} />
      </mesh>
      <mesh position={[38, 9.68, 24.02]} castShadow>
        <boxGeometry args={[3.2, 0.24, 0.72]} />
        <meshStandardMaterial color={LIB_BLUE} roughness={0.85} />
      </mesh>
      <mesh position={[38, 11.3, 27]} castShadow>
        <boxGeometry args={[14.2, 0.32, 6.2]} />
        <meshStandardMaterial color={LIB_BLUE} roughness={0.85} />
      </mesh>

      {/* Biển tên vàng 2 dòng "THƯ VIỆN / TẠ QUANG BỬU" gắn trên trán tường trắng khối đế
          bên phải đồng hồ khi nhìn trực diện mặt Bắc (x = 33.85, khớp 100% thu-vien-mat-tien-01.jpg) */}
      <LabelPlane
        textureKey="library-name-two-line"
        canvasW={768}
        canvasH={220}
        draw={drawLibraryNameTwoLine}
        size={[4.8, 1.35]}
        position={[33.85, 10.25, 23.92]}
        rotation={[0, Math.PI, 0]}
      />

      {/* Các ô cửa sổ phòng đọc sáng đèn ấm áp trên tháp 10 tầng khi Hoàng hôn & Đêm */}
      {isNight && (
        <group>
          {[4, 5, 6, 7, 8].map((f) =>
            centerGroupX
              .filter((_, idx) => (f + idx) % 2 === 0)
              .map((x) => (
                <mesh key={`lib-night-win-${f}-${x}`} position={[x, bandY(f), 27.88]}>
                  <planeGeometry args={[1.38, 1.42]} />
                  <meshStandardMaterial
                    color="#FFD27D"
                    emissive="#FFB84D"
                    emissiveIntensity={0.82}
                    roughness={0.3}
                  />
                </mesh>
              )),
          )}
        </group>
      )}

      {/* ============ SẢNH — mái hiên rộng 14 m + 6 CỘT TRÒN XÁM BẠC + cửa kính khung xanh + bậc ============ */}
      <mesh position={[38, 5.8, 21.25]} castShadow>
        <boxGeometry args={[14, 0.4, 6.5]} />
        <meshStandardMaterial
          color={LIB_WHITE}
          map={concretePbr.map}
          bumpMap={concretePbr.bumpMap}
          bumpScale={0.01}
          roughness={0.88}
        />
      </mesh>
      <mesh position={[38, 5.4, 24.35]} castShadow>
        <boxGeometry args={[14, 0.4, 0.3]} />
        <meshStandardMaterial
          color={LIB_WHITE}
          map={concretePbr.map}
          bumpMap={concretePbr.bumpMap}
          bumpScale={0.01}
          roughness={0.88}
        />
      </mesh>
      <mesh position={[38, 5.56, 21.25]}>
        <boxGeometry args={[14, 0.08, 6.5]} />
        <meshBasicMaterial color="#DDDCD7" />
      </mesh>
      <mesh position={[38, 5.16, 24.35]}>
        <boxGeometry args={[14, 0.08, 0.3]} />
        <meshBasicMaterial color="#DDDCD7" />
      </mesh>
      {/* 8 đèn âm trần LED ấm áp dưới mái hiên sảnh */}
      {[20.3, 23.1].map((lz) =>
        [33.8, 36.6, 39.4, 42.2].map((lx) => (
          <mesh key={`lib-porch-downlight-${lx}-${lz}`} position={[lx, 5.51, lz]} rotation-x={Math.PI / 2}>
            <circleGeometry args={[0.14, 16]} />
            <meshBasicMaterial color={isNight ? '#FFE599' : '#FFF8E7'} />
          </mesh>
        )),
      )}
      <pointLight
        position={[38, 5.1, 22.0]}
        color="#FFEAC2"
        intensity={isNight ? 1.45 : 0.75}
        distance={14}
        decay={1.25}
      />

      {/* 6 cột TRÒN lớn bọc tấm nhôm xám bạc (r = 0,28 m) có chân đế đá granite, vòng mạch nối & đầu cột theo thu-vien-mat-tien-01.jpg:
          4 cột hàng ngoài (z = 19,5) + 2 cột hàng trong (z = 22,8). */}
      {[
        ...frontPorchColX.map((x) => ({ x, z: 19.5, key: `front-${x}` })),
        ...innerPorchColX.map((x) => ({ x, z: 22.8, key: `inner-${x}` })),
      ].map(({ x, z, key }) => (
        <group key={`lib-col-${key}`} position={[x, 0, z]}>
          {/* Thân cột bọc nhôm xám bạc */}
          <mesh position={[0, 3.3, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.28, 0.28, 5.4, 24]} />
            <meshStandardMaterial
              color={COLUMN_GREY}
              map={concretePbr.map}
              bumpMap={concretePbr.bumpMap}
              bumpScale={0.008}
              roughness={0.48}
              metalness={0.32}
            />
          </mesh>
          {/* Đế cột đá granite xám đậm */}
          <mesh position={[0, 0.81, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.33, 0.35, 0.42, 24]} />
            <meshStandardMaterial
              color="#4A525A"
              map={granitePbr.map}
              bumpMap={granitePbr.bumpMap}
              bumpScale={0.01}
              roughness={0.55}
              metalness={0.22}
            />
          </mesh>
          {/* Đầu cột đỡ mái hiên */}
          <mesh position={[0, 5.44, 0]}>
            <cylinderGeometry args={[0.35, 0.3, 0.22, 24]} />
            <meshStandardMaterial color="#7B848E" roughness={0.45} metalness={0.35} />
          </mesh>
          {/* Vòng ron tấm ốp nhôm ngang thân cột */}
          {[1.85, 2.95, 4.05, 5.0].map((ry) => (
            <mesh key={`col-ring-${ry}`} position={[0, ry, 0]} rotation-x={Math.PI / 2}>
              <torusGeometry args={[0.284, 0.009, 8, 24]} />
              <meshStandardMaterial color="#58616B" roughness={0.4} metalness={0.45} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[38, 3.3, 27.3]}>
        <boxGeometry args={[9.2, 5.4, 1.4]} />
        <meshStandardMaterial color={INTERIOR_DARK} roughness={1} />
      </mesh>
      {/* Ánh sáng ấm của Đại sảnh thông tầng nhìn qua cửa kính tự động */}
      <mesh position={[38, 2.55, 26.58]}>
        <planeGeometry args={[3.4, 3.85]} />
        <meshStandardMaterial
          color="#FFF3D1"
          emissive="#FFD782"
          emissiveIntensity={isNight ? 0.85 : 0.42}
          roughness={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* 2 cánh cửa kính trung tâm tự động trượt mở sang hai bên khi người chơi tới gần */}
      <group ref={leftDoorRef} position={[37.1, 2.6, 26.5]}>
        <GlassBox p={[0, 0, 0]} s={[1.6, 4.0, 0.06]} mat={glassMat} />
        <mesh position={[0.68, -0.1, -0.045]}>
          <boxGeometry args={[0.04, 0.72, 0.04]} />
          <meshStandardMaterial color="#D8DCE2" roughness={0.25} metalness={0.78} />
        </mesh>
      </group>
      <group ref={rightDoorRef} position={[38.9, 2.6, 26.5]}>
        <GlassBox p={[0, 0, 0]} s={[1.6, 4.0, 0.06]} mat={glassMat} />
        <mesh position={[-0.68, -0.1, -0.045]}>
          <boxGeometry args={[0.04, 0.72, 0.04]} />
          <meshStandardMaterial color="#D8DCE2" roughness={0.25} metalness={0.78} />
        </mesh>
      </group>
      {[35.1, 40.9].map((x) => (
        <GlassBox key={`lib-door-side-${x}`} p={[x, 2.6, 26.5]} s={[2.1, 4.0, 0.06]} mat={glassMat} />
      ))}
      {/* Hệ khung cổng xanh dương đậm (#1E5AA8) bao quanh cửa kính sảnh chính */}
      {[34.0, 36.2, 38.0, 39.8, 42.0].map((x) => (
        <mesh key={`lib-door-frame-v-${x}`} position={[x, 2.6, 26.47]}>
          <boxGeometry args={[0.16, 4.05, 0.1]} />
          <meshStandardMaterial color={LIB_BLUE} roughness={0.82} />
        </mesh>
      ))}
      {[0.66, 3.35, 4.55].map((y) => (
        <mesh key={`lib-door-frame-h-${y}`} position={[38, y, 26.47]}>
          <boxGeometry args={[8.16, 0.15, 0.1]} />
          <meshStandardMaterial color={LIB_BLUE} roughness={0.82} />
        </mesh>
      ))}
      {/* 2 bảng standee xanh dương chào mừng đặt hai bên cửa kính sảnh chính (theo thu-vien-mat-tien-01.jpg) */}
      {[35.8, 40.2].map((sx) => (
        <group key={`lib-standee-${sx}`} position={[sx, 0.6, 25.85]}>
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
      {/* Bậc tiếp cận rộng (4 bậc đá granite rộng 14 m) + bậc bên 2 đầu */}
      {[
        { y: 0.525, z: 18.75 },
        { y: 0.375, z: 18.25 },
        { y: 0.225, z: 17.75 },
        { y: 0.075, z: 17.25 },
      ].map(({ y, z }) => (
        <mesh key={`lib-step-${z}`} position={[38, y, z]} receiveShadow>
          <boxGeometry args={[14, 0.15, 0.5]} />
          <meshStandardMaterial
            color={STONE}
            map={granitePbr.map}
            bumpMap={granitePbr.bumpMap}
            bumpScale={0.01}
            roughness={0.85}
          />
        </mesh>
      ))}
      {[30.5, 45.5].map((x) => (
        <mesh key={`lib-step-side-${x}`} position={[x, 0.15, 18]} receiveShadow>
          <boxGeometry args={[1, 0.3, 2]} />
          <meshStandardMaterial
            color={STONE}
            map={granitePbr.map}
            bumpMap={granitePbr.bumpMap}
            bumpScale={0.01}
            roughness={0.85}
          />
        </mesh>
      ))}

      {/* ============ TIỀN CẢNH PHÍA BẮC — sân trước mới (z 10..19) ============ */}
      <mesh rotation-x={-Math.PI / 2} position={[28.5, 0.035, 14]} receiveShadow>
        <planeGeometry args={[9, 4]} />
        <meshStandardMaterial
          color="#FFFFFF"
          map={paverPbr.map}
          bumpMap={paverPbr.bumpMap}
          bumpScale={0.012}
          roughness={0.86}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[39.5, 0.035, 14]} receiveShadow>
        <planeGeometry args={[13, 4]} />
        <meshStandardMaterial
          color={YARD_GREY}
          map={granitePbr.map}
          bumpMap={granitePbr.bumpMap}
          bumpScale={0.008}
          roughness={0.88}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[28.5, 0.04, 11]} receiveShadow>
        <planeGeometry args={[7, 2]} />
        <meshStandardMaterial color={LAWN} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[28.5, 0.04, 17.5]} receiveShadow>
        <planeGeometry args={[7, 3]} />
        <meshStandardMaterial color={LAWN} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[48.2, 0.04, 15]} receiveShadow>
        <planeGeometry args={[3.5, 8]} />
        <meshStandardMaterial color={LAWN} roughness={1} />
      </mesh>
      <LibTree x={30.5} z={14.5} trunkH={2.2} canopyR={1.5} canopyY={3.2} />
      <LibTree x={45.5} z={14.5} trunkH={2.2} canopyR={1.5} canopyY={3.2} />
      <LibPalm x={26.5} z={11} />
      <LibPalm x={26.5} z={15} />
      <LibPalm x={26.5} z={19} />
      <LibPalm x={49.5} z={11} />
      <LibPalm x={49.5} z={15} />
      <LibPalm x={49.5} z={19} />
      <LibBench x={49.0} z={13.5} />
      <LibBench x={49.0} z={16.5} />
      <LibBench x={25.0} z={14.0} />
      <LibLamp x={26} z={11} balls={5} isNight={isNight} />
      <LibLamp x={30} z={11} balls={5} isNight={isNight} />
      <LibLamp x={26} z={17.5} balls={5} isNight={isNight} />
      <LibLamp x={30} z={17.5} balls={5} isNight={isNight} />
      <LibLamp x={47.2} z={12} balls={3} isNight={isNight} />
      <LibLamp x={47.2} z={18} balls={3} isNight={isNight} />
      {[12.4, 15.6].map((z) => (
        <mesh key={`lib-bin-${z}`} position={[24.8, 0.3, z]} castShadow>
          <cylinderGeometry args={[0.25, 0.22, 0.6, 12]} />
          <meshStandardMaterial color={BIN_GREEN} roughness={0.8} />
        </mesh>
      ))}
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
      {/* 4 đèn hắt sáng chân chữ HUST (uplights) đặt trên gờ đá phía Bắc bệ chữ */}
      {[35.9, 37.3, 38.7, 40.1].map((ux) => (
        <mesh key={`hust-uplight-${ux}`} position={[ux, 0.13, 13.33]}>
          <cylinderGeometry args={[0.06, 0.07, 0.04, 12]} />
          <meshBasicMaterial color={isNight ? '#FFE08A' : '#CBD5E1'} />
        </mesh>
      ))}
      {/* Dòng chữ trắng "ONE LOVE. ONE FUTURE." trên mặt trước bệ đá đen chữ HUST (thu-vien-mat-tien-chu-hust-01.jpg) */}
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

      {/* ============ SÂN SAU PHÍA NAM — đảo cỏ + lộc vừng lá đỏ PBR ============ */}
      <mesh rotation-x={-Math.PI / 2} position={[30, 0.03, 52]} receiveShadow>
        <circleGeometry args={[3, 32]} />
        <meshStandardMaterial color={LEAF} roughness={1} />
      </mesh>
      <LibTree x={30} z={52} trunkH={1.8} canopyR={1.2} canopyY={2.6} />
      <ImprovedTree x={49} z={52} trunkH={2.2} canopyR={1.35} canopyY={3.0} canopyColor={RED_LEAF} />
    </group>
  );
}
