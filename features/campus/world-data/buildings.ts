// ---------------------------------------------------------------------------
// features/campus/world-data/buildings.ts — Metadata vị trí, kích thước & hình học
// của toàn bộ công trình, cổng trường, hồ nước và không gian nội thất ĐHBK Hà Nội.
// Đối chiếu theo Bản đồ Khuôn viên (docs/khuon-vien-truong.png) & bộ ảnh tham-khao/.
// ---------------------------------------------------------------------------

import type { AABB, Vec2 } from './bounds';

// --- Landmark chính ---------------------------------------------------------

export const PARABOL_GATE = {
  center: { x: -88, z: 10 },
  /** chiều rộng thông thủy giữa hai chân (m) — theo báo chí 11/2026, chưa có bản vẽ chính thức */
  clearWidth: 8,
  /** chiều cao đỉnh vòm (m) — theo báo chí 11/2026 */
  height: 12.5,
  legThickness: 1.5, // độ dày chân trụ theo trục Z
  depth: 1.2, // độ rộng dải băng vòm (theo mặt phẳng vòm) — Bước 3: dải phẳng, không còn ống tròn
  ribbonThickness: 0.6, // độ dày dải băng theo trục X (phương đường đi)
  /** chân trụ: hai AABB kẹp lối đi (lối đi z = 6..14, rộng 8 m) */
  legAabbs: [
    { minX: -89.2, maxX: -86.8, minZ: 3.5, maxZ: 6 },
    { minX: -89.2, maxX: -86.8, minZ: 14, maxZ: 16.5 },
  ],
  /** nhà gác trắng phía bắc cổng (ƯỚC LƯỢNG vị trí theo ảnh: bên trái cổng) */
  guardHouse: { minX: -90, maxX: -86, minZ: -0.5, maxZ: 2.5 },
} as const;

