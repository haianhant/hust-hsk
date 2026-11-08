# Bách khoa Hán ngữ 3D (`hust-hsk`) — Project Rules

> **Tài liệu Kiến trúc Trung tâm:** Xem bản đồ toàn bộ tài liệu kỹ thuật, danh mục Module IDs (`building.*`, `avatar.*`, `feature.*`) và ADRs tại **[`docs/README.md`](./docs/README.md)** (cùng hướng dẫn tóm tắt tại **[`AGENTS.md`](./AGENTS.md)**).

## 1. Kiến trúc & Nguồn sự thật duy nhất (Single Source of Truth)
- **Hằng số Thế giới & Hợp đồng Chia sẻ ([`shared/constants/world.ts`](./shared/constants/world.ts), [`shared/contracts/multiplayer.ts`](./shared/contracts/multiplayer.ts), [`lib/campus.ts`](./lib/campus.ts)):**
  - Biên khuôn viên (`BOUNDS = { minX: -96, maxX: 168, minZ: -76, maxZ: 108 }`), điểm xuất phát (`SPAWN`), thông số con người (`AVATAR`) và xe máy (`BIKE_*`) cùng giao thức Multiplayer giữa Frontend và Cloudflare Worker được khai báo tập trung tại `shared/constants/world.ts` và `shared/contracts/multiplayer.ts` (không phụ thuộc React/Three.js/DOM). Chi tiết: [`docs/architecture/overview.md`](./docs/architecture/overview.md) & [`docs/architecture/multiplayer.md`](./docs/architecture/multiplayer.md).
  - Mọi hằng số vị trí công trình, kích thước footprint, hộp va chạm (`BUILDING_COLLIDERS`), đường đi (`ROADS`), vùng nhận diện (`ZONES`), điểm dịch chuyển nhanh (`FAST_TRAVEL_DESTINATIONS`), và chặng kiểm thử (`LEGS`) **bắt buộc** khai báo tại `lib/campus.ts`. Không hardcode tọa độ công trình rời rạc trong từng component.
- **Hệ trục tọa độ chuẩn ([`docs/architecture/world-coordinate-system.md`](./docs/architecture/world-coordinate-system.md)):**
  - Đơn vị: **mét (m)**. `+X` = Đông (phía đường Trần Đại Nghĩa), `-X` = Tây (phía đường Giải Phóng), `-Z` = Bắc (phía đường Đại Cồ Việt), `+Z` = Nam (phía đường Tạ Quang Bửu / Lê Thanh Nghị).
  - `Y = 0` là mặt đất cơ sở; `AVATAR.height = 1.7m`, `AVATAR.radius = 0.4m` là chuẩn tỉ lệ con người cho mọi cửa, bậc thang, lan can, bàn ghế.
- **Kết hợp linh hoạt Procedural PBR & Tài nguyên Thực tế ([`tham-khao/`](./tham-khao/README.md)):**
  - Ưu tiên sinh **Canvas 2D (`THREE.CanvasTexture`)** có seed cố định (`mulberry32` / LCG) cho các bề mặt kiến trúc lặp lại và bảng chữ qua `components/three/TextPlate.tsx` ([ADR-0002](./docs/adr/0002-procedural-pbr-and-zero-external-3d-assets.md)).

## 2. Nguyên tắc Tái hiện Đại học Bách khoa Hà Nội (HUST Authenticity)
- **Bắt buộc lấy Bản đồ Khuôn viên ĐHBK Hà Nội & Bộ ảnh thật [`tham-khao/`](./tham-khao/README.md) làm chuẩn (Official Ground Truth):**
  - Mọi việc quy hoạch phân khu, định vị tọa độ `(x, z)`, hướng mặt tiền (`facing`), hình thái mặt bằng (`footprint`), màu sắc mặt đứng và trang phục sinh viên phải tuân thủ đặc tả tại **[`docs/world/buildings/`](./docs/world/buildings/README.md)** và **[`docs/world/avatar/`](./docs/world/avatar/outfits.md)**.
  - **Mốc không gian:** Khuôn viên HUST **trước đợt di dời cổng Parabol tháng 11/2026** (Cổng Parabol nằm tại biên đường Giải Phóng).
