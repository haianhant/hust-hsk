// ---------------------------------------------------------------------------
// features/campus/world-data/colliders.ts — Danh sách hộp va chạm 2D (AABB)
// cho người đi bộ, phòng học, sảnh thư viện và vật cản hình tròn cho xe máy.
// Đối chiếu chuẩn theo Bản đồ Số https://hustmap.com/.
// ---------------------------------------------------------------------------

import type { AABB, Vec2 } from './bounds';
import {
  ALUMNI_HOUSE,
  BIKE_PARKING_SHED,
  BOARD_GAME_CLUB,
  BOARD_GAME_TABLES,
  C1,
  C15_BUILDING,
  C1_FOUNTAIN,
  C2_BUILDING,
  C6_BUILDING,
  C7_BUILDING,
  C7_FACULTY_PARKING,
  C7_UNDERGROUND_RAMPS,
  C9,
  CAMPUS_ANNEX_BLOCKS,
  CAMPUS_PARKING_LOTS,
  C_CONNECTOR_BUILDINGS,
  D3_D5_PARKING_GARAGE,
  D4_BUILDING,
  DORM_COMPLEX,
  EAST_CAMPUS_BLOCKS,
  HUST_DIGITAL_HUB,
  HUST_SIGN,
  I_LOVE_BK,
  LAKE_BANK,
  LAKE_WILLOWS,
  LECTURE_BUILDINGS,
  MONUMENT,
  PARABOL_GATE,
  SCHOOL_OF_MATERIALS,
  SOICT_B1,
  SPORTS_COMPLEX,
  TDN_DIVIDED_MEDIAN,
  TDN_MEDIAN_TREES,
  VDZ_CENTER,
  WHITE_ROCK,
} from './buildings';
import { LOVE_ROAD_TREES } from './roads';

export type NamedCollider = {
  name: string;
  box: AABB;
};

// Cây xanh sân trước Thư viện (2 cây bóng mát đối xứng + 2 hàng cau vua mở rộng tầm nhìn sảnh) và cây rìa khuôn viên
export const LIBRARY_TREES: Vec2[] = [
  { x: 29.5, z: 13.8 },
  { x: 46.8, z: 13.8 },
  { x: 26.2, z: 10.8 },
  { x: 26.2, z: 14.8 },
  { x: 26.2, z: 18.8 },
  { x: 28.0, z: 22.8 },
  { x: 51.4, z: 10.8 },
  { x: 51.4, z: 14.8 },
  { x: 51.4, z: 18.8 },
  { x: 48.2, z: 22.8 },
];

export const CAMPUS_SHADE_TREES: Vec2[] = [
  { x: -31.8, z: -64 },
  { x: -28, z: -48 },
  { x: 4, z: -62 },
  { x: 4, z: -46 },
  { x: 16, z: -60 },
  { x: 16, z: -42 },
  { x: 42, z: -62 },
  { x: 80, z: -69 },
  { x: 89.8, z: -50 },
  { x: 89.8, z: -36 },
  { x: 91.0, z: 14 },
  { x: 91.0, z: 32 },
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
  { x: 27.6, z: 50.8 },
  { x: 50.2, z: 55.2 },
];

