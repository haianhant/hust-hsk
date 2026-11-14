// ---------------------------------------------------------------------------
// features/campus/world-data/buildings.ts — Metadata vị trí, kích thước & hình học
// của toàn bộ công trình, cổng trường, hồ nước và không gian nội thất ĐHBK Hà Nội.
// Đối chiếu theo Bản đồ Số chuẩn https://hustmap.com/ (Source of Truth, giới hạn
// gọn trong phạm vi khuôn viên ĐHBK Hà Nội) & bộ ảnh thực tế tham-khao/.
// ---------------------------------------------------------------------------

import type { AABB, Vec2 } from './bounds';

// --- Landmark chính ---------------------------------------------------------

export const PARABOL_GATE = {
  center: { x: -88, z: -6 },
  /** chiều rộng thông thủy giữa hai chân (m) — theo báo chí 11/2026, chưa có bản vẽ chính thức */
  clearWidth: 8,
  /** chiều cao đỉnh vòm (m) — theo báo chí 11/2026 */
  height: 12.5,
  legThickness: 1.5, // độ dày chân trụ theo trục Z
  depth: 1.2, // độ rộng dải băng vòm (theo mặt phẳng vòm) — Bước 3: dải phẳng, không còn ống tròn
  ribbonThickness: 0.6, // độ dày dải băng theo trục X (phương đường đi)
  /** chân trụ: hai AABB kẹp lối đi (lối đi z = -10..-2, rộng 8 m thẳng trục z = -6 với Cổng Trần Đại Nghĩa) */
  legAabbs: [
    { minX: -89.2, maxX: -86.8, minZ: -12.5, maxZ: -10 },
    { minX: -89.2, maxX: -86.8, minZ: -2, maxZ: 0.5 },
  ],
  /** nhà gác trắng phía bắc cổng (ƯỚC LƯỢNG vị trí theo ảnh: bên trái cổng) */
  guardHouse: { minX: -90, maxX: -86, minZ: -16.5, maxZ: -13.5 },
} as const;

export const C1 = {
  center: { x: -58, z: -56 },
  size: { x: 48, z: 14 }, // khối nhà ngang, mặt tiền dài
  floors: 4, // xác nhận: bài HUST "70 năm"
  floorHeight: 3.6,
  waves: 9, // BẮT BUỘC đếm đủ 9 gợn sóng mái
  waveAmplitude: 0.5, // Bước 3: sóng NÔNG theo ảnh (blockout 1,2 là quá cao)
  /** Quảng trường C1 mở rộng thoáng đãng (52,0 m × 25,6 m) trải từ sát mặt tiền Nam C1 tới Khối đá trắng & Ngã 5 */
  plaza: { minX: -83.5, maxX: -31.5, minZ: -49.0, maxZ: -23.4 },
  lipaTrees: [
    { x: -73.2, z: -40 },
    { x: -42.8, z: -40 },
  ],
  /** bậc tam cấp trước sảnh (5 bậc đá xám-đen, rộng 12 m) — collider riêng để avatar không đi xuyên bậc */
  steps: { minX: -64, maxX: -52, minZ: -49.5, maxZ: -43.8 },
} as const;

/** Logo "I LOVE BK" đúng hình: I trắng + tim đỏ (tầng trên) + BK trắng (tầng dưới),
 *  khối 3D đứng trên bệ đen thấp giữa trục đường dạo sân trước C1 (tham-khao/c1/). */
export const I_LOVE_BK = {
  center: { x: -58, z: -39.5 },
  plinth: { minX: -59.35, maxX: -56.65, minZ: -39.9, maxZ: -39.1 },
} as const;

export const LIBRARY = {
  center: { x: 38.8, z: 38.5 },
  size: { x: 26.4, z: 23.2 }, // Mở rộng quy mô đồ sộ Thư viện Tạ Quang Bửu (~37.000 m²): mặt tiền 26,4 m (mái đua ~28,2 m) × chiều sâu 23,2 m
  floors: 10, // xác nhận: HUST, ~37.000 m²
  floorHeight: 3.25,
  /** Đồng hồ tròn đặt chính giữa mặt đứng khối đế phía Bắc (−Z), thẳng hàng trên hàng cột sảnh trước (z = 19,28),
   *  KHÔNG có mái đua phía trước che khuất tầm nhìn từ dưới sân lên (theo ảnh 1308122022.jpg & untitled137.png). */
  clock: { x: 38, y: 7.9, z: 19.28, radius: 1.35 },
  plaza: { minX: 23, maxX: 53.2, minZ: 9.5, maxZ: 57.5 }, // Mở rộng sân gạch đỏ-nâu ôm trọn khối tháp & hai cánh phòng đọc khối đế
  /** Tiền cảnh phía bắc (theo tham-khao/thu-vien/): lối đi đỏ + sân xám + chữ HUST. */
  forecourt: {
    walk: { minX: 24, maxX: 33, minZ: 12, maxZ: 16 },
    grayYard: { minX: 30, maxX: 48, minZ: 12, maxZ: 16 },
    hust: { x: 38, z: 14 },
  },
} as const;

/** Chữ "HUST" đỏ khối 3D trước sảnh thư viện (đợt 4, theo tư liệu). */
export const HUST_SIGN = {
  center: { x: 38, z: 14 },
  plinth: { minX: 35.2, maxX: 40.8, minZ: 13.4, maxZ: 14.6 },
} as const;

/** Hồ Tiền — HÌNH CHỮ NHẬT, trục dài bắc–nam, dài gấp đôi rộng (khóa bằng vệ
 *  tinh & https://hustmap.com/).
 *  45 × 88 m ≈ 3.960 m², tỉ lệ 88/45 ≈ 1,96 ≈ 2:1, khớp số liệu ~4.000 m² (báo cáo 2010).
 *  Nằm hoàn toàn ở phía Nam trục đường chính Parabol – Trần Đại Nghĩa (z = -6). */
export const LAKE = {
  center: { x: -2, z: 48 },
  halfW: 22.5, // nửa chiều rộng (trục X, đông–tây): hồ rộng 45 m
  halfL: 44, // nửa chiều dài (trục Z, bắc–nam): hồ dài 88 m (z: 4..92)
  waterY: 0.05,
} as const;

/** Bờ kè đá hộc quanh hồ (4 dải, rộng 1,2 m, ôm đúng mép nước). Collider riêng
 *  cho bờ kè; mặt nước chặn bằng hình chữ nhật hồ (pointInLake). */
export const LAKE_BANK: AABB[] = [
  { minX: -25.1, maxX: -23.9, minZ: 4, maxZ: 92 }, // bờ tây
  { minX: 19.9, maxX: 21.1, minZ: 4, maxZ: 92 }, // bờ đông
  { minX: -24.5, maxX: 20.5, minZ: 3.4, maxZ: 4.6 }, // bờ bắc
  { minX: -24.5, maxX: 20.5, minZ: 91.4, maxZ: 92.6 }, // bờ nam
];

