# Bóng Đêm KTX — Phase 2C Balance & 10,000-Match Simulation Report (`starter-eight`)

> **Nguồn dữ liệu:** Chạy thực tế `node scripts/sim-starter-eight.cjs --write-json` (**10,000 trận deterministic**: 2,000 trận × 5 quy mô `4P–8P`, lưu thô tại [`starter-eight-sim-data.json`](./starter-eight-sim-data.json)) đối chiếu với baseline Classic `node test/boardgame-sim.cjs` (**4,500 trận deterministic**).
> **Nguyên tắc cân bằng:** Không tự ý thay đổi HP hay cơ chế nhân vật chỉ dựa trên số liệu bot simulation. Toàn bộ khuyến nghị bên dưới là **đề xuất chuẩn bị cho Human Playtest nội bộ** trên pool `starter-eight` (tắt trên production).

---

## 1. Tổng quan Hiệu năng & Tính ổn định Simulation (`starter-eight` vs `classic`)

| Chỉ số | Classic Baseline (4,500 trận) | Starter Eight (10,000 trận) | Chênh lệch | Đánh giá |
|---|---:|---:|---:|---|
| **Tổng số trận hoàn tất** | 4,500 / 4,500 | **10,000 / 10,000** | — | ✅ 100% hoàn tất |
| **Trận bị treo / lỗi (`stalledGames`)** | 0 | **0** | `0` | ✅ Không deadlock |
| **Trận hòa (`draws`)** | 0 | **0** | `0` | ✅ Phân thắng rõ ràng |
| **Vi phạm quyền riêng tư P0 (`botAccessViolations`)** | 0 | **0** | `0` | ✅ Zero secret leak |
| **Số vòng trung bình (`avgRounds`)** | `7.34` | **`8.31`** | `+0.97` | Kỹ năng phòng thủ/hồi máu kéo dài ~1 vòng |
| **Số lượt trung bình (`avgTurns`)** | `32.36` | **`36.01`** | `+3.65` | Nhịp trận vẫn gọn (~10–15 phút thực tế) |
| **Kết thúc sớm vòng 1–2 (`earlyEndRounds1To2Pct`)** | `2.02%` | **`1.82%`** | `-0.20%` | ✅ An toàn (`< 5%`) |
| **Tỷ lệ chết vòng 1 / ghế (`round1PlayerDeathRatePct`)** | `0.448%` | **`0.560%`** | `+0.112%` | ✅ An toàn (`< 2%`) |
| **Số lần hạ gục TB / trận** | `3.21` | **`3.25`** | `+0.04` | Ổn định |
| **Tổng sát thương TB / trận** | — | **`68.75`** | — | Phù hợp với thêm 8 tướng HP 11–14 |
| **Tổng Pending Choices đã giải quyết** | `0` | **`43,547`** | — | 6/6 loại choice vận hành mượt |

### Phân bố 43,547 Pending Choices trong 10,000 trận

- `felicia_draw_choice` (Felicia): **12,005** lần
- `gayle_attack_reroll` (Gayle): **9,921** lần
- `fiona_attack_roll` (Fiona): **8,701** lần
- `victor_blood_boost` (Victor): **7,224** lần
- `undying_reveal_reduce` (Undying — Secret): **2,959** lần
- `wendigo_reveal_heal` (Wendigo — Secret): **2,737** lần

---

## 2. Tỷ lệ Thắng theo Phe & Phân rã theo Quy mô Bàn (4P–8P)

### 2.1. Tổng thể 3 Phe (Primary Victory vs Wanderer Participation)

| Chỉ số Phe | Classic Baseline (4,500 trận) | Starter Eight (10,000 trận) | Delta | Nhận định |
|---|---:|---:|---:|---|
| **Hunter (`lantern-guard`)** | `39.73%` | **`49.81%`** | **`+10.08%`** | ⚠️ Tăng mạnh chủ yếu do tác động phòng thủ của **G43 (63.79%)** |
| **Shadow (`mist-order`)** | `45.56%` | **`36.20%`** | **`-9.36%`** | ⚠️ Giảm rõ rệt ở 4P & 8P (không có nhánh thắng 3 Neutral chết) |
| **Neutral Primary (`wanderer`)** | `14.71%` | **`13.99%`** | `-0.72%` | ✅ Rất ổn định |
| **Wanderer Win Rate (5P–8P)** | `35.83%` | **`35.59%`** | `-0.24%` | ✅ Gần như bất biến |

