// ---------------------------------------------------------------------------
// features/campus/world-data/zones.ts — Các phân khu nhận diện trên HUD,
// danh sách tòa nhà hiển thị trên Bản đồ (Phím M) và hàm nearestZone.
// ---------------------------------------------------------------------------

import type { AABB, Vec2 } from './bounds';
import {
  C2_BUILDING,
  C6_BUILDING,
  C7_BUILDING,
  C8_BUILDING,
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
  { name: 'Nhà C2 (VP Đoàn - Đảng ủy)', center: { x: -86, z: -34 }, radius: 11 },
  { name: 'Quảng trường C1', center: { x: -58, z: -38 }, radius: 19 },
  { name: 'Cụm Giảng đường C3 – C4 – C5 – C10', center: { x: -12, z: -50 }, radius: 22 },
  { name: 'Cụm Tòa nhà C6 – C7 – C8', center: { x: 46, z: -46 }, radius: 22 },
  { name: 'Thư viện Tạ Quang Bửu', center: { x: 38, z: 32 }, radius: 20 },
  { name: 'Hồ Tiền', center: { x: -2, z: 48 }, radius: 34 }, // bán kính chỉ để tham khảo — nearestZone kiểm tra theo hình chữ nhật (xem dưới)
  { name: 'Cụm Giảng đường D2 – D2a – D2b', center: { x: -60, z: 23 }, radius: 16 },
  { name: 'Nhà D4 (Viện Ngoại ngữ)', center: { x: -78, z: 44 }, radius: 15 },
  { name: 'Cụm Giảng đường D6 – D8', center: { x: -46, z: 46 }, radius: 16 },
  { name: 'Cụm Giảng đường D3 – D5 – D7 – D9', center: { x: 60, z: 36 }, radius: 22 },
  { name: 'Nhà để xe D3 - D5', center: { x: 76, z: 7.5 }, radius: 12 },
  { name: 'Cổng Trần Đại Nghĩa (Cổng B8)', center: { x: 92, z: -6 }, radius: 14 },
  { name: 'Đường tình yêu', center: { x: 0, z: -6 }, radius: 11 },
  { name: 'Nhà B1 (Viện CNTT&TT - SoICT)', center: { x: 112, z: 14 }, radius: 16 },
  { name: 'Khu Ký túc xá Bách Khoa (B3 – B13)', center: { x: 122, z: -40 }, radius: 28 },
  { name: 'Nhà thi đấu TC & Bể bơi Bách Khoa', center: { x: 112, z: 56 }, radius: 20 },
  { name: 'Sân vận động Bách Khoa', center: { x: 132, z: 78 }, radius: 24 },
  { name: 'Cổng Đại Cồ Việt', center: { x: -58, z: -72 }, radius: 9 },
];

export type CampusMapBuildingKind = 'main' | 'lecture' | 'sport' | 'dorm' | 'gate';

export type CampusMapBuildingSpec = {
  code: string;
  label: string;
  box: AABB;
  kind: CampusMapBuildingKind;
};

