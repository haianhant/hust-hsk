// ---------------------------------------------------------------------------
// C1Building.tsx — Nhà C1 dựng lại theo brief sửa kiến trúc ngoại thất
// (docs/architecture-rework-brief.md §2 + docs/reference-visual.md §2).
//
// HợP ĐỒNG TÍCH HỢP: component này THAY THẾ `BuildingC1` trong Landmarks.tsx
// (kèm cả `WindTower` cũ — chỉ BuildingC1 dùng nó). KHÔNG bao gồm logo
// "I LOVE BK" — logo đó giữ nguyên trong Landmarks.tsx (`ILoveBK`).
// Mọi vị trí/kích thước lấy từ hằng số `C1` trong lib/campus.ts; footprint
// giữ nguyên như code cũ (xem AABB ở cuối file). Không đụng chức năng học tập.
//
// BỐ CỤC MẶT TIỀN NAM (z = -49, nhìn từ quảng trường, +Z là hướng nam):
//   - Hai cánh: hành lang mở (loggia) — cột mảnh 0,28 m, mép sàn, lan can;
//     cửa/kính LÙI 3,0 m sau lớp cột (tường lõi tại z = -52).
//   - Giữa: tháp hoa gió (x -63,1..-52,9) nhô 1,6 m khỏi mặt tiền, lưới hoa
//     gió đục lỗ THẬT (panel ExtrudeGeometry, khe chữ nhật đứng nhỏ dày
//     đặc, so le), sau lưới là hốc tối 1,5 m + tường tối + mép sàn các
//     tầng — nhìn xuyên được.
//   - Phải tháp: dải tường đặc (x -52,9..-47,3) đặt biểu trưng dọc đỏ/vàng
//     + chữ "C1" nâu-đồng thấp bên dưới; sảnh có mái hiên phẳng, cột đỡ,
//     cửa lùi sâu.
//   - Mái: 9 vòm nông (đúng 9, cao 0,5 m) dạng vỏ có bề dày 0,28 m + cạnh
//     mái sáng, đặt trên tấm mái dày 0,35 m.
//   - Sân: đường lát dẫn vào sảnh, 2 bồn cỏ + hoa giấy hai bên, 2 cây Lipa
//     tại đúng vị trí C1.lipaTrees; KHÔNG có vật gì chắn trục tháp hoa gió.
//
// CHỐNG NHẤP NHÁY: mọi cặp mặt song song kề nhau (khung/kính/thanh chia,
// lưới/khung, tháp/tường lõi) lệch nhau ≥ 0,02 m; các khối giao nhau được
// nhúng 0,02–0,05 m thay vì đặt khít mặt.
// ---------------------------------------------------------------------------

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { C1, C1_BENCHES } from '../../lib/campus';
import type { TimeOfDay } from '../../lib/playerState';
import { ExtrudedText3D, FramedSignBox3D } from './Signage3D';
import { LabelPlane } from './TextPlate';
import {
  createSeededRandom,
  makeFoliageCanopyTexture,
  makeGraniteStoneTexture,
  makeWeatheredConcreteTexture,
  makeWoodGrainTexture,
} from './materials';
import { ImprovedTree } from './Trees';

// --- Bảng màu chốt (reference-visual §0) ------------------------------------
const C1_WALL = '#F4F3EF'; // tường C1, trắng hơi ngả kem
const C1_ROOF = '#8E8A80'; // mái 9 sóng, xám-nâu bạc màu
const C1_GLASS = '#6E7F8C'; // kính xám-xanh
const PLINTH_BLACK = '#1A1A1A';
const TOWER_DARK = '#232B31'; // hốc tối sau lưới hoa gió
const STEP_STONE = '#3A3A3A'; // bậc tam cấp, đá xám-đen
const PORCH_STONE = '#C9C7C0'; // bệ sảnh + lề bồn cỏ, đá xám nhạt
const PATH_STONE = '#B7B0A2'; // đường lát dẫn vào sảnh
const LAWN_GREEN = '#6F9A52'; // cỏ bồn
const TRUNK = '#6B5138';
const LAMP_GREEN = '#14532D'; // cột đèn xanh đậm
const BENCH_WOOD = '#7A5230'; // ghế gỗ nâu
const BENCH_IRON = '#1A1A1A'; // khung ghế sắt đen
const POT_BROWN = '#8A5A3B'; // chậu hoa

// --- Kích thước dẫn xuất từ lib/campus.ts ------------------------------------
const CX = C1.center.x; // -58 — trục lối vào / cửa lớp học mô phỏng
const CZ = C1.center.z; // -56
const W = C1.size.x; // 48
const H = C1.floors * C1.floorHeight; // 14,4
const FH = C1.floorHeight; // 3,6
const SOUTH_Z = CZ + C1.size.z / 2; // -49 — mặt tiền nam (ra quảng trường)
const NORTH_Z = CZ - C1.size.z / 2; // -63 — mặt bắc
const CORE_SOUTH_Z = SOUTH_Z - 3.0; // -52 — tường lõi lùi 3,0 m sau hàng cột
const CORE_DEPTH = SOUTH_Z - NORTH_Z - 3.0; // 11,0 — thân nhà đặc

// Cánh mặt đứng: tây x -82..-63,1 (tháp hoa gió), đông x -47,3..-34
// (dải tường biểu trưng x -52,9..-47,3 nằm giữa tháp và cánh đông).
const WEST_COLS = [-82, -78.85, -75.7, -72.55, -69.4, -66.25, -63.1];
const EAST_COLS = [-47.3, -43.975, -40.65, -37.325, -34];
const WEST_BAYS = [-80.425, -77.275, -74.125, -70.975, -67.825, -64.675];
const EAST_BAYS = [-45.6375, -42.3125, -38.9875, -35.6625];
const TOWER_BAYS = [-61.1665, -58, -54.8335]; // nhịp cửa sau tháp (tầng 2–4)
const NORTH_BAYS = [-80, -76, -72, -68, -64, -60, -56, -52, -48, -44, -40, -36];

// --- Gộp nhiều hộp cùng vật liệu thành một BufferGeometry ---------------------
type BoxSpec = { w: number; h: number; d: number; x: number; y: number; z: number };

