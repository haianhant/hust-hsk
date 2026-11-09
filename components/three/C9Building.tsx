// ---------------------------------------------------------------------------
// C9Building.tsx — Nhà C9 + cầu thang bộ ngoài trời zic-zac, lan can đỏ.
// Brief sửa kiến trúc ngoại thất §5 + §7 (docs/architecture-rework-brief.md),
// ảnh tham chiếu nửa phải:
//   library.hust.edu.vn — "Quảng trường C1 và Cây cầu đỏ C9"
//   (đã xem trực tiếp 05/11/2026, chỉ quan sát — KHÔNG copy ảnh vào public/).
// Màu chốt theo docs/reference-visual.md §0 (ước lượng bằng mắt từ ảnh).
// Vị trí + kích thước khối nhà lấy từ hằng số C9 trong lib/campus.ts
// (vị trí là ƯỚC LƯỢNG — vệ tinh không có ghim C9, xem satellite-and-c9 §2).
//
// NHỮNG GÌ ẢNH CHO THẤY (nửa phải):
//  - Thang gắn mặt ngoài nhà, các vế gấp khúc zic-zac lên nhiều tầng; mỗi
//    vế là MỘT nhịp dài nối hai chiếu nghỉ, không phải thang xoắn, không
//    phải cầu bắc qua hồ.
//  - Bê tông trắng/xám rất nhạt; lan can kim loại ĐỎ mảnh (tay vịn + nhiều
//    trụ đứng mảnh + vài thanh ngang) ở CẢ HAI mép vế thang và quanh chiếu
//    nghỉ — đỏ là điểm nhấn chính, không phải khối đỏ đặc.
//  - Chiếu nghỉ là sàn trắng đua ra khỏi mặt nhà, có cột vuông trắng đỡ
//    xuống đất; giữa các vế thang là KHOẢNG RỖNG nhìn xuyên được (thấy trời
//    và cây qua khe) — không lấp kín.
//  - Tầng trệt có cửa gỗ vàng lớn; các tầng trên có cửa ra chiếu nghỉ.
//  - Vế trên cùng kết thúc ở chiếu nghỉ tầng mái, có mái che mỏng phía trên.
//
// SỐ VẾ THANG — ĐIỂM LỆCH SO VỚI CODE CŨ (BuildingC9 trong Landmarks.tsx),
// GHI RÕ ĐỂ LUỒNG TÍCH HỢP QUYẾT: code cũ dựng 5 vế × cao 2,72 m
// (13,6 / 5). Nhưng chiều cao tầng nhà là 3,4 m (C9.floorHeight) nên các
// chiếu nghỉ cũ ở 2,72 / 5,44 / 8,16 / 10,88 m LỆCH 0,68 m so với mọi sàn
// tầng (3,4 / 6,8 / 10,2) — cửa đặt ở chiếu nghỉ sẽ lơ lửng giữa hai tầng,
// không nối được vào cửa/hành lang từng tầng như brief §5 yêu cầu.
// File này dựng 4 VẾ × 3,4 m = 13,6 m: mỗi vế lên đúng một tầng, mọi chiếu
// nghỉ (0 / 3,4 / 6,8 / 10,2 / 13,6 m) trùng cao độ sàn tầng và đều có cửa
// mở ra. Đếm trên ảnh cũng thấy 4 sàn chiếu nghỉ nổi trên mặt đất + mặt đất
// (khớp khoảng "4–5 đợt" trong satellite-and-c9 §3). Nếu luồng tích hợp
// muốn giữ đúng 5 vế như code cũ thì phải chấp nhận cửa lệch tầng hoặc đổi
// floorHeight — không nên lặng lẽ giữ 5 vế rồi gắn cửa cho có.
// Số tầng nhà (4) vẫn là ƯỚC LƯỢNG, chưa xác minh (satellite-and-c9 §3).
//
// HÌNH HỌC MỘT VẾ (đơn vị mét, avatar 1,7 m làm chuẩn — brief §7):
//  - 21 bậc/vế, cao mỗi bậc 3,4/21 ≈ 0,162 m (< đầu gối), sâu mặt bậc
//    0,29 m, dài vế 21 × 0,29 = 6,09 m, dốc atan2(3,4; 6,09) ≈ 29,2°.
//  - Mỗi bậc là MỘT hộp đặc (mặt bậc + cổ bậc liền khối, không dùng tấm
//    bậc bay): hộp cao đúng một chiều cao bậc, mặt trước của hộp là cổ bậc.
//  - Bản thang (dầm dốc) 2,0 m rộng × 0,22 m dày nằm dưới bậc.
//  - Chiếu nghỉ: sàn 2,4 m (rộng, trục X) × 1,4 m (sâu, trục Z) × 0,25 m
//    dày, mặt trên đúng cao độ tầng; 2 cột vuông 0,45 m đỡ 2 góc ngoài
//    xuống đất.
//  - Lan can cao 1,0 m (không cao ngang đầu người 1,7 m): tay vịn 0,06 m +
//    2 thanh ngang 0,04 m + trụ đứng 0,045 m cách nhau ~1,0 m dọc vế.
//  - Lối đi thông suốt rộng ~2,26 m giữa hai lan can vế thang; lan can chỉ
//    nằm ở HAI MÉP DÀI của vế (x = -31,98 phía tường và x = -29,72 phía
//    ngoài) và ở MÉP NGOÀI + ĐẦU XA của chiếu nghỉ — đầu nối vế thang và
//    phía cửa (mặt tường) luôn để trống, không chặn lối đi.
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from 'react';
import { C9 } from '../../lib/campus';
import type { TimeOfDay } from '../../lib/playerState';
import { makeWeatheredConcreteTexture, makeWoodGrainTexture } from './materials';
import { LabelPlane } from './TextPlate';

