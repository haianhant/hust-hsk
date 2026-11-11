// ---------------------------------------------------------------------------
// features/campus/world-data/zones.ts — Các phân khu nhận diện trên HUD,
// danh sách tòa nhà hiển thị trên Bản đồ (Phím M) và hàm nearestZone.
// Đối chiếu chuẩn theo Bản đồ Số https://hustmap.com/.
// ---------------------------------------------------------------------------

import type { AABB, Vec2 } from './bounds';
import {
  ALUMNI_HOUSE,
  C15_BUILDING,
  C2_BUILDING,
  C6_BUILDING,
  C7_BUILDING,
  D3_D5_PARKING_GARAGE,
  D4_BUILDING,
  DORM_COMPLEX,
  EAST_CAMPUS_BLOCKS,
  LAKE,
  SOICT_B1,
  SPORTS_COMPLEX,
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
  { name: 'Nhà C2 (VP Đoàn - Đảng ủy)', center: { x: -86, z: -34 }, radius: 12 },
  { name: 'Quảng trường C1', center: { x: -58, z: -38 }, radius: 19 },
  { name: 'Quảng trường ngã 5', center: { x: -38, z: -16 }, radius: 10 },
  { name: 'Cụm Giảng đường C3 – C4 – C5 – C10', center: { x: -12, z: -50 }, radius: 22 },
  { name: 'Tổ hợp Tòa C7 & Cụm C6 – C15', center: { x: 46, z: -38 }, radius: 24 },
  { name: 'Thư viện Tạ Quang Bửu', center: { x: 38, z: 32 }, radius: 20 },
  { name: 'Hồ Tiền', center: { x: -2, z: 48 }, radius: 34 }, // bán kính chỉ để tham khảo — nearestZone kiểm tra theo hình chữ nhật
  { name: 'Cụm Nhà D2A – D2B', center: { x: -55, z: 20 }, radius: 16 },
  { name: 'Nhà D4 (Trường Ngoại ngữ)', center: { x: -78, z: 44 }, radius: 15 },
  { name: 'Cụm Giảng đường D6 – D8', center: { x: -46, z: 46 }, radius: 16 },
  { name: 'Cụm Giảng đường D3 – D5 – D7 – D9', center: { x: 61, z: 32 }, radius: 22 },
  { name: 'Nhà để xe D3 - D5', center: { x: 80, z: 18 }, radius: 18 },
  { name: 'Cổng Trần Đại Nghĩa (Cổng B8)', center: { x: 92, z: -6 }, radius: 14 },
  { name: 'Đường tình yêu', center: { x: 0, z: -6 }, radius: 11 },
  { name: 'Nhà B1 (Trường CNTT&TT - SoICT)', center: { x: 112, z: 14 }, radius: 16 },
  { name: 'Cụm Nhà A1-5 · A17 · Nhà E · Nhà T', center: { x: 146, z: 20 }, radius: 18 },
  { name: 'Khu Ký túc xá Bách Khoa (B3 – B13)', center: { x: 122, z: -40 }, radius: 28 },
  { name: 'Bể bơi, Nhà thi đấu & Nhà TC Bách Khoa', center: { x: 110, z: 54 }, radius: 20 },
  { name: 'Sân vận động Bách Khoa', center: { x: 132, z: 80 }, radius: 24 },
  { name: 'Cổng Đại Cồ Việt', center: { x: -58, z: -72 }, radius: 9 },
];

export type CampusMapBuildingKind = 'main' | 'lecture' | 'sport' | 'dorm' | 'gate';

export type CampusMapBuildingSpec = {
  code: string;
  label: string;
  box: AABB;
  kind: CampusMapBuildingKind;
};

