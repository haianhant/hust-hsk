# Bóng Đêm KTX v2 — Đặc tả Thiết kế Trò chơi Suy luận & Danh tính Bí mật

> **Tài liệu quy chuẩn v2 (`rulesetVersion = 2`)** cho mini-game **Bóng Đêm KTX — Secrets After Dark** trong HUSTVerse.
> Toàn bộ cơ chế, 9 nhân vật, 6 khu vực KTX và 24 lá bài đều là **tài sản thiết kế nguyên bản (100% original IP)** của dự án, lấy cảm hứng tinh thần *hidden-role social deduction* mà không sao chép bất kỳ nhân vật, thẻ bài hay luật riêng của tựa game thương mại nào.

---

## 1. Bảng Kiểm Toán Vấn Đề Động cơ v1 (Audit Report)

| Mã | Mức độ | Vị trí trong v1 | Vấn đề đã xác nhận | Hướng xử lý trong v2 |
|---|---|---|---|---|
| **A** | **P0** | `projections.ts`, `roles.ts` | Công khai `hp` và `maxHp` cho toàn bàn; riêng `maxHp = 10` định danh thẳng `Kẻ Lang Thang` ngay Turn 0, `maxHp = 13` thu hẹp về `Lan`/`Dũng`. | Tách `PublicPlayerHealth` (`woundsTaken`, `visibleShield`, `alive`, `detained`) khỏi `PrivatePlayerHealth` (`hp`, `maxHp`). Chỉ công khai `revealedMaxHp` sau khi lật vai. |
| **B** | **P0** | `victory.ts`, `actions.ts`, `cards.ts` | Thắng thua dựa vào đua điểm `signalProgress >= 6` / `mistProgress >= 6` (gần như *race-to-6* bỏ qua suy luận). | Xóa bỏ hoàn toàn cơ chế Tín hiệu/Màn sương và `ADJUST_TRACK`; chuyển sang **Âm Mưu Phá Hoại Ngầm, Niêm Phong Lưới Điện, Đối Chất & Phiên Họp Rạng Sáng**. |
| **C** | **P0** | `actions.ts` (`applyTimeoutAutoTurn`) | Tự đánh kiểm tra `cur.faction` tại `radio` để chọn `signal` vs `mist`, làm lộ phe công khai khi AFK. | `applyTimeoutAutoTurn` hoàn toàn trung lập phe: nhận `+1 Khiên` phòng thủ (trong phạm vi công khai giống hệt nhau) và kết thúc lượt an toàn. |
| **D** | **P1** | `actions.ts`, `effects.ts`, `cards.ts` | `PROBE` trả thẳng `ĐÚNG/SAI` theo phe thật; 6 lá bài và 3 kỹ năng dùng `inspect-faction` ghi thẳng phe thật vào sổ. | Thay `PROBE` bằng `INVESTIGATE` (`equipment` / `activity`) dựa trên **Ma trận Đặc điểm 3×3 trực giao** và lịch sử hành vi thực tế trong trận. |
| **E** | **P1** | `projections.ts` | Công khai `fragments` và `skillUsed` làm lộ tiến độ Lang Thang hoặc hành vi lén kích hoạt kỹ năng. | Ẩn `fragments` (bỏ luôn cơ chế gom mảnh ngẫu nhiên), ẩn `covertSkillUsed`; chỉ hiện `revealedSkillUsed` khi nhân vật đã lật vai công khai. |
| **F** | **P1** | `actions.ts`, `rules.ts` | Khai báo `adjacent` nhưng `MOVE` cho phép nhảy tới bất kỳ khu vực nào, triệt tiêu ý nghĩa địa hình & đánh dấu dấu vết. | `MOVE` bắt buộc đi tới ô **kề cận** (`isAdjacentLocation`) trừ khi dùng lá chiến thuật *Giấy Thông Hành KTX*. |
| **G** | **P1** | `victory.ts` (`Hải`, `Trang`) | `Hải` thắng đơn độc sớm từ Vòng 2 khi đủ `3 Mảnh Tin Đen`; `Trang` thắng thụ động bằng `hp >= 6`. | `Hải` chỉ thắng đơn độc từ **Vòng 4+** sau khi xác thực `>= 2` hiện trường + `>= 3` chứng cứ và công bố tại `Phát thanh`; `Trang` phải gặp gỡ & khóa giả thuyết chính xác trên người chưa lật vai. |
| **H** | **P2** | `RoleCard.tsx`, `ActionPanel.tsx` | Thẻ vai mở sẵn mặc định dễ lộ khi ngồi gần/chia sẻ màn hình; nút `Tự lật vai` bấm là kích hoạt ngay. | `RoleCard` úp mặc định khi vào ván (`hiddenOnScreen = true`); tự lật vai có hộp xác nhận nêu rõ lợi ích và rủi ro không thể hoàn tác. |
| **I** | **P2** | `worker/src/boardgame-room.ts` | `game_state_json` chưa gắn `rulesetVersion` nên thay đổi schema dễ gây lỗi DO đọc dữ liệu cũ. | Gắn `rulesetVersion: 2` khi lưu/đọc; trạng thái v1 cũ tự động chuyển đổi mềm sang ván đã kết thúc để chơi ván mới v2 mà không xóa SQLite hay sửa migration DO. |