### 2.2. Phân rã theo Số người chơi (`4P` – `8P`, 2,000 trận/mốc)

| Quy mô | Hunter Win % | Shadow Win % | Wanderer Primary % | Wanderer Role Win % | Avg Rounds | Avg Turns | Early End % |
|---|---:|---:|---:|---:|---:|---:|---:|
| **4P** (2H–2S–0N) | **58.55%** | 41.45% | 0.00% | — | 10.97 | 34.74 | 0.00% |
| **5P** (2H–2S–1N) | **52.45%** | 36.55% | 11.00% | 42.80% | 8.81 | 33.67 | 0.95% |
| **6P** (2H–2S–2N) | **48.80%** | 32.90% | 18.30% | 37.77% | 7.59 | 34.35 | 1.65% |
| **7P** (2H–2S–3N) | **41.30%** | **40.15%** | 18.55% | 32.90% | 5.82 | 31.91 | 5.00% |
| **8P** (3H–3S–2N) | **47.95%** | **29.95%** | 22.10% | 33.85% | 8.34 | 45.35 | 1.50% |

> **Phát hiện quan trọng:** Mốc **7P (2H–2S–3N)** là cân bằng nhất (`41.30%` Hunter vs `40.15%` Shadow) vì phe Shadow có lộ trình thắng thay thế *hạ 3 Neutral* để né đụng độ trực diện với G43. Ngược lại, **4P** (`58.55%` vs `41.45%`) và **8P** (`47.95%` vs `29.95%`) phơi bày rõ áp lực khi Shadow bắt buộc phải xuyên thủng toàn bộ dàn Hunter có G43.

---

## 3. Bảng Chỉ số Toàn bộ 18 Nhân vật (`starter-eight`)

### 3.1. Tám Nhân vật Mở rộng (Starter Eight)

| Nhân vật | Phe | HP | Luật | Lượt xuất hiện | Win Rate % | Survival % | Reveal % | Skill Act./Trận | Heal TB | Dmg Chặn TB | Bonus Dmg TB |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **G43** (`exp2_g43`) | Hunter | 14 | `verified` | 3,165 | **63.79%** ⚠️ | **82.05%** | 99.37% | 4.72 | 0.00 | **8.29** | 0.00 |
| **Gayle** (`exp1_gayle`) | Hunter | 14 | `house-rule` | 3,153 | **48.94%** | 46.78% | 99.14% | 1.43 | 0.00 | 0.00 | 0.00 |
| **Fiona** (`exp2_fiona`) | Hunter | 12 | `verified` | 3,125 | **47.71%** | 42.24% | 99.39% | 2.78 | 0.00 | 0.00 | 0.00 |
| **Felicia** (`exp1_felicia`) | Hunter | 12 | `house-rule` | 3,124 | **43.69%** | 36.04% | 100.00% | 3.84 | 0.00 | 0.00 | 0.00 |
| **Undying** (`exp1_undying`) | Shadow | 11 | `house-rule` | 3,040 | **35.89%** | 38.59% | 94.97% | **4.78** | 0.00 | **4.78** | 0.00 |
| **Victor** (`exp1_victor`) | Shadow | 13 | `house-rule` | 3,159 | **34.16%** | 27.73% | 98.80% | 1.82 | 0.00 | 0.00 | **3.64** |
| **Wendigo** (`exp1_wendigo`) | Shadow | 14 | `verified` | 3,154 | **33.35%** | 36.84% | 99.02% | 1.99 | **1.62** | 0.00 | 0.00 |
| **Wyvern** (`exp2_wyvern`) | Shadow | 14 | `verified` | 3,184 | **33.04%** | 33.29% | 98.65% | **0.35** | **1.25** | 0.00 | 0.00 |

