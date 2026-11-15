# Bóng Đêm KTX v3 — Bộ Luật Đầy Đủ (`BOARD_GAME_RULESET_VERSION = 3`)

> **Thể loại:** Trò chơi suy luận vai trò bí mật, điều tra có điều kiện & sinh tồn chiến thuật cho **4–8 người chơi** trên nền HUSTVerse.
> **Sở hữu trí tuệ:** 100% thiết kế gốc (nhân vật, năng lực, 26 loại thẻ bài, bản đồ KTX và quy tắc hoàn toàn nguyên bản).
> **Thời gian giải thích luật:** ~5 phút · **Thời lượng mục tiêu:** 20–35 phút (tối đa `9–10` vòng).

---

## 1. Thiết lập Trận đấu (Setup) & Phân bổ Phe (4–8 Người)

### 1.1. Tỷ lệ Phe theo Số Người Chơi

| Số người chơi | Đội Gác Đèn | Hội Màn Sương | Kẻ Lang Thang | Lý do thiết kế |
|---:|---:|---:|---:|---|
| **4 người** | 2 | 2 | 0 | Đối đầu 2v2 cân xứng, **không lộ đồng đội ở Turn 0**; tránh phe thứ 3 phá nhịp bàn nhỏ. |
| **5 người** | 2 | 2 | 1 | Cặp 2v2 đối kháng kèm 1 Kẻ Lang Thang tạo ẩn số nghi ngờ. |
| **6 người** | 2 | 2 | 2 | Thế chân vạc 3 chiều căng thẳng, mọi phán đoán đơn giản đều có nguy cơ nhầm Lang Thang. |
| **7 người** | 3 | 3 | 1 | Mở rộng chiến tuyến 3v3 có 1 nhân tố độc lập xoay cục diện. |
| **8 người** | 3 | 3 | 2 | Bàn đầy đủ 8 ghế (chừa lại 1 Lang Thang chưa chia nên không suy ra ngay cặp Lang Thang). |

### 1.2. Thiết lập Ban đầu
- **Ẩn danh tuyệt đối Turn 0:** Máy chủ tráo ngẫu nhiên tập vai trò theo bảng trên và chia bí mật cho từng người. **Không một người chơi nào biết vai hay phe của người khác ở đầu trận**, kể cả đồng đội cùng phe Gác Đèn hay Hội Màn Sương.
- **Trạng thái công khai đồng nhất:** Mọi sinh viên đều xuất phát tại **`Sảnh KTX` (`lobby`)** với `woundsTaken = 0`, `tempShield = 0`, `equipped = []`, `revealed = false`. Nhờ cả 3 phe đều có đủ 3 ngưỡng máu tối đa (`11 / 12 / 13 HP`), không có bất kỳ dấu hiệu công khai nào phân biệt được vai trò khi bắt đầu.
- **Bài khởi đầu trên tay:** Mỗi người chơi được chia bí mật **2 lá bài**: `1 thẻ Điều tra` + `1 thẻ Trang bị hoặc Sự kiện` (tráo luân phiên hợp lệ). Giới hạn tối đa trên tay: **4 lá** (nếu rút thêm khi đã đủ 4 lá, lá cũ nhất trên tay tự động chuyển vào chồng bài bỏ).
- **Mục tiêu bảo hộ riêng của Bình (`lang-cuu-ho`):** Nếu có mặt trong ván, Bình được máy chủ gán ngầm 1 người chơi khác làm **Mục tiêu Bảo hộ (`protegePlayerId`)**.

---

## 2. Bản đồ 6 Khu vực KTX & Di chuyển (`KTX_GRAPH`)

Bản đồ gồm 6 khu vực kết nối theo đồ thị cố định:
- **Hành Lang B7 (`corridor`):** Trung tâm nối thẳng cả 5 khu vực còn lại (`lobby`, `canteen`, `court`, `radio`, `breaker`).
- **Vòng ngoài:** `Sảnh KTX (lobby)` ↔ `Căng Tin (canteen)` ↔ `Sân Bóng Rổ (court)` ↔ `Phát Thanh (radio)` ↔ `Bảo Vệ (breaker)` ↔ `Sảnh KTX (lobby)`.

*(Lưu ý đối xứng đường đi: nếu `A` nối `B` thì `B` nối `A`; cụ thể: `lobby` ↔ `canteen, breaker, corridor`; `canteen` ↔ `lobby, court, corridor`; `court` ↔ `canteen, radio, corridor`; `radio` ↔ `court, breaker, corridor`; `breaker` ↔ `lobby, radio, corridor`; `corridor` ↔ cả 5 phòng.)*

