# Bóng Đêm KTX v3 — Báo Cáo Cân Bằng & Mô Phỏng 8 Bot (`BOARD_GAME_RULESET_VERSION = 3`)

> **Module kiểm thử:** [`test/boardgame-sim.cjs`](../../test/boardgame-sim.cjs)  
> **Động cơ kiểm chứng:** [`features/boardgame/domain/`](../../features/boardgame/domain/) (`rulesetVersion = 3`)  
> **Ngày chạy đối chứng cuối:** 2026-11-15 (`PRNG seed = 20261115`, Mulberry32 tất định)

---

## 1. Phương pháp Mô phỏng & Cô lập Thông tin (Anti-Cheat Projection)

Để đánh giá độ cân bằng thực tế của luật v3 (**Hidden Role, Investigation & Survival**), công cụ mô phỏng [`test/boardgame-sim.cjs`](../../test/boardgame-sim.cjs) thực thi **4.500 ván đấu đầy đủ** chia đều cho toàn bộ 5 quy mô bàn chơi:
- **900 ván × 5 quy mô bàn (`4, 5, 6, 7, 8` người chơi) = `4.500` ván.**
- **Cách ly triệt để thông tin ẩn (`botAccessViolations === 0`):** Hàm quyết định `chooseBotAction(pub, priv, profile, mem, rng, turnFlags)` **chỉ nhận** `BoardGamePublicGameView` (`getPublicGameView`) và `BoardGamePrivateGameView` của riêng bot đó (`getPrivateGameView`), cùng catalog tĩnh (`ROLES_CATALOG`, `CARDS_BY_ID`, đồ thị KTX). Bot hoàn toàn không chạm vào `AuthoritativeGameState`, HP/vai bí mật hay bài trên tay của người khác.
- **Bộ suy luận xác suất từ manh mối (`updateBotMemory`):** Mỗi bot tự duy trì tập `possibleByTarget` gồm các vai còn hợp lệ theo:
  1. Cơ cấu phân bổ phe theo kích thước bàn (ví dụ bàn 4 người không có Kẻ Lang Thang; mọi vai là duy nhất trong 1 ván).
  2. Các lá Điều tra công khai (`inv-01` đến `inv-05`) lọc trực tiếp tập vai phù hợp với `condition-met` / `no-reaction`.
  3. Đối chiếu `inv-06` (`inv-pair-resonance`) trên chính mục tiêu do bot điều tra, kết hợp tín hiệu hành vi (`attack`, `skill`, `exposedMark`, số trang bị & số lần điều tra).
- **8 nhóm tính cách bot (`PROFILES`):** Xoay vòng qua tất cả ghế ở mọi cỡ bàn:
  1. `random-legal` (nhiễu chọn ngẫu nhiên các nước hợp lệ làm ngưỡng đối chứng)
  2. `investigator` (ưu tiên Phát Thanh & dùng Điều tra khoanh vùng sớm)
  3. `defensive` (giữ Giáp tạm, Sảnh KTX hồi thương, ưu tiên trang bị phòng thủ)
  4. `aggressive` (lấy Đèn Pin / Móc Khóa Gậy, ưu tiên truy kích mục tiêu nghi vấn/đã lộ)
  5. `equipment-focused` (khai thác Căng tin để tối ưu 2 ô Trang bị sớm)
  6. `bluffing` (trì hoãn lộ vai ở Hội Màn Sương, chỉ lộ khi dứt điểm hoặc chịu áp lực cao)
  7. `team-coordinator` (bảo hộ/hồi máu đồng đội đã lộ, dồn hỏa lực vào mục tiêu chung)
  8. `neutral-objective` (tối ưu điều kiện riêng của Hải / Trang / Bình hoặc điều kiện thắng phe).

---

## 2. Quá trình Tinh chỉnh Cân bằng Thực nghiệm trong GV3.5