// --- Màu chốt (reference-visual §0) ------------------------------------------
const WALL = '#F4F3EF'; // tường C9 / bê tông thang, trắng hơi ngả kem
const STAIR_WHITE = '#F4F3EF'; // bản thang + chiếu nghỉ, trắng/xám rất nhạt
const PLINTH_GREY = '#E9E7E1'; // chân tường, xám rất nhạt
const GLASS = '#5E7382'; // kính cửa sổ, xám-xanh có chiều sâu
const WIN_FRAME = '#FDFCFA'; // khung bao & đố cửa sổ sơn trắng kem nổi khối 3D
const WIN_SILL = '#E2DFD7'; // bệ cửa sổ bê tông đúc nhô ra tạo bóng đổ
const GRILLE_DARK = '#3B4248'; // hoa sắt / chấn song ô thoáng trên cửa tầng trệt
const STAIR_RED = '#E8202A'; // lan can kim loại đỏ, đỏ tươi
const DOOR_YELLOW = '#D9A441'; // cửa gỗ vàng tầng trệt + cửa ra chiếu nghỉ
const RECESS_DARK = '#55504A'; // khung hõm tối sau cửa (lớp lùi, brief §7)

// --- Hình học khối nhà (từ C9 trong lib/campus.ts, KHÔNG sửa campus.ts) ------
const HEIGHT = C9.floors * C9.floorHeight; // 4 × 3,4 = 13,6 m
const HX = C9.size.x / 2; // nửa chiều rộng khối nhà (trục X): 10
const HZ = C9.size.z / 2; // nửa chiều sâu khối nhà (trục Z): 6
const EAST_WALL_X = C9.center.x + HX; // mặt đông nhà: x = -32 (mặt gắn thang)

// --- Hình học cầu thang ------------------------------------------------------
const FLIGHTS = 4; // 4 vế, mỗi vế lên đúng một tầng (xem ghi chú đầu file)
const RISE = HEIGHT / FLIGHTS; // 3,4 m/vế
const STEPS_PER_FLIGHT = 21; // bậc/vế
const STEP_RISE = RISE / STEPS_PER_FLIGHT; // ≈ 0,162 m/bậc
const TREAD = 0.29; // sâu mặt bậc
const RUN = STEPS_PER_FLIGHT * TREAD; // 6,09 m/vế
const STAIR_W = 2.4; // rộng thang (trục X)
const STAIR_X = EAST_WALL_X + 1.15; // tâm thang: mép trong ôm mặt tường Đông của C9
const STAIR_X_MIN = STAIR_X - STAIR_W / 2; // -32,05 (0,05 m trong tường: gắn chặt)
const STAIR_X_MAX = STAIR_X + STAIR_W / 2; // -29,65
const Z_C = C9.center.z; // tâm vế thang theo trục Z: -2
const Z_N = Z_C - RUN / 2; // đầu bắc vế thang: -5,045
const Z_S = Z_C + RUN / 2; // đầu nam vế thang: +1,045
const SLOPE_LEN = Math.hypot(RUN, RISE); // ≈ 6,97 m
const SLOPE_ANGLE = Math.atan2(RISE, RUN); // ≈ 29,2°
const LAND_D = 1.4; // sâu chiếu nghỉ (trục Z)
const LAND_N_Z = Z_N - LAND_D / 2; // tâm chiếu nghỉ bắc: -5,745 (z -6,445..-5,045)
const LAND_S_Z = Z_S + LAND_D / 2; // tâm chiếu nghỉ nam: +1,745 (z 1,045..2,445)
const RAIL_H = 1.0; // cao lan can
const RAIL_IN_X = STAIR_X - STAIR_W / 2 + 0.07; // lan can mép trong (phía tường): -31,98
const RAIL_OUT_X = STAIR_X + STAIR_W / 2 - 0.07; // lan can mép ngoài: -29,72
const COL_X = STAIR_X + 0.85; // cột đỡ chiếu nghỉ (góc ngoài): x = -30,0

// AABB thực tế của toàn bộ cụm thang (để luồng tích hợp đối chiếu collider):
//   x -32,05..-29,65 ; z -6,445..2,445 (chiếu nghỉ) ; y 0..16,28 (mái che đỉnh)
// NẰM TRỌN trong C9.stairs.box cũ (x -32,6..-29,6 ; z -6,8..2,8) nên KHÔNG
// cần đổi collider AABB trong campus.ts — hộp cũ vẫn bao được cụm mới.
export const C9_STAIRS_AABB = {
  minX: STAIR_X_MIN,
  maxX: STAIR_X_MAX,
  minZ: Z_N - LAND_D,
  maxZ: Z_S + LAND_D,
} as const;

