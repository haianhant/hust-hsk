// ---------------------------------------------------------------------------
// Bách khoa Hán ngữ 3D — campus layout, single source of truth (Bước 3)
// Đơn vị: mét. +X = đông (Trần Đại Nghĩa), -X = tây (Giải Phóng),
// -Z = bắc (Đại Cồ Việt), +Z = nam (Tạ Quang Bửu). Mặt đất y = 0.
// Layout: ĐÃ KHÓA MỘT PHẦN bằng ảnh vệ tinh (docs/satellite-and-c9.md §2):
//   - Hồ Tiền hình CHỮ NHẬT bắc–nam (không còn ellipse), thư viện ngay phía
//     đông hồ (phía tây tòa nhà hướng ra hồ, chỉ cách một đường nội bộ;
//     mặt đồng hồ thì KHÔNG ở mặt tây — đợt 3 xoay 180°, mặt đồng hồ hướng
//     về phía bắc của scene, xem LIBRARY),
//   - C1 góc tây-bắc campus, phía bắc cổng Parabol; cổng Parabol rìa tây.
//   - Nhà C9: vị trí CHƯA ghim chính xác trên vệ tinh (không có ghim Maps) —
//     giữ vị trí blockout (khối nhà C phía tây-bắc, phía đông cổng Parabol,
//     gần đường tình yêu), ghi rõ là ƯỚC LƯỢNG.
// Campus được CÔ ĐỌNG so với thực tế (~26,2 ha) — không phải digital twin.
// Màu sắc: CHỐT theo docs/reference-visual.md §0 (ước lượng bằng mắt từ ảnh).
// ---------------------------------------------------------------------------

export type Vec2 = { x: number; z: number };

export const AVATAR = {
  height: 1.7, // m — chuẩn tỉ lệ cho mọi vật (cửa, cổng, tầng nhà)
  radius: 0.4, // bán kính va chạm
  walkSpeed: 4, // m/s
  runSpeed: 7, // m/s (giữ Shift)
} as const;

export const BOUNDS = { minX: -96, maxX: 96, minZ: -76, maxZ: 86 } as const;

export const SPAWN: Vec2 = { x: -76, z: 10 }; // ngay trong cổng Parabol

// --- Xe máy — Đợt 3 giai đoạn 4 ------------------------------------------------
// Điểm đỗ ban đầu: (-70, 14.5), cạnh cổng Parabol, phía BẮC đường chính
// (đường chính rộng 6 m, z = 7..13 nên z = 14,5 nằm ngoài mặt đường; không
// chắn lối đi, không chạm collider nào: chân cổng bắc ở x −89,2..−86,8,
// nhà gác z ≤ 2,5, cây gần nhất cách > 10 m). Hướng đầu xe = đông (+X,
// heading π/2) để lên xe là chạy thẳng ra đường chính.
export const BIKE_PARK: Vec2 & { heading: number } = { x: -70, z: 14.5, heading: Math.PI / 2 };
/** Tốc độ tối đa xe ~3,5 lần đi bộ (14 m/s so với walk 4 m/s). */
export const BIKE_MAX_SPEED = 14;
/** Bán kính va chạm của xe (rộng hơn người 0,4 m vì tay lái + thân xe). */
export const BIKE_RADIUS = 0.55;

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
  /** nhà gác trắng phía bắc cổng (ƯƠC LƯỢNG vị trí theo ảnh: bên trái cổng) */
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

/** Logo "I LOVE BK" đúng hình: I trắng + tim đỏ + BK trắng, khối 3D đứng trên
 *  bệ đen thấp, cao ~2–2,5 m, giữa quảng trường trên trục lối vào, ngay chân
 *  bậc tam cấp (reference-visual §2). */
export const I_LOVE_BK = {
  center: { x: -58, z: -42.5 },
  plinth: { minX: -60.8, maxX: -55.2, minZ: -43.1, maxZ: -41.9 },
} as const;