Trong lần chạy baseline ban đầu (`4.500` ván với bot có chiến thuật và suy luận đầy đủ), động cơ v3 đạt tốc độ trận (`avgRounds = 8.79`, `avgEliminations = 2.51`, `Round 1 deaths = 0%`), nhưng lộ rõ **3 điểm lệch cân bằng số học** ở [`victory.ts`](../../features/boardgame/domain/victory.ts):

1. **Trang (`lang-quan-sat`) đồng thắng quá dễ (`79.09%`, vượt trần `68%`):** Luật đồng thắng cũ cho phép Trang thắng thụ động khi bàn có `>= 2` người bị loại mà không yêu cầu tham gia điều tra hay mạo hiểm lật vai.  
   → *Tinh chỉnh:* Yêu cầu Trang sống sót với **`>= 2` lần điều tra** và **`>= 3` người bị loại** (hoặc **đã tự lật vai** với `>= 2` người bị loại).
2. **Bình (`lang-cuu-ho`) đồng thắng thụ động (`78.23%`, vượt trần `68%`):** Luật cũ cho phép Bình thắng ngay cả khi chưa từng dùng *Lá Chắn Thân Mình* bảo vệ Mục tiêu Bảo hộ, hoặc vẫn thắng dù đã bị loại sớm.  
   → *Tinh chỉnh:* Yêu cầu Bình **còn sống** và bảo vệ thành công Mục tiêu (`protectedProtegeCount >= 1` khi Mục tiêu còn sống, hoặc kết liễu kẻ hạ Mục tiêu nếu Mục tiêu gục).
3. **Bất cân xứng điểm Phiên Trực Cuối Đêm (`guardWatchControl` vs `mistStealthControl`):** Cộng dồn toàn bộ `investigationsCount` không giới hạn giúp Đội Gác Đèn áp đảo hầu hết các ván hòa ở Vòng 9–10 (`58.13%` vs `35.44%`, đẩy tỷ lệ chung Kẻ Lang Thang lên `64.41%`).  
   → *Tinh chỉnh:* Giới hạn điểm điều tra của Gác Đèn tối đa `+1` cho mỗi thành viên Gác Đèn có `>= 2` lần điều tra, và cân bằng hệ số vị trí trung tâm của Hội Màn Sương còn sống (`× 2`).

---

## 3. Kết quả 13 Chỉ số Cân bằng sau Tinh chỉnh (4.500 Ván)

### 3.1. Tổng quan Toàn cục & Ngưỡng Kiểm định

| Chỉ số | Kết quả Quan sát | Ngưỡng Chấp nhận | Trạng thái |
|---|---:|---:|---|
| Tổng ván hoàn thành (`completed / totalGames`) | **4.500 / 4.500** | 4.500 / 4.500 | PASS |
| Số ván kẹt (`stalledGames`) | **0** | `0` | PASS |
| Số ván hòa (`draws`) | **0** | `0` | PASS |
| Vi phạm rò rỉ thông tin cho bot (`botAccessViolations`) | **0** | `0` | PASS |
| Tỷ lệ thắng chính **Đội Gác Đèn** (`lantern-guard`) | **49,31%** | `30% – 62%` | PASS |
| Tỷ lệ thắng chính **Hội Màn Sương** (`mist-order`) | **42,82%** | `30% – 62%` | PASS |
| Tỷ lệ thắng đơn độc **Kẻ Lang Thang** (`wanderer-solo`) | **7,87%** | *(phân bổ hợp lý)* | PASS |
| Mức độ tham gia chiến thắng **Kẻ Lang Thang** (`5–8` người, gồm solo + đồng thắng) | **43,00%** (`460` solo + `1.862` co-win / `5.400` lượt xuất hiện) | `12% – 58%` | PASS |
| Thời lượng trung bình (`avgRounds`, `min–max`) | **8,87 vòng** (`4 – 10`) | *(căng thẳng tới cuối đêm)* | PASS |
| Tỷ lệ kết thúc quá sớm ở Vòng 1–2 (`earlyEndRounds1To2Pct`) | **0,00%** | `< 5%` | PASS |
| Tỷ lệ sinh viên bị loại ngay Vòng 1 (`round1PlayerDeathRatePct`) | **0,00%** (`0` ca) | `< 2%` | PASS |
| Số người bị loại trung bình / ván (`avgEliminationsPerGame`) | **2,46** (lần đầu TB ở Vòng **4,77**) | *(đủ áp lực hạ gục)* | PASS |

