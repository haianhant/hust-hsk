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
  C7_FACULTY_PARKING,
  C8_BUILDING,
  C9,
  D3_D5_PARKING_GARAGE,
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

// Cây xanh sân trước Thư viện (2 cây bóng mát đối xứng + 2 hàng cau vua) và cây rìa khuôn viên
export const LIBRARY_TREES: Vec2[] = [
  { x: 30.5, z: 14.5 },
  { x: 45.5, z: 14.5 },
  { x: 26.5, z: 11 },
  { x: 26.5, z: 15 },
  { x: 26.5, z: 19 },
  { x: 49.5, z: 11 },
  { x: 49.5, z: 15 },
  { x: 49.5, z: 19 },
];

export const CAMPUS_SHADE_TREES: Vec2[] = [
  { x: -28, z: -62 },
  { x: -28, z: -48 },
  { x: 4, z: -62 },
  { x: 4, z: -46 },
  { x: 18, z: -60 },
  { x: 18, z: -42 },
  { x: 70, z: -62 },
  { x: 80, z: -62 },
  { x: 88, z: -52 },
  { x: 88, z: -38 },
  { x: 88, z: 14 },
  { x: 88, z: 32 },
  { x: -80, z: 78 },
  { x: -64, z: 78 },
  { x: -32, z: 78 },
  { x: 28, z: 78 },
  { x: 52, z: 78 },
  { x: -92, z: -60 },
  { x: -92, z: -46 },
  { x: -92, z: 62 },
  { x: -92, z: 74 },
  // 4 cây lớn hai bên Cổng Parabol & 2 cây sân sau Thư viện
  { x: -93.5, z: -12 },
  { x: -93.5, z: 0 },
  { x: -82.5, z: -13.5 },
  { x: -82.5, z: 1.5 },
  { x: 30, z: 52 },
  { x: 49, z: 52 },
];