export const C1 = {
  center: { x: -58, z: -56 },
  size: { x: 48, z: 14 }, // khối nhà ngang, mặt tiền dài
  floors: 4, // xác nhận: bài HUST "70 năm"
  floorHeight: 3.6,
  waves: 9, // BẮT BUỘC đếm đủ 9 gợn sóng mái
  waveAmplitude: 0.5, // Bước 3: sóng NÔNG theo ảnh (blockout 1,2 là quá cao)
  plaza: { minX: -82, maxX: -34, minZ: -46, maxZ: -28 },
  lipaTrees: [
    { x: -72, z: -40 },
    { x: -44, z: -40 },
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
  center: { x: 38, z: 36.5 },
  size: { x: 26, z: 13.5 }, // Mở rộng mặt tiền tháp 3 nhịp lên 26 m (cộng mái đua hai cánh đạt ~27.6 m) theo 5 ảnh tham-khao/thu-vien/
  floors: 10, // xác nhận: HUST, ~37.000 m²
  floorHeight: 3.2,
  /** đồng hồ ở mặt BẮC của scene (−Z), NGAY TRÊN mái hiên lối vào mới (mái y 6,0) —
   *  dưới mái đế (y 10,7). Bán kính 1,3 m. */
  clock: { x: 38, y: 7.3, z: 23.9, radius: 1.3 },
  plaza: { minX: 23, maxX: 52.5, minZ: 10, maxZ: 56 }, // Mở rộng sân gạch đỏ-nâu ôm trọn 2 cánh mới của Thư viện
  /** Tiền cảnh phía bắc (theo tham-khao/thu-vien/): lối đi đỏ + sân xám + chữ HUST. */
  forecourt: {
    walk: { minX: 24, maxX: 33, minZ: 12, maxZ: 16 },
    grayYard: { minX: 31, maxX: 47, minZ: 12, maxZ: 16 },
    hust: { x: 38, z: 14 },
  },
} as const;

/** Chữ "HUST" đỏ khối 3D trước sảnh thư viện (đợt 4, theo tư liệu). */
export const HUST_SIGN = {
  center: { x: 38, z: 14 },
  plinth: { minX: 35.2, maxX: 40.8, minZ: 13.4, maxZ: 14.6 },
} as const;

/** Hồ Tiền — HÌNH CHỮ NHẬT, trục dài bắc–nam, dài gấp đôi rộng (khóa bằng vệ
 *  tinh, satellite-and-c9 §1). Bản blockout ellipse rx 40 × rz 30 là SAI.
 *  45 × 88 m ≈ 3.960 m², tỉ lệ 88/45 ≈ 1,96 ≈ 2:1, khớp số liệu ~4.000 m² (báo cáo 2010). */
export const LAKE = {
  center: { x: -2, z: 40 },
  halfW: 22.5, // nửa chiều rộng (trục X, đông–tây): hồ rộng 45 m
  halfL: 44, // nửa chiều dài (trục Z, bắc–nam): hồ dài 88 m
  waterY: 0.05,
} as const;

/** Bờ kè đá hộc quanh hồ (4 dải, rộng 1,2 m, ôm đúng mép nước). Collider riêng
 *  cho bờ kè; mặt nước chặn bằng hình chữ nhật hồ (pointInLake). */
export const LAKE_BANK: AABB[] = [
  { minX: -25.1, maxX: -23.9, minZ: -4, maxZ: 84 }, // bờ tây
  { minX: 19.9, maxX: 21.1, minZ: -4, maxZ: 84 }, // bờ đông
  { minX: -24.5, maxX: 20.5, minZ: -4.6, maxZ: -3.4 }, // bờ bắc
  { minX: -24.5, maxX: 20.5, minZ: 83.4, maxZ: 84.6 }, // bờ nam
];

export const C9 = {
  center: { x: -42, z: -2 },
  size: { x: 20, z: 12 },
  floors: 4, // ƯỚC LƯỢNG — số tầng nhà C9 chưa xác minh (xem campus-reference §2.5)
  floorHeight: 3.4,
  /** Cầu thang bộ NGOÀI TRỜI zic-zac ở mặt ĐÔNG nhà (theo ảnh: bê tông trắng,
   *  lan can kim loại đỏ, 4–5 đợt — satellite-and-c9 §3). Đợt sửa kiến trúc
   *  CHỐT 4 vế × 3,4 m (mỗi vế lên đúng một tầng, chiếu nghỉ trùng cao độ
   *  sàn tầng — 5 vế × 2,72 m cũ làm chiếu nghỉ lệch 0,68 m so với sàn tầng,
   *  cửa lơ lửng; xem C9Building.tsx). Thang CHỈ LÀ HÌNH ẢNH: avatar đi ở
   *  y = 0, engine này không có hệ leo thang — không tự bịa collider dốc.
   *  Số tầng vẫn chưa xác minh nên ghi rõ là theo ảnh, không bịa thêm tầng.
   *  Thang ở mặt ngoài, không chắn lối đi chính (đường ven hồ cách mép
   *  thang ~1 m). */
  stairs: {
    face: 'east' as const,
    flights: 4,
    /** AABB bao toàn bộ thang (kể cả chiếu nghỉ hai đầu) */
    box: { minX: -32.6, maxX: -29.6, minZ: -6.8, maxZ: 2.8 },
  },
} as const;

/** Khối đá trắng (reference-visual §6): tảng đá xám-trắng, chữ đen 2 dòng,
 *  đặt trên thảm cỏ viền bê tông ở góc tây quảng trường C1. Vị trí tương đối
 *  đá ↔ đài phun nước CHƯA xác minh — đặt ở đây là ƯỚC LƯỢNG (gần tháp hoa
 *  gió C1 như trong ảnh), không chặn đường đi. */
export const WHITE_ROCK = {
  center: { x: -78, z: -31 },
  box: { minX: -80.8, maxX: -75.2, minZ: -32.1, maxZ: -29.9 },
} as const;

export const C1_FOUNTAIN = {
  center: { x: -78, z: -36.5 },
} as const;

export const DAI_CO_VIET_GATE = {
  center: { x: -58, z: -73.5 },
} as const;

/** Quảng trường Trần Đại Nghĩa (reference-visual §7): sân xanh ngọc + vạch
 *  trắng kiểu mạch điện. Đặt cạnh cổng Trần Đại Nghĩa (phía đông). Kích thước
 *  sân và họa tiết mạch cụ thể CHƯA xác minh (chỉ có ảnh cận cảnh biển tên) —
 *  sân vẽ theo ước lượng, biển đồng dựng đúng chữ đọc được trong ảnh. */
export const TDN_SQUARE = { minX: 72, maxX: 92, minZ: -18, maxZ: 6 } as const;

/** Tượng đài trước C2 (reference-visual §5): CHỈ dựng bia cẩm thạch trắng +
 *  chữ khắc đỏ — ảnh hiện có chỉ thấy mặt bia. TUYỆT ĐỐI KHÔNG dựng pho tượng
 *  "mũ cối trên sách mở" (chưa có ảnh toàn cảnh). Chỉ tái hiện dòng ngày tháng
 *  đã đọc được trong ảnh; toàn văn lời khắc CHƯA xác minh nên không bịa chữ. */
export const MONUMENT = {
  center: { x: 82, z: -14 },
  box: { minX: 80.7, maxX: 83.3, minZ: -15.2, maxZ: -12.8 },
  /** biển đồng vàng nghiêng, đặt ở mép tây quảng trường */
  sign: { x: 74, z: -14, box: { minX: 73, maxX: 75, minZ: -15, maxZ: -13 } },
} as const;

export const TRAN_DAI_NGHIA_GATE = { center: { x: 92, z: -6 } } as const;

// --- Quy hoạch toàn bộ khuôn viên theo Bản đồ Bách Khoa (docs/khuon-vien-truong.png) ---
// 1. Nhà C2: nằm dọc Bắc–Nam ở phía Tây vườn hoa C1, ngay phía Bắc nhà C9.
export const C2_BUILDING = {
  center: { x: -86, z: -22 },
  size: { x: 7.5, z: 15 },
  box: { minX: -89.75, maxX: -82.25, minZ: -29.5, maxZ: -14.5 },
} as const;

// 2. Cụm nhà C6 – C7 – C8: xếp 3 dãy ngang từ Bắc xuống Nam ở phía Đông dãy C3–C4–C5–C10,
// sát phía Tây đường Trần Đại Nghĩa (C6: Viện Cơ khí động lực, C7: Tổ hợp 9 tầng chữ E theo tham-khao/c7/, C8).
export const C6_BUILDING = {
  center: { x: 46, z: -64 },
  size: { x: 22, z: 7.5 },
  floors: 5,
  floorHeight: 3.2,
  box: { minX: 35, maxX: 57, minZ: -67.75, maxZ: -60.25 },
} as const;

export const C7_BUILDING = {
  center: { x: 46, z: -46 },
  size: { x: 28, z: 15.5 },
  floors: 9,
  floorHeight: 3.1,
  box: { minX: 32, maxX: 60, minZ: -53.75, maxZ: -38.25 },
} as const;

export const C8_BUILDING = {
  center: { x: 46, z: -28 },
  size: { x: 22, z: 7.5 },
  floors: 5,
  floorHeight: 3.2,
  box: { minX: 35, maxX: 57, minZ: -31.75, maxZ: -24.25 },
} as const;

// 3. Khối nhà phía Bắc Hồ Tiền (Trung tâm Hợp tác Việt – Đức / Thủy Tạ bờ Bắc Hồ Tiền).
export const VDZ_CENTER = {
  center: { x: -2, z: -9.8 },
  size: { x: 11, z: 3.4 },
  floors: 2,
  floorHeight: 3.3,
  box: { minX: -7.5, maxX: 3.5, minZ: -11.5, maxZ: -8.1 },
} as const;

// 4. Nhà B1 (Trường Công nghệ Thông tin & Truyền thông — SoICT): tòa nhà góc cong giật cấp 7–8 tầng
// nằm phía Đông đường Trần Đại Nghĩa, ngay phía Nam khu KTX (theo tham-khao/b1-soict/).
export const SOICT_B1 = {
  center: { x: 112, z: 14 },
  size: { x: 22, z: 14 },
  floors: 8,
  floorHeight: 3.2,
  box: { minX: 101, maxX: 123, minZ: 7, maxZ: 21 },
} as const;

// 5. Cụm A17, H1, H3, Nhà T ở phía Đông-Nam Nhà B1 (theo đúng khuon-vien-truong.png).
export const EAST_CAMPUS_BLOCKS = {
  a17: { center: { x: 134, z: 18 }, size: { x: 9, z: 6 }, box: { minX: 129.5, maxX: 138.5, minZ: 15, maxZ: 21 } },
  h1: { center: { x: 134, z: 29 }, size: { x: 11, z: 5.5 }, box: { minX: 128.5, maxX: 139.5, minZ: 26.25, maxZ: 31.75 } },
  h3: { center: { x: 144, z: 38 }, size: { x: 9, z: 5 }, box: { minX: 139.5, maxX: 148.5, minZ: 35.5, maxZ: 40.5 } },
  nhaT: { center: { x: 156, z: 24 }, size: { x: 11, z: 22 }, box: { minX: 150.5, maxX: 161.5, minZ: 13, maxZ: 35 } },
} as const;

// 6. Khu Ký túc xá Bách Khoa (B3–B13, Văn phòng Hội Sinh viên P101 KTX B8, Trung tâm QL KTX B9,
// Nhà ăn, Sân bóng KTX) nằm phía Đông đường Trần Đại Nghĩa, chia 2 bên đường Tạ Quang Bửu.
export const DORM_COMPLEX = {
  b6Center: { x: 104, z: -56 },
  b6Size: { x: 13, z: 5.8 },
  b6Box: { minX: 97.5, maxX: 110.5, minZ: -58.9, maxZ: -53.1 },
  b7Center: { x: 104, z: -45 },
  b7Size: { x: 13, z: 5.8 },
  b7Box: { minX: 97.5, maxX: 110.5, minZ: -47.9, maxZ: -42.1 },
  b7bisCenter: { x: 104, z: -34 },
  b7bisSize: { x: 13, z: 5.8 },
  b7bisBox: { minX: 97.5, maxX: 110.5, minZ: -36.9, maxZ: -31.1 },
  b8Center: { x: 104, z: -22 },
  b8Size: { x: 13, z: 6.2 },
  b8Box: { minX: 97.5, maxX: 110.5, minZ: -25.1, maxZ: -18.9 },
  b5Center: { x: 119, z: -56 },
  b5Size: { x: 9, z: 5.8 },
  b5Box: { minX: 114.5, maxX: 123.5, minZ: -58.9, maxZ: -53.1 },
  b9Center: { x: 119, z: -45 },
  b9Size: { x: 9, z: 5.8 },
  b9Box: { minX: 114.5, maxX: 123.5, minZ: -47.9, maxZ: -42.1 },
  dormPitchCenter: { x: 119, z: -33 },
  dormPitchSize: { x: 10, z: 8 },
  b13Center: { x: 139, z: -58 },
  b13Size: { x: 13, z: 5.8 },
  b13Box: { minX: 132.5, maxX: 145.5, minZ: -60.9, maxZ: -55.1 },
  canteenCenter: { x: 139, z: -47 },
  canteenSize: { x: 12, z: 6.2 },
  canteenBox: { minX: 133, maxX: 145, minZ: -50.1, maxZ: -43.9 },
  b3Center: { x: 139, z: -36 },
  b3Size: { x: 13, z: 5.8 },
  b3Box: { minX: 132.5, maxX: 145.5, minZ: -38.9, maxZ: -33.1 },
  b10Center: { x: 139, z: -24 },
  b10Size: { x: 13, z: 5.8 },
  b10Box: { minX: 132.5, maxX: 145.5, minZ: -26.9, maxZ: -21.1 },
  b4Center: { x: 153, z: -41 },
  b4Size: { x: 9, z: 5.8 },
  b4Box: { minX: 148.5, maxX: 157.5, minZ: -43.9, maxZ: -38.1 },
} as const;

// 7. Khu Thể chất (Nhà thi đấu TC, Bể bơi Bách Khoa, Khán đài đỏ, Sân vận động Bóng đá Bách Khoa,
// KTX Lào) nằm dọc đường Lê Thanh Nghị ở phía Đông-Nam (theo đúng khuon-vien-truong.png).
export const SPORTS_COMPLEX = {
  stadiumCenter: { x: 104, z: 64 },
  stadiumSize: { x: 16, z: 15 },
  stadiumBox: { minX: 96, maxX: 112, minZ: 56.5, maxZ: 71.5 },
  poolCenter: { x: 120, z: 48 },
  poolSize: { x: 15, z: 8.5 },
  poolBox: { minX: 112.5, maxX: 127.5, minZ: 43.75, maxZ: 52.25 },
  courtCenter: { x: 114, z: 57 },
  courtSize: { x: 14, z: 9 },
  footballFieldCenter: { x: 132, z: 78 },
  footballFieldSize: { x: 34, z: 22 },
  ktxLaoCenter: { x: 152, z: 52 },
  ktxLaoSize: { x: 13, z: 6.5 },
  ktxLaoBox: { minX: 145.5, maxX: 158.5, minZ: 48.75, maxZ: 55.25 },
} as const;

export const TA_QUANG_BUU_GATE = {
  center: { x: 126, z: -68 },
} as const;

export const PARABOL_BUS_STOP = {
  center: { x: -88, z: 23 },
} as const;

export const BIKE_PARKING_SHED = {
  center: { x: -64, z: 30 },
} as const;

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

// 8. Các dãy giảng đường Khu C (C3–C5, C10) & Khu D (D2, D2a, D2b, D6, D8, D9, D3, D5, D3-5, D7)
export const LECTURE_BUILDINGS: LectureBuildingSpec[] = [
  // Cụm 4 dãy ngang C3 – C4 – C5 – C10 từ Bắc xuống Nam (phía Đông vườn hoa C1)
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
    code: 'C4',
    subtitle: 'VIỆN KT HÓA HỌC & CN SINH - THỰC PHẨM',
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
    subtitle: 'VIỆN KH&KT VẬT LIỆU · DỆT MAY',
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
    subtitle: 'VIỆN CƠ KHÍ · VLKT · MÔI TRƯỜNG',
    x: -12,
    z: -35,
    w: 22,
    d: 6.5,
    h: 10.8,
    face: 's',
    tone: 2,
    box: { minX: -23, maxX: -1, minZ: -38.25, maxZ: -31.75 },
  },

  // Cụm D2 – D2a – D2b phía Tây Hồ Tiền (giữa Nhà C9 và cụm D4/D6 theo đúng sơ đồ khuôn viên)
  {
    code: 'D2',
    subtitle: 'GIẢNG ĐƯỜNG D2',
    x: -46,
    z: 24,
    w: 16,
    d: 6.5,
    h: 10.2,
    face: 'n',
    tone: 1,
    box: { minX: -54, maxX: -38, minZ: 20.75, maxZ: 27.25 },
  },
  {
    code: 'D2a',
    subtitle: 'GIẢNG ĐƯỜNG D2A',
    x: -64,
    z: 22,
    w: 11,
    d: 5.5,
    h: 9.2,
    face: 'n',
    tone: 0,
    box: { minX: -69.5, maxX: -58.5, minZ: 19.25, maxZ: 24.75 },
  },
  {
    code: 'D2b',
    subtitle: 'GIẢNG ĐƯỜNG D2B',
    x: -79,
    z: 22,
    w: 11,
    d: 5.5,
    h: 9.2,
    face: 'n',
    tone: 2,
    box: { minX: -84.5, maxX: -73.5, minZ: 19.25, maxZ: 24.75 },
  },

  // Cụm D6 – D8 phía Tây Hồ Tiền (giữa D4 và bờ Tây Hồ Tiền)
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
    subtitle: 'GIẢNG ĐƯỜNG D8',
    x: -46,
    z: 54,
    w: 18,
    d: 7.5,
    h: 10.2,
    face: 'n',
    tone: 2,
    box: { minX: -55, maxX: -37, minZ: 50.25, maxZ: 57.75 },
  },

  // Nhà D9 ngay phía Nam Thư viện Tạ Quang Bửu
  {
    code: 'D9',
    subtitle: 'GIẢNG ĐƯỜNG D9',
    x: 38,
    z: 63,
    w: 18,
    d: 7.5,
    h: 10.8,
    face: 'n',
    tone: 1,
    box: { minX: 29, maxX: 47, minZ: 59.25, maxZ: 66.75 },
  },

  // Cụm D3 – D5 – D3-5 & D7 phía Đông Thư viện Tạ Quang Bửu
  {
    code: 'D3',
    subtitle: 'VIỆN TOÁN ỨNG DỤNG & TIN HỌC',
    x: 64,
    z: 18,
    w: 14,
    d: 7,
    h: 10.5,
    face: 's',
    tone: 3,
    box: { minX: 57, maxX: 71, minZ: 14.5, maxZ: 21.5 },
  },
  {
    code: 'D5',
    subtitle: 'GIẢNG ĐƯỜNG D5',
    x: 64,
    z: 32,
    w: 14,
    d: 7,
    h: 10.5,
    face: 'n',
    tone: 0,
    box: { minX: 57, maxX: 71, minZ: 28.5, maxZ: 35.5 },
  },
  {
    code: 'D3-5',
    subtitle: 'KHỐI GIẢNG ĐƯỜNG D3-5',
    x: 75,
    z: 25,
    w: 6.5,
    d: 21,
    h: 10.5,
    face: 'w',
    tone: 1,
    box: { minX: 71.75, maxX: 78.25, minZ: 14.5, maxZ: 35.5 },
  },
  {
    code: 'D7',
    subtitle: 'GIẢNG ĐƯỜNG D7',
    x: 60,
    z: 50,
    w: 15,
    d: 7,
    h: 10.5,
    face: 'n',
    tone: 2,
    rotY: Math.PI / 4,
    box: { minX: 53, maxX: 67, minZ: 44, maxZ: 56 },
  },
];