---

## 2. Tầm Nhìn Thiết Kế & Ba Lớp Quyết Định

Mỗi lượt trong **Bóng Đêm KTX v2** xoay quanh ba câu hỏi:

1. **Information (Thông tin):** Tôi quan sát được đặc điểm trang bị và dấu chân kỹ thuật nào? Bằng chứng đó mở ra 3 vai trò khả dĩ nào? Tôi có thể đối chiếu chéo hai mảnh ghép khác trục để loại trừ chưa?
2. **Social (Xã hội):** Ai vừa chạm vào trạm kỹ thuật trước khi cảnh báo quá tải vang lên? Có nên công khai chứng cứ để đồng đội tin mình hay giữ kín vì Kẻ Lang Thang đang rình rập? Nên công khai lật vai sớm để bảo vệ/khóa vùng hay tiếp tục ẩn mình?
3. **Tactical (Chiến thuật):** Di chuyển theo đồ thị 6 khu vực để kiểm tra, niêm phong hay phục kích; dùng **Đối chất** (`CONFRONT`, chỉ 1 lần mỗi người từ Vòng 3) để bắt quả tang kẻ phá hoại, chấp nhận cái giá nếu vu oan sai người.

---

## 3. So Sánh Mô Hình Điều Kiện Thắng (Không Dùng Điểm)

| Tiêu chí | Mô hình A: Sửa 3 trạm vs Sống sót | Mô hình B: Sát hại Mục tiêu VIP (Chìa khóa) | Mô hình C (ĐƯỢC CHỌN): **Âm Mưu Phá Hoại Ngầm, Niêm Phong, Đối Chất & Phiên Họp Rạng Sáng** |
|---|---|---|---|
| **Ngăn chặn AFK** | Kém — phe phòng thủ chỉ cần đứng thủ trong Sảnh tới hết giờ. | Trung bình — nhưng phe tấn công dễ focus-fire giết VIP ở Vòng 2. | **Tốt** — Gác Đèn phải vừa **Niêm phong Cầu dao & Phát thanh**, vừa **ngăn/gỡ Mạch Quá Tải**, không thể thắng nếu AFK mặc Màn Sương lén xâm nhập mục tiêu. |
| **Tránh Deathmatch** | Trung bình. | Thấp — gameplay biến thành đấu trường tìm giết 1 người. | **Tốt** — Tạm giữ bằng `CONFRONT` dựa trên suy luận có tác dụng ngang tiêu diệt nhưng không kéo dài cảnh bị loại; đánh sai đồng đội mất nhịp và khiến Mạch Quá Tải kích hoạt sớm. |
| **Thời lượng 15–25p** | 7–8 vòng thường hơi dài. | Có thể kết thúc Vòng 2 quá sớm. | **Ổn định 5–7 vòng** (tối đa 6 vòng cho 4–5p, 7 vòng cho 6–8p) với bước ngoặt rõ rệt từ Vòng 3 đến Rạng Sáng. |
| **Đất diễn cho Bluff** | Hạn chế. | Phụ thuộc may rủi. | **Cao** — Công việc `scan` (Kiểm tra) và `sabotage` (Gài mạch) phát ra cùng một nhật ký công khai; Hội Màn Sương biết nhau từ đầu để tung tin đánh lạc hướng. |

---

## 4. Bộ Luật Đầy Đủ v2 (`BOARD_GAME_RULESET_VERSION = 2`)