export const LIBRARY = {
  center: { x: 38, z: 36.5 }, // ĐỢT 4 (11/11/2026, làm lại theo studywithhuster.cyou — xem docs/ref-library-rebuild-report.md §1): tâm KHỐI THÁP dời 4,5 m về nam so với (38, 32) cũ. Lô đất (plaza) không đổi; khối tháp phải lùi vào nam để có đủ sân mở phía bắc bậc sảnh (sân z 10..19) — giữ tâm ở z = 32 thì sân mở chỉ còn ~2 m, không đủ đặt chữ HUST + lối đi + bồn cỏ đối xứng. Tâm khu vực (ZONES) giữ (38, 32) r 20 nên vẫn bao trọn công trình.
  // ĐÍNH CHÍNH 06/11 (docs/library-orientation.md): phía tây tòa nhà hướng ra Hồ Tiền,
  // nhưng mặt đồng hồ KHÔNG ở mặt tây.
  // ĐỢT 3 GIAI ĐOẠN 2 (06/11, docs/round3-phase2-report.md): user xác nhận thư viện
  // đang quay ngược trước–sau nên xoay TOÀN BỘ công trình đúng 180° quanh trục Y
  // quanh tâm (38, 32): (x, z) → (76 − x, 64 − z). Mặt đồng hồ + sảnh chính nay
  // hướng về phía BẮC của scene (−Z), ra sân trước cửa mới phía bắc; sân nam cũ
  // (đảo cỏ, lộc vừng) thành sân sau. KHÔNG khẳng định phương vị la bàn thật.
  // ĐỢT 4 (11/11/2026): dựng lại HOÀN TOÀN theo tư liệu studywithhuster.cyou —
  // bỏ group xoay 180° cũ, vẽ thẳng bằng tọa độ thế giới (mặt chính vẫn hướng
  // bắc −Z, không đổi hướng). Khối tháp tấm đứng 3 nhịp: khối giữa nhô trước +
  // cao hơn, 2 cánh lùi sau + thấp hơn nửa tầng, dải kính tối dọc giữa khối giữa
  // và cánh phải. Khối đế chỉ ôm khối giữa.
  size: { x: 21, z: 13 }, // khối tháp tấm đứng: mặt tiền rộng 21 m, sâu 13 m (tỉ lệ 1,6 — lô đất chỉ cho tối đa ~22 m rộng nên không đạt 2,5–3 như tư liệu; xem báo cáo §1)
  floors: 10, // xác nhận: HUST, ~37.000 m²
  floorHeight: 3.2,
  /** đồng hồ ở mặt BẮC của scene (−Z), NGAY TRÊN mái hiên lối vào mới (mái y 6,0) —
   *  dưới mái đế (y 10,7). Bán kính 1,3 m (đường kính 2,6 m ≈ 0,8 tầng — dung hòa:
   *  "khoảng 1 tầng" (3,2 m) và "1/8–1/10 mặt trước đế" (đế rộng 11 m → 1,1–1,4 m)
   *  không thể cùng đúng — đế rộng 21–26 m mới thỏa cả hai, lô đất không cho;
   *  xem báo cáo §1. */
  clock: { x: 38, y: 7.3, z: 23.9, radius: 1.3 },
  plaza: { minX: 23, maxX: 50, minZ: 10, maxZ: 56 }, // sân gạch đỏ-nâu; đợt 4 nới minZ 14 → 10 làm sân trước (lối đi + bồn cỏ đối xứng cần thêm 4 m phía bắc; vùng z 10..14 là cỏ trống — không cây/collider nào khác ngoài đường x = 24 đã có; xem báo cáo §1)
  /** Tiền cảnh phía bắc (đợt 4, theo tư liệu): lối đi đỏ + sân xám + chữ HUST. */
  forecourt: {
    walk: { minX: 24, maxX: 33, minZ: 12, maxZ: 16 }, // lối đi chính màu nâu đỏ, từ mép đường tới sân xám
    grayYard: { minX: 33, maxX: 46, minZ: 12, maxZ: 16 }, // sân lát xám ngay trước sảnh
    hust: { x: 38, z: 14 }, // chữ HUST đỏ khối 3D trên bệ đen, trên trục giữa
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

// --- Đường đi (polyline, rộng 6 m) ------------------------------------------
// Bước 3: đường C1–Thư viện đi vòng ĐÔNG hồ (x = 24, ven bờ đông) thay vì cắt
// chéo qua đầu bắc hồ; đường tình yêu dời xuống z = −16 (đi vòng bắc hồ, không
// cắt qua hồ và không trùng đường chính Parabol–C1).

export const ROADS: { name: string; points: Vec2[]; width: number }[] = [
  {
    name: 'Đường chính Parabol – C9 – C1',
    width: 6,
    points: [
      { x: -84, z: 10 },
      { x: -54, z: 10 },
      { x: -54, z: -34 },
      { x: -58, z: -38 },
    ],
  },
  {
    name: 'Đường C1 – Thư viện',
    width: 6,
    points: [
      { x: -58, z: -34 },
      { x: 24, z: -20 },
      // Đợt 3: kéo điểm cuối từ (24, 28) lên phía bắc tới (24, 18) — đường chạm
      // mép bắc sân trước cửa mới (plaza minZ 10 từ đợt 4); từ đây đi bộ qua sân vào sảnh mới.
      { x: 24, z: 18 },
    ],
  },
  {
    name: 'Đường Thư viện – Hồ Tiền',
    width: 5,
    points: [
      // Đợt 3: đổi đầu đường theo điểm cuối mới của đường C1 – Thư viện (24, 18);
      // đoạn x = 24 chạy dọc bờ đông hồ, ngoài footprint thư viện mới.
      { x: 24, z: 18 },
      { x: 24, z: 46 },
    ],
  },
  {
    name: 'Đường tình yêu',
    width: 5,
    points: [
      { x: -58, z: 10 },
      { x: -58, z: -16 },
      { x: 60, z: -16 },
      { x: 92, z: -6 },
    ],
  },
];

// Cây + ghế dọc đường tình yêu (không dùng để che lỗi hình khối).
export const LOVE_ROAD_TREES: Vec2[] = [
  { x: -44, z: -19.5 }, { x: -44, z: -12.5 },
  { x: -20, z: -19.5 }, { x: -20, z: -12.5 },
  { x: 4, z: -19.5 }, { x: 4, z: -12.5 },
  { x: 28, z: -19.5 }, { x: 28, z: -12.5 },
  { x: 52, z: -19.5 }, { x: 52, z: -12.5 },
];
export const LOVE_ROAD_BENCHES: Vec2[] = [
  { x: -30, z: -13 }, { x: 20, z: -13 }, { x: 70, z: -13 },
];

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

// --- Collider (AABB + hồ chữ nhật) -------------------------------------------

export type AABB = { minX: number; maxX: number; minZ: number; maxZ: number };

export const BUILDING_COLLIDERS: { name: string; box: AABB }[] = [
  { name: 'C1', box: { minX: -82, maxX: -34, minZ: -63, maxZ: -49 } },
  { name: 'Tháp hoa gió đầu hồi C1', box: { minX: -34.2, maxX: -32.2, minZ: -58.5, maxZ: -53.5 } },
  { name: 'Bậc tam cấp C1', box: C1.steps },
  { name: 'Bệ chữ I LOVE BK', box: I_LOVE_BK.plinth },
  { name: 'Khối đá trắng', box: WHITE_ROCK.box },
  { name: 'Thư viện Tạ Quang Bửu (tháp)', box: { minX: 27.5, maxX: 48.5, minZ: 29.5, maxZ: 43.5 } }, // đợt 4: khối tháp tấm đứng x 27,5..48,5, z 30..43 (nới 0,5 m z theo quy ước cũ)
  { name: 'Thư viện Tạ Quang Bửu (khối đế)', box: { minX: 32.5, maxX: 43.5, minZ: 23.5, maxZ: 30.5 } }, // đợt 4: khối đế x 32,5..43,5, z 24..30; mái hiên (z 18..24,5) + bậc (z 17..19) ngoài collider như cũ để avatar đứng được dưới mái trước cửa; avatar áp sát từ phía bắc dừng ở z ≈ 23,1, cách cửa kính (z 26,5) ~3,4 m
  { name: 'Bệ chữ HUST', box: HUST_SIGN.plinth }, // đợt 4: bệ đen chữ HUST trước sảnh; đi vòng qua 2 bên (lối rộng ~2 m phía tây, ~5 m phía đông)
  { name: 'C9', box: { minX: -52, maxX: -32, minZ: -8, maxZ: 4 } },
  { name: 'Cầu thang C9', box: C9.stairs.box },
  { name: 'Chân cổng Parabol (nam)', box: PARABOL_GATE.legAabbs[0] },
  { name: 'Chân cổng Parabol (bắc)', box: PARABOL_GATE.legAabbs[1] },
  { name: 'Nhà gác cổng Parabol', box: PARABOL_GATE.guardHouse },
  { name: 'Bia tượng đài', box: MONUMENT.box },
  { name: 'Biển quảng trường Trần Đại Nghĩa', box: MONUMENT.sign.box },
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
];

/** Điểm có nằm trong lòng Hồ Tiền (hình chữ nhật) không. margin thu hẹp hồ
 *  lại — dùng bán kính avatar khi kiểm tra va chạm. */
export function pointInLake(p: Vec2, margin = 0): boolean {
  return (
    Math.abs(p.x - LAKE.center.x) < LAKE.halfW - margin &&
    Math.abs(p.z - LAKE.center.z) < LAKE.halfL - margin
  );
}

/** Đẩy vị trí ra khỏi mọi collider (AABB + hồ + biên campus). Trả về vị trí đã sửa + tên vật cản (nếu có). */
export function resolveCollisions(p: Vec2, radius: number): { pos: Vec2; hit: string | null } {
  let { x, z } = p;
  let hit: string | null = null;
  x = Math.min(Math.max(x, BOUNDS.minX), BOUNDS.maxX);
  z = Math.min(Math.max(z, BOUNDS.minZ), BOUNDS.maxZ);
  for (const c of BUILDING_COLLIDERS) {
    const b = c.box;
    const cx = Math.min(Math.max(x, b.minX), b.maxX);
    const cz = Math.min(Math.max(z, b.minZ), b.maxZ);
    const dx = x - cx;
    const dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * radius;
        z = cz + (dz / d) * radius;
      } else {
        // Tâm nằm trong hộp: đẩy ra theo cạnh gần nhất.
        const dl = x - (b.minX - radius);
        const dr = b.maxX + radius - x;
        const dt = z - (b.minZ - radius);
        const db = b.maxZ + radius - z;
        const m = Math.min(dl, dr, dt, db);
        if (m === dl) x = b.minX - radius;
        else if (m === dr) x = b.maxX + radius;
        else if (m === dt) z = b.minZ - radius;
        else z = b.maxZ + radius;
      }
      hit = c.name;
    }
  }
  // Hồ: đẩy ra khỏi hình chữ nhật (theo cạnh gần nhất; đúng tâm hồ thì đẩy về đông).
  if (pointInLake({ x, z }, radius)) {
    const dE = LAKE.center.x + LAKE.halfW - x;
    const dW = x - (LAKE.center.x - LAKE.halfW);
    const dS = LAKE.center.z + LAKE.halfL - z;
    const dN = z - (LAKE.center.z - LAKE.halfL);
    const m = Math.min(dE, dW, dS, dN);
    if (m === dE) x = LAKE.center.x + LAKE.halfW + radius * 0.5;
    else if (m === dW) x = LAKE.center.x - LAKE.halfW - radius * 0.5;
    else if (m === dS) z = LAKE.center.z + LAKE.halfL + radius * 0.5;
    else z = LAKE.center.z - LAKE.halfL - radius * 0.5;
    hit = 'Hồ Tiền';
  }
  return { pos: { x, z }, hit };
}