### 3.2. Phân bổ Theo Kích thước Bàn (`4 – 8` Người Chơi)

| Cỡ bàn | Số ván | Gác Đèn thắng chính | Màn Sương thắng chính | Lang Thang thắng đơn độc | Tỷ lệ Lang Thang góp mặt thắng | Vòng TB | Chết V1 | Kết sớm V1–2 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **4 người** | 900 | 48,78% | 51,22% | — | — | 8,76 | 0 | 0,00% |
| **5 người** | 900 | 54,44% | 39,33% | 6,22% | 39,56% | 8,39 | 0 | 0,00% |
| **6 người** | 900 | 46,22% | 38,44% | 15,33% | 40,72% | 8,53 | 0 | 0,00% |
| **7 người** | 900 | 49,44% | 45,00% | 5,56% | 47,11% | 9,45 | 0 | 0,00% |
| **8 người** | 900 | 47,67% | 40,11% | 12,22% | 44,94% | 9,19 | 0 | 0,00% |

### 3.3. Tỷ lệ Thắng, Sống sót & Tự Lật vai của Từng Nhân vật (9 Vai — Ngưỡng `[20%, 68%]`)

| Nhân vật | Phe | Lượt xuất hiện | Tỷ lệ thắng | Tỷ lệ sống hết trận | Tỷ lệ tự lật vai | Thắng đơn độc | Đạt `[20%, 68%]` |
|---|---|---:|---:|---:|---:|---:|---|
| **Minh — Kỹ Thuật Viên** (`gac-ky-thuat`) | Đội Gác Đèn | 3.606 | **51,41%** | 66,58% | 95,40% | 0 | PASS |
| **Lan — Trực Ban Nội Trú** (`gac-truc-ban`) | Đội Gác Đèn | 3.603 | **50,15%** | 61,59% | 95,92% | 0 | PASS |
| **Khánh — Phát Thanh Viên KTX** (`gac-radio`) | Đội Gác Đèn | 3.591 | **45,98%** | 37,01% | 96,57% | 0 | PASS |
| **Tú — Cư Dân Vô Hình** (`suong-an-danh`) | Hội Màn Sương | 3.602 | **42,67%** | 54,78% | 95,20% | 0 | PASS |
| **Vy — Người Gửi Tin Đồn** (`suong-tin-gia`) | Hội Màn Sương | 3.591 | **41,16%** | 50,46% | 93,62% | 0 | PASS |
| **Dũng — Bóng Đêm Hành Lang** (`suong-gac-cong`) | Hội Màn Sương | 3.607 | **44,50%** | 61,85% | 94,73% | 0 | PASS |
| **Hải — Người Săn Gói Tin** (`lang-anh-san`) | Kẻ Lang Thang | 1.775 | **38,08%** | 74,54% | 41,97% | 330 | PASS |
| **Trang — Người Ghi Chép** (`lang-quan-sat`) | Kẻ Lang Thang | 1.765 | **39,89%** | 75,64% | 56,26% | 48 | PASS |
| **Bình — Người Bảo Hộ** (`lang-cuu-ho`) | Kẻ Lang Thang | 1.860 | **50,65%** | 69,62% | 96,08% | 82 *(khi Hải solo)* | PASS |

### 3.4. Phân tích theo 8 Nhóm Bot, Hình thái Kết thúc & Nhịp Hành động