/** Nhà C9 — Nằm ở phân khu Tây-Bắc (ngay phía Nam nhà C2, phía Tây vườn hoa C1
 *  và phía Bắc trục đường chính Cổng Parabol – Cổng Trần Đại Nghĩa theo đúng
 *  https://hustmap.com/, tách biệt hoàn toàn khỏi Hồ Tiền). */
export const C9 = {
  center: { x: -75, z: -17 },
  size: { x: 20, z: 12 },
  floors: 4,
  floorHeight: 3.4,
  /** Cầu thang bộ NGOÀI TRỜI zic-zac ở mặt ĐÔNG nhà C9 (bê tông trắng, lan can
   *  kim loại đỏ, 4 vế × 3,4 m khớp cao độ sàn tầng theo tham-khao/c9/c9-cau-thang-do-01.jpg). */
  stairs: {
    face: 'east' as const,
    flights: 4,
    /** AABB bao toàn bộ thang (kể cả chiếu nghỉ hai đầu) */
    box: { minX: -65.6, maxX: -62.6, minZ: -21.8, maxZ: -12.2 },
  },
} as const;

/** Khối đá trắng "ĐẠI HỌC BÁCH KHOA HÀ NỘI" (reference-visual §6):
 *  Đặt thẳng trên trục chính diện phía trước (phía Nam) tòa C1 (x = -58, z = -22),
 *  ngay giữa lối dẫn từ trục đường chính vào Quảng trường C1. */
export const WHITE_ROCK = {
  center: { x: -58, z: -22 },
  box: { minX: -60.1, maxX: -55.9, minZ: -23.0, maxZ: -21.0 },
} as const;

/** Đài phun nước Bách Khoa cỡ lớn (bể đá granite 9,6 × 5,6 m, chân đế 10,6 × 6,6 m) —
 *  đặt chính tâm trục đối xứng Quảng trường C1 (x = -58) giữa cụm chữ I ❤ BK (z = -39.5)
 *  và Khối đá trắng (z = -22) theo đúng https://hustmap.com/. */
export const C1_FOUNTAIN = {
  center: { x: -58, z: -30.8 },
  size: { x: 9.6, z: 5.6 },
  box: { minX: -62.8, maxX: -53.2, minZ: -33.6, maxZ: -28.0 },
} as const;

/** Quảng trường ngã 5 (nút giao biểu tượng 5 nhánh giữa Quảng trường C1, Bãi xe C9, ITIMS/C10 và trục chính theo https://hustmap.com/). */
export const NGA_5_PLAZA = {
  center: { x: -38, z: -16 },
  rect: { minX: -43.5, maxX: -32.5, minZ: -23.5, maxZ: -11.2 },
  /** Đảo cỏ tam giác phía Nam nút giao Ngã 5 & bồn tiểu cảnh tròn góc Nam ITIMS */
  southLawnCenter: { x: -38, z: -12.8 },
  itimsRoundPlanter: { x: -29.8, z: -26.2, radius: 2.2 },
} as const;

export const DAI_CO_VIET_GATE = {
  center: { x: -58, z: -73.5 },
  box: { minX: -63.8, maxX: -52.2, minZ: -74.8, maxZ: -72.2 },
} as const;

/** Quảng trường Trần Đại Nghĩa: nằm ở phía Tây tòa C2, phía Bắc tòa C9 sát biên đường Giải Phóng
 *  theo đúng Bản đồ Số https://hustmap.com/ (fid: 291). */
export const TDN_SQUARE = { minX: -94.6, maxX: -88.5, minZ: -44.2, maxZ: -24.8 } as const;

/** Bia / Tượng kỷ niệm GS. Viện sĩ Trần Đại Nghĩa đặt tại Quảng trường Trần Đại Nghĩa (phía Tây nhà C2). */
export const MONUMENT = {
  center: { x: -92.6, z: -34.5 },
  box: { minX: -93.6, maxX: -91.6, minZ: -35.6, maxZ: -33.4 },
  /** Biển đồng giới thiệu đặt ở mép Đông quảng trường */
  sign: { x: -89.4, z: -32.2, box: { minX: -90.0, maxX: -88.8, minZ: -32.8, maxZ: -31.6 } },
} as const;

export const TRAN_DAI_NGHIA_GATE = {
  center: { x: 92, z: -6 },
  /** Vị trí Bác bảo vệ Bách Khoa đứng gác cạnh phòng bảo vệ phía Bắc Cổng Trần Đại Nghĩa */
  guardPos: { x: 91.65, z: -12.25 },
} as const;

/** Dải phân cách trồng cây xanh có bó vỉa sơn trắng chia 2 nhánh đường 1 chiều đi vào (-Z, bên C7)
 *  và 1 chiều đi ra (+Z, bên D3) từ Cổng Trần Đại Nghĩa tới điểm nhập làn (x = 59.8, kết thúc C7 & D3).
 *  Đối chiếu trực tiếp bộ ảnh thực tế tham-khao/NEW/ ("Cổng trần đại nghĩa và 2 trục đường.jpg"). */
export const TDN_DIVIDED_MEDIAN = {
  center: { x: 75.1, z: -6.0 },
  size: { x: 30.6, z: 2.6 },
  box: { minX: 59.8, maxX: 90.4, minZ: -7.3, maxZ: -4.7 },
} as const;

/** Hàng cây cổ thụ trồng giữa dải phân cách đôi Cổng Trần Đại Nghĩa */
export const TDN_MEDIAN_TREES: Vec2[] = [
  { x: 62.5, z: -6.0 },
  { x: 68.5, z: -6.0 },
  { x: 74.5, z: -6.0 },
  { x: 80.5, z: -6.0 },
  { x: 86.5, z: -6.0 },
];

/** Nhà để xe sinh viên D3 - D5 (nằm bên tay trái / phía Nam +Z gần Cổng Trần Đại Nghĩa,
 *  kéo dài dọc theo chiều sâu trục Bắc–Nam ngay phía Đông cụm giảng đường D3 - D5).
 *  Đối chiếu ảnh thật: tham-khao/Nha-de-xe-D3-D5/images.jpg ("ĐIỂM TRÔNG GIỮ XE D3 - D5") & https://hustmap.com/. */
export const D3_D5_PARKING_GARAGE = {
  center: { x: 84.4, z: 20.5 },
  size: { x: 11.8, z: 34 },
  height: 4.2,
  signZ: 3.2,
  box: { minX: 78.5, maxX: 90.3, minZ: 3.5, maxZ: 37.5 },
} as const;

/** Dải đỗ xe ô tô của cán bộ giảng viên dọc tuyến đường rẽ phải phía Tây Tòa C7 / Bắc Trường Vật liệu
 *  (khớp ảnh thực tế "Từ cuối 2 nhánh bên nhìn sang bên phải, chỗ tòa C7.jpg" & https://hustmap.com/). */