function mergeBoxes(specs: BoxSpec[]): THREE.BufferGeometry {
  const geos = specs.map((s) => {
    const g = new THREE.BoxGeometry(s.w, s.h, s.d);
    g.translate(s.x, s.y, s.z);
    return g;
  });
  let vCount = 0;
  let iCount = 0;
  for (const g of geos) {
    vCount += g.attributes.position.count;
    iCount += (g.index as THREE.BufferAttribute).count;
  }
  const pos = new Float32Array(vCount * 3);
  const nor = new Float32Array(vCount * 3);
  const uv = new Float32Array(vCount * 2);
  const idx = new Uint32Array(iCount);
  let vo = 0;
  let io = 0;
  for (const g of geos) {
    const p = g.attributes.position.array as Float32Array;
    const n = g.attributes.normal.array as Float32Array;
    const u = g.attributes.uv.array as Float32Array;
    pos.set(p, vo * 3);
    nor.set(n, vo * 3);
    uv.set(u, vo * 2);
    const gi = (g.index as THREE.BufferAttribute).array as Uint16Array | Uint32Array;
    for (let k = 0; k < gi.length; k++) idx[io + k] = gi[k] + vo;
    vo += g.attributes.position.count;
    io += gi.length;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

// --- Panel hoa gió: tấm đục lỗ khe CHỮ NHẬT ĐỨNG nhỏ, MẬT ĐỘ CAO --------
// Theo ảnh Tuổi Trẻ (c1-stele-brief §2): lưới ô nhỏ dày đặc dạng khe/khối
// chữ nhật đứng lặp đều — KHÔNG phải thoi (bản cũ dùng thoi là sai kiểu lỗ).
// Khe 0,10 × 0,30 m, bước ngang 0,24 m, bước dọc 0,44 m, hàng lẻ lệch nửa
// bước; ép dày 0,12 m. Một panel ~2,83 × 3,18 m có 10 × 6 = 60 khe.
// Trắng = cấu kiện có bề dày; tối = khoảng rỗng + tường tối lùi 1,5 m sau.
function makeLatticePanelGeo(cellW: number, cellH: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-cellW / 2, -cellH / 2);
  shape.lineTo(cellW / 2, -cellH / 2);
  shape.lineTo(cellW / 2, cellH / 2);
  shape.lineTo(-cellW / 2, cellH / 2);
  shape.closePath();
  const sw = 0.1; // rộng khe
  const sh = 0.3; // cao khe
  const sx = 0.24; // bước ngang
  const sy = 0.44; // bước dọc
  const nx = Math.max(1, Math.floor((cellW - 0.28) / sx));
  const ny = Math.max(1, Math.floor((cellH - 0.28) / sy));
  for (let iy = 0; iy < ny; iy++) {
    // Hàng lẻ lệch nửa bước ngang (lưới so le như ảnh).
    const off = iy % 2 === 1 ? sx / 2 : 0;
    for (let ix = 0; ix < nx; ix++) {
      const cx = (ix - (nx - 1) / 2) * sx + off;
      // Khe lệch mép thì bỏ (không cắt sát viền panel).
      if (Math.abs(cx) + sw / 2 > cellW / 2 - 0.12) continue;
      const cy = (iy - (ny - 1) / 2) * sy;
      const hole = new THREE.Path();
      hole.moveTo(cx - sw / 2, cy - sh / 2);
      hole.lineTo(cx + sw / 2, cy - sh / 2);
      hole.lineTo(cx + sw / 2, cy + sh / 2);
      hole.lineTo(cx - sw / 2, cy + sh / 2);
      hole.closePath();
      shape.holes.push(hole);
    }
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
  g.translate(0, 0, -0.06);
  return g;
}

// --- Một ô cửa/kính trên tường lùi -------------------------------------------
// Khung trắng 4 thanh + kính lùi 0,0475 m sau mặt khung + thanh chia ô lùi
// 0,025 m sau mặt khung; kính hẹp hơn khe 0,02 mỗi bên để không chạm khung.
// wallZ: mặt tường; dir +1 = mặt hướng nam, -1 = mặt hướng bắc.
function windowSpecs(
  cx: number,
  cy: number,
  w: number,
  h: number,
  wallZ: number,
  dir: 1 | -1,
  frame: BoxSpec[],
  glass: BoxSpec[],
  mullion: BoxSpec[],
) {
  const bar = 0.1;
  const zF = wallZ + dir * 0.06; // tâm khung (dày 0,10 → mặt trước +0,11)
  const zG = wallZ + dir * 0.0375; // tâm kính (dày 0,05 → mặt trước +0,0625)
  const zM = wallZ + dir * 0.055; // tâm thanh chia (dày 0,06 → mặt trước +0,085)
  frame.push(
    { w, h: bar, d: 0.1, x: cx, y: cy + h / 2 - bar / 2, z: zF },
    { w, h: bar, d: 0.1, x: cx, y: cy - h / 2 + bar / 2, z: zF },
    { w: bar, h: h - 2 * bar, d: 0.1, x: cx - w / 2 + bar / 2, y: cy, z: zF },
    { w: bar, h: h - 2 * bar, d: 0.1, x: cx + w / 2 - bar / 2, y: cy, z: zF },
  );
  const iw = w - 2 * bar - 0.04;
  const ih = h - 2 * bar - 0.04;
  glass.push({ w: iw, h: ih, d: 0.05, x: cx, y: cy, z: zG });
  mullion.push(
    { w: 0.07, h: ih - 0.02, d: 0.06, x: cx, y: cy, z: zM },
    { w: iw - 0.02, h: 0.07, d: 0.06, x: cx, y: cy, z: zM },
  );
}

// --- Tháp ốp gạch hoa gió -----------------------------------------------------
// Khung: 2 trụ biên + gân dọc/ngang trắng; lưới panel đục lỗ thật; phía sau
// là hốc tối (tường tối lùi 1,5 m + mép sàn các tầng) nên nhìn xuyên được.
// Hệ tọa độ CỤC BỘ: gốc tại `position`, mặt trước hướng +Z, y = 0 tại mặt đất.
//   latticeBottom: cao độ bắt đầu vùng lưới (tháp giữa: 3,85 = mặt trên mái
//     sảnh; tháp đầu hồi: 0,6 = trên bệ đặc).
//   baseY: cao độ chân trụ (tháp giữa đứng trên bệ sảnh 0,75 m).
//   solidBase: lấp đặc phần dưới vùng lưới (tháp đầu hồi).
//   bottomRib: có gân đáy toàn chiều sâu ở latticeBottom (tháp đầu hồi;
//     tháp giữa KHÔNG có — mái sảnh đóng vai trò tấm sàn tầng 2).
function WindTower({
  position,
  rotationY = 0,
  w,
  h,
  d,
  cols,
  latticeBottom,
  baseY,
  solidBase,
  bottomRib,
  isNight = false,
}: {
  position: [number, number, number];
  rotationY?: number;
  w: number;
  h: number;
  d: number;
  cols: number;
  latticeBottom: number;
  baseY: number;
  solidBase: boolean;
  bottomRib: boolean;
  isNight?: boolean;
}) {
  const pierW = 0.5;
  const ribW = 0.3;
  const innerW = w - 2 * pierW;
  const cellW = (innerW - (cols - 1) * ribW) / cols;
  const zoneTop = h - 0.3; // dưới dầm nóc
  const zoneH = zoneTop - latticeBottom;
  const rows = 3;
  const ribCount = bottomRib ? rows : rows - 1;
  const rowH = (zoneH - 0.3 * ribCount) / rows;
  const rowY0 = (i: number) => latticeBottom + (bottomRib ? 0.3 : 0) + i * (rowH + 0.3);
  const midRibY0 = (j: number) =>
    latticeBottom + (bottomRib ? 0.3 : 0) + (j + 1) * rowH + j * 0.3;

  // Panel lưới nhỏ hơn ô 0,04 mỗi chiều để mép panel không trùng mặt gân.
  const latticeGeo = useMemo(
    () => makeLatticePanelGeo(cellW - 0.04, rowH - 0.04),
    [cellW, rowH],
  );
  useEffect(() => () => latticeGeo.dispose(), [latticeGeo]);

  const { whiteGeo, darkGeo } = useMemo(() => {
    const white: BoxSpec[] = [];
    const dark: BoxSpec[] = [];
    // Hai trụ biên (đỉnh thấp hơn dầm nóc 0,02 để không trùng mặt).
    const pierH = h - baseY - 0.02;
    for (const s of [-1, 1]) {
      white.push({
        w: pierW, h: pierH, d,
        x: s * (w / 2 - pierW / 2), y: baseY + pierH / 2, z: 0,
      });
    }
    // Gân dọc giữa các cột ô (mặt trước nhô 0,06 khỏi mặt lưới).
    for (let j = 0; j < cols - 1; j++) {
      const x = -innerW / 2 + cellW + ribW / 2 + j * (cellW + ribW);
      white.push({
        w: ribW, h: zoneH - 0.04, d: 0.16,
        x, y: latticeBottom + zoneH / 2, z: d / 2 - 0.04,
      });
    }
    // Gân đáy toàn chiều sâu (chỉ tháp đầu hồi).
    if (bottomRib) {
      white.push({ w: innerW, h: 0.3, d, x: 0, y: latticeBottom + 0.15, z: 0 });
    }
    // Gân ngang giữa các hàng ô (mặt trước nhô 0,02 khỏi mặt lưới).
    for (let j = 0; j < rows - 1; j++) {
      white.push({
        w: innerW, h: 0.3, d: 0.1,
        x: 0, y: midRibY0(j) + 0.15, z: d / 2 - 0.05,
      });
    }
    // Dầm nóc + tấm đậy nóc.
    white.push({ w, h: 0.3, d, x: 0, y: h - 0.15, z: 0 });
    white.push({ w: w + 0.4, h: 0.25, d: d + 0.4, x: 0, y: h + 0.145, z: 0 });
    // Bệ đặc dưới vùng lưới (chỉ tháp đầu hồi).
    if (solidBase) {
      white.push({
        w: innerW - 0.04, h: latticeBottom - 0.02, d: d - 0.2,
        x: 0, y: (latticeBottom - 0.02) / 2, z: -0.05,
      });
    }
    // Mép sàn các tầng bên trong hốc tối (nhúng 0,07 vào tường tối).
    for (let j = 0; j < rows - 1; j++) {
      white.push({
        w: innerW - 0.04, h: 0.15, d: d - 0.45,
        x: 0, y: midRibY0(j) + 0.15, z: -0.125,
      });
    }
    // Tường tối sau lưới: hẹp hơn khe 0,04 mỗi bên, lùi 1,5 m sau mặt lưới.
    dark.push({
      w: innerW - 0.04, h: zoneH - 0.04, d: 0.1,
      x: 0, y: latticeBottom + zoneH / 2, z: -d / 2 + 0.12,
    });
    return { whiteGeo: mergeBoxes(white), darkGeo: mergeBoxes(dark) };
  }, [w, h, d, cols, latticeBottom, baseY, solidBase, bottomRib,
    innerW, cellW, zoneTop, zoneH, rowH]);
  useEffect(() => () => {
    whiteGeo.dispose();
    darkGeo.dispose();
  }, [whiteGeo, darkGeo]);

  const cells: Array<[number, number]> = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      cells.push([
        -innerW / 2 + cellW / 2 + j * (cellW + ribW),
        rowY0(i) + rowH / 2,
      ]);
    }
  }

  return (
    <group position={position} rotation-y={rotationY}>
      <mesh geometry={whiteGeo} castShadow receiveShadow>
        <meshStandardMaterial color={C1_WALL} roughness={0.9} />
      </mesh>
      <mesh geometry={darkGeo}>
        <meshStandardMaterial
          color={isNight ? '#8A6330' : TOWER_DARK}
          emissive={isNight ? '#FFB84D' : '#000000'}
          emissiveIntensity={isNight ? 0.55 : 0}
          roughness={0.95}
        />
      </mesh>
      {cells.map(([x, y], i) => (
        <mesh
          key={i}
          geometry={latticeGeo}
          position={[x, y, d / 2 - 0.06]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={C1_WALL} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// --- Cây Lipa tán phân lớp có vân vỏ cây + tán lá PBR & đung đưa nhẹ ----------
function LocalTree({ x, z, canopyColor }: { x: number; z: number; canopyColor: string }) {
  return (
    <ImprovedTree
      x={x}
      z={z}
      trunkH={3.2}
      canopyR={2.4}
      canopyY={4.7}
      canopyColor={canopyColor}
      withTreePit={false}
    />
  );
}

// --- Ghế gỗ nâu, khung sắt đen -------------------------------------------------
function LocalBench({ x, z, woodTex }: { x: number; z: number; woodTex?: THREE.CanvasTexture }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.8, 0.12, 0.55]} />
        <meshStandardMaterial color={BENCH_WOOD} map={woodTex} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.78, -0.24]} castShadow>
        <boxGeometry args={[1.8, 0.55, 0.1]} />
        <meshStandardMaterial color={BENCH_WOOD} map={woodTex} roughness={0.85} />
      </mesh>
      {[-0.8, 0.8].map((dx) => (
        <mesh key={dx} position={[dx, 0.22, 0]}>
          <boxGeometry args={[0.08, 0.45, 0.5]} />
          <meshStandardMaterial color={BENCH_IRON} roughness={0.5} metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// --- Cột đèn xanh đậm, 2 quả cầu trắng phát sáng ban đêm ----------------------
function LocalLamp({ x, z, isNight = false }: { x: number; z: number; isNight?: boolean }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.7, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 3.4, 8]} />
        <meshStandardMaterial color={LAMP_GREEN} roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, 3.45, 0]}>
        <boxGeometry args={[1.3, 0.08, 0.08]} />
        <meshStandardMaterial color={LAMP_GREEN} roughness={0.6} metalness={0.3} />
      </mesh>
      {[-0.6, 0.6].map((dx) => (
        <mesh key={dx} position={[dx, 3.62, 0]}>
          <sphereGeometry args={[0.26, 14, 10]} />
          <meshStandardMaterial
            color="#F5F5F5"
            emissive={isNight ? '#FFE099' : '#000000'}
            emissiveIntensity={isNight ? 1.35 : 0}
            roughness={0.35}
          />
        </mesh>
      ))}
    </group>
  );
}

function makeOrganicShrubGeometry(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const bump =
      1 +
      0.16 * Math.sin(3.4 * x + 2.7 * y) * Math.cos(3.1 * z) +
      0.09 * Math.cos(5.3 * x - 4.1 * z);
    pos.setXYZ(i, x * bump, y * bump, z * bump);
  }
  g.computeVertexNormals();
  return g;
}

