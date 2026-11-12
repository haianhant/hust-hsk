# Tài liệu Kiến trúc & Đặc tả Thế giới 3D — HUSTVerse — Bách Khoa 3D

Chào mừng đến với trung tâm tài liệu kỹ thuật của **HUSTVerse — Bách Khoa 3D** — không gian mô phỏng & game 3D tương tác khuôn viên Đại học Bách khoa Hà Nội (Multiplayer Sandbox, Co-Study Campus & hệ thống Chế độ gắn rời bao gồm `HSK Mode` bật/tắt tùy ý).

Bộ tài liệu này được thiết kế làm **nguồn sự thật kỹ thuật (Technical Ground Truth)** cho cả kỹ sư phát triển và các AI Agents.

---

## 1. Bản đồ Tài liệu Chính (Documentation Sitemap)

### Sản phẩm & Lộ trình (`docs/product/`)
- [Tầm nhìn Sản phẩm (`docs/product/vision.md`)](./product/vision.md) — Mục tiêu cốt lõi, triết lý tái hiện ĐHBK Hà Nội, phạm vi và nguyên tắc thiết kế.
- [Lộ trình Phát triển (`docs/product/roadmap.md`)](./product/roadmap.md) — Lịch sử các đợt phát triển (Đợt 1–8) và kế hoạch tái cấu trúc Modular Monolith (`PR1`–`PR6`).

### Kiến trúc Hệ thống (`docs/architecture/`)
- [Tổng quan Kiến trúc (`docs/architecture/overview.md`)](./architecture/overview.md) — Kiến trúc hiện tại, kiến trúc đích (Modular Monolith), phân tách trách nhiệm giữa Frontend / Shared Contracts / Cloudflare Worker.
- [Kiến trúc Frontend & 3D WebGL (`docs/architecture/frontend.md`)](./architecture/frontend.md) — Cấu trúc Next.js, React Three Fiber, tách biệt trạng thái frame (`playerState`) và trạng thái React UI, quản lý bộ nhớ WebGL.
- [Hệ trục Tọa độ & Thế giới 3D (`docs/architecture/world-coordinate-system.md`)](./architecture/world-coordinate-system.md) — Quy ước trục tọa độ, `BOUNDS`, phân lớp cao độ chống Z-fighting, hộp va chạm AABB và không gian nội thất.
- [Kiến trúc Multiplayer Realtime (`docs/architecture/multiplayer.md`)](./architecture/multiplayer.md) — Giao thức WebSocket, hợp đồng `shared/contracts/multiplayer.ts`, Cloudflare Durable Object `HskRoom` và cơ chế phục hồi sau Hibernation.
- [Kiến trúc Phòng Tự học & Chiếm chỗ Ghế Có Thẩm quyền Server (`docs/architecture/study-rooms.md`)](./architecture/study-rooms.md) — Quyền giữ chỗ ghế theo từng phòng `hsk-1`..`hsk-5`, 4 ghế `library-lobby`, giao thức `study:*`, hiển thị 3D `RemoteStudySeats` và bảo mật quyền riêng tư (`PR9`).
- [Hệ thống Tương tác & Điều khiển (`docs/architecture/interaction-system.md`)](./architecture/interaction-system.md) — Cơ chế tương tác vùng lân cận (`triggerRadius`), chuyển cảnh nội thất, lái xe máy, dịch chuyển nhanh và hook kiểm thử `window.__bkhn`.