export const C7_FACULTY_PARKING = {
  roadX: 56.2,
  minZ: -58,
  maxZ: -32,
  cars: [
    {
      id: 'c7-car-1',
      x: 49.2,
      z: -34.5,
      yaw: 0,
      color: '#991B1B',
      kind: 'sedan' as const,
      plate: '30A-682.19',
      box: { minX: 48.2, maxX: 50.2, minZ: -36.8, maxZ: -32.2 },
    },
    {
      id: 'c7-car-2',
      x: 49.2,
      z: -40.2,
      yaw: 0,
      color: '#F8FAFC',
      kind: 'suv' as const,
      plate: '30H-915.42',
      box: { minX: 48.15, maxX: 50.25, minZ: -42.55, maxZ: -37.85 },
    },
    {
      id: 'c7-car-3',
      x: 49.2,
      z: -45.8,
      yaw: 0,
      color: '#94A3B8',
      kind: 'sedan' as const,
      plate: '29A-403.88',
      box: { minX: 48.2, maxX: 50.2, minZ: -48.1, maxZ: -43.5 },
    },
    {
      id: 'c7-car-4',
      x: 49.2,
      z: -51.4,
      yaw: 0,
      color: '#0F172A',
      kind: 'sedan' as const,
      plate: '30G-771.05',
      box: { minX: 48.2, maxX: 50.2, minZ: -53.7, maxZ: -49.1 },
    },
    {
      id: 'c7-car-5',
      x: 52.6,
      z: -38.0,
      yaw: Math.PI,
      color: '#F8FAFC',
      kind: 'suv' as const,
      plate: '30K-558.26',
      box: { minX: 51.55, maxX: 53.65, minZ: -40.35, maxZ: -35.65 },
    },
  ],
} as const;

// --- Quy hoạch toàn bộ khuôn viên theo Bản đồ Số https://hustmap.com/ -------
// 1. Nhà C2: chạy dọc Bắc–Nam ở phía Tây vườn hoa C1, có 2 đầu cánh nhô sang Tây ôm sân Quảng trường Trần Đại Nghĩa.
export const C2_BUILDING = {
  center: { x: -83.6, z: -34.5 },
  size: { x: 7.5, z: 15.0 },
  box: { minX: -88.4, maxX: -79.4, minZ: -42.1, maxZ: -26.9 },
} as const;

// 2. Cụm nhà C6 – C15 – C7 ở khu Đông-Bắc sát phía Tây phố Trần Đại Nghĩa (theo https://hustmap.com/ & tham-khao/c7/):
//    - Nhà C8 cũ đã bị phá dỡ để xây Tổ hợp C7 mới trải dài dọc Bắc–Nam.
//    - Phía Bắc C7 là Nhà C6 và chếch Đông-Bắc sát Trần Đại Nghĩa là Nhà C15.
//    - Tổ hợp C7 cao 9 tầng hình chữ E với thân lưng dọc phía Đông (+X) và 3 cánh vươn về phía Tây (-X) tạo 2 sân cây xanh.
export const C6_BUILDING = {
  center: { x: 66, z: -63 },
  size: { x: 22, z: 7.0 },
  floors: 5,
  floorHeight: 3.2,
  box: { minX: 55, maxX: 77, minZ: -66.5, maxZ: -59.5 },
} as const;

export const C15_BUILDING = {
  center: { x: 88.8, z: -61.0 },
  size: { x: 4.8, z: 11.6 },
  floors: 3,
  floorHeight: 3.2,
  box: { minX: 86.4, maxX: 91.2, minZ: -66.8, maxZ: -55.2 },
} as const;

export const C7_BUILDING = {
  center: { x: 73.5, z: -32.8 },
  size: { x: 28, z: 38 },
  floors: 9,
  floorHeight: 3.1,
  box: { minX: 59.5, maxX: 87.5, minZ: -51.8, maxZ: -13.8 },
} as const;

/** Tòa nhà Trường Vật liệu (SMSE — School of Materials Science and Engineering):
 *  Nằm đối diện phía Tây Tòa C7 qua trục đường rẽ phải từ cuối 2 nhánh đường Cổng Trần Đại Nghĩa
 *  (khớp ảnh thực tế `tham-khao/NEW/trường vật liệu.jpg` & `Từ cuối 2 nhánh bên nhìn sang bên phải, chỗ tòa C7.jpg`). */
export const SCHOOL_OF_MATERIALS = {
  center: { x: 45.4, z: -22.0 },
  size: { x: 11.2, z: 17.0 },
  floors: 4,
  floorHeight: 3.4,
  box: { minX: 39.8, maxX: 51.0, minZ: -30.5, maxZ: -13.5 },
} as const;

/** Hai ram dốc Lối vào & Lối ra Hầm Gửi xe Tòa C7 (trùng khớp lớp `garages` trên https://hustmap.com/):
 *  - `exitRamp` (id: 2): Khe giữa mặt Nam nhà C6 và mặt Bắc nhà C7.
 *  - `entryRamp` (id: 1): Cánh Đông-Bắc dẫn xuống hầm gửi xe C7. */
export const C7_UNDERGROUND_RAMPS = {
  exitRamp: {
    label: 'Lối ra Hầm Gửi xe C7',
    center: { x: 63.5, z: -55.8 },
    size: { x: 8.8, z: 3.4 },
    box: { minX: 59.1, maxX: 67.9, minZ: -57.5, maxZ: -54.1 },
  },
  entryRamp: {
    label: 'Lối vào Hầm Gửi xe C7',
    center: { x: 77.5, z: -55.2 },
    size: { x: 8.8, z: 3.4 },
    box: { minX: 73.1, maxX: 81.9, minZ: -56.9, maxZ: -53.5 },
  },
} as const;

// 3. Cụm 3 công trình công viên bờ Bắc Hồ Tiền tách rời theo đúng https://hustmap.com/ & tham-khao/NEW/tòa cựu sinh viên bách khoa.jpg:
//    - Phía Tây: Trung tâm Hợp tác Việt – Đức (VDZ, 4 tầng)
//    - Chính giữa: Không gian số HUST Digital Hub (2 tầng)
//    - Phía Đông-Nam (sát góc Đông-Bắc Hồ Tiền, mặt tiền nhìn ra trục chính sau nhập làn): Tòa nhà Cựu sinh viên Bách Khoa (2 tầng)
export const VDZ_CENTER = {
  center: { x: -7.2, z: -0.3 },
  size: { x: 8.4, z: 3.2 },
  floors: 4,
  floorHeight: 3.0,
  box: { minX: -11.4, maxX: -3.0, minZ: -1.9, maxZ: 1.3 },
} as const;

export const HUST_DIGITAL_HUB = {
  center: { x: 3.2, z: -0.3 },
  size: { x: 6.8, z: 2.8 },
  floors: 2,
  floorHeight: 3.2,
  box: { minX: -0.2, maxX: 6.6, minZ: -1.7, maxZ: 1.1 },
} as const;

export const ALUMNI_HOUSE = {
  center: { x: 15.3, z: 0.9 },
  size: { x: 10.2, z: 3.4 },
  floors: 2,
  floorHeight: 3.3,
  box: { minX: 10.2, maxX: 20.4, minZ: -0.8, maxZ: 2.6 },
} as const;