Mỗi khu vực cung cấp **1 lợi ích địa điểm rõ ràng (`EXPLORE_LOC`)** hoặc cho phép **rút bài (`DRAW_CARD`)**:

| Khu vực | Lợi ích Khảo sát (`EXPLORE_LOC`) | Bộ bài được phép rút (`DRAW_CARD`) |
|---|---|---|
| **Sảnh KTX (`lobby`)** | **Sơ cứu trực đêm:** Hồi `1` vết thương (hoặc nhận `+1 Giáp tạm`, tối đa 2, nếu chưa bị thương). | `Sự kiện (event)` |
| **Căng Tin B5–B9 (`canteen`)** | **Tiếp tế đồ dùng:** Rút ngay `1 thẻ Trang bị`. | `Trang bị (equipment)` hoặc `Sự kiện (event)` |
| **Hành Lang B7 (`corridor`)** | **Cơ động tránh đòn:** Nhận `+1 Giáp tạm` (tối đa 2) để chuẩn bị cho pha hành động chính. | `Điều tra (investigation)` hoặc `Sự kiện (event)` |
| **Sân Bóng Rổ (`court`)** | **Tầm nhìn thoáng:** Trong lượt này được mở rộng tầm **Tấn công & Điều tra** sang cả phòng kề cận, và đòn đánh vào mục tiêu đã lật vai hoặc có `>= 2 vết thương` gây `+1 ST`. | `Trang bị (equipment)` |
| **Phòng Phát Thanh (`radio`)** | **Sóng toàn khu:** Rút `1 thẻ Điều tra` và được phép dùng **Thẻ Điều tra tới BẤT KỲ ai** trên bản đồ trong lượt này. | `Điều tra (investigation)` hoặc `Sự kiện (event)` |
| **Phòng Bảo Vệ (`breaker`)** | **Chốt trực an ninh:** Nhận `+1 Giáp tạm` (tối đa 2) và xóa bỏ trạng thái bị đánh dấu hở sườn (`exposedMark = 0`). | `Điều tra (investigation)` hoặc `Trang bị (equipment)` |

---

## 3. Cấu trúc 1 Lượt Chơi & Đồng hồ Đơn (Turn Loop)

Mỗi người chơi nhận **1 ngân sách thời gian duy nhất cho toàn bộ lượt (`40 giây` khi đang kết nối, giới hạn còn `12 giây` nếu mất kết nối)**. Các pha nhỏ trong cùng 1 lượt **không reset lại đồng hồ 40s**.

1. **Pha 1 — `MOVE_OR_STAY` (Đi hay Ở):**
   - **`MOVE` (`location`):** Di chuyển sang `1` ô kề cận trên đồ thị (hoặc tối đa `2` bước nếu đang trang bị *Giày Thể Thao Sân KTX*).
   - **`STAY`:** Đứng yên tại chỗ nếu ở lại mang lợi ích chiến thuật hơn.
2. **Pha 2 — `LOCATION_ACTION` (Tương tác Khu vực hoặc Rút thẻ):**
   - Chọn **`EXPLORE_LOC`** (kích hoạt hiệu ứng 1 dòng của khu đang đứng) **HOẶC** **`DRAW_CARD`** (rút 1 lá từ một trong các chồng bài của khu vực đó).