export const D4_BUILDING = {
  center: { x: -78, z: 44 },
  box: { minX: -87, maxX: -69, minZ: 34, maxZ: 54 },
} as const;

// Ghế gỗ dọc bờ Hồ Tiền (quay mặt ra hồ) + ghế quảng trường C1.
// Ghế bờ đông đặt sát bờ kè (x = 22,3) để chừa lối đi bộ ven hồ (x = 24) thông thoáng.
export const LAKE_BENCHES: Vec2[] = [
  { x: -27.5, z: 30 }, { x: -27.5, z: 62 },
  { x: 22.3, z: 20 }, { x: 22.3, z: 68 },
];

export const C1_BENCHES: Vec2[] = [
  { x: -72, z: -30 }, { x: -44, z: -44 },
];

// Liễu rủ quanh Hồ Tiền — đặt NGOÀI bờ kè hình chữ nhật (bờ tây/đông/bắc/nam).
// Cây bờ đông đặt sát bờ kè (x = 22,2) để không chắn lối đi bộ ven hồ (x = 24).
export const LAKE_WILLOWS: Vec2[] = [
  { x: -27.5, z: 15 }, { x: -27.5, z: 50 }, { x: -27.5, z: 75 },
  { x: 22.2, z: 10 }, { x: 22.2, z: 72 },
  { x: -12, z: -7 }, { x: 8, z: -7 },
  { x: -10, z: 85.5 }, { x: 10, z: 85.5 },
];