### Đặc tả Thế giới 3D & Module IDs (`docs/world/`)
- [Danh mục Công trình & Phân khu (`docs/world/buildings/README.md`)](./world/buildings/README.md) — Tổng hợp tọa độ, kích thước và Module ID của toàn bộ công trình ĐHBK Hà Nội.
- [Tòa C1 & Quảng trường C1 (`docs/world/buildings/c1.md`)](./world/buildings/c1.md) — `building.c1`, `landmark.i-love-bk`, `landmark.white-rock`, `interior.c1-classroom`.
- [Thư viện Tạ Quang Bửu (`docs/world/buildings/library.md`)](./world/buildings/library.md) — `building.library`, `landmark.hust-sign`, `interior.library-lobby`.
- [Tổ hợp Tòa C7 & Cụm C6–C15 (`docs/world/buildings/c7.md`)](./world/buildings/c7.md) — `building.c7`, `building.c6`, `building.c15`.
- [Tòa C9, Cổng Parabol & Hồ Tiền (`docs/world/buildings/c9-parabol-lake.md`)](./world/buildings/c9-parabol-lake.md) — `building.c9`, `building.parabol-gate`, `landscape.tien-lake`.
- [Khu Đông Campus: B1 SoICT, KTX & Khu Thể chất (`docs/world/buildings/east-campus.md`)](./world/buildings/east-campus.md) — `building.b1-soict`, `building.dorm-complex`, `building.sports-complex`.
- [Hệ Khung xương & Chuyển động Nhân vật (`docs/world/avatar/rig-and-animation.md`)](./world/avatar/rig-and-animation.md) — `avatar.rig`, `avatar.animation`, `avatar.nameplate`.
- [Hệ thống 10 Bộ Đồng phục HUST (`docs/world/avatar/outfits.md`)](./world/avatar/outfits.md) — `avatar.outfit.windbreaker`, `avatar.outfit.bomber`, `avatar.outfit.polo`, `avatar.outfit.hoodie`, `avatar.outfit.tshirt`, `avatar.outfit.shirt`, `avatar.outfit.sweater`, `avatar.accessory.skirt`.

### Đặc tả Chế độ Chơi, Tự học & Học tập (`docs/features/`)
- **Hệ thống Chế độ Gắn rời (`lib/gameModes.ts`)** — `feature.modes.hsk-toggle` (Lớp Lõi Khám phá & Tương tác Bách Khoa 3D luôn bật; `HSK Mode` mặc định TẮT cho người mới và bật/tắt lưu bền vững qua `localStorage`).
- [Chế độ Học HSK 3–4 & SRS (`docs/features/hsk-learning.md`)](./features/hsk-learning.md) — `feature.learning.hsk` (1.057 từ, 50 nhiệm vụ, lịch ôn tập ngắt quãng SRS, sổ lỗi, huy hiệu — kích hoạt khi bật `HSK Mode`).
- [Kiến trúc Pomodoro & Study Rooms (`docs/features/study-pomodoro.md`)](./features/study-pomodoro.md) — `feature.study.pomodoro`, `feature.social.study-rooms` (`Co-Study Mode` tại Thư viện Tạ Quang Bửu).

### Quyết định Kiến trúc (`docs/adr/`)
- [ADR-0001: Kiến trúc Modular Monolith & Shared Contracts](./adr/0001-modular-monolith-and-shared-contracts.md)
- [ADR-0002: Procedural PBR & Không phụ thuộc Tài nguyên 3D Ngoài](./adr/0002-procedural-pbr-and-zero-external-3d-assets.md)
- [ADR-0003: Phục hồi Phiên WebSocket Hibernation trên Cloudflare Durable Object](./adr/0003-durable-object-websocket-hibernation.md)
- [ADR-0004: Tách biệt Trạng thái Frame Mutable và Trạng thái React UI](./adr/0004-mutable-frame-state-vs-react-ui-state.md)
- [ADR-0005: Đồng hồ Pomodoro theo Mốc Thời gian Thực & Quản lý Chỗ ngồi Authoritative](./adr/0005-wall-clock-pomodoro-and-authoritative-seat-occupancy.md)

### Kiểm thử & Trạng thái Hiện tại (`docs/testing/`, `docs/status/`)
- [Cổng Kiểm thử Bắt buộc (`docs/testing/verification-gates.md`)](./testing/verification-gates.md) — Hướng dẫn chạy và tiêu chuẩn nghiệm thu của 6 cổng kiểm thử tự động + bộ kiểm thử trình duyệt.
- [Trạng thái Hệ thống Hiện tại (`docs/status/current.md`)](./status/current.md) — Bảng tổng hợp trạng thái các phân hệ và tiến độ tái cấu trúc.

---

## 2. Bảng Đăng ký Module Chuẩn (Canonical Module Registry)