### 4.1. Cấu trúc Bàn Chơi & Phân Bổ Phe (4–8 Người)

- **Số vòng tối đa (`maxRounds`):** `6` vòng (4–5 người) · `7` vòng (6–8 người). Khi hết vòng cuối, trời bước sang **Rạng Sáng**.
- **Tỉ lệ phe:**
  - 4 người: `2 Đội Gác Đèn / 2 Hội Màn Sương / 0 Kẻ Lang Thang`
  - 5 người: `2 Gác Đèn / 2 Màn Sương / 1 Lang Thang`
  - 6 người: `3 Gác Đèn / 2 Màn Sương / 1 Lang Thang`
  - 7 người: `3 Gác Đèn / 3 Màn Sương / 1 Lang Thang`
  - 8 người: `3 Gác Đèn / 3 Màn Sương / 2 Lang Thang`
- **Điểm Yếu Hệ Thống Ngầm (`secretSabotageLocation`):**
  - Đầu trận, máy chủ chọn ngẫu nhiên 1 trong 3 cơ sở hạ tầng: `Phòng Phát Thanh (radio)`, `Phòng Bảo Vệ & Cầu Dao (breaker)`, hoặc `Căng Tin B5–B9 (canteen)`.
  - Chỉ **Hội Màn Sương** biết trước trạm đích này *và biết tên đồng đội Màn Sương cùng phe* trong hồ sơ khởi đầu (`privateView`) để phối hợp tung hỏa mù. Đội Gác Đèn, Kẻ Lang Thang và Khán giả đều nhận `null`.

### 4.2. Sức Khỏe Bí Mật & Ma Trận Đặc Điểm 3×3 Trực Giao

- Công khai trên bàn chỉ hiển thị `woundsTaken` (số vết thương đã nhận, khởi đầu `0`), `visibleShield` (`0..6`), trạng thái `alive` và `detained` (bị tạm giữ sau Đối chất chính xác). **Không bao giờ** hiển thị `hp` còn lại hay `maxHp` khi nhân vật chưa lật vai.
- Mỗi trong 9 nhân vật mang 2 nhãn điều tra thật (`accessTag` và `traceTag`) xếp thành **hình vuông Latinh 3×3** — bảo đảm **mỗi đơn nhãn luôn trùng khớp chính xác 1 Gác Đèn + 1 Màn Sương + 1 Lang Thang**, vì vậy **1 mảnh manh mối không bao giờ kết luận được phe**, nhưng **giao điểm 2 mảnh (`accessTag` + `traceTag`) định danh chính xác nhân vật**:

| Nhân vật | Phe | HP tối đa (Ẩn) | Nhãn 1 (`accessTag` — Dụng cụ) | Nhãn 2 (`traceTag` — Dấu vết) | Kỹ năng đặc trưng (1×/ván) |
|---|---|---|---|---|---|
| **Minh** (`gac-ky-thuat`) | Gác Đèn | 12 | `Chìa Kỹ Thuật` | `Găng Cách Điện` | Lật vai sửa lưới điện xuyên mất điện, gỡ mạch tại chỗ nếu có và hồi `2` thương cho người cùng phòng. |
| **Lan** (`gac-truc-ban`) | Gác Đèn | 12 | `Thẻ Nội Trú` | `Máy Đo Sóng` | Lật vai nhận `+2 Khiên` và kiểm tra đối chiếu sổ trực: xem 1 người cùng khu từng thao tác kỹ thuật/gây sát thương vòng nào. |
| **Khánh** (`gac-radio`) | Gác Đèn | 11 | `Thiết Bị Tần Số` | `Thẻ Từ Phân Luồng` | Lật vai niêm phong sóng khẩn cấp (đọc tổng số người đang giữ vai đã lật & rút 1 thẻ Chiến thuật). |
| **Tú** (`suong-an-danh`) | Màn Sương | 12 | `Chìa Kỹ Thuật` | `Máy Đo Sóng` | Lật vai ngắt điện khu đang đứng 1 vòng, xóa dấu người vừa thao tác tại khu đó khỏi bảng lịch sử gần nhất và nhận `+1 Khiên`. |
| **Vy** (`suong-tin-gia`) | Màn Sương | 11 | `Thiết Bị Tần Số` | `Găng Cách Điện` | *(Đặc biệt khi CHƯA lật)* **Dùng lén 1 lần không lộ vai:** cấy dấu thao tác kỹ thuật giả lên 1 người cùng phòng trong vòng hiện tại. |
| **Dũng** (`suong-gac-cong`) | Màn Sương | 12 | `Thẻ Nội Trú` | `Thẻ Từ Phân Luồng` | Đòn `ATTACK` sau khi lật vai xuyên qua 1 điểm Khiên; kỹ năng kích hoạt tạo áp lực gây 2 sát thương & khóa hồi thương 1 vòng. |
| **Hải** (`lang-anh-san`) | Lang Thang | 11 | `Chìa Kỹ Thuật` | `Thẻ Từ Phân Luồng` | Lật vai trích xuất ngay 1 dấu vết hiện trường tại phòng đang đứng và nhận `+1 Khiên`. |
| **Trang** (`lang-quan-sat`) | Lang Thang | 10 | `Thiết Bị Tần Số` | `Máy Đo Sóng` | Lật vai đối chiếu nhanh: chọn 1 người cùng/kề khu vực để nhận thêm `accessTag` hoặc `traceTag` + `+2 Khiên`. |
| **Bình** (`lang-cuu-ho`) | Lang Thang | 11 | `Thẻ Nội Trú` | `Găng Cách Điện` | Hồi `3` vết thương và `+2 Khiên` cho *Mục tiêu Bảo Hộ* (hoặc tự hồi); từ lúc lật vai tự động **hứng thay đòn đánh** nếu đứng cùng phòng với Mục tiêu Bảo Hộ. |

