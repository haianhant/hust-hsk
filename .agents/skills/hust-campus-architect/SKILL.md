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

### Bước 1: Đối chiếu Bản đồ Khuôn viên Chuẩn & Bảng thông số Kiến trúc HUST
1. **Bắt buộc lấy Bản đồ Khuôn viên ĐHBK Hà Nội làm chuẩn (Ground Truth):**
   - Trước khi lập plan hoặc xây dựng bất kỳ tòa nhà/công trình nào, phải đối chiếu trực tiếp với **Bản đồ Khuôn viên trường ĐHBK Hà Nội** (tài liệu bản đồ chuẩn do người dùng cung cấp hoặc lưu trong `docs/`) để xác định chính xác vị trí tương đối giữa 4 tuyến phố (Đại Cồ Việt – Giải Phóng – Trần Đại Nghĩa – Tạ Quang Bửu), hướng mặt chính và kết nối giao thông nội bộ.
2. Đọc bảng thông số kiến trúc chuẩn của từng công trình tại:
   - [hust-landmarks-spec.md](./references/hust-landmarks-spec.md)
3. Kiểm tra kỹ tư liệu gốc trong `docs/campus-reference.md`, `docs/reference-visual.md`, `docs/satellite-and-c9.md` và `docs/ref-library-studywithhuster.md`.
3. **Nguyên tắc vàng:**
   - Chi tiết nào đã xác minh qua ảnh thật (như 9 sóng mái C1, gạch hoa gió khe chữ nhật đứng, dải băng phẳng Parabol + huy hiệu tròn, cầu thang đỏ zic-zac C9, tháp 3 nhịp + đồng hồ thấp của Thư viện Tạ Quang Bửu) phải dựng đúng tỉ lệ và hình khối.
   - Chi tiết nào chưa có tư liệu ảnh xác thực thì ghi chú rõ trong comment code, không tự bịa truyền thuyết hay chữ khắc sai lệch lịch sử.

### Bước 2: Cập nhật Nguồn dữ liệu trung tâm (`lib/campus.ts`)
Trước khi vẽ mesh 3D, cập nhật `lib/campus.ts`:
1. Khai báo hằng số tọa độ tâm (`center`), kích thước (`size`), số tầng (`floors`), chiều cao tầng (`floorHeight`).
2. Thêm hộp va chạm AABB vào `BUILDING_COLLIDERS` (nới `0.1–0.5m` ở các gờ bậc/tường nếu cần, nhưng chừa sảnh/mái hiên để avatar đi bộ vào dưới mái hiên trước cửa).
3. Nếu thêm thân cây gần đường đi, thêm tọa độ `(x, z)` vào `TREE_TRUNKS` để xe máy (`resolveBikeCollisions`) nhận diện va chạm.
4. Nếu công trình là điểm đến mới, cập nhật `ZONES` (để HUD và `Minimap.tsx` hiển thị tên khu vực) và kiểm tra `FAST_TRAVEL_DESTINATIONS` (điểm đứng phải thỏa mãn `resolveCollisions(pos, AVATAR.radius).hit === null`).

### Bước 3: Dựng Component 3D (`components/three/`)
1. Tạo hoặc cập nhật file component riêng trong `components/three/` (ví dụ `C1Building.tsx`, `LibraryBuilding.tsx`, `C2Hall.tsx`, `DBlocks.tsx`) và gắn vào `Landmarks.tsx` hoặc `CampusScene.tsx`.
2. Sử dụng `AVATAR.height = 1.7m` làm thước đo tỉ lệ:
   - Bậc thềm cao `0.15–0.17m`, sâu `0.29–0.60m`.
   - Lan can cao `0.95–1.05m`.
   - Cửa đi cao `2.4–2.8m`, tầng nhà cao `3.2–3.6m`.
3. Tuân thủ quy tắc chống z-fighting: mọi mặt song song lệch nhau `>= 0.02m`, các khối giao nhau nhúng `0.02–0.05m`.

### Bước 4: Đồng bộ Bản đồ thu nhỏ (`components/ui/Minimap.tsx`)
Nếu thêm tòa nhà chính, hồ nước hoặc tuyến đường mới, kiểm tra `components/ui/Minimap.tsx` để đảm bảo hình chiếu 2D trên minimap phản ánh đúng footprint mới.

### Bước 5: Chạy Kiểm thử Va chạm & Điều hướng
Chạy `node test/leg-sim.cjs` và `node test/fast-travel-check.cjs` (hoặc dùng skill `web-3d-visual-audit`) để đảm bảo không làm kẹt đường đi của người chơi hay NPC.