- **Chênh lệch trình độ chiến thuật (`byProfile`):**
  - `random-legal`: **24,27%** (`3.374` lượt) — thấp hơn hẳn nhóm bot chiến thuật từ `22–26%`, chứng minh luật v3 thưởng trực tiếp cho suy luận, chọn mục tiêu và quản trị tài nguyên.
  - Các bot có chiến thuật: `aggressive` (**46,48%**), `equipment-focused` (**46,86%**), `defensive` (**47,32%**), `investigator` (**48,21%**), `bluffing` (**49,07%**), `team-coordinator` (**49,90%**), `neutral-objective` (**50,98%**).
- **Hình thái kết thúc (`winReasons`):**
  - Loại sạch phe đối lập (`elimination`): **1.593 ván** (`35,40%`)
  - Phiên Trực Cuối Đêm (`dawnTiebreak`): **2.553 ván** (`56,73%`, phần nhiều khi còn `1v1` / `1v2` cân não ở Vòng 9–10)
  - Hải thắng đơn độc (`Chốt Gói Tin Đêm`): **330 ván** (`7,33%`)
  - Trang thắng đơn độc (`Nhân Chứng Cuối Đêm`): **24 ván** (`0,53%`)
  - Cùng triệt tiêu cả hai phe (`mutualWipeout`): **0 ván**
- **Phân bố vòng kết thúc (`roundHistogram`):** Vòng 4 (`23`), Vòng 5 (`104`), Vòng 6 (`220`), Vòng 7 (`330`), Vòng 8 (`437`), Vòng 9 (`1.696`), Vòng 10 (`1.690`).
- **Tần suất hành động trung bình mỗi ván:** `7,84` điều tra · `20,43` công kích · `11,08` trang bị · `10,97` kỹ năng riêng · `2,06` phòng thủ · `0,12` sự kiện.

---

## 4. Limitations of Bot Simulation vs Human Social Deduction

Mặc dù mô phỏng 4.500 ván là bằng chứng định lượng mạnh về độ bền, tính chống kẹt và cân bằng toán học của luật v3, **bot không phản ánh hết các yếu tố xã hội của người chơi thật**, bao gồm:

1. **Không có hội thoại tự nhiên, thuyết phục và đánh lạc hướng bằng lời nói (Table Talk & Verbal Bluffing):** Người chơi thật thường chia sẻ (hoặc bịa đặt) kết quả thẻ Điều tra qua chat / thoại để dẫn dắt đám đông hội đồng dồn hỏa lực; bot chỉ đọc log công khai và suy luận Bayes thuần túy trên lá bài chính xác.
2. **Chưa có liên minh ngầm và phản bội theo tâm lý (Dynamic Alliances & Kingmaking):** Con người biết thỏa thuận tạm thời giữa Kẻ Lang Thang và một phe khi thấy bên kia sắp thắng, hoặc cố tình che giấu Hải để cắt mạch thắng của Gác Đèn/Màn Sương.
3. **Đọc biểu cảm, nhịp thao tác và tâm lý chơi thực tế:** Việc giữ vai Úp/Lật trên cùng phòng chơi hay do dự khi bấm nút tạo áp lực tâm lý mạnh ở người thật mà bot tất định không mô phỏng.
4. **Hành vi thẻ Sự kiện và Phòng thủ linh hoạt hơn:** Trong mô phỏng, bot ưu tiên mạnh vào Điều tra/Trang bị/Công kích nên tỷ lệ dùng Sự kiện chỉ `0,12`/ván; người thật sẽ khai thác `Loa KTX`, `Bình Trà Ấm` hoặc `Kiểm Tra Tủ Đồ` theo tình huống chiến thuật tinh vi hơn.

Do đó, báo cáo này xác nhận **toàn bộ cấu trúc toán học, điều kiện thắng và đường cong sức mạnh nhân vật v3 đã cân bằng ổn định**, đồng thời khuyến nghị tiếp tục theo dõi telemetry ván thật của người chơi sau phát hành để hiệu chỉnh thêm nếu xuất hiện meta mới.