### 4.3. Đồ Thị 6 Khu Vực KTX & Di Chuyển Kề Cận

Trong pha **① Di chuyển (`MOVE`)**, sinh viên chỉ được bước sang khu vực **kề cận** theo đường nối thật:
- **`Sảnh KTX` (`lobby`)** ↔ `Căng tin`, `Hành lang B7`, `Cầu dao` · *Tương tác:* Trạm sơ cứu (hồi `1` vết thương + `+1 Khiên`), địa điểm hợp lệ để **Đối chất**.
- **`Căng tin B5–B9` (`canteen`)** ↔ `Sảnh KTX`, `Sân bóng rổ`, `Hành lang B7` · *Tương tác kỹ thuật:* Kiểm tra/Gài mạch + Quầy tiếp tế `+1 Khiên` khi kiểm tra an toàn.
- **`Sân bóng rổ KTX` (`court`)** ↔ `Căng tin`, `Hành lang B7` · *Tầm nhìn thoáng:* Được phép `INVESTIGATE` sang cả khu vực kề cận (`canteen`, `corridor`), nhưng Khiên tối đa khi đứng đây bị giới hạn `<= 2`.
- **`Hành lang B7` (`corridor`)** ↔ *Nối cả 5 khu còn lại* · *Nghe ngóng:* Báo cáo danh sách khu vực vừa có tương tác kỹ thuật trong 2 vòng gần nhất (+`1 Khiên` nếu đứng một mình).
- **`Phòng Bảo Vệ & Cầu Dao` (`breaker`)** ↔ `Sảnh KTX`, `Phát thanh`, `Hành lang B7` · *Tương tác kỹ thuật:* Đọc tên + dấu vết người thao tác kỹ thuật gần nhất tại Cầu dao; kiểm tra không có mạch gài giúp bật cờ **`Cầu dao Niêm phong` (`breakerSealed`)**; địa điểm hợp lệ để **Đối chất**.
- **`Phòng Phát Thanh` (`radio`)** ↔ `Cầu dao`, `Hành lang B7` · *Tương tác kỹ thuật:* Đọc lịch sử thao tác tại Phát thanh; kiểm tra an toàn bật cờ **`Phát thanh Niêm phong` (`radioSealed`)**. Nơi duy nhất `Hải` công bố hồ sơ (`PUBLISH_DOSSIER`) và nơi Hội Màn Sương đã lật có thể kích nổ từ xa (`DETONATE_PLOT`).

### 4.4. Cấu Trúc 1 Lượt Chơi