// --- Khu vực (HUD + minimap) -------------------------------------------------

export const ZONES: { name: string; center: Vec2; radius: number }[] = [
  { name: 'Cổng Parabol', center: { x: -88, z: 10 }, radius: 13 },
  { name: 'Nhà C9', center: { x: -42, z: -2 }, radius: 15 },
  { name: 'Quảng trường C1', center: { x: -58, z: -38 }, radius: 19 },
  { name: 'Thư viện Tạ Quang Bửu', center: { x: 38, z: 32 }, radius: 20 },
  { name: 'Hồ Tiền', center: { x: -2, z: 40 }, radius: 34 }, // bán kính chỉ để tham khảo — nearestZone kiểm tra theo hình chữ nhật (xem dưới)
  { name: 'Quảng trường Trần Đại Nghĩa', center: { x: 82, z: -6 }, radius: 12 },
  { name: 'Đường tình yêu', center: { x: 0, z: -16 }, radius: 11 },
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

// --- Phòng học mô phỏng — Bước 5 ------------------------------------------------
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

/** Collider phòng học (tường/bảng/bàn) — cùng dạng AABB như campus. */
export const CLASSROOM_COLLIDERS: { name: string; box: AABB }[] = [
  { name: 'Tường bắc phòng học', box: { minX: -4.5, maxX: 4.5, minZ: -3.1, maxZ: -2.9 } },
  { name: 'Tường nam phòng học', box: { minX: -4.5, maxX: 4.5, minZ: 2.9, maxZ: 3.1 } },
  { name: 'Tường tây phòng học', box: { minX: -4.6, maxX: -4.4, minZ: -3, maxZ: 3 } },
  { name: 'Tường đông phòng học', box: { minX: 4.4, maxX: 4.6, minZ: -3, maxZ: 3 } },
  { name: 'Bảng đen', box: { minX: -1.8, maxX: 1.8, minZ: -3, maxZ: -2.7 } },
  { name: 'Bàn học 1', box: { minX: -2.8, maxX: -1.6, minZ: 0.3, maxZ: 0.9 } },
  { name: 'Bàn học 2', box: { minX: -0.6, maxX: 0.6, minZ: 0.3, maxZ: 0.9 } },
  { name: 'Bàn học 3', box: { minX: 1.6, maxX: 2.8, minZ: 0.3, maxZ: 0.9 } },
];

/** Đẩy vị trí ra khỏi collider phòng học + biên phòng (bản sao thu gọn của
 *  resolveCollisions, không có hồ). */
export function resolveClassroomCollisions(p: Vec2, radius: number): { pos: Vec2; hit: string | null } {
  let { x, z } = p;
  let hit: string | null = null;
  const b = CLASSROOM.bounds;
  x = Math.min(Math.max(x, b.minX), b.maxX);
  z = Math.min(Math.max(z, b.minZ), b.maxZ);
  for (const c of CLASSROOM_COLLIDERS) {
    const box = c.box;
    const cx = Math.min(Math.max(x, box.minX), box.maxX);
    const cz = Math.min(Math.max(z, box.minZ), box.maxZ);
    const dx = x - cx;
    const dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * radius;
        z = cz + (dz / d) * radius;
      } else {
        const dl = x - (box.minX - radius);
        const dr = box.maxX + radius - x;
        const dt = z - (box.minZ - radius);
        const db = box.maxZ + radius - z;
        const m = Math.min(dl, dr, dt, db);
        if (m === dl) x = box.minX - radius;
        else if (m === dr) x = box.maxX + radius;
        else if (m === dt) z = box.minZ - radius;
        else z = box.maxZ + radius;
      }
      hit = c.name;
    }
  }
  return { pos: { x, z }, hit };
}

