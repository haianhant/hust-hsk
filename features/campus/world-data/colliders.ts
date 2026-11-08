// ---------------------------------------------------------------------------
// features/campus/world-data/colliders.ts — Danh sách hộp va chạm 2D (AABB)
// cho người đi bộ, phòng học, sảnh thư viện và vật cản hình tròn cho xe máy.
// ---------------------------------------------------------------------------

import type { AABB, Vec2 } from './bounds';
import {
  C1,
  C2_BUILDING,
  C6_BUILDING,
  C7_BUILDING,
  C8_BUILDING,
  C9,
  D4_BUILDING,
  DORM_COMPLEX,
  EAST_CAMPUS_BLOCKS,
  HUST_SIGN,
  I_LOVE_BK,
  LAKE_BANK,
  LAKE_WILLOWS,
  LECTURE_BUILDINGS,
  PARABOL_GATE,
  SOICT_B1,
  SPORTS_COMPLEX,
  VDZ_CENTER,
  WHITE_ROCK,
} from './buildings';
import { LOVE_ROAD_TREES } from './roads';

export type NamedCollider = {
  name: string;
  box: AABB;
};

export const BUILDING_COLLIDERS: NamedCollider[] = [
  { name: 'C1', box: { minX: -82, maxX: -34, minZ: -63, maxZ: -49 } },
  { name: 'Tháp hoa gió đầu hồi C1', box: { minX: -34.2, maxX: -32.2, minZ: -58.5, maxZ: -53.5 } },
  { name: 'Bậc tam cấp C1', box: C1.steps },
  { name: 'Bệ chữ I LOVE BK', box: I_LOVE_BK.plinth },
  { name: 'Khối đá trắng', box: WHITE_ROCK.box },
  { name: 'Thư viện Tạ Quang Bửu (tháp)', box: { minX: 25.5, maxX: 50.5, minZ: 29.5, maxZ: 43.5 } }, // Mở rộng tháp 3 nhịp x 25,5..50,5 (25 m, mái đua tới 24,7..51,3) theo tham-khao/thu-vien/
  { name: 'Thư viện Tạ Quang Bửu (khối đế)', box: { minX: 31.0, maxX: 45.0, minZ: 23.5, maxZ: 30.5 } }, // Khối đế rộng 14 m (x 31..45), z 24..30; mái hiên 6 cột tròn (z 18..24,5) + bậc (z 17..19) ngoài collider để avatar đứng được dưới mái trước cửa; avatar áp sát từ phía bắc dừng ở z ≈ 23,1, cách cửa kính (z 26,5) ~3,4 m
  { name: 'Bệ chữ HUST', box: HUST_SIGN.plinth }, // đợt 4: bệ đen chữ HUST trước sảnh; đi vòng qua 2 bên (lối rộng ~2 m phía tây, ~5 m phía đông)
  { name: 'C9', box: { minX: -52, maxX: -32, minZ: -8, maxZ: 4 } },
  { name: 'Cầu thang C9', box: C9.stairs.box },
  { name: 'Chân cổng Parabol (nam)', box: PARABOL_GATE.legAabbs[0] },
  { name: 'Chân cổng Parabol (bắc)', box: PARABOL_GATE.legAabbs[1] },
  { name: 'Nhà gác cổng Parabol', box: PARABOL_GATE.guardHouse },
  // Cổng Trần Đại Nghĩa (biển đá trung tâm chia 2 làn xe & nhà bảo vệ bên phải theo tham-khao/cong-tran-dai-nghia/)
  { name: 'Biển đá Cổng Trần Đại Nghĩa', box: { minX: 91.1, maxX: 93.4, minZ: -8.8, maxZ: -3.2 } },
  { name: 'Nhà bảo vệ Cổng Trần Đại Nghĩa', box: { minX: 89.2, maxX: 93.2, minZ: -17.2, maxZ: -13.6 } },
  { name: 'Bờ kè Hồ Tiền (tây)', box: LAKE_BANK[0] },
  { name: 'Bờ kè Hồ Tiền (đông)', box: LAKE_BANK[1] },
  { name: 'Bờ kè Hồ Tiền (bắc)', box: LAKE_BANK[2] },
  { name: 'Bờ kè Hồ Tiền (nam)', box: LAKE_BANK[3] },
  // Ghế (mặt ngồi 1,9 × 0,7 m) — đều đặt ngoài đường đi chính.
  { name: 'Ghế bờ hồ', box: { minX: -27.85, maxX: -27.15, minZ: 29.05, maxZ: 30.95 } },
  { name: 'Ghế bờ hồ', box: { minX: -27.85, maxX: -27.15, minZ: 61.05, maxZ: 62.95 } },
  { name: 'Ghế bờ hồ', box: { minX: 21.95, maxX: 22.65, minZ: 19.05, maxZ: 20.95 } },
  { name: 'Ghế bờ hồ', box: { minX: 21.95, maxX: 22.65, minZ: 67.05, maxZ: 68.95 } },
  { name: 'Ghế quảng trường C1', box: { minX: -72.95, maxX: -71.05, minZ: -30.35, maxZ: -29.65 } },
  { name: 'Ghế quảng trường C1', box: { minX: -44.95, maxX: -43.05, minZ: -44.35, maxZ: -43.65 } },
  // Bồn cỏ quảng trường C1 (Ground.tsx, đợt sửa kiến trúc): hộp cỏ 14 × 3 m,
  // đỉnh y = 0,20 — avatar đi xuyên qua sẽ lún chân vào cỏ nên chặn bằng
  // collider; chừa lối giữa rộng 16 m (x −66..−50) vào bậc tam cấp và không
  // chặn chặng nào (leg2 kết thúc ở (−58,−36), cách bồn ≥ 6,5 m; cửa phòng
  // học ở (−58,−45,5) nằm đúng lối giữa).
  { name: 'Bồn cỏ quảng trường C1 (tây)', box: { minX: -80, maxX: -66, minZ: -45.5, maxZ: -42.5 } },
  { name: 'Bồn cỏ quảng trường C1 (đông)', box: { minX: -50, maxX: -36, minZ: -45.5, maxZ: -42.5 } },
  // Bồn cỏ 11 × 12 m trong C1Building.tsx (cx −69,5 và −46,5, z −43..−31,
  // đỉnh y = 0,12, có cây Lipa trồng trong bồn): hai bồn kẹp lối giữa
  // x −64..−52 rộng 12 m — leg2 (−58,−36) và cửa phòng học (−58,−45,5)
  // đều nằm đúng lối giữa nên không chặn đường.
  { name: 'Bồn cỏ C1Building (tây)', box: { minX: -75, maxX: -64, minZ: -43.15, maxZ: -30.85 } },
  { name: 'Bồn cỏ C1Building (đông)', box: { minX: -52, maxX: -41, minZ: -43.15, maxZ: -30.85 } },
  { name: 'Ghế đường tình yêu', box: { minX: -30.95, maxX: -29.05, minZ: -13.35, maxZ: -12.65 } },
  { name: 'Ghế đường tình yêu', box: { minX: 19.05, maxX: 20.95, minZ: -13.35, maxZ: -12.65 } },
  { name: 'Ghế đường tình yêu', box: { minX: 69.05, maxX: 70.95, minZ: -13.35, maxZ: -12.65 } },
  // Các công trình mở rộng toàn trường theo Bản đồ Bách Khoa (khuon-vien-truong.png)
  { name: 'Nhà C2', box: C2_BUILDING.box },
  { name: 'Tòa nhà C6', box: C6_BUILDING.box },
  { name: 'Tòa nhà C7', box: C7_BUILDING.box },
  { name: 'Tòa nhà C8', box: C8_BUILDING.box },
  { name: 'Nhà D4 (Viện Ngoại ngữ)', box: D4_BUILDING.box },
  ...LECTURE_BUILDINGS.map((b) => ({ name: `Nhà ${b.code}`, box: b.box })),
  { name: 'Trung tâm Việt – Đức', box: VDZ_CENTER.box },
  { name: 'Nhà B1 (SoICT)', box: SOICT_B1.box },
  { name: 'Tòa A17', box: EAST_CAMPUS_BLOCKS.a17.box },
  { name: 'Tòa H1', box: EAST_CAMPUS_BLOCKS.h1.box },
  { name: 'Tòa H3', box: EAST_CAMPUS_BLOCKS.h3.box },
  { name: 'Nhà T', box: EAST_CAMPUS_BLOCKS.nhaT.box },
  { name: 'Nhà thi đấu TC', box: SPORTS_COMPLEX.stadiumBox },
  { name: 'Bể bơi Bách Khoa', box: SPORTS_COMPLEX.poolBox },
  { name: 'KTX Lào', box: SPORTS_COMPLEX.ktxLaoBox },
  { name: 'KTX B6', box: DORM_COMPLEX.b6Box },
  { name: 'KTX B7', box: DORM_COMPLEX.b7Box },
  { name: 'KTX B7bis', box: DORM_COMPLEX.b7bisBox },
  { name: 'KTX B8 (VP Hội Sinh viên)', box: DORM_COMPLEX.b8Box },
  { name: 'KTX B5', box: DORM_COMPLEX.b5Box },
  { name: 'KTX B9', box: DORM_COMPLEX.b9Box },
  { name: 'KTX B13', box: DORM_COMPLEX.b13Box },
  { name: 'Căng-tin SV', box: DORM_COMPLEX.canteenBox },
  { name: 'KTX B3', box: DORM_COMPLEX.b3Box },
  { name: 'KTX B10', box: DORM_COMPLEX.b10Box },
  { name: 'KTX B4', box: DORM_COMPLEX.b4Box },
  // Tường rào bao quanh khuôn viên & dọc đường Trần Đại Nghĩa (chừa thông thoáng các cổng)
  { name: 'Tường rào Trần Đại Nghĩa (bắc 1)', box: { minX: 91.85, maxX: 92.35, minZ: -75.2, maxZ: -31.5 } },
  { name: 'Tường rào Trần Đại Nghĩa (bắc 2)', box: { minX: 91.85, maxX: 92.35, minZ: -25.0, maxZ: -17.2 } },
  { name: 'Tường rào Trần Đại Nghĩa (nam 1)', box: { minX: 91.85, maxX: 92.35, minZ: 0.5, maxZ: 9.5 } },
  { name: 'Tường rào Trần Đại Nghĩa (nam 2)', box: { minX: 91.85, maxX: 92.35, minZ: 18.5, maxZ: 42.0 } },
  { name: 'Tường rào Đại Cồ Việt (tây)', box: { minX: -95.2, maxX: -70.5, minZ: -75.45, maxZ: -74.95 } },
  { name: 'Tường rào Đại Cồ Việt (giữa)', box: { minX: -45.5, maxX: 92.1, minZ: -75.45, maxZ: -74.95 } },
  { name: 'Tường rào Đại Cồ Việt (đông 1)', box: { minX: 98.0, maxX: 120.2, minZ: -75.45, maxZ: -74.95 } },
  { name: 'Tường rào Đại Cồ Việt (đông 2)', box: { minX: 131.8, maxX: 166.0, minZ: -75.45, maxZ: -74.95 } },
  { name: 'Tường rào Giải Phóng (bắc)', box: { minX: -95.45, maxX: -94.95, minZ: -75.2, maxZ: -12.0 } },
  { name: 'Tường rào Parabol (bắc)', box: { minX: -88.25, maxX: -87.75, minZ: -12.0, maxZ: 3.2 } },
  { name: 'Tường rào Parabol (nam)', box: { minX: -88.25, maxX: -87.75, minZ: 16.8, maxZ: 20.2 } },
  { name: 'Tường rào Giải Phóng (nam)', box: { minX: -95.45, maxX: -94.95, minZ: 26.5, maxZ: 106.5 } },
  { name: 'Tường rào Lê Thanh Nghị (nam)', box: { minX: -95.2, maxX: 166.0, minZ: 106.25, maxZ: 106.75 } },
  { name: 'Tường rào biên Đông', box: { minX: 165.75, maxX: 166.25, minZ: -75.2, maxZ: 106.5 } },
];