1. **① Di chuyển (`MOVE`):** Đi sang 1 ô kề cận khác vị trí hiện tại. Các sinh viên cùng phòng được ghi nhận vào danh sách `metPlayerIds` (đã chạm mặt).
2. **② Khảo sát hoặc Rút thẻ (`DRAW_OR_EXPLORE`):** Chọn 1 trong 2:
   - **`INTERACT_LOC`:** Khảo sát tiện ích khu vực hiện tại (`scan`). Nếu là thành viên Hội Màn Sương (chưa bị tạm giữ) đứng đúng `secretSabotageLocation` và trạm chưa báo động, có thể chọn ngầm `mode: 'sabotage'` — **nhật ký chung vẫn ghi y hệt động tác Kiểm tra thiết bị thông thường**.
     - Khi mạch bị gài (`sabotagePlanted = true`), sang **đầu vòng kế tiếp** (hoặc ngay lập tức nếu Gác Đèn đối chất sai người), hệ thống phát cảnh báo công khai: **`sabotageArmed = true`** (*"Phát hiện một mạch quá tải đã bị gài ngầm!"*) mà **không nêu tên khu vực**.
     - Nếu người không thuộc Màn Sương quét đúng phòng đang có mạch gài, họ **gỡ mạch ngay lập tức (`disarmedCount += 1`)**, nhận dấu vết `traceTag` của kẻ đã gài và thông báo công khai tên khu vực vừa được giải cứu.
   - **`DRAW_CARD`:** Rút 1 lá từ bộ **Manh mối (`clue`)**, **Sự kiện (`event`)** hoặc **Chiến thuật (`tactic`)**.
3. **③ Hành động Chiến thuật (`TACTICAL_ACTION`):** Được dùng **tối đa 1 hành động chính** trước khi bấm `END_TURN` (riêng `RECORD_HYPOTHESIS` là thao tác sổ tay miễn phí 1 lần/lượt, và `REVEAL_ROLE` là lựa chọn công khai tự nguyện 1 lần/ván kèm hộp xác nhận):
   - **`INVESTIGATE` (`equipment` / `activity`):** Điều tra người cùng phòng (hoặc kề phòng khi đứng tại Sân bóng rổ).
     - `equipment`: Lần đầu kiểm tra 1 mục tiêu trả về `accessTag` thật; lần thứ hai trả về `traceTag` thật (mỗi lá nêu rõ 3 nhân vật tương ứng thuộc đủ 3 phe).
     - `activity`: Báo cáo 2 vòng gần nhất mục tiêu đã đi những đâu, có từng thực hiện tương tác kỹ thuật (bao gồm nhiễu giả do Vy cấy ngầm) và có từng tấn công ai hay không.
   - **`USE_CARD`:** Sử dụng 1 lá Chiến thuật giữ trên tay (tối đa 4 lá).
   - **`USE_SKILL`:** Kích hoạt kỹ năng nhân vật (tự lật vai trừ khi là `Vy` đang dùng lén kỹ năng ẩn).
   - **`ATTACK`:** Tác động `-2` sát thương (qua Khiên) lên mục tiêu cùng phòng (kể cả khi chưa chắc chắn, dễ khiến mất đồng minh hoặc lộ mục đích nếu đánh bừa). Khi `hp = 0`, người chơi bị loại (`alive = false`) và vai được lật.
   - **`CONFRONT` (Từ Vòng 3+):** Đứng tại `Sảnh KTX` hoặc `Phòng Cầu Dao` (hoặc bất kỳ đâu nếu cả `breakerSealed && radioSealed` đã bật) để **Đối chất chính thức** 1 người chưa lật cùng phòng (mỗi người chơi chỉ dùng **1 lần/ván**):
     - **Đoán đúng Hội Màn Sương:** Mục tiêu lập tức bị lật vai công khai và **bị Tạm giữ (`detained = true`)** — không thể phá hoại, kích nổ, tấn công hay đối chất nữa, nhưng vẫn có thể quan sát.
     - **Đối chất sai (nhắm Gác Đèn hoặc Lang Thang):** Đòn phản tác dụng — người đối chất nhận thẳng **2 vết thương xuyên khiên**, tăng `falseAccusationCount += 1`, và nếu Màn Sương đã gài mạch chờ thì kích hoạt `sabotageArmed = true` ngay lập tức!
   - **`DETONATE_PLOT`:** Chỉ Hội Màn Sương chưa bị tạm giữ thực hiện khi `sabotageArmed === true`, ở vòng sau vòng gài (`round > sabotagePlantedRound`), và đang đứng ngay tại `secretSabotageLocation` (hoặc tại `Phát thanh` nếu đã lật vai). -> **Hội Màn Sương thắng ngay!**
   - **`PUBLISH_DOSSIER` (Riêng Hải):** Từ **Vòng 4+**, khi đang đứng ở `Phát thanh`, đã quét ít nhất `2` hiện trường kỹ thuật khác nhau và giữ `>= 3` mẩu chứng cứ -> **Hải thắng đơn độc!**