// --- Hàng khóm hoa giấy hữu cơ dọc 2 bồn cỏ Quảng trường C1 (thay cho khối hộp hồng cũ) ---
function BougainvilleaHedgeRow({
  shrubGeo,
  foliagePbr,
}: {
  shrubGeo: THREE.BufferGeometry;
  foliagePbr: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture };
}) {
  const stemRef = useRef<THREE.InstancedMesh>(null);
  const leafRef = useRef<THREE.InstancedMesh>(null);
  const blossomRef = useRef<THREE.InstancedMesh>(null);

  const layout = useMemo(() => {
    const rnd = createSeededRandom(19560101);
    const stems: Array<{ x: number; y: number; z: number; rx: number; rz: number }> = [];
    const leaves: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number; rot: number; color: string }> = [];
    const blossoms: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number; rot: number; color: string }> = [];
    const leafColors = ['#4D7C0F', '#5A8F3D', '#65A30D'];
    const blossomColors = ['#DB2777', '#EC4899', '#F472B6', '#BE185D', '#F9A8D4'];

    for (const fx of [-68.6, -47.4]) {
      for (let i = 0; i < 7; i++) {
        const fz = -42 + i * 1.5;
        stems.push({
          x: fx,
          y: 0.24,
          z: fz,
          rx: (rnd() - 0.5) * 0.22,
          rz: (rnd() - 0.5) * 0.22,
        });
        for (let l = 0; l < 3; l++) {
          const ang = rnd() * Math.PI * 2;
          const dist = l === 0 ? 0 : 0.1 + rnd() * 0.1;
          leaves.push({
            x: fx + Math.cos(ang) * dist,
            y: 0.34 + (l === 0 ? 0.04 : rnd() * 0.05),
            z: fz + Math.sin(ang) * dist,
            sx: 0.18 + rnd() * 0.07,
            sy: 0.13 + rnd() * 0.05,
            sz: 0.18 + rnd() * 0.07,
            rot: rnd() * Math.PI * 2,
            color: leafColors[(i + l) % leafColors.length],
          });
        }
        for (let b = 0; b < 6; b++) {
          const ang = (b / 6) * Math.PI * 2 + rnd() * 0.5;
          const dist = 0.07 + rnd() * 0.14;
          blossoms.push({
            x: fx + Math.cos(ang) * dist,
            y: 0.37 + rnd() * 0.13,
            z: fz + Math.sin(ang) * dist,
            sx: 0.09 + rnd() * 0.045,
            sy: 0.075 + rnd() * 0.035,
            sz: 0.09 + rnd() * 0.045,
            rot: rnd() * Math.PI * 2,
            color: blossomColors[(i * 3 + b) % blossomColors.length],
          });
        }
      }
    }
    return { stems, leaves, blossoms };
  }, []);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    const col = new THREE.Color();

    if (stemRef.current) {
      layout.stems.forEach((st, idx) => {
        e.set(st.rx, 0, st.rz);
        q.setFromEuler(e);
        v.set(st.x, st.y, st.z);
        s.set(1, 1, 1);
        m.compose(v, q, s);
        stemRef.current!.setMatrixAt(idx, m);
      });
      stemRef.current.instanceMatrix.needsUpdate = true;
    }
    if (leafRef.current) {
      layout.leaves.forEach((lf, idx) => {
        e.set(0, lf.rot, 0);
        q.setFromEuler(e);
        v.set(lf.x, lf.y, lf.z);
        s.set(lf.sx, lf.sy, lf.sz);
        m.compose(v, q, s);
        leafRef.current!.setMatrixAt(idx, m);
        col.set(lf.color);
        leafRef.current!.setColorAt(idx, col);
      });
      leafRef.current.instanceMatrix.needsUpdate = true;
      if (leafRef.current.instanceColor) leafRef.current.instanceColor.needsUpdate = true;
    }
    if (blossomRef.current) {
      layout.blossoms.forEach((bl, idx) => {
        e.set(0, bl.rot, 0);
        q.setFromEuler(e);
        v.set(bl.x, bl.y, bl.z);
        s.set(bl.sx, bl.sy, bl.sz);
        m.compose(v, q, s);
        blossomRef.current!.setMatrixAt(idx, m);
        col.set(bl.color);
        blossomRef.current!.setColorAt(idx, col);
      });
      blossomRef.current.instanceMatrix.needsUpdate = true;
      if (blossomRef.current.instanceColor) blossomRef.current.instanceColor.needsUpdate = true;
    }
  }, [layout]);

  return (
    <group>
      <instancedMesh ref={stemRef} args={[undefined, undefined, layout.stems.length]} castShadow>
        <cylinderGeometry args={[0.022, 0.036, 0.28, 6]} />
        <meshStandardMaterial color={TRUNK} roughness={0.92} />
      </instancedMesh>
      <instancedMesh ref={leafRef} args={[shrubGeo, undefined, layout.leaves.length]} castShadow receiveShadow>
        <meshStandardMaterial
          color="#FFFFFF"
          map={foliagePbr.map}
          bumpMap={foliagePbr.bumpMap}
          bumpScale={0.015}
          roughness={0.88}
        />
      </instancedMesh>
      <instancedMesh ref={blossomRef} args={[shrubGeo, undefined, layout.blossoms.length]} castShadow>
        <meshStandardMaterial
          color="#FFFFFF"
          bumpMap={foliagePbr.bumpMap}
          bumpScale={0.012}
          roughness={0.72}
        />
      </instancedMesh>
    </group>
  );
}

