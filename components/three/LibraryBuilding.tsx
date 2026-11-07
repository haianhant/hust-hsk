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

import { useMemo } from 'react';
import * as THREE from 'three';
import { LIBRARY } from '../../lib/campus';
import { LabelPlane, drawClockFace } from './TextPlate';

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

// --- Kích thước chốt (m, tọa độ thế giới) ------------------------------------
const PLINTH = 0.6; // bệ chân nâng toàn bộ công trình
const FH = LIBRARY.floorHeight; // 3,2 m/tầng
const TOWER = { x0: 27.5, x1: 48.5, z0: 30, z1: 43 }; // khối tháp (cả 3 nhịp)
const CENTER = { x0: 32.5, x1: 43.5, z0: 28, z1: 43 }; // khối giữa (nhô trước 2 m)
const WING_TOP = PLINTH + 9.5 * FH; // 31,0 — cánh thấp hơn khối giữa nửa tầng
const CENTER_TOP = PLINTH + 10 * FH; // 32,6 — khối giữa
const BASE = { x0: 32.5, x1: 43.5, z0: 24, z1: 30, y0: 6, y1: 11 }; // khối đế (chỉ ôm khối giữa)
const CANOPY_Y = 5.6; // mặt dưới mái hiên sảnh (mái dày 0,4 → đỉnh 6,0)
const bandY = (f: number) => PLINTH + f * FH + 1.9; // tâm dải cửa tầng f