// 4. Nhà B1 (Trường Công nghệ Thông tin & Truyền thông — SoICT): tòa nhà lớn 8 tầng
// (tỉ lệ thực tế ~33m × 17m đối chiếu https://hustmap.com/) + Sân trước Nhà B1 rộng rãi
// gồm thảm cỏ bán nguyệt, sảnh tròn Rotunda 3 tầng và Nhà xe / Bãi xe B1.
export const SOICT_B1 = {
  center: { x: 115.5, z: 22.5 },
  size: { x: 33, z: 17 },
  floors: 8,
  floorHeight: 3.2,
  box: { minX: 99, maxX: 132, minZ: 14, maxZ: 31 },
} as const;

export const B1_FORECOURT_PLAZA: AABB = {
  minX: 99.0,
  maxX: 132.0,
  minZ: -2.8,
  maxZ: 14.5,
};

// 5. Cụm công trình thuộc HUST ở phía Đông-Nam Nhà B1 qua phố Tạ Quang Bửu (theo đúng https://hustmap.com/):
//    Nhà ăn A1-5, Nhà A17 (xoay chéo dọc Tạ Quang Bửu), Nhà E và Nhà T (khối dài ở rìa Đông).
//    Đã loại bỏ hoàn toàn H1, H3 (vốn thuộc ĐH Xây dựng Hà Nội ngoài trường).
export const EAST_CAMPUS_BLOCKS = {
  a15: {
    center: { x: 142, z: 9 },
    size: { x: 10, z: 5.6 },
    box: { minX: 137, maxX: 147, minZ: 6.2, maxZ: 11.8 },
  },
  a17: {
    center: { x: 142.5, z: 23 },
    size: { x: 11, z: 7.6 },
    rotY: -0.55,
    box: { minX: 137, maxX: 148, minZ: 19.2, maxZ: 26.8 },
  },
  nhaE: {
    center: { x: 149.5, z: 30.5 },
    size: { x: 7.5, z: 5.5 },
    box: { minX: 145.75, maxX: 153.25, minZ: 27.75, maxZ: 33.25 },
  },
  nhaT: {
    center: { x: 159, z: 20 },
    size: { x: 11, z: 22 },
    box: { minX: 153.5, maxX: 164.5, minZ: 9, maxZ: 31 },
  },
} as const;

// 6. Khu Ký túc xá Bách Khoa (B3–B13, Căng tin B5-9, Sân bóng rổ KTX, Sân bóng đá KTX,
// TT Phục vụ Tổng hợp BK, Trạm Y tế / ĐTTH) nằm phía Đông đường Trần Đại Nghĩa, chia 2 bên phố Tạ Quang Bửu
// theo đúng https://hustmap.com/.
export const DORM_COMPLEX = {
  b6Center: { x: 104, z: -61 },
  b6Size: { x: 13, z: 5.6 },
  b6Box: { minX: 97.5, maxX: 110.5, minZ: -63.8, maxZ: -58.2 },
  b7Center: { x: 104, z: -49 },
  b7Size: { x: 13, z: 5.6 },
  b7Box: { minX: 97.5, maxX: 110.5, minZ: -51.8, maxZ: -46.2 },
  basketballCenter: { x: 104, z: -40.5 },
  basketballSize: { x: 10.5, z: 6.2 },
  b7bisCenter: { x: 104, z: -32 },
  b7bisSize: { x: 13, z: 5.6 },
  b7bisBox: { minX: 97.5, maxX: 110.5, minZ: -34.8, maxZ: -29.2 },
  b8Center: { x: 104, z: -20 },
  b8Size: { x: 13, z: 6.0 },
  b8Box: { minX: 97.5, maxX: 110.5, minZ: -23.0, maxZ: -17.0 },
  b5Center: { x: 119, z: -61 },
  b5Size: { x: 9, z: 5.4 },
  b5Box: { minX: 114.5, maxX: 123.5, minZ: -63.7, maxZ: -58.3 },
  b59CanteenCenter: { x: 119, z: -52.5 },
  b59CanteenSize: { x: 8.6, z: 4.4 },
  b59CanteenBox: { minX: 114.7, maxX: 123.3, minZ: -54.7, maxZ: -50.3 },
  b9Center: { x: 119, z: -43.5 },
  b9Size: { x: 9, z: 5.6 },
  b9Box: { minX: 114.5, maxX: 123.5, minZ: -46.3, maxZ: -40.7 },
  dormPitchCenter: { x: 119, z: -31.5 },
  dormPitchSize: { x: 10, z: 8.2 },
  serviceCenter: { x: 119, z: -19.5 },
  serviceSize: { x: 8.5, z: 5.8 },
  serviceBox: { minX: 114.75, maxX: 123.25, minZ: -22.4, maxZ: -16.6 },
  b13Center: { x: 139, z: -60 },
  b13Size: { x: 13, z: 5.8 },
  b13Box: { minX: 132.5, maxX: 145.5, minZ: -62.9, maxZ: -57.1 },
  canteenCenter: { x: 139, z: -48.5 },
  canteenSize: { x: 12, z: 6.0 },
  canteenBox: { minX: 133, maxX: 145, minZ: -51.5, maxZ: -45.5 },
  b3Center: { x: 139, z: -37 },
  b3Size: { x: 13, z: 5.8 },
  b3Box: { minX: 132.5, maxX: 145.5, minZ: -39.9, maxZ: -34.1 },
  b10Center: { x: 139, z: -24.5 },
  b10Size: { x: 13, z: 5.8 },
  b10Box: { minX: 132.5, maxX: 145.5, minZ: -27.4, maxZ: -21.6 },
  b4Center: { x: 153, z: -45 },
  b4Size: { x: 9, z: 5.8 },
  b4Box: { minX: 148.5, maxX: 157.5, minZ: -47.9, maxZ: -42.1 },
} as const;

// 7. Khu Thể thao & Sân vận động Bách Khoa dọc hai bên phố Lê Thanh Nghị (theo đúng https://hustmap.com/):
//    - Tây-Bắc phố Lê Thanh Nghị (từ Đông-Bắc xuống Tây-Nam): Bể bơi Bách Khoa -> Nhà thi đấu Bách Khoa -> Nhà TC.
//    - Đông-Nam phố Lê Thanh Nghị: Sân vận động Bách Khoa (kèm sân bóng rổ góc Bắc) và cụm KTX A2 – A3.
export const SPORTS_COMPLEX = {
  poolCenter: { x: 123, z: 42 },
  poolSize: { x: 13, z: 8 },
  poolBox: { minX: 116.5, maxX: 129.5, minZ: 38, maxZ: 46 },
  stadiumCenter: { x: 110, z: 53 },
  stadiumSize: { x: 15, z: 13 },
  stadiumBox: { minX: 102.5, maxX: 117.5, minZ: 46.5, maxZ: 59.5 },
  nhaTcCenter: { x: 97, z: 66 },
  nhaTcSize: { x: 13, z: 11 },
  nhaTcBox: { minX: 90.5, maxX: 103.5, minZ: 60.5, maxZ: 71.5 },
  courtCenter: { x: 134, z: 64 },
  courtSize: { x: 12, z: 7.5 },
  footballFieldCenter: { x: 132, z: 80 },
  footballFieldSize: { x: 34, z: 22 },
  ktxA3Center: { x: 150, z: 50 },
  ktxA3Size: { x: 12, z: 4.8 },
  ktxA3Box: { minX: 144, maxX: 156, minZ: 47.6, maxZ: 52.4 },
  ktxA2Center: { x: 153, z: 59 },
  ktxA2Size: { x: 12, z: 4.8 },
  ktxA2Box: { minX: 147, maxX: 159, minZ: 56.6, maxZ: 61.4 },
} as const;