// --- Chậu hoa giấy gốm có vành miệng & tán lá/hoa xốp hữu cơ ---
function LocalFlowerPot({
  x,
  z,
  shrubGeo,
  foliagePbr,
}: {
  x: number;
  z: number;
  shrubGeo: THREE.BufferGeometry;
  foliagePbr: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture };
}) {
  return (
    <group position={[x, 0, z]}>
      {/* Thân chậu gốm đất nung */}
      <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.31, 0.21, 0.48, 16]} />
        <meshStandardMaterial color={POT_BROWN} roughness={0.76} />
      </mesh>
      {/* Vành miệng chậu đúc nổi */}
      <mesh position={[0, 0.46, 0]} castShadow>
        <cylinderGeometry args={[0.345, 0.33, 0.085, 16]} />
        <meshStandardMaterial color="#9C6644" roughness={0.72} />
      </mesh>
      {/* Đất trồng sẫm màu bên trong miệng chậu */}
      <mesh position={[0, 0.485, 0]} receiveShadow>
        <cylinderGeometry args={[0.295, 0.285, 0.035, 14]} />
        <meshStandardMaterial color="#3E2723" roughness={0.96} />
      </mesh>
      {/* Nền tán lá xanh xốp nhiều tầng */}
      <mesh
        position={[0, 0.56, 0]}
        scale={[0.34, 0.2, 0.32]}
        rotation={[0, 0.3, 0]}
        geometry={shrubGeo}
        castShadow
      >
        <meshStandardMaterial
          color="#5A8F3D"
          map={foliagePbr.map}
          bumpMap={foliagePbr.bumpMap}
          bumpScale={0.015}
          roughness={0.86}
        />
      </mesh>
      <mesh
        position={[-0.14, 0.62, 0.1]}
        scale={[0.22, 0.16, 0.22]}
        rotation={[0.2, 1.1, 0]}
        geometry={shrubGeo}
        castShadow
      >
        <meshStandardMaterial
          color="#4D7C0F"
          map={foliagePbr.map}
          bumpMap={foliagePbr.bumpMap}
          bumpScale={0.015}
          roughness={0.88}
        />
      </mesh>
      {/* 5 chùm hoa giấy đa sắc nở xốp bất đối xứng (loại bỏ dáng "nấm hồng" cũ) */}
      {[
        { p: [0.02, 0.72, -0.02] as [number, number, number], s: [0.22, 0.16, 0.21] as [number, number, number], c: '#DB2777', r: 0.4 },
        { p: [0.24, 0.63, 0.1] as [number, number, number], s: [0.16, 0.13, 0.15] as [number, number, number], c: '#EC4899', r: 1.5 },
        { p: [-0.22, 0.65, -0.08] as [number, number, number], s: [0.15, 0.12, 0.15] as [number, number, number], c: '#F472B6', r: 2.3 },
        { p: [-0.08, 0.64, 0.21] as [number, number, number], s: [0.14, 0.11, 0.14] as [number, number, number], c: '#BE185D', r: 3.1 },
        { p: [0.12, 0.68, -0.18] as [number, number, number], s: [0.13, 0.11, 0.13] as [number, number, number], c: '#F9A8D4', r: 4.2 },
      ].map((b, bi) => (
        <mesh
          key={`pot-blossom-${bi}`}
          position={b.p}
          scale={b.s}
          rotation={[0, b.r, 0]}
          geometry={shrubGeo}
          castShadow
        >
          <meshStandardMaterial
            color={b.c}
            bumpMap={foliagePbr.bumpMap}
            bumpScale={0.012}
            roughness={0.74}
          />
        </mesh>
      ))}
    </group>
  );
}