// --- Helper xe máy (đợt 3 giai đoạn 4) ---------------------------------------
// Cây KHÔNG có collider cho người đi bộ (quyết định đợt 3 giai đoạn 3: tán
// thoáng, không kẹt dưới tán) — nhưng xe chạy nhanh đâm vào thân cây thì
// phải dừng/trượt, nên RIÊNG xe dùng thêm các vòng tròn thân cây (r 0,3 m,
// chỉ quanh thân, không bao tán) + vòng tròn NPC Minh (r 0,5 m). Người đi
// bộ không đổi hành vi.
export const TREE_TRUNKS: Vec2[] = [
  ...LOVE_ROAD_TREES,
  ...LAKE_WILLOWS,
  ...C1.lipaTrees,
];
/** NPC Minh đứng gần cổng Parabol — xe không được đâm xuyên qua. */
export const NPC_CIRCLES: { pos: Vec2; radius: number }[] = [
  { pos: { x: -72, z: 8 }, radius: 0.5 },
];

/** Va chạm cho XE: resolveCollisions (nhà/hồ/bờ kè/biên) + thân cây + NPC.
 *  Trả về vị trí đã sửa + tên vật cản (nếu có). */
export function resolveBikeCollisions(p: Vec2, radius: number): { pos: Vec2; hit: string | null } {
  const base = resolveCollisions(p, radius);
  let { x, z } = base.pos;
  let hit = base.hit;
  const pushOut = (cx: number, cz: number, r: number, name: string) => {
    const dx = x - cx;
    const dz = z - cz;
    const d = Math.hypot(dx, dz);
    const min = r + radius;
    if (d < min) {
      if (d > 1e-9) {
        x = cx + (dx / d) * min;
        z = cz + (dz / d) * min;
      } else {
        x = cx + min;
      }
      hit = name;
    }
  };
  for (const t of TREE_TRUNKS) pushOut(t.x, t.z, 0.3, 'Thân cây');
  for (const n of NPC_CIRCLES) pushOut(n.pos.x, n.pos.z, n.radius, 'Minh (NPC)');
  return { pos: { x, z }, hit };
}

