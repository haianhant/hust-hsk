# Hệ trục Tọa độ & Không gian Thế giới 3D (`World Coordinate System`)

## 1. Quy ước Trục Tọa độ & Đơn vị Chuẩn

Toàn bộ không gian 3D của **HUSTVerse — Bách Khoa 3D** sử dụng hệ tọa độ Đề-các bàn tay phải của Three.js với đơn vị **1 đơn vị = 1 mét (m)**:

- **Trục `X` (Đông – Tây):**
  - `-X` = Phía **Tây** (giáp đường Giải Phóng — nơi đặt Cổng Parabol tại `x = -88`).
  - `+X` = Phía **Đông** (giáp đường Trần Đại Nghĩa tại `x ≈ 92` và khu mở rộng phía Đông gồm B1 SoICT, KTX B3–B13, Khu Thể chất & SVĐ Bách Khoa tới `x = 168`).
- **Trục `Z` (Bắc – Nam):**
  - `-Z` = Phía **Bắc** (giáp đường Đại Cồ Việt — nơi đặt Tòa C1 tại `z = -56` và Cổng Đại Cồ Việt tại `z = -73.5`).
  - `+Z` = Phía **Nam** (về phía đường Tạ Quang Bửu / Lê Thanh Nghị, bao gồm Hồ Tiền `z = -4..84` và SVĐ Bách Khoa tới `z = 108`).
- **Trục `Y` (Cao độ):**
  - `Y = 0.00m` là cao độ mặt cỏ cơ sở toàn trường.
  - Chuẩn tỉ lệ con người ([`AVATAR`](../../shared/constants/world.ts#L37-L44)): chiều cao `1.7m`, mắt nhìn ở `y = 1.6m`, bán kính va chạm hình trụ `radius = 0.4m`.

---

## 2. Biên Thế giới (`BOUNDS`) & Điểm Xuất phát (`SPAWN`)

Được định nghĩa tập trung tại [`shared/constants/world.ts`](../../shared/constants/world.ts) và dùng chung cho cả Frontend lẫn Cloudflare Worker:

| Hằng số | Giá trị | Ý nghĩa |
|---|---|---|
| `BOUNDS` | `{ minX: -96, maxX: 168, minZ: -76, maxZ: 108 }` | Biên di chuyển toàn khuôn viên (`264m × 184m`). |
| `SPAWN` | `{ x: -76, z: 10, facing: -Math.PI / 2 }` | Điểm xuất phát ngay phía trong Cổng Parabol, mặt hướng về phía Đông. |
| `AVATAR.walkSpeed` | `6.0 m/s` | Vận tốc đi bộ chuẩn trên sân trường. |
| `AVATAR.runSpeed` | `10.0 m/s` | Vận tốc chạy bộ khi giữ `Shift`. |
| `BIKE_MAX_SPEED` | `14.0 m/s` | Vận tốc tối đa của xe máy cá nhân (`BIKE_RADIUS = 0.7m`). |

### Quy ước Góc nhìn (`yaw`) và Hướng nhân vật (`facing`)
- Vector hướng nhìn của Camera từ góc `yaw` (radian):
  $$\vec{v}_{\text{cam}} = (-\sin(\text{yaw}), -\cos(\text{yaw}))$$
- Vector hướng mặt của Nhân vật/Xe máy từ góc `facing` / `heading` (radian):
  $$\vec{v}_{\text{avatar}} = (\sin(\text{facing}), \cos(\text{facing}))$$

---

## 3. Phân lớp Cao độ Mặt đất Chống Nhấp nháy (Anti-Z-Fighting Hierarchy)

Để triệt tiêu hiện tượng nhấp nháy chiều sâu (Z-fighting) giữa các bề mặt ngang trên mặt đất ([`Ground.tsx`](../../components/three/Ground.tsx)), các lớp địa hình phải tuân thủ độ lệch tối thiểu `>= 0.005m – 0.01m`:

| Lớp Bề mặt | Cao độ `Y` (m) | Ghi chú Kỹ thuật |
|---|---|---|
| Mặt cỏ nền (`Grass`) | `0.000` | Mặt phẳng nền cơ sở toàn khuôn viên. |
| Quảng trường / Sân lát (`Plazas`) | `0.015` | Quảng trường C1, Sân Thư viện, Quảng trường Trần Đại Nghĩa. |
| Mặt đường nhựa (`ROADS`) | `0.020` | Các đoạn đường chồng lên Quảng trường được cắt tự động bằng thuật toán Liang–Barsky. |
| Vỉa hè / Mạch lát / Vạch kẻ đường | `0.025 – 0.035` | Gờ vỉa hè, lối đi đỏ trước Thư viện, mạch điện Quảng trường TĐN. |
| Mặt nước Hồ Tiền (`LAKE.waterY`) | `0.050` (trong lòng hồ âm) | Lòng hồ hạ thấp hơn bờ kè đá `0.80m`; lá sen/súng đặt tại `y + 0.015m` với biến thiên nhỏ theo chỉ số instance. |

Đối với các chi tiết thẳng đứng trên mặt tiền tòa nhà (khung cửa sổ, mặt kính, đố cửa, biển chữ `TextPlate`), mỗi lớp phải tịnh tiến lệch nhau tối thiểu **`>= 0.02m`** theo vector pháp tuyến của mặt tường.

---

## 4. Hệ thống Va chạm 2D (`Collision Resolution`)

1. **Va chạm Người đi bộ ([`resolveCollisions`](../../lib/campus.ts#L675-L721)):**
   - Kiểm tra hình tròn bán kính `AVATAR.radius = 0.4m` với:
     - Biên `BOUNDS`.
     - Danh sách hộp chữ nhật trục tọa độ `BUILDING_COLLIDERS` (bao gồm các tòa nhà, bậc tam cấp C1, bệ chữ `I ❤ BK` / `HUST`, bờ kè đá Hồ Tiền, ghế đá và bồn cỏ cao).
     - Lòng Hồ Tiền chữ nhật qua hàm `pointInLake(p, radius)` (`center: (-2, 40)`, `halfW: 22.5m`, `halfL: 44m`).
   - Người đi bộ **không** bị chặn bởi tán cây hay thân cây để tránh kẹt khi đi dạo dưới hàng cây.
2. **Va chạm Xe máy ([`resolveBikeCollisions`](../../lib/campus.ts#L992-L1014)):**
   - Bao gồm toàn bộ `resolveCollisions(p, BIKE_RADIUS = 0.7m)` cộng thêm kiểm tra va chạm hình tròn với danh sách thân cây `TREE_TRUNKS` (`r = 0.3m`) và vòng tròn bảo vệ quanh NPC Minh `NPC_CIRCLES` (`r = 0.5m`).

---

## 5. Hệ Tọa độ Cục bộ Nội thất (Interior Sub-Spaces)

Khi người chơi bước vào không gian nội thất, scene chuyển sang hệ tọa độ cục bộ lấy tâm phòng làm gốc `(0, 0)`:

| Không gian | Hằng số Cấu hình | Biên Cục bộ (`bounds`) | Điểm Xuất hiện (`spawn`) | Hàm Va chạm |
|---|---|---|---|---|
| **Phòng học mô phỏng C1** | `CLASSROOM` (`lib/campus.ts`) | `x: -4.1..4.1m`, `z: -2.6..2.6m` | `(0, 1.0)` | `resolveClassroomCollisions` |
| **Sảnh tầng 1 Thư viện** | `LIBRARY_LOBBY` (`lib/campus.ts`) | `x: -5.4..5.4m`, `z: -3.8..3.8m` | `(0, 2.4)` | `resolveLibraryLobbyCollisions` |