### 3.2. Mười Nhân vật Classic trong Pool `starter-eight`

| Nhân vật Classic | Phe | HP | Lượt xuất hiện | Win Rate % (`starter-eight`) | Survival % | Reveal % |
|---|---|---:|---:|---:|---:|---:|
| **Vy "Radio"** (Franklin) | Hunter | 12 | 3,206 | 51.19% | 44.54% | 99.56% |
| **Minh "Kỹ Thuật"** (George) | Hunter | 14 | 3,148 | 49.94% | 48.60% | 99.05% |
| **Lan "Trực Ban"** (Emi) | Hunter | 10 | 3,079 | 41.90% | 38.26% | 94.97% |
| **Dũng "Gác Cổng"** (Werewolf) | Shadow | 14 | 3,126 | 41.97% | 39.86% | 99.58% |
| **Tú "Ẩn Danh"** (Vampire) | Shadow | 13 | 3,094 | 38.91% | 43.70% | 93.47% |
| **Khánh "Tin Giả"** (Unknown) | Shadow | 11 | 3,243 | 32.35% | 36.20% | 69.50% |
| **Trang "Kiên Cường"** (Allie) | Neutral | 8 | 4,013 | 60.85% | 60.85% | 76.28% |
| **Đạt "Cảm Tử"** (Daniel) | Neutral | 13 | 3,948 | 45.77% | 56.74% | 99.87% |
| **Bách "Cuồng Chiến"** (Charles) | Neutral | 11 | 4,017 | 22.03% | 50.86% | 71.52% |
| **Hải "Sưu Tầm"** (Bob) | Neutral | 10 | 4,022 | 13.95% | 51.47% | 73.12% |

---

## 4. Tần suất & Tỷ lệ Thắng Combo Trọng điểm

| Combo | Số trận xuất hiện | Win Rate % | Đánh giá rủi ro khai thác (Exploit Risk) |
|---|---:|---:|---|
| **G43 + Holy Robe (`eq-01`)** | 836 | **70.10%** 🚨 | **CAO:** Giảm tổng `-3` ST mỗi đòn đánh, triệt tiêu ~83% các cú tung thường `\|1d6-1d4\|`. Cần theo dõi sát trong human playtest! |
| **Felicia + ≥ 3 Trang bị** | 1,062 | **60.64%** | **TRUNG BÌNH:** Phần thưởng xứng đáng cho khả năng lọc bài Trắng/Đen; vẫn cân bằng tổng thể (`43.69%`). |
| **Gayle + Masamune / Spear** | 1,102 | **58.89%** | **THẤP–TB:** Nhất quán với sức mạnh vũ khí Classic; không có lỗi lặp reroll. |
| **Fiona + Masamune / Spear** | 1,006 | **58.35%** | **THẤP–TB:** Ổn định sát thương tốt, giữ trần damage chuẩn. |
| **Victor + Machine Gun (`ev-06`)** | 450 | **44.00%** ✅ | **ĐÃ KIỂM SOÁT:** House rule giới hạn `+2` vào duy nhất 1 mục tiêu triệt tiêu hoàn toàn nguy cơ AoE phá game! |
| **Undying + Holy Robe (`eq-01`)** | 586 | **43.00%** ✅ | **ĐÃ KIỂM SOÁT:** Kiểm tra ngưỡng `>= 2` **sau** Holy Robe ngăn việc giảm kép trên đòn 2 ST. |
| **Wyvern hạ Shadow hồi đầy máu** | 14 lần / 10,000 trận | — | **RẤT HIẾM (0.14%):** Xảy ra đúng như thiết kế tình huống khẩn cấp, không bị lạm dụng. |

---

## 5. Đánh giá Chuyên sâu Từng Nhân vật trước Human Playtest