/** Danh sách công trình & khu vực vẽ trên Bản đồ thu nhỏ / Bản đồ toàn cảnh (Phím M) — khớp chuẩn https://hustmap.com/. */
export const CAMPUS_MAP_BUILDINGS: CampusMapBuildingSpec[] = [
  // Khu C (Bắc trục đường chính Parabol – Trần Đại Nghĩa)
  { code: 'C1', label: 'Nhà C1 (Hành chính)', box: { minX: -82, maxX: -34, minZ: -63, maxZ: -49 }, kind: 'main' },
  { code: 'C1B', label: 'Nhà C1B', box: { minX: -30.75, maxX: -24.25, minZ: -59.25, maxZ: -52.75 }, kind: 'lecture' },
  { code: 'C2', label: 'Nhà C2 (VP Đoàn - Đảng ủy)', box: C2_BUILDING.box, kind: 'main' },
  { code: 'C9', label: 'Nhà C9 (Cầu thang đỏ)', box: { minX: -85, maxX: -65, minZ: -23, maxZ: -11 }, kind: 'main' },
  { code: 'C3', label: 'Nhà C3', box: { minX: -23, maxX: -1, minZ: -71.25, maxZ: -64.75 }, kind: 'lecture' },
  { code: 'C3B', label: 'Nhà C3B', box: { minX: 20.25, maxX: 27.75, minZ: -70.0, maxZ: -63.0 }, kind: 'lecture' },
  { code: 'C4B', label: 'Nhà C4B', box: { minX: -13, maxX: -2, minZ: -64.2, maxZ: -60.8 }, kind: 'lecture' },
  { code: 'C4', label: 'Nhà C4 (Hóa & KH Sự sống)', box: { minX: -23, maxX: -1, minZ: -60.25, maxZ: -53.75 }, kind: 'lecture' },
  { code: 'C5', label: 'Nhà C5 (Vật liệu - Cơ khí)', box: { minX: -23, maxX: -1, minZ: -49.25, maxZ: -42.75 }, kind: 'lecture' },
  { code: 'C10', label: 'Nhà C10', box: { minX: -23, maxX: -1, minZ: -38.25, maxZ: -31.75 }, kind: 'lecture' },
  { code: 'ITIMS', label: 'Viện ITIMS', box: { minX: -31.25, maxX: -23.75, minZ: -38.75, maxZ: -31.25 }, kind: 'lecture' },
  { code: 'C6', label: 'Nhà C6', box: C6_BUILDING.box, kind: 'main' },
  { code: 'C15', label: 'Nhà C15', box: C15_BUILDING.box, kind: 'lecture' },
  { code: 'C7', label: 'Tòa C7 (Chữ E · Học HSK)', box: C7_BUILDING.box, kind: 'main' },
  // Khu D & Thư viện - Hồ Tiền (Nam trục đường chính)
  { code: 'D2A', label: 'Nhà D2A', box: { minX: -71.5, maxX: -56.5, minZ: 16.5, maxZ: 23.5 }, kind: 'lecture' },
  { code: 'D2B', label: 'Nhà D2B', box: { minX: -49.25, maxX: -38.75, minZ: 15.5, maxZ: 24.5 }, kind: 'lecture' },
  { code: 'D4', label: 'Nhà D4 (Trường Ngoại ngữ)', box: D4_BUILDING.box, kind: 'lecture' },
  { code: 'D6', label: 'Nhà D6', box: { minX: -55, maxX: -37, minZ: 34.25, maxZ: 41.75 }, kind: 'lecture' },
  { code: 'D8', label: 'Nhà D8', box: { minX: -55, maxX: -37, minZ: 50.25, maxZ: 57.75 }, kind: 'lecture' },
  { code: 'VDZ', label: 'Trung tâm Việt – Đức', box: VDZ_CENTER.box, kind: 'main' },
  { code: 'Hub', label: 'Nhà Cựu SV · Digital Hub', box: ALUMNI_HOUSE.box, kind: 'main' },
  { code: 'Thư Viện', label: 'Thư viện Tạ Quang Bửu', box: { minX: 25.6, maxX: 52.0, minZ: 19.4, maxZ: 50.0 }, kind: 'main' },
  { code: 'D9', label: 'Nhà D9', box: { minX: 29, maxX: 47, minZ: 59.25, maxZ: 66.75 }, kind: 'lecture' },
  { code: 'P.D3-5', label: 'Điểm trông giữ xe D3 - D5', box: D3_D5_PARKING_GARAGE.box, kind: 'lecture' },
  { code: 'D3', label: 'Nhà D3', box: { minX: 54, maxX: 68, minZ: 10.7, maxZ: 17.3 }, kind: 'lecture' },
  { code: 'D5', label: 'Nhà D5', box: { minX: 54, maxX: 68, minZ: 25.7, maxZ: 32.3 }, kind: 'lecture' },
  { code: 'D3-5', label: 'Nhà D3-5', box: { minX: 67.7, maxX: 73.3, minZ: 10.7, maxZ: 32.3 }, kind: 'lecture' },
  { code: 'D7', label: 'Nhà D7', box: { minX: 54, maxX: 68, minZ: 39, maxZ: 51 }, kind: 'lecture' },
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