// Dữ liệu hình học cho luồng tích hợp dựng collider liên tục từ chân thang
// tới chiếu nghỉ (một vế = mặt dốc nối y0→y1; đi bộ trên bậc theo đường
// giữa thang x = STAIR_X, z chạy Z_N↔Z_S; chiếu nghỉ là sàn phẳng ở y0/y1).
export const C9_STAIR_COLLIDER_DATA = {
  aabb: C9_STAIRS_AABB,
  flights: Array.from({ length: FLIGHTS }, (_, k) => {
    const dir = k % 2 === 0 ? 1 : -1; // vế chẵn đi về nam (+Z), vế lẻ về bắc (−Z)
    return {
      flight: k,
      dir,
      y0: k * RISE,
      y1: (k + 1) * RISE,
      zStart: dir > 0 ? Z_N : Z_S,
      zEnd: dir > 0 ? Z_S : Z_N,
      xMin: STAIR_X_MIN,
      xMax: STAIR_X_MAX,
      steps: STEPS_PER_FLIGHT,
      stepRise: STEP_RISE,
      tread: TREAD,
    };
  }),
  landings: Array.from({ length: FLIGHTS + 1 }, (_, k) => ({
    landing: k,
    y: k * RISE, // mặt trên chiếu nghỉ = cao độ sàn tầng k
    zMin: k % 2 === 0 ? Z_N - LAND_D : Z_S,
    zMax: k % 2 === 0 ? Z_N : Z_S + LAND_D,
    xMin: STAIR_X_MIN,
    xMax: STAIR_X_MAX,
    // Cửa mở ra chiếu nghỉ: k = 1..3 là cửa tầng trên mặt đông nhà,
    // k = 4 là cửa khối tum mái; k = 0 là mặt đất (đi thẳng vào cửa tầng trệt
    // mặt nam, không có cửa đông ở cao độ 0).
    hasDoor: k >= 1,
  })),
  // Lan can nằm ở HAI MÉP DÀI của vế thang + MÉP NGOÀI và ĐẦU XA của chiếu
  // nghỉ. Đầu nối vế↔chiếu nghỉ và phía cửa (mặt tường) KHÔNG có lan can —
  // collider lan can chỉ chặn mép ngoài/đầu xa, không chặn lối đi.
  railingX: { innerWallSide: RAIL_IN_X, outerSide: RAIL_OUT_X },
  railHeight: RAIL_H,
} as const;