/** Danh sách công trình & khu vực vẽ trên Bản đồ thu nhỏ / Bản đồ toàn cảnh (Phím M) — khớp 100% khuon-vien-truong.png. */
export const CAMPUS_MAP_BUILDINGS: CampusMapBuildingSpec[] = [
  // Khu C (Bắc trục đường chính Parabol – Trần Đại Nghĩa)
  { code: 'C1', label: 'Nhà C1 (Hành chính)', box: { minX: -82, maxX: -34, minZ: -63, maxZ: -49 }, kind: 'main' },
  { code: 'C2', label: 'Nhà C2 (VP Đoàn - Đảng ủy)', box: C2_BUILDING.box, kind: 'main' },
  { code: 'C9', label: 'Nhà C9 (Cầu thang đỏ)', box: { minX: -85, maxX: -65, minZ: -23, maxZ: -11 }, kind: 'main' },
  { code: 'C3', label: 'Nhà C3', box: { minX: -23, maxX: -1, minZ: -71.25, maxZ: -64.75 }, kind: 'lecture' },
  { code: 'C4', label: 'Nhà C4 (Hóa - Sinh - Thực phẩm)', box: { minX: -23, maxX: -1, minZ: -60.25, maxZ: -53.75 }, kind: 'lecture' },
  { code: 'C5', label: 'Nhà C5 (Vật liệu - Dệt may)', box: { minX: -23, maxX: -1, minZ: -49.25, maxZ: -42.75 }, kind: 'lecture' },
  { code: 'C10', label: 'Nhà C10 (Cơ khí - VLKT - Môi trường)', box: { minX: -23, maxX: -1, minZ: -38.25, maxZ: -31.75 }, kind: 'lecture' },
  { code: 'C6', label: 'Nhà C6 (Cơ khí động lực)', box: C6_BUILDING.box, kind: 'main' },
  { code: 'C7', label: 'Nhà C7 (Nhiệt lạnh & ĐH)', box: C7_BUILDING.box, kind: 'main' },
  { code: 'C8', label: 'Nhà C8', box: C8_BUILDING.box, kind: 'main' },
  // Khu D & Thư viện - Hồ Tiền (Nam trục đường chính)
  { code: 'D2', label: 'Nhà D2', box: { minX: -54, maxX: -38, minZ: 20.75, maxZ: 27.25 }, kind: 'lecture' },
  { code: 'D2a', label: 'Nhà D2a', box: { minX: -69.5, maxX: -58.5, minZ: 19.25, maxZ: 24.75 }, kind: 'lecture' },
  { code: 'D2b', label: 'Nhà D2b', box: { minX: -84.5, maxX: -73.5, minZ: 19.25, maxZ: 24.75 }, kind: 'lecture' },
  { code: 'D4', label: 'Nhà D4 (Viện Ngoại ngữ)', box: D4_BUILDING.box, kind: 'lecture' },
  { code: 'D6', label: 'Nhà D6', box: { minX: -55, maxX: -37, minZ: 34.25, maxZ: 41.75 }, kind: 'lecture' },
  { code: 'D8', label: 'Nhà D8', box: { minX: -55, maxX: -37, minZ: 50.25, maxZ: 57.75 }, kind: 'lecture' },
  { code: 'VDZ', label: 'Nhà Bắc Hồ Tiền (VDZ)', box: VDZ_CENTER.box, kind: 'main' },
  { code: 'Thư Viện', label: 'Thư viện Tạ Quang Bửu', box: { minX: 25.5, maxX: 50.5, minZ: 23.5, maxZ: 43.5 }, kind: 'main' },
  { code: 'D9', label: 'Nhà D9', box: { minX: 29, maxX: 47, minZ: 59.25, maxZ: 66.75 }, kind: 'lecture' },
  { code: 'Nhà xe D3-D5', label: 'Nhà để xe D3 - D5', box: { minX: 67, maxX: 85, minZ: 2.75, maxZ: 12.25 }, kind: 'lecture' },
  { code: 'D3', label: 'Nhà D3 (Toán - Tin)', box: { minX: 57, maxX: 71, minZ: 17.5, maxZ: 24.5 }, kind: 'lecture' },
  { code: 'D5', label: 'Nhà D5', box: { minX: 57, maxX: 71, minZ: 30.5, maxZ: 37.5 }, kind: 'lecture' },
  { code: 'D3-5', label: 'Nhà D3-5', box: { minX: 71.75, maxX: 78.25, minZ: 17.5, maxZ: 37.5 }, kind: 'lecture' },
  { code: 'D7', label: 'Nhà D7', box: { minX: 53, maxX: 67, minZ: 44, maxZ: 56 }, kind: 'lecture' },
  // Phân khu Đông Đường Trần Đại Nghĩa (KTX B3–B13, B1, A17, H1, H3, Nhà T, Khu Thể thao & SVĐ)
  { code: 'B6', label: 'KTX B6', box: DORM_COMPLEX.b6Box, kind: 'dorm' },
  { code: 'B7', label: 'KTX B7', box: DORM_COMPLEX.b7Box, kind: 'dorm' },
  { code: 'B7bis', label: 'KTX B7bis', box: DORM_COMPLEX.b7bisBox, kind: 'dorm' },
  { code: 'B8', label: 'KTX B8 (VP Hội Sinh viên)', box: DORM_COMPLEX.b8Box, kind: 'dorm' },
  { code: 'B5', label: 'KTX B5', box: DORM_COMPLEX.b5Box, kind: 'dorm' },
  { code: 'B9', label: 'KTX B9 (TT Quản lý KTX)', box: DORM_COMPLEX.b9Box, kind: 'dorm' },
  { code: 'B13', label: 'KTX B13', box: DORM_COMPLEX.b13Box, kind: 'dorm' },
  { code: 'Nhà ăn', label: 'Nhà ăn KTX', box: DORM_COMPLEX.canteenBox, kind: 'dorm' },
  { code: 'B3', label: 'KTX B3', box: DORM_COMPLEX.b3Box, kind: 'dorm' },
  { code: 'B10', label: 'KTX B10', box: DORM_COMPLEX.b10Box, kind: 'dorm' },
  { code: 'B4', label: 'KTX B4', box: DORM_COMPLEX.b4Box, kind: 'dorm' },
  { code: 'B1', label: 'Nhà B1 (Viện CNTT&TT - SoICT)', box: SOICT_B1.box, kind: 'main' },
  { code: 'A17', label: 'Nhà A17', box: EAST_CAMPUS_BLOCKS.a17.box, kind: 'lecture' },
  { code: 'H1', label: 'Nhà H1', box: EAST_CAMPUS_BLOCKS.h1.box, kind: 'lecture' },
  { code: 'H3', label: 'Nhà H3', box: EAST_CAMPUS_BLOCKS.h3.box, kind: 'lecture' },
  { code: 'Nhà T', label: 'Nhà T', box: EAST_CAMPUS_BLOCKS.nhaT.box, kind: 'main' },
  { code: 'TC', label: 'Nhà thi đấu TC', box: SPORTS_COMPLEX.stadiumBox, kind: 'sport' },
  { code: 'Bể bơi', label: 'Bể bơi Bách Khoa', box: SPORTS_COMPLEX.poolBox, kind: 'sport' },
  { code: 'SVĐ', label: 'SVĐ Bách Khoa (Sân bóng đá)', box: { minX: 115, maxX: 149, minZ: 67, maxZ: 89 }, kind: 'sport' },
  { code: 'KTX Lào', label: 'KTX Lào', box: SPORTS_COMPLEX.ktxLaoBox, kind: 'dorm' },
  { code: 'Parabol', label: 'Cổng Parabol (Giải Phóng)', box: { minX: -90, maxX: -86, minZ: -12.5, maxZ: 0.5 }, kind: 'gate' },
  { code: 'Cổng TĐN', label: 'Cổng Trần Đại Nghĩa (B8)', box: { minX: 90.5, maxX: 93.5, minZ: -11, maxZ: -1 }, kind: 'gate' },
  { code: 'Cổng TQB', label: 'Cổng Tạ Quang Bửu', box: { minX: 121, maxX: 131, minZ: -69.5, maxZ: -66.5 }, kind: 'gate' },
];

export function nearestZone(p: Vec2): string {
  // Hồ Tiền là hình chữ nhật — kiểm tra theo hình chữ nhật nới 4 m
  // (một vòng tròn bán kính lớn quanh tâm hồ sẽ nuốt cả sân C9 phía bắc).
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