### 4.5. Thứ Tự Phân Định Chiến Thắng & Xung Đột

Mỗi khi trạng thái thay đổi hoặc bước sang **Rạng Sáng (`round > maxRounds`)**, máy chủ đánh giá tuần tự từ trên xuống (và chốt bất biến, không bao giờ xét lại khi `finished === true`):

1. **Hải công bố Hồ sơ (`PUBLISH_DOSSIER`):** Hải thắng đơn độc (`wanderer-solo`); Bình cùng thắng nếu bảo hộ đạt chuẩn.
2. **Màn Sương kích nổ Mạch Quá Tải (`DETONATE_PLOT`):** Hội Màn Sương thắng ngay lập tức.
3. **Toàn bộ Hội Màn Sương bị loại hoặc bị Tạm giữ (`alive && !detained === 0`):** Đội Gác Đèn thắng ngay lập tức.
4. **Toàn bộ Đội Gác Đèn bị loại (`aliveGuard === 0`):** Hội Màn Sương thắng nếu còn ít nhất 1 thành viên hoạt động (`alive && !detained`).
5. **Chạm trần Rạng Sáng (`round > maxRounds`):**
   - **5a.** Nếu `sabotagePlanted === true` (Mạch quá tải chưa bị gỡ): Mạch nổ lúc rạng sáng -> **Hội Màn Sương thắng**.
   - **5b.** Ngược lại, nếu cả `breakerSealed && radioSealed` đều đã khóa VÀ (`disarmedCount >= 1` hoặc có ít nhất 1 thành viên Màn Sương đã bị lộ/loại/tạm giữ): Hệ thống KTX được niêm phong an toàn -> **Đội Gác Đèn thắng**.
   - **5c.** Ngược lại, nếu **Trang (`lang-quan-sat`)** còn sống và có `>= 2` giả thuyết chính xác tuyệt đối (`0` sai): Trang cướp tiêu điểm Rạng Sáng -> **Trang thắng đơn độc** (`wanderer-solo`).
   - **5d.** Cuối cùng (**Phiên Họp Rạng Sáng — Dawn Inquest**): Nếu còn ít nhất 1 thành viên Hội Màn Sương *còn sống, chưa bị tạm giữ, chưa bị lật vai* và từng đặt chân vào `secretSabotageLocation`, kẻ nội gián đã qua mặt tuần tra -> **Hội Màn Sương thắng**; ngược lại đội tuần tra đã khóa chặt mọi cửa ngõ -> **Đội Gác Đèn thắng**.
6. **Đồng thắng cho Kẻ Lang Thang khi Gác Đèn hoặc Màn Sương thắng:**
   - **Hải:** Còn sống, đã xác thực `>= 2` khu vực từng có tương tác kỹ thuật và sở hữu `>= 3` chứng cứ.
   - **Trang:** Còn sống và sổ giả thuyết chốt `>= 2` phán đoán đúng phe trên những người chưa lật vai, **0 phán đoán sai**.
   - **Bình:** Mục tiêu Bảo hộ còn sống tới cuối ván, và Bình đã che chắn/chữa trị ít nhất 1 lần *hoặc* hy sinh thân mình hứng đòn thay cho mục tiêu Bảo hộ.

---

## 5. Kịch Bản Mẫu (4 Người & 8 Người)

