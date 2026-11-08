# Danh mục Công trình & Phân khu Khuôn viên (`Campus Buildings Catalog`)

Tài liệu này liệt kê toàn bộ các công trình, cổng trường, hồ nước và phân khu của Đại học Bách khoa Hà Nội được khai báo tại [`lib/campus.ts`](file:///home/bao/Hust3D/hust-hsk/lib/campus.ts) và dựng hình trong `components/three/*`, đối chiếu với sơ đồ tổng mặt bằng [`docs/khuon-vien-truong.png`](file:///home/bao/Hust3D/hust-hsk/docs/khuon-vien-truong.png) và bộ ảnh thực tế tại `tham-khao/`.

---

## 1. Bảng Tổng hợp Các Landmark Chính & Không gian Nội thất

| Module ID | Tên Công trình / Hạng mục | Tâm `(x, z)` (m) | Hộp Va chạm Chính (`AABB`) | Tài liệu Chi tiết |
|---|---|---|---|---|
| `building.parabol-gate` | Cổng Parabol (Giải Phóng) | `(-88, 10)` | Chân nam `z: 3.5..6`, chân bắc `z: 14..16.5`, nhà gác `z: -0.5..2.5` | [c9-parabol-lake.md](./c9-parabol-lake.md) |
| `building.c1` | Tòa nhà C1 & Quảng trường C1 | `(-58, -56)` | `x: -82..-34, z: -63..-49` (+ bậc `z: -49.5..-43.8`) | [c1.md](./c1.md) |
| `landmark.i-love-bk` | Cụm chữ 3D `I ❤ BK` | `(-58, -39.5)` | `x: -59.35..-56.65, z: -39.9..-39.1` | [c1.md](./c1.md) |
| `landmark.white-rock` | Khối đá trắng Quảng trường C1 | `(-78, -31)` | `x: -80.8..-75.2, z: -32.1..-29.9` | [c1.md](./c1.md) |
| `interior.c1-classroom` | Phòng học mô phỏng C1 | Cửa `(-58, -45.5)` | Cục bộ `x: -4.1..4.1, z: -2.6..2.6` | [c1.md](./c1.md) |
| `building.c9` | Tòa nhà C9 & Cầu thang đỏ | `(-42, -2)` | Thân `x: -52..-32, z: -8..4`; thang `x: -32.6..-29.6` | [c9-parabol-lake.md](./c9-parabol-lake.md) |
| `landscape.tien-lake` | Hồ Tiền & Bờ kè đá | `(-2, 40)` | Lòng hồ `45m × 88m` (`x: -24.5..20.5, z: -4..84`) | [c9-parabol-lake.md](./c9-parabol-lake.md) |
| `building.library` | Thư viện Tạ Quang Bửu | `(38, 36.5)` | Tháp `x: 25.5..50.5, z: 29.5..43.5`; đế `x: 31..45, z: 23.5..30.5` | [library.md](./library.md) |
| `landmark.hust-sign` | Cụm chữ 3D `HUST` trước Thư viện | `(38, 14)` | `x: 35.2..40.8, z: 13.4..14.6` | [library.md](./library.md) |
| `interior.library-lobby` | Sảnh tầng 1 Thư viện Tạ Quang Bửu | Cửa `(38, 22.8)` | Cục bộ `x: -5.4..5.4, z: -3.8..3.8` | [library.md](./library.md) |
| `building.c7` | Tổ hợp Tòa C7 9 tầng hình chữ E | `(46, -46)` | `x: 32..60, z: -53.75..-38.25` | [c7.md](./c7.md) |
| `building.b1-soict` | Tòa B1 (Viện CNTT&TT — SoICT) | `(112, 14)` | `x: 101..123, z: 7..21` | [east-campus.md](./east-campus.md) |
| `building.dorm-complex` | Khu Ký túc xá B3–B13 & KTX mới | `(122, -40)` | 11 khối nhà (`B3`–`B10`, `B13`, `Nhà ăn`) | [east-campus.md](./east-campus.md) |
| `building.sports-complex` | Nhà thi đấu, Bể bơi & SVĐ Bách Khoa | `(120, 64)` | Nhà thi đấu `x: 96..112`, Bể bơi `x: 112.5..127.5`, KTX Lào | [east-campus.md](./east-campus.md) |

---

## 2. Phân khu Giảng đường Khu C & Khu D (`LECTURE_BUILDINGS`)

Ngoài các công trình biểu tượng ở trên, [`lib/campus.ts`](file:///home/bao/Hust3D/hust-hsk/lib/campus.ts#L325-L510) và [`components/three/CampusExpansion.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/CampusExpansion.tsx) tái hiện đầy đủ mạng lưới giảng đường theo đúng bố cục thực tế:

- **Khu C (Phía Bắc trục đường chính):**
  - `C2` (`(-86, -22)`) — Văn phòng Đoàn Thanh niên & Đảng ủy (phía Tây vườn hoa C1, phía Bắc C9).
  - Cụm 4 dãy ngang `C3` (`z = -68`), `C4` (`z = -57`), `C5` (`z = -46`), `C10` (`z = -35`) tại `x = -12` (phía Đông vườn hoa C1).
  - Cụm 3 dãy ngang `C6` (`z = -64`), `C7` (`z = -46`), `C8` (`z = -28`) tại `x = 46` (sát phía Tây đường Trần Đại Nghĩa).
- **Khu D (Quanh Hồ Tiền & Thư viện Tạ Quang Bửu):**
  - Phía Bắc Hồ Tiền: Trung tâm Hợp tác Việt – Đức `VDZ_CENTER` (`(-2, -9.8)`).
  - Phía Tây Hồ Tiền: Cụm `D2` (`(-46, 24)`), `D2a` (`(-64, 22)`), `D2b` (`(-79, 22)`), Viện Ngoại ngữ `D4` (`(-78, 44)`), và cụm `D6` (`(-46, 38)`), `D8` (`(-46, 54)`).
  - Phía Nam & Đông Thư viện: `D9` (`(38, 63)`), `D3` (`(64, 18)`), `D5` (`(64, 32)`), khối nối `D3-5` (`(75, 25)`), và giảng đường xoay chéo `D7` (`(60, 50)`, `rotY = π/4`).