export const TA_QUANG_BUU_GATE = {
  center: { x: 126, z: -68 },
} as const;

export const PARABOL_BUS_STOP = {
  center: { x: -88, z: 7 },
} as const;

export const BIKE_PARKING_SHED = {
  center: { x: -55.0, z: 29.2 },
  size: { x: 14.8, z: 5.0 },
  box: { minX: -62.4, maxX: -47.6, minZ: 26.7, maxZ: 31.7 },
} as const;

/** Hệ thống đầy đủ các bãi đỗ xe ô tô & nhà để xe máy/xe đạp sinh viên trong khuôn viên chính
 *  (đối chiếu 100% lớp `multipolygons [amenity=parking]` trên https://hustmap.com/). */
export const CAMPUS_PARKING_LOTS = {
  /** Bãi xe C1 (fid: 257, 258, 259 — phía Bắc nhà C1, hai bên lối vào Cổng Đại Cồ Việt) */
  c1West: {
    center: { x: -72.5, z: -67.2 },
    size: { x: 14.0, z: 4.8 },
    box: { minX: -79.5, maxX: -65.5, minZ: -69.6, maxZ: -64.8 },
  },
  c1East: {
    center: { x: -43.5, z: -67.2 },
    size: { x: 14.0, z: 4.8 },
    box: { minX: -50.5, maxX: -36.5, minZ: -69.6, maxZ: -64.8 },
  },
  c1NorthLane: {
    center: { x: -43.5, z: -72.4 },
    size: { x: 14.0, z: 2.8 },
    box: { minX: -50.5, maxX: -36.5, minZ: -73.8, maxZ: -71.0 },
  },
  /** Bãi xe C2 (fid: 238 — nhà xe ô tô có mái che ở góc Tây-Bắc khuôn viên, phía Bắc nhà C2) */
  c2Carport: {
    center: { x: -86.2, z: -69.5 },
    size: { x: 10.4, z: 6.4 },
    box: { minX: -91.4, maxX: -81.0, minZ: -72.7, maxZ: -66.3 },
  },
  /** Bãi xe C9 (fid: 222 — bãi đỗ ô tô mặt đất nằm giữa phía Đông nhà C9 và Quảng trường ngã 5) */
  c9Lot: {
    center: { x: -47.8, z: -17.5 },
    size: { x: 6.8, z: 10.0 },
    box: { minX: -51.2, maxX: -44.4, minZ: -22.5, maxZ: -12.5 },
  },
  /** Nhà xe C5 (fid: 171, 172 — 2 nhà để xe máy/xe đạp có mái che ở sân giữa C4–C5 và sân giữa C5–C10) */
  c5NorthShed: {
    center: { x: -12.5, z: -51.5 },
    size: { x: 8.6, z: 2.8 },
    box: { minX: -16.8, maxX: -8.2, minZ: -52.9, maxZ: -50.1 },
  },
  c5SouthShed: {
    center: { x: -12.5, z: -40.5 },
    size: { x: 8.6, z: 2.8 },
    box: { minX: -16.8, maxX: -8.2, minZ: -41.9, maxZ: -39.1 },
  },
  /** Điểm trông giữ xe D7 - D9 (fid: 125 — bãi xe máy sinh viên ngoài trời giữa mặt Nam Thư viện TQB và mặt Bắc nhà D9) */
  d7d9Lot: {
    center: { x: 39.5, z: 54.6 },
    size: { x: 14.4, z: 5.2 },
    box: { minX: 32.3, maxX: 46.7, minZ: 52.0, maxZ: 57.2 },
  },
  /** Sân đỗ xe máy phụ trong lòng cụm chữ U [D3 – D5 – D3-5] (fid: 126) */
  d3d5Courtyard: {
    center: { x: 66.5, z: 15.2 },
    size: { x: 7.6, z: 5.6 },
    box: { minX: 62.7, maxX: 70.3, minZ: 12.4, maxZ: 18.0 },
  },
} as const;

/** Ba khối nhà nối 3 tầng chạm đất C3-4, C4-5, C5-10 liên kết đầu Tây dãy C3 – C4 – C5 – C10 (theo https://hustmap.com/). */
export const C_CONNECTOR_BUILDINGS = [
  {
    code: 'C3-4',
    subtitle: 'NHÀ NỐI C3-4',
    center: { x: -20.5, z: -62.5 },
    size: { x: 4.2, z: 4.6 },
    h: 10.2,
    box: { minX: -22.6, maxX: -18.4, minZ: -64.8, maxZ: -60.2 },
  },
  {
    code: 'C4-5',
    subtitle: 'NHÀ NỐI C4-5',
    center: { x: -20.5, z: -51.5 },
    size: { x: 4.2, z: 4.6 },
    h: 10.2,
    box: { minX: -22.6, maxX: -18.4, minZ: -53.8, maxZ: -49.2 },
  },
  {
    code: 'C5-10',
    subtitle: 'NHÀ NỐI C5-10',
    center: { x: -20.5, z: -40.5 },
    size: { x: 4.2, z: 4.6 },
    h: 10.2,
    box: { minX: -22.6, maxX: -18.4, minZ: -42.8, maxZ: -38.2 },
  },
] as const;

export type LectureBuildingFacing = 's' | 'n' | 'e' | 'w';

export type LectureBuildingSpec = {
  code: string;
  subtitle: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  face: LectureBuildingFacing;
  tone: number;
  rotY?: number;
  box: AABB;
};

