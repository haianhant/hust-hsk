# Bách khoa Hán ngữ 3D (`hust-hsk`) — Project Rules

## 1. Kiến trúc & Nguồn sự thật duy nhất (Single Source of Truth)
- **Tọa độ & Va chạm (`lib/campus.ts`):** Mọi hằng số vị trí công trình, kích thước footprint, hộp va chạm (`BUILDING_COLLIDERS`), đường đi (`ROADS`), vùng nhận diện (`ZONES`), điểm dịch chuyển nhanh (`FAST_TRAVEL_DESTINATIONS`), và chặng kiểm thử (`LEGS`) **bắt buộc** khai báo tại `lib/campus.ts`. Không hardcode tọa độ công trình rời rạc trong từng component.
- **Không giới hạn cứng mặt đất `200m × 200m`:** Cho phép mở rộng biên khuôn viên (`CAMPUS_SIZE` / `CAMPUS_BOUNDS`, ví dụ `300m × 260m` hoặc lớn hơn) và nới rộng diện tích lô đất của từng phân khu để dựng đúng tỉ lệ hình khối thực tế của **Thư viện Tạ Quang Bửu**, **Tòa C7 (khối chữ E 9 tầng)**, **Tòa B1 SoICT**, **Khu KTX B3–B13**, **Sân vận động Bách Khoa** và **Hồ Tiền**.
- **Hệ trục tọa độ chuẩn:**
  - Đơn vị: **mét (m)**.
  - `+X` = Đông (phía đường Trần Đại Nghĩa), `-X` = Tây (phía đường Giải Phóng).
  - `-Z` = Bắc (phía đường Đại Cồ Việt), `+Z` = Nam (phía đường Tạ Quang Bửu / Lê Thanh Nghị).
  - `Y = 0` là mặt đất cơ sở; `AVATAR.height = 1.7m`, `AVATAR.radius = 0.4m` là chuẩn tỉ lệ con người cho mọi cửa, bậc thang, lan can, bàn ghế.
- **Kết hợp linh hoạt Procedural PBR & Tài nguyên Thực tế (`tham-khao/`):**
  - Ưu tiên sinh **Canvas 2D (`THREE.CanvasTexture`)** có seed cố định (`mulberry32` / LCG) cho các bề mặt kiến trúc lặp lại (tường bê tông, gạch lát, ngói, nhựa đường, mặt nước) và bảng chữ qua `components/three/TextPlate.tsx`.
  - **Cho phép sử dụng texture/ảnh nén nhẹ** (hoặc trích xuất từ bộ 37 ảnh thật tại `tham-khao/`) cho các chi tiết biểu tượng đắt giá như phù điêu huy hiệu Cổng Parabol, logo/quốc huy ĐHBK Hà Nội, tranh ảnh lịch sử trưng bày trong sảnh Thư viện và biển hiệu đặc trưng.

## 2. Nguyên tắc Tái hiện Đại học Bách khoa Hà Nội (HUST Authenticity)
- **Bắt buộc lấy Bản đồ Khuôn viên ĐHBK Hà Nội & Bộ 37 ảnh thật `tham-khao/` làm chuẩn (Official Ground Truth):**
  - Mọi việc lập kế hoạch (`plan`), quy hoạch phân khu, định vị tọa độ `(x, z)`, hướng mặt tiền (`facing`), hình thái mặt bằng (`footprint`), màu sắc mặt đứng và trang phục sinh viên **bắt buộc** phải đối chiếu trực tiếp với:
    1. **Bản đồ Khuôn viên chính thức của Đại học Bách khoa Hà Nội** (kết hợp ảnh vệ tinh thực tế).
    2. **Bộ 37 ảnh chụp thực tế trong `tham-khao/`** (`thu-vien/`, `c1/`, `c7/`, `c9/`, `ho-tien/`, `cong-parabol/`, `b1-soict/`, `ktx/`, `dong-phuc/`). Mọi công trình trước khi dựng hoặc chỉnh sửa phải mở xem ảnh thật tương ứng trong `tham-khao/`.