### 5.1. Trận 4 Người (2 Gác Đèn vs 2 Màn Sương)
- *Thiết lập:* Minh (`Gác Đèn`) & Lan (`Gác Đèn`) đối đầu Tú (`Màn Sương`) & Vy (`Màn Sương`). Trạm mục tiêu ngầm của Màn Sương là `Cầu Dao`.
- *Vòng 1–2:* Tú đi vào `Hành lang B7` -> `Cầu Dao` và giả bộ kiểm tra (`sabotage` ngầm — nhật ký ghi *"Tú kiểm tra thiết bị kỹ thuật tại Cầu Dao"*). Cùng lúc Vy dùng lén kỹ năng *Gieo Nhiễu Giả* cấy dấu thao tác kỹ thuật lên Minh trong Căng tin. Sang Vòng 2, cảnh báo quá tải vang lên toàn bàn!
- *Vòng 3:* Minh ghé `Sân bóng rổ` dùng `INVESTIGATE (equipment)` soi Tú -> nhận `Chìa Kỹ Thuật` (trùng với Minh, Tú, Hải -> chưa đủ kết luận). Lan ghé `Cầu Dao` quét trúng mạch gài của Tú: gỡ được Mạch Quá Tải (`disarmedCount = 1`) và đọc được dấu vết `Máy Đo Sóng`!
- *Vòng 4:* Lan và Minh ghép dữ liệu: kẻ gài mạch có `Máy Đo Sóng`, mà Tú từng giữ `Chìa Kỹ Thuật` -> giao điểm duy nhất trên Ma trận 3×3 là **Tú (Cư Dân Vô Hình)**! Minh di chuyển vào `Sảnh KTX` (hoặc đứng ngay tại `Cầu Dao`) gọi **`CONFRONT` lên Tú** -> Tú bị lật vai và Tạm giữ. Sau đó Gác Đèn quay sang đấu tranh tâm lý với Vy trước Rạng Sáng.

### 5.2. Trận 8 Người (3 Gác Đèn vs 3 Màn Sương vs 2 Lang Thang)
- Có mặt **Hải** (tìm dấu chân kỹ thuật ở 2 khu khác nhau để phóng tới Phòng Phát Thanh ở Vòng 4+) và **Bình** (lén theo sát bảo hộ một người không rõ phe).
- Nhờ có 2 Lang Thang chen vào Ma trận 3×3, ngay cả khi Lan bắt được cả hai nhãn `Thiết Bị Tần Số` + `Máy Đo Sóng` trên một người chơi, mục tiêu có thể là **Trang** (`Lang Thang`) chứ không phải Màn Sương — tạo tình huống *“tưởng đối chất chắc thắng ai ngờ vướng Lang Thang và bị phản chấn 2 vết thương!”*

---

## 6. Hệ Thống Thẻ Bài 24 Lá Có Chiều Sâu (`cards.ts`)

- **8 Lá Điều Tra (`clue-01`..`clue-08`):** Không bao giờ soi thẳng phe thật; chỉ mở nhật ký khu vực, so sánh `accessTag`/`traceTag`, kiểm tra lịch sử 2 vòng, kiểm tra nhiễu giả hoặc loại trừ *tối đa 1 cơ sở hạ tầng chắc chắn KHÔNG phải mục tiêu phá hoại*.
- **8 Lá Sự Kiện (`event-01`..`event-08`):** Tạo áp lực toàn bàn hoặc tại phòng (tắt điện cục bộ, trà gừng căng tin, điểm danh bất ngờ, mở lại đèn pha, tia lửa tủ điện ghi dấu vết).
- **8 Lá Chiến Thuật (`tactic-01`..`tactic-08`):** Giữ kín trên tay để bảo vệ đồng minh, di chuyển xuyên hành lang (`Giấy Thông Hành KTX` vượt qua giới hạn kề cận 1 lần), đẩy lùi đối thủ (`Còi Báo Động Đêm`), khóa hồi thương, **gài dấu thao tác giả lên mục tiêu (`Tem Nhiễu Giả`)** hoặc mang máy quét cầm tay.

---

## 7. Timeout Trung Lập (`applyTimeoutAutoTurn`)

Khi hết đồng hồ lượt (`45s` mặc định):
- **Không** đọc `faction`, `roleId`, `secretSabotageLocation`, hay bài trên tay.
- Nếu còn ở pha `MOVE`, tự cộng `+1 Khiên` phòng thủ cho người hết giờ (tối đa theo luật khu vực) với nhật ký công khai giống hệt nhau cho mọi phe rồi chuyển lượt sang người kế tiếp. Hai trạng thái công khai giống nhau có phe bí mật khác nhau phải cho ra **kết quả công khai giống nhau 100%**.

---

## 8. Kết Quả Mô Phỏng Cân Bằng (3.500 Trận) & Giả Định Playtest

Kiểm thử qua [`test/boardgame-sim.cjs`](../../test/boardgame-sim.cjs) với **6 hồ sơ bot giới hạn thông tin** (`random-legal`, `investigator`, `bluff-saboteur`, `defensive`, `aggressive`, `team-coordinator` — chỉ nhận `getPublicGameView` & `getPrivateGameView` của chính mình):