// 8. Các dãy giảng đường Khu C (C1B, C3, C3B, C4B, C4, C5, C10, C10b, ITIMS) & Khu D (D2A, D2B, D6, D8 11 tầng, D9, D3, D5, D3-5, D7)
//    Đối chiếu chuẩn https://hustmap.com/:
export const LECTURE_BUILDINGS: LectureBuildingSpec[] = [
  // C1B ở đầu hồi Đông Nhà C1 và C3B ở phía Tây-Bắc Nhà C6
  {
    code: 'C1B',
    subtitle: 'NHÀ C1B',
    x: -27.5,
    z: -56,
    w: 6.5,
    d: 6.5,
    h: 9.6,
    face: 's',
    tone: 1,
    box: { minX: -30.75, maxX: -24.25, minZ: -59.25, maxZ: -52.75 },
  },
  {
    code: 'C3B',
    subtitle: 'NHÀ C3B',
    x: 24,
    z: -66.5,
    w: 7.5,
    d: 7.0,
    h: 9.6,
    face: 's',
    tone: 1,
    box: { minX: 20.25, maxX: 27.75, minZ: -70.0, maxZ: -63.0 },
  },

  // Cụm dãy ngang C3 – C4B – C4 – C5 – C10 – C10b – ITIMS từ Bắc xuống Nam (phía Đông Quảng trường C1)
  {
    code: 'C3',
    subtitle: 'GIẢNG ĐƯỜNG C3',
    x: -12,
    z: -68,
    w: 22,
    d: 6.5,
    h: 10.8,
    face: 's',
    tone: 2,
    box: { minX: -23, maxX: -1, minZ: -71.25, maxZ: -64.75 },
  },
  {
    code: 'C4B',
    subtitle: 'NHÀ C4B',
    x: -7.5,
    z: -62.5,
    w: 11,
    d: 3.4,
    h: 9.2,
    face: 's',
    tone: 0,
    box: { minX: -13, maxX: -2, minZ: -64.2, maxZ: -60.8 },
  },
  {
    code: 'C4',
    subtitle: 'TRƯỜNG HÓA & KHOA HỌC SỰ SỐNG',
    x: -12,
    z: -57,
    w: 22,
    d: 6.5,
    h: 10.8,
    face: 's',
    tone: 0,
    box: { minX: -23, maxX: -1, minZ: -60.25, maxZ: -53.75 },
  },
  {
    code: 'C5',
    subtitle: 'TRƯỜNG VẬT LIỆU · CƠ KHÍ',
    x: -12,
    z: -46,
    w: 22,
    d: 6.5,
    h: 10.8,
    face: 's',
    tone: 1,
    box: { minX: -23, maxX: -1, minZ: -49.25, maxZ: -42.75 },
  },
  {
    code: 'C10',
    subtitle: 'GIẢNG ĐƯỜNG & THÍ NGHIỆM C10',
    x: -12,
    z: -35,
    w: 22,
    d: 6.5,
    h: 10.8,
    face: 's',
    tone: 2,
    box: { minX: -23, maxX: -1, minZ: -38.25, maxZ: -31.75 },
  },
  {
    code: 'C10b',
    subtitle: 'NHÀ C10B',
    x: 8.5,
    z: -35,
    w: 11.0,
    d: 6.2,
    h: 12.8,
    face: 's',
    tone: 1,
    box: { minX: 3.0, maxX: 14.0, minZ: -38.1, maxZ: -31.9 },
  },
  {
    code: 'ITIMS',
    subtitle: 'VIỆN ĐÀO TẠO QUỐC TẾ VỀ KH VẬT LIỆU',
    x: -27.5,
    z: -35,
    w: 7.5,
    d: 7.5,
    h: 10.8,
    face: 'w',
    tone: 0,
    box: { minX: -31.25, maxX: -23.75, minZ: -38.75, maxZ: -31.25 },
  },

  // Cặp nhà D2A (phía Tây) – D2B (phía Đông) ở phía Tây-Bắc Hồ Tiền (đúng thứ tự trên https://hustmap.com/, không có tòa D2 thứ ba)
  {
    code: 'D2A',
    subtitle: 'NHÀ D2A',
    x: -64,
    z: 20,
    w: 15,
    d: 7.0,
    h: 10.2,
    face: 'n',
    tone: 0,
    box: { minX: -71.5, maxX: -56.5, minZ: 16.5, maxZ: 23.5 },
  },
  {
    code: 'D2B',
    subtitle: 'NHÀ D2B',
    x: -44,
    z: 20,
    w: 10.5,
    d: 9.0,
    h: 10.2,
    face: 'n',
    tone: 2,
    box: { minX: -49.25, maxX: -38.75, minZ: 15.5, maxZ: 24.5 },
  },

  // Cụm D6 (3 tầng) – D8 (cao ốc 11 tầng theo https://hustmap.com/ building:levels=11) phía Tây Hồ Tiền
  {
    code: 'D6',
    subtitle: 'GIẢNG ĐƯỜNG D6',
    x: -46,
    z: 38,
    w: 18,
    d: 7.5,
    h: 10.2,
    face: 's',
    tone: 3,
    box: { minX: -55, maxX: -37, minZ: 34.25, maxZ: 41.75 },
  },
  {
    code: 'D8',
    subtitle: 'TÒA NHÀ D8 (11 TẦNG)',
    x: -46,
    z: 54,
    w: 18,
    d: 8.2,
    h: 30.8,
    face: 'n',
    tone: 2,
    box: { minX: -55, maxX: -37, minZ: 49.9, maxZ: 58.1 },
  },

  // Nhà D9 ngay phía Nam Thư viện Tạ Quang Bửu (5 tầng sơn trắng, cạnh Điểm trông giữ xe D7 - D9)
  {
    code: 'D9',
    subtitle: 'GIẢNG ĐƯỜNG D9',
    x: 41,
    z: 63,
    w: 22,
    d: 7.5,
    h: 15.5,
    face: 'n',
    tone: 0,
    box: { minX: 30, maxX: 52, minZ: 59.25, maxZ: 66.75 },
  },

  // Cụm D3 – D5 – D3-5 & D7 (5 tầng sơn trắng hiện đại theo tham-khao/NEW/):
  // - D3 chạy sát trục đường nhánh trái chiều đi ra Cổng Trần Đại Nghĩa, kết thúc đúng điểm nhập làn (x = 59.5)
  // - D5, D3-5, D7 xếp tiếp nối về phía Nam dọc trục rẽ trái (x = 56.2), nằm giữa Thư viện và Nhà để xe D3 - D5
  {
    code: 'D3',
    subtitle: 'GIẢNG ĐƯỜNG D3',
    x: 68.5,
    z: 6.4,
    w: 18,
    d: 6.8,
    h: 15.5,
    face: 'n',
    tone: 0,
    box: { minX: 59.5, maxX: 77.5, minZ: 3.0, maxZ: 9.8 },
  },
  {
    code: 'D5',
    subtitle: 'GIẢNG ĐƯỜNG D5',
    x: 67.0,
    z: 23.8,
    w: 15,
    d: 6.6,
    h: 15.5,
    face: 'n',
    tone: 0,
    box: { minX: 59.5, maxX: 74.5, minZ: 20.5, maxZ: 27.1 },
  },
  {
    code: 'D3-5',
    subtitle: 'KHỐI GIẢNG ĐƯỜNG D3-5',
    x: 75.5,
    z: 18.45,
    w: 4.0,
    d: 17.3,
    h: 15.5,
    face: 'w',
    tone: 0,
    box: { minX: 73.5, maxX: 77.5, minZ: 9.8, maxZ: 27.1 },
  },
  {
    code: 'D7',
    subtitle: 'GIẢNG ĐƯỜNG D7',
    x: 67.5,
    z: 41.9,
    w: 16,
    d: 6.8,
    h: 15.5,
    face: 'n',
    tone: 0,
    box: { minX: 59.5, maxX: 75.5, minZ: 38.5, maxZ: 45.3 },
  },
];

