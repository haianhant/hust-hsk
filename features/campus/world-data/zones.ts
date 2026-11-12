// ---------------------------------------------------------------------------
// features/campus/world-data/zones.ts — Các phân khu nhận diện trên HUD,
// danh sách tòa nhà hiển thị trên Bản đồ (Phím M) và hàm nearestZone.
// Đối chiếu chuẩn theo Bản đồ Số https://hustmap.com/.
// ---------------------------------------------------------------------------

import type { AABB, Vec2 } from './bounds';
import {
  ALUMNI_HOUSE,
  BIKE_PARKING_SHED,
  C1,
  C15_BUILDING,
  C2_BUILDING,
  C6_BUILDING,
  C7_BUILDING,
  C7_UNDERGROUND_RAMPS,
  CAMPUS_ANNEX_BLOCKS,
  CAMPUS_PARKING_LOTS,
  C_CONNECTOR_BUILDINGS,
  D3_D5_PARKING_GARAGE,
  D4_BUILDING,
  DAI_CO_VIET_GATE,
  DORM_COMPLEX,
  EAST_CAMPUS_BLOCKS,
  HUST_DIGITAL_HUB,
  LAKE,
  LIBRARY,
  NGA_5_PLAZA,
  SCHOOL_OF_MATERIALS,
  SOICT_B1,
  SPORTS_COMPLEX,
  TDN_SQUARE,
  VDZ_CENTER,
} from './buildings';

export type ZoneSpec = {
  name: string;
  center: Vec2;
  radius: number;
};

export const ZONES: ZoneSpec[] = [
  { name: 'Cổng Parabol', center: { x: -88, z: -6 }, radius: 13 },
  { name: 'Nhà C9', center: { x: -75, z: -17 }, radius: 17 },
  { name: 'Quảng trường Trần Đại Nghĩa', center: { x: -92.0, z: -34.5 }, radius: 6.5 },
  { name: 'Nhà C2 (VP Đoàn - Đảng ủy)', center: { x: -83.6, z: -34.5 }, radius: 9.5 },
  { name: 'Bãi xe C1 – C2', center: { x: -86.2, z: -69.5 }, radius: 7.5 },
  { name: 'Bãi xe C9', center: { x: -47.8, z: -17.5 }, radius: 5.5 },
  { name: 'Quảng trường C1', center: { x: -58, z: -38 }, radius: 19 },
  { name: 'Quảng trường ngã 5', center: { x: -38, z: -16 }, radius: 10 },
  { name: 'Cụm Giảng đường C3 – C4 – C5 – C10', center: { x: -12, z: -50 }, radius: 22 },
  { name: 'Tổ hợp Tòa C7 & Cụm C6 – C15', center: { x: 73, z: -34 }, radius: 24 },
  { name: 'Trường Vật liệu (SMSE)', center: { x: 45.4, z: -22.0 }, radius: 10.5 },
  { name: 'Thư viện Tạ Quang Bửu', center: { x: 38, z: 32 }, radius: 20 },
  { name: 'Điểm trông giữ xe D7 - D9', center: { x: 39.5, z: 54.6 }, radius: 6.0 },
  { name: 'Hồ Tiền', center: { x: -2, z: 48 }, radius: 34 }, // bán kính chỉ để tham khảo — nearestZone kiểm tra theo hình chữ nhật
  { name: 'Cụm Nhà D2A – D2B', center: { x: -55, z: 20 }, radius: 16 },
  { name: 'Điểm trông giữ xe D4-6-8', center: { x: -55.0, z: 29.2 }, radius: 7.2 },
  { name: 'Nhà D4 (Trường Ngoại ngữ)', center: { x: -78, z: 44 }, radius: 15 },
  { name: 'Cụm Giảng đường D6 – D8 (11 tầng)', center: { x: -46, z: 46 }, radius: 16 },
  { name: 'Cụm Giảng đường D3 – D5 – D7 – D9', center: { x: 65, z: 32 }, radius: 22 },
  { name: 'Nhà để xe D3 - D5', center: { x: 83, z: 17 }, radius: 15 },
  { name: 'Cổng Trần Đại Nghĩa (Cổng B8)', center: { x: 92, z: -6 }, radius: 14 },
  { name: 'Đường tình yêu', center: { x: 0, z: -6 }, radius: 11 },
  { name: 'Nhà B1 (Trường CNTT&TT - SoICT)', center: { x: 112, z: 14 }, radius: 16 },
  { name: 'Cụm Nhà A1-5 · A17 · Nhà E · Nhà T', center: { x: 146, z: 20 }, radius: 18 },
  { name: 'Khu Ký túc xá Bách Khoa (B3 – B13)', center: { x: 122, z: -40 }, radius: 28 },
  { name: 'Bể bơi, Nhà thi đấu & Nhà TC Bách Khoa', center: { x: 110, z: 54 }, radius: 20 },
  { name: 'Sân vận động Bách Khoa', center: { x: 132, z: 80 }, radius: 24 },
  { name: 'Cổng Đại Cồ Việt', center: { x: -58, z: -72 }, radius: 9 },
];