- **Bất biến kiến trúc của các công trình biểu tượng:**
  - **`building.parabol-gate` ([`c9-parabol-lake.md`](./docs/world/buildings/c9-parabol-lake.md)):** Dải băng bê tông phẳng uốn parabol (không phải ống tròn), chân chôn trực tiếp xuống đất, gờ chia khoang và 6 huy hiệu tròn nổi trên cả hai mặt đông/tây, nhà gác trắng và cổng xếp sắt đen.
  - **`building.c1` ([`c1.md`](./docs/world/buildings/c1.md)):** 4 tầng, mái **đúng 9 gợn sóng nông** có bề dày vỏ, mặt tiền hành lang mở (loggia) với lan can đỏ/trắng, tháp cầu thang ốp **gạch hoa gió đục lỗ thật** ở chính giữa và đầu hồi đông, biểu trưng dọc đỏ/sao vàng và chữ C1, bậc thềm đá dài, cụm chữ 3D `I ❤ BK` trên trục đường dạo sân cỏ trước tòa nhà.
  - **`building.library` ([`library.md`](./docs/world/buildings/library.md)):** Tháp 10 tầng chia 3 nhịp đứng hướng mặt chính về phía Bắc (`-Z`), khối giữa nhô trước + cao hơn nửa tầng, dải kính lõi thang dọc bên phải, khối đế ôm khối giữa với 2 cụm lam ngang xám hai bên **đồng hồ tròn đặt thấp** ngay trên mái hiên sảnh, biển chữ vàng `"THƯ VIỆN TẠ QUANG BỬU"`, sảnh 6 cột, tiền cảnh có chữ `HUST` đỏ 3D trên bệ đen và hàng cau.
  - **`landscape.tien-lake` ([`c9-parabol-lake.md`](./docs/world/buildings/c9-parabol-lake.md)):** Hình chữ nhật trục Bắc–Nam (`45m × 88m`), bờ kè đá có gờ bê tông, đèn sân vườn, hàng liễu rủ ven hồ, mặt hồ phủ sen/súng hồng có khoảng nước thoáng.
  - **`building.c9` ([`c9-parabol-lake.md`](./docs/world/buildings/c9-parabol-lake.md)):** Khối nhà trắng/kem 4 tầng với **cầu thang bộ ngoài trời gấp khúc zic-zac** gắn mặt đông (4 vế × 3.4m khớp đúng cao độ sàn tầng), lan can kim loại đỏ mảnh, khung cửa sổ 3D và cửa gỗ tầng trệt.
  - **`building.c7` ([`c7.md`](./docs/world/buildings/c7.md)):** Khối nhà lớn 9 tầng màu trắng hiện đại tạo hình **chữ E** (3 cánh nhô về phía Nam tạo 2 sân trong trồng cây xanh), tầng 1–2 vách kính cao làm giảng đường, mái phẳng có ô mái ngói đỏ.
  - **`building.b1-soict` & `building.dorm-complex` ([`east-campus.md`](./docs/world/buildings/east-campus.md)):** Tòa B1 có mặt chính góc cong đặc trưng, tầng trệt ốp đỏ nâu, biển `B1`; Khu KTX gồm nhà B9 màu vàng có sân trong/cổng Hội Sinh viên và tòa KTX mới cao tầng sơn xanh–trắng.
  - **`avatar.rig` & `avatar.outfit.*` ([`outfits.md`](./docs/world/avatar/outfits.md)):** Sinh viên Nam & Nữ tỉ lệ chuẩn với 10 bộ đồng phục HUST (mặc định **Áo khoác gió HUST** trắng–đỏ cắt chữ V, 3 mẫu **Áo Bomber**, **Áo Polo đỏ**, **Áo Hoodie đỏ**, **Áo phông xanh**, **Sơ mi trắng/xanh**, **Sweater kem**) và tùy chọn **Chân váy xếp ly chữ A** cho Nữ.

## 3. Quy chuẩn Đồ họa & Hiệu năng 3D ([`docs/architecture/frontend.md`](./docs/architecture/frontend.md))
- **Chống nhấp nháy (Anti-Z-Fighting):**
  - Các lớp mặt phẳng ngang trên mặt đất phải chênh nhau `>= 0.008m – 0.01m` theo trục Y (Cỏ `0.00` → Quảng trường `0.015` → Đường `0.02` → Vỉa hè/Mạch lát `0.025–0.035`). Cắt bỏ đoạn đường chồng lên quảng trường bằng thuật toán Liang–Barsky.
  - Các chi tiết mặt đứng (khung cửa, mặt kính, thanh đố mullion, biển chữ) phải lệch nhau `>= 0.02m` theo pháp tuyến mặt tường.
  - Các khối hình học giao nhau phải nhúng sâu vào nhau `0.02m – 0.05m` thay vì đặt chạm khít mặt.
- **Tối ưu Draw Calls & Quản lý Bộ nhớ WebGL:**
  - Gộp các khối tĩnh cùng vật liệu bằng `mergeBoxes` (`BufferGeometry`) hoặc dùng `InstancedMesh` cho các vật thể lặp lại số lượng lớn.
  - Mọi `BufferGeometry`, `CanvasTexture`, `Material` khởi tạo trong `useMemo` **bắt buộc** được giải phóng (`.dispose()`) trong `useEffect` cleanup.

## 4. Kiểm thử Hồi quy Bắt buộc ([`docs/testing/verification-gates.md`](./docs/testing/verification-gates.md))
Sau mỗi thay đổi về 3D, kiến trúc hoặc logic, phải đảm bảo 6 lệnh sau chạy PASS (exit code 0):
1. `npm run typecheck` (`npx tsc --noEmit && npx tsc --noEmit -p worker/tsconfig.json`) — Kiểm tra kiểu TypeScript cho cả Frontend, Shared Contracts và Cloudflare Worker.
2. `npm run test:learn` (`node test/learn.test.cjs`) — 45/45 unit test của engine học HSK & SRS.
3. `npm run test:contracts` (`node --test test/shared-contracts.test.cjs`) — 5/5 unit test cho shared contracts, đồng bộ `BOUNDS`, tốc độ di chuyển và phục hồi trạng thái Durable Object sau hibernation.
4. `npm run test:nav` (`node test/leg-sim.cjs`) — 4/4 chặng di chuyển trong sân trường theo mạng lưới giao thông `ROADS` / A*.
5. `npm run test:mp` (`node test/mp-protocol.cjs`) — 12/12 kịch bản kiểm thử giao thức WebSocket Multiplayer qua shim.
6. `npm run build` — Xuất bản tĩnh Next.js (`out/`) thành công.

## 5. Quy trình Git An toàn (Safe Git Policy)
- **Không tự động commit, push, merge hoặc deploy** lên nhánh `main` hay `master` khi chưa có yêu cầu rõ ràng từ người dùng.
- Chỉ thực hiện `git commit` hoặc `git push` khi người dùng yêu cầu trực tiếp và sau khi toàn bộ các cổng kiểm thử ở Mục 4 đã PASS.
