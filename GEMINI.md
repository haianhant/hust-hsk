# Bách khoa Hán ngữ 3D (`hust-hsk`) — Project Rules

## 1. Kiến trúc & Nguồn sự thật duy nhất (Single Source of Truth)
- **Tọa độ & Va chạm (`lib/campus.ts`):** Mọi hằng số vị trí công trình, kích thước footprint, hộp va chạm (`BUILDING_COLLIDERS`), đường đi (`ROADS`), vùng nhận diện (`ZONES`), điểm dịch chuyển nhanh (`FAST_TRAVEL_DESTINATIONS`), và chặng kiểm thử (`LEGS`) **bắt buộc** khai báo tại `lib/campus.ts`. Không hardcode tọa độ công trình rời rạc trong từng component.
- **Hệ trục tọa độ chuẩn:**
  - Đơn vị: **mét (m)**.
  - `+X` = Đông (phía đường Trần Đại Nghĩa), `-X` = Tây (phía đường Giải Phóng).
  - `-Z` = Bắc (phía đường Đại Cồ Việt), `+Z` = Nam (phía đường Tạ Quang Bửu / Lê Thanh Nghị).
  - `Y = 0` là mặt đất cơ sở; `AVATAR.height = 1.7m`, `AVATAR.radius = 0.4m` là chuẩn tỉ lệ con người cho mọi cửa, bậc thang, lan can, bàn ghế.
- **Không tải tài nguyên ngoài (Zero External Binary Assets):**
  - Không thêm ảnh `.jpg/.png`, font `.ttf/.woff`, hoặc model `.glb/.gltf` nặng vào `public/`.
  - Toàn bộ chữ, biển hiệu, mặt đồng hồ, quốc kỳ và vân bề mặt (procedural textures) phải sinh bằng **Canvas 2D (`THREE.CanvasTexture`)** qua `components/three/TextPlate.tsx` hoặc helper cục bộ có seed cố định (`mulberry32` / LCG).

## 2. Nguyên tắc Tái hiện Đại học Bách khoa Hà Nội (HUST Authenticity)
- **Bắt buộc lấy Bản đồ Khuôn viên ĐHBK Hà Nội làm chuẩn (Official Campus Map Ground Truth):**
  - Mọi việc lập kế hoạch (`plan`), quy hoạch phân khu, định vị tọa độ `(x, z)`, hướng mặt tiền (`facing`) và hình thái mặt bằng (`footprint`) của các tòa nhà, giảng đường, cổng trường, hồ nước, sân vận động **bắt buộc** phải đối chiếu và bám sát **Bản đồ Khuôn viên chính thức của Đại học Bách khoa Hà Nội** (kết hợp ảnh vệ tinh thực tế). Tuyệt đối không tự ý đặt vị trí công trình ngẫu nhiên trái với sơ đồ khuôn viên trường.