3. **Pha 3 — `MAIN_ACTION` (Chuẩn bị tự chọn + 1 Hành động Chính / Kết thúc lượt):**
   - *Thao tác phụ miễn phí (không kết thúc lượt, tối đa 1 lần mỗi loại trong lượt):*
     - **`EQUIP_CARD`:** Đưa 1 thẻ *Trang bị* từ tay ra ô trang bị công khai trước mặt (tối đa `2` món; mang món thứ 3 sẽ bỏ món cũ nhất).
     - **`REVEAL_ROLE`:** Lật vai công khai vĩnh viễn (có hộp xác nhận không thể hoàn tác), kích hoạt ngay phúc lợi khi lật và mở khóa `USE_SKILL`.
   - *Chọn **1 Hành động Chính** (thực hiện xong tự động kết thúc lượt an toàn) hoặc bấm `END_TURN`:*
     - **`INVESTIGATE_CARD`:** Dùng 1 thẻ *Điều tra* trên tay lên 1 người chơi khác trong tầm (cùng phòng hoặc kề phòng; toàn bản đồ nếu ở `Phát Thanh`, có hiệu ứng `Sóng toàn khu`, đang đeo *Bộ Đàm Trực Đêm*, hoặc là `Khánh` đã lật vai).
     - **`PLAY_EVENT`:** Kích hoạt 1 thẻ *Sự kiện* trên tay.
     - **`USE_EQUIPMENT`:** Kích hoạt 1 thẻ *Trang bị tiêu hao* (*Bình Trà Gừng* / *Thẻ Từ Nội Trú*) từ tay hoặc từ ô đã trang bị rồi bỏ thẻ đó.
     - **`ATTACK`:** Tấn công 1 sinh viên khác cùng phòng (hoặc kề phòng nếu có tầm nhìn Sân Bóng Rổ / *Gậy Móc Khóa Tuần Đêm* / kỹ năng Dũng).
     - **`DEFEND`:** Nhận `+1 Giáp tạm` (tối đa `2`) tới đầu lượt kế tiếp và quan sát kín số bài trên tay + số trang bị của những người đang đứng cùng phòng.
     - **`USE_SKILL`:** Dùng kỹ năng chủ động riêng (chỉ khả dụng khi **đã lật vai** và hết hồi chiêu `2` vòng).
     - **`END_TURN`:** Nhường lượt cho người kế tiếp.

---

## 4. Hệ thống 9 Nhân vật (`ROLES_CATALOG`)

Mọi phe đều có đúng 1 nhân vật ở mỗi mức máu `11 / 12 / 13 HP`. Khi **chưa lật vai**, nội tại chỉ ghi chú thầm cho chủ nhân và **tuyệt đối không tạo hiệu ứng công khai khác biệt**. Kỹ năng chủ động và nội tại chiến đấu chỉ hoạt động **sau khi lật vai (`revealed = true`)**.

| Nhân vật | Phe | HP tối đa | Lợi ích ngay khi Tự Lật Vai | Kỹ năng Chủ động (Hồi 2 vòng) & Nội tại sau Lật |
|---|---|---:|---|---|
| **Minh** (`gac-ky-thuat`) | Đội Gác Đèn | **13** | `+1 Giáp tạm` & rút `1 Trang bị` | **Gia Cố Chốt Trực:** Chọn bản thân hoặc đồng đội cùng/kề phòng: hồi `2` vết thương và tặng `+1 Giáp tạm` (`+2` nếu họ chưa bị thương). *Nội tại khi lật:* Miễn nhiễm sát thương từ Sự kiện nếu đang mang ít nhất 1 trang bị. |
| **Lan** (`gac-truc-ban`) | Đội Gác Đèn | **12** | Hồi `1` vết thương & rút `1 Điều tra` | **Lệnh Bảo Hộ Trực Đêm:** Đặt khiên bảo hộ lên người khác cùng/kề phòng tới đầu lượt sau của Lan: giảm `1 ST` nhận vào và **không thể tụt xuống dưới 1 HP**. *Nội tại khi lật:* Mọi thẻ Điều tra của Lan tự động đọc thêm chính xác số bài trên tay mục tiêu. |
| **Khánh** (`gac-radio`) | Đội Gác Đèn | **11** | Kích hoạt *Sóng toàn khu* lượt này & `+1 Giáp tạm` | **Phát Sóng Kiểm Chứng:** Chọn bất kỳ ai trên bản đồ: kiểm tra công khai xem họ từng `Tấn công > 0` hoặc đang đeo trang bị không; nếu có (hoặc là Màn Sương đã lật), gắn dấu hở sườn `exposedMark = 1`. *Nội tại:* Dùng Thẻ Điều tra toàn bản đồ. |
| **Tú** (`suong-an-danh`) | Hội Màn Sương | **12** | `+1 Giáp tạm` & mở tầm đánh kề phòng lượt này | **Đánh Tráo Bóng Tối:** Chọn mục tiêu cùng/kề phòng: đổi chỗ với họ (nếu ở ô kề) và gây `2 ST` phục kích (vẫn tính giáp/áo bảo hộ). *Nội tại:* Đòn đánh thường của Tú bỏ qua giảm thương *Bình Tĩnh Tự Vệ*. |
| **Vy** (`suong-tin-don`) | Hội Màn Sương | **11** | Rút `1 Sự kiện` & `+1 Giáp tạm` | **Tung Hỏa Mù Hành Lang:** Chọn mục tiêu cùng/kề phòng: xóa `1 Giáp tạm`, gây `1 ST` và đẩy họ sang 1 khu vực kề cận. *Nội tại:* Đối phương dùng `DEFEND` cùng phòng với Vy không đọc được số bài trên tay Vy. |
| **Dũng** (`suong-gac-cong`) | Hội Màn Sương | **13** | Mở tầm đánh kề phòng lượt này | **Áp Sát Bất Ngờ:** Nhảy vào phòng của mục tiêu cùng/kề phòng (phải đã có `>= 1 vết thương` hoặc đã lật vai) và tung đòn `3 ST` cơ bản. *Nội tại:* Đánh mục tiêu có `>= 3 vết thương` gây thêm `+1 ST`. |
| **Hải** (`lang-anh-san`) | Kẻ Lang Thang | **12** | `+1 Giáp tạm` & rút `1 Trang bị` | **Chốt Gói Tin Đêm:** Từ Vòng 5 trở đi, nếu đang mang `>= 2 Trang bị` và đã điều tra `>= 3` lần -> **Hải thắng đơn độc ngay lập tức!** Nếu chưa đủ điều kiện: rút `1 Điều tra` & `+1 Giáp tạm`. |
| **Trang** (`lang-quan-sat`) | Kẻ Lang Thang | **11** | Hồi `1` vết thương & `+1 Giáp tạm` | **Biên Bản Đối Chất:** Chọn 1 người cùng/kề phòng: cả 2 nhận `+1 Giáp tạm` và Trang rút `1 Điều tra`. Thắng đơn độc ngay nếu đã lật khi toàn bàn chỉ còn `<= 2` người sống (đã có `>= 2` người bị loại). |
| **Bình** (`lang-cuu-ho`) | Kẻ Lang Thang | **13** | Hồi `1` vết thương & `+1 Giáp tạm` | **Lá Chắn Thân Mình:** Chọn 1 người cùng/kề phòng: hồi `1` thương cho họ, tặng họ `+2 Giáp tạm` (tối đa 2), tặng Bình `+1 Giáp tạm`; nếu đúng Mục tiêu Bảo hộ sẽ tăng tiến độ bảo vệ. |

