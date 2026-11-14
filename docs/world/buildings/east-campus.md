# Đặc tả Module: Khu Đông Campus (Tòa B1 SoICT, Cụm A1-5/A17/E/T, Khu KTX & Khu Thể chất)

## 1. Module `building.b1-soict` & `building.east-blocks` — Tòa B1 (SoICT) & Cụm Nhà ăn A1-5, A17, Nhà E, Nhà T

- **Module ID:** `building.b1-soict`, `building.east-blocks`
- **Purpose:** Tái hiện tòa nhà B1 của Trường Công nghệ Thông tin và Truyền thông (SoICT) cùng các khối nhà thực tế thuộc ĐHBK Hà Nội ở phía Đông phố Tạ Quang Bửu theo chuẩn [`https://hustmap.com/`](https://hustmap.com/).
- **Source Paths:**
  - Hình học 3D: `SoictB1Building`, `EastCampusBlocks` trong [`features/campus/buildings/EastCampusBlocks.tsx`](../../../features/campus/buildings/EastCampusBlocks.tsx)
  - Tọa độ & Collider: `SOICT_B1`, `EAST_CAMPUS_BLOCKS` trong [`features/campus/world-data/buildings.ts`](../../../features/campus/world-data/buildings.ts)
- **Reference Assets:**
  - Bản đồ số chuẩn [`https://hustmap.com/`](https://hustmap.com/).
  - 3 ảnh chụp thực tế tại [`tham-khao/b1-soict/`](../../../tham-khao/b1-soict/README.md) (`b1-soict-01.jpg` .. `b1-soict-03.jpg`).
- **Invariants (Ràng buộc Bất biến):**
  1. **Tòa B1 (`SOICT_B1`) & Sân trước Nhà B1 (`B1_FORECOURT_PLAZA`):** Tâm tòa nhà tại `(115.5, 22.5)`, kích thước `33m × 17m` (`box: { minX: 99, maxX: 132, minZ: 14, maxZ: 31 }`), cao `8 tầng × 3.2m`, sơn trắng kiến trúc (`#FFFFFF` / `#F8FAFC`), quay mặt chính có khối sảnh tròn rotunda (`r = 5.15m`) và biển `"B1"` xanh dương về hướng Bắc (`-Z`) nhìn ra `B1_FORECOURT_PLAZA` (`x = 99..132, z = -2.8..14.5`) gồm thảm cỏ bán nguyệt tại `(115.5, 5.8)`, Nhà xe B1 cánh Tây và làn đỗ xe ô tô giảng viên cánh Đông.
  2. **Cụm công trình phía Đông-Nam B1 (`EAST_CAMPUS_BLOCKS`):**
     - Chỉ dựng các tòa thuộc khuôn viên ĐHBK Hà Nội trên `https://hustmap.com/`: **`Nhà ăn A1-5`** (`(142, 9)`), **`Nhà A17`** (`(142.5, 23)`, xoay chéo dọc phố Tạ Quang Bửu), **`Nhà E`** (`(149.5, 30.5)`) và **`Nhà T`** (`(159, 20)`, khối nhà lớn chạy chéo ở rìa Đông).
     - Tuyệt đối không đưa `H1`, `H3` (thuộc Trường ĐH Xây dựng Hà Nội ở phía Tây-Nam ngoài trường) vào khu vực này.

---

## 2. Module `building.dorm-complex` — Khu Ký túc xá Bách Khoa (`B3–B13`, `Căng tin B5-9`, `KTX Mới`)

- **Module ID:** `building.dorm-complex`
- **Purpose:** Tái hiện quần thể Ký túc xá sinh viên ĐHBK Hà Nội nằm phía Đông đường Trần Đại Nghĩa và hai bên phố Tạ Quang Bửu theo chuẩn [`https://hustmap.com/`](https://hustmap.com/).
- **Source Paths:**
  - Hình học 3D: `HustDormitoryZone` trong [`features/campus/buildings/DormitoryComplex.tsx`](../../../features/campus/buildings/DormitoryComplex.tsx)
  - Tọa độ & Collider: `DORM_COMPLEX` trong [`features/campus/world-data/buildings.ts`](../../../features/campus/world-data/buildings.ts)
- **Reference Assets:**
  - Bản đồ số chuẩn [`https://hustmap.com/`](https://hustmap.com/) & bộ ảnh [`tham-khao/ktx/`](../../../tham-khao/ktx/README.md).
- **Invariants:**
  - **Phía Tây phố Tạ Quang Bửu:** Dãy Tây gồm `KTX B6`, `KTX B7`, `Sân bóng rổ KTX`, `KTX B7bis`, `KTX B8` (VP Hội Sinh viên); dãy Đông gồm `KTX B5`, `Căng tin B5-9`, `KTX B9` (TT Quản lý KTX), `Sân bóng đá KTX` và `Nhà TT Phục vụ Tổng hợp Bách Khoa`.
  - **Phía Đông phố Tạ Quang Bửu:** `KTX B13`, `Nhà B4`, `Trung tâm ĐTTH / Nhà ăn & Trạm Y tế`, `KTX B3`, `KTX B10`.
  - Kết hợp hài hòa các dãy KTX 4 tầng sơn vàng nghệ truyền thống (có cổng gạch đỏ `"HỘI SINH VIÊN"`) và các khối KTX mới 9 tầng phối màu xanh dương – trắng.

---

## 3. Module `building.sports-complex` — Khu Thể thao, Nhà thi đấu, Nhà TC, SVĐ Bách Khoa & KTX A2–A3

- **Module ID:** `building.sports-complex`
- **Purpose:** Tái hiện tổ hợp thể dục thể thao phía Đông-Nam khuôn viên dọc hai bên phố Lê Thanh Nghị theo chuẩn [`https://hustmap.com/`](https://hustmap.com/).
- **Source Paths:**
  - Hình học 3D: `HustSportsAndStadiumComplex` trong [`features/campus/buildings/SportsAndStadiumComplex.tsx`](../../../features/campus/buildings/SportsAndStadiumComplex.tsx)
  - Tọa độ & Collider: `SPORTS_COMPLEX` trong [`features/campus/world-data/buildings.ts`](../../../features/campus/world-data/buildings.ts)
- **Reference Assets:** Bản đồ số chuẩn [`https://hustmap.com/`](https://hustmap.com/).
- **Invariants:**
  - **Phía Tây-Bắc phố Lê Thanh Nghị (từ Đông-Bắc xuống Tây-Nam):** `Bể bơi Bách Khoa` (`(123, 42)`) → `Nhà thi đấu Bách Khoa` (`(110, 53)`) → `Nhà TC` (`(97, 66)`).
  - **Phía Đông-Nam phố Lê Thanh Nghị:** `Sân vận động Bách Khoa` (`(132, 80)`, kèm đường chạy điền kinh đỏ, sân bóng rổ góc Bắc và khán đài) cùng cụm **`KTX A2 – A3`** (`(152, 54)`) ở phía Đông-Bắc SVĐ.
  - Toàn bộ phân khu nằm gọn trong biên thế giới `BOUNDS = { minX: -96, maxX: 168, minZ: -76, maxZ: 108 }`, đảm bảo đồng bộ Multiplayer chính xác trên toàn sân vận động.