// --- Cây tối giản (bản sao cục bộ — helper SimpleTree/Palm của Landmarks.tsx
//     không được export; chỉ dùng cho đảo cỏ + hàng cau + sân trước) ----------
function LibTree({ x, z, trunkH = 2, canopyR = 1.3, canopyY = 2.9, canopyColor = LEAF }: {
  x: number; z: number; trunkH?: number; canopyR?: number; canopyY?: number; canopyColor?: string;
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, trunkH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.22, trunkH, 10]} />
        <meshStandardMaterial color={TRUNK} roughness={1} />
      </mesh>
      {/* Tán cụm lệch: khối chính lệch tâm + 3 khối phụ lệch cao/lệch ngang,
          dẹt không đều — không còn 1 cầu tròn hoàn hảo. */}
      <mesh position={[0.25, canopyY, 0.1]} scale={[1, 0.72, 1]} castShadow>
        <sphereGeometry args={[canopyR * 0.68, 16, 12]} />
        <meshStandardMaterial color={canopyColor} roughness={1} />
      </mesh>
      <mesh position={[-0.75, canopyY + 0.35, -0.2]} scale={[1, 0.62, 1]} castShadow>
        <sphereGeometry args={[canopyR * 0.5, 14, 10]} />
        <meshStandardMaterial color={canopyColor} roughness={1} />
      </mesh>
      <mesh position={[0.7, canopyY - 0.25, -0.45]} scale={[1, 0.6, 1]} castShadow>
        <sphereGeometry args={[canopyR * 0.45, 14, 10]} />
        <meshStandardMaterial color={canopyColor} roughness={1} />
      </mesh>
      <mesh position={[-0.15, canopyY + 0.75, 0.45]} scale={[1, 0.65, 1]} castShadow>
        <sphereGeometry args={[canopyR * 0.38, 12, 10]} />
        <meshStandardMaterial color={canopyColor} roughness={1} />
      </mesh>
    </group>
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
  // Cau: 8 phiến dài 1,6–2,1 m xòe quanh ngọn thân, nghiêng 54–74° khỏi phương
  // đứng, đầu phiến gập xuống; giữa có 3 búp non dựng đứng.
  const fronds = useMemo(() => {
    const rand = mulberry32(Math.round(x * 100) + Math.round(z * 100) * 7 + 11);
    return Array.from({ length: 8 }, (_, k) => ({
      az: (k / 8) * Math.PI * 2 + (rand() - 0.5) * 0.5,
      tilt: 0.95 + rand() * 0.35, // 54–74° khỏi phương đứng
      len: 1.6 + rand() * 0.5,
    }));
  }, [x, z]);
  const frondGeo = useMemo(() => makeFrondGeometry(1.9), []);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 2.2, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 4.4, 8]} />
        <meshStandardMaterial color={TRUNK} roughness={1} />
      </mesh>
      {fronds.map((f, i) => (
        <group key={`frond-${i}`} position={[0, 4.4, 0]} rotation-y={f.az}>
          <mesh
            geometry={frondGeo}
            rotation-x={f.tilt}
            scale={[1, f.len / 1.9, 1]}
            castShadow
          >
            <meshStandardMaterial color={LEAF} roughness={1} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {[0.1, 2.2, 4.2].map((az, i) => (
        <group key={`spear-${i}`} position={[0, 4.4, 0]} rotation-y={az}>
          <mesh
            geometry={frondGeo}
            rotation-x={0.22}
            scale={[0.7, 0.55, 0.7]}
            castShadow
          >
            <meshStandardMaterial color={LEAF} roughness={1} side={THREE.DoubleSide} />
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
function LibLamp({ x, z, balls = 5 }: { x: number; z: number; balls?: 5 | 3 }) {
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
          <meshStandardMaterial color={LAMP_BALL} roughness={0.4} />
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
        <meshStandardMaterial color={BENCH_WOOD} roughness={0.9} />
      </mesh>
      <mesh position={[0.24, 0.75, 0]} rotation-z={-0.15} castShadow>
        <boxGeometry args={[0.08, 0.55, 1.8]} />
        <meshStandardMaterial color={BENCH_WOOD} roughness={0.9} />
      </mesh>
      {[-0.8, 0.8].map((dz) => (
        <mesh key={`leg-${dz}`} position={[0, 0.22, dz]}>
          <boxGeometry args={[0.4, 0.45, 0.08]} />
          <meshStandardMaterial color={BENCH_WOOD} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// --- Chữ "HUST" đỏ khối 3D: mỗi chữ ghép từ các hộp (font khối) -------------
// Mỗi chữ rộng 1,1 m, cao 1,8 m, dày 0,5 m; nét 0,28 m. Đoạn [dx, dy, w, h]
// tính từ góc dưới-trái của chữ.
const LETTER_SEGMENTS: Record<string, Array<[number, number, number, number]>> = {
  H: [[0, 0, 0.28, 1.8], [0.82, 0, 0.28, 1.8], [0.28, 0.76, 0.54, 0.28]],
  U: [[0, 0.28, 0.28, 1.52], [0.82, 0.28, 0.28, 1.52], [0, 0, 1.1, 0.28]],
  S: [[0, 1.52, 1.1, 0.28], [0, 0.76, 0.28, 0.76], [0, 0.76, 1.1, 0.28], [0.82, 0, 0.28, 0.76], [0, 0, 1.1, 0.28]],
  T: [[0, 1.52, 1.1, 0.28], [0.41, 0, 0.28, 1.52]],
};

function BlockLetter({ letter, x, y, z }: { letter: string; x: number; y: number; z: number }) {
  const segs = LETTER_SEGMENTS[letter] ?? [];
  return (
    <group position={[x, y, z]}>
      {segs.map(([dx, dy, w, h], i) => (
        <mesh key={`${letter}-${i}`} position={[dx + w / 2, dy + h / 2, 0]} castShadow>
          <boxGeometry args={[w, h, 0.5]} />
          <meshStandardMaterial color={HUST_RED} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// --- Biển tên vàng trên nền trắng (vẽ bằng canvas, như TextPlate) ------------
function drawLibraryName(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const text = 'THƯ VIỆN TẠ QUANG BỬU';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 88;
  // Nét 700 (không 900) + viền mỏng: chữ không quá dày, đọc rõ trên trắng.
  ctx.font = `700 ${size}px Arial, sans-serif`;
  while (ctx.measureText(text).width > w * 0.96 && size > 10) {
    size -= 2;
    ctx.font = `700 ${size}px Arial, sans-serif`;
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(90, 70, 20, 0.55)'; // viền sẫm mỏng để chữ vàng đọc được trên tường trắng
  ctx.strokeText(text, w / 2, h / 2 + 2);
  ctx.fillStyle = '#C9A227';
  ctx.fillText(text, w / 2, h / 2 + 2);
}

// --- Hộp kính / hộp trắng dùng chung (vật liệu chốt, không mặt trùng nhau) ----
function GlassBox({ p, s }: { p: [number, number, number]; s: [number, number, number] }) {
  return (
    <mesh position={p}>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={LIB_GLASS}
        emissive={LIB_GLASS}
        emissiveIntensity={1}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  );
}

function WhiteBox({ p, s, shadow = false }: {
  p: [number, number, number]; s: [number, number, number]; shadow?: boolean;
}) {
  return (
    <mesh position={p} castShadow={shadow} receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={LIB_WHITE} roughness={0.9} />
    </mesh>
  );
}

export function LibraryBuilding() {
  const clockR = LIBRARY.clock.radius; // 1,3 m — giữ đúng hằng số (đợt 4)
  const clock = LIBRARY.clock; // (38, 7,3, 23,9), mặt bắc

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

  // Lam khối đế: 13 thanh/cụm, cách nhau 0,25 m, dày 0,14 m — khe sáng giữa
  // các thanh 0,11 m, từ xa vẫn tách được từng thanh.
  const slatY = Array.from({ length: 13 }, (_, i) => 6.25 + i * 0.25);
  // Lam xanh nhỏ phía trên đồng hồ: 5 thanh, cách nhau 0,16 m.
  const blueSlatY = Array.from({ length: 5 }, (_, i) => 8.85 + i * 0.16);
  // Cửa tầng trên cùng khối giữa: 9 cửa đứng cao hẹp, cách nhau 1,2 m.
  const topWindowX = Array.from({ length: 9 }, (_, i) => 33.0 + i * 1.2);
  // Cửa khối giữa các tầng dưới: 7 nhóm/hàng, tâm cách nhau 1,5 m.
  const centerGroupX = Array.from({ length: 7 }, (_, i) => 33.5 + i * 1.5);
  // Cột sảnh: 6 cột vuông, cách nhau 1,9 m.
  const colX = [33.5, 35.4, 37.3, 39.2, 41.1, 43.0];
  // Chữ HUST: 4 chữ, mỗi chữ rộng 1,1 m, khe 0,25 m → tổng 5,15 m, tâm (38, 14).
  // Mép trái tương đối so với tâm: -(4*1,1 + 3*0,25)/2 = -2,575 (dùng trực
  // tiếp trong nhóm chữ đã xoay π; xem chú thích ở phần chữ HUST).

  return (
    <group>
      {/* ============ BỆ CHÂN (y 0..0,6) — nâng toàn bộ công trình ============ */}
      {/* Bệ sảnh (x 32,5..43,5, z 19..30): sàn sảnh + chỗ đứng của cột hiên. */}
      <mesh position={[38, 0.3, 24.5]} receiveShadow>
        <boxGeometry args={[11, 0.6, 11]} />
        <meshStandardMaterial color={STONE} roughness={0.95} />
      </mesh>
      {/* Bệ cánh tây/đông (dưới tháp, z 30..43) — bệ khối giữa đã có ở bệ sảnh. */}
      <mesh position={[30, 0.3, 36.5]} receiveShadow>
        <boxGeometry args={[5, 0.6, 13]} />
        <meshStandardMaterial color={STONE} roughness={0.95} />
      </mesh>
      <mesh position={[46, 0.3, 36.5]} receiveShadow>
        <boxGeometry args={[5, 0.6, 13]} />
        <meshStandardMaterial color={STONE} roughness={0.95} />
      </mesh>

      {/* ============ KHỐI THÁP — 3 nhịp (tường trắng, kính xanh đen) ============ */}
      {/* Khối giữa: x 32,5..43,5, z 28..43, y 0,6..32,6 — nhô trước 2 m, cao hơn nửa tầng. */}
      <mesh position={[38, (PLINTH + CENTER_TOP) / 2, 35.5]} castShadow receiveShadow>
        <boxGeometry args={[11, CENTER_TOP - PLINTH, 15]} />
        <meshStandardMaterial color={LIB_WHITE} roughness={0.9} />
      </mesh>
      {/* Cánh tây/đông: x 27,5..32,5 / 43,5..48,5, z 30..43, y 0,6..31,0. */}
      <mesh position={[30, (PLINTH + WING_TOP) / 2, 36.5]} castShadow receiveShadow>
        <boxGeometry args={[5, WING_TOP - PLINTH, 13]} />
        <meshStandardMaterial color={LIB_WHITE} roughness={0.9} />
      </mesh>
      <mesh position={[46, (PLINTH + WING_TOP) / 2, 36.5]} castShadow receiveShadow>
        <boxGeometry args={[5, WING_TOP - PLINTH, 13]} />
        <meshStandardMaterial color={LIB_WHITE} roughness={0.9} />
      </mesh>

      {/* Dải kính đứng tối, hẹp, lõm vào giữa khối giữa và cánh phải (lõi thang):
          x 43,5..44,7, z 28,5..29,9 (lùi 0,5 m sau mặt khối giữa, 0,1 m trước
          mặt cánh phải), chạy suốt chiều cao y 0,6..31,0. */}
      <GlassBox p={[44.1, (PLINTH + WING_TOP) / 2, 29.2]} s={[1.2, WING_TOP - PLINTH, 1.4]} />

      {/* --- Mặt BẮC (mặt chính, z = 28 khối giữa / z = 30 hai cánh) --- */}
      {/* Khối giữa, tầng 4..8 (5 hàng lộ trên khối đế, đúng tư liệu): 7 nhóm/
          hàng, mỗi nhóm 1 ô kính 1,2 m + 1 đố trắng (2 ô). */}
      {[4, 5, 6, 7, 8].map((f) => (
        <group key={`lib-c-n-${f}`}>
          {centerGroupX.map((x) => (
            <group key={`lib-c-n-${f}-${x}`}>
              <GlassBox p={[x, bandY(f), 27.94]} s={[1.2, 1.5, 0.08]} />
              <WhiteBox p={[x, bandY(f), 27.92]} s={[0.08, 1.5, 0.1]} />
            </group>
          ))}
        </group>
      ))}
      {/* Khối giữa, tầng trên cùng (f=9): 9 cửa đứng cao hẹp + dải xanh dương
          ngang phía trên (dưới diềm mái). */}
      {topWindowX.map((x) => (
        <GlassBox key={`lib-c-top-${x}`} p={[x, 30.4, 27.94]} s={[0.7, 2.6, 0.08]} />
      ))}
      <mesh position={[38, 32.2, 27.95]}>
        <boxGeometry args={[11, 0.4, 0.1]} />
        <meshStandardMaterial color={LIB_BLUE} roughness={0.85} />
      </mesh>
      {/* Hai cánh, mặt bắc: dải kính ngang từng tầng + đố ở ranh giới 4 nhóm.
          Tầng 9 thấp hơn một chút (cao 1,2 m thay vì 1,5 m). */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((f) => (
        <group key={`lib-w-n-${f}`}>
          <GlassBox p={[30, bandY(f), 29.94]} s={[4.6, 1.5, 0.08]} />
          <GlassBox p={[46, bandY(f), 29.94]} s={[4.6, 1.5, 0.08]} />
          {[28.75, 30.0, 31.25].map((x) => (
            <WhiteBox key={`lib-w-n-mull-${f}-${x}`} p={[x, bandY(f), 29.92]} s={[0.08, 1.5, 0.1]} />
          ))}
          {[44.75, 46.0, 47.25].map((x) => (
            <WhiteBox key={`lib-w-n-mull-e-${f}-${x}`} p={[x, bandY(f), 29.92]} s={[0.08, 1.5, 0.1]} />
          ))}
        </group>
      ))}
      <GlassBox p={[30, 30.2, 29.94]} s={[4.6, 1.2, 0.08]} />
      <GlassBox p={[46, 30.2, 29.94]} s={[4.6, 1.2, 0.08]} />
      {[28.75, 30.0, 31.25].map((x) => (
        <WhiteBox key={`lib-w-n9-mull-${x}`} p={[x, 30.2, 29.92]} s={[0.08, 1.2, 0.1]} />
      ))}
      {[44.75, 46.0, 47.25].map((x) => (
        <WhiteBox key={`lib-w-n9-mull-e-${x}`} p={[x, 30.2, 29.92]} s={[0.08, 1.2, 0.1]} />
      ))}

      {/* --- Mặt NAM (mặt sau, z = 43) — dải kính ngang, không đố --- */}
      {Array.from({ length: 10 }).map((_, f) => (
        <GlassBox key={`lib-s-${f}`} p={[38, bandY(f), 43.06]} s={[10.2, 1.5, 0.08]} />
      ))}
      {Array.from({ length: 10 }).map((_, f) => (
        <group key={`lib-sw-${f}`}>
          <GlassBox p={[30, f === 9 ? 30.2 : bandY(f), 43.06]} s={[4.6, f === 9 ? 1.2 : 1.5, 0.08]} />
          <GlassBox p={[46, f === 9 ? 30.2 : bandY(f), 43.06]} s={[4.6, f === 9 ? 1.2 : 1.5, 0.08]} />
        </group>
      ))}
      {/* Dải xanh dương dưới diềm mái khối giữa, mặt nam (đối xứng mặt bắc). */}
      <mesh position={[38, 32.2, 43.05]}>
        <boxGeometry args={[11, 0.4, 0.1]} />
        <meshStandardMaterial color={LIB_BLUE} roughness={0.85} />
      </mesh>

      {/* --- Mặt TÂY (nhìn từ hồ, x = 27,5) và mặt ĐÔNG (x = 48,5) ---
          Lưới cửa 10 hàng × 1 dải (theo tư liệu: mặt bên 8–9 hàng × 4 nhóm);
          mặt đông suy theo đối xứng với mặt tây (ghi chú trong tư liệu). */}
      {Array.from({ length: 10 }).map((_, f) => (
        <group key={`lib-side-${f}`}>
          <GlassBox p={[27.44, f === 9 ? 30.2 : bandY(f), 36.5]} s={[0.08, f === 9 ? 1.2 : 1.5, 11]} />
          <GlassBox p={[48.56, f === 9 ? 30.2 : bandY(f), 36.5]} s={[0.08, f === 9 ? 1.2 : 1.5, 11]} />
        </group>
      ))}

      {/* ============ MÁI PHẲNG + DIỀM NHÔ + CẤU TRÚC TRÊN MÁI ============ */}
      {/* Mái cánh (diềm nhô 0,4 m quanh 3 cạnh hở). */}
      <WhiteBox p={[30, 31.2, 36.5]} s={[5.8, 0.4, 13.8]} shadow />
      <WhiteBox p={[46, 31.2, 36.5]} s={[5.8, 0.4, 13.8]} shadow />
      {/* Mái khối giữa (diềm nhô 0,4 m) — mặt trên xám nhạt. */}
      <mesh position={[38, 32.8, 35.5]} castShadow receiveShadow>
        <boxGeometry args={[11.8, 0.4, 15.8]} />
        <meshStandardMaterial color={ROOF_GREY} roughness={0.95} />
      </mesh>
      {/* Cụm ăng-ten đen cao mảnh phía trên-trái mái khối giữa (theo ảnh tham
          khảo: phía trên-trái khi nhìn chính diện = phía đông của mái). */}
      {[41.0, 41.5, 42.0].map((x) => (
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
        <boxGeometry args={[2.2, 1.5, 2.2]} />
        <meshStandardMaterial color={DARK_BOX} roughness={0.9} />
      </mesh>
      {/* 2 hộp vuông nhỏ ở hai đầu mái cánh. */}
      <mesh position={[29, 31.8, 36]} castShadow>
        <boxGeometry args={[1, 0.8, 1]} />
        <meshStandardMaterial color={ROOF_GREY} roughness={0.95} />
      </mesh>
      <mesh position={[47, 31.8, 36]} castShadow>
        <boxGeometry args={[1, 0.8, 1]} />
        <meshStandardMaterial color={ROOF_GREY} roughness={0.95} />
      </mesh>

      {/* ============ KHỐI ĐẾ MẶT TRƯỚC (x 32,5..43,5, z 24..30, y 6..11) ============ */}
      {/* Hai trụ bên tầng trệt (tây/đông) — giữa là sảnh lõm vào. */}
      <WhiteBox p={[33.5, 3.3, 27]} s={[2, 5.4, 6]} shadow />
      <WhiteBox p={[42.5, 3.3, 27]} s={[2, 5.4, 6]} shadow />
      {/* Tầng trên khối đế (y 6..11): tường trước mang lam + đồng hồ + biển tên. */}
      <WhiteBox p={[38, 8.5, 27]} s={[11, 5, 6]} shadow />

      {/* --- 2 cụm lam ngang lớn màu xám, hai bên đồng hồ --- */}
      {/* Nền SÁNG sau lam (lùi 0,02 m sau mặt đế) để từng thanh lam tối đọc
          tách nhau trên nền sáng — xem ghi chú ở LAM_BACK (bản cũ). */}
      {[34.6, 41.4].map((x) => (
        <mesh key={`lib-lam-back-${x}`} position={[x, 7.7, 24.03]}>
          <boxGeometry args={[3.8, 3.2, 0.06]} />
          <meshStandardMaterial color={LAM_BACK} roughness={0.9} />
        </mesh>
      ))}
      {/* 13 thanh ngang/cụm, nghiêng 26° (mép ngoài thấp), nhô 0,28 m khỏi tường;
          bóng đổ thật nhờ hình học có chiều sâu, không phải tấm kính đen. */}
      {[34.6, 41.4].map((xc) =>
        slatY.map((y) => (
          <mesh key={`lib-slat-${xc}-${y}`} position={[xc, y, 24.2]} rotation-x={-0.45} castShadow>
            <boxGeometry args={[3.7, 0.14, 0.07]} />
            <meshStandardMaterial color={SLAT} roughness={0.85} />
          </mesh>
        )),
      )}
      {/* Khung trắng quanh mỗi cụm lam (đứng 2 bên + ngang trên/dưới). */}
      {[32.6, 36.6, 39.4, 43.4].map((x) => (
        <WhiteBox key={`lib-lam-frame-v-${x}`} p={[x, 7.7, 24.05]} s={[0.14, 3.2, 0.08]} />
      ))}
      {[34.6, 41.4].map((x) => (
        <group key={`lib-lam-frame-h-${x}`}>
          <WhiteBox p={[x, 6.05, 24.05]} s={[3.8, 0.14, 0.08]} />
          <WhiteBox p={[x, 9.35, 24.05]} s={[3.8, 0.14, 0.08]} />
        </group>
      ))}

      {/* ============ ĐỒNG HỒ — giữa khối đế, trên lối vào (y 7,3) ============ */}
      {/* Viền xanh (torus) + mặt trắng + kim đen 10:10, đúng LIBRARY.clock.
          Group xoay π quanh Y để mặt quay về −Z (phía bắc của scene); kim lùi
          0,08 m về phía bắc của mặt (cục bộ +Z). Cách đặt này đã kiểm bằng ảnh
          đợt 3: số 9 trái / 3 phải đọc đúng, không đảo. */}
      <group position={[clock.x, clock.y, clock.z]} rotation-y={Math.PI}>
        <mesh>
          <circleGeometry args={[clockR, 48]} />
          <meshStandardMaterial map={clockTex} roughness={0.6} />
        </mesh>
        <mesh>
          <torusGeometry args={[clockR + 0.04, 0.08, 12, 64]} />
          <meshStandardMaterial color={LIB_BLUE} roughness={0.7} />
        </mesh>
        <group position={[0, 0, 0.08]}>
          <group rotation-z={-((10 * 30 + 10 * 0.5) * Math.PI) / 180}>
            <mesh position={[0, 0.365, 0]}>
              <boxGeometry args={[0.08, 0.73, 0.05]} />
              <meshStandardMaterial color={INK} roughness={0.6} />
            </mesh>
          </group>
          <group rotation-z={-((10 * 6) * Math.PI) / 180}>
            <mesh position={[0, 0.505, 0]}>
              <boxGeometry args={[0.06, 1.01, 0.05]} />
              <meshStandardMaterial color={INK} roughness={0.6} />
            </mesh>
          </group>
        </group>
      </group>
      {/* 2 chấm đen nhỏ hai bên đồng hồ (đèn/loa theo tư liệu). */}
      {[36.6, 39.4].map((x) => (
        <mesh key={`lib-clock-dot-${x}`} position={[x, clock.y, clock.z - 0.02]}>
          <sphereGeometry args={[0.09, 12, 10]} />
          <meshStandardMaterial color={INK} roughness={0.6} />
        </mesh>
      ))}
      {/* Khối lam xanh dương nhỏ phía trên đồng hồ (5 thanh ngang). */}
      {blueSlatY.map((y) => (
        <mesh key={`lib-blue-slat-${y}`} position={[38, y, 23.95]} castShadow>
          <boxGeometry args={[2.3, 0.1, 0.06]} />
          <meshStandardMaterial color={LIB_BLUE} roughness={0.85} />
        </mesh>
      ))}
      {/* Gờ mái đế thấp phía trước (lớp xanh thứ hai, song song mái chính
          khi nhìn chéo) + mái đế xanh dương đậm. */}
      <mesh position={[38, 9.95, 24.0]} castShadow>
        <boxGeometry args={[11, 0.3, 1.0]} />
        <meshStandardMaterial color={LIB_BLUE} roughness={0.85} />
      </mesh>
      <mesh position={[38, 11.15, 27]} castShadow>
        <boxGeometry args={[11, 0.3, 6]} />
        <meshStandardMaterial color={LIB_BLUE} roughness={0.85} />
      </mesh>

      {/* Biển tên vàng trên mặt tháp (đợt 4, đã sửa vị trí): y 13,8, rộng 8 m —
          NGAY TRÊN mái xanh của khối đế (y 11,3) nhưng DƯỚI hàng cửa tầng 4
          (y 14,55..16,05). Vị trí cũ y 12,3 BỊ MÁI ĐẾ CHE KHUẤT từ sân trước
          (tia nhìn từ camera thấp qua mép mái z=24 chạm tường tháp ở
          y ≈ 12,7; biển 11,8..12,8 gần như khuất hẳn). Chữ giữ nguyên. */}
      <LabelPlane
        textureKey="library-name"
        canvasW={1024}
        canvasH={120}
        draw={drawLibraryName}
        size={[8, 0.93]}
        position={[38, 13.8, 27.9]}
        rotation={[0, Math.PI, 0]}
      />

      {/* ============ SẢNH — mái hiên + 6 cột vuông + cửa kính + bậc ============ */}
      {/* Mái hiên phẳng trắng/xám nhô ra z 18..24,5 + dầm ngang dưới mép mái. */}
      <mesh position={[38, 5.8, 21.25]} castShadow>
        <boxGeometry args={[11, 0.4, 6.5]} />
        <meshStandardMaterial color={LIB_WHITE} roughness={0.9} />
      </mesh>
      <mesh position={[38, 5.4, 24.35]} castShadow>
        <boxGeometry args={[11, 0.4, 0.3]} />
        <meshStandardMaterial color={LIB_WHITE} roughness={0.9} />
      </mesh>
      {/* Trần hiên (soffit) — tấm mỏng xám nhạt KHÔNG CHỊU SÁNG
          (meshBasicMaterial) ngay dưới mái hiên + dưới dầm. Lý do: mặt dưới
          của mái/dầm trắng nhận màu nền của hemisphereLight (#8a9a72, xanh
          ô-liu) nên render ra TRẦN XANH — sai tư liệu (mái hiên trắng/xám).
          Tấm basic giữ đúng màu xám nhạt ở mọi góc nhìn; không đổi ánh sáng
          toàn cục (ảnh hưởng cả campus). */}
      <mesh position={[38, 5.56, 21.25]}>
        <boxGeometry args={[11, 0.08, 6.5]} />
        <meshBasicMaterial color="#DDDCD7" />
      </mesh>
      <mesh position={[38, 5.16, 24.35]}>
        <boxGeometry args={[11, 0.08, 0.3]} />
        <meshBasicMaterial color="#DDDCD7" />
      </mesh>
      {/* 6 cột vuông xám to (0,5×0,5 m), thưa, đỡ mái hiên. */}
      {colX.map((x) => (
        <mesh key={`lib-col-${x}`} position={[x, 3.3, 19.5]} castShadow>
          <boxGeometry args={[0.5, 5.4, 0.5]} />
          <meshStandardMaterial color={COLUMN_GREY} roughness={0.9} />
        </mesh>
      ))}
      {/* Cửa kính đôi ở giữa + panel kính xanh đậm hai bên, khung dọc xanh dương.
          Bên trong tối (hộp tối lùi 0,1 m sau cửa). */}
      <mesh position={[38, 3.3, 27.3]}>
        <boxGeometry args={[7, 5.4, 1.4]} />
        <meshStandardMaterial color={INTERIOR_DARK} roughness={1} />
      </mesh>
      {[37.3, 38.7].map((x) => (
        <GlassBox key={`lib-door-${x}`} p={[x, 2.6, 26.5]} s={[1.4, 4.0, 0.06]} />
      ))}
      {[35.7, 40.3].map((x) => (
        <GlassBox key={`lib-door-side-${x}`} p={[x, 2.6, 26.5]} s={[1.8, 4.0, 0.06]} />
      ))}
      {[36.6, 38.0, 39.4].map((x) => (
        <mesh key={`lib-door-frame-v-${x}`} position={[x, 2.6, 26.5]}>
          <boxGeometry args={[0.12, 4.0, 0.08]} />
          <meshStandardMaterial color={LIB_BLUE} roughness={0.85} />
        </mesh>
      ))}
      {[0.66, 4.54].map((y) => (
        <mesh key={`lib-door-frame-h-${y}`} position={[38, y, 26.5]}>
          <boxGeometry args={[2.8, 0.12, 0.08]} />
          <meshStandardMaterial color={LIB_BLUE} roughness={0.85} />
        </mesh>
      ))}
      {/* Bậc tiếp cận rộng (4 bậc, mỗi bậc cao 0,15 m, sâu 0,5 m) + bậc bên
          2 đầu (mỗi đầu 1 khối 2 bậc). */}
      {[
        { y: 0.525, z: 18.75 },
        { y: 0.375, z: 18.25 },
        { y: 0.225, z: 17.75 },
        { y: 0.075, z: 17.25 },
      ].map(({ y, z }) => (
        <mesh key={`lib-step-${z}`} position={[38, y, z]} receiveShadow>
          <boxGeometry args={[11, 0.15, 0.5]} />
          <meshStandardMaterial color={STONE} roughness={0.95} />
        </mesh>
      ))}
      {[32, 44].map((x) => (
        <mesh key={`lib-step-side-${x}`} position={[x, 0.15, 18]} receiveShadow>
          <boxGeometry args={[1, 0.3, 2]} />
          <meshStandardMaterial color={STONE} roughness={0.95} />
        </mesh>
      ))}

      {/* ============ TIỀN CẢNH PHÍA BẮC — sân trước mới (z 10..19) ============ */}
      {/* Lối đi chính màu nâu đỏ (x 24..33, z 12..16) + sân lát xám trước sảnh
          (x 33..46, z 12..16). Vẽ trên mặt plaza (y 0,015) ở y ~0,035. */}
      <mesh rotation-x={-Math.PI / 2} position={[28.5, 0.035, 14]} receiveShadow>
        <planeGeometry args={[9, 4]} />
        <meshStandardMaterial color={WALK_RED} roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[39.5, 0.035, 14]} receiveShadow>
        <planeGeometry args={[13, 4]} />
        <meshStandardMaterial color={YARD_GREY} roughness={0.95} />
      </mesh>
      {/* 2 bồn cỏ đối xứng hai bên lối đi chính (bắc: x 25..32, z 10..12;
          nam: x 25..32, z 16..19) + bồn cỏ lớn đầu đông (x 46..49,5, z 11..19). */}
      <mesh rotation-x={-Math.PI / 2} position={[28.5, 0.04, 11]} receiveShadow>
        <planeGeometry args={[7, 2]} />
        <meshStandardMaterial color={LAWN} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[28.5, 0.04, 17.5]} receiveShadow>
        <planeGeometry args={[7, 3]} />
        <meshStandardMaterial color={LAWN} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[47.75, 0.04, 15]} receiveShadow>
        <planeGeometry args={[3.5, 8]} />
        <meshStandardMaterial color={LAWN} roughness={1} />
      </mesh>
      {/* Cây tròn tán lớn trong bồn cỏ: bồn nam 1 cây lớn + bồn bắc 1 cây nhỏ
          + bồn đông 1 cây tròn. */}
      <LibTree x={28.5} z={17.5} trunkH={2.2} canopyR={1.5} canopyY={3.2} />
      <LibTree x={28.5} z={11} trunkH={1.6} canopyR={0.9} canopyY={2.4} />
      <LibTree x={47.5} z={15} trunkH={1.8} canopyR={1.2} canopyY={2.7} />
      {/* 2 cây cọ cao ở bồn cỏ đầu đông (theo tư liệu: đầu phía phải khi nhìn
          từ mặt tiền có bồn lớn với 2 cây cọ cao). */}
      <LibFanPalm x={47} z={12.5} />
      <LibFanPalm x={48.5} z={17.5} />
      {/* Ghế gỗ nâu nhỏ ở bồn cỏ đầu đông, mặt hướng ra sân. */}
      <LibBench x={48.5} z={13.5} />
      {/* Đèn 5 bóng dọc mép lối đi + trong bồn cỏ; đèn 3 bóng nhỏ ở bồn đông. */}
      <LibLamp x={26} z={11} balls={5} />
      <LibLamp x={30} z={11} balls={5} />
      <LibLamp x={26} z={17.5} balls={5} />
      <LibLamp x={30} z={17.5} balls={5} />
      <LibLamp x={46.8} z={12} balls={3} />
      <LibLamp x={46.8} z={18} balls={3} />
      {/* Thùng rác xanh nhỏ ở 2 mép lối đi chính, gần bồn cỏ. */}
      {[12.4, 15.6].map((z) => (
        <mesh key={`lib-bin-${z}`} position={[24.8, 0.3, z]} castShadow>
          <cylinderGeometry args={[0.25, 0.22, 0.6, 12]} />
          <meshStandardMaterial color={BIN_GREEN} roughness={0.8} />
        </mesh>
      ))}
      {/* Chữ "HUST" đỏ khối 3D trên bệ đen, trên trục giữa sân xám — rộng
          ~5,15 m (khoảng nửa chiều rộng sảnh 11 m), mặt chữ hướng về bắc
          (ra phía đường vào). Nhóm chữ xoay π quanh Y (như mặt đồng hồ):
          nhìn từ phía bắc (hướng vào sảnh) chữ phải đọc H-U-S-T từ trái
          sang phải — đặt trực tiếp theo +X sẽ bị ĐẢO ("TƧUH") vì từ phía
          bắc, +X (đông) nằm bên TRÁI người nhìn. */}
      <mesh position={[38, 0.25, 14]} castShadow receiveShadow>
        <boxGeometry args={[5.6, 0.5, 1.2]} />
        <meshStandardMaterial color={INK} roughness={0.85} />
      </mesh>
      <group position={[38, 0.5, 14]} rotation={[0, Math.PI, 0]}>
        {['H', 'U', 'S', 'T'].map((letter, i) => (
          <BlockLetter
            key={`hust-${letter}`}
            letter={letter}
            x={-2.575 + i * 1.35}
            y={0}
            z={0}
          />
        ))}
      </group>

      {/* ============ SÂN SAU PHÍA NAM — đảo cỏ + lộc vừng (giữ nguyên) ============ */}
      <mesh rotation-x={-Math.PI / 2} position={[30, 0.03, 52]} receiveShadow>
        <circleGeometry args={[3, 32]} />
        <meshStandardMaterial color={LEAF} roughness={1} />
      </mesh>
      <LibTree x={30} z={52} trunkH={1.8} canopyR={1.2} canopyY={2.6} />
      <LibPalm x={33} z={15.5} />
      <LibPalm x={43} z={15.5} />
      {/* Lộc vừng: cụm 3 tán lệch nhau thay vì 1 cầu tròn hoàn hảo. */}
      <group position={[49, 0, 52]}>
        <mesh position={[0, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.22, 2.2, 10]} />
          <meshStandardMaterial color={TRUNK} roughness={1} />
        </mesh>
        <mesh position={[0, 3.0, 0]} castShadow>
          <sphereGeometry args={[1.05, 16, 12]} />
          <meshStandardMaterial color={RED_LEAF} roughness={1} />
        </mesh>
        <mesh position={[0.85, 2.6, 0.35]} castShadow>
          <sphereGeometry args={[0.7, 14, 10]} />
          <meshStandardMaterial color={RED_LEAF} roughness={1} />
        </mesh>
        <mesh position={[-0.7, 2.7, -0.3]} castShadow>
          <sphereGeometry args={[0.65, 14, 10]} />
          <meshStandardMaterial color={RED_LEAF} roughness={1} />
        </mesh>
      </group>
    </group>
  );
}
