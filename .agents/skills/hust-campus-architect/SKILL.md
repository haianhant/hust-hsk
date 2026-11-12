---
name: hust-campus-architect
description: >-
  Use this skill when adding, modifying, or verifying buildings, landmarks,
  roads, plazas, interiors, or campus layout of Hanoi University of Science
  and Technology (Đại học Bách khoa Hà Nội / HUST) in hust-hsk.
---

# HUST Campus Architect Skill

Quy trình thiết kế, mở rộng và đồng bộ các công trình kiến trúc của **Đại học Bách khoa Hà Nội (HUST)** trong không gian 3D.

## Quy trình 5 bước khi thêm hoặc chỉnh sửa công trình HUST

### Bước 1: Đối chiếu Bản đồ Số [`https://hustmap.com/`](https://hustmap.com/), Bộ ảnh thật `tham-khao/` & Bảng thông số Kiến trúc HUST
1. **Bắt buộc lấy Bản đồ Số `https://hustmap.com/` & Bộ ảnh thật `tham-khao/` làm chuẩn (Source of Truth):**
   - Trước khi lập plan hoặc xây dựng bất kỳ tòa nhà/công trình/trang phục nào, phải đối chiếu trực tiếp với:
     - **Bản đồ số [`https://hustmap.com/`](https://hustmap.com/) (Official Map Source of Truth):** xác định chính xác vị trí tương đối, hướng xoay, hình thái mặt bằng (`footprint`), sân trong, bãi xe và mạng lưới đường nội bộ giữa 4 tuyến phố Đại Cồ Việt – Giải Phóng – Trần Đại Nghĩa – Tạ Quang Bửu/Lê Thanh Nghị.
     - **Tuyệt đối không tham khảo hình sơ đồ cũ `khuon-vien-truong.png` nữa** (đã loại bỏ).
     - **Giới hạn phạm vi đúng khuôn viên trường (Scope Boundary):** Bản đồ `https://hustmap.com/` hiển thị cả vùng lân cận khá rộng; chỉ tập trung tham khảo và hoàn thiện đúng phạm vi khuôn viên Đại học Bách khoa Hà Nội (vùng nền kem trong `BOUNDS = { minX: -96, maxX: 168, minZ: -76, maxZ: 108 }`), **không làm quá rộng** sang các trường/khu dân cư ngoài HUST (như ĐH Xây dựng `H1/H2/H3`, ĐH Kinh tế Quốc dân, Khu tập thể Bách Khoa `K1–K18`/`E1–E7`, Chùa Liên Phái, Bộ GD&ĐT).
     - **Bộ ảnh chụp thực tế tại `tham-khao/`** (`thu-vien/`, `c1/`, `c7/`, `c9/`, `ho-tien/`, `cong-parabol/`, `b1-soict/`, `ktx/`, `dong-phuc/`). Bắt buộc xem ảnh thật trong thư mục tương ứng trước khi dựng hình.
2. Đọc bảng thông số kiến trúc chuẩn của từng công trình tại:
   - [hust-landmarks-spec.md](./references/hust-landmarks-spec.md)
3. Kiểm tra kỹ tư liệu gốc trong `docs/world/buildings/`, `docs/satellite-and-c9.md` và `docs/ref-library-studywithhuster.md`.
4. **Giữ gọn khuôn viên trong `BOUNDS` chuẩn (`shared/constants/world.ts`):**
   - Duy trì quy hoạch cô đọng, cân đối và chính xác trong biên khuôn viên ĐHBK Hà Nội (`BOUNDS = { minX: -96, maxX: 168, minZ: -76, maxZ: 108 }`), không nới tràn lan ra các khu vực ngoài trường.

### Bước 2: Cập nhật Nguồn dữ liệu trung tâm (`lib/campus.ts`)
Trước khi vẽ mesh 3D, cập nhật `lib/campus.ts`:
1. Khai báo hằng số tọa độ tâm (`center`), kích thước (`size`), số tầng (`floors`), chiều cao tầng (`floorHeight`).
2. Thêm hộp va chạm AABB vào `BUILDING_COLLIDERS` (nới `0.1–0.5m` ở các gờ bậc/tường nếu cần, nhưng chừa sảnh/mái hiên để avatar đi bộ vào dưới mái hiên trước cửa).
3. Nếu thêm thân cây gần đường đi, thêm tọa độ `(x, z)` vào `TREE_TRUNKS` để xe máy (`resolveBikeCollisions`) nhận diện va chạm.
4. Nếu công trình là điểm đến mới, cập nhật `ZONES` và `CAMPUS_MAP_BUILDINGS` (để HUD và `Minimap.tsx` hiển thị tên khu vực) và kiểm tra `FAST_TRAVEL_DESTINATIONS` (điểm đứng phải thỏa mãn `resolveCollisions(pos, AVATAR.radius).hit === null`).

### Bước 3: Dựng Component 3D (`components/three/`)
1. Tạo hoặc cập nhật file component riêng trong `components/three/` (ví dụ `C1Building.tsx`, `LibraryBuilding.tsx`, `C9Building.tsx`, `BackgroundBuildings.tsx`) và gắn vào `Landmarks.tsx` hoặc `CampusScene.tsx`.
2. Sử dụng `AVATAR.height = 1.7m` làm thước đo tỉ lệ:
   - Bậc thềm cao `0.15–0.17m`, sâu `0.29–0.60m`.
   - Lan can cao `0.95–1.05m`.
   - Cửa đi cao `2.4–2.8m`, tầng nhà cao `3.2–3.6m`.
3. Tuân thủ quy tắc chống z-fighting: mọi mặt song song lệch nhau `>= 0.02m`, các khối giao nhau nhúng `0.02–0.05m`.

### Bước 4: Đồng bộ Bản đồ thu nhỏ (`components/ui/Minimap.tsx`)
Nếu thêm tòa nhà chính, hồ nước hoặc tuyến đường mới, kiểm tra `CAMPUS_MAP_BUILDINGS` trong `lib/campus.ts` và `components/ui/Minimap.tsx` để đảm bảo hình chiếu 2D trên minimap phản ánh đúng footprint mới.

### Bước 5: Chạy Kiểm thử Va chạm & Điều hướng
Chạy `node test/leg-sim.cjs` (đã tích hợp tìm đường thông minh theo mạng lưới `ROADS` / A* quanh vật cản) và `node test/fast-travel-check.cjs` để đảm bảo giao thông trên sân trường thông suốt.