---

## 5. Luật Điều tra Có Điều kiện (`investigation` — 9 Thẻ)

Thay vì soi thẳng phe thật, mỗi thẻ **Điều tra có điều kiện** đặt ra một câu hỏi có quy tắc tất định trên trạng thái hoặc đặc điểm ẩn của mục tiêu `T`. **Mỗi câu hỏi đơn lẻ luôn khớp nhiều nhân vật ở ít nhất 2–3 phe khác nhau**, vì vậy không lá bài nào tự kết luận phe từ 1 lần soi, nhưng khi ghép 2–3 manh mối khác nhau, người chơi sẽ khoanh vùng chính xác đối thủ.

1. **`inv-01` · Sổ Trực Đêm B7:** Đúng nếu `Mục tiêu thuộc Hội Màn Sương HOẶC có Máu tối đa = 13` (*Minh, Tú, Vy, Dũng, Bình*). Nếu đúng: mục tiêu nhận `1` vết thương áp lực (không gây gục dưới 1 HP; bị *Kính Chắn Bụi* chặn).
2. **`inv-02` · Danh Sách Trực Cổng:** Đúng nếu `Mục tiêu thuộc Đội Gác Đèn HOẶC có Máu tối đa = 12` (*Minh, Lan, Khánh, Tú, Hải*). Nếu đúng: mục tiêu hồi `1` vết thương nếu đang bị thương.
3. **`inv-03` · Mẩu Giấy Tủ Đồ:** Đúng nếu `Mục tiêu là Kẻ Lang Thang HOẶC có Máu tối đa = 11` (*Khánh, Vy, Hải, Trang, Bình*). Nếu đúng: người điều tra nhận manh mối kín cho biết mục tiêu có giữ thẻ *Điều tra/Trang bị* trên tay hay không.
4. **`inv-04` · Tiếng Còi Tuần Đêm:** Đúng nếu `(Mục tiêu là Màn Sương hoặc Lang Thang) VÀ Máu tối đa <= 12` (*Tú, Vy, Hải, Trang*). Nếu đúng: bóc `1 Giáp tạm` hoặc gây `1` vết thương áp lực (không gây gục; bị *Kính Chắn Bụi* chặn).
5. **`inv-05` · Soi Thẻ Nội Trú:** Đúng nếu `Gác Đèn HOẶC Dũng HOẶC Trang` (*Minh, Lan, Khánh, Dũng, Trang* vs *Tú, Vy, Hải, Bình*). Nếu đúng: người điều tra biết máu tối đa của mục tiêu thuộc nhóm chẵn (`12`) hay lẻ (`11/13`).
6. **`inv-06` · Đối Chiếu Lời Khai:** Đúng nếu `Mục tiêu CÙNG PHE hoặc CÙNG MÁU TỐI ĐA với bạn`. Báo kết quả đối chiếu + ghi chú kín mức thương tích (`>= 2` hay còn khỏe).
7. **`inv-07` · Dấu Chân Hành Lang:** Đúng nếu `Mục tiêu từng ghé Phát Thanh/Bảo Vệ HOẶC từng đứng yên (STAY)`. Nếu đúng: báo kín cho người điều tra tối đa 2 phòng mục tiêu vừa ghé.
8. **`inv-08` · Vết Xước Tay Áo:** Đúng nếu `Mục tiêu đã từng tấn công HOẶC đang đeo trang bị`. Nếu đúng: người điều tra biết chính xác `attacksMade > 0` và số thẻ trên tay; nếu mục tiêu đã từng đánh người mà còn `<= 1` vết thương, nhận `1` vết thương cảnh cáo (không gây gục).
9. **`inv-09` · Kiểm Tra Ngăn Balo:** Đúng nếu `Mục tiêu có >= 2 thẻ trên tay HOẶC đang đeo trang bị`. Nếu đúng: liệt kê kín nhóm bài trên tay mục tiêu (ví dụ `1 Điều tra, 1 Sự kiện`).