| Module ID | Tên Phân hệ / Công trình | Source Chính Hiện tại | Tài liệu Đặc tả | Trạng thái |
|---|---|---|---|---|
| `world.constants` | Biên thế giới, điểm xuất phát, chuẩn tỉ lệ | `shared/constants/world.ts`, `lib/campus.ts` | [world-coordinate-system.md](./architecture/world-coordinate-system.md) | Production (`PR1`) |
| `building.parabol-gate` | Cổng Parabol (Giải Phóng) | `components/three/ParabolGate.tsx`, `lib/campus.ts` | [c9-parabol-lake.md](./world/buildings/c9-parabol-lake.md) | Production |
| `building.c1` | Tòa nhà C1 & Quảng trường C1 | `components/three/C1Building.tsx`, `lib/campus.ts` | [c1.md](./world/buildings/c1.md) | Production |
| `landmark.i-love-bk` | Cụm chữ 3D `I ❤ BK` | `components/three/Landmarks.tsx`, `lib/campus.ts` | [c1.md](./world/buildings/c1.md) | Production |
| `landmark.white-rock` | Khối đá trắng Quảng trường C1 | `components/three/Landmarks.tsx`, `lib/campus.ts` | [c1.md](./world/buildings/c1.md) | Production |
| `interior.c1-classroom` | Phòng học mô phỏng C1 | `components/three/Classroom.tsx`, `lib/campus.ts` | [c1.md](./world/buildings/c1.md) | Production |
| `building.library` | Thư viện Tạ Quang Bửu | `components/three/LibraryBuilding.tsx`, `lib/campus.ts` | [library.md](./world/buildings/library.md) | Production |
| `landmark.hust-sign` | Cụm chữ 3D `HUST` trước Thư viện | `components/three/Landmarks.tsx`, `lib/campus.ts` | [library.md](./world/buildings/library.md) | Production |
| `interior.library-lobby` | Sảnh tầng 1 Thư viện Tạ Quang Bửu | `components/three/LibraryLobby.tsx`, `lib/campus.ts` | [library.md](./world/buildings/library.md) | Production |
| `building.c7` | Tổ hợp Tòa C7 9 tầng hình chữ E | `components/three/CampusExpansion.tsx`, `lib/campus.ts` | [c7.md](./world/buildings/c7.md) | Production |
| `building.c9` | Tòa C9 & Cầu thang bộ lan can đỏ | `components/three/C9Building.tsx`, `lib/campus.ts` | [c9-parabol-lake.md](./world/buildings/c9-parabol-lake.md) | Production |
| `landscape.tien-lake` | Hồ Tiền, bờ kè đá, sen súng & liễu rủ | `components/three/TienLake.tsx`, `components/three/Trees.tsx` | [c9-parabol-lake.md](./world/buildings/c9-parabol-lake.md) | Production |
| `building.b1-soict` | Tòa B1 (Trường CNTT & Truyền thông — SoICT) | `components/three/CampusExpansion.tsx`, `lib/campus.ts` | [east-campus.md](./world/buildings/east-campus.md) | Production |
| `building.dorm-complex` | Khu Ký túc xá B3–B13 & KTX mới cao tầng | `components/three/CampusExpansion.tsx`, `lib/campus.ts` | [east-campus.md](./world/buildings/east-campus.md) | Production |
| `building.sports-complex` | Nhà thi đấu, Bể bơi & SVĐ Bách Khoa | `components/three/CampusExpansion.tsx`, `lib/campus.ts` | [east-campus.md](./world/buildings/east-campus.md) | Production |
| `avatar.rig` | Hệ khung xương `FigureJoints` Nam & Nữ | `components/three/StudentAvatar.tsx` | [rig-and-animation.md](./world/avatar/rig-and-animation.md) | Production |
| `avatar.outfit.windbreaker` | Áo khoác gió đồng phục ĐHBK Hà Nội | `components/three/StudentAvatar.tsx` | [outfits.md](./world/avatar/outfits.md) | Production |
| `avatar.outfit.bomber` | Bộ 3 mẫu Áo Bomber HUST | `components/three/StudentAvatar.tsx` | [outfits.md](./world/avatar/outfits.md) | Production |
| `avatar.outfit.polo` | Áo Polo đỏ HUST cổ viền trắng | `components/three/StudentAvatar.tsx` | [outfits.md](./world/avatar/outfits.md) | Production |
| `avatar.outfit.hoodie` | Áo Hoodie đỏ Bách khoa & Sweater Kem | `components/three/StudentAvatar.tsx` | [outfits.md](./world/avatar/outfits.md) | Production |
| `avatar.accessory.skirt` | Chân váy xếp ly chữ A (Nữ) | `components/three/StudentAvatar.tsx`, `lib/identity.ts` | [outfits.md](./world/avatar/outfits.md) | Production |
| `feature.modes.hsk-toggle` | Quản lý Chế độ gắn rời (`HSK Mode` ON/OFF, mặc định OFF) | `lib/gameModes.ts`, `lib/playerState.ts` | [vision.md](./product/vision.md) | Production |
| `feature.learning.hsk` | Engine học HSK 3–4 (1.057 từ, 50 quest, SRS) | `lib/learn/*`, `content/*`, `components/learn/*` | [hsk-learning.md](./features/hsk-learning.md) | Production |
| `feature.social.multiplayer` | Đồng bộ vị trí & ngoại hình qua WebSocket DO | `shared/contracts/multiplayer.ts`, `lib/multiplayer.ts`, `worker/src/room.ts` | [multiplayer.md](./architecture/multiplayer.md) | Production (`PR1`) |
| `feature.study.pomodoro` | Đồng hồ Pomodoro, Focus Mode, Study Session & Study Rooms | `shared/contracts/study.ts`, `features/study/*`, `features/social/rooms/*`, `features/social/presence/*` | [study-pomodoro.md](./features/study-pomodoro.md) | Production (`PR6`) |