export const BUILDING_COLLIDERS: NamedCollider[] = [
  { name: 'C1', box: { minX: -82, maxX: -34, minZ: -63, maxZ: -49 } },
  { name: 'Tháp hoa gió đầu hồi C1', box: { minX: -34.2, maxX: -32.2, minZ: -58.5, maxZ: -53.5 } },
  { name: 'Bậc tam cấp C1', box: C1.steps },
  { name: 'Bệ chữ I LOVE BK', box: I_LOVE_BK.plinth },
  { name: 'Khối đá trắng', box: WHITE_ROCK.box },
  { name: 'Thư viện Tạ Quang Bửu (tháp)', box: { minX: 25.5, maxX: 50.5, minZ: 29.5, maxZ: 43.5 } },
  { name: 'Thư viện Tạ Quang Bửu (khối đế)', box: { minX: 31.0, maxX: 45.0, minZ: 23.5, maxZ: 30.5 } },
  // Khối đế hai cánh, thành bậc tam cấp và cột sảnh Thư viện — chặn đi xuyên qua hông cầu thang/cột sảnh,
  // chỉ mở lối chính diện x = 31.2..44.8 để bước lên bậc tam cấp (có nâng độ cao Y mượt trên bậc & hiên sảnh).
  { name: 'Cánh tây khối đế Thư viện', box: { minX: 25.4, maxX: 31.0, minZ: 18.8, maxZ: 29.8 } },
  { name: 'Cánh đông khối đế Thư viện', box: { minX: 45.0, maxX: 50.6, minZ: 18.8, maxZ: 29.8 } },
  { name: 'Thành bậc tam cấp Thư viện (tây)', box: { minX: 30.2, maxX: 31.1, minZ: 16.8, maxZ: 19.2 } },
  { name: 'Thành bậc tam cấp Thư viện (đông)', box: { minX: 44.9, maxX: 45.8, minZ: 16.8, maxZ: 19.2 } },
  { name: 'Cột sảnh Thư viện (tây-bắc)', box: { minX: 31.05, maxX: 31.95, minZ: 19.05, maxZ: 19.95 } },
  { name: 'Cột sảnh Thư viện (đông-bắc)', box: { minX: 44.05, maxX: 44.95, minZ: 19.05, maxZ: 19.95 } },
  { name: 'Cột sảnh Thư viện (tây-nam)', box: { minX: 31.05, maxX: 31.95, minZ: 22.35, maxZ: 23.25 } },
  { name: 'Cột sảnh Thư viện (đông-nam)', box: { minX: 44.05, maxX: 44.95, minZ: 22.35, maxZ: 23.25 } },
  { name: 'Bệ chữ HUST', box: HUST_SIGN.plinth },
  { name: 'C9', box: { minX: -85, maxX: -65, minZ: -23, maxZ: -11 } },
  { name: 'Cầu thang C9', box: C9.stairs.box },
  { name: 'Chân cổng Parabol (bắc)', box: PARABOL_GATE.legAabbs[0] },
  { name: 'Chân cổng Parabol (nam)', box: PARABOL_GATE.legAabbs[1] },
  { name: 'Nhà gác cổng Parabol', box: PARABOL_GATE.guardHouse },
  // Cổng Trần Đại Nghĩa, Nhà để xe D3 - D5 (bên trái) và dàn ô tô giảng viên đỗ cạnh tòa C7 (bên phải)
  { name: 'Biển đá Cổng Trần Đại Nghĩa', box: { minX: 91.1, maxX: 93.4, minZ: -8.8, maxZ: -3.2 } },
  { name: 'Nhà bảo vệ Cổng Trần Đại Nghĩa', box: { minX: 89.2, maxX: 93.2, minZ: -17.2, maxZ: -13.6 } },
  { name: 'Nhà để xe D3 - D5', box: D3_D5_PARKING_GARAGE.box },
  ...C7_FACULTY_PARKING.cars.map((car) => ({ name: 'Ô tô giảng viên C7', box: car.box })),
  { name: 'Bờ kè Hồ Tiền (tây)', box: LAKE_BANK[0] },
  { name: 'Bờ kè Hồ Tiền (đông)', box: LAKE_BANK[1] },
  { name: 'Bờ kè Hồ Tiền (bắc)', box: LAKE_BANK[2] },
  { name: 'Bờ kè Hồ Tiền (nam)', box: LAKE_BANK[3] },
  // Ghế (mặt ngồi 1,9 × 0,7 m) — đều đặt ngoài đường đi chính.
  { name: 'Ghế bờ hồ', box: { minX: -27.85, maxX: -27.15, minZ: 33.05, maxZ: 34.95 } },
  { name: 'Ghế bờ hồ', box: { minX: -27.85, maxX: -27.15, minZ: 65.05, maxZ: 66.95 } },
  { name: 'Ghế bờ hồ', box: { minX: 21.95, maxX: 22.65, minZ: 23.05, maxZ: 24.95 } },
  { name: 'Ghế bờ hồ', box: { minX: 21.95, maxX: 22.65, minZ: 71.05, maxZ: 72.95 } },
  { name: 'Ghế quảng trường C1', box: { minX: -72.95, maxX: -71.05, minZ: -30.35, maxZ: -29.65 } },
  { name: 'Ghế quảng trường C1', box: { minX: -44.95, maxX: -43.05, minZ: -44.35, maxZ: -43.65 } },
  { name: 'Bồn cỏ quảng trường C1 (tây)', box: { minX: -80, maxX: -66, minZ: -45.5, maxZ: -42.5 } },
  { name: 'Bồn cỏ quảng trường C1 (đông)', box: { minX: -50, maxX: -36, minZ: -45.5, maxZ: -42.5 } },
  { name: 'Bồn cỏ C1Building (tây)', box: { minX: -75, maxX: -64, minZ: -43.15, maxZ: -30.85 } },
  { name: 'Bồn cỏ C1Building (đông)', box: { minX: -52, maxX: -41, minZ: -43.15, maxZ: -30.85 } },
  { name: 'Ghế đường tình yêu', box: { minX: -38.95, maxX: -37.05, minZ: -10.95, maxZ: -10.25 } },
  { name: 'Ghế đường tình yêu', box: { minX: -22.95, maxX: -21.05, minZ: -10.95, maxZ: -10.25 } },
  { name: 'Ghế đường tình yêu', box: { minX: 15.05, maxX: 16.95, minZ: -10.95, maxZ: -10.25 } },
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
  { name: 'Tường rào Giải Phóng (bắc)', box: { minX: -95.45, maxX: -94.95, minZ: -75.2, maxZ: -17.0 } },
  { name: 'Tường rào Parabol (bắc)', box: { minX: -88.25, maxX: -87.75, minZ: -17.0, maxZ: -12.8 } },
  { name: 'Tường rào Parabol (nam)', box: { minX: -88.25, maxX: -87.75, minZ: 0.8, maxZ: 4.5 } },
  { name: 'Tường rào Giải Phóng (nam)', box: { minX: -95.45, maxX: -94.95, minZ: 11.0, maxZ: 106.5 } },
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

/** Collider sảnh tầng 1 Thư viện Tạ Quang Bửu (Đại sảnh thông tầng Stadium Atrium 39m × 26m + Phòng Mượn Sách). */
export const LIBRARY_LOBBY_COLLIDERS: NamedCollider[] = [
  { name: 'Tường bắc sảnh thư viện', box: { minX: -20.0, maxX: 20.0, minZ: -13.3, maxZ: -12.75 } },
  { name: 'Tường nam sảnh thư viện', box: { minX: -20.0, maxX: 20.0, minZ: 12.75, maxZ: 13.3 } },
  { name: 'Tường tây bắc sảnh thư viện', box: { minX: -19.8, maxX: -19.3, minZ: -13.2, maxZ: -0.9 } },
  { name: 'Tường tây nam sảnh thư viện', box: { minX: -19.8, maxX: -19.3, minZ: 4.5, maxZ: 13.2 } },
  { name: 'Tường tây Phòng mượn sách', box: { minX: -26.2, maxX: -25.75, minZ: -2.4, maxZ: 6.0 } },
  { name: 'Tường bắc Phòng mượn sách', box: { minX: -26.2, maxX: -19.3, minZ: -2.4, maxZ: -2.0 } },
  { name: 'Tường nam Phòng mượn sách', box: { minX: -26.2, maxX: -19.3, minZ: 5.6, maxZ: 6.0 } },
  { name: 'Tường đông sảnh thư viện', box: { minX: 19.3, maxX: 19.8, minZ: -13.2, maxZ: 13.2 } },
  { name: 'Quầy lễ tân cửa nam', box: { minX: -2.6, maxX: 2.6, minZ: 8.6, maxZ: 10.2 } },
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

// Danh sách toàn bộ gốc cây trong khuôn viên (chặn cả người đi bộ lẫn xe máy để không đi xuyên qua thân cây)
export const TREE_TRUNKS: Vec2[] = [
  ...LOVE_ROAD_TREES,
  ...LAKE_WILLOWS,
  ...C1.lipaTrees,
  ...LIBRARY_TREES,
  ...CAMPUS_SHADE_TREES,
];

/** Danh sách NPC đứng/ngồi tĩnh trong sân trường (Minh + các nhóm sinh viên trò chuyện/đọc sách) — không đi xuyên qua người khác. */
export const NPC_CIRCLES: { pos: Vec2; radius: number; name?: string }[] = [
  { pos: { x: -72, z: -8.5 }, radius: 0.5, name: 'Minh (NPC)' },
  // Sinh viên đứng chờ tại Nhà chờ Xe buýt Cổng Parabol
  { pos: { x: -86.8, z: 7.2 }, radius: 0.42, name: 'Sinh viên (NPC)' },
  // Nhóm 1: 2 sinh viên đứng trò chuyện tại sân Quảng trường C1
  { pos: { x: -62.5, z: -34.0 }, radius: 0.42, name: 'Sinh viên (NPC)' },
  { pos: { x: -61.5, z: -34.0 }, radius: 0.42, name: 'Sinh viên (NPC)' },
  // Nhóm 2: 2 sinh viên trao đổi bài trước sảnh Thư viện Tạ Quang Bửu
  { pos: { x: 43.5, z: 14.5 }, radius: 0.42, name: 'Sinh viên (NPC)' },
  { pos: { x: 42.3, z: 14.5 }, radius: 0.42, name: 'Sinh viên (NPC)' },
  // Nhóm 3: 2 sinh viên đứng ngắm cảnh bờ Bắc Hồ Tiền
  { pos: { x: -6.5, z: 2.2 }, radius: 0.42, name: 'Sinh viên (NPC)' },
  { pos: { x: -5.3, z: 2.2 }, radius: 0.42, name: 'Sinh viên (NPC)' },
  // Nhóm 4: 2 sinh viên trước Nhà B1 SoICT
  { pos: { x: 108.0, z: 3.5 }, radius: 0.42, name: 'Sinh viên (NPC)' },
  { pos: { x: 109.2, z: 3.5 }, radius: 0.42, name: 'Sinh viên (NPC)' },
  // Nhóm 5: 3 sinh viên ngồi đọc sách trên ghế đá ven Hồ Tiền
  { pos: { x: -27.38, z: 34.0 }, radius: 0.45, name: 'Sinh viên (NPC)' },
  { pos: { x: 22.18, z: 24.0 }, radius: 0.45, name: 'Sinh viên (NPC)' },
  { pos: { x: -27.38, z: 66.0 }, radius: 0.45, name: 'Sinh viên (NPC)' },
];
