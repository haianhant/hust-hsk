# Thông số Kiến trúc Chuẩn các Công trình ĐHBK Hà Nội (HUST Landmarks Spec)

Bảng tổng hợp thông số hình học, màu sắc và dấu hiệu nhận diện bắt buộc của các công trình trong khuôn viên Bách Khoa Hà Nội, đối chiếu trực tiếp với **Bản đồ Số [`https://hustmap.com/`](https://hustmap.com/) (Official Map Source of Truth — chỉ tính trong phạm vi khuôn viên ĐHBK Hà Nội, bỏ sơ đồ cũ `khuon-vien-truong.png`)** và **Bộ ảnh thật tại `tham-khao/`**.

## 1. Hệ màu chuẩn HUST (`docs/reference-visual.md` & `tham-khao/`)
| Thành phần | Mã Hex | Ghi chú |
|---|---|---|
| Đỏ Bách Khoa (HUST Red) | `#E8202A` / `#B5121B` | Tim `I ❤ BK`, chữ `HUST`, lan can C9/C1, cờ, áo khoác gió / bomber / polo SV |
| Tường C1 / C9 / Khu C | `#F4F3EF` | Trắng ngả kem ấm (kiến trúc Liên Xô 1965) |
| Tường C7 / Thư viện TQB | `#F2F3F5` | Trắng sáng hiện đại (`tham-khao/c7/`, `tham-khao/thu-vien/`) |
| Bê tông Cổng Parabol | `#F2EFE6` / `#9AA08E` | Trắng ấm + vết ố xám xanh tự nhiên (`tham-khao/cong-parabol/`) |
| Mái 9 sóng C1 | `#8E8A80` | Xám-nâu bạc màu, viền cạnh mái sáng `#CFCBC0` |
| Nhấn xanh Thư viện TQB | `#1E5AA8` | Viền đồng hồ, dải mái, mái khối đế, khung cửa sảnh |
| Kính cửa sổ C1 / C9 | `#6E7F8C` | Xám-xanh dịu, có đố trắng chia ô |
| Kính Thư viện TQB / C7 | `#2E3A47` | Xanh đen đậm tương phản với tường trắng |
| Sân Quảng trường C1 | `#CFCBC2` | Đá xám nhạt chia mạch ô vuông + thảm cỏ xanh trước mặt tiền |
| Sân Thư viện TQB | `#A65B43` | Gạch đỏ-nâu đất nung + lối đi chính `#8A4A32` |
| Sân Quảng trường TĐN | `#BFE3D8` | Xanh ngọc nhạt + đường mạch điện tử trắng `#F5F5F5` |
| Nước Hồ Tiền | `#5E7268` | Xanh xám/ôliu dịu, gợn sóng nhẹ (`tham-khao/ho-tien/`) |

## 2. Đặc trưng Kiến trúc từng Công trình (Đối chiếu `tham-khao/`)

### 2.1. Cổng Parabol (`tham-khao/cong-parabol/` — Cổng Giải Phóng, Tây Campus)
- **Tâm:** `(-88, 10)`, thông thủy `8m`, cao đỉnh vòm `12.5m`.
- **Cấu trúc:** Dải băng phẳng rộng `1.2m`, dày `0.6m` theo phương đường đi; phương trình `y = 12.5 * (1 - (u/4)^2)`. Chân vòm kéo xuống `y = -0.31m` chôn trực tiếp xuống đất.
- **Chi tiết bắt buộc:** 6 huy hiệu tròn nổi/chân trên cả 2 mặt đông/tây; 5 gờ cổ áo chia khoang ôm quanh mặt cắt dải băng; gờ nổi dọc mép trong/ngoài; nhà gác trắng phía bắc và cổng xếp sắt đen chữ X phía nam.

### 2.2. Nhà C1 & Quảng trường C1 (`tham-khao/c1/` — Tây-Bắc Campus)
- **Tâm:** `(-58, -56)`, kích thước cơ sở `48 × 14m` (có thể mở rộng tương ứng khi tăng `CAMPUS_SIZE`), 4 tầng (`floorHeight = 3.6m`).
- **Mặt tiền Nam (`tham-khao/c1/c1-mat-tien-01.jpg`, `c1-can-luoi-hoa-gio-05.jpg`):**
  - Hai cánh là hành lang mở (loggia) sâu `3.0m`, cột mảnh, lan can các tầng, cửa kính lùi sâu.
  - Chính giữa là **Tháp hoa gió** và đầu hồi đông có tháp hoa gió phụ: ốp các panel đục lỗ khe chữ nhật đứng so le, phía sau là hốc tối nhìn xuyên thấy mép sàn.
  - Bên phải tháp là mảng tường đặc gắn biểu trưng dọc đỏ/sao vàng `"ĐẠI HỌC BÁCH KHOA"` và chữ `"C1"` ở tầng trệt; bậc thềm đá dài phía trước sảnh.
  - **Mái:** Đúng **9 vòm sóng nông** (`waveAmplitude = 0.5m`), trên nóc có cột cờ Tổ quốc đỏ sao vàng.
- **Cảnh quan sân C1 (`tham-khao/c1/c1-san-truoc-i-love-bk-03.jpg`):** Cụm chữ 3D `I ❤ BK` đặt ở khoảng cách cân đối trên trục đường giữa sân cỏ trước C1 (không đặt quá sát bậc thềm), 2 cây Lipa cổ thụ đối xứng, ghế dài, đèn chùm và Khối đá trắng tự nhiên.

### 2.3. Thư viện Tạ Quang Bửu (`tham-khao/thu-vien/` — Đông Hồ Tiền)
- **Tâm khối tháp:** `(38, 36.5)` (cho phép mở rộng bề ngang khi nới lô đất để đạt tỉ lệ khối tấm ngang chuẩn như ảnh `thu-vien-mat-tien-chu-hust-01.jpg`), 10 tầng (`floorHeight = 3.2m`).
- **Hình khối:** Tháp tấm đứng 3 nhịp hướng mặt chính về phía Bắc (`-Z`, tuyệt đối không quay mặt đồng hồ về phía Hồ Tiền): khối giữa nhô trước `2m` và cao hơn hai cánh nửa tầng (`32.6m` vs `31.0m`), dải kính tối lõi thang dọc nằm bên phải khối giữa.
- **Khối đế & Đồng hồ:** Khối đế ôm khối giữa, mặt trước có 2 cụm lam ngang xám (13 thanh/cụm) kẹp hai bên **đồng hồ tròn trắng viền xanh dương** đặt thấp ngay trên mái hiên sảnh; biển chữ vàng `"THƯ VIỆN TẠ QUANG BỬU"` ngay trên mái đế; sảnh dưới đế có 6 cột vuông xám, cửa kính khung xanh và bậc tam cấp rộng.
- **Tiền cảnh:** Sân gạch đỏ-nâu đất nung, chữ `HUST` đỏ 3D trên bệ đen tại `(38, 12)`, hàng cau/cọ và cây xanh hai bên sân trước.

### 2.4. Hồ Tiền (`tham-khao/ho-tien/` — Trung tâm Campus)
- **Tâm hiện tại:** `(4, 22)`, hình chữ nhật trục Bắc–Nam (cho phép mở rộng diện tích hồ khi nới biên campus).
- **Chi tiết:** Bờ kè đá có gờ bê tông, lối đi bộ lát gạch bao quanh, đèn sân vườn, hàng liễu rủ ven hồ, ghế gỗ khung sắt, mặt hồ phủ các cụm lá sen/súng xanh đan xen hoa hồng và khoảng nước thoáng, nhìn sang dãy nhà D trắng phía đối diện.

### 2.5. Nhà C9 & Cầu thang đỏ (`tham-khao/c9/` — Giữa Cổng Parabol & Hồ Tiền)
- **Tâm hiện tại:** `(-38, -8)`, kích thước `18 × 8m`, 4 tầng (`floorHeight = 3.4m`).
- **Chi tiết:** Cầu thang bộ ngoài trời gấp khúc zic-zac 4 vế gắn liền ở mặt Đông (`x = -29`), mỗi vế khớp đúng chiều cao tầng `3.4m`, chiếu nghỉ đua ra có cột vuông trắng đỡ, lan can kim loại đỏ mảnh (`#E8202A`), khoảng rỗng dưới gầm thang nhìn xuyên được, tầng trệt có cửa gỗ vàng.

### 2.6. Tòa nhà C7 Mới (`tham-khao/c7/` & `https://hustmap.com/` — Dự án SAHEP, Đông-Bắc Campus)
- **Đặc trưng kiến trúc (`c7-flycam-toan-canh.jpg`, `c7-san-trong-mat-tien.jpg`, `https://hustmap.com/`):**
  - Tòa nhà lớn sơn **màu trắng** (không phải màu xám của bản vẽ render), cao 9 tầng, tạo hình **chữ E chạy dọc trục Bắc–Nam** sát phía Tây phố Trần Đại Nghĩa (thay thế hoàn toàn vị trí nhà C7–C8 cũ; không còn nhà C8, phía Bắc là `C6` và `C15`).
  - Thân lưng chính chạy dọc phía Đông (`+X`, giáp bãi xe C7 & phố Trần Đại Nghĩa), **3 cánh vươn về phía Tây (`-X`)** hướng sang dãy `C4–C5–C10`, tạo 2 sân trong trồng cây xanh và bồn gạch đỏ; tầng 1–2 là vách kính cao thoáng làm giảng đường; trên mái phẳng có cụm thiết bị kỹ thuật và ô mái ngói đỏ điểm xuyết.

### 2.7. Tòa B1 SoICT & Khu Ký túc xá (`tham-khao/b1-soict/`, `tham-khao/ktx/` — Đông Campus)
- **Tòa B1 (Viện CNTT-TT SoICT):** Mặt chính có khối sảnh góc cong đặc trưng, tầng trệt ốp gạch/đá đỏ nâu, các tầng trên sơn trắng-xanh với biển chữ `B1` nổi bật trên đỉnh mặt cong, phía trước có sân cỏ và hàng rào.
- **Khu Ký túc xá B3–B13:** Gồm dãy nhà KTX B9 sơn màu vàng truyền thống có sân trong và cổng Hội Sinh viên, cùng tòa KTX mới cao tầng sơn phối hai màu xanh dương – trắng.

### 2.8. Đồng phục Sinh viên HUST (`tham-khao/dong-phuc/`)
- **Áo khoác gió đồng phục HUST (Mặc định):** Thân trên và cầu vai màu trắng, thân dưới màu đỏ Bách khoa ngăn cách bởi đường cắt chữ V (chevron) trước ngực, cổ trụ có viền đỏ trong, khóa kéo dọc chính giữa, túi chéo hai bên hông, logo HUST đỏ đặt trên nền trắng ngực trái.
- **Áo khoác Bomber HUST (3 biến thể):** Đỏ–Ghi (`bomber-red-grey`), Xanh tím than–Trắng (`bomber-navy-white`), Đỏ–Xanh tím than (`bomber-red-navy`) với bo cổ, bo gấu và cổ tay dệt kẻ sọc.
- **Áo Polo đỏ, Hoodie đỏ/ghi, Áo phông xanh tím than, Áo sơ mi trắng:** Đúng phom dáng và phối màu trong bộ sưu tập đồng phục HUST chính thức.