### 1. `G43` (Hunter, 14 HP — Verified Source Rule)
- **Mức sức mạnh:** **Rất cao / Outlier (`63.79%` win, `82.05%` survival, chặn TB `8.29` ST/trận).**
- **Độ phức tạp:** Thấp (passive trực quan).
- **Khả năng khắc chế (Counterplay):** Rõ ràng về lý thuyết (dùng sát thương ngoài attack như `Dynamite`, `Flare`, `Vampire Bat`, `Spider`, `Hành Lang Ô 9`, kỹ năng trực tiếp; cướp `Holy Robe` ở Sân Bóng 10 / `Moody Goblin`), nhưng bot tấn công thường quá nhiều vào G43 khiến sức mạnh bị khuếch đại.
- **Rủi ro khai thác:** **Cao với combo `G43 + Holy Robe` (`70.10%` win).**
- **Khuyến nghị trước Human Playtest:** **Giữ nguyên thông số gốc** trong đợt playtest người thật đầu tiên để đo xem người chơi Shadow thực tế có khắc chế G43 hiệu quả hơn bot bằng bài Đột Kích & Ô 9 không. Nếu vẫn vượt `> 58%` sau playtest người thật, cân nhắc thử nghiệm house rule *không cộng dồn giảm thương đòn đánh dưới mức 1* hoặc *HP 13* ở vòng sau (chưa sửa trong Phase 2).

### 2. `Gayle` (Hunter, 14 HP — Experimental House Rule)
- **Mức sức mạnh:** **Cân bằng tốt (`48.94%` win, `46.78%` survival, `1.43` lần reroll/trận).**
- **Độ phức tạp:** Thấp (1 quyết định nhị phân: giữ hay đổ lại bắt buộc lấy lần 2).
- **Counterplay:** Rủi ro tự chịu kết quả xấu hơn (0 ST) tạo kịch tính thú vị; cần lộ diện nên dễ bị tập trung hỏa lực.
- **Rủi ro khai thác:** Rất thấp (chặn reroll di chuyển, chặn xếp chồng).
- **Khuyến nghị:** **Sẵn sàng cho Human Playtest** với house rule hiện tại.

### 3. `Fiona` (Hunter, 12 HP — Verified Source Rule)
- **Mức sức mạnh:** **Cân bằng tốt (`47.71%` win, `42.24%` survival, `2.78` lần kích hoạt/trận).**
- **Độ phức tạp:** Thấp (chọn 1 trong 2 kết quả đã hiển thị rõ).
- **Counterplay:** HP 12 dễ gục trước đòn dồn sát thương / `Victor` / `Werewolf` phản kích; vẫn giữ nguyên trần sát thương.
- **Rủi ro khai thác:** Rất thấp (chống spoof xúc xắc, timeout fallback về `roll_0`).
- **Khuyến nghị:** **Sẵn sàng cho Human Playtest**, không cần chỉnh sửa.

### 4. `Felicia` (Hunter, 12 HP — Experimental House Rule)
- **Mức sức mạnh:** **Cân bằng khỏe (`43.69%` win, `36.04%` survival, `3.84` lần lọc bài/trận).**
- **Độ phức tạp:** Trung bình (đọc & so sánh 2 thẻ trong `privateView` dưới thời hạn 12s).
- **Counterplay:** Chỉ có 12 HP và thường lộ diện sớm ở vòng 1–2 để tận dụng *Tháo Vát*, dễ bị Shadow săn sớm; giới hạn chỉ Trắng/Đen giữ nguyên giá trị ẩn vai của bộ Xanh.
- **Rủi ro khai thác:** Thấp (đã chặn đệ quy, ẩn 2 lá khỏi Spectator/Public, xử lý cạn bộ bài 0/1 lá).
- **Khuyến nghị:** **Giữ nguyên HUSTVerse Experimental House Rule (chỉ White & Black)** trong playtest; thu thập phản hồi UX về thời gian đọc 2 lá bài (`12s` có đủ thoải mái cho người chơi mới hay cần `15s`).

