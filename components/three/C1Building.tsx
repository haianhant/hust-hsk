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

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { C1, C1_BENCHES } from '../../lib/campus';
import type { TimeOfDay } from '../../lib/playerState';
import { LabelPlane, drawC1Label } from './TextPlate';
import {
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
const FLOWER_PINK = '#D63384'; // hoa giấy
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
  return <ImprovedTree x={x} z={z} trunkH={3.2} canopyR={2.4} canopyY={4.7} canopyColor={canopyColor} />;
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

// --- Chậu hoa giấy hồng hai bên bậc thềm -----------------------------------------
function LocalFlowerPot({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.22, 0.5, 12]} />
        <meshStandardMaterial color={POT_BROWN} roughness={0.9} />
      </mesh>
      {/* Hoa giấy: cụm 3 khóm hồng lệch nhau trên nền lá xanh — không còn
          1 cầu hồng trơn đọc thành "nấm hồng" ở góc nhìn người chơi. */}
      <mesh position={[0, 0.5, 0]} scale={[1, 0.6, 1]} castShadow>
        <sphereGeometry args={[0.34, 12, 10]} />
        <meshStandardMaterial color={LAWN_GREEN} roughness={1} />
      </mesh>
      <mesh position={[0, 0.68, 0]} scale={[1, 0.55, 1]} castShadow>
        <sphereGeometry args={[0.42, 12, 10]} />
        <meshStandardMaterial color={FLOWER_PINK} roughness={1} />
      </mesh>
      <mesh position={[0.32, 0.58, 0.12]} scale={[1, 0.5, 1]} castShadow>
        <sphereGeometry args={[0.26, 10, 8]} />
        <meshStandardMaterial color={FLOWER_PINK} roughness={1} />
      </mesh>
      <mesh position={[-0.3, 0.6, -0.1]} scale={[1, 0.5, 1]} castShadow>
        <sphereGeometry args={[0.24, 10, 8]} />
        <meshStandardMaterial color={FLOWER_PINK} roughness={1} />
      </mesh>
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
  // Biểu trưng dọc ĐHBK Hà Nội trên mảng tường đặc bên phải tháp hoa gió (c1-can-luoi-hoa-gio-05.jpg):
  // Nền kem ngà có viền gờ nổi, nửa trên là lá cờ đỏ sao vàng uốn lượn,
  // giữa là chữ "ĐẠI HỌC BÁCH KHOA" trên trang sách mở trắng, dưới là bánh răng vàng & compa.
  ctx.fillStyle = '#F3EAD8';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#8C6D46';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  // Lá cờ đỏ sao vàng chiếm nửa trên bên trái
  ctx.fillStyle = '#D91E26';
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h * 0.04);
  ctx.lineTo(w * 0.68, h * 0.04);
  ctx.quadraticCurveTo(w * 0.58, h * 0.25, w * 0.70, h * 0.46);
  ctx.lineTo(w * 0.08, h * 0.46);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#F5C518';
  drawStar2D(ctx, w * 0.36, h * 0.24, 58);

  // Chữ ĐẠI HỌC BÁCH KHOA màu đỏ sẫm
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#7A1C18';
  ctx.font = '800 38px Arial, sans-serif';
  ctx.fillText('ĐẠI HỌC', w * 0.56, h * 0.53);
  ctx.fillStyle = '#C81E24';
  ctx.font = '900 58px Arial, sans-serif';
  ctx.fillText('BÁCH KHOA', w * 0.5, h * 0.61);

  // Trang sách mở trắng + bánh răng vàng bên dưới
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#6E5030';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(w * 0.12, h * 0.68);
  ctx.quadraticCurveTo(w * 0.31, h * 0.65, w * 0.5, h * 0.70);
  ctx.quadraticCurveTo(w * 0.69, h * 0.65, w * 0.88, h * 0.68);
  ctx.lineTo(w * 0.88, h * 0.82);
  ctx.quadraticCurveTo(w * 0.69, h * 0.79, w * 0.5, h * 0.84);
  ctx.quadraticCurveTo(w * 0.31, h * 0.79, w * 0.12, h * 0.82);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bánh răng vàng phía dưới sách
  ctx.fillStyle = '#E09F24';
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.84, w * 0.22, 0, Math.PI, false);
  ctx.fill();
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
  const geos = useMemo(() => {
    const white: BoxSpec[] = [];
    const glass: BoxSpec[] = [];
    const frame: BoxSpec[] = [];
    const mullion: BoxSpec[] = [];
    const darkSteps: BoxSpec[] = [];
    const shadow: BoxSpec[] = []; // bóng dưới sàn các tầng + dưới mái sảnh
    const stone: BoxSpec[] = [];
    const green: BoxSpec[] = [];
    const pink: BoxSpec[] = [];

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
      // Lan can tầng 2–4 theo ảnh: 3 thanh ngang trắng + thanh đứng thưa
      // (bước ~1,6 m), cao 1,05 m — thoáng, nhấn ngang, không phải lưới
      // kim loại dày đặc.
      for (let f = 1; f < C1.floors; f++) {
        const y = f * FH;
        for (const ry of [0.15, 0.6, 1.05]) {
          white.push({ w: x1 - x0, h: 0.07, d: 0.07, x: midX, y: y + ry, z: SOUTH_Z });
        }
        const n = Math.max(2, Math.floor((x1 - x0 - 0.8) / 1.6));
        for (let i = 0; i <= n; i++) {
          const x = x0 + 0.4 + ((x1 - x0 - 0.8) * i) / n;
          white.push({ w: 0.05, h: 0.9, d: 0.05, x, y: y + 0.6, z: SOUTH_Z });
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

    // --- Sân: bệ sảnh đặc (cao 0,75 m) + lề bồn cỏ --------------------------
    stone.push({ w: 12, h: 0.75, d: 4.95, x: CX, y: 0.375, z: -48.775 });
    for (const bed of [{ cx: -69.5 }, { cx: -46.5 }]) {
      stone.push({ w: 11.3, h: 0.18, d: 0.15, x: bed.cx, y: 0.09, z: -43.075 });
      stone.push({ w: 11.3, h: 0.18, d: 0.15, x: bed.cx, y: 0.09, z: -30.925 });
      stone.push({ w: 0.15, h: 0.18, d: 12.0, x: bed.cx - 5.575, y: 0.09, z: -37 });
      stone.push({ w: 0.15, h: 0.18, d: 12.0, x: bed.cx + 5.575, y: 0.09, z: -37 });
      green.push({ w: 11, h: 0.12, d: 12, x: bed.cx, y: 0.06, z: -37 });
    }
    // Hoa giấy dọc mép trong hai bồn cỏ (không chắn trục lối vào).
    for (const fx of [-64.8, -51.2]) {
      for (let i = 0; i < 7; i++) {
        const fz = -42 + i * 1.5;
        pink.push({ w: 0.24, h: 0.2, d: 0.24, x: fx, y: 0.32, z: fz });
        green.push({ w: 0.06, h: 0.24, d: 0.06, x: fx, y: 0.18, z: fz });
      }
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
      glassGeo: mergeBoxes(glass),
      stepsGeo: mergeBoxes(darkSteps),
      shadowGeo: mergeBoxes(shadow),
      stoneGeo: mergeBoxes(stone),
      greenGeo: mergeBoxes(green),
      pinkGeo: mergeBoxes(pink),
      wavesGeo,
      fasciaGeo,
    };
  }, []);

  useEffect(
    () => () => {
      geos.whiteGeo.dispose();
      geos.glassGeo.dispose();
      geos.stepsGeo.dispose();
      geos.shadowGeo.dispose();
      geos.stoneGeo.dispose();
      geos.greenGeo.dispose();
      geos.pinkGeo.dispose();
      geos.wavesGeo.dispose();
      geos.fasciaGeo.dispose();
      concretePbr.map.dispose();
      concretePbr.bumpMap.dispose();
      granitePbr.map.dispose();
      granitePbr.bumpMap.dispose();
      woodTex.dispose();
    },
    [geos, concretePbr, granitePbr, woodTex],
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

      {/* Cỏ bồn + thân hoa giấy. */}
      <mesh geometry={geos.greenGeo} receiveShadow>
        <meshStandardMaterial color={LAWN_GREEN} roughness={1} />
      </mesh>

      {/* Hoa giấy hồng. */}
      <mesh geometry={geos.pinkGeo} castShadow>
        <meshStandardMaterial color={FLOWER_PINK} roughness={1} />
      </mesh>

      {/* Đường lát dẫn vào sảnh (mặt trên y = 0,05, cao hơn sàn quảng
          trường 0,035 m — không trùng mặt). */}
      <mesh position={[CX, 0.03, -35.9]} receiveShadow>
        <boxGeometry args={[8, 0.04, 15.8]} />
        <meshStandardMaterial
          color={PATH_STONE}
          map={granitePbr.map}
          bumpMap={granitePbr.bumpMap}
          bumpScale={0.008}
          roughness={0.88}
        />
      </mesh>

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

      {/* Biểu trưng dọc đỏ/vàng trên dải tường đặc + chữ "C1" vàng cam ấm */}
      <LabelPlane
        textureKey="hust-emblem-v"
        canvasW={420}
        canvasH={1024}
        draw={drawHustEmblem}
        size={[2.7, 6.6]}
        position={[-50.1, 7.8, SOUTH_Z + 0.08]}
      />
      <LabelPlane
        textureKey="c1-label"
        canvasW={256}
        canvasH={256}
        draw={drawC1Label}
        size={[1.3, 1.3]}
        position={[-48.6, 2.0, SOUTH_Z + 0.08]}
      />

      {/* Mặt Bắc Tòa C1 (nhìn ra Cổng Số 1 Đại Cồ Việt): Dải chữ nổi ĐẠI HỌC BÁCH KHOA HÀ NỘI & mái hiên Bắc */}
      <LabelPlane
        textureKey="c1-north-title"
        canvasW={1024}
        canvasH={160}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#B81D24';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#FFD166';
          ctx.lineWidth = 6;
          ctx.strokeRect(8, 8, w - 16, h - 16);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 44px Arial, sans-serif';
          ctx.fillText('ĐẠI HỌC BÁCH KHOA HÀ NỘI', w / 2, h * 0.38);
          ctx.fillStyle = '#FFD966';
          ctx.font = '700 26px Arial, sans-serif';
          ctx.fillText('HANOI UNIVERSITY OF SCIENCE AND TECHNOLOGY · NHÀ C1', w / 2, h * 0.75);
        }}
        size={[13.5, 1.4]}
        position={[CX, 13.4, NORTH_Z - 0.06]}
        rotation={[0, Math.PI, 0]}
        transparent={false}
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
      <LocalLamp x={-72.5} z={-30} isNight={isNight} />
      <LocalLamp x={-40} z={-30} isNight={isNight} />
      <LocalLamp x={-76} z={-44} isNight={isNight} />
      <LocalLamp x={-40} z={-44} isNight={isNight} />
      {C1_BENCHES.map((b, i) => (
        <LocalBench key={`c1-bench-${i}`} x={b.x} z={b.z} woodTex={woodTex} />
      ))}
      <LocalFlowerPot x={-65} z={-45.5} />
      <LocalFlowerPot x={-51} z={-45.5} />
      <LocalFlowerPot x={-80} z={-51.2} />
      <LocalFlowerPot x={-70} z={-51.2} />
      <LocalFlowerPot x={-40.5} z={-51.2} />
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
