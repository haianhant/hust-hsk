# AI Agent Guidelines — HUSTVerse — Bách Khoa 3D

Tài liệu hướng dẫn ngắn gọn dành cho các AI Coding Agents làm việc trên dự án **HUSTVerse — Bách Khoa 3D** (không gian mô phỏng & game 3D tương tác ĐHBK Hà Nội với kiến trúc Core World + Pluggable Modes, trong đó `HSK Mode` tách riêng có thể bật/tắt).
**Nguồn tài liệu kiến trúc trung tâm:** [`docs/README.md`](./docs/README.md).

---

## 1. Bản đồ Tài liệu Bắt buộc Đọc Trước Khi Sửa Code

Trước khi thay đổi bất kỳ phân hệ nào, hãy đọc tài liệu đặc tả tương ứng trong [`docs/`](./docs/README.md):

- **Kiến trúc tổng thể & Ranh giới Module:** [`docs/architecture/overview.md`](./docs/architecture/overview.md), [`docs/architecture/frontend.md`](./docs/architecture/frontend.md)
- **Hệ tọa độ, `BOUNDS` & Va chạm 2D:** [`docs/architecture/world-coordinate-system.md`](./docs/architecture/world-coordinate-system.md)
- **Giao thức Multiplayer & Durable Object Hibernation:** [`docs/architecture/multiplayer.md`](./docs/architecture/multiplayer.md)
- **Hệ thống Tương tác, Xe máy & Fast Travel:** [`docs/architecture/interaction-system.md`](./docs/architecture/interaction-system.md)
- **Đặc tả Tòa nhà & Cảnh quan (`building.*`, `landscape.*`) & Bản đồ Chuẩn [`https://hustmap.com/`](https://hustmap.com/):** [`docs/world/buildings/README.md`](./docs/world/buildings/README.md), bản đồ số [`https://hustmap.com/`](https://hustmap.com/) (Source of Truth quy hoạch khuôn viên — bỏ `khuon-vien-truong.png`, chỉ làm gọn trong khuôn viên ĐHBK Hà Nội, không mở rộng sang khu ngoài trường) và tư liệu ảnh thật tại [`tham-khao/README.md`](./tham-khao/README.md)
- **Đặc tả Nhân vật & 10 Bộ Đồng phục HUST (`avatar.*`):** [`docs/world/avatar/rig-and-animation.md`](./docs/world/avatar/rig-and-animation.md), [`docs/world/avatar/outfits.md`](./docs/world/avatar/outfits.md)
- **Engine Học HSK 3–4 & Định hướng Pomodoro/Study Rooms:** [`docs/features/hsk-learning.md`](./docs/features/hsk-learning.md), [`docs/features/study-pomodoro.md`](./docs/features/study-pomodoro.md)
- **Cổng Kiểm thử Bắt buộc:** [`docs/testing/verification-gates.md`](./docs/testing/verification-gates.md)
- **Trạng thái Hiện tại & Lộ trình `PR1`–`PR6`:** [`docs/status/current.md`](./docs/status/current.md), [`docs/product/roadmap.md`](./docs/product/roadmap.md)

---

## 2. Năm Nguyên tắc Bất biến (Core Architectural Invariants)

1. **Single Source of Truth cho Hợp đồng & Tọa độ:**
   - Biên thế giới (`BOUNDS`), điểm xuất phát (`SPAWN`), `AVATAR`, `BIKE_*` và giao thức Multiplayer khai báo duy nhất tại [`shared/constants/world.ts`](./shared/constants/world.ts) và [`shared/contracts/multiplayer.ts`](./shared/contracts/multiplayer.ts) (thuần TypeScript, **cấm** import React, Three.js hay DOM).
   - Mọi vị trí công trình, hộp va chạm (`BUILDING_COLLIDERS`), đường đi (`ROADS`), vùng (`ZONES`) và điểm dịch chuyển nhanh (`FAST_TRAVEL_DESTINATIONS`) khai báo tập trung tại [`lib/campus.ts`](./lib/campus.ts).
2. **Độc lập giữa Nghiệp vụ Học tập và WebGL:**
   - `lib/learn/*` và `content/*` tuyệt đối không phụ thuộc vào `three` hay `components/three/*`.
3. **Trạng thái 60 FPS Mutable vs. Trạng thái React UI:**
   - Không gọi `React.setState` mỗi frame trong `useFrame`; sử dụng [`lib/playerState.ts`](./lib/playerState.ts) theo quy định tại [ADR-0004](./docs/adr/0004-mutable-frame-state-vs-react-ui-state.md).
4. **Độ Chính xác Kiến trúc ĐHBK Hà Nội (`https://hustmap.com/` Source of Truth) & Quản lý Bộ nhớ WebGL:**
   - Lấy **[`https://hustmap.com/`](https://hustmap.com/)** làm **Source of Truth** của bản đồ khuôn viên kết hợp [`docs/world/buildings/`](./docs/world/buildings/README.md) và [`tham-khao/`](./tham-khao/README.md) (tuyệt đối không dùng sơ đồ cũ `khuon-vien-truong.png`). Chỉ hoàn thiện đúng phạm vi khuôn viên ĐHBK Hà Nội trong `BOUNDS`, không làm quá rộng sang các trường/khu tập thể lân cận.
   - Đối chiếu chuẩn hình khối & hướng mặt tiền: Thư viện hướng Bắc `-Z`, C1 mái 9 sóng + gạch hoa gió đục lỗ, C7 chữ E 9 tầng chạy dọc Bắc–Nam với 3 cánh hướng Tây (`-X`) đã thay thế nhà C8 cũ, C9 cầu thang đỏ mặt Đông, Hồ Tiền chữ nhật.
   - Tuân thủ phân lớp chống Z-fighting và gọi `.dispose()` cho mọi `BufferGeometry`, `Material`, `CanvasTexture` trong `useEffect` cleanup.
5. **Bảo toàn Tương thích Ngược:**
   - Khi tách module, phải giữ nguyên các re-export facade tại đường dẫn cũ cho tới khi toàn bộ người gọi đã chuyển sang đường dẫn mới.

---

## 3. Sáu Cổng Kiểm thử Bắt buộc (`Verification Gates`)

Mọi thay đổi phải vượt qua toàn bộ 6 lệnh kiểm thử dưới đây (`exit code 0`):

```bash
npm run typecheck          # 1. Kiểm tra kiểu Frontend + Shared + Worker
npm run test:learn         # 2. 45/45 unit tests Engine học HSK 3–4 & SRS
npm run test:contracts     # 3. 5/5 tests Shared Contracts & DO Hibernation
npm run test:nav           # 4. 4/4 chặng đi bộ sân trường (test/leg-sim.cjs)
npm run test:mp            # 5. 12/12 kịch bản WebSocket Multiplayer qua shim
npm run build              # 6. Xuất bản tĩnh Next.js (out/) thành công
```

---

## 4. Quy tắc Git & Tự động Commit/Push (`Git Policy`)

- **Nhánh chính Production / Go-Live là `main`** (Vercel Production & GitHub Actions CI chạy qua nhánh mặc định `main`, đã loại bỏ nhánh `master`).
- **Luôn tự động `git commit` và `git push` lên nhánh hiện tại (`origin`)** ngay sau khi hoàn thành nhiệm vụ và vượt qua toàn bộ các cổng kiểm thử ở Mục 3.
- Không ghi đè hoặc hoàn tác các thay đổi chưa commit trong working tree.
- Không tự ý merge vào `main` hoặc deploy khi đang làm việc trên nhánh tính năng (`feat/*`) nếu chưa có yêu cầu từ người dùng.