- **Tổng số trận:** `3.500` trận (`700` trận mỗi quy mô `4, 5, 6, 7, 8` người)
- **Trận treo / kẹt vô hạn:** `0 / 3.500` (`0%`)
- **Độ dài trung bình:** **`4,41` vòng**
- **Tỷ lệ kết thúc quá sớm (Vòng 1–2):** **`1,34%`** (`47 / 3.500`, dưới ngưỡng `< 5%`)
- **Tỷ lệ thắng tổng thể:**
  - **Đội Gác Đèn (`lantern-guard`):** **`35,74%`** (`1.251` trận)
  - **Hội Màn Sương (`mist-order`):** **`51,86%`** (`1.815` trận)
  - **Kẻ Lang Thang thắng độc lập (`wanderer-solo` — Hải):** **`12,40%`** (`434` trận)
  - **Tỷ lệ Kẻ Lang Thang đạt đồng thắng (tính trên mọi lượt xuất hiện 5–8p):** **`42,60%`**

| Quy mô bàn | Số trận | Gác Đèn thắng | Màn Sương thắng | Lang Thang Solo | Lang Thang Đồng thắng | Số vòng TB | Kết thúc sớm V1–2 |
|---:|---:|---:|---:|---:|---:|---:|---:|
| **4 người** | 700 | 214 (`30,6%`) | 486 (`69,4%`) | — | — | `4,79` | 4 (`0,6%`) |
| **5 người** | 700 | 211 (`30,1%`) | 403 (`57,6%`) | 86 (`12,3%`) | `41,4%` | `4,43` | 10 (`1,4%`) |
| **6 người** | 700 | 278 (`39,7%`) | 319 (`45,6%`) | 103 (`14,7%`) | `45,6%` | `4,56` | 7 (`1,0%`) |
| **7 người** | 700 | 275 (`39,3%`) | 331 (`47,3%`) | 94 (`13,4%`) | `41,6%` | `4,25` | 13 (`1,9%`) |
| **8 người** | 700 | 273 (`39,0%`) | 276 (`39,4%`) | 151 (`21,6%`) | `42,2%` | `4,02` | 13 (`1,9%`) |

**Phân bố điều kiện thắng (3.500 trận):**
- `Màn Sương Kích nổ` (`DETONATE_PLOT`): `1.547` (`44,2%`)
- `Gác Đèn Gỡ & Niêm phong`: `1.244` (`35,5%`)
- `Hải Công bố Hồ sơ` (`PUBLISH_DOSSIER`): `434` (`12,4%`)
- `Rạng Sáng Quá tải (Sương)`: `191` (`5,5%`)
- `Rạng Sáng Lọt tuần tra (Sương)`: `77` (`2,2%`)
- `Gác Đèn Tạm giữ / Loại hết Màn Sương`: `5` (`0,1%`)
- `Rạng Sáng Tuần tra (Gác)`: `2` (`0,1%`)

### Giả định & Giới hạn cần Playtest với Người thật
1. **Giao tiếp xã hội (Social Bluff & Chat):** Bot trong `boardgame-sim.cjs` chỉ suy luận trên manh mối máy học đơn giản (`evidenceList`), chưa dùng chat bàn để nói dối hoặc thuyết phục tập thể; với người chơi thật, tỷ lệ Gác Đèn thắng qua **Đối chất (`CONFRONT`)** dự kiến cao hơn đáng kể so với bot (`5/3500`), đồng thời cân bằng lại lợi thế của Hội Màn Sương ở bàn 4 người (`69,4%` trên bot vì bot ít phối hợp đối chất).
2. **Đọc tâm lý Trang (`Suy Luận Tuyệt Đối`) & Bình (`Bảo Hộ`):** Bot hiếm khi liều chốt 2 giả thuyết sớm nên nhánh thắng độc lập của Trang (`luận tội Rạng Sáng`) chủ yếu chờ kiểm chứng với người chơi thật biết kết hợp chat + suy luận chéo.
3. **Nhịp độ UI trên di động:** Đã kiểm chứng responsive `390×844` không tràn ngang trên E2E; cảm giác chuyển tab giữa `Bàn & Lượt` / `Vai bí mật` (lật-úp chống nhìn trộm) khi chơi nhóm ngồi chung phòng cần thêm phản hồi thực tế từ sinh viên.
