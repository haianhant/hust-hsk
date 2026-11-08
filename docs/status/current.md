# Trạng thái Hệ thống Hiện tại (`Current Status`)

*Cập nhật lần cuối: 08/11/2026 — Hoàn tất toàn bộ chuỗi `PR1` – `PR6` (`PR6 — Study & Social Architecture Preparation`).*

---

## 1. Tiến độ Chuỗi Refactoring (`PR1` – `PR6`)

| Giai đoạn | Trạng thái | Ghi chú Kết quả |
|---|---|---|
| **`PR1 — Foundation, Safety & Shared Contracts`** | **HOÀN THÀNH** | Đã tạo `shared/constants/world.ts`, `shared/contracts/multiplayer.ts`, sửa lỗi DO Hibernation trong `worker/src/room.ts`, thêm `test/shared-contracts.test.cjs` (5/5 PASS) và `.github/workflows/ci.yml`. |
| **`PR2 — Documentation Architecture`** | **HOÀN THÀNH** | Đã chuẩn hóa cây tài liệu `docs/`, định danh Module IDs, viết 5 ADRs, đồng bộ `GEMINI.md`, `AGENTS.md`, `README.md` và `tham-khao/README.md`. |
| **`PR3 — Campus World Data Refactoring`** | **HOÀN THÀNH** | Đã tách `lib/campus.ts` thành 7 module dưới `features/campus/world-data/` (`bounds`, `buildings`, `roads`, `colliders`, `zones`, `navigation`, `spatial-utils`), giữ `lib/campus.ts` làm compatibility facade (16 dòng) và thêm `test/world-data.test.cjs` (6/6 PASS). |
| **`PR4 — 3D Components Modularization`** | **HOÀN THÀNH** | Đã tách `CampusExpansion.tsx` (5 module tại `features/campus/buildings/` & `landscape/`), `Landmarks.tsx` (3 module tại `features/campus/landscape/` & `buildings/`), và `StudentAvatar.tsx` (8 module tại `features/avatar/rig/`, `appearance/`, `animation/`), giữ nguyên 100% hình học/vật liệu/animation cùng 3 compatibility facades và thêm `test/avatar-modules.test.cjs` (3/3 PASS). |
| **`PR5 — Application UI & Gameplay Separation`** | **HOÀN THÀNH** | Đã thu gọn `app/page.tsx` từ `2.148` dòng xuống `1.023` dòng bằng cách tách 8 module chuyên biệt tại `features/campus/ui/`, `features/campus/interaction/`, `features/learning/hsk/`, và `features/social/multiplayer/`, kèm unit test `test/ui-gameplay.test.cjs` (3/3 PASS). |
| **`PR6 — Study & Social Architecture Preparation`** | **HOÀN THÀNH** | Đã thiết lập `shared/contracts/study.ts`, `features/study/pomodoro/`, `features/study/study-session/`, `features/study/focus-mode/`, `features/social/rooms/`, `features/social/presence/`, `ADR-0005` và unit test `test/study-social-contracts.test.cjs` (6/6 PASS). |

---

## 2. Trạng thái Các Phân hệ Sản phẩm (System Health Matrix)

| Phân hệ | Quy mô / Chỉ số | Cổng Kiểm thử | Trạng thái |
|---|---|---|---|
| **Khuôn viên 3D & Kiến trúc HUST** | Biên `264m × 184m` (`x: -96..168`, `z: -76..108`), 43 công trình/hạng mục trên bản đồ, 2 không gian nội thất (`Classroom`, `LibraryLobby`), 3 chế độ thời gian (`day`, `sunset`, `night`). | `npm run test:nav` (`4/4` chặng), `node test/walk-to-library-door.cjs` | Ổn định |
| **Nhân vật & Đồng phục HUST** | 2 giới tính (`male`, `female`), 10 bộ đồng phục HUST, 6 kiểu tóc, tùy chọn chân váy xếp ly, kính, balo, thẻ SV. | `npm run typecheck`, `npm run test:contracts`, `npm run test:mp` | Ổn định |
| **Phương tiện & Dịch chuyển** | 1 xe máy cá nhân (`BIKE_MAX_SPEED = 14 m/s`), 6 điểm Dịch chuyển nhanh (`FAST_TRAVEL_DESTINATIONS`), Bản đồ toàn cảnh (`Phím M`). | `node test/ride-check.cjs`, `node test/fast-travel-check.cjs` | Ổn định |
| **Nội dung & Engine Học HSK 3–4** | **1.057 từ vựng** (246 từ HSK 3 + 811 từ HSK 4), 29 bài, **50 nhiệm vụ**, lịch ôn SRS, sổ lỗi, 6 huy hiệu toàn cục. | `npm run test:learn` (`45/45` unit tests) | Ổn định |
| **Multiplayer Realtime** | 5 phòng (`hsk-1`..`hsk-5`), tối đa 15 người/phòng, đồng bộ vị trí + hướng + trạng thái + 10 bộ đồng phục, hỗ trợ DO Hibernation. | `npm run test:contracts` (`5/5`), `npm run test:mp` (`12/12`) | Ổn định |
| **Build & Xuất bản Tĩnh** | Next.js 14 `output: 'export'` (`out/`), Cloudflare Worker (`worker/`). | `npm run typecheck` + `npm run build` | Ổn định |

---

## 3. Các Điểm Lưu ý Kỹ thuật Hiện tại

1. **Các file nguồn đã tách (`PR3`–`PR5`):**
   - [`lib/campus.ts`](file:///home/bao/Hust3D/hust-hsk/lib/campus.ts) (`15` dòng) — đã chuyển thành compatibility facade trỏ về `features/campus/world-data/` ở `PR3`.
   - [`components/three/CampusExpansion.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/CampusExpansion.tsx) (`105` dòng), [`components/three/Landmarks.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/Landmarks.tsx) (`78` dòng) và [`components/three/StudentAvatar.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/StudentAvatar.tsx) (`27` dòng) — đã chuyển thành compatibility compositors/facades trỏ về `features/campus/buildings/`, `features/campus/landscape/` và `features/avatar/` ở `PR4`.
   - [`app/page.tsx`](file:///home/bao/Hust3D/hust-hsk/app/page.tsx) (`1.023` dòng) — đã chuyển thành composition root mỏng kết nối `features/campus/ui/`, `features/campus/interaction/`, `features/learning/hsk/`, và `features/social/multiplayer/` ở `PR5`.
2. **Tài nguyên ảnh tham khảo trong `tham-khao/`:**
   - Hiện có **31 file ảnh `.jpg` thực tế trên đĩa** phân bổ trong 9 thư mục chuyên đề (`thu-vien/`: 5, `c1/`: 6, `c7/`: 4, `c9/`: 1, `cong-parabol/`: 4, `b1-soict/`: 3, `ktx/`: 3, `ho-tien/`: 2, `dong-phuc/`: 3) cùng 7 mô tả mẫu đồng phục kèm URL nguồn báo Dân Trí trong [`tham-khao/dong-phuc/README.md`](file:///home/bao/Hust3D/hust-hsk/tham-khao/dong-phuc/README.md).