export const D4_BUILDING = {
  center: { x: -78, z: 44 },
  box: { minX: -87, maxX: -69, minZ: 34, maxZ: 54 },
} as const;

/** Các khối nhà phụ trợ thuộc trường (building=university) quanh C2, C1–C3 và dãy dịch vụ sinh viên bờ Tây Hồ Tiền
 *  trên Bản đồ Số https://hustmap.com/ (fid: 237, 224, 93, 266–270). */
export const CAMPUS_ANNEX_BLOCKS = [
  {
    id: 'c2-north-annex',
    label: 'Khối phụ trợ Bắc C2',
    center: { x: -86.6, z: -53.0 },
    size: { x: 5.6, z: 8.0 },
    h: 6.8,
    box: { minX: -89.4, maxX: -83.8, minZ: -57.0, maxZ: -49.0 },
  },
  {
    id: 'c2-south-annex',
    label: 'Khối phụ trợ Nam C2',
    center: { x: -89.8, z: -20.5 },
    size: { x: 5.2, z: 5.4 },
    h: 6.4,
    box: { minX: -92.4, maxX: -87.2, minZ: -23.2, maxZ: -17.8 },
  },
  {
    id: 'c1-east-annex',
    label: 'Nhà phụ trợ C1 – C3',
    center: { x: -27.5, z: -68.0 },
    size: { x: 6.2, z: 5.2 },
    h: 6.8,
    box: { minX: -30.6, maxX: -24.4, minZ: -70.6, maxZ: -65.4 },
  },
  {
    id: 'd468-service-north',
    label: 'Kiot dịch vụ SV D4-6',
    center: { x: -35.5, z: 28.0 },
    size: { x: 5.4, z: 3.8 },
    h: 4.2,
    box: { minX: -38.2, maxX: -32.8, minZ: 26.1, maxZ: 29.9 },
  },
  {
    id: 'd468-service-south',
    label: 'Nhà dịch vụ SV D6-8',
    center: { x: -32.5, z: 45.5 },
    size: { x: 4.6, z: 4.6 },
    h: 4.2,
    box: { minX: -34.8, maxX: -30.2, minZ: 43.2, maxZ: 47.8 },
  },
] as const;

/** Tiện ích giao thông công cộng & sinh viên sát rìa khuôn viên chính theo https://hustmap.com/:
 *  - Trạm buýt Trần Đại Nghĩa ("Đại học Bách Khoa" · Tuyến 31)
 *  - Trạm xe đạp công cộng TNGo (75 Trần Đại Nghĩa)
 *  - Máy bán nước tự động Skyline Vmac (tại Thư viện TQB & Nhà D4) */
export const CAMPUS_AMENITIES = {
  tdnBusStop: { x: 93.8, z: -61.5 },
  tngoStation: { x: 93.8, z: -21.0 },
  vmacLibrary: { x: 31.2, z: 24.4 },
  vmacD4: { x: -73.8, z: 39.8 },
} as const;

// Ghế gỗ dọc bờ Hồ Tiền (quay mặt ra hồ) + ghế quảng trường C1.
// Ghế bờ đông đặt sát bờ kè (x = 22,3) để chừa lối đi bộ ven hồ (x = 24) thông thoáng.
export const LAKE_BENCHES: Vec2[] = [
  { x: -27.5, z: 34 }, { x: -27.5, z: 66 },
  { x: 22.3, z: 24 }, { x: 22.3, z: 72 },
];

export const C1_BENCHES: Vec2[] = [
  { x: -73.2, z: -29.8 }, { x: -42.8, z: -44.2 },
];

// Liễu rủ quanh Hồ Tiền — đặt NGOÀI bờ kè hình chữ nhật (bờ tây/đông/bắc/nam).
// Cây bờ đông đặt sát bờ kè (x = 22,2) để không chắn lối đi bộ ven hồ (x = 24).
export const LAKE_WILLOWS: Vec2[] = [
  { x: -27.5, z: 18 }, { x: -27.5, z: 54 }, { x: -27.5, z: 80 },
  { x: 22.2, z: 14 }, { x: 22.2, z: 76 },
  { x: -14, z: 1.5 }, { x: 8.4, z: 3.0 },
  { x: -10, z: 94.0 }, { x: 10, z: 94.0 },
];

// --- Phòng học mô phỏng — Bước 5 --------------------------------------------
// Phòng KHÔNG nối vật lý với nhà C1: vào/ra bằng fade + chuyển mode
// (playerState.inClassroom). Tọa độ CỤC BỘ của phòng 9 × 6 m, gốc (0,0) giữa
// phòng; bắc = -Z (tường có bảng đen), nam = +Z (cửa vào). Avatar cao 1,7 m:
// mặt bàn ~0,75 m, mặt ghế ~0,45 m.

export const CLASSROOM_DOOR = {
  /** ngay chân bậc tam cấp C1, trước biển nhiệm vụ (đứng được: ngoài collider bậc) */
  pos: { x: -58, z: -45.5 },
  triggerRadius: 2.5,
} as const;

/** Cửa chính Giảng đường Hán ngữ HSK tại Tòa C7 (sảnh chính nhánh giữa chữ E hướng Tây -X) */
export const C7_DOOR = {
  pos: { x: 57.8, z: -32.8 },
  triggerRadius: 3.6,
} as const;

export const CLASSROOM = {
  bounds: { minX: -4.1, maxX: 4.1, minZ: -2.6, maxZ: 2.6 },
  spawn: { x: 0, z: 1 },
  board: { x: 0, z: -2.6 },
  desks: [
    { x: -2.2, z: 0.6 },
    { x: 0, z: 0.6 },
    { x: 2.2, z: 0.6 },
  ],
  npc: { x: 2.2, z: -2 },
  notebook: { x: -2.2, z: 0.6 },
  homework: { x: -2.2, z: 0.6 },
} as const;

// --- Sảnh tầng 1 Thư viện Tạ Quang Bửu (LibraryLobby) ------------------------
export const LIBRARY_DOOR = {
  /** Dưới sảnh cột tròn phía Bắc Thư viện Tạ Quang Bửu (ngoài collider vách kính khối đế minZ 23,5) */
  pos: { x: 38, z: 22.4 },
  triggerRadius: 3.8,
} as const;

export const LIBRARY_LOBBY = {
  /** Biên tổng thể cho đại sảnh thông tầng 5 tầng + Phòng mượn sách + 11 phòng đọc Tầng 4–5 + Tầng 6–7 + Sân thượng Tầng 10 (studywithhuster.cyou). */
  bounds: { minX: -35.2, maxX: 35.2, minZ: -38.0, maxZ: 27.2 },
  spawn: { x: 0, z: 2.4 },
  statue: { x: 0, z: -2.1 },
  vocabBoard: { x: 3.6, z: -0.6 },
  infoDesk: { x: -3.6, z: -0.6 },
  /** Hai bàn đọc tự học ở hai cánh Tây/Đông phía nam sảnh (PR8), chừa lối chính giữa rộng 2,94 m từ cửa vào tới tượng GS. Tạ Quang Bửu. */
  studyTables: [
    {
      tableId: 'tqb-1f-t1',
      label: 'Bàn đọc Tây 1',
      x: -2.15,
      z: 1.75,
      width: 1.36,
      depth: 0.76,
      height: 0.75,
      box: { minX: -2.83, maxX: -1.47, minZ: 1.37, maxZ: 2.13 },
    },
    {
      tableId: 'tqb-1f-t2',
      label: 'Bàn đọc Đông 2',
      x: 2.15,
      z: 1.75,
      width: 1.36,
      depth: 0.76,
      height: 0.75,
      box: { minX: 1.47, maxX: 2.83, minZ: 1.37, maxZ: 2.13 },
    },
  ],
} as const;