### 5. `Undying` (Shadow, 11 HP — Experimental House Rule)
- **Mức sức mạnh:** **Khỏe nhất trong 4 Shadow mới (`35.89%` win trong meta Hunter mạnh, `38.59%` survival, chặn `4.78` ST/trận).**
- **Độ phức tạp:** Trung bình (quyết định bí mật lật vai để giảm sát thương hoặc giữ ẩn).
- **Counterplay:** 11 HP nền thấp, các nguồn sát thương 1 điểm (Thăm Dò 1 ST, đòn 1 ST, `Holy Robe` hạ 2→1) và Hành Lang Ô 9 không kích hoạt *Mạ Sắt*.
- **Rủi ro khai thác:** Thấp (ngưỡng `>= 2` kiểm tra sau giảm thương trang bị, `Undying + Holy Robe` chỉ `43.00%` win, loại trừ HP cost).
- **Khuyến nghị:** **Sẵn sàng cho Human Playtest**; cần theo dõi cảm giác thời gian chờ ở cửa sổ phản ứng bí mật (`isSecret: true`) để không lộ timing side-channel.

### 6. `Victor` (Shadow, 13 HP — Experimental House Rule)
- **Mức sức mạnh:** **Trung bình–ổn (`34.16%` win, `+3.64` bonus ST/trận, `27.73%` survival).**
- **Độ phức tạp:** Thấp–TB (cân nhắc đổi 1 HP lấy +2 ST dứt điểm).
- **Counterplay:** Tự bào mòn HP nhanh (`27.73%` survival — thấp nhất bảng) khiến Victor rất dễ bị Hunter phản công kết liễu nếu spam kỹ năng sớm.
- **Rủi ro khai thác:** Đã kiểm soát tốt (`Victor + Machine Gun` = `44.00%` win nhờ giới hạn +2 cho 1 mục tiêu; chặn tự sát ở 1 HP; HP cost không giảm được bởi giáp).
- **Khuyến nghị:** **Sẵn sàng cho Human Playtest**; theo dõi thêm xem người thật dùng Victor kỷ luật hơn bot (chỉ kích khi đủ kết liễu hoặc xuyên G43) có đẩy win rate lên vùng `42–48%` hay không.

### 7. `Wendigo` (Shadow, 14 HP — Verified Source Rule)
- **Mức sức mạnh:** **Hơi trầm (`33.35%` win, `36.84%` survival, hồi TB `1.62` HP/trận qua `1.99` lần kích hoạt).**
- **Độ phức tạp:** Thấp–TB (phản ứng bí mật khi có người chết).
- **Counterplay:** Không tạo sát thương chủ động; hoàn toàn phụ thuộc nhịp hạ gục trên bàn.
- **Rủi ro khai thác:** Rất thấp (cap 14 HP, tối đa 1 lần/sự kiện loại, không hồi sinh người chết).
- **Khuyến nghị:** **Giữ nguyên luật gốc** cho Human Playtest; chú ý Wendigo tỏa sáng mạnh hơn ở bàn 7P–8P nơi số xác chết nhiều hơn.

### 8. `Wyvern` (Shadow, 14 HP — Verified Source Rule)
- **Mức sức mạnh:** **Thấp nhất trong nhóm (`33.04%` win, chỉ `0.35` lần kích hoạt/trận, hồi TB `1.25` HP/trận).**
- **Độ phức tạp:** Thấp (passive kết liễu bằng đòn đánh).
- **Counterplay:** Rất dễ bị khắc chế nếu đối thủ kết thúc nhau bằng thẻ/Ô 9 hoặc ép Wyvern lộ diện sớm mà chưa có mục tiêu thấp máu; trong thực tế người chơi có thể phối hợp đồng đội Shadow nhường đòn kết liễu cho Wyvern (điều bot chưa làm tốt).
- **Rủi ro khai thác:** Rất thấp (chỉ 14 lần giết Shadow hồi đầy trong 10,000 trận).
- **Khuyến nghị:** **Giữ nguyên luật gốc** cho Human Playtest để kiểm chứng hiệu quả phối hợp đồng đội Shadow của người thật trước khi cân nhắc bất kỳ điều chỉnh nào.