---

## 6. Hệ thống Trang bị (`equipment` — 9 Thẻ) & Sự kiện (`event` — 8 Thẻ)

### 6.1. Thẻ Trang bị (mang tối đa 2 món công khai trước mặt)
- `eq-01` **Áo Khoác Gió Bách Khoa:** Giảm `1 ST` từ mỗi đòn `ATTACK` đánh vào bạn (tối thiểu `1` ST gốc trước khi trừ Giáp tạm).
- `eq-02` **Đèn Pin Tuần Tra:** Đòn `ATTACK` của bạn gây `+1 ST` khi đánh vào người đã lật vai hoặc đã có `>= 2 vết thương`.
- `eq-03` **Giày Thể Thao Sân KTX:** Khi `MOVE`, được phép đi tới ô cách `1` hoặc `2` bước trên đồ thị KTX.
- `eq-04` **Bộ Đàm Trực Đêm:** Cho phép dùng `INVESTIGATE_CARD` tới người chơi ở **bất kỳ khu vực nào**.
- `eq-05` **Còi Báo Động Cầm Tay:** Khi bị tấn công ở cùng phòng mà còn sống, kẻ tấn công bị thổi dạt sang `1` phòng kề cận khác.
- `eq-06` **Kính Chắn Bụi Xưởng Thực Tập:** Chặn hoàn toàn sát thương áp lực từ Thẻ Điều tra và sát thương nhỏ từ Sự kiện.
- `eq-07` **Móc Khóa Gậy Tuần Đêm:** Cho phép `ATTACK` cả mục tiêu đứng ở khu vực kề cận.
- `eq-08` **Bình Giữ Nhiệt Trà Gừng** *(Tiêu hao)*: Dùng qua `USE_EQUIPMENT` để hồi `3` vết thương cho bản thân hoặc `1` người cùng phòng, sau đó bỏ thẻ.
- `eq-09` **Thẻ Từ Nội Trú Đa Năng** *(Tiêu hao)*: Dùng qua `USE_EQUIPMENT` để nhận ngay `+2 Giáp tạm` và rút `1 thẻ Điều tra`, sau đó bỏ thẻ.