export const BUILDING_COLLIDERS: NamedCollider[] = [
  { name: 'C1', box: { minX: -82, maxX: -34, minZ: -63, maxZ: -49 } },
  { name: 'Tháp hoa gió đầu hồi C1', box: { minX: -34.2, maxX: -32.2, minZ: -58.5, maxZ: -53.5 } },
  { name: 'Bậc tam cấp C1', box: C1.steps },
  { name: 'Bệ chữ I LOVE BK', box: I_LOVE_BK.plinth },
  { name: 'Đài phun nước Bách Khoa', box: C1_FOUNTAIN.box },
  { name: 'Khối đá trắng', box: WHITE_ROCK.box },
  { name: 'Thư viện Tạ Quang Bửu (tháp)', box: { minX: 25.6, maxX: 52.0, minZ: 28.8, maxZ: 50.0 } },
  { name: 'Thư viện Tạ Quang Bửu (khối đế)', box: { minX: 29.8, maxX: 46.2, minZ: 23.5, maxZ: 30.5 } },
  { name: 'Thành bậc tam cấp Thư viện (tây)', box: { minX: 28.9, maxX: 29.8, minZ: 16.8, maxZ: 19.4 } },
  { name: 'Thành bậc tam cấp Thư viện (đông)', box: { minX: 46.2, maxX: 47.1, minZ: 16.8, maxZ: 19.4 } },
  { name: 'Bó vỉa đá granite Tây Thư viện', box: { minX: 29.58, maxX: 29.88, minZ: 19.45, maxZ: 27.0 } },
  { name: 'Bậc gạch phụ Tây Thư viện', box: { minX: 28.8, maxX: 29.3, minZ: 26.55, maxZ: 28.15 } },
  { name: 'Ghế đá Thư viện (Đông Bắc)', box: { minX: 50.32, maxX: 50.88, minZ: 12.5, maxZ: 14.3 } },
  { name: 'Ghế đá Thư viện (Đông Nam)', box: { minX: 50.32, maxX: 50.88, minZ: 15.7, maxZ: 17.5 } },
  { name: 'Ghế đá Thư viện (Tây)', box: { minX: 24.72, maxX: 25.28, minZ: 13.1, maxZ: 14.9 } },
  { name: 'Bệ chữ HUST', box: HUST_SIGN.plinth },
  { name: 'C9', box: { minX: -85, maxX: -65, minZ: -23, maxZ: -11 } },
  { name: 'Cầu thang C9', box: C9.stairs.box },
  { name: 'Chân cổng Parabol (bắc)', box: PARABOL_GATE.legAabbs[0] },
  { name: 'Chân cổng Parabol (nam)', box: PARABOL_GATE.legAabbs[1] },
  { name: 'Nhà gác cổng Parabol', box: PARABOL_GATE.guardHouse },
  // Cổng Trần Đại Nghĩa, dải phân cách đôi, Nhà để xe D3 - D5 (bên trái) và dàn ô tô giảng viên đỗ cạnh tòa C7
  { name: 'Biển đá Cổng Trần Đại Nghĩa', box: { minX: 91.1, maxX: 93.4, minZ: -8.8, maxZ: -3.2 } },
  { name: 'Dải phân cách Cổng Trần Đại Nghĩa', box: TDN_DIVIDED_MEDIAN.box },
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
  { name: 'Ghế quảng trường C1', box: { minX: -74.15, maxX: -72.25, minZ: -30.15, maxZ: -29.45 } },
  { name: 'Ghế quảng trường C1', box: { minX: -43.75, maxX: -41.85, minZ: -44.55, maxZ: -43.85 } },
  { name: 'Bồn cỏ quảng trường C1 (tây)', box: { minX: -80.5, maxX: -68.4, minZ: -47.4, maxZ: -44.6 } },
  { name: 'Bồn cỏ quảng trường C1 (đông)', box: { minX: -47.6, maxX: -35.5, minZ: -47.4, maxZ: -44.6 } },
  { name: 'Bồn cỏ C1Building (tây)', box: { minX: -78.0, maxX: -68.4, minZ: -43.15, maxZ: -30.85 } },
  { name: 'Bồn cỏ C1Building (đông)', box: { minX: -47.6, maxX: -38.0, minZ: -43.15, maxZ: -30.85 } },
  { name: 'Ghế đường tình yêu', box: { minX: -38.95, maxX: -37.05, minZ: -11.25, maxZ: -10.55 } },
  { name: 'Ghế đường tình yêu', box: { minX: -22.95, maxX: -21.05, minZ: -11.25, maxZ: -10.55 } },
  { name: 'Ghế đường tình yêu', box: { minX: 15.05, maxX: 16.95, minZ: -11.25, maxZ: -10.55 } },
  // Các công trình toàn khuôn viên theo chuẩn https://hustmap.com/
  { name: 'Bia kỷ niệm Trần Đại Nghĩa', box: MONUMENT.box },
  { name: 'Biển giới thiệu Quảng trường Trần Đại Nghĩa', box: MONUMENT.sign.box },
  { name: 'Nhà C2', box: C2_BUILDING.box },
  { name: 'Tòa nhà C6', box: C6_BUILDING.box },
  { name: 'Tòa nhà C15', box: C15_BUILDING.box },
  { name: 'Tòa nhà C7', box: C7_BUILDING.box },
  { name: 'Trường Vật liệu (SMSE)', box: SCHOOL_OF_MATERIALS.box },
  { name: C7_UNDERGROUND_RAMPS.exitRamp.label, box: C7_UNDERGROUND_RAMPS.exitRamp.box },
  { name: C7_UNDERGROUND_RAMPS.entryRamp.label, box: C7_UNDERGROUND_RAMPS.entryRamp.box },
  { name: 'Nhà D4 (Trường Ngoại ngữ)', box: D4_BUILDING.box },
  ...LECTURE_BUILDINGS.map((b) => ({ name: `Nhà ${b.code}`, box: b.box })),
  ...C_CONNECTOR_BUILDINGS.map((c) => ({ name: c.subtitle, box: c.box })),
  ...CAMPUS_ANNEX_BLOCKS.map((a) => ({ name: a.label, box: a.box })),
  { name: 'Bãi xe C2', box: CAMPUS_PARKING_LOTS.c2Carport.box },
  { name: 'Nhà xe C5 (Bắc)', box: CAMPUS_PARKING_LOTS.c5NorthShed.box },
  { name: 'Nhà xe C5 (Nam)', box: CAMPUS_PARKING_LOTS.c5SouthShed.box },
  { name: 'Điểm trông giữ xe D4-6-8', box: BIKE_PARKING_SHED.box },
  { name: 'Trung tâm Việt – Đức', box: VDZ_CENTER.box },
  { name: 'HUST Digital Hub', box: HUST_DIGITAL_HUB.box },
  { name: 'Nhà Cựu sinh viên Bách Khoa', box: ALUMNI_HOUSE.box },
  { name: 'Nhà B1 (SoICT)', box: SOICT_B1.box },
  { name: 'Nhà ăn A1-5', box: EAST_CAMPUS_BLOCKS.a15.box },
  { name: 'Nhà A17', box: EAST_CAMPUS_BLOCKS.a17.box },
  { name: 'Nhà E', box: EAST_CAMPUS_BLOCKS.nhaE.box },
  { name: 'Nhà T', box: EAST_CAMPUS_BLOCKS.nhaT.box },
  { name: 'Bể bơi Bách Khoa', box: SPORTS_COMPLEX.poolBox },
  { name: 'Nhà thi đấu Bách Khoa', box: SPORTS_COMPLEX.stadiumBox },
  { name: 'Nhà TC', box: SPORTS_COMPLEX.nhaTcBox },
  { name: 'KTX A3', box: SPORTS_COMPLEX.ktxA3Box },
  { name: 'KTX A2', box: SPORTS_COMPLEX.ktxA2Box },
  { name: 'KTX B6', box: DORM_COMPLEX.b6Box },
  { name: 'KTX B7', box: DORM_COMPLEX.b7Box },
  { name: 'KTX B7bis', box: DORM_COMPLEX.b7bisBox },
  { name: 'KTX B8 (VP Hội Sinh viên)', box: DORM_COMPLEX.b8Box },
  { name: 'CLB Board Game KTX', box: BOARD_GAME_CLUB.box },
  { name: 'KTX B5', box: DORM_COMPLEX.b5Box },
  { name: 'Căng tin B5-9', box: DORM_COMPLEX.b59CanteenBox },
  { name: 'KTX B9', box: DORM_COMPLEX.b9Box },
  { name: 'TT Phục vụ Tổng hợp Bách Khoa', box: DORM_COMPLEX.serviceBox },
  { name: 'KTX B13', box: DORM_COMPLEX.b13Box },
  { name: 'Trung tâm ĐTTH & Trạm Y tế', box: DORM_COMPLEX.canteenBox },
  { name: 'KTX B3', box: DORM_COMPLEX.b3Box },
  { name: 'KTX B10', box: DORM_COMPLEX.b10Box },
  { name: 'KTX B4', box: DORM_COMPLEX.b4Box },
  // Tường rào bao quanh khuôn viên & dọc đường Trần Đại Nghĩa (chừa thông thoáng các cổng)
  { name: 'Tường rào Trần Đại Nghĩa (bắc 1)', box: { minX: 91.85, maxX: 92.35, minZ: -75.2, maxZ: -31.5 } },
  { name: 'Tường rào Trần Đại Nghĩa (bắc 2)', box: { minX: 91.85, maxX: 92.35, minZ: -25.0, maxZ: -17.2 } },
  { name: 'Tường rào Trần Đại Nghĩa (nam 1)', box: { minX: 91.85, maxX: 92.35, minZ: 0.5, maxZ: 4.5 } },
  { name: 'Tường rào Trần Đại Nghĩa (nam 2)', box: { minX: 91.85, maxX: 92.35, minZ: 13.5, maxZ: 42.0 } },
  { name: 'Tường rào Đại Cồ Việt (tây)', box: { minX: -95.2, maxX: -70.5, minZ: -75.45, maxZ: -74.95 } },
  { name: 'Tường rào Đại Cồ Việt (giữa)', box: { minX: -45.5, maxX: 92.1, minZ: -75.45, maxZ: -74.95 } },
  { name: 'Tường rào Đại Cồ Việt (đông 1)', box: { minX: 98.0, maxX: 120.2, minZ: -75.45, maxZ: -74.95 } },
  { name: 'Tường rào Đại Cồ Việt (đông 2)', box: { minX: 131.8, maxX: 166.0, minZ: -75.45, maxZ: -74.95 } },
  { name: 'Tường rào Giải Phóng (bắc)', box: { minX: -95.45, maxX: -94.95, minZ: -75.2, maxZ: -17.0 } },
  { name: 'Tường rào Parabol (bắc)', box: { minX: -88.25, maxX: -87.75, minZ: -17.0, maxZ: -12.8 } },
  { name: 'Tường rào Parabol (nam)', box: { minX: -88.25, maxX: -87.75, minZ: 0.8, maxZ: 4.8 } },
  { name: 'Tường rào cánh Bắc Cổng Parabol', box: { minX: -95.2, maxX: -88.0, minZ: -17.25, maxZ: -16.75 } },
  { name: 'Tường rào cánh Nam Cổng Parabol', box: { minX: -95.2, maxX: -88.0, minZ: 10.75, maxZ: 11.25 } },
  { name: 'Tường rào Giải Phóng (nam)', box: { minX: -95.45, maxX: -94.95, minZ: 11.0, maxZ: 106.5 } },
  { name: 'Tường rào Lê Thanh Nghị (nam)', box: { minX: -95.2, maxX: 166.0, minZ: 106.25, maxZ: 106.75 } },
  { name: 'Tường rào biên Đông', box: { minX: 165.75, maxX: 166.25, minZ: -75.2, maxZ: 106.5 } },

  // Trụ cổng trường (ĐCV, TQB, Hội Sinh viên)
  { name: 'Trụ Cổng Đại Cồ Việt (Tây)', box: { minX: -63.98, maxX: -62.42, minZ: -74.28, maxZ: -72.72 } },
  { name: 'Trụ Cổng Đại Cồ Việt (Đông)', box: { minX: -53.58, maxX: -52.02, minZ: -74.28, maxZ: -72.72 } },
  { name: 'Trụ Cổng Tạ Quang Bửu (Tây)', box: { minX: 120.95, maxX: 122.05, minZ: -68.55, maxZ: -67.45 } },
  { name: 'Trụ Cổng Tạ Quang Bửu (Đông)', box: { minX: 129.95, maxX: 131.05, minZ: -68.55, maxZ: -67.45 } },
  { name: 'Trụ Cổng Hội Sinh viên (Bắc)', box: { minX: 95.42, maxX: 96.18, minZ: -31.18, maxZ: -30.42 } },
  { name: 'Trụ Cổng Hội Sinh viên (Nam)', box: { minX: 95.42, maxX: 96.18, minZ: -26.58, maxZ: -25.82 } },

  // Cột ngoài cầu nối D7-D9
  { name: 'Cột cầu nối D7-D9 (Tây)', box: { minX: 51.94, maxX: 52.36, minZ: 60.1, maxZ: 62.3 } },
  { name: 'Cột cầu nối D7-D9 (Đông)', box: { minX: 59.64, maxX: 60.06, minZ: 60.1, maxZ: 62.3 } },

  // Sân trước Nhà B1 (SoICT): Thảm cỏ bán nguyệt, Nhà xe B1, Ô tô giảng viên & Ghế đá
  { name: 'Thảm cỏ bán nguyệt sân B1', box: { minX: 111.3, maxX: 119.7, minZ: 4.0, maxZ: 7.6 } },
  { name: 'Nhà xe Nhà B1 (SoICT)', box: { minX: 100.4, maxX: 105.8, minZ: 1.8, maxZ: 9.2 } },
  { name: 'Ô tô giảng viên sân B1 (Bắc)', box: { minX: 126.0, maxX: 130.4, minZ: 2.68, maxZ: 4.52 } },
  { name: 'Ô tô giảng viên sân B1 (Nam)', box: { minX: 126.0, maxX: 130.4, minZ: 6.28, maxZ: 8.12 } },
  { name: 'Ghế đá sân trước Nhà B1 (Tây)', box: { minX: 106.9, maxX: 108.7, minZ: 10.3, maxZ: 10.9 } },
  { name: 'Ghế đá sân trước Nhà B1 (Đông)', box: { minX: 122.3, maxX: 124.1, minZ: 10.3, maxZ: 10.9 } },

  // Xe cộ đỗ trong bãi gửi xe C1, C9, D7-D9, D3-D5 & Trạm giao thông công cộng
  { name: 'Ô tô Bãi xe C1 Tây (1)', box: { minX: -76.42, maxX: -74.58, minZ: -69.4, maxZ: -65.0 } },
  { name: 'Ô tô Bãi xe C1 Tây (2)', box: { minX: -70.42, maxX: -68.58, minZ: -69.4, maxZ: -65.0 } },
  { name: 'Ô tô Bãi xe C1 Đông (1)', box: { minX: -47.42, maxX: -45.58, minZ: -69.4, maxZ: -65.0 } },
  { name: 'Ô tô Bãi xe C1 Đông (2)', box: { minX: -41.42, maxX: -39.58, minZ: -69.4, maxZ: -65.0 } },
  { name: 'Ô tô Bãi xe C9 (Bắc)', box: { minX: -50.0, maxX: -45.6, minZ: -20.12, maxZ: -18.28 } },
  { name: 'Ô tô Bãi xe C9 (Nam)', box: { minX: -50.0, maxX: -45.6, minZ: -16.62, maxZ: -14.78 } },
  { name: 'Chốt bảo vệ giữ xe D7-D9', box: { minX: 32.5, maxX: 33.9, minZ: 53.9, maxZ: 55.3 } },
  { name: 'Dãy xe máy giữ xe D7-D9 (Bắc)', box: { minX: 34.9, maxX: 45.3, minZ: 52.8, maxZ: 53.78 } },
  { name: 'Dãy xe máy giữ xe D7-D9 (Nam)', box: { minX: 34.9, maxX: 45.3, minZ: 55.42, maxZ: 56.4 } },
  { name: 'Giá xe đạp sân D3-D5', box: { minX: 63.9, maxX: 69.1, minZ: 13.6, maxZ: 16.8 } },
  { name: 'Trạm bảo vệ Nhà xe D3-D5 (Tây)', box: { minX: 80.5, maxX: 81.5, minZ: 2.3, maxZ: 4.5 } },
  { name: 'Trạm bảo vệ Nhà xe D3-D5 (Đông)', box: { minX: 85.3, maxX: 86.3, minZ: 2.3, maxZ: 4.5 } },
  { name: 'Trạm xe đạp công cộng TNGo Trần Đại Nghĩa', box: { minX: 93.1, maxX: 94.5, minZ: -23.5, maxZ: -19.2 } },
  { name: 'Nhà chờ Xe buýt Cổng Parabol', box: { minX: -88.85, maxX: -88.25, minZ: 4.3, maxZ: 9.7 } },
  { name: 'Nhà chờ Xe buýt Trần Đại Nghĩa', box: { minX: 93.1, maxX: 93.75, minZ: -63.2, maxZ: -59.8 } },

  // Quầy nước, Bảng lưu bút, Ghế đá ngắm sen & Backdrop 70 năm
  { name: 'Quầy Trà đá & Trà chanh Bách Khoa', box: { minX: -75.05, maxX: -72.95, minZ: 1.65, maxZ: 2.75 } },
  { name: 'Xe Cà phê Hồ Tiền Bách Khoa', box: { minX: 27.65, maxX: 28.75, minZ: 57.45, maxZ: 59.55 } },
  { name: 'Bảng Lưu bút Quảng trường C1', box: { minX: -65.98, maxX: -63.62, minZ: -41.68, maxZ: -41.32 } },
  { name: 'Bảng Lưu bút Bờ Hồ Tiền', box: { minX: 21.62, maxX: 21.98, minZ: 62.82, maxZ: 65.18 } },
  { name: 'Bảng Lưu bút Thư viện Tạ Quang Bửu', box: { minX: 31.02, maxX: 33.38, minZ: 11.22, maxZ: 11.58 } },
  { name: 'Ghế đá Ngắm Sen Hồ Tiền', box: { minX: 21.95, maxX: 22.65, minZ: 57.55, maxZ: 59.45 } },
  { name: 'Backdrop 70 năm Nhà Cựu sinh viên', box: { minX: 6.68, maxX: 9.82, minZ: -0.02, maxZ: 0.92 } },

  // Khán đài & khung thành mở miệng SVĐ Bách Khoa
  { name: 'Khán đài B SVĐ Bách Khoa (Tây)', box: { minX: 118.1, maxX: 127.5, minZ: 65.8, maxZ: 68.43 } },
  { name: 'Khán đài B SVĐ Bách Khoa (Đông)', box: { minX: 140.4, maxX: 146.4, minZ: 66.47, maxZ: 68.43 } },
  { name: 'Khung thành Tây SVĐ (lưới sau)', box: { minX: 116.15, maxX: 116.55, minZ: 77.35, maxZ: 82.65 } },
  { name: 'Khung thành Tây SVĐ (cạnh Bắc)', box: { minX: 116.15, maxX: 117.65, minZ: 77.35, maxZ: 77.65 } },
  { name: 'Khung thành Tây SVĐ (cạnh Nam)', box: { minX: 116.15, maxX: 117.65, minZ: 82.35, maxZ: 82.65 } },
  { name: 'Khung thành Đông SVĐ (lưới sau)', box: { minX: 147.45, maxX: 147.85, minZ: 77.35, maxZ: 82.65 } },
  { name: 'Khung thành Đông SVĐ (cạnh Bắc)', box: { minX: 146.35, maxX: 147.85, minZ: 77.35, maxZ: 77.65 } },
  { name: 'Khung thành Đông SVĐ (cạnh Nam)', box: { minX: 146.35, maxX: 147.85, minZ: 82.35, maxZ: 82.65 } },
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
  { name: 'Tủ sách lớp học', box: { minX: -4.55, maxX: -4.12, minZ: -0.1, maxZ: 1.7 } },
  { name: 'Giảng viên (NPC)', box: { minX: 1.85, maxX: 2.55, minZ: -2.35, maxZ: -1.65 } },
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
/** Cây bóng mát sân trước Nhà B1 (render trực tiếp trong SoictB1Forecourt — chỉ dùng để tính va chạm thân cây). */
export const B1_FORECOURT_TREES: Vec2[] = [
  { x: 101.2, z: -0.8 },
  { x: 129.8, z: -0.8 },
];

export type CircleCollider = {
  x: number;
  z: number;
  radius: number;
  name: string;
};

/** Hệ thống cột trụ tròn & khối sảnh cong (trượt tiếp tuyến mượt thay vì vuông góc AABB). */
export const CAMPUS_PILLAR_CIRCLES: CircleCollider[] = [
  // 6 cột sảnh chính (portico) Thư viện Tạ Quang Bửu
  { x: 30.6, z: 19.65, radius: 0.34, name: 'Cột sảnh Thư viện' },
  { x: 34.8, z: 19.65, radius: 0.34, name: 'Cột sảnh Thư viện' },
  { x: 41.2, z: 19.65, radius: 0.34, name: 'Cột sảnh Thư viện' },
  { x: 45.4, z: 19.65, radius: 0.34, name: 'Cột sảnh Thư viện' },
  { x: 30.6, z: 22.8, radius: 0.34, name: 'Cột sảnh Thư viện' },
  { x: 45.4, z: 22.8, radius: 0.34, name: 'Cột sảnh Thư viện' },
  // 8 cột hành lang tầng 1 cánh Tây & Đông Thư viện
  { x: 25.85, z: 29.2, radius: 0.26, name: 'Cột hành lang Thư viện' },
  { x: 25.85, z: 35.8, radius: 0.26, name: 'Cột hành lang Thư viện' },
  { x: 25.85, z: 42.4, radius: 0.26, name: 'Cột hành lang Thư viện' },
  { x: 25.85, z: 49.0, radius: 0.26, name: 'Cột hành lang Thư viện' },
  { x: 51.75, z: 29.2, radius: 0.26, name: 'Cột hành lang Thư viện' },
  { x: 51.75, z: 35.8, radius: 0.26, name: 'Cột hành lang Thư viện' },
  { x: 51.75, z: 42.4, radius: 0.26, name: 'Cột hành lang Thư viện' },
  { x: 51.75, z: 49.0, radius: 0.26, name: 'Cột hành lang Thư viện' },
  // 2 cột sảnh Tây Tòa nhà C7
  { x: 57.9, z: -35.0, radius: 0.24, name: 'Cột sảnh Tây C7' },
  { x: 57.9, z: -30.6, radius: 0.24, name: 'Cột sảnh Tây C7' },
  // Khối sảnh tròn (Rotunda) phía Bắc Nhà B1 SoICT
  { x: 115.5, z: 17.5, radius: 5.2, name: 'Sảnh tròn Nhà B1 (Rotunda)' },
];

export const TREE_TRUNKS: Vec2[] = [
  ...LOVE_ROAD_TREES,
  ...TDN_MEDIAN_TREES,
  ...LAKE_WILLOWS,
  ...C1.lipaTrees,
  ...LIBRARY_TREES,
  ...CAMPUS_SHADE_TREES,
  ...B1_FORECOURT_TREES,
];

/** Danh sách NPC đứng/ngồi tĩnh trong sân trường (Minh + các nhóm sinh viên trò chuyện/đọc sách) — không đi xuyên qua người khác. */
export const NPC_CIRCLES: { pos: Vec2; radius: number; name?: string }[] = [
  { pos: { x: -72, z: -8.5 }, radius: 0.5, name: 'Minh (NPC)' },
  // Sinh viên đứng chờ tại Nhà chờ Xe buýt Cổng Parabol
  { pos: { x: -86.8, z: 7.2 }, radius: 0.42, name: 'Sinh viên (NPC)' },
  // Nhóm 1: 2 sinh viên đứng trò chuyện tại sân Quảng trường C1 (bên cạnh Đài phun nước lớn)
  { pos: { x: -65.2, z: -34.8 }, radius: 0.42, name: 'Sinh viên (NPC)' },
  { pos: { x: -64.1, z: -34.8 }, radius: 0.42, name: 'Sinh viên (NPC)' },
  // Nhóm 2: 2 sinh viên trao đổi bài trước sảnh Thư viện Tạ Quang Bửu
  { pos: { x: 43.5, z: 14.5 }, radius: 0.42, name: 'Sinh viên (NPC)' },
  { pos: { x: 42.3, z: 14.5 }, radius: 0.42, name: 'Sinh viên (NPC)' },
  // Nhóm 3: 2 sinh viên đứng ngắm cảnh bờ Bắc Hồ Tiền
  { pos: { x: -6.5, z: 2.2 }, radius: 0.42, name: 'Sinh viên (NPC)' },
  { pos: { x: -5.3, z: 2.2 }, radius: 0.42, name: 'Sinh viên (NPC)' },
  // Nhóm 4: 2 sinh viên trước Nhà B1 SoICT
  { pos: { x: 110.0, z: 9.2 }, radius: 0.35, name: 'Sinh viên (NPC)' },
  { pos: { x: 121.0, z: 9.2 }, radius: 0.35, name: 'Sinh viên (NPC)' },
  // Nhóm 5: 3 sinh viên ngồi đọc sách trên ghế đá ven Hồ Tiền
  { pos: { x: -27.38, z: 34.0 }, radius: 0.45, name: 'Sinh viên (NPC)' },
  { pos: { x: 22.18, z: 24.0 }, radius: 0.45, name: 'Sinh viên (NPC)' },
  { pos: { x: -27.38, z: 66.0 }, radius: 0.45, name: 'Sinh viên (NPC)' },
  // Bác bảo vệ Bách Khoa đứng trực gác cạnh phòng bảo vệ Cổng Trần Đại Nghĩa
  { pos: { x: 91.65, z: -12.25 }, radius: 0.45, name: 'Bác bảo vệ Bách Khoa' },
];

/** Collider nội thất Phòng Sinh Hoạt Chung CLB Board Game KTX. */
export const BOARD_GAME_LOUNGE_COLLIDERS: NamedCollider[] = [
  { name: 'Tường bắc CLB Board Game', box: { minX: -7.5, maxX: 7.5, minZ: -5.65, maxZ: -5.2 } },
  { name: 'Tường nam CLB Board Game', box: { minX: -7.5, maxX: 7.5, minZ: 5.2, maxZ: 5.65 } },
  { name: 'Tường tây CLB Board Game', box: { minX: -7.5, maxX: -7.0, minZ: -5.5, maxZ: 5.5 } },
  { name: 'Tường đông CLB Board Game', box: { minX: 7.0, maxX: 7.5, minZ: -5.5, maxZ: 5.5 } },
  { name: 'Bàn Board Game 1 (Tây)', box: BOARD_GAME_TABLES[0].box },
  { name: 'Bàn Board Game 2 (Đông)', box: BOARD_GAME_TABLES[1].box },
  { name: 'Tủ trò chơi CLB', box: { minX: -6.7, maxX: -4.45, minZ: -5.2, maxZ: -4.25 } },
  { name: 'Bảng thông tin trận CLB', box: { minX: -1.45, maxX: 1.45, minZ: -5.25, maxZ: -4.7 } },
  { name: 'Quầy nước CLB', box: { minX: 4.15, maxX: 6.65, minZ: -5.2, maxZ: -3.95 } },
  { name: 'Ghế băng góc đứng xem CLB', box: { minX: 4.35, maxX: 6.25, minZ: 3.15, maxZ: 4.05 } },
];