/** Điểm trên đường gần nhất (tính trên các đoạn polyline ROADS). */
export function nearestRoadPoint(p: Vec2): Vec2 {
  let best: Vec2 = { ...ROADS[0].points[0] };
  let bestD = Infinity;
  for (const road of ROADS) {
    for (let i = 0; i + 1 < road.points.length; i++) {
      const a = road.points[i];
      const b = road.points[i + 1];
      const abx = b.x - a.x;
      const abz = b.z - a.z;
      const len2 = abx * abx + abz * abz;
      const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * abx + (p.z - a.z) * abz) / len2));
      const q = { x: a.x + abx * t, z: a.z + abz * t };
      const d = Math.hypot(p.x - q.x, p.z - q.z);
      if (d < bestD) {
        bestD = d;
        best = q;
      }
    }
  }
  return best;
}

/** Tìm điểm trống hợp lệ gần `center`: thử các vòng tròn bán kính tăng dần
 *  (8 hướng/vòng). Điểm hợp lệ = resolveBikeCollisions không va chạm.
 *  Trả null nếu không tìm được trong maxR (hiếm — campus rộng). */
export function findFreeSpotNear(center: Vec2, minR: number, maxR: number): Vec2 | null {
  for (let r = minR; r <= maxR + 1e-9; r += 1.5) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const cand = { x: center.x + Math.cos(a) * r, z: center.z + Math.sin(a) * r };
      const { pos, hit } = resolveBikeCollisions(cand, BIKE_RADIUS);
      if (hit === null && Math.hypot(pos.x - cand.x, pos.z - cand.z) < 0.01) return cand;
    }
  }
  return null;
}

