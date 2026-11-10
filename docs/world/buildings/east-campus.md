# Đặc tả Module: Khu Đông Campus (Tòa B1 SoICT, Khu KTX & Khu Thể chất)

## 1. Module `building.b1-soict` — Tòa B1 (Trường CNTT & Truyền thông — SoICT)

- **Module ID:** `building.b1-soict`
- **Purpose:** Tái hiện tòa nhà B1 của Trường Công nghệ Thông tin và Truyền thông (SoICT) nằm phía Đông đường Trần Đại Nghĩa, ngay phía Nam khu Ký túc xá.
- **Source Paths:**
  - Hình học 3D: `SoictB1Building` trong [`components/three/CampusExpansion.tsx`](../../../components/three/CampusExpansion.tsx)
  - Tọa độ & Collider: [`SOICT_B1`](../../../lib/campus.ts#L221-L227) trong `lib/campus.ts`
- **Reference Assets:**
  - 3 ảnh chụp thực tế tại [`tham-khao/b1-soict/`](../../../tham-khao/b1-soict/README.md) (`b1-soict-01.jpg` .. `b1-soict-03.jpg`).
- **Current Implementation Status:** **Production** (Đã nâng cấp mặt chính góc cong ở Đợt 7).
- **Invariants (Ràng buộc Bất biến):**
  1. **Tọa độ & Quy mô:** Tâm tại `(112, 14)`, kích thước `22m × 14m` (`box: { minX: 101, maxX: 123, minZ: 7, maxZ: 21 }`), cao `8 tầng × 3.2m`, quay mặt chính về hướng Bắc (`-Z`, `rotation-y = Math.PI`) nhìn ra trục đường chính từ Cổng Trần Đại Nghĩa (`z = -6`).
  2. **Kiến trúc Sảnh Tròn Rotunda & Sơn Trắng:**
     - Toàn bộ mặt đứng sơn màu trắng kiến trúc (`#FFFFFF` / `#F8FAFC`) với chỉ viền xám nhạt (`#E2E8F0`) theo đúng ảnh thực tế `b1-soict-01..02.jpg`.
     - Chính giữa mặt Bắc là khối sảnh hình trụ tròn (rotunda) có hàng cột đen tầng trệt, thảm cỏ bán nguyệt có viền đá trắng và biển tên trường SoICT nền xanh chữ trắng.
     - Trên trán mái gắn biển chữ `"B1"` màu xanh dương (`#1D4E9E`) nổi bật.
- **Acceptance Criteria:**
  - Nhìn từ trục đường chính Cổng Trần Đại Nghĩa (`z = -6`) về phía Nam (`+Z`) nhận diện rõ mặt tiền trắng của Tòa B1, khối sảnh tròn rotunda, thảm cỏ bán nguyệt và biển `"B1"`.
- **Known Limitations:**
  - Các tòa nhà phụ cận phía Đông-Nam B1 (`A17`, `H1`, `H3`, `Nhà T` trong `EAST_CAMPUS_BLOCKS`) được dựng ở mức ngoại thất tiêu chuẩn làm bối cảnh không gian.

---

## 2. Module `building.dorm-complex` — Khu Ký túc xá Bách Khoa (B3–B13 & KTX Mới)

- **Module ID:** `building.dorm-complex`
- **Purpose:** Tái hiện quần thể Ký túc xá sinh viên ĐHBK Hà Nội nằm phía Đông đường Trần Đại Nghĩa và phía Nam cổng Tạ Quang Bửu (`TA_QUANG_BUU_GATE` tại `(126, -68)`).
- **Source Paths:**
  - Hình học 3D: `DormComplex` trong [`components/three/CampusExpansion.tsx`](../../../components/three/CampusExpansion.tsx)
  - Tọa độ & Collider: [`DORM_COMPLEX`](../../../lib/campus.ts#L239-L275) trong `lib/campus.ts`
- **Reference Assets:**
  - 3 ảnh chụp thực tế tại [`tham-khao/ktx/`](../../../tham-khao/ktx/README.md) (`ktx-01.jpg` .. `ktx-03.jpg`).
- **Current Implementation Status:** **Production**.
- **Invariants:**
  - Bao gồm đầy đủ các tòa `B3`, `B4`, `B5`, `B6`, `B7`, `B7bis`, `B8` (Văn phòng Hội Sinh viên), `B9` (Trung tâm Quản lý KTX), `B10`, `B13`, `Nhà ăn KTX` và sân bóng nội khu (`dormPitchCenter: (119, -33)`).
  - Thể hiện rõ **2 phong cách kiến trúc đối lập trong ảnh thật**:
    1. Các dãy KTX truyền thống 4–5 tầng sơn vàng ấm (`B9`, `B8`) có sân trong trồng cây bàng/phượng, cổng chào `"TRUNG TÂM QUẢN LÝ KÝ TÚC XÁ"` và biển `"VĂN PHÒNG HỘI SINH VIÊN"` (`ktx-02.jpg`).
    2. Khối KTX mới cao tầng (9 tầng) sơn phối **trắng – xanh dương** hiện đại với biển hiệu lớn trên đỉnh mái (`ktx-03.jpg`).
- **Acceptance Criteria:**
  - Toàn bộ 11 khối nhà trong `DORM_COMPLEX` có hộp va chạm AABB đầy đủ và hiển thị đúng mã tòa nhà trên `Minimap` (`Phím M`).
- **Known Limitations:**
  - Không mở không gian nội thất phòng ở sinh viên bên trong các tòa KTX.

---

## 3. Module `building.sports-complex` — Khu Thể chất & Sân vận động Bách Khoa

- **Module ID:** `building.sports-complex`
- **Purpose:** Tái hiện tổ hợp thể dục thể thao phía Đông-Nam khuôn viên (dọc trục Lê Thanh Nghị): Nhà thi đấu Thể chất, Bể bơi Bách Khoa, Sân bóng rổ/cầu lông, Sân vận động Bóng đá Bách Khoa và KTX Lào.
- **Source Paths:**
  - Hình học 3D: `SportsComplex` trong [`components/three/CampusExpansion.tsx`](../../../components/three/CampusExpansion.tsx)
  - Tọa độ & Collider: [`SPORTS_COMPLEX`](../../../lib/campus.ts#L279-L293) trong `lib/campus.ts`
- **Reference Assets:** Sơ đồ tổng mặt bằng [`docs/khuon-vien-truong.png`](../../khuon-vien-truong.png).
- **Current Implementation Status:** **Production**.
- **Invariants:**
  - Nhà thi đấu TC (`stadiumCenter: (104, 64)`), Bể bơi Bách Khoa (`poolCenter: (120, 48)`), Sân vận động Bóng đá (`footballFieldCenter: (132, 78)`, kích thước `34m × 22m` kèm đường chạy điền kinh đỏ, vạch sân trắng, khung thành và khán đài) và KTX Lào (`(152, 52)`).
  - Toàn bộ phân khu nằm gọn trong biên thế giới đã hợp nhất `BOUNDS = { minX: -96, maxX: 168, minZ: -76, maxZ: 108 }` (`PR1`), đảm bảo người chơi đi dạo trên sân bóng ở `x = 149, z = 89` vẫn đồng bộ vị trí chính xác qua Multiplayer.
- **Acceptance Criteria:**
  - Người chơi đi bộ hoặc lái xe máy vào đường pitch SVĐ Bách Khoa không bị kẹp tọa độ bởi server.
- **Known Limitations:**
  - Kích thước sân bóng đá (`34m × 22m`) được thu gọn tương ứng với tỉ lệ cô đọng của toàn khuôn viên.