### 6.2. Thẻ Sự kiện (kích hoạt tức thì qua `PLAY_EVENT`)
- `ev-01` **Mất Điện Hành Lang:** Mọi người đứng tại Hành Lang B7 mất `1 Giáp tạm` (nếu có); người dùng chọn `1` phòng nhận `+1 Giáp tạm` cho người ở phòng đó.
- `ev-02` **Bữa Khuya Căng Tin:** Tất cả sinh viên đang ở Căng Tin hoặc Sảnh KTX hồi `1` vết thương; người không ở hai nơi đó nhận `1` vết thương nhẹ nếu có `tempShield === 0` (chặn bởi *Kính Chắn Bụi*).
- `ev-03` **Loa KTX Thông Báo:** Người chơi đang đứng ở khu vực được chọn phải bước sang `1` ô kề cận khác (hoặc mất `1 Giáp tạm` nếu giữ chỗ).
- `ev-04` **Mưa Rào Sân KTX:** Sinh viên ở Sân Bóng Rổ bị ướt (xóa tầm nhìn Sân trong vòng này và nhận `1` ST nhẹ nếu chưa có trang bị hoặc giáp; trừ Minh đã lật + trang bị / Kính).
- `ev-05` **Kiểm Tra Tủ Đồ Đột Xuất:** Chọn `1` người đang đeo trang bị: bỏ món trang bị cũ nhất của họ và họ rút bù `1` thẻ Điều tra.
- `ev-06` **Bình Trà Ấm Cuối Đêm:** Bạn hồi `2` vết thương và chọn `1` người cùng phòng cũng hồi `1` vết thương.
- `ev-07` **Tin Đồn Lan Truyền:** Mọi người có `>= 3` thẻ trên tay chọn bốc bỏ bớt `1` thẻ cũ nhất; người dùng thẻ nhận `+1 Giáp tạm`.
- `ev-08` **Hồi Chuông Giới Nghiêm:** Đẩy áp lực đêm: mọi người chơi chưa thực hiện `INVESTIGATE_CARD` lần nào từ đầu trận nhận `1` vết thương cảnh cáo (không gây gục).

---

## 7. Luật Chiến đấu & Chống Đánh Bừa (Combat Rules)

- **Tầm đánh:** Cùng phòng (hoặc kề phòng khi đứng Sân Bóng Rổ đã khảo sát, đeo *Móc Khóa Gậy*, hoặc là Tú/Dũng với năng lực tương ứng).
- **Sát thương gốc:** `2` điểm cơ bản + tối đa `+2` từ trang bị/lợi thế (*Đèn Pin Tuần Tra* `+1`, *Sân Bóng Rổ* `+1`, `exposedMark` `+1`, *Dũng đã lật* `+1` vào mục tiêu có `>= 3` vết thương), tổng sát thương thô tối đa **`4` điểm** để tránh dồn chết ngay lượt đầu.
- **Bình Tĩnh Tự Vệ (Anti-Blind-Attack):** Nếu bạn `ATTACK` một sinh viên **chưa lật vai**, **chưa từng tấn công ai (`attacksMade === 0`)** và **bạn chưa từng điều tra người đó** (trừ Tú đã lật vai):
  1. Sát thương bị **giảm `1`** (tối thiểu `1` trước khi trừ giáp).
  2. Nếu nạn nhân còn sống sau đòn đánh, họ nhận ngay **`+1 Giáp tạm`** (tối đa `2`) để có cơ hội phản ứng!
- **Phòng thủ theo thứ tự:** Trừ *Áo Khoác Gió Bách Khoa* (`-1`, tối thiểu 1) -> Trừ *Lệnh Bảo Hộ* của Lan (`-1`, đồng thời chặn không cho rơi dưới `1 HP`) -> Trừ điểm **`tempShield`** (có thể chặn xuống còn `0` vết thương).
- **Bị loại (`woundsTaken >= maxHp`):** Nhân vật ngã gục (`alive = false`), **lật mở vai trò & phe công khai**, bỏ toàn bộ trang bị đang mang. Người bị loại không thể đi lượt tiếp.
- **Kỷ Luật Nội Trú (Anti Friendly-Fire):** Nếu một thành viên **Đội Gác Đèn** tung đòn **hạ gục đồng đội Đội Gác Đèn**, kẻ đánh nhầm lập tức chịu **`2` vết thương sốc tâm lý** (không gây tự sát, dừng tối đa tại `maxHp - 1`) và **rơi 1 trang bị đang mang**.

---

## 8. Lật vai Tự nguyện (`REVEAL_ROLE`) & Điều kiện Chiến thắng