// --- Phòng học mô phỏng — Bước 5 --------------------------------------------
// Phòng KHÔNG nối vật lý với nhà C1: vào/ra bằng fade + chuyển mode
// (playerState.inClassroom). Tọa độ CỤC BỘ của phòng 9 × 6 m, gốc (0,0) giữa
// phòng; bắc = -Z (tường có bảng đen), nam = +Z (cửa vào). Avatar cao 1,7 m:
// mặt bàn ~0,75 m, mặt ghế ~0,45 m.
// Biển trong phòng ghi rõ: "Phòng học mô phỏng phục vụ học tập — chưa có tư
// liệu nội thất thật."

export const CLASSROOM_DOOR = {
  /** ngay chân bậc tam cấp C1, trước biển nhiệm vụ (đứng được: ngoài collider bậc) */
  pos: { x: -58, z: -45.5 },
  triggerRadius: 2.5,
} as const;

export const CLASSROOM = {
  bounds: { minX: -4.1, maxX: 4.1, minZ: -2.6, maxZ: 2.6 },
  // Spawn dời vào sâu hơn (z=1 thay vì z=2 theo bản phác đầu) để camera thứ
  // ba (kẹp trong phòng, xem Player) có chỗ đứng sau lưng avatar mà không
  // lọt ra ngoài tường nam.
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
// Dựng theo tư liệu ảnh thật Sảnh tầng 1 Thư viện Tạ Quang Bửu (docs/reference-visual.md §3):
//   - Tượng bán thân đồng GS. Tạ Quang Bửu đặt trên bệ gỗ cao có biển đồng
//     "GIÁO SƯ TẠ QUANG BỬU (1910–1986)", bao quanh bởi 4 trụ inox mạ vàng + dây nhung đỏ.
//   - Bức tường hậu cảnh gỗ nâu với các dải số nhị phân 0/1 (vòng tròn & vạch dọc)
//     phát sáng màu vàng hổ phách ấm + diềm hồi văn phát sáng phía trên.
//   - Sàn đá hoa văn rẻ quạt (nâu đỏ đất nung, kem sáng, xám đá) và thông tầng lửng.

export const LIBRARY_DOOR = {
  /** Dưới mái hiên sảnh chính phía bắc Thư viện (ngoài collider khối đế minZ 23,5) */
  pos: { x: 38, z: 22.8 },
  triggerRadius: 3.6,
} as const;

export const LIBRARY_LOBBY = {
  bounds: { minX: -5.4, maxX: 5.4, minZ: -3.8, maxZ: 3.8 },
  spawn: { x: 0, z: 2.4 },
  statue: { x: 0, z: -2.1 },
  vocabBoard: { x: 3.6, z: -0.6 },
  infoDesk: { x: -3.6, z: -0.6 },
} as const;