// --- Đời sống sinh viên & Tương tác ngoài sân trường (HUSTVerse Engagement) ---

export type OutdoorBenchSpec = {
  id: string;
  x: number;
  z: number;
  rotY: number;
  seatPos: Vec2;
  standPos: Vec2;
  seatFacing: number;
  seatYaw: number;
  label: string;
  zoneTag: string;
  isExtraMesh?: boolean;
};

/** 6 ghế đá sân trường không có NPC ngồi cố định, cho phép người chơi bấm E ngồi nghỉ & chụp ảnh. */
export const OUTDOOR_SITTABLE_BENCHES: readonly OutdoorBenchSpec[] = [
  {
    id: 'bench-lake-east-1',
    x: 22.3,
    z: 58.5,
    rotY: -Math.PI / 2,
    seatPos: { x: 22.18, z: 58.5 },
    standPos: { x: 23.45, z: 58.5 },
    seatFacing: -Math.PI / 2,
    seatYaw: Math.PI / 2,
    label: 'Ghế đá Ngắm Sen Hồ Tiền',
    zoneTag: 'lake',
    isExtraMesh: true,
  },
  {
    id: 'bench-lake-east-2',
    x: 22.3,
    z: 72.0,
    rotY: -Math.PI / 2,
    seatPos: { x: 22.18, z: 72.0 },
    standPos: { x: 23.45, z: 72.0 },
    seatFacing: -Math.PI / 2,
    seatYaw: Math.PI / 2,
    label: 'Ghế đá Nam Hồ Tiền',
    zoneTag: 'lake',
  },
  {
    id: 'bench-c1-west',
    x: -73.2,
    z: -29.8,
    rotY: 0,
    seatPos: { x: -73.2, z: -29.68 },
    standPos: { x: -73.2, z: -28.55 },
    seatFacing: 0,
    seatYaw: Math.PI,
    label: 'Ghế đá Quảng trường C1 (Tây)',
    zoneTag: 'c1',
  },
  {
    id: 'bench-love-road-0',
    x: -38.0,
    z: -10.9,
    rotY: 0,
    seatPos: { x: -38.0, z: -10.78 },
    standPos: { x: -38.0, z: -9.7 },
    seatFacing: 0,
    seatYaw: Math.PI,
    label: 'Ghế đá Đường Tình Yêu (Ngã 5)',
    zoneTag: 'c9',
  },
  {
    id: 'bench-love-road-1',
    x: -22.0,
    z: -10.9,
    rotY: 0,
    seatPos: { x: -22.0, z: -10.78 },
    standPos: { x: -22.0, z: -9.7 },
    seatFacing: 0,
    seatYaw: Math.PI,
    label: 'Ghế đá Đường Tình Yêu (Giữa)',
    zoneTag: 'c9',
  },
  {
    id: 'bench-love-road-2',
    x: 16.0,
    z: -10.9,
    rotY: 0,
    seatPos: { x: 16.0, z: -10.78 },
    standPos: { x: 16.0, z: -9.7 },
    seatFacing: 0,
    seatYaw: Math.PI,
    label: 'Ghế đá Đường Tình Yêu (Đông)',
    zoneTag: 'lake',
  },
] as const;

export type DrinkStallSpec = {
  id: string;
  x: number;
  z: number;
  rotY: number;
  drinkId: 'iced-tea' | 'coffee';
  label: string;
  promptLabel: string;
  zoneTag: string;
};

/** Các quầy Trà chanh / Cà phê sinh viên Bách Khoa cầm tay trong khuôn viên. */
export const CAMPUS_DRINK_STALLS: readonly DrinkStallSpec[] = [
  {
    id: 'stall-iced-tea',
    x: -74.0,
    z: 2.2,
    rotY: Math.PI,
    drinkId: 'iced-tea',
    label: 'Quầy Trà đá & Trà chanh Bách Khoa',
    promptLabel: 'E — Gọi cốc Trà chanh đá Bách Khoa (cầm tay)',
    zoneTag: 'parabol',
  },
  {
    id: 'stall-alumni-coffee',
    x: 28.2,
    z: 58.5,
    rotY: -Math.PI / 2,
    drinkId: 'coffee',
    label: 'Xe Cà phê Hồ Tiền Bách Khoa',
    promptLabel: 'E — Gọi ly Cà phê nâu đá Hồ Tiền (cầm tay)',
    zoneTag: 'lake',
  },
] as const;

export type CampusMemoryBoardSpec = {
  id: 'c1-board' | 'tien-lake-board' | 'library-board';
  x: number;
  z: number;
  rotY: number;
  label: string;
  promptLabel: string;
  zoneTag: string;
};

/** 3 Bảng Lưu bút Sân trường đặt tại Quảng trường C1, Bờ Hồ Tiền & Tiền sảnh Thư viện TQB. */
export const CAMPUS_MEMORY_BOARDS: readonly CampusMemoryBoardSpec[] = [
  {
    id: 'c1-board',
    x: -64.8,
    z: -41.5,
    rotY: 0,
    label: 'Bảng Lưu bút Quảng trường C1',
    promptLabel: 'E — Đọc & Ghim Lưu bút Quảng trường C1',
    zoneTag: 'c1',
  },
  {
    id: 'tien-lake-board',
    x: 21.8,
    z: 64.0,
    rotY: Math.PI / 2,
    label: 'Bảng Lưu bút Bờ Hồ Tiền',
    promptLabel: 'E — Đọc & Ghim Lưu bút Bờ Hồ Tiền',
    zoneTag: 'lake',
  },
  {
    id: 'library-board',
    x: 32.2,
    z: 11.4,
    rotY: Math.PI,
    label: 'Bảng Lưu bút Thư viện Tạ Quang Bửu',
    promptLabel: 'E — Đọc & Ghim Lưu bút Thư viện TQB',
    zoneTag: 'library',
  },
] as const;

/** Thông số sân bóng đá mini-game tương tác tại SVĐ Bách Khoa. */
export const CAMPUS_FOOTBALL_PITCH = {
  center: { x: 132, z: 80 },
  halfW: 15.6,
  halfD: 9.8,
  westGoalX: 117.6,
  eastGoalX: 146.4,
  goalHalfZ: 2.55,
  goalHeight: 2.35,
  kickInteractRadius: 2.35,
  dribbleRadius: 0.95,
} as const;