### 8.1. Lật vai Tự nguyện
- Trong pha `MAIN_ACTION` lượt mình, người chơi có thể bấm **Tự lật vai** (có hộp xác nhận không thể hoàn tác).
- **Lợi ích:** Nhận ngay phần thưởng lật vai, mở khóa kỹ năng chủ động mạnh và chứng minh phe với đồng đội (hoặc gây nhiễu nếu đang bluff).
- **Rủi ro:** Mất vĩnh viễn lớp ngụy trang; kẻ thù có thể dồn mục tiêu chính xác; lật vai **không bao giờ** ban cho quyền miễn nhiễm đòn đánh.

### 8.2. Điều kiện Thắng & Thứ tự Ưu tiên (Đánh giá Tức thì)

1. **Thắng đơn độc tức thì của Kẻ Lang Thang:**
   - **Hải** kích hoạt *Chốt Gói Tin Đêm* thành công ở `Vòng >= 5` với `>= 2 Trang bị` và `>= 3` lần điều tra -> **Hải thắng đơn độc**.
   - **Trang** tự nguyện hoặc đã lật vai khi trên bàn chỉ còn `<= 2` người sống sót (và có `>= 2` người đã bị loại) -> **Trang thắng đơn độc**.
2. **Đội Gác Đèn thắng:** Toàn bộ thành viên `Hội Màn Sương` đã bị loại và còn ít nhất 1 `Đội Gác Đèn` sống sót.
3. **Hội Màn Sương thắng:** Toàn bộ thành viên `Đội Gác Đèn` đã bị loại và còn ít nhất 1 `Hội Màn Sương` sống sót.
4. **Cùng tiêu diệt hết hai phe chính (`aliveGuard === 0 && aliveMist === 0`):** Các Kẻ Lang Thang còn sống thắng chung; nếu không còn Lang Thang, đội vừa thực hiện pha kiểm soát trước phản chấn thắng.
5. **Leo thang Giới Nghiêm & Phiên Trực Cuối Đêm (Hết Vòng `maxRounds = 9` [4–5p] hoặc `10` [6–8p]):**
   - Cuối 2 vòng cuối (`maxRounds - 2`, `maxRounds - 1`), ai đứng một mình mà cả vòng đó không tấn công lẫn không điều tra chịu `1` vết thương mệt mỏi (tối đa tới `1 HP`).
   - Nếu hết vòng `maxRounds` mà cả Gác Đèn lẫn Màn Sương đều còn người sống (**không bao giờ cộng tổng HP để phân thắng thua!**):
     - So số thành viên đối địch đã bị hạ gục (`loại Màn Sương` vs `loại Gác Đèn`).
     - Nếu hòa, so **Điểm Kiểm Soát Trực Đêm**: Gác Đèn tính `số người Gác Đèn còn sống đang giữ Sảnh/Phát Thanh/Bảo Vệ × 2 + số Gác Đèn có >= 2 lần điều tra` đối đầu với Màn Sương tính `số Màn Sương còn sống chưa bị lật × 2 + số Màn Sương còn sống ở Hành Lang/Căng Tin/Phát Thanh × 2`. Đội nào cao hơn giành chiến thắng (nếu vẫn ngang bằng tuyệt đối, Đội Gác Đèn giữ được kỷ luật KTX tới rạng sáng thắng).
6. **Đồng thắng (Shared Victory) cho Kẻ Lang Thang:** Bất kỳ lúc nào một phe thắng (hoặc kết thúc ván), máy chủ xét thêm những Kẻ Lang Thang hoàn thành mục tiêu:
   - **Hải:** Còn sống khi hết trận, đang mang `>= 2 Trang bị` và có `>= 2` lần điều tra.
   - **Trang:** Còn sống khi hết trận với `>= 2` lần điều tra và đã có `>= 3` người bị loại (hoặc đã tự lật vai với `>= 2` người bị loại).
   - **Bình:** Còn sống tới cuối trận và (*Mục tiêu Bảo hộ* còn sống với `>= 1` lần được Bình che chắn bằng *Lá Chắn Thân Mình*, **HOẶC** nếu *Mục tiêu Bảo hộ* gục, Bình đã kết liễu kẻ hạ *Mục tiêu Bảo hộ*).

---

## 9. Trường hợp Đặc biệt