// --- Biểu trưng dọc + quốc kỳ: vẽ canvas cục bộ (không chạm TextPlate) ----
// Theo ảnh Tuổi Trẻ: biểu trưng là DẢI ĐỎ DỌC — sao vàng ở trên, chữ
// "BÁCH KHOA" vàng bên dưới (không phải poster ngang hay lá cờ + chữ tùy ý).
function drawStar2D(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHustEmblem(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Vẽ dự phòng chuẩn Logo chính thức ĐHBK Hà Nội (nền đỏ cờ đồng nhất viền trắng/vàng,
  // compa + sách mở trắng + bánh răng vàng ở giữa, chữ ĐẠI HỌC BÁCH KHOA HÀ NỘI bên dưới)
  // trong lúc chờ ảnh chính thức `/images/hust-logo.png` tải xong.
  ctx.clearRect(0, 0, w, h);
  const pad = Math.round(w * 0.035);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#C8102E';
  ctx.fillRect(pad, pad, w - pad * 2, h - pad * 2);

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(4, Math.round(w * 0.014));
  ctx.strokeRect(pad * 2, pad * 2, w - pad * 4, h - pad * 4);

  // Sao vàng 5 cánh phía trên
  ctx.fillStyle = '#FFD200';
  drawStar2D(ctx, w * 0.5, h * 0.14, w * 0.085);

  // Nửa bánh răng vàng phía dưới tâm
  const gx = w * 0.5;
  const gy = h * 0.45;
  const grOuter = w * 0.28;
  const grInner = w * 0.2;
  ctx.fillStyle = '#FFD200';
  for (let i = 0; i < 9; i++) {
    const a0 = (Math.PI * i) / 8.5 + 0.05;
    const a1 = a0 + 0.21;
    ctx.beginPath();
    ctx.arc(gx, gy, grOuter, a0, a1);
    ctx.arc(gx, gy, grInner * 0.84, a1, a0, true);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(gx, gy, grInner, 0, Math.PI, false);
  ctx.arc(gx, gy, grInner * 0.58, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();

  // Compa vàng
  ctx.strokeStyle = '#FFD200';
  ctx.lineWidth = Math.max(8, Math.round(w * 0.032));
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.23);
  ctx.lineTo(w * 0.33, h * 0.5);
  ctx.moveTo(w * 0.5, h * 0.23);
  ctx.lineTo(w * 0.67, h * 0.5);
  ctx.stroke();

  // Trang sách mở trắng ở tâm
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(w * 0.2, h * 0.38);
  ctx.quadraticCurveTo(w * 0.35, h * 0.35, w * 0.5, h * 0.4);
  ctx.quadraticCurveTo(w * 0.65, h * 0.35, w * 0.8, h * 0.38);
  ctx.lineTo(w * 0.8, h * 0.48);
  ctx.quadraticCurveTo(w * 0.65, h * 0.45, w * 0.5, h * 0.5);
  ctx.quadraticCurveTo(w * 0.35, h * 0.45, w * 0.2, h * 0.48);
  ctx.closePath();
  ctx.fill();

  // Dòng chữ ĐẠI HỌC BÁCH KHOA HÀ NỘI trắng bên dưới
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(w * 0.085)}px "Be Vietnam Pro", Arial, sans-serif`;
  ctx.fillText('ĐẠI HỌC', w * 0.5, h * 0.69);
  ctx.font = `700 ${Math.round(w * 0.108)}px "Be Vietnam Pro", Arial, sans-serif`;
  ctx.fillText('BÁCH KHOA', w * 0.5, h * 0.79);
  ctx.font = `700 ${Math.round(w * 0.088)}px "Be Vietnam Pro", Arial, sans-serif`;
  ctx.fillText('HÀ NỘI', w * 0.5, h * 0.885);
}

/**
 * Bảng Logo chính thức ĐHBK Hà Nội trên mảng tường đặc Tòa C1 — tải trực tiếp ảnh chuẩn
 * `/images/hust-logo.png` (Wikimedia Logo_Đại_học_Bách_Khoa_Hà_Nội, tỉ lệ chuẩn 2:3 = 512×768)
 * kèm bản vẽ dự phòng tức thời cho môi trường SSR/kiểm thử.
 */
function HustOfficialLogoPlaque({
  position,
  size,
  isNight,
}: {
  position: [number, number, number];
  size: [number, number];
  isNight: boolean;
}) {
  const logoTex = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');
    if (ctx) drawHustEmblem(ctx, 512, 768);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;

    if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!ctx) return;
        ctx.clearRect(0, 0, 512, 768);
        ctx.drawImage(img, 0, 0, 512, 768);
        tex.needsUpdate = true;
      };
      img.src = '/images/hust-logo.png';
    }
    return tex;
  }, []);

  useEffect(() => () => logoTex.dispose(), [logoTex]);

  return (
    <group position={position}>
      {/* Tấm đế nổi gắn logo lên mặt tường C1 (lệch >= 0.03m chống z-fighting) */}
      <mesh position={[0, 0, -0.025]} castShadow>
        <boxGeometry args={[size[0] + 0.14, size[1] + 0.14, 0.04]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.65} metalness={0.2} />
      </mesh>
      <mesh>
        <planeGeometry args={size} />
        <meshStandardMaterial
          map={logoTex}
          transparent
          alphaTest={0.05}
          emissive={isNight ? '#FFEED6' : '#FFFFFF'}
          emissiveMap={logoTex}
          emissiveIntensity={isNight ? 0.55 : 0.08}
          roughness={0.48}
          metalness={0.08}
        />
      </mesh>
    </group>
  );
}

function drawVnFlag(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#E8202A';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#F5C518'; // sao vàng giữa cờ (bản cũ là cờ đỏ trơn)
  drawStar2D(ctx, w / 2, h / 2, 52);
}

// --- Nhà C1 ----------------------------------------------------------------------
export function C1Building({ timeOfDay = 'day' }: { timeOfDay?: TimeOfDay }) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset';
  const concretePbr = useMemo(() => makeWeatheredConcreteTexture(6, 3), []);
  const granitePbr = useMemo(() => makeGraniteStoneTexture(4, 4), []);
  const woodTex = useMemo(() => makeWoodGrainTexture(2, 1), []);
  const foliagePbr = useMemo(() => makeFoliageCanopyTexture(2, 2), []);
  const shrubGeo = useMemo(() => makeOrganicShrubGeometry(), []);
  const geos = useMemo(() => {
    const white: BoxSpec[] = [];
    const rails: BoxSpec[] = [];
    const glass: BoxSpec[] = [];
    const frame: BoxSpec[] = [];
    const mullion: BoxSpec[] = [];
    const darkSteps: BoxSpec[] = [];
    const shadow: BoxSpec[] = []; // bóng dưới sàn các tầng + dưới mái sảnh
    const stone: BoxSpec[] = [];
    const green: BoxSpec[] = [];

    // --- Hai dải mặt đứng bên: cột mảnh + mép sàn + lan can từng tầng -------
    const wings: Array<{ x0: number; x1: number; cols: number[] }> = [
      { x0: -82, x1: -63.1, cols: WEST_COLS },
      { x0: -47.3, x1: -34, cols: EAST_COLS },
    ];
    for (const wing of wings) {
      const { x0, x1, cols } = wing;
      const midX = (x0 + x1) / 2;
      // Cột thẳng trục cả 4 tầng (tiết diện 0,28 m).
      for (const x of cols) {
        for (let f = 0; f < C1.floors; f++) {
          white.push({ w: 0.28, h: FH, d: 0.28, x, y: f * FH + FH / 2, z: SOUTH_Z });
        }
      }
      // Mép sàn các tầng trên (dải ngang, đua 0,15 m khỏi mặt cột, lùi
      // 0,15 m vào tường lõi — hành lang sâu 3,0 m).
      for (let f = 1; f < C1.floors; f++) {
        white.push({
          w: x1 - x0, h: 0.28, d: 3.3,
          x: midX, y: f * FH - 0.14, z: SOUTH_Z - 1.5,
        });
      }
      // Bóng dưới sàn mỗi tầng (mặt dưới sàn trên tối lại — tách lớp
      // sàn/cột/lan can/cửa, tránh hành lang đọc thành một mặt phẳng).
      for (let f = 1; f < C1.floors; f++) {
        shadow.push({
          w: x1 - x0 - 0.04, h: 0.08, d: 3.14,
          x: midX, y: f * FH - 0.32, z: SOUTH_Z - 1.5,
        });
      }
      // Lan can tầng 2–4 theo ảnh thật (c1-mat-tien-01.jpg): lan can sắt sơn đỏ Bách Khoa
      // kết hợp tay vịn trắng, 3 thanh ngang + thanh đứng giữa các cột loggia.
      for (let f = 1; f < C1.floors; f++) {
        const y = f * FH;
        white.push({ w: x1 - x0, h: 0.075, d: 0.08, x: midX, y: y + 1.05, z: SOUTH_Z });
        for (const ry of [0.18, 0.52, 0.86]) {
          rails.push({ w: x1 - x0, h: 0.055, d: 0.055, x: midX, y: y + ry, z: SOUTH_Z });
        }
        const n = Math.max(2, Math.floor((x1 - x0 - 0.8) / 1.2));
        for (let i = 0; i <= n; i++) {
          const x = x0 + 0.4 + ((x1 - x0 - 0.8) * i) / n;
          rails.push({ w: 0.045, h: 0.88, d: 0.045, x, y: y + 0.56, z: SOUTH_Z });
        }
      }
    }

    // --- Cửa/kính lùi sau hành lang (tường lõi z = -51,2) ------------------
    for (const bx of [...WEST_BAYS, ...EAST_BAYS]) {
      for (let f = 0; f < C1.floors; f++) {
        windowSpecs(bx, f * FH + 1.95, 2.5, 1.9, CORE_SOUTH_Z, 1, frame, glass, mullion);
      }
    }
    // Nhịp cửa sau tháp hoa gió (tầng 2–4; tầng trệt là lối vào chính).
    for (const bx of TOWER_BAYS) {
      for (let f = 1; f < C1.floors; f++) {
        windowSpecs(bx, f * FH + 1.95, 2.5, 1.9, CORE_SOUTH_Z, 1, frame, glass, mullion);
      }
    }
    // Mặt bắc: cùng nhịp cửa, trực tiếp trên tường (không có hành lang).
    for (const bx of NORTH_BAYS) {
      for (let f = 0; f < C1.floors; f++) {
        windowSpecs(bx, f * FH + 1.95, 2.5, 1.9, NORTH_Z, -1, frame, glass, mullion);
      }
    }
    // Cửa chính (kính tối, 4,0 × 2,6 m, chân cửa tại mặt bệ sảnh 0,75 m).
    windowSpecs(CX, 2.05, 4.2, 2.8, CORE_SOUTH_Z, 1, frame, glass, mullion);
    for (const mx of [-59, -57]) {
      mullion.push({
        w: 0.07, h: 2.56, d: 0.06, x: mx, y: 2.05, z: CORE_SOUTH_Z + 0.055,
      });
    }
    white.push(...frame, ...mullion);

    // --- Dải tường biểu trưng (đặc, bên phải tháp; sâu tới mặt tường lõi
    // -52 để không hở khe sau lưng khi nhìn xiên) -------------------------
    white.push({ w: 5.6, h: H, d: 3.0, x: -50.1, y: H / 2, z: -50.5 });
    // --- Mái sảnh phẳng + 4 cột đỡ (chân nhúng 0,03 vào bệ, đỉnh nhúng
    // 0,03 vào mái — cột đứng trên bệ sảnh, không đứng trên bậc) -------------
    white.push({ w: 13, h: 0.3, d: 3.0, x: CX, y: 3.7, z: SOUTH_Z + 1.2 });
    for (const cx of [-63.5, -60, -56, -52.5]) {
      white.push({ w: 0.35, h: 2.86, d: 0.35, x: cx, y: 2.15, z: SOUTH_Z + 2.3 });
    }
    // Cạnh mái sảnh sáng (dải viền trước mái hiên) + bóng dưới mái sảnh.
    white.push({ w: 13, h: 0.16, d: 0.08, x: CX, y: 3.68, z: SOUTH_Z + 2.68 });
    shadow.push({ w: 12.6, h: 0.06, d: 2.7, x: CX, y: 3.52, z: SOUTH_Z + 1.2 });
    // --- Tấm mái (bề dày 0,35 m, nhúng 0,02 vào đỉnh tường) ----------------
    white.push({ w: W, h: 0.35, d: C1.size.z, x: CX, y: 14.555, z: CZ });

    // --- Bậc tam cấp: 5 bậc đá xám-đen, mỗi bậc cao 0,15 m -----------------
    for (let k = 0; k < 5; k++) {
      darkSteps.push({
        w: 12, h: 0.15, d: 0.6,
        x: CX, y: 0.15 * (k + 1) - 0.095, z: -44.22 - 0.6 * k,
      });
    }

    // --- Sân: bệ sảnh đặc (cao 0,75 m) + 2 bồn cỏ mở rộng khoảng cách tạo Quảng trường C1 rộng 20,8 m ở giữa ---
    stone.push({ w: 12, h: 0.75, d: 4.95, x: CX, y: 0.375, z: -48.775 });
    for (const bed of [{ cx: -73.2 }, { cx: -42.8 }]) {
      stone.push({ w: 9.9, h: 0.18, d: 0.15, x: bed.cx, y: 0.09, z: -43.075 });
      stone.push({ w: 9.9, h: 0.18, d: 0.15, x: bed.cx, y: 0.09, z: -30.925 });
      stone.push({ w: 0.15, h: 0.18, d: 12.0, x: bed.cx - 4.875, y: 0.09, z: -37 });
      stone.push({ w: 0.15, h: 0.18, d: 12.0, x: bed.cx + 4.875, y: 0.09, z: -37 });
      green.push({ w: 9.6, h: 0.12, d: 12, x: bed.cx, y: 0.06, z: -37 });
    }

    // --- Mái 9 vòm nông: VỎ có bề dày 0,28 m (mặt trên + mặt dưới + cạnh
    // trước/sau đọc được), đúng 9 nhịp; đáy vỏ nhúng vào tấm mái --------
    const waveW = W / C1.waves;
    const shape = new THREE.Shape();
    shape.moveTo(-waveW / 2, 0);
    shape.quadraticCurveTo(0, C1.waveAmplitude * 2, waveW / 2, 0);
    shape.lineTo(waveW / 2, -0.28);
    shape.quadraticCurveTo(0, C1.waveAmplitude * 2 - 0.28, -waveW / 2, -0.28);
    shape.closePath();
    const wavesGeo = new THREE.ExtrudeGeometry(shape, {
      depth: C1.size.z,
      bevelEnabled: false,
    });
    wavesGeo.translate(0, 0, -C1.size.z / 2);
    // Cạnh mái sáng: dải cong mỏng 0,14 m ôm theo đỉnh sóng ở mặt trước
    // (và mặt sau) — mái không còn đọc thành miếng tối đặt trên nóc.
    const fasciaShape = new THREE.Shape();
    fasciaShape.moveTo(-waveW / 2, 0);
    fasciaShape.quadraticCurveTo(0, C1.waveAmplitude * 2, waveW / 2, 0);
    fasciaShape.lineTo(waveW / 2, -0.14);
    fasciaShape.quadraticCurveTo(0, C1.waveAmplitude * 2 - 0.14, -waveW / 2, -0.14);
    fasciaShape.closePath();
    const fasciaGeo = new THREE.ExtrudeGeometry(fasciaShape, {
      depth: 0.14,
      bevelEnabled: false,
    });

    return {
      whiteGeo: mergeBoxes(white),
      railsGeo: mergeBoxes(rails),
      glassGeo: mergeBoxes(glass),
      stepsGeo: mergeBoxes(darkSteps),
      shadowGeo: mergeBoxes(shadow),
      stoneGeo: mergeBoxes(stone),
      greenGeo: mergeBoxes(green),
      wavesGeo,
      fasciaGeo,
    };
  }, []);

  useEffect(
    () => () => {
      geos.whiteGeo.dispose();
      geos.railsGeo.dispose();
      geos.glassGeo.dispose();
      geos.stepsGeo.dispose();
      geos.shadowGeo.dispose();
      geos.stoneGeo.dispose();
      geos.greenGeo.dispose();
      geos.wavesGeo.dispose();
      geos.fasciaGeo.dispose();
      shrubGeo.dispose();
      concretePbr.map.dispose();
      concretePbr.bumpMap.dispose();
      granitePbr.map.dispose();
      granitePbr.bumpMap.dispose();
      woodTex.dispose();
      foliagePbr.map.dispose();
      foliagePbr.bumpMap.dispose();
    },
    [geos, shrubGeo, concretePbr, granitePbr, woodTex, foliagePbr],
  );

  return (
    <group>
      {/* Thân nhà đặc 48 × 14,4 × 11,0 (mặt nam lùi 3,0 m làm hành lang). */}
      <mesh position={[CX, H / 2, -57.5]} castShadow receiveShadow>
        <boxGeometry args={[W, H, CORE_DEPTH]} />
        <meshStandardMaterial
          color={C1_WALL}
          map={concretePbr.map}
          bumpMap={concretePbr.bumpMap}
          bumpScale={0.012}
          roughness={0.88}
        />
      </mesh>

      {/* Mặt đứng + khung cửa + sảnh + mái (trắng, gộp một geometry). */}
      <mesh geometry={geos.whiteGeo} castShadow receiveShadow>
        <meshStandardMaterial
          color={C1_WALL}
          map={concretePbr.map}
          bumpMap={concretePbr.bumpMap}
          bumpScale={0.01}
          roughness={0.88}
        />
      </mesh>

      {/* Lan can hành lang mở (loggia) sơn đỏ Bách Khoa (c1-mat-tien-01.jpg). */}
      <mesh geometry={geos.railsGeo} castShadow>
        <meshStandardMaterial color="#C42828" roughness={0.65} metalness={0.25} />
      </mesh>

      {/* Kính lùi (xám-xanh ban ngày, phát sáng vàng ấm áp khi Hoàng hôn & Đêm). */}
      <mesh geometry={geos.glassGeo}>
        <meshStandardMaterial
          color={isNight ? '#FFD27D' : C1_GLASS}
          emissive={isNight ? '#FFB84D' : C1_GLASS}
          emissiveIntensity={isNight ? 0.78 : 0.25}
          roughness={0.22}
          metalness={0.28}
        />
      </mesh>

      {/* Bóng dưới sàn mỗi tầng + dưới mái sảnh (tách lớp hành lang). */}
      <mesh geometry={geos.shadowGeo}>
        <meshStandardMaterial color="#2E3438" roughness={1} />
      </mesh>

      {/* Bậc tam cấp đá granite xám-đen. */}
      <mesh geometry={geos.stepsGeo} receiveShadow>
        <meshStandardMaterial
          color={STEP_STONE}
          map={granitePbr.map}
          bumpMap={granitePbr.bumpMap}
          bumpScale={0.01}
          roughness={0.82}
        />
      </mesh>

      {/* Bệ sảnh + lề bồn cỏ (đá granite xám nhạt). */}
      <mesh geometry={geos.stoneGeo} receiveShadow>
        <meshStandardMaterial
          color={PORCH_STONE}
          map={granitePbr.map}
          bumpMap={granitePbr.bumpMap}
          bumpScale={0.008}
          roughness={0.85}
        />
      </mesh>

      {/* Cỏ bồn. */}
      <mesh geometry={geos.greenGeo} receiveShadow>
        <meshStandardMaterial color={LAWN_GREEN} roughness={1} />
      </mesh>

      {/* Hàng hoa giấy hữu cơ dọc 2 bồn cỏ Quảng trường C1. */}
      <BougainvilleaHedgeRow shrubGeo={shrubGeo} foliagePbr={foliagePbr} />

      {/* Trục sân lát đá nghi lễ trung tâm rộng 16,8 m của Quảng trường C1 (mặt trên y = 0,045,
          ôm trọn Đài phun nước lớn & cụm chữ I ❤ BK, cao hơn sàn quảng trường 0,03 m — không z-fighting). */}
      <mesh position={[CX, 0.028, -34.2]} receiveShadow>
        <boxGeometry args={[16.8, 0.034, 20.6]} />
        <meshStandardMaterial
          color={PATH_STONE}
          map={granitePbr.map}
          bumpMap={granitePbr.bumpMap}
          bumpScale={0.008}
          roughness={0.86}
        />
      </mesh>
      {/* Đường viền đá sáng hai mép trục chính Quảng trường C1 */}
      {[-8.55, 8.55].map((bx, idx) => (
        <mesh key={`c1-promenade-border-${idx}`} position={[CX + bx, 0.032, -34.2]} receiveShadow>
          <boxGeometry args={[0.3, 0.038, 20.6]} />
          <meshStandardMaterial color="#DFDCD3" roughness={0.82} />
        </mesh>
      ))}

      {/* Mái 9 vòm nông — đúng 9 nhịp, mỗi vòm cao 0,5 m, vỏ dày 0,28 m. */}
      {Array.from({ length: C1.waves }).map((_, i) => (
        <mesh
          key={`c1-wave-${i}`}
          geometry={geos.wavesGeo}
          position={[CX - W / 2 + (i + 0.5) * (W / C1.waves), 14.73, CZ]}
          castShadow
        >
          <meshStandardMaterial
            color={C1_ROOF}
            map={concretePbr.map}
            bumpMap={concretePbr.bumpMap}
            bumpScale={0.012}
            roughness={0.9}
          />
        </mesh>
      ))}

      {/* Cạnh mái sáng ôm đỉnh sóng, mặt trước + mặt sau. */}
      {Array.from({ length: C1.waves }).map((_, i) => (
        <group key={`c1-fascia-${i}`}>
          <mesh
            geometry={geos.fasciaGeo}
            position={[CX - W / 2 + (i + 0.5) * (W / C1.waves), 14.73, SOUTH_Z]}
          >
            <meshStandardMaterial color="#CFCBC0" roughness={0.9} />
          </mesh>
          <mesh
            geometry={geos.fasciaGeo}
            position={[CX - W / 2 + (i + 0.5) * (W / C1.waves), 14.73, NORTH_Z - 0.14]}
          >
            <meshStandardMaterial color="#CFCBC0" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Tháp hoa gió giữa mặt tiền + tháp đầu hồi đông (hốc cầu thang sáng đèn ấm về đêm) */}
      <WindTower
        position={[CX, 0, SOUTH_Z + 0.8]}
        w={10.2}
        h={14.4}
        d={1.6}
        cols={3}
        latticeBottom={3.85}
        baseY={0.75}
        solidBase={false}
        bottomRib={false}
        isNight={isNight}
      />
      <WindTower
        position={[-33.23, 0, CZ]}
        rotationY={Math.PI / 2}
        w={5}
        h={12}
        d={1.6}
        cols={2}
        latticeBottom={0.6}
        baseY={0}
        solidBase
        bottomRib
        isNight={isNight}
      />

      {/* Cột cờ inox + Lá cờ đỏ sao vàng tung bay trên đỉnh tháp hoa gió giữa C1 (c1-mat-tien-01.jpg) */}
      <group position={[CX, 14.8, SOUTH_Z + 0.8]}>
        <mesh position={[0, 1.8, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.06, 3.6, 10]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.4} metalness={0.6} />
        </mesh>
        <LabelPlane
          textureKey="c1-rooftop-vn-flag"
          canvasW={384}
          canvasH={256}
          draw={drawVnFlag}
          size={[1.65, 1.1]}
          position={[0.85, 3.0, 0]}
          transparent={false}
        />
      </group>

      {/* Logo chính thức ĐHBK Hà Nội (/images/hust-logo.png, tỉ lệ 2:3) trên mảng tường đặc + chữ nổi 3D "C1" */}
      <HustOfficialLogoPlaque
        size={[3.5, 5.25]}
        position={[-50.1, 8.35, SOUTH_Z + 0.09]}
        isNight={isNight}
      />
      <ExtrudedText3D
        text="C1"
        size={[1.38, 0.96]}
        depth={0.16}
        position={[-48.6, 2.02, SOUTH_Z + 0.1]}
        frontColor="#C86D2D"
        frontHighlightColor="#F59E0B"
        sideColor="#6B3410"
        metalness={0.68}
        roughness={0.3}
      />

      {/* Mặt Bắc Tòa C1 (nhìn ra Cổng Số 1 Đại Cồ Việt): Biển hộp 3D ĐẠI HỌC BÁCH KHOA HÀ NỘI & mái hiên Bắc */}
      <FramedSignBox3D
        canvasW={1024}
        canvasH={160}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#B81D24';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '700 44px Arial, sans-serif';
          ctx.fillText('ĐẠI HỌC BÁCH KHOA HÀ NỘI', w / 2, h * 0.38);
          ctx.fillStyle = '#FFD966';
          ctx.font = '700 26px Arial, sans-serif';
          ctx.fillText('HANOI UNIVERSITY OF SCIENCE AND TECHNOLOGY · NHÀ C1', w / 2, h * 0.75);
        }}
        size={[13.5, 1.4]}
        depth={0.14}
        boxColor="#7F1D1D"
        frameColor="#FFD166"
        position={[CX, 13.4, NORTH_Z - 0.1]}
        rotation={[0, Math.PI, 0]}
        isNight={isNight}
      />
      <mesh position={[CX, 3.65, NORTH_Z - 0.9]} castShadow>
        <boxGeometry args={[9.2, 0.28, 1.8]} />
        <meshStandardMaterial color={C1_WALL} roughness={0.85} />
      </mesh>

      {/* Cột cờ + quốc kỳ CÓ sao vàng trên nóc, chính giữa. */}
      <mesh position={[CX, 17.23, CZ]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 5, 8]} />
        <meshStandardMaterial color={PLINTH_BLACK} roughness={0.6} metalness={0.4} />
      </mesh>
      <LabelPlane
        textureKey="vn-flag-c1"
        canvasW={300}
        canvasH={200}
        draw={drawVnFlag}
        size={[1.9, 1.1]}
        position={[CX + 0.95, 19.15, CZ]}
        transparent={false}
      />

      {/* Sân C1: 2 cây Lipa, đèn sân phát sáng ban đêm, ghế gỗ có vân gỗ, chậu hoa. */}
      <LocalTree x={C1.lipaTrees[0].x} z={C1.lipaTrees[0].z} canopyColor="#5A7D2A" />
      <LocalTree x={C1.lipaTrees[1].x} z={C1.lipaTrees[1].z} canopyColor="#D9A419" />
      <LocalLamp x={-76.5} z={-30} isNight={isNight} />
      <LocalLamp x={-39.5} z={-30} isNight={isNight} />
      <LocalLamp x={-77.5} z={-44} isNight={isNight} />
      <LocalLamp x={-38.5} z={-44} isNight={isNight} />
      {C1_BENCHES.map((b, i) => (
        <LocalBench key={`c1-bench-${i}`} x={b.x} z={b.z} woodTex={woodTex} />
      ))}
      <LocalFlowerPot x={-67.8} z={-45.5} shrubGeo={shrubGeo} foliagePbr={foliagePbr} />
      <LocalFlowerPot x={-48.2} z={-45.5} shrubGeo={shrubGeo} foliagePbr={foliagePbr} />
      <LocalFlowerPot x={-80} z={-51.2} shrubGeo={shrubGeo} foliagePbr={foliagePbr} />
      <LocalFlowerPot x={-70} z={-51.2} shrubGeo={shrubGeo} foliagePbr={foliagePbr} />
      <LocalFlowerPot x={-40.5} z={-51.2} shrubGeo={shrubGeo} foliagePbr={foliagePbr} />
    </group>
  );
}

// --- AABB / FOOTPRINT (để luồng tích hợp đối chiếu collider) ------------------
// Thân nhà:            x -82..-34,   z -63..-49      (KHÔNG ĐỔI)
//   Thân đặc:          x -82..-34,   z -63..-52      (tường lõi lùi 3,0 m)
// Tháp hoa gió giữa:   x -63,1..-52,9, z -49..-47,4 (rộng hơn cũ 6 → 10,2 m
//   theo ảnh; vẫn nằm trong collider bậc x -64..-52, z -49,5..-43,8)
// Tháp đầu hồi đông:   x -34,03..-32,43, z -58,5..-53,5 (dời 0,03 m về tây
//   để nhúng vào tường hồi; vẫn nằm trong collider cũ x -34,2..-32,2)
// Dải tường biểu trưng: x -52,9..-47,3, z -52..-49 (sâu tới tường lõi)
// Mái sảnh:            x -64,5..-51,5, z -49,3..-46,3, y 3,55..3,85
//   (cao 3,55 m, không chạm đất — không cần collider mới)
// Bậc tam cấp:         x -64..-52,   z -46,92..-43,92 (trong collider bậc cũ)
// Bệ sảnh:             x -64..-52,   z -51,25..-46,3, y 0..0,75
//   (trong collider bậc + collider nhà)
// Mái (tấm + 9 vòm):   x -82..-34,   z -63..-49, y 14,38..15,23
//   (vòm vỏ dày 0,28 m; cạnh mái sáng đua 0,14 m ra z -48,86 / -63,14)
// Sân (đường/bồn/cây): x -76..-40,   z -44..-28 (ngoài mọi collider — như cũ,
//   cây/ghế/đèn không có collider)
// Chậu hoa hành lang:  x -80 / -70 / -40,5, z -51,2 — trong collider nhà C1,
//   không chặn đường (lối vào lớp học ở z -45,5)
// => KHÔNG CẦN ĐỔI COLLIDER NÀO trong lib/campus.ts. Tổng AABB hình khối:
//    x -82..-32,43, z -63..-43,92 (bậc) / -46,3 (mái sảnh), y 0..19,73 (cờ).
