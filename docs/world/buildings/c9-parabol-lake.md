# Đặc tả Module: Cổng Parabol, Tòa C9 & Hồ Tiền

## 1. Module `building.parabol-gate` — Cổng Parabol (Đường Giải Phóng)

- **Module ID:** `building.parabol-gate`
- **Purpose:** Cổng chính biểu tượng lịch sử của Đại học Bách khoa Hà Nội tại biên phía Tây (giáp đường Giải Phóng), nơi người chơi xuất phát (`SPAWN = (-76, 10)`) và gặp NPC Minh.
- **Source Paths:**
  - Hình học 3D: [`components/three/ParabolGate.tsx`](../../../components/three/ParabolGate.tsx)
  - Tọa độ & Collider: [`PARABOL_GATE`](../../../lib/campus.ts#L35-L51) trong `lib/campus.ts`
- **Reference Assets:**
  - 4 ảnh chụp thực tế tại [`tham-khao/cong-parabol/`](../../../tham-khao/cong-parabol/README.md) (`cong-parabol-01.jpg` .. `cong-parabol-04.jpg`).
- **Current Implementation Status:** **Production**.
- **Invariants (Ràng buộc Bất biến):**
  1. **Mốc thời gian:** Đặt tại vị trí lịch sử **trước đợt di dời tháng 11/2026** (`center: (-88, 10)`), khoảng thông thủy giữa hai chân `clearWidth = 8m` (`z: 6..14m`), đỉnh vòm cao `12.5m`.
  2. **Hình học Vòm:** Là **dải băng bê tông phẳng** (`depth = 1.2m`, `ribbonThickness = 0.6m`) uốn theo phương trình parabol với hai chân chôn trực tiếp xuống mặt đất (không đặt trên bệ cao và không dùng ống tròn).
  3. **Chi tiết Hai Mặt Đông/Tây:** Cả mặt ngoài (Tây — nhìn ra đường Giải Phóng) và mặt trong (Đông — nhìn vào sân trường) đều có các gờ chia khoang nổi, **6 phù điêu huy hiệu tròn** và biển chữ nổi `"ĐẠI HỌC BÁCH KHOA HÀ NỘI"` kèm quốc huy.
  4. **Phụ trợ:** Nhà gác trắng phía Bắc cổng (`guardHouse: { minX: -90, maxX: -86, minZ: -0.5, maxZ: 2.5 }`), hàng đèn cầu dưới bụng vòm và cổng xếp sắt đen.
- **Acceptance Criteria:**
  - Điểm `SPAWN (-76, 10)` và điểm đáp Fast Travel `parabol (-88, 10)` không va chạm với hai chân cổng.
- **Known Limitations:**
  - Chiều rộng thông thủy `8m` và cao độ `12.5m` lấy theo thông số báo chí công bố tháng 11/2026 (chưa có bản vẽ kỹ thuật CAD gốc).

---

## 2. Module `building.c9` — Tòa C9 & Cầu Thang Bộ Lan Can Đỏ

- **Module ID:** `building.c9`
- **Purpose:** Tái hiện khối nhà C9 màu trắng/kem với cầu thang thoát hiểm ngoài trời gấp khúc zic-zac sơn lan can đỏ — góc check-in nổi tiếng của sinh viên Bách khoa.
- **Source Paths:**
  - Hình học 3D: [`components/three/C9Building.tsx`](../../../components/three/C9Building.tsx)
  - Tọa độ & Collider: [`C9`](../../../lib/campus.ts#L118-L138) trong `lib/campus.ts`
- **Reference Assets:**
  - [`tham-khao/c9/c9-cau-thang-do-01.jpg`](../../../tham-khao/c9/README.md) và [`docs/satellite-and-c9.md`](../../satellite-and-c9.md).
- **Current Implementation Status:** **Production** (Đã nâng cấp khung cửa sổ 3D và cửa gỗ tầng trệt ở Đợt 7).
- **Invariants:**
  1. **Vị trí & Khối nhà:** Tâm tại `(-42, -2)`, kích thước `20m × 12m` (`box: { minX: -52, maxX: -32, minZ: -8, maxZ: 4 }`), cao `4 tầng × 3.4m`.
  2. **Cầu thang Đỏ Mặt Đông (`stairs.face = 'east'`):**
     - Gắn vào mặt Đông của tòa nhà (`box: { minX: -32.6, maxX: -29.6, minZ: -6.8, maxZ: 2.8 }`), gồm **4 vế thang × 3.4m** khớp chính xác với cao độ từng sàn tầng (chiếu nghỉ không bị lệch so với cửa tầng).
     - Dựng từng bậc thang thật, lan can kim loại đỏ mảnh và khoảng rỗng nhìn xuyên dưới gầm thang.
  3. **Chi tiết Mặt đứng:** Hệ khung cửa sổ 3D nổi khối (`WIN_FRAME` + bệ cửa `WIN_SILL` + đố chia ô + kính lùi sâu), cửa đôi gỗ vàng tầng trệt kèm ô thoáng song sắt cạnh chân cầu thang và biển `"NHÀ C9"`.
- **Acceptance Criteria:**
  - Điểm đáp Fast Travel `c9 (-29, -2)` nằm phía Đông cầu thang đỏ, nhận diện đúng vùng `"Nhà C9"` (`nearestZone`).
- **Known Limitations:**
  - Cầu thang là mô hình kiến trúc tĩnh kèm hộp va chạm bao ngoài (engine hiện tại di chuyển trên mặt phẳng `y = 0`, không hỗ trợ leo cầu thang lên các tầng trên).

---

## 3. Module `landscape.tien-lake` — Hồ Tiền, Bờ Kè Đá & Quần thể Sen/Liễu

- **Module ID:** `landscape.tien-lake`
- **Purpose:** Tái hiện Hồ Tiền trung tâm phía Nam khuôn viên, tạo trục cảnh quan nối giữa Khu C, Khu D và Thư viện Tạ Quang Bửu.
- **Source Paths:**
  - Hình học 3D: [`components/three/TienLake.tsx`](../../../components/three/TienLake.tsx), `LakeWillow` trong [`components/three/Trees.tsx`](../../../components/three/Trees.tsx), `SittingStudent` trong [`components/three/AmbientLife.tsx`](../../../components/three/AmbientLife.tsx)
  - Tọa độ & Va chạm: [`LAKE`](../../../lib/campus.ts#L102-L107), [`LAKE_BANK`](../../../lib/campus.ts#L111-L116), [`LAKE_BENCHES`](../../../lib/campus.ts#L574-L577), [`LAKE_WILLOWS`](../../../lib/campus.ts#L584-L589), [`pointInLake`](../../../lib/campus.ts#L667-L672)
- **Reference Assets:**
  - 2 ảnh chụp thực tế tại [`tham-khao/ho-tien/`](../../../tham-khao/ho-tien/README.md) (`ho-tien-01.jpg`, `ho-tien-02.jpg`).
- **Current Implementation Status:** **Production**.
- **Invariants:**
  1. **Hình thái Chữ nhật Bắc–Nam:** Tâm tại `(-2, 40)`, rộng `45m` (`halfW = 22.5m`, `x: -24.5..20.5`), dài `88m` (`halfL = 44m`, `z: -4..84`), diện tích `~3.960 m²` (tỉ lệ `~2:1` theo ảnh vệ tinh, tuyệt đối không dựng hình elip).
  2. **Bờ kè & Mặt nước:** 4 dải bờ kè đá hộc có gờ bê tông cao hơn mặt nước `0.80m` và hộp va chạm riêng ngăn người chơi rơi xuống hồ.
  3. **Cảnh quan Ven hồ:**
     - Mặt hồ phủ lá sen/súng hữu cơ (có khe khuyết V) và hoa hồng/nụ dựng bằng `InstancedMesh` với khoảng nước thoáng tự nhiên.
     - 9 cây liễu rủ phân lớp (`LAKE_WILLOWS`) có bồn gạch đỏ tròn quanh gốc, cột đèn sân vườn 5 chao cầu trắng và 4 ghế đá ven hồ (`LAKE_BENCHES`) có NPC sinh viên ngồi đọc sách.
     - Toàn bộ ghế và gốc liễu bờ Đông đặt sát bờ kè (`x ≈ 22.2–22.3m`) để hành lang đường đi bộ ven hồ (`x = 24m`) hoàn toàn thông thoáng.
- **Acceptance Criteria:**
  - Chặng `leg3` và `leg4` trong `node test/leg-sim.cjs` đi dọc bờ Đông hồ (`x = 24`) mượt mà không va vào ghế hay bờ kè.
- **Known Limitations:**
  - Phản xạ mặt nước dùng bản đồ môi trường IBL kết hợp hiệu ứng gợn sóng nhẹ thay vì planar reflection render pass riêng để bảo toàn FPS trên thiết bị di động.