- **Hết đồng hồ lượt (`40s` / `12s` mất kết nối):** Máy chủ gọi `applyTimeoutAutoTurn()` trung lập tuyệt đối (không đọc phe/vai, không lật vai): tự cộng `+1 Giáp tạm` (hoặc `STAY` -> `DEFEND`) với log công khai đồng nhất và sang lượt kế tiếp.
- **Đầy tay bài (`4` lá):** Rút thêm thẻ thứ 5 sẽ đẩy lá cũ nhất trên tay vào chồng bài bỏ của bộ đó; khi chồng bài rút hết, chồng bài bỏ tự xáo trộn lại bằng PRNG tất định.
- **Idempotency & Chống trùng lặp:** Mọi lệnh gửi qua WebSocket gắn `requestId` duy nhất (`processed_requests`) và `expectedRevision` để mạng lag/retry không bao giờ trừ 2 lần sát thương hoặc rút trùng bài.

---

## 10. Ví dụ Trọn vẹn 1 Ván 4 Người & 1 Ván 8 Người

### 10.1. Ví dụ Ván 4 Người (2 Gác Đèn vs 2 Màn Sương — 0 Lang Thang)
- **Chia vai:** P1 = **Minh** (`Gác Đèn 13`), P2 = **Lan** (`Gác Đèn 12`), P3 = **Tú** (`Màn Sương 12`), P4 = **Dũng** (`Màn Sương 13`). Tất cả chỉ biết vai mình ở `Sảnh KTX`.
- **Vòng 1:** P1 đi sang `Bảo Vệ` nhận `+1 Giáp tạm`, dùng *Sổ Trực Đêm B7* (`inv-01`) lên P3 ở `Hành Lang B7` (`condition-met`, P3 nhận `1` vết thương -> tập `{Minh, Tú, Vy, Dũng, Bình}`). P2 qua `Phát Thanh` rút *Điều tra*, dùng *Danh Sách Trực Cổng* (`inv-02`) lên P3 (`condition-met` -> giao điểm thu hẹp còn **`Minh` hoặc `Tú`**!). P3 qua `Căng Tin` lấy *Áo Khoác Gió*, mặc vào rồi `ATTACK` P1 (chịu giảm ST *Bình Tĩnh Tự Vệ* -> chỉ mất giáp). P4 qua `Sân Bóng Rổ` lấy *Đèn Pin Tuần Tra*.
- **Vòng 2–3:** P1 khẳng định P3 không thể là mình -> P3 chính là **Tú (Màn Sương)**! P2 tự lật **Lan**, dùng *Lệnh Bảo Hộ* che P1 và điều tra P4 bằng *Soi Thẻ Nội Trú* + *Tiếng Còi Tuần Đêm*: phát hiện P4 không trúng `inv-04` nhưng trúng `inv-05` (`{Minh, Lan, Khánh, Dũng, Trang}`), kết hợp hành vi mang *Đèn Pin* đi săn -> nghi **Dũng**.
- **Vòng 4–5:** Minh tự lật vai hồi máu và lấy trang bị, cùng Lan tập trung hạ Tú ở Vòng 4 (Tú lật ngửa thành Màn Sương). Vòng 6, cả hai phối hợp truy đuổi Dũng ở `Hành Lang B7` đến `woundsTaken >= 13` -> Dũng gục -> **Đội Gác Đèn thắng toàn diện!**

### 10.2. Ví dụ Ván 8 Người (3 Gác Đèn vs 3 Màn Sương vs 2 Lang Thang)
- **Chia vai:** Minh, Lan, Khánh (`Gác Đèn`) · Tú, Vy, Dũng (`Màn Sương`) · Hải & Bình (`Kẻ Lang Thang` — Bình bảo hộ ngầm Lan).
- **Diễn biến:** Vòng 1–2, mọi người tỏa ra `Căng Tin` (Hải sớm đeo 2 món trang bị), `Phát Thanh` (Khánh lấy thẻ Điều tra), và `Hành Lang B7`. Khánh bị Dũng áp sát, may mắn có Bình đứng cùng phòng lật vai tung *Lá Chắn Thân Mình* vào Lan (tăng `protectedProtegeCount = 1`).
- **Vòng 5:** Vy đánh lạc hướng khiến một Gác Đèn nghi nhầm Hải, nhưng đòn đánh nhầm kích hoạt *Bình Tĩnh Tự Vệ* giúp Hải sống sót qua mốc Vòng 5. Tới lượt mình ở Vòng 6, **Hải** đã có 2 trang bị và 3 lần điều tra, bấm **Tự Lật Vai -> Kỹ năng `Chốt Gói Tin Đêm`** -> **Hải thắng đơn độc tức thì**, đồng thời vì Lan (mục tiêu Bảo hộ của Bình) vẫn sống sót và Bình đã từng che chắn Lan nên **Bình cùng chia chiến thắng**!