- **Mốc không gian:** Khuôn viên HUST **trước đợt di dời cổng Parabol tháng 11/2026** (Cổng Parabol nằm tại biên đường Giải Phóng).
- **Nhận diện bằng kiến trúc thật, không chỉ bằng biển tên:**
  - **Cổng Parabol:** Dải băng bê tông phẳng uốn parabol (không phải ống tròn), chân chôn trực tiếp xuống đất (không đặt trên bệ cao đồ sộ), có gờ chia khoang và 6 huy hiệu tròn nổi trên cả hai mặt đông/tây, nhà gác trắng và cổng xếp sắt đen.
  - **Tòa C1 & Quảng trường C1:** 4 tầng, mái **đúng 9 gợn sóng nông** có bề dày vỏ, mặt tiền hành lang mở (loggia) lùi cửa kính 3m sau hàng cột mảnh, tháp cầu thang ốp **gạch hoa gió đục lỗ thật** (nhìn xuyên thấy hốc tối và mép sàn sau lưới) ở chính giữa và đầu hồi đông, biểu trưng dọc đỏ/sao vàng và chữ C1 nâu đồng, 2 cây Lipa cổ thụ đối xứng, cụm chữ 3D `I ❤️ BK` trên bệ đen, Khối đá trắng nguyên khối khắc chữ 2 dòng.
  - **Thư viện Tạ Quang Bửu:** Tháp 10 tầng chia 3 nhịp đứng (khối giữa nhô trước + cao hơn nửa tầng, dải kính lõi thang dọc), khối đế ôm khối giữa với 2 cụm lam ngang xám (13 thanh) hai bên **đồng hồ tròn đặt thấp** ngay trên mái hiên sảnh (tầm tầng 2–3, không đặt sát nóc tầng 10), sảnh 6 cột vuông xám, tiền cảnh có chữ `HUST` đỏ 3D trên bệ đen, sân gạch đỏ-nâu đất nung và cây lộc vừng lá đỏ.
  - **Hồ Tiền:** Hình chữ nhật trục Bắc–Nam (tỉ lệ dài:rộng ≈ 2:1, ~4.000 m²), bờ kè đá hộc thấp có gờ bê tông, mặt hồ có các cụm lá súng có khe khuyết hình nêm + hoa súng hồng có thể tích + khoảng nước thoáng, hàng liễu ven hồ.
  - **Tòa C9 ("Cầu đỏ C9"):** Khối nhà trắng/kem 4 tầng với **cầu thang bộ ngoài trời gấp khúc zic-zac** gắn mặt đông, mỗi vế thang khớp đúng cao độ sàn tầng, lan can kim loại đỏ mảnh, khoảng rỗng dưới gầm thang nhìn xuyên được, tầng trệt cửa gỗ vàng.

## 3. Quy chuẩn Đồ họa & Hiệu năng 3D
- **Chống nhấp nháy (Anti-Z-Fighting):**
  - Các lớp mặt phẳng ngang trên mặt đất phải chênh nhau `>= 0.008m – 0.01m` theo trục Y (Cỏ `0.00` → Quảng trường `0.015` → Đường `0.02` → Vỉa hè/Mạch lát `0.025–0.035`). Cắt bỏ đoạn đường chồng lên quảng trường bằng thuật toán Liang–Barsky.
  - Các chi tiết mặt đứng (khung cửa, mặt kính, thanh đố mullion, biển chữ) phải lệch nhau `>= 0.02m` theo pháp tuyến mặt tường.
  - Các khối hình học giao nhau phải nhúng sâu vào nhau `0.02m – 0.05m` thay vì đặt chạm khít mặt.
- **Tối ưu Draw Calls & Quản lý Bộ nhớ WebGL:**
  - Gộp các khối tĩnh cùng vật liệu bằng `mergeBoxes` (`BufferGeometry`) hoặc dùng `InstancedMesh` cho các vật thể lặp lại số lượng lớn (lá/hoa súng, gạch lát, cột rào, cây nền).
  - Mọi `BufferGeometry`, `CanvasTexture`, `Material` khởi tạo trong `useMemo` **bắt buộc** được giải phóng (`.dispose()`) trong `useEffect` cleanup.

## 4. Kiểm thử Hồi quy Bắt buộc (Verification Gates)
Sau mỗi thay đổi về 3D, kiến trúc hoặc logic, phải đảm bảo các lệnh sau chạy PASS (exit code 0):
1. `npx tsc --noEmit` — Kiểm tra kiểu TypeScript không có lỗi.
2. `node test/learn.test.cjs` — 45/45 unit test của engine học HSK & SRS.
3. `node test/leg-sim.cjs` — 4/4 chặng di chuyển trong sân trường không bị kẹt collider.
4. `npm run build` — Xuất bản tĩnh Next.js (`out/`) thành công.

## 5. Quy trình Git & Đồng bộ Nhánh Bắt buộc (Git Push Policy)
- Sau khi hoàn thành triển khai mỗi công việc/yêu cầu và vượt qua đầy đủ 4 cổng kiểm thử ở Mục 4, **bắt buộc** thực hiện `git commit` trong `/home/bao/Hust3D/hust-hsk` và đẩy (`git push`) đồng thời lên cả hai nhánh **`main`** và **`master`** (`git push origin HEAD:main HEAD:master`).