---

## 3. Tài liệu Nghiên cứu & Báo cáo Lịch sử (Historical & Audit Archives)

Các tài liệu dưới đây được lưu giữ từ các đợt khảo sát và nghiệm thu trước để đối chiếu lịch sử thiết kế (không xóa để bảo toàn tham chiếu trong comment source code):

- **Khảo sát Khuôn viên & Hình ảnh Tham chiếu:**
  - Bản đồ số [`https://hustmap.com/`](https://hustmap.com/) — **Source of Truth** bản đồ quy hoạch khuôn viên Đại học Bách khoa Hà Nội (chỉ giới hạn đúng phạm vi khuôn viên trường, đã loại bỏ sơ đồ cũ).
  - [docs/campus-reference.md](./campus-reference.md) — Khảo sát kích thước và vị trí công trình ban đầu.
  - [docs/satellite-and-c9.md](./satellite-and-c9.md) — Đối chiếu vệ tinh Hồ Tiền chữ nhật và cầu thang đỏ C9.
  - [docs/reference-visual.md](./reference-visual.md) — Bảng màu và phân tích thị giác ban đầu.
  - [docs/library-orientation.md](./library-orientation.md), [docs/ref-library-studywithhuster.md](./ref-library-studywithhuster.md), [docs/ref-library-rebuild-report.md](./ref-library-rebuild-report.md) — Tư liệu mặt tiền và hướng Thư viện Tạ Quang Bửu.
  - [docs/c1-stele-brief.md](./c1-stele-brief.md), [docs/architecture-rework-brief.md](./architecture-rework-brief.md), [docs/rework-round2-brief.md](./rework-round2-brief.md) — Đặc tả nâng cấp kiến trúc Đợt 1–2.
  - [docs/huong-dan-phat-trien.md](./huong-dan-phat-trien.md) — Brief chuẩn hóa bản đồ khuôn viên (Việc 1) & hệ thống nhân vật sinh viên (Việc 2).
- **Khảo sát Nội dung Học HSK & Báo cáo Kiểm thử Các Đợt:**
  - [docs/content-audit.md](./content-audit.md), [docs/learn-engine.md](./learn-engine.md) — Kiểm toán dữ liệu từ vựng nguồn và đặc tả SRS.
  - [docs/coverage-hsk3.md](./coverage-hsk3.md) (246 từ HSK 3), [docs/coverage-hsk4.md](./coverage-hsk4.md) (811 từ HSK 4).
  - [docs/round3-brief.md](./round3-brief.md), [docs/round3-integration-report.md](./round3-integration-report.md), [docs/round5-multiplayer-report.md](./round5-multiplayer-report.md) — Báo cáo nghiệm thu Đợt 3 (xe máy, dịch chuyển nhanh) và Đợt 5 (Multiplayer).