export type CampusMapPlazaSpec = {
  id: string;
  label: string;
  box: AABB;
  tone: 'stone' | 'terracotta' | 'memorial';
};

/** Danh sách các Quảng trường lớn vẽ trên Bản đồ Toàn cảnh (Phím M) — chuẩn https://hustmap.com/. */
export const CAMPUS_MAP_PLAZAS: CampusMapPlazaSpec[] = [
  { id: 'c1-square', label: 'Quảng trường C1 & Đài phun nước', box: C1.plaza, tone: 'stone' },
  { id: 'nga5-plaza', label: 'Quảng trường ngã 5', box: NGA_5_PLAZA.rect, tone: 'stone' },
  { id: 'tdn-square', label: 'Quảng trường Trần Đại Nghĩa', box: TDN_SQUARE, tone: 'memorial' },
  { id: 'lib-plaza', label: 'Sân Thư viện Tạ Quang Bửu', box: LIBRARY.plaza, tone: 'terracotta' },
];

export type CampusMapBuildingKind = 'main' | 'lecture' | 'sport' | 'dorm' | 'gate' | 'parking';

export type CampusMapBuildingSpec = {
  code: string;
  label: string;
  box: AABB;
  kind: CampusMapBuildingKind;
};

/** Danh sách công trình, cổng trường & bãi gửi xe/hầm xe vẽ trên Bản đồ (Phím M) — khớp chuẩn https://hustmap.com/. */
export const CAMPUS_MAP_BUILDINGS: CampusMapBuildingSpec[] = [
  // Khu C (Bắc trục đường chính Parabol – Trần Đại Nghĩa)
  { code: 'C1', label: 'Nhà C1 (Hành chính)', box: { minX: -82, maxX: -34, minZ: -63, maxZ: -49 }, kind: 'main' },
  { code: 'C1B', label: 'Nhà C1B', box: { minX: -30.75, maxX: -24.25, minZ: -59.25, maxZ: -52.75 }, kind: 'lecture' },
  { code: 'C2', label: 'Nhà C2 (VP Đoàn - Đảng ủy)', box: C2_BUILDING.box, kind: 'main' },
  { code: 'C9', label: 'Nhà C9 (Cầu thang đỏ)', box: { minX: -85, maxX: -65, minZ: -23, maxZ: -11 }, kind: 'main' },
  { code: 'C3', label: 'Nhà C3', box: { minX: -23, maxX: -1, minZ: -71.25, maxZ: -64.75 }, kind: 'lecture' },
  { code: 'C3-4', label: 'Nhà nối C3-4', box: C_CONNECTOR_BUILDINGS[0].box, kind: 'lecture' },
  { code: 'C3B', label: 'Nhà C3B', box: { minX: 20.25, maxX: 27.75, minZ: -70.0, maxZ: -63.0 }, kind: 'lecture' },
  { code: 'C4B', label: 'Nhà C4B', box: { minX: -13, maxX: -2, minZ: -64.2, maxZ: -60.8 }, kind: 'lecture' },
  { code: 'C4', label: 'Nhà C4 (Hóa & KH Sự sống)', box: { minX: -23, maxX: -1, minZ: -60.25, maxZ: -53.75 }, kind: 'lecture' },
  { code: 'C4-5', label: 'Nhà nối C4-5', box: C_CONNECTOR_BUILDINGS[1].box, kind: 'lecture' },
  { code: 'C5', label: 'Nhà C5 (Vật liệu - Cơ khí)', box: { minX: -23, maxX: -1, minZ: -49.25, maxZ: -42.75 }, kind: 'lecture' },
  { code: 'C5-10', label: 'Nhà nối C5-10', box: C_CONNECTOR_BUILDINGS[2].box, kind: 'lecture' },
  { code: 'C10', label: 'Nhà C10', box: { minX: -23, maxX: -1, minZ: -38.25, maxZ: -31.75 }, kind: 'lecture' },
  { code: 'C10b', label: 'Nhà C10b', box: { minX: 3.0, maxX: 14.0, minZ: -38.1, maxZ: -31.9 }, kind: 'lecture' },
  { code: 'ITIMS', label: 'Viện ITIMS', box: { minX: -31.25, maxX: -23.75, minZ: -38.75, maxZ: -31.25 }, kind: 'lecture' },
  { code: 'C6', label: 'Nhà C6', box: C6_BUILDING.box, kind: 'main' },
  { code: 'C15', label: 'Nhà C15', box: C15_BUILDING.box, kind: 'lecture' },
  { code: 'C7', label: 'Tòa C7 (Chữ E · Học HSK)', box: C7_BUILDING.box, kind: 'main' },
  { code: 'SMSE', label: 'Trường Vật liệu (SMSE)', box: SCHOOL_OF_MATERIALS.box, kind: 'main' },
  // Khu D & Thư viện - Hồ Tiền (Nam trục đường chính)
  { code: 'D2A', label: 'Nhà D2A', box: { minX: -71.5, maxX: -56.5, minZ: 16.5, maxZ: 23.5 }, kind: 'lecture' },
  { code: 'D2B', label: 'Nhà D2B', box: { minX: -49.25, maxX: -38.75, minZ: 15.5, maxZ: 24.5 }, kind: 'lecture' },
  { code: 'D4', label: 'Nhà D4 (Trường Ngoại ngữ)', box: D4_BUILDING.box, kind: 'lecture' },
  { code: 'D6', label: 'Nhà D6', box: { minX: -55, maxX: -37, minZ: 34.25, maxZ: 41.75 }, kind: 'lecture' },
  { code: 'D8', label: 'Nhà D8 (11 tầng)', box: { minX: -55, maxX: -37, minZ: 49.9, maxZ: 58.1 }, kind: 'lecture' },
  { code: 'VDZ', label: 'Trung tâm Việt – Đức', box: VDZ_CENTER.box, kind: 'main' },
  { code: 'Hub', label: 'HUST Digital Hub', box: HUST_DIGITAL_HUB.box, kind: 'main' },
  { code: 'Cựu SV', label: 'Nhà Cựu sinh viên Bách Khoa', box: ALUMNI_HOUSE.box, kind: 'main' },
  { code: 'Thư Viện', label: 'Thư viện Tạ Quang Bửu', box: { minX: 25.6, maxX: 52.0, minZ: 19.4, maxZ: 50.0 }, kind: 'main' },
  { code: 'D9', label: 'Nhà D9', box: { minX: 30, maxX: 52, minZ: 59.25, maxZ: 66.75 }, kind: 'lecture' },
  { code: 'D3', label: 'Nhà D3', box: { minX: 59.5, maxX: 77.5, minZ: 3.0, maxZ: 9.8 }, kind: 'lecture' },
  { code: 'D5', label: 'Nhà D5', box: { minX: 59.5, maxX: 74.5, minZ: 20.5, maxZ: 27.1 }, kind: 'lecture' },
  { code: 'D3-5', label: 'Nhà D3-5', box: { minX: 73.5, maxX: 77.5, minZ: 9.8, maxZ: 27.1 }, kind: 'lecture' },
  { code: 'D7', label: 'Nhà D7', box: { minX: 59.5, maxX: 75.5, minZ: 38.5, maxZ: 45.3 }, kind: 'lecture' },
  // Khối phụ trợ thuộc trường (building=university)
  { code: 'C2B', label: CAMPUS_ANNEX_BLOCKS[0].label, box: CAMPUS_ANNEX_BLOCKS[0].box, kind: 'lecture' },
  { code: 'C2N', label: CAMPUS_ANNEX_BLOCKS[1].label, box: CAMPUS_ANNEX_BLOCKS[1].box, kind: 'lecture' },
  { code: 'C1-3', label: CAMPUS_ANNEX_BLOCKS[2].label, box: CAMPUS_ANNEX_BLOCKS[2].box, kind: 'lecture' },
  { code: 'DV1', label: CAMPUS_ANNEX_BLOCKS[3].label, box: CAMPUS_ANNEX_BLOCKS[3].box, kind: 'lecture' },
  { code: 'DV2', label: CAMPUS_ANNEX_BLOCKS[4].label, box: CAMPUS_ANNEX_BLOCKS[4].box, kind: 'lecture' },
  // Toàn bộ 9 Điểm gửi xe & Hầm xe trong khuôn viên chính theo https://hustmap.com/
  { code: 'P.C1', label: 'Bãi xe C1 (Tây)', box: CAMPUS_PARKING_LOTS.c1West.box, kind: 'parking' },
  { code: 'P.C1Đ', label: 'Bãi xe C1 (Đông)', box: CAMPUS_PARKING_LOTS.c1East.box, kind: 'parking' },
  { code: 'P.C2', label: 'Bãi xe C2', box: CAMPUS_PARKING_LOTS.c2Carport.box, kind: 'parking' },
  { code: 'P.C9', label: 'Bãi xe C9', box: CAMPUS_PARKING_LOTS.c9Lot.box, kind: 'parking' },
  { code: 'P.C5', label: 'Nhà xe C5 (Bắc)', box: CAMPUS_PARKING_LOTS.c5NorthShed.box, kind: 'parking' },
  { code: 'P.C5N', label: 'Nhà xe C5 (Nam)', box: CAMPUS_PARKING_LOTS.c5SouthShed.box, kind: 'parking' },
  { code: 'P.D4-8', label: 'Điểm trông giữ xe D4-6-8', box: BIKE_PARKING_SHED.box, kind: 'parking' },
  { code: 'P.D7-9', label: 'Điểm trông giữ xe D7 - D9', box: CAMPUS_PARKING_LOTS.d7d9Lot.box, kind: 'parking' },
  { code: 'P.D3-5', label: 'Điểm trông giữ xe D3 - D5', box: D3_D5_PARKING_GARAGE.box, kind: 'parking' },
  { code: 'P.C7', label: 'Bãi xe C7 (Giảng viên)', box: { minX: 46.5, maxX: 51.8, minZ: -51.4, maxZ: -34.5 }, kind: 'parking' },
  { code: 'Hầm↑', label: C7_UNDERGROUND_RAMPS.exitRamp.label, box: C7_UNDERGROUND_RAMPS.exitRamp.box, kind: 'parking' },
  { code: 'Hầm↓', label: C7_UNDERGROUND_RAMPS.entryRamp.label, box: C7_UNDERGROUND_RAMPS.entryRamp.box, kind: 'parking' },
  // Phân khu Đông Đường Trần Đại Nghĩa (KTX B3–B13, B1, A1-5, A17, Nhà E, Nhà T, Khu Thể thao & SVĐ)
  { code: 'B6', label: 'KTX B6', box: DORM_COMPLEX.b6Box, kind: 'dorm' },
  { code: 'B7', label: 'KTX B7', box: DORM_COMPLEX.b7Box, kind: 'dorm' },
  { code: 'B7bis', label: 'KTX B7bis', box: DORM_COMPLEX.b7bisBox, kind: 'dorm' },
  { code: 'B8', label: 'KTX B8 (VP Hội Sinh viên)', box: DORM_COMPLEX.b8Box, kind: 'dorm' },
  { code: 'B5', label: 'KTX B5', box: DORM_COMPLEX.b5Box, kind: 'dorm' },
  { code: 'B5-9', label: 'Căng tin B5-9', box: DORM_COMPLEX.b59CanteenBox, kind: 'dorm' },
  { code: 'B9', label: 'KTX B9 (TT Quản lý KTX)', box: DORM_COMPLEX.b9Box, kind: 'dorm' },
  { code: 'TTPV', label: 'TT Phục vụ Tổng hợp BK', box: DORM_COMPLEX.serviceBox, kind: 'dorm' },
  { code: 'B13', label: 'KTX B13', box: DORM_COMPLEX.b13Box, kind: 'dorm' },
  { code: 'Y tế', label: 'Trung tâm ĐTTH & Trạm Y tế', box: DORM_COMPLEX.canteenBox, kind: 'dorm' },
  { code: 'B3', label: 'KTX B3', box: DORM_COMPLEX.b3Box, kind: 'dorm' },
  { code: 'B10', label: 'KTX B10', box: DORM_COMPLEX.b10Box, kind: 'dorm' },
  { code: 'B4', label: 'Nhà B4', box: DORM_COMPLEX.b4Box, kind: 'dorm' },
  { code: 'B1', label: 'Nhà B1 (Trường CNTT&TT - SoICT)', box: SOICT_B1.box, kind: 'main' },
  { code: 'A1-5', label: 'Nhà ăn A1-5', box: EAST_CAMPUS_BLOCKS.a15.box, kind: 'lecture' },
  { code: 'A17', label: 'Nhà A17', box: EAST_CAMPUS_BLOCKS.a17.box, kind: 'lecture' },
  { code: 'E', label: 'Nhà E', box: EAST_CAMPUS_BLOCKS.nhaE.box, kind: 'lecture' },
  { code: 'Nhà T', label: 'Nhà T', box: EAST_CAMPUS_BLOCKS.nhaT.box, kind: 'main' },
  { code: 'Bể bơi', label: 'Bể bơi Bách Khoa', box: SPORTS_COMPLEX.poolBox, kind: 'sport' },
  { code: 'NTĐ', label: 'Nhà thi đấu Bách Khoa', box: SPORTS_COMPLEX.stadiumBox, kind: 'sport' },
  { code: 'Nhà TC', label: 'Nhà TC', box: SPORTS_COMPLEX.nhaTcBox, kind: 'sport' },
  { code: 'SVĐ', label: 'SVĐ Bách Khoa', box: { minX: 115, maxX: 149, minZ: 69, maxZ: 91 }, kind: 'sport' },
  { code: 'A3', label: 'KTX A3', box: SPORTS_COMPLEX.ktxA3Box, kind: 'dorm' },
  { code: 'A2', label: 'KTX A2', box: SPORTS_COMPLEX.ktxA2Box, kind: 'dorm' },
  // 4 Cổng chính của trường
  { code: 'Cổng ĐCV', label: 'Cổng Số 1 Đại Cồ Việt', box: DAI_CO_VIET_GATE.box, kind: 'gate' },
  { code: 'Parabol', label: 'Cổng Parabol (Giải Phóng)', box: { minX: -90, maxX: -86, minZ: -12.5, maxZ: 0.5 }, kind: 'gate' },
  { code: 'Cổng TĐN', label: 'Cổng Trần Đại Nghĩa (B8)', box: { minX: 90.5, maxX: 93.5, minZ: -11, maxZ: -1 }, kind: 'gate' },
  { code: 'Cổng TQB', label: 'Cổng Tạ Quang Bửu', box: { minX: 121, maxX: 131, minZ: -69.5, maxZ: -66.5 }, kind: 'gate' },
];

export function nearestZone(p: Vec2): string {
  // Hồ Tiền là hình chữ nhật — kiểm tra theo hình chữ nhật nới 4 m
  // (một vòng tròn bán kính lớn quanh tâm hồ sẽ nuốt cả sân phía bắc).
  if (
    Math.abs(p.x - LAKE.center.x) < LAKE.halfW + 4 &&
    Math.abs(p.z - LAKE.center.z) < LAKE.halfL + 4
  ) {
    return 'Hồ Tiền';
  }
  let best = 'Sân trường';
  let bestD = Infinity;
  for (const zn of ZONES) {
    if (zn.name === 'Hồ Tiền') continue; // đã xử lý riêng ở trên
    const d = Math.hypot(p.x - zn.center.x, p.z - zn.center.z) - zn.radius;
    if (d < bestD) {
      bestD = d;
      best = zn.name;
    }
  }
  return bestD <= 0 ? best : 'Sân trường';
}
