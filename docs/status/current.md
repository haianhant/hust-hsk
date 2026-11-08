# Trạng thái Hệ thống Hiện tại (`Current Status`)

*Cập nhật lần cuối: 08/11/2026 — Hoàn tất chuỗi tái cấu trúc `PR1` – `PR6` và triển khai tính năng sản phẩm `PR7 — HUST-HSK Study Experience MVP`.*

---

## 1. Tiến độ Chuỗi PR Kỹ thuật & Sản phẩm (`PR1` – `PR7`)

| Giai đoạn | Trạng thái | Ghi chú Kết quả |
|---|---|---|
| **`PR1 — Foundation, Safety & Shared Contracts`** | **HOÀN THÀNH (Đã kiểm thử)** | Đã tạo [`shared/constants/world.ts`](../../shared/constants/world.ts), [`shared/contracts/multiplayer.ts`](../../shared/contracts/multiplayer.ts), sửa lỗi DO Hibernation trong [`worker/src/room.ts`](../../worker/src/room.ts), thêm [`test/shared-contracts.test.cjs`](../../test/shared-contracts.test.cjs) (5/5 PASS) và `.github/workflows/ci.yml`. |
| **`PR2 — Documentation Architecture`** | **HOÀN THÀNH** | Đã chuẩn hóa cây tài liệu `docs/`, định danh Module IDs, viết 5 ADRs, đồng bộ `GEMINI.md`, `AGENTS.md`, `README.md` và `tham-khao/README.md`. |
| **`PR3 — Campus World Data Refactoring`** | **HOÀN THÀNH (Đã kiểm thử)** | Đã tách [`lib/campus.ts`](../../lib/campus.ts) thành 7 module dưới `features/campus/world-data/` (`bounds`, `buildings`, `roads`, `colliders`, `zones`, `navigation`, `spatial-utils`), giữ `lib/campus.ts` làm compatibility facade và thêm [`test/world-data.test.cjs`](../../test/world-data.test.cjs) (6/6 PASS). |
| **`PR4 — 3D Components Modularization`** | **HOÀN THÀNH (Đã kiểm thử)** | Đã tách `CampusExpansion.tsx`, `Landmarks.tsx`, và `StudentAvatar.tsx` thành các module chuyên biệt tại `features/campus/` và `features/avatar/`, giữ nguyên 100% hình học/vật liệu/animation và thêm [`test/avatar-modules.test.cjs`](../../test/avatar-modules.test.cjs) (3/3 PASS). |
| **`PR5 — Application UI & Gameplay Separation`** | **HOÀN THÀNH (Đã kiểm thử)** | Đã thu gọn [`app/page.tsx`](../../app/page.tsx) bằng cách tách các module tại `features/campus/ui/`, `features/campus/interaction/`, `features/learning/hsk/`, và `features/social/multiplayer/`, kèm unit test [`test/ui-gameplay.test.cjs`](../../test/ui-gameplay.test.cjs) (4/4 PASS). |
| **`PR6 — Study & Social Architecture Preparation`** | **HOÀN THÀNH (Đã kiểm thử)** | Đã thiết lập [`shared/contracts/study.ts`](../../shared/contracts/study.ts), `features/study/pomodoro/`, `features/study/study-session/`, `features/study/focus-mode/`, `features/social/rooms/`, `features/social/presence/`, [`ADR-0005`](../adr/0005-wall-clock-pomodoro-and-authoritative-seat-occupancy.md). |
| **`PR7 — HUST-HSK Study Experience MVP`** | **HOÀN THÀNH (Đã kiểm thử Unit & Playwright Browser)** | Đã tích hợp trải nghiệm Tự học (`🍅 Tự học` trên `CampusHud`, `StudyPanel`, `PomodoroTimer` với nhịp 25/5 & 50/10, `StudyTaskList`, `StudySessionSummary`, `FocusModeView` hỗ trợ `Normal 3D` / `Minimal HUD` / `Zen 2D`, lưu trữ đơn nguồn `bkhn_study_session_v1`), mở rộng [`test/study-social-contracts.test.cjs`](../../test/study-social-contracts.test.cjs) (9/9 PASS) và kiểm thử trình duyệt [`test/study-mvp-smoke.cjs`](../../test/study-mvp-smoke.cjs) (9/9 bước PASS). |