// --- Dịch chuyển nhanh (đợt 3 giai đoạn 5) --------------------------------------
// 6 điểm đến mở ngay từ đầu, lấy từ địa điểm thật trong game. Mỗi điểm:
// pos = điểm đứng AN TOÀN ngoài công trình (đã kiểm bằng resolveCollisions
// với bán kính avatar 0,4 m — đặt vào thì resolve trả về đúng điểm đó,
// hit = null, xem /tmp/ft-cands.cjs); yaw = góc camera (hướng nhìn =
// (−sin yaw, −cos yaw)); facing = hướng mặt avatar (atan2(dirX, dirZ)).
//   - C1: (-58,-43.5) — KHÔNG phải (-58,-45.5) như gợi ý ban đầu: điểm
//     (-58,-45.5) nằm TRONG collider bậc tam cấp (z -49,5..-43,8) nên
//     resolveCollisions đẩy ra (-58,-43.5) — mặt nam của bậc, ngay trước
//     bệ I LOVE BK (cách mép bệ đúng 0,4 m = bán kính avatar, chạm mà
//     không lún); cách trigger cửa lớp (-58,-45.5) đúng 2,0 m < bán kính
//     trigger 2,5 m nên tới nơi là hiện ngay "E — Vào phòng học".
//   - Thư viện: (38,12.5) — phía BẮC, trên lối đi đỏ trước chữ HUST (bệ
//     z 13,4..14,6; điểm đứng cách mép bệ 0,9 m), ngoài collider khối đế
//     (minZ 23,5); nhìn về nam (yaw π) thẳng vào chữ HUST + cửa +
//     mặt đồng hồ mới (38, 7,3, 23,9). Đi bộ vào cửa phải vòng qua bệ
//     chữ HUST (xem test/walk-to-library-door.cjs + fast-travel-check
//     chuỗi 5: lách ngang rồi mới đi thẳng vào).
//   - Hồ Tiền: (24,40) — trên đường ven bờ đông (x = 24), cách mép bờ kè
//     đông (x 21,1) 2,9 m, ngoài mặt nước; nhìn về tây (yaw π/2) ra hồ.
//   - Cổng Parabol: (-88,10) — giữa 2 chân cổng (lối đi z 6..14), nhìn
//     về đông (yaw −π/2) vào sân trường.
//   - Khu C9: (-29,-2) — phía đông cầu thang đỏ mặt đông C9 (thang
//     x -32,6..-29,6), cách mép thang 0,6 m; nhìn về tây (yaw π/2) về
//     phía C9. Đứng ở x = -28 sẽ rơi vào hình chữ nhật hồ nới 4 m của
//     nearestZone nên chip khu báo nhầm "Hồ Tiền"; (-29,-2) báo đúng
//     "Nhà C9" (xem /tmp/ft-c9.cjs).
//   - Điểm bắt đầu: SPAWN (-76,10), nhìn về đông (yaw −π/2) vào trường.
export type FastTravelDestination = {
  id: string;
  name: string;
  icon: string;
  desc: string;
  x: number;
  z: number;
  /** góc camera sau khi tới (radian) */
  yaw: number;
  /** hướng mặt avatar sau khi tới (radian, atan2(dirX, dirZ)) */
  facing: number;
};