- **Mốc không gian:** Khuôn viên HUST **trước đợt di dời cổng Parabol tháng 11/2026** (Cổng Parabol nằm tại biên đường Giải Phóng).
- **Nhận diện bằng kiến trúc thật (theo ảnh `tham-khao/`), không chỉ bằng biển tên:**
  - **Cổng Parabol (`tham-khao/cong-parabol/`):** Dải băng bê tông phẳng uốn parabol (không phải ống tròn), chân chôn trực tiếp xuống đất (không đặt trên bệ cao đồ sộ), có gờ chia khoang và 6 huy hiệu tròn nổi trên cả hai mặt đông/tây, nhà gác trắng và cổng xếp sắt đen.
  - **Tòa C1 & Quảng trường C1 (`tham-khao/c1/`):** 4 tầng, mái **đúng 9 gợn sóng nông** có bề dày vỏ, mặt tiền hành lang mở (loggia) với lan can đỏ/trắng, tháp cầu thang ốp **gạch hoa gió đục lỗ thật** ở chính giữa và đầu hồi đông, biểu trưng dọc đỏ/sao vàng và chữ C1, bậc thềm đá dài, cụm chữ 3D `I ❤ BK` đặt ở khoảng cách cân đối trên trục đường dạo sân cỏ trước tòa nhà.
  - **Thư viện Tạ Quang Bửu (`tham-khao/thu-vien/`):** Tháp 10 tầng chia 3 nhịp đứng hướng mặt chính về phía Bắc (`-Z`), khối giữa nhô trước + cao hơn nửa tầng, dải kính lõi thang dọc bên phải, khối đế ôm khối giữa với 2 cụm lam ngang xám hai bên **đồng hồ tròn đặt thấp** ngay trên mái hiên sảnh, biển chữ vàng `"THƯ VIỆN TẠ QUANG BỬU"`, sảnh 6 cột vuông xám, tiền cảnh có chữ `HUST` đỏ 3D trên bệ đen và hàng cau/cây xanh.
  - **Hồ Tiền (`tham-khao/ho-tien/`):** Hình chữ nhật trục Bắc–Nam, bờ kè đá có gờ bê tông và lối dạo lát gạch, đèn sân vườn, hàng liễu rủ ven hồ, mặt hồ phủ sen/súng hồng có khoảng nước thoáng, nhìn sang dãy nhà D trắng phía đối diện.
  - **Tòa C9 (`tham-khao/c9/`):** Khối nhà trắng/kem 4 tầng với **cầu thang bộ ngoài trời gấp khúc zic-zac** gắn mặt đông, mỗi vế thang khớp đúng cao độ sàn tầng, lan can kim loại đỏ mảnh, khoảng rỗng dưới gầm thang nhìn xuyên được.
  - **Tòa C7 (`tham-khao/c7/`):** Khối nhà lớn màu trắng hiện đại tạo hình **chữ E** (nhìn từ flycam), tầng 1–2 vách kính cao làm giảng đường, các tầng trên cửa sổ khung tối xếp lưới đều, có sân trong trồng cây xanh và mái phẳng có ô mái ngói đỏ/thiết bị kỹ thuật.
  - **Tòa B1 SoICT & Khu KTX (`tham-khao/b1-soict/`, `tham-khao/ktx/`):** Tòa B1 có mặt chính góc cong đặc trưng, tầng trệt ốp đỏ nâu, biển `B1`; Khu KTX gồm nhà B9 màu vàng có sân trong/cổng Hội Sinh viên và tòa KTX mới cao tầng sơn xanh–trắng.
  - **Nhân vật & Đồng phục HUST (`tham-khao/dong-phuc/`):** Hỗ trợ sinh viên Nam & Nữ tỉ lệ chuẩn, mặc định **Áo khoác gió đồng phục HUST** (thân trên & vai trắng phối thân dưới đỏ Bách khoa cắt chữ V trước ngực) cùng các mẫu **Áo Bomber HUST** (đỏ-ghi, xanh-trắng, đỏ-xanh), **Áo Polo đỏ cổ viền trắng** và **Áo sơ mi**.

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
3. `node test/leg-sim.cjs` — 4/4 chặng di chuyển trong sân trường (hỗ trợ tìm đường tự động theo mạng lưới giao thông `ROADS` / A* quanh vật cản, không ép đi cắt chéo đường chim bay xuyên qua tòa nhà hay hồ nước).
4. `npm run build` — Xuất bản tĩnh Next.js (`out/`) thành công.

## 5. Quy trình Git & Đồng bộ Nhánh Bắt buộc (Git Push Policy)
- Sau khi hoàn thành triển khai mỗi công việc/yêu cầu và vượt qua đầy đủ 4 cổng kiểm thử ở Mục 4, **bắt buộc** thực hiện `git commit` trong `/home/bao/Hust3D/hust-hsk` và đẩy (`git push`) đồng thời lên cả hai nhánh **`main`** và **`master`** (`git push origin HEAD:main HEAD:master`).