---

## 2. Trạng thái Các Phân hệ Sản phẩm (System Health Matrix)

| Phân hệ | Quy mô / Chỉ số | Cổng Kiểm thử | Trạng thái |
|---|---|---|---|
| **Khuôn viên 3D & Kiến trúc HUST** | Biên `264m × 184m` (`x: -96..168`, `z: -76..108`), điểm xuất phát tại **Cổng Trần Đại Nghĩa**, tường rào bao quanh khuôn viên, 2 không gian nội thất (`Classroom`, `LibraryLobby`), 3 chế độ thời gian (`day`, `sunset`, `night`). | `npm run test:world` (`6/6`), `npm run test:nav` (`4/4` chặng) | Đã triển khai & kiểm thử |
| **Không gian Tự học & Pomodoro (`Study MVP`)** | Đồng hồ Pomodoro wall-clock (`25/5` & `50/10`), quản lý việc cần làm (`StudyTaskList`), thống kê lịch sử phiên Focus, 3 chế độ Focus Mode (`off`, `minimal-hud`, `zen-2d`), bảo toàn phiên sau khi F5 và hoạt động cả khi offline Worker. | `npm run test:study` (`9/9`), `node test/study-mvp-smoke.cjs` (`9/9` bước trình duyệt) | Đã triển khai & kiểm thử trình duyệt |
| **Nhân vật & Đồng phục HUST** | 2 giới tính (`male`, `female`), 10 bộ đồng phục HUST, 6 kiểu tóc, tùy chọn chân váy xếp ly, kính, balo, thẻ SV. | `npm run typecheck`, `npm run test:avatar` (`3/3`), `npm run test:mp` | Đã triển khai & kiểm thử |
| **Phương tiện & Dịch chuyển** | 1 xe máy cá nhân (`BIKE_MAX_SPEED = 14 m/s`), 6 điểm Dịch chuyển nhanh (`FAST_TRAVEL_DESTINATIONS`), Bản đồ toàn cảnh. | `npm run test:world`, `node test/fast-travel-check.cjs` | Đã triển khai & kiểm thử |
| **Nội dung & Engine Học HSK 3–4** | **1.057 từ vựng** (246 từ HSK 3 + 811 từ HSK 4), 29 bài, **50 nhiệm vụ**, lịch ôn SRS, sổ lỗi, 6 huy hiệu toàn cục. | `npm run test:learn` (`45/45` unit tests) | Đã triển khai & kiểm thử |
| **Multiplayer Realtime** | 5 phòng (`hsk-1`..`hsk-5`), tối đa 15 người/phòng, đồng bộ vị trí + hướng + trạng thái + 10 bộ đồng phục, hỗ trợ DO Hibernation. | `npm run test:contracts` (`5/5`), `npm run test:mp` (`12/12`) | Đã triển khai & kiểm thử |
| **Study Rooms & Đặt ghế Realtime (`PR8+`)** | Hợp đồng `STUDY_ROOMS`, `STUDY_SEATS` và state machine `seat-manager.ts` đã có; giao thức WebSocket đặt ghế trực tiếp trên Worker & hoạt cảnh ngồi ghế 3D thuộc giai đoạn tiếp theo. | `npm run test:study` (unit test state machine) | Đã có hợp đồng (`PR6`), chờ nối mạng/UI ở `PR8+` |
| **Build & Xuất bản Tĩnh** | Next.js 14 `output: 'export'` (`out/`), Cloudflare Worker (`worker/`). | `npm run typecheck` + `npm run build` | Đã triển khai & kiểm thử |