export const FAST_TRAVEL_DESTINATIONS: FastTravelDestination[] = [
  { id: 'c1', name: 'Nhà C1', icon: '🏫', desc: 'Trước cửa phòng học', x: -58, z: -43.5, yaw: 0, facing: Math.PI },
  { id: 'library', name: 'Thư viện Tạ Quang Bửu', icon: '📚', desc: 'Sảnh chính phía bắc', x: 38, z: 12.5, yaw: Math.PI, facing: 0 },
  { id: 'lake', name: 'Hồ Tiền', icon: '🌊', desc: 'Bờ đông ven hồ', x: 24, z: 40, yaw: Math.PI / 2, facing: -Math.PI / 2 },
  { id: 'parabol', name: 'Cổng Parabol', icon: '⛩️', desc: 'Giữa cổng, nhìn vào trường', x: -88, z: 10, yaw: -Math.PI / 2, facing: Math.PI / 2 },
  { id: 'c9', name: 'Khu C9', icon: '🏢', desc: 'Trước cầu thang đỏ', x: -29, z: -2, yaw: Math.PI / 2, facing: -Math.PI / 2 },
  { id: 'spawn', name: 'Điểm bắt đầu', icon: '📍', desc: 'Trong cổng Parabol', x: SPAWN.x, z: SPAWN.z, yaw: -Math.PI / 2, facing: Math.PI / 2 },
];

export function getFastTravelDestination(id: string): FastTravelDestination | undefined {
  return FAST_TRAVEL_DESTINATIONS.find((d) => d.id === id);
}

// --- Chặng kiểm tra Bước 2–3 (theo skill: một chặng một đích, điểm bắt đầu cố định) ---
// Bước 3: leg3/leg4 dời theo thư viện + hồ chữ nhật (đi vòng đông hồ, x = 24).

export type Leg = { id: string; name: string; from: Vec2; waypoints: Vec2[] };

export const LEGS: Leg[] = [
  {
    id: 'leg1',
    name: 'Cổng Parabol → Nhà C9',
    from: { ...SPAWN },
    waypoints: [
      { x: -54, z: 10 },
      { x: -42, z: 12 },
    ],
  },
  {
    id: 'leg2',
    name: 'Nhà C9 → Quảng trường C1',
    from: { x: -42, z: 12 },
    waypoints: [
      { x: -54, z: 10 },
      { x: -54, z: -30 },
      { x: -58, z: -36 },
    ],
  },
  {
    id: 'leg3',
    name: 'Quảng trường C1 → Thư viện',
    from: { x: -58, z: -36 },
    waypoints: [
      { x: 24, z: -20 },
      { x: 24, z: 28 },
    ],
  },
  {
    id: 'leg4',
    name: 'Thư viện → Bờ Hồ Tiền',
    from: { x: 24, z: 28 },
    waypoints: [
      { x: 24, z: 40 },
      { x: 23, z: 46 },
    ],
  },
];
