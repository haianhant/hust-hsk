# Danh mục Công trình & Phân khu Khuôn viên (`Campus Buildings Catalog`)

Tài liệu này liệt kê toàn bộ các công trình, cổng trường, hồ nước và phân khu của Đại học Bách khoa Hà Nội được khai báo tại [`lib/campus.ts`](../../../lib/campus.ts) (`features/campus/world-data/*`) và dựng hình trong `components/three/*` & `features/campus/buildings/*`, đối chiếu trực tiếp với **Bản đồ Số [`https://hustmap.com/`](https://hustmap.com/) (Official Map Source of Truth — giới hạn gọn trong phạm vi khuôn viên ĐHBK Hà Nội)** và bộ ảnh thực tế tại `tham-khao/`.

> **Quy tắc phạm vi bản đồ:** Chỉ tham khảo và hoàn thiện đúng phạm vi khuôn viên Đại học Bách khoa Hà Nội trên `https://hustmap.com/` (trong biên `BOUNDS = { minX: -96, maxX: 168, minZ: -76, maxZ: 108 }`), tuyệt đối không dùng lại sơ đồ cũ và không mở rộng tràn sang khu dân cư / trường đại học lân cận bên ngoài.

---

## 1. Bảng Tổng hợp Các Landmark Chính & Không gian Nội thất

| Module ID | Tên Công trình / Hạng mục | Tâm `(x, z)` (m) | Hộp Va chạm Chính (`AABB`) | Tài liệu Chi tiết |
|---|---|---|---|---|
| `building.parabol-gate` | Cổng Parabol (Giải Phóng) | `(-88, -6)` | Chân bắc `z: -12.5..-10`, chân nam `z: -2..0.5`, nhà gác `z: -16.5..-13.5` | [c9-parabol-lake.md](./c9-parabol-lake.md) |
| `building.c1` | Tòa nhà C1 & Quảng trường C1 | `(-58, -56)` | `x: -82..-34, z: -63..-49` (+ bậc `z: -49.5..-43.8`) | [c1.md](./c1.md) |
| `landmark.i-love-bk` | Cụm chữ 3D `I ❤ BK` | `(-58, -39.5)` | `x: -59.35..-56.65, z: -39.9..-39.1` | [c1.md](./c1.md) |
| `landmark.c1-fountain` | Đài phun nước Bách Khoa (Sân C1) | `(-58, -31.2)` | `x: -60.2..-55.8, z: -32.4..-30.0` | [c1.md](./c1.md) |
| `landmark.white-rock` | Khối đá trắng Quảng trường C1 | `(-58, -22)` | `x: -60.1..-55.9, z: -23.0..-21.0` | [c1.md](./c1.md) |
| `interior.c1-classroom` | Phòng học mô phỏng | Cửa C1 `(-58, -45.5)` / C7 `(32.2, -36)` | Cục bộ `x: -4.1..4.1, z: -2.6..2.6` | [c1.md](./c1.md) |
| `building.c9` | Tòa nhà C9 & Cầu thang đỏ | `(-75, -17)` | Thân `x: -85..-65, z: -23..-11`; thang `x: -65.6..-62.6` | [c9-parabol-lake.md](./c9-parabol-lake.md) |
| `landscape.tien-lake` | Hồ Tiền & Bờ kè đá | `(-2, 48)` | Lòng hồ `45m × 88m` (`x: -24.5..20.5, z: 4..92`) | [c9-parabol-lake.md](./c9-parabol-lake.md) |
| `building.library` | Thư viện Tạ Quang Bửu | `(38.8, 38.5)` | Tháp `x: 25.6..52.0, z: 28.8..50.0`; đế `x: 29.8..46.2, z: 23.5..30.5` | [library.md](./library.md) |
| `landmark.hust-sign` | Cụm chữ 3D `HUST` trước Thư viện | `(38, 14)` | `x: 35.2..40.8, z: 13.4..14.6` | [library.md](./library.md) |
| `interior.library-lobby` | Sảnh & Tổ hợp 10 Tầng Thư viện TQB | Cửa `(38, 22.4)` | Cục bộ `x: -35.2..35.2, z: -38.0..27.2` | [library.md](./library.md) |
| `building.c7` | Tổ hợp Tòa C7 9 tầng hình chữ E (Bắc–Nam) | `(46, -36)` | `x: 34..58, z: -53..-19` (cùng `C6` & `C15` phía Bắc) | [c7.md](./c7.md) |
| `building.b1-soict` | Tòa B1 (Trường CNTT & TT — SoICT) | `(112, 14)` | `x: 101..123, z: 7..21` | [east-campus.md](./east-campus.md) |
| `building.dorm-complex` | Khu Ký túc xá B3–B13, Căng tin B5-9 & KTX mới | `(122, -40)` | Các khối `B3`–`B10`, `B13`, `Căng tin B5-9`, `TT Phục vụ BK`, `Trạm Y tế` | [east-campus.md](./east-campus.md) |
| `building.sports-complex` | Bể bơi, Nhà thi đấu, Nhà TC, SVĐ & KTX A2–A3 | `(120, 64)` | `Bể bơi`, `Nhà thi đấu`, `Nhà TC` (Tây-Bắc LTN) & `SVĐ`, `KTX A2–A3` (Đông-Nam LTN) | [east-campus.md](./east-campus.md) |

---

## 2. Phân khu Giảng đường Khu C & Khu D (`LECTURE_BUILDINGS` — Chuẩn `https://hustmap.com/`)

- **Khu C (Phía Bắc trục đường chính Parabol – Trần Đại Nghĩa):**
  - `C2` (`(-86, -34)`) — Khối nhà chạy dọc Bắc–Nam có hai đầu cánh hướng Tây ôm sân Quảng trường Trần Đại Nghĩa (phía Tây vườn hoa C1, phía Bắc C9).
  - `C1B` (`(-27.5, -56)`) ở đầu Đông tòa `C1`; `C3B` (`(24, -66.5)`) ở phía Tây-Bắc `C6`.
  - Cụm dãy ngang `C3` (`z = -68`), `C4B` (`z = -62.5`), `C4` (`z = -57`), `C5` (`z = -46`), `C10` (`z = -35`) tại `x = -12` nối liên hoàn dọc hành lang Tây (`C3-4`, `C4-5`, `C5-10`), đầu Tây `C10` là viện `ITIMS` (`(-27.5, -35)`) giáp `Quảng trường ngã 5`.
  - Cụm Đông-Bắc sát phố Trần Đại Nghĩa: `C6` (`(44, -64)`), `C15` (`(59, -59.5)`) và Tổ hợp 9 tầng chữ E `C7` (`(46, -36)`, 3 cánh hướng Tây, thay thế hoàn toàn nhà C8 cũ).
- **Khu D (Quanh Hồ Tiền & Thư viện Tạ Quang Bửu):**
  - Phía Bắc Hồ Tiền: Trung tâm Hợp tác Việt – Đức `VDZ_CENTER` (`(-6.5, -0.3)`) và Nhà Cựu sinh viên / HUST Digital Hub `ALUMNI_HOUSE` (`(3.8, -0.3)`).
  - Phía Tây Hồ Tiền: Cặp nhà `D2A` (`(-64, 20)`, phía Tây) và `D2B` (`(-44, 20)`, phía Đông), bãi gửi xe `D4-6-8`, Trường Ngoại ngữ `D4` hình chữ L (`(-78, 44)`), cùng cặp `D6` (`(-46, 38)`) – `D8` (`(-46, 54)`).
  - Phía Nam & Đông Thư viện: `D9` (`(38, 63)`), `D3` (`(61, 14)`), `D5` (`(61, 29)`), khối nối `D3-5` (`(70.5, 21.5)`), giảng đường xoay chéo `D7` (`(61, 45)`, `rotY = π/4`), và Nhà để xe `D3-D5` (`(81, 19.5)`).
