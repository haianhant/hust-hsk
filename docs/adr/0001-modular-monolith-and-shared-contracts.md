# ADR-0001: Kiến trúc Modular Monolith & Tầng Hợp đồng Dùng chung (`shared/`)

- **Trạng thái:** Đã chấp thuận & Triển khai bước đầu tại `PR1` (08/11/2026)
- **Bối cảnh:**
  - Dự án `hust-hsk` gồm một ứng dụng frontend Next.js 14 (`app/`, `components/`, `lib/`, `content/`) và một dịch vụ Cloudflare Worker + Durable Object (`worker/src/`) cùng nằm trong một repository.
  - Trước `PR1`, các hằng số thế giới (`BOUNDS`, `SPAWN`), danh sách đồng phục (`VALID_OUTFIT_IDS`), kiểu dữ liệu gói tin WebSocket và các hàm lọc (`sanitizeName`, `sanitizeMssv`) bị khai báo lặp lại ở 4 nơi (`lib/campus.ts`, `lib/identity.ts`, `lib/multiplayer.ts`, `worker/src/room.ts` và `test/ws-shim/server.js`).
  - Sự sao chép thủ công này đã dẫn tới lỗi thực tế: khi mở rộng Khu Đông Campus (`lib/campus.ts` mở `BOUNDS` tới `maxX: 168, maxZ: 108`), `worker/src/room.ts` vẫn giữ `maxX: 162, maxZ: 92` làm kẹp sai vị trí người chơi ở biên Đông và Nam.
- **Quyết định:**
  1. Giữ mô hình **Modular Monolith** trong cùng một repository thay vì tách thành nhiều repo hay dùng monorepo phức tạp (Turborepo/Nx) không cần thiết.
  2. Thiết lập thư mục [`shared/`](file:///home/bao/Hust3D/hust-hsk/shared) ở gốc dự án gồm:
     - [`shared/constants/world.ts`](file:///home/bao/Hust3D/hust-hsk/shared/constants/world.ts): Nguồn sự thật duy nhất cho `BOUNDS`, `SPAWN`, `AVATAR`, `BIKE_*` và `clampToWorldBounds`.
     - [`shared/contracts/multiplayer.ts`](file:///home/bao/Hust3D/hust-hsk/shared/contracts/multiplayer.ts): Nguồn sự thật duy nhất cho giao thức WebSocket, các mã ngoại hình hợp lệ và hàm kiểm tra tốc độ/tọa độ.
  3. Áp dụng quy tắc nghiêm ngặt: `shared/` không được import React, Three.js hay bất kỳ API trình duyệt nào để cả Next.js, Cloudflare Worker (`worker/tsconfig.json`) và Node.js test runner (`test/register-ts.cjs`) đều nạp trực tiếp được.
  4. Duy trì các re-export tương thích ngược tại `lib/campus.ts`, `lib/playerState.ts`, `lib/identity.ts`, `lib/multiplayer.ts` trong suốt quá trình refactor.
- **Hệ quả:**
  - Mọi thay đổi về biên khuôn viên, tốc độ di chuyển hoặc mẫu đồng phục mới tự động đồng bộ giữa Client, Worker và bộ test chỉ qua một nơi khai báo duy nhất, được bảo vệ bởi [`test/shared-contracts.test.cjs`](file:///home/bao/Hust3D/hust-hsk/test/shared-contracts.test.cjs).