/** Collider phòng học (tường/bảng/bàn) — cùng dạng AABB như campus. */
export const CLASSROOM_COLLIDERS: NamedCollider[] = [
  { name: 'Tường bắc phòng học', box: { minX: -4.5, maxX: 4.5, minZ: -3.1, maxZ: -2.9 } },
  { name: 'Tường nam phòng học', box: { minX: -4.5, maxX: 4.5, minZ: 2.9, maxZ: 3.1 } },
  { name: 'Tường tây phòng học', box: { minX: -4.6, maxX: -4.4, minZ: -3, maxZ: 3 } },
  { name: 'Tường đông phòng học', box: { minX: 4.4, maxX: 4.6, minZ: -3, maxZ: 3 } },
  { name: 'Bảng đen', box: { minX: -1.8, maxX: 1.8, minZ: -3, maxZ: -2.7 } },
  { name: 'Bàn học 1', box: { minX: -2.8, maxX: -1.6, minZ: 0.3, maxZ: 0.9 } },
  { name: 'Bàn học 2', box: { minX: -0.6, maxX: 0.6, minZ: 0.3, maxZ: 0.9 } },
  { name: 'Bàn học 3', box: { minX: 1.6, maxX: 2.8, minZ: 0.3, maxZ: 0.9 } },
];