export function C9Building({ timeOfDay = 'day' }: { timeOfDay?: TimeOfDay }) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset';
  const concretePbr = useMemo(() => makeWeatheredConcreteTexture(4, 3), []);
  const woodTex = useMemo(() => makeWoodGrainTexture(2, 2), []);

  useEffect(
    () => () => {
      concretePbr.map.dispose();
      concretePbr.bumpMap.dispose();
      woodTex.dispose();
    },
    [concretePbr, woodTex],
  );

  // --- Thân nhà: cửa sổ, gờ tầng, chân tường, lan can mái -------------------
  const floors = Array.from({ length: C9.floors }, (_, f) => f);
  const windowY = (f: number) => f * C9.floorHeight + 1.9;

  return (
    <group>
      {/* Khối nhà chính: trắng/kem, 20 × 12 m, cao 13,6 m, có vân bê tông PBR. */}
      <mesh
        position={[C9.center.x, HEIGHT / 2, C9.center.z]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[C9.size.x, HEIGHT, C9.size.z]} />
        <meshStandardMaterial
          color={WALL}
          map={concretePbr.map}
          bumpMap={concretePbr.bumpMap}
          bumpScale={0.012}
          roughness={0.88}
        />
      </mesh>

      {/* Dải cửa sổ 3D mặt bắc + mặt nam: khung bao nổi, bệ cửa, đố chia ô & kính lùi sâu */}
      {floors.map((f) =>
        ([-1, 1] as const).map((side) => {
          const lit = isNight && (f + side) % 2 !== 0;
          const wy = windowY(f);
          const zFrame = C9.center.z + side * (HZ + 0.03);
          const zGlass = C9.center.z + side * (HZ + 0.036);
          const zMullion = C9.center.z + side * (HZ + 0.055);
          const zSill = C9.center.z + side * (HZ + 0.068);
          const bands: Array<{ cx: number; w: number; cols: number }> =
            f === 0 && side === 1
              ? [
                  { cx: C9.center.x - 4.5, w: 7.0, cols: 3 },
                  { cx: C9.center.x + 4.5, w: 7.0, cols: 3 },
                ]
              : [{ cx: C9.center.x, w: C9.size.x - 3, cols: 7 }];
          return bands.map(({ cx, w, cols }) => {
            const mullionXs = Array.from({ length: cols + 1 }, (_, idx) => cx - w / 2 + (idx * w) / cols);
            return (
              <group key={`c9-win-${f}-${side}-${cx}`}>
                {/* Khung bao cửa sổ sơn trắng kem nổi khỏi tường */}
                <mesh position={[cx, wy, zFrame]}>
                  <boxGeometry args={[w + 0.18, 1.44, 0.06]} />
                  <meshStandardMaterial color={WIN_FRAME} roughness={0.78} />
                </mesh>
                {/* Bệ cửa sổ bê tông đúc nhô ra dưới đáy tạo bóng đổ */}
                <mesh position={[cx, wy - 0.74, zSill]} castShadow>
                  <boxGeometry args={[w + 0.28, 0.08, 0.14]} />
                  <meshStandardMaterial color={WIN_SILL} roughness={0.88} />
                </mesh>
                {/* Mặt kính lùi sâu bên trong khung */}
                <mesh position={[cx, wy, zGlass]}>
                  <boxGeometry args={[w, 1.28, 0.05]} />
                  <meshStandardMaterial
                    color={lit ? '#FFD27D' : GLASS}
                    emissive={lit ? '#FFB84D' : '#000000'}
                    emissiveIntensity={lit ? 0.78 : 0}
                    roughness={0.22}
                    metalness={0.28}
                  />
                </mesh>
                {/* Đố ngang chia ô thoáng phía trên (transom bar) */}
                <mesh position={[cx, wy + 0.34, zMullion]}>
                  <boxGeometry args={[w + 0.06, 0.055, 0.04]} />
                  <meshStandardMaterial color={WIN_FRAME} roughness={0.75} />
                </mesh>
                {/* Các đố dọc chia khoang cửa sổ 3D */}
                {mullionXs.map((mx, mIdx) => (
                  <mesh key={`mul-${mIdx}`} position={[mx, wy, zMullion]}>
                    <boxGeometry args={[0.06, 1.34, 0.045]} />
                    <meshStandardMaterial color={WIN_FRAME} roughness={0.75} />
                  </mesh>
                ))}
              </group>
            );
          });
        }),
      )}
      {/* Dải cửa sổ 3D mặt tây (x = -52): khung bao, bệ cửa, đố chia 4 khoang. */}
      {floors.map((f) => {
        const lit = isNight && f % 2 === 1;
        const wy = windowY(f);
        const wZ = C9.size.z - 3; // 9 m
        const cols = 4;
        const mullionZs = Array.from({ length: cols + 1 }, (_, idx) => C9.center.z - wZ / 2 + (idx * wZ) / cols);
        return (
          <group key={`c9-win-w-${f}`}>
            <mesh position={[C9.center.x - HX - 0.03, wy, C9.center.z]}>
              <boxGeometry args={[0.06, 1.44, wZ + 0.18]} />
              <meshStandardMaterial color={WIN_FRAME} roughness={0.78} />
            </mesh>
            <mesh position={[C9.center.x - HX - 0.068, wy - 0.74, C9.center.z]} castShadow>
              <boxGeometry args={[0.14, 0.08, wZ + 0.28]} />
              <meshStandardMaterial color={WIN_SILL} roughness={0.88} />
            </mesh>
            <mesh position={[C9.center.x - HX - 0.036, wy, C9.center.z]}>
              <boxGeometry args={[0.05, 1.28, wZ]} />
              <meshStandardMaterial
                color={lit ? '#FFD27D' : GLASS}
                emissive={lit ? '#FFB84D' : '#000000'}
                emissiveIntensity={lit ? 0.78 : 0}
                roughness={0.22}
                metalness={0.28}
              />
            </mesh>
            <mesh position={[C9.center.x - HX - 0.055, wy + 0.34, C9.center.z]}>
              <boxGeometry args={[0.04, 0.055, wZ + 0.06]} />
              <meshStandardMaterial color={WIN_FRAME} roughness={0.75} />
            </mesh>
            {mullionZs.map((mz, mIdx) => (
              <mesh key={`wmul-${mIdx}`} position={[C9.center.x - HX - 0.055, wy, mz]}>
                <boxGeometry args={[0.045, 1.34, 0.06]} />
                <meshStandardMaterial color={WIN_FRAME} roughness={0.75} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Gờ ngang chia tầng (mặt bắc/nam/tây) — đọc được nhịp tầng, tạo bóng. */}
      {[1, 2, 3].map((f) => (
        <group key={`c9-course-${f}`}>
          {([-1, 1] as const).map((side) => (
            <mesh
              key={`c-${side}`}
              position={[
                C9.center.x,
                f * C9.floorHeight,
                C9.center.z + side * (HZ + 0.04),
              ]}
            >
              <boxGeometry args={[C9.size.x + 0.06, 0.14, 0.08]} />
              <meshStandardMaterial color={WALL} roughness={0.9} />
            </mesh>
          ))}
          <mesh
            position={[
              C9.center.x - HX - 0.04,
              f * C9.floorHeight,
              C9.center.z,
            ]}
          >
            <boxGeometry args={[0.08, 0.14, C9.size.z + 0.06]} />
            <meshStandardMaterial color={WALL} roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Chân tường: mặt bắc + mặt tây + mặt nam hai đoạn chừa cửa. */}
      <mesh position={[C9.center.x, 0.25, C9.center.z - HZ - 0.06]}>
        <boxGeometry args={[C9.size.x + 0.2, 0.5, 0.12]} />
        <meshStandardMaterial color={PLINTH_GREY} roughness={0.92} />
      </mesh>
      <mesh position={[C9.center.x - HX - 0.06, 0.25, C9.center.z]}>
        <boxGeometry args={[0.12, 0.5, C9.size.z + 0.2]} />
        <meshStandardMaterial color={PLINTH_GREY} roughness={0.92} />
      </mesh>
      {([C9.center.x - 4.5, C9.center.x + 4.5] as const).map((px) => (
        <mesh key={`c9-plinth-s-${px}`} position={[px, 0.25, C9.center.z + HZ + 0.06]}>
          <boxGeometry args={[7.2, 0.5, 0.12]} />
          <meshStandardMaterial color={PLINTH_GREY} roughness={0.92} />
        </mesh>
      ))}

      {/* Lan can mái (parapet) cao 0,35 m */}
      <mesh position={[C9.center.x, HEIGHT + 0.175, C9.center.z - HZ - 0.075]}>
        <boxGeometry args={[C9.size.x, 0.35, 0.15]} />
        <meshStandardMaterial color={WALL} roughness={0.9} />
      </mesh>
      <mesh position={[C9.center.x, HEIGHT + 0.175, C9.center.z + HZ + 0.075]}>
        <boxGeometry args={[C9.size.x, 0.35, 0.15]} />
        <meshStandardMaterial color={WALL} roughness={0.9} />
      </mesh>
      <mesh position={[C9.center.x - HX - 0.075, HEIGHT + 0.175, C9.center.z]}>
        <boxGeometry args={[0.15, 0.35, C9.size.z]} />
        <meshStandardMaterial color={WALL} roughness={0.9} />
      </mesh>
      <mesh position={[EAST_WALL_X + 0.075, HEIGHT + 0.175, C9.center.z - 5.22]}>
        <boxGeometry args={[0.15, 0.35, 1.56]} />
        <meshStandardMaterial color={WALL} roughness={0.9} />
      </mesh>
      <mesh position={[EAST_WALL_X + 0.075, HEIGHT + 0.175, C9.center.z + 1.48]}>
        <boxGeometry args={[0.15, 0.35, 9.05]} />
        <meshStandardMaterial color={WALL} roughness={0.9} />
      </mesh>

      {/* Cửa gỗ vàng tầng trệt, mặt nam (vân gỗ tự nhiên) + khung bao 3D + ô thoáng song sắt. */}
      <mesh position={[C9.center.x, 1.55, C9.center.z + HZ + 0.03]}>
        <boxGeometry args={[2.1, 3.1, 0.06]} />
        <meshStandardMaterial color={WIN_FRAME} roughness={0.8} />
      </mesh>
      <mesh position={[C9.center.x, 1.48, C9.center.z + HZ + 0.045]}>
        <boxGeometry args={[1.92, 2.96, 0.06]} />
        <meshStandardMaterial color={RECESS_DARK} roughness={0.9} />
      </mesh>
      <mesh position={[C9.center.x, 1.25, C9.center.z + HZ + 0.068]}>
        <boxGeometry args={[1.82, 2.45, 0.08]} />
        <meshStandardMaterial color={DOOR_YELLOW} map={woodTex} roughness={0.75} />
      </mesh>
      {/* Khe chia 2 cánh cửa mặt nam + tay nắm */}
      <mesh position={[C9.center.x, 1.25, C9.center.z + HZ + 0.112]}>
        <boxGeometry args={[0.03, 2.42, 0.02]} />
        <meshStandardMaterial color={RECESS_DARK} roughness={0.85} />
      </mesh>
      {/* Ô thoáng kính có song sắt phía trên cửa mặt nam */}
      <mesh position={[C9.center.x, 2.72, C9.center.z + HZ + 0.06]}>
        <boxGeometry args={[1.82, 0.42, 0.05]} />
        <meshStandardMaterial color={GLASS} roughness={0.28} metalness={0.25} />
      </mesh>
      {[-0.6, -0.3, 0, 0.3, 0.6].map((dx) => (
        <mesh key={`s-door-bar-${dx}`} position={[C9.center.x + dx, 2.72, C9.center.z + HZ + 0.092]}>
          <boxGeometry args={[0.025, 0.42, 0.025]} />
          <meshStandardMaterial color={GRILLE_DARK} roughness={0.6} metalness={0.4} />
        </mesh>
      ))}

      {/* Cửa đôi gỗ vàng tầng trệt ở mặt Đông cạnh chân cầu thang đỏ (y = 0, z = LAND_N_Z)
          khớp 100% ảnh thật tham-khao/c9/c9-cau-thang-do-01.jpg (cửa 2 cánh chia pano + ô thoáng song sắt phía trên) */}
      <group position={[EAST_WALL_X, 0, LAND_N_Z]}>
        <mesh position={[0.03, 1.52, 0]}>
          <boxGeometry args={[0.06, 3.04, 1.56]} />
          <meshStandardMaterial color={WIN_FRAME} roughness={0.8} />
        </mesh>
        <mesh position={[0.045, 1.48, 0]}>
          <boxGeometry args={[0.06, 2.92, 1.42]} />
          <meshStandardMaterial color={RECESS_DARK} roughness={0.9} />
        </mesh>
        <mesh position={[0.068, 1.22, 0]}>
          <boxGeometry args={[0.08, 2.4, 1.34]} />
          <meshStandardMaterial color={DOOR_YELLOW} map={woodTex} roughness={0.74} />
        </mesh>
        {/* Khe giữa 2 cánh cửa đôi mặt Đông */}
        <mesh position={[0.112, 1.22, 0]}>
          <boxGeometry args={[0.02, 2.38, 0.03]} />
          <meshStandardMaterial color={RECESS_DARK} roughness={0.85} />
        </mesh>
        {/* Ô thoáng có chấn song sắt phía trên cửa tầng trệt mặt Đông */}
        <mesh position={[0.06, 2.68, 0]}>
          <boxGeometry args={[0.05, 0.44, 1.34]} />
          <meshStandardMaterial color={GLASS} roughness={0.28} metalness={0.25} />
        </mesh>
        {[-0.44, -0.22, 0, 0.22, 0.44].map((dz) => (
          <mesh key={`e-gdoor-bar-${dz}`} position={[0.092, 2.68, dz]}>
            <boxGeometry args={[0.025, 0.44, 0.025]} />
            <meshStandardMaterial color={GRILLE_DARK} roughness={0.6} metalness={0.4} />
          </mesh>
        ))}
      </group>

      {/* Cửa ra chiếu nghỉ ở các tầng 1–3, mặt đông: cửa gỗ vàng có khung bao + ô thoáng song sắt + đèn ban đêm */}
      {([1, 2, 3] as const).map((k) => {
        const landZ = k % 2 === 0 ? LAND_N_Z : LAND_S_Z;
        const doorY = k * RISE;
        return (
          <group key={`c9-door-${k}`}>
            <mesh position={[EAST_WALL_X + 0.03, doorY + 1.35, landZ]}>
              <boxGeometry args={[0.06, 2.7, 1.38]} />
              <meshStandardMaterial color={WIN_FRAME} roughness={0.8} />
            </mesh>
            <mesh position={[EAST_WALL_X + 0.045, doorY + 1.32, landZ]}>
              <boxGeometry args={[0.06, 2.62, 1.26]} />
              <meshStandardMaterial color={RECESS_DARK} roughness={0.9} />
            </mesh>
            <mesh position={[EAST_WALL_X + 0.068, doorY + 1.1, landZ]}>
              <boxGeometry args={[0.08, 2.18, 1.16]} />
              <meshStandardMaterial color={DOOR_YELLOW} map={woodTex} roughness={0.75} />
            </mesh>
            {/* Khe chia 2 cánh cửa chiếu nghỉ */}
            <mesh position={[EAST_WALL_X + 0.112, doorY + 1.1, landZ]}>
              <boxGeometry args={[0.02, 2.16, 0.028]} />
              <meshStandardMaterial color={RECESS_DARK} roughness={0.85} />
            </mesh>
            {/* Ô thoáng kính có song sắt phía trên cửa chiếu nghỉ */}
            <mesh position={[EAST_WALL_X + 0.06, doorY + 2.41, landZ]}>
              <boxGeometry args={[0.05, 0.36, 1.16]} />
              <meshStandardMaterial color={GLASS} roughness={0.28} metalness={0.25} />
            </mesh>
            {[-0.36, -0.18, 0, 0.18, 0.36].map((dz) => (
              <mesh key={`c9-ldoor-bar-${k}-${dz}`} position={[EAST_WALL_X + 0.092, doorY + 2.41, landZ + dz]}>
                <boxGeometry args={[0.022, 0.36, 0.022]} />
                <meshStandardMaterial color={GRILLE_DARK} roughness={0.6} metalness={0.4} />
              </mesh>
            ))}
            {isNight && (
              <mesh position={[EAST_WALL_X + 0.12, doorY + 2.74, landZ]}>
                <boxGeometry args={[0.12, 0.1, 0.36]} />
                <meshStandardMaterial color="#FFF3CC" emissive="#FFCC66" emissiveIntensity={1.4} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Biển tên tòa nhà "NHÀ C9" gắn ở mặt Đông (ngoài cột chiếu nghỉ nam z <= 2.42) và mặt Nam cạnh cửa chính */}
      <LabelPlane
        textureKey="c9-building-sign"
        canvasW={384}
        canvasH={128}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#B81D24';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#F5C518';
          ctx.lineWidth = 8;
          ctx.strokeRect(6, 6, w - 12, h - 12);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 58px Arial, sans-serif';
          ctx.fillText('NHÀ C9', w / 2, h / 2 + 2);
        }}
        size={[1.36, 0.48]}
        position={[EAST_WALL_X + 0.065, 3.65, C9.center.z + 5.18]}
        rotation={[0, Math.PI / 2, 0]}
        transparent={false}
      />
      <LabelPlane
        textureKey="c9-building-sign"
        canvasW={384}
        canvasH={128}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#B81D24';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#F5C518';
          ctx.lineWidth = 8;
          ctx.strokeRect(6, 6, w - 12, h - 12);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 58px Arial, sans-serif';
          ctx.fillText('NHÀ C9', w / 2, h / 2 + 2);
        }}
        size={[1.45, 0.5]}
        position={[C9.center.x + 2.2, 2.65, C9.center.z + HZ + 0.068]}
        rotation={[0, 0, 0]}
        transparent={false}
      />

      {/* --- Cầu thang zic-zac 4 vế ------------------------------------------- */}
      {Array.from({ length: FLIGHTS }, (_, k) => {
        const dir = k % 2 === 0 ? 1 : -1; // vế chẵn đi về nam, vế lẻ về bắc
        const y0 = k * RISE;
        const y1 = (k + 1) * RISE;
        const zStart = dir > 0 ? Z_N : Z_S; // chân vế (đầu thấp)
        const steps = Array.from({ length: STEPS_PER_FLIGHT }, (_, j) => {
          const topY = y0 + (j + 1) * STEP_RISE;
          const zc = zStart + dir * (j + 0.5) * TREAD;
          return (
            <mesh
              key={`step-${k}-${j}`}
              position={[STAIR_X, topY - STEP_RISE / 2, zc]}
              castShadow
              receiveShadow
            >
              {/* Hộp đặc: mặt trên là mặt bậc, mặt trước là cổ bậc. */}
              <boxGeometry args={[STAIR_W, STEP_RISE, TREAD + 0.03]} />
              <meshStandardMaterial color={STAIR_WHITE} roughness={0.95} />
            </mesh>
          );
        });
        return (
          <group key={`flight-${k}`}>
            {/* Bản thang: dầm dốc dưới bậc, trắng nhạt như bậc. */}
            <mesh
              position={[STAIR_X, (y0 + y1) / 2 - 0.3, Z_C]}
              rotation-x={dir > 0 ? -SLOPE_ANGLE : SLOPE_ANGLE}
              castShadow
            >
              <boxGeometry args={[2.0, 0.22, SLOPE_LEN]} />
              <meshStandardMaterial color={STAIR_WHITE} roughness={0.95} />
            </mesh>
            {steps}
            {/* Lan can đỏ HAI MÉP vế thang: tay vịn + 2 thanh ngang + trụ
                đứng mảnh. Giữa hai lan can còn ~2,26 m lối đi thông suốt.
                Không có tấm đặc giữa các vế — nhìn xuyên qua được. */}
            {[RAIL_IN_X, RAIL_OUT_X].map((rx) => (
              <group key={`rail-${k}-${rx}`}>
                {[
                  { h: RAIL_H, s: 0.06 },
                  { h: 0.68, s: 0.04 },
                  { h: 0.36, s: 0.04 },
                ].map(({ h, s }) => (
                  <mesh
                    key={`railbar-${h}`}
                    position={[rx, (y0 + y1) / 2 + h, Z_C]}
                    rotation-x={dir > 0 ? -SLOPE_ANGLE : SLOPE_ANGLE}
                  >
                    <boxGeometry args={[s, s, SLOPE_LEN]} />
                    <meshStandardMaterial
                      color={STAIR_RED}
                      roughness={0.55}
                      metalness={0.35}
                    />
                  </mesh>
                ))}
                {Array.from({ length: 7 }, (_, i) => {
                  const t = i / 6;
                  return (
                    <mesh
                      key={`bal-${i}`}
                      position={[
                        rx,
                        y0 + t * RISE + RAIL_H / 2,
                        zStart + dir * t * RUN,
                      ]}
                    >
                      <boxGeometry args={[0.045, RAIL_H, 0.045]} />
                      <meshStandardMaterial
                        color={STAIR_RED}
                        roughness={0.55}
                        metalness={0.35}
                      />
                    </mesh>
                  );
                })}
              </group>
            ))}
          </group>
        );
      })}

      {/* --- Chiếu nghỉ (5 sàn: mặt đất + 4 tầng) ------------------------------
          Chiếu nghỉ chẵn (0, 2, 4) ở đầu bắc, lẻ (1, 3) ở đầu nam. */}
      {Array.from({ length: FLIGHTS + 1 }, (_, k) => {
        const landY = k * RISE;
        const landZ = k % 2 === 0 ? LAND_N_Z : LAND_S_Z;
        const farZ = landZ + (k % 2 === 0 ? -LAND_D / 2 : LAND_D / 2);
        return (
          <group key={`landing-${k}`}>
            {/* Sàn chiếu nghỉ, mặt trên đúng cao độ tầng. */}
            <mesh
              position={[STAIR_X, landY - 0.125, landZ]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[STAIR_W, 0.25, LAND_D]} />
              <meshStandardMaterial color={STAIR_WHITE} roughness={0.95} />
            </mesh>
            {/* Cột vuông trắng đỡ 2 góc ngoài của chiếu nghỉ xuống đất
                (chiếu nghỉ mặt đất k = 0 không cần cột). */}
            {k > 0 &&
              ([-0.45, 0.45] as const).map((dz) => (
                <mesh
                  key={`col-${k}-${dz}`}
                  position={[
                    COL_X,
                    (landY - 0.25) / 2,
                    landZ + dz,
                  ]}
                  castShadow
                >
                  <boxGeometry args={[0.45, landY - 0.25, 0.45]} />
                  <meshStandardMaterial color={STAIR_WHITE} roughness={0.95} />
                </mesh>
              ))}
            {/* Lan can đỏ quanh chiếu nghỉ (trừ mặt đất): MÉP NGOÀI + ĐẦU XA.
                Đầu nối vế thang và phía cửa (mặt tường) để trống. */}
            {k > 0 && (
              <group>
                {/* Mép ngoài (x = -29,72), dọc theo chiều sâu chiếu nghỉ. */}
                {[
                  { h: RAIL_H, s: 0.06 },
                  { h: 0.68, s: 0.04 },
                  { h: 0.36, s: 0.04 },
                ].map(({ h, s }) => (
                  <mesh
                    key={`lr-out-${h}`}
                    position={[RAIL_OUT_X, landY + h, landZ]}
                  >
                    <boxGeometry args={[s, s, LAND_D]} />
                    <meshStandardMaterial
                      color={STAIR_RED}
                      roughness={0.55}
                      metalness={0.35}
                    />
                  </mesh>
                ))}
                {([-0.65, 0, 0.65] as const).map((dz) => (
                  <mesh
                    key={`lr-out-post-${dz}`}
                    position={[RAIL_OUT_X, landY + RAIL_H / 2, landZ + dz]}
                  >
                    <boxGeometry args={[0.045, RAIL_H, 0.045]} />
                    <meshStandardMaterial
                      color={STAIR_RED}
                      roughness={0.55}
                      metalness={0.35}
                    />
                  </mesh>
                ))}
                {/* Đầu xa (đầu bắc/south xa vế thang), ngang theo trục X. */}
                {[
                  { h: RAIL_H, s: 0.06 },
                  { h: 0.68, s: 0.04 },
                  { h: 0.36, s: 0.04 },
                ].map(({ h, s }) => (
                  <mesh
                    key={`lr-far-${h}`}
                    position={[STAIR_X, landY + h, farZ]}
                  >
                    <boxGeometry args={[STAIR_W, s, s]} />
                    <meshStandardMaterial
                      color={STAIR_RED}
                      roughness={0.55}
                      metalness={0.35}
                    />
                  </mesh>
                ))}
                {/* Trụ đầu xa: góc trong + giữa (góc ngoài trùng trụ mép
                    ngoài nên không lặp lại để tránh mặt trùng nhau). */}
                {[RAIL_IN_X, STAIR_X].map((px) => (
                  <mesh
                    key={`lr-far-post-${px}`}
                    position={[px, landY + RAIL_H / 2, farZ]}
                  >
                    <boxGeometry args={[0.045, RAIL_H, 0.045]} />
                    <meshStandardMaterial
                      color={STAIR_RED}
                      roughness={0.55}
                      metalness={0.35}
                    />
                  </mesh>
                ))}
              </group>
            )}
          </group>
        );
      })}

      {/* --- Khối tum thang trên mái + mái che chiếu nghỉ đỉnh (L4) ------------
          L4 ở cao độ mái (13,6 m): không có tường tầng trên để mở cửa nên
          đặt khối tum nhỏ trên mái, cửa tum mở ra chiếu nghỉ; mái tum đua ra
          che chiếu nghỉ đỉnh như trong ảnh (tấm sàn mỏng trên cao). */}
      <mesh position={[EAST_WALL_X - 1.0, HEIGHT + 1.25, LAND_N_Z]} castShadow>
        <boxGeometry args={[2, 2.5, LAND_D]} />
        <meshStandardMaterial color={WALL} roughness={0.95} />
      </mesh>
      {/* Cửa tum (mặt đông khối tum, mở ra L4). */}
      <mesh position={[EAST_WALL_X + 0.06, HEIGHT + 1.1, LAND_N_Z]}>
        <boxGeometry args={[0.1, 2.2, 1.1]} />
        <meshStandardMaterial color={DOOR_YELLOW} roughness={0.8} />
      </mesh>
      {/* Mái che chiếu nghỉ đỉnh: tấm mỏng đua ra từ mái tum. */}
      <mesh position={[EAST_WALL_X + 0.22, HEIGHT + 2.59, LAND_N_Z]} castShadow>
        <boxGeometry args={[4.45, 0.18, 1.7]} />
        <meshStandardMaterial color={STAIR_WHITE} roughness={0.95} />
      </mesh>
      {/* 2 cột mảnh đỡ mái che, đứng trên chiếu nghỉ đỉnh. */}
      {([-0.45, 0.45] as const).map((dz) => (
        <mesh
          key={`canopy-col-${dz}`}
          position={[COL_X, HEIGHT + 1.25, LAND_N_Z + dz]}
        >
          <boxGeometry args={[0.22, 2.5, 0.22]} />
          <meshStandardMaterial color={STAIR_WHITE} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}