/** Collider sảnh tầng 1 Thư viện Tạ Quang Bửu. */
export const LIBRARY_LOBBY_COLLIDERS: NamedCollider[] = [
  { name: 'Tường bắc sảnh thư viện', box: { minX: -6.0, maxX: 6.0, minZ: -4.3, maxZ: -3.95 } },
  { name: 'Tường nam sảnh thư viện', box: { minX: -6.0, maxX: 6.0, minZ: 3.95, maxZ: 4.3 } },
  { name: 'Tường tây sảnh thư viện', box: { minX: -6.0, maxX: -5.55, minZ: -4.2, maxZ: 4.2 } },
  { name: 'Tường đông sảnh thư viện', box: { minX: 5.55, maxX: 6.0, minZ: -4.2, maxZ: 4.2 } },
  { name: 'Tượng GS. Tạ Quang Bửu', box: { minX: -1.35, maxX: 1.35, minZ: -3.1, maxZ: -1.1 } },
  { name: 'Quầy thông tin thư viện', box: { minX: -4.5, maxX: -2.7, minZ: -1.4, maxZ: 0.2 } },
  { name: 'Bảng từ vựng thư viện', box: { minX: 2.9, maxX: 4.4, minZ: -1.2, maxZ: 0.0 } },
  // Hai bàn đọc tự học và 4 ghế ngồi tại Sảnh tầng 1 Thư viện (PR8)
  { name: 'Bàn đọc Tây 1', box: { minX: -2.83, maxX: -1.47, minZ: 1.37, maxZ: 2.13 } },
  { name: 'Bàn đọc Đông 2', box: { minX: 1.47, maxX: 2.83, minZ: 1.37, maxZ: 2.13 } },
  { name: 'Ghế học tqb-1f-t1-s1', box: { minX: -2.62, maxX: -2.18, minZ: 1.02, maxZ: 1.36 } },
  { name: 'Ghế học tqb-1f-t1-s2', box: { minX: -2.12, maxX: -1.68, minZ: 2.14, maxZ: 2.48 } },
  { name: 'Ghế học tqb-1f-t2-s1', box: { minX: 1.68, maxX: 2.12, minZ: 1.02, maxZ: 1.36 } },
  { name: 'Ghế học tqb-1f-t2-s2', box: { minX: 2.18, maxX: 2.62, minZ: 2.14, maxZ: 2.48 } },
];

// --- Helper xe máy (đợt 3 giai đoạn 4) ---------------------------------------
// Cây KHÔNG có collider cho người đi bộ (quyết định đợt 3 giai đoạn 3: tán
// thoáng, không kẹt dưới tán) — nhưng xe chạy nhanh đâm vào thân cây thì
// phải dừng/trượt, nên RIÊNG xe dùng thêm các vòng tròn thân cây (r 0,3 m,
// chỉ quanh thân, không bao tán) + vòng tròn NPC Minh (r 0,5 m).
export const TREE_TRUNKS: Vec2[] = [
  ...LOVE_ROAD_TREES,
  ...LAKE_WILLOWS,
  ...C1.lipaTrees,
];

/** NPC Minh đứng gần cổng Parabol — xe không được đâm xuyên qua. */
export const NPC_CIRCLES: { pos: Vec2; radius: number }[] = [
  { pos: { x: -72, z: 8 }, radius: 0.5 },
];
